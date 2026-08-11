// gcc-publish.js v0.5.0 — 2026-08-11
// v0.5.0 — Fourth publish source: overlay regions → mapRegions/
//          (schema decision #4; firestore.rules v8 already gates
//          writes on isGM()). Reads dirty entries via
//          GCCSubhexData.getDirtyRegions, batch-writes keyed by
//          slug, clears via markRegionsPublished. Badge count,
//          confirm-dialog breakdown, and renderDirtyEntry gain a
//          'regions' source (name + terrain).
// v0.4.0 — Confirm dialog enumerates dirty entries when each source
//          has ≤ ENUMERATE_THRESHOLD (5) dirty items. Each source
//          renders its entries via renderDirtyEntry — subhex shows
//          parent Darlene label + (Q,R) + terrain/feature; lakes
//          show name + kind + depth; paths show kind + name + cell
//          count. Sources over the threshold fall back to count-only
//          to keep the dialog scannable. renderDirtyEntry exported
//          on window.GCCPublish for reuse by Option B (dirty
//          inspector dialog).
// v0.3.0 — Publish walks three sources: IDB subhex overrides
//          (existing), in-memory lakes (gcc-subhex-data), and
//          in-memory paths (gcc-subhex-paths). Each gets its own
//          Firestore collection: subHexes/, lakes/, paths/. Badge
//          count is the sum across all three. Confirm dialog
//          shows a per-source breakdown. Local deletes don't
//          propagate yet — matches store/data/paths behavior.
// v0.2.0 — confirmation dialog before publish ("Push N changes?"
//          [Cancel] [Publish]). Prevents accidental ⬆ clicks
//          from pushing local IDB state to cloud.
// v0.1.0 — First Firestore write path for subhex data. GM-only.
//
// - Loads firebase-firestore-compat.js on demand (idempotent).
// - Checks gms/{uid} to gate UI (matches firestore.rules v4 isGM()).
// - Reads dirty entries from GCCSubhexStore/GCCSubhexData/GCCSubhexPaths,
//   writes in 500-op batches per collection, then calls each source's
//   markPublished to clear _dirtyAt.
// - Injects ⬆ button into gcc-nav before #gcc-btn-settings, with a
//   dirty-count badge; hidden until GM verified.
// - Exposes window.GCCPublish = { publish, getDirtyCount, getDirtyCounts,
//   isGM, refreshBadge }.

(function(){
  'use strict';

  const COL_SUBHEX = 'subHexes';
  const COL_LAKES  = 'lakes';
  const COL_PATHS  = 'paths';
  const COL_REGIONS = 'mapRegions';
  const BATCH_SIZE = 500;
  const FB_VERSION = '10.12.2';
  const FB_FIRESTORE_URL = `https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-firestore-compat.js`;

  let _db = null;
  let _uid = null;
  let _isGM = false;
  let _publishing = false;
  let _btnEl = null;
  let _badgeEl = null;

  function loadFirestoreSdk(){
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${FB_FIRESTORE_URL}"]`)){ resolve(); return; }
      const s = document.createElement('script');
      s.src = FB_FIRESTORE_URL;
      s.onload = resolve;
      s.onerror = () => reject(new Error('firestore SDK load failed'));
      document.head.appendChild(s);
    });
  }
  async function initDb(){
    if (_db) return _db;
    await loadFirestoreSdk();
    _db = firebase.firestore();
    return _db;
  }

  async function checkGM(uid){
    if (!uid) return false;
    try {
      await initDb();
      const snap = await _db.collection('gms').doc(uid).get();
      return snap.exists;
    } catch(e){
      console.warn('[Publish] GM check failed:', e);
      return false;
    }
  }

  async function getDirtyCounts(){
    let subhex = 0, lakes = 0, paths = 0, regions = 0;
    try {
      if (window.GCCSubhexStore && window.GCCSubhexStore.getDirtyCount){
        subhex = await window.GCCSubhexStore.getDirtyCount();
      }
    } catch(e){ console.warn('[Publish] subhex getDirtyCount failed:', e); }
    try {
      if (window.GCCSubhexData && window.GCCSubhexData.getDirtyLakeCount){
        lakes = window.GCCSubhexData.getDirtyLakeCount();
      }
    } catch(e){ console.warn('[Publish] lake getDirtyCount failed:', e); }
    try {
      if (window.GCCSubhexPaths && window.GCCSubhexPaths.getDirtyCount){
        paths = window.GCCSubhexPaths.getDirtyCount();
      }
    } catch(e){ console.warn('[Publish] path getDirtyCount failed:', e); }
    try {
      if (window.GCCSubhexData && window.GCCSubhexData.getDirtyRegionCount){
        regions = window.GCCSubhexData.getDirtyRegionCount();
      }
    } catch(e){ console.warn('[Publish] region getDirtyCount failed:', e); }
    return { subhex, lakes, paths, regions, total: subhex + lakes + paths + regions };
  }
  async function getDirtyCount(){
    const { total } = await getDirtyCounts();
    return total;
  }

  async function publish(onProgress){
    if (_publishing) return { ok: false, reason: 'Publish already in progress' };
    if (!_isGM)      return { ok: false, reason: 'Not a GM' };
    if (!_uid || !_db) return { ok: false, reason: 'Not signed in' };

    _publishing = true;
    try {
      // ── Collect dirty entries from all three sources ────────────────
      let dirtySubhex = [], dirtyLakes = [], dirtyPaths = [], dirtyRegions = [];
      if (window.GCCSubhexStore){
        await window.GCCSubhexStore.flush();
        dirtySubhex = await window.GCCSubhexStore.getDirty();
      }
      if (window.GCCSubhexData && window.GCCSubhexData.getDirtyLakes){
        dirtyLakes = window.GCCSubhexData.getDirtyLakes();
      }
      if (window.GCCSubhexPaths && window.GCCSubhexPaths.getDirty){
        dirtyPaths = window.GCCSubhexPaths.getDirty();
      }
      if (window.GCCSubhexData && window.GCCSubhexData.getDirtyRegions){
        dirtyRegions = window.GCCSubhexData.getDirtyRegions();
      }

      const total = dirtySubhex.length + dirtyLakes.length + dirtyPaths.length + dirtyRegions.length;
      if (total === 0) return { ok: true, total: 0, published: 0, failed: 0, failures: [] };

      let published = 0;
      const failures = [];
      const publishedTs = Date.now();

      // ── Per-collection batch pusher ────────────────────────────────
      // dirty: Array<[id, entry]>, collection: string,
      // markPublishedFn: (ids, ts) => Promise|void
      async function pushBatch(dirty, collection, markPublishedFn){
        for (let i = 0; i < dirty.length; i += BATCH_SIZE){
          const chunk = dirty.slice(i, i + BATCH_SIZE);
          const batch = _db.batch();
          for (const [id, entry] of chunk){
            const out = Object.assign({}, entry);
            delete out._dirtyAt;
            out._publishedAt = publishedTs;
            out.schemaVersion = out.schemaVersion || 1;
            batch.set(_db.collection(collection).doc(id), out);
          }
          try {
            await batch.commit();
            const ids = chunk.map(([id]) => id);
            const ret = markPublishedFn(ids, publishedTs);
            if (ret && typeof ret.then === 'function') await ret;
            published += chunk.length;
          } catch(e){
            console.warn(`[Publish] ${collection} batch commit failed:`, e);
            chunk.forEach(([id]) => failures.push({ id, error: e.message || String(e) }));
          }
          if (onProgress) onProgress({ published, failed: failures.length, total });
        }
      }

      if (dirtySubhex.length){
        await pushBatch(dirtySubhex, COL_SUBHEX,
          (ids, ts) => window.GCCSubhexStore.markPublished(ids, ts));
      }
      if (dirtyLakes.length){
        await pushBatch(dirtyLakes, COL_LAKES,
          (ids, ts) => window.GCCSubhexData.markLakesPublished(ids, ts));
      }
      if (dirtyPaths.length){
        await pushBatch(dirtyPaths, COL_PATHS,
          (ids, ts) => window.GCCSubhexPaths.markPublished(ids, ts));
      }
      if (dirtyRegions.length){
        await pushBatch(dirtyRegions, COL_REGIONS,
          (ids, ts) => window.GCCSubhexData.markRegionsPublished(ids, ts));
      }

      return { ok: true, total, published, failed: failures.length, failures };
    } finally {
      _publishing = false;
    }
  }

  // ─── UI ────────────────────────────────────────────────────────────
  function makeButton(){
    const btn = document.createElement('button');
    btn.className = 'gcc-nav-btn gcc-publish-btn';
    btn.id = 'gcc-btn-publish';
    btn.title = 'Publish subhex data to cloud';
    btn.style.display = 'none';
    btn.innerHTML = '⬆ <span class="gcc-publish-badge" id="gcc-publish-badge" style="display:none;">0</span>';
    return btn;
  }
  function wireButton(){
    let btn = document.getElementById('gcc-btn-publish');
    if (!btn){
      const settings = document.getElementById('gcc-btn-settings');
      if (!settings) return;
      btn = makeButton();
      settings.parentNode.insertBefore(btn, settings);
    }
    _btnEl = btn;
    _badgeEl = btn.querySelector('#gcc-publish-badge');
    btn.addEventListener('click', onPublishClick);
    window.addEventListener('gcc-subhex-dirty-changed', refreshBadge);
  }

  async function refreshBadge(){
    if (!_badgeEl || !_btnEl) return;
    if (_btnEl.style.display === 'none') return;
    const count = await getDirtyCount();
    if (count > 0){
      _badgeEl.textContent = String(count);
      _badgeEl.style.display = '';
    } else {
      _badgeEl.style.display = 'none';
    }
  }

  function showButton(){ if (_btnEl) _btnEl.style.display = ''; refreshBadge(); }
  function hideButton(){ if (_btnEl) _btnEl.style.display = 'none'; }

  // ─── Dirty-entry enumeration (for confirm dialog) ──────────────────
  // Threshold beyond which we just show a count rather than listing
  // every entry. Keeps the dialog scannable.
  const ENUMERATE_THRESHOLD = 5;

  // Fetch entries from sources whose count is at-or-under threshold.
  // Sources over threshold get null (skip the read entirely for
  // subhex since IDB cursor walk isn't free at 50k+ entries).
  async function getDirtyDetails(counts){
    const out = { subhex: null, lakes: null, paths: null, regions: null };
    if (counts.subhex > 0 && counts.subhex <= ENUMERATE_THRESHOLD){
      if (window.GCCSubhexStore){
        try { out.subhex = await window.GCCSubhexStore.getDirty(); }
        catch(e){ console.warn('[Publish] getDirty(subhex) failed:', e); }
      }
    }
    if (counts.lakes > 0 && counts.lakes <= ENUMERATE_THRESHOLD){
      if (window.GCCSubhexData && window.GCCSubhexData.getDirtyLakes){
        try { out.lakes = window.GCCSubhexData.getDirtyLakes(); }
        catch(e){ console.warn('[Publish] getDirtyLakes failed:', e); }
      }
    }
    if (counts.paths > 0 && counts.paths <= ENUMERATE_THRESHOLD){
      if (window.GCCSubhexPaths && window.GCCSubhexPaths.getDirty){
        try { out.paths = window.GCCSubhexPaths.getDirty(); }
        catch(e){ console.warn('[Publish] getDirty(paths) failed:', e); }
      }
    }
    if (counts.regions > 0 && counts.regions <= ENUMERATE_THRESHOLD){
      if (window.GCCSubhexData && window.GCCSubhexData.getDirtyRegions){
        try { out.regions = window.GCCSubhexData.getDirtyRegions(); }
        catch(e){ console.warn('[Publish] getDirtyRegions failed:', e); }
      }
    }
    return out;
  }

  // Human-readable line for a single dirty entry. Pure function;
  // reusable by Option B (dirty inspector). idOrSlug is the IDB key
  // for subhex ('subhex_Q_R') and the slug for lakes/paths.
  function renderDirtyEntry(source, idOrSlug, entry){
    if (!entry) return String(idOrSlug);
    if (source === 'subhex'){
      const m = /^subhex_(-?\d+)_(-?\d+)$/.exec(idOrSlug);
      if (!m) return String(idOrSlug);
      const Q = +m[1], R = +m[2];
      let parentLabel = '?';
      try {
        if (window.GCCSubhexData && window.GCCSubhexData.ownerOf
            && typeof window.hexIdStr === 'function'){
          const owner = window.GCCSubhexData.ownerOf(Q, R);
          if (owner) parentLabel = window.hexIdStr(owner.col, owner.row);
        }
      } catch(_){}
      const bits = [];
      if (entry.terrain)  bits.push(entry.terrain);
      if (entry.feature)  bits.push('+ ' + entry.feature);
      if (entry.regionId) bits.push('region:' + entry.regionId);
      if (entry.lakeId)   bits.push('lake:' + entry.lakeId);
      const content = bits.length ? bits.join(' ') : '(cleared)';
      return `${parentLabel} (Q${Q},R${R}) — ${content}`;
    }
    if (source === 'lakes'){
      const name = entry.name || idOrSlug;
      const kind = entry.kind || 'lake';
      const depth = entry.depth ? `, ${entry.depth}` : '';
      const Label = kind === 'sea' ? 'Sea' : 'Lake';
      return `${Label} "${name}" (${kind}${depth})`;
    }
    if (source === 'paths'){
      const name = entry.name || idOrSlug;
      const kind = entry.kind || 'path';
      const cells = Array.isArray(entry.cells) ? entry.cells.length : 0;
      const Label = kind.charAt(0).toUpperCase() + kind.slice(1);
      const tier = entry.tier ? `${entry.tier}, ` : '';
      return `${Label} "${name}" (${tier}${cells} cell${cells === 1 ? '' : 's'})`;
    }
    if (source === 'regions'){
      const name = entry.name || idOrSlug;
      const terrain = entry.terrain ? `, ${entry.terrain}` : '';
      return `Region "${name}" (overlay${terrain})`;
    }
    return String(idOrSlug);
  }

  // Render a single source's <div class="gcc-publish-source-group">
  // block (label + bulleted entries). Returns '' if no entries.
  function renderSourceGroup(label, source, entries){
    if (!entries || entries.length === 0) return '';
    const rows = entries.map(([idOrSlug, entry]) =>
      `<div class="gcc-publish-source-entry">${escapeHtml(renderDirtyEntry(source, idOrSlug, entry))}</div>`
    ).join('');
    return ''
      + '<div class="gcc-publish-source-group">'
      +   `<div class="gcc-publish-source-label">${escapeHtml(label)}:</div>`
      +   rows
      + '</div>';
  }

  function confirmPublishDialog(counts, details){
    const parts = [];
    if (counts.subhex) parts.push(`${counts.subhex} subhex cell${counts.subhex === 1 ? '' : 's'}`);
    if (counts.lakes)  parts.push(`${counts.lakes} lake${counts.lakes === 1 ? '' : 's'}`);
    if (counts.paths)  parts.push(`${counts.paths} path${counts.paths === 1 ? '' : 's'}`);
    if (counts.regions) parts.push(`${counts.regions} region${counts.regions === 1 ? '' : 's'}`);
    const breakdown = parts.join(', ');
    const detailsHtml = details ? (''
        + renderSourceGroup('Subhex', 'subhex', details.subhex)
        + renderSourceGroup('Lakes',  'lakes',  details.lakes)
        + renderSourceGroup('Paths',  'paths',  details.paths)
        + renderSourceGroup('Regions', 'regions', details.regions)
      ) : '';
    const detailsBlock = detailsHtml
      ? `<div class="gcc-publish-details">${detailsHtml}</div>`
      : '';
    return new Promise((resolve) => {
      const dlg = document.createElement('div');
      dlg.className = 'gcc-publish-dialog';
      dlg.innerHTML = ''
        + '<div class="gcc-publish-backdrop"></div>'
        + '<div class="gcc-publish-modal">'
        + '  <header>Confirm publish</header>'
        + `  <div class="gcc-publish-status">Push <b>${counts.total}</b> change${counts.total === 1 ? '' : 's'} to the cloud?</div>`
        + (breakdown ? `  <div class="gcc-publish-counts">${breakdown}</div>` : '')
        + detailsBlock
        + '  <div class="gcc-publish-counts">Cloud state will be overwritten with your local state. To unpublish a change, undo it locally and publish again.</div>'
        + '  <footer>'
        + '    <button class="gcc-publish-close gcc-publish-cancel">Cancel</button>'
        + '    <button class="gcc-publish-close gcc-publish-confirm">Publish</button>'
        + '  </footer>'
        + '</div>';
      document.body.appendChild(dlg);
      const cancel = () => { dlg.remove(); resolve(false); };
      const confirm = () => { dlg.remove(); resolve(true); };
      dlg.querySelector('.gcc-publish-cancel').addEventListener('click', cancel);
      dlg.querySelector('.gcc-publish-confirm').addEventListener('click', confirm);
      dlg.querySelector('.gcc-publish-backdrop').addEventListener('click', cancel);
    });
  }

  function showProgressDialog(){
    const dlg = document.createElement('div');
    dlg.className = 'gcc-publish-dialog';
    dlg.innerHTML = ''
      + '<div class="gcc-publish-backdrop"></div>'
      + '<div class="gcc-publish-modal">'
      + '  <header>Publishing subhex data</header>'
      + '  <div class="gcc-publish-status">Preparing…</div>'
      + '  <div class="gcc-publish-progress-track">'
      + '    <div class="gcc-publish-progress-bar" style="width:0%"></div>'
      + '  </div>'
      + '  <div class="gcc-publish-counts">0 of 0 published</div>'
      + '  <div class="gcc-publish-failures" style="display:none;"></div>'
      + '  <footer><button class="gcc-publish-close" disabled>Close</button></footer>'
      + '</div>';
    document.body.appendChild(dlg);
    return dlg;
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
    }[c]));
  }
  function showToast(msg){
    const t = document.getElementById('toast');
    if (!t){ console.log('[Publish]', msg); return; }
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
  }

  async function onPublishClick(){
    if (_publishing) return;
    const dirtyCounts = await getDirtyCounts();
    const total = dirtyCounts.total;
    if (total === 0){ showToast('No changes to publish'); return; }

    const dirtyDetails = await getDirtyDetails(dirtyCounts);
    const proceed = await confirmPublishDialog(dirtyCounts, dirtyDetails);
    if (!proceed) return;

    const dlg = showProgressDialog();
    const status   = dlg.querySelector('.gcc-publish-status');
    const bar      = dlg.querySelector('.gcc-publish-progress-bar');
    const counts   = dlg.querySelector('.gcc-publish-counts');
    const failBox  = dlg.querySelector('.gcc-publish-failures');
    const closeBtn = dlg.querySelector('.gcc-publish-close');

    status.textContent = `Publishing ${total}…`;
    counts.textContent = `0 of ${total} published`;

    const result = await publish((p) => {
      const pct = Math.round((p.published + p.failed) / p.total * 100);
      bar.style.width = pct + '%';
      counts.textContent = `${p.published} of ${p.total} published`
        + (p.failed ? ` (${p.failed} failed)` : '');
    });

    if (result.ok){
      status.textContent = result.failed
        ? `Done with ${result.failed} failure(s)`
        : 'Publish complete';
      if (result.failures && result.failures.length){
        failBox.style.display = '';
        const shown = result.failures.slice(0, 50);
        failBox.innerHTML = '<details><summary>Failures ('
          + result.failures.length + ')</summary><ul>'
          + shown.map(f => `<li>${escapeHtml(f.id)}: ${escapeHtml(f.error)}</li>`).join('')
          + (result.failures.length > 50
              ? `<li>… and ${result.failures.length - 50} more</li>` : '')
          + '</ul></details>';
      }
    } else {
      status.textContent = 'Publish failed: ' + (result.reason || 'unknown');
    }
    closeBtn.disabled = false;
    closeBtn.addEventListener('click', () => dlg.remove());
    refreshBadge();
  }

  // ─── Auth wiring ───────────────────────────────────────────────────
  async function onAuthChange(user){
    if (user){
      _uid = user.uid;
      _isGM = await checkGM(_uid);
      if (_isGM) showButton(); else hideButton();
    } else {
      _uid = null;
      _isGM = false;
      hideButton();
    }
  }

  function init(){
    wireButton();
    if (typeof GCCAuth !== 'undefined' && GCCAuth.onAuthChange){
      GCCAuth.onAuthChange(onAuthChange);
    } else {
      const t = setInterval(() => {
        if (typeof GCCAuth !== 'undefined' && GCCAuth.onAuthChange){
          clearInterval(t);
          GCCAuth.onAuthChange(onAuthChange);
        }
      }, 100);
      setTimeout(() => clearInterval(t), 10000);
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.GCCPublish = { publish, getDirtyCount, getDirtyCounts, refreshBadge, isGM: () => _isGM, renderDirtyEntry };
})();
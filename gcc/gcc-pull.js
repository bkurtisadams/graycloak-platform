// gcc-pull.js v0.3.0 — 2026-08-11
// v0.3.0 — Fourth pull source: mapRegions/ → overlay regions.
//          Mirrors lakes: cloud keys by slug, local REGIONS keys by
//          'region_slug'; getLocalRegions translates via
//          parseRegionId, apply goes through
//          GCCSubhexData.applyRegionsFromCloud (no _dirtyAt
//          re-stamp). Confirm + result dialogs gain a Regions row.
// v0.2.2 — Tooltip hover text on every verdict bit in the
//          per-source summary lines + the force-overwrite checkbox.
//          Native `title` attributes; dotted underline visual cue
//          via gcc-pull.css. Term explanations:
//            +N added    — cloud has these; your local does not.
//            ~N updated  — cloud newer, local clean.
//            !N forced   — local was dirty but force-overwrite chosen.
//            N skipped   — local dirty edits preserved.
//            no changes  — cloud and local in sync.
// v0.2.1 — loadFirestoreSdk race fix. When publish.js loads the SDK
//          first, pull.js's previous "script tag exists" check
//          resolved before the script finished loading, causing
//          `firebase.firestore is not a function`. Now polls for
//          actual SDK readiness with a 10s timeout when a tag is
//          already present.
// v0.2.0 — UI: ⬇ button next to ⬆ publish (hidden until GM
//          verified). Click runs previewPull, opens confirm dialog
//          with per-source add/update/skip breakdown; force-overwrite
//          checkbox appears only when there are skips. Confirm runs
//          pull({force}) and shows a result dialog. Mirrors the
//          publish UI pattern. No badge in v0.1 — see
//          DESIGN-cloud-pull.md Q8.
// v0.1.0 — Cloud → local pull. Mirror of gcc-publish.js. Reads
//          subHexes/, lakes/, paths/ collections from Firestore,
//          computes per-doc verdicts (add/update/noop/skip/
//          conflict-update), and applies via each source's
//          applyXxxFromCloud method (no _dirtyAt re-stamp).
//          See DESIGN-cloud-pull.md.
//
// - Loads firebase-firestore-compat.js on demand (idempotent).
// - Checks gms/{uid} to gate the operation (same gate as publish).
// - Verdict table (DESIGN-cloud-pull.md Q3):
//     local absent                                        → add
//     local present, _publishedAt < cloud, no _dirtyAt    → update
//     local present, _publishedAt matches cloud           → noop
//     local has _dirtyAt                                  → skip
//                                          (force=true    → conflict-update)
// - previewPull({force}) runs the verdict table without applying;
//   returns per-source {add, update, noop, skip, conflict, total}.
// - pull({force}) applies via the apply receivers from the three
//   sources. Per-source isolation: a failure in one source doesn't
//   roll back the others.
// - Doc-key translation: lakes/paths cloud collections key by slug
//   ('quagflow'); local storage keys by full doc id ('lake_quagflow').
//   pull operates in slug-space (cloud convention); each source's
//   apply receiver translates internally.
// - No UI here. Slice 3 adds the ⬇ button + confirm dialog.
// - Exposes window.GCCPull = { previewPull, pull, getCloudDocs,
//   isGM, init }.

(function(){
  'use strict';

  const COL_SUBHEX = 'subHexes';
  const COL_LAKES  = 'lakes';
  const COL_PATHS  = 'paths';
  const COL_REGIONS = 'mapRegions';
  const FB_VERSION = '10.12.2';
  const FB_FIRESTORE_URL = `https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-firestore-compat.js`;

  let _db = null;
  let _uid = null;
  let _isGM = false;
  let _pulling = false;

  // ── SDK & GM gating (mirrors gcc-publish.js) ───────────────────────
  // loadFirestoreSdk has a subtle race with gcc-publish.js: both
  // modules' onAuthChange callbacks fire on the same auth event,
  // and both call loadFirestoreSdk. Whichever runs first inserts the
  // <script> tag. The other previously did `document.querySelector(
  // script[src=...])` and resolved immediately on tag presence —
  // but the tag exists before the SDK has loaded. Result:
  // `firebase.firestore is not a function`. Fix: when the tag is
  // present but the SDK isn't ready, poll firebase.firestore until
  // it's a function (or timeout at 10s).
  function loadFirestoreSdk(){
    return new Promise((resolve, reject) => {
      if (window.firebase && typeof window.firebase.firestore === 'function'){
        resolve(); return;
      }
      const existing = document.querySelector(`script[src="${FB_FIRESTORE_URL}"]`);
      if (existing){
        const t0 = Date.now();
        const poll = () => {
          if (window.firebase && typeof window.firebase.firestore === 'function'){
            resolve();
          } else if (Date.now() - t0 > 10000){
            reject(new Error('firestore SDK load timeout (another module loaded the tag but SDK never became ready)'));
          } else {
            setTimeout(poll, 50);
          }
        };
        poll();
        return;
      }
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
      console.warn('[Pull] GM check failed:', e);
      return false;
    }
  }
  function isGM(){ return _isGM; }

  // ── Cloud reads ────────────────────────────────────────────────────
  // Full-collection read in v0.1. Delta-by-_publishedAt deferred to
  // v0.2 if read budget becomes a concern.
  async function getCloudDocs(collection){
    await initDb();
    const snap = await _db.collection(collection).get();
    const out = {};
    snap.forEach(doc => { out[doc.id] = doc.data(); });
    return out;
  }

  // ── Local readers (normalized to cloud-key space) ──────────────────
  // pull's verdict comparison operates in slug-space because that's
  // how Firestore keys lakes/paths. Subhex is the same key on both
  // sides ('subhex_3_5'). For lakes/paths, strip the doc-id prefix.
  async function getLocalSubhex(){
    if (!window.GCCSubhexStore || typeof window.GCCSubhexStore.loadAll !== 'function') return {};
    try { return await window.GCCSubhexStore.loadAll(); }
    catch(e){ console.warn('[Pull] local subhex load failed:', e); return {}; }
  }
  function getLocalLakes(){
    const D = window.GCCSubhexData;
    if (!D || typeof D.exportLakes !== 'function') return {};
    const raw = D.exportLakes();
    const out = {};
    const parse = D.parseLakeId || (k => k);
    for (const k of Object.keys(raw)){
      const slug = parse(k);
      if (slug) out[slug] = raw[k];
    }
    return out;
  }
  function getLocalPaths(){
    const P = window.GCCSubhexPaths;
    if (!P || typeof P.exportPaths !== 'function') return {};
    const raw = P.exportPaths();
    const out = {};
    const parse = P.parsePathDocId || (k => k);
    for (const k of Object.keys(raw)){
      const slug = parse(k);
      if (slug) out[slug] = raw[k];
    }
    return out;
  }
  function getLocalRegions(){
    const D = window.GCCSubhexData;
    if (!D || typeof D.exportRegions !== 'function') return {};
    const raw = D.exportRegions();
    const out = {};
    const parse = D.parseRegionId || (k => k);
    for (const k of Object.keys(raw)){
      const slug = parse(k);
      if (slug) out[slug] = raw[k];
    }
    return out;
  }

  // ── Verdict computation ────────────────────────────────────────────
  function verdictForDoc(localDoc, cloudDoc, force){
    if (!localDoc) return 'add';
    if (localDoc._dirtyAt){
      return force ? 'conflict-update' : 'skip';
    }
    const localTs = localDoc._publishedAt || 0;
    const cloudTs = cloudDoc._publishedAt || 0;
    if (cloudTs > localTs) return 'update';
    return 'noop';
  }
  function bucketVerdicts(localMap, cloudMap, force){
    const buckets = { add: [], update: [], noop: [], skip: [], conflict: [] };
    for (const id of Object.keys(cloudMap)){
      const v = verdictForDoc(localMap[id], cloudMap[id], !!force);
      if      (v === 'add')             buckets.add.push(id);
      else if (v === 'update')          buckets.update.push(id);
      else if (v === 'noop')            buckets.noop.push(id);
      else if (v === 'skip')            buckets.skip.push(id);
      else if (v === 'conflict-update') buckets.conflict.push(id);
    }
    return buckets;
  }
  function summarize(buckets){
    return {
      add:      buckets.add.length,
      update:   buckets.update.length,
      noop:     buckets.noop.length,
      skip:     buckets.skip.length,
      conflict: buckets.conflict.length,
      total:    buckets.add.length + buckets.update.length + buckets.conflict.length,
    };
  }
  function pickApplySet(buckets, cloudMap){
    const out = {};
    for (const id of buckets.add)      out[id] = cloudMap[id];
    for (const id of buckets.update)   out[id] = cloudMap[id];
    for (const id of buckets.conflict) out[id] = cloudMap[id];
    return out;
  }

  // ── Per-source preview pipeline ────────────────────────────────────
  async function previewSource(getLocal, getCloud, force){
    const [local, cloud] = await Promise.all([getLocal(), getCloud()]);
    const buckets = bucketVerdicts(local, cloud, force);
    return { buckets, cloud, summary: summarize(buckets) };
  }

  // ── previewPull / pull ─────────────────────────────────────────────
  async function previewPull(opts){
    if (!_isGM) return { ok: false, reason: 'Not a GM' };
    if (!_uid)  return { ok: false, reason: 'Not signed in' };
    const force = !!(opts && opts.force);
    try {
      const [subhex, lakes, paths, regions] = await Promise.all([
        previewSource(getLocalSubhex,  () => getCloudDocs(COL_SUBHEX),  force),
        previewSource(getLocalLakes,   () => getCloudDocs(COL_LAKES),   force),
        previewSource(getLocalPaths,   () => getCloudDocs(COL_PATHS),   force),
        previewSource(getLocalRegions, () => getCloudDocs(COL_REGIONS), force),
      ]);
      return {
        ok: true,
        subhex:  subhex.summary,
        lakes:   lakes.summary,
        paths:   paths.summary,
        regions: regions.summary,
        total:   subhex.summary.total + lakes.summary.total + paths.summary.total + regions.summary.total,
        skipped: subhex.summary.skip  + lakes.summary.skip  + paths.summary.skip  + regions.summary.skip,
      };
    } catch(e){
      console.warn('[Pull] previewPull failed:', e);
      return { ok: false, reason: e.message || String(e) };
    }
  }

  async function pull(opts){
    if (_pulling) return { ok: false, reason: 'Pull already in progress' };
    if (!_isGM)   return { ok: false, reason: 'Not a GM' };
    if (!_uid)    return { ok: false, reason: 'Not signed in' };
    await initDb();
    if (!_db)     return { ok: false, reason: 'Firestore not initialized' };

    _pulling = true;
    const force = !!(opts && opts.force);
    const result = { ok: true, subhex: null, lakes: null, paths: null, regions: null };

    try {
      // Subhex
      try {
        const { buckets, cloud, summary } = await previewSource(
          getLocalSubhex, () => getCloudDocs(COL_SUBHEX), force);
        const toApply = pickApplySet(buckets, cloud);
        if (Object.keys(toApply).length
            && window.GCCSubhexData
            && typeof window.GCCSubhexData.applyOverridesFromCloud === 'function'){
          await window.GCCSubhexData.applyOverridesFromCloud(toApply);
        }
        result.subhex = { ok: true, summary };
      } catch(e){
        console.warn('[Pull] subhex failed:', e);
        result.subhex = { ok: false, error: e.message || String(e) };
      }

      // Lakes
      try {
        const { buckets, cloud, summary } = await previewSource(
          getLocalLakes, () => getCloudDocs(COL_LAKES), force);
        const toApply = pickApplySet(buckets, cloud);
        if (Object.keys(toApply).length
            && window.GCCSubhexData
            && typeof window.GCCSubhexData.applyLakesFromCloud === 'function'){
          window.GCCSubhexData.applyLakesFromCloud(toApply);
        }
        result.lakes = { ok: true, summary };
      } catch(e){
        console.warn('[Pull] lakes failed:', e);
        result.lakes = { ok: false, error: e.message || String(e) };
      }

      // Paths
      try {
        const { buckets, cloud, summary } = await previewSource(
          getLocalPaths, () => getCloudDocs(COL_PATHS), force);
        const toApply = pickApplySet(buckets, cloud);
        if (Object.keys(toApply).length
            && window.GCCSubhexPaths
            && typeof window.GCCSubhexPaths.applyPathsFromCloud === 'function'){
          window.GCCSubhexPaths.applyPathsFromCloud(toApply);
        }
        result.paths = { ok: true, summary };
      } catch(e){
        console.warn('[Pull] paths failed:', e);
        result.paths = { ok: false, error: e.message || String(e) };
      }

      // Regions (mapRegions/)
      try {
        const { buckets, cloud, summary } = await previewSource(
          getLocalRegions, () => getCloudDocs(COL_REGIONS), force);
        const toApply = pickApplySet(buckets, cloud);
        if (Object.keys(toApply).length
            && window.GCCSubhexData
            && typeof window.GCCSubhexData.applyRegionsFromCloud === 'function'){
          window.GCCSubhexData.applyRegionsFromCloud(toApply);
        }
        result.regions = { ok: true, summary };
      } catch(e){
        console.warn('[Pull] regions failed:', e);
        result.regions = { ok: false, error: e.message || String(e) };
      }

      return result;
    } finally {
      _pulling = false;
    }
  }

  // ─── UI ────────────────────────────────────────────────────────────
  let _btnEl = null;

  function makeButton(){
    const btn = document.createElement('button');
    btn.className = 'gcc-nav-btn gcc-pull-btn';
    btn.id = 'gcc-btn-pull';
    btn.title = 'Pull subhex data from cloud';
    btn.style.display = 'none';
    btn.textContent = '⬇';
    return btn;
  }
  function wireButton(){
    let btn = document.getElementById('gcc-btn-pull');
    if (!btn){
      // Insert right after ⬆ Publish if present; fall back to before
      // settings (so we're still in the nav cluster).
      const publish  = document.getElementById('gcc-btn-publish');
      const settings = document.getElementById('gcc-btn-settings');
      btn = makeButton();
      if (publish && publish.parentNode){
        publish.parentNode.insertBefore(btn, publish.nextSibling);
      } else if (settings && settings.parentNode){
        settings.parentNode.insertBefore(btn, settings);
      } else {
        return;  // no nav yet; wireButton will be re-tried by init
      }
    }
    _btnEl = btn;
    btn.addEventListener('click', onPullClick);
  }
  function showButton(){ if (_btnEl) _btnEl.style.display = ''; }
  function hideButton(){ if (_btnEl) _btnEl.style.display = 'none'; }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
    }[c]));
  }
  function showToast(msg){
    const t = document.getElementById('toast');
    if (!t){ console.log('[Pull]', msg); return; }
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
  }

  // Tooltip text for the verdict bits in the per-source summary.
  // Surfaced via native `title` attributes; styled with a dotted
  // underline cue in gcc-pull.css.
  const TOOLTIP = {
    added:    'Cloud has these; your local does not. Pull will create them locally.',
    updated:  'Cloud has newer versions and your local has no unpublished edits. Pull will replace your local copy.',
    forced:   'Local had unpublished edits, but force-overwrite was chosen. Cloud version overwrote local.',
    skipped:  'You have unpublished edits on these. Pull leaves them alone so your local work is preserved.',
    noChanges: 'Cloud and local match on this source. Pull is a no-op here.',
    force:    'Replace your unpublished local edits with the cloud versions. Local changes will be lost.',
  };

  // Per-source line for the confirm + result dialogs. `summary` is
  // { add, update, noop, skip, conflict, total }. Each verdict bit
  // gets a title-attribute tooltip explaining the term.
  function renderSummaryLine(label, summary){
    const tip = (t) => escapeHtml(t);
    const bits = [];
    if (summary.add){
      bits.push(`<span title="${tip(TOOLTIP.added)}">+${summary.add} added</span>`);
    }
    if (summary.update){
      bits.push(`<span title="${tip(TOOLTIP.updated)}">~${summary.update} updated</span>`);
    }
    if (summary.conflict){
      bits.push(`<span title="${tip(TOOLTIP.forced)}">!${summary.conflict} forced</span>`);
    }
    if (summary.skip){
      bits.push(`<span title="${tip(TOOLTIP.skipped)}">${summary.skip} skipped</span>`);
    }
    const desc = bits.length
      ? bits.join(', ')
      : `<span title="${tip(TOOLTIP.noChanges)}">no changes</span>`;
    return ''
      + '<div class="gcc-pull-source-row">'
      +   `<span class="gcc-pull-source-name">${escapeHtml(label)}:</span> `
      +   `<span class="gcc-pull-source-desc">${desc}</span>`
      + '</div>';
  }

  // Confirm dialog. Returns { proceed: bool, force: bool }.
  function confirmPullDialog(preview){
    const totalChanges = preview.total;
    const totalSkipped = preview.skipped;
    return new Promise((resolve) => {
      const dlg = document.createElement('div');
      dlg.className = 'gcc-pull-dialog';
      const forceRow = totalSkipped > 0
        ? `<label class="gcc-pull-force-row" title="${escapeHtml(TOOLTIP.force)}">`
        +   '<input type="checkbox" class="gcc-pull-force"> '
        +   `Force overwrite local changes (${totalSkipped} skipped)`
        + '</label>'
        : '';
      dlg.innerHTML = ''
        + '<div class="gcc-pull-backdrop"></div>'
        + '<div class="gcc-pull-modal">'
        +   '<header>Pull from cloud</header>'
        +   `<div class="gcc-pull-status">Pull <b>${totalChanges}</b> change${totalChanges === 1 ? '' : 's'} from the cloud?</div>`
        +   '<div class="gcc-pull-sources">'
        +     renderSummaryLine('Subhex', preview.subhex)
        +     renderSummaryLine('Lakes',  preview.lakes)
        +     renderSummaryLine('Paths',  preview.paths)
        +     renderSummaryLine('Regions', preview.regions)
        +   '</div>'
        +   forceRow
        +   '<div class="gcc-pull-note">Local-only docs are kept. Cloud deletes don\'t propagate yet (tombstones land in a follow-up).</div>'
        +   '<footer>'
        +     '<button class="gcc-pull-close gcc-pull-cancel">Cancel</button>'
        +     '<button class="gcc-pull-close gcc-pull-confirm">Pull</button>'
        +   '</footer>'
        + '</div>';
      document.body.appendChild(dlg);
      const cancel = () => { dlg.remove(); resolve({ proceed: false, force: false }); };
      const confirm = () => {
        const cb = dlg.querySelector('.gcc-pull-force');
        const force = !!(cb && cb.checked);
        dlg.remove();
        resolve({ proceed: true, force });
      };
      dlg.querySelector('.gcc-pull-cancel').addEventListener('click', cancel);
      dlg.querySelector('.gcc-pull-confirm').addEventListener('click', confirm);
      dlg.querySelector('.gcc-pull-backdrop').addEventListener('click', cancel);
    });
  }

  function showProgressDialog(){
    const dlg = document.createElement('div');
    dlg.className = 'gcc-pull-dialog';
    dlg.innerHTML = ''
      + '<div class="gcc-pull-backdrop"></div>'
      + '<div class="gcc-pull-modal">'
      +   '<header>Pulling from cloud</header>'
      +   '<div class="gcc-pull-status">Fetching…</div>'
      +   '<div class="gcc-pull-sources"></div>'
      +   '<footer><button class="gcc-pull-close" disabled>Close</button></footer>'
      + '</div>';
    document.body.appendChild(dlg);
    return dlg;
  }

  // Map the per-source result into a summary-shaped object (or null
  // if the source errored).
  function summaryFromResult(srcResult){
    if (!srcResult || !srcResult.ok) return null;
    return srcResult.summary;
  }
  function errorFromResult(srcResult){
    if (!srcResult || srcResult.ok) return null;
    return srcResult.error || 'unknown error';
  }

  async function onPullClick(){
    if (!_btnEl || _btnEl.disabled) return;
    _btnEl.disabled = true;
    try {
      const preview = await previewPull({ force: false });
      if (!preview.ok){
        showToast('Pull preview failed: ' + (preview.reason || 'unknown'));
        return;
      }
      if (preview.total === 0 && preview.skipped === 0){
        showToast('No changes to pull');
        return;
      }
      const { proceed, force } = await confirmPullDialog(preview);
      if (!proceed) return;

      const dlg = showProgressDialog();
      const status   = dlg.querySelector('.gcc-pull-status');
      const sources  = dlg.querySelector('.gcc-pull-sources');
      const closeBtn = dlg.querySelector('.gcc-pull-close');

      const result = await pull({ force });

      // Render per-source results.
      const lines = [];
      const errors = [];
      const renderOne = (label, srcResult) => {
        const s = summaryFromResult(srcResult);
        if (s){
          lines.push(renderSummaryLine(label, s));
        } else {
          const err = errorFromResult(srcResult);
          errors.push(`${label}: ${err}`);
          lines.push(`<div class="gcc-pull-source-row">`
            + `<span class="gcc-pull-source-name">${label}:</span> `
            + `<span class="gcc-pull-source-err">${escapeHtml(err)}</span></div>`);
        }
      };
      renderOne('Subhex', result.subhex);
      renderOne('Lakes',  result.lakes);
      renderOne('Paths',  result.paths);
      renderOne('Regions', result.regions);

      status.textContent = errors.length
        ? `Pull completed with ${errors.length} error${errors.length === 1 ? '' : 's'}`
        : 'Pull complete';
      sources.innerHTML = lines.join('');
      closeBtn.disabled = false;
      closeBtn.addEventListener('click', () => dlg.remove());
    } finally {
      if (_btnEl) _btnEl.disabled = false;
    }
  }

  // ── Auth lifecycle ─────────────────────────────────────────────────
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

  window.GCCPull = { previewPull, pull, getCloudDocs, isGM, init };
})();

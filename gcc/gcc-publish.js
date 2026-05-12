// gcc-publish.js v0.2.0 — 2026-05-12
// v0.2.0 — confirmation dialog before publish ("Push N changes?"
//          [Cancel] [Publish]). Prevents accidental ⬆ clicks
//          from pushing local IDB state to cloud.
// v0.1.0 — First Firestore write path for subhex data. GM-only.
//
// - Loads firebase-firestore-compat.js on demand (idempotent).
// - Checks gms/{uid} to gate UI (matches firestore.rules v4 isGM()).
// - Reads dirty entries from GCCSubhexStore, writes in 500-op batches
//   to subHexes/{id}, then markPublished(ids, ts) clears _dirtyAt.
// - Injects ⬆ button into gcc-nav before #gcc-btn-settings, with a
//   dirty-count badge; hidden until GM verified.
// - Exposes window.GCCPublish = { publish, getDirtyCount, isGM, refreshBadge }.

(function(){
  'use strict';

  const COL = 'subHexes';
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

  async function getDirtyCount(){
    if (!window.GCCSubhexStore) return 0;
    try {
      const dirty = await window.GCCSubhexStore.getDirty();
      return dirty.length;
    } catch(e){
      console.warn('[Publish] getDirtyCount failed:', e);
      return 0;
    }
  }

  async function publish(onProgress){
    if (_publishing) return { ok: false, reason: 'Publish already in progress' };
    if (!_isGM)      return { ok: false, reason: 'Not a GM' };
    if (!_uid || !_db) return { ok: false, reason: 'Not signed in' };
    if (!window.GCCSubhexStore) return { ok: false, reason: 'Subhex store unavailable' };

    _publishing = true;
    try {
      await window.GCCSubhexStore.flush();
      const dirty = await window.GCCSubhexStore.getDirty();
      const total = dirty.length;
      if (total === 0) return { ok: true, total: 0, published: 0, failed: 0, failures: [] };

      let published = 0;
      const failures = [];
      const publishedTs = Date.now();

      for (let i = 0; i < dirty.length; i += BATCH_SIZE){
        const chunk = dirty.slice(i, i + BATCH_SIZE);
        const batch = _db.batch();
        for (const [id, entry] of chunk){
          const out = Object.assign({}, entry);
          delete out._dirtyAt;
          out._publishedAt = publishedTs;
          out.schemaVersion = out.schemaVersion || 1;
          batch.set(_db.collection(COL).doc(id), out);
        }
        try {
          await batch.commit();
          await window.GCCSubhexStore.markPublished(chunk.map(([id]) => id), publishedTs);
          published += chunk.length;
        } catch(e){
          console.warn('[Publish] batch commit failed:', e);
          chunk.forEach(([id]) => failures.push({ id, error: e.message || String(e) }));
        }
        if (onProgress) onProgress({ published, failed: failures.length, total });
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

  function confirmPublishDialog(total){
    return new Promise((resolve) => {
      const dlg = document.createElement('div');
      dlg.className = 'gcc-publish-dialog';
      dlg.innerHTML = ''
        + '<div class="gcc-publish-backdrop"></div>'
        + '<div class="gcc-publish-modal">'
        + '  <header>Confirm publish</header>'
        + `  <div class="gcc-publish-status">Push <b>${total}</b> subhex change${total === 1 ? '' : 's'} to the cloud?</div>`
        + '  <div class="gcc-publish-counts">Cloud state will be overwritten with your local IDB state. To unpublish a change, undo it locally and publish again.</div>'
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
    const total = await getDirtyCount();
    if (total === 0){ showToast('No changes to publish'); return; }

    const proceed = await confirmPublishDialog(total);
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

  window.GCCPublish = { publish, getDirtyCount, refreshBadge, isGM: () => _isGM };
})();
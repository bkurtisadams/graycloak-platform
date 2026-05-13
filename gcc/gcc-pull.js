// gcc-pull.js v0.1.0 — 2026-05-13
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
  const FB_VERSION = '10.12.2';
  const FB_FIRESTORE_URL = `https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-firestore-compat.js`;

  let _db = null;
  let _uid = null;
  let _isGM = false;
  let _pulling = false;

  // ── SDK & GM gating (mirrors gcc-publish.js) ───────────────────────
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
      const [subhex, lakes, paths] = await Promise.all([
        previewSource(getLocalSubhex, () => getCloudDocs(COL_SUBHEX), force),
        previewSource(getLocalLakes,  () => getCloudDocs(COL_LAKES),  force),
        previewSource(getLocalPaths,  () => getCloudDocs(COL_PATHS),  force),
      ]);
      return {
        ok: true,
        subhex:  subhex.summary,
        lakes:   lakes.summary,
        paths:   paths.summary,
        total:   subhex.summary.total + lakes.summary.total + paths.summary.total,
        skipped: subhex.summary.skip  + lakes.summary.skip  + paths.summary.skip,
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
    const result = { ok: true, subhex: null, lakes: null, paths: null };

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

      return result;
    } finally {
      _pulling = false;
    }
  }

  // ── Auth lifecycle ─────────────────────────────────────────────────
  async function onAuthChange(user){
    if (user){
      _uid = user.uid;
      _isGM = await checkGM(_uid);
    } else {
      _uid = null;
      _isGM = false;
    }
  }

  function init(){
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

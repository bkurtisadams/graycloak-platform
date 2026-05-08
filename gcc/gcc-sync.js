// gcc-sync.js v2.1.0 — 2026-04-08
// v2.1.0: Fix sync race condition — save queue prevents pull from stomping in-flight saves;
//         notifySync() bridge for pages that write localStorage directly.
// Firestore sync layer for Graycloak's Campaign Corner
// Requires: gcc-data.js, gcc-auth.js, gcc-firebase-config.js
//
// Strategy:
//   - When signed out: localStorage only (no change from before)
//   - On sign-in: upload localStorage → Firestore, then pull Firestore → localStorage
//   - When signed in: save() writes to both, load() reads from localStorage (hydrated from cloud)
//
// Firestore structure:
//   Simple keys (campaigns, activity, etc):
//     users/{uid}/data/{key} → { json: <string>, _updated: <ISO> }
//   Entity list keys (character/vehicle lists):
//     users/{uid}/lists/{listKey}/items/{entityId} → { json: <string>, _updated: <ISO> }
//     users/{uid}/lists/{listKey} → { ids: [...], _updated: <ISO> }  (ordering manifest)
//   Entity lists are split so each character is its own document (avoids 1MB limit).

const GCCSync = (function() {

  const FB_VERSION = '10.12.2';
  const FB_FIRESTORE_URL = `https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-firestore-compat.js`;

  let _db = null;
  let _uid = null;
  let _ready = false;
  let _readyCallbacks = [];

  // ── Key classification ──
  const SIMPLE_KEYS = [
    'gcc-campaigns',
    'gcc-activity',
    'gcc-jumpback',
    'gcc-vtts',
    'gcc-settings',
  ];

  const LIST_KEYS = [
    'mp-char-list',
    'mp-veh-list',
    'gcc-faserip-chars',
    'gcc-add1e-chars',
  ];

  const ALL_SYNC_KEYS = SIMPLE_KEYS.concat(LIST_KEYS);

  function isSyncKey(key) { return ALL_SYNC_KEYS.indexOf(key) !== -1; }
  function isListKey(key) { return LIST_KEYS.indexOf(key) !== -1; }

  // Portrait fields that may contain large base64 strings
  const PORTRAIT_FIELDS = ['portraitData', '_image', 'portrait'];
  const PORTRAIT_SENTINEL = '__portrait_too_large__';

  // ── Load Firestore SDK ──
  function loadScript(url) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${url}"]`)) { resolve(); return; }
      const s = document.createElement('script');
      s.src = url;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Failed to load ' + url));
      document.head.appendChild(s);
    });
  }

  async function initFirestore() {
    if (_db) return _db;
    try {
      await loadScript(FB_FIRESTORE_URL);
      _db = firebase.firestore();
      return _db;
    } catch(e) {
      console.error('[GCCSync] Firestore init failed:', e);
      return null;
    }
  }

  // ── Firestore references ──
  function userRef() {
    if (!_db || !_uid) return null;
    return _db.collection('users').doc(_uid);
  }

  function simpleDocRef(key) {
    const u = userRef();
    return u ? u.collection('data').doc(key) : null;
  }

  function listDocRef(listKey) {
    const u = userRef();
    return u ? u.collection('lists').doc(listKey) : null;
  }

  function listItemDocRef(listKey, entityId) {
    const lr = listDocRef(listKey);
    return lr ? lr.collection('items').doc(entityId) : null;
  }

  // ══════════════════════════════════════
  // ── Simple key cloud ops ──
  // ══════════════════════════════════════

  async function cloudLoadSimple(key) {
    const ref = simpleDocRef(key);
    if (!ref) return undefined;
    try {
      const snap = await ref.get();
      if (snap.exists) {
        const data = snap.data();
        if (data.json !== undefined) return JSON.parse(data.json);
        if (data.value !== undefined) return data.value; // legacy v1 format
      }
      return undefined;
    } catch(e) {
      console.warn('[GCCSync] cloudLoadSimple failed for', key, e);
      return undefined;
    }
  }

  async function cloudSaveSimple(key, val) {
    const ref = simpleDocRef(key);
    if (!ref) return;
    try {
      await ref.set({ json: JSON.stringify(val), _updated: new Date().toISOString() });
    } catch(e) {
      console.warn('[GCCSync] cloudSaveSimple failed for', key, e);
    }
  }

  // ══════════════════════════════════════
  // ── Entity list cloud ops ──
  // ══════════════════════════════════════

  function ensureItemId(item) {
    if (!item._id) {
      item._id = (typeof GCC !== 'undefined' && GCC.genId)
        ? GCC.genId('ent')
        : 'ent_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    }
    return item._id;
  }

  async function cloudSaveList(listKey, items) {
    if (!_db || !_uid || !items) return;
    const now = new Date().toISOString();

    // Ensure every item has an _id
    items.forEach(item => ensureItemId(item));
    const ids = items.map(it => it._id);

    // Save ordering manifest
    const metaRef = listDocRef(listKey);
    if (!metaRef) return;
    try {
      await metaRef.set({ ids: ids, _updated: now });
    } catch(e) {
      console.warn('[GCCSync] list meta save failed:', listKey, e);
      return;
    }

    // Save each entity individually
    const MAX_DOC_BYTES = 900000; // stay under Firestore 1MB limit

    let saved = 0;
    for (const item of items) {
      const ref = listItemDocRef(listKey, item._id);
      if (!ref) continue;
      try {
        let jsonStr = JSON.stringify(item);
        // If over size limit, strip portrait data and retry
        if (jsonStr.length > MAX_DOC_BYTES) {
          const slim = Object.assign({}, item);
          let stripped = false;
          PORTRAIT_FIELDS.forEach(field => {
            if (slim[field] && typeof slim[field] === 'string' && slim[field].length > 1000) {
              slim[field] = PORTRAIT_SENTINEL;
              stripped = true;
            }
          });
          if (stripped) {
            jsonStr = JSON.stringify(slim);
            console.warn('[GCCSync] stripped portrait from', item.heroName || item.name || item._id, '(' + listKey + ') — too large for cloud sync');
          }
        }
        await ref.set({ json: jsonStr, _updated: now });
        saved++;
      } catch(e) {
        console.warn('[GCCSync] list item save failed:', listKey, item._id, e);
      }
    }

    // Delete orphaned items no longer in the list
    try {
      const allSnap = await metaRef.collection('items').get();
      const deleteOps = [];
      allSnap.forEach(doc => {
        if (ids.indexOf(doc.id) === -1) {
          deleteOps.push(doc.ref.delete());
        }
      });
      if (deleteOps.length > 0) {
        await Promise.all(deleteOps);
        console.log('[GCCSync] cleaned', deleteOps.length, 'orphaned items from', listKey);
      }
    } catch(e) {
      console.warn('[GCCSync] orphan cleanup failed for', listKey, e);
    }

    console.log('[GCCSync] saved', saved, 'items to', listKey);
  }

  async function cloudLoadList(listKey) {
    if (!_db || !_uid) return undefined;

    const metaRef = listDocRef(listKey);
    if (!metaRef) return undefined;

    try {
      const metaSnap = await metaRef.get();
      if (!metaSnap.exists) return undefined;
      const meta = metaSnap.data();
      const ids = meta.ids || [];
      if (ids.length === 0) return [];

      // Read all items in the subcollection
      const itemsSnap = await metaRef.collection('items').get();
      const byId = {};
      itemsSnap.forEach(doc => {
        const data = doc.data();
        if (data.json !== undefined) {
          try { byId[doc.id] = JSON.parse(data.json); } catch(e) {}
        }
      });

      // Rebuild in manifest order
      const result = [];
      ids.forEach(id => {
        if (byId[id]) result.push(byId[id]);
      });
      // Include any items present but not in manifest (safety)
      Object.keys(byId).forEach(id => {
        if (ids.indexOf(id) === -1) result.push(byId[id]);
      });

      return result;
    } catch(e) {
      console.warn('[GCCSync] cloudLoadList failed for', listKey, e);
      return undefined;
    }
  }

  // ══════════════════════════════════════
  // ── Unified cloud read/write ──
  // ══════════════════════════════════════

  async function cloudSave(key, val) {
    if (isListKey(key)) {
      await cloudSaveList(key, val);
    } else {
      await cloudSaveSimple(key, val);
    }
  }

  async function cloudLoad(key) {
    if (isListKey(key)) {
      return await cloudLoadList(key);
    } else {
      return await cloudLoadSimple(key);
    }
  }

  // ══════════════════════════════════════
  // ── Upload & Pull ──
  // ══════════════════════════════════════

  const SYNC_FORMAT_VERSION = 4; // v1=raw, v2=JSON strings, v3=per-entity, v4=portrait stripping

  // Check if a parsed value is effectively empty (not worth uploading/keeping)
  function isEmpty(val) {
    if (val === null || val === undefined) return true;
    if (Array.isArray(val) && val.length === 0) return true;
    if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0) return true;
    return false;
  }

  async function uploadLocalData() {
    if (!_db || !_uid) return;
    console.log('[GCCSync] Pushing local data to cloud...');
    let count = 0;
    for (const key of ALL_SYNC_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (raw !== null) {
          const val = JSON.parse(raw);
          // Don't upload empty data — would stomp real cloud data
          if (isEmpty(val)) continue;
          await cloudSave(key, val);
          count++;
        }
      } catch(e) {
        console.warn('[GCCSync] upload skip for', key, e);
      }
    }
    console.log('[GCCSync] Pushed', count, 'keys to cloud');
    try { localStorage.setItem('gcc-sync-uploaded-' + _uid, String(SYNC_FORMAT_VERSION)); } catch(e) {}
  }

  // Restore local portraits that were stripped during cloud save
  function mergeLocalPortraits(listKey, cloudItems) {
    let localRaw;
    try { localRaw = localStorage.getItem(listKey); } catch(e) { return cloudItems; }
    if (!localRaw) return cloudItems;
    let localItems;
    try { localItems = JSON.parse(localRaw); } catch(e) { return cloudItems; }
    if (!Array.isArray(localItems)) return cloudItems;

    const localById = {};
    localItems.forEach(it => { if (it._id) localById[it._id] = it; });

    cloudItems.forEach(item => {
      const local = localById[item._id];
      if (!local) return;
      PORTRAIT_FIELDS.forEach(field => {
        if (item[field] === PORTRAIT_SENTINEL && local[field] && local[field] !== PORTRAIT_SENTINEL) {
          item[field] = local[field];
        }
      });
    });
    return cloudItems;
  }

  async function pullCloudData() {
    if (!_db || !_uid) return;
    console.log('[GCCSync] Pulling from cloud (missing or empty keys)...');
    let count = 0;
    for (const key of ALL_SYNC_KEYS) {
      try {
        const local = localStorage.getItem(key);
        let needsPull = false;
        if (local === null) {
          needsPull = true;
        } else {
          try {
            const parsed = JSON.parse(local);
            // Treat empty arrays/objects as missing — pull from cloud
            if (isEmpty(parsed)) needsPull = true;
          } catch(e) {
            console.warn('[GCCSync] Corrupt local data for', key, '— will overwrite from cloud');
            needsPull = true;
          }
        }
        if (!needsPull) continue;
        const val = await cloudLoad(key);
        if (val !== undefined) {
          if (isListKey(key) && Array.isArray(val)) {
            mergeLocalPortraits(key, val);
          }
          localStorage.setItem(key, JSON.stringify(val));
          count++;
        }
      } catch(e) {
        console.warn('[GCCSync] pull skip for', key, e);
      }
    }
    if (count) console.log('[GCCSync] Restored', count, 'keys from cloud');
    else console.log('[GCCSync] Local data complete, nothing to pull');
  }

  // ══════════════════════════════════════
  // ── Patch GCC.save / GCC.load ──
  // ══════════════════════════════════════

  let _origSave = null;
  let _origLoad = null;

  // ── Save queue: track in-flight cloud saves ──
  // Prevents pullCloudData from stomping saves that haven't landed yet.
  let _pendingSaves = [];

  function trackSave(promise) {
    _pendingSaves.push(promise);
    promise.finally(() => {
      _pendingSaves = _pendingSaves.filter(p => p !== promise);
    });
    return promise;
  }

  async function flushPendingSaves() {
    if (_pendingSaves.length === 0) return;
    console.log('[GCCSync] flushing', _pendingSaves.length, 'pending save(s) before pull...');
    await Promise.allSettled(_pendingSaves);
  }

  function patchGCC() {
    if (typeof GCC === 'undefined') return;
    if (_origSave) return;

    _origSave = GCC.save;
    _origLoad = GCC.load;

    GCC.save = function(key, val) {
      _origSave(key, val);
      if (_uid && _db && isSyncKey(key)) {
        trackSave(
          cloudSave(key, val).catch(e => console.warn('[GCCSync] background save failed:', key, e))
        );
      }
    };

    GCC.load = function(key) {
      return _origLoad(key);
    };

    console.log('[GCCSync] GCC data layer patched for cloud sync');
  }

  // ── notifySync: bridge for pages that write localStorage directly ──
  // Call after a direct localStorage.setItem() on a synced key.
  // Reads the current localStorage value and pushes it to the cloud.
  function notifySync(key) {
    if (!_uid || !_db || !isSyncKey(key)) return;
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return;
      const val = JSON.parse(raw);
      trackSave(
        cloudSave(key, val).catch(e => console.warn('[GCCSync] notifySync failed:', key, e))
      );
    } catch(e) {
      console.warn('[GCCSync] notifySync parse error:', key, e);
    }
  }

  // ══════════════════════════════════════
  // ── Auth state handler ──
  // ══════════════════════════════════════

  async function onAuthChange(user) {
    if (user) {
      _uid = user.uid;
      await initFirestore();
      patchGCC();
      await uploadLocalData();
      await flushPendingSaves();
      await pullCloudData();
      _ready = true;
      _readyCallbacks.forEach(fn => { try { fn(); } catch(e) {} });
      _readyCallbacks = [];
      window.dispatchEvent(new CustomEvent('gcc-sync-ready'));
      console.log('[GCCSync] Sync active for user:', user.email);
    } else {
      _uid = null;
      _ready = false;
      window.dispatchEvent(new CustomEvent('gcc-sync-offline'));
    }
  }

  function onReady(fn) {
    if (_ready) { fn(); return; }
    _readyCallbacks.push(fn);
  }

  function isActive() {
    return _ready && !!_uid && !!_db;
  }

  // ── Manual sync ──
  async function syncNow() {
    if (!_uid || !_db) return { ok: false, reason: 'Not signed in' };
    let pushed = 0;
    for (const key of ALL_SYNC_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (raw !== null) {
          await cloudSave(key, JSON.parse(raw));
          pushed++;
        }
      } catch(e) {}
    }
    return { ok: true, pushed };
  }

  async function pullNow() {
    if (!_uid || !_db) return { ok: false, reason: 'Not signed in' };
    await flushPendingSaves();
    // Force full pull — overwrite local with cloud
    console.log('[GCCSync] Force pulling all keys from cloud...');
    let count = 0;
    for (const key of ALL_SYNC_KEYS) {
      try {
        const val = await cloudLoad(key);
        if (val !== undefined) {
          if (isListKey(key) && Array.isArray(val)) mergeLocalPortraits(key, val);
          localStorage.setItem(key, JSON.stringify(val));
          count++;
        }
      } catch(e) {}
    }
    console.log('[GCCSync] Force pulled', count, 'keys');
    return { ok: true };
  }

  // ── Init ──
  function init() {
    if (typeof GCCAuth !== 'undefined' && GCCAuth.onAuthChange) {
      GCCAuth.onAuthChange(onAuthChange);
    } else {
      const check = setInterval(() => {
        if (typeof GCCAuth !== 'undefined' && GCCAuth.onAuthChange) {
          clearInterval(check);
          GCCAuth.onAuthChange(onAuthChange);
        }
      }, 100);
      setTimeout(() => clearInterval(check), 10000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    isActive,
    onReady,
    syncNow,
    pullNow,
    notifySync,
    SYNC_KEYS: ALL_SYNC_KEYS,
  };

})();

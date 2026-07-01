// gcc-sync.js v2.3.0 — 2026-07-01
// v2.3.0: Normalize embedded campaign session ids, honor session tombstones,
//         and keep Issue counts from being inflated by timeline entries.
// v2.2.0: Fix multi-device data loss — sign-in now MERGES local+cloud per character
//         (union by _id, newest _saved wins) instead of upload-all-then-pull-only-empty,
//         which let a stale device clobber the cloud and never pull newer data.
//         Timestamps normalized across ISO-string and epoch-number formats.
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
  // ── Timestamp-aware merge (v2.2.0) ──
  // ══════════════════════════════════════

  // Normalize a save timestamp to epoch ms. Handles ISO strings (faserip,
  // mp-char) and epoch numbers (add1e). Missing/unparseable → 0 (treated oldest).
  function tsOf(item) {
    if (!item) return 0;
    const v = item._saved != null ? item._saved
            : item._updated != null ? item._updated
            : item.updated != null ? item.updated
            : item._modified != null ? item._modified
            : item.deletedAt != null ? item.deletedAt
            : item.created;
    if (v == null) return 0;
    if (typeof v === 'number') return v;
    const t = Date.parse(v);
    return isNaN(t) ? 0 : t;
  }

  // Cheap signature for change detection: id + timestamp per item, order-independent.
  function listSig(items) {
    if (!Array.isArray(items)) return '';
    return items.map(it => (it && it._id || '?') + ':' + tsOf(it)).sort().join('|');
  }

  // Union two item lists by _id. On conflict, keep the newer timestamp;
  // ties prefer `localItems` (the device the user is actively on). Items
  // present on only one side are always kept — nothing is ever deleted here.
  function mergeItemLists(localItems, cloudItems) {
    const byId = {};
    const order = [];
    function consider(item) {
      if (!item || typeof item !== 'object') return;
      if (!item._id) {
        item._id = (typeof GCC !== 'undefined' && GCC.genId)
          ? GCC.genId('mrg')
          : ('mrg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7));
      }
      const id = item._id;
      if (!(id in byId)) { byId[id] = item; order.push(id); return; }
      if (tsOf(item) > tsOf(byId[id])) byId[id] = item;  // strictly newer wins; tie keeps first (local)
    }
    (Array.isArray(localItems) ? localItems : []).forEach(consider);
    (Array.isArray(cloudItems) ? cloudItems : []).forEach(consider);
    return order.map(id => byId[id]);
  }

  // Reconcile one entity list: merge local+cloud, then write back only where changed.
  async function reconcileList(key) {
    let localItems = [];
    try {
      const raw = localStorage.getItem(key);
      if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) localItems = p; }
    } catch(e) { console.warn('[GCCSync] local parse failed for', key, e); }

    let cloudItems = await cloudLoadList(key);
    if (!Array.isArray(cloudItems)) cloudItems = [];
    // Restore any portraits the cloud stripped (sentinel) from local copies first,
    // so a cloud-wins item still carries its full-res portrait when we have it.
    mergeLocalPortraits(key, cloudItems);

    const merged = mergeItemLists(localItems, cloudItems);
    const mergedSig = listSig(merged);

    if (mergedSig !== listSig(localItems)) {
      try { localStorage.setItem(key, JSON.stringify(merged)); }
      catch(e) { console.warn('[GCCSync] local write failed for', key, e); }
    }
    if (mergedSig !== listSig(cloudItems)) {
      await cloudSaveList(key, merged);  // union → orphan cleanup deletes nothing legitimate
    }
    console.log('[GCCSync] reconciled', key, '→', merged.length, 'items',
      '(local', localItems.length, '+ cloud', cloudItems.length, ')');
  }



  function cloneJson(val) {
    try { return JSON.parse(JSON.stringify(val)); } catch(e) { return val; }
  }

  function dataSig(val) {
    try { return JSON.stringify(val || null); } catch(e) { return ''; }
  }

  function normEmbeddedKeyText(v) {
    return String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function stableHash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }

  function rawSessionContentKey(item) {
    const title = normEmbeddedKeyText(item.title);
    const date = normEmbeddedKeyText(item.date);
    const gameDate = normEmbeddedKeyText(item.gameDate);
    const text = normEmbeddedKeyText(item.text);
    if (!title && !date && !gameDate && !text) return '';
    const sections = (item.sections || []).map(sec => {
      const imgs = (sec.images || []).map(img => [
        normEmbeddedKeyText(img.caption),
        normEmbeddedKeyText(img.size),
        normEmbeddedKeyText(img.pos),
      ].join('^')).join('~');
      return [normEmbeddedKeyText(sec.title), normEmbeddedKeyText(sec.text), imgs].join('~');
    }).join('||');
    const tags = (item.tags || []).map(t =>
      normEmbeddedKeyText(t.type) + ':' + normEmbeddedKeyText(t.name)
    ).sort().join(',');
    return ['sig', normEmbeddedKeyText(item.type || 'session'), title, date, gameDate, text,
      String(item.xp || 0), String(item.visible !== false), sections, tags].join('|');
  }

  function sessionContentKey(item, prefix) {
    const raw = rawSessionContentKey(item);
    return raw ? prefix + '_' + raw : '';
  }

  function normalizeEmbeddedChildren(camp) {
    if (!camp || typeof camp !== 'object') return camp;
    if (Array.isArray(camp.sessions)) {
      const seen = {};
      camp.sessions.forEach(item => {
        if (!item || typeof item !== 'object') return;
        if (!item._id) {
          const raw = rawSessionContentKey(item);
          item._id = raw ? ('ses_' + stableHash(raw))
            : ((typeof GCC !== 'undefined' && GCC.genId) ? GCC.genId('ses') : 'ses_' + Date.now());
        } else if (seen[item._id]) {
          item._id = (typeof GCC !== 'undefined' && GCC.genId) ? GCC.genId('ses') : ('ses_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7));
        }
        seen[item._id] = true;
        if (!item._created) item._created = item._updated || camp.updated || camp.created || new Date().toISOString();
        if (!item._updated) item._updated = item._created;
        if (item.gameDate === undefined) item.gameDate = '';
        if (item.image === undefined) item.image = '';
        if (item.sections === undefined) item.sections = [];
        if (item.tags === undefined) item.tags = [];
        if (item.visible === undefined) item.visible = true;
        if (item.type === undefined) item.type = 'session';
      });
    }
    if (Array.isArray(camp.sessions)) camp.session = camp.sessions.filter(s => s.type !== 'timeline').length;
    if (!Array.isArray(camp.deletedSessions)) camp.deletedSessions = [];
    return camp;
  }

  function childKeys(item, prefix, idx) {
    if (!item || typeof item !== 'object') return [prefix + '_idx_' + idx];
    const keys = [];
    if (item._id) keys.push(prefix + '_id_' + item._id);
    if (item.id) keys.push(prefix + '_id_' + item.id);
    if (prefix === 'ses') {
      const sig = sessionContentKey(item, prefix);
      if (sig) keys.push(sig);
    } else if (prefix === 'charref') {
      const storage = item.storageKey || item.listKey || (item._ref && item._ref.storageKey) || '';
      const nm = normEmbeddedKeyText(item.name || item.heroName || item.characterName);
      if (item._id) keys.push(prefix + '_ref_' + storage + '_' + item._id);
      if (nm) keys.push(prefix + '_name_' + storage + '_' + nm);
    } else if (item.title || item.name) {
      keys.push(prefix + '_name_' + normEmbeddedKeyText(item.title || item.name) + '_' + normEmbeddedKeyText(item.date || item.gameDate || item.type || ''));
    }
    if (!keys.length) keys.push(prefix + '_idx_' + idx);
    return keys;
  }

  function tombstoneKeys(tomb, prefix) {
    if (!tomb || typeof tomb !== 'object') return [];
    const keys = [];
    if (tomb._id) keys.push(prefix + '_id_' + tomb._id);
    if (tomb.id) keys.push(prefix + '_id_' + tomb.id);
    if (tomb.sig) keys.push(prefix + '_' + tomb.sig);
    return keys;
  }

  function mergeTombstones(localTombs, cloudTombs, prefix) {
    const byKey = {};
    const out = [];
    function add(tomb) {
      const keys = tombstoneKeys(tomb, prefix);
      if (!keys.length) return;
      const existingKey = keys.find(k => byKey[k]);
      if (existingKey) {
        const existing = byKey[existingKey];
        if (tsOf(tomb) > tsOf(existing)) {
          Object.assign(existing, cloneJson(tomb));
          keys.forEach(k => { byKey[k] = existing; });
        }
        return;
      }
      const copy = cloneJson(tomb);
      out.push(copy);
      keys.forEach(k => { byKey[k] = copy; });
    }
    (Array.isArray(cloudTombs) ? cloudTombs : []).forEach(add);
    (Array.isArray(localTombs) ? localTombs : []).forEach(add);
    out.sort((a, b) => tsOf(b) - tsOf(a));
    return out.slice(0, 250);
  }

  function tombstoneTimeMap(tombs, prefix) {
    const map = {};
    (Array.isArray(tombs) ? tombs : []).forEach(tomb => {
      const t = tsOf(tomb);
      tombstoneKeys(tomb, prefix).forEach(k => { if (!map[k] || t > map[k]) map[k] = t; });
    });
    return map;
  }

  function isDeletedChild(item, prefix, deletedMap) {
    if (!deletedMap) return false;
    const itemTime = tsOf(item);
    return childKeys(item, prefix, -1).some(k => deletedMap[k] && itemTime <= deletedMap[k]);
  }

  // Merge embedded campaign child lists such as sessions/issues, lore, and roster refs.
  // Items may arrive from older devices with different generated ids for the same
  // legacy entry, so each child gets id and content/name aliases instead of a single key.
  function mergeEmbeddedList(localItems, cloudItems, prefix, preferLocalOrder, deletedMap) {
    localItems = Array.isArray(localItems) ? localItems : [];
    cloudItems = Array.isArray(cloudItems) ? cloudItems : [];
    const byPrimary = {};
    const aliasToPrimary = {};
    const order = [];
    function linkedPrimary(keys) {
      for (const k of keys) if (aliasToPrimary[k]) return aliasToPrimary[k];
      return '';
    }
    function linkAliases(primary, keys) {
      keys.forEach(k => { aliasToPrimary[k] = primary; });
    }
    function consider(item, idx) {
      if (!item || typeof item !== 'object') return;
      if (isDeletedChild(item, prefix, deletedMap)) return;
      const keys = childKeys(item, prefix, idx);
      const primary = linkedPrimary(keys) || keys[0];
      const existing = byPrimary[primary];
      if (!existing) { byPrimary[primary] = cloneJson(item); order.push(primary); }
      else if (tsOf(item) > tsOf(existing)) byPrimary[primary] = cloneJson(item);
      linkAliases(primary, keys);
    }
    cloudItems.forEach((item, idx) => consider(item, idx));
    localItems.forEach((item, idx) => consider(item, idx));

    const orderedKeys = [];
    const addOrder = (items) => items.forEach((item, idx) => {
      if (isDeletedChild(item, prefix, deletedMap)) return;
      const keys = childKeys(item, prefix, idx);
      const primary = linkedPrimary(keys) || keys[0];
      if (orderedKeys.indexOf(primary) === -1 && byPrimary[primary]) orderedKeys.push(primary);
    });
    if (preferLocalOrder) { addOrder(localItems); addOrder(cloudItems); }
    else { addOrder(cloudItems); addOrder(localItems); }
    order.forEach(k => { if (orderedKeys.indexOf(k) === -1 && byPrimary[k]) orderedKeys.push(k); });
    return orderedKeys.map(k => byPrimary[k]).filter(Boolean);
  }

  function campaignIdOf(camp, idx) {
    return camp && (camp.id || camp._id || ('campaign_idx_' + idx));
  }

  function mergeCampaignObject(localCamp, cloudCamp) {
    if (!localCamp) return normalizeEmbeddedChildren(cloneJson(cloudCamp));
    if (!cloudCamp) return normalizeEmbeddedChildren(cloneJson(localCamp));
    localCamp = normalizeEmbeddedChildren(cloneJson(localCamp));
    cloudCamp = normalizeEmbeddedChildren(cloneJson(cloudCamp));
    const localTs = tsOf(localCamp), cloudTs = tsOf(cloudCamp);
    const localIsNewer = localTs > cloudTs;
    const base = localIsNewer ? localCamp : cloudCamp;
    const other = localIsNewer ? cloudCamp : localCamp;
    const merged = Object.assign({}, cloneJson(other), cloneJson(base));
    merged.deletedSessions = mergeTombstones(localCamp.deletedSessions, cloudCamp.deletedSessions, 'ses');
    const deletedSessions = tombstoneTimeMap(merged.deletedSessions, 'ses');
    merged.sessions = mergeEmbeddedList(localCamp.sessions, cloudCamp.sessions, 'ses', localIsNewer, deletedSessions);
    merged.lore = mergeEmbeddedList(localCamp.lore, cloudCamp.lore, 'lore', localIsNewer);
    merged.characters = mergeEmbeddedList(localCamp.characters, cloudCamp.characters, 'charref', localIsNewer);
    merged.session = Array.isArray(merged.sessions) ? merged.sessions.filter(s => s.type !== 'timeline').length : 0;
    const maxTs = Math.max(localTs, cloudTs);
    if (maxTs) merged.updated = new Date(maxTs).toISOString();
    return merged;
  }

  // Campaigns are stored as one simple key, but they contain the Issues/Sessions
  // journal. Treat them like mergeable entities instead of blindly pushing any
  // non-empty localStorage blob over the cloud copy.
  async function reconcileCampaigns() {
    const key = 'gcc-campaigns';
    let localItems = [];
    try {
      const raw = localStorage.getItem(key);
      if (raw) { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) localItems = parsed; }
    } catch(e) { console.warn('[GCCSync] local campaigns parse failed', e); }

    let cloudItems = await cloudLoadSimple(key);
    if (!Array.isArray(cloudItems)) cloudItems = [];

    const byId = {};
    const order = [];
    cloudItems.forEach((camp, idx) => {
      const id = campaignIdOf(camp, idx);
      byId[id] = cloneJson(camp);
      order.push(id);
    });
    localItems.forEach((camp, idx) => {
      const id = campaignIdOf(camp, idx);
      if (byId[id]) byId[id] = mergeCampaignObject(camp, byId[id]);
      else { byId[id] = cloneJson(camp); order.push(id); }
    });

    const merged = order.map(id => byId[id]).filter(Boolean);
    const mergedSig = dataSig(merged);
    if (mergedSig !== dataSig(localItems)) {
      try { localStorage.setItem(key, JSON.stringify(merged)); }
      catch(e) { console.warn('[GCCSync] local campaigns write failed', e); }
    }
    if (mergedSig !== dataSig(cloudItems)) {
      await cloudSaveSimple(key, merged);
    }
    console.log('[GCCSync] reconciled campaigns →', merged.length,
      '(local', localItems.length, '+ cloud', cloudItems.length, ')');
  }

  // Reconcile one simple key: preserve prior behavior — fill empty local from
  // cloud, otherwise push non-empty local up. (No per-item structure to merge.)
  async function reconcileSimple(key) {
    let localEmpty = true;
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      try { localEmpty = isEmpty(JSON.parse(raw)); } catch(e) { localEmpty = true; }
    }
    if (localEmpty) {
      const val = await cloudLoad(key);
      if (val !== undefined && !isEmpty(val)) {
        try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}
      }
    } else {
      try { await cloudSave(key, JSON.parse(raw)); } catch(e) {}
    }
  }

  // Reconcile every synced key. Replaces the old uploadLocalData()+pullCloudData()
  // pair that could let a stale device clobber the cloud and never pull updates.
  async function reconcileAll() {
    for (const key of ALL_SYNC_KEYS) {
      try {
        if (key === 'gcc-campaigns') await reconcileCampaigns();
        else if (isListKey(key)) await reconcileList(key);
        else await reconcileSimple(key);
      } catch(e) {
        console.warn('[GCCSync] reconcile failed for', key, e);
      }
    }
    try { localStorage.setItem('gcc-sync-uploaded-' + _uid, String(SYNC_FORMAT_VERSION)); } catch(e) {}
  }

  // ══════════════════════════════════════
  // ── Auth state handler ──
  // ══════════════════════════════════════

  async function onAuthChange(user) {
    if (user) {
      _uid = user.uid;
      await initFirestore();
      patchGCC();
      await flushPendingSaves();   // let any in-flight saves land before we read cloud
      await reconcileAll();        // v2.2.0: per-item merge (was uploadLocalData + pullCloudData)
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

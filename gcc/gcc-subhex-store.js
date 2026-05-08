// gcc-subhex-store.js v0.2.0 — 2026-05-03
// v0.2.0 — putBatch(puts, deletes): write many entries in a single
//          IDB transaction. Critical for scanner output — 50k
//          one-at-a-time puts took ~30 minutes (one transaction
//          each + a microtask hop per await); batched it's seconds.
// v0.1.0 — initial IDB-backed persistence layer.
// IndexedDB-backed canonical persistence for subhex overrides.
// Replaces the bare localStorage write path that hit quota at 50k+
// entries on May 3, 2026. localStorage remains as a synchronous
// boot cache (size-capped) so subhex view doesn't flash on page
// load while IDB warms up; IDB is the source of truth.
//
// Public surface (window.GCCSubhexStore):
//   ready()                → Promise<void>   resolves when IDB load completes
//   bootSnapshot()         → object          all entries currently in localStorage
//                                            (ALL_KEYS, called synchronously at
//                                            module load before await ready())
//   loadAll()              → Promise<object> all entries from IDB, keyed by id
//   put(id, entry)         → void            enqueue IDB write; resolves async
//   remove(id)             → void            enqueue IDB delete
//   clear()                → Promise<void>   wipe IDB AND localStorage cache
//   flush()                → Promise<void>   resolves when all enqueued writes
//                                            have hit disk (used by tests +
//                                            scanner end-of-batch save)
//
// Storage layout:
//   IDB database 'gcc-subhex'        — version 1
//   object store 'overrides'         — keyed by id ('subhex_Q_R'); value is the
//                                      override object as currently persisted
//                                      to localStorage
//
// Boot cache strategy:
//   localStorage 'gcc-subhex-overrides' continues to receive the
//   most-recently-modified N entries (CACHE_LIMIT) so a hard reload
//   has something to render immediately. Beyond N, only IDB has it.
//   On boot, gcc-subhex-data reads localStorage synchronously to
//   populate in-memory OVERRIDES, then awaits store.ready() and
//   merges in any IDB-only entries. Reads against in-memory state
//   never block.
//
// Save error surfacing:
//   IDB write failures dispatch 'gcc-storage-error' with
//   { key:'gcc-subhex (idb)', error, message }, matching the
//   existing localStorage error event so UI handles both the same way.
//
// Migration:
//   On first ready(), if IDB is empty AND localStorage has entries,
//   we copy localStorage → IDB. The localStorage cache itself stays
//   intact (it's still useful as a boot cache); only its role
//   changes from "primary store" to "boot cache".
//
// Concurrency:
//   put/remove/clear are queued behind a single in-flight promise so
//   we never have two writes racing for the same key. flush() awaits
//   the queue drain. Typical scanner pattern (write 88 cells per
//   parent, call flushOverrides) becomes 88 queued puts then a
//   single drain.

(function(){
  'use strict';

  const DB_NAME      = 'gcc-subhex';
  const DB_VERSION   = 1;
  const STORE_NAME   = 'overrides';
  const LS_BOOT_KEY  = 'gcc-subhex-overrides';   // unchanged — keeps back-compat
  const CACHE_LIMIT  = 2000;                      // ~250KB at typical entry size
  // ALL_KEYS is reserved for slice F2/F3 when regions/lakes also
  // move into IDB. F1 only handles overrides.
  const ALL_KEYS     = [LS_BOOT_KEY];

  let _db = null;
  let _ready = null;            // Promise<void>; resolves after open + (maybe) migrate
  let _writeQ = Promise.resolve();
  let _closed = false;

  // ── Boot snapshot (synchronous) ────────────────────────────────────
  // Returns whatever is in localStorage right now, parsed. gcc-subhex-
  // data reads this at module-load time before awaiting ready().
  function bootSnapshot(){
    try {
      const raw = localStorage.getItem(LS_BOOT_KEY);
      return raw ? (JSON.parse(raw) || {}) : {};
    } catch(_){
      return {};
    }
  }

  // ── IDB plumbing ───────────────────────────────────────────────────
  function _openDb(){
    return new Promise((resolve, reject) => {
      let req;
      try { req = indexedDB.open(DB_NAME, DB_VERSION); }
      catch(e){ reject(e); return; }
      req.onupgradeneeded = (ev) => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)){
          db.createObjectStore(STORE_NAME);  // out-of-line key (we pass id explicitly)
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error || new Error('IDB open failed'));
      req.onblocked = () => reject(new Error('IDB open blocked (older tab open?)'));
    });
  }
  function _txWrite(){
    if (!_db) throw new Error('IDB not ready');
    return _db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
  }
  function _txRead(){
    if (!_db) throw new Error('IDB not ready');
    return _db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);
  }
  function _wrap(req){
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  // ── Migration on first ready() ─────────────────────────────────────
  async function _migrateIfNeeded(){
    // Count IDB entries.
    const idbCount = await _wrap(_txRead().count());
    if (idbCount > 0) return;          // already migrated
    const local = bootSnapshot();
    const ids = Object.keys(local);
    if (ids.length === 0) return;       // nothing to migrate
    console.log(`[SubhexStore] migrating ${ids.length} localStorage entries to IDB…`);
    // Single transaction for the whole batch — atomic, fast.
    const tx = _db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const id of ids){
      store.put(local[id], id);
    }
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
      tx.onabort    = () => reject(tx.error || new Error('migration tx aborted'));
    });
    console.log(`[SubhexStore] migration complete (${ids.length} entries)`);
  }

  // ── Public: ready / loadAll ────────────────────────────────────────
  function ready(){
    if (_ready) return _ready;
    _ready = (async () => {
      try {
        _db = await _openDb();
        await _migrateIfNeeded();
      } catch(e){
        console.error('[SubhexStore] ready() failed:', e);
        _emitError(e);
        // Surface a poisoned ready so callers fall back gracefully.
        throw e;
      }
    })();
    return _ready;
  }
  async function loadAll(){
    await ready();
    const tx = _db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const out = {};
    return new Promise((resolve, reject) => {
      const req = store.openCursor();
      req.onsuccess = (ev) => {
        const cur = req.result;
        if (cur){
          out[cur.key] = cur.value;
          cur.continue();
        } else {
          resolve(out);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  // ── Public: write path (queued) ────────────────────────────────────
  function put(id, entry){
    _writeQ = _writeQ.then(async () => {
      await ready();
      try {
        await _wrap(_txWrite().put(entry, id));
      } catch(e){
        console.error('[SubhexStore] put failed for', id, e);
        _emitError(e);
      }
    });
    return _writeQ;
  }

  // Batch writes — put many entries in a single transaction.
  // Critical for scanner output: putting 50k entries one-at-a-time
  // is ~30 minutes of microtask hops + one transaction per entry;
  // batching them lands in seconds. `puts` is { id: entry, ... };
  // `deletes` is an array of ids. Pass either or both.
  //
  // Internally chunked at BATCH_CHUNK (5000) operations per
  // transaction. Single-transaction 50k-op writes are technically
  // legal in IDB but some browsers slow down or hit internal
  // limits; chunking is defensive and adds negligible overhead
  // (5k ops fit comfortably in one tx).
  const BATCH_CHUNK = 5000;
  function putBatch(puts, deletes){
    _writeQ = _writeQ.then(async () => {
      await ready();
      try {
        const putIds = puts ? Object.keys(puts) : [];
        const delIds = deletes ? deletes.slice() : [];
        // Run chunks sequentially. We want to await each chunk's
        // tx.oncomplete before starting the next so a mid-flight
        // failure doesn't leave half the writes orphaned.
        let i = 0;
        while (i < putIds.length || (delIds.length > 0 && putIds.length === 0 && i === 0)){
          const tx = _db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          // Take up to BATCH_CHUNK puts.
          const chunkEnd = Math.min(i + BATCH_CHUNK, putIds.length);
          for (; i < chunkEnd; i++){
            const id = putIds[i];
            store.put(puts[id], id);
          }
          // Apply all deletes in the first chunk (cheap, no need to
          // chunk unless tens of thousands).
          if (delIds.length > 0 && i <= BATCH_CHUNK){
            for (const id of delIds) store.delete(id);
            delIds.length = 0;   // mark consumed
          }
          await new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror    = () => reject(tx.error);
            tx.onabort    = () => reject(tx.error || new Error('batch tx aborted'));
          });
          if (i >= putIds.length && delIds.length === 0) break;
        }
      } catch(e){
        console.error('[SubhexStore] putBatch failed:', e);
        _emitError(e);
      }
    });
    return _writeQ;
  }
  function remove(id){
    _writeQ = _writeQ.then(async () => {
      await ready();
      try {
        await _wrap(_txWrite().delete(id));
      } catch(e){
        console.error('[SubhexStore] delete failed for', id, e);
        _emitError(e);
      }
    });
    return _writeQ;
  }
  function clear(){
    _writeQ = _writeQ.then(async () => {
      await ready();
      try {
        await _wrap(_txWrite().clear());
        try { localStorage.removeItem(LS_BOOT_KEY); } catch(_){}
      } catch(e){
        console.error('[SubhexStore] clear failed:', e);
        _emitError(e);
      }
    });
    return _writeQ;
  }
  function flush(){ return _writeQ; }

  // ── Boot cache writeback (cap-aware) ───────────────────────────────
  // Called by gcc-subhex-data after every save() to keep localStorage
  // populated with a bounded snapshot for fast next-load. We sort
  // entries by authoredAt desc, keep the top CACHE_LIMIT, write
  // those. If even the bounded write fails (very small quota), we
  // delete the cache key entirely — better empty than stale.
  function writeBootCache(allEntries){
    let entries = Object.entries(allEntries);
    if (entries.length > CACHE_LIMIT){
      entries.sort((a, b) => (b[1].authoredAt || 0) - (a[1].authoredAt || 0));
      entries = entries.slice(0, CACHE_LIMIT);
    }
    const out = {};
    for (const [k, v] of entries) out[k] = v;
    try {
      localStorage.setItem(LS_BOOT_KEY, JSON.stringify(out));
    } catch(e){
      // Quota — bail, don't surface error (IDB is the real save).
      try { localStorage.removeItem(LS_BOOT_KEY); } catch(_){}
    }
  }

  // ── Errors ─────────────────────────────────────────────────────────
  function _emitError(e){
    try {
      window.dispatchEvent(new CustomEvent('gcc-storage-error', {
        detail: { key: 'gcc-subhex (idb)', error: e && e.name, message: e && e.message },
      }));
    } catch(_){}
  }

  window.GCCSubhexStore = {
    ready, bootSnapshot, loadAll,
    put, putBatch, remove, clear, flush,
    writeBootCache,
    // Test hooks
    _DB_NAME: DB_NAME,
    _STORE_NAME: STORE_NAME,
    _CACHE_LIMIT: CACHE_LIMIT,
  };
})();

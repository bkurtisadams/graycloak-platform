// test-subhex-store.js — slice F1 IDB store smoke test
// Run: cd /home/claude/out && node test-subhex-store.js
//
// Verifies gcc-subhex-store:
//   - bootSnapshot() reads localStorage synchronously
//   - ready() opens DB and migrates localStorage on empty IDB
//   - loadAll() returns full set
//   - put / remove / clear queue and persist
//   - flush() awaits queue drain
//   - writeBootCache caps at CACHE_LIMIT, picks most-recent
//   - storage-error event on IDB failure (best-effort — fake-indexeddb
//     doesn't model quota, so skipped here)

const fs = require('fs');
const vm = require('vm');
require('fake-indexeddb/auto');                  // installs global indexedDB
const { IDBFactory } = require('fake-indexeddb');

// Reset the global IDB between test sections so they don't interfere.
function resetIDB(){
  global.indexedDB = new IDBFactory();
}

function makeWindow(opts){
  opts = opts || {};
  const events = [];
  const store = new Map();
  if (opts.seed){ for (const [k,v] of Object.entries(opts.seed)) store.set(k, v); }
  const localStorage = {
    getItem: k => store.has(k) ? store.get(k) : null,
    setItem: (k,v) => { store.set(k, String(v)); },
    removeItem: k => store.delete(k),
    _store: store,
  };
  const win = {
    localStorage,
    get indexedDB(){ return global.indexedDB; },  // resolve at access time
    setTimeout, clearTimeout,
    console,
    _events: events,
    addEventListener: (type, fn) => {
      win._listeners = win._listeners || {};
      (win._listeners[type] = win._listeners[type] || []).push(fn);
    },
    dispatchEvent(e){
      events.push(e);
      const ls = (win._listeners && win._listeners[e.type]) || [];
      for (const fn of ls) fn(e);
      return true;
    },
    CustomEvent: function(type, init){ this.type = type; this.detail = init && init.detail; },
  };
  win.window = win;
  return win;
}

function loadStore(win){
  const ctx = vm.createContext(win);
  vm.runInContext(fs.readFileSync('./gcc-subhex-store.js', 'utf8'), ctx);
  return win.GCCSubhexStore;
}

let fails = 0, passes = 0;
function assert(cond, msg){ cond ? passes++ : (fails++, console.error('  FAIL:', msg)); }
function section(name){ console.log(`\n── ${name} ──`); resetIDB(); }

(async () => {

  // ── 1. boot snapshot reads localStorage synchronously ──────────────
  section('bootSnapshot');
  {
    const seeded = {
      'subhex_1_2': { terrain: 'plains', schemaVersion: 2, authoredAt: 1000 },
      'subhex_3_4': { terrain: 'forest', schemaVersion: 2, authoredAt: 2000 },
    };
    const win = makeWindow({ seed: { 'gcc-subhex-overrides': JSON.stringify(seeded) } });
    const S = loadStore(win);
    const snap = S.bootSnapshot();
    assert(Object.keys(snap).length === 2, 'bootSnapshot returns 2 entries');
    assert(snap['subhex_1_2'].terrain === 'plains', 'subhex_1_2 round-trip');
    assert(snap['subhex_3_4'].terrain === 'forest', 'subhex_3_4 round-trip');
  }

  // ── 2. ready() migrates localStorage to IDB on first run ──────────
  section('ready() migrates from localStorage');
  {
    const seeded = {};
    for (let i = 0; i < 50; i++) seeded[`subhex_${i}_0`] = { terrain: 'plains', authoredAt: 1000 + i };
    const win = makeWindow({ seed: { 'gcc-subhex-overrides': JSON.stringify(seeded) } });
    const S = loadStore(win);
    await S.ready();
    const all = await S.loadAll();
    assert(Object.keys(all).length === 50, `IDB has 50 entries after migration (got ${Object.keys(all).length})`);
    assert(all['subhex_0_0'].terrain === 'plains', 'sample entry survived migration');
    assert(all['subhex_49_0'].authoredAt === 1049, 'authoredAt preserved');
  }

  // ── 3. ready() is idempotent — second call doesn't re-migrate ─────
  section('ready() idempotent');
  {
    const win = makeWindow({ seed: { 'gcc-subhex-overrides': JSON.stringify({ 'subhex_0_0': { terrain:'plains', authoredAt:1 } }) } });
    const S = loadStore(win);
    await S.ready();
    await S.put('subhex_1_0', { terrain: 'forest', authoredAt: 2 });
    await S.flush();
    // Second ready() — should NOT re-migrate (would re-add subhex_0_0 from LS, no harm,
    // but verify we don't double-write or clobber the put).
    await S.ready();
    const all = await S.loadAll();
    assert(Object.keys(all).length === 2, 'ready() idempotent — count stable');
    assert(all['subhex_1_0'].terrain === 'forest', 'subsequent put survived');
  }

  // ── 4. put / remove / loadAll round-trip ──────────────────────────
  section('put / remove / loadAll');
  {
    const win = makeWindow();
    const S = loadStore(win);
    await S.ready();
    S.put('subhex_5_5', { terrain: 'plains', authoredAt: 100 });
    S.put('subhex_6_6', { terrain: 'forest', authoredAt: 200 });
    S.put('subhex_7_7', { terrain: 'hills',  authoredAt: 300 });
    await S.flush();
    let all = await S.loadAll();
    assert(Object.keys(all).length === 3, 'three entries persisted');
    S.remove('subhex_6_6');
    await S.flush();
    all = await S.loadAll();
    assert(Object.keys(all).length === 2, 'remove dropped one entry');
    assert(!('subhex_6_6' in all), 'subhex_6_6 gone');
    assert(all['subhex_5_5'].terrain === 'plains', 'others survived');
  }

  // ── 5. clear() wipes IDB AND localStorage ─────────────────────────
  section('clear');
  {
    const win = makeWindow({ seed: { 'gcc-subhex-overrides': JSON.stringify({ 'subhex_0_0':{terrain:'plains',authoredAt:1} }) } });
    const S = loadStore(win);
    await S.ready();
    S.put('subhex_1_0', { terrain: 'forest', authoredAt: 2 });
    await S.flush();
    assert(Object.keys(await S.loadAll()).length === 2, 'pre-clear: 2 entries');
    assert(win.localStorage._store.has('gcc-subhex-overrides'), 'pre-clear: localStorage cache present');
    S.clear();
    await S.flush();
    assert(Object.keys(await S.loadAll()).length === 0, 'post-clear: 0 entries');
    assert(!win.localStorage._store.has('gcc-subhex-overrides'), 'post-clear: localStorage cache wiped');
  }

  // ── 6. flush() waits for queue ────────────────────────────────────
  section('flush awaits queue drain');
  {
    const win = makeWindow();
    const S = loadStore(win);
    await S.ready();
    // Fire 100 puts without await — should all queue.
    for (let i = 0; i < 100; i++) S.put(`subhex_${i}_0`, { terrain: 'plains', authoredAt: i });
    await S.flush();
    const all = await S.loadAll();
    assert(Object.keys(all).length === 100, `100 queued puts all persisted (got ${Object.keys(all).length})`);
  }

  // ── 7. writeBootCache caps at CACHE_LIMIT ─────────────────────────
  section('writeBootCache cap behavior');
  {
    const win = makeWindow();
    const S = loadStore(win);
    const lim = S._CACHE_LIMIT;
    // Build 1.5x the cap, randomized authoredAt so we can verify
    // most-recent-N selection.
    const all = {};
    for (let i = 0; i < lim * 1.5; i++){
      all[`subhex_${i}_0`] = { terrain: 'plains', authoredAt: i };
    }
    S.writeBootCache(all);
    const cached = JSON.parse(win.localStorage._store.get('gcc-subhex-overrides'));
    assert(Object.keys(cached).length === lim, `cap respected: ${Object.keys(cached).length} === ${lim}`);
    // Should keep the highest authoredAt (most recent)
    const minKept = Math.min(...Object.values(cached).map(e => e.authoredAt));
    const expectedMin = lim * 1.5 - lim;   // i.e. the (lim*0.5)-th entry
    assert(minKept === expectedMin, `kept the most-recent: minKept=${minKept}, expected=${expectedMin}`);
  }

  // ── 7b. putBatch — single transaction for many writes ────────────
  section('putBatch (batch transaction)');
  {
    const win = makeWindow();
    const S = loadStore(win);
    await S.ready();
    // 10k writes via putBatch should land fast — one transaction
    // per chunk. 10k → 2 chunks at BATCH_CHUNK=5000.
    const puts = {};
    for (let i = 0; i < 10000; i++) puts[`subhex_${i}_0`] = { terrain: 'plains', authoredAt: i };
    const t0 = Date.now();
    S.putBatch(puts);
    await S.flush();
    const ms = Date.now() - t0;
    const all = await S.loadAll();
    assert(Object.keys(all).length === 10000, `10k entries via putBatch: ${Object.keys(all).length}`);
    assert(ms < 5000, `putBatch under 5s for 10k entries (got ${ms}ms)`);
    console.log(`    putBatch wrote 10k entries in ${ms}ms`);
  }

  // ── 7c. putBatch deletes ─────────────────────────────────────────
  section('putBatch deletes');
  {
    const win = makeWindow();
    const S = loadStore(win);
    await S.ready();
    // Seed
    const puts = {};
    for (let i = 0; i < 100; i++) puts[`subhex_${i}_0`] = { terrain: 'plains', authoredAt: i };
    S.putBatch(puts);
    await S.flush();
    // Delete half via putBatch
    const dels = [];
    for (let i = 0; i < 50; i++) dels.push(`subhex_${i}_0`);
    S.putBatch(null, dels);
    await S.flush();
    const all = await S.loadAll();
    assert(Object.keys(all).length === 50, `50 entries after batch delete: ${Object.keys(all).length}`);
    assert(!('subhex_0_0' in all), 'subhex_0_0 deleted');
    assert('subhex_50_0' in all, 'subhex_50_0 survives');
  }

  // ── 8. survives reload (re-load module against same DB) ───────────
  // Don't call section() here — we want the prior IDB to survive.
  console.log('\n── reload preserves IDB state ──');
  resetIDB();   // clean slate for *this* test's first load
  {
    const win1 = makeWindow();
    const S1 = loadStore(win1);
    await S1.ready();
    for (let i = 0; i < 30; i++) S1.put(`subhex_${i}_99`, { terrain: 'forest', authoredAt: i });
    await S1.flush();
    // Simulate fresh page load: new window, fresh module, but
    // global.indexedDB persists (no resetIDB between).
    const win2 = makeWindow();
    const S2 = loadStore(win2);
    await S2.ready();
    const all = await S2.loadAll();
    assert(Object.keys(all).length === 30, 'IDB state survived module reload');
    assert(all['subhex_15_99'].terrain === 'forest', 'sample entry intact');
  }

  console.log(`\n${passes} passed, ${fails} failed`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('test crashed:', e); process.exit(2); });

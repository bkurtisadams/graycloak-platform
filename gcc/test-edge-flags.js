// test-edge-flags.js — slice 3 storage smoke test
// Run: node test-edge-flags.js
//
// Verifies gcc-edge-flags.js storage layer:
//   - load with empty / missing localStorage
//   - addFlag / removeFlag / toggleFlag round-trip
//   - hasFlag / getModes / parentsForMode / count / getAll
//   - persistence across reload (localStorage shape)
//   - tolerance for malformed entries on load
//   - clearAll
//   - storage-error event on save failure
//   - 'gcc-edge-flags-changed' events fire on every state change

const fs = require('fs');
const vm = require('vm');

function makeWindow(opts){
  opts = opts || {};
  const events = [];
  const store = new Map();
  if (opts.seed){ for (const [k, v] of Object.entries(opts.seed)) store.set(k, v); }
  const localStorage = {
    getItem: k => store.has(k) ? store.get(k) : null,
    setItem: (k, v) => {
      if (opts.failSet) throw new Error('quota exceeded (test stub)');
      store.set(k, String(v));
    },
    removeItem: k => store.delete(k),
    clear: () => store.clear(),
    _store: store,
  };
  const win = {
    localStorage,
    _events: events,
    addEventListener: (type, fn) => {
      win._listeners = win._listeners || {};
      (win._listeners[type] = win._listeners[type] || []).push(fn);
    },
    dispatchEvent(e){
      events.push(e);
      const listeners = (win._listeners && win._listeners[e.type]) || [];
      for (const fn of listeners) fn(e);
      return true;
    },
    CustomEvent: function(type, init){ this.type = type; this.detail = init && init.detail; },
  };
  win.window = win;
  return win;
}

function load(win){
  const ctx = vm.createContext(win);
  const code = fs.readFileSync('./gcc-edge-flags.js', 'utf8');
  vm.runInContext(code, ctx);
  return win.GCCEdgeFlags;
}

let fails = 0, passes = 0;
function assert(cond, msg){
  if (cond){ passes++; }
  else { fails++; console.error('  FAIL:', msg); }
}
function section(name){ console.log(`\n── ${name} ──`); }

// ── 1. empty boot ─────────────────────────────────────────────────────────
section('empty boot');
{
  const win = makeWindow();
  const F = load(win);
  assert(!!F, 'GCCEdgeFlags exists');
  assert(F.count().total === 0, 'starts with zero flagged parents');
  assert(F.getAll().length === 0, 'getAll returns empty array');
  assert(F.getModes(5, 5).length === 0, 'getModes returns empty array on unknown parent');
  assert(F.hasFlag(5, 5, 'coast') === false, 'hasFlag false on unknown parent');
  assert(F.parentsForMode('coast').length === 0, 'parentsForMode empty on unknown mode');
}

// ── 2. add / remove / toggle round-trip ───────────────────────────────────
section('add / remove / toggle');
{
  const win = makeWindow();
  const F = load(win);
  assert(F.addFlag(10, 20, 'coast') === true, 'addFlag returns true on first add');
  assert(F.addFlag(10, 20, 'coast') === false, 'addFlag returns false on duplicate');
  assert(F.hasFlag(10, 20, 'coast') === true, 'flag is set');
  assert(F.count().total === 1, 'count.total = 1');
  assert(F.count().byMode.coast === 1, 'count.byMode.coast = 1');
  assert(F.addFlag(10, 20, 'forest') === true, 'second mode on same parent');
  assert(F.getModes(10, 20).length === 2, 'getModes returns 2 modes');
  assert(F.count().total === 1, 'still 1 parent flagged');
  assert(F.count().byMode.forest === 1, 'forest count = 1');
  assert(F.removeFlag(10, 20, 'coast') === true, 'removeFlag returns true');
  assert(F.removeFlag(10, 20, 'coast') === false, 'remove no-op returns false');
  assert(F.hasFlag(10, 20, 'coast') === false, 'flag is gone');
  assert(F.hasFlag(10, 20, 'forest') === true, 'forest survives');
  assert(F.removeFlag(10, 20, 'forest') === true, 'remove last mode');
  assert(F.count().total === 0, 'parent dropped when last mode removed');
  // toggle path
  assert(F.toggleFlag(7, 7, 'coast') === true, 'toggle on returns true');
  assert(F.toggleFlag(7, 7, 'coast') === false, 'toggle off returns false');
  assert(F.count().total === 0, 'toggle clears the entry');
}

// ── 3. parentsForMode ─────────────────────────────────────────────────────
section('parentsForMode');
{
  const win = makeWindow();
  const F = load(win);
  F.addFlag(1, 1, 'coast');
  F.addFlag(2, 2, 'coast');
  F.addFlag(2, 2, 'forest');
  F.addFlag(3, 3, 'forest');
  const coast = F.parentsForMode('coast');
  const forest = F.parentsForMode('forest');
  assert(coast.length === 2, '2 parents flagged for coast');
  assert(forest.length === 2, '2 parents flagged for forest');
  // each parent is {col, row}
  assert(coast.some(p => p.col === 1 && p.row === 1), 'coast has (1,1)');
  assert(coast.some(p => p.col === 2 && p.row === 2), 'coast has (2,2)');
  assert(forest.some(p => p.col === 2 && p.row === 2), 'forest has (2,2)');
  assert(forest.some(p => p.col === 3 && p.row === 3), 'forest has (3,3)');
}

// ── 4. persistence across reload ──────────────────────────────────────────
section('persistence across reload');
{
  const win = makeWindow();
  const F = load(win);
  F.addFlag(11, 22, 'coast');
  F.addFlag(33, 44, 'coast');
  F.addFlag(33, 44, 'forest');
  // Verify localStorage was written.
  assert(win.localStorage._store.has('gcc-edge-flags'), 'localStorage key written');
  const raw = win.localStorage._store.get('gcc-edge-flags');
  const parsed = JSON.parse(raw);
  assert(parsed['11,22'].col === 11 && parsed['11,22'].row === 22, 'col/row persisted');
  assert(Array.isArray(parsed['33,44'].modes), 'modes is array on disk');
  assert(parsed['33,44'].modes.length === 2, 'two modes on (33,44)');
  // Reload by reusing the same store in a fresh window.
  const seed = { 'gcc-edge-flags': raw };
  const win2 = makeWindow({ seed });
  const F2 = load(win2);
  assert(F2.count().total === 2, 'reload restored 2 parents');
  assert(F2.hasFlag(33, 44, 'forest'), 'reload restored forest tag on (33,44)');
  assert(F2.parentsForMode('coast').length === 2, 'reload restored both coast parents');
}

// ── 5. tolerance for malformed disk data ─────────────────────────────────
section('malformed-data tolerance on load');
{
  const seed = {
    'gcc-edge-flags': JSON.stringify({
      '5,5':   { col: 5, row: 5, modes: ['coast'] },                    // valid
      '6,6':   { col: 6, row: 6, modes: 'coast' },                       // string mode, normalized to array
      '7,7':   { col: 7, row: 7, modes: [] },                            // empty modes, dropped
      '8,8':   { col: 8, row: 8, modes: ['coast', 'coast', 'forest'] },  // dup-deduped
      'bogus': { foo: 'bar' },                                           // missing col/row, dropped
      '9,9':   { col: 9, row: 9 },                                       // missing modes, dropped
    }),
  };
  const win = makeWindow({ seed });
  const F = load(win);
  const c = F.count();
  assert(c.total === 3, `tolerated load → 3 valid parents (got ${c.total})`);
  assert(F.hasFlag(5, 5, 'coast'), '(5,5) loaded');
  assert(F.hasFlag(6, 6, 'coast'), '(6,6) string→array normalized');
  assert(F.hasFlag(8, 8, 'coast') && F.hasFlag(8, 8, 'forest'), '(8,8) deduped to 2 modes');
  assert(F.getModes(8, 8).length === 2, '(8,8) modes deduped');
  assert(!F.hasFlag(7, 7, 'coast'), '(7,7) empty-modes dropped');
  assert(!F.hasFlag(9, 9, 'coast'), '(9,9) missing-modes dropped');
}

// ── 6. clearAll ───────────────────────────────────────────────────────────
section('clearAll');
{
  const win = makeWindow();
  const F = load(win);
  F.addFlag(1, 1, 'coast');
  F.addFlag(2, 2, 'coast');
  assert(F.clearAll() === true, 'clearAll returns true when state changes');
  assert(F.count().total === 0, 'state cleared');
  assert(F.clearAll() === false, 'no-op clearAll returns false');
}

// ── 7. storage-error event on quota failure ───────────────────────────────
section('storage error surfacing');
{
  const win = makeWindow({ failSet: true });
  // Suppress the console.error noise for this single test.
  const origErr = console.error; console.error = () => {};
  const F = load(win);
  F.addFlag(1, 1, 'coast');
  console.error = origErr;
  const errEvents = win._events.filter(e => e.type === 'gcc-storage-error');
  assert(errEvents.length === 1, 'one gcc-storage-error event fired');
  assert(errEvents[0].detail.key === 'gcc-edge-flags', 'event carries the right key');
  assert(errEvents[0].detail.error instanceof Error, 'event carries the error');
}

// ── 8. flags-changed events ───────────────────────────────────────────────
section('gcc-edge-flags-changed events');
{
  const win = makeWindow();
  const F = load(win);
  const seen = [];
  win.addEventListener('gcc-edge-flags-changed', e => seen.push(e.detail));
  F.addFlag(1, 1, 'coast');
  F.toggleFlag(1, 1, 'coast');     // → remove
  F.toggleFlag(2, 2, 'forest');    // → add
  F.clearAll();
  assert(seen.length === 4, '4 change events fired');
  assert(seen[0].reason === 'add' && seen[0].modeId === 'coast', 'add event has reason=add');
  assert(seen[1].reason === 'remove', 'toggle-off → remove');
  assert(seen[2].reason === 'add', 'toggle-on → add');
  assert(seen[3].reason === 'clear', 'clearAll → clear');
}

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);

// test-fog.js — substrate API smoke + correctness
// Run: node test-fog.js
//
// Stubs minimal window/localStorage. Loads gcc-fog.js. Exercises:
// init/config, single+bulk reveal/hide, deferSave/flush semantics, radius
// math, parent helpers (with stubbed GCCSubhexData), import/export, hideAll,
// per-map storage isolation, fog-disabled grain short-circuit.

const fs = require('fs');
const vm = require('vm');

function makeWindow(){
  const events = [];
  const store = new Map();
  const localStorage = {
    getItem: k => store.has(k) ? store.get(k) : null,
    setItem: (k,v) => { store.set(k, String(v)); },
    removeItem: k => { store.delete(k); },
    clear: () => store.clear(),
    _store: store,
  };
  const win = {
    localStorage,
    _events: events,
    dispatchEvent(e){ events.push(e); return true; },
    CustomEvent: function(type, init){ this.type = type; this.detail = init && init.detail; },
  };
  win.window = win;
  return win;
}

function loadFog(win){
  const ctx = vm.createContext(win);
  const code = fs.readFileSync('./gcc-fog.js', 'utf8');
  vm.runInContext(code, ctx);
  return win.GCCFog;
}

let fails = 0, passes = 0;
function assert(cond, msg){
  if (cond){ passes++; }
  else { fails++; console.error('  FAIL:', msg); }
}
function section(name){ console.log(`\n── ${name} ──`); }

// ── 1. boot + config ──────────────────────────────────────────────────────
section('boot + config');
{
  const win = makeWindow();
  const Fog = loadFog(win);
  const cfg = Fog.config();
  assert(cfg.mapId === 'default', 'default mapId is "default"');
  assert(cfg.parentFog === true && cfg.subhexFog === true, 'default both grains fogged');
  assert(Fog.revealedSubhexCount() === 0, 'starts with zero subhex reveals');
  assert(Fog.revealedParentCount() === 0, 'starts with zero parent reveals');
}

// ── 2. init persists per-map ──────────────────────────────────────────────
section('per-map storage isolation');
{
  const win = makeWindow();
  const Fog = loadFog(win);
  Fog.init({ mapId: 'greyhawk', parentFog: false, subhexFog: true });
  Fog.revealSubhex(5, -3);
  Fog.revealSubhex(0, 0);
  assert(win.localStorage._store.has('gcc-fog-greyhawk'), 'greyhawk key written');
  assert(!win.localStorage._store.has('gcc-fog-gammaworld'), 'gammaworld key not written');

  Fog.init({ mapId: 'gammaworld', parentFog: true, subhexFog: true });
  assert(Fog.revealedSubhexCount() === 0, 'switching mapId loads fresh state');
  Fog.revealSubhex(99, 99);

  // Switch back — should reload greyhawk's two reveals.
  Fog.init({ mapId: 'greyhawk', parentFog: false, subhexFog: true });
  assert(Fog.revealedSubhexCount() === 2, 'greyhawk state reloaded after switch');
  assert(Fog.isSubhexRevealed(5, -3), 'reload preserves reveal (5,-3)');
  assert(Fog.isSubhexRevealed(0, 0),  'reload preserves reveal (0,0)');
}

// ── 3. single reveal/hide ─────────────────────────────────────────────────
section('single reveal / hide');
{
  const win = makeWindow();
  const Fog = loadFog(win);
  Fog.init({ mapId: 't3', parentFog: true, subhexFog: true });

  assert(!Fog.isSubhexRevealed(1, 2), 'unrevealed subhex returns false');
  assert(Fog.revealSubhex(1, 2) === true, 'first reveal returns true');
  assert(Fog.revealSubhex(1, 2) === false, 'duplicate reveal returns false (no-op)');
  assert(Fog.isSubhexRevealed(1, 2), 'reveal sticks');
  assert(Fog.hideSubhex(1, 2) === true, 'first hide returns true');
  assert(Fog.hideSubhex(1, 2) === false, 'duplicate hide returns false');
  assert(!Fog.isSubhexRevealed(1, 2), 'hide sticks');

  Fog.revealParent(70, 50);
  assert(Fog.isParentRevealed(70, 50), 'parent reveal works');
  Fog.hideParent(70, 50);
  assert(!Fog.isParentRevealed(70, 50), 'parent hide works');
}

// ── 4. bulk + deferSave ───────────────────────────────────────────────────
section('bulk writes with deferSave');
{
  const win = makeWindow();
  const Fog = loadFog(win);
  Fog.init({ mapId: 't4', parentFog: true, subhexFog: true });

  const before = win._events.length;
  const list = [];
  for (let q = 0; q < 50; q++) list.push({ Q: q, R: 0 });
  const n = Fog.revealSubhexes(list, { deferSave: true });
  assert(n === 50, `revealSubhexes returned ${n}, expected 50`);
  // No save event yet because we deferred.
  assert(win._events.length === before, 'deferSave suppresses change event');
  Fog.flush();
  assert(win._events.length === before + 1, 'flush dispatches one event');

  // Negative coords round-trip.
  Fog.revealSubhex(-7, -11);
  assert(Fog.isSubhexRevealed(-7, -11), 'negative axials work');
}

// ── 5. radius math ────────────────────────────────────────────────────────
section('subhex radius reveal');
{
  const win = makeWindow();
  const Fog = loadFog(win);
  Fog.init({ mapId: 't5', parentFog: true, subhexFog: true });

  // radius=0 → center only (1 cell).
  let n = Fog.revealSubhexRadius(0, 0, 0);
  assert(n === 1, `radius 0 reveals 1 cell, got ${n}`);

  // radius=1 → 7 cells (center + 6 neighbors). Center already revealed,
  // so n should be 6 new.
  n = Fog.revealSubhexRadius(0, 0, 1);
  assert(n === 6, `radius 1 from already-centered reveals 6 new, got ${n}`);
  assert(Fog.revealedSubhexCount() === 7, 'total 7 after radius-1');

  // Verify each of the 6 immediate axial neighbors is revealed.
  const NB = [[+1,0],[-1,0],[0,+1],[0,-1],[+1,-1],[-1,+1]];
  for (const [dQ, dR] of NB){
    assert(Fog.isSubhexRevealed(dQ, dR), `neighbor (${dQ},${dR}) revealed`);
  }

  // Distance helper sanity.
  assert(Fog.subhexDistance(0,0, 0,0) === 0, 'dist self = 0');
  assert(Fog.subhexDistance(0,0, 3,0) === 3, 'dist along Q = 3');
  assert(Fog.subhexDistance(0,0, 0,3) === 3, 'dist along R = 3');
  assert(Fog.subhexDistance(0,0, 3,-3) === 3, 'dist along S diagonal = 3');
  assert(Fog.subhexDistance(0,0, 2,2) === 4, 'dist (2,2) = 4');

  // radius=2 from new center: 19 cells total (1+6+12).
  Fog.hideAll();
  n = Fog.revealSubhexRadius(10, 10, 2);
  assert(n === 19, `radius 2 reveals 19, got ${n}`);
}

// ── 6. parent helpers with stubbed GCCSubhexData ──────────────────────────
section('parent helpers w/ ownedByParent stub');
{
  const win = makeWindow();
  // Stub a 5-cell parent ownership.
  win.GCCSubhexData = {
    ownedByParent(col, row){
      if (col === 70 && row === 50){
        return [{Q:0,R:0},{Q:1,R:0},{Q:0,R:1},{Q:-1,R:1},{Q:-1,R:0}];
      }
      return [];
    },
  };
  const Fog = loadFog(win);
  Fog.init({ mapId: 't6', parentFog: true, subhexFog: true });

  assert(Fog.subhexesRevealedInParent(70, 50) === 0, 'no reveals yet');
  assert(!Fog.parentHasAnyRevealedSubhex(70, 50), 'no any-reveal yet');

  const n = Fog.revealAllInParent(70, 50);
  assert(n === 5, `revealAllInParent revealed 5, got ${n}`);
  assert(Fog.subhexesRevealedInParent(70, 50) === 5, 'count back to 5');
  assert(Fog.parentHasAnyRevealedSubhex(70, 50), 'parent has any reveal');

  // Hide just one — count goes to 4, any-reveal still true.
  Fog.hideSubhex(0, 0);
  assert(Fog.subhexesRevealedInParent(70, 50) === 4, 'count 4 after hide one');
  assert(Fog.parentHasAnyRevealedSubhex(70, 50), 'still true with 4');

  Fog.hideAllInParent(70, 50);
  assert(Fog.subhexesRevealedInParent(70, 50) === 0, 'hideAllInParent zeroes');
  assert(!Fog.parentHasAnyRevealedSubhex(70, 50), 'no longer has any');
}

// ── 7. fog-disabled grain short-circuit ───────────────────────────────────
section('fog-disabled grain short-circuit');
{
  const win = makeWindow();
  const Fog = loadFog(win);
  // Greyhawk shape: parent fog OFF.
  Fog.init({ mapId: 't7', parentFog: false, subhexFog: true });

  assert(Fog.isParentRevealed(0, 0) === true,  'parentFog=false → all parents revealed');
  assert(Fog.isParentRevealed(99, 99) === true,'parentFog=false → arbitrary parent revealed');
  assert(Fog.revealParent(5, 5) === false,     'parentFog=false → revealParent is no-op');
  assert(Fog.hideParent(5, 5) === false,       'parentFog=false → hideParent is no-op');
  assert(Fog.revealedParentCount() === 0,      'parent set stays empty when disabled');

  // Subhex side still works.
  Fog.revealSubhex(1, 1);
  assert(Fog.isSubhexRevealed(1, 1), 'subhex reveal works while parent disabled');

  // Flip subhex off.
  Fog.setConfig({ subhexFog: false });
  assert(Fog.isSubhexRevealed(99, 99) === true, 'subhexFog=false → all subhexes revealed');
  assert(Fog.revealSubhex(2, 2) === false,      'subhexFog=false → revealSubhex no-op');
}

// ── 8. import / export ────────────────────────────────────────────────────
section('import / export');
{
  const win = makeWindow();
  const Fog = loadFog(win);
  Fog.init({ mapId: 't8', parentFog: true, subhexFog: true });

  Fog.revealSubhex(1, 1);
  Fog.revealSubhex(2, -2);
  Fog.revealParent(70, 50);

  const dump = Fog.exportFog();
  assert(dump.schemaVersion === 1, 'export schemaVersion is 1');
  assert(dump.subhexes.length === 2 && dump.parents.length === 1, 'export counts');

  Fog.hideAll();
  assert(Fog.revealedSubhexCount() === 0 && Fog.revealedParentCount() === 0, 'hideAll clears');

  // merge default — merges into empty.
  Fog.importFog(dump);
  assert(Fog.revealedSubhexCount() === 2, 'import merge restored subhexes');
  assert(Fog.revealedParentCount() === 1, 'import merge restored parents');

  // Replace mode wipes anything not in payload.
  Fog.revealSubhex(99, 99);
  Fog.importFog({ subhexes: ['1,1'], parents: [] }, { merge: false });
  assert(Fog.revealedSubhexCount() === 1, 'import replace narrows to 1');
  assert(Fog.isSubhexRevealed(1, 1), 'import replace kept (1,1)');
  assert(!Fog.isSubhexRevealed(99, 99), 'import replace dropped (99,99)');
  assert(Fog.revealedParentCount() === 0, 'import replace cleared parents');
}

// ── 9. corrupt storage tolerance ──────────────────────────────────────────
section('corrupt storage');
{
  const win = makeWindow();
  win.localStorage.setItem('gcc-fog-t9', '{not valid json');
  const Fog = loadFog(win);
  Fog.init({ mapId: 't9', parentFog: true, subhexFog: true });
  assert(Fog.revealedSubhexCount() === 0, 'corrupt JSON → empty state, no throw');
  Fog.revealSubhex(1, 1);
  assert(Fog.isSubhexRevealed(1, 1), 'recovers after first write');
}

// ── 10. preview mode + shouldFog ──────────────────────────────────────────
section('preview + shouldFog');
{
  const win = makeWindow();
  const Fog = loadFog(win);
  Fog.init({ mapId: 't10', parentFog: true, subhexFog: true });

  // Default: preview off → nothing fogged regardless of reveal state.
  assert(Fog.isPreview() === false, 'preview defaults off');
  assert(Fog.shouldFogSubhex(0, 0) === false, 'preview off → never fog (subhex)');
  assert(Fog.shouldFogParent(0, 0) === false, 'preview off → never fog (parent)');

  // Toggle preview on → unrevealed cells become fogged.
  const before = win._events.length;
  Fog.setPreview(true);
  assert(win._events.length === before + 1, 'setPreview dispatches event');
  assert(Fog.isPreview() === true, 'preview now on');
  assert(Fog.shouldFogSubhex(0, 0) === true, 'preview on + unrevealed → fog');

  Fog.revealSubhex(0, 0);
  assert(Fog.shouldFogSubhex(0, 0) === false, 'preview on + revealed → no fog');
  assert(Fog.shouldFogSubhex(5, 5) === true,  'preview on + other cell unrevealed → fog');

  // setPreview is idempotent and returns false on no-op.
  assert(Fog.setPreview(true) === false, 'setPreview(same) returns false');
  assert(Fog.setPreview(false) === true, 'setPreview(toggle) returns true');
  assert(Fog.shouldFogSubhex(5, 5) === false, 'preview off again → no fog');

  // togglePreview returns new state.
  assert(Fog.togglePreview() === true,  'toggle on');
  assert(Fog.togglePreview() === false, 'toggle off');

  // Disabled grain ignores preview.
  Fog.setConfig({ subhexFog: false });
  Fog.setPreview(true);
  assert(Fog.shouldFogSubhex(99, 99) === false, 'subhexFog=false short-circuits shouldFog');

  // Parent grain.
  Fog.setConfig({ parentFog: true, subhexFog: true });
  Fog.revealParent(70, 50);
  assert(Fog.shouldFogParent(70, 50) === false, 'revealed parent → no fog');
  assert(Fog.shouldFogParent(0, 0)   === true,  'unrevealed parent → fog');
}

// ── 11. preview persists across loads ─────────────────────────────────────
section('preview persistence');
{
  const win = makeWindow();
  const Fog1 = loadFog(win);
  Fog1.setPreview(true);
  // Reload module against same window (same localStorage).
  const Fog2 = loadFog(win);
  assert(Fog2.isPreview() === true, 'preview rehydrated from localStorage');
}

// ── 12. auto-reveal integration (party move → 7-cell halo) ───────────────
section('auto-reveal on party move');
{
  // Mirror greyhawk-map.html's revealFogAtParty: translate (col,row) →
  // parent-center axial via GCCSubhexData, then revealSubhexRadius(.., 1).
  // Stubs parentCenterAxial with simple fake geometry so we can assert
  // the 7-cell pattern without booting subhex-data.
  const win = makeWindow();
  win.GCCSubhexData = {
    parentCenterAxial(col, row){
      // Trivial mapping: parent (c,r) center = (c*10, r*10).
      return { Q: col * 10, R: row * 10 };
    },
  };
  const Fog = loadFog(win);
  Fog.init({ mapId: 't12', parentFog: false, subhexFog: true });

  function revealFogAtParty(col, row){
    const c = win.GCCSubhexData.parentCenterAxial(col, row);
    Fog.revealSubhexRadius(c.Q, c.R, 1);
  }

  // First move: 7 new reveals (1 + 6).
  revealFogAtParty(64, 44);
  assert(Fog.revealedSubhexCount() === 7, 'first move reveals 7 cells');

  // Same hex re-call: idempotent. revealSubhexRadius adds 0 — no save,
  // no event. Verify count unchanged and no extra event dispatched.
  const evBefore = win._events.length;
  revealFogAtParty(64, 44);
  assert(Fog.revealedSubhexCount() === 7, 'idempotent — count still 7');
  assert(win._events.length === evBefore, 'no event when 0 cells added');

  // Move to an adjacent parent: 7 more reveals (the two halos don't
  // overlap with this stubbed geometry — Q deltas of 10 are well past
  // radius 1).
  revealFogAtParty(65, 44);
  assert(Fog.revealedSubhexCount() === 14, 'adjacent move adds 7 more');

  // Third move into a parent that touches the first halo? With the stub
  // (col,row) → (10c, 10r), col=64 row=44 center = (640,440); col=64
  // row=45 center = (640,450). Distance 10. No overlap at radius 1.
  // So another 7. (Real geometry has radius-1 halos disjoint at parent
  // scale too; this just confirms the helper doesn't double-count.)
  revealFogAtParty(64, 45);
  assert(Fog.revealedSubhexCount() === 21, 'third disjoint parent → +7');
}

console.log(`\n── ${passes} passed, ${fails} failed ──`);
process.exit(fails ? 1 : 0);

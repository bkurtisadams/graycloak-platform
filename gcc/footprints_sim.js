// footprints_sim.js — DOM-stub sim harness for the large-creature footprint slice.
// Extracts the <script> block, runs it in a vm context with stubbed DOM/timers,
// then appends an async IIFE (sharing the script's lexical scope) that drives the
// real engine functions and asserts footprint occupancy / engagement / pathing / placement.
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('dungeon-encounter.html', 'utf8');
const script = html.match(/<script>([\s\S]*)<\/script>/)[1];

// --- universal no-op DOM node ---
function fakeNode() {
  const node = {
    style: {}, dataset: {}, children: [], childNodes: [],
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    value: '', textContent: '', innerHTML: '', className: '',
    appendChild(c) { return c; }, removeChild() {}, insertBefore(c) { return c; },
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    setAttributeNS() {}, addEventListener() {}, removeEventListener() {}, remove() {},
    cloneNode() { return fakeNode(); },
    querySelector() { return fakeNode(); }, querySelectorAll() { return []; },
    getContext() { return fakeNode(); },
    getBoundingClientRect() { return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }; },
    focus() {}, blur() {}, click() {},
  };
  return new Proxy(node, {
    get(t, p) { return (p in t) ? t[p] : () => fakeNode(); },
    set(t, p, v) { t[p] = v; return true; },
  });
}

const documentStub = {
  getElementById() { return fakeNode(); },
  querySelector() { return fakeNode(); },
  querySelectorAll() { return []; },
  createElement() { return fakeNode(); },
  createElementNS() { return fakeNode(); },
  addEventListener() {}, removeEventListener() {},
  body: fakeNode(), documentElement: fakeNode(),
};
const windowStub = {
  addEventListener() {}, removeEventListener() {},
  innerWidth: 1200, innerHeight: 800, devicePixelRatio: 1,
  getComputedStyle() { return {}; },
};

const sandbox = {
  document: documentStub,
  window: windowStub,
  console,
  requestAnimationFrame() { return 0; },   // no-op: tests never rely on animation
  cancelAnimationFrame() {},
  performance: { now() { return Date.now(); } },
  setTimeout(fn) { return 0; }, clearTimeout() {},
};
vm.createContext(sandbox);
sandbox.globalThis = sandbox;
sandbox.window.requestAnimationFrame = sandbox.requestAnimationFrame;

const tests = `
;(async () => {
  let pass = 0, fail = 0;
  const A = (cond, msg) => { if (cond) pass++; else { fail++; console.log('  FAIL: ' + msg); } };
  const FC = (c) => footprintCells(c).map(x => x.col + ',' + x.row);

  // sanity: test region is floor (interior of the 14x9 room)
  const floorOK = (c, r) => SCENE.terrain[r] && SCENE.terrain[r][c] && SCENE.terrain[r][c] !== 'W';
  let region = true;
  for (let c = 20; c <= 38; c++) for (let r = 16; r <= 24; r++) if (!floorOK(c, r)) region = false;
  A(region, 'test region cols20-38/rows16-24 is open floor');
  A(COLS === 56 && ROWS === 36, 'fine grid is 56x36 (14x9 @ SUB=4)');

  // --- T1 footprint cells ---
  const og = { position: { col: 20, row: 20 }, size_cells: 2 };
  A(footprintCells(og).length === 4, 'L footprint = 4 cells');
  A(FC(og).join('|') === '20,20|20,21|21,20|21,21', 'L footprint = NW-anchored 2x2 block');
  A(footprintCells({ position: { col: 5, row: 5 } }).length === 1, 'M footprint = 1 cell');
  A(footprintCells({ position: { col: 5, row: 5 }, size_cells: 3 }).length === 9, 'Huge footprint = 9 cells');

  // --- footprintRect: pick/target overlay geometry ---
  const fr1 = footprintRect(10, 10, 1), fr2 = footprintRect(10, 10, 2);
  const tlR = cellTopLeft(10, 10);
  A(fr1.size === SIZE, 'footprintRect 1x1 spans one cell');
  A(fr2.size === 2 * SIZE, 'footprintRect 2x2 spans two cells');
  A(fr2.x === tlR.x && fr2.y === tlR.y, 'footprintRect anchors at NW top-left');

  // --- T2 engagement reach via footprint (reach stays 1; footprint extends it) ---
  const ogre = { position: { col: 20, row: 20 }, size_cells: 2 };
  A(inMelee(ogre, { position: { col: 22, row: 20 } }) === true,  '1x1 at cheb-1 from a footprint cell engages');
  A(inMelee(ogre, { position: { col: 22, row: 22 } }) === true,  '1x1 diagonal off SE corner engages');
  A(inMelee(ogre, { position: { col: 23, row: 20 } }) === false, '1x1 two cells off footprint not engaged');
  A(inMelee(ogre, { position: { col: 22, row: 20 } }) === inMelee({ position: { col: 22, row: 20 } }, ogre), 'inMelee symmetric');
  // 1x1 vs 1x1 regression == old isAdjacent (chebyshev 1, non-overlap)
  const oracle = (a, b) => Math.max(Math.abs(a.position.col - b.position.col), Math.abs(a.position.row - b.position.row)) === 1;
  let reg = true;
  for (let dc = -2; dc <= 2; dc++) for (let dr = -2; dr <= 2; dr++) {
    const a = { position: { col: 10, row: 10 } }, b = { position: { col: 10 + dc, row: 10 + dr } };
    if (inMelee(a, b) !== oracle(a, b)) reg = false;
  }
  A(reg, '1x1-vs-1x1 inMelee matches old chebyshev-1 adjacency (regression)');

  // --- T3 occupancy: 1x1 cannot path through a 2x2 footprint ---
  let st = makeInitialState();
  let O = st.combatants.find(c => c.id === 'ogre_1'); O.position = { col: 25, row: 20 };
  let M = st.combatants.find(c => c.id === 'aggro');  M.position = { col: 29, row: 20 };
  st.combatants = [O, M];
  let reach = computeReachable(st, M.position, 10, M.id);
  A(['25,20','26,20','25,21','26,21'].every(k => !reach.has(k)), '1x1 cannot enter any ogre footprint cell');
  A(reach.has('27,20'), '1x1 reaches the cell just east of the footprint');

  // --- T4 ogre as mover: every reachable anchor keeps a legal 2x2 footprint ---
  let st2 = makeInitialState();
  let O2 = st2.combatants.find(c => c.id === 'ogre_1'); O2.position = { col: 25, row: 20 };
  st2.combatants = [O2];
  let r2 = computeReachable(st2, O2.position, 6, O2.id);
  let legal = true;
  for (const [, info] of r2) {
    if (info.distance === 0) continue;
    for (let dc = 0; dc < 2; dc++) for (let dr = 0; dr < 2; dr++) {
      const x = info.col + dc, y = info.row + dr;
      if (x < 0 || x >= COLS || y < 0 || y >= ROWS || SCENE.terrain[y][x] === 'W') legal = false;
    }
  }
  A(legal, 'ogre reachable anchors all keep a clear, in-bounds 2x2 footprint');
  A(r2.size > 1, 'ogre actually has somewhere to move');

  // --- T5 inMeleeAt (the predicate moveCombatantTo uses for break-off) ---
  const ogreX = { position: { col: 30, row: 20 }, size_cells: 2 }; // cells 30-31,20-21
  A(inMeleeAt({ size_cells: 1 }, { col: 32, row: 20 }, ogreX) === true,  'inMeleeAt: 1x1 at 32,20 engaged (cell 31,20)');
  A(inMeleeAt({ size_cells: 1 }, { col: 33, row: 20 }, ogreX) === false, 'inMeleeAt: 1x1 stepping to 33,20 breaks off');
  const pcX = { position: { col: 33, row: 20 } };
  A(inMeleeAt({ size_cells: 2 }, { col: 30, row: 20 }, pcX) === false, 'inMeleeAt: ogre anchor 30,20 not engaged with pc 33,20');
  A(inMeleeAt({ size_cells: 2 }, { col: 31, row: 20 }, pcX) === true,  'inMeleeAt: ogre anchor 31,20 (cell 32) engages pc 33,20');

  // --- T6 recomputeEngagements end-to-end ---
  state = makeInitialState();
  let O3 = state.combatants.find(c => c.id === 'ogre_1'); O3.position = { col: 30, row: 20 };
  let G3 = state.combatants.find(c => c.id === 'aggro');  G3.position = { col: 32, row: 20 };
  state.combatants.filter(c => c.id !== 'ogre_1' && c.id !== 'aggro').forEach((c, i) => { c.position = { col: 2, row: 2 + i }; });
  recomputeEngagements(state);
  A(G3.engaged_with.includes('ogre_1'), 'aggro engaged with ogre via footprint');
  A(O3.engaged_with.includes('aggro'), 'ogre engaged with aggro (symmetric)');
  G3.position = { col: 33, row: 20 };
  recomputeEngagements(state);
  A(!G3.engaged_with.includes('ogre_1'), 'aggro disengages at distance 2 from footprint');

  // --- T7 findBestAdjacentSquare both directions ---
  state = makeInitialState();
  let O4 = state.combatants.find(c => c.id === 'ogre_1'); O4.position = { col: 30, row: 20 };
  let G4 = state.combatants.find(c => c.id === 'aggro');  G4.position = { col: 36, row: 20 };
  state.combatants.filter(c => c.id !== 'ogre_1' && c.id !== 'aggro').forEach((c, i) => { c.position = { col: 2, row: 2 + i }; });
  let fbPC = findBestAdjacentSquare(state, G4.position, O4, 10, G4.id);
  A(fbPC !== null, 'PC finds a square adjacent to the ogre footprint');
  A(minCheb(cellsAt(fbPC, 1), footprintCells(O4)) === 1, 'PC stop-square is exactly reach-1 to ogre footprint');

  state = makeInitialState();
  let O5 = state.combatants.find(c => c.id === 'ogre_1'); O5.position = { col: 20, row: 20 };
  let G5 = state.combatants.find(c => c.id === 'aggro');  G5.position = { col: 30, row: 20 };
  state.combatants.filter(c => c.id !== 'ogre_1' && c.id !== 'aggro').forEach((c, i) => { c.position = { col: 2, row: 2 + i }; });
  let fbOG = findBestAdjacentSquare(state, O5.position, G5, 16, O5.id);
  A(fbOG !== null, 'ogre finds an anchor to engage the PC');
  A(minCheb(cellsAt(fbOG, 2), footprintCells(G5)) === 1, 'ogre anchor puts its footprint at reach-1 to the PC');

  // --- T8 placeParties: ogre footprint fits and nothing overlaps it ---
  state = makeInitialState();
  placeParties(2);
  let pO = state.combatants.find(c => c.id === 'ogre_1');
  let fits = true;
  for (let dc = 0; dc < 2; dc++) for (let dr = 0; dr < 2; dr++) {
    const x = pO.position.col + dc, y = pO.position.row + dr;
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS || isWallCell(x, y)) fits = false;
  }
  A(fits, 'placeParties: ogre 2x2 deployed in-bounds and off-wall');
  const ogSet = new Set(footprintCells(pO).map(c => c.col + ',' + c.row));
  const others = state.combatants.filter(c => c.id !== 'ogre_1' && !c.dead);
  let noOverlap = others.every(o => footprintCells(o).every(cell => !ogSet.has(cell.col + ',' + cell.row)));
  A(noOverlap, 'placeParties: no other combatant overlaps the ogre footprint');

  // --- T9 regression: 1x1 BFS in open space unchanged (8-way, no obstacles) ---
  let st9 = makeInitialState();
  let solo = st9.combatants.find(c => c.id === 'arlanni'); solo.position = { col: 28, row: 20 };
  st9.combatants = [solo];
  let r9 = computeReachable(st9, solo.position, 3, solo.id);
  // open 8-way BFS within budget 3 = (2*3+1)^2 = 49 cells (incl. origin), region is clear
  A(r9.size === 49, '1x1 open-floor reachable count = 49 at budget 3 (regression)');

  console.log('\\n' + (fail === 0 ? 'ALL GREEN' : 'RED') + ' — ' + pass + ' passed, ' + fail + ' failed (' + (pass + fail) + ' assertions)');
})();
`;

try {
  vm.runInContext(script + tests, sandbox, { filename: 'dungeon-encounter.html', timeout: 10000 });
} catch (e) {
  console.log('HARNESS ERROR:', e && e.stack ? e.stack.split('\n').slice(0, 4).join('\n') : e);
  process.exit(1);
}

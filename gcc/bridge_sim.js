// bridge_sim.js — validates the AD&D sheet -> combatant bridge against a real exported PC (Val.json).
// Same DOM-stub vm pattern: load the sim, then drive mapCharToCombatant / loadCharacterFromObj in a trailing IIFE.
const fs = require('fs');
const vm = require('vm');

const script = fs.readFileSync('dungeon-encounter.html', 'utf8').match(/<script>([\s\S]*)<\/script>/)[1];
const VAL = fs.readFileSync('Val.json', 'utf8');

function fakeNode() {
  const node = {
    style: {}, dataset: {}, children: [], childNodes: [],
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    value: '', textContent: '', innerHTML: '', className: '',
    appendChild(c) { return c; }, removeChild() {}, insertBefore(c) { return c; },
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {}, setAttributeNS() {},
    addEventListener() {}, removeEventListener() {}, remove() {}, cloneNode() { return fakeNode(); },
    querySelector() { return fakeNode(); }, querySelectorAll() { return []; }, getContext() { return fakeNode(); },
    getBoundingClientRect() { return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }; },
    focus() {}, blur() {}, click() {},
  };
  return new Proxy(node, { get(t, p) { return (p in t) ? t[p] : () => fakeNode(); }, set(t, p, v) { t[p] = v; return true; } });
}
const sandbox = {
  document: { getElementById() { return fakeNode(); }, querySelector() { return fakeNode(); }, querySelectorAll() { return []; },
    createElement() { return fakeNode(); }, createElementNS() { return fakeNode(); }, addEventListener() {}, body: fakeNode(), documentElement: fakeNode() },
  window: { addEventListener() {}, removeEventListener() {}, innerWidth: 1200, innerHeight: 800, devicePixelRatio: 1, getComputedStyle() { return {}; } },
  console, requestAnimationFrame() { return 0; }, cancelAnimationFrame() {}, performance: { now() { return Date.now(); } },
  setTimeout() { return 0; }, clearTimeout() {},
};
vm.createContext(sandbox);
sandbox.globalThis = sandbox; sandbox.window.requestAnimationFrame = sandbox.requestAnimationFrame;

const tests = `
;(async () => {
  let pass = 0, fail = 0;
  const A = (cond, msg) => { if (cond) pass++; else { fail++; console.log('  FAIL: ' + msg); } };
  const VAL = ${VAL};

  const c = mapCharToCombatant(VAL, 'A');

  // identity / class / level (multiclass MU/Thief 10/11 -> best combat matrix = thief, paired level 11)
  A(c.label === 'Val', 'label = Val');
  A(c.matrix_class === 'thief', 'multiclass picks thief matrix (got ' + c.matrix_class + ')');
  A(c.level === 11, 'thief level paired = 11 (got ' + c.level + ')');
  A(c.kind === 'pc' && c.side === 'A' && c.size_cells === 1, 'pc on side A, 1x1 footprint');

  // hp / ac (strings on the sheet, coerced; AC already 1e descending)
  A(c.hp_max === 48 && c.hp_current === 48, 'hp 48/48');
  A(c.ac_current === -3, 'ac_current = -3 (got ' + c.ac_current + ')');
  A(c.ac_base === -3, 'ac_base from acShieldless = -3');

  // combat adj: sheet combat fields blank -> strength fallback (str 9 -> 0)
  A(c.attack_bonus === 0, 'attack_bonus falls back to strHitAdj = 0');
  A(c.damage_bonus === 0, 'damage_bonus falls back to strDamAdj = 0');

  // weapon selection: primaryWeapon blank -> best melee by magic = Frost Brand (+3)
  A(c.active_weapon === 'frost_brand_sword_long', 'active weapon = frost brand (got ' + c.active_weapon + ')');
  A(c.magic_weapons.frost_brand_sword_long === 3, 'frost brand magic = +3');
  A(!c.loadout.includes('frost_brand'), 'junk empty "Frost Brand" row skipped');
  A(c.loadout.includes('dagger') && c.loadout.includes('bow_short'), 'loadout has dagger + short bow');

  // magic bonus baked into dice is stripped to base (no double count)
  const fb = WEAPONS.frost_brand_sword_long;
  A(fb.damage.sm === '1d8' && fb.damage.l === '1d12', 'frost brand dice stripped to base 1d8/1d12 (got ' + fb.damage.sm + '/' + fb.damage.l + ')');
  A(fb.melee === true && fb.length === 4, 'frost brand is melee, length 4');
  const bow = WEAPONS.bow_short;
  A(bow.ranged === true && bow.range_squares.s === 5, 'short bow ranged, short band 5');

  // spells: only sim-implemented spells map; charges = qty - cast
  A(c.spell_charges.magic_missile === 4, 'magic missile 4 charges (got ' + c.spell_charges.magic_missile + ')');
  A(c.spell_charges.identify === undefined, 'unimplemented spells (Identify) not mapped');

  // move: 1e RAW — rate is in inches (1" = 10 ft indoors); sheet encumbers Val to 3".
  // moveCells(c) = c.move * SUB derives the per-round fine-cell budget downstream.
  A(c.move_rate === 3, 'move_rate = encumbered 3" (got ' + c.move_rate + ')');
  A(c.move === 3, 'move = 3" RAW inches (moveCells applies xSUB) (got ' + c.move + ')');

  // saves carried for the future saves slice
  A(c.saves.spell === 10 && c.saves.rsw === 9 && c.saves.ppd === 11, 'saves carried (spell 10, rsw 9, ppd 11)');

  // end-to-end: the engine accepts the combatant and applies +3 once to-hit
  let thrErr = null, thac0;
  try { thac0 = thac0Of(c); } catch (e) { thrErr = e.message; }
  A(thrErr === null, 'thac0Of does not throw on bridged combatant' + (thrErr ? ' (' + thrErr + ')' : ''));
  A(thac0 === 16, 'thief L11 THAC0 = 16 (got ' + thac0 + ')');
  const calc = computeToHit(c, { ac_current: 6 }, WEAPONS[c.active_weapon], 0);
  // base 16-6=10; vs_ac[6]=0; magic +3; str 0 => needed 7
  A(calc.magic === 3, 'frost brand +3 reaches to-hit (magic = ' + calc.magic + ')');
  A(calc.needed === 7, 'needed vs AC6 = 7 (got ' + calc.needed + ')');

  // injection: loadCharacterFromObj adds to side A with a formation slot
  const before = state.combatants.length;
  const lc = loadCharacterFromObj(VAL);
  A(state.combatants.length === before + 1, 'loaded PC pushed to combatants');
  A(state.combatants.find(x => x.id === lc.id) === lc, 'combatant findable by id');
  A(state.formation[lc.id] && typeof state.formation[lc.id].rank === 'number', 'formation slot assigned');
  // reload same id replaces, not duplicates
  loadCharacterFromObj(VAL);
  A(state.combatants.filter(x => x.id === lc.id).length === 1, 'reloading same PC replaces (no dupe)');

  console.log('\\n' + (fail === 0 ? 'ALL GREEN' : 'RED') + ' — ' + pass + ' passed, ' + fail + ' failed (' + (pass + fail) + ' assertions)');
})();
`;

try {
  vm.runInContext(script + tests, sandbox, { filename: 'dungeon-encounter.html', timeout: 10000 });
} catch (e) {
  console.log('HARNESS ERROR:', e && e.stack ? e.stack.split('\n').slice(0, 5).join('\n') : e);
  process.exit(1);
}

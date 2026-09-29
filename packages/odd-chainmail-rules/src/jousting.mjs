/**
 * OD&D — Chainmail engine · jousting & tourney (Appendix C)
 * odd-chainmail · module/rules/jousting.mjs
 * system 0.1.170 · slice: joust-match · stamp 0.1.170-joust-match.1
 *
 * Pure and runtime-free. The joust is a SEPARATE minigame from man-to-man
 * melee — it never touches the to-hit table (combat-engine.mjs). Each knight
 * picks an aiming point (his attack) and a defensive position (his defense);
 * his own aiming point limits which defenses are legal (LEGAL_DEFENSES). A ride
 * is two cross-lookups: A's aim vs B's defense, and B's aim vs A's defense. The
 * cell result lands on the DEFENDER (helm off / injured / unhorsed) except a
 * broken lance, which is the ATTACKER's. Simultaneous double-unhorse is legal.
 *
 * RULES-CALLS (Kurt, locked):
 *   compound  cells like B/U/I list the POSSIBLE outcomes; one occurs per
 *             lookup, picked at random. Not all-of-them — a plain "U" cell
 *             must out-unhorse a B/U/I cell, which only works if the slash is
 *             "one of these". resolveCompound() takes a uniform pick; swap the
 *             body in ONE place to reweight.
 *   injury    an "I" result is real: defender takes 1d6 and a knight CAN die in
 *             the lists (rare tail, fits "à plaisance"). resolveRide rolls and
 *             emits injuryDamage; -10 tourney points still apply.
 *
 * Forced position 4 (the matrix asterisk): a knight who breaks his lance (B) or
 * has his helm knocked off (H) must ride position 4 next ride. resolveRide sets
 * forcePos4 on the affected knight; the match loop applies it (pos 4 is legal
 * under every aiming point, so it never collides with LEGAL_DEFENSES).
 */

import { rollDie } from "./dice.mjs";

/** Result codes, exactly as printed in the matrix. */
export const Result = Object.freeze({
  MISS: "M",          // Miss
  BREAKS_LANCE: "B",  // attacker's lance breaks → his -1, forcePos4
  GLANCES: "G",       // Glances off
  HELM_OFF: "H",      // defender's helm knocked off → attacker +3, def forcePos4
  INJURED: "I",       // defender injured → defender -10
  UNHORSED: "U"       // defender unhorsed → attacker +20, match over
});

const { MISS: M, BREAKS_LANCE: B, GLANCES: G, HELM_OFF: H, INJURED: I, UNHORSED: U } = Result;

/** Aiming points in matrix-row order. region maps to the heraldic shield cell. */
export const AIMING_POINTS = Object.freeze([
  Object.freeze({ id: "helm", label: "Helm",            region: null }),
  Object.freeze({ id: "dc",   label: "Dexter Chief",    region: "DC" }),
  Object.freeze({ id: "cp",   label: "Pale Chief",      region: "CP" }),
  Object.freeze({ id: "sc",   label: "Sinister Chief",  region: "SC" }),
  Object.freeze({ id: "df",   label: "Dexter Fess",     region: "DF" }),
  Object.freeze({ id: "fp",   label: "Pale Fess",       region: "FP" }),
  Object.freeze({ id: "sf",   label: "Sinister Fess",   region: "SF" }),
  Object.freeze({ id: "base", label: "Base",            region: null })
]);

/** Defensive positions, 1-6 as printed across the matrix columns. */
export const DEFENSIVE_POSITIONS = Object.freeze([
  Object.freeze({ pos: 1, id: "lowerHelm",  label: "Lower Helm" }),
  Object.freeze({ pos: 2, id: "leanRight",  label: "Lean Right" }),
  Object.freeze({ pos: 3, id: "leanLeft",   label: "Lean Left" }),
  Object.freeze({ pos: 4, id: "steadySeat", label: "Steady Seat" }),
  Object.freeze({ pos: 5, id: "shieldHigh", label: "Shield High" }),
  Object.freeze({ pos: 6, id: "shieldLow",  label: "Shield Low" })
]);

/** PDP/AP — defenses legal under each aiming point (the side column). */
export const LEGAL_DEFENSES = Object.freeze({
  helm: Object.freeze([4, 5, 6]),
  dc:   Object.freeze([3, 4, 5, 6]),
  cp:   Object.freeze([1, 2, 3, 4, 5, 6]),
  sc:   Object.freeze([2, 4, 5, 6]),
  df:   Object.freeze([4, 5, 6]),
  fp:   Object.freeze([1, 2, 3, 4, 5, 6]),
  sf:   Object.freeze([4, 5, 6]),
  base: Object.freeze([1, 4, 5, 6])
});

/** The matrix. Row = aiming point; index 0..5 = defensive position 1..6. */
export const MATRIX = Object.freeze({
  helm: Object.freeze([[M], [M], [M], [H], [U], [M]]),
  dc:   Object.freeze([[U], [B], [M], [B], [B], [M]]),
  cp:   Object.freeze([[B, U, I], [U], [G], [B], [B, U], [U, I]]),
  sc:   Object.freeze([[G], [M], [B], [G], [G], [U]]),
  df:   Object.freeze([[B], [B, U], [M], [B], [M], [B]]),
  fp:   Object.freeze([[B, U], [G], [B], [B, U], [B, U, I], [B]]),
  sf:   Object.freeze([[G], [M], [B, U], [G], [G], [G]]),
  base: Object.freeze([[B], [G], [U], [B], [B, U, I], [B]])
});

/** Per-ride tourney points for a resolved code (Appendix C scoring table). */
export const RIDE_SCORE = Object.freeze({
  M: Object.freeze({ attacker: 0,  defender: 0 }),
  G: Object.freeze({ attacker: 0,  defender: 0 }),
  B: Object.freeze({ attacker: -1, defender: 0 }),
  H: Object.freeze({ attacker: 3,  defender: 0 }),
  I: Object.freeze({ attacker: 0,  defender: -10 }),
  U: Object.freeze({ attacker: 20, defender: 0 })
});

/** Is this defensive position legal under the given aiming point? */
export function isLegal(aim, pos) {
  return (LEGAL_DEFENSES[aim] ?? []).includes(pos);
}

/**
 * Collapse a compound cell to one code. DEFAULT POLICY (rules-call): uniform
 * pick among the listed outcomes. Single-code cells pass through unchanged.
 */
export function resolveCompound(codes, rng = Math.random) {
  if (codes.length === 1) return codes[0];
  const idx = Math.min(codes.length - 1, Math.floor(rng() * codes.length));
  return codes[idx];
}

/** Resolve one lookup: attacker's aim vs defender's position -> single code. */
export function cellResult(aim, defPos, rng = Math.random) {
  const row = MATRIX[aim];
  if (!row) throw new TypeError(`jousting: unknown aiming point "${aim}"`);
  const codes = row[defPos - 1];
  if (!codes) throw new TypeError(`jousting: bad defensive position ${defPos}`);
  return resolveCompound(codes, rng);
}

function blankKnight() {
  return {
    aim: null, def: null, code: null, score: 0,
    lanceBroken: false, helmOff: false, injured: false, injuryDamage: 0, unhorsed: false, forcePos4: false
  };
}

/** Apply one resolved lookup to the attacker and defender records. */
function applyCode(code, atk, def) {
  atk.score += RIDE_SCORE[code].attacker;
  def.score += RIDE_SCORE[code].defender;
  if (code === B) { atk.lanceBroken = true; atk.forcePos4 = true; }
  if (code === H) { def.helmOff = true;     def.forcePos4 = true; }
  if (code === I) { def.injured = true; }
  if (code === U) { def.unhorsed = true; }
}

/**
 * Resolve one ride between two knights.
 * @param {{a:{aim:string,def:number}, b:{aim:string,def:number}}} pair
 * @param {() => number} [rng]
 * @returns {{a:object, b:object, over:boolean}}  over = either knight unhorsed
 */
export function resolveRide({ a, b }, rng = Math.random) {
  for (const [who, k] of [["a", a], ["b", b]]) {
    if (!k || !MATRIX[k.aim]) throw new TypeError(`resolveRide: knight ${who} has an invalid aim`);
    if (!isLegal(k.aim, k.def)) throw new RangeError(`resolveRide: knight ${who} defense ${k.def} illegal for aim "${k.aim}"`);
  }

  const recA = blankKnight();
  const recB = blankKnight();
  const codeAB = cellResult(a.aim, b.def, rng); // A attacks B
  const codeBA = cellResult(b.aim, a.def, rng); // B attacks A
  applyCode(codeAB, recA, recB);
  applyCode(codeBA, recB, recA);

  recA.aim = a.aim; recA.def = a.def; recA.code = codeAB;
  recB.aim = b.aim; recB.def = b.def; recB.code = codeBA;
  // A knight is defender in exactly one lookup, so injury lands at most once.
  if (recA.injured) recA.injuryDamage = rollDie(rng);
  if (recB.injured) recB.injuryDamage = rollDie(rng);
  return { a: recA, b: recB, over: recA.unhorsed || recB.unhorsed };
}

/**
 * Fold one resolved ride (from resolveRide) into two running bout records. Pure:
 * returns the next per-knight bout fields plus match status. The caller persists
 * them, applies injuryDamage to HP, and manages the ride counter / forced pos 4.
 *
 * Each bout in: { score, ride, rides }. A simultaneous double-unhorse is a legal
 * draw (Kurt's call). After the last ride without an unhorse, higher score wins
 * (ties possible — the scoring table is built to make them rare).
 *
 * @param {{score?:number, ride?:number, rides?:number}} boutA
 * @param {{score?:number, ride?:number, rides?:number}} boutB
 * @param {{a:object, b:object, over:boolean}} ride  resolveRide() output
 * @returns {{a:object, b:object, over:boolean, winner:(string|null), ride:number, rides:number}}
 */
export function applyRide(boutA, boutB, ride) {
  const fold = (bout, r) => ({
    score: (bout.score ?? 0) + r.score,
    lance: !r.lanceBroken,
    helm: !r.helmOff,
    forcedNext: r.lanceBroken || r.helmOff,
    unhorsed: r.unhorsed,
    injuryDamage: r.injuryDamage ?? 0
  });
  const a = fold(boutA, ride.a);
  const b = fold(boutB, ride.b);
  const rideNum = boutA.ride ?? 1;
  const rides = boutA.rides ?? 3;
  const over = ride.over || rideNum >= rides;
  let winner = null;
  if (over) {
    if (ride.a.unhorsed && ride.b.unhorsed) winner = "draw";
    else if (ride.b.unhorsed) winner = "a";
    else if (ride.a.unhorsed) winner = "b";
    else winner = a.score > b.score ? "a" : b.score > a.score ? "b" : "draw";
  }
  return { a, b, over, winner, ride: rideNum, rides };
}

/* Self-tests — Node only. */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`jousting.mjs FAIL: ${l}`); pass++; };
  const CODES = new Set(Object.values(Result));
  const lo = () => 0;     // forces first listed code
  const hi = () => 0.999; // forces last listed code

  // Matrix integrity.
  const aimIds = AIMING_POINTS.map((a) => a.id);
  ok(Object.keys(MATRIX).length === 8, "8 aiming rows");
  ok(aimIds.every((id) => id in MATRIX), "AIMING_POINTS align with MATRIX");
  for (const id of aimIds) {
    ok(MATRIX[id].length === 6, `${id} has 6 cells`);
    for (const cell of MATRIX[id]) {
      ok(Array.isArray(cell) && cell.length >= 1, `${id} cell non-empty`);
      ok(cell.every((c) => CODES.has(c)), `${id} cell codes valid`);
    }
  }

  // Legal-defense column.
  ok(Object.keys(LEGAL_DEFENSES).every((id) => id in MATRIX), "LEGAL_DEFENSES keys align");
  for (const id of aimIds) {
    ok(LEGAL_DEFENSES[id].every((p) => p >= 1 && p <= 6), `${id} legal positions in 1..6`);
    ok(LEGAL_DEFENSES[id].includes(4), `${id} allows pos 4 (forcePos4 safe)`);
  }
  ok(!isLegal("helm", 3) && isLegal("helm", 4), "helm precludes 1-3");
  ok(isLegal("cp", 1) && isLegal("fp", 6), "Any-AP columns open all");
  ok(isLegal("base", 1) && !isLegal("base", 2), "base allows 1,4-6 only");

  // Cell lookups (single-code cells, rng irrelevant).
  ok(cellResult("helm", 4) === H, "helm vs steady seat = H");
  ok(cellResult("helm", 5) === U, "helm vs shield high = U");
  ok(cellResult("dc", 1) === U, "dc vs lower helm = U");
  ok(cellResult("sc", 6) === U, "sc vs shield low = U");

  // Compound resolution is deterministic under a stub rng.
  ok(resolveCompound([B, U, I], lo) === B, "compound lo -> first");
  ok(resolveCompound([B, U, I], hi) === I, "compound hi -> last");
  ok(resolveCompound([U], lo) === U, "single passes through");

  // Scoring table.
  ok(RIDE_SCORE.U.attacker === 20 && RIDE_SCORE.H.attacker === 3, "unhorse 20, helm 3");
  ok(RIDE_SCORE.B.attacker === -1 && RIDE_SCORE.I.defender === -10, "lance -1, injured -10");

  // Ride: helm aim vs steady seat -> H on the defender, attacker +3, def forcePos4.
  const r = resolveRide({ a: { aim: "helm", def: 4 }, b: { aim: "base", def: 4 } }, lo);
  ok(r.a.code === H, "A lands helm-off");
  ok(r.a.score === 3 && r.b.helmOff && r.b.forcePos4, "A +3, B helm off + forcePos4");
  ok(r.b.code === B && r.b.lanceBroken && r.b.forcePos4 && r.b.score === -1, "B (base v4) breaks lance");
  ok(r.over === false, "no unhorse -> ride not over");

  // Ride: a guaranteed unhorse ends the match.
  const r2 = resolveRide({ a: { aim: "helm", def: 5 }, b: { aim: "helm", def: 5 } }, lo);
  ok(r2.a.code === U && r2.b.unhorsed && r2.a.score === 20, "helm v5 -> unhorse, +20");
  ok(r2.over === true, "double-unhorse -> over");

  // Illegal defense rejected.
  let threw = false;
  try { resolveRide({ a: { aim: "helm", def: 1 }, b: { aim: "helm", def: 4 } }); }
  catch { threw = true; }
  ok(threw, "illegal defense throws");

  // Injury rolls 1d6 on the injured knight only (hi -> I, rollDie -> 6).
  const inj = resolveRide({ a: { aim: "cp", def: 4 }, b: { aim: "base", def: 1 } }, hi);
  ok(inj.b.injured && inj.b.injuryDamage === 6, "injured knight takes 1d6 (hi -> 6)");
  ok(!inj.a.injured && inj.a.injuryDamage === 0, "uninjured knight takes 0");

  // applyRide: folds scores, flags forcedNext, decides winner / draw / over.
  const mkRide = (ra, rb, over) => ({ a: { score: 0, lanceBroken: false, helmOff: false, unhorsed: false, injuryDamage: 0, ...ra }, b: { score: 0, lanceBroken: false, helmOff: false, unhorsed: false, injuryDamage: 0, ...rb }, over });
  const ar1 = applyRide({ score: 2, ride: 1, rides: 3 }, { score: 0, ride: 1, rides: 3 }, mkRide({ score: 3 }, { score: 0, lanceBroken: true }, false));
  ok(ar1.a.score === 5 && ar1.b.score === 0, "scores accumulate");
  ok(ar1.b.forcedNext === true && ar1.b.lance === false, "broken lance -> forcedNext, lance shown broken");
  ok(ar1.over === false && ar1.winner === null, "mid-match not over");
  const ar2 = applyRide({ score: 0, ride: 2, rides: 3 }, { score: 0, ride: 2, rides: 3 }, mkRide({ score: 20 }, { score: 0, unhorsed: true }, true));
  ok(ar2.over === true && ar2.winner === "a", "unhorsing b -> a wins, over");
  const ar3 = applyRide({ score: 7, ride: 3, rides: 3 }, { score: 4, ride: 3, rides: 3 }, mkRide({ score: 0 }, { score: 0 }, false));
  ok(ar3.over === true && ar3.winner === "a", "after final ride higher score wins");
  const ar4 = applyRide({ score: 1, ride: 2, rides: 3 }, { score: 1, ride: 2, rides: 3 }, mkRide({ score: 20 }, { score: 20 }, false));
  const ar5 = applyRide({ score: 0, ride: 1, rides: 3 }, { score: 0, ride: 1, rides: 3 }, mkRide({ score: 20, unhorsed: true }, { score: 20, unhorsed: true }, true));
  ok(ar5.over === true && ar5.winner === "draw", "double-unhorse -> draw");
  ok(ar4.over === false, "ar4 sanity: ride 2 of 3 not over without unhorse");

  console.log(`jousting.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

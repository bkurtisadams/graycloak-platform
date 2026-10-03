/**
 * OD&D — underworld time and rest
 * odd-chainmail-rules · src/exploration.mjs
 *
 * Pure. Book III, The Move/Turn in the Underworld. Kurt's ruling, Oct 2026:
 * Chainmail's combat fatigue is not used in man-to-man; Book III's rest rule
 * governs instead.
 */

/** A turn is about ten minutes: two moves; in flight or pursuit, four moves and no mapping. */
export const TURN_MINUTES = 10;
export const TURNS_PER_HOUR = 6;
export function underworldTurn({ fleeingOrPursuing = false } = {}) {
  return { moves: fleeingOrPursuing ? 4 : 2, mapping: !fleeingOrPursuing };
}

/** Indoors, inches read as tens of feet. */
export function inchesToFeetUnderground(inches) { return inches * 10; }

/**
 * One turn in every hour must be spent motionless; after a flight or pursuit,
 * double the rest. turnsSinceRest counts active turns since the last rest.
 */
export function restDue({ turnsSinceRest = 0, fledOrPursuedSinceRest = false } = {}) {
  const restTurns = fledOrPursuedSinceRest ? 2 : 1;
  return { due: turnsSinceRest >= TURNS_PER_HOUR - 1, restTurns };
}

function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };
  ok(underworldTurn().moves === 2 && underworldTurn().mapping, "normal turn: 2 moves, mapping");
  ok(underworldTurn({ fleeingOrPursuing: true }).moves === 4 && !underworldTurn({ fleeingOrPursuing: true }).mapping, "flight: 4 moves, no mapping");
  ok(inchesToFeetUnderground(12) === 120, "12\" = 120 ft");
  ok(!restDue({ turnsSinceRest: 4 }).due && restDue({ turnsSinceRest: 5 }).due, "rest on the sixth turn");
  ok(restDue({ turnsSinceRest: 5, fledOrPursuedSinceRest: true }).restTurns === 2, "double rest after flight or pursuit");
  console.log(`exploration.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

/**
 * OD&D — Chainmail engine · token facing geometry
 * odd-chainmail · module/rules/facing.mjs
 * system 0.1.206 · slice: token-facing · stamp 0.1.206-token-facing.1
 *
 * Pure math: which side of the defender an attacker stands on. The man-to-man
 * rules care (left flank = 2nd-blow position on round 1; rear = strike with no
 * return and +1 per die; right flank = the sword-arm side, no penalty), and
 * this module is the single referee both man-to-man and (later) mass combat
 * share, so the two scales cannot drift apart.
 *
 * Conventions (Foundry): screen coords, +x right, +y DOWN. Token rotation is
 * degrees with 0 facing SOUTH (down-screen); PIXI-style rotation is clockwise
 * on screen, so rotation 90 = west, 180 = north, 270 = east. rotationTowards()
 * encodes exactly that mapping and is what the drag hook writes.
 *
 * Relative bearing θ: signed degrees in (-180, 180] from the defender's nose
 * to the attacker. θ = 0 dead ahead; θ > 0 the defender's RIGHT (sword arm);
 * θ < 0 the defender's LEFT (shield side). Sanity anchor: a defender facing
 * north with an attacker due west has θ = -90 (west is your left when you
 * face north).
 *
 * RULES-CALLS (Kurt, locked):
 *   ties      arc boundaries resolve in the DEFENDER's favor — exactly 45° is
 *             front, not flank; exactly 135° is flank, not rear. Position must
 *             be won, not disputed pixel-by-pixel.
 *   square    quadrants: front |θ| ≤ 45 · right flank 45 < θ ≤ 135 · left
 *             flank -135 ≤ θ < -45 · rear beyond. The eight neighboring
 *             squares bucket unambiguously under the tie rule.
 *   hex       six 60° sectors collapsed 2/2/2: front |θ| ≤ 60 · right flank
 *             60 < θ ≤ 120 · left flank -120 ≤ θ < -60 · rear beyond.
 */

/** Facing ids, matching combat-engine's Facing enum values. */
export const FACING_FRONT = "front";
export const FACING_LEFT = "leftFlank";
export const FACING_RIGHT = "rightFlank";
export const FACING_REAR = "rear";

/** Normalize degrees to (-180, 180]. */
export function normalizeDeg(d) {
  let x = ((Number(d) || 0) % 360 + 360) % 360; // [0, 360)
  if (x > 180) x -= 360;
  return x === -180 ? 180 : x;
}

/**
 * Foundry rotation (0 = south, screen-clockwise positive) that faces along the
 * screen vector (dx, dy). The drag hook feeds movement deltas through this.
 * Returns null for a zero vector (no direction to face).
 */
export function rotationTowards(dx, dy) {
  if (!dx && !dy) return null;
  const deg = Math.atan2(dy, dx) * 180 / Math.PI; // screen-atan2: south = +90
  return ((deg - 90) % 360 + 360) % 360;          // south -> rotation 0
}

/**
 * Signed bearing of the attacker off the defender's nose, in (-180, 180].
 * 0 dead ahead · positive = defender's right · negative = defender's left.
 *
 * @param {{x:number, y:number, rotation:number}} defender  center + rotation
 * @param {{x:number, y:number}} attacker                   center
 * @returns {number|null}  null when the two points coincide
 */
export function relativeBearing(defender, attacker) {
  const dx = attacker.x - defender.x;
  const dy = attacker.y - defender.y;
  if (!dx && !dy) return null;
  const toAttacker = Math.atan2(dy, dx) * 180 / Math.PI; // screen angle φ
  const nose = (Number(defender.rotation) || 0) + 90;    // rotation r -> screen angle
  return normalizeDeg(toAttacker - nose);
}

/** Square-grid quadrants, ties defender-favorable. */
export function bucketSquare(theta) {
  const t = normalizeDeg(theta);
  const a = Math.abs(t);
  if (a <= 45) return FACING_FRONT;
  if (a > 135) return FACING_REAR;
  return t > 0 ? FACING_RIGHT : FACING_LEFT;
}

/** Hex-grid 2/2/2 sectors, ties defender-favorable. */
export function bucketHex(theta) {
  const t = normalizeDeg(theta);
  const a = Math.abs(t);
  if (a <= 60) return FACING_FRONT;
  if (a > 120) return FACING_REAR;
  return t > 0 ? FACING_RIGHT : FACING_LEFT;
}

/**
 * Which side of the defender the attacker is on.
 *
 * @param {{x:number, y:number, rotation:number}} defender
 * @param {{x:number, y:number}} attacker
 * @param {{hex?:boolean}} [opts]
 * @returns {string|null}  a FACING_* id, or null when positions coincide
 */
export function facingOf(defender, attacker, { hex = false } = {}) {
  const theta = relativeBearing(defender, attacker);
  if (theta === null) return null;
  return hex ? bucketHex(theta) : bucketSquare(theta);
}

/* Self-tests — Node only. */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`facing.mjs FAIL: ${l}`); pass++; };

  // rotationTowards — the four cardinals under Foundry's 0-= -south convention.
  ok(rotationTowards(0, 1) === 0, "south -> rotation 0");
  ok(rotationTowards(-1, 0) === 90, "west -> rotation 90");
  ok(rotationTowards(0, -1) === 180, "north -> rotation 180");
  ok(rotationTowards(1, 0) === 270, "east -> rotation 270");
  ok(rotationTowards(0, 0) === null, "zero vector -> null");

  // relativeBearing — the sanity anchor and its mirror.
  const north = { x: 0, y: 0, rotation: 180 };
  ok(relativeBearing(north, { x: -10, y: 0 }) === -90, "facing north, west attacker = left (-90)");
  ok(relativeBearing(north, { x: 10, y: 0 }) === 90, "facing north, east attacker = right (+90)");
  ok(relativeBearing(north, { x: 0, y: -10 }) === 0, "facing north, north attacker = ahead");
  ok(relativeBearing(north, { x: 0, y: 10 }) === 180, "facing north, south attacker = dead rear");
  const south = { x: 0, y: 0, rotation: 0 };
  ok(relativeBearing(south, { x: -10, y: 0 }) === 90, "facing south, west attacker = right");
  ok(relativeBearing(south, { x: 0, y: 0 }) === null, "coincident points -> null");

  // bucketSquare — quadrants and defender-favorable ties.
  ok(bucketSquare(0) === FACING_FRONT && bucketSquare(-44.9) === FACING_FRONT, "square front band");
  ok(bucketSquare(45) === FACING_FRONT && bucketSquare(-45) === FACING_FRONT, "45deg tie -> front");
  ok(bucketSquare(46) === FACING_RIGHT && bucketSquare(-46) === FACING_LEFT, "past 45 -> flanks");
  ok(bucketSquare(135) === FACING_RIGHT && bucketSquare(-135) === FACING_LEFT, "135deg tie -> flank, not rear");
  ok(bucketSquare(136) === FACING_REAR && bucketSquare(180) === FACING_REAR, "beyond 135 -> rear");

  // The eight neighboring squares around a north-facing defender.
  const at = (x, y) => facingOf(north, { x, y });
  ok(at(0, -1) === FACING_FRONT, "N neighbor -> front");
  ok(at(1, -1) === FACING_FRONT && at(-1, -1) === FACING_FRONT, "NE/NW diagonals -> front (tie rule)");
  ok(at(1, 0) === FACING_RIGHT && at(-1, 0) === FACING_LEFT, "E/W neighbors -> flanks");
  ok(at(1, 1) === FACING_RIGHT && at(-1, 1) === FACING_LEFT, "SE/SW diagonals -> flanks (tie rule)");
  ok(at(0, 1) === FACING_REAR, "S neighbor -> rear");

  // bucketHex — 2/2/2 with the same tie policy.
  ok(bucketHex(60) === FACING_FRONT && bucketHex(-60) === FACING_FRONT, "hex 60deg tie -> front");
  ok(bucketHex(61) === FACING_RIGHT && bucketHex(-61) === FACING_LEFT, "hex past 60 -> flanks");
  ok(bucketHex(120) === FACING_RIGHT && bucketHex(-120) === FACING_LEFT, "hex 120deg tie -> flank");
  ok(bucketHex(121) === FACING_REAR, "hex beyond 120 -> rear");

  // normalizeDeg edge cases.
  ok(normalizeDeg(540) === 180 && normalizeDeg(-180) === 180, "normalize wraps to (-180, 180]");
  ok(normalizeDeg(-541) === 179, "large negative wraps");

  console.log(`facing.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

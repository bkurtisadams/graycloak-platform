/**
 * OD&D — Chainmail engine · engagement on a grid
 * odd-chainmail-rules · src/engagement.mjs
 *
 * Pure. Positions are cells of 3⅓' (a third of a 10' square), so 1" indoors
 * (10 feet) is 3 cells. Costs are counted in half-cells so diagonals stay
 * integral: an orthogonal step costs 2, a diagonal step 3 (1½ cells).
 *
 * Kurt's rulings (Sep 2026):
 *   - Every inch moved counts against the figure's move for the round,
 *     including closing to melee.
 *   - A figure is engaged only with an enemy it targets or that targets it.
 *   - Chainmail p.16 join rule: joining a melee already in progress is allowed
 *     only if the figure has moved no more than half its move that round.
 *   - Melee rounds are counted from first contact (one-way attacks included),
 *     so Chainmail's round-2 blow-order rules apply from the second round.
 */

export const CELLS_PER_INCH = 3;
export const ORTHO = 2;
export const DIAG = 3;

/** A figure's movement allowance for one round, in half-cells. */
export function moveBudget(moveInches) {
  return Math.max(0, Math.trunc(moveInches * CELLS_PER_INCH * 2));
}

/** Half-cells back to inches (one decimal). */
export function halfCellsToInches(h) {
  return Math.round((h / (CELLS_PER_INCH * 2)) * 10) / 10;
}

/** Chainmail p.16: may this figure still join a melee already in progress? */
export function canJoinMelee(movedHalfCells, moveInches) {
  return movedHalfCells * 2 <= moveBudget(moveInches);
}

const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

/**
 * Every cell reachable within `budget` half-cells. `blocked(x, y)` says a cell
 * can't be entered (wall, other figure). Diagonals may not cut a blocked corner.
 * Returns Map "x,y" -> { cost, prev }.
 */
export function reachable(start, budget, blocked) {
  const key = (x, y) => `${x},${y}`;
  const best = new Map([[key(start.x, start.y), { cost: 0, prev: null, x: start.x, y: start.y }]]);
  const open = [{ x: start.x, y: start.y, cost: 0 }];
  while (open.length) {
    open.sort((a, b) => a.cost - b.cost);
    const cur = open.shift();
    if (cur.cost > (best.get(key(cur.x, cur.y))?.cost ?? Infinity)) continue;
    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx, ny = cur.y + dy;
      if (blocked(nx, ny)) continue;
      const diag = dx !== 0 && dy !== 0;
      if (diag && (blocked(cur.x + dx, cur.y) || blocked(cur.x, cur.y + dy))) continue;
      const cost = cur.cost + (diag ? DIAG : ORTHO);
      if (cost > budget) continue;
      const k = key(nx, ny);
      if (cost < (best.get(k)?.cost ?? Infinity)) {
        best.set(k, { cost, prev: key(cur.x, cur.y), x: nx, y: ny });
        open.push({ x: nx, y: ny, cost });
      }
    }
  }
  return best;
}

/** Adjacent for melee: touching orthogonally or diagonally (man-sized figures). */
export function adjacent(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) === 1;
}

/** Nearest of the 8 compass directions (0 = east, clockwise, y down). */
export function dir8(dx, dy) {
  if (dx === 0 && dy === 0) return null;
  const a = Math.atan2(dy, dx);
  return ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
}

/**
 * Where the attacker stands relative to the defender's facing.
 * defFacing: dir8 index the defender faces. Returns an engine facing:
 * "front" (within 45°), "leftFlank" / "rightFlank" (90°), "rear" (135°+).
 * With y down and clockwise directions, the defender's left is facing - 2.
 */
export function attackFacing(defPos, defFacing, atkPos) {
  const d = dir8(atkPos.x - defPos.x, atkPos.y - defPos.y);
  if (d == null || defFacing == null) return "front";
  const diff = (((d - defFacing) % 8) + 8) % 8; // 0..7 clockwise from facing
  if (diff === 0 || diff === 1 || diff === 7) return "front";
  if (diff === 2) return "rightFlank";
  if (diff === 6) return "leftFlank";
  return "rear";
}

/** Order-free key for a pair of figures. */
export function pairKey(aId, bId) {
  return aId < bId ? `${aId}-${bId}` : `${bId}-${aId}`;
}

/**
 * Record that two figures are in contact this round and return which melee
 * round this is for them (1 on first contact). contacts: Map pairKey ->
 * { first, lastRound, rounds }. A gap of a round without contact starts over.
 */
export function recordContact(contacts, attackerId, defenderId, round) {
  const k = pairKey(attackerId, defenderId);
  const c = contacts.get(k);
  if (!c || c.lastRound < round - 1) {
    const fresh = { first: attackerId, lastRound: round, rounds: 1, prevFirst: null };
    contacts.set(k, fresh);
    return fresh;
  }
  if (c.lastRound !== round) { c.rounds++; c.lastRound = round; }
  return c;
}

/* ---------------------------------------------------------------- tests */
function runSelfTests() {
  let pass = 0;
  const ok = (cond, label) => { if (!cond) throw new Error(`FAIL: ${label}`); pass++; };

  ok(moveBudget(6) === 36 && moveBudget(9) === 54 && moveBudget(12) === 72, "budget: 6\" = 18 cells = 36 half-cells");
  ok(halfCellsToInches(18) === 3, "18 half-cells = 3\"");
  ok(canJoinMelee(18, 6) && !canJoinMelee(19, 6), "join: 6\" figure may join after 3\" moved, not more");
  ok(canJoinMelee(27, 9) && !canJoinMelee(28, 9), "join: 9\" figure half = 4.5\"");

  const open = () => false;
  const r = reachable({ x: 0, y: 0 }, 6, open);
  ok(r.get("3,0")?.cost === 6 && !r.has("4,0"), "3 orthogonal cells for 6 half-cells");
  ok(r.get("2,2")?.cost === 6 && !r.has("3,3"), "2 diagonals for 6 half-cells");
  const wall = (x, y) => x === 1 && y === 0;
  const w = reachable({ x: 0, y: 0 }, 10, wall);
  ok(!w.has("1,0"), "wall cell not entered");
  ok(w.get("1,1")?.cost === 4, "no corner-cutting past a wall: around costs 4");
  const corner = (x, y) => (x === 1 && y === 0) || (x === 0 && y === 1);
  ok(!reachable({ x: 0, y: 0 }, 10, corner).has("1,1"), "no diagonal between two blocked cells");

  ok(adjacent({ x: 0, y: 0 }, { x: 1, y: 1 }) && !adjacent({ x: 0, y: 0 }, { x: 2, y: 0 }), "adjacency");

  ok(dir8(1, 0) === 0 && dir8(0, 1) === 2 && dir8(-1, 0) === 4 && dir8(0, -1) === 6, "dir8 compass");
  const def = { x: 5, y: 5 };
  ok(attackFacing(def, 0, { x: 6, y: 5 }) === "front", "attacker ahead: front");
  ok(attackFacing(def, 0, { x: 6, y: 4 }) === "front", "ahead-left diagonal: front");
  ok(attackFacing(def, 0, { x: 5, y: 4 }) === "leftFlank", "facing east, attacker north: left flank");
  ok(attackFacing(def, 0, { x: 5, y: 6 }) === "rightFlank", "facing east, attacker south: right flank");
  ok(attackFacing(def, 0, { x: 4, y: 5 }) === "rear" && attackFacing(def, 0, { x: 4, y: 4 }) === "rear", "behind and behind-diagonal: rear");

  const contacts = new Map();
  ok(recordContact(contacts, 1, 2, 1).rounds === 1, "first contact is melee round 1");
  ok(recordContact(contacts, 2, 1, 2).rounds === 2, "next round, either direction, is round 2");
  ok(recordContact(contacts, 1, 2, 2).rounds === 2, "same round counted once");
  ok(recordContact(contacts, 1, 2, 4).rounds === 1, "a gap starts a new melee");
  ok(recordContact(contacts, 3, 4, 1).first === 3, "first contact records who closed");

  console.log(`engagement.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

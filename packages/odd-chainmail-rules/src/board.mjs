/**
 * OD&D — Chainmail engine · board geometry and figure status
 * odd-chainmail-rules · src/board.mjs
 *
 * Pure. A fight's board is a grid of cells (3 to the inch); state.walls[y][x]
 * is true for rock. Figures have x, y (top-left cell), size (cells a side,
 * default 1), facing (dir8) and status. Every function takes the fight state
 * or figures explicitly, so the server and the browser share one geometry.
 */

/** Statuses that take a figure out of the fight while it still lives. */
export const GONE = Object.freeze(["fled", "surrendered", "petrified", "swallowed", "gaseous", "withdrew"]);
export const CELLS_PER_INCH = 3;

export const alive = (f) => f.hp == null || f.hp > 0;
export const present = (f) => alive(f) && !GONE.includes(f.status);
export const active = (f) => present(f) && !["asleep", "held"].includes(f.status);
export const helpless = (f) => present(f) && ["asleep", "held", "paralyzed"].includes(f.status);

export const sz = (f) => f.size ?? 1;
export const covers = (f, x, y) => x >= f.x && x < f.x + sz(f) && y >= f.y && y < f.y + sz(f);
export const centre = (f) => ({ x: f.x + (sz(f) - 1) / 2, y: f.y + (sz(f) - 1) / 2 });

export function isWall(state, x, y) {
  return x < 0 || y < 0 || x >= state.width || y >= state.height || !!state.walls[y][x];
}
export function occupant(state, x, y, except) {
  return state.figures.find((f) => f !== except && f.placed && present(f) && covers(f, x, y));
}
/** Footprint adjacency: touching edge or corner, not overlapping. */
export function adjacent(a, b) {
  const dx = Math.max(b.x - (a.x + sz(a) - 1), a.x - (b.x + sz(b) - 1), 0);
  const dy = Math.max(b.y - (a.y + sz(a) - 1), a.y - (b.y + sz(b) - 1), 0);
  return Math.max(dx, dy) === 1;
}
/** Centre-to-centre distance in inches, to a tenth. */
export function distIn(a, b) {
  const ca = centre(a), cb = centre(b);
  return Math.round((Math.hypot(ca.x - cb.x, ca.y - cb.y) / CELLS_PER_INCH) * 10) / 10;
}
const AROUND = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
/** Every active figure in the group is boxed in by walls or figures on all eight sides. */
export function isTrapped(state, figs) {
  const up = figs.filter(active);
  return up.length > 0 && up.every((f) => AROUND.every(([dx, dy]) => isWall(state, f.x + dx, f.y + dy) || occupant(state, f.x + dx, f.y + dy)));
}

function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };
  const walls = Array.from({ length: 5 }, (_, y) => Array.from({ length: 5 }, (_, x) => x === 0 || y === 0 || x === 4 || y === 4));
  const a = { id: 1, x: 1, y: 1, placed: true, hp: 5 }, b = { id: 2, x: 2, y: 2, placed: true, hp: 5 }, big = { id: 3, x: 1, y: 2, size: 2, placed: true, hp: 0 };
  const st = { width: 5, height: 5, walls, figures: [a, b] };
  ok(isWall(st, 0, 2) && !isWall(st, 2, 2) && isWall(st, -1, 2) && isWall(st, 5, 1), "walls and edges");
  ok(occupant(st, 2, 2) === b && !occupant(st, 3, 3), "occupant");
  ok(adjacent(a, b) && !adjacent(a, { x: 3, y: 3 }), "adjacency by footprint");
  ok(distIn(a, { x: 4, y: 1 }) === 1, "3 cells = 1 inch");
  ok(centre(big).x === 1.5 && covers(big, 2, 3) && !alive(big), "large footprint; dead at 0");
  ok(present({ hp: 3 }) && !present({ hp: 3, status: "fled" }) && !active({ hp: 3, status: "held" }) && helpless({ hp: 3, status: "asleep" }), "status predicates");
  ok(isTrapped(st, [a]) === false, "open cells: not trapped");
  const tight = { width: 3, height: 3, walls: [[1, 1, 1], [1, 0, 1], [1, 1, 1]], figures: [] };
  ok(isTrapped(tight, [{ x: 1, y: 1, hp: 4 }]), "walled in: trapped");
  console.log(`board.mjs — all self-tests passed (${pass} assertions).`);
}
if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

/**
 * OD&D — exploring a dungeon level
 * odd-chainmail-rules · src/delve.mjs
 *
 * Pure. A party on a level's sheet of 10' squares (cells: # rock, . passage, r room, + door, s secret door,
 * o one-way door), the players' map of what it has seen, and the turn.
 *
 * Book III, The Move/Turn in the Underworld, with Men & Magic's encumbrance (Kurt, Nov 2026): a turn is two
 * moves at the party's slowest rate, inches read as tens of feet, so rate × 20 feet a turn (120 feet for the
 * 6" man in plate); flight or pursuit doubles it and nothing is mapped. The game maps for the players as they
 * walk (Kurt: auto-mapping). Light is not tracked in this pass; the party sees SIGHT_SQUARES straight ahead of it
 * down a passage (30 feet, a reading until light is in), and a door stops the eye.
 *
 * A reading, awaiting a ruling: Book III bases the number of wandering monsters on "a single creature, modified
 * by type" and doubles it for a party of 4-6. wanderingNumber() takes creatures of one hit die or less as the
 * "Orcs and the like" that come in groups (1d6), two or three hit dice as 1d3, bigger things alone, each
 * multiplied for every three adventurers.
 *
 * A meeting that comes to blows is fought on that part of the level (0.41.0): fightSetup() cuts the fight board's
 * window out of the level's sheet (three board cells to a 10' square), stands the party on its square with the
 * rest behind it down the way it came, and the monsters at the sighting distance along the passages, or across
 * their room. Doors stand open for the fight; an unfound secret door is wall.
 */

import { dir8 } from "./engagement.mjs";

export const WALK = new Set([".", "r"]);
export const DOOR = new Set(["+", "o"]);
export const SECRET = "s";
export const SQUARE_FEET = 10;
export const SIGHT_SQUARES = 3;
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const N8 = [...N4, [1, 1], [1, -1], [-1, 1], [-1, -1]];

export const key = (x, y) => `${x},${y}`;
export const cellAt = (L, x, y) => L.cells[y]?.[x] ?? "#";
export const roomAt = (L, x, y) => (L.rooms ?? []).find((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) ?? null;
export const stairsAt = (L, x, y) => (L.stairs ?? []).find((s) => s.x === x && s.y === y) ?? null;
export const trapAt = (L, x, y) => (L.traps ?? []).find((t) => t.x === x && t.y === y) ?? null;
export const entrance = (L) => (L.stairs ?? []).find((s) => s.dir === "up") ?? null;

/** Feet a party covers in a turn: two moves at its slowest member's rate; four in flight. */
export const partyRate = (moves) => Math.max(0, Math.min(...(moves.length ? moves : [12])));
export function turnFeet(rate, { flight = false } = {}) { return rate * 20 * (flight ? 2 : 1); }

/* ---------- the players' map: one string of 0/1 per row ---------- */
export const blankSeen = (L) => L.cells.map((row) => "0".repeat(row.length));
export const isSeen = (seen, x, y) => seen[y]?.[x] === "1";
function mark(rows, x, y) { if (rows[y] && x >= 0 && x < rows[y].length) rows[y][x] = "1"; }
/**
 * Standing on a square shows it, the open squares touching it, and SIGHT_SQUARES straight down each way open
 * from it (a door is seen and stops the eye); inside a room, the whole room and the doors in its walls. A secret
 * door shows only once found. Returns the new rows.
 */
export function reveal(L, seen, x, y, found = new Set()) {
  const rows = seen.map((s) => s.split(""));
  const shows = (xx, yy) => { const c = cellAt(L, xx, yy); return c !== "#" && (c !== SECRET || found.has(key(xx, yy))); };
  const around = (cx, cy) => { for (const [dx, dy] of N8) if (shows(cx + dx, cy + dy)) mark(rows, cx + dx, cy + dy); };
  if (shows(x, y)) mark(rows, x, y);
  around(x, y);
  for (const [dx, dy] of N4) for (let i = 1; i <= SIGHT_SQUARES; i++) {
    const xx = x + dx * i, yy = y + dy * i; if (!shows(xx, yy)) break;
    mark(rows, xx, yy); if (DOOR.has(cellAt(L, xx, yy)) || cellAt(L, xx, yy) === SECRET) break;
  }
  const room = cellAt(L, x, y) === "r" ? roomAt(L, x, y) : null;
  if (room) for (let yy = room.y; yy < room.y + room.h; yy++) for (let xx = room.x; xx < room.x + room.w; xx++) if (shows(xx, yy)) { mark(rows, xx, yy); around(xx, yy); }
  return rows.map((a) => a.join(""));
}
/** The level as the players know it: unseen squares blank, an unfound secret door rock. */
export function maskedCells(L, seen, found = new Set()) {
  return L.cells.map((row, y) => row.split("").map((c, x) => (!isSeen(seen, x, y) ? " " : c === SECRET && !found.has(key(x, y)) ? "#" : c)).join(""));
}

/* ---------- walking ---------- */
/** A square the party walks onto freely: seen floor, or a secret door it has found. Doors are forced, not walked. */
export function walkable(L, seen, found, x, y) {
  if (!isSeen(seen, x, y)) return false;
  const c = cellAt(L, x, y);
  return WALK.has(c) || (c === SECRET && found.has(key(x, y)));
}
function flood(L, seen, found, from, limit = Infinity) {
  const dist = new Map([[key(from.x, from.y), 0]]), prev = new Map(), q = [from];
  while (q.length) {
    const c = q.shift(), d = dist.get(key(c.x, c.y));
    if (d >= limit) continue;
    for (const [dx, dy] of N4) {
      const n = { x: c.x + dx, y: c.y + dy }, k = key(n.x, n.y);
      if (dist.has(k) || !walkable(L, seen, found, n.x, n.y)) continue;
      dist.set(k, d + 1); prev.set(k, c); q.push(n);
    }
  }
  return { dist, prev };
}
/** The squares from `from` to `to` over what the party knows (not counting `from`), or null. */
export function pathTo(L, seen, found, from, to) {
  const { dist, prev } = flood(L, seen, found, from);
  if (!dist.has(key(to.x, to.y))) return null;
  const out = [];
  for (let c = to; !(c.x === from.x && c.y === from.y); c = prev.get(key(c.x, c.y))) out.unshift({ x: c.x, y: c.y });
  return out;
}
/** Every square within `steps` squares' walk: [{x, y, steps}]. */
export function reach(L, seen, found, from, steps) {
  const { dist } = flood(L, seen, found, from, steps);
  return [...dist.entries()].filter(([, d]) => d > 0).map(([k, d]) => { const [x, y] = k.split(",").map(Number); return { x, y, steps: d }; });
}
/** The doors a party standing here can try: the door squares touching it. */
export function doorsBeside(L, x, y) {
  return N4.map(([dx, dy]) => ({ x: x + dx, y: y + dy })).filter((c) => DOOR.has(cellAt(L, c.x, c.y)));
}
/** The secret doors within reach of a search from this square (the 10' sections touching it). */
export function secretsBeside(L, x, y, found = new Set()) {
  return N8.map(([dx, dy]) => ({ x: x + dx, y: y + dy })).filter((c) => cellAt(L, c.x, c.y) === SECRET && !found.has(key(c.x, c.y)));
}
/** What lies past a door from where the party stands: the square beyond it and the room there, if any. */
export function beyondDoor(L, door, from) {
  const far = { x: door.x * 2 - from.x, y: door.y * 2 - from.y };
  return { far, room: roomAt(L, far.x, far.y) ?? roomAt(L, door.x, door.y) };
}
const compass = (dx, dy) => (dx > 0 ? "east" : dx < 0 ? "west" : dy > 0 ? "south" : "north");
export const sideOf = (from, to) => compass(to.x - from.x, to.y - from.y);

/* ---------- flight ---------- */
/**
 * Running back the way it came: the route is the party's trail reversed, as far as a flight turn carries it.
 * `breaks` lists what the pursuit must be diced past, in order: each corner turned and each door passed.
 */
export function flightRoute(L, trail, at, squares) {
  const back = [...trail].reverse().filter((c, i, a) => !(i === 0 && c.x === at.x && c.y === at.y)).slice(0, Math.max(0, squares));
  const breaks = []; let last = at, heading = null;
  for (const c of back) {
    const h = sideOf(last, c);
    if (heading && h !== heading) breaks.push("corner");
    if (DOOR.has(cellAt(L, c.x, c.y))) breaks.push("door");
    else if (cellAt(L, c.x, c.y) === SECRET) breaks.push("secret");
    heading = h; last = c;
  }
  return { route: back, end: back.at(-1) ?? at, breaks };
}

/* ---------- meetings ---------- */
/** How many come (a reading; see the head of this file): d is a die roller, d(sides). */
export function wanderingNumber({ hd = 1, partySize = 1 } = {}, d) {
  const base = hd <= 1 ? d(6) : hd <= 3 ? d(3) : 1;
  return base * Math.max(1, Math.ceil(partySize / 3));
}

/* ---------- a meeting that comes to blows ---------- */
export const FIGHT_W = 54, FIGHT_H = 30, CELLS_PER_SQUARE = 3; // the fight board: cells of 3 1/3 feet, 180 by 100 feet
/**
 * The fight board for a meeting: { ox, oy (the window's corner, in level squares), walls (rows of booleans, true a
 * wall), party: [{x, y, facing}], monsters: [{x, y, facing}], from (the monsters' square) }. `party` and `monsters`
 * list each figure's size in cells (1 for a man). A figure with no room left on the board is left out (null).
 */
export function fightSetup(L, { at, trail = [], feet = 60, room = null, found = new Set(), party = [1], monsters = [1] }) {
  const open = (x, y) => { const c = cellAt(L, x, y); return c !== "#" && (c !== SECRET || found.has(key(x, y))); };
  const floodFrom = (src) => { const d = new Map([[key(src.x, src.y), 0]]), q = [src]; while (q.length) { const c = q.shift(); for (const [dx, dy] of N4) { const n = { x: c.x + dx, y: c.y + dy }, k = key(n.x, n.y); if (!d.has(k) && open(n.x, n.y)) { d.set(k, d.get(key(c.x, c.y)) + 1); q.push(n); } } } return d; };
  const xy = (k) => { const [x, y] = k.split(",").map(Number); return { x, y }; };
  const fromParty = floodFrom(at), want = Math.max(1, Math.min(9, Math.round(feet / SQUARE_FEET)));
  const behind = new Set(trail.map((c) => key(c.x, c.y)));
  // where the monsters stand: across their room, or the sighting distance off down the passages, ahead rather than back the way the party came
  let cands = [...fromParty.entries()].filter(([, d]) => d > 0 && d <= 9).map(([k, d]) => ({ ...xy(k), d }));
  if (room) { const inRoom = cands.filter((c) => c.x >= room.x && c.x < room.x + room.w && c.y >= room.y && c.y < room.y + room.h); if (inRoom.length) cands = inRoom; }
  const score = (c) => Math.abs(c.d - want) * 10 + (behind.has(key(c.x, c.y)) ? 5 : 0) - Math.hypot(c.x - at.x, c.y - at.y) / 10;
  const from = cands.sort((a, b) => score(a) - score(b) || a.y - b.y || a.x - b.x)[0] ?? at;
  const W = FIGHT_W / CELLS_PER_SQUARE, H = FIGHT_H / CELLS_PER_SQUARE;
  const fit = (a, b, size) => Math.min(Math.max(Math.floor((a + b) / 2) - Math.floor(size / 2) + 1, Math.max(a, b) - size + 1), Math.min(a, b));
  const ox = fit(at.x, from.x, W), oy = fit(at.y, from.y, H);
  const walls = Array.from({ length: FIGHT_H }, (_, cy) => Array.from({ length: FIGHT_W }, (_, cx) => !open(ox + Math.floor(cx / CELLS_PER_SQUARE), oy + Math.floor(cy / CELLS_PER_SQUARE))));
  const taken = new Set(), inWin = (c) => c.x >= ox && c.x < ox + W && c.y >= oy && c.y < oy + H;
  const free = (cx, cy, size) => { for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) { const x = cx + i, y = cy + j; if (x < 0 || y < 0 || x >= FIGHT_W || y >= FIGHT_H || walls[y][x] || taken.has(key(x, y))) return false; } return true; };
  const CELL_ORDER = [[1, 1], [1, 0], [1, 2], [0, 1], [2, 1], [0, 0], [2, 0], [0, 2], [2, 2]];
  const stand = (sizes, squares, toward) => sizes.map((size) => {
    for (const sq of squares) for (const [i, j] of CELL_ORDER) {
      const cx = (sq.x - ox) * CELLS_PER_SQUARE + i, cy = (sq.y - oy) * CELLS_PER_SQUARE + j;
      if (!free(cx, cy, size)) continue;
      for (let b = 0; b < size; b++) for (let a = 0; a < size; a++) taken.add(key(cx + a, cy + b));
      return { x: cx, y: cy, facing: dir8(toward.x - sq.x, toward.y - sq.y) ?? 0 };
    }
    return null;
  });
  const fromMon = floodFrom(from);
  const order = (dist, avoid) => [...dist.entries()].map(([k, d]) => ({ ...xy(k), d })).filter(inWin).sort((a, b) => a.d - b.d || (avoid.get(key(b.x, b.y)) ?? 99) - (avoid.get(key(a.x, a.y)) ?? 99));
  // the party on its square, the overflow away from the monsters; the monsters on theirs, the overflow away from the party
  const partySquares = order(fromParty, fromMon).filter((c) => (fromMon.get(key(c.x, c.y)) ?? 99) >= Math.min(2, fromMon.get(key(at.x, at.y)) ?? 2) || (c.x === at.x && c.y === at.y));
  const P = stand(party, partySquares, from);
  const monSquares = order(fromMon, fromParty).filter((c) => (fromParty.get(key(c.x, c.y)) ?? 99) >= Math.min(2, fromParty.get(key(from.x, from.y)) ?? 2) || (c.x === from.x && c.y === from.y));
  const M = stand(monsters, monSquares, at);
  return { ox, oy, walls, party: P, monsters: M, from: { x: from.x, y: from.y } };
}

function runSelfTests() {
  const sqOf2 = (s, c) => ({ x: s.ox + Math.floor(c.x / 3), y: s.oy + Math.floor(c.y / 3) });
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };
  // a passage east from a room, a door, a room beyond; a secret door north of the passage
  const L = { cells: [
    "##########",
    "####s#####",
    "#rr...+rr#",
    "#rr###.rr#",
    "##########"], rooms: [{ id: "R1", x: 1, y: 2, w: 2, h: 2 }, { id: "R2", x: 7, y: 2, w: 2, h: 2 }], stairs: [{ x: 1, y: 2, dir: "up" }], traps: [{ x: 4, y: 2 }] };
  ok(turnFeet(6) === 120 && turnFeet(12) === 240 && turnFeet(9) === 180 && turnFeet(3) === 60, "rate x 20 feet a turn");
  ok(turnFeet(6, { flight: true }) === 240, "flight doubles the turn");
  ok(partyRate([12, 6, 9]) === 6 && partyRate([]) === 12, "the party moves at its slowest");
  ok(entrance(L).x === 1 && roomAt(L, 8, 3).id === "R2" && roomAt(L, 4, 2) === null && trapAt(L, 4, 2) && stairsAt(L, 1, 2).dir === "up", "squares know what is on them");
  let seen = reveal(L, blankSeen(L), 1, 2);
  ok(isSeen(seen, 2, 3) && isSeen(seen, 3, 2) && isSeen(seen, 4, 2) && !isSeen(seen, 5, 2), "a room shows whole, and 30 feet down the passage from where the party stands");
  ok(pathTo(L, seen, new Set(), { x: 1, y: 2 }, { x: 3, y: 2 }).length === 2 && pathTo(L, seen, new Set(), { x: 1, y: 2 }, { x: 5, y: 2 }) === null, "the party walks only what it has seen");
  seen = reveal(L, seen, 3, 2);
  ok(isSeen(seen, 6, 2) && !isSeen(seen, 7, 2), "a door is seen down the passage and stops the eye");
  seen = reveal(L, seen, 4, 2); seen = reveal(L, seen, 5, 2);
  ok(isSeen(seen, 6, 3) && !isSeen(seen, 7, 2), "beside a door, still nothing of what lies behind");
  ok(!isSeen(seen, 4, 1) && maskedCells(L, seen)[1][4] === " ", "an unfound secret door stays hidden");
  ok(pathTo(L, seen, new Set(), { x: 5, y: 2 }, { x: 6, y: 2 }) === null && doorsBeside(L, 5, 2).length === 1, "a door is forced, not walked through");
  ok(beyondDoor(L, { x: 6, y: 2 }, { x: 5, y: 2 }).room.id === "R2" && sideOf({ x: 5, y: 2 }, { x: 6, y: 2 }) === "east", "what lies past the door");
  ok(secretsBeside(L, 4, 2).length === 1 && secretsBeside(L, 4, 2, new Set(["4,1"])).length === 0, "a search covers the walls touching the square");
  const found = new Set(["4,1"]); seen = reveal(L, seen, 4, 2, found);
  ok(isSeen(seen, 4, 1) && walkable(L, seen, found, 4, 1) && maskedCells(L, seen, found)[1][4] === "s", "found, a secret door shows and opens");
  ok(reach(L, seen, found, { x: 1, y: 2 }, 3).some((c) => c.x === 4 && c.y === 2 && c.steps === 3) && !reach(L, seen, found, { x: 1, y: 2 }, 2).some((c) => c.x === 4), "reach counts squares walked");
  seen = reveal(L, seen, 6, 2);
  const trail = [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 }, { x: 6, y: 2 }, { x: 6, y: 3 }];
  const f = flightRoute(L, trail, { x: 6, y: 3 }, 4);
  ok(f.route.length === 4 && f.end.x === 3 && f.breaks.join() === "door,corner", "flight runs the trail back past a door and a corner");
  ok(flightRoute(L, [], { x: 6, y: 3 }, 4).route.length === 0, "no trail, nowhere to run");
  const d = (n) => n;
  ok(wanderingNumber({ hd: 1, partySize: 3 }, d) === 6 && wanderingNumber({ hd: 1, partySize: 4 }, d) === 12 && wanderingNumber({ hd: 3, partySize: 2 }, d) === 3 && wanderingNumber({ hd: 6, partySize: 6 }, d) === 2, "how many come");
  // a fight: the party of three at the passage's west end, goblins met 40 feet off down the passage
  const fs = fightSetup(L, { at: { x: 3, y: 2 }, trail: [{ x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }], feet: 40, party: [1, 1, 1], monsters: [1, 1, 1, 1] });
  ok(fs.walls.length === FIGHT_H && fs.walls[0].length === FIGHT_W, "the board is the fight's size");
  ok(fs.from.x === 7 && fs.from.y === 2, "the monsters stand the sighting distance down the passage, ahead of the party");
  const wallAt = (c) => fs.walls[c.y][c.x], sqOf = (c) => ({ x: fs.ox + Math.floor(c.x / 3), y: fs.oy + Math.floor(c.y / 3) });
  ok([...fs.party, ...fs.monsters].every((c) => c && !wallAt(c)), "everyone stands on floor");
  ok(new Set([...fs.party, ...fs.monsters].map((c) => key(c.x, c.y))).size === 7, "no two on one cell");
  ok(fs.party.every((c) => sqOf(c).x === 3 && sqOf(c).y === 2) && fs.monsters.every((c) => sqOf(c).x >= 7), "each side on its own square");
  ok(fs.party[0].facing === 0 && fs.monsters[0].facing === 4, "the sides face each other");
  ok(fs.walls[(2 - fs.oy) * 3][(6 - fs.ox) * 3] === false && fs.walls[(1 - fs.oy) * 3][(4 - fs.ox) * 3] === true, "a door stands open for the fight; an unfound secret door is wall");
  const big = fightSetup(L, { at: { x: 3, y: 2 }, trail: [{ x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }], feet: 20, party: Array(12).fill(1), monsters: [2] });
  ok(big.party.every(Boolean) && big.party.some((c) => sqOf2(big, c).x < 3) && big.monsters[0], "a big party spills back down the way it came; a large monster finds four free cells");
  const inRoom = fightSetup(L, { at: { x: 7, y: 2 }, feet: 20, room: L.rooms[1], party: [1], monsters: [1, 1] });
  ok(inRoom.monsters.every((c) => { const s = sqOf2(inRoom, c); return s.x >= 7 && s.x <= 8 && s.y >= 2 && s.y <= 3; }), "a room's keepers are met in their room");
  console.log(`delve.mjs: all self-tests passed (${pass})`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

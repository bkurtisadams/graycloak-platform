/**
 * OD&D — random dungeon levels: AD&D DMG Appendix A, simplified (Kurt, Nov 2026)
 * odd-chainmail-rules · src/dungeon-gen.mjs
 *
 * Pure and seeded: the same options and seed lay out the same level. A level is a sheet of 10'
 * squares begun with a room in the middle (DMG p.169). Passages are walked with Table I; doors,
 * side passages, turns, rooms and chambers, exits and stairs come from Tables II–VI.
 * Simplifications, so a level isn't a random mess:
 *  - passages are 10' wide and turn only at right angles (Table III.A dropped; 45° results and
 *    curves become 90° to the same side; Y becomes T, X becomes a four-way);
 *  - rooms and chambers are rectangles (Table V 18–20 rerolls; V.E 45° exits go straight);
 *  - nothing overlaps: rooms keep a ring of rock, a passage that meets a passage joins it, one that
 *    meets a room ends in a door, one that would run off the sheet turns or ends;
 *  - dead ends (Table I 18) are capped, wandering monsters (Table I 20) are left to Book III's
 *    turn check, and every Stairs result is a way down, capped per level;
 *  - Table I is checked every 30' on a straight run and 20' after anything else (the DMG's 60' and
 *    30' leave a level mostly passage), and no more than two side passages wait to be walked;
 *  - generation stops at a target number of rooms (36) and closes what is still open;
 *  - rooms are stocked by Book III p.7 (underworld.mjs), not Table V.F–J.
 * Room exits are doors and chamber exits open passages (Table V.C 19–20 reads that way).
 */
import { mulberry32 } from "./dice.mjs";
import { stockLevel } from "./underworld.mjs";

export const ROCK = "#", PASSAGE = ".", ROOM = "r", DOOR = "+", SECRET = "s", ONE_WAY = "o";
const OPEN = new Set([PASSAGE, ROOM, DOOR, SECRET, ONE_WAY]);
const DIRS = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
const left = ([dx, dy]) => [dy, -dx], right = ([dx, dy]) => [-dy, dx], back = ([dx, dy]) => [-dx, -dy];
const dirName = ([dx, dy]) => Object.keys(DIRS).find((k) => DIRS[k][0] === dx && DIRS[k][1] === dy);
const pick = (table, roll) => table.find((r) => roll >= r[0] && roll <= r[1]);

/** Table I, periodic check (d20). */
export const TABLE_I = Object.freeze([[1, 2, "straight"], [3, 5, "door"], [6, 10, "side"], [11, 13, "turn"], [14, 16, "chamber"], [17, 17, "stairs"], [18, 18, "deadEnd"], [19, 19, "trap"], [20, 20, "wandering"]]);
/** Table II, doors: where (d20) and what lies beyond (d20). */
export const DOOR_WHERE = Object.freeze([[1, 6, "left"], [7, 12, "right"], [13, 20, "ahead"]]);
export const DOOR_BEYOND = Object.freeze([[1, 4, "parallel"], [5, 8, "passage"], [9, 9, "passage45"], [10, 10, "passage45"], [11, 18, "room"], [19, 20, "chamber"]]);
/** Table III, side passages, folded to right angles. */
export const SIDE = Object.freeze([[1, 2, "left"], [3, 4, "right"], [5, 5, "left"], [6, 6, "right"], [7, 7, "left"], [8, 8, "right"], [9, 9, "left"], [10, 10, "right"], [11, 15, "T"], [16, 20, "cross"]]);
/** Table IV, turns, folded to right angles. */
export const TURN = Object.freeze([[1, 10, "left"], [11, 20, "right"]]);
/** Table V, chamber and room sizes in feet (18–20, unusual shapes, reroll). */
export const CHAMBER_SIZE = Object.freeze([[1, 4, [20, 20]], [5, 6, [30, 30]], [7, 8, [40, 40]], [9, 13, [20, 30]], [14, 15, [30, 50]], [16, 17, [40, 60]]]);
export const ROOM_SIZE = Object.freeze([[1, 2, [10, 10]], [3, 4, [20, 20]], [5, 6, [30, 30]], [7, 8, [40, 40]], [9, 10, [10, 20]], [11, 13, [20, 30]], [14, 15, [20, 40]], [16, 17, [30, 40]]]);
/** Table V.C, number of exits by area in square feet; "secret" marks the 0* rows. */
export function exitsFor(roll, area, rng) {
  if (roll <= 3) return { n: area <= 600 ? 1 : 2 };
  if (roll <= 6) return { n: area <= 600 ? 2 : 3 };
  if (roll <= 9) return { n: area <= 600 ? 3 : 4 };
  if (roll <= 12) return area <= 1200 ? { n: 0, secret: true } : { n: 1 };
  if (roll <= 15) return area <= 1600 ? { n: 0, secret: true } : { n: 1 };
  if (roll <= 18) return { n: 1 + Math.floor(rng() * 4) };
  return { n: 1, swap: true };
}
/** Table V.D, exit location relative to the way in. */
export const EXIT_WALL = Object.freeze([[1, 7, "opposite"], [8, 12, "left"], [13, 17, "right"], [18, 20, "same"]]);
/** Table VII, tricks and traps, as the referee's note for the square. */
export const TRAPS = Object.freeze(["Secret door (non-elf 3 in 20, elf 5 in 20, magic 18 in 20); if unlocated, a pit", "Secret door (non-elf 3 in 20, elf 5 in 20, magic 18 in 20); if unlocated, a pit", "Secret door (non-elf 3 in 20, elf 5 in 20, magic 18 in 20); if unlocated, a pit", "Secret door (non-elf 3 in 20, elf 5 in 20, magic 18 in 20); if unlocated, a pit", "Secret door (non-elf 3 in 20, elf 5 in 20, magic 18 in 20); if unlocated, a pit", "Pit, 10' deep, 3 in 6 to fall in", "Pit, 10' deep, 3 in 6 to fall in", "Pit, 10' deep with spikes, 3 in 6 to fall in", "20' × 20' elevator room: descends 1 level, won't ascend for 30 turns", "Elevator room: descends 2 levels", "Elevator room: descends 2–5 levels, won't ascend for 60 turns", "Wall 10' behind slides across the passage for 40–60 turns", "Oil and a flaming cinder on a random person: 2–12 hp (save vs magic for 1–3)", "Pit, 10' deep, 3 in 6 to fall in; walls crush in 2–5 rounds", "Arrow trap, 1–3 arrows, 1 in 20 poisoned", "Spear trap, 1–3 spears, 1 in 20 poisoned", "Gas covering 60' ahead (Table VII.A)", "Door falls outward 1–10 hp, or stone falls 2–20 hp (save vs petrification)", "Illusionary wall concealing a pit, a chute, or a chamber with monster and treasure", "Chute down 1 level, cannot be ascended"]);

export function generateLevel(opts = {}) {
  const { seed = 1, width = 80, height = 60, rooms: target = 36, deadEnds: maxDead = 3, stairsDown: maxStairs = 2, maxOpen = 2, straightRun = 30, afterRun = 20, dungeonLevel = 1, stock = true } = opts;
  const LONG = Math.max(1, Math.round(straightRun / 10)), SHORT = Math.max(1, Math.round(afterRun / 10));
  const rng = mulberry32(seed);
  const d = (n) => 1 + Math.floor(rng() * n);
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const g = Array.from({ length: height }, () => Array(width).fill(ROCK));
  const at = (x, y) => (x < 0 || y < 0 || x >= width || y >= height ? null : g[y][x]);
  const inside = (x, y) => x >= 1 && y >= 1 && x < width - 1 && y < height - 1;
  const rooms = [], doors = [], stairs = [], traps = [], queue = [];
  let deadEnds = 0, steps = 0;
  const roomAt = new Map();

  function fits(x0, y0, w, h, allow) {
    if (x0 < 1 || y0 < 1 || x0 + w > width - 1 || y0 + h > height - 1) return false;
    for (let y = y0 - 1; y <= y0 + h; y++) for (let x = x0 - 1; x <= x0 + w; x++) {
      if (allow && x === allow[0] && y === allow[1]) continue;
      if (at(x, y) !== ROCK) return false;
    }
    return true;
  }
  function sizeCells(kind, roll) {
    const [a, b] = pick(kind === "chamber" ? CHAMBER_SIZE : ROOM_SIZE, roll)[2];
    return [a / 10, b / 10];
  }
  function rollSize(kind) { let r; do r = d(20); while (r >= 18); return sizeCells(kind, r); }

  /** Lay a room or chamber beyond a doorway cell (dx,dy pointing in); smaller ones serve if it won't fit. */
  function placeRoom(kind, door, dir, first = null) {
    const sizes = [first ?? rollSize(kind)];
    for (const [, , s] of [...(kind === "chamber" ? CHAMBER_SIZE : ROOM_SIZE)].reverse()) sizes.push([s[0] / 10, s[1] / 10]);
    const [dx, dy] = dir, [px, py] = right(dir);
    for (const [a, b] of sizes) for (const [along, deep] of d(2) === 1 ? [[a, b], [b, a]] : [[b, a], [a, b]]) {
      const offsets = shuffle(Array.from({ length: along }, (_, i) => i));
      for (const o of offsets) {
        const nx = door[0] + dx, ny = door[1] + dy;
        const cx = [nx - px * o, nx - px * o + px * (along - 1) + dx * (deep - 1)];
        const cy = [ny - py * o, ny - py * o + py * (along - 1) + dy * (deep - 1)];
        const x0 = Math.min(...cx), y0 = Math.min(...cy), w = Math.abs(cx[1] - cx[0]) + 1, h = Math.abs(cy[1] - cy[0]) + 1;
        if (!fits(x0, y0, w, h, door)) continue;
        const room = { id: `R${rooms.length + 1}`, kind, x: x0, y: y0, w, h, area: w * h * 100, entry: dirName(dir) };
        for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { g[y][x] = ROOM; roomAt.set(`${x},${y}`, room.id); }
        rooms.push(room);
        return room;
      }
    }
    return null;
  }

  function wallCells(room, wallDir) {
    const [dx, dy] = wallDir, out = [];
    for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) {
      if (roomAt.get(`${x + dx},${y + dy}`) !== room.id) out.push([x + dx, y + dy]);
    }
    return out;
  }

  /** Table V.C–E: exits from a room or chamber entered heading `dir`. */
  function addExits(room, dir, { min = 0 } = {}) {
    let ex; do ex = exitsFor(d(20), room.area, rng); while (ex.n < min);
    room.exits = ex.n;
    if (ex.secret) room.secretCheck = true;
    const doorExit = ex.swap ? room.kind === "chamber" : room.kind === "room";
    for (let i = 0; i < ex.n; i++) {
      const where = pick(EXIT_WALL, d(20))[2];
      let wall = where === "opposite" ? dir : where === "left" ? left(dir) : where === "right" ? right(dir) : back(dir);
      for (let tries = 0; tries < 2; tries++) {
        const cands = wallCells(room, wall).filter(([x, y]) => inside(x, y) && at(x, y) === ROCK && !nearDoor(x, y));
        if (!cands.length) break;
        const [x, y] = cands[d(cands.length) - 1];
        const bx = x + wall[0], by = y + wall[1];
        if (OPEN.has(at(bx, by))) {
          const r = d(20);
          if (r <= 10) { setDoor(x, y, wall, r <= 5 ? SECRET : ONE_WAY, room.id); break; }
          wall = back(wall); continue;
        }
        if (doorExit) { setDoor(x, y, wall, DOOR, room.id); queue.push({ x: bx, y: by, dir: wall, from: [x, y] }); }
        else queue.push({ x, y, dir: wall, from: null, archway: room.id });
        break;
      }
    }
  }
  function nearDoor(x, y) {
    return Object.values(DIRS).some(([dx, dy]) => [DOOR, SECRET, ONE_WAY].includes(at(x + dx, y + dy)));
  }
  function setDoor(x, y, dir, kind, roomId) {
    g[y][x] = kind;
    doors.push({ x, y, dir: dirName(dir), kind: kind === SECRET ? "secret" : kind === ONE_WAY ? "one-way" : "door", room: roomId ?? null });
  }

  /** Neighbours other than the cell we came from: a passage met is joined, a room met ahead takes a door. */
  function probe(x, y, dir, prev) {
    if (!inside(x, y) || at(x, y) !== ROCK) return at(x, y) === null || !inside(x, y) ? "edge" : OPEN.has(at(x, y)) ? "join" : "edge";
    for (const [ax, ay] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      if (at(x + ax, y) === PASSAGE && at(x, y + ay) === PASSAGE && at(x + ax, y + ay) === PASSAGE) return "join";
    }
    let joinPassage = false;
    for (const nd of [dir, left(dir), right(dir)]) {
      const nx = x + nd[0], ny = y + nd[1];
      if (prev && nx === prev[0] && ny === prev[1]) continue;
      const c = at(nx, ny);
      if (c === ROOM) return nd === dir ? "roomAhead" : "blocked";
      if (c === DOOR || c === SECRET || c === ONE_WAY) return "blocked";
      if (c === PASSAGE) joinPassage = true;
    }
    return joinPassage ? "joinAfter" : "free";
  }

  function walk(end) {
    let { x, y, dir } = end, prev = end.from ?? [x - dir[0], y - dir[1]];
    let left60 = LONG;
    for (let guard = 0; guard < 400; guard++) {
      steps++;
      const p = probe(x, y, dir, prev);
      if (p === "join") return;
      if (p === "roomAhead") { setDoor(x, y, dir, DOOR, roomAt.get(`${x + dir[0]},${y + dir[1]}`)); return; }
      if (p === "edge" || p === "blocked") {
        if (end.carved) deadEnds++; else unDoor(end);
        return;
      }
      g[y][x] = PASSAGE; end.carved = true;
      if (p === "joinAfter") return;
      prev = [x, y];
      if (--left60 > 0) { x += dir[0]; y += dir[1]; continue; }
      let r, kind;
      for (;;) {
        r = d(20); kind = pick(TABLE_I, r)[2];
        if (kind === "wandering") continue;
        if (kind === "deadEnd" && deadEnds >= maxDead) continue;
        if (kind === "stairs" && stairs.filter((s) => s.dir === "down").length >= maxStairs) continue;
        if ((kind === "chamber") && rooms.length >= target) continue;
        if (kind === "side" && queue.length >= maxOpen) continue;
        break;
      }
      if (kind === "straight") { left60 = LONG; }
      else if (kind === "door") {
        const where = pick(DOOR_WHERE, d(20))[2];
        const side = where === "left" ? left(dir) : where === "right" ? right(dir) : dir;
        const dxy = [x + side[0], y + side[1]];
        const beyond = pick(DOOR_BEYOND, d(20))[2];
        if (inside(...dxy) && at(...dxy) === ROCK && probe(dxy[0], dxy[1], side, [x, y]) === "free") {
          if (rooms.length < target && (beyond === "room" || beyond === "chamber" || (beyond === "parallel" && where === "ahead"))) {
            const room = placeRoom(beyond === "chamber" ? "chamber" : "room", dxy, side, beyond === "parallel" ? [1, 1] : null);
            if (room) { setDoor(dxy[0], dxy[1], side, DOOR, room.id); addExits(room, side); }
          } else if (beyond !== "room" && beyond !== "chamber") {
            setDoor(dxy[0], dxy[1], side, DOOR, null);
            queue.push({ x: dxy[0] + side[0], y: dxy[1] + side[1], dir: side, from: dxy });
          }
        }
        if (where === "ahead") return;
        left60 = SHORT;
      } else if (kind === "side") {
        const s = pick(SIDE, d(20))[2];
        const branch = (bd) => queue.push({ x: x + bd[0], y: y + bd[1], dir: bd, from: [x, y] });
        if (s === "left") branch(left(dir)); else if (s === "right") branch(right(dir));
        else { branch(left(dir)); branch(right(dir)); if (s === "T") return; }
        left60 = SHORT;
      } else if (kind === "turn") {
        dir = pick(TURN, d(20))[2] === "left" ? left(dir) : right(dir);
        left60 = SHORT;
      } else if (kind === "chamber") {
        const room = placeRoom("chamber", [x, y], dir);
        if (room) { addExits(room, dir); return; }
        left60 = SHORT;
      } else if (kind === "stairs") { stairs.push({ x, y, dir: "down", levels: 1 }); return; }
      else if (kind === "deadEnd") { deadEnds++; return; }
      else if (kind === "trap") { const t = d(20); traps.push({ x, y, roll: t, text: TRAPS[t - 1] }); left60 = SHORT; }
      x += dir[0]; y += dir[1];
    }
  }

  function unDoor(end) {
    if (!end.from || at(...end.from) !== DOOR) return;
    const i = doors.findIndex((dr) => dr.x === end.from[0] && dr.y === end.from[1] && !dr.room);
    if (i >= 0) { doors.splice(i, 1); g[end.from[1]][end.from[0]] = ROCK; }
  }

  const north = DIRS.N;
  const start = (() => {
    for (let i = 0; i < 40; i++) {
      const [a, b] = rollSize("room");
      const w = Math.max(a, b) >= 2 ? Math.max(a, b) : 2, h = Math.max(2, Math.min(a, b));
      const x0 = Math.floor((width - w) / 2), y0 = Math.floor((height - h) / 2);
      if (!fits(x0, y0, w, h)) continue;
      const room = { id: "R1", kind: "room", x: x0, y: y0, w, h, area: w * h * 100, entry: "N", start: true };
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { g[y][x] = ROOM; roomAt.set(`${x},${y}`, room.id); }
      rooms.push(room);
      stairs.push({ x: x0 + Math.floor(w / 2), y: y0 + h - 1, dir: "up", levels: 1 });
      return room;
    }
    throw new Error("start room does not fit the sheet");
  })();
  addExits(start, north, { min: 2 });

  for (let regrow = 0; regrow < 200 && rooms.length < target; regrow++) {
    while (queue.length && rooms.length < target && steps < 20000) walk(queue.shift());
    if (rooms.length >= target) break;
    const before = queue.length;
    const r = rooms[d(rooms.length) - 1];
    addExits(r, DIRS[r.entry], { min: 1 });
    if (queue.length > before) continue;
    const cells = [];
    for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) if (at(x, y) === PASSAGE) cells.push([x, y]);
    for (let tries = 0; tries < 20 && cells.length; tries++) {
      const [x, y] = cells[d(cells.length) - 1];
      const dir = Object.values(DIRS)[d(4) - 1];
      if (probe(x + dir[0], y + dir[1], dir, [x, y]) === "free") { queue.push({ x: x + dir[0], y: y + dir[1], dir, from: [x, y] }); break; }
    }
  }
  for (const end of queue.splice(0)) closeOff(end);
  function closeOff(end) {
    let { x, y, dir } = end, prev = end.from ?? [x - dir[0], y - dir[1]];
    const path = [];
    for (let i = 0; i < 8; i++) {
      const p = probe(x, y, dir, prev);
      if (p === "join" || p === "joinAfter") { for (const [px, py] of path) g[py][px] = PASSAGE; if (p === "joinAfter") g[y][x] = PASSAGE; return; }
      if (p === "roomAhead") { for (const [px, py] of path) g[py][px] = PASSAGE; setDoor(x, y, dir, DOOR, roomAt.get(`${x + dir[0]},${y + dir[1]}`)); return; }
      if (p !== "free") break;
      path.push([x, y]); prev = [x, y]; x += dir[0]; y += dir[1];
    }
    if (end.from && [DOOR].includes(at(...end.from)) && !end.archway) {
      const i = doors.findIndex((dr) => dr.x === end.from[0] && dr.y === end.from[1]);
      if (i >= 0) { doors.splice(i, 1); g[end.from[1]][end.from[0]] = ROCK; }
    }
  }

  prune();
  function prune() {
    const keep = new Set([...stairs, ...traps].map((p) => `${p.x},${p.y}`));
    const openN = (x, y) => Object.values(DIRS).filter(([dx, dy]) => OPEN.has(at(x + dx, y + dy))).length;
    const tips = [];
    for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) if (at(x, y) === PASSAGE && openN(x, y) === 1 && !keep.has(`${x},${y}`)) tips.push([x, y]);
    for (const [x, y] of shuffle(tips).slice(0, maxDead)) keep.add(`${x},${y}`);
    for (let changed = true; changed;) {
      changed = false;
      for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
        const c = at(x, y);
        if (keep.has(`${x},${y}`) || !OPEN.has(c) || c === ROOM || openN(x, y) > 1) continue;
        if (c !== PASSAGE) { const i = doors.findIndex((dr) => dr.x === x && dr.y === y); if (i >= 0) doors.splice(i, 1); }
        g[y][x] = ROCK; changed = true;
      }
    }
    const tipsNow = [];
    for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) if (at(x, y) === PASSAGE && openN(x, y) === 1) tipsNow.push([x, y]);
    deadEnds = tipsNow.filter(([x, y]) => !stairs.some((s) => s.x === x && s.y === y) && !traps.some((t) => t.x === x && t.y === y)).length;
    if (!stairs.some((s) => s.dir === "down")) {
      const free = tipsNow.filter(([x, y]) => !stairs.some((s) => s.x === x && s.y === y));
      if (free.length) { const [x, y] = free[d(free.length) - 1]; stairs.push({ x, y, dir: "down", levels: 1 }); deadEnds--; }
      else { const r = rooms.length > 1 ? rooms[1 + d(rooms.length - 1) - 1] : rooms[0]; stairs.push({ x: r.x + Math.floor(r.w / 2), y: r.y + Math.floor(r.h / 2), dir: "down", levels: 1, inRoom: r.id }); }
    }
  }

  const level = {
    seed, width, height, dungeonLevel,
    cells: g.map((row) => row.join("")),
    rooms, doors, stairs, traps, deadEnds
  };
  if (stock) level.stock = stockLevel(rooms.map((r) => r.id), dungeonLevel, rng);
  return level;
}

function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };
  const open = (c) => c !== ROCK;
  for (const seed of [1, 2, 7, 42, 1974, 99991]) {
    const L = generateLevel({ seed });
    const again = generateLevel({ seed });
    ok(JSON.stringify(L) === JSON.stringify(again), `seed ${seed}: repeatable`);
    ok(L.rooms.length >= 30 && L.rooms.length <= 36, `seed ${seed}: ${L.rooms.length} rooms near the target`);
    ok(L.cells.length === 60 && L.cells.every((r) => r.length === 80), `seed ${seed}: sheet size`);
    ok(L.cells[0].replace(/#/g, "") === "" && L.cells[59].replace(/#/g, "") === "" && L.cells.every((r) => r[0] === "#" && r[79] === "#"), `seed ${seed}: border stays rock`);
    let wide = 0;
    for (let y = 0; y < 59; y++) for (let x = 0; x < 79; x++) {
      const q = [L.cells[y][x], L.cells[y][x + 1], L.cells[y + 1][x], L.cells[y + 1][x + 1]];
      if (q.every((c) => c === PASSAGE)) wide++;
    }
    ok(wide === 0, `seed ${seed}: passages stay 10' wide`);
    const seen = new Set([`${L.rooms[0].x},${L.rooms[0].y}`]), stack = [[L.rooms[0].x, L.rooms[0].y]];
    while (stack.length) {
      const [x, y] = stack.pop();
      for (const [dx, dy] of Object.values(DIRS)) {
        const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
        if (!seen.has(k) && open(L.cells[ny]?.[nx] ?? ROCK)) { seen.add(k); stack.push([nx, ny]); }
      }
    }
    let openCount = 0;
    for (const row of L.cells) for (const c of row) if (open(c)) openCount++;
    ok(seen.size === openCount, `seed ${seed}: every open square is reachable from the stairs`);
    for (const r of L.rooms) for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) {
      const insideRoom = x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
      const c = L.cells[y][x];
      if (insideRoom) ok(c === ROOM, `seed ${seed}: ${r.id} floor`);
      else ok(c !== ROOM && c !== PASSAGE || (c === PASSAGE && (x === r.x - 1 || x === r.x + r.w || y === r.y - 1 || y === r.y + r.h)), `seed ${seed}: ${r.id} ring`);
    }
    for (const r of L.rooms) for (const o of L.rooms) if (r !== o) ok(r.x + r.w < o.x || o.x + o.w < r.x || r.y + r.h < o.y || o.y + o.h < r.y, `seed ${seed}: rooms never touch`);
    const down = L.stairs.filter((s) => s.dir === "down").length;
    ok(down >= 1 && down <= 2 && L.stairs.some((s) => s.dir === "up"), `seed ${seed}: stairs up from the ruin, one or two down`);
    ok(L.deadEnds <= 3, `seed ${seed}: dead ends capped`);
    ok(Object.keys(L.stock).length === L.rooms.length, `seed ${seed}: every room stocked`);
    for (const dr of L.doors) ok([DOOR, SECRET, ONE_WAY].includes(L.cells[dr.y][dr.x]), `seed ${seed}: door marked on the sheet`);
  }
  ok(generateLevel({ seed: 5, rooms: 8 }).rooms.length <= 8, "a smaller target stops sooner");
  {
    let pc = 0, rc = 0;
    for (let seed = 200; seed < 220; seed++) for (const row of generateLevel({ seed }).cells) for (const c of row) { if (c === PASSAGE) pc++; if (c === ROOM) rc++; }
    ok(pc < rc * 1.6, `rooms hold their share of the level (${pc} passage, ${rc} room squares)`);
    const dmg = generateLevel({ seed: 200, straightRun: 60, afterRun: 30 });
    ok(dmg.rooms.length >= 30, "the DMG's own 60'/30' checks still work as options");
  }
  for (let seed = 100; seed < 160; seed++) {
    const L = generateLevel({ seed });
    ok(L.rooms.length >= 30 && L.stairs.some((s) => s.dir === "down"), `seed ${seed}: enough rooms and a way down`);
  }
  ok(JSON.stringify(generateLevel({ seed: 3 }).cells) !== JSON.stringify(generateLevel({ seed: 4 }).cells), "seeds differ");
  console.log(`dungeon-gen.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

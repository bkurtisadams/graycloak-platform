// odd/functions/test/dungeon-service.test.mjs — pass 16: Fosscraig's levels through oddWorld.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as rules from "../../../packages/odd-chainmail-rules/index.js";
import { createWorldService } from "../world-service.mjs";
import { dungeonPath } from "../dungeon-service.mjs";

function memoryStore() {
  const docs = new Map(), copy = (v) => structuredClone(v);
  return {
    docs,
    async run(fn) {
      const staged = new Map(); let wrote = false;
      const tx = {
        get: async (p) => { assert.equal(wrote, false, "Firestore: every read before any write"); return docs.has(p) ? copy(docs.get(p)) : null; },
        list: async () => [],
        set: (p, d) => { wrote = true; assert.equal(JSON.stringify(d).includes("undefined"), false); staged.set(p, copy(d)); }
      };
      const out = await fn(tx);
      for (const [p, d] of staged) docs.set(p, d);
      return out;
    }
  };
}
function game() {
  const store = memoryStore();
  store.docs.set("oddCampaigns/c1", { refereeUid: "kurt", referees: [], members: ["kurt", "bob"], people: {}, day: 1 });
  let k = 0;
  const world = createWorldService({ rules, store, now: () => 1000, rollDie: (n) => 1 + ((k++ * 7919) % n) });
  return { store, call: (uid, data) => world.handle({ uid, data: { cid: "c1", lid: "fosscraig-1", ...data } }) };
}
const firstFloor = (L, ch = ".") => { for (let y = 1; y < L.height - 1; y++) { const x = L.cells[y].indexOf(ch, 1); if (x > 0 && x < L.width - 1) return { x, y }; } return null; };

test("only the referee; nothing laid out at first; the map lists the level", async () => {
  const g = game();
  assert.equal((await g.call("bob", { op: "dungeon" })).code, "forbidden");
  const r = await g.call("kurt", { op: "dungeon" });
  assert.equal(r.ok, true); assert.equal(r.level, null); assert.equal(r.info.name, "Fosscraig \u00b7 Level 1");
  const m = await g.call("kurt", { op: "map" });
  assert.equal(m.dungeons["fosscraig-1"].status, null);
  assert.equal((await g.call("kurt", { op: "dungeon", lid: "nowhere" })).code, "bad-request");
});

test("laying out: the seed decides the sheet, Book III stocks it, a draft until opened", async () => {
  const g = game();
  const a = await g.call("kurt", { op: "dungeonMake", opts: { seed: 1 } });
  assert.equal(a.ok, true, a.error);
  const L = a.level;
  assert.equal(L.status, "draft"); assert.equal(L.rooms.length, 36); assert.equal(L.cells.length, 60); assert.equal(L.cells[0].length, 80);
  assert.equal(Object.keys(L.stock).length, 36); assert.equal(L.undo, undefined); assert.equal(L.undoable, 0);
  assert.deepEqual(L.cells, rules.dungeonGen.generateLevel({ seed: 1 }).cells, "same seed, same sheet");
  const bare = await g.call("kurt", { op: "dungeonMake", opts: { seed: 2, rooms: 12, stock: false } });
  assert.equal(bare.level.rooms.length, 12); assert.ok(Object.values(bare.level.stock).every((s) => !s.monster && !s.treasure));
  const m = await g.call("kurt", { op: "map" });
  assert.equal(m.dungeons["fosscraig-1"].status, "draft"); assert.equal(m.dungeons["fosscraig-1"].rooms, 12);
  const o = await g.call("kurt", { op: "dungeonOpen" });
  assert.equal(o.level.status, "open");
  assert.equal((await g.call("kurt", { op: "dungeonMake", opts: { seed: 3 } })).code, "bad-request", "an open level isn't laid out again");
  assert.equal((await g.call("kurt", { op: "dungeonRestock" })).code, "bad-request");
});

test("painting squares, a new room, stairs and traps; Undo puts it back", async () => {
  const g = game();
  const L = (await g.call("kurt", { op: "dungeonMake", opts: { seed: 1 } })).level;
  const p = firstFloor(L);
  const rock = await g.call("kurt", { op: "dungeonPaint", tool: "rock", cells: [p] });
  assert.equal(rock.level.cells[p.y][p.x], "#"); assert.equal(rock.level.undoable, 1);
  const door = await g.call("kurt", { op: "dungeonPaint", tool: "secret", cells: [p] });
  assert.equal(door.level.cells[p.y][p.x], "s");
  const back = await g.call("kurt", { op: "dungeonUndo" });
  assert.equal(back.level.cells[p.y][p.x], "#");
  await g.call("kurt", { op: "dungeonUndo" });
  assert.equal((await g.call("kurt", { op: "dungeon" })).level.cells[p.y][p.x], ".");
  assert.equal((await g.call("kurt", { op: "dungeonUndo" })).code, "bad-request");
  // a room on clear rock
  let spot = null;
  for (let y = 2; y < 55 && !spot; y++) for (let x = 2; x < 75 && !spot; x++) { let ok = true; for (let yy = y; yy < y + 3 && ok; yy++) for (let xx = x; xx < x + 3; xx++) if (L.cells[yy][xx] !== "#" || L.rooms.some((r) => xx >= r.x && xx < r.x + r.w && yy >= r.y && yy < r.y + r.h)) ok = false; if (ok) spot = { x, y }; }
  const nr = await g.call("kurt", { op: "dungeonPaint", tool: "room", rect: { ...spot, w: 3, h: 3 } });
  assert.equal(nr.ok, true, nr.error); assert.equal(nr.level.rooms.at(-1).id, "R37"); assert.equal(nr.level.cells[spot.y + 1][spot.x + 1], "r");
  assert.deepEqual(nr.level.stock.R37, { monster: null, treasure: null });
  assert.equal((await g.call("kurt", { op: "dungeonPaint", tool: "room", rect: { ...spot, w: 2, h: 2 } })).code, "bad-request", "no overlapping rooms");
  // painting the whole room over takes it out of the key
  const cells = []; for (let y = spot.y; y < spot.y + 3; y++) for (let x = spot.x; x < spot.x + 3; x++) cells.push({ x, y });
  const gone = await g.call("kurt", { op: "dungeonPaint", tool: "rock", cells });
  assert.equal(gone.level.rooms.some((r) => r.id === "R37"), false); assert.equal(gone.level.stock.R37, undefined);
  // stairs and traps toggle on floor, never on rock
  const s1 = await g.call("kurt", { op: "dungeonPaint", tool: "stairs", cells: [p] });
  assert.ok(s1.level.stairs.some((s) => s.x === p.x && s.y === p.y && s.dir === "down"));
  const s2 = await g.call("kurt", { op: "dungeonPaint", tool: "stairs", cells: [p] });
  assert.ok(!s2.level.stairs.some((s) => s.x === p.x && s.y === p.y));
  const t1 = await g.call("kurt", { op: "dungeonPaint", tool: "trap", cells: [p] });
  const trap = t1.level.traps.find((t) => t.x === p.x && t.y === p.y);
  assert.ok(trap && trap.roll >= 1 && trap.roll <= 20 && trap.text === rules.dungeonGen.TRAPS[trap.roll - 1]);
  const r1 = await g.call("kurt", { op: "dungeonPaint", tool: "rock", cells: [p] });
  assert.ok(!r1.level.traps.some((t) => t.x === p.x && t.y === p.y), "rock takes the trap away");
  assert.equal((await g.call("kurt", { op: "dungeonPaint", tool: "rock", cells: [{ x: 0, y: 0 }] })).code, "bad-request", "the border stays rock");
  assert.equal((await g.call("kurt", { op: "dungeonPaint", tool: "lava", cells: [p] })).code, "bad-request");
});

test("a room's card: reroll, pick from the Monster Level Tables, empty, a note; restock keeps notes", async () => {
  const g = game();
  await g.call("kurt", { op: "dungeonMake", opts: { seed: 1 } });
  const a = await g.call("kurt", { op: "dungeonRoom", room: "R5", act: "rerollMonster" });
  assert.ok(a.level.stock.R5.monster && a.level.stock.R5.monster.table >= 1 && a.level.stock.R5.monster.table <= 4, "level 1 rolls tables 1-4");
  const t = await g.call("kurt", { op: "dungeonRoom", room: "R5", act: "rerollTreasure" });
  assert.ok(t.level.stock.R5.treasure.sp > 0, "silver always");
  const ogres = await g.call("kurt", { op: "dungeonRoom", room: "R5", act: "pick", table: 4, row: 1 });
  assert.equal(ogres.level.stock.R5.monster.key, "ogre");
  const dr = await g.call("kurt", { op: "dungeonRoom", room: "R5", act: "pick", table: 6, row: 2, key: "dragon-red" });
  assert.equal(dr.level.stock.R5.monster.key, "dragon-red");
  assert.equal((await g.call("kurt", { op: "dungeonRoom", room: "R5", act: "pick", table: 6, row: 2, key: "ogre" })).code, "bad-request");
  assert.equal((await g.call("kurt", { op: "dungeonRoom", room: "R5", act: "pick", table: 9, row: 0 })).code, "bad-request");
  const e = await g.call("kurt", { op: "dungeonRoom", room: "R5", act: "empty" });
  assert.deepEqual(e.level.stock.R5, { monster: null, treasure: null });
  const n = await g.call("kurt", { op: "dungeonRoom", room: "R5", act: "note", text: "Ogres keep the gems in an iron pot." });
  assert.equal(n.level.notes.R5, "Ogres keep the gems in an iron pot.");
  const rs = await g.call("kurt", { op: "dungeonRestock" });
  assert.equal(Object.keys(rs.level.stock).length, 36); assert.equal(rs.level.notes.R5, "Ogres keep the gems in an iron pot.");
  assert.equal((await g.call("kurt", { op: "dungeonRoom", room: "R99", act: "empty" })).code, "bad-request");
  const doc = g.store.docs.get(dungeonPath("c1", "fosscraig-1"));
  assert.ok(doc.undo.length <= 10, "Undo keeps the last ten");
});

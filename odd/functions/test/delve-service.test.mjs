// odd/functions/test/delve-service.test.mjs — pass 18: exploring a dungeon level (oddWorld's delve ops).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as rules from "../../../packages/odd-chainmail-rules/index.js";
import { createCharacterService } from "../character-service.mjs";
import { createWorldService, worldPaths } from "../world-service.mjs";
import { dungeonPath } from "../dungeon-service.mjs";
import { delvePath } from "../delve-service.mjs";
import { createFightService, fightPaths } from "../fight-service.mjs";

function memoryStore() {
  const docs = new Map(), copy = (v) => structuredClone(v);
  return {
    docs,
    async run(fn) {
      const staged = new Map(); let wrote = false;
      const tx = {
        get: async (p) => { assert.equal(wrote, false, "Firestore: every read before any write"); return docs.has(p) ? copy(docs.get(p)) : null; },
        list: async (path) => { assert.equal(wrote, false, "Firestore: every read before any write"); return [...docs.entries()].filter(([k]) => k.startsWith(`${path}/`) && !k.slice(path.length + 1).includes("/")).map(([, v]) => copy(v)); },
        set: (p, d) => { wrote = true; assert.equal(JSON.stringify(d).includes("undefined"), false); staged.set(p, copy(d)); }
      };
      const out = await fn(tx);
      for (const [p, d] of staged) docs.set(p, d);
      return out;
    }
  };
}
// stairs up in R1; a passage east to a door into R2 (goblins); a side passage south with a trap; a secret door north of the passage
const LEVEL = () => ({ id: "fosscraig-1", name: "Fosscraig · Level 1", place: "Fosscraig", level: 1, status: "open", width: 12, height: 6, cells: [
  "############",
  "#rr..s..+rr#".replace("s", "."),
  "#rr#.####rr#",
  "####.#######",
  "####.#######",
  "############"], rooms: [{ id: "R1", kind: "room", x: 1, y: 1, w: 2, h: 2, area: 400, start: true }, { id: "R2", kind: "room", x: 9, y: 1, w: 2, h: 2, area: 400 }],
  stairs: [{ x: 1, y: 1, dir: "up" }], traps: [{ x: 4, y: 3, roll: 8, text: "Pit, 10' deep" }],
  stock: { R1: { monster: null, treasure: null }, R2: { monster: { table: 1, name: "Goblins", key: "goblin" }, treasure: null } }, notes: {}, nextRoom: 3, undo: [] });

async function game({ level = LEVEL() } = {}) {
  const store = memoryStore();
  store.docs.set("oddCampaigns/c1", { refereeUid: "kurt", referees: [], members: ["kurt", "bob", "ann"], people: { kurt: { name: "Kurt" }, bob: { name: "Bob" }, ann: { name: "Ann" } }, day: 1 });
  let n = 0, dice = [], i = 0;
  const rollDie = (sides) => { const v = dice[i++]; return v == null ? Math.min(3, sides) : Math.min(v, sides); };
  const roster = createCharacterService({ rules, store, now: () => 1000 + n, rollDie: () => 4, newId: () => `ch${++n}` });
  const fights = createFightService({ rules, store, now: () => 2000, newSeed: () => 7 });
  const world = createWorldService({ rules, store, now: () => 2000, rollDie, fights });
  const rcall = (uid, data) => roster.handle({ uid, data: { cid: "c1", ...data } });
  const call = (uid, data) => world.handle({ uid, data: { cid: "c1", lid: "fosscraig-1", ...data } });
  const setDice = (...v) => { dice = v; i = 0; };
  const p = worldPaths("c1"), at = rules.westmark.PLACES.Fosscraig;
  const make = async (uid, name, extra = {}) => {
    const id = (await rcall(uid, { op: "roll" })).character.id;
    await rcall(uid, { op: "basics", id, name }); await rcall(uid, { op: "buy", id, key: "sword" });
    const f = await rcall(uid, { op: "finish", id }); assert.equal(f.ok, true, f.error);
    store.docs.set(p.character(id), { ...store.docs.get(p.character(id)), hex: { q: at.q, r: at.r }, where: "Fosscraig", doing: "road", ...extra });
    return id;
  };
  if (level) store.docs.set(dungeonPath("c1", "fosscraig-1"), level);
  const ch = (id) => store.docs.get(p.character(id));
  return { store, call, setDice, make, ch, p, fights };
}
const down = async (g, ...ids) => { if (ids.length > 1) await g.call("kurt", { op: "party", lid: undefined, ids }); const r = await g.call("kurt", { op: "delveEnter", id: ids[0] }); assert.equal(r.ok, true, r.error); return r; };

test("going down: only an open level, only from the ruin, and the party leaves the kingdom map", async () => {
  const g = await game({ level: { ...LEVEL(), status: "draft" } });
  const brom = await g.make("bob", "Brom");
  assert.equal((await g.call("bob", { op: "delveEnter", id: brom })).code, "not-found");
  g.store.docs.set(dungeonPath("c1", "fosscraig-1"), LEVEL());
  const away = await g.make("ann", "Wyn", { hex: { q: 0, r: 0 }, where: "Langstead", doing: "town" });
  assert.match((await g.call("ann", { op: "delveEnter", id: away })).error, /stairs are at Fosscraig/);
  assert.equal((await g.call("ann", { op: "delveEnter", id: brom })).code, "forbidden");
  const r = await g.call("bob", { op: "delveEnter", id: brom });
  assert.equal(r.ok, true, r.error);
  assert.deepEqual(r.delve.parties[0].at, { x: 1, y: 1 }); assert.equal(r.delve.parties[0].feet, 240); assert.equal(r.delve.parties[0].stairs, "up");
  assert.equal(g.ch(brom).doing, "dungeon"); assert.equal(g.ch(brom).where, "Fosscraig · Level 1");
  const map = await g.call("bob", { op: "map" });
  assert.equal(map.parties.some((pt) => pt.members.some((m) => m.id === brom)), false, "off the kingdom map");
  assert.equal(map.dungeons["fosscraig-1"].status, "open");
  assert.match((await g.call("bob", { op: "move", id: brom, dir: "E" })).error, /underground/);
});

test("the players' map: what the party has seen, and nothing to a player with no one below", async () => {
  const g = await game(); const brom = await g.make("bob", "Brom"); await down(g, brom);
  const v = (await g.call("bob", { op: "delve" })).delve;
  assert.equal(v.cells[1].slice(0, 4), " rr."); assert.equal(v.cells[1][5], " "); assert.equal(v.full, false); assert.equal(v.seen, undefined);
  assert.equal((await g.call("ann", { op: "delve" })).delve.cells, null);
  const ref = (await g.call("kurt", { op: "delve" })).delve;
  assert.equal(ref.cells[1], "#rr.....+rr#"); assert.equal(ref.seen[1][1], "1");
});

test("walking: over known squares, within the turn's feet, the leader's player only", async () => {
  const g = await game(); const brom = await g.make("bob", "Brom"), wyn = await g.make("ann", "Wyn"); await down(g, brom, wyn);
  assert.equal((await g.call("ann", { op: "delveMove", id: wyn, to: { x: 3, y: 1 } })).code, "forbidden");
  assert.match((await g.call("bob", { op: "delveMove", id: brom, to: { x: 6, y: 1 } })).error, /can't walk there/);
  const a = await g.call("bob", { op: "delveMove", id: brom, to: { x: 3, y: 1 } });
  assert.equal(a.ok, true, a.error); assert.equal(a.moved, 20); assert.deepEqual(a.delve.parties[0].at, { x: 3, y: 1 }); assert.equal(a.delve.parties[0].left, 220);
  assert.equal(g.ch(wyn).under.x, 3, "the whole party moves");
  assert.equal(a.delve.cells[1][4], ".", "the next square shows");
  assert.match((await g.call("bob", { op: "delveMove", id: brom, to: { x: 8, y: 1 } })).error, /can't walk there/, "a door is not walked through");
  // a party in plate: 6" = 120 feet a turn
  const slow = await game(); const leal = await slow.make("bob", "Leal");
  slow.store.docs.set(slow.p.character(leal), { ...slow.ch(leal), items: [...slow.ch(leal).items, { key: "plate", name: "Plate Mail", weight: 750, qty: 1 }, { key: "load", name: "Load", weight: 400, qty: 1 }] });
  const d = await down(slow, leal);
  assert.ok(d.delve.parties[0].feet <= 240 && d.delve.parties[0].feet === d.delve.parties[0].rate * 20, "rate x 20 feet");
});

test("the turn: it ends on a wandering check, and the sixth turn is rest", async () => {
  const g = await game(); const brom = await g.make("bob", "Brom"); await down(g, brom);
  for (let t = 1; t <= 5; t++) { g.setDice(3); const e = await g.call("bob", { op: "delveEnd", id: brom }); assert.equal(e.ok, true, e.error); assert.equal(e.wandering, false); assert.equal(e.delve.parties[0].turn, t + 1); }
  const v = (await g.call("kurt", { op: "delve" })).delve.parties[0];
  assert.equal(v.restDue, true); assert.equal(v.checks.length, 5);
  assert.match((await g.call("bob", { op: "delveMove", id: brom, to: { x: 3, y: 1 } })).error, /must rest/);
  g.setDice(3); const r = await g.call("bob", { op: "delveRest", id: brom });
  assert.equal(r.delve.parties[0].restDue, false); assert.equal(r.delve.parties[0].sinceRest, 0);
  await g.call("bob", { op: "delveMove", id: brom, to: { x: 3, y: 1 } });
  assert.match((await g.call("bob", { op: "delveRest", id: brom })).error, /whole turn/);
});

test("a 6 at the turn's end brings wandering monsters; the party answers before anything else", async () => {
  const g = await game(); const brom = await g.make("bob", "Brom"); await down(g, brom);
  g.setDice(6, 1, 1, 4, 5, 5); // the check; rng for the table; ...
  const e = await g.call("bob", { op: "delveEnd", id: brom });
  assert.equal(e.wandering, true);
  const m = e.delve.parties[0].meeting;
  assert.equal(m.type, "wandering"); assert.ok(m.kind && m.number >= 1 && m.feet >= 10);
  assert.match((await g.call("bob", { op: "delveMove", id: brom, to: { x: 3, y: 1 } })).error, /answered first/);
  assert.equal((await g.call("bob", { op: "delveAdjust", id: brom, number: 2 })).code, "forbidden");
  assert.equal((await g.call("kurt", { op: "delveAdjust", id: brom, number: 2 })).delve.parties[0].meeting.number, 2);
  const s = await g.call("bob", { op: "delveStand", id: brom });
  assert.equal(s.delve.parties[0].meeting.choice, "stand");
  assert.ok(s.fid, "the game opens the fight itself");
  const done = await g.call("kurt", { op: "delveResolve", id: brom });
  assert.equal(done.delve.parties[0].meeting, null);
  assert.equal((await g.call("bob", { op: "delveMove", id: brom, to: { x: 3, y: 1 } })).ok, true);
});

test("a door: listen once a turn, force it on a 1 or 2, and the room's monsters meet the party", async () => {
  const g = await game(); const brom = await g.make("bob", "Brom"); await down(g, brom);
  await g.call("bob", { op: "delveMove", id: brom, to: { x: 4, y: 1 } }); await g.call("bob", { op: "delveMove", id: brom, to: { x: 7, y: 1 } });
  const v = (await g.call("bob", { op: "delve" })).delve.parties[0];
  assert.deepEqual(v.doors.map((d) => [d.x, d.y, d.side]), [[8, 1, "east"]]);
  g.setDice(1); const l = await g.call("bob", { op: "delveDoor", id: brom, at: { x: 8, y: 1 }, act: "listen" });
  assert.equal(l.heard, true); assert.match(l.text, /Brom hears something/);
  assert.match((await g.call("bob", { op: "delveDoor", id: brom, at: { x: 8, y: 1 }, act: "listen" })).error, /listened/);
  // v1.564.00: listening and each try at the door are a quarter turn, opened or not
  const q = v.quarter; assert.equal(q, v.feet / 4); assert.equal(l.delve.parties[0].spent, v.spent + q);
  g.setDice(3); const no = await g.call("bob", { op: "delveDoor", id: brom, at: { x: 8, y: 1 }, act: "force" });
  assert.equal(no.open, false); assert.deepEqual(no.delve.parties[0].at, { x: 7, y: 1 }); assert.equal(no.delve.parties[0].spent, v.spent + 2 * q, "a failed try costs its quarter turn");
  if (no.delve.parties[0].left < q) {
    assert.match((await g.call("bob", { op: "delveDoor", id: brom, at: { x: 8, y: 1 }, act: "force" })).error, /quarter turn/, "no trying on with the turn used up");
    g.setDice(1); assert.equal((await g.call("bob", { op: "delveEnd", id: brom })).ok, true);
  }
  g.setDice(2); const yes = await g.call("bob", { op: "delveDoor", id: brom, at: { x: 8, y: 1 }, act: "force" });
  assert.equal(yes.open, true); assert.deepEqual(yes.delve.parties[0].at, { x: 8, y: 1 }); assert.equal(yes.delve.parties[0].onDoor, true);
  assert.equal(yes.delve.cells[1][9], "r");
  assert.equal(yes.delve.parties[0].left, 0, "the walk, the listening and two tries have used the turn");
  g.setDice(1); assert.equal((await g.call("bob", { op: "delveEnd", id: brom })).ok, true);
  g.setDice(4, 4, 1); const into = await g.call("bob", { op: "delveMove", id: brom, to: { x: 10, y: 2 } });
  assert.equal(into.ok, true, into.error);
  const m = into.delve.parties[0].meeting;
  assert.deepEqual(into.delve.parties[0].at, { x: 9, y: 1 }, "the walk stops at the room's edge");
  assert.equal(m.type, "room"); assert.equal(m.kind, "Goblins"); assert.equal(m.room, "R2"); assert.ok(m.feet <= 20);
  assert.equal(m.surprise, null, "the failed try warned them: a 1 on their die surprises nobody");
  // the referee settles it as dealt with: the room is clear from then on
  await g.call("kurt", { op: "delveResolve", id: brom, cleared: true });
  const on = await g.call("bob", { op: "delveMove", id: brom, to: { x: 10, y: 2 } });
  assert.equal(on.delve.parties[0].meeting, null); assert.deepEqual(on.delve.parties[0].at, { x: 10, y: 2 });
  assert.equal(g.store.docs.get(delvePath("c1", "fosscraig-1")).cleared.R2, true);
});

test("standing opens the fight on the level, the game runs the monsters, and a player settles it when it is over", async () => {
  const g = await game(); const brom = await g.make("bob", "Brom"), ann = await g.make("ann", "Ansel"); await down(g, brom, ann);
  await g.call("bob", { op: "delveMove", id: brom, to: { x: 4, y: 1 } }); await g.call("bob", { op: "delveMove", id: brom, to: { x: 7, y: 1 } });
  g.setDice(2); await g.call("bob", { op: "delveDoor", id: brom, at: { x: 8, y: 1 }, act: "force" });
  g.setDice(4, 4, 4); await g.call("bob", { op: "delveMove", id: brom, to: { x: 10, y: 2 } });
  const s = await g.call("bob", { op: "delveStand", id: brom });
  assert.equal(s.ok, true, s.error); assert.ok(s.fid);
  assert.equal(g.store.docs.get("oddCampaigns/c1").live.fid, s.fid, "every page is pulled into it");
  const p = fightPaths("c1", s.fid), h = g.store.docs.get(p.fight);
  assert.equal(h.auto, true); assert.deepEqual(h.delve, { lid: "fosscraig-1", room: "R2" }); assert.deepEqual(h.players, ["ann", "bob"]);
  const st = rules.fightStore.fromStored(g.store.docs.get(p.state));
  const pcs = st.figures.filter((f) => f.side === "A"), mons = st.figures.filter((f) => f.side === "B");
  assert.equal(pcs.length, 2); assert.ok(mons.length >= 1 && mons.every((m) => m.monsterKey === "goblin" && m.placed && m.hp >= 1));
  assert.ok(st.figures.every((f) => f.placed && !st.walls[f.y][f.x]), "everyone on the level's floor");
  assert.ok(st.walls.some((r) => r.some(Boolean)), "the level's walls are the fight's");
  assert.ok(mons.every((m) => st.control[m.id] === "game") && st.control[pcs[0].id] === "bob" && st.control[pcs[1].id] === "ann");
  const act = (uid, action) => g.fights.act({ uid, data: { cid: "c1", fid: s.fid, rev: g.store.docs.get(p.fight).rev, rules: rules.fightStore.RULES_VERSION, action } });
  assert.match((await act("bob", { type: "settle" })).error, /isn't over/);
  const raw = g.store.docs.get(p.state); g.store.docs.set(p.state, { ...raw, phase: "over", winner: "A", figures: raw.figures.map((f) => (f.side === "B" ? { ...f, hp: 0 } : f)) });
  const out = await act("bob", { type: "settle" });
  assert.equal(out.ok, true, out.error);
  assert.equal(g.store.docs.get("oddCampaigns/c1").live, null, "the fight closes itself");
  assert.equal(g.ch(brom).encounter ?? null, null); assert.deepEqual(g.ch(brom).roomSettled, { lid: "fosscraig-1", room: "R2" });
  const on = await g.call("bob", { op: "delveMove", id: brom, to: { x: 10, y: 2 } });
  assert.equal(on.ok, true, on.error); assert.equal(on.delve.parties[0].meeting, null);
});

test("a meeting stood before the game opened fights itself can be stood again, and a monster without statistics says why", async () => {
  const g = await game(); const brom = await g.make("bob", "Brom"); await down(g, brom);
  g.setDice(6, 1, 1, 4, 5, 5); await g.call("bob", { op: "delveEnd", id: brom });
  const path = g.p.character(brom), old = g.store.docs.get(path);
  g.store.docs.set(path, { ...old, encounter: { ...old.encounter, kind: "Lizards", monsterKey: "lizard-giant", number: 1, choice: "stand", outcome: "stand" } });
  const s = await g.call("bob", { op: "delveStand", id: brom });
  assert.equal(s.ok, true, s.error); assert.ok(s.fid, s.text);
  const st = rules.fightStore.fromStored(g.store.docs.get(fightPaths("c1", s.fid).state));
  assert.deepEqual(st.figures.filter((f) => f.side === "B").map((f) => [f.monsterKey, f.placed]), [["lizard-giant", true]]);
  assert.match((await g.call("bob", { op: "delveStand", id: brom })).error, /already/);
  const h = await game(); const b2 = await h.make("bob", "Brom"); await down(h, b2);
  h.setDice(6, 1, 1, 4, 5, 5); await h.call("bob", { op: "delveEnd", id: b2 });
  // a meeting whose row names several kinds but carries no pick (older data) is diced for when it comes to blows
  const k = await game(); const b3 = await k.make("bob", "Brom"); await down(k, b3);
  k.setDice(6, 1, 1, 4, 5, 5); await k.call("bob", { op: "delveEnd", id: b3 });
  const p3 = k.p.character(b3); k.store.docs.set(p3, { ...k.store.docs.get(p3), encounter: { ...k.store.docs.get(p3).encounter, kind: "Lizards", monsterKey: null, number: 1, choice: "stand" } });
  k.setDice(2); const lz = await k.call("bob", { op: "delveStand", id: b3 });
  assert.ok(lz.fid, lz.text);
  assert.match(rules.fightStore.fromStored(k.store.docs.get(fightPaths("c1", lz.fid).state)).figures.find((f) => f.side === "B").monsterKey, /^lizard-(giant|subterranean)$/);
  const p2 = h.p.character(b2); h.store.docs.set(p2, { ...h.store.docs.get(p2), encounter: { ...h.store.docs.get(p2).encounter, kind: "Thouls", monsterKey: null } });
  const t = await h.call("bob", { op: "delveStand", id: b2 });
  assert.equal(t.fid, null); assert.match(t.text, /Thouls have no fighting statistics yet/);
  // v1.563.00: stood again with nothing changed, the chat isn't told again; one man stands, he doesn't "stand"
  assert.equal((await h.call("bob", { op: "delveStand", id: b2 })).fid, null);
  const said = [...h.store.docs.entries()].filter(([k2]) => k2.startsWith("oddCampaigns/c1/chat/referee/")).map(([, v]) => v).filter((e) => /to meet the Thouls/.test(e.text));
  assert.equal(said.length, 1, said.map((e) => e.text).join(" | ")); assert.match(said[0].text, /^\S+ stands to meet/); assert.equal(said[0].kind, "meeting");
});

test("a hail: hostile is a fight, friendly lets the party be, between leaves run or stand", async () => {
  for (const [dice, outcome] of [[[1, 1], "attacked"], [[6, 6], "friendly"], [[3, 4], "wary"]]) {
    const g = await game(); const brom = await g.make("bob", "Brom"); await down(g, brom);
    await g.call("bob", { op: "delveMove", id: brom, to: { x: 4, y: 1 } }); await g.call("bob", { op: "delveMove", id: brom, to: { x: 7, y: 1 } });
    g.setDice(2); await g.call("bob", { op: "delveDoor", id: brom, at: { x: 8, y: 1 }, act: "force" });
    g.setDice(4, 4, 4); await g.call("bob", { op: "delveMove", id: brom, to: { x: 10, y: 2 } });
    g.setDice(...dice); const r = await g.call("bob", { op: "delveParley", id: brom });
    assert.equal(r.ok, true, r.error); assert.equal(r.outcome, outcome, r.text);
    if (outcome === "attacked") assert.ok(r.fid && g.store.docs.get("oddCampaigns/c1").live);
    if (outcome === "friendly") { assert.equal(r.delve.parties[0].meeting, null); const on = await g.call("bob", { op: "delveMove", id: brom, to: { x: 10, y: 2 } }); assert.equal(on.delve.parties[0].meeting, null, "they stay friendly"); }
    if (outcome === "wary") { assert.match((await g.call("bob", { op: "delveParley", id: brom })).error, /hailed/); assert.ok((await g.call("bob", { op: "delveStand", id: brom })).fid); }
  }
});

test("a trap springs on a 1 or 2 and stops the walk; a search finds a secret door on a 1 or 2", async () => {
  const lvl = LEVEL(); lvl.cells[0] = "#####s######"; lvl.cells[0] = "############"; lvl.cells[2] = "#rr#.s###rr#";
  const g = await game({ level: lvl }); const brom = await g.make("bob", "Brom"); await down(g, brom);
  await g.call("bob", { op: "delveMove", id: brom, to: { x: 4, y: 1 } }); await g.call("bob", { op: "delveMove", id: brom, to: { x: 4, y: 2 } });
  g.setDice(2); const t = await g.call("bob", { op: "delveMove", id: brom, to: { x: 4, y: 3 } });
  assert.match(t.events[0], /A trap springs: Pit/); assert.deepEqual(t.delve.sprung.map((s) => [s.x, s.y]), [[4, 3]]);
  await g.call("bob", { op: "delveMove", id: brom, to: { x: 4, y: 2 } });
  assert.match((await g.call("bob", { op: "delveSearch", id: brom })).error, /whole turn/);
  g.setDice(3); await g.call("bob", { op: "delveEnd", id: brom });
  assert.equal((await g.call("bob", { op: "delve" })).delve.cells[2][5], " ", "unfound, it is not on the map");
  g.setDice(2, 3); const s = await g.call("bob", { op: "delveSearch", id: brom });
  assert.match(s.events[0], /secret door, to the east/); assert.equal(s.delve.cells[2][5], "s"); assert.equal(s.delve.parties[0].turn, 3);
  assert.equal((await g.call("bob", { op: "delveMove", id: brom, to: { x: 5, y: 2 } })).ok, true);
});

test("evading: the trail run back, corners diced, and a doubled rest after", async () => {
  const g = await game(); const brom = await g.make("bob", "Brom"); await down(g, brom);
  await g.call("bob", { op: "delveMove", id: brom, to: { x: 4, y: 1 } }); await g.call("bob", { op: "delveMove", id: brom, to: { x: 4, y: 4 } });
  g.setDice(6, 1, 1, 4, 5, 5); await g.call("bob", { op: "delveEnd", id: brom });
  g.setDice(5); // past the corner: they give up
  const e = await g.call("bob", { op: "delveEvade", id: brom });
  assert.equal(e.outcome, "escaped", JSON.stringify(e.log)); assert.deepEqual(e.delve.parties[0].at, { x: 1, y: 1 }); assert.equal(e.delve.parties[0].meeting, null);
  assert.equal(g.ch(brom).under.fled, true);
  // caught: surprised within 20 feet
  const h = await game(); const leal = await h.make("bob", "Leal"); await down(h, leal);
  h.store.docs.set(h.p.character(leal), { ...h.ch(leal), encounter: { underground: true, lid: "fosscraig-1", kind: "Goblins", monsterKey: "goblin", number: 4, feet: 20, surprise: "party", monsterMove: 6 } });
  const c = await h.call("bob", { op: "delveEvade", id: leal });
  assert.equal(c.outcome, "caught"); assert.equal(c.delve.parties[0].meeting.outcome, "caught");
});

test("splitting underground, and climbing out", async () => {
  const g = await game(); const brom = await g.make("bob", "Brom"), wyn = await g.make("ann", "Wyn"); await down(g, brom, wyn);
  const s = await g.call("ann", { op: "delveParty", ids: [wyn] });
  assert.equal(s.ok, true, s.error); assert.equal(s.delve.parties.length, 2);
  await g.call("ann", { op: "delveMove", id: wyn, to: { x: 3, y: 1 } });
  assert.equal(g.ch(brom).under.x, 1, "Brom stays");
  assert.match((await g.call("ann", { op: "delveLeave", id: wyn })).error, /isn't on the stairs/);
  const out = await g.call("bob", { op: "delveLeave", id: brom });
  assert.equal(out.left, true); assert.equal(g.ch(brom).under, null); assert.equal(g.ch(brom).doing, "road"); assert.equal(g.ch(brom).where, "Fosscraig");
  const map = await g.call("bob", { op: "map" });
  assert.equal(map.parties.some((pt) => pt.members.some((m) => m.id === brom)), true, "back on the kingdom map");
});

test("a dungeon expedition is a week, charged on going down, and covers every descent until an inn rest (v1.565.00)", async () => {
  const g = await game(); const brom = await g.make("bob", "Brom");
  const d = await down(g, brom);
  assert.equal(g.ch(brom).day, 8, "day 1 and a week"); assert.equal(g.ch(brom).expedition, true); assert.equal(d.delve.parties[0].day, 8);
  const told = () => [...g.store.docs.entries()].filter(([k]) => k.startsWith("oddCampaigns/c1/chat/referee/")).map(([, v]) => v.text).filter((t) => /went down the stairs/.test(t));
  assert.match(told()[0], /The expedition takes a week: it is day 8\./);
  assert.equal((await g.call("bob", { op: "delveLeave", id: brom })).ok, true); assert.equal(g.ch(brom).day, 8);
  await down(g, brom);
  assert.equal(g.ch(brom).day, 8, "the same expedition: no second week"); assert.ok(told().some((t) => !/takes a week/.test(t)));
  await g.call("bob", { op: "delveLeave", id: brom });
  // a night at the inn in Langstead ends the expedition
  const home = rules.westmark.PLACES.Langstead, at = rules.westmark.PLACES.Fosscraig;
  g.store.docs.set(g.p.character(brom), { ...g.ch(brom), hex: { q: home.q, r: home.r }, where: "Langstead", doing: "town" });
  const r = await g.call("bob", { op: "rest", id: brom, days: 1 }); assert.equal(r.ok, true, r.error); assert.equal(r.day, 9); assert.ok(!g.ch(brom).expedition);
  g.store.docs.set(g.p.character(brom), { ...g.ch(brom), hex: { q: at.q, r: at.r }, where: "Fosscraig", doing: "road" });
  await down(g, brom); assert.equal(g.ch(brom).day, 16, "a new expedition, a new week");
});

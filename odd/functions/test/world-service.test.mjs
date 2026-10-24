// odd/functions/test/world-service.test.mjs — pass 7: the map (oddWorld).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as rules from "../../../packages/odd-chainmail-rules/index.js";
import { createCharacterService } from "../character-service.mjs";
import { createWorldService, worldPaths } from "../world-service.mjs";

function memoryStore() {
  const docs = new Map(), copy = (v) => structuredClone(v);
  return {
    docs,
    async run(fn) {
      const staged = new Map(); let wrote = false;
      const tx = {
        get: async (p) => { assert.equal(wrote, false, "Firestore: every read before any write"); return docs.has(p) ? copy(docs.get(p)) : null; },
        list: async (path) => [...docs.entries()].filter(([k]) => k.startsWith(`${path}/`) && !k.slice(path.length + 1).includes("/")).map(([, v]) => copy(v)),
        set: (p, d) => { wrote = true; assert.equal(JSON.stringify(d).includes("undefined"), false); staged.set(p, copy(d)); }
      };
      const out = await fn(tx);
      for (const [p, d] of staged) docs.set(p, d);
      return out;
    }
  };
}

/** A game with Kurt refereeing, Bob and Ann playing, Bob's Brom finished; dice are scripted per call. */
function game({ dice = [] } = {}) {
  const store = memoryStore();
  store.docs.set("oddCampaigns/c1", { refereeUid: "kurt", referees: [], members: ["kurt", "bob", "ann"], people: { kurt: { name: "Kurt" }, bob: { name: "Bob" }, ann: { name: "Ann" } }, day: 1 });
  let n = 0, i = 0;
  const rollDie = (sides) => { const v = dice[i++]; return v == null ? Math.min(4, sides) : Math.min(v, sides); };
  const roster = createCharacterService({ rules, store, now: () => 1000, rollDie: () => 4, newId: () => `ch${++n}` });
  const world = createWorldService({ rules, store, now: () => 1000, rollDie });
  const rcall = (uid, data) => roster.handle({ uid, data: { cid: "c1", ...data } });
  const call = (uid, data) => world.handle({ uid, data: { cid: "c1", ...data } });
  const setDice = (...v) => { dice = v; i = 0; };
  return { store, call, rcall, setDice, p: worldPaths("c1") };
}
async function brom(g, uid = "bob", name = "Brom") {
  const id = (await g.rcall(uid, { op: "roll" })).character.id;
  await g.rcall(uid, { op: "basics", id, name }); await g.rcall(uid, { op: "buy", id, key: "sword" });
  const f = await g.rcall(uid, { op: "finish", id }); assert.equal(f.ok, true, f.error);
  return id;
}
const chat = (store, who) => [...store.docs.entries()].filter(([k]) => k.startsWith(`oddCampaigns/c1/chat/${who}/`)).map(([, v]) => v);

test("the map: players know the home village and its ring; the referee sees the whole key", async () => {
  const g = game();
  const m = await g.call("bob", { op: "map" });
  assert.equal(m.ok, true); assert.equal(m.home, "Langstead"); assert.equal(Object.keys(m.hexes).length, 7); assert.equal(m.hexes["0,0"].place, "Langstead"); assert.equal(m.full, false);
  const r = await g.call("kurt", { op: "map" });
  assert.equal(r.full, true); assert.equal(r.hexes["2,-2"].place, "Fosscraig"); assert.ok(Object.keys(r.hexes).length > 60);
  assert.equal((await g.call("eve", { op: "map" })).code, "forbidden");
  assert.ok(g.store.docs.has(g.p.map) && g.store.docs.has(g.p.known), "seeded on first use");
});

test("walking: a day toward Fosscraig by the track arrives; the hexes become known; the end-of-day check can bring a monster", async () => {
  const g = game(); const id = await brom(g);
  g.setDice(1, 6, 1, 3); // lost? (clear never) · encounter d6=6 on mountains: yes · d8=1 men · d12=3 Brigands (mountain column)
  const r = await g.call("bob", { op: "move", ids: [id], to: { q: 2, r: -2 } });
  assert.equal(r.code, "bad-request", "nobody knows the way to a hex off the players' map");
  const r2 = await g.call("bob", { op: "move", ids: [id], dir: "NE" });
  assert.equal(r2.ok, true, r2.error); assert.equal(r2.day, 2); assert.equal(r2.path.length, 2); assert.equal(r2.place, "Fosscraig"); assert.equal(r2.lost, false);
  assert.equal(r2.encounter.type, "men"); assert.equal(r2.encounter.kind, "Brigands");
  const ch = g.store.docs.get(`oddCampaigns/c1/characters/${id}`);
  assert.deepEqual(ch.hex, { q: 2, r: -2 }); assert.equal(ch.where, "Fosscraig"); assert.equal(ch.doing, "encounter"); assert.equal(ch.day, 2); assert.equal(ch.daysWalked, 1);
  const known = g.store.docs.get(g.p.known).hexes;
  assert.equal(known["1,-1"].t, "clear"); assert.equal(known["2,-2"].place, "Fosscraig"); assert.ok(!known["3,-3"], "a ruin doesn't teach its ring");
  assert.equal((await g.call("bob", { op: "move", ids: [id], dir: "N" })).code, "bad-request", "an encounter waits on the referee");
  assert.equal((await g.call("bob", { op: "resolve", id })).code, "forbidden");
  assert.equal((await g.call("kurt", { op: "resolve", id })).ok, true);
  assert.equal(g.store.docs.get(`oddCampaigns/c1/characters/${id}`).doing, "road");
  const lines = chat(g.store, "referee").map((e) => e.text);
  assert.ok(lines.some((t) => /Day 2\. Brom walked NE .*reached Fosscraig/.test(t)) && lines.some((t) => /Brigands/.test(t)), lines.join(" | "));
  assert.ok(chat(g.store, "ann").length >= 1, "every player reads the day's line");
});

test("lost in the woods: the die picks the direction; six days then rest; camp rolls twice", async () => {
  const g = game(); const id = await brom(g);
  g.setDice(1, 1); // lost (clear never); encounter d6=1 no
  let r = await g.call("bob", { op: "move", ids: [id], dir: "NW" }); assert.equal(r.ok, true, r.error);
  const ch = () => g.store.docs.get(`oddCampaigns/c1/characters/${id}`);
  assert.equal(r.path.length, 2, "the clear hex and Kingwold by its track (1 + 1), the next wood (2) is too far");
  assert.equal(ch().where, "Kingwold"); assert.equal(ch().doing, "town", "a village: he's in town");
  assert.ok(g.store.docs.get(g.p.known).hexes["-3,0"], "a village teaches its ring");
  g.setDice(1, 4, 1); // starting on woods: lost on a 1 → direction die 4 = S; encounter d6=1 no
  r = await g.call("bob", { op: "move", ids: [id], dir: "NE" });
  assert.equal(r.ok, true, r.error); assert.equal(r.lost, true); assert.equal(r.end.r, 1, "went S instead");
  for (let d = 0; d < 4; d++) { g.setDice(6, 1); r = await g.call("bob", { op: "move", ids: [id], dir: "SE" }); assert.equal(r.ok, true, r.error); }
  assert.equal(ch().daysWalked, 6);
  assert.equal((await g.call("bob", { op: "move", ids: [id], dir: "N" })).code, "bad-request", "six days: rest first");
  g.setDice(1, 6, 1, 1); // camp: first check no, second yes → men, Bandits
  r = await g.call("bob", { op: "camp", ids: [id] });
  assert.equal(r.ok, true, r.error); assert.equal(r.encounter.kind, "Bandits"); assert.equal(ch().daysWalked, 0);
});

test("the inn: rest heals Book III's way and moves his clock; the rounds buy a rumour that marks the map", async () => {
  const g = game(); const id = await brom(g);
  g.store.docs.set(`oddCampaigns/c1/characters/${id}`, { ...g.store.docs.get(`oddCampaigns/c1/characters/${id}`), hp: 1 });
  let r = await g.call("bob", { op: "rest", id, days: 1 }); assert.equal(r.ok, true, r.error); assert.equal(r.healed, 0, "nothing the first day");
  r = await g.call("bob", { op: "rest", id, days: 5 }); assert.equal(r.healed, 2); assert.equal(r.day, 7);
  const ch = () => g.store.docs.get(`oddCampaigns/c1/characters/${id}`);
  assert.equal(ch().hp, 3); assert.equal(ch().day, 7); assert.equal(ch().doing, "town");
  g.setDice(2, 3, 1); // 2d.. cost 2*10+3 = 23 gp; pick rumour 1 of 5
  const gp = ch().coins.gp;
  r = await g.call("bob", { op: "rumour", id }); assert.equal(r.ok, true, r.error); assert.equal(r.cost, 23); assert.match(r.text, /crag/);
  assert.equal(ch().coins.gp, gp - 23);
  const k = g.store.docs.get(g.p.known).hexes["2,-2"]; assert.equal(k.place, "Fosscraig"); assert.equal(k.rumoured, true, "heard of, not seen");
  const rum = (who) => chat(g.store, who).filter((e) => e.rumour);
  assert.equal(rum("bob").length, 1); assert.equal(rum("ann").length, 0, "a rumour is his alone (and the referee's)");
  assert.equal(rum("referee")[0].rumour.truth, true, "the referee sees the flag");
  g.setDice(1, 1, 1); r = await g.call("bob", { op: "rumour", id }); assert.equal(r.ok, true); assert.doesNotMatch(r.text, /crag/, "a fresh one while any are left");
  // the referee writes Kingwold's list
  r = await g.call("kurt", { op: "rumours", place: "Kingwold", list: [{ text: "Wolves.", truth: true }] }); assert.equal(r.count, 1);
  assert.equal((await g.call("bob", { op: "rumours", place: "Kingwold", list: [] })).code, "forbidden");
});

test("the market: a finished character buys at cost and sells at half, only where there is one", async () => {
  const g = game(); const id = await brom(g);
  const ch = () => g.store.docs.get(`oddCampaigns/c1/characters/${id}`);
  const gp = ch().coins.gp;
  let r = await g.call("bob", { op: "shop", id, buy: "dagger" }); assert.equal(r.ok, true, r.error); assert.equal(r.character.coins.gp, gp - 3);
  const i = ch().items.findIndex((x) => x.key === "sword");
  r = await g.call("bob", { op: "shop", id, sell: i }); assert.equal(r.ok, true, r.error); assert.equal(ch().coins.gp, gp - 3 + 5);
  assert.equal((await g.call("ann", { op: "shop", id, buy: "dagger" })).code, "forbidden");
  g.store.docs.set(`oddCampaigns/c1/characters/${id}`, { ...ch(), hex: { q: 2, r: -2 }, where: "Fosscraig" });
  assert.equal((await g.call("bob", { op: "shop", id, buy: "dagger" })).code, "bad-request", "no market on the crag");
  assert.equal((await g.call("bob", { op: "rest", id, days: 2 })).code, "bad-request", "no inn either");
  r = await g.call("bob", { op: "enter", id, place: "road" }); assert.equal(r.ok, true); assert.equal(ch().doing, "road");
});

test("the meeting (pass 9): the day's end rolls how many, surprise and the distance; evade uses Book III's table, then pursuit", async () => {
  const g = game(); const id = await brom(g);
  // walk NE: lost no (clear never) · encounter d6=6 on mountains · d8=3 giant · d12=2 Goblins · surprise 5,5 none · sighting 4d6: 1,2,3,4 = 100 yards · number 4d10: 3,4,5,6 = 18 x 10
  g.setDice(1, 6, 3, 2, 5, 5, 1, 2, 3, 4, 3, 4, 5, 6);
  const r = await g.call("bob", { op: "move", ids: [id], dir: "NE" });
  assert.equal(r.ok, true, r.error); assert.equal(r.encounter.kind, "Goblins");
  const ch = () => g.store.docs.get(`oddCampaigns/c1/characters/${id}`);
  const e = ch().encounter;
  assert.equal(e.number, 180); assert.equal(e.max, 400); assert.equal(e.yards, 100); assert.equal(e.surprise, null); assert.equal(e.monsterKey, "goblin");
  assert.equal(e.speed, "faster", "Brom at 12 against goblins at 6");
  assert.equal((await g.call("bob", { op: "adjust", id, number: 8 })).code, "forbidden");
  assert.equal((await g.call("kurt", { op: "adjust", id, number: 8 })).ok, true); assert.equal(ch().encounter.number, 8);
  // evade: party of 1, 8 of 400 = 2% (<=25%): 50, +25 faster = 75; rolled 40: slipped
  g.setDice(40);
  const ev = await g.call("bob", { op: "evade", ids: [id] });
  assert.equal(ev.ok, true, JSON.stringify(ev)); assert.equal(ev.outcome, "evaded"); assert.equal(ev.chance, 75);
  assert.equal(ch().doing, "road"); assert.equal(ch().encounter, null); assert.equal(ch().lastEncounter.outcome, "evaded");
  assert.ok(chat(g.store, "ann").some((x) => /evaded the Goblins/.test(x.text)));
});

test("the meeting: a failed evasion is pursued; parley rolls the reaction; stand waits on the referee", async () => {
  const g = game(); const id = await brom(g);
  g.setDice(1, 6, 3, 2, 5, 5, 1, 2, 3, 4, 3, 4, 5, 6); await g.call("bob", { op: "move", ids: [id], dir: "NE" });
  const ch = () => g.store.docs.get(`oddCampaigns/c1/characters/${id}`);
  // evade: 180/400 = 45%: 70 base +25 faster = 95; rolled 99: fails. pursuit: dir d6=4 (S), goblins not faster so never caught; on d6=5: give up
  g.setDice(99, 4, 50, 5);
  const ev = await g.call("bob", { op: "evade", ids: [id] });
  assert.equal(ev.ok, true, JSON.stringify(ev)); assert.equal(ev.outcome, "escaped"); assert.equal(ev.restOwed, 0.5);
  assert.deepEqual(ch().hex, { q: 2, r: -1 }, "ran a hex S from the crag"); assert.equal(ch().doing, "road");
  // another meeting, this time parley: reaction 2d6 = 4 + 5 = 9 positive
  g.setDice(6, 6, 3, 2, 5, 5, 1, 2, 3, 4, 3, 4, 5, 6); let r = await g.call("bob", { op: "move", ids: [id], dir: "N" }); assert.equal(r.encounter?.kind, "Goblins", r.error);
  g.setDice(4, 5);
  r = await g.call("bob", { op: "parley", id }); assert.equal(r.ok, true, r.error); assert.equal(r.reaction, "positive");
  assert.equal(ch().doing, "encounter", "still the referee's to resolve"); assert.equal(ch().encounter.outcome, "parley");
  assert.equal((await g.call("bob", { op: "evade", ids: [id] })).code, "bad-request", "one choice");
  assert.equal((await g.call("kurt", { op: "resolve", id })).ok, true); assert.equal(ch().doing, "road");
  // stand
  g.setDice(6, 6, 3, 2, 5, 5, 1, 2, 3, 4, 3, 4, 5, 6); r = await g.call("bob", { op: "move", ids: [id], dir: "N" }); assert.equal(r.encounter?.kind, "Goblins", r.error);
  r = await g.call("bob", { op: "stand", ids: [id] }); assert.equal(r.outcome, "stand"); assert.equal(ch().encounter.choice, "stand");
});

test("a titled man on the road (Book III): the Lord's band is rolled at the meeting and waits for the fight", async () => {
  const g = game(); const id = await brom(g);
  // walk NE: lost no · encounter d6=6 on mountains · d8=1 men · d12=4 Lord (mountain column) · then the band's dice (defaults to 3s: 2d6 men = 6, levels, hp...)
  g.setDice(1, 6, 1, 4);
  const r = await g.call("bob", { op: "move", ids: [id], dir: "NE" });
  assert.equal(r.ok, true, r.error); assert.equal(r.encounter.kind, "Lord");
  const e = g.store.docs.get(`oddCampaigns/c1/characters/${id}`).encounter;
  assert.ok(e.band, "a band"); assert.equal(e.band.leader.level, 9); assert.equal(e.band.leader.cls, "fighter"); assert.equal(e.band.mounted, true);
  assert.ok(e.band.men.length >= 2 && e.band.men.length <= 12 && e.band.men.every((m) => m.level >= 1 && m.level <= 4), "2-12 men of 1st-4th");
  assert.equal(e.number, 1 + e.band.men.length); assert.equal(e.max, 13); assert.equal(e.speed, "even", "Brom afoot at 12 against horse at 18: not twice");
  assert.ok(e.band.leader.items.some((i) => i.key === "plate") && e.band.leader.ready.weapon === "sword", "plate and sword");
  assert.ok(chat(g.store, "referee").some((x) => /a Lord, with \d+ men, mounted/.test(x.text)), chat(g.store, "referee").map((x) => x.text).join(" | "));
  const fig = rules.roster.toFigure(e.band.leader, { id: 1, side: "B" });
  assert.equal(fig.level, 9); assert.equal(fig.ac, 2, "plate and shield"); assert.ok(fig.hp >= 9, "9 hit dice");
});

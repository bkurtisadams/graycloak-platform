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
/** A day on the road: the walk (its first step rolls for lost), then camp (the day's wandering-monster check). */
async function walkDay(g, uid, id, how, moveDice = [1], campDice = [1]) {
  g.setDice(...moveDice); const m = await g.call(uid, { op: "move", id, ...how });
  if (!m.ok) return { m, c: null };
  g.setDice(...campDice); const c = await g.call(uid, { op: "camp", id });
  return { m, c };
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
  g.setDice(1); // lost? (clear never)
  const r = await g.call("bob", { op: "move", ids: [id], to: { q: 2, r: -2 } });
  assert.equal(r.code, "bad-request", "nobody knows the way to a hex off the players' map");
  const r2 = await g.call("bob", { op: "move", ids: [id], dir: "NE" });
  assert.equal(r2.ok, true, r2.error); assert.equal(r2.day, 2); assert.equal(r2.path.length, 2); assert.equal(r2.place, "Fosscraig"); assert.equal(r2.lost, false);
  assert.equal(r2.spent, 3); assert.equal(r2.left, 0);
  let ch = g.store.docs.get(`oddCampaigns/c1/characters/${id}`);
  assert.deepEqual(ch.hex, { q: 2, r: -2 }); assert.equal(ch.where, "Fosscraig"); assert.equal(ch.doing, "road"); assert.equal(ch.day, 2); assert.equal(ch.dayMoved, 3);
  assert.equal((await g.call("bob", { op: "move", ids: [id], dir: "N" })).code, "bad-request", "the day's march is done");
  g.setDice(6, 1, 3); // the day's end: encounter d6=6 on mountains: yes · d8=1 men · d12=3 Brigands (mountain column)
  const c = await g.call("bob", { op: "camp", id });
  assert.equal(c.ok, true, c.error); assert.equal(c.day, 2); assert.equal(c.encounter.type, "men"); assert.equal(c.encounter.kind, "Brigands");
  ch = g.store.docs.get(`oddCampaigns/c1/characters/${id}`);
  assert.equal(ch.doing, "encounter"); assert.equal(ch.daysWalked, 1); assert.equal(ch.dayMoved, 0);
  const known = g.store.docs.get(g.p.known).hexes;
  assert.equal(known["1,-1"].t, "clear"); assert.equal(known["2,-2"].place, "Fosscraig"); assert.ok(!known["3,-3"], "a ruin doesn't teach its ring");
  assert.equal((await g.call("bob", { op: "move", ids: [id], dir: "N" })).code, "bad-request", "an encounter waits on the referee");
  assert.equal((await g.call("bob", { op: "resolve", id })).code, "forbidden");
  assert.equal((await g.call("kurt", { op: "resolve", id })).ok, true);
  assert.equal(g.store.docs.get(`oddCampaigns/c1/characters/${id}`).doing, "road");
  const lines = chat(g.store, "referee").map((e) => e.text);
  assert.ok(lines.some((t) => /Day 2\. Brom walked NE .*reached Fosscraig/.test(t)) && lines.some((t) => /Brigands/.test(t)), lines.join(" | "));
  assert.ok(chat(g.store, "ann").length >= 1, "every player reads the day's line");
  // v1.563.00: the lines are sorted for the chat's chips, and the referee's own say stays in his chat
  const walk = chat(g.store, "ann").find((e) => /walked NE/.test(e.text));
  assert.equal(walk.kind, "travel"); assert.equal(walk.arrive, "Fosscraig"); assert.deepEqual(walk.owners, ["bob"]); assert.doesNotMatch(walk.text, /spent|make camp/);
  assert.equal(chat(g.store, "ann").find((e) => /Brigands/.test(e.text)).kind, "meeting");
  assert.equal(chat(g.store, "referee").find((e) => /The referee let Brom go on/.test(e.text)).kind, "ruling");
  assert.ok(!chat(g.store, "ann").some((e) => /The referee let/.test(e.text)), "a ruling is the referee's own");
});

test("lost in the woods: the die picks the direction; six days then rest; camp rolls twice", async () => {
  const g = game(); const id = await brom(g);
  let { m: r, c } = await walkDay(g, "bob", id, { dir: "NW" }); assert.equal(r.ok, true, r.error); assert.equal(c.ok, true, c.error); // lost (clear never); the night's d6=1: nothing
  const ch = () => g.store.docs.get(`oddCampaigns/c1/characters/${id}`);
  assert.equal(r.path.length, 2, "the clear hex and Kingwold by its track (1 + 1), the next wood (2) is too far");
  assert.equal(ch().where, "Kingwold"); assert.equal(ch().doing, "town", "a village: he's in town");
  assert.ok(g.store.docs.get(g.p.known).hexes["-3,0"], "a village teaches its ring");
  ({ m: r, c } = await walkDay(g, "bob", id, { dir: "NE" }, [1, 4])); // starting on woods: lost on a 1 → direction die 4 = S
  assert.equal(r.ok, true, r.error); assert.equal(r.lost, true); assert.equal(r.end.r, 1, "went S instead"); assert.equal(r.left, 0, "a lost party's day is spent");
  for (let d = 0; d < 4; d++) { ({ m: r, c } = await walkDay(g, "bob", id, { dir: "SE" }, [6])); assert.equal(r.ok, true, r.error); assert.equal(c.ok, true, c.error); }
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

const MEET = [6, 3, 2, 5, 5, 1, 2, 3, 4, 3, 4, 5, 6];
test("the meeting (pass 9): the day's end rolls how many, surprise and the distance; evade uses Book III's table, then pursuit", async () => {
  const g = game(); const id = await brom(g);
  // walk NE: lost no (clear never); camp: encounter d6=6 on mountains · d8=3 giant · d12=2 Goblins · surprise 5,5 none · sighting 4d6: 1,2,3,4 = 100 yards · number 4d10: 3,4,5,6 = 18 x 10
  const { m, c: r } = await walkDay(g, "bob", id, { dir: "NE" }, [1], MEET);
  assert.equal(m.ok, true, m.error); assert.equal(r.ok, true, r.error); assert.equal(r.encounter.kind, "Goblins");
  const ch = () => g.store.docs.get(`oddCampaigns/c1/characters/${id}`);
  const e = ch().encounter;
  assert.equal(e.number, 180); assert.equal(e.max, 400); assert.equal(e.yards, 100); assert.equal(e.surprise, null); assert.equal(e.monsterKey, "goblin");
  assert.equal(e.speed, "faster", "Brom at 12 against goblins at 6");
  assert.equal((await g.call("bob", { op: "adjust", id, number: 8 })).code, "forbidden");
  assert.equal((await g.call("kurt", { op: "adjust", id, number: 8 })).ok, true); assert.equal(ch().encounter.number, 8);
  // evade: party of 1, 8 of 400 = 2% (<=25%): 50, +25 faster = 75; rolled 40: slipped
  g.setDice(40);
  const ev = await g.call("bob", { op: "evade", id });
  assert.equal(ev.ok, true, JSON.stringify(ev)); assert.equal(ev.outcome, "evaded"); assert.equal(ev.chance, 75);
  assert.equal(ch().doing, "road"); assert.equal(ch().encounter, null); assert.equal(ch().lastEncounter.outcome, "evaded");
  assert.ok(chat(g.store, "ann").some((x) => /evaded the Goblins/.test(x.text)));
});

test("the meeting: a failed evasion is pursued; parley rolls the reaction; stand waits on the referee", async () => {
  const g = game(); const id = await brom(g);
  await walkDay(g, "bob", id, { dir: "NE" }, [1], MEET);
  const ch = () => g.store.docs.get(`oddCampaigns/c1/characters/${id}`);
  // evade: 180/400 = 45%: 70 base +25 faster = 95; rolled 99: fails. pursuit: dir d6=4 (S), goblins not faster so never caught; on d6=5: give up
  g.setDice(99, 4, 50, 5);
  const ev = await g.call("bob", { op: "evade", ids: [id] });
  assert.equal(ev.ok, true, JSON.stringify(ev)); assert.equal(ev.outcome, "escaped"); assert.equal(ev.restOwed, 0.5);
  assert.deepEqual(ch().hex, { q: 2, r: -1 }, "ran a hex S from the crag"); assert.equal(ch().doing, "road");
  // another meeting, this time parley: reaction 2d6 = 4 + 5 = 9 positive
  let r = (await walkDay(g, "bob", id, { dir: "N" }, [6], MEET)).c; assert.equal(r?.encounter?.kind, "Goblins", r?.error);
  g.setDice(4, 5);
  r = await g.call("bob", { op: "parley", id }); assert.equal(r.ok, true, r.error); assert.equal(r.reaction, "positive");
  assert.equal(ch().doing, "encounter", "still the referee's to resolve"); assert.equal(ch().encounter.outcome, "parley");
  assert.equal((await g.call("bob", { op: "evade", ids: [id] })).code, "bad-request", "one choice");
  assert.equal((await g.call("kurt", { op: "resolve", id })).ok, true); assert.equal(ch().doing, "road");
  // stand
  r = (await walkDay(g, "bob", id, { dir: "N" }, [6], MEET)).c; assert.equal(r?.encounter?.kind, "Goblins", r?.error);
  r = await g.call("bob", { op: "stand", id }); assert.equal(r.outcome, "stand"); assert.equal(ch().encounter.choice, "stand");
});

test("a titled man on the road (Book III): the Lord's band is rolled at the meeting and waits for the fight", async () => {
  const g = game(); const id = await brom(g);
  // walk NE: lost no · encounter d6=6 on mountains · d8=1 men · d12=4 Lord (mountain column) · then the band's dice (defaults to 3s: 2d6 men = 6, levels, hp...)
  const { m, c: r } = await walkDay(g, "bob", id, { dir: "NE" }, [1], [6, 1, 4]);
  assert.equal(m.ok, true, m.error); assert.equal(r.ok, true, r.error); assert.equal(r.encounter.kind, "Lord");
  const e = g.store.docs.get(`oddCampaigns/c1/characters/${id}`).encounter;
  assert.ok(e.band, "a band"); assert.equal(e.band.leader.level, 9); assert.equal(e.band.leader.cls, "fighter"); assert.equal(e.band.mounted, true);
  assert.ok(e.band.men.length >= 2 && e.band.men.length <= 12 && e.band.men.every((m) => m.level >= 1 && m.level <= 4), "2-12 men of 1st-4th");
  assert.equal(e.number, 1 + e.band.men.length); assert.equal(e.max, 13); assert.equal(e.speed, "even", "Brom afoot at 12 against horse at 18: not twice");
  assert.ok(e.band.leader.items.some((i) => i.key === "plate") && e.band.leader.ready.weapon === "sword", "plate and sword");
  assert.ok(chat(g.store, "referee").some((x) => /a Lord, with \d+ men, mounted/.test(x.text)), chat(g.store, "referee").map((x) => x.text).join(" | "));
  const fig = rules.roster.toFigure(e.band.leader, { id: 1, side: "B" });
  assert.equal(fig.level, 9); assert.equal(fig.ac, 2, "plate and shield"); assert.ok(fig.hp >= 9, "9 hit dice");
});

test("paint (pass 10): the referee edits the key in place; a hex the players know follows", async () => {
  const g = game(); await g.call("bob", { op: "map" });
  assert.equal((await g.call("bob", { op: "paint", q: 1, r: -1, t: "woods" })).code, "forbidden");
  let r = await g.call("kurt", { op: "paint", q: 1, r: -1, t: "woods", track: false }); assert.equal(r.ok, true, r.error); assert.equal(r.hex.t, "woods"); assert.equal(r.hex.track, undefined);
  assert.equal((await g.call("bob", { op: "map" })).hexes["1,-1"].t, "woods", "known already: the players see it");
  r = await g.call("kurt", { op: "paint", q: 3, r: -3, place: "Hoarfell", kind: "castle" }); assert.equal(r.ok, true, r.error);
  const m = await g.call("kurt", { op: "map" }); assert.equal(m.hexes["3,-3"].place, "Hoarfell"); assert.equal(m.places.Hoarfell.kind, "castle");
  assert.equal((await g.call("bob", { op: "map" })).hexes["3,-3"], undefined, "not known: nothing to the players");
  assert.equal((await g.call("kurt", { op: "paint", q: 3, r: -3, t: "lava" })).code, "bad-request");
});

/* ---------- pass 17: parties ---------- */
test("parties (pass 17): a company forms, walks a hex at a time on its leader's say, and splits", async () => {
  const g = game(); const brm = await brom(g), bera = await brom(g, "bob", "Bera"), ada = await brom(g, "ann", "Ada");
  const ch = (id) => g.store.docs.get(`oddCampaigns/c1/characters/${id}`);
  let m = await g.call("ann", { op: "map" });
  assert.equal(m.parties.length, 3, "everyone in Langstead, each a party of one; Ann sees those in her hex");
  assert.equal((await g.call("ann", { op: "party", ids: [brm] })).code, "forbidden", "nobody conscripts another's character");
  let r = await g.call("bob", { op: "party", ids: [brm, bera] }); assert.equal(r.ok, true, r.error); assert.equal(r.party, brm);
  r = await g.call("ann", { op: "party", ids: [ada], with: bera }); assert.equal(r.ok, true, r.error); assert.equal(r.party, brm, "she joins under their leader");
  assert.equal(r.parties.length, 1); assert.deepEqual(r.parties[0].members.map((x) => x.name), ["Brom", "Bera", "Ada"]); assert.equal(r.parties[0].walks, false, "Ann doesn't lead it");
  assert.equal((await g.call("ann", { op: "move", id: ada, path: [{ q: 1, r: -1 }] })).code, "forbidden", "the leader's player walks the party");
  g.setDice(1);
  r = await g.call("bob", { op: "move", id: bera, path: [{ q: 1, r: -1 }] }); assert.equal(r.ok, true, r.error);
  assert.equal(r.day, 2); assert.equal(r.spent, 1); assert.equal(r.left, 2);
  for (const id of [brm, bera, ada]) { assert.deepEqual(ch(id).hex, { q: 1, r: -1 }); assert.equal(ch(id).dayMoved, 1); assert.equal(ch(id).party, brm); assert.equal(ch(id).day, 2); }
  r = await g.call("bob", { op: "move", id: brm, path: [{ q: 0, r: -1 }, { q: 1, r: -2 }] });
  assert.equal(r.ok, true, r.error); assert.equal(r.day, 2, "the same day"); assert.equal(r.path.length, 2); assert.equal(r.left, 0);
  const day2 = chat(g.store, "ann").filter((e) => e.kind === "travel" && /^Day 2\./.test(e.text));
  assert.equal(day2.length, 1, "the day's walk is one line, added to as the party goes on"); assert.equal((day2[0].text.match(/clear|woods|mountains|hills|swamp/g) ?? []).length, 3, day2[0].text);
  assert.equal((await g.call("bob", { op: "move", id: brm, path: [{ q: 1, r: -1 }] })).code, "bad-request", "the day's march is done");
  // Ann takes Ada her own way: the day she has walked goes with her
  r = await g.call("ann", { op: "party", ids: [ada] }); assert.equal(r.ok, true, r.error); assert.equal(ch(ada).party, ada);
  assert.equal(r.parties.find((x) => x.id === ada).left, 0);
  assert.equal((await g.call("ann", { op: "move", id: ada, path: [{ q: 1, r: -1 }] })).code, "bad-request");
  g.setDice(1); r = await g.call("ann", { op: "camp", id: ada }); assert.equal(r.ok, true, r.error); assert.equal(r.rested, false); assert.equal(ch(ada).daysWalked, 1);
  assert.equal(ch(brm).dayMoved, 3, "the others have not camped yet");
  g.setDice(1); r = await g.call("ann", { op: "move", id: ada, path: [{ q: 1, r: -1 }] }); assert.equal(r.ok, true, r.error); assert.equal(r.day, 3);
  assert.equal((await g.call("ann", { op: "party", ids: [ada], with: brm })).code, "bad-request", "a party forms in one hex");
  // the lead passes; a leader who dies is replaced by the eldest
  assert.equal((await g.call("ann", { op: "lead", id: bera })).code, "forbidden");
  r = await g.call("bob", { op: "lead", id: bera }); assert.equal(r.ok, true, r.error); assert.equal(ch(brm).party, bera);
  g.store.docs.set(`oddCampaigns/c1/characters/${bera}`, { ...ch(bera), doing: "dead" });
  r = await g.call("bob", { op: "parties" });
  const left = r.parties.find((x) => x.members.some((y) => y.id === brm)); assert.equal(left.id, brm); assert.equal(left.members.length, 1);
  assert.ok(chat(g.store, "referee").some((x) => /Ada joined Brom's party/.test(x.text)) && chat(g.store, "referee").some((x) => /Ada went his own way|Ada went/.test(x.text)));
});

test("parties: the walk stops where the day runs out; a path goes hex to hex; strangers elsewhere stay unseen", async () => {
  const g = game(); const brm = await brom(g), ada = await brom(g, "ann", "Ada");
  const ch = (id) => g.store.docs.get(`oddCampaigns/c1/characters/${id}`);
  g.setDice(1);
  assert.equal((await g.call("bob", { op: "move", id: brm, path: [{ q: 2, r: -2 }] })).code, "bad-request", "not a neighbour");
  // NE (clear, 1), then N of that into what the map really holds: whatever it costs, the walk never overruns the day
  const r = await g.call("bob", { op: "move", id: brm, path: [{ q: 1, r: -1 }, { q: 2, r: -2 }, { q: 3, r: -3 }, { q: 4, r: -4 }] });
  assert.equal(r.ok, true, r.error); assert.ok(r.spent <= 3 && r.path.length < 4 && r.reason !== "arrived", JSON.stringify(r));
  assert.equal(ch(brm).dayMoved, r.spent);
  const seen = (await g.call("ann", { op: "parties" })).parties;
  assert.equal(seen.length, 1, "Ann sees only her own: Brom is over the hill and not hers to see"); assert.equal(seen[0].id, ada);
  assert.equal((await g.call("kurt", { op: "parties" })).parties.length, 2, "the referee sees every party");
});

test("parties: the leader takes the party into the village and out; an encounter is the whole party's, answered by its leader", async () => {
  const g = game(); const brm = await brom(g), ada = await brom(g, "ann", "Ada");
  const ch = (id) => g.store.docs.get(`oddCampaigns/c1/characters/${id}`);
  await g.call("ann", { op: "party", ids: [ada], with: brm });
  let r = await g.call("bob", { op: "enter", id: brm, place: "road" }); assert.equal(r.ok, true, r.error);
  assert.equal(ch(brm).doing, "road"); assert.equal(ch(ada).doing, "road", "the party goes with its leader");
  r = await g.call("ann", { op: "enter", id: ada, place: "Langstead" }); assert.equal(r.ok, true, r.error);
  assert.equal(ch(ada).doing, "town"); assert.equal(ch(brm).doing, "road", "a member moves only himself");
  g.setDice(1); r = await g.call("bob", { op: "move", id: brm, path: [{ q: 1, r: -1 }] }); assert.equal(r.ok, true, r.error);
  g.setDice(...MEET); r = await g.call("bob", { op: "camp", id: brm }); assert.equal(r.encounter?.kind, "Goblins", r.error);
  assert.equal(ch(ada).doing, "encounter"); assert.equal(ch(brm).doing, "encounter");
  assert.equal((await g.call("ann", { op: "evade", id: ada })).code, "forbidden", "the leader answers for the party");
  assert.equal((await g.call("ann", { op: "party", ids: [ada] })).code, "bad-request", "nobody slips off while an encounter waits");
  r = await g.call("bob", { op: "stand", id: brm }); assert.equal(r.ok, true, r.error);
  assert.equal(ch(ada).encounter.choice, "stand");
  r = await g.call("kurt", { op: "resolve", id: ada }); assert.equal(r.ok, true, r.error);
  assert.equal(ch(brm).doing, "road"); assert.equal(ch(ada).doing, "road", "resolved for the whole party");
});

test("the campaign day runs by the calendar: those in town are carried on, a party out in the wilderness keeps its own days (v1.565.00)", async () => {
  const g = game(); const id = await brom(g); const DAY = 86400000, ch = () => g.store.docs.get(`oddCampaigns/c1/characters/${id}`);
  const camp = () => g.store.docs.get("oddCampaigns/c1"), clock = (daysAgo) => g.store.docs.set("oddCampaigns/c1", { ...camp(), clock: { day: 1, at: 1000 - daysAgo * DAY } });
  clock(3); // three days of actual time since the clock started: it is day 4
  g.setDice(1); let r = await g.call("bob", { op: "move", ids: [id], dir: "NE" });
  assert.equal(r.ok, true, r.error); assert.equal(r.day, 5, "he set out from town on the campaign's day 4: his first day's walk is day 5");
  g.setDice(1); await g.call("bob", { op: "camp", id });
  assert.equal(ch().doing, "road");
  clock(10); // a week more goes by at home
  g.setDice(1); r = await g.call("bob", { op: "move", ids: [id], to: { q: 0, r: 0 } });
  assert.equal(r.ok, true, r.error); assert.equal(r.day, 6, "out in the wilderness his own days count, not the calendar's");
  g.store.docs.set(`oddCampaigns/c1/characters/${id}`, { ...ch(), hex: { q: 0, r: 0 }, where: "Langstead", doing: "town" });
  const m = await g.call("bob", { op: "map" });
  assert.equal(m.parties.find((x) => x.members.some((y) => y.id === id)).day, 11, "back in town, the campaign day carries him on");
});

test("giving: an item or gold passes to a character standing with him, by the shop's rules for what he may carry (v1.569.00)", async () => {
  const g = game(); const brom_ = brom, bromId = await brom_(g, "bob", "Brom"), leal = await brom_(g, "bob", "Leal"), ada = await brom_(g, "ann", "Ada");
  const ch = (id) => g.store.docs.get(`oddCampaigns/c1/characters/${id}`);
  const gold0 = ch(bromId).coins.gp, i = ch(bromId).items.findIndex((x) => x.key === "sword"); assert.ok(i >= 0);
  let r = await g.call("bob", { op: "give", id: bromId, to: leal, gp: 5 });
  assert.equal(r.ok, true, r.error); assert.equal(ch(bromId).coins.gp, gold0 - 5); assert.equal(r.other.coins.gp, ch(leal).coins.gp);
  assert.match((await g.call("bob", { op: "give", id: bromId, to: leal, gp: 99999 })).error, /he has/);
  const had = ch(leal).items.filter((x) => x.key === "sword").length;
  r = await g.call("bob", { op: "give", id: bromId, to: leal, item: i });
  assert.equal(r.ok, true, r.error); assert.equal(r.gave, "Sword"); assert.ok(!ch(bromId).items.some((x) => x.key === "sword")); assert.equal(ch(leal).items.filter((x) => x.key === "sword").length, had + 1);
  assert.equal(ch(bromId).coins.gp, gold0 - 5, "no gold changes hands for a gift"); assert.notEqual(ch(bromId).ready?.weapon, "sword");
  assert.match((await g.call("ann", { op: "give", id: bromId, to: ada, gp: 1 })).error, /not your character/);
  r = await g.call("bob", { op: "give", id: bromId, to: ada, gp: 1 }); assert.equal(r.ok, true, r.error);
  assert.ok([...g.store.docs.entries()].some(([k, v]) => k.includes("/chat/ann/") && /Brom gave Ada 1 gp/.test(v.text)), "a gift between players is told");
  // out on the road, only his own party
  g.store.docs.set(`oddCampaigns/c1/characters/${leal}`, { ...ch(leal), doing: "road", hex: { q: 1, r: -1 }, where: "clear" });
  assert.match((await g.call("bob", { op: "give", id: bromId, to: leal, gp: 1 })).error, /isn't with him/);
});

test("the marching order in a village: each player places his own, and two days' rest heals a point (v1.570.00)", async () => {
  const g = game(); const a = await brom(g, "bob", "Brom"), b = await brom(g, "bob", "Leal"), c = await brom(g, "ann", "Ada");
  const ch = (id) => g.store.docs.get(`oddCampaigns/c1/characters/${id}`);
  let r = await g.call("bob", { op: "march", id: a, order: [b, a] });
  assert.equal(r.ok, true, r.error); assert.equal(ch(b).march, 0); assert.equal(ch(a).march, 1);
  assert.match((await g.call("bob", { op: "march", id: a, order: [c, a] })).error, /not your character/);
  assert.equal((await g.call("kurt", { op: "march", id: a, order: [c, a, b] })).ok, true, "the referee places anyone");
  g.store.docs.set(`oddCampaigns/c1/characters/${a}`, { ...ch(a), hp: 1, maxHp: 6 });
  r = await g.call("bob", { op: "rest", id: a, days: 2 }); assert.equal(r.healed, 1, "one point after the second day");
});

test("meeting: whoever is behind is moved up to the other's day; the company's tokens move together or not at all (v1.571.00)", async () => {
  const g = game(); const a = await brom(g, "bob", "Brom"), b = await brom(g, "bob", "Leal"), c = await brom(g, "ann", "Ada");
  const ch = (id) => g.store.docs.get(`oddCampaigns/c1/characters/${id}`), set = (id, more) => g.store.docs.set(`oddCampaigns/c1/characters/${id}`, { ...ch(id), ...more });
  set(a, { day: 12 }); set(b, { day: 19 });
  let r = await g.call("bob", { op: "give", id: a, to: b, gp: 1 }); assert.equal(r.ok, true, r.error);
  assert.equal(ch(a).day, 19, "the giver was behind: he is moved up"); assert.equal(ch(b).day, 19);
  set(c, { day: 30 });
  r = await g.call("ann", { op: "party", ids: [c], with: a }); assert.equal(r.ok, true, r.error);
  assert.equal(ch(a).day, 30, "joined by one who is ahead, the party goes on from her day"); assert.equal(ch(c).day, 30);
  assert.equal(ch(b).day, 19, "Leal is no part of that party: his day stands");
  r = await g.call("bob", { op: "spots", id: a, spots: [{ id: a, x: 100, y: 120 }, { id: b, x: 126, y: 120 }] }); assert.equal(r.ok, true, r.error);
  assert.deepEqual([ch(a).spot, ch(b).spot], [{ x: 100, y: 120 }, { x: 126, y: 120 }]);
  r = await g.call("bob", { op: "spots", id: a, spots: [{ id: a, x: 300, y: 300 }, { id: c, x: 326, y: 300 }] });
  assert.match(r.error, /not your character/); assert.deepEqual(ch(a).spot, { x: 100, y: 120 }, "one refused: nobody moved");
});

test("the strongbox at the inn, and the heir: what is put away isn't carried, and comes out again (v1.573.00)", async () => {
  const g = game(); const id = await brom(g, "bob", "Brom"), ann = await brom(g, "ann", "Ada");
  const ch = () => g.store.docs.get(`oddCampaigns/c1/characters/${id}`);
  const gold = ch().coins.gp, i = ch().items.findIndex((x) => x.key === "sword");
  let r = await g.call("bob", { op: "stow", id, gp: 5 }); assert.equal(r.ok, true, r.error);
  assert.equal(ch().coins.gp, gold - 5); assert.deepEqual(ch().strongbox, { Langstead: { gp: 5, items: [] } });
  r = await g.call("bob", { op: "stow", id, item: i }); assert.equal(r.ok, true, r.error); assert.equal(r.what, "Sword");
  assert.ok(!ch().items.some((x) => x.key === "sword")); assert.deepEqual(ch().strongbox.Langstead.items, [{ key: "sword", qty: 1 }]); assert.equal(ch().coins.gp, gold - 5, "no gold changes hands");
  assert.match((await g.call("bob", { op: "fetch", id, gp: 99 })).error, /5 gp in the strongbox/);
  assert.match((await g.call("ann", { op: "fetch", id, gp: 1 })).error, /not your character/);
  r = await g.call("bob", { op: "fetch", id, item: 0 }); assert.equal(r.ok, true, r.error); assert.ok(ch().items.some((x) => x.key === "sword"));
  r = await g.call("bob", { op: "fetch", id, gp: 5 }); assert.equal(r.ok, true, r.error); assert.equal(ch().coins.gp, gold); assert.deepEqual(ch().strongbox, {}, "an empty box is no box");
  r = await g.call("bob", { op: "heir", id, name: "  Brand ", relation: "his brother" }); assert.equal(r.ok, true, r.error); assert.deepEqual(ch().heir, { name: "Brand", relation: "his brother" });
  r = await g.call("bob", { op: "heir", id, name: "" }); assert.equal(ch().heir ?? null, null, "no name: no heir");
  // no inn, no strongbox
  g.store.docs.set(`oddCampaigns/c1/characters/${id}`, { ...ch(), doing: "road", hex: { q: 1, r: -1 }, where: "clear" });
  assert.match((await g.call("bob", { op: "stow", id, gp: 1 })).error, /no inn here/);
});

test("men-at-arms (v1.574.00): a week of notices at the inn, the men who answer hired, paid by the month, and gone when unpaid", async () => {
  const g = game(); const id = await brom(g), path = `oddCampaigns/c1/characters/${id}`;
  const ch = () => g.store.docs.get(path), set = (o) => g.store.docs.set(path, { ...ch(), ...o });
  set({ coins: { ...ch().coins, gp: 50 }, doing: "town" });
  assert.equal((await g.call("bob", { op: "notice", id, gp: 100, types: ["lightFoot"] })).code, "bad-request", "100 gp at the least");
  assert.equal((await g.call("bob", { op: "hire", id, type: "lightFoot", n: 1 })).code, "bad-request", "nobody is waiting until notices are posted");
  set({ coins: { ...ch().coins, gp: 400 }, hp: 1, maxHp: 6 });
  assert.equal((await g.call("bob", { op: "notice", id, gp: 300, types: ["longbow"] })).code, "bad-request", "a village has no Longbowmen");
  assert.equal((await g.call("ann", { op: "notice", id, gp: 300, types: ["archer"] })).code, "forbidden");
  // 300 gp in a village: 60%. Light Foot d%=60 (they come), 1d6=4; Heavy Foot d%=61 (they don't); Archers d%=10, 1d6=2
  g.setDice(60, 4, 61, 10, 2);
  let r = await g.call("bob", { op: "notice", id, gp: 300, types: ["lightFoot", "heavyFoot", "archer", "longbow"] });
  assert.equal(r.ok, true, r.error); assert.deepEqual(r.found, { lightFoot: 4, archer: 2 }); assert.equal(r.day, 8, "the week passes");
  assert.equal(ch().coins.gp, 100); assert.equal(ch().day, 8); assert.equal(ch().hp, 4, "a week at the inn is a week's rest"); assert.equal(ch().notice.place, "Langstead");
  assert.ok(chat(g.store, "bob").some((e) => /posted notices at The Ox and Ford for a week \(300 gp\)\. 4 Light Foot, 2 Archers answered; no Heavy Foot\./.test(e.text) && e.kind === "travel"));
  assert.equal(chat(g.store, "ann").some((e) => /posted notices/.test(e.text)), false, "his own business");
  assert.equal((await g.call("bob", { op: "hire", id, type: "lightFoot", n: 5 })).code, "bad-request", "only four answered");
  assert.equal((await g.call("bob", { op: "hire", id, type: "heavyFoot", n: 1 })).code, "bad-request");
  r = await g.call("bob", { op: "hire", id, type: "lightFoot", n: 3 });
  assert.equal(r.ok, true, r.error); assert.equal(r.cost, 6); assert.deepEqual(ch().troops, { men: { lightFoot: 3 }, paidTo: 38 }); assert.equal(ch().coins.gp, 94); assert.deepEqual(ch().notice.found, { lightFoot: 1, archer: 2 });
  r = await g.call("bob", { op: "hire", id, type: "archer", n: 2 });
  assert.equal(r.cost, 10); assert.deepEqual(ch().troops, { men: { lightFoot: 3, archer: 2 }, paidTo: 38 }); assert.equal(ch().coins.gp, 84);
  // pay day: 16 gp a month. Resting 30 days brings day 38 and one month due
  r = await g.call("bob", { op: "rest", id, days: 30 });
  assert.equal(r.day, 38); assert.equal(ch().coins.gp, 68); assert.equal(ch().troops.paidTo, 68);
  assert.ok(chat(g.store, "bob").some((e) => /Brom paid his men-at-arms 16 gp; they are paid to day 68\./.test(e.text)));
  assert.equal((await g.call("bob", { op: "hire", id, type: "lightFoot", n: 1 })).code, "bad-request", "those who answered don't wait more than a week");
  r = await g.call("bob", { op: "dismiss", id, type: "archer", n: 1 });
  assert.equal(r.ok, true, r.error); assert.deepEqual(ch().troops.men, { lightFoot: 3, archer: 1 });
  // the month he cannot pay, they go
  set({ coins: { ...ch().coins, gp: 5 } });
  r = await g.call("bob", { op: "rest", id, days: 30 });
  assert.equal(ch().troops, null); assert.equal(ch().coins.gp, 5);
  assert.ok(chat(g.store, "bob").some((e) => /could not pay his men-at-arms \(3 Light Foot, 1 Archer; 11 gp a month\) and they left his service/.test(e.text)));
  // nothing written when the notice is refused for want of gold
  const lines = chat(g.store, "bob").length;
  assert.equal((await g.call("bob", { op: "notice", id, gp: 100, types: ["archer"] })).code, "bad-request"); assert.equal(chat(g.store, "bob").length, lines);
});

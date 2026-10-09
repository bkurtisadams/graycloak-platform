// odd/functions/test/character-service.test.mjs — slice 5 pass 4: the roster (oddCharacter).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as rules from "../../../packages/odd-chainmail-rules/index.js";
import { createCharacterService, characterPaths } from "../character-service.mjs";
import { createFightService, fightPaths } from "../fight-service.mjs";

const { fightStore } = rules;

function hasUndefined(v) {
  if (v === undefined) return true;
  if (Array.isArray(v)) return v.some(hasUndefined);
  if (v && typeof v === "object") return Object.values(v).some(hasUndefined);
  return false;
}
function memoryStore() {
  const docs = new Map();
  const copy = (v) => structuredClone(v);
  return {
    docs,
    async run(fn) {
      const staged = new Map();
      let wrote = false;
      const tx = {
        get: async (p) => { assert.equal(wrote, false, "Firestore: every read before any write"); return docs.has(p) ? copy(docs.get(p)) : null; },
        list: async (path) => { assert.equal(wrote, false, "Firestore: every read before any write"); return [...docs.entries()].filter(([k]) => k.startsWith(`${path}/`) && !k.slice(path.length + 1).includes("/")).map(([, d]) => copy(d)); },
        set: (p, d) => {
          wrote = true;
          assert.equal(fightStore.nestedArrayPath(d), null, `Firestore: no array inside an array (${p})`);
          assert.equal(hasUndefined(d), false, `Firestore: no undefined (${p})`);
          assert.ok(Buffer.byteLength(JSON.stringify(d)) < 1_000_000, `Firestore: under 1 MiB (${p})`);
          staged.set(p, copy(d));
        }
      };
      const out = await fn(tx);
      for (const [p, d] of staged) docs.set(p, d);
      return out;
    },
    async deleteTree(path) { for (const k of [...docs.keys()]) if (k === path || k.startsWith(`${path}/`)) docs.delete(k); }
  };
}


function game() {
  const store = memoryStore();
  store.docs.set("oddCampaigns/c1", { refereeUid: "kurt", referees: [], members: ["kurt", "bob", "ann"], people: { kurt: { name: "Kurt", role: "creator" }, bob: { name: "Bob", role: "player" }, ann: { name: "Ann", role: "player" } }, live: null });
  let n = 0;
  const svc = createCharacterService({ rules, store, now: () => 1000, rollDie: () => 4, newId: () => `ch${++n}` });
  const call = (uid, data) => svc.handle({ uid, data: { cid: "c1", ...data } });
  return { store, svc, call };
}

test("a player rolls, builds, shops and finishes a character; the server rolls every die", async () => {
  const { store, call } = game();
  assert.equal((await call("eve", { op: "roll" })).code, "forbidden", "not in the game");
  const r = await call("bob", { op: "roll" });
  assert.equal(r.ok, true, r.error);
  assert.equal(r.character.owner, "bob"); assert.equal(r.character.rolled.str, 12); assert.equal(r.character.coins.gp, 120);
  assert.equal((await call("bob", { op: "roll" })).code, "draft", "one unfinished character at a time");
  const id = r.character.id;
  assert.equal((await call("ann", { op: "basics", id, name: "Mine now" })).code, "forbidden", "another player can't touch it");
  let b = await call("bob", { op: "basics", id, name: "Brom", race: "dwarf", cls: "fighter", alignment: "law" });
  assert.equal(b.ok, true, b.error);
  assert.equal((await call("bob", { op: "basics", id, cls: "magic-user" })).ok, false, "a dwarf can't be a magic-user");
  for (const key of ["sword", "mail", "shield"]) assert.equal((await call("bob", { op: "buy", id, key })).ok, true, key);
  assert.equal((await call("bob", { op: "buy", id, key: "warhorseh" })).ok, false, "no mounts yet");
  const f = await call("bob", { op: "finish", id });
  assert.equal(f.ok, true, f.error);
  assert.equal(f.character.status, "ready"); assert.equal(f.character.hp, 5, "1+1 hit dice: 4 + 1");
  assert.deepEqual(store.docs.get(characterPaths("c1").character(id)).hp, 5, "written to the roster");
  assert.equal((await call("bob", { op: "buy", id, key: "dagger" })).ok, false, "finished: no more shopping here");
  assert.equal((await call("kurt", { op: "rename", id, name: "Brom the Bold" })).ok, true, "the referee may change a player's character");
  assert.equal((await call("bob", { op: "notes", id, notes: "Owes the innkeeper 5 gp." })).character.notes, "Owes the innkeeper 5 gp.");
  assert.equal((await call("bob", { op: "roll" })).ok, true, "finished, so he may roll another");
});

test("rolls stand: only the referee throws a character away", async () => {
  const { store, svc, call } = game();
  const id = (await call("bob", { op: "roll" })).character.id;
  assert.equal((await call("bob", { op: "delete", id })).code, "forbidden");
  assert.equal((await call("kurt", { op: "delete", id })).ok, true);
  assert.equal(store.docs.has(characterPaths("c1").character(id)), false);
  assert.equal((await call("bob", { op: "roll" })).ok, true, "and then he rolls again");
});

test("a roster character opens a fight with his own hit points and pack", async () => {
  const { store, call } = game();
  const id = (await call("bob", { op: "roll" })).character.id;
  await call("bob", { op: "basics", id, name: "Brom", cls: "fighter" });
  for (const key of ["sword", "shortbow", "quiver20"]) await call("bob", { op: "buy", id, key });
  const ch = (await call("bob", { op: "finish", id })).character;
  const fights = createFightService({ rules, store, now: () => 2000, newSeed: () => 7 });
  const walls = Array.from({ length: 10 }, () => Array(20).fill(false));
  const fig = { ...rules.roster.toFigure(ch, { id: 1, side: "A" }), x: 2, y: 5, placed: true };
  const orc = { id: 2, side: "B", kind: "monster", monsterKey: "orc", name: "Orc 1", ac: 6, x: 15, y: 5, placed: true, stance: "attack", target: null, action: "melee" };
  const state = { phase: "setup", width: 20, height: 10, walls, chests: [], figures: [fig, orc], nextId: 3 };
  const res = await fights.create({ uid: "kurt", name: "Kurt", data: { cid: "c1", fid: "f1", rules: fightStore.RULES_VERSION, fight: fightStore.toStored(state), control: { 1: "bob", 2: "referee" } } });
  assert.equal(res.ok, true, res.error);
  const saved = fightStore.fromStored(store.docs.get(fightPaths("c1", "f1").state));
  const brom = saved.figures.find((f) => f.id === 1);
  assert.equal(brom.hp, ch.hp, "his hit points, not a fresh roll"); assert.equal(brom.maxHp, ch.maxHp);
  assert.equal(rules.missiles.ammoLeft(brom), 20, "his own quiver");
  assert.equal(brom.charId, id, "tied to his record");
  const view = store.docs.get(fightPaths("c1", "f1").view("bob"));
  assert.equal(view.figures.find((f) => f.id === 1).charId, id, "the player's page knows which character it is");
});

test("Foundry's way: the referee gives a character to another player; a player is assigned a character he owns", async () => {
  const { store, call } = game();
  const id = (await call("bob", { op: "roll" })).character.id;
  await call("bob", { op: "basics", id, name: "Brom" }); await call("bob", { op: "buy", id, key: "sword" }); await call("bob", { op: "finish", id });
  const { createCampaignService } = await import("../campaign-service.mjs");
  const games = createCampaignService({ palette: rules.fightView.PLAYER_COLOURS, refereeColour: rules.fightView.REFEREE_COLOUR, store, now: () => 1000 });
  const prof = (uid, data) => games.handle({ uid, email: `${uid}@x.test`, name: uid, data: { op: "profile", cid: "c1", ...data } });
  assert.equal((await prof("ann", { character: id })).ok, false, "Ann doesn't own Brom");
  const mine = await prof("bob", { character: id });
  assert.equal(mine.ok, true, mine.error); assert.equal(mine.game.people.bob.character, id);
  assert.equal((await prof("ann", { uid: "bob", character: null })).code, "forbidden", "a player can't change another");
  assert.equal((await prof("kurt", { uid: "bob", character: null })).game.people.bob.character, null, "the referee can");
  assert.equal((await call("bob", { op: "owner", id, uid: "ann" })).code, "forbidden");
  const moved = await call("kurt", { op: "owner", id, uid: "ann" });
  assert.equal(moved.ok, true, moved.error); assert.equal(moved.character.owner, "ann"); assert.equal(moved.character.ownerName, "Ann");
  assert.equal((await prof("ann", { character: id })).ok, true, "now Ann may take him as her character");
  assert.equal((await call("kurt", { op: "owner", id, uid: "eve" })).ok, false, "only to a member");
});

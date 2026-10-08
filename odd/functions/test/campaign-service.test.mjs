// odd/functions/test/campaign-service.test.mjs — slice 5 pass 3: the game (join link, roles, invites, live fight).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as rules from "../../../packages/odd-chainmail-rules/index.js";
import { createCampaignService, isReferee } from "../campaign-service.mjs";
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

let codes = 0;
const games = (store) => createCampaignService({ palette: rules.fightView.PLAYER_COLOURS, refereeColour: rules.fightView.REFEREE_COLOUR, store, now: () => 1000, newCode: () => `CODE${++codes}` });
const call = (svc, uid, data, extra = {}) => svc.handle({ uid, email: extra.email ?? `${uid}@x.test`, name: extra.name ?? uid, data });

test("the referee starts the game; a player joins by the link, picks a colour, and the referee sees him", async () => {
  const store = memoryStore(), g = games(store);
  store.docs.set("campaigns/c1", { ownerUid: "kurt", name: "Castle Blackrock" });
  assert.equal((await call(g, "bob", { op: "open", cid: "c1" })).code, "forbidden", "not the GCC owner");
  const r = await call(g, "kurt", { op: "open", cid: "c1" }, { name: "Kurt" });
  assert.equal(r.ok, true, r.error);
  assert.equal(r.game.name, "Castle Blackrock"); assert.ok(r.game.joinCode); assert.deepEqual(r.game.members, ["kurt"]);
  assert.equal((await call(g, "bob", { op: "join", cid: "c1", code: "WRONG" })).code, "forbidden", "a wrong code");
  const j = await call(g, "bob", { op: "join", cid: "c1", code: r.game.joinCode.toLowerCase() }, { name: "Bob" });
  assert.equal(j.ok, true, j.error); assert.equal(j.joined, true, "a first join says so (the page shows the welcome card)");
  assert.equal((await call(g, "bob", { op: "join", cid: "c1", code: r.game.joinCode })).joined, undefined, "a second visit doesn't");
  assert.equal(j.game.joinCode, undefined, "players never see the join code");
  assert.ok(j.game.members.includes("bob") && j.game.people.bob.name === "Bob" && j.game.people.bob.role === "player");
  const ann = await call(g, "ann", { op: "join", cid: "c1", code: r.game.joinCode }, { name: "Ann" });
  assert.notEqual(ann.game.people.ann.color, ann.game.people.bob.color, "each newcomer gets a free colour");
  assert.equal((await call(g, "bob", { op: "profile", cid: "c1", color: ann.game.people.ann.color })).code, "bad-request", "not a taken colour");
  const pr = await call(g, "bob", { op: "profile", cid: "c1", name: "Bob the Bold", color: rules.fightView.PLAYER_COLOURS[5] });
  assert.equal(pr.game.people.bob.name, "Bob the Bold");
  assert.equal((await call(g, "carl", { op: "profile", cid: "c1", name: "x" })).code, "forbidden", "outsiders change nothing");
});

test("invited by email: joins from the game URL without the code; removal resets the link", async () => {
  const store = memoryStore(), g = games(store);
  const r = await call(g, "kurt", { op: "open", cid: "c2", name: "Test" });
  assert.equal((await call(g, "bob", { op: "invite", cid: "c2", emails: ["x@y.z"] })).code, "forbidden", "only members, and only referees, invite");
  assert.equal((await call(g, "kurt", { op: "invite", cid: "c2", emails: ["Dave@Example.com", "bad"] })).code, "bad-request");
  const inv = await call(g, "kurt", { op: "invite", cid: "c2", emails: ["Dave@Example.com"] });
  assert.deepEqual(inv.game.invited, ["dave@example.com"]);
  const d = await call(g, "dave", { op: "join", cid: "c2" }, { email: "dave@example.com", name: "Dave" });
  assert.equal(d.ok, true, d.error); assert.ok(d.game.members.includes("dave"));
  assert.deepEqual(store.docs.get("oddCampaigns/c2").invited, [], "the invitation is used up");
  const before = store.docs.get("oddCampaigns/c2").joinCode;
  assert.equal((await call(g, "dave", { op: "remove", cid: "c2", uid: "kurt" })).code, "forbidden");
  const rm = await call(g, "kurt", { op: "remove", cid: "c2", uid: "dave" });
  assert.equal(rm.ok, true); assert.ok(!rm.game.members.includes("dave"));
  assert.notEqual(rm.game.joinCode, before, "removing someone resets the join link");
  assert.equal((await call(g, "dave", { op: "join", cid: "c2", code: before })).code, "forbidden", "his old link no longer works");
});

test("a co-referee runs fights; the live fight is set when a fight opens and cleared by the referee", async () => {
  const store = memoryStore(), g = games(store);
  const r = await call(g, "kurt", { op: "open", cid: "c3", name: "Test" });
  await call(g, "bob", { op: "join", cid: "c3", code: r.game.joinCode });
  await call(g, "ann", { op: "join", cid: "c3", code: r.game.joinCode });
  assert.equal((await call(g, "bob", { op: "role", cid: "c3", uid: "ann", referee: true })).code, "forbidden", "only the Creator names referees");
  const ro = await call(g, "kurt", { op: "role", cid: "c3", uid: "ann", referee: true });
  assert.ok(ro.game.referees.includes("ann") && isReferee(store.docs.get("oddCampaigns/c3"), "ann"));
  // Ann, as co-referee, opens a fight with Bob in it by account
  const fs = createFightService({ rules, store, now: () => 1, newSeed: () => 5 });
  const tester = () => { const st = { phase: "fight", round: 0, step: "init", width: 20, height: 10, walls: Array.from({ length: 10 }, () => Array(20).fill(false)), figures: [
    { id: 1, side: "A", kind: "pc", name: "Fighting-Man 1", cls: "fighter", level: 1, ac: 4, weaponId: "sword", x: 2, y: 5, placed: true },
    { id: 2, side: "B", kind: "monster", monsterKey: "orc", name: "Orc 1", ac: 6, x: 15, y: 5, placed: true }] }; return st; };
  const f = await fs.create({ uid: "ann", name: "Ann", data: { cid: "c3", fid: "f1", rules: rules.fightStore.RULES_VERSION, fight: rules.fightStore.toStored(tester()), control: { 1: "bob", 2: "game" } } });
  assert.equal(f.ok, true, f.error);
  const camp = store.docs.get("oddCampaigns/c3");
  assert.equal(camp.live.fid, "f1", "the fight opened is the game's live fight");
  assert.equal(store.docs.get(fightPaths("c3", "f1").fight).people.bob.name, "bob", "the player's name comes from the game");
  assert.equal((await fs.create({ uid: "ann", name: "Ann", data: { cid: "c3", fid: "f2", rules: rules.fightStore.RULES_VERSION, fight: rules.fightStore.toStored(tester()), control: { 1: "stranger" } } })).code, "bad-request", "only members can be given figures");
  assert.equal((await call(g, "bob", { op: "live", cid: "c3", fid: null })).code, "forbidden", "players don't move the game");
  assert.equal((await call(g, "kurt", { op: "live", cid: "c3", fid: "nope" })).code, "not-found");
  const back = await call(g, "kurt", { op: "live", cid: "c3", fid: null });
  assert.equal(back.game.live, null, "back to the lobby");
  // presence
  await call(g, "bob", { op: "here", cid: "c3" });
  assert.equal(store.docs.get("oddCampaigns/c3/presence/bob").seen, 1000);
});

test("lobby chat: members talk without a fight; a player can tell the referee alone", async () => {
  const store = memoryStore(), g = games(store);
  const r = await call(g, "kurt", { op: "open", cid: "c4", name: "Test" }, { name: "Kurt" });
  await call(g, "bob", { op: "join", cid: "c4", code: r.game.joinCode }, { name: "Bob" });
  await call(g, "ann", { op: "join", cid: "c4", code: r.game.joinCode }, { name: "Ann" });
  const fs = createFightService({ rules, store, now: () => 5, rollDie: () => 3 });
  const lines = (who) => [...store.docs.keys()].filter((k) => k.startsWith(`oddCampaigns/c4/chat/${who}/entries/`)).map((k) => store.docs.get(k));
  const c = await fs.chat({ uid: "bob", data: { cid: "c4", text: "welcome, Ann" } });
  assert.equal(c.ok, true, c.error);
  assert.ok(["referee", "bob", "ann"].every((w) => lines(w).some((e) => e.text === "welcome, Ann" && e.person === "Bob")));
  await fs.chat({ uid: "ann", data: { cid: "c4", text: "/roll 2d6", to: "referee" } });
  assert.ok(lines("referee").some((e) => e.roll?.total === 6) && !lines("bob").some((e) => e.roll));
  assert.equal((await fs.chat({ uid: "carl", data: { cid: "c4", text: "hi" } })).code, "forbidden");
});

// The fight service on a memory store that refuses what Firestore refuses.
// Run from odd\functions:  npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import * as rules from "../../../packages/odd-chainmail-rules/index.js";
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
    }
  };
}

const open = (w, h) => Array.from({ length: h }, () => Array(w).fill(false));
const pc = (id, x, y) => ({ id, side: "A", origSide: "A", name: `Hero ${id}`, kind: "pc", cls: "fighter", level: 3, armor: "chain+shield", ac: 4, weaponId: "sword", dex: 10, x, y, placed: true, hp: 14, maxHp: 14, stance: "attack", target: null, action: "melee", slotsLeft: [], inv: { coins: { gp: 0 }, items: [] } });
const orc = (id, x, y) => ({ id, side: "B", origSide: "B", name: `Orc ${id}`, kind: "monster", monsterKey: "orc", ac: 6, x, y, placed: true, hp: 5, maxHp: 5, stance: "attack", target: null, action: "melee" });
const tester = () => ({ phase: "fight", round: 0, step: "init", width: 30, height: 10, walls: open(30, 10), contacts: new Map(), chests: [], leader: { A: null, B: null }, encounter: new Map(), figures: [pc(1, 4, 5), pc(2, 4, 6), orc(3, 20, 5), orc(4, 20, 6)], selected: 1 });

async function opened(control = { 1: "kurt", 2: "bob", 3: "game", 4: "game" }) {
  const store = memoryStore();
  const svc = createFightService({ rules, store, now: () => 1000, newSeed: () => 5 });
  const r = await svc.create({ uid: "ref", data: { cid: "camp1", fid: "f1", title: "Orc ambush", rules: fightStore.RULES_VERSION, fight: fightStore.toStored(tester()), control } });
  assert.equal(r.ok, true, r.error);
  return { store, svc, p: fightPaths("camp1", "f1") };
}
const header = (store, p) => store.docs.get(p.fight);
// Play the players' side until it is their move.
async function toPlayersMove(svc, store, p) {
  for (let i = 0; i < 4 && header(store, p).step === "elect"; i++) {
    await svc.act({ uid: "kurt", data: { cid: "camp1", fid: "f1", rev: header(store, p).rev, rules: fightStore.RULES_VERSION, action: { type: "elect", side: "A", choice: "counter" } } });
  }
}

test("opening a fight makes the campaign, seeds the dice on the server and writes a view per viewer", async () => {
  const { store, p } = await opened();
  assert.equal(store.docs.get(p.campaign).refereeUid, "ref");
  const h = header(store, p);
  assert.equal(h.rev, 1); assert.equal(h.title, "Orc ambush"); assert.deepEqual(h.players, ["bob", "kurt"]);
  assert.equal(h.round, 1, "the first round has begun");
  const st = store.docs.get(p.state);
  assert.ok(st.rngState && typeof st.rngState.s === "number" && !("selected" in st), "dice saved; page fields dropped");
  for (const who of ["referee", "kurt", "bob"]) assert.equal(store.docs.get(p.view(who)).rev, 1, `view for ${who}`);
  assert.equal(store.docs.get(p.view("kurt")).figures.find((f) => f.id === 3).hp, undefined, "no orc hit points for a player");
});

test("only the campaign's referee opens fights in it, and a fight id is used once", async () => {
  const { svc } = await opened();
  const base = { cid: "camp1", rules: fightStore.RULES_VERSION, fight: fightStore.toStored(tester()), control: {} };
  assert.equal((await svc.create({ uid: "kurt", data: { ...base, fid: "f2" } })).code, "forbidden");
  assert.equal((await svc.create({ uid: "ref", data: { ...base, fid: "f1" } })).code, "exists");
  assert.equal((await svc.create({ uid: "ref", data: { ...base, fid: "f2", control: { 99: "kurt" } } })).code, "bad-request");
  assert.equal((await svc.create({ uid: null, data: base })).code, "auth");
});

test("players move their own figures, Done ends the shared move, stale and foreign actions are refused", async () => {
  const { store, svc, p } = await opened();
  await toPlayersMove(svc, store, p);
  assert.equal(header(store, p).step, "move-A");
  assert.deepEqual(header(store, p).waitingOn, ["bob", "kurt"]);
  const send = (uid, action, rev = header(store, p).rev) => svc.act({ uid, data: { cid: "camp1", fid: "f1", rev, rules: fightStore.RULES_VERSION, action } });

  const rev = header(store, p).rev;
  const moved = await send("kurt", { type: "move", id: 1, x: 7, y: 5 });
  assert.equal(moved.ok, true, moved.error); assert.equal(moved.rev, rev + 1);
  assert.equal(store.docs.get(p.action(rev + 1)).uid, "kurt", "the action is recorded");
  assert.equal((await send("bob", { type: "move", id: 2, x: 7, y: 6 }, rev)).code, "stale", "Bob's page was a rev behind");
  assert.equal((await send("bob", { type: "move", id: 1, x: 8, y: 5 })).code, "refused", "not Bob's figure");
  assert.equal((await send("mallory", { type: "move", id: 1, x: 8, y: 5 })).code, "forbidden");
  assert.equal((await svc.act({ uid: "kurt", data: { cid: "camp1", fid: "f1", rev: header(store, p).rev, rules: "0.1.0", action: { type: "done" } } })).code, "rules");
  const revBefore = header(store, p).rev;
  assert.equal((await send("kurt", { type: "melee" })).ok, false);
  assert.equal(header(store, p).rev, revBefore, "a refusal writes nothing");

  assert.equal((await send("kurt", { type: "done" })).ok, true);
  assert.deepEqual(header(store, p).waitingOn, ["bob"]);
  const roundBefore = header(store, p).round;
  const d = await send("bob", { type: "done" });
  assert.equal(d.ok, true, d.error);
  assert.ok(header(store, p).round > roundBefore || header(store, p).phase === "over" || header(store, p).step !== "move-A", "the round played on without anyone pressing a button");
});

test("each viewer's feed gets only what that viewer may see", async () => {
  const { store, svc, p } = await opened({ 1: "kurt", 2: "bob", 3: "game", 4: "game" });
  await toPlayersMove(svc, store, p);
  const send = (uid, action) => svc.act({ uid, data: { cid: "camp1", fid: "f1", rev: header(store, p).rev, rules: fightStore.RULES_VERSION, action } });
  const r = await send("kurt", { type: "orders", id: 1, target: 3, stance: "parry" });
  assert.equal(r.ok, true, r.error);
  assert.equal(r.events[0].type, "orders", "the sender sees his own orders");
  assert.ok(store.docs.get(p.feed("kurt", r.rev)), "Kurt's feed has the entry");
  assert.equal(store.docs.get(p.feed("bob", r.rev)), undefined, "Bob's feed doesn't");
  assert.ok(store.docs.get(p.feed("referee", r.rev)), "the referee's does");
  const feeds = [...store.docs.entries()].filter(([k]) => k.includes("/feeds/kurt/") || k.includes("/feeds/bob/"));
  assert.ok(feeds.every(([, v]) => v.events.every((e) => e.type !== "behaviour" && e.type !== "gm")), "no behaviour lines or GM tools in players' feeds");
});

test("a fight run by the game on both sides plays one round per action", async () => {
  const { store, svc, p } = await opened({ 1: "game", 2: "game", 3: "game", 4: "game" });
  const r1 = header(store, p).round;
  const r = await svc.act({ uid: "ref", data: { cid: "camp1", fid: "f1", rev: header(store, p).rev, rules: fightStore.RULES_VERSION, action: { type: "gm", id: 1, tool: "invulnerable", value: true } } });
  assert.equal(r.ok, true, r.error);
  assert.ok(header(store, p).round === r1 + 1 || header(store, p).phase === "over");
  assert.deepEqual(header(store, p).players, []);
});

test("players are named by email; the server finds their accounts", async () => {
  const store = memoryStore();
  const accounts = { "bob@example.com": "uid-bob", "gm@example.com": "ref" };
  const svc = createFightService({ rules, store, now: () => 1, newSeed: () => 3, resolveUser: async (e) => accounts[e] ?? null });
  const base = { cid: "camp2", rules: fightStore.RULES_VERSION, fight: fightStore.toStored(tester()), control: { 3: "game", 4: "game" } };
  const r = await svc.create({ uid: "ref", data: { ...base, fid: "f1", players: { 1: " Bob@Example.com ", 2: "gm@example.com" } } });
  assert.equal(r.ok, true, r.error);
  assert.deepEqual(r.players, ["uid-bob"], "the answer says who was added");
  const p = fightPaths("camp2", "f1");
  const st = fightStore.fromStored(store.docs.get(p.state));
  assert.equal(st.control[1], "uid-bob", "Bob's email finds his account");
  assert.equal(st.control[2], "referee", "the referee's own email: he runs it");
  assert.deepEqual(store.docs.get(p.fight).players, ["uid-bob"]);
  const missing = await svc.create({ uid: "ref", data: { ...base, fid: "f2", players: { 1: "nobody@example.com" } } });
  assert.equal(missing.code, "no-account");
  assert.match(missing.error, /signs in once/);
  assert.equal((await svc.create({ uid: "ref", data: { ...base, fid: "f3", players: { 1: "not-an-email" } } })).code, "bad-request");
});

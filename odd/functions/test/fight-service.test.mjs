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

const open = (w, h) => Array.from({ length: h }, () => Array(w).fill(false));
const pc = (id, x, y) => ({ id, side: "A", origSide: "A", name: `Hero ${id}`, kind: "pc", cls: "fighter", level: 3, armor: "chain+shield", ac: 4, weaponId: "sword", dex: 10, x, y, placed: true, hp: 14, maxHp: 14, stance: "attack", target: null, action: "melee", slotsLeft: [], inv: { coins: { gp: 0 }, items: [] } });
const orc = (id, x, y) => ({ id, side: "B", origSide: "B", name: `Orc ${id}`, kind: "monster", monsterKey: "orc", ac: 6, x, y, placed: true, hp: 5, maxHp: 5, stance: "attack", target: null, action: "melee" });
const tester = () => ({ phase: "fight", round: 0, step: "init", width: 30, height: 10, walls: open(30, 10), contacts: new Map(), chests: [], leader: { A: null, B: null }, encounter: new Map(), figures: [pc(1, 4, 5), pc(2, 4, 6), orc(3, 20, 5), orc(4, 20, 6)], selected: 1 });

async function opened(control = { 1: "kurt", 2: "bob", 3: "game", 4: "game" }, seed = 5) {
  const store = memoryStore();
  const svc = createFightService({ rules, store, now: () => 1000, newSeed: () => seed });
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
  assert.equal((await svc.act({ uid: "kurt", data: { cid: "camp1", fid: "f1", rev: header(store, p).rev, rules: "0.1.0", action: { type: "ready", ids: [1] } } })).code, "rules");
  const revBefore = header(store, p).rev;
  assert.equal((await send("kurt", { type: "melee" })).ok, false);
  assert.equal(header(store, p).rev, revBefore, "a refusal writes nothing");

  assert.equal((await send("kurt", { type: "ready", ids: [1] })).ok, true);
  assert.deepEqual(header(store, p).waitingOn, ["bob"]);
  assert.deepEqual(header(store, p).unready, [2]);
  assert.deepEqual(header(store, p).readyCount, { ready: 1, of: 2 });
  const roundBefore = header(store, p).round;
  const d = await send("bob", { type: "ready", ids: [2] });
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
  // the server rolls hit points, so pick a seed whose fight is still running once it opens
  let o; for (let seed = 1; seed < 60; seed++) { o = await opened({ 1: "game", 2: "game", 3: "game", 4: "game" }, seed); if (header(o.store, o.p).phase === "fight") break; }
  const { store, svc, p } = o;
  assert.equal(header(store, p).phase, "fight", "found a seed that leaves the fight running");
  const r1 = header(store, p).round;
  const r = await svc.act({ uid: "ref", data: { cid: "camp1", fid: "f1", rev: header(store, p).rev, rules: fightStore.RULES_VERSION, action: { type: "gm", id: 1, tool: "invulnerable", value: true } } });
  assert.equal(r.ok, true, r.error);
  assert.ok(header(store, p).round === r1 + 1 || header(store, p).phase === "over");
  assert.deepEqual(header(store, p).players, []);
});

test("the server rolls the opening dice: hit points from its own seed, not the page's", async () => {
  const sent = tester(); for (const f of sent.figures) { f.hp = 999; f.maxHp = 999; }
  const store = memoryStore();
  const svc = createFightService({ rules, store, now: () => 1, newSeed: () => 7 });
  const r = await svc.create({ uid: "ref", data: { cid: "c9", fid: "f1", rules: fightStore.RULES_VERSION, fight: fightStore.toStored(sent), control: { 3: "game", 4: "game" } } });
  assert.equal(r.ok, true, r.error);
  const p = fightPaths("c9", "f1"), init = fightStore.fromStored(store.docs.get(p.initial));
  assert.ok(init.figures.every((f) => f.hp !== 999 && f.hp === f.maxHp && f.hp >= 1), "every figure's hit points rolled on the server");
  const refFeed = store.docs.get(p.feed("referee", 1));
  assert.ok(refFeed.events.some((e) => e.type === "opened" && e.hp.length === 4), "the referee's log gets the opening rolls");
  const again = memoryStore(), svc2 = createFightService({ rules, store: again, now: () => 1, newSeed: () => 7 });
  await svc2.create({ uid: "ref", data: { cid: "c9", fid: "f1", rules: fightStore.RULES_VERSION, fight: fightStore.toStored(tester()), control: { 3: "game", 4: "game" } } });
  assert.deepEqual(fightStore.fromStored(again.docs.get(p.initial)).figures.map((f) => f.hp), init.figures.map((f) => f.hp), "the same server seed gives the same hit points, whatever the page sent");
});

test("the server rolls lair hoards too, unless the referee set them in Setup", async () => {
  const sent = tester();
  sent.chests = [
    { id: 1, x: 25, y: 2, monsterKey: "orc", label: "Orc hoard (type D)", original: { coins: { cp: 0, sp: 0, gp: 1 }, items: [] }, value: 1 },
    { id: 2, x: 25, y: 3, monsterKey: "orc", set: true, label: "Orc hoard (type D)", original: { coins: { cp: 0, sp: 0, gp: 777 }, items: [] }, value: 777 }];
  const store = memoryStore();
  const svc = createFightService({ rules, store, now: () => 1, newSeed: () => 11 });
  const r = await svc.create({ uid: "ref", data: { cid: "c8", fid: "f1", rules: fightStore.RULES_VERSION, fight: fightStore.toStored(sent), control: { 3: "game", 4: "game" } } });
  assert.equal(r.ok, true, r.error);
  const st = fightStore.fromStored(store.docs.get(fightPaths("c8", "f1").state));
  assert.deepEqual(st.chests[0].inv, rules.fightStart.rollLairHoard("orc", 11, 1).inv, "an unset hoard is rolled from the server's seed");
  assert.equal(st.chests[1].inv.coins.gp, 777, "a hoard the referee set is kept");
  const bob = store.docs.get(fightPaths("c8", "f1").view("bob"));
  assert.ok(!bob || !("chests" in bob), "players never see the hoards");
});

test("players are named by email; the server finds their accounts", async () => {
  const store = memoryStore();
  const accounts = { "bob@example.com": { uid: "uid-bob", name: "Bob" }, "ann@example.com": { uid: "uid-ann", name: "Ann" }, "gm@example.com": "ref" };
  const svc = createFightService({ rules, store, now: () => 1, newSeed: () => 3, resolveUser: async (e) => accounts[e] ?? null });
  const base = { cid: "camp2", rules: fightStore.RULES_VERSION, fight: fightStore.toStored(tester()), control: { 3: "game", 4: "game" } };
  const r = await svc.create({ uid: "ref", name: "Kurt", data: { ...base, fid: "f1", players: { 1: " Bob@Example.com ", 2: "gm@example.com", 3: "ann@example.com" }, control: { 4: "game" } } });
  assert.equal(r.ok, true, r.error);
  assert.deepEqual(r.players, ["uid-ann", "uid-bob"], "the answer says who was added");
  const p = fightPaths("camp2", "f1");
  const st = fightStore.fromStored(store.docs.get(p.state));
  assert.equal(st.control[1], "uid-bob", "Bob's email finds his account");
  assert.equal(st.control[2], "referee", "the referee's own email: he runs it");
  assert.deepEqual(store.docs.get(p.fight).players, ["uid-ann", "uid-bob"]);
  assert.equal(st.people.referee.name, "Kurt");
  assert.equal(st.people["uid-bob"].name, "Bob");
  assert.notEqual(st.people["uid-bob"].color, st.people["uid-ann"].color, "each player gets his own colour");
  assert.equal(store.docs.get(p.view("uid-bob")).people["uid-ann"].name, "Ann", "players see each other's names and colours");
  const missing = await svc.create({ uid: "ref", data: { ...base, fid: "f2", players: { 1: "nobody@example.com" } } });
  assert.equal(missing.code, "no-account");
  assert.match(missing.error, /signs in once/);
  assert.equal((await svc.create({ uid: "ref", data: { ...base, fid: "f3", players: { 1: "not-an-email" } } })).code, "bad-request");
});

test("the referee deletes a fight and everything under it; nobody else can", async () => {
  const { store, svc, p } = await opened();
  assert.equal((await svc.remove({ uid: "kurt", data: { cid: "camp1", fid: "f1" } })).code, "forbidden");
  assert.ok(store.docs.has(p.fight));
  assert.equal((await svc.remove({ uid: "ref", data: { cid: "camp1", fid: "f1" } })).ok, true);
  assert.equal([...store.docs.keys()].filter((k) => k.startsWith(p.fight)).length, 0, "header, state, views, feeds and actions all gone");
  assert.ok(store.docs.has(p.campaign), "the campaign stays");
  assert.equal((await svc.remove({ uid: "ref", data: { cid: "camp1", fid: "f1" } })).code, "not-found");
});

test("Undo takes back the last action, rebuilt from the opening state with the same dice", async () => {
  const { store, svc, p } = await opened({ 1: "kurt", 2: "bob", 3: "referee", 4: "referee" });
  const send = (uid, action) => svc.act({ uid, data: { cid: "camp1", fid: "f1", rev: header(store, p).rev, rules: fightStore.RULES_VERSION, action } });
  for (let i = 0; i < 4 && header(store, p).step !== "move-A"; i++) {
    const h = header(store, p), st = store.docs.get(p.state);
    if (h.step === "elect") await send(st.init.winner === "A" ? "kurt" : "ref", { type: "elect", side: st.init.winner, choice: st.init.winner === "A" ? "move" : "counter" });
    else await send("ref", { type: "force-next" });
  }
  assert.equal(header(store, p).step, "move-A");
  const before = store.docs.get(p.state).figures.find((f) => f.id === 1);
  assert.equal((await send("kurt", { type: "move", id: 1, x: before.x + 3, y: before.y })).ok, true);
  assert.equal(store.docs.get(p.state).figures.find((f) => f.id === 1).x, before.x + 3);
  assert.equal((await send("kurt", { type: "undo" })).code, "forbidden", "a player can't undo");
  const u = await send("ref", { type: "undo" });
  assert.equal(u.ok, true, u.error);
  assert.match(u.events[0].what, /Fighting-Man|Hero 1|moved/);
  const after = store.docs.get(p.state).figures.find((f) => f.id === 1);
  assert.equal(after.x, before.x, "he's back where he was");
  assert.equal(after.moved ?? 0, before.moved ?? 0, "with his move");
  const recs = [...store.docs.entries()].filter(([k]) => k.startsWith(`${p.fight}/actions/`)).map(([, d]) => d);
  assert.ok(recs.some((r) => r.undone && r.action.type === "move"), "the undone move is kept, marked undone");
  // a second Undo walks further back (the election, if there was one, or says there's nothing)
  const u2 = await send("ref", { type: "undo" });
  assert.ok(u2.ok || u2.code === "nothing");
});

test("chat: everyone, the referee alone, or one player; /roll is rolled on the server; the rev doesn't move", async () => {
  const store = memoryStore();
  const svc = createFightService({ rules, store, now: () => 1234, newSeed: () => 5, rollDie: (n) => n });
  await svc.create({ uid: "ref", name: "Kurt", data: { cid: "c7", fid: "f1", rules: fightStore.RULES_VERSION, fight: fightStore.toStored(tester()), control: { 1: "kurt", 2: "bob", 3: "game", 4: "game" } } });
  const p = fightPaths("c7", "f1"), rev0 = store.docs.get(p.fight).rev;
  const lines = (who) => [...store.docs.keys()].filter((k) => k.startsWith(`${p.fight}/chat/${who}/entries/`)).map((k) => store.docs.get(k));
  let r = await svc.chat({ uid: "kurt", data: { cid: "c7", fid: "f1", text: "  Charge!  ", as: 1 } });
  assert.equal(r.ok, true, r.error);
  assert.ok(["referee", "kurt", "bob"].every((w) => lines(w).some((e) => e.text === "Charge!" && e.as === store.docs.get(p.state).figures.find((f) => f.id === 1).name)), "everyone reads it, spoken as Kurt's character");
  r = await svc.chat({ uid: "bob", data: { cid: "c7", fid: "f1", text: "/roll 2d6+1", to: "referee" } });
  assert.equal(r.ok, true, r.error);
  const roll = lines("referee").find((e) => e.roll);
  assert.deepEqual([roll.roll.expr, roll.roll.dice, roll.roll.total], ["2d6+1", [6, 6], 13], "the server rolls");
  assert.ok(lines("bob").some((e) => e.roll) && !lines("kurt").some((e) => e.roll), "a private line: Bob and the referee only");
  r = await svc.chat({ uid: "ref", data: { cid: "c7", fid: "f1", text: "You hear a click.", to: "kurt" } });
  assert.ok(r.ok && lines("kurt").some((e) => e.text === "You hear a click.") && !lines("bob").some((e) => e.text === "You hear a click."), "the referee to one player");
  assert.equal((await svc.chat({ uid: "bob", data: { cid: "c7", fid: "f1", text: "hi", as: 1 } })).code, "forbidden", "not as another player's character");
  assert.equal((await svc.chat({ uid: "bob", data: { cid: "c7", fid: "f1", text: "hi", to: "kurt" } })).code, "bad-request", "players don't whisper each other");
  assert.equal((await svc.chat({ uid: "carl", data: { cid: "c7", fid: "f1", text: "hi" } })).code, "forbidden", "outsiders can't chat");
  assert.equal((await svc.chat({ uid: "bob", data: { cid: "c7", fid: "f1", text: "/roll lots" } })).code, "bad-request");
  assert.equal(store.docs.get(p.fight).rev, rev0, "chat never moves the fight's rev");
});

test("a player picks his colour; the header and the other views show it", async () => {
  const { store, svc, p } = await opened();
  const colours = rules.fightView.PLAYER_COLOURS;
  const r = await svc.act({ uid: "bob", data: { cid: "camp1", fid: "f1", rev: header(store, p).rev, rules: fightStore.RULES_VERSION, action: { type: "colour", color: colours[4] } } });
  assert.equal(r.ok, true, r.error);
  assert.equal(header(store, p).people.bob.color, colours[4]);
  assert.equal(store.docs.get(p.view("kurt")).people.bob.color, colours[4]);
});

test("the server refuses a fight where a cleric carries an edged weapon or a bow", async () => {
  const sent = tester(); const c = sent.figures.find((f) => f.kind === "pc"); Object.assign(c, { cls: "cleric", weaponId: "sword", missile: "longbow" });
  const store = memoryStore(), svc = createFightService({ rules, store, now: () => 1, newSeed: () => 3 });
  const r = await svc.create({ uid: "ref", data: { cid: "c6", fid: "f1", rules: fightStore.RULES_VERSION, fight: fightStore.toStored(sent), control: {} } });
  assert.equal(r.ok, false); assert.match(r.error, /cleric/);
  Object.assign(c, { weaponId: "mace", missile: "sling" });
  const r2 = await svc.create({ uid: "ref", data: { cid: "c6", fid: "f1", rules: fightStore.RULES_VERSION, fight: fightStore.toStored(sent), control: {} } });
  assert.equal(r2.ok, true, r2.error);
});

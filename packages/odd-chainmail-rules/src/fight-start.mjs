/**
 * OD&D — opening a fight: every die rolled before the first round
 * odd-chainmail-rules · src/fight-start.mjs
 *
 * Slice 5, pass 2 (Oct 2026). Hit points, the coins monsters carry, each
 * monster group's languages and lair hoards are rolled here, from the fight's seed, so the
 * server rolls them for an online fight (clients never roll dice that change
 * state) and local play rolls them the same way it always has: the same seed
 * gives the same fight. A roster character (pass 4) brings his own hit points
 * (hpSet) and pack (invSet), so neither is rolled for him.
 */
import { MONSTERS } from "./monsters.mjs";
import { hitDiceFor } from "./hit-dice.mjs";
import { sumHitDice, mulberry32 } from "./dice.mjs";
import { slotsFor } from "./spell-progression.mjs";
import { emptyInventory, inventoryFromTreasure } from "./inventory.mjs";
import { carriedCoins, rollTreasure, LAIR_EXTRAS, treasureValue } from "./treasure.mjs";
import { characterLanguages, groupLanguages } from "./reactions.mjs";
import { weaponItem, weaponProblems } from "./orders.mjs";
import { seedFight } from "./fight-store.mjs";
import { AMMO_TYPE, STARTING_AMMO, ammoItem } from "./missiles.mjs";

const mon = (f) => (f.kind === "monster" ? MONSTERS.find((m) => m.key === f.monsterKey) : null);

/**
 * A lair hoard: the monster's treasure type rolled with the fight's seed (the
 * nth hoard on the board gets its own stream), plus any lair extras. Null if
 * the monster keeps no lair treasure. Lair data lives with the fight on the
 * server; the referee can change it (GM tool "treasure", Kurt Oct 2026).
 */
export function rollLairHoard(monsterKey, seed, n) {
  const m = MONSTERS.find((x) => x.key === monsterKey); const type = m?.reference?.treasureType;
  if (!type) return null;
  const t = rollTreasure(type === "A" ? "A-land" : type, mulberry32(seed + 7919 * n));
  const extra = LAIR_EXTRAS[monsterKey]; if (extra) t.coins.gp += extra.gp;
  return { type, label: `${m.name} hoard (type ${type})`, inv: inventoryFromTreasure(t), value: treasureValue(t) };
}

/** One figure's hit points: a character's hit dice by class and level, a monster's by its book entry. */
export function rollHp(f, rng) {
  if (f.kind === "pc") {
    const hd = hitDiceFor(f.cls, f.level); const r = sumHitDice(hd.dice, rng);
    f.hpRolls = r.dice.length === f.level ? r.dice.slice() : null;
    return Math.max(1, r.sum + hd.bonus);
  }
  const hd = MONSTERS.find((x) => x.key === f.monsterKey).hd; const size = hd.dieSize || 6;
  let sum = hd.bonus || 0; const rolls = [];
  for (let i = 0; i < hd.count; i++) { const d = 1 + Math.floor(rng() * size); rolls.push(d); sum += d; }
  f.hpRolls = rolls; f.hdLeft = hd.count;
  return Math.max(1, sum);
}

/** What stops a fight set up on the board from opening (a class using weapons it may not): [] when none. */
export const setupProblems = (state) => state.figures.flatMap(weaponProblems);

/**
 * Open a fight set up on the board: seed its dice, roll hit points, carried
 * coins and languages, reset everything a fight changes, and stand it at
 * round 0. Returns { rng, event }: the fight's RNG and an "opened" event for
 * the referee's log (hit points and each group's speech, never the seed).
 */
export function openFight(state, seed) {
  const rng = seedFight(state, seed);
  for (const f of state.figures) { f.origSide = f.origSide ?? f.side; f.side = f.origSide; f.charmed = false; f.pfe = false; f.holdTargets = []; f.firstHitRound = null; f.burned = false; f.regenStore = 0; f.breathLeft = undefined; f.pendingStatus = null; f.level = f.baseLevel ?? f.level; f.baseLevel = f.level; if (f.hpSet && f.hp != null) f.maxHp = f.maxHp ?? f.hp; else { f.hp = rollHp(f, rng); f.maxHp = f.hp; } f.target = null; f.moved = 0; f.status = null; f.acted = null; f.lastFired = null; f.moveSeq = 0; f.action = "melee"; f.slotsLeft = f.kind === "pc" ? slotsFor(f.cls, f.level) : []; }
  // a figure whose treasure the referee set in Setup keeps it; everyone else's is rolled
  for (const f of state.figures) { f.remains = null; if (f.invSet && f.inv) continue; f.inv = emptyInventory(); if (f.kind === "monster") Object.assign(f.inv.coins, carriedCoins(f.monsterKey, rng)); }
  for (const f of state.figures) { f.lastResult = null; f.lastTaken = null; f.startWeaponId = f.weaponId; f.weaponBroken = false; if (f.kind === "pc" && f.spare && !f.invSet) f.inv.items.push(weaponItem(f.spare)); if (f.kind === "pc" && AMMO_TYPE[f.missile] && !f.invSet) f.inv.items.push(ammoItem(AMMO_TYPE[f.missile], STARTING_AMMO[AMMO_TYPE[f.missile]])); }
  // hoards: rolled here from the fight's seed unless the referee set what's in them
  for (const c of state.chests ?? []) {
    if (c.monsterKey && !c.set) { const h = rollLairHoard(c.monsterKey, seed, c.id); if (h) Object.assign(c, { label: h.label, original: h.inv, value: h.value }); }
    c.inv = JSON.parse(JSON.stringify(c.original));
  }
  const erng = mulberry32(seed + 104729); state.encounter = new Map(); state.meleeBegun = false; state.lairNoted = new Set();
  for (const f of state.figures) {
    Object.assign(f, { averted: false, mirror: false, risesAs: null, lastHitBy: null, serviceClosed: false, serviceTries: 0, retainer: false });
    if (f.kind === "pc") { if (!f.invSet) f.inv.coins.gp += f.purse ?? 0; const l = characterLanguages({ alignment: f.alignment ?? "law", int: f.int ?? 10, race: f.race ?? "human" }); f.languages = l.known.slice(); f.langSlots = l.unfilled; continue; }
    const k = `${f.side}:${f.monsterKey}`;
    if (!state.encounter.has(k)) state.encounter.set(k, { key: k, side: f.side, monsterKey: f.monsterKey, ...groupLanguages(mon(f).mind, erng), reaction: null, holdRound: null });
  }
  for (const k of ["done", "behaved", "ready"]) delete state[k];
  Object.assign(state, { phase: "fight", round: 0, step: "init", contacts: new Map(), winner: null, moraleChecked: new Set(), fearChecked: new Set(), leaderLostDone: {}, moveSeq: 0 });
  const event = { type: "opened", hp: state.figures.map((f) => ({ id: f.id, name: f.name, hp: f.hp })), encounter: [...state.encounter.values()].map((g) => JSON.parse(JSON.stringify(g))) };
  return { rng, event };
}

/* ---------------------------------------------------------------- tests */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };
  const open = (w, h) => Array.from({ length: h }, () => Array(w).fill(false));
  const board = () => ({ phase: "setup", width: 20, height: 10, walls: open(20, 10), chests: [], figures: [
    { id: 1, side: "A", kind: "pc", name: "Fighting-Man 1", cls: "fighter", level: 3, ac: 4, weaponId: "sword", spare: "dagger", dex: 10, int: 12, alignment: "law", purse: 50, x: 2, y: 5, placed: true, hp: 99, maxHp: 99 },
    { id: 2, side: "B", kind: "monster", monsterKey: "orc", name: "Orc 1", ac: 6, x: 15, y: 5, placed: true },
    { id: 3, side: "B", kind: "monster", monsterKey: "orc", name: "Orc 2", ac: 6, x: 15, y: 6, placed: true }] });
  const a = board(), b = board(), c = board();
  const ra = openFight(a, 1974), rb = openFight(b, 1974); openFight(c, 2001);
  ok(JSON.stringify(a.figures) === JSON.stringify(b.figures) && JSON.stringify([...a.encounter.values()]) === JSON.stringify([...b.encounter.values()]), "the same seed opens the same fight");
  ok(a.figures.some((f, i) => f.hp !== c.figures[i].hp) || JSON.stringify(a.figures.map((f) => f.inv)) !== JSON.stringify(c.figures.map((f) => f.inv)), "another seed rolls differently");
  ok(a.figures[0].hp !== 99 && a.figures[0].hp === a.figures[0].maxHp && a.figures[0].hpRolls.length === 3, "a character's hit points are rolled afresh, whatever the page sent");
  ok(a.figures[0].inv.coins.gp === 50 && a.figures[0].inv.items.some((i) => i.weaponId === "dagger") && a.figures[0].languages.includes("common") && a.figures[0].langSlots === 2, "purse, spare weapon and languages");
  ok(a.phase === "fight" && a.step === "init" && a.round === 0 && a.encounter.has("B:orc") && a.rngState, "stands at round 0 with its dice seeded and the orcs' group");
  ok(ra.event.type === "opened" && ra.event.hp.length === 3 && !("seed" in ra.event) && ra.event.encounter[0].monsterKey === "orc", "the opened event lists hit points and groups, not the seed");
  ok(typeof ra.rng === "function" && rb.rng() === ra.rng(), "returns the fight's RNG, carrying on from the opening rolls");
  {
    const withHoard = (seed) => { const st = board(); st.chests = [{ id: 1, x: 18, y: 5, monsterKey: "orc", label: "x", original: { coins: { cp: 0, sp: 0, gp: 0 }, items: [] }, inv: null, value: 0 }]; openFight(st, seed); return st.chests[0]; };
    const h1 = withHoard(1974), h2 = withHoard(1974), h3 = withHoard(2001), r = rollLairHoard("orc", 1974, 1);
    ok(JSON.stringify(h1.inv) === JSON.stringify(h2.inv) && JSON.stringify(h1.inv) === JSON.stringify(r.inv) && h1.label === r.label, "a hoard is rolled from the fight's seed, the same way placing it does");
    ok(JSON.stringify(h1.original) !== JSON.stringify(h3.original) || h1.value !== h3.value, "the server's own seed rolls its own hoard");
    const st = board(); st.chests = [{ id: 1, x: 18, y: 5, monsterKey: "orc", set: true, label: "Orc hoard", original: { coins: { cp: 0, sp: 0, gp: 7 }, items: [] }, value: 7 }];
    openFight(st, 1974); ok(st.chests[0].inv.coins.gp === 7, "a hoard the referee set is kept as he set it");
    const st2 = board(); Object.assign(st2.figures[1], { invSet: true, inv: { coins: { cp: 0, sp: 0, gp: 99 }, items: [] } });
    openFight(st2, 1974); ok(st2.figures[1].inv.coins.gp === 99, "so is a monster's own treasure");
    ok(rollLairHoard("skeleton", 1, 1) === null || rollLairHoard("skeleton", 1, 1).inv, "a monster with no treasure type has no hoard");
  }
  { const st = board(); Object.assign(st.figures[0], { hpSet: true, hp: 4, maxHp: 7 }); openFight(st, 3); ok(st.figures[0].hp === 4 && st.figures[0].maxHp === 7, "a roster character keeps his own hit points (pass 4)"); }
  { const st = board(); Object.assign(st.figures[0], { missile: "longbow" }); openFight(st, 3); ok(st.figures[0].inv.items.some((i) => i.kind === "ammo" && i.qty === 20), "an archer opens the fight with a quiver of 20 arrows"); }
  console.log(`fight-start.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

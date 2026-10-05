/**
 * OD&D — opening a fight: every die rolled before the first round
 * odd-chainmail-rules · src/fight-start.mjs
 *
 * Slice 5, pass 2 (Oct 2026). Hit points, the coins monsters carry and each
 * monster group's languages are rolled here, from the fight's seed, so the
 * server rolls them for an online fight (clients never roll dice that change
 * state) and local play rolls them the same way it always has: the same seed
 * gives the same fight.
 */
import { MONSTERS } from "./monsters.mjs";
import { hitDiceFor } from "./hit-dice.mjs";
import { sumHitDice, mulberry32 } from "./dice.mjs";
import { slotsFor } from "./spell-progression.mjs";
import { emptyInventory } from "./inventory.mjs";
import { carriedCoins } from "./treasure.mjs";
import { characterLanguages, groupLanguages } from "./reactions.mjs";
import { weaponItem } from "./orders.mjs";
import { seedFight } from "./fight-store.mjs";

const mon = (f) => (f.kind === "monster" ? MONSTERS.find((m) => m.key === f.monsterKey) : null);

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

/**
 * Open a fight set up on the board: seed its dice, roll hit points, carried
 * coins and languages, reset everything a fight changes, and stand it at
 * round 0. Returns { rng, event }: the fight's RNG and an "opened" event for
 * the referee's log (hit points and each group's speech, never the seed).
 */
export function openFight(state, seed) {
  const rng = seedFight(state, seed);
  for (const f of state.figures) { f.origSide = f.origSide ?? f.side; f.side = f.origSide; f.charmed = false; f.pfe = false; f.holdTargets = []; f.firstHitRound = null; f.burned = false; f.regenStore = 0; f.breathLeft = undefined; f.pendingStatus = null; f.level = f.baseLevel ?? f.level; f.baseLevel = f.level; f.hp = rollHp(f, rng); f.maxHp = f.hp; f.target = null; f.moved = 0; f.status = null; f.acted = null; f.lastFired = null; f.moveSeq = 0; f.action = "melee"; f.slotsLeft = f.kind === "pc" ? slotsFor(f.cls, f.level) : []; }
  for (const f of state.figures) { f.inv = emptyInventory(); f.remains = null; if (f.kind === "monster") Object.assign(f.inv.coins, carriedCoins(f.monsterKey, rng)); }
  for (const f of state.figures) { f.lastResult = null; f.lastTaken = null; f.startWeaponId = f.weaponId; f.weaponBroken = false; if (f.kind === "pc" && f.spare) f.inv.items.push(weaponItem(f.spare)); }
  for (const c of state.chests ?? []) c.inv = JSON.parse(JSON.stringify(c.original));
  const erng = mulberry32(seed + 104729); state.encounter = new Map(); state.meleeBegun = false; state.lairNoted = new Set();
  for (const f of state.figures) {
    Object.assign(f, { averted: false, mirror: false, risesAs: null, lastHitBy: null, serviceClosed: false, serviceTries: 0, retainer: false });
    if (f.kind === "pc") { f.inv.coins.gp += f.purse ?? 0; const l = characterLanguages({ alignment: f.alignment ?? "law", int: f.int ?? 10 }); f.languages = l.known.slice(); f.langSlots = l.unfilled; continue; }
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
  console.log(`fight-start.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

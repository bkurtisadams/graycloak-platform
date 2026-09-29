/**
 * OD&D — Chainmail engine · encounter settlement (party side)
 * odd-chainmail · module/rules/encounter-settlement.mjs
 * system 0.1.164 · slice: monster-qty · stamp 0.1.164-monster-qty.1
 *
 * Pure split/ratio math for the encounter-settlement subsystem (HANDOFF §3–§7,
 * steps 1–2 only). No Foundry deps — Node-testable. Consumes encounter-xp.mjs
 * for the monster-side numbers; never re-derives kill values here.
 *
 * SCOPE LINE (HANDOFF §7): this module produces each member's PRE-prime-%,
 * PRE-cap award (steps 1–2: base share × relative-level ratio). Steps 3–4
 * (× (1 + prime-req %) via xpMod, then the one-level-per-adventure clamp) are
 * the existing PER-CHARACTER award path and are applied downstream when the
 * award is handed to a sheet — NOT here. The §8 fixtures are explicitly
 * "pre-prime-%, pre-cap", so they verify exactly this module's output.
 *
 * ARCHITECTURE-AGNOSTIC: takes plain inputs, returns plain numbers. It does not
 * know or care whether the party is a Foundry actor or a world store (§10 OPEN).
 *
 * Two OPEN items deliberately kept OUT so they can't block this slice:
 *   - §13.2 magic-item XP value: `treasureValue` is a caller-supplied gp number;
 *     whether magic items fold into it is the caller's ruling, not ours.
 *   - §13.1 sub-1-HD kill value: lives in encounter-xp.mjs (round-to-1 default).
 */

import { killPool, oppositionLevel } from "./encounter-xp.mjs";

/** Half-shares for hirelings (HANDOFF §6); full members weigh 1. */
function shareWeight(member) {
  return member?.hireling ? 0.5 : 1;
}

/**
 * Normalize one member to the fields the math needs, tolerating partial input.
 *   level    — character level (≥1; ratio denominator).
 *   hireling — half-share + excluded from the partyAverage denominator (§4/§6).
 *   fought   — gates the kill-pool share (§6). Default true.
 *   lootCut  — multiplier on the base share for the TREASURE pool (§6). Default
 *              1 (equal cut). 0 = no treasure. Hireling halving still applies on
 *              top via shareWeight, so a default hireling treasure weight is 0.5.
 */
function normalizeMember(m, i) {
  const level = Math.max(1, Math.trunc(Number(m?.level)) || 1);
  const hireling = !!m?.hireling;
  const fought = m?.fought ?? true;
  const lootCut = m?.lootCut == null ? 1 : Math.max(0, Number(m.lootCut) || 0);
  return { id: m?.id ?? i, level, hireling, fought, lootCut };
}

/**
 * Encounter opposition level — the ratio numerator (HANDOFF §5): the highest
 * single monster's XP-level. With no monsters (unguarded treasure) it is the
 * dungeon level. Floored at 1 either way.
 */
export function encounterOpposition(monsters, dungeonLevel = 1) {
  const list = Array.isArray(monsters) ? monsters : [];
  if (list.length === 0) return Math.max(1, Math.trunc(Number(dungeonLevel)) || 1);
  return list.reduce((hi, m) => Math.max(hi, oppositionLevel(m)), 1);
}

/**
 * Share-weighted average level of the FULL-SHARE PCs only (HANDOFF §4): the
 * partyAverage denominator. Hirelings are excluded so a level-1 torchbearer
 * can't deflate it. Falls back to all members (then to 1) if there are no PCs,
 * purely to avoid a divide-by-zero in an all-hireling edge case.
 */
export function partyAverageLevel(members) {
  const list = (Array.isArray(members) ? members : []).map(normalizeMember);
  const pcs = list.filter((m) => !m.hireling);
  const pool = pcs.length ? pcs : list;
  if (pool.length === 0) return 1;
  const w = (m) => shareWeight(m);
  const num = pool.reduce((s, m) => s + m.level * w(m), 0);
  const den = pool.reduce((s, m) => s + w(m), 0) || 1;
  return num / den;
}

/**
 * Relative-level ratio (HANDOFF §4), capped at 1 (never above 1-for-1):
 *   individual   — min(opposition, charLevel) / charLevel
 *   partyAverage — min(opposition, partyAvg) / partyAvg  (one ratio for all)
 * `level` is the member's level (individual) or the party average (partyAverage).
 */
export function relativeRatio(opposition, level) {
  const lvl = Number(level) > 0 ? Number(level) : 1;
  return Math.min(1, Math.min(Number(opposition) || 1, lvl) / lvl);
}

/**
 * Settle an encounter into per-member PRE-prime/PRE-cap awards.
 *
 * @param {object}   o
 * @param {object[]} o.monsters      Array of HD shapes ({count, bonus}) — drives
 *                                   the kill pool (§3) and opposition (§5).
 * @param {number}   o.treasureValue Treasure value in gp (§3). Caller-supplied;
 *                                   magic-item inclusion is the caller's ruling.
 * @param {object[]} o.members       [{ id?, level, hireling?, fought?, lootCut? }]
 * @param {string}   o.mode          "individual" (default) | "partyAverage" (§4).
 * @param {number}   o.dungeonLevel  Opposition for unguarded treasure (§5).
 * @returns {{
 *   killPool:number, treasureValue:number, pool:number,
 *   opposition:number, partyAverage:number, mode:string,
 *   members: Array<{ id, level, hireling, fought, lootCut, shareWeight,
 *                    killShare, treasureShare, base, ratio, award }>
 * }}
 */
export function settleEncounter({
  monsters = [],
  treasureValue = 0,
  members = [],
  mode = "individual",
  dungeonLevel = 1
} = {}) {
  const kPool = killPool(monsters);
  const tValue = Math.max(0, Number(treasureValue) || 0);
  const opposition = encounterOpposition(monsters, dungeonLevel);
  const roster = (Array.isArray(members) ? members : []).map(normalizeMember);

  // Two independent pools (§6), each split among its own eligible weighted set.
  // Kill pool → Fought=yes; treasure pool → lootCut>0. Hireling halving rides
  // shareWeight in both. Dividing each pool by its own weight sum makes dropping
  // a non-participant automatically grow the rest — no redistribution logic.
  const killWeight = (m) => (m.fought ? shareWeight(m) : 0);
  const lootWeight = (m) => m.lootCut * shareWeight(m);
  const killDen = roster.reduce((s, m) => s + killWeight(m), 0);
  const lootDen = roster.reduce((s, m) => s + lootWeight(m), 0);

  const partyAvg = partyAverageLevel(roster);
  const groupRatio = mode === "partyAverage" ? relativeRatio(opposition, partyAvg) : null;

  const out = roster.map((m) => {
    const killShare = killDen > 0 ? (kPool * killWeight(m)) / killDen : 0;
    const treasureShare = lootDen > 0 ? (tValue * lootWeight(m)) / lootDen : 0;
    const base = killShare + treasureShare;
    const ratio = mode === "partyAverage" ? groupRatio : relativeRatio(opposition, m.level);
    return {
      ...m,
      shareWeight: shareWeight(m),
      killShare,
      treasureShare,
      base,
      ratio,
      award: Math.round(base * ratio) // pre-prime-%, pre-cap (§7 steps 1–2)
    };
  });

  return {
    killPool: kPool,
    treasureValue: tValue,
    pool: kPool + tValue,
    opposition,
    partyAverage: partyAvg,
    mode: mode === "partyAverage" ? "partyAverage" : "individual",
    members: out
  };
}

/* Self-tests — Node only. §8 worked examples are the fixtures. */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`encounter-settlement.mjs FAIL: ${l}`); pass++; };
  const award = (res, id) => res.members.find((m) => m.id === id).award;

  const TROLL = { count: 6, bonus: 3 };   // L7, kill 700
  const WIGHT = { count: 3, bonus: 0 };   // L3, kill 300
  const party = () => ([
    { id: "mu", level: 8 },
    { id: "ftr", level: 5 },
    { id: "clr", level: 6 },
    { id: "hire", level: 2, hireling: true }
  ]);

  // §8 troll: pool 7,700 (700 kill + 7,000 treasure), all fought, equal loot.
  const tI = settleEncounter({ monsters: [TROLL], treasureValue: 7000, members: party(), mode: "individual" });
  ok(tI.pool === 7700, "troll pool 7700");
  ok(tI.opposition === 7, "troll opposition 7");
  ok(award(tI, "mu") === 1925, "troll/individual MU 1925");
  ok(award(tI, "ftr") === 2200, "troll/individual Fighter 2200");
  ok(award(tI, "clr") === 2200, "troll/individual Cleric 2200");
  ok(award(tI, "hire") === 1100, "troll/individual Hireling 1100");

  const tA = settleEncounter({ monsters: [TROLL], treasureValue: 7000, members: party(), mode: "partyAverage" });
  ok(Math.abs(tA.partyAverage - 19 / 3) < 1e-9, "party average 6.33 (PCs only)");
  ok(award(tA, "mu") === 2200 && award(tA, "ftr") === 2200 && award(tA, "clr") === 2200, "troll/partyAvg full 2200 (opp 7 ≥ avg)");
  ok(award(tA, "hire") === 1100, "troll/partyAvg Hireling 1100");

  // §8 wight: pool 3,500 (300 kill + 3,200 treasure).
  const wI = settleEncounter({ monsters: [WIGHT], treasureValue: 3200, members: party(), mode: "individual" });
  ok(wI.pool === 3500 && wI.opposition === 3, "wight pool 3500 / opp 3");
  ok(award(wI, "mu") === 375, "wight/individual MU 375");
  ok(award(wI, "ftr") === 600, "wight/individual Fighter 600");
  ok(award(wI, "clr") === 500, "wight/individual Cleric 500");
  ok(award(wI, "hire") === 500, "wight/individual Hireling 500 (ratio capped at 1)");

  const wA = settleEncounter({ monsters: [WIGHT], treasureValue: 3200, members: party(), mode: "partyAverage" });
  ok(award(wA, "mu") === 474, "wight/partyAvg MU 474");
  ok(award(wA, "ftr") === 474, "wight/partyAvg Fighter 474");
  ok(award(wA, "clr") === 474, "wight/partyAvg Cleric 474");
  ok(award(wA, "hire") === 237, "wight/partyAvg Hireling 237");

  // §6 texture: Fought=no but took gold → treasure XP only; no fight, no cut → 0.
  const tex = settleEncounter({
    monsters: [TROLL], treasureValue: 7000, mode: "individual",
    members: [
      { id: "fighterA", level: 5, fought: true, lootCut: 1 },
      { id: "coward", level: 5, fought: false, lootCut: 1 },   // treasure only
      { id: "ghost", level: 5, fought: false, lootCut: 0 }     // nothing
    ]
  });
  ok(tex.members.find((m) => m.id === "coward").killShare === 0, "coward earns no kill share");
  ok(tex.members.find((m) => m.id === "coward").treasureShare > 0, "coward still takes treasure");
  ok(award(tex, "ghost") === 0, "non-participant with no cut nets 0");
  ok(award(tex, "fighterA") === 700 + 3500, "lone fighter takes full kill (700) + half-of-two treasure (3500)");

  // §5: unguarded treasure uses the dungeon level for opposition.
  const ung = settleEncounter({ monsters: [], treasureValue: 1000, dungeonLevel: 4, members: [{ id: "a", level: 8 }] });
  ok(ung.opposition === 4 && ung.killPool === 0, "unguarded treasure → opp = dungeon level, no kill pool");
  ok(award(ung, "a") === 500, "unguarded: 1000 × 4/8 = 500");

  // qty multiplies the kill pool (number appearing); opposition is per-monster.
  const qStack = settleEncounter({ monsters: [{ count: 1, bonus: 0, qty: 10 }], treasureValue: 0, members: [{ id: "a", level: 1 }] });
  ok(qStack.killPool === 1000 && qStack.opposition === 1, "10 kobolds → kill pool 1000, opp 1");

  // Dropping a non-participant grows the rest (no redistribution logic needed).
  const three = settleEncounter({ monsters: [WIGHT], treasureValue: 0, members: [
    { id: "x", level: 4 }, { id: "y", level: 4 }, { id: "z", level: 4 }
  ], mode: "individual" });
  ok(Math.round(three.members[0].base) === 100, "kill 300 / 3 fighters = 100 base each");
  const two = settleEncounter({ monsters: [WIGHT], treasureValue: 0, members: [
    { id: "x", level: 4 }, { id: "y", level: 4, fought: false }, { id: "z", level: 4 }
  ], mode: "individual" });
  ok(Math.round(two.members[0].base) === 150, "drop one fighter → 300 / 2 = 150 base");

  console.log(`encounter-settlement.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

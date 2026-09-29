/**
 * OD&D — Chainmail engine · character generation (Men & Magic, p.6-15)
 * odd-chainmail · module/rules/chargen.mjs
 * system 0.1.141 · slice: prime-exchange-sheet · stamp 0.1.141-prime-exchange-sheet.1
 *
 * Pure generator: rolls the by-the-book numbers and answers the legality /
 * exchange questions. No Foundry deps, no actor writes — the ChargenApp owns
 * the dice UI and the document.update; this module owns the RAW. Every value
 * here is referee-overridable upstream by design (RAW-transparent, never
 * silently "fixed").
 *
 * Composes with the existing engine: feed startingHp() the descriptor from
 * hitDiceFor(cls, 1) so the "+X" accumulative pip stays single-sourced.
 *
 * DEFERRED to later slices: the equipment price/weight list (buy step) and
 * the race save/missile bonuses (engine-side; chargen only sets the flags).
 */

import { classKey } from "./advancement.mjs";

/* ---- dice (injectable so the App can route through Foundry's Roll) ---- */

const d6 = () => 1 + Math.floor(Math.random() * 6);
const sum3d6 = (roll = d6) => roll() + roll() + roll();

/** Six abilities, 3d6 straight down — STR INT WIS CON DEX CHA, in order. */
export function rollAbilities(roll = d6) {
  return {
    str: sum3d6(roll), int: sum3d6(roll), wis: sum3d6(roll),
    con: sum3d6(roll), dex: sum3d6(roll), cha: sum3d6(roll)
  };
}

/** Starting gold = 3d6 × 10 (Men & Magic p.10). */
export function rollStartingGold(roll = d6) {
  return sum3d6(roll) * 10;
}

/* ---- ability-score exchange (p.10) — explicit opt-in, donor floor 9 ---- */

/**
 * Per class: which non-prime abilities may be donated to raise the prime,
 * and at what cost-per-+1. NOTE the cleric STR case is "for purposes of
 * gaining experience only" in RAW — surfaced here as a ratio, but the App
 * should flag that caveat and let the referee rule on it.
 */
export const EXCHANGE = Object.freeze({
  fighter: { int: 2, wis: 3 },
  "magic-user": { wis: 2 },
  cleric: { str: 3, int: 2 }
});

/**
 * Apply an exchange: spend `amount` points of `from` to raise the class prime.
 * Never lowers the donor below 9, never raises the prime above 18. Returns a
 * new abilities object plus what was actually applied (so the UI can report).
 */
export function applyExchange(abilities, cls, prime, from, amount, { xpOnly = false } = {}) {
  const ratio = EXCHANGE[classKey(cls)]?.[from];
  const out = { ...abilities };
  if (!ratio || from === prime) return { abilities: out, spent: 0, gained: 0, xpGain: 0, xpOnly: false };

  const spendable = Math.max(0, Math.min(amount, out[from] - 9));
  const spent = spendable - (spendable % ratio);          // whole +1 steps only
  const gained = Math.min(spent / ratio, 18 - out[prime]);
  const realSpent = gained * ratio;

  out[from] -= realSpent;
  // RAW: the cleric STR→WIS trade raises the prime "for purposes of gaining
  // experience only" — the score is untouched and the gain rides the XP-bonus
  // calc instead. The house-rule "real" mode (and every other donor) raises the
  // actual ability score. The caller decides which path via xpOnly.
  if (xpOnly) return { abilities: out, spent: realSpent, gained, xpGain: gained, xpOnly: true };
  out[prime] += gained;
  return { abilities: out, spent: realSpent, gained, xpGain: 0, xpOnly: false };
}

/** Donor→cost map for a class ({} if the class has no prime-req exchange). */
export function exchangeDonorsFor(cls) {
  return EXCHANGE[classKey(cls)] ?? {};
}

/** Largest whole +1-to-prime count a donor can fund (donor floor 9, prime cap 18). */
export function maxExchangeSteps(abilities, cls, prime, from) {
  const ratio = EXCHANGE[classKey(cls)]?.[from];
  if (!ratio || !abilities) return 0;
  return Math.max(0, Math.min(Math.floor((abilities[from] - 9) / ratio), 18 - abilities[prime]));
}

/**
 * Is THIS donation experience-only? RAW flags just the cleric STR→WIS trade as
 * "for experience only"; the `clericStrExchange` world setting ("real"|"xpOnly")
 * decides, and every other donor always changes the real score.
 */
export function exchangeXpOnly(cls, from, mode) {
  return mode === "xpOnly" && classKey(cls) === "cleric" && from === "str";
}

/** Deltas for an ALREADY-VALID record (no clamping — trusts stored steps). */
function recordDeltas(cls, prime, from, steps, mode) {
  const ratio = EXCHANGE[classKey(cls)]?.[from];
  if (!ratio || !from || !(steps > 0)) return { donorSpent: 0, primeGain: 0, xpGain: 0 };
  const xpOnly = exchangeXpOnly(cls, from, mode);
  return { donorSpent: steps * ratio, primeGain: xpOnly ? 0 : steps, xpGain: xpOnly ? steps : 0 };
}

/**
 * Live re-apply for the sheet: strip the old record off the baked abilities to
 * recover the base, then clamp + apply the new record. Pure — returns new
 * abilities, xpPrimeBonus, and the (clamped) record. Idempotent: re-applying the
 * same record is a no-op; clearing returns exactly to base.
 */
export function recomputeExchange({ abilities, xpPrimeBonus = 0, cls, prime, oldRecord, newRecord, mode }) {
  const a = { ...abilities };
  let xp = Math.max(0, Math.trunc(xpPrimeBonus) || 0);
  // Strip the old trade (donor points back, prime/xp gain removed).
  if (oldRecord?.from && (oldRecord.steps ?? 0) > 0) {
    const od = recordDeltas(cls, prime, oldRecord.from, oldRecord.steps, mode);
    a[oldRecord.from] += od.donorSpent;
    a[prime] -= od.primeGain;
    xp -= od.xpGain;
  }
  // Clamp the requested new trade against the now-base abilities, then apply.
  let from = newRecord?.from || "";
  let steps = Math.max(0, Math.trunc(newRecord?.steps ?? 0));
  if (from) {
    steps = Math.min(steps, maxExchangeSteps(a, cls, prime, from));
    if (steps > 0) {
      const nd = recordDeltas(cls, prime, from, steps, mode);
      a[from] -= nd.donorSpent;
      a[prime] += nd.primeGain;
      xp += nd.xpGain;
    }
  } else {
    steps = 0; // no donor selected
  }
  return { abilities: a, xpPrimeBonus: Math.max(0, xp), record: { from, steps } };
}

/* ---- race / class legality and level caps (p.6-8) ---- */

/**
 * Classes each race may take. Human is open. Demihumans are gated to their LBB
 * options PLUS thief — Supplement I opens the thief class to dwarves, elves, and
 * halflings. (Thief itself is still gated by the classThief world setting via
 * legalClassesFor; this table is the pure race/class legality matrix.)
 */
export const RACE_CLASSES = Object.freeze({
  human: ["fighter", "magic-user", "cleric", "thief"],
  dwarf: ["fighter", "thief"],
  elf: ["fighter", "magic-user", "thief"],
  halfling: ["fighter", "thief"]
});

/**
 * Max attainable level by race+class. null = no racial cap (human, and — by
 * design — demihuman THIEVES: Supplement I sets no level limit on the thief
 * class for any race, so the absence of a thief entry here yields no cap).
 */
export const RACE_LEVEL_CAP = Object.freeze({
  dwarf: { fighter: 6 },                       // Myrmidon
  elf: { fighter: 4, "magic-user": 8 },        // Hero / Warlock
  halfling: { fighter: 4 }                     // Hero
});

export function raceClassLegal(race, cls) {
  return (RACE_CLASSES[race] ?? RACE_CLASSES.human).includes(classKey(cls));
}

/**
 * Men & Magic p.9 alignment limits for the four player races. `keep` support
 * mirrors legalClassesFor: an existing referee-overridden actor must still be
 * able to round-trip its current value without the sheet silently rewriting it.
 */
export const RACE_ALIGNMENTS = Object.freeze({
  human: ["law", "neutral", "chaos"],
  dwarf: ["law", "neutral"],
  elf: ["law", "neutral"],
  halfling: ["law"]
});

export function raceAlignmentLegal(race, alignment) {
  return (RACE_ALIGNMENTS[race] ?? RACE_ALIGNMENTS.human).includes(String(alignment ?? "").toLowerCase());
}

export function legalAlignmentsFor(race, { keep = null } = {}) {
  const out = [...(RACE_ALIGNMENTS[race] ?? RACE_ALIGNMENTS.human)];
  const k = keep == null ? null : String(keep).toLowerCase();
  if (k && !out.includes(k)) out.push(k);
  return out;
}

/**
 * Men & Magic p.10 class-change gate for the original three classes.
 * Returns governed:false when Supplement-I material (e.g. thief) is involved;
 * that transition is intentionally left to its own source rules rather than
 * inventing a restriction from Book I. The caller separately enforces race /
 * combo legality. `abilities` must be the UNMODIFIED/base scores.
 */
export function lbbClassChangeCheck({ race, from, to, abilities }) {
  const src = classKey(from), dst = classKey(to);
  if (!src || !dst || src === dst) return { legal: true, governed: true, reason: "same" };
  const lbb = new Set(["fighter", "magic-user", "cleric"]);
  if (!lbb.has(src) || !lbb.has(dst)) return { legal: true, governed: false, reason: "supplement" };

  // Elves explicitly switch Fighting-Man / Magic-User from adventure to
  // adventure. The sheet cannot know whether a session is currently in play,
  // so it enforces the legal pair and leaves timing to the referee.
  if (race === "elf") {
    const legal = (src === "fighter" || src === "magic-user") && (dst === "fighter" || dst === "magic-user");
    return { legal, governed: true, reason: legal ? "elf" : "race" };
  }

  // The p.10 change-class paragraph is specifically for men (humans). Other
  // demihumans have no alternate LBB class path beyond the elf rule above.
  if (race !== "human") return { legal: false, governed: true, reason: "race" };

  if ((src === "magic-user" && dst === "cleric") || (src === "cleric" && dst === "magic-user")) {
    return { legal: false, governed: true, reason: "mu-cleric" };
  }
  const prime = dst === "fighter" ? "str" : dst === "magic-user" ? "int" : "wis";
  const score = Number(abilities?.[prime]) || 0;
  return { legal: score >= 16, governed: true, reason: score >= 16 ? "prime" : "prime-low", prime, score };
}

/** Classes introduced by Supplement I (Greyhawk); gated by world settings. */
export const GREYHAWK_CLASSES = Object.freeze(["thief"]);

/**
 * Legal classes for a race with Greyhawk-sourced classes filtered out unless
 * `greyhawk` is true. Pure — the caller reads the world setting and passes the
 * flag (this module stays Foundry-free). `keep` forces one class to survive the
 * filter so an actor already of that class still round-trips its own dropdown.
 */
export function legalClassesFor(race, { greyhawk = false, keep = null } = {}) {
  const base = RACE_CLASSES[race] ?? RACE_CLASSES.human;
  const keepKey = keep == null ? null : classKey(keep);
  return base.filter((c) => greyhawk || !GREYHAWK_CLASSES.includes(c) || classKey(c) === keepKey);
}

/**
 * Multi-class combinations available per race (Supplement I demihumans). Each
 * combo is an ordered list of class keys; a single-element list is single-class.
 * Combos containing a Greyhawk class (thief) require the classThief gate.
 * RULES-CALL (Sup-I prose, referee-overridable): dwarf thieves are Fighter/Thief
 * (no single-class dwarf thief); halfling thieves are single-class; elves are
 * Fighter, Magic-User, Fighter/Magic-User, Fighter/Magic-User/Thief, or
 * thief-only; humans are single-class throughout.
 */
export const RACE_COMBOS = Object.freeze({
  human: [["fighter"], ["magic-user"], ["cleric"], ["thief"]],
  dwarf: [["fighter"], ["fighter", "thief"]],
  elf: [["fighter"], ["magic-user"], ["fighter", "magic-user"], ["fighter", "magic-user", "thief"], ["thief"]],
  halfling: [["fighter"], ["thief"]]
});

/** Combos legal for a race, dropping any Greyhawk-gated combo unless enabled. */
export function legalCombosFor(race, { greyhawk = false } = {}) {
  const all = RACE_COMBOS[race] ?? RACE_COMBOS.human;
  return greyhawk ? all.map((c) => [...c]) : all.filter((combo) => !combo.some((c) => GREYHAWK_CLASSES.includes(c)));
}

/** Stable id for a combo (select value) and its inverse. */
export function comboId(classes) { return classes.join("+"); }
export function comboClasses(id) { return String(id ?? "").split("+").filter(Boolean); }

export function maxLevelFor(race, cls) {
  return RACE_LEVEL_CAP[race]?.[classKey(cls)] ?? null;
}

/* ---- derived starting values ---- */

/** CON pip per hit die: 15+ -> +1, 6- -> -1, else 0 (p.11). */
export function conHpPip(con) {
  const v = Math.trunc(con) || 0;
  return v >= 15 ? 1 : v <= 6 ? -1 : 0;
}

/**
 * Roll starting HP from a hit-dice descriptor { dice, bonus } (as returned by
 * hitDiceFor). The CON pip rides EACH die; every die floors at 1 (p.11). The
 * flat `bonus` is the accumulative "+X" to the total, added once.
 */
export function startingHp({ dice, bonus = 0 }, con, roll = d6) {
  const pip = conHpPip(con);
  let total = 0;
  for (let i = 0; i < dice; i++) total += Math.max(1, roll() + pip);
  return total + bonus;
}

/** Additional languages beyond common + alignment tongue: INT over 10 (p.12). */
export function bonusLanguages(int) {
  return Math.max(0, (Math.trunc(int) || 0) - 10);
}

/* ---- Self-tests — Node only (`node module/rules/chargen.mjs`). ---- */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };
  const fixed = (...vals) => { let i = 0; return () => vals[i++ % vals.length]; };

  // Abilities: 3d6 in order, all sixes.
  const ab = rollAbilities(fixed(6));
  ok(ab.str === 18 && ab.cha === 18, "rollAbilities 3d6 straight");

  // Gold: 3d6 x10.
  ok(rollStartingGold(fixed(4)) === 120, "gold = 3d6 x10");

  // Exchange: fighter raises STR from INT at 2:1, donor floored at 9.
  const ex = applyExchange({ str: 13, int: 15, wis: 9, con: 10, dex: 10, cha: 10 },
                           "fighter", "str", "int", 6);
  ok(ex.abilities.str === 16 && ex.abilities.int === 9 && ex.gained === 3, "exchange 2:1 to floor 9");
  // Cannot dip the donor below 9.
  const ex2 = applyExchange({ str: 13, int: 10, wis: 9, con: 10, dex: 10, cha: 10 },
                            "fighter", "str", "int", 6);
  ok(ex2.gained === 0 && ex2.abilities.int === 10, "exchange respects floor");
  // Wisdom donates 3:1 for a fighter; 6 wis-over-9 -> +1 str only at the 3-step.
  const ex3 = applyExchange({ str: 13, int: 9, wis: 15, con: 10, dex: 10, cha: 10 },
                            "fighter", "str", "wis", 6);
  ok(ex3.gained === 2 && ex3.abilities.wis === 9, "exchange 3:1");
  // Experience-only mode: donor is paid but the prime SCORE is untouched; the
  // gain is reported as xpGain for the XP-bonus calc.
  const exX = applyExchange({ str: 15, int: 9, wis: 9, con: 10, dex: 10, cha: 10 },
                            "cleric", "wis", "str", 3, { xpOnly: true });
  ok(exX.abilities.wis === 9 && exX.abilities.str === 12 && exX.xpGain === 1 && exX.xpOnly,
     "xp-only: prime score unchanged, donor paid, xpGain set");

  // Live re-apply (sheet): base STR 13 / INT 15, fighter. Apply +2 from INT.
  const baseAb = { str: 13, int: 15, wis: 9, con: 10, dex: 10, cha: 10 };
  const r1 = recomputeExchange({ abilities: baseAb, xpPrimeBonus: 0, cls: "fighter", prime: "str", oldRecord: { from: "", steps: 0 }, newRecord: { from: "int", steps: 2 }, mode: "real" });
  ok(r1.abilities.str === 15 && r1.abilities.int === 11 && r1.record.steps === 2, "live apply +2 from int (real)");
  // Change donor to wis (3:1) off the SAME baked state — int restored, wis kept selected at 0 steps.
  const r2 = recomputeExchange({ abilities: r1.abilities, xpPrimeBonus: r1.xpPrimeBonus, cls: "fighter", prime: "str", oldRecord: r1.record, newRecord: { from: "wis", steps: 0 }, mode: "real" });
  ok(r2.abilities.int === 15 && r2.abilities.str === 13 && r2.record.from === "wis" && r2.record.steps === 0, "switch donor restores prior, keeps new donor selected");
  // Clear returns exactly to base.
  const r3 = recomputeExchange({ abilities: r1.abilities, xpPrimeBonus: r1.xpPrimeBonus, cls: "fighter", prime: "str", oldRecord: r1.record, newRecord: { from: "", steps: 0 }, mode: "real" });
  ok(r3.abilities.str === 13 && r3.abilities.int === 15 && r3.xpPrimeBonus === 0, "clear returns to base");
  // Donor floor clamps steps; INT 12 can fund only +1 (2:1 to floor 9 = 3 pts).
  const r4 = recomputeExchange({ abilities: { str: 13, int: 12, wis: 9, con: 10, dex: 10, cha: 10 }, cls: "fighter", prime: "str", oldRecord: { from: "", steps: 0 }, newRecord: { from: "int", steps: 5 }, mode: "real" });
  ok(r4.record.steps === 1 && r4.abilities.int === 10 && r4.abilities.str === 14, "live apply clamps to donor floor");
  // Cleric STR→WIS in xpOnly mode: donor paid, WIS score untouched, xpPrimeBonus carries the gain.
  const r5 = recomputeExchange({ abilities: { str: 15, int: 9, wis: 12, con: 10, dex: 10, cha: 10 }, cls: "cleric", prime: "wis", oldRecord: { from: "", steps: 0 }, newRecord: { from: "str", steps: 2 }, mode: "xpOnly" });
  ok(r5.abilities.str === 9 && r5.abilities.wis === 12 && r5.xpPrimeBonus === 2 && r5.record.steps === 2, "live xp-only: donor paid, prime score untouched, xp bonus carried");

  // Legality + caps.
  ok(raceClassLegal("dwarf", "fighter") && raceClassLegal("dwarf", "thief") && !raceClassLegal("dwarf", "magic-user"), "dwarf: fighter or thief, never magic-user");
  ok(raceClassLegal("elf", "magic-user") && raceClassLegal("human", "thief") && raceClassLegal("halfling", "thief"), "elf MU / human + halfling thief");
  ok(maxLevelFor("dwarf", "fighter") === 6 && maxLevelFor("elf", "magic-user") === 8, "race caps");
  ok(maxLevelFor("dwarf", "thief") === null && maxLevelFor("halfling", "thief") === null, "demihuman thieves uncapped (Sup-I)");
  ok(raceAlignmentLegal("human", "chaos") && raceAlignmentLegal("elf", "neutral") && !raceAlignmentLegal("elf", "chaos"), "LBB race alignment limits");
  ok(legalAlignmentsFor("halfling").join() === "law" && legalAlignmentsFor("halfling", { keep: "chaos" }).includes("chaos"), "alignment choices preserve referee-overridden current value");
  ok(lbbClassChangeCheck({ race: "human", from: "fighter", to: "magic-user", abilities: { int: 16 } }).legal, "human may change to MU with unmodified INT 16+");
  ok(!lbbClassChangeCheck({ race: "human", from: "fighter", to: "magic-user", abilities: { int: 15 } }).legal, "human class change fails below destination prime 16");
  ok(!lbbClassChangeCheck({ race: "human", from: "magic-user", to: "cleric", abilities: { wis: 18 } }).legal, "MU and cleric may not change into one another");
  ok(lbbClassChangeCheck({ race: "elf", from: "fighter", to: "magic-user", abilities: {} }).legal, "elf may switch fighter / magic-user");
  ok(!lbbClassChangeCheck({ race: "dwarf", from: "fighter", to: "cleric", abilities: { wis: 18 } }).legal, "non-elf demihuman has no alternate LBB class-change path");
  ok(!lbbClassChangeCheck({ race: "human", from: "fighter", to: "thief", abilities: { dex: 18 } }).governed, "thief transition left to Supplement-I rules");

  // Greyhawk class gate (pure: caller supplies the flag).
  ok(!legalClassesFor("human").includes("thief"), "gate off -> human loses thief");
  ok(legalClassesFor("human", { greyhawk: true }).includes("thief"), "gate on -> human regains thief");
  ok(legalClassesFor("human", { keep: "thief" }).includes("thief"), "existing thief survives the gate");
  ok(legalClassesFor("human").includes("cleric") && legalClassesFor("human").includes("fighter"), "gate never touches LBB classes");
  ok(legalClassesFor("dwarf", { greyhawk: true }).includes("thief"), "gate on -> dwarf gains thief (Sup-I)");
  ok(!legalClassesFor("dwarf").includes("thief") && legalClassesFor("dwarf").includes("fighter"), "gate off -> dwarf back to fighter only");
  ok(legalClassesFor("elf", { greyhawk: true }).includes("thief") && legalClassesFor("halfling", { greyhawk: true }).includes("thief"), "gate on -> elf/halfling gain thief");

  // Multi-class combos: gated, race-driven, id round-trips.
  ok(legalCombosFor("dwarf").length === 1 && legalCombosFor("dwarf", { greyhawk: true }).some((c) => c.join("+") === "fighter+thief"), "dwarf gains F/T only when gated");
  ok(!legalCombosFor("elf").some((c) => c.includes("thief")) && legalCombosFor("elf", { greyhawk: true }).some((c) => c.join("+") === "fighter+magic-user+thief"), "elf F/MU/T only when gated");
  ok(legalCombosFor("human").length === 3, "human single-class combos minus thief when gate off");
  ok(comboClasses(comboId(["fighter", "magic-user", "thief"])).join(",") === "fighter,magic-user,thief", "combo id round-trips");
  ok(maxLevelFor("human", "fighter") === null, "human uncapped");

  // CON pip + starting HP.
  ok(conHpPip(15) === 1 && conHpPip(6) === -1 && conHpPip(10) === 0, "con pip thresholds");
  ok(startingHp({ dice: 1, bonus: 1 }, 15, fixed(4)) === 6, "1 HD +1, con 15 -> (4+1)+1");
  ok(startingHp({ dice: 2, bonus: 0 }, 6, fixed(1)) === 2, "2 HD, con 6 -> each die floors at 1");

  // Languages.
  ok(bonusLanguages(15) === 5 && bonusLanguages(10) === 0, "bonus languages = int over 10");

  console.log(`chargen.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

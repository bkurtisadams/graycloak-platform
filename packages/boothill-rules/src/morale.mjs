/**
 * BOOT HILL 2e · Minor Character Morale (Advanced rules)
 * A minor character facing a critical situation rolls d100: at or under his
 * BRAVERY percentile he acts as his controller wishes; over it, he acts to
 * avoid the confrontation. Each friend with him: −5 on the roll. A major
 * character with a reputation (8+ gunfights) in the group: a further −10
 * (ERRATA 16). Checks repeat each turn the situation lasts, unless the enemy
 * is outnumbered by the minor character and his fellows; the first check is
 * always made.
 * Cavalry: exempt while their commanding officer is with them and neither
 * seriously wounded, killed, nor escaping; then they check, NCOs counting as
 * reputations. Indian war parties: exempt until their dead reach 5% of the
 * band; no group bonus; if any one fails, the others check at a −10 penalty
 * (ERRATA 17).
 */
import { makeChecker, isMain } from "./selftest.mjs";
import { d100, forceRolls } from "./dice.mjs";
import { tableScore } from "./abilities.mjs";

export const COMPANION_BONUS = -5;
export const REPUTATION_BONUS = -10;
export const WAR_PARTY_PENALTY = 10;
export const WAR_PARTY_DEATH_SHARE = 0.05;

/** Must this man check this turn? The first check always; later, unless his side outnumbers the enemy. */
export function needsCheck({ initial, own, enemies }) {
  if (initial) return true;
  return !(enemies < own);
}

/** Cavalry check only once their officer is down, wounded seriously, gone or escaping. */
export const cavalryExempt = ({ officerOk }) => !!officerOk;

/** A war party checks only once its dead reach 5% of the band. */
export const warPartyExempt = ({ deaths, bandSize }) => !(bandSize > 0 && deaths / bandSize >= WAR_PARTY_DEATH_SHARE);

/**
 * One check. companions = friends with him (not himself); reputations = men
 * with 8+ gunfights among them. group "warParty" takes no group bonus.
 */
export function moraleCheck({ braveryPct, companions = 0, reputations = 0, group = "normal", penalty = false, roll }) {
  const mods = [];
  if (group !== "warParty") {
    if (companions > 0) mods.push({ key: "companions", n: companions, value: COMPANION_BONUS * companions });
    if (reputations > 0) mods.push({ key: "reputation", n: reputations, value: REPUTATION_BONUS * reputations });
  }
  if (penalty) mods.push({ key: "warPartyBroke", value: WAR_PARTY_PENALTY });
  const adjusted = roll + mods.reduce((s, m) => s + m.value, 0);
  const bravery = tableScore(braveryPct);
  return { roll, mods, adjusted, bravery, pass: adjusted <= bravery };
}

/**
 * A war party's checks for one turn: everyone rolls; if anyone fails, the
 * rest are judged on the same roll with the penalty.
 */
export function warPartyChecks(members, rng = Math.random) {
  const first = members.map((m) => ({ id: m.id, ...moraleCheck({ braveryPct: m.braveryPct, group: "warParty", roll: d100(rng) }) }));
  if (first.every((r) => r.pass)) return first;
  return first.map((r, i) => (r.pass ? { id: r.id, ...moraleCheck({ braveryPct: members[i].braveryPct, group: "warParty", penalty: true, roll: r.roll }) } : r));
}

export function runSelfTests() {
  const { ok, eq, count } = makeChecker();
  ok(moraleCheck({ braveryPct: 40, roll: 40 }).pass, "roll equal to bravery passes");
  ok(!moraleCheck({ braveryPct: 40, roll: 41 }).pass, "roll over bravery fails");
  const g = moraleCheck({ braveryPct: 40, companions: 2, roll: 49 });
  ok(g.adjusted === 39 && g.pass, "two friends: 49 − 10 = 39 passes");
  const r = moraleCheck({ braveryPct: 40, companions: 1, reputations: 1, roll: 55 });
  ok(r.adjusted === 40 && r.pass, "a reputation in the group: −5 and −10, total −15");
  eq(moraleCheck({ braveryPct: 40.5, roll: 40 }).bravery, 40, "half points read whole");
  const w = moraleCheck({ braveryPct: 85, companions: 6, reputations: 1, group: "warParty", roll: 86 });
  ok(w.mods.length === 0 && !w.pass, "war party: no group bonus");
  ok(moraleCheck({ braveryPct: 85, group: "warParty", penalty: true, roll: 76 }).adjusted === 86, "war party penalty +10 on the roll");

  ok(needsCheck({ initial: true, own: 5, enemies: 1 }), "first check always");
  ok(!needsCheck({ initial: false, own: 3, enemies: 2 }), "enemy outnumbered: no further checks");
  ok(needsCheck({ initial: false, own: 2, enemies: 2 }), "even numbers: keep checking");

  ok(cavalryExempt({ officerOk: true }) && !cavalryExempt({ officerOk: false }), "cavalry exempt while officer ok");
  ok(warPartyExempt({ deaths: 4, bandSize: 100 }), "band of 100: 4 dead, no checks");
  ok(!warPartyExempt({ deaths: 5, bandSize: 100 }), "band of 100: 5 dead, checks begin");
  ok(!warPartyExempt({ deaths: 1, bandSize: 8 }), "band of 8: first death is 12.5%");
  ok(warPartyExempt({ deaths: 0, bandSize: 8 }), "no deaths, no checks");

  const band = [{ id: "a", braveryPct: 85 }, { id: "b", braveryPct: 85 }, { id: "c", braveryPct: 85 }];
  const res = warPartyChecks(band, forceRolls([0.9, 0.05, 0.7, 0.85, 0.8, 0.05]));
  ok(!res[0].pass && res[1].adjusted === 88 && !res[1].pass && res[2].adjusted === 90 && !res[2].pass, "one fails at 91: 78 → 88 and 80 → 90 fail at 85");
  const calm = warPartyChecks(band, forceRolls([0.1, 0.05, 0.2, 0.05, 0.3, 0.05]));
  ok(calm.every((x) => x.pass && x.mods.length === 0), "nobody fails: no penalty");
  console.log(`morale.mjs — all self-tests passed (${count()} assertions).`);
}

if (isMain(import.meta.url)) runSelfTests();

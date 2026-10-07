/**
 * BOOT HILL 2e · ability tables (Setting Up Game Characters)
 * Characters store percentile scores; every description, ability score and
 * modifier is derived here. Percentiles may carry halves (Survival Add ½);
 * tables read the whole number (ERRATA 9). Scores clamp to 1–100.
 */
import { makeChecker, isMain } from "./selftest.mjs";

export const ABILITIES = Object.freeze(["speed", "gunAccuracy", "throwAccuracy", "strength", "bravery", "experience"]);
export const INITIAL_MOD_ABILITIES = Object.freeze(["speed", "gunAccuracy", "throwAccuracy", "strength", "bravery"]);

export const tableScore = (pct) => Math.min(100, Math.max(1, Math.floor(Number(pct) || 1)));

const band = (rows, pct) => {
  const s = tableScore(pct);
  return rows.find((r) => s <= r.max);
};

export const SPEED_TABLE = Object.freeze([
  { max: 5, label: "Slow", score: -5 },
  { max: 10, label: "Below Average", score: -2 },
  { max: 20, label: "Average", score: 0 },
  { max: 35, label: "Above Average", score: 2 },
  { max: 50, label: "Quick", score: 4 },
  { max: 65, label: "Very Quick", score: 6 },
  { max: 80, label: "Fast", score: 9 },
  { max: 90, label: "Very Fast", score: 12 },
  { max: 95, label: "Lightning", score: 15 },
  { max: 96, label: "Greased Lightning", score: 18 },
  { max: 97, label: "Greased Lightning", score: 19 },
  { max: 98, label: "Greased Lightning", score: 20 },
  { max: 99, label: "Greased Lightning", score: 21 },
  { max: 100, label: "Greased Lightning", score: 22 }
]);

export const ACCURACY_TABLE = Object.freeze([
  { max: 5, label: "Very Poor", score: -9 },
  { max: 15, label: "Poor", score: -6 },
  { max: 25, label: "Below Average", score: -3 },
  { max: 35, label: "Average", score: 0 },
  { max: 50, label: "Above Average", score: 2 },
  { max: 65, label: "Fair", score: 5 },
  { max: 75, label: "Good", score: 7 },
  { max: 85, label: "Very Good", score: 10 },
  { max: 95, label: "Excellent", score: 15 },
  { max: 98, label: "Crack Shot", score: 18 },
  { max: 100, label: "Deadeye", score: 20 }
]);

export const STRENGTH_TABLE = Object.freeze([
  { max: 2, label: "Feeble", score: 8 },
  { max: 5, label: "Puny", score: 9 },
  { max: 10, label: "Frail", score: 10 },
  { max: 17, label: "Weakling", score: 11 },
  { max: 25, label: "Sickly", score: 12 },
  { max: 40, label: "Average", score: 13 },
  { max: 60, label: "Above Average", score: 14 },
  { max: 75, label: "Sturdy", score: 15 },
  { max: 83, label: "Hardy", score: 16 },
  { max: 90, label: "Strong", score: 17 },
  { max: 95, label: "Very Strong", score: 18 },
  { max: 98, label: "Powerful", score: 19 },
  { max: 100, label: "Mighty", score: 20 }
]);

export const BRAVERY_TABLE = Object.freeze([
  { max: 10, label: "Coward", speed: -4, accuracy: -6 },
  { max: 20, label: "Cowardly", speed: -2, accuracy: -3 },
  { max: 35, label: "Average", speed: 0, accuracy: 0 },
  { max: 65, label: "Above Average", speed: 1, accuracy: 3 },
  { max: 80, label: "Brave", speed: 2, accuracy: 6 },
  { max: 90, label: "Very Brave", speed: 3, accuracy: 10 },
  { max: 98, label: "Fearless", speed: 4, accuracy: 15 },
  { max: 100, label: "Foolhardy", speed: 5, accuracy: 15 }
]);

export const EXPERIENCE_TABLE = Object.freeze([
  { max: 40, gunfights: 0 },
  { max: 60, gunfights: 1 },
  { max: 75, gunfights: 2 },
  { max: 85, gunfights: 3 },
  { max: 90, gunfights: 4 },
  { max: 93, gunfights: 5 },
  { max: 95, gunfights: 6 },
  { max: 96, gunfights: 7 },
  { max: 97, gunfights: 8 },
  { max: 98, gunfights: 9 },
  { max: 99, gunfights: 10 },
  { max: 100, gunfights: 11 }
]);

export const REPUTATION_GUNFIGHTS = 8;

export const speedAbility = (pct) => ({ ...band(SPEED_TABLE, pct) });
export const accuracyAbility = (pct) => ({ ...band(ACCURACY_TABLE, pct) });
export const strengthAbility = (pct) => ({ ...band(STRENGTH_TABLE, pct) });
export const braveryAbility = (pct) => ({ ...band(BRAVERY_TABLE, pct) });
export const gunfightsFromExperienceRoll = (pct) => band(EXPERIENCE_TABLE, pct).gunfights;

export function experienceModifier(gunfights) {
  const n = Math.max(0, Math.floor(Number(gunfights) || 0));
  if (n === 0) return -10;
  if (n <= 2) return -5;
  if (n <= 4) return 0;
  if (n <= 6) return 2;
  if (n <= 8) return 6;
  if (n <= 10) return 8;
  return 10;
}

export const hasReputation = (gunfights) => Number(gunfights) >= REPUTATION_GUNFIGHTS;

export function initialModification(pct) {
  const s = tableScore(pct);
  if (s <= 25) return 25;
  if (s <= 50) return 15;
  if (s <= 70) return 10;
  if (s <= 90) return 5;
  return 0;
}

export function deriveAbilities(pct, gunfights) {
  const bravery = braveryAbility(pct.bravery);
  return {
    speed: speedAbility(pct.speed),
    gunAccuracy: accuracyAbility(pct.gunAccuracy),
    throwAccuracy: accuracyAbility(pct.throwAccuracy),
    strength: strengthAbility(pct.strength),
    bravery,
    experience: { gunfights, modifier: experienceModifier(gunfights), reputation: hasReputation(gunfights) }
  };
}

export function runSelfTests() {
  const { ok, eq, count } = makeChecker();
  const edges = (table, name) => {
    let lo = 1;
    for (const r of table) {
      eq(band(table, lo).max, r.max, `${name} low edge ${lo}`);
      eq(band(table, r.max).max, r.max, `${name} high edge ${r.max}`);
      lo = r.max + 1;
    }
    eq(lo, 101, `${name} covers 01-00`);
  };
  edges(SPEED_TABLE, "speed");
  edges(ACCURACY_TABLE, "accuracy");
  edges(STRENGTH_TABLE, "strength");
  edges(BRAVERY_TABLE, "bravery");
  edges(EXPERIENCE_TABLE, "experience");

  eq(speedAbility(90).score, 12, "Colorado Kid speed 90 Very Fast +12");
  eq(speedAbility(91).label, "Lightning", "speed 91 Lightning");
  eq(speedAbility(100).score, 22, "speed 00 +22");
  eq(accuracyAbility(64).score, 5, "Colorado Kid gun 64 Fair +5");
  eq(accuracyAbility(99).label, "Deadeye", "accuracy 99 Deadeye");
  eq(strengthAbility(80).score, 16, "Colorado Kid strength 80 Hardy 16");
  eq(strengthAbility(30).score, 13, "Juan Burrito Average 13");
  eq(strengthAbility(70).score, 15, "Silver Dollar Sam Sturdy 15");
  const b = braveryAbility(55);
  ok(b.speed === 1 && b.accuracy === 3 && b.label === "Above Average", "Colorado Kid bravery 55 +1/+3");
  eq(braveryAbility(81).label, "Very Brave", "war party floor 81 Very Brave");
  eq(braveryAbility(91).label, "Fearless", "war chief floor 91 Fearless");
  eq(gunfightsFromExperienceRoll(30), 0, "Colorado Kid experience 30 none");
  eq(gunfightsFromExperienceRoll(100), 11, "experience 00 eleven or more");

  const expMods = [[0, -10], [1, -5], [2, -5], [3, 0], [4, 0], [5, 2], [6, 2], [7, 6], [8, 6], [9, 8], [10, 8], [11, 10], [25, 10]];
  for (const [n, m] of expMods) eq(experienceModifier(n), m, `experience mod at ${n} gunfights`);
  for (let p = 1; p <= 100; p++) {
    const fromRoll = experienceModifier(gunfightsFromExperienceRoll(p));
    ok([-10, -5, 0, 2, 6, 8, 10].includes(fromRoll), `experience roll ${p} maps to a printed modifier`);
  }
  ok(!hasReputation(7) && hasReputation(8), "reputation at 8 gunfights");

  const im = [[1, 25], [25, 25], [26, 15], [50, 15], [51, 10], [70, 10], [71, 5], [90, 5], [91, 0], [100, 0]];
  for (const [p, m] of im) eq(initialModification(p), m, `initial modification at ${p}`);
  for (let p = 1; p <= 100; p++) ok(p + initialModification(p) <= 100, `initial modification never passes 100 (${p})`);
  ok(!INITIAL_MOD_ABILITIES.includes("experience"), "experience never initially modified (ERRATA 6)");

  eq(tableScore(91.5), 91, "halves read on the whole number (ERRATA 9)");
  eq(tableScore(-4), 1, "clamp low");
  eq(tableScore(104), 100, "clamp high");
  eq(speedAbility(95.5).score, 15, "95.5 still Lightning");

  console.log(`abilities.mjs — all self-tests passed (${count()} assertions).`);
}

if (isMain(import.meta.url)) runSelfTests();

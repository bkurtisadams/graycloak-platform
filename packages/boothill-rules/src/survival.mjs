/**
 * BOOT HILL 2e · Survival Modification (all characters)
 * Per survived gunfight: +1 gunfight; SPEED and BRAVERY percentiles rise by
 * the band of their current score (ERRATA 7: 01–50 Add 3, 51–70 Add 2,
 * 71–90 Add 1, 91–95 Add ½, 96–00 Add nothing; halves read whole, ERRATA 9).
 * Only for a character who faced possible death, once per scenario (ERRATA 5).
 */
import { makeChecker, isMain } from "./selftest.mjs";
import { tableScore } from "./abilities.mjs";

export function survivalIncrease(pct) {
  const s = tableScore(pct);
  if (s <= 50) return 3;
  if (s <= 70) return 2;
  if (s <= 90) return 1;
  if (s <= 95) return 0.5;
  return 0;
}

export const applySurvivalIncrease = (pct) => Math.min(100, Number(pct) + survivalIncrease(pct));

export function awardSurvival(record, { scenarioId, facedDeath }) {
  const awarded = record.awardedScenarios ?? [];
  if (!scenarioId) return { awarded: false, reason: "no-scenario", record };
  if (!facedDeath) return { awarded: false, reason: "no-risk-of-death", record };
  if (awarded.includes(scenarioId)) return { awarded: false, reason: "already-awarded", record };
  const next = {
    ...record,
    gunfights: (record.gunfights ?? 0) + 1,
    speedPct: applySurvivalIncrease(record.speedPct),
    braveryPct: applySurvivalIncrease(record.braveryPct),
    awardedScenarios: [...awarded, scenarioId]
  };
  return { awarded: true, reason: null, record: next };
}

export function runSelfTests() {
  const { ok, eq, count } = makeChecker();
  const bands = [[1, 3], [50, 3], [51, 2], [70, 2], [71, 1], [90, 1], [91, 0.5], [95, 0.5], [95.5, 0.5], [96, 0], [100, 0]];
  for (const [p, a] of bands) eq(survivalIncrease(p), a, `survival band at ${p}`);
  eq(applySurvivalIncrease(95), 95.5, "95 → 95.5");
  eq(applySurvivalIncrease(95.5), 96, "95.5 → 96");
  eq(applySurvivalIncrease(96), 96, "96 stops");
  let p = 1;
  for (let i = 0; i < 200; i++) p = applySurvivalIncrease(p);
  eq(p, 96, "repeated survival tops out at 96");

  const start = { gunfights: 0, speedPct: 50, braveryPct: 51 };
  const r1 = awardSurvival(start, { scenarioId: "s1", facedDeath: true });
  ok(r1.awarded, "first award");
  ok(r1.record.gunfights === 1 && r1.record.speedPct === 53 && r1.record.braveryPct === 53, "gunfight +1, speed 50+3, bravery 51+2");
  eq(start.gunfights, 0, "input record untouched");
  const r2 = awardSurvival(r1.record, { scenarioId: "s1", facedDeath: true });
  ok(!r2.awarded && r2.reason === "already-awarded" && r2.record === r1.record, "duplicate blocked");
  const r3 = awardSurvival(r1.record, { scenarioId: "s2", facedDeath: false });
  ok(!r3.awarded && r3.reason === "no-risk-of-death", "backshooter gets nothing");
  const r4 = awardSurvival(r1.record, { scenarioId: "s2", facedDeath: true });
  ok(r4.awarded && r4.record.gunfights === 2 && r4.record.awardedScenarios.length === 2, "next scenario awards");
  ok(!awardSurvival(start, { facedDeath: true }).awarded, "scenario id required");
  console.log(`survival.mjs — all self-tests passed (${count()} assertions).`);
}

if (isMain(import.meta.url)) runSelfTests();

/**
 * BOOT HILL 2e · dice
 * Percentile dice: coloured die = tens, white die = ones, 00 reads as 100.
 * Every roller takes an injectable rng () => [0,1) so play is reproducible.
 */
import { makeChecker, isMain } from "./selftest.mjs";

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rollD10 = (rng = Math.random) => 1 + Math.floor(rng() * 10);

export function rollPercentile(rng = Math.random) {
  const tens = Math.floor(rng() * 10);
  const ones = Math.floor(rng() * 10);
  const total = tens * 10 + ones === 0 ? 100 : tens * 10 + ones;
  return { tens, ones, total };
}

export const d100 = (rng = Math.random) => rollPercentile(rng).total;

export function forceRolls(values) {
  const queue = [...values];
  return () => {
    if (!queue.length) throw new Error("forceRolls: queue exhausted");
    return queue.shift();
  };
}

export function runSelfTests() {
  const { ok, eq, count } = makeChecker();
  const zero = () => 0;
  eq(rollPercentile(zero).total, 100, "00 reads as 100");
  eq(rollPercentile(forceRolls([0.55, 0.85])).total, 58, "colored 5, white 8 = 58");
  eq(rollPercentile(forceRolls([0, 0.15])).total, 1, "0 and 1 = 01");
  eq(rollD10(zero), 1, "d10 floor");
  eq(rollD10(() => 0.999), 10, "d10 ceiling");
  const a = mulberry32(7), b = mulberry32(7);
  for (let i = 0; i < 5; i++) eq(d100(a), d100(b), `seeded d100 repeatable ${i}`);
  const r = mulberry32(1);
  for (let i = 0; i < 2000; i++) { const v = d100(r); ok(v >= 1 && v <= 100, "d100 in range"); }
  console.log(`dice.mjs — all self-tests passed (${count()} assertions).`);
}

if (isMain(import.meta.url)) runSelfTests();

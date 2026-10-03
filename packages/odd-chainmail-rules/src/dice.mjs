/**
 * OD&D — Chainmail engine · dice & RNG primitives (shared)
 * odd-chainmail · module/rules/dice.mjs
 * system 0.1.78 · slice: dedupe-names · stamp 0.1.78-dedupe-names.1
 *
 * Pure, runtime-free. Shared by rules/grapple.mjs and rules/combat-engine.mjs so the
 * dice math and the seeded RNG live in exactly one place.
 */

/** Deterministic PRNG (mulberry32) for reproducible play and tests. */
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

/**
 * A serializable mulberry32: the generator's whole state lives in holder.s, so
 * a fight's state can be saved and resumed mid-sequence. Seeded with
 * { s: seed | 0 } it yields exactly the same numbers as mulberry32(seed).
 */
export function serialRng(holder) {
  return function () {
    holder.s = (holder.s + 0x6d2b79f5) | 0;
    const a = holder.s;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const rngHolder = (seed) => ({ s: (seed >>> 0) | 0 });

/** A single d6. */
export function rollDie(rng) {
  return 1 + Math.floor(rng() * 6);
}

/** 2d6 with the individual faces kept for display. */
export function roll2d6(rng) {
  const a = rollDie(rng);
  const b = rollDie(rng);
  return { dice: [a, b], total: a + b };
}

/** Roll one d6 per hit die and sum; returns the dice for display. */
export function sumHitDice(hd, rng) {
  const n = Math.max(0, Math.trunc(hd) || 0);
  const dice = [];
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const d = rollDie(rng);
    dice.push(d);
    sum += d;
  }
  return { dice, sum };
}

/**
 * Test stub: an RNG that yields exactly the d6 faces requested, in order.
 * To roll value v we need floor(frac*6) === v-1, so a safe fraction is picked
 * just inside that band.
 */
export function forceDice(values) {
  const fracs = values.map((v) => (v - 1) / 6 + 0.001);
  let i = 0;
  return () => fracs[i++];
}

/* Self-tests — Node only; skipped in Foundry. */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => {
    if (!c) throw new Error(`FAIL: ${l}`);
    pass++;
  };

  const forced = forceDice([1, 6, 3, 4]);
  ok(rollDie(forced) === 1 && rollDie(forced) === 6, "forceDice yields exact faces");
  ok(rollDie(forced) === 3 && rollDie(forced) === 4, "forceDice continues in order");

  const rng = mulberry32(7);
  for (let i = 0; i < 5000; i++) {
    const d = rollDie(rng);
    ok(d >= 1 && d <= 6, "d6 in range");
  }

  const a = mulberry32(99);
  const b = mulberry32(99);
  ok(rollDie(a) === rollDie(b), "same seed, same roll");

  const s = sumHitDice(8, forceDice([2, 2, 2, 2, 2, 2, 2, 2]));
  ok(s.sum === 16 && s.dice.length === 8, "sumHitDice sums per HD");
  ok(sumHitDice(0, mulberry32(1)).sum === 0, "zero HD sums to zero");

  console.log(`dice.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

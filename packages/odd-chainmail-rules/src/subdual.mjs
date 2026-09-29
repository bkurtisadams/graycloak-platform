/**
 * OD&D — Chainmail engine · subdual check (Monsters & Treasure)
 * odd-chainmail · module/rules/subdual.mjs
 * system 0.1.168 · slice: melee-subdual · stamp 0.1.168-melee-subdual.1
 *
 * Pure and runtime-free. The OD&D "Subduing Dragons" rule:
 *   intent to subdue is announced before melee; hits land as SUBDUING points,
 *   not killing points. Each round the points obtained SO FAR are ratioed over
 *   the target's hit-point TOTAL (max, not current), stated as a percentile;
 *   d100 is rolled, and a roll <= that percentage means subdued.
 *
 * The intent flag and the running pool are the caller's state; this module is
 * the per-round check. For a tournament the SAME check runs for each subduing
 * knight against the other (mutual) — the wrapper applies it symmetrically and
 * rules on simultaneous double-submission. RAW is one-directional (party vs
 * dragon); the mutual case is the app's call.
 *
 * RULES-CALLS:
 *   rounding   RAW's example "67%" reads as round-to-nearest (2/3 -> 67, not
 *              66), so subduePercent() uses Math.round. One-line swap to
 *              Math.floor to truncate instead.
 *   lethality  pure subdual: no real HP is lost. A rare injury tail like the
 *              joust's would belong in the wrapper, not here.
 */

/** d100, 1..100. */
const rollD100 = (rng) => 1 + Math.floor(rng() * 100);

/**
 * Cumulative subdual percentage: subduing points obtained so far over the
 * target's hit-point total. Capped at 100; 0 when the total is non-positive.
 * @param {number} points  running subdual pool (hit-point damage), >= 0
 * @param {number} maxHp    target's hit-point TOTAL (max)
 */
export function subduePercent(points, maxHp) {
  if (!(maxHp > 0)) return 0;
  const p = Math.max(0, Math.trunc(points));
  return Math.min(100, Math.round((p / maxHp) * 100));
}

/**
 * One round's subdual check (RAW). Call after the round's hits are tallied into
 * `points` (the running subdual pool, in hit-point damage). A d100 roll equal
 * to or less than the cumulative percentage subdues the target.
 * @param {{points:number, maxHp:number}} state
 * @param {() => number} [rng]
 * @returns {{percent:number, roll:number, subdued:boolean}}
 */
export function subdualCheck({ points, maxHp }, rng = Math.random) {
  const percent = subduePercent(points, maxHp);
  const roll = rollD100(rng);
  return { percent, roll, subdued: roll <= percent };
}

/* Self-tests — Node only. */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`subdual.mjs FAIL: ${l}`); pass++; };
  const lo = () => 0;     // d100 -> 1 (lowest possible roll)
  const hi = () => 0.999; // d100 -> 100 (highest)

  // Percentage: ratio over the HP total, RAW rounding, cap, guards.
  ok(subduePercent(0, 30) === 0, "no points -> 0%");
  ok(subduePercent(30, 30) === 100, "full HP of subdual -> 100%");
  ok(subduePercent(20, 30) === 67, "2/3 rounds to 67 (RAW example)");
  ok(subduePercent(60, 30) === 100, "overflow caps at 100%");
  ok(subduePercent(5, 0) === 0, "non-positive HP total guarded");
  ok(subduePercent(-4, 30) === 0, "negative points floored to 0");

  // 0% can never subdue: lowest d100 (1) still exceeds 0.
  ok(subdualCheck({ points: 0, maxHp: 30 }, lo).subdued === false, "0% never subdues");

  // 100% always subdues: highest d100 (100) <= 100.
  ok(subdualCheck({ points: 30, maxHp: 30 }, hi).subdued === true, "100% always subdues");

  // Roll <= percent subdues; roll > percent does not.
  const a = subdualCheck({ points: 20, maxHp: 30 }, lo); // 67%, roll 1
  ok(a.percent === 67 && a.roll === 1 && a.subdued, "low roll under 67% subdues");
  const b = subdualCheck({ points: 29, maxHp: 30 }, hi); // 97%, roll 100
  ok(b.percent === 97 && b.roll === 100 && !b.subdued, "max roll over 97% holds out");

  console.log(`subdual.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

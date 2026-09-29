/**
 * OD&D — Chainmail engine · gp-weight encumbrance ladder
 * odd-chainmail · module/rules/encumbrance.mjs
 * system 0.1.96 · slice: gp-weight-ladder · stamp 0.1.96-gp-weight-ladder.1
 *
 * Men & Magic p.15 "(Weight which can be carried)". A figure's movement rate is
 * read straight off total carried gp-weight — armor, gear, and coins are all
 * just line-items in the load (there is no separate armor-derived rate in RAW;
 * the p.15 example weighs the plate/helm/shield in alongside everything else).
 *
 *   load <=  750 gp-wt -> 12"  (Light Foot)
 *   load <= 1000 gp-wt ->  9"  (Heavy Foot)
 *   load <= 1500 gp-wt ->  6"  (Armored Foot)
 *   load <= 3000 gp-wt ->  3"  (half movement — the stated maximum load)
 *   load >  3000 gp-wt ->  0"  (over maximum: cannot move under the load)
 *
 * The p.15 worked example confirms the inclusive ceilings: a 1200 load moves at
 * 6", "could pick up an additional 300" (-> 1500) with no penalty, and "weight
 * over 1,500 would incur the penalty of half-speed".
 */

export const MAX_LOAD = 3000;

/** Inclusive ceilings, lightest first. `ceiling` is the top of each band. */
export const ENC_LADDER = Object.freeze([
  Object.freeze({ ceiling: 750,  move: 12 }),
  Object.freeze({ ceiling: 1000, move: 9 }),
  Object.freeze({ ceiling: 1500, move: 6 }),
  Object.freeze({ ceiling: 3000, move: 3 })
]);

/**
 * Resolve a carried load (gp-weight) to a movement readout. Returns:
 *   load     — clamped, non-negative load echoed back
 *   move     — inches/turn (0 when over the 3000 maximum)
 *   ceiling  — top of the current band (the load you must not exceed to hold
 *              this rate; the last band's 3000 when over)
 *   pct      — fill % of the load within its band ceiling (capped 100)
 *   over     — true when load exceeds MAX_LOAD (immobilized under load)
 *   nextMove — the slower rate one band heavier, or 0 if already at the floor
 *   headroom — gp-weight that can still be added before dropping a band
 *   maxLoad  — MAX_LOAD, for the readout
 *   tier     — band index 0..3 (for the gauge colour ramp)
 */
export function encumbranceFor(load) {
  const l = Math.max(0, Number(load) || 0);
  const over = l > MAX_LOAD;

  let idx = ENC_LADDER.findIndex((b) => l <= b.ceiling);
  if (idx === -1) idx = ENC_LADDER.length - 1; // over max → pin to the top band

  const band = ENC_LADDER[idx];
  const next = (!over && idx < ENC_LADDER.length - 1) ? ENC_LADDER[idx + 1] : null;

  return {
    load: l,
    move: over ? 0 : band.move,
    ceiling: band.ceiling,
    pct: band.ceiling > 0 ? Math.min(100, Math.round((l / band.ceiling) * 100)) : 0,
    over,
    nextMove: next ? next.move : 0,
    headroom: over ? 0 : Math.max(0, band.ceiling - l),
    maxLoad: MAX_LOAD,
    tier: over ? ENC_LADDER.length : idx
  };
}

/* Self-tests — Node only. */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`encumbrance.mjs FAIL: ${l}`); pass++; };

  // Band boundaries are inclusive at the top.
  ok(encumbranceFor(0).move === 12, "empty load = 12");
  ok(encumbranceFor(750).move === 12, "750 is still 12 (inclusive)");
  ok(encumbranceFor(751).move === 9, "751 drops to 9");
  ok(encumbranceFor(1000).move === 9, "1000 is still 9");
  ok(encumbranceFor(1001).move === 6, "1001 drops to 6");
  ok(encumbranceFor(1500).move === 6, "1500 is still 6 (p.15 example)");
  ok(encumbranceFor(1501).move === 3, "1501 drops to 3 (half-speed)");
  ok(encumbranceFor(3000).move === 3, "3000 is still 3 (max load)");
  ok(encumbranceFor(3001).move === 0, "over max = 0 (immobilized)");
  ok(encumbranceFor(3001).over === true, "over flag set past 3000");

  // p.15 worked example: 1200 load → 6", 300 headroom to the 1500 ceiling.
  const ex = encumbranceFor(1200);
  ok(ex.move === 6 && ex.ceiling === 1500 && ex.headroom === 300, "p.15 example 1200→6, headroom 300");
  ok(ex.nextMove === 3, "next band below the armored-foot tier is 3");

  // next/headroom at the light end.
  const light = encumbranceFor(420);
  ok(light.move === 12 && light.ceiling === 750 && light.nextMove === 9, "420 → 12, next 9 at 750");
  ok(light.headroom === 330 && light.pct === 56, "420/750 → headroom 330, 56%");

  // floor band has no next.
  ok(encumbranceFor(2000).nextMove === 0, "3-inch tier has no next");
  ok(encumbranceFor(5000).pct === 100 && encumbranceFor(5000).tier === ENC_LADDER.length, "over-max pins pct/tier");

  console.log(`encumbrance.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

/**
 * OD&D — Chainmail engine · grappling / subdual contest
 * odd-chainmail · module/rules/grapple.mjs
 * system 0.1.0 · slice: grappling · stamp 0.1.0-grapple.1
 *
 * Pure and runtime-free: takes plain inputs, returns a plain result object.
 * Foundry never runs the self-tests at the bottom (guarded on Node's `process`).
 *
 * Rules — odd-chainmail-combat.md · "Grappling / subdual":
 *   1. GRAB  Each grappler makes a normal attack roll (2d6 >= to-hit) vs the
 *            target's armor. A miss fails to grab; only those who land get
 *            hands on.
 *   2. PIN   Everyone holding on rolls combined hit dice (1d6 per HD, summed)
 *            against the target's hit dice (1d6 per HD, summed):
 *              target sum  <  holders' sum  -> pinned (helpless)
 *              target sum  == holders' sum  -> held   (upright, no weapon)
 *              target sum  >  holders' sum  -> free   (thrown off)
 *
 * Grappling SUSPENDS the attack/parry economy: a grappler rolls full HD in
 * this contest rather than splitting dice into swings and guards. It takes
 * roughly HD parity to subdue — one orc can't hold a Hero, but four can try.
 *
 * RNG consumption order (so deterministic stubs can be fed exactly):
 *   1. grab phase: each grappler in array order consumes 2 rolls (its 2d6)
 *   2. pin phase (only if >=1 grappler got hands on):
 *        each holder in order consumes `hd` rolls, then the target consumes
 *        `target.hd` rolls.
 */

import { roll2d6, sumHitDice, mulberry32, forceDice } from "./dice.mjs";

export const GrappleOutcome = Object.freeze({
  PINNED: "pinned",
  HELD: "held",
  FREE: "free",
  NO_GRAB: "no-grab"
});

/**
 * Resolve a full grapple.
 * @param {object} contest
 * @param {Array<{id:string,name?:string,hd:number,grabToHit:number}>} contest.grapplers
 * @param {{id:string,name?:string,hd:number,ac?:number}} contest.target
 * @param {() => number} [rng=Math.random]
 * @returns {object} result with grab detail, pin detail, and outcome
 */
export function resolveGrapple({ grapplers, target }, rng = Math.random) {
  if (!Array.isArray(grapplers) || grapplers.length === 0) {
    throw new TypeError("resolveGrapple: at least one grappler is required");
  }
  if (!target || !Number.isFinite(target.hd)) {
    throw new TypeError("resolveGrapple: target with numeric hd is required");
  }

  // 1. Grab.
  const grabs = grapplers.map((g) => {
    const r = roll2d6(rng);
    return {
      id: g.id,
      name: g.name ?? g.id,
      hd: Math.max(0, Math.trunc(g.hd) || 0),
      toHit: g.grabToHit,
      roll: r.dice,
      total: r.total,
      handsOn: r.total >= g.grabToHit
    };
  });

  const holding = grabs.filter((g) => g.handsOn);

  if (holding.length === 0) {
    return {
      outcome: GrappleOutcome.NO_GRAB,
      grabs,
      holders: [],
      pin: null,
      target: { id: target.id, name: target.name ?? target.id, hd: target.hd, ac: target.ac ?? null },
      caption: `${target.name ?? target.id} is not grabbed — no hands on.`
    };
  }

  // 2. Pin — combined holder HD vs target HD.
  const holderRolls = holding.map((h) => {
    const s = sumHitDice(h.hd, rng);
    return { id: h.id, name: h.name, hd: h.hd, dice: s.dice, sum: s.sum };
  });
  const holdersSum = holderRolls.reduce((acc, h) => acc + h.sum, 0);

  const tRoll = sumHitDice(target.hd, rng);
  const targetSum = tRoll.sum;

  let outcome;
  let caption;
  const tName = target.name ?? target.id;
  if (targetSum < holdersSum) {
    outcome = GrappleOutcome.PINNED;
    caption = `${tName} is pinned helpless (${targetSum} vs ${holdersSum}).`;
  } else if (targetSum === holdersSum) {
    outcome = GrappleOutcome.HELD;
    caption = `${tName} is held upright, unable to use a weapon (${targetSum} vs ${holdersSum}).`;
  } else {
    outcome = GrappleOutcome.FREE;
    caption = `${tName} throws them off and is free (${targetSum} vs ${holdersSum}).`;
  }

  return {
    outcome,
    grabs,
    holders: holding.map((h) => h.id),
    pin: {
      holders: holderRolls,
      holdersSum,
      target: { id: target.id, name: tName, hd: target.hd, dice: tRoll.dice, sum: targetSum },
      targetSum
    },
    target: { id: target.id, name: tName, hd: target.hd, ac: target.ac ?? null },
    caption
  };
}

/* ------------------------------------------------------------------ *
 *  Self-tests — run only under Node (`node module/rules/grapple.mjs`).
 *  Foundry (browser) has no `process`, so this block is skipped there.
 * ------------------------------------------------------------------ */
function runSelfTests() {
  let pass = 0;
  const ok = (cond, label) => {
    if (!cond) throw new Error(`FAIL: ${label}`);
    pass++;
  };

  // A stub RNG that yields exactly the dice values requested, in order
  // is imported from dice.mjs as forceDice.

  // A: single grappler pins a weak target.
  // grab 2d6 [6,6]=12 >= 7; holder hd2 -> [6,6]=12; target hd1 -> [1]=1.
  {
    const rng = forceDice([6, 6, 6, 6, 1]);
    const r = resolveGrapple(
      { grapplers: [{ id: "g1", hd: 2, grabToHit: 7 }], target: { id: "t", hd: 1, ac: 9 } },
      rng
    );
    ok(r.outcome === GrappleOutcome.PINNED, "A pinned");
    ok(r.pin.holdersSum === 12 && r.pin.targetSum === 1, "A sums 12 vs 1");
  }

  // B: exact tie -> held.
  // grab [5,3]=8 >= 7; holder hd1 -> [4]=4; target hd1 -> [4]=4.
  {
    const rng = forceDice([5, 3, 4, 4]);
    const r = resolveGrapple(
      { grapplers: [{ id: "g1", hd: 1, grabToHit: 7 }], target: { id: "t", hd: 1 } },
      rng
    );
    ok(r.outcome === GrappleOutcome.HELD, "B held");
    ok(r.pin.holdersSum === r.pin.targetSum, "B tie");
  }

  // C: target overpowers -> free.
  // grab [6,2]=8 >= 7; holder hd1 -> [2]=2; target hd1 -> [6]=6.
  {
    const rng = forceDice([6, 2, 2, 6]);
    const r = resolveGrapple(
      { grapplers: [{ id: "g1", hd: 1, grabToHit: 7 }], target: { id: "t", hd: 1 } },
      rng
    );
    ok(r.outcome === GrappleOutcome.FREE, "C free");
  }

  // D: nobody gets hands on -> no contest.
  // grab [2,3]=5 < 9.
  {
    const rng = forceDice([2, 3]);
    const r = resolveGrapple(
      { grapplers: [{ id: "g1", hd: 3, grabToHit: 9 }], target: { id: "t", hd: 1 } },
      rng
    );
    ok(r.outcome === GrappleOutcome.NO_GRAB, "D no-grab");
    ok(r.pin === null, "D no pin phase");
  }

  // E: four orcs (hd1) combine to pin an 8-HD hero.
  // four grabs of [6,2]=8 >= 7; four holder dice all 5 (sum 20);
  // target hd8 all 1 (sum 8). 8 < 20 -> pinned.
  {
    const grab = [6, 2, 6, 2, 6, 2, 6, 2];
    const holders = [5, 5, 5, 5];
    const targetDice = [1, 1, 1, 1, 1, 1, 1, 1];
    const rng = forceDice([...grab, ...holders, ...targetDice]);
    const orcs = [1, 2, 3, 4].map((n) => ({ id: `orc${n}`, hd: 1, grabToHit: 7 }));
    const r = resolveGrapple({ grapplers: orcs, target: { id: "hero", hd: 8 } }, rng);
    ok(r.holders.length === 4, "E four hands on");
    ok(r.outcome === GrappleOutcome.PINNED, "E four pin a hero");
    ok(r.pin.holdersSum === 20 && r.pin.targetSum === 8, "E sums 20 vs 8");
  }

  // F: one orc can't hold a hero — even with hands on, 1 die loses to 8.
  // grab [6,2]=8 >= 7; holder [6]=6; target hd8 all 2 (sum 16). 16 > 6 -> free.
  {
    const rng = forceDice([6, 2, 6, 2, 2, 2, 2, 2, 2, 2, 2]);
    const r = resolveGrapple(
      { grapplers: [{ id: "orc", hd: 1, grabToHit: 7 }], target: { id: "hero", hd: 8 } },
      rng
    );
    ok(r.outcome === GrappleOutcome.FREE, "F lone orc fails");
  }

  // G: determinism — same seed, same outcome.
  {
    const a = resolveGrapple(
      { grapplers: [{ id: "g", hd: 3, grabToHit: 7 }], target: { id: "t", hd: 3 } },
      mulberry32(12345)
    );
    const b = resolveGrapple(
      { grapplers: [{ id: "g", hd: 3, grabToHit: 7 }], target: { id: "t", hd: 3 } },
      mulberry32(12345)
    );
    ok(a.outcome === b.outcome && a.pin?.holdersSum === b.pin?.holdersSum, "G deterministic");
  }

  // H: fuzz invariants over many random contests.
  {
    const valid = new Set(Object.values(GrappleOutcome));
    for (let s = 0; s < 2000; s++) {
      const rng = mulberry32(s + 1);
      const nG = 1 + (s % 4);
      const grapplers = Array.from({ length: nG }, (_, i) => ({
        id: `g${i}`,
        hd: 1 + (i % 6),
        grabToHit: 6 + (i % 6)
      }));
      const r = resolveGrapple({ grapplers, target: { id: "t", hd: 1 + (s % 8) } }, rng);
      ok(valid.has(r.outcome), `H outcome valid @${s}`);
      if (r.pin) {
        const lo = r.pin.holders.length; // each die >= 1
        ok(r.pin.holdersSum >= lo, `H holders sum floor @${s}`);
        ok(r.pin.targetSum >= 1, `H target sum floor @${s}`);
      }
    }
  }

  console.log(`grapple.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

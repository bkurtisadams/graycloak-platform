/**
 * OD&D — Chainmail engine · cavalry charge morale
 * odd-chainmail-rules · src/charge-morale.mjs
 *
 * Pure. Chainmail p.18 (Cavalry Charge) and p.26 (man-to-man morale).
 * Kurt's reading, Oct 2026: in man-to-man a charged unit must check when it
 * numbers no more than the dice the chargers would throw at 1:20 (Appendix A
 * dice per man plus the impetus die), doubled for a flank or rear charge.
 * Chainmail's example: 4 Heavy Foot check against 1 Heavy Horse, 8 in flank/rear.
 */
import { roll2d6 } from "./dice.mjs";
import { COMBAT, IMPETUS_CLASSES } from "./mass-combat.mjs";

export const HORSE_CLASSES = Object.freeze(["LH", "MH", "HH"]);

/** Score the defender needs on 2d6 to stand, by its class and the charger's weight (p.18). */
export const CHARGE_STAND = Object.freeze({
  PEASANT: Object.freeze({ LH: 9, MH: 10, HH: 11 }),
  LF: Object.freeze({ LH: 8, MH: 9, HH: 10 }),
  HF: Object.freeze({ LH: 7, MH: 8, HH: 9 }),
  AF: Object.freeze({ LH: 6, MH: 7, HH: 8 }),
  LH: Object.freeze({ LH: 5, MH: 6, HH: 7 }),
  MH: Object.freeze({ LH: 4, MH: 5, HH: 6 }),
  HH: Object.freeze({ LH: 3, MH: 4, HH: 5 })
});

/** Must the charged unit check? defenderClass uses COMBAT's classes (PEASANT reads as LF). */
export function chargeCheckDue({ chargers, chargerClass, defenders, defenderClass, flankOrRear = false, impetus = true }) {
  if (!HORSE_CLASSES.includes(chargerClass)) return { due: false, threshold: 0, why: "not a horse charge" };
  const row = COMBAT[chargerClass]?.[defenderClass === "PEASANT" ? "LF" : defenderClass];
  if (!row) return { due: false, threshold: 0, why: "no combat row" };
  const dpm = row.dice / row.perMen + (impetus && IMPETUS_CLASSES.has(chargerClass) ? 1 : 0);
  const threshold = chargers * dpm * (flankOrRear ? 2 : 1);
  return { due: defenders <= threshold, threshold, dicePerMan: dpm };
}

/**
 * The check itself: 2d6 + bonuses against CHARGE_STAND; flank −1, rear −2;
 * if both units are charging, foot +1 and horse +2. Pikes facing the enemy
 * always stand. Failure: back 1½ moves, backs to the enemy, and must rally.
 */
export function cavalryChargeCheck({ defenderClass, chargerClass, flank = false, rear = false, bothCharging = false, pikesFacing = false, bonus = 0 }, rng = Math.random) {
  const need = CHARGE_STAND[defenderClass]?.[chargerClass];
  if (need == null) return { checked: false, holds: true, why: "no table row" };
  if (pikesFacing) return { checked: false, holds: true, need, why: "pikes facing the enemy stand" };
  const r = roll2d6(rng);
  const isHorse = HORSE_CLASSES.includes(defenderClass);
  const mod = (Math.trunc(bonus) || 0) - (rear ? 2 : flank ? 1 : 0) + (bothCharging ? (isHorse ? 2 : 1) : 0);
  const total = r.total + mod;
  const holds = total >= need;
  return { checked: true, dice: r.dice, mod, total, need, holds, result: holds ? "stands" : "falls back 1½ moves, backs to the enemy, and must rally" };
}

/* ---------------------------------------------------------------- tests */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };
  const seq = (v) => { let i = 0; return () => v[i++ % v.length]; };
  const d6 = (n) => (n - 0.5) / 6;
  ok(chargeCheckDue({ chargers: 1, chargerClass: "HH", defenders: 4, defenderClass: "HF" }).due, "Chainmail: 4 HF check vs 1 HH");
  ok(!chargeCheckDue({ chargers: 1, chargerClass: "HH", defenders: 5, defenderClass: "HF" }).due, "5 HF don't");
  ok(chargeCheckDue({ chargers: 1, chargerClass: "HH", defenders: 8, defenderClass: "HF", flankOrRear: true }).due && !chargeCheckDue({ chargers: 1, chargerClass: "HH", defenders: 9, defenderClass: "HF", flankOrRear: true }).due, "flank or rear doubles: 8 HF");
  ok(chargeCheckDue({ chargers: 2, chargerClass: "LH", defenders: 2, defenderClass: "AF" }).threshold === 4, "LH vs AF: 1 die + impetus per man");
  ok(!chargeCheckDue({ chargers: 3, chargerClass: "HF", defenders: 1, defenderClass: "LF" }).due, "foot charges cause no check");
  const h = cavalryChargeCheck({ defenderClass: "HF", chargerClass: "HH" }, seq([d6(4), d6(5)]));
  ok(h.need === 9 && h.total === 9 && h.holds, "HF vs HH needs 9");
  ok(!cavalryChargeCheck({ defenderClass: "HF", chargerClass: "HH", rear: true }, seq([d6(4), d6(5)])).holds, "rear −2");
  ok(cavalryChargeCheck({ defenderClass: "HF", chargerClass: "HH", flank: true, bothCharging: true }, seq([d6(4), d6(5)])).total === 9, "flank −1, both charging foot +1");
  ok(cavalryChargeCheck({ defenderClass: "MH", chargerClass: "HH", bothCharging: true }, seq([d6(1), d6(1)])).total === 4, "both charging horse +2");
  ok(cavalryChargeCheck({ defenderClass: "LF", chargerClass: "HH", pikesFacing: true }).holds, "pikes stand");
  ok(CHARGE_STAND.PEASANT.HH === 11 && CHARGE_STAND.HH.LH === 3, "table corners");
  console.log(`charge-morale.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

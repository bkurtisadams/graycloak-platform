/**
 * OD&D — Chainmail engine · retainers (hirelings & loyalty)
 * odd-chainmail · module/rules/retainers.mjs
 * system 0.1.100 · slice: retainer-rolls · stamp 0.1.100-retainer-rolls.1
 *
 * Men & Magic p.11-13. Charisma sets the maximum number of hirelings "of
 * unusual nature" a character may attract, plus a loyalty-base adjustment; a
 * retainer's loyalty score then maps to a morale band (p.13). The CHA cap is a
 * guideline for unusual hirelings — rank-and-file men-at-arms and mercenaries
 * are explicitly NOT counted against it (p.11) — so the roster is never hard-
 * capped here; the sheet surfaces the cap as advice and flags an over-count.
 */

/** CHA -> { hirelings: max unusual, loyaltyBase }. Ascending score ceilings. */
export const CHA_HIRELINGS = Object.freeze([
  Object.freeze({ ceiling: 4,  hirelings: 1,  loyaltyBase: -2 }),
  Object.freeze({ ceiling: 6,  hirelings: 2,  loyaltyBase: -1 }),
  Object.freeze({ ceiling: 9,  hirelings: 3,  loyaltyBase: 0 }),
  Object.freeze({ ceiling: 12, hirelings: 4,  loyaltyBase: 0 }),
  Object.freeze({ ceiling: 15, hirelings: 5,  loyaltyBase: 1 }),
  Object.freeze({ ceiling: 17, hirelings: 6,  loyaltyBase: 2 }),
  Object.freeze({ ceiling: 18, hirelings: 12, loyaltyBase: 4 })
]);

/** Resolve a CHA score to { max, loyaltyBase }. Clamped to the 3..18 table. */
export function hirelingsFor(cha) {
  const c = Math.min(18, Math.max(3, Math.trunc(Number(cha) || 0) || 3));
  const band = CHA_HIRELINGS.find((b) => c <= b.ceiling) ?? CHA_HIRELINGS[CHA_HIRELINGS.length - 1];
  return { max: band.hirelings, loyaltyBase: band.loyaltyBase };
}

/**
 * Loyalty score -> morale band (p.13). `key` is the i18n suffix
 * (ODDCM.Loyalty.<Key>); `mod` is the adjustment to the retainer's morale dice.
 *   <=3  deserts at first opportunity
 *   4-6  -2      7-8  -1      9-12 average (0)
 *   13-14 +1     15-18 +2     19+ need never check morale
 */
export const LOYALTY_MORALE = Object.freeze([
  Object.freeze({ ceiling: 3,        mod: 0,  key: "Deserts",   deserts: true }),
  Object.freeze({ ceiling: 6,        mod: -2, key: "Minus2" }),
  Object.freeze({ ceiling: 8,        mod: -1, key: "Minus1" }),
  Object.freeze({ ceiling: 12,       mod: 0,  key: "Average" }),
  Object.freeze({ ceiling: 14,       mod: 1,  key: "Plus1" }),
  Object.freeze({ ceiling: 18,       mod: 2,  key: "Plus2" }),
  Object.freeze({ ceiling: Infinity, mod: 0,  key: "Steadfast", neverChecks: true })
]);

export function loyaltyMorale(score) {
  const s = Math.trunc(Number(score) || 0);
  const band = LOYALTY_MORALE.find((b) => s <= b.ceiling) ?? LOYALTY_MORALE[LOYALTY_MORALE.length - 1];
  return { mod: band.mod, key: band.key, deserts: !!band.deserts, neverChecks: !!band.neverChecks };
}

/**
 * Hireling reaction to an offer of service (p.12): roll 2d6, adjust for
 * charisma, read the band. `key` is the i18n suffix (ODDCM.Reaction.<Key>).
 *   <=2  attempts to attack       3-5  hostile        6-8  uncertain
 *   9-11 accepts offer            12+  enthusiast (Loyalty +3)
 *
 * RULES-CALL: Men & Magic says only "adjusting for charisma" without printing a
 * reaction-CHA column, so the engine applies the same CHA value the book DOES
 * give — the loyalty base (-2..+4). Tunable: the caller supplies the modifier.
 */
export const RETAINER_REACTION = Object.freeze([
  Object.freeze({ ceiling: 2,        key: "Attack" }),
  Object.freeze({ ceiling: 5,        key: "Hostile" }),
  Object.freeze({ ceiling: 8,        key: "Uncertain" }),
  Object.freeze({ ceiling: 11,       key: "Accepts" }),
  Object.freeze({ ceiling: Infinity, key: "Enthusiast", loyaltyBonus: 3 })
]);

export function reactionFor(total) {
  const t = Math.trunc(Number(total) || 0);
  const band = RETAINER_REACTION.find((b) => t <= b.ceiling) ?? RETAINER_REACTION[RETAINER_REACTION.length - 1];
  return { key: band.key, loyaltyBonus: band.loyaltyBonus ?? 0 };
}

/* Self-tests — Node only. */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`retainers.mjs FAIL: ${l}`); pass++; };

  // CHA table — boundaries and the two "jumps".
  ok(hirelingsFor(3).max === 1 && hirelingsFor(4).loyaltyBase === -2, "CHA 3-4 -> 1 / -2");
  ok(hirelingsFor(5).max === 2 && hirelingsFor(6).loyaltyBase === -1, "CHA 5-6 -> 2 / -1");
  ok(hirelingsFor(7).max === 3 && hirelingsFor(9).loyaltyBase === 0, "CHA 7-9 -> 3 / 0");
  ok(hirelingsFor(10).max === 4 && hirelingsFor(12).loyaltyBase === 0, "CHA 10-12 -> 4 / 0");
  ok(hirelingsFor(13).max === 5 && hirelingsFor(15).loyaltyBase === 1, "CHA 13-15 -> 5 / +1");
  ok(hirelingsFor(16).max === 6 && hirelingsFor(17).loyaltyBase === 2, "CHA 16-17 -> 6 / +2");
  ok(hirelingsFor(18).max === 12 && hirelingsFor(18).loyaltyBase === 4, "CHA 18 -> 12 / +4");
  ok(hirelingsFor(99).max === 12 && hirelingsFor(0).max === 1, "out-of-range clamps to table ends");

  // Loyalty morale bands.
  ok(loyaltyMorale(3).deserts && loyaltyMorale(-1).deserts, "<=3 deserts");
  ok(loyaltyMorale(4).mod === -2 && loyaltyMorale(6).mod === -2, "4-6 = -2");
  ok(loyaltyMorale(7).mod === -1 && loyaltyMorale(8).mod === -1, "7-8 = -1");
  ok(loyaltyMorale(9).mod === 0 && loyaltyMorale(12).key === "Average", "9-12 average");
  ok(loyaltyMorale(13).mod === 1 && loyaltyMorale(14).mod === 1, "13-14 = +1");
  ok(loyaltyMorale(15).mod === 2 && loyaltyMorale(18).mod === 2, "15-18 = +2");
  ok(loyaltyMorale(19).neverChecks && loyaltyMorale(99).neverChecks, "19+ never checks");

  // Reaction bands (2d6, CHA-adjusted; open-ended at both ends).
  ok(reactionFor(2).key === "Attack" && reactionFor(0).key === "Attack", "<=2 attack");
  ok(reactionFor(3).key === "Hostile" && reactionFor(5).key === "Hostile", "3-5 hostile");
  ok(reactionFor(6).key === "Uncertain" && reactionFor(8).key === "Uncertain", "6-8 uncertain");
  ok(reactionFor(9).key === "Accepts" && reactionFor(11).key === "Accepts", "9-11 accepts");
  ok(reactionFor(12).key === "Enthusiast" && reactionFor(12).loyaltyBonus === 3, "12 enthusiast +3");
  ok(reactionFor(15).key === "Enthusiast", "above 12 still enthusiast");

  console.log(`retainers.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

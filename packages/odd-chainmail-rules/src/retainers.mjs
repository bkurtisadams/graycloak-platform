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

/* ------------------------------------------------------------------ seeking and hiring (the online game, v1.577.00) */

/** Book I: only the lowest level of character types can be hired. The classes a player may seek. */
export const RETAINER_CLASSES = Object.freeze(["fighter", "magic-user", "cleric", "thief"]);
/**
 * Ways of advertising for a retainer and what they cost (Kurt, 25 Nov 2026; Book I says only that it costs money and
 * takes time): notices 10 gp for 7 days; asking around 1d6 gp a day; the round of the inns 1d6 x 10 gp a day.
 */
export const SEEK = Object.freeze({
  notices: Object.freeze({ name: "Post notices", days: 7, daily: false, cost: 10 }),
  asking: Object.freeze({ name: "Ask around", daily: true, mult: 1 }),
  inns: Object.freeze({ name: "The round of the inns", daily: true, mult: 10 }),
});
export const SEEK_MAX_DAYS = 7;
/**
 * The chance in 100 that an applicant comes forward: for the notices, once for their week; for the others, each day.
 * Starting numbers for the referee to change.
 */
export const SEEK_CHANCE = Object.freeze({
  village: Object.freeze({ notices: 20, asking: 10, inns: 20 }),
  town: Object.freeze({ notices: 40, asking: 15, inns: 30 }),
  city: Object.freeze({ notices: 60, asking: 20, inns: 40 }),
});
export function seekChance(kind, method) { return SEEK_CHANCE[kind]?.[method] ?? 0; }
/**
 * Look for a retainer: `roll(n)` gives 1..n, `gp` is the gold he can spend, `days` how long he keeps at a daily way.
 * A day he cannot pay for ends the search. Returns { found, days, spent, costs, rolls }.
 */
export function seek(kind, method, { days = 1, gp = 0, roll }) {
  const m = SEEK[method], chance = seekChance(kind, method); if (!m) return null;
  if (!m.daily) {
    if (gp < m.cost) return { found: false, days: 0, spent: 0, costs: [], rolls: [], chance, short: true };
    const pct = roll(100);
    return { found: pct <= chance, days: m.days, spent: m.cost, costs: [m.cost], rolls: [pct], chance };
  }
  const out = { found: false, days: 0, spent: 0, costs: [], rolls: [], chance };
  for (let d = 0; d < Math.max(1, Math.min(SEEK_MAX_DAYS, Math.trunc(days) || 1)); d++) {
    const cost = roll(6) * m.mult;
    if (gp - out.spent < cost) { out.short = true; break; }
    const pct = roll(100);
    out.days += 1; out.spent += cost; out.costs.push(cost); out.rolls.push(pct);
    if (pct <= chance) { out.found = true; break; }
  }
  return out;
}

/** Book I: a minimum offer of 100 gp is needed to tempt a human into service. */
export const MIN_OFFER = 100;
/** Kurt (25 Nov 2026): +1 on the offer's dice for each 100 gp over the minimum, never more than +3. */
export function offerBonus(gp) { return Math.max(0, Math.min(3, Math.floor(((Math.trunc(Number(gp)) || 0) - MIN_OFFER) / 100))); }
/** What is promised beyond the offer (Kurt, 25 Nov 2026): his wages alone, or his wages and a half share of treasure. */
export const TERMS = Object.freeze({ wages: "wages only", share: "wages and a half share of treasure" });
/**
 * The offer: two dice, the offer's bonus, and Charisma's loyalty adjustment (Kurt, 25 Nov 2026). Uncertain leaves
 * the door open to a better offer; anything under 6 does not (Book I).
 */
export function makeOffer(d1, d2, gp, cha) {
  const offer = offerBonus(gp), charisma = hirelingsFor(cha).loyaltyBase, total = d1 + d2 + offer + charisma, r = reactionFor(total);
  return { dice: [d1, d2], offer, charisma, total, key: r.key, loyaltyBonus: r.loyaltyBonus, accepts: r.key === "Accepts" || r.key === "Enthusiast", open: r.key === "Uncertain" };
}
/** Loyalty (Book I): three dice, adjusted for Charisma, and +3 for one who came in an enthusiast. The referee's to keep. */
export function rollLoyalty(dice, cha, bonus = 0) {
  const charisma = hirelingsFor(cha).loyaltyBase, score = dice.reduce((s, n) => s + n, 0) + charisma + bonus;
  return { dice: [...dice], charisma, bonus, score, morale: loyaltyMorale(score) };
}
/** What a 1st-level retainer buys with his own starting gold, in this order, as far as it goes. */
export const RETAINER_KIT = Object.freeze({
  fighter: Object.freeze(["sword", "mail", "shield", "helmet"]),
  cleric: Object.freeze(["mace", "mail", "shield"]),
  "magic-user": Object.freeze(["dagger"]),
  thief: Object.freeze(["sword", "leather"]),
});

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

  // Seeking and the offer.
  const seqd = (list) => { let i = 0; return () => list[i++]; };
  ok(seekChance("village", "notices") === 20 && seekChance("city", "inns") === 40 && seekChance("ruin", "inns") === 0, "the chance by settlement and way");
  let sk = seek("village", "notices", { gp: 50, roll: seqd([20]) }); ok(sk.found && sk.days === 7 && sk.spent === 10, "notices: 10 gp, a week, one roll");
  ok(seek("village", "notices", { gp: 9, roll: seqd([1]) }).short, "no gold for the notices");
  sk = seek("town", "inns", { days: 5, gp: 500, roll: seqd([3, 31, 2, 30]) }); ok(sk.found && sk.days === 2 && sk.spent === 50 && sk.costs.join() === "30,20", "the inns: 1d6 x 10 a day, stopping the day one comes");
  sk = seek("town", "asking", { days: 3, gp: 5, roll: seqd([2, 99, 4, 1]) }); ok(!sk.found && sk.days === 1 && sk.spent === 2 && sk.short, "a day he can't pay for ends it");
  ok(offerBonus(100) === 0 && offerBonus(199) === 0 && offerBonus(200) === 1 && offerBonus(400) === 3 && offerBonus(5000) === 3, "+1 a 100 gp over the minimum, capped at +3");
  let of = makeOffer(4, 4, 100, 10); ok(of.total === 8 && of.open && !of.accepts, "8: uncertain, the door stays open");
  of = makeOffer(4, 4, 200, 10); ok(of.total === 9 && of.accepts && of.loyaltyBonus === 0, "9 with a better offer: accepts");
  of = makeOffer(5, 5, 300, 13); ok(of.total === 13 && of.key === "Enthusiast" && of.loyaltyBonus === 3 && of.charisma === 1, "Charisma on the dice; an enthusiast");
  of = makeOffer(2, 2, 100, 4); ok(of.total === 2 && of.key === "Attack" && !of.open, "a poor Charisma can turn him ugly");
  const ly = rollLoyalty([3, 4, 5], 16, 3); ok(ly.score === 17 && ly.morale.mod === 2, "loyalty: 3d6, Charisma, the enthusiast's +3");
  console.log(`retainers.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

/**
 * OD&D — Chainmail engine · men-at-arms (hired soldiers)
 * packages/odd-chainmail-rules/src/men-at-arms.mjs
 *
 * Book III, Men-at-Arms: the monthly cost of each type, and the 100-600 gp a week that posting notices costs.
 * Anyone may hire them; no stronghold is needed (Kurt, Oct and Nov 2026). They are not counted against the
 * Charisma limit on hirelings of unusual nature (Book I).
 *
 * Kurt's rulings where the books leave it to the referee (Oct 2026, all starting numbers he may change):
 *   the chance that men answer a week's notices is 50% in a village, 75% in a town, 90% in a city, +5% for each
 *   100 gp spent over the first hundred, never better than 95%; each type sought is rolled for by itself, and
 *   those who answer come 1d6 in a village, 2d6 in a town, 4d6 in a city. An Armorer is needed for each 50 fighters.
 *   The referee says which types a settlement offers (Nov 2026): a village Light Foot, Heavy Foot and Archers.
 */

/** Book III's types and their cost in gold pieces a month, each man. */
export const TROOPS = Object.freeze({
  lightFoot: { name: "Light Foot", one: "Light Footman", pay: 2 },
  heavyFoot: { name: "Heavy Foot", one: "Heavy Footman", pay: 3 },
  archer: { name: "Archers", one: "Archer", pay: 5 },
  crossbow: { name: "Crossbowmen", one: "Crossbowman", pay: 4 },
  longbow: { name: "Longbowmen", one: "Longbowman", pay: 10 },
  lightHorse: { name: "Light Horsemen", one: "Light Horseman", pay: 10 },
  mediumHorse: { name: "Medium Horsemen", one: "Medium Horseman", pay: 15 },
  heavyHorse: { name: "Heavy Horsemen", one: "Heavy Horseman", pay: 20 },
});

/** Which types answer a notice, by the kind of settlement (the referee's say; these are where he starts). */
export const OFFERED = Object.freeze({
  village: Object.freeze(["lightFoot", "heavyFoot", "archer"]),
  town: Object.freeze(["lightFoot", "heavyFoot", "archer", "crossbow", "lightHorse"]),
  city: Object.freeze(Object.keys(TROOPS)),
});
/** The chance in 100 that a week's notices find men, and how many d6 of them come. */
export const FIND = Object.freeze({ village: { chance: 50, dice: 1 }, town: { chance: 75, dice: 2 }, city: { chance: 90, dice: 4 } });
/** Book III: 100-600 gp a week. */
export const NOTICE = Object.freeze({ min: 100, max: 600, step: 100, days: 7 });
/** The days in the month they are paid for. */
export const MONTH = 30;
/** Book III: an Armorer for every 50 fighters. Until Armorers can be hired, 50 is the most one character keeps. */
export const ARMORER_CAP = 50;

/** The types a place offers: its own list if the referee has given it one, else its kind's. */
export function offeredAt(place) {
  const list = Array.isArray(place?.troops) ? place.troops : OFFERED[place?.kind] ?? [];
  return list.filter((k) => TROOPS[k]);
}
/** A week's spend, in whole hundreds between 100 and 600. */
export function noticeSpend(gp) {
  const n = Math.round((Math.trunc(Number(gp)) || NOTICE.min) / NOTICE.step) * NOTICE.step;
  return Math.max(NOTICE.min, Math.min(NOTICE.max, n));
}
/** The chance in 100 for one type, at this kind of settlement, for this spend. */
export function findChance(kind, spend) {
  const f = FIND[kind]; if (!f) return 0;
  return Math.min(95, f.chance + 5 * (noticeSpend(spend) / NOTICE.step - 1));
}
/**
 * One type's answer to a week of notices: `roll(n)` gives 1..n. The d% first, then the d6s if they came.
 * Returns { pct, chance, n }.
 */
export function answer(kind, spend, roll) {
  const chance = findChance(kind, spend), pct = roll(100);
  if (pct > chance) return { pct, chance, n: 0 };
  let n = 0; for (let i = 0; i < (FIND[kind]?.dice ?? 1); i++) n += roll(6);
  return { pct, chance, n };
}

/** The men a character keeps, as { type: count }, with nothing at zero. */
export function menOf(troops) {
  const out = {};
  for (const [k, n] of Object.entries(troops?.men ?? {})) if (TROOPS[k] && Math.trunc(n) > 0) out[k] = Math.trunc(n);
  return out;
}
export function countOf(troops) { return Object.values(menOf(troops)).reduce((s, n) => s + n, 0); }
/** What the company costs for a month. */
export function monthlyPay(troops) { return Object.entries(menOf(troops)).reduce((s, [k, n]) => s + TROOPS[k].pay * n, 0); }
/**
 * The gold to take `n` of a type into service on `day`: a full month for the first men hired, and for men who
 * join a company already paid, their share of the days left to its pay day (never less than 1 gp).
 */
export function hireCost(troops, type, n, day) {
  const t = TROOPS[type]; if (!t || !(n >= 1)) return 0;
  const left = countOf(troops) && troops.paidTo > day ? Math.min(MONTH, troops.paidTo - day) : MONTH;
  return Math.max(1, Math.ceil((t.pay * n * left) / MONTH));
}
/** The company with `n` more of a type, hired on `day`. */
export function hire(troops, type, n, day) {
  const men = menOf(troops), had = countOf(troops);
  men[type] = (men[type] ?? 0) + n;
  return { men, paidTo: had && troops.paidTo > day ? troops.paidTo : day + MONTH };
}
/** The company less `n` of a type; null when the last man goes. */
export function dismiss(troops, type, n) {
  const men = menOf(troops); if (!men[type]) return troops ?? null;
  men[type] -= Math.min(men[type], n); if (men[type] <= 0) delete men[type];
  return Object.keys(men).length ? { men, paidTo: troops.paidTo } : null;
}
/**
 * Pay day: every month that has come due by `day` is paid from his gold, in order. The first month he cannot
 * pay, the men leave his service. Returns { troops, gp, paid, months, left } (left: they went unpaid).
 */
export function settlePay(troops, gp, day) {
  let t = countOf(troops) ? { men: menOf(troops), paidTo: troops.paidTo ?? day + MONTH } : null, paid = 0, months = 0;
  if (!t) return { troops: null, gp, paid, months, left: false };
  const due = monthlyPay(t);
  while (day >= t.paidTo) {
    if (gp - paid < due) return { troops: null, gp: gp - paid, paid, months, left: true };
    paid += due; months += 1; t = { ...t, paidTo: t.paidTo + MONTH };
  }
  return { troops: t, gp: gp - paid, paid, months, left: false };
}
/** "3 Light Foot, 1 Archer". */
export function describe(troops) {
  return Object.entries(menOf(troops)).map(([k, n]) => `${n} ${n === 1 ? TROOPS[k].one : TROOPS[k].name}`).join(", ");
}

function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };
  ok(TROOPS.lightFoot.pay === 2 && TROOPS.heavyFoot.pay === 3 && TROOPS.archer.pay === 5 && TROOPS.crossbow.pay === 4 && TROOPS.longbow.pay === 10 && TROOPS.heavyHorse.pay === 20, "Book III's monthly costs");
  ok(offeredAt({ kind: "village" }).join() === "lightFoot,heavyFoot,archer", "a village: Light Foot, Heavy Foot, Archers");
  ok(offeredAt({ kind: "village", troops: ["longbow", "nonsense"] }).join() === "longbow" && offeredAt({ kind: "ruin" }).length === 0, "the referee's own list; none at a ruin");
  ok(noticeSpend(0) === 100 && noticeSpend(249) === 200 && noticeSpend(9999) === 600, "100 to 600 gp, in hundreds");
  ok(findChance("village", 100) === 50 && findChance("village", 600) === 75 && findChance("town", 300) === 85 && findChance("city", 600) === 95, "the chance by settlement and spend, capped at 95");
  const dice = (list) => { let i = 0; return () => list[i++]; };
  ok(answer("village", 100, dice([51])).n === 0 && answer("village", 100, dice([50, 4])).n === 4 && answer("town", 100, dice([10, 3, 5])).n === 8, "the d%, then 1d6 in a village, 2d6 in a town");
  let t = hire(null, "lightFoot", 4, 10);
  ok(hireCost(null, "lightFoot", 4, 10) === 8 && t.paidTo === 40 && countOf(t) === 4 && monthlyPay(t) === 8, "the first men: a month's pay down, paid to day 40");
  ok(hireCost(t, "archer", 2, 25) === 5 && hireCost(t, "archer", 2, 40) === 10, "men joining a paid company pay for the days left");
  t = hire(t, "archer", 2, 25);
  ok(t.paidTo === 40 && monthlyPay(t) === 18 && describe(t) === "4 Light Foot, 2 Archers", "one pay day for the company");
  let s = settlePay(t, 100, 39); ok(s.paid === 0 && !s.left && s.troops.paidTo === 40, "nothing due before pay day");
  s = settlePay(t, 100, 75); ok(s.paid === 36 && s.months === 2 && s.gp === 64 && s.troops.paidTo === 100, "two months come due at once");
  s = settlePay(t, 20, 75); ok(s.left && s.troops === null && s.paid === 18 && s.gp === 2, "the month he cannot pay, they leave");
  ok(describe(dismiss(t, "archer", 1)) === "4 Light Foot, 1 Archer" && dismiss(dismiss(t, "archer", 2), "lightFoot", 9) === null, "dismissing; the last man gone leaves no company");
  console.log(`men-at-arms: all self-tests passed (${pass})`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

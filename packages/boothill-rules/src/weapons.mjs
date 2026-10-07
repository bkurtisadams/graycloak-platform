/**
 * BOOT HILL 2e · Weapons Chart, Price Chart, weapon speed classes
 * Ranges are the top of each band in inches (one town-map square = 6 ft):
 * "0 to 4 / 4+ to 10 / 10+ to 20 / 20+ to 40" → [4, 10, 20, 40].
 * Costs are in cents. availableAfter: usable when campaign year > that year.
 */
import { makeChecker, isMain } from "./selftest.mjs";

export const SPEED_CLASS_MODIFIER = Object.freeze({
  "very-slow": -10,
  slow: -5,
  "below-average": 0,
  average: 5,
  fast: 8,
  "very-fast": 10
});

export const WEAPON_CLASSES = Object.freeze({
  knife: { name: "Knife or Tomahawk", ranges: [1, 2, 3, 4], rof: 1, reload: null, speed: "average", thrown: true },
  bow: { name: "Bow", ranges: [7, 18, 30, 50], rof: 1, reload: 1, speed: "below-average", thrown: true },
  lance: { name: "Lance", ranges: [2, 5, 10, 15], rof: 1, reload: null, speed: "below-average", thrown: true },
  derringer: { name: "Derringer", ranges: [1, 3, 6, 10], rof: 1, rofDouble: 2, reload: 2, speed: "average" },
  capBall: { name: "Cap & Ball Revolver", ranges: [3, 7, 12, 26], rof: 3, reload: 1, speed: "below-average" },
  singleAction: { name: "Single Action Revolver", ranges: [4, 10, 20, 40], rof: 3, reload: 3, speed: "fast" },
  doubleAction: { name: "Double Action Revolver", ranges: [4, 10, 20, 40], rof: 3, reload: 3, speed: "average" },
  fastDraw: { name: "Fast Draw Revolver", ranges: [3, 7, 15, 30], rof: 3, reload: 3, speed: "very-fast" },
  longBarrel: { name: "Long Barrel Revolver", ranges: [6, 12, 25, 45], rof: 1, reload: 3, speed: "below-average" },
  scatterGun: { name: "Scatter Gun", ranges: [2, 4, 8, 15], rof: 1, rofDouble: 2, reload: 2, speed: "below-average", spread: "scatter" },
  shotgun: { name: "Shotgun", ranges: [6, 12, 18, 36], rof: 1, rofDouble: 2, reload: 2, speed: "slow", spread: "shotgun" },
  civilWarRifle: { name: "Civil War Rifle", ranges: [15, 30, 60, 120], rof: 1, reload: 2, speed: "slow" },
  civilWarCarbine: { name: "Civil War Carbine", ranges: [12, 24, 50, 100], rof: 1, reload: 2, speed: "slow" },
  buffaloRifle: { name: "Buffalo Rifle", ranges: [30, 60, 120, 300], rof: 1, reload: 1, speed: "very-slow" },
  armyRifle: { name: "Army Rifle", ranges: [25, 50, 100, 250], rof: 1, reload: 1, speed: "very-slow" },
  otherRifle: { name: "Other Rifles", ranges: [20, 40, 80, 200], rof: 3, reload: 3, speed: "slow" },
  otherCarbine: { name: "Other Carbines", ranges: [15, 30, 50, 120], rof: 3, reload: 3, speed: "slow" }
});

const w = (name, cls, cost, availableAfter, capacity, doubleBarreled = false) =>
  ({ name, cls, cost, availableAfter, capacity, doubleBarreled });

export const PRICE_WEAPONS = Object.freeze({
  KN: w("Hunting Knife", "knife", 100, null, null),
  "1D": w("Single Shot Derringer", "derringer", 500, null, 1),
  "2D": w("Two-Shot Derringer", "derringer", 1500, 1870, 2, true),
  CBR: w("Cap & Ball Revolver (6 shot)", "capBall", 2000, null, 6),
  SAR6: w("Single Action Revolver (6 shot)", "singleAction", 3000, 1869, 6),
  SAR5: w("Single Action Revolver (5 shot)", "singleAction", 2600, 1869, 5),
  DAR6: w("Double Action Revolver (6 shot)", "doubleAction", 2800, 1869, 6),
  DAR5: w("Double Action Revolver (5 shot)", "doubleAction", 2500, 1869, 5),
  FDR6: w("Fast Draw Revolver (6 shot)", "fastDraw", 4000, 1870, 6),
  FDR5: w("Fast Draw Revolver (5 shot)", "fastDraw", 3500, 1870, 5),
  LBR: w("Long Barrel Revolver (6 shot)", "longBarrel", 3500, 1870, 6),
  "1SG": w("Shotgun (single barrel)", "shotgun", 2000, null, 1),
  "2SG": w("Shotgun (double barrel)", "shotgun", 3000, null, 2, true),
  "6SG": w("Repeating Shotgun (6 shot)", "shotgun", 7500, 1885, 6),
  SCG: w("Scatter Gun (double barrel)", "scatterGun", 4000, null, 2, true),
  CWR: w("Civil War Type Repeating Rifle (7 shot)", "civilWarRifle", 2500, null, 7),
  CWC: w("Civil War Type Repeating Carbine (7 shot)", "civilWarCarbine", 2000, null, 7),
  "15R": w("Repeating Rifle (15 shot)", "otherRifle", 5000, 1872, 15),
  "9R": w("Repeating Rifle (9 shot)", "otherRifle", 4000, 1872, 9),
  "6R": w("Repeating Rifle (6 shot)", "otherRifle", 3000, 1872, 6),
  "12C": w("Repeating Carbine (12 shot)", "otherCarbine", 4800, 1872, 12),
  "9C": w("Repeating Carbine (9 shot)", "otherCarbine", 3800, 1872, 9),
  "6C": w("Repeating Carbine (6 shot)", "otherCarbine", 2800, 1872, 6),
  BR: w("\"Buffalo\" Rifle (1 shot)", "buffaloRifle", 3000, null, 1),
  AR: w("\"Army\" Rifle (1 shot)", "armyRifle", 2000, null, 1)
});

export const PRICE_GEAR = Object.freeze({
  holsterBelt: { name: "Holster & Gun Belt", cost: 500 },
  rifleSheath: { name: "Rifle Sheath", cost: 400 },
  ammunition: { name: "Ammunition (except Shotgun loads)", cost: 200, per: 100 },
  shotgunLoads: { name: "Shotgun loads", cost: 200, per: 25 },
  saddle: { name: "Saddle, Bridle, & Pads", cost: 4000 },
  horsePoor: { name: "Poor horse", cost: 2000 },
  horseFair: { name: "Fair horse", cost: 5000 },
  horseGood: { name: "Good horse", cost: 10000 },
  horseExcellent: { name: "Excellent horse", cost: 15000 },
  mule: { name: "Mule", cost: 2000 },
  oxen: { name: "Oxen", cost: 2500 }
});

export const HOLSTER_INCLUDED = Object.freeze(["FDR6", "FDR5"]);
export const STARTING_CASH = 15000;

export function weaponProfile(key) {
  const item = PRICE_WEAPONS[key];
  const cls = item ? WEAPON_CLASSES[item.cls] : WEAPON_CLASSES[key];
  if (!cls) return null;
  const doubleBarreled = !!item?.doubleBarreled;
  return {
    key,
    name: item?.name ?? cls.name,
    weaponClass: item?.cls ?? key,
    ranges: [...cls.ranges],
    rateOfFire: doubleBarreled && cls.rofDouble ? cls.rofDouble : cls.rof,
    reload: cls.reload,
    speedClass: cls.speed,
    speedModifier: SPEED_CLASS_MODIFIER[cls.speed],
    thrown: !!cls.thrown,
    spread: cls.spread ?? null,
    capacity: item?.capacity ?? null,
    cost: item?.cost ?? null,
    availableAfter: item?.availableAfter ?? null
  };
}

export const RANGE_BANDS = Object.freeze(["short", "medium", "long", "extreme"]);

export function rangeBand(key, inches) {
  const p = weaponProfile(key);
  if (!p || !(inches >= 0)) return null;
  const i = p.ranges.findIndex((max) => inches <= max);
  return i < 0 ? null : RANGE_BANDS[i];
}

export function isAvailable(key, year) {
  const after = PRICE_WEAPONS[key]?.availableAfter;
  return after == null || year == null || year > after;
}

export function runSelfTests() {
  const { ok, eq, count } = makeChecker();
  eq(Object.keys(WEAPON_CLASSES).length, 17, "17 Weapons Chart rows");
  eq(Object.keys(PRICE_WEAPONS).length, 25, "25 Price Chart weapons");
  for (const [k, item] of Object.entries(PRICE_WEAPONS)) ok(WEAPON_CLASSES[item.cls], `${k} maps to a Weapons Chart row`);
  for (const [k, c] of Object.entries(WEAPON_CLASSES)) {
    ok(c.ranges.every((v, i) => i === 0 || v > c.ranges[i - 1]), `${k} ranges ascend`);
    ok(k in SPEED_CLASS_MODIFIER || c.speed in SPEED_CLASS_MODIFIER, `${k} speed class known`);
  }
  eq(SPEED_CLASS_MODIFIER.fast, 8, "Fast +8 (scan)");
  eq(weaponProfile("DAR6").speedModifier, 5, "double action Average +5");
  eq(weaponProfile("SAR5").speedModifier, 8, "single action Fast +8");
  eq(weaponProfile("FDR6").speedModifier, 10, "fast draw Very Fast +10");
  eq(weaponProfile("BR").speedModifier, -10, "buffalo Very Slow -10");
  eq(weaponProfile("2SG").rateOfFire, 2, "double-barrel shotgun ROF 2");
  eq(weaponProfile("1SG").rateOfFire, 1, "single-barrel shotgun ROF 1");
  eq(weaponProfile("SCG").rateOfFire, 2, "scatter gun double barrel ROF 2");
  eq(weaponProfile("2D").rateOfFire, 2, "two-shot derringer ROF 2");
  eq(weaponProfile("1D").rateOfFire, 1, "single shot derringer ROF 1");
  eq(weaponProfile("15R").rateOfFire, 3, "repeating rifle ROF 3");
  eq(weaponProfile("bow").reload, 1, "bow reload 1");
  eq(weaponProfile("knife").reload, null, "knife no reload");
  ok(weaponProfile("lance").thrown, "lance is thrown/launched");
  eq(weaponProfile("nope"), null, "unknown key");

  eq(rangeBand("DAR6", 0), "short", "0 short");
  eq(rangeBand("DAR6", 4), "short", "4 short");
  eq(rangeBand("DAR6", 4.5), "medium", "4+ medium");
  eq(rangeBand("DAR6", 10), "medium", "10 medium");
  eq(rangeBand("DAR6", 20), "long", "20 long");
  eq(rangeBand("DAR6", 40), "extreme", "40 extreme");
  eq(rangeBand("DAR6", 41), null, "past extreme");
  eq(rangeBand("BR", 300), "extreme", "buffalo 300 extreme");
  eq(rangeBand("SCG", 3), "medium", "scatter 3 medium");

  ok(isAvailable("6SG", 1886) && !isAvailable("6SG", 1885), "repeating shotgun after 1885");
  ok(isAvailable("SAR6", 1870) && !isAvailable("SAR6", 1869), "single action after 1869");
  ok(isAvailable("CBR", 1865), "cap & ball always");
  ok(isAvailable("15R", null), "no campaign year = all available");
  eq(PRICE_GEAR.ammunition.per, 100, "ammo box of 100");
  eq(PRICE_GEAR.shotgunLoads.per, 25, "shotgun loads box of 25");
  eq(STARTING_CASH, 15000, "$150.00 starting cash");
  console.log(`weapons.mjs — all self-tests passed (${count()} assertions).`);
}

if (isMain(import.meta.url)) runSelfTests();

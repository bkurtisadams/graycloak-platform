// load.js — what a character carries and what it costs them. Book 1 (1977)
// p.32 WEIGHT, and the weights printed in the weapon descriptions pp.33-38.
//
//   "Any character may carry a load equal to his strength characteristic, in
//   kilograms. ... Clothing, personal armor, and minor items such as holsters,
//   scabbards, and belts are not counted."
//   "A character may carry up to twice his strength in kilograms, and is
//   considered to be encumbered while doing so. Encumbered persons are treated
//   as if their strength, dexterity, and endurance are one less than normal
//   ... for all purposes, including wounds and strength advantage."
//   "A character who is part of a military force may carry up to triple his
//   strength in kilograms, subject to a reduction of 2."
//   "Normal gravity for a world is 7 ... Subtract the actual gravity factor of
//   the world ... and multiply by 12.5%. This indicates the additional load."
//
// The gravity factor is the world's size digit. Both of the book's examples are
// misprinted: a gravity of 3 is said to allow "an additional 40% load" though
// 4 steps of 12.5% is 50%, and a gravity of 8 is worked as "(8 - 9 = -1)". The
// rule as stated (12.5% a step from 7) is followed; its second example's
// result, a 12.5% reduction, agrees with it.
//
// Graycloak rulings (Sep 2026): the 40% is a misprint and a gravity of 3 adds
// 50%; load is reckoned against the full Strength characteristic, not Strength
// as wounded; and the limit follows the gravity of whatever world the
// character is on, so callers pass that world's size as gravityFactor and
// pass none aboard ship.

export const NORMAL_GRAVITY_FACTOR = 7;
export const GRAVITY_LOAD_STEP = 0.125;

const W = (weapon, ammunition = 0, { countsTowardLoad = true, note = null } = {}) => Object.freeze({ weapon, ammunition, countsTowardLoad, note });

// Grams. `weapon` is the weapon unloaded; `ammunition` is one loaded magazine,
// six cartridges, or the power pack. Where the book prints a range, the entry
// is its midpoint and says so.
export const PERSONAL_WEAPON_WEIGHTS_GRAMS = Object.freeze({
  hands: W(0),
  club: W(1000, 0, { note: 'found weapons weigh 0.5 to 3.0 kg; 1 kg assumed' }),
  dagger: W(250, 0, { countsTowardLoad: false, note: 'worn constantly; its weight does not count against load' }),
  blade: W(350),
  foil: W(500),
  cutlass: W(1250),
  sword: W(1000),
  broadsword: W(2500),
  bayonet: W(300, 0, { note: 'printed as 250 to 350 g' }),
  spear: W(2250, 0, { note: 'printed as 1500 to 3000 g' }),
  halberd: W(2500),
  pike: W(2500, 0, { note: 'printed as 2000 to 3000 g' }),
  cudgel: W(1000),
  'body-pistol': W(250, 50),
  'automatic-pistol': W(750, 250),
  revolver: W(900, 100),
  carbine: W(3000, 125),
  rifle: W(4000, 500),
  'automatic-rifle': W(5000, 500),
  shotgun: W(3750, 750),
  'submachine-gun': W(2500, 500),
  'laser-carbine': W(5000, 3000),
  'laser-rifle': W(6000, 4000)
});

export function personalWeaponWeight(weaponKey) {
  return PERSONAL_WEAPON_WEIGHTS_GRAMS[weaponKey] ?? null;
}

// A weapon as carried ready for use: loaded, or with its power pack.
export function personalWeaponCarriedWeightGrams(weaponKey) {
  const entry = personalWeaponWeight(weaponKey);
  return entry ? entry.weapon + entry.ammunition : 0;
}

export function gravityLoadMultiplier(gravityFactor = null) {
  if (gravityFactor === null || gravityFactor === undefined) return 1;
  if (!Number.isFinite(gravityFactor) || gravityFactor < 0) throw new RangeError('gravity factor must be a non-negative number');
  return Math.max(0, 1 + (NORMAL_GRAVITY_FACTOR - gravityFactor) * GRAVITY_LOAD_STEP);
}

// state: 'unencumbered' (no DM), 'encumbered' (-1), 'military-load' (-2, only
// for a member of a military force), 'overloaded' (more than may be carried).
export function assessLoad({ strength, loadGrams, military = false, gravityFactor = null } = {}) {
  if (!Number.isFinite(strength) || strength < 0) throw new RangeError('strength must be a non-negative number');
  if (!Number.isFinite(loadGrams) || loadGrams < 0) throw new RangeError('loadGrams must be a non-negative number');
  const multiplier = gravityLoadMultiplier(gravityFactor);
  const normalGrams = Math.round(strength * 1000 * multiplier);
  const doubleGrams = normalGrams * 2;
  const tripleGrams = normalGrams * 3;
  const limitGrams = military ? tripleGrams : doubleGrams;
  let state = 'unencumbered';
  let characteristicDM = 0;
  if (loadGrams > limitGrams) { state = 'overloaded'; characteristicDM = military ? -2 : -1; }
  else if (loadGrams > doubleGrams) { state = 'military-load'; characteristicDM = -2; }
  else if (loadGrams > normalGrams) { state = 'encumbered'; characteristicDM = -1; }
  return Object.freeze({ loadGrams, normalGrams, doubleGrams, tripleGrams, limitGrams, military: Boolean(military), gravityFactor, multiplier, state, characteristicDM });
}

// "Treated as if their strength, dexterity, and endurance are one less."
export function applyLoadToCharacteristics(characteristics, characteristicDM = 0) {
  const next = { ...characteristics };
  for (const key of ['STR', 'DEX', 'END']) if (Number.isFinite(next[key])) next[key] = Math.max(0, next[key] + characteristicDM);
  return next;
}

export function inventoryLoadGrams(inventory = []) {
  return inventory.reduce((sum, item) => (item.carried && item.countsTowardLoad ? sum + item.weightGrams * item.quantity : sum), 0);
}

// ---------------------------------------------------------------------------
// Book 3 (1977) pp.19-21: random person encounters, and the law level's throw
// to avoid arrest (p.7).
//
// "Usually, a random encounter point with humans will occur once per day.
// There is a one third chance that a group will be met (throw one die: a
// result of 5 or 6 indicates an encounter)." The table is thrown as two dice
// in turn (d66); its six 6x rows are left blank, "initially ... interpreted as
// no encounter". Each group shares one Strength, Dexterity and Endurance
// (2D each); one member may be "armed extraordinarily" from the weapons table
// (column 1, a dash rolls column 2, then 3). Weapon skill 1 throughout.
//
// Law (p.7): "law levels indicate the general throw for police or enforcement
// harassment for violations ... a saving throw of 4 or more to avoid arrest
// when encountering an enforcement agent such as a policeman or customs
// agent." Not at a starport, where local law does not apply.
// ---------------------------------------------------------------------------

import { rollReaction } from './patrons.js';

const entry = (type, quantity, vehicle, weaponry, armor, weapon, armorKey, { enforcement = false } = {}) =>
  Object.freeze({ type, quantity, vehicle, weaponry, armor, weapon, armorKey, enforcement });

// weapon/armorKey: the first weapon named, as the personal-combat key; the
// table's armor as the armor key ('none' for a dash).
export const RANDOM_PERSON_ENCOUNTERS = Object.freeze({
  11: entry('Peasants', '1D', false, 'Clubs and cudgels', null, 'club', 'none'),
  12: entry('Peasants', '2D', false, 'Clubs and cudgels', null, 'club', 'none'),
  13: entry('Workers', '2D', false, 'Clubs', null, 'club', 'none'),
  14: entry('Rowdies', '3D', false, 'Clubs', 'Jack', 'club', 'jack'),
  15: entry('Thugs', '2D', false, 'Daggers', 'Jack', 'dagger', 'jack'),
  16: entry('Thugs', '2D', false, 'Revolvers', 'Jack', 'revolver', 'jack'),
  21: entry('Soldiers', '2D', false, 'Rifles and bayonets', 'Cloth', 'rifle', 'cloth'),
  22: entry('Soldiers', '2D', true, 'Carbines', 'Mesh', 'carbine', 'mesh'),
  23: entry('Police', '1D', true, 'Automatic Pistols', 'Cloth', 'automatic-pistol', 'cloth', { enforcement: true }),
  24: entry('Marines', '2D', true, 'Revolvers and Cutlasses', 'Mesh', 'revolver', 'mesh'),
  25: entry('Naval Troops', '3D', true, 'Carbines', null, 'carbine', 'none'),
  26: entry('Soldiers', '2D', true, 'Submachine Guns', 'Jack', 'submachine-gun', 'jack'),
  31: entry('Adventurers', '1D', false, 'Swords', 'Jack', 'sword', 'jack'),
  32: entry('Noble with retinue', '2D', false, 'Foils', null, 'foil', 'none'),
  33: entry('Hunters', '2D', false, 'Rifles and Spears', 'Jack', 'rifle', 'jack'),
  34: entry('Tourists', '2D', true, null, null, 'hands', 'none'),
  35: entry('Researchers', '2D', true, null, null, 'hands', 'none'),
  36: entry('Police', '1D', true, 'Revolvers', null, 'revolver', 'none', { enforcement: true }),
  41: entry('Fugitives', '1D', false, 'Clubs', null, 'club', 'none'),
  42: entry('Fugitives', '2D', true, 'Blades', 'Jack', 'blade', 'jack'),
  43: entry('Fugitives', '3D', false, 'Revolvers', null, 'revolver', 'none'),
  44: entry('Vigilantes', '2D', true, 'Rifles and carbines', 'Jack', 'rifle', 'jack'),
  45: entry('Bandits', '3D', false, 'Swords and Pistols', null, 'sword', 'none'),
  46: entry('Brigands', '3D', false, 'Broadswords and Pistols', 'Cloth', 'broadsword', 'cloth'),
  51: entry('Merchant', '3D', true, 'Foils', null, 'foil', 'none'),
  52: entry('Traders', '2D', true, 'Blades', 'Jack', 'blade', 'jack'),
  53: entry('Religious Group', '2D', false, null, null, 'hands', 'none'),
  54: entry('Religious Group', '3D', false, 'Daggers', null, 'dagger', 'none'),
  55: entry('Noble with retinue', '2D', false, 'Swords and Pistols', 'Mesh', 'sword', 'mesh'),
  56: entry('Guards', '3D', false, 'Halberds and Daggers', 'Jack', 'halberd', 'jack'),
  61: null, 62: null, 63: null, 64: null, 65: null, 66: null
});

// The weapons table, three columns by 1D; null is the dash.
export const EXTRAORDINARY_WEAPONS = Object.freeze([
  Object.freeze(['laser-rifle', 'automatic-rifle', null, null, null, null]),
  Object.freeze(['shotgun', 'carbine', 'revolver', null, null, null]),
  Object.freeze(['broadsword', 'sword', 'halberd', 'cutlass', 'foil', null])
]);

const sum = (dice, count) => Array.from({ length: count }, () => dice.rollD6()).reduce((total, die) => total + die, 0);

export function personEncounterCheck(dice) {
  const die = dice.rollD6();
  return Object.freeze({ die, hit: die >= 5 });
}

export function rollExtraordinaryWeapon(dice) {
  const thrown = [];
  for (const [index, column] of EXTRAORDINARY_WEAPONS.entries()) {
    const die = dice.rollD6();
    thrown.push(die);
    const weapon = column[die - 1];
    if (weapon) return Object.freeze({ weapon, column: index + 1, thrown: Object.freeze(thrown) });
  }
  return Object.freeze({ weapon: null, column: null, thrown: Object.freeze(thrown) });
}

/** One random person encounter (Book 3 p.21), or a blank 6x row. */
export function rollPersonEncounter(dice, { reactionDM = 0 } = {}) {
  const tens = dice.rollD6();
  const units = dice.rollD6();
  const code = tens * 10 + units;
  const row = RANDOM_PERSON_ENCOUNTERS[code];
  if (!row) return Object.freeze({ code, blank: true, type: null });
  const quantity = sum(dice, Number(row.quantity[0]));
  const characteristics = Object.freeze({ strength: sum(dice, 2), dexterity: sum(dice, 2), endurance: sum(dice, 2) });
  const extraordinary = rollExtraordinaryWeapon(dice);
  const reaction = rollReaction(dice, { dm: reactionDM });
  return Object.freeze({
    code, blank: false, ...row, quantity, quantityDice: row.quantity, characteristics,
    extraordinary: extraordinary.weapon ? extraordinary : null, reaction
  });
}

/**
 * Book 3 p.7: the law level is the throw (2D) to avoid arrest on meeting an
 * enforcement agent. Only for a violation; the caller says what it is.
 */
export function lawArrestThrow(dice, { lawLevel }) {
  if (!Number.isInteger(lawLevel) || lawLevel < 0) throw new RangeError('lawLevel must be a whole number');
  const total = sum(dice, 2);
  return Object.freeze({ total, needed: lawLevel, avoided: total >= lawLevel });
}

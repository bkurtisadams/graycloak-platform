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

// v0.76.0 (Kurt, Sep 2026): The Traveller Book (1982): an arrest for a
// weapons violation means 1D days in jail. Other offences have no term in
// the books yet; they are the referee's until ruled.
export function weaponsViolationJailDays(dice) {
  return dice.rollD6();
}

// ---------------------------------------------------------------------------
// v0.77.0: The Traveller Book (1982) pp.99-101 encounters, adopted where they
// settle what Book 3 left open (Kurt, Sep 2026).
// ---------------------------------------------------------------------------

const clampDie = (value) => Math.min(6, Math.max(1, value));

/**
 * Legal encounters, once a day outside the starport. The printed wording
 * ("throw local law level or less to avoid an encounter") reads backwards
 * against its own prose — permissive worlds rarely bothered, oppressive ones
 * constantly — so the ruling follows the prose: an enforcer stops the party
 * on 2D equal to or under the law level.
 */
export function legalEncounterCheck(dice, { lawLevel }) {
  if (!Number.isInteger(lawLevel) || lawLevel < 0) throw new RangeError('lawLevel must be a whole number');
  const total = sum(dice, 2);
  return Object.freeze({ total, lawLevel, encounter: total <= lawLevel });
}

/** "A local enforcer will stop the adventurers and require identification." */
export function rollLegalEncounter(dice, { reactionDM = 0 } = {}) {
  const characteristics = Object.freeze({ strength: sum(dice, 2), dexterity: sum(dice, 2), endurance: sum(dice, 2) });
  const reaction = rollReaction(dice, { dm: reactionDM });
  return Object.freeze({
    code: null, blank: false, legal: true, type: 'Local enforcer', quantity: 1, quantityDice: '1',
    vehicle: true, weaponry: 'Automatic Pistol', armor: 'Cloth', weapon: 'automatic-pistol', armorKey: 'cloth',
    enforcement: true, characteristics, extraordinary: null, reaction
  });
}

// Random encounters "may occur only if there is a local population".
export function hasLocalPopulation(population) {
  return Number(population) > 0;
}

// Patrons: a weekly throw of 5+ on 1D while the party is looking. The matrix
// reads its code as the second die (tens) and the first die (units).
const list = (names) => Object.freeze(Object.fromEntries(names.map((name, index) => [(Math.floor(index / 6) + 1) * 10 + (index % 6) + 1, name])));
export const PATRON_LISTS = Object.freeze({
  one: list([
    'Arsonist', 'Cutthroat', 'Assassin', 'Hijacker', 'Smuggler', 'Terrorist',
    'Crewmember', 'Peasant', 'Rumor', 'Clerk', 'Soldier', 'Shopkeeper',
    'Shipowner', 'Tourist', 'Merchant', 'Police', 'Scout', 'Rumor',
    'Diplomat', 'Courier', 'Spy', 'Scholar', 'Governor', 'Administrator',
    'Mercenary', 'Naval Officer', 'Marine Officer', 'Scout', 'Army Officer', 'Mercenary',
    'Noble', 'Playboy', 'Avenger', 'Emigre', 'Speculator', 'Rumor'
  ]),
  two: list([
    'Naval Officer', 'Scout Administrator', 'Marine Officer', 'Hunter', 'Starport Warden', 'Naval Officer',
    'Reporter', 'Technician', 'Doctor', 'Rogue', 'Noble', 'Government Official',
    'Barbarian', 'Scout Pilot', 'Pirate', 'Researcher', 'Writer', 'Professor',
    'Underworld Leader', 'Scientist', 'Belter', 'Naval Architect', 'Steward', 'Financier',
    'Navigator', 'Swindler', 'Broker', 'Arms Merchant', 'Doctor', 'Pilot',
    'Merchant', 'Rogue', 'Embezzler', 'Belter', 'Bureaucrat', 'Diplomat'
  ])
});

/**
 * The patron matrix DMs for the character doing the looking (The Traveller
 * Book p.100). List one: first die merchant -1, noble (Soc 11+) +1; second
 * die other service -1, army or marine +1. List two: first die naval -1,
 * merchant +1; second die Streetwise-1+ -1, Admin-1+ +1.
 */
export function patronMatrixDMs(listKey, { service = null, socialStanding = 0, skills = {} } = {}) {
  const parts = { first: [], second: [] };
  const svc = String(service ?? '').toLowerCase();
  if (listKey === 'one') {
    if (svc === 'merchants') parts.first.push({ label: 'merchant', dm: -1 });
    if (Number(socialStanding) >= 11) parts.first.push({ label: 'noble', dm: 1 });
    if (svc === 'other') parts.second.push({ label: 'other service', dm: -1 });
    if (svc === 'army' || svc === 'marines') parts.second.push({ label: svc === 'army' ? 'army' : 'marine', dm: 1 });
  } else if (listKey === 'two') {
    if (svc === 'navy') parts.first.push({ label: 'naval', dm: -1 });
    if (svc === 'merchants') parts.first.push({ label: 'merchant', dm: 1 });
    if (Number(skills.Streetwise ?? 0) >= 1) parts.second.push({ label: 'Streetwise', dm: -1 });
    if (Number(skills.Admin ?? skills.Administration ?? 0) >= 1) parts.second.push({ label: 'Admin', dm: 1 });
  } else throw new RangeError(`unknown patron list: ${listKey}`);
  const total = (entries) => entries.reduce((sumDM, entry) => sumDM + entry.dm, 0);
  return Object.freeze({ first: total(parts.first), second: total(parts.second), parts: Object.freeze(parts) });
}

export function patronCheck(dice) {
  const die = dice.rollD6();
  return Object.freeze({ die, found: die >= 5 });
}

export function rollPatron(dice, { listKey = 'one', firstDM = 0, secondDM = 0, reactionDM = 0 } = {}) {
  const table = PATRON_LISTS[listKey];
  if (!table) throw new RangeError(`unknown patron list: ${listKey}`);
  const first = clampDie(dice.rollD6() + firstDM);
  const second = clampDie(dice.rollD6() + secondDM);
  const code = second * 10 + first;
  const type = table[code];
  const rumor = type === 'Rumor';
  return Object.freeze({ listKey, code, type, rumor, reaction: rumor ? null : rollReaction(dice, { dm: reactionDM }) });
}

// Rumors: a weekly throw of 7+ on 2D, and whenever the patron list gives
// "Rumor". The matrix gives a type; the referee writes the rumor itself.
export const RUMOR_TYPES = Object.freeze({
  A: 'Background information', B: 'Minor fact', C: 'Major fact', D: 'Partial (potentially misleading) fact', E: 'Veiled clue',
  F: 'Information leading to trap', G: 'Location data', H: 'Important fact', I: 'Obvious clue', J: 'Completely false information',
  K: 'Terminology', L: 'Library data reference', M: 'Helpful data', N: 'Location data', O: 'Reliable recommendation to action',
  P: 'Major fact', Q: 'Background information', R: 'Minor fact', S: 'Veiled clue', T: 'Misleading clue',
  U: 'Broad background information', V: 'Misleading background information', W: 'Reference to library data',
  X: 'General location data', Y: 'Specific background data', Z: 'Misleading background data'
});
// Rows by the second die, columns by the first.
export const RUMOR_MATRIX = Object.freeze([
  'ABCDEF', 'GUUWWH', 'IUYYWJ', 'KXZZVL', 'MXXVVN', 'OPQRST'
].map((row) => Object.freeze(row.split(''))));

export function rumorCheck(dice) {
  const total = sum(dice, 2);
  return Object.freeze({ total, found: total >= 7 });
}

export function rollRumor(dice) {
  const first = dice.rollD6();
  const second = dice.rollD6();
  const letter = RUMOR_MATRIX[second - 1][first - 1];
  return Object.freeze({ first, second, letter, type: RUMOR_TYPES[letter], general: letter >= 'U' });
}

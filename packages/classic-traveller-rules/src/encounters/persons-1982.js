// ---------------------------------------------------------------------------
// The Traveller Book (1982) pp.99-102: the random encounter list and how an
// encountered group is equipped. Graycloak ruling (Kurt, Sep 2026): the 1982
// list replaces Book 3 (1977) p.21 for the play page; persons.js keeps the
// 1977 table for the old client. Remarks as Kurt read them from the book.
//
// p.99/p.101: "Unless contradicted by the remarks, the group can be assumed
// to be unarmored, armed only with blade weapons, on foot, and at the tech
// level of the current world." Remarks: L a leader (the best possible
// equipment for the tech level; "armed with a gun and ... armored consistent
// with local tech level"); G guns; A armor; V a vehicle (riding animals
// count); -N / +N the group's tech level against the world's. "Only military
// troops and leaders will wear combat armor or battle dress." Everyone has
// the survival gear the world needs, whatever its tech level.
//
// p.102: encountered NPCs are equipped consistently with the local tech
// level and law level "unless there is a definite reason (special
// permission from local authorities; imported or smuggled equipment;
// military issue)". Which groups have such a reason is Graycloak's call,
// per row below: military and police (issue), outlaws (smuggled), a noble's
// retinue and guards (permission); everyone else keeps the law.
// ---------------------------------------------------------------------------

import { requireDice } from '../dice.js';
import { getPersonalWeapon } from '../combat/personal-combat.js';
import { rollReaction } from './patrons.js';

function parseRemarks(remarks) {
  const text = String(remarks ?? '');
  const tech = /([+-]\d+)/.exec(text);
  const codes = text.replace(/[+-]\d+/, '');
  return Object.freeze({
    techDM: tech ? Number(tech[1]) : 0, leader: codes.includes('L'), guns: codes.includes('G'), armor: codes.includes('A'), vehicle: codes.includes('V')
  });
}

// gear: whose equipment ignores the law level (p.102's "definite reason").
const row = (type, quantity, remarks, gear = 'civil', { enforcement = false } = {}) =>
  Object.freeze({ type, quantity, remarks, ...parseRemarks(remarks), gear, enforcement });

export const RANDOM_PERSON_ENCOUNTERS_1982 = Object.freeze({
  11: row('Peasants', '1D', '-3'),
  12: row('Peasants', '2D', '-2'),
  13: row('Workers', '2D', '-1'),
  14: row('Rowdies', '3D', 'L', 'outlaw'),
  15: row('Thugs', '2D', 'L', 'outlaw'),
  16: row('Riotous Mob', '4D', '-1', 'outlaw'),
  21: row('Soldiers', '2D', '+1 LGA', 'military'),
  22: row('Soldiers', '2D', 'LGAV', 'military'),
  23: row('Police Patrol', '1D', '+1 GA', 'police', { enforcement: true }),
  24: row('Marines', '2D', 'LGA', 'military'),
  25: row('Security Troops', '3D', '+1 GA', 'military'),
  26: row('Soldiers on Patrol', '2D', 'LGA', 'military'),
  31: row('Adventurers', '1D', '+2 GAV'),
  32: row('Noble with Retinue', '2D', 'LGAV', 'permitted'),
  33: row('Hunters and Guides', '2D', '+1 LGV'),
  34: row('Tourists', '2D', '+2'),
  35: row('Researchers', '1D', '+3 V'),
  36: row('Police Patrol', '1D', 'VG', 'police', { enforcement: true }),
  41: row('Fugitives', '1D', '-2', 'outlaw'),
  42: row('Fugitives', '2D', 'V', 'outlaw'),
  43: row('Fugitives', '3D', 'G', 'outlaw'),
  44: row('Vigilantes', '2D', 'G'),
  45: row('Bandits', '3D', 'L', 'outlaw'),
  46: row('Ambushing Brigands', '3D', 'LGA', 'outlaw'),
  51: row('Merchants', '1D', '+1 LA'),
  52: row('Traders', '2D', 'GV'),
  53: row('Religious Group', '2D', ''),
  54: row('Beggars', '1D', 'L'),
  55: row('Pilgrims', '5D', 'A'),
  56: row('Guards', '3D', 'A', 'permitted'),
  61: null, 62: null, 63: null, 64: null, 65: null, 66: null
});

// p.101 Available Weapons by TL (the bayonet is left out: it needs a rifle).
export const WEAPONS_BY_TECH_LEVEL_1982 = Object.freeze({
  0: Object.freeze(['club', 'cudgel', 'spear']), 1: Object.freeze(['dagger', 'pike', 'sword']), 2: Object.freeze(['halberd', 'broadsword']),
  3: Object.freeze(['foil', 'cutlass', 'blade']), 4: Object.freeze(['revolver', 'shotgun']),
  5: Object.freeze(['carbine', 'rifle', 'automatic-pistol', 'submachine-gun']), 6: Object.freeze(['automatic-rifle']),
  7: Object.freeze(['body-pistol']), 8: Object.freeze(['laser-carbine']), 9: Object.freeze(['laser-rifle'])
});
// p.101 armor column, as the Book 1 combat armor keys; battle dress (TL13)
// fights as combat armor on those tables.
export const ARMOR_BY_TECH_LEVEL_1982 = Object.freeze({ jack: 1, cloth: 6, mesh: 7, ablat: 9, reflec: 10, combat: 11 });

const BLADES = new Set(['dagger', 'sword', 'broadsword', 'foil', 'cutlass', 'blade']);
const GUNS = new Set(['revolver', 'shotgun', 'carbine', 'rifle', 'automatic-pistol', 'submachine-gun', 'automatic-rifle', 'body-pistol', 'laser-carbine', 'laser-rifle']);
// A leader's "best possible" gun, best first.
const BEST_GUNS = Object.freeze(['laser-rifle', 'laser-carbine', 'automatic-rifle', 'rifle', 'submachine-gun', 'carbine', 'automatic-pistol', 'shotgun', 'revolver']);
const BEST_BLADES = Object.freeze(['broadsword', 'cutlass', 'sword', 'blade', 'foil', 'dagger']);

const pickOne = (dice, list) => (list.length ? list[(dice.rollD6() * 6 + dice.rollD6() - 7) % list.length] : null);
const sum = (dice, count) => Array.from({ length: count }, () => dice.rollD6()).reduce((total, die) => total + die, 0);

function weaponsAt(techLevel) {
  const keys = [];
  for (let level = 0; level <= Math.min(9, techLevel); level += 1) keys.push(...(WEAPONS_BY_TECH_LEVEL_1982[level] ?? []));
  return keys;
}

const nameOf = (key) => (key === 'hands' ? null : getPersonalWeapon(key).name);
const ARMOR_NAMES = Object.freeze({ none: null, jack: 'Jack', cloth: 'Cloth', mesh: 'Mesh', ablat: 'Ablat', reflec: 'Reflec', combat: 'Combat armor' });

/**
 * What a group from the list carries. techLevel: the world's; prohibited:
 * weapon keys the law level forbids ('*' for all), which a group with no
 * definite reason keeps to. Returns the group's gear, and a leader's.
 */
export function equipEncounterGroup(dice, entry, { techLevel = 7, prohibited = [] } = {}) {
  requireDice(dice);
  const tech = Math.max(0, Math.round(Number(techLevel) || 0) + entry.techDM);
  const lawful = !['military', 'police', 'outlaw', 'permitted'].includes(entry.gear);
  const banned = new Set(lawful ? prohibited : []);
  const allowed = (key) => !banned.has('*') && !banned.has(key);
  const available = weaponsAt(tech).filter(allowed);
  const guns = available.filter((key) => GUNS.has(key) && key !== 'body-pistol');
  const blades = available.filter((key) => BLADES.has(key));
  // Blades by default; the oldest weapons where the world has no blades;
  // bare hands where the law forbids even those.
  const groupBlade = () => pickOne(dice, blades) ?? pickOne(dice, available.filter((key) => !GUNS.has(key))) ?? 'hands';
  const weapon = entry.guns ? (pickOne(dice, guns) ?? groupBlade()) : groupBlade();
  const military = entry.gear === 'military';
  const armors = Object.entries(ARMOR_BY_TECH_LEVEL_1982).filter(([key, level]) => level <= tech && (military || key !== 'combat')).map(([key]) => key);
  const armorKey = entry.armor ? (pickOne(dice, armors) ?? 'none') : 'none';
  let leader = null;
  if (entry.leader) {
    const gun = BEST_GUNS.find((key) => guns.includes(key)) ?? BEST_BLADES.find((key) => blades.includes(key)) ?? weapon;
    const best = Object.entries(ARMOR_BY_TECH_LEVEL_1982).filter(([, level]) => level <= tech).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'none';
    leader = Object.freeze({ weapon: gun, weaponry: nameOf(gun), armorKey: best, armor: ARMOR_NAMES[best] });
  }
  return Object.freeze({
    techLevel: tech, weapon, weaponry: nameOf(weapon), armorKey, armor: ARMOR_NAMES[armorKey], vehicle: entry.vehicle, leader,
    lawful, restrictedByLaw: lawful && banned.size > 0
  });
}

/** One random encounter off the 1982 list (p.101), or a blank 6x row. */
export function rollPersonEncounter1982(dice, { reactionDM = 0, techLevel = 7, prohibited = [] } = {}) {
  requireDice(dice);
  const tens = dice.rollD6();
  const units = dice.rollD6();
  const code = tens * 10 + units;
  const entry = RANDOM_PERSON_ENCOUNTERS_1982[code];
  if (!entry) return Object.freeze({ code, blank: true, type: null });
  const quantity = sum(dice, Number(entry.quantity[0]));
  // As 1977 p.20: the group shares one Strength, Dexterity and Endurance.
  const characteristics = Object.freeze({ strength: sum(dice, 2), dexterity: sum(dice, 2), endurance: sum(dice, 2) });
  const gear = equipEncounterGroup(dice, entry, { techLevel, prohibited });
  const reaction = rollReaction(dice, { dm: reactionDM });
  return Object.freeze({
    code, blank: false, edition: 1982, type: entry.type, quantity, quantityDice: entry.quantity, remarks: entry.remarks, gearRule: entry.gear,
    enforcement: entry.enforcement, ...gear, characteristics, extraordinary: null, reaction
  });
}

// ---------------------------------------------------------------------------
// 0.86.0 (Kurt, Sep 2026): boarding parties, equipped the same way. Book 2
// p.3 says only that "one or more passengers" attempt a hijacking and that an
// "armed repossession party" boards; who they are and what they carry are
// Graycloak's, in the list's own terms:
//   hijackers           1D (no more than the passengers in staterooms), L:
//                       blades smuggled aboard, the leader a gun — outlaws
//   repossession party  2D, LGA, issued (they ignore the law level)
// ---------------------------------------------------------------------------
export const BOARDING_PARTIES = Object.freeze({
  hijack: row('Hijackers', '1D', 'L', 'outlaw'),
  'repossession-boarding': row('Repossession Party', '2D', 'LGA', 'police')
});

export function rollBoardingParty(dice, kind, { techLevel = 7, maxQuantity = Infinity } = {}) {
  requireDice(dice);
  const entry = BOARDING_PARTIES[kind];
  if (!entry) throw new RangeError(`no boarding party for ${kind}`);
  const thrown = sum(dice, Number(entry.quantity[0]));
  const quantity = Math.max(1, Math.min(thrown, Number.isFinite(maxQuantity) ? maxQuantity : thrown));
  const characteristics = Object.freeze({ strength: sum(dice, 2), dexterity: sum(dice, 2), endurance: sum(dice, 2) });
  const gear = equipEncounterGroup(dice, entry, { techLevel });
  return Object.freeze({
    kind, type: entry.type, quantity, thrown, quantityDice: entry.quantity, remarks: entry.remarks, gearRule: entry.gear, ...gear, characteristics
  });
}

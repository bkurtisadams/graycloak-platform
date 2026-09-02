import { requireDice } from '../dice.js';

export const PERSONAL_COMBAT_RANGES = Object.freeze(['close', 'short', 'medium', 'long', 'very-long']);
export const PERSONAL_ARMOR_TYPES = Object.freeze(['none', 'jack', 'mesh', 'cloth', 'reflec', 'ablat', 'combat']);
export const PERSONAL_COMBAT_STATUSES = Object.freeze(['active', 'unconscious', 'dead', 'escaped', 'withdrawn']);

const RANGE_INDEX = Object.freeze(Object.fromEntries(PERSONAL_COMBAT_RANGES.map((key, index) => [key, index])));
const PHYSICAL_KEYS = Object.freeze(['STR', 'DEX', 'END']);

function weapon(spec) {
  const targets = {};
  for (const armor of PERSONAL_ARMOR_TYPES) targets[armor] = Object.freeze([...spec.targets[armor]]);
  return Object.freeze({ ...spec, skillNames: Object.freeze([...spec.skillNames]), targets: Object.freeze(targets) });
}

// Corrected 1981 Book 1/facsimile weapon tables. Values are the unmodified 2D
// throws required after combining the printed weapon/armor and range DMs.
export const PERSONAL_WEAPONS = Object.freeze({
  'body-pistol': weapon({ name: 'Body Pistol', damageDice: 3, characteristic: 'DEX', lowMax: 7, lowDM: -3, highMin: 11, highDM: 1, skillNames: ['Body Pistol', 'Gun Combat'], melee: false, targets: {
    none: [6, 7, 14, null, null], jack: [6, 7, 14, null, null], mesh: [8, 9, 16, null, null], cloth: [10, 11, 18, null, null], reflec: [6, 7, 14, null, null], ablat: [8, 9, 16, null, null], combat: [13, 14, 21, null, null]
  }}),
  revolver: weapon({ name: 'Revolver', damageDice: 3, characteristic: 'DEX', lowMax: 6, lowDM: -2, highMin: 9, highDM: 1, skillNames: ['Revolver', 'Gun Combat'], melee: false, targets: {
    none: [6, 5, 10, 12, null], jack: [6, 5, 10, 12, null], mesh: [8, 7, 12, 14, null], cloth: [10, 9, 14, 16, null], reflec: [6, 5, 10, 16, null], ablat: [8, 7, 12, 14, null], combat: [12, 11, 16, 18, null]
  }}),
  'automatic-pistol': weapon({ name: 'Automatic Pistol', damageDice: 3, characteristic: 'DEX', lowMax: 6, lowDM: -2, highMin: 10, highDM: 1, skillNames: ['Automatic Pistol', 'Gun Combat'], melee: false, targets: {
    none: [6, 5, 11, 13, null], jack: [6, 5, 11, 13, null], mesh: [8, 7, 12, 14, null], cloth: [10, 9, 14, 16, null], reflec: [6, 5, 10, 16, null], ablat: [8, 7, 12, 14, null], combat: [12, 11, 16, 18, null]
  }}),
  carbine: weapon({ name: 'Carbine', damageDice: 3, characteristic: 'DEX', lowMax: 4, lowDM: -1, highMin: 9, highDM: 1, skillNames: ['Carbine', 'Gun Combat'], melee: false, targets: {
    none: [10, 5, 8, 10, 11], jack: [10, 5, 8, 10, 11], mesh: [12, 7, 10, 12, 13], cloth: [15, 10, 13, 15, 16], reflec: [10, 5, 8, 10, 11], ablat: [11, 6, 9, 11, 12], combat: [17, 12, 15, 17, 18]
  }}),
  rifle: weapon({ name: 'Rifle', damageDice: 3, characteristic: 'DEX', lowMax: 5, lowDM: -2, highMin: 8, highDM: 1, skillNames: ['Rifle', 'Gun Combat'], melee: false, targets: {
    none: [9, 4, 5, 6, 8], jack: [9, 4, 5, 6, 8], mesh: [12, 7, 8, 9, 11], cloth: [14, 9, 10, 11, 13], reflec: [10, 5, 8, 10, 11], ablat: [11, 6, 7, 8, 10], combat: [16, 11, 12, 13, 15]
  }}),
  'automatic-rifle': weapon({ name: 'Automatic Rifle', damageDice: 3, characteristic: 'DEX', lowMax: 6, lowDM: -2, highMin: 10, highDM: 2, skillNames: ['Automatic Rifle', 'Gun Combat'], melee: false, automatic: true, targets: {
    none: [10, 2, 0, 1, 4], jack: [10, 2, 0, 1, 4], mesh: [14, 6, 4, 5, 8], cloth: [17, 9, 7, 8, 11], reflec: [10, 2, 0, 1, 4], ablat: [13, 5, 3, 4, 7], combat: [19, 11, 9, 10, 13]
  }}),
  shotgun: weapon({ name: 'Shotgun', damageDice: 4, characteristic: 'DEX', lowMax: 3, lowDM: -1, highMin: 9, highDM: 1, skillNames: ['Shotgun', 'Gun Combat'], melee: false, targets: {
    none: [11, 2, 0, 9, null], jack: [11, 2, 0, 9, null], mesh: [17, 8, 6, 15, null], cloth: [19, 10, 8, 17, null], reflec: [11, 2, 0, 9, null], ablat: [14, 5, 3, 12, null], combat: [21, 12, 10, 19, null]
  }}),
  'submachine-gun': weapon({ name: 'Submachine Gun', damageDice: 3, characteristic: 'DEX', lowMax: 5, lowDM: -2, highMin: 9, highDM: 2, skillNames: ['Submachine Gun', 'SMG', 'Gun Combat'], melee: false, automatic: true, targets: {
    none: [7, 0, 0, 9, 12], jack: [7, 0, 0, 9, 12], mesh: [12, 5, 5, 14, 17], cloth: [15, 8, 8, 17, 20], reflec: [7, 0, 0, 9, 12], ablat: [10, 3, 3, 12, 15], combat: [16, 9, 9, 18, 21]
  }}),
  'laser-carbine': weapon({ name: 'Laser Carbine', damageDice: 4, characteristic: 'DEX', lowMax: 5, lowDM: -3, highMin: 10, highDM: 2, skillNames: ['Laser Carbine', 'Gun Combat'], melee: false, targets: {
    none: [8, 5, 5, 5, 6], jack: [8, 5, 5, 5, 6], mesh: [9, 6, 6, 6, 7], cloth: [9, 6, 6, 6, 7], reflec: [8, 5, 5, 5, 6], ablat: [17, 14, 14, 14, 15], combat: [16, 13, 13, 13, 14]
  }}),
  'laser-rifle': weapon({ name: 'Laser Rifle', damageDice: 5, characteristic: 'DEX', lowMax: 6, lowDM: -3, highMin: 11, highDM: 2, skillNames: ['Laser Rifle', 'Gun Combat'], melee: false, targets: {
    none: [9, 3, 3, 3, 4], jack: [9, 3, 3, 3, 4], mesh: [10, 4, 4, 4, 5], cloth: [10, 4, 4, 4, 5], reflec: [9, 3, 3, 3, 4], ablat: [19, 13, 13, 13, 14], combat: [18, 12, 12, 12, 13]
  }}),
  hands: weapon({ name: 'Hands', damageDice: 1, characteristic: 'DEX', lowMax: 5, lowDM: -3, highMin: 9, highDM: 1, skillNames: ['Brawling'], melee: true, parry: true, fatigueDM: -2, targets: {
    none: [5, 6, null, null, null], jack: [5, 6, null, null, null], mesh: [7, 8, null, null, null], cloth: [10, 11, null, null, null], reflec: [5, 6, null, null, null], ablat: [7, 8, null, null, null], combat: [12, 13, null, null, null]
  }}),
  club: weapon({ name: 'Club', damageDice: 2, characteristic: 'STR', lowMax: 4, lowDM: -4, highMin: 8, highDM: 1, skillNames: ['Club', 'Brawling'], melee: true, parry: true, fatigueDM: -1, targets: {
    none: [7, 6, null, null, null], jack: [7, 6, null, null, null], mesh: [9, 8, null, null, null], cloth: [10, 9, null, null, null], reflec: [7, 6, null, null, null], ablat: [9, 8, null, null, null], combat: [14, 13, null, null, null]
  }}),
  dagger: weapon({ name: 'Dagger', damageDice: 2, characteristic: 'STR', lowMax: 3, lowDM: -2, highMin: 8, highDM: 2, skillNames: ['Dagger', 'Blade'], melee: true, parry: true, fatigueDM: -2, targets: {
    none: [7, 6, null, null, null], jack: [8, 7, null, null, null], mesh: [11, 10, null, null, null], cloth: [11, 10, null, null, null], reflec: [7, 6, null, null, null], ablat: [9, 8, null, null, null], combat: [14, 13, null, null, null]
  }}),
  blade: weapon({ name: 'Blade', damageDice: 2, characteristic: 'STR', lowMax: 4, lowDM: -2, highMin: 9, highDM: 1, skillNames: ['Blade'], melee: true, parry: true, fatigueDM: -2, targets: {
    none: [6, 6, null, null, null], jack: [7, 7, null, null, null], mesh: [11, 11, null, null, null], cloth: [11, 11, null, null, null], reflec: [6, 6, null, null, null], ablat: [10, 10, null, null, null], combat: [12, 12, null, null, null]
  }}),
  cutlass: weapon({ name: 'Cutlass', damageDice: 3, characteristic: 'STR', lowMax: 6, lowDM: -2, highMin: 11, highDM: 2, skillNames: ['Cutlass', 'Blade'], melee: true, parry: true, fatigueDM: -2, targets: {
    none: [8, 2, null, null, null], jack: [9, 3, null, null, null], mesh: [14, 8, null, null, null], cloth: [15, 9, null, null, null], reflec: [8, 2, null, null, null], ablat: [14, 8, null, null, null], combat: [18, 12, null, null, null]
  }}),
  sword: weapon({ name: 'Sword', damageDice: 2, characteristic: 'STR', lowMax: 5, lowDM: -2, highMin: 10, highDM: 1, skillNames: ['Sword', 'Blade'], melee: true, parry: true, fatigueDM: -3, targets: {
    none: [7, 4, null, null, null], jack: [7, 4, null, null, null], mesh: [13, 10, null, null, null], cloth: [13, 10, null, null, null], reflec: [7, 4, null, null, null], ablat: [12, 9, null, null, null], combat: [16, 13, null, null, null]
  }}),
  broadsword: weapon({ name: 'Broadsword', damageDice: 4, characteristic: 'STR', lowMax: 7, lowDM: -4, highMin: 12, highDM: 2, skillNames: ['Broadsword', 'Blade'], melee: true, parry: true, fatigueDM: -4, targets: {
    none: [11, 0, null, null, null], jack: [11, 0, null, null, null], mesh: [15, 4, null, null, null], cloth: [16, 5, null, null, null], reflec: [11, 0, null, null, null], ablat: [15, 4, null, null, null], combat: [20, 9, null, null, null]
  }}),
  bayonet: weapon({ name: 'Bayonet', damageDice: 3, characteristic: 'STR', lowMax: 4, lowDM: -2, highMin: 9, highDM: 2, skillNames: ['Bayonet', 'Dagger', 'Blade'], melee: true, parry: true, fatigueDM: -2, targets: {
    none: [7, 4, null, null, null], jack: [8, 5, null, null, null], mesh: [9, 6, null, null, null], cloth: [10, 7, null, null, null], reflec: [7, 4, null, null, null], ablat: [11, 8, null, null, null], combat: [15, 12, null, null, null]
  }})
});

function integer(value, label) {
  if (!Number.isInteger(value)) throw new TypeError(`${label} must be an integer`);
  return value;
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }

export function getPersonalWeapon(key) {
  const result = PERSONAL_WEAPONS[key];
  if (!result) throw new RangeError(`unknown personal weapon: ${key}`);
  return result;
}

export function personalWeaponSkillLevel(combatant, weaponKey) {
  const spec = getPersonalWeapon(weaponKey);
  return Math.max(...spec.skillNames.map((name) => Number(combatant.skills?.[name] ?? 0)));
}

export function weaponCharacteristicDM(combatant, weaponKey) {
  const spec = getPersonalWeapon(weaponKey);
  const value = Number(combatant.characteristics?.[spec.characteristic] ?? 0);
  if (value <= spec.lowMax) return spec.lowDM;
  if (value >= spec.highMin) return spec.highDM;
  return 0;
}

export function weaponTargetNumber(weaponKey, armor, range) {
  const spec = getPersonalWeapon(weaponKey);
  if (!PERSONAL_ARMOR_TYPES.includes(armor)) throw new RangeError(`unknown personal armor: ${armor}`);
  if (!Object.hasOwn(RANGE_INDEX, range)) throw new RangeError(`unknown personal combat range: ${range}`);
  return spec.targets[armor][RANGE_INDEX[range]];
}

export function createPersonalCombatant({ id, name, side, characteristics, skills = {}, armor = 'none', weaponKey = 'hands', playerCharacter = false, surpriseDM = 0 } = {}) {
  if (typeof id !== 'string' || !id.trim()) throw new TypeError('combatant id must be a nonblank string');
  if (typeof name !== 'string' || !name.trim()) throw new TypeError('combatant name must be a nonblank string');
  if (typeof side !== 'string' || !side.trim()) throw new TypeError('combatant side must be a nonblank string');
  if (!characteristics || typeof characteristics !== 'object') throw new TypeError('combatant characteristics must be an object');
  const base = {};
  for (const key of ['STR', 'DEX', 'END', 'INT']) base[key] = integer(characteristics[key], `combatant ${key}`);
  getPersonalWeapon(weaponKey);
  if (!PERSONAL_ARMOR_TYPES.includes(armor)) throw new RangeError(`unknown personal armor: ${armor}`);
  return { id: id.trim(), name: name.trim(), side: side.trim(), playerCharacter: Boolean(playerCharacter), characteristics: clone(base), current: { STR: base.STR, DEX: base.DEX, END: base.END }, skills: clone(skills), armor, weaponKey, status: 'active', firstBlood: true, surpriseDM: integer(surpriseDM, 'surpriseDM'), evading: false, blows: 0, hitsTaken: 0 };
}

export function resolvePersonalSurprise({ sides, dice } = {}) {
  requireDice(dice);
  if (!Array.isArray(sides) || sides.length !== 2) throw new TypeError('surprise requires exactly two sides');
  const results = sides.map((side) => {
    if (!side || typeof side.id !== 'string' || !Array.isArray(side.combatants)) throw new TypeError('invalid surprise side');
    const roll = dice.rollD6();
    const dm = Math.max(0, ...side.combatants.map((entry) => Number(entry.surpriseDM ?? 0)));
    return { sideId: side.id, roll, dm, total: roll + dm };
  });
  const difference = Math.abs(results[0].total - results[1].total);
  const surprisedSideId = difference >= 3 ? (results[0].total > results[1].total ? results[1].sideId : results[0].sideId) : null;
  return { results, margin: difference, surprisedSideId, surpriseSideId: surprisedSideId === null ? null : results.find((entry) => entry.sideId !== surprisedSideId).sideId };
}

export function movePersonalCombatRange(range, direction) {
  if (!Object.hasOwn(RANGE_INDEX, range)) throw new RangeError(`unknown personal combat range: ${range}`);
  if (!['close', 'open'].includes(direction)) throw new RangeError('range direction must be close or open');
  const delta = direction === 'close' ? -1 : 1;
  return PERSONAL_COMBAT_RANGES[Math.max(0, Math.min(PERSONAL_COMBAT_RANGES.length - 1, RANGE_INDEX[range] + delta))];
}

function damageStatus(current) {
  const zeroes = PHYSICAL_KEYS.filter((key) => current[key] <= 0).length;
  if (zeroes >= 3) return 'dead';
  if (zeroes >= 1) return 'unconscious';
  return 'active';
}

export function applyPersonalDamage(combatant, damageDice, firstBloodRoll = null) {
  if (!Array.isArray(damageDice) || !damageDice.length || damageDice.some((die) => !Number.isInteger(die) || die < 1 || die > 6)) throw new TypeError('damageDice must contain one or more d6 results');
  const next = clone(combatant);
  const allocations = [];
  if (next.firstBlood) {
    if (!Number.isInteger(firstBloodRoll) || firstBloodRoll < 1 || firstBloodRoll > 6) throw new TypeError('firstBloodRoll must be a d6 result for the first wound');
    const key = PHYSICAL_KEYS[(firstBloodRoll - 1) % PHYSICAL_KEYS.length];
    const amount = damageDice.reduce((sum, die) => sum + die, 0);
    next.current[key] = Math.max(0, next.current[key] - amount);
    allocations.push({ characteristic: key, amount });
    next.firstBlood = false;
  } else {
    damageDice.forEach((die, index) => {
      const key = PHYSICAL_KEYS[index % PHYSICAL_KEYS.length];
      next.current[key] = Math.max(0, next.current[key] - die);
      allocations.push({ characteristic: key, amount: die });
    });
  }
  next.hitsTaken += 1;
  next.status = damageStatus(next.current);
  return { combatant: next, allocations, status: next.status };
}

export function resolvePersonalAttack({ attacker, defender, range, situationalDM = 0, defenderDM = 0, dice } = {}) {
  requireDice(dice);
  if (attacker?.status !== 'active') throw new Error('attacker is not active');
  if (defender?.status !== 'active') throw new Error('defender is not active');
  const spec = getPersonalWeapon(attacker.weaponKey);
  const target = weaponTargetNumber(attacker.weaponKey, defender.armor, range);
  if (target === null) throw new Error(`${spec.name} cannot attack at ${range} range`);
  situationalDM = integer(situationalDM, 'situationalDM');
  defenderDM = integer(defenderDM, 'defenderDM');
  const skillDM = personalWeaponSkillLevel(attacker, attacker.weaponKey);
  const characteristicDM = weaponCharacteristicDM(attacker, attacker.weaponKey);
  const trained = spec.skillNames.some((name) => Object.hasOwn(attacker.skills ?? {}, name));
  const untrainedDM = trained ? 0 : -5;
  const defenderWeapon = defender.weaponKey ? getPersonalWeapon(defender.weaponKey) : null;
  const defenderTrained = defenderWeapon ? defenderWeapon.skillNames.some((name) => Object.hasOwn(defender.skills ?? {}, name)) : true;
  const parryDM = spec.melee && defenderWeapon?.parry ? -personalWeaponSkillLevel(defender, defender.weaponKey) : 0;
  const evasionDM = defender.evading ? -1 : 0;
  const defenderUntrainedDM = defenderTrained ? 0 : 3;
  const diceRoll = [dice.rollD6(), dice.rollD6()];
  const roll = diceRoll[0] + diceRoll[1];
  const totalDM = skillDM + characteristicDM + untrainedDM + parryDM + evasionDM + defenderUntrainedDM + situationalDM + defenderDM;
  const total = roll + totalDM;
  const success = total >= target;
  const damageDice = success ? Array.from({ length: spec.damageDice }, () => dice.rollD6()) : [];
  const firstBloodRoll = success && defender.firstBlood ? dice.rollD6() : null;
  const damage = success ? applyPersonalDamage(defender, damageDice, firstBloodRoll) : { combatant: clone(defender), allocations: [], status: defender.status };
  const nextAttacker = clone(attacker);
  if (spec.melee) nextAttacker.blows += 1;
  nextAttacker.evading = false;
  return { attacker: nextAttacker, defender: damage.combatant, weaponKey: attacker.weaponKey, weaponName: spec.name, range, armor: defender.armor, target, dice: diceRoll, roll, skillDM, characteristicDM, untrainedDM, parryDM, evasionDM, defenderUntrainedDM, situationalDM, defenderDM, totalDM, total, success, damageDice, damageTotal: damageDice.reduce((sum, die) => sum + die, 0), firstBloodRoll, allocations: damage.allocations, defenderStatus: damage.status };
}

export function resolvePersonalMorale({ casualties, originalStrength, moraleTarget = 7, dm = 0, dice } = {}) {
  requireDice(dice);
  integer(casualties, 'casualties'); integer(originalStrength, 'originalStrength'); integer(moraleTarget, 'moraleTarget'); integer(dm, 'dm');
  const required = originalStrength > 0 && casualties / originalStrength >= 0.25;
  if (!required) return { required: false, roll: null, dice: [], dm, total: null, target: moraleTarget, stands: true };
  const results = [dice.rollD6(), dice.rollD6()];
  const roll = results[0] + results[1];
  const total = roll + dm;
  return { required: true, roll, dice: results, dm, total, target: moraleTarget, stands: total >= moraleTarget };
}

export function endPersonalCombatRecovery(combatant) {
  const next = clone(combatant);
  if (next.status === 'active' && PHYSICAL_KEYS.some((key) => next.current[key] < next.characteristics[key])) {
    for (const key of PHYSICAL_KEYS) next.current[key] = Math.floor((next.current[key] + next.characteristics[key]) / 2);
  } else if (next.status === 'unconscious') {
    const zeroes = PHYSICAL_KEYS.filter((key) => next.current[key] <= 0).length;
    if (zeroes === 1) for (const key of PHYSICAL_KEYS) next.current[key] = Math.max(1, Math.floor((next.current[key] + next.characteristics[key]) / 2));
    else for (const key of PHYSICAL_KEYS) next.current[key] = Math.max(1, next.current[key]);
  }
  return next;
}

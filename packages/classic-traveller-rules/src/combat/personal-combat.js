import { requireDice } from '../dice.js';

export const PERSONAL_COMBAT_RANGES = Object.freeze(['close', 'short', 'medium', 'long', 'very-long']);
export const PERSONAL_ARMOR_TYPES = Object.freeze(['none', 'jack', 'mesh', 'cloth', 'reflec', 'ablat', 'combat']);
export const PERSONAL_COMBAT_STATUSES = Object.freeze(['active', 'unconscious', 'dead', 'escaped', 'withdrawn']);

const RANGE_INDEX = Object.freeze(Object.fromEntries(PERSONAL_COMBAT_RANGES.map((key, index) => [key, index])));
const PHYSICAL_KEYS = Object.freeze(['STR', 'DEX', 'END']);

// Classic Traveller Book 1 (1981) pp.45-47 as printed in the facsimile edition,
// with the p.46/p.47 errata already applied. Armor columns: Nothing, Jack,
// Mesh, Cloth, Reflec, Ablat, Combat Armor. Range columns: Close, Short,
// Medium, Long, Very Long; null means the weapon cannot attack at that range.
// The basic throw to hit is 8+, so the unmodified target for an armor/range
// combination is 8 - armorDM - rangeDM.
export const BASIC_HIT_THROW = 8;

export const WEAPONS_MATRIX = Object.freeze({
  hands: [1, -1, -4, -4, 0, -1, -6],
  club: [0, 0, -2, -3, 0, -2, -7],
  dagger: [0, -1, -4, -4, 0, -2, -7],
  blade: [1, 0, -4, -4, 1, -3, -5],
  cutlass: [4, 3, -2, -3, 4, -2, -6],
  sword: [3, 3, -3, -3, 3, -2, -6],
  broadsword: [5, 5, 1, 0, 5, 1, -4],
  bayonet: [2, 1, 0, -1, 2, -2, -6],
  'body-pistol': [0, 0, -2, -4, -4, -2, -7],
  'automatic-pistol': [1, 1, -1, -3, 1, -1, -5],
  revolver: [1, 1, -1, -3, 1, -1, -5],
  carbine: [2, 2, 0, -3, 2, -1, -5],
  rifle: [3, 3, 0, -3, 2, 1, -5],
  'automatic-rifle': [6, 6, 2, -1, 6, 3, -3],
  shotgun: [5, 5, -1, -3, 5, 2, -5],
  'submachine-gun': [5, 5, 0, -3, 5, 2, -4],
  'laser-carbine': [2, 2, 1, 1, -8, -7, -6],
  'laser-rifle': [3, 3, 2, 2, -8, -7, -6]
});

export const RANGE_MATRIX = Object.freeze({
  hands: [2, 1, null, null, null],
  club: [1, 2, null, null, null],
  dagger: [1, -1, null, null, null],
  blade: [1, 1, null, null, null],
  cutlass: [-4, 2, null, null, null],
  sword: [-2, 1, null, null, null],
  broadsword: [-8, 3, null, null, null],
  bayonet: [-1, 2, null, null, null],
  'body-pistol': [2, 1, -6, null, null],
  'automatic-pistol': [1, 2, -4, -6, null],
  revolver: [1, 2, -3, -5, null],
  carbine: [-4, 1, -2, -4, -5],
  rifle: [-4, 1, 0, -1, -3],
  'automatic-rifle': [-8, 0, 2, 1, -2],
  shotgun: [-8, 1, 3, -6, null],
  'submachine-gun': [-4, 3, 3, -3, -9],
  'laser-carbine': [-2, 1, 1, 1, 0],
  'laser-rifle': [-4, 2, 2, 2, 1]
});

function weapon(key, spec) {
  const armorDMs = WEAPONS_MATRIX[key];
  const rangeDMs = RANGE_MATRIX[key];
  const targets = {};
  PERSONAL_ARMOR_TYPES.forEach((armor, armorIndex) => {
    targets[armor] = Object.freeze(rangeDMs.map((rangeDM) => (
      rangeDM === null ? null : BASIC_HIT_THROW - armorDMs[armorIndex] - rangeDM
    )));
  });
  return Object.freeze({
    ...spec,
    key,
    armorDMs: Object.freeze([...armorDMs]),
    rangeDMs: Object.freeze([...rangeDMs]),
    skillNames: Object.freeze([...spec.skillNames]),
    targets: Object.freeze(targets)
  });
}

// Book 1 p.45 Weapons Table (required/advantageous characteristic levels and
// DMs, weakened blow DM) and the p.47 wound column. Melee weapons key off
// Strength; guns key off Dexterity. Required level applies when the
// characteristic is BELOW that level, so lowMax is one less than the printed
// required level.
export const PERSONAL_WEAPONS = Object.freeze({
  'body-pistol': weapon('body-pistol', { name: 'Body Pistol', damageDice: 2, characteristic: 'DEX', lowMax: 7, lowDM: -3, highMin: 11, highDM: 1, skillNames: ['Body Pistol', 'Gun Combat'], melee: false }),
  revolver: weapon('revolver', { name: 'Revolver', damageDice: 3, characteristic: 'DEX', lowMax: 6, lowDM: -2, highMin: 9, highDM: 1, skillNames: ['Revolver', 'Gun Combat'], melee: false }),
  'automatic-pistol': weapon('automatic-pistol', { name: 'Automatic Pistol', damageDice: 3, characteristic: 'DEX', lowMax: 6, lowDM: -2, highMin: 10, highDM: 1, skillNames: ['Automatic Pistol', 'Auto Pistol', 'Gun Combat'], melee: false }),
  carbine: weapon('carbine', { name: 'Carbine', damageDice: 3, characteristic: 'DEX', lowMax: 4, lowDM: -1, highMin: 9, highDM: 1, skillNames: ['Carbine', 'Gun Combat'], melee: false }),
  rifle: weapon('rifle', { name: 'Rifle', damageDice: 3, characteristic: 'DEX', lowMax: 5, lowDM: -2, highMin: 8, highDM: 1, skillNames: ['Rifle', 'Gun Combat'], melee: false }),
  'automatic-rifle': weapon('automatic-rifle', { name: 'Automatic Rifle', damageDice: 3, characteristic: 'DEX', lowMax: 6, lowDM: -2, highMin: 10, highDM: 2, skillNames: ['Automatic Rifle', 'Auto Rifle', 'Gun Combat'], melee: false, automatic: true }),
  shotgun: weapon('shotgun', { name: 'Shotgun', damageDice: 4, characteristic: 'DEX', lowMax: 3, lowDM: -1, highMin: 9, highDM: 1, skillNames: ['Shotgun', 'Gun Combat'], melee: false }),
  'submachine-gun': weapon('submachine-gun', { name: 'Submachine Gun', damageDice: 3, characteristic: 'DEX', lowMax: 5, lowDM: -2, highMin: 9, highDM: 2, skillNames: ['Submachine Gun', 'SMG', 'Gun Combat'], melee: false, automatic: true }),
  'laser-carbine': weapon('laser-carbine', { name: 'Laser Carbine', damageDice: 4, characteristic: 'DEX', lowMax: 5, lowDM: -3, highMin: 10, highDM: 2, skillNames: ['Laser Carbine', 'Gun Combat'], melee: false }),
  'laser-rifle': weapon('laser-rifle', { name: 'Laser Rifle', damageDice: 5, characteristic: 'DEX', lowMax: 6, lowDM: -3, highMin: 11, highDM: 2, skillNames: ['Laser Rifle', 'Gun Combat'], melee: false }),
  hands: weapon('hands', { name: 'Hands', damageDice: 1, characteristic: 'STR', lowMax: 5, lowDM: -2, highMin: 9, highDM: 1, skillNames: ['Brawling'], melee: true, parry: true, fatigueDM: -2 }),
  club: weapon('club', { name: 'Club', damageDice: 2, characteristic: 'STR', lowMax: 4, lowDM: -4, highMin: 8, highDM: 2, skillNames: ['Club', 'Brawling'], melee: true, parry: true, fatigueDM: -1 }),
  dagger: weapon('dagger', { name: 'Dagger', damageDice: 2, characteristic: 'STR', lowMax: 3, lowDM: -2, highMin: 8, highDM: 2, skillNames: ['Dagger', 'Blade Combat', 'Blade'], melee: true, parry: true, fatigueDM: -2 }),
  blade: weapon('blade', { name: 'Blade', damageDice: 2, characteristic: 'STR', lowMax: 4, lowDM: -2, highMin: 9, highDM: 1, skillNames: ['Blade', 'Blade Combat'], melee: true, parry: true, fatigueDM: -2 }),
  cutlass: weapon('cutlass', { name: 'Cutlass', damageDice: 3, characteristic: 'STR', lowMax: 6, lowDM: -2, highMin: 11, highDM: 2, skillNames: ['Cutlass', 'Blade Combat', 'Blade'], melee: true, parry: true, fatigueDM: -4 }),
  sword: weapon('sword', { name: 'Sword', damageDice: 2, characteristic: 'STR', lowMax: 5, lowDM: -2, highMin: 10, highDM: 1, skillNames: ['Sword', 'Blade Combat', 'Blade'], melee: true, parry: true, fatigueDM: -3 }),
  broadsword: weapon('broadsword', { name: 'Broadsword', damageDice: 4, characteristic: 'STR', lowMax: 7, lowDM: -4, highMin: 12, highDM: 2, skillNames: ['Broadsword', 'Blade Combat', 'Blade'], melee: true, parry: true, fatigueDM: -4 }),
  bayonet: weapon('bayonet', { name: 'Bayonet', damageDice: 3, characteristic: 'STR', lowMax: 4, lowDM: -2, highMin: 9, highDM: 2, skillNames: ['Bayonet', 'Dagger', 'Blade Combat', 'Blade'], melee: true, parry: true, fatigueDM: -2 })
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

// Book 1 p.32: an evading defender receives -1 at close or short range, -2 at
// medium range, and -4 at long or very long range.
export function evasionDefenseDM(range) {
  if (!Object.hasOwn(RANGE_INDEX, range)) throw new RangeError(`unknown personal combat range: ${range}`);
  if (range === 'close' || range === 'short') return -1;
  if (range === 'medium') return -2;
  return -4;
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
    // Book 1 p.33: each die is a single wound applied to one characteristic;
    // once a characteristic is at zero, further points go to non-zero ones.
    damageDice.forEach((die, index) => {
      const preferred = PHYSICAL_KEYS[index % PHYSICAL_KEYS.length];
      const key = next.current[preferred] > 0
        ? preferred
        : (PHYSICAL_KEYS.find((candidate) => next.current[candidate] > 0) ?? preferred);
      next.current[key] = Math.max(0, next.current[key] - die);
      allocations.push({ characteristic: key, amount: die });
    });
  }
  next.hitsTaken += 1;
  next.status = damageStatus(next.current);
  return { combatant: next, allocations, status: next.status };
}

// Book 1 p.31 terrain DMs, applied to the 2D encounter range throw.
export const TERRAIN_DMS = Object.freeze({
  clear: 3, prairie: 3, rough: 2, broken: 2, mountain: 3, forest: 1, jungle: 0,
  river: 1, swamp: -4, desert: 4, 'maritime-surface': 2, 'maritime-subsurface': -1,
  arctic: 2, city: -4, 'building-interior': -5
});

// Book 1 p.31 encounter range table: 2D plus the terrain DM, clamped to the
// printed 1-13 span.
export const ENCOUNTER_RANGE_TABLE = Object.freeze({
  1: 'short', 2: 'close', 3: 'short', 4: 'medium', 5: 'short', 6: 'medium', 7: 'medium',
  8: 'long', 9: 'medium', 10: 'very-long', 11: 'long', 12: 'very-long', 13: 'very-long'
});

export function encounterRangeForThrow(total) {
  if (!Number.isInteger(total)) throw new TypeError('encounter range throw must be an integer');
  return ENCOUNTER_RANGE_TABLE[Math.max(1, Math.min(13, total))];
}

export function rollEncounterRange(dice, { terrain = null, dm = 0 } = {}) {
  requireDice(dice);
  if (terrain !== null && !Object.hasOwn(TERRAIN_DMS, terrain)) throw new RangeError(`unknown terrain: ${terrain}`);
  if (!Number.isInteger(dm)) throw new TypeError('encounter range dm must be an integer');
  const terrainDM = terrain === null ? 0 : TERRAIN_DMS[terrain];
  const roll = dice.roll2D6();
  const total = roll.total + terrainDM + dm;
  return Object.freeze({ dice: Object.freeze([...roll.dice]), roll: roll.total, terrain, terrainDM, dm, total, range: encounterRangeForThrow(total) });
}

// Book 1 p.31 surprise DMs. Each is a condition the referee ticks; the sum is
// the side's surprise DM.
export const SURPRISE_DMS = Object.freeze({
  leaderSkill: 1, tacticalSkill: 1, militaryExperience: 1,
  inAVehicle: -1, eightOrMoreAdventurers: -1, tenOrMoreAnimals: -1,
  pouncerAnimals: 1, battleDress: 2
});

export function surpriseDMTotal(conditions = {}) {
  let total = 0;
  for (const [key, value] of Object.entries(conditions)) {
    if (!value) continue;
    if (!Object.hasOwn(SURPRISE_DMS, key)) throw new RangeError(`unknown surprise condition: ${key}`);
    total += SURPRISE_DMS[key];
  }
  return total;
}

// Book 1 p.31 errata situational DMs applied to the basic 8+ throw. These are
// conditions of the attack, not of the combatants, so the caller ticks them
// and passes the total as the situational DM.
export const SITUATION_DMS = Object.freeze({
  cover: { dm: -4, label: 'Cover', page: 'B1 p.31 errata' },
  concealment: { dm: -1, label: 'Concealment', page: 'B1 p.31 errata' },
  darkness: { dm: -9, label: 'Darkness', page: 'B1 p.31 errata' },
  darknessWithLightIntensifier: { dm: -6, label: 'Darkness / light intensifier', page: 'B1 p.31 errata' },
  foldingStock: { dm: -1, label: 'Folding stock', page: 'B1 p.31 errata' }
});

export function situationDMTotal(conditions = {}) {
  let total = 0;
  for (const [key, value] of Object.entries(conditions)) {
    if (!value) continue;
    if (!Object.hasOwn(SITUATION_DMS, key)) throw new RangeError(`unknown situation condition: ${key}`);
    total += SITUATION_DMS[key].dm;
  }
  return total;
}

// The same throw and DMs as rollPersonalAttack, computed without dice so the
// referee can see what an attack would need before declaring it. Returns null
// for `target` when the weapon cannot reach that range.
export function previewPersonalAttack({ attacker, defender, range, situationalDM = 0, defenderDM = 0 } = {}) {
  const spec = getPersonalWeapon(attacker.weaponKey);
  if (!PERSONAL_ARMOR_TYPES.includes(defender.armor)) throw new RangeError(`unknown personal armor: ${defender.armor}`);
  const target = weaponTargetNumber(attacker.weaponKey, defender.armor, range);
  situationalDM = integer(situationalDM, 'situationalDM');
  defenderDM = integer(defenderDM, 'defenderDM');
  const skillDM = personalWeaponSkillLevel(attacker, attacker.weaponKey);
  const characteristicDM = weaponCharacteristicDM(attacker, attacker.weaponKey);
  const trained = spec.skillNames.some((name) => Object.hasOwn(attacker.skills ?? {}, name));
  const untrainedDM = trained ? 0 : -5;
  const defenderWeapon = defender.weaponKey ? getPersonalWeapon(defender.weaponKey) : null;
  const defenderTrained = defenderWeapon ? defenderWeapon.skillNames.some((name) => Object.hasOwn(defender.skills ?? {}, name)) : true;
  // Book 1 p.33: an evading combatant may not attack and may not use the
  // weapon to parry or block, so evasion and parry are mutually exclusive.
  const parryDM = !defender.evading && spec.melee && defenderWeapon?.parry ? -personalWeaponSkillLevel(defender, defender.weaponKey) : 0;
  const evasionDM = defender.evading ? evasionDefenseDM(range) : 0;
  const defenderUntrainedDM = defenderTrained ? 0 : 3;
  const totalDM = skillDM + characteristicDM + untrainedDM + parryDM + evasionDM + defenderUntrainedDM + situationalDM + defenderDM;
  return {
    weaponKey: attacker.weaponKey, weaponName: spec.name, range, armor: defender.armor, target,
    skillDM, characteristicDM, untrainedDM, parryDM, evasionDM, defenderUntrainedDM, situationalDM, defenderDM, totalDM,
    damageDice: spec.damageDice,
    canAttack: target !== null,
    // What the 2D throw itself must show once DMs are counted.
    requiredRoll: target === null ? null : target - totalDM
  };
}

// Book 1 p.30 step 2B: the attack roll and its DMs. Damage dice are rolled
// here because they depend on nothing but the weapon, but no wound is applied:
// step 2C inflicts wounds at the END of the round, so a caller resolving a
// whole round rolls every attack first and applies the damage afterwards.
export function rollPersonalAttack({ attacker, defender, range, situationalDM = 0, defenderDM = 0, dice } = {}) {
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
  // Book 1 p.33: an evading combatant may not attack and may not use the
  // weapon to parry or block, so evasion and parry are mutually exclusive.
  const parryDM = !defender.evading && spec.melee && defenderWeapon?.parry ? -personalWeaponSkillLevel(defender, defender.weaponKey) : 0;
  const evasionDM = defender.evading ? evasionDefenseDM(range) : 0;
  const defenderUntrainedDM = defenderTrained ? 0 : 3;
  const diceRoll = [dice.rollD6(), dice.rollD6()];
  const roll = diceRoll[0] + diceRoll[1];
  const totalDM = skillDM + characteristicDM + untrainedDM + parryDM + evasionDM + defenderUntrainedDM + situationalDM + defenderDM;
  const total = roll + totalDM;
  const success = total >= target;
  const damageDice = success ? Array.from({ length: spec.damageDice }, () => dice.rollD6()) : [];
  const nextAttacker = clone(attacker);
  if (spec.melee) nextAttacker.blows += 1;
  nextAttacker.evading = false;
  return { attacker: nextAttacker, attackerId: attacker.id, defenderId: defender.id, weaponKey: attacker.weaponKey, weaponName: spec.name, range, armor: defender.armor, target, dice: diceRoll, roll, skillDM, characteristicDM, untrainedDM, parryDM, evasionDM, defenderUntrainedDM, situationalDM, defenderDM, totalDM, total, success, damageDice, damageTotal: damageDice.reduce((sum, die) => sum + die, 0) };
}

// Roll and apply in one step. Kept for single exchanges outside a round
// structure; a round resolver should use rollPersonalAttack + applyPersonalDamage
// so that wounds land at the end of the round per Book 1 p.30 step 2C.
export function resolvePersonalAttack({ attacker, defender, range, situationalDM = 0, defenderDM = 0, dice } = {}) {
  const result = rollPersonalAttack({ attacker, defender, range, situationalDM, defenderDM, dice });
  const firstBloodRoll = result.success && defender.firstBlood ? dice.rollD6() : null;
  const damage = result.success
    ? applyPersonalDamage(defender, result.damageDice, firstBloodRoll)
    : { combatant: clone(defender), allocations: [], status: defender.status };
  return { ...result, defender: damage.combatant, firstBloodRoll, allocations: damage.allocations, defenderStatus: damage.status };
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

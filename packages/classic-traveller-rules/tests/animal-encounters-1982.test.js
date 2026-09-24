import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ANIMAL_TERRAIN_TYPES_1982,
  ANIMAL_TYPES_1982,
  ANIMAL_ATTRIBUTES_1982,
  ANIMAL_SIZES_1982,
  ANIMAL_WEAPONS_1982,
  ANIMAL_ARMOR_1982,
  ANIMAL_ENCOUNTER_COLUMNS_1982,
  animalAttributeDM,
  animalPlanetSizeDM,
  createAnimalCombatant,
  createPersonalCombatant,
  createDice,
  createSequenceDice,
  generateAnimalEncounterTable,
  generateAnimalTableEntry,
  previewPersonalAttack,
  resolveAnimalBehaviour,
  resolvePersonalAttack,
  applyPersonalDamage,
  rollAnimalTableRow,
  rollAnimalWound,
  endPersonalCombatRecovery
} from '../index.js';

test('p.94 terrain types carry both DMs and an attributes column', () => {
  assert.deepEqual([ANIMAL_TERRAIN_TYPES_1982.broken.typeDM, ANIMAL_TERRAIN_TYPES_1982.broken.sizeDM], [-3, -3]);
  assert.deepEqual([ANIMAL_TERRAIN_TYPES_1982.swamp.typeDM, ANIMAL_TERRAIN_TYPES_1982.swamp.sizeDM], [-2, 4]);
  assert.deepEqual([ANIMAL_TERRAIN_TYPES_1982.depths.typeDM, ANIMAL_TERRAIN_TYPES_1982.depths.sizeDM], [2, 4]);
  assert.equal(ANIMAL_TERRAIN_TYPES_1982.bottom.attributeColumn, 'sea');
  assert.equal(ANIMAL_TERRAIN_TYPES_1982.crater.attributeColumn, 'other');
  assert.equal(Object.keys(ANIMAL_TERRAIN_TYPES_1982).length, 22);
});

test('p.94 tables as printed', () => {
  assert.equal(ANIMAL_TYPES_1982.herbivore.length, 14);
  assert.deepEqual(ANIMAL_TYPES_1982.carnivore[0], { type: 'siren', quantityDice: 0 });
  assert.deepEqual(ANIMAL_TYPES_1982.herbivore[13], { type: 'grazer', quantityDice: 5 });
  assert.deepEqual(ANIMAL_TYPES_1982.scavenger[8], { type: 'reducer', quantityDice: 3 });
  assert.deepEqual(ANIMAL_ATTRIBUTES_1982.other[12], { attribute: 'flyer', sizeDM: -3 });
  assert.deepEqual(ANIMAL_ATTRIBUTES_1982.sea[6], { attribute: 'amphibian', sizeDM: 0 });
  assert.deepEqual(ANIMAL_ATTRIBUTES_1982.swamp[2], { attribute: 'swimmer', sizeDM: -3 });
  assert.equal(ANIMAL_SIZES_1982[13], 'reroll');
  assert.deepEqual(ANIMAL_SIZES_1982[20], { weightKg: 44000, unconsciousDice: 17, furtherDice: 9, wounds: { times: 6 } });
  assert.deepEqual(ANIMAL_SIZES_1982[1].wounds, { dice: -2 });
  assert.equal(ANIMAL_SIZES_1982[7].wounds, null);
  assert.deepEqual(ANIMAL_WEAPONS_1982[15], [{ key: 'claws', dm: 1 }, { key: 'teeth', dm: 1 }]);
  assert.deepEqual(ANIMAL_WEAPONS_1982[20], [{ key: 'body-pistol', dm: 0 }]);
  assert.equal(ANIMAL_ARMOR_1982[1], 'reroll');
  assert.equal(ANIMAL_ARMOR_1982[12], 'reroll');
  assert.equal(ANIMAL_ARMOR_1982[17].label, 'cmbt+4');
  assert.equal(ANIMAL_ARMOR_1982[20].key, 'combat');
  assert.deepEqual(Object.values(ANIMAL_ENCOUNTER_COLUMNS_1982['1D']), ['scavenger', 'herbivore', 'herbivore', 'herbivore', 'omnivore', 'carnivore']);
});

test('p.94 world DMs', () => {
  assert.equal(animalAttributeDM({ planetSize: 9, atmosphere: 8 }), 1);
  assert.equal(animalAttributeDM({ planetSize: 4, atmosphere: 5 }), 0);
  assert.equal(animalAttributeDM({ planetSize: 2, atmosphere: 6 }), 2);
  assert.equal(animalPlanetSizeDM(8), -1);
  assert.equal(animalPlanetSizeDM(4), 1);
  assert.equal(animalPlanetSizeDM(6), 0);
});

test('checklist 2C-2E: one carnivore, every number rolled once', () => {
  const dice = createSequenceDice([
    3, 4, // type 7 +3 clear = 10: killer
    3, 3, // attribute 6: none
    4, 4, // size 8: 200 kg, 5D/3D, +1D
    1, 2, 3, 4, 5, // unconscious 15
    6, 1, 2, // further 9
    1, 1, // weapons 2 +8 = 10: claws
    3, 4, // claws 1D+3 with +1D: 3,4 +3 = 10
    3, 3, // armor 6 -1 = 5: none
    5, 4, 2 // speed 5-3 = 2, attack 4, flee 2+3 = 5
  ]);
  const entry = generateAnimalTableEntry(dice, { category: 'carnivore', terrain: 'clear' });
  assert.equal(entry.type, 'killer');
  assert.equal(entry.quantity, 1);
  assert.equal(entry.weightKg, 200);
  assert.deepEqual(entry.hits, { unconscious: 15, further: 9, dead: 24, destroyed: 48 });
  assert.equal(entry.weapons[0].key, 'claws');
  assert.equal(entry.weapons[0].wound, 10);
  assert.equal(entry.weapons[0].woundGroups.reduce((a, b) => a + b, 0), 10);
  assert.equal(entry.armor.key, 'none');
  assert.equal(entry.behaviour.code, 'A4 F5 S2');
  assert.equal(dice.remaining(), 0);
});

test('a (+6) on the size column rerolls with DM +6', () => {
  const dice = createSequenceDice([
    3, 4, // killer
    3, 3, // no attribute
    6, 6, // 12 +1 (planet size 4) = 13: reroll
    1, 1, // 2 +1 +6 = 9: 400 kg, 6D/3D
    1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, // weapons 10: claws
    1, 1, 1, // claws 1D+3 +2D
    3, 3, // armor none
    4, 4, 4
  ]);
  const entry = generateAnimalTableEntry(dice, { category: 'carnivore', terrain: 'clear', planetSize: 4 });
  assert.equal(entry.weightKg, 400);
  assert.equal(entry.hits.dead, 9);
});

test('a flyer uses only its own size DM and never has armor', () => {
  const dice = createSequenceDice([
    3, 4, // omnivore 7 -4 forest = 3: gatherer
    6, 6, // attribute 12, Other: flyer -3
    3, 3, // size 6 -3 = 3 (forest's -4 not added): 6 kg
    2, 1, 1, // hits 1D/2D
    3, 3, // weapons 6 +4 = 10: claws
    2, // claws 1D+3 -1D: 2 +3 -1
    1,
    4, 4, 4 // no armor throw
  ]);
  const entry = generateAnimalTableEntry(dice, { category: 'omnivore', terrain: 'forest', planetSize: 7, atmosphere: 6 });
  assert.equal(entry.attribute, 'flyer');
  assert.equal(entry.name, 'Flying Gatherer');
  assert.equal(entry.weightKg, 6);
  assert.equal(entry.armor.key, 'none');
  assert.equal(dice.remaining(), 0);
});

test('p.92 wound alteration: -nD is a modifier, xN multiplies, fixed floors at 1', () => {
  const minus = rollAnimalWound(createSequenceDice([2, 1, 6, 6]), 'teeth', { dice: -2 });
  assert.equal(minus.total, 0);
  assert.deepEqual(minus.groups, []);
  const times = rollAnimalWound(createSequenceDice([3, 4]), 'teeth', { times: 3 });
  assert.equal(times.total, 12);
  assert.equal(times.groups.reduce((a, b) => a + b, 0), 12);
  const entry = generateAnimalTableEntry(createDice(() => 0), { category: 'herbivore', terrain: 'forest', planetSize: 9 });
  assert.ok(entry.weapons.every((weapon) => weapon.wound >= 1));
});

test('a filter ignores wound alteration and records 1D per 50 kg', () => {
  const entry = generateAnimalTableEntry(createDice(() => 0), { category: 'herbivore', terrain: 'bottom' });
  assert.equal(entry.type, 'filter');
  assert.equal(entry.specials.filter.woundDice, Math.max(1, Math.ceil(entry.weightKg / 50)));
});

test('a table: eleven rows, an event row, world heading, 1D format', () => {
  const table = generateAnimalEncounterTable(createDice(), { terrain: 'clear', world: { name: 'Regina', upp: 'A788899-A' }, planetSize: 7, atmosphere: 8 });
  assert.equal(table.rows.length, 11);
  assert.equal(table.dice, 2);
  assert.equal(table.rows.find((row) => row.die === 10).category, 'event');
  assert.equal(table.world.name, 'Regina');
  const small = generateAnimalEncounterTable(createDice(), { terrain: 'desert', format: '1D' });
  assert.equal(small.rows.length, 6);
  assert.equal(small.dice, 1);
  assert.equal(rollAnimalTableRow(createSequenceDice([6]), small).row.category, 'carnivore');
  assert.equal(rollAnimalTableRow(createSequenceDice([5, 5]), table).row.category, 'event');
});

test('p.95 behaviour: herbivores throw to flee first; special cases are conditions', () => {
  const grazer = { quantity: 3, behaviour: { order: 'FA', attack: { throw: 7, rule: null }, flee: { throw: 9, rule: null }, speed: 2 } };
  const stays = resolveAnimalBehaviour(createSequenceDice([4, 4, 3, 4]), grazer);
  assert.equal(stays.action, 'attack');
  assert.deepEqual(stays.steps.map((step) => step.which), ['flee', 'attack']);
  assert.equal(resolveAnimalBehaviour(createSequenceDice([1, 1, 1, 1]), grazer).action, 'nothing');
  const chaser = { quantity: 6, behaviour: { order: 'AF', attack: { throw: 0, rule: 'if-more' }, flee: { throw: 8, rule: null }, speed: 2 } };
  assert.equal(resolveAnimalBehaviour(createSequenceDice([]), chaser, { preyCount: 4 }).action, 'attack');
  assert.equal(resolveAnimalBehaviour(createSequenceDice([6, 6]), chaser, { preyCount: 6 }).action, 'flee');
  const pouncer = { quantity: 1, behaviour: { order: 'AF', attack: { throw: 0, rule: 'if-surprise' }, flee: { throw: 0, rule: 'if-surprised' }, speed: 1 } };
  assert.equal(resolveAnimalBehaviour(createSequenceDice([]), pouncer, { surprised: true }).action, 'flee');
});

const beast = Object.freeze({
  type: 'chaser', category: 'carnivore', quantity: 1, weightKg: 50,
  hits: { unconscious: 10, further: 5, dead: 15, destroyed: 30 },
  woundAlteration: null,
  weapons: [{ key: 'claws', dm: 1, label: 'claws+1', wound: 6, woundGroups: [3, 3] }, { key: 'teeth', dm: 0, label: 'teeth', wound: 4, woundGroups: [4] }],
  armor: { key: 'combat', dm: 4, label: 'cmbt+4' }
});
const person = () => createPersonalCombatant({ id: 'pc', name: 'Jamison', side: 'party', characteristics: { STR: 7, DEX: 7, END: 7, INT: 7 }, playerCharacter: true, weaponKey: 'rifle', skills: { Rifle: 1 } });

test('an animal fights with its weapon DM and its fixed wound', () => {
  const animal = createAnimalCombatant({ id: 'a1', name: 'Chaser', side: 'opposition', entry: beast });
  assert.equal(animal.weaponKey, 'claws');
  const preview = previewPersonalAttack({ attacker: animal, defender: person(), range: 'close' });
  assert.equal(preview.weaponDM, 1);
  assert.equal(preview.untrainedDM, 0);
  assert.deepEqual(preview.woundRange, { min: 6, max: 6 });
  const result = resolvePersonalAttack({ attacker: animal, defender: person(), range: 'close', dice: createSequenceDice([6, 6, 1]) });
  assert.equal(result.success, true);
  assert.equal(result.woundTotal, 6);
  assert.equal(result.blowsRemaining, null);
  // First blood: the whole wound on one characteristic (d6 1 = STR).
  assert.equal(result.defender.current.STR, 1);
});

test('fixed wound groups land as Book 1 groups after first blood', () => {
  const wounded = { ...person(), firstBlood: false };
  const damage = applyPersonalDamage(wounded, [], null, { woundGroups: [3, 3], targets: ['STR', 'DEX'] });
  assert.equal(damage.combatant.current.STR, 4);
  assert.equal(damage.combatant.current.DEX, 4);
});

test('cmbt+4 is +4 to hit the animal; the hits track decides its state', () => {
  const animal = createAnimalCombatant({ id: 'a1', name: 'Chaser', side: 'opposition', entry: beast });
  assert.equal(previewPersonalAttack({ attacker: person(), defender: animal, range: 'short' }).armorDM, 4);
  let state = applyPersonalDamage(animal, [5, 4], null, { modifier: 0 });
  assert.equal(state.status, 'active');
  state = applyPersonalDamage(state.combatant, [1], null, { modifier: 0 });
  assert.equal(state.status, 'unconscious');
  state = applyPersonalDamage(state.combatant, [5], null, { modifier: 0 });
  assert.equal(state.status, 'dead');
  assert.equal(state.combatant.animal.destroyed, false);
  state = applyPersonalDamage(state.combatant, [6, 6, 3], null, { modifier: 0 });
  assert.equal(state.combatant.animal.woundsTaken, 30);
  assert.equal(state.combatant.animal.destroyed, true);
  assert.equal(endPersonalCombatRecovery(state.combatant).status, 'dead');
});

test('rolled wounds: 0 or less is no wound', () => {
  const small = { ...beast, woundAlteration: { dice: -2 } };
  const animal = createAnimalCombatant({ id: 'a1', name: 'Chaser', side: 'opposition', entry: small, weaponKey: 'teeth', woundMode: 'rolled' });
  const result = resolvePersonalAttack({ attacker: animal, defender: person(), range: 'close', dice: createSequenceDice([6, 6, 1, 1, 6, 6]) });
  assert.equal(result.success, true);
  assert.equal(result.woundTotal, 0);
  assert.equal(result.noEffect, true);
  assert.equal(result.defender.firstBlood, true);
});

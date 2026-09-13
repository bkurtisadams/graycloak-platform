import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ANIMAL_TERRAIN_DMS,
  ANIMAL_TYPES,
  ANIMAL_SIZES,
  ANIMAL_BEHAVIOR,
  BLANK_ENCOUNTER_COLUMN,
  animalCategoryForThrow,
  animalEdibleMeatKg,
  checkForAnimalEncounter,
  createSequenceDice,
  generateAnimalEncounter,
  getPersonalWeapon,
  isAnimalEdible,
  PERSONAL_ARMOR_TYPES,
  resolveAnimalReaction
} from '../index.js';

test('Book 3 p.26 terrain chart is its own, not Book 1 p.27 encounter ranges', () => {
  // Two DMs per terrain, and a terrain list that carries Riverbank and Ruins
  // while Book 1's carries Suburb and City.
  assert.deepEqual(ANIMAL_TERRAIN_DMS.desert, { label: 'Desert', typeDM: 3, sizeDM: -3 });
  assert.deepEqual(ANIMAL_TERRAIN_DMS['swamp-marsh'], { label: 'Swamp, Marsh', typeDM: -2, sizeDM: 4 });
  assert.deepEqual(ANIMAL_TERRAIN_DMS.forest, { label: 'Forest', typeDM: -4, sizeDM: -4 });
  assert.ok(Object.hasOwn(ANIMAL_TERRAIN_DMS, 'riverbank'));
  assert.ok(!Object.hasOwn(ANIMAL_TERRAIN_DMS, 'city'));
});

test('Book 3 p.25 blank encounter column puts an event at 10 and carnivores high', () => {
  assert.equal(animalCategoryForThrow(2), 'scavenger');
  assert.equal(animalCategoryForThrow(7), 'herbivore');
  assert.equal(animalCategoryForThrow(10), 'event');
  assert.equal(animalCategoryForThrow(12), 'carnivore');
  assert.equal(Object.keys(BLANK_ENCOUNTER_COLUMN).length, 11);
});

test('Book 3 p.27 animal types carry the parenthesised quantity throw', () => {
  assert.deepEqual(ANIMAL_TYPES.herbivore[8], { type: 'grazer', quantityDice: 5 });
  assert.deepEqual(ANIMAL_TYPES.carnivore[7], { type: 'chaser', quantityDice: 0 });
  assert.deepEqual(ANIMAL_TYPES.scavenger[1], { type: 'carrion-eater', quantityDice: 2 });
});

test('Book 3 p.32 sizes: the second hits throw is the FURTHER damage needed to kill', () => {
  // "an animal listed as taking 2D/2D hits would have two dice rolled twice:
  // the first result would be the number of hits required to render the animal
  // unconscious. The second two-dice throw would indicate the additional hits
  // required to kill."
  assert.deepEqual(ANIMAL_SIZES[4], { weightKg: 12, unconscious: 2, dead: 2, woundDice: -1 });
  assert.deepEqual(ANIMAL_SIZES[9], { weightKg: 400, unconscious: 6, dead: 3, woundDice: 2 });
  assert.equal(ANIMAL_SIZES[13], null, 'the bullet row sends you to the reroll table');
});

test('a generated animal is resolvable by the Book 1 combat system', () => {
  // Type 7 (chaser), attribute 7 (none), size 7 -> bullet -> reroll, weapon
  // and armor rolls land on real rows.
  const dice = createSequenceDice([3, 4, 3, 4, 3, 4, 2, 5, 5, 3, 3]);
  const animal = generateAnimalEncounter(dice, { category: 'carnivore', terrain: 'hills-foothills', planetSize: 7 });
  assert.equal(animal.category, 'carnivore');
  assert.ok(ANIMAL_BEHAVIOR[animal.type], 'the type has printed behaviour');
  assert.ok(PERSONAL_ARMOR_TYPES.includes(animal.armor), `${animal.armor} is a Book 1 armor type`);
  for (const key of animal.weapons) assert.ok(getPersonalWeapon(key), `${key} is a Book 1 weapon`);
  assert.ok(animal.weightKg > 0);
  assert.ok(animal.quantity >= 1);
});

test('Book 3 p.32: a scavenger always also has teeth, and a flyer never has armor', () => {
  const scavenger = generateAnimalEncounter(createSequenceDice([3, 4, 3, 4, 3, 4, 3, 4, 3, 4]),
    { category: 'scavenger', terrain: 'ruins' });
  assert.ok(scavenger.weapons.includes('teeth'));

  // Attribute throw of 11 on the 'other' column is a flyer at -6.
  const flyer = generateAnimalEncounter(createSequenceDice([3, 4, 5, 6, 3, 4, 3, 4, 3, 4]),
    { category: 'omnivore', terrain: 'mountain' });
  if (flyer.specialAttribute === 'flyer') assert.equal(flyer.armor, 'none');
});

test('Book 3 p.29: herbivores throw to flee first, carnivores throw to attack first', () => {
  const grazer = { type: 'grazer', quantity: 3, weightKg: 400, behavior: ANIMAL_BEHAVIOR.grazer };
  // Grazer flees on 5+. A 6 flees before any attack throw is made.
  assert.equal(resolveAnimalReaction(createSequenceDice([3, 3, 4, 4]), grazer).action, 'flee');
  // Below the flee throw (2), then at or above the attack throw of 8+.
  assert.equal(resolveAnimalReaction(createSequenceDice([1, 1, 5, 4, 4, 4]), grazer).action, 'attack');

  const killer = { type: 'killer', quantity: 1, weightKg: 800, behavior: ANIMAL_BEHAVIOR.killer };
  // Killer attacks on 6+.
  assert.equal(resolveAnimalReaction(createSequenceDice([4, 4, 4, 4]), killer).action, 'attack');
});

test('Book 3 p.29 conditions: a pouncer attacks only with surprise and flees only when surprised', () => {
  const pouncer = { type: 'pouncer', quantity: 1, weightKg: 200, behavior: ANIMAL_BEHAVIOR.pouncer };
  assert.equal(resolveAnimalReaction(createSequenceDice([4, 4]), pouncer, { surprise: true }).action, 'attack');
  assert.equal(resolveAnimalReaction(createSequenceDice([4, 4]), pouncer, { surprised: true }).action, 'flee');
  assert.equal(resolveAnimalReaction(createSequenceDice([4, 4]), pouncer).action, 'stand');
});

test('Book 3 p.29: a chaser attacks on 6+ only when it has the numbers', () => {
  const chaser = { type: 'chaser', quantity: 5, weightKg: 300, behavior: ANIMAL_BEHAVIOR.chaser };
  assert.equal(resolveAnimalReaction(createSequenceDice([3, 3, 4, 4]), chaser, { partySize: 2 }).action, 'attack');
  // Outnumbered, the attack condition fails and it falls through to flight.
  assert.equal(resolveAnimalReaction(createSequenceDice([5, 5, 4, 4]), chaser, { partySize: 9 }).action, 'flee');
});

test('Book 3 p.29: a hunter attacks only if bigger than a party member', () => {
  const hunter = { type: 'hunter', quantity: 1, weightKg: 400, behavior: ANIMAL_BEHAVIOR.hunter };
  assert.equal(resolveAnimalReaction(createSequenceDice([3, 3, 4, 4]), hunter, { largestPartyMemberKg: 100 }).action, 'attack');
  const small = { ...hunter, weightKg: 12 };
  assert.notEqual(resolveAnimalReaction(createSequenceDice([3, 3, 4, 4]), small, { largestPartyMemberKg: 100 }).action, 'attack');
});

test('Book 3 p.28 food: edible on 5+, never with a poison weapon or a hostile atmosphere', () => {
  const beast = { weightKg: 400, weapons: ['teeth'] };
  assert.equal(isAnimalEdible(createSequenceDice([3, 3]), beast, { atmosphere: 6 }), true);
  assert.equal(isAnimalEdible(createSequenceDice([1, 1]), beast, { atmosphere: 6 }), false);
  assert.equal(isAnimalEdible(createSequenceDice([3, 3]), beast, { atmosphere: 10 }), false);
  assert.equal(isAnimalEdible(createSequenceDice([6, 6]), { weightKg: 400, weapons: ['stinger'] }, { atmosphere: 6 }), false);
  // One die times 5% of body weight is meat; a 4 on 400kg is 80kg.
  assert.equal(animalEdibleMeatKg(createSequenceDice([4]), beast), 80);
});

test('Book 3 p.26: one third chance of an encounter per check', () => {
  assert.equal(checkForAnimalEncounter(createSequenceDice([5])), true);
  assert.equal(checkForAnimalEncounter(createSequenceDice([4])), false);
  // A guide contributes +2 or better (Book 3 p.28).
  assert.equal(checkForAnimalEncounter(createSequenceDice([3]), { dm: 2 }), true);
});

// load-and-inventory.test.js — Book 1 (1977) p.32 WEIGHT, and the character
// document's inventory (schema 4).

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessLoad, applyLoadToCharacteristics, gravityLoadMultiplier, personalWeaponCarriedWeightGrams, PERSONAL_WEAPON_WEIGHTS_GRAMS, PERSONAL_WEAPONS
} from '../index.js';

test('a character carries Strength in kg freely, double encumbered, triple only in a military force', () => {
  const at = (kg, options = {}) => assessLoad({ strength: 7, loadGrams: kg * 1000, ...options });
  assert.deepEqual([at(7).state, at(7).characteristicDM], ['unencumbered', 0]);
  assert.deepEqual([at(7.001).state, at(7.001).characteristicDM], ['encumbered', -1]);
  assert.deepEqual([at(14).state, at(14).characteristicDM], ['encumbered', -1]);
  assert.equal(at(14.5).state, 'overloaded');
  assert.deepEqual([at(14.5, { military: true }).state, at(14.5, { military: true }).characteristicDM], ['military-load', -2]);
  assert.equal(at(21.5, { military: true }).state, 'overloaded');
});

test('gravity: 12.5% of load for each factor away from 7, as the rule states', () => {
  assert.equal(gravityLoadMultiplier(7), 1);
  assert.equal(gravityLoadMultiplier(8), 0.875, 'the book\'s second example: a 12.5% reduction');
  // The book's first example says a gravity of 3 "allows ... an additional 40%
  // load", but 7 - 3 = 4 steps of 12.5% is 50%. The rule is followed; the 40%
  // is taken for a misprint, as is "(8 - 9 = -1)" in the second example.
  assert.equal(gravityLoadMultiplier(3), 1.5);
  assert.equal(assessLoad({ strength: 7, loadGrams: 10000, gravityFactor: 3 }).state, 'unencumbered');
  assert.equal(gravityLoadMultiplier(null), 1);
});

test('encumbrance lowers Strength, Dexterity and Endurance and nothing else', () => {
  assert.deepEqual(applyLoadToCharacteristics({ STR: 7, DEX: 8, END: 1, INT: 9 }, -2), { STR: 5, DEX: 6, END: 0, INT: 9 });
});

test('every weapon a character can hold has a printed weight; guns are reckoned loaded', () => {
  for (const [key, spec] of Object.entries(PERSONAL_WEAPONS)) {
    if (['claws', 'teeth', 'horns', 'hooves', 'stinger', 'thrasher'].includes(key)) continue;
    assert.ok(PERSONAL_WEAPON_WEIGHTS_GRAMS[key], `${spec.name} has a weight`);
  }
  assert.equal(personalWeaponCarriedWeightGrams('laser-rifle'), 10000, 'rifle 6000 g and power pack 4000 g');
  assert.equal(personalWeaponCarriedWeightGrams('revolver'), 1000);
  assert.equal(PERSONAL_WEAPON_WEIGHTS_GRAMS.dagger.countsTowardLoad, false, 'a dagger is worn constantly and does not count');
});

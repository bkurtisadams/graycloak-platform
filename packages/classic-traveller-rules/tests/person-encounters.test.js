// v0.75.0: Book 3 (1977) pp.7, 19-21.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSequenceDice } from '../src/dice.js';
import { getPersonalWeapon } from '../src/combat/personal-combat.js';
import {
  RANDOM_PERSON_ENCOUNTERS, EXTRAORDINARY_WEAPONS, personEncounterCheck, rollPersonEncounter, lawArrestThrow
} from '../src/encounters/persons.js';

test('a person encounter point is a one-in-three chance: 5 or 6 on one die', () => {
  assert.equal(personEncounterCheck(createSequenceDice([4])).hit, false);
  assert.equal(personEncounterCheck(createSequenceDice([5])).hit, true);
});

test('the table is thrown as d66; its 6x rows are blank', () => {
  // 2,3: Police, 1D automatic pistols, cloth, a vehicle; then 1D group, STR/DEX/END, weapons dash-dash-dash, reaction.
  const police = rollPersonEncounter(createSequenceDice([2, 3, 4, 3, 3, 4, 4, 5, 5, 6, 6, 6, 6, 1]));
  assert.equal(police.type, 'Police');
  assert.equal(police.quantity, 4);
  assert.deepEqual({ ...police.characteristics }, { strength: 6, dexterity: 8, endurance: 10 });
  assert.equal(police.enforcement, true);
  assert.equal(police.vehicle, true);
  assert.equal(police.extraordinary, null);
  assert.equal(police.reaction.total, 7);
  assert.equal(rollPersonEncounter(createSequenceDice([6, 3])).blank, true);
});

test('one member may be armed extraordinarily, falling through the columns on a dash', () => {
  const thugs = rollPersonEncounter(createSequenceDice([1, 5, 1, 1, 3, 3, 3, 3, 3, 3, 4, 4, 3, 4, 3]));
  assert.equal(thugs.type, 'Thugs');
  assert.equal(thugs.quantity, 2);
  assert.deepEqual({ weapon: thugs.extraordinary.weapon, column: thugs.extraordinary.column }, { weapon: 'halberd', column: 3 });
});

test('every row names weapons and armour the personal-combat rules know', () => {
  for (const row of Object.values(RANDOM_PERSON_ENCOUNTERS).filter(Boolean)) {
    assert.doesNotThrow(() => getPersonalWeapon(row.weapon), row.type);
    assert.ok(['none', 'jack', 'mesh', 'cloth'].includes(row.armorKey), row.type);
  }
  for (const weapon of EXTRAORDINARY_WEAPONS.flat().filter(Boolean)) assert.doesNotThrow(() => getPersonalWeapon(weapon), weapon);
});

test('Book 3 p.7: the law level is the throw to avoid arrest', () => {
  assert.equal(lawArrestThrow(createSequenceDice([2, 2]), { lawLevel: 5 }).avoided, false);
  assert.equal(lawArrestThrow(createSequenceDice([2, 3]), { lawLevel: 5 }).avoided, true);
});

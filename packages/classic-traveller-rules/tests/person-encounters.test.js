// v0.75.0: Book 3 (1977) pp.7, 19-21.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSequenceDice } from '../src/dice.js';
import { getPersonalWeapon } from '../src/combat/personal-combat.js';
import {
  RANDOM_PERSON_ENCOUNTERS, EXTRAORDINARY_WEAPONS, personEncounterCheck, rollPersonEncounter, lawArrestThrow, weaponsViolationJailDays
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

test('The Traveller Book (1982): a weapons-violation arrest is 1D days in jail', () => {
  assert.equal(weaponsViolationJailDays(createSequenceDice([4])), 4);
});

// v0.77.0: The Traveller Book (1982) pp.99-101.
import { legalEncounterCheck, rollLegalEncounter, hasLocalPopulation, PATRON_LISTS, patronMatrixDMs, rollPatron, rumorCheck, rollRumor, RUMOR_MATRIX } from '../src/encounters/persons.js';

test('a legal encounter comes on 2D at or under the law level (the prose, not the printed wording)', () => {
  assert.equal(legalEncounterCheck(createSequenceDice([1, 1]), { lawLevel: 0 }).encounter, false, 'law 0: never');
  assert.equal(legalEncounterCheck(createSequenceDice([4, 5]), { lawLevel: 9 }).encounter, true);
  assert.equal(legalEncounterCheck(createSequenceDice([4, 5]), { lawLevel: 8 }).encounter, false);
  const enforcer = rollLegalEncounter(createSequenceDice([3, 3, 3, 3, 3, 3, 4, 4]));
  assert.deepEqual({ type: enforcer.type, quantity: enforcer.quantity, enforcement: enforcer.enforcement, reaction: enforcer.reaction.total }, { type: 'Local enforcer', quantity: 1, enforcement: true, reaction: 8 });
});

test('no local population, no random encounter', () => {
  assert.equal(hasLocalPopulation(0), false);
  assert.equal(hasLocalPopulation(5), true);
});

test('the patron matrix reads the second die as the tens, with the looker\u2019s DMs', () => {
  assert.equal(Object.keys(PATRON_LISTS.one).length, 36);
  assert.equal(PATRON_LISTS.two[44], 'Naval Architect');
  // First die 3, second die 5: code 53 — list one's Marine Officer.
  assert.equal(rollPatron(createSequenceDice([3, 5, 4, 4])).type, 'Marine Officer');
  // An army character shifts the second die up: 3,4 +1 -> 53.
  const dms = patronMatrixDMs('one', { service: 'army' });
  assert.deepEqual({ first: dms.first, second: dms.second }, { first: 0, second: 1 });
  assert.equal(rollPatron(createSequenceDice([3, 4, 4, 4]), { firstDM: dms.first, secondDM: dms.second }).type, 'Marine Officer');
  assert.equal(rollPatron(createSequenceDice([3, 2])).rumor, true, '23 is Rumor');
  assert.deepEqual({ ...patronMatrixDMs('two', { service: 'merchants', skills: { Streetwise: 1 } }) }.first, 1);
});

test('a rumor on 7+ on 2D; the matrix gives its type', () => {
  assert.equal(rumorCheck(createSequenceDice([3, 3])).found, false);
  assert.equal(rumorCheck(createSequenceDice([3, 4])).found, true);
  assert.equal(RUMOR_MATRIX.flat().length, 36);
  const rumor = rollRumor(createSequenceDice([6, 1]));
  assert.deepEqual({ letter: rumor.letter, type: rumor.type }, { letter: 'F', type: 'Information leading to trap' });
  assert.equal(rollRumor(createSequenceDice([2, 2])).general, true, 'U: general');
});

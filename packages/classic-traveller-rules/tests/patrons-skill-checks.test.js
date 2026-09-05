import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PATRON_ENCOUNTER_TABLE,
  PATRON_SUITABILITY_TARGET,
  REACTION_TABLE,
  createSequenceDice,
  generatePatronContact,
  reactionForTotal,
  resolveRefereeSkillCheck,
  rollPatronType,
  modifiedReactionTotal,
  rollReaction,
  REACTION_DMS
} from '../index.js';

test('Book 3 patron table preserves the printed 6x6 entries', () => {
  assert.equal(PATRON_ENCOUNTER_TABLE.length, 6);
  assert.deepEqual(PATRON_ENCOUNTER_TABLE[0], ['Arsonist', 'Cutthroat', 'Assassin', 'Hijacker', 'Smuggler', 'Terrorist']);
  assert.equal(PATRON_ENCOUNTER_TABLE[2][4], 'Scout');
  assert.equal(PATRON_ENCOUNTER_TABLE[5][5], 'Rumor');
});

test('Book 3 p.25: a 5 or 6 on the weekly patron throw finds a patron; 1-4 does not', () => {
  const missed = generatePatronContact(createSequenceDice([4]));
  assert.equal(missed.available, false);
  assert.equal(missed.availabilityRoll, 4);
  assert.equal(missed.patron, null);
  // availability 5; row 2 / column 4 = Clerk; reaction 3+4 = 7.
  const found = generatePatronContact(createSequenceDice([5, 2, 4, 3, 4]));
  assert.equal(found.available, true);
  assert.equal(found.patron.type, 'Clerk');
  assert.equal(found.suitable, true);
});

test('Book 3 patron contact uses two d6 for patron type and 2D reaction suitability', () => {
  // availability 6; row 3 / column 5 = Scout; reaction 4+4 = 8.
  const contact = generatePatronContact(createSequenceDice([6, 3, 5, 4, 4]));
  assert.equal(contact.patron.type, 'Scout');
  assert.equal(contact.rumor, false);
  assert.equal(PATRON_SUITABILITY_TARGET, 7);
  assert.equal(contact.reaction.roll, 8);
  assert.equal(contact.reaction.description, 'Interested.');
  assert.equal(contact.suitable, true);
});

test('Book 3 Rumor entries act as absent patrons that impart information', () => {
  // availability 5; row 6 / column 6 = Rumor.
  const contact = generatePatronContact(createSequenceDice([5, 6, 6]));
  assert.equal(contact.available, true);
  assert.equal(contact.patron.type, 'Rumor');
  assert.equal(contact.rumor, true);
  assert.equal(contact.reaction, null);
});

test('reaction table clamps modified totals to printed 2 through 12 entries', () => {
  assert.equal(REACTION_TABLE[2], 'Violent. Immediate attack.');
  assert.equal(REACTION_TABLE[12], 'Genuinely friendly.');
  assert.equal(reactionForTotal(1).tableTotal, 2);
  assert.equal(reactionForTotal(15).tableTotal, 12);
});

test('Book 3 p.27: natural 2 and 12 ignore DMs; modified results floor at 3 and cap at 12', () => {
  assert.equal(modifiedReactionTotal(2, 5), 2);
  assert.equal(modifiedReactionTotal(12, -5), 12);
  assert.equal(modifiedReactionTotal(3, -4), 3);
  assert.equal(modifiedReactionTotal(11, 4), 12);
  assert.equal(modifiedReactionTotal(7, 1), 8);
  assert.equal(REACTION_DMS.fiveOrMoreMilitaryTerms, 1);
  assert.equal(REACTION_DMS.planetaryPopulation9Plus, -1);
  const rolled = rollReaction(createSequenceDice([1, 1]), { dm: 3 });
  assert.equal(rolled.total, 2);
  assert.equal(rolled.description, 'Violent. Immediate attack.');
});

test('generalized referee skill check follows the Book 1 Electronics throw pattern explicitly', () => {
  const result = resolveRefereeSkillCheck({
    dice: createSequenceDice([3, 3]),
    target: 8,
    skillLevel: 1,
    intelligence: 11,
    education: 10,
    situationalDM: -1
  });
  assert.equal(result.roll, 6);
  assert.equal(result.intelligenceDM, 1);
  assert.equal(result.educationDM, 1);
  assert.equal(result.dm, 2);
  assert.equal(result.total, 8);
  assert.equal(result.success, true);
  assert.equal(result.basis, 'graycloak-generalized-from-book1-electronics');
});

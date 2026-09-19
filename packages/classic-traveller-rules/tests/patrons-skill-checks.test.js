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
  REACTION_DMS,
  rollShipEncounter,
  rollPatrolOrPirateHull,
  shipEncounterStarportDM,
  SHIP_ENCOUNTER_TABLE,
  SHIP_ENCOUNTER_TYPES,
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
  // Book 3 p.27 prints "If planetary population is 11 or greater, DM -1";
  // the key is named for the printed threshold.
  assert.equal(REACTION_DMS.planetaryPopulation11Plus, -1);
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

test('Book 2 p.36: the starport decides how much traffic a system has', () => {
  assert.equal(shipEncounterStarportDM('A'), 6);
  assert.equal(shipEncounterStarportDM('B'), 4);
  assert.equal(shipEncounterStarportDM('C'), 2);
  assert.equal(shipEncounterStarportDM('D'), 1);
  assert.equal(shipEncounterStarportDM('E'), -2);
  assert.equal(shipEncounterStarportDM('X'), -4);

  // An X-class port throws 2D-4, which cannot reach 9, so it never sees
  // traffic at all. That is the rule working, not a gap.
  const sixes = { rollD6: () => 6, roll2D6: () => ({ dice: [6, 6], total: 12 }) };
  assert.equal(rollShipEncounter(sixes, { starport: 'X' }).type, null);
  // The same throw at a class A port is a patrol.
  assert.equal(rollShipEncounter(sixes, { starport: 'A' }).type, 'patrol');
});

test('Book 2 p.36: eight or less is no encounter', () => {
  const ones = { rollD6: () => 1, roll2D6: () => ({ dice: [1, 1], total: 2 }) };
  const result = rollShipEncounter(ones, { starport: 'C' });
  assert.equal(result.total, 4);
  assert.equal(result.type, null);
});

test('Book 2 p.36: only the pirate is hostile by default; merchants carry news', () => {
  // "Free Traders, if friendly, may serve as a source of information...
  // Patrols may be simple border pickets, or may be a form of pirate."
  assert.equal(SHIP_ENCOUNTER_TYPES['free-trader'].hostileByDefault, false);
  assert.equal(SHIP_ENCOUNTER_TYPES['free-trader'].informant, true);
  assert.equal(SHIP_ENCOUNTER_TYPES['subsidized-merchant'].informant, true);
  assert.equal(SHIP_ENCOUNTER_TYPES.patrol.hostileByDefault, false);
  assert.equal(SHIP_ENCOUNTER_TYPES.pirate.hostileByDefault, true);
  // Three of the ten table results are free traders.
  const traders = Object.values(SHIP_ENCOUNTER_TABLE).filter((key) => key === 'free-trader');
  assert.equal(traders.length, 3);
});

test('Book 2 p.36: a patrol or pirate rolls for its hull', () => {
  const low = { rollD6: () => 1, roll2D6: () => ({ dice: [6, 6], total: 12 }) };
  const encounter = rollShipEncounter(low, { starport: 'A' });
  assert.equal(encounter.type, 'patrol');
  // 2D of ones is 2, so 6- : a Type S Scout/Courier.
  assert.equal(encounter.hull.hull, 'type-s-scout-courier');
  // A seven exactly is the armed yacht.
  assert.equal(rollPatrolOrPirateHull(createSequenceDice([3, 4])).hull, 'type-y-yacht-armed');
  assert.equal(rollPatrolOrPirateHull(createSequenceDice([5, 5])).hull, 'type-c-cruiser');
  // A trader is not a patrol and rolls no hull.
  const trader = rollShipEncounter({ rollD6: () => 3, roll2D6: () => ({ dice: [3, 4], total: 7 }) }, { starport: 'C' });
  assert.equal(trader.type, 'free-trader');
  assert.equal(trader.hull, null);
});

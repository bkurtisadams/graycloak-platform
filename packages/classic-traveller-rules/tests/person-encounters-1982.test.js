// 0.85.0: The Traveller Book (1982) p.101 random encounter list and equipping.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createDice, createSequenceDice } from '../src/dice.js';
import { RANDOM_PERSON_ENCOUNTERS_1982, WEAPONS_BY_TECH_LEVEL_1982, equipEncounterGroup, rollPersonEncounter1982 } from '../src/encounters/persons-1982.js';

const R = RANDOM_PERSON_ENCOUNTERS_1982;

test('p.101: thirty rows as the book gives them; 61-66 blank', () => {
  const filled = Object.entries(R).filter(([, entry]) => entry);
  assert.equal(filled.length, 30);
  for (const code of [61, 62, 63, 64, 65, 66]) assert.equal(R[code], null);
  const read = (code) => `${R[code].quantity} ${R[code].type} ${R[code].remarks}`.trim();
  assert.equal(read(21), '2D Soldiers +1 LGA');
  assert.equal(read(22), '2D Soldiers LGAV');
  assert.equal(read(23), '1D Police Patrol +1 GA');
  assert.equal(read(31), '1D Adventurers +2 GAV');
  assert.equal(read(46), '3D Ambushing Brigands LGA');
  assert.equal(read(52), '2D Traders GV');
  assert.equal(read(54), '1D Beggars L');
  assert.equal(read(55), '5D Pilgrims A');
  assert.equal(read(56), '3D Guards A');
  assert.deepEqual({ techDM: R[21].techDM, leader: R[21].leader, guns: R[21].guns, armor: R[21].armor, vehicle: R[21].vehicle }, { techDM: 1, leader: true, guns: true, armor: true, vehicle: false });
  assert.equal(R[11].techDM, -3);
  assert.equal(R[23].enforcement && R[36].enforcement, true);
});

test('unless the remarks say so: blades, no armor, on foot, at the world\u2019s tech level', () => {
  for (let round = 0; round < 50; round += 1) {
    const gear = equipEncounterGroup(createDice(), R[53], { techLevel: 8 });
    assert.ok(['dagger', 'sword', 'broadsword', 'foil', 'cutlass', 'blade'].includes(gear.weapon), gear.weapon);
    assert.equal(gear.armorKey, 'none');
    assert.equal(gear.vehicle, false);
    assert.equal(gear.techLevel, 8);
    assert.equal(gear.leader, null);
  }
  const peasants = equipEncounterGroup(createDice(), R[11], { techLevel: 2 });
  assert.equal(peasants.techLevel, 0, '-3 from TL 2, not below 0');
  assert.ok(['club', 'cudgel', 'spear'].includes(peasants.weapon), 'no blades at TL 0');
});

test('G guns and A armor at the group\u2019s tech level; only military troops and leaders in combat armor', () => {
  for (let round = 0; round < 60; round += 1) {
    const dice = createDice();
    const police = equipEncounterGroup(dice, R[23], { techLevel: 4 });
    assert.equal(police.techLevel, 5);
    assert.ok(['revolver', 'shotgun', 'carbine', 'rifle', 'automatic-pistol', 'submachine-gun'].includes(police.weapon), police.weapon);
    assert.ok(['jack'].includes(police.armorKey));
    const guards = equipEncounterGroup(dice, R[56], { techLevel: 12 });
    assert.notEqual(guards.armorKey, 'combat', 'guards are not military');
    const soldiers = equipEncounterGroup(dice, R[22], { techLevel: 12 });
    assert.equal(soldiers.leader.armorKey, 'combat');
    assert.equal(soldiers.leader.weapon, 'laser-rifle', 'the best gun for the tech level');
    assert.equal(soldiers.vehicle, true);
  }
});

test('a leader has the best the tech level offers; at TL 3 that is a blade', () => {
  const thugs = equipEncounterGroup(createDice(), R[15], { techLevel: 3 });
  assert.equal(thugs.leader.weapon, 'broadsword');
  assert.equal(thugs.leader.armorKey, 'jack');
  const merchants = equipEncounterGroup(createDice(), R[51], { techLevel: 6 });
  assert.equal(merchants.techLevel, 7);
  assert.equal(merchants.leader.weapon, 'automatic-rifle');
  assert.equal(merchants.leader.armorKey, 'mesh');
});

test('p.102: a lawful group keeps to the law level; military, police, outlaws and a noble\u2019s people need not', () => {
  const law6 = ['body-pistol', 'laser-rifle', 'laser-carbine', 'automatic-rifle', 'submachine-gun', 'automatic-pistol', 'revolver', 'rifle', 'carbine'];
  for (let round = 0; round < 60; round += 1) {
    const dice = createDice();
    const vigilantes = equipEncounterGroup(dice, R[44], { techLevel: 9, prohibited: law6 });
    assert.equal(vigilantes.weapon, 'shotgun', 'the one gun the law still allows');
    assert.equal(vigilantes.restrictedByLaw, true);
    const brigands = equipEncounterGroup(dice, R[46], { techLevel: 9, prohibited: law6 });
    assert.equal(brigands.lawful, false);
    assert.equal(brigands.leader.weapon, 'laser-rifle', 'smuggled');
  }
  const everything = equipEncounterGroup(createDice(), R[53], { techLevel: 9, prohibited: ['*'] });
  assert.equal(everything.weapon, 'hands');
  const soldiers = equipEncounterGroup(createDice(), R[21], { techLevel: 9, prohibited: ['*'] });
  assert.notEqual(soldiers.weapon, 'hands');
});

test('a roll gives the row, a shared set of characteristics and one reaction; a 6x row is blank', () => {
  const blank = rollPersonEncounter1982(createSequenceDice([6, 3]));
  assert.deepEqual({ ...blank }, { code: 63, blank: true, type: null });
  const met = rollPersonEncounter1982(createDice(), { techLevel: 7 });
  if (!met.blank) {
    assert.equal(met.edition, 1982);
    assert.ok(met.quantity >= 1);
    assert.ok(met.reaction.description);
  }
  assert.ok(Object.values(WEAPONS_BY_TECH_LEVEL_1982).flat().includes('laser-rifle'));
});

// 0.86.0: boarding parties and the rumour DM.
import { BOARDING_PARTIES, rollBoardingParty } from '../src/encounters/persons-1982.js';
import { rumorCheck } from '../src/encounters/persons.js';

test('hijackers: 1D, no more than the passengers aboard, blades and a leader with a gun', () => {
  for (let round = 0; round < 60; round += 1) {
    const party = rollBoardingParty(createDice(), 'hijack', { techLevel: 9, maxQuantity: 2 });
    assert.ok(party.quantity >= 1 && party.quantity <= 2);
    assert.ok(['dagger', 'sword', 'broadsword', 'foil', 'cutlass', 'blade'].includes(party.weapon), party.weapon);
    assert.equal(party.leader.weapon, 'laser-rifle');
    assert.equal(party.armorKey, 'none');
    assert.equal(party.type, 'Hijackers');
  }
});

test('a repossession party: 2D, guns and armor, a leader', () => {
  const party = rollBoardingParty(createDice(), 'repossession-boarding', { techLevel: 12 });
  assert.ok(party.quantity >= 2 && party.quantity <= 12);
  assert.ok(party.leader);
  assert.notEqual(party.armorKey, 'none');
  assert.notEqual(party.armorKey, 'combat', 'not military');
  assert.equal(BOARDING_PARTIES['repossession-boarding'].remarks, 'LGA');
  assert.throws(() => rollBoardingParty(createDice(), 'pirates'), /no boarding party/);
});

test('the weekly rumour throw takes a DM', () => {
  const plain = rumorCheck(createSequenceDice([3, 3]));
  assert.deepEqual({ total: plain.total, found: plain.found }, { total: 6, found: false });
  const streetwise = rumorCheck(createSequenceDice([3, 3]), { dm: 1 });
  assert.deepEqual({ natural: streetwise.natural, total: streetwise.total, found: streetwise.found }, { natural: 6, total: 7, found: true });
});

// 0.87.0: the law level reads a hostile attack (design.md 9.3).
import { hostileAttackIsPhysical } from '../src/encounters/persons.js';
test('a hostile attack is physical on 2D over the law level; a natural 12 always', () => {
  assert.equal(hostileAttackIsPhysical(createSequenceDice([3, 4]), { lawLevel: 6 }).physical, true);
  assert.equal(hostileAttackIsPhysical(createSequenceDice([3, 3]), { lawLevel: 6 }).physical, false, 'at the law level: words');
  assert.equal(hostileAttackIsPhysical(createSequenceDice([1, 1]), { lawLevel: 0 }).physical, true, 'law 0: always');
  assert.equal(hostileAttackIsPhysical(createSequenceDice([6, 6]), { lawLevel: 14 }).physical, true, 'a natural 12');
  assert.equal(hostileAttackIsPhysical(createSequenceDice([6, 5]), { lawLevel: 12 }).physical, false);
});

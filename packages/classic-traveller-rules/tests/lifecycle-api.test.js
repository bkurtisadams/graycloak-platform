import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CHARGEN_ACTIONS,
  CHARGEN_PHASES,
  ChargenStateError,
  createCharacter,
  createSequenceDice,
  getAvailableActions,
  performChargenAction
} from '../index.js';

function sevenCharacter() {
  return createCharacter({
    name: 'API Test',
    dice: createSequenceDice([
      3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4
    ])
  });
}

test('getAvailableActions exposes service choices without leaking rules into the UI', () => {
  const character = sevenCharacter();
  const available = getAvailableActions(character);

  assert.equal(available.phase, CHARGEN_PHASES.SERVICE_SELECTION);
  assert.deepEqual(available.actions, [CHARGEN_ACTIONS.ATTEMPT_ENLISTMENT]);
  assert.deepEqual(available.choices.services, [
    'navy', 'marines', 'army', 'scouts', 'merchants', 'other'
  ]);
});

test('skill phase exposes only skill tables legal for the current EDU', () => {
  let character = sevenCharacter();
  character = performChargenAction(character, CHARGEN_ACTIONS.ATTEMPT_ENLISTMENT, {
    service: 'other', dice: createSequenceDice([2, 2])
  }).character;
  character = performChargenAction(character, CHARGEN_ACTIONS.BEGIN_TERM).character;
  character = performChargenAction(character, CHARGEN_ACTIONS.RESOLVE_SURVIVAL, {
    dice: createSequenceDice([3, 3])
  }).character;

  const available = getAvailableActions(character);
  assert.equal(available.phase, CHARGEN_PHASES.SKILLS_PENDING);
  assert.deepEqual(available.actions, [CHARGEN_ACTIONS.ROLL_SKILL]);
  assert.deepEqual(available.choices.skillTables, [
    'personal-development', 'service-skills', 'advanced-education'
  ]);
  assert.equal(available.choices.skillsDue, 2);
});

test('dispatcher rejects actions that are not legal in the current phase', () => {
  const character = sevenCharacter();
  assert.throws(
    () => performChargenAction(character, CHARGEN_ACTIONS.BEGIN_TERM),
    (error) => error instanceof ChargenStateError && /not legal/.test(error.message)
  );
});

test('high-level dispatcher can carry a character from age 18 through mustering out', () => {
  let character = sevenCharacter();

  character = performChargenAction(character, CHARGEN_ACTIONS.ATTEMPT_ENLISTMENT, {
    service: 'other', dice: createSequenceDice([2, 2])
  }).character;
  assert.equal(character.phase, CHARGEN_PHASES.TERM_READY);

  character = performChargenAction(character, CHARGEN_ACTIONS.BEGIN_TERM).character;
  character = performChargenAction(character, CHARGEN_ACTIONS.RESOLVE_SURVIVAL, {
    dice: createSequenceDice([3, 3])
  }).character;

  character = performChargenAction(character, CHARGEN_ACTIONS.ROLL_SKILL, {
    tableKey: 'personal-development', dice: createSequenceDice([1])
  }).character;
  character = performChargenAction(character, CHARGEN_ACTIONS.ROLL_SKILL, {
    tableKey: 'personal-development', dice: createSequenceDice([1])
  }).character;
  character = performChargenAction(character, CHARGEN_ACTIONS.COMPLETE_TERM).character;

  assert.equal(character.age, 22);
  assert.equal(character.terms, 1);
  assert.equal(character.phase, CHARGEN_PHASES.REENLISTMENT_REQUIRED);

  character = performChargenAction(character, CHARGEN_ACTIONS.ROLL_REENLISTMENT, {
    dice: createSequenceDice([3, 3])
  }).character;
  assert.equal(character.phase, CHARGEN_PHASES.REENLISTMENT_DECISION);

  character = performChargenAction(character, CHARGEN_ACTIONS.MUSTER_OUT).character;
  character = performChargenAction(character, CHARGEN_ACTIONS.BEGIN_MUSTER_OUT).character;
  character = performChargenAction(character, CHARGEN_ACTIONS.ROLL_MUSTER_CASH, {
    dice: createSequenceDice([1])
  }).character;

  assert.equal(character.phase, CHARGEN_PHASES.COMPLETE);
  assert.equal(character.credits, 1000);
  assert.deepEqual(getAvailableActions(character).actions, []);
});

test('cash action disappears after the third cash-table consultation', () => {
  const character = {
    ...sevenCharacter(),
    service: 'other',
    phase: CHARGEN_PHASES.MUSTER_OUT_ROLLS_PENDING,
    terms: 4,
    yearsServed: 16,
    completedTerms: [
      { plannedYears: 4 }, { plannedYears: 4 }, { plannedYears: 4 }, { plannedYears: 4 }
    ],
    musterOut: {
      totalRolls: 4,
      remainingRolls: 1,
      rankBonusRolls: 0,
      cashRolls: 3,
      benefitRolls: 0,
      cashReceived: 0,
      results: []
    }
  };

  assert.deepEqual(getAvailableActions(character).actions, [CHARGEN_ACTIONS.ROLL_MUSTER_BENEFIT]);
});

test('dispatcher forwards mustering-out weapon specialization payload', () => {
  const character = {
    ...sevenCharacter(),
    service: 'army',
    phase: CHARGEN_PHASES.MUSTER_BENEFIT_SPECIALIZATION_REQUIRED,
    terms: 1,
    yearsServed: 4,
    pendingMusterBenefit: { category: 'gun', resultIndex: 0 },
    musterOut: {
      totalRolls: 2,
      remainingRolls: 1,
      rankBonusRolls: 1,
      cashRolls: 0,
      benefitRolls: 1,
      cashReceived: 0,
      results: [{
        type: 'benefit',
        roll: 4,
        dm: 0,
        total: 4,
        outcome: { type: 'weapon', category: 'gun' },
        pending: true
      }]
    }
  };

  const result = performChargenAction(
    character,
    CHARGEN_ACTIONS.RESOLVE_MUSTER_BENEFIT_SPECIALIZATION,
    { specialization: 'Rifle', asSkill: false }
  );

  assert.deepEqual(result.character.materialBenefits, [
    { type: 'weapon', category: 'gun', specialization: 'Rifle' }
  ]);
  assert.equal(result.character.pendingMusterBenefit, null);
  assert.equal(result.character.phase, CHARGEN_PHASES.MUSTER_OUT_ROLLS_PENDING);
});

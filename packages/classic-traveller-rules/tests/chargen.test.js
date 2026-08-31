import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CHARGEN_PHASES,
  attemptEnlistment,
  beginTerm,
  createCharacter,
  createSequenceDice,
  resolveCommission,
  resolveDraft,
  resolvePromotion,
  resolveSurvival
} from '../index.js';

function baseCharacter(overrides = {}) {
  return {
    schemaVersion: 1,
    name: 'Test Traveller',
    age: 18,
    characteristics: { STR: 7, DEX: 7, END: 7, INT: 7, EDU: 7, SOC: 7 },
    upp: '777777',
    service: null,
    drafted: false,
    terms: 0,
    rank: 0,
    rankTitle: '',
    skillsDue: 0,
    alive: true,
    phase: CHARGEN_PHASES.SERVICE_SELECTION,
    currentTerm: null,
    options: { survivalInjuryRule: false },
    history: [],
    ...overrides
  };
}

test('new characters begin at age 18 with a serializable chargen state', () => {
  const dice = createSequenceDice(Array(12).fill(3));
  const character = createCharacter({ name: 'Morgan', dice });

  assert.equal(character.age, 18);
  assert.equal(character.upp, '666666');
  assert.equal(character.phase, CHARGEN_PHASES.SERVICE_SELECTION);
  assert.deepEqual(JSON.parse(JSON.stringify(character)), character);
});

test('Book 1 Navy enlistment example fails on roll 3 + EDU 10 DM +2', () => {
  const character = baseCharacter({
    characteristics: { STR: 7, DEX: 7, END: 7, INT: 6, EDU: 10, SOC: 7 },
    upp: '7776A7'
  });

  const result = attemptEnlistment(character, 'navy', {
    dice: createSequenceDice([1, 2])
  });

  assert.deepEqual(result.check, {
    dice: [1, 2],
    roll: 3,
    dm: 2,
    total: 5,
    target: 8,
    success: false
  });
  assert.equal(result.character.phase, CHARGEN_PHASES.DRAFT_REQUIRED);
  assert.equal(result.character.service, null);
});

test('enlistment DMs are cumulative when both listed characteristics qualify', () => {
  const character = baseCharacter({
    characteristics: { STR: 7, DEX: 7, END: 7, INT: 8, EDU: 9, SOC: 7 },
    upp: '777897'
  });

  const result = attemptEnlistment(character, 'navy', {
    dice: createSequenceDice([2, 3])
  });

  assert.equal(result.check.roll, 5);
  assert.equal(result.check.dm, 3);
  assert.equal(result.check.total, 8);
  assert.equal(result.check.success, true);
  assert.equal(result.character.service, 'navy');
  assert.equal(result.character.phase, CHARGEN_PHASES.TERM_READY);
});

test('failed enlistment sends the character to the one-die draft table', () => {
  const failed = attemptEnlistment(baseCharacter(), 'navy', {
    dice: createSequenceDice([1, 1])
  }).character;

  const drafted = resolveDraft(failed, { dice: createSequenceDice([3]) });

  assert.equal(drafted.roll, 3);
  assert.equal(drafted.service, 'army');
  assert.equal(drafted.character.service, 'army');
  assert.equal(drafted.character.drafted, true);
  assert.equal(drafted.character.phase, CHARGEN_PHASES.TERM_READY);
});

test('a first-term draftee is not eligible to attempt a commission', () => {
  const character = baseCharacter({
    service: 'army',
    drafted: true,
    phase: CHARGEN_PHASES.TERM_READY,
    characteristics: { STR: 7, DEX: 7, END: 7, INT: 7, EDU: 7, SOC: 7 }
  });

  const inTerm = beginTerm(character);
  const survived = resolveSurvival(inTerm, {
    dice: createSequenceDice([3, 3])
  }).character;

  assert.equal(survived.currentTerm.number, 1);
  assert.equal(survived.skillsDue, 2);
  assert.equal(survived.phase, CHARGEN_PHASES.SKILLS_PENDING);
});

test('successful first-term commission and promotion each add one skill eligibility', () => {
  const character = baseCharacter({
    service: 'navy',
    phase: CHARGEN_PHASES.TERM_READY,
    characteristics: { STR: 7, DEX: 7, END: 7, INT: 8, EDU: 9, SOC: 9 }
  });

  const inTerm = beginTerm(character);
  assert.equal(inTerm.skillsDue, 2);

  const survived = resolveSurvival(inTerm, {
    dice: createSequenceDice([2, 3])
  }).character;
  assert.equal(survived.phase, CHARGEN_PHASES.COMMISSION_OPTION);

  const commissioned = resolveCommission(survived, {
    dice: createSequenceDice([5, 4])
  }).character;
  assert.equal(commissioned.rank, 1);
  assert.equal(commissioned.rankTitle, 'Ensign');
  assert.equal(commissioned.skillsDue, 3);
  assert.equal(commissioned.phase, CHARGEN_PHASES.PROMOTION_OPTION);

  const promoted = resolvePromotion(commissioned, {
    dice: createSequenceDice([4, 3])
  }).character;
  assert.equal(promoted.rank, 2);
  assert.equal(promoted.rankTitle, 'Lieutenant');
  assert.equal(promoted.skillsDue, 4);
  assert.equal(promoted.phase, CHARGEN_PHASES.SKILLS_PENDING);
});

test('failed survival is fatal under the standard Book 1 rule', () => {
  const character = baseCharacter({
    service: 'scouts',
    phase: CHARGEN_PHASES.TERM_READY,
    characteristics: { STR: 7, DEX: 7, END: 7, INT: 7, EDU: 7, SOC: 7 }
  });

  const result = resolveSurvival(beginTerm(character), {
    dice: createSequenceDice([1, 1])
  });

  assert.equal(result.outcome, 'death');
  assert.equal(result.character.alive, false);
  assert.equal(result.character.phase, CHARGEN_PHASES.DEAD);
});

test('optional survival rule converts failure to injury only when enabled before chargen', () => {
  const character = baseCharacter({
    service: 'scouts',
    phase: CHARGEN_PHASES.TERM_READY,
    options: { survivalInjuryRule: true }
  });

  const result = resolveSurvival(beginTerm(character), {
    dice: createSequenceDice([1, 1])
  });

  assert.equal(result.outcome, 'injury');
  assert.equal(result.character.alive, true);
  assert.equal(result.character.age, 20);
  assert.equal(result.character.currentTerm.plannedYears, 2);
  assert.equal(result.character.phase, CHARGEN_PHASES.SKILLS_PENDING);
});

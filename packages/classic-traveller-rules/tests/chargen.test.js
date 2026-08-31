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

test('acquired characteristic results apply immediately and update the UPP', async () => {
  const { rollAcquiredSkill } = await import('../index.js');
  const character = baseCharacter({
    service: 'navy',
    phase: CHARGEN_PHASES.SKILLS_PENDING,
    skillsDue: 1,
    currentTerm: {
      number: 1, startAge: 18, plannedYears: 4, forcedSeparation: false,
      survival: null, commission: null, promotion: null, skillRolls: [], automaticBenefits: []
    }
  });

  const result = rollAcquiredSkill(character, 'personal-development', {
    dice: createSequenceDice([1])
  });

  assert.equal(result.character.characteristics.STR, 8);
  assert.equal(result.character.upp, '877777');
  assert.equal(result.character.skillsDue, 0);
  assert.equal(result.character.phase, CHARGEN_PHASES.TERM_COMPLETION_READY);
});

test('repeated acquisitions of a basic skill increase its level', async () => {
  const { rollAcquiredSkill } = await import('../index.js');
  let character = baseCharacter({
    service: 'scouts',
    phase: CHARGEN_PHASES.SKILLS_PENDING,
    skillsDue: 2,
    skills: {},
    currentTerm: {
      number: 1, startAge: 18, plannedYears: 4, forcedSeparation: false,
      survival: null, commission: null, promotion: null, skillRolls: [], automaticBenefits: []
    }
  });

  character = rollAcquiredSkill(character, 'service-skills', {
    dice: createSequenceDice([4])
  }).character;
  character = rollAcquiredSkill(character, 'service-skills', {
    dice: createSequenceDice([4])
  }).character;

  assert.equal(character.skills.Navigation, 2);
  assert.equal(character.phase, CHARGEN_PHASES.TERM_COMPLETION_READY);
});

test('weapon expertise waits for the required specific weapon choice', async () => {
  const { rollAcquiredSkill, resolveSkillSpecialization } = await import('../index.js');
  let character = baseCharacter({
    service: 'army',
    phase: CHARGEN_PHASES.SKILLS_PENDING,
    skillsDue: 1,
    skills: {},
    currentTerm: {
      number: 1, startAge: 18, plannedYears: 4, forcedSeparation: false,
      survival: null, commission: null, promotion: null, skillRolls: [], automaticBenefits: []
    }
  });

  const rolled = rollAcquiredSkill(character, 'service-skills', {
    dice: createSequenceDice([3])
  });
  character = rolled.character;

  assert.equal(character.skillsDue, 0);
  assert.equal(character.phase, CHARGEN_PHASES.SKILL_SPECIALIZATION_REQUIRED);
  assert.equal(character.pendingSkill.specializationType, 'gun');

  character = resolveSkillSpecialization(character, 'Rifle').character;
  assert.equal(character.skills.Rifle, 1);
  assert.equal(character.pendingSkill, null);
  assert.equal(character.phase, CHARGEN_PHASES.TERM_COMPLETION_READY);
});

test('the EDU 8+ table cannot be rolled by EDU 7', async () => {
  const { ChargenStateError, rollAcquiredSkill } = await import('../index.js');
  const character = baseCharacter({
    service: 'navy',
    phase: CHARGEN_PHASES.SKILLS_PENDING,
    skillsDue: 1,
    currentTerm: {
      number: 1, startAge: 18, plannedYears: 4, forcedSeparation: false,
      survival: null, commission: null, promotion: null, skillRolls: [], automaticBenefits: []
    }
  });
  const dice = createSequenceDice([1]);

  assert.throws(
    () => rollAcquiredSkill(character, 'advanced-education-8', { dice }),
    ChargenStateError
  );
  assert.equal(dice.remaining(), 1);
});

test('term completion advances four years and applies rank/service automatic skills once', async () => {
  const { completeTerm } = await import('../index.js');
  const character = baseCharacter({
    service: 'marines',
    rank: 1,
    rankTitle: 'Lieutenant',
    phase: CHARGEN_PHASES.TERM_COMPLETION_READY,
    skills: {},
    skillsDue: 0,
    yearsServed: 0,
    automaticSkillsReceived: [],
    completedTerms: [],
    currentTerm: {
      number: 1, startAge: 18, plannedYears: 4, forcedSeparation: false,
      survival: { success: true }, commission: { success: true }, promotion: null,
      skillRolls: [], automaticBenefits: []
    }
  });

  const result = completeTerm(character);

  assert.equal(result.character.age, 22);
  assert.equal(result.character.terms, 1);
  assert.equal(result.character.yearsServed, 4);
  assert.equal(result.character.skills.Cutlass, 1);
  assert.equal(result.character.skills.Revolver, 1);
  assert.deepEqual(result.character.automaticSkillsReceived, [
    'marine-cutlass',
    'marine-lieutenant-revolver'
  ]);
  assert.equal(result.character.phase, CHARGEN_PHASES.REENLISTMENT_REQUIRED);
  assert.equal(result.character.currentTerm, null);
});

test('injury-rule separation completes a two-year partial term and goes to muster out', async () => {
  const { completeTerm } = await import('../index.js');
  const character = baseCharacter({
    service: 'scouts',
    age: 20,
    phase: CHARGEN_PHASES.TERM_COMPLETION_READY,
    skills: {},
    skillsDue: 0,
    yearsServed: 0,
    automaticSkillsReceived: [],
    completedTerms: [],
    currentTerm: {
      number: 1, startAge: 18, plannedYears: 2, forcedSeparation: true,
      survival: { success: false }, commission: null, promotion: null,
      skillRolls: [], automaticBenefits: []
    }
  });

  const result = completeTerm(character);
  assert.equal(result.character.age, 20);
  assert.equal(result.character.yearsServed, 2);
  assert.equal(result.character.skills.Pilot, 1);
  assert.equal(result.character.phase, CHARGEN_PHASES.MUSTER_OUT_REQUIRED);
});


test('a character already at the highest service rank is not offered another promotion', () => {
  const character = baseCharacter({
    service: 'navy',
    rank: 6,
    rankTitle: 'Admiral',
    phase: CHARGEN_PHASES.TERM_READY,
    characteristics: { STR: 7, DEX: 7, END: 7, INT: 8, EDU: 9, SOC: 9 }
  });

  const survived = resolveSurvival(beginTerm(character), {
    dice: createSequenceDice([2, 3])
  }).character;

  assert.equal(survived.phase, CHARGEN_PHASES.SKILLS_PENDING);
});

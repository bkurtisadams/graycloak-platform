import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CHARGEN_PHASES,
  ChargenStateError,
  agingRulesForAge,
  beginMusterOut,
  beginTerm,
  chooseMusterOut,
  chooseReenlistment,
  completeTerm,
  createCharacter,
  createSequenceDice,
  resolveAging,
  resolveAgingCrisis,
  resolveReenlistment,
  retirementPayForTerms,
  rollAcquiredSkill,
  rollMusterOutBenefit,
  rollMusterOutCash,
  resolveMusterBenefitSpecialization,
  attemptEnlistment,
  resolveSurvival
} from '../index.js';

function state(overrides = {}) {
  return {
    schemaVersion: 3,
    name: 'Test Traveller',
    age: 18,
    chronologicalAgeMonths: 18 * 12,
    physicalAgeMonths: 18 * 12,
    nextAgingCheckAgeMonths: 34 * 12,
    characteristics: { STR: 7, DEX: 7, END: 7, INT: 7, EDU: 7, SOC: 7 },
    upp: '777777',
    service: 'other',
    drafted: false,
    terms: 0,
    yearsServed: 0,
    rank: 0,
    rankTitle: '',
    skills: {},
    skillsDue: 0,
    pendingSkill: null,
    automaticSkillsReceived: [],
    completedTerms: [],
    pendingAgingChecks: [],
    pendingAgingCrises: [],
    postAgingPhase: null,
    credits: 0,
    materialBenefits: [],
    musterOut: null,
    pendingMusterBenefit: null,
    retired: false,
    retirementPayAnnual: 0,
    separationReason: null,
    alive: true,
    phase: CHARGEN_PHASES.TERM_READY,
    currentTerm: null,
    options: { survivalInjuryRule: false },
    history: [],
    ...overrides
  };
}

test('Scout service receives two acquired-skill eligibilities in every term', () => {
  const character = state({ service: 'scouts', terms: 1 });
  const term = beginTerm(character);
  assert.equal(term.currentTerm.number, 2);
  assert.equal(term.skillsDue, 2);
});

test('aging begins at physical age 34 and applies Book 1 saving throws', () => {
  const character = state({
    age: 30,
    chronologicalAgeMonths: 30 * 12,
    physicalAgeMonths: 30 * 12,
    terms: 3,
    yearsServed: 12,
    phase: CHARGEN_PHASES.TERM_COMPLETION_READY,
    currentTerm: {
      number: 4,
      startAge: 30,
      startChronologicalAgeMonths: 30 * 12,
      startPhysicalAgeMonths: 30 * 12,
      plannedYears: 4,
      forcedSeparation: false,
      survival: { success: true },
      commission: null,
      promotion: null,
      skillRolls: [],
      automaticBenefits: []
    }
  });

  const completed = completeTerm(character).character;
  assert.equal(completed.age, 34);
  assert.equal(completed.phase, CHARGEN_PHASES.AGING_REQUIRED);
  assert.deepEqual(completed.pendingAgingChecks, [34 * 12]);

  const aged = resolveAging(completed, {
    // STR 7 fails 8+, DEX 7 makes 7+, END 7 fails 8+.
    dice: createSequenceDice([3, 4, 4, 3, 3, 4])
  }).character;

  assert.equal(aged.characteristics.STR, 6);
  assert.equal(aged.characteristics.DEX, 7);
  assert.equal(aged.characteristics.END, 6);
  assert.equal(aged.upp, '676777');
  assert.equal(aged.phase, CHARGEN_PHASES.REENLISTMENT_REQUIRED);
});

test('aging bands change at ages 50 and 66 exactly as the Book 1 table specifies', () => {
  assert.deepEqual(agingRulesForAge(34).map(({ characteristic, loss, target }) => [characteristic, loss, target]), [
    ['STR', 1, 8], ['DEX', 1, 7], ['END', 1, 8]
  ]);
  assert.deepEqual(agingRulesForAge(50).map(({ characteristic, loss, target }) => [characteristic, loss, target]), [
    ['STR', 1, 9], ['DEX', 1, 8], ['END', 1, 9]
  ]);
  assert.deepEqual(agingRulesForAge(66).map(({ characteristic, loss, target }) => [characteristic, loss, target]), [
    ['STR', 2, 9], ['DEX', 2, 9], ['END', 2, 9], ['INT', 1, 9]
  ]);
});

test('a successful aging crisis restores the characteristic to 1 and slow drug adds physical age', () => {
  const character = state({
    age: 34,
    chronologicalAgeMonths: 34 * 12,
    physicalAgeMonths: 34 * 12,
    characteristics: { STR: 1, DEX: 7, END: 7, INT: 7, EDU: 7, SOC: 7 },
    upp: '177777',
    phase: CHARGEN_PHASES.AGING_REQUIRED,
    pendingAgingChecks: [34 * 12],
    postAgingPhase: CHARGEN_PHASES.REENLISTMENT_REQUIRED
  });

  const aged = resolveAging(character, {
    dice: createSequenceDice([1, 1, 6, 6, 6, 6])
  }).character;
  assert.equal(aged.characteristics.STR, 0);
  assert.equal(aged.phase, CHARGEN_PHASES.AGING_CRISIS_REQUIRED);

  const crisis = resolveAgingCrisis(aged, {
    dice: createSequenceDice([4, 4, 5]),
    medicalSkill: 0,
    slowDrug: true
  });

  assert.equal(crisis.success, true);
  assert.equal(crisis.recoveryMonths, 5);
  assert.equal(crisis.character.characteristics.STR, 1);
  assert.equal(crisis.character.physicalAgeMonths, 34 * 12 + 5);
  assert.equal(crisis.character.chronologicalAgeMonths, 34 * 12);
  assert.equal(crisis.character.phase, CHARGEN_PHASES.REENLISTMENT_REQUIRED);
});

test('failed aging-crisis saving throw kills the character', () => {
  const character = state({
    age: 34,
    characteristics: { STR: 0, DEX: 7, END: 7, INT: 7, EDU: 7, SOC: 7 },
    upp: '077777',
    phase: CHARGEN_PHASES.AGING_CRISIS_REQUIRED,
    pendingAgingCrises: [{ characteristic: 'STR', checkpointAge: 34, loss: 1 }],
    postAgingPhase: CHARGEN_PHASES.REENLISTMENT_REQUIRED
  });

  const result = resolveAgingCrisis(character, {
    dice: createSequenceDice([3, 4]),
    medicalSkill: 0
  });

  assert.equal(result.success, false);
  assert.equal(result.character.alive, false);
  assert.equal(result.character.phase, CHARGEN_PHASES.DEAD);
});

test('reenlistment exact 12 is mandatory, including after the seventh term', () => {
  const character = state({
    service: 'navy',
    terms: 7,
    age: 46,
    phase: CHARGEN_PHASES.REENLISTMENT_REQUIRED
  });

  const result = resolveReenlistment(character, { dice: createSequenceDice([6, 6]) });
  assert.equal(result.check.roll, 12);
  assert.equal(result.check.mandatory, true);
  assert.equal(result.character.phase, CHARGEN_PHASES.TERM_READY);
  assert.equal(result.character.retired, false);
});

test('non-mandatory reenlistment after the seventh term results in retirement', () => {
  const character = state({
    service: 'navy',
    terms: 7,
    age: 46,
    phase: CHARGEN_PHASES.REENLISTMENT_REQUIRED
  });

  const result = resolveReenlistment(character, { dice: createSequenceDice([4, 4]) });
  assert.equal(result.check.success, true);
  assert.equal(result.check.mandatory, false);
  assert.equal(result.character.phase, CHARGEN_PHASES.MUSTER_OUT_REQUIRED);
  assert.equal(result.character.retired, true);
  assert.equal(result.character.retirementPayAnnual, 8000);
  assert.equal(result.character.separationReason, 'mandatory-retirement');
});

test('successful ordinary reenlistment leaves the continue-or-muster choice to the player', () => {
  const character = state({
    service: 'navy',
    terms: 2,
    phase: CHARGEN_PHASES.REENLISTMENT_REQUIRED
  });
  const eligible = resolveReenlistment(character, { dice: createSequenceDice([3, 3]) }).character;
  assert.equal(eligible.phase, CHARGEN_PHASES.REENLISTMENT_DECISION);

  assert.equal(chooseReenlistment(eligible).phase, CHARGEN_PHASES.TERM_READY);
  assert.equal(chooseMusterOut(eligible).phase, CHARGEN_PHASES.MUSTER_OUT_REQUIRED);
});

test('retirement pay starts after five terms and adds Cr2000 beyond the eighth', () => {
  assert.equal(retirementPayForTerms(4), 0);
  assert.equal(retirementPayForTerms(5), 4000);
  assert.equal(retirementPayForTerms(6), 6000);
  assert.equal(retirementPayForTerms(7), 8000);
  assert.equal(retirementPayForTerms(8), 10000);
  assert.equal(retirementPayForTerms(9), 12000);
  assert.equal(retirementPayForTerms(10), 14000);
});

test('Gambling-1 adds +1 to cash rolls and the cash table is limited to three rolls', () => {
  let character = state({
    service: 'other',
    terms: 4,
    skills: { Gambling: 1 },
    phase: CHARGEN_PHASES.MUSTER_OUT_REQUIRED
  });
  character = beginMusterOut(character);
  assert.equal(character.musterOut.totalRolls, 4);

  let result = rollMusterOutCash(character, { dice: createSequenceDice([6]) });
  character = result.character;
  assert.equal(result.dm, 1);
  assert.equal(result.total, 7);
  assert.equal(result.amount, 100000);

  character = rollMusterOutCash(character, { dice: createSequenceDice([1]) }).character;
  character = rollMusterOutCash(character, { dice: createSequenceDice([1]) }).character;

  const unusedDice = createSequenceDice([6]);
  assert.throws(
    () => rollMusterOutCash(character, { dice: unusedDice }),
    ChargenStateError
  );
  assert.equal(unusedDice.remaining(), 1);
  assert.equal(character.musterOut.remainingRolls, 1);
});

test('rank 5 or 6 adds +1 on the material benefits table', () => {
  let character = state({
    service: 'navy',
    terms: 1,
    rank: 5,
    rankTitle: 'Captain',
    phase: CHARGEN_PHASES.MUSTER_OUT_REQUIRED
  });
  character = beginMusterOut(character);
  const result = rollMusterOutBenefit(character, { dice: createSequenceDice([6]) });
  assert.equal(result.dm, 1);
  assert.equal(result.total, 7);
  assert.equal(result.character.characteristics.SOC, 9);
});

test('first Gun/Blade muster benefit is a weapon; an additional one may become skill', () => {
  let character = state({
    service: 'army',
    terms: 2,
    phase: CHARGEN_PHASES.MUSTER_OUT_REQUIRED
  });
  character = beginMusterOut(character);

  character = rollMusterOutBenefit(character, { dice: createSequenceDice([4]) }).character;
  assert.equal(character.phase, CHARGEN_PHASES.MUSTER_BENEFIT_SPECIALIZATION_REQUIRED);
  assert.throws(
    () => resolveMusterBenefitSpecialization(character, { specialization: 'Rifle', asSkill: true }),
    ChargenStateError
  );

  character = resolveMusterBenefitSpecialization(character, { specialization: 'Rifle' }).character;
  assert.equal(character.materialBenefits[0].specialization, 'Rifle');

  character = rollMusterOutBenefit(character, { dice: createSequenceDice([4]) }).character;
  character = resolveMusterBenefitSpecialization(character, {
    specialization: 'Laser Rifle',
    asSkill: true
  }).character;

  assert.equal(character.skills['Laser Rifle'], 1);
  assert.equal(character.phase, CHARGEN_PHASES.COMPLETE);
});

test('golden path: a deterministic Book 1 career reaches a complete final character', () => {
  // Initial UPP 777777.
  let character = createCharacter({
    name: 'Avery',
    dice: createSequenceDice([3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4])
  });

  character = attemptEnlistment(character, 'other', {
    dice: createSequenceDice([1, 2])
  }).character;
  character = beginTerm(character);
  character = resolveSurvival(character, {
    dice: createSequenceDice([2, 3])
  }).character;

  character = rollAcquiredSkill(character, 'personal-development', {
    dice: createSequenceDice([1])
  }).character;
  character = rollAcquiredSkill(character, 'service-skills', {
    dice: createSequenceDice([2])
  }).character;
  character = completeTerm(character).character;

  assert.equal(character.age, 22);
  assert.equal(character.phase, CHARGEN_PHASES.REENLISTMENT_REQUIRED);

  character = resolveReenlistment(character, {
    dice: createSequenceDice([1, 1])
  }).character;
  assert.equal(character.phase, CHARGEN_PHASES.MUSTER_OUT_REQUIRED);

  character = beginMusterOut(character);
  character = rollMusterOutBenefit(character, {
    dice: createSequenceDice([1])
  }).character;

  assert.equal(character.phase, CHARGEN_PHASES.COMPLETE);
  assert.equal(character.age, 22);
  assert.equal(character.terms, 1);
  assert.equal(character.credits, 0);
  assert.equal(character.characteristics.STR, 8);
  assert.equal(character.skills.Gambling, 1);
  assert.equal(character.materialBenefits[0].name, 'Low Passage');
  assert.equal(character.alive, true);
  assert.equal(character.history.at(-1).type, 'chargen-complete');
  assert.deepEqual(JSON.parse(JSON.stringify(character)), character);
});

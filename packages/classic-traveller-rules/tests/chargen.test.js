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

  // Scouts service skills roll 4 is Mechanical in the 1977 printing; roll 3 is
  // Navigation. v1.219.00 corrected the column, so the repeated skill here is
  // Mechanical.
  character = rollAcquiredSkill(character, 'service-skills', {
    dice: createSequenceDice([4])
  }).character;
  character = rollAcquiredSkill(character, 'service-skills', {
    dice: createSequenceDice([4])
  }).character;

  assert.equal(character.skills.Mechanical, 2);
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

  // Army service skills roll 5 is Gun Combat in the 1977 printing; roll 3 is
  // Forward Observer, which needs no choice.
  const rolled = rollAcquiredSkill(character, 'service-skills', {
    dice: createSequenceDice([5])
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

// ---------------------------------------------------------------------------
// v1.219.00: written from the 1977 printing rather than from the code, which
// is how 32 wrong table entries and four wrong rules survived 62 green tests.
// ---------------------------------------------------------------------------

test('Book 1 p.4: characteristics stay between 1 and 15', async () => {
  const { rollAcquiredSkill } = await import('../index.js');
  // Navy personal development roll 1 is +1 STR, so a STR 15 has nowhere to go.
  let character = baseCharacter({
    service: 'navy',
    phase: CHARGEN_PHASES.SKILLS_PENDING,
    skillsDue: 1,
    skills: {},
    characteristics: { STR: 15, DEX: 7, END: 7, INT: 7, EDU: 7, SOC: 7 },
    currentTerm: {
      number: 1, startAge: 18, plannedYears: 4, forcedSeparation: false,
      survival: null, commission: null, promotion: null, skillRolls: [], automaticBenefits: []
    }
  });
  character = rollAcquiredSkill(character, 'personal-development', { dice: createSequenceDice([1]) }).character;
  // "Characteristics (for player-characters) may never exceed 15." It used to
  // reach 16 and encode as G.
  assert.equal(character.characteristics.STR, 15);
  assert.ok(!character.upp.includes('G'));

  // Other personal development roll 6 is -1 SOC, and 1 is the floor: values
  // "do not go below 1 except for calamitous injury or aging".
  let low = baseCharacter({
    service: 'other',
    phase: CHARGEN_PHASES.SKILLS_PENDING,
    skillsDue: 1,
    skills: {},
    characteristics: { STR: 7, DEX: 7, END: 7, INT: 7, EDU: 7, SOC: 1 },
    currentTerm: {
      number: 1, startAge: 18, plannedYears: 4, forcedSeparation: false,
      survival: null, commission: null, promotion: null, skillRolls: [], automaticBenefits: []
    }
  });
  low = rollAcquiredSkill(low, 'personal-development', { dice: createSequenceDice([6]) }).character;
  assert.equal(low.characteristics.SOC, 1);
});

test('Book 1 p.10: Other survival takes +2 on Intelligence 9+', async () => {
  const { SERVICES, resolveSurvival } = await import('../index.js');
  // The prior service table's survival row reads "DM of +2 if", and Other's
  // entry is Intel 9+. It was +1, which killed a character on a raw 3 who
  // should have made the 5+.
  assert.deepEqual(SERVICES.other.survival.dms.map((entry) => [entry.characteristic, entry.minimum, entry.modifier]),
    [['INT', 9, 2]]);

  const character = baseCharacter({
    service: 'other',
    phase: CHARGEN_PHASES.SURVIVAL_REQUIRED,
    characteristics: { STR: 7, DEX: 7, END: 7, INT: 9, EDU: 7, SOC: 7 },
    currentTerm: {
      number: 1, startAge: 18, plannedYears: 4, forcedSeparation: false,
      survival: null, commission: null, promotion: null, skillRolls: [], automaticBenefits: []
    }
  });
  // A raw 3 plus 2 clears the target of 5.
  const survived = resolveSurvival(character, { dice: createSequenceDice([1, 2]) });
  assert.equal(survived.character.currentTerm.survival.total, 5);
  assert.equal(survived.character.currentTerm.survival.success, true);
  assert.equal(survived.outcome, 'survived');
});

test('Book 1 p.21: Scouts and Other draw no retirement pay', async () => {
  const { chooseMusterOut } = await import('../index.js');
  const separated = (service) => chooseMusterOut(baseCharacter({
    service,
    terms: 5,
    phase: CHARGEN_PHASES.REENLISTMENT_DECISION,
    reenlistment: { roll: 6, total: 6, allowed: true, mandatory: false }
  }));

  // "Retirement pay is not available to characters serving in the Scout or the
  // Other service." Both used to draw CR 4,000 a year after five terms.
  assert.equal(separated('scouts').retirementPayAnnual, 0);
  assert.equal(separated('other').retirementPayAnnual, 0);
  // Everyone else still does, and they are still retired for every other
  // purpose — only the pension is withheld.
  assert.equal(separated('navy').retirementPayAnnual, 4000);
  assert.equal(separated('scouts').retired, true);
});

// The serializer agreed with the old rule, not p.21's, so a retired Scout could
// be generated and then not saved ("retirementPayAnnual does not match
// completed terms"; Kurt, Nov 2026). Played through the public API: a Scout
// is driven to five terms and mustered out, then exported and made a document.
test('Book 1 p.21: a retired Scout survives export and the document (the validator reads the same rule)', async () => {
  const { createCharacter, getAvailableActions, performChargenAction, CHARGEN_ACTIONS, exportCharacter, createCharacterDocument, createDice } = await import('../index.js');
  // Fixed dice through the package's own factory: every d6 a 6, or a 1.
  const dieOf = (want) => createDice(() => (want - 0.5) / 6);
  const high = dieOf(6);
  const low = dieOf(1);
  // A 12 on reenlistment is mandatory (Book 1 p.6); an 8 reenlists and leaves the choice.
  const mid = dieOf(4);
  const roll = (character, action, payload = {}) => performChargenAction(character, action, { ...payload, dice: high }).character;
  let scout = null;
  // Keep rolling until a Scout reaches five terms, survives, and retires; high
  // dice enlist, survive and reenlist, so this takes one pass.
  for (let attempt = 0; attempt < 20 && !scout; attempt += 1) {
    let c = createCharacter({ name: 'Scout', dice: high });
    for (let step = 0; step < 400; step += 1) {
      const { phase, actions, choices } = getAvailableActions(c);
      if (phase === CHARGEN_PHASES.MUSTER_OUT_ROLLS_PENDING && choices.remainingRolls === 0) break;
      if (phase === CHARGEN_PHASES.COMPLETE || actions.length === 0) break;
      if (actions.includes(CHARGEN_ACTIONS.ATTEMPT_ENLISTMENT)) c = roll(c, CHARGEN_ACTIONS.ATTEMPT_ENLISTMENT, { service: 'scouts' });
      else if (actions.includes(CHARGEN_ACTIONS.ROLL_SKILL)) c = roll(c, CHARGEN_ACTIONS.ROLL_SKILL, { tableKey: choices.skillTables[0] });
      else if (actions.includes(CHARGEN_ACTIONS.RESOLVE_SKILL_SPECIALIZATION)) c = roll(c, CHARGEN_ACTIONS.RESOLVE_SKILL_SPECIALIZATION, { specialization: choices.specializations[0] });
      else if (actions.includes(CHARGEN_ACTIONS.ROLL_REENLISTMENT)) c = performChargenAction(c, CHARGEN_ACTIONS.ROLL_REENLISTMENT, { dice: mid }).character;
      else if (actions.includes(CHARGEN_ACTIONS.REENLIST) && c.terms < 5) c = roll(c, CHARGEN_ACTIONS.REENLIST);
      else if (actions.includes(CHARGEN_ACTIONS.MUSTER_OUT)) c = roll(c, CHARGEN_ACTIONS.MUSTER_OUT);
      else if (actions.includes(CHARGEN_ACTIONS.ROLL_MUSTER_CASH)) c = performChargenAction(c, CHARGEN_ACTIONS.ROLL_MUSTER_CASH, { dice: low }).character;
      else if (actions.includes(CHARGEN_ACTIONS.ROLL_MUSTER_BENEFIT)) c = performChargenAction(c, CHARGEN_ACTIONS.ROLL_MUSTER_BENEFIT, { dice: low }).character;
      else if (actions.includes(CHARGEN_ACTIONS.RESOLVE_MUSTER_BENEFIT_SPECIALIZATION)) c = roll(c, CHARGEN_ACTIONS.RESOLVE_MUSTER_BENEFIT_SPECIALIZATION, { specialization: choices.specializations[0] });
      else c = roll(c, actions[0]);
      if (!c.alive) break;
    }
    if (c.alive && c.service === 'scouts' && c.retired) scout = c;
  }
  assert.ok(scout, 'a five-term Scout retired');
  assert.equal(scout.terms >= 5, true);
  assert.equal(scout.retirementPayAnnual, 0, 'Book 1 p.21: no pension for a Scout');
  assert.doesNotThrow(() => exportCharacter(scout));
  assert.doesNotThrow(() => createCharacterDocument(scout));
  assert.throws(() => exportCharacter({ ...scout, retirementPayAnnual: 4000 }), /retirementPayAnnual/);
});

test('Book 1 p.7: a rank 5 or 6 character MAY add +1 to a benefit roll', async () => {
  const { rollMusterOutBenefit } = await import('../index.js');
  const captain = () => baseCharacter({
    service: 'navy',
    rank: 5,
    phase: CHARGEN_PHASES.MUSTER_OUT_ROLLS_PENDING,
    musterOut: { remainingRolls: 2, cashRolls: 0, benefitRolls: 0, results: [] }
  });

  // The +1 is available and applied by default.
  const taken = rollMusterOutBenefit(captain(), { dice: createSequenceDice([4]) }).character;
  const withDM = taken.musterOut.results.at(-1);
  assert.equal(withDM.dm, 1);
  assert.equal(withDM.total, 5);

  // But it is the player's option, and declining keeps the printed result.
  const declined = rollMusterOutBenefit(captain(), { dice: createSequenceDice([4]), applyRankDM: false }).character;
  const without = declined.musterOut.results.at(-1);
  assert.equal(without.dm, 0);
  assert.equal(without.total, 4);
  // Either way the record says what was available, so the choice is visible.
  assert.equal(without.availableDM, 1);
  assert.notDeepEqual(withDM.outcome, without.outcome);
});

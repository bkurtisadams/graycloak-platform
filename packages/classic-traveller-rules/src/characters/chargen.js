import { createDice, requireDice } from '../dice.js';
import { formatUPP, generateCharacteristics } from './upp.js';
import { calculateDM, getService, serviceForDraftRoll } from '../careers/services.js';
import {
  availableSkillTables,
  eligibleRankServiceBenefits,
  getAcquiredSkillOutcome,
  getSkillTable
} from '../skills/acquired-skills.js';
import {
  AGING_INTERVAL_MONTHS,
  AGING_START_MONTHS,
  agingRulesForAge
} from './aging.js';
import {
  benefitTableDM,
  cashTableDM,
  getMusterBenefitOutcome,
  getMusterCash,
  musterRollAllowance,
  retirementPayForTerms
} from '../careers/mustering-out.js';

export const CHARGEN_PHASES = Object.freeze({
  SERVICE_SELECTION: 'service-selection',
  DRAFT_REQUIRED: 'draft-required',
  TERM_READY: 'term-ready',
  SURVIVAL_REQUIRED: 'survival-required',
  COMMISSION_OPTION: 'commission-option',
  PROMOTION_OPTION: 'promotion-option',
  SKILLS_PENDING: 'skills-pending',
  SKILL_SPECIALIZATION_REQUIRED: 'skill-specialization-required',
  TERM_COMPLETION_READY: 'term-completion-ready',
  AGING_REQUIRED: 'aging-required',
  AGING_CRISIS_REQUIRED: 'aging-crisis-required',
  REENLISTMENT_REQUIRED: 'reenlistment-required',
  REENLISTMENT_DECISION: 'reenlistment-decision',
  MUSTER_OUT_REQUIRED: 'muster-out-required',
  MUSTER_OUT_ROLLS_PENDING: 'muster-out-rolls-pending',
  MUSTER_BENEFIT_SPECIALIZATION_REQUIRED: 'muster-benefit-specialization-required',
  COMPLETE: 'complete',
  DEAD: 'dead'
});

export class ChargenStateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ChargenStateError';
  }
}

function cloneCurrentTerm(currentTerm) {
  if (!currentTerm) return null;
  return {
    ...currentTerm,
    skillRolls: [...(currentTerm.skillRolls ?? [])],
    automaticBenefits: [...(currentTerm.automaticBenefits ?? [])]
  };
}

function cloneMusterOut(musterOut) {
  if (!musterOut) return null;
  return {
    ...musterOut,
    results: [...(musterOut.results ?? [])]
  };
}

function copyCharacter(character, patch = {}) {
  const sourceCurrentTerm = Object.hasOwn(patch, 'currentTerm')
    ? patch.currentTerm
    : character.currentTerm;
  const sourceCharacteristics = Object.hasOwn(patch, 'characteristics')
    ? patch.characteristics
    : character.characteristics;
  const sourceSkills = Object.hasOwn(patch, 'skills') ? patch.skills : character.skills;
  const sourceAutomaticSkills = Object.hasOwn(patch, 'automaticSkillsReceived')
    ? patch.automaticSkillsReceived
    : character.automaticSkillsReceived;
  const sourceCompletedTerms = Object.hasOwn(patch, 'completedTerms')
    ? patch.completedTerms
    : character.completedTerms;
  const sourceMaterialBenefits = Object.hasOwn(patch, 'materialBenefits')
    ? patch.materialBenefits
    : character.materialBenefits;
  const sourcePendingAgingChecks = Object.hasOwn(patch, 'pendingAgingChecks')
    ? patch.pendingAgingChecks
    : character.pendingAgingChecks;
  const sourcePendingAgingCrises = Object.hasOwn(patch, 'pendingAgingCrises')
    ? patch.pendingAgingCrises
    : character.pendingAgingCrises;
  const sourceMusterOut = Object.hasOwn(patch, 'musterOut') ? patch.musterOut : character.musterOut;

  return {
    ...character,
    ...patch,
    characteristics: { ...sourceCharacteristics },
    skills: { ...(sourceSkills ?? {}) },
    automaticSkillsReceived: [...(sourceAutomaticSkills ?? [])],
    completedTerms: [...(sourceCompletedTerms ?? [])],
    materialBenefits: [...(sourceMaterialBenefits ?? [])],
    pendingAgingChecks: [...(sourcePendingAgingChecks ?? [])],
    pendingAgingCrises: [...(sourcePendingAgingCrises ?? [])],
    history: [...(character.history ?? [])],
    options: { ...(character.options ?? {}), ...(patch.options ?? {}) },
    pendingSkill: Object.hasOwn(patch, 'pendingSkill')
      ? patch.pendingSkill
      : (character.pendingSkill ? { ...character.pendingSkill } : null),
    pendingMusterBenefit: Object.hasOwn(patch, 'pendingMusterBenefit')
      ? patch.pendingMusterBenefit
      : (character.pendingMusterBenefit ? { ...character.pendingMusterBenefit } : null),
    currentTerm: cloneCurrentTerm(sourceCurrentTerm),
    musterOut: cloneMusterOut(sourceMusterOut)
  };
}

function requirePhase(character, phase) {
  if (character.phase !== phase) {
    throw new ChargenStateError(`expected phase ${phase}; received ${character.phase}`);
  }
}

function serviceCheck(character, rule, dice) {
  requireDice(dice);
  const rolled = dice.roll2D6();
  const dm = calculateDM(character.characteristics, rule.dms ?? []);
  const total = rolled.total + dm;
  return {
    dice: rolled.dice,
    roll: rolled.total,
    dm,
    total,
    target: rule.target,
    success: total >= rule.target
  };
}

function historyEvent(type, character, details = {}) {
  return Object.freeze({ type, age: character.age, ...details });
}

function chronologicalMonths(character) {
  return character.chronologicalAgeMonths ?? Math.round((character.age ?? 18) * 12);
}

function physicalMonths(character) {
  return character.physicalAgeMonths ?? chronologicalMonths(character);
}

function ageInWholeYears(months) {
  return Math.floor(months / 12);
}

function nextAfterSurvival(character) {
  const service = getService(character.service);
  const commissioned = character.rank > 0;
  const commissionEligible = service.commission && !commissioned && !(character.drafted && character.currentTerm.number === 1);

  if (commissionEligible) {
    return CHARGEN_PHASES.COMMISSION_OPTION;
  }
  const maximumRank = service.ranks.length - 1;
  if (service.promotion && commissioned && character.rank < maximumRank) {
    return CHARGEN_PHASES.PROMOTION_OPTION;
  }
  return skillPhase(character.skillsDue);
}

function skillPhase(skillsDue) {
  return skillsDue > 0 ? CHARGEN_PHASES.SKILLS_PENDING : CHARGEN_PHASES.TERM_COMPLETION_READY;
}

function applyCharacteristic(next, characteristic, amount) {
  next.characteristics[characteristic] += amount;
  next.upp = formatUPP(next.characteristics);
}

function applySkill(next, name, amount = 1) {
  next.skills[name] = (next.skills[name] ?? 0) + amount;
}

function applyResolvedOutcome(next, outcome) {
  if (outcome.type === 'characteristic') {
    applyCharacteristic(next, outcome.characteristic, outcome.amount);
    return {
      type: outcome.type,
      characteristic: outcome.characteristic,
      amount: outcome.amount,
      newValue: next.characteristics[outcome.characteristic]
    };
  }

  if (outcome.type === 'skill') {
    applySkill(next, outcome.name, 1);
    return {
      type: outcome.type,
      name: outcome.name,
      level: next.skills[outcome.name]
    };
  }

  throw new ChargenStateError(`outcome ${outcome.type} requires further resolution`);
}

function recordSkillRoll(next, record) {
  if (!next.currentTerm) {
    throw new ChargenStateError('skill acquisition requires an active service term');
  }
  next.currentTerm.skillRolls.push(Object.freeze({ ...record }));
}

function applyRankServiceBenefits(next) {
  const applied = [];
  for (const benefit of eligibleRankServiceBenefits(next)) {
    const result = applyResolvedOutcome(next, benefit.outcome);
    next.automaticSkillsReceived.push(benefit.id);
    const record = Object.freeze({ id: benefit.id, label: benefit.label, result });
    next.currentTerm.automaticBenefits.push(record);
    applied.push(record);
  }
  return applied;
}

function baseSkillEligibility(serviceKey, termNumber) {
  // Book 1 exception: Scouts receive two skills every term, not merely in the first.
  if (serviceKey === 'scouts') return 2;
  return termNumber === 1 ? 2 : 1;
}

function markSeparated(next, reason) {
  next.separationReason = reason;
  next.retired = next.terms >= 5;
  next.retirementPayAnnual = retirementPayForTerms(next.terms);
  return next;
}

function routeAfterAging(next) {
  if (next.pendingAgingCrises.length > 0) {
    next.phase = CHARGEN_PHASES.AGING_CRISIS_REQUIRED;
    return;
  }
  if (next.pendingAgingChecks.length > 0) {
    next.phase = CHARGEN_PHASES.AGING_REQUIRED;
    return;
  }
  next.phase = next.postAgingPhase ?? CHARGEN_PHASES.REENLISTMENT_REQUIRED;
  next.postAgingPhase = null;
}

function finishMusterOutIfComplete(next) {
  if (!next.musterOut || next.musterOut.remainingRolls > 0 || next.pendingMusterBenefit) return;
  next.phase = CHARGEN_PHASES.COMPLETE;
  if (!next.history.some((event) => event.type === 'chargen-complete')) {
    next.history.push(Object.freeze({
      type: 'chargen-complete',
      age: next.age,
      service: next.service,
      terms: next.terms,
      rank: next.rank,
      rankTitle: next.rankTitle,
      credits: next.credits,
      retirementPayAnnual: next.retirementPayAnnual,
      upp: next.upp
    }));
  }
}

export function createCharacter({
  name = '',
  dice = createDice(),
  survivalInjuryRule = false
} = {}) {
  const characteristics = generateCharacteristics({ dice });
  const upp = formatUPP(characteristics);
  const startingMonths = 18 * 12;

  return {
    schemaVersion: 3,
    name,
    age: 18,
    chronologicalAgeMonths: startingMonths,
    physicalAgeMonths: startingMonths,
    nextAgingCheckAgeMonths: AGING_START_MONTHS,
    characteristics,
    upp,
    service: null,
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
    phase: CHARGEN_PHASES.SERVICE_SELECTION,
    currentTerm: null,
    options: {
      survivalInjuryRule: Boolean(survivalInjuryRule)
    },
    history: [Object.freeze({ type: 'character-created', age: 18, upp })]
  };
}

export function attemptEnlistment(character, serviceKey, { dice = createDice() } = {}) {
  requirePhase(character, CHARGEN_PHASES.SERVICE_SELECTION);
  if (character.age !== 18) {
    throw new ChargenStateError('Classic Traveller enlistment is only available at age 18');
  }

  const service = getService(serviceKey);
  const check = serviceCheck(character, service.enlistment, dice);
  const next = copyCharacter(character, {
    service: check.success ? service.key : null,
    drafted: false,
    phase: check.success ? CHARGEN_PHASES.TERM_READY : CHARGEN_PHASES.DRAFT_REQUIRED
  });

  next.history.push(historyEvent('enlistment', character, {
    service: service.key,
    ...check
  }));

  return { character: next, check };
}

export function resolveDraft(character, { dice = createDice() } = {}) {
  requirePhase(character, CHARGEN_PHASES.DRAFT_REQUIRED);
  requireDice(dice);

  const roll = dice.rollD6();
  const service = serviceForDraftRoll(roll);
  const next = copyCharacter(character, {
    service: service.key,
    drafted: true,
    phase: CHARGEN_PHASES.TERM_READY
  });

  next.history.push(historyEvent('draft', character, {
    roll,
    service: service.key
  }));

  return { character: next, roll, service: service.key };
}

export function beginTerm(character) {
  requirePhase(character, CHARGEN_PHASES.TERM_READY);
  if (!character.service) {
    throw new ChargenStateError('cannot begin a term without a service');
  }

  const termNumber = character.terms + 1;
  const next = copyCharacter(character, {
    phase: CHARGEN_PHASES.SURVIVAL_REQUIRED,
    skillsDue: baseSkillEligibility(character.service, termNumber),
    pendingSkill: null,
    currentTerm: {
      number: termNumber,
      startAge: character.age,
      startChronologicalAgeMonths: chronologicalMonths(character),
      startPhysicalAgeMonths: physicalMonths(character),
      plannedYears: 4,
      forcedSeparation: false,
      survival: null,
      commission: null,
      promotion: null,
      skillRolls: [],
      automaticBenefits: []
    }
  });

  next.history.push(historyEvent('term-start', character, {
    term: termNumber,
    service: character.service,
    drafted: character.drafted
  }));

  return next;
}

export function resolveSurvival(character, { dice = createDice() } = {}) {
  requirePhase(character, CHARGEN_PHASES.SURVIVAL_REQUIRED);
  const service = getService(character.service);
  const check = serviceCheck(character, service.survival, dice);
  const next = copyCharacter(character);
  next.currentTerm.survival = check;

  if (!check.success && !character.options.survivalInjuryRule) {
    next.alive = false;
    next.phase = CHARGEN_PHASES.DEAD;
    next.history.push(historyEvent('survival', character, {
      term: character.currentTerm.number,
      service: character.service,
      ...check,
      outcome: 'death'
    }));
    return { character: next, check, outcome: 'death' };
  }

  if (!check.success && character.options.survivalInjuryRule) {
    const endChronological = (next.currentTerm.startChronologicalAgeMonths ?? Math.round(next.currentTerm.startAge * 12)) + 24;
    const endPhysical = (next.currentTerm.startPhysicalAgeMonths ?? Math.round(next.currentTerm.startAge * 12)) + 24;
    next.age = ageInWholeYears(endChronological);
    next.chronologicalAgeMonths = endChronological;
    next.physicalAgeMonths = endPhysical;
    next.phase = skillPhase(next.skillsDue);
    next.currentTerm.plannedYears = 2;
    next.currentTerm.forcedSeparation = true;
    next.history.push(historyEvent('survival', character, {
      term: character.currentTerm.number,
      service: character.service,
      ...check,
      outcome: 'injury'
    }));
    return { character: next, check, outcome: 'injury' };
  }

  next.phase = nextAfterSurvival(next);
  next.history.push(historyEvent('survival', character, {
    term: character.currentTerm.number,
    service: character.service,
    ...check,
    outcome: 'survived'
  }));

  return { character: next, check, outcome: 'survived' };
}

export function resolveCommission(character, { dice = createDice() } = {}) {
  requirePhase(character, CHARGEN_PHASES.COMMISSION_OPTION);
  const service = getService(character.service);
  if (!service.commission) {
    throw new ChargenStateError(`${service.name} does not use commissions`);
  }

  const check = serviceCheck(character, service.commission, dice);
  const next = copyCharacter(character);
  next.currentTerm.commission = check;

  if (check.success) {
    next.rank = 1;
    next.rankTitle = service.ranks[1] ?? '';
    next.skillsDue += 1;
    next.phase = service.promotion ? CHARGEN_PHASES.PROMOTION_OPTION : skillPhase(next.skillsDue);
  } else {
    next.phase = skillPhase(next.skillsDue);
  }

  next.history.push(historyEvent('commission', character, {
    term: character.currentTerm.number,
    service: character.service,
    ...check,
    rank: next.rank,
    rankTitle: next.rankTitle
  }));

  return { character: next, check };
}

export function skipCommission(character) {
  requirePhase(character, CHARGEN_PHASES.COMMISSION_OPTION);
  const next = copyCharacter(character, { phase: skillPhase(character.skillsDue) });
  next.history.push(historyEvent('commission-skipped', character, {
    term: character.currentTerm.number,
    service: character.service
  }));
  return next;
}

export function resolvePromotion(character, { dice = createDice() } = {}) {
  requirePhase(character, CHARGEN_PHASES.PROMOTION_OPTION);
  const service = getService(character.service);
  const maximumRank = service.ranks.length - 1;
  if (!service.promotion || character.rank < 1 || character.rank >= maximumRank) {
    throw new ChargenStateError(`${service.name} character is not eligible for promotion`);
  }

  const check = serviceCheck(character, service.promotion, dice);
  const next = copyCharacter(character);
  next.currentTerm.promotion = check;

  if (check.success) {
    const maxRank = service.ranks.length - 1;
    next.rank = Math.min(character.rank + 1, maxRank);
    next.rankTitle = service.ranks[next.rank] ?? '';
    next.skillsDue += 1;
  }
  next.phase = skillPhase(next.skillsDue);

  next.history.push(historyEvent('promotion', character, {
    term: character.currentTerm.number,
    service: character.service,
    ...check,
    rank: next.rank,
    rankTitle: next.rankTitle
  }));

  return { character: next, check };
}

export function skipPromotion(character) {
  requirePhase(character, CHARGEN_PHASES.PROMOTION_OPTION);
  const next = copyCharacter(character, { phase: skillPhase(character.skillsDue) });
  next.history.push(historyEvent('promotion-skipped', character, {
    term: character.currentTerm.number,
    service: character.service,
    rank: character.rank
  }));
  return next;
}

export function rollAcquiredSkill(character, tableKey, { dice = createDice() } = {}) {
  requirePhase(character, CHARGEN_PHASES.SKILLS_PENDING);
  if (!character.currentTerm || character.skillsDue < 1) {
    throw new ChargenStateError('no acquired-skill eligibility remains in the current term');
  }

  requireDice(dice);
  const table = getSkillTable(tableKey);
  if (!availableSkillTables(character).includes(tableKey)) {
    throw new ChargenStateError(`${table.name} is not available with EDU ${character.characteristics.EDU}`);
  }

  // The table is supplied before this die roll, preserving the Book 1 order.
  const roll = dice.rollD6();
  const outcome = getAcquiredSkillOutcome(character.service, tableKey, roll);
  const next = copyCharacter(character, { skillsDue: character.skillsDue - 1 });

  const baseRecord = {
    table: tableKey,
    tableName: table.name,
    roll,
    outcome: { ...outcome }
  };

  if (outcome.type === 'specialization') {
    next.pendingSkill = {
      table: tableKey,
      roll,
      name: outcome.name,
      specializationType: outcome.specializationType
    };
    next.phase = CHARGEN_PHASES.SKILL_SPECIALIZATION_REQUIRED;
    recordSkillRoll(next, { ...baseRecord, pending: true });
    next.history.push(historyEvent('skill-roll', character, {
      term: character.currentTerm.number,
      service: character.service,
      ...baseRecord,
      pendingSpecialization: outcome.specializationType,
      skillsDue: next.skillsDue
    }));
    return { character: next, roll, outcome, pendingSpecialization: true };
  }

  const result = applyResolvedOutcome(next, outcome);
  next.phase = skillPhase(next.skillsDue);
  recordSkillRoll(next, { ...baseRecord, pending: false, result });
  next.history.push(historyEvent('skill-roll', character, {
    term: character.currentTerm.number,
    service: character.service,
    ...baseRecord,
    result,
    skillsDue: next.skillsDue
  }));

  return { character: next, roll, outcome, result, pendingSpecialization: false };
}

export function resolveSkillSpecialization(character, specialization) {
  requirePhase(character, CHARGEN_PHASES.SKILL_SPECIALIZATION_REQUIRED);
  const choice = String(specialization ?? '').trim();
  if (!choice) {
    throw new ChargenStateError('a specific weapon or vehicle expertise must be selected');
  }
  if (!character.pendingSkill) {
    throw new ChargenStateError('no acquired skill is awaiting specialization');
  }

  const next = copyCharacter(character);
  applySkill(next, choice, 1);
  const resolved = {
    source: next.pendingSkill.name,
    specializationType: next.pendingSkill.specializationType,
    specialization: choice,
    level: next.skills[choice]
  };
  next.pendingSkill = null;
  next.phase = skillPhase(next.skillsDue);

  const rolls = next.currentTerm?.skillRolls ?? [];
  if (rolls.length > 0 && rolls[rolls.length - 1].pending) {
    rolls[rolls.length - 1] = Object.freeze({
      ...rolls[rolls.length - 1],
      pending: false,
      specialization: resolved
    });
  }

  next.history.push(historyEvent('skill-specialization', character, {
    term: character.currentTerm.number,
    service: character.service,
    ...resolved,
    skillsDue: next.skillsDue
  }));

  return { character: next, result: resolved };
}

export function completeTerm(character) {
  requirePhase(character, CHARGEN_PHASES.TERM_COMPLETION_READY);
  if (!character.currentTerm) {
    throw new ChargenStateError('cannot complete a term without an active term');
  }
  if (character.skillsDue !== 0 || character.pendingSkill) {
    throw new ChargenStateError('all acquired-skill eligibility must be resolved before completing the term');
  }

  const next = copyCharacter(character);
  const startChronological = next.currentTerm.startChronologicalAgeMonths
    ?? Math.round(next.currentTerm.startAge * 12);
  const startPhysical = next.currentTerm.startPhysicalAgeMonths
    ?? Math.round(next.currentTerm.startAge * 12);
  const elapsedMonths = next.currentTerm.plannedYears * 12;
  const endingChronological = startChronological + elapsedMonths;
  const endingPhysical = startPhysical + elapsedMonths;

  next.chronologicalAgeMonths = endingChronological;
  next.physicalAgeMonths = endingPhysical;
  next.age = ageInWholeYears(endingChronological);

  const automaticBenefits = applyRankServiceBenefits(next);
  const completedTerm = Object.freeze({
    ...cloneCurrentTerm(next.currentTerm),
    endAge: next.age,
    endChronologicalAgeMonths: endingChronological,
    endPhysicalAgeMonths: endingPhysical,
    endingRank: next.rank,
    endingRankTitle: next.rankTitle
  });

  next.completedTerms.push(completedTerm);
  next.terms = character.terms + 1;
  next.yearsServed = (character.yearsServed ?? 0) + next.currentTerm.plannedYears;

  const normalPostTermPhase = next.currentTerm.forcedSeparation
    ? CHARGEN_PHASES.MUSTER_OUT_REQUIRED
    : CHARGEN_PHASES.REENLISTMENT_REQUIRED;
  if (next.currentTerm.forcedSeparation) {
    markSeparated(next, 'injury');
  }

  const pendingAgingChecks = [];
  let nextAgingCheck = character.nextAgingCheckAgeMonths ?? AGING_START_MONTHS;
  while (nextAgingCheck <= endingPhysical) {
    pendingAgingChecks.push(nextAgingCheck);
    nextAgingCheck += AGING_INTERVAL_MONTHS;
  }
  next.nextAgingCheckAgeMonths = nextAgingCheck;
  next.pendingAgingChecks = pendingAgingChecks;
  next.pendingAgingCrises = [];
  next.postAgingPhase = pendingAgingChecks.length > 0 ? normalPostTermPhase : null;
  next.phase = pendingAgingChecks.length > 0 ? CHARGEN_PHASES.AGING_REQUIRED : normalPostTermPhase;
  next.currentTerm = null;

  next.history.push(Object.freeze({
    type: 'term-complete',
    age: next.age,
    term: completedTerm.number,
    service: character.service,
    yearsServed: completedTerm.plannedYears,
    rank: next.rank,
    rankTitle: next.rankTitle,
    automaticBenefits,
    forcedSeparation: completedTerm.forcedSeparation,
    agingChecksDue: pendingAgingChecks.map((months) => ageInWholeYears(months))
  }));

  return { character: next, term: completedTerm, automaticBenefits };
}

export function resolveAging(character, { dice = createDice() } = {}) {
  requirePhase(character, CHARGEN_PHASES.AGING_REQUIRED);
  if (!character.pendingAgingChecks?.length) {
    throw new ChargenStateError('no aging check is pending');
  }
  requireDice(dice);

  const checkpointMonths = character.pendingAgingChecks[0];
  const checkpointAge = ageInWholeYears(checkpointMonths);
  const rules = agingRulesForAge(checkpointAge);
  const next = copyCharacter(character, {
    pendingAgingChecks: character.pendingAgingChecks.slice(1),
    pendingAgingCrises: []
  });
  const checks = [];

  for (const rule of rules) {
    const rolled = dice.roll2D6();
    const success = rolled.total >= rule.target;
    const before = next.characteristics[rule.characteristic];
    let after = before;

    if (!success) {
      after = Math.max(0, before - rule.loss);
      next.characteristics[rule.characteristic] = after;
      next.upp = formatUPP(next.characteristics);
      if (after === 0) {
        next.pendingAgingCrises.push(Object.freeze({
          characteristic: rule.characteristic,
          checkpointAge,
          loss: rule.loss
        }));
      }
    }

    checks.push(Object.freeze({
      characteristic: rule.characteristic,
      dice: rolled.dice,
      roll: rolled.total,
      target: rule.target,
      success,
      loss: success ? 0 : rule.loss,
      before,
      after
    }));
  }

  routeAfterAging(next);
  next.history.push(Object.freeze({
    type: 'aging',
    age: next.age,
    physicalAge: checkpointAge,
    checks,
    crises: [...next.pendingAgingCrises]
  }));

  return { character: next, checkpointAge, checks };
}

export function resolveAgingCrisis(character, {
  dice = createDice(),
  medicalSkill = 0,
  slowDrug = true
} = {}) {
  requirePhase(character, CHARGEN_PHASES.AGING_CRISIS_REQUIRED);
  if (!character.pendingAgingCrises?.length) {
    throw new ChargenStateError('no aging crisis is pending');
  }
  if (!Number.isInteger(medicalSkill) || medicalSkill < 0) {
    throw new RangeError(`medicalSkill must be a non-negative integer; received ${medicalSkill}`);
  }
  requireDice(dice);

  const crisis = character.pendingAgingCrises[0];
  const rolled = dice.roll2D6();
  const total = rolled.total + medicalSkill;
  const success = total >= 8;
  const next = copyCharacter(character, {
    pendingAgingCrises: character.pendingAgingCrises.slice(1)
  });

  if (!success) {
    next.alive = false;
    next.phase = CHARGEN_PHASES.DEAD;
    next.history.push(Object.freeze({
      type: 'aging-crisis',
      age: next.age,
      characteristic: crisis.characteristic,
      dice: rolled.dice,
      roll: rolled.total,
      medicalSkill,
      total,
      target: 8,
      success: false,
      outcome: 'death'
    }));
    return { character: next, success: false, crisis, recoveryMonths: 0 };
  }

  const recoveryMonths = dice.rollD6();
  next.characteristics[crisis.characteristic] = 1;
  next.upp = formatUPP(next.characteristics);
  next.physicalAgeMonths = physicalMonths(next) + recoveryMonths;
  if (!slowDrug) {
    next.chronologicalAgeMonths = chronologicalMonths(next) + recoveryMonths;
    next.age = ageInWholeYears(next.chronologicalAgeMonths);
  }

  routeAfterAging(next);
  next.history.push(Object.freeze({
    type: 'aging-crisis',
    age: next.age,
    characteristic: crisis.characteristic,
    dice: rolled.dice,
    roll: rolled.total,
    medicalSkill,
    total,
    target: 8,
    success: true,
    outcome: 'survived',
    slowDrug: Boolean(slowDrug),
    recoveryMonths,
    restoredTo: 1
  }));

  return { character: next, success: true, crisis, recoveryMonths };
}

export function resolveReenlistment(character, { dice = createDice() } = {}) {
  requirePhase(character, CHARGEN_PHASES.REENLISTMENT_REQUIRED);
  requireDice(dice);
  const service = getService(character.service);
  const rolled = dice.roll2D6();
  const mandatory = rolled.total === 12;
  const success = rolled.total >= service.reenlistment.target;
  const check = Object.freeze({
    dice: rolled.dice,
    roll: rolled.total,
    target: service.reenlistment.target,
    success,
    mandatory
  });
  const next = copyCharacter(character);

  if (mandatory) {
    next.phase = CHARGEN_PHASES.TERM_READY;
    next.separationReason = null;
  } else if (!success) {
    next.phase = CHARGEN_PHASES.MUSTER_OUT_REQUIRED;
    markSeparated(next, 'reenlistment-denied');
  } else if (next.terms >= 7) {
    next.phase = CHARGEN_PHASES.MUSTER_OUT_REQUIRED;
    markSeparated(next, 'mandatory-retirement');
  } else {
    next.phase = CHARGEN_PHASES.REENLISTMENT_DECISION;
  }

  next.history.push(Object.freeze({
    type: 'reenlistment',
    age: next.age,
    service: next.service,
    term: next.terms,
    ...check,
    outcome: mandatory
      ? 'mandatory-service'
      : !success
        ? 'denied'
        : next.terms >= 7
          ? 'retirement'
          : 'eligible'
  }));

  return { character: next, check };
}

export function chooseReenlistment(character) {
  requirePhase(character, CHARGEN_PHASES.REENLISTMENT_DECISION);
  const next = copyCharacter(character, {
    phase: CHARGEN_PHASES.TERM_READY,
    separationReason: null
  });
  next.history.push(historyEvent('reenlistment-choice', character, {
    choice: 'reenlist'
  }));
  return next;
}

export function chooseMusterOut(character) {
  requirePhase(character, CHARGEN_PHASES.REENLISTMENT_DECISION);
  const next = copyCharacter(character, { phase: CHARGEN_PHASES.MUSTER_OUT_REQUIRED });
  markSeparated(next, 'voluntary');
  next.history.push(historyEvent('reenlistment-choice', character, {
    choice: 'muster-out',
    retired: next.retired,
    retirementPayAnnual: next.retirementPayAnnual
  }));
  return next;
}

export function beginMusterOut(character) {
  requirePhase(character, CHARGEN_PHASES.MUSTER_OUT_REQUIRED);
  const next = copyCharacter(character);
  if (next.terms >= 5 && !next.retired) {
    next.retired = true;
    next.retirementPayAnnual = retirementPayForTerms(next.terms);
  }

  const allowance = musterRollAllowance(next.terms, next.rank);
  next.musterOut = {
    totalRolls: allowance.total,
    remainingRolls: allowance.total,
    rankBonusRolls: allowance.rankBonus,
    cashRolls: 0,
    benefitRolls: 0,
    cashReceived: 0,
    results: []
  };
  next.phase = allowance.total > 0
    ? CHARGEN_PHASES.MUSTER_OUT_ROLLS_PENDING
    : CHARGEN_PHASES.COMPLETE;

  next.history.push(historyEvent('muster-out-start', character, {
    terms: next.terms,
    rank: next.rank,
    totalRolls: allowance.total,
    rankBonusRolls: allowance.rankBonus,
    retired: next.retired,
    retirementPayAnnual: next.retirementPayAnnual
  }));
  finishMusterOutIfComplete(next);
  return next;
}

export function rollMusterOutCash(character, { dice = createDice() } = {}) {
  requirePhase(character, CHARGEN_PHASES.MUSTER_OUT_ROLLS_PENDING);
  if (!character.musterOut || character.musterOut.remainingRolls < 1) {
    throw new ChargenStateError('no mustering-out rolls remain');
  }
  if (character.musterOut.cashRolls >= 3) {
    throw new ChargenStateError('the cash table may be consulted no more than three times');
  }
  requireDice(dice);

  const roll = dice.rollD6();
  const dm = cashTableDM(character.skills);
  const total = roll + dm;
  const amount = getMusterCash(character.service, total);
  const next = copyCharacter(character);
  next.credits = (character.credits ?? 0) + amount;
  next.musterOut.remainingRolls -= 1;
  next.musterOut.cashRolls += 1;
  next.musterOut.cashReceived += amount;
  const record = Object.freeze({ type: 'cash', roll, dm, total, amount });
  next.musterOut.results.push(record);

  next.history.push(historyEvent('muster-out-cash', character, record));
  finishMusterOutIfComplete(next);
  return { character: next, roll, dm, total, amount };
}

export function rollMusterOutBenefit(character, { dice = createDice() } = {}) {
  requirePhase(character, CHARGEN_PHASES.MUSTER_OUT_ROLLS_PENDING);
  if (!character.musterOut || character.musterOut.remainingRolls < 1) {
    throw new ChargenStateError('no mustering-out rolls remain');
  }
  requireDice(dice);

  const roll = dice.rollD6();
  const dm = benefitTableDM(character.rank);
  const total = roll + dm;
  const outcome = getMusterBenefitOutcome(character.service, total);
  const next = copyCharacter(character);
  next.musterOut.remainingRolls -= 1;
  next.musterOut.benefitRolls += 1;

  const recordIndex = next.musterOut.results.length;
  const baseRecord = { type: 'benefit', roll, dm, total, outcome: { ...outcome } };

  if (outcome.type === 'weapon') {
    next.pendingMusterBenefit = {
      category: outcome.category,
      resultIndex: recordIndex
    };
    next.musterOut.results.push(Object.freeze({ ...baseRecord, pending: true }));
    next.phase = CHARGEN_PHASES.MUSTER_BENEFIT_SPECIALIZATION_REQUIRED;
    next.history.push(historyEvent('muster-out-benefit', character, {
      ...baseRecord,
      pendingSpecialization: outcome.category
    }));
    return { character: next, roll, dm, total, outcome, pendingSpecialization: true };
  }

  let result = null;
  if (outcome.type === 'characteristic') {
    applyCharacteristic(next, outcome.characteristic, outcome.amount);
    result = Object.freeze({
      characteristic: outcome.characteristic,
      amount: outcome.amount,
      newValue: next.characteristics[outcome.characteristic]
    });
  } else if (outcome.type === 'material') {
    result = Object.freeze({ type: 'material', name: outcome.name });
    next.materialBenefits.push(result);
  } else if (outcome.type === 'none') {
    result = Object.freeze({ type: 'none' });
  }

  next.musterOut.results.push(Object.freeze({ ...baseRecord, pending: false, result }));
  next.history.push(historyEvent('muster-out-benefit', character, {
    ...baseRecord,
    result
  }));
  finishMusterOutIfComplete(next);
  return { character: next, roll, dm, total, outcome, result, pendingSpecialization: false };
}

export function resolveMusterBenefitSpecialization(character, {
  specialization,
  asSkill = false
} = {}) {
  requirePhase(character, CHARGEN_PHASES.MUSTER_BENEFIT_SPECIALIZATION_REQUIRED);
  if (!character.pendingMusterBenefit || !character.musterOut) {
    throw new ChargenStateError('no mustering-out weapon benefit is awaiting specialization');
  }
  const choice = String(specialization ?? '').trim();
  if (!choice) {
    throw new ChargenStateError('a specific gun or blade type must be declared immediately');
  }

  const next = copyCharacter(character);
  const { category, resultIndex } = next.pendingMusterBenefit;
  const previousBenefit = next.materialBenefits.some((benefit) => (
    benefit.type === 'weapon' && benefit.category === category
  ));

  if (asSkill && !previousBenefit) {
    throw new ChargenStateError(`the first ${category} mustering-out benefit must be taken as a weapon; only an additional benefit may be taken as skill`);
  }

  let result;
  if (asSkill) {
    applySkill(next, choice, 1);
    result = Object.freeze({
      type: 'skill',
      category,
      specialization: choice,
      level: next.skills[choice]
    });
  } else {
    result = Object.freeze({
      type: 'weapon',
      category,
      specialization: choice
    });
    next.materialBenefits.push(result);
  }

  next.musterOut.results[resultIndex] = Object.freeze({
    ...next.musterOut.results[resultIndex],
    pending: false,
    result
  });
  next.pendingMusterBenefit = null;
  next.phase = CHARGEN_PHASES.MUSTER_OUT_ROLLS_PENDING;
  next.history.push(historyEvent('muster-out-weapon', character, result));
  finishMusterOutIfComplete(next);
  return { character: next, result };
}

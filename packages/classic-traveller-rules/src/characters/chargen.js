import { createDice, requireDice } from '../dice.js';
import { formatUPP, generateCharacteristics } from './upp.js';
import { calculateDM, getService, serviceForDraftRoll } from '../careers/services.js';
import {
  availableSkillTables,
  eligibleRankServiceBenefits,
  getAcquiredSkillOutcome,
  getSkillTable
} from '../skills/acquired-skills.js';

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
  REENLISTMENT_REQUIRED: 'reenlistment-required',
  MUSTER_OUT_REQUIRED: 'muster-out-required',
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

  return {
    ...character,
    ...patch,
    characteristics: { ...sourceCharacteristics },
    skills: { ...(sourceSkills ?? {}) },
    automaticSkillsReceived: [...(sourceAutomaticSkills ?? [])],
    completedTerms: [...(sourceCompletedTerms ?? [])],
    history: [...character.history],
    pendingSkill: Object.hasOwn(patch, 'pendingSkill')
      ? patch.pendingSkill
      : (character.pendingSkill ? { ...character.pendingSkill } : null),
    currentTerm: cloneCurrentTerm(sourceCurrentTerm)
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

export function createCharacter({
  name = '',
  dice = createDice(),
  survivalInjuryRule = false
} = {}) {
  const characteristics = generateCharacteristics({ dice });
  const upp = formatUPP(characteristics);

  return {
    schemaVersion: 2,
    name,
    age: 18,
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
    skillsDue: termNumber === 1 ? 2 : 1,
    pendingSkill: null,
    currentTerm: {
      number: termNumber,
      startAge: character.age,
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
    next.age = character.currentTerm.startAge + 2;
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
  const endingAge = next.currentTerm.startAge + next.currentTerm.plannedYears;
  next.age = endingAge;

  const automaticBenefits = applyRankServiceBenefits(next);
  const completedTerm = Object.freeze({
    ...cloneCurrentTerm(next.currentTerm),
    endAge: endingAge,
    endingRank: next.rank,
    endingRankTitle: next.rankTitle
  });

  next.completedTerms.push(completedTerm);
  next.terms = character.terms + 1;
  next.yearsServed = (character.yearsServed ?? 0) + next.currentTerm.plannedYears;
  next.phase = next.currentTerm.forcedSeparation
    ? CHARGEN_PHASES.MUSTER_OUT_REQUIRED
    : CHARGEN_PHASES.REENLISTMENT_REQUIRED;
  next.currentTerm = null;

  next.history.push(Object.freeze({
    type: 'term-complete',
    age: endingAge,
    term: completedTerm.number,
    service: character.service,
    yearsServed: completedTerm.plannedYears,
    rank: next.rank,
    rankTitle: next.rankTitle,
    automaticBenefits,
    forcedSeparation: completedTerm.forcedSeparation
  }));

  return { character: next, term: completedTerm, automaticBenefits };
}

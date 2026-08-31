import { createDice, requireDice } from '../dice.js';
import { formatUPP, generateCharacteristics } from './upp.js';
import { calculateDM, getService, serviceForDraftRoll } from '../careers/services.js';

export const CHARGEN_PHASES = Object.freeze({
  SERVICE_SELECTION: 'service-selection',
  DRAFT_REQUIRED: 'draft-required',
  TERM_READY: 'term-ready',
  SURVIVAL_REQUIRED: 'survival-required',
  COMMISSION_OPTION: 'commission-option',
  PROMOTION_OPTION: 'promotion-option',
  SKILLS_PENDING: 'skills-pending',
  DEAD: 'dead'
});

export class ChargenStateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ChargenStateError';
  }
}

function copyCharacter(character, patch = {}) {
  const sourceCurrentTerm = Object.hasOwn(patch, 'currentTerm')
    ? patch.currentTerm
    : character.currentTerm;

  return {
    ...character,
    ...patch,
    characteristics: { ...character.characteristics },
    history: [...character.history],
    currentTerm: sourceCurrentTerm ? { ...sourceCurrentTerm } : null
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
  if (service.promotion && commissioned) {
    return CHARGEN_PHASES.PROMOTION_OPTION;
  }
  return CHARGEN_PHASES.SKILLS_PENDING;
}

export function createCharacter({
  name = '',
  dice = createDice(),
  survivalInjuryRule = false
} = {}) {
  const characteristics = generateCharacteristics({ dice });
  const upp = formatUPP(characteristics);

  return {
    schemaVersion: 1,
    name,
    age: 18,
    characteristics,
    upp,
    service: null,
    drafted: false,
    terms: 0,
    rank: 0,
    rankTitle: '',
    skillsDue: 0,
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
    currentTerm: {
      number: termNumber,
      startAge: character.age,
      plannedYears: 4,
      survival: null,
      commission: null,
      promotion: null
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
    next.age += 2;
    next.phase = CHARGEN_PHASES.SKILLS_PENDING;
    next.currentTerm.plannedYears = 2;
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
    next.phase = service.promotion ? CHARGEN_PHASES.PROMOTION_OPTION : CHARGEN_PHASES.SKILLS_PENDING;
  } else {
    next.phase = CHARGEN_PHASES.SKILLS_PENDING;
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
  const next = copyCharacter(character, { phase: CHARGEN_PHASES.SKILLS_PENDING });
  next.history.push(historyEvent('commission-skipped', character, {
    term: character.currentTerm.number,
    service: character.service
  }));
  return next;
}

export function resolvePromotion(character, { dice = createDice() } = {}) {
  requirePhase(character, CHARGEN_PHASES.PROMOTION_OPTION);
  const service = getService(character.service);
  if (!service.promotion || character.rank < 1) {
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
  next.phase = CHARGEN_PHASES.SKILLS_PENDING;

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
  const next = copyCharacter(character, { phase: CHARGEN_PHASES.SKILLS_PENDING });
  next.history.push(historyEvent('promotion-skipped', character, {
    term: character.currentTerm.number,
    service: character.service,
    rank: character.rank
  }));
  return next;
}

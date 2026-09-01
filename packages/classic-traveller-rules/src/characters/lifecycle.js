import { createDice } from '../dice.js';
import { SERVICE_KEYS } from '../careers/services.js';
import {
  availableSkillTables,
  getSpecializationOptions,
  specializationTypeForWeaponCategory
} from '../skills/acquired-skills.js';
import {
  CHARGEN_PHASES,
  ChargenStateError,
  attemptEnlistment,
  resolveDraft,
  beginTerm,
  resolveSurvival,
  resolveCommission,
  skipCommission,
  resolvePromotion,
  skipPromotion,
  rollAcquiredSkill,
  resolveSkillSpecialization,
  completeTerm,
  resolveAging,
  resolveAgingCrisis,
  resolveReenlistment,
  chooseReenlistment,
  chooseMusterOut,
  beginMusterOut,
  rollMusterOutCash,
  rollMusterOutBenefit,
  resolveMusterBenefitSpecialization
} from './chargen.js';

export const CHARGEN_ACTIONS = Object.freeze({
  ATTEMPT_ENLISTMENT: 'attempt-enlistment',
  RESOLVE_DRAFT: 'resolve-draft',
  BEGIN_TERM: 'begin-term',
  RESOLVE_SURVIVAL: 'resolve-survival',
  ROLL_COMMISSION: 'roll-commission',
  SKIP_COMMISSION: 'skip-commission',
  ROLL_PROMOTION: 'roll-promotion',
  SKIP_PROMOTION: 'skip-promotion',
  ROLL_SKILL: 'roll-skill',
  RESOLVE_SKILL_SPECIALIZATION: 'resolve-skill-specialization',
  COMPLETE_TERM: 'complete-term',
  RESOLVE_AGING: 'resolve-aging',
  RESOLVE_AGING_CRISIS: 'resolve-aging-crisis',
  ROLL_REENLISTMENT: 'roll-reenlistment',
  REENLIST: 'reenlist',
  MUSTER_OUT: 'muster-out',
  BEGIN_MUSTER_OUT: 'begin-muster-out',
  ROLL_MUSTER_CASH: 'roll-muster-cash',
  ROLL_MUSTER_BENEFIT: 'roll-muster-benefit',
  RESOLVE_MUSTER_BENEFIT_SPECIALIZATION: 'resolve-muster-benefit-specialization'
});

const ACTION_VALUES = new Set(Object.values(CHARGEN_ACTIONS));

function descriptor(character, actions, choices = {}) {
  return Object.freeze({
    phase: character.phase,
    actions: Object.freeze([...actions]),
    choices: Object.freeze({ ...choices })
  });
}

export function getAvailableActions(character) {
  if (!character || typeof character !== 'object') {
    throw new TypeError('character must be an object');
  }

  switch (character.phase) {
    case CHARGEN_PHASES.SERVICE_SELECTION:
      return descriptor(character, [CHARGEN_ACTIONS.ATTEMPT_ENLISTMENT], {
        services: Object.freeze([...SERVICE_KEYS])
      });

    case CHARGEN_PHASES.DRAFT_REQUIRED:
      return descriptor(character, [CHARGEN_ACTIONS.RESOLVE_DRAFT]);

    case CHARGEN_PHASES.TERM_READY:
      return descriptor(character, [CHARGEN_ACTIONS.BEGIN_TERM]);

    case CHARGEN_PHASES.SURVIVAL_REQUIRED:
      return descriptor(character, [CHARGEN_ACTIONS.RESOLVE_SURVIVAL]);

    case CHARGEN_PHASES.COMMISSION_OPTION:
      return descriptor(character, [
        CHARGEN_ACTIONS.ROLL_COMMISSION,
        CHARGEN_ACTIONS.SKIP_COMMISSION
      ]);

    case CHARGEN_PHASES.PROMOTION_OPTION:
      return descriptor(character, [
        CHARGEN_ACTIONS.ROLL_PROMOTION,
        CHARGEN_ACTIONS.SKIP_PROMOTION
      ]);

    case CHARGEN_PHASES.SKILLS_PENDING:
      return descriptor(character, [CHARGEN_ACTIONS.ROLL_SKILL], {
        skillTables: Object.freeze([...availableSkillTables(character)]),
        skillsDue: character.skillsDue
      });

    case CHARGEN_PHASES.SKILL_SPECIALIZATION_REQUIRED: {
      const pendingSkill = character.pendingSkill ? Object.freeze({ ...character.pendingSkill }) : null;
      const specializations = pendingSkill
        ? Object.freeze([...getSpecializationOptions(pendingSkill.specializationType)])
        : Object.freeze([]);
      return descriptor(character, [CHARGEN_ACTIONS.RESOLVE_SKILL_SPECIALIZATION], {
        pendingSkill,
        specializations
      });
    }

    case CHARGEN_PHASES.TERM_COMPLETION_READY:
      return descriptor(character, [CHARGEN_ACTIONS.COMPLETE_TERM]);

    case CHARGEN_PHASES.AGING_REQUIRED:
      return descriptor(character, [CHARGEN_ACTIONS.RESOLVE_AGING], {
        pendingChecks: Object.freeze([...(character.pendingAgingChecks ?? [])])
      });

    case CHARGEN_PHASES.AGING_CRISIS_REQUIRED:
      return descriptor(character, [CHARGEN_ACTIONS.RESOLVE_AGING_CRISIS], {
        pendingCrises: Object.freeze([...(character.pendingAgingCrises ?? [])])
      });

    case CHARGEN_PHASES.REENLISTMENT_REQUIRED:
      return descriptor(character, [CHARGEN_ACTIONS.ROLL_REENLISTMENT]);

    case CHARGEN_PHASES.REENLISTMENT_DECISION:
      return descriptor(character, [
        CHARGEN_ACTIONS.REENLIST,
        CHARGEN_ACTIONS.MUSTER_OUT
      ]);

    case CHARGEN_PHASES.MUSTER_OUT_REQUIRED:
      return descriptor(character, [CHARGEN_ACTIONS.BEGIN_MUSTER_OUT]);

    case CHARGEN_PHASES.MUSTER_OUT_ROLLS_PENDING: {
      const actions = [];
      if ((character.musterOut?.cashRolls ?? 0) < 3) {
        actions.push(CHARGEN_ACTIONS.ROLL_MUSTER_CASH);
      }
      actions.push(CHARGEN_ACTIONS.ROLL_MUSTER_BENEFIT);
      return descriptor(character, actions, {
        remainingRolls: character.musterOut?.remainingRolls ?? 0,
        cashRollsRemaining: Math.max(0, 3 - (character.musterOut?.cashRolls ?? 0))
      });
    }

    case CHARGEN_PHASES.MUSTER_BENEFIT_SPECIALIZATION_REQUIRED: {
      const pendingBenefit = character.pendingMusterBenefit
        ? Object.freeze({ ...character.pendingMusterBenefit })
        : null;
      const specializationType = pendingBenefit
        ? specializationTypeForWeaponCategory(pendingBenefit.category)
        : null;
      const specializations = specializationType
        ? Object.freeze([...getSpecializationOptions(specializationType)])
        : Object.freeze([]);
      const canTakeAsSkill = Boolean(pendingBenefit && character.materialBenefits.some((benefit) => (
        benefit.type === 'weapon' && benefit.category === pendingBenefit.category
      )));
      return descriptor(character, [CHARGEN_ACTIONS.RESOLVE_MUSTER_BENEFIT_SPECIALIZATION], {
        pendingBenefit,
        specializationType,
        specializations,
        canTakeAsSkill
      });
    }

    case CHARGEN_PHASES.COMPLETE:
    case CHARGEN_PHASES.DEAD:
      return descriptor(character, []);

    default:
      throw new ChargenStateError(`unknown chargen phase: ${character.phase}`);
  }
}

function normalizeResult(value) {
  if (value && typeof value === 'object' && value.character) {
    return value;
  }
  return { character: value };
}

function withNextActions(value) {
  const normalized = normalizeResult(value);
  return {
    ...normalized,
    available: getAvailableActions(normalized.character)
  };
}

function requireActionAvailable(character, action) {
  if (!ACTION_VALUES.has(action)) {
    throw new RangeError(`unknown chargen action: ${action}`);
  }
  const available = getAvailableActions(character);
  if (!available.actions.includes(action)) {
    throw new ChargenStateError(`action ${action} is not legal during phase ${character.phase}`);
  }
  return available;
}

// Stable UI-facing action dispatcher. The low-level Book 1 functions remain
// public, but browser clients can use this entry point and never duplicate
// phase legality rules in HTML or event handlers.
export function performChargenAction(character, action, payload = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TypeError('chargen action payload must be an object');
  }
  requireActionAvailable(character, action);
  const dice = payload.dice ?? createDice();

  switch (action) {
    case CHARGEN_ACTIONS.ATTEMPT_ENLISTMENT:
      return withNextActions(attemptEnlistment(character, payload.service, { dice }));
    case CHARGEN_ACTIONS.RESOLVE_DRAFT:
      return withNextActions(resolveDraft(character, { dice }));
    case CHARGEN_ACTIONS.BEGIN_TERM:
      return withNextActions(beginTerm(character));
    case CHARGEN_ACTIONS.RESOLVE_SURVIVAL:
      return withNextActions(resolveSurvival(character, { dice }));
    case CHARGEN_ACTIONS.ROLL_COMMISSION:
      return withNextActions(resolveCommission(character, { dice }));
    case CHARGEN_ACTIONS.SKIP_COMMISSION:
      return withNextActions(skipCommission(character));
    case CHARGEN_ACTIONS.ROLL_PROMOTION:
      return withNextActions(resolvePromotion(character, { dice }));
    case CHARGEN_ACTIONS.SKIP_PROMOTION:
      return withNextActions(skipPromotion(character));
    case CHARGEN_ACTIONS.ROLL_SKILL:
      return withNextActions(rollAcquiredSkill(character, payload.tableKey, { dice }));
    case CHARGEN_ACTIONS.RESOLVE_SKILL_SPECIALIZATION:
      return withNextActions(resolveSkillSpecialization(character, payload.specialization));
    case CHARGEN_ACTIONS.COMPLETE_TERM:
      return withNextActions(completeTerm(character));
    case CHARGEN_ACTIONS.RESOLVE_AGING:
      return withNextActions(resolveAging(character, { dice }));
    case CHARGEN_ACTIONS.RESOLVE_AGING_CRISIS:
      return withNextActions(resolveAgingCrisis(character, {
        dice,
        medicalSkill: payload.medicalSkill ?? 0,
        slowDrug: payload.slowDrug ?? true
      }));
    case CHARGEN_ACTIONS.ROLL_REENLISTMENT:
      return withNextActions(resolveReenlistment(character, { dice }));
    case CHARGEN_ACTIONS.REENLIST:
      return withNextActions(chooseReenlistment(character));
    case CHARGEN_ACTIONS.MUSTER_OUT:
      return withNextActions(chooseMusterOut(character));
    case CHARGEN_ACTIONS.BEGIN_MUSTER_OUT:
      return withNextActions(beginMusterOut(character));
    case CHARGEN_ACTIONS.ROLL_MUSTER_CASH:
      return withNextActions(rollMusterOutCash(character, { dice }));
    case CHARGEN_ACTIONS.ROLL_MUSTER_BENEFIT:
      return withNextActions(rollMusterOutBenefit(character, { dice }));
    case CHARGEN_ACTIONS.RESOLVE_MUSTER_BENEFIT_SPECIALIZATION:
      return withNextActions(resolveMusterBenefitSpecialization(character, {
        specialization: payload.specialization,
        asSkill: payload.asSkill ?? false
      }));
    default:
      throw new RangeError(`unknown chargen action: ${action}`);
  }
}

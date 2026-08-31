import { SERVICE_KEYS, getService } from '../careers/services.js';
import { retirementPayForTerms } from '../careers/mustering-out.js';
import { CHARACTERISTIC_KEYS, formatUPP } from './upp.js';
import { CHARGEN_PHASES } from './chargen.js';

export const CURRENT_CHARACTER_SCHEMA_VERSION = 4;
export const SUPPORTED_CHARACTER_SCHEMA_VERSIONS = Object.freeze([3, 4]);

const PHASE_VALUES = new Set(Object.values(CHARGEN_PHASES));
const SERVICE_VALUES = new Set(SERVICE_KEYS);
const ACTIVE_TERM_PHASES = new Set([
  CHARGEN_PHASES.SURVIVAL_REQUIRED,
  CHARGEN_PHASES.COMMISSION_OPTION,
  CHARGEN_PHASES.PROMOTION_OPTION,
  CHARGEN_PHASES.SKILLS_PENDING,
  CHARGEN_PHASES.SKILL_SPECIALIZATION_REQUIRED,
  CHARGEN_PHASES.TERM_COMPLETION_READY
]);

const TOP_LEVEL_KEYS = new Set([
  'schemaVersion', 'name', 'age', 'chronologicalAgeMonths', 'physicalAgeMonths',
  'nextAgingCheckAgeMonths', 'characteristics', 'upp', 'service', 'drafted',
  'terms', 'yearsServed', 'rank', 'rankTitle', 'skills', 'skillsDue',
  'pendingSkill', 'automaticSkillsReceived', 'completedTerms',
  'pendingAgingChecks', 'pendingAgingCrises', 'postAgingPhase', 'credits',
  'materialBenefits', 'musterOut', 'pendingMusterBenefit', 'retired',
  'retirementPayAnnual', 'separationReason', 'alive', 'phase', 'currentTerm',
  'options', 'history'
]);

export class CharacterValidationError extends Error {
  constructor(errors) {
    const list = Array.isArray(errors) ? errors : [String(errors)];
    super(`invalid Classic Traveller character state: ${list.join('; ')}`);
    this.name = 'CharacterValidationError';
    this.errors = Object.freeze([...list]);
  }
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function integerAtLeast(value, minimum) {
  return Number.isInteger(value) && value >= minimum;
}

function add(errors, condition, message) {
  if (!condition) errors.push(message);
}

function assertJsonSafe(value, path = '$', seen = new Set()) {
  if (value === null) return;
  const type = typeof value;
  if (type === 'string' || type === 'boolean') return;
  if (type === 'number') {
    if (!Number.isFinite(value)) throw new CharacterValidationError(`${path} contains a non-finite number`);
    return;
  }
  if (type === 'undefined' || type === 'function' || type === 'symbol' || type === 'bigint') {
    throw new CharacterValidationError(`${path} contains a non-JSON value`);
  }
  if (seen.has(value)) throw new CharacterValidationError(`${path} contains a circular reference`);
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertJsonSafe(entry, `${path}[${index}]`, seen));
  } else if (isPlainObject(value)) {
    for (const [key, entry] of Object.entries(value)) {
      assertJsonSafe(entry, `${path}.${key}`, seen);
    }
  } else {
    throw new CharacterValidationError(`${path} contains a non-plain object`);
  }
  seen.delete(value);
}

function validateCharacteristics(character, errors) {
  const c = character.characteristics;
  add(errors, isPlainObject(c), 'characteristics must be an object');
  if (!isPlainObject(c)) return;
  const keys = Object.keys(c);
  add(errors,
    keys.length === CHARACTERISTIC_KEYS.length && CHARACTERISTIC_KEYS.every((key) => Object.hasOwn(c, key)),
    'characteristics must contain exactly STR, DEX, END, INT, EDU, and SOC'
  );
  for (const key of CHARACTERISTIC_KEYS) {
    add(errors, Number.isInteger(c[key]) && c[key] >= 0, `${key} must be a non-negative integer`);
  }
  try {
    const expected = formatUPP(c);
    add(errors, character.upp === expected, `upp must match characteristics (${expected})`);
  } catch (error) {
    errors.push(`characteristics cannot be encoded as a UPP: ${error.message}`);
  }
}

function validateServiceAndRank(character, errors) {
  const serviceValid = character.service === null || SERVICE_VALUES.has(character.service);
  add(errors, serviceValid, 'service must be null or one of the six Classic Traveller services');
  add(errors, integerAtLeast(character.rank, 0), 'rank must be a non-negative integer');
  add(errors, typeof character.rankTitle === 'string', 'rankTitle must be a string');

  if (character.service === null) {
    add(errors, character.rank === 0, 'a character without a service must have rank 0');
    add(errors, character.rankTitle === '', 'a character without a service must have a blank rankTitle');
    return;
  }
  if (!serviceValid || !integerAtLeast(character.rank, 0)) return;
  const service = getService(character.service);
  add(errors, character.rank < service.ranks.length, `rank ${character.rank} is not valid for ${service.name}`);
  if (character.rank < service.ranks.length) {
    add(errors, character.rankTitle === (service.ranks[character.rank] ?? ''), 'rankTitle does not match service and rank');
  }
}

function validateSkills(character, errors) {
  add(errors, isPlainObject(character.skills), 'skills must be an object');
  if (!isPlainObject(character.skills)) return;
  for (const [name, level] of Object.entries(character.skills)) {
    add(errors, name.trim().length > 0, 'skill names must not be blank');
    add(errors, integerAtLeast(level, 0), `skill ${name} must have a non-negative integer level`);
  }
}

function validateCurrentTerm(character, errors) {
  const shouldHaveTerm = ACTIVE_TERM_PHASES.has(character.phase);
  if (shouldHaveTerm) {
    add(errors, isPlainObject(character.currentTerm), `phase ${character.phase} requires currentTerm`);
  } else if (character.phase !== CHARGEN_PHASES.DEAD) {
    add(errors, character.currentTerm === null, `phase ${character.phase} must not retain currentTerm`);
  }
  if (!isPlainObject(character.currentTerm)) return;
  add(errors, character.currentTerm.number === character.terms + 1, 'currentTerm.number must be terms + 1');
  add(errors, character.currentTerm.plannedYears === 4 || character.currentTerm.plannedYears === 2, 'currentTerm.plannedYears must be 4 or 2');
  add(errors, Array.isArray(character.currentTerm.skillRolls), 'currentTerm.skillRolls must be an array');
  add(errors, Array.isArray(character.currentTerm.automaticBenefits), 'currentTerm.automaticBenefits must be an array');
}

function validatePhaseSpecific(character, errors) {
  add(errors, PHASE_VALUES.has(character.phase), `unknown chargen phase: ${character.phase}`);
  if (!PHASE_VALUES.has(character.phase)) return;

  if (character.phase === CHARGEN_PHASES.SERVICE_SELECTION || character.phase === CHARGEN_PHASES.DRAFT_REQUIRED) {
    add(errors, character.service === null, `${character.phase} requires service to be null`);
    add(errors, character.terms === 0, `${character.phase} requires zero completed terms`);
  } else if (character.phase !== CHARGEN_PHASES.DEAD) {
    add(errors, SERVICE_VALUES.has(character.service), `${character.phase} requires a valid service`);
  }

  add(errors, integerAtLeast(character.skillsDue, 0), 'skillsDue must be a non-negative integer');

  if (character.phase === CHARGEN_PHASES.SKILLS_PENDING) {
    add(errors, character.skillsDue > 0, 'skills-pending requires at least one skill roll due');
  }
  if (character.phase === CHARGEN_PHASES.TERM_COMPLETION_READY) {
    add(errors, character.skillsDue === 0, 'term-completion-ready requires zero skillsDue');
  }

  if (character.phase === CHARGEN_PHASES.SKILL_SPECIALIZATION_REQUIRED) {
    add(errors, isPlainObject(character.pendingSkill), 'skill-specialization-required requires pendingSkill');
  } else {
    add(errors, character.pendingSkill === null, `phase ${character.phase} must not retain pendingSkill`);
  }

  if (character.phase === CHARGEN_PHASES.AGING_REQUIRED) {
    add(errors, Array.isArray(character.pendingAgingChecks) && character.pendingAgingChecks.length > 0,
      'aging-required requires at least one pending aging check');
  }
  if (character.phase === CHARGEN_PHASES.AGING_CRISIS_REQUIRED) {
    add(errors, Array.isArray(character.pendingAgingCrises) && character.pendingAgingCrises.length > 0,
      'aging-crisis-required requires at least one pending aging crisis');
  }

  if (character.phase === CHARGEN_PHASES.MUSTER_BENEFIT_SPECIALIZATION_REQUIRED) {
    add(errors, isPlainObject(character.pendingMusterBenefit),
      'muster-benefit-specialization-required requires pendingMusterBenefit');
  } else {
    add(errors, character.pendingMusterBenefit === null, `phase ${character.phase} must not retain pendingMusterBenefit`);
  }

  if (character.phase === CHARGEN_PHASES.DEAD) {
    add(errors, character.alive === false, 'DEAD phase requires alive=false');
  } else {
    add(errors, character.alive === true, `${character.phase} requires alive=true`);
  }

  if (character.phase === CHARGEN_PHASES.COMPLETE) {
    add(errors, character.musterOut !== null, 'COMPLETE state requires mustering-out state');
    if (isPlainObject(character.musterOut)) {
      add(errors, character.musterOut.remainingRolls === 0, 'COMPLETE state requires zero remaining mustering-out rolls');
    }
  }
}

function validateMusterOut(character, errors) {
  if (character.musterOut === null) return;
  add(errors, isPlainObject(character.musterOut), 'musterOut must be null or an object');
  if (!isPlainObject(character.musterOut)) return;
  const m = character.musterOut;
  for (const key of ['totalRolls', 'remainingRolls', 'rankBonusRolls', 'cashRolls', 'benefitRolls', 'cashReceived']) {
    add(errors, integerAtLeast(m[key], 0), `musterOut.${key} must be a non-negative integer`);
  }
  add(errors, Array.isArray(m.results), 'musterOut.results must be an array');
  if (integerAtLeast(m.totalRolls, 0) && integerAtLeast(m.remainingRolls, 0)
      && integerAtLeast(m.cashRolls, 0) && integerAtLeast(m.benefitRolls, 0)) {
    add(errors, m.remainingRolls + m.cashRolls + m.benefitRolls === m.totalRolls,
      'mustering-out roll counters do not add up to totalRolls');
    add(errors, m.cashRolls <= 3, 'musterOut.cashRolls cannot exceed three');
  }

  if (character.phase === CHARGEN_PHASES.MUSTER_OUT_ROLLS_PENDING) {
    add(errors, m.remainingRolls > 0, 'muster-out-rolls-pending requires at least one remaining roll');
  }
}

function validateArraysAndCounters(character, errors) {
  add(errors, Array.isArray(character.completedTerms), 'completedTerms must be an array');
  add(errors, Array.isArray(character.automaticSkillsReceived), 'automaticSkillsReceived must be an array');
  add(errors, Array.isArray(character.materialBenefits), 'materialBenefits must be an array');
  add(errors, Array.isArray(character.pendingAgingChecks), 'pendingAgingChecks must be an array');
  add(errors, Array.isArray(character.pendingAgingCrises), 'pendingAgingCrises must be an array');
  add(errors, Array.isArray(character.history), 'history must be an array');
  add(errors, integerAtLeast(character.terms, 0), 'terms must be a non-negative integer');
  add(errors, integerAtLeast(character.yearsServed, 0), 'yearsServed must be a non-negative integer');
  add(errors, integerAtLeast(character.credits, 0), 'credits must be a non-negative integer');
  add(errors, integerAtLeast(character.retirementPayAnnual, 0), 'retirementPayAnnual must be a non-negative integer');

  if (Array.isArray(character.completedTerms) && integerAtLeast(character.terms, 0)) {
    add(errors, character.completedTerms.length === character.terms, 'terms must equal completedTerms.length');
    const years = character.completedTerms.reduce((sum, term) => (
      sum + (isPlainObject(term) && Number.isInteger(term.plannedYears) ? term.plannedYears : 0)
    ), 0);
    add(errors, years === character.yearsServed, 'yearsServed must equal the sum of completed term lengths');
  }
}

function validateAge(character, errors) {
  add(errors, integerAtLeast(character.age, 18), 'age must be an integer of at least 18');
  add(errors, integerAtLeast(character.chronologicalAgeMonths, 18 * 12), 'chronologicalAgeMonths must be at least 216');
  add(errors, integerAtLeast(character.physicalAgeMonths, 0), 'physicalAgeMonths must be a non-negative integer');
  add(errors, integerAtLeast(character.nextAgingCheckAgeMonths, 34 * 12), 'nextAgingCheckAgeMonths must be at least age 34');
  if (integerAtLeast(character.chronologicalAgeMonths, 18 * 12) && integerAtLeast(character.age, 18)) {
    add(errors, Math.floor(character.chronologicalAgeMonths / 12) === character.age,
      'age must match chronologicalAgeMonths');
  }
}

function validateRetirement(character, errors) {
  add(errors, typeof character.retired === 'boolean', 'retired must be boolean');
  if (character.retired) {
    add(errors, character.terms >= 5, 'retired characters must have at least five terms');
    add(errors, character.retirementPayAnnual === retirementPayForTerms(character.terms),
      'retirementPayAnnual does not match completed terms');
  } else if (character.terms < 5) {
    add(errors, character.retirementPayAnnual === 0, 'non-retired characters under five terms must have zero retirement pay');
  }
}

export function validateCharacter(character) {
  const errors = [];
  if (!isPlainObject(character)) {
    return Object.freeze({ valid: false, errors: Object.freeze(['character must be a plain object']) });
  }

  for (const key of Object.keys(character)) {
    if (!TOP_LEVEL_KEYS.has(key)) errors.push(`unknown top-level field: ${key}`);
  }
  for (const key of TOP_LEVEL_KEYS) {
    if (!Object.hasOwn(character, key)) errors.push(`missing top-level field: ${key}`);
  }

  add(errors, character.schemaVersion === CURRENT_CHARACTER_SCHEMA_VERSION,
    `schemaVersion must be ${CURRENT_CHARACTER_SCHEMA_VERSION}`);
  add(errors, typeof character.name === 'string', 'name must be a string');
  add(errors, typeof character.drafted === 'boolean', 'drafted must be boolean');
  add(errors, typeof character.alive === 'boolean', 'alive must be boolean');
  add(errors, character.separationReason === null || typeof character.separationReason === 'string',
    'separationReason must be null or a string');
  add(errors, character.postAgingPhase === null || PHASE_VALUES.has(character.postAgingPhase),
    'postAgingPhase must be null or a known chargen phase');
  add(errors, isPlainObject(character.options), 'options must be an object');
  if (isPlainObject(character.options)) {
    add(errors, typeof character.options.survivalInjuryRule === 'boolean', 'options.survivalInjuryRule must be boolean');
  }

  validateAge(character, errors);
  validateCharacteristics(character, errors);
  validateServiceAndRank(character, errors);
  validateSkills(character, errors);
  validateArraysAndCounters(character, errors);
  validateCurrentTerm(character, errors);
  validatePhaseSpecific(character, errors);
  validateMusterOut(character, errors);
  validateRetirement(character, errors);

  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function assertValidCharacter(character) {
  const result = validateCharacter(character);
  if (!result.valid) throw new CharacterValidationError(result.errors);
  return character;
}

function cloneJsonValue(value) {
  assertJsonSafe(value);
  return JSON.parse(JSON.stringify(value));
}

function migrateCharacterDocument(character) {
  if (!SUPPORTED_CHARACTER_SCHEMA_VERSIONS.includes(character.schemaVersion)) {
    throw new CharacterValidationError(
      `unsupported schemaVersion ${character.schemaVersion}; supported versions are ${SUPPORTED_CHARACTER_SCHEMA_VERSIONS.join(', ')}`
    );
  }
  if (character.schemaVersion === CURRENT_CHARACTER_SCHEMA_VERSION) return character;

  // v3 -> v4 changes only the formal import/export contract. The underlying
  // chargen state shape is intentionally preserved.
  return { ...character, schemaVersion: CURRENT_CHARACTER_SCHEMA_VERSION };
}

export function exportCharacter(character, { space = 2 } = {}) {
  if (!Number.isInteger(space) || space < 0 || space > 10) {
    throw new RangeError(`space must be an integer from 0 to 10; received ${space}`);
  }
  assertJsonSafe(character);
  assertValidCharacter(character);
  return JSON.stringify(character, null, space);
}

export function importCharacter(source) {
  let parsed;
  if (typeof source === 'string') {
    try {
      parsed = JSON.parse(source);
    } catch (error) {
      throw new CharacterValidationError(`invalid JSON: ${error.message}`);
    }
  } else if (isPlainObject(source)) {
    parsed = cloneJsonValue(source);
  } else {
    throw new CharacterValidationError('import source must be a JSON string or plain object');
  }

  if (!isPlainObject(parsed)) {
    throw new CharacterValidationError('imported JSON root must be an object');
  }

  const migrated = migrateCharacterDocument(parsed);
  const cloned = cloneJsonValue(migrated);
  assertValidCharacter(cloned);
  return cloned;
}

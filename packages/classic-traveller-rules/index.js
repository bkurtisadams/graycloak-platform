// @graycloak/classic-traveller-rules v0.4.0
// Source-backed Classic Traveller Book 1 character-generation engine.
// Pure rules/state logic: no host, UI, persistence, Foundry, or Firebase dependencies.

export {
  createDice,
  createSequenceDice,
  requireDice
} from './src/dice.js';

export {
  CHARACTERISTIC_KEYS,
  encodeCharacteristic,
  formatUPP,
  generateCharacteristics,
  generateUPP
} from './src/characters/upp.js';

export {
  SERVICE_KEYS,
  SERVICES,
  getService,
  serviceForDraftRoll,
  calculateDM
} from './src/careers/services.js';

export {
  SKILL_TABLE_KEYS,
  SKILL_TABLES,
  RANK_SERVICE_BENEFITS,
  getSkillTable,
  availableSkillTables,
  getAcquiredSkillOutcome,
  eligibleRankServiceBenefits
} from './src/skills/acquired-skills.js';

export {
  AGING_START_AGE,
  AGING_INTERVAL_YEARS,
  AGING_START_MONTHS,
  AGING_INTERVAL_MONTHS,
  AGING_BANDS,
  agingRulesForAge
} from './src/characters/aging.js';

export {
  MUSTERING_OUT_TABLES,
  musterRollAllowance,
  benefitTableDM,
  cashTableDM,
  getMusterBenefitOutcome,
  getMusterCash,
  retirementPayForTerms
} from './src/careers/mustering-out.js';

export {
  CHARGEN_PHASES,
  ChargenStateError,
  createCharacter,
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
} from './src/characters/chargen.js';

export {
  CHARGEN_ACTIONS,
  getAvailableActions,
  performChargenAction
} from './src/characters/lifecycle.js';

export {
  CURRENT_CHARACTER_SCHEMA_VERSION,
  SUPPORTED_CHARACTER_SCHEMA_VERSIONS,
  CharacterValidationError,
  validateCharacter,
  assertValidCharacter,
  exportCharacter,
  importCharacter
} from './src/characters/serialization.js';

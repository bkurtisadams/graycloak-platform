// @graycloak/classic-traveller-rules v0.2.1
// Source-backed Book 1 chargen foundation: initial UPP, prior service,
// acquired skills, rank/service automatic skills, and term completion.
// No host/UI/persistence dependencies.

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
  completeTerm
} from './src/characters/chargen.js';

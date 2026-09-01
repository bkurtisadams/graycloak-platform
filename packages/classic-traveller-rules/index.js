// @graycloak/classic-traveller-rules v0.9.0
// Source-backed Classic Traveller Books 1-3 character, starship, and subsector rules engine.
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
  SPECIALIZATION_OPTIONS,
  RANK_SERVICE_BENEFITS,
  getSkillTable,
  availableSkillTables,
  getAcquiredSkillOutcome,
  getSpecializationOptions,
  canonicalSpecialization,
  specializationTypeForWeaponCategory,
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

export {
  CHARACTER_DOCUMENT_TYPE,
  CURRENT_CHARACTER_DOCUMENT_SCHEMA_VERSION,
  SUPPORTED_CHARACTER_DOCUMENT_SCHEMA_VERSIONS,
  CharacterDocumentValidationError,
  summarizeMaterialBenefits,
  createCharacterDocument,
  validateCharacterDocument,
  assertValidCharacterDocument,
  exportCharacterDocument,
  importCharacterDocument,
  migrateCharacterDocument,
  linkCharacterToShip,
  updateCharacterShipReference
} from './src/characters/character-document.js';

export {
  stableDocumentId
} from './src/documents/ids.js';

export {
  TYPE_S_SCOUT_COURIER_KEY,
  TYPE_S_SCOUT_COURIER,
  STANDARD_SHIP_DESIGN_KEYS,
  getStandardShipDesign
} from './src/starships/standard-designs.js';

export {
  SHIP_DOCUMENT_TYPE,
  CURRENT_SHIP_DOCUMENT_SCHEMA_VERSION,
  SUPPORTED_SHIP_DOCUMENT_SCHEMA_VERSIONS,
  ShipDocumentValidationError,
  createShipDocument,
  validateShipDocument,
  assertValidShipDocument,
  exportShipDocument,
  importShipDocument,
  updateShipIdentity,
  updateShipAssignedCharacterName,
  createTypeSScoutReserveShipForCharacter
} from './src/starships/ship-document.js';


export {
  SUBSECTOR_COLUMNS,
  SUBSECTOR_ROWS,
  formatSubsectorHex,
  parseSubsectorHex,
  subsectorHexDistance,
  validateAuthoredSubsector,
  assertValidAuthoredSubsector,
  getSubsectorSystem,
  getJumpDestinations,
  jumpDistanceBetweenSystems
} from './src/worlds/subsector.js';

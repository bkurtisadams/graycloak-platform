// @graycloak/classic-traveller-rules v0.15.0
// Source-backed Classic Traveller Books 1-3 character, starship, world, and subsector rules engine.
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
  NOBLE_TITLE_TABLE,
  nobleTitleEntitlement
} from './src/characters/noble-titles.js';

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
  updateCharacterShipReference,
  updateCharacterGameplayState
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
  migrateShipDocument,
  updateShipIdentity,
  updateShipAssignedCharacterName,
  createTypeSScoutReserveShipForCharacter
} from './src/starships/ship-document.js';




export {
  REFINED_FUEL_COST_PER_TON_CR,
  UNREFINED_FUEL_COST_PER_TON_CR,
  BASE_BERTHING_COST_CR,
  HIGH_PASSENGERS_PER_STEWARD,
  POWER_PLANT_FUEL_WEEKS,
  STANDARD_TRIP_DAYS,
  starportFuelService,
  calculateBerthingCost,
  calculateJumpFuelRequirement,
  availableShipFuelTons,
  canShipMakeJump,
  establishShipFuelState,
  purchaseShipFuel,
  refuelShipToCapacity,
  consumeJumpFuel,
  transferCharacterCreditsToShip,
  creditShipAccount,
  beginPortCall,
  payCurrentBerthing,
  skimGasGiantToCapacity,
  loadCargo,
  unloadCargo,
  availablePassengerCapacity,
  bookPassenger,
  calculateLifeSupportCostForTrip,
  chargeLifeSupportForTrip,
  deliverFreightAtDestination,
  disembarkPassengersAtDestination,
  purchaseSpeculativeCargo,
  payDeclinedBrokerFee,
  sellSpeculativeCargo
} from './src/starships/operations.js';

export {
  encodeTravellerDigit,
  decodeTravellerDigit,
  formatUniversalWorldProfile,
  parseUniversalWorldProfile,
  validateUniversalWorldProfile,
  assertValidUniversalWorldProfile,
  describeStarport,
  describeWorldSize,
  describeAtmosphere,
  describeHydrographics,
  describePopulation,
  describeGovernment,
  describeLawLevel,
  TRAVEL_ZONE_CODES,
  validateAuthoredSystemRecord,
  assertValidAuthoredSystemRecord
} from './src/worlds/world-profile.js';


export {
  TRADE_CLASSIFICATIONS,
  deriveTradeClassifications,
  describeTradeClassifications
} from './src/worlds/trade-classifications.js';



export {
  CHARTER_BLOCK_DAYS,
  CHARTER_CARGO_RATE_PER_TON_CR,
  CHARTER_HIGH_BERTH_RATE_CR,
  CHARTER_LOW_BERTH_RATE_CR,
  PRIVATE_MESSAGE_THROW,
  calculateStarshipCharterPrice,
  calculateShipCharterPrice,
  privateMessageAvailable,
  privateMessageHonorarium
} from './src/trade/contracts.js';

export {
  FREIGHT_RATE_PER_TON_CR,
  PASSAGE_FARES_CR,
  STATEROOM_LIFE_SUPPORT_PER_TRIP_CR,
  LOW_BERTH_LIFE_SUPPORT_PER_USE_CR,
  TRADE_GOODS,
  generatePassengerDemand,
  generateFreightOffers,
  actualValuePercentage,
  generateSpeculativeTradeOffer,
  calculateSpeculativePurchaseCost,
  quoteSpeculativeResale
} from './src/trade/commerce.js';


export {
  PATRON_AVAILABILITY_FOUND_ROLLS,
  REACTION_DMS,
  modifiedReactionTotal,
  PATRON_SUITABILITY_TARGET,
  PATRON_ENCOUNTER_TABLE,
  REACTION_TABLE,
  reactionForTotal,
  rollReaction,
  rollPatronType,
  generatePatronContact
} from './src/encounters/patrons.js';

export {
  REFEREE_SKILL_CHECK_BASIS,
  resolveRefereeSkillCheck
} from './src/skills/referee-checks.js';

export {
  PERSONAL_COMBAT_RANGES,
  PERSONAL_ARMOR_TYPES,
  PERSONAL_COMBAT_STATUSES,
  PERSONAL_WEAPONS,
  getPersonalWeapon,
  personalWeaponSkillLevel,
  weaponCharacteristicDM,
  weaponTargetNumber,
  WEAPONS_MATRIX,
  RANGE_MATRIX,
  BASIC_HIT_THROW,
  evasionDefenseDM,
  createPersonalCombatant,
  resolvePersonalSurprise,
  movePersonalCombatRange,
  applyPersonalDamage,
  rollPersonalAttack,
  resolvePersonalAttack,
  resolvePersonalMorale,
  endPersonalCombatRecovery
} from './src/combat/personal-combat.js';

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

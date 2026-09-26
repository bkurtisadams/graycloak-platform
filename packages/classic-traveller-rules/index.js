// @graycloak/classic-traveller-rules v0.23.0
// Source-backed Classic Traveller Books 1-3 character, starship, world, and subsector rules engine.
// Pure rules/state logic: no host, UI, persistence, Foundry, or Firebase dependencies.

// 0.80.0: the package's own version, readable at run time. A client checks it
// against the version it was built for and says so when a server is still
// serving an older copy (traveller/client/rules-check.js). It must equal
// package.json's version; tests/rules-version.test.js holds the two together.
export const RULES_VERSION = '0.81.0';

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
  CATALOGUE,
  CATALOGUE_PACKS,
  CATALOGUE_WEAPONS,
  CATALOGUE_WEAPON_EXTRAS,
  CATALOGUE_ARMOUR,
  CATALOGUE_EQUIPMENT,
  catalogueEntry,
  catalogueAvailability
} from './src/equipment/catalogue.js';
export {
  SKILL_GUIDE,
  skillGuide,
  skillDM
} from './src/skills/skill-guide.js';

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
  updateCharacterGameplayState,
  addCharacterInventoryItem,
  updateCharacterInventoryItem,
  removeCharacterInventoryItem,
  setCharacterMilitaryLoad,
  characterLoad,
  updateCharacterRecord,
  restCharacter,
  medicalAttention,
  characterIsWounded,
  MEDICAL_KIT_LEVEL,
  MEDICAL_FACILITY_LEVEL,
  medicalAttentionNeeds,
  XENO_MEDICINE_LEVELS,
  REST_DAYS,
  emptyCharacterRecord,
  CHARACTER_RECORD_TEXT_FIELDS
} from './src/characters/character-document.js';

export {
  NORMAL_GRAVITY_FACTOR,
  GRAVITY_LOAD_STEP,
  PERSONAL_WEAPON_WEIGHTS_GRAMS,
  personalWeaponWeight,
  personalWeaponCarriedWeightGrams,
  gravityLoadMultiplier,
  assessLoad,
  applyLoadToCharacteristics,
  inventoryLoadGrams
} from './src/characters/load.js';

export {
  stableDocumentId
} from './src/documents/ids.js';

export {
  ANIMAL_TERRAIN_DMS,
  ANIMAL_TERRAIN_KEYS,
  ANIMAL_CATEGORIES,
  ANIMAL_TYPES,
  ANIMAL_SPECIAL_ATTRIBUTES,
  ANIMAL_SIZES,
  ANIMAL_WEAPONS,
  ANIMAL_ARMOR,
  ANIMAL_BEHAVIOR,
  ANIMAL_ENCOUNTER_THROW,
  BLANK_ENCOUNTER_COLUMN,
  animalCategoryForThrow,
  animalCombatantSpecs,
  animalEdibleMeatKg,
  animalSpeed,
  checkForAnimalEncounter,
  generateAnimalEncounter,
  isAnimalEdible,
  resolveAnimalReaction
} from './src/encounters/animals.js';

export {
  TYPE_S_SCOUT_COURIER_KEY,
  TYPE_S_SCOUT_COURIER,
  TYPE_A_FREE_TRADER_KEY,
  TYPE_A_FREE_TRADER,
  TYPE_R_SUBSIDIZED_MERCHANT_KEY,
  TYPE_R_SUBSIDIZED_MERCHANT,
  TYPE_M_SUBSIDIZED_MERCHANT_KEY,
  TYPE_M_SUBSIDIZED_MERCHANT,
  TYPE_Y_YACHT_KEY,
  TYPE_Y_YACHT,
  TYPE_C_CRUISER_KEY,
  TYPE_C_CRUISER,
  STANDARD_SHIP_DESIGN_KEYS,
  getStandardShipDesign
} from './src/starships/standard-designs.js';

export {
  DRIVE_LETTERS,
  DRIVE_POTENTIAL_HULL_SIZES,
  MAXIMUM_DRIVE_POTENTIAL,
  normalizeDriveLetter,
  drivePotentialHullSize,
  maximumDrivePotential,
  damagedDrivePotential
} from './src/starships/drive-potential.js';

export {
  HULL_TYPES,
  CUSTOM_HULL_PRICE_PER_TON_CR,
  CUSTOM_HULL_MINIMUM_PRICE_CR,
  CUSTOM_HULL_BUILD_MONTHS,
  MAXIMUM_CUSTOM_HULL_TONS,
  POWER_PLANTS,
  MANEUVER_DRIVES,
  JUMP_DRIVES,
  COMPUTER_MODELS,
  BRIDGE_TONS,
  BRIDGE_PRICE_MCR_PER_100_TONS,
  STATEROOM_TONS,
  STATEROOM_PRICE_MCR,
  LOW_BERTH_TONS,
  LOW_BERTH_PRICE_MCR,
  STREAMLINING_PRICE_MCR_PER_100_TONS,
  NAVAL_ARCHITECT_FEE_RATE,
  STANDARD_DESIGN_PRICE_REDUCTION,
  HARDPOINT_PRICE_MCR,
  FIRE_CONTROL_TONS_PER_TURRET,
  USED_TURRET_RESALE_RATE,
  TURRET_MOUNTS,
  TURRET_WEAPONS,
  ROUNDS_PER_LAUNCHER,
  RELOAD_TURNS_PER_LAUNCHER,
  MISSILE_PRICE_CR,
  SAND_CANISTER_PRICE_CR,
  SAND_CANISTER_MASS_KG,
  SHIP_VEHICLES,
  PROGRAM_CLASSES,
  COMPUTER_PROGRAMS,
  BASIC_SOFTWARE_PACKAGE_CREDIT_MCR,
  getComputerModel,
  getTurretWeapon,
  getTurretMount,
  getComputerProgram,
  maximumHardpoints,
  reloadTurnsFor
} from './src/starships/components.js';

export {
  generateNpcCharacter,
  generateCrewCandidate,
  CREW_ROLE_SKILLS,
  CREW_SEARCH_LIMIT,
  NPC_TERM_RANGE,
  NPC_GENERATION_ATTEMPTS
} from './src/characters/npc-generator.js';

export {
  costDesign,
  tonnageBudget
} from './src/starships/design-costing.js';

export {
  createPlanet,
  gravityAt,
  moveWithGravity,
  applyAtmosphericBraking,
  atmosphereBrakes,
  closestApproach,
  ATMOSPHERIC_BRAKING_BAND,
  BRAKING_ATMOSPHERES
} from './src/starships/planetary-gravity.js';

export {
  READY_CAPACITY,
  createLauncherState,
  validateLauncherState,
  advanceLauncherClock,
  startLauncherReload,
  assertTurretCanFire,
  fireLauncher,
  setTurretOperational,
  totalsAboard
} from './src/starships/launcher-ammunition.js';

export {
  placeVectorOrdnance,
  validateOrdnanceRuling,
  previewVectorOrdnance,
  moveVectorOrdnance,
  activateVectorSand,
  VECTOR_ORDNANCE_DEFAULT_RULING,
  obscuringSand,
  circleEntry
} from './src/starships/vector-ordnance.js';

export {
  enableVectorMovement,
  previewShipVector,
  commitShipVector,
  coastVectorShips,
  vectorRangeDM,
  configureVectorPlanet,
  adjudicateVectorSurface,
  applyVectorEscapes,
  shipVectorManeuver,
  VECTOR_ESCAPE_RANGE,
  VECTOR_ESCAPE_RANGE_IS_RAW
} from './src/starships/vector-movement.js';

export {
  SHIP_COMBAT_SIDES,
  SHIP_COMBAT_PHASES,
  SHIP_COMBAT_PHASE_KEYS,
  SHIP_COMBAT_OUTCOMES,
  GAME_TURN_MINUTES,
  LASER_HIT_THROW,
  SHIFTED_FIRE_DM,
  LASER_RANGE_DMS,
  ABBREVIATED_SAND_DM_PER_CANISTER,
  ABBREVIATED_SAND_DM_IS_RAW,
  PRESSURE_SECTIONS,
  VACC_SUIT_THROW,
  createShipCombatEncounter,
  currentPhase,
  actingSide,
  opposingSide,
  advanceShipCombatPhase,
  shipCombatPhaseActions,
  DAMAGE_CONTROL_THROW,
  damageControlSkill,
  damageControlOptions,
  declareDamageControl,
  stationVacated,
  stationActedThisTurn,
  cancelDamageControl,
  elapsedMinutes,
  participantsOnSide,
  getParticipant,
  computerCapacity,
  computerState,
  programInComputer,
  cycleIntoCpu,
  reprogramComputer,
  laserAttackDM,
  cpuFireOptions,
  MULTI_TARGET_PROGRAMS,
  MAXIMUM_TARGETS_PER_SHIP,
  multiTargetProgramFor,
  turretTargetLimit,
  bestCpuFireChoice,
  laserDefenseDM,
  allocateLaserFire,
  resolveLaserFire,
  returnFireEligibility,
  launchOrdnance,
  reloadLauncher,
  launcherStatus,
  moveOrdnance,
  ordnanceInFlight,
  resolveAntiMissileFire,
  detonateContactedOrdnance,
  ORDNANCE_STATUSES,
  ECM_DESTROY_THROW,
  ANTI_MISSILE_THROW,
  ABBREVIATED_MISSILE_CONTACT_IS_AUTOMATIC,
  ABBREVIATED_MISSILE_CONTACT_IS_RAW,
  declareFlight,
  creditShotAgainstEscape,
  surrender,
  participantStatus,
  shipCombatIntent,
  boardingAssessment,
  prepareBoardingAction,
  BOARDING_IS_RAW,
  BOARDING_STARTING_RANGE,
  SHIPS_LOCKER_DEFAULT_WEAPON,
  shipDisposition,
  SHIP_DISPOSITIONS,
  SHIP_DISPOSITIONS_ARE_RAW,
  shipCombatOutcome,
  shipDataCard,
  shipStations,
  stationsAwaitingDeclaration,
  markStationReady,
  sideAwaitingDeclaration,
  computerOperatorOf,
  throwComputerOperation,
  checkShipComputer
} from './src/starships/ship-combat.js';

export {
  HIT_LOCATION_TABLE,
  HIT_LOCATIONS,
  MISSILE_HIT_LOCATION_DM,
  FUEL_TONS_LOST_PER_HIT,
  FUEL_LOSS_JUMP_THRESHOLD,
  COMPUTER_BASE_OPERATION_THROW,
  COMPUTER_PERMANENT_FAILURE_HITS,
  DAMAGE_REPAIR_THROW,
  emptyDamageState,
  rollHitLocation,
  currentDriveState,
  canDoubleFire,
  fuelDamage,
  releaseFuelFromHit,
  computerOperation,
  turretOperational,
  operationalTurrets,
  hullDecompressed,
  selectTurretHit,
  applyHitToDamage,
  damageReport,
  repairableLocations
} from './src/starships/damage.js';

export {
  turretWeapons,
  turretDataCardCode,
  shipIsArmed,
  shipGunnerRequirement,
  armShipTurret,
  SPECULATIVE_ITEM_TONS,
  speculativeTonsPerUnit,
  speculativeCargoUnits,
  stripShipTurret,
  fitShipTurret,
  quoteComputerRefit,
  refitShipComputer,
  COMPUTER_TRADE_IN_RATE,
  shipHardpoints,
  magazineCapacity,
  purchaseOrdnance
} from './src/starships/operations.js';

export {
  SHIP_DOCUMENT_TYPE,
  CURRENT_SHIP_DOCUMENT_SCHEMA_VERSION,
  SUPPORTED_SHIP_DOCUMENT_SCHEMA_VERSIONS,
  ShipDocumentValidationError,
  applyRefit,
  refitComputerSpecification,
  computerJumpLimit,
  REFIT_FIRE_CONTROL_TONS,
  createShipDocument,
  validateShipDocument,
  assertValidShipDocument,
  exportShipDocument,
  importShipDocument,
  migrateShipDocument,
  updateShipIdentity,
  updateShipAssignedCharacterName,
  createTypeSScoutReserveShipForCharacter,
  SHIP_CREW_ROLES,
  MAXIMUM_ROLES_PER_CREW_MEMBER,
  DOUBLED_ROLE_SALARY_RATE,
  shipCrewMemberRoles,
  assignShipCrew,
  applyShipHit,
  applyMissileDetonation,
  repairShipDamage,
  clearShipDamage,
  releaseShipCrew,
  shipCrewRole
} from './src/starships/ship-document.js';




export {
  REFINED_FUEL_COST_PER_TON_CR,
  UNREFINED_FUEL_COST_PER_TON_CR,
  BASE_BERTHING_COST_CR,
  HIGH_PASSENGERS_PER_STEWARD,
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
  debitShipAccount,
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
  sellSpeculativeCargo,
  CREW_SALARIES_CR,
  crewMemberSalaryCr,
  calculateMonthlyCrewSalaries,
  annualMaintenanceCr,
  shipCashPriceCr,
  summariseShipVoyages,
  shipDistributableCr,
  shipUpkeepDue,
  chargeShipUpkeep,
  SALARY_PERIOD_DAYS,
  MAINTENANCE_PERIOD_DAYS,
  transferShipCreditsToCharacter,
  speculativeLotPosition,
  ANNUAL_MAINTENANCE_RATE,
  MAINTENANCE_WEEKS,
  MAINTENANCE_STARPORTS,
  shipMortgage,
  MORTGAGE_DOWN_PAYMENT_RATE,
  MORTGAGE_MONTHLY_DIVISOR,
  MORTGAGE_TERM_MONTHS,
  MORTGAGE_PERIOD_DAYS,
  financeShip,
  shipMortgageSchedule,
  MAINTENANCE_DAYS,
  shipMaintenanceStatus,
  performMaintenance,
  FINANCING_RESTRICTED_DESIGNS,
  SUBSIDY_MINIMUM_HULL_TONS,
  SUBSIDY_GROSS_RECEIPTS_SHARE,
  applySubsidyShare
} from './src/starships/operations.js';

// v0.68.0: software, departure and the jump (1982 malfunctions).
export {
  BASIC_SOFTWARE_PACKAGE_IS_RAW,
  flightSoftware,
  basicSoftwarePackage,
  GENERATE_DELIVERED_DESIGNS,
  scoutFlightSoftware,
  deliveredSoftwarePackage,
  softwarePackageCostMCr
} from './src/starships/software.js';

export {
  shipCarriesProgram,
  purchaseComputerProgram
} from './src/starships/operations.js';

export { MALFUNCTION_DRIVES } from './src/starships/ship-document.js';

export {
  UNREFINED_FUEL_EQUIPPED_DESIGNS,
  ENGINEER_TONS_PER_ENGINEER,
  shipEquippedForUnrefinedFuel,
  installedDriveTons,
  shipCrewRequirements,
  missingEngineers,
  misjumpDMParts,
  driveFailureDMParts,
  departureChecklist,
  MISJUMP_THROW,
  MISJUMP_DESTROYED_THROW,
  JUMP_WEEK_DAYS,
  hexInDirection,
  rollMisjump,
  DRIVE_FAILURE_THROW,
  DRIVE_SECTION_FAILURE_THROW,
  DRIVE_REPAIR_THROW,
  BATTERY_DAYS,
  rollDriveFailure,
  applyDriveFailure,
  attemptDriveRepair,
  DRIVE_REPAIR_STARPORTS,
  completeDriveRepair,
  attendingEngineerExpertise,
  REPAIR_PARTS_CREW_INSTALL_DM,
  REPAIR_PARTS_MAX_PERCENT,
  quoteStarportDriveRepair,
  repairDrivesAtStarport,
  shipBatteryStatus,
  HIJACK_THROW,
  ANTI_HIJACK_BRIDGE_THROW,
  rollHijackAttempt,
  rollHijackersReachBridge,
  beginJump,
  resolveJumpWeek
} from './src/starships/jump.js';

// v0.69.0: arrival (Book 2 pp.2-3, 8, 15, 36).
export {
  uniformInteger,
  LOW_BERTH_REVIVAL_THROW,
  attendingMedicExpertise,
  lowBerthRevivalDMParts,
  rollLowBerthRevival,
  rollPassengerEndurance,
  LOTTERY_STAKE_PER_LOW_PASSAGE_CR,
  rollLowPassageLottery,
  settleLowPassageLottery,
  shipHasSteward,
  reviveLowPassengers,
  SHUTTLE_FARE_RATE,
  SHUTTLE_FREIGHT_PER_TON_CR,
  SHUTTLE_SERVICE_STARPORTS,
  shuttleFareCr,
  shipCarriesSmallCraft,
  orbitalTransfer,
  shuttleFreightCostCr,
  chargeShuttleFreight,
  REPOSSESSION_AVOID_THROW,
  REPOSSESSION_FORMS,
  repossessionDMParts,
  rollRepossession,
  checkRepossession,
  impoundShip,
  shipImpound,
  releaseImpound,
  PRIVATE_MESSAGE_RECIPIENTS,
  rollPrivateMessage,
  acceptPrivateMessage,
  deliverPrivateMessages,
  SHIP_REACTION_HOSTILE_MAX,
  SHIP_REACTION_FRIENDLY_MIN,
  HAIL_ENCOUNTER_KEYS,
  INSPECTION_ENCOUNTER_KEYS,
  HAIL_BROKER_TIP_DM,
  REACTION_ATTACK_THROWS,
  shipEncounterReactionDMParts,
  shipReactionStance,
  rollReactionAttack,
  resolveHail,
  inspectionTollCr,
  resolveInspection,
  payInspectionToll,
  grantBrokerTip,
  portCallBrokerTipDM,
  spendBrokerTip
} from './src/starships/arrival.js';

// v0.67.0: the game calendar and the campaign clock.
export {
  DAYS_PER_YEAR,
  DAYS_PER_MONTH,
  parseGameDate,
  isGameDate,
  assertGameDate,
  formatGameDate,
  addDays,
  daysBetween,
  compareGameDates,
  earliestGameDate,
  monthsElapsed,
  ageMonthsElapsed
} from './src/time/dates.js';

export {
  CLOCK_EVENT_KINDS,
  nextDueDates,
  advanceClock
} from './src/time/clock.js';

export {
  anchorCharacterChronology,
  characterIsAnchored,
  characterAgeAt,
  ageCharacterDocumentTo,
  characterAgingDue,
  characterAgingCheckDate,
  resolveCharacterAging
} from './src/characters/play-aging.js';

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
  generatePatronContact,
  rollShipEncounter,
  rollPatrolOrPirateHull,
  shipEncounterStarportDM,
  SHIP_ENCOUNTER_TABLE,
  SHIP_ENCOUNTER_TYPES,
  SHIP_ENCOUNTER_STARPORT_DMS
} from './src/encounters/patrons.js';

export {
  REFEREE_SKILL_CHECK_BASIS,
  resolveRefereeSkillCheck
} from './src/skills/referee-checks.js';

export {
  PERSONAL_COMBAT_RANGES,
  PERSONAL_ARMOR_TYPES,
  PERSONAL_COMBAT_STATUSES,
  PERSONAL_MOVEMENT_STATUSES,
  PERSONAL_MOVEMENT_PACES,
  PERSONAL_WEAPONS,
  getPersonalWeapon,
  personalWeaponSkillLevel,
  personalWeaponExpertise,
  hasPersonalWeaponExpertise,
  PERSONAL_EXPERTISE_FLOOR,
  weaponCharacteristicDM,
  weaponTargetNumber,
  WEAPONS_MATRIX,
  RANGE_MATRIX,
  BASIC_HIT_THROW,
  evasionDefenseDM,
  createPersonalCombatant,
  resolvePersonalSurprise,
  movePersonalCombatRange,
  personalMovementBands,
  personalMovementConsequences,
  applyPersonalDamage,
  rollPersonalAttack,
  previewPersonalAttack,
  classifyBlow,
  blowsRemaining,
  parryExpertise,
  improvisedMeleeWeapons,
  PISTOL_CLUB_KEYS,
  LONG_GUN_PARRY_KEYS,
  BLOW_CLASSES,
  TERRAIN_DMS,
  ENCOUNTER_RANGE_TABLE,
  encounterRangeForThrow,
  rollEncounterRange,
  SURPRISE_DMS,
  surpriseDMTotal,
  SITUATION_DMS,
  situationDMTotal,
  resolvePersonalAttack,
  MORALE_DMS,
  moraleDMParts,
  resolvePersonalMorale,
  endPersonalCombatRecovery,
  ANIMAL_WOUND_MODES,
  createAnimalCombatant
} from './src/combat/personal-combat.js';

export {
  ANIMAL_TERRAIN_TYPES_1982,
  ANIMAL_TERRAIN_KEYS_1982,
  ANIMAL_ENCOUNTER_COLUMNS_1982,
  ANIMAL_CATEGORIES_1982,
  ANIMAL_TYPES_1982,
  ANIMAL_ATTRIBUTES_1982,
  ANIMAL_SIZES_1982,
  ANIMAL_WEAPONS_1982,
  ANIMAL_ARMOR_1982,
  ANIMAL_WEAPON_DMS_1982,
  ANIMAL_ARMOR_DMS_1982,
  ANIMAL_CHARACTERISTICS_1982,
  ANIMAL_ENCOUNTER_CHECK_1982,
  animalAttributeDM,
  animalPlanetSizeDM,
  animalBehaviourCode,
  animalDisplayName,
  fixedAnimalWound,
  rollAnimalWound,
  generateAnimalTableEntry,
  generateAnimalEncounterTable,
  rollAnimalTableRow,
  resolveAnimalBehaviour,
  TAINTED_ATMOSPHERES,
  butcherAnimal
} from './src/encounters/animals-1982.js';

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

// v0.70.0: charted space lanes (Book 3 p.2-3).
export {
  JUMP_ROUTES_TABLE,
  MAX_ROUTE_DISTANCE,
  routePairKey,
  jumpRouteThrow,
  rollJumpRoutes,
  subsectorRoutes,
  laneBetween,
  lanesFrom
} from './src/worlds/routes.js';

// v0.75.0: Book 3 (1977) pp.7, 19-21 random person encounters and the law
// level's throw to avoid arrest.
export {
  RANDOM_PERSON_ENCOUNTERS,
  EXTRAORDINARY_WEAPONS,
  personEncounterCheck,
  rollExtraordinaryWeapon,
  rollPersonEncounter,
  lawArrestThrow,
  weaponsViolationJailDays,
  legalEncounterCheck,
  rollLegalEncounter,
  hasLocalPopulation,
  PATRON_LISTS,
  patronMatrixDMs,
  patronCheck,
  rollPatron,
  RUMOR_TYPES,
  RUMOR_MATRIX,
  rumorCheck,
  rollRumor
} from './src/encounters/persons.js';

// v0.78.0: Book 3 (1977) star mapping and world creation; sectors.
export {
  WORLD_PRESENT_MIN, STARPORT_TABLE, NAVAL_BASE_THROW, SCOUT_BASE_THROW, GAS_GIANT_PRESENT_MAX,
  techLevelDMs, rollStarport, generateWorldProfile, rollBases, generateWorldName, generateSubsector,
  SUBSECTOR_LETTERS, subsectorOffset, sectorHex, subsectorOfSectorHex, neighbouringSubsectors, sectorMap, rollNewLanes, rollLanesBetween
} from './src/worlds/generation.js';
export { SECTOR_COLUMNS, SECTOR_ROWS } from './src/worlds/subsector.js';
export { npcRandom, withNpcRandom } from './src/npc-random.js';

// v0.79.0: patron missions for solo play (original, not rules text).
export { MISSION_KINDS, MISSION_TASKS, draftPatronMission, throwMissionTask, missionTaskDays } from './src/encounters/missions.js';
// 0.81.0: rumours written from game facts (original tables, not rules text).
export { RUMOR_CONTENT, draftRumor } from './src/encounters/rumor-facts.js';

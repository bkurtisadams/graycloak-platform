import {
  CHARGEN_ACTIONS,
  CHARGEN_PHASES,
  createDice,
  createCharacter,
  createCharacterDocument,
  createTypeSScoutReserveShipForCharacter,
  exportCharacter,
  exportCharacterDocument,
  exportShipDocument,
  importCharacterDocument,
  linkCharacterToShip,
  performChargenAction,
  updateCharacterShipReference,
  updateCharacterGameplayState,
  updateShipAssignedCharacterName,
  updateShipIdentity,
  SUBSECTOR_COLUMNS,
  SUBSECTOR_ROWS,
  formatSubsectorHex,
  getJumpDestinations,
  getSubsectorSystem,
  jumpDistanceBetweenSystems,
  parseUniversalWorldProfile,
  starportFuelService,
  calculateBerthingCost,
  canShipMakeJump,
  consumeJumpFuel,
  transferCharacterCreditsToShip,
  creditShipAccount,
  purchaseShipFuel,
  refuelShipToCapacity,
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
  generatePassengerDemand,
  generateFreightOffers,
  generateSpeculativeTradeOffer,
  calculateSpeculativePurchaseCost,
  quoteSpeculativeResale,
  PASSAGE_FARES_CR,
  FREIGHT_RATE_PER_TON_CR,
  generatePatronContact,
  resolveRefereeSkillCheck,
  getPersonalWeapon,
  previewPersonalAttack,
  blowsRemaining,
  PERSONAL_WEAPONS,
  PERSONAL_ARMOR_TYPES
} from '../vendor/classic-traveller-rules/index.js';

import {
  ACTION_LABELS,
  buildCampaignRecord,
  buildAdventureThreadRecord,
  buildEncounterRecord,
  buildContractBoardPanel,
  panelCard,
  panelRow,
  buildCharacterRecord,
  buildFinalCharacterRecord,
  buildGenerationLog,
  formatHistoryEvent,
  buildJumpPlan,
  buildPortServicesPanel,
  buildShipRecord,
  buildProcedure,
  buildPlayProcedure,
  buildServiceHistory,
  buildSituationRecord,
  buildSystemRecord,
  helpForTopic,
  nobleTitleLabel,
  serviceName
} from './ui-model.js';

import {
  TRAVELLER_DOCUMENT_KINDS,
  loadTravellerDocument
} from './document-loader.js';

import { createTravellerInvite, generateInviteCode, unassignedWorld, importCharacterRecord, WORLD_KINDS } from '../src/character-record.js';
import { createCampaignHome, nextCampaignHome, importCampaignHome, campaignHomeBytes, StaleCampaignHomeError, CAMPAIGN_HOME_SOFT_LIMIT_BYTES } from '../src/campaign-home.js';
import { createSceneDocument, updateSceneDocument, sceneFolders, sceneBoardMeters, sceneBoardCells, placeSceneToken, moveSceneToken, removeSceneToken, setSceneTokenCombat, clearSceneCombatTracker, trackedSceneTokens, SCENE_MIN_SQUARES, SCENE_MAX_METERS } from '../src/scene-document.js';
import { directoryFolders } from '../src/campaign-document.js';
import { createSceneCanvas, svgNode as sceneSvgNode } from './scene-canvas.js';
import { TRAY_DICE, rollFormula, formatRoll, createChatMessage, interpretChatInput, parseRollFormula } from '../src/dice-tray.js';

import {
  SHEET_CHARACTERISTICS as HEADER_CHARACTERISTICS,
  appendSheetDatum,
  renderSheetBenefitRows as renderSheetBenefitRowsView,
  renderChargenSheet as renderChargenSheetView,
  renderChargenActions,
  renderChargenTables as renderChargenTablesView
} from './chargen-view.js';

import {
  generateCharacterName,
  generateShipName,
  generateShipRegistry
} from './generators.js';

import {
  SUBSECTOR_SVG_GEOMETRY,
  createSvgNode,
  flatTopHexPoints,
  formatSvgPoints,
  renderSubsectorMap,
  splitSystemName,
  subsectorHexCenter,
  subsectorSvgViewBox
} from './subsector-svg.js';

import {
  seededDice,
  campaignDateKey,
  campaignWeekKey,
  routeMarketSeed,
  weeklyTradeSeed,
  saleQuoteSeed
} from './commerce-market.js';

import {
  addCharacterToCampaign,
  addShipToCampaign,
  addContractToCampaign,
  addSituationToCampaign,
  addEncounterToCampaign,
  addNpcActorToCampaign,
  addMediaAssetToCampaign,
  addActivityLogToCampaign,
  addContactToCampaign,
  addAdventureThreadToCampaign,
  advanceCampaignDays,
  advanceCampaignSeconds,
  campaignDirectory,
  setDocumentOwner,
  setCampaignOwner,
  markCampaignPublished,
  campaignIsPublished,
  campaignClockLabel,
  COMBAT_ROUND_SECONDS,
  createCampaignDocument,
  refreshCampaignDocumentRefs,
  updateCampaignIdentity,
  updateCampaignLocation,
  updateCampaignTime,
  speculativeLotPurchasedQuantity,
  recordSpeculativeLotPurchase,
  addSceneToCampaign, removeSceneFromCampaign, setActiveCampaignScene
} from '../src/campaign-document.js';

import {
  NPC_CONDITIONS,
  createNpcActorDocument,
  updateNpcActorDocument,
  importNpcActorDocument,
  activeNpcActorConditions,
  setNpcActorCondition,
  clearNpcActorConditions
} from '../src/npc-actor-document.js';
import { synchronizeEncounterDocuments } from '../src/combatant-document-sync.js';
import { chooseNpcDeclaration, pendingNpcDeclarations } from '../src/npc-tactics.js';
import { initAuth, onAuthChange, signOutOfTraveller, currentUserId, authStatus } from './auth.js';
import { openSignInDialog } from './signin-ui.js';
import { publishCampaign, publishEncounterView, publishStatus, seatPlayer, unseatPlayer, listSeatedPlayers, watchDeclarations, clearDeclarations, watchTokenMoves, clearTokenMove, watchCanvasPresence, publishPlayerCharacter, removePlayerCharacter, publishPlayerLog, createInvite, deleteInvite, listCampaignInvites, watchJoinRequests, deleteJoinRequest, setCharacterRecordWorldRemote, saveCampaignHome, loadCampaignHome, loadCharacterRecord, sendChatMessage, watchChat } from './publish.js';
import { authorizePlayerDeclaration } from '../src/player-declaration.js';
import { authorizePlayerTokenMove, playerMoveToCombatantMove, authorizePlayerSceneMove } from '../src/player-token-movement.js';
import { buildPublishedView, buildPublishedCampaign, buildPublishedCharacter, buildPublishedLog, buildPublishedScene } from '../src/published-view.js';
import { createMediaAssetDocument, importMediaAssetDocument } from '../src/media-asset-document.js';
import {
  ACTIVITY_VISIBILITY,
  createActivityLogDocument,
  appendActivityLogEntry,
  clearActivityLogDocument,
  importActivityLogDocument,
  visibleActivityLogEntries
} from '../src/activity-log-document.js';

import {
  PLAYER_ROLES,
  createPlayerSession,
  createPlayerSessionStore,
  setPlayerViewedCharacter
} from '../src/player-session.js';

import {
  QUICK_SLOT_LIMIT,
  createQuickSlotStore,
  defaultQuickSlots,
  normalizeQuickSlots,
  resolveQuickSlots
} from './quick-slots.js';

import {
  exportCampaignBundle
} from '../src/campaign-bundle.js';

import {
  createDocumentRegistry
} from '../src/document-registry.js';

import {
  createActivityLogStore
} from '../src/activity-log.js';

import {
  CONTRACT_DOCUMENT_TYPE,
  createContractDocument,
  completeContractDocument,
  failContractDocument,
  importContractDocument,
  isContractOverdue,
  reconcileContractDeadlines
} from '../src/contract-document.js';

import {
  SITUATION_DOCUMENT_TYPE,
  createSituationDocument,
  importSituationDocument,
  resolveSituationDocument
} from '../src/situation-document.js';

import {
  createEncounterDocument,
  importEncounterDocument,
  resolveEncounterRound,
  avoidEncounter,
  encounterRangeGuide,
  repositionEncounterCombatant,
  moveEncounterCombatantByPlayer,
  encounterPairRange,
  declareEncounterAction,
  encounterSituationDMs,
  setEncounterLighting,
  setEncounterGridScale,
  setCombatantCover,
  setCombatantFoldingStock,
  setCombatantStatus,
  setCombatantTactics,
  endEncounterByReferee,
  ENCOUNTER_LIGHTING,
  COMBATANT_COVER,
  resolveDeclaredRound,
  undeclaredCombatantIds,
  encounterMapDistance,
  declaredTargetCounts,
  addEncounterCombatantFromActor,
  removeEncounterCombatant,
  setEncounterCombatantCondition, opponentSpecFromNpcActor } from '../src/encounter-document.js';

import {
  createContactDocument,
  importContactDocument,
  touchContactDocument
} from '../src/contact-document.js';

import {
  importAdventureThreadDocument,
  linkAdventureThreadDocument
} from '../src/adventure-thread-document.js';

import {
  arrivalSituationEventKey,
  patronSituationEventKey,
  generateArrivalSituationOffer,
  buildPatronSituationOffer
} from '../world/situation-events.js';

import {
  generateContractBoard
} from '../world/contract-board.js';

import {
  applySituationThreadConsequences
} from '../world/thread-consequences.js';

import {
  FAR_MERIDIAN_SUBSECTOR
} from '../world/far-meridian-subsector.js';

const el = {
  status: document.querySelector('#system-status'),
  appTitle: document.querySelector('#app-title'),
  appSubtitle: document.querySelector('#app-subtitle'),
  headerCampaignName: document.querySelector('#header-campaign-name'),
  campaignMenu: document.querySelector('#campaign-menu'),
  refereeMenu: document.querySelector('#referee-menu'),
  refereeNewNpc: document.querySelector('#referee-new-npc'),
  autosaveStatus: document.querySelector('#autosave-status'),
  toggleActivity: document.querySelector('#toggle-activity'),
  terminal: document.querySelector('.terminal'),
  campaignHeader: document.querySelector('.campaign-header-strip'),
  headerCharacterName: document.querySelector('#header-character-name'),
  headerUpp: document.querySelector('#header-upp'),
  headerStatus: document.querySelector('#header-status'),
  headerPosture: document.querySelector('#header-posture'),
  headerCredits: document.querySelector('#header-credits'),
  mastheadDate: document.querySelector('#masthead-date'),
  headerCharacteristics: document.querySelector('#header-characteristics'),
  headerQuickSkills: document.querySelector('#header-quick-skills'),
  headerAllSkills: document.querySelector('#header-all-skills'),
  quickSlotDialog: document.querySelector('#quick-slot-dialog'),
  quickSlotForm: document.querySelector('#quick-slot-form'),
  quickSlotChoices: document.querySelector('#quick-slot-choices'),
  quickSlotCount: document.querySelector('#quick-slot-count'),
  quickSlotClose: document.querySelector('#quick-slot-close'),
  quickSlotReset: document.querySelector('#quick-slot-reset'),
  quickSlotCancel: document.querySelector('#quick-slot-cancel'),
  openShipView: document.querySelector('#open-ship-view'),
  openCampaignView: document.querySelector('#open-campaign-view'),
  openThreadsView: document.querySelector('#open-threads-view'),
  procedureScope: document.querySelector('#procedure-scope'),
  playProcedure: document.querySelector('#play-procedure'),
  footerCurrentName: document.querySelector('#footer-current-name'),
  footerCurrentMeta: document.querySelector('#footer-current-meta'),
  contextTabs: document.querySelector('#context-tabs'),
  contextTakeover: document.querySelector('#context-takeover'),
  chargenTablesSection: document.querySelector('#chargen-tables-section'),
  chargenTables: document.querySelector('#chargen-tables'),
  personnelSection: document.querySelector('#personnel-section'),
  procedureSection: document.querySelector('#procedure-section'),
  chargenRecordSection: document.querySelector('#chargen-record-section'),
  name: document.querySelector('#character-name'),
  randomCharacterName: document.querySelector('#random-character-name'),
  recordHeading: document.querySelector('#record-heading'),
  recordHelp: document.querySelector('#record-help'),
  record: document.querySelector('#character-record'),
  legacyPersonnelFields: document.querySelector('#legacy-personnel-fields'),
  characterSheet: document.querySelector('#character-sheet'),
  sheetName: document.querySelector('#sheet-name'),
  sheetDate: document.querySelector('#sheet-date'),
  sheetUpp: document.querySelector('#sheet-upp'),
  sheetRank: document.querySelector('#sheet-rank'),
  sheetAge: document.querySelector('#sheet-age'),
  sheetWorld: document.querySelector('#sheet-world'),
  sheetCharacteristics: document.querySelector('#sheet-characteristics'),
  sheetHealthStatus: document.querySelector('#sheet-health-status'),
  sheetService: document.querySelector('#sheet-service'),
  sheetWeapon: document.querySelector('#sheet-weapon'),
  sheetArmor: document.querySelector('#sheet-armor'),
  sheetEquipment: document.querySelector('#sheet-equipment'),
  sheetSkills: document.querySelector('#sheet-skills'),
  sheetBenefits: document.querySelector('#sheet-benefits'),
  sheetHistoryRecord: document.querySelector('#sheet-history-record'),
  sheetNotes: document.querySelector('#sheet-notes'),
  procedure: document.querySelector('#procedure'),
  actions: document.querySelector('#actions'),
  serviceHistory: document.querySelector('#service-history'),
  generationLog: document.querySelector('#generation-log'),
  shipSection: document.querySelector('#ship-section'),
  shipName: document.querySelector('#ship-name'),
  shipRegistry: document.querySelector('#ship-registry'),
  randomShipName: document.querySelector('#random-ship-name'),
  generateShipRegistry: document.querySelector('#generate-ship-registry'),
  shipRecord: document.querySelector('#ship-record'),
  helpPanel: document.querySelector('#context-help'),
  helpTitle: document.querySelector('#help-title'),
  helpBody: document.querySelector('#help-body'),
  closeHelp: document.querySelector('#close-help'),
  newCharacter: document.querySelector('#new-character'),
  newCharacterFromCampaign: document.querySelector('#new-character-from-campaign'),
  saveCharacter: document.querySelector('#save-character'),
  loadCharacter: document.querySelector('#load-character'),
  loadFile: document.querySelector('#load-file'),
  newCampaign: document.querySelector('#new-campaign'),
  addCharacterToCampaign: document.querySelector('#add-character-to-campaign'),
  saveCampaign: document.querySelector('#save-campaign'),
  loadCampaign: document.querySelector('#load-campaign'),
  reloadCampaignCloud: document.querySelector('#reload-campaign-cloud'),
  importCampaign: document.querySelector('#import-campaign'),
  exportCampaign: document.querySelector('#export-campaign'),
  campaignSection: document.querySelector('#campaign-section'),
  campaignName: document.querySelector('#campaign-name'),
  campaignDay: document.querySelector('#campaign-day'),
  campaignYear: document.querySelector('#campaign-year'),
  campaignSystem: document.querySelector('#campaign-system'),
  campaignWorld: document.querySelector('#campaign-world'),
  campaignActiveCharacter: document.querySelector('#campaign-active-character'),
  campaignRecord: document.querySelector('#campaign-record'),
  threadSection: document.querySelector('#thread-section'),
  threadRecord: document.querySelector('#thread-record'),
  subsectorSection: document.querySelector('#subsector-section'),
  subsectorHeading: document.querySelector('#subsector-heading'),
  sceneTabs: [...document.querySelectorAll('[data-scene-tab]')],
  sceneTabsRow: document.querySelector('.scene-tabs'),
  sceneStatusStrip: document.querySelector('#scene-status-strip'),
  sceneShipName: document.querySelector('#scene-ship-name'),
  sceneShipMeta: document.querySelector('#scene-ship-meta'),
  subsectorName: document.querySelector('#subsector-name'),
  jumpCapability: document.querySelector('#jump-capability'),
  subsectorLegend: document.querySelector('#subsector-legend'),
  subsectorMap: document.querySelector('#subsector-map'),
  jumpPlan: document.querySelector('#jump-plan'),
  jumpActions: document.querySelector('#jump-actions'),
  liveShipPanel: document.querySelector('#live-ship-panel'),
  liveShipIdentity: document.querySelector('#live-ship-identity'),
  liveShipStatus: document.querySelector('#live-ship-status'),
  mapZoomOut: document.querySelector('#map-zoom-out'),
  mapZoomLabel: document.querySelector('#map-zoom-label'),
  mapZoomIn: document.querySelector('#map-zoom-in'),
  mapZoomFit: document.querySelector('#map-zoom-fit'),
  systemRecordSection: document.querySelector('#system-record-section'),
  systemRecordHeading: document.querySelector('#system-record-heading'),
  systemRecord: document.querySelector('#system-record'),
  selectedSystemSummary: document.querySelector('#selected-system-summary'),
  selectedSystemSummaryText: document.querySelector('#selected-system-summary-text'),
  toggleSystemDetails: document.querySelector('#toggle-system-details'),
  portServicesSection: document.querySelector('#port-services-section'),
  portServicesRecord: document.querySelector('#port-services-record'),
  portActions: document.querySelector('#port-actions'),
  commerceSection: document.querySelector('#commerce-section'),
  commerceRecord: document.querySelector('#commerce-record'),
  commerceActions: document.querySelector('#commerce-actions'),
  contractSection: document.querySelector('#contract-section'),
  contractRecord: document.querySelector('#contract-record'),
  contractActions: document.querySelector('#contract-actions'),
  situationSection: document.querySelector('#situation-section'),
  situationRecord: document.querySelector('#situation-record'),
  situationActions: document.querySelector('#situation-actions'),
  encounterSection: document.querySelector('#encounter-section'),
  encounterDetails: document.querySelector('#encounter-details'),
  encounterRecord: document.querySelector('#encounter-record'),
  encounterRailSection: document.querySelector('#combat-rail-section'),
  encounterSelectionStatus: document.querySelector('#encounter-selection-status'),
  encounterRangePair: document.querySelector('#encounter-range-pair'),
  encounterRangeButtons: [...document.querySelectorAll('[data-encounter-range]')],
  encounterRangeGrid: document.querySelector('#encounter-range-grid'),
  encounterGridToggle: document.querySelector('#encounter-grid-toggle'),
  encounterGridScale: document.querySelector('#encounter-grid-scale'),
  encounterGridLegend: document.querySelector('#encounter-grid-legend'),
  encounterMapViewport: document.querySelector('#encounter-map-viewport'),
  encounterMap: document.querySelector('#encounter-map'),
  encounterZoomOut: document.querySelector('#encounter-zoom-out'),
  encounterZoomLabel: document.querySelector('#encounter-zoom-label'),
  encounterZoomIn: document.querySelector('#encounter-zoom-in'),
  encounterZoomFit: document.querySelector('#encounter-zoom-fit'),
  encounterMovePace: document.querySelector('#encounter-move-pace'),
  encounterPartyRoster: document.querySelector('#encounter-party-roster'),
  encounterLighting: document.querySelector('#encounter-lighting'),
  encounterTracker: document.querySelector('#encounter-tracker'),
  encounterResolve: document.querySelector('#encounter-resolve'),
  encounterRoster: document.querySelector('#encounter-roster'),
  encounterTokenTooltip: document.querySelector('#encounter-token-tooltip'),
  encounterTokenMenu: document.querySelector('#encounter-token-menu'),
  operationsTabPort: document.querySelector('#operations-tab-port'),
  operationsTabTrade: document.querySelector('#operations-tab-trade'),
  operationsTabJobs: document.querySelector('#operations-tab-jobs'),
  operationsTabRoster: document.querySelector('#operations-tab-roster'),
  rosterSection: document.querySelector('#roster-section'),
  publishStatusLine: document.querySelector('#publish-status'),
  openPlayers: document.querySelector('#open-players'),
  playersDialog: document.querySelector('#players-dialog'),
  playersSeated: document.querySelector('#players-seated'),
  playersUid: document.querySelector('#players-uid'),
  playersName: document.querySelector('#players-name'),
  playersCharacter: document.querySelector('#players-character'),
  playersSeat: document.querySelector('#players-seat'),
  playersStatus: document.querySelector('#players-status'),
  playersClose: document.querySelector('#players-close'),
  playersInviteList: document.querySelector('#players-invite-list'),
  chatComposer: document.querySelector('#chat-composer'),
  chatForm: document.querySelector('#chat-form'),
  chatInput: document.querySelector('#chat-input'),
  diceTray: document.querySelector('#dice-tray'),
  playersNewInvite: document.querySelector('#players-new-invite'),
  playersJoins: document.querySelector('#players-joins'),
  publishCampaignButton: document.querySelector('#publish-campaign'),
  publishViewButton: document.querySelector('#publish-view'),
  accountName: document.querySelector('#account-name'),
  accountButton: document.querySelector('#account-button'),
  directoryActors: document.querySelector('#directory-actors'),
  directoryVehicles: document.querySelector('#directory-vehicles'),
  directoryScenes: document.querySelector('#directory-scenes'),
  sceneDialog: document.querySelector('#scene-dialog'),
  sceneClose: document.querySelector('#scene-close'),
  sceneName: document.querySelector('#scene-name'),
  sceneFolder: document.querySelector('#scene-folder'),
  sceneFolderList: document.querySelector('#scene-folder-list'),
  sceneSquares: document.querySelector('#scene-squares'),
  sceneScale: document.querySelector('#scene-scale'),
  sceneSizeNote: document.querySelector('#scene-size-note'),
  sceneSave: document.querySelector('#scene-save'),
  sceneStatus: document.querySelector('#scene-status'),
  combatScene: document.querySelector('#combat-scene'),
  rosterFolders: document.querySelector('#roster-folders'),
  rosterNewActor: document.querySelector('#roster-new-actor'),
  rollDialog: document.querySelector('#roll-dialog'),
  rollDialogForm: document.querySelector('#roll-dialog-form'),
  rollDialogTitle: document.querySelector('#roll-dialog-title'),
  rollDialogBasis: document.querySelector('#roll-dialog-basis'),
  rollTargetRow: document.querySelector('#roll-target-row'),
  rollTarget: document.querySelector('#roll-target'),
  rollTargetSuffix: document.querySelector('#roll-target-suffix'),
  rollBuiltIn: document.querySelector('#roll-built-in'),
  rollModifier: document.querySelector('#roll-modifier'),
  rollSubmit: document.querySelector('#roll-submit'),
  rollCancel: document.querySelector('#roll-cancel'),
  rollDialogClose: document.querySelector('#roll-dialog-close'),
  combatSetupDialog: document.querySelector('#combat-setup-dialog'),
  combatSetupForm: document.querySelector('#combat-setup-form'),
  combatSetupClose: document.querySelector('#combat-setup-close'),
  combatSetupCancel: document.querySelector('#combat-setup-cancel'),
  combatEnemyGroups: document.querySelector('#combat-enemy-groups'),
  combatAddEnemyType: document.querySelector('#combat-add-enemy-type'),
  combatRosterActor: document.querySelector('#combat-roster-actor'),
  combatAddRosterActor: document.querySelector('#combat-add-roster-actor'),
  combatEnemyName: document.querySelector('#combat-enemy-name'),
  combatEnemyCount: document.querySelector('#combat-enemy-count'),
  combatEnemyStr: document.querySelector('#combat-enemy-str'),
  combatEnemyDex: document.querySelector('#combat-enemy-dex'),
  combatEnemyEnd: document.querySelector('#combat-enemy-end'),
  combatEnemyInt: document.querySelector('#combat-enemy-int'),
  combatEnemyWeapon: document.querySelector('#combat-enemy-weapon'),
  combatEnemySkill: document.querySelector('#combat-enemy-skill'),
  combatEnemyArmor: document.querySelector('#combat-enemy-armor'),
  combatStartingRange: document.querySelector('#combat-starting-range'),
  combatMapScale: document.querySelector('#combat-map-scale'),
  combatPartyVehicle: document.querySelector('#combat-party-vehicle'),
  combatPartyBattleDress: document.querySelector('#combat-party-battledress'),
  combatEnemyVehicle: document.querySelector('#combat-enemy-vehicle'),
  combatEnemyBattleDress: document.querySelector('#combat-enemy-battledress'),
  combatEnemyPouncer: document.querySelector('#combat-enemy-pouncer'),
  encounterPlacementDialog: document.querySelector('#encounter-placement-dialog'),
  encounterPlacementForm: document.querySelector('#encounter-placement-form'),
  encounterPlacementClose: document.querySelector('#encounter-placement-close'),
  encounterPlacementCancel: document.querySelector('#encounter-placement-cancel'),
  encounterPlacementActor: document.querySelector('#encounter-placement-actor'),
  encounterPlacementSide: document.querySelector('#encounter-placement-side'),
  encounterPlacementPosition: document.querySelector('#encounter-placement-position'),
  encounterConditionDialog: document.querySelector('#encounter-condition-dialog'),
  encounterConditionForm: document.querySelector('#encounter-condition-form'),
  encounterConditionClose: document.querySelector('#encounter-condition-close'),
  encounterConditionCancel: document.querySelector('#encounter-condition-cancel'),
  encounterConditionActor: document.querySelector('#encounter-condition-actor'),
  encounterConditionSelect: document.querySelector('#encounter-condition-select'),
  encounterConditionActive: document.querySelector('#encounter-condition-active'),
  encounterConditionClear: document.querySelector('#encounter-condition-clear'),
  npcActorDialog: document.querySelector('#npc-actor-dialog'),
  npcActorForm: document.querySelector('#npc-actor-form'),
  npcActorClose: document.querySelector('#npc-actor-close'),
  npcActorCancel: document.querySelector('#npc-actor-cancel'),
  npcActorId: document.querySelector('#npc-actor-id'),
  npcName: document.querySelector('#npc-name'), npcRole: document.querySelector('#npc-role'),
  npcType: document.querySelector('#npc-type'), npcBody: document.querySelector('#npc-body'),
  npcSpecies: document.querySelector('#npc-species'), npcFaction: document.querySelector('#npc-faction'),
  npcHomeworld: document.querySelector('#npc-homeworld'), npcAge: document.querySelector('#npc-age'),
  npcStr: document.querySelector('#npc-str'), npcDex: document.querySelector('#npc-dex'), npcEnd: document.querySelector('#npc-end'),
  npcInt: document.querySelector('#npc-int'), npcEdu: document.querySelector('#npc-edu'), npcSoc: document.querySelector('#npc-soc'),
  npcService: document.querySelector('#npc-service'), npcTerms: document.querySelector('#npc-terms'), npcRank: document.querySelector('#npc-rank'),
  npcCredits: document.querySelector('#npc-credits'), npcWeapon: document.querySelector('#npc-weapon'), npcArmor: document.querySelector('#npc-armor'),
  npcSkills: document.querySelector('#npc-skills'), npcDescription: document.querySelector('#npc-description'),
  npcPortrait: document.querySelector('#npc-portrait'), npcPortraitStatus: document.querySelector('#npc-portrait-status'),
  npcPublicNotes: document.querySelector('#npc-public-notes'), npcRefereeNotes: document.querySelector('#npc-referee-notes'),
  activityPanel: document.querySelector('#activity-panel'),
  activityFeed: document.querySelector('#activity-feed'),
  clearActivity: document.querySelector('#clear-activity'),
  addActivityNote: document.querySelector('#add-activity-note'),
  activityFilter: document.querySelector('#activity-filter'),
  activityOrder: document.querySelector('#activity-order'),
  activityNoteDialog: document.querySelector('#activity-note-dialog'),
  activityNoteForm: document.querySelector('#activity-note-form'),
  activityNoteText: document.querySelector('#activity-note-text'),
  activityNoteClose: document.querySelector('#activity-note-close'),
  activityNoteCancel: document.querySelector('#activity-note-cancel')
};

let character = createCharacter();
let gameplayDocument = null;
let partyCharacterDocuments = [];
let shipDocument = null;
let campaignDocument = null;
let contractDocuments = [];
let situationDocuments = [];
let encounterDocuments = [];
let contactDocuments = [];
let threadDocuments = [];
let npcActorDocuments = [];
let mediaAssetDocuments = [];
let sceneDocuments = [];
let activityLogDocument = null;
let playerSession = null;
let activityFilter = 'play';
let activityOrder = 'newest';
let activityPanelVisible = true;
let lastAutosaveAt = null;
// v0.68.0: the campaign's home in Firestore. `campaignHomeRevision` is the
// revision this browser loaded (null: never saved there); a save that finds
// the home moved on marks it stale and stops autosaving until a reload.
let campaignHomeRevision = null;
let campaignHomeStale = null;
let campaignHomeSavedAt = null;
let campaignHomeError = null;
let campaignHomeTimer = null;
let campaignHomeSaving = false;
let campaignHomeQueued = false;
let returnCampaignId = null;
let pendingNpcPortraitAsset = null;
let documentMode = TRAVELLER_DOCUMENT_KINDS.CHARGEN;
let openHelpTopic = null;
let selectedSystemId = null;
let subsectorZoom = 1;
let speculativeBrokerDM = 0;
let operationsDeskTab = 'port';
let pendingRoll = null;
let selectedEncounterActorId = null;
let selectedEncounterTargetId = null;
let selectedEncounterTokenIds = new Set();
let encounterSelectionCleared = false;
let pendingEncounterPlacement = null;
let pendingEncounterConditionCombatantId = null;
// v0.73.0: the board is drawn by scene-canvas.js — the same module the player
// page draws with — which owns the camera, the grid, token layout and the
// drag. This client supplies tokens, overlays, decorations and the drop.
const ENCOUNTER_MAP_MIN_ZOOM = 0.5;
const ENCOUNTER_MAP_MAX_ZOOM = 16;
let encounterMapZoom = 1;
let encounterCanvasInstance = null;
function encounterCanvas() {
  if (!encounterCanvasInstance) {
    encounterCanvasInstance = createSceneCanvas({
      svg: el.encounterMap, viewport: el.encounterMapViewport, minZoom: ENCOUNTER_MAP_MIN_ZOOM, maxZoom: ENCOUNTER_MAP_MAX_ZOOM,
      onCamera: ({ zoom }) => { encounterMapZoom = zoom; if (el.encounterZoomLabel) el.encounterZoomLabel.textContent = `${Math.round(zoom * 100)}%`; }
    });
  }
  return encounterCanvasInstance;
}
let framedEncounterId = null;
let encounterExtraTargetIds = new Set();
let expandedTrackerIds = new Set();
const ENCOUNTER_GRID_VISIBILITY_KEY = 'graycloak.traveller.encounter.grid.v1';
let encounterGridHidden = false;
try { encounterGridHidden = window.localStorage?.getItem(ENCOUNTER_GRID_VISIBILITY_KEY) === 'hidden'; } catch { encounterGridHidden = false; }
let lastPublishedRound = null;
let unsubscribeDeclarations = null;
let watchedDeclarationEncounterId = null;
let appliedDeclarationKeys = new Set();
let unsubscribeTokenMoves = null;
let watchedMoveEncounterId = null;
let appliedMoveIds = new Set();
let unsubscribeCanvasPresence = null;
let canvasPresence = [];
let hoveredEncounterCombatantId = null;
const WORKSPACE_VIEWS = ['play', 'ship', 'campaign', 'threads'];
let activeWorkspaceView = 'play';
let systemDetailsOpen = false;
let registry = null;
let playerSessionStore = null;
let quickSlotStore = null;

const ACTIVITY_ORDER_STORAGE_KEY = 'graycloak.traveller.activity-order.v1';
const ACTIVITY_VISIBLE_STORAGE_KEY = 'graycloak.traveller.activity-visible.v1';

try {
  const storedOrder = window.localStorage.getItem(ACTIVITY_ORDER_STORAGE_KEY);
  if (storedOrder === 'newest' || storedOrder === 'oldest') activityOrder = storedOrder;
  const storedVisibility = window.localStorage.getItem(ACTIVITY_VISIBLE_STORAGE_KEY);
  if (storedVisibility === 'hidden') activityPanelVisible = false;
} catch (error) {
  console.error(error);
}

try {
  registry = createDocumentRegistry({ storage: window.localStorage });
  playerSessionStore = createPlayerSessionStore({ storage: window.localStorage });
  quickSlotStore = createQuickSlotStore({ storage: window.localStorage });
} catch (error) {
  console.error(error);
}

let activityLog = null;
try {
  activityLog = createActivityLogStore({ storage: window.localStorage });
} catch (error) {
  console.error(error);
}

function activityDateLabel() {
  if (!campaignDocument) return 'SESSION';
  return `${String(campaignDocument.time.dayOfYear).padStart(3, '0')}-${campaignDocument.time.year}`;
}

function establishLocalPlayerSession(campaign = campaignDocument) {
  if (!campaign) { playerSession = null; return null; }
  const partyIds = campaign.party.characterIds;
  const existing = playerSessionStore?.get(campaign.identity.id, 'local-solo') ?? null;
  const controlledCharacterIds = existing?.player.role === PLAYER_ROLES.SOLO
    ? partyIds
    : (existing?.controlledCharacterIds ?? partyIds);
  const preferred = existing?.viewedCharacterId ?? campaign.activeCharacterId ?? controlledCharacterIds[0] ?? partyIds[0];
  const viewedCharacterId = partyIds.includes(preferred)
    && (existing?.player.role === PLAYER_ROLES.REFEREE || existing?.player.role === PLAYER_ROLES.SPECTATOR || controlledCharacterIds.includes(preferred))
    ? preferred
    : (controlledCharacterIds.find((id) => partyIds.includes(id)) ?? partyIds[0] ?? null);
  playerSession = createPlayerSession({
    id: existing?.identity.id,
    campaignId: campaign.identity.id,
    playerId: existing?.player.id ?? 'local-solo',
    displayName: existing?.player.displayName ?? 'Local Player',
    role: existing?.player.role ?? PLAYER_ROLES.SOLO,
    controlledCharacterIds,
    viewedCharacterId
  });
  if (playerSessionStore) playerSession = playerSessionStore.put(playerSession);
  return playerSession;
}

function setActivityContext({ initialEntries = [] } = {}) {
  if (activityLog) activityLog.setContext(campaignDocument?.identity?.id || 'session');
  if (!campaignDocument) { activityLogDocument = null; return; }
  const legacyEntries = [...initialEntries, ...(activityLog ? activityLog.list() : [])];
  if (!activityLogDocument || activityLogDocument.campaignId !== campaignDocument.identity.id) {
    activityLogDocument = createActivityLogDocument({ campaign: campaignDocument, entries: legacyEntries });
    campaignDocument = addActivityLogToCampaign(campaignDocument, activityLogDocument);
  } else if (legacyEntries.length) {
    for (const entry of legacyEntries) activityLogDocument = appendActivityLogEntry(activityLogDocument, entry);
  }
  if (legacyEntries.length) activityLog?.clear();
  if (registry) {
    registry.put(activityLogDocument);
    registry.put(campaignDocument);
  }
}

function appendActivityDiceLine(container, part) {
  const explicit = String(part).match(/^ROLL\s+2D\s+\[(\d+)\]\s+\[(\d+)\]\s*=\s*(\d+)$/i);
  const legacy = String(part).match(/^2D\s+(\d+)\+(\d+)\s*=\s*(\d+)$/i)
    || String(part).match(/^(\d+)\+(\d+)=(\d+)$/);
  const match = explicit || legacy;
  if (!match) return false;

  const line = document.createElement('div');
  line.className = 'activity-message-line activity-dice';
  const label = document.createElement('span');
  label.className = 'activity-roll-label';
  label.textContent = 'ROLL 2D';
  const dieOne = document.createElement('span');
  dieOne.className = 'activity-die';
  dieOne.textContent = match[1];
  const dieTwo = document.createElement('span');
  dieTwo.className = 'activity-die';
  dieTwo.textContent = match[2];
  const total = document.createElement('span');
  total.className = 'activity-roll-total';
  total.textContent = `= ${match[3]}`;
  line.append(label, dieOne, dieTwo, total);
  container.append(line);
  return true;
}

function appendActivityMessage(row, entry) {
  const message = document.createElement('div');
  message.className = 'activity-message';
  const parts = String(entry.message).split(/\s*\/\s*/).filter(Boolean);
  const hasRoll = parts.some((part) => /^ROLL\s+2D\b/i.test(part) || /^2D\s+\d+\+\d+\s*=/i.test(part) || /^\d+\+\d+=\d+$/.test(part));
  const hasOutcome = parts.some((part) => /^(SUCCESS|FAILURE)$/i.test(part));

  if (!hasRoll && !hasOutcome) {
    message.textContent = entry.message;
    row.append(message);
    return;
  }

  let container = message;
  if (entry.category === 'COMBAT' && parts.length > 2) {
    const card = document.createElement('details');
    card.className = 'activity-combat-card';
    const summary = document.createElement('summary');
    const outcome = parts.find((part) => /^(HIT|MISS|SUCCESS|FAILURE|NO EFFECT|DEAD|UNCONSCIOUS)/i.test(part));
    summary.textContent = [parts[0], outcome].filter(Boolean).join(' // ');
    card.append(summary, message);
    row.append(card);
    container = message;
  }
  message.classList.add('activity-roll-message');
  for (const part of parts) {
    if (appendActivityDiceLine(message, part)) continue;
    const line = document.createElement('div');
    line.className = 'activity-message-line';
    if (/^SUCCESS$/i.test(part)) {
      line.classList.add('activity-outcome', 'success');
      line.textContent = 'RESULT // SUCCESS';
    } else if (/^FAILURE$/i.test(part)) {
      line.classList.add('activity-outcome', 'failure');
      line.textContent = 'RESULT // FAILURE';
    } else {
      line.textContent = part;
    }
    message.append(line);
  }
  if (container === message && !message.parentNode) row.append(message);
}

// --- v0.75.0: table chat -----------------------------------------------------
// Messages the table types, interleaved with the log by time. A roll from the
// tray or "/roll 2d6+1" is a message like any other; a Shift-click on a die is
// the referee's private roll, which goes to the referee-only log instead.
let chatMessages = [];
let unsubscribeChat = null;
let watchedChatCampaignId = null;

function watchTableChat() {
  const campaignId = campaignIsPublished(campaignDocument) && currentUserId() ? campaignDocument.identity.id : null;
  if (campaignId === watchedChatCampaignId) return;
  unsubscribeChat?.(); unsubscribeChat = null;
  chatMessages = []; watchedChatCampaignId = campaignId;
  renderActivity();
  if (!campaignId) return;
  watchChat(campaignId, (messages) => { chatMessages = messages; renderActivity(); })
    .then((unsubscribe) => { if (watchedChatCampaignId === campaignId) unsubscribeChat = unsubscribe; else unsubscribe(); })
    .catch((error) => console.error(error));
}

function chatAuthorName() {
  const { user } = authStatus();
  return user?.displayName || user?.email || 'Referee';
}

async function postChat(message) {
  try {
    if (!campaignIsPublished(campaignDocument) || !currentUserId()) throw new Error('publish the campaign and sign in to use chat');
    await sendChatMessage(campaignDocument.identity.id, message);
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function privateRoll(formula) {
  const roll = rollFormula(formula);
  logActivity('NOTE', `Referee rolls ${formatRoll(roll)} (private)`, { visibility: ACTIVITY_VISIBILITY.REFEREE });
  setStatus(`PRIVATE ${formatRoll(roll)}`, 'ok');
}

function renderDiceTray() {
  if (!el.diceTray) return;
  const online = campaignIsPublished(campaignDocument) && currentUserId();
  el.chatComposer.hidden = !campaignDocument;
  el.diceTray.replaceChildren(...TRAY_DICE.map((die) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = die.traveller ? 'two-d' : '';
    button.textContent = die.label;
    button.title = die.formula ? `Roll ${die.formula} for the table; Shift-click for a private roll` : 'Roll dice of any size';
    button.addEventListener('click', (event) => {
      const formula = die.formula ?? window.prompt('Dice formula (for example 3d8+2):', '1d6');
      if (!formula || !parseRollFormula(formula)) return;
      if (event.shiftKey || !online) { privateRoll(formula); return; }
      postChat(createChatMessage({ uid: currentUserId(), name: chatAuthorName(), kind: 'roll', roll: rollFormula(formula) }));
    });
    return button;
  }));
}

function chatAsActivityEntries() {
  return chatMessages.map((message) => ({
    id: `chat:${message.id}`, category: message.kind === 'roll' ? 'ROLL' : 'CHAT',
    message: message.kind === 'roll' ? `${message.name ?? 'Someone'}: ${formatRoll(message.roll)}` : `${message.name ?? 'Someone'}: ${message.text}`,
    dateLabel: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt: message.createdAt, chat: true
  }));
}

function renderActivity() {
  renderDiceTray();
  el.addActivityNote.disabled = !campaignDocument;
  if (el.activityFilter.value !== activityFilter) el.activityFilter.value = activityFilter;
  if (el.activityOrder.value !== activityOrder) el.activityOrder.value = activityOrder;
  el.activityFeed.replaceChildren();
  const allEntries = campaignDocument
    ? (activityLogDocument && playerSession ? visibleActivityLogEntries(activityLogDocument, playerSession) : (activityLogDocument?.entries ?? []))
    : (activityLog ? activityLog.list() : []);
  const filterCategories = {
    character: new Set(['CHAR', 'CHECK']),
    trade: new Set(['TRADE', 'JOB', 'CONTRACT']),
    ship: new Set(['SHIP', 'PORT', 'NAV', 'JUMP', 'ARRIVAL']),
    'personal-combat': new Set(['COMBAT']),
    'space-combat': new Set(['SPACE COMBAT']),
    campaign: new Set(['SITUATION', 'THREAD', 'ROSTER', 'NOTE']),
    system: new Set(['SYSLOG', 'ERROR'])
  };
  const allowed = filterCategories[activityFilter];
  const merged = chatMessages.length && (activityFilter === 'play' || activityFilter === 'all')
    ? [...allEntries, ...chatAsActivityEntries()].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
    : allEntries;
  const entries = activityFilter === 'play'
    ? merged.filter((entry) => entry.category !== 'SYSLOG')
    : allowed ? merged.filter((entry) => allowed.has(entry.category)) : merged;
  if (!entries.length) {
    const empty = document.createElement('div');
    empty.className = 'activity-empty';
    empty.textContent = allEntries.length ? 'NO ACTIVITY IN THIS FILTER.' : 'NO RECORDED ACTIVITY.';
    el.activityFeed.append(empty);
    return;
  }
  const latestEntry = entries.at(-1) ?? null;
  const orderedEntries = activityOrder === 'newest' ? [...entries].reverse() : entries;
  orderedEntries.forEach((entry) => {
    const row = document.createElement('div');
    row.className = `activity-entry${entry === latestEntry ? ' latest' : ''}`;
    row.dataset.category = entry.category;
    const meta = document.createElement('div');
    meta.className = 'activity-meta';
    const date = document.createElement('span');
    date.textContent = entry.dateLabel;
    const category = document.createElement('span');
    category.className = 'activity-category';
    category.textContent = entry.category;
    meta.append(date, category);
    row.append(meta);
    appendActivityMessage(row, entry);
    el.activityFeed.append(row);
  });
  el.activityFeed.scrollTop = activityOrder === 'newest' ? 0 : el.activityFeed.scrollHeight;
}

function logActivity(category, message, { dateLabel = activityDateLabel(), sourceDocumentId = null, sourceActorId = null, visibility = ACTIVITY_VISIBILITY.PUBLIC, audiencePlayerIds = [] } = {}) {
  if (campaignDocument) {
    if (!activityLogDocument) {
      activityLogDocument = createActivityLogDocument({ campaign: campaignDocument });
      campaignDocument = addActivityLogToCampaign(campaignDocument, activityLogDocument);
      if (registry) registry.put(campaignDocument);
    }
    activityLogDocument = appendActivityLogEntry(activityLogDocument, { category, message, dateLabel, sourceDocumentId, sourceActorId, visibility, audiencePlayerIds });
    if (registry) registry.put(activityLogDocument);
  } else if (activityLog) activityLog.append({ category, message, dateLabel });
  if (campaignDocument && registry) markAutosaved();
  renderActivity();
  schedulePlayerDocumentPublish();
}

function setActivityPanelVisible(visible) {
  activityPanelVisible = Boolean(visible);
  el.activityPanel.hidden = !activityPanelVisible;
  el.terminal.classList.toggle('activity-log-hidden', !activityPanelVisible);
  el.toggleActivity.textContent = activityPanelVisible ? '[ HIDE LOG ]' : '[ ACTIVITY LOG ]';
  el.toggleActivity.setAttribute('aria-expanded', activityPanelVisible ? 'true' : 'false');
  try { window.localStorage.setItem(ACTIVITY_VISIBLE_STORAGE_KEY, activityPanelVisible ? 'visible' : 'hidden'); } catch (error) { console.error(error); }
}

function updateAutosaveStatus() {
  if (!el.autosaveStatus) return;
  if (!campaignDocument) {
    el.autosaveStatus.textContent = 'NO CAMPAIGN';
    el.autosaveStatus.title = 'Create or load a campaign to enable browser autosave.';
    return;
  }
  if (!registry) {
    el.autosaveStatus.textContent = 'AUTOSAVE UNAVAILABLE';
    el.autosaveStatus.title = 'Browser local storage is unavailable.';
    return;
  }
  if (!lastAutosaveAt) {
    el.autosaveStatus.textContent = 'AUTOSAVE READY';
    el.autosaveStatus.title = 'Campaign changes are saved automatically in this browser.';
    return;
  }
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - lastAutosaveAt) / 1000));
  const age = elapsedSeconds < 5 ? 'JUST NOW' : elapsedSeconds < 60 ? `${elapsedSeconds}s AGO` : `${Math.floor(elapsedSeconds / 60)}m AGO`;
  const cloud = campaignHomeStale
    ? ' / CLOUD STALE'
    : campaignHomeError
      ? ' / CLOUD FAILED'
      : !currentUserId()
        ? ' / LOCAL ONLY'
        : campaignHomeRevision === null
          ? ' / CLOUD PENDING'
          : ` / CLOUD R${campaignHomeRevision}`;
  el.autosaveStatus.textContent = `AUTOSAVED ${age}${cloud}`;
  el.autosaveStatus.title = campaignHomeStale
    ? campaignHomeStale.message
    : campaignHomeError
      ? `The cloud save failed: ${campaignHomeError}. The browser copy is current.`
      : `Saved in this browser at ${new Date(lastAutosaveAt).toLocaleTimeString()}${campaignHomeSavedAt ? `; in the cloud at ${new Date(campaignHomeSavedAt).toLocaleTimeString()} (revision ${campaignHomeRevision})` : currentUserId() ? '; the cloud copy follows shortly' : '; sign in to keep a copy in the cloud'}.`;
}

function markAutosaved() {
  if (!campaignDocument || !registry) return updateAutosaveStatus();
  lastAutosaveAt = Date.now();
  updateAutosaveStatus();
}

function openActivityNoteDialog() {
  if (!campaignDocument) return setStatus('A CAMPAIGN IS REQUIRED FOR JOURNAL NOTES', 'error');
  el.activityNoteForm.reset();
  if (typeof el.activityNoteDialog.showModal === 'function') el.activityNoteDialog.showModal();
  else el.activityNoteDialog.setAttribute('open', '');
  window.setTimeout(() => el.activityNoteText.focus(), 0);
}

function closeActivityNoteDialog() {
  if (typeof el.activityNoteDialog.close === 'function') el.activityNoteDialog.close();
  else el.activityNoteDialog.removeAttribute('open');
}

function setStatus(message, kind = '') {
  el.status.textContent = message;
  el.status.className = `status${kind ? ` ${kind}` : ''}`;
}

function characterSkillNames(document = gameplayDocument) {
  return document?.skills ? Object.keys(document.skills) : [];
}

function quickSlotCharacterId() {
  return gameplayDocument?.id ?? null;
}

function signedNumber(value) {
  const number = Number(value ?? 0);
  return number >= 0 ? `+${number}` : String(number);
}

function campaignPlayActive() {
  return Boolean(campaignDocument && gameplayDocument);
}

function quickSkillNames() {
  const names = characterSkillNames();
  if (!names.length) return [];
  return resolveQuickSlots({ store: quickSlotStore, characterId: quickSlotCharacterId(), skillNames: names }).slots;
}

function activeThreadObjective() {
  const thread = threadDocuments
    .filter((entry) => entry.status === 'active' && entry.objective?.text)
    .slice()
    .sort((a, b) => {
      const av = (a.timing?.updatedDate?.year ?? 0) * 400 + (a.timing?.updatedDate?.dayOfYear ?? 0);
      const bv = (b.timing?.updatedDate?.year ?? 0) * 400 + (b.timing?.updatedDate?.dayOfYear ?? 0);
      return bv - av;
    })[0];
  if (!thread) return null;
  return { id: thread.identity.id, title: thread.identity.title, objective: thread.objective.text };
}

function headerTaskSnapshot() {
  const encounter = activeEncounterAtCurrentSystem();
  if (encounter) {
    return {
      kind: 'encounter', id: encounter.identity.id,
      label: `ENCOUNTER // ${encounter.identity.title.toUpperCase()} // ROUND ${encounter.round} // ${encounter.range.toUpperCase().replace('-', ' ')} RANGE`,
      attention: true, skillName: null
    };
  }
  const situation = activeSituationAtCurrentSystem();
  if (situation) {
    const skillChoice = situation.choices.find((choice) => choice.action === 'skill-check') ?? null;
    return {
      kind: 'situation',
      id: situation.identity.id,
      label: `SITUATION // ${situation.identity.title.toUpperCase()} // ${situation.location.systemName.toUpperCase()}`,
      attention: true,
      skillName: skillChoice?.skillName ?? null
    };
  }

  const activeThreads = threadDocuments
    .filter((entry) => entry.status === 'active' && entry.objective?.text)
    .slice()
    .sort((a, b) => {
      const av = (a.timing?.updatedDate?.year ?? 0) * 400 + (a.timing?.updatedDate?.dayOfYear ?? 0);
      const bv = (b.timing?.updatedDate?.year ?? 0) * 400 + (b.timing?.updatedDate?.dayOfYear ?? 0);
      return bv - av;
    });
  if (activeThreads.length) {
    const thread = activeThreads[0];
    const jobs = activeContracts().length;
    return {
      kind: 'thread',
      id: thread.identity.id,
      label: `THREAD // ${thread.identity.title.toUpperCase()} // ${thread.objective.text.toUpperCase()}${jobs ? ` // JOBS ${jobs}` : ''}`,
      attention: false,
      skillName: null
    };
  }

  const contracts = activeContracts().slice().sort((a, b) => {
    const ay = a.timing?.deadlineDate?.year ?? Number.MAX_SAFE_INTEGER;
    const by = b.timing?.deadlineDate?.year ?? Number.MAX_SAFE_INTEGER;
    if (ay !== by) return ay - by;
    return (a.timing?.deadlineDate?.dayOfYear ?? Number.MAX_SAFE_INTEGER) - (b.timing?.deadlineDate?.dayOfYear ?? Number.MAX_SAFE_INTEGER);
  });
  if (contracts.length) {
    const contract = contracts[0];
    const due = contract.timing?.deadlineDate
      ? `${String(contract.timing.deadlineDate.dayOfYear).padStart(3, '0')}-${contract.timing.deadlineDate.year}`
      : 'NO DEADLINE';
    return {
      kind: 'contract',
      id: contract.identity.id,
      label: `${contract.identity.title.toUpperCase()} // ${contract.destination.systemName.toUpperCase()} // DUE ${due}${contracts.length > 1 ? ` // +${contracts.length - 1} MORE` : ''}`,
      attention: false,
      skillName: null
    };
  }
  return { kind: 'none', id: null, label: 'NONE', attention: false, skillName: null };
}

function shipHeaderMetaLines() {
  if (!shipDocument) return ['NO ACTIVE SHIP', ''];
  const jump = shipDocument.specifications?.drives?.jump?.rating ?? '--';
  const fuel = shipDocument.state?.currentFuelTons ?? '--';
  const fuelCapacity = shipDocument.specifications?.fuel?.capacityTons ?? '--';
  const cargo = Number.isFinite(shipDocument.state?.cargoUsedTons) ? shipDocument.state.cargoUsedTons : 0;
  const cargoCapacity = shipDocument.specifications?.cargo?.capacityTons ?? '--';
  const staterooms = shipDocument.specifications?.accommodations?.staterooms ?? 0;
  const crewPeople = new Set((shipDocument.crew?.assignments ?? []).map((entry) => entry?.characterId).filter(Boolean)).size;
  const passengers = (shipDocument.state?.passengerManifest ?? []).filter((entry) => entry.class === 'high' || entry.class === 'middle').length;
  const account = shipDocument.state?.finances?.balanceCr;
  return [
    `J${jump} / FUEL ${fuel}/${fuelCapacity}t / HOLD ${cargo}/${cargoCapacity}t`,
    `STATEROOMS ${crewPeople + passengers}/${staterooms} / PASSENGERS ${passengers} / ${Number.isInteger(account) ? formatCr(account) : 'ACCOUNT --'}`
  ];
}

function headerBaseLabel(system) {
  if (!system) return 'BASES --';
  const bases = [];
  if (system.bases?.naval) bases.push('NAVAL');
  if (system.bases?.scout) bases.push('SCOUT');
  return bases.length ? bases.join(' + ') : 'NO BASES';
}

function nearestContractDeadlineDays() {
  const today = campaignDateSnapshot();
  if (!today) return null;
  const days = activeContracts()
    .map((contract) => contract.timing?.deadlineDate)
    .filter((date) => Number.isInteger(date?.year) && Number.isInteger(date?.dayOfYear))
    .map((date) => (date.year - today.year) * 365 + (date.dayOfYear - today.dayOfYear));
  if (!days.length) return null;
  return Math.min(...days);
}

// Combat wounds live on the encounter combatant until the fight resolves, so
// anything reporting the character's condition mid-fight must read this, not
// the character document, or it reports the state they were in before it.
function encounterSelfCombatant() {
  const encounter = activeEncounterAtCurrentSystem();
  if (!encounter || !gameplayDocument) return null;
  return (encounter.combatants ?? []).find((entry) => entry.id === gameplayDocument.identity.id)
    ?? (encounter.combatants ?? []).find((entry) => entry.playerCharacter) ?? null;
}

function characterCurrentValue(key) {
  const me = encounterSelfCombatant();
  if (me && ['STR', 'DEX', 'END'].includes(key)) return me.current[key];
  return ['STR', 'DEX', 'END'].includes(key) ? gameplayDocument.current[key] : gameplayDocument.characteristics[key];
}

function characterPostureLabel() {
  const me = encounterSelfCombatant();
  if (!me) return '';
  const parts = [];
  if (me.evading) parts.push('EVADING');
  if (Number.isInteger(me.blows) && me.blows > 0) parts.push(`BLOWS ${me.blows}`);
  return parts.join(' / ');
}

function characterHealthLabel(document = gameplayDocument) {
  if (!document) return 'UNAVAILABLE';
  const me = document === gameplayDocument ? encounterSelfCombatant() : null;
  if (me) {
    if (me.status === 'dead') return 'DEAD';
    if (me.status === 'unconscious') return 'UNCONSCIOUS';
    if (me.status !== 'active') return me.status.toUpperCase();
    return ['STR', 'DEX', 'END'].some((key) => me.current[key] < me.characteristics[key]) ? 'WOUNDED' : 'READY';
  }
  if (!document.status.alive) return 'DEAD';
  if (document.status.consciousness === 'unconscious') return 'UNCONSCIOUS';
  const wounded = ['STR', 'DEX', 'END'].some((key) => document.current[key] < document.characteristics[key]);
  return wounded ? 'WOUNDED' : 'READY';
}

function renderSheetBenefitRows(rows) {
  renderSheetBenefitRowsView(el.sheetBenefits, rows);
}

function renderCharacterSheet() {
  if (!gameplayDocument || !campaignPlayActive()) return;
  const currentWorld = mappedCurrentSystem()?.mainWorld?.name ?? campaignDocument.location.worldName ?? 'UNMAPPED';
  el.sheetName.textContent = gameplayDocument.identity.name || '(UNNAMED)';
  el.sheetDate.textContent = activityDateLabel();
  el.sheetUpp.textContent = gameplayDocument.upp;
  el.sheetRank.textContent = gameplayDocument.career.rankTitle || 'NO RANK';
  el.sheetAge.textContent = String(gameplayDocument.age);
  el.sheetWorld.textContent = currentWorld;
  el.sheetHealthStatus.textContent = `STATUS ${characterHealthLabel()} // ORIGINAL UPP ${gameplayDocument.upp}`;

  el.sheetCharacteristics.replaceChildren();
  for (const [key, label] of HEADER_CHARACTERISTICS) {
    const original = gameplayDocument.characteristics[key];
    const current = ['STR', 'DEX', 'END'].includes(key) ? gameplayDocument.current[key] : original;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `sheet-characteristic${current < original ? ' injured' : ''}`;
    button.title = `${label} ${current} / original ${original} / click for an ad hoc characteristic-or-less roll`;
    const code = document.createElement('span'); code.className = 'sheet-stat-code'; code.textContent = key;
    const value = document.createElement('strong'); value.className = 'sheet-stat-value'; value.textContent = String(current);
    const base = document.createElement('span'); base.className = 'sheet-stat-current'; base.textContent = current === original ? 'CURRENT' : `ORIGINAL ${original}`;
    button.append(code, value, base);
    button.addEventListener('click', () => openCharacteristicRollDialog(key, label));
    el.sheetCharacteristics.append(button);
  }

  el.sheetService.replaceChildren();
  appendSheetDatum(el.sheetService, 'SERVICE', serviceName(gameplayDocument.career.service).toUpperCase());
  appendSheetDatum(el.sheetService, 'TERMS SERVED', String(gameplayDocument.career.terms));
  appendSheetDatum(el.sheetService, 'FINAL RANK', gameplayDocument.career.rankTitle || 'NONE');
  appendSheetDatum(el.sheetService, 'NOBLE TITLE', nobleTitleLabel(gameplayDocument.characteristics.SOC));
  appendSheetDatum(el.sheetService, 'RETIRED', gameplayDocument.status.retired ? 'YES' : 'NO');
  appendSheetDatum(el.sheetService, 'RETIREMENT PAY', formatCr(gameplayDocument.finances.retirementPayAnnual));

  el.sheetWeapon.replaceChildren(...Object.entries(PERSONAL_WEAPONS).map(([key, weapon]) => new Option(weapon.name.toUpperCase(), key)));
  el.sheetWeapon.value = gameplayDocument.loadout.weaponKey;
  el.sheetArmor.replaceChildren(...PERSONAL_ARMOR_TYPES.map((armor) => new Option(armor.toUpperCase(), armor)));
  el.sheetArmor.value = gameplayDocument.loadout.armor;
  const equipment = gameplayDocument.benefits.equipment.map((entry) => `${entry.name}${entry.count > 1 ? ` x${entry.count}` : ''}`);
  el.sheetEquipment.textContent = equipment.length ? `OWNED: ${equipment.join(' / ')}` : 'OWNED: NONE RECORDED';

  el.sheetSkills.replaceChildren();
  const skills = Object.entries(gameplayDocument.skills).sort(([left], [right]) => left.localeCompare(right));
  if (!skills.length) el.sheetSkills.textContent = 'NONE RECORDED';
  for (const [name, level] of skills) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'sheet-skill'; button.textContent = `${name}-${level}`;
    button.title = `${name}-${level} / click for a referee skill check`;
    button.addEventListener('click', () => openSkillRollDialog(name));
    el.sheetSkills.append(button);
  }

  const passages = gameplayDocument.benefits.passages.map((entry) => `${entry.name}${entry.count > 1 ? ` x${entry.count}` : ''}`).join(' / ') || 'NONE';
  const memberships = gameplayDocument.benefits.memberships.map((entry) => entry.name).join(' / ') || 'NONE';
  const ships = gameplayDocument.shipRefs.map((entry) => entry.shipName || entry.shipType || entry.shipId).join(' / ') || 'NONE';
  renderSheetBenefitRows([
    ['CREDITS', formatCr(gameplayDocument.finances.credits)],
    ['PASSAGES', passages],
    ['MEMBERSHIPS', memberships],
    ['ASSIGNED SHIP', ships],
  ]);
  el.sheetHistoryRecord.textContent = `${buildServiceHistory(gameplayDocument)}\n\n${buildGenerationLog(gameplayDocument)}`;
  if (document.activeElement !== el.sheetNotes) el.sheetNotes.value = gameplayDocument.notes;
}

// v0.18.1: the in-progress chargen character fills the same Book 1 form the
// playable sheet uses, so the scene is the sheet from the first roll. The
// rendering lives in chargen-view.js since v0.66.0; this supplies the elements.
function chargenSheetElements() {
  return {
    name: el.sheetName, date: el.sheetDate, upp: el.sheetUpp, rank: el.sheetRank, age: el.sheetAge, world: el.sheetWorld,
    healthStatus: el.sheetHealthStatus, characteristics: el.sheetCharacteristics, service: el.sheetService,
    weapon: el.sheetWeapon, armor: el.sheetArmor, equipment: el.sheetEquipment, skills: el.sheetSkills,
    benefits: el.sheetBenefits, historyRecord: el.sheetHistoryRecord, notes: el.sheetNotes
  };
}

function renderChargenSheet() {
  if (campaignPlayActive() || !character) return;
  renderChargenSheetView(character, chargenSheetElements());
}

function saveCharacterSheetState(patch, message) {
  if (!gameplayDocument) return;
  gameplayDocument = updateCharacterGameplayState(gameplayDocument, patch);
  partyCharacterDocuments = partyCharacterDocuments.map((entry) => entry.identity.id === gameplayDocument.identity.id ? gameplayDocument : entry);
  syncCampaignRefs();
  persistCampaignState();
  logActivity('CHAR', message, { sourceDocumentId: gameplayDocument.identity.id });
  setStatus(message.toUpperCase(), 'ok');
  render();
}

function renderCampaignHeader() {
  const active = campaignPlayActive();
  el.campaignHeader.hidden = !active;
  if (el.mastheadDate) {
    const deadline = active ? nearestContractDeadlineDays() : null;
    el.mastheadDate.textContent = active
      ? `${activityDateLabel()} ${campaignClockLabel(campaignDocument)} / WEEK ${campaignWeekKey(campaignDocument)}${deadline === null ? '' : ` / DEADLINE ${deadline}d`}`
      : '--';
  }
  // v0.69.0: rolling a character at the table lives in the REFEREE menu; the
  // masthead button stays wired but out of the way.
  el.newCharacterFromCampaign.hidden = true;
  if (el.refereeNewNpc) el.refereeNewNpc.hidden = !active;
  el.terminal?.classList.toggle('campaign-play', active);
  el.appTitle.textContent = 'TRAVELLER';
  el.headerCampaignName.textContent = active
    ? (campaignDocument.identity.name || 'UNNAMED CAMPAIGN').toUpperCase()
    : 'NO CAMPAIGN';
  if (!active) {
    updateAutosaveStatus();
    return;
  }

  const current = mappedCurrentSystem();
  const task = headerTaskSnapshot();
  const career = gameplayDocument.career;
  const careerLabel = serviceName(career.service).toUpperCase();
  el.headerCharacterName.textContent = gameplayDocument.identity.name || '(UNNAMED)';
  el.headerUpp.textContent = gameplayDocument.upp;
  el.headerUpp.title = `Original UPP as generated / ${careerLabel} / age ${gameplayDocument.age}`;

  const health = characterHealthLabel();
  el.headerStatus.textContent = health;
  el.headerStatus.className = `header-status${health === 'READY' ? '' : health === 'WOUNDED' ? ' wounded' : ' critical'}`;

  const posture = characterPostureLabel();
  el.headerPosture.hidden = !posture;
  if (posture) el.headerPosture.textContent = posture;

  el.headerCredits.textContent = formatCr(gameplayDocument.finances.credits);
  updateAutosaveStatus();

  el.headerCharacteristics.replaceChildren();
  for (const [key, label] of HEADER_CHARACTERISTICS) {
    const value = characterCurrentValue(key);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `header-roll-button${value < gameplayDocument.characteristics[key] ? ' injured' : ''}`;
    const base = gameplayDocument.characteristics[key];
    const injured = value < base;
    button.textContent = injured ? `${key} ${value}/${base}` : `${key} ${value}`;
    button.title = injured
      ? `${label} ${value} of ${base} / wounded / click for an ad hoc characteristic-or-less roll`
      : `${label} ${value} / click for an ad hoc characteristic-or-less roll`;
    button.addEventListener('click', () => openCharacteristicRollDialog(key, label));
    el.headerCharacteristics.append(button);
  }

  el.headerQuickSkills.replaceChildren();
  const allSkills = characterSkillNames();
  const quick = quickSkillNames();
  const appendSkillChip = (skillName, extraClass = '') => {
    const level = Number(gameplayDocument.skills[skillName] ?? 0);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `header-skill-button${task.skillName === skillName ? ' context-relevant' : ''}${extraClass ? ` ${extraClass}` : ''}`;
    button.textContent = `${skillName}-${level}`;
    button.title = task.skillName === skillName
      ? `Current situation uses ${skillName}-${level}`
      : `${skillName}-${level} / click for a referee skill check`;
    button.addEventListener('click', () => {
      if (task.kind === 'situation' && task.skillName === skillName) {
        const situation = activeSituationAtCurrentSystem();
        const choice = situation?.choices.find((entry) => entry.action === 'skill-check' && entry.skillName === skillName);
        if (situation && choice) return openSituationSkillRollDialog(situation, choice);
      }
      openSkillRollDialog(skillName);
    });
    el.headerQuickSkills.append(button);
  };

  if (!allSkills.length) {
    const none = document.createElement('span');
    none.className = 'empty';
    none.textContent = 'NONE';
    el.headerQuickSkills.append(none);
  } else {
    for (const skillName of quick) appendSkillChip(skillName);
    if (task.skillName && allSkills.includes(task.skillName) && !quick.includes(task.skillName)) {
      appendSkillChip(task.skillName, 'header-skill-transient');
    }
    if (quick.length < QUICK_SLOT_LIMIT && quick.length < allSkills.length) {
      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = 'header-skill-button header-skill-slot';
      slot.textContent = '+ SLOT';
      slot.title = 'Choose which skills fill the quick slots';
      slot.addEventListener('click', openQuickSlotDialog);
      el.headerQuickSkills.append(slot);
    }
  }
  el.headerAllSkills.disabled = !allSkills.length;

}

function renderSelectedSystemSummary() {
  if (!campaignDocument) {
    el.selectedSystemSummary.hidden = true;
    return;
  }
  const current = mappedCurrentSystem();
  const selected = selectedSystemId ? getSubsectorSystem(FAR_MERIDIAN_SUBSECTOR, selectedSystemId) : null;
  const system = selected ?? current;
  if (!system) {
    el.selectedSystemSummary.hidden = true;
    return;
  }
  const profile = parseUniversalWorldProfile(system.mainWorld.uwp);
  const bases = [system.bases.scout ? 'SCOUT' : '', system.bases.naval ? 'NAVAL' : ''].filter(Boolean).join('+') || 'NO BASE';
  const zone = system.travelZone === 'none' ? 'NORMAL' : system.travelZone.toUpperCase();
  const isSelection = Boolean(selected && selected.id !== current?.id);
  el.selectedSystemSummaryText.textContent = isSelection
    ? `${system.name.toUpperCase()} · ${system.hex} · ${system.mainWorld.uwp} · TL ${profile.techLevel} · ${bases} · ${zone}`
    : 'NONE · SELECT A SYSTEM ON THE MAP';
  if (current) {
    const cp = parseUniversalWorldProfile(current.mainWorld.uwp);
    const cb = [current.bases.scout ? 'SCOUT' : '', current.bases.naval ? 'NAVAL' : ''].filter(Boolean).join('+') || 'NO BASE';
    const cz = current.travelZone === 'none' ? 'NORMAL' : current.travelZone.toUpperCase();
    const portCall = currentBerthingDue();
    el.footerCurrentName.textContent = `${current.name.toUpperCase()} · ${current.hex}`;
    const deadline = nearestContractDeadlineDays();
    el.footerCurrentMeta.textContent = `${current.mainWorld.uwp} · TL ${cp.techLevel} · ${cb} · GAS GIANT ${current.gasGiant ? 'YES' : 'NO'} · ${cz}${portCall ? (portCall.berthingPaid ? ' · BERTHED' : ' · BERTHING DUE') : ''}${deadline === null ? '' : ` · NEXT DEADLINE ${deadline}d`}`;
  } else {
    el.footerCurrentName.textContent = 'UNMAPPED';
    el.footerCurrentMeta.textContent = 'Select a system and set it as the starting location.';
  }
  el.sceneShipName.textContent = shipDocument
    ? `${shipDocument.identity.name || '(UNNAMED)'}${shipDocument.identity.registry ? ` / ${shipDocument.identity.registry}` : ''}`
    : 'NO ACTIVE SHIP';
  el.sceneShipName.disabled = !shipDocument;
  el.sceneShipMeta.textContent = shipDocument
    ? `${shipDocument.design.typeCode} ${shipDocument.design.name.toUpperCase()} / OPEN REGISTER`
    : 'NO ACTIVE SHIP';
  el.toggleSystemDetails.textContent = systemDetailsOpen ? '[ HIDE DETAILS ]' : '[ DETAILS ]';
  el.toggleSystemDetails.setAttribute('aria-expanded', systemDetailsOpen ? 'true' : 'false');
  if (typeof renderPlayProcedure === 'function') renderPlayProcedure();
}

function applyCampaignLayout() {
  const active = campaignPlayActive();
  el.terminal?.classList.toggle('chargen-mode', !active);
  // v0.75.0: character generation reads the Book 1 tables; the TABLES tab
  // opens with it unless the referee has picked a tab.
  if (!active && !sidebarChosen && sidebarTab !== 'tables') { sidebarTab = 'tables'; }
  if (!active) {
    // Character generation: the sheet is the scene, with the governing Book 1
    // tables directly beneath WHAT NOW? in the left dock.
    el.legacyPersonnelFields.hidden = false;
    el.characterSheet.hidden = false;
    el.personnelSection.hidden = false;
    el.personnelSection.classList.remove('sheet-overlay');
    el.procedureSection.hidden = false;
    el.procedure.hidden = false;
    el.actions.hidden = false;
    el.playProcedure.hidden = true;
    el.chargenRecordSection.hidden = true;
    el.subsectorSection.hidden = true;
    el.shipSection.hidden = !shipDocument;
    el.shipSection.classList.toggle('sheet-overlay', false);
    el.campaignSection.hidden = true;
    el.threadSection.hidden = true;
    el.contextTabs.hidden = true;
    el.contextTakeover.hidden = true;
    el.chargenTablesSection.hidden = false;
    el.encounterSection.hidden = true;
    el.sceneStatusStrip.hidden = true;
    el.sceneTabsRow.hidden = true;
    el.openShipView.hidden = true;
    el.openCampaignView.hidden = true;
    el.openThreadsView.hidden = true;
    if (el.subsectorHeading) el.subsectorHeading.textContent = 'CHARACTER GENERATION';
    if (el.procedureScope) el.procedureScope.textContent = character?.service ? `${serviceName(character.service).toUpperCase()} · TERM ${character.currentTerm?.number ?? character.terms}` : 'CHARACTER GENERATION';
    return;
  }
  if (activeWorkspaceView === 'ship' && !shipDocument) activeWorkspaceView = 'play';
  const view = activeWorkspaceView;
  el.legacyPersonnelFields.hidden = true;
  el.characterSheet.hidden = false;
  el.procedureSection.hidden = false;
  el.procedure.hidden = true;
  el.actions.hidden = true;
  el.playProcedure.hidden = false;
  el.chargenRecordSection.hidden = true;
  el.chargenTablesSection.hidden = true;
  el.contextTabs.hidden = false;
  el.openShipView.hidden = !shipDocument;
  el.openCampaignView.hidden = false;
  el.openThreadsView.hidden = false;
  // The centre is a tabbed scene: CHARACTER / SYSTEM / COMBAT.
  el.sceneTabsRow.hidden = false;
  el.personnelSection.hidden = activeSceneTab !== 'character';
  el.subsectorSection.hidden = activeSceneTab !== 'system';
  el.encounterSection.hidden = activeSceneTab !== 'combat';
  el.sceneStatusStrip.hidden = activeSceneTab !== 'system';
  el.personnelSection.classList.remove('sheet-overlay');
  for (const button of el.sceneTabs) {
    const isActive = button.dataset.sceneTab === activeSceneTab;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    if (button.dataset.sceneTab === 'combat') button.classList.toggle('attention', Boolean(activeEncounterAtCurrentSystem()));
  }
  // Ship, campaign and threads remain documents opened over the scene.
  for (const [key, section] of [['ship', el.shipSection], ['campaign', el.campaignSection], ['threads', el.threadSection]]) {
    section.hidden = view !== key;
    section.classList.toggle('sheet-overlay', view === key);
  }
  el.systemRecordSection.hidden = !(systemDetailsOpen && el.systemRecord.textContent);
  if (el.procedureScope) {
    const current = mappedCurrentSystem();
    el.procedureScope.textContent = current ? `PORT CALL · ${current.name.toUpperCase()} · WEEK ${campaignWeekKey(campaignDocument)}` : 'NO MAPPED LOCATION';
  }
}

let activeSceneTab = 'system';

// --- v0.75.0: the sidebar and the tool rail --------------------------------
// The sidebar is Foundry's: one tab open at a time, each a panel that was a
// menu or a column before. A fight opens COMBAT unless the referee has chosen
// a tab since; a situation opens PORT the same way.
const SIDEBAR_TABS = ['chat', 'combat', 'scenes', 'actors', 'vehicles', 'port', 'journal', 'tables', 'players', 'settings'];
let sidebarTab = 'chat';
let sidebarChosen = false;
let sidebarCollapsed = false;

function setSidebarTab(tab, { chosen = true } = {}) {
  if (!SIDEBAR_TABS.includes(tab)) return;
  const changed = tab !== sidebarTab;
  sidebarTab = tab;
  if (chosen) sidebarChosen = true;
  sidebarCollapsed = false;
  // v0.76.1: WHAT NOW? and the character strip used to stay open across every
  // tab, so on an ordinary screen they filled the sidebar and the tab just
  // selected — ACTORS, COMBAT, anything — sat below the fold with nothing to
  // say it was there. Picking a tab now closes both; either reopens with one
  // click, and stays open while the referee keeps working within that tab.
  if (changed) {
    const whatnow = document.querySelector('#sidebar-whatnow');
    const character = document.querySelector('#sidebar-character');
    if (whatnow) whatnow.open = false;
    if (character) character.open = false;
  }
  applySidebar();
  if (tab === 'port' && ['encounter'].includes(operationsDeskTab)) { operationsDeskTab = 'port'; applyOperationsDeskTab(); }
}

function applySidebar() {
  for (const button of document.querySelectorAll('.sidebar-tab')) {
    const active = button.dataset.sidebarTab === sidebarTab && !sidebarCollapsed;
    button.setAttribute('aria-selected', active ? 'true' : 'false');
    button.classList.toggle('is-active', active);
    button.classList.toggle('attention', (button.dataset.sidebarTab === 'combat' && Boolean(activeEncounterAtCurrentSystem()))
      || (button.dataset.sidebarTab === 'players' && joinRequests.length > 0));
  }
  for (const panel of document.querySelectorAll('.sidebar-panel')) panel.hidden = panel.dataset.sidebarPanel !== sidebarTab;
  el.terminal?.classList.toggle('sidebar-collapsed', sidebarCollapsed);
}

// The rail's tools follow the scene: the world scene offers navigation,
// the combat scene offers token tools. Each is a button the stage already
// answers to.
// The collapsed character strip still says who and how they are.
function renderSidebarStrips() {
  const summary = document.querySelector('#sidebar-character-summary');
  if (!summary) return;
  const doc = campaignPlayActive() ? gameplayDocument : null;
  summary.textContent = doc
    ? `${doc.identity.name.toUpperCase()} · ${doc.upp} · ${el.headerStatus?.textContent || 'READY'}`
    : 'CHARACTER';
  const whatnow = document.querySelector('#sidebar-whatnow > summary');
  if (whatnow) whatnow.textContent = `WHAT NOW? ${el.procedureScope?.textContent ? '· ' + el.procedureScope.textContent : ''}`;
}

function renderRailTools() {
  const rail = document.querySelector('#rail-tools');
  if (!rail) return;
  const tools = [];
  const tool = (label, title, onClick, { pressed = false, disabled = false } = {}) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = `rail-tool${pressed ? ' is-active' : ''}`; button.title = title; button.textContent = label; button.disabled = disabled;
    button.addEventListener('click', onClick);
    tools.push(button);
  };
  if (!campaignPlayActive()) { rail.replaceChildren(); return; }
  if (activeSceneTab === 'system') {
    tool('FIT', 'Fit the subsector map', () => setSubsectorZoom(1));
    tool('+', 'Zoom in', () => setSubsectorZoom(subsectorZoom + SUBSECTOR_ZOOM_STEP));
    tool('\u2212', 'Zoom out', () => setSubsectorZoom(subsectorZoom - SUBSECTOR_ZOOM_STEP));
    tool('SYS', 'System record for the selected system', () => el.toggleSystemDetails?.click(), { disabled: !selectedSystemId });
    tool('PORT', 'Port services', () => { setSidebarTab('port'); setOperationsDeskTab('port'); });
  } else if (activeSceneTab === 'combat') {
    const canvas = encounterCanvasInstance;
    tool('FIT', 'Fit the board', () => encounterCanvas().camera.fit());
    tool('+', 'Zoom in', () => encounterCanvas().camera.zoomBy(1.5));
    tool('\u2212', 'Zoom out', () => encounterCanvas().camera.zoomBy(1 / 1.5));
    const fight = activeEncounterAtCurrentSystem();
    tool('FRAME', 'Frame the combatants', () => { if (fight) frameEncounterCombatants(fight); }, { disabled: !fight });
    tool('GRID', el.encounterGridToggle?.getAttribute('aria-pressed') === 'true' ? 'Show the grid' : 'Hide the grid', () => el.encounterGridToggle?.click(), { pressed: el.encounterGridToggle?.getAttribute('aria-pressed') === 'true' });
    tool('TRK', 'The combat tracker', () => setSidebarTab('combat'));
    void canvas;
  } else {
    tool('SHEET', 'The viewed character\'s sheet', () => setSidebarTab('actors'));
  }
  rail.replaceChildren(...tools);
}

function setSceneTab(tab) {
  if (!['character', 'system', 'combat'].includes(tab)) return;
  activeSceneTab = tab;
  if (activeWorkspaceView !== 'play') activeWorkspaceView = 'play';
  applyCampaignLayout();
  renderSelectedSystemSummary();
  // COMBAT owns both the scene and its rail, so the rail follows the tab.
  renderEncounter();
  renderRailTools();
}

function setWorkspaceView(view) {
  if (!WORKSPACE_VIEWS.includes(view)) return;
  if (view === 'ship' && !shipDocument) return;
  activeWorkspaceView = view;
  applyCampaignLayout();
  renderSelectedSystemSummary();
}

function toggleSystemDetails() {
  systemDetailsOpen = !systemDetailsOpen;
  applyCampaignLayout();
  renderSelectedSystemSummary();
}

function intelligenceEducationDM() {
  if (!gameplayDocument) return { intelligenceDM: 0, educationDM: 0 };
  return {
    intelligenceDM: gameplayDocument.characteristics.INT > 10 ? 1 : 0,
    educationDM: gameplayDocument.characteristics.EDU > 9 ? 1 : 0
  };
}

function openRollDialog(config) {
  pendingRoll = config;
  el.rollDialogTitle.textContent = config.title;
  el.rollDialogBasis.textContent = config.basis;
  el.rollModifier.value = '0';
  el.rollTargetRow.hidden = config.kind === 'characteristic';
  el.rollTarget.readOnly = Boolean(config.targetLocked);
  el.rollTarget.value = String(config.target ?? 8);
  el.rollTargetSuffix.textContent = config.kind === 'characteristic' ? '' : '+';
  el.rollBuiltIn.textContent = config.builtInText ?? '+0';
  if (typeof el.rollDialog.showModal === 'function') el.rollDialog.showModal();
  else el.rollDialog.setAttribute('open', '');
  window.setTimeout(() => el.rollModifier.focus(), 0);
}

function closeRollDialog() {
  pendingRoll = null;
  if (typeof el.rollDialog.close === 'function') el.rollDialog.close();
  else el.rollDialog.removeAttribute('open');
}

function openSkillRollDialog(skillName, { target = 8 } = {}) {
  if (!gameplayDocument) return;
  const skillLevel = Number(gameplayDocument.skills?.[skillName] ?? 0);
  const { intelligenceDM, educationDM } = intelligenceEducationDM();
  openRollDialog({
    kind: 'skill',
    title: `${skillName.toUpperCase()}-${skillLevel} // ${gameplayDocument.identity.name.toUpperCase()}`,
    basis: 'AD HOC REFEREE CHECK // DEFAULT THROW 8+\nChange THROW if the referee sets a different target. MODIFIER defaults to 0.',
    skillName,
    skillLevel,
    target,
    targetLocked: false,
    builtInText: `SKILL ${signedNumber(skillLevel)} / INT ${signedNumber(intelligenceDM)} / EDU ${signedNumber(educationDM)}`
  });
}

function openCharacteristicRollDialog(characteristic, label) {
  if (!gameplayDocument) return;
  const value = Number(characterCurrentValue(characteristic) ?? 0);
  openRollDialog({
    kind: 'characteristic',
    title: `${label.toUpperCase()} ${value} // ${gameplayDocument.identity.name.toUpperCase()}`,
    basis: `AD HOC CHARACTERISTIC-OR-LESS CHECK // 2D ≤ ${characteristic} ${value}\nPositive MODIFIER helps by raising the effective characteristic; negative MODIFIER lowers it.`,
    characteristic,
    characteristicLabel: label,
    characteristicValue: value,
    builtInText: `${characteristic} ${value}`
  });
}

function openSituationSkillRollDialog(situation, choice) {
  if (!gameplayDocument) return;
  const skillLevel = Number(gameplayDocument.skills?.[choice.skillName] ?? 0);
  const { intelligenceDM, educationDM } = intelligenceEducationDM();
  openRollDialog({
    kind: 'situation-skill',
    title: `${choice.skillName.toUpperCase()}-${skillLevel} // ${situation.identity.title.toUpperCase()}`,
    basis: `SITUATION CHECK // THROW ${choice.target}+\nThe task already supplies its target and built-in DMs. Add only the referee's extra situational modifier.`,
    skillName: choice.skillName,
    skillLevel,
    target: choice.target,
    targetLocked: true,
    situationId: situation.identity.id,
    choiceId: choice.id,
    taskDM: Number(choice.situationalDM ?? 0),
    builtInText: `SKILL ${signedNumber(skillLevel)} / INT ${signedNumber(intelligenceDM)} / EDU ${signedNumber(educationDM)} / TASK ${signedNumber(choice.situationalDM ?? 0)}`
  });
}

function executeAdHocRoll() {
  if (!pendingRoll || !gameplayDocument) return;
  const modifier = Number.parseInt(el.rollModifier.value || '0', 10);
  if (!Number.isInteger(modifier)) throw new Error('modifier must be an integer');

  if (pendingRoll.kind === 'characteristic') {
    const dice = createDice().roll2D6();
    const effectiveTarget = pendingRoll.characteristicValue + modifier;
    const success = dice.total <= effectiveTarget;
    logActivity('CHECK', `${gameplayDocument.identity.name} / ${pendingRoll.characteristic} ${pendingRoll.characteristicValue} / ROLL 2D [${dice.dice[0]}] [${dice.dice[1]}] = ${dice.total} / MODIFIER ${signedNumber(modifier)} / EFFECTIVE ${effectiveTarget} OR LESS / ${success ? 'SUCCESS' : 'FAILURE'}`);
    setStatus(`${pendingRoll.characteristic} CHECK ${success ? 'SUCCEEDED' : 'FAILED'}: ${dice.total} vs ${effectiveTarget} OR LESS`, success ? 'ok' : 'error');
    return;
  }

  const target = pendingRoll.targetLocked
    ? pendingRoll.target
    : Number.parseInt(el.rollTarget.value, 10);
  const taskDM = Number(pendingRoll.taskDM ?? 0);
  const result = resolveRefereeSkillCheck({
    dice: createDice(),
    target,
    skillLevel: pendingRoll.skillLevel,
    intelligence: gameplayDocument.characteristics.INT,
    education: gameplayDocument.characteristics.EDU,
    situationalDM: taskDM + modifier
  });
  const extra = taskDM ? ` / TASK ${signedNumber(taskDM)}` : '';
  logActivity('CHECK', `${gameplayDocument.identity.name} / ${pendingRoll.skillName}-${pendingRoll.skillLevel} / ROLL 2D [${result.dice[0]}] [${result.dice[1]}] = ${result.roll} / SKILL ${signedNumber(result.skillLevel)} / INT ${signedNumber(result.intelligenceDM)} / EDU ${signedNumber(result.educationDM)}${extra} / MODIFIER ${signedNumber(modifier)} / TOTAL ${result.total} vs ${result.target}+ / ${result.success ? 'SUCCESS' : 'FAILURE'}`);
  setStatus(`${pendingRoll.skillName.toUpperCase()} CHECK ${result.success ? 'SUCCEEDED' : 'FAILED'}: ${result.total} vs ${result.target}+`, result.success ? 'ok' : 'error');
}


function closeHelp() {
  el.helpPanel.hidden = true;
  openHelpTopic = null;
}

function showHelp(topic, source) {
  const help = helpForTopic(topic);
  if (!help) return;

  if (!el.helpPanel.hidden && openHelpTopic === topic) {
    closeHelp();
    return;
  }

  openHelpTopic = topic;
  el.helpTitle.textContent = `${help.title} // HELP`;
  el.helpBody.textContent = help.body;

  const section = source?.closest('section');
  if (section) section.append(el.helpPanel);
  el.helpPanel.hidden = false;
}

function ensureGameplayDocument() {
  if (gameplayDocument) return gameplayDocument;
  if (documentMode !== TRAVELLER_DOCUMENT_KINDS.CHARGEN || character.phase !== CHARGEN_PHASES.COMPLETE) return null;
  gameplayDocument = createCharacterDocument(character);
  partyCharacterDocuments = [gameplayDocument];
  return gameplayDocument;
}

function currentPartyCharacters() {
  const byId = new Map(partyCharacterDocuments.map((entry) => [entry.identity.id, entry]));
  if (gameplayDocument) byId.set(gameplayDocument.identity.id, gameplayDocument);
  const order = campaignDocument?.party?.characterIds ?? [...byId.keys()];
  return order.map((id) => byId.get(id)).filter(Boolean);
}

function systemByName(name) {
  const target = String(name ?? '').trim().toLocaleLowerCase();
  if (!target) return null;
  return FAR_MERIDIAN_SUBSECTOR.systems.find((system) => system.name.toLocaleLowerCase() === target) ?? null;
}

function mappedCurrentSystem() {
  if (!campaignDocument) return null;
  if (campaignDocument.location.systemId) {
    return getSubsectorSystem(FAR_MERIDIAN_SUBSECTOR, campaignDocument.location.systemId);
  }
  return systemByName(campaignDocument.location.systemName);
}

function campaignLocationForSystem(system) {
  return {
    systemId: system.id,
    systemName: system.name,
    worldId: system.mainWorld.id,
    worldName: system.mainWorld.name
  };
}

function normalizeCampaignMappedLocation() {
  if (!campaignDocument || campaignDocument.location.systemId) return;
  const match = systemByName(campaignDocument.location.systemName);
  if (!match) return;
  campaignDocument = updateCampaignLocation(campaignDocument, campaignLocationForSystem(match));
}

function activeJumpRating() {
  const value = shipDocument?.specifications?.drives?.jump?.rating;
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function currentPortFuelService() {
  const system = mappedCurrentSystem();
  if (!system || !shipDocument) return null;
  const profile = parseUniversalWorldProfile(system.mainWorld.uwp);
  return starportFuelService(profile.starport, {
    scoutBase: system.bases.scout,
    ship: shipDocument
  });
}

function currentBerthingDue() {
  const system = mappedCurrentSystem();
  const portCall = shipDocument?.state?.portCall;
  if (!system || !portCall || portCall.systemId !== system.id) return null;
  return portCall;
}

function currentBerthingBlocksDeparture() {
  const portCall = currentBerthingDue();
  return Boolean(portCall && !portCall.berthingPaid && portCall.berthingDueCr > 0);
}

function formatCr(value) {
  return `Cr${Number(value ?? 0).toLocaleString('en-US')}`;
}

function freeCargoTons(ship = shipDocument) {
  if (!ship) return 0;
  return Math.max(0, ship.specifications.cargo.capacityTons - ship.state.cargoUsedTons);
}

function currentCommerceSkillDM() {
  if (!gameplayDocument?.skills) return 0;
  return Math.max(
    Number(gameplayDocument.skills.Admin ?? 0),
    Number(gameplayDocument.skills.Bribery ?? 0)
  );
}

function passengerRouteBlockReason(destinationSystemId) {
  if (!shipDocument || !destinationSystemId) return null;
  const mismatched = shipDocument.state.passengerManifest.filter((entry) => entry.destinationSystemId !== destinationSystemId);
  if (!mismatched.length) return null;
  const destinations = [...new Set(mismatched.map((entry) => getSubsectorSystem(FAR_MERIDIAN_SUBSECTOR, entry.destinationSystemId)?.name ?? entry.destinationSystemId))];
  return `PASSENGERS BOOKED FOR ${destinations.join(' / ').toUpperCase()}`;
}

function commerceRouteSnapshot() {
  if (!campaignDocument || !shipDocument) return null;
  const origin = mappedCurrentSystem();
  const destination = selectedSystemId ? getSubsectorSystem(FAR_MERIDIAN_SUBSECTOR, selectedSystemId) : null;
  if (!origin || !destination || origin.id === destination.id) return { origin, destination, reachable: false };
  const jumpRating = activeJumpRating();
  const distance = jumpDistanceBetweenSystems(FAR_MERIDIAN_SUBSECTOR, origin.id, destination.id);
  const reachable = Number.isInteger(jumpRating) && distance >= 1 && distance <= jumpRating;
  if (!reachable) return { origin, destination, distance, reachable: false };
  const originProfile = parseUniversalWorldProfile(origin.mainWorld.uwp);
  const destinationProfile = parseUniversalWorldProfile(destination.mainWorld.uwp);
  const passengerDemand = generatePassengerDemand(originProfile, destinationProfile, {
    destinationTravelZone: destination.travelZone,
    dice: seededDice(routeMarketSeed(campaignDocument, origin.id, destination.id, 'passengers'))
  });
  const freightIdPrefix = `freight-${campaignDateKey(campaignDocument)}-${origin.id}-${destination.id}`;
  const freight = generateFreightOffers(originProfile, destinationProfile, {
    destinationTravelZone: destination.travelZone,
    dice: seededDice(routeMarketSeed(campaignDocument, origin.id, destination.id, 'freight')),
    idPrefix: freightIdPrefix
  });
  return { origin, destination, originProfile, destinationProfile, distance, reachable, passengerDemand, freight };
}

function weeklySpeculativeOffer() {
  const system = mappedCurrentSystem();
  if (!campaignDocument || !system) return null;
  const profile = parseUniversalWorldProfile(system.mainWorld.uwp);
  return generateSpeculativeTradeOffer(profile, {
    dice: seededDice(weeklyTradeSeed(campaignDocument, system.id))
  });
}

function campaignDateSnapshot() {
  if (!campaignDocument) return null;
  return { year: campaignDocument.time.year, dayOfYear: campaignDocument.time.dayOfYear };
}

function currentContractBoard() {
  const system = mappedCurrentSystem();
  if (!campaignDocument || !system || !shipDocument) return { key: null, offers: [] };
  const jumpRating = activeJumpRating();
  const destinations = Number.isInteger(jumpRating)
    ? getJumpDestinations(FAR_MERIDIAN_SUBSECTOR, system.id, jumpRating)
    : [];
  return generateContractBoard({ campaign: campaignDocument, system, destinations, ship: shipDocument });
}

function activeContracts() {
  return contractDocuments.filter((entry) => entry.status === 'accepted');
}

function activeExclusiveContract() {
  return activeContracts().find((entry) => entry.requirements.exclusiveShip) ?? null;
}

function contractRouteBlockReason(destinationSystemId) {
  const exclusive = activeExclusiveContract();
  if (!exclusive || exclusive.destination.systemId === destinationSystemId) return null;
  return `EXCLUSIVE CHARTER FOR ${exclusive.destination.systemName.toUpperCase()}`;
}

function contractOfferAlreadyUsed(offer) {
  return contractDocuments.some((entry) => entry.provenance.offerId === offer.offerId);
}

function availableContractOffers() {
  return currentContractBoard().offers.filter((offer) => !contractOfferAlreadyUsed(offer));
}

function contractCargoId(contract) {
  return `${contract.identity.id}:cargo`;
}

function acceptedContractForOffer(offerId) {
  return contractDocuments.find((entry) => entry.provenance.offerId === offerId) ?? null;
}

function contractSourceLabel(offer) {
  if (offer.rulesBasis === 'classic-traveller-book-2-charter') return 'BOOK 2 CHARTER';
  if (offer.rulesBasis === 'classic-traveller-book-2-private-message') return 'BOOK 2 PRIVATE MESSAGE';
  return 'SEA OF SUNS';
}

function speculativeLotStateKey(offer, systemId) {
  if (!campaignDocument || !offer || !systemId) return null;
  return `${weeklyTradeSeed(campaignDocument, systemId)}|${offer.code}`;
}

function speculativeQuantityPurchased(offer, systemId) {
  const key = speculativeLotStateKey(offer, systemId);
  if (!campaignDocument || !key) return 0;
  return speculativeLotPurchasedQuantity(campaignDocument, key);
}

function speculativeSaleQuote(cargo) {
  const system = mappedCurrentSystem();
  if (!campaignDocument || !system || !cargo) return null;
  const match = /^speculative:(\d{2})$/.exec(cargo.category);
  if (!match) return null;
  const code = Number(match[1]);
  const profile = parseUniversalWorldProfile(system.mainWorld.uwp);
  return quoteSpeculativeResale(code, cargo.tons, profile, {
    dice: seededDice(saleQuoteSeed(campaignDocument, system.id, cargo.id)),
    characterSkillDM: currentCommerceSkillDM(),
    brokerDM: speculativeBrokerDM
  });
}

function bookedPassengerCount(route, passageClass) {
  if (!shipDocument || !route?.origin || !route?.destination) return 0;
  return shipDocument.state.passengerManifest.filter((entry) => (
    entry.originSystemId === route.origin.id
    && entry.destinationSystemId === route.destination.id
    && entry.class === passageClass
  )).length;
}

function passengerIdForRoute(route, passageClass) {
  const sequence = bookedPassengerCount(route, passageClass) + 1;
  return `pass-${campaignDateKey(campaignDocument)}-${route.origin.id}-${route.destination.id}-${passageClass}-${sequence}`;
}

function gameplayProcedure() {
  const missingShip = gameplayDocument?.shipRefs?.length && !shipDocument;
  if (campaignDocument) {
    const currentSystem = mappedCurrentSystem();
    return {
      available: { actions: [], choices: {} },
      title: 'SUBSECTOR NAVIGATION ACTIVE',
      text: currentSystem
        ? 'Select a system on the subsector map. In-range destinations may be jumped to by the active ship.'
        : 'The campaign has no mapped starting system yet. Select a system on the subsector map and set the current location.',
      detail: `${campaignDocument.identity.name || 'Unnamed Campaign'} / ${currentSystem ? currentSystem.name : 'LOCATION NOT MAPPED'}`,
      helpTopic: 'subsector-map',
      attention: !currentSystem
    };
  }
  return {
    available: { actions: [], choices: {} },
    title: 'GAMEPLAY DOCUMENT LOADED',
    text: missingShip
      ? 'The character document is loaded. Its ship is stored separately; load the matching Ship Document JSON to restore the ship register.'
      : 'The persistent gameplay character document is loaded.',
    detail: missingShip ? `${gameplayDocument.shipRefs.length} ship reference${gameplayDocument.shipRefs.length === 1 ? '' : 's'} recorded` : '',
    helpTopic: 'final-character-record',
    attention: Boolean(missingShip)
  };
}

function shipMatchesCharacter(ship, document) {
  if (!ship || !document) return false;
  return document.shipRefs.some((ref) => ref.shipId === ship.identity.id)
    && ship.authority.assignedCharacterId === document.identity.id;
}

function renderShip() {
  if (!shipDocument) {
    el.shipSection.hidden = true;
    renderCampaignHeader();
    applyCampaignLayout();
    return;
  }
  el.shipSection.hidden = campaignPlayActive() && activeWorkspaceView !== 'ship';
  if (el.shipName.value !== shipDocument.identity.name) el.shipName.value = shipDocument.identity.name;
  if (el.shipRegistry.value !== shipDocument.identity.registry) el.shipRegistry.value = shipDocument.identity.registry;
  el.shipRecord.textContent = buildShipRecord(shipDocument);
  renderCampaignHeader();
  applyCampaignLayout();
}

function persistGameplayDocuments() {
  if (!registry) return;
  for (const partyCharacter of currentPartyCharacters()) registry.put(partyCharacter);
  if (shipDocument) registry.put(shipDocument);
  for (const contract of contractDocuments) registry.put(contract);
  for (const situation of situationDocuments) registry.put(situation);
  for (const encounter of encounterDocuments) registry.put(encounter);
  for (const contact of contactDocuments) registry.put(contact);
  for (const thread of threadDocuments) registry.put(thread);
  for (const actor of npcActorDocuments) registry.put(actor);
  for (const asset of mediaAssetDocuments) registry.put(asset);
  for (const scene of sceneDocuments) registry.put(scene);
  if (activityLogDocument) registry.put(activityLogDocument);
}

function syncCampaignRefs() {
  if (!campaignDocument) return;
  campaignDocument = refreshCampaignDocumentRefs(campaignDocument, {
    characters: currentPartyCharacters(),
    ships: shipDocument ? [shipDocument] : [],
    contracts: contractDocuments,
    situations: situationDocuments,
    encounters: encounterDocuments,
    contacts: contactDocuments,
    threads: threadDocuments,
    npcActors: npcActorDocuments,
    assets: mediaAssetDocuments,
    activityLogs: activityLogDocument ? [activityLogDocument] : [],
    scenes: sceneDocuments
  });
}

function persistCampaignState() {
  syncCampaignRefs();
  persistGameplayDocuments();
  if (registry && campaignDocument) registry.put(campaignDocument);
  markAutosaved();
  scheduleCampaignHomeSave();
}

// --- v0.68.0: the campaign's home ------------------------------------------
// The browser registry is a cache; Firestore is where the campaign lives.
// Every autosave is followed, a couple of seconds later, by a revisioned
// write of the whole bundle. A referee who is signed out, or offline, keeps
// playing on the cache and the home catches up on the next signed-in save.
function campaignHomeAvailable() {
  return Boolean(campaignDocument && registry && currentUserId() && !campaignHomeStale);
}

function scheduleCampaignHomeSave() {
  if (!campaignHomeAvailable()) return;
  if (campaignHomeTimer) clearTimeout(campaignHomeTimer);
  campaignHomeTimer = setTimeout(() => {
    campaignHomeTimer = null;
    saveCampaignHomeNow().catch((error) => console.error('[traveller] campaign home:', error));
  }, 2000);
}

async function saveCampaignHomeNow() {
  if (!campaignHomeAvailable()) return null;
  if (campaignHomeSaving) { campaignHomeQueued = true; return null; }
  campaignHomeSaving = true;
  try {
    const uid = currentUserId();
    if (campaignDocument.ownership?.ownerUid !== uid) campaignDocument = setCampaignOwner(campaignDocument, uid);
    syncCampaignRefs();
    persistGameplayDocuments();
    registry.put(campaignDocument);
    const bundle = registry.buildBundle(campaignDocument.identity.id);
    const home = campaignHomeRevision === null
      ? createCampaignHome(bundle, { ownerUid: uid })
      : nextCampaignHome({ ownerUid: uid, revision: campaignHomeRevision }, bundle);
    const bytes = campaignHomeBytes(home);
    if (bytes > CAMPAIGN_HOME_SOFT_LIMIT_BYTES) console.warn(`[traveller] campaign home is ${Math.round(bytes / 1024)} KB, near the 1 MiB document limit`);
    const scene = activeEncounterAtCurrentSystem() ?? latestEncounterAtCurrentSystem();
    const envelope = buildPublishedCampaign(campaignDocument, {
      publishedAt: campaignDocument.ownership?.publishedAt ?? home.savedAt,
      currentEncounterId: scene?.identity.id ?? null,
      ship: shipDocument,
      activeScene: publishedActiveScene()
    });
    const written = await saveCampaignHome(home, envelope, { expectedRevision: campaignHomeRevision });
    // v0.70.0: a fight in progress reaches the players with every save —
    // starting it, placing a roster NPC, moving a token by hand — not only
    // when a round resolves. Failure here never blocks the save.
    if (scene?.status === 'active') {
      publishEncounterView(buildPublishedView(scene, { campaignId: campaignDocument.identity.id, publishedAt: home.savedAt }))
        .then(() => { lastPublishedRound = `${scene.identity.id}|${scene.round - 1}`; renderPublishPanel(); })
        .catch((error) => console.error('[traveller] scene publish:', error));
    }
    campaignHomeRevision = written;
    campaignHomeSavedAt = home.savedAt;
    campaignHomeError = null;
    // The envelope now exists and players seated later may read it: the
    // campaign is published by virtue of having a home.
    if (!campaignIsPublished(campaignDocument)) {
      campaignDocument = markCampaignPublished(campaignDocument, home.savedAt);
      registry.put(campaignDocument);
    }
    updateAutosaveStatus();
    renderPublishPanel();
    return home.revision;
  } catch (error) {
    if (error instanceof StaleCampaignHomeError) {
      campaignHomeStale = error;
      setStatus(`CAMPAIGN CHANGED ELSEWHERE / REVISION ${error.currentRevision} / RELOAD FROM CLOUD BEFORE CONTINUING`, 'error');
    } else {
      campaignHomeError = error?.message ?? String(error);
    }
    updateAutosaveStatus();
    throw error;
  } finally {
    campaignHomeSaving = false;
    if (campaignHomeQueued) { campaignHomeQueued = false; scheduleCampaignHomeSave(); }
  }
}

// Bring a campaign down from its home into the cache and open it.
async function openCampaignFromHome(campaignId, { quiet = false } = {}) {
  if (!registry) throw new Error('browser local storage is unavailable');
  const remote = await loadCampaignHome(campaignId);
  if (!remote) return false;
  const home = importCampaignHome(remote);
  const bundle = registry.putBundle(home.bundle);
  registry.setActiveCampaignId(bundle.campaign.identity.id);
  campaignHomeRevision = home.revision;
  campaignHomeSavedAt = home.savedAt;
  campaignHomeStale = null;
  campaignHomeError = null;
  returnCampaignId = null;
  restoreCampaignFromRegistry(bundle.campaign);
  lastAutosaveAt = null;
  if (!quiet) setStatus(`${(bundle.campaign.identity.name || 'CAMPAIGN').toUpperCase()} LOADED FROM CLOUD / REVISION ${home.revision}`, 'ok');
  closeHelp();
  render();
  return true;
}

// v0.69.0: [ START A CAMPAIGN ] on the lobby. The character comes from the
// account's own record; the campaign is created around it, saved to its home
// at once (which creates the envelope), and the record is marked as living in
// it — the same state a seat by invite produces, with the referee as player.
async function startCampaignFromRecord(characterId) {
  const uid = currentUserId();
  if (!uid) throw new Error('sign in first');
  const remote = await loadCharacterRecord(characterId);
  if (!remote) throw new Error('that character is not in your records');
  const record = importCharacterRecord(remote);
  if (record.ownerUid !== uid) throw new Error('that character belongs to another account');
  if (record.world.kind !== WORLD_KINDS.UNASSIGNED) throw new Error(`${record.name} is already in a world`);
  const characterDocument = importCharacterDocument(record.character);
  gameplayDocument = characterDocument;
  partyCharacterDocuments = [characterDocument];
  shipDocument = null;
  documentMode = TRAVELLER_DOCUMENT_KINDS.CHARACTER;
  newCampaign();
  if (!campaignDocument) throw new Error('the campaign could not be created');
  campaignDocument = setCampaignOwner(campaignDocument, uid);
  campaignDocument = setDocumentOwner(campaignDocument, { documentId: characterDocument.identity.id, ownerUid: uid });
  if (registry) registry.setActiveCampaignId(campaignDocument.identity.id);
  persistCampaignState();
  await saveCampaignHomeNow();
  await setCharacterRecordWorldRemote(characterId, {
    kind: WORLD_KINDS.CAMPAIGN, campaignId: campaignDocument.identity.id,
    campaignName: campaignDocument.identity.name ?? null, since: Date.now()
  });
  logActivity('SYSTEM', `${characterDocument.identity.name} starts this campaign from the lobby.`);
  setStatus(`${(campaignDocument.identity.name || 'CAMPAIGN').toUpperCase()} STARTED WITH ${characterDocument.identity.name.toUpperCase()}`, 'ok');
  window.history.replaceState(null, '', `${window.location.pathname}?campaign=${encodeURIComponent(campaignDocument.identity.id)}`);
  render();
}

async function reloadCampaignFromCloud() {
  try {
    if (!campaignDocument) throw new Error('no campaign to reload');
    if (!currentUserId()) throw new Error('sign in first');
    const found = await openCampaignFromHome(campaignDocument.identity.id);
    if (!found) throw new Error('this campaign has no cloud copy yet; it will get one on the next save');
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

// A campaign that arrives from the browser cache or a file does not know the
// home's revision. Saving with null refuses if a home exists, which is right:
// the referee must reload before overwriting what another browser saved.
function forgetCampaignHome() {
  campaignHomeRevision = null;
  campaignHomeSavedAt = null;
  campaignHomeStale = null;
  campaignHomeError = null;
}

function reconcileExpiredContracts({ log = true } = {}) {
  if (!campaignDocument || !contractDocuments.length) return [];
  const reconciled = reconcileContractDeadlines(contractDocuments, campaignDocument.time);
  if (!reconciled.failed.length) return [];

  contractDocuments = [...reconciled.contracts];
  const releasedCargo = [];
  for (const contract of reconciled.failed) {
    if (shipDocument && contract.requirements.cargoTons > 0) {
      const cargoId = contractCargoId(contract);
      if (shipDocument.state.cargoManifest.some((entry) => entry.id === cargoId)) {
        shipDocument = unloadCargo(shipDocument, cargoId).ship;
        releasedCargo.push(contract.identity.title);
      }
    }
    if (log) logActivity('CONTRACT', `${contract.identity.title} failed / deadline missed / due ${String(contract.timing.deadlineDate.dayOfYear).padStart(3, '0')}-${contract.timing.deadlineDate.year}`);
  }
  if (log && releasedCargo.length) {
    logActivity('SHIP', `${releasedCargo.length} failed contract cargo reservation${releasedCargo.length === 1 ? '' : 's'} released from manifest`);
  }
  syncCampaignRefs();
  return [...reconciled.failed];
}

function campaignDocumentsForDisplay() {
  if (!campaignDocument) return { characters: [], ships: [], contracts: [], situations: [], encounters: [], contacts: [], threads: [], npcActors: [], assets: [], activityLogs: [], missing: [] };
  let characters = [];
  let ships = [];
  let contracts = [];
  let situations = [];
  let encounters = [];
  let contacts = [];
  let threads = [];
  let npcActors = [];
  let assets = [];
  let activityLogs = [];
  let missing = [];
  if (registry) {
    try {
      const resolved = registry.resolveCampaign(campaignDocument);
      characters = resolved.characters;
      ships = resolved.ships;
      contracts = resolved.contracts;
      situations = resolved.situations;
      encounters = resolved.encounters;
      contacts = resolved.contacts;
      threads = resolved.threads;
      npcActors = resolved.npcActors;
      assets = resolved.assets;
      activityLogs = resolved.activityLogs;
      missing = resolved.missing;
    } catch (error) {
      console.error(error);
    }
  }
  if (gameplayDocument) {
    characters = characters.filter((entry) => entry.identity.id !== gameplayDocument.identity.id);
    characters.push(gameplayDocument);
    missing = missing.filter((id) => id !== gameplayDocument.identity.id);
  }
  if (shipDocument) {
    ships = ships.filter((entry) => entry.identity.id !== shipDocument.identity.id);
    ships.push(shipDocument);
    missing = missing.filter((id) => id !== shipDocument.identity.id);
  }
  for (const contract of contractDocuments) {
    contracts = contracts.filter((entry) => entry.identity.id !== contract.identity.id);
    contracts.push(contract);
    missing = missing.filter((id) => id !== contract.identity.id);
  }
  for (const situation of situationDocuments) {
    situations = situations.filter((entry) => entry.identity.id !== situation.identity.id);
    situations.push(situation);
    missing = missing.filter((id) => id !== situation.identity.id);
  }
  for (const encounter of encounterDocuments) {
    encounters = encounters.filter((entry) => entry.identity.id !== encounter.identity.id);
    encounters.push(encounter);
    missing = missing.filter((id) => id !== encounter.identity.id);
  }
  for (const contact of contactDocuments) {
    contacts = contacts.filter((entry) => entry.identity.id !== contact.identity.id);
    contacts.push(contact);
    missing = missing.filter((id) => id !== contact.identity.id);
  }
  for (const thread of threadDocuments) {
    threads = threads.filter((entry) => entry.identity.id !== thread.identity.id);
    threads.push(thread);
    missing = missing.filter((id) => id !== thread.identity.id);
  }
  for (const actor of npcActorDocuments) {
    npcActors = npcActors.filter((entry) => entry.identity.id !== actor.identity.id);
    npcActors.push(actor);
    missing = missing.filter((id) => id !== actor.identity.id);
  }
  for (const asset of mediaAssetDocuments) {
    assets = assets.filter((entry) => entry.identity.id !== asset.identity.id);
    assets.push(asset);
    missing = missing.filter((id) => id !== asset.identity.id);
  }
  if (activityLogDocument) {
    activityLogs = [activityLogDocument];
    missing = missing.filter((id) => id !== activityLogDocument.identity.id);
  }
  return { characters, ships, contracts, situations, encounters, contacts, threads, npcActors, assets, activityLogs, missing };
}

function renderCampaign() {
  el.saveCampaign.disabled = !campaignDocument || !registry;
  el.exportCampaign.disabled = !campaignDocument || !registry;
  el.loadCampaign.disabled = !registry || !registry.getActiveCampaignId();
  el.addCharacterToCampaign.hidden = !campaignDocument;
  if (!campaignDocument) {
    el.campaignSection.hidden = true;
    renderCampaignHeader();
    applyCampaignLayout();
    return;
  }

  syncCampaignRefs();
  el.campaignSection.hidden = false;
  if (el.campaignName.value !== campaignDocument.identity.name) el.campaignName.value = campaignDocument.identity.name;
  el.campaignDay.value = String(campaignDocument.time.dayOfYear);
  el.campaignYear.value = String(campaignDocument.time.year);
  if (el.campaignSystem.value !== campaignDocument.location.systemName) el.campaignSystem.value = campaignDocument.location.systemName;
  if (el.campaignWorld.value !== campaignDocument.location.worldName) el.campaignWorld.value = campaignDocument.location.worldName;
  const resolved = campaignDocumentsForDisplay();
  el.campaignActiveCharacter.replaceChildren(...campaignDocument.party.characterIds.map((id) => {
    const document = resolved.characters.find((entry) => entry.identity.id === id);
    return new Option((document?.identity.name || id).toUpperCase(), id);
  }));
  el.campaignActiveCharacter.value = playerSession?.viewedCharacterId ?? campaignDocument.activeCharacterId;
  el.campaignRecord.textContent = buildCampaignRecord(campaignDocument, resolved);
  el.threadRecord.textContent = buildAdventureThreadRecord({ threads: resolved.threads, contacts: resolved.contacts });
  renderCampaignHeader();
  applyCampaignLayout();
}

function selectSubsectorSystem(systemId) {
  const changed = selectedSystemId !== systemId;
  selectedSystemId = systemId;
  const system = getSubsectorSystem(FAR_MERIDIAN_SUBSECTOR, systemId);
  setStatus(`SYSTEM SELECTED: ${system?.name ?? systemId}`, 'ok');
  if (changed && system) {
    const current = mappedCurrentSystem();
    const distance = current && current.id !== system.id
      ? jumpDistanceBetweenSystems(FAR_MERIDIAN_SUBSECTOR, current.id, system.id)
      : 0;
    logActivity('NAV', current
      ? `${system.name} selected / ${system.hex} / ${distance} parsec${distance === 1 ? '' : 's'}`
      : `${system.name} selected / ${system.hex}`);
  }
  renderSubsector();
  renderSystemRecord();
  renderCommerce();
  renderContracts();
  renderSituations();
  renderEncounter();
  renderSelectedSystemSummary();
  renderCampaignHeader();
  applyCampaignLayout();
}

function setStartingSubsectorLocation() {
  try {
    if (!campaignDocument) throw new Error('no campaign is active');
    if (mappedCurrentSystem()) throw new Error('campaign already has a mapped current system');
    const system = getSubsectorSystem(FAR_MERIDIAN_SUBSECTOR, selectedSystemId);
    if (!system) throw new Error('select a starting system first');
    campaignDocument = updateCampaignLocation(campaignDocument, campaignLocationForSystem(system));
    selectedSystemId = null;
    logActivity('NAV', `Current location established: ${system.name} / ${system.hex} / ${system.mainWorld.name}`);
    setStatus(`STARTING LOCATION SET: ${system.name} / ${system.mainWorld.name} / SAVE CAMPAIGN`, 'ok');
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function acceptContractOffer(offerId) {
  try {
    if (!campaignDocument || !gameplayDocument || !shipDocument) throw new Error('active campaign character and ship are required');
    const current = mappedCurrentSystem();
    if (!current) throw new Error('current system must be mapped');
    const offer = currentContractBoard().offers.find((entry) => entry.offerId === offerId);
    if (!offer) throw new Error('contract offer is no longer available at this port call');
    if (acceptedContractForOffer(offer.offerId)) throw new Error('that contract offer has already been used');
    if (offer.originSystemId !== current.id) throw new Error('contract offer does not originate at the current system');

    const exclusive = activeExclusiveContract();
    if (exclusive) throw new Error(`exclusive charter already active for ${exclusive.destination.systemName}`);
    if (offer.exclusiveShip) {
      if (activeContracts().length) throw new Error('complete existing contracts before accepting an exclusive whole-ship charter');
      if (shipDocument.state.cargoManifest.length || shipDocument.state.passengerManifest.length) {
        throw new Error('exclusive whole-ship charter requires empty cargo and passenger manifests');
      }
    }
    if (offer.cargoTons > freeCargoTons()) {
      throw new Error(`contract requires ${offer.cargoTons} tons; only ${freeCargoTons()} tons are free`);
    }

    const contract = createContractDocument(offer, {
      acceptedByCharacterId: gameplayDocument.identity.id,
      acceptedShipId: shipDocument.identity.id,
      acceptedDate: campaignDateSnapshot()
    });

    let nextShip = shipDocument;
    if (contract.requirements.cargoTons > 0) {
      nextShip = loadCargo(nextShip, {
        id: contractCargoId(contract),
        category: `contract:${contract.identity.id}`,
        description: contract.identity.title,
        tons: contract.requirements.cargoTons,
        originSystemId: contract.origin.systemId,
        destinationSystemId: contract.destination.systemId,
        acquisitionCostCr: 0,
        notes: `Contract cargo / ${contract.identity.id}`
      });
    }

    shipDocument = nextShip;
    contractDocuments = [...contractDocuments, contract];
    campaignDocument = addContractToCampaign(campaignDocument, contract);
    syncCampaignRefs();
    persistGameplayDocuments();
    if (registry) registry.put(campaignDocument);
    logActivity('JOB', `ACCEPTED / ${contract.identity.title} / ${contract.origin.systemName} -> ${contract.destination.systemName} / ${formatCr(contract.economics.paymentCr)} / DUE ${String(contract.timing.deadlineDate.dayOfYear).padStart(3, '0')}-${contract.timing.deadlineDate.year}`);
    setStatus(`JOB ACCEPTED: ${contract.identity.title.toUpperCase()} / ${contract.origin.systemName.toUpperCase()} -> ${contract.destination.systemName.toUpperCase()}`, 'ok');
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function resolveContractsAtDestination(ship, destination) {
  let nextShip = ship;
  const date = campaignDateSnapshot();
  const updated = [];
  const results = [];

  for (const contract of contractDocuments) {
    if (contract.status !== 'accepted' || contract.destination.systemId !== destination.id) {
      updated.push(contract);
      continue;
    }

    let cargoPresent = true;
    if (contract.requirements.cargoTons > 0) {
      const cargoId = contractCargoId(contract);
      const cargo = nextShip.state.cargoManifest.find((entry) => entry.id === cargoId);
      cargoPresent = Boolean(cargo && Math.abs(cargo.tons - contract.requirements.cargoTons) < 1e-9);
      if (cargo) nextShip = unloadCargo(nextShip, cargoId).ship;
    }

    const overdue = isContractOverdue(contract, campaignDocument.time);
    if (overdue || !cargoPresent) {
      const reason = overdue ? 'deadline missed' : 'required contract cargo missing';
      const failed = failContractDocument(contract, { date, notes: reason });
      updated.push(failed);
      results.push({ contract: failed, success: false, paymentCr: 0, reason });
      continue;
    }

    nextShip = creditShipAccount(nextShip, contract.economics.paymentCr, {
      kind: 'contract',
      description: `${contract.identity.title} completed / ${destination.name}`,
      dateLabel: activityDateLabel()
    });
    const completed = completeContractDocument(contract, {
      date,
      paymentCr: contract.economics.paymentCr,
      notes: `Completed at ${destination.name}`
    });
    updated.push(completed);
    results.push({ contract: completed, success: true, paymentCr: completed.economics.paymentCr, reason: null });
  }

  contractDocuments = updated;
  return { ship: nextShip, results };
}

function jumpToSelectedSystem() {
  try {
    if (!campaignDocument) throw new Error('no campaign is active');
    const current = mappedCurrentSystem();
    if (!current) throw new Error('set the campaign starting system before jumping');
    const destination = getSubsectorSystem(FAR_MERIDIAN_SUBSECTOR, selectedSystemId);
    if (!destination) throw new Error('select a destination system first');
    if (destination.id === current.id) throw new Error('destination must be a different system');
    const jumpRating = activeJumpRating();
    if (!Number.isInteger(jumpRating) || !shipDocument) throw new Error('an active ship with a jump drive is required');
    const distance = jumpDistanceBetweenSystems(FAR_MERIDIAN_SUBSECTOR, current.id, destination.id);
    if (distance > jumpRating) throw new Error(`${destination.name} is ${distance} parsecs away; active ship is Jump-${jumpRating}`);
    if (currentBerthingBlocksDeparture()) {
      throw new Error(`${formatCr(currentBerthingDue().berthingDueCr)} berthing is due before departure`);
    }

    const passengerBlock = passengerRouteBlockReason(destination.id);
    if (passengerBlock) throw new Error(`${passengerBlock.toLowerCase()}; deliver booked passengers before changing route`);
    const contractBlock = contractRouteBlockReason(destination.id);
    if (contractBlock) throw new Error(`${contractBlock.toLowerCase()}; complete the charter before changing route`);

    const fuelCheck = canShipMakeJump(shipDocument, distance);
    if (!fuelCheck.allowed) {
      if (fuelCheck.reason === 'FUEL UNRECORDED') throw new Error('ship fuel is unrecorded; refuel or skim before jumping');
      throw new Error(`insufficient fuel: need ${fuelCheck.requirement.totalTons} tons; have ${fuelCheck.availableTons} tons`);
    }

    const lifeSupport = calculateLifeSupportCostForTrip(shipDocument);
    if (lifeSupport.totalCr > shipDocument.state.finances.balanceCr) {
      throw new Error(`ship operating account requires ${formatCr(lifeSupport.totalCr)} for life support; balance ${formatCr(shipDocument.state.finances.balanceCr)}`);
    }

    const shipLabel = shipDocument.identity.name || shipDocument.identity.registry || 'Active ship';
    let nextShip = shipDocument;
    const lifeSupportResult = chargeLifeSupportForTrip(nextShip, { dateLabel: activityDateLabel() });
    nextShip = lifeSupportResult.ship;
    const fuelResult = consumeJumpFuel(nextShip, distance);
    nextShip = fuelResult.ship;

    logActivity('JUMP', `${shipLabel} departed ${current.name} / destination ${destination.name} / ${distance} parsec${distance === 1 ? '' : 's'} / fuel ${fuelCheck.requirement.totalTons}t`);
    if (lifeSupportResult.totalCr > 0) {
      logActivity('SHIP', `${shipLabel} life support charged / ${formatCr(lifeSupportResult.totalCr)} / ${lifeSupportResult.occupiedStaterooms} occupied stateroom${lifeSupportResult.occupiedStaterooms === 1 ? '' : 's'}`);
    }

    campaignDocument = updateCampaignLocation(campaignDocument, campaignLocationForSystem(destination));
    // Book 2 describes jump travel as taking about one week regardless of
    // distance. v0.9 resolves that campaign interval as seven days.
    campaignDocument = advanceCampaignDays(campaignDocument, 7);

    const freightDelivery = deliverFreightAtDestination(nextShip, destination.id, { dateLabel: activityDateLabel() });
    nextShip = freightDelivery.ship;
    const passengerDelivery = disembarkPassengersAtDestination(nextShip, destination.id, { dateLabel: activityDateLabel() });
    nextShip = passengerDelivery.ship;
    const contractResolution = resolveContractsAtDestination(nextShip, destination);
    nextShip = contractResolution.ship;

    const destinationProfile = parseUniversalWorldProfile(destination.mainWorld.uwp);
    nextShip = beginPortCall(nextShip, {
      systemId: destination.id,
      arrivalDate: activityDateLabel(),
      berthingDueCr: destinationProfile.starport === 'X' ? 0 : calculateBerthingCost(1)
    });
    shipDocument = nextShip;
    reconcileExpiredContracts();
    selectedSystemId = null;
    logActivity('ARRIVAL', `${shipLabel} arrived ${destination.name} / ${destination.hex} / ${destination.mainWorld.name} / fuel ${shipDocument.state.currentFuelTons}t`);
    ensureArrivalSituation({ log: true });
    persistCampaignState();
    if (freightDelivery.delivered.length) {
      logActivity('TRADE', `${freightDelivery.delivered.length} freight shipment${freightDelivery.delivered.length === 1 ? '' : 's'} delivered at ${destination.name} / +${formatCr(freightDelivery.revenueCr)}`);
    }
    if (passengerDelivery.passengers.length) {
      logActivity('TRADE', `${passengerDelivery.passengers.length} passenger${passengerDelivery.passengers.length === 1 ? '' : 's'} disembarked at ${destination.name} / +${formatCr(passengerDelivery.revenueCr)}`);
    }
    for (const result of contractResolution.results) {
      if (result.success) {
        logActivity('CONTRACT', `${result.contract.identity.title} completed at ${destination.name} / +${formatCr(result.paymentCr)}`);
      } else {
        logActivity('CONTRACT', `${result.contract.identity.title} failed at ${destination.name} / ${result.reason}`);
      }
    }
    if (shipDocument.state.portCall.berthingDueCr > 0) {
      logActivity('PORT', `${destination.name} berthing assessed / ${formatCr(shipDocument.state.portCall.berthingDueCr)} due`);
    }
    setStatus(`JUMP COMPLETE: ${destination.name} / +7 DAYS / FUEL ${shipDocument.state.currentFuelTons}t / SAVE CAMPAIGN`, 'ok');
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}


function createSvgElement(name, attributes = {}) {
  return createSvgNode(name, attributes);
}

const SUBSECTOR_ZOOM_MIN = 0.7;
const SUBSECTOR_ZOOM_MAX = 1.6;
const SUBSECTOR_ZOOM_STEP = 0.15;

function clampSubsectorZoom(value) {
  return Math.min(SUBSECTOR_ZOOM_MAX, Math.max(SUBSECTOR_ZOOM_MIN, Math.round(value * 100) / 100));
}

function applySubsectorZoom() {
  const svg = el.subsectorMap.querySelector('.subsector-svg');
  if (svg) {
    const vh = Math.round(62 * subsectorZoom * 100) / 100;
    const px = Math.round(610 * subsectorZoom);
    svg.style.height = `min(${vh}vh, ${px}px)`;
  }
  if (el.mapZoomLabel) el.mapZoomLabel.textContent = `${Math.round(subsectorZoom * 100)}%`;
  if (el.mapZoomOut) el.mapZoomOut.disabled = subsectorZoom <= SUBSECTOR_ZOOM_MIN;
  if (el.mapZoomIn) el.mapZoomIn.disabled = subsectorZoom >= SUBSECTOR_ZOOM_MAX;
}

function setSubsectorZoom(value) {
  subsectorZoom = clampSubsectorZoom(value);
  applySubsectorZoom();
}

// v0.70.0: the hex map is drawn by subsector-svg.js so the player page draws
// the same one; the referee's version is interactive.
function renderSubsectorSvg({ current, selected, reachable }) {
  return renderSubsectorMap({
    subsector: FAR_MERIDIAN_SUBSECTOR, columns: SUBSECTOR_COLUMNS, rows: SUBSECTOR_ROWS,
    current, selected, reachable, onSelect: (system) => selectSubsectorSystem(system.id)
  });
}

function renderSystemRecord() {
  if (!campaignDocument) {
    el.systemRecordSection.hidden = true;
    el.systemRecord.textContent = '';
    renderSelectedSystemSummary();
    return;
  }
  const current = mappedCurrentSystem();
  const selected = selectedSystemId ? getSubsectorSystem(FAR_MERIDIAN_SUBSECTOR, selectedSystemId) : null;
  const system = selected ?? current;
  if (!system) {
    el.systemRecordSection.hidden = true;
    el.systemRecord.textContent = '';
    renderSelectedSystemSummary();
    return;
  }
  el.systemRecordSection.hidden = !systemDetailsOpen;
  el.systemRecordHeading.textContent = selected && selected.id !== current?.id
    ? 'SELECTED SYSTEM RECORD'
    : 'CURRENT SYSTEM RECORD';
  el.systemRecord.textContent = buildSystemRecord(system);
  renderSelectedSystemSummary();
  applyCampaignLayout();
}

function makePortButton(label, handler, { disabled = false } = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'text-button action-button';
  button.textContent = `[ ${label} ]`;
  button.disabled = disabled;
  button.addEventListener('click', handler);
  return button;
}

function transferFundsToShip() {
  try {
    if (!gameplayDocument || !shipDocument) throw new Error('active character and ship are required');
    const input = el.portActions.querySelector('#ship-transfer-amount');
    const amountCr = Number.parseInt(input?.value ?? '', 10);
    const result = transferCharacterCreditsToShip(gameplayDocument, shipDocument, amountCr, {
      dateLabel: activityDateLabel()
    });
    gameplayDocument = result.character;
    shipDocument = result.ship;
    persistGameplayDocuments();
    logActivity('SHIP', `${gameplayDocument.identity.name || 'Character'} transferred ${formatCr(amountCr)} to ${shipDocument.identity.name || 'ship'} operating account`);
    setStatus(`SHIP ACCOUNT FUNDED: +${formatCr(amountCr)}`, 'ok');
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function refuelAtCurrentPort() {
  try {
    const system = mappedCurrentSystem();
    if (!system || !shipDocument) throw new Error('active ship at a mapped system is required');
    const service = currentPortFuelService();
    if (!service?.available) throw new Error('starport fuel is unavailable here');
    const source = service.freeScoutFuel ? `${system.name} Scout Base` : service.source;
    const result = refuelShipToCapacity(shipDocument, {
      quality: service.quality,
      pricePerTonCr: service.pricePerTonCr,
      source,
      dateLabel: activityDateLabel()
    });
    shipDocument = result.ship;
    persistGameplayDocuments();
    if (result.addedTons > 0) {
      logActivity('SHIP', `${shipDocument.identity.name || 'Ship'} refueled ${result.addedTons}t ${service.quality} at ${system.name} / ${result.costCr ? formatCr(result.costCr) : 'FREE'}`);
      setStatus(`REFUELED ${result.addedTons}t ${service.quality.toUpperCase()} / ${result.costCr ? formatCr(result.costCr) : 'FREE'}`, 'ok');
    } else {
      setStatus('FUEL TANKS ALREADY FULL', 'ok');
    }
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function buyFuelAtCurrentPort() {
  try {
    const system = mappedCurrentSystem();
    if (!system || !shipDocument) throw new Error('active ship at a mapped system is required');
    const service = currentPortFuelService();
    if (!service?.available) throw new Error('starport fuel is unavailable here');
    const input = el.portActions.querySelector('#ship-fuel-tons');
    const tons = Number.parseInt(input?.value ?? '', 10);
    if (!Number.isInteger(tons) || tons < 1) throw new Error('fuel purchase must be at least 1 ton');

    const capacity = shipDocument.specifications.fuel.capacityTons;
    const currentFuel = Number.isFinite(shipDocument.state.currentFuelTons) ? shipDocument.state.currentFuelTons : 0;
    const missingFuel = Math.max(0, capacity - currentFuel);
    if (tons > missingFuel) throw new Error(`fuel tanks have room for only ${missingFuel} tons`);

    const source = service.freeScoutFuel ? `${system.name} Scout Base` : service.source;
    const result = purchaseShipFuel(shipDocument, {
      tons,
      quality: service.quality,
      pricePerTonCr: service.pricePerTonCr,
      source,
      dateLabel: activityDateLabel()
    });
    shipDocument = result.ship;
    persistGameplayDocuments();
    logActivity('SHIP', `${shipDocument.identity.name || 'Ship'} took on ${result.addedTons}t ${service.quality} fuel at ${system.name} / ${result.costCr ? formatCr(result.costCr) : 'FREE'}`);
    setStatus(`FUEL PURCHASED: ${result.addedTons}t ${service.quality.toUpperCase()} / ${result.costCr ? formatCr(result.costCr) : 'FREE'}`, 'ok');
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function payBerthingAtCurrentPort() {
  try {
    const system = mappedCurrentSystem();
    if (!system || !shipDocument) throw new Error('active ship at a mapped system is required');
    const result = payCurrentBerthing(shipDocument, {
      dateLabel: activityDateLabel(),
      description: `${system.name} starport berthing`
    });
    shipDocument = result.ship;
    persistGameplayDocuments();
    if (result.costCr > 0) {
      logActivity('PORT', `${shipDocument.identity.name || 'Ship'} paid ${formatCr(result.costCr)} berthing at ${system.name}`);
      setStatus(`BERTHING PAID: ${formatCr(result.costCr)}`, 'ok');
    } else {
      setStatus('BERTHING ALREADY SETTLED', 'ok');
    }
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function skimCurrentGasGiant() {
  try {
    const system = mappedCurrentSystem();
    if (!campaignDocument || !system || !shipDocument) throw new Error('active campaign ship at a mapped system is required');
    if (!system.gasGiant) throw new Error('this system has no recorded gas giant');
    if (currentBerthingBlocksDeparture()) throw new Error('pay current berthing before departing for gas-giant refueling');
    const result = skimGasGiantToCapacity(shipDocument);
    if (result.addedTons <= 0) {
      setStatus('FUEL TANKS ALREADY FULL', 'ok');
      return;
    }
    shipDocument = result.ship;
    campaignDocument = advanceCampaignDays(campaignDocument, result.elapsedDays);
    reconcileExpiredContracts();
    persistCampaignState();
    logActivity('SHIP', `${shipDocument.identity.name || 'Ship'} skimmed ${result.addedTons}t unrefined fuel at ${system.name} gas giant / +${result.elapsedDays} days`);
    setStatus(`GAS-GIANT REFUEL COMPLETE: +${result.addedTons}t UNREFINED / +${result.elapsedDays} DAYS`, 'ok');
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function assertCommerceAvailable() {
  const exclusive = activeExclusiveContract();
  if (exclusive) throw new Error(`exclusive charter active for ${exclusive.destination.systemName}; commercial capacity is committed`);
}

function acceptFreightOffer(offerId) {
  try {
    assertCommerceAvailable();
    const route = commerceRouteSnapshot();
    if (!route?.reachable || !shipDocument) throw new Error('select a reachable freight destination first');
    const offer = route.freight.offers.find((entry) => entry.id === offerId);
    if (!offer) throw new Error('freight offer is no longer available');
    if (shipDocument.state.cargoManifest.some((entry) => entry.id === offer.id)) throw new Error('that freight shipment is already aboard');
    shipDocument = loadCargo(shipDocument, {
      id: offer.id,
      category: 'freight',
      description: `${offer.category} freight to ${route.destination.name}`,
      tons: offer.tons,
      originSystemId: route.origin.id,
      destinationSystemId: route.destination.id,
      acquisitionCostCr: 0,
      notes: `Book 2 freight / ${formatCr(FREIGHT_RATE_PER_TON_CR)} per ton on delivery.`
    });
    persistGameplayDocuments();
    logActivity('TRADE', `${shipDocument.identity.name || 'Ship'} accepted ${offer.tons}t ${offer.category} freight / ${route.origin.name} to ${route.destination.name} / ${formatCr(offer.revenueCr)} on delivery`);
    setStatus(`FREIGHT ACCEPTED: ${offer.tons}t TO ${route.destination.name.toUpperCase()}`, 'ok');
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function bookRoutePassenger(passageClass) {
  try {
    assertCommerceAvailable();
    const route = commerceRouteSnapshot();
    if (!route?.reachable || !shipDocument) throw new Error('select a reachable passenger destination first');
    const demand = route.passengerDemand[passageClass] ?? 0;
    const alreadyBooked = bookedPassengerCount(route, passageClass);
    if (alreadyBooked >= demand) throw new Error(`no additional ${passageClass} passengers are available for this route`);
    const id = passengerIdForRoute(route, passageClass);
    shipDocument = bookPassenger(shipDocument, {
      id,
      passageClass,
      originSystemId: route.origin.id,
      destinationSystemId: route.destination.id
    });
    persistGameplayDocuments();
    logActivity('TRADE', `${passageClass.toUpperCase()} passenger booked / ${route.origin.name} to ${route.destination.name} / fare ${formatCr(PASSAGE_FARES_CR[passageClass])}`);
    setStatus(`${passageClass.toUpperCase()} PASSENGER BOOKED TO ${route.destination.name.toUpperCase()}`, 'ok');
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function buySpeculativeQuantity(quantity) {
  try {
    assertCommerceAvailable();
    const system = mappedCurrentSystem();
    if (!campaignDocument || !system || !shipDocument) throw new Error('active campaign ship at a mapped system is required');
    const offer = weeklySpeculativeOffer();
    if (!offer) throw new Error('no speculative trade lot is available');
    const purchased = speculativeQuantityPurchased(offer, system.id);
    const remaining = Math.max(0, offer.quantityAvailable - purchased);
    if (quantity > remaining) throw new Error(`only ${remaining} ${offer.unit} remain in this weekly lot`);
    const result = purchaseSpeculativeCargo(shipDocument, offer, quantity, {
      originSystemId: system.id,
      dateLabel: activityDateLabel()
    });
    shipDocument = result.ship;
    campaignDocument = recordSpeculativeLotPurchase(campaignDocument, {
      key: speculativeLotStateKey(offer, system.id),
      systemId: system.id,
      tradeGoodCode: offer.code,
      quantity
    });
    persistCampaignState();
    logActivity('TRADE', `${shipDocument.identity.name || 'Ship'} bought ${quantity}t ${offer.name} at ${system.name} / ${formatCr(result.costCr)}${result.handlingFeeCr ? ` incl. ${formatCr(result.handlingFeeCr)} handling` : ''}`);
    setStatus(`SPECULATIVE CARGO BOUGHT: ${quantity}t ${offer.name.toUpperCase()} / ${formatCr(result.costCr)}`, 'ok');
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function sellSpeculativeLot(cargoId) {
  try {
    assertCommerceAvailable();
    const system = mappedCurrentSystem();
    if (!shipDocument || !system) throw new Error('active ship at a mapped system is required');
    const cargo = shipDocument.state.cargoManifest.find((entry) => entry.id === cargoId);
    if (!cargo) throw new Error('speculative cargo lot is no longer aboard');
    if (cargo.originSystemId === system.id) throw new Error('speculative cargo must be transported to another world before resale');
    const quote = speculativeSaleQuote(cargo);
    if (!quote) throw new Error('unable to quote this cargo');
    const result = sellSpeculativeCargo(shipDocument, cargoId, quote, {
      dateLabel: activityDateLabel(),
      destinationSystemId: system.id
    });
    shipDocument = result.ship;
    persistCampaignState();
    const profitText = `${result.profitCr >= 0 ? '+' : '-'}${formatCr(Math.abs(result.profitCr))}`;
    logActivity('TRADE', `${cargo.tons}t ${cargo.description} sold / ${formatCr(result.revenueCr)} net / result ${profitText}`);
    setStatus(`SPECULATIVE CARGO SOLD: ${formatCr(result.revenueCr)} / RESULT ${profitText}`, 'ok');
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function declineSpeculativeQuote(cargoId) {
  try {
    assertCommerceAvailable();
    const system = mappedCurrentSystem();
    if (!shipDocument || !system) throw new Error('active ship at a mapped system is required');
    const cargo = shipDocument.state.cargoManifest.find((entry) => entry.id === cargoId);
    if (!cargo) throw new Error('speculative cargo lot is no longer aboard');
    const quote = speculativeSaleQuote(cargo);
    if (!quote) throw new Error('unable to quote this cargo');
    const result = payDeclinedBrokerFee(shipDocument, quote, { dateLabel: activityDateLabel() });
    shipDocument = result.ship;
    declinedQuoteIds.add(cargoId);
    persistCampaignState();
    if (result.feeCr > 0) {
      logActivity('TRADE', `${cargo.tons}t ${cargo.description} sale declined / broker fee ${formatCr(result.feeCr)} owed (Book 2 p.48)`);
      setStatus(`QUOTE DECLINED / BROKER FEE ${formatCr(result.feeCr)} CHARGED`, 'ok');
    } else {
      logActivity('TRADE', `${cargo.tons}t ${cargo.description} sale declined / no broker engaged`);
      setStatus('QUOTE DECLINED / NO BROKER FEE OWED', 'ok');
    }
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

const declinedQuoteIds = new Set();

function renderCommerce() {
  const current = mappedCurrentSystem();
  if (!campaignDocument || !current || !shipDocument) {
    el.commerceSection.dataset.available = 'false';
    el.commerceSection.hidden = true;
    el.commerceRecord.textContent = '';
    el.commerceActions.replaceChildren();
    applyOperationsDeskTab();
    return;
  }

  el.commerceSection.dataset.available = 'true';
  el.commerceSection.hidden = false;
  const route = commerceRouteSnapshot();
  const offer = weeklySpeculativeOffer();
  const freeHold = freeCargoTons();
  const groups = [];

  groups.push({
    label: `${current.name.toUpperCase()} / ${current.hex}`,
    items: [
      panelRow('ACCOUNT', formatCr(shipDocument.state.finances.balanceCr)),
      panelRow('HOLD', `${shipDocument.state.cargoUsedTons}/${shipDocument.specifications.cargo.capacityTons}t / ${freeHold}t FREE`)
    ]
  });

  if (route?.destination && route.reachable) {
    const bookedHigh = bookedPassengerCount(route, 'high');
    const bookedMiddle = bookedPassengerCount(route, 'middle');
    const bookedLow = bookedPassengerCount(route, 'low');
    const highRemaining = Math.max(0, route.passengerDemand.high - bookedHigh);
    const middleRemaining = Math.max(0, route.passengerDemand.middle - bookedMiddle);
    const lowRemaining = Math.max(0, route.passengerDemand.low - bookedLow);
    const highCapacity = availablePassengerCapacity(shipDocument, 'high');
    const middleCapacity = availablePassengerCapacity(shipDocument, 'middle');
    const lowCapacity = availablePassengerCapacity(shipDocument, 'low');
    const steward = shipDocument.crew.assignments.some((entry) => entry.role.toLowerCase() === 'steward');
    const acceptedFreightIds = new Set(shipDocument.state.cargoManifest.filter((entry) => entry.category === 'freight').map((entry) => entry.id));
    const fittingFreight = route.freight.offers.filter((entry) => !acceptedFreightIds.has(entry.id) && entry.tons <= freeHold + 1e-9);
    groups.push({
      label: `ROUTE / ${route.origin.name.toUpperCase()} -> ${route.destination.name.toUpperCase()} / ${route.distance} PC`,
      items: [
        panelRow('HIGH', `${highRemaining} DEMAND / ${steward ? `${Math.min(highRemaining, highCapacity)} BOOKABLE` : 'STEWARD REQUIRED'}`, { attention: !steward && highRemaining > 0 }),
        panelRow('MIDDLE', `${middleRemaining} DEMAND / ${Math.min(middleRemaining, middleCapacity)} BOOKABLE`),
        panelRow('LOW', `${lowRemaining} DEMAND / ${Math.min(lowRemaining, lowCapacity)} BOOKABLE`),
        panelRow('FREIGHT', `${route.freight.counts.major} MAJ / ${route.freight.counts.minor} MIN / ${route.freight.counts.incidental} INC`),
        ...fittingFreight.slice(0, 4).map((freight) => panelCard({
          title: `${freight.tons}t ${freight.category.toUpperCase()} LOT`,
          rows: [panelRow('PAYS', `${formatCr(freight.revenueCr)} ON DELIVERY`)],
          actionId: `freight:${freight.id}`,
          actionLabel: '[ ACCEPT ]'
        }))
      ]
    });
  } else {
    groups.push({
      label: 'ROUTE',
      items: [panelRow('STATUS', route?.destination
        ? `${route.destination.name.toUpperCase()} / OUT OF JUMP RANGE`
        : 'SELECT A REACHABLE DESTINATION', { attention: Boolean(route?.destination) })]
    });
  }

  if (offer) {
    const aboard = offer.unit === 'tons' ? speculativeQuantityPurchased(offer, current.id) : 0;
    const remaining = Math.max(0, offer.quantityAvailable - aboard);
    const specBuy = { max: 0, cost: 0, blockedReason: '' };
    if (offer.unit === 'tons') {
      const maxByHold = Math.min(Math.floor(freeHold), remaining);
      for (let quantity = maxByHold; quantity >= 1; quantity -= 1) {
        const cost = calculateSpeculativePurchaseCost(offer, quantity).totalCr;
        if (cost <= shipDocument.state.finances.balanceCr) { specBuy.max = quantity; specBuy.cost = cost; break; }
      }
      if (!specBuy.max) {
        specBuy.blockedReason = maxByHold < 1
          ? `NO FREE HOLD / ${freeHold}t AVAILABLE`
          : `ACCOUNT SHORT / 1t COSTS ${formatCr(calculateSpeculativePurchaseCost(offer, 1).totalCr)}`;
      } else if (specBuy.max < maxByHold) {
        specBuy.blockedReason = `ACCOUNT COVERS ${specBuy.max}t OF ${maxByHold}t THAT FIT`;
      }
    }
    groups.push({
      label: `SPECULATION / WEEK ${campaignWeekKey(campaignDocument)}`,
      items: [panelCard({
        title: `LOT ${offer.code} / ${offer.name.toUpperCase()}`,
        meta: `BASE ${formatCr(offer.basePriceCr)} PER ${offer.unit === 'tons' ? 'TON' : 'ITEM'}`,
        rows: [
          panelRow('AVAILABLE', `${remaining}/${offer.quantityAvailable} ${offer.unit.toUpperCase()}`),
          panelRow('QUOTE', `${formatCr(offer.pricePerUnitCr)} / ${offer.percentage}% OF BASE`),
          panelRow('DM', `PURCHASE ${signedNumber(offer.purchaseDM)}`)
        ],
        note: offer.unit === 'each'
          ? 'REFEREE TONNAGE REQUIRED FOR INDIVIDUAL ITEMS / BOOK 2 p.48'
          : specBuy.blockedReason,
        actionId: specBuy.max >= 1 ? `spec:${specBuy.max}` : null,
        actionLabel: specBuy.max >= 1 ? `[ BUY ${specBuy.max}t / ${formatCr(specBuy.cost)} ]` : '',
        actionDisabled: false
      })]
    });
  }

  const passengers = shipDocument.state.passengerManifest;
  const freightAboard = shipDocument.state.cargoManifest.filter((entry) => entry.category === 'freight');
  const saleCargo = shipDocument.state.cargoManifest.filter((entry) => /^speculative:\d{2}$/.test(entry.category));
  const aboardItems = [
    panelRow('MANIFEST', `${passengers.length} PAX / ${freightAboard.length} FREIGHT / ${saleCargo.length} LOT${saleCargo.length === 1 ? '' : 'S'}`)
  ];
  for (const passenger of passengers.slice(0, 4)) {
    const dest = getSubsectorSystem(FAR_MERIDIAN_SUBSECTOR, passenger.destinationSystemId);
    aboardItems.push(panelRow(passenger.class.toUpperCase(), `${(dest?.name ?? passenger.destinationSystemId).toUpperCase()} / ${formatCr(passenger.fareCr)}`));
  }
  for (const cargo of freightAboard.slice(0, 4)) {
    const dest = getSubsectorSystem(FAR_MERIDIAN_SUBSECTOR, cargo.destinationSystemId);
    aboardItems.push(panelRow('FREIGHT', `${cargo.tons}t -> ${(dest?.name ?? cargo.destinationSystemId).toUpperCase()} / ${formatCr(cargo.tons * FREIGHT_RATE_PER_TON_CR)}`));
  }
  for (const cargo of saleCargo.slice(0, 4)) {
    if (cargo.originSystemId === current.id) {
      aboardItems.push(panelCard({
        title: `${cargo.tons}t ${cargo.description.toUpperCase()}`,
        note: 'TRANSPORT TO ANOTHER WORLD REQUIRED / SAME-WORLD RESALE REJECTED'
      }));
      continue;
    }
    const quote = speculativeSaleQuote(cargo);
    const declined = declinedQuoteIds.has(cargo.id);
    aboardItems.push(panelCard({
      title: `RESALE / ${cargo.tons}t ${cargo.description.toUpperCase()}`,
      meta: `${quote.percentage}% OF BASE`,
      rows: [
        panelRow('NET', formatCr(quote.netCr), { ok: true }),
        panelRow('DM', signedNumber(quote.worldDM + quote.characterSkillDM + quote.brokerDM))
      ],
      note: `WORLD ${signedNumber(quote.worldDM)} / CHARACTER ${signedNumber(quote.characterSkillDM)} / BROKER ${signedNumber(quote.brokerDM)}`
        + (quote.brokerCommissionCr ? ` / DECLINING OWES ${formatCr(quote.brokerCommissionCr)} (BOOK 2 p.48)` : '')
        + (declined ? ' / QUOTE DECLINED THIS CALL' : ''),
      actionId: `sell:${cargo.id}`,
      actionLabel: '[ SELL ]',
      secondaryActionId: declined ? null : `decline:${cargo.id}`,
      secondaryActionLabel: '[ DECLINE ]'
    }));
  }
  groups.push({ label: 'ABOARD', items: aboardItems });

  renderPanelModel(el.commerceRecord, { groups }, {
    onAction: (id) => {
      const [kind, value] = String(id).split(':');
      if (kind === 'freight') return acceptFreightOffer(value);
      if (kind === 'spec') return buySpeculativeQuantity(Number(value));
      if (kind === 'sell') return sellSpeculativeLot(value);
      if (kind === 'decline') return declineSpeculativeQuote(value);
    }
  });

  el.commerceActions.replaceChildren();
  if (route?.destination && route.reachable) {
    const steward = shipDocument.crew.assignments.some((entry) => entry.role.toLowerCase() === 'steward');
    const highRemaining = Math.max(0, route.passengerDemand.high - bookedPassengerCount(route, 'high'));
    const middleRemaining = Math.max(0, route.passengerDemand.middle - bookedPassengerCount(route, 'middle'));
    const lowRemaining = Math.max(0, route.passengerDemand.low - bookedPassengerCount(route, 'low'));
    if (highRemaining > 0 && availablePassengerCapacity(shipDocument, 'high') > 0) {
      el.commerceActions.append(makePortButton(`BOOK HIGH / FARE ${formatCr(PASSAGE_FARES_CR.high)}`, () => bookRoutePassenger('high'), { disabled: !steward }));
    }
    if (middleRemaining > 0 && availablePassengerCapacity(shipDocument, 'middle') > 0) {
      el.commerceActions.append(makePortButton(`BOOK MIDDLE / FARE ${formatCr(PASSAGE_FARES_CR.middle)}`, () => bookRoutePassenger('middle')));
    }
    if (lowRemaining > 0 && availablePassengerCapacity(shipDocument, 'low') > 0) {
      el.commerceActions.append(makePortButton(`BOOK LOW / FARE ${formatCr(PASSAGE_FARES_CR.low)}`, () => bookRoutePassenger('low')));
    }
  }

  if (saleCargo.length) {
    const broker = document.createElement('span');
    broker.className = 'commerce-group commerce-broker';
    const label = document.createElement('label');
    label.className = 'commerce-group-label';
    label.htmlFor = 'commerce-broker-dm';
    label.textContent = 'BROKER DM';
    const input = document.createElement('input');
    input.id = 'commerce-broker-dm';
    input.type = 'number';
    input.min = '0';
    input.max = '4';
    input.step = '1';
    input.value = String(speculativeBrokerDM);
    input.addEventListener('change', () => {
      speculativeBrokerDM = Math.max(0, Math.min(4, Number.parseInt(input.value || '0', 10) || 0));
      renderCommerce();
    });
    broker.append(label, input);
    el.commerceActions.append(broker);
  }

  if (!el.commerceActions.childNodes.length) {
    const note = document.createElement('span');
    note.className = 'commerce-note';
    note.textContent = 'NO CURRENT COMMERCE ACTION FITS SHIP CAPACITY / ROUTE / FUNDS.';
    el.commerceActions.append(note);
  }
  applyOperationsDeskTab();
}

function renderContracts() {
  const current = mappedCurrentSystem();
  if (!campaignDocument || !current || !shipDocument || !gameplayDocument) {
    el.contractSection.dataset.available = 'false';
    el.contractSection.hidden = true;
    el.contractRecord.textContent = '';
    el.contractActions.replaceChildren();
    applyOperationsDeskTab();
    return;
  }

  el.contractSection.dataset.available = 'true';
  el.contractSection.hidden = false;
  const offers = availableContractOffers();
  const exclusive = activeExclusiveContract();
  const offerState = (offer) => {
    const requiresEmptyShip = offer.exclusiveShip && (
      activeContracts().length > 0
      || shipDocument.state.cargoManifest.length > 0
      || shipDocument.state.passengerManifest.length > 0
    );
    const noRoom = offer.cargoTons > freeCargoTons();
    const blockedReason = exclusive
      ? `EXCLUSIVE CHARTER ACTIVE TO ${exclusive.destination.systemName.toUpperCase()}`
      : requiresEmptyShip
        ? 'MANIFEST MUST BE EMPTY / BOOK 2 p.9'
        : noRoom
          ? `NEEDS ${offer.cargoTons}t / ${freeCargoTons()}t FREE IN HOLD`
          : '';
    return {
      disabled: Boolean(exclusive) || requiresEmptyShip || noRoom,
      blockedReason,
      title: `${contractSourceLabel(offer)} / LOCAL OFFER AT ${offer.originSystemName} / DESTINATION ${offer.destinationSystemName}`
    };
  };
  renderPanelModel(el.contractRecord, buildContractBoardPanel({
    system: current,
    selectedSystem: selectedSystemId ? getSubsectorSystem(FAR_MERIDIAN_SUBSECTOR, selectedSystemId) : null,
    contracts: contractDocuments,
    offers,
    offerState
  }), { onAction: (offerId) => acceptContractOffer(offerId) });
  el.contractActions.replaceChildren();
  applyOperationsDeskTab();
}


function contactStandingFromReaction(reaction) {
  const text = String(reaction ?? '').toUpperCase();
  if (text.includes('VIOLENT') || text.includes('HOSTILE')) return 'hostile';
  if (text.includes('FRIENDLY') || text.includes('ENTHUSIASTIC')) return 'friendly';
  return 'neutral';
}

function registerSituationActorContact(situation) {
  if (!campaignDocument || !situation?.actor?.name || !situation?.actor?.type) return null;
  const key = `${campaignDocument.identity.id}|${situation.location.systemId}|${situation.actor.name}|${situation.actor.type}`;
  const date = situation.timing?.createdDate ?? campaignDateSnapshot();
  let contact = contactDocuments.find((entry) => entry.provenance.contactKey === key) ?? null;
  const standing = contactStandingFromReaction(situation.actor.reaction);
  if (!contact) {
    contact = createContactDocument({
      contactKey: key,
      name: situation.actor.name,
      role: situation.actor.type,
      type: situation.actor.type,
      homeSystem: { systemId: situation.location.systemId, systemName: situation.location.systemName },
      firstMetDate: date,
      standing,
      relationshipNotes: situation.actor.reaction ? `Initial reaction: ${situation.actor.reaction}.` : '',
      sourceSituationId: situation.identity.id,
      rulesBasis: situation.provenance.rulesBasis,
      setting: situation.provenance.setting
    });
  } else {
    contact = touchContactDocument(contact, {
      date,
      standing: standing === 'neutral' ? contact.relationship.standing : standing,
      relationshipNotes: contact.relationship.notes
    });
  }
  contactDocuments = contactDocuments.filter((entry) => entry.identity.id !== contact.identity.id);
  contactDocuments.push(contact);
  if (!campaignDocument.documentRefs.contacts.some((ref) => ref.id === contact.identity.id)) {
    campaignDocument = addContactToCampaign(campaignDocument, contact);
  }
  return contact;
}

function applyResolvedSituationConsequences(situation, { log = true } = {}) {
  if (!campaignDocument || !situation || situation.status === 'active') return false;
  const before = JSON.stringify({
    threads: threadDocuments,
    contacts: contactDocuments,
    contracts: contractDocuments,
    situations: situationDocuments.map((entry) => entry.identity.id)
  });
  const result = applySituationThreadConsequences({
    campaign: campaignDocument,
    situation,
    threads: threadDocuments,
    contacts: contactDocuments,
    contracts: contractDocuments,
    character: gameplayDocument,
    ship: shipDocument
  });
  threadDocuments = [...result.threads];
  contactDocuments = [...result.contacts];
  contractDocuments = [...result.contracts];

  for (const contact of contactDocuments) {
    if (!campaignDocument.documentRefs.contacts.some((ref) => ref.id === contact.identity.id)) campaignDocument = addContactToCampaign(campaignDocument, contact);
  }
  for (const thread of threadDocuments) {
    if (!campaignDocument.documentRefs.threads.some((ref) => ref.id === thread.identity.id)) campaignDocument = addAdventureThreadToCampaign(campaignDocument, thread);
  }
  for (const contract of contractDocuments) {
    if (!campaignDocument.documentRefs.contracts.some((ref) => ref.id === contract.identity.id)) campaignDocument = addContractToCampaign(campaignDocument, contract);
  }

  for (const offer of result.followUpOffers) {
    if (situationForEventKey(offer.eventKey)) continue;
    const followUp = createSituationDocument(offer);
    attachSituation(followUp, { log, select: true });
    const threadIndex = threadDocuments.findIndex((entry) => entry.status === 'active' && entry.situationIds.includes(situation.identity.id));
    if (threadIndex >= 0) {
      threadDocuments[threadIndex] = linkAdventureThreadDocument(threadDocuments[threadIndex], {
        situationId: followUp.identity.id,
        date: followUp.timing.createdDate
      });
      if (!campaignDocument.documentRefs.threads.some((ref) => ref.id === threadDocuments[threadIndex].identity.id)) {
        campaignDocument = addAdventureThreadToCampaign(campaignDocument, threadDocuments[threadIndex]);
      }
    }
  }

  if (log) for (const event of result.events) logActivity('THREAD', event);
  syncCampaignRefs();
  const after = JSON.stringify({
    threads: threadDocuments,
    contacts: contactDocuments,
    contracts: contractDocuments,
    situations: situationDocuments.map((entry) => entry.identity.id)
  });
  return before !== after;
}

function reconcileAdventureConsequences({ log = false } = {}) {
  let changed = false;
  const resolved = situationDocuments
    .filter((entry) => entry.status !== 'active')
    .sort((left, right) => {
      const a = left.timing.resolvedDate ?? left.timing.createdDate;
      const b = right.timing.resolvedDate ?? right.timing.createdDate;
      return (a.year - b.year) || (a.dayOfYear - b.dayOfYear) || left.identity.id.localeCompare(right.identity.id);
    });
  for (const situation of resolved) changed = applyResolvedSituationConsequences(situation, { log }) || changed;
  return changed;
}

function situationForEventKey(eventKey) {
  return situationDocuments.find((entry) => entry.provenance.eventKey === eventKey) ?? null;
}

function activeSituationAtCurrentSystem() {
  const current = mappedCurrentSystem();
  if (!current) return null;
  return situationDocuments.find((entry) => entry.status === 'active' && entry.location.systemId === current.id) ?? null;
}

function currentPatronEventKey() {
  const current = mappedCurrentSystem();
  if (!campaignDocument || !current || !shipDocument) return null;
  return patronSituationEventKey({ campaign: campaignDocument, system: current, ship: shipDocument });
}

function attachSituation(situation, { log = true, select = true } = {}) {
  situationDocuments = situationDocuments.filter((entry) => entry.identity.id !== situation.identity.id);
  situationDocuments.push(situation);
  campaignDocument = addSituationToCampaign(campaignDocument, situation);
  registerSituationActorContact(situation);
  syncCampaignRefs();
  if (select && situation.status === 'active') operationsDeskTab = 'situation';
  if (log) {
    const suffix = situation.status === 'active' ? 'requires attention' : situation.resolution.notes || situation.status;
    logActivity('SITUATION', `${situation.identity.title} / ${situation.location.systemName} / ${suffix}`);
  }
  return situation;
}

function ensureArrivalSituation({ log = true } = {}) {
  const current = mappedCurrentSystem();
  if (!campaignDocument || !current || !shipDocument) return null;
  if (shipDocument.state.portCall?.systemId !== current.id) return null;
  const eventKey = arrivalSituationEventKey({ campaign: campaignDocument, system: current, ship: shipDocument });
  if (situationForEventKey(eventKey)) return null;
  const offer = generateArrivalSituationOffer({
    campaign: campaignDocument,
    system: current,
    ship: shipDocument,
    dice: seededDice(`${eventKey}|generate`)
  });
  if (!offer) return null;
  return attachSituation(createSituationDocument(offer), { log, select: true });
}

function seekPatron() {
  try {
    const current = mappedCurrentSystem();
    if (!campaignDocument || !current || !shipDocument || !gameplayDocument) throw new Error('active campaign character and ship at a mapped port are required');
    if (shipDocument.state.portCall?.systemId !== current.id) throw new Error('a current port call is required to seek a patron');
    if (activeSituationAtCurrentSystem()) throw new Error('resolve the current situation before seeking another patron');
    const eventKey = currentPatronEventKey();
    if (situationForEventKey(eventKey)) throw new Error('patron contact has already been checked for this port call');
    const dice = seededDice(`${eventKey}|book3-patron`);
    const contact = generatePatronContact(dice);
    const offer = buildPatronSituationOffer({ campaign: campaignDocument, system: current, ship: shipDocument, contact, dice });
    const situation = attachSituation(createSituationDocument(offer), { log: true, select: true });
    persistCampaignState();
    setStatus(situation.status === 'active' ? `SITUATION: ${situation.identity.title.toUpperCase()}` : situation.identity.title.toUpperCase(), 'ok');
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function resolveSituationSkillChoice(situationId, choiceId, userModifier = 0) {
  try {
    if (!campaignDocument || !gameplayDocument) throw new Error('active campaign character is required');
    const index = situationDocuments.findIndex((entry) => entry.identity.id === situationId);
    if (index < 0) throw new Error('situation not found');
    const situation = situationDocuments[index];
    if (situation.status !== 'active') throw new Error('situation is already resolved');
    const choice = situation.choices.find((entry) => entry.id === choiceId);
    if (!choice || choice.action !== 'skill-check') throw new Error('situation skill check not found');
    if (!Number.isInteger(userModifier)) throw new Error('modifier must be an integer');

    const skillLevel = Number(gameplayDocument.skills?.[choice.skillName] ?? 0);
    const result = resolveRefereeSkillCheck({
      dice: seededDice(`${situation.provenance.eventKey}|${choice.id}|skill-check`),
      target: choice.target,
      skillLevel,
      intelligence: gameplayDocument.characteristics.INT,
      education: gameplayDocument.characteristics.EDU,
      situationalDM: Number(choice.situationalDM ?? 0) + userModifier
    });
    const resolved = resolveSituationDocument(situation, {
      date: campaignDateSnapshot(),
      choiceId: choice.id,
      success: result.success,
      roll: { skillName: choice.skillName, userModifier, taskDM: Number(choice.situationalDM ?? 0), ...result },
      notes: result.success ? choice.successText : choice.failureText
    });
    situationDocuments[index] = resolved;
    applyResolvedSituationConsequences(resolved, { log: true });
    syncCampaignRefs();
    persistCampaignState();
    const rollText = `ROLL 2D [${result.dice[0]}] [${result.dice[1]}] = ${result.roll} / SKILL ${signedNumber(result.skillLevel)} / INT ${signedNumber(result.intelligenceDM)} / EDU ${signedNumber(result.educationDM)} / TASK ${signedNumber(choice.situationalDM ?? 0)} / MODIFIER ${signedNumber(userModifier)} / TOTAL ${result.total} vs ${result.target}+`;
    logActivity('SITUATION', `${resolved.identity.title} / ${choice.skillName}-${skillLevel} / ${rollText} / ${result.success ? 'SUCCESS' : 'FAILURE'} / ${resolved.resolution.notes}`);
    setStatus(`SITUATION ${resolved.status.toUpperCase()}: ${resolved.identity.title.toUpperCase()}`, result.success ? 'ok' : 'error');
    closeRollDialog();
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function resolveSituationChoice(situationId, choiceId) {
  try {
    if (!campaignDocument || !gameplayDocument) throw new Error('active campaign character is required');
    const index = situationDocuments.findIndex((entry) => entry.identity.id === situationId);
    if (index < 0) throw new Error('situation not found');
    const situation = situationDocuments[index];
    if (situation.status !== 'active') throw new Error('situation is already resolved');
    const choice = situation.choices.find((entry) => entry.id === choiceId);
    if (!choice) throw new Error('situation choice not found');
    if (choice.action === 'skill-check') {
      openSituationSkillRollDialog(situation, choice);
      return;
    }

    const date = campaignDateSnapshot();
    let resolved;
    if (choice.action === 'decline') {
      resolved = resolveSituationDocument(situation, {
        date,
        choiceId: choice.id,
        success: null,
        notes: choice.resolutionText,
        declined: true
      });
    } else {
      resolved = resolveSituationDocument(situation, {
        date,
        choiceId: choice.id,
        success: true,
        notes: choice.resolutionText
      });
    }
    situationDocuments[index] = resolved;
    applyResolvedSituationConsequences(resolved, { log: true });
    syncCampaignRefs();
    persistCampaignState();
    logActivity('SITUATION', `${resolved.identity.title} / ${resolved.status.toUpperCase()} / ${resolved.resolution.notes}`);
    setStatus(`SITUATION ${resolved.status.toUpperCase()}: ${resolved.identity.title.toUpperCase()}`, 'ok');
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function preferredPersonalWeapon(characterDocument = gameplayDocument) {
  const skillWeapons = [
    ['Laser Rifle', 'laser-rifle'], ['Laser Carbine', 'laser-carbine'],
    ['Automatic Rifle', 'automatic-rifle'], ['Rifle', 'rifle'], ['Carbine', 'carbine'],
    ['Submachine Gun', 'submachine-gun'], ['Automatic Pistol', 'automatic-pistol'],
    ['Revolver', 'revolver'], ['Body Pistol', 'body-pistol'], ['Shotgun', 'shotgun'],
    ['Broadsword', 'broadsword'], ['Cutlass', 'cutlass'], ['Sword', 'sword'],
    ['Blade', 'blade'], ['Dagger', 'dagger']
  ];
  const equipment = new Set((characterDocument?.benefits?.equipment ?? []).map((entry) => String(entry.name).toLowerCase()));
  const equipped = skillWeapons.find(([name]) => equipment.has(name.toLowerCase()));
  if (equipped) return equipped[1];
  const trained = skillWeapons
    .filter(([name]) => Number(characterDocument?.skills?.[name] ?? -1) >= 0)
    .sort((left, right) => Number(characterDocument.skills[right[0]] ?? 0) - Number(characterDocument.skills[left[0]] ?? 0));
  return trained[0]?.[1] ?? 'hands';
}

function encounterForSituation(situationId) {
  return encounterDocuments.find((entry) => entry.situationId === situationId) ?? null;
}

function activeEncounterAtCurrentSystem() {
  const current = mappedCurrentSystem();
  if (!current) return null;
  return encounterDocuments.find((entry) => entry.status === 'active' && entry.location.systemId === current.id) ?? null;
}

function latestEncounterAtCurrentSystem() {
  const current = mappedCurrentSystem();
  if (!current) return null;
  const local = encounterDocuments.filter((entry) => entry.location.systemId === current.id);
  return local.find((entry) => entry.status === 'active') ?? local.at(-1) ?? null;
}

function selectedEncounterTarget(encounter) {
  if (encounterSelectionCleared) return null;
  const actor = encounter?.combatants.find((entry) => entry.id === selectedEncounterActorId);
  if (!actor) return null;
  const actorSide = actor.side;
  const candidates = encounter?.combatants.filter((entry) => entry.side !== actorSide && (encounter.status !== 'active' || entry.status === 'active')) ?? [];
  return candidates.find((entry) => encounterExtraTargetIds.has(entry.id))
    ?? candidates.find((entry) => entry.id === selectedEncounterTargetId) ?? null;
}

function selectedEncounterActor(encounter) {
  if (encounterSelectionCleared) return null;
  const anySide = encounter?.combatants.filter((entry) => encounter.status !== 'active' || entry.status === 'active') ?? [];
  return anySide.find((entry) => selectedEncounterTokenIds.has(entry.id))
    ?? anySide.find((entry) => entry.id === selectedEncounterActorId);
}

function setEncounterActor(encounterId, actorId) {
  const encounter = encounterDocuments.find((entry) => entry.identity.id === encounterId);
  const actor = encounter?.combatants.find((entry) => entry.id === actorId && (encounter.status !== 'active' || entry.status === 'active'));
  if (!actor) return;
  encounterSelectionCleared = false;
  selectedEncounterTokenIds = new Set([actor.id]);
  selectedEncounterActorId = actor.id;
  renderEncounter();
}

function setEncounterTarget(encounterId, targetId) {
  const encounter = encounterDocuments.find((entry) => entry.identity.id === encounterId);
  const actorSide = encounter?.combatants.find((entry) => entry.id === selectedEncounterActorId)?.side ?? 'party';
  const target = encounter?.combatants.find((entry) => entry.id === targetId && entry.side !== actorSide && (encounter.status !== 'active' || entry.status === 'active'));
  if (!target) return;
  encounterSelectionCleared = false;
  encounterExtraTargetIds = new Set([target.id]);
  selectedEncounterTargetId = target.id;
  renderEncounter();
}

function selectEncounterToken(encounterId, tokenId, { additive = false } = {}) {
  const encounter = encounterDocuments.find((entry) => entry.identity.id === encounterId);
  const token = encounter?.combatants.find((entry) => entry.id === tokenId);
  if (!token) return;
  encounterSelectionCleared = false;
  const next = additive ? new Set(selectedEncounterTokenIds) : new Set();
  if (additive && next.has(tokenId)) next.delete(tokenId);
  else next.add(tokenId);
  selectedEncounterTokenIds = next;
  selectedEncounterActorId = [...next][0] ?? null;
  renderEncounter();
}

function toggleEncounterTarget(encounterId, tokenId, { additive = true } = {}) {
  const encounter = encounterDocuments.find((entry) => entry.identity.id === encounterId);
  const actor = selectedEncounterActor(encounter);
  const token = encounter?.combatants.find((entry) => entry.id === tokenId);
  if (!actor || !token) return setStatus('SELECT A TOKEN, THEN TARGET A VISIBLE TOKEN', 'error');
  const next = additive ? new Set(encounterExtraTargetIds) : new Set();
  if (next.has(tokenId)) next.delete(tokenId); else next.add(tokenId);
  encounterExtraTargetIds = next;
  selectedEncounterTargetId = [...next][0] ?? null;
  renderEncounter();
}

function clearEncounterCanvasSelection({ targets = true } = {}) {
  selectedEncounterTokenIds = new Set();
  selectedEncounterActorId = null;
  encounterSelectionCleared = true;
  if (targets) {
    encounterExtraTargetIds = new Set();
    selectedEncounterTargetId = null;
  }
}

function svgElement(name, attributes = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

function combatantSkillLevel(combatant) {
  const weapon = getPersonalWeapon(combatant.weaponKey);
  return Math.max(...weapon.skillNames.map((name) => Number(combatant.skills?.[name] ?? 0)));
}

function combatantRulesStatus(combatant) {
  if (combatant.bodyModel === 'robotic') {
    if (combatant.status === 'dead') return 'destroyed';
    if (combatant.status === 'unconscious') return 'disabled';
  }
  return combatant.status;
}

function combatantConditionText(combatant) {
  return combatant.conditions?.length ? combatant.conditions.map((entry) => entry.toUpperCase().replaceAll('-', ' ')).join(' + ') : 'NONE';
}

function encounterMapPoint(clientX, clientY) {
  return encounterCanvas().camera.pointFromClient(clientX, clientY);
}

function setEncounterMapZoom(value, anchor = null) {
  encounterCanvas().camera.setZoom(value, anchor);
}

// Frame the combatants, capped at the readable maximum zoom. FIT remains the
// one-click view of the complete board.
function frameEncounterCombatants(encounter) {
  const { cell } = encounterCanvas().metrics();
  encounterCanvas().camera.framePoints(encounter.combatants.map((entry) => ({ x: entry.position.column * cell, y: entry.position.row * cell })), { paddingSquares: 12, minSquares: 40 });
}

function fitEncounterMap() {
  encounterCanvas().camera.fit();
}

function moveEncounterToken(encounterId, combatantId, column, row) {
  try {
    const index = encounterDocuments.findIndex((entry) => entry.identity.id === encounterId);
    if (index < 0) throw new Error('encounter is unavailable');
    const current = encounterDocuments[index];
    const result = current.status === 'active'
      ? moveEncounterCombatantByPlayer(current, { combatantId, column, row, pace: el.encounterMovePace.value, round: current.round, replaceExisting: true })
      : repositionEncounterCombatant(current, { combatantId, column, row });
    encounterDocuments[index] = result.encounter;
    if (result.entry) logActivity('COMBAT', result.entry.text);
    persistCampaignState();
    const publishMovedEncounter = autoPublishEncounterView;
    publishMovedEncounter(result.encounter);
    renderEncounter();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
    renderEncounter();
  }
}

function hideEncounterTokenOverlays() {
  el.encounterTokenTooltip.hidden = true;
  el.encounterTokenMenu.hidden = true;
}

function combatantHoverText(combatant) {
  return `${combatant.name.toUpperCase()} // ${combatant.side.toUpperCase()} ${combatant.actorType.toUpperCase()} // ${combatantRulesStatus(combatant).toUpperCase()}\n${getPersonalWeapon(combatant.weaponKey).name.toUpperCase()} // ARMOR ${combatant.armor.toUpperCase()} // CONDITIONS ${combatantConditionText(combatant)}`;
}

function positionEncounterOverlay(node, event, anchorElement = null) {
  const rect = el.encounterMapViewport.getBoundingClientRect();
  const anchorRect = anchorElement?.getBoundingClientRect?.();
  const clientX = Number.isFinite(event.clientX) && event.clientX ? event.clientX : (anchorRect?.right ?? rect.left + rect.width / 2);
  const clientY = Number.isFinite(event.clientY) && event.clientY ? event.clientY : (anchorRect?.top ?? rect.top + rect.height / 2);
  node.hidden = false;
  node.style.visibility = 'hidden';
  node.style.left = '0px';
  node.style.top = '0px';
  const overlayRect = node.getBoundingClientRect();
  const left = Math.max(4, Math.min(rect.width - overlayRect.width - 4, clientX - rect.left + 9));
  const top = Math.max(4, Math.min(rect.height - overlayRect.height - 4, clientY - rect.top + 9));
  node.style.left = `${left}px`;
  node.style.top = `${top}px`;
  node.style.visibility = '';
}

function showEncounterTokenMenu(event, encounter, combatant, onSelect, anchorElement = null) {
  event.preventDefault();
  event.stopPropagation();
  el.encounterTokenTooltip.hidden = true;
  const actions = [];
  const add = (label, handler, disabled = false) => {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = `[ ${label} ]`; button.disabled = disabled;
    button.addEventListener('click', () => { el.encounterTokenMenu.hidden = true; handler(); });
    actions.push(button);
  };
  const declaredIds = new Set(encounter.roundState?.declaredActions?.map((entry) => entry.actorId) ?? []);
  const alreadyDeclared = declaredIds.has(combatant.id);
  const foes = encounter.combatants.filter((entry) => entry.side !== combatant.side && entry.status === 'active');
  const selectedActor = selectedEncounterActor(encounter);
  add(selectedEncounterTokenIds.has(combatant.id) ? 'DESELECT' : 'SELECT', () => selectEncounterToken(encounter.identity.id, combatant.id, { additive: true }));
  add(encounterExtraTargetIds.has(combatant.id) ? 'UNTARGET' : 'TARGET', () => toggleEncounterTarget(encounter.identity.id, combatant.id), !selectedActor);

  // A submenu: the parent opens it, each child is one complete declaration for
  // this token, so an order is a single gesture at the token it applies to.
  const addCascade = (label, build, disabled = false) => {
    const holder = document.createElement('div');
    holder.className = 'encounter-menu-cascade';
    const parent = document.createElement('button');
    parent.type = 'button';
    parent.textContent = `[ ${label} \u25b8 ]`;
    parent.disabled = disabled;
    const submenu = document.createElement('div');
    submenu.className = 'encounter-menu-submenu';
    submenu.hidden = true;
    build(submenu);
    parent.addEventListener('click', () => { submenu.hidden = !submenu.hidden; });
    holder.append(parent, submenu);
    actions.push(holder);
  };
  const subItem = (submenu, label, handler, disabled = false, title = '') => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `[ ${label} ]`;
    button.disabled = disabled;
    if (title) button.title = title;
    button.addEventListener('click', () => { el.encounterTokenMenu.hidden = true; handler(); });
    submenu.append(button);
    return button;
  };
  const declare = (action, targetId = null) => {
    setEncounterActor(encounter.identity.id, combatant.id);
    if (targetId) setEncounterTarget(encounter.identity.id, targetId);
    resolveActiveEncounterAction(action, 0, targetId, combatant.id);
  };

  const canOrder = combatant.status === 'active' && !alreadyDeclared && encounter.status === 'active';
  // v0.76.2: a malformed foe (odd loadout, a body model the preview does not
  // expect) used to throw here and abort the whole menu before REMOVE FROM
  // ENCOUNTER — the one action that would have fixed the bad token — was ever
  // added. One foe's preview failing no longer takes the rest of the menu
  // with it.
  addCascade('ATTACK', (submenu) => {
    for (const foe of foes) {
      try {
        const band = encounterPairRange(combatant, foe);
        const preview = previewPersonalAttack({ attacker: combatant, defender: foe, range: band, situationalDM: encounterSituationDMs(encounter, combatant, foe).total });
        subItem(submenu,
          `${foe.name.toUpperCase()} / ${band.toUpperCase().replace('-', ' ')} / ${preview.canAttack ? `${Math.max(2, preview.requiredRoll)}+` : 'NO REACH'}`,
          () => declare('attack', foe.id), !preview.canAttack,
          preview.canAttack ? `Book 1 pp.45\u201347` : `${preview.weaponName} has no ${band.replace('-', ' ')} range column (Book 1 p.46)`);
      } catch (error) {
        console.error('[traveller] attack preview failed for', foe.name, error);
        subItem(submenu, `${foe.name.toUpperCase()} / UNAVAILABLE`, () => {}, true, error?.message ?? String(error));
      }
    }
    if (!foes.length) subItem(submenu, 'NO ACTIVE TARGET', () => {}, true);
  }, !canOrder);

  addCascade('COVER', (submenu) => {
    for (const value of COMBATANT_COVER) {
      const label = value === 'none' ? 'NONE' : value === 'concealment' ? 'CONCEALMENT \u22121' : 'COVER \u22124';
      subItem(submenu, `${label}${combatant.cover === value ? ' \u2713' : ''}`,
        () => updateEncounterDocument(encounter.identity.id, (doc) => setCombatantCover(doc, { combatantId: combatant.id, cover: value }).encounter),
        false, 'Protects this combatant against every attacker (Book 1 p.31 errata)');
    }
  });

  add(`FOLDING STOCK${combatant.foldingStock ? ' \u2713' : ''}`,
    () => updateEncounterDocument(encounter.identity.id, (doc) => setCombatantFoldingStock(doc, { combatantId: combatant.id, foldingStock: !combatant.foldingStock }).encounter));
  add('CLOSE + ATTACK', () => declare('close', foes[0]?.id ?? null), !canOrder || !foes.length);
  add('OPEN + ATTACK', () => declare('open', foes[0]?.id ?? null), !canOrder || !foes.length);
  add('RUN CLOSER', () => declare('close-run', foes[0]?.id ?? null), !canOrder || !foes.length);
  add('RUN AWAY', () => declare('open-run', foes[0]?.id ?? null), !canOrder || !foes.length);
  add('EVADE', () => declare('evade'), !canOrder);
  add('ESCAPE', () => declare('escape'), !canOrder || encounter.round !== 1);
  add('STAND', () => declare('wait'), !canOrder);
  addCascade('STATUS', (submenu) => {
    for (const value of ['active', 'unconscious', 'dead', 'escaped', 'withdrawn']) {
      subItem(submenu, `${value.toUpperCase()}${combatant.status === value ? ' \u2713' : ''}`,
        () => updateEncounterDocument(encounter.identity.id, (doc) => setCombatantStatus(doc, { combatantId: combatant.id, status: value }).encounter),
        false, 'Referee override of Book 1 wound status; restoring to active lifts a zeroed characteristic to 1');
    }
  });
  add('CHANGE CONDITION', () => openEncounterConditionDialog(encounter.identity.id, combatant.id));
  if (combatant.sourceActorId && npcActorDocuments.some((entry) => entry.identity.id === combatant.sourceActorId)) add('OPEN ROSTER ACTOR', () => { operationsDeskTab = 'roster'; render(); openNpcActorDialog(combatant.sourceActorId); });
  // v0.76.3: removeEncounterCombatant refuses two things — a resolved
  // encounter (nothing left to edit) and emptying a side (no clean Book 1
  // meaning) — and used to only surface either as a thrown error after the
  // click. Both are now visible on the button itself before it is pressed.
  const lastOnSide = encounter.combatants.filter((entry) => entry.side === combatant.side).length <= 1;
  const resolved = encounter.status !== 'active';
  add('REMOVE FROM ENCOUNTER', () => removeCombatantFromActiveEncounter(encounter.identity.id, combatant.id), resolved || lastOnSide);
  if (resolved) actions.at(-1).title = `${encounter.identity.title} is ${encounter.status}; a resolved encounter cannot be edited`;
  else if (lastOnSide) actions.at(-1).title = `${combatant.name} is the last ${combatant.side} combatant; resolve the encounter instead of emptying a side`;
  el.encounterTokenMenu.replaceChildren(...actions);
  positionEncounterOverlay(el.encounterTokenMenu, event, anchorElement);
  actions.find((button) => !button.disabled)?.focus({ preventScroll: true });
}

function showEncounterMapMenu(event) {
  event.preventDefault();
  if (event.target.closest?.('[data-scene-token]')) return;
  const encounter = activeEncounterAtCurrentSystem();
  if (!encounter && activeScene()) {
    const scene = activeScene();
    const point = encounterMapPoint(event.clientX, event.clientY);
    const scale = scene.board.metersPerSquare;
    const { cell } = encounterCanvas().metrics();
    const cells = sceneBoardCells(scene);
    const column = Math.max(0, Math.min(cells.columns - 1, Math.round(point.x / cell / scale) * scale));
    const row = Math.max(0, Math.min(cells.rows - 1, Math.round(point.y / cell / scale) * scale));
    const place = document.createElement('button');
    place.type = 'button';
    place.textContent = '[ PLACE ACTOR HERE ]';
    place.addEventListener('click', () => { el.encounterTokenMenu.hidden = true; openScenePlacementDialog(scene.identity.id, column, row); });
    el.encounterTokenTooltip.hidden = true;
    el.encounterTokenMenu.replaceChildren(place);
    positionEncounterOverlay(el.encounterTokenMenu, event);
    return;
  }
  if (!encounter) return;
  const point = encounterMapPoint(event.clientX, event.clientY);
  const scale = encounter.map.metersPerSquare;
  const { cell } = encounterCanvas().metrics();
  const column = Math.max(0, Math.min(encounter.map.columns - 1, Math.round(point.x / cell / scale) * scale));
  const row = Math.max(0, Math.min(encounter.map.rows - 1, Math.round(point.y / cell / scale) * scale));
  const place = document.createElement('button');
  place.type = 'button';
  place.textContent = '[ PLACE ROSTER ACTOR HERE ]';
  place.addEventListener('click', () => { el.encounterTokenMenu.hidden = true; openEncounterPlacementDialog(encounter.identity.id, column, row); });
  el.encounterTokenTooltip.hidden = true;
  el.encounterTokenMenu.replaceChildren(place);
  positionEncounterOverlay(el.encounterTokenMenu, event);
  place.focus({ preventScroll: true });
}

function closeEncounterPlacementDialog() {
  pendingEncounterPlacement = null;
  if (typeof el.encounterPlacementDialog.close === 'function') el.encounterPlacementDialog.close();
  else el.encounterPlacementDialog.removeAttribute('open');
}

function openEncounterPlacementDialog(encounterId, column, row) {
  const encounter = encounterDocuments.find((entry) => entry.identity.id === encounterId && entry.status === 'active');
  if (!encounter) return;
  const present = new Set(encounter.combatants.map((entry) => entry.sourceActorId));
  const actors = npcActorDocuments.filter((entry) => !entry.state.archived && !present.has(entry.identity.id));
  if (!actors.length) return setStatus('NO UNUSED ROSTER ACTORS ARE AVAILABLE FOR PLACEMENT', 'error');
  pendingEncounterPlacement = { encounterId, column, row };
  el.encounterPlacementActor.replaceChildren(...actors.map((actor) => new Option(`${actor.identity.name} / ${actor.profile.actorType} / ${actor.profile.bodyModel}`, actor.identity.id)));
  el.encounterPlacementSide.value = 'opposition';
  el.encounterPlacementPosition.textContent = `${column + 1},${row + 1}`;
  if (typeof el.encounterPlacementDialog.showModal === 'function') el.encounterPlacementDialog.showModal();
  else el.encounterPlacementDialog.setAttribute('open', '');
}

function placeRosterActorInEncounter() {
  if (!pendingEncounterPlacement) return;
  const { encounterId, column, row } = pendingEncounterPlacement;
  const actor = npcActorDocuments.find((entry) => entry.identity.id === el.encounterPlacementActor.value);
  const index = encounterDocuments.findIndex((entry) => entry.identity.id === encounterId);
  if (index < 0 || !actor) throw new Error('encounter or roster actor is unavailable');
  const result = addEncounterCombatantFromActor(encounterDocuments[index], { actor, side: el.encounterPlacementSide.value, column, row });
  encounterDocuments[index] = result.encounter;
  logActivity('COMBAT', result.entry.text);
  persistCampaignState();
  closeEncounterPlacementDialog();
  setStatus(`${actor.identity.name.toUpperCase()} PLACED IN ENCOUNTER`, 'ok');
  renderEncounter();
}

function closeEncounterConditionDialog() {
  pendingEncounterConditionCombatantId = null;
  if (typeof el.encounterConditionDialog.close === 'function') el.encounterConditionDialog.close();
  else el.encounterConditionDialog.removeAttribute('open');
}

function openEncounterConditionDialog(encounterId, combatantId) {
  const encounter = encounterDocuments.find((entry) => entry.identity.id === encounterId);
  const combatant = encounter?.combatants.find((entry) => entry.id === combatantId);
  if (!combatant) return;
  pendingEncounterConditionCombatantId = combatantId;
  el.encounterConditionDialog.dataset.encounterId = encounterId;
  el.encounterConditionActor.textContent = `${combatant.name.toUpperCase()} / ${combatant.bodyModel.toUpperCase()} / CURRENT ${combatantConditionText(combatant)}`;
  el.encounterConditionSelect.replaceChildren(...NPC_CONDITIONS[combatant.bodyModel].map((condition) => new Option(condition.replaceAll('-', ' ').toUpperCase(), condition)));
  el.encounterConditionActive.value = 'apply';
  if (typeof el.encounterConditionDialog.showModal === 'function') el.encounterConditionDialog.showModal();
  else el.encounterConditionDialog.setAttribute('open', '');
}

function updateEncounterCondition({ clear = false } = {}) {
  const encounterId = el.encounterConditionDialog.dataset.encounterId;
  const combatantId = pendingEncounterConditionCombatantId;
  const index = encounterDocuments.findIndex((entry) => entry.identity.id === encounterId);
  const original = encounterDocuments[index]?.combatants.find((entry) => entry.id === combatantId);
  if (index < 0 || !original) throw new Error('combatant is unavailable');
  const condition = clear ? null : el.encounterConditionSelect.value;
  const active = !clear && el.encounterConditionActive.value === 'apply';
  const result = setEncounterCombatantCondition(encounterDocuments[index], { combatantId, condition, active });
  encounterDocuments[index] = result.encounter;
  const sourceIndex = npcActorDocuments.findIndex((entry) => entry.identity.id === original.sourceActorId);
  if (sourceIndex >= 0) {
    npcActorDocuments[sourceIndex] = clear
      ? clearNpcActorConditions(npcActorDocuments[sourceIndex])
      : setNpcActorCondition(npcActorDocuments[sourceIndex], { condition, active });
  }
  if (result.entry) logActivity('COMBAT', result.entry.text);
  persistCampaignState();
  closeEncounterConditionDialog();
  setStatus(`${original.name.toUpperCase()} CONDITIONS UPDATED`, 'ok');
  render();
}

function removeCombatantFromActiveEncounter(encounterId, combatantId) {
  try {
    const index = encounterDocuments.findIndex((entry) => entry.identity.id === encounterId);
    if (index < 0) throw new Error('encounter is unavailable');
    const result = removeEncounterCombatant(encounterDocuments[index], { combatantId });
    encounterDocuments[index] = result.encounter;
    if (selectedEncounterActorId === combatantId) selectedEncounterActorId = null;
    if (selectedEncounterTargetId === combatantId) selectedEncounterTargetId = null;
    logActivity('COMBAT', result.entry.text);
    persistCampaignState();
    setStatus(`${result.combatant.name.toUpperCase()} REMOVED FROM ENCOUNTER`, 'ok');
    renderEncounter();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function signedDM(value) { return `${value >= 0 ? '+' : ''}${value}`; }

// Book 1 p.30 step 2B(1)(2): what this attacker needs against this target, at
// the band between their two map positions. Every number here comes from the
// same rules call the resolver uses, so the panel cannot drift from the throw.
// Book 1 p.31 errata, split by what each modifier belongs to: lighting is the
// encounter's, cover is the defender's, the folding stock is the firer's
// weapon. They are set once and apply to every throw they bear on, rather
// than being re-ticked for each attack.
function renderEncounterLighting(encounter) {
  if (!el.encounterLighting) return;
  if (!el.encounterLighting.options.length) {
    for (const value of ENCOUNTER_LIGHTING) {
      el.encounterLighting.append(new Option(value === 'normal' ? 'NORMAL' : value === 'darkness' ? 'DARKNESS \u22129' : 'DARK + INTENSIFIER \u22126', value));
    }
    el.encounterLighting.addEventListener('change', () => {
      const active = activeEncounterAtCurrentSystem();
      if (!active) return;
      updateEncounterDocument(active.identity.id, (doc) => setEncounterLighting(doc, el.encounterLighting.value).encounter);
    });
  }
  el.encounterLighting.value = encounter?.conditions?.lighting ?? 'normal';
  el.encounterLighting.disabled = !encounter || encounter.status !== 'active';
}

// One place that writes an encounter change back and re-renders.
function updateEncounterDocument(encounterId, mutate) {
  try {
    const index = encounterDocuments.findIndex((entry) => entry.identity.id === encounterId);
    if (index < 0) throw new Error('encounter is unavailable');
    encounterDocuments[index] = mutate(encounterDocuments[index]);
    syncCampaignRefs();
    persistCampaignState();
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function renderEncounterRangePanel(encounter, actor, target, guide = null) {
  const currentRange = guide?.suggestedRange ?? null;
  el.encounterRangePair.textContent = actor && target
    ? `${actor.name.toUpperCase()} \u2192 ${target.name.toUpperCase()}`
    : 'ACTOR -- \u2192 TARGET --';
  el.encounterRangeGrid.textContent = guide
    ? `${currentRange.toUpperCase().replace('-', ' ')} / ${guide.squares} SQ / ${guide.meters} M${currentRange === 'close' ? ' / CONTACT' : ''}`
    : 'GRID --';
  el.encounterSection.classList.toggle('grid-hidden', encounterGridHidden);
  el.encounterGridToggle.textContent = encounterGridHidden ? '[ SHOW GRID ]' : '[ HIDE GRID ]';
  el.encounterGridToggle.setAttribute('aria-pressed', String(encounterGridHidden));
  el.encounterGridToggle.disabled = !encounter;
}

// Book 1 lists a preferred pistol and blade on the character sheet, but a
// combatant here carries one weapon, so those lines appear only when the
// weapon in hand is of that kind rather than advertising a gun nobody has.
function renderEncounterMap(encounter) {
  if (!encounter && activeScene()) { renderStagedScene(activeScene()); return; }
  if (!encounter) {
    hideEncounterTokenOverlays();
    if (el.encounterMapViewport) { el.encounterMapViewport.ondragover = null; el.encounterMapViewport.ondrop = null; }
    // No encounter yet: the start control still belongs with the tracker slot,
    // which is the one place start and end live.
    el.encounterTracker.replaceChildren();
    const start = makePortButton('START COMBAT', openCombatSetupDialog);
    start.title = 'Create a manual personal encounter with referee-defined enemy statistics and equipment';
    el.encounterResolve.replaceChildren(start);
    el.encounterMap.replaceChildren();
    el.encounterPartyRoster.replaceChildren();
    el.encounterRoster.replaceChildren();
    el.encounterSelectionStatus.textContent = 'ACTOR -- // TARGET --';
    renderEncounterRangePanel(null, null, null, null);
    return;
  }
  const board = encounterCanvas();
  board.setBoard(encounter.map);
  const gridScale = encounter.map.metersPerSquare;
  const actor = selectedEncounterActor(encounter);
  const target = selectedEncounterTarget(encounter);
  const declared = new Set(encounter.roundState?.declaredActions?.map((entry) => entry.actorId) ?? []);
  const declaredOn = declaredTargetCounts(encounter);
  const targetedIds = new Set([...encounterExtraTargetIds, target?.id].filter(Boolean));
  const tokens = encounter.combatants.map((combatant) => ({
    id: combatant.id, column: combatant.position.column, row: combatant.position.row,
    side: combatant.side === 'party' ? 'party' : 'enemy',
    kind: combatant.actorType,
    shape: combatant.actorType === 'robot' ? 'square' : combatant.actorType === 'creature' ? 'diamond' : 'circle',
    label: combatant.side === 'party' ? (combatant.name || 'P').charAt(0) : (combatant.tokenLabel || combatant.name.charAt(0)),
    ariaLabel: `${combatant.name}, ${combatant.side}, ${combatant.status}`,
    state: {
      selected: selectedEncounterTokenIds.has(combatant.id) || actor?.id === combatant.id,
      targeted: targetedIds.has(combatant.id),
      declared: combatant.side === 'party' && declared.has(combatant.id),
      inactive: combatant.side !== 'party' && combatant.status !== 'active'
    },
    // A player's drag this round measures from where the round began.
    moveFrom: encounter.history.find((entry) => entry.round === encounter.round && entry.kind === 'movement' && entry.actorId === combatant.id && entry.detail?.playerMove)?.detail?.from ?? null,
    combatant
  }));
  if (framedEncounterId !== encounter.identity.id) {
    framedEncounterId = encounter.identity.id;
    frameEncounterCombatants(encounter);
  }
  let guide = null;
  if (encounter.status === 'active' && actor && target) guide = encounterRangeGuide(encounter, actor.id, target.id);
  const movementRound = encounter.status === 'active'
    ? Math.max(-1, ...encounter.history.filter((item) => item.kind === 'movement' && item.detail?.from && item.detail?.to).map((item) => item.round))
    : -1;
  const onSelect = (token, event) => selectEncounterToken(encounter.identity.id, token.id, { additive: Boolean(event?.shiftKey) });
  board.render({
    tokens,
    underlay: (fragments, { cell }) => {
      for (const entry of encounter.history.filter((item) => item.kind === 'movement' && item.round === movementRound && item.detail?.from && item.detail?.to)) {
        fragments.push(sceneSvgNode('line', { x1: entry.detail.from.column * cell, y1: entry.detail.from.row * cell, x2: entry.detail.to.column * cell, y2: entry.detail.to.row * cell, class: `encounter-movement-path ${entry.detail.pace}` }));
      }
      if (guide && actor) {
        const actorX = actor.position.column * cell;
        const actorY = actor.position.row * cell;
        for (const [band, meters] of [['very-long', 500], ['long', 250], ['medium', 50], ['short', 5]]) {
          fragments.push(sceneSvgNode('rect', { x: actorX - meters * cell, y: actorY - meters * cell, width: meters * cell * 2, height: meters * cell * 2, class: `encounter-range-boundary ${band}` }));
        }
      }
    },
    overlay: (fragments, { tokenScale, centres }) => {
      // Declared orders are drawn on the map: an arrow from each declaring
      // token to its target, so concentrated fire reads at a glance.
      for (const declaration of encounter.status === 'active' ? (encounter.roundState?.declaredActions ?? []) : []) {
        if (!declaration.targetId) continue;
        const from = encounter.combatants.find((entry) => entry.id === declaration.actorId);
        const to = encounter.combatants.find((entry) => entry.id === declaration.targetId);
        const a = from && centres.get(from.id); const b = to && centres.get(to.id);
        if (!a || !b) continue;
        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        const stop = { x: b.x - Math.cos(angle) * tokenScale * 0.55, y: b.y - Math.sin(angle) * tokenScale * 0.55 };
        fragments.push(sceneSvgNode('line', { x1: a.x, y1: a.y, x2: stop.x, y2: stop.y, class: `encounter-order-line ${from.side === 'party' ? 'party' : 'enemy'} ${declaration.action}` }));
        const head = tokenScale * 0.3;
        fragments.push(sceneSvgNode('polygon', {
          points: [`${stop.x},${stop.y}`, `${stop.x - Math.cos(angle - 0.4) * head},${stop.y - Math.sin(angle - 0.4) * head}`, `${stop.x - Math.cos(angle + 0.4) * head},${stop.y - Math.sin(angle + 0.4) * head}`].join(' '),
          class: `encounter-order-head ${from.side === 'party' ? 'party' : 'enemy'}`
        }));
      }
      if (guide && actor && target) {
        const a = centres.get(actor.id); const b = centres.get(target.id);
        if (a && b) fragments.push(sceneSvgNode('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: `encounter-range-line${guide.suggestedRange === 'close' ? ' contact' : ''}` }));
      }
    },
    decorate: (group, token) => {
      const combatant = token.combatant;
      const remoteTargets = canvasPresence.filter((entry) => entry.uid !== currentUserId() && entry.targetIds?.includes(combatant.id));
      remoteTargets.slice(0, 4).forEach((entry, index) => group.append(sceneSvgNode('circle', { cx: -.42 + index * .28, cy: -.68, r: .09, class: 'encounter-token-remote-target', 'data-user': entry.uid })));
      if (combatant.conditions?.length) {
        const marker = sceneSvgNode('text', { x: .4, y: -.32, class: 'encounter-token-condition-marker' }); marker.textContent = '!'; group.append(marker);
      }
      if (combatant.side !== 'party' && declaredOn[combatant.id]) {
        const tally = sceneSvgNode('text', { x: .4, y: .48, class: 'encounter-token-declared-marker' }); tally.textContent = `\u00d7${declaredOn[combatant.id]}`; group.append(tally);
      }
    },
    interaction: {
      canDrag: () => true,
      describe: (token, from, to) => {
        const distance = Math.max(Math.abs(to.column - from.column), Math.abs(to.row - from.row));
        const pace = el.encounterMovePace.value;
        const allowance = pace === 'run' ? 50 : 25;
        const legal = encounter.status !== 'active' ? 'legal' : distance > allowance ? 'over' : distance === allowance ? 'limit' : 'legal';
        const squares = Number((distance / gridScale).toFixed(2));
        return { legal, text: encounter.status === 'active'
          ? `${pace.toUpperCase()} / ${squares} SQ / ${distance} M${pace === 'run' ? ' / −1 BLOW / NO ATTACK' : ''}${legal === 'limit' ? ' / LIMIT' : legal === 'over' ? ' / OVER' : ''}`
          : `REFEREE POSITION / ${squares} SQ / ${distance} M` };
      },
      onDrop: (token, to) => moveEncounterToken(encounter.identity.id, token.id, to.column, to.row),
      onSelect,
      onContextMenu: (token, event, group) => showEncounterTokenMenu(event, encounter, token.combatant, (evt) => onSelect(token, evt), group),
      onHover: (token, event, entering) => {
        if (entering) {
          hoveredEncounterCombatantId = token.id;
          el.encounterTokenTooltip.textContent = combatantHoverText(token.combatant);
          positionEncounterOverlay(el.encounterTokenTooltip, event);
          el.encounterTokenTooltip.hidden = false;
        } else { hoveredEncounterCombatantId = null; el.encounterTokenTooltip.hidden = true; }
      }
    }
  });
  // v0.76.2: a roster actor dragged onto an in-progress fight reinforces it,
  // at the square the pointer lands on — the same as PLACE ROSTER ACTOR HERE,
  // reached by drag. A resolved encounter (shown after the fight, before the
  // world scene returns) does not accept drops: there is nothing to add to.
  const viewport = el.encounterMapViewport;
  if (viewport) {
    if (encounter.status === 'active') {
      viewport.ondragover = (event) => { if (event.dataTransfer?.types.includes('application/x-graycloak-actor')) event.preventDefault(); };
      viewport.ondrop = (event) => {
        const dropped = readActorDrop(event);
        if (!dropped) return;
        event.preventDefault();
        if (dropped.kind === 'character') { setStatus('A PARTY CHARACTER CANNOT BE ADDED TO A FIGHT ALREADY IN PROGRESS', 'error'); return; }
        if (encounter.combatants.some((entry) => entry.sourceActorId === dropped.actorId)) { setStatus('THAT ACTOR IS ALREADY IN THIS ENCOUNTER', 'error'); return; }
        const actor = npcActorDocuments.find((entry) => entry.identity.id === dropped.actorId);
        if (!actor) { setStatus('ACTOR IS UNAVAILABLE', 'error'); return; }
        const point = encounterMapPoint(event.clientX, event.clientY);
        const scale = encounter.map.metersPerSquare;
        const { cell } = encounterCanvas().metrics();
        const column = Math.max(0, Math.min(encounter.map.columns - 1, Math.round(point.x / cell / scale) * scale));
        const row = Math.max(0, Math.min(encounter.map.rows - 1, Math.round(point.y / cell / scale) * scale));
        try {
          const index = encounterDocuments.findIndex((entry) => entry.identity.id === encounter.identity.id);
          const result = addEncounterCombatantFromActor(encounterDocuments[index], { actor, side: dropped.side, column, row });
          encounterDocuments[index] = result.encounter;
          logActivity('COMBAT', result.entry.text);
          persistCampaignState();
          setStatus(`${actor.identity.name.toUpperCase()} PLACED IN ENCOUNTER`, 'ok');
          renderEncounter();
        } catch (error) { console.error(error); setStatus(error?.message ?? String(error), 'error'); }
      };
    } else {
      viewport.ondragover = null;
      viewport.ondrop = null;
    }
  }
  renderEncounterRangePanel(encounter, actor, target, guide);
  el.encounterGridScale.value = String(gridScale);
  el.encounterGridScale.disabled = encounter.status !== 'active';
  el.encounterGridLegend.textContent = `${gridScale} M SQUARES / HEAVY LINE 25 M`;

  const distanceText = guide ? `${guide.squares} SQ / ≈${guide.meters} M` : '';
  const guideText = guide ? ` // RANGE ${guide.suggestedRange.toUpperCase().replace('-', ' ')} / ${distanceText}` : '';
  // Round tracker: where the round stands and who still owes a declaration.
  const declaredIds = new Set(encounter.roundState?.declaredActions?.map((entry) => entry.actorId) ?? []);
  const awaiting = encounter.combatants.filter((entry) => entry.side === 'party' && entry.status === 'active' && !declaredIds.has(entry.id));
  const surpriseDetail = (encounter.surprise.results ?? [])
    .map((entry) => `${entry.sideId.toUpperCase()} ${entry.roll}${entry.dm >= 0 ? '+' : ''}${entry.dm}=${entry.total}`)
    .join(' / ');
  const surprised = encounter.round === 1 && encounter.surprise.surprisedSideId
    ? ` // SURPRISE ${surpriseDetail} // ${encounter.surprise.surprisedSideId.toUpperCase()} SURPRISED`
    : encounter.round === 1 && surpriseDetail
      ? ` // SURPRISE ${surpriseDetail} // NEITHER`
      : '';
  const roundState = encounter.status !== 'active'
    ? ` // ${encounter.status.toUpperCase().replace('-', ' ')}`
    : awaiting.length
      ? ` // AWAITING ${awaiting.map((entry) => entry.name.toUpperCase()).join(', ')}`
      : ' // ALL DECLARED';
  el.encounterSelectionStatus.textContent = `ROUND ${encounter.round}${surprised}${roundState} // ACTOR ${actor?.name.toUpperCase() ?? '--'} // TARGET ${target?.name.toUpperCase() ?? '--'}${guideText}`;

  renderEncounterLighting(encounter);
  renderEncounterTracker(encounter, actor);
}
// The encounter's own history, grouped by round. This replaced the ASCII
// box() record, which was the last of them in the combat scene and sat in a
// 250px window that could show about four lines of a long fight.
function renderEncounterHistory(encounter) {
  if (!encounter) { el.encounterRecord.replaceChildren(); return; }
  const rounds = new Map();
  for (const entry of encounter.history ?? []) {
    if (!rounds.has(entry.round)) rounds.set(entry.round, []);
    rounds.get(entry.round).push(entry);
  }
  const blocks = [...rounds.entries()].reverse().map(([round, entries]) => {
    const block = document.createElement('div');
    block.className = 'encounter-history-round';
    const heading = document.createElement('div');
    heading.className = 'encounter-history-heading';
    heading.textContent = `ROUND ${round}`;
    block.append(heading);
    for (const entry of entries) {
      const line = document.createElement('div');
      line.className = `encounter-history-line kind-${entry.kind}`;
      const kind = document.createElement('span');
      kind.className = 'encounter-history-kind';
      kind.textContent = entry.kind.toUpperCase();
      const text = document.createElement('span');
      text.textContent = entry.text;
      line.append(kind, text);
      block.append(line);
    }
    return block;
  });
  const outcome = document.createElement('div');
  outcome.className = 'encounter-history-heading';
  outcome.textContent = `${encounter.identity.title.toUpperCase()} / ${encounter.status.toUpperCase().replace('-', ' ')}`;
  el.encounterRecord.replaceChildren(outcome, ...blocks);
}

// One row per combatant: party first, then every other side, each with its
// token glyph, a side marker, and the orders it is holding for this round.
function sideDotClass(encounter, combatant) {
  if (combatant.side === 'party') return 'encounter-side-dot party';
  const otherSides = [...new Set(encounter.combatants.filter((entry) => entry.side !== 'party').map((entry) => entry.side))];
  return `encounter-side-dot enemy side-${Math.max(0, otherSides.indexOf(combatant.side))}`;
}

function combatantGlyph(combatant) {
  const glyph = document.createElement('span');
  glyph.className = `encounter-glyph ${combatant.side === 'party' ? 'party' : 'enemy'}${combatant.status === 'active' ? '' : ' inactive'}`;
  glyph.textContent = combatant.tokenLabel || combatant.name.charAt(0).toUpperCase();
  return glyph;
}

function declarationText(encounter, combatant) {
  const status = combatantRulesStatus(combatant).toUpperCase();
  if (combatant.status !== 'active') return status;
  const declaration = encounter.roundState?.declaredActions?.find((entry) => entry.actorId === combatant.id);
  if (!declaration) return status;
  const target = declaration.targetId ? encounter.combatants.find((entry) => entry.id === declaration.targetId) : null;
  return `${declaration.action.toUpperCase()}${target ? ` → ${target.name.toUpperCase()}` : ''}`;
}

function rankedSkills(combatant) {
  return Object.entries(combatant.skills ?? {})
    .filter(([, level]) => Number(level) > 0)
    .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]));
}

function personalWeaponSkillLevelFor(combatant, weaponKey) {
  const weapon = getPersonalWeapon(weaponKey);
  return Math.max(0, ...weapon.skillNames.map((name) => Number(combatant.skills?.[name] ?? 0)));
}

const PISTOL_KEYS = Object.freeze(['body-pistol', 'automatic-pistol', 'revolver']);
const BLADE_KEYS = Object.freeze(['dagger', 'blade', 'cutlass', 'sword', 'broadsword', 'bayonet']);

function combatantSheetRows(combatant) {
  const ranked = rankedSkills(combatant);
  const carried = getPersonalWeapon(combatant.weaponKey);
  const rows = [
    ['PRIMARY', ranked[0] ? `${ranked[0][0].toUpperCase()}-${ranked[0][1]}` : 'NONE'],
    ['SECONDARY', ranked[1] ? `${ranked[1][0].toUpperCase()}-${ranked[1][1]}` : 'NONE']
  ];
  const traits = [combatant.armor.toUpperCase()];
  if (combatant.foldingStock) traits.push('FOLDING STOCK \u22121');
  if (combatant.cover && combatant.cover !== 'none') traits.push(`${combatant.cover.toUpperCase()} ${combatant.cover === 'cover' ? '\u22124' : '\u22121'}`);
  const kind = PISTOL_KEYS.includes(combatant.weaponKey) ? 'PISTOL' : BLADE_KEYS.includes(combatant.weaponKey) ? 'BLADE' : 'WEAPON';
  rows.push([kind, `${carried.name.toUpperCase()}-${personalWeaponSkillLevelFor(combatant, combatant.weaponKey)} / ${traits.join(' / ')}`]);
  return rows;
}

// Every legal target, priced: band, needed throw, or why the weapon cannot
// reach. previewPersonalAttack is dice-free, so this costs nothing to show.
function renderEncounterTracker(encounter, actor) {
  const heading = document.createElement('div');
  heading.className = 'encounter-roster-heading';
  heading.textContent = `TRACKER / ROUND ${encounter.round}`;
  const ordered = [
    ...encounter.combatants.filter((entry) => entry.side === 'party'),
    ...encounter.combatants.filter((entry) => entry.side !== 'party')
  ];
  const rows = ordered.map((combatant) => {
    // Each combatant is its own dropdown: the row states who, which side and
    // what they are doing; opening it shows the sheet without a second panel
    // repeating the same thing at the top of the rail.
    const row = document.createElement('details');
    row.className = `encounter-tracker-row${actor?.id === combatant.id ? ' selected' : ''}${combatant.status === 'active' ? '' : ' inactive'}`;
    row.open = expandedTrackerIds.has(combatant.id);
    const summary = document.createElement('summary');
    summary.className = 'encounter-tracker-summary';
    const label = document.createElement('span');
    label.className = 'encounter-tracker-name';
    label.append(combatantGlyph(combatant), Object.assign(document.createElement('i'), { className: sideDotClass(encounter, combatant) }), document.createTextNode(combatant.name.toUpperCase()));
    const orders = document.createElement('span');
    orders.className = 'encounter-tracker-orders';
    orders.textContent = declarationText(encounter, combatant);
    summary.append(label, orders);
    summary.addEventListener('click', () => {
      // Opening a combatant also selects it: one gesture, not two.
      if (row.open) expandedTrackerIds.delete(combatant.id);
      else expandedTrackerIds.add(combatant.id);
      if (combatant.status === 'active') setEncounterActor(encounter.identity.id, combatant.id);
    });

    const body = document.createElement('div');
    body.className = 'encounter-tracker-body';
    const stats = document.createElement('div');
    stats.className = 'encounter-selected-stats';
    // Book 1 p.36: blows and swings left before they become weakened. Guns are
    // not affected, so this only means anything with a melee weapon in hand.
    const melee = getPersonalWeapon(combatant.weaponKey).melee;
    stats.textContent = `STR ${combatant.current.STR}/${combatant.characteristics.STR}  DEX ${combatant.current.DEX}/${combatant.characteristics.DEX}  END ${combatant.current.END}/${combatant.characteristics.END}`
      + (melee ? `  BLOWS ${blowsRemaining(combatant)}/${combatant.blowAllowance}` : '');
    body.append(stats);
    for (const [key, value] of combatantSheetRows(combatant)) {
      const line = document.createElement('div');
      line.className = 'panel-row';
      line.append(
        Object.assign(document.createElement('span'), { className: 'panel-row-label', textContent: key }),
        Object.assign(document.createElement('span'), { className: 'panel-row-value', textContent: value })
      );
      body.append(line);
    }

    // This combatant's own orders, in this combatant's own row. The map's
    // right-click cascade does the same job at the token; neither needs a
    // global verb row taking space from the list.
    const declaredIds = new Set(encounter.roundState?.declaredActions?.map((entry) => entry.actorId) ?? []);
    const canOrder = combatant.status === 'active' && !declaredIds.has(combatant.id) && encounter.status === 'active';
    // What the house routine would do, with one click to take it. A manual
    // combatant gets the suggestion too — it is advice, not automation.
    if (canOrder) {
      const suggestion = chooseNpcDeclaration(encounter, combatant);
      if (suggestion) {
        const advice = document.createElement('div');
        advice.className = 'encounter-tracker-advice';
        const text = document.createElement('span');
        const target = suggestion.targetId ? encounter.combatants.find((entry) => entry.id === suggestion.targetId) : null;
        text.textContent = `SUGGESTS ${suggestion.action.toUpperCase()}${target ? ` → ${target.name.toUpperCase()}` : ''} / ${suggestion.reason}`;
        const accept = makePortButton('ACCEPT', () => resolveActiveEncounterAction(suggestion.action, suggestion.modifier, suggestion.targetId, combatant.id));
        advice.append(text, accept);
        body.append(advice);
      }
    }

    const tacticsRow = document.createElement('label');
    tacticsRow.className = 'encounter-tracker-tactics';
    const auto = document.createElement('input');
    auto.type = 'checkbox';
    auto.checked = combatant.tactics === 'auto';
    auto.title = 'Declare this combatant automatically when the round resolves';
    auto.addEventListener('change', () => updateEncounterDocument(encounter.identity.id, (doc) =>
      setCombatantTactics(doc, { combatantId: combatant.id, tactics: auto.checked ? 'auto' : 'manual' }).encounter));
    tacticsRow.append(auto, Object.assign(document.createElement('span'), { textContent: 'AUTO' }));
    body.append(tacticsRow);

    const verbs = document.createElement('div');
    verbs.className = 'encounter-tracker-verbs';
    const foe = encounter.combatants.find((entry) => entry.id === selectedEncounterTargetId && entry.side !== combatant.side && entry.status === 'active')
      ?? encounter.combatants.find((entry) => entry.side !== combatant.side && entry.status === 'active');
    verbs.append(
      makePortButton('ATTACK', () => { setEncounterActor(encounter.identity.id, combatant.id); openEncounterAttackDialog(encounter); }, { disabled: !canOrder || !foe }),
      makePortButton('EVADE', () => resolveActiveEncounterAction('evade', 0, null, combatant.id), { disabled: !canOrder }),
      makePortButton('CLOSE + ATTACK', () => resolveActiveEncounterAction('close', 0, foe?.id ?? null, combatant.id), { disabled: !canOrder || !foe }),
      makePortButton('OPEN + ATTACK', () => resolveActiveEncounterAction('open', 0, foe?.id ?? null, combatant.id), { disabled: !canOrder || !foe }),
      makePortButton('RUN CLOSE', () => resolveActiveEncounterAction('close-run', 0, foe?.id ?? null, combatant.id), { disabled: !canOrder || !foe }),
      makePortButton('RUN OPEN', () => resolveActiveEncounterAction('open-run', 0, foe?.id ?? null, combatant.id), { disabled: !canOrder || !foe }),
      makePortButton('ESCAPE', () => resolveActiveEncounterAction('escape', 0, null, combatant.id), { disabled: !canOrder || encounter.round !== 1 }),
      makePortButton('STAND', () => resolveActiveEncounterAction('wait', 0, null, combatant.id), { disabled: !canOrder })
    );
    body.append(verbs);
    row.append(summary, body);
    return row;
  });
  el.encounterTracker.replaceChildren(heading, ...rows);

  const undeclared = undeclaredCombatantIds(encounter);
  const button = encounter.status === 'active'
    ? makePortButton(`RESOLVE ROUND ${encounter.round}`, resolveDeclaredEncounterRound)
    : makePortButton('START COMBAT', openCombatSetupDialog);
  const note = document.createElement('span');
  note.className = 'encounter-resolve-note';
  const autoPending = pendingNpcDeclarations(encounter).length;
  note.textContent = encounter.status !== 'active'
    ? `ENCOUNTER ${encounter.status.toUpperCase().replace('-', ' ')}`
    : undeclared.length
      ? `${undeclared.length} UNDECLARED${autoPending ? ` / ${autoPending} ON AUTO` : ''} / THE REST ATTACK THEIR NEAREST ENEMY`
      : 'ALL DECLARED';
  const controls = [button];
  if (encounter.status === 'active') {
    controls.push(makePortButton('END COMBAT', () => endActiveEncounter()));
  }
  el.encounterResolve.replaceChildren(...controls, note);
}

function assetForActor(actor) {
  return mediaAssetDocuments.find((entry) => entry.identity.id === actor?.presentation?.portraitAssetId) ?? null;
}

function parseNpcSkills(text) {
  const skills = {};
  for (const line of String(text).split(/\r?\n|,/)) {
    const match = line.trim().match(/^(.+?)\s+(\d+)$/);
    if (!match) { if (line.trim()) throw new Error(`skill must use "NAME LEVEL": ${line.trim()}`); continue; }
    skills[match[1].trim()] = Number.parseInt(match[2], 10);
  }
  return skills;
}

function npcSkillsText(skills) {
  return Object.entries(skills).sort(([a], [b]) => a.localeCompare(b)).map(([name, level]) => `${name} ${level}`).join('\n');
}

function closeNpcActorDialog() {
  pendingNpcPortraitAsset = null;
  if (typeof el.npcActorDialog.close === 'function') el.npcActorDialog.close();
  else el.npcActorDialog.removeAttribute('open');
}

function openNpcActorDialog(actorId = null) {
  if (!campaignDocument) return setStatus('CREATE OR LOAD A CAMPAIGN BEFORE ADDING ROSTER ACTORS', 'error');
  const actor = actorId ? npcActorDocuments.find((entry) => entry.identity.id === actorId) : null;
  el.npcActorForm.reset();
  el.npcActorId.value = actor?.identity.id ?? '';
  el.npcName.value = actor?.identity.name ?? '';
  el.npcRole.value = actor?.profile.role ?? '';
  el.npcType.value = actor?.profile.actorType ?? 'npc';
  el.npcBody.value = actor?.profile.bodyModel ?? 'biological';
  el.npcSpecies.value = actor?.profile.species ?? 'Human';
  el.npcFaction.value = actor?.profile.faction ?? '';
  el.npcHomeworld.value = actor?.profile.homeworld ?? '';
  el.npcAge.value = actor?.profile.age ?? '';
  for (const [element, key] of [[el.npcStr, 'STR'], [el.npcDex, 'DEX'], [el.npcEnd, 'END'], [el.npcInt, 'INT'], [el.npcEdu, 'EDU'], [el.npcSoc, 'SOC']]) element.value = String(actor?.characteristics[key] ?? 7);
  el.npcService.value = actor?.career.service ?? '';
  el.npcTerms.value = String(actor?.career.terms ?? 0);
  el.npcRank.value = actor?.career.rankTitle ?? '';
  el.npcCredits.value = String(actor?.finances.credits ?? 0);
  el.npcWeapon.value = actor?.loadout.weaponKey ?? 'automatic-pistol';
  el.npcArmor.value = actor?.loadout.armor ?? 'none';
  el.npcSkills.value = npcSkillsText(actor?.skills ?? {});
  el.npcDescription.value = actor?.presentation.description ?? '';
  el.npcPublicNotes.value = actor?.notes.public ?? '';
  el.npcRefereeNotes.value = actor?.notes.referee ?? '';
  pendingNpcPortraitAsset = null;
  el.npcPortraitStatus.textContent = assetForActor(actor ?? {}) ? 'PORTRAIT SAVED' : 'NO PORTRAIT';
  if (typeof el.npcActorDialog.showModal === 'function') el.npcActorDialog.showModal();
  else el.npcActorDialog.setAttribute('open', '');
  window.setTimeout(() => el.npcName.focus(), 0);
}

function fieldInteger(input, label, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  const value = Number.parseInt(input.value, 10);
  if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error(`${label} must be ${minimum}-${maximum}`);
  return value;
}

function saveNpcActorFromForm() {
  const existing = npcActorDocuments.find((entry) => entry.identity.id === el.npcActorId.value) ?? null;
  if (pendingNpcPortraitAsset) {
    mediaAssetDocuments = mediaAssetDocuments.filter((entry) => entry.identity.id !== pendingNpcPortraitAsset.identity.id);
    mediaAssetDocuments.push(pendingNpcPortraitAsset);
    campaignDocument = addMediaAssetToCampaign(campaignDocument, pendingNpcPortraitAsset);
  }
  const values = {
    name: el.npcName.value.trim(), role: el.npcRole.value.trim(), actorType: el.npcType.value,
    bodyModel: el.npcBody.value, species: el.npcSpecies.value.trim(), faction: el.npcFaction.value.trim(), homeworld: el.npcHomeworld.value.trim(),
    age: el.npcAge.value === '' ? null : fieldInteger(el.npcAge, 'age', 0, 999),
    characteristics: { STR: fieldInteger(el.npcStr, 'STR', 0, 15), DEX: fieldInteger(el.npcDex, 'DEX', 0, 15), END: fieldInteger(el.npcEnd, 'END', 0, 15), INT: fieldInteger(el.npcInt, 'INT', 0, 15), EDU: fieldInteger(el.npcEdu, 'EDU', 0, 15), SOC: fieldInteger(el.npcSoc, 'SOC', 0, 15) },
    career: { service: el.npcService.value.trim(), terms: fieldInteger(el.npcTerms, 'terms', 0, 20), rankTitle: el.npcRank.value.trim() },
    credits: Number.parseInt(el.npcCredits.value || '0', 10), skills: parseNpcSkills(el.npcSkills.value),
    weaponKey: el.npcWeapon.value, armor: el.npcArmor.value, description: el.npcDescription.value,
    portraitAssetId: pendingNpcPortraitAsset?.identity.id ?? existing?.presentation.portraitAssetId ?? null,
    publicNotes: el.npcPublicNotes.value, refereeNotes: el.npcRefereeNotes.value
  };
  values.current = { STR: values.characteristics.STR, DEX: values.characteristics.DEX, END: values.characteristics.END };
  if (existing) values.career = { ...existing.career, ...values.career, yearsServed: values.career.terms * 4 };
  if (!existing || existing.profile.bodyModel !== values.bodyModel) values.state = values.bodyModel === 'robotic'
    ? { lifeState: 'not-applicable', consciousness: 'not-applicable', activation: 'active', integrity: 'intact', archived: false }
    : { lifeState: 'alive', consciousness: 'conscious', activation: 'not-applicable', integrity: 'intact', archived: false };
  const actor = existing ? updateNpcActorDocument(existing, values) : createNpcActorDocument(values);
  npcActorDocuments = npcActorDocuments.filter((entry) => entry.identity.id !== actor.identity.id);
  npcActorDocuments.push(actor);
  if (!existing) campaignDocument = addNpcActorToCampaign(campaignDocument, actor);
  syncCampaignRefs();
  persistCampaignState();
  closeNpcActorDialog();
  logActivity('ROSTER', `${existing ? 'Updated' : 'Created'} actor: ${actor.identity.name}`);
  setStatus(`ROSTER ACTOR ${existing ? 'UPDATED' : 'CREATED'}: ${actor.identity.name.toUpperCase()}`, 'ok');
  render();
}

// The directory: everyone and everything in the campaign, with who plays it.
// Ownership is recorded as `ownerUid` because that is the field every rule in
// graycloak-adnd's Firestore ruleset keys on; when these documents move to
// Firestore the permission model transfers rather than being rewritten.
// Sign-in establishes an identity and nothing more: no campaign data crosses
// the network in this version. Running signed out, or with the SDK
// unreachable, is a supported state — the client stays entirely local, which
// is how single-player has always worked.
function renderAccount() {
  if (!el.accountButton) return;
  const { user, status } = authStatus();
  if (status === 'unavailable') {
    el.accountName.textContent = 'LOCAL ONLY';
    el.accountName.title = 'Sign-in is unreachable; campaigns stay in this browser';
    el.accountButton.hidden = true;
    return;
  }
  if (status === 'loading') {
    el.accountName.textContent = '';
    el.accountButton.hidden = true;
    return;
  }
  if (user) {
    el.accountName.textContent = (user.displayName || user.email || user.uid).toUpperCase();
    // A player has to send this to their referee before they can be seated,
    // so clicking it copies it rather than making them read it off the screen.
    el.accountName.title = `${user.email ?? user.uid}\nAccount id: ${user.uid}\nClick to copy the id`;
    el.accountName.classList.add('copyable');
    el.accountName.onclick = async () => {
      try {
        await navigator.clipboard.writeText(user.uid);
        setStatus('ACCOUNT ID COPIED / SEND IT TO YOUR REFEREE', 'ok');
      } catch {
        window.prompt('Account id — copy this and send it to your referee:', user.uid);
      }
    };
    el.accountButton.hidden = false;
    el.accountButton.textContent = '[ SIGN OUT ]';
    el.accountButton.onclick = async () => {
      try { await signOutOfTraveller(); } catch (error) { setStatus(error?.message ?? String(error), 'error'); }
    };
    return;
  }
  el.accountName.textContent = '';
  el.accountName.classList.remove('copyable');
  el.accountName.onclick = null;
  el.accountButton.hidden = false;
  el.accountButton.textContent = '[ SIGN IN ]';
  el.accountButton.onclick = () => openSignInDialog();
;
}

// Publishing is explicit and one-way for now: the local campaign stays
// authoritative and this pushes a copy players may read. Nothing is read back
// in this version, so a failed publish costs nothing but the message.
// Players write declarations; the referee reads them and applies them as
// ordinary intents, the same path a click or the NPC routine takes. A
// declaration is create-only for the player, so it cannot be revised after the
// fact; the referee clears them once the round resolves.
function watchPlayerDeclarations() {
  const encounter = activeEncounterAtCurrentSystem();
  const online = campaignIsPublished(campaignDocument) && currentUserId();
  if (!online || !encounter) {
    unsubscribeDeclarations?.();
    unsubscribeDeclarations = null;
    watchedDeclarationEncounterId = null;
    return;
  }
  if (watchedDeclarationEncounterId === encounter.identity.id) return;
  unsubscribeDeclarations?.();
  watchedDeclarationEncounterId = encounter.identity.id;
  const watchedId = encounter.identity.id;
  watchDeclarations(campaignDocument.identity.id, watchedId, applyPlayerDeclarations)
    .then((unsubscribe) => {
      if (watchedDeclarationEncounterId !== watchedId) unsubscribe();
      else unsubscribeDeclarations = unsubscribe;
    })
    .catch((error) => console.error(error));
}

function watchPlayerCanvas() {
  watchTableChat();
  const encounter = activeEncounterAtCurrentSystem() ?? latestEncounterAtCurrentSystem();
  const online = campaignIsPublished(campaignDocument) && currentUserId();
  // v0.74.0: with no fight and an active scene, players walk their tokens
  // about the scene; the intents travel the same moves path keyed by scene.
  const staging = !activeEncounterAtCurrentSystem() && activeScene();
  if (online && staging) {
    const scene = activeScene();
    if (watchedMoveEncounterId === scene.identity.id) return;
    unsubscribeTokenMoves?.(); unsubscribeCanvasPresence?.(); unsubscribeCanvasPresence = null; canvasPresence = [];
    watchedMoveEncounterId = scene.identity.id;
    const watchedId = scene.identity.id;
    watchTokenMoves(campaignDocument.identity.id, watchedId, applyPlayerSceneMoves)
      .then((unsubscribe) => { if (watchedMoveEncounterId !== watchedId) unsubscribe(); else unsubscribeTokenMoves = unsubscribe; })
      .catch((error) => console.error(error));
    return;
  }
  if (!online || !encounter) {
    unsubscribeTokenMoves?.(); unsubscribeTokenMoves = null; watchedMoveEncounterId = null;
    unsubscribeCanvasPresence?.(); unsubscribeCanvasPresence = null; canvasPresence = [];
    return;
  }
  if (watchedMoveEncounterId === encounter.identity.id) return;
  unsubscribeTokenMoves?.();
  unsubscribeCanvasPresence?.();
  watchedMoveEncounterId = encounter.identity.id;
  const watchedId = encounter.identity.id;
  watchTokenMoves(campaignDocument.identity.id, watchedId, applyPlayerTokenMoves)
    .then((unsubscribe) => { if (watchedMoveEncounterId !== watchedId) unsubscribe(); else unsubscribeTokenMoves = unsubscribe; })
    .catch((error) => console.error(error));
  watchCanvasPresence(campaignDocument.identity.id, watchedId, (entries) => { canvasPresence = entries; renderEncounter(); })
    .then((unsubscribe) => { if (watchedMoveEncounterId !== watchedId) unsubscribe(); else unsubscribeCanvasPresence = unsubscribe; })
    .catch((error) => console.error(error));
}

// A line addressed to one player's log, which reaches their page whatever its
// category and nobody else's.
function tellPlayer(uid, message) {
  if (!uid) return;
  logActivity('COMBAT', message, { visibility: ACTIVITY_VISIBILITY.PLAYERS, audiencePlayerIds: [uid] });
}

function applyPlayerTokenMoves(entries) {
  const encounter = activeEncounterAtCurrentSystem() ?? latestEncounterAtCurrentSystem();
  if (!encounter) return;
  let changed = false;
  const index = encounterDocuments.findIndex((entry) => entry.identity.id === encounter.identity.id);
  for (const entry of entries.sort((a, b) => a.movedAt - b.movedAt)) {
    if (appliedMoveIds.has(entry.id)) continue;
    try {
      const move = authorizePlayerTokenMove(entry, { campaign: campaignDocument, encounter: encounterDocuments[index] });
      encounterDocuments[index] = moveEncounterCombatantByPlayer(encounterDocuments[index], playerMoveToCombatantMove(move)).encounter;
      appliedMoveIds.add(entry.id);
      changed = true;
    } catch (error) {
      appliedMoveIds.add(entry.id);
      console.warn('[traveller] player token move refused:', error?.message ?? error);
      // v0.71.0: the player sees why, on their own page, not only the referee.
      tellPlayer(entry.uid, `Your move was refused: ${error?.message ?? error}`);
    }
    clearTokenMove(campaignDocument.identity.id, encounter.identity.id, entry.id).catch((error) => console.error(error));
  }
  if (changed) {
    syncCampaignRefs();
    persistCampaignState();
    autoPublishEncounterView(encounterDocuments[index]);
    renderEncounter();
  }
}

function applyPlayerDeclarations(entries) {
  const encounter = activeEncounterAtCurrentSystem();
  if (!encounter) return;
  let changed = false;
  for (const entry of entries) {
    // One application per combatant per round, however many times the
    // subscription fires.
    const key = `${encounter.identity.id}|${entry.round}|${entry.actorId}`;
    if (appliedDeclarationKeys.has(key)) continue;
    if (entry.round !== encounter.round) continue;
    const index = encounterDocuments.findIndex((document) => document.identity.id === encounter.identity.id);
    try {
      const authorized = authorizePlayerDeclaration(entry, { campaign: campaignDocument, encounter: encounterDocuments[index] });
      const result = declareEncounterAction(encounterDocuments[index], {
        action: authorized.action, modifier: 0, actorId: authorized.actorId, targetId: authorized.targetId
      });
      encounterDocuments[index] = result.encounter;
      appliedDeclarationKeys.add(key);
      const actor = result.encounter.combatants.find((combatant) => combatant.id === entry.actorId);
      logActivity('COMBAT', `${actor?.name ?? 'A player'} declares ${entry.action.toUpperCase()} from their own screen.`);
      changed = true;
    } catch (error) {
      // Already declared, or no longer legal: the referee's board is
      // authoritative and a stale declaration is simply ignored.
      appliedDeclarationKeys.add(key);
      console.warn('[traveller] player declaration refused:', error?.message ?? error);
      tellPlayer(entry.uid, `Your order was refused: ${error?.message ?? error}`);
    }
  }
  if (changed) {
    syncCampaignRefs();
    persistCampaignState();
    render();
  }
}

function renderPublishPanel() {
  if (!el.publishStatusLine) return;
  const uid = currentUserId();
  const online = campaignIsPublished(campaignDocument);
  const publishedAt = campaignDocument?.ownership?.publishedAt ?? null;
  el.publishStatusLine.textContent = !campaignDocument
    ? 'NO CAMPAIGN'
    : !uid
      ? 'SIGN IN TO PUBLISH'
      : online
        ? `ONLINE / ${new Date(publishedAt).toLocaleTimeString()}`
        : 'LOCAL ONLY';
  el.publishCampaignButton.disabled = !campaignDocument || !uid;
  el.publishCampaignButton.textContent = online ? '[ REPUBLISH ]' : '[ PUBLISH ]';
  // The scene control follows the encounter, not the rail: combat hides every
  // rail panel, so this lives in the campaign menu where it stays reachable.
  const scene = activeEncounterAtCurrentSystem() ?? latestEncounterAtCurrentSystem();
  el.publishViewButton.hidden = !online || !uid || !scene;
  if (el.openPlayers) el.openPlayers.hidden = !online || !uid;
  el.publishViewButton.textContent = scene && lastPublishedRound === `${scene.identity.id}|${scene.round}`
    ? '[ SCENE PUBLISHED ]'
    : '[ PUBLISH SCENE ]';
}

async function publishCurrentCampaign() {
  try {
    const uid = currentUserId();
    if (!campaignDocument) throw new Error('no campaign to publish');
    if (!uid) throw new Error('sign in before publishing');
    // The referee owns what they publish; the rules check this on create.
    if (campaignDocument.ownership?.ownerUid !== uid) {
      campaignDocument = setCampaignOwner(campaignDocument, uid);
    }
    const publishedAt = Date.now();
    const scene = activeEncounterAtCurrentSystem() ?? latestEncounterAtCurrentSystem();
    const published = buildPublishedCampaign(campaignDocument, {
      publishedAt,
      currentEncounterId: scene?.identity.id ?? null,
      ship: shipDocument,
      activeScene: publishedActiveScene()
    });
    await publishCampaign(published);
    // Only recorded once the write is acknowledged, so a failure leaves the
    // campaign honestly marked local.
    campaignDocument = markCampaignPublished(campaignDocument, publishedAt);
    persistCampaignState();
    const counts = await publishPlayerDocuments({ publishedAt });
    logActivity('SYSTEM', `Campaign published as ${published.campaignId}; players seated on it may read the shared state${counts.characters ? ` / ${counts.characters} character sheet${counts.characters === 1 ? '' : 's'} sent to ${counts.players} player${counts.players === 1 ? '' : 's'}` : ''}.`);
    setStatus(`PUBLISHED ${published.campaignId.toUpperCase()}`, 'ok');
    render();
  } catch (error) {
    console.error(error);
    setStatus(`PUBLISH FAILED / ${error?.message ?? String(error)}`, 'error');
    render();
  }
}

// Publishing a scene by hand is a step to forget mid-combat, and the moment
// the players' view goes stale is exactly the moment a round resolves. So the
// referee publishes automatically while the campaign is online; the manual
// control stays for the cases automation does not cover — a scene set up
// before the first round, or a republish after editing the board.
async function publishEncounterViewFor(encounter, { silent = false } = {}) {
  if (!encounter) throw new Error('no encounter to publish');
  if (!campaignIsPublished(campaignDocument)) throw new Error('publish the campaign first');
  const view = buildPublishedView(encounter, {
    campaignId: campaignDocument.identity.id,
    publishedAt: Date.now()
  });
  await publishEncounterView(view);
  await publishCampaign(buildPublishedCampaign(campaignDocument, {
    publishedAt: campaignDocument.ownership?.publishedAt ?? Date.now(),
    currentEncounterId: encounter.identity.id,
    ship: shipDocument
  }));
  if (!silent) {
    logActivity('SYSTEM', `Scene published for round ${view.round}: ${view.combatants.length} combatants, ${view.narration.length} log lines.`);
    setStatus(`SCENE PUBLISHED / ROUND ${view.round}`, 'ok');
  }
  return view;
}

async function publishCurrentEncounterView() {
  try {
    await publishEncounterViewFor(activeEncounterAtCurrentSystem() ?? latestEncounterAtCurrentSystem());
    render();
  } catch (error) {
    console.error(error);
    setStatus(`PUBLISH FAILED / ${error?.message ?? String(error)}`, 'error');
  }
}

// Called after every resolved round. A publishing failure must never interrupt
// play: the round is already resolved locally, so this reports and carries on.
function autoPublishEncounterView(encounter) {
  if (!campaignIsPublished(campaignDocument) || !currentUserId() || !encounter) return;
  publishEncounterViewFor(encounter, { silent: true })
    .then((view) => {
      lastPublishedRound = `${encounter.identity.id}|${view.round}`;
      renderPublishPanel();
      // Wounds were just written back to the character documents; the
      // player's sheet should say so before the next round is declared.
      return publishPlayerDocuments();
    })
    .catch((error) => {
      console.error(error);
      setStatus(`SCENE PUBLISH FAILED / ${error?.message ?? String(error)}`, 'error');
    });
}

// --- v0.65.0: the player's own documents ---------------------------------
// Each assigned character is published in full to the account that plays it,
// and each seated account gets a log filtered to table knowledge, under
// players/{uid}/… where the rules let only that account and the referee read.
// The referee's documents stay authoritative; these are copies.
//
// Ownership is reconciled against what was last published from this browser,
// so reassigning a character removes it from the previous player's path.
let publishedCharacterOwners = new Map();
let playerPublishTimer = null;

function seatedOwnership() {
  const owners = new Map();
  for (const [documentId, uid] of Object.entries(campaignDocument?.ownership?.actors ?? {})) {
    if (typeof uid === 'string' && uid.trim()) owners.set(documentId, uid.trim());
  }
  return owners;
}

async function publishPlayerDocuments({ publishedAt = Date.now() } = {}) {
  if (!campaignIsPublished(campaignDocument) || !currentUserId()) return { characters: 0, players: 0 };
  if (playerPublishTimer) { clearTimeout(playerPublishTimer); playerPublishTimer = null; }
  const campaignId = campaignDocument.identity.id;
  const owners = seatedOwnership();
  const characters = currentPartyCharacters();
  let published = 0;
  for (const [characterId, previousUid] of publishedCharacterOwners) {
    if (owners.get(characterId) !== previousUid) {
      await removePlayerCharacter(campaignId, previousUid, characterId).catch((error) => console.error(error));
      publishedCharacterOwners.delete(characterId);
    }
  }
  const byUid = new Map();
  for (const character of characters) {
    const uid = owners.get(character.identity.id);
    if (!uid) continue;
    await publishPlayerCharacter(buildPublishedCharacter(character, { campaignId, ownerUid: uid, publishedAt }));
    publishedCharacterOwners.set(character.identity.id, uid);
    byUid.set(uid, [...(byUid.get(uid) ?? []), character.identity.id]);
    published += 1;
  }
  if (activityLogDocument) {
    for (const [uid, ownedCharacterIds] of byUid) {
      await publishPlayerLog(buildPublishedLog(activityLogDocument, { campaignId, uid, ownedCharacterIds, publishedAt }));
    }
  }
  return { characters: published, players: byUid.size };
}

// Every log line while online would be a write per player; a short debounce
// coalesces a burst — a jump, its arrival, its berthing — into one publish.
// A failure never interrupts play.
function schedulePlayerDocumentPublish() {
  if (!campaignIsPublished(campaignDocument) || !currentUserId()) return;
  if (playerPublishTimer) clearTimeout(playerPublishTimer);
  playerPublishTimer = setTimeout(() => {
    playerPublishTimer = null;
    publishPlayerDocuments().catch((error) => console.error('[traveller] player documents:', error));
  }, 1500);
}

// Seating a player is what makes the campaign readable to them: the rules test
// membership of travellerCampaigns/{id}/players. Assigning a character is a
// separate act — it writes the ownership map, which is what lets them declare
// that combatant's actions.
//
// Account ids are typed in by hand for now. A uid only exists once someone has
// signed in, so there is no way to name a player before they have; invites
// replace this by carrying a code the player redeems themselves.
let seatedPlayers = [];

function setPlayersStatus(text, kind = '') {
  if (!el.playersStatus) return;
  el.playersStatus.textContent = text;
  el.playersStatus.className = `players-status${kind ? ` ${kind}` : ''}`;
}

async function openPlayersDialog() {
  if (!el.playersDialog) return;
  el.playersUid.value = '';
  el.playersName.value = '';
  setPlayersStatus('');
  renderPlayerCharacterOptions();
  el.playersDialog.showModal();
  await refreshSeatedPlayers();
  await refreshInvites();
  watchJoins();
}

// --- v0.67.0: invites and join requests ----------------------------------
// A player rolls a character at enter.html and sits down by redeeming a code
// the referee minted here. The request arrives beneath the campaign carrying
// the character; seating it copies that character in, assigns and seats the
// account, marks the player's own record as belonging to this campaign, and
// clears the request.
let campaignInvites = [];
let joinRequests = [];
let unsubscribeJoins = null;
let watchedJoinsCampaignId = null;

async function refreshInvites() {
  if (!el.playersInviteList) return;
  try {
    campaignInvites = campaignIsPublished(campaignDocument) ? await listCampaignInvites(campaignDocument.identity.id) : [];
  } catch (error) {
    console.error(error);
    campaignInvites = [];
  }
  renderInvites();
}

function inviteLink(code) {
  const base = new URL('enter.html', window.location.href);
  base.searchParams.set('invite', code);
  return base.toString();
}

function renderInvites() {
  if (!el.playersInviteList) return;
  el.playersNewInvite.disabled = !campaignIsPublished(campaignDocument) || !currentUserId();
  if (!campaignInvites.length) {
    el.playersInviteList.replaceChildren(Object.assign(document.createElement('div'), { className: 'players-empty', textContent: 'NO OPEN INVITES' }));
    return;
  }
  el.playersInviteList.replaceChildren(...campaignInvites.map((invite) => {
    const row = document.createElement('div');
    row.className = 'players-row';
    const code = document.createElement('code'); code.className = 'players-invite-code'; code.textContent = invite.code;
    const link = document.createElement('span'); link.className = 'players-plays'; link.textContent = inviteLink(invite.code);
    const copy = makePortButton('COPY LINK', async () => {
      try { await navigator.clipboard.writeText(inviteLink(invite.code)); setPlayersStatus('INVITE LINK COPIED', 'ok'); }
      catch { window.prompt('Invite link:', inviteLink(invite.code)); }
    });
    const revoke = makePortButton('REVOKE', () => revokeInvite(invite.code));
    row.append(code, link, copy, revoke);
    return row;
  }));
}

async function mintInvite() {
  try {
    const uid = currentUserId();
    if (!campaignIsPublished(campaignDocument)) throw new Error('publish the campaign first');
    if (!uid) throw new Error('sign in first');
    const invite = createTravellerInvite({
      code: generateInviteCode(), ownerUid: uid,
      campaignId: campaignDocument.identity.id, campaignName: campaignDocument.identity.name ?? null
    });
    await createInvite(invite);
    logActivity('SYSTEM', `Invite ${invite.code} opened for this table.`);
    setPlayersStatus(`INVITE ${invite.code} OPEN`, 'ok');
    await refreshInvites();
  } catch (error) {
    console.error(error);
    setPlayersStatus(error?.message ?? String(error), 'error');
  }
}

async function revokeInvite(code) {
  try {
    await deleteInvite(code);
    logActivity('SYSTEM', `Invite ${code} revoked.`);
    setPlayersStatus(`INVITE ${code} REVOKED`, 'ok');
    await refreshInvites();
  } catch (error) {
    console.error(error);
    setPlayersStatus(error?.message ?? String(error), 'error');
  }
}

function watchJoins() {
  const campaignId = campaignIsPublished(campaignDocument) && currentUserId() ? campaignDocument.identity.id : null;
  if (campaignId === watchedJoinsCampaignId) return;
  unsubscribeJoins?.(); unsubscribeJoins = null;
  joinRequests = []; watchedJoinsCampaignId = campaignId;
  renderJoins();
  if (!campaignId) return;
  watchJoinRequests(campaignId, (entries) => { joinRequests = entries; renderJoins(); })
    .then((unsubscribe) => { if (campaignId === watchedJoinsCampaignId) unsubscribeJoins = unsubscribe; else unsubscribe(); })
    .catch((error) => console.error(error));
}

function renderJoins() {
  if (!el.playersJoins) return;
  if (!joinRequests.length) {
    el.playersJoins.replaceChildren(Object.assign(document.createElement('div'), { className: 'players-empty', textContent: 'NOBODY WAITING' }));
    return;
  }
  el.playersJoins.replaceChildren(...joinRequests.map((join) => {
    const row = document.createElement('div');
    row.className = 'players-row';
    row.title = join.uid;
    const who = document.createElement('span'); who.className = 'players-name'; who.textContent = (join.name || join.uid).toUpperCase();
    const character = join.character ?? {};
    const what = document.createElement('span'); what.className = 'players-plays';
    what.textContent = `${String(join.characterName ?? character.identity?.name ?? '?').toUpperCase()} / ${character.upp ?? '------'} / ${String(character.career?.service ?? '').toUpperCase()}${character.career?.rankTitle ? ` / ${character.career.rankTitle.toUpperCase()}` : ''} / ${Object.keys(character.skills ?? {}).length} SKILLS`;
    row.append(who, what, makePortButton('SEAT', () => seatJoinRequest(join)), makePortButton('DECLINE', () => declineJoinRequest(join)));
    return row;
  }));
}

async function seatJoinRequest(join) {
  try {
    if (!campaignIsPublished(campaignDocument)) throw new Error('publish the campaign first');
    const campaignId = campaignDocument.identity.id;
    const characterDocument = importCharacterDocument(join.character);
    if (currentPartyCharacters().some((entry) => entry.identity.id === characterDocument.identity.id)) {
      throw new Error(`${characterDocument.identity.name} is already in this campaign`);
    }
    // The player's character becomes a party character, owned by their account.
    persistCampaignState();
    addCharacterDocumentToCampaign(characterDocument, campaignId, { makeActive: false });
    campaignDocument = setDocumentOwner(campaignDocument, { documentId: characterDocument.identity.id, ownerUid: join.uid });
    persistCampaignState();
    await seatPlayer(campaignId, join.uid, { name: join.name ?? null });
    const scene = activeEncounterAtCurrentSystem() ?? latestEncounterAtCurrentSystem();
    await publishCampaign(buildPublishedCampaign(campaignDocument, { publishedAt: Date.now(), currentEncounterId: scene?.identity.id ?? null }));
    await publishPlayerDocuments();
    // Their own record now says where the character is; the lobby's ENTER
    // WORLD reads this.
    await setCharacterRecordWorldRemote(join.characterId, {
      kind: WORLD_KINDS.CAMPAIGN, campaignId, campaignName: campaignDocument.identity.name ?? null, since: Date.now()
    }).catch((error) => console.error('[traveller] character record world:', error));
    await deleteJoinRequest(campaignId, join.uid);
    logActivity('SYSTEM', `${join.name || join.uid} seated with ${characterDocument.identity.name} from an invite.`);
    setPlayersStatus(`${characterDocument.identity.name.toUpperCase()} SEATED`, 'ok');
    renderPlayerCharacterOptions();
    await refreshSeatedPlayers();
    render();
  } catch (error) {
    console.error(error);
    setPlayersStatus(error?.message ?? String(error), 'error');
  }
}

async function declineJoinRequest(join) {
  try {
    await deleteJoinRequest(campaignDocument.identity.id, join.uid);
    logActivity('SYSTEM', `${join.name || join.uid}'s request to sit down declined.`);
    setPlayersStatus('DECLINED', 'ok');
  } catch (error) {
    console.error(error);
    setPlayersStatus(error?.message ?? String(error), 'error');
  }
}

function renderPlayerCharacterOptions() {
  if (!el.playersCharacter) return;
  const options = [new Option('NOBODY YET', '')];
  for (const character of currentPartyCharacters()) {
    options.push(new Option(character.identity.name.toUpperCase(), character.identity.id));
  }
  el.playersCharacter.replaceChildren(...options);
}

async function refreshSeatedPlayers() {
  try {
    if (!campaignIsPublished(campaignDocument)) {
      seatedPlayers = [];
      renderSeatedPlayers();
      setPlayersStatus('PUBLISH THE CAMPAIGN BEFORE SEATING PLAYERS', 'error');
      return;
    }
    seatedPlayers = await listSeatedPlayers(campaignDocument.identity.id);
    renderSeatedPlayers();
  } catch (error) {
    console.error(error);
    setPlayersStatus(error?.message ?? String(error), 'error');
  }
}

function renderSeatedPlayers() {
  if (!el.playersSeated) return;
  const owners = campaignDocument?.ownership?.actors ?? {};
  if (!seatedPlayers.length) {
    el.playersSeated.replaceChildren(Object.assign(document.createElement('div'), {
      className: 'players-empty', textContent: 'NO PLAYERS SEATED'
    }));
    return;
  }
  const rows = seatedPlayers.map((player) => {
    const row = document.createElement('div');
    row.className = 'players-row';
    const plays = Object.entries(owners)
      .filter(([, uid]) => uid === player.uid)
      .map(([documentId]) => currentPartyCharacters().find((entry) => entry.identity.id === documentId)?.identity.name ?? documentId);
    row.append(
      Object.assign(document.createElement('span'), { className: 'players-name', textContent: (player.name || player.uid).toUpperCase() }),
      Object.assign(document.createElement('span'), { className: 'players-plays', textContent: plays.length ? plays.join(', ').toUpperCase() : 'NO CHARACTER' }),
      makePortButton('REMOVE', () => removeSeatedPlayer(player.uid))
    );
    row.title = player.uid;
    return row;
  });
  el.playersSeated.replaceChildren(...rows);
}

async function seatPlayerFromDialog() {
  try {
    const uid = el.playersUid.value.trim();
    const name = el.playersName.value.trim() || null;
    const characterId = el.playersCharacter.value;
    if (!uid) throw new Error('paste the account id the player read from their screen');
    if (!campaignIsPublished(campaignDocument)) throw new Error('publish the campaign first');
    await seatPlayer(campaignDocument.identity.id, uid, { name });
    if (characterId) {
      campaignDocument = setDocumentOwner(campaignDocument, { documentId: characterId, ownerUid: uid });
      persistCampaignState();
      // The ownership map is what the declaration rule reads, so it has to
      // reach Firestore before that player can act.
      const scene = activeEncounterAtCurrentSystem() ?? latestEncounterAtCurrentSystem();
      await publishCampaign(buildPublishedCampaign(campaignDocument, {
        publishedAt: Date.now(), currentEncounterId: scene?.identity.id ?? null
      }));
    }
    // Seated players get their sheet and log at once, not at the next
    // republish — a player who has just been seated is looking at the page.
    await publishPlayerDocuments();
    logActivity('SYSTEM', `${name || uid} seated at the table${characterId ? ' and assigned a character' : ''}.`);
    el.playersUid.value = '';
    el.playersName.value = '';
    setPlayersStatus('SEATED', 'ok');
    await refreshSeatedPlayers();
    render();
  } catch (error) {
    console.error(error);
    setPlayersStatus(error?.message ?? String(error), 'error');
  }
}

async function removeSeatedPlayer(uid) {
  try {
    await unseatPlayer(campaignDocument.identity.id, uid);
    // Their characters revert to the referee, and their own records go back
    // to unassigned so the lobby offers a seat elsewhere. Best effort: a
    // character seated by account id has no record to update.
    for (const [documentId, owner] of Object.entries(campaignDocument.ownership?.actors ?? {})) {
      if (owner !== uid) continue;
      campaignDocument = setDocumentOwner(campaignDocument, { documentId, ownerUid: '' });
      await setCharacterRecordWorldRemote(documentId, unassignedWorld()).catch(() => {});
    }
    persistCampaignState();
    await publishCampaign(buildPublishedCampaign(campaignDocument, { publishedAt: Date.now() }));
    logActivity('SYSTEM', `${uid} removed from the table; their characters revert to the referee.`);
    setPlayersStatus('REMOVED', 'ok');
    await refreshSeatedPlayers();
    render();
  } catch (error) {
    console.error(error);
    setPlayersStatus(error?.message ?? String(error), 'error');
  }
}

// v0.76.0: actors are folders you drag from. Dropped on a staged scene an
// actor is placed there and then follows the scene the way ADD CHARACTER
// always did; dropped on the combat setup dialog it fills the next open
// opponent or party slot the way the picker did — the same actions, reached
// by drag as well as by button, because a picker is still there for anyone
// who would rather click.
function directoryOwnerControl(item) {
  const owner = document.createElement('input');
  owner.className = 'directory-owner';
  owner.type = 'text';
  owner.value = item.ownerUid ?? '';
  owner.placeholder = 'REFEREE';
  owner.title = 'Account that plays this actor; blank means the referee runs it';
  owner.addEventListener('change', () => {
    try {
      campaignDocument = setDocumentOwner(campaignDocument, { documentId: item.id, ownerUid: owner.value.trim() });
      persistCampaignState();
      render();
    } catch (error) {
      console.error(error);
      setStatus(error?.message ?? String(error), 'error');
    }
  });
  return owner;
}

function directoryClaimButton(item) {
  const uid = currentUserId();
  if (!uid || item.ownerUid === uid) return null;
  const claim = makePortButton('ME', () => {
    try {
      campaignDocument = setDocumentOwner(campaignDocument, { documentId: item.id, ownerUid: uid });
      persistCampaignState();
      render();
    } catch (error) {
      console.error(error);
      setStatus(error?.message ?? String(error), 'error');
    }
  });
  claim.title = 'Assign this actor to the signed-in account';
  return claim;
}

function directoryDragPayload(item) {
  return JSON.stringify({ graycloakActor: item.kind, id: item.id });
}

function renderDirectoryFolders(container, entries, { emptyText, draggable = false } = {}) {
  const rows = [];
  if (!entries.length) {
    rows.push(Object.assign(document.createElement('div'), { className: 'directory-empty', textContent: emptyText }));
    container.replaceChildren(...rows);
    return;
  }
  for (const { folder, items } of directoryFolders(entries)) {
    const folderRow = document.createElement('div');
    folderRow.className = 'directory-folder';
    folderRow.textContent = `${folder.toUpperCase()} [${items.length}]`;
    rows.push(folderRow);
    for (const item of items) {
      const row = document.createElement('div');
      row.className = `directory-row kind-${item.kind}`;
      if (draggable) {
        row.draggable = true;
        row.classList.add('draggable');
        row.title = 'Drag onto a staged scene or the combat setup dialog to place';
        row.addEventListener('dragstart', (event) => { event.dataTransfer.setData('application/x-graycloak-actor', directoryDragPayload(item)); event.dataTransfer.effectAllowed = 'copy'; });
      }
      const name = document.createElement('span'); name.className = 'directory-name'; name.textContent = item.name.toUpperCase();
      const detail = document.createElement('span'); detail.className = 'directory-detail'; detail.textContent = item.detail.toUpperCase();
      row.append(name, detail);
      if (item.kind !== 'ship') { row.append(directoryOwnerControl(item)); const claim = directoryClaimButton(item); if (claim) row.append(claim); }
      rows.push(row);
    }
  }
  container.replaceChildren(...rows);
}

function renderCampaignDirectory() {
  if (!el.directoryActors) return;
  if (!campaignDocument) {
    el.directoryActors.replaceChildren();
    el.directoryVehicles.replaceChildren();
    return;
  }
  const directory = campaignDirectory(campaignDocument, {
    characters: currentPartyCharacters(),
    npcActors: npcActorDocuments,
    ships: shipDocument ? [shipDocument] : []
  });
  renderDirectoryFolders(el.directoryActors, directory.actors, { emptyText: 'NO CHARACTERS OR NPCS', draggable: true });
  renderDirectoryFolders(el.directoryVehicles, directory.vehicles, { emptyText: 'NO SHIP OR VEHICLE' });
  renderSceneDirectory();
}

// Reads what a drop carries, whichever panel dropped it: an actor id and
// whether it is a party character or a roster actor.
function readActorDrop(event) {
  const raw = event.dataTransfer?.getData('application/x-graycloak-actor');
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw);
    if (payload.graycloakActor === 'character') return { kind: 'character', actorId: payload.id, side: 'party' };
    if (payload.graycloakActor === 'npc') return { kind: 'npc', actorId: payload.id, side: 'opposition' };
    return null;
  } catch { return null; }
}

// --- v0.72.0: scenes in the directory, grouped by folder -------------------
function renderSceneDirectory() {
  if (!el.directoryScenes) return;
  const heading = document.createElement('div');
  heading.className = 'directory-heading';
  const title = document.createElement('span'); title.textContent = 'SCENES';
  heading.append(title, makePortButton('NEW SCENE', openSceneDialog));
  const rows = [heading];
  if (!sceneDocuments.length) {
    rows.push(Object.assign(document.createElement('div'), { className: 'directory-empty', textContent: 'NO SCENES YET / A FIGHT WITHOUT ONE IS SIZED TO ITSELF' }));
    el.directoryScenes.replaceChildren(...rows);
    return;
  }
  for (const { folder, scenes } of sceneFolders(sceneDocuments)) {
    const folderRow = document.createElement('div');
    folderRow.className = 'directory-folder';
    folderRow.textContent = folder.toUpperCase();
    rows.push(folderRow);
    for (const scene of scenes) {
      const row = document.createElement('div');
      row.className = `directory-row kind-scene${campaignDocument?.activeSceneId === scene.identity.id ? ' active' : ''}`;
      const name = document.createElement('span'); name.className = 'directory-name'; name.textContent = scene.identity.name.toUpperCase();
      const detail = document.createElement('span'); detail.className = 'directory-detail';
      detail.textContent = `${scene.board.squares} SQ / ${scene.board.metersPerSquare} M / ${sceneBoardMeters(scene)} M A SIDE${scene.tokens.length ? ` / ${scene.tokens.length} STAGED` : ''}`;
      row.append(name, detail);
      const active = campaignDocument?.activeSceneId === scene.identity.id;
      row.append(makePortButton(active ? 'ACTIVE' : 'ACTIVATE', () => setActiveScene(active ? null : scene.identity.id)));
      row.append(makePortButton('RENAME', () => renameScene(scene)));
      row.append(makePortButton('DELETE', () => deleteScene(scene)));
      rows.push(row);
    }
  }
  el.directoryScenes.replaceChildren(...rows);
}

// --- v0.74.0: staging on the active scene, and the combat tracker -------
// The Foundry shape: the referee activates a scene, everyone sees it, tokens
// are placed and walked about, and a fight begins only when the referee adds
// tokens to the tracker and presses START COMBAT.
let stagedSelectedTokenIds = new Set();
let framedSceneId = null;

function sceneActorNames() {
  const names = new Map();
  for (const character of currentPartyCharacters()) names.set(character.identity.id, { name: character.identity.name, actorType: 'pc', kind: 'pc' });
  for (const actor of npcActorDocuments) names.set(actor.identity.id, { name: actor.identity.name, actorType: actor.profile.actorType, kind: 'npc' });
  return names;
}

function publishedActiveScene() {
  const scene = activeScene();
  return scene ? buildPublishedScene(scene, { names: sceneActorNames() }) : null;
}

function updateScene(sceneId, mutate) {
  const index = sceneDocuments.findIndex((entry) => entry.identity.id === sceneId);
  if (index < 0) throw new Error('scene is unavailable');
  sceneDocuments[index] = mutate(sceneDocuments[index]);
  if (registry) registry.put(sceneDocuments[index]);
  persistCampaignState();
  return sceneDocuments[index];
}

function renderStagedScene(scene) {
  hideEncounterTokenOverlays();
  const board = encounterCanvas();
  board.setBoard(sceneBoardCells(scene));
  // v0.76.0: drag an actor from the ACTORS sidebar onto the board to place it,
  // at the square the pointer lands on.
  const viewport = el.encounterMapViewport;
  viewport.ondragover = (event) => { if (event.dataTransfer?.types.includes('application/x-graycloak-actor')) event.preventDefault(); };
  viewport.ondrop = (event) => {
    const dropped = readActorDrop(event);
    if (!dropped) return;
    event.preventDefault();
    if (scene.tokens.some((token) => token.actorId === dropped.actorId)) { setStatus('THAT ACTOR IS ALREADY ON THIS SCENE', 'error'); return; }
    const point = encounterMapPoint(event.clientX, event.clientY);
    const { cell } = encounterCanvas().metrics();
    const cells = sceneBoardCells(scene);
    const column = Math.max(0, Math.min(cells.columns - 1, Math.round(point.x / cell / scene.board.metersPerSquare) * scene.board.metersPerSquare));
    const row = Math.max(0, Math.min(cells.rows - 1, Math.round(point.y / cell / scene.board.metersPerSquare) * scene.board.metersPerSquare));
    const named = sceneActorNames().get(dropped.actorId);
    if (!named) { setStatus('ACTOR IS UNAVAILABLE', 'error'); return; }
    try {
      updateScene(scene.identity.id, (doc) => placeSceneToken(doc, { actorId: dropped.actorId, side: dropped.side, column, row, label: named.name.charAt(0).toUpperCase() }).scene);
      setStatus(`${named.name.toUpperCase()} PLACED ON THE SCENE`, 'ok');
      renderEncounter();
    } catch (error) { console.error(error); setStatus(error?.message ?? String(error), 'error'); }
  };
  const names = sceneActorNames();
  const tracked = new Set(trackedSceneTokens(scene).map((token) => token.id));
  const tokens = scene.tokens.map((token) => {
    const named = names.get(token.actorId) ?? { name: token.label || '?', actorType: 'npc' };
    return {
      id: token.id, column: token.position.column, row: token.position.row,
      side: token.side === 'party' ? 'party' : 'enemy',
      kind: named.actorType,
      shape: named.actorType === 'robot' ? 'square' : named.actorType === 'creature' ? 'diamond' : 'circle',
      label: token.label || named.name.charAt(0),
      ariaLabel: `${named.name}, ${token.side}, staged`,
      title: `${named.name} / ${token.side}${tracked.has(token.id) ? ' / IN COMBAT TRACKER' : ''}`,
      state: { selected: stagedSelectedTokenIds.has(token.id), targeted: tracked.has(token.id) },
      token, named
    };
  });
  if (framedSceneId !== scene.identity.id) { framedSceneId = scene.identity.id; board.camera.fit(); }
  board.render({
    tokens,
    decorate: (group, token) => {
      if (tracked.has(token.id)) { const mark = sceneSvgNode('text', { x: .4, y: -.32, class: 'encounter-token-condition-marker' }); mark.textContent = '\u2694'; group.append(mark); }
    },
    interaction: {
      canDrag: () => true,
      describe: (token, from, to) => ({ legal: 'legal', text: `STAGING / ${Number((Math.max(Math.abs(to.column - from.column), Math.abs(to.row - from.row)) / scene.board.metersPerSquare).toFixed(2))} SQ` }),
      onDrop: (token, to) => {
        try { updateScene(scene.identity.id, (doc) => moveSceneToken(doc, { tokenId: token.id, column: to.column, row: to.row })); renderEncounter(); }
        catch (error) { console.error(error); setStatus(error?.message ?? String(error), 'error'); renderEncounter(); }
      },
      onSelect: (token, event) => {
        if (event?.shiftKey) { if (stagedSelectedTokenIds.has(token.id)) stagedSelectedTokenIds.delete(token.id); else stagedSelectedTokenIds.add(token.id); }
        else stagedSelectedTokenIds = new Set(stagedSelectedTokenIds.has(token.id) && stagedSelectedTokenIds.size === 1 ? [] : [token.id]);
        renderEncounter();
      },
      onContextMenu: (token, event) => showStagedTokenMenu(event, scene, token),
      onHover: (token, event, entering) => {
        if (entering) { el.encounterTokenTooltip.textContent = `${token.named.name.toUpperCase()} // ${token.token.side.toUpperCase()} // STAGED${tracked.has(token.id) ? ' // IN COMBAT TRACKER' : ''}`; positionEncounterOverlay(el.encounterTokenTooltip, event); el.encounterTokenTooltip.hidden = false; }
        else el.encounterTokenTooltip.hidden = true;
      }
    }
  });
  renderEncounterRangePanel(null, null, null, null);
  el.encounterGridScale.value = String(scene.board.metersPerSquare);
  el.encounterGridScale.disabled = true;
  el.encounterGridLegend.textContent = `${scene.board.metersPerSquare} M SQUARES / ${sceneBoardMeters(scene)} M A SIDE / STAGING`;
  el.encounterSelectionStatus.textContent = `SCENE ${scene.identity.name.toUpperCase()} / STAGING / ${scene.tokens.length} TOKEN${scene.tokens.length === 1 ? '' : 'S'} / ${tracked.size} IN TRACKER`;
  renderSceneTracker(scene);
  el.encounterPartyRoster.replaceChildren();
  el.encounterRoster.replaceChildren();
  renderEncounterLighting(null);
}

function renderSceneTracker(scene) {
  const names = sceneActorNames();
  const tracked = trackedSceneTokens(scene);
  const heading = document.createElement('div');
  heading.className = 'encounter-roster-heading';
  heading.textContent = 'COMBAT TRACKER';
  const rows = tracked.map((token) => {
    const row = document.createElement('div');
    row.className = 'encounter-tracker-row';
    const name = document.createElement('span'); name.className = 'encounter-tracker-name';
    name.textContent = `${(names.get(token.actorId)?.name ?? token.label).toUpperCase()} / ${token.side.toUpperCase()}`;
    row.append(name, makePortButton('REMOVE', () => { updateScene(scene.identity.id, (doc) => setSceneTokenCombat(doc, token.id, false)); renderEncounter(); }));
    return row;
  });
  if (!rows.length) rows.push(Object.assign(document.createElement('div'), { className: 'directory-empty', textContent: 'RIGHT-CLICK A TOKEN / ADD TO COMBAT. START NEEDS ONE PARTY TOKEN AND ONE OTHER.' }));
  const selected = scene.tokens.filter((token) => stagedSelectedTokenIds.has(token.id) && !token.inCombat);
  const tools = document.createElement('div');
  tools.className = 'encounter-tracker-tools';
  if (selected.length) tools.append(makePortButton(`ADD SELECTED (${selected.length})`, () => { updateScene(scene.identity.id, (doc) => selected.reduce((acc, token) => setSceneTokenCombat(acc, token.id, true), doc)); renderEncounter(); }));
  if (tracked.length) tools.append(makePortButton('CLEAR TRACKER', () => { updateScene(scene.identity.id, clearSceneCombatTracker); renderEncounter(); }));
  el.encounterTracker.replaceChildren(heading, ...rows, tools);
  const canStart = tracked.some((token) => token.side === 'party') && tracked.some((token) => token.side !== 'party');
  const start = makePortButton('START COMBAT', () => startCombatFromScene(scene));
  start.disabled = !canStart;
  start.title = canStart ? 'Begin the fight with the tracked tokens where they stand' : 'Track at least one party token and one opponent first';
  const setup = makePortButton('MANUAL SETUP', openCombatSetupDialog);
  setup.title = 'The combat setup dialog: opponents by hand, without staging';
  el.encounterResolve.replaceChildren(start, setup);
}

function showStagedTokenMenu(event, scene, token) {
  event.preventDefault(); event.stopPropagation();
  const buttons = [];
  const add = (label, handler) => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = `[ ${label} ]`;
    button.addEventListener('click', () => { el.encounterTokenMenu.hidden = true; try { handler(); } catch (error) { console.error(error); setStatus(error?.message ?? String(error), 'error'); } });
    buttons.push(button);
  };
  add(token.token.inCombat ? 'REMOVE FROM COMBAT' : 'ADD TO COMBAT', () => { updateScene(scene.identity.id, (doc) => setSceneTokenCombat(doc, token.id, !token.token.inCombat)); renderEncounter(); });
  add(`SIDE: ${token.token.side.toUpperCase()} / CHANGE`, () => {
    const order = ['party', 'opposition', 'neutral'];
    const next = order[(order.indexOf(token.token.side) + 1) % order.length];
    updateScene(scene.identity.id, (doc) => { const copy = JSON.parse(JSON.stringify(doc)); copy.tokens.find((entry) => entry.id === token.id).side = next; return copy; });
    renderEncounter();
  });
  add('REMOVE FROM SCENE', () => { updateScene(scene.identity.id, (doc) => removeSceneToken(doc, token.id)); stagedSelectedTokenIds.delete(token.id); renderEncounter(); });
  el.encounterTokenTooltip.hidden = true;
  el.encounterTokenMenu.replaceChildren(...buttons);
  positionEncounterOverlay(el.encounterTokenMenu, event);
}

// Placement on a scene: any party character or roster NPC not already there.
function openScenePlacementDialog(sceneId, column, row) {
  const scene = sceneDocuments.find((entry) => entry.identity.id === sceneId);
  if (!scene) return;
  const present = new Set(scene.tokens.map((entry) => entry.actorId));
  const options = [];
  for (const character of currentPartyCharacters()) if (!present.has(character.identity.id)) options.push(new Option(`${character.identity.name} / party character`, `pc:${character.identity.id}`));
  for (const actor of npcActorDocuments) if (!actor.state.archived && !present.has(actor.identity.id)) options.push(new Option(`${actor.identity.name} / ${actor.profile.actorType} / ${actor.profile.bodyModel}`, `npc:${actor.identity.id}`));
  if (!options.length) return setStatus('EVERYONE IS ALREADY ON THIS SCENE', 'error');
  pendingEncounterPlacement = { sceneId, column, row };
  el.encounterPlacementActor.replaceChildren(...options);
  el.encounterPlacementSide.replaceChildren(new Option('Opposition', 'opposition'), new Option('Party', 'party'), new Option('Neutral', 'neutral'));
  el.encounterPlacementSide.value = options[0].value.startsWith('pc:') ? 'party' : 'opposition';
  el.encounterPlacementActor.addEventListener('change', () => { el.encounterPlacementSide.value = el.encounterPlacementActor.value.startsWith('pc:') ? 'party' : 'opposition'; }, { once: true });
  el.encounterPlacementPosition.textContent = `${column + 1},${row + 1}`;
  if (typeof el.encounterPlacementDialog.showModal === 'function') el.encounterPlacementDialog.showModal();
  else el.encounterPlacementDialog.setAttribute('open', '');
}

function placeActorOnScene() {
  const { sceneId, column, row } = pendingEncounterPlacement;
  const [kind, actorId] = el.encounterPlacementActor.value.split(':');
  const named = sceneActorNames().get(actorId);
  if (!named) throw new Error('actor is unavailable');
  updateScene(sceneId, (doc) => placeSceneToken(doc, { actorId, side: el.encounterPlacementSide.value, column, row, label: named.name.charAt(0).toUpperCase() }).scene);
  closeEncounterPlacementDialog();
  setStatus(`${named.name.toUpperCase()} PLACED ON THE SCENE`, 'ok');
  renderEncounter();
}

// The fight begins with the tracked tokens where they stand. The initial
// range is read off the closest party/opponent pair; surprise is rolled as
// in the setup dialog; the tracker is then cleared.
function startCombatFromScene(scene) {
  try {
    if (!campaignDocument || !gameplayDocument) throw new Error('an active campaign character is required');
    const tracked = trackedSceneTokens(scene);
    const partyIds = new Set(tracked.filter((token) => token.side === 'party').map((token) => token.actorId));
    const characters = currentPartyCharacters().filter((entry) => partyIds.has(entry.identity.id));
    if (!characters.length) throw new Error('track at least one party character');
    const foes = tracked.filter((token) => token.side !== 'party');
    const opponents = foes.map((token) => npcActorDocuments.find((actor) => actor.identity.id === token.actorId)).filter(Boolean).map(opponentSpecFromNpcActor);
    if (!opponents.length) throw new Error('track at least one opponent from the roster');
    const partyLoadouts = Object.fromEntries(characters.map((entry) => [entry.identity.id, { weaponKey: entry.loadout?.weaponKey ?? preferredPersonalWeapon(entry), armor: entry.loadout?.armor ?? 'none' }]));
    // Range from the closest pair on the board.
    let closest = Infinity;
    for (const pc of tracked.filter((token) => token.side === 'party')) for (const foe of foes) {
      closest = Math.min(closest, Math.max(Math.abs(pc.position.column - foe.position.column), Math.abs(pc.position.row - foe.position.row)));
    }
    const range = closest === 0 ? 'close' : closest <= 5 ? 'short' : closest <= 50 ? 'medium' : closest <= 250 ? 'long' : 'very-long';
    const date = campaignDateSnapshot();
    const encounterKey = `${campaignDocument.identity.id}|scene-${scene.identity.id}|${date.year}-${date.dayOfYear}|${encounterDocuments.length + 1}`;
    let encounter = createEncounterDocument({
      campaign: campaignDocument, scene, characters, partyLoadouts, opponents,
      title: `${scene.identity.name} / ${opponents.map((entry) => entry.name).join(' + ')}`,
      encounterKey, date, range, dice: seededDice(`${encounterKey}|surprise`)
    });
    if (encounter.surprise.surpriseSideId === 'opposition') {
      const result = resolveEncounterRound(encounter, { action: 'wait', date, dice: seededDice(`${encounter.identity.id}|round-1|surprise`) });
      encounter = result.encounter;
      for (const entry of result.entries) logActivity('COMBAT', entry.text);
    }
    encounterDocuments.push(encounter);
    campaignDocument = addEncounterToCampaign(campaignDocument, encounter);
    updateScene(scene.identity.id, clearSceneCombatTracker);
    stagedSelectedTokenIds = new Set();
    clearEncounterCanvasSelection();
    persistCampaignState();
    operationsDeskTab = 'encounter';
    logActivity('COMBAT', `${encounter.identity.title} begins on ${scene.identity.name} / ${range} range / surprise ${encounter.surprise.surpriseSideId ?? 'none'}`);
    setStatus(`COMBAT BEGINS ON ${scene.identity.name.toUpperCase()}`, 'ok');
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

// A player's walk about the staged scene.
function applyPlayerSceneMoves(entries) {
  const scene = activeScene();
  if (!scene || activeEncounterAtCurrentSystem()) return;
  let changed = false;
  for (const entry of entries.sort((a, b) => a.movedAt - b.movedAt)) {
    if (appliedMoveIds.has(entry.id)) continue;
    try {
      const move = authorizePlayerSceneMove(entry, { campaign: campaignDocument, scene });
      updateScene(scene.identity.id, (doc) => moveSceneToken(doc, { tokenId: move.tokenId, column: move.column, row: move.row }));
      appliedMoveIds.add(entry.id);
      changed = true;
    } catch (error) {
      appliedMoveIds.add(entry.id);
      console.warn('[traveller] player scene move refused:', error?.message ?? error);
      tellPlayer(entry.uid, `Your move was refused: ${error?.message ?? error}`);
    }
    clearTokenMove(campaignDocument.identity.id, scene.identity.id, entry.id).catch((error) => console.error(error));
  }
  if (changed) renderEncounter();
}

function setActiveScene(sceneId) {
  try {
    campaignDocument = setActiveCampaignScene(campaignDocument, sceneId);
    persistCampaignState();
    setStatus(sceneId ? `ACTIVE SCENE: ${sceneDocuments.find((entry) => entry.identity.id === sceneId)?.identity.name.toUpperCase() ?? sceneId}` : 'NO ACTIVE SCENE', 'ok');
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function renameScene(scene) {
  const name = window.prompt('Scene name:', scene.identity.name);
  if (name === null) return;
  const folder = window.prompt('Folder (a path such as Ports/Aster):', scene.folder);
  if (folder === null) return;
  try {
    const next = updateSceneDocument(scene, { name, folder });
    sceneDocuments = sceneDocuments.map((entry) => entry.identity.id === next.identity.id ? next : entry);
    if (registry) registry.put(next);
    persistCampaignState();
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function deleteScene(scene) {
  if (encounterDocuments.some((entry) => entry.sceneId === scene.identity.id)) {
    setStatus(`${scene.identity.name.toUpperCase()} HAS A FIGHT ON IT AND CANNOT BE DELETED`, 'error');
    return;
  }
  if (!window.confirm(`Delete the scene ${scene.identity.name}?`)) return;
  try {
    campaignDocument = removeSceneFromCampaign(campaignDocument, scene.identity.id);
    sceneDocuments = sceneDocuments.filter((entry) => entry.identity.id !== scene.identity.id);
    if (registry) registry.remove(scene.identity.id);
    persistCampaignState();
    logActivity('SYSTEM', `Scene ${scene.identity.name} deleted.`);
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function setSceneStatus(text, kind = '') {
  if (!el.sceneStatus) return;
  el.sceneStatus.textContent = text;
  el.sceneStatus.className = `players-status${kind ? ` ${kind}` : ''}`;
}

function updateSceneSizeNote() {
  const squares = Number.parseInt(el.sceneSquares.value, 10) || 0;
  const scale = Number.parseFloat(el.sceneScale.value) || 5;
  const meters = squares * scale;
  el.sceneSizeNote.textContent = meters > SCENE_MAX_METERS
    ? `${meters} M A SIDE / TOO LARGE (MAXIMUM ${SCENE_MAX_METERS} M)`
    : squares < SCENE_MIN_SQUARES ? `TOO SMALL (MINIMUM ${SCENE_MIN_SQUARES} SQUARES)` : `${meters} M A SIDE`;
}

function openSceneDialog() {
  if (!campaignDocument) { setStatus('A CAMPAIGN IS REQUIRED FOR SCENES', 'error'); return; }
  if (!el.sceneDialog) return;
  el.sceneName.value = '';
  el.sceneFolder.value = '';
  el.sceneSquares.value = '40';
  el.sceneScale.value = '5';
  el.sceneFolderList.replaceChildren(...[...new Set(sceneDocuments.map((entry) => entry.folder))].sort().map((folder) => new Option(folder)));
  setSceneStatus('');
  updateSceneSizeNote();
  el.sceneDialog.showModal();
  window.setTimeout(() => el.sceneName.focus(), 0);
}

function createSceneFromDialog() {
  try {
    const scene = createSceneDocument({
      campaignId: campaignDocument.identity.id,
      name: el.sceneName.value,
      folder: el.sceneFolder.value,
      squares: Number.parseInt(el.sceneSquares.value, 10),
      metersPerSquare: Number.parseFloat(el.sceneScale.value)
    });
    sceneDocuments.push(scene);
    if (registry) registry.put(scene);
    campaignDocument = addSceneToCampaign(campaignDocument, scene, { makeActive: !campaignDocument.activeSceneId });
    persistCampaignState();
    logActivity('SYSTEM', `Scene ${scene.identity.name} created / ${scene.board.squares} squares of ${scene.board.metersPerSquare} m in ${scene.folder}.`);
    el.sceneDialog.close();
    setStatus(`SCENE ${scene.identity.name.toUpperCase()} CREATED`, 'ok');
    render();
  } catch (error) {
    console.error(error);
    setSceneStatus(error?.message ?? String(error), 'error');
  }
}

function activeScene() {
  return sceneDocuments.find((entry) => entry.identity.id === campaignDocument?.activeSceneId) ?? null;
}

function renderRoster() {
  const available = Boolean(campaignDocument);
  el.rosterSection.dataset.available = available ? 'true' : 'false';
  el.rosterNewActor.disabled = !available;
  if (!available) { el.rosterFolders.replaceChildren(); applyOperationsDeskTab(); return; }
  const folders = campaignDocument.roster.folders.map((folder) => {
    const details = document.createElement('details'); details.className = 'roster-folder'; details.open = true;
    const summary = document.createElement('summary'); summary.textContent = `${folder.name} [${folder.actorIds.length}]`;
    const body = document.createElement('div'); body.className = 'roster-folder-body';
    const actors = folder.actorIds.map((id) => npcActorDocuments.find((entry) => entry.identity.id === id)).filter(Boolean);
    if (!actors.length) { const empty = document.createElement('span'); empty.className = 'empty'; empty.textContent = 'NO SAVED ACTORS.'; body.append(empty); }
    for (const actor of actors) {
      const card = document.createElement('article'); card.className = 'roster-card';
      const asset = assetForActor(actor);
      const portrait = asset ? document.createElement('img') : document.createElement('span');
      portrait.className = `roster-portrait${asset ? '' : ' roster-portrait-placeholder'}`;
      if (asset) { portrait.src = asset.dataUrl; portrait.alt = asset.altText || actor.identity.name; } else portrait.textContent = actor.identity.name.charAt(0).toUpperCase();
      const content = document.createElement('div');
      const name = document.createElement('span'); name.className = 'roster-card-name'; name.textContent = `${actor.identity.name.toUpperCase()} / ${actor.upp}`;
      const meta = document.createElement('span'); meta.className = 'roster-card-meta'; meta.textContent = `${actor.profile.actorType.toUpperCase()} / ${actor.profile.role || 'NO ROLE'} / ${actor.profile.bodyModel.toUpperCase()} / ${getPersonalWeapon(actor.loadout.weaponKey).name} / ${actor.loadout.armor.toUpperCase()}`;
      const description = document.createElement('span'); description.className = 'roster-card-description'; description.textContent = actor.presentation.description || 'No description.';
      const conditions = document.createElement('span'); conditions.className = `roster-card-conditions${activeNpcActorConditions(actor).length ? ' active' : ''}`; conditions.textContent = `CONDITION ${activeNpcActorConditions(actor).map((entry) => entry.toUpperCase().replaceAll('-', ' ')).join(' + ') || 'NONE'}`;
      const actions = document.createElement('span'); actions.className = 'roster-card-actions';
      const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'text-button'; edit.textContent = '[ EDIT ]'; edit.addEventListener('click', () => openNpcActorDialog(actor.identity.id));
      const combat = document.createElement('button'); combat.type = 'button'; combat.className = 'text-button'; combat.textContent = '[ ADD TO COMBAT ]'; combat.addEventListener('click', () => { openCombatSetupDialog(); addRosterActorToCombatSetup(actor.identity.id); });
      actions.append(edit, combat); content.append(name, meta, description, conditions, actions); card.append(portrait, content); body.append(card);
    }
    details.append(summary, body); return details;
  });
  el.rosterFolders.replaceChildren(...folders);
  applyOperationsDeskTab();
}

function addRosterActorToCombatSetup(actorId = el.combatRosterActor.value) {
  const actor = npcActorDocuments.find((entry) => entry.identity.id === actorId && !entry.state.archived);
  if (!actor) return;
  const groups = [...el.combatEnemyGroups.querySelectorAll('[data-enemy-group]')];
  const group = groups.length === 1 && groups[0].querySelector('[data-combat-field="name"]').value === 'Hostile' ? groups[0] : (() => { addCombatEnemyGroup(); return [...el.combatEnemyGroups.querySelectorAll('[data-enemy-group]')].at(-1); })();
  group.dataset.actorId = actor.identity.id;
  group.dataset.actorType = actor.profile.actorType;
  group.dataset.bodyModel = actor.profile.bodyModel;
  group.dataset.tokenLabel = actor.presentation.tokenLabel || actor.identity.name.charAt(0);
  group.dataset.conditions = JSON.stringify(activeNpcActorConditions(actor));
  const set = (name, value) => { group.querySelector(`[data-combat-field="${name}"]`).value = String(value); };
  set('name', actor.identity.name); set('count', 1); set('str', actor.characteristics.STR); set('dex', actor.characteristics.DEX); set('end', actor.characteristics.END); set('int', actor.characteristics.INT);
  const weapon = getPersonalWeapon(actor.loadout.weaponKey);
  set('weapon', actor.loadout.weaponKey); set('skill', Math.max(0, ...weapon.skillNames.map((name) => Number(actor.skills[name] ?? 0)))); set('armor', actor.loadout.armor);
  group.querySelector('[data-combat-field="count"]').disabled = true;
  relabelCombatEnemyGroups();
  setStatus(`ROSTER ACTOR ADDED TO COMBAT SETUP: ${actor.identity.name.toUpperCase()}`, 'ok');
}

// Dropping an actor on the combat setup dialog is the same as picking it in
// ADD ROSTER ACTOR / ADD CHARACTER — it fills the next slot, once.
function combatSetupDropZone() {
  const zone = el.combatSetupDialog;
  if (!zone || zone.dataset.dropWired) return;
  zone.dataset.dropWired = 'true';
  zone.addEventListener('dragover', (event) => { if (event.dataTransfer?.types.includes('application/x-graycloak-actor')) event.preventDefault(); });
  zone.addEventListener('drop', (event) => {
    const dropped = readActorDrop(event);
    if (!dropped) return;
    event.preventDefault();
    try {
      if (dropped.kind === 'character') { setStatus('EVERY PARTY CHARACTER IS ALREADY IN A MANUAL SETUP', 'ok'); return; }
      addRosterActorToCombatSetup(dropped.actorId);
    } catch (error) { console.error(error); setStatus(error?.message ?? String(error), 'error'); }
  });
}

function openCombatSetupDialog() {
  combatSetupDropZone();
  if (!campaignDocument || !gameplayDocument || !mappedCurrentSystem()) {
    setStatus('AN ACTIVE CHARACTER AT A MAPPED CAMPAIGN LOCATION IS REQUIRED', 'error');
    return;
  }
  const options = [new Option('-- SELECT SAVED NPC --', '')];
  for (const actor of npcActorDocuments.filter((entry) => !entry.state.archived)) options.push(new Option(`${actor.identity.name} / ${actor.profile.role || actor.profile.actorType}`, actor.identity.id));
  el.combatRosterActor.replaceChildren(...options);
  // v0.72.0: the fight may be on a scene; the active one is offered first.
  if (el.combatScene) {
    const sceneOptions = [new Option('SIZED TO THE FIGHT', '')];
    for (const { folder, scenes } of sceneFolders(sceneDocuments)) for (const scene of scenes) {
      sceneOptions.push(new Option(`${folder} / ${scene.identity.name} / ${sceneBoardMeters(scene)} M`, scene.identity.id));
    }
    el.combatScene.replaceChildren(...sceneOptions);
    el.combatScene.value = campaignDocument?.activeSceneId ?? '';
  }
  if (typeof el.combatSetupDialog.showModal === 'function') el.combatSetupDialog.showModal();
  else el.combatSetupDialog.setAttribute('open', '');
  window.setTimeout(() => el.combatEnemyName.focus(), 0);
}

function closeCombatSetupDialog() {
  if (typeof el.combatSetupDialog.close === 'function') el.combatSetupDialog.close();
  else el.combatSetupDialog.removeAttribute('open');
}

function setupInteger(input, label, minimum, maximum) {
  const value = Number.parseInt(input.value, 10);
  if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error(`${label} must be ${minimum}-${maximum}`);
  return value;
}

function relabelCombatEnemyGroups() {
  [...el.combatEnemyGroups.querySelectorAll('[data-enemy-group]')].forEach((group, index) => {
    group.querySelector('legend').textContent = `ENEMY TYPE ${index + 1}`;
  });
}

function addCombatEnemyGroup() {
  const groups = [...el.combatEnemyGroups.querySelectorAll('[data-enemy-group]')];
  if (groups.length >= 4) return setStatus('A MANUAL ENCOUNTER SUPPORTS UP TO FOUR ENEMY TYPES', 'error');
  const group = groups[0].cloneNode(true);
  delete group.dataset.actorId;
  delete group.dataset.actorType;
  delete group.dataset.bodyModel;
  delete group.dataset.tokenLabel;
  delete group.dataset.conditions;
  group.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
  group.querySelector('[data-combat-field="name"]').value = `Hostile Type ${groups.length + 1}`;
  group.querySelector('[data-combat-field="count"]').value = '1';
  group.querySelector('[data-combat-field="count"]').disabled = false;
  const header = document.createElement('div');
  header.className = 'combat-enemy-group-header';
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'text-button';
  remove.textContent = '[ REMOVE TYPE ]';
  remove.addEventListener('click', () => { group.remove(); relabelCombatEnemyGroups(); });
  header.append(remove);
  group.querySelector('.combat-setup-grid').before(header);
  el.combatEnemyGroups.append(group);
  relabelCombatEnemyGroups();
}

function combatEnemyGroupSpecs() {
  const groups = [...el.combatEnemyGroups.querySelectorAll('[data-enemy-group]')];
  const specs = groups.map((group, groupIndex) => {
    const field = (name) => group.querySelector(`[data-combat-field="${name}"]`);
    const baseName = field('name').value.trim();
    if (!baseName) throw new Error(`enemy type ${groupIndex + 1} name is required`);
    const count = setupInteger(field('count'), `enemy type ${groupIndex + 1} count`, 1, 8);
    const characteristics = {
      STR: setupInteger(field('str'), `enemy type ${groupIndex + 1} STR`, 1, 15),
      DEX: setupInteger(field('dex'), `enemy type ${groupIndex + 1} DEX`, 1, 15),
      END: setupInteger(field('end'), `enemy type ${groupIndex + 1} END`, 1, 15),
      INT: setupInteger(field('int'), `enemy type ${groupIndex + 1} INT`, 1, 15)
    };
    const weaponKey = field('weapon').value;
    const weapon = getPersonalWeapon(weaponKey);
    const skillLevel = setupInteger(field('skill'), `enemy type ${groupIndex + 1} weapon skill`, 0, 5);
    return {
      baseName, count,
      opponents: Array.from({ length: count }, (_, index) => ({
        actorId: group.dataset.actorId || null,
        actorType: group.dataset.actorType || 'npc',
        bodyModel: group.dataset.bodyModel || 'biological',
        tokenLabel: group.dataset.tokenLabel || baseName.charAt(0),
        conditions: group.dataset.conditions ? JSON.parse(group.dataset.conditions) : [],
        name: count === 1 ? baseName : `${baseName} ${index + 1}`,
        characteristics,
        skills: { [weapon.skillNames[0]]: skillLevel },
        weaponKey,
        armor: field('armor').value
      }))
    };
  });
  const total = groups.reduce((sum, group) => sum + setupInteger(group.querySelector('[data-combat-field="count"]'), 'enemy count', 1, 8), 0);
  if (total > 16) throw new Error('a manual encounter supports at most sixteen enemies total');
  return { groups: specs, opponents: specs.flatMap((entry) => entry.opponents), total };
}

function startManualEncounter() {
  if (!campaignDocument || !gameplayDocument) throw new Error('active campaign character is required');
  if (activeEncounterAtCurrentSystem()) throw new Error('resolve the active encounter before starting another');
  const setup = combatEnemyGroupSpecs();
  const date = campaignDateSnapshot();
  const manualNumber = encounterDocuments.filter((entry) => entry.situationId === null).length + 1;
  const encounterKey = `${campaignDocument.identity.id}|manual-${manualNumber}|${date.year}-${date.dayOfYear}`;
  const characters = currentPartyCharacters();
  const partyLoadouts = Object.fromEntries(characters.map((entry) => [entry.identity.id, {
    weaponKey: entry.loadout?.weaponKey ?? preferredPersonalWeapon(entry),
    armor: entry.loadout?.armor ?? 'none'
  }]));
  const typeTitle = setup.groups.map((entry) => entry.baseName).join(' + ');
  const scene = sceneDocuments.find((entry) => entry.identity.id === el.combatScene?.value) ?? null;
  let encounter = createEncounterDocument({
    campaign: campaignDocument,
    scene,
    characters,
    partyLoadouts,
    opponents: setup.opponents,
    title: `Manual Combat / ${scene ? `${scene.identity.name} / ` : ''}${typeTitle}`,
    encounterKey,
    date,
    range: el.combatStartingRange.value,
    metersPerSquare: el.combatMapScale.value === '' ? null : Number.parseFloat(el.combatMapScale.value),
    // The three Book 1 p.31 conditions the document cannot work out for itself.
    surpriseConditions: {
      party: { inAVehicle: el.combatPartyVehicle.checked, battleDress: el.combatPartyBattleDress.checked },
      opposition: {
        inAVehicle: el.combatEnemyVehicle.checked,
        battleDress: el.combatEnemyBattleDress.checked,
        pouncerAnimals: el.combatEnemyPouncer.checked
      }
    },
    dice: seededDice(`${encounterKey}|surprise`)
  });
  const surpriseWinner = encounter.surprise.surpriseSideId;
  if (surpriseWinner === 'opposition') {
    const result = resolveEncounterRound(encounter, {
      action: 'wait', date,
      dice: seededDice(`${encounter.identity.id}|round-1|surprise`)
    });
    encounter = result.encounter;
    for (const entry of result.entries) logActivity('COMBAT', entry.text);
  }
  encounterDocuments.push(encounter);
  campaignDocument = addEncounterToCampaign(campaignDocument, encounter);
  clearEncounterCanvasSelection();
  persistCampaignState();
  operationsDeskTab = 'encounter';
  closeCombatSetupDialog();
  logActivity('COMBAT', `${encounter.identity.title} started manually / ${characters.length} PC${characters.length === 1 ? '' : 's'} / ${setup.total} opponent${setup.total === 1 ? '' : 's'} in ${setup.groups.length} type${setup.groups.length === 1 ? '' : 's'} / ${encounter.range} range / surprise ${surpriseWinner ?? 'none'}`);
  setStatus(`MANUAL COMBAT STARTED: ${encounter.identity.title.toUpperCase()}`, encounter.status === 'defeat' ? 'error' : 'ok');
  render();
}

function resolveLinkedCombatSituation(encounter) {
  if (!encounter.situationId || encounter.status === 'active') return;
  const index = situationDocuments.findIndex((entry) => entry.identity.id === encounter.situationId && entry.status === 'active');
  if (index < 0) return;
  const success = ['victory', 'opposition-withdrew'].includes(encounter.status)
    ? true
    : encounter.status === 'defeat' ? false : null;
  const declined = ['escaped', 'avoided'].includes(encounter.status);
  const notes = {
    victory: 'The hostile encounter was overcome.',
    'opposition-withdrew': 'The opposition failed morale and withdrew.',
    defeat: 'The traveller was incapacitated in the encounter.',
    escaped: 'The traveller escaped the encounter.',
    avoided: 'Surprise allowed the traveller to avoid the encounter.'
  }[encounter.status] ?? `Encounter ended: ${encounter.status}.`;
  const resolved = resolveSituationDocument(situationDocuments[index], {
    date: campaignDateSnapshot(), success, declined, notes
  });
  situationDocuments[index] = resolved;
  applyResolvedSituationConsequences(resolved, { log: true });
  logActivity('SITUATION', `${resolved.identity.title} / ${resolved.status.toUpperCase()} / ${notes}`);
}

function startSituationEncounter(situation) {
  try {
    if (!campaignDocument || !gameplayDocument) throw new Error('active campaign character is required');
    const existing = encounterForSituation(situation.identity.id);
    if (existing) {
      operationsDeskTab = 'encounter';
      render();
      return;
    }
    const characters = currentPartyCharacters();
    const partyLoadouts = Object.fromEntries(characters.map((entry) => [entry.identity.id, {
      weaponKey: entry.loadout?.weaponKey ?? preferredPersonalWeapon(entry),
      armor: entry.loadout?.armor ?? 'none'
    }]));
    let encounter = createEncounterDocument({
      campaign: campaignDocument,
      situation,
      scene: activeScene(),
      characters,
      partyLoadouts,
      opponent: {
        name: situation.actor?.name ?? 'Hostile Contact'
      },
      date: campaignDateSnapshot(),
      range: 'medium',
      dice: seededDice(`${situation.provenance.eventKey}|personal-combat|surprise`)
    });
    const surpriseWinner = encounter.surprise.surpriseSideId;
    if (surpriseWinner === 'opposition') {
      const result = resolveEncounterRound(encounter, {
        action: 'wait', date: campaignDateSnapshot(),
        dice: seededDice(`${encounter.identity.id}|round-1|surprise`)
      });
      encounter = result.encounter;
      for (const entry of result.entries) logActivity('COMBAT', entry.text);
    }
    encounterDocuments.push(encounter);
    campaignDocument = addEncounterToCampaign(campaignDocument, encounter);
    clearEncounterCanvasSelection();
    resolveLinkedCombatSituation(encounter);
    syncCampaignRefs();
    persistCampaignState();
    operationsDeskTab = 'encounter';
    logActivity('COMBAT', `${encounter.identity.title} / ${encounter.range} range / surprise ${surpriseWinner ?? 'none'}`);
    setStatus(`ENCOUNTER ${encounter.status.toUpperCase()}: ${encounter.identity.title.toUpperCase()}`, encounter.status === 'defeat' ? 'error' : 'ok');
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

// Combat wounds live on the encounter combatant; this writes them back to the
// character and roster documents so the sheet, the header and a saved campaign
// all report the state the fight actually left people in.
function applyEncounterDocumentSync(encounter) {
  const result = synchronizeEncounterDocuments({
    encounter,
    characters: currentPartyCharacters(),
    npcActors: npcActorDocuments
  });
  if (!result.changes.length) return;
  const byId = new Map(result.characters.map((entry) => [entry.identity.id, entry]));
  partyCharacterDocuments = partyCharacterDocuments.map((entry) => byId.get(entry.identity.id) ?? entry);
  if (gameplayDocument && byId.has(gameplayDocument.identity.id)) gameplayDocument = byId.get(gameplayDocument.identity.id);
  npcActorDocuments = result.npcActors;
  for (const change of result.changes) {
    if (change.documentKind !== 'character') continue;
    const before = change.before.current;
    const after = change.after.current;
    const moved = ['STR', 'DEX', 'END'].filter((key) => before[key] !== after[key])
      .map((key) => `${key} ${before[key]}->${after[key]}`).join(' / ');
    logActivity('CHAR', `${change.name} carries combat wounds off the field: ${moved || 'status change'} / ${change.after.alive ? change.after.consciousness.toUpperCase() : 'DEAD'}.`);
  }
}

// Declaring no longer resolves: the referee sets orders for whoever matters,
// looks at the board, and commits with RESOLVE ROUND.
function endActiveEncounter() {
  try {
    const active = activeEncounterAtCurrentSystem();
    if (!active) throw new Error('no active personal encounter');
    const index = encounterDocuments.findIndex((entry) => entry.identity.id === active.identity.id);
    const result = endEncounterByReferee(active, { date: campaignDateSnapshot() });
    encounterDocuments[index] = result.encounter;
    encounterExtraTargetIds = new Set();
    clearEncounterCanvasSelection();
    logActivity('COMBAT', result.entry.text);
    applyEncounterDocumentSync(result.encounter);
    resolveLinkedCombatSituation(result.encounter);
    syncCampaignRefs();
    persistCampaignState();
    autoPublishEncounterView(result.encounter);
    setStatus(`ENCOUNTER ${result.encounter.status.toUpperCase()}`, 'ok');
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

// Combatants on auto declare through declareEncounterAction, exactly as a
// referee click or a player's would, so automation is a source of intents
// rather than a second path through the resolver.
function applyNpcDeclarations(encounter) {
  let next = encounter;
  for (const declaration of pendingNpcDeclarations(encounter)) {
    try {
      next = declareEncounterAction(next, {
        action: declaration.action, modifier: declaration.modifier,
        actorId: declaration.actorId, targetId: declaration.targetId
      }).encounter;
      const actor = next.combatants.find((entry) => entry.id === declaration.actorId);
      logActivity('COMBAT', `${actor?.name ?? 'Combatant'} (auto) declares ${declaration.action.toUpperCase()}: ${declaration.reason}.`);
    } catch (error) {
      console.error(error);
    }
  }
  return next;
}

function resolveDeclaredEncounterRound() {
  try {
    const started = activeEncounterAtCurrentSystem();
    if (!started) throw new Error('no active personal encounter');
    const active = applyNpcDeclarations(started);
    const index = encounterDocuments.findIndex((entry) => entry.identity.id === active.identity.id);
    const result = resolveDeclaredRound(active, {
      date: campaignDateSnapshot(),
      dice: seededDice(`${active.identity.id}|round-${active.round}|resolve`)
    });
    encounterDocuments[index] = result.encounter;
    encounterExtraTargetIds = new Set();
    if (result.encounter.status !== 'active') clearEncounterCanvasSelection();
    if (campaignDocument) campaignDocument = advanceCampaignSeconds(campaignDocument, COMBAT_ROUND_SECONDS);
    for (const entry of result.entries) logActivity('COMBAT', entry.text);
    applyEncounterDocumentSync(result.encounter);
    resolveLinkedCombatSituation(result.encounter);
    syncCampaignRefs();
    persistCampaignState();
    autoPublishEncounterView(result.encounter);
    // The round is over, so the declarations belonging to it are spent.
    if (campaignIsPublished(campaignDocument) && currentUserId()) {
      clearDeclarations(campaignDocument.identity.id, result.encounter.identity.id).catch((error) => console.error(error));
    }
    setStatus(`ENCOUNTER ${result.encounter.status.toUpperCase()} / ROUND ${result.encounter.round}`, result.encounter.status === 'defeat' ? 'error' : 'ok');
    closeRollDialog();
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function resolveActiveEncounterAction(action, modifier = 0, targetId = null, actorId = null) {
  try {
    const active = activeEncounterAtCurrentSystem();
    if (!active) throw new Error('no active personal encounter');
    const index = encounterDocuments.findIndex((entry) => entry.identity.id === active.identity.id);
    const result = declareEncounterAction(active, {
      action, modifier, actorId: actorId ?? selectedEncounterActor(active)?.id ?? null, targetId
    });
    encounterDocuments[index] = result.encounter;
    const target = result.declaration.targetId
      ? result.encounter.combatants.find((entry) => entry.id === result.declaration.targetId)
      : null;
    const actorName = result.encounter.combatants.find((entry) => entry.id === result.declaration.actorId)?.name ?? 'combatant';
    syncCampaignRefs();
    persistCampaignState();
    // Selection moves on to the next combatant still without orders.
    setStatus(`${actorName.toUpperCase()} DECLARES ${action.toUpperCase()}${target ? ` → ${target.name.toUpperCase()}` : ''} / ${result.awaitingActorIds.length} UNDECLARED`, 'ok');
    closeRollDialog();
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}


function avoidActiveEncounter() {
  try {
    const active = activeEncounterAtCurrentSystem();
    if (!active) throw new Error('no active personal encounter');
    const index = encounterDocuments.findIndex((entry) => entry.identity.id === active.identity.id);
    const resolved = avoidEncounter(active, { date: campaignDateSnapshot() });
    encounterDocuments[index] = resolved;
    clearEncounterCanvasSelection();
    logActivity('COMBAT', resolved.history.at(-1).text);
    resolveLinkedCombatSituation(resolved);
    persistCampaignState();
    setStatus('ENCOUNTER AVOIDED', 'ok');
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function openEncounterAttackDialog(encounter) {
  const player = selectedEncounterActor(encounter);
  const target = selectedEncounterTarget(encounter);
  if (!player || !target) {
    setStatus('SELECT AN ACTIVE PARTY ACTOR AND ENEMY TARGET', 'error');
    return;
  }
  openRollDialog({
    kind: 'encounter-attack',
    title: `ATTACK ${target.name.toUpperCase()} // ${player.name.toUpperCase()}`,
    basis: `PERSONAL COMBAT // ROUND ${encounter.round} // ${encounterPairRange(player, target).toUpperCase().replace('-', ' ')} RANGE\nWeapon, skill, characteristic, armor, range, lighting, cover and folding stock are built into the combat throw. MODIFIER is anything beyond them.`,
    target: 8, targetLocked: true, actorId: player.id, targetId: target.id,
    builtInText: `${player.weaponKey.toUpperCase().replaceAll('-', ' ')} / ${target.armor.toUpperCase()} / TABLE TARGET`
  });
  el.rollTargetRow.hidden = true;
}

function renderEncounter() {
  const current = mappedCurrentSystem();
  if (!campaignDocument || !current || !gameplayDocument) {
    el.encounterRailSection.dataset.available = 'false';
    el.encounterDetails.hidden = true;
    el.encounterRecord.textContent = '';
    renderEncounterMap(null);
    applyOperationsDeskTab();
    return;
  }
  el.encounterRailSection.dataset.available = 'true';
  const active = activeEncounterAtCurrentSystem();
  const displayed = active ?? latestEncounterAtCurrentSystem();
  el.encounterDetails.hidden = !displayed;
  renderEncounterHistory(displayed);
  renderEncounterMap(displayed);
  el.operationsTabEncounter?.classList.toggle('attention', Boolean(active));
  if (el.operationsTabEncounter) el.operationsTabEncounter.textContent = 'COMBAT';
  applyOperationsDeskTab();
}

function renderSituations() {
  const current = mappedCurrentSystem();
  if (!campaignDocument || !current || !shipDocument || !gameplayDocument) {
    el.situationSection.dataset.available = 'false';
    el.situationSection.hidden = true;
    el.situationRecord.textContent = '';
    el.situationActions.replaceChildren();
    el.operationsTabSituation?.classList.remove('attention');
    applyOperationsDeskTab();
    return;
  }

  el.situationSection.dataset.available = 'true';
  el.situationSection.hidden = false;
  el.situationRecord.textContent = buildSituationRecord({ system: current, situations: situationDocuments });
  el.situationActions.replaceChildren();
  const active = activeSituationAtCurrentSystem();
  el.operationsTabSituation?.classList.toggle('attention', Boolean(active));
  if (el.operationsTabSituation) el.operationsTabSituation.textContent = 'SITUATION';

  if (active) {
    for (const choice of active.choices) {
      const button = makePortButton(choice.label, () => resolveSituationChoice(active.identity.id, choice.id));
      if (choice.action === 'skill-check') {
        const level = Number(gameplayDocument.skills?.[choice.skillName] ?? 0);
        button.title = `${choice.skillName}-${level} / target ${choice.target}+ / Graycloak referee check generalized from Book 1 Electronics guidance`;
      }
      el.situationActions.append(button);
    }
    if (!active.choices.length) {
      const linked = encounterForSituation(active.identity.id);
      el.situationActions.append(makePortButton(linked ? 'OPEN ENCOUNTER' : 'BEGIN ENCOUNTER', () => {
        if (linked) { operationsDeskTab = 'encounter'; render(); }
        else startSituationEncounter(active);
      }));
    }
  } else {
    const patronKey = currentPatronEventKey();
    if (patronKey && !situationForEventKey(patronKey)) {
      const button = makePortButton('SEEK PATRON', seekPatron);
      button.title = 'Book 3 patron table / Graycloak once-per-port-call cadence';
      el.situationActions.append(button);
    } else {
      const note = document.createElement('span');
      note.className = 'commerce-note';
      note.textContent = patronKey ? 'PATRON CONTACT ALREADY CHECKED THIS PORT CALL.' : 'NO PATRON CHECK AVAILABLE.';
      el.situationActions.append(note);
    }
  }
  applyOperationsDeskTab();
  renderCampaignHeader();
  applyCampaignLayout();
}

function applyOperationsDeskTab() {
  const panels = {
    port: el.portServicesSection,
    trade: el.commerceSection,
    jobs: el.contractSection,
    situation: el.situationSection,
    roster: el.rosterSection
  };
  const tabs = {
    port: el.operationsTabPort,
    trade: el.operationsTabTrade,
    jobs: el.operationsTabJobs,
    roster: el.operationsTabRoster
  };
  // Situations and combat are takeovers, not tabs: they hold the context panel
  // only while something is active, then fall back to WORLD.
  if (operationsDeskTab === 'situation' && !activeSituationAtCurrentSystem()) operationsDeskTab = 'port';
  if (operationsDeskTab === 'encounter' && !activeEncounterAtCurrentSystem() && !latestEncounterAtCurrentSystem()) operationsDeskTab = 'port';
  const encounterWorkspaceActive = operationsDeskTab === 'encounter' && el.encounterRailSection?.dataset.available === 'true';
  const situationTakeover = operationsDeskTab === 'situation' && panels.situation?.dataset.available === 'true';
  for (const [key, panel] of Object.entries(panels)) {
    const available = panel?.dataset.available === 'true';
    if (panel) panel.hidden = key !== operationsDeskTab || !available;
  }
  // The combat rail belongs to the COMBAT scene: the map is the scene, the DM
  // panel and rosters are its rail, so the two show and hide together.
  // v0.75.0: the combat rail is the COMBAT sidebar tab; the port panels are
  // the PORT tab. Nothing hides the other any more — a tab is a tab.
  const combatRailVisible = Boolean(campaignPlayActive() && el.encounterRailSection?.dataset.available === 'true');
  if (el.encounterRailSection) el.encounterRailSection.hidden = !combatRailVisible;
  if (encounterWorkspaceActive && sidebarTab !== 'combat' && !sidebarChosen) setSidebarTab('combat', { chosen: false });
  // While combat holds the rail, the character strip and SHIP STATUS collapse
  // to one line each: identity and wounds still matter mid-firefight, fuel and
  // cargo do not, and the rosters need the room.
  el.terminal?.classList.toggle('combat-focus', combatRailVisible);
  // The encounter panel lives in the scene; while combat is active the context
  // panel shows the situation/roster only if selected, otherwise the takeover bar.
  for (const [key, tab] of Object.entries(tabs)) tab?.setAttribute('aria-selected', key === operationsDeskTab ? 'true' : 'false');
  const takeover = encounterWorkspaceActive || situationTakeover;
  if (el.contextTakeover) {
    el.contextTakeover.hidden = !situationTakeover || !campaignPlayActive();
    el.contextTakeover.textContent = 'SITUATION · RESOLVE IT OR RETURN TO PORT · [ BACK TO PORT ]';
  }
  el.contextTabs?.classList.toggle('suspended', takeover);
  el.subsectorSection?.classList.remove('encounter-workspace-active', 'navigation-workspace-active');
  // A live encounter pulls the scene to COMBAT; leaving COMBAT is the
  // referee's own tab choice, so nothing drags the scene back to SYSTEM.
  if (encounterWorkspaceActive && activeSceneTab !== 'combat') {
    activeSceneTab = 'combat';
    applyCampaignLayout();
  }
}

function setOperationsDeskTab(tab) {
  if (!['port', 'trade', 'jobs', 'situation', 'encounter', 'roster'].includes(tab)) return;
  operationsDeskTab = tab;
  applyOperationsDeskTab();
}

function renderPortServices() {
  if (!campaignDocument) {
    el.portServicesSection.dataset.available = 'false';
    el.portServicesSection.hidden = true;
    el.portServicesRecord.textContent = '';
    el.portActions.replaceChildren();
    applyOperationsDeskTab();
    return;
  }
  const system = mappedCurrentSystem();
  if (!system) {
    el.portServicesSection.dataset.available = 'false';
    el.portServicesSection.hidden = true;
    el.portServicesRecord.textContent = '';
    el.portActions.replaceChildren();
    applyOperationsDeskTab();
    return;
  }

  el.portServicesSection.dataset.available = 'true';
  el.portServicesSection.hidden = false;
  renderPanelModel(el.portServicesRecord, buildPortServicesPanel({
    system,
    ship: shipDocument,
    character: gameplayDocument
  }));
  el.portActions.replaceChildren();

  if (!shipDocument) {
    const text = document.createElement('span');
    text.className = 'empty';
    text.textContent = 'LOAD OR ASSIGN AN ACTIVE SHIP FOR PORT OPERATIONS.';
    el.portActions.append(text);
    applyOperationsDeskTab();
    return;
  }

  if (gameplayDocument) {
    const transfer = document.createElement('span');
    transfer.className = 'port-transfer';
    const label = document.createElement('label');
    label.htmlFor = 'ship-transfer-amount';
    label.textContent = 'TRANSFER Cr';
    const input = document.createElement('input');
    input.id = 'ship-transfer-amount';
    input.type = 'number';
    input.min = '1';
    input.max = String(gameplayDocument.finances.credits);
    input.step = '1';
    input.value = String(Math.min(5000, Math.max(0, gameplayDocument.finances.credits)));
    transfer.append(label, input, makePortButton('TRANSFER TO SHIP', transferFundsToShip, {
      disabled: gameplayDocument.finances.credits <= 0
    }));
    el.portActions.append(transfer);
  }

  const service = currentPortFuelService();
  const capacity = shipDocument.specifications.fuel.capacityTons;
  const currentFuel = Number.isFinite(shipDocument.state.currentFuelTons) ? shipDocument.state.currentFuelTons : 0;
  const missingFuel = Math.max(0, capacity - currentFuel);
  if (service?.available && missingFuel > 0) {
    if (service.freeScoutFuel) {
      el.portActions.append(makePortButton('REFUEL TO FULL / FREE', refuelAtCurrentPort));
    } else {
      const purchase = document.createElement('span');
      purchase.className = 'port-transfer fuel-purchase';

      const label = document.createElement('label');
      label.htmlFor = 'ship-fuel-tons';
      label.textContent = `FUEL t / ${formatCr(service.pricePerTonCr)} PER TON`;

      const input = document.createElement('input');
      input.id = 'ship-fuel-tons';
      input.type = 'number';
      input.min = '1';
      input.max = String(Math.floor(missingFuel));
      input.step = '1';

      const balanceCr = shipDocument.state.finances.balanceCr;
      const maximumAffordableTons = Math.floor(balanceCr / service.pricePerTonCr);
      const defaultTons = Math.max(1, Math.min(Math.floor(missingFuel), maximumAffordableTons || 1));
      input.value = String(defaultTons);

      const button = makePortButton('BUY FUEL', buyFuelAtCurrentPort);
      const updateFuelPurchaseButton = () => {
        const tons = Number.parseInt(input.value || '0', 10);
        const validQuantity = Number.isInteger(tons) && tons >= 1 && tons <= missingFuel;
        const costCr = validQuantity ? Math.round(tons * service.pricePerTonCr) : 0;
        button.textContent = validQuantity
          ? `[ BUY ${tons}t / ${formatCr(costCr)} ]`
          : '[ BUY FUEL ]';
        button.disabled = !validQuantity || costCr > balanceCr;
        if (!validQuantity) {
          button.title = `Enter 1 to ${Math.floor(missingFuel)} tons.`;
        } else if (costCr > balanceCr) {
          button.title = `Ship operating account has ${formatCr(balanceCr)}; transfer funds or buy fewer tons.`;
        } else {
          button.title = `${service.quality.toUpperCase()} fuel / ${service.source}`;
        }
      };
      input.addEventListener('input', updateFuelPurchaseButton);
      updateFuelPurchaseButton();

      purchase.append(label, input, button);
      el.portActions.append(purchase);
    }
  } else if (service && !service.available && missingFuel > 0) {
    const note = document.createElement('span');
    note.className = 'commerce-note';
    note.textContent = system.gasGiant
      ? 'STARPORT FUEL UNAVAILABLE / GAS GIANT SKIM AVAILABLE.'
      : 'STARPORT FUEL UNAVAILABLE.';
    el.portActions.append(note);
  }

  const portCall = currentBerthingDue();
  if (portCall && !portCall.berthingPaid && portCall.berthingDueCr > 0) {
    el.portActions.append(makePortButton(`PAY BERTHING / ${formatCr(portCall.berthingDueCr)}`, payBerthingAtCurrentPort, {
      disabled: portCall.berthingDueCr > shipDocument.state.finances.balanceCr
    }));
  }

  if (system.gasGiant && shipDocument.specifications.hull.streamlined && missingFuel > 0) {
    el.portActions.append(makePortButton('SKIM GAS GIANT / +7 DAYS', skimCurrentGasGiant, {
      disabled: currentBerthingBlocksDeparture()
    }));
  }

  applyOperationsDeskTab();
}

function renderRecordWithHighlights(target, text, attentionPrefixes = []) {
  target.replaceChildren();
  const lines = String(text ?? '').split('\n');
  lines.forEach((line, index) => {
    const highlighted = attentionPrefixes.some((prefix) => line.trimStart().startsWith(prefix));
    if (highlighted) {
      const span = document.createElement('span');
      span.className = 'record-attention';
      span.textContent = line;
      target.append(span);
    } else {
      target.append(document.createTextNode(line));
    }
    if (index < lines.length - 1) target.append(document.createTextNode('\n'));
  });
}

function renderPanelRow(row) {
  const el2 = document.createElement('div');
  el2.className = `panel-row${row.attention ? ' attention' : ''}${row.ok ? ' ok' : ''}`;
  if (row.title) el2.title = row.title;
  const label = document.createElement('span');
  label.className = 'panel-row-label';
  label.textContent = row.label;
  const value = document.createElement('span');
  value.className = 'panel-row-value';
  value.textContent = row.value;
  el2.append(label, value);
  return el2;
}

function renderPanelCard(card, onAction) {
  const wrap = document.createElement('div');
  wrap.className = `panel-card${card.attention ? ' attention' : ''}`;
  const title = document.createElement('div');
  title.className = 'panel-card-title';
  title.textContent = card.title;
  wrap.append(title);
  if (card.meta) {
    const meta = document.createElement('div');
    meta.className = 'panel-card-meta';
    meta.textContent = card.meta;
    wrap.append(meta);
  }
  for (const row of card.rows ?? []) wrap.append(renderPanelRow(row));
  if (card.note) {
    const note = document.createElement('div');
    note.className = 'panel-card-note';
    note.textContent = card.note;
    wrap.append(note);
  }
  if (card.actionId && onAction) {
    const actions = document.createElement('div');
    actions.className = 'panel-card-actions';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'text-button action-button panel-card-action';
    button.textContent = card.actionLabel || '[ ACCEPT ]';
    button.disabled = Boolean(card.actionDisabled);
    if (card.actionTitle) button.title = card.actionTitle;
    button.addEventListener('click', () => onAction(card.actionId));
    actions.append(button);
    if (card.secondaryActionId) {
      const secondary = document.createElement('button');
      secondary.type = 'button';
      secondary.className = 'text-button panel-card-action panel-card-action-secondary';
      secondary.textContent = card.secondaryActionLabel || '[ DECLINE ]';
      secondary.addEventListener('click', () => onAction(card.secondaryActionId));
      actions.append(secondary);
    }
    wrap.append(actions);
  }
  return wrap;
}

function renderPanelModel(target, model, { onAction = null } = {}) {
  target.replaceChildren();
  for (const group of model?.groups ?? []) {
    const section = document.createElement('div');
    section.className = 'panel-group';
    if (group.label) {
      const label = document.createElement('div');
      label.className = 'panel-group-label';
      label.textContent = group.label;
      section.append(label);
    }
    if (group.note) {
      const note = document.createElement('div');
      note.className = 'panel-group-note';
      note.textContent = group.note;
      section.append(note);
    }
    const body = document.createElement('div');
    body.className = 'panel-group-body';
    for (const item of group.items ?? []) {
      body.append(item.kind === 'card' ? renderPanelCard(item, onAction) : renderPanelRow(item));
    }
    if (group.collapsible) {
      const details = document.createElement('details');
      details.className = 'panel-group-collapsible';
      const summary = document.createElement('summary');
      summary.textContent = 'SHOW';
      details.append(summary, body);
      section.append(details);
    } else {
      section.append(body);
    }
    target.append(section);
  }
}

function appendLiveShipRow(labelText, valueText, { stateClass = '', tab = null, title = '' } = {}) {
  const row = document.createElement('div');
  row.className = `live-ship-row${stateClass ? ` ${stateClass}` : ''}`;
  if (title) row.title = title;
  const label = document.createElement('span');
  label.className = 'live-ship-label';
  label.textContent = labelText;
  const value = document.createElement('span');
  value.className = 'live-ship-value';
  value.textContent = valueText;
  row.append(label, value);
  if (tab) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'text-button live-ship-link';
    button.textContent = `[ ${tab.toUpperCase()} ]`;
    button.addEventListener('click', () => setOperationsDeskTab(tab));
    row.append(button);
  }
  el.liveShipStatus.append(row);
  return row;
}

function renderLiveShipStatus({ currentSystem = null, selectedSystem = null, distance = null, fuelCheck = null } = {}) {
  el.liveShipStatus.replaceChildren();
  if (!shipDocument) {
    el.liveShipIdentity.textContent = 'NO ACTIVE SHIP';
    appendLiveShipRow('STATUS', 'LOAD OR ASSIGN A SHIP');
    return;
  }

  const shipName = shipDocument.identity.name || 'UNNAMED SHIP';
  const registry = shipDocument.identity.registry || '--';
  el.liveShipIdentity.textContent = `${shipName.toUpperCase()} / ${registry}`;

  appendLiveShipRow('TYPE', `${shipDocument.design.typeCode} ${shipDocument.design.name.toUpperCase()} / JUMP-${shipDocument.specifications.drives.jump.rating}`);

  const fuelCapacity = shipDocument.specifications.fuel.capacityTons;
  const fuelAboard = Number.isFinite(shipDocument.state.currentFuelTons) ? shipDocument.state.currentFuelTons : null;
  const fuelService = currentSystem ? currentPortFuelService() : null;
  const gasGiantFuel = Boolean(currentSystem?.gasGiant && shipDocument.specifications.hull.streamlined);
  const localFuelSource = Boolean(fuelService?.available || gasGiantFuel);
  let fuelStateClass = '';
  let fuelTitle = 'Select a destination to compare fuel aboard with jump requirement.';
  if (fuelAboard === null) {
    fuelStateClass = 'live-state-attention';
    fuelTitle = 'Fuel state is unrecorded.';
  } else if (fuelCheck) {
    if (fuelCheck.allowed) {
      fuelStateClass = 'live-state-ready';
      fuelTitle = `Enough fuel for the selected ${distance}-parsec jump.`;
    } else if (localFuelSource) {
      fuelStateClass = 'live-state-attention';
      fuelTitle = 'Insufficient fuel for the selected jump; fuel is obtainable in the current system.';
    } else {
      fuelStateClass = 'live-state-critical';
      fuelTitle = 'Insufficient fuel for the selected jump and no local refueling source is available.';
    }
  }
  const fuelText = `${fuelAboard === null ? 'UNRECORDED' : `${fuelAboard}t`} / ${fuelCapacity}t`;
  appendLiveShipRow('FUEL', fuelText, { stateClass: fuelStateClass, tab: 'port', title: fuelTitle });
  if (fuelCheck && selectedSystem) {
    const required = fuelCheck.requirement?.totalTons ?? null;
    const shortage = Number.isFinite(required) && Number.isFinite(fuelAboard) ? Math.max(0, required - fuelAboard) : null;
    appendLiveShipRow('JUMP NEED', `${required ?? '--'}t -> ${selectedSystem.name.toUpperCase()}${shortage > 0 ? ` / SHORT ${shortage}t` : ''}`, {
      stateClass: shortage > 0 ? fuelStateClass : 'live-state-ready'
    });
  } else {
    appendLiveShipRow('JUMP NEED', selectedSystem && currentSystem && selectedSystem.id === currentSystem.id ? 'CURRENT SYSTEM' : 'SELECT DESTINATION');
  }

  const cargoCapacity = shipDocument.specifications.cargo.capacityTons;
  const cargoUsed = shipDocument.state.cargoUsedTons;
  appendLiveShipRow('CARGO', `${cargoUsed}/${cargoCapacity}t${cargoUsed >= cargoCapacity ? ' / FULL' : ''}`, {
    stateClass: cargoUsed >= cargoCapacity ? 'live-state-attention' : '',
    tab: 'trade'
  });
  for (const cargo of shipDocument.state.cargoManifest.slice(0, 3)) {
    const destination = cargo.destinationSystemId ? getSubsectorSystem(FAR_MERIDIAN_SUBSECTOR, cargo.destinationSystemId) : null;
    appendLiveShipRow('  ABOARD', `${cargo.tons}t ${cargo.description.toUpperCase()}${destination ? ` -> ${destination.name.toUpperCase()}` : ''}`);
  }

  const crewPeople = new Set(shipDocument.crew.assignments.map((entry) => entry.characterId)).size;
  const passengerCapacity = Math.max(0, shipDocument.specifications.accommodations.staterooms - crewPeople);
  const cabinPassengers = shipDocument.state.passengerManifest.filter((entry) => entry.class === 'high' || entry.class === 'middle');
  const lowPassengers = shipDocument.state.passengerManifest.filter((entry) => entry.class === 'low');
  const lowCapacity = shipDocument.specifications.accommodations.lowBerths;
  const passengerFull = (passengerCapacity > 0 && cabinPassengers.length >= passengerCapacity)
    || (lowCapacity > 0 && lowPassengers.length >= lowCapacity);
  const passengerText = `${cabinPassengers.length}/${passengerCapacity} CABINS${lowCapacity ? ` / LOW ${lowPassengers.length}/${lowCapacity}` : ''}${passengerFull ? ' / FULL' : ''}`;
  appendLiveShipRow('PASSENGERS', passengerText, {
    stateClass: passengerFull ? 'live-state-attention' : '',
    tab: 'trade'
  });
  for (const passenger of shipDocument.state.passengerManifest.slice(0, 3)) {
    const destination = getSubsectorSystem(FAR_MERIDIAN_SUBSECTOR, passenger.destinationSystemId);
    appendLiveShipRow('  ABOARD', `${passenger.class.toUpperCase()} -> ${(destination?.name ?? passenger.destinationSystemId).toUpperCase()}`);
  }

  const jobs = activeContracts();
  appendLiveShipRow('ACTIVE JOBS', `${jobs.length}`, { tab: 'jobs' });
  for (const contract of jobs.slice(0, 2)) {
    appendLiveShipRow('  JOB', `${contract.origin.systemName.toUpperCase()} -> ${contract.destination.systemName.toUpperCase()} / ${contract.identity.title.toUpperCase()}`);
  }
  appendLiveShipRow('ACCOUNT', formatCr(shipDocument.state.finances.balanceCr));
}

function renderSubsector() {
  if (!campaignDocument) {
    el.subsectorSection.hidden = true;
    el.subsectorMap.replaceChildren();
    el.jumpPlan.textContent = '';
    el.jumpActions.replaceChildren();
    el.liveShipStatus.replaceChildren();
    el.liveShipIdentity.textContent = shipDocument ? `${(shipDocument.identity.name || 'SHIP').toUpperCase()} / ${shipDocument.identity.registry || '--'}` : 'NO ACTIVE SHIP';
    return;
  }

  normalizeCampaignMappedLocation();
  el.subsectorSection.hidden = campaignPlayActive() && activeWorkspaceView !== 'play';
  const current = mappedCurrentSystem();
  const selected = selectedSystemId ? getSubsectorSystem(FAR_MERIDIAN_SUBSECTOR, selectedSystemId) : null;
  const jumpRating = activeJumpRating();
  const reachable = new Map();
  if (current && Number.isInteger(jumpRating)) {
    for (const entry of getJumpDestinations(FAR_MERIDIAN_SUBSECTOR, current.id, jumpRating)) {
      reachable.set(entry.system.id, entry.distance);
    }
  }

  el.subsectorName.textContent = FAR_MERIDIAN_SUBSECTOR.name.toUpperCase();
  el.jumpCapability.textContent = shipDocument && Number.isInteger(jumpRating)
    ? `${shipDocument.identity.name || shipDocument.identity.registry || 'ACTIVE SHIP'} / JUMP-${jumpRating}`
    : 'NO ACTIVE JUMP SHIP';

  el.subsectorLegend.textContent = current
    ? 'CURRENT ◆   IN RANGE ●   OUT OF RANGE ●   SCOUT △   NAVAL ✦   EMPTY ·'
    : 'SYSTEM ●   SCOUT △   NAVAL ✦   SELECTED SYSTEM OUTLINED   EMPTY ·';

  el.subsectorMap.replaceChildren(renderSubsectorSvg({ current, selected, reachable }));
  applySubsectorZoom();

  const distance = current && selected && current.id !== selected.id
    ? jumpDistanceBetweenSystems(FAR_MERIDIAN_SUBSECTOR, current.id, selected.id)
    : current && selected
      ? 0
      : null;
  const inJumpRange = shipDocument && Number.isInteger(distance) && distance >= 1 && Number.isInteger(jumpRating) && distance <= jumpRating;
  const fuelCheck = inJumpRange ? canShipMakeJump(shipDocument, distance) : null;
  const departureBlocked = currentBerthingBlocksDeparture();
  const commerceBlockedReason = inJumpRange && selected ? passengerRouteBlockReason(selected.id) : null;
  const contractBlockedReason = inJumpRange && selected ? contractRouteBlockReason(selected.id) : null;
  const lifeSupport = inJumpRange ? calculateLifeSupportCostForTrip(shipDocument) : null;
  const operatingBalanceCr = shipDocument?.state?.finances?.balanceCr ?? null;
  const lifeSupportBlocked = Boolean(lifeSupport && Number.isInteger(operatingBalanceCr) && lifeSupport.totalCr > operatingBalanceCr);
  renderLiveShipStatus({ currentSystem: current, selectedSystem: selected, distance, fuelCheck });
  const jumpPlanText = buildJumpPlan({
    campaign: campaignDocument,
    currentSystem: current,
    selectedSystem: selected,
    distance,
    jumpRating,
    fuelCheck,
    departureBlocked,
    commerceBlockedReason,
    contractBlockedReason,
    lifeSupportCostCr: lifeSupport?.totalCr ?? null,
    operatingBalanceCr
  });
  const jumpAttention = [];
  if (departureBlocked || commerceBlockedReason || contractBlockedReason || lifeSupportBlocked || (fuelCheck && !fuelCheck.allowed)) jumpAttention.push('STATUS ');
  if (fuelCheck && !fuelCheck.allowed) {
    if (fuelCheck.reason === 'FUEL UNRECORDED') jumpAttention.push('FUEL HAVE ');
    else jumpAttention.push('FUEL NEED ', 'FUEL HAVE ');
  }
  if (lifeSupportBlocked) jumpAttention.push('LIFE SUPPORT ');
  renderRecordWithHighlights(el.jumpPlan, jumpPlanText, jumpAttention);

  el.jumpActions.replaceChildren();
  if (!selected) return;
  if (!current) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'text-button action-button';
    button.textContent = '[ SET CURRENT LOCATION ]';
    button.addEventListener('click', setStartingSubsectorLocation);
    el.jumpActions.append(button);
    return;
  }
  if (selected.id === current.id) {
    const text = document.createElement('span');
    text.className = 'empty';
    text.textContent = 'SELECTED SYSTEM IS CURRENT LOCATION.';
    el.jumpActions.append(text);
    return;
  }
  if (Number.isInteger(jumpRating) && distance <= jumpRating && shipDocument) {
    if (departureBlocked) {
      const text = document.createElement('span');
      text.className = 'attention-message';
      text.textContent = `BERTHING ${formatCr(currentBerthingDue().berthingDueCr)} DUE / PAY BEFORE DEPARTURE.`;
      el.jumpActions.append(text);
      return;
    }
    if (commerceBlockedReason) {
      const text = document.createElement('span');
      text.className = 'attention-message';
      text.textContent = `${commerceBlockedReason} / DELIVER THEM BEFORE CHANGING ROUTE.`;
      el.jumpActions.append(text);
      return;
    }
    if (contractBlockedReason) {
      const text = document.createElement('span');
      text.className = 'attention-message';
      text.textContent = `${contractBlockedReason} / COMPLETE CHARTER BEFORE CHANGING ROUTE.`;
      el.jumpActions.append(text);
      return;
    }
    if (!fuelCheck?.allowed) {
      const text = document.createElement('span');
      text.className = 'attention-message';
      text.textContent = fuelCheck?.reason === 'FUEL UNRECORDED'
        ? 'FUEL UNRECORDED / REFUEL OR SKIM BEFORE JUMP.'
        : `INSUFFICIENT FUEL: NEED ${fuelCheck?.requirement?.totalTons ?? '--'}t / HAVE ${fuelCheck?.availableTons ?? '--'}t.`;
      el.jumpActions.append(text);
      return;
    }
    if (lifeSupportBlocked) {
      const text = document.createElement('span');
      text.className = 'attention-message';
      text.textContent = `INSUFFICIENT SHIP FUNDS: LIFE SUPPORT ${formatCr(lifeSupport.totalCr)} / ACCOUNT ${formatCr(operatingBalanceCr)}.`;
      el.jumpActions.append(text);
      return;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'text-button action-button';
    button.textContent = `[ JUMP TO ${selected.name.toUpperCase()} ]`;
    button.addEventListener('click', jumpToSelectedSystem);
    el.jumpActions.append(button);
  } else {
    const text = document.createElement('span');
    text.className = 'empty';
    text.textContent = Number.isInteger(jumpRating)
      ? `OUT OF RANGE: ${distance} PARSECS / JUMP-${jumpRating}`
      : 'ACTIVE JUMP-CAPABLE SHIP REQUIRED.';
    el.jumpActions.append(text);
  }

}

function restoreCampaignFromRegistry(campaign) {
  if (!registry) throw new Error('browser local storage is unavailable');
  const resolved = registry.resolveCampaign(campaign);
  if (resolved.missing.length) {
    throw new Error(`campaign references missing documents: ${resolved.missing.join(', ')}`);
  }
  const session = establishLocalPlayerSession(campaign);
  const preferredCharacterId = session?.viewedCharacterId ?? campaign.activeCharacterId;
  const nextCharacter = resolved.characters.find((entry) => entry.identity.id === preferredCharacterId) ?? resolved.characters[0];
  if (!nextCharacter) throw new Error('campaign has no resolvable party character');
  const nextShip = campaign.activeShipId
    ? resolved.ships.find((entry) => entry.identity.id === campaign.activeShipId) ?? null
    : null;

  campaignDocument = campaign;
  selectedSystemId = null;
  operationsDeskTab = 'port';
  normalizeCampaignMappedLocation();
  gameplayDocument = nextCharacter;
  partyCharacterDocuments = campaign.party.characterIds
    .map((id) => resolved.characters.find((entry) => entry.identity.id === id))
    .filter(Boolean);
  shipDocument = nextShip;
  contractDocuments = resolved.contracts;
  situationDocuments = resolved.situations;
  encounterDocuments = resolved.encounters;
  contactDocuments = resolved.contacts;
  threadDocuments = resolved.threads;
  npcActorDocuments = resolved.npcActors;
  mediaAssetDocuments = resolved.assets;
  sceneDocuments = resolved.scenes ?? [];
  activityLogDocument = resolved.activityLogs[0] ?? null;
  documentMode = TRAVELLER_DOCUMENT_KINDS.CHARACTER;
  character = createCharacter();
  setActivityContext();
  const expired = reconcileExpiredContracts();
  const createdSituation = ensureArrivalSituation({ log: false });
  const consequencesChanged = reconcileAdventureConsequences({ log: false });
  if (expired.length || createdSituation || consequencesChanged) persistCampaignState();
}

function addCharacterDocumentToCampaign(characterDocument, campaignId, { makeActive = false, linkedShip = null } = {}) {
  if (!registry) throw new Error('browser local storage is unavailable');
  const storedCampaign = registry.get(campaignId);
  if (!storedCampaign) throw new Error(`saved campaign document is missing: ${campaignId}`);

  registry.put(characterDocument);
  let nextCampaign = addCharacterToCampaign(storedCampaign, characterDocument, { active: true, makeActive });
  if (linkedShip && shipMatchesCharacter(linkedShip, characterDocument)) {
    registry.put(linkedShip);
    nextCampaign = addShipToCampaign(nextCampaign, linkedShip, { makeActive: !nextCampaign.activeShipId });
  }
  registry.put(nextCampaign);
  registry.setActiveCampaignId(nextCampaign.identity.id);
  restoreCampaignFromRegistry(nextCampaign);
  if (makeActive) {
    playerSession = setPlayerViewedCharacter(playerSession, characterDocument.identity.id, {
      partyCharacterIds: nextCampaign.party.characterIds
    });
    if (playerSessionStore) playerSession = playerSessionStore.put(playerSession);
    gameplayDocument = characterDocument;
  }
  returnCampaignId = null;
  logActivity('CHAR', `${characterDocument.identity.name || characterDocument.identity.id} added to campaign${makeActive ? ' / active character' : ''}`, {
    sourceDocumentId: characterDocument.identity.id
  });
  persistCampaignState();
  setStatus(`CHARACTER ADDED TO ${nextCampaign.identity.name || 'CAMPAIGN'}`, 'ok');
  render();
}

function addCompletedCharacterToSavedCampaign() {
  try {
    const gameplay = ensureGameplayDocument();
    if (!gameplay) throw new Error('complete the character before adding it to a campaign');
    const campaignId = returnCampaignId ?? registry?.getActiveCampaignId();
    if (!campaignId) throw new Error('no saved campaign is available');
    addCharacterDocumentToCampaign(gameplay, campaignId, { makeActive: true, linkedShip: shipDocument });
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function activatePartyCharacter(characterId) {
  if (!campaignDocument || characterId === playerSession?.viewedCharacterId) return;
  try {
    const nextCharacter = partyCharacterDocuments.find((entry) => entry.identity.id === characterId) ?? registry?.get(characterId);
    if (!nextCharacter) throw new Error(`party character document is missing: ${characterId}`);
    playerSession = setPlayerViewedCharacter(playerSession ?? establishLocalPlayerSession(), characterId, {
      partyCharacterIds: campaignDocument.party.characterIds
    });
    if (playerSessionStore) playerSession = playerSessionStore.put(playerSession);
    gameplayDocument = nextCharacter;
    documentMode = TRAVELLER_DOCUMENT_KINDS.CHARACTER;
    setStatus(`VIEWING CHARACTER: ${nextCharacter.identity.name || characterId}`, 'ok');
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function newCampaign() {
  try {
    const sessionActivity = activityLog && !campaignDocument ? activityLog.list() : [];
    const gameplay = ensureGameplayDocument();
    if (!gameplay) throw new Error('complete or load a gameplay character before creating a campaign');
    forgetCampaignHome();
    persistGameplayDocuments();
    selectedSystemId = null;
    operationsDeskTab = 'port';
    contractDocuments = [];
    situationDocuments = [];
    encounterDocuments = [];
    contactDocuments = [];
    threadDocuments = [];
    npcActorDocuments = [];
    mediaAssetDocuments = [];
    sceneDocuments = [];
    activityLogDocument = null;
    partyCharacterDocuments = [gameplay];
    campaignDocument = createCampaignDocument({
      characters: [gameplay],
      ships: shipDocument ? [shipDocument] : [],
      contracts: [],
      situations: [],
      encounters: [],
      contacts: [],
      threads: [],
      npcActors: [],
      assets: [],
      activityLogs: [],
      partyCharacterIds: [gameplay.identity.id],
      activeCharacterId: gameplay.identity.id,
      activeShipId: shipDocument?.identity.id ?? null
    });
    establishLocalPlayerSession(campaignDocument);
    returnCampaignId = null;
    documentMode = TRAVELLER_DOCUMENT_KINDS.CHARACTER;
    setActivityContext({ initialEntries: sessionActivity });
    logActivity('SYSLOG', `Campaign created: ${campaignDocument.identity.name || 'Unnamed Campaign'}`);
    setStatus('NEW CAMPAIGN SHELL CREATED', 'ok');
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function saveCampaignLocal() {
  if (!campaignDocument) return;
  try {
    if (!registry) throw new Error('browser local storage is unavailable');
    syncCampaignRefs();
    persistGameplayDocuments();
    registry.put(campaignDocument);
    registry.setActiveCampaignId(campaignDocument.identity.id);
    markAutosaved();
    setStatus('CAMPAIGN SAVED TO THIS BROWSER', 'ok');
    renderCampaign();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function loadSavedCampaign() {
  try {
    if (!registry) throw new Error('browser local storage is unavailable');
    const id = registry.getActiveCampaignId();
    if (!id) throw new Error('no saved campaign is recorded in this browser');
    const campaign = registry.get(id);
    if (!campaign) throw new Error(`saved campaign document is missing: ${id}`);
    forgetCampaignHome();
    restoreCampaignFromRegistry(campaign);
    lastAutosaveAt = null;
    setStatus('CAMPAIGN RESTORED FROM THIS BROWSER', 'ok');
    closeHelp();
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function exportCampaignPortable() {
  if (!campaignDocument) return;
  try {
    if (!registry) throw new Error('browser local storage is unavailable');
    syncCampaignRefs();
    persistGameplayDocuments();
    registry.put(campaignDocument);
    registry.setActiveCampaignId(campaignDocument.identity.id);
    const bundle = registry.buildBundle(campaignDocument.identity.id);
    const json = exportCampaignBundle(bundle, { space: 2 });
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const base = safeFilename(campaignDocument.identity.name || 'traveller-campaign').replace(/\.json$/i, '');
    a.download = `${base}.campaign.json`;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus('PORTABLE CAMPAIGN BUNDLE EXPORTED', 'ok');
    renderCampaign();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function makeHelpButton(topic, label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'help-button';
  button.textContent = '[?]';
  button.dataset.helpTopic = topic;
  button.setAttribute('aria-label', label ?? `Explain ${topic}`);
  button.addEventListener('click', () => showHelp(topic, button));
  return button;
}


function renderActions(procedure) {
  el.actions.replaceChildren();
  const { available } = procedure;

  if (documentMode === TRAVELLER_DOCUMENT_KINDS.CHARACTER || character.phase === CHARGEN_PHASES.COMPLETE) {
    const gameplay = ensureGameplayDocument();

    const startCampaignButton = document.createElement('button');
    startCampaignButton.type = 'button';
    startCampaignButton.className = 'text-button action-button campaign-transition-action';
    startCampaignButton.textContent = '[ START NEW CAMPAIGN ]';
    startCampaignButton.addEventListener('click', newCampaign);
    el.actions.append(startCampaignButton);

    const savedCampaignId = returnCampaignId ?? registry?.getActiveCampaignId();
    const savedCampaign = savedCampaignId ? registry?.get(savedCampaignId) : null;
    if (savedCampaign) {
      const addToCampaignButton = document.createElement('button');
      addToCampaignButton.type = 'button';
      addToCampaignButton.className = 'text-button action-button campaign-transition-action';
      addToCampaignButton.textContent = returnCampaignId
        ? `[ ADD TO ${(savedCampaign.identity.name || 'CAMPAIGN').toUpperCase()} AND RETURN ]`
        : `[ ADD TO ${(savedCampaign.identity.name || 'SAVED CAMPAIGN').toUpperCase()} ]`;
      addToCampaignButton.addEventListener('click', addCompletedCharacterToSavedCampaign);
      el.actions.append(addToCampaignButton);
    }

    const exportCharacterButton = document.createElement('button');
    exportCharacterButton.type = 'button';
    exportCharacterButton.className = 'text-button action-button';
    exportCharacterButton.textContent = '[ EXPORT CHARACTER ]';
    exportCharacterButton.addEventListener('click', exportGameplayCharacter);
    el.actions.append(exportCharacterButton);

    const scoutEntitlement = gameplay.benefits.shipEntitlements.find((entry) => entry.name === 'Scout Ship');
    if (!shipDocument && scoutEntitlement?.disposition === 'reserve-assignment-available') {
      const assignButton = document.createElement('button');
      assignButton.type = 'button';
      assignButton.className = 'text-button action-button';
      assignButton.textContent = '[ ASSIGN SCOUT SHIP ]';
      assignButton.addEventListener('click', assignScoutShip);
      el.actions.append(assignButton);
    }

    if (shipDocument) {
      const exportShipButton = document.createElement('button');
      exportShipButton.type = 'button';
      exportShipButton.className = 'text-button action-button';
      exportShipButton.textContent = '[ EXPORT SHIP ]';
      exportShipButton.addEventListener('click', exportGameplayShip);
      el.actions.append(exportShipButton);
    }
    return;
  }

  renderChargenActions(el.actions, character, available, execute);
}

// ---------------------------------------------------------------------------
// v0.18.0 WHAT NOW? dock for campaign play
// ---------------------------------------------------------------------------
function playProcedureSnapshot() {
  if (!campaignPlayActive()) return null;
  const current = mappedCurrentSystem();
  if (!current) return { currentSystem: null };
  const selected = selectedSystemId ? getSubsectorSystem(FAR_MERIDIAN_SUBSECTOR, selectedSystemId) : null;
  const jumpRating = activeJumpRating();
  const distance = selected && selected.id !== current.id ? jumpDistanceBetweenSystems(FAR_MERIDIAN_SUBSECTOR, current.id, selected.id) : null;
  const reachable = Boolean(shipDocument && Number.isInteger(distance) && distance >= 1 && Number.isInteger(jumpRating) && distance <= jumpRating);
  const destination = selected && selected.id !== current.id ? { name: selected.name, distance, reachable } : null;
  const portCall = currentBerthingDue();
  const profile = parseUniversalWorldProfile(current.mainWorld.uwp);
  const fuelService = shipDocument ? starportFuelService(profile.starport, { scoutBase: current.bases.scout, ship: shipDocument }) : null;
  const fuelCheck = reachable ? canShipMakeJump(shipDocument, distance) : null;
  const route = reachable ? commerceRouteSnapshot() : null;
  const freeHold = shipDocument ? shipDocument.specifications.cargo.capacityTons - shipDocument.state.cargoUsedTons : 0;
  let freight = null;
  let passengers = null;
  if (route?.reachable) {
    const acceptedIds = new Set(shipDocument.state.cargoManifest.filter((entry) => entry.category === 'freight').map((entry) => entry.id));
    const remaining = route.freight.offers.filter((entry) => !acceptedIds.has(entry.id));
    const acceptedForDestination = shipDocument.state.cargoManifest.filter((entry) => entry.destinationSystemId === selected.id).length;
    freight = { offers: remaining.length, fitting: remaining.filter((entry) => entry.tons <= freeHold + 1e-9).length, accepted: acceptedForDestination };
    const booked = ['high', 'middle', 'low'].reduce((sum, cls) => sum + bookedPassengerCount(route, cls), 0);
    const capacity = availablePassengerCapacity(shipDocument, 'middle') + availablePassengerCapacity(shipDocument, 'low');
    passengers = { demand: route.passengerDemand, booked, capacity, blockReason: passengerRouteBlockReason(selected.id) };
  }
  const offer = weeklySpeculativeOffer();
  const speculation = offer ? {
    available: true,
    name: offer.name.toUpperCase(),
    quantity: `${offer.quantityAvailable}${offer.unit === 'tons' ? 't' : ' units'}`,
    purchased: offer.unit === 'tons' ? speculativeQuantityPurchased(offer, current.id) : 0,
    holdFree: freeHold
  } : null;
  const patronKey = currentPatronEventKey();
  const patron = shipDocument ? {
    available: Boolean(portCall && !activeSituationAtCurrentSystem()),
    attemptedThisCall: Boolean(patronKey && situationForEventKey(patronKey))
  } : null;
  const situation = activeSituationAtCurrentSystem();
  const encounter = activeEncounterAtCurrentSystem();
  const lifeSupport = shipDocument ? calculateLifeSupportCostForTrip(shipDocument) : null;
  const departureBlocked = currentBerthingBlocksDeparture();
  const commerceBlock = reachable ? passengerRouteBlockReason(selected.id) : null;
  const contractBlock = reachable ? contractRouteBlockReason(selected.id) : null;
  const lifeSupportBlocked = Boolean(lifeSupport && lifeSupport.totalCr > (shipDocument?.state?.finances?.balanceCr ?? 0));
  let jumpBlockReason = null;
  if (!shipDocument) jumpBlockReason = 'No active ship.';
  else if (fuelCheck && !fuelCheck.allowed) jumpBlockReason = fuelCheck.reason === 'FUEL UNRECORDED' ? 'Fuel is unrecorded; refuel or skim first.' : `Fuel: need ${fuelCheck.requirement.totalTons}t, have ${fuelCheck.availableTons}t.`;
  else if (departureBlocked) jumpBlockReason = 'Berthing must be paid before departure.';
  else if (commerceBlock) jumpBlockReason = commerceBlock;
  else if (contractBlock) jumpBlockReason = contractBlock;
  else if (lifeSupportBlocked) jumpBlockReason = `Ship account cannot cover life support Cr${lifeSupport.totalCr.toLocaleString('en-US')}.`;
  else if (situation) jumpBlockReason = 'Resolve the active situation first.';
  else if (encounter) jumpBlockReason = 'Resolve the encounter first.';
  return {
    currentSystem: { name: current.name, starport: profile.starport, hasGasGiant: Boolean(current.gasGiant) },
    destination,
    encounterActive: Boolean(encounter),
    situationActive: situation ? { title: situation.identity.title, copy: 'Choose a response in the context panel.' } : null,
    berthing: portCall ? { due: portCall.berthingDueCr > 0, dueCr: portCall.berthingDueCr, paid: Boolean(portCall.berthingPaid) } : null,
    fuel: shipDocument ? {
      currentTons: shipDocument.state.currentFuelTons ?? 0,
      capacityTons: shipDocument.specifications.fuel.capacityTons,
      requiredTons: fuelCheck?.requirement?.totalTons ?? null,
      sufficient: fuelCheck ? fuelCheck.allowed : null,
      canBuy: Boolean(fuelService?.available),
      canSkim: Boolean(current.gasGiant && shipDocument.specifications.hull.streamlined)
    } : null,
    freight,
    passengers,
    speculation,
    patron,
    jobs: { offers: availableContractOffers().length, active: activeContracts().length },
    thread: activeThreadObjective(),
    lifeSupportCr: lifeSupport?.totalCr ?? 0,
    jumpReady: Boolean(reachable && !jumpBlockReason),
    jumpBlockReason
  };
}

function playProcedureAction(action) {
  if (action === 'nav') { el.subsectorMap?.scrollIntoView({ block: 'nearest' }); return; }
  if (action === 'port') { setOperationsDeskTab('port'); return; }
  if (action === 'trade') { setOperationsDeskTab('trade'); return; }
  if (action === 'jobs') { setOperationsDeskTab('jobs'); return; }
  if (action === 'situation') { setOperationsDeskTab('situation'); return; }
  if (action === 'encounter') { setOperationsDeskTab('encounter'); return; }
  if (action === 'threads') { setWorkspaceView('threads'); return; }
  if (action === 'character') { setSceneTab('character'); return; }
  if (action === 'jump') { el.jumpActions.querySelector('button:not(:disabled)')?.focus(); }
}

let playProcedureDoneOpen = false;

function renderPlayProcedure() {
  if (!el.playProcedure) return;
  el.playProcedure.replaceChildren();
  const snapshot = playProcedureSnapshot();
  if (!snapshot) return;
  const model = buildPlayProcedure(snapshot);
  for (const group of model.groups) {
    const wrap = document.createElement('div');
    wrap.className = 'procedure-group';
    const label = document.createElement('div');
    label.className = 'procedure-group-label';
    label.textContent = group.label;
    wrap.append(label);
    if (group.collapsed) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'text-button procedure-group-toggle';
      toggle.textContent = playProcedureDoneOpen ? `[ HIDE ${group.cards.length} ]` : `[ SHOW ${group.cards.length} ]`;
      toggle.addEventListener('click', () => { playProcedureDoneOpen = !playProcedureDoneOpen; renderPlayProcedure(); });
      label.append(toggle);
      if (!playProcedureDoneOpen) { el.playProcedure.append(wrap); continue; }
    }
    for (const card of group.cards) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `procedure-card ${card.tone}`;
      button.disabled = !card.action;
      const title = document.createElement('div');
      title.className = 'procedure-card-title';
      const name = document.createElement('span');
      name.textContent = card.title;
      const tag = document.createElement('span');
      tag.className = 'procedure-card-tag';
      tag.textContent = card.tag;
      title.append(name, tag);
      button.append(title);
      if (card.copy) {
        const copy = document.createElement('div');
        copy.className = 'procedure-card-copy';
        copy.textContent = card.copy;
        button.append(copy);
      }
      if (card.action) button.addEventListener('click', () => playProcedureAction(card.action));
      wrap.append(button);
    }
    el.playProcedure.append(wrap);
  }
}

// v0.18.0 chargen context: the Book 1 tables that apply to the current phase.
// Rendering lives in chargen-view.js since v0.66.0.
function renderChargenTables() {
  if (!el.chargenTables) return;
  if (campaignPlayActive()) { el.chargenTables.replaceChildren(); return; }
  renderChargenTablesView(el.chargenTables, character, execute);
}

function render() {
  applySidebar();
  renderRailTools();
  renderSidebarStrips();
  const gameplayOnly = documentMode === TRAVELLER_DOCUMENT_KINDS.CHARACTER;
  const displayName = gameplayOnly ? gameplayDocument?.identity.name : character.name;
  if (el.name.value !== (displayName ?? '')) el.name.value = displayName ?? '';
  el.saveCharacter.disabled = gameplayOnly;

  if (gameplayOnly || character.phase === CHARGEN_PHASES.COMPLETE) {
    const finalDocument = ensureGameplayDocument();
    el.recordHeading.textContent = 'FINAL PERSONNEL RECORD';
    el.recordHelp.dataset.helpTopic = 'final-character-record';
    el.record.classList.add('final-record');
    el.record.textContent = buildFinalCharacterRecord(finalDocument);
  } else {
    el.recordHeading.textContent = 'PERSONNEL RECORD';
    el.recordHelp.dataset.helpTopic = 'personnel-record';
    el.record.classList.remove('final-record');
    el.record.textContent = buildCharacterRecord(character);
  }

  const historySource = gameplayOnly ? gameplayDocument : character;
  el.serviceHistory.textContent = buildServiceHistory(historySource);
  el.generationLog.textContent = buildGenerationLog(historySource);

  const procedure = gameplayOnly ? gameplayProcedure() : buildProcedure(character);
  el.procedure.replaceChildren();
  el.procedure.className = `procedure${procedure.attention ? ' attention' : ''}`;

  const whatNow = document.createElement('div');
  whatNow.className = 'what-now';
  whatNow.textContent = 'WHAT NOW?';

  const phaseLine = document.createElement('div');
  phaseLine.className = 'phase-line';
  const phase = document.createElement('div');
  phase.className = 'phase';
  phase.textContent = procedure.title;
  phaseLine.append(phase, makeHelpButton(procedure.helpTopic, `Explain ${procedure.title}`));

  const text = document.createElement('div');
  text.textContent = procedure.text;
  el.procedure.append(whatNow, phaseLine, text);
  if (procedure.detail) {
    const detail = document.createElement('div');
    detail.className = 'phase-detail';
    detail.textContent = procedure.detail;
    el.procedure.append(detail);
  }
  renderActions(procedure);
  renderCampaign();
  renderCharacterSheet();
  renderChargenSheet();
  renderSubsector();
  renderSystemRecord();
  renderPortServices();
  renderCommerce();
  renderContracts();
  renderSituations();
  renderEncounter();
  renderAccount();
  renderPublishPanel();
  watchPlayerDeclarations();
  watchPlayerCanvas();
  renderCampaignDirectory();
  renderRoster();
  applyOperationsDeskTab();
  renderShip();
  renderCampaignHeader();
  renderSelectedSystemSummary();
  applyCampaignLayout();
  renderPlayProcedure();
  renderChargenTables();
  renderActivity();
}

function execute(action, payload = {}) {
  try {
    if (documentMode !== TRAVELLER_DOCUMENT_KINDS.CHARGEN) throw new Error('chargen actions are unavailable while a gameplay document is loaded');
    const priorHistoryLength = character.history.length;
    const result = performChargenAction(character, action, payload);
    character = result.character;
    documentMode = TRAVELLER_DOCUMENT_KINDS.CHARGEN;
    gameplayDocument = null;
    partyCharacterDocuments = [];
    shipDocument = null;
    campaignDocument = null;
    selectedSystemId = null;
    closeHelp();
    setActivityContext();
    const events = character.history.slice(priorHistoryLength);
    if (events.length) for (const entry of events) logActivity('CHAR', formatHistoryEvent(entry));
    else logActivity('CHAR', `${ACTION_LABELS[action] ?? action} resolved`);
    setStatus('ACTION RESOLVED', 'ok');
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function safeFilename(name) {
  const cleaned = String(name || 'traveller-character')
    .trim()
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return `${cleaned || 'traveller-character'}.json`;
}

function exportGameplayCharacter() {
  try {
    const gameplay = ensureGameplayDocument();
    const json = exportCharacterDocument(gameplay, { space: 2 });
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const exportName = gameplayDocument?.identity.name ?? character.name;
    const base = safeFilename(exportName).replace(/\.json$/i, '');
    a.download = `${base}.character.json`;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    logActivity('SYSLOG', `Character document exported: ${gameplay.identity.name || gameplay.identity.id}`);
    setStatus('CHARACTER DOCUMENT EXPORTED', 'ok');
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function assignScoutShip() {
  try {
    const current = ensureGameplayDocument();
    const result = createTypeSScoutReserveShipForCharacter(current);
    gameplayDocument = result.character;
    shipDocument = result.ship;
    persistGameplayDocuments();
    if (campaignDocument) {
      campaignDocument = addShipToCampaign(campaignDocument, shipDocument, { makeActive: true });
      syncCampaignRefs();
    }
    logActivity('SHIP', `${shipDocument.identity.name || 'Type S Scout/Courier'} assigned on Scout reserve basis to ${gameplayDocument.identity.name}`);
    setStatus('SCOUT SHIP ASSIGNED ON RESERVE BASIS', 'ok');
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function exportGameplayShip() {
  if (!shipDocument) return;
  try {
    const json = exportShipDocument(shipDocument, { space: 2 });
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const baseName = shipDocument.identity.name || `type-${shipDocument.design.typeCode}-${shipDocument.identity.id}`;
    a.download = `${safeFilename(baseName).replace(/\.json$/i, '')}.ship.json`;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    logActivity('SYSLOG', `Ship document exported: ${shipDocument.identity.name || shipDocument.identity.registry || shipDocument.identity.id}`);
    setStatus('SHIP DOCUMENT EXPORTED', 'ok');
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function saveCharacter() {
  try {
    const json = exportCharacter(character, { space: 2 });
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safeFilename(character.name);
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    logActivity('SYSLOG', `Chargen JSON exported: ${character.name || 'Unnamed Traveller'}`);
    setStatus('JSON SAVED', 'ok');
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

async function loadDocument(file, { campaignOnly = false, addToCampaign = false } = {}) {
  if (!file) return;
  try {
    const text = await file.text();
    const loaded = loadTravellerDocument(text);
    if (campaignOnly && ![TRAVELLER_DOCUMENT_KINDS.CAMPAIGN, TRAVELLER_DOCUMENT_KINDS.CAMPAIGN_BUNDLE].includes(loaded.kind)) {
      throw new Error('select a Traveller Campaign Document or portable Campaign Bundle');
    }
    if (addToCampaign) {
      if (!campaignDocument) throw new Error('load a campaign before adding a character');
      if (loaded.kind !== TRAVELLER_DOCUMENT_KINDS.CHARACTER) throw new Error('select a completed Traveller Character Document');
      addCharacterDocumentToCampaign(loaded.characterDocument, campaignDocument.identity.id, { makeActive: false });
      return;
    }

    if (loaded.kind === TRAVELLER_DOCUMENT_KINDS.CHARGEN) {
      character = loaded.character;
      gameplayDocument = null;
      partyCharacterDocuments = [];
      shipDocument = null;
      campaignDocument = null;
      contractDocuments = [];
      situationDocuments = [];
      encounterDocuments = [];
      contactDocuments = [];
      threadDocuments = [];
      npcActorDocuments = [];
      mediaAssetDocuments = [];
    sceneDocuments = [];
      selectedSystemId = null;
      documentMode = TRAVELLER_DOCUMENT_KINDS.CHARGEN;
      setActivityContext();
      logActivity('SYSLOG', `Chargen JSON loaded: ${file.name}`);
      setStatus('CHARGEN JSON LOADED', 'ok');
    } else if (loaded.kind === TRAVELLER_DOCUMENT_KINDS.CHARACTER) {
      returnCampaignId = null;
      gameplayDocument = loaded.characterDocument;
      partyCharacterDocuments = [gameplayDocument];
      documentMode = TRAVELLER_DOCUMENT_KINDS.CHARACTER;
      campaignDocument = null;
      contractDocuments = [];
      situationDocuments = [];
      encounterDocuments = [];
      contactDocuments = [];
      threadDocuments = [];
      npcActorDocuments = [];
      mediaAssetDocuments = [];
    sceneDocuments = [];
      selectedSystemId = null;
      if (shipDocument && !shipMatchesCharacter(shipDocument, gameplayDocument)) shipDocument = null;
      if (registry) registry.put(gameplayDocument);
      setActivityContext();
      logActivity('CHAR', `Character loaded: ${gameplayDocument.identity.name || gameplayDocument.identity.id}`);
      setStatus('CHARACTER DOCUMENT LOADED / REGISTERED LOCALLY', 'ok');
    } else if (loaded.kind === TRAVELLER_DOCUMENT_KINDS.SHIP) {
      if (gameplayDocument && !shipMatchesCharacter(loaded.shipDocument, gameplayDocument)) {
        throw new Error(`ship ${loaded.shipDocument.identity.id} is not linked to loaded character ${gameplayDocument.identity.id}`);
      }
      shipDocument = loaded.shipDocument;
      campaignDocument = null;
      contractDocuments = [];
      situationDocuments = [];
      encounterDocuments = [];
      contactDocuments = [];
      threadDocuments = [];
      npcActorDocuments = [];
      mediaAssetDocuments = [];
    sceneDocuments = [];
      selectedSystemId = null;
      if (gameplayDocument) shipDocument = updateShipAssignedCharacterName(shipDocument, gameplayDocument.identity.name);
      if (registry) registry.put(shipDocument);
      setActivityContext();
      logActivity('SHIP', `Ship loaded: ${shipDocument.identity.name || shipDocument.identity.registry || shipDocument.identity.id}`);
      setStatus(gameplayDocument ? 'LINKED SHIP DOCUMENT LOADED / REGISTERED LOCALLY' : 'SHIP DOCUMENT LOADED / REGISTERED LOCALLY', 'ok');
    } else if (loaded.kind === TRAVELLER_DOCUMENT_KINDS.CONTRACT) {
      if (!registry) throw new Error('browser local storage is unavailable');
      const contract = importContractDocument(loaded.contractDocument);
      registry.put(contract);
      if (campaignDocument && gameplayDocument && shipDocument
        && contract.assigned.characterId === gameplayDocument.identity.id
        && contract.assigned.shipId === shipDocument.identity.id) {
        contractDocuments = contractDocuments.filter((entry) => entry.identity.id !== contract.identity.id);
        contractDocuments.push(contract);
        campaignDocument = addContractToCampaign(campaignDocument, contract);
        syncCampaignRefs();
        registry.put(campaignDocument);
        logActivity('CONTRACT', `Contract loaded: ${contract.identity.title}`);
        setStatus('CONTRACT DOCUMENT LOADED / ADDED TO CAMPAIGN', 'ok');
      } else {
        setStatus('CONTRACT DOCUMENT REGISTERED LOCALLY', 'ok');
      }
    } else if (loaded.kind === TRAVELLER_DOCUMENT_KINDS.SITUATION) {
      if (!registry) throw new Error('browser local storage is unavailable');
      const situation = importSituationDocument(loaded.situationDocument);
      registry.put(situation);
      if (campaignDocument && situation.location.systemId === campaignDocument.location.systemId) {
        situationDocuments = situationDocuments.filter((entry) => entry.identity.id !== situation.identity.id);
        situationDocuments.push(situation);
        campaignDocument = addSituationToCampaign(campaignDocument, situation);
        syncCampaignRefs();
        registry.put(campaignDocument);
        logActivity('SITUATION', `Situation loaded: ${situation.identity.title}`);
        setStatus('SITUATION DOCUMENT LOADED / ADDED TO CAMPAIGN', 'ok');
      } else {
        setStatus('SITUATION DOCUMENT REGISTERED LOCALLY', 'ok');
      }
    } else if (loaded.kind === TRAVELLER_DOCUMENT_KINDS.ENCOUNTER) {
      if (!registry) throw new Error('browser local storage is unavailable');
      const encounter = importEncounterDocument(loaded.encounterDocument);
      registry.put(encounter);
      if (campaignDocument && encounter.campaignId === campaignDocument.identity.id) {
        encounterDocuments = encounterDocuments.filter((entry) => entry.identity.id !== encounter.identity.id);
        encounterDocuments.push(encounter);
        campaignDocument = addEncounterToCampaign(campaignDocument, encounter);
        syncCampaignRefs();
        registry.put(campaignDocument);
        logActivity('COMBAT', `Encounter loaded: ${encounter.identity.title}`);
        setStatus('ENCOUNTER DOCUMENT LOADED / ADDED TO CAMPAIGN', 'ok');
      } else {
        setStatus('ENCOUNTER DOCUMENT REGISTERED LOCALLY', 'ok');
      }
    } else if (loaded.kind === TRAVELLER_DOCUMENT_KINDS.CONTACT) {
      if (!registry) throw new Error('browser local storage is unavailable');
      const contact = importContactDocument(loaded.contactDocument);
      registry.put(contact);
      if (campaignDocument) {
        contactDocuments = contactDocuments.filter((entry) => entry.identity.id !== contact.identity.id);
        contactDocuments.push(contact);
        campaignDocument = addContactToCampaign(campaignDocument, contact);
        syncCampaignRefs();
        registry.put(campaignDocument);
        logActivity('THREAD', `Contact loaded: ${contact.identity.name}`);
        setStatus('CONTACT DOCUMENT LOADED / ADDED TO CAMPAIGN', 'ok');
      } else {
        setStatus('CONTACT DOCUMENT REGISTERED LOCALLY', 'ok');
      }
    } else if (loaded.kind === TRAVELLER_DOCUMENT_KINDS.THREAD) {
      if (!registry) throw new Error('browser local storage is unavailable');
      const thread = importAdventureThreadDocument(loaded.threadDocument);
      registry.put(thread);
      const knownSituations = new Set(situationDocuments.map((entry) => entry.identity.id));
      const knownContacts = new Set(contactDocuments.map((entry) => entry.identity.id));
      const knownContracts = new Set(contractDocuments.map((entry) => entry.identity.id));
      const relationsPresent = thread.situationIds.every((id) => knownSituations.has(id))
        && thread.contactIds.every((id) => knownContacts.has(id))
        && thread.contractIds.every((id) => knownContracts.has(id));
      if (campaignDocument && relationsPresent) {
        threadDocuments = threadDocuments.filter((entry) => entry.identity.id !== thread.identity.id);
        threadDocuments.push(thread);
        campaignDocument = addAdventureThreadToCampaign(campaignDocument, thread);
        syncCampaignRefs();
        registry.put(campaignDocument);
        logActivity('THREAD', `Adventure thread loaded: ${thread.identity.title}`);
        setStatus('THREAD DOCUMENT LOADED / ADDED TO CAMPAIGN', 'ok');
      } else {
        setStatus(campaignDocument ? 'THREAD DOCUMENT REGISTERED / RELATED DOCUMENTS NOT ALL IN ACTIVE CAMPAIGN' : 'THREAD DOCUMENT REGISTERED LOCALLY', 'ok');
      }
    } else if (loaded.kind === TRAVELLER_DOCUMENT_KINDS.NPC_ACTOR) {
      if (!registry) throw new Error('browser local storage is unavailable');
      const actor = importNpcActorDocument(loaded.npcActorDocument);
      registry.put(actor);
      if (campaignDocument) {
        npcActorDocuments = npcActorDocuments.filter((entry) => entry.identity.id !== actor.identity.id);
        npcActorDocuments.push(actor);
        if (!campaignDocument.documentRefs.npcActors.some((entry) => entry.id === actor.identity.id)) campaignDocument = addNpcActorToCampaign(campaignDocument, actor);
        persistCampaignState();
        operationsDeskTab = 'roster';
        logActivity('ROSTER', `Actor loaded: ${actor.identity.name}`, { sourceActorId: actor.identity.id });
        setStatus('NPC ACTOR LOADED / ADDED TO CAMPAIGN', 'ok');
      } else setStatus('NPC ACTOR REGISTERED LOCALLY', 'ok');
    } else if (loaded.kind === TRAVELLER_DOCUMENT_KINDS.MEDIA_ASSET) {
      if (!registry) throw new Error('browser local storage is unavailable');
      const asset = importMediaAssetDocument(loaded.mediaAssetDocument);
      registry.put(asset);
      if (campaignDocument) {
        mediaAssetDocuments = mediaAssetDocuments.filter((entry) => entry.identity.id !== asset.identity.id);
        mediaAssetDocuments.push(asset);
        if (!campaignDocument.documentRefs.assets.some((entry) => entry.id === asset.identity.id)) campaignDocument = addMediaAssetToCampaign(campaignDocument, asset);
        persistCampaignState();
        logActivity('ROSTER', `Media asset loaded: ${asset.identity.name}`, { sourceDocumentId: asset.identity.id });
        setStatus('MEDIA ASSET LOADED / ADDED TO CAMPAIGN', 'ok');
      } else setStatus('MEDIA ASSET REGISTERED LOCALLY', 'ok');
    } else if (loaded.kind === TRAVELLER_DOCUMENT_KINDS.ACTIVITY_LOG) {
      if (!registry) throw new Error('browser local storage is unavailable');
      const importedLog = importActivityLogDocument(loaded.activityLogDocument);
      registry.put(importedLog);
      if (campaignDocument && importedLog.campaignId === campaignDocument.identity.id) {
        activityLogDocument = importedLog;
        campaignDocument = addActivityLogToCampaign(campaignDocument, importedLog);
        persistCampaignState();
        logActivity('SYSLOG', `Activity Log Document loaded: ${importedLog.identity.name}`, { sourceDocumentId: importedLog.identity.id });
        setStatus('ACTIVITY LOG DOCUMENT LOADED / ADDED TO CAMPAIGN', 'ok');
      } else setStatus('ACTIVITY LOG DOCUMENT REGISTERED LOCALLY', 'ok');
    } else if (loaded.kind === TRAVELLER_DOCUMENT_KINDS.CAMPAIGN) {
      returnCampaignId = null;
      if (!registry) throw new Error('browser local storage is unavailable');
      registry.put(loaded.campaignDocument);
      registry.setActiveCampaignId(loaded.campaignDocument.identity.id);
      restoreCampaignFromRegistry(loaded.campaignDocument);
      setStatus('CAMPAIGN DOCUMENT LOADED FROM LOCAL REGISTRY', 'ok');
    } else if (loaded.kind === TRAVELLER_DOCUMENT_KINDS.CAMPAIGN_BUNDLE) {
      returnCampaignId = null;
      if (!registry) throw new Error('browser local storage is unavailable');
      const bundle = registry.putBundle(loaded.campaignBundle);
      registry.setActiveCampaignId(bundle.campaign.identity.id);
      forgetCampaignHome();
      restoreCampaignFromRegistry(bundle.campaign);
      setStatus('PORTABLE CAMPAIGN BUNDLE LOADED', 'ok');
    }

    closeHelp();
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  } finally {
    el.loadFile.value = '';
    el.loadFile.dataset.scope = 'any';
  }
}

for (const button of document.querySelectorAll('[data-help-topic]')) {
  button.addEventListener('click', () => showHelp(button.dataset.helpTopic, button));
}

el.closeHelp.addEventListener('click', closeHelp);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !el.helpPanel.hidden) closeHelp();
  if (event.key === 'Escape' && !el.encounterSection.hidden && !document.querySelector('dialog[open]')) {
    clearEncounterCanvasSelection();
    hideEncounterTokenOverlays();
    renderEncounter();
  }
});

function updateCharacterName(name, statusMessage = 'NAME UPDATED') {
  if (documentMode === TRAVELLER_DOCUMENT_KINDS.CHARACTER) {
    const next = JSON.parse(JSON.stringify(gameplayDocument));
    next.identity.name = name;
    gameplayDocument = importCharacterDocument(next);
  } else {
    character = { ...character, name };
    if (gameplayDocument) {
      const prior = gameplayDocument;
      gameplayDocument = createCharacterDocument(character, {
        id: prior.identity.id,
        aliases: prior.identity.aliases,
        notes: prior.notes
      });
      for (const ref of prior.shipRefs) gameplayDocument = linkCharacterToShip(gameplayDocument, ref);
    }
  }
  if (shipDocument && (!gameplayDocument || shipMatchesCharacter(shipDocument, gameplayDocument))) {
    shipDocument = updateShipAssignedCharacterName(shipDocument, name);
  }
  persistGameplayDocuments();
  syncCampaignRefs();
  setStatus(statusMessage, 'ok');
  render();
}

function updateShipName(name, statusMessage = 'SHIP NAME UPDATED') {
  if (!shipDocument) return;
  shipDocument = updateShipIdentity(shipDocument, { name });
  if (gameplayDocument) {
    gameplayDocument = updateCharacterShipReference(gameplayDocument, {
      shipId: shipDocument.identity.id,
      shipName: shipDocument.identity.name
    });
  }
  persistGameplayDocuments();
  syncCampaignRefs();
  renderCampaign();
  renderSubsector();
  renderSystemRecord();
  renderPortServices();
  renderShip();
  setStatus(statusMessage, 'ok');
}

function updateShipRegistry(registry, statusMessage = 'SHIP REGISTRY UPDATED') {
  if (!shipDocument) return;
  shipDocument = updateShipIdentity(shipDocument, { registry });
  persistGameplayDocuments();
  syncCampaignRefs();
  renderCampaign();
  renderShip();
  setStatus(statusMessage, 'ok');
}

function updateCampaignName(name) {
  if (!campaignDocument) return;
  try {
    campaignDocument = updateCampaignIdentity(campaignDocument, { name });
    renderCampaign();
    setStatus('CAMPAIGN NAME UPDATED', 'ok');
  } catch (error) {
    setStatus(error?.message ?? String(error), 'error');
  }
}

function updateCampaignDate() {
  if (!campaignDocument) return;
  try {
    campaignDocument = updateCampaignTime(campaignDocument, {
      dayOfYear: Number.parseInt(el.campaignDay.value, 10),
      year: Number.parseInt(el.campaignYear.value, 10)
    });
    reconcileExpiredContracts();
    persistCampaignState();
    render();
    setStatus('CAMPAIGN DATE UPDATED', 'ok');
  } catch (error) {
    setStatus(error?.message ?? String(error), 'error');
  }
}

function updateCampaignLocationFields() {
  if (!campaignDocument) return;
  try {
    campaignDocument = updateCampaignLocation(campaignDocument, {
      systemName: el.campaignSystem.value,
      worldName: el.campaignWorld.value
    });
    renderCampaign();
    setStatus('CAMPAIGN LOCATION UPDATED', 'ok');
  } catch (error) {
    setStatus(error?.message ?? String(error), 'error');
  }
}

el.name.addEventListener('input', () => updateCharacterName(el.name.value));

el.randomCharacterName.addEventListener('click', () => {
  updateCharacterName(generateCharacterName(), 'RANDOM CHARACTER NAME GENERATED');
});

el.shipName.addEventListener('input', () => updateShipName(el.shipName.value));

el.randomShipName.addEventListener('click', () => {
  if (!shipDocument) return;
  updateShipName(generateShipName(), 'RANDOM SHIP NAME GENERATED');
});

el.shipRegistry.addEventListener('input', () => updateShipRegistry(el.shipRegistry.value));

el.generateShipRegistry.addEventListener('click', () => {
  if (!shipDocument) return;
  updateShipRegistry(generateShipRegistry(shipDocument.design.typeCode), 'SHIP REGISTRY CANDIDATE GENERATED');
});

function startNewCharacter() {
  const fromCampaign = campaignPlayActive();
  const prompt = fromCampaign
    ? `Start a new character for ${campaignDocument.identity.name || 'this campaign'}? The campaign will be saved and offered again when chargen is complete.`
    : 'Discard the current chargen state and create a new character?';
  if (!window.confirm(prompt)) return;
  if (fromCampaign) {
    persistCampaignState();
    returnCampaignId = campaignDocument.identity.id;
  } else {
    returnCampaignId = null;
  }
  character = createCharacter();
  documentMode = TRAVELLER_DOCUMENT_KINDS.CHARGEN;
  gameplayDocument = null;
  partyCharacterDocuments = [];
  shipDocument = null;
  campaignDocument = null;
  contractDocuments = [];
  situationDocuments = [];
  encounterDocuments = [];
  contactDocuments = [];
  threadDocuments = [];
  npcActorDocuments = [];
  mediaAssetDocuments = [];
    sceneDocuments = [];
  lastAutosaveAt = null;
  selectedSystemId = null;
  activeWorkspaceView = 'play';
  systemDetailsOpen = false;
  closeRollDialog();
  closeHelp();
  setActivityContext();
  logActivity('CHAR', 'New character generation started');
  setStatus('NEW CHARACTER GENERATED', 'ok');
  render();
}

el.newCharacter.addEventListener('click', startNewCharacter);
el.newCharacterFromCampaign.addEventListener('click', startNewCharacter);

el.campaignName.addEventListener('input', () => updateCampaignName(el.campaignName.value));
el.campaignActiveCharacter.addEventListener('change', () => activatePartyCharacter(el.campaignActiveCharacter.value));
el.campaignDay.addEventListener('change', updateCampaignDate);
el.campaignYear.addEventListener('change', updateCampaignDate);
el.campaignName.addEventListener('change', () => {
  if (campaignDocument) logActivity('SYSLOG', `Campaign name set: ${campaignDocument.identity.name || 'Unnamed Campaign'}`);
});
el.shipName.addEventListener('change', () => {
  if (shipDocument) logActivity('SHIP', `Ship name set: ${shipDocument.identity.name || '(unnamed)'}`);
});
el.shipRegistry.addEventListener('change', () => {
  if (shipDocument) logActivity('SHIP', `Ship registry set: ${shipDocument.identity.registry || '(blank)'}`);
});

el.clearActivity.addEventListener('click', () => {
  if (!window.confirm('Clear the activity log for the current campaign/session?')) return;
  if (campaignDocument && activityLogDocument) {
    activityLogDocument = clearActivityLogDocument(activityLogDocument);
    if (registry) registry.put(activityLogDocument);
    markAutosaved();
  } else activityLog?.clear();
  renderActivity();
  setStatus('ACTIVITY LOG CLEARED', 'ok');
});
el.activityFilter.addEventListener('change', () => { activityFilter = el.activityFilter.value; renderActivity(); });
el.activityOrder.addEventListener('change', () => {
  activityOrder = el.activityOrder.value === 'oldest' ? 'oldest' : 'newest';
  try { window.localStorage.setItem(ACTIVITY_ORDER_STORAGE_KEY, activityOrder); } catch (error) { console.error(error); }
  renderActivity();
});
el.toggleActivity.addEventListener('click', () => setActivityPanelVisible(!activityPanelVisible));
el.refereeMenu?.addEventListener('click', (event) => {
  if (!event.target.closest('button, a')) return;
  window.setTimeout(() => { el.refereeMenu.open = false; }, 0);
});
el.refereeNewNpc?.addEventListener('click', startNewCharacter);
el.campaignMenu?.addEventListener('click', (event) => {
  if (!event.target.closest('button')) return;
  window.setTimeout(() => { el.campaignMenu.open = false; }, 0);
});
el.addActivityNote.addEventListener('click', openActivityNoteDialog);
el.activityNoteClose.addEventListener('click', closeActivityNoteDialog);
el.activityNoteCancel.addEventListener('click', closeActivityNoteDialog);
el.activityNoteDialog.addEventListener('cancel', (event) => { event.preventDefault(); closeActivityNoteDialog(); });
el.activityNoteForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const note = el.activityNoteText.value.trim();
  if (!note) return setStatus('CAMPAIGN NOTE CANNOT BE BLANK', 'error');
  logActivity('NOTE', note, { sourceDocumentId: campaignDocument?.identity.id ?? null });
  closeActivityNoteDialog();
  setStatus('CAMPAIGN NOTE RECORDED', 'ok');
});

el.headerCharacterName.addEventListener('click', () => setSceneTab('character'));
el.openShipView.addEventListener('click', () => setWorkspaceView(activeWorkspaceView === 'ship' ? 'play' : 'ship'));
el.openCampaignView.addEventListener('click', () => setWorkspaceView(activeWorkspaceView === 'campaign' ? 'play' : 'campaign'));
el.openThreadsView.addEventListener('click', () => setWorkspaceView(activeWorkspaceView === 'threads' ? 'play' : 'threads'));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && campaignPlayActive() && activeWorkspaceView !== 'play' && !document.querySelector('dialog[open]')) setWorkspaceView('play');
});
document.querySelectorAll('.sheet-close').forEach((button) => button.addEventListener('click', () => setWorkspaceView('play')));
el.sheetWeapon.addEventListener('change', () => saveCharacterSheetState(
  { weaponKey: el.sheetWeapon.value },
  `Ready weapon set: ${getPersonalWeapon(el.sheetWeapon.value).name}`
));
el.sheetArmor.addEventListener('change', () => saveCharacterSheetState(
  { armor: el.sheetArmor.value },
  `Worn armor set: ${el.sheetArmor.value}`
));
el.sheetNotes.addEventListener('change', () => saveCharacterSheetState(
  { notes: el.sheetNotes.value },
  'Character notes updated'
));
el.toggleSystemDetails.addEventListener('click', toggleSystemDetails);

let pendingQuickSlots = [];

function renderQuickSlotChoices() {
  const names = characterSkillNames();
  el.quickSlotChoices.replaceChildren();
  for (const skillName of names.slice().sort((a, b) => a.localeCompare(b))) {
    const level = Number(gameplayDocument.skills[skillName] ?? 0);
    const selected = pendingQuickSlots.includes(skillName);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `quick-slot-choice${selected ? ' selected' : ''}`;
    button.textContent = `${skillName}-${level}`;
    button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    button.disabled = !selected && pendingQuickSlots.length >= QUICK_SLOT_LIMIT;
    button.addEventListener('click', () => {
      pendingQuickSlots = selected
        ? pendingQuickSlots.filter((entry) => entry !== skillName)
        : [...pendingQuickSlots, skillName];
      renderQuickSlotChoices();
    });
    el.quickSlotChoices.append(button);
  }
  el.quickSlotCount.textContent = `${pendingQuickSlots.length} / ${QUICK_SLOT_LIMIT} SELECTED`;
}

function openQuickSlotDialog() {
  if (!campaignPlayActive() || !characterSkillNames().length) return;
  pendingQuickSlots = quickSkillNames();
  renderQuickSlotChoices();
  el.quickSlotDialog.showModal();
}

el.headerAllSkills.addEventListener('click', openQuickSlotDialog);
el.quickSlotClose.addEventListener('click', () => el.quickSlotDialog.close());
el.quickSlotCancel.addEventListener('click', () => el.quickSlotDialog.close());
el.quickSlotReset.addEventListener('click', () => {
  pendingQuickSlots = defaultQuickSlots(characterSkillNames());
  renderQuickSlotChoices();
});
el.quickSlotForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const names = characterSkillNames();
  const slots = normalizeQuickSlots(pendingQuickSlots, names);
  quickSlotStore?.write(quickSlotCharacterId(), slots, names);
  el.quickSlotDialog.close();
  renderCampaignHeader();
  setStatus(`QUICK SLOTS SET: ${slots.length ? slots.join(' / ').toUpperCase() : 'DEFAULTS'}`, 'ok');
});

for (const button of el.sceneTabs) {
  button.addEventListener('click', () => setSceneTab(button.dataset.sceneTab));
}
el.sceneShipName.addEventListener('click', () => setWorkspaceView(activeWorkspaceView === 'ship' ? 'play' : 'ship'));

el.rollDialogClose.addEventListener('click', closeRollDialog);
el.rollCancel.addEventListener('click', closeRollDialog);
el.rollDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeRollDialog();
});
el.combatSetupClose.addEventListener('click', closeCombatSetupDialog);
el.combatSetupCancel.addEventListener('click', closeCombatSetupDialog);
el.encounterPlacementClose.addEventListener('click', closeEncounterPlacementDialog);
el.encounterPlacementCancel.addEventListener('click', closeEncounterPlacementDialog);
el.encounterPlacementDialog.addEventListener('cancel', (event) => { event.preventDefault(); closeEncounterPlacementDialog(); });
el.encounterPlacementForm.addEventListener('submit', (event) => {
  event.preventDefault();
  try { if (pendingEncounterPlacement?.sceneId) placeActorOnScene(); else placeRosterActorInEncounter(); } catch (error) { console.error(error); setStatus(error?.message ?? String(error), 'error'); }
});
el.encounterConditionClose.addEventListener('click', closeEncounterConditionDialog);
el.encounterConditionCancel.addEventListener('click', closeEncounterConditionDialog);
el.encounterConditionDialog.addEventListener('cancel', (event) => { event.preventDefault(); closeEncounterConditionDialog(); });
el.encounterConditionForm.addEventListener('submit', (event) => {
  event.preventDefault();
  try { updateEncounterCondition(); } catch (error) { console.error(error); setStatus(error?.message ?? String(error), 'error'); }
});
el.encounterConditionClear.addEventListener('click', () => {
  try { updateEncounterCondition({ clear: true }); } catch (error) { console.error(error); setStatus(error?.message ?? String(error), 'error'); }
});
el.combatAddEnemyType.addEventListener('click', addCombatEnemyGroup);
el.combatAddRosterActor.addEventListener('click', () => addRosterActorToCombatSetup());
el.rosterNewActor.addEventListener('click', () => openNpcActorDialog());
el.npcActorClose.addEventListener('click', closeNpcActorDialog);
el.npcActorCancel.addEventListener('click', closeNpcActorDialog);
el.npcActorDialog.addEventListener('cancel', (event) => { event.preventDefault(); closeNpcActorDialog(); });
el.npcType.addEventListener('change', () => { if (el.npcType.value === 'robot') { el.npcBody.value = 'robotic'; if (el.npcSpecies.value === 'Human') el.npcSpecies.value = 'Robot'; } });
el.npcPortrait.addEventListener('change', () => {
  const file = el.npcPortrait.files?.[0];
  if (!file) { pendingNpcPortraitAsset = null; return; }
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { el.npcPortrait.value = ''; return setStatus('PORTRAIT MUST BE PNG, JPEG, OR WEBP', 'error'); }
  if (file.size > 400 * 1024) { el.npcPortrait.value = ''; return setStatus('PORTRAIT MUST BE 400 KiB OR SMALLER', 'error'); }
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    try {
      pendingNpcPortraitAsset = createMediaAssetDocument({ name: file.name, mimeType: file.type, dataUrl: reader.result, altText: `${el.npcName.value || 'NPC'} portrait` });
      el.npcPortraitStatus.textContent = `${file.name} / ${Math.ceil(file.size / 1024)} KiB`;
    } catch (error) { pendingNpcPortraitAsset = null; setStatus(error?.message ?? String(error), 'error'); }
  });
  reader.readAsDataURL(file);
});
el.npcActorForm.addEventListener('submit', (event) => {
  event.preventDefault();
  try { saveNpcActorFromForm(); } catch (error) { console.error(error); setStatus(error?.message ?? String(error), 'error'); }
});
el.encounterZoomOut.addEventListener('click', () => encounterCanvas().camera.zoomBy(1 / 1.5));
el.encounterZoomIn.addEventListener('click', () => encounterCanvas().camera.zoomBy(1.5));
el.encounterZoomFit.addEventListener('click', fitEncounterMap);
el.encounterGridToggle.addEventListener('click', () => {
  encounterGridHidden = !encounterGridHidden;
  try { window.localStorage?.setItem(ENCOUNTER_GRID_VISIBILITY_KEY, encounterGridHidden ? 'hidden' : 'shown'); } catch { /* local preference only */ }
  renderEncounter();
});
el.encounterGridScale.addEventListener('change', () => {
  const active = activeEncounterAtCurrentSystem();
  if (!active) return;
  updateEncounterDocument(active.identity.id, (doc) => setEncounterGridScale(doc, Number(el.encounterGridScale.value)).encounter);
});
{
  el.encounterMapViewport.addEventListener('pointerdown', (event) => {
    // Opening a cascade is a click inside the menu, not a dismissal of it.
    if (event.target.closest?.('#encounter-token-menu')) return;
    hideEncounterTokenOverlays();
    if (event.target.closest?.('[data-scene-token]')) return;
    if (event.button !== 0) return;
    clearEncounterCanvasSelection({ targets: false });
    renderEncounter();
  });
  el.encounterMapViewport.addEventListener('contextmenu', (event) => {
    if (encounterCanvas().contextMenuSuppressed()) { event.preventDefault(); return; }
    showEncounterMapMenu(event);
  });

  // T targets whatever the pointer is over; Shift+T adds it to the target set
  // instead of replacing it, so several enemies can be marked at once.
  // v0.73.4: the key works wherever the pointer is over a token, not only when
  // the viewport happens to hold focus — the shared canvas keeps focus where
  // it was on pointerdown, so a token click no longer focused this element.
  const typing = (event) => {
    const tag = event.target?.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.target?.isContentEditable;
  };
  document.addEventListener('keydown', (event) => {
    if (typing(event) || el.encounterMapViewport.contains(event.target)) return;
    if (!hoveredEncounterCombatantId || (event.key !== 't' && event.key !== 'T')) return;
    el.encounterMapViewport.dispatchEvent(new KeyboardEvent('keydown', { key: event.key, shiftKey: event.shiftKey, bubbles: false, cancelable: true }));
    event.preventDefault();
  });
  el.encounterMapViewport.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      clearEncounterCanvasSelection();
      hideEncounterTokenOverlays();
      renderEncounter();
      return;
    }
    if (event.key !== 't' && event.key !== 'T') return;
    const encounter = latestEncounterAtCurrentSystem();
    if (!encounter) return;
    const actor = selectedEncounterActor(encounter);
    const candidate = encounter.combatants.find((entry) => entry.id === hoveredEncounterCombatantId)
      ?? encounter.combatants.find((entry) => actor && entry.side !== actor.side && (encounter.status !== 'active' || entry.status === 'active'));
    if (!candidate || !actor) {
      setStatus('HOVER A VISIBLE TOKEN TO TARGET IT', 'error');
      return;
    }
    event.preventDefault();
    if (encounterExtraTargetIds.has(candidate.id)) {
      // The shared toggle helper removes an already marked target.
    }
    toggleEncounterTarget(encounter.identity.id, candidate.id, { additive: true });
    setStatus(`${encounterExtraTargetIds.has(candidate.id) ? 'TARGET' : 'UNTARGET'} ${candidate.name.toUpperCase()}`, 'ok');
  });
}
el.combatSetupDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeCombatSetupDialog();
});
el.combatSetupForm.addEventListener('submit', (event) => {
  event.preventDefault();
  try {
    startManualEncounter();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
});
el.rollDialogForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!pendingRoll) return closeRollDialog();
  try {
    const modifier = Number.parseInt(el.rollModifier.value || '0', 10);
    if (!Number.isInteger(modifier)) throw new Error('modifier must be an integer');
    if (pendingRoll.kind === 'situation-skill') {
      const { situationId, choiceId } = pendingRoll;
      resolveSituationSkillChoice(situationId, choiceId, modifier);
      return;
    }
    if (pendingRoll.kind === 'encounter-attack') {
      // The ticked p.31 conditions are part of the throw; MODIFIER is whatever
      // the referee adds beyond them.
      resolveActiveEncounterAction('attack', modifier, pendingRoll.targetId, pendingRoll.actorId);
      return;
    }
    executeAdHocRoll();
    closeRollDialog();
    renderCampaignHeader();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
});

el.mapZoomOut.addEventListener('click', () => setSubsectorZoom(subsectorZoom - SUBSECTOR_ZOOM_STEP));
el.mapZoomIn.addEventListener('click', () => setSubsectorZoom(subsectorZoom + SUBSECTOR_ZOOM_STEP));
el.mapZoomFit.addEventListener('click', () => setSubsectorZoom(1));

el.operationsTabPort.addEventListener('click', () => setOperationsDeskTab('port'));
el.operationsTabTrade.addEventListener('click', () => setOperationsDeskTab('trade'));
el.operationsTabJobs.addEventListener('click', () => setOperationsDeskTab('jobs'));
el.contextTakeover.addEventListener('click', () => setOperationsDeskTab('port'));
el.operationsTabRoster.addEventListener('click', () => setOperationsDeskTab('roster'));

el.newCampaign.addEventListener('click', newCampaign);
el.saveCampaign.addEventListener('click', saveCampaignLocal);
el.loadCampaign.addEventListener('click', loadSavedCampaign);
el.importCampaign.addEventListener('click', () => {
  el.loadFile.dataset.scope = 'campaign';
  el.loadFile.click();
});
el.addCharacterToCampaign.addEventListener('click', () => {
  el.loadFile.dataset.scope = 'character-to-campaign';
  el.loadFile.click();
});
el.exportCampaign.addEventListener('click', exportCampaignPortable);

el.saveCharacter.addEventListener('click', saveCharacter);
el.loadCharacter.addEventListener('click', () => {
  el.loadFile.dataset.scope = 'any';
  el.loadFile.click();
});
el.loadFile.addEventListener('change', () => loadDocument(el.loadFile.files?.[0], {
  campaignOnly: el.loadFile.dataset.scope === 'campaign',
  addToCampaign: el.loadFile.dataset.scope === 'character-to-campaign'
}));

setActivityContext();
setActivityPanelVisible(activityPanelVisible);
render();
window.setInterval(updateAutosaveStatus, 10000);
if (!registry) setStatus('READY / LOCAL CAMPAIGN STORAGE UNAVAILABLE', 'error');

// Sign-in runs after the client is already usable, so a slow or unreachable
// SDK never delays play. Every render reflects whatever identity is current.
el.publishCampaignButton?.addEventListener('click', publishCurrentCampaign);
el.publishViewButton?.addEventListener('click', publishCurrentEncounterView);
el.openPlayers?.addEventListener('click', openPlayersDialog);
el.playersSeat?.addEventListener('click', seatPlayerFromDialog);
el.playersClose?.addEventListener('click', () => el.playersDialog.close());
el.playersNewInvite?.addEventListener('click', mintInvite);
el.reloadCampaignCloud?.addEventListener('click', reloadCampaignFromCloud);
el.chatForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = el.chatInput.value.trim();
  if (!text) return;
  if (!campaignIsPublished(campaignDocument) || !currentUserId()) {
    // Offline the box still rolls, privately, and still notes.
    const parsed = parseRollFormula(text);
    if (parsed) privateRoll(text); else logActivity('NOTE', text);
    el.chatInput.value = '';
    return;
  }
  postChat(interpretChatInput(text, { uid: currentUserId(), name: chatAuthorName() }));
  el.chatInput.value = '';
});
for (const button of document.querySelectorAll('.sidebar-tab')) {
  button.addEventListener('click', () => {
    if (button.dataset.sidebarTab === sidebarTab && !sidebarCollapsed) { sidebarCollapsed = true; applySidebar(); return; }
    setSidebarTab(button.dataset.sidebarTab);
  });
}
el.sceneClose?.addEventListener('click', () => el.sceneDialog.close());
el.sceneSave?.addEventListener('click', createSceneFromDialog);
el.sceneSquares?.addEventListener('input', updateSceneSizeNote);
el.sceneScale?.addEventListener('change', updateSceneSizeNote);
onAuthChange(() => { renderAccount(); renderPublishPanel(); scheduleCampaignHomeSave(); });

// v0.68.0: the referee client is no longer a front door. Opened by [ RUN ]
// from enter.html it loads that campaign from its home; opened cold and
// signed out it sends you to enter.html, unless ?local=1 asks for the old
// offline behaviour. ?new=1 starts a fresh character for a new campaign.
const bootParams = new URLSearchParams(window.location.search);
initAuth().then(async () => {
  render();
  const wanted = bootParams.get('campaign');
  const startWith = bootParams.get('start');
  const signedIn = Boolean(currentUserId());
  // Nothing to run and nothing to start: this is not the front door.
  if (!wanted && !startWith && !bootParams.has('local') && authStatus().status !== 'unavailable') {
    window.location.replace(new URL('enter.html', window.location.href).toString());
    return;
  }
  if (startWith) {
    try { await startCampaignFromRecord(startWith); }
    catch (error) { console.error(error); setStatus(error?.message ?? String(error), 'error'); }
    return;
  }
  if (!wanted) return;
  try {
    if (signedIn && await openCampaignFromHome(wanted)) return;
    const cached = registry?.get(wanted);
    if (cached) {
      forgetCampaignHome();
      restoreCampaignFromRegistry(cached);
      setStatus(signedIn ? 'NO CLOUD COPY YET / OPENED FROM THIS BROWSER' : 'OPENED FROM THIS BROWSER / SIGN IN TO SAVE TO THE CLOUD', 'ok');
      render();
      return;
    }
    setStatus(`CAMPAIGN ${wanted.toUpperCase()} IS NOT IN THE CLOUD OR IN THIS BROWSER`, 'error');
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
});

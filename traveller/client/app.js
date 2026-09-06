import {
  CHARGEN_ACTIONS,
  CHARGEN_PHASES,
  formatUPP,
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
  PERSONAL_WEAPONS,
  PERSONAL_ARMOR_TYPES,
  SERVICES,
  SKILL_TABLES,
  MUSTERING_OUT_TABLES,
  AGING_BANDS
} from '../../packages/classic-traveller-rules/index.js';

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
  chargenTablesForPhase,
  buildServiceHistory,
  buildSituationRecord,
  buildSystemRecord,
  helpForTopic,
  nobleTitleLabel,
  serviceName,
  PHASE_LABELS,
  skillTableName
} from './ui-model.js';

import {
  TRAVELLER_DOCUMENT_KINDS,
  loadTravellerDocument
} from './document-loader.js';

import {
  generateCharacterName,
  generateShipName,
  generateShipRegistry
} from './generators.js';

import {
  SUBSECTOR_SVG_GEOMETRY,
  flatTopHexPoints,
  formatSvgPoints,
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
  createCampaignDocument,
  refreshCampaignDocumentRefs,
  updateCampaignIdentity,
  updateCampaignLocation,
  updateCampaignTime,
  speculativeLotPurchasedQuantity,
  recordSpeculativeLotPurchase
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
  encounterPairRange,
  encounterMapDistance,
  declaredTargetCounts,
  addEncounterCombatantFromActor,
  removeEncounterCombatant,
  setEncounterCombatantCondition
} from '../src/encounter-document.js';

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
  encounterActions: document.querySelector('#encounter-actions'),
  encounterRailSection: document.querySelector('#combat-rail-section'),
  encounterDmPanel: document.querySelector('#encounter-dm-panel'),
  encounterSelectionStatus: document.querySelector('#encounter-selection-status'),
  encounterMapViewport: document.querySelector('#encounter-map-viewport'),
  encounterMap: document.querySelector('#encounter-map'),
  encounterZoomOut: document.querySelector('#encounter-zoom-out'),
  encounterZoomLabel: document.querySelector('#encounter-zoom-label'),
  encounterZoomIn: document.querySelector('#encounter-zoom-in'),
  encounterZoomFit: document.querySelector('#encounter-zoom-fit'),
  encounterPartyRoster: document.querySelector('#encounter-party-roster'),
  encounterRosterPanel: document.querySelector('#encounter-roster-panel'),
  encounterRosterSummary: document.querySelector('#encounter-roster-summary'),
  encounterRoster: document.querySelector('#encounter-roster'),
  encounterTokenTooltip: document.querySelector('#encounter-token-tooltip'),
  encounterTokenMenu: document.querySelector('#encounter-token-menu'),
  operationsTabPort: document.querySelector('#operations-tab-port'),
  operationsTabTrade: document.querySelector('#operations-tab-trade'),
  operationsTabJobs: document.querySelector('#operations-tab-jobs'),
  operationsTabRoster: document.querySelector('#operations-tab-roster'),
  rosterSection: document.querySelector('#roster-section'),
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
let activityLogDocument = null;
let playerSession = null;
let activityFilter = 'play';
let activityOrder = 'newest';
let activityPanelVisible = true;
let lastAutosaveAt = null;
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
let pendingEncounterPlacement = null;
let pendingEncounterConditionCombatantId = null;
const ENCOUNTER_MAP_WIDTH = 1280;
const ENCOUNTER_MAP_HEIGHT = 800;
const ENCOUNTER_MAP_MIN_ZOOM = 0.5;
const ENCOUNTER_MAP_MAX_ZOOM = 4;
let encounterMapZoom = 1;
let encounterMapView = { x: 0, y: 0, width: ENCOUNTER_MAP_WIDTH, height: ENCOUNTER_MAP_HEIGHT };
let encounterMapViewFrame = 0;
let framedEncounterId = null;
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
  row.append(message);
}

function renderActivity() {
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
  const entries = activityFilter === 'play'
    ? allEntries.filter((entry) => entry.category !== 'SYSLOG')
    : allowed ? allEntries.filter((entry) => allowed.has(entry.category)) : allEntries;
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
  el.autosaveStatus.textContent = `AUTOSAVED ${age}`;
  el.autosaveStatus.title = `Campaign changes are saved automatically in this browser. Last save: ${new Date(lastAutosaveAt).toLocaleTimeString()}.`;
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

const HEADER_CHARACTERISTICS = Object.freeze([
  ['STR', 'STRENGTH'],
  ['DEX', 'DEXTERITY'],
  ['END', 'ENDURANCE'],
  ['INT', 'INTELLIGENCE'],
  ['EDU', 'EDUCATION'],
  ['SOC', 'SOCIAL STANDING']
]);

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

function characterPostureLabel() {
  const encounter = activeEncounterAtCurrentSystem();
  if (!encounter || !gameplayDocument) return '';
  const me = (encounter.combatants ?? []).find((entry) => entry.id === gameplayDocument.identity.id)
    ?? (encounter.combatants ?? []).find((entry) => entry.playerCharacter && entry.status === 'active');
  if (!me) return '';
  const parts = [];
  if (me.evading) parts.push('EVADING');
  if (Number.isInteger(me.blows) && me.blows > 0) parts.push(`BLOWS ${me.blows}`);
  return parts.join(' / ');
}

function characterHealthLabel(document = gameplayDocument) {
  if (!document) return 'UNAVAILABLE';
  if (!document.status.alive) return 'DEAD';
  if (document.status.consciousness === 'unconscious') return 'UNCONSCIOUS';
  const wounded = ['STR', 'DEX', 'END'].some((key) => document.current[key] < document.characteristics[key]);
  return wounded ? 'WOUNDED' : 'READY';
}

function appendSheetDatum(list, label, value) {
  const term = document.createElement('dt');
  term.textContent = label;
  const detail = document.createElement('dd');
  detail.textContent = value;
  list.append(term, detail);
}

function renderSheetBenefitRows(rows) {
  el.sheetBenefits.replaceChildren();
  for (const [label, value] of rows) {
    const item = document.createElement('div');
    item.className = 'sheet-benefit-item';
    const heading = document.createElement('span');
    heading.textContent = label;
    const detail = document.createElement('strong');
    detail.textContent = value;
    item.append(heading, detail);
    el.sheetBenefits.append(item);
  }
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
// playable sheet uses, so the scene is the sheet from the first roll.
function renderChargenSheet() {
  if (campaignPlayActive() || !character) return;
  const inProgress = character.phase !== CHARGEN_PHASES.COMPLETE && character.phase !== CHARGEN_PHASES.DEAD;
  el.sheetName.textContent = character.name || '(UNNAMED)';
  el.sheetDate.textContent = inProgress ? 'IN GENERATION' : (character.phase === CHARGEN_PHASES.DEAD ? 'DECEASED' : 'FINAL');
  el.sheetUpp.textContent = formatUPP(character.characteristics);
  el.sheetRank.textContent = character.rankTitle || (character.service ? 'NO RANK' : '--');
  el.sheetAge.textContent = String(character.age);
  el.sheetWorld.textContent = character.service ? serviceName(character.service).toUpperCase() : 'NO SERVICE';
  const phaseLabel = PHASE_LABELS[character.phase] ?? character.phase.toUpperCase();
  el.sheetHealthStatus.textContent = `PHASE ${phaseLabel}${character.currentTerm ? ` // TERM ${character.currentTerm.number}` : ''}${character.drafted ? ' // DRAFTED' : ''}`;

  el.sheetCharacteristics.replaceChildren();
  const createdUpp = character.history?.find((entry) => entry.type === 'character-created')?.upp;
  const original = typeof createdUpp === 'string' && createdUpp.length === 6
    ? Object.fromEntries(['STR', 'DEX', 'END', 'INT', 'EDU', 'SOC'].map((k, i) => [k, parseInt(createdUpp[i], 36)]))
    : character.characteristics;
  for (const [key, label] of HEADER_CHARACTERISTICS) {
    const value = character.characteristics[key];
    const base = original[key];
    const box = document.createElement('div');
    box.className = `sheet-characteristic${value < base ? ' injured' : ''}`;
    box.title = `${label} ${value}`;
    const code = document.createElement('span'); code.className = 'sheet-stat-code'; code.textContent = key;
    const strong = document.createElement('strong'); strong.className = 'sheet-stat-value'; strong.textContent = String(value);
    const note = document.createElement('span'); note.className = 'sheet-stat-current'; note.textContent = value === base ? 'CURRENT' : `WAS ${base}`;
    box.append(code, strong, note);
    el.sheetCharacteristics.append(box);
  }

  el.sheetService.replaceChildren();
  appendSheetDatum(el.sheetService, 'SERVICE', character.service ? serviceName(character.service).toUpperCase() : 'UNASSIGNED');
  appendSheetDatum(el.sheetService, 'TERMS', `${character.terms}${character.currentTerm ? ` (TERM ${character.currentTerm.number} IN PROGRESS)` : ''}`);
  appendSheetDatum(el.sheetService, 'YEARS SERVED', String(character.yearsServed));
  appendSheetDatum(el.sheetService, 'RANK', character.rankTitle || 'NONE');
  appendSheetDatum(el.sheetService, 'NOBLE TITLE', nobleTitleLabel(character.characteristics.SOC));
  appendSheetDatum(el.sheetService, 'DRAFTED', character.drafted ? 'YES' : 'NO');
  if (character.retired) appendSheetDatum(el.sheetService, 'RETIREMENT PAY', formatCr(character.retirementPayAnnual));

  el.sheetWeapon.replaceChildren();
  el.sheetArmor.replaceChildren();
  el.sheetEquipment.textContent = character.materialBenefits.filter((entry) => entry.type === 'weapon' || entry.category).map((entry) => entry.name).join(' / ') || 'NONE YET';

  el.sheetSkills.replaceChildren();
  const skills = Object.entries(character.skills).sort(([left], [right]) => left.localeCompare(right));
  const lastRoll = character.currentTerm?.skillRolls?.at?.(-1) ?? null;
  const justGained = lastRoll ? (lastRoll.specialization?.specialization ?? (lastRoll.outcome?.type === 'skill' ? lastRoll.outcome.name : null)) : null;
  if (!skills.length) el.sheetSkills.textContent = 'NONE YET';
  for (const [name, level] of skills) {
    const chip = document.createElement('span');
    chip.className = `sheet-skill${name === justGained ? ' sheet-skill-new' : ''}`;
    chip.textContent = `${name}-${level}`;
    el.sheetSkills.append(chip);
  }
  if (character.skillsDue > 0) {
    const pending = document.createElement('span');
    pending.className = 'sheet-skill sheet-skill-pending';
    pending.textContent = `${character.skillsDue} PENDING`;
    el.sheetSkills.append(pending);
  }

  const benefits = character.materialBenefits.map((entry) => entry.name);
  renderSheetBenefitRows(character.musterOut || character.credits || benefits.length
    ? [
        ['CREDITS', formatCr(character.credits)],
        ['BENEFITS', benefits.join(' / ') || 'NONE'],
        ['MUSTER ROLLS', character.musterOut ? `${character.musterOut.remainingRolls ?? 0} REMAINING` : 'NOT YET REACHED'],
      ]
    : [['MUSTERING OUT', 'NOT YET REACHED']]);
  el.sheetHistoryRecord.textContent = buildServiceHistory(character);
  if (el.sheetNotes) el.sheetNotes.value = '';
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
      ? `${activityDateLabel()} / WEEK ${campaignWeekKey(campaignDocument)}${deadline === null ? '' : ` / DEADLINE ${deadline}d`}`
      : '--';
  }
  el.newCharacterFromCampaign.hidden = !active;
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
    const value = ['STR', 'DEX', 'END'].includes(key) ? gameplayDocument.current[key] : gameplayDocument.characteristics[key];
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

function setSceneTab(tab) {
  if (!['character', 'system', 'combat'].includes(tab)) return;
  activeSceneTab = tab;
  if (activeWorkspaceView !== 'play') activeWorkspaceView = 'play';
  applyCampaignLayout();
  renderSelectedSystemSummary();
  // COMBAT owns both the scene and its rail, so the rail follows the tab.
  renderEncounter();
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
  const value = Number(['STR', 'DEX', 'END'].includes(characteristic)
    ? gameplayDocument.current?.[characteristic]
    : gameplayDocument.characteristics?.[characteristic] ?? 0);
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
    activityLogs: activityLogDocument ? [activityLogDocument] : []
  });
}

function persistCampaignState() {
  syncCampaignRefs();
  persistGameplayDocuments();
  if (registry && campaignDocument) registry.put(campaignDocument);
  markAutosaved();
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
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attributes)) {
    node.setAttribute(key, String(value));
  }
  return node;
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

function appendBaseMarkers(group, system, center) {
  const bases = system?.bases ?? {};
  if (!bases.scout && !bases.naval) return;
  const radius = SUBSECTOR_SVG_GEOMETRY.radius;
  let x = center.x + radius * 0.47;
  const y = center.y - (Math.sqrt(3) * radius) / 2 + 11;

  if (bases.naval) {
    const naval = createSvgElement('g', { class: 'subsector-base-marker naval-base-marker' });
    const navalTitle = createSvgElement('title');
    navalTitle.textContent = 'Naval Base';
    naval.append(navalTitle);
    const diamond = createSvgElement('path', {
      d: `M ${x} ${y - 4.2} L ${x + 4.2} ${y} L ${x} ${y + 4.2} L ${x - 4.2} ${y} Z`,
      class: 'subsector-base-icon-shape'
    });
    const cross = createSvgElement('path', {
      d: `M ${x - 5.2} ${y} H ${x + 5.2} M ${x} ${y - 5.2} V ${y + 5.2}`,
      class: 'subsector-base-icon-line'
    });
    naval.append(diamond, cross);
    group.append(naval);
    x -= 12;
  }

  if (bases.scout) {
    const scout = createSvgElement('g', { class: 'subsector-base-marker scout-base-marker' });
    const scoutTitle = createSvgElement('title');
    scoutTitle.textContent = 'Scout Base';
    scout.append(scoutTitle);
    const triangle = createSvgElement('path', {
      d: `M ${x} ${y - 5} L ${x + 5} ${y + 4} L ${x - 5} ${y + 4} Z`,
      class: 'subsector-base-icon-shape'
    });
    scout.append(triangle);
    group.append(scout);
  }
}

function renderSubsectorSvg({ current, selected, reachable }) {
  const viewBox = subsectorSvgViewBox(SUBSECTOR_COLUMNS, SUBSECTOR_ROWS, SUBSECTOR_SVG_GEOMETRY);
  const svg = createSvgElement('svg', {
    class: 'subsector-svg',
    viewBox: `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`,
    role: 'group',
    'aria-label': `${FAR_MERIDIAN_SUBSECTOR.name} subsector hex map`,
    preserveAspectRatio: 'xMidYMid meet'
  });

  const systemByHex = new Map(FAR_MERIDIAN_SUBSECTOR.systems.map((system) => [system.hex, system]));
  for (let column = 1; column <= SUBSECTOR_COLUMNS; column += 1) {
    for (let row = 1; row <= SUBSECTOR_ROWS; row += 1) {
      const hex = formatSubsectorHex(column, row);
      const system = systemByHex.get(hex) ?? null;
      const center = subsectorHexCenter(column, row, SUBSECTOR_SVG_GEOMETRY);
      const points = formatSvgPoints(flatTopHexPoints(center, SUBSECTOR_SVG_GEOMETRY.radius));
      const group = createSvgElement('g', { class: 'subsector-hex' });
      const polygon = createSvgElement('polygon', { points, class: 'subsector-hex-shape' });
      group.append(polygon);

      const coordinate = createSvgElement('text', {
        x: center.x - SUBSECTOR_SVG_GEOMETRY.radius * 0.63,
        y: center.y - (Math.sqrt(3) * SUBSECTOR_SVG_GEOMETRY.radius) / 2 + 9,
        class: 'subsector-hex-coordinate'
      });
      coordinate.textContent = hex;
      group.append(coordinate);

      if (!system) {
        group.classList.add('empty-hex');
        svg.append(group);
        continue;
      }

      group.classList.add('system-hex');
      if (current && reachable.has(system.id)) group.classList.add('reachable');
      if (current?.id === system.id) group.classList.add('current');
      if (selected?.id === system.id) group.classList.add('selected');

      const relation = current?.id === system.id
        ? 'current system'
        : reachable.has(system.id)
          ? `${reachable.get(system.id)} parsecs, in range`
          : current
            ? 'out of range'
            : 'available starting system';
      group.setAttribute('role', 'button');
      group.setAttribute('tabindex', '0');
      const baseNames = [system.bases?.scout ? 'Scout Base' : null, system.bases?.naval ? 'Naval Base' : null].filter(Boolean);
      const baseLabel = baseNames.length ? `, ${baseNames.join(' and ')}` : '';
      group.setAttribute('aria-label', `${system.name}, hex ${hex}, ${relation}${baseLabel}`);
      group.dataset.systemId = system.id;

      const title = createSvgElement('title');
      title.textContent = `${system.name} / ${system.mainWorld.name} / ${system.mainWorld.uwp} / ${hex} / ${relation}${baseNames.length ? ` / ${baseNames.join(' + ')}` : ''}`;
      group.append(title);

      const marker = createSvgElement('text', {
        x: center.x,
        y: center.y + 3,
        class: 'subsector-system-marker',
        'text-anchor': 'middle'
      });
      marker.textContent = current?.id === system.id ? '◆' : '●';
      group.append(marker);

      const lines = splitSystemName(system.name);
      lines.forEach((line, index) => {
        const label = createSvgElement('text', {
          x: center.x,
          y: center.y + 17 + index * 10,
          class: 'subsector-system-name',
          'text-anchor': 'middle'
        });
        label.textContent = line;
        group.append(label);
      });

      appendBaseMarkers(group, system, center);

      const select = () => selectSubsectorSystem(system.id);
      group.addEventListener('click', select);
      group.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        select();
      });
      svg.append(group);
    }
  }
  return svg;
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
  const active = encounter?.combatants.filter((entry) => entry.side === 'opposition' && entry.status === 'active') ?? [];
  let selected = active.find((entry) => entry.id === selectedEncounterTargetId) ?? null;
  if (!selected) {
    selected = active[0] ?? null;
    selectedEncounterTargetId = selected?.id ?? null;
  }
  return selected;
}

function selectedEncounterActor(encounter) {
  const declared = new Set(encounter?.roundState?.declaredActions?.map((entry) => entry.actorId) ?? []);
  const active = encounter?.combatants.filter((entry) => entry.side === 'party' && entry.status === 'active') ?? [];
  const awaiting = active.filter((entry) => !declared.has(entry.id));
  let selected = awaiting.find((entry) => entry.id === selectedEncounterActorId) ?? awaiting[0] ?? active[0] ?? null;
  selectedEncounterActorId = selected?.id ?? null;
  return selected;
}

function setEncounterActor(encounterId, actorId) {
  const encounter = encounterDocuments.find((entry) => entry.identity.id === encounterId);
  const declared = new Set(encounter?.roundState?.declaredActions?.map((entry) => entry.actorId) ?? []);
  const actor = encounter?.combatants.find((entry) => entry.id === actorId && entry.side === 'party' && entry.status === 'active' && !declared.has(entry.id));
  if (!actor) return;
  selectedEncounterActorId = actor.id;
  renderEncounter();
}

function setEncounterTarget(encounterId, targetId) {
  const encounter = encounterDocuments.find((entry) => entry.identity.id === encounterId);
  const target = encounter?.combatants.find((entry) => entry.id === targetId && entry.side === 'opposition' && entry.status === 'active');
  if (!target) return;
  selectedEncounterTargetId = target.id;
  renderEncounter();
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

function clampEncounterMapView(view = encounterMapView) {
  const width = ENCOUNTER_MAP_WIDTH / encounterMapZoom;
  const height = ENCOUNTER_MAP_HEIGHT / encounterMapZoom;
  const x = width >= ENCOUNTER_MAP_WIDTH
    ? (ENCOUNTER_MAP_WIDTH - width) / 2
    : Math.max(0, Math.min(ENCOUNTER_MAP_WIDTH - width, view.x));
  const y = height >= ENCOUNTER_MAP_HEIGHT
    ? (ENCOUNTER_MAP_HEIGHT - height) / 2
    : Math.max(0, Math.min(ENCOUNTER_MAP_HEIGHT - height, view.y));
  return { x, y, width, height };
}

function applyEncounterMapView() {
  encounterMapView = clampEncounterMapView(encounterMapView);
  el.encounterMap.setAttribute('viewBox', `${encounterMapView.x} ${encounterMapView.y} ${encounterMapView.width} ${encounterMapView.height}`);
  el.encounterZoomLabel.textContent = `${Math.round(encounterMapZoom * 100)}%`;
}

function scheduleEncounterMapView() {
  if (encounterMapViewFrame) return;
  encounterMapViewFrame = window.requestAnimationFrame(() => {
    encounterMapViewFrame = 0;
    applyEncounterMapView();
  });
}

function flushEncounterMapView() {
  if (encounterMapViewFrame) {
    window.cancelAnimationFrame(encounterMapViewFrame);
    encounterMapViewFrame = 0;
  }
  applyEncounterMapView();
}

function encounterMapPoint(clientX, clientY) {
  const matrix = el.encounterMap.getScreenCTM();
  if (matrix) {
    const point = el.encounterMap.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    return point.matrixTransform(matrix.inverse());
  }
  const rect = el.encounterMap.getBoundingClientRect();
  const scale = Math.min(rect.width / encounterMapView.width, rect.height / encounterMapView.height) || 1;
  const offsetX = (rect.width - encounterMapView.width * scale) / 2;
  const offsetY = (rect.height - encounterMapView.height * scale) / 2;
  return {
    x: encounterMapView.x + (clientX - rect.left - offsetX) / scale,
    y: encounterMapView.y + (clientY - rect.top - offsetY) / scale
  };
}

function setEncounterMapZoom(value, anchor = null) {
  const nextZoom = Math.max(ENCOUNTER_MAP_MIN_ZOOM, Math.min(ENCOUNTER_MAP_MAX_ZOOM, value));
  const point = anchor
    ? encounterMapPoint(anchor.clientX, anchor.clientY)
    : { x: encounterMapView.x + encounterMapView.width / 2, y: encounterMapView.y + encounterMapView.height / 2 };
  const ratio = encounterMapZoom / nextZoom;
  encounterMapView = {
    x: point.x - (point.x - encounterMapView.x) * ratio,
    y: point.y - (point.y - encounterMapView.y) * ratio,
    width: ENCOUNTER_MAP_WIDTH / nextZoom,
    height: ENCOUNTER_MAP_HEIGHT / nextZoom
  };
  encounterMapZoom = nextZoom;
  scheduleEncounterMapView();
}

// Frame the combatants rather than the whole 32x20 workspace: at 100% the
// tokens are specks on a wide screen, and what matters is who is in the fight.
function frameEncounterCombatants(encounter) {
  const cellWidth = ENCOUNTER_MAP_WIDTH / encounter.map.columns;
  const cellHeight = ENCOUNTER_MAP_HEIGHT / encounter.map.rows;
  const xs = encounter.combatants.map((entry) => entry.position.column * cellWidth + cellWidth / 2);
  const ys = encounter.combatants.map((entry) => entry.position.row * cellHeight + cellHeight / 2);
  if (!xs.length) { fitEncounterMap(); return; }
  const padding = Math.max(cellWidth, cellHeight) * 2.5;
  const left = Math.min(...xs) - padding;
  const top = Math.min(...ys) - padding;
  const width = Math.max(Math.max(...xs) - Math.min(...xs) + padding * 2, cellWidth * 8);
  const height = Math.max(Math.max(...ys) - Math.min(...ys) + padding * 2, cellHeight * 6);
  encounterMapZoom = ENCOUNTER_MAP_WIDTH / width;
  encounterMapView = { x: left, y: top, width, height };
  flushEncounterMapView();
}

function fitEncounterMap() {
  encounterMapZoom = 1;
  encounterMapView = { x: 0, y: 0, width: ENCOUNTER_MAP_WIDTH, height: ENCOUNTER_MAP_HEIGHT };
  flushEncounterMapView();
}

function moveEncounterToken(encounterId, combatantId, column, row) {
  try {
    const index = encounterDocuments.findIndex((entry) => entry.identity.id === encounterId);
    if (index < 0) throw new Error('encounter is unavailable');
    const result = repositionEncounterCombatant(encounterDocuments[index], { combatantId, column, row });
    encounterDocuments[index] = result.encounter;
    if (result.entry) logActivity('COMBAT', result.entry.text);
    persistCampaignState();
    renderEncounter();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
}

function hideEncounterTokenOverlays() {
  el.encounterTokenTooltip.hidden = true;
  el.encounterTokenMenu.hidden = true;
}

function combatantHoverText(combatant) {
  const source = npcActorDocuments.find((entry) => entry.identity.id === combatant.sourceActorId);
  const identity = `${combatant.actorType.toUpperCase()} / ${combatant.bodyModel.toUpperCase()}`;
  return `${combatant.name.toUpperCase()} // ${combatant.side.toUpperCase()} // ${identity}\nBOOK 1 STATUS ${combatantRulesStatus(combatant).toUpperCase()} // CONDITIONS ${combatantConditionText(combatant)}\nSTR ${combatant.current.STR}/${combatant.characteristics.STR}  DEX ${combatant.current.DEX}/${combatant.characteristics.DEX}  END ${combatant.current.END}/${combatant.characteristics.END}\n${getPersonalWeapon(combatant.weaponKey).name} / SKILL-${combatantSkillLevel(combatant)} / ${combatant.armor.toUpperCase()}${source?.presentation.description ? `\n${source.presentation.description}` : ''}`;
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
  add(combatant.side === 'party' ? 'SELECT ACTOR' : 'SELECT TARGET', onSelect, combatant.status !== 'active');
  const actor = selectedEncounterActor(encounter);
  if (combatant.side === 'opposition') add('ATTACK TARGET', () => { setEncounterTarget(encounter.identity.id, combatant.id); openEncounterAttackDialog(encounter); }, !actor || combatant.status !== 'active');
  add('CHANGE CONDITION', () => openEncounterConditionDialog(encounter.identity.id, combatant.id));
  if (combatant.sourceActorId && npcActorDocuments.some((entry) => entry.identity.id === combatant.sourceActorId)) add('OPEN ROSTER ACTOR', () => { operationsDeskTab = 'roster'; render(); openNpcActorDialog(combatant.sourceActorId); });
  add('REMOVE FROM ENCOUNTER', () => removeCombatantFromActiveEncounter(encounter.identity.id, combatant.id));
  el.encounterTokenMenu.replaceChildren(...actions);
  positionEncounterOverlay(el.encounterTokenMenu, event, anchorElement);
  actions.find((button) => !button.disabled)?.focus({ preventScroll: true });
}

function showEncounterMapMenu(event) {
  event.preventDefault();
  if (event.target.closest?.('.encounter-token')) return;
  const encounter = activeEncounterAtCurrentSystem();
  if (!encounter) return;
  const point = encounterMapPoint(event.clientX, event.clientY);
  const column = Math.max(0, Math.min(encounter.map.columns - 1, Math.floor(point.x / (ENCOUNTER_MAP_WIDTH / encounter.map.columns))));
  const row = Math.max(0, Math.min(encounter.map.rows - 1, Math.floor(point.y / (ENCOUNTER_MAP_HEIGHT / encounter.map.rows))));
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
  if (result.combatant.side === 'party') selectedEncounterActorId = result.combatant.id;
  else selectedEncounterTargetId = result.combatant.id;
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

function attachEncounterTokenInteraction(group, encounter, combatant, { onSelect } = {}) {
  group.addEventListener('pointerenter', (event) => {
    el.encounterTokenTooltip.textContent = combatantHoverText(combatant);
    positionEncounterOverlay(el.encounterTokenTooltip, event);
    el.encounterTokenTooltip.hidden = false;
  });
  group.addEventListener('pointerleave', () => { el.encounterTokenTooltip.hidden = true; });
  group.addEventListener('contextmenu', (event) => showEncounterTokenMenu(event, encounter, combatant, onSelect, group));
  if (encounter.status !== 'active' || combatant.status !== 'active') return;
  let drag = null;
  group.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const point = encounterMapPoint(event.clientX, event.clientY);
    const cellWidth = ENCOUNTER_MAP_WIDTH / encounter.map.columns;
    const cellHeight = ENCOUNTER_MAP_HEIGHT / encounter.map.rows;
    const originX = combatant.position.column * cellWidth + cellWidth / 2;
    const originY = combatant.position.row * cellHeight + cellHeight / 2;
    drag = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originX,
      originY,
      grabX: point.x - originX,
      grabY: point.y - originY,
      previewX: originX,
      previewY: originY,
      moved: false,
      frame: 0
    };
    group.setPointerCapture(event.pointerId);
    group.classList.add('dragging');
  });
  group.addEventListener('pointermove', (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    if (Math.hypot(event.clientX - drag.startClientX, event.clientY - drag.startClientY) > 4) drag.moved = true;
    if (!drag.moved) return;
    const point = encounterMapPoint(event.clientX, event.clientY);
    const cellWidth = ENCOUNTER_MAP_WIDTH / encounter.map.columns;
    const cellHeight = ENCOUNTER_MAP_HEIGHT / encounter.map.rows;
    drag.previewX = Math.max(cellWidth / 2, Math.min(ENCOUNTER_MAP_WIDTH - cellWidth / 2, point.x - drag.grabX));
    drag.previewY = Math.max(cellHeight / 2, Math.min(ENCOUNTER_MAP_HEIGHT - cellHeight / 2, point.y - drag.grabY));
    if (!drag.frame) {
      drag.frame = window.requestAnimationFrame(() => {
        if (!drag) return;
        drag.frame = 0;
        group.setAttribute('transform', `translate(${drag.previewX} ${drag.previewY})`);
      });
    }
  });
  const finishDrag = (event, cancelled = false) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.frame) window.cancelAnimationFrame(drag.frame);
    const completed = drag;
    drag = null;
    group.classList.remove('dragging');
    if (cancelled) {
      group.setAttribute('transform', `translate(${completed.originX} ${completed.originY})`);
      return;
    }
    if (!completed.moved) return onSelect?.();
    const cellWidth = ENCOUNTER_MAP_WIDTH / encounter.map.columns;
    const cellHeight = ENCOUNTER_MAP_HEIGHT / encounter.map.rows;
    const column = Math.max(0, Math.min(encounter.map.columns - 1, Math.floor(completed.previewX / cellWidth)));
    const row = Math.max(0, Math.min(encounter.map.rows - 1, Math.floor(completed.previewY / cellHeight)));
    if (column === combatant.position.column && row === combatant.position.row) {
      group.setAttribute('transform', `translate(${completed.originX} ${completed.originY})`);
      onSelect?.();
      return;
    }
    moveEncounterToken(encounter.identity.id, combatant.id, column, row);
  };
  group.addEventListener('pointerup', (event) => finishDrag(event));
  group.addEventListener('pointercancel', (event) => finishDrag(event, true));
  group.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect?.(); }
    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) showEncounterTokenMenu(event, encounter, combatant, onSelect, group);
  });
}

function signedDM(value) { return `${value >= 0 ? '+' : ''}${value}`; }

// Book 1 p.30 step 2B(1)(2): what this attacker needs against this target, at
// the band between their two map positions. Every number here comes from the
// same rules call the resolver uses, so the panel cannot drift from the throw.
function renderEncounterDmPanel(encounter, actor, target) {
  const rows = [];
  const line = (label, value, className = '') => {
    const row = document.createElement('div');
    row.className = `panel-row${className ? ` ${className}` : ''}`;
    const key = document.createElement('span');
    key.className = 'panel-row-label';
    key.textContent = label;
    const held = document.createElement('span');
    held.className = 'panel-row-value';
    held.textContent = value;
    row.append(key, held);
    rows.push(row);
  };

  if (!actor || !target) {
    const hint = document.createElement('div');
    hint.className = 'encounter-dm-hint';
    hint.textContent = actor ? 'SELECT A TARGET' : 'SELECT A PARTY ACTOR';
    el.encounterDmPanel.replaceChildren(hint);
    return;
  }

  const band = encounterPairRange(actor, target);
  const preview = previewPersonalAttack({ attacker: actor, defender: target, range: band });
  const heading = document.createElement('div');
  heading.className = 'encounter-dm-heading';
  heading.textContent = `${actor.name.toUpperCase()} → ${target.name.toUpperCase()}`;
  line('RANGE', `${band.toUpperCase().replace('-', ' ')} / ${encounterMapDistance(actor, target)} SQ`);
  line('WEAPON', `${preview.weaponName.toUpperCase()} vs ${preview.armor.toUpperCase()}`);

  if (!preview.canAttack) {
    line('THROW', 'CANNOT REACH', 'attention');
    const note = document.createElement('div');
    note.className = 'encounter-dm-note';
    note.textContent = `${preview.weaponName} has no ${band.replace('-', ' ')} range column (Book 1 p.46).`;
    el.encounterDmPanel.replaceChildren(heading, ...rows, note);
    return;
  }

  line('TARGET', `${preview.target}+`);
  for (const [label, value] of [
    ['SKILL', preview.skillDM], ['CHARACTERISTIC', preview.characteristicDM], ['UNTRAINED', preview.untrainedDM],
    ['PARRY', preview.parryDM], ['EVASION', preview.evasionDM], ['DEFENDER UNTRAINED', preview.defenderUntrainedDM]
  ]) {
    if (value !== 0) line(label, signedDM(value));
  }
  line('TOTAL DM', signedDM(preview.totalDM));
  line('NEEDS 2D', `${Math.max(2, preview.requiredRoll)}+`, preview.requiredRoll > 12 ? 'attention' : 'ok');
  line('DAMAGE', `${preview.damageDice}D`);
  if (preview.requiredRoll > 12) {
    const note = document.createElement('div');
    note.className = 'encounter-dm-note';
    note.textContent = 'No 2D throw can make this; close the range or change weapons.';
    el.encounterDmPanel.replaceChildren(heading, ...rows, note);
    return;
  }
  const note = document.createElement('div');
  note.className = 'encounter-dm-note';
  note.textContent = 'Book 1 pp.45–47. Wounds are inflicted at the end of the round (p.30).';
  el.encounterDmPanel.replaceChildren(heading, ...rows, note);
}

function renderEncounterMap(encounter) {
  if (!encounter) {
    hideEncounterTokenOverlays();
    el.encounterMap.replaceChildren();
    el.encounterPartyRoster.replaceChildren();
    el.encounterRoster.replaceChildren();
    el.encounterDmPanel.replaceChildren();
    el.encounterSelectionStatus.textContent = 'ACTOR -- // TARGET --';
    return;
  }
  const width = ENCOUNTER_MAP_WIDTH;
  const height = ENCOUNTER_MAP_HEIGHT;
  const cellWidth = width / encounter.map.columns;
  const cellHeight = height / encounter.map.rows;
  const fragments = [];
  for (let column = 0; column <= encounter.map.columns; column += 1) {
    fragments.push(svgElement('line', { x1: column * cellWidth, y1: 0, x2: column * cellWidth, y2: height, class: column % 4 === 0 ? 'encounter-grid-major' : 'encounter-grid-line' }));
  }
  for (let row = 0; row <= encounter.map.rows; row += 1) {
    fragments.push(svgElement('line', { x1: 0, y1: row * cellHeight, x2: width, y2: row * cellHeight, class: row % 4 === 0 ? 'encounter-grid-major' : 'encounter-grid-line' }));
  }
  const actor = selectedEncounterActor(encounter);
  const target = selectedEncounterTarget(encounter);
  const declared = new Set(encounter.roundState?.declaredActions?.map((entry) => entry.actorId) ?? []);
  // The party's own declarations: showing these reveals nothing the characters
  // would not know, unlike the state of a target the round has not resolved.
  const declaredOn = declaredTargetCounts(encounter);
  if (framedEncounterId !== encounter.identity.id) {
    framedEncounterId = encounter.identity.id;
    frameEncounterCombatants(encounter);
  }
  let guide = null;
  if (actor && target) {
    guide = encounterRangeGuide(encounter, actor.id, target.id);
    const actorX = actor.position.column * cellWidth + cellWidth / 2;
    const actorY = actor.position.row * cellHeight + cellHeight / 2;
    const targetX = target.position.column * cellWidth + cellWidth / 2;
    const targetY = target.position.row * cellHeight + cellHeight / 2;
    fragments.push(svgElement('line', { x1: actorX, y1: actorY, x2: targetX, y2: targetY, class: 'encounter-range-line' }));
  }
  for (const combatant of encounter.combatants) {
    const x = combatant.position.column * cellWidth + cellWidth / 2;
    const y = combatant.position.row * cellHeight + cellHeight / 2;
    const group = svgElement('g', {
      class: 'encounter-token', role: combatant.status === 'active' ? 'button' : 'img',
      tabindex: combatant.status === 'active' ? 0 : -1,
      transform: `translate(${x} ${y})`,
      'aria-label': `${combatant.name}, ${combatant.side}, ${combatant.status}`
    });
    const title = svgElement('title');
    title.textContent = combatantHoverText(combatant);
    group.append(title);
    if (combatant.side === 'party') {
      group.append(svgElement('circle', { cx: 0, cy: 0, r: 15, class: `encounter-token-pc${actor?.id === combatant.id ? ' selected' : ''}${declared.has(combatant.id) ? ' declared' : ''}` }));
      const label = svgElement('text', { x: 0, y: 0, class: 'encounter-token-pc-label' });
      label.textContent = (combatant.name || 'P').charAt(0).toUpperCase();
      group.append(label);
      if (combatant.conditions?.length) {
        const marker = svgElement('text', { x: 13, y: -11, class: 'encounter-token-condition-marker' }); marker.textContent = '!'; group.append(marker);
      }
      attachEncounterTokenInteraction(group, encounter, combatant, { onSelect: () => setEncounterActor(encounter.identity.id, combatant.id) });
      fragments.push(group);
      continue;
    }
    const enemyClass = `encounter-token-enemy encounter-token-${combatant.actorType}${target?.id === combatant.id ? ' selected' : ''}${combatant.status === 'active' ? '' : ' inactive'}`;
    if (combatant.actorType === 'robot') group.append(svgElement('rect', { x: -10, y: -10, width: 20, height: 20, class: enemyClass }));
    else if (combatant.actorType === 'creature') group.append(svgElement('path', { d: 'M 0 -11 L 11 0 L 0 11 L -11 0 Z', class: enemyClass }));
    else group.append(svgElement('circle', { cx: 0, cy: 0, r: 10, class: enemyClass }));
    const enemyLabel = svgElement('text', { x: 0, y: 0, class: 'encounter-token-enemy-label' });
    enemyLabel.textContent = combatant.tokenLabel || combatant.name.charAt(0).toUpperCase();
    group.append(enemyLabel);
    if (combatant.conditions?.length) {
      const marker = svgElement('text', { x: 12, y: -10, class: 'encounter-token-condition-marker' }); marker.textContent = '!'; group.append(marker);
    }
    if (declaredOn[combatant.id]) {
      const tally = svgElement('text', { x: 12, y: 14, class: 'encounter-token-declared-marker' });
      tally.textContent = `\u00d7${declaredOn[combatant.id]}`;
      group.append(tally);
    }
    attachEncounterTokenInteraction(group, encounter, combatant, { onSelect: () => setEncounterTarget(encounter.identity.id, combatant.id) });
    fragments.push(group);
  }
  el.encounterMap.replaceChildren(...fragments);
  applyEncounterMapView();

  const distanceText = guide ? `${guide.distance} SQ${guide.meters === null ? ' / SCALE UNSET' : ` / ≈${guide.meters} M`}` : '';
  const guideText = guide ? ` // RANGE ${guide.suggestedRange.toUpperCase().replace('-', ' ')} / ${distanceText}` : '';
  el.encounterSelectionStatus.textContent = `ACTOR ${actor?.name.toUpperCase() ?? '--'} // TARGET ${target?.name.toUpperCase() ?? '--'}${guideText}`;
  renderEncounterDmPanel(encounter, actor, target);

  const partyHeading = document.createElement('div');
  partyHeading.className = 'encounter-roster-heading';
  partyHeading.textContent = `PARTY / ROUND ${encounter.round} DECLARATIONS`;
  const partyCards = encounter.combatants.filter((entry) => entry.side === 'party').map((partyMember) => {
    const card = document.createElement('button');
    card.type = 'button';
    const hasDeclared = declared.has(partyMember.id);
    card.className = `encounter-enemy-card encounter-party-card${actor?.id === partyMember.id ? ' selected' : ''}${hasDeclared ? ' declared' : ''}${partyMember.status === 'active' ? '' : ' inactive'}`;
    card.disabled = partyMember.status !== 'active' || hasDeclared;
    const declaration = encounter.roundState?.declaredActions?.find((entry) => entry.actorId === partyMember.id);
    card.textContent = `${actor?.id === partyMember.id ? '▶ ' : ''}${partyMember.name.toUpperCase()} / ${hasDeclared ? declaration.action.toUpperCase() : combatantRulesStatus(partyMember).toUpperCase()}\nSTR ${partyMember.current.STR}/${partyMember.characteristics.STR}  DEX ${partyMember.current.DEX}/${partyMember.characteristics.DEX}  END ${partyMember.current.END}/${partyMember.characteristics.END}\n${getPersonalWeapon(partyMember.weaponKey).name} / SKILL-${combatantSkillLevel(partyMember)} / ${partyMember.armor.toUpperCase()} / CONDITION ${combatantConditionText(partyMember)}`;
    card.addEventListener('click', () => setEncounterActor(encounter.identity.id, partyMember.id));
    return card;
  });
  el.encounterPartyRoster.replaceChildren(partyHeading, ...partyCards);

  const heading = document.createElement('div');
  heading.className = 'encounter-roster-heading';
  heading.textContent = 'ENEMY STATUS / EQUIPMENT';
  const cards = encounter.combatants.filter((entry) => entry.side === 'opposition').map((enemy) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `encounter-enemy-card${target?.id === enemy.id ? ' selected' : ''}${enemy.status === 'active' ? '' : ' inactive'}`;
    card.disabled = enemy.status !== 'active';
    const name = document.createElement('span');
    name.className = 'encounter-enemy-name';
    const aimed = declaredOn[enemy.id] ? ` / DECLARED ×${declaredOn[enemy.id]}` : '';
    name.textContent = `${target?.id === enemy.id ? '● ' : ''}${enemy.name.toUpperCase()} / ${enemy.actorType.toUpperCase()} / ${combatantRulesStatus(enemy).toUpperCase()}${aimed}`;
    const stats = document.createElement('span');
    stats.textContent = `STR ${enemy.current.STR}/${enemy.characteristics.STR}  DEX ${enemy.current.DEX}/${enemy.characteristics.DEX}  END ${enemy.current.END}/${enemy.characteristics.END}`;
    const equipment = document.createElement('span');
    equipment.textContent = `${getPersonalWeapon(enemy.weaponKey).name} / SKILL-${combatantSkillLevel(enemy)} / ${enemy.armor.toUpperCase()} / CONDITION ${combatantConditionText(enemy)}`;
    card.append(name, document.createElement('br'), stats, document.createElement('br'), equipment);
    card.addEventListener('click', () => setEncounterTarget(encounter.identity.id, enemy.id));
    return card;
  });
  el.encounterRoster.replaceChildren(heading, ...cards);
  el.encounterRosterSummary.textContent = `ENEMY ROSTER [${cards.length}]`;
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

function openCombatSetupDialog() {
  if (!campaignDocument || !gameplayDocument || !mappedCurrentSystem()) {
    setStatus('AN ACTIVE CHARACTER AT A MAPPED CAMPAIGN LOCATION IS REQUIRED', 'error');
    return;
  }
  const options = [new Option('-- SELECT SAVED NPC --', '')];
  for (const actor of npcActorDocuments.filter((entry) => !entry.state.archived)) options.push(new Option(`${actor.identity.name} / ${actor.profile.role || actor.profile.actorType}`, actor.identity.id));
  el.combatRosterActor.replaceChildren(...options);
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
  let encounter = createEncounterDocument({
    campaign: campaignDocument,
    characters,
    partyLoadouts,
    opponents: setup.opponents,
    title: `Manual Combat / ${typeTitle}`,
    encounterKey,
    date,
    range: el.combatStartingRange.value,
    metersPerSquare: el.combatMapScale.value === '' ? null : Number.parseFloat(el.combatMapScale.value),
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
  selectedEncounterActorId = encounter.combatants.find((entry) => entry.side === 'party' && entry.status === 'active')?.id ?? null;
  selectedEncounterTargetId = encounter.combatants.find((entry) => entry.side === 'opposition' && entry.status === 'active')?.id ?? null;
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
    selectedEncounterActorId = encounter.combatants.find((entry) => entry.side === 'party' && entry.status === 'active')?.id ?? null;
    selectedEncounterTargetId = encounter.combatants.find((entry) => entry.side === 'opposition' && entry.status === 'active')?.id ?? null;
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

function resolveActiveEncounterAction(action, modifier = 0, targetId = null, actorId = null) {
  try {
    const active = activeEncounterAtCurrentSystem();
    if (!active) throw new Error('no active personal encounter');
    const index = encounterDocuments.findIndex((entry) => entry.identity.id === active.identity.id);
    const result = resolveEncounterRound(active, {
      action, modifier, actorId: actorId ?? selectedEncounterActor(active)?.id ?? null, targetId, date: campaignDateSnapshot(),
      dice: seededDice(`${active.identity.id}|round-${active.round}|${action}|${actorId ?? 'auto'}|${targetId ?? 'none'}|${modifier}`)
    });
    encounterDocuments[index] = result.encounter;
    for (const entry of result.entries) logActivity('COMBAT', entry.text);
    resolveLinkedCombatSituation(result.encounter);
    syncCampaignRefs();
    persistCampaignState();
    selectedEncounterActorId = result.awaitingActorIds?.[0] ?? null;
    setStatus(result.pending
      ? `ACTION DECLARED / SELECT NEXT PARTY MEMBER / ROUND ${result.encounter.round}`
      : `ENCOUNTER ${result.encounter.status.toUpperCase()} / ROUND ${result.encounter.round}`, result.encounter.status === 'defeat' ? 'error' : 'ok');
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
    basis: `PERSONAL COMBAT // ROUND ${encounter.round} // ${encounter.range.toUpperCase()} RANGE\nWeapon, skill, characteristic, armor, and range are built into the combat throw. Add only the referee's extra situational modifier.`,
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
    el.encounterActions.replaceChildren();
    renderEncounterMap(null);
    applyOperationsDeskTab();
    return;
  }
  el.encounterRailSection.dataset.available = 'true';
  el.encounterRecord.textContent = buildEncounterRecord({ system: current, encounters: encounterDocuments });
  el.encounterActions.replaceChildren();
  const active = activeEncounterAtCurrentSystem();
  const displayed = active ?? latestEncounterAtCurrentSystem();
  el.encounterDetails.hidden = !displayed;
  renderEncounterMap(displayed);
  el.operationsTabEncounter?.classList.toggle('attention', Boolean(active));
  if (el.operationsTabEncounter) el.operationsTabEncounter.textContent = 'COMBAT';
  if (active) {
    const actor = selectedEncounterActor(active);
    const target = selectedEncounterTarget(active);
    if (active.round === 1 && active.surprise.surpriseSideId === 'party') {
      el.encounterActions.append(makePortButton('AVOID', avoidActiveEncounter));
    }
    el.encounterActions.append(
      makePortButton(actor && target ? `${actor.name.toUpperCase()}: ATTACK ${target.name.toUpperCase()}` : 'SELECT ACTOR + TARGET', () => openEncounterAttackDialog(active), { disabled: !actor || !target }),
      makePortButton('EVADE', () => resolveActiveEncounterAction('evade', 0, null, actor?.id), { disabled: !actor }),
      makePortButton('CLOSE RANGE', () => resolveActiveEncounterAction('close', 0, target?.id ?? null, actor?.id), { disabled: !actor || !target }),
      makePortButton('OPEN RANGE', () => resolveActiveEncounterAction('open', 0, target?.id ?? null, actor?.id), { disabled: !actor || !target }),
      makePortButton('ESCAPE', () => resolveActiveEncounterAction('escape', 0, null, actor?.id), { disabled: !actor }),
      makePortButton('WAIT', () => resolveActiveEncounterAction('wait', 0, null, actor?.id), { disabled: !actor })
    );
  } else {
    const button = makePortButton('START COMBAT', openCombatSetupDialog);
    button.title = 'Create a manual personal encounter with referee-defined enemy statistics and equipment';
    el.encounterActions.append(button);
  }
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
  if (el.encounterRailSection) {
    el.encounterRailSection.hidden = !(campaignPlayActive() && activeSceneTab === 'combat' && el.encounterRailSection.dataset.available === 'true');
  }
  // The encounter panel lives in the scene; while combat is active the context
  // panel shows the situation/roster only if selected, otherwise the takeover bar.
  for (const [key, tab] of Object.entries(tabs)) tab?.setAttribute('aria-selected', key === operationsDeskTab ? 'true' : 'false');
  const takeover = encounterWorkspaceActive || situationTakeover;
  if (el.contextTakeover) {
    el.contextTakeover.hidden = !takeover || !campaignPlayActive();
    el.contextTakeover.textContent = encounterWorkspaceActive
      ? 'PERSONAL COMBAT · WORLD / TRADE / JOBS / NPCS SUSPENDED · [ BACK TO PORT ]'
      : 'SITUATION · RESOLVE IT OR RETURN TO PORT · [ BACK TO PORT ]';
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

function actionButton(label, action, payload = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'text-button action-button';
  button.textContent = `[ ${label} ]`;
  button.dataset.action = action;
  button.addEventListener('click', () => execute(action, typeof payload === 'function' ? payload() : payload));
  return button;
}

function promptControl(labelText, input) {
  const wrap = document.createElement('span');
  wrap.className = 'prompt-control';
  const label = document.createElement('label');
  label.textContent = labelText;
  if (input.id) label.htmlFor = input.id;
  wrap.append(label, input);
  return wrap;
}

function renderGenericActions(actions) {
  for (const action of actions) {
    el.actions.append(actionButton(ACTION_LABELS[action] ?? action.toUpperCase(), action));
  }
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

  if (!available.actions.length) {
    const text = document.createElement('span');
    text.className = 'empty';
    text.textContent = 'NO FURTHER CHARACTER-GENERATION ACTIONS.';
    el.actions.append(text);
    return;
  }

  if (available.actions.includes(CHARGEN_ACTIONS.ATTEMPT_ENLISTMENT)) {
    for (const service of available.choices.services) {
      el.actions.append(actionButton(serviceName(service).toUpperCase(), CHARGEN_ACTIONS.ATTEMPT_ENLISTMENT, { service }));
    }
    return;
  }

  if (available.actions.includes(CHARGEN_ACTIONS.ROLL_SKILL)) {
    for (const tableKey of available.choices.skillTables) {
      el.actions.append(actionButton(skillTableName(tableKey).toUpperCase(), CHARGEN_ACTIONS.ROLL_SKILL, { tableKey }));
    }
    return;
  }

  if (available.actions.includes(CHARGEN_ACTIONS.RESOLVE_SKILL_SPECIALIZATION)) {
    const label = document.createElement('span');
    label.className = 'choice-label';
    label.textContent = `CHOOSE ${String(available.choices.pendingSkill?.name ?? 'SPECIALIZATION').toUpperCase()}:`;
    el.actions.append(label);
    for (const specialization of available.choices.specializations ?? []) {
      el.actions.append(actionButton(
        specialization.toUpperCase(),
        CHARGEN_ACTIONS.RESOLVE_SKILL_SPECIALIZATION,
        { specialization }
      ));
    }
    return;
  }

  if (available.actions.includes(CHARGEN_ACTIONS.RESOLVE_AGING_CRISIS)) {
    const medical = document.createElement('input');
    medical.type = 'number';
    medical.id = 'medical-skill';
    medical.min = '0';
    medical.step = '1';
    medical.value = String(character.skills.Medical ?? 0);

    const slow = document.createElement('input');
    slow.type = 'checkbox';
    slow.id = 'slow-drug';
    slow.checked = true;

    el.actions.append(promptControl('MEDICAL SKILL', medical));
    el.actions.append(promptControl('SLOW DRUG', slow));

    const accept = document.createElement('button');
    accept.type = 'button';
    accept.className = 'text-button action-button';
    accept.textContent = '[ ROLL CRISIS SURVIVAL ]';
    accept.addEventListener('click', () => execute(CHARGEN_ACTIONS.RESOLVE_AGING_CRISIS, {
      medicalSkill: Number.parseInt(medical.value, 10) || 0,
      slowDrug: slow.checked
    }));
    el.actions.append(accept);
    return;
  }

  if (available.actions.includes(CHARGEN_ACTIONS.RESOLVE_MUSTER_BENEFIT_SPECIALIZATION)) {
    const asSkill = document.createElement('input');
    asSkill.type = 'checkbox';
    asSkill.id = 'benefit-as-skill';
    if (available.choices.canTakeAsSkill) {
      el.actions.append(promptControl('TAKE AS SKILL', asSkill));
    }

    const label = document.createElement('span');
    label.className = 'choice-label';
    label.textContent = `CHOOSE ${String(available.choices.pendingBenefit?.category ?? 'WEAPON').toUpperCase()}:`;
    el.actions.append(label);

    for (const specialization of available.choices.specializations ?? []) {
      el.actions.append(actionButton(
        specialization.toUpperCase(),
        CHARGEN_ACTIONS.RESOLVE_MUSTER_BENEFIT_SPECIALIZATION,
        () => ({ specialization, asSkill: asSkill.checked })
      ));
    }
    return;
  }

  renderGenericActions(available.actions);
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

// ---------------------------------------------------------------------------
// v0.18.0 chargen context: the Book 1 tables that apply to the current phase
// ---------------------------------------------------------------------------
function tableElement(title, headers, rows, { highlight = null, note = null, hitCell = null, action = null } = {}) {
  const box = document.createElement('div');
  box.className = 'chargen-table';
  const head = document.createElement('div');
  head.className = 'chargen-table-head';
  const label = document.createElement('span');
  label.textContent = title;
  head.append(label);
  if (action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'text-button action-button chargen-table-action';
    button.textContent = action.label;
    button.disabled = Boolean(action.disabled);
    if (!action.disabled) button.addEventListener('click', action.run);
    head.append(button);
  }
  box.append(head);
  if (note) { const n = document.createElement('div'); n.className = 'chargen-table-note'; n.textContent = note; box.append(n); }
  const table = document.createElement('table');
  table.className = 'chargen-grid';
  if (headers?.length) {
    const tr = document.createElement('tr');
    for (const h of headers) { const th = document.createElement('th'); th.textContent = h; tr.append(th); }
    table.append(tr);
  }
  rows.forEach((row, index) => {
    const tr = document.createElement('tr');
    if (highlight !== null && index === highlight) tr.className = 'hit';
    row.forEach((cell, cellIndex) => {
      const td = document.createElement('td');
      td.textContent = cell;
      // hitCell = [rowIndex, firstCellIndex]: highlight the die and its result only.
      if (hitCell && hitCell[0] === index && (cellIndex === hitCell[1] || cellIndex === hitCell[1] + 1)) td.className = 'hit-cell';
      tr.append(td);
    });
    table.append(tr);
  });
  box.append(table);
  return box;
}

function describeOutcome(outcome) {
  if (!outcome) return '—';
  if (outcome.type === 'characteristic') return `${outcome.amount > 0 ? '+' : ''}${outcome.amount} ${outcome.characteristic}`;
  if (outcome.type === 'skill' || outcome.type === 'specialization') return outcome.name;
  if (outcome.type === 'material') return outcome.name;
  if (outcome.type === 'weapon') return outcome.category === 'gun' ? 'Gun' : 'Blade';
  if (outcome.type === 'none') return '—';
  return String(outcome.name ?? outcome.type);
}

function renderChargenTables() {
  if (!el.chargenTables) return;
  el.chargenTables.replaceChildren();
  if (campaignPlayActive() || !character) return;
  const mode = chargenTablesForPhase(character.phase);
  const serviceKey = character.service;
  const service = serviceKey ? SERVICES[serviceKey] : null;
  const lastRoll = character.currentTerm?.skillRolls?.at?.(-1) ?? null;
  const intro = document.createElement('div');
  intro.className = 'chargen-tables-intro';
  intro.textContent = mode === 'skills'
    ? `Acquired Skills · ${service?.name ?? 'service'} column (Book 1 p.15). ${character.skillsDue > 0 ? `${character.skillsDue} roll${character.skillsDue === 1 ? '' : 's'} due: pick a table and roll here.` : 'Resolve the pending result in WHAT NOW?.'}`
    : mode === 'muster' ? `Mustering Out · ${service?.name ?? 'service'} (Book 1 p.14). One roll per term plus rank bonus; at most three on cash.`
      : mode === 'aging' ? 'Aging (Book 1 p.12). Throw the number shown or lose the amount listed.'
        : service ? `Prior Service · ${service.name} (Book 1 p.14).` : 'Prior Service Table (Book 1 p.14). Choose a service to enlist in.';
  el.chargenTables.append(intro);

  if (mode === 'skills' && service) {
    const edu = character.characteristics.EDU;
    for (const key of ['personal-development', 'service-skills', 'advanced-education', 'advanced-education-8']) {
      const table = SKILL_TABLES[key];
      const column = table.columns[serviceKey];
      const locked = table.minimumEducation !== null && edu < table.minimumEducation;
      const rows = [];
      for (let i = 0; i < 6; i += 2) rows.push([String(i + 1), describeOutcome(column[i]), String(i + 2), describeOutcome(column[i + 1])]);
      const hitCell = lastRoll && lastRoll.table === key ? [Math.floor((lastRoll.roll - 1) / 2), (lastRoll.roll - 1) % 2 === 0 ? 0 : 2] : null;
      const canRoll = character.phase === CHARGEN_PHASES.SKILLS_PENDING && !locked;
      const box = tableElement(table.name.toUpperCase(), null, rows, {
        hitCell,
        note: locked ? `Requires EDU ${table.minimumEducation}+ (EDU ${edu}).` : null,
        action: { label: canRoll ? '[ ROLL 1D HERE ]' : (locked ? `[ EDU ${edu} ]` : '[ ROLL ]'), disabled: !canRoll, run: () => execute(CHARGEN_ACTIONS.ROLL_SKILL, { tableKey: key }) }
      });
      if (locked) box.classList.add('locked');
      el.chargenTables.append(box);
    }
  } else if (mode === 'muster' && service) {
    const tables = MUSTERING_OUT_TABLES[serviceKey];
    const lastMusterRoll = character.musterOut?.results?.at?.(-1) ?? null;
    const benefitHit = lastMusterRoll?.type === 'benefit' ? [lastMusterRoll.total - 1, 0] : null;
    const cashHit = lastMusterRoll?.type === 'cash' ? [lastMusterRoll.total - 1, 0] : null;
    el.chargenTables.append(tableElement('BENEFITS', ['ROLL', 'BENEFIT'], tables.benefits.map((b, i) => [String(i + 1), describeOutcome(b)]), { hitCell: benefitHit, note: character.rank >= 5 ? 'Rank 5–6: DM +1 on this table.' : null }));
    el.chargenTables.append(tableElement('CASH', ['ROLL', 'CR'], tables.cash.map((c, i) => [String(i + 1), c.toLocaleString('en-US')]), { hitCell: cashHit, note: (character.skills?.Gambling ?? 0) >= 1 ? 'Gambling: DM +1 on this table.' : 'Maximum three rolls on cash.' }));
  } else if (mode === 'aging') {
    el.chargenTables.append(tableElement('AGING', ['AGE', 'STR', 'DEX', 'END', 'INT'], AGING_BANDS.map((band) => [
      `${band.minimumAge}–${Number.isFinite(band.maximumAge) ? band.maximumAge : '+'}`,
      ...['STR', 'DEX', 'END', 'INT'].map((k) => { const r = band.rules.find((rule) => rule.characteristic === k); return r ? `−${r.loss} (${r.target}+)` : '—'; })
    ])));
  } else {
    const dm = (list) => list.map((d) => `+${d.modifier} if ${d.characteristic} ${d.minimum}+`).join(', ');
    if (service) {
      const svc = service;
      const line = (check) => check ? `${check.target}+${check.dms?.length ? ` (${dm(check.dms)})` : ''}` : '—';
      el.chargenTables.append(tableElement(`PRIOR SERVICE · ${svc.name.toUpperCase()}`, ['THROW', 'TARGET'], [
        ['Enlistment', line(svc.enlistment)],
        ['Survival', line(svc.survival)],
        ['Commission', line(svc.commission)],
        ['Promotion', line(svc.promotion)],
        ['Reenlistment', `${svc.reenlistment.target}+ (12 exactly is mandatory)`]
      ], { highlight: ({ 'survival-required': 1, 'commission-option': 2, 'promotion-option': 3, 'reenlistment-required': 4 })[character.phase] ?? null }));
    } else {
      el.chargenTables.append(tableElement('PRIOR SERVICE · ENLISTMENT', ['SERVICE', 'ENLIST', 'DMS', 'SURVIVE'], Object.values(SERVICES).map((svc) => [svc.name, `${svc.enlistment.target}+`, dm(svc.enlistment.dms) || '—', `${svc.survival.target}+`])));
    }
    if (service && service.ranks.length > 1) {
      el.chargenTables.append(tableElement('RANKS', ['RANK', 'TITLE'], service.ranks.slice(1).map((r, i) => [String(i + 1), r]), { highlight: character.rank > 0 ? character.rank - 1 : null }));
    }
  }
}

function render() {
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
el.campaignMenu.addEventListener('click', (event) => {
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
  try { placeRosterActorInEncounter(); } catch (error) { console.error(error); setStatus(error?.message ?? String(error), 'error'); }
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
el.encounterZoomOut.addEventListener('click', () => setEncounterMapZoom(encounterMapZoom - 0.25));
el.encounterZoomIn.addEventListener('click', () => setEncounterMapZoom(encounterMapZoom + 0.25));
el.encounterZoomFit.addEventListener('click', fitEncounterMap);
el.encounterMap.addEventListener('dragstart', (event) => event.preventDefault());
{
  let pan = null;
  el.encounterMapViewport.addEventListener('pointerdown', (event) => {
    hideEncounterTokenOverlays();
    if (![0, 1].includes(event.button) || event.target.closest?.('.encounter-token')) return;
    event.preventDefault();
    const rect = el.encounterMap.getBoundingClientRect();
    const scale = Math.min(rect.width / encounterMapView.width, rect.height / encounterMapView.height) || 1;
    pan = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      viewX: encounterMapView.x,
      viewY: encounterMapView.y,
      scale
    };
    el.encounterMapViewport.setPointerCapture(event.pointerId);
    el.encounterMapViewport.classList.add('panning');
  });
  el.encounterMapViewport.addEventListener('pointermove', (event) => {
    if (!pan || pan.pointerId !== event.pointerId) return;
    event.preventDefault();
    encounterMapView.x = pan.viewX - (event.clientX - pan.clientX) / pan.scale;
    encounterMapView.y = pan.viewY - (event.clientY - pan.clientY) / pan.scale;
    scheduleEncounterMapView();
  });
  const endPan = (event) => {
    if (!pan || pan.pointerId !== event.pointerId) return;
    pan = null;
    el.encounterMapViewport.classList.remove('panning');
    flushEncounterMapView();
  };
  el.encounterMapViewport.addEventListener('pointerup', endPan);
  el.encounterMapViewport.addEventListener('pointercancel', endPan);
  el.encounterMapViewport.addEventListener('wheel', (event) => {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
    setEncounterMapZoom(encounterMapZoom * factor, event);
  }, { passive: false });
  el.encounterMapViewport.addEventListener('contextmenu', showEncounterMapMenu);
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

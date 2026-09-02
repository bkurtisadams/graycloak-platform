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
  sellSpeculativeCargo,
  generatePassengerDemand,
  generateFreightOffers,
  generateSpeculativeTradeOffer,
  calculateSpeculativePurchaseCost,
  quoteSpeculativeResale,
  PASSAGE_FARES_CR,
  FREIGHT_RATE_PER_TON_CR,
  generatePatronContact,
  resolveRefereeSkillCheck
} from '../../packages/classic-traveller-rules/index.js';

import {
  ACTION_LABELS,
  buildCampaignRecord,
  buildAdventureThreadRecord,
  buildEncounterRecord,
  buildContractBoardRecord,
  buildCharacterRecord,
  buildFinalCharacterRecord,
  buildGenerationLog,
  buildJumpPlan,
  buildPortServicesRecord,
  buildShipRecord,
  buildProcedure,
  buildServiceHistory,
  buildSituationRecord,
  buildSystemRecord,
  helpForTopic,
  serviceName,
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
  addShipToCampaign,
  addContractToCampaign,
  addSituationToCampaign,
  addEncounterToCampaign,
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
  avoidEncounter
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
  terminal: document.querySelector('.terminal'),
  campaignHeader: document.querySelector('#campaign-header'),
  headerCharacterName: document.querySelector('#header-character-name'),
  headerCharacterMeta: document.querySelector('#header-character-meta'),
  headerWorld: document.querySelector('#header-world'),
  headerDate: document.querySelector('#header-date'),
  headerShipName: document.querySelector('#header-ship-name'),
  headerShipMeta: document.querySelector('#header-ship-meta'),
  headerCharacteristics: document.querySelector('#header-characteristics'),
  headerQuickSkills: document.querySelector('#header-quick-skills'),
  headerTask: document.querySelector('#header-task'),
  togglePersonnel: document.querySelector('#toggle-personnel'),
  toggleShip: document.querySelector('#toggle-ship'),
  toggleCampaign: document.querySelector('#toggle-campaign'),
  toggleThreads: document.querySelector('#toggle-threads'),
  toggleChargenRecord: document.querySelector('#toggle-chargen-record'),
  personnelSection: document.querySelector('#personnel-section'),
  procedureSection: document.querySelector('#procedure-section'),
  chargenRecordSection: document.querySelector('#chargen-record-section'),
  name: document.querySelector('#character-name'),
  randomCharacterName: document.querySelector('#random-character-name'),
  recordHeading: document.querySelector('#record-heading'),
  recordHelp: document.querySelector('#record-help'),
  record: document.querySelector('#character-record'),
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
  saveCharacter: document.querySelector('#save-character'),
  loadCharacter: document.querySelector('#load-character'),
  loadFile: document.querySelector('#load-file'),
  newCampaign: document.querySelector('#new-campaign'),
  saveCampaign: document.querySelector('#save-campaign'),
  loadCampaign: document.querySelector('#load-campaign'),
  exportCampaign: document.querySelector('#export-campaign'),
  campaignSection: document.querySelector('#campaign-section'),
  campaignName: document.querySelector('#campaign-name'),
  campaignDay: document.querySelector('#campaign-day'),
  campaignYear: document.querySelector('#campaign-year'),
  campaignSystem: document.querySelector('#campaign-system'),
  campaignWorld: document.querySelector('#campaign-world'),
  campaignRecord: document.querySelector('#campaign-record'),
  threadSection: document.querySelector('#thread-section'),
  threadRecord: document.querySelector('#thread-record'),
  subsectorSection: document.querySelector('#subsector-section'),
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
  operationsTabSituation: document.querySelector('#operations-tab-situation'),
  encounterSection: document.querySelector('#encounter-section'),
  encounterRecord: document.querySelector('#encounter-record'),
  encounterActions: document.querySelector('#encounter-actions'),
  operationsTabEncounter: document.querySelector('#operations-tab-encounter'),
  operationsTabPort: document.querySelector('#operations-tab-port'),
  operationsTabTrade: document.querySelector('#operations-tab-trade'),
  operationsTabJobs: document.querySelector('#operations-tab-jobs'),
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
  activityPanel: document.querySelector('#activity-panel'),
  activityContext: document.querySelector('#activity-context'),
  activityFeed: document.querySelector('#activity-feed'),
  clearActivity: document.querySelector('#clear-activity')
};

let character = createCharacter();
let gameplayDocument = null;
let shipDocument = null;
let campaignDocument = null;
let contractDocuments = [];
let situationDocuments = [];
let encounterDocuments = [];
let contactDocuments = [];
let threadDocuments = [];
let documentMode = TRAVELLER_DOCUMENT_KINDS.CHARGEN;
let openHelpTopic = null;
let selectedSystemId = null;
let subsectorZoom = 1;
let speculativeBrokerDM = 0;
let operationsDeskTab = 'trade';
let pendingRoll = null;
const detailPanels = {
  personnel: false,
  ship: false,
  campaign: false,
  threads: false,
  chargen: false,
  system: false
};
let registry = null;

try {
  registry = createDocumentRegistry({ storage: window.localStorage });
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

function setActivityContext() {
  if (!activityLog) return;
  activityLog.setContext(campaignDocument?.identity?.id || 'session');
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
  const contextName = campaignDocument?.identity?.name || 'SESSION / NO CAMPAIGN';
  el.activityContext.textContent = contextName.toUpperCase();
  el.activityFeed.replaceChildren();
  const entries = activityLog ? activityLog.list() : [];
  if (!entries.length) {
    const empty = document.createElement('div');
    empty.className = 'activity-empty';
    empty.textContent = 'NO RECORDED ACTIVITY.';
    el.activityFeed.append(empty);
    return;
  }
  entries.forEach((entry, index) => {
    const row = document.createElement('div');
    row.className = `activity-entry${index === entries.length - 1 ? ' latest' : ''}`;
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
  el.activityFeed.scrollTop = el.activityFeed.scrollHeight;
}

function logActivity(category, message, { dateLabel = activityDateLabel() } = {}) {
  if (!activityLog) return;
  activityLog.append({ category, message, dateLabel });
  renderActivity();
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

const QUICK_SKILL_PRIORITY = Object.freeze([
  'Pilot',
  'Navigation',
  'Electronics',
  'Mechanical',
  'Jack-of-All-Trades',
  'Grav Vehicle',
  'Laser Rifle'
]);

function signedNumber(value) {
  const number = Number(value ?? 0);
  return number >= 0 ? `+${number}` : String(number);
}

function campaignPlayActive() {
  return Boolean(campaignDocument && gameplayDocument);
}

function quickSkillNames() {
  if (!gameplayDocument?.skills) return [];
  const names = Object.keys(gameplayDocument.skills);
  const prioritized = QUICK_SKILL_PRIORITY.filter((name) => names.includes(name));
  const remaining = names.filter((name) => !prioritized.includes(name)).sort((a, b) => a.localeCompare(b));
  return [...prioritized, ...remaining].slice(0, 6);
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

function shipHeaderMeta() {
  if (!shipDocument) return 'NO ACTIVE SHIP';
  const jump = shipDocument.specifications?.drives?.jump?.rating ?? '--';
  const fuel = shipDocument.state?.currentFuelTons ?? '--';
  const fuelCapacity = shipDocument.specifications?.fuel?.capacityTons ?? '--';
  const cargo = Number.isFinite(shipDocument.state?.cargoUsedTons) ? shipDocument.state.cargoUsedTons : 0;
  const cargoCapacity = shipDocument.specifications?.cargo?.capacityTons ?? '--';
  const account = shipDocument.state?.finances?.balanceCr;
  return `J${jump} / FUEL ${fuel}/${fuelCapacity}t / CARGO ${cargo}/${cargoCapacity}t / ${Number.isInteger(account) ? formatCr(account) : 'ACCOUNT --'}`;
}

function renderCampaignHeader() {
  const active = campaignPlayActive();
  el.campaignHeader.hidden = !active;
  el.terminal?.classList.toggle('campaign-play', active);
  if (!active) {
    el.appTitle.textContent = 'TRAVELLER // PERSONNEL INTAKE TERMINAL';
    return;
  }

  el.appTitle.textContent = `${(campaignDocument.identity.name || 'TRAVELLER').toUpperCase()} // CAMPAIGN TERMINAL`;
  const current = mappedCurrentSystem();
  const task = headerTaskSnapshot();
  const career = gameplayDocument.career;
  const careerLabel = serviceName(career.service).toUpperCase();
  el.headerCharacterName.textContent = gameplayDocument.identity.name || '(UNNAMED)';
  el.headerCharacterMeta.textContent = `${gameplayDocument.upp} / ${careerLabel} / AGE ${gameplayDocument.age} / ${formatCr(gameplayDocument.finances.credits)}`;
  el.headerWorld.textContent = current?.mainWorld?.name || campaignDocument.location.worldName || 'UNMAPPED';
  el.headerDate.textContent = `${current?.name ? `${current.name.toUpperCase()} / ` : ''}${activityDateLabel()}`;
  el.headerShipName.textContent = shipDocument
    ? `${shipDocument.identity.name || '(UNNAMED)'}${shipDocument.identity.registry ? ` / ${shipDocument.identity.registry}` : ''}`
    : 'NO ACTIVE SHIP';
  el.headerShipMeta.textContent = shipHeaderMeta();

  el.headerCharacteristics.replaceChildren();
  for (const [key, label] of HEADER_CHARACTERISTICS) {
    const value = gameplayDocument.characteristics[key];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'header-roll-button';
    button.textContent = `${key} ${value}`;
    button.title = `${label} ${value} / click for an ad hoc characteristic-or-less roll`;
    button.addEventListener('click', () => openCharacteristicRollDialog(key, label));
    el.headerCharacteristics.append(button);
  }

  el.headerQuickSkills.replaceChildren();
  const quick = quickSkillNames();
  if (!quick.length) {
    const none = document.createElement('span');
    none.className = 'empty';
    none.textContent = 'NONE';
    el.headerQuickSkills.append(none);
  } else {
    for (const skillName of quick) {
      const level = Number(gameplayDocument.skills[skillName] ?? 0);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `header-skill-button${task.skillName === skillName ? ' context-relevant' : ''}`;
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
    }
  }

  el.headerTask.textContent = task.label;
  el.headerTask.disabled = task.kind === 'none';
  el.headerTask.classList.toggle('attention', task.attention);
  el.headerTask.dataset.taskKind = task.kind;
  el.headerTask.dataset.taskId = task.id ?? '';
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
  el.selectedSystemSummaryText.textContent = `${selected && selected.id !== current?.id ? 'SELECTED' : 'CURRENT'}: ${system.name.toUpperCase()} // ${system.hex} // ${system.mainWorld.uwp} // TL ${profile.techLevel} // ${bases} // GAS GIANT ${system.gasGiant ? 'YES' : 'NO'} // ${zone}`;
  el.selectedSystemSummary.hidden = false;
  el.toggleSystemDetails.textContent = detailPanels.system ? '[ HIDE DETAILS ]' : '[ DETAILS ]';
}

function applyCampaignLayout() {
  const active = campaignPlayActive();
  if (!active) {
    el.personnelSection.hidden = false;
    el.procedureSection.hidden = false;
    el.chargenRecordSection.hidden = false;
    return;
  }
  el.personnelSection.hidden = !detailPanels.personnel;
  el.procedureSection.hidden = true;
  el.campaignSection.hidden = !detailPanels.campaign;
  el.threadSection.hidden = !detailPanels.threads;
  if (shipDocument) el.shipSection.hidden = !detailPanels.ship;
  el.chargenRecordSection.hidden = !detailPanels.chargen;
  if (el.systemRecord.textContent) el.systemRecordSection.hidden = !detailPanels.system;
  el.togglePersonnel.textContent = detailPanels.personnel ? '[ HIDE PERSONNEL ]' : '[ PERSONNEL ]';
  el.toggleShip.textContent = detailPanels.ship ? '[ HIDE SHIP ]' : '[ SHIP ]';
  el.toggleCampaign.textContent = detailPanels.campaign ? '[ HIDE CAMPAIGN ]' : '[ CAMPAIGN ]';
  el.toggleThreads.textContent = detailPanels.threads ? '[ HIDE THREADS ]' : '[ THREADS ]';
  el.toggleChargenRecord.textContent = detailPanels.chargen ? '[ HIDE CHARGEN RECORD ]' : '[ CHARGEN RECORD ]';
  for (const [key, section] of [
    ['personnel', el.personnelSection],
    ['ship', el.shipSection],
    ['campaign', el.campaignSection],
    ['threads', el.threadSection],
    ['chargen', el.chargenRecordSection],
    ['system', el.systemRecordSection]
  ]) {
    section?.classList.toggle('detail-view-open', Boolean(detailPanels[key]));
  }
}

function toggleDetailPanel(key) {
  if (!(key in detailPanels)) return;
  detailPanels[key] = !detailPanels[key];
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
  const value = Number(gameplayDocument.characteristics?.[characteristic] ?? 0);
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
  return gameplayDocument;
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
  el.shipSection.hidden = false;
  if (el.shipName.value !== shipDocument.identity.name) el.shipName.value = shipDocument.identity.name;
  if (el.shipRegistry.value !== shipDocument.identity.registry) el.shipRegistry.value = shipDocument.identity.registry;
  el.shipRecord.textContent = buildShipRecord(shipDocument);
  renderCampaignHeader();
  applyCampaignLayout();
}

function persistGameplayDocuments() {
  if (!registry) return;
  if (gameplayDocument) registry.put(gameplayDocument);
  if (shipDocument) registry.put(shipDocument);
  for (const contract of contractDocuments) registry.put(contract);
  for (const situation of situationDocuments) registry.put(situation);
  for (const encounter of encounterDocuments) registry.put(encounter);
  for (const contact of contactDocuments) registry.put(contact);
  for (const thread of threadDocuments) registry.put(thread);
}

function syncCampaignRefs() {
  if (!campaignDocument) return;
  campaignDocument = refreshCampaignDocumentRefs(campaignDocument, {
    characters: gameplayDocument ? [gameplayDocument] : [],
    ships: shipDocument ? [shipDocument] : [],
    contracts: contractDocuments,
    situations: situationDocuments,
    encounters: encounterDocuments,
    contacts: contactDocuments,
    threads: threadDocuments
  });
}

function persistCampaignState() {
  syncCampaignRefs();
  persistGameplayDocuments();
  if (registry && campaignDocument) registry.put(campaignDocument);
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
  if (!campaignDocument) return { characters: [], ships: [], contracts: [], situations: [], encounters: [], contacts: [], threads: [], missing: [] };
  let characters = [];
  let ships = [];
  let contracts = [];
  let situations = [];
  let encounters = [];
  let contacts = [];
  let threads = [];
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
  return { characters, ships, contracts, situations, encounters, contacts, threads, missing };
}

function renderCampaign() {
  el.saveCampaign.disabled = !campaignDocument || !registry;
  el.exportCampaign.disabled = !campaignDocument || !registry;
  el.loadCampaign.disabled = !registry || !registry.getActiveCampaignId();
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
  el.systemRecordSection.hidden = false;
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

function commerceLine(label, value) {
  return `${label.padEnd(16, ' ')}${value}`;
}

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
  const lines = [
    `COMMERCE // ${current.name.toUpperCase()} // ${current.hex}`,
    commerceLine('SHIP ACCOUNT', formatCr(shipDocument.state.finances.balanceCr)),
    commerceLine('CARGO HOLD', `${shipDocument.state.cargoUsedTons}/${shipDocument.specifications.cargo.capacityTons}t / ${freeHold}t FREE`)
  ];

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
    const remainingFreight = route.freight.offers.filter((entry) => !acceptedFreightIds.has(entry.id));
    const fittingFreight = remainingFreight.filter((entry) => entry.tons <= freeHold + 1e-9);
    lines.push(
      '',
      commerceLine('ROUTE', `${route.origin.name} -> ${route.destination.name} / ${route.distance} parsec${route.distance === 1 ? '' : 's'}`),
      commerceLine('PASSENGERS', `DEMAND H${route.passengerDemand.high} M${route.passengerDemand.middle} L${route.passengerDemand.low} / BOOKED H${bookedHigh} M${bookedMiddle} L${bookedLow}`),
      commerceLine('CABIN SPACE', `HIGH ${highCapacity}${steward ? '' : ' / STEWARD REQUIRED'} / MIDDLE ${middleCapacity} / LOW ${lowCapacity}`),
      commerceLine('BOOKABLE', `HIGH ${steward ? Math.min(highRemaining, highCapacity) : 0} / MIDDLE ${Math.min(middleRemaining, middleCapacity)} / LOW ${Math.min(lowRemaining, lowCapacity)}`),
      commerceLine('FREIGHT', `MAJOR ${route.freight.counts.major} / MINOR ${route.freight.counts.minor} / INCIDENTAL ${route.freight.counts.incidental}`),
      commerceLine('FREIGHT FIT', `${fittingFreight.length} SHIPMENT${fittingFreight.length === 1 ? '' : 'S'} FIT CURRENT ${freeHold}t HOLD`)
    );
    for (const freight of fittingFreight.slice(0, 4)) {
      lines.push(commerceLine('OFFER', `${freight.tons}t ${freight.category.toUpperCase()} / ${formatCr(freight.revenueCr)} ON DELIVERY`));
    }
  } else if (route?.destination) {
    lines.push('', commerceLine('ROUTE', `${current.name} -> ${route.destination.name} / OUT OF JUMP RANGE`));
  } else {
    lines.push('', commerceLine('ROUTE', 'SELECT A REACHABLE DESTINATION FOR PASSENGERS / FREIGHT'));
  }

  if (offer) {
    const aboard = offer.unit === 'tons' ? speculativeQuantityPurchased(offer, current.id) : 0;
    const remaining = Math.max(0, offer.quantityAvailable - aboard);
    lines.push(
      '',
      commerceLine('SPECULATION', `WEEK ${campaignWeekKey(campaignDocument)} / LOT ${offer.code} ${offer.name.toUpperCase()}`),
      commerceLine('AVAILABLE', `${remaining}/${offer.quantityAvailable} ${offer.unit.toUpperCase()} / BASE ${formatCr(offer.basePriceCr)} EACH ${offer.unit === 'tons' ? 'TON' : 'ITEM'}`),
      commerceLine('BUY QUOTE', `${formatCr(offer.pricePerUnitCr)} / ${offer.percentage}% OF BASE / PURCHASE DM ${offer.purchaseDM >= 0 ? '+' : ''}${offer.purchaseDM}`)
    );
    if (offer.unit === 'each') lines.push(commerceLine('AUTOMATION', 'REFEREE TONNAGE REQUIRED FOR INDIVIDUAL ITEMS'));
  }

  const passengers = shipDocument.state.passengerManifest;
  const freightAboard = shipDocument.state.cargoManifest.filter((entry) => entry.category === 'freight');
  const saleCargo = shipDocument.state.cargoManifest.filter((entry) => /^speculative:\d{2}$/.test(entry.category));
  lines.push('', commerceLine('ABOARD', `${passengers.length} PASSENGER${passengers.length === 1 ? '' : 'S'} / ${freightAboard.length} FREIGHT / ${saleCargo.length} SPECULATIVE LOT${saleCargo.length === 1 ? '' : 'S'}`));
  for (const passenger of passengers.slice(0, 4)) {
    const dest = getSubsectorSystem(FAR_MERIDIAN_SUBSECTOR, passenger.destinationSystemId);
    lines.push(commerceLine('PASSENGER', `${passenger.class.toUpperCase()} -> ${(dest?.name ?? passenger.destinationSystemId).toUpperCase()} / ${formatCr(passenger.fareCr)}`));
  }
  for (const cargo of freightAboard.slice(0, 4)) {
    const dest = getSubsectorSystem(FAR_MERIDIAN_SUBSECTOR, cargo.destinationSystemId);
    lines.push(commerceLine('FREIGHT ABOARD', `${cargo.tons}t -> ${(dest?.name ?? cargo.destinationSystemId).toUpperCase()} / ${formatCr(cargo.tons * FREIGHT_RATE_PER_TON_CR)}`));
  }
  for (const cargo of saleCargo.slice(0, 4)) {
    if (cargo.originSystemId === current.id) {
      lines.push(commerceLine('RESALE', `${cargo.tons}t ${cargo.description.toUpperCase()} / TRANSPORT TO ANOTHER WORLD REQUIRED`));
      continue;
    }
    const quote = speculativeSaleQuote(cargo);
    lines.push(commerceLine('RESALE QUOTE', `${cargo.tons}t ${cargo.description.toUpperCase()} / NET ${formatCr(quote.netCr)} / ${quote.percentage}% / DM ${quote.worldDM + quote.characterSkillDM + quote.brokerDM >= 0 ? '+' : ''}${quote.worldDM + quote.characterSkillDM + quote.brokerDM}`));
  }
  if (saleCargo.length) {
    lines.push(commerceLine('SALE DMS', `CHARACTER +${currentCommerceSkillDM()} / BROKER +${speculativeBrokerDM} / COMMISSION ${speculativeBrokerDM * 5}%`));
  }
  el.commerceRecord.textContent = lines.join('\n');

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

    const acceptedFreightIds = new Set(shipDocument.state.cargoManifest.filter((entry) => entry.category === 'freight').map((entry) => entry.id));
    const fittingFreight = route.freight.offers
      .filter((entry) => !acceptedFreightIds.has(entry.id) && entry.tons <= freeHold + 1e-9)
      .slice(0, 4);
    for (const freight of fittingFreight) {
      el.commerceActions.append(makePortButton(`ACCEPT ${freight.tons}t FREIGHT / ${formatCr(freight.revenueCr)}`, () => acceptFreightOffer(freight.id)));
    }
  }

  if (offer?.unit === 'tons') {
    const aboard = speculativeQuantityPurchased(offer, current.id);
    const remaining = Math.max(0, offer.quantityAvailable - aboard);
    const maxByHold = Math.min(Math.floor(freeHold), remaining);
    if (maxByHold >= 1) {
      const oneCost = calculateSpeculativePurchaseCost(offer, 1).totalCr;
      el.commerceActions.append(makePortButton(`BUY 1t ${offer.name.toUpperCase()} / ${formatCr(oneCost)}`, () => buySpeculativeQuantity(1), {
        disabled: oneCost > shipDocument.state.finances.balanceCr
      }));
      if (maxByHold > 1) {
        let affordableMax = 0;
        for (let quantity = maxByHold; quantity >= 1; quantity -= 1) {
          if (calculateSpeculativePurchaseCost(offer, quantity).totalCr <= shipDocument.state.finances.balanceCr) {
            affordableMax = quantity;
            break;
          }
        }
        if (affordableMax > 1) {
          const maxCost = calculateSpeculativePurchaseCost(offer, affordableMax).totalCr;
          el.commerceActions.append(makePortButton(`BUY ${affordableMax}t MAX / ${formatCr(maxCost)}`, () => buySpeculativeQuantity(affordableMax)));
        }
      }
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
    for (const cargo of saleCargo.slice(0, 4)) {
      if (cargo.originSystemId === current.id) continue;
      const quote = speculativeSaleQuote(cargo);
      el.commerceActions.append(makePortButton(`SELL ${cargo.tons}t ${cargo.description.toUpperCase()} / ${formatCr(quote.netCr)}`, () => sellSpeculativeLot(cargo.id)));
    }
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
  const selected = selectedSystemId ? getSubsectorSystem(FAR_MERIDIAN_SUBSECTOR, selectedSystemId) : null;
  el.contractRecord.textContent = buildContractBoardRecord({
    system: current,
    selectedSystem: selected,
    contracts: contractDocuments,
    offers
  });
  el.contractActions.replaceChildren();

  const exclusive = activeExclusiveContract();
  offers.forEach((offer, index) => {
    const requiresEmptyShip = offer.exclusiveShip && (
      activeContracts().length > 0
      || shipDocument.state.cargoManifest.length > 0
      || shipDocument.state.passengerManifest.length > 0
    );
    const disabled = Boolean(exclusive)
      || requiresEmptyShip
      || offer.cargoTons > freeCargoTons();
    const button = makePortButton(`ACCEPT ${index + 1} / ${offer.originSystemName.toUpperCase()} -> ${offer.destinationSystemName.toUpperCase()} / ${offer.title.toUpperCase()} / ${formatCr(offer.paymentCr)}`, () => acceptContractOffer(offer.offerId), { disabled });
    button.title = `${contractSourceLabel(offer)} / LOCAL OFFER AT ${offer.originSystemName} / DESTINATION ${offer.destinationSystemName}`;
    el.contractActions.append(button);
  });

  if (!offers.length) {
    const note = document.createElement('span');
    note.className = 'commerce-note';
    note.textContent = 'NO UNUSED CONTRACT OFFERS AT THIS PORT CALL.';
    el.contractActions.append(note);
  } else if (exclusive) {
    const note = document.createElement('span');
    note.className = 'attention-message';
    note.textContent = `EXCLUSIVE CHARTER ACTIVE TO ${exclusive.destination.systemName.toUpperCase()} / COMPLETE IT BEFORE ACCEPTING OTHER WORK.`;
    el.contractActions.append(note);
  }
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

function preferredPersonalWeapon() {
  const skillWeapons = [
    ['Laser Rifle', 'laser-rifle'], ['Laser Carbine', 'laser-carbine'],
    ['Automatic Rifle', 'automatic-rifle'], ['Rifle', 'rifle'], ['Carbine', 'carbine'],
    ['Submachine Gun', 'submachine-gun'], ['Automatic Pistol', 'automatic-pistol'],
    ['Revolver', 'revolver'], ['Body Pistol', 'body-pistol'], ['Shotgun', 'shotgun'],
    ['Broadsword', 'broadsword'], ['Cutlass', 'cutlass'], ['Sword', 'sword'],
    ['Blade', 'blade'], ['Dagger', 'dagger']
  ];
  const equipment = new Set((gameplayDocument?.benefits?.equipment ?? []).map((entry) => String(entry.name).toLowerCase()));
  const equipped = skillWeapons.find(([name]) => equipment.has(name.toLowerCase()));
  if (equipped) return equipped[1];
  const trained = skillWeapons
    .filter(([name]) => Number(gameplayDocument?.skills?.[name] ?? -1) >= 0)
    .sort((left, right) => Number(gameplayDocument.skills[right[0]] ?? 0) - Number(gameplayDocument.skills[left[0]] ?? 0));
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
    let encounter = createEncounterDocument({
      campaign: campaignDocument,
      situation,
      character: gameplayDocument,
      opponent: {
        name: situation.actor?.name ?? 'Hostile Contact',
        playerWeaponKey: preferredPersonalWeapon()
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

function resolveActiveEncounterAction(action, modifier = 0) {
  try {
    const active = activeEncounterAtCurrentSystem();
    if (!active) throw new Error('no active personal encounter');
    const index = encounterDocuments.findIndex((entry) => entry.identity.id === active.identity.id);
    const result = resolveEncounterRound(active, {
      action, modifier, date: campaignDateSnapshot(),
      dice: seededDice(`${active.identity.id}|round-${active.round}|${action}|${modifier}`)
    });
    encounterDocuments[index] = result.encounter;
    for (const entry of result.entries) logActivity('COMBAT', entry.text);
    resolveLinkedCombatSituation(result.encounter);
    syncCampaignRefs();
    persistCampaignState();
    setStatus(`ENCOUNTER ${result.encounter.status.toUpperCase()} / ROUND ${result.encounter.round}`, result.encounter.status === 'defeat' ? 'error' : 'ok');
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
  const player = encounter.combatants.find((entry) => entry.side === 'party');
  openRollDialog({
    kind: 'encounter-attack',
    title: `ATTACK // ${player.name.toUpperCase()}`,
    basis: `PERSONAL COMBAT // ROUND ${encounter.round} // ${encounter.range.toUpperCase()} RANGE\nWeapon, skill, characteristic, armor, and range are built into the combat throw. Add only the referee's extra situational modifier.`,
    target: 8, targetLocked: true, builtInText: `${player.weaponKey.toUpperCase().replaceAll('-', ' ')} / TABLE TARGET`
  });
  el.rollTargetRow.hidden = true;
}

function renderEncounter() {
  const current = mappedCurrentSystem();
  if (!campaignDocument || !current || !gameplayDocument) {
    el.encounterSection.dataset.available = 'false';
    el.encounterRecord.textContent = '';
    el.encounterActions.replaceChildren();
    applyOperationsDeskTab();
    return;
  }
  el.encounterSection.dataset.available = 'true';
  el.encounterRecord.textContent = buildEncounterRecord({ system: current, encounters: encounterDocuments });
  el.encounterActions.replaceChildren();
  const active = activeEncounterAtCurrentSystem();
  el.operationsTabEncounter?.classList.toggle('attention', Boolean(active));
  if (el.operationsTabEncounter) el.operationsTabEncounter.textContent = active ? '[ ENCOUNTER ! ]' : '[ ENCOUNTER ]';
  if (active) {
    if (active.round === 1 && active.surprise.surpriseSideId === 'party') {
      el.encounterActions.append(makePortButton('AVOID', avoidActiveEncounter));
    }
    el.encounterActions.append(
      makePortButton('ATTACK', () => openEncounterAttackDialog(active)),
      makePortButton('EVADE', () => resolveActiveEncounterAction('evade')),
      makePortButton('CLOSE RANGE', () => resolveActiveEncounterAction('close')),
      makePortButton('OPEN RANGE', () => resolveActiveEncounterAction('open')),
      makePortButton('ESCAPE', () => resolveActiveEncounterAction('escape'))
    );
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
  if (el.operationsTabSituation) el.operationsTabSituation.textContent = active ? '[ SITUATION ! ]' : '[ SITUATION ]';

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
    encounter: el.encounterSection
  };
  const tabs = {
    port: el.operationsTabPort,
    trade: el.operationsTabTrade,
    jobs: el.operationsTabJobs,
    situation: el.operationsTabSituation,
    encounter: el.operationsTabEncounter
  };
  for (const [key, panel] of Object.entries(panels)) {
    const available = panel?.dataset.available === 'true';
    if (panel) panel.hidden = key !== operationsDeskTab || !available;
    if (tabs[key]) tabs[key].setAttribute('aria-selected', key === operationsDeskTab ? 'true' : 'false');
  }
}

function setOperationsDeskTab(tab) {
  if (!['port', 'trade', 'jobs', 'situation', 'encounter'].includes(tab)) return;
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
  const portRecordText = buildPortServicesRecord({
    system,
    ship: shipDocument,
    character: gameplayDocument
  });
  const portAttention = [];
  if (shipDocument?.state?.currentFuelTons === null || shipDocument?.state?.currentFuelTons === undefined) portAttention.push('FUEL ');
  const currentPortCall = shipDocument?.state?.portCall?.systemId === system.id ? shipDocument.state.portCall : null;
  if (currentPortCall && !currentPortCall.berthingPaid && currentPortCall.berthingDueCr > 0) portAttention.push('BERTHING ');
  renderRecordWithHighlights(el.portServicesRecord, portRecordText, portAttention);
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
  el.subsectorSection.hidden = false;
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
  const preferredCharacterId = campaign.party.characterIds[0];
  const nextCharacter = resolved.characters.find((entry) => entry.identity.id === preferredCharacterId) ?? resolved.characters[0];
  if (!nextCharacter) throw new Error('campaign has no resolvable party character');
  const nextShip = campaign.activeShipId
    ? resolved.ships.find((entry) => entry.identity.id === campaign.activeShipId) ?? null
    : null;

  campaignDocument = campaign;
  selectedSystemId = null;
  normalizeCampaignMappedLocation();
  gameplayDocument = nextCharacter;
  shipDocument = nextShip;
  contractDocuments = resolved.contracts;
  situationDocuments = resolved.situations;
  encounterDocuments = resolved.encounters;
  contactDocuments = resolved.contacts;
  threadDocuments = resolved.threads;
  documentMode = TRAVELLER_DOCUMENT_KINDS.CHARACTER;
  character = createCharacter();
  setActivityContext();
  const expired = reconcileExpiredContracts();
  const createdSituation = ensureArrivalSituation({ log: false });
  const consequencesChanged = reconcileAdventureConsequences({ log: false });
  if (expired.length || createdSituation || consequencesChanged) persistCampaignState();
}

function newCampaign() {
  try {
    const gameplay = ensureGameplayDocument();
    if (!gameplay) throw new Error('complete or load a gameplay character before creating a campaign');
    persistGameplayDocuments();
    selectedSystemId = null;
    contractDocuments = [];
    situationDocuments = [];
    encounterDocuments = [];
    contactDocuments = [];
    threadDocuments = [];
    campaignDocument = createCampaignDocument({
      characters: [gameplay],
      ships: shipDocument ? [shipDocument] : [],
      contracts: [],
      situations: [],
      encounters: [],
      contacts: [],
      threads: [],
      partyCharacterIds: [gameplay.identity.id],
      activeShipId: shipDocument?.identity.id ?? null
    });
    documentMode = TRAVELLER_DOCUMENT_KINDS.CHARACTER;
    setActivityContext();
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
    logActivity('SYSLOG', `${campaignDocument.identity.name || 'Campaign'} saved locally`);
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
    logActivity('SYSLOG', `${campaignDocument.identity.name || 'Campaign'} restored from local save`);
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
    logActivity('SYSLOG', `${campaignDocument.identity.name || 'Campaign'} portable bundle exported`);
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
  renderSubsector();
  renderSystemRecord();
  renderPortServices();
  renderCommerce();
  renderContracts();
  renderSituations();
  renderEncounter();
  applyOperationsDeskTab();
  renderShip();
  renderCampaignHeader();
  renderSelectedSystemSummary();
  applyCampaignLayout();
  renderActivity();
}

function execute(action, payload = {}) {
  try {
    if (documentMode !== TRAVELLER_DOCUMENT_KINDS.CHARGEN) throw new Error('chargen actions are unavailable while a gameplay document is loaded');
    const result = performChargenAction(character, action, payload);
    character = result.character;
    documentMode = TRAVELLER_DOCUMENT_KINDS.CHARGEN;
    gameplayDocument = null;
    shipDocument = null;
    campaignDocument = null;
    selectedSystemId = null;
    closeHelp();
    setActivityContext();
    logActivity('CHAR', `${ACTION_LABELS[action] ?? action} resolved`);
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

async function loadDocument(file) {
  if (!file) return;
  try {
    const text = await file.text();
    const loaded = loadTravellerDocument(text);

    if (loaded.kind === TRAVELLER_DOCUMENT_KINDS.CHARGEN) {
      character = loaded.character;
      gameplayDocument = null;
      shipDocument = null;
      campaignDocument = null;
      contractDocuments = [];
      situationDocuments = [];
      encounterDocuments = [];
      contactDocuments = [];
      threadDocuments = [];
      selectedSystemId = null;
      documentMode = TRAVELLER_DOCUMENT_KINDS.CHARGEN;
      setActivityContext();
      logActivity('SYSLOG', `Chargen JSON loaded: ${file.name}`);
      setStatus('CHARGEN JSON LOADED', 'ok');
    } else if (loaded.kind === TRAVELLER_DOCUMENT_KINDS.CHARACTER) {
      gameplayDocument = loaded.characterDocument;
      documentMode = TRAVELLER_DOCUMENT_KINDS.CHARACTER;
      campaignDocument = null;
      contractDocuments = [];
      situationDocuments = [];
      encounterDocuments = [];
      contactDocuments = [];
      threadDocuments = [];
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
    } else if (loaded.kind === TRAVELLER_DOCUMENT_KINDS.CAMPAIGN) {
      if (!registry) throw new Error('browser local storage is unavailable');
      registry.put(loaded.campaignDocument);
      registry.setActiveCampaignId(loaded.campaignDocument.identity.id);
      restoreCampaignFromRegistry(loaded.campaignDocument);
      logActivity('SYSLOG', `${campaignDocument.identity.name || 'Campaign'} document loaded from local registry`);
      setStatus('CAMPAIGN DOCUMENT LOADED FROM LOCAL REGISTRY', 'ok');
    } else if (loaded.kind === TRAVELLER_DOCUMENT_KINDS.CAMPAIGN_BUNDLE) {
      if (!registry) throw new Error('browser local storage is unavailable');
      const bundle = registry.putBundle(loaded.campaignBundle);
      registry.setActiveCampaignId(bundle.campaign.identity.id);
      restoreCampaignFromRegistry(bundle.campaign);
      logActivity('SYSLOG', `${campaignDocument.identity.name || 'Campaign'} portable bundle loaded`);
      setStatus('PORTABLE CAMPAIGN BUNDLE LOADED', 'ok');
    }

    closeHelp();
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  } finally {
    el.loadFile.value = '';
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

el.newCharacter.addEventListener('click', () => {
  if (!window.confirm('Discard the current chargen state and create a new character?')) return;
  character = createCharacter();
  documentMode = TRAVELLER_DOCUMENT_KINDS.CHARGEN;
  gameplayDocument = null;
  shipDocument = null;
  campaignDocument = null;
  contractDocuments = [];
  situationDocuments = [];
  encounterDocuments = [];
  contactDocuments = [];
  threadDocuments = [];
  selectedSystemId = null;
  for (const key of Object.keys(detailPanels)) detailPanels[key] = false;
  closeRollDialog();
  closeHelp();
  setActivityContext();
  logActivity('CHAR', 'New character generation started');
  setStatus('NEW CHARACTER GENERATED', 'ok');
  render();
});

el.campaignName.addEventListener('input', () => updateCampaignName(el.campaignName.value));
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
  if (!activityLog) return;
  if (!window.confirm('Clear the activity log for the current campaign/session?')) return;
  activityLog.clear();
  renderActivity();
  setStatus('ACTIVITY LOG CLEARED', 'ok');
});

el.togglePersonnel.addEventListener('click', () => toggleDetailPanel('personnel'));
el.toggleShip.addEventListener('click', () => toggleDetailPanel('ship'));
el.toggleCampaign.addEventListener('click', () => toggleDetailPanel('campaign'));
el.toggleThreads.addEventListener('click', () => toggleDetailPanel('threads'));
el.toggleChargenRecord.addEventListener('click', () => toggleDetailPanel('chargen'));
el.toggleSystemDetails.addEventListener('click', () => toggleDetailPanel('system'));

el.headerTask.addEventListener('click', () => {
  const kind = el.headerTask.dataset.taskKind;
  if (kind === 'encounter') {
    setOperationsDeskTab('encounter');
    el.subsectorSection?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  } else if (kind === 'situation') {
    setOperationsDeskTab('situation');
    el.subsectorSection?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  } else if (kind === 'contract') {
    setOperationsDeskTab('jobs');
    el.subsectorSection?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  } else if (kind === 'thread') {
    detailPanels.threads = true;
    applyCampaignLayout();
    el.threadSection?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  } else return;
});

el.rollDialogClose.addEventListener('click', closeRollDialog);
el.rollCancel.addEventListener('click', closeRollDialog);
el.rollDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeRollDialog();
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
      resolveActiveEncounterAction('attack', modifier);
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
el.operationsTabSituation.addEventListener('click', () => setOperationsDeskTab('situation'));
el.operationsTabEncounter.addEventListener('click', () => setOperationsDeskTab('encounter'));

el.newCampaign.addEventListener('click', newCampaign);
el.saveCampaign.addEventListener('click', saveCampaignLocal);
el.loadCampaign.addEventListener('click', loadSavedCampaign);
el.exportCampaign.addEventListener('click', exportCampaignPortable);

el.saveCharacter.addEventListener('click', saveCharacter);
el.loadCharacter.addEventListener('click', () => el.loadFile.click());
el.loadFile.addEventListener('change', () => loadDocument(el.loadFile.files?.[0]));

setActivityContext();
render();
if (!registry) setStatus('READY / LOCAL CAMPAIGN STORAGE UNAVAILABLE', 'error');

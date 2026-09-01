import {
  CHARGEN_ACTIONS,
  CHARGEN_PHASES,
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
  FREIGHT_RATE_PER_TON_CR
} from '../../packages/classic-traveller-rules/index.js';

import {
  ACTION_LABELS,
  buildCampaignRecord,
  buildContractBoardRecord,
  buildCharacterRecord,
  buildFinalCharacterRecord,
  buildGenerationLog,
  buildJumpPlan,
  buildPortServicesRecord,
  buildShipRecord,
  buildProcedure,
  buildServiceHistory,
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
  advanceCampaignDays,
  createCampaignDocument,
  refreshCampaignDocumentRefs,
  updateCampaignIdentity,
  updateCampaignLocation,
  updateCampaignTime
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
  isContractOverdue
} from '../src/contract-document.js';

import {
  generateContractBoard
} from '../world/contract-board.js';

import {
  FAR_MERIDIAN_SUBSECTOR
} from '../world/far-meridian-subsector.js';

const el = {
  status: document.querySelector('#system-status'),
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
  subsectorSection: document.querySelector('#subsector-section'),
  subsectorName: document.querySelector('#subsector-name'),
  jumpCapability: document.querySelector('#jump-capability'),
  subsectorLegend: document.querySelector('#subsector-legend'),
  subsectorMap: document.querySelector('#subsector-map'),
  jumpPlan: document.querySelector('#jump-plan'),
  jumpActions: document.querySelector('#jump-actions'),
  mapZoomOut: document.querySelector('#map-zoom-out'),
  mapZoomLabel: document.querySelector('#map-zoom-label'),
  mapZoomIn: document.querySelector('#map-zoom-in'),
  mapZoomFit: document.querySelector('#map-zoom-fit'),
  systemRecordSection: document.querySelector('#system-record-section'),
  systemRecordHeading: document.querySelector('#system-record-heading'),
  systemRecord: document.querySelector('#system-record'),
  portServicesSection: document.querySelector('#port-services-section'),
  portServicesRecord: document.querySelector('#port-services-record'),
  portActions: document.querySelector('#port-actions'),
  commerceSection: document.querySelector('#commerce-section'),
  commerceRecord: document.querySelector('#commerce-record'),
  commerceActions: document.querySelector('#commerce-actions'),
  contractSection: document.querySelector('#contract-section'),
  contractRecord: document.querySelector('#contract-record'),
  contractActions: document.querySelector('#contract-actions'),
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
let documentMode = TRAVELLER_DOCUMENT_KINDS.CHARGEN;
let openHelpTopic = null;
let selectedSystemId = null;
let subsectorZoom = 1;
let speculativeBrokerDM = 0;
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
    const message = document.createElement('div');
    message.className = 'activity-message';
    message.textContent = entry.message;
    row.append(meta, message);
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

function speculativeQuantityAlreadyAboard(offer, systemId) {
  if (!shipDocument || !offer || !systemId) return 0;
  return shipDocument.state.cargoManifest
    .filter((entry) => entry.category === `speculative:${offer.code}` && entry.originSystemId === systemId)
    .reduce((sum, entry) => sum + entry.tons, 0);
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
    return;
  }
  el.shipSection.hidden = false;
  if (el.shipName.value !== shipDocument.identity.name) el.shipName.value = shipDocument.identity.name;
  if (el.shipRegistry.value !== shipDocument.identity.registry) el.shipRegistry.value = shipDocument.identity.registry;
  el.shipRecord.textContent = buildShipRecord(shipDocument);
}

function persistGameplayDocuments() {
  if (!registry) return;
  if (gameplayDocument) registry.put(gameplayDocument);
  if (shipDocument) registry.put(shipDocument);
  for (const contract of contractDocuments) registry.put(contract);
}

function syncCampaignRefs() {
  if (!campaignDocument) return;
  campaignDocument = refreshCampaignDocumentRefs(campaignDocument, {
    characters: gameplayDocument ? [gameplayDocument] : [],
    ships: shipDocument ? [shipDocument] : [],
    contracts: contractDocuments
  });
}

function campaignDocumentsForDisplay() {
  if (!campaignDocument) return { characters: [], ships: [], contracts: [], missing: [] };
  let characters = [];
  let ships = [];
  let contracts = [];
  let missing = [];
  if (registry) {
    try {
      const resolved = registry.resolveCampaign(campaignDocument);
      characters = resolved.characters;
      ships = resolved.ships;
      contracts = resolved.contracts;
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
  return { characters, ships, contracts, missing };
}

function renderCampaign() {
  el.saveCampaign.disabled = !campaignDocument || !registry;
  el.exportCampaign.disabled = !campaignDocument || !registry;
  el.loadCampaign.disabled = !registry || !registry.getActiveCampaignId();
  if (!campaignDocument) {
    el.campaignSection.hidden = true;
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
    logActivity('CONTRACT', `${contract.identity.title} accepted / ${contract.origin.systemName} to ${contract.destination.systemName} / ${formatCr(contract.economics.paymentCr)} / due ${String(contract.timing.deadlineDate.dayOfYear).padStart(3, '0')}-${contract.timing.deadlineDate.year}`);
    setStatus(`CONTRACT ACCEPTED: ${contract.identity.title.toUpperCase()} / ${contract.destination.systemName.toUpperCase()}`, 'ok');
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
    syncCampaignRefs();
    persistGameplayDocuments();
    if (registry) registry.put(campaignDocument);
    selectedSystemId = null;
    logActivity('ARRIVAL', `${shipLabel} arrived ${destination.name} / ${destination.hex} / ${destination.mainWorld.name} / fuel ${shipDocument.state.currentFuelTons}t`);
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
    const vh = Math.round(64 * subsectorZoom * 100) / 100;
    const px = Math.round(640 * subsectorZoom);
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
    return;
  }
  const current = mappedCurrentSystem();
  const selected = selectedSystemId ? getSubsectorSystem(FAR_MERIDIAN_SUBSECTOR, selectedSystemId) : null;
  const system = selected ?? current;
  if (!system) {
    el.systemRecordSection.hidden = true;
    el.systemRecord.textContent = '';
    return;
  }
  el.systemRecordSection.hidden = false;
  el.systemRecordHeading.textContent = selected && selected.id !== current?.id
    ? 'SELECTED SYSTEM RECORD'
    : 'CURRENT SYSTEM RECORD';
  el.systemRecord.textContent = buildSystemRecord(system);
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
    persistGameplayDocuments();
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
    const aboard = speculativeQuantityAlreadyAboard(offer, system.id);
    const remaining = Math.max(0, offer.quantityAvailable - aboard);
    if (quantity > remaining) throw new Error(`only ${remaining} ${offer.unit} remain in this weekly lot`);
    const result = purchaseSpeculativeCargo(shipDocument, offer, quantity, {
      originSystemId: system.id,
      dateLabel: activityDateLabel()
    });
    shipDocument = result.ship;
    persistGameplayDocuments();
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
    if (!shipDocument) throw new Error('active ship is required');
    const cargo = shipDocument.state.cargoManifest.find((entry) => entry.id === cargoId);
    if (!cargo) throw new Error('speculative cargo lot is no longer aboard');
    const quote = speculativeSaleQuote(cargo);
    if (!quote) throw new Error('unable to quote this cargo');
    const result = sellSpeculativeCargo(shipDocument, cargoId, quote, { dateLabel: activityDateLabel() });
    shipDocument = result.ship;
    persistGameplayDocuments();
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
    el.commerceSection.hidden = true;
    el.commerceRecord.textContent = '';
    el.commerceActions.replaceChildren();
    return;
  }

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
    const aboard = offer.unit === 'tons' ? speculativeQuantityAlreadyAboard(offer, current.id) : 0;
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
    const aboard = speculativeQuantityAlreadyAboard(offer, current.id);
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

  const speculativeAboard = shipDocument.state.cargoManifest.filter((entry) => /^speculative:\d{2}$/.test(entry.category));
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
}

function renderContracts() {
  const current = mappedCurrentSystem();
  if (!campaignDocument || !current || !shipDocument || !gameplayDocument) {
    el.contractSection.hidden = true;
    el.contractRecord.textContent = '';
    el.contractActions.replaceChildren();
    return;
  }

  el.contractSection.hidden = false;
  const offers = availableContractOffers();
  el.contractRecord.textContent = buildContractBoardRecord({
    system: current,
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
    const button = makePortButton(`ACCEPT ${index + 1} / ${offer.title.toUpperCase()} / ${formatCr(offer.paymentCr)}`, () => acceptContractOffer(offer.offerId), { disabled });
    button.title = `${contractSourceLabel(offer)} / ${offer.destinationSystemName}`;
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
}

function renderPortServices() {
  if (!campaignDocument) {
    el.portServicesSection.hidden = true;
    el.portServicesRecord.textContent = '';
    el.portActions.replaceChildren();
    return;
  }
  const system = mappedCurrentSystem();
  if (!system) {
    el.portServicesSection.hidden = true;
    el.portServicesRecord.textContent = '';
    el.portActions.replaceChildren();
    return;
  }

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
    const projectedCost = Math.round(missingFuel * service.pricePerTonCr);
    const label = service.freeScoutFuel
      ? `REFUEL TO FULL / FREE`
      : `REFUEL TO FULL / ${formatCr(projectedCost)}`;
    el.portActions.append(makePortButton(label, refuelAtCurrentPort, {
      disabled: projectedCost > shipDocument.state.finances.balanceCr
    }));
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

function renderSubsector() {
  if (!campaignDocument) {
    el.subsectorSection.hidden = true;
    el.subsectorMap.replaceChildren();
    el.jumpPlan.textContent = '';
    el.jumpActions.replaceChildren();
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

  el.subsectorName.textContent = `${FAR_MERIDIAN_SUBSECTOR.name.toUpperCase()} // PROVISIONAL TEST SUBSECTOR`;
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
  documentMode = TRAVELLER_DOCUMENT_KINDS.CHARACTER;
  character = createCharacter();
  setActivityContext();
}

function newCampaign() {
  try {
    const gameplay = ensureGameplayDocument();
    if (!gameplay) throw new Error('complete or load a gameplay character before creating a campaign');
    persistGameplayDocuments();
    selectedSystemId = null;
    contractDocuments = [];
    campaignDocument = createCampaignDocument({
      characters: [gameplay],
      ships: shipDocument ? [shipDocument] : [],
      contracts: [],
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
  renderShip();
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
    renderCampaign();
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
  selectedSystemId = null;
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

el.mapZoomOut.addEventListener('click', () => setSubsectorZoom(subsectorZoom - SUBSECTOR_ZOOM_STEP));
el.mapZoomIn.addEventListener('click', () => setSubsectorZoom(subsectorZoom + SUBSECTOR_ZOOM_STEP));
el.mapZoomFit.addEventListener('click', () => setSubsectorZoom(1));

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

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
  jumpDistanceBetweenSystems
} from '../../packages/classic-traveller-rules/index.js';

import {
  ACTION_LABELS,
  buildCampaignRecord,
  buildCharacterRecord,
  buildFinalCharacterRecord,
  buildGenerationLog,
  buildJumpPlan,
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
  addShipToCampaign,
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
  systemRecordSection: document.querySelector('#system-record-section'),
  systemRecordHeading: document.querySelector('#system-record-heading'),
  systemRecord: document.querySelector('#system-record')
};

let character = createCharacter();
let gameplayDocument = null;
let shipDocument = null;
let campaignDocument = null;
let documentMode = TRAVELLER_DOCUMENT_KINDS.CHARGEN;
let openHelpTopic = null;
let selectedSystemId = null;
let registry = null;

try {
  registry = createDocumentRegistry({ storage: window.localStorage });
} catch (error) {
  console.error(error);
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
}

function syncCampaignRefs() {
  if (!campaignDocument) return;
  campaignDocument = refreshCampaignDocumentRefs(campaignDocument, {
    characters: gameplayDocument ? [gameplayDocument] : [],
    ships: shipDocument ? [shipDocument] : []
  });
}

function campaignDocumentsForDisplay() {
  if (!campaignDocument) return { characters: [], ships: [], missing: [] };
  let characters = [];
  let ships = [];
  let missing = [];
  if (registry) {
    try {
      const resolved = registry.resolveCampaign(campaignDocument);
      characters = resolved.characters;
      ships = resolved.ships;
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
  return { characters, ships, missing };
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
  selectedSystemId = systemId;
  const system = getSubsectorSystem(FAR_MERIDIAN_SUBSECTOR, systemId);
  setStatus(`SYSTEM SELECTED: ${system?.name ?? systemId}`, 'ok');
  renderSubsector();
}

function setStartingSubsectorLocation() {
  try {
    if (!campaignDocument) throw new Error('no campaign is active');
    if (mappedCurrentSystem()) throw new Error('campaign already has a mapped current system');
    const system = getSubsectorSystem(FAR_MERIDIAN_SUBSECTOR, selectedSystemId);
    if (!system) throw new Error('select a starting system first');
    campaignDocument = updateCampaignLocation(campaignDocument, campaignLocationForSystem(system));
    selectedSystemId = null;
    setStatus(`STARTING LOCATION SET: ${system.name} / ${system.mainWorld.name} / SAVE CAMPAIGN`, 'ok');
    render();
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? String(error), 'error');
  }
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
    if (!Number.isInteger(jumpRating)) throw new Error('an active ship with a jump drive is required');
    const distance = jumpDistanceBetweenSystems(FAR_MERIDIAN_SUBSECTOR, current.id, destination.id);
    if (distance > jumpRating) throw new Error(`${destination.name} is ${distance} parsecs away; active ship is Jump-${jumpRating}`);

    campaignDocument = updateCampaignLocation(campaignDocument, campaignLocationForSystem(destination));
    // Book 2 describes jump travel as taking about one week regardless of
    // distance. v0.9 resolves that campaign interval as seven days.
    campaignDocument = advanceCampaignDays(campaignDocument, 7);
    selectedSystemId = null;
    setStatus(`JUMP COMPLETE: ${destination.name} / +7 DAYS / SAVE CAMPAIGN`, 'ok');
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
      group.setAttribute('aria-label', `${system.name}, hex ${hex}, ${relation}`);
      group.dataset.systemId = system.id;

      const title = createSvgElement('title');
      title.textContent = `${system.name} / ${system.mainWorld.name} / ${system.mainWorld.uwp} / ${hex} / ${relation}`;
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
    ? 'CURRENT ◆   IN RANGE ●   OUT OF RANGE ●   EMPTY ·'
    : 'SYSTEM ●   SELECTED SYSTEM OUTLINED   EMPTY ·';

  el.subsectorMap.replaceChildren(renderSubsectorSvg({ current, selected, reachable }));

  const distance = current && selected && current.id !== selected.id
    ? jumpDistanceBetweenSystems(FAR_MERIDIAN_SUBSECTOR, current.id, selected.id)
    : current && selected
      ? 0
      : null;
  el.jumpPlan.textContent = buildJumpPlan({
    campaign: campaignDocument,
    currentSystem: current,
    selectedSystem: selected,
    distance,
    jumpRating
  });

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
  if (Number.isInteger(jumpRating) && distance <= jumpRating) {
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
  documentMode = TRAVELLER_DOCUMENT_KINDS.CHARACTER;
  character = createCharacter();
}

function newCampaign() {
  try {
    const gameplay = ensureGameplayDocument();
    if (!gameplay) throw new Error('complete or load a gameplay character before creating a campaign');
    persistGameplayDocuments();
    selectedSystemId = null;
    campaignDocument = createCampaignDocument({
      characters: [gameplay],
      ships: shipDocument ? [shipDocument] : [],
      partyCharacterIds: [gameplay.identity.id],
      activeShipId: shipDocument?.identity.id ?? null
    });
    documentMode = TRAVELLER_DOCUMENT_KINDS.CHARACTER;
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
  renderShip();
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
      selectedSystemId = null;
      documentMode = TRAVELLER_DOCUMENT_KINDS.CHARGEN;
      setStatus('CHARGEN JSON LOADED', 'ok');
    } else if (loaded.kind === TRAVELLER_DOCUMENT_KINDS.CHARACTER) {
      gameplayDocument = loaded.characterDocument;
      documentMode = TRAVELLER_DOCUMENT_KINDS.CHARACTER;
      campaignDocument = null;
      selectedSystemId = null;
      if (shipDocument && !shipMatchesCharacter(shipDocument, gameplayDocument)) shipDocument = null;
      if (registry) registry.put(gameplayDocument);
      setStatus('CHARACTER DOCUMENT LOADED / REGISTERED LOCALLY', 'ok');
    } else if (loaded.kind === TRAVELLER_DOCUMENT_KINDS.SHIP) {
      if (gameplayDocument && !shipMatchesCharacter(loaded.shipDocument, gameplayDocument)) {
        throw new Error(`ship ${loaded.shipDocument.identity.id} is not linked to loaded character ${gameplayDocument.identity.id}`);
      }
      shipDocument = loaded.shipDocument;
      campaignDocument = null;
      selectedSystemId = null;
      if (gameplayDocument) shipDocument = updateShipAssignedCharacterName(shipDocument, gameplayDocument.identity.name);
      if (registry) registry.put(shipDocument);
      setStatus(gameplayDocument ? 'LINKED SHIP DOCUMENT LOADED / REGISTERED LOCALLY' : 'SHIP DOCUMENT LOADED / REGISTERED LOCALLY', 'ok');
    } else if (loaded.kind === TRAVELLER_DOCUMENT_KINDS.CAMPAIGN) {
      if (!registry) throw new Error('browser local storage is unavailable');
      registry.put(loaded.campaignDocument);
      registry.setActiveCampaignId(loaded.campaignDocument.identity.id);
      restoreCampaignFromRegistry(loaded.campaignDocument);
      setStatus('CAMPAIGN DOCUMENT LOADED FROM LOCAL REGISTRY', 'ok');
    } else if (loaded.kind === TRAVELLER_DOCUMENT_KINDS.CAMPAIGN_BUNDLE) {
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
  selectedSystemId = null;
  closeHelp();
  setStatus('NEW CHARACTER GENERATED', 'ok');
  render();
});

el.campaignName.addEventListener('input', () => updateCampaignName(el.campaignName.value));
el.campaignDay.addEventListener('change', updateCampaignDate);
el.campaignYear.addEventListener('change', updateCampaignDate);

el.newCampaign.addEventListener('click', newCampaign);
el.saveCampaign.addEventListener('click', saveCampaignLocal);
el.loadCampaign.addEventListener('click', loadSavedCampaign);
el.exportCampaign.addEventListener('click', exportCampaignPortable);

el.saveCharacter.addEventListener('click', saveCharacter);
el.loadCharacter.addEventListener('click', () => el.loadFile.click());
el.loadFile.addEventListener('change', () => loadDocument(el.loadFile.files?.[0]));

render();
if (!registry) setStatus('READY / LOCAL CAMPAIGN STORAGE UNAVAILABLE', 'error');

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.resolve(here, '../client');

async function read(name) {
  return readFile(path.join(clientDir, name), 'utf8');
}

test('client entry point uses ES modules and the terminal stylesheet', async () => {
  const html = await read('index.html');
  // v0.109.0: app.js is imported by boot.mjs rather than by the page, so a
  // stale vendor/ reports itself instead of dying with a bare SyntaxError.
  assert.match(html, /<script type="module" src="\.\/boot\.mjs\?v=v[\d.]+"><\/script>/);
  assert.match(html, /<link rel="stylesheet" href="\.\/styles\.css">/);
  assert.match(html, /id="app-title" class="title">TRAVELLER</);
});

test('client routes chargen actions through the public dispatcher', async () => {
  const app = await read('app.js');
  assert.match(app, /performChargenAction/);
  assert.match(app, /exportCharacter/);
  assert.match(app, /importCharacter/);
  assert.doesNotMatch(app, /enlistment\s*:\s*\{/i);
  assert.doesNotMatch(app, /survival\s*:\s*\{/i);
  assert.doesNotMatch(app, /reenlistment\s*:\s*\{/i);
});

test('terminal presentation avoids rounded-card styling', async () => {
  const css = await read('styles.css');
  assert.match(css, /Consolas/);
  assert.match(css, /background:\s*var\(--paper\)/);
  assert.doesNotMatch(css, /border-radius:\s*[1-9]/);
  assert.doesNotMatch(css, /box-shadow/);
});

test('v0.11.0.1 retains contextual help and highlighted legal actions', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  assert.match(html, /v0\.278\.0/);
  assert.match(html, /data-help-topic="personnel-record"/);
  assert.match(html, /id="context-help"/);
  assert.match(app, /helpForTopic/);
  assert.match(app, /WHAT NOW\?/);
  assert.match(app, /action-button/);
  assert.match(css, /--action-ready:/);
  assert.match(css, /--attention:/);
  assert.match(css, /\.action-button/);
  assert.match(css, /\.procedure\.attention/);
  assert.match(css, /\.help-panel/);
});

test('v0.11.0 specialization UI uses engine-supplied legal choices instead of free text', async () => {
  const html = await read('index.html');
  const app = await read('app.js');

  assert.match(html, /v0\.278\.0/);
  const chargenView = await read('chargen-view.js');
  assert.match(chargenView, /available\.choices\.specializations/);
  assert.doesNotMatch(app, /id = 'skill-specialization'/);
  assert.doesNotMatch(app, /id = 'benefit-specialization'/);
  assert.doesNotMatch(app, /placeholder = 'e\.g\. Rifle'/);
});


test('v0.11.0 exposes character and ship document actions after chargen', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const model = await read('ui-model.js');

  assert.match(html, /SAVE CHARGEN JSON/);
  assert.match(html, /LOAD JSON/);
  assert.match(app, /createCharacterDocument/);
  assert.match(app, /exportCharacterDocument/);
  assert.match(app, /EXPORT CHARACTER/);
  assert.match(app, /ASSIGN SCOUT SHIP/);
  assert.match(app, /EXPORT SHIP/);
  assert.match(app, /createTypeSScoutReserveShipForCharacter/);
  assert.match(html, /id="ship-section"/);
  assert.match(html, /SHIP'S REGISTER/);
  assert.match(model, /FINAL PERSONNEL RECORD/);
  assert.match(model, /SHIP ENTITLEMENT/);
  assert.match(model, /buildShipRecord/);
});


test('v0.11.0 exposes opt-in character, ship, and registry generators', async () => {
  const html = await read('index.html');
  const app = await read('app.js');

  assert.match(html, /id="random-character-name"/);
  assert.match(html, /id="random-ship-name"/);
  assert.match(html, /id="generate-ship-registry"/);
  assert.match(app, /generateCharacterName/);
  assert.match(app, /generateShipName/);
  assert.match(app, /generateShipRegistry/);
});


test('v0.11.0 routes chargen, gameplay character, and ship JSON through the document loader', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const loader = await read('document-loader.js');

  assert.match(html, /\[ LOAD JSON \]/);
  assert.match(app, /loadTravellerDocument/);
  assert.match(loader, /importCharacterDocument/);
  assert.match(loader, /importShipDocument/);
  assert.match(loader, /importCharacter/);
  assert.match(app, /GAMEPLAY DOCUMENT LOADED/);
});


test('v0.11.0 exposes the persistent campaign shell and portable bundle controls', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const loader = await read('document-loader.js');
  const model = await read('ui-model.js');

  assert.match(html, /id="new-campaign"/);
  assert.match(html, /id="save-campaign"/);
  assert.match(html, /id="load-campaign"/);
  assert.match(html, /id="export-campaign"/);
  assert.match(html, /id="campaign-section"/);
  assert.match(app, /createDocumentRegistry/);
  assert.match(app, /createCampaignDocument/);
  assert.match(app, /exportCampaignBundle/);
  assert.match(loader, /CAMPAIGN_BUNDLE/);
  assert.match(model, /buildCampaignRecord/);
});


test('v0.11.0 exposes an authored subsector map and jump controls', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  assert.match(html, /SUBSECTOR NAVIGATION/);
  assert.match(html, /id="subsector-map"/);
  assert.match(html, /id="jump-plan"/);
  assert.match(app, /FAR_MERIDIAN_SUBSECTOR/);
  assert.match(app, /getJumpDestinations/);
  assert.match(app, /jumpDistanceBetweenSystems/);
  assert.match(app, /advanceCampaignDays\(campaignDocument, 7\)/);
  assert.match(app, /createElementNS\('http:\/\/www\.w3\.org\/2000\/svg'/);
  assert.match(app, /flatTopHexPoints/);
  assert.match(css, /\.subsector-svg/);
  assert.match(css, /\.subsector-hex\.reachable/);
  assert.match(css, /\.subsector-hex\.current/);
});


test('v0.11.0 exposes compact Book 3 system/world records', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const model = await read('ui-model.js');

  assert.match(html, /id="system-record-section"/);
  assert.match(html, /data-help-topic="system-record"/);
  assert.match(app, /renderSystemRecord/);
  assert.match(app, /buildSystemRecord/);
  assert.match(model, /parseUniversalWorldProfile/);
  assert.match(model, /TRAVEL ZONE/);
});


test('v0.11.0 exposes a persistent right-rail activity log', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');
  const activity = await read('../src/activity-log.js');

  assert.match(html, /id="activity-panel"/);
  assert.match(html, /id="activity-feed"/);
  assert.match(html, /ACTIVITY LOG/);
  assert.match(app, /createActivityLogStore/);
  assert.match(app, /logActivity\('JUMP'/);
  assert.match(app, /logActivity\('ARRIVAL'/);
  assert.match(app, /CAMPAIGN SAVED TO THIS BROWSER/);
  assert.match(css, /\.activity-panel/);
  assert.match(css, /position:\s*sticky/);
  assert.match(activity, /ACTIVITY_LOG_MAX_ENTRIES = 250/);
});


test('v0.11.0 exposes port operations and ship commerce foundation', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const model = await read('ui-model.js');
  assert.match(html, /id="port-services-section"/);
  assert.match(html, /PORT SERVICES/);
  assert.match(html, /data-help-topic="port-services"/);
  assert.match(app, /transferCharacterCreditsToShip/);
  assert.match(app, /purchaseShipFuel/);
  assert.match(app, /refuelShipToCapacity/);
  assert.match(app, /id = 'ship-fuel-tons'|id = "ship-fuel-tons"|input\.id = 'ship-fuel-tons'/);
  assert.match(app, /BUY \$\{tons\}t/);
  assert.match(app, /payCurrentBerthing/);
  assert.match(app, /skimGasGiantToCapacity/);
  assert.match(app, /canShipMakeJump/);
  assert.match(model, /buildPortServicesPanel/);
  assert.match(model, /TRADE CLASSIFICATIONS/);
});


test('v0.11.0.1 adds base markers, map zoom controls, and a left navigation rail', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  assert.match(html, /v0\.278\.0/);
  assert.match(html, /class="scene shell-stage"/);
  assert.match(html, /id="map-zoom-out"/);
  assert.match(html, /id="map-zoom-in"/);
  assert.match(html, /id="map-zoom-fit"/);
  const mapModule = await read('subsector-svg.js');
  assert.match(mapModule, /appendBaseMarkers/);
  assert.match(mapModule, /Scout Base/);
  assert.match(mapModule, /Naval Base/);
  assert.match(app, /setSubsectorZoom/);
  assert.match(css, /\.subsector-base-icon-shape/);
});


test('v0.11.0.2 highlights navigation and port states that require attention', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');
  const model = await read('ui-model.js');

  assert.match(html, /v0\.278\.0/);
  assert.match(app, /renderRecordWithHighlights/);
  assert.match(app, /jumpAttention\.push\('FUEL NEED '/);
  assert.match(model, /panelRow\('BERTHING'/);
  assert.match(app, /attention-message/);
  assert.match(css, /\.record-attention/);
  assert.match(css, /\.attention-message/);
  assert.match(css, /background:\s*var\(--attention\)/);
});


test('v0.11.1 exposes Book 2 passengers, freight, speculative trade, and life-support departure costs', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const model = await read('ui-model.js');
  const market = await read('commerce-market.js');

  assert.match(html, /v0\.278\.0/);
  assert.match(html, /id="commerce-section"/);
  assert.match(html, /data-help-topic="commerce"/);
  assert.match(app, /generatePassengerDemand/);
  assert.match(app, /generateFreightOffers/);
  assert.match(app, /generateSpeculativeTradeOffer/);
  assert.match(app, /bookPassenger/);
  assert.match(app, /loadCargo/);
  assert.match(app, /purchaseSpeculativeCargo/);
  assert.match(app, /sellSpeculativeCargo/);
  assert.match(app, /chargeLifeSupportForTrip/);
  assert.match(app, /deliverFreightAtDestination/);
  assert.match(app, /disembarkPassengersAtDestination/);
  assert.match(app, /logActivity\('TRADE'/);
  assert.match(model, /LIFE SUPPORT/);
  assert.match(market, /campaignWeekKey/);
  assert.match(market, /weeklyTradeSeed/);
});


test('v0.11.2 exposes persistent contracts and the port Contract Board', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const model = await read('ui-model.js');

  assert.match(html, /v0\.278\.0/);
  assert.match(html, /id="contract-section"/);
  assert.match(html, /CONTRACT BOARD/);
  assert.match(app, /createContractDocument/);
  assert.match(app, /generateContractBoard/);
  assert.match(app, /resolveContractsAtDestination/);
  assert.match(app, /creditShipAccount/);
  assert.match(model, /buildContractBoardPanel/);
});


test('v0.11.2.1 keeps port, trade, and jobs beside the map and guards repaired state flows', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  assert.match(html, /v0\.278\.0/);
  // v0.120.0: TRADE and JOBS are dock flyouts now; the world record is what
  // remains beside the map.
  assert.match(html, /id="operations-tab-port"/);
  assert.doesNotMatch(html, /id="operations-tab-trade"/);
  assert.doesNotMatch(html, /id="operations-tab-jobs"/);
  assert.ok(html.indexOf('id="commerce-section"') > html.indexOf('id="subsector-map"'));
  assert.match(css, /\.context-scroll/);
  assert.match(css, /overflow-y:\s*auto/);
  assert.match(app, /recordSpeculativeLotPurchase/);
  assert.match(app, /speculativeLotPurchasedQuantity/);
  assert.match(app, /transported to another world before resale/);
  assert.match(app, /reconcileExpiredContracts/);
  assert.match(app, /persistCampaignState/);
});

test('v0.12.0 exposes persistent situations, patrons, and non-combat skill checks in the Operations Desk', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const model = await read('ui-model.js');
  const loader = await read('document-loader.js');

  assert.match(html, /v0\.278\.0/);
  assert.match(html, /id="context-takeover"/);
  assert.match(html, /id="situation-section"/);
  assert.match(app, /generatePatronContact/);
  assert.match(app, /ensureArrivalSituation/);
  assert.match(app, /resolveRefereeSkillCheck/);
  assert.match(app, /logActivity\('SITUATION'/);
  assert.match(model, /buildSituationRecord/);
  assert.match(loader, /SITUATION/);
});


test('v0.12.0.1 promotes campaign status and interactive rolls into a compact play header', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  assert.match(html, /v0\.278\.0/);
  assert.match(html, /class="campaign-header-strip"/);
  assert.match(html, /id="roll-dialog"/);
  assert.match(html, /id="roll-modifier"[^>]*value="0"/);
  assert.match(html, /id="selected-system-summary"/);
  assert.match(app, /openCharacteristicRollDialog/);
  assert.match(app, /openSkillRollDialog/);
  assert.match(app, /openSituationSkillRollDialog/);
  assert.match(app, /logActivity\('CHECK'/);
  assert.match(app, /activeWorkspaceView/);
  assert.match(css, /\.campaign-play #procedure-section/);
  assert.match(css, /\.operations-tabs[\s\S]*grid-template-columns:\s*repeat\((?:4|5|6|7)/);
});


test('v0.12.0.2 keeps tab actions above independently scrolling records', async () => {
  const html = await read('index.html');
  const css = await read('styles.css');

  assert.match(html, /v0\.278\.0/);
  for (const [actions, record] of [
    ['port-actions', 'port-services-record'],
    ['commerce-actions', 'commerce-record'],
    ['contract-actions', 'contract-record'],
    ['situation-actions', 'situation-record']
  ]) {
    assert.ok(html.indexOf(`id="${actions}"`) < html.indexOf(`id="${record}"`), `${actions} should precede ${record}`);
  }
  assert.match(html, /class="actions operations-primary-actions situation-actions"/);
  assert.match(css, /\.operations-primary-actions[\s\S]*flex:\s*0 0 auto/);
  assert.match(css, /\.operations-panel-record[\s\S]*overflow-y:\s*auto/);
  assert.match(css, /\.operations-panel-scroll[\s\S]*overflow:\s*hidden/);
});


test('v0.12.0.3 makes Activity Log dice and outcomes visually explicit', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  assert.match(html, /v0\.278\.0/);
  assert.match(app, /ROLL 2D \[\$\{dice\.dice\[0\]\}\] \[\$\{dice\.dice\[1\]\}\]/);
  assert.match(app, /appendActivityDiceLine/);
  assert.match(app, /RESULT \/\/ SUCCESS/);
  assert.match(app, /RESULT \/\/ FAILURE/);
  assert.match(css, /\.activity-die[\s\S]*border:\s*1px solid var\(--rule\)/);
  assert.match(css, /\.activity-outcome\.success[\s\S]*background:\s*var\(--action-ready\)/);
  assert.match(css, /\.activity-outcome\.failure[\s\S]*background:\s*var\(--failure-bg\)/);
});


test('v0.12.0.4 keeps chargen history hidden until explicitly opened in campaign play', async () => {
  const html = await read('index.html');
  const css = await read('styles.css');
  const app = await read('app.js');

  assert.match(html, /v0\.278\.0/);
  assert.match(html, /id="chargen-record-section"[^>]*hidden/);
  assert.match(css, /\[hidden\]\s*\{[\s\S]*display:\s*none\s*!important/);
  assert.match(app, /el\.chargenRecordSection\.hidden = true;/);
  assert.match(app, /el\.sheetHistoryRecord\.textContent = /);
});

test('v0.12.1.1 keeps generic adventure machinery separate from Sea of Suns authored content', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const model = await read('ui-model.js');
  const loader = await read('document-loader.js');
  const consequences = await read('../world/thread-consequences.js');
  const engine = await read('../src/adventure-engine.js');
  const definition = await read('../campaigns/sea-of-suns/adventures/carranza-route.js');

  assert.match(html, /v0\.278\.0/);
  assert.match(html, /id="open-threads-view"/);
  assert.match(html, /id="thread-section"/);
  assert.match(app, /applySituationThreadConsequences/);
  assert.match(app, /reconcileAdventureConsequences/);
  assert.match(app, /THREAD \/\//);
  assert.match(model, /buildAdventureThreadRecord/);
  assert.match(loader, /CONTACT/);
  assert.match(loader, /THREAD/);
  assert.match(consequences, /applyAdventureConsequences/);
  for (const source of [engine, consequences]) {
    assert.doesNotMatch(source, /Carranza Route/);
    assert.doesNotMatch(source, /Mara Venn/);
    assert.doesNotMatch(source, /AURELIA\?/);
  }
  assert.match(definition, /Carranza Route/);
  assert.match(definition, /Mara Venn/);
  assert.match(definition, /Archival Query/);
  assert.match(definition, /AURELIA\?/);
});


test('v0.12.1.3 keeps live ship state beside navigation and makes the job board explicitly local', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');
  const model = await read('ui-model.js');

  assert.match(html, /v0\.278\.0/);
  assert.match(html, /id="live-ship-panel"/);
  assert.match(html, /id="live-ship-status"/);
  assert.match(app, /renderLiveShipStatus/);
  assert.match(app, /JUMP NEED/);
  assert.match(app, /ACTIVE JOBS/);
  assert.match(app, /setOperationsDeskTab\(tab\)/);
  assert.match(app, /logActivity\('JOB'/);
  assert.match(css, /\.live-state-ready/);
  assert.match(css, /\.live-state-attention/);
  assert.match(css, /\.live-state-critical/);
  assert.match(model, /NAVIGATION SELECTION ONLY/);
  assert.match(model, /ALL NEW OFFERS ORIGINATE AT THE CURRENT PORT/);
  assert.match(model, /label: `ACTIVE \$\{active\.length\}`/);
  assert.match(model, /label: `OFFERS \$\{offers\.length\} AT \$\{system\.name\.toUpperCase\(\)\}/);
});

test('v0.13 exposes compact persistent personal combat', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const model = await read('ui-model.js');
  const encounter = await read('../src/encounter-document.js');

  assert.match(html, /v0\.278\.0/);
  assert.match(html, /id="encounter-section"/);
  // v0.47.0: orders are given per combatant, in that combatant's tracker row.
  assert.match(app, /verbs\.className = 'encounter-tracker-verbs';/);
  assert.match(html, /id="encounter-record"/);
  assert.match(app, /BEGIN ENCOUNTER/);
  assert.match(app, /resolveActiveEncounterAction/);
  assert.match(app, /logActivity\('COMBAT'/);
  assert.match(model, /buildEncounterRecord/);
  assert.match(encounter, /resolveEncounterRound/);
  assert.match(encounter, /resolvePersonalMorale/);
  assert.match(encounter, /endPersonalCombatRecovery/);
});

test('v0.13.1 adds referee-started combat, a square token map, and enemy equipment cards', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');
  const encounter = await read('../src/encounter-document.js');

  assert.match(html, /v0\.278\.0/);
  assert.match(html, /id="combat-setup-dialog"/);
  assert.match(html, /id="encounter-map"/);
  assert.match(html, /id="encounter-roster"/);
  assert.match(html, /id="combat-enemy-weapon"/);
  assert.match(html, /id="combat-enemy-armor"/);
  assert.match(app, /START COMBAT/);
  assert.match(app, /startManualEncounter/);
  assert.match(app, /function effectiveTargetIds\(encounter, actorId\)/);
  // v0.45.0: selection is shown by a ring, not by restyling the token.
  assert.match(css, /\.encounter-token-target-ring/);
  assert.match(encounter, /grid: 'square'/);
  assert.match(encounter, /opponents = null/);
});

test('v0.14.0 expands combat into a movable multi-party range-guided workspace', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');
  const encounter = await read('../src/encounter-document.js');

  assert.match(html, /One-kilometer personal encounter map/);
  assert.match(html, /id="encounter-map-viewport"/);
  // v0.35.0 derives the band per pair, so the manual apply-range control is gone.
  assert.doesNotMatch(html, /id="encounter-apply-range"/);
  assert.match(html, /id="encounter-party-roster"/);
  // v0.41.0 replaced the split party/enemy rosters with one combat tracker.
  assert.match(html, /id="encounter-tracker"/);
  assert.match(html, /id="combat-add-enemy-type"/);
  assert.match(app, /repositionEncounterCombatant/);
  assert.match(app, /selectedEncounterActorId/);
  assert.match(app, /currentPartyCharacters/);
  assert.match(css, /encounter-workspace-active/);
  assert.match(encounter, /ENCOUNTER_MAP_COLUMNS = 1001/);
  assert.match(encounter, /setEncounterRangeFromPositions/);
  assert.match(encounter, /roundState: \{ declaredActions: \[\], resolution: null \}/);
});

test('v0.14.1 gives the encounter map a fluid viewBox camera and live token drag preview', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  assert.match(html, /v0\.278\.0/);
  assert.match(html, /data-help-topic="personal-combat"/);
  assert.match(app, /function encounterMapPoint/);
  assert.match(await read('scene-canvas.js'), /getScreenCTM/);
  assert.match(await read('scene-canvas.js'), /function scheduleView\(\)/);
  assert.match(await read('scene-canvas.js'), /requestAnimationFrame/);
  assert.match(await read('scene-canvas.js'), /group\.setAttribute\('transform', `translate/);
  assert.match(await read('scene-canvas.js'), /addEventListener\('wheel'/);
  assert.doesNotMatch(app, /encounterMapViewport\.scrollLeft/);
  assert.match(css, /\.encounter-map-viewport \{[^}]*overflow: hidden/s);
  assert.match(css, /\.encounter-map \{[^}]*width: 100%[^}]*height: 100%/s);
});

test('v0.15.1 adds a persistent actor roster and token inspection actions', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  assert.match(html, /v0\.278\.0/);
  // v0.120.0: the roster tab is gone — the section it pointed at already
  // lives in the ACTORS panel, so it was the same roster reached two ways.
  assert.doesNotMatch(html, /id="operations-tab-roster"/);
  assert.ok(html.indexOf('data-sidebar-panel="actors"') < html.indexOf('id="roster-section"'));
  assert.match(html, /id="npc-actor-dialog"/);
  assert.match(html, /id="combat-roster-actor"/);
  assert.match(html, /id="encounter-token-tooltip"/);
  assert.match(html, /id="encounter-token-menu"/);
  assert.match(app, /createNpcActorDocument/);
  assert.match(app, /addRosterActorToCombatSetup/);
  assert.match(app, /showEncounterTokenMenu/);
  assert.match(css, /\.roster-card/);
  assert.match(css, /\.encounter-token-menu/);
});

test('v0.15.1.1 makes the activity journal portable and anchors token menus to the map viewport', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  assert.match(html, /v0\.278\.0/);
  assert.match(html, /id="activity-filter"/);
  assert.match(html, /id="add-activity-note"/);
  assert.match(html, /id="activity-note-dialog"/);
  assert.match(app, /createActivityLogDocument/);
  assert.match(app, /appendActivityLogEntry/);
  assert.match(app, /formatHistoryEvent/);
  assert.match(app, /overlayRect = node\.getBoundingClientRect\(\)/);
  assert.match(app, /focus\(\{ preventScroll: true \}\)/);
  assert.match(css, /\.encounter-map-viewport \{[^}]*position: relative/s);
  assert.doesNotMatch(app, /rect\.width - 210/);
  assert.doesNotMatch(app, /rect\.height - 100/);
});

test('v0.15.2 establishes a Traveller-first campaign hierarchy and removes duplicated play text', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');
  const model = await read('ui-model.js');

  assert.match(html, /id="app-title" class="title">TRAVELLER</);
  assert.match(html, /id="app-subtitle" class="subtitle">v0\.278\.0</);
  assert.match(html, /<strong id="header-campaign-name" class="masthead-campaign-name">NO CAMPAIGN<\/strong>/);
  for (const id of ['new-campaign', 'save-campaign', 'load-campaign', 'import-campaign', 'export-campaign']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /id="toggle-activity"/);
  assert.match(html, /<option value="play" selected>PLAY<\/option>/);
  assert.match(html, /id="encounter-details"[^>]*hidden/);
  assert.doesNotMatch(html, /PERSONNEL INTAKE TERMINAL|CAMPAIGN TERMINAL|UPGRADED FROM|RULES ARE RESOLVED BY/);
  assert.doesNotMatch(html, /DRAG TOKENS \/\/ DRAG EMPTY MAP/);
  assert.match(app, /headerCampaignName\.textContent = active/);
  assert.match(app, /if \(encounterWorkspaceActive && !viewedSceneIsBoard\(\)\)/);
  assert.match(app, /activityFilter = 'play'/);
  assert.match(app, /entry\.category !== 'SYSLOG'/);
  assert.match(app, /campaignOnly/);
  assert.match(css, /\.terminal\.activity-log-hidden/);
  assert.match(css, /\.encounter-details/);
  assert.match(model, /Shift\+F10/);
});

test('v0.15.2.1 keeps jump controls reachable from the focused encounter workspace', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  // v0.20.0: jump controls live in the route strip above the map.
  // v0.195.1: the ship strip, jump action included, lives in the right
  // column under the character (grid shell); it is reachable from any scene.
  assert.match(html, /id="jump-actions"/);
  assert.ok(html.indexOf('id="jump-actions"') > html.indexOf('id="sidebar-character"'));
  assert.match(app, /button\.textContent = `\[ JUMP TO \$\{selected\.name\.toUpperCase\(\)\} \]`/);
  assert.match(css, /\.scene-footer-actions/);
});

test('v0.16.0 adds live roster placement, body-aware conditions, typed tokens, and explicit range guidance', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  assert.match(html, /id="encounter-placement-dialog"/);
  assert.match(html, /id="encounter-condition-dialog"/);
  assert.match(html, /id="combat-map-scale"/);
  assert.match(html, /DOES NOT REPLACE BOOK 1 WOUND STATUS/);
  assert.match(app, /addEncounterCombatantFromActor/);
  assert.match(app, /setEncounterCombatantCondition/);
  assert.match(app, /removeEncounterCombatant/);
  assert.match(app, /PLACE ROSTER ACTOR HERE/);
  // v0.35.0: the map no longer "suggests" a band the referee applies; the
  // band between the pair IS the band the throw uses.
  assert.match(app, /const guideText = guide \? ` \/\/ RANGE/);
  assert.match(app, /kind: combatant\.actorType,/);
  assert.match(css, /\.encounter-token-enemy-label/);
  assert.match(css, /\.encounter-token-condition-marker/);
  assert.match(css, /\.roster-card-conditions\.active/);
});

test('v0.20.0 lays play out as operations left, scene center, and procedure plus log right', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');
  const model = await read('ui-model.js');

  assert.match(html, /id="app-subtitle" class="subtitle">v0\.278\.0</);
  assert.match(html, /class="campaign-header-strip"/);
  // v0.192.0: the grid shell adds its id and class.
  assert.match(html, /class="terminal shell shell-v2"/);
  assert.match(html, /class="shell-rail"/);
  assert.ok(html.indexOf('id="procedure-section"') < html.indexOf('id="activity-panel"'));
  assert.ok(html.indexOf('class="scene shell-stage"') < html.indexOf('id="sidebar"'));
  assert.ok(html.indexOf('id="center-stack"') < html.indexOf('id="chargen-tables-section"'));
  assert.ok(html.indexOf('id="selected-system-summary"') < html.indexOf('class="canvas"'));
  assert.match(html, /id="play-procedure"/);
  assert.match(html, /id="context-tabs"[^>]*role="tablist"/);
  // v0.120.0: only WORLD remains. TRADE and JOBS are dock flyouts, and NPCS
  // pointed at a roster that already lives in the ACTORS panel.
  assert.match(html, new RegExp('id="operations-tab-port"'));
  for (const tab of ['trade', 'jobs', 'roster']) assert.doesNotMatch(html, new RegExp(`id="operations-tab-${tab}"`));
  assert.doesNotMatch(html, /operations-tab-navigation|operations-tab-situation|operations-tab-encounter|workspace-tab-/);
  assert.match(html, /id="footer-current-name"/);
  assert.match(html, /id="chargen-tables"/);
  assert.match(html, /id="sidebar"/);
  assert.match(html, /id="autosave-status"/);
  assert.match(html, /id="activity-order"/);
  assert.match(html, /id="add-character-to-campaign"/);
  assert.match(html, /id="campaign-active-character"/);
  assert.doesNotMatch(html, /id="toggle-context-focus"/);
  assert.equal((html.match(/class="text-button sheet-close"/g) ?? []).length, 4);
  assert.match(model, /export function buildPlayProcedure\(/);
  assert.match(model, /export function chargenTablesForPhase\(/);
  assert.match(app, /function playProcedureSnapshot\(\)/);
  assert.match(app, /function renderPlayProcedure\(\)/);
  assert.match(app, /function renderChargenTables\(\)/);
  const chargenView = await read('chargen-view.js');
  assert.match(chargenView, /lastMusterRoll\?\.type === 'benefit'/);
  assert.match(chargenView, /lastMusterRoll\?\.type === 'cash'/);
  assert.match(app, /NOBLE TITLE.*nobleTitleLabel/);
  assert.match(model, /export function nobleTitleLabel\(socialStanding\)/);
  assert.match(app, /ACTIVITY_ORDER_STORAGE_KEY/);
  assert.match(app, /function updateAutosaveStatus\(\)/);
  assert.match(app, /STATEROOMS \$\{crewPeople \+ passengers\}\/\$\{staterooms\}/);
  assert.match(app, /function addCharacterDocumentToCampaign\(/);
  assert.match(app, /function addCompletedCharacterToSavedCampaign\(/);
  assert.match(app, /function activatePartyCharacter\(/);
  assert.match(app, /returnCampaignId/);
  assert.match(app, /section\.classList\.toggle\('sheet-overlay', view === key\)/);
  assert.match(app, /if \(event\.key === 'Escape'/);
  assert.doesNotMatch(app, /detailPanels|operationsTabNavigation|workspaceTab/);
  assert.match(css, /\.sheet-view\.sheet-overlay \{ display: block; position: absolute;/);
  assert.match(css, /\.procedure-card\.required/);
  assert.match(css, /\.context-takeover/);
  assert.match(css, /grid-template-columns: 390px minmax\(520px, 1fr\) 340px/);
  assert.match(css, /\.shell-rail/);
  assert.match(css, /\.scene \{ grid-column: 2;/);
  assert.match(html, /id="new-character-from-campaign"/);
  assert.match(app, /function startNewCharacter\(\)/);
  assert.match(app, /el\.newCharacterFromCampaign\.hidden = true;\n  if \(el\.refereeNewNpc\) el\.refereeNewNpc\.hidden = !active;/);
});

test('v0.20.1 compacts the shared character sheet without dropping its controls or records', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  assert.match(html, /id="sheet-benefits" class="sheet-benefit-grid"/);
  assert.match(html, /id="sheet-notes" rows="2"/);
  assert.match(html, /class="sheet-block sheet-service-block"/);
  assert.match(html, /class="sheet-block sheet-equipment-block"/);
  assert.match(app, /function renderSheetBenefitRows\(rows\)/);
  assert.match(app, /\['CREDITS', formatCr\(gameplayDocument\.finances\.credits\)\]/);
  assert.match(await read('chargen-view.js'), /\['MUSTER ROLLS', character\.musterOut/);
  assert.match(css, /v0\.20\.1: compact Book 1 personnel form/);
  assert.match(css, /\.sheet-benefit-grid \{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.sheet-notes-block textarea:focus \{/);
  assert.match(css, /\.sheet-psionics \{[\s\S]*display: flex/);
});

test('v0.31.0 separates local character focus and visibility from shared campaign state', async () => {
  const html = await read('index.html');
  const app = await read('app.js');

  assert.match(html, /<label for="campaign-active-character">VIEWED CHARACTER<\/label>/);
  assert.match(app, /function establishLocalPlayerSession\(campaign = campaignDocument\)/);
  assert.match(app, /visibleActivityLogEntries\(activityLogDocument, playerSession\)/);
  assert.match(app, /setPlayerViewedCharacter\(playerSession/);
  assert.match(app, /setStatus\(`VIEWING CHARACTER:/);
  assert.doesNotMatch(app, /campaignDocument = setActiveCampaignCharacter\(campaignDocument, characterId\)/);
});

test('v0.31.0 compacts the header to two rows and gives the character cell the rolls and quick slots', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  assert.doesNotMatch(html, /class="masthead-sub"/);
  assert.doesNotMatch(html, /id="campaign-identity"/);
  assert.doesNotMatch(html, /class="rollbar"/);
  assert.ok(html.indexOf('id="app-title"') < html.indexOf('id="header-campaign-name"'));
  assert.ok(html.indexOf('id="header-campaign-name"') < html.indexOf('id="autosave-status"'));
  assert.match(html, /id="system-status"[^>]*class="status masthead-status"/);

  const strip = html.slice(html.indexOf('class="identity-strip"'), html.indexOf('id="header-world"'));
  const charStrip = html.slice(html.indexOf('class="campaign-header-strip"'), html.indexOf('id="live-ship-panel"'));
  for (const id of ['header-character-name', 'header-upp', 'header-status', 'header-credits', 'header-characteristics', 'header-quick-skills', 'header-all-skills']) {
    assert.match(charStrip, new RegExp(`id="${id}"`));
  }
  assert.match(html, /id="quick-slot-dialog"/);

  assert.doesNotMatch(app, /QUICK_SKILL_PRIORITY/);
  assert.match(app, /resolveQuickSlots\(\{ store: quickSlotStore/);
  assert.match(app, /function shipHeaderMetaLines\(\)/);
  assert.match(app, /STATEROOMS \$\{crewPeople \+ passengers\}\/\$\{staterooms\}/);
  assert.match(app, /header-skill-transient/);
  assert.match(css, /\.identity-strip \{ grid-template-columns: minmax\(0, 900px\)/);
});

test('v0.31.0 replaces the WORLD, TRADE, and JOBS box records with structured panels', async () => {
  const app = await read('app.js');
  const model = await read('ui-model.js');
  const css = await read('styles.css');

  assert.match(model, /export function buildPortServicesPanel\(/);
  assert.match(model, /export function buildContractBoardPanel\(/);
  assert.match(model, /export function panelRow\(/);
  assert.match(model, /export function panelCard\(/);

  assert.match(app, /function renderPanelModel\(/);
  assert.match(app, /renderPanelModel\(el\.portServicesRecord/);
  assert.match(app, /renderCommerceBoardInto\(el\.commerceRecord\)/);
  assert.match(app, /renderContractBoardInto\(el\.contractRecord\)/);

  assert.doesNotMatch(app, /el\.portServicesRecord\.textContent = build/);
  assert.doesNotMatch(app, /el\.commerceRecord\.textContent = lines/);
  assert.doesNotMatch(app, /el\.contractRecord\.textContent = build/);
  assert.doesNotMatch(app, /function commerceLine\(/);

  assert.match(app, /if \(kind === 'abandon'\) return abandonContract\(contractId\);/);
  assert.match(app, /MANIFEST MUST BE EMPTY/);
  assert.match(app, /NEEDS \$\{offer\.cargoTons\}t/);

  assert.match(css, /\.panel-row \{ display: grid; grid-template-columns: minmax\(7ch, 11ch\)/);
  assert.match(css, /\.panel-card \{/);
  assert.doesNotMatch(css, /box-shadow/);
});

test('v0.31.0 keeps box() only for the chargen sheet, system, situation, encounter, and jump records', async () => {
  const model = await read('ui-model.js');
  const app = await read('app.js');

  for (const retained of ['buildSystemRecord', 'buildSituationRecord', 'buildEncounterRecord', 'buildJumpPlan']) {
    assert.match(model, new RegExp(`export function ${retained}\\(`));
  }
  assert.match(app, /renderRecordWithHighlights\(el\.jumpPlan/);
  assert.doesNotMatch(model, /export function buildPortServicesRecord\(/);
  assert.doesNotMatch(model, /export function buildContractBoardRecord\(/);
});

test('v0.31.0 leaves one scroller per column, a character-only header, and trade actions in their cards', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');
  const model = await read('ui-model.js');

  assert.match(css, /\.context-scroll \.operations-panel-record \{[^}]*overflow-y: visible/s);

  assert.doesNotMatch(html, /id="header-world"|id="header-date"|id="header-world-meta"/);
  assert.doesNotMatch(html, /id="header-ship-name"|id="header-ship-meta"/);
  assert.doesNotMatch(html, /id="header-task"/);
  assert.doesNotMatch(html, /campaign-header-location|campaign-header-ship/);
  assert.doesNotMatch(app, /el\.headerTask|el\.headerShipName|el\.headerWorld/);

  assert.match(app, /function activeThreadObjective\(\)/);
  assert.match(app, /thread: activeThreadObjective\(\)/);
  assert.match(model, /card\('thread', s\.thread\.title/);
  assert.match(app, /if \(action === 'threads'\) \{ setWorkspaceView\('threads'\); return; \}/);

  assert.match(app, /actionId: `freight:\$\{freight\.id\}`/);
  assert.match(app, /actionId: specBuy\.max >= 1 \? `spec:\$\{specBuy\.max\}` : null/);
  assert.match(app, /actionId: `sell:\$\{cargo\.id\}`/);
  assert.match(app, /secondaryActionId: declined \? null : `decline:\$\{cargo\.id\}`/);
  assert.match(app, /function declineSpeculativeQuote\(cargoId\)/);
  assert.match(app, /payDeclinedBrokerFee\(shipDocument, quote/);
  assert.match(app, /BOOK 2 p\.48/);
  assert.doesNotMatch(app, /commerceActions\.append\(makePortButton\(`ACCEPT \$\{freight\.tons\}t/);
  assert.doesNotMatch(app, /commerceActions\.append\(makePortButton\(`SELL \$\{cargo\.tons\}t/);
  assert.match(app, /commerceActions\.append\(makePortButton\(`BOOK HIGH/);
});

test('v0.31.0 gives the centre three scene tabs, a status strip, and viewport-height columns', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  for (const tab of ['character', 'system', 'combat']) {
    assert.match(html, new RegExp(`data-scene-tab="${tab}"`));
  }
  assert.doesNotMatch(html, /class="scenebar"/);
  assert.doesNotMatch(html, /class="scenebar-main"|class="scenebar-tools"/);

  // v0.101.0: the CURRENT PORT, SELECTED DESTINATION and SHIP cells are gone —
  // WORLD carries the port and ship content, and the map marks the
  // destination and draws the route. Only the controls that had no other home
  // remain.
  const strip = html.slice(html.indexOf('id="scene-status-strip"'), html.indexOf('class="canvas"'));
  assert.doesNotMatch(strip, /CURRENT PORT|SELECTED DESTINATION/);
  // v0.129.0: both controls left this band to reclaim two rows above the map.
  // The jump action sits under its own readout in the world column; DETAILS
  // opens the system record, which is map context.
  assert.doesNotMatch(strip, /id="jump-actions"/);
  assert.doesNotMatch(strip, /id="toggle-system-details"/);

  const map = html.slice(html.indexOf('id="subsector-section"'), html.indexOf('id="encounter-section"'));
  // v0.195.1: jump-actions moved out with the ship strip (grid shell).
  for (const id of ['map-zoom-out', 'map-zoom-in', 'map-zoom-fit', 'map-zoom-label', 'subsector-legend',
    'toggle-system-details']) {
    assert.match(map, new RegExp(`id="${id}"`));
  }

  assert.match(app, /let activeSceneTab = 'system';/);
  assert.match(app, /function setSceneTab\(tab\)/);
  // v0.36.0: COMBAT is selectable without a live encounter so a referee can
  // start one from the scene; a live encounter still pulls the scene to it.
  assert.match(app, /if \(encounterWorkspaceActive && !viewedSceneIsBoard\(\)\)/);
  // v0.193.0: the sheet is never a document window; it lives in the right column.
  assert.match(app, /resetDocumentWindow\(characterWindow\);/);
  assert.match(app, /function revealCharacterSheet\(\)/);
  // v0.144.0: the vector plot is a third stage board, so the subsector map
  // steps aside for it as well as for the combat board.
  assert.match(app, /el\.subsectorSection\.hidden = board \|\| vector;/);
  assert.match(app, /el\.encounterSection\.hidden = !board \|\| vector;/);
  assert.match(app, /setSceneTab\('character'\)/);
  assert.doesNotMatch(app, /WORKSPACE_VIEWS = \['play', 'character'/);
  assert.match(html, /id="open-ship-view"/);

  assert.match(css, /\.terminal \{ height: 100vh; overflow: hidden;/);
  assert.match(css, /\.context-scroll \{ flex: 1 1 auto; min-height: 0; overflow-y: auto;/);
  assert.match(css, /\.scene-tab\.is-active \{/);
  assert.doesNotMatch(css, /box-shadow/);
});

test('v0.31.0 puts the character on one row, docks WHAT NOW? level with the masthead, and bounds the log', async () => {
  const html = await read('index.html');
  const css = await read('styles.css');

  const strip = html.slice(html.indexOf('class="campaign-header-strip"'), html.indexOf('class="context-panel"'));
  assert.doesNotMatch(strip, /identity-rollrow|identity-headline|identity-cell/);
  assert.ok(html.indexOf('class="stage"') < html.indexOf('class="campaign-header-strip"'));


  assert.match(css, /--tab-selected: #c3d4c3;/);
  assert.match(css, /\.scene-tab\.is-active,[\s\S]*?background: var\(--tab-selected\)/);
  assert.match(css, /#footer-current-name \{[\s\S]*?background: var\(--tab-selected\)/);

  assert.match(css, /html, body \{ height: 100%; min-height: 0; overflow: hidden; \}/);
  assert.match(css, /\.command-rail \.activity-panel,[\s\S]*?height: auto;[\s\S]*?max-height: none;/);
  assert.match(css, /\.command-rail > \.activity-panel \.activity-feed \{ flex: 1 1 auto; min-height: 0; overflow-y: auto; \}/);
  assert.doesNotMatch(css, /box-shadow/);
});

test('v0.31.0 places the rail by id, drops center-stack, and pins SHIP STATUS above the tabs (superseded by the v0.75.0 shell)', async () => {
  const html = await read('index.html');
  const css = await read('styles.css');
  // v0.98.0: WHAT NOW? left the sidebar for its own column, so the sidebar
  // leads with its tabs and then the character strip.
  const sidebar = html.slice(html.indexOf('id="sidebar"'), html.indexOf('class="sidebar-body"'));
  assert.ok(!sidebar.includes('id="procedure-section"'));
  assert.ok(sidebar.indexOf('class="sidebar-tabs"') < sidebar.indexOf('class="campaign-header-strip"'));
  // SHIP STATUS lives in the VEHICLES tab.
  const vehicles = html.slice(html.indexOf('data-sidebar-panel="vehicles"'), html.indexOf('data-sidebar-panel="port"'));
  assert.ok(vehicles.includes('id="live-ship-panel"'));
  assert.match(css, /grid-template-areas: "mast mast mast" "rail stage side";/);
});

test('v0.31.0 stops the rail oversizing the grid and reworks the character strip', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  // The spanning rail must not contribute min-content height to the auto row.
  assert.doesNotMatch(css, /\.command-rail > \.procedure-section \{\s*flex: 1 1 auto;/); // superseded; deleted v0.32.0
  assert.match(css, /\.command-rail > \.activity-panel \{\s*flex: 1 1 auto; min-height: 0; max-height: none; height: auto;/);

  const strip = html.slice(html.indexOf('class="campaign-header-strip"'), html.indexOf('id="live-ship-panel"'));
  assert.doesNotMatch(strip, />ROLL</);
  assert.doesNotMatch(strip, />SKILLS</);
  assert.doesNotMatch(strip, /header-character-meta/);
  for (const id of ['header-upp', 'header-status', 'header-posture', 'header-credits']) {
    assert.match(strip, new RegExp(`id="${id}"`));
  }

  assert.match(app, /el\.headerUpp\.title = `Original UPP as generated/);
  assert.match(app, /function characterPostureLabel\(\)/);
  assert.match(app, /if \(me\.evading\) parts\.push\('EVADING'\)/);
  // v0.203.1: the characteristic is a box — key above, value below, current/original when wounded.
  assert.match(app, /className: 'header-roll-value', textContent: injured \? `\$\{value\}\/\$\{base\}` : String\(value\)/);
  assert.match(app, /function nearestContractDeadlineDays\(\)/);
  assert.match(app, /el\.mastheadDate\.textContent = active/);

  assert.match(css, /\.header-status\.wounded \{ background: var\(--attention\)/);
  assert.match(css, /\.header-status\.critical \{ background: var\(--failure-bg\)/);
  assert.match(css, /\.header-roll-button\.injured \{ background: var\(--attention\)/);
  assert.doesNotMatch(css, /box-shadow/);
});

test('v0.31.0 makes the height chain explicit and gives WHAT NOW? a definite share', async () => {
  const css = await read('styles.css');

  // The terminal owns the viewport height as a grid, not by inherited flex.
  assert.match(css, /\.terminal \{\s*box-sizing: border-box;\s*display: grid;\s*grid-template-rows: auto auto minmax\(0, 1fr\);/);
  assert.match(css, /\.terminal > \.masthead \{ grid-row: 1; \}/);
  assert.match(css, /\.terminal > \.character-utility \{ grid-row: 2; \}/);
  assert.match(css, /\.terminal > \.stage \{ grid-row: 3; min-height: 0; height: 100%; overflow: hidden; \}/);

  // WHAT NOW? is capped in vh, never as a percentage of a content-derived height.
  assert.doesNotMatch(css, /\.command-rail[^{]*\{[^}]*max-height: 44vh/); // superseded; deleted v0.32.0
  assert.match(css, /\.command-rail > \.activity-panel \{\s*flex: 1 1 0%;\s*min-height: 120px;/);
  assert.match(css, /#context-panel \.live-ship-panel \{ max-height: 34vh; \}/);

  // Nothing in the scene may impose an intrinsic floor on its column.
  assert.match(css, /\.stage > \.scene > \.canvas \{ flex: 1 1 auto; min-height: 0; max-height: 100%; overflow: hidden; \}/);
  assert.match(css, /\.stage > \* \{ min-height: 0; \}/);
  assert.doesNotMatch(css, /box-shadow/);
});

test('v0.31.0 moves character into the rail and makes the stage a single row (superseded by the v0.75.0 shell)', async () => {
  const html = await read('index.html');
  const css = await read('styles.css');
  const sidebar = html.slice(html.indexOf('id="sidebar"'), html.indexOf('class="sidebar-body"'));
  assert.doesNotMatch(sidebar, /campaign-header-kicker">CHARACTER/);
  assert.match(css, /\.terminal\.shell \{[^}]*grid-template-columns: 88px minmax\(0, 1fr\) 392px;/);
});

test('v0.31.0 pins the terminal to the viewport, splits the rail 40/60, and labels the date', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  // The viewport box is asserted, not derived from 100vh plus arithmetic.
  assert.match(css, /\.terminal \{\s*position: fixed;\s*inset: 0;/);
  assert.match(css, /html, body \{ height: 100%; overflow: hidden; margin: 0; \}/);

  // WHAT NOW? 40 / log 60, each with its own scroller.
  assert.match(css, /\.command-rail \{\s*display: grid;\s*grid-template-rows: minmax\(0, 2fr\) minmax\(0, 3fr\);/);
  assert.match(css, /\.command-rail > #procedure-section \{\s*grid-row: 1;\s*min-height: 0;\s*max-height: none;\s*overflow-y: auto;/);
  assert.match(css, /\.command-rail > \.activity-panel \{\s*grid-row: 2;/);

  // The rail's fixed heads and its one scrolling body.
  assert.match(css, /#context-panel \.context-scroll \{ flex: 1 1 auto; min-height: 0; max-height: none; overflow-y: auto; \}/);
  assert.match(css, /#context-panel \.live-ship-panel \{ max-height: 30vh; overflow-y: auto; \}/);

  // The date is in the masthead, labelled, and no longer in the port cell.
  assert.match(html, /class="masthead-label">DATE<\/span>/);
  assert.match(html, /id="masthead-date"/);
  assert.match(app, /el\.mastheadDate\.textContent = active/);
  assert.doesNotMatch(app, /footerCurrentMeta\.textContent = `\$\{activityDateLabel\(\)\}/);
  assert.doesNotMatch(css, /box-shadow/);
});

test('v0.32.0 zeroes the centre sections\' top margin and makes WHAT NOW? scroll by id', async () => {
  const css = await read('styles.css');

  // The fix: every section in the scene canvas starts at the canvas top.
  assert.match(css, /\.stage > \.scene > \.canvas > section \{ margin-top: 0; \}/);

  // The stacked-page rule that put 12px above height: 100% boxes is gone.
  assert.doesNotMatch(css, /\.campaign-play #subsector-section,\s*\.campaign-play #personnel-section/);

  // The height chain from v0.29.0–v0.31.0 is unchanged.
  assert.match(css, /\.stage > \.scene > \.canvas \{ flex: 1 1 auto; min-height: 0; max-height: 100%; overflow: hidden; \}/);
  assert.match(css, /\.stage > \.scene #subsector-section \{ height: 100%; max-height: 100%; min-height: 0; \}/);
  assert.match(css, /#subsector-legend \{ padding: 4px 12px; border-top: 1px dotted var\(--disabled\); font-size: 11px; color: var\(--muted\); flex: 0 0 auto; \}/);
  // WHAT NOW? is addressed by its id; nothing targets a class the element lacks.
  assert.match(css, /\.command-rail > #procedure-section \{\s*grid-row: 1;\s*min-height: 0;\s*max-height: none;\s*overflow-y: auto;/);
  assert.doesNotMatch(css, /\.command-rail > \.procedure-section/);
  assert.doesNotMatch(css, /box-shadow/);
});

test('v0.33.0 restores the chargen columns and puts the LOG header on one row', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  // Chargen: the context rail yields column 1 by id, the sheet stays in column 2.
  assert.match(css, /\.chargen-mode #context-panel \{ display: none; \}/);
  assert.match(css, /\.chargen-mode \.stage > \.scene \{ grid-column: 2; \}/);
  assert.doesNotMatch(css, /grid-column: 2 \/ 4/);

  // LOG header: title, SHOW, ORDER, actions in one flex row; no campaign line.
  assert.match(html, /<div class="activity-header">\s*<h2 id="activity-heading" class="activity-title">CHAT<\/h2>\s*<select id="activity-filter" class="activity-filter" aria-label="Show">/);
  assert.match(html, /<select id="activity-order" class="activity-order" aria-label="Order"><option value="oldest" selected>NEWEST AT BOTTOM<\/option>/);
  assert.doesNotMatch(html, /id="activity-context"/);
  assert.doesNotMatch(html, /activity-controls|activity-filter-label|activity-order-label/);
  assert.doesNotMatch(app, /activityContext/);
  assert.match(css, /\.activity-header \{ display: flex; align-items: center; gap: 6px;/);
  assert.doesNotMatch(css, /\.activity-context|\.activity-controls|\.activity-filter-label/);
  assert.doesNotMatch(css, /box-shadow/);
});

test('v0.34.0 keeps the rail border on the rail, not on each tab body', async () => {
  const css = await read('styles.css');
  assert.match(css, /#context-panel \{ border-right: 1px solid var\(--rule\); \}/);
  assert.doesNotMatch(css, /^\.context-panel \{ border-right/m);
  assert.match(css, /\.context-scroll > \.context-panel \{ border-right: 0; \}/);
  assert.doesNotMatch(css, /box-shadow/);
});

test('v0.35.0 declares the browser stores before the block that assigns them', async () => {
  const app = await read('app.js');

  // quickSlotStore was declared ~245 lines after its assignment, so the let
  // binding was still in the temporal dead zone: the assignment threw, the
  // try/catch swallowed it, and quick slots silently stopped persisting.
  assert.match(app, /let registry = null;\s*let playerSessionStore = null;\s*let quickSlotStore = null;/);
  assert.ok(
    app.indexOf('let quickSlotStore = null;') < app.indexOf('quickSlotStore = createQuickSlotStore('),
    'quickSlotStore must be declared before it is assigned'
  );
  assert.equal(app.match(/let quickSlotStore = null;/g).length, 1);
});

test('v0.36.0 puts the encounter map in the centre scene and the DM panel and rosters in the rail', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  // The centre scene is the map alone, sized like the subsector scene.
  assert.match(html, /<section id="encounter-section" hidden aria-labelledby="encounter-heading">\s*<div class="encounter-map-toolbar">/);
  assert.match(css, /#encounter-section \{ height: 100%; min-height: 0; display: flex; flex-direction: column; \}/);
  assert.match(css, /#encounter-section \.encounter-map-viewport \{ flex: 1 1 auto; min-height: 0;/);
  assert.doesNotMatch(html, /id="encounter-tactical"/);
  assert.doesNotMatch(html, /class="encounter-side-panel"/);

  // The rail carries the throw, the actions and both rosters.
  assert.match(html, /<section id="combat-rail-section" class="context-panel combat-rail"/);
  for (const id of ['encounter-tracker', 'encounter-resolve', 'encounter-record']) {
    assert.ok(
      html.indexOf(`id="${id}"`) > html.indexOf('id="combat-rail-section"'),
      `${id} must live inside the combat rail section`
    );
  }

  // The throw is priced in the ATTACK cascade instead.
  assert.match(app, /previewPersonalAttack\(\{ attacker: combatant, defender: foe, range: band, situationalDM: encounterSituationDMs\(encounter, combatant, foe\)\.total \}\)/);

  // Declaration tally, not a "target already down" warning.
  assert.match(app, /const declaredOn = declaredTargetCounts\(encounter\);/);
  assert.match(app, /encounter-token-declared-marker/);
  assert.doesNotMatch(app, /ALREADY DOWN/);

  // The rail follows the COMBAT scene tab, and COMBAT is selectable with no
  // live encounter so a referee can start one.
  assert.match(app, /const combatRailVisible = Boolean\(campaignPlayActive\(\) && el\.encounterRailSection\?\.dataset\.available === 'true'\);/);
  assert.doesNotMatch(app, /if \(tab === 'combat' && !activeEncounterAtCurrentSystem\(\)\) return;/);
  assert.doesNotMatch(css, /box-shadow/);
});

test('v0.37.0 collapses the character strip and SHIP STATUS while combat holds the rail', async () => {
  const app = await read('app.js');
  const css = await read('styles.css');

  // One class, set only when the combat rail is actually showing.
  assert.match(app, /const combatRailVisible = Boolean\(campaignPlayActive\(\) && el\.encounterRailSection/);
  assert.match(app, /el\.terminal\?\.classList\.toggle\('combat-focus', combatRailVisible\);/);

  // Characteristics, quick skills and the ship body collapse; the identity
  // line and the SHIP STATUS heading stay.
  // v0.38.0: only SHIP STATUS collapses; the character strip stays whole.
  assert.match(css, /\.combat-focus #context-panel \.live-ship-status \{ display: none; \}/);
  assert.doesNotMatch(css, /\.combat-focus #context-panel \.header-characteristics/);
  assert.doesNotMatch(css, /\.combat-focus #context-panel \.character-skill-line/);
  assert.doesNotMatch(css, /\.combat-focus #context-panel \.campaign-header-strip \{ display: none/);
  assert.doesNotMatch(css, /\.combat-focus #context-panel \.live-ship-heading \{ display: none/);
  assert.doesNotMatch(css, /box-shadow/);
});

test('v0.37.1 gives combat the whole rail: first in the scroller, everything else suspended (superseded by the v0.75.0 shell)', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  // COMBAT is a sidebar tab of its own; the port panels are the PORT tab.
  const combat = html.slice(html.indexOf('data-sidebar-panel="combat"'), html.indexOf('data-sidebar-panel="scenes"'));
  assert.ok(combat.includes('id="combat-rail-section"'));
  // v0.192.0: the port panels are a strip of the stage under the map, not a
  // sidebar tab; they stay together in #sidebar-port-panel.
  const port = html.slice(html.indexOf('id="sidebar-port-panel"'), html.indexOf('id="system-record-section"'));
  for (const id of ['port-services-section', 'commerce-section', 'contract-section', 'situation-section']) assert.ok(port.includes(`id="${id}"`), `${id} in the port strip`);
  assert.doesNotMatch(app, /if \(combatRailVisible\) for \(const panel of Object\.values\(panels\)\) if \(panel\) panel\.hidden = true;/);
  assert.match(app, /if \(encounterWorkspaceActive && sidebarTab !== 'combat' && !sidebarChosen\) setSidebarTab\('combat', \{ chosen: false \}\);/);
});

test('v0.38.0 keeps the character whole in combat and reports the fight, not the sheet', async () => {
  const app = await read('app.js');
  const css = await read('styles.css');

  // The character strip stays whole; only SHIP STATUS collapses.
  assert.match(css, /\.combat-focus #context-panel \.live-ship-status \{ display: none; \}/);
  assert.doesNotMatch(css, /\.combat-focus #context-panel \.header-characteristics/);

  // Status, chips and ad hoc rolls read the encounter combatant while one exists.
  assert.match(app, /function encounterSelfCombatant\(\)/);
  assert.match(app, /function characterCurrentValue\(key\)/);
  assert.match(app, /const me = document === gameplayDocument \? encounterSelfCombatant\(\) : null;/);
  assert.match(app, /const value = characterCurrentValue\(key\);/);
  assert.match(app, /const value = Number\(characterCurrentValue\(characteristic\) \?\? 0\);/);

  // Combat results are written back to the character and roster documents.
  assert.match(app, /import \{ synchronizeEncounterDocuments \} from '\.\.\/src\/combatant-document-sync\.js(\?v=[^']*)?';/);
  assert.match(app, /function applyEncounterDocumentSync\(encounter\)/);
  assert.match(app, /applyEncounterDocumentSync\(result\.encounter\);/);
  assert.doesNotMatch(css, /box-shadow/);
});

test('v0.39.0 lets the referee declare for any side in the UI', async () => {
  const app = await read('app.js');

  // Actor and target selection are side-relative, not party-versus-opposition.
  assert.match(app, /const actorSide = encounter\?\.combatants\.find\(\(entry\) => entry\.id === selectedEncounterActorId\)\?\.side \?\? 'party';/);
  assert.doesNotMatch(app, /entry\.id === actorId && entry\.side === 'party'/);
  assert.doesNotMatch(app, /entry\.id === targetId && entry\.side === 'opposition'/);

  // The token menu and the roster both offer the actor slot for other sides.
  // v0.41.0: the token menu declares directly for whichever token it opened on.
  assert.match(app, /const declare = \(action, targetId = null\) => \{/);
  // v0.41.0: any tracker row selects its combatant, so shift-click is gone.
  // v0.46.0: opening a tracker row selects that combatant.
  assert.match(app, /summary\.addEventListener\('click', \(\) => \{[\s\S]*?setEncounterActor\(encounter\.identity\.id, combatant\.id\);/);
  assert.match(app, /function declarationText\(encounter, combatant\)/);

  // The roster covers every non-party side, not just 'opposition'.
  assert.match(app, /\.\.\.encounter\.combatants\.filter\(\(entry\) => entry\.side !== 'party'\)/);
});

test('v0.40.0 runs a campaign clock, ticks situation DMs, and tracks the round', async () => {
  const app = await read('app.js');
  const css = await read('styles.css');

  // A resolved round is 15 seconds of campaign time; a pending declaration is not.
  // v0.41.0: the clock advances when the round is committed, not on declaration.
  assert.match(app, /if \(campaignDocument\) campaignDocument = advanceCampaignSeconds\(campaignDocument, COMBAT_ROUND_SECONDS\);/);
  assert.match(app, /\$\{activityDateLabel\(\)\} \$\{campaignClockLabel\(campaignDocument\)\}/);

  // Situation conditions are ticked, feed the preview and the throw, and do
  // not persist past the attack they describe.
  // v0.43.0: lighting sits on the scene toolbar, cover on the token menu.
  assert.match(app, /function renderEncounterLighting\(encounter\)/);
  // v0.47.0: the derived DMs are read where the throw is priced, in the cascade.
  assert.match(app, /encounterSituationDMs\(encounter, combatant, foe\)\.total/);
  assert.match(app, /resolveActiveEncounterAction\('attack', modifier, pendingRoll\.targetId, pendingRoll\.actorId\);/);
  assert.doesNotMatch(app, /encounterSituationConditions/);
  assert.match(css, /\.encounter-light-control \{ display: inline-flex;/);

  // Round tracker: round number, surprise, and who still owes a declaration.
  assert.match(app, /`ROUND \$\{encounter\.round\}\$\{surprised\}\$\{roundState\}/);
  assert.match(app, /AWAITING \$\{awaiting\.map/);
  assert.doesNotMatch(css, /box-shadow/);
});

test('v0.41.0 replaces the rosters with a combat tracker and declares from the token', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  // v0.47.0: the rail is the tracker and its controls; the selected panel,
  // target list, DM panel and global verb row are gone.
  const order = ['encounter-tracker', 'encounter-resolve'].map((id) => html.indexOf(`id="${id}"`));
  assert.ok(order.every((position) => position > 0));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  for (const id of ['encounter-selected', 'encounter-target-list', 'encounter-dm-panel', 'encounter-actions']) {
    assert.doesNotMatch(html, new RegExp(`id="${id}"`));
  }

  // Party first, other sides below; a marker carries the side.
  assert.match(app, /\.\.\.encounter\.combatants\.filter\(\(entry\) => entry\.side === 'party'\),\s*\.\.\.encounter\.combatants\.filter\(\(entry\) => entry\.side !== 'party'\)/);
  assert.match(app, /function sideDotClass\(encounter, combatant\)/);

  // Declaring and resolving are separate: no auto-resolve on the last declaration.
  assert.match(app, /declareEncounterAction\(active, \{/);
  assert.match(app, /function resolveDeclaredEncounterRound\(\)/);
  assert.match(app, /resolveDeclaredRound\(active, \{/);

  // Orders are drawn on the map, and the cascade declares for its own token.
  assert.match(app, /class: `encounter-order-line \$\{from\.side === 'party' \? 'party' : 'enemy'\}/);
  assert.match(app, /\{ label: 'ATTACK', items: attackItems, disabled: !canOrder \},/);
  assert.match(app, /if \(event\.target\.closest\?\.\('#encounter-token-menu'\)\) return;/);

  // The terminal aesthetic has no rounded shapes and no shadows.
  assert.doesNotMatch(css, /border-radius:\s*[1-9]/);
  assert.doesNotMatch(css, /box-shadow/);
});

test('v0.42.0 compacts the combat panel and gives each condition an owner', async () => {
  const app = await read('app.js');
  const css = await read('styles.css');

  // v0.47.0: the DM panel is gone entirely; the throw is priced per target in
  // the ATTACK cascade, and the verbs live in each combatant's own row.
  assert.doesNotMatch(app, /encounter-dm-summary/);
  assert.match(css, /\.combat-rail \.encounter-tracker-verbs/);

  // Lighting is the encounter's, cover is the defender's, the stock is the firer's.
  assert.match(app, /setEncounterLighting\(doc, el\.encounterLighting\.value\)/);
  assert.match(app, /setCombatantCover\(doc, \{ combatantId: combatant\.id, cover: value \}\)/);
  assert.match(app, /setCombatantFoldingStock\(doc, \{ combatantId: combatant\.id, foldingStock: !combatant\.foldingStock \}\)/);
  assert.doesNotMatch(app, /encounterSituationConditions/);
  assert.doesNotMatch(css, /box-shadow/);
});

test('v0.43.0 moves lighting to the scene, marks selection and targets, and drops the duplicate tooltip', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  // Lighting describes the scene, so it sits above the map it describes.
  assert.match(html, /<select id="encounter-lighting" aria-label="Scene lighting">/);
  assert.ok(html.indexOf('id="encounter-lighting"') < html.indexOf('id="encounter-map-viewport"'));

  // Compact outlines: yellow for the combatant taking orders, red for targets.
  assert.match(await read('scene-canvas.js'), /class: 'scene-token-selected'/);
  assert.doesNotMatch(app, /svgElement\('animate', \{ attributeName: 'r'/);
  // v0.191.0: colours are tokens; --highlight is the selection gold.
  assert.match(css, /\.encounter-token-selected-ring \{ fill: none; stroke: var\(--highlight\)/);
  assert.match(css, /--highlight: #d8b53a;/);
  // The ring is the only selection mark; the token itself no longer restyles.
  assert.doesNotMatch(css, /\.encounter-token-pc\.selected/);
  assert.doesNotMatch(css, /\.encounter-token-enemy\.selected/);
  assert.match(css, /\.encounter-token-target-ring \{ fill: none; stroke: var\(--failure-border\)/);

  // T targets the hovered token; Shift+T marks several.
  assert.match(app, /if \(event\.key !== 't' && event\.key !== 'T'\) return;/);
  assert.match(app, /const had = actorTargetIds\(actor\.id\)\.has\(candidate\.id\);/);

  // One hover text: the styled overlay, not a second native SVG title.
  assert.doesNotMatch(app, /const title = svgElement\('title'\);/);

  // The token menu carries COVER and no longer carries MOVE or SELECT.
  assert.match(app, /\{ label: 'COVER', items: \(\) => COMBATANT_COVER\.map/);
  assert.doesNotMatch(app, /addCascade\('MOVE'/);
  assert.doesNotMatch(app, /'ORDERS GIVEN' : 'SELECT'/);
  assert.doesNotMatch(css, /box-shadow/);
});

test('v0.44.0 totals surprise DMs per side and shows the throw', async () => {
  const html = await read('index.html');
  const app = await read('app.js');

  // The three conditions the document cannot derive are asked for at setup.
  for (const id of ['combat-party-vehicle', 'combat-party-battledress', 'combat-enemy-vehicle', 'combat-enemy-battledress', 'combat-enemy-pouncer']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(app, /surpriseConditions: \{\s*party: \{ inAVehicle: el\.combatPartyVehicle\.checked/);

  // The round tracker shows each side's roll, DM and total.
  assert.match(app, /`\$\{entry\.sideId\.toUpperCase\(\)\} \$\{entry\.roll\}\$\{entry\.dm >= 0 \? '\+' : ''\}\$\{entry\.dm\}=\$\{entry\.total\}`/);
});

test('v0.45.0 shows the Book 1 sheet lines, a referee status override, and start/end controls', async () => {
  const app = await read('app.js');
  const css = await read('styles.css');

  // The selected panel reads like the Book 1 character sheet.
  // v0.46.0: the sheet lines live in each tracker row's dropdown, and the
  // pistol / blade line appears only when that is the weapon in hand.
  assert.match(app, /function combatantSheetRows\(combatant\)/);
  assert.match(app, /\['PRIMARY', ranked\[0\]/);
  assert.match(app, /const kind = PISTOL_KEYS\.includes\(combatant\.weaponKey\) \? 'PISTOL' : BLADE_KEYS\.includes\(combatant\.weaponKey\) \? 'BLADE' : 'WEAPON';/);
  assert.match(app, /const PISTOL_KEYS = Object\.freeze/);

  // Status is a referee override; conditions remain annotations.
  assert.match(app, /\{ label: 'STATUS', items: \(\) => \['active', 'unconscious', 'dead', 'escaped', 'withdrawn'\]/);
  assert.match(app, /setCombatantStatus\(doc, \{ combatantId: combatant\.id, status: value \}\)/);

  // Ending the fight is explicit, and starting one is offered once it is over.
  assert.match(app, /function endActiveEncounter\(\{ thenDiscard = null \} = \{\}\)/);
  assert.match(app, /makePortButton\('END COMBAT'/);
  // v0.202.0: starting a fight is two verbs — the board, then who is in it.
  assert.match(app, /makePortButton\('COMBAT \\u00b7 RANGE BANDS', \(\) => openManualSetup\('range-line'\)\)/);
  assert.match(app, /makePortButton\('COMBAT \\u00b7 GRID', \(\) => \(scene \? openSceneSetup\(scene\) : openManualSetup\('scene'\)\)\)/);
  // Two places, both the tracker slot: no encounter yet, and one just ended.
  // The actions row no longer repeats it.
  // The two verbs are one helper, offered wherever no fight is set up or running.
  assert.ok(app.match(/startCombatButtons\(scene\)/g).length >= 3);
  assert.doesNotMatch(app, /el\.encounterActions\.append\(button\);/);

  // The tracker always states status; orders only replace it while active.
  // v0.203.0: the row reads → TARGET · verb, the verb as the weapon does.
  assert.match(app, /if \(combatant\.status !== 'active'\) return combatantRulesStatus\(combatant\)\.toLowerCase\(\);/);
  assert.match(app, /verb = melee \? 'swing' : 'fire';/);
  assert.doesNotMatch(css, /box-shadow/);
});

test('v0.46.0 folds the sheet into each tracker row and stops repeating it', async () => {
  const app = await read('app.js');
  const css = await read('styles.css');

  // Each combatant is a dropdown; there is no permanent panel above the list.
  assert.match(app, /const row = document\.createElement\('details'\);/);
  assert.match(app, /summary\.className = 'encounter-tracker-summary';/);
  // v0.47.0: the element itself is gone, not merely emptied.
  assert.doesNotMatch(app, /encounterSelected/);
  assert.doesNotMatch(app, /function renderEncounterSelected/);
  assert.match(css, /\.combat-rail \.encounter-tracker-summary \{/);

  // Open state survives a re-render.
  assert.match(app, /row\.open = expandedTrackerIds\.has\(combatant\.id\);/);
  assert.doesNotMatch(css, /box-shadow/);
});

test('v0.47.0 leaves the rail as the list, with orders inside each row', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  // Nothing above the tracker but its heading; nothing duplicating the map.
  for (const id of ['encounter-selected', 'encounter-target-list', 'encounter-dm-panel', 'encounter-actions']) {
    assert.doesNotMatch(html, new RegExp(`id="${id}"`));
  }
  assert.doesNotMatch(app, /renderEncounterTargetList|renderEncounterDmPanel|renderEncounterSelected/);

  // Each combatant's verbs live in that combatant's own row.
  assert.match(app, /verbs\.className = 'encounter-tracker-verbs';/);
  assert.match(app, /resolveActiveEncounterAction\('evade', 0, null, combatant\.id\)/);
  assert.match(css, /\.combat-rail \.encounter-tracker-verbs \.action-button,[\s\S]*?font-size: 10px; padding: 1px 5px;/);

  // Rows are tight enough for a twenty-body fight.
  assert.match(css, /\.combat-rail \.encounter-tracker-summary \{ padding: 2px 6px; \}/);
  assert.doesNotMatch(css, /box-shadow/);
});

test('v0.48.0 shows the blow allowance and a structured encounter history', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  // Blows remaining, only where a melee weapon is in hand.
  assert.match(app, /const melee = getPersonalWeapon\(combatant\.weaponKey\)\.melee;/);
  assert.match(app, /BLOWS \$\{blowsRemaining\(combatant\)\}\/\$\{combatant\.blowAllowance\}/);

  // The history is built from the encounter, not from an ASCII box() record.
  assert.match(html, /<div id="encounter-record" class="encounter-record"/);
  assert.doesNotMatch(html, /<pre id="encounter-record"/);
  assert.match(app, /function renderEncounterHistory\(encounter\)/);
  assert.doesNotMatch(app, /el\.encounterRecord\.textContent = buildEncounterRecord/);
  assert.doesNotMatch(css, /\.encounter-details \.encounter-record \{[^}]*max-height: 250px/);
  assert.doesNotMatch(css, /box-shadow/);
});

test('v0.49.0 offers NPC declarations as advice and as automation', async () => {
  const app = await read('app.js');
  const css = await read('styles.css');

  // Automation is a source of intents, not a second path through the resolver.
  assert.match(app, /function applyNpcDeclarations\(encounter\)/);
  assert.match(app, /next = declareEncounterAction\(next, \{/);
  assert.match(app, /const active = applyNpcDeclarations\(started\);/);

  // Every combatant that can still act gets the suggestion and a one-click accept.
  assert.match(app, /const suggestion = chooseNpcDeclaration\(encounter, combatant\);/);
  assert.match(app, /SUGGESTS \$\{suggestion\.action\.toUpperCase\(\)\}/);
  assert.match(app, /makePortButton\('ACCEPT'/);

  // Per-combatant auto toggle.
  assert.match(app, /setCombatantTactics\(doc, \{ combatantId: combatant\.id, tactics: auto\.checked \? 'auto' : 'manual' \}\)/);
  assert.match(css, /\.combat-rail \.encounter-tracker-advice \{ display: flex;/);
  assert.doesNotMatch(css, /box-shadow/);
});

test('v0.50.0 shows the actors and vehicles directories with owner assignment', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  assert.match(html, /<div id="directory-actors" class="campaign-directory"/);
  assert.match(html, /<div id="directory-vehicles" class="campaign-directory"/);
  assert.match(app, /function renderCampaignDirectory\(\)/);
  assert.match(app, /campaignDirectory\(campaignDocument, \{/);

  // Ownership is written with setDocumentOwner and keyed on ownerUid, the
  // field graycloak-adnd's Firestore rules already use.
  assert.match(app, /setDocumentOwner\(campaignDocument, \{ documentId: item\.id, ownerUid: owner\.value\.trim\(\) \}\)/);
  assert.match(css, /\.directory-row\.kind-character/);
  assert.doesNotMatch(css, /box-shadow/);
});

test('v0.51.0 adds sign-in without making the client depend on it', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const auth = await read('auth.js');
  const config = await read('firebase-config.js');

  // The same project as GCC and graycloak-adnd, so one login covers all three.
  assert.match(config, /projectId: 'graycloaks-campaign-corner'/);

  // Auth only: this version reads and writes no Firestore.
  assert.doesNotMatch(auth, /firebase-firestore-compat|firebase\.firestore\(/);
  assert.match(auth, /export async function signIn\(\)/);
  assert.match(auth, /export function currentUserId\(\)/);

  // Being unable to reach the SDK is a supported state, not an error path.
  assert.match(auth, /status = 'unavailable';/);
  assert.match(app, /if \(status === 'unavailable'\) \{[\s\S]*?LOCAL ONLY/);

  // Sign-in runs after the client is already usable.
  assert.match(app, /initAuth\(\)\.then\(async \(\) => \{\n  render\(\);/);
  assert.match(html, /id="account-button"/);

  // A signed-in referee can claim an actor for their own account.
  assert.match(app, /claim\.title = 'Assign this actor to the signed-in account';/);
});

test('v0.52.0 publishes a player-safe copy without making the client depend on it', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const publish = await read('publish.js');

  // The referee publishes the campaign and the scene; both are referee-only
  // writes under the v11 rules.
  assert.match(html, /id="publish-campaign"/);
  assert.match(html, /id="publish-view"/);
  assert.match(app, /await publishCampaign\(published\);/);
  assert.match(app, /await publishEncounterView\(view\);/);

  // The full encounter document must never be written: it carries enemy
  // characteristics, and Firestore rules cannot filter fields.
  assert.doesNotMatch(publish, /\.doc\(view\.encounterId\)\.set\(/);
  assert.match(publish, /collection\('view'\)\.doc\('current'\)/);

  // Firestore loads only when the referee first publishes, so a local game
  // never fetches it.
  assert.match(publish, /export function ensureFirestore\(\)/);
  assert.doesNotMatch(app, /import .*firebase-firestore-compat/);

  // Publishing failures are reported, not thrown.
  assert.match(app, /setStatus\(`PUBLISH FAILED \/ \$\{error\?\.message \?\? String\(error\)\}`, 'error'\);/);
});

test('v0.53.0 keeps the publish controls reachable and remembers being online', async () => {
  const html = await read('index.html');
  const app = await read('app.js');

  // Publishing is campaign-level, so it lives in the campaign menu — the rail
  // hides every panel during combat, which is exactly when a scene exists.
  const players = html.indexOf('data-sidebar-panel="players"');
  const settings = html.indexOf('data-sidebar-panel="settings"');
  for (const id of ['publish-status', 'publish-campaign', 'publish-view']) {
    const at = html.indexOf(`id="${id}"`);
    assert.ok(at > players && at < settings, `${id} must sit in the PLAYERS tab`);
  }

  // Published state is read from the document, not a module variable, so a
  // reload still knows the campaign is online.
  assert.match(app, /const online = campaignIsPublished\(campaignDocument\);/);
  assert.match(app, /campaignDocument = markCampaignPublished\(campaignDocument, publishedAt\);/);
  assert.doesNotMatch(app, /let publishedCampaignId/);

  // Marked only after the write is acknowledged.
  assert.ok(
    app.indexOf('await publishCampaign(published);') < app.indexOf('campaignDocument = markCampaignPublished(campaignDocument, publishedAt)'),
    'the campaign is marked published only after the write succeeds'
  );
});

test('v0.54.0 publishes the scene automatically when a round resolves', async () => {
  const app = await read('app.js');

  // Both resolution paths publish: the round resolver and the referee ending
  // the fight.
  // v0.179.0 adds a third: a round paused for a player's wound publishes so
  // their page can ask them (buildPublishedView shows only resolved rounds).
  assert.equal(app.match(/autoPublishEncounterView\(result\.encounter\);/g).length, 3);

  // A local or signed-out campaign publishes nothing at all.
  assert.match(app, /if \(!campaignIsPublished\(campaignDocument\) \|\| !currentUserId\(\) \|\| !encounter\) return;/);

  // Publishing never interrupts play: the round is already resolved locally,
  // so a failure reports and carries on rather than throwing.
  assert.match(app, /\.catch\(\(error\) => \{[\s\S]*?SCENE PUBLISH FAILED/);
  assert.doesNotMatch(app, /await autoPublishEncounterView/);

  // The manual control remains, and covers a resolved encounter too.
  assert.match(app, /const scene = activeEncounterAtCurrentSystem\(\) \?\? latestEncounterAtCurrentSystem\(\);/);
  assert.match(app, /'\[ SCENE PUBLISHED \]'/);
});

test('v0.55.0 seats players and lets them read their own account id', async () => {
  const html = await read('index.html');
  const app = await read('app.js');

  // Seating is what makes a campaign readable: the rules test membership of
  // the players subcollection.
  assert.match(html, /id="players-dialog"/);
  assert.match(app, /await seatPlayer\(campaignDocument\.identity\.id, uid, \{ name \}\);/);
  assert.match(app, /if \(el\.openPlayers\) el\.openPlayers\.hidden = !online \|\| !uid;/);

  // Assigning a character writes the ownership map, which the declaration rule
  // reads — so it must reach Firestore, not just localStorage.
  assert.match(app, /campaignDocument = setDocumentOwner\(campaignDocument, \{ documentId: characterId, ownerUid: uid \}\);/);
  assert.match(app, /await publishCampaign\(buildPublishedCampaign\(campaignDocument, \{ publishedAt: Date\.now\(\) \}\)\);/);

  // Removing a player reverts their characters to the referee.
  assert.match(app, /if \(owner !== uid\) continue;\n      campaignDocument = setDocumentOwner\(campaignDocument, \{ documentId, ownerUid: '' \}\);/);

  // A uid exists only after signing in, so the player copies their own.
  assert.match(app, /await navigator\.clipboard\.writeText\(user\.uid\);/);
  assert.match(app, /window\.prompt\('Account id/);
});

test('v0.56.0 publishes the current encounter pointer with the campaign', async () => {
  const app = await read('app.js');
  const view = await read('../src/published-view.js');

  // Players cannot list encounters, so the campaign names the current one.
  assert.match(app, /currentEncounterId: scene\?\.identity\.id \?\? null/);
  assert.match(view, /currentEncounterId: currentEncounterId \?\? null/);

  // Player narration is generated, never copied from the referee's audit line.
  assert.match(view, /function playerNarrationFor\(encounter, entry\)/);
  assert.match(view, /return `\$\{attacker\} attacks \$\{defender\} with \$\{weapon\} and misses\.`;/);
  assert.match(view, /return null;\s*\}\s*\/\/ v0\.179\.0/);
});

test('v0.57.0 gives players a read-only page that never asks for referee data', async () => {
  const html = await read('player.html');
  const player = await read('player.js');

  assert.match(html, /<script type="module" src="player\.js">/);

  // A player reads two documents and writes none.
  // No Firestore writes. (Map.set on local state is fine; this checks the
  // document handles, which are always reached through db.doc(...).)
  assert.doesNotMatch(player, /db\.doc\([^)]*\)\s*\.(set|update|delete)\(/);
  assert.doesNotMatch(player, /\.doc\(`[^`]*`\)\.(set|update|delete)\(/);
  assert.match(player, /travellerCampaigns\/\$\{campaignId\}`\)\.onSnapshot/);
  assert.match(player, /encounters\/\$\{encounterId\}\/view\/current`\)/);

  // It must never request the encounter document itself, which is referee-only.
  assert.doesNotMatch(player, /encounters\/\$\{encounterId\}`\)/);
  // Nor try to list encounters, which cannot work: the parents are missing.
  assert.doesNotMatch(player, /\.collection\('travellerCampaigns/);

  // Which combatant is theirs comes from the ownership map.
  assert.match(player, /function ownedCombatantIds\(\)/);
  assert.match(player, /\.filter\(\(\[, owner\]\) => owner === uid\)/);

  // Live: the referee publishes and this updates without asking.
  assert.match(player, /unsubscribeView\?\.\(\);/);
  // A player can read their own account id, which is how they get seated.
  assert.match(player, /navigator\.clipboard\.writeText\(user\.uid\)/);
});

test('v0.58.0 offers email sign-in as well as Google, on both pages', async () => {
  const auth = await read('auth.js');
  const ui = await read('signin-ui.js');
  const app = await read('app.js');
  const player = await read('player.js');

  assert.match(auth, /export async function signInWithEmail\(email, password\)/);
  assert.match(auth, /export async function createAccountWithEmail\(email, password/);

  // One dialog, shared, so the two pages cannot drift apart.
  assert.match(ui, /export function openSignInDialog\(\)/);
  assert.match(ui, /signInWithEmailAndPassword|signInWithEmail\(/);
  assert.match(app, /el\.accountButton\.onclick = \(\) => openSignInDialog\(\);/);
  assert.match(player, /el\.accountButton\.onclick = \(\) => openSignInDialog\(\);/);

  // Google alone is not enough: an invented address cannot be a Google account,
  // so test accounts would be impossible.
  assert.match(ui, /SIGN IN WITH GOOGLE/);
  assert.match(ui, /CREATE AN ACCOUNT/);
});

test('v0.59.0 lets players declare and the referee apply those declarations', async () => {
  const player = await read('player.js');
  const app = await read('app.js');
  const publish = await read('publish.js');
  const view = await read('../src/published-view.js');

  // The round being declared for is published explicitly: `round` is what has
  // been played, which is a different number.
  assert.match(view, /declaringRound: encounter\.status === 'active' \? encounter\.round : null/);

  // A player writes one document per combatant, keyed by combatant, carrying
  // their own uid — the three things the rules check.
  assert.match(publish, /\.collection\('declarations'\)\.doc\(declaration\.actorId\)/);
  assert.match(player, /uid: currentUserId\(\),\s*actorId: combatantId,/);

  // Players declare only for combatants they own.
  assert.match(player, /const owned = \[\.\.\.ownedCombatantIds\(\)\];/);

  // The referee applies them through the same intent path as a click.
  assert.match(app, /const result = declareEncounterAction\(encounterDocuments\[index\], \{/);
  assert.match(app, /appliedDeclarationKeys\.add\(key\);/);
  // And clears them once the round is resolved, so the next one can be declared.
  assert.match(app, /clearDeclarations\(campaignDocument\.identity\.id, result\.encounter\.identity\.id\)/);

  // A refused declaration must not break the referee's board.
  assert.match(app, /console\.warn\('\[traveller\] player declaration refused:'/);
});

test('v0.59.1 keeps the campaign menu on screen', async () => {
  const css = await read('styles.css');

  // The button sits near the left of the masthead, so a right-anchored menu
  // hangs off the left edge — which it did once the publish controls widened it.
  // Read the rule itself rather than pattern-matching across the stylesheet:
  // a loose regex here matched `right: 0` from an unrelated block further down.
  const block = css.slice(css.indexOf('.campaign-menu-popover {'));
  const rule = block.slice(0, block.indexOf('}') + 1);
  assert.match(rule, /left: 0;/);
  assert.doesNotMatch(rule, /right: 0;/);
  // And a short window scrolls the menu rather than clipping it.
  assert.match(rule, /max-height: calc\(100vh - 64px\);/);
  assert.match(rule, /overflow-y: auto;/);
});

test('v0.60.0 rechecks player ownership and retires stale scene listeners', async () => {
  const app = await read('app.js');
  const player = await read('player.js');
  const index = await read('index.html');
  const playerPage = await read('player.html');

  assert.match(app, /authorizePlayerDeclaration\(entry, \{ campaign: campaignDocument, encounter: encounterDocuments\[index\] \}\)/);
  assert.match(app, /if \(watchedDeclarationEncounterId !== watchedId\) unsubscribe\(\);/);
  assert.match(player, /const generation = \+\+sceneWatchGeneration;/);
  assert.match(player, /if \(generation !== sceneWatchGeneration \|\| encounterId !== watchedEncounterId\) unsubscribe\(\);/);
  assert.match(index, /v0\.278\.0/);
  assert.match(playerPage, /PLAYER v0\.278\.0/);
});

test('v0.63.0 uses a configurable metre grid, compact shared-square tokens, and selected-actor range boundaries', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  assert.match(html, /id="encounter-grid-scale"/);
  assert.match(html, /One-kilometer personal encounter map with configurable grid scale/);
  assert.match(html, /id="encounter-range-pair"/);
  assert.match(html, /id="encounter-range-grid"/);
  assert.match(html, /id="encounter-grid-toggle"/);
  assert.match(app, /encounter-range-boundary/);
  assert.match(await read('scene-canvas.js'), /const SLOTS = \[\[0, 0\]/);
  assert.match(app, /encounterGridHidden \? '\[ SHOW GRID \]' : '\[ HIDE GRID \]'/);
  assert.match(css, /\.encounter-range-boundary\.very-long/);
  assert.match(css, /#encounter-section\.grid-hidden \.encounter-map-viewport/);
});

test('v0.60.3 keeps map tokens movable and targetable with compact rings and deeper zoom', async () => {
  const app = await read('app.js');
  const css = await read('styles.css');
  const encounter = await read('../src/encounter-document.js');

  assert.match(app, /ENCOUNTER_MAP_MAX_ZOOM = 16/);
  assert.match(app, /latestEncounterAtCurrentSystem\(\)/);
  assert.match(await read('scene-canvas.js'), /class: 'scene-token-hit'/);
  assert.doesNotMatch(encounter, /repositionEncounterCombatant[\s\S]{0,200}encounter is already resolved/);
  assert.match(css, /\.encounter-token:focus \{ outline: none; \}/);
  assert.match(css, /\.encounter-token-selected-ring[^}]*vector-effect: non-scaling-stroke/s);
  assert.match(css, /\.encounter-token-target-ring[^}]*vector-effect: non-scaling-stroke/s);
});

test('v0.61.0 gives players an owned-token canvas, visible targeting, and compact combat cards', async () => {
  const player = await read('player.js');
  const page = await read('player.html');
  const publish = await read('publish.js');
  const app = await read('app.js');
  const css = await read('styles.css');

  assert.match(page, /id="player-map-viewport"[^>]*tabindex="0"/);
  assert.match(page, /HOVER \+ T TO TARGET/);
  assert.match(player, /if \(!ownedCombatantIds\(\)\.has\(combatant\.id\)\)/);
  assert.match(player, /writeTokenMove\(connectedCampaignId, view\.encounterId/);
  assert.match(player, /event\.key !== 't'/);
  assert.match(player, /showPlayerTokenMenu/);
  assert.match(publish, /collection\('presence'\)\.doc\(presence\.uid\)/);
  assert.match(app, /watchPlayerCanvas\(\)/);
  assert.match(app, /activity-combat-card/);
  assert.match(css, /\.player-token-selected[^}]*vector-effect: non-scaling-stroke/s);
});

test('v0.62.0 exposes Book 1 walking, running, escape limits, and shared movement paths', async () => {
  const app = await read('app.js');
  const player = await read('player.js');
  const view = await read('../src/published-view.js');
  const encounter = await read('../src/encounter-document.js');
  const css = await read('styles.css');

  assert.match(encounter, /ENCOUNTER_METERS_PER_RANGE_BAND = 25/);
  assert.match(encounter, /personalMovementConsequences/);
  assert.match(encounter, /after combat begins, escape is possible only by opening beyond 20 range bands/);
  // v0.178.0/v0.180.0: the flat verb row became Book 1 p.26 step 4's two
  // decisions on both pages, so running is a PACE rather than its own verb.
  assert.match(app, /choice\('RUN', draft\.pace === 'run'/);
  assert.match(player, /choice\('RUN', draft\.pace === 'run'/);
  assert.match(view, /movementPaths:/);
  assert.match(css, /\.encounter-movement-path, \.player-movement-path/);
});

test('v0.62.1 previews a snapped drag with one dash pattern and legality colors', async () => {
  const app = await read('app.js');
  const player = await read('player.js');
  const html = await read('index.html');
  const playerPage = await read('player.html');
  const css = await read('styles.css');

  assert.match(html, /id="encounter-move-pace"/);
  assert.match(playerPage, /id="player-move-pace"/);
  assert.match(await read('scene-canvas.js'), /scene-drag-trail/);
  assert.match(await read('scene-canvas.js'), /scene-drag-label/);
  assert.match(await read('scene-canvas.js'), /18 \/ zoom/);
  assert.match(await read('scene-canvas.js'), /18 \/ zoom/);
  assert.match(player, /distance \/ view\.map\.metersPerSquare/);
  assert.match(css, /\.movement-drag-trail \{[^}]*stroke-dasharray: 5 3/s);
  assert.match(css, /\.movement-drag-trail\.legal/);
  assert.match(css, /\.movement-drag-trail\.limit/);
  assert.match(css, /\.movement-drag-trail\.over/);
  const runRule = css.slice(css.indexOf('.encounter-movement-path.run'), css.indexOf('}', css.indexOf('.encounter-movement-path.run')) + 1);
  assert.doesNotMatch(runRule, /stroke-dasharray/);
});

test('v0.63.6 clears finished-canvas overlays and uses right-drag panning', async () => {
  const app = await read('app.js');
  const player = await read('player.js');
  assert.match(app, /encounter\.status === 'active'\n\s+\? Math\.max/);
  assert.match(app, /encounter\.status === 'active' && actor && target/);
  assert.match(await read('scene-canvas.js'), /if \(event\.button !== 2\) return;/);
  assert.match(player, /if \(event\.button !== 0\) return;\n  selectedTokenIds = new Set\(\);/);
  assert.match(app, /clearEncounterCanvasSelection\(\)/);
  assert.match(player, /targetTokenIds = new Set\(\)/);
});

test('v0.63.7 requires explicit referee selection and targeting', async () => {
  const app = await read('app.js');
  assert.doesNotMatch(app, /selected = candidates\[0\]/);
  assert.doesNotMatch(app, /awaiting\[0\] \?\? party\[0\]/);
  assert.match(app, /clearEncounterCanvasSelection\(\);/);
  assert.match(app, /selectedEncounterTokenIds\.has\(entry\.id\)/);
  assert.match(app, /const mine = effectiveTargetIds\(encounter, actor\.id\);/);
});

test('v0.65.0 publishes each player their own character and a table-knowledge log', async () => {
  const html = await read('player.html');
  const player = await read('player.js');
  const publish = await read('publish.js');
  const app = await read('app.js');
  const css = await read('styles.css');

  // The page: a CHARACTER / SCENE tab strip, a sheet column and a log column.
  assert.match(html, /id="player-tab-character"[^>]*role="tab"/);
  assert.match(html, /id="player-tab-scene"[^>]*role="tab"/);
  assert.match(html, /id="player-stage" class="player-stage" data-tab="character"/);
  assert.match(html, /<article id="player-sheet" class="traveller-character-sheet player-sheet"/);
  assert.match(html, /id="player-log" class="player-log"/);
  // The sheet is read: no weapon or armour selects, no notes textarea.
  assert.doesNotMatch(html, /<select id="player-sheet-/);
  assert.doesNotMatch(html, /<textarea/);
  assert.match(css, /\.player-stage\[data-tab="character"\] \.player-scene-column/);
  assert.match(css, /\.player-stage\[data-tab="scene"\] \.player-character-column \{ display: none; \}/);

  // The player reads only its own subtree and still writes nothing there.
  assert.match(player, /db\.doc\(`travellerCampaigns\/\$\{campaignId\}\/players\/\$\{uid\}`\)/);
  assert.match(player, /root\.collection\('characters'\)\.onSnapshot/);
  assert.match(player, /root\.collection\('log'\)\.doc\('current'\)\.onSnapshot/);
  assert.doesNotMatch(player, /collection\('characters'\)\.doc\([^)]*\)\.set\(/);
  // A fight brings the scene forward unless the player picked a tab.
  assert.match(player, /if \(chosenTab\) \{ setTab\(chosenTab\); return; \}/);
  assert.match(player, /setTab\(fighting \|\| !characters\.size \? 'scene' : 'character'\)/);

  // The referee writes under players/{uid}/…, and unseating clears it.
  assert.match(publish, /export async function publishPlayerCharacter\(published\)/);
  assert.match(publish, /export async function publishPlayerLog\(published\)/);
  assert.match(publish, /\.collection\('characters'\)\.doc\(published\.characterId\)/);
  assert.match(publish, /await clearPlayerDocuments\(campaignId, uid\);\n  await db\.collection\('travellerCampaigns'\)\.doc\(campaignId\)\.collection\('players'\)\.doc\(uid\)\.delete\(\)/);

  // Published on publish, on seating, after every resolved round, and
  // debounced behind the activity log while online.
  assert.match(app, /async function publishPlayerDocuments\(/);
  assert.match(app, /const counts = await publishPlayerDocuments\(\{ publishedAt \}\);/);
  assert.match(app, /return publishPlayerDocuments\(\);\n    \}\)/);
  assert.match(app, /renderActivity\(\);\n  schedulePlayerDocumentPublish\(\);/);
  assert.match(app, /buildPublishedCharacter\(character, \{ campaignId, ownerUid: uid, publishedAt \}\)/);
  assert.match(app, /buildPublishedLog\(activityLogDocument, \{ campaignId, uid, ownedCharacterIds, publishedAt \}\)/);
  // Reassignment removes the sheet from the previous owner's path.
  assert.match(app, /await removePlayerCharacter\(campaignId, previousUid, characterId\)/);
});

test('v0.66.0 lifts the chargen view out of app.js without changing what it renders', async () => {
  const app = await read('app.js');
  const view = await read('chargen-view.js');

  // The module renders from a chargen character into caller-supplied elements
  // and reports choices through execute; it holds no state of its own.
  assert.match(view, /export function renderChargenSheet\(character, el\)/);
  assert.match(view, /export function renderChargenActions\(container, character, available, execute\)/);
  assert.match(view, /export function renderChargenTables\(container, character, execute\)/);
  assert.match(view, /export function actionButton\(label, action, payload, execute\)/);
  assert.match(view, /export function appendSheetDatum\(list, label, value\)/);
  assert.match(view, /export function renderSheetBenefitRows\(container, rows\)/);
  assert.doesNotMatch(view, /performChargenAction\(|campaignDocument|gameplayDocument|localStorage|el\.sheet/);

  // The referee client delegates rather than duplicating: none of the lifted
  // bodies remain, and the completed-character branch of WHAT NOW? stays here.
  assert.match(app, /from '\.\/chargen-view\.js(\?v=[^']*)?'/);
  assert.match(app, /renderChargenSheetView\(character, chargenSheetElements\(\)\)/);
  assert.match(app, /renderChargenActions\(el\.actions, character, available, execute\);/);
  assert.match(app, /renderChargenTablesView\(el\.chargenTables, character, execute\)/);
  assert.doesNotMatch(app, /function actionButton\(|function promptControl\(|function tableElement\(|function describeOutcome\(|function appendSheetDatum\(/);
  assert.doesNotMatch(app, /NO FURTHER CHARACTER-GENERATION ACTIONS/);
  assert.match(app, /\[ START NEW CAMPAIGN \]/);
  assert.match(app, /\[ EXPORT CHARACTER \]/);
});

test('v0.67.0 gives players a front door: their own characters, chargen, and a seat by invite', async () => {
  const html = await read('enter.html');
  const enter = await read('enter.js');
  const publish = await read('publish.js');
  const app = await read('app.js');
  const index = await read('index.html');
  const css = await read('styles.css');

  // The page: sign in, the list, chargen with the lifted view; the referee
  // client is never imported.
  assert.match(html, /ENTER v0\.278\.0/);
  assert.match(html, /id="enter-signin"/);
  assert.match(html, /id="enter-character-list"/);
  assert.match(html, /id="enter-new-character"/);
  assert.match(html, /<article id="enter-sheet" class="traveller-character-sheet player-sheet enter-sheet"/);
  assert.match(html, /<script type="module" src="enter\.js">/);
  assert.match(enter, /from '\.\/chargen-view\.js(\?v=[^']*)?'/);
  assert.doesNotMatch(enter, /app\.js/);
  assert.match(enter, /renderChargenActions\(el\.actions, character, procedure\.available, execute\)/);
  assert.match(enter, /createCharacterRecord\(createCharacterDocument\(named\), \{ ownerUid: uid \}\)/);
  assert.match(enter, /YOU HAVE NO CHARACTERS YET/);
  assert.match(enter, /\[ ENTER WORLD \]/);
  assert.match(enter, /player\.html\?campaign=/);
  assert.match(enter, /SOLO WORLD \/ NOT YET OPEN/);
  // A draft survives a reload.
  assert.match(enter, /graycloak\.traveller\.enter\.draft\.v1:/);
  // Writes: own records and one join request. Never a campaign, never a seat.
  assert.match(publish, /export async function saveCharacterRecord\(record\)/);
  assert.match(publish, /export async function writeJoinRequest\(join\)/);
  assert.match(publish, /where\('ownerUid', '==', uid\)/);
  assert.doesNotMatch(enter, /seatPlayer|publishCampaign|setCharacterRecordWorldRemote/);

  // The referee mints invites and seats requests from the Players dialog.
  assert.match(index, /id="players-new-invite"/);
  assert.match(index, /id="players-joins"/);
  assert.match(app, /async function mintInvite\(\)/);
  assert.match(app, /async function seatJoinRequest\(join\)/);
  assert.match(app, /addCharacterDocumentToCampaign\(characterDocument, campaignId, \{ makeActive: false \}\)/);
  assert.match(app, /setDocumentOwner\(campaignDocument, \{ documentId: characterDocument\.identity\.id, ownerUid: join\.uid \}\)/);
  assert.match(app, /setCharacterRecordWorldRemote\(join\.characterId, \{/);
  assert.match(app, /await deleteJoinRequest\(campaignId, join\.uid\);/);
  // Unseating sends the record back to unassigned.
  assert.match(app, /await setCharacterRecordWorldRemote\(documentId, unassignedWorld\(\)\)/);
  assert.match(css, /\.enter-character \{/);
});

test('v0.67.1 narrows a repeated weapon benefit to weapons already received (Book 1 p.22)', async () => {
  const view = await read('chargen-view.js');
  const model = await read('ui-model.js');
  assert.match(view, /const skillable = new Set\(available\.choices\.skillSpecializations \?\? \[\]\);/);
  assert.match(view, /button\.disabled = !allowed;/);
  assert.match(model, /ROLL WASTED \(ALREADY HELD, BOOK 1 P\.22\)/);
});

test('v0.68.0 gives the campaign a home in Firestore and makes the browser a cache', async () => {
  const app = await read('app.js');
  const publish = await read('publish.js');
  const auth = await read('auth.js');
  const enter = await read('enter.js');
  const enterHtml = await read('enter.html');
  const player = await read('player.js');
  const index = await read('index.html');

  // Every autosave is followed by a revisioned cloud save; a stale home stops
  // autosaving until a reload rather than overwriting another browser's work.
  assert.match(app, /markAutosaved\(\);\n  scheduleCampaignHomeSave\(\);/);
  assert.match(app, /await saveCampaignHome\(home, envelope, \{ expectedRevision: campaignHomeRevision \}\);/);
  assert.match(app, /if \(error instanceof StaleCampaignHomeError\) \{/);
  assert.match(app, /return Boolean\(campaignDocument && registry && currentUserId\(\) && !campaignHomeStale\);/);
  assert.match(publish, /await db\.runTransaction\(async \(transaction\) => \{/);
  assert.match(publish, /throw new StaleCampaignHomeError\(/);
  // Loading from the cache or a file forgets the revision, so the next save
  // cannot silently overwrite a home it has not seen.
  assert.match(app, /forgetCampaignHome\(\);\n    restoreCampaignFromRegistry\(campaign\);/);
  assert.match(app, /forgetCampaignHome\(\);\n      restoreCampaignFromRegistry\(bundle\.campaign\);/);
  assert.match(index, /id="reload-campaign-cloud"/);

  // Routing: index.html opened cold and signed out goes to the lobby; ?campaign
  // loads from the home; player.html opened cold goes to the lobby too.
  assert.match(app, /window\.location\.replace\(new URL\('enter\.html', window\.location\.href\)\.toString\(\)\);/);
  assert.match(app, /if \(signedIn && await openCampaignFromHome\(wanted\)\) return;/);
  assert.match(player, /if \(!fromUrl && !remembered\) \{\n  window\.location\.replace\(new URL\('enter\.html'/);

  // Sign in every visit.
  assert.match(auth, /Persistence\.SESSION/);

  // The lobby lists the campaigns the account referees and runs one.
  assert.match(enterHtml, /id="enter-campaign-list"/);
  assert.match(enterHtml, /id="enter-load-campaign"/);
  assert.match(enter, /listOwnCampaigns\(uid\)/);
  assert.match(enter, /index\.html\?campaign=\$\{encodeURIComponent\(campaign\.campaignId\)\}/);
  assert.match(publish, /where\('ownership\.ownerUid', '==', uid\)/);
});

test('v0.69.0 makes the lobby the only chargen, starts campaigns from a character, and splits the referee menu', async () => {
  const app = await read('app.js');
  const html = await read('index.html');
  const enter = await read('enter.js');
  const enterHtml = await read('enter.html');
  const publish = await read('publish.js');

  // A first cloud save creates the envelope before the transaction, since the
  // home's referee-only rule reads the envelope.
  assert.match(publish, /if \(!envelopeExisted\) await envelopeRef\.set\(/);

  // START A CAMPAIGN on a character row; the referee client creates the
  // campaign around that record, saves its home, and marks the record.
  assert.match(enter, /index\.html\?start=\$\{encodeURIComponent\(record\.characterId\)\}/);
  assert.match(app, /const startWith = bootParams\.get\('start'\);/);
  assert.match(app, /async function startCampaignFromRecord\(characterId\)/);
  assert.match(app, /await saveCampaignHomeNow\(\);\n  await setCharacterRecordWorldRemote\(characterId, \{/);
  // A cold visit, signed in or not, goes to the lobby; ?new is gone.
  assert.match(app, /if \(!wanted && !startWith && !bootParams\.has\('local'\)/);
  assert.doesNotMatch(app, /bootParams\.has\('new'\)/);
  assert.doesNotMatch(enterHtml, /index\.html\?new=1/);

  // A campaign file loaded on the lobby gets a home at once.
  assert.match(enter, /async function loadCampaignFile\(file\)/);
  assert.match(enter, /await saveCampaignHome\(home, envelope, \{ expectedRevision: null \}\);/);

  // v0.75.0: the two menus became sidebar tabs — files and the table under
  // SETTINGS, publishing under PLAYERS, records under JOURNAL, the ship under
  // VEHICLES.
  const panel = (name, next) => html.slice(html.indexOf(`data-sidebar-panel="${name}"`), html.indexOf(`data-sidebar-panel="${next}"`));
  const settings = html.slice(html.indexOf('data-sidebar-panel="settings"'), html.indexOf('<dialog id="roll-dialog"'));
  for (const id of ['save-campaign', 'reload-campaign-cloud', 'load-campaign', 'import-campaign', 'export-campaign', 'open-lobby', 'new-campaign', 'add-character-to-campaign', 'referee-new-npc']) assert.ok(settings.includes(`id="${id}"`), `${id} in SETTINGS`);
  for (const id of ['publish-status', 'publish-campaign', 'publish-view', 'open-players']) assert.ok(panel('players', 'settings').includes(`id="${id}"`), `${id} in PLAYERS`);
  for (const id of ['open-campaign-view', 'open-threads-view']) assert.ok(panel('journal', 'tables').includes(`id="${id}"`), `${id} in JOURNAL`);
  assert.ok(panel('vehicles', 'port').includes('id="open-ship-view"'));
  assert.match(app, /el\.refereeNewNpc\?\.addEventListener\('click', startNewCharacter\);/);
});

test('v0.69.1 loads the Firestore SDK once, adopts an orphaned home, and offers a draft instead of opening it', async () => {
  const publish = await read('publish.js');
  const enter = await read('enter.js');
  assert.match(publish, /const scriptLoads = new Map\(\);/);
  assert.match(publish, /if \(firestoreReady\) return firestoreReady;/);
  assert.match(publish, /if \(!envelopeExisted && expectedRevision === null\) \{\n        next = \{ \.\.\.home, revision: currentRevision \+ 1 \};/);
  assert.match(enter, /function renderDraftRow\(\)/);
  assert.match(enter, /\[ RESUME \]/);
  assert.doesNotMatch(enter, /if \(draft && !character\) \{ character = draft; view = 'chargen'; \}/);
  assert.match(enter, /campaignsLoadedFor = null;\n    await loadCampaigns\(\);\n  \}\n\}/);
});

test('v0.70.0 shows the player the world between fights and publishes an active board on every save', async () => {
  const app = await read('app.js');
  const player = await read('player.js');
  const playerHtml = await read('player.html');
  const svg = await read('subsector-svg.js');
  const view = await read('../src/published-view.js');

  // One map renderer, shared; the referee's is interactive, the player's is not.
  assert.match(svg, /export function renderSubsectorMap\(\{ subsector, columns, rows, current = null, selected = null, reachable = new Map\(\), objectives = new Set\(\), onSelect = null \} = \{\}\)/);
  assert.match(app, /return renderSubsectorMap\(\{/);
  assert.doesNotMatch(app, /function appendBaseMarkers\(/);
  assert.match(player, /renderSubsectorMap\(\{\n      subsector: FAR_MERIDIAN_SUBSECTOR, columns: SUBSECTOR_COLUMNS, rows: SUBSECTOR_ROWS, current\n    \}\)/);
  assert.match(playerHtml, /id="player-world-map"/);
  assert.match(playerHtml, /id="player-world-port"/);
  assert.match(player, /el\.scene\.textContent = campaign \? 'NO FIGHT IN PROGRESS' : '';/);
  assert.match(player, /fighting \? `SCENE \/ ROUND \$\{view\.declaringRound\}` : campaign\?\.activeScene && !preferWorldOverScene \? 'SCENE' : 'WORLD'/);

  // The ship rides on the envelope without its money or manifests.
  assert.match(view, /export function buildPublishedShip\(ship\)/);
  assert.match(app, /ship: shipDocument,\n      activeScene: publishedActiveScene\(\)\n    \}\);\n    const written = await saveCampaignHome/);
  // An active board publishes with every save, not only when a round resolves.
  assert.match(app, /if \(scene\?\.status === 'active'\) \{\n      publishEncounterView\(buildPublishedView\(scene, \{ campaignId: campaignDocument\.identity\.id, publishedAt: home\.savedAt \}\)\)/);
});

test('v0.70.1 keeps the subsector zoom constants in app.js beside their users', async () => {
  const app = await read('app.js');
  for (const name of ['SUBSECTOR_ZOOM_MIN', 'SUBSECTOR_ZOOM_MAX', 'SUBSECTOR_ZOOM_STEP']) {
    assert.match(app, new RegExp(`^const ${name} = `, 'm'), `${name} must be declared`);
  }
  // Every SCREAMING_CASE identifier used in code is declared or imported.
  const declared = new Set();
  for (const m of app.matchAll(/^(?:const|let|var|function|async function|class)\s+([A-Za-z_$][\w$]*)/gm)) declared.add(m[1]);
  for (const m of app.matchAll(/^import\s*\{([^}]*)\}/gms)) for (const n of m[1].split(',')) { for (const t of n.trim().split(/\s+as\s+/)) if (t) declared.add(t); }
  const codeOnly = app.replace(/'[^'\n]*'|`[^`]*`|"[^"\n]*"|\/\/.*$/gms, '');
  const used = new Set(codeOnly.match(/\b[A-Z][A-Z0-9]*_[A-Z0-9_]+\b/g) ?? []);
  const missing = [...used].filter((n) => !declared.has(n));
  assert.deepEqual(missing, [], `undeclared constants: ${missing.join(', ')}`);
});

test('v0.70.2 lets the world win over a finished fight, with the board a click away', async () => {
  const player = await read('player.js');
  const html = await read('player.html');
  assert.match(player, /return Boolean\(campaign\) && \(!view \|\| \(view\.status !== 'active' && !showFinishedBoard\)\) && !stagedSceneShowing\(\);/);
  assert.match(html, /id="player-show-board"/);
  assert.match(html, /id="player-back-to-world"/);
  assert.match(player, /if \(fighting\) showFinishedBoard = false;/);
});

test('v0.70.3 suppresses the browser focus ring on player tokens', async () => {
  const css = await read('styles.css');
  assert.match(css, /\.player-token-group:focus, \.player-token-group:focus-visible \{ outline: none; \}/);
});

test('v0.71.0 sizes the board to the fight, draws tokens one square wide on both canvases, and tells a player why a move was refused', async () => {
  const app = await read('app.js');
  const player = await read('player.js');
  const doc = await read('../src/encounter-document.js');
  assert.match(doc, /export function encounterBoardMeters\(range, metersPerSquare = ENCOUNTER_METERS_PER_SQUARE\)/);
  assert.match(doc, /map must be square, between \$\{minimumMapMeters\} m and 1000 m a side/);
  assert.match(await read('scene-canvas.js'), /tokenScale: board\.metersPerSquare \* cell/);
  assert.match(await read('scene-canvas.js'), /transform: `translate\(\$\{centre\.x\} \$\{centre\.y\}\) scale\(\$\{m\.tokenScale\}\)`/);
  assert.match(await read('scene-canvas.js'), /scale\(\$\{tokenScale\}\)/);
  assert.match(player, /shape: combatant\.actorType === 'robot' \? 'square'/);
  assert.match(player, /board\.setBoard\(view\.map\);/);
  assert.match(await read('scene-canvas.js'), /export const SCENE_MAX_ZOOM = 16;/);
  assert.match(app, /function tellPlayer\(uid, message\)/);
  assert.match(app, /tellPlayer\(entry\.uid, `Your move was refused: /);
  assert.match(app, /tellPlayer\(entry\.uid, `Your order was refused: /);
  assert.match(player, /setStatus\(addressed\.message\.toUpperCase\(\)/);
});

test('v0.72.0 adds scene documents in folders and lets a fight be fought on one', async () => {
  const app = await read('app.js');
  const html = await read('index.html');
  const campaign = await read('../src/campaign-document.js');
  const bundle = await read('../src/campaign-bundle.js');
  const registry = await read('../src/document-registry.js');
  assert.match(campaign, /export const CURRENT_CAMPAIGN_DOCUMENT_SCHEMA_VERSION = 11;/);
  assert.match(campaign, /export function addSceneToCampaign\(document, sceneDocument, \{ makeActive = false \} = \{\}\)/);
  assert.match(bundle, /export const CURRENT_CAMPAIGN_BUNDLE_SCHEMA_VERSION = 8;/);
  assert.match(registry, /case SCENE_DOCUMENT_TYPE: return importSceneDocument\(document\);/);
  assert.match(html, /id="directory-scenes"/);
  assert.match(html, /id="scene-dialog"/);
  assert.match(html, /id="combat-scene"/);
  assert.match(app, /function renderSceneDirectory\(\)/);
  assert.match(app, /for \(const \{ folder, scenes \} of sceneFolders\(sceneDocuments\)\)/);
  // v0.96.8: the scene lookup reads el.combatScene.value directly again —
  // SCENE is back to scenes only, now that the range-line choice lives on
  // its own radio at the top of the dialog.
  assert.match(app, /const scene = spatialMode === 'range-line' \? null : \(sceneDocuments\.find\(\(entry\) => entry\.identity\.id === el\.combatScene\?\.value\) \?\? null\);/);
  assert.match(app, /scene: activeScene\(\),/);
  assert.match(app, /scenes: sceneDocuments\n  \}\);/);
});

test('v0.72.1 imports the rules package from vendor/ so the same files run at graycloak.net', async () => {
  const { readdir } = await import('node:fs/promises');
  const dirs = ['client', 'src', 'world'];
  for (const dir of dirs) {
    for (const file of await readdir(new URL(`../${dir}/`, import.meta.url))) {
      if (!file.endsWith('.js')) continue;
      const text = await readFile(new URL(`../${dir}/${file}`, import.meta.url), 'utf8');
      assert.doesNotMatch(text, /\.\.\/\.\.\/packages\/classic-traveller-rules/, `${dir}/${file} must import from ../vendor/`);
    }
  }
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.scripts.pretest, 'node scripts/sync-vendor.mjs');
});

test('v0.72.2 no assignment is stranded in the module-level state block ahead of its declaration', async () => {
  const app = await read('app.js');
  const lines = app.split('\n');
  const stranded = [];
  lines.forEach((line, index) => {
    if (index > 0 && /^let /.test(lines[index - 1]) && /^\s+[A-Za-z_$][\w$]* = /.test(line)) stranded.push(`${index + 1}: ${line.trim()}`);
  });
  assert.deepEqual(stranded, [], 'a bare assignment directly after a top-level let is a text-replace accident (TDZ at load)');
  // And the whole state block declares each name exactly once.
  const declared = [...app.matchAll(/^let ([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
  const dupes = declared.filter((name, index) => declared.indexOf(name) !== index);
  assert.deepEqual(dupes, []);
});

test('v0.72.3 the lobby shows the generation log beside chargen', async () => {
  const html = await read('enter.html');
  const enter = await read('enter.js');
  assert.match(html, /id="enter-generation-log"/);
  assert.match(enter, /function renderGenerationLog\(\)/);
  assert.match(enter, /row\.textContent = formatHistoryEvent\(event\);/);
});

test('v0.73.0 both pages draw the board with scene-canvas.js', async () => {
  const canvas = await read('scene-canvas.js');
  const app = await read('app.js');
  const player = await read('player.js');
  assert.match(canvas, /export function createSceneCanvas\(\{ svg, viewport = null, onCamera = null, maxZoom = SCENE_MAX_ZOOM, minZoom = SCENE_MIN_ZOOM \} = \{\}\)/);
  assert.match(canvas, /export function layoutTokens\(tokens, \{ cell, tokenScale \}\)/);
  assert.match(canvas, /function attachDrag\(group, token, \{ canDrag, constrain, describe, onDrop, onSelect \}\)/);
  // Neither page keeps its own board grid, camera, token base or canvas drag
  // any more. app.js does have its own 'pointermove' since v0.77.0 — that is
  // the character document window's titlebar drag, an unrelated concern —
  // so it is checked separately, below, rather than banned outright.
  for (const [name, text] of [['app.js', app], ['player.js', player]]) {
    assert.doesNotMatch(text, /createSVGPoint/, `${name} maps pointer to board through the canvas`);
    assert.doesNotMatch(text, /setAttribute\('viewBox'/, `${name} leaves the camera to the canvas`);
    assert.doesNotMatch(text, /-\.48 -\.24 V -\.48/, `${name} leaves the selection brackets to the canvas`);
  }
  assert.doesNotMatch(player, /'pointermove'/, 'player.js leaves drag and pan to the canvas');
  assert.match(app, /encounterCanvas\(\)\.camera\.framePoints\(/);
  assert.match(player, /sceneCanvas\(\)\.camera\.fit\(\)/);
  assert.match(player, /onDrop: async \(token, to, \{ reset \}\) =>/);
  assert.match(app, /onDrop: \(token, to\) => moveEncounterToken\(encounter\.identity\.id, token\.id, to\.column, to\.row\)/);
});

test('v0.73.1 the referee applies an authorized player move in the encounter\'s vocabulary', async () => {
  const app = await read('app.js');
  assert.match(app, /moveEncounterCombatantByPlayer\(encounterDocuments\[index\], playerMoveToCombatantMove\(move\)\)/);
});

test('v0.73.2 a player\'s drag stops at the movement allowance', async () => {
  const canvas = await read('scene-canvas.js');
  const player = await read('player.js');
  assert.match(canvas, /const constrained = constrain\?\.\(token, drag\.from, \{ column, row \}\);/);
  assert.match(player, /constrain: \(token, from, to\) => \{/);
  assert.match(player, /const cap = Math\.floor\(allowance \/ gridScale\) \* gridScale;/);
});

test('v0.73.3 a character file loads on the lobby as one of the account\'s characters', async () => {
  const html = await read('enter.html');
  const enter = await read('enter.js');
  assert.match(html, /id="enter-load-character"/);
  assert.match(enter, /async function loadCharacterFile\(file\)/);
  assert.match(enter, /loaded\.kind === TRAVELLER_DOCUMENT_KINDS\.CHARACTER/);
  assert.match(enter, /loaded\.kind === TRAVELLER_DOCUMENT_KINDS\.CHARGEN/);
});

test('v0.73.4 T targets the hovered token from anywhere on either page', async () => {
  const app = await read('app.js');
  const player = await read('player.js');
  for (const text of [app, player]) {
    assert.match(text, /if \(!hovered(?:Encounter)?(?:Combatant|Token)Id \|\| \(event\.key !== 't' && event\.key !== 'T'\)\) return;/);
    assert.match(text, /dispatchEvent\(new KeyboardEvent\('keydown', \{ key: event\.key, shiftKey: event\.shiftKey/);
  }
});

test('v0.74.0 the active scene is staged, seen by players, and fought from the combat tracker', async () => {
  const app = await read('app.js');
  const player = await read('player.js');
  const playerHtml = await read('player.html');
  const scene = await read('../src/scene-document.js');
  const view = await read('../src/published-view.js');
  const movement = await read('../src/player-token-movement.js');
  assert.match(scene, /export function setSceneTokenCombat\(document, tokenId, inCombat\)/);
  assert.match(scene, /export function trackedSceneTokens\(document\)/);
  assert.match(view, /export function buildPublishedScene\(scene, \{ names = new Map\(\) \} = \{\}\)/);
  assert.match(movement, /export function authorizePlayerSceneMove\(raw, \{ campaign, scene \} = \{\}\)/);
  // Referee: staging renders on the encounter canvas when no fight is on; the
  // tracker starts the fight; players' scene moves are watched by scene id.
  assert.match(app, /if \(!encounter && activeScene\(\)\) \{ renderStagedScene\(activeScene\(\)\); return; \}/);
  assert.match(app, /function startCombatFromScene\(scene\)/);
  assert.match(app, /const begin = makePortButton\('BEGIN COMBAT', \(\) => beginCombatFromTracker\(combat\)\);/);
  assert.match(app, /watchTokenMoves\(campaignDocument\.identity\.id, watchedId, applyPlayerSceneMoves\)/);
  assert.match(app, /activeScene: publishedActiveScene\(\)/);
  // Player: the staged scene shows when no fight is on; own token walkable.
  assert.match(playerHtml, /id="player-scene-to-world"/);
  assert.match(player, /function renderStagedScene\(scene\)/);
  assert.match(player, /canDrag: \(entry\) => owned\.has\(entry\.token\.actorId\)/);
  assert.match(player, /encounterId: scene\.sceneId, actorId: entry\.token\.actorId/);
});

test('v0.74.1 the lobby chargen rail does not shrink WHAT NOW? under its buttons', async () => {
  const css = await read('styles.css');
  assert.match(css, /\.enter-chargen-rail > \* \{ flex: 0 0 auto; \}/);
});

test('v0.75.0 the shell: canvas first, a tool rail, a tabbed sidebar, and table chat with a dice tray', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');
  const publish = await read('publish.js');
  const player = await read('player.js');
  const playerHtml = await read('player.html');
  const dice = await read('../src/dice-tray.js');
  // v0.192.0: the grid shell. CHAT is the shell's bottom edge and WORLD a
  // strip under the map, so neither is a sidebar tab.
  assert.match(html, /<main id="shell" class="terminal shell shell-v2"/);
  for (const area of ['shell-masthead', 'shell-rail', 'shell-stage', 'shell-sidebar', 'shell-chat']) assert.ok(html.includes(`class="${area}"`) || html.includes(` ${area}"`), area);
  for (const tab of ['combat', 'scenes', 'actors', 'vehicles', 'journal', 'tables', 'players', 'settings']) {
    assert.ok(html.includes(`data-sidebar-tab="${tab}"`), `tab ${tab}`);
    assert.ok(html.includes(`data-sidebar-panel="${tab}"`), `panel ${tab}`);
  }
  assert.doesNotMatch(html, /data-sidebar-tab="chat"|data-sidebar-tab="port"/);
  assert.match(html, /<footer id="shell-chat" class="shell-chat"/);
  assert.doesNotMatch(html, /id="campaign-menu"|id="referee-menu"/);
  assert.match(app, /const SIDEBAR_TABS = \['combat', 'scenes', 'actors', 'vehicles', 'journal', 'tables', 'players', 'settings'\];/);
  assert.match(app, /function renderRailTools\(\)/);
  assert.match(css, /\.terminal\.shell \{/);
  // Chat: a message is the writer's own; rolls are messages; private rolls
  // are the referee-only log.
  assert.match(dice, /export function interpretChatInput\(input, \{ uid, name, random \} = \{\}\)/);
  assert.match(publish, /export async function sendChatMessage\(campaignId, message\)/);
  assert.match(publish, /export async function watchChat\(campaignId, onChange, \{ limit = 200 \} = \{\}\)/);
  assert.match(app, /logActivity\('NOTE', `Referee rolls \$\{formatRoll\(roll\)\} \(private\)`, \{ visibility: ACTIVITY_VISIBILITY\.REFEREE \}\);/);
  assert.match(html, /id="dice-tray"/);
  assert.match(playerHtml, /id="player-dice-tray"/);
  assert.match(player, /watchTableChat\(campaignId\);/);
  assert.match(player, /postChat\(interpretChatInput\(text, \{ uid: currentUserId\(\), name: chatAuthorName\(\) \}\)\);/);
});

test('v0.98.0 WHAT NOW? is a permanent column, not a disclosure strip in the drawer', async () => {
  const html = await read('index.html');
  const css = await read('styles.css');
  // The <details> wrapper is gone: a disclosure triangle on the one panel
  // read every turn was what buried trading in the first place.
  assert.ok(!html.includes('id="sidebar-whatnow"'));
  assert.ok(!css.includes('#sidebar-whatnow'));
  assert.ok(html.indexOf('class="shell-dock"') < html.indexOf('id="sidebar"'));
  const dock = html.slice(html.indexOf('class="shell-dock"'), html.indexOf('id="sidebar"'));
  assert.ok(dock.includes('id="procedure-section"'));
  assert.ok(dock.includes('id="play-procedure"'));
  // v0.80.0 retired the shell grid: the stage is an absolute base layer and
  // the rail, masthead and sidebar are absolute overlays. A grid-area does
  // nothing here, so the dock is positioned the way the sidebar is and, per
  // the v0.80.2 ruling, pushes the stage rather than covering it.
  assert.match(css, /\.shell-dock \{\n  position: absolute; top: 34px; left: 96px; bottom: 0;/);
  assert.doesNotMatch(css, /\.terminal\.shell:not\(\.dock-collapsed\) \.shell-stage \{ padding-left: calc\(96px \+ 300px\); \}/); // deleted v0.198.0: grid shell
  assert.match(css, /\.dock-collapsed \.shell-dock \{ display: none; \}/);
  // The pre-v0.80.0 grid rules are dead and stay untouched; the dock must be
  // declared after the block that set display: block on the shell, or it is
  // laid out by rules that no longer apply.
  assert.ok(css.indexOf('.shell-dock {\n  position: absolute') > css.indexOf('grid-template-columns: none; grid-template-rows: none; grid-template-areas: none;'));
  assert.match(css, /\.shell-masthead \.masthead-main \{ display: flex; flex-wrap: nowrap;/);
});

test('v0.76.0 actors are folders you drag from onto a scene or combat setup', async () => {
  const app = await read('app.js');
  const campaign = await read('../src/campaign-document.js');
  assert.match(campaign, /export function directoryFolders\(entries\)/);
  assert.match(app, /renderCardDirectory\(el\.directoryActors, actors, \{/);
  assert.match(app, /card\.draggable = true;/);
  assert.match(app, /event\.dataTransfer\.setData\('application\/x-graycloak-actor', directoryDragPayload\(item\)\);/);
  assert.match(app, /function readActorDrop\(event\)/);
  assert.match(app, /viewport\.ondrop = \(event\) => \{/);
  assert.match(app, /function combatSetupDropZone\(\)/);
});

test('v0.76.1 picking a sidebar tab closes the character strip so the tab is not hidden below it (superseded by the v0.192.2 grid shell)', async () => {
  const app = await read('app.js');
  assert.match(app, /const changed = tab !== sidebarTab;/);
  // v0.192.2: the strip is always open in the grid shell; a tab choice no
  // longer touches it.
  assert.doesNotMatch(app, /if \(character\) character\.open = false;/);
});

test('v0.76.2 the token menu survives a bad foe, explains why the last combatant on a side cannot be removed, and reinforcements can be dragged into a live fight', async () => {
  const app = await read('app.js');
  assert.match(app, /try \{\n        const band = encounterPairRange\(combatant, foe, encounter\.map\?\.spatialMode\);/);
  assert.match(app, /label: `\$\{foe\.name\.toUpperCase\(\)\} \/ UNAVAILABLE`, disabled: true/);
  assert.match(app, /const lastOnSide = encounter\.combatants\.filter\(\(entry\) => entry\.side === combatant\.side\)\.length <= 1;/);
  assert.match(app, /if \(encounter\.status === 'active'\) \{\n      viewport\.ondragover = /);
  assert.match(app, /if \(dropped\.kind === 'character'\) \{ setStatus\('A PARTY CHARACTER CANNOT BE ADDED TO A FIGHT ALREADY IN PROGRESS', 'error'\); return; \}/);
  assert.match(app, /if \(encounter\.combatants\.some\(\(entry\) => entry\.sourceActorId === dropped\.actorId\)\) \{ setStatus\('THAT ACTOR IS ALREADY IN THIS ENCOUNTER', 'error'\); return; \}/);
});

test('v0.76.3 the combat and subsector canvases are sized by flex-grow, not by an unresolved percentage height, and the masthead scrolls instead of hiding items', async () => {
  const css = await read('styles.css');
  const app = await read('app.js');
  assert.match(css, /\.shell-stage \.canvas \{ flex: 1 1 0; height: 0; min-height: 0;/);
  assert.match(css, /\.shell-stage #subsector-section, \.shell-stage #encounter-section \{ flex: 1 1 0; height: 0; min-height: 0;/);
  assert.match(css, /\.shell-stage \.encounter-map-viewport \{ flex: 1 1 0; height: 0; min-height: 0; \}/);
  assert.match(css, /\.shell-stage \.subsector-map \{ flex: 1 1 0; height: 0; min-height: 0; max-height: none; align-items: stretch; \}/);
  assert.match(css, /\.shell-stage \.subsector-svg \{ width: 100%; height: 100%; flex: 0 0 auto; \}/);
  assert.match(css, /\.shell-masthead \.masthead-utility \{[^}]*overflow-x: auto; overflow-y: hidden;/);
  // Removal is refused, visibly, for a resolved encounter as well as an
  // emptied side — not only after the click.
  assert.match(app, /const resolved = encounter\.status !== 'active';/);
  assert.match(app, /label: 'REMOVE FROM ENCOUNTER', danger: true, disabled: resolved \|\| lastOnSide,/);
});

test('v0.77.0 the character sheet opens as a floating document window, on tested geometry', async () => {
  const app = await read('app.js');
  const html = await read('index.html');
  const win = await read('../src/document-window.js');
  assert.match(win, /export function clampWindowGeometry\(candidate = \{\}, container = \{\}, options = \{\}\)/);
  assert.match(win, /export function dragWindowGeometry\(start, delta, container, options\)/);
  assert.match(win, /export function resizeWindowGeometry\(current, size, container, options\)/);
  assert.match(html, /id="character-window-titlebar"/);
  assert.match(html, /id="character-window-minimize"/);
  assert.match(html, /id="character-window-close"/);
  assert.match(html, /id="character-window-body"/);
  assert.match(app, /function createWindowController\(\{ element, titlebar, minimizeButton, closeButton, storageKey, onOpen, defaultSize = null \}\)/);
  assert.match(app, /function applyDocumentWindow\(controller\)/);
  assert.match(app, /function wireDocumentWindow\(controller\)/);
  assert.match(app, /const characterWindow = createWindowController\(\{/);
  assert.match(app, /if \(tab === 'character'\) \{/);
  assert.match(app, /new ResizeObserver\(\(\) => \{/);
  assert.match(app, /function elementGeometryFromStyle\(element, fallback\)/);
  assert.doesNotMatch(html, /role="tablist"[^>]*aria-label="Scene">/, 'the scene tabs are no longer a tablist now that CHARACTER is a toggle, not a tab');
});

test('v0.79.0 keeps an explicit canvas and follows Foundry control behavior (geometry superseded by the v0.192.0 grid shell; deleted v0.198.0)', async () => {
  const app = await read('app.js');
  const html = await read('index.html');
  const css = await read('styles.css');
  const win = await read('../src/document-window.js');
  assert.match(html, /id="app-subtitle" class="subtitle">v0\.278\.0</);
  assert.match(html, /class="scene-tab scene-tab-combat-proxy"[^>]*hidden/);
  assert.match(css, /grid-template-columns: 80px minmax\(0, 1fr\) 360px;/);
  assert.match(css, /\.shell-stage \.canvas \{[\s\S]*?height: auto;[\s\S]*?overflow: hidden;/);
  assert.match(css, /\.shell-stage #subsector-section,[\s\S]*?position: absolute;[\s\S]*?inset: 0;/);
  assert.match(css, /\.shell-rail \{[\s\S]*?grid-template-columns: 34px 34px;/);
  assert.match(css, /\.shell-rail \.scene-tabs \{[\s\S]*?grid-column: 1;/);
  assert.match(css, /\.rail-tools \{[\s\S]*?grid-column: 2;/);
  assert.doesNotMatch(css, /\.shell-sidebar \{ grid-template-columns: 52px minmax\(0, 308px\); \}/); // deleted v0.198.0: grid shell
  assert.match(css, /\.sidebar-tab-icon \{ font-size: 22px;/);
  assert.doesNotMatch(css, /\.sidebar-collapsed \.shell-sidebar \{ grid-template-columns: 52px 0; \}/); // deleted v0.198.0: grid shell
  assert.match(app, /panel\.dataset\.sidebarPanel !== sidebarTab;/);
  // v0.192.4: clicking the active tab no longer collapses the right column.
  assert.doesNotMatch(app, /sidebarCollapsed = true; applySidebar\(\); return;/);
  assert.match(app, /if \(button\.dataset\.sidebarTab === 'combat'\) setSceneTab\('combat'\);/);
  assert.match(app, /storageKey: 'traveller\.character-window\.v2'/);
  assert.match(win, /width: 520, height: 500, minWidth: 300, minHeight: 200/);
});

test('v0.79.1 the legacy narrow-viewport rule no longer touches the shell, and the shell owns its own breakpoints (geometry superseded by the v0.192.0 grid shell; deleted v0.198.0)', async () => {
  const css = await read('styles.css');
  assert.match(css, /\.terminal:not\(\.shell\) \{ position: static; inset: auto;/);
  assert.match(css, /\.terminal\.shell \{\n  position: fixed; inset: 0;/);
  // The shell's own breakpoints come after every fixed-column shell rule, so
  // they are not silently overridden at equal specificity.
  const lastFixed = css.lastIndexOf('grid-template-columns: 88px minmax(0, 1fr) 392px');
  const breakpoint = css.lastIndexOf('@media (max-width: 1100px)');
  assert.ok(breakpoint > lastFixed, 'shell breakpoint must follow the fixed-column rule');
  assert.doesNotMatch(css, /@media \(max-width: 900px\) \{\n  \.terminal\.shell,\n  \.terminal\.shell\.sidebar-collapsed \{ grid-template-columns: 48px minmax\(0, 1fr\) 52px; \}/); // deleted v0.198.0: grid shell
});

test('v0.79.2 shell grid items stretch to the row instead of sizing to content', async () => {
  const css = await read('styles.css');
  assert.match(css, /\.terminal\.shell \{\n  position: fixed; inset: 0;[^}]*align-items: stretch; justify-items: stretch;/);
  assert.match(css, /\.shell-rail, \.shell-stage, \.shell-sidebar \{ align-self: stretch; justify-self: stretch; margin: 0; min-height: 0; height: auto; \}/);
});

test('v0.80.0 the canvas is the window: stage as base layer, controls and sidebar floating over it (superseded by the v0.192.0 grid shell; geometry deleted v0.198.0)', async () => {
  const css = await read('styles.css');
  // v0.198.0: the overlay geometry is gone; the grid shell is the one layout.
  // The strip stays on the far right of the column.
  assert.doesNotMatch(css, /\.shell-stage \{\n  position: absolute; inset: 0; z-index: 1;/);
  assert.doesNotMatch(css, /\.shell-rail \{\n  position: absolute; top: 40px; left: 8px;/);
  assert.doesNotMatch(css, /\.shell-sidebar \{\n  position: absolute; top: 34px;/);
  assert.match(css, /#shell\.shell-v2 \{\n  position: fixed; inset: 0;/);
  assert.match(css, /grid-template-areas:\n    "mast mast mast"\n    "dock stage side"\n    "chat chat chat";/);
  assert.match(css, /\.shell-sidebar \.sidebar-tabs \{\n  grid-column: 2; grid-row: 1 \/ -1;/);
});

test('v0.80.1 the sidebar starts collapsed, TABLES yields to CHAT once a campaign is active, and the strips render after layout (superseded by the v0.192.4 grid shell)', async () => {
  const app = await read('app.js');
  const css = await read('styles.css');
  // v0.192.4: the right column never collapses; v0.192.0: CHAT is not a tab,
  // so TABLES yields to ACTORS.
  assert.match(app, /let sidebarCollapsed = false;/);
  assert.match(app, /if \(active && !sidebarChosen && sidebarTab === 'tables'\) \{ sidebarTab = 'actors'; \}/);
  const render = app.slice(app.indexOf('function render() {'));
  assert.ok(render.indexOf('applyCampaignLayout();') < render.indexOf('renderSidebarStrips();'), 'strips render after the layout pass');
  assert.match(css, /\.shell-sidebar > \.sidebar-body \{ background: var\(--paper\); \}/);
  assert.doesNotMatch(css, /\.shell-stage \{ padding-right: 52px; \}/); // deleted v0.198.0: grid shell
});

test('v0.80.2 the drawer pushes the stage instead of covering it, and the world map right-drag pans (geometry superseded by the v0.192.0 grid shell; deleted v0.198.0)', async () => {
  const app = await read('app.js');
  const css = await read('styles.css');
  assert.doesNotMatch(css, /\.terminal\.shell:not\(\.sidebar-collapsed\) \.shell-stage \{ padding-right: calc\(360px \+ 52px\); \}/); // deleted v0.198.0: grid shell
  assert.match(app, /function wireSubsectorPan\(\)/);
  assert.match(app, /if \(event\.button !== 2\) return;\n    event\.preventDefault\(\);\n    pan = \{ pointerId: event\.pointerId/);
  assert.match(app, /wrapper\.scrollLeft = pan\.left - dx;/);
});

test('v0.81.0 CHAT is laid out like Foundry: feed fills the panel, newest at the bottom, composer pinned beneath', async () => {
  const app = await read('app.js');
  const html = await read('index.html');
  const css = await read('styles.css');
  assert.match(app, /let activityOrder = 'oldest';/);
  assert.match(html, /<h2 id="activity-heading" class="activity-title">CHAT<\/h2>/);
  assert.match(html, /<option value="oldest" selected>NEWEST AT BOTTOM<\/option>/);
  assert.match(css, /\.sidebar-panel\[data-sidebar-panel="chat"\] \{\n  display: flex; flex-direction: column;/);
  assert.match(css, /\.sidebar-panel\[data-sidebar-panel="chat"\] > #chat-composer \{\n  flex: 0 0 auto;/);
  assert.match(app, /scrollActivityToLatest\(\);/);
});

test('v0.82.0 the Scenes directory: toolbar, search, folders with a plus, thumbnail cards, red active outline, context menus', async () => {
  const app = await read('app.js');
  const css = await read('styles.css');
  const scene = await read('../src/scene-document.js');
  for (const fn of ['duplicateSceneDocument', 'moveScenesToFolder', 'adoptSceneDocument', 'sceneThumbnailSvg', 'sceneMatchesSearch']) assert.match(scene, new RegExp(`export function ${fn}\\(`));
  assert.match(app, /function showContextMenu\(event, items, \{ parent = null \} = \{\}\)/);
  assert.match(app, /function sceneContextMenuItems\(scene\)/);
  assert.match(app, /function folderContextMenuItems\(folder\)/);
  assert.match(app, /makePortButton\('CREATE SCENE', \(\) => openSceneDialog\(\)\), makePortButton\('CREATE FOLDER', createFolder\)/);
  assert.match(app, /thumb\.innerHTML = sceneThumbnailSvg\(scene, \{ size: 96 \}\);/);
  assert.match(css, /\.scene-card\.is-active \{ border-color: var\(--failure-border\); \}/);
  // The staging block survives the directory rewrite intact.
  for (const fn of ['renderStagedScene', 'renderSceneTracker', 'startCombatFromScene', 'applyPlayerSceneMoves', 'updateScene']) assert.match(app, new RegExp(`^function ${fn}\\(`, 'm'), fn);
});

test('v0.83.0 the Actors directory: cards with token glyphs in folders, search, context menus, still draggable', async () => {
  const app = await read('app.js');
  const npc = await read('../src/npc-actor-document.js');
  const campaign = await read('../src/campaign-document.js');
  for (const fn of ['duplicateNpcActorDocument', 'setNpcActorArchived', 'npcActorMatchesSearch']) assert.match(npc, new RegExp(`export function ${fn}\\(`));
  assert.match(app, /function actorGlyphSvg\(item\)/);
  assert.match(app, /function actorContextMenuItems\(item\)/);
  assert.match(app, /function renderCardDirectory\(container, entries, \{/);
  assert.match(app, /card\.draggable = true;/);
  assert.match(app, /makePortButton\('CREATE ACTOR', \(\) => openNpcActorDialog\(null\)\)/);
  assert.match(app, /if \(item\.kind === 'character'\) \{ activatePartyCharacter\(item\.id\);/);
});

test('v0.84.0 the character strip is retired from the drawer and the palette reads at a glance', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');
  // v0.192.0: always open; v0.193.1: applyCampaignLayout unhides it.
  assert.match(html, /<details id="sidebar-character" class="sidebar-strip" open hidden>/);
  assert.match(app, /if \(characterStrip\) characterStrip\.hidden = !active;/);
  assert.match(css, /\.shell-sidebar > #sidebar-character\[hidden\] \{ display: none; \}/);
  assert.match(css, /--paper: #eeece4;/);
  assert.match(css, /--muted: #33372f;/);
  assert.match(css, /font-size: 15px;\n  line-height: 1\.4;/);
});

test('v0.84.1 a failing render stage is named and does not abandon the panels after it', async () => {
  const app = await read('app.js');
  assert.match(app, /\['directory', renderCampaignDirectory\],/);
  assert.match(app, /console\.error\(`\[traveller\] render stage "\$\{stage\}" failed:`, error\);/);
  assert.match(app, /setStatus\(`RENDER FAILED IN \$\{stage\.toUpperCase\(\)\}/);
});

test('v0.84.2 the actor roster section is owned by the ACTORS tab, not the retired operations desk', async () => {
  const app = await read('app.js');
  // ROSTER is gone from the desk's panel map, and the section is unhidden
  // before the map runs — the desk can no longer switch off a sidebar tab.
  const desk = app.slice(app.indexOf('function applyOperationsDeskTab() {'), app.indexOf('function applyOperationsDeskTab() {') + 1600);
  assert.doesNotMatch(desk, /roster: el\.rosterSection/);
  assert.match(desk, /if \(el\.rosterSection\) el\.rosterSection\.hidden = false;/);
});

test('v0.85.0 the tracker frames and pings tokens, opens sheets, and names its state', async () => {
  const app = await read('app.js');
  const css = await read('styles.css');
  assert.match(app, /function frameEncounterCombatant\(encounter, combatant\)/);
  assert.match(app, /function pingEncounterCombatant\(encounter, combatant\)/);
  assert.match(app, /function openCombatantSheet\(combatant\)/);
  assert.match(app, /encounterCanvas\(\)\.camera\.centreOnPoint\(\{ x: combatant\.position\.column \* cell/);
  assert.match(app, /glyph\.addEventListener\('dblclick'/);
  assert.match(app, /started \? `ROUND \$\{encounter\.round\} \\u00b7 \$\{phase\}`/);
  assert.match(app, /setCombatantStatus\(doc, \{ combatantId: combatant\.id, status: combatant\.status === 'active' \? 'unconscious' : 'active' \}\)/);
  assert.match(css, /\.scene-token\.is-pinged \.scene-token-body \{ animation: token-ping/);
});

test('v0.85.1 the setup dialog reports the real board and surprise conditions reach both paths', async () => {
  const app = await read('app.js');
  const html = await read('index.html');
  assert.doesNotMatch(html, /32 × 20 VISUAL WORKSPACE/, 'the stale workspace claim is gone');
  assert.match(html, /id="combat-setup-board"/);
  assert.match(app, /function renderCombatSetupBoard\(\)/);
  assert.match(app, /const meters = encounterBoardMeters\(el\.combatStartingRange\.value, gridScale\);/);
  assert.match(app, /let sceneSurpriseConditions = \{ party: \{ inAVehicle: false, battleDress: false \}/);
  assert.match(app, /function renderSceneSurpriseConditions\(container\)/);
  assert.match(app, /surpriseConditions: JSON\.parse\(JSON\.stringify\(sceneSurpriseConditions\)\),/);
  assert.match(app, /function combatEncounterForScene\(scene\)/);
});

test('v0.86.0 a target belongs to a combatant, not to the canvas', async () => {
  const app = await read('app.js');
  assert.doesNotMatch(app, /selectedEncounterTargetId/, 'the global target is gone');
  assert.doesNotMatch(app, /encounterExtraTargetIds/, 'the global target set is gone');
  assert.match(app, /let encounterTargetsByActor = new Map\(\);/);
  assert.match(app, /function actorTargetIds\(actorId\)/);
  assert.match(app, /function declaredTargetIdFor\(encounter, actorId\)/);
  // A declared action's target is the document's truth and wins over a mark.
  assert.match(app, /const declared = declaredTargetIdFor\(encounter, actorId\);\n  return declared \? new Set\(\[declared\]\) : actorTargetIds\(actorId\);/);
  // Rings show only the selected combatant's targets.
  assert.match(app, /const targetedIds = actor \? effectiveTargetIds\(encounter, actor\.id\) : new Set\(\);/);
  assert.match(app, /if \(token\.side === actor\.side\) return setStatus\('A COMBATANT CANNOT TARGET ITS OWN SIDE', 'error'\);/);
});

test('v0.87.0 a sidebar panel pops out into the tested window controller and docks back', async () => {
  const app = await read('app.js');
  const html = await read('index.html');
  const css = await read('styles.css');
  assert.match(html, /id="panel-popouts"/);
  assert.match(app, /function popOutPanel\(tab\)/);
  assert.match(app, /function dockPanel\(tab\)/);
  assert.match(app, /function sidebarTabContextMenuItems\(tab\)/);
  // The panel element is moved, not cloned, so ids and render paths survive.
  assert.match(app, /const anchor = document\.createComment\(`panel:\$\{tab\}`\);/);
  assert.match(app, /body\.append\(panel\);/);
  assert.match(app, /popped\.anchor\.parentElement\?\.insertBefore\(popped\.panel, popped\.anchor\);/);
  // It reuses the v0.77.0 controller rather than a second window implementation.
  assert.match(app, /wireDocumentWindow\(controller\);\n  close\.addEventListener/);
  assert.match(app, /panel\.hidden = poppedPanels\.has\(panel\.dataset\.sidebarPanel\) \? false : panel\.dataset\.sidebarPanel !== sidebarTab;/);
  assert.match(css, /\.panel-popouts \{ position: absolute; inset: 0; z-index: 22; pointer-events: none; \}/);
  assert.match(app, /button\.classList\.toggle\('is-popped', poppedPanels\.has\(button\.dataset\.sidebarTab\)\);/);
});

test('v0.88.0 the chat composer is never scrolled away, and a popout is panel-sized', async () => {
  const app = await read('app.js');
  const css = await read('styles.css');
  assert.match(css, /\.sidebar-body:has\(> \.sidebar-panel\[data-sidebar-panel="chat"\]:not\(\[hidden\]\)\) \{ overflow: hidden; \}/);
  assert.match(css, /\.panel-popout \.sidebar-panel\[data-sidebar-panel="chat"\] > #chat-composer \{ flex: 0 0 auto; \}/);
  assert.match(css, /\.panel-popout:has\(\.sidebar-panel\[data-sidebar-panel="chat"\]\) \{ min-height: 280px; \}/);
  // v0.182.0: combat carries a tracker, a throw card and a record, so it
  // pops out at a fight's size rather than a directory's.
  assert.match(app, /defaultSize: tab === 'chat' \? \{ width: 360, height: 560 \}\s*: tab === 'combat' \? \{ width: 620, height: 680 \}\s*: \{ width: 380, height: 520 \}/);
  assert.match(app, /controller\.state\.geometry \?\? controller\.defaultSize \?\? \{\}/);
  // The popped-out panel does not repeat its own heading under the titlebar.
  assert.match(css, /\.panel-popout \.sidebar-panel > \.context-panel > \.section-heading,/);
});

test('v0.89.0 the token menu is grouped on the shared menu, with submenus and wound controls', async () => {
  const app = await read('app.js');
  const doc = await read('../src/encounter-document.js');
  assert.match(doc, /export function setCombatantCurrent\(document, \{ combatantId, scores = \{\} \} = \{\}\)/);
  assert.match(doc, /export function restoreCombatant\(document, \{ combatantId \} = \{\}\)/);
  // The original is the ceiling — healing never goes past the character sheet.
  assert.match(doc, /const capped = Math\.min\(value, combatant\.characteristics\[key\]\);/);
  assert.match(app, /showContextMenu\(event, items\);\n\}/);
  assert.match(app, /\{ heading: 'REFEREE' \},/);
  assert.match(app, /label: 'RESTORE TO FULL'/);
  assert.match(app, /function setCombatantWoundsFromPrompt\(encounter, combatant\)/);
  // Submenu machinery in the shared menu.
  assert.match(app, /if \(item\.items\) \{/);
  assert.match(app, /function closeContextMenus\(\)/);
  // The old bespoke implementation is gone.
  assert.doesNotMatch(app, /const addCascade = /);
  assert.doesNotMatch(app, /el\.encounterTokenMenu\.replaceChildren\(\.\.\.actions\)/);
  // The staged-scene token menu moved to the shared menu too, so there is one
  // menu implementation in the client rather than two.
  assert.match(app, /function showStagedTokenMenu\(event, scene, token\) \{\n  \/\/ v[\d.]+: on the shared compact menu/);
  assert.match(app, /\{ heading: 'SCENE' \},/);
});

test('v0.89.1 the composer sticks to the bottom, and the window titlebar is one row', async () => {
  const css = await read('styles.css');
  assert.match(css, /#chat-composer \{\n  position: sticky;\n  bottom: 0;/);
  assert.match(css, /\.document-window \.document-window-titlebar \{ flex-wrap: nowrap;/);
  assert.match(css, /\.document-window \.document-window-titlebar \.document-window-control \{ margin-left: auto; \}/);
});

test('v0.90.0 gcDebug names the ancestor that hides a panel', async () => {
  const app = await read('app.js');
  const debug = await read('../src/ui-debug.js');
  assert.match(debug, /export function diagnoseVisibility\(chain\)/);
  assert.match(debug, /export function inspectChain\(node, \{ box, style, parentOf, stopAt = null \} = \{\}\)/);
  // The threshold, not exact zero — the v0.79.2 collapse measured 645x1.
  assert.match(debug, /export const COLLAPSED_PX = 4;/);
  assert.match(app, /window\.gcDebug = function gcDebug\(selector = null\)/);
  assert.match(app, /window\.gcDebug\.version = function version\(\)/);
  assert.match(app, /console\.log\(formatInspection\(result\)\);/);
  assert.match(app, /\.\.\.SIDEBAR_TABS\.map\(\(tab\) => \[tab, `\.sidebar-panel\[data-sidebar-panel="\$\{tab\}"\]`\]\)/);
});

test('v0.91.0 the tracker names the phase, the board shows Book 1 statuses, and the chat panel fits its container', async () => {
  const app = await read('app.js');
  const css = await read('styles.css');
  // gcDebug measured the composer's bottom at 850 in an 834px window: the
  // panel was height:100% of a container it starts below. It flexes now.
  assert.match(css, /\.sidebar-body \{ display: flex; flex-direction: column; \}/);
  assert.match(css, /\.sidebar-body > \.sidebar-panel:not\(\[hidden\]\) \{ flex: 1 1 0; min-height: 0; \}/);
  assert.match(css, /\.sidebar-panel\[data-sidebar-panel="chat"\]:not\(\[hidden\]\) \{ height: auto; \}/);
  // Declaring versus resolved is the distinction a simultaneous round turns on.
  assert.match(app, /const phase = pausedWound \? 'ALLOCATING WOUNDS' : declaringCount >= liveCount && liveCount > 0 \? 'READY TO RESOLVE' : `DECLARING \$\{declaringCount\}\/\$\{liveCount\}`;/);
  assert.match(app, /ready\.textContent = encounter\.status !== 'active' \? ''\n {4}: awaiting\.length \? `AWAITING/);
  // Statuses on the token, not only as an opacity change.
  assert.match(app, /const statusGlyph = \{ unconscious: '\\u25CC', dead: '\\u2020', escaped: '\\u2192', withdrawn: '\\u21A9' \}\[combatant\.status\];/);
  assert.match(app, /Add \$\{missing\.join\(' and '\)\} to the tracker: right-click a token on the board, ADD TO COMBAT/);
});

test('v0.92.0 viewing and activating a scene are different acts, and the nav bar is how you travel', async () => {
  const app = await read('app.js');
  const html = await read('index.html');
  const css = await read('styles.css');
  // The world map is a scene id like any other, so "back to the map" is an
  // ordinary selection rather than a special button.
  assert.match(app, /const WORLD_SCENE_ID = 'world';/);
  assert.match(app, /function viewScene\(sceneId\)/);
  assert.match(app, /function viewedSceneIsBoard\(\)/);
  // Clicking a card views; ACTIVATE commits to the table and takes the
  // referee along.
  assert.match(app, /card\.addEventListener\('click', \(\) => viewScene\(scene\.identity\.id\)\);/);
  assert.match(app, /\/\/ Activation is "everyone look here", so the referee goes too\.\n    if \(sceneId\) viewedSceneId = sceneId;/);
  assert.match(app, /\{ label: 'VIEW', title: 'Show this scene on your canvas only'/);
  // Navigation bar, and the retired rail button.
  assert.match(html, /id="scene-nav-button"/);
  assert.match(app, /function renderSceneNav\(\)/);
  assert.match(app, /function sceneNavItems\(\)/);
  assert.match(html, /data-scene-tab="system"[^>]*hidden>/);
  assert.doesNotMatch(css, /\.scene-nav \{ position: absolute; top: 40px;/); // deleted v0.198.0: grid shell
  assert.doesNotMatch(css, /\.scene-nav \{ top: 38px; left: 8px; transform: none; \}/); // deleted v0.198.0: grid shell
  // On load: the activated scene, unless this session viewed another.
  assert.match(app, /function restoreViewedScene\(\)/);
  assert.match(app, /: campaignDocument\?\.activeSceneId && valid\(campaignDocument\.activeSceneId\) \? campaignDocument\.activeSceneId/);
});

test('v0.92.1 the manual dialog is unreachable while a board is on the canvas', async () => {
  const app = await read('app.js');
  const css = await read('styles.css');
  // v0.201.1: START COMBAT still refuses the dialog on a board; the explicit
  // MANUAL COMBAT verb passes fromBoard and is the way to a range-line fight.
  assert.match(app, /if \(viewedSceneIsBoard\(\) && !fromBoard\) \{\n    setStatus\('A SCENE IS ON THE CANVAS/);
  // v0.202.0: the dialog is no longer a route in; the two start verbs open
  // an empty tracker on the chosen board instead.
  assert.match(app, /function openManualSetup\(spatialMode\)/);
  assert.match(app, /function renderManualSetupTracker\(encounter\)/);
  // With a scene viewed, START COMBAT fights on that scene instead.
  assert.match(app, /const afterFight = button \? \[\] : startCombatButtons\(scene\);/);
  // The bar no longer covers the subsector's header.
  assert.doesNotMatch(css, /\.shell-stage \{ padding-top: 66px; \}/); // deleted v0.198.0: grid shell
});

test('v0.92.2 the navigation bar clears the tool rail rather than stacking on it (geometry superseded by the v0.192.0 grid shell; deleted v0.198.0)', async () => {
  const css = await read('styles.css');
  // The rail is an overlay at left:8px; the stage reserves 96px for it, so the
  // bar starts clear of that and sits above it in the stack.
  assert.doesNotMatch(css, /\.scene-nav \{ left: 104px; z-index: 26; \}/); // deleted v0.198.0: grid shell
  const railZ = css.match(/\.shell-rail \{[^}]*z-index: (\d+)/)?.[1];
  if (railZ) assert.ok(Number(railZ) < 26, 'the bar must sit above the rail');
});

test('v0.92.3 START COMBAT on a scene is disabled with a reason until tokens are tracked (superseded by v0.202.0: the tracker opens first, BEGIN waits for both sides)', async () => {
  const app = await read('app.js');
  // v0.202.0: COMBAT · GRID opens the scene's tracker with nobody in it;
  // BEGIN COMBAT stays disabled, with the reason, until both sides are in.
  assert.match(app, /const missing = \[!party\.length \? 'a party character' : null, !foes\.length \? 'an opponent' : null\]\.filter\(Boolean\);/);
  assert.match(app, /begin\.disabled = missing\.length > 0;/);
});

test('v0.92.4 starting a fight leaves the scene tracker intact so the group can fight again', async () => {
  const app = await read('app.js');
  // The clear-on-start is gone: it emptied the very list startCombatFromScene
  // reads, while the referee looked at the encounter's combatant list.
  const start = app.slice(app.indexOf('function startCombatFromScene'), app.indexOf('function startCombatFromScene') + 4000);
  assert.doesNotMatch(start, /clearSceneCombatTracker/);
  // v0.96.8: END COMBAT is the one verb for emptying the tracker, in every
  // phase, discarding the encounter. CLEAR TRACKER and CLOSE TRACKER were
  // the same action under two other names.
  assert.doesNotMatch(app, /clearSceneCombatTracker/);
  assert.doesNotMatch(app, /'CLEAR TRACKER'/);
  assert.doesNotMatch(app, /'CLOSE TRACKER'/);
  assert.match(app, /const end = makePortButton\('END COMBAT', \(\) => \{/);
  assert.match(app, /discardEncounter\(encounter\);/);
});

test('v0.93.0 a resolved fight can be reset, and wounds otherwise persist', async () => {
  const app = await read('app.js');
  // v0.96.8: PUT AWAY and dismissedEncounterIds are gone. "Hidden but still
  // holding every combatant" was the state that kept actors in a tracker the
  // referee thought they had closed. A resolved fight now stays on the desk
  // until END COMBAT or RESET COMBAT removes it.
  assert.doesNotMatch(app, /let dismissedEncounterIds = new Set\(\);/);
  assert.doesNotMatch(app, /function putAwayEncounter\(encounter\)/);
  assert.doesNotMatch(app, /'PUT AWAY'/);
  assert.match(app, /function resetCombat\(encounter\)/);
  // RESET restores every combatant, carries it out to the documents, then
  // empties the tracker the same way END COMBAT does.
  assert.match(app, /next = restoreCombatant\(next, \{ combatantId: combatant\.id \}\)\.encounter;/);
  assert.match(app, /applyEncounterDocumentSync\(next\);/);
  assert.match(app, /logActivity\('COMBAT', `Referee resets \$\{next\.identity\.title\}: every combatant restored to full strength\.`\);/);
  assert.match(app, /discardEncounter\(next\);/);
  // Demoted to its own RECOVERY group, visibly apart from END COMBAT.
  assert.match(app, /textContent: 'RECOVERY'/);
  assert.match(app, /reset\.title = 'Return every combatant to full strength, then empty the tracker/);
});

test('v0.93.1 a reset no longer re-tracks through the vestigial inCombat flag', async () => {
  const app = await read('app.js');
  // v0.96.8: resetCombat used to "re-track" scene tokens via
  // setSceneTokenCombat — the inCombat flag nothing has read since v0.95.0
  // made the encounter document the tracker. Its own log line claimed the
  // group was "re-tracked" when nothing had happened. Gone, along with the
  // import; the function itself stays in scene-document.js.
  assert.doesNotMatch(app, /setSceneTokenCombat/);
  assert.match(app, /function addTokenToCombat\(scene, token\)/);
  assert.match(app, /function discardEncounter\(encounter\)/);
});

test('v0.93.2 gcDebug.combat names which START COMBAT precondition fails', async () => {
  const app = await read('app.js');
  assert.match(app, /window\.gcDebug\.combat = function combat\(\)/);
  // Each precondition reported separately, with the remedy.
  assert.match(app, /no combat tracker is open on this scene/);
  assert.match(app, /no tracked token resolves to a party character/);
  assert.match(app, /no tracked token resolves to a roster actor/);
  assert.match(app, /every party character has a zeroed STR, DEX or END/);
  // The token table shows whether each id resolves to a real document.
  assert.match(app, /'NOTHING — no character or roster actor has this id'/);
});

test('v0.93.3 a fight belonging to another scene is not drawn on the viewed one', async () => {
  const app = await read('app.js');
  // The Manual Combat board was drawn over any viewed scene, so a full-looking
  // canvas sat above an empty scene and START COMBAT refused.
  assert.match(app, /if \(encounter && scene && encounter\.sceneId !== scene\.identity\.id\) \{ renderStagedScene\(scene\); return; \}/);
  assert.match(app, /if \(!encounter && scene\) \{ renderStagedScene\(scene\); return; \}/);
  // An empty scene says so, on the board and on the button.
  assert.match(app, /EMPTY \/ DRAG AN ACTOR FROM THE ACTORS TAB, OR RIGHT-CLICK A SQUARE/);
  // v0.202.0: the scene tracker's empty state names the way in.
  assert.match(app, /THIS SCENE HAS NO TOKENS \/ DRAG AN ACTOR FROM THE ACTORS TAB ONTO THE BOARD/);
});

test('v0.94.0 the encounter has a setup phase, and the tracker has one scrollbar', async () => {
  const doc = await read('../src/encounter-document.js');
  const css = await read('styles.css');
  // Foundry's model: the encounter exists first and collects combatants.
  assert.match(doc, /export const ENCOUNTER_STATUSES = Object\.freeze\(\['setup', 'active'/);
  assert.match(doc, /export function addEncounterCombatantFromCharacter\(document, \{ character, loadout = \{\}, column, row, gravityFactor = null \} = \{\}\)/);
  assert.match(doc, /export function beginEncounter\(document, \{ surpriseConditions = \{\}, dice, surprise = 'roll' \} = \{\}\)/);
  // Surprise belongs to the start of the fight, not to creation.
  assert.match(doc, /next\.surprise = surprise === 'roll'\n {4}\? \{\n {6}\.\.\.resolvePersonalSurprise\(\{/);
  // Setup relaxes the checks that assume a fight already has two sides.
  assert.match(doc, /document\.status === 'setup' \|\| document\.combatants\.length >= 2/);
  assert.match(doc, /\['setup', 'active'\]\.includes\(document\.status\) \? document\.outcome === null/);
  assert.match(css, /\.sidebar-panel\[data-sidebar-panel="combat"\] #encounter-tracker \{ overflow: visible; max-height: none; \}/);
});

test('v0.95.0 the tracker is the combat document: add creates or joins, ending empties it', async () => {
  const app = await read('app.js');
  const campaign = await read('../src/campaign-document.js');
  assert.match(app, /function addTokenToCombat\(scene, token\)/);
  assert.match(app, /function combatEncounterForScene\(scene\)/);
  assert.match(app, /function discardEncounter\(encounter\)/);
  assert.match(app, /function beginCombatFromTracker\(encounter\)/);
  assert.match(campaign, /export function removeEncounterFromCampaign\(document, encounterId\)/);
  // ADD TO COMBAT creates the encounter when none exists, as Foundry does.
  assert.match(app, /if \(!encounter\) \{\n {6}const date = campaignDateSnapshot\(\);/);
  // Ending combat empties the tracker rather than leaving a resolved fight in it.
  assert.match(app, /if \(thenDiscard === result\.encounter\.identity\.id\) \{ discardEncounter\(result\.encounter\); return; \}/);
  // v0.96.8: the setup-phase button is END COMBAT too, same as every phase.
  assert.match(app, /End combat and empty the tracker\? Nothing has happened yet, so nothing is recorded\./);
  // The tracker no longer reads the scene's flags.
  const tracker = app.slice(app.indexOf('function renderSceneTracker'), app.indexOf('function renderSceneTracker') + 3000);
  assert.doesNotMatch(tracker, /trackedSceneTokens|setSceneTokenCombat|\.inCombat/);
});

test('v0.95.5 chat interleaves activity entries and chat messages by actual time', async () => {
  const app = await read('app.js');
  // Activity-log entries store createdAt as an ISO string (schema-required);
  // chat messages store it as a number (Date.now()). Plain subtraction
  // between the two is NaN for every pairing — a no-op comparator that left
  // every activity/combat entry rendered before every chat message.
  assert.doesNotMatch(app, /\.sort\(\(a, b\) => \(a\.createdAt \?\? 0\) - \(b\.createdAt \?\? 0\)\)/);
  assert.match(app, /const at = new Date\(entry\.createdAt\)\.getTime\(\);/);
  assert.match(app, /\.sort\(\(a, b\) => chronological\(a\) - chronological\(b\)\)/);
});

test('v0.95.6 the shell keeps 2px of slack off the exact viewport edge', async () => {
  const css = await read('styles.css');
  const shell = css.slice(css.indexOf('.terminal.shell {'), css.indexOf('.terminal.shell {') + 900);
  // A viewport measured at a non-integer zoom (907.8518676757812, not a
  // round number) means every box computed to land exactly on inset: 0's
  // bottom edge is one independently-rounded device pixel away from a
  // visible seam. bottom: 2px keeps the whole grid off that edge.
  assert.match(shell, /position: fixed; inset: 0;/);
  assert.match(shell, /bottom: 2px;/);
  assert.doesNotMatch(shell, /height: 100vh;/);
});

test('v0.96.0 the chat feed only re-pins to latest when the reader was already there', async () => {
  const app = await read('app.js');
  const html = await read('index.html');
  // Every render used to force scrollTop to whichever edge is "latest" for
  // the current order, unconditionally — reading old lines while a new
  // message arrived yanked the reader straight back to the bottom.
  assert.doesNotMatch(app, /el\.activityFeed\.scrollTop = activityOrder === 'newest' \? 0 : el\.activityFeed\.scrollHeight;\n\}/);
  assert.match(app, /const wasPinnedToLatest = activityOrder === 'newest'/);
  assert.match(app, /if \(wasEmpty \|\| wasPinnedToLatest\) \{/);
  assert.match(html, /id="activity-scroll-latest"/);
  assert.match(app, /el\.activityScrollLatest\.addEventListener\('click', \(\) => \{/);
});

test('v0.96.0 a range-line encounter gets its own board, and never touches the camera', async () => {
  const app = await read('app.js');
  assert.match(app, /if \(encounter\.map\.spatialMode === 'range-line'\) \{ renderRangeLineBoard\(encounter\); return; \}/);
  const fn = app.slice(app.indexOf('function renderRangeLineBoard'), app.indexOf('function renderEncounterMap'));
  // v0.73.0: camera control (viewBox, pan, zoom) belongs exclusively to
  // scene-canvas.js. This view draws inside the SVG's existing declared
  // viewBox instead of setting one, since it has no camera to begin with.
  assert.doesNotMatch(fn, /setAttribute\('viewBox'/);
  // v0.201.0: still no camera, still inside the declared viewBox; the bands
  // are columns, all drawn, range read from the selected marker.
  assert.match(fn, /const bandWidth = \(width - marginX \* 2\) \/ BANDS;/);
  assert.match(fn, /const zoneForGap = \(gap\) => gap === 0 \? 'close'/);
  assert.match(fn, /ENCOUNTER_RANGE_LINE_ESCAPE_BANDS/);
});

test('v0.96.8 how position is tracked is the first, unavoidable choice in Manual Combat', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');
  // v0.96.3 put it on a separate BOARD dropdown that silently fought SCENE;
  // v0.96.4 folded it into SCENE as an entry beside real scene names. Both
  // made the single most consequential decision in a fight easy to miss.
  // It is now two option cards at the top of the dialog, and the grid-only
  // controls (SCENE, METERS/SQUARE) disappear outright under RANGE LINE.
  // v0.201.0: the book's own board is the default; the grid is the second option.
  assert.match(html, /<input type="radio" name="combat-board-mode" value="range-line" checked>/);
  assert.match(html, /<input type="radio" name="combat-board-mode" value="scene">/);
  assert.match(html, /<input type="radio" name="combat-board-mode" value="range-line" checked>/);
  assert.match(html, /id="combat-grid-options"/);
  assert.doesNotMatch(html, /<option value="range-line">/);
  assert.doesNotMatch(html, /id="combat-spatial-mode"/);
  assert.match(app, /function combatSetupBoardMode\(\)/);
  assert.match(app, /el\.combatGridOptions\.hidden = mode === 'range-line';/);
  assert.match(app, /const spatialMode = combatSetupBoardMode\(\);/);
  assert.match(app, /metersPerSquare: spatialMode === 'range-line' \|\| el\.combatMapScale\.value === '' \? null : Number\.parseFloat\(el\.combatMapScale\.value\),/);
  // display: contents keeps the wrapper out of the footer's flex layout, so
  // it must not also swallow the hidden attribute.
  assert.match(css, /\.combat-grid-options\[hidden\] \{ display: none; \}/);
});

test('v0.96.5 gcDebug.combat() exposes the fight\'s own map shape', async () => {
  const app = await read('app.js');
  // activeEncounterAtCurrentSystem is module-internal and was never callable
  // from the console at all; gcDebug.combat() is the one console entry
  // point that already existed and worked, so this is where the map needed
  // to be surfaced for a scene-vs-range-line diagnostic to actually run.
  assert.match(app, /fightMap: fight \? fight\.map : null/);
});

test('v0.96.6 starting Manual Combat switches the canvas to the fight, not just the sidebar', async () => {
  const app = await read('app.js');
  // operationsDeskTab switched the sidebar to the combat tracker, but
  // viewedSceneId (which controls what the canvas itself shows) was never
  // touched — the referee saw nothing change after starting a fight until
  // separately finding MANUAL FIGHT in the scene selector themselves.
  const handler = app.slice(app.indexOf("title: `Manual Combat /"), app.indexOf('function resolveLinkedCombatSituation'));
  assert.match(handler, /operationsDeskTab = 'encounter';/);
  assert.match(handler, /viewedSceneId = 'manual';/);
  assert.match(handler, /activeSceneTab = 'combat';/);
});

test('v0.96.7 the range-line board hides the tactical-only header controls, and restores them for a mapped fight', async () => {
  const app = await read('app.js');
  const html = await read('index.html');
  assert.match(html, /id="encounter-legend-contact-note"/);
  assert.match(app, /encounterMapTools: document\.querySelector\('\.encounter-map-tools'\),/);
  assert.match(app, /encounterRangePanel: document\.querySelector\('#encounter-range-panel'\),/);
  const rangeLineFn = app.slice(app.indexOf('function renderRangeLineBoard'), app.indexOf('function renderEncounterMap'));
  assert.match(rangeLineFn, /el\.encounterMapTools\.hidden = true;/);
  assert.match(rangeLineFn, /el\.encounterRangePanel\.hidden = true;/);
  assert.match(rangeLineFn, /el\.encounterGridLegend\.hidden = true;/);
  assert.match(rangeLineFn, /el\.encounterLegendContactNote\.hidden = true;/);
  const tacticalFn = app.slice(app.indexOf('Restore whatever the range-line view above hides'), app.indexOf('Restore whatever the range-line view above hides') + 400);
  assert.match(tacticalFn, /el\.encounterMapTools\.hidden = false;/);
  assert.match(tacticalFn, /el\.encounterRangePanel\.hidden = false;/);
});

test('v0.120.0 the world record stacks alone; trade and jobs left for the dock (superseded: v0.192.1 stacks all three under the map)', async () => {
  const app = await read('app.js');
  const css = await read('styles.css');
  const html = await read('index.html');
  assert.match(html, /id="sidebar-port-panel"/);
  assert.match(app, /const portStacked = campaignPlayActive\(\) && !encounterWorkspaceActive && !situationTakeover;/);
  // v0.192.1: WORLD, TRADE and JOBS stack under the map; the flyouts remain
  // a second home.
  assert.match(app, /const stacked = portStacked && \['port', 'trade', 'jobs'\]\.includes\(key\);/);
  assert.match(app, /panel\.hidden = stacked \? !available : \(key !== operationsDeskTab \|\| !available\);/);
  assert.match(css, /\.port-stacked \.context-panel \{ display: block; \}/);
});

test('v0.99.1 a clickable verb is a real button with an edge, a fill and a hover state', async () => {
  const app = await read('app.js');
  const css = await read('styles.css');
  // The card is a card; the verb is the control. A whole-card <button> gave
  // the player nothing to aim at.
  assert.match(app, /const button = document\.createElement\('div'\);\n      button\.className = `procedure-card \$\{card\.tone\}`;/);
  assert.match(app, /verb\.className = 'procedure-card-verb';/);
  assert.match(app, /verb\.addEventListener\('click', \(\) => playProcedureAction\(card\.action\)\);/);
  // Dock verbs, panel card actions and port/trade/jobs primary actions all
  // share one affordance.
  assert.match(css, /\.procedure-card-verb,\n\.panel-card-action,\n\.operations-primary-actions \.text-button \{/);
  assert.match(css, /border: 1px solid var\(--action-border\); border-radius: 0;/);
  assert.match(css, /padding: 4px 10px; cursor: pointer; text-decoration: none;/);
  assert.match(css, /\.procedure-card\.blocked \{ cursor: default; \}/);
});

test('v0.100.0 the map states the route: destination ring, jump line with parsecs, pulse only while unset', async () => {
  const svg = await read('subsector-svg.js');
  const css = await read('styles.css');
  // The pulse is a prompt, so it is conditional on a destination being
  // required and unset, and the current port is never part of it.
  assert.match(svg, /if \(current && !selected && reachable\.size\) svg\.classList\.add\('destination-pending'\);/);
  assert.match(css, /\.subsector-svg\.destination-pending \.subsector-hex\.reachable \.subsector-hex-shape \{\n  animation: subsector-reachable-pulse/);
  assert.doesNotMatch(css, /destination-pending \.subsector-hex\.current/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  // The route line carries the one number the choice turns on, and cannot
  // swallow a hex click.
  assert.match(svg, /class: 'subsector-destination-ring'/);
  assert.match(svg, /label\.textContent = `\$\{parsecs\} PC`;/);
  assert.match(css, /\.subsector-jump-layer \{ pointer-events: none; \}/);
  // Drawn after every hex group, so it sits over them.
  assert.ok(svg.indexOf("class: 'subsector-jump-layer'") > svg.lastIndexOf('svg.append(group);'));
});

test('v0.100.1 the way back to the map is reachable and the MAP verb restores it', async () => {
  const app = await read('app.js');
  const css = await read('styles.css');
  // #subsector-section is hidden whenever the canvas shows a scene or board,
  // so scrolling to it is a no-op; the card has to bring the world back.
  assert.match(app, /if \(viewedSceneId !== WORLD_SCENE_ID\) \{ viewScene\(WORLD_SCENE_ID\); return; \}/);
  // The scene navigation bar predates the dock and shared its coordinates.
  assert.doesNotMatch(css, /\.terminal\.shell:not\(\.dock-collapsed\) \.scene-nav \{ left: calc\(96px \+ 300px \+ 8px\); \}/); // deleted v0.198.0: grid shell
  assert.doesNotMatch(css, /\.terminal\.shell\.dock-collapsed \.scene-nav \{ left: 104px; \}/); // deleted v0.198.0: grid shell
  assert.doesNotMatch(css, /\.dock-reopen \{ top: 68px; left: 104px; \}/); // deleted v0.198.0: grid shell
});

test('v0.101.0 a desk card opens the drawer on its panel instead of selecting a hidden tab', async () => {
  const app = await read('app.js');
  // setOperationsDeskTab alone picks a tab inside a drawer that may be
  // collapsed, and the port panels are stacked since v0.99.0, so [ OPEN ]
  // produced nothing visible.
  // v0.118.0: jobs unfolds a flyout beside the dock instead of opening the
  // drawer; the rest still open their panel there.
  assert.match(app, /if \(action === 'jobs' \|\| action === 'trade'\) \{ setFlyout\(action\); return; \}/);
  assert.match(app, /const deskPanels = \{ port: el\.portServicesSection, situation: el\.situationSection \};/);
  // v0.192.0: WORLD is a stage strip, not a tab; the desk tab alone suffices.
  assert.match(app, /setOperationsDeskTab\(action\);\n    const panel = deskPanels\[action\];/);
  assert.doesNotMatch(app, /setSidebarTab\('port'\)/);
  assert.match(app, /panel\.scrollIntoView\(\{ block: 'start' \}\)/);
});

test('v0.102.0 a job card points at its system, and the map marks what is owed', async () => {
  const app = await read('app.js');
  const svg = await read('subsector-svg.js');
  const css = await read('styles.css');
  assert.match(app, /function contractDaysRemaining\(contract\)/);
  // Clicking a job restores the world map, selects the destination so the
  // route is drawn to it, and brings the board up for the detail.
  assert.match(app, /if \(viewedSceneId !== WORLD_SCENE_ID\) viewScene\(WORLD_SCENE_ID\);\n  selectSubsectorSystem\(contract\.destination\.systemId\);\n  playProcedureAction\('jobs'\);/);
  assert.match(app, /if \(intent === 'contract'\) \{ showContractOnMap\(argument\); return; \}/);
  assert.match(app, /const objectives = new Set\(activeContracts\(\)\.map\(\(entry\) => entry\.destination\.systemId\)\);/);
  assert.match(svg, /if \(objectives\.has\?\.\(system\.id\)\) group\.classList\.add\('objective'\);/);
  // The objective mark and the destination ring must not read as one thing.
  assert.match(css, /\.subsector-hex\.objective \.subsector-hex-shape \{/);
});

test('v0.103.0 crew can be assigned and released, which nothing could do before', async () => {
  const app = await read('app.js');
  const html = await read('index.html');
  assert.match(html, /id="crew-dialog"/);
  assert.match(html, /id="live-ship-crew"/);
  assert.match(app, /shipDocument = assignShipCrew\(shipDocument, \{ role, characterId: id, characterName: person\.name \}\);/);
  assert.match(app, /shipDocument = releaseShipCrew\(shipDocument, characterId\);/);
  // Candidates are party characters and rolled NPCs. v0.131.1: minus anyone at
  // the Book 2 p.17 ceiling of two posts, not anyone holding one — the
  // one person/one role ruling this pin was written for was replaced in
  // v1.186.00, and until now the scout's owner-pilot could not be offered the
  // steward's post that only he could fill.
  assert.match(app, /\.filter\(\(entry\) => \(rolesHeld\.get\(entry\.id\)\?\.length \?\? 0\) < MAXIMUM_ROLES_PER_CREW_MEMBER\)/);
  assert.match(app, /would double up/);
  assert.match(app, /if \(intent === 'crew'\) \{ setFlyout\('crew'\); return; \}/);
});

test('v0.104.0 a job can be given up, the jump card departs, and passengers fill the berths', async () => {
  const app = await read('app.js');
  const ui = await read('ui-model.js');
  // An accepted contract had no exit at all: it sat in the tracker with its
  // clock running whether or not the crew still intended to do it.
  assert.match(ui, /actionLabel: '\[ ABANDON \]'/);
  assert.match(app, /function abandonContract\(contractId\)/);
  assert.match(app, /failContractDocument\(contract, \{ date: campaignDateSnapshot\(\), notes: 'Abandoned by the crew\.' \}\)/);
  // The jump card focused the depart button instead of pressing it.
  assert.match(app, /if \(action === 'jump'\) \{ jumpToSelectedSystem\(\); return; \}/);
  assert.doesNotMatch(app, /jumpActions\.querySelector\('button:not\(:disabled\)'\)\?\.focus\(\)/);
  // One press books every berth it can, and the verb says so.
  assert.match(app, /function bookRoutePassengers\(passageClass\)/);
  assert.match(app, /const count = Math\.max\(1, Math\.min\(waiting, berths\)\);/);
  assert.match(ui, /verb: `\[ BOOK \$\{takes\} \/ CR\$\{\(takes \* entry\.fareCr\)\.toLocaleString\('en-US'\)\} \]`/);
});

test('v0.104.0 every dock intent the model emits has a handler that does something visible', async () => {
  const app = await read('app.js');
  const ui = await read('ui-model.js');
  const emitted = new Set([...ui.matchAll(/action: [`']([a-z]+)(?::|`|')/g)].map((match) => match[1]));
  const dispatcher = app.slice(app.indexOf('function playProcedureAction(action)'));
  const body = dispatcher.slice(0, dispatcher.indexOf('\n}\n'));
  for (const intent of emitted) {
    assert.ok(
      body.includes(`intent === '${intent}'`) || body.includes(`action === '${intent}'`) || body.includes(`${intent}: el.`),
      `the dock emits '${intent}' but playProcedureAction has no branch for it`
    );
  }
  // Three cards in a row shipped as no-ops because their handler predated a
  // layout change; a branch that only sets a desk tab is the tell.
  assert.doesNotMatch(body, /if \(action === '(encounter|jump)'\) \{ setOperationsDeskTab\([^)]*\); return; \}/);
});

test('v0.105.0 Book 3 animal encounters reach play: check, generate, react, fight', async () => {
  const app = await read('app.js');
  const html = await read('index.html');
  assert.match(html, /id="animal-dialog"/);
  assert.match(html, /id="animal-terrain"/);
  // Book 3 p.26's one-third check, then the p.25 encounter column — which can
  // give an event rather than an animal.
  assert.match(app, /if \(!checkForAnimalEncounter\(dice\)\) \{/);
  assert.match(app, /const category = animalCategoryForThrow\(dice\.rollD6\(\) \+ dice\.rollD6\(\)\);/);
  assert.match(app, /if \(category === 'event'\)/);
  // Planet size feeds the size throw (Book 3 p.32).
  assert.match(app, /generateAnimalEncounter\(dice, \{ category, terrain, planetSize: profile\.size \}\)/);
  // A fight only offers itself when the animal actually attacks.
  assert.match(app, /el\.animalFight\.hidden = reaction\.action !== 'attack';/);
  // Book 3 encounters are in open terrain, so they use Book 1's range line.
  assert.match(app, /spatialMode: 'range-line',/);
  assert.match(app, /pouncerAnimals: animal\.type === 'pouncer'/);
});

test('v0.106.0 an intent id is split once, so a colon-bearing argument survives', async () => {
  const app = await read('app.js');
  // A speculative cargo id is <shipId>:spec:<systemId>:<code>:<n>. Splitting
  // the whole string truncated it to the ship id, so [ SELL ] and [ DECLINE ]
  // looked up a lot that did not exist and failed with nothing on screen.
  assert.match(app, /function splitIntent\(value\) \{/);
  assert.match(app, /return separator === -1 \? \[text, ''\] : \[text\.slice\(0, separator\), text\.slice\(separator \+ 1\)\];/);
  // No dispatcher may go back to the naive form.
  assert.doesNotMatch(app, /const \[[a-zA-Z]+, [a-zA-Z]+\] = String\((?:id|action)\)\.split\(':'\)/);
  const uses = app.match(/= splitIntent\((?:id|action)\)/g) ?? [];
  assert.ok(uses.length >= 3, `expected every intent dispatcher to use splitIntent, found ${uses.length}`);
});

test('v0.106.0 the ship reads above the map, and a fight hides it (superseded: v0.192.1 puts it in the right column)', async () => {
  const app = await read('app.js');
  const html = await read('index.html');
  const css = await read('styles.css');
  // v0.106.1: INSIDE the map section, which is a flex column at height 100%.
  // As a sibling it had no flow space and the section drew over it.
  // v0.192.1: the ship strip sits in the right column under the character,
  // above the tabbed body; the map has the whole stage.
  const sidebar = html.slice(html.indexOf('id="sidebar"'), html.indexOf('class="sidebar-body"'));
  assert.ok(sidebar.includes('id="ship-strip"'));
  assert.ok(sidebar.indexOf('id="sidebar-character"') < sidebar.indexOf('id="ship-strip"'));
  const section = html.slice(html.indexOf('id="subsector-section"'), html.indexOf('id="encounter-section"'));
  assert.ok(!section.includes('id="ship-strip"'));
  assert.match(app, /const show = Boolean\(shipDocument\) && campaignPlayActive\(\);/);
  // The four things the trade and booking decisions turn on.
  for (const label of ['FUEL', 'CARGO', 'PASSENGERS', 'CREW']) {
    assert.ok(app.includes(`['${label}'`), `the strip states ${label}`);
  }
  // Cargo names what is aboard: a tonnage alone does not say the firearms are
  // still there.
  assert.match(app, /manifest\.map\(\(entry\) => `\$\{entry\.tons\}t \$\{entry\.description\}`\)/);
  assert.match(css, /\.ship-strip \{ border-bottom: 1px solid var\(--rule\);/);
});

test('v0.107.0 every jump block names a remedy where one exists', async () => {
  const app = await read('app.js');
  // Eight things can refuse a jump; the card used to offer [ MAP ] for all of
  // them, which addresses none.
  assert.match(app, /jumpBlockAction = \{ action: 'berthing:pay', verb: '\[ PAY BERTHING \]' \};/);
  assert.match(app, /jumpBlockAction = fuelService\?\.available \? \{ action: 'fuel:buy'/);
  assert.match(app, /jumpBlockAction = \{ action: 'jobs', verb: '\[ CONTRACT BOARD \]' \};/);
  assert.match(app, /jumpBlockAction = \{ action: 'situation', verb: '\[ SITUATION \]' \};/);
  assert.match(app, /jumpBlockAction = \{ action: 'encounter', verb: '\[ COMBAT \]' \};/);
  // An exclusive charter is the one block with no obvious exit, so the reason
  // states both ways out.
  assert.match(app, /Deliver it, or abandon it on the contract board\./);
});

test('v0.108.0 the strip states what the ship owes each month', async () => {
  const app = await read('app.js');
  // Book 2 pp.6-7. Nothing charged crew, maintenance or a mortgage before
  // rules 0.29.0, so a ship account could only ever grow.
  assert.match(app, /const payroll = calculateMonthlyCrewSalaries\(shipDocument, \{ unpaid: ownerAboardIds\(\) \}\);/);
  assert.match(app, /const upkeep = payroll\.totalCr \+ Math\.round\(annualMaintenanceCr\(shipDocument\) \/ 12\);/);
  // A reserve scout is not mortgaged — the Scout service keeps title.
  assert.match(app, /shipDocument\.authority\?\.characterOwnsShip \? shipMortgage\(shipDocument\)\.monthlyPaymentCr : 0/);
  // Book 2 p.6: an owner-aboard draws from profits, not payroll.
  assert.match(app, /function ownerAboardIds\(\)/);
  assert.ok(app.includes("['UPKEEP',"), 'the strip has an upkeep cell');
});

test('v0.109.0 a stale vendored rules package reports itself instead of a bare SyntaxError', async () => {
  const html = await read('index.html');
  const boot = await read('boot.mjs');
  // A static import of app.js cannot be caught: the whole module graph is
  // resolved before any code runs. The rules package has to be imported
  // dynamically, and app.js only after it resolves.
  assert.match(html, /<script type="module" src="\.\/boot\.mjs\?v=v[\d.]+"><\/script>/);
  assert.doesNotMatch(html, /<script type="module" src="\.\/app\.js"><\/script>/);
  assert.match(boot, /await import\(RULES\);\n  await import\(`\.\/app\.js\?v=\$\{CLIENT_VERSION\}`\);/);
  assert.match(boot, /node scripts\/sync-vendor\.mjs/);
  // Only the missing-export signature is treated as a sync problem; a real
  // fault in the client must still surface as itself.
  assert.match(boot, /if \(\/does not provide an export named\/\.test\(message\)\)/);
  assert.match(boot, /\} else \{\n    throw error;\n  \}/);
});

test('v0.110.1 the chat feed opens at the newest message, not the oldest', async () => {
  const app = await read('app.js');
  // The feed is rebuilt while the drawer is collapsed, where it has no height:
  // scrollHeight is 0, so pinning to the bottom does nothing and opening CHAT
  // showed the oldest entry.
  assert.match(app, /function scrollActivityToLatest\(\) \{/);
  assert.match(app, /if \(feed\.clientHeight === 0\) requestAnimationFrame\(apply\);/);
  assert.match(app, /if \(panel\.dataset\.sidebarPanel === 'chat' && !panel\.hidden\) scrollActivityToLatest\(\);/);
  // Nothing sets scrollTop by hand any more.
  assert.doesNotMatch(app, /el\.activityFeed\.scrollTop = activityOrder/);
});

test('v0.110.1 a freight shipment has no category to read', async () => {
  const app = await read('app.js');
  const ui = await read('ui-model.js');
  // Book 2 p.7 shipments carry no category; reading one threw the moment a
  // shipment fitted a hold.
  assert.doesNotMatch(app, /freight\.category|offer\.category/);
  assert.doesNotMatch(ui, /lot\.category/);
  // A hold too small for any shipment says so, with the smallest on offer.
  assert.match(app, /NONE FIT/);
  assert.match(ui, /a shipment cannot be split \(Book 2 p\.7\)/);
});

test('v0.110.2 speculation and freight are named as the different mechanics they are', async () => {
  const app = await read('app.js');
  const ui = await read('ui-model.js');
  // Book 2 p.42 speculation is bought to resell and costs money up front;
  // Book 2 p.7 freight is carried for hire and costs nothing. A log line
  // reading "bought 3t Ammunition" was indistinguishable from freight.
  assert.match(app, /bought a speculative lot: \$\{quantity\}t/);
  assert.match(app, /partial-lot handling \(Book 2 p\.42\)/);
  assert.match(ui, /Speculative lot \(bought to resell\)/);
  assert.match(ui, /Carried for hire: nothing to pay/);
});

test('v0.111.0 the ship strip reads the right identity fields and spells its labels out', async () => {
  const app = await read('app.js');
  // identity carries `registry`, not `registration`, and the design name is on
  // the document rather than inside specifications — both read undefined, so
  // the strip showed "MARISOL / ·" with no registry and no ship type.
  assert.match(app, /shipDocument\.identity\.registry \|\| ''/);
  assert.match(app, /shipDocument\.design\?\.name \?\? ''/);
  assert.doesNotMatch(app, /identity\.registration/);
  // No abbreviations in the cell detail.
  assert.match(app, /crew salaries/);
  assert.match(app, /\$\{formatCr\(maintenanceMonthlyCr\)\} maintenance/);
  assert.doesNotMatch(app, /\} maint\$\{/);
  // The cells state capacities and what is left, not bare counts.
  assert.match(app, /\$\{capacity - used\}t free/);
  assert.match(app, /berth\$\{berths === 1 \? '' : 's'\} free of/);
  assert.ok(app.includes("['DRIVE',"), 'the strip states the jump rating');
});

test('v0.111.0 the chosen sidebar tab survives a reload', async () => {
  const app = await read('app.js');
  assert.match(app, /const SIDEBAR_TAB_STORAGE_KEY = 'graycloak\.traveller\.sidebar-tab\.v1';/);
  assert.match(app, /window\.localStorage\.setItem\(SIDEBAR_TAB_STORAGE_KEY, tab\)/);
  // Both the tab list and the key must be declared before the restore runs:
  // const is not hoisted into a usable state, and reading either early throws
  // at module load and takes the whole page with it.
  const tabs = app.indexOf('const SIDEBAR_TABS =');
  const key = app.indexOf('const SIDEBAR_TAB_STORAGE_KEY');
  const restore = app.indexOf('const storedTab');
  assert.ok(tabs < key && key < restore, 'restore must follow both declarations');
});

test('v0.112.0 credits move both ways between character and ship', async () => {
  const app = await read('app.js');
  assert.match(app, /function withdrawFundsFromShip\(\)/);
  assert.match(app, /transferShipCreditsToCharacter\(shipDocument, gameplayDocument, amountCr/);
  assert.match(app, /makePortButton\('WITHDRAW TO CHARACTER', withdrawFundsFromShip/);
  // The sell card carries the cost basis the manifest already stored.
  assert.match(app, /speculativeLotPosition\(shipDocument, cargo\.id, \{ proceedsCr: quote\.netCr \}\)/);
});

test('v0.113.0 a refused action is visible and the cards do not offer it', async () => {
  const app = await read('app.js');
  const ui = await read('ui-model.js');
  const css = await read('styles.css');
  // An exclusive charter refuses every booking and purchase; the dock used to
  // show READY passenger cards that failed on the press.
  assert.match(app, /commerceBlockReason: activeExclusiveContract\(\)/);
  assert.match(ui, /if \(s\.freight && !s\.commerceBlockReason\)/);
  assert.match(ui, /if \(s\.passengers && !s\.commerceBlockReason\)/);
  assert.match(ui, /if \(s\.speculation && !s\.commerceBlockReason\)/);
  assert.match(ui, /card\('commerce-blocked', 'Commercial trade is committed'/);
  // The error itself carries a band and is announced, not muted text.
  assert.match(css, /\.status\.error \{\n  max-width: 72ch;/);
  assert.match(app, /el\.status\.setAttribute\('role', kind === 'error' \? 'alert' : 'status'\)/);
});

test('v0.114.0 upkeep is charged against the clock and the strip states what is owed', async () => {
  const app = await read('app.js');
  // Book 2 pp.6-7, charged on arrival: that is when the ship is somewhere it
  // can settle accounts.
  assert.match(app, /const upkeep = chargeShipUpkeep\(nextShip, \{/);
  assert.match(app, /sinceLabel: shipLiabilityStartLabel\(\)/);
  assert.match(app, /unpaid: ownerAboardIds\(\)/);
  // Liability starts with the account, not with the campaign.
  assert.match(app, /function shipLiabilityStartLabel\(\)/);
  // Arrears are reported rather than hidden, both in the log and the strip.
  assert.match(app, /Upkeep outstanding: \$\{formatCr\(upkeep\.outstandingCr\)\}/);
  assert.match(app, /outstandingCr > 0 \? `\$\{formatCr\(outstandingCr\)\} owed now`/);
});

test('v0.114.1 sync-vendor can link instead of copy, so vendor cannot go stale locally', async () => {
  const script = await readFile(new URL('../scripts/sync-vendor.mjs', import.meta.url), 'utf8');
  // The copy goes stale whenever packages/ changes under a running server,
  // which is how every missing-export failure in this run happened.
  assert.match(script, /const link = process\.argv\.includes\('--link'\);/);
  assert.match(script, /await symlink\(source, target, 'junction'\)/);
  // The copy stays the default: a link does not survive packaging, and the
  // Pages build has no packages/ directory above it.
  assert.match(script, /for \(const entry of \['index\.js', 'package\.json', 'src'\]\)/);
});

test('v0.115.0 state tags read as a traffic light; kind tags stay neutral', async () => {
  const css = await read('styles.css');
  const ui = await read('ui-model.js');
  // Red stop, amber get ready, green go — the state axis only.
  // v0.191.0: the reds and ambers are tokens with a value per theme.
  assert.match(css, /\.procedure-card\.blocked \.procedure-card-tag \{ color: var\(--loss\); \}/);
  assert.match(css, /\.procedure-card\.required \.procedure-card-tag \{ color: var\(--required-ink\); \}/);
  assert.match(css, /--loss: #8c3b30;/);
  assert.match(css, /--required-ink: #6b5f1f;/);
  assert.match(css, /\.procedure-card\.ready \.procedure-card-tag \{ color: var\(--ok\); \}/);
  // BLOCKED must not borrow the error red: a card that is merely unavailable
  // should not read like an action that just failed.
  assert.doesNotMatch(css, /\.procedure-card\.blocked \.procedure-card-tag \{ color: var\(--error\)/);
  // The group label no longer collides with the card state of the same name.
  assert.match(ui, /label: attention\.length \? 'THEN' : 'NEXT'/);
  assert.doesNotMatch(ui, /label: attention\.length \? 'THEN' : 'READY'/);
});

test('v0.116.0 the ship keeps books, split into voyages, and says what it can spare', async () => {
  const app = await read('app.js');
  const html = await read('index.html');
  // The ledger has recorded every transaction since it was written; nothing
  // read it back until now.
  assert.match(html, /id="ship-ledger"/);
  assert.match(app, /function renderShipLedger\(\)/);
  assert.match(app, /summariseShipVoyages\(shipDocument, \{ limit: 4 \}\)/);
  // A leg states its net, and the current one opens by default.
  assert.match(app, /group\.open = voyage\.open;/);
  // The withdrawal is bounded by what the leg made, less upkeep owed — an
  // owner-aboard draws from the profits, not from unpaid wages.
  assert.match(app, /function currentDistributableCr\(\)/);
  assert.match(app, /shipDistributableCr\(shipDocument, \{ outstandingUpkeepCr: currentUpkeepDue\(\)\?\.totalDueCr \?\? 0 \}\)/);
  assert.match(app, /THIS LEG CAN SPARE/);
});

test('v0.116.1 the books do not cost anything to not look at', async () => {
  const app = await read('app.js');
  // shipUpkeepDue validates the ship document three times over, and validation
  // deep-compares the whole specification against the canonical design. It was
  // called twice per render.
  assert.match(app, /let upkeepCache = \{ ship: null, date: null, value: null \};/);
  assert.match(app, /if \(upkeepCache\.ship === shipDocument && upkeepCache\.date === date\) return upkeepCache\.value;/);
  // The sidebar renders whether or not it is visible; a node per ledger entry
  // for a hidden panel is pure cost, and the ledger only grows.
  assert.match(app, /if \(el\.shipLedger\.closest\('\[data-sidebar-panel\]'\)\?\.hidden\) return;/);
  assert.match(app, /if \(panel\.dataset\.sidebarPanel === 'vehicles' && !panel\.hidden\) renderShipLedger\(\);/);
  assert.match(app, /const LEDGER_ENTRIES_PER_VOYAGE = 12;/);
});

test('v0.117.0 the tool rail no longer costs a column it does not occupy (geometry superseded by the v0.192.0 grid shell; deleted v0.198.0)', async () => {
  const css = await read('styles.css');
  // The rail has floated over the canvas since v0.80.0, but the stage kept
  // padding 96px for it and the dock began after that — so it cost its width
  // twice.
  assert.doesNotMatch(css, /\.terminal\.shell:not\(\.dock-collapsed\) \.shell-stage \{ padding-left: 300px; \}/); // deleted v0.198.0: grid shell
  assert.doesNotMatch(css, /\.terminal\.shell \.shell-dock \{ left: 0; \}/); // deleted v0.198.0: grid shell
  // The rail clears the dock rather than sitting under it.
  // Just below the map header, at a measured offset rather than a constant:
  // the ship strip and the header above it both change height, and every
  // hand-tuned offset in this shell has needed correcting.
  assert.match(css, /top: var\(--rail-top, 160px\); bottom: auto;/);
  const app = await read('app.js');
  assert.match(app, /function positionToolRail\(\)/);
  // Written on the shell, not the stage: the rail is the stage's sibling and
  // custom properties inherit down, not across.
  assert.match(app, /map\.getBoundingClientRect\(\)\.top - shell\.getBoundingClientRect\(\)\.top/);
  assert.match(app, /shell\.style\.setProperty\('--rail-top'/);
  assert.doesNotMatch(app, /stage\.style\.setProperty\('--rail-top'/);
  assert.match(app, /window\.addEventListener\('resize', positionToolRail\)/);
  assert.doesNotMatch(css, /\.terminal\.shell\.dock-collapsed \.shell-rail \{ left: 8px; \}/); // deleted v0.198.0: grid shell
  // Everything else pinned to the old 96px offset moves with it.
  assert.doesNotMatch(css, /\.terminal\.shell:not\(\.dock-collapsed\) \.scene-nav \{ left: 352px; \}/); // deleted v0.198.0: grid shell
  assert.doesNotMatch(css, /\.terminal\.shell\.dock-collapsed \.dock-reopen \{ left: 8px; top: 40px; \}/); // deleted v0.198.0: grid shell
});

test('v0.118.0 a dock card unfolds its panel beside the dock, pushing the map (geometry superseded by the v0.192.0 grid shell; deleted v0.198.0)', async () => {
  const app = await read('app.js');
  const css = await read('styles.css');
  const html = await read('index.html');
  assert.match(html, /id="dock-flyout"/);
  // A sibling column, not an overlay: the stage's padding grows by its width,
  // so the hexes shift right rather than being covered (the v0.80.2 ruling).
  assert.doesNotMatch(css, /\.terminal\.shell\.flyout-open \.shell-stage \{ padding-left: 560px; \}/); // deleted v0.198.0: grid shell
  assert.doesNotMatch(css, /\.terminal\.shell\.flyout-open \.shell-rail \{ left: 568px; \}/); // deleted v0.198.0: grid shell
  // One at a time — a second flyout would be a second dock.
  assert.match(app, /openFlyout = openFlyout === key \? null : key;/);
  // One board, two homes: the sidebar panel and the flyout share a model.
  assert.match(app, /function renderContractBoardInto\(target\)/);
  assert.match(app, /contractBoardModel = buildContractBoardPanel/);
  // The stage moved, so the measured rail offset is stale.
  assert.match(app, /requestAnimationFrame\(positionToolRail\);/);
  // Below 1100px the map has nothing left to give, so the flyout takes the
  // stage rather than squeezing the hexes into a strip.
  assert.doesNotMatch(css, /width: calc\(100vw - 240px - 52px\);/); // deleted v0.198.0: grid shell
});

test('v0.119.0 trade and crew unfold beside the dock rather than opening the drawer', async () => {
  const app = await read('app.js');
  // Trade shares its model with the sidebar panel, as the contract board does.
  assert.match(app, /function renderCommerceBoardInto\(target\)/);
  assert.match(app, /commerceBoardModel = \{ groups \};/);
  // Crew is built for the flyout: the sidebar copy is live elements with their
  // own buttons, not a panel model that can be rendered twice.
  assert.match(app, /function renderCrewBoardInto\(target\)/);
  assert.match(app, /Book 1 p\.19: any character may hold a position/);
  // v1.186.00 replaced the one-role ruling with Book 2 p.17's doubling, and
  // both crew notes say so.
  assert.match(app, /one person may fill two positions/);
  // Three flyouts registered, one open at a time.
  for (const key of ['jobs:', 'trade:', 'crew:']) assert.ok(app.includes(`    ${key}`), `${key} flyout registered`);
});

test('v0.121.0 a ship encounter is thrown on arrival, modified by the starport', async () => {
  const app = await read('app.js');
  // Book 2 p.36: thrown when a ship enters a system, with the primary world's
  // starport as the modifier — a class A port is busy, an X-class port throws
  // 2D-4 and can never reach the table at all.
  assert.match(app, /rollArrivalShipEncounter\(destination, destinationProfile\);/);
  assert.match(app, /rollShipEncounter\(dice, \{ starport: profile\.starport \}\)/);
  // Only the pirate is hostile by default; everything else takes a Book 3
  // reaction, because a patrol may be a picket or may be a form of pirate.
  assert.match(app, /const reaction = rollReaction\(dice\);/);
  assert.match(app, /encounter\.hostileByDefault \? ' \/ HOSTILE' : ''/);
  // A patrol or pirate names the hull it turned out to be.
  assert.match(app, /encounter\.hull \? ` \/ \$\{encounter\.hull\.label\}` : ''/);
});

test('v0.122.0 the ship panel arms turrets and buys ordnance', async () => {
  const app = await read('app.js');
  const html = await read('index.html');
  // Book 2 p.16: standard designs are delivered with empty turrets, so the
  // ship the campaign flies cannot fire until something is fitted here.
  assert.match(html, /id="live-ship-armament"/);
  assert.match(html, /id="fit-armament"/);
  assert.match(html, /id="armament-dialog"/);
  assert.match(app, /function renderShipArmament\(\)/);
  assert.match(app, /armShipTurret\(shipDocument, \{ turretId, weapon/);
  assert.match(app, /purchaseOrdnance\(shipDocument, \{ missiles, sandCanisters/);
  // The status block says plainly that an unarmed ship cannot fight, beside
  // fuel and cargo rather than buried in a panel.
  assert.match(app, /appendLiveShipRow\('ARMAMENT'/);
  assert.match(app, /This ship cannot fire/);
  // Book 2 p.17: one gunner per turret mounted.
  assert.match(app, /GUNNER\(S\) REQUIRED/);
});

test('v0.123.0 ship combat runs Book 2 phases in the rail', async () => {
  const app = await read('app.js');
  const html = await read('index.html');
  // A separate rail section: a Book 2 game turn is nothing like a Book 1 round.
  assert.match(html, /id="ship-combat-rail-section"/);
  assert.match(html, /id="ship-combat-tracker"/);
  assert.match(app, /function renderShipCombatRail\(\)/);
  // Phase C belongs to the side that is NOT acting, and the rail says whose is
  // whose rather than leaving the player to work it out.
  // v0.190.0: the mockup's lead line names the live phase and who acts in it.
  assert.match(app, /\\u00b7 ACTING \$\{acting === 'intruder' \? 'INT' : 'NAT'\}/);
  assert.match(app, /Phase C belongs to the side that is not acting/);
  // Book 2 p.23 phase A moves ordnance launched in previous game turns.
  assert.match(app, /moveOrdnance\(shipCombatEncounter\)/);
  // p.29: allocation is locked before anything fires.
  assert.match(app, /allocateLaserFire\(shipCombatEncounter, allocations\)/);
  // p.37 leaves the escape count to the referee; no formula is offered.
  assert.match(app, /how many shots may be made before the ship is out of range/);
  // The arrival encounter can now be engaged rather than only logged.
  assert.match(app, /function engagePendingShipEncounter\(\)/);
  assert.match(app, /ENGAGE \/ \$\{pendingShipEncounter\.encounter\.label\.toUpperCase\(\)\}/);
});

test('v0.124.0 the registry writes a batch in one pass', async () => {
  const registrySource = await readFile(new URL('../src/document-registry.js', import.meta.url), 'utf8');
  const app = await read('app.js');
  // put() parses and reserializes the whole registry, so a persist pass has to
  // do that once rather than once per document.
  assert.match(registrySource, /function putAll\(documents\)/);
  assert.match(registrySource, /function put\(document\) \{\n    return putAll\(\[document\]\)\[0\];/);
  // resolveCampaign reads one snapshot instead of calling get() per reference.
  assert.match(registrySource, /const snapshot = readState\(\)\.documents;/);
  assert.ok(!/const document = get\(ref\.id\);/.test(registrySource), 'resolveCampaign still parses per reference');
  // The hot call site, reached after almost every action including a token drop.
  assert.match(app, /registry\.putAll\(\[/);
  assert.ok(!/for \(const partyCharacter of currentPartyCharacters\(\)\) registry\.put\(/.test(app));
});

test('v0.125.0 the armament dialog separates the two purchases', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');
  // Two purchases, two groups, each owning its own button. The first version
  // put [ FIT ] above the ORDNANCE rule and [ BUY ] at the foot, so [ BUY ]
  // read as the dialog's confirm and buying a laser raised "nothing to
  // purchase".
  assert.match(html, /<legend>WEAPON<\/legend>/);
  assert.match(html, /<legend>ORDNANCE<\/legend>/);
  assert.match(html, /\[ BUY \+ FIT WEAPON \]/);
  assert.match(html, /\[ BUY ORDNANCE \]/);
  assert.match(css, /\.armament-group \{/);
  // Nothing ordered is not an error worth raising.
  assert.match(app, /function syncOrdnanceButton\(\)/);
  assert.match(app, /el\.armamentOrdnanceGroup\.disabled = !canLoad;/);
  assert.match(app, /armamentMissiles\?\.addEventListener\('input', syncOrdnanceButton\)/);
});

test('v0.126.0 no client source reads a ship state field the document does not have', async () => {
  const { readdir } = await import('node:fs/promises');
  // The ship strip read state.passengers for several versions. That field does
  // not exist — the manifest is state.passengerManifest — and `?? []` turned a
  // wrong name into a permanent zero rather than an error. The v0.111.0 note in
  // renderShipStrip records the same failure with `registration`.
  //
  // These are the state fields the ship document actually carries, so anything
  // else read off state is a typo that will fail silently.
  const shipStateFields = new Set([
    'operationalStatus', 'currentFuelTons', 'fuelQuality', 'cargoUsedTons',
    'cargoManifest', 'passengerManifest', 'finances', 'portCall', 'maintenance',
    'armament', 'damage'
  ]);
  const offenders = [];
  for (const dir of ['client', 'src']) {
    for (const file of await readdir(new URL(`../${dir}/`, import.meta.url))) {
      if (!file.endsWith('.js') && !file.endsWith('.mjs')) continue;
      const text = await readFile(new URL(`../${dir}/${file}`, import.meta.url), 'utf8');
      // Only shipDocument.state.X, which is unambiguously the ship document.
      for (const match of text.matchAll(/shipDocument\??\.state\??\.([A-Za-z][A-Za-z0-9]*)/g)) {
        if (!shipStateFields.has(match[1])) offenders.push(`${dir}/${file}: state.${match[1]}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `unknown ship state fields read: ${offenders.join(', ')}`);
});

test('v0.126.0 the ship strip counts the passengers actually aboard', async () => {
  const app = await read('app.js');
  assert.match(app, /const passengerManifest = shipDocument\.state\.passengerManifest \?\? \[\];/);
  // Cabin and low are separate capacities in Book 2, so the detail says which.
  assert.match(app, /cabinPassengers\.length \? `\$\{cabinPassengers\.length\} in staterooms`/);
  assert.match(app, /lowPassengers\.length \? `\$\{lowPassengers\.length\} in low berths`/);
});

test('v0.127.0 a change the player made reaches the campaign home, not just the cache', async () => {
  const app = await read('app.js');
  // "The browser registry is a cache; Firestore is where the campaign lives."
  // persistGameplayDocuments writes only the cache: it does not markAutosaved
  // and does not scheduleCampaignHomeSave, so a handler that calls it alone
  // loses its change on the next reload — unless some later action happens to
  // call persistCampaignState, which is why buying a laser appeared to persist
  // and removing one did not.
  //
  // Only these may call persistGameplayDocuments directly:
  //   persistCampaignState   — it is the one that adds the home save
  //   saveCampaignHomeNow    — it IS the home save; scheduling one would recurse
  //   saveCampaignLocal      — deliberately this browser only
  //   exportCampaignPortable — writes a file, saves nothing
  //   newCampaign            — runs before the campaign document exists
  //   assignScoutShip        — same
  const allowed = new Set([
    'persistCampaignState', 'saveCampaignHomeNow', 'saveCampaignLocal',
    'exportCampaignPortable', 'newCampaign', 'assignScoutShip'
  ]);
  const offenders = [];
  let fn = null;
  for (const [index, line] of app.split('\n').entries()) {
    const declaration = /^(?:async )?function ([A-Za-z0-9_]+)\(/.exec(line);
    if (declaration) fn = declaration[1];
    if (!/\bpersistGameplayDocuments\(/.test(line)) continue;
    if (/^\s*(\/\/|\*)/.test(line)) continue;          // a comment mentioning it
    if (/function persistGameplayDocuments/.test(line)) continue;
    if (!allowed.has(fn)) offenders.push(`${fn} (line ${index + 1})`);
  }
  assert.deepEqual(offenders, [], `these persist only the cache: ${offenders.join(', ')}`);
});

test('v0.128.0 ship and world sit side by side above the map', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');
  const model = await readFile(new URL('../client/ui-model.js', import.meta.url), 'utf8');

  // Two columns in the strip, ship left and world right.
  assert.match(html, /class="nav-strip"/);
  assert.match(html, /id="world-strip-cells"/);
  assert.match(html, /id="world-view-current"/);
  assert.match(html, /id="world-view-selected"/);
  assert.match(css, /\.nav-strip \{/);

  // One model for the world half, so the strip is not a fourth renderer
  // parsing the same UWP.
  assert.match(model, /export function buildWorldStripModel/);
  assert.match(app, /buildWorldStripModel\(\{ system: showing, ship: shipDocument, role \}\)/);

  // The DRIVE cell read the rating the ship was BUILT with, so a destroyed
  // jump drive still said "Jump-2".
  assert.match(app, /const jumpDrive = currentDriveState\(shipDocument, 'jumpDrive'\);/);
  assert.ok(!/const jump = shipDocument\.specifications\.drives\?\.jump\?\.rating;/.test(app));
  // The strip predated v1.190.00 and said nothing about armament.
  assert.match(app, /\['ARMAMENT', turrets\.length === 0/);

  // The route carries the traffic-light state: co-location only helps if a
  // mismatch between fuel and distance is visible.
  assert.match(app, /route\.classList\.add\('live-state-ready'\);/);
  assert.match(app, /route\.classList\.add\(obtainable \? 'live-state-attention' : 'live-state-critical'\);/);
});

test('v0.129.0 the jump action sits under its own readout and the top band is gone', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const model = await readFile(new URL('../client/ui-model.js', import.meta.url), 'utf8');

  // The jump action follows the line that states the whole decision: distance,
  // fuel needed against fuel aboard, verdict. The container is MOVED, not
  // rebuilt, so every blocked reason it renders comes with it — berthing due,
  // cargo bound elsewhere, a charter in progress, life support unaffordable.
  // v0.192.1: the world column is in the right column's ship strip now.
  const world = html.slice(html.indexOf('nav-strip-world'), html.indexOf('class="sidebar-body"'));
  assert.match(world, /id="world-strip-route"[\s\S]*id="jump-actions"/);
  assert.match(app, /button\.textContent = `\[ JUMP TO \$\{selected\.name\.toUpperCase\(\)\} \]`;/);

  // An emptied band would still render a row and reclaim nothing.
  assert.match(app, /const stripHasVisibleContent = \[\.\.\.el\.sceneStatusStrip\.children\]\.some/);

  // PORT SERVICES is actions; the strip states the world. Two renderers of the
  // same UWP had already drifted apart. Scoped to the port panel's own body —
  // the strip model legitimately carries a UWP row of its own.
  const portPanel = model.slice(
    model.indexOf('export function buildPortServicesPanel'),
    model.indexOf('export function buildContractBoardPanel')
  );
  assert.ok(portPanel.length > 0, 'buildPortServicesPanel not found');
  assert.ok(!/panelRow\('UWP'/.test(portPanel), 'port panel still repeats the UWP');
  assert.ok(!/panelRow\('STARPORT'/.test(portPanel), 'port panel still describes the starport');
  assert.ok(!/panelRow\('HOLD'/.test(portPanel), 'port panel still repeats the hold');
  assert.match(portPanel, /panelRow\('SERVICE', serviceText/);
});

test('v0.130.0 the scene picker lives in the rail with the other scene controls', async () => {
  const html = await read('index.html');
  const css = await read('styles.css');

  // The subsector map IS a scene — viewedSceneIsBoard() picks between it and a
  // combat board — so the control that chooses belongs with the scene tabs,
  // not in a band above the map.
  const rail = html.slice(html.indexOf('class="shell-rail"'), html.indexOf('class="scene shell-stage"'));
  assert.match(rail, /id="scene-nav"/);
  assert.match(rail, /class="scene-tabs"[\s\S]*id="scene-nav"[\s\S]*id="rail-tools"/);

  // It must sit outside both scene sections: it is how you leave a scene as
  // well as enter one, so inside either it would vanish on the other tab.
  const subsector = html.slice(html.indexOf('id="subsector-section"'), html.indexOf('id="encounter-section"'));
  assert.doesNotMatch(subsector, /id="scene-nav"/);

  // Every id renderSceneNav writes to survives the move.
  for (const id of ['scene-nav-button', 'scene-nav-name', 'scene-nav-active']) {
    assert.match(rail, new RegExp(`id="${id}"`));
  }
  // .scene-nav is position:absolute by default, pinned by left offsets tuned
  // to the dock width — moving the markup alone left it floating over the
  // canvas. The rail copy puts it back in the flow and gives it the 34x38 icon
  // form every other rail control uses.
  assert.match(css, /\.terminal\.shell \.shell-rail \.scene-nav \{[\s\S]*position: static/);
  assert.match(css, /\.terminal\.shell \.shell-rail \.scene-nav-button \{[\s\S]*width: 34px/);
  // The override must come after the absolute-positioning rule it replaces.
  assert.ok(css.lastIndexOf('.scene-nav { position: absolute')
    < css.indexOf('.terminal.shell .shell-rail .scene-nav {'), 'rail override precedes the absolute rule');
  assert.match(html, /class="scene-nav-name tool-label"/);
});

test('v0.130.2 nothing empty draws a band, and the picker sits with the rail tools', async () => {
  const css = await read('styles.css');
  // An author display:flex beats the hidden attribute's UA display:none, so a
  // hidden flex container still draws its padding and border. .scene-nav[hidden]
  // exists for the same reason.
  assert.match(css, /\.scene-status-strip\[hidden\] \{ display: none; \}/);
  // With no destination chosen the jump action renders nothing.
  assert.match(css, /\.jump-actions:empty \{ margin: 0; padding: 0; \}/);
  // The picker is one more control in the rail's two-column grid, not a
  // separated group with a rule above it.
  assert.match(css, /\.terminal\.shell \.shell-rail \.scene-nav \{[\s\S]*border: 0;/);
});

test('v0.131.0 the blocked high passage names the Book 2 p.17 way out', async () => {
  const app = await read('app.js');
  // Book 2 p.16 needs a steward before a high passage sells; p.17 says one
  // person may hold two posts at 75% of each with no expertise DMs. On a Type S
  // with a crew of one that is the only route to carrying a high passenger, so
  // the card names who could take it rather than stopping at "nobody is
  // assigned".
  assert.match(app, /function stewardDoublingCandidates\(\)/);
  assert.match(app, /function stewardDoublingNote\(\)/);
  assert.match(app, /Book 2 p\.17 lets one person hold two posts/);
  // Anyone already holding the ceiling, or already the steward, is not offered.
  assert.match(app, /if \(held\.roles\.length >= MAXIMUM_ROLES_PER_CREW_MEMBER\) continue;/);
  assert.match(app, /if \(held\.roles\.includes\('steward'\)\) continue;/);
  // The cost is computed from the rules package, not written into the string.
  assert.match(app, /crewMemberSalaryCr\(entry\.role\) \* DOUBLED_ROLE_SALARY_RATE/);
});

test('v0.132.0 crew expertise reaches the combat engine and escape counts down', async () => {
  const app = await read('app.js');
  // Setup passed skills: {}, so Gunner Interact added nothing and every
  // Maneuver/Evade program resolved to zero — the whole Book 2 program layer
  // hangs off these numbers.
  assert.match(app, /skills: playerShipSkills\(\),/);
  assert.match(app, /function playerShipSkills\(\)/);
  assert.ok(!/skills: \{\},/.test(app), 'combat setup still passes empty skills');
  // Book 2 p.17: somebody filling two posts applies expertise to neither.
  assert.match(app, /if \(!shipCrewMemberRoles\(shipDocument, characterId\)\.appliesExpertise\) return 0;/);
  // The first gunner was assigned to every turret.
  assert.match(app, /const gunner = assigned\[index\];/);
  // creditShotAgainstEscape was imported and never called, so BREAK OFF
  // recorded a number nothing reduced.
  assert.match(app, /shipCombatEncounter = creditShotAgainstEscape\(shipCombatEncounter, shot\.targetId\);/);
});

test('v0.133.0 a fight in progress survives a reload, and says where it is saved', async () => {
  const app = await read('app.js');
  // Combat lived in a module variable, so a reload lost the phase, the damage,
  // the ordnance in flight and the allocations.
  assert.match(app, /const SHIP_COMBAT_RESUME_STORAGE_KEY = 'graycloak\.traveller\.ship-combat\.v1';/);
  assert.match(app, /function persistShipCombat\(\)/);
  assert.match(app, /function restoreShipCombat\(\)/);
  // Every step that changes the fight saves it, so the resume is never behind
  // what is on screen.
  // v0.172.0: auto-advance runs between the action and the save.
  assert.match(app, /action\(\);\n    autoAdvanceShipCombat\(\);\n    persistShipCombat\(\);/);
  // A fight belongs to the campaign it was fought in.
  assert.match(app, /if \(saved\.campaignId && campaignDocument && saved\.campaignId !== campaignDocument\.identity\.id\) return;/);
  // Closing must not record in-progress as a final outcome.
  assert.match(app, /outcome: 'disengaged'/);
  // Deliberately local, so the panel says so rather than implying a campaign
  // save. v0.149.0: moved into a collapsible, and it names the mode, because in
  // a rail four words wide the prose version was a wall of one-word lines that
  // also claimed ABBREVIATED during a vector fight.
  assert.match(app, /resumes in this browser only/);
  assert.match(app, /const vectorFight = encounter\.spatialMode === 'vector';/);
  // Both house rules are still named, and only where they apply.
  assert.match(app, /\$\{ABBREVIATED_SAND_DM_PER_CANISTER\} per canister rather than per half inch of cloud/);
});

test('v0.134.0 phase E can change the computer, and the CPU choice is the player\'s', async () => {
  const app = await read('app.js');
  // Phase E described itself and offered nothing, so the computer could never
  // be changed mid-fight — which is the whole purpose of Book 2 p.23 phase E.
  assert.match(app, /function reprogramShipCombat\(shipId, programKey, loaded\)/);
  assert.match(app, /load: loaded \? \[\] : \[programKey\],/);
  // Book 2 p.16: the operator holds loadout authority.
  assert.match(app, /actorId: computerOperatorOf\(participant\)/);
  // A program that will not fit is disabled rather than erroring on click.
  // v0.186.0: phase E is the program pills on the ship's own data card
  // (Book 2 p.24), not eight rows over the map.
  assert.match(app, /const wouldOverflow = !loaded && computer\.loadedSpace \+ program\.space > computer\.inComputerCapacity;/);
});

test('v0.135.0 an engagement states its starting conditions instead of assuming them', async () => {
  const app = await read('app.js');
  const html = await read('index.html');
  // Book 2 has no surprise rule, so an ambush is starting conditions: who
  // initiated, and whether the ship was depressurised in time.
  assert.match(html, /id="ship-combat-setup-dialog"/);
  assert.match(html, /id="setup-intruder"/);
  assert.match(html, /id="setup-pressure"/);
  assert.match(app, /function openShipCombatSetup\(\)/);
  // ENGAGE opens setup rather than engaging blind.
  assert.match(app, /openShipCombatSetup\n/);
  // The intruder side is the referee's, with the initiator proposed.
  assert.match(app, /const theyIntrude = el\.setupIntruder \? el\.setupIntruder\.value === 'them'/);
  // Setup passed no occupants at all, so p.35 decompression could never hurt
  // anyone however many hull hits landed.
  assert.match(app, /function playerShipOccupants\(\)/);
  assert.match(app, /pressurisedSections: pressurised \? \[\.\.\.PRESSURE_SECTIONS\] : \[\],/);
  assert.match(app, /occupants: pressurised \? playerShipOccupants\(\) : \{\}/);
  // Book 2 p.35 regulates sections individually; crew sit at their post.
  assert.match(app, /const sectionForRole = \{ pilot: 'bridge'/);
});

test('v0.136.0 the fight ends itself, and an encountered ship has a disposition', async () => {
  const app = await read('app.js');
  // Book 2 p.36 names the encounter type; the behaviour is a Graycloak
  // extension on Book 3 p.29's attack/flee shape.
  assert.match(app, /disposition: encounter\.key === 'pirate' \? 'pirate'/);
  // Combat ends when either side can no longer fire, so the panel says what
  // the fight left instead of offering another phase.
  assert.match(app, /COMBAT OVER \/ DISARMED/);
  assert.match(app, /COMBAT OVER \/ DISABLED/);
  assert.match(app, /if \(status\.toothless && !status\.disabled\) marks\.push\('DISARMED'\);/);
});

test('v0.137.0 a boarding hands off to a Book 1 fight on the range-line board', async () => {
  const app = await read('app.js');
  // Book 2 p.37 names boarding and gives no procedure, so it is a Book 1
  // personal combat — and v0.96.0's range-line mode is already the board for a
  // fight with no scene, which is what a corridor fight is.
  assert.match(app, /function beginBoarding\(boarderShipId, defenderShipId\)/);
  assert.match(app, /spatialMode: 'range-line',/);
  assert.match(app, /range: action\.range,/);
  // Offered only when the engine says the target can no longer fire.
  assert.match(app, /if \(boardingAssessment\(encounter, \{ boarderShipId: attacker\.id, defenderShipId: target\.id \}\)\.allowed\) boarding\.push/);
  // v0.188.0: the verb is the short word BOARD; the target is named in its title.
  assert.match(app, /Board \$\{board\.target\.name\}/);
  // Book 2 p.36's ship's locker: no guns on a non-military vessel.
  assert.match(app, /source\.loadout\?\.weaponKey \?\? SHIPS_LOCKER_DEFAULT_WEAPON/);
  // The notes explain the house rule where the referee can see them.
  assert.match(app, /for \(const note of action\.notes\) logActivity\('COMBAT', note\);/);
});

test('v0.140.0 the character sheet shows weapon benefits and cites the right pages', async () => {
  const view = await readFile(new URL('../client/chargen-view.js', import.meta.url), 'utf8');
  // A weapon benefit stores the chosen weapon as `specialization`, not `name`,
  // so reading entry.name showed NONE YET for a Cutlass that was correctly in
  // the record.
  assert.match(view, /function materialBenefitLabel\(entry\)/);
  assert.match(view, /entry\.specialization \?\? entry\.name/);
  assert.ok(!/materialBenefits\.map\(\(entry\) => entry\.name\)/.test(view), 'benefits still read entry.name');
  // The 1977 printing: acquired skills p.11, prior service p.10, aging p.9,
  // mustering out p.21. It cited p.15, p.14 and p.12.
  assert.match(view, /Acquired Skills[\s\S]{0,80}Book 1 p\.11/);
  assert.match(view, /Prior Service Table \(Book 1 p\.10\)/);
  assert.match(view, /Aging \(Book 1 p\.9\)/);
  assert.ok(!/p\.15\)|p\.12\)/.test(view), 'stale page references remain');
});

test('v0.141.0 the Book 1 tables show while generating, campaign open or not', async () => {
  const app = await read('app.js');
  const html = await read('index.html');
  // Both gates asked campaignPlayActive(), so generating a character inside a
  // campaign — the normal way to add a party member — hid the tables that the
  // sidebar's own placeholder promises show there.
  assert.match(app, /function chargenInProgress\(\)/);
  assert.match(app, /if \(!chargenInProgress\(\)\) \{ el\.chargenTables\.replaceChildren\(\); return; \}/);
  assert.match(app, /el\.chargenTablesSection\.hidden = !chargenInProgress\(\);/);
  // The placeholder steps aside once real tables are there.
  assert.match(app, /el\.rollableTables\.hidden = chargenInProgress\(\)/);
  assert.match(html, /THE BOOK 1 TABLES SHOW HERE DURING CHARACTER GENERATION/);
});

test('v0.142.0 ROLL NPC sits beside NEW NPC and fills the editor', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  // The one place whose job is making an actor, where NEW NPC already is.
  const heading = html.slice(html.indexOf('id="roster-heading"'), html.indexOf('roster-basis'));
  assert.match(heading, /id="roster-roll-actor"/);
  assert.match(heading, /\[ ROLL NPC \]/);
  // Book 1 p.8 generates a hired crewman like anyone else, so the ordinary
  // sequence is driven rather than a separate generator being invented.
  assert.match(app, /function rollNpcActor\(\)/);
  assert.match(app, /generateNpcCharacter\(\{ name: 'Rolled NPC' \}\)/);
  // Nothing is saved until the referee names them: Book 1 p.4's NAMING section
  // is advice, not a table.
  assert.match(app, /el\.npcName\.value = '';/);
  assert.match(app, /el\.npcName\.focus\(\);/);
  // The attrition is reported rather than hidden.
  assert.match(app, /lost in service first/);
  assert.match(app, /rolled\.died/);
});

test('v0.143.0 crew can be hired at a port, by either Book 1 method', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  // Book 1, NON-PLAYER CHARACTERS: generate until one has the skill, or assign
  // it. Both offered, in their own group so neither is mistaken for ASSIGN.
  const group = html.slice(html.indexOf('HIRE AT THIS PORT'), html.indexOf('</dialog>', html.indexOf('HIRE AT THIS PORT')));
  assert.match(group, /id="crew-find-candidate"/);
  assert.match(group, /id="crew-assign-candidate"/);
  assert.match(app, /function hireCrewCandidate\(\{ method \}\)/);
  // A hired crewman becomes an ordinary roster actor, assignable and droppable.
  assert.match(app, /const actor = createNpcActorDocument\(\{/);
  assert.match(app, /campaignDocument = addNpcActorToCampaign\(campaignDocument, actor\);/);
  // The delay between applicants is the referee's: the book names no number.
  assert.match(app, /an appropriate delay is your call/);
  // Reopening the dialog from inside itself would throw on showModal.
  assert.match(app, /if \(!el\.crewDialog\.open\) el\.crewDialog\.showModal\(\);/);
  assert.match(app, /el\.crewRole\.value = role;/);
});

test('no script or test passes a filesystem path to import()', async () => {
  const { readdir } = await import('node:fs/promises');
  // import() takes a URL. On Windows a path begins C:\, which the ESM loader
  // reads as the protocol "c:" and rejects with ERR_UNSUPPORTED_ESM_URL_SCHEME.
  // It works on Linux and macOS, so this ships silently and fails only on the
  // machine it is used from — twice now: test/pages-load.test.mjs in v1.188.00
  // and scripts/make-ship-combat.mjs in v1.223.00.
  const offenders = [];
  for (const dir of ['scripts', 'test']) {
    let entries;
    try { entries = await readdir(new URL(`../${dir}/`, import.meta.url)); } catch { continue; }
    for (const file of entries) {
      if (!file.endsWith('.mjs') && !file.endsWith('.js')) continue;
      const text = await readFile(new URL(`../${dir}/${file}`, import.meta.url), 'utf8');
      for (const match of text.matchAll(/import\(\s*([^)]*)\)/g)) {
        const argument = match[1];
        if (/path\.join|path\.resolve/.test(argument) && !/pathToFileURL/.test(argument)) {
          offenders.push(`${dir}/${file}: import(${argument.trim().slice(0, 60)})`);
        }
      }
    }
  }
  assert.deepEqual(offenders, [], `wrap these in pathToFileURL: ${offenders.join(', ')}`);
});

test('v0.144.0 a ship fight can be fought on a vector plot with a world in it', async () => {
  const app = await read('app.js');
  const html = await read('index.html');
  // A third stage board, its own section so the eventual scene document can own
  // it without moving anything.
  assert.match(html, /id="ship-vector-section"/);
  assert.match(html, /id="ship-vector-stage"/);
  assert.match(html, /id="setup-space-mode"/);
  assert.match(html, /id="setup-proximity"/);
  assert.match(app, /function renderShipVectorStage\(\)/);
  assert.match(app, /function shipCombatIsVector\(\)/);

  // Book 3's size digit IS the diameter in thousands of miles, which is what
  // Book 2 p.27's templates take — so the world is the system's own.
  assert.match(app, /function planetForCurrentSystem\(system\)/);
  assert.match(app, /diameter: profile\.size/);
  // Size 0 is an asteroid belt, which has no diameter and so no template.
  assert.match(app, /if \(!profile\.size\) return null;/);
  // Ships start on one line out from the world, not abreast: abreast put each
  // of them the separation distance from the world too, so near orbit sat
  // outside every band and no gravity applied.
  assert.match(app, /\{ x: distance \+ VECTOR_OPENING_SEPARATION, y: 0 \}/);
  // Committing a maneuver goes through the same step wrapper as everything
  // else, so the fight is saved and the phase record stays honest.
  assert.match(app, /shipCombatEncounter = commitShipVector\(shipCombatEncounter, shipId, acceleration, createDice\(\)\);/);
});

test('v0.145.0 a load failure names the right fault and the sync checks exports', async () => {
  const boot = await readFile(new URL('../client/boot.mjs', import.meta.url), 'utf8');
  const sync = await readFile(new URL('../scripts/sync-vendor.mjs', import.meta.url), 'utf8');

  // The panel blamed vendor staleness for ANY missing export, which sent the
  // reader to sync-vendor twice for faults it cannot fix: a stale browser cache
  // on a client module, and a package that never gained the export at all.
  assert.match(boot, /function describe\(message\)/);
  assert.match(boot, /if \(!specifier\.includes\('\/vendor\/'\)\) \{/);
  assert.match(boot, /A CLIENT MODULE FAILED TO LOAD/);
  assert.match(boot, /Running sync-vendor will not help/);
  // And when it IS the vendored package, the other cause is named.
  assert.match(boot, /extracted into traveller\/ alone/);

  // Syncing cannot add an export the source package lacks, so the mismatch is
  // caught where it is created rather than in the browser.
  assert.match(sync, /does not export everything the client imports/);
  assert.match(sync, /process\.exitCode = 1;/);
});

test('v0.146.0 every module the browser fetches carries the client version', async () => {
  const { readdir } = await import('node:fs/promises');
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const stamp = `v${pkg.version}`;

  // Nothing was stamped, so a browser could hold any one module indefinitely
  // while the rest updated around it. That produced two hunts for a missing
  // export from a file that was correct on disk: a cached ui-model.js, and a
  // cached vendor index that survived a full re-extract and several syncs.
  const unstamped = [];
  const wrongVersion = [];
  const dir = new URL('../client/', import.meta.url);
  for (const file of await readdir(dir)) {
    const text = await readFile(new URL(file, dir), 'utf8');
    const patterns = file.endsWith('.html')
      ? [/<script[^>]*src="(\.[^"?]+\.(?:js|mjs))(\?v=([^"]*))?"/g]
      : [/from\s*['"](\.[^'"?]+\.(?:js|mjs))(\?v=([^'"]*))?['"]/g];
    for (const pattern of patterns) {
      for (const [, specifier, query, version] of text.matchAll(pattern)) {
        if (!query) unstamped.push(`${file}: ${specifier}`);
        else if (version !== stamp) wrongVersion.push(`${file}: ${specifier} is ${version}, not ${stamp}`);
      }
    }
  }
  assert.deepEqual(unstamped, [], `run scripts/stamp-client.mjs: ${unstamped.join(', ')}`);
  assert.deepEqual(wrongVersion, [], `run scripts/stamp-client.mjs: ${wrongVersion.join(', ')}`);

  // boot.mjs stamps the two it imports dynamically, which cannot be rewritten
  // as literals.
  const boot = await readFile(new URL('../client/boot.mjs', import.meta.url), 'utf8');
  assert.match(boot, new RegExp(`export const CLIENT_VERSION = '${stamp.replace('.', '\\.')}'`));
  assert.match(boot, /index\.js\?v=\$\{CLIENT_VERSION\}/);
  assert.match(boot, /app\.js\?v=\$\{CLIENT_VERSION\}/);
});

test('every sibling export app.js calls is actually imported', async () => {
  const { readdir } = await import('node:fs/promises');
  // v1.229.00. module-imports.test.mjs checks that what app.js imports exists.
  // It cannot catch the reverse: calling something that was never imported.
  // That is a ReferenceError at CALL time, so pages-load.test.mjs does not see
  // it either — the module loads fine and fails when the function runs.
  //
  // It has happened twice: four identifiers in v1.194.00, caught by a smoke
  // test, and renderShipVectorMap in v1.224.00, which reached the browser.
  const dir = new URL('../client/', import.meta.url);
  const app = await readFile(new URL('app.js', dir), 'utf8');

  // What app.js pulls from its siblings, ignoring the ?v= stamp.
  const imported = new Set();
  for (const statement of app.matchAll(/import\s*\{([^}]*)\}\s*from\s*'\.\/[^']*'/g)) {
    for (const name of statement[1].split(',')) {
      const local = name.trim().split(/\s+as\s+/).pop().trim();
      if (local) imported.add(local);
    }
  }
  for (const statement of app.matchAll(/import\s+([A-Za-z0-9_$]+)\s*,?\s*(?:\{[^}]*\})?\s*from\s*'\.\//g)) {
    imported.add(statement[1]);
  }

  // Names app.js declares for itself never need importing.
  const declared = new Set();
  for (const match of app.matchAll(/(?:^|\n)\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)/g)) declared.add(match[1]);
  for (const match of app.matchAll(/(?:^|\n)\s*(?:export\s+)?(?:const|let|var|class)\s+([A-Za-z0-9_$]+)/g)) declared.add(match[1]);

  const missing = [];
  for (const file of await readdir(dir)) {
    if (file === 'app.js' || (!file.endsWith('.js') && !file.endsWith('.mjs'))) continue;
    const text = await readFile(new URL(file, dir), 'utf8');
    for (const match of text.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/g)) {
      const name = match[1];
      if (imported.has(name) || declared.has(name)) continue;
      // Called, not merely mentioned in a comment or a string.
      if (new RegExp(`(?<![.'"\`\\w])${name}\\s*\\(`).test(app)) missing.push(`${name} (from ${file})`);
    }
  }
  assert.deepEqual(missing, [], `app.js calls these without importing them: ${missing.join(', ')}`);
});

test('v0.148.0 the vector plot does not collide with the tool rail or itself', async () => {
  const css = await read('styles.css');
  const map = await readFile(new URL('../client/ship-vector-map.js', import.meta.url), 'utf8');

  // The map tool rail is an absolute overlay over the stage, so the panel's own
  // controls started underneath it.
  // v0.150.0: the inset is on the section, because the toolbar is the stage's
  // SIBLING and padding on the stage never covered it.
  assert.match(css, /#ship-vector-section > \* \{[\s\S]*padding-left: 104px;/);
  // width:100% with height:auto scaled the plot to the full stage width — about
  // 1,180px tall on a wide window — which left it sitting low with dead space.
  assert.match(css, /\.ship-vector-stage \.ship-vector-svg \{[\s\S]*max-height: none;/);
  assert.match(map, /preserveAspectRatio:'xMidYMid meet'/);
  // Every band label sat at the top of its ring, so three rings printed almost
  // on top of one another and the innermost landed on the planet's edge.
  assert.match(map, /const bearing = \(bandIndex \/ Math\.max\(1, planet\.bands\.length\)\)/);
  // Ship names had no font-size and rendered at the document default.
  // v0.175.0: in screen pixels, through px().
  assert.match(map, /'font-size': px\(11\),/);
});

test('v0.149.0 combat actions are reachable and the map is not lost to a fight', async () => {
  const html = await read('index.html');
  const app = await read('app.js');

  // The actions rendered after the tracker, which holds a data card per ship,
  // so every button for the current phase sat below two screens of
  // specifications and could only be reached by scrolling.
  // v0.188.0: the phase's verbs are the strip over the stage; nothing of the
  // turn's is in the sidebar at all.
  const rail = html.slice(html.indexOf('id="ship-combat-rail-section"'), html.indexOf('id="ship-combat-record"'));
  assert.doesNotMatch(rail, /ship-verb-/, 'no turn verb lives below the data cards');
  assert.match(html, /<section id="ship-combat-strip"[\s\S]*id="ship-verb-next"/);
  // v0.186.0: the state line and the rail share one fixed row of their own.
  assert.match(app, /el\.shipCombatRailRow\.replaceChildren\(heading\);/);

  // The plot took the stage and never gave it back, so the subsector map was
  // unreachable for the length of a fight.
  assert.match(app, /function shipVectorOnStage\(\)/);
  assert.match(app, /let stageBoard = 'auto';/);
  assert.match(html, /id="ship-vector-to-map"/);
  assert.match(html, /id="map-to-ship-vector"/);

  // positionToolRail measured the subsector map only, so with that map hidden
  // it returned early and the rail stayed drawn over the plot's controls.
  assert.match(app, /el\.shipVectorSection\?\.offsetParent \? el\.shipVectorSection/);
});

// v0.152.0: Book 2 p.31's ready ammunition and reload lock have been in the
// engine since v0.44.0 with no button and no rack display, so a rack could be
// emptied and never refilled. This is a presence check only — it reads source
// as text and says nothing about whether the rail draws it legibly.
test('v0.152.0 gives the reload lock and the rack display a rail control', async () => {
  const app = await read('app.js');
  assert.match(app, /reloadLauncher/);
  assert.match(app, /launcherStatus/);
  assert.match(app, /READY_CAPACITY/);
  assert.match(app, /function reloadShipCombatLauncher/);
  assert.match(app, /function turretReloadLock/);
  // The lock has to reach the fire phases, not just the movement phase, or the
  // rail offers a shot the engine will refuse.
  assert.match(app, /if \(turretReloadLock\(participant, turret\.id\)\)/);
  assert.match(app, /\[ RELOAD \]/);
});

// v0.157.0: the turn sequence as a stepper, after the Chainmail board's phase
// rail. Presence check only — it reads source as text.
test('v0.157.0 shows the Book 2 p.23 sequence as a stepper with a next arrow', async () => {
  const app = await read('app.js');
  const css = await read('styles.css');
  assert.match(app, /SHIP_COMBAT_PHASES/);
  // v0.188.0: the stepper's cells are tracks of the strip's shared grid.
  assert.match(app, /step\.className = `ship-phase-step \$\{position\}/);
  assert.match(app, /step\.dataset\.phase = entry\.key;/);
  assert.match(app, /function shipCombatPhaseHint/);
  // done / now / todo, as the Chainmail rail marks them.
  assert.match(app, /index < encounter\.phaseIndex \? 'done'/);
  // The arrow names what comes next, not the phase you are in.
  assert.match(app, /NEXT: \$\{nextLabel\}/);
  assert.doesNotMatch(app, /ADVANCE \/ \$\{phase\.label/);
  assert.match(css, /\.ship-phase-step\.now \.ship-phase-label/);
});

// v0.159.0: a new scene's first choice is its geometry, as Manual Combat's is.
test('v0.159.0 offers a vector board when creating a scene', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  assert.match(html, /data-scene-kind="grid"/);
  assert.match(html, /data-scene-kind="vector"/);
  assert.match(html, /id="scene-span"/);
  assert.match(html, /id="scene-planet-name"/);
  assert.match(html, /id="scene-atmosphere"/);
  assert.match(app, /function applySceneDialogKind/);
  assert.match(app, /boardKind: sceneDialogKind/);
  // A named world becomes a real template rather than a stored string.
  assert.match(app, /createPlanet\(\{/);
});

// v0.159.1: selecting a vector scene took the whole encounter render stage
// down — renderStagedScene is the grid staging canvas and sceneBoardCells now
// refuses a vector board by design.
test('v0.159.1 keeps the grid staging canvas away from a vector board', async () => {
  const app = await read('app.js');
  assert.match(app, /if \(sceneIsVectorBoard\(scene\)\) \{ renderVectorScenePlaceholder\(scene\); return; \}/);
  assert.match(app, /function renderVectorScenePlaceholder/);
  // And START COMBAT there would have built a personal encounter on a metre
  // grid the scene does not have.
  assert.match(app, /if \(scene && sceneIsVectorBoard\(scene\)\) \{/);
});

// v0.159.2: a vector scene left every metre-based control on screen and the
// directory card read its size off fields a vector board does not have.
test('v0.159.2 describes a vector scene without grid furniture', async () => {
  const app = await read('app.js');
  // The directory card describes a vector board by span and world.
  assert.match(app, /sceneIsVectorBoard\(scene\)\s*\n?\s*\? `\$\{scene\.board\.spanThousandMiles\}/);
  assert.match(app, /CLEAR SPACE/);
  assert.doesNotMatch(app, /meta\.textContent = `\$\{scene\.board\.squares\} SQ/);
  // And the placeholder hides the same controls the range-line board hides.
  const placeholder = app.slice(app.indexOf('function renderVectorScenePlaceholder'), app.indexOf('function renderStagedScene'));
  for (const control of ['encounterMapTools', 'encounterRangePanel', 'encounterGridLegend', 'encounterLegendContactNote']) {
    assert.match(placeholder, new RegExp(`el\\.${control}`), `${control} is hidden on a vector board`);
  }
});

// v0.161.0: a vector scene is a board in its own right, so it goes on the stage
// from the scene navigation without needing a fight — the way back that closing
// a fight left missing.
test('v0.161.0 puts a viewed vector scene on the stage', async () => {
  const app = await read('app.js');
  assert.match(app, /function viewedSceneIsVectorBoard/);
  // The plot claims the stage for a viewed vector scene as well as for a fight.
  assert.match(app, /\|\| viewedSceneIsVectorBoard\(\)/);
  // Staging is a different renderer from flying, not the fight renderer with a
  // null encounter.
  assert.match(app, /renderVectorSceneStage\(el\.shipVectorStage, scene/);
  assert.match(app, /moveSceneShip\(entry, \{ tokenId/);
  assert.match(app, /setSceneShipVector\(entry, \{ tokenId/);
});

// v0.161.1: placeSceneShip had no caller, so every space scene opened empty and
// could never be used; and a world named without a size was silently dropped,
// which is how a board called SAN TELMO came out as clear space.
test('v0.161.1 can stage a ship and refuses a half-specified world', async () => {
  const app = await read('app.js');
  assert.match(app, /function vectorSceneShipChoices/);
  assert.match(app, /STANDARD_SHIP_DESIGN_KEYS/);
  assert.match(app, /placeSceneShip\(entry, \{ actorId: choice\.actorId/);
  // The mutator has to hand updateScene a scene, not placeSceneShip's pair.
  assert.match(app, /label: choice\.label \}\)\.scene;/);
  assert.match(app, /a named world needs a size/);
  assert.match(app, /give the world a name, or clear the size/);
});

// v0.162.0: EDIT offered squares on every scene, so on a vector board the span,
// the world and the atmosphere could never be changed; and the staging board had
// no camera because the zoom controls lived in the fight plot's closure.
test('v0.162.0 edits a vector scene and gives its board a camera', async () => {
  const app = await read('app.js');
  const map = await read('ship-vector-map.js');
  assert.match(app, /if \(sceneIsVectorBoard\(scene\)\) \{\s*\n\s*const span = window\.prompt/);
  assert.match(app, /World name, or blank for clear space/);
  // v0.163.0: anything placed can be moved, not only the world.
  assert.match(app, /moveBody: \(bodyId, point\) =>/);
  // Its own camera, not the fight plot's.
  assert.match(map, /let stageView = /);
  assert.match(map, /function zoomStage/);
  assert.match(map, /function applyStageView/);
  assert.match(map, /vector-world-grip/);
});

// v0.163.0: everything Book 2 puts in space is placeable and editable — p.28's
// asteroid belts and p.35's defence emplacements as well as worlds.
test('v0.163.0 places every kind of body a space scene can hold', async () => {
  const app = await read('app.js');
  const map = await read('ship-vector-map.js');
  for (const kind of ['worldBody', 'asteroidFieldBody', 'emplacementBody']) {
    assert.match(app, new RegExp(kind), `${kind} is built in the client`);
  }
  assert.match(app, /placeSceneBody\(entry, body\)/);
  assert.match(app, /removeSceneBody\(entry, bodyId\)/);
  assert.match(app, /function describeSceneBodies/);
  // The view offers all three and no longer reads a single planet field.
  assert.match(map, /ASTEROID BELT/);
  assert.match(map, /DEFENCE BATTERY/);
  assert.doesNotMatch(map, /scene\.space\?\.planet/);
  assert.doesNotMatch(app, /scene\.space\?\.planet/);
});

// v0.164.2: a standard design stays in the staging picker after one is staged;
// only the campaign's own ship drops out.
test('the vector staging picker keeps standard designs offered', async () => {
  const app = await readFile(new URL('../client/app.js', import.meta.url), 'utf8');
  assert.match(app, /scene\.tokens\.map\(\(token\) => token\.actorId\)\.filter\(\(actorId\) => !sceneActorIsDesignReference\(actorId\)\)/);
});

// v0.165.0: ADVANCE coasts the vector fight's ships before ordnance moves, and
// the surface ruling reaches the engine.
test('advancing a vector movement phase coasts ships before ordnance', async () => {
  const app = await readFile(new URL('../client/app.js', import.meta.url), 'utf8');
  const advance = app.slice(app.indexOf('function advanceShipCombat()'), app.indexOf('function describeCoast('));
  assert.ok(advance.indexOf('coastVectorShips(') > 0 && advance.indexOf('coastVectorShips(') < advance.indexOf('moveOrdnance('));
  assert.match(app, /adjudicate: \(shipId, ruling\) => shipCombatStep\(\(\) => \{\s*shipCombatEncounter = adjudicateVectorSurface\(/);
});

// v0.166.0: START COMBAT on a space scene builds the fight from the scene and
// closing it writes the ships back.
test('a space fight is started from its scene and written back on close', async () => {
  const app = await readFile(new URL('../client/app.js', import.meta.url), 'utf8');
  assert.match(app, /startCombat: \(options\) => startSpaceSceneCombat\(scene, options\)/);
  const start = app.slice(app.indexOf('function startSpaceSceneCombat('), app.indexOf('function persistShipCombat('));
  assert.match(start, /enableVectorMovement\(encounter,/);
  assert.match(start, /sceneLink: spaceSceneLink\(plan\)/);
  const close = app.slice(app.indexOf('function closeShipCombat('), app.indexOf('function shipCombatCardRow('));
  assert.match(close, /writeSpaceCombatToScene\(entry, shipCombatEncounter, link\)/);
});

// v0.167.0: Book 2 p.31's worked example is the default loadout, so a ship on
// a vector plot can thrust. Evaluated from the source rather than pinned as text.
test('the default ship combat loadout is p.31 verbatim and a Model/1 can thrust with it', async () => {
  const rules = await import('../vendor/classic-traveller-rules/index.js');
  const app = await readFile(new URL('../client/app.js', import.meta.url), 'utf8');
  const from = app.indexOf('const DEFAULT_COMBAT_LOADOUT');
  const to = app.indexOf('\n}\n', app.indexOf('function shipCombatLoadout(')) + 3;
  const shipCombatLoadout = new Function('COMPUTER_MODELS', 'COMPUTER_PROGRAMS', `${app.slice(from, to)}; return shipCombatLoadout;`)(rules.COMPUTER_MODELS, rules.COMPUTER_PROGRAMS);
  const ship = rules.importShipDocument(JSON.parse(await readFile(new URL('../examples/Hawkeye.ship.json', import.meta.url), 'utf8')));
  assert.equal(ship.specifications.computer.model, '1');
  const loadout = shipCombatLoadout(ship);
  assert.deepEqual([...loadout.loaded].sort(), ['auto-evade', 'gunner-interact', 'maneuver', 'predict-1', 'return-fire', 'target']);
  assert.ok(loadout.carried.includes('launch'));
  let encounter = rules.createShipCombatEncounter({
    id: 'thrust',
    participants: ['intruder', 'native'].map((side) => ({ shipId: side, side, ship, carriedPrograms: loadout.carried, loadedPrograms: loadout.loaded }))
  });
  encounter = rules.enableVectorMovement(encounter, {
    intruder: { position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } },
    native: { position: { x: 40, y: 0 }, velocity: { x: 0, y: 0 } }
  });
  encounter = rules.commitShipVector(encounter, 'intruder', { x: 2, y: 0 }, rules.createSequenceDice([6, 6]));
  assert.deepEqual(encounter.spatial.ships.intruder.position, { x: 2, y: 0 });
});

// v0.168.0: missiles and sand are separate actions from a named rack, and the
// vector path passes the standing ruling instead of throwing for want of one.
test('missile launch and sand cast are separate, rack-specific and ruled', async () => {
  const app = await readFile(new URL('../client/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /sand = missiles \? 0/);
  assert.match(app, /missiles: 1, targetId, launcherIds: \[launcherId\], vectorRuling: shipCombatOrdnanceRuling\(\)/);
  assert.match(app, /sandCanisters: 1, launcherIds: \[launcherId\], vectorRuling: shipCombatOrdnanceRuling\(\)/);
  assert.match(app, /makePortButton\('LAUNCH MISSILE'/);
  assert.match(app, /makePortButton\('CAST SAND'/);
});

// v0.169.0: VEHICLES imports and exports ship JSON, and lists every campaign
// ship with the reserve ones switchable.
test('the vehicles directory imports, exports and switches ships', async () => {
  const app = await readFile(new URL('../client/app.js', import.meta.url), 'utf8');
  assert.match(app, /toolbar: \[makePortButton\('IMPORT SHIP', chooseShipFileToImport\)\]/);
  assert.match(app, /\{ label: 'EXPORT JSON', action: \(\) => exportGameplayShip\(ship\) \}/);
  assert.match(app, /label: 'MAKE ACTIVE SHIP'/);
  assert.match(app, /reserveShipDocuments = resolved\.ships\.filter/);
  assert.match(app, /\.\.\.reserveShipDocuments,\n    \.\.\.contractDocuments/);
});

// v0.170.0: both boards hand their token menus to the app.
test('ship token menus are wired on the staging board and the fight plot', async () => {
  const app = await readFile(new URL('../client/app.js', import.meta.url), 'utf8');
  assert.match(app, /tokenMenu: \(event, token\) => showContextMenu\(event, stagingShipTokenMenuItems\(scene, token\)\)/);
  assert.match(app, /tokenMenu: \(event, participantId, \{ select \}\) => showContextMenu\(event, fightShipTokenMenuItems\(participantId, \{ select \}\)\)/);
  assert.match(app, /const blocked = launcherBlockedReason\(participant, launcher, \{ enemies \}\);/);
  const map = await readFile(new URL('../client/ship-vector-map.js', import.meta.url), 'utf8');
  assert.doesNotMatch(map, /addEventListener\('dblclick', \(\) => removeShip/);
});

// v0.171.0: ship fight time reaches the campaign clock; a space scene cannot
// break the manual combat dialog; the player page draws a published plot.
test('ship game turns advance the clock, and space scenes are safe to publish and to have', async () => {
  const app = await readFile(new URL('../client/app.js', import.meta.url), 'utf8');
  const advance = app.slice(app.indexOf('function advanceShipCombat()'), app.indexOf('function describeCoast('));
  assert.match(advance, /advanceCampaignSeconds\(campaignDocument, \(shipCombatEncounter\.gameTurn - turnBefore\) \* GAME_TURN_MINUTES \* 60\)/);
  assert.match(app, /const gridScenes = sceneDocuments\.filter\(\(scene\) => !sceneIsVectorBoard\(scene\)\);/);
  assert.doesNotMatch(app, /setup: \(\) => \{\}/);
  const player = await readFile(new URL('../client/player.js', import.meta.url), 'utf8');
  assert.match(player, /if \(scene\.kind === 'vector'\) \{/);
  assert.match(player, /renderVectorSceneStage\(el\.vectorStage, plot, \{ bodies: plot\.space\.bodies \}\)/);
  const html = await readFile(new URL('../client/player.html', import.meta.url), 'utf8');
  assert.match(html, /id="player-vector-stage"/);
});

// v0.172.0 (rulings): a phase with no legal action advances by itself and logs
// why; a refused declaration is logged to the referee who made it.
test('ship combat auto-advances idle phases and logs refusals', async () => {
  const app = await readFile(new URL('../client/app.js', import.meta.url), 'utf8');
  const auto = app.slice(app.indexOf('function autoAdvanceShipCombat()'), app.indexOf('function stepShipCombatPhase()'));
  assert.match(auto, /const actions = shipCombatPhaseActions\(shipCombatEncounter\);\n    if \(actions\.legal \|\| actions\.over\) break;/);
  assert.match(auto, /skipped, \$\{actions\.reason\}/);
  assert.match(auto, /stepShipCombatPhase\(\);/);
  assert.match(auto, /const cap = SHIP_COMBAT_PHASES\.length \* 2;/);
  assert.match(app, /logActivity\('COMBAT', `REFUSED \/ \$\{label\}: \$\{message\}`, \{ visibility: ACTIVITY_VISIBILITY\.REFEREE \}\);/);
  // Manual ADVANCE and the auto path share one step, so the clock and coasting
  // happen either way.
  assert.match(app, /function advanceShipCombat\(\) \{\n  shipCombatStep\(\(\) => \{\n    stepShipCombatPhase\(\);/);
});

// v0.173.0: Book 2 p.35 damage control is declared on the rail and thrown in
// the interphase with dice the step supplies.
test('damage control is declared from the rail and resolved when a game turn ends', async () => {
  const app = await readFile(new URL('../client/app.js', import.meta.url), 'utf8');
  assert.match(app, /shipCombatEncounter = advanceShipCombatPhase\(shipCombatEncounter, \{ dice: createDice\(\) \}\);/);
  assert.match(app, /shipCombatEncounter = declareDamageControl\(shipCombatEncounter, \{\n\s+shipId: participant\.id, location: option\.location, turretId: option\.turretId,/);
  assert.match(app, /makePortButton\('WITHDRAW'/);
  assert.match(app, /ONE HIT REPAIRED/);
});

// v0.174.0 (ruling): a named crew member makes the repair, with his own skill
// in the field as the DM, and leaves his stations for the turn.
test('damage control names who repairs and uses his skill in the field', async () => {
  const app = await readFile(new URL('../client/app.js', import.meta.url), 'utf8');
  assert.match(app, /crewId: person\?\.id \?\? null, crewName: person\?\.name \?\? '',/);
  assert.match(app, /const skill = person \? characterSkillLevel\(person\.id, field\) : null;/);
  const field = app.slice(app.indexOf('function damageControlField('), app.indexOf('function characterSkillLevel('));
  assert.match(field, /return 'Engineering';/);
  assert.match(field, /return 'Computer';/);
  assert.match(field, /return 'Mechanical';/);
  assert.match(app, /LEAVES \$\{person\.stations/);
});

// v0.176.0: running the fight is a turn strip over the board; the tracker is the
// combatants, with only controls that change a ship (damage control).
test('ship combat turn controls live in a strip over the stage, not in the tracker', async () => {
  const html = await readFile(new URL('../client/index.html', import.meta.url), 'utf8');
  const vector = html.slice(html.indexOf('<section id="ship-vector-section"'), html.indexOf('<section id="encounter-section"'));
  // v0.188.0: the strip is the rail, the hint and the verbs, and nothing else.
  assert.match(vector, /<section id="ship-combat-strip"[\s\S]*<div id="ship-combat-verbs"/);
  assert.doesNotMatch(html, /ship-combat-actions/);
  const rail = html.slice(html.indexOf('<section id="ship-combat-rail-section"'), html.indexOf('</section>', html.indexOf('<section id="ship-combat-rail-section"')));
  assert.doesNotMatch(rail, /ship-combat-actions/);
  const app = await readFile(new URL('../client/app.js', import.meta.url), 'utf8');
  assert.match(app, /const host = shipVectorOnStage\(\) \? el\.shipVectorSection : el\.subsectorSection;/);
  assert.match(app, /const repair = shipDamageControlRow\(encounter, participant\);\n    if \(repair\) row\.append\(repair\);\n    const ordnance = shipOrdnanceControls\(encounter, phase, acting, participant\);\n    if \(ordnance\) row\.append\(ordnance\);\n    el\.shipCombatTracker\.append\(row\);/);
  assert.doesNotMatch(app, /A SPACE BOARD OPENS WITH A FIGHT ON IT'/);
  assert.match(app, /reloading takes his turn/);
});

// v0.178.0: the throw before the click (Book 1 p.30), the two Book 1 p.26
// step 4 decisions in place of eight verbs, the result as a card, and the
// wounded player's own distribution of the wound groups (p.30).
test('the combat rail prices the throw before the attack is declared', async () => {
  const html = await readFile(new URL('../client/index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../client/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../client/styles.css', import.meta.url), 'utf8');

  // The card sits above the tracker and follows the selection.
  assert.match(html, /<div id="encounter-throw-card" class="encounter-throw-card"/);
  assert.match(app, /function renderEncounterThrowCard\(encounter, actor, target\)/);
  assert.match(app, /renderEncounterThrowCard\(encounter, actor, selectedEncounterTarget\(encounter\)\);/);

  // Every figure comes from the rules package through one view model, so the
  // card cannot promise a throw the resolver will not demand.
  assert.match(app, /import \{ throwCardModel, deriveDeclaration, declarationSummary, attackCardModel/);
  const view = await readFile(new URL('../client/combat-view.js', import.meta.url), 'utf8');
  assert.match(view, /previewPersonalAttack\(\{ attacker, defender, range: band, situationalDM: situation\.total, surprise \}\)/);
  assert.match(view, /engineNeeded: preview\.canAttack \? Math\.max\(2, preview\.requiredRoll\) : null/);

  assert.match(css, /\.combat-rail \.encounter-throw-card \{/);
  assert.doesNotMatch(css, /box-shadow/);
});

test('a declaration is movement then target, not eight verbs in a row', async () => {
  const app = await readFile(new URL('../client/app.js', import.meta.url), 'utf8');
  const view = await readFile(new URL('../client/combat-view.js', import.meta.url), 'utf8');

  assert.match(app, /function renderDeclarationStrip\(encounter, combatant, \{ canOrder, foes \}\)/);
  assert.match(app, /const verbs = renderDeclarationStrip\(encounter, combatant, \{ canOrder, foes \}\);/);
  // The old flat verb row is gone: no CLOSE + ATTACK / RUN CLOSE / RUN OPEN buttons.
  for (const label of ['CLOSE \\+ ATTACK', 'OPEN \\+ ATTACK', 'RUN CLOSE', 'RUN OPEN']) {
    assert.doesNotMatch(app, new RegExp(`makePortButton\\('${label}'`));
  }
  // Each target in the picker is priced.
  assert.match(app, /label = `\$\{foe\.name\.toUpperCase\(\)\} \\u00b7 \$\{rangeLabel\(model\.range\)\} \\u00b7 \$\{model\.reach \? `\$\{model\.needed\}\+` : 'NO REACH'\}`/);
  // Book 1 p.28: running prevents the attack; escape is a round-one choice.
  assert.match(view, /return \{ action: running \? `\$\{movement\}-run` : movement, targetId, attacks: !running \};/);
  assert.match(view, /if \(round !== 1\) throw new Error\('Book 1 p\.28: escape is possible only before combat begins \(round 1\)'\);/);
});

test('a resolved attack is a card, with its dice, its DMs and where the wound landed', async () => {
  const app = await readFile(new URL('../client/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../client/styles.css', import.meta.url), 'utf8');
  assert.match(app, /function renderAttackCard\(model\)/);
  assert.match(app, /block\.append\(renderAttackCard\(attackCardModel\(entry, encounter\)\)\);/);
  assert.match(css, /\.combat-rail \.attack-card \{/);
  assert.match(css, /\.combat-rail \.attack-die \{/);
  assert.doesNotMatch(css, /box-shadow/);
});

test('the wounded player allocates the wound groups, and the round waits for it', async () => {
  const html = await readFile(new URL('../client/index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../client/app.js', import.meta.url), 'utf8');
  const encounter = await readFile(new URL('../src/encounter-document.js', import.meta.url), 'utf8');

  // The round pauses at Book 1 p.30 step 2C rather than defaulting for a PC.
  assert.match(encounter, /export const CURRENT_ENCOUNTER_DOCUMENT_SCHEMA_VERSION = 17;/);
  assert.match(encounter, /export function pendingWoundAllocation\(document\)/);
  assert.match(encounter, /export function allocateRoundWound\(document, \{ key, allocation = null, targets = null, dice, date \} = \{\}\)/);
  assert.match(encounter, /function woundNeedsAllocation\(defender, wound\)/);
  assert.match(app, /playerAllocatesWounds: true/);

  // Nothing about the round reaches the log or the clock until it finishes.
  assert.match(app, /function applyResolvedRound\(result\)/);
  assert.match(app, /if \(result\.pending\) \{[\s\S]*?openWoundAllocationDialog\(\);/);

  // The dialog offers one row per die and previews the result through the rules.
  assert.match(html, /<dialog id="wound-allocation-dialog"/);
  assert.match(html, /id="wound-allocation-groups"/);
  // v0.179.0: the rows and the preview are the shared wound-dialog module,
  // so the referee's dialog and the player's cannot drift apart.
  assert.match(app, /renderWoundGroups\(el\.woundAllocationGroups, prompt, woundAllocationDraft/);
  const dialog = await readFile(new URL('../client/wound-dialog.js', import.meta.url), 'utf8');
  assert.match(dialog, /button\.disabled = current <= 0;/);
  assert.match(dialog, /applyPersonalDamage\(combatant, prompt\.damageDice, null, \{/);
  // Book 1 p.30 leaves the first wound to chance, so it is never offered.
  assert.match(encounter, /!defender\.firstBlood/);
});

// v0.179.0: Book 1 p.30 says the wounded player distributes their own wound
// groups. v0.178.0 paused the round for it; this carries the question to the
// player's page and the answer back.
test('the paused wound is published to the player and answered from their page', async () => {
  const view = await readFile(new URL('../src/published-view.js', import.meta.url), 'utf8');
  const publish = await readFile(new URL('../client/publish.js', import.meta.url), 'utf8');
  const player = await readFile(new URL('../client/player.js', import.meta.url), 'utf8');
  const playerHtml = await readFile(new URL('../client/player.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../client/app.js', import.meta.url), 'utf8');

  // What is published is the player's own numbers and the names already in
  // the narration — never the attacker's throw.
  assert.match(view, /function publishedPendingWound\(encounter\)/);
  assert.match(view, /pendingWound: publishedPendingWound\(encounter\)/);
  const pendingWound = view.slice(view.indexOf('function publishedPendingWound'), view.indexOf('// v0.180.0: what a party combatant needs to roll'));
  assert.doesNotMatch(pendingWound, /totalDM|requiredRoll|\.armor|characteristics/);

  // Keyed by the wound, create-only, cleared by the referee.
  assert.match(publish, /\.collection\('woundAllocations'\)\.doc\(allocation\.key\)/);
  assert.match(app, /function watchPlayerWoundAllocations\(\)/);
  assert.match(app, /const intent = authorizePlayerWoundAllocation\(answer, \{ campaign: campaignDocument, encounter, pending \}\);/);
  assert.match(app, /\['player-wounds', watchPlayerWoundAllocations\],/);

  // A wound on a seated player's character is theirs to place: the referee
  // publishes and waits rather than opening its own dialog.
  // v0.183.1 adds the channel check: a wound is not routed to a page that
  // cannot answer it.
  assert.match(app, /const ownerUid = playerWoundChannelOpen && pending\?\.defender \? seatedOwnerOfCombatant\(pending\.defender\.id\) : null;/);
  assert.match(app, /WAITING FOR \$\{playerLabelForUid\(ownerUid\)\.toUpperCase\(\)\}/);

  // The player's dialog is the referee's dialog: same module, same rules.
  assert.match(playerHtml, /<dialog id="wound-allocation-dialog"/);
  assert.match(player, /renderWoundGroups\(el\.woundGroups, prompt, woundDraft/);
  assert.match(player, /await writeWoundAllocation\(connectedCampaignId, view\.encounterId, allocation\);/);
  assert.match(player, /if \(!ownedCombatantIds\(\)\.has\(pending\.defenderId\)\) return null;/);
  // Neither dialog can be dismissed: a paused round is behind both.
  assert.match(player, /el\.woundDialog\.addEventListener\('cancel', \(event\) => \{ event\.preventDefault\(\); \}\);/);
});

// v0.180.0: the player page gets what the referee's rail got in v0.178.0 —
// the throw before the click, the two Book 1 p.26 step 4 decisions, and a
// resolved attack as a card.
test('the player page prices its own throws and declares in two steps', async () => {
  const player = await readFile(new URL('../client/player.js', import.meta.url), 'utf8');
  const view = await readFile(new URL('../src/published-view.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../client/styles.css', import.meta.url), 'utf8');

  // The figures are published per pair and drawn, never recomputed on the
  // page — a player's client has no encounter to compute them from.
  assert.match(view, /function publishedThrows\(encounter\)/);
  assert.match(view, /throws: publishedThrows\(encounter\)/);
  assert.match(player, /function renderPlayerThrowCard\(priced, attacker, target\)/);
  assert.match(player, /const priced = \(targetId\) => \(view\.throws \?\? \[\]\)\.find/);

  // Only the attacker's own rows are named; everything the defender
  // contributes is one combined figure.
  assert.match(view, /const ATTACKER_ROWS = \['skill', 'characteristic', 'untrained', 'weakened', 'foldingStock', 'surprise', 'lighting'\];/);
  assert.match(view, /defenceDM: model\.reach \? defenceDM : null,/);
  assert.match(player, /WEAPON, RANGE AND COVER/);

  // Two decisions, one declaration, shared with the referee's client.
  assert.match(player, /import \{ deriveDeclaration, declarationSummary, rangeLabel/);
  assert.match(player, /const draft = declarationDraft\(combatantId, foes\);/);
  assert.match(player, /\[ DECLARE: \$\{declarationSummary\(draft, \{ targetName, reach \}\)\} \]/);
  for (const label of ['CLOSE + ATTACK', 'OPEN + ATTACK', 'RUN AWAY', 'ATTACK / STAND']) {
    assert.ok(!player.includes(`['${label}'`), `the flat verb row is gone: ${label}`);
  }

  // The party's own attacks are cards; another side's fight stays narrated.
  assert.match(view, /attacks: \(encounter\.history \?\? \[\]\)/);
  assert.match(player, /function renderPlayerAttackCard\(attack\)/);
  assert.match(player, /block\.append\(renderPlayerAttackCard\(cards\[placed\]\)\);/);

  // The rail's rules are scoped to .combat-rail, so the player column is styled by name.
  assert.match(css, /\.player-orders \.encounter-throw-card,/);
  assert.match(css, /\.player-narration \.attack-card \{/);
  assert.doesNotMatch(css, /box-shadow/);
});

// v0.181.0 (audit items 1, 4, 8): combat gets the room, and the board carries
// what the rail knows — the wound track on the token, the needed throw on the
// marked target, and both on hover.
test('a fight widens the drawer and splits the panel in two columns (geometry superseded by the v0.192.0 grid shell; deleted v0.198.0)', async () => {
  const css = await readFile(new URL('../client/styles.css', import.meta.url), 'utf8');
  const app = await readFile(new URL('../client/app.js', import.meta.url), 'utf8');
  // v0.181.1: keyed on combat-wide, which is a personal fight actually being
  // run — NOT combat-focus, which only means the combat tab is available and
  // is true for any loaded campaign, including while a ship fight owns the
  // stage.
  assert.doesNotMatch(css, /\.terminal\.shell\.combat-wide \.shell-sidebar \{ grid-template-columns: minmax\(0, 620px\) 52px; \}/); // deleted v0.198.0: grid shell
  assert.doesNotMatch(css, /combat-focus \.shell-sidebar \{ grid-template-columns/);
  assert.match(app, /const personalFightUp = Boolean\(activeEncounterAtCurrentSystem\(\)\) && !shipCombatEncounter;/);

  // The v0.80.2 ruling stands: the drawer pushes the stage, never covers it.
  assert.doesNotMatch(css, /\.terminal\.shell\.combat-wide:not\(\.sidebar-collapsed\) \.shell-stage \{ padding-right: calc\(620px \+ 52px\); \}/); // deleted v0.198.0: grid shell
  // Two columns only where there is width; the tracker scrolls on its own and
  // RESOLVE ROUND is never below the fold of a long one.
  // v0.182.0: scoped to the docked sidebar — popOutPanel moves the panel's
  // element into a floating window, and the grid must not follow it.
  assert.match(css, /@media \(min-width: 1200px\) \{\s*\.combat-wide \.shell-sidebar \.sidebar-panel\[data-sidebar-panel="combat"\] > \.combat-rail \{/);
  assert.match(css, /\.combat-wide \.shell-sidebar \.combat-rail > #encounter-tracker \{\s*grid-column: 1; grid-row: 2 \/ -1;/);
  assert.match(css, /\.combat-wide \.shell-sidebar \.combat-rail > #encounter-resolve \{ grid-column: 2; grid-row: 3;/);
  assert.match(css, /\.panel-popout \.combat-rail \{\s*display: block;/);
  assert.match(app, /combat-wide', personalFightUp && !poppedPanels\.has\('combat'\)\)/);
  assert.doesNotMatch(css, /box-shadow/);
});

test('the board carries the wound track and the needed throw', async () => {
  const app = await readFile(new URL('../client/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../client/styles.css', import.meta.url), 'utf8');

  // Three pips per token, one per physical characteristic, only once wounded.
  assert.match(app, /function appendTokenWoundPips\(group, combatant\)/);
  assert.match(app, /const wounded = keys\.some\(\(key\) => combatant\.current\[key\] < combatant\.characteristics\[key\]\);\s*if \(!wounded\) return;/);
  assert.match(app, /now <= 0 \? 'gone' : now < full \? 'hurt' : 'whole'/);

  // The needed throw, on the marked target only.
  assert.match(app, /function appendTokenThrowBadge\(group, encounter, actor, combatant\)/);
  assert.match(app, /if \(!effectiveTargetIds\(encounter, actor\.id\)\.has\(combatant\.id\)\) return;/);

  // Both boards, tactical and Book 1's range line.
  assert.match(app, /appendTokenWoundPips\(group, combatant\);\s*appendTokenBlows\(group, combatant\);\s*appendTokenThrowBadge\(group, encounter, selectedEncounterActor\(encounter\), combatant\);/);
  assert.match(app, /class: `encounter-token-wound-pip \$\{state\}` \}\);\s*const pipTitle = sceneSvgNode\('title'\);/);

  // Hovering answers the same question as the rail, from the same model.
  assert.match(app, /\$\{actor\.name\.toUpperCase\(\)\} NEEDS \$\{model\.needed\}\+ AT \$\{rangeLabel\(model\.range\)\}/);
  assert.match(app, /\$\{actor\.name\.toUpperCase\(\)\} CANNOT REACH AT \$\{rangeLabel\(model\.range\)\}/);

  assert.match(css, /\.encounter-token-wound-pip\b/);
  assert.match(css, /\.encounter-token-throw-badge\b/);
});

// v0.181.2: measured on screen — the plot sat at its 240px floor in a 921px
// column with nothing overflowing, because #ship-vector-workspace (created in
// ship-vector-map.js, styled nowhere) was a block with flex-grow 0 between the
// flex column and the board that declares flex: 1 1 0.
test('the vector plot inherits the stage height through its workspace wrapper', async () => {
  const css = await readFile(new URL('../client/styles.css', import.meta.url), 'utf8');
  const map = await readFile(new URL('../client/ship-vector-map.js', import.meta.url), 'utf8');
  // The wrapper exists in the DOM, so it must exist in the chain.
  assert.match(map, /panel\.id = 'ship-vector-workspace'/);
  assert.match(css, /\.ship-vector-stage > #ship-vector-workspace \{[\s\S]*?flex: 1 1 0;[\s\S]*?display: flex;/);
  assert.match(css, /\.vector-stage-board \.ship-vector-svg \{ min-height: 0; max-height: none; \}/);
  // The plot claims its own gestures, as the subsector map has since v0.80.2.
  assert.match(css, /\.ship-vector-stage \.ship-vector-svg \{ touch-action: none; \}/);
  assert.doesNotMatch(css, /box-shadow/);
});

// v0.182.0: four things seen on screen at v0.181.2, and the round record
// reading the same way round as the chat.
test('the round record reads oldest to newest, like the chat', async () => {
  const app = await readFile(new URL('../client/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../client/styles.css', import.meta.url), 'utf8');
  // Oldest at the top, newest at the bottom — the chat's order since v0.81.0.
  assert.match(app, /\[\.\.\.rounds\.entries\(\)\]\.sort\(\(left, right\) => left\[0\] - right\[0\]\)/);
  assert.doesNotMatch(app, /\[\.\.\.rounds\.entries\(\)\]\.reverse\(\)/);
  // And it sticks to the newest unless the referee has scrolled up to read.
  assert.match(app, /const wasAtBottom = scroller\.scrollHeight - scroller\.scrollTop - scroller\.clientHeight < 40;/);
  assert.match(app, /if \(wasAtBottom\) scroller\.scrollTop = scroller\.scrollHeight;/);
  // The first card is no longer clipped by the scroller's own top padding.
  assert.match(css, /#encounter-details > \.encounter-record \{\s*margin-top: 0;\s*padding-top: 0;\s*border-top: 0;/);
});

test('a fight collapses the dock and clears the tool rail', async () => {
  const app = await readFile(new URL('../client/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../client/styles.css', import.meta.url), 'utf8');
  // The dock's own first card says port, trade and jobs are suspended, so it
  // collapses to that line — for a ship fight as well as a personal one.
  assert.match(app, /function applyFightDock\(fightRunning\)/);
  assert.match(app, /applyFightDock\(personalFightUp \|\| Boolean\(shipCombatEncounter\)\);/);
  // A manual expand during the fight sticks; the fight's own collapse is not
  // mistaken for the referee's preference afterwards.
  assert.match(app, /dockCollapsedByFight = dockCollapsed \? dockCollapsedByFight : false;/);
  assert.match(app, /dockCollapsed = dockStateBeforeFight \?\? false;/);
  // The combat board clears the floating tool rail, as the plot has since v0.150.0.
  assert.match(css, /#encounter-section > \.encounter-map-toolbar,[\s\S]*?padding-left: 104px;/);
  assert.doesNotMatch(css, /box-shadow/);
});

// v0.183.0: audit items 9, 7 and 10 — the last of the personal-combat list.
test('the once-per-encounter steps are on screen', async () => {
  const html = await readFile(new URL('../client/index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../client/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../client/styles.css', import.meta.url), 'utf8');
  assert.match(html, /<div id="encounter-precombat" class="encounter-precombat" hidden><\/div>/);
  assert.match(app, /function renderEncounterPrecombat\(encounter\)/);
  assert.match(app, /renderEncounterPrecombat\(encounter\);/);
  // Surprise from the encounter's own throw, both sides' DMs named.
  assert.match(app, /MARGIN \$\{surprise\.margin \?\? 0\} \(3\+ TO SURPRISE\)/);
  // Book 1 p.28's escape throw, and the fact that it closes after round 1.
  assert.match(app, /\$\{ESCAPE_TARGET\}\+ \\u00b7 RANGE \$\{signedDM\(dm\)\} \\u00b7 THIS ROUND ONLY/);
  assert.match(app, /'CLOSED \\u00b7 CONTACT IS MADE'/);
  assert.match(css, /\.encounter-precombat \{/);
});

test('the range line draws every band, shaded by range from the selected marker, and blows show on a melee token', async () => {
  const app = await readFile(new URL('../client/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../client/styles.css', import.meta.url), 'utf8');
  // Item 7: the occupied span with one band of headroom, and what was skipped
  // is stated rather than silently dropped.
  // v0.201.0: all sixteen bands drawn; zone shading and labels follow the selected marker.
  assert.match(app, /classes\.push\(`zone-\$\{zone\}`\);/);
  assert.match(app, /range-line-pair-label/);
  assert.match(css, /\.range-line-band\.zone-medium \{/);
  assert.match(css, /\.range-line-band\.reference \{/);
  // Item 10: Book 1 p.32 — guns are not affected by endurance, so this is
  // melee only, and only once a blow has been spent.
  assert.match(app, /function appendTokenBlows\(group, combatant\)/);
  assert.match(app, /if \(!getPersonalWeapon\(combatant\.weaponKey\)\.melee\) return;/);
  assert.match(app, /if \(left >= combatant\.blowAllowance\) return;/);
  assert.match(css, /\.encounter-token-blows \{/);
  assert.doesNotMatch(css, /box-shadow/);
});

// v0.183.1: the woundAllocations listener is refused until Firestore rules v17
// is deployed. That is a state the referee needs told about — no player can
// answer a wound — not a bare console error on every reload.
test('a refused wound listener says what to deploy and falls back to the referee', async () => {
  const app = await readFile(new URL('../client/app.js', import.meta.url), 'utf8');
  const publish = await readFile(new URL('../client/publish.js', import.meta.url), 'utf8');
  assert.match(publish, /export async function watchWoundAllocations\(campaignId, encounterId, onChange, onError = null\)/);
  assert.match(publish, /onError\?\.\(error\);/);
  assert.match(app, /function onWoundWatchRefused\(error\)/);
  assert.match(app, /DEPLOY FIRESTORE RULES v17/);
  // Said once per encounter: the listener retries on its own.
  assert.match(app, /if \(!denied \|\| woundWatchRefusedFor === encounterId\) return;/);
  // And a wound is not published to a page that cannot reply to it.
  assert.match(app, /const ownerUid = playerWoundChannelOpen && pending\?\.defender \? seatedOwnerOfCombatant\(pending\.defender\.id\) : null;/);
});

// v0.184.0 (audit item 13): Book 2 p.24 describes a 3x5 index card — name on
// top, six numbered sections down the left, turrets beneath, computer to the
// right with the running programs pencilled in. The rail had it as ten to
// twelve label/value rows stacked in a narrow column.
test('the ship data card is drawn as Book 2 p.24 draws it', async () => {
  const app = await readFile(new URL('../client/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../client/styles.css', import.meta.url), 'utf8');

  assert.match(app, /function renderShipDataCard\(card, participant, encounter\)/);
  assert.match(app, /row\.append\(renderShipDataCard\(card, participant, encounter\)\);/);
  // The six sections, numbered, in the book's own order.
  assert.match(app, /const order = \['M-Drive', 'J-Drive', 'Power Plant'\];/);
  assert.match(app, /shipCardSection\(4, 'FUEL'/);
  assert.match(app, /shipCardSection\(5, 'HOLD'/);
  assert.match(app, /shipCardSection\(6, 'BRIDGE', `PILOT-\$\{card\.bridge\.pilotSkill\}`/);
  // Damage reads as damage: a struck letter, a struck turret.
  assert.match(css, /\.ship-card-section\.is-dead \.ship-card-section-value \{ color: var\(--error\); text-decoration: line-through; \}/);
  assert.match(css, /\.ship-card-turret\.is-out \{[^}]*line-through/);
  // p.24: "leave room to mark them with pencil to indicate their status."
  assert.match(app, /pill\.className = `ship-card-program\$\{loaded \? ' is-loaded' : ''\}\$\{reprogramPhase \? ' is-live' : ''\}`;/);
  assert.match(css, /\.ship-card-program\.is-loaded \{/);
  // Nothing is computed here: every figure is shipDataCard's.
  const fn = app.slice(app.indexOf('function renderShipDataCard'), app.indexOf('function renderShipCombatRail'));
  assert.doesNotMatch(fn, /damageReport|turretOperational|computerState/);
  assert.doesNotMatch(css, /box-shadow/);
});

// v0.185.0: CLEAR left messages behind. The panel has merged two sources since
// v0.75.0 — this browser's activity log and the table's chat collection — and
// CLEAR emptied only the first, so every message returned on the next snapshot.
test('clearing the log clears the table chat too', async () => {
  const app = await readFile(new URL('../client/app.js', import.meta.url), 'utf8');
  const publish = await readFile(new URL('../client/publish.js', import.meta.url), 'utf8');
  assert.match(publish, /export async function clearChat\(campaignId\)/);
  assert.match(app, /clearChat\(campaignDocument\.identity\.id\)/);
  // The confirm says what is about to happen to everyone else's view.
  assert.match(app, /delete \$\{chatMessages\.length\} table chat message/);
  // Firestore rules v16 gives chat delete to the referee alone, so a player's
  // refusal is explained rather than looking like a failure.
  assert.match(app, /THE TABLE CHAT IS THE REFEREE/);
});

// v0.186.0: the ship turn bar is three fixed rows, and the per-ship controls
// that were growing it live on each ship's data card instead.
test('the ship turn bar never changes height with the phase', async () => {
  const html = await readFile(new URL('../client/index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../client/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../client/styles.css', import.meta.url), 'utf8');

  // Rail, hint and verbs each own a row declared in the markup.
  for (const id of ['ship-combat-rail', 'ship-combat-hint', 'ship-combat-verbs']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  // Every verb is a declared slot, filled by setShipVerb rather than appended.
  assert.match(app, /function setShipVerb\(button, label, handler/);
  for (const id of ['ship-verb-fire', 'ship-verb-detonate', 'ship-verb-next', 'ship-verb-close']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  // Kurt's battlesystem-board paradigm: parked with visibility, never display.
  assert.match(css, /\.ship-combat-verbs \.ship-verb\[hidden\] \{ display: inline-block !important; visibility: hidden;/);
  assert.match(css, /\.ship-combat-strip \.ship-phase-hint \{[^}]*min-height: 2\.4em; max-height: 2\.4em;/);

  // Phase E is the pills on the card; the eight program rows are gone.
  assert.match(app, /const reprogramPhase = isActing && phase && phase\.key === 'reprogramming';/);
  assert.match(app, /pill\.addEventListener\('click', \(\) => reprogramShipCombat\(participant\.id, key, loaded\)\);/);
  // Book 2 p.29: the target belongs to the turret, so it is chosen there.
  assert.match(app, /picker\.className = 'ship-card-turret-target';/);
  assert.match(app, /shipCombatAllocation\[participant\.id\]\[turret\.id\] = picker\.value;/);
  assert.doesNotMatch(css, /box-shadow/);
});

// v0.187.0: colour, in three places and nowhere else — the card's edge, the
// live phase cell, and the plot. Always a second channel: every place a hue
// appears, the side is also named in text.
test('the sides carry colour, and nothing rests on hue alone', async () => {
  const app = await readFile(new URL('../client/app.js', import.meta.url), 'utf8');
  const map = await readFile(new URL('../client/ship-vector-map.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../client/styles.css', import.meta.url), 'utf8');

  // v0.190.0: ship combat's sides are Book 2 p.23's intruder and native — the
  // engine has no party/opposition, so v0.187.0's keys never matched a ship.
  // Red intruder, blue native (Kurt), and the red is not a damage red.
  for (const token of ['--side-intruder: #a8321e', '--side-native: #1f4f7a', '--side-third: #46365c']) {
    assert.ok(css.includes(token), `${token} is declared`);
  }
  for (const damage of ['#5c1616', '#7a3a3a']) assert.ok(!css.includes(`--side-intruder: ${damage}`), 'intruder must not read as damage');

  // The card's edge and a tag that names the side in words.
  assert.match(app, /function shipSideKey\(participant\) \{\n  if \(participant\.side === 'intruder'\) return 'intruder';/);
  assert.match(css, /\.ship-data-card-frame\.side-intruder \{ border-left: 4px solid var\(--side-intruder\); \}/);
  assert.match(app, /sideTag\.textContent = participant\.side === 'intruder' \? 'INTRUDER'/);

  // The live phase cell, the pills and the lead line, in the acting side's colour.
  assert.match(app, /const actingSideKey = position === 'now' \? shipCombatActingSide\(encounter\) : null;/);
  assert.match(css, /\.ship-phase-step\.now\.acting-intruder \.ship-phase-label \{/);
  assert.match(css, /\.ship-phase-pill\.intruder \{ color: var\(--side-intruder\);/);
  assert.match(css, /\.ship-phase-pill\.native \{ color: var\(--side-native\);/);
  assert.match(app, /pill\.textContent = side === 'intruder' \? 'INT' : 'NAT';/);

  // The plot: one class per side, carried by currentColor; ordnance by the
  // side that launched it.
  assert.match(map, /export function vectorSideClass\(side\)/);
  assert.match(map, /token\.classList\.add\(vectorSideClass\(ship\.side\)\);/);
  assert.match(map, /missile\.classList\.add\(vectorSideClass\(round\.launcherSide\)\);/);
  assert.match(css, /\.ship-vector-svg \.vector-side-intruder \{ color: var\(--side-intruder\); \}/);
  assert.doesNotMatch(css, /box-shadow/);
});

// v0.188.0: one column plan for the rail and the verbs, after
// battlesystem-board.html v0.60.5, and a lane that scrolls rather than
// reflowing. The geometry itself is measured in layout-ship-strip.test.mjs;
// this pins the structure that geometry rests on.
test('the ship strip shares one column plan and scrolls instead of reflowing', async () => {
  const html = await readFile(new URL('../client/index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../client/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../client/styles.css', import.meta.url), 'utf8');
  // Both rows are the same grid.
  assert.match(html, /id="ship-combat-rail" class="ship-strip-grid/);
  assert.match(html, /id="ship-combat-verbs" class="ship-strip-grid/);
  assert.match(css, /\.ship-strip-grid \{\n  display: grid;\n  grid-template-columns:\n    var\(--ship-col-lead\)/);
  for (const phase of ['movement', 'laser-fire', 'return-fire', 'ordnance-launch', 'reprogramming']) {
    assert.match(css, new RegExp(`--ship-col-${phase}: \\d+px;`));
    assert.match(html, new RegExp(`class="ship-verb-col" data-phase="${phase}"`));
  }
  // Fixed tracks only: nothing in the plan may take its size from the window.
  const plan = css.slice(css.indexOf('.ship-strip-grid {'), css.indexOf('}', css.indexOf('.ship-strip-grid {')));
  assert.doesNotMatch(plan, /fr\b|auto|%/);
  // The lane is its own width, and the strip scrolls it.
  assert.match(css, /\.ship-strip-lane \{ width: max-content; \}/);
  assert.match(css, /\.ship-combat-strip \{\n  flex: 0 0 auto;\n  max-height: none;\n  overflow-x: auto;\n  overflow-y: hidden;/);
  // Two sub-rows under every phase, and a 2x2 dock.
  assert.match(css, /\.ship-verb-col \{ display: grid; grid-template-rows: repeat\(2, var\(--ship-verb-height\)\);/);
  assert.match(css, /\.ship-verb-dock \{ display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); grid-template-rows: repeat\(2, var\(--ship-verb-height\)\);/);
  // Short verbs; the detail is in the title.
  assert.match(app, /setShipVerb\(el\.shipVerbNext, '\\u25b6 NEXT', advanceShipCombat/);
  assert.match(app, /setShipVerb\(el\.shipVerbMovement, 'PLOT', null/);
  // Nothing under the strip grows with the phase: the ending is the hint, and
  // the rack controls are on each ship's card.
  assert.match(app, /el\.shipCombatHint\.textContent = `\\u25b8 \$\{endingText \?\? shipCombatPhaseHint\(encounter, phase\)\}`;/);
  assert.match(app, /function shipOrdnanceControls\(encounter, phase, acting, participant\)/);
  assert.doesNotMatch(app, /shipCombatActions/);
});


// v0.189.0: selection on the vector plot is visible, one thing, and shared with
// the sidebar. Where the marks land is measured in
// layout-vector-selection.test.mjs; this pins the structure.
test('the vector plot marks its selected and hovered ship', async () => {
  const map = await readFile(new URL('../client/ship-vector-map.js', import.meta.url), 'utf8');
  const app = await readFile(new URL('../client/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../client/styles.css', import.meta.url), 'utf8');
  // The same gold as the personal board's selected ring.
  // v0.191.0: the gold is the --highlight token in both themes.
  assert.match(css, /\.encounter-token-selected-ring \{[^}]*stroke: var\(--highlight\);/);
  assert.match(css, /\.vector-ship-selected \{ fill: none; stroke: var\(--highlight\);/);
  assert.match(css, /\.vector-ship-hover\.is-hovered \{ visibility: visible; \}/);
  assert.match(css, /\.ship-data-card-frame\.is-selected \{ outline: 2px solid var\(--highlight\);/);
  // One way to select, and the app hears of every change.
  assert.match(map, /export function vectorSelectedShipId\(\)/);
  assert.match(map, /const choose = \(shipId\) => \{ selected = shipId; rerender\(\); \};/);
  assert.match(map, /if \(announcedSelection !== selected\) \{ announcedSelection = selected; onSelect\?\.\(selected\); \}/);
  assert.match(app, /onSelect: \(\) => renderShipCombatRail\(\)/);
  assert.match(app, /vectorSelectedShipId\(\) === participant\.id\) frame\.classList\.add\('is-selected'\)/);
  // Ships above the overlays, the handle above the ships, and the envelope a
  // drawing rather than a click target.
  assert.match(map, /svg\.append\(\.\.\.shipLayer\);\n    if \(endpointHandle\) svg\.append\(endpointHandle\);/);
  assert.match(map, /'stroke-width': px\(1\), 'pointer-events': 'none'\n      \}\);\n      reach\.classList\.add\('vector-envelope'\);/);
  // A committed move is marked on the plot.
  assert.match(map, /if \(s\.movedTurn === encounter\.gameTurn\) \{/);
});

// v0.190.0: T on a hovered ship, the LAUNCH verb, and Multi-Target limits read
// from the rules package. Behaviour is tested in ship-targeting.test.mjs and in
// the browser; this pins the wiring.
test('T aims the selected ship at the hovered one, through the targeting module', async () => {
  const app = await readFile(new URL('../client/app.js', import.meta.url), 'utf8');
  const map = await readFile(new URL('../client/ship-vector-map.js', import.meta.url), 'utf8');
  const targeting = await readFile(new URL('../src/ship-targeting.js', import.meta.url), 'utf8');
  const html = await readFile(new URL('../client/index.html', import.meta.url), 'utf8');
  assert.match(map, /export function vectorHoveredShipId\(\) \{ return hovered; \}/);
  assert.match(app, /targetHoveredShip\(shipCombatEncounter, shipCombatAllocation, \{ shooterId, targetId: vectorHoveredShipId\(\), armedTurretId \}\)/);
  assert.match(app, /if \(event\.shiftKey\) \{\n    const cleared = clearShipTargets\(/);
  // The limit comes from the package, never counted in the client.
  assert.match(targeting, /const \{ limit, program \} = turretTargetLimit\(shooter\);/);
  assert.doesNotMatch(app, /multi-target-[234]/);
  // Rings on the plot for the selected ship's targets.
  assert.match(app, /targetsOf: \(shipId\) => targetsOfShip\(shipCombatAllocation, shipId\)/);
  assert.match(map, /ring\.classList\.add\('vector-ship-target'\);/);
  // LAUNCH in phase D's second slot, as the approved mockup has it.
  assert.match(html, /data-phase="ordnance-launch"><span class="ship-verb-slot"><button id="ship-verb-detonate"[^>]*><\/button><\/span><span class="ship-verb-slot"><button id="ship-verb-launch"/);
});

// v0.273.0: Kurt's lobby screenshot — four characters seated at a campaign
// with only ENTER WORLD, and campaigns that could not be deleted cleanly.
test('v0.273.0 every lobby character can be deleted; a seated one can leave; deleting a campaign releases its seats', async () => {
  const enter = await read('enter.js');
  const publish = await read('publish.js');
  assert.match(enter, /\[ LEAVE CAMPAIGN \]/);
  assert.match(enter, /\[ JOIN A CAMPAIGN \]/);
  assert.doesNotMatch(enter, /JOIN A TABLE|SIT DOWN/, 'Kurt: campaign, not table');
  assert.match(enter, /tools\.append\(enter, (older, )?leave, remove\)/);
  assert.match(enter, /tools\.append\(withdraw, remove\)/);
  assert.match(enter, /tools\.append\(join, remove\)/);
  assert.match(enter, /deleteCampaignHome\(campaign\.campaignId, \{ seatedCharacterIds:/);
  assert.match(publish, /export async function deleteCampaignHome\(campaignId, \{ seatedCharacterIds = \[\] \} = \{\}\)/);
  // Released before the campaign document goes, while the rules still see a referee.
  const body = publish.slice(publish.indexOf('export async function deleteCampaignHome'));
  assert.ok(body.indexOf("collection('travellerCharacters')") < body.indexOf("collection('travellerCampaigns').doc(campaignId).delete()"));
});
// v0.277.0: ENTER WORLD opens the new player's seat; the old page stays a
// click away while the new page's fight is built.
test('v0.277.0 the lobby enters the new player seat, which reads only what is published for the player', async () => {
  const enter = await read('enter.js');
  const seat = await read('seat.js');
  const html = await read('seat.html');
  assert.match(enter, /enter\.href = `seat\.html\?campaign=/);
  assert.match(enter, /\[ OLD PAGE \]/);
  assert.match(html, /<script type="module" src="\.\/seat\.js\?v=v\d+\.\d+\.\d+"><\/script>/);
  assert.match(seat, /travellerCampaigns\/\$\{campaignId\}\/players\/\$\{uid\}/);
  assert.doesNotMatch(seat, /state\/current|loadCampaignHome/, 'never the referee-only campaign home');
  assert.match(seat, /playerSheetViews\(/);
});
// v0.278.0: the fight on the player's seat.
test('v0.278.0 the player seat draws the fight, sends its own orders, and places its own wounds', async () => {
  const seat = await read('seat.js');
  const html = await read('seat.html');
  const views = await read('play-views.js');
  assert.match(views, /export function bandsScene\(state, handlers\)/, 'the same band line as the referee\u2019s');
  assert.match(seat, /bandsScene\(\{ fighters: list/);
  assert.match(seat, /encounters\/\$\{encounterId\}\/view\/current/);
  assert.match(seat, /writeDeclaration\(campaignId, state\.view\.encounterId, declaration\)/);
  assert.match(seat, /createPlayerDeclaration\(\{/);
  assert.match(seat, /writeWoundAllocation\(campaignId, state\.view\.encounterId, allocation\)/);
  assert.match(html, /id="wound-dialog"/);
  // Every order the player can give is one the referee's check accepts.
  const { PLAYER_DECLARATION_ACTIONS } = await import('../src/player-declaration.js');
  for (const action of [...seat.matchAll(/\{ action: '([a-z-]+)', label:/g)].map((match) => match[1])) {
    assert.ok(PLAYER_DECLARATION_ACTIONS.includes(action), action);
  }
});

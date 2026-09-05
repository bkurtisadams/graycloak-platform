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
  assert.match(html, /<script type="module" src="\.\/app\.js"><\/script>/);
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

  assert.match(html, /v0\.17\.1/);
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

  assert.match(html, /v0\.17\.1/);
  assert.match(app, /available\.choices\.specializations/);
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
  assert.match(model, /buildPortServicesRecord/);
  assert.match(model, /TRADE CLASSIFICATIONS/);
});


test('v0.11.0.1 adds base markers, map zoom controls, and a left navigation rail', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  assert.match(html, /v0\.17\.1/);
  assert.match(html, /class="subsector-workspace"/);
  assert.match(html, /class="navigation-plan-panel"/);
  assert.match(html, /id="map-zoom-out"/);
  assert.match(html, /id="map-zoom-in"/);
  assert.match(html, /id="map-zoom-fit"/);
  assert.match(app, /appendBaseMarkers/);
  assert.match(app, /Scout Base/);
  assert.match(app, /Naval Base/);
  assert.match(app, /setSubsectorZoom/);
  assert.match(css, /grid-template-columns:\s*minmax\(570px, 620px\) minmax\(0, 1fr\)/);
  assert.match(css, /\.subsector-base-icon-shape/);
});


test('v0.11.0.2 highlights navigation and port states that require attention', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  assert.match(html, /v0\.17\.1/);
  assert.match(app, /renderRecordWithHighlights/);
  assert.match(app, /jumpAttention\.push\('FUEL NEED '/);
  assert.match(app, /portAttention\.push\('BERTHING '/);
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

  assert.match(html, /v0\.17\.1/);
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

  assert.match(html, /v0\.17\.1/);
  assert.match(html, /id="contract-section"/);
  assert.match(html, /CONTRACT BOARD/);
  assert.match(app, /createContractDocument/);
  assert.match(app, /generateContractBoard/);
  assert.match(app, /resolveContractsAtDestination/);
  assert.match(app, /creditShipAccount/);
  assert.match(model, /buildContractBoardRecord/);
});


test('v0.11.2.1 keeps port, trade, and jobs beside the map and guards repaired state flows', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  assert.match(html, /v0\.17\.1/);
  assert.match(html, /id="operations-tab-port"/);
  assert.match(html, /id="operations-tab-trade"/);
  assert.match(html, /id="operations-tab-jobs"/);
  assert.ok(html.indexOf('id="commerce-section"') < html.indexOf('id="subsector-map"'));
  assert.match(css, /\.operations-panel-scroll/);
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

  assert.match(html, /v0\.17\.1/);
  assert.match(html, /id="operations-tab-situation"/);
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

  assert.match(html, /v0\.17\.1/);
  assert.match(html, /id="campaign-header"/);
  assert.match(html, /id="header-characteristics"/);
  assert.match(html, /id="header-quick-skills"/);
  assert.match(html, /id="header-task"/);
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

  assert.match(html, /v0\.17\.1/);
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

  assert.match(html, /v0\.17\.1/);
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

  assert.match(html, /v0\.17\.1/);
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

  assert.match(html, /v0\.17\.1/);
  assert.match(html, /id="workspace-tab-threads"/);
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

  assert.match(html, /v0\.17\.1/);
  assert.match(html, /class="navigation-cockpit"/);
  assert.match(html, /id="live-ship-status"/);
  assert.match(app, /renderLiveShipStatus/);
  assert.match(app, /JUMP NEED/);
  assert.match(app, /ACTIVE JOBS/);
  assert.match(app, /setOperationsDeskTab\(tab\)/);
  assert.match(app, /logActivity\('JOB'/);
  assert.match(css, /\.live-state-ready/);
  assert.match(css, /\.live-state-attention/);
  assert.match(css, /\.live-state-critical/);
  assert.match(model, /CURRENT PORT/);
  assert.match(model, /NAVIGATION SELECTION ONLY/);
  assert.match(model, /ALL NEW OFFERS ORIGINATE AT THE CURRENT PORT/);
  assert.match(model, /ACTIVE JOBS/);
  assert.match(model, /AVAILABLE AT/);
});

test('v0.13 exposes compact persistent personal combat', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const model = await read('ui-model.js');
  const encounter = await read('../src/encounter-document.js');

  assert.match(html, /v0\.17\.1/);
  assert.match(html, /id="operations-tab-encounter"/);
  assert.match(html, /id="encounter-actions"/);
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

  assert.match(html, /v0\.17\.1/);
  assert.match(html, /id="combat-setup-dialog"/);
  assert.match(html, /id="encounter-map"/);
  assert.match(html, /id="encounter-roster"/);
  assert.match(html, /id="combat-enemy-weapon"/);
  assert.match(html, /id="combat-enemy-armor"/);
  assert.match(app, /START COMBAT/);
  assert.match(app, /startManualEncounter/);
  assert.match(app, /selectedEncounterTargetId/);
  assert.match(css, /\.encounter-token-enemy\.selected/);
  assert.match(encounter, /grid: 'square'/);
  assert.match(encounter, /opponents = null/);
});

test('v0.14.0 expands combat into a movable multi-party range-guided workspace', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');
  const encounter = await read('../src/encounter-document.js');

  assert.match(html, /32 by 20 square personal encounter map/);
  assert.match(html, /id="encounter-map-viewport"/);
  assert.match(html, /id="encounter-apply-range"/);
  assert.match(html, /id="encounter-party-roster"/);
  assert.match(html, /id="encounter-roster-panel"/);
  assert.match(html, /id="combat-add-enemy-type"/);
  assert.match(app, /repositionEncounterCombatant/);
  assert.match(app, /selectedEncounterActorId/);
  assert.match(app, /currentPartyCharacters/);
  assert.match(css, /encounter-workspace-active/);
  assert.match(encounter, /ENCOUNTER_MAP_COLUMNS = 32/);
  assert.match(encounter, /setEncounterRangeFromPositions/);
  assert.match(encounter, /roundState: \{ declaredActions: \[\] \}/);
});

test('v0.14.1 gives the encounter map a fluid viewBox camera and live token drag preview', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  assert.match(html, /v0\.17\.1/);
  assert.match(html, /data-help-topic="personal-combat"/);
  assert.match(app, /function encounterMapPoint/);
  assert.match(app, /getScreenCTM\(\)/);
  assert.match(app, /scheduleEncounterMapView/);
  assert.match(app, /requestAnimationFrame/);
  assert.match(app, /group\.setAttribute\('transform', `translate/);
  assert.match(app, /addEventListener\('wheel'/);
  assert.doesNotMatch(app, /encounterMapViewport\.scrollLeft/);
  assert.match(css, /\.encounter-map-viewport \{[^}]*overflow: hidden/s);
  assert.match(css, /\.encounter-map \{[^}]*width: 100%[^}]*height: 100%/s);
});

test('v0.15.1 adds a persistent actor roster and token inspection actions', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  assert.match(html, /v0\.17\.1/);
  assert.match(html, /id="operations-tab-roster"/);
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

  assert.match(html, /v0\.17\.1/);
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
  assert.match(html, /id="app-subtitle" class="subtitle">v0\.17\.1</);
  assert.match(html, /CAMPAIGN<\/span> \/\/ <strong id="header-campaign-name">NO CAMPAIGN/);
  for (const id of ['new-campaign', 'save-campaign', 'load-campaign', 'import-campaign', 'export-campaign']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /id="toggle-activity"/);
  assert.match(html, /<option value="play" selected>PLAY<\/option>/);
  assert.match(html, /id="encounter-details"[^>]*hidden/);
  assert.doesNotMatch(html, /PERSONNEL INTAKE TERMINAL|CAMPAIGN TERMINAL|UPGRADED FROM|RULES ARE RESOLVED BY/);
  assert.doesNotMatch(html, /DRAG TOKENS \/\/ DRAG EMPTY MAP/);
  assert.match(app, /headerCampaignName\.textContent = active/);
  assert.match(app, /encounterWorkspaceActive \? 'PERSONAL COMBAT' : 'SUBSECTOR NAVIGATION'/);
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

  assert.match(html, /id="operations-tab-navigation"/);
  assert.match(html, />NAV<\/button>/);
  assert.match(app, /operationsDeskTab = 'navigation'/);
  assert.match(app, /setOperationsDeskTab\('navigation'\)/);
  assert.match(app, /button\.textContent = `\[ JUMP TO \$\{selected\.name\.toUpperCase\(\)\} \]`/);
  assert.match(app, /classList\.toggle\('navigation-workspace-active', navigationWorkspaceActive\)/);
  assert.match(css, /\.navigation-workspace-active \.operations-panel-scroll \{ display: none; \}/);
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
  assert.match(app, /MAP SUGGESTS/);
  assert.match(app, /encounter-token-\$\{combatant\.actorType\}/);
  assert.match(css, /\.encounter-token-enemy-label/);
  assert.match(css, /\.encounter-token-condition-marker/);
  assert.match(css, /\.roster-card-conditions\.active/);
});

test('v0.17.0 replaces accordion detail panels with a single-select campaign workspace tab strip', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  assert.match(html, /id="app-subtitle" class="subtitle">v0\.17\.1</);
  assert.match(html, /id="workspace-tabs"[^>]*role="tablist"/);
  for (const view of ['play', 'character', 'ship', 'campaign', 'threads']) {
    assert.match(html, new RegExp(`id="workspace-tab-${view}"[^>]*role="tab"`));
  }
  assert.doesNotMatch(html, /toggle-chargen-record/);
  assert.doesNotMatch(html, /campaign-header-links/);
  assert.match(html, /id="selected-system-summary"[\s\S]*id="system-record-section"[\s\S]*<\/section>\s*<\/section>/);
  assert.match(html, /id="toggle-system-details"[^>]*aria-expanded="false"/);
  assert.match(html, /id="operations-tab-encounter"[^>]*>COMBAT<\/button>/);
  assert.match(html, /id="operations-tab-roster"[^>]*>NPCS<\/button>/);
  assert.match(app, /const WORKSPACE_VIEWS = \['play', 'character', 'ship', 'campaign', 'threads'\]/);
  assert.match(app, /function setWorkspaceView\(view\)/);
  assert.match(app, /el\.subsectorSection\.hidden = view !== 'play';/);
  assert.match(app, /el\.personnelSection\.hidden = view !== 'character';/);
  assert.match(app, /el\.workspaceTabShip\.disabled = !shipDocument;/);
  assert.match(app, /if \(kind === 'thread'\) \{\s*setWorkspaceView\('threads'\);/);
  assert.match(app, /el\.headerCharacterName\.addEventListener\('click', \(\) => setWorkspaceView\('character'\)\)/);
  assert.doesNotMatch(app, /detailPanels/);
  assert.doesNotMatch(app, /scrollIntoView/);
  assert.match(css, /\.workspace-tab\[aria-selected="true"\]/);
  assert.match(css, /\.operations-tab \{[\s\S]*white-space: nowrap;/);
  assert.doesNotMatch(css, /\.detail-view-open/);
  assert.match(html, /id="new-character-from-campaign"/);
  assert.match(app, /function startNewCharacter\(\)/);
  assert.match(app, /el\.newCharacterFromCampaign\.hidden = !active;/);
});

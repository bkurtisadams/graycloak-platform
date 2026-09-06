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

  assert.match(html, /v0\.34\.0/);
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

  assert.match(html, /v0\.34\.0/);
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
  assert.match(model, /buildPortServicesPanel/);
  assert.match(model, /TRADE CLASSIFICATIONS/);
});


test('v0.11.0.1 adds base markers, map zoom controls, and a left navigation rail', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  assert.match(html, /v0\.34\.0/);
  assert.match(html, /class="scene"/);
  assert.match(html, /id="map-zoom-out"/);
  assert.match(html, /id="map-zoom-in"/);
  assert.match(html, /id="map-zoom-fit"/);
  assert.match(app, /appendBaseMarkers/);
  assert.match(app, /Scout Base/);
  assert.match(app, /Naval Base/);
  assert.match(app, /setSubsectorZoom/);
  assert.match(css, /\.subsector-base-icon-shape/);
});


test('v0.11.0.2 highlights navigation and port states that require attention', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');
  const model = await read('ui-model.js');

  assert.match(html, /v0\.34\.0/);
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

  assert.match(html, /v0\.34\.0/);
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

  assert.match(html, /v0\.34\.0/);
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

  assert.match(html, /v0\.34\.0/);
  assert.match(html, /id="operations-tab-port"/);
  assert.match(html, /id="operations-tab-trade"/);
  assert.match(html, /id="operations-tab-jobs"/);
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

  assert.match(html, /v0\.34\.0/);
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

  assert.match(html, /v0\.34\.0/);
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

  assert.match(html, /v0\.34\.0/);
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

  assert.match(html, /v0\.34\.0/);
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

  assert.match(html, /v0\.34\.0/);
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

  assert.match(html, /v0\.34\.0/);
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

  assert.match(html, /v0\.34\.0/);
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

  assert.match(html, /v0\.34\.0/);
  assert.match(html, /id="encounter-section"/);
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

  assert.match(html, /v0\.34\.0/);
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

  assert.match(html, /v0\.34\.0/);
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

  assert.match(html, /v0\.34\.0/);
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

  assert.match(html, /v0\.34\.0/);
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
  assert.match(html, /id="app-subtitle" class="subtitle">v0\.34\.0</);
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
  assert.match(app, /if \(encounterWorkspaceActive && activeSceneTab !== 'combat'\)/);
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
  assert.match(html, /id="jump-actions"/);
  assert.ok(html.indexOf('id="jump-actions"') < html.indexOf('id="subsector-map"'));
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
  assert.match(app, /MAP SUGGESTS/);
  assert.match(app, /encounter-token-\$\{combatant\.actorType\}/);
  assert.match(css, /\.encounter-token-enemy-label/);
  assert.match(css, /\.encounter-token-condition-marker/);
  assert.match(css, /\.roster-card-conditions\.active/);
});

test('v0.20.0 lays play out as operations left, scene center, and procedure plus log right', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');
  const model = await read('ui-model.js');

  assert.match(html, /id="app-subtitle" class="subtitle">v0\.34\.0</);
  assert.match(html, /class="campaign-header-strip"/);
  assert.match(html, /class="stage"/);
  assert.match(html, /class="command-rail"/);
  assert.ok(html.indexOf('id="procedure-section"') < html.indexOf('id="activity-panel"'));
  assert.ok(html.indexOf('class="scene"') < html.indexOf('id="context-panel"'));
  assert.ok(html.indexOf('id="center-stack"') < html.indexOf('id="chargen-tables-section"'));
  assert.ok(html.indexOf('id="selected-system-summary"') < html.indexOf('class="canvas"'));
  assert.match(html, /id="play-procedure"/);
  assert.match(html, /id="context-tabs"[^>]*role="tablist"/);
  for (const tab of ['port', 'trade', 'jobs', 'roster']) assert.match(html, new RegExp(`id="operations-tab-${tab}"`));
  assert.doesNotMatch(html, /operations-tab-navigation|operations-tab-situation|operations-tab-encounter|workspace-tab-/);
  assert.match(html, /id="footer-current-name"/);
  assert.match(html, /id="chargen-tables"/);
  assert.match(html, /id="campaign-menu"/);
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
  assert.match(app, /lastMusterRoll\?\.type === 'benefit'/);
  assert.match(app, /lastMusterRoll\?\.type === 'cash'/);
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
  assert.match(css, /\.command-rail/);
  assert.match(css, /\.scene \{ grid-column: 2;/);
  assert.match(html, /id="new-character-from-campaign"/);
  assert.match(app, /function startNewCharacter\(\)/);
  assert.match(app, /el\.newCharacterFromCampaign\.hidden = !active;/);
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
  assert.match(app, /\['MUSTER ROLLS', character\.musterOut/);
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
  assert.ok(html.indexOf('id="campaign-menu"') < html.indexOf('id="header-campaign-name"'));
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
  assert.match(app, /renderPanelModel\(el\.commerceRecord/);
  assert.match(app, /renderPanelModel\(el\.contractRecord/);

  assert.doesNotMatch(app, /el\.portServicesRecord\.textContent = build/);
  assert.doesNotMatch(app, /el\.commerceRecord\.textContent = lines/);
  assert.doesNotMatch(app, /el\.contractRecord\.textContent = build/);
  assert.doesNotMatch(app, /function commerceLine\(/);

  assert.match(app, /onAction: \(offerId\) => acceptContractOffer\(offerId\)/);
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

  const strip = html.slice(html.indexOf('id="scene-status-strip"'), html.indexOf('class="canvas"'));
  assert.match(strip, /CURRENT PORT/);
  assert.match(strip, /SELECTED DESTINATION/);
  assert.match(strip, /id="scene-ship-name"/);
  assert.match(strip, /id="jump-actions"/);

  const map = html.slice(html.indexOf('id="subsector-section"'), html.indexOf('id="encounter-section"'));
  for (const id of ['map-zoom-out', 'map-zoom-in', 'map-zoom-fit', 'map-zoom-label', 'subsector-legend']) {
    assert.match(map, new RegExp(`id="${id}"`));
  }

  assert.match(app, /let activeSceneTab = 'system';/);
  assert.match(app, /function setSceneTab\(tab\)/);
  assert.match(app, /if \(tab === 'combat' && !activeEncounterAtCurrentSystem\(\)\) return;/);
  assert.match(app, /el\.personnelSection\.hidden = activeSceneTab !== 'character';/);
  assert.match(app, /el\.subsectorSection\.hidden = activeSceneTab !== 'system';/);
  assert.match(app, /el\.encounterSection\.hidden = activeSceneTab !== 'combat';/);
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

test('v0.31.0 places the rail by id, drops center-stack, and pins SHIP STATUS above the tabs', async () => {
  const html = await read('index.html');
  const css = await read('styles.css');

  assert.doesNotMatch(html, /center-stack/);
  const stage = html.slice(html.indexOf('class="stage"'), html.indexOf('id="help-panel"'));
  assert.match(stage, /<aside id="context-panel" class="context"/);

  const rail = html.slice(html.indexOf('id="context-panel"'), html.indexOf('class="context-scroll"'));
  assert.ok(rail.indexOf('id="live-ship-panel"') < rail.indexOf('id="context-tabs"'));

  assert.match(css, /\.stage > #context-panel \{ grid-row: 1; grid-column: 1; \}/);
  assert.match(css, /\.stage > \.scene \{ grid-row: 1; grid-column: 2; \}/);
  assert.match(css, /\.stage > \.command-rail \{ grid-row: 1; grid-column: 3; \}/);

  // The inner panels must not inherit the rail's full-height treatment.
  assert.match(css, /\.context-panel \{ height: auto; overflow: visible; display: block; \}/);
  assert.match(css, /#context-panel \.context-scroll \{ flex: 1 1 auto; min-height: 0; max-height: none;/);
  assert.match(css, /#context-panel \.context-tab\[aria-selected="true"\] \{[\s\S]*?background: var\(--tab-selected\)/);

  assert.doesNotMatch(html, /id="scene-ship-meta-two"/);
  assert.doesNotMatch(css, /box-shadow/);
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
  assert.match(app, /injured \? `\$\{key\} \$\{value\}\/\$\{base\}` : `\$\{key\} \$\{value\}`/);
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
  assert.doesNotMatch(css, /max-height: 44vh/); // superseded; deleted v0.32.0
  assert.match(css, /\.command-rail > \.activity-panel \{\s*flex: 1 1 0%;\s*min-height: 120px;/);
  assert.match(css, /#context-panel \.live-ship-panel \{ max-height: 34vh; \}/);

  // Nothing in the scene may impose an intrinsic floor on its column.
  assert.match(css, /\.stage > \.scene > \.canvas \{ flex: 1 1 auto; min-height: 0; max-height: 100%; overflow: hidden; \}/);
  assert.match(css, /\.stage > \* \{ min-height: 0; \}/);
  assert.doesNotMatch(css, /box-shadow/);
});

test('v0.31.0 moves character into the rail and makes the stage a single row', async () => {
  const html = await read('index.html');
  const css = await read('styles.css');

  // The rail leads with character, then ship, then the port tabs.
  const rail = html.slice(html.indexOf('id="context-panel"'), html.indexOf('class="context-scroll"'));
  assert.ok(rail.indexOf('class="campaign-header-strip"') < rail.indexOf('id="live-ship-panel"'));
  assert.ok(rail.indexOf('id="live-ship-panel"') < rail.indexOf('id="context-tabs"'));
  assert.doesNotMatch(rail, /campaign-header-kicker">CHARACTER/);

  // Single row: nothing spans, so no auto row can be sized by content.
  assert.match(css, /\.stage \{\s*display: grid;\s*grid-template-rows: minmax\(0, 1fr\);\s*grid-template-columns: 440px minmax\(0, 1fr\) 340px;/);
  for (const rule of [
    /\.stage > #context-panel \{ grid-row: 1; grid-column: 1; \}/,
    /\.stage > \.scene \{ grid-row: 1; grid-column: 2; \}/,
    /\.stage > \.command-rail \{ grid-row: 1; grid-column: 3; \}/
  ]) assert.match(css, rule);
  assert.doesNotMatch(css, /grid-row: 1 \/ 3/);

  // The strip is no longer a stage child.
  const stage = html.slice(html.indexOf('class="stage"'), html.indexOf('id="context-panel"'));
  assert.doesNotMatch(stage, /campaign-header-strip/);
  assert.doesNotMatch(css, /box-shadow/);
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
  assert.match(html, /<div class="activity-header">\s*<h2 id="activity-heading" class="activity-title">LOG<\/h2>\s*<select id="activity-filter" class="activity-filter" aria-label="Show">/);
  assert.match(html, /<select id="activity-order" class="activity-order" aria-label="Order"><option value="newest" selected>NEWEST<\/option>/);
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

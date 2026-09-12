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

  assert.match(html, /v0\.96\.0/);
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

  assert.match(html, /v0\.96\.0/);
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

  assert.match(html, /v0\.96\.0/);
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

  assert.match(html, /v0\.96\.0/);
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

  assert.match(html, /v0\.96\.0/);
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

  assert.match(html, /v0\.96\.0/);
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

  assert.match(html, /v0\.96\.0/);
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

  assert.match(html, /v0\.96\.0/);
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

  assert.match(html, /v0\.96\.0/);
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

  assert.match(html, /v0\.96\.0/);
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

  assert.match(html, /v0\.96\.0/);
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

  assert.match(html, /v0\.96\.0/);
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

  assert.match(html, /v0\.96\.0/);
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

  assert.match(html, /v0\.96\.0/);
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

  assert.match(html, /v0\.96\.0/);
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

  assert.match(html, /v0\.96\.0/);
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
  assert.match(encounter, /roundState: \{ declaredActions: \[\] \}/);
});

test('v0.14.1 gives the encounter map a fluid viewBox camera and live token drag preview', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  assert.match(html, /v0\.96\.0/);
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

  assert.match(html, /v0\.96\.0/);
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

  assert.match(html, /v0\.96\.0/);
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
  assert.match(html, /id="app-subtitle" class="subtitle">v0\.96\.0</);
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

  assert.match(html, /id="app-subtitle" class="subtitle">v0\.96\.0</);
  assert.match(html, /class="campaign-header-strip"/);
  assert.match(html, /class="terminal shell"/);
  assert.match(html, /class="shell-rail"/);
  assert.ok(html.indexOf('id="procedure-section"') < html.indexOf('id="activity-panel"'));
  assert.ok(html.indexOf('class="scene shell-stage"') < html.indexOf('id="sidebar"'));
  assert.ok(html.indexOf('id="center-stack"') < html.indexOf('id="chargen-tables-section"'));
  assert.ok(html.indexOf('id="selected-system-summary"') < html.indexOf('class="canvas"'));
  assert.match(html, /id="play-procedure"/);
  assert.match(html, /id="context-tabs"[^>]*role="tablist"/);
  for (const tab of ['port', 'trade', 'jobs', 'roster']) assert.match(html, new RegExp(`id="operations-tab-${tab}"`));
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
  // v0.36.0: COMBAT is selectable without a live encounter so a referee can
  // start one from the scene; a live encounter still pulls the scene to it.
  assert.match(app, /if \(encounterWorkspaceActive && !viewedSceneIsBoard\(\)\)/);
  assert.match(app, /applyDocumentWindow\(characterWindow\);/);
  assert.match(app, /el\.subsectorSection\.hidden = board;/);
  assert.match(app, /el\.encounterSection\.hidden = !board;/);
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
  // The sidebar leads with its tabs, then WHAT NOW?, then the character strip.
  const sidebar = html.slice(html.indexOf('id="sidebar"'), html.indexOf('class="sidebar-body"'));
  assert.ok(sidebar.indexOf('class="sidebar-tabs"') < sidebar.indexOf('id="procedure-section"'));
  assert.ok(sidebar.indexOf('id="procedure-section"') < sidebar.indexOf('class="campaign-header-strip"'));
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
  const port = html.slice(html.indexOf('data-sidebar-panel="port"'), html.indexOf('data-sidebar-panel="journal"'));
  for (const id of ['port-services-section', 'commerce-section', 'contract-section', 'situation-section']) assert.ok(port.includes(`id="${id}"`), `${id} in PORT`);
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
  assert.match(app, /import \{ synchronizeEncounterDocuments \} from '\.\.\/src\/combatant-document-sync\.js';/);
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
  assert.match(css, /\.encounter-token-selected-ring \{ fill: none; stroke: #d8b53a/);
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
  assert.match(app, /makePortButton\('START COMBAT', openCombatSetupDialog\)/);
  // Two places, both the tracker slot: no encounter yet, and one just ended.
  // The actions row no longer repeats it.
  assert.equal(app.match(/makePortButton\('START COMBAT', openCombatSetupDialog\)/g).length, 2);
  assert.doesNotMatch(app, /el\.encounterActions\.append\(button\);/);

  // The tracker always states status; orders only replace it while active.
  assert.match(app, /const status = combatantRulesStatus\(combatant\)\.toUpperCase\(\);/);
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
  assert.equal(app.match(/autoPublishEncounterView\(result\.encounter\);/g).length, 2);

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
  assert.match(view, /return null;\s*\}\s*export function buildPublishedView/);
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
  assert.match(index, /v0\.96\.0/);
  assert.match(playerPage, /PLAYER v0\.96\.0/);
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
  assert.match(app, /RUN CLOSER/);
  assert.match(player, /RUN CLOSER/);
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
  assert.match(app, /from '\.\/chargen-view\.js'/);
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
  assert.match(html, /ENTER v0\.96\.0/);
  assert.match(html, /id="enter-signin"/);
  assert.match(html, /id="enter-character-list"/);
  assert.match(html, /id="enter-new-character"/);
  assert.match(html, /<article id="enter-sheet" class="traveller-character-sheet player-sheet enter-sheet"/);
  assert.match(html, /<script type="module" src="enter\.js">/);
  assert.match(enter, /from '\.\/chargen-view\.js'/);
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
  assert.match(svg, /export function renderSubsectorMap\(\{ subsector, columns, rows, current = null, selected = null, reachable = new Map\(\), onSelect = null \} = \{\}\)/);
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
  assert.match(app, /const scene = sceneDocuments\.find\(\(entry\) => entry\.identity\.id === el\.combatScene\?\.value\) \?\? null;/);
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
  assert.match(html, /<main class="terminal shell"/);
  for (const area of ['shell-masthead', 'shell-rail', 'shell-stage', 'shell-sidebar']) assert.ok(html.includes(`class="${area}"`) || html.includes(` ${area}"`), area);
  for (const tab of ['chat', 'combat', 'scenes', 'actors', 'vehicles', 'port', 'journal', 'tables', 'players', 'settings']) {
    assert.ok(html.includes(`data-sidebar-tab="${tab}"`), `tab ${tab}`);
    assert.ok(html.includes(`data-sidebar-panel="${tab}"`), `panel ${tab}`);
  }
  assert.doesNotMatch(html, /id="campaign-menu"|id="referee-menu"/);
  assert.match(app, /const SIDEBAR_TABS = \['chat', 'combat', 'scenes', 'actors', 'vehicles', 'port', 'journal', 'tables', 'players', 'settings'\];/);
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

test('v0.75.1 the sidebar opens on its tabs, with WHAT NOW? and the character as collapsible strips', async () => {
  const html = await read('index.html');
  const css = await read('styles.css');
  const sidebar = html.slice(html.indexOf('id="sidebar"'), html.indexOf('class="sidebar-body"'));
  assert.ok(sidebar.indexOf('class="sidebar-tabs"') < sidebar.indexOf('id="sidebar-whatnow"'));
  assert.ok(sidebar.indexOf('id="sidebar-whatnow"') < sidebar.indexOf('id="sidebar-character"'));
  assert.match(css, /\.shell-masthead \.masthead-main \{ display: flex; flex-wrap: nowrap;/);
  assert.match(css, /#sidebar-whatnow > #procedure-section \{[^}]*max-height: 34vh; overflow: auto; \}/);
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

test('v0.76.1 picking a sidebar tab closes WHAT NOW? and the character strip so the tab is not hidden below them', async () => {
  const app = await read('app.js');
  const html = await read('index.html');
  assert.doesNotMatch(html, /id="sidebar-whatnow" class="sidebar-strip" open/);
  assert.match(app, /const changed = tab !== sidebarTab;/);
  assert.match(app, /if \(changed\) \{\n    const whatnow = document\.querySelector\('#sidebar-whatnow'\);/);
  assert.match(app, /if \(whatnow\) whatnow\.open = false;/);
});

test('v0.76.2 the token menu survives a bad foe, explains why the last combatant on a side cannot be removed, and reinforcements can be dragged into a live fight', async () => {
  const app = await read('app.js');
  assert.match(app, /try \{\n        const band = encounterPairRange\(combatant, foe\);/);
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

test('v0.79.0 keeps an explicit canvas and follows Foundry control behavior', async () => {
  const app = await read('app.js');
  const html = await read('index.html');
  const css = await read('styles.css');
  const win = await read('../src/document-window.js');
  assert.match(html, /id="app-subtitle" class="subtitle">v0\.96\.0</);
  assert.match(html, /class="scene-tab scene-tab-combat-proxy"[^>]*hidden/);
  assert.match(css, /grid-template-columns: 80px minmax\(0, 1fr\) 360px;/);
  assert.match(css, /\.shell-stage \.canvas \{[\s\S]*?height: auto;[\s\S]*?overflow: hidden;/);
  assert.match(css, /\.shell-stage #subsector-section,[\s\S]*?position: absolute;[\s\S]*?inset: 0;/);
  assert.match(css, /\.shell-rail \{[\s\S]*?grid-template-columns: 34px 34px;/);
  assert.match(css, /\.shell-rail \.scene-tabs \{[\s\S]*?grid-column: 1;/);
  assert.match(css, /\.rail-tools \{[\s\S]*?grid-column: 2;/);
  assert.match(css, /\.shell-sidebar \{ grid-template-columns: 52px minmax\(0, 308px\); \}/);
  assert.match(css, /\.sidebar-tab-icon \{ font-size: 22px;/);
  assert.match(css, /\.sidebar-collapsed \.shell-sidebar \{ grid-template-columns: 52px 0; \}/);
  assert.match(app, /panel\.dataset\.sidebarPanel !== sidebarTab;/);
  assert.match(app, /sidebarCollapsed = true; applySidebar\(\); return;/);
  assert.match(app, /if \(button\.dataset\.sidebarTab === 'combat'\) setSceneTab\('combat'\);/);
  assert.match(app, /storageKey: 'traveller\.character-window\.v2'/);
  assert.match(win, /width: 520, height: 500, minWidth: 300, minHeight: 200/);
});

test('v0.79.1 the legacy narrow-viewport rule no longer touches the shell, and the shell owns its own breakpoints', async () => {
  const css = await read('styles.css');
  assert.match(css, /\.terminal:not\(\.shell\) \{ position: static; inset: auto;/);
  assert.match(css, /\.terminal\.shell \{\n  position: fixed; inset: 0;/);
  // The shell's own breakpoints come after every fixed-column shell rule, so
  // they are not silently overridden at equal specificity.
  const lastFixed = css.lastIndexOf('grid-template-columns: 88px minmax(0, 1fr) 392px');
  const breakpoint = css.lastIndexOf('@media (max-width: 1100px)');
  assert.ok(breakpoint > lastFixed, 'shell breakpoint must follow the fixed-column rule');
  assert.match(css, /@media \(max-width: 900px\) \{\n  \.terminal\.shell,\n  \.terminal\.shell\.sidebar-collapsed \{ grid-template-columns: 48px minmax\(0, 1fr\) 52px; \}/);
});

test('v0.79.2 shell grid items stretch to the row instead of sizing to content', async () => {
  const css = await read('styles.css');
  assert.match(css, /\.terminal\.shell \{\n  position: fixed; inset: 0;[^}]*align-items: stretch; justify-items: stretch;/);
  assert.match(css, /\.shell-rail, \.shell-stage, \.shell-sidebar \{ align-self: stretch; justify-self: stretch; margin: 0; min-height: 0; height: auto; \}/);
});

test('v0.80.0 the canvas is the window: stage as base layer, controls and sidebar floating over it', async () => {
  const css = await read('styles.css');
  const block = css.slice(css.indexOf('v0.80.0: the canvas is the window'));
  assert.match(block, /\.terminal\.shell, \.terminal\.shell\.sidebar-collapsed \{\n  display: block;/);
  assert.match(block, /\.shell-stage \{\n  position: absolute; inset: 0; z-index: 1;/);
  assert.match(block, /\.shell-rail \{\n  position: absolute; top: 40px; left: 8px;/);
  assert.match(block, /\.shell-sidebar \{\n  position: absolute; top: 34px; right: 0; bottom: 0; z-index: 25;/);
  // Strip on the far right edge, drawer to its left; collapsed leaves the strip.
  assert.match(block, /\.shell-sidebar \.sidebar-tabs \{\n  grid-column: 2; grid-row: 1 \/ -1;/);
  assert.match(block, /\.sidebar-collapsed \.shell-sidebar \{ grid-template-columns: 0 52px; \}/);
});

test('v0.80.1 the sidebar starts collapsed, TABLES yields to CHAT once a campaign is active, and the strips render after layout', async () => {
  const app = await read('app.js');
  const css = await read('styles.css');
  assert.match(app, /let sidebarCollapsed = true;/);
  assert.match(app, /if \(active && !sidebarChosen && sidebarTab === 'tables'\) \{ sidebarTab = 'chat'; \}/);
  const render = app.slice(app.indexOf('function render() {'));
  assert.ok(render.indexOf('applyCampaignLayout();') < render.indexOf('renderSidebarStrips();'), 'strips render after the layout pass');
  assert.match(css, /\.shell-sidebar > \.sidebar-body \{ background: var\(--paper\); \}/);
  assert.match(css, /\.shell-stage \{ padding-right: 52px; \}/);
});

test('v0.80.2 the drawer pushes the stage instead of covering it, and the world map right-drag pans', async () => {
  const app = await read('app.js');
  const css = await read('styles.css');
  assert.match(css, /\.terminal\.shell:not\(\.sidebar-collapsed\) \.shell-stage \{ padding-right: calc\(360px \+ 52px\); \}/);
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
  assert.match(app, /el\.activityFeed\.scrollTop = activityOrder === 'newest' \? 0 : el\.activityFeed\.scrollHeight;/);
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
  const css = await read('styles.css');
  assert.match(html, /<details id="sidebar-character" class="sidebar-strip" hidden>/);
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
  assert.match(app, /defaultSize: tab === 'chat' \? \{ width: 360, height: 560 \} : \{ width: 380, height: 520 \}/);
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
  assert.match(app, /const phase = declaringCount >= liveCount && liveCount > 0 \? 'READY TO RESOLVE' : `DECLARING \$\{declaringCount\}\/\$\{liveCount\}`;/);
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
  assert.match(css, /\.scene-nav \{ position: absolute; top: 40px;/);
  assert.match(css, /\.scene-nav \{ top: 38px; left: 8px; transform: none; \}/);
  // On load: the activated scene, unless this session viewed another.
  assert.match(app, /function restoreViewedScene\(\)/);
  assert.match(app, /: campaignDocument\?\.activeSceneId && valid\(campaignDocument\.activeSceneId\) \? campaignDocument\.activeSceneId/);
});

test('v0.92.1 the manual dialog is unreachable while a board is on the canvas', async () => {
  const app = await read('app.js');
  const css = await read('styles.css');
  assert.match(app, /if \(viewedSceneIsBoard\(\)\) \{\n    setStatus\('A SCENE IS ON THE CANVAS/);
  // With a scene viewed, START COMBAT fights on that scene instead.
  assert.match(app, /\? makePortButton\('START COMBAT', \(\) => startCombatFromScene\(scene\)\)\n      : makePortButton\('START COMBAT', openCombatSetupDialog\);/);
  // The bar no longer covers the subsector's header.
  assert.match(css, /\.shell-stage \{ padding-top: 66px; \}/);
});

test('v0.92.2 the navigation bar clears the tool rail rather than stacking on it', async () => {
  const css = await read('styles.css');
  // The rail is an overlay at left:8px; the stage reserves 96px for it, so the
  // bar starts clear of that and sits above it in the stack.
  assert.match(css, /\.scene-nav \{ left: 104px; z-index: 26; \}/);
  const railZ = css.match(/\.shell-rail \{[^}]*z-index: (\d+)/)?.[1];
  if (railZ) assert.ok(Number(railZ) < 26, 'the bar must sit above the rail');
});

test('v0.92.3 START COMBAT on a scene is disabled with a reason until tokens are tracked', async () => {
  const app = await read('app.js');
  // Resolving a fight clears the tracker, so the button had nothing to start.
  assert.match(app, /const needParty = !tracked\.some\(\(token\) => token\.side === 'party'\);/);
  assert.match(app, /button\.disabled = needParty \|\| needFoe;/);
  assert.match(app, /has no tokens at all\. Drag an actor from the ACTORS tab/);
  // Both routes guarded, not just the one that threw.
  assert.equal(app.match(/const needFoe = !tracked\.some/g)?.length, 2);
});

test('v0.92.4 starting a fight leaves the scene tracker intact so the group can fight again', async () => {
  const app = await read('app.js');
  // The clear-on-start is gone: it emptied the very list startCombatFromScene
  // reads, while the referee looked at the encounter's combatant list.
  const start = app.slice(app.indexOf('function startCombatFromScene'), app.indexOf('function startCombatFromScene') + 4000);
  assert.doesNotMatch(start, /clearSceneCombatTracker/);
  // CLEAR TRACKER remains the deliberate way to empty it — as of v0.95.4,
  // by discarding the resolved encounter, and it is always shown once a
  // fight is resolved rather than gated behind an "AFTER THE FIGHT" block.
  assert.doesNotMatch(app, /clearSceneCombatTracker/);
  assert.match(app, /const clear = makePortButton\('CLEAR TRACKER', \(\) => \{/);
  assert.match(app, /if \(!window\.confirm\(`Empty the combat tracker\? \$\{encounter\.identity\.title\} is removed from the tracker; the tokens stay on the board\.`\)\) return;/);
  assert.match(app, /discardEncounter\(encounter\);/);
});

test('v0.93.0 a resolved fight can be put away or reset, and wounds otherwise persist', async () => {
  const app = await read('app.js');
  // A resolved fight never left the panel before: nothing dismissed it.
  assert.match(app, /let dismissedEncounterIds = new Set\(\);/);
  assert.match(app, /&& !\(entry\.status !== 'active' && dismissedEncounterIds\.has\(entry\.identity\.id\)\)/);
  assert.match(app, /function putAwayEncounter\(encounter\)/);
  assert.match(app, /function resetCombat\(encounter\)/);
  // RESET restores every combatant and carries it out to the documents.
  assert.match(app, /next = restoreCombatant\(next, \{ combatantId: combatant\.id \}\)\.encounter;/);
  assert.match(app, /applyEncounterDocumentSync\(next\);/);
  assert.match(app, /logActivity\('COMBAT', `Referee resets \$\{next\.identity\.title\}/);
  // The after-fight group, and nothing that silently undoes wounds.
  assert.match(app, /textContent: 'OUTCOME'/);
  assert.match(app, /reset\.title = 'Return every combatant to full strength and put the fight away/);
  assert.match(app, /away\.title = 'Return the panel to the staged scene\. The fight and its wounds stand/);
});

test('v0.93.1 a reset leaves the group ready to fight again, and TRACK ALL fills the tracker', async () => {
  const app = await read('app.js');
  // Pre-fight has to mean ready to fight: the flags START COMBAT reads are
  // restored for the combatants that were just healed.
  assert.match(app, /const actorIds = new Set\(next\.combatants\.map\(\(entry\) => entry\.sourceActorId \?\? entry\.sourceCharacterId \?\? entry\.id\)\);/);
  assert.match(app, /\.reduce\(\(acc, token\) => setSceneTokenCombat\(acc, token\.id, true\), doc\)\);/);
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
  assert.match(app, /has no tokens at all\. Drag an actor from the ACTORS tab onto the board/);
});

test('v0.94.0 the encounter has a setup phase, and the tracker has one scrollbar', async () => {
  const doc = await read('../src/encounter-document.js');
  const css = await read('styles.css');
  // Foundry's model: the encounter exists first and collects combatants.
  assert.match(doc, /export const ENCOUNTER_STATUSES = Object\.freeze\(\['setup', 'active'/);
  assert.match(doc, /export function addEncounterCombatantFromCharacter\(document, \{ character, loadout = \{\}, column, row \} = \{\}\)/);
  assert.match(doc, /export function beginEncounter\(document, \{ surpriseConditions = \{\}, dice \} = \{\}\)/);
  // Surprise belongs to the start of the fight, not to creation.
  assert.match(doc, /next\.surprise = \{\n {4}\.\.\.resolvePersonalSurprise\(\{/);
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
  assert.match(app, /Close the combat tracker and empty it\?/);
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
  assert.match(fn, /ENCOUNTER_RANGE_LINE_ESCAPE_BANDS \+ 1/);
});

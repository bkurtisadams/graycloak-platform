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
  assert.match(html, /TRAVELLER \/\/ PERSONNEL INTAKE TERMINAL/);
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

  assert.match(html, /CLIENT v0\.(?:11\.2(?:\.1)?|12\.0)/);
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

  assert.match(html, /CLIENT v0\.(?:11\.2(?:\.1)?|12\.0)/);
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

  assert.match(html, /NEW CAMPAIGN/);
  assert.match(html, /SAVE CAMPAIGN/);
  assert.match(html, /LOAD CAMPAIGN/);
  assert.match(html, /EXPORT CAMPAIGN/);
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
  assert.match(app, /refuelShipToCapacity/);
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

  assert.match(html, /CLIENT v0\.(?:11\.2(?:\.1)?|12\.0)/);
  assert.match(html, /class="subsector-workspace"/);
  assert.match(html, /class="navigation-plan-panel"/);
  assert.match(html, /id="map-zoom-out"/);
  assert.match(html, /id="map-zoom-in"/);
  assert.match(html, /id="map-zoom-fit"/);
  assert.match(app, /appendBaseMarkers/);
  assert.match(app, /Scout Base/);
  assert.match(app, /Naval Base/);
  assert.match(app, /setSubsectorZoom/);
  assert.match(css, /grid-template-columns:\s*minmax\(260px, 300px\) minmax\(0, 1fr\)/);
  assert.match(css, /\.subsector-base-icon-shape/);
});


test('v0.11.0.2 highlights navigation and port states that require attention', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  assert.match(html, /CLIENT v0\.(?:11\.2(?:\.1)?|12\.0)/);
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

  assert.match(html, /CLIENT v0\.(?:11\.2(?:\.1)?|12\.0)/);
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

  assert.match(html, /CLIENT v0\.(?:11\.2(?:\.1)?|12\.0)/);
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

  assert.match(html, /CLIENT v0\.(?:11\.2\.1|12\.0)/);
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

  assert.match(html, /CLIENT v0\.12\.0/);
  assert.match(html, /id="operations-tab-situation"/);
  assert.match(html, /id="situation-section"/);
  assert.match(app, /generatePatronContact/);
  assert.match(app, /ensureArrivalSituation/);
  assert.match(app, /resolveRefereeSkillCheck/);
  assert.match(app, /logActivity\('SITUATION'/);
  assert.match(model, /buildSituationRecord/);
  assert.match(loader, /SITUATION/);
});

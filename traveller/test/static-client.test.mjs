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

test('v0.10.1 retains contextual help and highlighted legal actions', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  assert.match(html, /CLIENT v0\.10\.1/);
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

test('v0.10.1 specialization UI uses engine-supplied legal choices instead of free text', async () => {
  const html = await read('index.html');
  const app = await read('app.js');

  assert.match(html, /CLIENT v0\.10\.1/);
  assert.match(app, /available\.choices\.specializations/);
  assert.doesNotMatch(app, /id = 'skill-specialization'/);
  assert.doesNotMatch(app, /id = 'benefit-specialization'/);
  assert.doesNotMatch(app, /placeholder = 'e\.g\. Rifle'/);
});


test('v0.10.1 exposes character and ship document actions after chargen', async () => {
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


test('v0.10.1 exposes opt-in character, ship, and registry generators', async () => {
  const html = await read('index.html');
  const app = await read('app.js');

  assert.match(html, /id="random-character-name"/);
  assert.match(html, /id="random-ship-name"/);
  assert.match(html, /id="generate-ship-registry"/);
  assert.match(app, /generateCharacterName/);
  assert.match(app, /generateShipName/);
  assert.match(app, /generateShipRegistry/);
});


test('v0.10.1 routes chargen, gameplay character, and ship JSON through the document loader', async () => {
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


test('v0.10.1 exposes the persistent campaign shell and portable bundle controls', async () => {
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


test('v0.10.1 exposes an authored subsector map and jump controls', async () => {
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


test('v0.10.1 exposes compact Book 3 system/world records', async () => {
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


test('v0.10.1 exposes a persistent right-rail activity log', async () => {
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

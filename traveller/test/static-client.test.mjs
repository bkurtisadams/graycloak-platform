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

test('v0.6.0 retains contextual help and highlighted legal actions', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');

  assert.match(html, /CLIENT v0\.6\.0/);
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

test('v0.6.0 specialization UI uses engine-supplied legal choices instead of free text', async () => {
  const html = await read('index.html');
  const app = await read('app.js');

  assert.match(html, /CLIENT v0\.6\.0/);
  assert.match(app, /available\.choices\.specializations/);
  assert.doesNotMatch(app, /id = 'skill-specialization'/);
  assert.doesNotMatch(app, /id = 'benefit-specialization'/);
  assert.doesNotMatch(app, /placeholder = 'e\.g\. Rifle'/);
});


test('v0.6.0 exposes a separate gameplay character export after chargen', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const model = await read('ui-model.js');

  assert.match(html, /SAVE CHARGEN JSON/);
  assert.match(html, /LOAD CHARGEN JSON/);
  assert.match(app, /createCharacterDocument/);
  assert.match(app, /exportCharacterDocument/);
  assert.match(app, /EXPORT CHARACTER/);
  assert.match(model, /FINAL PERSONNEL RECORD/);
  assert.match(model, /SHIP ENTITLEMENT/);
});

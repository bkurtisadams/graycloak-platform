// play-page.test.mjs — the new play page stays separate from the old client.
//
// The approved layout was lost once already by being implemented inside
// app.js and styles.css. These pins make that impossible to do by accident:
// the play page may share pure modules with the old client, never its
// controller, its view model or its stylesheet.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const client = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'client');
const read = (file) => readFile(path.join(client, file), 'utf8');
const PLAY_MODULES = ['play.js', 'play-views.js', 'play-sample.js', 'play-cloud.js'];
const FORBIDDEN = ['app.js', 'ui-model.js', 'boot.mjs', 'player.js', 'enter.js', 'theme.js', 'chargen-view.js', 'combat-view.js'];

test('the play page imports nothing from the old client', async () => {
  for (const file of PLAY_MODULES) {
    const source = await read(file);
    const specifiers = [...source.matchAll(/from\s*['"]([^'"]+)['"]/g)].map((match) => match[1].split('?')[0]);
    for (const specifier of specifiers) {
      assert.ok(!FORBIDDEN.some((name) => specifier.endsWith(`/${name}`)), `${file} imports ${specifier}`);
    }
  }
});

test('the play page loads only its own stylesheet and script', async () => {
  const html = await read('play.html');
  assert.ok(!/styles\.css/.test(html), 'play.html must not load styles.css');
  assert.deepEqual([...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"?]+)/g)].map((m) => m[1]), ['./play.css']);
  // v0.327.0: the rules-version check runs as its own module, beside play.js.
  assert.deepEqual([...html.matchAll(/<script[^>]+src="([^"?]+)/g)].map((m) => m[1]), ['./rules-check.js', './play.js']);
});

test('the play page has the four regions and nothing else at the top level', async () => {
  const html = await read('play.html');
  const shell = html.slice(html.indexOf('id="shell"'));
  // v0.253.0: the talk strip along the bottom is gone; chat is the first tab
  // of the sidebar, which took the drawer's place.
  for (const region of ['class="mast"', 'class="now"', 'class="scene"', 'class="drawer sidebar"', 'class="side-chat"', 'id="side-tabs"']) {
    assert.ok(shell.includes(region), `missing ${region}`);
  }
  assert.equal(shell.includes('<footer class="talk"'), false, 'no separate chat strip');
});

test('views hold no state: play-views.js declares no module-level let', async () => {
  const source = await read('play-views.js');
  assert.equal(/^let\s/m.test(source), false);
});

// v0.328.0 (Kurt's screenshot): the seat page drew Far Meridian alone, and
// the world card covered the map's heading.
test('v0.328.0 the seat page draws the published map, captions under its head', async () => {
  const seat = await read('seat.js');
  assert.match(seat, /map: envelope\.map \?\? undefined/);
  const css = await read('play.css');
  assert.match(css, /\.seat-map \{ position: relative; \}/);
});

// v0.329.0: the seat page's buttons are requests the server carries out.
test('v0.329.0 the seat page sends requests and shows their answers', async () => {
  const seat = await read('seat.js');
  assert.match(seat, /sendPlayerRequest\(campaignId, \{ uid, characterId, command, value \}\)/);
  assert.match(seat, /watchPlayerRequest\(campaignId, id,/);
  assert.match(seat, /shipFightScene\(envelope\.shipFight, \{ onCommand: \(command\) => sendRequest\(command\) \}\)/);
  assert.match(seat, /function situationCard\(envelope\)/);
  const publish = await read('publish.js');
  assert.match(publish, /collection\('requests'\)\.doc\(\)/);
  assert.match(publish, /status: 'pending'/);
});

// v0.329.2 (Kurt: "I see no place to set the referee to the game"): the
// switch was at the foot of the port column's patrons panel.
test('v0.329.2 who referees is chosen in Settings', async () => {
  const views = await read('play-views.js');
  const settings = views.slice(views.indexOf('function settingsDrawer('), views.indexOf('// v0.264.0: the Compendium'));
  assert.match(settings, /Referee \(this campaign\)/);
  assert.match(settings, /handlers\.onPeople\('patrons:referee', \{ referee: 'game' \}\)/);
  assert.doesNotMatch(views.slice(views.indexOf('function patronsPanel('), views.indexOf('function settingsDrawer(')), /patrons:referee/);
});

// v0.329.3 (Kurt: the seat showed almost nothing): the situation was below
// the map, off the screen; it heads the left column now, as on the play page.
test('v0.329.3 the seat page puts the situation and its buttons at the top of the left column', async () => {
  const seat = await read('seat.js');
  assert.match(seat, /\$\('now'\)\.replaceChildren\(\.\.\.\[situation, h\('section', \{ class: 'lead' \}, h\('h2', \{ text: 'You play' \}\)/);
  assert.doesNotMatch(seat, /body\.push\(situation\)/);
});

// v0.330.0: the server's game version on every answer and save; the player's
// page says when it differs, or when no answer comes.
test('v0.330.0 the player page names a server running another version, and a missing answer', async () => {
  const page = await read('seat.js');
  assert.match(page, /export function engineMismatch\(engine, page = PAGE_VERSION\)/);
  assert.match(page, /engineMismatch\(state\.request\?\.engine \?\? envelope\.engine \?\? null\)/);
  assert.match(page, /No answer from the game after 20 seconds/);
  const fn = await readFile(new URL('../functions/index.js', import.meta.url), 'utf8');
  assert.match(fn, /doneAt: Date\.now\(\), engine: ENGINE \}/);
  assert.match(fn, /homeSavedAt: home\.savedAt, engine: ENGINE \}/);
});

// v0.331.0 (Kurt's screenshot): unwritten rumours pushed the ship's course
// off the port column; the Players tab is shown as Travellers.
test('v0.331.0 rumours to write live in the Journal; the port column leads with the ship; Travellers tab', async () => {
  const views = await read('play-views.js');
  assert.match(views, /export function rumorCards\(rumors, handlers\)/);
  assert.ok(views.includes("to write \\u00b7 Journal"));
  assert.match(views, /Rumours to write \(\$\{waitingRumors\.length\}\)/);
  const lead = views.indexOf("parts.push(leadCard(state.next, state, handlers));");
  const patrons = views.indexOf("parts.push(patronsPanel(state.patrons, handlers));");
  assert.ok(lead > 0 && patrons > lead, 'patrons after the lead card');
  assert.match(views, /SIDEBAR_TAB_LABELS = Object\.freeze\(\{ Players: 'Travellers' \}\)/);
  assert.match(views, /Travelling together \(\$\{travellers\.length\}\)/);
  const page = await read('play.js');
  assert.match(page, /onOpenTab: \(tab\) => openSideTab\(tab\)/);
});

// v0.332.0 (Kurt's screenshot): compact Travellers rows; add and remove.
test('v0.332.0 a traveller row is one line, the name opens the sheet; add and remove from the tab', async () => {
  const views = await read('play-views.js');
  assert.match(views, /class: 'traveller-name', text: traveller\.name/);
  assert.match(views, /command\(`party:remove:\$\{traveller\.id\}`\)/);
  assert.match(views, /command\(`party:add:\$\{choice\.value\}`\)/);
  const block = views.slice(views.indexOf("const travellers = (state.travellers ?? []).map"), views.indexOf("const candidates = state.travellerCandidates"));
  assert.doesNotMatch(block, /text: 'Sheet'/);
});

// v0.333.0: the Merchant's mustering-out Free Trader can be taken on the
// character generation page, as the Scout Ship already could.
test('v0.333.0 the chargen page offers the Free Trader and makes it the campaign ship', async () => {
  const app = await read('app.js');
  assert.match(app, /'\[ TAKE THE FREE TRADER \]'/);
  assert.match(app, /traderEntitlement\?\.disposition === 'unresolved'/);
  assert.match(app, /createTypeAFreeTraderForCharacter\(current, \{ startedOn \}\)/);
  assert.match(app, /addShipToCampaign\(campaignDocument, shipDocument, \{ makeActive: true \}\)/);
});

// v0.338.0: the player sees his own ships, not only the travellers' one.
test('v0.338.0 the player\u2019s page lists your ships and offers to bring in a waiting one', async () => {
  const page = await read('seat.js');
  assert.match(page, /function yourShipsCard\(envelope\)/);
  assert.match(page, /command: `ship:from-benefit:\$\{entry\.characterId\}`/);
  assert.match(page, /yourShipsCard\(state\.envelope\)/);
});

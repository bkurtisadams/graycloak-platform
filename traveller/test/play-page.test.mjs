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
  assert.deepEqual([...html.matchAll(/<script[^>]+src="([^"?]+)/g)].map((m) => m[1]), ['./play.js']);
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

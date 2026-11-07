// engine-version: what the player's page says when its version and the server's
// game version differ. Bruce, Nov 2026: page v0.368.0, server v0.370.0 — the
// page was the stale side — and it said "Redeploy the function".
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { compareVersions, engineMismatchMessage } from '../src/engine-version.js';

test('versions compare as numbers, not as text', () => {
  assert.equal(compareVersions('0.368.0', '0.370.0'), -1);
  assert.equal(compareVersions('0.370.0', '0.368.0'), 1);
  assert.equal(compareVersions('v0.370.0', '0.370.0'), 0);
  assert.equal(compareVersions('0.99.0', '0.100.0'), -1, '99 is less than 100');
  assert.equal(compareVersions('0.370', '0.370.0'), 0);
  assert.equal(compareVersions('unknown', '0.370.0'), null);
  assert.equal(compareVersions(null, '0.370.0'), null);
});

test('v0.371.0 a stale page is told to reload; a stale server is told to deploy', () => {
  // The server is newer than the page: the page is behind.
  const reload = engineMismatchMessage({ client: '0.370.0' }, '0.368.0');
  assert.match(reload, /^This page is older than the game on the server: the server is v0\.370\.0; this page is v0\.368\.0\. Reload with Ctrl\+F5\./);
  assert.doesNotMatch(reload, /Redeploy/, 'the function is the current side');
  // The page is newer than the server: the function was not redeployed.
  const deploy = engineMismatchMessage({ client: '0.366.0' }, '0.368.0');
  assert.match(deploy, /^The game on the server is v0\.366\.0; this page is v0\.368\.0\. Redeploy the function: run C:\\graycloak-platform\\traveller\\functions\\deploy\.bat$/);
  assert.doesNotMatch(deploy, /firebase deploy/, 'that re-uploads the folder already built');
});

test('v0.371.0 no message when the versions agree or the server does not say', () => {
  assert.equal(engineMismatchMessage({ client: '0.370.0' }, '0.370.0'), null);
  assert.equal(engineMismatchMessage({ client: 'unknown' }, '0.370.0'), null);
  assert.equal(engineMismatchMessage(null, '0.370.0'), null);
  assert.equal(engineMismatchMessage({ client: '0.370.0' }, null), null);
});

test('v0.371.0 the player\u2019s page asks the module', async () => {
  const seat = await readFile(new URL('../client/seat.js', import.meta.url), 'utf8');
  assert.match(seat, /import \{ engineMismatchMessage \} from '\.\.\/src\/engine-version\.js\?v=v\d+\.\d+\.\d+';/);
  assert.match(seat, /return engineMismatchMessage\(engine, page\);/);
  assert.doesNotMatch(seat, /firebase deploy --only functions:traveller/);
});

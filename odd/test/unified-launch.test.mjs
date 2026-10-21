import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const grid = readFileSync(new URL('../combat-grid.html', import.meta.url), 'utf8');
test('join and existing member route to shared table, not player URL', () => {
  assert.match(index, /combat-grid\.html\?welcome=1&c=/);
  assert.match(index, /combat-grid\.html\?c=\$\{encodeURIComponent\(cid\)\}/);
  assert.doesNotMatch(index, /combat-grid\.html\?player&/);
});
test('table role is established after successful authenticated game open', () => {
  const begin = grid.indexOf('async function startTable()');
  const end = grid.indexOf('async function loadTableFights()', begin);
  const code = grid.slice(begin, end);
  assert.ok(code.indexOf('await api.game("open", table.cid)') < code.indexOf('PLAYER = !isRefOf(r.game, uid)'));
  assert.ok(code.indexOf('PLAYER = !isRefOf(r.game, uid)') < code.indexOf('api.watchCharacters('));
  assert.match(code, /\{ all: !PLAYER \}/);
});
test('roles switch subscriptions without redirect or a new route', () => {
  const code = grid.slice(grid.indexOf('async function startTable()'), grid.indexOf('async function loadTableFights()'));
  assert.match(code, /if \(nowPlayer !== PLAYER\)/);
  assert.match(code, /stopTableListeners\(\)/);
  assert.doesNotMatch(code, /location\.replace/);
});
test('player and GM receive common lobby overview', () => {
  const code = grid.slice(grid.indexOf('function renderLobbyStage()'), grid.indexOf('function renderPlayerStage('));
  assert.match(code, /The party/);
  assert.match(code, /if \(PLAYER\) \{/);
  assert.match(code, /renderPlayerStage\(characterArea, g, uid\)/);
  assert.doesNotMatch(code, /if \(PLAYER\) \{ renderPlayerStage\(el, g, uid\); return; \}/);
});

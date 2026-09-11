import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSceneDocument, importSceneDocument, updateSceneDocument, placeSceneToken, moveSceneToken, removeSceneToken,
  sceneBoardCells, sceneFolders, SceneDocumentValidationError, setSceneTokenCombat, clearSceneCombatTracker, trackedSceneTokens
} from '../src/scene-document.js';
import { buildPublishedScene } from '../src/published-view.js';
import { authorizePlayerSceneMove } from '../src/player-token-movement.js';

test('a scene is a named board with a size, a scale, a folder, and staged tokens', () => {
  const scene = createSceneDocument({ campaignId: 'sea', name: 'Aster Downport', folder: 'Ports/Aster', squares: 40, metersPerSquare: 5, createdAt: 1 });
  assert.equal(scene.identity.name, 'Aster Downport');
  assert.equal(scene.folder, 'Ports/Aster');
  assert.deepEqual(scene.board, { squares: 40, metersPerSquare: 5 });
  assert.deepEqual(sceneBoardCells(scene), { columns: 201, rows: 201, metersPerSquare: 5 });
  assert.deepEqual(scene.tokens, []);
  assert.equal(importSceneDocument(JSON.stringify(scene)).identity.id, scene.identity.id);
  assert.throws(() => createSceneDocument({ campaignId: 'sea', name: '' }), TypeError);
  assert.throws(() => createSceneDocument({ campaignId: 'sea', name: 'Too big', squares: 100, metersPerSquare: 25 }), RangeError);
  assert.throws(() => createSceneDocument({ campaignId: 'sea', name: 'Too small', squares: 4 }), RangeError);
});

test('tokens are staged on the grid and stay on the board', () => {
  let scene = createSceneDocument({ campaignId: 'sea', name: 'Alley', squares: 20, metersPerSquare: 5, createdAt: 1 });
  const placed = placeSceneToken(scene, { actorId: 'npc-1', side: 'opposition', column: 33, row: 7, label: 'R' });
  scene = placed.scene;
  assert.deepEqual(placed.token.position, { column: 35, row: 5 }, 'snapped to the 5 m grid');
  assert.equal(placed.token.side, 'opposition');
  assert.throws(() => placeSceneToken(scene, { actorId: 'npc-1', column: 0, row: 0 }), /already on this scene/);
  scene = moveSceneToken(scene, { tokenId: placed.token.id, column: 999, row: -4 });
  assert.deepEqual(scene.tokens[0].position, { column: 100, row: 0 }, 'clamped to the board');
  // Shrinking the board drops what falls off it.
  const shrunk = updateSceneDocument(scene, { squares: 10 });
  assert.equal(shrunk.tokens.length, 0);
  scene = removeSceneToken(scene, placed.token.id);
  assert.equal(scene.tokens.length, 0);
  assert.throws(() => importSceneDocument({ ...scene, tokens: [{ id: 't', actorId: 'x', side: 'martian', position: { column: 0, row: 0 }, label: '' }] }), SceneDocumentValidationError);
});

test('folders group scenes by path, sorted', () => {
  const a = createSceneDocument({ campaignId: 'sea', name: 'Zeta Bar', folder: 'Ports', createdAt: 1 });
  const b = createSceneDocument({ campaignId: 'sea', name: 'Alpha Dock', folder: 'Ports', createdAt: 2 });
  const c = createSceneDocument({ campaignId: 'sea', name: 'Cave', folder: 'Wilderness', createdAt: 3 });
  const d = createSceneDocument({ campaignId: 'sea', name: 'Loose', folder: '', createdAt: 4 });
  const folders = sceneFolders([a, b, c, d]);
  assert.deepEqual(folders.map((entry) => entry.folder), ['Ports', 'Scenes', 'Wilderness']);
  assert.deepEqual(folders[0].scenes.map((entry) => entry.identity.name), ['Alpha Dock', 'Zeta Bar']);
});

test('the combat tracker marks staged tokens and clears after the fight starts', () => {
  let scene = createSceneDocument({ campaignId: 'sea', name: 'Bar', squares: 20, metersPerSquare: 5, createdAt: 1 });
  scene = placeSceneToken(scene, { actorId: 'pc-1', side: 'party', column: 10, row: 10 }).scene;
  scene = placeSceneToken(scene, { actorId: 'npc-1', side: 'opposition', column: 40, row: 10 }).scene;
  assert.equal(scene.tokens[0].inCombat, false);
  scene = setSceneTokenCombat(scene, scene.tokens[1].id, true);
  assert.deepEqual(trackedSceneTokens(scene).map((token) => token.actorId), ['npc-1']);
  scene = clearSceneCombatTracker(scene);
  assert.equal(trackedSceneTokens(scene).length, 0);
  assert.throws(() => setSceneTokenCombat(scene, 'nope', true), /not on this scene/);
});

test('the published scene names tokens without exposing the tracker, and a player may walk only their own', () => {
  let scene = createSceneDocument({ campaignId: 'sea', name: 'Bar', squares: 20, metersPerSquare: 5, createdAt: 1 });
  scene = placeSceneToken(scene, { actorId: 'pc-1', side: 'party', column: 10, row: 10 }).scene;
  scene = placeSceneToken(scene, { actorId: 'npc-1', side: 'opposition', column: 40, row: 10 }).scene;
  scene = setSceneTokenCombat(scene, scene.tokens[1].id, true);
  const published = buildPublishedScene(scene, { names: new Map([['pc-1', { name: 'Hawkeye', actorType: 'pc' }], ['npc-1', { name: 'Raider', actorType: 'npc' }]]) });
  assert.deepEqual(published.map, { columns: 101, rows: 101, metersPerSquare: 5 });
  assert.deepEqual(published.tokens.map((token) => token.name), ['Hawkeye', 'Raider']);
  assert.ok(!JSON.stringify(published).includes('inCombat'));
  const campaign = { identity: { id: 'sea' }, ownership: { actors: { 'pc-1': 'uid-a' } } };
  const move = { uid: 'uid-a', encounterId: scene.identity.id, actorId: 'pc-1', column: 15, row: 10, pace: 'walk', round: 1, movedAt: 2 };
  assert.equal(authorizePlayerSceneMove(move, { campaign, scene }).tokenId, scene.tokens[0].id);
  assert.throws(() => authorizePlayerSceneMove({ ...move, actorId: 'npc-1' }, { campaign, scene }), /does not own/);
  assert.throws(() => authorizePlayerSceneMove({ ...move, uid: 'uid-b' }, { campaign, scene }), /does not own/);
  assert.throws(() => authorizePlayerSceneMove({ ...move, encounterId: 'other' }, { campaign, scene }), /does not belong/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSceneDocument, importSceneDocument, updateSceneDocument, placeSceneToken, moveSceneToken, removeSceneToken,
  sceneBoardCells, sceneFolders, SceneDocumentValidationError
} from '../src/scene-document.js';

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

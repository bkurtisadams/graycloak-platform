import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSceneDocument, importSceneDocument, updateSceneDocument, placeSceneToken, moveSceneToken, removeSceneToken,
  sceneBoardCells, sceneFolders, SceneDocumentValidationError, setSceneTokenCombat, clearSceneCombatTracker, trackedSceneTokens,
  duplicateSceneDocument, moveScenesToFolder, adoptSceneDocument, sceneThumbnailSvg, sceneMatchesSearch,
  sceneIsVectorBoard,
  sceneVectorExtent,
  sceneBoardMeters,
  placeSceneShip,
  moveSceneShip,
  setSceneShipVector
} from '../src/scene-document.js';
import { buildPublishedScene } from '../src/published-view.js';
import { authorizePlayerSceneMove } from '../src/player-token-movement.js';

test('a scene is a named board with a size, a scale, a folder, and staged tokens', () => {
  const scene = createSceneDocument({ campaignId: 'sea', name: 'Aster Downport', folder: 'Ports/Aster', squares: 40, metersPerSquare: 5, createdAt: 1 });
  assert.equal(scene.identity.name, 'Aster Downport');
  assert.equal(scene.folder, 'Ports/Aster');
  // v0.158.0: the board names its kind, so a vector board can exist beside it.
  assert.deepEqual(scene.board, { kind: 'grid', squares: 40, metersPerSquare: 5 });
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

test('v0.82.0 duplicate, adopt, folder moves, search and the thumbnail', () => {
  let scene = createSceneDocument({ campaignId: 'sea', name: 'Downport', folder: 'Ports', squares: 20, metersPerSquare: 5, createdAt: 1 });
  scene = placeSceneToken(scene, { actorId: 'pc-1', side: 'party', column: 10, row: 10 }).scene;
  scene = setSceneTokenCombat(scene, scene.tokens[0].id, true);
  const copy = duplicateSceneDocument(scene, { createdAt: 2 });
  assert.notEqual(copy.identity.id, scene.identity.id);
  assert.equal(copy.identity.name, 'Downport (copy)');
  assert.equal(copy.tokens.length, 1);
  assert.equal(copy.tokens[0].inCombat, false, 'the tracker does not copy');
  assert.notEqual(copy.tokens[0].id, scene.tokens[0].id);
  const adopted = adoptSceneDocument(scene, { campaignId: 'other', createdAt: 3 });
  assert.equal(adopted.campaignId, 'other');
  assert.equal(adopted.identity.name, 'Downport');
  const other = createSceneDocument({ campaignId: 'sea', name: 'Cave', folder: 'Wild', createdAt: 4 });
  const moved = moveScenesToFolder([scene, other], 'Ports');
  assert.equal(moved[0].folder, 'Scenes');
  assert.equal(moved[1].folder, 'Wild');
  assert.ok(sceneMatchesSearch(scene, 'down'));
  assert.ok(sceneMatchesSearch(scene, 'PORTS'));
  assert.ok(!sceneMatchesSearch(scene, 'cave'));
  assert.ok(sceneMatchesSearch(scene, ''));
  const svg = sceneThumbnailSvg(scene, { size: 96 });
  assert.match(svg, /^<svg /);
  assert.match(svg, /<circle cx="9\.60" cy="9\.60"/, 'token at column 10 of a 5 m grid is 2 squares in');
  assert.match(svg, /aria-label="Downport"/);
});

// v0.158.0: Book 2 p.22 gives space combat a continuous surface at 1 inch =
// 1,000 miles with no grid at all, and p.25 marks a position with string or
// chalk rather than in a cell. A vector board is that surface.
test('a vector scene is a continuous plane in thousands of miles, with no grid', () => {
  const scene = createSceneDocument({
    campaignId: 'sea', name: 'San Telmo Approach', folder: 'Space/San Telmo',
    boardKind: 'vector', spanThousandMiles: 400, atmosphere: 6,
    planet: { name: 'San Telmo', diameter: 8, densityEarth: 1 }, createdAt: 1
  });
  assert.deepEqual(scene.board, { kind: 'vector', spanThousandMiles: 400 });
  assert.equal(scene.board.squares, undefined);
  assert.equal(scene.board.metersPerSquare, undefined);
  assert.equal(sceneIsVectorBoard(scene), true);
  assert.deepEqual(sceneVectorExtent(scene), { half: 200, minimum: -200, maximum: 200, spanThousandMiles: 400 });

  // The template belongs to the scene: the referee draws San Telmo once.
  assert.equal(scene.space.planet.name, 'San Telmo');
  // Atmosphere rides along because p.35 braking depends on it.
  assert.equal(scene.space.atmosphere, 6);

  // Metres are meaningless here and asking for them is a mistake, not a zero.
  assert.throws(() => sceneBoardMeters(scene), TypeError);
  assert.throws(() => sceneBoardCells(scene), TypeError);
  // A grid board has no space block, and a vector board is not sized in squares.
  assert.equal(createSceneDocument({ campaignId: 'sea', name: 'Alley' }).space, null);
  assert.throws(() => createSceneDocument({ campaignId: 'sea', name: 'Too small', boardKind: 'vector', spanThousandMiles: 4 }), RangeError);
  assert.throws(() => createSceneDocument({ campaignId: 'sea', name: 'Unknown', boardKind: 'hex' }), RangeError);

  assert.equal(importSceneDocument(JSON.stringify(scene)).board.kind, 'vector');
});

test('a staged ship carries a position in inches and the vector it arrives with', () => {
  const scene = createSceneDocument({
    campaignId: 'sea', name: 'Clear Space', boardKind: 'vector', spanThousandMiles: 100, createdAt: 1
  });
  const staged = {
    ...scene,
    tokens: [{ id: 't1', actorId: 'marisol', side: 'party', label: 'Marisol',
      position: { x: -12.5, y: 3.25 }, velocity: { x: 6, y: 0 } }]
  };
  assert.equal(importSceneDocument(staged).tokens[0].velocity.x, 6);

  // p.25 makes a vector of 0 legal, so an absent velocity is stationary rather
  // than unset.
  assert.equal(importSceneDocument({ ...staged, tokens: [{ ...staged.tokens[0], velocity: undefined }] }).tokens.length, 1);

  // Off the span, a cell position, or a velocity on a grid token are all errors.
  assert.throws(() => importSceneDocument({ ...staged, tokens: [{ ...staged.tokens[0], position: { x: 900, y: 0 } }] }), SceneDocumentValidationError);
  assert.throws(() => importSceneDocument({ ...staged, tokens: [{ ...staged.tokens[0], position: { column: 1, row: 1 } }] }), SceneDocumentValidationError);
  const grid = createSceneDocument({ campaignId: 'sea', name: 'Alley', squares: 20, createdAt: 1 });
  assert.throws(() => importSceneDocument({ ...grid, tokens: [{ id: 'g', actorId: 'x', side: 'party', label: '', position: { column: 1, row: 1 }, velocity: { x: 1, y: 0 } }] }), SceneDocumentValidationError);
});

test('a board does not change kind, and shrinking a span drops stranded ships', () => {
  let scene = createSceneDocument({ campaignId: 'sea', name: 'Clear Space', boardKind: 'vector', spanThousandMiles: 400, createdAt: 1 });
  scene = importSceneDocument({ ...scene, tokens: [
    { id: 'near', actorId: 'marisol', side: 'party', label: 'M', position: { x: 10, y: 0 } },
    { id: 'far', actorId: 'corsair', side: 'opposition', label: 'C', position: { x: 190, y: 0 } }
  ] });
  assert.equal(updateSceneDocument(scene, { spanThousandMiles: 100 }).tokens.length, 1, 'the far ship falls off a smaller span');
  assert.equal(updateSceneDocument(scene, { atmosphere: 8 }).space.atmosphere, 8);
  // Applying a grid size to a vector board would have written squares into it
  // and stranded every ship on a geometry it does not use.
  assert.throws(() => updateSceneDocument(scene, { squares: 40 }), TypeError);
  const grid = createSceneDocument({ campaignId: 'sea', name: 'Alley', squares: 20, createdAt: 1 });
  assert.throws(() => updateSceneDocument(grid, { spanThousandMiles: 400 }), TypeError);
});

test('scenes written before v0.158.0 migrate to grid boards rather than failing', () => {
  const legacy = {
    documentType: 'graycloak-traveller-scene',
    schemaVersion: 1,
    identity: { id: 'scene-old', name: 'Warehouse' },
    campaignId: 'sea',
    folder: 'Scenes',
    board: { squares: 20, metersPerSquare: 5 },
    background: { assetId: null },
    tokens: [{ id: 't', actorId: 'npc', side: 'opposition', label: 'R', position: { column: 10, row: 10 } }],
    notes: '',
    createdAt: 1
  };
  const migrated = importSceneDocument(legacy);
  assert.equal(migrated.schemaVersion, 2);
  assert.deepEqual(migrated.board, { kind: 'grid', squares: 20, metersPerSquare: 5 });
  assert.equal(migrated.space, null);
  assert.equal(migrated.tokens.length, 1, 'staged tokens survive the migration');
});

// v0.159.0: a vector board has no grid to draw, so the directory thumbnail has
// to be the thing that identifies it — the pp.26-27 template and the ships.
test('a vector scene thumbnail draws the template and its ships, not a grid', () => {
  const world = { name: 'San Telmo', diameter: 8, center: { x: 0, y: 0 }, bands: [{ g: 0.25, outerRadius: 8 }, { g: 0.5, outerRadius: 5.66 }] };
  let scene = createSceneDocument({
    campaignId: 'sea', name: 'San Telmo Approach', boardKind: 'vector',
    spanThousandMiles: 100, planet: world, createdAt: 1
  });
  scene = importSceneDocument({ ...scene, tokens: [
    { id: 't1', actorId: 'marisol', side: 'party', label: 'M', position: { x: -20, y: 0 } }
  ] });
  const svg = sceneThumbnailSvg(scene);
  // Two bands, the disc, the span circle and one ship; the only lines are the
  // origin cross, never a grid.
  assert.equal((svg.match(/<circle /g) ?? []).length, 5);
  assert.equal((svg.match(/<line /g) ?? []).length, 2, 'the origin cross, and no grid');
  assert.match(svg, /stroke-dasharray/, 'the gravity bands read as bands');

  // Clear space with nothing staged still reads as a measured plane.
  const empty = sceneThumbnailSvg(createSceneDocument({ campaignId: 'sea', name: 'Deep Space', boardKind: 'vector', spanThousandMiles: 400, createdAt: 1 }));
  assert.equal((empty.match(/<circle /g) ?? []).length, 1, 'the span circle');
  assert.equal((empty.match(/<line /g) ?? []).length, 2, 'the origin cross');

  // A grid scene still draws a grid and no template.
  const grid = sceneThumbnailSvg(createSceneDocument({ campaignId: 'sea', name: 'Alley', squares: 20, createdAt: 1 }));
  assert.ok((grid.match(/<line /g) ?? []).length > 10, 'a grid scene draws its grid');
  assert.doesNotMatch(grid, /stroke-dasharray/);
});

// v0.160.0: a staged ship's opening vector. Book 2 gives no starting
// conditions — p.36 leaves setup to the referee and p.25 makes a vector of 0
// legal — so 6 inches is a Graycloak default, taken from the magnitude p.25's
// own worked example uses.
test('a staged ship opens on a 6-inch vector toward the origin', () => {
  const scene = createSceneDocument({
    campaignId: 'sea', name: 'San Telmo Approach', boardKind: 'vector',
    spanThousandMiles: 400, createdAt: 1
  });

  // Staged to the west, it closes east at 6.
  const west = placeSceneShip(scene, { actorId: 'marisol', side: 'party', x: -60, y: 0, label: 'M' });
  assert.deepEqual(west.token.position, { x: -60, y: 0 });
  assert.equal(Math.hypot(west.token.velocity.x, west.token.velocity.y).toFixed(4), '6.0000');
  assert.equal(west.token.velocity.x.toFixed(2), '6.00');
  assert.equal(west.token.velocity.y.toFixed(2), '0.00');

  // Staged to the east, it closes west — so two ships on opposite sides meet
  // rather than coasting in formation.
  const both = placeSceneShip(west.scene, { actorId: 'corsair', side: 'opposition', x: 60, y: 0, label: 'C' });
  assert.equal(both.token.velocity.x.toFixed(2), '-6.00');

  // On the origin there is nothing to close on, so it starts stationary.
  const centre = placeSceneShip(both.scene, { actorId: 'hulk', side: 'neutral', x: 0, y: 0 });
  assert.deepEqual(centre.token.velocity, { x: 0, y: 0 });

  // The referee may set any vector, including a stop.
  const stopped = setSceneShipVector(centre.scene, { tokenId: both.token.id, velocity: { x: 0, y: 0 } });
  assert.deepEqual(stopped.tokens.find((token) => token.id === both.token.id).velocity, { x: 0, y: 0 });

  // Position is clamped to the span, and moving keeps the vector.
  const moved = moveSceneShip(stopped, { tokenId: west.token.id, x: -9999, y: 0 });
  assert.equal(moved.tokens.find((token) => token.id === west.token.id).position.x, -200);
  assert.equal(moved.tokens.find((token) => token.id === west.token.id).velocity.x.toFixed(2), '6.00');

  // The two staging paths do not cross: a grid board has no vectors and a
  // vector board has no cells.
  const grid = createSceneDocument({ campaignId: 'sea', name: 'Alley', squares: 20, createdAt: 1 });
  assert.throws(() => placeSceneShip(grid, { actorId: 'x' }), TypeError);
  assert.throws(() => placeSceneToken(scene, { actorId: 'x', column: 1, row: 1 }), TypeError);
  assert.throws(() => moveSceneToken(west.scene, { tokenId: west.token.id, column: 1, row: 1 }), TypeError);
});

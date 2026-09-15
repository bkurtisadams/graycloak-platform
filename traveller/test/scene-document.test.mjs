import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSceneDocument, importSceneDocument, updateSceneDocument, placeSceneToken, moveSceneToken, removeSceneToken,
  sceneBoardCells, sceneFolders, SceneDocumentValidationError, setSceneTokenCombat, clearSceneCombatTracker, trackedSceneTokens,
  duplicateSceneDocument, moveScenesToFolder, adoptSceneDocument, sceneThumbnailSvg, sceneMatchesSearch,
  sceneIsVectorBoard,
  sceneActorIsDesignReference,
  sceneVectorExtent,
  sceneBoardMeters,
  placeSceneShip,
  moveSceneShip,
  setSceneShipVector,
  sceneGravityWorld,
  moveSceneBody,
  placeSceneBody,
  asteroidFieldBody,
  emplacementBody,
  sceneBodies,
  setSceneGravityBody,
  removeSceneBody
,
  worldBody
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
  assert.equal(sceneGravityWorld(scene).name, 'San Telmo');
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
  assert.equal(migrated.schemaVersion, 3);
  assert.deepEqual(migrated.board, { kind: 'grid', squares: 20, metersPerSquare: 5 });
  assert.equal(migrated.space, null);
  assert.equal(migrated.tokens.length, 1, 'staged tokens survive the migration');
});

// v0.159.0: a vector board has no grid to draw, so the directory thumbnail has
// to be the thing that identifies it — the pp.26-27 template and the ships.
test('a vector scene thumbnail draws the template and its ships, not a grid', () => {
  let scene = createSceneDocument({
    campaignId: 'sea', name: 'San Telmo Approach', boardKind: 'vector',
    spanThousandMiles: 100, planet: { name: 'San Telmo', diameter: 8, densityEarth: 1 }, createdAt: 1
  });
  scene = importSceneDocument({ ...scene, tokens: [
    { id: 't1', actorId: 'marisol', side: 'party', label: 'M', position: { x: -20, y: 0 } }
  ] });
  const svg = sceneThumbnailSvg(scene);
  // Three bands, the disc, the span circle and one ship; the only lines are the
  // origin cross, never a grid.
  assert.equal((svg.match(/<circle /g) ?? []).length, 6);
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

// v0.162.0: Book 2 p.28 says outright that "the shifting of templates will be
// necessary as the battle progresses", so a placed world has to be movable and
// its span editable after creation.
test('a vector scene\u2019s world and span can be changed after it is made', () => {
  let scene = createSceneDocument({
    campaignId: 'sea', name: 'San Telmo Approach', boardKind: 'vector',
    spanThousandMiles: 400, createdAt: 1
  });
  assert.equal(sceneGravityWorld(scene), null, 'clear space to begin with');

  // A world arrives later, off the origin. What is supplied is its data; the
  // pp.26-27 template is arithmetic on that.
  scene = updateSceneDocument(scene, { planet: { name: 'San Telmo', diameter: 8, densityEarth: 1, center: { x: 40, y: -10 } } });
  const world = sceneGravityWorld(scene);
  assert.equal(world.name, 'San Telmo');
  assert.deepEqual(world.center, { x: 40, y: -10 });
  assert.equal(world.template.radius, 4);
  assert.equal(world.template.bands.length, 3, 'p.27 puts a size-8 world in three quarter-G bands');

  // And can be shifted — the template moves with the disc, or the bands stay
  // where the disc was — or removed for clear space.
  scene = moveSceneBody(scene, { bodyId: world.id, x: 0, y: 60 });
  assert.deepEqual(sceneGravityWorld(scene).center, { x: 0, y: 60 });
  assert.deepEqual(sceneGravityWorld(scene).template.center, { x: 0, y: 60 });
  assert.equal(sceneGravityWorld(updateSceneDocument(scene, { planet: null })), null);

  // The span is editable, and p.35 braking depends on the atmosphere, so that
  // is editable too.
  assert.equal(updateSceneDocument(scene, { spanThousandMiles: 1000 }).board.spanThousandMiles, 1000);
  assert.equal(updateSceneDocument(scene, { atmosphere: 8 }).space.atmosphere, 8);
  assert.throws(() => updateSceneDocument(scene, { spanThousandMiles: 5 }), SceneDocumentValidationError);
});

// v0.163.0: everything Book 2 puts in space. p.28's asteroid belts, p.35's
// planetary defence emplacements, and more than one world.
test('asteroid fields, defence emplacements and several worlds all stage', () => {
  let scene = createSceneDocument({
    campaignId: 'sea', name: 'San Telmo System', boardKind: 'vector',
    spanThousandMiles: 400, createdAt: 1
  });

  // A gas giant: p.28's Solar System table gives Jupiter a diameter of 88, so
  // the same field carries a world size digit and a gas giant.
  scene = placeSceneBody(scene, worldBody({ name: 'Calder', diameter: 88, densityEarth: 0.24, center: { x: -80, y: 0 } }));
  scene = placeSceneBody(scene, worldBody({ name: 'San Telmo', diameter: 8, densityEarth: 1, center: { x: 60, y: 0 } }));
  assert.equal(sceneBodies(scene).length, 2);

  // p.28: a belt is many worldlets with no significant gravity, about one per
  // four square inches — an extent and a density, not a disc.
  scene = placeSceneBody(scene, asteroidFieldBody({ name: 'The Shoals', center: { x: 0, y: 90 }, radius: 40 }));
  const field = sceneBodies(scene).find((body) => body.kind === 'asteroid-field');
  assert.equal(field.perSquareInch, 0.25);

  // p.35: orbital emplacements are treated as starships, surface ones take
  // turret hits. Generally beam lasers in triple turrets.
  scene = placeSceneBody(scene, emplacementBody({ name: 'San Telmo Battery', center: { x: 60, y: 6 }, site: 'orbital', turrets: 3 }));
  assert.equal(sceneBodies(scene).filter((body) => body.kind === 'emplacement').length, 1);
  assert.throws(() => emplacementBody({ site: 'lunar' }), RangeError);

  // Only one world can be the gravity template: moveWithGravity samples a
  // single planet, and p.28 says one world of any size is all a table holds.
  const giant = sceneBodies(scene).find((body) => body.name === 'Calder');
  assert.equal(sceneGravityWorld(scene).name, 'Calder', 'the first world staged, by default');
  scene = setSceneGravityBody(scene, sceneBodies(scene).find((body) => body.name === 'San Telmo').id);
  assert.equal(sceneGravityWorld(scene).name, 'San Telmo');
  assert.throws(() => setSceneGravityBody(scene, field.id), /only a staged world/);

  // Removing the gravity world leaves the scene without one rather than
  // pointing at something that has gone.
  scene = removeSceneBody(scene, sceneBodies(scene).find((body) => body.name === 'San Telmo').id);
  assert.equal(scene.space.gravityBodyId, null);
  assert.equal(sceneGravityWorld(scene).name, 'Calder', 'falls back to a world that is still there');

  // Off the board is refused, and a shrinking span drops what falls off.
  assert.throws(() => placeSceneBody(scene, asteroidFieldBody({ center: { x: 9999, y: 0 }, radius: 4 })), RangeError);
  const shrunk = updateSceneDocument(scene, { spanThousandMiles: 100 });
  assert.equal(sceneBodies(shrunk).some((body) => body.name === 'Calder'), false, 'the gas giant at -80 falls off a 100" span');
});

// v0.164.2: a standard design is plans (Book 2 p.9), not a hull, so any number
// of ships may be staged from one. The campaign's own ship is one hull.
test('three scouts stage from one design; a real ship stages once', () => {
  let scene = createSceneDocument({
    campaignId: 'sea', name: 'Picket Line', boardKind: 'vector',
    spanThousandMiles: 400, createdAt: 1
  });
  const ids = [];
  for (const y of [-20, 0, 20]) {
    const staged = placeSceneShip(scene, { actorId: 'design:type-s-scout-courier', side: 'opposition', x: 60, y, label: 'SCOUT' });
    scene = staged.scene;
    ids.push(staged.token.id);
  }
  assert.equal(new Set(ids).size, 3);
  assert.deepEqual(scene.tokens.map((token) => token.label), ['SCOUT', 'SCOUT 2', 'SCOUT 3']);
  assert.ok(scene.tokens.every((token) => token.actorId === 'design:type-s-scout-courier'));
  assert.equal(sceneActorIsDesignReference('design:type-s-scout-courier'), true);
  assert.equal(sceneActorIsDesignReference('ship-marisol'), false);

  // The first token keeps the id earlier releases gave it.
  const legacy = placeSceneShip(createSceneDocument({ campaignId: 'sea', name: 'Picket Line', boardKind: 'vector', spanThousandMiles: 400, createdAt: 1 }),
    { actorId: 'design:type-s-scout-courier', x: 60, y: -20 });
  assert.equal(ids[0], legacy.token.id);

  // Each hull moves on its own.
  const moved = moveSceneShip(scene, { tokenId: ids[1], x: 10, y: 10 });
  assert.deepEqual(moved.tokens.find((token) => token.id === ids[1]).position, { x: 10, y: 10 });
  assert.deepEqual(moved.tokens.find((token) => token.id === ids[2]).position, { x: 60, y: 20 });
  assert.equal(removeSceneToken(moved, ids[0]).tokens.length, 2);

  const own = placeSceneShip(scene, { actorId: 'ship-marisol', side: 'party', x: -60, y: 0 });
  assert.throws(() => placeSceneShip(own.scene, { actorId: 'ship-marisol', side: 'party', x: -50, y: 0 }), /already on this scene/);
});

// v0.164.2: duplicating or importing a space scene built a grid board and
// threw on the first ship.
test('a duplicated or imported space scene stays a space scene with its ships', () => {
  let scene = createSceneDocument({ campaignId: 'sea', name: 'Belt', boardKind: 'vector', spanThousandMiles: 400, createdAt: 1 });
  scene = placeSceneBody(scene, asteroidFieldBody({ name: 'Rocks', center: { x: 0, y: 0 }, radius: 20 }));
  for (const y of [-10, 10]) scene = placeSceneShip(scene, { actorId: 'design:type-s-scout-courier', x: 50, y, label: 'SCOUT' }).scene;
  for (const copy of [duplicateSceneDocument(scene, { createdAt: 2 }), adoptSceneDocument(scene, { campaignId: 'other', createdAt: 3 })]) {
    assert.equal(copy.board.kind, 'vector');
    assert.equal(copy.board.spanThousandMiles, 400);
    assert.equal(copy.space.bodies.length, 1);
    assert.equal(copy.tokens.length, 2);
    assert.equal(new Set(copy.tokens.map((token) => token.id)).size, 2);
    assert.notEqual(copy.tokens[0].id, scene.tokens[0].id);
    assert.deepEqual(copy.tokens[1].velocity, scene.tokens[1].velocity);
  }
});

// v0.171.0: a space scene publishes as a plot, not as a NaN-sized grid.
test('an activated space scene publishes its span, bodies and ship vectors', async () => {
  const { publishedVectorSceneDocument } = await import('../src/published-view.js');
  let scene = createSceneDocument({ campaignId: 'sea', name: 'San Telmo Approach', boardKind: 'vector', spanThousandMiles: 400, createdAt: 1 });
  scene = placeSceneBody(scene, worldBody({ name: 'San Telmo', diameter: 8, center: { x: 0, y: 0 } }));
  scene = placeSceneShip(scene, { actorId: 'design:type-s-scout-courier', side: 'opposition', x: 60, y: 0, label: 'SCOUT' }).scene;
  const published = buildPublishedScene(scene);
  assert.equal(published.kind, 'vector');
  assert.equal(published.spanThousandMiles, 400);
  assert.equal(published.map, undefined);
  assert.equal(published.bodies[0].name, 'San Telmo');
  assert.equal(published.tokens[0].velocity.x, scene.tokens[0].velocity.x);
  assert.equal(Math.abs(published.tokens[0].velocity.y), 0);
  // Nothing non-finite reaches Firestore.
  assert.ok(Number.isFinite(published.tokens[0].position.x) && Number.isFinite(published.tokens[0].velocity.x));
  assert.doesNotMatch(JSON.stringify(published), /NaN|columns/);
  const plot = publishedVectorSceneDocument(JSON.parse(JSON.stringify(published)));
  assert.equal(plot.board.kind, 'vector');
  assert.equal(plot.tokens[0].label, 'SCOUT');
  // A grid scene says what it is too.
  assert.equal(buildPublishedScene(createSceneDocument({ campaignId: 'sea', name: 'Alley', squares: 20, createdAt: 1 })).kind, 'grid');
});

// scene-document.js — a board a fight can happen on.
//
// v0.72.0. Until now the encounter carried its own map, and there was no
// board without a fight. A scene is the board on its own: a name, a size in
// squares, a grid scale, an optional background image, a folder in the
// directory, and tokens staged on it before anything is declared. An
// encounter references the scene it is fought on and takes its board from it.
//
// Scenes are square for now — both canvases assume square cells on a square
// board — and rectangular boards arrive with the shared canvas in v0.73.

import { stableDocumentId, createPlanet } from '../vendor/classic-traveller-rules/index.js?v=r0.80.0';

export const SCENE_DOCUMENT_TYPE = 'graycloak-traveller-scene';
export const CURRENT_SCENE_DOCUMENT_SCHEMA_VERSION = 3;
export const SUPPORTED_SCENE_DOCUMENT_SCHEMA_VERSIONS = Object.freeze([1, 2, 3]);

// v0.163.0: everything Book 2 puts in space, rather than one planet.
//
// - 'world': a pp.26-27 template. Diameter in thousands of miles, so Book 3's
//   size digit for a world and the p.28 Solar System figures for a gas giant
//   (Jupiter is 88) use the same field.
// - 'asteroid-field': p.28. "Asteroid and planetoid belts are composed of many
//   small worldlets, each with no significant gravity, and with no atmosphere
//   or significant size", about one per four square inches. So a field has an
//   extent and a density, and no gravity of its own.
// - 'emplacement': p.35 planetary defence fires. Orbital emplacements are
//   treated as starships; surface emplacements must receive turret hits. Both
//   are generally beam lasers in triple turrets.
//
// ONE GRAVITY TEMPLATE PER FIGHT. moveWithGravity samples a single planet, and
// Book 2 p.28 says no more than one world of any important size will be on an
// average playing surface anyway. Several worlds may be staged; the fight takes
// the one named by sceneGravityWorld.
export const SCENE_BODY_KINDS = Object.freeze(['world', 'asteroid-field', 'emplacement']);
export const SCENE_WORLD_MAX_DIAMETER = 100;
// p.28's average belt density, in asteroids per square inch.
export const ASTEROID_DENSITY_PER_SQUARE_INCH = 0.25;
export const EMPLACEMENT_SITES = Object.freeze(['orbital', 'surface']);

// v0.158.0: two kinds of board.
//
// A grid board is everything a scene has been until now: a square count and a
// metre scale, cells addressed by integer column and row. Book 2's space combat
// is none of those things — p.22 gives a continuous playing surface at 1 inch =
// 1,000 miles with no grid at all, and p.25 says positions are marked with
// string or chalk rather than occupying cells. So a vector board carries a span
// rather than a square count, positions are continuous, and a staged ship may
// carry the vector it arrives with.
export const SCENE_BOARD_KINDS = Object.freeze(['grid', 'vector']);
// A table's worth of surface. p.28 notes Luna would be 250 inches away at this
// scale and the sun's gravity well 371 feet across, so a span is a staging
// bound rather than a wall: the plot itself auto-fits to whatever it holds.
export const SCENE_VECTOR_DEFAULT_SPAN = 400;
export const SCENE_VECTOR_MIN_SPAN = 40;
export const SCENE_VECTOR_MAX_SPAN = 5000;
// A staged ship's opening vector, in inches per ten-minute turn.
//
// GRAYCLOAK DEFAULT, not a printed figure. Book 2 specifies the arithmetic of
// vectors and says nothing about starting conditions — p.36 leaves the setup to
// the referee, and p.25 makes a vector of 0 perfectly legal. 6 is the magnitude
// the book's own worked example uses ("a vector of 6 inches at 90"), which is
// why it is the default here rather than a number invented for the purpose.
//
// The DIRECTION is toward the board's origin, which is where the world sits
// when there is one. Two ships staged on opposite sides therefore close on each
// other, which is the fight; both staged on the same heading would coast in
// formation forever. The referee may set any vector afterwards.
export const SCENE_VECTOR_DEFAULT_SPEED = 6;
export const SCENE_VECTOR_DEFAULT_SPEED_IS_RAW = false;
export const SCENE_GRID_SCALES = Object.freeze([1, 5, 25]);
export const SCENE_MIN_SQUARES = 10;
export const SCENE_MAX_METERS = 1000;
export const SCENE_TOKEN_SIDES = Object.freeze(['party', 'opposition', 'neutral']);
export const DEFAULT_SCENE_FOLDER = 'Scenes';

export class SceneDocumentValidationError extends Error {
  constructor(errors) {
    const list = Array.isArray(errors) ? errors : [String(errors)];
    super(`invalid Graycloak Traveller scene document: ${list.join('; ')}`);
    this.name = 'SceneDocumentValidationError';
    this.errors = Object.freeze([...list]);
  }
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function nonblank(value) { return typeof value === 'string' && value.trim().length > 0; }
function plain(value) { return value && typeof value === 'object' && !Array.isArray(value); }
function add(errors, condition, message) { if (!condition) errors.push(message); }
function parse(input) {
  if (typeof input !== 'string') return input;
  try { return JSON.parse(input); }
  catch (error) { throw new SceneDocumentValidationError(`invalid JSON: ${error.message}`); }
}

export function sceneIsVectorBoard(scene) {
  return scene?.board?.kind === 'vector';
}

// A pp.26-27 template as a staged body. The planet object the rules package
// builds is kept whole under `template`, so the gravity code takes exactly what
// it takes today and nothing is recomputed here.
export function worldBody(world, { id = null } = {}) {
  // What matters about a world is its data: a name, a diameter in thousands of
  // miles, and a density. The pp.26-27 template — surface radius and the
  // quarter-G band radii — is arithmetic on those, so the scene computes it
  // rather than making callers arrive with one. A ready-made planet from the
  // rules package is accepted as-is, which is what a migrated v2 scene has.
  const centre = { x: Number(world.center?.x) || 0, y: Number(world.center?.y) || 0 };
  const template = Number.isFinite(world.radius) && Array.isArray(world.bands)
    ? { ...clone(world), center: centre }
    : createPlanet({
      name: String(world.name ?? 'World'),
      diameter: Number(world.diameter),
      densityEarth: Number.isFinite(Number(world.densityEarth)) ? Number(world.densityEarth) : 1,
      center: centre
    });
  return {
    id: id ?? stableDocumentId('body', `world|${template.name}|${centre.x}|${centre.y}`),
    kind: 'world',
    name: String(template.name ?? 'World'),
    center: centre,
    template: clone(template)
  };
}

export function asteroidFieldBody({ name = 'Asteroid belt', center = { x: 0, y: 0 }, radius = 20, perSquareInch = ASTEROID_DENSITY_PER_SQUARE_INCH, id = null } = {}) {
  if (!Number.isFinite(radius) || radius <= 0) throw new RangeError('an asteroid field needs a radius in inches');
  return {
    id: id ?? stableDocumentId('body', `asteroids|${name}|${center.x}|${center.y}`),
    kind: 'asteroid-field',
    name: String(name),
    center: { x: Number(center.x) || 0, y: Number(center.y) || 0 },
    radius,
    perSquareInch: Number.isFinite(perSquareInch) && perSquareInch > 0 ? perSquareInch : ASTEROID_DENSITY_PER_SQUARE_INCH
  };
}

export function emplacementBody({ name = 'Defence battery', center = { x: 0, y: 0 }, site = 'orbital', turrets = 1, id = null } = {}) {
  if (!EMPLACEMENT_SITES.includes(site)) throw new RangeError(`an emplacement is ${EMPLACEMENT_SITES.join(' or ')}`);
  if (!Number.isInteger(turrets) || turrets < 1) throw new RangeError('an emplacement needs at least one turret');
  return {
    id: id ?? stableDocumentId('body', `emplacement|${name}|${center.x}|${center.y}`),
    kind: 'emplacement',
    name: String(name),
    center: { x: Number(center.x) || 0, y: Number(center.y) || 0 },
    site,
    turrets
  };
}

export function placeSceneBody(document, body) {
  const next = importSceneDocument(document);
  if (!sceneIsVectorBoard(next)) throw new TypeError('bodies belong to a vector board');
  const { half } = sceneVectorExtent(next);
  if (Math.abs(body.center.x) > half || Math.abs(body.center.y) > half) throw new RangeError('that position is off the board');
  next.space.bodies.push(clone(body));
  assertValidSceneDocument(next);
  return next;
}

export function moveSceneBody(document, { bodyId, x, y } = {}) {
  const next = importSceneDocument(document);
  if (!sceneIsVectorBoard(next)) throw new TypeError('bodies belong to a vector board');
  const body = next.space.bodies.find((entry) => entry.id === bodyId);
  if (!body) throw new Error('that body is not on this scene');
  const { half } = sceneVectorExtent(next);
  const centre = {
    x: Math.max(-half, Math.min(half, Number(x) || 0)),
    y: Math.max(-half, Math.min(half, Number(y) || 0))
  };
  body.center = centre;
  // A world's gravity is computed from its template's own centre, so the two
  // have to move together or the bands stay where the disc was.
  if (body.kind === 'world' && body.template) body.template = { ...body.template, center: { ...centre } };
  assertValidSceneDocument(next);
  return next;
}

export function removeSceneBody(document, bodyId) {
  const next = importSceneDocument(document);
  if (!sceneIsVectorBoard(next)) throw new TypeError('bodies belong to a vector board');
  next.space.bodies = next.space.bodies.filter((entry) => entry.id !== bodyId);
  if (next.space.gravityBodyId === bodyId) next.space.gravityBodyId = null;
  assertValidSceneDocument(next);
  return next;
}

export function setSceneGravityBody(document, bodyId) {
  const next = importSceneDocument(document);
  if (!sceneIsVectorBoard(next)) throw new TypeError('bodies belong to a vector board');
  if (bodyId !== null && !next.space.bodies.some((entry) => entry.id === bodyId && entry.kind === 'world')) {
    throw new Error('only a staged world can be the gravity template');
  }
  next.space.gravityBodyId = bodyId;
  assertValidSceneDocument(next);
  return next;
}

export function sceneBodies(scene) {
  return sceneIsVectorBoard(scene) ? (scene.space?.bodies ?? []) : [];
}

// The world a fight on this scene takes its gravity template from: the first
// one staged, or the one explicitly named. Null for clear space.
export function sceneGravityWorld(scene) {
  const bodies = sceneBodies(scene);
  const named = scene.space?.gravityBodyId
    ? bodies.find((body) => body.id === scene.space.gravityBodyId && body.kind === 'world')
    : null;
  return named ?? bodies.find((body) => body.kind === 'world') ?? null;
}

export function sceneBoardMeters(scene) {
  if (sceneIsVectorBoard(scene)) throw new TypeError('a vector board is measured in thousands of miles, not metres');
  return scene.board.squares * scene.board.metersPerSquare;
}

// The board as an encounter sees it: metre cells, columns = rows = metres + 1.
export function sceneBoardCells(scene) {
  const meters = sceneBoardMeters(scene);
  return { columns: meters + 1, rows: meters + 1, metersPerSquare: scene.board.metersPerSquare };
}

// The board as the vector plot sees it: a continuous plane in inches, each inch
// a thousand miles (p.22), centred on the origin.
export function sceneVectorExtent(scene) {
  if (!sceneIsVectorBoard(scene)) throw new TypeError('not a vector board');
  const half = scene.board.spanThousandMiles / 2;
  return { half, minimum: -half, maximum: half, spanThousandMiles: scene.board.spanThousandMiles };
}

export function createSceneDocument({ id, campaignId, name, folder = DEFAULT_SCENE_FOLDER, boardKind = 'grid', squares = 40, metersPerSquare = 5, spanThousandMiles = SCENE_VECTOR_DEFAULT_SPAN, planet = null, atmosphere = null, backgroundAssetId = null, notes = '', createdAt = Date.now() } = {}) {
  if (!nonblank(campaignId)) throw new TypeError('campaignId is required');
  if (!nonblank(name)) throw new TypeError('a scene needs a name');
  if (!SCENE_BOARD_KINDS.includes(boardKind)) throw new RangeError(`board kind must be one of ${SCENE_BOARD_KINDS.join(', ')}`);
  let board;
  if (boardKind === 'vector') {
    if (!Number.isFinite(spanThousandMiles) || spanThousandMiles < SCENE_VECTOR_MIN_SPAN || spanThousandMiles > SCENE_VECTOR_MAX_SPAN) {
      throw new RangeError(`a vector board spans ${SCENE_VECTOR_MIN_SPAN} to ${SCENE_VECTOR_MAX_SPAN} thousand miles a side`);
    }
    board = { kind: 'vector', spanThousandMiles };
  } else {
    if (!SCENE_GRID_SCALES.includes(metersPerSquare)) throw new RangeError('grid scale must be 1, 5, or 25 meters');
    if (!Number.isInteger(squares) || squares < SCENE_MIN_SQUARES || squares * metersPerSquare > SCENE_MAX_METERS) {
      throw new RangeError(`a scene is ${SCENE_MIN_SQUARES} squares to ${SCENE_MAX_METERS} m a side`);
    }
    board = { kind: 'grid', squares, metersPerSquare };
  }
  const document = {
    documentType: SCENE_DOCUMENT_TYPE,
    schemaVersion: CURRENT_SCENE_DOCUMENT_SCHEMA_VERSION,
    identity: { id: id ?? stableDocumentId('scene', `${campaignId}|${name}|${createdAt}`), name: name.trim() },
    campaignId,
    folder: nonblank(folder) ? folder.trim() : DEFAULT_SCENE_FOLDER,
    board,
    // Book 2 pp.26-27's template belongs to the scene, not to the fight: the
    // referee draws San Telmo once and every action there uses it. Atmosphere
    // rides along because p.35 braking depends on it and nothing else carries
    // it. Both null on a grid board.
    space: boardKind === 'vector'
      ? {
        bodies: planet === null ? [] : [worldBody(planet)],
        gravityBodyId: null,
        atmosphere: Number.isInteger(atmosphere) ? atmosphere : null
      }
      : null,
    background: { assetId: nonblank(backgroundAssetId) ? backgroundAssetId : null },
    tokens: [],
    notes: typeof notes === 'string' ? notes : '',
    createdAt
  };
  assertValidSceneDocument(document);
  return document;
}

export function validateSceneDocument(document) {
  const errors = [];
  add(errors, plain(document), 'scene document must be an object');
  if (!plain(document)) return errors;
  add(errors, document.documentType === SCENE_DOCUMENT_TYPE, `documentType must be ${SCENE_DOCUMENT_TYPE}`);
  add(errors, document.schemaVersion === CURRENT_SCENE_DOCUMENT_SCHEMA_VERSION, `schemaVersion must be ${CURRENT_SCENE_DOCUMENT_SCHEMA_VERSION}`);
  add(errors, plain(document.identity) && nonblank(document.identity.id) && nonblank(document.identity.name), 'identity needs an id and a name');
  add(errors, nonblank(document.campaignId), 'campaignId is required');
  add(errors, nonblank(document.folder), 'folder is required');
  const vector = plain(document.board) && document.board.kind === 'vector';
  add(errors, plain(document.board) && SCENE_BOARD_KINDS.includes(document.board.kind), `board.kind must be one of ${SCENE_BOARD_KINDS.join(', ')}`);
  if (vector) {
    add(errors, Number.isFinite(document.board.spanThousandMiles)
      && document.board.spanThousandMiles >= SCENE_VECTOR_MIN_SPAN
      && document.board.spanThousandMiles <= SCENE_VECTOR_MAX_SPAN,
      `a vector board spans ${SCENE_VECTOR_MIN_SPAN} to ${SCENE_VECTOR_MAX_SPAN} thousand miles a side`);
    add(errors, document.board.squares === undefined && document.board.metersPerSquare === undefined,
      'a vector board has no squares and no metre scale');
    add(errors, plain(document.space) && Array.isArray(document.space.bodies)
      && (document.space.gravityBodyId === null || nonblank(document.space.gravityBodyId))
      && (document.space.atmosphere === null || Number.isInteger(document.space.atmosphere)),
      'a vector board needs a space block with bodies, a gravity body (or null) and an atmosphere (or null)');
    if (plain(document.space) && Array.isArray(document.space.bodies)) {
      const half = (document.board.spanThousandMiles ?? 0) / 2;
      const bodyIds = new Set();
      for (const body of document.space.bodies) {
        add(errors, plain(body) && nonblank(body.id) && nonblank(body.name), 'a body needs an id and a name');
        if (!plain(body)) continue;
        if (nonblank(body.id)) { add(errors, !bodyIds.has(body.id), `duplicate body: ${body.id}`); bodyIds.add(body.id); }
        add(errors, SCENE_BODY_KINDS.includes(body.kind), `a body kind must be one of ${SCENE_BODY_KINDS.join(', ')}`);
        add(errors, plain(body.center) && Number.isFinite(body.center.x) && Number.isFinite(body.center.y)
          && Math.abs(body.center.x) <= half && Math.abs(body.center.y) <= half, `${body.name} is off the board`);
        if (body.kind === 'world') {
          add(errors, plain(body.template) && Number.isFinite(body.template.radius) && Array.isArray(body.template.bands),
            `${body.name} needs a pp.26-27 template`);
          add(errors, !Number.isFinite(body.template?.radius) || body.template.radius * 2 <= SCENE_WORLD_MAX_DIAMETER,
            `a world is at most ${SCENE_WORLD_MAX_DIAMETER}" across`);
        }
        if (body.kind === 'asteroid-field') {
          add(errors, Number.isFinite(body.radius) && body.radius > 0, `${body.name} needs a radius in inches`);
          add(errors, Number.isFinite(body.perSquareInch) && body.perSquareInch > 0, `${body.name} needs a density`);
        }
        if (body.kind === 'emplacement') {
          add(errors, EMPLACEMENT_SITES.includes(body.site), `${body.name} is ${EMPLACEMENT_SITES.join(' or ')}`);
          add(errors, Number.isInteger(body.turrets) && body.turrets >= 1, `${body.name} needs at least one turret`);
        }
      }
      add(errors, document.space.gravityBodyId === null || bodyIds.has(document.space.gravityBodyId),
        'the gravity body is not on this scene');
    }
  } else {
    add(errors, plain(document.board) && SCENE_GRID_SCALES.includes(document.board.metersPerSquare), 'board.metersPerSquare must be 1, 5, or 25');
    add(errors, plain(document.board) && Number.isInteger(document.board.squares) && document.board.squares >= SCENE_MIN_SQUARES && document.board.squares * (document.board.metersPerSquare ?? 1) <= SCENE_MAX_METERS, `board is ${SCENE_MIN_SQUARES} squares to ${SCENE_MAX_METERS} m a side`);
    add(errors, document.space === null, 'a grid board carries no space block');
  }
  add(errors, plain(document.background) && (document.background.assetId === null || nonblank(document.background.assetId)), 'background.assetId must be null or an asset id');
  add(errors, Array.isArray(document.tokens), 'tokens must be an array');
  if (Array.isArray(document.tokens) && plain(document.board)) {
    const cells = vector ? null : document.board.squares * (document.board.metersPerSquare ?? 1) + 1;
    const half = vector ? (document.board.spanThousandMiles ?? 0) / 2 : null;
    const ids = new Set();
    for (const token of document.tokens) {
      add(errors, plain(token) && nonblank(token.id) && nonblank(token.actorId), 'a staged token needs an id and an actorId');
      if (!plain(token)) continue;
      if (nonblank(token.id)) { add(errors, !ids.has(token.id), `duplicate staged token: ${token.id}`); ids.add(token.id); }
      add(errors, SCENE_TOKEN_SIDES.includes(token.side), `staged token side must be one of ${SCENE_TOKEN_SIDES.join(', ')}`);
      if (vector) {
        // Continuous inches from the origin, not cells. p.25: a position is a
        // point on the surface, marked with string or chalk.
        add(errors, plain(token.position) && Number.isFinite(token.position.x) && Number.isFinite(token.position.y)
          && Math.abs(token.position.x) <= half && Math.abs(token.position.y) <= half, 'staged token position is off the vector board');
        // The vector a ship arrives with. p.25 makes 0 a legal vector, so an
        // absent velocity means stationary rather than unset.
        add(errors, token.velocity === undefined
          || (plain(token.velocity) && Number.isFinite(token.velocity.x) && Number.isFinite(token.velocity.y)),
          'staged token velocity must be a finite vector');
      } else {
        add(errors, plain(token.position) && Number.isInteger(token.position.column) && Number.isInteger(token.position.row)
          && token.position.column >= 0 && token.position.column < cells && token.position.row >= 0 && token.position.row < cells, 'staged token position is off the board');
        add(errors, token.velocity === undefined, 'a grid token carries no velocity');
      }
      add(errors, typeof token.label === 'string', 'staged token label must be a string');
      add(errors, token.inCombat === undefined || typeof token.inCombat === 'boolean', 'inCombat must be a boolean');
    }
  }
  add(errors, typeof document.notes === 'string', 'notes must be a string');
  return errors;
}

export function assertValidSceneDocument(document) {
  const errors = validateSceneDocument(document);
  if (errors.length) throw new SceneDocumentValidationError(errors);
}

// Every scene written before v0.158.0 is a grid board: that was the only kind.
// Migrating rather than rejecting, so existing campaigns keep their scenes.
export function migrateSceneDocument(input) {
  const scene = clone(input);
  if (scene.schemaVersion === 1) {
    scene.board = { kind: 'grid', squares: scene.board?.squares, metersPerSquare: scene.board?.metersPerSquare };
    scene.space = null;
    scene.schemaVersion = 2;
  }
  if (scene.schemaVersion === 2) {
    // v2 held one optional planet; v3 holds a list of bodies. A scene with a
    // planet keeps it as its first world and its gravity template.
    if (scene.board?.kind === 'vector') {
      const planet = scene.space?.planet ?? null;
      const bodies = planet ? [worldBody(planet)] : [];
      scene.space = {
        bodies,
        gravityBodyId: bodies.length ? bodies[0].id : null,
        atmosphere: scene.space?.atmosphere ?? null
      };
    }
    scene.schemaVersion = 3;
  }
  return scene;
}

export function importSceneDocument(input) {
  const parsed = parse(input);
  if (!plain(parsed)) throw new SceneDocumentValidationError('scene document must be an object');
  if (!SUPPORTED_SCENE_DOCUMENT_SCHEMA_VERSIONS.includes(parsed.schemaVersion)) throw new SceneDocumentValidationError(`unsupported schemaVersion: ${parsed.schemaVersion}`);
  const migrated = migrateSceneDocument(parsed);
  assertValidSceneDocument(migrated);
  return clone(migrated);
}

export function exportSceneDocument(document, { space = 2 } = {}) {
  assertValidSceneDocument(document);
  return JSON.stringify(document, null, space);
}

export function updateSceneDocument(document, { name, folder, squares, metersPerSquare, spanThousandMiles, planet, atmosphere, backgroundAssetId, notes } = {}) {
  const next = importSceneDocument(document);
  const vector = sceneIsVectorBoard(next);
  if (name !== undefined) { if (!nonblank(name)) throw new TypeError('a scene needs a name'); next.identity.name = name.trim(); }
  if (folder !== undefined) next.folder = nonblank(folder) ? folder.trim() : DEFAULT_SCENE_FOLDER;
  // A board does not change kind: the two express different geometry and the
  // staged tokens are addressed differently. Applying a grid size to a vector
  // board would have written squares into it and stranded every ship.
  if ((squares !== undefined || metersPerSquare !== undefined) && vector) throw new TypeError('a vector board is not sized in squares');
  if ((spanThousandMiles !== undefined || planet !== undefined || atmosphere !== undefined) && !vector) throw new TypeError('a grid board has no span, planet or atmosphere');
  if (squares !== undefined) next.board.squares = squares;
  if (metersPerSquare !== undefined) next.board.metersPerSquare = metersPerSquare;
  if (spanThousandMiles !== undefined) next.board.spanThousandMiles = spanThousandMiles;
  // v0.163.0: `planet` is kept as a convenience for the single-world case that
  // v2 scenes and the creation dialog use. It replaces the gravity world, or
  // clears every world when null; asteroid fields and emplacements are
  // untouched and are edited with placeSceneBody / moveSceneBody.
  if (planet !== undefined) {
    const others = next.space.bodies.filter((body) => body.kind !== 'world');
    if (planet === null) {
      next.space.bodies = others;
      next.space.gravityBodyId = null;
    } else {
      const body = worldBody(planet);
      next.space.bodies = [body, ...others];
      next.space.gravityBodyId = body.id;
    }
  }
  if (atmosphere !== undefined) next.space.atmosphere = Number.isInteger(atmosphere) ? atmosphere : null;
  if (backgroundAssetId !== undefined) next.background.assetId = nonblank(backgroundAssetId) ? backgroundAssetId : null;
  if (notes !== undefined) next.notes = String(notes ?? '');
  // A smaller board may strand a token: drop any now off the edge.
  if (vector) {
    const half = next.board.spanThousandMiles / 2;
    next.tokens = next.tokens.filter((token) => Math.abs(token.position.x) <= half && Math.abs(token.position.y) <= half);
    next.space.bodies = next.space.bodies.filter((body) => Math.abs(body.center.x) <= half && Math.abs(body.center.y) <= half);
    if (next.space.gravityBodyId && !next.space.bodies.some((body) => body.id === next.space.gravityBodyId)) next.space.gravityBodyId = null;
  } else {
    const cells = next.board.squares * next.board.metersPerSquare + 1;
    next.tokens = next.tokens.filter((token) => token.position.column < cells && token.position.row < cells);
  }
  assertValidSceneDocument(next);
  return next;
}

function snap(value, gridScale) { return Math.round(value / gridScale) * gridScale; }

// v0.164.2: a staged ship may be a reference to one of Book 2 pp.18-20's
// standard designs rather than a ship that exists. A design is a set of plans
// (p.9), so any number of ships may be built from one: three Type S scouts
// are three tokens with the same design reference. A token's identity is its
// id; its actorId only says what it was built from.
export const SCENE_DESIGN_REFERENCE_PREFIX = 'design:';

export function sceneActorIsDesignReference(actorId) {
  return typeof actorId === 'string' && actorId.startsWith(SCENE_DESIGN_REFERENCE_PREFIX);
}

// The first token for an actor keeps the id every earlier release gave it, so
// scenes already saved do not change; later ones take the next free ordinal.
function freshTokenId(sceneId, actorId, taken) {
  const first = stableDocumentId('token', `${sceneId}|${actorId}`);
  if (!taken.has(first)) return first;
  for (let ordinal = 2; ; ordinal += 1) {
    const id = stableDocumentId('token', `${sceneId}|${actorId}|${ordinal}`);
    if (!taken.has(id)) return id;
  }
}

function retokenise(sceneId, tokens) {
  const taken = new Set();
  return tokens.map((token) => {
    const id = freshTokenId(sceneId, token.actorId, taken);
    taken.add(id);
    return { ...token, id, position: { ...token.position }, ...(token.velocity ? { velocity: { ...token.velocity } } : {}), inCombat: false };
  });
}

// Stage an actor on the board. Positions are metre cells snapped to the grid,
// exactly as an encounter stores them.
// A ship staged on a vector board: a point in inches and the vector it arrives
// with. Separate from the grid path because nothing about it is the same —
// continuous coordinates, no snapping, and a velocity.
export function placeSceneShip(document, { actorId, side = 'neutral', x = 0, y = 0, velocity = null, label = '' } = {}) {
  const next = importSceneDocument(document);
  if (!sceneIsVectorBoard(next)) throw new TypeError('placeSceneShip needs a vector board');
  if (!nonblank(actorId)) throw new TypeError('actorId is required');
  const sameActor = next.tokens.filter((token) => token.actorId === actorId).length;
  // A real ship is one hull and can be in one place. A design reference is not.
  if (sameActor && !sceneActorIsDesignReference(actorId)) throw new Error('that actor is already on this scene');
  const { half } = sceneVectorExtent(next);
  const position = {
    x: Math.max(-half, Math.min(half, Number(x) || 0)),
    y: Math.max(-half, Math.min(half, Number(y) || 0))
  };
  const token = {
    id: freshTokenId(next.identity.id, actorId, new Set(next.tokens.map((entry) => entry.id))),
    actorId, side, position,
    velocity: velocity === null ? defaultShipVector(position) : { x: Number(velocity.x) || 0, y: Number(velocity.y) || 0 },
    // The second scout reads SCOUT 2, so a log line or a target names one hull.
    label: sameActor && nonblank(label) ? `${label} ${sameActor + 1}` : String(label ?? ''), inCombat: false
  };
  next.tokens.push(token);
  assertValidSceneDocument(next);
  return { scene: next, token };
}

// Toward the origin at the default speed. A ship staged exactly on the origin
// has nowhere to close on, so it starts stationary — p.25's legal vector of 0.
export function defaultShipVector(position) {
  const distance = Math.hypot(position.x, position.y);
  if (!distance) return { x: 0, y: 0 };
  const scale = SCENE_VECTOR_DEFAULT_SPEED / distance;
  return { x: -position.x * scale, y: -position.y * scale };
}

export function setSceneShipVector(document, { tokenId, velocity } = {}) {
  const next = importSceneDocument(document);
  if (!sceneIsVectorBoard(next)) throw new TypeError('a vector belongs to a vector board');
  const token = next.tokens.find((entry) => entry.id === tokenId);
  if (!token) throw new Error('token is not on this scene');
  token.velocity = { x: Number(velocity?.x) || 0, y: Number(velocity?.y) || 0 };
  assertValidSceneDocument(next);
  return next;
}

export function moveSceneShip(document, { tokenId, x, y } = {}) {
  const next = importSceneDocument(document);
  if (!sceneIsVectorBoard(next)) throw new TypeError('moveSceneShip needs a vector board');
  const token = next.tokens.find((entry) => entry.id === tokenId);
  if (!token) throw new Error('token is not on this scene');
  const { half } = sceneVectorExtent(next);
  token.position = {
    x: Math.max(-half, Math.min(half, Number(x) || 0)),
    y: Math.max(-half, Math.min(half, Number(y) || 0))
  };
  assertValidSceneDocument(next);
  return next;
}

export function placeSceneToken(document, { actorId, side = 'neutral', column, row, label = '' } = {}) {
  const next = importSceneDocument(document);
  if (sceneIsVectorBoard(next)) throw new TypeError('a vector board stages ships with placeSceneShip');
  if (!nonblank(actorId)) throw new TypeError('actorId is required');
  if (next.tokens.some((token) => token.actorId === actorId)) throw new Error('that actor is already on this scene');
  const cells = next.board.squares * next.board.metersPerSquare + 1;
  const gridScale = next.board.metersPerSquare;
  const position = {
    column: Math.max(0, Math.min(cells - 1, snap(Number(column ?? 0), gridScale))),
    row: Math.max(0, Math.min(cells - 1, snap(Number(row ?? 0), gridScale)))
  };
  const token = { id: stableDocumentId('token', `${next.identity.id}|${actorId}`), actorId, side, position, label: String(label ?? ''), inCombat: false };
  next.tokens.push(token);
  assertValidSceneDocument(next);
  return { scene: next, token };
}

export function moveSceneToken(document, { tokenId, column, row } = {}) {
  const next = importSceneDocument(document);
  if (sceneIsVectorBoard(next)) throw new TypeError('a vector board moves ships with moveSceneShip');
  const token = next.tokens.find((entry) => entry.id === tokenId);
  if (!token) throw new Error('token is not on this scene');
  const cells = next.board.squares * next.board.metersPerSquare + 1;
  const gridScale = next.board.metersPerSquare;
  token.position = {
    column: Math.max(0, Math.min(cells - 1, snap(Number(column), gridScale))),
    row: Math.max(0, Math.min(cells - 1, snap(Number(row), gridScale)))
  };
  assertValidSceneDocument(next);
  return next;
}

// v0.170.0: a staged token's side and label change from its menu.
export function setSceneTokenSide(document, { tokenId, side } = {}) {
  const next = importSceneDocument(document);
  const token = next.tokens.find((entry) => entry.id === tokenId);
  if (!token) throw new Error('token is not on this scene');
  if (!SCENE_TOKEN_SIDES.includes(side)) throw new RangeError(`side must be one of ${SCENE_TOKEN_SIDES.join(', ')}`);
  token.side = side;
  assertValidSceneDocument(next);
  return next;
}

export function setSceneTokenLabel(document, { tokenId, label } = {}) {
  const next = importSceneDocument(document);
  const token = next.tokens.find((entry) => entry.id === tokenId);
  if (!token) throw new Error('token is not on this scene');
  token.label = String(label ?? '').trim();
  assertValidSceneDocument(next);
  return next;
}

export function removeSceneToken(document, tokenId) {
  const next = importSceneDocument(document);
  next.tokens = next.tokens.filter((entry) => entry.id !== tokenId);
  return next;
}

// Folders are paths on the scene, Foundry-style: "Ports/Aster". The directory
// groups by them; nothing else needs to know they nest.
export function sceneFolders(scenes) {
  const folders = new Map();
  for (const scene of scenes) {
    const key = scene.folder || DEFAULT_SCENE_FOLDER;
    if (!folders.has(key)) folders.set(key, []);
    folders.get(key).push(scene);
  }
  return [...folders.entries()].sort(([left], [right]) => left.localeCompare(right))
    .map(([folder, entries]) => ({ folder, scenes: entries.sort((left, right) => left.identity.name.localeCompare(right.identity.name)) }));
}

// v0.74.0: the combat tracker. A staged token is added to the tracker or
// taken off it; a fight starts from the tracked tokens, the way Foundry's
// tracker works. After the fight is created every flag is cleared.
export function setSceneTokenCombat(document, tokenId, inCombat) {
  const next = importSceneDocument(document);
  const token = next.tokens.find((entry) => entry.id === tokenId);
  if (!token) throw new Error('token is not on this scene');
  token.inCombat = Boolean(inCombat);
  return next;
}

export function clearSceneCombatTracker(document) {
  const next = importSceneDocument(document);
  for (const token of next.tokens) token.inCombat = false;
  return next;
}

export function trackedSceneTokens(document) {
  return (document?.tokens ?? []).filter((token) => token.inCombat === true);
}

// --- v0.82.0: the Scenes directory --------------------------------------

// v0.164.2: a copy of a space scene is a space scene. Both paths below built
// a grid board and then threw on the first staged ship, which has no cells.
function vectorBoardOptions(source) {
  return sceneIsVectorBoard(source)
    ? { boardKind: 'vector', spanThousandMiles: source.board.spanThousandMiles }
    : {};
}

// A copy with a new identity, tokens and tracker included, named "<name> (copy)".
export function duplicateSceneDocument(document, { createdAt = Date.now(), name = null } = {}) {
  const source = importSceneDocument(document);
  const copy = createSceneDocument({
    campaignId: source.campaignId,
    name: name ?? `${source.identity.name} (copy)`,
    folder: source.folder,
    squares: source.board.squares,
    metersPerSquare: source.board.metersPerSquare,
    ...vectorBoardOptions(source),
    backgroundAssetId: source.background.assetId,
    notes: source.notes,
    createdAt
  });
  if (sceneIsVectorBoard(source)) copy.space = structuredClone(source.space);
  copy.tokens = retokenise(copy.identity.id, source.tokens);
  assertValidSceneDocument(copy);
  return copy;
}

// Move every scene in a folder to another (default: the root folder).
export function moveScenesToFolder(scenes, fromFolder, toFolder = DEFAULT_SCENE_FOLDER) {
  return scenes.map((scene) => (scene.folder === fromFolder ? updateSceneDocument(scene, { folder: toFolder }) : scene));
}

// A scene imported from a file belongs to the campaign it is imported into,
// and takes a fresh identity so two imports of one file do not collide.
export function adoptSceneDocument(document, { campaignId, createdAt = Date.now() } = {}) {
  const source = importSceneDocument(document);
  const adopted = createSceneDocument({
    campaignId, name: source.identity.name, folder: source.folder,
    squares: source.board.squares, metersPerSquare: source.board.metersPerSquare,
    ...vectorBoardOptions(source),
    backgroundAssetId: source.background.assetId, notes: source.notes, createdAt
  });
  if (sceneIsVectorBoard(source)) adopted.space = structuredClone(source.space);
  adopted.tokens = retokenise(adopted.identity.id, source.tokens);
  assertValidSceneDocument(adopted);
  return adopted;
}

// The directory's thumbnail: the board as a small SVG string — a faint grid
// at the scene's own scale and each staged token as a dot by side. No DOM,
// so it renders anywhere and is testable.
export function sceneThumbnailSvg(scene, { size = 96 } = {}) {
  // A vector board has no grid to draw. What identifies it at a glance is the
  // planetary template (pp.26-27) and where the ships sit on the span.
  if (sceneIsVectorBoard(scene)) {
    const half = scene.board.spanThousandMiles / 2;
    const unit = (size / 2) / half;
    const at = (value) => (size / 2 + value * unit).toFixed(2);
    // v0.163.0: every body Book 2 puts in space, not just the one planet.
    const bodies = sceneBodies(scene).map((body) => {
      if (body.kind === 'world') {
        const template = body.template;
        const rings = [...(template.bands ?? [])].map((band) => `<circle cx="${at(body.center.x)}" cy="${at(body.center.y)}" r="${Math.max(1, band.outerRadius * unit).toFixed(2)}" fill="none" stroke="#b8bab4" stroke-width="0.5" stroke-dasharray="1.5 2"/>`).join('');
        return rings + `<circle cx="${at(body.center.x)}" cy="${at(body.center.y)}" r="${Math.max(1.5, template.radius * unit).toFixed(2)}" fill="#c3c5bf" stroke="#9b9d97" stroke-width="0.5"/>`;
      }
      if (body.kind === 'asteroid-field') {
        // p.28: no significant gravity and no significant size, so a field is
        // an extent rather than a disc.
        return `<circle cx="${at(body.center.x)}" cy="${at(body.center.y)}" r="${Math.max(2, body.radius * unit).toFixed(2)}" fill="none" stroke="#9b9d97" stroke-width="0.5" stroke-dasharray="0.5 2"/>`;
      }
      // p.35 defence fires: a mark, not an area.
      const mark = 2.5;
      return `<path d="M${at(body.center.x)} ${(Number(at(body.center.y)) - mark).toFixed(2)} L${(Number(at(body.center.x)) + mark).toFixed(2)} ${at(body.center.y)} L${at(body.center.x)} ${(Number(at(body.center.y)) + mark).toFixed(2)} L${(Number(at(body.center.x)) - mark).toFixed(2)} ${at(body.center.y)} Z" fill="#6a1f1f"/>`;
    }).join('');
    const ships = scene.tokens.map((token) => {
      const fill = token.side === 'party' ? '#29465c' : token.side === 'opposition' ? '#6a1f1f' : '#777a75';
      return `<circle cx="${at(token.position.x)}" cy="${at(token.position.y)}" r="2" fill="${fill}"/>`;
    }).join('');
    const centre = (size / 2).toFixed(2);
    const frame = `<rect x="0.5" y="0.5" width="${size - 1}" height="${size - 1}" fill="none" stroke="#b8bab4" stroke-width="1"/>`
      + `<circle cx="${centre}" cy="${centre}" r="${(size / 2 - 4).toFixed(2)}" fill="none" stroke="#c9cbc5" stroke-width="0.5" stroke-dasharray="2 3"/>`
      + `<line x1="${centre}" y1="${(size / 2 - 4).toFixed(2)}" x2="${centre}" y2="${(size / 2 + 4).toFixed(2)}" stroke="#9b9d97" stroke-width="0.75"/>`
      + `<line x1="${(size / 2 - 4).toFixed(2)}" y1="${centre}" x2="${(size / 2 + 4).toFixed(2)}" y2="${centre}" stroke="#9b9d97" stroke-width="0.75"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${scene.identity.name.replace(/"/g, '&quot;')}"><rect width="${size}" height="${size}" fill="#e7e7e2"/>${frame}${bodies}${ships}</svg>`;
  }
  const squares = scene.board.squares;
  const cell = size / squares;
  const step = squares > 40 ? Math.ceil(squares / 20) : squares > 20 ? 2 : 1;
  const lines = [];
  for (let i = 0; i <= squares; i += step) {
    const at = (i * cell).toFixed(2);
    lines.push(`<line x1="${at}" y1="0" x2="${at}" y2="${size}"/>`, `<line x1="0" y1="${at}" x2="${size}" y2="${at}"/>`);
  }
  const dots = scene.tokens.map((token) => {
    const x = ((token.position.column / scene.board.metersPerSquare) * cell).toFixed(2);
    const y = ((token.position.row / scene.board.metersPerSquare) * cell).toFixed(2);
    const fill = token.side === 'party' ? '#29465c' : token.side === 'opposition' ? '#6a1f1f' : '#777a75';
    return `<circle cx="${x}" cy="${y}" r="${Math.max(2, cell * 0.45).toFixed(2)}" fill="${fill}"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${scene.identity.name.replace(/"/g, '&quot;')}"><rect width="${size}" height="${size}" fill="#d9d9d3"/><g stroke="#b8bab4" stroke-width="0.5">${lines.join('')}</g>${dots}</svg>`;
}

export function sceneMatchesSearch(scene, query) {
  const text = String(query ?? '').trim().toLowerCase();
  if (!text) return true;
  return scene.identity.name.toLowerCase().includes(text) || scene.folder.toLowerCase().includes(text);
}

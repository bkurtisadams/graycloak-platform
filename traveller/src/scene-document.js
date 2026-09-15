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

import { stableDocumentId } from '../vendor/classic-traveller-rules/index.js';

export const SCENE_DOCUMENT_TYPE = 'graycloak-traveller-scene';
export const CURRENT_SCENE_DOCUMENT_SCHEMA_VERSION = 2;
export const SUPPORTED_SCENE_DOCUMENT_SCHEMA_VERSIONS = Object.freeze([1, 2]);

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
      ? { planet: planet === null ? null : clone(planet), atmosphere: Number.isInteger(atmosphere) ? atmosphere : null }
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
    add(errors, plain(document.space)
      && (document.space.planet === null || plain(document.space.planet))
      && (document.space.atmosphere === null || Number.isInteger(document.space.atmosphere)),
      'a vector board needs a space block with a planet (or null) and an atmosphere (or null)');
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
  if (planet !== undefined) next.space.planet = planet === null ? null : clone(planet);
  if (atmosphere !== undefined) next.space.atmosphere = Number.isInteger(atmosphere) ? atmosphere : null;
  if (backgroundAssetId !== undefined) next.background.assetId = nonblank(backgroundAssetId) ? backgroundAssetId : null;
  if (notes !== undefined) next.notes = String(notes ?? '');
  // A smaller board may strand a token: drop any now off the edge.
  if (vector) {
    const half = next.board.spanThousandMiles / 2;
    next.tokens = next.tokens.filter((token) => Math.abs(token.position.x) <= half && Math.abs(token.position.y) <= half);
  } else {
    const cells = next.board.squares * next.board.metersPerSquare + 1;
    next.tokens = next.tokens.filter((token) => token.position.column < cells && token.position.row < cells);
  }
  assertValidSceneDocument(next);
  return next;
}

function snap(value, gridScale) { return Math.round(value / gridScale) * gridScale; }

// Stage an actor on the board. Positions are metre cells snapped to the grid,
// exactly as an encounter stores them.
export function placeSceneToken(document, { actorId, side = 'neutral', column, row, label = '' } = {}) {
  const next = importSceneDocument(document);
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

// A copy with a new identity, tokens and tracker included, named "<name> (copy)".
export function duplicateSceneDocument(document, { createdAt = Date.now(), name = null } = {}) {
  const source = importSceneDocument(document);
  const copy = createSceneDocument({
    campaignId: source.campaignId,
    name: name ?? `${source.identity.name} (copy)`,
    folder: source.folder,
    squares: source.board.squares,
    metersPerSquare: source.board.metersPerSquare,
    backgroundAssetId: source.background.assetId,
    notes: source.notes,
    createdAt
  });
  copy.tokens = source.tokens.map((token) => ({ ...token, id: stableDocumentId('token', `${copy.identity.id}|${token.actorId}`), position: { ...token.position }, inCombat: false }));
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
    backgroundAssetId: source.background.assetId, notes: source.notes, createdAt
  });
  adopted.tokens = source.tokens.map((token) => ({ ...token, id: stableDocumentId('token', `${adopted.identity.id}|${token.actorId}`), position: { ...token.position }, inCombat: false }));
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
    const planet = scene.space?.planet ?? null;
    const rings = planet
      ? [...(planet.bands ?? [])].map((band) => `<circle cx="${at(planet.center?.x ?? 0)}" cy="${at(planet.center?.y ?? 0)}" r="${Math.max(1, (band.outerRadius ?? 0) * unit).toFixed(2)}" fill="none" stroke="#b8bab4" stroke-width="0.5" stroke-dasharray="1.5 2"/>`).join('')
        + `<circle cx="${at(planet.center?.x ?? 0)}" cy="${at(planet.center?.y ?? 0)}" r="${Math.max(1.5, ((planet.diameter ?? 0) / 2) * unit).toFixed(2)}" fill="#c3c5bf" stroke="#9b9d97" stroke-width="0.5"/>`
      : '';
    const ships = scene.tokens.map((token) => {
      const fill = token.side === 'party' ? '#29465c' : token.side === 'opposition' ? '#6a1f1f' : '#777a75';
      return `<circle cx="${at(token.position.x)}" cy="${at(token.position.y)}" r="2" fill="${fill}"/>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${scene.identity.name.replace(/"/g, '&quot;')}"><rect width="${size}" height="${size}" fill="#e7e7e2"/>${rings}${ships}</svg>`;
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

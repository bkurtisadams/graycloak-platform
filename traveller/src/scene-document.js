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

import { stableDocumentId } from '../../packages/classic-traveller-rules/index.js';

export const SCENE_DOCUMENT_TYPE = 'graycloak-traveller-scene';
export const CURRENT_SCENE_DOCUMENT_SCHEMA_VERSION = 1;
export const SUPPORTED_SCENE_DOCUMENT_SCHEMA_VERSIONS = Object.freeze([1]);
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

export function sceneBoardMeters(scene) {
  return scene.board.squares * scene.board.metersPerSquare;
}

// The board as an encounter sees it: metre cells, columns = rows = metres + 1.
export function sceneBoardCells(scene) {
  const meters = sceneBoardMeters(scene);
  return { columns: meters + 1, rows: meters + 1, metersPerSquare: scene.board.metersPerSquare };
}

export function createSceneDocument({ id, campaignId, name, folder = DEFAULT_SCENE_FOLDER, squares = 40, metersPerSquare = 5, backgroundAssetId = null, notes = '', createdAt = Date.now() } = {}) {
  if (!nonblank(campaignId)) throw new TypeError('campaignId is required');
  if (!nonblank(name)) throw new TypeError('a scene needs a name');
  if (!SCENE_GRID_SCALES.includes(metersPerSquare)) throw new RangeError('grid scale must be 1, 5, or 25 meters');
  if (!Number.isInteger(squares) || squares < SCENE_MIN_SQUARES || squares * metersPerSquare > SCENE_MAX_METERS) {
    throw new RangeError(`a scene is ${SCENE_MIN_SQUARES} squares to ${SCENE_MAX_METERS} m a side`);
  }
  const document = {
    documentType: SCENE_DOCUMENT_TYPE,
    schemaVersion: CURRENT_SCENE_DOCUMENT_SCHEMA_VERSION,
    identity: { id: id ?? stableDocumentId('scene', `${campaignId}|${name}|${createdAt}`), name: name.trim() },
    campaignId,
    folder: nonblank(folder) ? folder.trim() : DEFAULT_SCENE_FOLDER,
    board: { squares, metersPerSquare },
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
  add(errors, plain(document.board) && SCENE_GRID_SCALES.includes(document.board.metersPerSquare), 'board.metersPerSquare must be 1, 5, or 25');
  add(errors, plain(document.board) && Number.isInteger(document.board.squares) && document.board.squares >= SCENE_MIN_SQUARES && document.board.squares * (document.board.metersPerSquare ?? 1) <= SCENE_MAX_METERS, `board is ${SCENE_MIN_SQUARES} squares to ${SCENE_MAX_METERS} m a side`);
  add(errors, plain(document.background) && (document.background.assetId === null || nonblank(document.background.assetId)), 'background.assetId must be null or an asset id');
  add(errors, Array.isArray(document.tokens), 'tokens must be an array');
  if (Array.isArray(document.tokens) && plain(document.board)) {
    const cells = document.board.squares * (document.board.metersPerSquare ?? 1) + 1;
    const ids = new Set();
    for (const token of document.tokens) {
      add(errors, plain(token) && nonblank(token.id) && nonblank(token.actorId), 'a staged token needs an id and an actorId');
      if (!plain(token)) continue;
      if (nonblank(token.id)) { add(errors, !ids.has(token.id), `duplicate staged token: ${token.id}`); ids.add(token.id); }
      add(errors, SCENE_TOKEN_SIDES.includes(token.side), `staged token side must be one of ${SCENE_TOKEN_SIDES.join(', ')}`);
      add(errors, plain(token.position) && Number.isInteger(token.position.column) && Number.isInteger(token.position.row)
        && token.position.column >= 0 && token.position.column < cells && token.position.row >= 0 && token.position.row < cells, 'staged token position is off the board');
      add(errors, typeof token.label === 'string', 'staged token label must be a string');
    }
  }
  add(errors, typeof document.notes === 'string', 'notes must be a string');
  return errors;
}

export function assertValidSceneDocument(document) {
  const errors = validateSceneDocument(document);
  if (errors.length) throw new SceneDocumentValidationError(errors);
}

export function importSceneDocument(input) {
  const parsed = parse(input);
  if (!plain(parsed)) throw new SceneDocumentValidationError('scene document must be an object');
  if (!SUPPORTED_SCENE_DOCUMENT_SCHEMA_VERSIONS.includes(parsed.schemaVersion)) throw new SceneDocumentValidationError(`unsupported schemaVersion: ${parsed.schemaVersion}`);
  assertValidSceneDocument(parsed);
  return clone(parsed);
}

export function exportSceneDocument(document, { space = 2 } = {}) {
  assertValidSceneDocument(document);
  return JSON.stringify(document, null, space);
}

export function updateSceneDocument(document, { name, folder, squares, metersPerSquare, backgroundAssetId, notes } = {}) {
  const next = importSceneDocument(document);
  if (name !== undefined) { if (!nonblank(name)) throw new TypeError('a scene needs a name'); next.identity.name = name.trim(); }
  if (folder !== undefined) next.folder = nonblank(folder) ? folder.trim() : DEFAULT_SCENE_FOLDER;
  if (squares !== undefined) next.board.squares = squares;
  if (metersPerSquare !== undefined) next.board.metersPerSquare = metersPerSquare;
  if (backgroundAssetId !== undefined) next.background.assetId = nonblank(backgroundAssetId) ? backgroundAssetId : null;
  if (notes !== undefined) next.notes = String(notes ?? '');
  // A smaller board may strand a token: drop any now off the edge.
  const cells = next.board.squares * next.board.metersPerSquare + 1;
  next.tokens = next.tokens.filter((token) => token.position.column < cells && token.position.row < cells);
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
  const token = { id: stableDocumentId('token', `${next.identity.id}|${actorId}`), actorId, side, position, label: String(label ?? '') };
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

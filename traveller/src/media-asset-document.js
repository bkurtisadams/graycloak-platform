import { stableDocumentId } from '../../packages/classic-traveller-rules/index.js';

export const MEDIA_ASSET_DOCUMENT_TYPE = 'graycloak-traveller-media-asset';
export const CURRENT_MEDIA_ASSET_SCHEMA_VERSION = 1;

export class MediaAssetDocumentValidationError extends Error {
  constructor(errors) {
    const list = Array.isArray(errors) ? errors : [String(errors)];
    super(`invalid Graycloak Traveller Media Asset Document: ${list.join('; ')}`);
    this.name = 'MediaAssetDocumentValidationError';
    this.errors = Object.freeze([...list]);
  }
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function nonblank(value) { return typeof value === 'string' && value.trim().length > 0; }

export function createMediaAssetDocument({ id, name = 'Portrait', purpose = 'portrait', mimeType, dataUrl, altText = '', crop = {} } = {}) {
  const document = {
    documentType: MEDIA_ASSET_DOCUMENT_TYPE,
    schemaVersion: CURRENT_MEDIA_ASSET_SCHEMA_VERSION,
    identity: { id: id ?? stableDocumentId('asset', `${name}|${Date.now()}|${Math.random()}`), name: String(name) },
    purpose,
    mimeType,
    dataUrl,
    altText: String(altText),
    crop: { x: Number(crop.x ?? 0.5), y: Number(crop.y ?? 0.5), scale: Number(crop.scale ?? 1) }
  };
  assertValidMediaAssetDocument(document);
  return document;
}

export function validateMediaAssetDocument(document) {
  const errors = [];
  const add = (condition, message) => { if (!condition) errors.push(message); };
  add(document && typeof document === 'object' && !Array.isArray(document), 'document must be an object');
  if (!document || typeof document !== 'object' || Array.isArray(document)) return errors;
  add(document.documentType === MEDIA_ASSET_DOCUMENT_TYPE, `documentType must be ${MEDIA_ASSET_DOCUMENT_TYPE}`);
  add(document.schemaVersion === CURRENT_MEDIA_ASSET_SCHEMA_VERSION, `schemaVersion must be ${CURRENT_MEDIA_ASSET_SCHEMA_VERSION}`);
  add(nonblank(document.identity?.id) && nonblank(document.identity?.name), 'identity must contain id and name');
  add(document.purpose === 'portrait', 'purpose must be portrait');
  add(['image/png', 'image/jpeg', 'image/webp'].includes(document.mimeType), 'mimeType must be PNG, JPEG, or WebP');
  add(typeof document.dataUrl === 'string' && document.dataUrl.startsWith(`data:${document.mimeType};base64,`) && document.dataUrl.length <= 550000, 'dataUrl must be a supported image under 400 KiB');
  add(typeof document.altText === 'string', 'altText must be a string');
  add(Number.isFinite(document.crop?.x) && document.crop.x >= 0 && document.crop.x <= 1, 'crop.x must be from 0 to 1');
  add(Number.isFinite(document.crop?.y) && document.crop.y >= 0 && document.crop.y <= 1, 'crop.y must be from 0 to 1');
  add(Number.isFinite(document.crop?.scale) && document.crop.scale >= 1 && document.crop.scale <= 8, 'crop.scale must be from 1 to 8');
  return errors;
}

export function assertValidMediaAssetDocument(document) {
  const errors = validateMediaAssetDocument(document);
  if (errors.length) throw new MediaAssetDocumentValidationError(errors);
  return document;
}
export function importMediaAssetDocument(input) {
  let parsed = input;
  if (typeof input === 'string') {
    try { parsed = JSON.parse(input); } catch (error) { throw new MediaAssetDocumentValidationError(`invalid JSON: ${error.message}`); }
  }
  const document = clone(parsed);
  assertValidMediaAssetDocument(document);
  return document;
}
export function exportMediaAssetDocument(document, { space = 2 } = {}) { return JSON.stringify(importMediaAssetDocument(document), null, space); }

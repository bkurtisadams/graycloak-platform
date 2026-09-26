import { stableDocumentId } from '../vendor/classic-traveller-rules/index.js?v=r0.81.0';

export const ACTIVITY_LOG_DOCUMENT_TYPE = 'graycloak-traveller-activity-log';
export const CURRENT_ACTIVITY_LOG_DOCUMENT_SCHEMA_VERSION = 2;
export const SUPPORTED_ACTIVITY_LOG_DOCUMENT_SCHEMA_VERSIONS = Object.freeze([1, 2]);
export const ACTIVITY_VISIBILITY = Object.freeze({
  PUBLIC: 'public',
  PLAYERS: 'players',
  REFEREE: 'referee'
});
const ACTIVITY_VISIBILITY_VALUES = new Set(Object.values(ACTIVITY_VISIBILITY));

export class ActivityLogDocumentValidationError extends Error {
  constructor(errors) {
    const list = Array.isArray(errors) ? errors : [String(errors)];
    super(`invalid Graycloak Traveller Activity Log Document: ${list.join('; ')}`);
    this.name = 'ActivityLogDocumentValidationError';
    this.errors = Object.freeze([...list]);
  }
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function nonblank(value) { return typeof value === 'string' && value.trim().length > 0; }
function plain(value) { return value && typeof value === 'object' && !Array.isArray(value); }
function parse(input) {
  if (typeof input !== 'string') return input;
  try { return JSON.parse(input); }
  catch (error) { throw new ActivityLogDocumentValidationError(`invalid JSON: ${error.message}`); }
}

function normalizeEntry(entry, sequence, campaignId) {
  const category = String(entry.category ?? 'SYSLOG').trim().toUpperCase();
  const message = String(entry.message ?? '').trim();
  const dateLabel = String(entry.dateLabel ?? 'SESSION').trim();
  const createdAt = String(entry.createdAt ?? new Date().toISOString());
  return {
    id: entry.id ?? stableDocumentId('activity', `${campaignId}|${sequence}|${createdAt}|${category}|${message}`),
    sequence,
    category,
    message,
    dateLabel,
    createdAt,
    sourceDocumentId: entry.sourceDocumentId ?? null,
    sourceActorId: entry.sourceActorId ?? null,
    visibility: entry.visibility ?? ACTIVITY_VISIBILITY.PUBLIC,
    audiencePlayerIds: [...new Set((entry.audiencePlayerIds ?? []).map(String).filter((id) => id.trim()))],
    // v0.257.0: the full working behind a short line — for a combat line,
    // the throw and every DM. Shown on hover or on tap; the line itself stays
    // short. Optional, and absent from entries written before it existed.
    ...(entry.detail ? { detail: String(entry.detail) } : {})
  };
}

export function createActivityLogDocument({ id, campaign, campaignId = campaign?.identity?.id, name, entries = [] } = {}) {
  if (!nonblank(campaignId)) throw new TypeError('campaignId is required');
  if (!Array.isArray(entries)) throw new TypeError('entries must be an array');
  const document = {
    documentType: ACTIVITY_LOG_DOCUMENT_TYPE,
    schemaVersion: CURRENT_ACTIVITY_LOG_DOCUMENT_SCHEMA_VERSION,
    identity: {
      id: id ?? stableDocumentId('activity-log', campaignId),
      name: String(name ?? `${campaign?.identity?.name || 'Campaign'} Activity Log`)
    },
    campaignId,
    entries: entries.map((entry, index) => normalizeEntry(entry, index + 1, campaignId))
  };
  assertValidActivityLogDocument(document);
  return document;
}

export function validateActivityLogDocument(document) {
  const errors = [];
  const add = (condition, message) => { if (!condition) errors.push(message); };
  add(plain(document), 'document must be an object');
  if (!plain(document)) return errors;
  add(document.documentType === ACTIVITY_LOG_DOCUMENT_TYPE, `documentType must be ${ACTIVITY_LOG_DOCUMENT_TYPE}`);
  add(document.schemaVersion === CURRENT_ACTIVITY_LOG_DOCUMENT_SCHEMA_VERSION, `schemaVersion must be ${CURRENT_ACTIVITY_LOG_DOCUMENT_SCHEMA_VERSION}`);
  add(nonblank(document.identity?.id) && nonblank(document.identity?.name), 'identity must contain id and name');
  add(nonblank(document.campaignId), 'campaignId must be nonblank');
  add(Array.isArray(document.entries), 'entries must be an array');
  const ids = new Set();
  if (Array.isArray(document.entries)) document.entries.forEach((entry, index) => {
    add(plain(entry), `entries[${index}] must be an object`);
    if (!plain(entry)) return;
    add(nonblank(entry.id) && !ids.has(entry.id), `entries[${index}].id must be unique and nonblank`);
    if (nonblank(entry.id)) ids.add(entry.id);
    add(entry.sequence === index + 1, `entries[${index}].sequence must be ${index + 1}`);
    add(nonblank(entry.category), `entries[${index}].category must be nonblank`);
    add(nonblank(entry.message), `entries[${index}].message must be nonblank`);
    add(nonblank(entry.dateLabel), `entries[${index}].dateLabel must be nonblank`);
    add(nonblank(entry.createdAt) && !Number.isNaN(Date.parse(entry.createdAt)), `entries[${index}].createdAt must be an ISO date string`);
    add(entry.sourceDocumentId === null || nonblank(entry.sourceDocumentId), `entries[${index}].sourceDocumentId is invalid`);
    add(entry.sourceActorId === null || nonblank(entry.sourceActorId), `entries[${index}].sourceActorId is invalid`);
    add(ACTIVITY_VISIBILITY_VALUES.has(entry.visibility), `entries[${index}].visibility is invalid`);
    add(Array.isArray(entry.audiencePlayerIds), `entries[${index}].audiencePlayerIds must be an array`);
    if (Array.isArray(entry.audiencePlayerIds)) {
      add(entry.audiencePlayerIds.every(nonblank), `entries[${index}].audiencePlayerIds contains an invalid player id`);
      add(new Set(entry.audiencePlayerIds).size === entry.audiencePlayerIds.length, `entries[${index}].audiencePlayerIds must be unique`);
    }
    if (entry.visibility === ACTIVITY_VISIBILITY.PLAYERS) add(entry.audiencePlayerIds.length > 0, `entries[${index}] player visibility requires an audience`);
    else add(entry.audiencePlayerIds.length === 0, `entries[${index}] audience is only valid for player visibility`);
  });
  return errors;
}

export function assertValidActivityLogDocument(document) {
  const errors = validateActivityLogDocument(document);
  if (errors.length) throw new ActivityLogDocumentValidationError(errors);
  return document;
}

export function importActivityLogDocument(input) {
  const document = clone(parse(input));
  if (!SUPPORTED_ACTIVITY_LOG_DOCUMENT_SCHEMA_VERSIONS.includes(document?.schemaVersion)) {
    throw new ActivityLogDocumentValidationError(`unsupported schemaVersion: ${document?.schemaVersion}`);
  }
  if (document.schemaVersion === 1) {
    document.schemaVersion = 2;
    document.entries = document.entries.map((entry, index) => normalizeEntry(entry, index + 1, document.campaignId));
  }
  assertValidActivityLogDocument(document);
  return document;
}

export function exportActivityLogDocument(document, { space = 2 } = {}) {
  return JSON.stringify(importActivityLogDocument(document), null, space);
}

export function appendActivityLogEntry(document, { category = 'SYSLOG', message, dateLabel = 'SESSION', createdAt = new Date().toISOString(), sourceDocumentId = null, sourceActorId = null, visibility = ACTIVITY_VISIBILITY.PUBLIC, audiencePlayerIds = [], detail = null } = {}) {
  const next = importActivityLogDocument(document);
  next.entries.push(normalizeEntry({ category, message, dateLabel, createdAt, sourceDocumentId, sourceActorId, visibility, audiencePlayerIds, detail }, next.entries.length + 1, next.campaignId));
  assertValidActivityLogDocument(next);
  return next;
}

export function activityEntryVisibleTo(entry, session) {
  if (!entry || !session?.player) return false;
  if (entry.visibility === ACTIVITY_VISIBILITY.PUBLIC) return true;
  if (session.player.role === 'solo' || session.player.role === 'referee') return true;
  if (entry.visibility === ACTIVITY_VISIBILITY.REFEREE) return false;
  return entry.visibility === ACTIVITY_VISIBILITY.PLAYERS && entry.audiencePlayerIds.includes(session.player.id);
}

export function visibleActivityLogEntries(document, session) {
  const current = importActivityLogDocument(document);
  return current.entries.filter((entry) => activityEntryVisibleTo(entry, session));
}

export function clearActivityLogDocument(document) {
  const next = importActivityLogDocument(document);
  next.entries = [];
  assertValidActivityLogDocument(next);
  return next;
}

// v0.167.0: the campaign's log had no cap at all (ACTIVITY_LOG_MAX_ENTRIES only
// ever bounded the pre-v0.75 browser log), and it was 443 KB of a 903 KB
// Firestore home. These two carry a stopgap: the home keeps the newest entries
// and the browser keeps the whole log, until the log moves out of the home.

/** The newest `maxEntries`, ids kept, sequence renumbered from 1. */
export function trimActivityLogDocument(document, maxEntries) {
  if (!Number.isInteger(maxEntries) || maxEntries < 1) throw new TypeError('maxEntries must be a positive integer');
  const next = importActivityLogDocument(document);
  if (next.entries.length <= maxEntries) return next;
  next.entries = next.entries.slice(-maxEntries).map((entry, index) => ({ ...entry, sequence: index + 1 }));
  assertValidActivityLogDocument(next);
  return next;
}

/**
 * A log loaded from the home, with the older history this browser still has
 * put back in front of it. The home is the authority from its first entry on;
 * local entries before that entry are kept. If the two share no entry, the
 * home's log is taken as it is.
 */
export function mergeActivityLogHistory(local, remote) {
  const incoming = importActivityLogDocument(remote);
  if (!local || local.identity?.id !== incoming.identity.id || !incoming.entries.length) return incoming;
  const held = importActivityLogDocument(local);
  const firstRemote = held.entries.findIndex((entry) => entry.id === incoming.entries[0].id);
  if (firstRemote <= 0) return incoming;
  const merged = { ...incoming, entries: [...held.entries.slice(0, firstRemote), ...incoming.entries].map((entry, index) => ({ ...entry, sequence: index + 1 })) };
  assertValidActivityLogDocument(merged);
  return merged;
}

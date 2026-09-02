import { stableDocumentId } from '../../packages/classic-traveller-rules/index.js';

export const ADVENTURE_THREAD_DOCUMENT_TYPE = 'graycloak-traveller-thread';
export const CURRENT_ADVENTURE_THREAD_DOCUMENT_SCHEMA_VERSION = 1;
export const ADVENTURE_THREAD_STATUSES = Object.freeze(['active', 'completed', 'failed', 'archived']);

const TOP_LEVEL_KEYS = Object.freeze([
  'documentType', 'schemaVersion', 'identity', 'provenance', 'timing', 'origin',
  'objective', 'clues', 'contactIds', 'situationIds', 'contractIds', 'history',
  'status', 'notes'
]);

export class AdventureThreadDocumentValidationError extends Error {
  constructor(errors) {
    const list = Array.isArray(errors) ? errors : [String(errors)];
    super(`invalid Graycloak Traveller adventure thread document: ${list.join('; ')}`);
    this.name = 'AdventureThreadDocumentValidationError';
    this.errors = Object.freeze([...list]);
  }
}

function cloneJson(value) { return JSON.parse(JSON.stringify(value)); }
function isPlainObject(value) { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function nonblank(value) { return typeof value === 'string' && value.trim().length > 0; }
function add(errors, condition, message) { if (!condition) errors.push(message); }
function exactKeys(value, keys, path, errors) {
  if (!isPlainObject(value)) return;
  const allowed = new Set(keys);
  for (const key of Object.keys(value)) add(errors, allowed.has(key), `${path} contains unknown field: ${key}`);
  for (const key of keys) add(errors, Object.hasOwn(value, key), `${path} missing field: ${key}`);
}
function validDate(value) {
  return isPlainObject(value)
    && Number.isInteger(value.year) && value.year >= 0
    && Number.isInteger(value.dayOfYear) && value.dayOfYear >= 1 && value.dayOfYear <= 366;
}
function dateOnly(value) { return { year: value.year, dayOfYear: value.dayOfYear }; }
function parseJson(input) {
  if (typeof input !== 'string') return input;
  try { return JSON.parse(input); }
  catch (error) { throw new AdventureThreadDocumentValidationError(`invalid JSON: ${error.message}`); }
}
function uniqueStrings(values) { return [...new Set(values.map(String).filter(Boolean))]; }

export function createAdventureThreadDocument({
  id,
  threadKey,
  title,
  createdDate,
  origin,
  objective = '',
  targetSystemId = null,
  targetSystemName = '',
  rulesBasis = 'sea-of-suns-original',
  setting = 'Sea of Suns',
  clues = [],
  contactIds = [],
  situationIds = [],
  contractIds = [],
  history = [],
  status = 'active',
  notes = ''
} = {}) {
  if (!nonblank(threadKey)) throw new TypeError('threadKey must be nonblank');
  if (!nonblank(title)) throw new TypeError('title must be nonblank');
  if (!validDate(createdDate)) throw new TypeError('createdDate must be a valid campaign date');
  if (!origin || !nonblank(origin.systemId) || !nonblank(origin.systemName)) throw new TypeError('origin requires systemId and systemName');
  if (!ADVENTURE_THREAD_STATUSES.includes(status)) throw new TypeError(`invalid thread status: ${status}`);

  const document = {
    documentType: ADVENTURE_THREAD_DOCUMENT_TYPE,
    schemaVersion: CURRENT_ADVENTURE_THREAD_DOCUMENT_SCHEMA_VERSION,
    identity: { id: id ?? stableDocumentId('thread', threadKey), title: String(title) },
    provenance: { threadKey: String(threadKey), rulesBasis: String(rulesBasis), setting: String(setting) },
    timing: {
      createdDate: dateOnly(createdDate),
      updatedDate: dateOnly(createdDate),
      closedDate: status === 'active' ? null : dateOnly(createdDate)
    },
    origin: { systemId: origin.systemId, systemName: origin.systemName },
    objective: {
      text: String(objective),
      targetSystemId: targetSystemId === null || targetSystemId === undefined ? null : String(targetSystemId),
      targetSystemName: String(targetSystemName ?? '')
    },
    clues: cloneJson(clues),
    contactIds: uniqueStrings(contactIds),
    situationIds: uniqueStrings(situationIds),
    contractIds: uniqueStrings(contractIds),
    history: cloneJson(history),
    status,
    notes: String(notes)
  };
  assertValidAdventureThreadDocument(document);
  return document;
}

export function validateAdventureThreadDocument(document) {
  const errors = [];
  add(errors, isPlainObject(document), 'adventure thread document must be an object');
  if (!isPlainObject(document)) return { valid: false, errors };
  exactKeys(document, TOP_LEVEL_KEYS, '$', errors);
  add(errors, document.documentType === ADVENTURE_THREAD_DOCUMENT_TYPE, `documentType must be ${ADVENTURE_THREAD_DOCUMENT_TYPE}`);
  add(errors, document.schemaVersion === CURRENT_ADVENTURE_THREAD_DOCUMENT_SCHEMA_VERSION, `schemaVersion must be ${CURRENT_ADVENTURE_THREAD_DOCUMENT_SCHEMA_VERSION}`);

  add(errors, isPlainObject(document.identity), 'identity must be an object');
  if (isPlainObject(document.identity)) {
    exactKeys(document.identity, ['id', 'title'], 'identity', errors);
    add(errors, nonblank(document.identity.id), 'identity.id must be nonblank');
    add(errors, nonblank(document.identity.title), 'identity.title must be nonblank');
  }

  add(errors, isPlainObject(document.provenance), 'provenance must be an object');
  if (isPlainObject(document.provenance)) {
    exactKeys(document.provenance, ['threadKey', 'rulesBasis', 'setting'], 'provenance', errors);
    add(errors, nonblank(document.provenance.threadKey), 'provenance.threadKey must be nonblank');
    add(errors, nonblank(document.provenance.rulesBasis), 'provenance.rulesBasis must be nonblank');
    add(errors, nonblank(document.provenance.setting), 'provenance.setting must be nonblank');
  }

  add(errors, isPlainObject(document.timing), 'timing must be an object');
  if (isPlainObject(document.timing)) {
    exactKeys(document.timing, ['createdDate', 'updatedDate', 'closedDate'], 'timing', errors);
    add(errors, validDate(document.timing.createdDate), 'timing.createdDate must be valid');
    add(errors, validDate(document.timing.updatedDate), 'timing.updatedDate must be valid');
    add(errors, document.timing.closedDate === null || validDate(document.timing.closedDate), 'timing.closedDate must be null or valid');
  }

  add(errors, isPlainObject(document.origin), 'origin must be an object');
  if (isPlainObject(document.origin)) {
    exactKeys(document.origin, ['systemId', 'systemName'], 'origin', errors);
    add(errors, nonblank(document.origin.systemId), 'origin.systemId must be nonblank');
    add(errors, nonblank(document.origin.systemName), 'origin.systemName must be nonblank');
  }

  add(errors, isPlainObject(document.objective), 'objective must be an object');
  if (isPlainObject(document.objective)) {
    exactKeys(document.objective, ['text', 'targetSystemId', 'targetSystemName'], 'objective', errors);
    add(errors, typeof document.objective.text === 'string', 'objective.text must be a string');
    add(errors, document.objective.targetSystemId === null || nonblank(document.objective.targetSystemId), 'objective.targetSystemId must be null or nonblank');
    add(errors, typeof document.objective.targetSystemName === 'string', 'objective.targetSystemName must be a string');
  }

  add(errors, Array.isArray(document.clues), 'clues must be an array');
  const clueIds = new Set();
  if (Array.isArray(document.clues)) {
    for (const clue of document.clues) {
      add(errors, isPlainObject(clue), 'clues[] must be an object');
      if (!isPlainObject(clue)) continue;
      exactKeys(clue, ['id', 'label', 'text', 'sourceSituationId', 'date'], 'clues[]', errors);
      add(errors, nonblank(clue.id), 'clue.id must be nonblank');
      add(errors, nonblank(clue.label), 'clue.label must be nonblank');
      add(errors, nonblank(clue.text), 'clue.text must be nonblank');
      add(errors, clue.sourceSituationId === null || nonblank(clue.sourceSituationId), 'clue.sourceSituationId must be null or nonblank');
      add(errors, validDate(clue.date), 'clue.date must be valid');
      if (nonblank(clue.id)) {
        add(errors, !clueIds.has(clue.id), `duplicate clue id: ${clue.id}`);
        clueIds.add(clue.id);
      }
    }
  }

  for (const key of ['contactIds', 'situationIds', 'contractIds']) {
    add(errors, Array.isArray(document[key]), `${key} must be an array`);
    if (Array.isArray(document[key])) {
      add(errors, document[key].every(nonblank), `${key} must contain nonblank strings`);
      add(errors, new Set(document[key]).size === document[key].length, `${key} must be unique`);
    }
  }

  add(errors, Array.isArray(document.history), 'history must be an array');
  if (Array.isArray(document.history)) {
    for (const entry of document.history) {
      add(errors, isPlainObject(entry), 'history[] must be an object');
      if (!isPlainObject(entry)) continue;
      exactKeys(entry, ['date', 'kind', 'text'], 'history[]', errors);
      add(errors, validDate(entry.date), 'history.date must be valid');
      add(errors, nonblank(entry.kind), 'history.kind must be nonblank');
      add(errors, nonblank(entry.text), 'history.text must be nonblank');
    }
  }

  add(errors, ADVENTURE_THREAD_STATUSES.includes(document.status), 'status is invalid');
  if (document.status === 'active') add(errors, document.timing?.closedDate === null, 'active thread timing.closedDate must be null');
  else add(errors, validDate(document.timing?.closedDate), 'closed thread requires timing.closedDate');
  add(errors, typeof document.notes === 'string', 'notes must be a string');
  return { valid: errors.length === 0, errors };
}

export function assertValidAdventureThreadDocument(document) {
  const result = validateAdventureThreadDocument(document);
  if (!result.valid) throw new AdventureThreadDocumentValidationError(result.errors);
  return document;
}

export function importAdventureThreadDocument(input) {
  const parsed = parseJson(input);
  assertValidAdventureThreadDocument(parsed);
  return cloneJson(parsed);
}

export function exportAdventureThreadDocument(document, { space = 2 } = {}) {
  assertValidAdventureThreadDocument(document);
  return JSON.stringify(document, null, space);
}

function updated(document, date) {
  if (!validDate(date)) throw new TypeError('date must be a valid campaign date');
  const next = cloneJson(document);
  next.timing.updatedDate = dateOnly(date);
  return next;
}

export function addAdventureThreadClue(document, { id, label, text, sourceSituationId = null, date } = {}) {
  assertValidAdventureThreadDocument(document);
  if (!nonblank(id) || !nonblank(label) || !nonblank(text)) throw new TypeError('clue requires id, label, and text');
  const next = updated(document, date);
  if (!next.clues.some((entry) => entry.id === id)) {
    next.clues.push({ id: String(id), label: String(label), text: String(text), sourceSituationId: sourceSituationId ?? null, date: dateOnly(date) });
  }
  assertValidAdventureThreadDocument(next);
  return next;
}

export function updateAdventureThreadObjective(document, { text, targetSystemId = null, targetSystemName = '', date } = {}) {
  assertValidAdventureThreadDocument(document);
  const next = updated(document, date);
  next.objective = { text: String(text ?? ''), targetSystemId: targetSystemId ?? null, targetSystemName: String(targetSystemName ?? '') };
  assertValidAdventureThreadDocument(next);
  return next;
}

export function linkAdventureThreadDocument(document, { situationId, contactId, contractId, date } = {}) {
  assertValidAdventureThreadDocument(document);
  const next = updated(document, date);
  if (situationId && !next.situationIds.includes(situationId)) next.situationIds.push(String(situationId));
  if (contactId && !next.contactIds.includes(contactId)) next.contactIds.push(String(contactId));
  if (contractId && !next.contractIds.includes(contractId)) next.contractIds.push(String(contractId));
  assertValidAdventureThreadDocument(next);
  return next;
}

export function appendAdventureThreadHistory(document, { date, kind, text } = {}) {
  assertValidAdventureThreadDocument(document);
  if (!nonblank(kind) || !nonblank(text)) throw new TypeError('history entry requires kind and text');
  const next = updated(document, date);
  const duplicate = next.history.some((entry) => entry.kind === kind && entry.text === text && entry.date.year === date.year && entry.date.dayOfYear === date.dayOfYear);
  if (!duplicate) next.history.push({ date: dateOnly(date), kind: String(kind), text: String(text) });
  assertValidAdventureThreadDocument(next);
  return next;
}

export function closeAdventureThreadDocument(document, { date, status = 'completed', notes = '' } = {}) {
  assertValidAdventureThreadDocument(document);
  if (document.status !== 'active') throw new AdventureThreadDocumentValidationError('only active threads can be closed');
  if (!ADVENTURE_THREAD_STATUSES.includes(status) || status === 'active') throw new TypeError('closed status must be completed, failed, or archived');
  const next = updated(document, date);
  next.status = status;
  next.timing.closedDate = dateOnly(date);
  next.notes = String(notes ?? next.notes);
  assertValidAdventureThreadDocument(next);
  return next;
}

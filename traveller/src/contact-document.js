import { stableDocumentId } from '../../packages/classic-traveller-rules/index.js';

export const CONTACT_DOCUMENT_TYPE = 'graycloak-traveller-contact';
export const CURRENT_CONTACT_DOCUMENT_SCHEMA_VERSION = 1;
export const CONTACT_STANDINGS = Object.freeze(['friendly', 'neutral', 'hostile']);

const TOP_LEVEL_KEYS = Object.freeze([
  'documentType', 'schemaVersion', 'identity', 'profile', 'home', 'relationship',
  'provenance', 'timing', 'notes'
]);

export class ContactDocumentValidationError extends Error {
  constructor(errors) {
    const list = Array.isArray(errors) ? errors : [String(errors)];
    super(`invalid Graycloak Traveller contact document: ${list.join('; ')}`);
    this.name = 'ContactDocumentValidationError';
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
  catch (error) { throw new ContactDocumentValidationError(`invalid JSON: ${error.message}`); }
}

export function createContactDocument({
  id,
  contactKey,
  name,
  role = 'Contact',
  type = 'private',
  homeSystem,
  firstMetDate,
  standing = 'neutral',
  relationshipNotes = '',
  sourceSituationId = null,
  rulesBasis = 'sea-of-suns-original',
  setting = 'Sea of Suns',
  notes = ''
} = {}) {
  if (!nonblank(contactKey)) throw new TypeError('contactKey must be nonblank');
  if (!nonblank(name)) throw new TypeError('name must be nonblank');
  if (!nonblank(role)) throw new TypeError('role must be nonblank');
  if (!homeSystem || !nonblank(homeSystem.systemId) || !nonblank(homeSystem.systemName)) throw new TypeError('homeSystem requires systemId and systemName');
  if (!validDate(firstMetDate)) throw new TypeError('firstMetDate must be a valid campaign date');
  if (!CONTACT_STANDINGS.includes(standing)) throw new TypeError(`invalid standing: ${standing}`);

  const document = {
    documentType: CONTACT_DOCUMENT_TYPE,
    schemaVersion: CURRENT_CONTACT_DOCUMENT_SCHEMA_VERSION,
    identity: {
      id: id ?? stableDocumentId('contact', contactKey),
      name: String(name)
    },
    profile: {
      role: String(role),
      type: String(type)
    },
    home: {
      systemId: homeSystem.systemId,
      systemName: homeSystem.systemName
    },
    relationship: {
      standing,
      notes: String(relationshipNotes)
    },
    provenance: {
      contactKey: String(contactKey),
      sourceSituationId: sourceSituationId === null || sourceSituationId === undefined ? null : String(sourceSituationId),
      rulesBasis: String(rulesBasis),
      setting: String(setting)
    },
    timing: {
      firstMetDate: dateOnly(firstMetDate),
      lastSeenDate: dateOnly(firstMetDate)
    },
    notes: String(notes)
  };
  assertValidContactDocument(document);
  return document;
}

export function validateContactDocument(document) {
  const errors = [];
  add(errors, isPlainObject(document), 'contact document must be an object');
  if (!isPlainObject(document)) return { valid: false, errors };
  exactKeys(document, TOP_LEVEL_KEYS, '$', errors);
  add(errors, document.documentType === CONTACT_DOCUMENT_TYPE, `documentType must be ${CONTACT_DOCUMENT_TYPE}`);
  add(errors, document.schemaVersion === CURRENT_CONTACT_DOCUMENT_SCHEMA_VERSION, `schemaVersion must be ${CURRENT_CONTACT_DOCUMENT_SCHEMA_VERSION}`);

  add(errors, isPlainObject(document.identity), 'identity must be an object');
  if (isPlainObject(document.identity)) {
    exactKeys(document.identity, ['id', 'name'], 'identity', errors);
    add(errors, nonblank(document.identity.id), 'identity.id must be nonblank');
    add(errors, nonblank(document.identity.name), 'identity.name must be nonblank');
  }

  add(errors, isPlainObject(document.profile), 'profile must be an object');
  if (isPlainObject(document.profile)) {
    exactKeys(document.profile, ['role', 'type'], 'profile', errors);
    add(errors, nonblank(document.profile.role), 'profile.role must be nonblank');
    add(errors, nonblank(document.profile.type), 'profile.type must be nonblank');
  }

  add(errors, isPlainObject(document.home), 'home must be an object');
  if (isPlainObject(document.home)) {
    exactKeys(document.home, ['systemId', 'systemName'], 'home', errors);
    add(errors, nonblank(document.home.systemId), 'home.systemId must be nonblank');
    add(errors, nonblank(document.home.systemName), 'home.systemName must be nonblank');
  }

  add(errors, isPlainObject(document.relationship), 'relationship must be an object');
  if (isPlainObject(document.relationship)) {
    exactKeys(document.relationship, ['standing', 'notes'], 'relationship', errors);
    add(errors, CONTACT_STANDINGS.includes(document.relationship.standing), 'relationship.standing is invalid');
    add(errors, typeof document.relationship.notes === 'string', 'relationship.notes must be a string');
  }

  add(errors, isPlainObject(document.provenance), 'provenance must be an object');
  if (isPlainObject(document.provenance)) {
    exactKeys(document.provenance, ['contactKey', 'sourceSituationId', 'rulesBasis', 'setting'], 'provenance', errors);
    add(errors, nonblank(document.provenance.contactKey), 'provenance.contactKey must be nonblank');
    add(errors, document.provenance.sourceSituationId === null || nonblank(document.provenance.sourceSituationId), 'provenance.sourceSituationId must be null or nonblank');
    add(errors, nonblank(document.provenance.rulesBasis), 'provenance.rulesBasis must be nonblank');
    add(errors, nonblank(document.provenance.setting), 'provenance.setting must be nonblank');
  }

  add(errors, isPlainObject(document.timing), 'timing must be an object');
  if (isPlainObject(document.timing)) {
    exactKeys(document.timing, ['firstMetDate', 'lastSeenDate'], 'timing', errors);
    add(errors, validDate(document.timing.firstMetDate), 'timing.firstMetDate must be valid');
    add(errors, validDate(document.timing.lastSeenDate), 'timing.lastSeenDate must be valid');
  }

  add(errors, typeof document.notes === 'string', 'notes must be a string');
  return { valid: errors.length === 0, errors };
}

export function assertValidContactDocument(document) {
  const result = validateContactDocument(document);
  if (!result.valid) throw new ContactDocumentValidationError(result.errors);
  return document;
}

export function importContactDocument(input) {
  const parsed = parseJson(input);
  assertValidContactDocument(parsed);
  return cloneJson(parsed);
}

export function exportContactDocument(document, { space = 2 } = {}) {
  assertValidContactDocument(document);
  return JSON.stringify(document, null, space);
}

export function touchContactDocument(document, {
  date,
  standing = document.relationship.standing,
  relationshipNotes = document.relationship.notes
} = {}) {
  assertValidContactDocument(document);
  if (!validDate(date)) throw new TypeError('date must be a valid campaign date');
  if (!CONTACT_STANDINGS.includes(standing)) throw new TypeError(`invalid standing: ${standing}`);
  const next = cloneJson(document);
  next.timing.lastSeenDate = dateOnly(date);
  next.relationship.standing = standing;
  next.relationship.notes = String(relationshipNotes);
  assertValidContactDocument(next);
  return next;
}

import { stableDocumentId } from '../../packages/classic-traveller-rules/index.js';

export const SITUATION_DOCUMENT_TYPE = 'graycloak-traveller-situation';
export const CURRENT_SITUATION_DOCUMENT_SCHEMA_VERSION = 1;
export const SITUATION_KINDS = Object.freeze(['arrival-event', 'patron-contact', 'rumor']);
export const SITUATION_STATUSES = Object.freeze(['active', 'resolved', 'declined']);
export const SITUATION_CHOICE_ACTIONS = Object.freeze(['skill-check', 'resolve', 'decline']);

const TOP_LEVEL_KEYS = Object.freeze([
  'documentType', 'schemaVersion', 'identity', 'kind', 'provenance', 'location',
  'timing', 'actor', 'content', 'choices', 'status', 'resolution', 'notes'
]);

export class SituationDocumentValidationError extends Error {
  constructor(errors) {
    const list = Array.isArray(errors) ? errors : [String(errors)];
    super(`invalid Graycloak Traveller situation document: ${list.join('; ')}`);
    this.name = 'SituationDocumentValidationError';
    this.errors = Object.freeze([...list]);
  }
}

function cloneJson(value) { return JSON.parse(JSON.stringify(value)); }
function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
function add(errors, condition, message) { if (!condition) errors.push(message); }
function nonblank(value) { return typeof value === 'string' && value.trim().length > 0; }
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
  catch (error) { throw new SituationDocumentValidationError(`invalid JSON: ${error.message}`); }
}

function normalizeChoice(choice) {
  return {
    id: String(choice.id ?? ''),
    label: String(choice.label ?? ''),
    action: String(choice.action ?? 'resolve'),
    skillName: choice.skillName === null || choice.skillName === undefined ? null : String(choice.skillName),
    target: choice.target === null || choice.target === undefined ? null : Number(choice.target),
    situationalDM: Number.isInteger(choice.situationalDM) ? choice.situationalDM : 0,
    successText: String(choice.successText ?? ''),
    failureText: String(choice.failureText ?? ''),
    resolutionText: String(choice.resolutionText ?? '')
  };
}

export function createSituationDocument({
  id,
  kind,
  eventKey,
  rulesBasis = 'sea-of-suns-original',
  setting = 'Sea of Suns',
  title,
  location,
  createdDate,
  actor = null,
  summary = '',
  detail = '',
  choices = [],
  status = 'active',
  resolution = null,
  notes = ''
} = {}) {
  if (!SITUATION_KINDS.includes(kind)) throw new TypeError(`invalid situation kind: ${kind}`);
  if (!nonblank(eventKey)) throw new TypeError('eventKey must be nonblank');
  if (!nonblank(title)) throw new TypeError('title must be nonblank');
  if (!location || !nonblank(location.systemId) || !nonblank(location.systemName)) throw new TypeError('location requires systemId and systemName');
  if (!validDate(createdDate)) throw new TypeError('createdDate must be a valid campaign date');
  if (!Array.isArray(choices)) throw new TypeError('choices must be an array');
  if (!SITUATION_STATUSES.includes(status)) throw new TypeError(`invalid situation status: ${status}`);

  const resolved = resolution ?? {
    date: status === 'active' ? null : dateOnly(createdDate),
    choiceId: null,
    success: null,
    roll: null,
    notes: ''
  };

  const document = {
    documentType: SITUATION_DOCUMENT_TYPE,
    schemaVersion: CURRENT_SITUATION_DOCUMENT_SCHEMA_VERSION,
    identity: {
      id: id ?? stableDocumentId('situation', eventKey),
      title
    },
    kind,
    provenance: {
      eventKey,
      rulesBasis: String(rulesBasis),
      setting: String(setting)
    },
    location: {
      systemId: location.systemId,
      systemName: location.systemName
    },
    timing: {
      createdDate: dateOnly(createdDate),
      resolvedDate: resolved.date === null ? null : dateOnly(resolved.date)
    },
    actor: actor === null ? null : {
      name: String(actor.name ?? ''),
      type: String(actor.type ?? ''),
      reaction: actor.reaction === null || actor.reaction === undefined ? null : String(actor.reaction)
    },
    content: {
      summary: String(summary),
      detail: String(detail)
    },
    choices: choices.map(normalizeChoice),
    status,
    resolution: {
      choiceId: resolved.choiceId ?? null,
      success: resolved.success ?? null,
      roll: resolved.roll ?? null,
      notes: String(resolved.notes ?? '')
    },
    notes: String(notes)
  };
  assertValidSituationDocument(document);
  return document;
}

export function validateSituationDocument(document) {
  const errors = [];
  add(errors, isPlainObject(document), 'situation document must be an object');
  if (!isPlainObject(document)) return { valid: false, errors };
  exactKeys(document, TOP_LEVEL_KEYS, '$', errors);
  add(errors, document.documentType === SITUATION_DOCUMENT_TYPE, `documentType must be ${SITUATION_DOCUMENT_TYPE}`);
  add(errors, document.schemaVersion === CURRENT_SITUATION_DOCUMENT_SCHEMA_VERSION, `schemaVersion must be ${CURRENT_SITUATION_DOCUMENT_SCHEMA_VERSION}`);

  add(errors, isPlainObject(document.identity), 'identity must be an object');
  if (isPlainObject(document.identity)) {
    exactKeys(document.identity, ['id', 'title'], 'identity', errors);
    add(errors, nonblank(document.identity.id), 'identity.id must be nonblank');
    add(errors, nonblank(document.identity.title), 'identity.title must be nonblank');
  }
  add(errors, SITUATION_KINDS.includes(document.kind), 'kind is invalid');

  add(errors, isPlainObject(document.provenance), 'provenance must be an object');
  if (isPlainObject(document.provenance)) {
    exactKeys(document.provenance, ['eventKey', 'rulesBasis', 'setting'], 'provenance', errors);
    add(errors, nonblank(document.provenance.eventKey), 'provenance.eventKey must be nonblank');
    add(errors, nonblank(document.provenance.rulesBasis), 'provenance.rulesBasis must be nonblank');
    add(errors, nonblank(document.provenance.setting), 'provenance.setting must be nonblank');
  }

  add(errors, isPlainObject(document.location), 'location must be an object');
  if (isPlainObject(document.location)) {
    exactKeys(document.location, ['systemId', 'systemName'], 'location', errors);
    add(errors, nonblank(document.location.systemId), 'location.systemId must be nonblank');
    add(errors, nonblank(document.location.systemName), 'location.systemName must be nonblank');
  }

  add(errors, isPlainObject(document.timing), 'timing must be an object');
  if (isPlainObject(document.timing)) {
    exactKeys(document.timing, ['createdDate', 'resolvedDate'], 'timing', errors);
    add(errors, validDate(document.timing.createdDate), 'timing.createdDate must be valid');
    add(errors, document.timing.resolvedDate === null || validDate(document.timing.resolvedDate), 'timing.resolvedDate must be null or valid');
  }

  add(errors, document.actor === null || isPlainObject(document.actor), 'actor must be null or an object');
  if (isPlainObject(document.actor)) {
    exactKeys(document.actor, ['name', 'type', 'reaction'], 'actor', errors);
    add(errors, typeof document.actor.name === 'string', 'actor.name must be a string');
    add(errors, typeof document.actor.type === 'string', 'actor.type must be a string');
    add(errors, document.actor.reaction === null || typeof document.actor.reaction === 'string', 'actor.reaction must be null or a string');
  }

  add(errors, isPlainObject(document.content), 'content must be an object');
  if (isPlainObject(document.content)) {
    exactKeys(document.content, ['summary', 'detail'], 'content', errors);
    add(errors, typeof document.content.summary === 'string', 'content.summary must be a string');
    add(errors, typeof document.content.detail === 'string', 'content.detail must be a string');
  }

  add(errors, Array.isArray(document.choices), 'choices must be an array');
  const choiceIds = new Set();
  if (Array.isArray(document.choices)) {
    for (const choice of document.choices) {
      add(errors, isPlainObject(choice), 'choices[] must be an object');
      if (!isPlainObject(choice)) continue;
      exactKeys(choice, ['id', 'label', 'action', 'skillName', 'target', 'situationalDM', 'successText', 'failureText', 'resolutionText'], 'choices[]', errors);
      add(errors, nonblank(choice.id), 'choice id must be nonblank');
      add(errors, nonblank(choice.label), 'choice label must be nonblank');
      add(errors, SITUATION_CHOICE_ACTIONS.includes(choice.action), 'choice action is invalid');
      add(errors, choice.skillName === null || nonblank(choice.skillName), 'choice skillName must be null or nonblank');
      add(errors, choice.target === null || (Number.isInteger(choice.target) && choice.target >= 2), 'choice target must be null or an integer of 2 or greater');
      add(errors, Number.isInteger(choice.situationalDM), 'choice situationalDM must be an integer');
      add(errors, typeof choice.successText === 'string', 'choice successText must be a string');
      add(errors, typeof choice.failureText === 'string', 'choice failureText must be a string');
      add(errors, typeof choice.resolutionText === 'string', 'choice resolutionText must be a string');
      if (choice.action === 'skill-check') {
        add(errors, nonblank(choice.skillName), 'skill-check choice requires skillName');
        add(errors, Number.isInteger(choice.target) && choice.target >= 2, 'skill-check choice requires target');
      }
      if (nonblank(choice.id)) {
        add(errors, !choiceIds.has(choice.id), `duplicate choice id: ${choice.id}`);
        choiceIds.add(choice.id);
      }
    }
  }

  add(errors, SITUATION_STATUSES.includes(document.status), 'status is invalid');
  add(errors, isPlainObject(document.resolution), 'resolution must be an object');
  if (isPlainObject(document.resolution)) {
    exactKeys(document.resolution, ['choiceId', 'success', 'roll', 'notes'], 'resolution', errors);
    add(errors, document.resolution.choiceId === null || nonblank(document.resolution.choiceId), 'resolution.choiceId must be null or nonblank');
    add(errors, document.resolution.success === null || typeof document.resolution.success === 'boolean', 'resolution.success must be null or boolean');
    add(errors, document.resolution.roll === null || isPlainObject(document.resolution.roll), 'resolution.roll must be null or object');
    add(errors, typeof document.resolution.notes === 'string', 'resolution.notes must be a string');
  }
  if (document.status === 'active') {
    add(errors, document.timing?.resolvedDate === null, 'active situation resolvedDate must be null');
  } else {
    add(errors, validDate(document.timing?.resolvedDate), 'resolved situation requires resolvedDate');
  }
  add(errors, typeof document.notes === 'string', 'notes must be a string');
  return { valid: errors.length === 0, errors };
}

export function assertValidSituationDocument(document) {
  const result = validateSituationDocument(document);
  if (!result.valid) throw new SituationDocumentValidationError(result.errors);
  return document;
}

export function importSituationDocument(input) {
  const parsed = parseJson(input);
  assertValidSituationDocument(parsed);
  return cloneJson(parsed);
}

export function exportSituationDocument(document, { space = 2 } = {}) {
  assertValidSituationDocument(document);
  return JSON.stringify(document, null, space);
}

export function resolveSituationDocument(document, {
  date,
  choiceId = null,
  success = null,
  roll = null,
  notes = '',
  declined = false
} = {}) {
  assertValidSituationDocument(document);
  if (document.status !== 'active') throw new SituationDocumentValidationError('only active situations can be resolved');
  if (!validDate(date)) throw new TypeError('resolution date must be valid');
  if (choiceId !== null && !document.choices.some((choice) => choice.id === choiceId)) throw new SituationDocumentValidationError(`unknown choice: ${choiceId}`);
  if (success !== null && typeof success !== 'boolean') throw new TypeError('success must be null or boolean');
  if (roll !== null && !isPlainObject(roll)) throw new TypeError('roll must be null or an object');
  const next = cloneJson(document);
  next.status = declined ? 'declined' : 'resolved';
  next.timing.resolvedDate = dateOnly(date);
  next.resolution = {
    choiceId,
    success,
    roll: roll === null ? null : cloneJson(roll),
    notes: String(notes)
  };
  assertValidSituationDocument(next);
  return next;
}

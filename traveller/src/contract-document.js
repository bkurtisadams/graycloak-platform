import { stableDocumentId } from '../../packages/classic-traveller-rules/index.js';

export const CONTRACT_DOCUMENT_TYPE = 'graycloak-traveller-contract';
export const CURRENT_CONTRACT_DOCUMENT_SCHEMA_VERSION = 1;
export const CONTRACT_STATUSES = Object.freeze(['accepted', 'completed', 'failed']);
export const CONTRACT_KINDS = Object.freeze(['charter', 'private-message', 'priority-courier', 'delivery', 'survey']);

const TOP_LEVEL_KEYS = Object.freeze([
  'documentType', 'schemaVersion', 'identity', 'kind', 'provenance', 'issuer',
  'origin', 'destination', 'requirements', 'economics', 'timing', 'assigned',
  'status', 'resolution', 'notes'
]);

export class ContractDocumentValidationError extends Error {
  constructor(errors) {
    const list = Array.isArray(errors) ? errors : [String(errors)];
    super(`invalid Graycloak Traveller contract document: ${list.join('; ')}`);
    this.name = 'ContractDocumentValidationError';
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
function dateOrdinal(value, daysPerYear = 365) { return value.year * daysPerYear + (value.dayOfYear - 1); }

export function addContractDays(date, days, { daysPerYear = 365 } = {}) {
  if (!validDate(date)) throw new TypeError('date must contain year and dayOfYear');
  if (!Number.isInteger(days) || days < 0) throw new TypeError('days must be a non-negative integer');
  let index = date.dayOfYear - 1 + days;
  let year = date.year;
  while (index >= daysPerYear) {
    index -= daysPerYear;
    year += 1;
  }
  return Object.freeze({ year, dayOfYear: index + 1 });
}

export function isContractOverdue(contract, campaignTime) {
  assertValidContractDocument(contract);
  if (!validDate(campaignTime)) throw new TypeError('campaignTime must contain year and dayOfYear');
  return contract.status === 'accepted'
    && dateOrdinal(dateOnly(campaignTime)) > dateOrdinal(contract.timing.deadlineDate);
}

export function createContractDocument(offer, {
  acceptedByCharacterId,
  acceptedShipId,
  acceptedDate,
  id
} = {}) {
  if (!offer || typeof offer !== 'object' || Array.isArray(offer)) throw new TypeError('offer must be an object');
  if (!CONTRACT_KINDS.includes(offer.kind)) throw new TypeError(`unsupported contract kind: ${offer.kind}`);
  if (!nonblank(offer.offerId) || !nonblank(offer.title)) throw new TypeError('offer requires offerId and title');
  if (!nonblank(offer.originSystemId) || !nonblank(offer.destinationSystemId)) throw new TypeError('offer requires origin and destination systems');
  if (!nonblank(acceptedByCharacterId) || !nonblank(acceptedShipId)) throw new TypeError('contract requires assigned character and ship IDs');
  if (!validDate(acceptedDate)) throw new TypeError('acceptedDate must contain year and dayOfYear');
  if (!Number.isInteger(offer.deadlineDays) || offer.deadlineDays < 1) throw new TypeError('offer.deadlineDays must be a positive integer');
  if (!Number.isInteger(offer.paymentCr) || offer.paymentCr < 0) throw new TypeError('offer.paymentCr must be a non-negative integer');
  if (!Number.isInteger(offer.cargoTons) || offer.cargoTons < 0) throw new TypeError('offer.cargoTons must be a non-negative integer');

  const document = {
    documentType: CONTRACT_DOCUMENT_TYPE,
    schemaVersion: CURRENT_CONTRACT_DOCUMENT_SCHEMA_VERSION,
    identity: {
      id: id ?? stableDocumentId('contract', `${offer.offerId}:${acceptedByCharacterId}:${acceptedShipId}`),
      title: offer.title
    },
    kind: offer.kind,
    provenance: {
      offerId: offer.offerId,
      rulesBasis: String(offer.rulesBasis ?? 'sea-of-suns-original'),
      setting: String(offer.setting ?? 'Sea of Suns')
    },
    issuer: {
      name: String(offer.issuerName ?? 'Undisclosed Principal'),
      type: String(offer.issuerType ?? 'private')
    },
    origin: {
      systemId: offer.originSystemId,
      systemName: String(offer.originSystemName ?? offer.originSystemId)
    },
    destination: {
      systemId: offer.destinationSystemId,
      systemName: String(offer.destinationSystemName ?? offer.destinationSystemId)
    },
    requirements: {
      cargoTons: offer.cargoTons,
      exclusiveShip: Boolean(offer.exclusiveShip),
      description: String(offer.requirementsDescription ?? '')
    },
    economics: {
      paymentCr: offer.paymentCr,
      paymentTiming: 'completion'
    },
    timing: {
      acceptedDate: dateOnly(acceptedDate),
      deadlineDate: addContractDays(acceptedDate, offer.deadlineDays)
    },
    assigned: {
      characterId: acceptedByCharacterId,
      shipId: acceptedShipId
    },
    status: 'accepted',
    resolution: {
      date: null,
      paymentCr: 0,
      notes: ''
    },
    notes: String(offer.notes ?? '')
  };
  assertValidContractDocument(document);
  return document;
}

export function validateContractDocument(document) {
  const errors = [];
  add(errors, isPlainObject(document), 'contract document must be an object');
  if (!isPlainObject(document)) return { valid: false, errors };
  exactKeys(document, TOP_LEVEL_KEYS, '$', errors);
  add(errors, document.documentType === CONTRACT_DOCUMENT_TYPE, `documentType must be ${CONTRACT_DOCUMENT_TYPE}`);
  add(errors, document.schemaVersion === CURRENT_CONTRACT_DOCUMENT_SCHEMA_VERSION, `schemaVersion must be ${CURRENT_CONTRACT_DOCUMENT_SCHEMA_VERSION}`);

  add(errors, isPlainObject(document.identity), 'identity must be an object');
  if (isPlainObject(document.identity)) {
    exactKeys(document.identity, ['id', 'title'], 'identity', errors);
    add(errors, nonblank(document.identity.id), 'identity.id must be nonblank');
    add(errors, nonblank(document.identity.title), 'identity.title must be nonblank');
  }
  add(errors, CONTRACT_KINDS.includes(document.kind), 'kind is invalid');

  add(errors, isPlainObject(document.provenance), 'provenance must be an object');
  if (isPlainObject(document.provenance)) {
    exactKeys(document.provenance, ['offerId', 'rulesBasis', 'setting'], 'provenance', errors);
    add(errors, nonblank(document.provenance.offerId), 'provenance.offerId must be nonblank');
    add(errors, nonblank(document.provenance.rulesBasis), 'provenance.rulesBasis must be nonblank');
    add(errors, nonblank(document.provenance.setting), 'provenance.setting must be nonblank');
  }

  for (const [key, value] of [['issuer', document.issuer], ['origin', document.origin], ['destination', document.destination]]) {
    add(errors, isPlainObject(value), `${key} must be an object`);
  }
  if (isPlainObject(document.issuer)) {
    exactKeys(document.issuer, ['name', 'type'], 'issuer', errors);
    add(errors, nonblank(document.issuer.name), 'issuer.name must be nonblank');
    add(errors, nonblank(document.issuer.type), 'issuer.type must be nonblank');
  }
  for (const key of ['origin', 'destination']) {
    const value = document[key];
    if (isPlainObject(value)) {
      exactKeys(value, ['systemId', 'systemName'], key, errors);
      add(errors, nonblank(value.systemId), `${key}.systemId must be nonblank`);
      add(errors, nonblank(value.systemName), `${key}.systemName must be nonblank`);
    }
  }
  if (isPlainObject(document.origin) && isPlainObject(document.destination)) {
    add(errors, document.origin.systemId !== document.destination.systemId, 'origin and destination must differ');
  }

  add(errors, isPlainObject(document.requirements), 'requirements must be an object');
  if (isPlainObject(document.requirements)) {
    exactKeys(document.requirements, ['cargoTons', 'exclusiveShip', 'description'], 'requirements', errors);
    add(errors, Number.isInteger(document.requirements.cargoTons) && document.requirements.cargoTons >= 0, 'requirements.cargoTons must be a non-negative integer');
    add(errors, typeof document.requirements.exclusiveShip === 'boolean', 'requirements.exclusiveShip must be boolean');
    add(errors, typeof document.requirements.description === 'string', 'requirements.description must be a string');
  }

  add(errors, isPlainObject(document.economics), 'economics must be an object');
  if (isPlainObject(document.economics)) {
    exactKeys(document.economics, ['paymentCr', 'paymentTiming'], 'economics', errors);
    add(errors, Number.isInteger(document.economics.paymentCr) && document.economics.paymentCr >= 0, 'economics.paymentCr must be a non-negative integer');
    add(errors, document.economics.paymentTiming === 'completion', 'economics.paymentTiming must be completion');
  }

  add(errors, isPlainObject(document.timing), 'timing must be an object');
  if (isPlainObject(document.timing)) {
    exactKeys(document.timing, ['acceptedDate', 'deadlineDate'], 'timing', errors);
    add(errors, validDate(document.timing.acceptedDate), 'timing.acceptedDate must be a valid date');
    add(errors, validDate(document.timing.deadlineDate), 'timing.deadlineDate must be a valid date');
  }

  add(errors, isPlainObject(document.assigned), 'assigned must be an object');
  if (isPlainObject(document.assigned)) {
    exactKeys(document.assigned, ['characterId', 'shipId'], 'assigned', errors);
    add(errors, nonblank(document.assigned.characterId), 'assigned.characterId must be nonblank');
    add(errors, nonblank(document.assigned.shipId), 'assigned.shipId must be nonblank');
  }

  add(errors, CONTRACT_STATUSES.includes(document.status), 'status is invalid');
  add(errors, isPlainObject(document.resolution), 'resolution must be an object');
  if (isPlainObject(document.resolution)) {
    exactKeys(document.resolution, ['date', 'paymentCr', 'notes'], 'resolution', errors);
    add(errors, document.resolution.date === null || validDate(document.resolution.date), 'resolution.date must be null or a valid date');
    add(errors, Number.isInteger(document.resolution.paymentCr) && document.resolution.paymentCr >= 0, 'resolution.paymentCr must be a non-negative integer');
    add(errors, typeof document.resolution.notes === 'string', 'resolution.notes must be a string');
  }
  if (document.status === 'accepted') {
    add(errors, document.resolution.date === null, 'accepted contract resolution.date must be null');
    add(errors, document.resolution.paymentCr === 0, 'accepted contract resolution.paymentCr must be 0');
  } else {
    add(errors, validDate(document.resolution.date), 'resolved contract requires resolution.date');
  }
  add(errors, typeof document.notes === 'string', 'notes must be a string');
  return { valid: errors.length === 0, errors };
}

export function assertValidContractDocument(document) {
  const result = validateContractDocument(document);
  if (!result.valid) throw new ContractDocumentValidationError(result.errors);
  return document;
}

export function importContractDocument(input) {
  let parsed = input;
  if (typeof input === 'string') {
    try { parsed = JSON.parse(input); }
    catch (error) { throw new ContractDocumentValidationError(`invalid JSON: ${error.message}`); }
  }
  assertValidContractDocument(parsed);
  return cloneJson(parsed);
}

export function exportContractDocument(document, { space = 2 } = {}) {
  assertValidContractDocument(document);
  return JSON.stringify(document, null, space);
}

export function completeContractDocument(document, { date, paymentCr = document.economics.paymentCr, notes = '' } = {}) {
  assertValidContractDocument(document);
  if (document.status !== 'accepted') throw new ContractDocumentValidationError('only accepted contracts can be completed');
  if (!validDate(date)) throw new TypeError('completion date must contain year and dayOfYear');
  if (!Number.isInteger(paymentCr) || paymentCr < 0) throw new TypeError('paymentCr must be a non-negative integer');
  const next = cloneJson(document);
  next.status = 'completed';
  next.resolution = { date: dateOnly(date), paymentCr, notes: String(notes) };
  assertValidContractDocument(next);
  return next;
}

export function failContractDocument(document, { date, notes = '' } = {}) {
  assertValidContractDocument(document);
  if (document.status !== 'accepted') throw new ContractDocumentValidationError('only accepted contracts can fail');
  if (!validDate(date)) throw new TypeError('failure date must contain year and dayOfYear');
  const next = cloneJson(document);
  next.status = 'failed';
  next.resolution = { date: dateOnly(date), paymentCr: 0, notes: String(notes) };
  assertValidContractDocument(next);
  return next;
}

export function reconcileContractDeadlines(contracts, campaignTime) {
  if (!Array.isArray(contracts)) throw new TypeError('contracts must be an array');
  if (!validDate(campaignTime)) throw new TypeError('campaignTime must contain year and dayOfYear');
  const updated = [];
  const failed = [];
  for (const contract of contracts) {
    assertValidContractDocument(contract);
    if (contract.status === 'accepted' && isContractOverdue(contract, campaignTime)) {
      const next = failContractDocument(contract, {
        date: campaignTime,
        notes: 'Deadline missed before destination delivery.'
      });
      updated.push(next);
      failed.push(next);
    } else {
      updated.push(cloneJson(contract));
    }
  }
  return Object.freeze({ contracts: Object.freeze(updated), failed: Object.freeze(failed) });
}


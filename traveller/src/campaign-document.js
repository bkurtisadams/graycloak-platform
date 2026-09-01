import { stableDocumentId } from '../../packages/classic-traveller-rules/index.js';

export const CAMPAIGN_DOCUMENT_TYPE = 'graycloak-traveller-campaign';
export const CURRENT_CAMPAIGN_DOCUMENT_SCHEMA_VERSION = 3;
export const SUPPORTED_CAMPAIGN_DOCUMENT_SCHEMA_VERSIONS = Object.freeze([1, 2, 3]);

export const DEFAULT_CAMPAIGN_TIME = Object.freeze({
  year: 4800,
  dayOfYear: 1,
  secondsOfDay: 0
});

const TOP_LEVEL_KEYS = Object.freeze([
  'documentType', 'schemaVersion', 'identity', 'time', 'location',
  'party', 'activeShipId', 'documentRefs', 'commerce', 'notes'
]);

export class CampaignDocumentValidationError extends Error {
  constructor(errors) {
    const list = Array.isArray(errors) ? errors : [String(errors)];
    super(`invalid Graycloak Traveller campaign document: ${list.join('; ')}`);
    this.name = 'CampaignDocumentValidationError';
    this.errors = Object.freeze([...list]);
  }
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function add(errors, condition, message) {
  if (!condition) errors.push(message);
}

function exactKeys(value, keys, path, errors) {
  if (!isPlainObject(value)) return;
  const allowed = new Set(keys);
  for (const key of Object.keys(value)) add(errors, allowed.has(key), `${path} contains unknown field: ${key}`);
  for (const key of keys) add(errors, Object.hasOwn(value, key), `${path} missing field: ${key}`);
}

function nonblank(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function nullableString(value) {
  return value === null || typeof value === 'string';
}

function parseJson(input) {
  if (typeof input !== 'string') return input;
  try {
    return JSON.parse(input);
  } catch (error) {
    throw new CampaignDocumentValidationError(`invalid JSON: ${error.message}`);
  }
}

function normalizeTime(time = {}) {
  return {
    year: Number.isInteger(time.year) ? time.year : DEFAULT_CAMPAIGN_TIME.year,
    dayOfYear: Number.isInteger(time.dayOfYear) ? time.dayOfYear : DEFAULT_CAMPAIGN_TIME.dayOfYear,
    secondsOfDay: Number.isInteger(time.secondsOfDay) ? time.secondsOfDay : DEFAULT_CAMPAIGN_TIME.secondsOfDay
  };
}

function characterRef(document) {
  return {
    id: document.identity.id,
    name: document.identity.name
  };
}

function shipRef(document) {
  return {
    id: document.identity.id,
    name: document.identity.name,
    registry: document.identity.registry,
    typeCode: document.design.typeCode
  };
}

function contractRef(document) {
  return {
    id: document.identity.id,
    title: document.identity.title,
    kind: document.kind,
    status: document.status
  };
}

function uniqueById(entries) {
  const byId = new Map();
  for (const entry of entries) byId.set(entry.id, entry);
  return [...byId.values()];
}

export function createCampaignDocument({
  id,
  name = 'Unnamed Campaign',
  time = DEFAULT_CAMPAIGN_TIME,
  location = {},
  characters = [],
  ships = [],
  contracts = [],
  commerce = {},
  partyCharacterIds,
  activeShipId,
  notes = ''
} = {}) {
  if (!Array.isArray(characters) || characters.length === 0) {
    throw new CampaignDocumentValidationError('a campaign requires at least one gameplay Character Document');
  }
  if (!Array.isArray(ships)) throw new TypeError('ships must be an array');
  if (!Array.isArray(contracts)) throw new TypeError('contracts must be an array');
  if (typeof name !== 'string') throw new TypeError('name must be a string');
  if (typeof notes !== 'string') throw new TypeError('notes must be a string');

  const characterRefs = uniqueById(characters.map(characterRef));
  const shipRefs = uniqueById(ships.map(shipRef));
  const contractRefs = uniqueById(contracts.map(contractRef));
  const partyIds = partyCharacterIds === undefined
    ? characterRefs.map((entry) => entry.id)
    : [...partyCharacterIds];
  const resolvedActiveShipId = activeShipId === undefined
    ? (shipRefs[0]?.id ?? null)
    : activeShipId;
  const seed = `${name}\u0000${characterRefs.map((entry) => entry.id).join(',')}\u0000${Date.now()}\u0000${Math.random()}`;

  const document = {
    documentType: CAMPAIGN_DOCUMENT_TYPE,
    schemaVersion: CURRENT_CAMPAIGN_DOCUMENT_SCHEMA_VERSION,
    identity: {
      id: id ?? stableDocumentId('campaign', seed),
      name
    },
    time: normalizeTime(time),
    location: {
      systemId: location.systemId ?? null,
      systemName: location.systemName ?? '',
      worldId: location.worldId ?? null,
      worldName: location.worldName ?? ''
    },
    party: {
      characterIds: partyIds
    },
    activeShipId: resolvedActiveShipId,
    documentRefs: {
      characters: characterRefs,
      ships: shipRefs,
      contracts: contractRefs
    },
    commerce: {
      speculativeLots: Array.isArray(commerce.speculativeLots) ? cloneJson(commerce.speculativeLots) : []
    },
    notes
  };

  assertValidCampaignDocument(document);
  return document;
}

export function validateCampaignDocument(document) {
  const errors = [];
  add(errors, isPlainObject(document), 'campaign document must be an object');
  if (!isPlainObject(document)) return { valid: false, errors };

  exactKeys(document, TOP_LEVEL_KEYS, '$', errors);
  add(errors, document.documentType === CAMPAIGN_DOCUMENT_TYPE, `documentType must be ${CAMPAIGN_DOCUMENT_TYPE}`);
  add(errors, document.schemaVersion === CURRENT_CAMPAIGN_DOCUMENT_SCHEMA_VERSION, `schemaVersion must be ${CURRENT_CAMPAIGN_DOCUMENT_SCHEMA_VERSION}`);

  add(errors, isPlainObject(document.identity), 'identity must be an object');
  if (isPlainObject(document.identity)) {
    exactKeys(document.identity, ['id', 'name'], 'identity', errors);
    add(errors, nonblank(document.identity.id), 'identity.id must be a nonblank string');
    add(errors, typeof document.identity.name === 'string', 'identity.name must be a string');
  }

  add(errors, isPlainObject(document.time), 'time must be an object');
  if (isPlainObject(document.time)) {
    exactKeys(document.time, ['year', 'dayOfYear', 'secondsOfDay'], 'time', errors);
    add(errors, Number.isInteger(document.time.year) && document.time.year >= 0, 'time.year must be a non-negative integer');
    add(errors, Number.isInteger(document.time.dayOfYear) && document.time.dayOfYear >= 1 && document.time.dayOfYear <= 366, 'time.dayOfYear must be an integer from 1 to 366');
    add(errors, Number.isInteger(document.time.secondsOfDay) && document.time.secondsOfDay >= 0 && document.time.secondsOfDay < 86400, 'time.secondsOfDay must be an integer from 0 to 86399');
  }

  add(errors, isPlainObject(document.location), 'location must be an object');
  if (isPlainObject(document.location)) {
    exactKeys(document.location, ['systemId', 'systemName', 'worldId', 'worldName'], 'location', errors);
    add(errors, nullableString(document.location.systemId), 'location.systemId must be null or a string');
    add(errors, typeof document.location.systemName === 'string', 'location.systemName must be a string');
    add(errors, nullableString(document.location.worldId), 'location.worldId must be null or a string');
    add(errors, typeof document.location.worldName === 'string', 'location.worldName must be a string');
  }

  add(errors, isPlainObject(document.party), 'party must be an object');
  if (isPlainObject(document.party)) {
    exactKeys(document.party, ['characterIds'], 'party', errors);
    add(errors, Array.isArray(document.party.characterIds) && document.party.characterIds.length > 0, 'party.characterIds must be a non-empty array');
    if (Array.isArray(document.party.characterIds)) {
      add(errors, document.party.characterIds.every(nonblank), 'party.characterIds must contain nonblank strings');
      add(errors, new Set(document.party.characterIds).size === document.party.characterIds.length, 'party.characterIds must be unique');
    }
  }

  add(errors, document.activeShipId === null || nonblank(document.activeShipId), 'activeShipId must be null or a nonblank string');

  add(errors, isPlainObject(document.documentRefs), 'documentRefs must be an object');
  const characterIds = new Set();
  const shipIds = new Set();
  if (isPlainObject(document.documentRefs)) {
    exactKeys(document.documentRefs, ['characters', 'ships', 'contracts'], 'documentRefs', errors);
    add(errors, Array.isArray(document.documentRefs.characters) && document.documentRefs.characters.length > 0, 'documentRefs.characters must be a non-empty array');
    add(errors, Array.isArray(document.documentRefs.ships), 'documentRefs.ships must be an array');
    add(errors, Array.isArray(document.documentRefs.contracts), 'documentRefs.contracts must be an array');

    if (Array.isArray(document.documentRefs.characters)) {
      for (const ref of document.documentRefs.characters) {
        add(errors, isPlainObject(ref), 'character reference must be an object');
        if (!isPlainObject(ref)) continue;
        exactKeys(ref, ['id', 'name'], 'documentRefs.characters[]', errors);
        add(errors, nonblank(ref.id), 'character reference id must be nonblank');
        add(errors, typeof ref.name === 'string', 'character reference name must be a string');
        if (nonblank(ref.id)) {
          add(errors, !characterIds.has(ref.id), `duplicate character reference: ${ref.id}`);
          characterIds.add(ref.id);
        }
      }
    }

    if (Array.isArray(document.documentRefs.ships)) {
      for (const ref of document.documentRefs.ships) {
        add(errors, isPlainObject(ref), 'ship reference must be an object');
        if (!isPlainObject(ref)) continue;
        exactKeys(ref, ['id', 'name', 'registry', 'typeCode'], 'documentRefs.ships[]', errors);
        add(errors, nonblank(ref.id), 'ship reference id must be nonblank');
        add(errors, typeof ref.name === 'string', 'ship reference name must be a string');
        add(errors, typeof ref.registry === 'string', 'ship reference registry must be a string');
        add(errors, typeof ref.typeCode === 'string', 'ship reference typeCode must be a string');
        if (nonblank(ref.id)) {
          add(errors, !shipIds.has(ref.id), `duplicate ship reference: ${ref.id}`);
          shipIds.add(ref.id);
        }
      }
    }

    const contractIds = new Set();
    if (Array.isArray(document.documentRefs.contracts)) {
      for (const ref of document.documentRefs.contracts) {
        add(errors, isPlainObject(ref), 'contract reference must be an object');
        if (!isPlainObject(ref)) continue;
        exactKeys(ref, ['id', 'title', 'kind', 'status'], 'documentRefs.contracts[]', errors);
        add(errors, nonblank(ref.id), 'contract reference id must be nonblank');
        add(errors, typeof ref.title === 'string', 'contract reference title must be a string');
        add(errors, typeof ref.kind === 'string', 'contract reference kind must be a string');
        add(errors, typeof ref.status === 'string', 'contract reference status must be a string');
        if (nonblank(ref.id)) {
          add(errors, !contractIds.has(ref.id), `duplicate contract reference: ${ref.id}`);
          contractIds.add(ref.id);
        }
      }
    }
  }

  if (Array.isArray(document.party?.characterIds)) {
    for (const id of document.party.characterIds) add(errors, characterIds.has(id), `party character is not in documentRefs: ${id}`);
  }
  if (document.activeShipId !== null) add(errors, shipIds.has(document.activeShipId), 'activeShipId must reference a ship in documentRefs');

  add(errors, isPlainObject(document.commerce), 'commerce must be an object');
  if (isPlainObject(document.commerce)) {
    exactKeys(document.commerce, ['speculativeLots'], 'commerce', errors);
    add(errors, Array.isArray(document.commerce.speculativeLots), 'commerce.speculativeLots must be an array');
    const lotKeys = new Set();
    if (Array.isArray(document.commerce.speculativeLots)) {
      for (const lot of document.commerce.speculativeLots) {
        add(errors, isPlainObject(lot), 'commerce.speculativeLots[] must be an object');
        if (!isPlainObject(lot)) continue;
        exactKeys(lot, ['key', 'systemId', 'tradeGoodCode', 'purchasedQuantity'], 'commerce.speculativeLots[]', errors);
        add(errors, nonblank(lot.key), 'commerce speculative lot key must be nonblank');
        add(errors, nonblank(lot.systemId), 'commerce speculative lot systemId must be nonblank');
        add(errors, Number.isInteger(lot.tradeGoodCode) && lot.tradeGoodCode >= 11 && lot.tradeGoodCode <= 66, 'commerce speculative lot tradeGoodCode must be an integer from 11 to 66');
        add(errors, Number.isInteger(lot.purchasedQuantity) && lot.purchasedQuantity >= 0, 'commerce speculative lot purchasedQuantity must be a non-negative integer');
        if (nonblank(lot.key)) {
          add(errors, !lotKeys.has(lot.key), `duplicate commerce speculative lot key: ${lot.key}`);
          lotKeys.add(lot.key);
        }
      }
    }
  }

  add(errors, typeof document.notes === 'string', 'notes must be a string');
  return { valid: errors.length === 0, errors };
}

export function assertValidCampaignDocument(document) {
  const result = validateCampaignDocument(document);
  if (!result.valid) throw new CampaignDocumentValidationError(result.errors);
  return document;
}

export function migrateCampaignDocument(input) {
  const parsed = parseJson(input);
  if (!isPlainObject(parsed)) throw new CampaignDocumentValidationError('campaign document must be an object');
  if (!SUPPORTED_CAMPAIGN_DOCUMENT_SCHEMA_VERSIONS.includes(parsed.schemaVersion)) {
    throw new CampaignDocumentValidationError(`unsupported schemaVersion: ${parsed.schemaVersion}`);
  }
  if (parsed.schemaVersion === CURRENT_CAMPAIGN_DOCUMENT_SCHEMA_VERSION) {
    assertValidCampaignDocument(parsed);
    return cloneJson(parsed);
  }
  const next = cloneJson(parsed);
  if (next.schemaVersion === 1) {
    next.schemaVersion = 2;
    next.documentRefs = { ...next.documentRefs, contracts: [] };
  }
  if (next.schemaVersion === 2) {
    next.schemaVersion = 3;
    next.commerce = { speculativeLots: [] };
  }
  assertValidCampaignDocument(next);
  return next;
}

export function importCampaignDocument(input) {
  return migrateCampaignDocument(input);
}

export function exportCampaignDocument(document, { space = 2 } = {}) {
  assertValidCampaignDocument(document);
  return JSON.stringify(document, null, space);
}

export function updateCampaignIdentity(document, { name = document.identity?.name } = {}) {
  const next = cloneJson(document);
  next.identity.name = name;
  assertValidCampaignDocument(next);
  return next;
}

export function updateCampaignTime(document, patch = {}) {
  const next = cloneJson(document);
  next.time = { ...next.time, ...patch };
  assertValidCampaignDocument(next);
  return next;
}


export function advanceCampaignDays(document, days, { daysPerYear = 365 } = {}) {
  if (!Number.isInteger(days) || days < 0) throw new RangeError('days must be a non-negative integer');
  if (!Number.isInteger(daysPerYear) || daysPerYear < 1 || daysPerYear > 366) throw new RangeError('daysPerYear must be an integer from 1 to 366');
  const next = cloneJson(document);
  let dayIndex = next.time.dayOfYear - 1 + days;
  let year = next.time.year;
  while (dayIndex >= daysPerYear) {
    dayIndex -= daysPerYear;
    year += 1;
  }
  next.time.year = year;
  next.time.dayOfYear = dayIndex + 1;
  assertValidCampaignDocument(next);
  return next;
}

export function updateCampaignLocation(document, patch = {}) {
  const next = cloneJson(document);
  next.location = { ...next.location, ...patch };
  assertValidCampaignDocument(next);
  return next;
}

export function refreshCampaignDocumentRefs(document, { characters = [], ships = [], contracts = [] } = {}) {
  const next = cloneJson(document);
  const characterMap = new Map(characters.map((entry) => [entry.identity.id, entry]));
  const shipMap = new Map(ships.map((entry) => [entry.identity.id, entry]));
  const contractMap = new Map(contracts.map((entry) => [entry.identity.id, entry]));

  next.documentRefs.characters = next.documentRefs.characters.map((ref) => {
    const source = characterMap.get(ref.id);
    return source ? characterRef(source) : ref;
  });
  next.documentRefs.ships = next.documentRefs.ships.map((ref) => {
    const source = shipMap.get(ref.id);
    return source ? shipRef(source) : ref;
  });
  next.documentRefs.contracts = next.documentRefs.contracts.map((ref) => {
    const source = contractMap.get(ref.id);
    return source ? contractRef(source) : ref;
  });
  assertValidCampaignDocument(next);
  return next;
}

export function addCharacterToCampaign(document, characterDocument, { active = true } = {}) {
  const next = cloneJson(document);
  next.documentRefs.characters = uniqueById([...next.documentRefs.characters, characterRef(characterDocument)]);
  if (active && !next.party.characterIds.includes(characterDocument.identity.id)) next.party.characterIds.push(characterDocument.identity.id);
  assertValidCampaignDocument(next);
  return next;
}

export function addShipToCampaign(document, shipDocument, { makeActive = true } = {}) {
  const next = cloneJson(document);
  next.documentRefs.ships = uniqueById([...next.documentRefs.ships, shipRef(shipDocument)]);
  if (makeActive) next.activeShipId = shipDocument.identity.id;
  assertValidCampaignDocument(next);
  return next;
}


export function addContractToCampaign(document, contractDocument) {
  const next = cloneJson(document);
  next.documentRefs.contracts = uniqueById([...next.documentRefs.contracts, contractRef(contractDocument)]);
  assertValidCampaignDocument(next);
  return next;
}

export function speculativeLotPurchasedQuantity(document, lotKey) {
  assertValidCampaignDocument(document);
  const key = String(lotKey ?? '').trim();
  if (!key) throw new TypeError('lotKey must be nonblank');
  return document.commerce.speculativeLots.find((entry) => entry.key === key)?.purchasedQuantity ?? 0;
}

export function recordSpeculativeLotPurchase(document, {
  key,
  systemId,
  tradeGoodCode,
  quantity
} = {}) {
  assertValidCampaignDocument(document);
  const normalizedKey = String(key ?? '').trim();
  const normalizedSystemId = String(systemId ?? '').trim();
  if (!normalizedKey) throw new TypeError('key must be nonblank');
  if (!normalizedSystemId) throw new TypeError('systemId must be nonblank');
  if (!Number.isInteger(tradeGoodCode) || tradeGoodCode < 11 || tradeGoodCode > 66) throw new TypeError('tradeGoodCode must be an integer from 11 to 66');
  if (!Number.isInteger(quantity) || quantity < 1) throw new TypeError('quantity must be a positive integer');

  const next = cloneJson(document);
  const index = next.commerce.speculativeLots.findIndex((entry) => entry.key === normalizedKey);
  if (index >= 0) {
    const lot = next.commerce.speculativeLots[index];
    if (lot.systemId !== normalizedSystemId || lot.tradeGoodCode !== tradeGoodCode) {
      throw new CampaignDocumentValidationError(`speculative lot key conflicts with existing market state: ${normalizedKey}`);
    }
    lot.purchasedQuantity += quantity;
  } else {
    next.commerce.speculativeLots.push({
      key: normalizedKey,
      systemId: normalizedSystemId,
      tradeGoodCode,
      purchasedQuantity: quantity
    });
  }
  assertValidCampaignDocument(next);
  return next;
}


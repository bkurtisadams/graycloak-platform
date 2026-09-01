import { stableDocumentId } from '../documents/ids.js';
import {
  assertValidCharacterDocument,
  linkCharacterToShip
} from '../characters/character-document.js';
import {
  TYPE_S_SCOUT_COURIER,
  TYPE_S_SCOUT_COURIER_KEY,
  getStandardShipDesign
} from './standard-designs.js';

export const SHIP_DOCUMENT_TYPE = 'classic-traveller-ship';
export const CURRENT_SHIP_DOCUMENT_SCHEMA_VERSION = 3;
export const SUPPORTED_SHIP_DOCUMENT_SCHEMA_VERSIONS = Object.freeze([1, 2, 3]);

const TOP_LEVEL_KEYS = new Set([
  'documentType', 'schemaVersion', 'identity', 'design', 'specifications',
  'authority', 'crew', 'state', 'notes', 'provenance'
]);

export class ShipDocumentValidationError extends Error {
  constructor(errors) {
    const list = Array.isArray(errors) ? errors : [String(errors)];
    super(`invalid Classic Traveller ship document: ${list.join('; ')}`);
    this.name = 'ShipDocumentValidationError';
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

function validateExactKeys(value, allowed, path, errors) {
  if (!isPlainObject(value)) return;
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) add(errors, allowedSet.has(key), `unknown ${path} field: ${key}`);
  for (const key of allowed) add(errors, Object.hasOwn(value, key), `missing ${path} field: ${key}`);
}

function jsonEqual(left, right) {
  if (left === right) return true;
  if (typeof left !== typeof right || left === null || right === null) return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((entry, index) => jsonEqual(entry, right[index]));
  }
  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    if (leftKeys.length !== rightKeys.length || leftKeys.some((key, index) => key !== rightKeys[index])) return false;
    return leftKeys.every((key) => jsonEqual(left[key], right[key]));
  }
  return false;
}

function integerAtLeast(value, minimum) {
  return Number.isInteger(value) && value >= minimum;
}

function finiteAtLeast(value, minimum) {
  return Number.isFinite(value) && value >= minimum;
}

function assertJsonSafe(value, path = '$', seen = new Set()) {
  if (value === null) return;
  const type = typeof value;
  if (type === 'string' || type === 'boolean') return;
  if (type === 'number') {
    if (!Number.isFinite(value)) throw new ShipDocumentValidationError(`${path} contains a non-finite number`);
    return;
  }
  if (type === 'undefined' || type === 'function' || type === 'symbol' || type === 'bigint') {
    throw new ShipDocumentValidationError(`${path} contains a non-JSON value`);
  }
  if (seen.has(value)) throw new ShipDocumentValidationError(`${path} contains a circular reference`);
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertJsonSafe(entry, `${path}[${index}]`, seen));
  } else if (isPlainObject(value)) {
    for (const [key, entry] of Object.entries(value)) assertJsonSafe(entry, `${path}.${key}`, seen);
  } else {
    throw new ShipDocumentValidationError(`${path} contains a non-plain object`);
  }
  seen.delete(value);
}

function specsFromDesign(design) {
  return {
    hull: cloneJson(design.hull),
    drives: cloneJson(design.drives),
    fuel: cloneJson(design.fuel),
    computer: cloneJson(design.computer),
    accommodations: cloneJson(design.accommodations),
    cargo: cloneJson(design.cargo),
    armament: cloneJson(design.armament),
    vehicles: cloneJson(design.vehicles),
    crew: cloneJson(design.crew),
    economics: cloneJson(design.economics)
  };
}

export function createShipDocument({
  designKey,
  id,
  name = '',
  registry = '',
  authority,
  crewAssignments = [],
  state = {},
  notes = ''
} = {}) {
  const design = getStandardShipDesign(designKey);
  if (typeof id !== 'string' || !id.trim()) throw new TypeError('ship id must be a nonblank string');
  if (typeof name !== 'string') throw new TypeError('ship name must be a string');
  if (typeof registry !== 'string') throw new TypeError('ship registry must be a string');
  if (!isPlainObject(authority)) throw new TypeError('authority must be an object');
  if (!Array.isArray(crewAssignments)) throw new TypeError('crewAssignments must be an array');
  if (!isPlainObject(state)) throw new TypeError('state must be an object');
  if (typeof notes !== 'string') throw new TypeError('notes must be a string');

  const document = {
    documentType: SHIP_DOCUMENT_TYPE,
    schemaVersion: CURRENT_SHIP_DOCUMENT_SCHEMA_VERSION,
    identity: {
      id: id.trim(),
      name,
      registry
    },
    design: {
      key: design.key,
      typeCode: design.typeCode,
      name: design.name
    },
    specifications: specsFromDesign(design),
    authority: cloneJson(authority),
    crew: {
      assignments: cloneJson(crewAssignments)
    },
    state: {
      operationalStatus: state.operationalStatus ?? 'available',
      currentFuelTons: state.currentFuelTons ?? null,
      fuelQuality: state.fuelQuality ?? 'unknown',
      cargoUsedTons: state.cargoUsedTons ?? 0,
      cargoManifest: cloneJson(state.cargoManifest ?? []),
      passengerManifest: cloneJson(state.passengerManifest ?? []),
      finances: {
        balanceCr: state.finances?.balanceCr ?? 0,
        ledger: cloneJson(state.finances?.ledger ?? [])
      },
      portCall: state.portCall ? cloneJson(state.portCall) : null,
      maintenance: {
        status: state.maintenance?.status ?? 'unknown',
        lastOverhaulDate: state.maintenance?.lastOverhaulDate ?? null,
        monthsPastDue: state.maintenance?.monthsPastDue ?? null
      }
    },
    notes,
    provenance: {
      source: 'classic-traveller-book-2-standard-design',
      sourceDesign: design.key,
      sourceReferences: [...design.sources]
    }
  };

  assertValidShipDocument(document);
  return document;
}

function validateIdentity(document, errors) {
  add(errors, isPlainObject(document.identity), 'identity must be an object');
  if (!isPlainObject(document.identity)) return;
  validateExactKeys(document.identity, ['id', 'name', 'registry'], 'identity', errors);
  add(errors, typeof document.identity.id === 'string' && document.identity.id.trim().length > 0, 'identity.id must be a nonblank string');
  add(errors, typeof document.identity.name === 'string', 'identity.name must be a string');
  add(errors, typeof document.identity.registry === 'string', 'identity.registry must be a string');
}

function validateSpecifications(document, design, errors) {
  const specs = document.specifications;
  add(errors, isPlainObject(specs), 'specifications must be an object');
  if (!isPlainObject(specs)) return;
  const expected = specsFromDesign(design);
  add(errors, jsonEqual(specs, expected), 'specifications must match the canonical standard design');
}

function validateAuthority(authority, errors) {
  add(errors, isPlainObject(authority), 'authority must be an object');
  if (!isPlainObject(authority)) return;
  validateExactKeys(authority, [
    'assignmentType', 'controllingAuthority', 'legalTitleHolder', 'legalTitleSourceStatus',
    'characterOwnsShip', 'assignedCharacterId', 'assignedCharacterName', 'recallable',
    'saleAllowed', 'useAsDesired', 'possessionAtServicePleasure', 'servicePrivileges',
    'operatorResponsibilities'
  ], 'authority', errors);
  add(errors, typeof authority.assignmentType === 'string' && authority.assignmentType.length > 0, 'authority.assignmentType must be a nonblank string');
  add(errors, typeof authority.controllingAuthority === 'string' && authority.controllingAuthority.length > 0, 'authority.controllingAuthority must be a nonblank string');
  add(errors, authority.legalTitleHolder === null || typeof authority.legalTitleHolder === 'string', 'authority.legalTitleHolder must be null or a string');
  add(errors, typeof authority.legalTitleSourceStatus === 'string' && authority.legalTitleSourceStatus.length > 0, 'authority.legalTitleSourceStatus must be nonblank');
  add(errors, typeof authority.characterOwnsShip === 'boolean', 'authority.characterOwnsShip must be boolean');
  add(errors, typeof authority.assignedCharacterId === 'string' && authority.assignedCharacterId.length > 0, 'authority.assignedCharacterId must be a nonblank string');
  add(errors, typeof authority.assignedCharacterName === 'string', 'authority.assignedCharacterName must be a string');
  for (const key of ['recallable', 'saleAllowed', 'useAsDesired', 'possessionAtServicePleasure']) {
    add(errors, typeof authority[key] === 'boolean', `authority.${key} must be boolean`);
  }
  add(errors, isPlainObject(authority.servicePrivileges), 'authority.servicePrivileges must be an object');
  if (isPlainObject(authority.servicePrivileges)) {
    validateExactKeys(authority.servicePrivileges, ['freeFuelAtScoutBases', 'freeMaintenanceAtScoutBasesAtClassBStarports'], 'authority.servicePrivileges', errors);
    add(errors, typeof authority.servicePrivileges.freeFuelAtScoutBases === 'boolean', 'freeFuelAtScoutBases must be boolean');
    add(errors, typeof authority.servicePrivileges.freeMaintenanceAtScoutBasesAtClassBStarports === 'boolean', 'freeMaintenanceAtScoutBasesAtClassBStarports must be boolean');
  }
  add(errors, isPlainObject(authority.operatorResponsibilities), 'authority.operatorResponsibilities must be an object');
  if (isPlainObject(authority.operatorResponsibilities)) {
    validateExactKeys(authority.operatorResponsibilities, ['upkeep', 'crewCosts'], 'authority.operatorResponsibilities', errors);
    add(errors, typeof authority.operatorResponsibilities.upkeep === 'boolean', 'operatorResponsibilities.upkeep must be boolean');
    add(errors, typeof authority.operatorResponsibilities.crewCosts === 'boolean', 'operatorResponsibilities.crewCosts must be boolean');
  }
}

function validateCrew(document, errors) {
  add(errors, isPlainObject(document.crew), 'crew must be an object');
  if (!isPlainObject(document.crew)) return;
  validateExactKeys(document.crew, ['assignments'], 'crew', errors);
  add(errors, Array.isArray(document.crew.assignments), 'crew.assignments must be an array');
  if (!Array.isArray(document.crew.assignments)) return;
  for (const assignment of document.crew.assignments) {
    add(errors, isPlainObject(assignment), 'crew assignment must be an object');
    if (!isPlainObject(assignment)) continue;
    validateExactKeys(assignment, ['role', 'characterId', 'characterName'], 'crew.assignment', errors);
    add(errors, typeof assignment.role === 'string' && assignment.role.length > 0, 'crew assignment role must be nonblank');
    add(errors, typeof assignment.characterId === 'string' && assignment.characterId.length > 0, 'crew assignment characterId must be nonblank');
    add(errors, typeof assignment.characterName === 'string', 'crew assignment characterName must be a string');
  }
}

function validateCargoManifest(document, errors) {
  const manifest = document.state?.cargoManifest;
  add(errors, Array.isArray(manifest), 'state.cargoManifest must be an array');
  if (!Array.isArray(manifest)) return;
  let totalTons = 0;
  const ids = new Set();
  for (const entry of manifest) {
    add(errors, isPlainObject(entry), 'cargo manifest entry must be an object');
    if (!isPlainObject(entry)) continue;
    validateExactKeys(entry, [
      'id', 'category', 'description', 'tons', 'originSystemId', 'destinationSystemId',
      'acquisitionCostCr', 'notes'
    ], 'state.cargoManifest entry', errors);
    add(errors, typeof entry.id === 'string' && entry.id.trim().length > 0, 'cargo manifest id must be nonblank');
    if (typeof entry.id === 'string') {
      add(errors, !ids.has(entry.id), `duplicate cargo manifest id: ${entry.id}`);
      ids.add(entry.id);
    }
    add(errors, typeof entry.category === 'string' && entry.category.trim().length > 0, 'cargo manifest category must be nonblank');
    add(errors, typeof entry.description === 'string', 'cargo manifest description must be a string');
    add(errors, finiteAtLeast(entry.tons, 0), 'cargo manifest tons must be a non-negative number');
    if (Number.isFinite(entry.tons)) totalTons += entry.tons;
    add(errors, entry.originSystemId === null || typeof entry.originSystemId === 'string', 'cargo manifest originSystemId must be null or a string');
    add(errors, entry.destinationSystemId === null || typeof entry.destinationSystemId === 'string', 'cargo manifest destinationSystemId must be null or a string');
    add(errors, integerAtLeast(entry.acquisitionCostCr, 0), 'cargo manifest acquisitionCostCr must be a non-negative integer');
    add(errors, typeof entry.notes === 'string', 'cargo manifest notes must be a string');
  }
  if (Number.isFinite(document.state?.cargoUsedTons)) {
    add(errors, Math.abs(totalTons - document.state.cargoUsedTons) < 1e-9, 'cargo manifest tonnage must equal state.cargoUsedTons');
  }
}

function validatePassengerManifest(document, errors) {
  const manifest = document.state?.passengerManifest;
  add(errors, Array.isArray(manifest), 'state.passengerManifest must be an array');
  if (!Array.isArray(manifest)) return;
  const ids = new Set();
  let stateroomPassengers = 0;
  let lowPassengers = 0;
  for (const entry of manifest) {
    add(errors, isPlainObject(entry), 'passenger manifest entry must be an object');
    if (!isPlainObject(entry)) continue;
    validateExactKeys(entry, [
      'id', 'class', 'originSystemId', 'destinationSystemId', 'fareCr'
    ], 'state.passengerManifest entry', errors);
    add(errors, typeof entry.id === 'string' && entry.id.trim().length > 0, 'passenger manifest id must be nonblank');
    if (typeof entry.id === 'string') {
      add(errors, !ids.has(entry.id), `duplicate passenger manifest id: ${entry.id}`);
      ids.add(entry.id);
    }
    add(errors, ['high', 'middle', 'low'].includes(entry.class), 'passenger class must be high, middle, or low');
    add(errors, typeof entry.originSystemId === 'string' && entry.originSystemId.trim().length > 0, 'passenger originSystemId must be nonblank');
    add(errors, typeof entry.destinationSystemId === 'string' && entry.destinationSystemId.trim().length > 0, 'passenger destinationSystemId must be nonblank');
    add(errors, integerAtLeast(entry.fareCr, 0), 'passenger fareCr must be a non-negative integer');
    if (entry.class === 'low') lowPassengers += 1;
    else if (entry.class === 'high' || entry.class === 'middle') stateroomPassengers += 1;
  }
  const crewPeople = new Set((document.crew?.assignments ?? []).map((entry) => entry?.characterId).filter(Boolean)).size;
  const staterooms = document.specifications?.accommodations?.staterooms ?? 0;
  const lowBerths = document.specifications?.accommodations?.lowBerths ?? 0;
  add(errors, crewPeople + stateroomPassengers <= staterooms, 'crew plus passengers exceed stateroom capacity');
  add(errors, lowPassengers <= lowBerths, 'low passengers exceed low-berth capacity');
}

function validateShipFinances(document, errors) {
  const finances = document.state?.finances;
  add(errors, isPlainObject(finances), 'state.finances must be an object');
  if (!isPlainObject(finances)) return;
  validateExactKeys(finances, ['balanceCr', 'ledger'], 'state.finances', errors);
  add(errors, integerAtLeast(finances.balanceCr, 0), 'state.finances.balanceCr must be a non-negative integer');
  add(errors, Array.isArray(finances.ledger), 'state.finances.ledger must be an array');
  if (!Array.isArray(finances.ledger)) return;
  let running = 0;
  const ids = new Set();
  for (const entry of finances.ledger) {
    add(errors, isPlainObject(entry), 'ship ledger entry must be an object');
    if (!isPlainObject(entry)) continue;
    validateExactKeys(entry, ['id', 'date', 'kind', 'amountCr', 'description', 'balanceCr'], 'state.finances.ledger entry', errors);
    add(errors, typeof entry.id === 'string' && entry.id.trim().length > 0, 'ship ledger id must be nonblank');
    if (typeof entry.id === 'string') {
      add(errors, !ids.has(entry.id), `duplicate ship ledger id: ${entry.id}`);
      ids.add(entry.id);
    }
    add(errors, entry.date === null || typeof entry.date === 'string', 'ship ledger date must be null or a string');
    add(errors, typeof entry.kind === 'string' && entry.kind.trim().length > 0, 'ship ledger kind must be nonblank');
    add(errors, Number.isInteger(entry.amountCr), 'ship ledger amountCr must be an integer');
    add(errors, typeof entry.description === 'string' && entry.description.trim().length > 0, 'ship ledger description must be nonblank');
    if (Number.isInteger(entry.amountCr)) running += entry.amountCr;
    add(errors, Number.isInteger(entry.balanceCr) && entry.balanceCr >= 0, 'ship ledger balanceCr must be a non-negative integer');
    if (Number.isInteger(entry.balanceCr)) add(errors, entry.balanceCr === running, 'ship ledger running balance does not reconcile');
  }
  add(errors, finances.balanceCr === running, 'state.finances.balanceCr does not reconcile with ledger');
}

function validatePortCall(document, errors) {
  const portCall = document.state?.portCall;
  add(errors, portCall === null || isPlainObject(portCall), 'state.portCall must be null or an object');
  if (!isPlainObject(portCall)) return;
  validateExactKeys(portCall, ['systemId', 'arrivalDate', 'berthingDueCr', 'berthingPaid'], 'state.portCall', errors);
  add(errors, typeof portCall.systemId === 'string' && portCall.systemId.trim().length > 0, 'state.portCall.systemId must be nonblank');
  add(errors, portCall.arrivalDate === null || typeof portCall.arrivalDate === 'string', 'state.portCall.arrivalDate must be null or a string');
  add(errors, integerAtLeast(portCall.berthingDueCr, 0), 'state.portCall.berthingDueCr must be a non-negative integer');
  add(errors, typeof portCall.berthingPaid === 'boolean', 'state.portCall.berthingPaid must be boolean');
  if (portCall.berthingDueCr === 0) add(errors, portCall.berthingPaid === true, 'zero-cost berthing must be marked paid');
}

function validateState(document, errors) {
  const state = document.state;
  add(errors, isPlainObject(state), 'state must be an object');
  if (!isPlainObject(state)) return;
  validateExactKeys(state, [
    'operationalStatus', 'currentFuelTons', 'fuelQuality', 'cargoUsedTons',
    'cargoManifest', 'passengerManifest', 'finances', 'portCall', 'maintenance'
  ], 'state', errors);
  add(errors, typeof state.operationalStatus === 'string' && state.operationalStatus.length > 0, 'state.operationalStatus must be nonblank');
  add(errors, state.currentFuelTons === null || finiteAtLeast(state.currentFuelTons, 0), 'state.currentFuelTons must be null or a non-negative number');
  if (Number.isFinite(state.currentFuelTons)) {
    add(errors, state.currentFuelTons <= document.specifications.fuel.capacityTons, 'state.currentFuelTons exceeds fuel capacity');
  }
  add(errors, ['unknown', 'refined', 'unrefined', 'mixed'].includes(state.fuelQuality), 'state.fuelQuality must be unknown, refined, unrefined, or mixed');
  if (state.currentFuelTons === null || state.currentFuelTons === 0) {
    add(errors, state.fuelQuality === 'unknown', 'unrecorded or empty fuel state must have unknown fuel quality');
  }
  add(errors, finiteAtLeast(state.cargoUsedTons, 0), 'state.cargoUsedTons must be a non-negative number');
  if (Number.isFinite(state.cargoUsedTons)) {
    add(errors, state.cargoUsedTons <= document.specifications.cargo.capacityTons, 'state.cargoUsedTons exceeds cargo capacity');
  }
  validateCargoManifest(document, errors);
  validatePassengerManifest(document, errors);
  validateShipFinances(document, errors);
  validatePortCall(document, errors);
  add(errors, isPlainObject(state.maintenance), 'state.maintenance must be an object');
  if (isPlainObject(state.maintenance)) {
    validateExactKeys(state.maintenance, ['status', 'lastOverhaulDate', 'monthsPastDue'], 'state.maintenance', errors);
    add(errors, typeof state.maintenance.status === 'string' && state.maintenance.status.length > 0, 'state.maintenance.status must be nonblank');
    add(errors, state.maintenance.lastOverhaulDate === null || typeof state.maintenance.lastOverhaulDate === 'string', 'lastOverhaulDate must be null or a string');
    add(errors, state.maintenance.monthsPastDue === null || integerAtLeast(state.maintenance.monthsPastDue, 0), 'monthsPastDue must be null or a non-negative integer');
  }
}

export function validateShipDocument(document) {
  const errors = [];
  try {
    assertJsonSafe(document);
  } catch (error) {
    if (error instanceof ShipDocumentValidationError) return { valid: false, errors: [...error.errors] };
    throw error;
  }

  add(errors, isPlainObject(document), 'ship document must be an object');
  if (!isPlainObject(document)) return { valid: false, errors };
  for (const key of Object.keys(document)) add(errors, TOP_LEVEL_KEYS.has(key), `unknown top-level field: ${key}`);
  for (const key of TOP_LEVEL_KEYS) add(errors, Object.hasOwn(document, key), `missing top-level field: ${key}`);

  add(errors, document.documentType === SHIP_DOCUMENT_TYPE, `documentType must be ${SHIP_DOCUMENT_TYPE}`);
  add(errors, document.schemaVersion === CURRENT_SHIP_DOCUMENT_SCHEMA_VERSION, `schemaVersion must be ${CURRENT_SHIP_DOCUMENT_SCHEMA_VERSION}`);
  validateIdentity(document, errors);

  add(errors, isPlainObject(document.design), 'design must be an object');
  let design = null;
  if (isPlainObject(document.design)) {
    validateExactKeys(document.design, ['key', 'typeCode', 'name'], 'design', errors);
    try {
      design = getStandardShipDesign(document.design.key);
      add(errors, document.design.typeCode === design.typeCode, 'design.typeCode does not match canonical design');
      add(errors, document.design.name === design.name, 'design.name does not match canonical design');
    } catch (error) {
      errors.push(error.message);
    }
  }
  if (design) validateSpecifications(document, design, errors);
  validateAuthority(document.authority, errors);
  validateCrew(document, errors);
  if (isPlainObject(document.authority) && Array.isArray(document.crew?.assignments)) {
    add(errors, document.crew.assignments.some((entry) => entry?.characterId === document.authority.assignedCharacterId), 'assigned character must appear in crew assignments');
  }
  validateState(document, errors);
  add(errors, typeof document.notes === 'string', 'notes must be a string');
  add(errors, isPlainObject(document.provenance), 'provenance must be an object');
  if (isPlainObject(document.provenance)) {
    validateExactKeys(document.provenance, ['source', 'sourceDesign', 'sourceReferences'], 'provenance', errors);
    add(errors, document.provenance.source === 'classic-traveller-book-2-standard-design', 'provenance.source is invalid');
    add(errors, document.provenance.sourceDesign === document.design?.key, 'provenance.sourceDesign must match design.key');
    add(errors, Array.isArray(document.provenance.sourceReferences), 'provenance.sourceReferences must be an array');
  }

  return { valid: errors.length === 0, errors };
}

export function assertValidShipDocument(document) {
  const result = validateShipDocument(document);
  if (!result.valid) throw new ShipDocumentValidationError(result.errors);
  return document;
}

export function exportShipDocument(document, { space = 2 } = {}) {
  assertValidShipDocument(document);
  return JSON.stringify(document, null, space);
}

export function migrateShipDocument(input) {
  if (!isPlainObject(input)) throw new ShipDocumentValidationError('ship document must be an object');
  const version = input.schemaVersion;
  if (!SUPPORTED_SHIP_DOCUMENT_SCHEMA_VERSIONS.includes(version)) {
    throw new ShipDocumentValidationError(`unsupported schemaVersion: ${version}`);
  }
  if (version === CURRENT_SHIP_DOCUMENT_SCHEMA_VERSION) {
    assertValidShipDocument(input);
    return cloneJson(input);
  }

  const next = cloneJson(input);
  if (version === 1) {
    const legacyCargoUsed = Number.isFinite(next.state?.cargoUsedTons) ? next.state.cargoUsedTons : 0;
    next.schemaVersion = 2;
    next.state = {
      operationalStatus: next.state?.operationalStatus ?? 'available',
      currentFuelTons: Number.isFinite(next.state?.currentFuelTons) ? next.state.currentFuelTons : null,
      fuelQuality: 'unknown',
      cargoUsedTons: legacyCargoUsed,
      cargoManifest: legacyCargoUsed > 0 ? [{
        id: `${next.identity?.id ?? 'ship'}:legacy-cargo`,
        category: 'legacy',
        description: 'Legacy recorded cargo',
        tons: legacyCargoUsed,
        originSystemId: null,
        destinationSystemId: null,
        acquisitionCostCr: 0,
        notes: 'Migrated from ship document schema v1, which stored only cargoUsedTons.'
      }] : [],
      finances: {
        balanceCr: 0,
        ledger: []
      },
      portCall: null,
      maintenance: {
        status: next.state?.maintenance?.status ?? 'unknown',
        lastOverhaulDate: next.state?.maintenance?.lastOverhaulDate ?? null,
        monthsPastDue: next.state?.maintenance?.monthsPastDue ?? null
      }
    };
  }

  if (next.schemaVersion === 2) {
    next.schemaVersion = 3;
    next.state.passengerManifest = [];
  }

  if (next.schemaVersion === CURRENT_SHIP_DOCUMENT_SCHEMA_VERSION) {
    assertValidShipDocument(next);
    return next;
  }

  throw new ShipDocumentValidationError(`no migration path for schemaVersion: ${version}`);
}

export function importShipDocument(input) {
  let parsed = input;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch (error) {
      throw new ShipDocumentValidationError(`invalid JSON: ${error.message}`);
    }
  }
  return migrateShipDocument(parsed);
}

export function updateShipIdentity(document, { name = document.identity?.name, registry = document.identity?.registry } = {}) {
  assertValidShipDocument(document);
  if (typeof name !== 'string' || typeof registry !== 'string') throw new TypeError('ship name and registry must be strings');
  const next = cloneJson(document);
  next.identity.name = name;
  next.identity.registry = registry;
  assertValidShipDocument(next);
  return next;
}

export function updateShipAssignedCharacterName(document, characterName) {
  assertValidShipDocument(document);
  if (typeof characterName !== 'string') throw new TypeError('characterName must be a string');
  const next = cloneJson(document);
  next.authority.assignedCharacterName = characterName;
  for (const assignment of next.crew.assignments) {
    if (assignment.characterId === next.authority.assignedCharacterId) assignment.characterName = characterName;
  }
  assertValidShipDocument(next);
  return next;
}

export function createTypeSScoutReserveShipForCharacter(characterDocument, {
  id,
  name = '',
  registry = '',
  notes = ''
} = {}) {
  assertValidCharacterDocument(characterDocument);
  if (characterDocument.career.service !== 'scouts') {
    throw new ShipDocumentValidationError('Scout Ship benefit assignment requires a Scout career document');
  }
  if ((characterDocument.skills.Pilot ?? 0) < 1) {
    throw new ShipDocumentValidationError('Scout Ship reserve assignee must have Pilot-1 or better');
  }
  const entitlement = characterDocument.benefits.shipEntitlements.find((entry) => entry.name === 'Scout Ship');
  if (!entitlement || entitlement.effectiveCount !== 1 || entitlement.disposition !== 'reserve-assignment-available') {
    throw new ShipDocumentValidationError('character does not have an available Scout Ship reserve assignment');
  }
  if (characterDocument.shipRefs.some((entry) => entry.relationship === 'reserve-assignee')) {
    throw new ShipDocumentValidationError('character already has a reserve-assigned ship reference');
  }

  const shipId = id ?? stableDocumentId('ship', `${characterDocument.identity.id}:${TYPE_S_SCOUT_COURIER_KEY}:1`);
  const characterName = characterDocument.identity.name;
  const ship = createShipDocument({
    designKey: TYPE_S_SCOUT_COURIER_KEY,
    id: shipId,
    name,
    registry,
    authority: {
      assignmentType: 'reserve',
      controllingAuthority: 'Scout Service',
      legalTitleHolder: null,
      legalTitleSourceStatus: 'not-explicitly-stated-in-book-1',
      characterOwnsShip: false,
      assignedCharacterId: characterDocument.identity.id,
      assignedCharacterName: characterName,
      recallable: true,
      saleAllowed: false,
      useAsDesired: true,
      possessionAtServicePleasure: true,
      servicePrivileges: {
        freeFuelAtScoutBases: true,
        freeMaintenanceAtScoutBasesAtClassBStarports: true
      },
      operatorResponsibilities: {
        upkeep: true,
        crewCosts: true
      }
    },
    crewAssignments: [{
      role: 'pilot',
      characterId: characterDocument.identity.id,
      characterName
    }],
    notes
  });

  const linkedCharacter = linkCharacterToShip(characterDocument, {
    shipId,
    relationship: 'reserve-assignee',
    shipType: 'S',
    shipName: name
  });
  return { character: linkedCharacter, ship };
}

export { TYPE_S_SCOUT_COURIER };

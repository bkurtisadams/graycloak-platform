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
export const CURRENT_SHIP_DOCUMENT_SCHEMA_VERSION = 1;
export const SUPPORTED_SHIP_DOCUMENT_SCHEMA_VERSIONS = Object.freeze([1]);

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
      cargoUsedTons: state.cargoUsedTons ?? null,
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

function validateState(document, errors) {
  const state = document.state;
  add(errors, isPlainObject(state), 'state must be an object');
  if (!isPlainObject(state)) return;
  validateExactKeys(state, ['operationalStatus', 'currentFuelTons', 'cargoUsedTons', 'maintenance'], 'state', errors);
  add(errors, typeof state.operationalStatus === 'string' && state.operationalStatus.length > 0, 'state.operationalStatus must be nonblank');
  add(errors, state.currentFuelTons === null || finiteAtLeast(state.currentFuelTons, 0), 'state.currentFuelTons must be null or a non-negative number');
  if (Number.isFinite(state.currentFuelTons)) {
    add(errors, state.currentFuelTons <= document.specifications.fuel.capacityTons, 'state.currentFuelTons exceeds fuel capacity');
  }
  add(errors, state.cargoUsedTons === null || finiteAtLeast(state.cargoUsedTons, 0), 'state.cargoUsedTons must be null or a non-negative number');
  if (Number.isFinite(state.cargoUsedTons)) {
    add(errors, state.cargoUsedTons <= document.specifications.cargo.capacityTons, 'state.cargoUsedTons exceeds cargo capacity');
  }
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

export function importShipDocument(input) {
  let parsed = input;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch (error) {
      throw new ShipDocumentValidationError(`invalid JSON: ${error.message}`);
    }
  }
  assertValidShipDocument(parsed);
  return cloneJson(parsed);
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

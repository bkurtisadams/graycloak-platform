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
import { TURRET_MOUNTS, TURRET_WEAPONS, COMPUTER_PROGRAMS, COMPUTER_MODELS } from './components.js';
import { deliveredSoftwarePackage, GENERATE_DELIVERED_DESIGNS } from './software.js';
import { emptyDamageState, applyHitToDamage, selectTurretHit, rollHitLocation, releaseFuelFromHit, MISSILE_HIT_LOCATION_DM } from './damage.js';

export const SHIP_DOCUMENT_TYPE = 'classic-traveller-ship';
export const CURRENT_SHIP_DOCUMENT_SCHEMA_VERSION = 11;
export const SUPPORTED_SHIP_DOCUMENT_SCHEMA_VERSIONS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

// v7: the drive sections a malfunction can stop (1982 drive failure).
export const MALFUNCTION_DRIVES = Object.freeze(['powerPlant', 'maneuverDrive', 'jumpDrive']);

// v8: arrival (Book 2 pp.2-3, 8, 15). Where a port call is berthed, the
// calls a repossession throw looks back over, private messages carried, and
// a ship held against its arrears.
export const PORT_CALL_BERTHS = Object.freeze(['surface', 'orbit']);
export const PORT_CALL_HISTORY_LIMIT = 24;
export const IMPOUND_FORMS = Object.freeze(['papers', 'injunction', 'boarding']);
const GAME_DATE_PATTERN = /^\d{1,3}-\d{1,5}$/;

const TOP_LEVEL_KEYS = new Set([
  'documentType', 'schemaVersion', 'identity', 'design', 'specifications',
  'authority', 'crew', 'state', 'notes', 'provenance', 'refit'
]);

// v11 (rules 0.72.0): a shipyard refit. The specifications still have to be
// the canonical design — with the refit laid over it, and nothing else. A
// turret fitted into an empty hardpoint (Book 2 p.15) takes its ton of fire
// control from the hold, so the refit also lowers the cargo capacity; a
// stored copy that disagrees with design-plus-refit is still rejected.
export const REFIT_FIRE_CONTROL_TONS = 1;

// v0.73.0: a computer retrofitted in place of the design's (Book 2 p.15:
// "larger or smaller computer models may be installed or retrofitted to a
// starship, regardless of the model originally called for"). The difference
// in its tonnage comes out of the hold, or goes back to it.
//
// v0.74.0 (Kurt, Sep 2026): The Traveller Book (1982) p.57 adopted as a floor:
// "the model number indicates the highest level of jump possible for a ship",
// a bis model counting one higher. As a floor, not a ceiling: the 1977
// designs keep their own figures (the Type S is a Model/1 that makes jump-2),
// and a refit supports the higher of the design's figure and the model's.
export function computerJumpLimit(model) {
  const match = /^(\d)(bis)?$/.exec(String(model));
  if (!match) throw new RangeError(`unknown computer model: ${model}`);
  return Math.min(6, Number(match[1]) + (match[2] ? 1 : 0));
}

export function refitComputerSpecification(designComputer, model) {
  const entry = COMPUTER_MODELS[model];
  if (!entry) throw new RangeError(`unknown computer model: ${model}`);
  return {
    model: entry.model, tons: entry.tons, cpu: entry.cpu, storage: entry.storage,
    maximumSupportedJump: Math.max(designComputer.maximumSupportedJump, computerJumpLimit(entry.model))
  };
}

export function applyRefit(specifications, refit) {
  const next = cloneJson(specifications);
  if (refit?.computer) {
    const computer = refitComputerSpecification(next.computer, refit.computer.model);
    next.cargo.capacityTons -= computer.tons - next.computer.tons;
    next.computer = computer;
  }
  for (const turret of refit?.turrets ?? []) {
    next.armament.turrets.push({ id: turret.id, mount: turret.mount, fireControlInstalled: true, fireControlTons: REFIT_FIRE_CONTROL_TONS, weapons: [] });
    next.cargo.capacityTons -= REFIT_FIRE_CONTROL_TONS;
  }
  return next;
}

function emptyRefit() {
  return { turrets: [], computer: null };
}

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

// A stored document's specifications must match the canonical design exactly,
// which means a correction to a design record would otherwise stop every saved
// ship from loading — as Book 2 p.18's CR 32,490,000 replacing a facsimile
// figure did. The economics and computer blocks are refreshed: price, build
// time, maintenance and the installed computer model are reference data the
// rules package maintains from the printed designs, whereas hull, drives,
// accommodations, armament and the rest define the vessel and a stored copy
// that disagrees with the design is still rejected as tampering.
//
// The computer joined this list when the Type S was corrected from Model/1 bis
// to Book 2 p.19's Model/1 (CPU 2, storage 4 — see standard-designs.js). Every
// ship saved before that correction carries the old block, and the alternative
// to refreshing it is a schema migration that would have to know every past
// value of a field the design already defines.
function refreshSpecificationsFromDesign(document) {
  const design = getStandardShipDesign(document?.design?.key);
  if (!design || !isPlainObject(document.specifications)) return document;
  document.specifications.economics = cloneJson(design.economics);
  document.specifications.computer = document.refit?.computer
    ? refitComputerSpecification(design.computer, document.refit.computer.model)
    : cloneJson(design.computer);
  renameLegacyFuelAllowanceKey(document.specifications.fuel);
  return document;
}

// The power plant allowance was stored as `powerPlantFuelTonsForFourWeeks`
// while the four-week reading was in force. Book 2 p.6 charges 10Pn per trip,
// so the field was renamed rather than left holding a per-trip value under a
// four-week name. The tonnage itself never changed, and fuel tankage defines
// the vessel, so this is a key rename in migration rather than a blanket
// refresh of the fuel block from the design.
// v8 added three fields to parts of the document a caller may still build by
// hand in the v7 shape — a port call of four fields, a passenger without an
// endurance, a state without the arrival lists. They are purely additive and
// have safe defaults, so creation and import fill them in rather than
// rejecting the document; validation itself stays strict.
function fillArrivalDefaults(document) {
  // v0.73.0: refit.computer joined v11 after the first refits were saved.
  if (isPlainObject(document?.refit) && !Object.hasOwn(document.refit, 'computer')) document.refit.computer = null;
  const state = document?.state;
  if (!isPlainObject(state)) return document;
  const streamlined = Boolean(document.specifications?.hull?.streamlined);
  if (isPlainObject(state.portCall)) {
    if (!Object.hasOwn(state.portCall, 'berth')) state.portCall.berth = streamlined ? 'surface' : 'orbit';
    if (!Object.hasOwn(state.portCall, 'brokerTipDM')) state.portCall.brokerTipDM = 0;
  }
  for (const entry of Array.isArray(state.passengerManifest) ? state.passengerManifest : []) {
    if (isPlainObject(entry) && !Object.hasOwn(entry, 'endurance')) entry.endurance = null;
  }
  if (!Object.hasOwn(state, 'portCallHistory')) state.portCallHistory = [];
  if (!Object.hasOwn(state, 'privateMessages')) state.privateMessages = [];
  if (!Object.hasOwn(state, 'impound')) state.impound = null;
  if (isPlainObject(state.finances?.mortgage) && !Object.hasOwn(state.finances.mortgage, 'homeSystemId')) state.finances.mortgage.homeSystemId = null;
  if (isPlainObject(state.finances?.mortgage) && !Object.hasOwn(state.finances.mortgage, 'subsidized')) state.finances.mortgage.subsidized = false;
  return document;
}

function renameLegacyFuelAllowanceKey(fuel) {
  if (!isPlainObject(fuel)) return;
  if (!('powerPlantFuelTonsForFourWeeks' in fuel)) return;
  if (!('powerPlantFuelTonsPerTrip' in fuel)) {
    fuel.powerPlantFuelTonsPerTrip = fuel.powerPlantFuelTonsForFourWeeks;
  }
  delete fuel.powerPlantFuelTonsForFourWeeks;
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
      portCallHistory: cloneJson(state.portCallHistory ?? []),
      privateMessages: cloneJson(state.privateMessages ?? []),
      impound: state.impound ? cloneJson(state.impound) : null,
      finances: {
        balanceCr: state.finances?.balanceCr ?? 0,
        ledger: cloneJson(state.finances?.ledger ?? []),
        // v6: null for a ship owned outright; financeShip() sets the rest.
        mortgage: state.finances?.mortgage ? cloneJson(state.finances.mortgage) : null
      },
      portCall: state.portCall ? cloneJson(state.portCall) : null,
      armament: {
        turrets: cloneJson(state.armament?.turrets ?? []),
        missiles: state.armament?.missiles ?? 0,
        sandCanisters: state.armament?.sandCanisters ?? 0
      },
      damage: state.damage ? cloneJson(state.damage) : emptyDamageState(),
      // v7: the programs carried aboard (Book 2 p.24 lists them on the data
      // card), delivered as the basic software package; and a drive
      // malfunction, null while every drive runs.
      computer: {
        programs: cloneJson(state.computer?.programs ?? deliveredSoftwarePackage(design.key, design.drives.jump.rating))
      },
      malfunction: state.malfunction ? cloneJson(state.malfunction) : null,
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
    },
    refit: emptyRefit()
  };

  fillArrivalDefaults(document);
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
  const refit = document.refit;
  add(errors, isPlainObject(refit), 'refit must be an object');
  if (!isPlainObject(refit)) return;
  validateExactKeys(refit, ['turrets', 'computer'], 'refit', errors);
  if (refit.computer !== null) {
    add(errors, isPlainObject(refit.computer), 'refit.computer must be an object or null');
    if (isPlainObject(refit.computer)) {
      validateExactKeys(refit.computer, ['model', 'fittedOn'], 'refit.computer', errors);
      add(errors, Boolean(COMPUTER_MODELS[refit.computer.model]), 'refit.computer.model must be a Book 2 computer model');
      add(errors, refit.computer.fittedOn === null || (typeof refit.computer.fittedOn === 'string' && GAME_DATE_PATTERN.test(refit.computer.fittedOn)), 'refit.computer.fittedOn must be a game date or null');
      if (COMPUTER_MODELS[refit.computer.model]) add(errors, design.cargo.capacityTons - (COMPUTER_MODELS[refit.computer.model].tons - design.computer.tons) - (refit.turrets?.length ?? 0) >= 0, 'refit leaves the hold below zero tons');
    }
  }
  add(errors, Array.isArray(refit.turrets), 'refit.turrets must be an array');
  if (!Array.isArray(refit.turrets)) return;
  const designIds = design.armament.turrets.map((turret) => turret.id);
  for (const [index, turret] of refit.turrets.entries()) {
    const path = `refit.turrets[${index}]`;
    add(errors, isPlainObject(turret), `${path} must be an object`);
    if (!isPlainObject(turret)) continue;
    validateExactKeys(turret, ['id', 'mount', 'fittedOn'], path, errors);
    add(errors, typeof turret.id === 'string' && turret.id.trim().length > 0 && !designIds.includes(turret.id), `${path}.id must be a new turret id`);
    add(errors, Boolean(TURRET_MOUNTS[turret.mount]), `${path}.mount must be single, double or triple`);
    add(errors, turret.fittedOn === null || (typeof turret.fittedOn === 'string' && GAME_DATE_PATTERN.test(turret.fittedOn)), `${path}.fittedOn must be a game date or null`);
  }
  const ids = refit.turrets.map((turret) => turret?.id);
  add(errors, new Set(ids).size === ids.length, 'refit.turrets repeats a turret id');
  add(errors, design.armament.turrets.length + refit.turrets.length <= design.armament.hardpoints, 'refit fits more turrets than the hull has hardpoints (Book 2 p.15)');
  let expected;
  try { expected = applyRefit(specsFromDesign(design), refit); } catch { return; }
  add(errors, jsonEqual(specs, expected), 'specifications must match the canonical standard design and its refit');
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
      'id', 'class', 'originSystemId', 'destinationSystemId', 'fareCr', 'endurance'
    ], 'state.passengerManifest entry', errors);
    // v8: a low passenger's endurance for the revival throw (Book 2 p.2);
    // null where it was never recorded, and always null in a stateroom.
    add(errors, entry.endurance === null || (Number.isInteger(entry.endurance) && entry.endurance >= 1 && entry.endurance <= 15), 'passenger endurance must be null or an integer from 1 to 15');
    if (entry.class !== 'low') add(errors, entry.endurance === null, 'only a low passenger records endurance');
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
  validateExactKeys(finances, ['balanceCr', 'ledger', 'mortgage'], 'state.finances', errors);
  add(errors, integerAtLeast(finances.balanceCr, 0), 'state.finances.balanceCr must be a non-negative integer');
  add(errors, finances.mortgage === null || isPlainObject(finances.mortgage), 'state.finances.mortgage must be null or an object');
  if (isPlainObject(finances.mortgage)) {
    const mortgage = finances.mortgage;
    validateExactKeys(mortgage, ['cashPriceCr', 'monthlyPaymentCr', 'termMonths', 'startedOn', 'homeSystemId', 'subsidized'], 'state.finances.mortgage', errors);
    add(errors, typeof mortgage.subsidized === 'boolean', 'mortgage.subsidized must be boolean');
    add(errors, mortgage.homeSystemId === null || (typeof mortgage.homeSystemId === 'string' && mortgage.homeSystemId.trim().length > 0), 'mortgage.homeSystemId must be null or a nonblank string');
    add(errors, integerAtLeast(mortgage.cashPriceCr, 1), 'mortgage.cashPriceCr must be a positive integer');
    add(errors, integerAtLeast(mortgage.monthlyPaymentCr, 1), 'mortgage.monthlyPaymentCr must be a positive integer');
    add(errors, integerAtLeast(mortgage.termMonths, 1), 'mortgage.termMonths must be a positive integer');
    add(errors, typeof mortgage.startedOn === 'string' && /^\d{1,3}-\d{1,5}$/.test(mortgage.startedOn), 'mortgage.startedOn must be a DDD-YYYY date');
  }
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
  validateExactKeys(portCall, ['systemId', 'arrivalDate', 'berthingDueCr', 'berthingPaid', 'berth', 'brokerTipDM'], 'state.portCall', errors);
  add(errors, PORT_CALL_BERTHS.includes(portCall.berth), `state.portCall.berth must be ${PORT_CALL_BERTHS.join(' or ')}`);
  add(errors, integerAtLeast(portCall.brokerTipDM, 0), 'state.portCall.brokerTipDM must be a non-negative integer');
  add(errors, typeof portCall.systemId === 'string' && portCall.systemId.trim().length > 0, 'state.portCall.systemId must be nonblank');
  add(errors, portCall.arrivalDate === null || typeof portCall.arrivalDate === 'string', 'state.portCall.arrivalDate must be null or a string');
  add(errors, integerAtLeast(portCall.berthingDueCr, 0), 'state.portCall.berthingDueCr must be a non-negative integer');
  add(errors, typeof portCall.berthingPaid === 'boolean', 'state.portCall.berthingPaid must be boolean');
  if (portCall.berthingDueCr === 0) add(errors, portCall.berthingPaid === true, 'zero-cost berthing must be marked paid');
}

function validateArrivalState(document, errors) {
  const state = document.state;
  add(errors, Array.isArray(state.portCallHistory), 'state.portCallHistory must be an array');
  if (Array.isArray(state.portCallHistory)) {
    add(errors, state.portCallHistory.length <= PORT_CALL_HISTORY_LIMIT, `state.portCallHistory keeps at most ${PORT_CALL_HISTORY_LIMIT} calls`);
    for (const entry of state.portCallHistory) {
      add(errors, isPlainObject(entry), 'port call history entry must be an object');
      if (!isPlainObject(entry)) continue;
      validateExactKeys(entry, ['systemId', 'arrivalDate'], 'state.portCallHistory entry', errors);
      add(errors, typeof entry.systemId === 'string' && entry.systemId.trim().length > 0, 'port call history systemId must be nonblank');
      add(errors, typeof entry.arrivalDate === 'string' && GAME_DATE_PATTERN.test(entry.arrivalDate), 'port call history arrivalDate must be a DDD-YYYY date');
    }
  }
  add(errors, Array.isArray(state.privateMessages), 'state.privateMessages must be an array');
  if (Array.isArray(state.privateMessages)) {
    const ids = new Set();
    for (const entry of state.privateMessages) {
      add(errors, isPlainObject(entry), 'private message must be an object');
      if (!isPlainObject(entry)) continue;
      validateExactKeys(entry, ['id', 'carrierId', 'carrierName', 'originSystemId', 'destinationSystemId', 'recipient', 'honorariumCr', 'acceptedOn'], 'state.privateMessages entry', errors);
      add(errors, typeof entry.id === 'string' && entry.id.trim().length > 0 && !ids.has(entry.id), 'private message id must be nonblank and unique');
      ids.add(entry.id);
      for (const key of ['carrierId', 'originSystemId', 'destinationSystemId', 'recipient']) {
        add(errors, typeof entry[key] === 'string' && entry[key].trim().length > 0, `private message ${key} must be nonblank`);
      }
      add(errors, typeof entry.carrierName === 'string', 'private message carrierName must be a string');
      add(errors, integerAtLeast(entry.honorariumCr, 0), 'private message honorariumCr must be a non-negative integer');
      add(errors, typeof entry.acceptedOn === 'string' && GAME_DATE_PATTERN.test(entry.acceptedOn), 'private message acceptedOn must be a DDD-YYYY date');
    }
  }
  add(errors, state.impound === null || isPlainObject(state.impound), 'state.impound must be null or an object');
  if (isPlainObject(state.impound)) {
    validateExactKeys(state.impound, ['systemId', 'since', 'form', 'arrearsCr'], 'state.impound', errors);
    add(errors, typeof state.impound.systemId === 'string' && state.impound.systemId.trim().length > 0, 'state.impound.systemId must be nonblank');
    add(errors, typeof state.impound.since === 'string' && GAME_DATE_PATTERN.test(state.impound.since), 'state.impound.since must be a DDD-YYYY date');
    add(errors, IMPOUND_FORMS.includes(state.impound.form), `state.impound.form must be ${IMPOUND_FORMS.join(', ')}`);
    add(errors, integerAtLeast(state.impound.arrearsCr, 0), 'state.impound.arrearsCr must be a non-negative integer');
  }
}

// Book 2 p.16: "Weapons are never included in ship plans and specifications,
// and must be acquired and installed after delivery." So fitted weaponry is
// state, not specification — which is also what keeps the canonical-design
// comparison working on an armed ship.
function validateArmamentState(document, errors) {
  const armament = document.state.armament;
  add(errors, isPlainObject(armament), 'state.armament must be an object');
  if (!isPlainObject(armament)) return;
  validateExactKeys(armament, ['turrets', 'missiles', 'sandCanisters'], 'state.armament', errors);
  add(errors, integerAtLeast(armament.missiles, 0), 'state.armament.missiles must be a non-negative integer');
  add(errors, integerAtLeast(armament.sandCanisters, 0), 'state.armament.sandCanisters must be a non-negative integer');
  add(errors, Array.isArray(armament.turrets), 'state.armament.turrets must be an array');
  if (!Array.isArray(armament.turrets)) return;

  const fitted = document.specifications.armament.turrets;
  for (const [index, entry] of armament.turrets.entries()) {
    const path = `state.armament.turrets[${index}]`;
    add(errors, isPlainObject(entry), `${path} must be an object`);
    if (!isPlainObject(entry)) continue;
    validateExactKeys(entry, ['id', 'weapons'], path, errors);
    const turret = fitted.find((candidate) => candidate.id === entry.id);
    add(errors, Boolean(turret), `${path}.id does not name a turret on this ship`);
    add(errors, Array.isArray(entry.weapons), `${path}.weapons must be an array`);
    if (!turret || !Array.isArray(entry.weapons)) continue;
    // Book 2 p.15: a turret contains one, two or three weapons by mount.
    const capacity = TURRET_MOUNTS[turret.mount]?.weapons ?? 0;
    add(errors, entry.weapons.length <= capacity, `${path} holds more weapons than a ${turret.mount} turret mounts`);
    for (const [slot, weapon] of entry.weapons.entries()) {
      add(errors, typeof weapon === 'string' && weapon in TURRET_WEAPONS, `${path}.weapons[${slot}] is not a Book 2 turret weapon`);
    }
  }
  const ids = armament.turrets.map((entry) => entry?.id);
  add(errors, new Set(ids).size === ids.length, 'state.armament.turrets repeats a turret id');
}

// Book 2 pp.33-34: damage reduces a drive letter, knocks out a turret,
// decompresses the hull, punctures fuel tanks and degrades the computer. It is
// state and never specification — the design says what the ship was built as,
// and the damage block says what is currently true of it.
const DAMAGE_COUNTERS = Object.freeze([
  'powerPlant', 'maneuverDrive', 'jumpDrive', 'computer', 'hull', 'hold', 'fuel'
]);

function validateDamageState(document, errors) {
  const damage = document.state.damage;
  add(errors, isPlainObject(damage), 'state.damage must be an object');
  if (!isPlainObject(damage)) return;
  validateExactKeys(damage, [...DAMAGE_COUNTERS, 'turrets'], 'state.damage', errors);
  for (const key of DAMAGE_COUNTERS) {
    add(errors, integerAtLeast(damage[key], 0), `state.damage.${key} must be a non-negative integer`);
  }
  add(errors, Array.isArray(damage.turrets), 'state.damage.turrets must be an array');
  if (!Array.isArray(damage.turrets)) return;
  const ids = document.specifications.armament.turrets.map((turret) => turret.id);
  for (const [index, id] of damage.turrets.entries()) {
    add(errors, ids.includes(id), `state.damage.turrets[${index}] does not name a turret on this ship`);
  }
  add(errors, new Set(damage.turrets).size === damage.turrets.length, 'state.damage.turrets repeats a turret id');
}

function validateState(document, errors) {
  const state = document.state;
  add(errors, isPlainObject(state), 'state must be an object');
  if (!isPlainObject(state)) return;
  validateExactKeys(state, [
    'operationalStatus', 'currentFuelTons', 'fuelQuality', 'cargoUsedTons',
    'cargoManifest', 'passengerManifest', 'finances', 'portCall', 'maintenance',
    'armament', 'damage', 'computer', 'malfunction', 'portCallHistory', 'privateMessages', 'impound'
  ], 'state', errors);
  add(errors, isPlainObject(state.computer), 'state.computer must be an object');
  if (isPlainObject(state.computer)) {
    validateExactKeys(state.computer, ['programs'], 'state.computer', errors);
    add(errors, Array.isArray(state.computer.programs), 'state.computer.programs must be an array');
    if (Array.isArray(state.computer.programs)) {
      for (const key of state.computer.programs) add(errors, Object.hasOwn(COMPUTER_PROGRAMS, key), `unknown computer program: ${key}`);
      add(errors, new Set(state.computer.programs).size === state.computer.programs.length, 'state.computer.programs repeats a program');
    }
  }
  add(errors, state.malfunction === null || isPlainObject(state.malfunction), 'state.malfunction must be null or an object');
  if (isPlainObject(state.malfunction)) {
    validateExactKeys(state.malfunction, ['failed', 'since', 'patched'], 'state.malfunction', errors);
    add(errors, Array.isArray(state.malfunction.failed) && state.malfunction.failed.every((drive) => MALFUNCTION_DRIVES.includes(drive)), 'state.malfunction.failed must list drive sections');
    add(errors, typeof state.malfunction.since === 'string' && /^\d{1,3}-\d{1,5}$/.test(state.malfunction.since), 'state.malfunction.since must be a DDD-YYYY date');
    add(errors, typeof state.malfunction.patched === 'boolean', 'state.malfunction.patched must be boolean');
  }
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
  validateArmamentState(document, errors);
  validateDamageState(document, errors);
  validateShipFinances(document, errors);
  validatePortCall(document, errors);
  validateArrivalState(document, errors);
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
    const refreshed = fillArrivalDefaults(refreshSpecificationsFromDesign(cloneJson(input)));
    assertValidShipDocument(refreshed);
    return refreshed;
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

  if (next.schemaVersion === 3) {
    next.schemaVersion = 4;
    // Every existing ship is unarmed: Book 2 delivers standard designs with
    // empty turrets, and nothing could fit a weapon before this version.
    next.state.armament = { turrets: [], missiles: 0, sandCanisters: 0 };
  }

  if (next.schemaVersion === 4) {
    next.schemaVersion = 5;
    // Nothing could damage a ship before this version, so every existing ship
    // is undamaged.
    next.state.damage = emptyDamageState();
  }

  if (next.schemaVersion === 5) {
    next.schemaVersion = 6;
    // No mortgage was ever serviced before this version, so no existing ship
    // is known to be financed; financeShip() is the way to say one is.
    next.state.finances.mortgage = null;
  }

  if (next.schemaVersion === 6) {
    next.schemaVersion = 7;
    // No ship recorded its software before this version; each is taken to
    // carry the basic package it was delivered with. No drive has failed.
    const design = getStandardShipDesign(next.design.key);
    next.state.computer = { programs: [...deliveredSoftwarePackage(design.key, design.drives.jump.rating)] };
    next.state.malfunction = null;
  }

  if (next.schemaVersion === 7) {
    next.schemaVersion = 8;
    // Nothing recorded a berth before this version; a port call is taken to
    // be where the hull allows (Book 2 p.15: only a streamlined ship lands).
    // No endurance was kept for a low passenger, so revival throws for it.
    // No call history, messages or impound existed, and no mortgage named a
    // home world.
    const design = getStandardShipDesign(next.design.key);
    for (const entry of next.state.passengerManifest ?? []) entry.endurance = null;
    if (next.state.portCall) {
      next.state.portCall.berth = design.hull.streamlined ? 'surface' : 'orbit';
      next.state.portCall.brokerTipDM = 0;
    }
    if (next.state.finances?.mortgage) next.state.finances.mortgage.homeSystemId = null;
    next.state.portCallHistory = [];
    next.state.privateMessages = [];
    next.state.impound = null;
  }

  if (next.schemaVersion === 8) {
    next.schemaVersion = 9;
    // A Type S is now delivered with Generate (software.js). One already in
    // service keeps every program it carries and gains Generate: nothing it
    // was delivered with is taken back.
    if (GENERATE_DELIVERED_DESIGNS.includes(next.design.key) && Array.isArray(next.state.computer?.programs) && !next.state.computer.programs.includes('generate')) {
      next.state.computer.programs.push('generate');
    }
  }

  if (next.schemaVersion === 9) {
    next.schemaVersion = 10;
    // Book 2 p.5 subsidies: no ship was subsidized before this version.
    if (next.state.finances?.mortgage) next.state.finances.mortgage.subsidized = false;
  }

  if (next.schemaVersion === 10) {
    next.schemaVersion = 11;
    // No ship had been refitted before this version.
    next.refit = emptyRefit();
  }

  if (next.schemaVersion === CURRENT_SHIP_DOCUMENT_SCHEMA_VERSION) {
    const refreshed = fillArrivalDefaults(refreshSpecificationsFromDesign(next));
    assertValidShipDocument(refreshed);
    return refreshed;
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

// ---------------------------------------------------------------------------
// Crew assignment. Book 2 gates high passage on a steward aboard, and Book 1
// p.19 says the position may be held by any character, expertise merely
// preferred. Nothing could write an assignment before this, so the
// requirement was enforced and unsatisfiable.
//
// Book 2 p.17: "One person may fill two crew positions, providing he has
// expertise to otherwise allow him to perform the work. However, because of the
// added burden placed upon him, he is unable to apply his expertise to the
// position (that is to say, he is not allowed expertise DMs in either
// position), and draws a salary equal to 75% of each job."
//
// Ruling (Graycloak, Sep 2026): go with RAW, superseding the earlier one
// person/one role ruling. A scout's owner-pilot may also be its steward — the
// cost is 75% of each salary and the loss of expertise DMs in both posts, which
// prices the choice rather than forbidding it. Two is the ceiling the book
// states.
// ---------------------------------------------------------------------------
export const SHIP_CREW_ROLES = Object.freeze([
  'pilot', 'navigator', 'engineer', 'steward', 'medic', 'gunner'
]);

export const MAXIMUM_ROLES_PER_CREW_MEMBER = 2;
export const DOUBLED_ROLE_SALARY_RATE = 0.75;

export function assignShipCrew(ship, { role, characterId, characterName = '' } = {}) {
  const document = importShipDocument(ship);
  const key = String(role ?? '').trim().toLowerCase();
  if (!SHIP_CREW_ROLES.includes(key)) throw new RangeError(`unknown crew role: ${role}`);
  if (typeof characterId !== 'string' || !characterId.trim()) throw new TypeError('characterId must be a nonblank string');
  const id = characterId.trim();
  const held = document.crew.assignments.filter((entry) => entry.characterId === id);
  const name = held[0]?.characterName || String(characterName ?? '').trim() || id;
  if (held.some((entry) => entry.role === key)) throw new Error(`${name} already holds the ${key} position`);
  if (held.length >= MAXIMUM_ROLES_PER_CREW_MEMBER) {
    throw new Error(`${name} already fills ${held.length} crew positions; Book 2 p.17 allows two`);
  }
  document.crew.assignments.push({ role: key, characterId: id, characterName: String(characterName ?? '').trim() });
  assertValidShipDocument(document);
  return document;
}

/**
 * Releases a character from the ship. Pass `role` to give up one position while
 * keeping the other; omit it to release the character entirely.
 */
export function releaseShipCrew(ship, characterId, { role = null } = {}) {
  const document = importShipDocument(ship);
  const id = String(characterId ?? '').trim();
  const key = role === null ? null : String(role).trim().toLowerCase();
  const before = document.crew.assignments.length;
  document.crew.assignments = document.crew.assignments.filter((entry) => {
    if (entry.characterId !== id) return true;
    return key !== null && entry.role !== key;
  });
  if (document.crew.assignments.length === before) {
    throw new Error(key === null ? 'that character is not assigned to this ship' : `that character does not hold the ${key} position`);
  }
  assertValidShipDocument(document);
  return document;
}

/**
 * Book 2 p.17. The roles a character holds aboard this ship, and whether the
 * doubled-up penalty applies. `appliesExpertise` is false for anyone filling
 * two positions: they get no expertise DM in either one.
 */
export function shipCrewMemberRoles(ship, characterId) {
  const id = String(characterId ?? '').trim();
  const roles = (ship?.crew?.assignments ?? [])
    .filter((entry) => entry.characterId === id)
    .map((entry) => String(entry.role).toLowerCase());
  return Object.freeze({
    roles: Object.freeze(roles),
    doubledUp: roles.length > 1,
    appliesExpertise: roles.length === 1
  });
}

export function shipCrewRole(ship, role) {
  const key = String(role ?? '').trim().toLowerCase();
  return (ship?.crew?.assignments ?? []).filter((entry) => String(entry.role).toLowerCase() === key);
}

/**
 * Book 2 pp.30, 34: a hit is located on the target with the hit location table
 * and marked on its data card. `kind` selects the p.34 column; missile
 * detonation passes its own -4 through `dm`.
 */
export function applyShipHit(ship, dice, { kind = 'starship', dm = 0 } = {}) {
  assertValidShipDocument(ship);
  const located = rollHitLocation(dice, { kind, dm });
  const next = cloneJson(ship);
  const turretId = located.location === 'turret' ? selectTurretHit(next, dice) : null;
  next.state.damage = applyHitToDamage(next.state.damage, located.location, { turretId });
  let fuelReleasedTons = null;
  if (located.location === 'fuel') {
    const released = releaseFuelFromHit(next.state.currentFuelTons);
    next.state.currentFuelTons = released.currentFuelTons;
    fuelReleasedTons = released.releasedTons;
    if (next.state.currentFuelTons === null || next.state.currentFuelTons === 0) next.state.fuelQuality = 'unknown';
  }
  assertValidShipDocument(next);
  return Object.freeze({ ship: next, location: located.location, turretId, fuelReleasedTons, throw: located });
}

/**
 * Book 2 p.31: each missile that survives anti-missile fire throws one die for
 * the number of hits, and each hit type is determined separately with a -4.
 */
export function applyMissileDetonation(ship, dice) {
  assertValidShipDocument(ship);
  const hitCount = dice.rollD6();
  let current = ship;
  const hits = [];
  for (let index = 0; index < hitCount; index += 1) {
    const result = applyShipHit(current, dice, { dm: MISSILE_HIT_LOCATION_DM });
    current = result.ship;
    hits.push(Object.freeze({
      location: result.location,
      turretId: result.turretId,
      ...(result.location === 'fuel' ? { fuelReleasedTons: result.fuelReleasedTons } : {})
    }));
  }
  return Object.freeze({ ship: current, hitCount, hits: Object.freeze(hits) });
}

/**
 * Book 2 p.35 damage control: a throw of 9+ repairs one hit, skill a positive
 * DM, one attempt per ten minute turn. A destroyed drive cannot be repaired,
 * which repairableLocations already excludes. Repairing a fuel hit patches the
 * tank; the fuel it released is not restored (p.33).
 */
export function repairShipDamage(ship, { location, turretId = null } = {}) {
  assertValidShipDocument(ship);
  const next = cloneJson(ship);
  const damage = next.state.damage;
  if (location === 'turret') {
    const index = damage.turrets.indexOf(turretId);
    if (index < 0) throw new RangeError(`turret ${turretId} is not disabled`);
    damage.turrets.splice(index, 1);
  } else {
    const key = {
      'power-plant': 'powerPlant',
      'maneuver-drive': 'maneuverDrive',
      'jump-drive': 'jumpDrive',
      computer: 'computer',
      hull: 'hull',
      hold: 'hold',
      fuel: 'fuel'
    }[location];
    if (!key) throw new RangeError(`unknown damage location: ${location}`);
    if (!damage[key]) throw new RangeError(`no ${location} damage to repair`);
    damage[key] -= 1;
  }
  assertValidShipDocument(next);
  return next;
}

/**
 * Restores a ship to undamaged, as an overhaul or a referee's fiat.
 */
export function clearShipDamage(ship) {
  assertValidShipDocument(ship);
  const next = cloneJson(ship);
  next.state.damage = emptyDamageState();
  assertValidShipDocument(next);
  return next;
}

export { TYPE_S_SCOUT_COURIER };

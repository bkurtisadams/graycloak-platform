import { CHARACTERISTIC_KEYS, formatUPP } from './upp.js';
import { CHARGEN_PHASES } from './chargen.js';
import { assertValidCharacter } from './serialization.js';
import { SERVICE_KEYS, getService } from '../careers/services.js';
import { stableDocumentId } from '../documents/ids.js';
import { PERSONAL_ARMOR_TYPES, PERSONAL_WEAPONS, getPersonalWeapon } from '../combat/personal-combat.js';
import { assessLoad, inventoryLoadGrams, personalWeaponCarriedWeightGrams, personalWeaponWeight } from './load.js';

export const CHARACTER_DOCUMENT_TYPE = 'classic-traveller-character';
export const CURRENT_CHARACTER_DOCUMENT_SCHEMA_VERSION = 5;
export const SUPPORTED_CHARACTER_DOCUMENT_SCHEMA_VERSIONS = Object.freeze([1, 2, 3, 4, 5]);

// v5 (Graycloak, Sep 2026): the personnel-record fields TAS Form 2 asks for
// that nothing in generation produces — a noble title, where they were born,
// which branch they served in, what they were decorated for, and the psionics
// block. All free text but for the psionic strength rating and two flags, and
// all of it the player's to write: none of it is earned under a rule, so
// nothing here is derived or checked.
export const CHARACTER_RECORD_TEXT_FIELDS = Object.freeze([
  'nobleTitle', 'birthworld', 'birthdate', 'branch', 'dischargeworld',
  'specialAssignments', 'awards', 'equipmentQualifiedOn',
  'preferredPistol', 'preferredBlade',
  'psionicTestDate', 'psionicTrainingCompleted', 'psionicTalents'
]);

export function emptyCharacterRecord() {
  const record = Object.fromEntries(CHARACTER_RECORD_TEXT_FIELDS.map((key) => [key, '']));
  record.psionicStrength = null;
  record.travellersMember = false;
  return record;
}

const SERVICE_VALUES = new Set(SERVICE_KEYS);
const TOP_LEVEL_KEYS = new Set([
  'documentType', 'schemaVersion', 'identity', 'age', 'chronology',
  'characteristics', 'current', 'upp', 'status', 'career', 'skills', 'loadout', 'inventory', 'finances',
  'benefits', 'shipRefs', 'history', 'notes', 'record', 'provenance'
]);
const LEGACY_V1_TOP_LEVEL_KEYS = new Set([
  'documentType', 'schemaVersion', 'identity', 'age', 'chronology',
  'characteristics', 'upp', 'status', 'career', 'skills', 'finances',
  'benefits', 'history', 'notes', 'provenance'
]);

export class CharacterDocumentValidationError extends Error {
  constructor(errors) {
    const list = Array.isArray(errors) ? errors : [String(errors)];
    super(`invalid Classic Traveller character document: ${list.join('; ')}`);
    this.name = 'CharacterDocumentValidationError';
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

function integerAtLeast(value, minimum) {
  return Number.isInteger(value) && value >= minimum;
}

function assertJsonSafe(value, path = '$', seen = new Set()) {
  if (value === null) return;
  const type = typeof value;
  if (type === 'string' || type === 'boolean') return;
  if (type === 'number') {
    if (!Number.isFinite(value)) throw new CharacterDocumentValidationError(`${path} contains a non-finite number`);
    return;
  }
  if (type === 'undefined' || type === 'function' || type === 'symbol' || type === 'bigint') {
    throw new CharacterDocumentValidationError(`${path} contains a non-JSON value`);
  }
  if (seen.has(value)) throw new CharacterDocumentValidationError(`${path} contains a circular reference`);
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertJsonSafe(entry, `${path}[${index}]`, seen));
  } else if (isPlainObject(value)) {
    for (const [key, entry] of Object.entries(value)) assertJsonSafe(entry, `${path}.${key}`, seen);
  } else {
    throw new CharacterDocumentValidationError(`${path} contains a non-plain object`);
  }
  seen.delete(value);
}

function aggregateNamed(benefits) {
  const counts = new Map();
  for (const benefit of benefits) counts.set(benefit.name, (counts.get(benefit.name) ?? 0) + 1);
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, count]) => ({ name, count }));
}

function normalizeShipEntitlement(name, rolls) {
  if (name === 'Scout Ship') {
    return {
      name,
      rolls,
      effectiveCount: 1,
      noEffectCount: Math.max(0, rolls - 1),
      disposition: 'reserve-assignment-available'
    };
  }
  return {
    name,
    rolls,
    effectiveCount: null,
    noEffectCount: 0,
    disposition: 'unresolved'
  };
}

function defaultCharacterWeaponKey({ benefits, skills }) {
  const equipment = new Set((benefits?.equipment ?? []).map((entry) => String(entry.name).toLowerCase()));
  const weapons = Object.entries(PERSONAL_WEAPONS);
  const equipped = weapons.find(([, weapon]) => equipment.has(weapon.name.toLowerCase()));
  if (equipped) return equipped[0];
  const trained = weapons
    .map(([key, weapon]) => ({ key, level: Math.max(...weapon.skillNames.map((name) => Number(skills?.[name] ?? -1))) }))
    .filter((entry) => entry.level >= 0)
    .sort((left, right) => right.level - left.level || left.key.localeCompare(right.key));
  return trained[0]?.key ?? 'hands';
}

export function summarizeMaterialBenefits(materialBenefits = []) {
  if (!Array.isArray(materialBenefits)) throw new TypeError('materialBenefits must be an array');

  const passages = [];
  const memberships = [];
  const equipment = [];
  const ships = [];

  for (const benefit of materialBenefits) {
    if (!isPlainObject(benefit)) continue;
    if (benefit.type === 'weapon') {
      equipment.push({ name: benefit.specialization, category: benefit.category ?? 'weapon' });
      continue;
    }
    if (benefit.type !== 'material' || typeof benefit.name !== 'string') continue;
    if (/ Passage$/.test(benefit.name)) passages.push({ name: benefit.name });
    else if (benefit.name === "Travellers' Aid Society") memberships.push({ name: benefit.name });
    else if (benefit.name === 'Scout Ship' || benefit.name === 'Free Trader') ships.push({ name: benefit.name });
    else equipment.push({ name: benefit.name, category: 'material' });
  }

  const groupedEquipment = new Map();
  for (const item of equipment) {
    const key = `${item.category}\u0000${item.name}`;
    const current = groupedEquipment.get(key) ?? { name: item.name, category: item.category, count: 0 };
    current.count += 1;
    groupedEquipment.set(key, current);
  }

  return {
    raw: cloneJson(materialBenefits),
    passages: aggregateNamed(passages),
    memberships: aggregateNamed(memberships),
    equipment: [...groupedEquipment.values()].sort((a, b) => a.name.localeCompare(b.name)),
    shipEntitlements: aggregateNamed(ships).map(({ name, count }) => normalizeShipEntitlement(name, count))
  };
}

function characterDocumentSeedFromChargen(character) {
  return JSON.stringify({
    name: character.name,
    upp: character.upp,
    service: character.service,
    terms: character.terms,
    yearsServed: character.yearsServed,
    history: character.history
  });
}

function characterDocumentSeedFromLegacy(document) {
  return JSON.stringify({
    name: document.identity?.name ?? '',
    upp: document.upp,
    service: document.career?.service,
    terms: document.career?.terms,
    yearsServed: document.career?.yearsServed,
    history: document.history
  });
}

export function createCharacterDocument(character, { id, aliases = [], notes = '' } = {}) {
  assertValidCharacter(character);
  if (character.phase !== CHARGEN_PHASES.COMPLETE) {
    throw new CharacterDocumentValidationError('only a completed chargen state can become a gameplay character document');
  }
  if (!character.alive) {
    throw new CharacterDocumentValidationError('a deceased chargen state cannot become a playable character document');
  }
  if (id !== undefined && (typeof id !== 'string' || !id.trim())) throw new TypeError('id must be a nonblank string');
  if (!Array.isArray(aliases) || aliases.some((alias) => typeof alias !== 'string')) {
    throw new TypeError('aliases must be an array of strings');
  }
  if (typeof notes !== 'string') throw new TypeError('notes must be a string');

  const benefits = summarizeMaterialBenefits(character.materialBenefits);
  const document = {
    documentType: CHARACTER_DOCUMENT_TYPE,
    schemaVersion: CURRENT_CHARACTER_DOCUMENT_SCHEMA_VERSION,
    identity: {
      id: id?.trim() ?? stableDocumentId('char', characterDocumentSeedFromChargen(character)),
      name: character.name,
      aliases: [...aliases]
    },
    age: character.age,
    chronology: {
      chronologicalAgeMonths: character.chronologicalAgeMonths,
      physicalAgeMonths: character.physicalAgeMonths,
      nextAgingCheckAgeMonths: character.nextAgingCheckAgeMonths
    },
    characteristics: { ...character.characteristics },
    current: Object.fromEntries(['STR', 'DEX', 'END'].map((key) => [key, character.characteristics[key]])),
    upp: character.upp,
    status: {
      alive: character.alive,
      consciousness: 'conscious',
      retired: character.retired
    },
    career: {
      service: character.service,
      drafted: character.drafted,
      terms: character.terms,
      yearsServed: character.yearsServed,
      rank: character.rank,
      rankTitle: character.rankTitle,
      separationReason: character.separationReason
    },
    skills: { ...character.skills },
    loadout: {
      weaponKey: defaultCharacterWeaponKey({ benefits, skills: character.skills }),
      armor: 'none'
    },
    inventory: initialInventory({ benefits, weaponKey: defaultCharacterWeaponKey({ benefits, skills: character.skills }) }),
    finances: {
      credits: character.credits,
      retirementPayAnnual: character.retirementPayAnnual
    },
    benefits,
    shipRefs: [],
    history: cloneJson(character.history),
    notes,
    // v5: empty for a newly generated character too — Book 1 chargen produces
    // none of it. TAS membership is the exception and is read back from the
    // mustering-out benefits below.
    record: { ...emptyCharacterRecord(), travellersMember: (benefits.memberships ?? []).some((entry) => /travell/i.test(String(entry))) },
    provenance: {
      source: 'classic-traveller-book-1-chargen',
      chargenSchemaVersion: character.schemaVersion
    }
  };

  assertValidCharacterDocument(document);
  return document;
}

function validateIdentity(document, errors) {
  add(errors, isPlainObject(document.identity), 'identity must be an object');
  if (!isPlainObject(document.identity)) return;
  add(errors, typeof document.identity.id === 'string' && document.identity.id.trim().length > 0, 'identity.id must be a nonblank string');
  add(errors, typeof document.identity.name === 'string', 'identity.name must be a string');
  add(errors, Array.isArray(document.identity.aliases), 'identity.aliases must be an array');
  if (Array.isArray(document.identity.aliases)) {
    add(errors, document.identity.aliases.every((alias) => typeof alias === 'string'), 'identity.aliases must contain only strings');
  }
}

function validateCharacteristics(document, errors) {
  const c = document.characteristics;
  add(errors, isPlainObject(c), 'characteristics must be an object');
  if (!isPlainObject(c)) return;
  add(errors,
    Object.keys(c).length === CHARACTERISTIC_KEYS.length && CHARACTERISTIC_KEYS.every((key) => Object.hasOwn(c, key)),
    'characteristics must contain exactly STR, DEX, END, INT, EDU, and SOC'
  );
  for (const key of CHARACTERISTIC_KEYS) add(errors, integerAtLeast(c[key], 0), `${key} must be a non-negative integer`);
  try {
    add(errors, document.upp === formatUPP(c), 'upp must match characteristics');
  } catch (error) {
    errors.push(`characteristics cannot be encoded as a UPP: ${error.message}`);
  }
}

function validateCareer(document, errors) {
  const career = document.career;
  add(errors, isPlainObject(career), 'career must be an object');
  if (!isPlainObject(career)) return;
  add(errors, SERVICE_VALUES.has(career.service), 'career.service must be one of the six Classic Traveller services');
  add(errors, typeof career.drafted === 'boolean', 'career.drafted must be boolean');
  add(errors, integerAtLeast(career.terms, 0), 'career.terms must be a non-negative integer');
  add(errors, integerAtLeast(career.yearsServed, 0), 'career.yearsServed must be a non-negative integer');
  add(errors, integerAtLeast(career.rank, 0), 'career.rank must be a non-negative integer');
  add(errors, typeof career.rankTitle === 'string', 'career.rankTitle must be a string');
  add(errors, career.separationReason === null || typeof career.separationReason === 'string', 'career.separationReason must be null or a string');
  if (SERVICE_VALUES.has(career.service) && integerAtLeast(career.rank, 0)) {
    const service = getService(career.service);
    add(errors, career.rank < service.ranks.length, `career.rank ${career.rank} is invalid for ${service.name}`);
    if (career.rank < service.ranks.length) {
      add(errors, career.rankTitle === (service.ranks[career.rank] ?? ''), 'career.rankTitle does not match service and rank');
    }
  }
}

function validateSkills(document, errors) {
  add(errors, isPlainObject(document.skills), 'skills must be an object');
  if (!isPlainObject(document.skills)) return;
  for (const [name, level] of Object.entries(document.skills)) {
    add(errors, name.trim().length > 0, 'skill names must not be blank');
    add(errors, integerAtLeast(level, 0), `skill ${name} must have a non-negative integer level`);
  }
}

function validateBenefits(document, errors) {
  const benefits = document.benefits;
  add(errors, isPlainObject(benefits), 'benefits must be an object');
  if (!isPlainObject(benefits)) return;
  for (const key of ['raw', 'passages', 'memberships', 'equipment', 'shipEntitlements']) {
    add(errors, Array.isArray(benefits[key]), `benefits.${key} must be an array`);
  }

  const rawShipCounts = new Map();
  if (Array.isArray(benefits.raw)) {
    for (const benefit of benefits.raw) {
      if (!isPlainObject(benefit) || benefit.type !== 'material') continue;
      if (benefit.name !== 'Scout Ship' && benefit.name !== 'Free Trader') continue;
      rawShipCounts.set(benefit.name, (rawShipCounts.get(benefit.name) ?? 0) + 1);
    }
  }
  for (const key of ['passages', 'memberships', 'equipment']) {
    if (!Array.isArray(benefits[key])) continue;
    for (const entry of benefits[key]) {
      add(errors, isPlainObject(entry), `benefits.${key} entries must be objects`);
      if (!isPlainObject(entry)) continue;
      add(errors, typeof entry.name === 'string' && entry.name.length > 0, `benefits.${key} entry name must be nonblank`);
      add(errors, integerAtLeast(entry.count, 1), `benefits.${key} entry count must be a positive integer`);
    }
  }
  if (Array.isArray(benefits.shipEntitlements)) {
    for (const entry of benefits.shipEntitlements) {
      add(errors, isPlainObject(entry), 'benefits.shipEntitlements entries must be objects');
      if (!isPlainObject(entry)) continue;
      add(errors, typeof entry.name === 'string' && entry.name.length > 0, 'ship entitlement name must be nonblank');
      add(errors, integerAtLeast(entry.rolls, 1), 'ship entitlement rolls must be a positive integer');
      add(errors, entry.effectiveCount === null || integerAtLeast(entry.effectiveCount, 1), 'ship entitlement effectiveCount must be null or a positive integer');
      add(errors, integerAtLeast(entry.noEffectCount, 0), 'ship entitlement noEffectCount must be a non-negative integer');
      add(errors, typeof entry.disposition === 'string' && entry.disposition.length > 0, 'ship entitlement disposition must be nonblank');
      if (rawShipCounts.has(entry.name)) {
        add(errors, entry.rolls === rawShipCounts.get(entry.name), `${entry.name} entitlement rolls must match raw benefits`);
      }
      if (entry.name === 'Scout Ship') {
        add(errors, entry.effectiveCount === 1, 'Scout Ship effectiveCount must be 1');
        add(errors, entry.noEffectCount === entry.rolls - 1, 'Scout Ship additional results must have no further effect');
        add(errors, ['reserve-assignment-available', 'reserve-assignment-active'].includes(entry.disposition), 'Scout Ship disposition must describe its reserve assignment state');
      }
    }
    for (const [name] of rawShipCounts) {
      add(errors, benefits.shipEntitlements.some((entry) => entry?.name === name), `${name} raw benefit requires a ship entitlement`);
    }
  }
}

function validateShipRefs(document, errors) {
  add(errors, Array.isArray(document.shipRefs), 'shipRefs must be an array');
  if (!Array.isArray(document.shipRefs)) return;
  const seen = new Set();
  for (const ref of document.shipRefs) {
    add(errors, isPlainObject(ref), 'shipRefs entries must be objects');
    if (!isPlainObject(ref)) continue;
    add(errors, typeof ref.shipId === 'string' && ref.shipId.length > 0, 'shipRefs.shipId must be nonblank');
    add(errors, typeof ref.relationship === 'string' && ref.relationship.length > 0, 'shipRefs.relationship must be nonblank');
    add(errors, typeof ref.shipType === 'string', 'shipRefs.shipType must be a string');
    add(errors, typeof ref.shipName === 'string', 'shipRefs.shipName must be a string');
    if (typeof ref.shipId === 'string') {
      add(errors, !seen.has(ref.shipId), `duplicate ship reference: ${ref.shipId}`);
      seen.add(ref.shipId);
    }
  }
}

export function validateCharacterDocument(document) {
  const errors = [];
  try {
    assertJsonSafe(document);
  } catch (error) {
    if (error instanceof CharacterDocumentValidationError) return { valid: false, errors: [...error.errors] };
    throw error;
  }

  add(errors, isPlainObject(document), 'character document must be an object');
  if (!isPlainObject(document)) return { valid: false, errors };
  for (const key of Object.keys(document)) add(errors, TOP_LEVEL_KEYS.has(key), `unknown top-level field: ${key}`);
  for (const key of TOP_LEVEL_KEYS) add(errors, Object.hasOwn(document, key), `missing top-level field: ${key}`);

  add(errors, document.documentType === CHARACTER_DOCUMENT_TYPE, `documentType must be ${CHARACTER_DOCUMENT_TYPE}`);
  add(errors, document.schemaVersion === CURRENT_CHARACTER_DOCUMENT_SCHEMA_VERSION, `schemaVersion must be ${CURRENT_CHARACTER_DOCUMENT_SCHEMA_VERSION}`);
  validateIdentity(document, errors);
  add(errors, integerAtLeast(document.age, 18), 'age must be an integer of at least 18');

  add(errors, isPlainObject(document.chronology), 'chronology must be an object');
  if (isPlainObject(document.chronology)) {
    add(errors, integerAtLeast(document.chronology.chronologicalAgeMonths, 18 * 12), 'chronologicalAgeMonths must be at least 216');
    add(errors, integerAtLeast(document.chronology.physicalAgeMonths, 0), 'physicalAgeMonths must be a non-negative integer');
    add(errors, integerAtLeast(document.chronology.nextAgingCheckAgeMonths, 0), 'nextAgingCheckAgeMonths must be a non-negative integer');
    if (integerAtLeast(document.chronology.chronologicalAgeMonths, 18 * 12)) {
      add(errors, document.age === Math.floor(document.chronology.chronologicalAgeMonths / 12), 'age must match chronologicalAgeMonths');
    }
  }

  validateCharacteristics(document, errors);
  add(errors, isPlainObject(document.current), 'current must be an object');
  if (isPlainObject(document.current)) {
    add(errors, Object.keys(document.current).length === 3 && ['STR', 'DEX', 'END'].every((key) => Object.hasOwn(document.current, key)), 'current must contain exactly STR, DEX, and END');
    for (const key of ['STR', 'DEX', 'END']) {
      add(errors, integerAtLeast(document.current[key], 0), `current ${key} must be a non-negative integer`);
      if (integerAtLeast(document.current[key], 0) && integerAtLeast(document.characteristics?.[key], 0)) add(errors, document.current[key] <= document.characteristics[key], `current ${key} cannot exceed original ${key}`);
    }
  }
  add(errors, isPlainObject(document.status), 'status must be an object');
  if (isPlainObject(document.status)) {
    add(errors, typeof document.status.alive === 'boolean', 'status.alive must be boolean');
    add(errors, ['conscious', 'unconscious', 'not-applicable'].includes(document.status.consciousness), 'status.consciousness is invalid');
    if (document.status.alive === false) add(errors, document.status.consciousness === 'not-applicable', 'dead characters require not-applicable consciousness');
    if (document.status.alive === true) add(errors, document.status.consciousness !== 'not-applicable', 'living characters require a consciousness state');
    add(errors, typeof document.status.retired === 'boolean', 'status.retired must be boolean');
  }
  validateCareer(document, errors);
  validateSkills(document, errors);
  add(errors, isPlainObject(document.loadout), 'loadout must be an object');
  if (isPlainObject(document.loadout)) {
    try { getPersonalWeapon(document.loadout.weaponKey); } catch (error) { errors.push(error.message); }
    add(errors, PERSONAL_ARMOR_TYPES.includes(document.loadout.armor), 'loadout.armor is invalid');
  }

  add(errors, Array.isArray(document.inventory), 'inventory must be an array');
  if (Array.isArray(document.inventory)) {
    const seen = new Set();
    document.inventory.forEach((item, index) => {
      const at = `inventory[${index}]`;
      if (!isPlainObject(item)) { errors.push(`${at} must be an object`); return; }
      add(errors, typeof item.id === 'string' && item.id.trim() !== '' && !seen.has(item.id), `${at}.id must be a unique nonblank string`);
      seen.add(item.id);
      add(errors, typeof item.name === 'string' && item.name.trim() !== '', `${at}.name must be a nonblank string`);
      add(errors, Number.isInteger(item.quantity) && item.quantity >= 1, `${at}.quantity must be a positive integer`);
      add(errors, Number.isFinite(item.weightGrams) && item.weightGrams >= 0, `${at}.weightGrams must be a non-negative number`);
      add(errors, typeof item.carried === 'boolean', `${at}.carried must be a boolean`);
      add(errors, typeof item.countsTowardLoad === 'boolean', `${at}.countsTowardLoad must be a boolean`);
      add(errors, item.weaponKey === null || typeof item.weaponKey === 'string', `${at}.weaponKey must be a string or null`);
      if (typeof item.weaponKey === 'string') { try { getPersonalWeapon(item.weaponKey); } catch (error) { errors.push(`${at}: ${error.message}`); } }
    });
  }
  if (isPlainObject(document.loadout) && document.loadout.militaryLoad !== undefined) add(errors, typeof document.loadout.militaryLoad === 'boolean', 'loadout.militaryLoad must be a boolean');

  add(errors, isPlainObject(document.finances), 'finances must be an object');
  if (isPlainObject(document.finances)) {
    add(errors, integerAtLeast(document.finances.credits, 0), 'finances.credits must be a non-negative integer');
    add(errors, integerAtLeast(document.finances.retirementPayAnnual, 0), 'finances.retirementPayAnnual must be a non-negative integer');
  }

  validateBenefits(document, errors);
  validateShipRefs(document, errors);
  if (Array.isArray(document.benefits?.shipEntitlements) && Array.isArray(document.shipRefs)) {
    const scout = document.benefits.shipEntitlements.find((entry) => entry?.name === 'Scout Ship');
    const reserveRefs = document.shipRefs.filter((entry) => entry?.relationship === 'reserve-assignee');
    if (scout?.disposition === 'reserve-assignment-available') {
      add(errors, reserveRefs.length === 0, 'available Scout Ship entitlement cannot already have a reserve-assignee ship reference');
    } else if (scout?.disposition === 'reserve-assignment-active') {
      add(errors, reserveRefs.length === 1, 'active Scout Ship entitlement must have exactly one reserve-assignee ship reference');
    }
  }
  add(errors, Array.isArray(document.history), 'history must be an array');
  add(errors, typeof document.notes === 'string', 'notes must be a string');
  add(errors, isPlainObject(document.record), 'record must be an object');
  if (isPlainObject(document.record)) {
    for (const key of CHARACTER_RECORD_TEXT_FIELDS) {
      add(errors, typeof document.record[key] === 'string', `record.${key} must be a string`);
    }
    add(errors, document.record.psionicStrength === null || Number.isInteger(document.record.psionicStrength), 'record.psionicStrength must be a whole number or null');
    add(errors, typeof document.record.travellersMember === 'boolean', 'record.travellersMember must be a boolean');
  }
  add(errors, isPlainObject(document.provenance), 'provenance must be an object');
  if (isPlainObject(document.provenance)) {
    add(errors, document.provenance.source === 'classic-traveller-book-1-chargen', 'provenance.source is invalid');
    add(errors, integerAtLeast(document.provenance.chargenSchemaVersion, 1), 'provenance.chargenSchemaVersion must be a positive integer');
  }

  return { valid: errors.length === 0, errors };
}

export function assertValidCharacterDocument(document) {
  const result = validateCharacterDocument(document);
  if (!result.valid) throw new CharacterDocumentValidationError(result.errors);
  return document;
}

function migrateV1CharacterDocument(document) {
  if (!isPlainObject(document)) throw new CharacterDocumentValidationError('character document must be an object');
  for (const key of Object.keys(document)) {
    if (!LEGACY_V1_TOP_LEVEL_KEYS.has(key)) throw new CharacterDocumentValidationError(`unknown top-level field: ${key}`);
  }
  if (document.documentType !== CHARACTER_DOCUMENT_TYPE) {
    throw new CharacterDocumentValidationError(`documentType must be ${CHARACTER_DOCUMENT_TYPE}`);
  }
  if (document.schemaVersion !== 1) throw new CharacterDocumentValidationError(`unsupported character document schemaVersion: ${document.schemaVersion}`);

  const migrated = cloneJson(document);
  migrated.schemaVersion = 2;
  migrated.identity = {
    id: stableDocumentId('char', characterDocumentSeedFromLegacy(document)),
    name: document.identity?.name ?? '',
    aliases: Array.isArray(document.identity?.aliases) ? [...document.identity.aliases] : []
  };
  migrated.shipRefs = [];
  if (isPlainObject(migrated.benefits) && Array.isArray(migrated.benefits.shipEntitlements)) {
    migrated.benefits.shipEntitlements = migrated.benefits.shipEntitlements.map((entry) => {
      const rolls = Number.isInteger(entry?.count) && entry.count > 0 ? entry.count : 1;
      return normalizeShipEntitlement(entry?.name ?? '', rolls);
    });
  }
  return migrated;
}

export function migrateCharacterDocument(document) {
  if (!isPlainObject(document)) throw new CharacterDocumentValidationError('character document must be an object');
  if (document.schemaVersion === CURRENT_CHARACTER_DOCUMENT_SCHEMA_VERSION) return cloneJson(document);
  let migrated = cloneJson(document);
  if (migrated.schemaVersion === 1) migrated = migrateV1CharacterDocument(migrated);
  if (migrated.schemaVersion === 2) {
    migrated.current = Object.fromEntries(['STR', 'DEX', 'END'].map((key) => [key, migrated.characteristics[key]]));
    migrated.status = { ...migrated.status, consciousness: migrated.status.alive === false ? 'not-applicable' : 'conscious' };
    migrated.loadout = {
      weaponKey: defaultCharacterWeaponKey({ benefits: migrated.benefits, skills: migrated.skills }),
      armor: 'none'
    };
    migrated.schemaVersion = 3;
  }
  if (migrated.schemaVersion === 3) {
    // v4: what the character carries (Book 1 p.32 WEIGHT). Start from what is
    // already known: the weapon in hand, carried, and any other weapons from
    // mustering out, stowed.
    migrated.inventory = initialInventory({ benefits: migrated.benefits, weaponKey: migrated.loadout?.weaponKey });
    migrated.schemaVersion = 4;
  }
  if (migrated.schemaVersion === 4) {
    // v5: the record block. Empty for everyone: nothing already filed knows
    // its own birthworld, and guessing one would be inventing history.
    migrated.record = emptyCharacterRecord();
    migrated.schemaVersion = 5;
  }
  if (migrated.schemaVersion === CURRENT_CHARACTER_DOCUMENT_SCHEMA_VERSION) return migrated;
  throw new CharacterDocumentValidationError(`unsupported character document schemaVersion: ${document.schemaVersion}`);
}

export function exportCharacterDocument(document, { space = 2 } = {}) {
  assertValidCharacterDocument(document);
  return JSON.stringify(document, null, space);
}

export function importCharacterDocument(input) {
  let parsed = input;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch (error) {
      throw new CharacterDocumentValidationError(`invalid JSON: ${error.message}`);
    }
  }
  const migrated = migrateCharacterDocument(parsed);
  assertValidCharacterDocument(migrated);
  return cloneJson(migrated);
}

export function updateCharacterGameplayState(document, { current, alive, consciousness, weaponKey, armor, notes } = {}) {
  const next = importCharacterDocument(document);
  if (current !== undefined) next.current = cloneJson(current);
  if (alive !== undefined) next.status.alive = Boolean(alive);
  if (consciousness !== undefined) next.status.consciousness = consciousness;
  if (weaponKey !== undefined) next.loadout.weaponKey = weaponKey;
  if (armor !== undefined) next.loadout.armor = armor;
  if (notes !== undefined) next.notes = String(notes);
  assertValidCharacterDocument(next);
  return next;
}

// ---- inventory (schema 4) ----------------------------------------------------

function weaponItem(weaponKey, { carried }) {
  const spec = getPersonalWeapon(weaponKey);
  const weight = personalWeaponWeight(weaponKey);
  return {
    id: `weapon-${weaponKey}`, name: weight?.ammunition ? `${spec.name}, loaded` : spec.name, quantity: 1,
    weightGrams: personalWeaponCarriedWeightGrams(weaponKey), carried, countsTowardLoad: weight?.countsTowardLoad ?? true, weaponKey
  };
}

function initialInventory({ benefits, weaponKey } = {}) {
  const items = [];
  const held = weaponKey && weaponKey !== 'hands' && personalWeaponWeight(weaponKey) ? weaponKey : null;
  if (held) items.push(weaponItem(held, { carried: true }));
  const names = new Map(Object.entries(PERSONAL_WEAPONS).map(([key, spec]) => [spec.name.toLowerCase(), key]));
  for (const entry of benefits?.equipment ?? []) {
    const key = names.get(String(entry?.name ?? '').toLowerCase());
    if (key && key !== held && personalWeaponWeight(key) && !items.some((item) => item.weaponKey === key)) items.push(weaponItem(key, { carried: false }));
  }
  return items;
}

export function addCharacterInventoryItem(document, { id = null, name, quantity = 1, weightGrams = 0, carried = true, countsTowardLoad = true, weaponKey = null } = {}) {
  const next = importCharacterDocument(document);
  const item = weaponKey && !name ? weaponItem(weaponKey, { carried }) : { id: null, name: String(name ?? '').trim(), quantity, weightGrams, carried, countsTowardLoad, weaponKey };
  let itemId = id ?? item.id ?? `item-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item'}`;
  const taken = new Set(next.inventory.map((entry) => entry.id));
  if (taken.has(itemId)) { let n = 2; while (taken.has(`${itemId}-${n}`)) n += 1; itemId = `${itemId}-${n}`; }
  next.inventory.push({ ...item, id: itemId, quantity: Number(item.quantity), weightGrams: Number(item.weightGrams), carried: Boolean(item.carried), countsTowardLoad: Boolean(item.countsTowardLoad), weaponKey: item.weaponKey ?? null });
  assertValidCharacterDocument(next);
  return next;
}

export function updateCharacterInventoryItem(document, itemId, patch = {}) {
  const next = importCharacterDocument(document);
  const index = next.inventory.findIndex((entry) => entry.id === itemId);
  if (index < 0) throw new CharacterDocumentValidationError(`no inventory item: ${itemId}`);
  const allowed = ['name', 'quantity', 'weightGrams', 'carried', 'countsTowardLoad'];
  next.inventory[index] = { ...next.inventory[index], ...Object.fromEntries(Object.entries(patch).filter(([key]) => allowed.includes(key))) };
  assertValidCharacterDocument(next);
  return next;
}

export function removeCharacterInventoryItem(document, itemId) {
  const next = importCharacterDocument(document);
  if (!next.inventory.some((entry) => entry.id === itemId)) throw new CharacterDocumentValidationError(`no inventory item: ${itemId}`);
  next.inventory = next.inventory.filter((entry) => entry.id !== itemId);
  assertValidCharacterDocument(next);
  return next;
}

export function setCharacterMilitaryLoad(document, military) {
  const next = importCharacterDocument(document);
  next.loadout.militaryLoad = Boolean(military);
  assertValidCharacterDocument(next);
  return next;
}

// Load is reckoned against the full Strength characteristic: the rule speaks
// of "his strength characteristic", not of strength as wounded.
/**
 * Writes the personnel-record fields (v5). Everything here is the player's
 * own text, so there is nothing to check but the shape: unknown keys are
 * refused, the psionic rating is a whole number or nothing, and membership is
 * a flag.
 */
export function updateCharacterRecord(document, patch = {}) {
  assertValidCharacterDocument(document);
  if (!isPlainObject(patch)) throw new TypeError('patch must be an object');
  const next = cloneJson(document);
  next.record = { ...emptyCharacterRecord(), ...next.record };
  for (const [key, value] of Object.entries(patch)) {
    if (CHARACTER_RECORD_TEXT_FIELDS.includes(key)) {
      if (typeof value !== 'string') throw new TypeError(`record.${key} must be a string`);
      next.record[key] = value;
    } else if (key === 'psionicStrength') {
      if (value === null || value === '') next.record.psionicStrength = null;
      else {
        const number = Number(value);
        if (!Number.isInteger(number) || number < 0 || number > 15) throw new RangeError('psionicStrength must be a whole number from 0 to 15');
        next.record.psionicStrength = number;
      }
    } else if (key === 'travellersMember') {
      next.record.travellersMember = Boolean(value);
    } else throw new TypeError(`unknown record field: ${key}`);
  }
  assertValidCharacterDocument(next);
  return next;
}

export function characterLoad(document, { gravityFactor = null } = {}) {
  return assessLoad({ strength: document.characteristics.STR, loadGrams: inventoryLoadGrams(document.inventory), military: Boolean(document.loadout?.militaryLoad), gravityFactor });
}

export function updateCharacterShipReference(document, { shipId, shipType, shipName, relationship } = {}) {
  assertValidCharacterDocument(document);
  if (typeof shipId !== 'string' || !shipId.trim()) throw new TypeError('shipId must be a nonblank string');
  if (shipType !== undefined && typeof shipType !== 'string') throw new TypeError('shipType must be a string when provided');
  if (shipName !== undefined && typeof shipName !== 'string') throw new TypeError('shipName must be a string when provided');
  if (relationship !== undefined && (typeof relationship !== 'string' || !relationship.trim())) {
    throw new TypeError('relationship must be a nonblank string when provided');
  }

  const next = cloneJson(document);
  const ref = next.shipRefs.find((entry) => entry.shipId === shipId.trim());
  if (!ref) throw new CharacterDocumentValidationError(`character does not reference ship ${shipId.trim()}`);
  if (shipType !== undefined) ref.shipType = shipType;
  if (shipName !== undefined) ref.shipName = shipName;
  if (relationship !== undefined) ref.relationship = relationship.trim();
  assertValidCharacterDocument(next);
  return next;
}

export function linkCharacterToShip(document, { shipId, relationship, shipType = '', shipName = '' } = {}) {
  assertValidCharacterDocument(document);
  if (typeof shipId !== 'string' || !shipId.trim()) throw new TypeError('shipId must be a nonblank string');
  if (typeof relationship !== 'string' || !relationship.trim()) throw new TypeError('relationship must be a nonblank string');
  if (typeof shipType !== 'string' || typeof shipName !== 'string') throw new TypeError('shipType and shipName must be strings');
  if (document.shipRefs.some((entry) => entry.shipId === shipId)) {
    throw new CharacterDocumentValidationError(`character already references ship ${shipId}`);
  }

  const next = cloneJson(document);
  next.shipRefs.push({ shipId: shipId.trim(), relationship: relationship.trim(), shipType, shipName });
  if (relationship === 'reserve-assignee') {
    const scout = next.benefits.shipEntitlements.find((entry) => entry.name === 'Scout Ship');
    if (scout?.disposition === 'reserve-assignment-available') scout.disposition = 'reserve-assignment-active';
  }
  assertValidCharacterDocument(next);
  return next;
}

import { CHARACTERISTIC_KEYS, formatUPP } from './upp.js';
import { CHARGEN_PHASES } from './chargen.js';
import { assertValidCharacter } from './serialization.js';
import { SERVICE_KEYS, getService } from '../careers/services.js';

export const CHARACTER_DOCUMENT_TYPE = 'classic-traveller-character';
export const CURRENT_CHARACTER_DOCUMENT_SCHEMA_VERSION = 1;
export const SUPPORTED_CHARACTER_DOCUMENT_SCHEMA_VERSIONS = Object.freeze([1]);

const SERVICE_VALUES = new Set(SERVICE_KEYS);
const TOP_LEVEL_KEYS = new Set([
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

export function summarizeMaterialBenefits(materialBenefits = []) {
  if (!Array.isArray(materialBenefits)) {
    throw new TypeError('materialBenefits must be an array');
  }

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
    shipEntitlements: aggregateNamed(ships).map((entry) => ({
      ...entry,
      disposition: 'unresolved'
    }))
  };
}

export function createCharacterDocument(character, { aliases = [], notes = '' } = {}) {
  assertValidCharacter(character);
  if (character.phase !== CHARGEN_PHASES.COMPLETE) {
    throw new CharacterDocumentValidationError('only a completed chargen state can become a gameplay character document');
  }
  if (!character.alive) {
    throw new CharacterDocumentValidationError('a deceased chargen state cannot become a playable character document');
  }
  if (!Array.isArray(aliases) || aliases.some((alias) => typeof alias !== 'string')) {
    throw new TypeError('aliases must be an array of strings');
  }
  if (typeof notes !== 'string') throw new TypeError('notes must be a string');

  const document = {
    documentType: CHARACTER_DOCUMENT_TYPE,
    schemaVersion: CURRENT_CHARACTER_DOCUMENT_SCHEMA_VERSION,
    identity: {
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
    upp: character.upp,
    status: {
      alive: character.alive,
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
    finances: {
      credits: character.credits,
      retirementPayAnnual: character.retirementPayAnnual
    },
    benefits: summarizeMaterialBenefits(character.materialBenefits),
    history: cloneJson(character.history),
    notes,
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
  for (const key of ['passages', 'memberships', 'equipment', 'shipEntitlements']) {
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
      if (isPlainObject(entry)) add(errors, entry.disposition === 'unresolved', 'ship entitlement disposition must be unresolved until the ship system resolves it');
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
  add(errors, isPlainObject(document.status), 'status must be an object');
  if (isPlainObject(document.status)) {
    add(errors, document.status.alive === true, 'gameplay character documents currently require status.alive true');
    add(errors, typeof document.status.retired === 'boolean', 'status.retired must be boolean');
  }
  validateCareer(document, errors);
  validateSkills(document, errors);

  add(errors, isPlainObject(document.finances), 'finances must be an object');
  if (isPlainObject(document.finances)) {
    add(errors, integerAtLeast(document.finances.credits, 0), 'finances.credits must be a non-negative integer');
    add(errors, integerAtLeast(document.finances.retirementPayAnnual, 0), 'finances.retirementPayAnnual must be a non-negative integer');
  }

  validateBenefits(document, errors);
  add(errors, Array.isArray(document.history), 'history must be an array');
  add(errors, typeof document.notes === 'string', 'notes must be a string');
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
  assertValidCharacterDocument(parsed);
  return cloneJson(parsed);
}

import {
  PERSONAL_ARMOR_TYPES,
  getPersonalWeapon,
  stableDocumentId
} from '../../packages/classic-traveller-rules/index.js';

export const NPC_ACTOR_DOCUMENT_TYPE = 'graycloak-traveller-npc-actor';
export const CURRENT_NPC_ACTOR_SCHEMA_VERSION = 1;
export const NPC_ACTOR_TYPES = Object.freeze(['npc', 'robot', 'creature']);
export const NPC_BODY_MODELS = Object.freeze(['biological', 'robotic', 'hybrid']);

export class NpcActorDocumentValidationError extends Error {
  constructor(errors) {
    const list = Array.isArray(errors) ? errors : [String(errors)];
    super(`invalid Graycloak Traveller NPC Actor Document: ${list.join('; ')}`);
    this.name = 'NpcActorDocumentValidationError';
    this.errors = Object.freeze([...list]);
  }
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function add(errors, condition, message) { if (!condition) errors.push(message); }
function nonblank(value) { return typeof value === 'string' && value.trim().length > 0; }
function plain(value) { return value && typeof value === 'object' && !Array.isArray(value); }
function characteristic(value) { return Number.isInteger(value) && value >= 0 && value <= 15; }
function hex(value) { return Math.max(0, Math.min(15, Number(value) || 0)).toString(16).toUpperCase(); }
function parse(input) {
  if (typeof input !== 'string') return input;
  try { return JSON.parse(input); }
  catch (error) { throw new NpcActorDocumentValidationError(`invalid JSON: ${error.message}`); }
}

function normalizedCharacteristics(value = {}) {
  return Object.fromEntries(['STR', 'DEX', 'END', 'INT', 'EDU', 'SOC'].map((key) => [key, Number.isInteger(value[key]) ? value[key] : 7]));
}

export function createNpcActorDocument({
  id,
  name = 'Unnamed NPC',
  aliases = [],
  description = '',
  portraitAssetId = null,
  tokenLabel = '',
  actorType = 'npc',
  species = 'Human',
  bodyModel = actorType === 'robot' ? 'robotic' : 'biological',
  role = '',
  faction = '',
  homeworld = '',
  age = null,
  characteristics = {},
  current = null,
  career = {},
  benefits = {},
  chronology = [],
  history = [],
  skills = {},
  weaponKey = 'automatic-pistol',
  armor = 'none',
  inventory = [],
  credits = 0,
  retirementPayAnnual = 0,
  shipRefs = [],
  effects = [],
  state = {},
  publicNotes = '',
  refereeNotes = ''
} = {}) {
  const scores = normalizedCharacteristics(characteristics);
  const robotic = bodyModel === 'robotic';
  const seed = `${name}|${role}|${Date.now()}|${Math.random()}`;
  const document = {
    documentType: NPC_ACTOR_DOCUMENT_TYPE,
    schemaVersion: CURRENT_NPC_ACTOR_SCHEMA_VERSION,
    identity: { id: id ?? stableDocumentId('actor', seed), name: String(name), aliases: [...aliases] },
    presentation: { description: String(description), portraitAssetId, tokenLabel: String(tokenLabel) },
    profile: { actorType, species: String(species), bodyModel, role: String(role), faction: String(faction), homeworld: String(homeworld), age },
    characteristics: scores,
    upp: ['STR', 'DEX', 'END', 'INT', 'EDU', 'SOC'].map((key) => hex(scores[key])).join(''),
    current: current ? { STR: current.STR, DEX: current.DEX, END: current.END } : { STR: scores.STR, DEX: scores.DEX, END: scores.END },
    state: {
      lifeState: state.lifeState ?? (robotic ? 'not-applicable' : 'alive'),
      consciousness: state.consciousness ?? (robotic ? 'not-applicable' : 'conscious'),
      activation: state.activation ?? (robotic ? 'active' : 'not-applicable'),
      integrity: state.integrity ?? 'intact',
      archived: Boolean(state.archived)
    },
    career: {
      service: String(career.service ?? ''), drafted: Boolean(career.drafted), terms: Number.isInteger(career.terms) ? career.terms : 0,
      yearsServed: Number.isInteger(career.yearsServed) ? career.yearsServed : (Number.isInteger(career.terms) ? career.terms * 4 : 0),
      rank: Number.isInteger(career.rank) ? career.rank : 0, rankTitle: String(career.rankTitle ?? ''),
      separationReason: career.separationReason === null || typeof career.separationReason === 'string' ? career.separationReason ?? null : null
    },
    benefits: {
      cashRolls: Number.isInteger(benefits.cashRolls) ? benefits.cashRolls : 0,
      materialRolls: Number.isInteger(benefits.materialRolls) ? benefits.materialRolls : 0,
      materialAwards: Array.isArray(benefits.materialAwards) ? clone(benefits.materialAwards) : []
    },
    chronology: clone(chronology),
    history: clone(history),
    skills: clone(skills),
    loadout: { weaponKey, armor },
    inventory: clone(inventory),
    finances: { credits: Number.isInteger(credits) ? credits : 0, retirementPayAnnual: Number.isInteger(retirementPayAnnual) ? retirementPayAnnual : 0 },
    shipRefs: clone(shipRefs),
    effects: clone(effects),
    notes: { public: String(publicNotes), referee: String(refereeNotes) },
    provenance: { rulesBasis: 'classic-traveller-books-1-3-core', setting: 'Sea of Suns' }
  };
  assertValidNpcActorDocument(document);
  return document;
}

export function validateNpcActorDocument(document) {
  const errors = [];
  add(errors, plain(document), 'document must be an object');
  if (!plain(document)) return errors;
  add(errors, document.documentType === NPC_ACTOR_DOCUMENT_TYPE, `documentType must be ${NPC_ACTOR_DOCUMENT_TYPE}`);
  add(errors, document.schemaVersion === CURRENT_NPC_ACTOR_SCHEMA_VERSION, `schemaVersion must be ${CURRENT_NPC_ACTOR_SCHEMA_VERSION}`);
  add(errors, nonblank(document.identity?.id) && nonblank(document.identity?.name) && Array.isArray(document.identity?.aliases), 'identity must contain id, name, and aliases');
  add(errors, plain(document.presentation) && typeof document.presentation.description === 'string' && (document.presentation.portraitAssetId === null || nonblank(document.presentation.portraitAssetId)) && typeof document.presentation.tokenLabel === 'string', 'presentation is invalid');
  add(errors, NPC_ACTOR_TYPES.includes(document.profile?.actorType), 'profile.actorType is invalid');
  add(errors, NPC_BODY_MODELS.includes(document.profile?.bodyModel), 'profile.bodyModel is invalid');
  for (const key of ['species', 'role', 'faction', 'homeworld']) add(errors, typeof document.profile?.[key] === 'string', `profile.${key} must be a string`);
  add(errors, document.profile?.age === null || (Number.isInteger(document.profile.age) && document.profile.age >= 0), 'profile.age must be null or a non-negative integer');
  for (const key of ['STR', 'DEX', 'END', 'INT', 'EDU', 'SOC']) add(errors, characteristic(document.characteristics?.[key]), `characteristics.${key} must be an integer from 0 to 15`);
  add(errors, typeof document.upp === 'string' && /^[0-9A-F]{6}$/.test(document.upp), 'upp must be six hexadecimal digits');
  for (const key of ['STR', 'DEX', 'END']) add(errors, characteristic(document.current?.[key]), `current.${key} must be an integer from 0 to 15`);
  add(errors, ['alive', 'dead', 'not-applicable'].includes(document.state?.lifeState), 'state.lifeState is invalid');
  add(errors, ['conscious', 'unconscious', 'not-applicable'].includes(document.state?.consciousness), 'state.consciousness is invalid');
  add(errors, ['active', 'powered-down', 'offline', 'not-applicable'].includes(document.state?.activation), 'state.activation is invalid');
  add(errors, ['intact', 'damaged', 'disabled', 'destroyed'].includes(document.state?.integrity), 'state.integrity is invalid');
  add(errors, typeof document.state?.archived === 'boolean', 'state.archived must be boolean');
  add(errors, typeof document.career?.service === 'string' && typeof document.career?.drafted === 'boolean' && Number.isInteger(document.career?.terms) && document.career.terms >= 0 && Number.isInteger(document.career?.yearsServed) && document.career.yearsServed >= 0 && Number.isInteger(document.career?.rank) && document.career.rank >= 0 && typeof document.career?.rankTitle === 'string' && (document.career?.separationReason === null || typeof document.career?.separationReason === 'string'), 'career is invalid');
  add(errors, Number.isInteger(document.benefits?.cashRolls) && document.benefits.cashRolls >= 0 && Number.isInteger(document.benefits?.materialRolls) && document.benefits.materialRolls >= 0 && Array.isArray(document.benefits?.materialAwards), 'benefits are invalid');
  add(errors, Array.isArray(document.chronology), 'chronology must be an array');
  add(errors, Array.isArray(document.history), 'history must be an array');
  add(errors, plain(document.skills) && Object.values(document.skills ?? {}).every((value) => Number.isInteger(value) && value >= 0), 'skills must contain non-negative integer levels');
  try { getPersonalWeapon(document.loadout?.weaponKey); } catch (error) { errors.push(error.message); }
  add(errors, PERSONAL_ARMOR_TYPES.includes(document.loadout?.armor), 'loadout.armor is invalid');
  add(errors, Array.isArray(document.inventory), 'inventory must be an array');
  add(errors, Number.isInteger(document.finances?.credits) && Number.isInteger(document.finances?.retirementPayAnnual) && document.finances.retirementPayAnnual >= 0, 'finances are invalid');
  add(errors, Array.isArray(document.shipRefs), 'shipRefs must be an array');
  add(errors, Array.isArray(document.effects), 'effects must be an array');
  if (Array.isArray(document.effects)) for (const effect of document.effects) {
    add(errors, nonblank(effect?.id) && nonblank(effect?.label) && ['condition', 'injury', 'equipment', 'environmental', 'custom'].includes(effect?.kind) && typeof effect?.active === 'boolean', 'effect is invalid');
  }
  add(errors, typeof document.notes?.public === 'string' && typeof document.notes?.referee === 'string', 'notes are invalid');
  add(errors, nonblank(document.provenance?.rulesBasis) && nonblank(document.provenance?.setting), 'provenance is invalid');
  return errors;
}

export function assertValidNpcActorDocument(document) {
  const errors = validateNpcActorDocument(document);
  if (errors.length) throw new NpcActorDocumentValidationError(errors);
  return document;
}

export function importNpcActorDocument(input) { const document = clone(parse(input)); assertValidNpcActorDocument(document); return document; }
export function exportNpcActorDocument(document, { space = 2 } = {}) { return JSON.stringify(importNpcActorDocument(document), null, space); }

export function updateNpcActorDocument(document, patch = {}) {
  const current = importNpcActorDocument(document);
  return createNpcActorDocument({
    id: current.identity.id,
    name: patch.name ?? current.identity.name,
    aliases: patch.aliases ?? current.identity.aliases,
    description: patch.description ?? current.presentation.description,
    portraitAssetId: patch.portraitAssetId === undefined ? current.presentation.portraitAssetId : patch.portraitAssetId,
    tokenLabel: patch.tokenLabel ?? current.presentation.tokenLabel,
    actorType: patch.actorType ?? current.profile.actorType,
    species: patch.species ?? current.profile.species,
    bodyModel: patch.bodyModel ?? current.profile.bodyModel,
    role: patch.role ?? current.profile.role,
    faction: patch.faction ?? current.profile.faction,
    homeworld: patch.homeworld ?? current.profile.homeworld,
    age: patch.age === undefined ? current.profile.age : patch.age,
    characteristics: patch.characteristics ?? current.characteristics,
    current: patch.current ?? current.current,
    career: patch.career ?? current.career,
    benefits: patch.benefits ?? current.benefits,
    chronology: patch.chronology ?? current.chronology,
    history: patch.history ?? current.history,
    skills: patch.skills ?? current.skills,
    weaponKey: patch.weaponKey ?? current.loadout.weaponKey,
    armor: patch.armor ?? current.loadout.armor,
    inventory: patch.inventory ?? current.inventory,
    credits: patch.credits ?? current.finances.credits,
    retirementPayAnnual: patch.retirementPayAnnual ?? current.finances.retirementPayAnnual,
    shipRefs: patch.shipRefs ?? current.shipRefs,
    effects: patch.effects ?? current.effects,
    state: patch.state ?? current.state,
    publicNotes: patch.publicNotes ?? current.notes.public,
    refereeNotes: patch.refereeNotes ?? current.notes.referee
  });
}

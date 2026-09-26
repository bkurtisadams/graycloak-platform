import {
  PERSONAL_ARMOR_TYPES,
  getPersonalWeapon,
  personalWeaponWeight,
  personalWeaponCarriedWeightGrams,
  stableDocumentId
} from '../vendor/classic-traveller-rules/index.js?v=r0.81.0';

export const NPC_ACTOR_DOCUMENT_TYPE = 'graycloak-traveller-npc-actor';
// v0.221.0: schema 2 adds `profile.folder`, a slash-separated path the referee
// files an actor under. A campaign with thousands of actors is a directory,
// not a list, and nothing in schema 1 could group them. An actor filed nowhere
// keeps an empty path and shows under "Unfiled".
// v0.249.0: schema 3 adds `profile.kind`, Foundry's linked/unlinked token
// split made a property of the directory entry rather than of each placed
// token. An 'actor' is one person: one sheet, one set of wounds, and placing
// it twice is a mistake. A 'statblock' is a pattern — Bandit, Thug — and every
// token placed from it copies the stats and then owns its copy, so shooting
// Bandit 2 leaves Bandit 1 alone. Nothing in schema 2 could tell the two
// apart, so a migrated actor becomes an 'actor' and the referee reclassifies
// the mooks by hand.
export const CURRENT_NPC_ACTOR_SCHEMA_VERSION = 3;
export const SUPPORTED_NPC_ACTOR_SCHEMA_VERSIONS = Object.freeze([1, 2, 3]);
export const NPC_ACTOR_KINDS = Object.freeze(['actor', 'statblock']);

// A path is trimmed segments joined by "/": "Startown/Dock gangs".
export function normalizeFolderPath(value) {
  return String(value ?? '')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .join('/');
}
export const NPC_ACTOR_TYPES = Object.freeze(['npc', 'robot', 'creature']);
export const NPC_BODY_MODELS = Object.freeze(['biological', 'robotic', 'hybrid']);
export const NPC_CONDITIONS = Object.freeze({
  biological: Object.freeze(['stunned', 'unconscious', 'dead']),
  robotic: Object.freeze(['disrupted', 'powered-down', 'disabled', 'destroyed']),
  hybrid: Object.freeze(['stunned', 'unconscious', 'disrupted', 'powered-down', 'disabled', 'dead', 'destroyed'])
});

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
  kind = 'actor',
  // Kurt, Sep 2026: numbering the tokens placed from a statblock (Bandit 1,
  // Bandit 2) is an option that defaults to on — a combat tracker of five
  // identical "Bandit" rows is unreadable.
  numberTokens = true,
  species = 'Human',
  bodyModel = actorType === 'robot' ? 'robotic' : 'biological',
  role = '',
  folder = '',
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
  refereeNotes = '',
  // v0.302.0: an animal from The Traveller Book's encounter tables (pp.90-95).
  // Its whole statline lives here; the characteristics above are unused.
  animal = null
} = {}) {
  const scores = normalizedCharacteristics(characteristics);
  const robotic = bodyModel === 'robotic';
  const seed = `${name}|${role}|${Date.now()}|${Math.random()}`;
  const document = {
    documentType: NPC_ACTOR_DOCUMENT_TYPE,
    schemaVersion: CURRENT_NPC_ACTOR_SCHEMA_VERSION,
    identity: { id: id ?? stableDocumentId('actor', seed), name: String(name), aliases: [...aliases] },
    presentation: { description: String(description), portraitAssetId, tokenLabel: String(tokenLabel) },
    profile: {
      actorType, kind: NPC_ACTOR_KINDS.includes(kind) ? kind : 'actor', numberTokens: Boolean(numberTokens),
      species: String(species), bodyModel, role: String(role), folder: normalizeFolderPath(folder),
      faction: String(faction), homeworld: String(homeworld), age
    },
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
  if (animal) document.animal = clone(animal);
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
  add(errors, NPC_ACTOR_KINDS.includes(document.profile?.kind), 'profile.kind must be actor or statblock');
  add(errors, typeof document.profile?.numberTokens === 'boolean', 'profile.numberTokens must be boolean');
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
    if (effect?.kind === 'condition' && effect.key !== undefined) add(errors, NPC_CONDITIONS[document.profile?.bodyModel]?.includes(effect.key), 'condition effect key is invalid for the actor body model');
  }
  add(errors, typeof document.notes?.public === 'string' && typeof document.notes?.referee === 'string', 'notes are invalid');
  add(errors, nonblank(document.provenance?.rulesBasis) && nonblank(document.provenance?.setting), 'provenance is invalid');
  if (document.animal !== undefined) {
    const animal = document.animal;
    add(errors, plain(animal) && nonblank(animal.type) && nonblank(animal.category), 'animal must name its category and type');
    add(errors, plain(animal?.hits) && ['unconscious', 'dead', 'destroyed'].every((key) => Number.isInteger(animal.hits[key]) && animal.hits[key] >= 0), 'animal hits are invalid');
    add(errors, Array.isArray(animal?.weapons) && animal.weapons.length > 0 && animal.weapons.every((weapon) => {
      try { getPersonalWeapon(weapon?.key); } catch { return false; }
      return Number.isInteger(weapon.wound) && Array.isArray(weapon.woundGroups);
    }), 'animal weapons are invalid');
    add(errors, plain(animal?.armor) && PERSONAL_ARMOR_TYPES.includes(animal.armor.key), 'animal armor is invalid');
    add(errors, plain(animal?.behaviour) && nonblank(animal.behaviour.code), 'animal behaviour is invalid');
  }
  return errors;
}

export function assertValidNpcActorDocument(document) {
  const errors = validateNpcActorDocument(document);
  if (errors.length) throw new NpcActorDocumentValidationError(errors);
  return document;
}

// Schema 1 knew no folders; everything it holds is filed nowhere.
function migrateNpcActorDocument(document) {
  if (document?.schemaVersion === 1) {
    document.profile = { ...document.profile, folder: normalizeFolderPath(document.profile?.folder) };
    document.schemaVersion = 2;
  }
  if (document?.schemaVersion === 2) {
    document.profile = { ...document.profile, kind: 'actor', numberTokens: true };
    document.schemaVersion = 3;
  }
  return document;
}

export function importNpcActorDocument(input) { const document = migrateNpcActorDocument(clone(parse(input))); assertValidNpcActorDocument(document); return document; }
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
    kind: patch.kind ?? current.profile.kind,
    numberTokens: patch.numberTokens === undefined ? current.profile.numberTokens : patch.numberTokens,
    species: patch.species ?? current.profile.species,
    bodyModel: patch.bodyModel ?? current.profile.bodyModel,
    role: patch.role ?? current.profile.role,
    folder: patch.folder === undefined ? current.profile.folder : patch.folder,
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
    refereeNotes: patch.refereeNotes ?? current.notes.referee,
    animal: patch.animal === undefined ? current.animal ?? null : patch.animal
  });
}

export function activeNpcActorConditions(document) {
  const actor = importNpcActorDocument(document);
  return actor.effects.filter((effect) => effect.kind === 'condition' && effect.active).map((effect) => effect.key ?? effect.label.toLowerCase().replaceAll(' ', '-'));
}

export function setNpcActorCondition(document, { condition, active = true } = {}) {
  const actor = importNpcActorDocument(document);
  if (!NPC_CONDITIONS[actor.profile.bodyModel].includes(condition)) throw new RangeError(`${condition} is not valid for a ${actor.profile.bodyModel} actor`);
  const effectId = stableDocumentId('effect', `${actor.identity.id}|condition|${condition}`);
  const effects = actor.effects.filter((effect) => effect.id !== effectId);
  effects.push({ id: effectId, key: condition, label: condition.replaceAll('-', ' '), kind: 'condition', active: Boolean(active), source: 'referee' });
  const state = { ...actor.state };
  const activeKeys = new Set(effects.filter((effect) => effect.kind === 'condition' && effect.active).map((effect) => effect.key));
  if (actor.profile.bodyModel !== 'biological') {
    state.activation = activeKeys.has('powered-down') ? 'powered-down' : 'active';
    state.integrity = activeKeys.has('destroyed') ? 'destroyed' : activeKeys.has('disabled') ? 'disabled' : activeKeys.has('disrupted') ? 'damaged' : 'intact';
  }
  if (actor.profile.bodyModel !== 'robotic') {
    state.consciousness = activeKeys.has('unconscious') ? 'unconscious' : 'conscious';
    state.lifeState = activeKeys.has('dead') ? 'dead' : 'alive';
  }
  return updateNpcActorDocument(actor, { effects, state });
}

export function clearNpcActorConditions(document) {
  let actor = importNpcActorDocument(document);
  for (const condition of NPC_CONDITIONS[actor.profile.bodyModel]) {
    if (activeNpcActorConditions(actor).includes(condition)) actor = setNpcActorCondition(actor, { condition, active: false });
  }
  return actor;
}

// --- v0.83.0: the Actors directory --------------------------------------
export function duplicateNpcActorDocument(document, { name = null } = {}) {
  const source = importNpcActorDocument(document);
  // A copy is a new actor with a fresh id and nothing inherited from the
  // original's state beyond how it is built.
  return createNpcActorDocument({
    name: name ?? `${source.identity.name} (copy)`, aliases: source.identity.aliases,
    description: source.presentation.description, portraitAssetId: source.presentation.portraitAssetId, tokenLabel: source.presentation.tokenLabel,
    actorType: source.profile.actorType, species: source.profile.species, bodyModel: source.profile.bodyModel,
    // v0.249.0: the kind, the numbering option and the folder come along
    // too. A copy that landed in Unfiled as a plain actor was not the copy
    // anybody asked for — copying a statblock is how you build "Bandit with
    // a shotgun" from the plain one, and it belongs beside its original.
    kind: source.profile.kind, numberTokens: source.profile.numberTokens, folder: source.profile.folder,
    role: source.profile.role, faction: source.profile.faction, homeworld: source.profile.homeworld, age: source.profile.age,
    characteristics: source.characteristics, current: source.current, career: source.career, benefits: source.benefits,
    skills: source.skills, weaponKey: source.loadout?.weaponKey, armor: source.loadout?.armor, inventory: source.inventory ?? [],
    credits: source.finances?.credits ?? 0, retirementPayAnnual: source.finances?.retirementPayAnnual ?? 0,
    effects: source.effects ?? [], state: { ...source.state, archived: false },
    publicNotes: source.notes?.public ?? '', refereeNotes: source.notes?.referee ?? '',
    animal: source.animal ?? null
  });
}

export function setNpcActorArchived(document, archived) {
  const current = importNpcActorDocument(document);
  return updateNpcActorDocument(current, { state: { ...current.state, archived: Boolean(archived) } });
}

export function npcActorMatchesSearch(document, query) {
  const text = String(query ?? '').trim().toLowerCase();
  if (!text) return true;
  return [document.identity.name, document.profile.role, document.profile.actorType, document.profile.faction, ...(document.identity.aliases ?? [])]
    .filter(Boolean).some((value) => String(value).toLowerCase().includes(text));
}

// v0.267.0: an NPC actor's inventory, the same item shape a character's uses
// ({ id, name, quantity, weightGrams, carried, countsTowardLoad, weaponKey })
// so the sheet's Gear tab, Book 1 p.33's load and the fight's list of
// carried weapons read both alike. The field has been in the schema since
// schema 1; nothing wrote to it until now.
function weaponInventoryItem(weaponKey, { carried = true } = {}) {
  const spec = getPersonalWeapon(weaponKey);
  const weight = personalWeaponWeight(weaponKey);
  return {
    id: `weapon-${weaponKey}`, name: weight?.ammunition ? `${spec.name}, loaded` : spec.name, quantity: 1,
    weightGrams: personalWeaponCarriedWeightGrams(weaponKey), carried, countsTowardLoad: weight?.countsTowardLoad ?? true, weaponKey
  };
}

export function addNpcActorInventoryItem(document, { name = null, quantity = 1, weightGrams = 0, carried = true, countsTowardLoad = true, weaponKey = null } = {}) {
  const actor = importNpcActorDocument(document);
  const item = weaponKey && !name
    ? weaponInventoryItem(weaponKey, { carried })
    : { id: null, name: String(name ?? '').trim(), quantity, weightGrams, carried, countsTowardLoad, weaponKey };
  if (!item.name) throw new TypeError('an item needs a name');
  if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1) throw new RangeError('quantity must be a whole number of 1 or more');
  if (!Number.isFinite(Number(item.weightGrams)) || Number(item.weightGrams) < 0) throw new RangeError('weight must be zero or more');
  let itemId = item.id ?? `item-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item'}`;
  const taken = new Set(actor.inventory.map((entry) => entry.id));
  if (taken.has(itemId)) { let n = 2; while (taken.has(`${itemId}-${n}`)) n += 1; itemId = `${itemId}-${n}`; }
  const inventory = [...actor.inventory, {
    ...item, id: itemId, quantity: Number(item.quantity), weightGrams: Number(item.weightGrams),
    carried: Boolean(item.carried), countsTowardLoad: Boolean(item.countsTowardLoad), weaponKey: item.weaponKey ?? null
  }];
  return updateNpcActorDocument(actor, { inventory });
}

export function updateNpcActorInventoryItem(document, itemId, patch = {}) {
  const actor = importNpcActorDocument(document);
  const index = actor.inventory.findIndex((entry) => entry.id === itemId);
  if (index < 0) throw new Error(`no inventory item: ${itemId}`);
  const allowed = ['name', 'quantity', 'weightGrams', 'carried', 'countsTowardLoad'];
  const inventory = actor.inventory.map((entry, at) => (at === index
    ? { ...entry, ...Object.fromEntries(Object.entries(patch).filter(([key]) => allowed.includes(key))) }
    : entry));
  return updateNpcActorDocument(actor, { inventory });
}

export function removeNpcActorInventoryItem(document, itemId) {
  const actor = importNpcActorDocument(document);
  if (!actor.inventory.some((entry) => entry.id === itemId)) throw new Error(`no inventory item: ${itemId}`);
  return updateNpcActorDocument(actor, { inventory: actor.inventory.filter((entry) => entry.id !== itemId) });
}

// v0.271.0: an NPC actor keeps its wounds. A fight's damage came back only to
// player characters, so an actor ("one person, one set of wounds") walked out
// of every fight unhurt. Book 1 p.31 applies to anyone: three days' rest, or
// medical attention, brings back full strength, and the severely wounded (two
// characteristics taken to zero) can only be treated. The schema has no field
// for severity, so it is kept as an injury effect with this id.
export const NPC_SEVERE_WOUND_EFFECT_ID = 'effect-severely-wounded';

export function npcActorIsWounded(document) {
  return ['STR', 'DEX', 'END'].some((key) => Number(document.current?.[key]) < Number(document.characteristics?.[key]));
}

export function npcActorIsSeverelyWounded(document) {
  return (document.effects ?? []).some((effect) => effect.id === NPC_SEVERE_WOUND_EFFECT_ID && effect.active);
}

export function npcActorIsDead(document) {
  return document.state?.lifeState === 'dead';
}

function withSevere(effects, severe) {
  const rest = (effects ?? []).filter((effect) => effect.id !== NPC_SEVERE_WOUND_EFFECT_ID);
  return severe ? [...rest, { id: NPC_SEVERE_WOUND_EFFECT_ID, label: 'Severely wounded', kind: 'injury', active: true, source: 'combat' }] : rest;
}

// What a fight left an actor with: its scores, whether it lived, and whether
// it was severely wounded. By the time the fight is over the unconscious have
// woken (p.31), so a living actor is conscious.
export function recordNpcActorWounds(document, { current, dead = false, severe = false } = {}) {
  const actor = importNpcActorDocument(document);
  const scores = {};
  for (const key of ['STR', 'DEX', 'END']) scores[key] = Math.max(0, Math.min(actor.characteristics[key], Number(current?.[key] ?? actor.current[key])));
  const biological = actor.profile.bodyModel !== 'robotic';
  return updateNpcActorDocument(actor, {
    current: scores,
    state: {
      ...actor.state,
      lifeState: biological ? (dead ? 'dead' : 'alive') : actor.state.lifeState,
      consciousness: biological ? (dead ? 'not-applicable' : 'conscious') : actor.state.consciousness,
      integrity: biological ? actor.state.integrity : (dead ? 'destroyed' : actor.state.integrity)
    },
    effects: withSevere(actor.effects, !dead && severe)
  });
}

function recoveredNpcActor(actor) {
  return updateNpcActorDocument(actor, {
    current: { STR: actor.characteristics.STR, DEX: actor.characteristics.DEX, END: actor.characteristics.END },
    effects: withSevere(actor.effects, false)
  });
}

export function restNpcActor(document) {
  const actor = importNpcActorDocument(document);
  if (npcActorIsDead(actor)) throw new Error(`${actor.identity.name} is dead`);
  if (npcActorIsSeverelyWounded(actor)) throw new Error(`${actor.identity.name} is severely wounded and cannot recover without medical attention (Book 1 p.31)`);
  if (!npcActorIsWounded(actor)) throw new Error(`${actor.identity.name} is not wounded`);
  return recoveredNpcActor(actor);
}

// Kurt's ruling for the throw: 8+, DM the attendant's Medical, -5 with none,
// optional -2 for a non-human patient (1981).
// v0.296.0: the 1981 Book 1's requirements, no throw (Kurt's ruling) — as a
// character's: Medical-1 and a medical kit; Medical-3 and a medical facility
// for the seriously wounded.
// Xeno-medicine: an NPC whose species is not human is treated two levels
// lower (The Traveller Book).
export function npcActorIsNonHuman(document) {
  return String(document?.profile?.species ?? 'Human').trim().toLowerCase() !== 'human';
}

export function medicalAttentionNpcActor(document, { medicalLevel = null, medicalKit = false, facility = false, xeno = false } = {}) {
  const actor = importNpcActorDocument(document);
  if (npcActorIsDead(actor)) throw new Error(`${actor.identity.name} is dead`);
  const serious = npcActorIsSeverelyWounded(actor);
  if (!npcActorIsWounded(actor) && !serious) throw new Error(`${actor.identity.name} is not wounded`);
  const trained = medicalLevel === null || medicalLevel === undefined ? null : Number(medicalLevel);
  const level = trained === null ? null : trained - (xeno ? 2 : 0);
  const needed = serious ? 3 : 1;
  const missing = [];
  if (level === null || level < needed) missing.push(`an attendant with Medical-${needed} or better${xeno ? ` (Medical-${needed + 2} for a non-human)` : ''}`);
  if (serious ? !facility : !medicalKit) missing.push(serious ? 'a medical facility' : 'a medical kit');
  if (missing.length) throw new Error(`${actor.identity.name}${serious ? ' is seriously wounded and' : ''} needs ${missing.join(' and ')} (Book 1, 1981)`);
  return { success: true, serious, actor: recoveredNpcActor(actor) };
}

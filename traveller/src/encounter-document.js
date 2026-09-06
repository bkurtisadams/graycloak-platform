import {
  PERSONAL_COMBAT_RANGES,
  PERSONAL_ARMOR_TYPES,
  PERSONAL_COMBAT_STATUSES,
  getPersonalWeapon,
  createPersonalCombatant,
  resolvePersonalSurprise,
  resolvePersonalAttack,
  rollPersonalAttack,
  applyPersonalDamage,
  weaponTargetNumber,
  movePersonalCombatRange,
  resolvePersonalMorale,
  endPersonalCombatRecovery,
  stableDocumentId
} from '../../packages/classic-traveller-rules/index.js';

export const ENCOUNTER_DOCUMENT_TYPE = 'graycloak-traveller-personal-encounter';
export const CURRENT_ENCOUNTER_DOCUMENT_SCHEMA_VERSION = 7;
export const SUPPORTED_ENCOUNTER_DOCUMENT_SCHEMA_VERSIONS = Object.freeze([1, 2, 3, 4, 5, 6, 7]);
// Book 1 p.32: escape is thrown at 9+, with a DM for the range escaped from.
export const ESCAPE_TARGET = 9;
export const ESCAPE_RANGE_DMS = Object.freeze({ close: -1, short: -1, medium: 1, long: 2, 'very-long': 3 });
// v1 resolved every attack at one encounter-wide band. From v2 the band is
// computed per attacker-target pair from map positions, so the guide marker
// records which policy resolved a stored encounter.
export const ENCOUNTER_RANGE_GUIDE_VERSION = 'graycloak-band-guide-v2';
export const ENCOUNTER_STATUSES = Object.freeze(['active', 'victory', 'defeat', 'escaped', 'avoided', 'opposition-withdrew']);
export const ENCOUNTER_ACTOR_TYPES = Object.freeze(['pc', 'npc', 'robot', 'creature']);
export const ENCOUNTER_BODY_MODELS = Object.freeze(['biological', 'robotic', 'hybrid']);
export const ENCOUNTER_CONDITIONS = Object.freeze({
  biological: Object.freeze(['stunned', 'unconscious', 'dead']),
  robotic: Object.freeze(['disrupted', 'powered-down', 'disabled', 'destroyed']),
  hybrid: Object.freeze(['stunned', 'unconscious', 'disrupted', 'powered-down', 'disabled', 'dead', 'destroyed'])
});
export const ENCOUNTER_MAP_COLUMNS = 32;
export const ENCOUNTER_MAP_ROWS = 20;
export const ENCOUNTER_RANGE_GUIDE = Object.freeze({
  close: Object.freeze({ minimum: 0, maximum: 1, placement: 1 }),
  short: Object.freeze({ minimum: 2, maximum: 4, placement: 4 }),
  medium: Object.freeze({ minimum: 5, maximum: 8, placement: 8 }),
  long: Object.freeze({ minimum: 9, maximum: 14, placement: 14 }),
  'very-long': Object.freeze({ minimum: 15, maximum: null, placement: 20 })
});

export class EncounterDocumentValidationError extends Error {
  constructor(errors) {
    const list = Array.isArray(errors) ? errors : [String(errors)];
    super(`invalid Graycloak Traveller encounter document: ${list.join('; ')}`);
    this.name = 'EncounterDocumentValidationError';
    this.errors = Object.freeze([...list]);
  }
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function add(errors, condition, message) { if (!condition) errors.push(message); }
function nonblank(value) { return typeof value === 'string' && value.trim().length > 0; }
function plain(value) { return value && typeof value === 'object' && !Array.isArray(value); }
function parse(input) {
  if (typeof input !== 'string') return input;
  try { return JSON.parse(input); }
  catch (error) { throw new EncounterDocumentValidationError(`invalid JSON: ${error.message}`); }
}
function validDate(value) { return value && Number.isInteger(value.year) && Number.isInteger(value.dayOfYear) && value.dayOfYear >= 1 && value.dayOfYear <= 366; }
function clamp(value, minimum, maximum) { return Math.max(minimum, Math.min(maximum, value)); }
function initialEnemyColumn(range) { return { close: 5, short: 8, medium: 12, long: 18, 'very-long': 25 }[range]; }
function initialPosition(side, index, total, range) {
  const firstRow = clamp(Math.floor((ENCOUNTER_MAP_ROWS - total * 2) / 2), 1, ENCOUNTER_MAP_ROWS - 2);
  if (side === 'party') return { column: 4, row: clamp(firstRow + index * 2, 0, ENCOUNTER_MAP_ROWS - 1) };
  return { column: initialEnemyColumn(range), row: clamp(firstRow + index * 2, 0, ENCOUNTER_MAP_ROWS - 1) };
}
function withPosition(combatant, position) { return { ...combatant, position }; }
function withCurrentState(combatant, current = null, status = 'active') {
  return {
    ...combatant,
    current: current
      ? Object.fromEntries(['STR', 'DEX', 'END'].map((key) => [key, current[key]]))
      : combatant.current,
    status
  };
}
function characterEncounterStatus(character) {
  if (character.status?.alive === false) return 'dead';
  if (character.status?.consciousness === 'unconscious') return 'unconscious';
  return 'active';
}
function partyDocuments(character, characters) {
  const entries = Array.isArray(characters) && characters.length ? characters : character ? [character] : [];
  if (!entries.length || entries.some((entry) => !entry?.identity?.id)) throw new TypeError('one or more party characters are required');
  if (entries.length > 8) throw new RangeError('an encounter supports at most eight party characters');
  if (new Set(entries.map((entry) => entry.identity.id)).size !== entries.length) throw new TypeError('party character IDs must be unique');
  if (entries.every((entry) => characterEncounterStatus(entry) !== 'active')) throw new Error('at least one conscious living party character is required');
  return entries;
}

export function createEncounterDocument({ campaign, situation = null, character = null, characters = null, partyLoadouts = {}, opponent = null, opponents = null, title = null, encounterKey = null, date, range = 'medium', metersPerSquare = null, dice } = {}) {
  if (!campaign?.identity?.id) throw new TypeError('campaign is required');
  const characterDocuments = partyDocuments(character, characters);
  const opponentSpecs = Array.isArray(opponents) && opponents.length ? opponents : opponent ? [opponent] : [];
  if (!opponentSpecs.length || opponentSpecs.some((entry) => !nonblank(entry?.name))) throw new TypeError('one or more named opponents are required');
  if (opponentSpecs.length > 16) throw new RangeError('an encounter supports at most sixteen opponents');
  if (!validDate(date)) throw new TypeError('valid encounter date is required');
  if (!PERSONAL_COMBAT_RANGES.includes(range)) throw new RangeError(`unknown personal combat range: ${range}`);
  const party = characterDocuments.map((entry, index) => {
    const military = ['Navy', 'Army', 'Marines', 'Scouts'].includes(entry.career?.service);
    const loadout = partyLoadouts[entry.identity.id] ?? {};
    return { ...withPosition(withCurrentState(createPersonalCombatant({
      id: entry.identity.id, name: entry.identity.name, side: 'party', playerCharacter: true,
      characteristics: entry.characteristics, skills: entry.skills,
      armor: loadout.armor ?? opponentSpecs[0].playerArmor ?? 'none',
      weaponKey: loadout.weaponKey ?? opponentSpecs[0].playerWeaponKey ?? 'rifle',
      surpriseDM: (military ? 1 : 0) + Math.min(1, Number(entry.skills?.Leadership ?? 0)) + Math.min(1, Number(entry.skills?.Tactics ?? 0))
    }), entry.current, characterEncounterStatus(entry)), initialPosition('party', index, characterDocuments.length, range)), sourceActorId: entry.identity.id,
      actorType: 'pc', bodyModel: 'biological', tokenLabel: entry.identity.name.charAt(0).toUpperCase(), conditions: [] };
  });
  const hostiles = opponentSpecs.map((spec, index) => {
    const weaponKey = spec.weaponKey ?? 'automatic-pistol';
    const defaultSkill = getPersonalWeapon(weaponKey).skillNames[0];
    return { ...withPosition(withCurrentState(createPersonalCombatant({
      id: spec.id ?? stableDocumentId('foe', `${campaign.identity.id}|${encounterKey ?? situation?.identity?.id ?? date.dayOfYear}|${index}|${spec.name}`),
      name: spec.name, side: 'opposition', characteristics: spec.characteristics ?? { STR: 7, DEX: 7, END: 7, INT: 7 },
      skills: spec.skills ?? { [defaultSkill]: 0 }, armor: spec.armor ?? 'jack',
      weaponKey, surpriseDM: Number(spec.surpriseDM ?? 0)
    }), spec.current), initialPosition('opposition', index, opponentSpecs.length, range)), sourceActorId: spec.actorId ?? null,
      actorType: spec.actorType ?? 'npc', bodyModel: spec.bodyModel ?? (spec.actorType === 'robot' ? 'robotic' : 'biological'),
      tokenLabel: String(spec.tokenLabel ?? spec.name).charAt(0).toUpperCase(), conditions: Array.isArray(spec.conditions) ? [...spec.conditions] : [] };
  });
  const surprise = resolvePersonalSurprise({
    sides: [
      { id: 'party', combatants: party.filter((entry) => entry.status === 'active') },
      { id: 'opposition', combatants: hostiles.filter((entry) => entry.status === 'active') }
    ],
    dice
  });
  const seed = `${campaign.identity.id}|${encounterKey ?? situation?.identity?.id ?? 'encounter'}|${date.year}-${date.dayOfYear}`;
  const encounterTitle = nonblank(title) ? title.trim() : `Encounter / ${opponentSpecs[0].name}${opponentSpecs.length > 1 ? ` +${opponentSpecs.length - 1}` : ''}`;
  const document = {
    documentType: ENCOUNTER_DOCUMENT_TYPE,
    schemaVersion: CURRENT_ENCOUNTER_DOCUMENT_SCHEMA_VERSION,
    identity: { id: stableDocumentId('encounter', seed), title: encounterTitle },
    campaignId: campaign.identity.id,
    situationId: situation?.identity?.id ?? null,
    location: {
      systemId: situation?.location?.systemId ?? campaign.location.systemId,
      systemName: situation?.location?.systemName ?? campaign.location.systemName
    },
    timing: { createdDate: { year: date.year, dayOfYear: date.dayOfYear }, resolvedDate: null },
    status: 'active', round: 1, range, surprise,
    map: { grid: 'square', columns: ENCOUNTER_MAP_COLUMNS, rows: ENCOUNTER_MAP_ROWS, rangeGuide: ENCOUNTER_RANGE_GUIDE_VERSION, metersPerSquare },
    roundState: { declaredActions: [] },
    combatants: [...party, ...hostiles],
    history: [{ round: 0, kind: 'surprise', text: surprise.surpriseSideId ? `${surprise.surpriseSideId} achieved surprise.` : 'Neither side achieved surprise.', detail: surprise }],
    outcome: null,
    provenance: { rulesBasis: 'classic-traveller-book-1-personal-combat-1981-facsimile-errata', setting: 'Sea of Suns' }
  };
  assertValidEncounterDocument(document);
  return document;
}

export function validateEncounterDocument(document) {
  const errors = [];
  add(errors, document && typeof document === 'object' && !Array.isArray(document), 'document must be an object');
  if (!document || typeof document !== 'object' || Array.isArray(document)) return errors;
  add(errors, document.documentType === ENCOUNTER_DOCUMENT_TYPE, `documentType must be ${ENCOUNTER_DOCUMENT_TYPE}`);
  add(errors, document.schemaVersion === CURRENT_ENCOUNTER_DOCUMENT_SCHEMA_VERSION, `schemaVersion must be ${CURRENT_ENCOUNTER_DOCUMENT_SCHEMA_VERSION}`);
  add(errors, nonblank(document.identity?.id) && nonblank(document.identity?.title), 'identity must contain id and title');
  add(errors, nonblank(document.campaignId), 'campaignId must be nonblank');
  add(errors, document.situationId === null || nonblank(document.situationId), 'situationId must be null or nonblank');
  add(errors, nonblank(document.location?.systemId) && nonblank(document.location?.systemName), 'location must contain systemId and systemName');
  add(errors, validDate(document.timing?.createdDate), 'timing.createdDate must be valid');
  add(errors, document.timing?.resolvedDate === null || validDate(document.timing?.resolvedDate), 'timing.resolvedDate must be null or valid');
  add(errors, ENCOUNTER_STATUSES.includes(document.status), 'status is invalid');
  add(errors, Number.isInteger(document.round) && document.round >= 1, 'round must be a positive integer');
  add(errors, PERSONAL_COMBAT_RANGES.includes(document.range), 'range is invalid');
  for (const declaration of document.roundState?.declaredActions ?? []) {
    add(errors, nonblank(declaration.side), 'each declared action must name the acting side');
  }
  add(errors, document.map?.grid === 'square' && document.map?.columns === ENCOUNTER_MAP_COLUMNS && document.map?.rows === ENCOUNTER_MAP_ROWS && document.map?.rangeGuide === ENCOUNTER_RANGE_GUIDE_VERSION, 'map must be the supported square encounter workspace');
  add(errors, document.map?.metersPerSquare === null || (typeof document.map?.metersPerSquare === 'number' && Number.isFinite(document.map.metersPerSquare) && document.map.metersPerSquare > 0 && document.map.metersPerSquare <= 1000), 'map.metersPerSquare must be null or a positive number no greater than 1000');
  add(errors, plain(document.roundState) && Array.isArray(document.roundState?.declaredActions), 'roundState must contain declaredActions');
  if (Array.isArray(document.roundState?.declaredActions)) for (const declaration of document.roundState.declaredActions) {
    add(errors, nonblank(declaration.actorId) && ['attack', 'evade', 'close', 'open', 'escape', 'wait'].includes(declaration.action), 'declared party action is invalid');
    add(errors, Number.isInteger(declaration.modifier) && declaration.modifier >= -20 && declaration.modifier <= 20, 'declared party action modifier is invalid');
    add(errors, declaration.targetId === null || nonblank(declaration.targetId), 'declared party action target is invalid');
  }
  add(errors, plain(document.surprise) && Array.isArray(document.surprise.results) && document.surprise.results.length === 2, 'surprise must contain two side results');
  if (plain(document.surprise)) {
    add(errors, Number.isInteger(document.surprise.margin) && document.surprise.margin >= 0, 'surprise.margin must be a non-negative integer');
    add(errors, document.surprise.surpriseSideId === null || nonblank(document.surprise.surpriseSideId), 'surprise.surpriseSideId is invalid');
    add(errors, document.surprise.surprisedSideId === null || nonblank(document.surprise.surprisedSideId), 'surprise.surprisedSideId is invalid');
  }
  add(errors, Array.isArray(document.combatants) && document.combatants.length >= 2, 'combatants must contain at least two entries');
  if (Array.isArray(document.combatants)) for (const entry of document.combatants) {
    // A side is any nonblank label: 'party' and 'opposition' are the usual two,
    // but a third faction is a legitimate encounter.
    add(errors, nonblank(entry.id) && nonblank(entry.name) && nonblank(entry.side), 'combatant identity is invalid');
    for (const key of ['STR', 'DEX', 'END', 'INT']) add(errors, Number.isInteger(entry.characteristics?.[key]) && entry.characteristics[key] >= 0, `combatant ${entry.name ?? ''} ${key} is invalid`);
    for (const key of ['STR', 'DEX', 'END']) add(errors, Number.isInteger(entry.current?.[key]) && entry.current[key] >= 0, `combatant ${entry.name ?? ''} current ${key} is invalid`);
    add(errors, plain(entry.skills), `combatant ${entry.name ?? ''} skills are invalid`);
    add(errors, Number.isInteger(entry.position?.column) && entry.position.column >= 0 && entry.position.column < ENCOUNTER_MAP_COLUMNS, `combatant ${entry.name ?? ''} map column is invalid`);
    add(errors, Number.isInteger(entry.position?.row) && entry.position.row >= 0 && entry.position.row < ENCOUNTER_MAP_ROWS, `combatant ${entry.name ?? ''} map row is invalid`);
    add(errors, PERSONAL_ARMOR_TYPES.includes(entry.armor), `combatant ${entry.name ?? ''} armor is invalid`);
    try { getPersonalWeapon(entry.weaponKey); } catch (error) { errors.push(error.message); }
    add(errors, PERSONAL_COMBAT_STATUSES.includes(entry.status), `combatant ${entry.name ?? ''} status is invalid`);
    add(errors, entry.sourceActorId === null || nonblank(entry.sourceActorId), `combatant ${entry.name ?? ''} sourceActorId is invalid`);
    add(errors, ENCOUNTER_ACTOR_TYPES.includes(entry.actorType), `combatant ${entry.name ?? ''} actorType is invalid`);
    add(errors, ENCOUNTER_BODY_MODELS.includes(entry.bodyModel), `combatant ${entry.name ?? ''} bodyModel is invalid`);
    add(errors, typeof entry.tokenLabel === 'string' && entry.tokenLabel.length <= 3, `combatant ${entry.name ?? ''} tokenLabel is invalid`);
    add(errors, Array.isArray(entry.conditions) && entry.conditions.every((condition) => ENCOUNTER_CONDITIONS[entry.bodyModel]?.includes(condition)), `combatant ${entry.name ?? ''} conditions are invalid`);
  }
  if (Array.isArray(document.combatants)) {
    add(errors, document.combatants.some((entry) => entry.side === 'party'), 'combatants require a party side');
    add(errors, document.combatants.some((entry) => entry.side !== 'party'), 'combatants require at least one side opposing the party');
    add(errors, new Set(document.combatants.map((entry) => entry.id)).size === document.combatants.length, 'combatant IDs must be unique');
    // Any side may be given orders, so a declaration must name a combatant in
    // the encounter and match that combatant's own side.
    const combatantSides = new Map(document.combatants.map((entry) => [entry.id, entry.side]));
    add(errors, new Set((document.roundState?.declaredActions ?? []).map((entry) => entry.actorId)).size === (document.roundState?.declaredActions ?? []).length, 'a combatant may declare only once per round');
    add(errors, (document.roundState?.declaredActions ?? []).every((entry) => combatantSides.has(entry.actorId)), 'declared action actor must be a combatant in this encounter');
    add(errors, (document.roundState?.declaredActions ?? []).every((entry) => combatantSides.get(entry.actorId) === entry.side), 'declared action side must match the actor');
  }
  add(errors, Array.isArray(document.history), 'history must be an array');
  if (Array.isArray(document.history)) for (const entry of document.history) {
    add(errors, Number.isInteger(entry.round) && entry.round >= 0 && nonblank(entry.kind) && nonblank(entry.text), 'history entry is invalid');
  }
  add(errors, document.status === 'active' ? document.timing?.resolvedDate === null : validDate(document.timing?.resolvedDate), 'timing.resolvedDate does not match encounter status');
  add(errors, document.status === 'active' ? document.outcome === null : plain(document.outcome), 'outcome does not match encounter status');
  return errors;
}

export function assertValidEncounterDocument(document) {
  const errors = validateEncounterDocument(document);
  if (errors.length) throw new EncounterDocumentValidationError(errors);
  return document;
}

function scaleLegacyPosition(position, columns, rows) {
  return {
    column: clamp(Math.round(Number(position?.column ?? 0) * (ENCOUNTER_MAP_COLUMNS - 1) / Math.max(1, columns - 1)), 0, ENCOUNTER_MAP_COLUMNS - 1),
    row: clamp(Math.round(Number(position?.row ?? 0) * (ENCOUNTER_MAP_ROWS - 1) / Math.max(1, rows - 1)), 0, ENCOUNTER_MAP_ROWS - 1)
  };
}

function migrateEncounterDocument(document) {
  if (!SUPPORTED_ENCOUNTER_DOCUMENT_SCHEMA_VERSIONS.includes(document.schemaVersion)) throw new EncounterDocumentValidationError(`unsupported schemaVersion: ${document.schemaVersion}`);
  if (document.schemaVersion === 1) {
    document.map = { grid: 'square', columns: 12, rows: 8 };
    const opposition = document.combatants.filter((entry) => entry.side === 'opposition');
    const party = document.combatants.filter((entry) => entry.side === 'party');
    let oppositionIndex = 0;
    let partyIndex = 0;
    document.combatants = document.combatants.map((entry) => {
      const index = entry.side === 'opposition' ? oppositionIndex++ : partyIndex++;
      const total = entry.side === 'opposition' ? opposition.length : party.length;
      const legacyRows = 8;
      const firstRow = clamp(Math.floor((legacyRows - total) / 2), 0, legacyRows - 1);
      const position = entry.side === 'party'
        ? { column: 1, row: clamp(firstRow + index, 0, legacyRows - 1) }
        : { column: { close: 3, short: 5, medium: 7, long: 9, 'very-long': 10 }[document.range], row: clamp(firstRow + index, 0, legacyRows - 1) };
      return { ...entry, position };
    });
    document.schemaVersion = 2;
  }
  if (document.schemaVersion === 2) {
    const columns = document.map?.columns ?? 12;
    const rows = document.map?.rows ?? 8;
    document.combatants = document.combatants.map((entry) => ({ ...entry, position: scaleLegacyPosition(entry.position, columns, rows) }));
    document.map = { grid: 'square', columns: ENCOUNTER_MAP_COLUMNS, rows: ENCOUNTER_MAP_ROWS, rangeGuide: 'graycloak-band-guide-v1' };
    document.roundState = { declaredActions: [] };
    document.schemaVersion = 3;
  }
  if (document.schemaVersion === 3) {
    document.combatants = document.combatants.map((entry) => ({ ...entry, sourceActorId: entry.side === 'party' ? entry.id : null }));
    document.schemaVersion = 4;
  }
  if (document.schemaVersion === 4) {
    document.map = { ...document.map, metersPerSquare: null };
    document.combatants = document.combatants.map((entry) => ({
      ...entry,
      actorType: entry.playerCharacter ? 'pc' : 'npc',
      bodyModel: 'biological',
      tokenLabel: String(entry.name ?? '').charAt(0).toUpperCase(),
      conditions: []
    }));
    document.schemaVersion = 5;
  }
  if (document.schemaVersion === 5) {
    document.map = { ...document.map, rangeGuide: ENCOUNTER_RANGE_GUIDE_VERSION };
    document.schemaVersion = 6;
  }
  if (document.schemaVersion === 6) {
    // Declarations become side-bearing so any side may be given orders.
    document.roundState = {
      declaredActions: (document.roundState?.declaredActions ?? []).map((entry) => ({ ...entry, side: entry.side ?? 'party' }))
    };
    document.schemaVersion = 7;
  }
  return document;
}

export function importEncounterDocument(input) { const document = migrateEncounterDocument(clone(parse(input))); assertValidEncounterDocument(document); return document; }
export function exportEncounterDocument(document, { space = 2 } = {}) { return JSON.stringify(importEncounterDocument(document), null, space); }

function combatants(document, side) { return document.combatants.filter((entry) => entry.side === side); }
function replaceCombatants(document, ...entries) {
  const map = new Map(entries.map((entry) => [entry.id, entry]));
  document.combatants = document.combatants.map((entry) => map.get(entry.id) ?? entry);
}
function attackText(result) {
  const roll = `2D [${result.dice.join('] [')}] = ${result.roll}`;
  const defence = result.parryDM + result.evasionDM + result.defenderUntrainedDM + result.defenderDM;
  const signed = (value) => `${value >= 0 ? '+' : ''}${value}`;
  const dms = `SKILL ${signed(result.skillDM)} / CHAR ${signed(result.characteristicDM)} / UNTRAINED ${signed(result.untrainedDM)} / DEF ${signed(defence)} / SITUATION ${signed(result.situationalDM)}`;
  const placement = result.firstBloodRoll ? ` / WOUND LOCATION [${result.firstBloodRoll}]` : '';
  const wound = result.success ? ` / HIT ${result.damageDice.map((die) => `[${die}]`).join(' ')} = ${result.damageTotal}${placement} / ${result.defenderStatus.toUpperCase()}` : ' / NO EFFECT';
  return `${result.weaponName} / ${roll} / ${dms} / TOTAL ${result.total} vs ${result.target}+${wound}`;
}

export function encounterMapDistance(first, second) {
  if (!first?.position || !second?.position) throw new TypeError('two positioned combatants are required');
  return Math.max(Math.abs(first.position.column - second.position.column), Math.abs(first.position.row - second.position.row));
}

export function rangeBandForMapDistance(distance) {
  if (!Number.isInteger(distance) || distance < 0) throw new RangeError('map distance must be a non-negative integer');
  return PERSONAL_COMBAT_RANGES.find((range) => ENCOUNTER_RANGE_GUIDE[range].maximum === null || distance <= ENCOUNTER_RANGE_GUIDE[range].maximum);
}

export function encounterRangeGuide(document, actorId, targetId) {
  const encounter = importEncounterDocument(document);
  const actor = encounter.combatants.find((entry) => entry.id === actorId);
  const target = encounter.combatants.find((entry) => entry.id === targetId);
  if (!actor || !target || actor.side === target.side) throw new Error('range guide requires opposing combatants');
  const distance = encounterMapDistance(actor, target);
  const suggestedRange = rangeBandForMapDistance(distance);
  const meters = encounter.map.metersPerSquare === null ? null : Number((distance * encounter.map.metersPerSquare).toFixed(2));
  return { actorId, targetId, distance, meters, suggestedRange, authoritativeRange: encounter.range, matches: suggestedRange === encounter.range };
}

export function repositionEncounterCombatant(document, { combatantId, column, row } = {}) {
  const next = importEncounterDocument(document);
  if (next.status !== 'active') throw new Error('encounter is already resolved');
  if (!Number.isInteger(column) || column < 0 || column >= ENCOUNTER_MAP_COLUMNS || !Number.isInteger(row) || row < 0 || row >= ENCOUNTER_MAP_ROWS) throw new RangeError('map position is outside the encounter workspace');
  const current = next.combatants.find((entry) => entry.id === combatantId);
  if (!current) throw new Error('combatant is unavailable');
  if (current.position.column === column && current.position.row === row) return { encounter: next, entry: null };
  const prior = { ...current.position };
  current.position = { column, row };
  const distance = Math.max(Math.abs(prior.column - column), Math.abs(prior.row - row));
  const metric = next.map.metersPerSquare === null ? '' : ` / approximately ${Number((distance * next.map.metersPerSquare).toFixed(2))} m at the referee scale`;
  const entry = { round: next.round, kind: 'map-position', side: current.side, combatantId: current.id, text: `${current.name} repositioned ${distance} square${distance === 1 ? '' : 's'}${metric} on the visual map from ${prior.column + 1},${prior.row + 1} to ${column + 1},${row + 1}; Book 1 range remains ${next.range}.` };
  next.history.push(entry);
  assertValidEncounterDocument(next);
  return { encounter: next, entry };
}

function actorConditionKeys(actor) {
  return (actor.effects ?? [])
    .filter((effect) => effect?.active && effect.kind === 'condition')
    .map((effect) => effect.key)
    .filter((key) => ENCOUNTER_CONDITIONS[actor.profile?.bodyModel]?.includes(key));
}

export function addEncounterCombatantFromActor(document, { actor, side = 'opposition', column, row } = {}) {
  const next = importEncounterDocument(document);
  if (next.status !== 'active') throw new Error('encounter is already resolved');
  if (!actor?.identity?.id || !actor?.identity?.name || !actor?.profile?.bodyModel) throw new TypeError('a roster actor is required');
  if (!['party', 'opposition'].includes(side)) throw new RangeError('combatant side must be party or opposition');
  if (next.combatants.some((entry) => entry.sourceActorId === actor.identity.id)) throw new Error(`${actor.identity.name} is already in this encounter`);
  const sideCount = next.combatants.filter((entry) => entry.side === side).length;
  const sideLimit = side === 'party' ? 8 : 16;
  if (sideCount >= sideLimit) throw new RangeError(`${side} supports at most ${sideLimit} combatants`);
  if (!Number.isInteger(column) || column < 0 || column >= ENCOUNTER_MAP_COLUMNS || !Number.isInteger(row) || row < 0 || row >= ENCOUNTER_MAP_ROWS) throw new RangeError('map position is outside the encounter workspace');
  const weaponKey = actor.loadout?.weaponKey ?? 'hands';
  const combatant = {
    ...withCurrentState(createPersonalCombatant({
      id: stableDocumentId('participant', `${next.identity.id}|${actor.identity.id}`),
      name: actor.identity.name,
      side,
      characteristics: actor.characteristics,
      skills: actor.skills ?? {},
      armor: actor.loadout?.armor ?? 'none',
      weaponKey,
      surpriseDM: 0
    }), actor.current),
    position: { column, row },
    sourceActorId: actor.identity.id,
    actorType: actor.profile.actorType ?? 'npc',
    bodyModel: actor.profile.bodyModel,
    tokenLabel: String(actor.presentation?.tokenLabel || actor.identity.name).slice(0, 3).toUpperCase(),
    conditions: actorConditionKeys(actor)
  };
  next.combatants.push(combatant);
  const entry = { round: next.round, kind: 'placement', side, combatantId: combatant.id, sourceActorId: actor.identity.id, text: `${actor.identity.name} placed for ${side} at ${column + 1},${row + 1}; surprise is not rerolled and Book 1 range remains ${next.range}.` };
  next.history.push(entry);
  assertValidEncounterDocument(next);
  return { encounter: next, combatant, entry };
}

export function removeEncounterCombatant(document, { combatantId } = {}) {
  const next = importEncounterDocument(document);
  if (next.status !== 'active') throw new Error('encounter is already resolved');
  const combatant = next.combatants.find((entry) => entry.id === combatantId);
  if (!combatant) throw new Error('combatant is unavailable');
  if (next.combatants.filter((entry) => entry.side === combatant.side).length <= 1) throw new Error(`cannot remove the last ${combatant.side} combatant`);
  next.combatants = next.combatants.filter((entry) => entry.id !== combatantId);
  next.roundState.declaredActions = next.roundState.declaredActions.filter((entry) => entry.actorId !== combatantId && entry.targetId !== combatantId);
  const entry = { round: next.round, kind: 'removal', side: combatant.side, combatantId, sourceActorId: combatant.sourceActorId, text: `${combatant.name} removed from the encounter by the referee.` };
  next.history.push(entry);
  assertValidEncounterDocument(next);
  return { encounter: next, combatant, entry };
}

export function setEncounterCombatantCondition(document, { combatantId, condition = null, active = true } = {}) {
  const next = importEncounterDocument(document);
  const combatant = next.combatants.find((entry) => entry.id === combatantId);
  if (!combatant) throw new Error('combatant is unavailable');
  if (condition !== null && !ENCOUNTER_CONDITIONS[combatant.bodyModel].includes(condition)) throw new RangeError(`${condition} is not valid for a ${combatant.bodyModel} combatant`);
  const before = [...combatant.conditions];
  if (condition === null) combatant.conditions = [];
  else if (active && !combatant.conditions.includes(condition)) combatant.conditions.push(condition);
  else if (!active) combatant.conditions = combatant.conditions.filter((entry) => entry !== condition);
  const label = condition === null ? 'all referee conditions' : condition;
  const verb = condition === null ? 'cleared' : active ? 'applied' : 'removed';
  const entry = before.join('|') === combatant.conditions.join('|') ? null : {
    round: next.round, kind: 'condition', side: 'referee', combatantId, condition, active: condition === null ? false : active,
    text: `Referee ${verb} ${label} for ${combatant.name}; this annotation does not replace Book 1 wound status (${combatant.status}).`
  };
  if (entry) next.history.push(entry);
  assertValidEncounterDocument(next);
  return { encounter: next, combatant, entry };
}

export function setEncounterRangeFromPositions(document, { actorId, targetId } = {}) {
  const next = importEncounterDocument(document);
  if (next.status !== 'active') throw new Error('encounter is already resolved');
  const guide = encounterRangeGuide(next, actorId, targetId);
  const previousRange = next.range;
  next.range = guide.suggestedRange;
  const actor = next.combatants.find((entry) => entry.id === actorId);
  const target = next.combatants.find((entry) => entry.id === targetId);
  const entry = { round: next.round, kind: 'range', side: 'referee', actorId, targetId, text: `Referee sets Book 1 range ${previousRange} -> ${next.range} from the ${guide.distance}-square map guide between ${actor.name} and ${target.name}.` };
  next.history.push(entry);
  assertValidEncounterDocument(next);
  return { encounter: next, entry, guide: { ...guide, authoritativeRange: next.range, matches: true } };
}

function placeAtRange(actor, target, range) {
  if (!target) return;
  const distance = ENCOUNTER_RANGE_GUIDE[range].placement;
  const direction = actor.position.column <= target.position.column ? -1 : 1;
  let column = target.position.column + direction * distance;
  if (column < 0 || column >= ENCOUNTER_MAP_COLUMNS) column = target.position.column - direction * distance;
  actor.position.column = clamp(column, 0, ENCOUNTER_MAP_COLUMNS - 1);
  actor.position.row = target.position.row;
}

function nearestActiveOpponent(combatant, candidates) {
  const distanceSquared = (entry) => (combatant.position.column - entry.position.column) ** 2 + (combatant.position.row - entry.position.row) ** 2;
  return candidates
    .filter((entry) => entry.status === 'active')
    .sort((left, right) => distanceSquared(left) - distanceSquared(right) || left.id.localeCompare(right.id))[0] ?? null;
}

// Book 1 p.30 step 2B: each attack is thrown at the band between that
// attacker and that target, computed from their post-movement map positions.
export function encounterPairRange(first, second) {
  return rangeBandForMapDistance(encounterMapDistance(first, second));
}

// How many attacks the party has declared against each target this round.
// Declarations are the party's own information, so the UI may show this
// without revealing anything the characters would not know.
export function declaredTargetCounts(document) {
  const counts = {};
  for (const declaration of document.roundState?.declaredActions ?? []) {
    if (declaration.action !== 'attack' || !declaration.targetId) continue;
    counts[declaration.targetId] = (counts[declaration.targetId] ?? 0) + 1;
  }
  return counts;
}

function closestOpposingBand(entries) {
  const party = entries.filter((entry) => entry.side === 'party' && entry.status === 'active');
  const foes = entries.filter((entry) => entry.side === 'opposition' && entry.status === 'active');
  if (!party.length || !foes.length) return null;
  let best = Infinity;
  for (const actor of party) for (const foe of foes) best = Math.min(best, encounterMapDistance(actor, foe));
  return rangeBandForMapDistance(best);
}

// Declaring and resolving are separate acts. The referee sets orders for as
// many combatants as matter, looks at the board, and then commits the round;
// anyone left undeclared falls back to attacking their nearest enemy.
export function declareEncounterAction(document, { action = 'attack', modifier = 0, actorId = null, targetId = null } = {}) {
  const next = importEncounterDocument(document);
  if (next.status !== 'active') throw new Error('encounter is already resolved');
  if (!['attack', 'evade', 'close', 'open', 'escape', 'wait'].includes(action)) throw new RangeError(`unknown encounter action: ${action}`);
  if (!Number.isInteger(modifier) || modifier < -20 || modifier > 20) throw new RangeError('modifier must be an integer from -20 to 20');
  const active = next.combatants.filter((entry) => entry.status === 'active');
  const surpriseRound = next.round === 1 ? next.surprise.surpriseSideId : null;
  const mayAct = (side) => surpriseRound === null || surpriseRound === side;
  const declaredBy = (id) => next.roundState.declaredActions.find((entry) => entry.actorId === id) ?? null;
  const actor = actorId === null
    ? active.filter((entry) => entry.side === 'party').find((entry) => !declaredBy(entry.id))
    : active.find((entry) => entry.id === actorId);
  if (!actor) throw new Error(actorId ? 'selected actor is unavailable' : 'no active party actor remains');
  if (!mayAct(actor.side) && action !== 'wait') throw new Error(`${actor.name} is surprised and cannot act this round`);
  if (declaredBy(actor.id)) throw new Error(`${actor.name} already declared an action this round`);
  const target = targetId === null
    ? active.find((entry) => entry.side !== actor.side)
    : active.find((entry) => entry.id === targetId);
  if ((action === 'attack' || action === 'close' || action === 'open') && !target) throw new Error(targetId ? 'selected target is unavailable' : 'no active target remains');
  if (target && target.side === actor.side) throw new Error(`${actor.name} cannot target ${target.name} on the same side`);
  next.roundState.declaredActions.push({ actorId: actor.id, side: actor.side, action, modifier, targetId: target?.id ?? null });
  assertValidEncounterDocument(next);
  return {
    encounter: next,
    declaration: next.roundState.declaredActions[next.roundState.declaredActions.length - 1],
    awaitingActorIds: undeclaredCombatantIds(next)
  };
}

// Who is active, allowed to act, and has no orders yet.
export function undeclaredCombatantIds(document) {
  const surpriseRound = document.round === 1 ? document.surprise.surpriseSideId : null;
  const declared = new Set((document.roundState?.declaredActions ?? []).map((entry) => entry.actorId));
  return document.combatants
    .filter((entry) => entry.status === 'active' && !declared.has(entry.id))
    .filter((entry) => surpriseRound === null || surpriseRound === entry.side)
    .map((entry) => entry.id);
}

export function resolveDeclaredRound(document, { dice, date } = {}) {
  const next = importEncounterDocument(document);
  if (next.status !== 'active') throw new Error('encounter is already resolved');
  const everyone = next.combatants.map(clone);
  const active = everyone.filter((entry) => entry.status === 'active');
  const surpriseRound = next.round === 1 ? next.surprise.surpriseSideId : null;
  const mayAct = (side) => surpriseRound === null || surpriseRound === side;
  const declaredBy = (id) => next.roundState.declaredActions.find((entry) => entry.actorId === id) ?? null;

  const entries = [];
  const live = new Map(everyone.map((entry) => [entry.id, entry]));
  const declarations = next.roundState.declaredActions.filter((entry) => mayAct(entry.side));

  // --- Step 2A: movement and posture, resolved before any attack.
  for (const declaration of declarations) {
    const mover = live.get(declaration.actorId);
    const moveTarget = declaration.targetId === null ? null : live.get(declaration.targetId);
    if (declaration.action === 'close' || declaration.action === 'open') {
      const band = moveTarget ? movePersonalCombatRange(encounterPairRange(mover, moveTarget), declaration.action) : next.range;
      placeAtRange(mover, moveTarget, band);
      entries.push({ round: next.round, kind: 'movement', side: declaration.side, actorId: mover.id, targetId: moveTarget?.id ?? null, text: `${mover.name} moves to ${band} range${moveTarget ? ` from ${moveTarget.name}` : ''}.` });
    }
    if (declaration.action === 'escape') {
      const nearest = nearestActiveOpponent(mover, [...live.values()].filter((entry) => entry.side !== mover.side));
      const band = nearest ? encounterPairRange(mover, nearest) : next.range;
      const rangeDM = ESCAPE_RANGE_DMS[band];
      const results = [dice.rollD6(), dice.rollD6()];
      const total = results[0] + results[1] + rangeDM + declaration.modifier;
      entries.push({ round: next.round, kind: 'escape', side: declaration.side, actorId: mover.id, text: `${mover.name} escape / 2D [${results.join('] [')}] / RANGE ${rangeDM >= 0 ? '+' : ''}${rangeDM} / MOD ${declaration.modifier >= 0 ? '+' : ''}${declaration.modifier} / TOTAL ${total} vs ${ESCAPE_TARGET}+.` });
      if (total >= ESCAPE_TARGET) mover.status = 'escaped';
    }
    if (declaration.action === 'evade') mover.evading = true;
  }

  // --- Step 2B: every attack is thrown against this snapshot, so nobody's
  // wounds are known until the round ends (Book 1 p.30 step 2C).
  const snapshot = new Map([...live.values()].map((entry) => [entry.id, clone(entry)]));
  const pendingWounds = [];
  const throwAttack = (attackerId, defenderId, situationalDM, side) => {
    const attacker = snapshot.get(attackerId);
    const defender = snapshot.get(defenderId);
    if (!attacker || !defender || attacker.status !== 'active' || defender.status !== 'active') return;
    const band = encounterPairRange(attacker, defender);
    let result;
    try {
      result = rollPersonalAttack({ attacker, defender, range: band, situationalDM, dice });
    } catch (error) {
      entries.push({ round: next.round, kind: 'attack', side, actorId: attacker.id, targetId: defender.id, text: `${attacker.name} cannot engage ${defender.name} at ${band} range with ${getPersonalWeapon(attacker.weaponKey).name}.` });
      return;
    }
    const acting = live.get(attacker.id);
    acting.blows = result.attacker.blows;
    acting.evading = false;
    if (result.success) pendingWounds.push({ defenderId: defender.id, damageDice: result.damageDice, result });
    entries.push({ round: next.round, kind: 'attack', side, actorId: attacker.id, targetId: defender.id, band, text: '', prefix: `${attacker.name} attacks ${defender.name} at ${band} range`, detail: result });
  };

  for (const declaration of declarations.filter((entry) => entry.action === 'attack')) {
    throwAttack(declaration.actorId, declaration.targetId, declaration.modifier, declaration.side);
  }

  // Anyone active, allowed to act, and not given an order attacks their
  // nearest enemy — the referee directs who matters and lets the rest fight.
  for (const entry of active) {
    if (declaredBy(entry.id) || !mayAct(entry.side)) continue;
    const attacker = snapshot.get(entry.id);
    const foe = nearestActiveOpponent(attacker, [...snapshot.values()].filter((candidate) => candidate.side !== attacker.side));
    if (!foe) continue;
    const band = encounterPairRange(attacker, foe);
    if (weaponTargetNumber(attacker.weaponKey, foe.armor, band) === null) {
      const acting = live.get(entry.id);
      const closed = movePersonalCombatRange(band, 'close');
      placeAtRange(acting, live.get(foe.id) ?? foe, closed);
      snapshot.get(entry.id).position = { ...acting.position };
      entries.push({ round: next.round, kind: 'movement', side: entry.side, actorId: entry.id, targetId: foe.id, text: `${entry.name} cannot attack at ${band} range and closes to ${closed} range.` });
      continue;
    }
    throwAttack(entry.id, foe.id, 0, entry.side);
  }

  // --- Step 2C: wounds land after the last attack, in declaration order.
  for (const wound of pendingWounds) {
    const defender = live.get(wound.defenderId);
    const firstBloodRoll = defender.firstBlood ? dice.rollD6() : null;
    const damage = applyPersonalDamage(defender, wound.damageDice, firstBloodRoll);
    live.set(wound.defenderId, { ...damage.combatant, position: defender.position });
    wound.result.firstBloodRoll = firstBloodRoll;
    wound.result.allocations = damage.allocations;
    wound.result.defenderStatus = damage.status;
  }
  for (const entry of entries) {
    if (entry.kind !== 'attack' || !entry.detail) continue;
    entry.detail.defenderStatus ??= 'active';
    entry.text = `${entry.prefix}: ${attackText(entry.detail)}`;
    delete entry.prefix;
  }

  for (const entry of live.values()) entry.evading = false;
  replaceCombatants(next, ...live.values());
  next.range = closestOpposingBand(next.combatants) ?? next.range;
  next.roundState.declaredActions = [];
  const partyState = next.combatants.filter((entry) => entry.side === 'party');
  const partyDefeated = partyState.every((entry) => entry.status !== 'active');
  const partyEscaped = partyState.every((entry) => entry.status === 'escaped');
  const foesLeft = next.combatants.some((entry) => entry.side !== 'party' && entry.status === 'active');
  if (partyEscaped) { next.status = 'escaped'; next.outcome = { winner: null, reason: 'party-escaped' }; }
  else if (partyDefeated) { next.status = 'defeat'; next.outcome = { winner: 'opposition', reason: 'party-incapacitated' }; }
  else if (!foesLeft) { next.status = 'victory'; next.outcome = { winner: 'party', reason: 'opposition-incapacitated' }; }

  if (next.status === 'active') {
    const casualties = next.combatants.filter((entry) => entry.side !== 'party' && entry.status !== 'active').length;
    const originalStrength = next.combatants.filter((entry) => entry.side !== 'party').length;
    const morale = resolvePersonalMorale({ casualties, originalStrength, dice });
    if (morale.required) {
      entries.push({ round: next.round, kind: 'morale', side: 'opposition', text: `Opposition morale / 2D [${morale.dice.join('] [')}] / TOTAL ${morale.total} vs ${morale.target}+ / ${morale.stands ? 'STANDS' : 'WITHDRAWS'}.`, detail: morale });
      if (!morale.stands) {
        next.status = 'opposition-withdrew'; next.outcome = { winner: 'party', reason: 'morale' };
        next.combatants = next.combatants.map((entry) => entry.side !== 'party' && entry.status === 'active' ? { ...entry, status: 'withdrawn' } : entry);
      }
    }
  }
  next.history.push(...entries);
  if (next.status === 'active') next.round += 1;
  else {
    next.timing.resolvedDate = { year: date.year, dayOfYear: date.dayOfYear };
    next.combatants = next.combatants.map(endPersonalCombatRecovery);
  }
  assertValidEncounterDocument(next);
  return { encounter: next, entries, pending: false, awaitingActorIds: [] };
}

// Declare and, once every active party member has orders, resolve. Kept so a
// caller that does not want the two-step flow behaves exactly as before.
export function resolveEncounterRound(document, { action = 'attack', modifier = 0, actorId = null, targetId = null, dice, date } = {}) {
  const declared = declareEncounterAction(document, { action, modifier, actorId, targetId });
  const encounter = declared.encounter;
  const surpriseRound = encounter.round === 1 ? encounter.surprise.surpriseSideId : null;
  const partyMayAct = surpriseRound === null || surpriseRound === 'party';
  const declaredIds = new Set(encounter.roundState.declaredActions.map((entry) => entry.actorId));
  const awaitingParty = encounter.combatants
    .filter((entry) => entry.side === 'party' && entry.status === 'active' && !declaredIds.has(entry.id))
    .map((entry) => entry.id);
  if (partyMayAct && awaitingParty.length) {
    return { encounter, entries: [], pending: true, awaitingActorIds: awaitingParty };
  }
  return resolveDeclaredRound(encounter, { dice, date });
}

export function avoidEncounter(document, { date } = {}) {
  const next = importEncounterDocument(document);
  if (next.status !== 'active') throw new Error('encounter is already resolved');
  if (next.surprise.surpriseSideId !== 'party') throw new Error('the party can avoid only when it has surprise');
  next.status = 'avoided'; next.outcome = { winner: null, reason: 'party-avoided-contact' };
  next.timing.resolvedDate = { year: date.year, dayOfYear: date.dayOfYear };
  next.roundState.declaredActions = [];
  next.history.push({ round: 0, kind: 'avoidance', side: 'party', text: 'The party uses surprise to avoid the encounter.' });
  assertValidEncounterDocument(next);
  return next;
}

import {
  PERSONAL_COMBAT_RANGES,
  PERSONAL_ARMOR_TYPES,
  PERSONAL_COMBAT_STATUSES,
  getPersonalWeapon,
  createPersonalCombatant,
  resolvePersonalSurprise,
  resolvePersonalAttack,
  movePersonalCombatRange,
  resolvePersonalMorale,
  endPersonalCombatRecovery,
  stableDocumentId
} from '../../packages/classic-traveller-rules/index.js';

export const ENCOUNTER_DOCUMENT_TYPE = 'graycloak-traveller-personal-encounter';
export const CURRENT_ENCOUNTER_DOCUMENT_SCHEMA_VERSION = 3;
export const SUPPORTED_ENCOUNTER_DOCUMENT_SCHEMA_VERSIONS = Object.freeze([1, 2, 3]);
export const ENCOUNTER_STATUSES = Object.freeze(['active', 'victory', 'defeat', 'escaped', 'avoided', 'opposition-withdrew']);
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
function partyDocuments(character, characters) {
  const entries = Array.isArray(characters) && characters.length ? characters : character ? [character] : [];
  if (!entries.length || entries.some((entry) => !entry?.identity?.id)) throw new TypeError('one or more party characters are required');
  if (entries.length > 8) throw new RangeError('an encounter supports at most eight party characters');
  if (new Set(entries.map((entry) => entry.identity.id)).size !== entries.length) throw new TypeError('party character IDs must be unique');
  return entries;
}

export function createEncounterDocument({ campaign, situation = null, character = null, characters = null, partyLoadouts = {}, opponent = null, opponents = null, title = null, encounterKey = null, date, range = 'medium', dice } = {}) {
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
    return withPosition(createPersonalCombatant({
      id: entry.identity.id, name: entry.identity.name, side: 'party', playerCharacter: true,
      characteristics: entry.characteristics, skills: entry.skills,
      armor: loadout.armor ?? opponentSpecs[0].playerArmor ?? 'none',
      weaponKey: loadout.weaponKey ?? opponentSpecs[0].playerWeaponKey ?? 'rifle',
      surpriseDM: (military ? 1 : 0) + Math.min(1, Number(entry.skills?.Leadership ?? 0)) + Math.min(1, Number(entry.skills?.Tactics ?? 0))
    }), initialPosition('party', index, characterDocuments.length, range));
  });
  const hostiles = opponentSpecs.map((spec, index) => {
    const weaponKey = spec.weaponKey ?? 'automatic-pistol';
    const defaultSkill = getPersonalWeapon(weaponKey).skillNames[0];
    return withPosition(createPersonalCombatant({
      id: spec.id ?? stableDocumentId('foe', `${campaign.identity.id}|${encounterKey ?? situation?.identity?.id ?? date.dayOfYear}|${index}|${spec.name}`),
      name: spec.name, side: 'opposition', characteristics: spec.characteristics ?? { STR: 7, DEX: 7, END: 7, INT: 7 },
      skills: spec.skills ?? { [defaultSkill]: 0 }, armor: spec.armor ?? 'jack',
      weaponKey, surpriseDM: Number(spec.surpriseDM ?? 0)
    }), initialPosition('opposition', index, opponentSpecs.length, range));
  });
  const surprise = resolvePersonalSurprise({ sides: [{ id: 'party', combatants: party }, { id: 'opposition', combatants: hostiles }], dice });
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
    map: { grid: 'square', columns: ENCOUNTER_MAP_COLUMNS, rows: ENCOUNTER_MAP_ROWS, rangeGuide: 'graycloak-band-guide-v1' },
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
  add(errors, document.map?.grid === 'square' && document.map?.columns === ENCOUNTER_MAP_COLUMNS && document.map?.rows === ENCOUNTER_MAP_ROWS && document.map?.rangeGuide === 'graycloak-band-guide-v1', 'map must be the supported square encounter workspace');
  add(errors, plain(document.roundState) && Array.isArray(document.roundState?.declaredActions), 'roundState must contain declaredActions');
  if (Array.isArray(document.roundState?.declaredActions)) for (const declaration of document.roundState.declaredActions) {
    add(errors, nonblank(declaration.actorId) && ['attack', 'evade', 'close', 'open', 'escape', 'wait'].includes(declaration.action), 'declared party action is invalid');
    add(errors, Number.isInteger(declaration.modifier) && declaration.modifier >= -20 && declaration.modifier <= 20, 'declared party action modifier is invalid');
    add(errors, declaration.targetId === null || nonblank(declaration.targetId), 'declared party action target is invalid');
  }
  add(errors, plain(document.surprise) && Array.isArray(document.surprise.results) && document.surprise.results.length === 2, 'surprise must contain two side results');
  if (plain(document.surprise)) {
    add(errors, Number.isInteger(document.surprise.margin) && document.surprise.margin >= 0, 'surprise.margin must be a non-negative integer');
    add(errors, document.surprise.surpriseSideId === null || ['party', 'opposition'].includes(document.surprise.surpriseSideId), 'surprise.surpriseSideId is invalid');
    add(errors, document.surprise.surprisedSideId === null || ['party', 'opposition'].includes(document.surprise.surprisedSideId), 'surprise.surprisedSideId is invalid');
  }
  add(errors, Array.isArray(document.combatants) && document.combatants.length >= 2, 'combatants must contain at least two entries');
  if (Array.isArray(document.combatants)) for (const entry of document.combatants) {
    add(errors, nonblank(entry.id) && nonblank(entry.name) && ['party', 'opposition'].includes(entry.side), 'combatant identity is invalid');
    for (const key of ['STR', 'DEX', 'END', 'INT']) add(errors, Number.isInteger(entry.characteristics?.[key]) && entry.characteristics[key] >= 0, `combatant ${entry.name ?? ''} ${key} is invalid`);
    for (const key of ['STR', 'DEX', 'END']) add(errors, Number.isInteger(entry.current?.[key]) && entry.current[key] >= 0, `combatant ${entry.name ?? ''} current ${key} is invalid`);
    add(errors, plain(entry.skills), `combatant ${entry.name ?? ''} skills are invalid`);
    add(errors, Number.isInteger(entry.position?.column) && entry.position.column >= 0 && entry.position.column < ENCOUNTER_MAP_COLUMNS, `combatant ${entry.name ?? ''} map column is invalid`);
    add(errors, Number.isInteger(entry.position?.row) && entry.position.row >= 0 && entry.position.row < ENCOUNTER_MAP_ROWS, `combatant ${entry.name ?? ''} map row is invalid`);
    add(errors, PERSONAL_ARMOR_TYPES.includes(entry.armor), `combatant ${entry.name ?? ''} armor is invalid`);
    try { getPersonalWeapon(entry.weaponKey); } catch (error) { errors.push(error.message); }
    add(errors, PERSONAL_COMBAT_STATUSES.includes(entry.status), `combatant ${entry.name ?? ''} status is invalid`);
  }
  if (Array.isArray(document.combatants)) {
    add(errors, document.combatants.some((entry) => entry.side === 'party'), 'combatants require a party side');
    add(errors, document.combatants.some((entry) => entry.side === 'opposition'), 'combatants require an opposition side');
    add(errors, new Set(document.combatants.map((entry) => entry.id)).size === document.combatants.length, 'combatant IDs must be unique');
    const partyIds = new Set(document.combatants.filter((entry) => entry.side === 'party').map((entry) => entry.id));
    add(errors, new Set((document.roundState?.declaredActions ?? []).map((entry) => entry.actorId)).size === (document.roundState?.declaredActions ?? []).length, 'party combatants may declare only once per round');
    add(errors, (document.roundState?.declaredActions ?? []).every((entry) => partyIds.has(entry.actorId)), 'declared action actor must be a party combatant');
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
  return { actorId, targetId, distance, suggestedRange, authoritativeRange: encounter.range, matches: suggestedRange === encounter.range };
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
  const entry = { round: next.round, kind: 'map-position', side: current.side, combatantId: current.id, text: `${current.name} repositioned on the visual map from ${prior.column + 1},${prior.row + 1} to ${column + 1},${row + 1}; Book 1 range remains ${next.range}.` };
  next.history.push(entry);
  assertValidEncounterDocument(next);
  return { encounter: next, entry };
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

export function resolveEncounterRound(document, { action = 'attack', modifier = 0, actorId = null, targetId = null, dice, date } = {}) {
  const next = importEncounterDocument(document);
  if (next.status !== 'active') throw new Error('encounter is already resolved');
  if (!['attack', 'evade', 'close', 'open', 'escape', 'wait'].includes(action)) throw new RangeError(`unknown encounter action: ${action}`);
  if (!Number.isInteger(modifier) || modifier < -20 || modifier > 20) throw new RangeError('modifier must be an integer from -20 to 20');
  const party = combatants(next, 'party').map(clone);
  const foes = combatants(next, 'opposition').map(clone);
  const activeParty = party.filter((entry) => entry.status === 'active');
  const activeFoes = foes.filter((entry) => entry.status === 'active');
  const surpriseRound = next.round === 1 ? next.surprise.surpriseSideId : null;
  const partyMayAct = surpriseRound === null || surpriseRound === 'party';
  const oppositionMayAct = surpriseRound === null || surpriseRound === 'opposition';
  if (!partyMayAct && action !== 'wait') throw new Error('the party is surprised and cannot act in the surprise round');

  if (partyMayAct) {
    const actor = actorId === null ? activeParty.find((entry) => !next.roundState.declaredActions.some((declaration) => declaration.actorId === entry.id)) : activeParty.find((entry) => entry.id === actorId);
    if (!actor) throw new Error(actorId ? 'selected party actor is unavailable' : 'no active party actor remains');
    if (next.roundState.declaredActions.some((declaration) => declaration.actorId === actor.id)) throw new Error(`${actor.name} already declared an action this round`);
    const target = targetId === null ? activeFoes[0] : activeFoes.find((entry) => entry.id === targetId);
    if ((action === 'attack' || action === 'close' || action === 'open') && !target) throw new Error(targetId ? 'selected target is unavailable' : 'no active target remains');
    next.roundState.declaredActions.push({ actorId: actor.id, action, modifier, targetId: target?.id ?? null });
    if (next.roundState.declaredActions.length < activeParty.length) {
      assertValidEncounterDocument(next);
      return { encounter: next, entries: [], pending: true, awaitingActorIds: activeParty.filter((entry) => !next.roundState.declaredActions.some((declaration) => declaration.actorId === entry.id)).map((entry) => entry.id) };
    }
  }

  const entries = [];
  let range = next.range;
  const finalParty = new Map(party.map((entry) => [entry.id, entry]));
  const finalFoes = new Map(foes.map((entry) => [entry.id, entry]));
  const declarations = partyMayAct ? next.roundState.declaredActions : [];

  for (const declaration of declarations) {
    const actor = finalParty.get(declaration.actorId);
    const target = declaration.targetId === null ? null : finalFoes.get(declaration.targetId);
    if (declaration.action === 'close' || declaration.action === 'open') {
      range = movePersonalCombatRange(range, declaration.action);
      placeAtRange(actor, target, range);
      entries.push({ round: next.round, kind: 'movement', side: 'party', actorId: actor.id, targetId: target?.id ?? null, text: `${actor.name} moves to ${range} range${target ? ` from ${target.name}` : ''}.` });
    }
    if (declaration.action === 'escape') {
      const rangeDM = { close: -1, short: -1, medium: 1, long: 2, 'very-long': 3 }[range];
      const results = [dice.rollD6(), dice.rollD6()];
      const total = results[0] + results[1] + rangeDM + declaration.modifier;
      entries.push({ round: next.round, kind: 'escape', side: 'party', actorId: actor.id, text: `${actor.name} escape / 2D [${results.join('] [')}] / RANGE ${rangeDM >= 0 ? '+' : ''}${rangeDM} / MOD ${declaration.modifier >= 0 ? '+' : ''}${declaration.modifier} / TOTAL ${total} vs 7+.` });
      if (total >= 7) actor.status = 'escaped';
    }
    if (declaration.action === 'evade') actor.evading = true;
  }

  for (const declaration of declarations.filter((entry) => entry.action === 'attack')) {
    const actor = finalParty.get(declaration.actorId);
    const target = finalFoes.get(declaration.targetId);
    const result = resolvePersonalAttack({ attacker: actor, defender: target, range, situationalDM: declaration.modifier, dice });
    finalParty.set(actor.id, { ...result.attacker, position: actor.position });
    finalFoes.set(target.id, { ...result.defender, position: target.position });
    entries.push({ round: next.round, kind: 'attack', side: 'party', actorId: actor.id, targetId: target.id, text: `${actor.name} attacks ${target.name}: ${attackText(result)}`, detail: result });
  }

  if (oppositionMayAct) {
    let oppositionClosed = false;
    const declaredTargets = new Map(activeFoes.map((foe) => [foe.id, nearestActiveOpponent(foe, [...finalParty.values()])?.id ?? null]));
    for (const foe of activeFoes) {
      const defenderId = declaredTargets.get(foe.id);
      const woundedDefender = defenderId === null ? null : finalParty.get(defenderId);
      if (!woundedDefender) break;
      try {
        const defender = woundedDefender.status === 'active' ? woundedDefender : { ...clone(woundedDefender), status: 'active' };
        const result = resolvePersonalAttack({ attacker: foe, defender, range, dice });
        const woundedFoe = finalFoes.get(foe.id);
        finalFoes.set(foe.id, { ...result.attacker, current: woundedFoe.current, status: woundedFoe.status, firstBlood: woundedFoe.firstBlood, hitsTaken: woundedFoe.hitsTaken, position: woundedFoe.position });
        finalParty.set(woundedDefender.id, { ...result.defender, position: woundedDefender.position });
        entries.push({ round: next.round, kind: 'attack', side: 'opposition', actorId: foe.id, targetId: woundedDefender.id, text: `${foe.name} attacks ${woundedDefender.name}: ${attackText(result)}`, detail: result });
      } catch (error) {
        if (oppositionClosed) continue;
        const previousRange = range;
        range = movePersonalCombatRange(range, 'close');
        const target = woundedDefender;
        for (const entry of activeFoes) placeAtRange(finalFoes.get(entry.id), target, range);
        entries.push({ round: next.round, kind: 'movement', side: 'opposition', actorId: foe.id, text: `${foe.name} cannot attack at ${previousRange} range; the opposition closes to ${range} range.` });
        oppositionClosed = true;
      }
    }
  }

  for (const entry of finalParty.values()) entry.evading = false;
  replaceCombatants(next, ...finalParty.values(), ...finalFoes.values());
  next.range = range;
  next.roundState.declaredActions = [];
  const partyDefeated = [...finalParty.values()].every((entry) => entry.status !== 'active');
  const partyEscaped = [...finalParty.values()].every((entry) => entry.status === 'escaped');
  if (partyEscaped) { next.status = 'escaped'; next.outcome = { winner: null, reason: 'party-escaped' }; }
  else if (partyDefeated) { next.status = 'defeat'; next.outcome = { winner: 'opposition', reason: 'party-incapacitated' }; }
  else if ([...finalFoes.values()].every((entry) => entry.status !== 'active')) { next.status = 'victory'; next.outcome = { winner: 'party', reason: 'opposition-incapacitated' }; }

  if (next.status === 'active') {
    const casualties = next.combatants.filter((entry) => entry.side === 'opposition' && entry.status !== 'active').length;
    const originalStrength = next.combatants.filter((entry) => entry.side === 'opposition').length;
    const morale = resolvePersonalMorale({ casualties, originalStrength, dice });
    if (morale.required) {
      entries.push({ round: next.round, kind: 'morale', side: 'opposition', text: `Opposition morale / 2D [${morale.dice.join('] [')}] / TOTAL ${morale.total} vs ${morale.target}+ / ${morale.stands ? 'STANDS' : 'WITHDRAWS'}.`, detail: morale });
      if (!morale.stands) {
        next.status = 'opposition-withdrew'; next.outcome = { winner: 'party', reason: 'morale' };
        next.combatants = next.combatants.map((entry) => entry.side === 'opposition' && entry.status === 'active' ? { ...entry, status: 'withdrawn' } : entry);
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

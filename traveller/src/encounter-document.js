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
export const CURRENT_ENCOUNTER_DOCUMENT_SCHEMA_VERSION = 2;
export const SUPPORTED_ENCOUNTER_DOCUMENT_SCHEMA_VERSIONS = Object.freeze([1, 2]);
export const ENCOUNTER_STATUSES = Object.freeze(['active', 'victory', 'defeat', 'escaped', 'avoided', 'opposition-withdrew']);
export const ENCOUNTER_MAP_COLUMNS = 12;
export const ENCOUNTER_MAP_ROWS = 8;

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
function initialEnemyColumn(range) { return { close: 3, short: 5, medium: 7, long: 9, 'very-long': 10 }[range]; }
function initialPosition(side, index, total, range) {
  if (side === 'party') return { column: 1, row: Math.floor(ENCOUNTER_MAP_ROWS / 2) };
  const firstRow = clamp(Math.floor((ENCOUNTER_MAP_ROWS - total) / 2), 0, ENCOUNTER_MAP_ROWS - 1);
  return { column: initialEnemyColumn(range), row: clamp(firstRow + index, 0, ENCOUNTER_MAP_ROWS - 1) };
}
function withPosition(combatant, position) { return { ...combatant, position }; }

export function createEncounterDocument({ campaign, situation = null, character, opponent = null, opponents = null, title = null, encounterKey = null, date, range = 'medium', dice } = {}) {
  if (!campaign?.identity?.id) throw new TypeError('campaign is required');
  if (!character?.identity?.id) throw new TypeError('character is required');
  const opponentSpecs = Array.isArray(opponents) && opponents.length ? opponents : opponent ? [opponent] : [];
  if (!opponentSpecs.length || opponentSpecs.some((entry) => !nonblank(entry?.name))) throw new TypeError('one or more named opponents are required');
  if (opponentSpecs.length > 8) throw new RangeError('an encounter supports at most eight opponents');
  if (!validDate(date)) throw new TypeError('valid encounter date is required');
  if (!PERSONAL_COMBAT_RANGES.includes(range)) throw new RangeError(`unknown personal combat range: ${range}`);
  const military = ['Navy', 'Army', 'Marines', 'Scouts'].includes(character.career?.service);
  const player = withPosition(createPersonalCombatant({
    id: character.identity.id, name: character.identity.name, side: 'party', playerCharacter: true,
    characteristics: character.characteristics, skills: character.skills,
    armor: opponentSpecs[0].playerArmor ?? 'none', weaponKey: opponentSpecs[0].playerWeaponKey ?? 'rifle',
    surpriseDM: (military ? 1 : 0) + Math.min(1, Number(character.skills?.Leadership ?? 0)) + Math.min(1, Number(character.skills?.Tactics ?? 0))
  }), initialPosition('party', 0, 1, range));
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
  const surprise = resolvePersonalSurprise({ sides: [{ id: 'party', combatants: [player] }, { id: 'opposition', combatants: hostiles }], dice });
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
    map: { grid: 'square', columns: ENCOUNTER_MAP_COLUMNS, rows: ENCOUNTER_MAP_ROWS },
    combatants: [player, ...hostiles],
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
  add(errors, document.map?.grid === 'square' && document.map?.columns === ENCOUNTER_MAP_COLUMNS && document.map?.rows === ENCOUNTER_MAP_ROWS, 'map must be the supported square encounter grid');
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
function migrateEncounterDocument(document) {
  if (!SUPPORTED_ENCOUNTER_DOCUMENT_SCHEMA_VERSIONS.includes(document.schemaVersion)) throw new EncounterDocumentValidationError(`unsupported schemaVersion: ${document.schemaVersion}`);
  if (document.schemaVersion === 1) {
    document.map = { grid: 'square', columns: ENCOUNTER_MAP_COLUMNS, rows: ENCOUNTER_MAP_ROWS };
    const opposition = document.combatants.filter((entry) => entry.side === 'opposition');
    let oppositionIndex = 0;
    document.combatants = document.combatants.map((entry) => {
      const index = entry.side === 'opposition' ? oppositionIndex++ : 0;
      return { ...entry, position: initialPosition(entry.side, index, entry.side === 'opposition' ? opposition.length : 1, document.range) };
    });
    document.schemaVersion = 2;
  }
  return document;
}
export function importEncounterDocument(input) { const document = migrateEncounterDocument(clone(parse(input))); assertValidEncounterDocument(document); return document; }
export function exportEncounterDocument(document, { space = 2 } = {}) { return JSON.stringify(importEncounterDocument(document), null, space); }

function combatant(document, side) { return document.combatants.find((entry) => entry.side === side); }
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

function shiftPosition(combatantEntry, columns) {
  combatantEntry.position.column = clamp(combatantEntry.position.column + columns, 0, ENCOUNTER_MAP_COLUMNS - 1);
}

export function resolveEncounterRound(document, { action = 'attack', modifier = 0, targetId = null, dice, date } = {}) {
  const next = importEncounterDocument(document);
  if (next.status !== 'active') throw new Error('encounter is already resolved');
  if (!['attack', 'evade', 'close', 'open', 'escape', 'wait'].includes(action)) throw new RangeError(`unknown encounter action: ${action}`);
  if (!Number.isInteger(modifier) || modifier < -20 || modifier > 20) throw new RangeError('modifier must be an integer from -20 to 20');
  const player = clone(combatant(next, 'party'));
  const foes = combatants(next, 'opposition').map(clone);
  const activeFoes = foes.filter((entry) => entry.status === 'active');
  const target = targetId === null ? activeFoes[0] : activeFoes.find((entry) => entry.id === targetId);
  if (action === 'attack' && !target) throw new Error(targetId ? 'selected target is unavailable' : 'no active target remains');
  const entries = [];
  let range = next.range;
  const surpriseRound = next.round === 1 ? next.surprise.surpriseSideId : null;
  const partyMayAct = surpriseRound === null || surpriseRound === 'party';
  const oppositionMayAct = surpriseRound === null || surpriseRound === 'opposition';
  if (!partyMayAct && action !== 'wait') throw new Error('the party is surprised and cannot act in the surprise round');
  if (action === 'close' || action === 'open') {
    range = movePersonalCombatRange(range, action);
    shiftPosition(player, action === 'close' ? 1 : -1);
    entries.push({ round: next.round, kind: 'movement', side: 'party', text: `${player.name} moves to ${range} range.` });
  }
  if (action === 'escape') {
    const rangeDM = { close: -1, short: -1, medium: 1, long: 2, 'very-long': 3 }[range];
    const results = [dice.rollD6(), dice.rollD6()];
    const total = results[0] + results[1] + rangeDM + modifier;
    entries.push({ round: next.round, kind: 'escape', side: 'party', text: `${player.name} escape / 2D [${results.join('] [')}] / RANGE ${rangeDM >= 0 ? '+' : ''}${rangeDM} / MOD ${modifier >= 0 ? '+' : ''}${modifier} / TOTAL ${total} vs 7+.` });
    if (total >= 7) {
      player.status = 'escaped'; next.status = 'escaped'; next.outcome = { winner: null, reason: 'party-escaped' };
    }
  }
  if (action === 'evade') player.evading = true;
  let playerAttack = null;
  if (action === 'attack' && partyMayAct) {
    playerAttack = resolvePersonalAttack({ attacker: player, defender: target, range, situationalDM: modifier, dice });
    entries.push({ round: next.round, kind: 'attack', side: 'party', targetId: target.id, text: `${player.name} attacks ${target.name}: ${attackText(playerAttack)}`, detail: playerAttack });
  }
  let finalPlayer = player;
  const finalFoes = new Map(foes.map((entry) => [entry.id, entry]));
  if (playerAttack) finalFoes.set(target.id, playerAttack.defender);
  if (next.status === 'active' && oppositionMayAct) {
    for (const foe of activeFoes) {
      try {
        const defender = finalPlayer.status === 'active' ? finalPlayer : { ...clone(finalPlayer), status: 'active' };
        const foeAttack = resolvePersonalAttack({ attacker: foe, defender, range, dice });
        finalPlayer = foeAttack.defender;
        const woundedState = finalFoes.get(foe.id);
        finalFoes.set(foe.id, {
          ...foeAttack.attacker,
          current: woundedState.current,
          status: woundedState.status,
          firstBlood: woundedState.firstBlood,
          hitsTaken: woundedState.hitsTaken,
          position: woundedState.position
        });
        entries.push({ round: next.round, kind: 'attack', side: 'opposition', targetId: player.id, text: `${foe.name} attacks ${player.name}: ${attackText(foeAttack)}`, detail: foeAttack });
      } catch (error) {
        const previousRange = range;
        range = movePersonalCombatRange(range, 'close');
        for (const entry of activeFoes) shiftPosition(finalFoes.get(entry.id), -1);
        entries.push({ round: next.round, kind: 'movement', side: 'opposition', text: `${foe.name} cannot attack at ${previousRange} range; the opposition closes to ${range} range.` });
        break;
      }
    }
  }
  finalPlayer.evading = false;
  replaceCombatants(next, finalPlayer, ...finalFoes.values());
  next.range = range;
  if (next.status === 'active') {
    if (finalPlayer.status === 'dead' || finalPlayer.status === 'unconscious') { next.status = 'defeat'; next.outcome = { winner: 'opposition', reason: finalPlayer.status }; }
    else if ([...finalFoes.values()].every((entry) => entry.status !== 'active')) { next.status = 'victory'; next.outcome = { winner: 'party', reason: 'opposition-incapacitated' }; }
  }
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
  return { encounter: next, entries };
}

export function avoidEncounter(document, { date } = {}) {
  const next = importEncounterDocument(document);
  if (next.status !== 'active') throw new Error('encounter is already resolved');
  if (next.surprise.surpriseSideId !== 'party') throw new Error('the party can avoid only when it has surprise');
  next.status = 'avoided'; next.outcome = { winner: null, reason: 'party-avoided-contact' };
  next.timing.resolvedDate = { year: date.year, dayOfYear: date.dayOfYear };
  next.history.push({ round: 0, kind: 'avoidance', side: 'party', text: 'The party uses surprise to avoid the encounter.' });
  assertValidEncounterDocument(next);
  return next;
}

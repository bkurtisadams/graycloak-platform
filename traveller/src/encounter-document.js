import {
  PERSONAL_COMBAT_RANGES,
  PERSONAL_ARMOR_TYPES,
  PERSONAL_COMBAT_STATUSES,
  getPersonalWeapon,
  createPersonalCombatant,
  resolvePersonalSurprise,
  resolvePersonalAttack,
  rollPersonalAttack,
  SURPRISE_DMS,
  surpriseDMTotal,
  applyPersonalDamage,
  weaponTargetNumber,
  personalMovementConsequences,
  resolvePersonalMorale,
  endPersonalCombatRecovery,
  stableDocumentId
} from '../vendor/classic-traveller-rules/index.js';

export const ENCOUNTER_DOCUMENT_TYPE = 'graycloak-traveller-personal-encounter';
export const CURRENT_ENCOUNTER_DOCUMENT_SCHEMA_VERSION = 15;
export const SUPPORTED_ENCOUNTER_DOCUMENT_SCHEMA_VERSIONS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
// Who decides a combatant's action: the referee (or its player), or the house
// NPC routine. Party members default to manual, everyone else to auto.
export const COMBATANT_TACTICS = Object.freeze(['manual', 'auto']);
// Book 1 p.31 surprise DMs. Five are derivable from the encounter itself; the
// referee supplies the three that describe circumstances the document does not
// model. Battle dress is not in the Book 1 armour list, so it stays a flag.
export const REFEREE_SURPRISE_CONDITIONS = Object.freeze(['inAVehicle', 'pouncerAnimals', 'battleDress']);
// Book 1 p.31 errata. Darkness is a property of the encounter; cover and
// concealment protect whoever is being shot at, whoever shoots; a folding
// stock belongs to the firer's weapon. None of them are per-attack ticks.
export const ENCOUNTER_LIGHTING = Object.freeze(['normal', 'darkness', 'darkness-light-intensifier']);
export const ENCOUNTER_LIGHTING_DMS = Object.freeze({ normal: 0, darkness: -9, 'darkness-light-intensifier': -6 });
export const COMBATANT_COVER = Object.freeze(['none', 'concealment', 'cover']);
export const COMBATANT_COVER_DMS = Object.freeze({ none: 0, concealment: -1, cover: -4 });
export const FOLDING_STOCK_DM = -1;
// Book 1 p.32: escape is thrown at 9+, with a DM for the range escaped from.
export const ESCAPE_TARGET = 9;
export const ESCAPE_RANGE_DMS = Object.freeze({ close: -1, short: -1, medium: 1, long: 2, 'very-long': 3 });
// v1 resolved every attack at one encounter-wide band. From v2 the band is
// computed per attacker-target pair from map positions, so the guide marker
// records which policy resolved a stored encounter.
export const ENCOUNTER_RANGE_GUIDE_VERSION = 'graycloak-meter-grid-v4';
export const ENCOUNTER_STATUSES = Object.freeze(['active', 'victory', 'defeat', 'escaped', 'avoided', 'opposition-withdrew']);
export const ENCOUNTER_ACTOR_TYPES = Object.freeze(['pc', 'npc', 'robot', 'creature']);
export const ENCOUNTER_BODY_MODELS = Object.freeze(['biological', 'robotic', 'hybrid']);
export const ENCOUNTER_CONDITIONS = Object.freeze({
  biological: Object.freeze(['stunned', 'unconscious', 'dead']),
  robotic: Object.freeze(['disrupted', 'powered-down', 'disabled', 'destroyed']),
  hybrid: Object.freeze(['stunned', 'unconscious', 'disrupted', 'powered-down', 'disabled', 'dead', 'destroyed'])
});
// v0.71.0: the board is scene-sized, not a kilometre. Positions stay in metre
// cells (column 0..columns-1, snapped to the grid scale), and the board is
// square so the canvas keeps square cells. ENCOUNTER_MAP_COLUMNS/ROWS remain
// as the largest permitted board and the size of pre-v0.71 encounters.
export const ENCOUNTER_MAP_COLUMNS = 1001;
export const ENCOUNTER_MAP_ROWS = 1001;
export const ENCOUNTER_MAP_MIN_METERS = 50;
// A staged Scene may be an interior room smaller than the generated-fight
// minimum. Scene Documents already guarantee at least 10 squares, so their
// absolute minimum is 10 m on the 1 m grid.
export const ENCOUNTER_SCENE_MIN_METERS = 10;
export const ENCOUNTER_METERS_PER_SQUARE = 5;
export const ENCOUNTER_GRID_SCALES = Object.freeze([1, 5, 25]);

// How big a board a fight needs: room for the initial range twice over plus a
// margin, in whole grid squares, never smaller than 40 squares a side and never
// beyond the kilometre. A medium-range fight on 5 m squares is 40x40 (200 m).
export function encounterBoardMeters(range, metersPerSquare = ENCOUNTER_METERS_PER_SQUARE) {
  const placement = ENCOUNTER_RANGE_GUIDE[range]?.placement ?? 50;
  const wanted = Math.max(40 * metersPerSquare, placement * 2 + 4 * metersPerSquare, ENCOUNTER_MAP_MIN_METERS);
  const squares = Math.ceil(wanted / metersPerSquare);
  return Math.min(ENCOUNTER_MAP_COLUMNS - 1, squares * metersPerSquare);
}
export const ENCOUNTER_METERS_PER_RANGE_BAND = 25;
export const ENCOUNTER_RANGE_GUIDE = Object.freeze({
  close: Object.freeze({ minimum: 0, maximum: 0, placement: 0 }),
  short: Object.freeze({ minimum: 1, maximum: 5, placement: 5 }),
  medium: Object.freeze({ minimum: 6, maximum: 50, placement: 50 }),
  long: Object.freeze({ minimum: 51, maximum: 250, placement: 250 }),
  'very-long': Object.freeze({ minimum: 251, maximum: 500, placement: 500 })
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
function snapToGrid(value, gridScale) { return Math.round(value / gridScale) * gridScale; }
// The party stands a quarter of the way across; the opposition stands the
// initial range away to the right. Rows are spread two squares apart around
// the middle, so a party of eight and sixteen foes both fit a 40-square board.
function initialPosition(side, index, total, range, { columns, rows, gridScale }) {
  const spacing = gridScale * 2;
  const firstRow = clamp(snapToGrid((rows - 1) / 2 - ((total - 1) * spacing) / 2, gridScale), 0, rows - 1);
  const row = clamp(firstRow + index * spacing, 0, rows - 1);
  const partyColumn = clamp(snapToGrid((columns - 1) * 0.25, gridScale), 0, columns - 1);
  if (side === 'party') return { column: partyColumn, row };
  const placement = Math.ceil(ENCOUNTER_RANGE_GUIDE[range].placement / gridScale) * gridScale;
  return { column: clamp(partyColumn + placement, 0, columns - 1), row };
}
function withPosition(combatant, position) { return { ...combatant, position }; }
function withCurrentState(combatant, current = null, status = 'active') {
  const next = {
    ...combatant,
    current: current
      ? Object.fromEntries(['STR', 'DEX', 'END'].map((key) => [key, current[key]]))
      : combatant.current,
    status
  };
  // Book 1 p.36: the blow allowance is endurance as the encounter opens, so a
  // character who arrives already wounded brings a smaller allowance.
  next.blowAllowance = next.current.END;
  next.blowsUsed = 0;
  return next;
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

export function createEncounterDocument({ campaign, situation = null, scene = null, character = null, characters = null, partyLoadouts = {}, opponent = null, opponents = null, title = null, encounterKey = null, date, range = 'medium', metersPerSquare = null, boardMeters = null, surpriseConditions = {}, dice } = {}) {
  if (!campaign?.identity?.id) throw new TypeError('campaign is required');
  const characterDocuments = partyDocuments(character, characters);
  const opponentSpecs = Array.isArray(opponents) && opponents.length ? opponents : opponent ? [opponent] : [];
  if (!opponentSpecs.length || opponentSpecs.some((entry) => !nonblank(entry?.name))) throw new TypeError('one or more named opponents are required');
  if (opponentSpecs.length > 16) throw new RangeError('an encounter supports at most sixteen opponents');
  if (!validDate(date)) throw new TypeError('valid encounter date is required');
  if (!PERSONAL_COMBAT_RANGES.includes(range)) throw new RangeError(`unknown personal combat range: ${range}`);
  // v0.72.0: a fight on a scene takes the scene's board and its staged tokens.
  const gridScale = scene ? scene.board.metersPerSquare : (metersPerSquare ?? ENCOUNTER_METERS_PER_SQUARE);
  if (!ENCOUNTER_GRID_SCALES.includes(gridScale)) throw new RangeError('grid scale must be 1, 5, or 25 meters');
  const sideMeters = scene ? scene.board.squares * scene.board.metersPerSquare : (boardMeters ?? encounterBoardMeters(range, gridScale));
  const minimumSideMeters = scene ? ENCOUNTER_SCENE_MIN_METERS : ENCOUNTER_MAP_MIN_METERS;
  const staged = new Map((scene?.tokens ?? []).map((token) => [token.actorId, token.position]));
  if (!Number.isInteger(sideMeters) || sideMeters < minimumSideMeters || sideMeters > ENCOUNTER_MAP_COLUMNS - 1 || sideMeters % gridScale !== 0) {
    throw new RangeError(`board size must be a whole number of grid squares between ${minimumSideMeters} m and 1000 m a side`);
  }
  const board = { columns: sideMeters + 1, rows: sideMeters + 1, gridScale };
  const party = characterDocuments.map((entry, index) => {
    const military = ['Navy', 'Army', 'Marines', 'Scouts'].includes(entry.career?.service);
    const loadout = partyLoadouts[entry.identity.id] ?? {};
    return { ...withPosition(withCurrentState(createPersonalCombatant({
      id: entry.identity.id, name: entry.identity.name, side: 'party', playerCharacter: true,
      characteristics: entry.characteristics, skills: entry.skills,
      armor: loadout.armor ?? opponentSpecs[0].playerArmor ?? 'none',
      weaponKey: loadout.weaponKey ?? opponentSpecs[0].playerWeaponKey ?? 'rifle',
      surpriseDM: (military ? 1 : 0) + Math.min(1, Number(entry.skills?.Leadership ?? 0)) + Math.min(1, Number(entry.skills?.Tactics ?? 0))
    }), entry.current, characterEncounterStatus(entry)), staged.get(entry.identity.id) ?? initialPosition('party', index, characterDocuments.length, range, board)), cover: 'none', foldingStock: false, tactics: 'manual', militaryExperience: military, sourceActorId: entry.identity.id,
      actorType: 'pc', bodyModel: 'biological', tokenLabel: entry.identity.name.charAt(0).toUpperCase(), conditions: [], contactIds: [] };
  });
  const hostiles = opponentSpecs.map((spec, index) => {
    const weaponKey = spec.weaponKey ?? 'automatic-pistol';
    const defaultSkill = getPersonalWeapon(weaponKey).skillNames[0];
    return { ...withPosition(withCurrentState(createPersonalCombatant({
      id: spec.id ?? stableDocumentId('foe', `${campaign.identity.id}|${encounterKey ?? situation?.identity?.id ?? date.dayOfYear}|${index}|${spec.name}`),
      name: spec.name, side: 'opposition', characteristics: spec.characteristics ?? { STR: 7, DEX: 7, END: 7, INT: 7 },
      skills: spec.skills ?? { [defaultSkill]: 0 }, armor: spec.armor ?? 'jack',
      weaponKey, surpriseDM: Number(spec.surpriseDM ?? 0)
    }), spec.current), (spec.actorId && staged.get(spec.actorId)) ?? initialPosition('opposition', index, opponentSpecs.length, range, board)), cover: 'none', foldingStock: false, tactics: 'auto', militaryExperience: Boolean(spec.militaryExperience), sourceActorId: spec.actorId ?? null,
      actorType: spec.actorType ?? 'npc', bodyModel: spec.bodyModel ?? (spec.actorType === 'robot' ? 'robotic' : 'biological'),
      tokenLabel: String(spec.tokenLabel ?? spec.name).charAt(0).toUpperCase(), conditions: Array.isArray(spec.conditions) ? [...spec.conditions] : [], contactIds: [] };
  });
  const partySurprise = surpriseConditionsForSide(party, surpriseConditions.party ?? {});
  const oppositionSurprise = surpriseConditionsForSide(hostiles, surpriseConditions.opposition ?? {});
  const surpriseThrow = resolvePersonalSurprise({
    sides: [
      { id: 'party', combatants: party.filter((entry) => entry.status === 'active'), dm: partySurprise.total },
      { id: 'opposition', combatants: hostiles.filter((entry) => entry.status === 'active'), dm: oppositionSurprise.total }
    ],
    dice
  });
  const surprise = {
    ...surpriseThrow,
    conditions: { party: partySurprise.conditions, opposition: oppositionSurprise.conditions }
  };
  const seed = `${campaign.identity.id}|${encounterKey ?? situation?.identity?.id ?? 'encounter'}|${date.year}-${date.dayOfYear}`;
  const encounterTitle = nonblank(title) ? title.trim() : `Encounter / ${opponentSpecs[0].name}${opponentSpecs.length > 1 ? ` +${opponentSpecs.length - 1}` : ''}`;
  const document = {
    documentType: ENCOUNTER_DOCUMENT_TYPE,
    schemaVersion: CURRENT_ENCOUNTER_DOCUMENT_SCHEMA_VERSION,
    identity: { id: stableDocumentId('encounter', seed), title: encounterTitle },
    campaignId: campaign.identity.id,
    situationId: situation?.identity?.id ?? null,
    sceneId: scene?.identity?.id ?? null,
    location: {
      systemId: situation?.location?.systemId ?? campaign.location.systemId,
      systemName: situation?.location?.systemName ?? campaign.location.systemName
    },
    timing: { createdDate: { year: date.year, dayOfYear: date.dayOfYear }, resolvedDate: null },
    status: 'active', round: 1, range, surprise,
    conditions: { lighting: 'normal' },
    map: { grid: 'square', columns: board.columns, rows: board.rows, rangeGuide: ENCOUNTER_RANGE_GUIDE_VERSION, metersPerSquare: gridScale },
    roundState: { declaredActions: [] },
    combatants: [...party, ...hostiles],
    history: [{ round: 0, kind: 'surprise', text: surprise.surpriseSideId ? `${surprise.surpriseSideId} achieved surprise.` : 'Neither side achieved surprise.', detail: surprise }],
    outcome: null,
    provenance: { rulesBasis: 'classic-traveller-book-1-personal-combat-1981-facsimile-errata', setting: 'Sea of Suns' }
  };
  if (range === 'close') {
    party.forEach((entry, index) => setContact(entry, hostiles[Math.min(index, hostiles.length - 1)]));
  }
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
  add(errors, document.sceneId === null || nonblank(document.sceneId), 'sceneId must be null or nonblank');
  add(errors, nonblank(document.location?.systemId) && nonblank(document.location?.systemName), 'location must contain systemId and systemName');
  add(errors, validDate(document.timing?.createdDate), 'timing.createdDate must be valid');
  add(errors, document.timing?.resolvedDate === null || validDate(document.timing?.resolvedDate), 'timing.resolvedDate must be null or valid');
  add(errors, ENCOUNTER_STATUSES.includes(document.status), 'status is invalid');
  add(errors, Number.isInteger(document.round) && document.round >= 1, 'round must be a positive integer');
  add(errors, PERSONAL_COMBAT_RANGES.includes(document.range), 'range is invalid');
  add(errors, ENCOUNTER_LIGHTING.includes(document.conditions?.lighting), 'encounter lighting is invalid');
  for (const declaration of document.roundState?.declaredActions ?? []) {
    add(errors, nonblank(declaration.side), 'each declared action must name the acting side');
  }
  add(errors, document.map?.grid === 'square' && document.map?.rangeGuide === ENCOUNTER_RANGE_GUIDE_VERSION, 'map must be the supported square encounter workspace');
  const minimumMapMeters = document.sceneId ? ENCOUNTER_SCENE_MIN_METERS : ENCOUNTER_MAP_MIN_METERS;
  add(errors, Number.isInteger(document.map?.columns) && document.map.columns === document.map?.rows && document.map.columns - 1 >= minimumMapMeters && document.map.columns <= ENCOUNTER_MAP_COLUMNS, `map must be square, between ${minimumMapMeters} m and 1000 m a side`);
  add(errors, ENCOUNTER_GRID_SCALES.includes(document.map?.metersPerSquare), 'map.metersPerSquare must be 1, 5, or 25');
  add(errors, plain(document.roundState) && Array.isArray(document.roundState?.declaredActions), 'roundState must contain declaredActions');
  if (Array.isArray(document.roundState?.declaredActions)) for (const declaration of document.roundState.declaredActions) {
    add(errors, nonblank(declaration.actorId) && ['attack', 'evade', 'close', 'open', 'close-run', 'open-run', 'escape', 'wait'].includes(declaration.action), 'declared party action is invalid');
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
    add(errors, COMBATANT_COVER.includes(entry.cover), `combatant ${entry.name ?? ''} cover is invalid`);
    add(errors, COMBATANT_TACTICS.includes(entry.tactics), `combatant ${entry.name ?? ''} tactics setting is invalid`);
    add(errors, Number.isInteger(entry.blowAllowance) && entry.blowAllowance >= 0, `combatant ${entry.name ?? ''} blow allowance is invalid`);
    add(errors, Number.isInteger(entry.blowsUsed) && entry.blowsUsed >= 0, `combatant ${entry.name ?? ''} blows used is invalid`);
    add(errors, typeof entry.foldingStock === 'boolean', `combatant ${entry.name ?? ''} folding stock flag is invalid`);
    for (const key of ['STR', 'DEX', 'END', 'INT']) add(errors, Number.isInteger(entry.characteristics?.[key]) && entry.characteristics[key] >= 0, `combatant ${entry.name ?? ''} ${key} is invalid`);
    for (const key of ['STR', 'DEX', 'END']) add(errors, Number.isInteger(entry.current?.[key]) && entry.current[key] >= 0, `combatant ${entry.name ?? ''} current ${key} is invalid`);
    add(errors, plain(entry.skills), `combatant ${entry.name ?? ''} skills are invalid`);
    add(errors, Number.isInteger(entry.position?.column) && entry.position.column >= 0 && entry.position.column < (document.map?.columns ?? ENCOUNTER_MAP_COLUMNS), `combatant ${entry.name ?? ''} map column is invalid`);
    add(errors, Number.isInteger(entry.position?.row) && entry.position.row >= 0 && entry.position.row < (document.map?.rows ?? ENCOUNTER_MAP_ROWS), `combatant ${entry.name ?? ''} map row is invalid`);
    add(errors, PERSONAL_ARMOR_TYPES.includes(entry.armor), `combatant ${entry.name ?? ''} armor is invalid`);
    try { getPersonalWeapon(entry.weaponKey); } catch (error) { errors.push(error.message); }
    add(errors, PERSONAL_COMBAT_STATUSES.includes(entry.status), `combatant ${entry.name ?? ''} status is invalid`);
    add(errors, entry.sourceActorId === null || nonblank(entry.sourceActorId), `combatant ${entry.name ?? ''} sourceActorId is invalid`);
    add(errors, ENCOUNTER_ACTOR_TYPES.includes(entry.actorType), `combatant ${entry.name ?? ''} actorType is invalid`);
    add(errors, ENCOUNTER_BODY_MODELS.includes(entry.bodyModel), `combatant ${entry.name ?? ''} bodyModel is invalid`);
    add(errors, typeof entry.tokenLabel === 'string' && entry.tokenLabel.length <= 3, `combatant ${entry.name ?? ''} tokenLabel is invalid`);
    add(errors, Array.isArray(entry.conditions) && entry.conditions.every((condition) => ENCOUNTER_CONDITIONS[entry.bodyModel]?.includes(condition)), `combatant ${entry.name ?? ''} conditions are invalid`);
    add(errors, Array.isArray(entry.contactIds) && entry.contactIds.every(nonblank), `combatant ${entry.name ?? ''} contacts are invalid`);
  }
  if (Array.isArray(document.combatants)) {
    add(errors, document.combatants.some((entry) => entry.side === 'party'), 'combatants require a party side');
    add(errors, document.combatants.some((entry) => entry.side !== 'party'), 'combatants require at least one side opposing the party');
    add(errors, new Set(document.combatants.map((entry) => entry.id)).size === document.combatants.length, 'combatant IDs must be unique');
    const combatantIds = new Set(document.combatants.map((entry) => entry.id));
    add(errors, document.combatants.every((entry) => (entry.contactIds ?? []).every((id) => id !== entry.id && combatantIds.has(id))), 'contacts must name another combatant');
    add(errors, document.combatants.every((entry) => (entry.contactIds ?? []).every((id) => document.combatants.find((other) => other.id === id)?.contactIds?.includes(entry.id))), 'contacts must be reciprocal');
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
  const legacyColumns = 201;
  const legacyRows = 201;
  return {
    column: clamp(Math.round(Number(position?.column ?? 0) * (legacyColumns - 1) / Math.max(1, columns - 1)), 0, legacyColumns - 1),
    row: clamp(Math.round(Number(position?.row ?? 0) * (legacyRows - 1) / Math.max(1, rows - 1)), 0, legacyRows - 1)
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
    document.map = { grid: 'square', columns: 201, rows: 201, rangeGuide: 'graycloak-band-guide-v1' };
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
  if (document.schemaVersion === 7) {
    document.conditions = { lighting: 'normal' };
    document.combatants = document.combatants.map((entry) => ({ ...entry, cover: 'none', foldingStock: false }));
    document.schemaVersion = 8;
  }
  if (document.schemaVersion === 8) {
    document.combatants = document.combatants.map((entry) => ({ ...entry, militaryExperience: Boolean(entry.militaryExperience) }));
    document.surprise = {
      ...document.surprise,
      conditions: document.surprise?.conditions ?? { party: {}, opposition: {} }
    };
    document.schemaVersion = 9;
  }
  if (document.schemaVersion === 9) {
    // Book 1 p.36: the allowance is endurance at the start of the encounter,
    // so a fight already under way keeps whatever endurance it has now.
    document.combatants = document.combatants.map((entry) => ({
      ...entry,
      blowAllowance: Number.isInteger(entry.blowAllowance) ? entry.blowAllowance : entry.current.END,
      blowsUsed: Number.isInteger(entry.blowsUsed) ? entry.blowsUsed : 0
    }));
    document.schemaVersion = 10;
  }
  if (document.schemaVersion === 10) {
    document.combatants = document.combatants.map((entry) => ({
      ...entry,
      tactics: COMBATANT_TACTICS.includes(entry.tactics) ? entry.tactics : (entry.side === 'party' ? 'manual' : 'auto')
    }));
    document.schemaVersion = 11;
  }
  if (document.schemaVersion === 11) {
    const oldColumns = document.map?.columns ?? 32;
    const oldRows = document.map?.rows ?? 20;
    const oldCombatants = document.combatants;
    document.combatants = oldCombatants.map((entry) => ({
      ...entry,
      position: scaleLegacyPosition(entry.position, oldColumns, oldRows),
      contactIds: oldCombatants
        .filter((other) => other.id !== entry.id && other.side !== entry.side && encounterMapDistance(entry, other) <= 1)
        .map((other) => other.id)
    }));
    document.map = { grid: 'square', columns: 201, rows: 201, rangeGuide: 'graycloak-5m-grid-v3', metersPerSquare: 5 };
    document.schemaVersion = 12;
  }
  if (document.schemaVersion === 12) {
    const scalePosition = (position) => ({ column: Number(position.column) * 5, row: Number(position.row) * 5 });
    document.combatants = document.combatants.map((entry) => ({ ...entry, position: scalePosition(entry.position) }));
    document.history = (document.history ?? []).map((entry) => entry.detail?.from && entry.detail?.to
      ? { ...entry, detail: {
        ...entry.detail,
        from: scalePosition(entry.detail.from), to: scalePosition(entry.detail.to),
        meters: Number(entry.detail.meters ?? Number(entry.detail.squares ?? 0) * 5),
        allowanceMeters: Number(entry.detail.allowanceMeters ?? Number(entry.detail.allowance ?? 0) * 5)
      } }
      : entry);
    document.map = { grid: 'square', columns: ENCOUNTER_MAP_COLUMNS, rows: ENCOUNTER_MAP_ROWS, rangeGuide: ENCOUNTER_RANGE_GUIDE_VERSION, metersPerSquare: ENCOUNTER_METERS_PER_SQUARE };
    document.schemaVersion = 13;
  }
  if (document.schemaVersion === 13) {
    // v0.71.0: boards are sized per encounter. A kilometre board stays a
    // kilometre; nothing about its positions changes.
    document.schemaVersion = 14;
  }
  if (document.schemaVersion === 14) {
    // v0.72.0: an encounter may be fought on a scene.
    document.sceneId = null;
    document.schemaVersion = 15;
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
  if (distance <= 1) return 'short';
  return PERSONAL_COMBAT_RANGES.find((range) => range !== 'close' && distance <= ENCOUNTER_RANGE_GUIDE[range].maximum) ?? 'very-long';
}

export function encounterRangeGuide(document, actorId, targetId) {
  const encounter = importEncounterDocument(document);
  const actor = encounter.combatants.find((entry) => entry.id === actorId);
  const target = encounter.combatants.find((entry) => entry.id === targetId);
  if (!actor || !target || actor.side === target.side) throw new Error('range guide requires opposing combatants');
  const distance = encounterMapDistance(actor, target);
  const suggestedRange = encounterPairRange(actor, target);
  const meters = distance;
  const squares = Number((meters / encounter.map.metersPerSquare).toFixed(2));
  return { actorId, targetId, distance, meters, squares, suggestedRange, authoritativeRange: encounter.range, matches: suggestedRange === encounter.range };
}

export function repositionEncounterCombatant(document, { combatantId, column, row } = {}) {
  const next = importEncounterDocument(document);
  if (!Number.isInteger(column) || column < 0 || column >= next.map.columns || !Number.isInteger(row) || row < 0 || row >= next.map.rows) throw new RangeError('map position is outside the encounter workspace');
  const current = next.combatants.find((entry) => entry.id === combatantId);
  if (!current) throw new Error('combatant is unavailable');
  if (current.position.column === column && current.position.row === row) return { encounter: next, entry: null };
  const prior = { ...current.position };
  current.position = { column, row };
  clearContacts(next, current);
  const distance = Math.max(Math.abs(prior.column - column), Math.abs(prior.row - row));
  const squares = Number((distance / next.map.metersPerSquare).toFixed(2));
  const entry = { round: next.round, kind: 'map-position', side: current.side, combatantId: current.id, text: `${current.name} repositioned ${distance} m / ${squares} grid square${squares === 1 ? '' : 's'} on the visual map from ${prior.column},${prior.row} to ${column},${row}; Book 1 range remains ${next.range}.` };
  next.history.push(entry);
  assertValidEncounterDocument(next);
  return { encounter: next, entry };
}

// A player drag during an active round is rules movement, not a referee map
// correction. It is limited to one walk/run, records the path, breaks contact,
// and makes running consume a blow and bar an attack.
export function moveEncounterCombatantByPlayer(document, { combatantId, column, row, pace = 'walk', round, replaceExisting = false } = {}) {
  const next = importEncounterDocument(document);
  if (next.status !== 'active' || round !== next.round) throw new Error('movement is not for the active encounter round');
  if (!Number.isInteger(column) || column < 0 || column >= next.map.columns || !Number.isInteger(row) || row < 0 || row >= next.map.rows) throw new RangeError('map position is outside the encounter workspace');
  const combatant = next.combatants.find((entry) => entry.id === combatantId && entry.status === 'active');
  if (!combatant) throw new Error('combatant is unavailable');
  const existingMoveIndex = next.history.findIndex((entry) => entry.round === next.round && entry.kind === 'movement' && entry.actorId === combatantId && entry.detail?.playerMove);
  if (existingMoveIndex >= 0 && !replaceExisting) throw new Error(`${combatant.name} already moved this round`);
  const existingMove = existingMoveIndex >= 0 ? next.history[existingMoveIndex] : null;
  const to = { column, row };
  const from = existingMove?.detail?.from ? { ...existingMove.detail.from } : { ...combatant.position };
  const meters = encounterMapDistance({ position: from }, { position: to });
  const consequences = personalMovementConsequences({ status: 'open', pace });
  const allowanceMeters = consequences.bands * ENCOUNTER_METERS_PER_RANGE_BAND;
  if (meters > allowanceMeters) throw new Error(`${pace} movement exceeds ${allowanceMeters} meters`);
  const squares = Number((meters / next.map.metersPerSquare).toFixed(2));
  if (existingMove) {
    combatant.blowsUsed = Math.max(0, Number(combatant.blowsUsed ?? 0) - Number(existingMove.detail?.blowCost ?? 0));
    next.history.splice(existingMoveIndex, 1);
  }
  clearContacts(next, combatant);
  combatant.position = to;
  if (consequences.blowCost) combatant.blowsUsed = Number(combatant.blowsUsed ?? 0) + consequences.blowCost;
  const entry = {
    round: next.round, kind: 'movement', side: combatant.side, actorId: combatant.id,
    text: `${combatant.name} ${pace}s ${meters} m / ${squares} grid square${squares === 1 ? '' : 's'}${consequences.blowCost ? '; running spends one combat blow and prevents an attack' : ''}.`,
    detail: { movementStatus: 'maneuver', pace, meters, squares, allowanceMeters, from, to, blowCost: consequences.blowCost, playerMove: true, revisedByReferee: Boolean(existingMove && replaceExisting) }
  };
  next.history.push(entry);
  next.range = closestOpposingBand(next.combatants) ?? next.range;
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
  if (!Number.isInteger(column) || column < 0 || column >= next.map.columns || !Number.isInteger(row) || row < 0 || row >= next.map.rows) throw new RangeError('map position is outside the encounter workspace');
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
    cover: 'none',
    foldingStock: false,
    tactics: side === 'party' ? 'manual' : 'auto',
    militaryExperience: false,
    sourceActorId: actor.identity.id,
    actorType: actor.profile.actorType ?? 'npc',
    bodyModel: actor.profile.bodyModel,
    tokenLabel: String(actor.presentation?.tokenLabel || actor.identity.name).slice(0, 3).toUpperCase(),
    conditions: actorConditionKeys(actor),
    contactIds: []
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
  clearContacts(next, combatant);
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

// Referee override of Book 1 wound status. Conditions are annotations and
// never move status, so this is the only way to put someone back on their
// feet. Restoring to active must also lift any zeroed characteristic off
// zero, or the next wound would immediately recompute them unconscious.
export function setCombatantTactics(document, { combatantId, tactics } = {}) {
  const next = importEncounterDocument(document);
  if (!COMBATANT_TACTICS.includes(tactics)) throw new RangeError(`unknown tactics setting: ${tactics}`);
  const combatant = next.combatants.find((entry) => entry.id === combatantId);
  if (!combatant) throw new Error('combatant is unavailable');
  combatant.tactics = tactics;
  assertValidEncounterDocument(next);
  return { encounter: next };
}

export function setCombatantStatus(document, { combatantId, status } = {}) {
  const next = importEncounterDocument(document);
  if (!PERSONAL_COMBAT_STATUSES.includes(status)) throw new RangeError(`unknown combat status: ${status}`);
  const combatant = next.combatants.find((entry) => entry.id === combatantId);
  if (!combatant) throw new Error('combatant is unavailable');
  const before = combatant.status;
  if (before === status) return { encounter: next, combatant, entry: null };
  combatant.status = status;
  const restored = [];
  if (status === 'active') {
    for (const key of ['STR', 'DEX', 'END']) {
      if (combatant.current[key] <= 0) { combatant.current[key] = 1; restored.push(key); }
    }
  }
  const entry = {
    round: next.round, kind: 'status', side: 'referee', combatantId,
    text: `Referee sets ${combatant.name} from ${before} to ${status}${restored.length ? `; ${restored.join(', ')} restored to 1 so the change holds` : ''}.`
  };
  next.history.push(entry);
  assertValidEncounterDocument(next);
  return { encounter: next, combatant, entry };
}

// Referee ends the fight without playing it out.
export function endEncounterByReferee(document, { date, reason = 'referee-ended' } = {}) {
  const next = importEncounterDocument(document);
  if (next.status !== 'active') throw new Error('encounter is already resolved');
  if (!validDate(date)) throw new TypeError('valid date is required');
  const partyStanding = next.combatants.some((entry) => entry.side === 'party' && entry.status === 'active');
  const foesStanding = next.combatants.some((entry) => entry.side !== 'party' && entry.status === 'active');
  next.status = !foesStanding ? 'victory' : !partyStanding ? 'defeat' : 'avoided';
  next.outcome = { winner: !foesStanding ? 'party' : !partyStanding ? 'opposition' : null, reason };
  next.roundState.declaredActions = [];
  next.timing.resolvedDate = { year: date.year, dayOfYear: date.dayOfYear };
  next.combatants = next.combatants.map(endPersonalCombatRecovery);
  const entry = { round: next.round, kind: 'outcome', side: 'referee', text: `Referee ends the encounter: ${next.status}.` };
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

// Referee range selection stays synchronized with the spatial workspace: the
// chosen actor is placed at the selected Book 1 band from the chosen target.
// Attacks continue to resolve from pairwise positions, so this is one state,
// not a second range system layered over the map.
export function setEncounterPairRange(document, { actorId, targetId, range } = {}) {
  const next = importEncounterDocument(document);
  if (next.status !== 'active') throw new Error('encounter is already resolved');
  if (!PERSONAL_COMBAT_RANGES.includes(range)) throw new RangeError(`unknown personal combat range: ${range}`);
  const actor = next.combatants.find((entry) => entry.id === actorId && entry.status === 'active');
  const target = next.combatants.find((entry) => entry.id === targetId && entry.status === 'active');
  if (!actor || !target || actor.side === target.side) throw new Error('range selection requires active opposing combatants');
  const previousRange = encounterPairRange(actor, target);
  clearContacts(next, actor);
  placeAtRange(actor, target, range, next.map);
  if (range === 'close') setContact(actor, target);
  const appliedRange = encounterPairRange(actor, target);
  next.range = closestOpposingBand(next.combatants) ?? appliedRange;
  const entry = {
    round: next.round, kind: 'range', side: 'referee', actorId, targetId,
    text: `Referee sets ${actor.name} -> ${target.name} Book 1 range ${previousRange} -> ${appliedRange}; the map position is synchronized.`
  };
  next.history.push(entry);
  assertValidEncounterDocument(next);
  return { encounter: next, entry, range: appliedRange };
}

function placeAtRange(actor, target, range, board = { columns: ENCOUNTER_MAP_COLUMNS, rows: ENCOUNTER_MAP_ROWS }) {
  if (!target) return;
  const distance = ENCOUNTER_RANGE_GUIDE[range].placement;
  const direction = actor.position.column <= target.position.column ? -1 : 1;
  let column = target.position.column + direction * distance;
  if (column < 0 || column >= board.columns) column = target.position.column - direction * distance;
  actor.position.column = clamp(column, 0, board.columns - 1);
  actor.position.row = target.position.row;
}

function moveOnMeterGrid(actor, target, direction, pace = 'walk', board = { columns: ENCOUNTER_MAP_COLUMNS, rows: ENCOUNTER_MAP_ROWS }) {
  const consequences = personalMovementConsequences({ status: direction, pace });
  const allowance = consequences.bands * ENCOUNTER_METERS_PER_RANGE_BAND;
  const from = { ...actor.position };
  const dx = target.position.column - actor.position.column;
  const dy = target.position.row - actor.position.row;
  const distance = Math.max(Math.abs(dx), Math.abs(dy));
  if (direction === 'close' && distance <= allowance) {
    actor.position = { ...target.position };
  } else {
    const sign = direction === 'close' ? 1 : -1;
    const stepX = distance ? Math.round((dx / distance) * allowance) : -allowance;
    const stepY = distance ? Math.round((dy / distance) * allowance) : 0;
    actor.position = {
      column: clamp(actor.position.column + sign * stepX, 0, board.columns - 1),
      row: clamp(actor.position.row + sign * stepY, 0, board.rows - 1)
    };
  }
  return { from, to: { ...actor.position }, meters: encounterMapDistance({ position: from }, actor), ...consequences };
}

function clearContacts(encounter, combatant) {
  for (const id of combatant.contactIds ?? []) {
    const other = encounter.combatants.find((entry) => entry.id === id);
    if (other) other.contactIds = (other.contactIds ?? []).filter((entry) => entry !== combatant.id);
  }
  combatant.contactIds = [];
}

function setContact(first, second) {
  first.contactIds = [...new Set([...(first.contactIds ?? []), second.id])];
  second.contactIds = [...new Set([...(second.contactIds ?? []), first.id])];
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
  if (first?.contactIds?.includes(second?.id) && second?.contactIds?.includes(first?.id)) return 'close';
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
// Book 1 p.31 errata, derived from state rather than re-ticked per attack:
// the encounter's lighting, the defender's cover, and whether the firer's
// weapon has a folding stock.
// Book 1 p.31: the surprise DM belongs to a side, not to one combatant.
// Leader, tactical and military experience come from the characters; the
// crowd penalties come from counting them; the rest the referee ticks.
// Graycloak ruling: "military experience" is service in the Navy, Army,
// Marines or Scouts, the book giving no definition.
export function surpriseConditionsForSide(combatants, overrides = {}) {
  const present = combatants.filter((entry) => entry.status === 'active');
  const has = (skill) => present.some((entry) => Number(entry.skills?.[skill] ?? 0) >= 1);
  const conditions = {
    leaderSkill: has('Leadership'),
    tacticalSkill: has('Tactics'),
    militaryExperience: present.some((entry) => entry.militaryExperience === true),
    eightOrMoreAdventurers: present.length >= 8,
    tenOrMoreAnimals: present.filter((entry) => entry.actorType === 'creature').length >= 10
  };
  for (const key of REFEREE_SURPRISE_CONDITIONS) conditions[key] = Boolean(overrides[key]);
  const parts = Object.entries(conditions)
    .filter(([, value]) => value)
    .map(([key]) => ({ key, dm: SURPRISE_DMS[key] }));
  return { conditions, parts, total: surpriseDMTotal(conditions) };
}

export function encounterSituationDMs(encounter, attacker, defender) {
  const parts = [];
  const lighting = encounter.conditions?.lighting ?? 'normal';
  if (lighting !== 'normal') {
    parts.push({ key: 'lighting', label: lighting === 'darkness' ? 'DARKNESS' : 'DARKNESS / INTENSIFIER', dm: ENCOUNTER_LIGHTING_DMS[lighting] });
  }
  if (defender?.cover && defender.cover !== 'none') {
    parts.push({ key: 'cover', label: defender.cover.toUpperCase(), dm: COMBATANT_COVER_DMS[defender.cover] });
  }
  if (attacker?.foldingStock) parts.push({ key: 'foldingStock', label: 'FOLDING STOCK', dm: FOLDING_STOCK_DM });
  return { parts, total: parts.reduce((sum, part) => sum + part.dm, 0) };
}

export function setEncounterLighting(document, lighting) {
  const next = importEncounterDocument(document);
  if (!ENCOUNTER_LIGHTING.includes(lighting)) throw new RangeError(`unknown encounter lighting: ${lighting}`);
  next.conditions = { ...next.conditions, lighting };
  assertValidEncounterDocument(next);
  return { encounter: next };
}

export function setEncounterGridScale(document, metersPerSquare) {
  const next = importEncounterDocument(document);
  if (!ENCOUNTER_GRID_SCALES.includes(metersPerSquare)) throw new RangeError('grid scale must be 1, 5, or 25 meters');
  next.map.metersPerSquare = metersPerSquare;
  assertValidEncounterDocument(next);
  return { encounter: next };
}

export function setCombatantCover(document, { combatantId, cover } = {}) {
  const next = importEncounterDocument(document);
  if (!COMBATANT_COVER.includes(cover)) throw new RangeError(`unknown cover: ${cover}`);
  const combatant = next.combatants.find((entry) => entry.id === combatantId);
  if (!combatant) throw new Error('combatant is unavailable');
  combatant.cover = cover;
  assertValidEncounterDocument(next);
  return { encounter: next };
}

export function setCombatantFoldingStock(document, { combatantId, foldingStock } = {}) {
  const next = importEncounterDocument(document);
  const combatant = next.combatants.find((entry) => entry.id === combatantId);
  if (!combatant) throw new Error('combatant is unavailable');
  combatant.foldingStock = Boolean(foldingStock);
  assertValidEncounterDocument(next);
  return { encounter: next };
}

export function declareEncounterAction(document, { action = 'attack', modifier = 0, actorId = null, targetId = null } = {}) {
  const next = importEncounterDocument(document);
  if (next.status !== 'active') throw new Error('encounter is already resolved');
  if (!['attack', 'evade', 'close', 'open', 'close-run', 'open-run', 'escape', 'wait'].includes(action)) throw new RangeError(`unknown encounter action: ${action}`);
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
  const gridMove = next.history.find((entry) => entry.round === next.round && entry.kind === 'movement' && entry.actorId === actor.id && entry.detail?.playerMove);
  if (gridMove && !['attack', 'wait'].includes(action)) throw new Error(`${actor.name} already chose movement on the grid this round`);
  if (gridMove?.detail?.pace === 'run' && action === 'attack') throw new Error(`${actor.name} ran and cannot attack this round`);
  const target = targetId === null
    ? active.find((entry) => entry.side !== actor.side)
    : active.find((entry) => entry.id === targetId);
  if ((action === 'attack' || action === 'close' || action === 'open' || action === 'close-run' || action === 'open-run') && !target) throw new Error(targetId ? 'selected target is unavailable' : 'no active target remains');
  if (action === 'escape' && next.round !== 1) throw new Error('after combat begins, escape is possible only by opening beyond 20 range bands');
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
  // Destinations are calculated from the same pre-movement snapshot because
  // Book 1 makes all movement simultaneous.
  const beforeMovement = new Map([...live.entries()].map(([id, entry]) => [id, clone(entry)]));
  const movementPlans = [];
  for (const declaration of declarations) {
    const mover = live.get(declaration.actorId);
    const moveTarget = declaration.targetId === null ? null : live.get(declaration.targetId);
    const movement = declaration.action.match(/^(close|open)(-run)?$/);
    if (movement && moveTarget) {
      const direction = movement[1];
      const pace = movement[2] ? 'run' : 'walk';
      const moving = clone(beforeMovement.get(mover.id));
      const targetBefore = beforeMovement.get(moveTarget.id);
      const result = moveOnMeterGrid(moving, targetBefore, direction, pace, next.map);
      movementPlans.push({ declaration, mover, moveTarget, direction, pace, result });
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
  for (const plan of movementPlans) {
    clearContacts({ combatants: [...live.values()] }, plan.mover);
    plan.mover.position = plan.result.to;
    if (plan.result.blowCost) plan.mover.blowsUsed = Number(plan.mover.blowsUsed ?? 0) + plan.result.blowCost;
  }
  // Establish contact only after every destination has landed; otherwise the
  // declaration order would change a simultaneous result.
  for (const plan of movementPlans) {
    if (plan.direction === 'close' && encounterMapDistance(plan.mover, plan.moveTarget) === 0) setContact(plan.mover, plan.moveTarget);
    const band = encounterPairRange(plan.mover, plan.moveTarget);
    const squares = Number((plan.result.meters / next.map.metersPerSquare).toFixed(2));
    entries.push({
      round: next.round, kind: 'movement', side: plan.declaration.side, actorId: plan.mover.id, targetId: plan.moveTarget.id,
      text: `${plan.mover.name} ${plan.pace}s ${plan.result.meters} m / ${squares} grid square${squares === 1 ? '' : 's'} ${plan.direction === 'close' ? 'toward' : 'away from'} ${plan.moveTarget.name}, ending at ${band} range${plan.result.blowCost ? '; running spends one combat blow and prevents an attack' : ''}.`,
      detail: { movementStatus: plan.direction, pace: plan.pace, meters: plan.result.meters, squares, allowanceMeters: plan.result.bands * ENCOUNTER_METERS_PER_RANGE_BAND, from: plan.result.from, to: plan.result.to, band, blowCost: plan.result.blowCost }
    });
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
    const derived = encounterSituationDMs(next, attacker, defender);
    try {
      result = rollPersonalAttack({ attacker, defender, range: band, situationalDM: situationalDM + derived.total, surprise: surpriseRound === attacker.side, dice });
    } catch (error) {
      entries.push({ round: next.round, kind: 'attack', side, actorId: attacker.id, targetId: defender.id, text: `${attacker.name} cannot engage ${defender.name} at ${band} range with ${getPersonalWeapon(attacker.weaponKey).name}.` });
      return;
    }
    const acting = live.get(attacker.id);
    acting.blows = result.attacker.blows;
    acting.blowsUsed = result.attacker.blowsUsed;
    acting.evading = false;
    if (result.success) pendingWounds.push({ defenderId: defender.id, damageDice: result.damageDice, result });
    entries.push({ round: next.round, kind: 'attack', side, actorId: attacker.id, targetId: defender.id, band, text: '', prefix: `${attacker.name} attacks ${defender.name} at ${band} range`, detail: result });
  };

  // Walking while closing or opening still permits an attack. Running and
  // evading do not (Book 1 p.32).
  for (const declaration of declarations.filter((entry) => ['attack', 'close', 'open'].includes(entry.action))) {
    throwAttack(declaration.actorId, declaration.targetId, declaration.modifier, declaration.side);
  }

  // Anyone active, allowed to act, and not given an order falls back to the
  // nearest enemy. Combatants on auto have already had the house routine
  // declare for them (see applyNpcDeclarations), so this only catches the ones
  // the referee left alone.
  for (const entry of active) {
    if (declaredBy(entry.id) || !mayAct(entry.side)) continue;
    if (next.history.some((historyEntry) => historyEntry.round === next.round && historyEntry.kind === 'movement' && historyEntry.actorId === entry.id && historyEntry.detail?.playerMove)) continue;
    const attacker = snapshot.get(entry.id);
    const foe = nearestActiveOpponent(attacker, [...snapshot.values()].filter((candidate) => candidate.side !== attacker.side));
    if (!foe) continue;
    const band = encounterPairRange(attacker, foe);
    if (weaponTargetNumber(attacker.weaponKey, foe.armor, band) === null) {
      const acting = live.get(entry.id);
      const movement = moveOnMeterGrid(acting, live.get(foe.id) ?? foe, 'close', 'walk', next.map);
      snapshot.get(entry.id).position = { ...acting.position };
      const closed = encounterPairRange(acting, live.get(foe.id) ?? foe);
      const squares = Number((movement.meters / next.map.metersPerSquare).toFixed(2));
      entries.push({ round: next.round, kind: 'movement', side: entry.side, actorId: entry.id, targetId: foe.id, text: `${entry.name} cannot attack at ${band} range and walks ${movement.meters} m / ${squares} grid squares closer, ending at ${closed} range.`, detail: { movementStatus: 'close', pace: 'walk', meters: movement.meters, squares, allowanceMeters: ENCOUNTER_METERS_PER_RANGE_BAND, from: movement.from, to: movement.to, band: closed, blowCost: 0 } });
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
  for (const entry of live.values()) {
    if (entry.status !== 'active') continue;
    const nearest = nearestActiveOpponent(entry, [...live.values()].filter((candidate) => candidate.side !== entry.side));
    if (nearest && encounterMapDistance(entry, nearest) > 20 * ENCOUNTER_METERS_PER_RANGE_BAND) entry.status = 'escaped';
  }
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
      const moraleDM = morale.dm ? ` / DM ${morale.dm >= 0 ? '+' : ''}${morale.dm}` : '';
      entries.push({ round: next.round, kind: 'morale', side: 'opposition', text: `Opposition morale / 2D [${morale.dice.join('] [')}]${moraleDM} / TOTAL ${morale.total} vs ${morale.target}+ / ${morale.stands ? 'STANDS' : 'WITHDRAWS'}.`, detail: morale });
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

// v0.74.0: a roster NPC as an opponent spec for createEncounterDocument, with
// the same fields addEncounterCombatantFromActor gives a placed one.
export function opponentSpecFromNpcActor(actor) {
  if (!actor?.identity?.id || !actor?.identity?.name || !actor?.profile?.bodyModel) throw new TypeError('a roster actor is required');
  return {
    name: actor.identity.name, actorId: actor.identity.id,
    characteristics: { ...actor.characteristics }, skills: { ...(actor.skills ?? {}) },
    armor: actor.loadout?.armor ?? 'none', weaponKey: actor.loadout?.weaponKey ?? 'hands',
    actorType: actor.profile.actorType ?? 'npc', bodyModel: actor.profile.bodyModel,
    tokenLabel: String(actor.presentation?.tokenLabel || actor.identity.name).slice(0, 3).toUpperCase(),
    conditions: actorConditionKeys(actor), current: actor.current ?? null
  };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { importCharacterDocument, importShipDocument } from '../../packages/classic-traveller-rules/index.js';
import { createCampaignDocument, addSituationToCampaign, addEncounterToCampaign } from '../src/campaign-document.js';
import { createSituationDocument } from '../src/situation-document.js';
import {
  createEncounterDocument,
  exportEncounterDocument,
  importEncounterDocument,
  resolveEncounterRound,
  avoidEncounter,
  encounterRangeGuide,
  repositionEncounterCombatant,
  setEncounterRangeFromPositions,
  addEncounterCombatantFromActor,
  removeEncounterCombatant,
  setEncounterCombatantCondition,
  encounterPairRange,
  declaredTargetCounts,
  ESCAPE_TARGET,
  ESCAPE_RANGE_DMS,
  encounterSituationDMs,
  setEncounterLighting,
  setCombatantCover,
  setCombatantFoldingStock,
  surpriseConditionsForSide,
  setCombatantStatus,
  endEncounterByReferee
} from '../src/encounter-document.js';
import { createNpcActorDocument, setNpcActorCondition } from '../src/npc-actor-document.js';
import { createDocumentRegistry, createMemoryStorage } from '../src/document-registry.js';
import { loadTravellerDocument, TRAVELLER_DOCUMENT_KINDS } from '../client/document-loader.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const examples = path.resolve(here, '../examples');
function sequenceDice(values) {
  let index = 0;
  const dice = { rollD6() { if (index >= values.length) throw new Error('dice sequence exhausted'); return values[index++]; } };
  dice.roll2D6 = () => { const rolled = [dice.rollD6(), dice.rollD6()]; return { dice: rolled, total: rolled[0] + rolled[1] }; };
  return dice;
}

async function encounterFixture() {
  const character = importCharacterDocument(await readFile(path.join(examples, 'Hawkeye.character.json'), 'utf8'));
  const ship = importShipDocument(await readFile(path.join(examples, 'Hawkeye.ship.json'), 'utf8'));
  let campaign = createCampaignDocument({
    id: 'campaign-personal-combat', name: 'Sea of Suns', time: { year: 4800, dayOfYear: 106, secondsOfDay: 0 },
    location: { systemId: 'cinder', systemName: 'Cinder', worldId: 'cinder-main', worldName: 'Cinder' },
    characters: [character], ships: [ship], partyCharacterIds: [character.identity.id], activeShipId: ship.identity.id
  });
  const situation = createSituationDocument({
    eventKey: 'campaign-personal-combat|cinder|106-4800|hostile-patron', kind: 'patron-contact', title: 'Hostile Interception',
    location: { systemId: 'cinder', systemName: 'Cinder' }, createdDate: { year: 4800, dayOfYear: 106 },
    summary: 'A hostile agent blocks the concourse.', detail: '', choices: [],
    actor: { name: 'Veyra Kade', type: 'Agent', reaction: 'Violently hostile' }
  });
  campaign = addSituationToCampaign(campaign, situation);
  const encounter = createEncounterDocument({
    campaign, situation, character, opponent: { name: 'Veyra Kade', playerWeaponKey: 'laser-rifle' },
    date: { year: 4800, dayOfYear: 106 }, range: 'medium', dice: sequenceDice([6, 1])
  });
  campaign = addEncounterToCampaign(campaign, encounter);
  return { character, ship, campaign, situation, encounter };
}

test('Encounter Document v10 round-trips the expanded workspace, declarations, positions, range, and audit history', async () => {
  const { encounter } = await encounterFixture();
  const roundTrip = importEncounterDocument(exportEncounterDocument(encounter));
  assert.equal(roundTrip.schemaVersion, 10);
  assert.deepEqual(roundTrip.map, { grid: 'square', columns: 32, rows: 20, rangeGuide: 'graycloak-band-guide-v2', metersPerSquare: null });
  assert.deepEqual(roundTrip.roundState, { declaredActions: [] });
  assert.deepEqual(roundTrip.combatants[0].position, { column: 4, row: 9 });
  assert.equal(roundTrip.surprise.surpriseSideId, 'party');
  assert.equal(roundTrip.range, 'medium');
  assert.equal(roundTrip.combatants[0].name, 'Hawkeye');
  assert.equal(roundTrip.history[0].kind, 'surprise');
  const avoided = avoidEncounter(roundTrip, { date: { year: 4800, dayOfYear: 106 } });
  assert.equal(avoided.status, 'avoided');
});

test('Encounter Document v1 imports migrate through v10 to the expanded workspace', async () => {
  const { encounter } = await encounterFixture();
  const legacy = structuredClone(encounter);
  legacy.schemaVersion = 1;
  delete legacy.map;
  for (const combatant of legacy.combatants) delete combatant.position;
  const migrated = importEncounterDocument(legacy);
  assert.equal(migrated.schemaVersion, 10);
  assert.equal(migrated.map.grid, 'square');
  assert.equal(migrated.map.columns, 32);
  assert.equal(migrated.map.rows, 20);
  assert.ok(migrated.combatants.every((entry) => Number.isInteger(entry.position.column) && Number.isInteger(entry.position.row)));
  assert.ok(migrated.combatants.every((entry) => entry.bodyModel === 'biological' && Array.isArray(entry.conditions)));
});

test('roster actors can be placed and removed at an explicit map position without rerolling surprise or range', async () => {
  const { encounter } = await encounterFixture();
  let robot = createNpcActorDocument({
    id: 'actor-r17', name: 'R-17', actorType: 'robot', bodyModel: 'robotic', species: 'Robot', tokenLabel: 'R7',
    characteristics: { STR: 9, DEX: 8, END: 10, INT: 6, EDU: 4, SOC: 0 }, weaponKey: 'laser-carbine'
  });
  robot = setNpcActorCondition(robot, { condition: 'disrupted', active: true });
  const surprise = structuredClone(encounter.surprise);
  const placed = addEncounterCombatantFromActor(encounter, { actor: robot, side: 'opposition', column: 22, row: 4 });
  assert.equal(placed.encounter.range, 'medium');
  assert.deepEqual(placed.encounter.surprise, surprise);
  assert.equal(placed.combatant.sourceActorId, 'actor-r17');
  assert.equal(placed.combatant.actorType, 'robot');
  assert.equal(placed.combatant.bodyModel, 'robotic');
  assert.equal(placed.combatant.tokenLabel, 'R7');
  assert.deepEqual(placed.combatant.position, { column: 22, row: 4 });
  assert.deepEqual(placed.combatant.conditions, ['disrupted']);
  assert.throws(() => addEncounterCombatantFromActor(placed.encounter, { actor: robot, side: 'party', column: 2, row: 2 }), /already in this encounter/);
  const removed = removeEncounterCombatant(placed.encounter, { combatantId: placed.combatant.id });
  assert.equal(removed.encounter.combatants.some((entry) => entry.sourceActorId === 'actor-r17'), false);
  assert.equal(removed.entry.kind, 'removal');
});

test('body-aware referee conditions persist without replacing Book 1 wound status', async () => {
  const { encounter } = await encounterFixture();
  const foe = encounter.combatants.find((entry) => entry.side === 'opposition');
  const applied = setEncounterCombatantCondition(encounter, { combatantId: foe.id, condition: 'stunned', active: true });
  assert.deepEqual(applied.combatant.conditions, ['stunned']);
  assert.equal(applied.combatant.status, 'active');
  assert.equal(applied.encounter.range, 'medium');
  assert.match(applied.entry.text, /does not replace Book 1 wound status/);
  assert.throws(() => setEncounterCombatantCondition(applied.encounter, { combatantId: foe.id, condition: 'destroyed' }), /not valid for a biological/);
  const cleared = setEncounterCombatantCondition(applied.encounter, { combatantId: foe.id, condition: null });
  assert.deepEqual(cleared.combatant.conditions, []);
});

test('referee map scale adds approximate distance while map guidance remains non-authoritative', async () => {
  const fixture = await encounterFixture();
  const scaled = createEncounterDocument({
    campaign: fixture.campaign, character: fixture.character, opponent: { name: 'Scaled Raider' },
    encounterKey: 'scaled-map', date: { year: 4800, dayOfYear: 106 }, range: 'medium', metersPerSquare: 1.5,
    dice: sequenceDice([3, 3])
  });
  const actor = scaled.combatants.find((entry) => entry.side === 'party');
  const foe = scaled.combatants.find((entry) => entry.side === 'opposition');
  const guide = encounterRangeGuide(scaled, actor.id, foe.id);
  assert.equal(guide.distance, 8);
  assert.equal(guide.meters, 12);
  assert.equal(guide.authoritativeRange, 'medium');
  const moved = repositionEncounterCombatant(scaled, { combatantId: actor.id, column: 6, row: actor.position.row });
  assert.match(moved.entry.text, /approximately 3 m at the referee scale/);
  assert.equal(moved.encounter.range, 'medium');
});

test('dragged token positions persist while Book 1 range changes only through an explicit referee action', async () => {
  const { encounter } = await encounterFixture();
  const player = encounter.combatants.find((entry) => entry.side === 'party');
  const foe = encounter.combatants.find((entry) => entry.side === 'opposition');
  const moved = repositionEncounterCombatant(encounter, { combatantId: player.id, column: 10, row: 9 });
  assert.equal(moved.encounter.range, 'medium');
  assert.equal(moved.entry.kind, 'map-position');
  const guide = encounterRangeGuide(moved.encounter, player.id, foe.id);
  assert.equal(guide.suggestedRange, 'short');
  assert.equal(guide.matches, false);
  const applied = setEncounterRangeFromPositions(moved.encounter, { actorId: player.id, targetId: foe.id });
  assert.equal(applied.encounter.range, 'short');
  assert.equal(applied.entry.kind, 'range');
});

test('campaign registry and portable Bundle v7 persist Encounter Documents', async () => {
  const { character, ship, campaign, situation, encounter } = await encounterFixture();
  const registry = createDocumentRegistry({ storage: createMemoryStorage() });
  for (const document of [character, ship, situation, encounter, campaign]) registry.put(document);
  const resolved = registry.resolveCampaign(campaign.identity.id);
  assert.deepEqual(resolved.missing, []);
  assert.equal(resolved.encounters[0].identity.id, encounter.identity.id);
  const bundle = registry.buildBundle(campaign.identity.id);
  assert.equal(bundle.schemaVersion, 7);
  assert.equal(bundle.documents.encounters[0].identity.title, 'Encounter / Veyra Kade');
});

test('document loader recognizes persistent Encounter Documents', async () => {
  const { encounter } = await encounterFixture();
  const loaded = loadTravellerDocument(encounter);
  assert.equal(loaded.kind, TRAVELLER_DOCUMENT_KINDS.ENCOUNTER);
  assert.equal(loaded.encounterDocument.identity.id, encounter.identity.id);
});

test('party surprise grants a free Book 1 round without an opposition attack', async () => {
  const { encounter } = await encounterFixture();
  const result = resolveEncounterRound(encounter, {
    action: 'attack', date: { year: 4800, dayOfYear: 106 },
    dice: sequenceDice([2, 3, 1, 1, 1, 1, 1, 1])
  });
  assert.equal(result.encounter.status, 'active');
  assert.equal(result.encounter.round, 2);
  assert.equal(result.entries.filter((entry) => entry.kind === 'attack' && entry.side === 'party').length, 1);
  assert.equal(result.entries.filter((entry) => entry.kind === 'attack' && entry.side === 'opposition').length, 0);
});

test('ordinary combat rounds resolve both declared attacks before wound effects', async () => {
  const fixture = await encounterFixture();
  const encounter = createEncounterDocument({
    campaign: fixture.campaign, situation: fixture.situation, character: fixture.character,
    opponent: { name: 'Veyra Kade', playerWeaponKey: 'laser-rifle' }, date: { year: 4800, dayOfYear: 106 },
    range: 'medium', dice: sequenceDice([3, 3])
  });
  const result = resolveEncounterRound(encounter, {
    action: 'attack', date: { year: 4800, dayOfYear: 106 },
    // Book 1 p.30 step 2C order: both to-hit throws and their damage dice are
    // rolled first, then the first-blood location dice at the end of the round.
    dice: sequenceDice([1, 1, 1, 1, 1, 1, 1, 6, 6, 1, 1, 1, 1, 1])
  });
  assert.equal(result.entries.filter((entry) => entry.kind === 'attack').length, 2);
  assert.ok(result.encounter.combatants.find((entry) => entry.side === 'party').current.STR < fixture.character.characteristics.STR);
  assert.ok(result.encounter.combatants.find((entry) => entry.side === 'opposition').current.STR < 7);
});

test('multi-enemy encounters preserve selectable targets and every active opponent acts', async () => {
  const fixture = await encounterFixture();
  const opponents = [1, 2].map((number) => ({
    name: `Raider ${number}`, weaponKey: 'automatic-pistol', armor: 'jack',
    characteristics: { STR: 7, DEX: 7, END: 7, INT: 7 }, skills: { 'Automatic Pistol': 0 },
    playerWeaponKey: 'laser-rifle'
  }));
  const encounter = createEncounterDocument({
    campaign: fixture.campaign, character: fixture.character, opponents, encounterKey: 'multi-enemy-test',
    date: { year: 4800, dayOfYear: 106 }, range: 'short', dice: sequenceDice([3, 3])
  });
  const targetId = encounter.combatants.find((entry) => entry.name === 'Raider 2').id;
  const result = resolveEncounterRound(encounter, {
    action: 'evade', targetId, date: { year: 4800, dayOfYear: 106 },
    dice: sequenceDice([6, 6, 1, 1, 1, 1, 6, 6, 1, 1, 1])
  });
  assert.equal(result.entries.filter((entry) => entry.kind === 'attack' && entry.side === 'opposition').length, 2);
  assert.ok(result.encounter.combatants.find((entry) => entry.side === 'party').current.STR < fixture.character.characteristics.STR);
  assert.equal(result.encounter.combatants.filter((entry) => entry.side === 'opposition').length, 2);
});

test('multiple PCs each declare once before one simultaneous round resolves', async () => {
  const fixture = await encounterFixture();
  const second = structuredClone(fixture.character);
  second.identity.id = 'character-marisol-combat-test';
  second.identity.name = 'Marisol';
  const opponents = [1, 2].map((number) => ({
    name: `Raider ${number}`, weaponKey: 'automatic-pistol', armor: 'jack',
    characteristics: { STR: 7, DEX: 7, END: 7, INT: 7 }, skills: { 'Automatic Pistol': 0 }
  }));
  const encounter = createEncounterDocument({
    campaign: fixture.campaign, characters: [fixture.character, second], opponents, encounterKey: 'multi-party-test',
    partyLoadouts: {
      [fixture.character.identity.id]: { weaponKey: 'rifle' },
      [second.identity.id]: { weaponKey: 'automatic-pistol' }
    },
    date: { year: 4800, dayOfYear: 106 }, range: 'medium', dice: sequenceDice([3, 3])
  });
  const first = resolveEncounterRound(encounter, {
    actorId: fixture.character.identity.id, action: 'wait', date: { year: 4800, dayOfYear: 106 }, dice: sequenceDice([])
  });
  assert.equal(first.pending, true);
  assert.equal(first.encounter.round, 1);
  assert.deepEqual(first.awaitingActorIds, [second.identity.id]);
  const secondDeclaration = resolveEncounterRound(first.encounter, {
    actorId: second.identity.id, action: 'wait', date: { year: 4800, dayOfYear: 106 }, dice: sequenceDice(Array(40).fill(1))
  });
  assert.equal(secondDeclaration.pending, false);
  assert.equal(secondDeclaration.encounter.round, 2);
  assert.equal(secondDeclaration.encounter.roundState.declaredActions.length, 0);
  assert.equal(secondDeclaration.entries.filter((entry) => entry.kind === 'attack' && entry.side === 'opposition').length, 2);
  assert.equal(new Set(secondDeclaration.entries.filter((entry) => entry.side === 'opposition').map((entry) => entry.targetId)).size, 2);
});

test('v0.35.0 wounds land at the end of the round, so a dropped foe is still a legal target (B1 p.30 step 2C)', async () => {
  const fixture = await encounterFixture();
  const second = { ...fixture.character, identity: { ...fixture.character.identity, id: 'hawkeye-two', name: 'Second Gun' } };
  const encounter = createEncounterDocument({
    campaign: fixture.campaign, characters: [fixture.character, second],
    opponent: { name: 'Veyra Kade', weaponKey: 'automatic-pistol', armor: 'none', characteristics: { STR: 2, DEX: 7, END: 2, INT: 7 }, skills: {} },
    encounterKey: 'simultaneity-test', date: { year: 4800, dayOfYear: 106 }, range: 'medium', dice: sequenceDice([3, 3])
  });
  const foeId = encounter.combatants.find((entry) => entry.side === 'opposition').id;
  const [first, third] = encounter.combatants.filter((entry) => entry.side === 'party');

  // Both characters declare against the same foe; the first shot drops him.
  const pending = resolveEncounterRound(encounter, {
    action: 'attack', actorId: first.id, targetId: foeId,
    date: { year: 4800, dayOfYear: 106 }, dice: sequenceDice([6, 6])
  });
  assert.equal(pending.pending, true);
  assert.deepEqual(declaredTargetCounts(pending.encounter), { [foeId]: 1 });

  const result = resolveEncounterRound(pending.encounter, {
    action: 'attack', actorId: third.id, targetId: foeId,
    date: { year: 4800, dayOfYear: 106 },
    dice: sequenceDice([6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6])
  });
  // The second attack resolved rather than throwing "defender is not active".
  const attacks = result.entries.filter((entry) => entry.kind === 'attack' && entry.side === 'party');
  assert.equal(attacks.length, 2);
  assert.ok(attacks.every((entry) => entry.detail.success));
  // Two separate wounds landed on the one foe.
  assert.equal(result.encounter.combatants.find((entry) => entry.id === foeId).hitsTaken, 2);
});

test('v0.35.0 throws each attack at the band between that pair, not one encounter-wide band', async () => {
  const fixture = await encounterFixture();
  const opponents = [
    { name: 'Near Raider', weaponKey: 'automatic-pistol', armor: 'none', characteristics: { STR: 7, DEX: 7, END: 7, INT: 7 }, skills: {} },
    { name: 'Far Raider', weaponKey: 'automatic-pistol', armor: 'none', characteristics: { STR: 7, DEX: 7, END: 7, INT: 7 }, skills: {} }
  ];
  let encounter = createEncounterDocument({
    campaign: fixture.campaign, character: fixture.character, opponents,
    encounterKey: 'pair-range-test', date: { year: 4800, dayOfYear: 106 }, range: 'medium', dice: sequenceDice([3, 3])
  });
  const actor = encounter.combatants.find((entry) => entry.side === 'party');
  const near = encounter.combatants.find((entry) => entry.name === 'Near Raider');
  const far = encounter.combatants.find((entry) => entry.name === 'Far Raider');

  encounter = repositionEncounterCombatant(encounter, { combatantId: near.id, column: actor.position.column + 1, row: actor.position.row }).encounter;
  encounter = repositionEncounterCombatant(encounter, { combatantId: far.id, column: actor.position.column + 20, row: actor.position.row }).encounter;

  const positioned = (id) => encounter.combatants.find((entry) => entry.id === id);
  assert.equal(encounterPairRange(positioned(actor.id), positioned(near.id)), 'close');
  assert.equal(encounterPairRange(positioned(actor.id), positioned(far.id)), 'very-long');
});

test('v0.39.0 escape is thrown at 9+ with the range DM (B1 p.32)', async () => {
  assert.equal(ESCAPE_TARGET, 9);
  assert.deepEqual({ ...ESCAPE_RANGE_DMS }, { close: -1, short: -1, medium: 1, long: 2, 'very-long': 3 });
  const fixture = await encounterFixture();
  const encounter = createEncounterDocument({
    campaign: fixture.campaign, character: fixture.character,
    opponent: { name: 'Veyra Kade', weaponKey: 'blade', armor: 'none', characteristics: { STR: 7, DEX: 7, END: 7, INT: 7 }, skills: {} },
    encounterKey: 'escape-target-test', date: { year: 4800, dayOfYear: 106 }, range: 'medium', dice: sequenceDice([3, 3])
  });
  // 2D of [4][4] = 8, +1 for medium range = 9: exactly the target under p.32,
  // and a failure under the old 7+ reading only if the target were higher.
  const result = resolveEncounterRound(encounter, {
    action: 'escape', date: { year: 4800, dayOfYear: 106 }, dice: sequenceDice([4, 4, 1, 1, 1, 1, 1, 1, 1, 1])
  });
  const escape = result.entries.find((entry) => entry.kind === 'escape');
  assert.match(escape.text, /vs 9\+/);
  assert.equal(result.encounter.combatants.find((entry) => entry.side === 'party').status, 'escaped');
});

test('v0.39.0 the referee may declare for the opposition and any side may target another', async () => {
  const fixture = await encounterFixture();
  const opponents = [
    { name: 'Raider', weaponKey: 'automatic-pistol', armor: 'none', characteristics: { STR: 7, DEX: 7, END: 7, INT: 7 }, skills: {} },
    { name: 'Bystander', weaponKey: 'automatic-pistol', armor: 'none', characteristics: { STR: 7, DEX: 7, END: 7, INT: 7 }, skills: {} }
  ];
  let encounter = createEncounterDocument({
    campaign: fixture.campaign, character: fixture.character, opponents,
    encounterKey: 'opposition-declarations-test', date: { year: 4800, dayOfYear: 106 }, range: 'medium', dice: sequenceDice([3, 3])
  });
  const pc = encounter.combatants.find((entry) => entry.side === 'party');
  const raider = encounter.combatants.find((entry) => entry.name === 'Raider');

  // The referee aims a named foe at a named target before the party declares.
  const directed = resolveEncounterRound(encounter, {
    action: 'attack', actorId: raider.id, targetId: pc.id,
    date: { year: 4800, dayOfYear: 106 }, dice: sequenceDice([3, 3])
  });
  assert.equal(directed.pending, true, 'the round waits on the party, not the opposition');
  const declaration = directed.encounter.roundState.declaredActions.find((entry) => entry.actorId === raider.id);
  assert.equal(declaration.side, 'opposition');
  assert.equal(declaration.targetId, pc.id);

  // Same-side targeting is refused.
  assert.throws(() => resolveEncounterRound(directed.encounter, {
    action: 'attack', actorId: raider.id, targetId: opponents.length ? directed.encounter.combatants.find((entry) => entry.name === 'Bystander').id : null,
    date: { year: 4800, dayOfYear: 106 }, dice: sequenceDice([3, 3])
  }), /same side|already declared/);
});

test('v0.39.0 a third side fights both others and the party can win by outlasting them', async () => {
  const fixture = await encounterFixture();
  const encounter = createEncounterDocument({
    campaign: fixture.campaign, character: fixture.character,
    opponents: [{ name: 'Raider', weaponKey: 'blade', armor: 'none', characteristics: { STR: 7, DEX: 7, END: 7, INT: 7 }, skills: {} }],
    encounterKey: 'three-way-test', date: { year: 4800, dayOfYear: 106 }, range: 'medium', dice: sequenceDice([3, 3])
  });
  // A third faction is placed by hand, as a referee would from the roster.
  const raiderSource = encounter.combatants.find((entry) => entry.name === 'Raider');
  const militia = { ...JSON.parse(JSON.stringify(raiderSource)), id: 'militia-1', name: 'Militia', side: 'militia', sourceActorId: null, position: { column: 20, row: 9 } };
  const threeWay = { ...encounter, combatants: [...encounter.combatants, militia] };
  const imported = importEncounterDocument(threeWay);
  assert.equal(imported.combatants.length, 3);

  const sides = new Set(imported.combatants.map((entry) => entry.side));
  assert.deepEqual([...sides].sort(), ['militia', 'opposition', 'party']);

  const result = resolveEncounterRound(imported, {
    action: 'wait', date: { year: 4800, dayOfYear: 106 },
    dice: sequenceDice(Array.from({ length: 40 }, () => 3))
  });
  // Every side acts on its own account, against someone not on its own side.
  assert.ok(result.entries.some((entry) => entry.side === 'militia'), 'the third side acts');
  assert.ok(result.entries.some((entry) => entry.side === 'opposition'), 'the opposition acts');
  for (const entry of result.entries) {
    if (!entry.targetId || !entry.actorId) continue;
    const attacker = result.encounter.combatants.find((combatant) => combatant.id === entry.actorId);
    const defender = result.encounter.combatants.find((combatant) => combatant.id === entry.targetId);
    assert.notEqual(attacker.side, defender.side, 'nobody engages their own side');
  }

  // Blades cannot reach across the map, so both foes close instead of firing:
  // each picked its nearest enemy rather than defaulting to the party.
  const militiaMove = result.entries.find((entry) => entry.side === 'militia' && entry.kind === 'movement');
  assert.equal(result.encounter.combatants.find((entry) => entry.id === militiaMove.targetId).side, 'opposition');
});

test('v0.42.0 derives lighting, cover and folding stock from state, not per-attack ticks', async () => {
  const fixture = await encounterFixture();
  let encounter = createEncounterDocument({
    campaign: fixture.campaign, character: fixture.character,
    opponent: { name: 'Raider', weaponKey: 'automatic-pistol', armor: 'none', characteristics: { STR: 7, DEX: 7, END: 7, INT: 7 }, skills: {} },
    encounterKey: 'situation-state-test', date: { year: 4800, dayOfYear: 106 }, range: 'medium', dice: sequenceDice([3, 3])
  });
  const pc = encounter.combatants.find((entry) => entry.side === 'party');
  const raider = encounter.combatants.find((entry) => entry.side === 'opposition');

  // Defaults are clean, so nothing is applied until the referee sets it.
  assert.equal(encounter.conditions.lighting, 'normal');
  assert.equal(raider.cover, 'none');
  assert.equal(raider.foldingStock, false);
  assert.equal(encounterSituationDMs(encounter, pc, raider).total, 0);

  // Cover belongs to the defender: it applies to whoever shoots at them.
  encounter = setCombatantCover(encounter, { combatantId: raider.id, cover: 'cover' }).encounter;
  const covered = encounter.combatants.find((entry) => entry.id === raider.id);
  assert.equal(encounterSituationDMs(encounter, pc, covered).total, -4);
  // ...and not to that combatant's own attacks.
  assert.equal(encounterSituationDMs(encounter, covered, encounter.combatants.find((entry) => entry.id === pc.id)).total, 0);

  // Lighting belongs to the encounter: it applies to every pair.
  encounter = setEncounterLighting(encounter, 'darkness-light-intensifier').encounter;
  const both = encounter.combatants.find((entry) => entry.id === raider.id);
  assert.equal(encounterSituationDMs(encounter, pc, both).total, -10);
  assert.deepEqual(encounterSituationDMs(encounter, pc, both).parts.map((part) => part.key), ['lighting', 'cover']);

  // The folding stock belongs to the firer's weapon.
  encounter = setCombatantFoldingStock(encounter, { combatantId: pc.id, foldingStock: true }).encounter;
  const firer = encounter.combatants.find((entry) => entry.id === pc.id);
  assert.equal(encounterSituationDMs(encounter, firer, both).total, -11);

  assert.throws(() => setEncounterLighting(encounter, 'dusk'), RangeError);
  assert.throws(() => setCombatantCover(encounter, { combatantId: pc.id, cover: 'bunker' }), RangeError);
});

test('v0.44.0 totals the Book 1 p.31 surprise DMs per side', async () => {
  const fixture = await encounterFixture();

  // Derivable conditions: leader, tactical, military service, and the crowd
  // penalty at eight or more.
  const skilled = [{ status: 'active', skills: { Leadership: 1, Tactics: 2 }, militaryExperience: true, actorType: 'pc' }];
  const skilledSide = surpriseConditionsForSide(skilled);
  assert.deepEqual(skilledSide.conditions.leaderSkill, true);
  assert.deepEqual(skilledSide.conditions.tacticalSkill, true);
  assert.deepEqual(skilledSide.conditions.militaryExperience, true);
  assert.equal(skilledSide.total, 3);

  const crowd = Array.from({ length: 8 }, () => ({ status: 'active', skills: {}, actorType: 'pc' }));
  assert.equal(surpriseConditionsForSide(crowd).total, -1);

  const pack = Array.from({ length: 10 }, () => ({ status: 'active', skills: {}, actorType: 'creature' }));
  assert.equal(surpriseConditionsForSide(pack).conditions.tenOrMoreAnimals, true);

  // Referee-supplied conditions the document cannot know.
  assert.equal(surpriseConditionsForSide(skilled, { inAVehicle: true }).total, 2);
  assert.equal(surpriseConditionsForSide(skilled, { battleDress: true }).total, 5);

  // Only active combatants count toward a side's DM.
  const downed = [{ status: 'unconscious', skills: { Leadership: 1 }, actorType: 'pc' }];
  assert.equal(surpriseConditionsForSide(downed).total, 0);

  // The encounter records what each side carried into the throw.
  const encounter = createEncounterDocument({
    campaign: fixture.campaign, character: fixture.character,
    opponent: { name: 'Raider', weaponKey: 'blade', armor: 'none', characteristics: { STR: 7, DEX: 7, END: 7, INT: 7 }, skills: {} },
    encounterKey: 'surprise-dm-test', date: { year: 4800, dayOfYear: 106 }, range: 'medium',
    surpriseConditions: { opposition: { battleDress: true } }, dice: sequenceDice([3, 3])
  });
  assert.equal(encounter.surprise.conditions.opposition.battleDress, true);
  assert.equal(encounter.surprise.results.find((entry) => entry.sideId === 'opposition').dm, 2);
});

test('v0.45.0 lets the referee restore a downed combatant and end the fight', async () => {
  const fixture = await encounterFixture();
  const encounter = createEncounterDocument({
    campaign: fixture.campaign, character: fixture.character,
    opponent: { name: 'Raider', weaponKey: 'blade', armor: 'none', characteristics: { STR: 7, DEX: 7, END: 7, INT: 7 }, skills: {} },
    encounterKey: 'referee-status-test', date: { year: 4800, dayOfYear: 106 }, range: 'medium', dice: sequenceDice([3, 3])
  });
  const raiderId = encounter.combatants.find((entry) => entry.side === 'opposition').id;

  // Knock the raider out by hand, as a resolved round would.
  const downed = {
    ...encounter,
    combatants: encounter.combatants.map((entry) => entry.id === raiderId
      ? { ...entry, status: 'unconscious', current: { ...entry.current, END: 0 } }
      : entry)
  };

  // A condition is an annotation: it must not change wound status.
  const annotated = setEncounterCombatantCondition(downed, { combatantId: raiderId, condition: null });
  assert.equal(annotated.encounter.combatants.find((entry) => entry.id === raiderId).status, 'unconscious');

  // The status override does, and lifts the zeroed characteristic off zero so
  // the restoration survives the next recomputation.
  const restored = setCombatantStatus(annotated.encounter, { combatantId: raiderId, status: 'active' });
  const back = restored.encounter.combatants.find((entry) => entry.id === raiderId);
  assert.equal(back.status, 'active');
  assert.equal(back.current.END, 1);
  assert.match(restored.entry.text, /END restored to 1/);

  // Ending with both sides standing is neither a victory nor a defeat.
  const ended = endEncounterByReferee(restored.encounter, { date: { year: 4800, dayOfYear: 106 } });
  assert.equal(ended.encounter.status, 'avoided');
  assert.equal(ended.encounter.outcome.reason, 'referee-ended');
  assert.deepEqual(ended.encounter.timing.resolvedDate, { year: 4800, dayOfYear: 106 });
  assert.throws(() => endEncounterByReferee(ended.encounter, { date: { year: 4800, dayOfYear: 106 } }), /already resolved/);
});

test('v0.48.0 sets the blow allowance from endurance as the encounter opens (B1 p.36)', async () => {
  const fixture = await encounterFixture();
  // A character who arrives already wounded brings a smaller allowance.
  const wounded = {
    ...fixture.character,
    current: { ...fixture.character.current, END: 2 }
  };
  const encounter = createEncounterDocument({
    campaign: fixture.campaign, character: wounded,
    opponent: { name: 'Brawler', weaponKey: 'hands', armor: 'none', characteristics: { STR: 9, DEX: 7, END: 6, INT: 7 }, skills: { Brawling: 1 } },
    encounterKey: 'endurance-test', date: { year: 4800, dayOfYear: 106 }, range: 'close', dice: sequenceDice([3, 3])
  });
  const pc = encounter.combatants.find((entry) => entry.side === 'party');
  const foe = encounter.combatants.find((entry) => entry.side === 'opposition');
  assert.equal(pc.blowAllowance, 2, 'prior wounds reduce the allowance');
  assert.equal(pc.blowsUsed, 0);
  assert.equal(foe.blowAllowance, 6);

  // Spending is recorded while the fight is still running. (A resolved fight
  // reaches the Book 1 p.36 rest and the allowance resets, so this uses a
  // party member who survives the round.)
  const standing = createEncounterDocument({
    campaign: fixture.campaign, character: fixture.character,
    opponent: { name: 'Brawler', weaponKey: 'hands', armor: 'none', characteristics: { STR: 9, DEX: 7, END: 6, INT: 7 }, skills: { Brawling: 1 } },
    encounterKey: 'endurance-spend-test', date: { year: 4800, dayOfYear: 106 }, range: 'close', dice: sequenceDice([3, 3])
  });
  const brawlerId = standing.combatants.find((entry) => entry.side === 'opposition').id;
  const shooterId = standing.combatants.find((entry) => entry.side === 'party').id;
  const result = resolveEncounterRound(standing, {
    action: 'attack', targetId: brawlerId, date: { year: 4800, dayOfYear: 106 },
    dice: sequenceDice(Array.from({ length: 40 }, () => 3))
  });
  assert.equal(result.encounter.status, 'active', 'the fight is still running');
  assert.equal(result.encounter.combatants.find((entry) => entry.id === brawlerId).blowsUsed, 1, 'a melee combat blow spends the allowance');
  assert.equal(result.encounter.combatants.find((entry) => entry.id === shooterId).blowsUsed, 0, 'gun combat is not affected by endurance');
});

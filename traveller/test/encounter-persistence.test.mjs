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
  setEncounterCombatantCondition
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

test('Encounter Document v5 round-trips the expanded workspace, declarations, positions, range, and audit history', async () => {
  const { encounter } = await encounterFixture();
  const roundTrip = importEncounterDocument(exportEncounterDocument(encounter));
  assert.equal(roundTrip.schemaVersion, 5);
  assert.deepEqual(roundTrip.map, { grid: 'square', columns: 32, rows: 20, rangeGuide: 'graycloak-band-guide-v1', metersPerSquare: null });
  assert.deepEqual(roundTrip.roundState, { declaredActions: [] });
  assert.deepEqual(roundTrip.combatants[0].position, { column: 4, row: 9 });
  assert.equal(roundTrip.surprise.surpriseSideId, 'party');
  assert.equal(roundTrip.range, 'medium');
  assert.equal(roundTrip.combatants[0].name, 'Hawkeye');
  assert.equal(roundTrip.history[0].kind, 'surprise');
  const avoided = avoidEncounter(roundTrip, { date: { year: 4800, dayOfYear: 106 } });
  assert.equal(avoided.status, 'avoided');
});

test('Encounter Document v1 imports migrate through v5 to the expanded workspace', async () => {
  const { encounter } = await encounterFixture();
  const legacy = structuredClone(encounter);
  legacy.schemaVersion = 1;
  delete legacy.map;
  for (const combatant of legacy.combatants) delete combatant.position;
  const migrated = importEncounterDocument(legacy);
  assert.equal(migrated.schemaVersion, 5);
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
  assert.deepEqual(placed.combatant.current, robot.current);
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
    dice: sequenceDice([2, 3, 1, 1, 1, 1, 1, 1, 6, 6, 1, 1, 1, 1])
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
    date: { year: 4800, dayOfYear: 106 }, range: 'medium', dice: sequenceDice([3, 3])
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

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { importCharacterDocument, importShipDocument } from '../../packages/classic-traveller-rules/index.js';
import { createCampaignDocument, addSituationToCampaign, addEncounterToCampaign } from '../src/campaign-document.js';
import { createSituationDocument } from '../src/situation-document.js';
import { createEncounterDocument, exportEncounterDocument, importEncounterDocument, resolveEncounterRound, avoidEncounter } from '../src/encounter-document.js';
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

test('Encounter Document v2 round-trips surprise, map positions, combatants, range, and audit history', async () => {
  const { encounter } = await encounterFixture();
  const roundTrip = importEncounterDocument(exportEncounterDocument(encounter));
  assert.equal(roundTrip.schemaVersion, 2);
  assert.deepEqual(roundTrip.map, { grid: 'square', columns: 12, rows: 8 });
  assert.deepEqual(roundTrip.combatants[0].position, { column: 1, row: 4 });
  assert.equal(roundTrip.surprise.surpriseSideId, 'party');
  assert.equal(roundTrip.range, 'medium');
  assert.equal(roundTrip.combatants[0].name, 'Hawkeye');
  assert.equal(roundTrip.history[0].kind, 'surprise');
  const avoided = avoidEncounter(roundTrip, { date: { year: 4800, dayOfYear: 106 } });
  assert.equal(avoided.status, 'avoided');
});

test('Encounter Document v1 imports migrate to the square-grid v2 schema', async () => {
  const { encounter } = await encounterFixture();
  const legacy = structuredClone(encounter);
  legacy.schemaVersion = 1;
  delete legacy.map;
  for (const combatant of legacy.combatants) delete combatant.position;
  const migrated = importEncounterDocument(legacy);
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.map.grid, 'square');
  assert.ok(migrated.combatants.every((entry) => Number.isInteger(entry.position.column) && Number.isInteger(entry.position.row)));
});

test('campaign registry and portable Bundle v5 persist Encounter Documents', async () => {
  const { character, ship, campaign, situation, encounter } = await encounterFixture();
  const registry = createDocumentRegistry({ storage: createMemoryStorage() });
  for (const document of [character, ship, situation, encounter, campaign]) registry.put(document);
  const resolved = registry.resolveCampaign(campaign.identity.id);
  assert.deepEqual(resolved.missing, []);
  assert.equal(resolved.encounters[0].identity.id, encounter.identity.id);
  const bundle = registry.buildBundle(campaign.identity.id);
  assert.equal(bundle.schemaVersion, 5);
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

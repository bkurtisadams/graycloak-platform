import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { importCharacterDocument } from '../../packages/classic-traveller-rules/index.js';
import {
  createCampaignDocument,
  addMediaAssetToCampaign,
  addNpcActorToCampaign,
  importCampaignDocument
} from '../src/campaign-document.js';
import { createMediaAssetDocument, importMediaAssetDocument } from '../src/media-asset-document.js';
import {
  createNpcActorDocument,
  importNpcActorDocument,
  updateNpcActorDocument,
  activeNpcActorConditions,
  setNpcActorCondition,
  clearNpcActorConditions
} from '../src/npc-actor-document.js';
import { createEncounterDocument, importEncounterDocument } from '../src/encounter-document.js';
import { createCampaignBundle, importCampaignBundle } from '../src/campaign-bundle.js';
import { createDocumentRegistry, createMemoryStorage } from '../src/document-registry.js';
import { loadTravellerDocument, TRAVELLER_DOCUMENT_KINDS } from '../client/document-loader.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const examples = path.resolve(here, '../examples');
const PNG_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

async function fixture() {
  const character = importCharacterDocument(await readFile(path.join(examples, 'Hawkeye.character.json'), 'utf8'));
  let campaign = createCampaignDocument({
    id: 'campaign-roster', name: 'Roster Test', characters: [character],
    location: { systemId: 'aster', systemName: 'Aster', worldId: 'aster-main', worldName: 'Far Harbor' }
  });
  const portrait = createMediaAssetDocument({ id: 'asset-veyra', name: 'Veyra portrait', mimeType: 'image/png', dataUrl: PNG_1PX, altText: 'Veyra Kade' });
  const actor = createNpcActorDocument({
    id: 'actor-veyra', name: 'Veyra Kade', role: 'Agent', faction: 'Heliograph', description: 'A wary field agent.',
    portraitAssetId: portrait.identity.id, characteristics: { STR: 8, DEX: 10, END: 7, INT: 9, EDU: 8, SOC: 6 },
    skills: { 'Gun Combat': 2, Streetwise: 1 }, weaponKey: 'automatic-pistol', armor: 'jack', publicNotes: 'Known contact.'
  });
  campaign = addMediaAssetToCampaign(campaign, portrait);
  campaign = addNpcActorToCampaign(campaign, actor);
  return { character, campaign, portrait, actor };
}

test('NPC actors retain classic characteristics, presentation, equipment, notes, and body-aware state', async () => {
  const { actor } = await fixture();
  const roundTrip = importNpcActorDocument(JSON.stringify(actor));
  assert.equal(roundTrip.upp, '8A7986');
  assert.equal(roundTrip.presentation.description, 'A wary field agent.');
  assert.equal(roundTrip.presentation.portraitAssetId, 'asset-veyra');
  assert.equal(roundTrip.skills['Gun Combat'], 2);
  assert.equal(roundTrip.loadout.weaponKey, 'automatic-pistol');
  assert.equal(roundTrip.notes.public, 'Known contact.');
  assert.equal(roundTrip.state.lifeState, 'alive');

  const robot = createNpcActorDocument({ name: 'R-17', actorType: 'robot', bodyModel: 'robotic', species: 'Robot' });
  assert.equal(robot.state.lifeState, 'not-applicable');
  assert.equal(robot.state.consciousness, 'not-applicable');
  assert.equal(robot.state.activation, 'active');
  assert.equal(updateNpcActorDocument(robot, { state: { ...robot.state, activation: 'offline', integrity: 'damaged' } }).state.activation, 'offline');
});

test('body-aware actor conditions distinguish robot shutdown and destruction from biological death', () => {
  let robot = createNpcActorDocument({ id: 'actor-condition-robot', name: 'R-17', actorType: 'robot', bodyModel: 'robotic', species: 'Robot' });
  robot = setNpcActorCondition(robot, { condition: 'powered-down' });
  assert.equal(robot.state.activation, 'powered-down');
  assert.equal(robot.state.lifeState, 'not-applicable');
  assert.deepEqual(activeNpcActorConditions(robot), ['powered-down']);
  assert.throws(() => setNpcActorCondition(robot, { condition: 'dead' }), /not valid for a robotic/);
  robot = setNpcActorCondition(robot, { condition: 'destroyed' });
  assert.equal(robot.state.integrity, 'destroyed');
  assert.deepEqual(new Set(activeNpcActorConditions(robot)), new Set(['powered-down', 'destroyed']));
  robot = clearNpcActorConditions(robot);
  assert.deepEqual(activeNpcActorConditions(robot), []);
  assert.equal(robot.state.activation, 'active');
  assert.equal(robot.state.integrity, 'intact');
});

test('Campaign v8 and Bundle v7 preserve roster folders, actors, and portrait assets through the registry', async () => {
  const { character, campaign, portrait, actor } = await fixture();
  const importedCampaign = importCampaignDocument(JSON.stringify(campaign));
  assert.deepEqual(importedCampaign.documentRefs.npcActors, [{ id: 'actor-veyra', name: 'Veyra Kade', role: 'Agent', archived: false }]);
  assert.deepEqual(importedCampaign.roster.folders[0].actorIds, ['actor-veyra']);
  assert.equal(importMediaAssetDocument(JSON.stringify(portrait)).dataUrl, PNG_1PX);

  const bundle = createCampaignBundle(campaign, { characters: [character], npcActors: [actor], assets: [portrait] });
  const roundTrip = importCampaignBundle(JSON.stringify(bundle));
  assert.equal(roundTrip.schemaVersion, 7);
  assert.equal(roundTrip.documents.npcActors[0].identity.id, 'actor-veyra');
  assert.equal(roundTrip.documents.assets[0].identity.id, 'asset-veyra');

  const registry = createDocumentRegistry({ storage: createMemoryStorage() });
  registry.putBundle(roundTrip);
  const resolved = registry.resolveCampaign(campaign.identity.id);
  assert.equal(resolved.npcActors[0].identity.name, 'Veyra Kade');
  assert.equal(resolved.assets[0].purpose, 'portrait');
});

test('encounters reference roster actors without replacing Book 1 range state', async () => {
  const { character, campaign, actor } = await fixture();
  const dice = { rollD6: () => 3, roll2D6: () => ({ dice: [3, 3], total: 6 }) };
  const encounter = createEncounterDocument({
    campaign, character, opponents: [{
      actorId: actor.identity.id, name: actor.identity.name, characteristics: actor.characteristics,
      skills: actor.skills, weaponKey: actor.loadout.weaponKey, armor: actor.loadout.armor
    }], date: { year: 4800, dayOfYear: 1 }, range: 'long', dice
  });
  const roundTrip = importEncounterDocument(JSON.stringify(encounter));
  const opposition = roundTrip.combatants.find((entry) => entry.side === 'opposition');
  assert.equal(opposition.sourceActorId, actor.identity.id);
  assert.equal(roundTrip.range, 'long');
  assert.equal(roundTrip.map.rangeGuide, 'graycloak-band-guide-v1');
});

test('document loader recognizes standalone NPC actor and media asset documents', async () => {
  const { actor, portrait } = await fixture();
  assert.equal(loadTravellerDocument(actor).kind, TRAVELLER_DOCUMENT_KINDS.NPC_ACTOR);
  assert.equal(loadTravellerDocument(portrait).kind, TRAVELLER_DOCUMENT_KINDS.MEDIA_ASSET);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { importCharacterDocument } from '../vendor/classic-traveller-rules/index.js';
import { importCampaignBundle } from '../src/campaign-bundle.js';
import { createSceneDocument } from '../src/scene-document.js';
import {
  createEncounterDocument, addEncounterCombatantFromCharacter, addEncounterCombatantFromActor,
  beginEncounter, opponentSpecFromNpcActor, assertValidEncounterDocument
} from '../src/encounter-document.js';
import { createNpcActorDocument } from '../src/npc-actor-document.js';

const dice = { rollD6: () => 3, roll2D6: () => ({ dice: [3, 3], total: 6 }) };
const here = path.dirname(fileURLToPath(import.meta.url));

async function fixture() {
  const character = importCharacterDocument(await readFile(path.join(here, '../examples/Hawkeye.character.json'), 'utf8'));
  const campaign = importCampaignBundle(await readFile(path.join(here, 'fixtures/Sea-of-Suns-v0.11.2-buggy.campaign.json'), 'utf8')).campaign;
  const scene = createSceneDocument({ campaignId: campaign.identity.id, name: 'Warehouse', squares: 20, metersPerSquare: 5, createdAt: 1 });
  return { character, campaign, scene };
}

test('v0.94.0 an encounter can exist in setup with nobody in it', async () => {
  const { campaign, scene } = await fixture();
  const encounter = createEncounterDocument({
    campaign, scene, setup: true, encounterKey: 'setup-1',
    date: { year: 4800, dayOfYear: 106 }, range: 'medium', dice
  });
  assert.equal(encounter.status, 'setup');
  assert.deepEqual(encounter.combatants, []);
  assert.match(encounter.identity.title, /Warehouse \/ setting up/);
  assertValidEncounterDocument(encounter);
});

test('v0.94.0 combatants join one at a time, and BEGIN needs both sides', async () => {
  const { campaign, scene, character } = await fixture();
  let encounter = createEncounterDocument({ campaign, scene, setup: true, encounterKey: 'setup-2', date: { year: 4800, dayOfYear: 106 }, dice });
  // Nobody yet.
  assert.throws(() => beginEncounter(encounter, { dice }), /at least one party character/);
  encounter = addEncounterCombatantFromCharacter(encounter, { character, column: 20, row: 50 }).encounter;
  assert.equal(encounter.combatants.length, 1);
  assert.equal(encounter.combatants[0].side, 'party');
  // One side is not a fight.
  assert.throws(() => beginEncounter(encounter, { dice }), /at least one opponent/);
  const foe = createNpcActorDocument({ name: 'Raider', role: 'Pirate', characteristics: { STR: 8, DEX: 8, END: 8, INT: 6, EDU: 5, SOC: 4 }, skills: { 'Gun Combat': 1 }, weaponKey: 'rifle' });
  encounter = addEncounterCombatantFromActor(encounter, { actor: foe, side: 'opposition', column: 60, row: 50 }).encounter;
  assert.equal(encounter.combatants.length, 2);
  // Adding the same person twice is refused.
  assert.throws(() => addEncounterCombatantFromCharacter(encounter, { character, column: 1, row: 1 }), /already in this encounter/);
  const begun = beginEncounter(encounter, { surpriseConditions: { party: { battleDress: true } }, dice });
  assert.equal(begun.encounter.status, 'active');
  assert.equal(begun.encounter.round, 1);
  assert.ok(begun.encounter.surprise, 'surprise is rolled when the fight begins, not at creation');
  assert.match(begun.entry.text, /Encounter begins: 1 party against 1/);
  assert.throws(() => beginEncounter(begun.encounter, { dice }), /already begun/);
  assertValidEncounterDocument(begun.encounter);
});

test('v0.94.0 the old one-shot creation still works unchanged', async () => {
  const { campaign, scene, character } = await fixture();
  const foe = createNpcActorDocument({ name: 'Thug', characteristics: { STR: 7, DEX: 7, END: 7, INT: 7, EDU: 7, SOC: 7 } });
  const encounter = createEncounterDocument({
    campaign, scene, character, opponents: [opponentSpecFromNpcActor(foe)],
    encounterKey: 'classic', date: { year: 4800, dayOfYear: 106 }, range: 'medium', dice
  });
  assert.equal(encounter.status, 'active');
  assert.equal(encounter.combatants.length, 2);
});

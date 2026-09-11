import test from 'node:test';
import assert from 'node:assert/strict';

import { authorizePlayerTokenMove, createPlayerTokenMove, playerMoveToCombatantMove } from '../src/player-token-movement.js';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { importCharacterDocument, importShipDocument } from '../vendor/classic-traveller-rules/index.js';
import { importCampaignBundle } from '../src/campaign-bundle.js';
import { createEncounterDocument, moveEncounterCombatantByPlayer } from '../src/encounter-document.js';

const campaign = {
  identity: { id: 'campaign-1' },
  ownership: { actors: { hawkeye: 'uid-hawkeye', marisol: 'uid-marisol' } }
};
const encounter = {
  identity: { id: 'encounter-1' }, campaignId: 'campaign-1', status: 'active', round: 3,
  combatants: [
    { id: 'hawkeye', playerCharacter: true, position: { column: 40, row: 85 } },
    { id: 'marisol', playerCharacter: true, position: { column: 40, row: 86 } },
    { id: 'raider', playerCharacter: false, position: { column: 45, row: 85 } }
  ]
};

function move(patch = {}) {
  return { uid: 'uid-hawkeye', encounterId: 'encounter-1', actorId: 'hawkeye', column: 42, row: 87, pace: 'walk', round: 3, movedAt: 1000, ...patch };
}

test('an assigned player may submit a map move for their own combatant', () => {
  assert.deepEqual(authorizePlayerTokenMove(move(), { campaign, encounter }), move());
});

test('a player may not move somebody else or an NPC', () => {
  assert.throws(() => authorizePlayerTokenMove(move({ actorId: 'marisol' }), { campaign, encounter }), /does not own/);
  assert.throws(() => authorizePlayerTokenMove(move({ actorId: 'raider' }), { campaign, encounter }), /not a player character/);
});

test('move intents reject forged encounter ids and off-map coordinates', () => {
  assert.throws(() => authorizePlayerTokenMove(move({ encounterId: 'elsewhere' }), { campaign, encounter }), /does not belong/);
  assert.throws(() => createPlayerTokenMove(move({ column: 1001 })), /1000-meter map/);
  assert.throws(() => createPlayerTokenMove(move({ row: -1 })), /1000-meter map/);
});

test('move intents enforce the current round and Book 1 grid allowance', () => {
  assert.throws(() => authorizePlayerTokenMove(move({ round: 2 }), { campaign, encounter }), /active encounter round/);
  assert.throws(() => authorizePlayerTokenMove(move({ column: 66 }), { campaign, encounter }), /exceeds 25/);
  assert.doesNotThrow(() => authorizePlayerTokenMove(move({ pace: 'run', column: 90, row: 85 }), { campaign, encounter }));
});

// v0.73.1: an authorized move must be applicable to the encounter as-is. The
// referee's client passed the intent (actorId) where the encounter wanted a
// combatantId, so every player drag was refused as "combatant is unavailable".
test('an authorized player move applies to the encounter through playerMoveToCombatantMove', async () => {
  const examples = path.join(path.dirname(fileURLToPath(import.meta.url)), '../examples');
  const character = importCharacterDocument(await readFile(path.join(examples, 'Hawkeye.character.json'), 'utf8'));
  const fixture = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/Sea-of-Suns-v0.11.2-buggy.campaign.json');
  const realCampaign = importCampaignBundle(await readFile(fixture, 'utf8')).campaign;
  realCampaign.ownership = { ownerUid: 'uid-ref', actors: { [character.identity.id]: 'uid-hawkeye' }, publishedAt: 1 };
  const fight = createEncounterDocument({
    campaign: realCampaign, character, opponent: { name: 'Raider' }, encounterKey: 'drag-test',
    date: { year: 4800, dayOfYear: 106 }, range: 'medium', metersPerSquare: 5,
    dice: { rollD6: () => 3, roll2D6: () => ({ dice: [3, 3], total: 6 }) }
  });
  const pc = fight.combatants.find((entry) => entry.side === 'party');
  const intent = createPlayerTokenMove({ uid: 'uid-hawkeye', encounterId: fight.identity.id, actorId: pc.id, column: pc.position.column + 10, row: pc.position.row, pace: 'walk', round: fight.round, movedAt: 5 });
  const authorized = authorizePlayerTokenMove(intent, { campaign: realCampaign, encounter: fight });
  assert.throws(() => moveEncounterCombatantByPlayer(fight, authorized), /combatant is unavailable/, 'the raw intent does not apply — this is the v0.61 bug');
  const moved = moveEncounterCombatantByPlayer(fight, playerMoveToCombatantMove(authorized));
  assert.equal(moved.encounter.combatants.find((entry) => entry.id === pc.id).position.column, pc.position.column + 10);
  assert.match(moved.entry.text, /10 m/);
});

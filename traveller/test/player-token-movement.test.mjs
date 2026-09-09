import test from 'node:test';
import assert from 'node:assert/strict';

import { authorizePlayerTokenMove, createPlayerTokenMove } from '../src/player-token-movement.js';

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

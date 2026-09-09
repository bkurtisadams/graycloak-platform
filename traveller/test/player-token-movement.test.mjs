import test from 'node:test';
import assert from 'node:assert/strict';

import { authorizePlayerTokenMove, createPlayerTokenMove } from '../src/player-token-movement.js';

const campaign = {
  identity: { id: 'campaign-1' },
  ownership: { actors: { hawkeye: 'uid-hawkeye', marisol: 'uid-marisol' } }
};
const encounter = {
  identity: { id: 'encounter-1' }, campaignId: 'campaign-1',
  combatants: [
    { id: 'hawkeye', playerCharacter: true },
    { id: 'marisol', playerCharacter: true },
    { id: 'raider', playerCharacter: false }
  ]
};

function move(patch = {}) {
  return { uid: 'uid-hawkeye', encounterId: 'encounter-1', actorId: 'hawkeye', column: 42, row: 87, movedAt: 1000, ...patch };
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
  assert.throws(() => createPlayerTokenMove(move({ column: 201 })), /201 by 201/);
  assert.throws(() => createPlayerTokenMove(move({ row: -1 })), /201 by 201/);
});

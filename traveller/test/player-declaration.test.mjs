import test from 'node:test';
import assert from 'node:assert/strict';

import { authorizePlayerDeclaration, createPlayerDeclaration } from '../src/player-declaration.js';

const campaign = {
  identity: { id: 'campaign-1' },
  ownership: { actors: { 'char-hawkeye': 'uid-hawkeye', 'char-marisol': 'uid-marisol' } }
};
const encounter = {
  identity: { id: 'encounter-1' }, campaignId: 'campaign-1', round: 3,
  combatants: [
    { id: 'char-hawkeye', side: 'party', playerCharacter: true },
    { id: 'char-marisol', side: 'party', playerCharacter: true },
    { id: 'foe-raider', side: 'opposition', playerCharacter: false }
  ]
};

function declaration(patch = {}) {
  return { uid: 'uid-hawkeye', actorId: 'char-hawkeye', action: 'attack', targetId: 'foe-raider', round: 3, declaredAt: 1000, ...patch };
}

test('a current declaration from the assigned player is accepted', () => {
  assert.deepEqual(authorizePlayerDeclaration(declaration(), { campaign, encounter }), declaration());
});

test('the referee rejects a declaration for another player character', () => {
  assert.throws(() => authorizePlayerDeclaration(declaration({ actorId: 'char-marisol' }), { campaign, encounter }), /does not own/);
});

test('the referee rejects stale rounds and non-player actors', () => {
  assert.throws(() => authorizePlayerDeclaration(declaration({ round: 2 }), { campaign, encounter }), /current round is 3/);
  assert.throws(() => authorizePlayerDeclaration(declaration({ actorId: 'foe-raider' }), { campaign, encounter }), /not a player character/);
});

test('declarations reject friendly targets and malformed action shapes', () => {
  assert.throws(() => authorizePlayerDeclaration(declaration({ targetId: 'char-marisol' }), { campaign, encounter }), /own side/);
  assert.throws(() => createPlayerDeclaration(declaration({ action: 'attack', targetId: null })), /requires a target/);
  assert.throws(() => createPlayerDeclaration(declaration({ action: 'evade', targetId: 'foe-raider' })), /does not take a target/);
});

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  generateCharacterName,
  generateShipName,
  generateShipRegistry
} from '../client/generators.js';

function sequence(values) {
  let index = 0;
  return () => values[index++];
}

test('character name generator is deterministic when a random source is injected', () => {
  assert.equal(generateCharacterName({ random: sequence([0, 0]) }), 'Adrian Ames');
});

test('ship name generator is opt-in and deterministic when a random source is injected', () => {
  assert.equal(generateShipName({ random: () => 0 }), 'Marisol');
});

test('Type S registry generator uses the project S-##### convention', () => {
  assert.equal(generateShipRegistry('S', { random: () => 0 }), 'S-10000');
  assert.equal(generateShipRegistry('s', { random: () => 0.99999 }), 'S-99999');
});

test('registry generator sanitizes a non-RAW type-code prefix', () => {
  assert.equal(generateShipRegistry(' x-2 ', { random: () => 0 }), 'X2-10000');
});

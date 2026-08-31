import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createSequenceDice,
  encodeCharacteristic,
  formatUPP,
  generateUPP
} from '../index.js';

test('initial characteristics are six independent 2D rolls in UPP order', () => {
  const dice = createSequenceDice([
    3, 4, // STR 7
    3, 4, // DEX 7
    3, 4, // END 7
    5, 6, // INT 11 = B
    3, 4, // EDU 7
    3, 4  // SOC 7
  ]);

  const generated = generateUPP({ dice });

  assert.deepEqual(generated.characteristics, {
    STR: 7,
    DEX: 7,
    END: 7,
    INT: 11,
    EDU: 7,
    SOC: 7
  });
  assert.equal(generated.upp, '777B77');
  assert.equal(dice.remaining(), 0);
});

test('UPP uses hexadecimal-style letters for characteristics above 9', () => {
  assert.equal(encodeCharacteristic(10), 'A');
  assert.equal(encodeCharacteristic(11), 'B');
  assert.equal(encodeCharacteristic(12), 'C');
  assert.equal(formatUPP({ STR: 10, DEX: 11, END: 12, INT: 9, EDU: 8, SOC: 7 }), 'ABC987');
});

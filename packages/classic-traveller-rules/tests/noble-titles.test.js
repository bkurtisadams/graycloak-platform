import test from 'node:test';
import assert from 'node:assert/strict';

import { NOBLE_TITLE_TABLE, nobleTitleEntitlement } from '../index.js';

test('Book 1 noble-title table preserves Social Standing B through F and the SOC C prefixes', () => {
  assert.deepEqual(NOBLE_TITLE_TABLE.map((entry) => [entry.code, entry.socialStanding, entry.titles, entry.alternatePrefixes]), [
    ['B', 11, ['Knight', 'Knightess', 'Dame'], []],
    ['C', 12, ['Baron', 'Baronet', 'Baroness'], ['von', 'haut', 'hault']],
    ['D', 13, ['Marquis', 'Marquesa', 'Marchioness'], []],
    ['E', 14, ['Count', 'Countess'], []],
    ['F', 15, ['Duke', 'Duchess'], []]
  ]);
});

test('noble entitlement begins at SOC 11 without inventing titles above the printed table', () => {
  assert.deepEqual(nobleTitleEntitlement(10), {
    eligible: false, listed: false, hereditary: false, landsAndAuthority: 'none', socialStanding: 10, code: 'A', titles: [], alternatePrefixes: []
  });
  assert.deepEqual(nobleTitleEntitlement(12), {
    eligible: true, listed: true, hereditary: true, landsAndAuthority: 'referee-discretion', socialStanding: 12, code: 'C', titles: ['Baron', 'Baronet', 'Baroness'], alternatePrefixes: ['von', 'haut', 'hault']
  });
  assert.deepEqual(nobleTitleEntitlement(16), {
    eligible: true, listed: false, hereditary: true, landsAndAuthority: 'referee-discretion', socialStanding: 16, code: 'G', titles: [], alternatePrefixes: []
  });
});

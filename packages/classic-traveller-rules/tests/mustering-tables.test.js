import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MUSTERING_OUT_TABLES,
  getMusterCash,
  getMusterBenefitOutcome,
  musterRollAllowance
} from '../index.js';

test('Book 1 mustering-out cash tables preserve service-specific values', () => {
  assert.equal(getMusterCash('navy', 1), 1000);
  assert.equal(getMusterCash('navy', 6), 50000);
  assert.equal(getMusterCash('scouts', 1), 20000);
  assert.equal(getMusterCash('merchants', 4), 20000);
  assert.equal(getMusterCash('other', 7), 100000);
});

test('Book 1 material-benefit table includes the service-specific ship results', () => {
  assert.deepEqual(getMusterBenefitOutcome('scouts', 6), { type: 'material', name: 'Scout Ship' });
  assert.deepEqual(getMusterBenefitOutcome('merchants', 7), { type: 'material', name: 'Free Trader' });
  assert.deepEqual(getMusterBenefitOutcome('other', 6), { type: 'none' });
  assert.equal(MUSTERING_OUT_TABLES.navy.benefits.length, 7);
});

test('rank adds the correct number of extra mustering-out rolls', () => {
  assert.deepEqual(musterRollAllowance(4, 0), { terms: 4, rankBonus: 0, total: 4 });
  assert.deepEqual(musterRollAllowance(4, 1), { terms: 4, rankBonus: 1, total: 5 });
  assert.deepEqual(musterRollAllowance(4, 3), { terms: 4, rankBonus: 2, total: 6 });
  assert.deepEqual(musterRollAllowance(4, 5), { terms: 4, rankBonus: 3, total: 7 });
});

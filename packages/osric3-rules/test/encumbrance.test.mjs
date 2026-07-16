import assert from 'node:assert/strict';
import test from 'node:test';

import {
  coinsToPounds,
  evaluateEncumbrance,
  getAdjustedMovementRate,
  getEncumbranceCategory,
  getEncumbranceThresholds,
  getRacialMovementRate,
  getStrengthWeightAllowance,
  poundsToCoins,
} from '../dist/index.js';

test('strength allowance includes exceptional Strength bands', () => {
  assert.equal(getStrengthWeightAllowance(3), -350);
  assert.equal(getStrengthWeightAllowance(10), 0);
  assert.equal(getStrengthWeightAllowance(17), 500);
  assert.equal(getStrengthWeightAllowance(18), 750);
  assert.equal(getStrengthWeightAllowance(18, 50), 1000);
  assert.equal(getStrengthWeightAllowance(18, 76), 1500);
  assert.equal(getStrengthWeightAllowance(18, 100), 3000);
});

test('encumbrance thresholds apply the Strength allowance', () => {
  assert.deepEqual(getEncumbranceThresholds(10), {
    normal: 350,
    heavy: 700,
    loaded: 1050,
    maximum: 1500,
  });
  assert.deepEqual(getEncumbranceThresholds(18, 100), {
    normal: 3350,
    heavy: 3700,
    loaded: 4050,
    maximum: 4500,
  });
});

test('encumbrance categories retain inclusive band boundaries', () => {
  assert.equal(getEncumbranceCategory(350, 10), 'normal');
  assert.equal(getEncumbranceCategory(351, 10), 'heavy');
  assert.equal(getEncumbranceCategory(700, 10), 'heavy');
  assert.equal(getEncumbranceCategory(1501, 10), 'overloaded');
});

test('movement helpers expose both racial rates and load multipliers', () => {
  assert.equal(getRacialMovementRate('human'), 12);
  assert.equal(getRacialMovementRate('dwarf', 'loaded'), 4.5);
  assert.equal(getAdjustedMovementRate(12, 'heavy'), 9);
  assert.equal(getAdjustedMovementRate(12, 'maximum'), 3);
});

test('encumbrance evaluation returns a stable summary and weight conversions', () => {
  assert.deepEqual(evaluateEncumbrance(701, 10), {
    totalCoinWeight: 701,
    thresholds: { normal: 350, heavy: 700, loaded: 1050, maximum: 1500 },
    category: 'loaded',
    movementMultiplier: 0.5,
  });
  assert.equal(coinsToPounds(120), 12);
  assert.equal(poundsToCoins(12), 120);
});

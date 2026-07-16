import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getActiveAbilityModifiers,
  getCharismaNpcReactionAdjustment,
  getConstitutionHitPointAdjustment,
} from '../dist/index.js';

test('Constitution hit-point adjustments preserve active chargen bands', () => {
  assert.equal(getConstitutionHitPointAdjustment(3), -2);
  assert.equal(getConstitutionHitPointAdjustment(6), -1);
  assert.equal(getConstitutionHitPointAdjustment(14), 0);
  assert.equal(getConstitutionHitPointAdjustment(15), 1);
  assert.equal(getConstitutionHitPointAdjustment(18), 4);
  assert.equal(getConstitutionHitPointAdjustment(19), 5);
});

test('Charisma NPC reaction adjustments preserve active chargen bands', () => {
  assert.equal(getCharismaNpcReactionAdjustment(3), -25);
  assert.equal(getCharismaNpcReactionAdjustment(5), -20);
  assert.equal(getCharismaNpcReactionAdjustment(8), -10);
  assert.equal(getCharismaNpcReactionAdjustment(12), 0);
  assert.equal(getCharismaNpcReactionAdjustment(15), 10);
  assert.equal(getCharismaNpcReactionAdjustment(17), 20);
  assert.equal(getCharismaNpcReactionAdjustment(18), 25);
});

test('active ability modifier summary combines the migrated calculations', () => {
  assert.deepEqual(
    getActiveAbilityModifiers({ str: 18, int: 10, wis: 10, dex: 10, con: 17, cha: 15 }, 76),
    {
      constitutionHitPointAdjustment: 3,
      charismaNpcReactionAdjustment: 10,
      strengthWeightAllowance: 1500,
    },
  );
});

test('ability modifier helpers reject nonfinite inputs', () => {
  assert.throws(() => getConstitutionHitPointAdjustment(Number.NaN), RangeError);
  assert.throws(() => getCharismaNpcReactionAdjustment(Number.POSITIVE_INFINITY), RangeError);
});

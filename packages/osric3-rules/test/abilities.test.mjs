import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyRacialAbilityAdjustments,
  isViableAbilitySet,
  RACIAL_ABILITY_LIMITS,
  rollAbilityMethodI,
  rollAbilityMethodII,
  rollAbilityMethodIII,
  rollAbilityMethodIV,
  rollAbilitySets,
} from '../dist/index.js';

function sequenceRandom(values) {
  let index = 0;
  return () => {
    const value = values[index % values.length];
    index += 1;
    return value;
  };
}

test('all four legacy ability methods return their documented shapes', () => {
  const random = sequenceRandom([0, 0.2, 0.4, 0.6, 0.8, 0.99]);
  const methodI = rollAbilityMethodI(random);
  const methodII = rollAbilityMethodII(random);
  const methodIII = rollAbilityMethodIII(random);
  const methodIV = rollAbilityMethodIV(random);

  assert.equal(methodI.length, 1);
  assert.equal(methodI[0].length, 6);
  assert.equal(methodII.length, 1);
  assert.equal(methodII[0].length, 6);
  assert.equal(methodIII.length, 1);
  assert.equal(methodIII[0].length, 6);
  assert.equal(methodIV.length, 12);
  assert.ok(methodIV.every((set) => set.length === 6));
});

test('generic ability method dispatcher preserves fixed method behavior', () => {
  const random = () => 0.5;
  assert.deepEqual(rollAbilitySets('I', random), [[12, 12, 12, 12, 12, 12]]);
  assert.deepEqual(rollAbilitySets('II', random), [[12, 12, 12, 12, 12, 12]]);
  assert.deepEqual(rollAbilitySets('III', random), [[12, 12, 12, 12, 12, 12]]);
  assert.equal(rollAbilitySets('IV', random).length, 12);
});

test('racial adjustments are applied and clamped to racial limits', () => {
  assert.deepEqual(
    applyRacialAbilityAdjustments(
      { str: 18, int: 18, wis: 18, dex: 18, con: 18, cha: 18 },
      'half-orc',
    ),
    { str: 18, int: 17, wis: 14, dex: 17, con: 19, cha: 12 },
  );

  assert.deepEqual(RACIAL_ABILITY_LIMITS.dwarf.con, [12, 19]);
  assert.deepEqual(RACIAL_ABILITY_LIMITS.halfling.str, [6, 17]);
});

test('viability check requires at least two scores of 15 or higher', () => {
  assert.equal(isViableAbilitySet([15, 15, 9, 9, 9, 9]), true);
  assert.equal(isViableAbilitySet([18, 16, 3, 3, 3, 3]), true);
  assert.equal(isViableAbilitySet([15, 14, 14, 14, 14, 14]), false);
});

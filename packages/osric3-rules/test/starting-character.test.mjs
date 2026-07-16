import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyAgeAdjustments,
  buildStartingCharacter,
  constitutionHitPointBonus,
  getAgeCategory,
  getClassExperienceBonus,
  rollMaximumAge,
  rollPercentileStrength,
  rollStartingAge,
  rollStartingGold,
  rollStartingHitPoints,
} from '../dist/index.js';

function sequenceRandom(values) {
  let index = 0;
  return () => {
    const value = values[index % values.length];
    index += 1;
    return value;
  };
}

const all18 = { str: 18, int: 18, wis: 18, dex: 18, con: 18, cha: 18 };

test('starting age, age category, and age adjustments are deterministic with injected randomness', () => {
  assert.equal(rollStartingAge('human', 'fighter', () => 0), 16);
  assert.equal(getAgeCategory('human', 16), 0);
  assert.equal(getAgeCategory('human', 41), 2);
  assert.deepEqual(
    applyAgeAdjustments({ str: 10, int: 10, wis: 10, dex: 10, con: 10, cha: 10 }, 'human', 1),
    { str: 11, int: 10, wis: 10, dex: 10, con: 11, cha: 10 },
  );
});

test('starting gold and hit points preserve current legacy calculations', () => {
  assert.equal(rollStartingGold('fighter', () => 0), 50);
  assert.equal(rollStartingGold('monk', () => 0), 5);
  assert.equal(constitutionHitPointBonus(18), 4);
  assert.equal(rollStartingHitPoints('magic-user', 18, () => 0), 3);
  assert.equal(rollStartingHitPoints('fighter', 18, () => 0), 5);
  assert.equal(rollStartingHitPoints('ranger', 18, () => 0), 10);
});

test('exceptional strength and class experience bonuses are class-aware', () => {
  assert.equal(rollPercentileStrength('fighter', 18, () => 0.49), 50);
  assert.equal(rollPercentileStrength('cleric', 18, () => 0.49), 0);
  assert.equal(getClassExperienceBonus('fighter', all18, 101), 11);
  assert.equal(getClassExperienceBonus('illusionist', all18, 101), 0);
});

test('single-class builder rejects NPC-only classes before rolling', () => {
  const result = buildStartingCharacter({
    raceId: 'half-orc',
    classId: 'cleric',
    baseScores: all18,
    random: () => {
      throw new Error('random should not be used for an illegal character');
    },
  });

  assert.equal(result.valid, false);
  assert.match(result.error, /cannot be a player-character cleric/i);
});

test('single-class builder returns a complete starting profile', () => {
  const result = buildStartingCharacter({
    raceId: 'human',
    classId: 'fighter',
    baseScores: { str: 16, int: 12, wis: 11, dex: 15, con: 15, cha: 10 },
    genderId: 'male',
    preRolledSecondarySkills: ['Armorer'],
    random: sequenceRandom([0.2, 0.4, 0.6, 0.8, 0.1, 0.3, 0.5, 0.7, 0.9]),
  });

  assert.equal(result.valid, true);
  assert.equal(result.genderId, 'male');
  assert.deepEqual(result.secondarySkills, ['Armorer']);
  assert.ok(result.height > 0);
  assert.ok(result.weight > 0);
  assert.ok(result.maximumAge >= result.age);
});

test('maximum age remains inside a plausible bracket', () => {
  const age = rollMaximumAge('human', sequenceRandom([0.5, 0.5]));
  assert.ok(age >= 91);
  assert.ok(age <= 120);
});

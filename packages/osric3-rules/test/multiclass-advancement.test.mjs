import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyMulticlassExperienceAward,
  splitMulticlassExperienceAward,
} from '../dist/index.js';

test('multiclass XP divides equally with fractions dropped', () => {
  assert.deepEqual(
    splitMulticlassExperienceAward(125, ['fighter', 'thief']),
    { fighter: 62, thief: 62 },
  );
  assert.deepEqual(
    splitMulticlassExperienceAward(101, ['fighter', 'magic-user', 'thief']),
    { fighter: 33, 'magic-user': 33, thief: 33 },
  );
});

test('multiclass XP advancement is tracked independently by class', () => {
  const result = applyMulticlassExperienceAward([
    { classId: 'fighter', experience: 1990 },
    { classId: 'thief', experience: 1240 },
  ], 40);
  assert.deepEqual(result, [
    {
      classId: 'fighter', previousExperience: 1990, awardedExperience: 20,
      experience: 2010, previousLevel: 1, level: 2, gainedLevels: 1,
      nextLevelThreshold: 4001,
    },
    {
      classId: 'thief', previousExperience: 1240, awardedExperience: 20,
      experience: 1260, previousLevel: 1, level: 2, gainedLevels: 1,
      nextLevelThreshold: 2501,
    },
  ]);
});

test('multiclass helpers reject duplicate or incomplete class lists', () => {
  assert.throws(() => splitMulticlassExperienceAward(10, ['fighter']), /at least two/i);
  assert.throws(() => splitMulticlassExperienceAward(10, ['fighter', 'fighter']), /unique/i);
});

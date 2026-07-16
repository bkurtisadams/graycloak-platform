import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getAdvancementSnapshot,
  getExperienceThreshold,
  getExperienceToNextLevel,
  getHitDiceAtLevel,
  getLevelForExperience,
  getLevelTitle,
} from '../dist/index.js';

test('experience thresholds include table values and post-table increments', () => {
  assert.equal(getExperienceThreshold('fighter', 1), 0);
  assert.equal(getExperienceThreshold('fighter', 9), 250001);
  assert.equal(getExperienceThreshold('fighter', 12), 1000001);
  assert.equal(getExperienceThreshold('cleric', 12), 900001);
  assert.equal(getExperienceThreshold('druid', 15), null);
});

test('experience resolves to the highest attained level', () => {
  assert.equal(getLevelForExperience('fighter', 0), 1);
  assert.equal(getLevelForExperience('fighter', 2000), 1);
  assert.equal(getLevelForExperience('fighter', 2001), 2);
  assert.equal(getLevelForExperience('fighter', 1000001), 12);
  assert.equal(getLevelForExperience('druid', 99999999), 14);
});

test('experience remaining reports zero for characters already over threshold', () => {
  assert.equal(getExperienceToNextLevel('thief', 1, 100), 1151);
  assert.equal(getExperienceToNextLevel('thief', 1, 1300), 0);
  assert.equal(getExperienceToNextLevel('monk', 17, 9999999), null);
});

test('level titles preserve named levels and produce correct ordinals afterward', () => {
  assert.equal(getLevelTitle('fighter', 1), 'Veteran');
  assert.equal(getLevelTitle('fighter', 9), 'Lord');
  assert.equal(getLevelTitle('fighter', 11), 'Lord (11th level)');
  assert.equal(getLevelTitle('fighter', 22), 'Lord (22nd level)');
});

test('hit-die progression handles classes that start with two dice', () => {
  assert.deepEqual(getHitDiceAtLevel('fighter', 1), { dice: 1, dieSize: 10, flatBonus: 0 });
  assert.deepEqual(getHitDiceAtLevel('fighter', 10), { dice: 9, dieSize: 10, flatBonus: 3 });
  assert.deepEqual(getHitDiceAtLevel('ranger', 1), { dice: 2, dieSize: 8, flatBonus: 0 });
  assert.deepEqual(getHitDiceAtLevel('ranger', 11), { dice: 11, dieSize: 8, flatBonus: 2 });
});

test('advancement snapshot presents one stable browser-facing shape', () => {
  assert.deepEqual(getAdvancementSnapshot('magic-user', 5), {
    classId: 'magic-user',
    level: 5,
    title: 'Thaumaturgist',
    experienceThreshold: 22501,
    nextLevelThreshold: 40001,
    hitDice: { dice: 5, dieSize: 4, flatBonus: 0 },
  });
});

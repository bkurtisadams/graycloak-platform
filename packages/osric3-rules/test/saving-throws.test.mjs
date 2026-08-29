import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getBestMulticlassSavingThrows,
  getSavingThrows,
  savingThrowsToRecord,
} from '../dist/index.js';

test('saving throws move through the correct class brackets', () => {
  assert.deepEqual(getSavingThrows('fighter', 0), [16, 17, 18, 20, 19]);
  assert.deepEqual(getSavingThrows('fighter', 1), [14, 15, 16, 17, 17]);
  assert.deepEqual(getSavingThrows('fighter', 5), [11, 12, 13, 13, 14]);
  assert.deepEqual(getSavingThrows('fighter', 19), [2, 3, 4, 3, 5]);   // 19+ band
  assert.deepEqual(getSavingThrows('ranger', 19), [2, 3, 4, 3, 5]);
  assert.deepEqual(getSavingThrows('cleric', 7), [7, 10, 11, 13, 12]);
  assert.deepEqual(getSavingThrows('magic-user', 11), [11, 9, 7, 11, 8]);
  // The printed thief table ends at 17-20; higher levels hold that row.
  assert.deepEqual(getSavingThrows('thief', 17), [9, 8, 6, 12, 7]);
  assert.deepEqual(getSavingThrows('thief', 21), [9, 8, 6, 12, 7]);
});

test('paladins and monks use their own printed tables', () => {
  // Not the fighter table less two: the top bands floor differently.
  assert.deepEqual(getSavingThrows('paladin', 1), [12, 13, 14, 15, 15]);
  assert.deepEqual(getSavingThrows('paladin', 17), [2, 2, 3, 2, 4]);
  assert.deepEqual(getSavingThrows('paladin', 19), [2, 2, 2, 2, 3]);
  // Monks are not thieves: breath and spell diverge from level 5.
  assert.deepEqual(getSavingThrows('monk', 5), [12, 11, 12, 15, 13]);
  assert.deepEqual(getSavingThrows('monk', 17), [9, 8, 6, 12, 7]);
});

test('multiclass saving throws choose the best target in each category', () => {
  assert.deepEqual(
    getBestMulticlassSavingThrows([
      { classId: 'fighter', level: 5 },
      { classId: 'magic-user', level: 5 },
    ]),
    [11, 12, 11, 13, 12],
  );
});

test('saving throw arrays convert into named records', () => {
  assert.deepEqual(savingThrowsToRecord([10, 11, 12, 13, 14]), {
    'paralyzation-poison-death': 10,
    'petrification-polymorph': 11,
    'rod-staff-wand': 12,
    'breath-weapon': 13,
    spell: 14,
  });
});

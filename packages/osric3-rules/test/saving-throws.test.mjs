import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getBestMulticlassSavingThrows,
  getSavingThrows,
  savingThrowsToRecord,
} from '../dist/index.js';

test('saving throws move through the correct class brackets', () => {
  assert.deepEqual(getSavingThrows('fighter', 1), [14, 15, 16, 17, 17]);
  assert.deepEqual(getSavingThrows('fighter', 5), [11, 12, 13, 13, 14]);
  assert.deepEqual(getSavingThrows('cleric', 7), [7, 10, 11, 13, 12]);
  assert.deepEqual(getSavingThrows('magic-user', 11), [11, 9, 7, 11, 8]);
  assert.deepEqual(getSavingThrows('thief', 21), [8, 7, 9, 11, 10]);
});

test('paladins receive the active legacy two-point saving throw adjustment', () => {
  assert.deepEqual(getSavingThrows('paladin', 1), [12, 13, 14, 15, 15]);
  assert.deepEqual(getSavingThrows('paladin', 17), [1, 2, 3, 3, 4]);
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

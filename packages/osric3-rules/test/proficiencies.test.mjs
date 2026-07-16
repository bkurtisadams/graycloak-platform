import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getNonproficiencyPenalty,
  getWeaponProficiencySlots,
} from '../dist/index.js';

test('weapon proficiency slots increase on class schedules', () => {
  assert.equal(getWeaponProficiencySlots('fighter', 1), 4);
  assert.equal(getWeaponProficiencySlots('fighter', 3), 4);
  assert.equal(getWeaponProficiencySlots('fighter', 4), 5);
  assert.equal(getWeaponProficiencySlots('magic-user', 7), 2);
  assert.equal(getWeaponProficiencySlots('monk', 5), 3);
});

test('nonproficiency penalties remain class-specific', () => {
  assert.equal(getNonproficiencyPenalty('fighter'), -2);
  assert.equal(getNonproficiencyPenalty('druid'), -4);
  assert.equal(getNonproficiencyPenalty('magic-user'), -5);
});

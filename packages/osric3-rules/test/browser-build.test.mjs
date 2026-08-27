import assert from 'node:assert/strict';
import test from 'node:test';

import * as browserRules from '../dist/browser/index.js';

test('browser build exports the rules kernel without a Node adapter', () => {
  assert.equal(browserRules.OSRIC3_RULESET.packageVersion, '0.9.0');
  assert.equal(browserRules.getExperienceThreshold('fighter', 2), 2001);
  assert.deepEqual(browserRules.getSavingThrows('cleric', 1), [10, 13, 14, 16, 15]);
  assert.equal(browserRules.getRacialMovementRate('halfling', 'maximum'), 2.25);
});

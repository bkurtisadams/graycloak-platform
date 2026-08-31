import test from 'node:test';
import assert from 'node:assert/strict';

import * as publicApi from '../index.js';
import * as chargen from '../src/characters/chargen.js';

test('v0.2 acquired-skill and term-completion functions are exported by both chargen and package API', () => {
  const expectedFunctions = [
    'rollAcquiredSkill',
    'resolveSkillSpecialization',
    'completeTerm'
  ];

  for (const name of expectedFunctions) {
    assert.equal(typeof chargen[name], 'function', `chargen.js must export ${name}`);
    assert.equal(typeof publicApi[name], 'function', `index.js must export ${name}`);
    assert.equal(publicApi[name], chargen[name], `${name} must be the same public function`);
  }
});

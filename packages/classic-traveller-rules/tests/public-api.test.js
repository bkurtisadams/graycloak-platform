import test from 'node:test';
import assert from 'node:assert/strict';

import * as publicApi from '../index.js';
import * as chargen from '../src/characters/chargen.js';

test('character-generation public API exposes acquired skills, aging, reenlistment, and mustering out', () => {
  const expectedFunctions = [
    'rollAcquiredSkill',
    'resolveSkillSpecialization',
    'completeTerm',
    'resolveAging',
    'resolveAgingCrisis',
    'resolveReenlistment',
    'chooseReenlistment',
    'chooseMusterOut',
    'beginMusterOut',
    'rollMusterOutCash',
    'rollMusterOutBenefit',
    'resolveMusterBenefitSpecialization'
  ];

  for (const name of expectedFunctions) {
    assert.equal(typeof chargen[name], 'function', `chargen.js must export ${name}`);
    assert.equal(typeof publicApi[name], 'function', `index.js must export ${name}`);
    assert.equal(publicApi[name], chargen[name], `${name} must be the same public function`);
  }
});


test('v0.4 public API exposes lifecycle and JSON boundary helpers', () => {
  for (const name of [
    'getAvailableActions',
    'performChargenAction',
    'validateCharacter',
    'assertValidCharacter',
    'exportCharacter',
    'importCharacter'
  ]) {
    assert.equal(typeof publicApi[name], 'function', `index.js must export ${name}`);
  }
  assert.equal(typeof publicApi.CHARGEN_ACTIONS, 'object');
  assert.equal(publicApi.CURRENT_CHARACTER_SCHEMA_VERSION, 4);
});

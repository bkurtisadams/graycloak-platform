import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SKILL_TABLE_KEYS,
  availableSkillTables,
  getAcquiredSkillOutcome
} from '../index.js';

function characterWithEducation(EDU) {
  return { characteristics: { EDU } };
}

test('the four Book 1 acquired-skill tables are exposed in selection order', () => {
  assert.deepEqual(SKILL_TABLE_KEYS, [
    'personal-development',
    'service-skills',
    'advanced-education',
    'advanced-education-8'
  ]);
});

test('Advanced Education (EDU 8+) is restricted to education 8 or greater', () => {
  assert.deepEqual(availableSkillTables(characterWithEducation(7)), [
    'personal-development',
    'service-skills',
    'advanced-education'
  ]);
  assert.deepEqual(availableSkillTables(characterWithEducation(8)), SKILL_TABLE_KEYS);
});

test('selected acquired-skill entries reproduce the Book 1 table', () => {
  assert.deepEqual(getAcquiredSkillOutcome('navy', 'personal-development', 6), {
    type: 'characteristic', characteristic: 'SOC', amount: 1
  });
  assert.deepEqual(getAcquiredSkillOutcome('scouts', 'service-skills', 4), {
    type: 'skill', name: 'Navigation'
  });
  assert.deepEqual(getAcquiredSkillOutcome('other', 'personal-development', 6), {
    type: 'characteristic', characteristic: 'SOC', amount: -1
  });
  assert.deepEqual(getAcquiredSkillOutcome('merchants', 'advanced-education-8', 5), {
    type: 'skill', name: 'Pilot'
  });
  assert.deepEqual(getAcquiredSkillOutcome('army', 'service-skills', 3), {
    type: 'specialization', name: 'Gun Combat', specializationType: 'gun'
  });
});

test('Book 1 specialization lists distinguish guns, blades/polearms, and vehicles', async () => {
  const { getSpecializationOptions } = await import('../index.js');

  assert.ok(getSpecializationOptions('gun').includes('Rifle'));
  assert.ok(!getSpecializationOptions('vehicle').includes('Rifle'));
  assert.ok(getSpecializationOptions('vehicle').includes('Grav Vehicle'));
  assert.ok(getSpecializationOptions('vehicle').includes('Helicopter'));
  assert.ok(getSpecializationOptions('blade-or-polearm').includes('Cutlass'));
});

test('specialization canonicalization accepts case differences but not cross-category choices', async () => {
  const { canonicalSpecialization } = await import('../index.js');

  assert.equal(canonicalSpecialization('gun', 'rifle'), 'Rifle');
  assert.equal(canonicalSpecialization('vehicle', 'grav vehicle'), 'Grav Vehicle');
  assert.equal(canonicalSpecialization('vehicle', 'Rifle'), null);
});

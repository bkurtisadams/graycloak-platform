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

test('selected acquired-skill entries reproduce the Book 1 p.11 table', () => {
  // v1.219.00: this test carried the book's name while asserting entries that
  // are not in it — Navy personal development 6 as SOC, Scouts service skills 4
  // as Navigation, Army service skills 3 as Gun Combat. It passed against a
  // table that differed from the 1977 printing in 32 places, which is how the
  // whole set stayed wrong through 62 green tests. Every assertion below is
  // read off the printed column.
  //
  // Navy personal development runs +1 STR, DEX, END, SOC, INT, EDU.
  assert.deepEqual(getAcquiredSkillOutcome('navy', 'personal-development', 4), {
    type: 'characteristic', characteristic: 'SOC', amount: 1
  });
  assert.deepEqual(getAcquiredSkillOutcome('navy', 'personal-development', 6), {
    type: 'characteristic', characteristic: 'EDU', amount: 1
  });
  // Scouts service skills: Air/Raft, Vacc Suit, Navigation, Mechanical,
  // Electronics, Jack-of-All-Trades.
  assert.deepEqual(getAcquiredSkillOutcome('scouts', 'service-skills', 3), {
    type: 'skill', name: 'Navigation'
  });
  assert.deepEqual(getAcquiredSkillOutcome('scouts', 'service-skills', 4), {
    type: 'skill', name: 'Mechanical'
  });
  // Army service skills 3 is Forward Observer, not Gun Combat.
  assert.deepEqual(getAcquiredSkillOutcome('army', 'service-skills', 3), {
    type: 'skill', name: 'Forward Observer'
  });
  // Merchant service skills 3 is a characteristic, the only one in that table.
  assert.deepEqual(getAcquiredSkillOutcome('merchants', 'service-skills', 3), {
    type: 'characteristic', characteristic: 'STR', amount: 1
  });
  // Other service skills 1 is Forgery.
  assert.deepEqual(getAcquiredSkillOutcome('other', 'service-skills', 1), {
    type: 'skill', name: 'Forgery'
  });
  // Book 1 p.11 names ATV and Air/Raft as specific skills; only blade and gun
  // combat are chosen on acquisition.
  assert.deepEqual(getAcquiredSkillOutcome('marines', 'service-skills', 1), {
    type: 'skill', name: 'ATV'
  });
  // These two were already right.
  assert.deepEqual(getAcquiredSkillOutcome('other', 'personal-development', 6), {
    type: 'characteristic', characteristic: 'SOC', amount: -1
  });
  assert.deepEqual(getAcquiredSkillOutcome('merchants', 'advanced-education-8', 5), {
    type: 'skill', name: 'Pilot'
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

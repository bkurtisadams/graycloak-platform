import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyWisdomBonusSpells,
  getBaseSpellSlots,
  getSpellSlots,
  getWisdomBonusSpells,
} from '../dist/index.js';

test('Wisdom bonus tables clamp scores and return copies', () => {
  assert.deepEqual(getWisdomBonusSpells(12), [0, 0, 0, 0]);
  assert.deepEqual(getWisdomBonusSpells(18), [2, 2, 1, 1]);
  assert.deepEqual(getWisdomBonusSpells(99), [3, 3, 3, 3]);
});

test('corrected Wisdom bonuses do not unlock unavailable spell levels', () => {
  assert.deepEqual(applyWisdomBonusSpells([1, 0, 0, 0], 18), [3, 0, 0, 0]);
  assert.deepEqual(
    applyWisdomBonusSpells([1, 0, 0, 0], 18, 'legacy-parity'),
    [3, 2, 1, 1],
  );
});

test('full casters receive the expected base progressions', () => {
  assert.deepEqual(getBaseSpellSlots('cleric', 1), { type: 'Cleric', levels: [1, 0, 0, 0, 0, 0, 0] });
  assert.deepEqual(getBaseSpellSlots('druid', 3), { type: 'Druid', levels: [3, 2, 1, 0, 0, 0, 0] });
  assert.deepEqual(getBaseSpellSlots('magic-user', 5), { type: 'Magic-User', levels: [4, 2, 1, 0, 0, 0, 0, 0, 0] });
  assert.deepEqual(getBaseSpellSlots('illusionist', 8), { type: 'Illusionist', levels: [4, 3, 2, 1, 0, 0, 0] });
});

test('paladin and ranger progressions begin at their class thresholds', () => {
  assert.equal(getBaseSpellSlots('paladin', 8), null);
  assert.deepEqual(getBaseSpellSlots('paladin', 9), { type: 'Cleric', levels: [1, 0, 0, 0] });
  assert.equal(getBaseSpellSlots('ranger', 7), null);
  assert.deepEqual(getBaseSpellSlots('ranger', 13), {
    type: 'Ranger',
    druid: [2, 1, 0],
    mu: [2, 1],
  });
});

test('non-spellcasting classes return no spell slots', () => {
  for (const classId of ['fighter', 'thief', 'assassin', 'monk']) {
    assert.equal(getSpellSlots(classId, 20, 18), null);
  }
});

test('spell rows cap at the final imported class table row', () => {
  assert.deepEqual(getBaseSpellSlots('druid', 99), getBaseSpellSlots('druid', 14));
  assert.deepEqual(getBaseSpellSlots('ranger', 99), getBaseSpellSlots('ranger', 17));
});

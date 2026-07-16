import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canPlaySingleClass,
  getRaceLevelCap,
  getSingleClassEligibility,
  getValidMulticlassCombinations,
  isValidMulticlassCombination,
} from '../dist/index.js';

const strong = { str: 18, int: 18, wis: 18, dex: 18, con: 18, cha: 18 };

test('NPC-only single classes are rejected', () => {
  assert.equal(canPlaySingleClass('dwarf', 'cleric', strong), false);
  assert.equal(canPlaySingleClass('gnome', 'cleric', strong), false);
  assert.equal(canPlaySingleClass('half-orc', 'cleric', strong), false);
  assert.equal(getSingleClassEligibility('half-orc', 'cleric', strong).reason, 'npc-only');
});

test('unlimited and stat-dependent level caps are represented explicitly', () => {
  assert.equal(getRaceLevelCap('human', 'fighter', strong), null);
  assert.equal(getRaceLevelCap('dwarf', 'fighter', strong), 9);
  assert.equal(getRaceLevelCap('dwarf', 'fighter', { ...strong, str: 17 }), 8);
  assert.equal(getRaceLevelCap('dwarf', 'fighter', { ...strong, str: 16 }), 7);
});

test('class minimums are checked before race eligibility', () => {
  const result = getSingleClassEligibility('human', 'paladin', {
    str: 18,
    int: 18,
    wis: 18,
    dex: 18,
    con: 18,
    cha: 16,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'below-minimums');
  assert.deepEqual(result.missingMinimums.cha, { required: 17, actual: 16 });
});

test('listed multiclass combinations remain distinct from single-class permission', () => {
  assert.equal(canPlaySingleClass('half-orc', 'cleric', strong), false);
  assert.equal(isValidMulticlassCombination('half-orc', ['cleric', 'fighter'], strong), true);

  const combinations = getValidMulticlassCombinations('half-orc', strong);
  assert.ok(combinations.some((entry) => entry.join('|') === 'cleric|fighter'));
});

test('unlisted multiclass combinations are rejected', () => {
  assert.equal(isValidMulticlassCombination('elf', ['cleric', 'fighter'], strong), false);
  assert.equal(isValidMulticlassCombination('human', ['fighter', 'magic-user'], strong), false);
});

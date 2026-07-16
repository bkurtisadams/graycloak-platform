import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getCharismaDisplayProfile,
  getConstitutionDisplayProfile,
  getDexterityDisplayProfile,
  getIntelligenceDisplayProfile,
  getStrengthCombatProfile,
  getWisdomDisplayProfile,
} from '../dist/index.js';

test('exceptional Strength combat bands are centralized', () => {
  assert.deepEqual(getStrengthCombatProfile(18), { hitAdjustment: 1, damageAdjustment: 2, exceptionalBand: 'none' });
  assert.deepEqual(getStrengthCombatProfile(18, 1), { hitAdjustment: 1, damageAdjustment: 3, exceptionalBand: '01-50' });
  assert.deepEqual(getStrengthCombatProfile(18, 100), { hitAdjustment: 3, damageAdjustment: 6, exceptionalBand: '00' });
});

test('Intelligence and Wisdom profiles expose safe audited fields', () => {
  assert.deepEqual(getIntelligenceDisplayProfile(18), {
    additionalLanguages: 7,
    learnSpellChance: null,
    minimumSpellsPerLevel: null,
    maximumSpellsPerLevel: null,
  });
  assert.deepEqual(getWisdomDisplayProfile(18), {
    magicalAttackAdjustment: 4,
    bonusSpells: [2, 2, 1, 1],
    spellFailureChance: 0,
  });
});

test('Dexterity, Constitution, and Charisma display profiles cover sheet fields', () => {
  assert.deepEqual(getDexterityDisplayProfile(18), {
    reactionAdjustment: 3,
    missileAdjustment: 3,
    defenseAdjustment: -4,
  });
  assert.deepEqual(getConstitutionDisplayProfile(17), {
    hitPointAdjustment: 2,
    fighterHitPointAdjustment: 3,
    systemShockChance: 97,
    resurrectionSurvivalChance: 98,
  });
  assert.deepEqual(getCharismaDisplayProfile(16), {
    maximumHenchmen: 8,
    loyaltyAdjustment: 20,
    reactionAdjustment: 25,
  });
});

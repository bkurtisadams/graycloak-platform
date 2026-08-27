import assert from 'node:assert/strict';
import test from 'node:test';

import {
  awardLegacyCharacterExperience,
  parseLegacyCharacterClasses,
} from '../dist/index.js';

test('legacy class parsing normalizes current GCC display names', () => {
  assert.deepEqual(parseLegacyCharacterClasses('Fighter / Magic User / Thief'), [
    'fighter', 'magic-user', 'thief',
  ]);
  assert.deepEqual(parseLegacyCharacterClasses('magic_user'), ['magic-user']);
});

test('single-class awards update XP, level, and next threshold without mutating input', () => {
  const original = { characterClass: 'Fighter', xpTotal: 1990, level: 1, xpNextLevel: 2001 };
  const result = awardLegacyCharacterExperience(original, 20);
  assert.equal(result.applied, true);
  assert.deepEqual(result.character, {
    characterClass: 'Fighter', xpTotal: 2010, level: 2, xpNextLevel: 4001,
  });
  assert.equal(original.xpTotal, 1990);
  assert.equal(result.components[0].gainedLevels, 1);
});

test('multiclass awards split into the three legacy XP slots independently', () => {
  const result = awardLegacyCharacterExperience({
    characterClass: 'Fighter / Magic User / Thief',
    xpTotal: 1990,
    xpTotal2: 2490,
    xpTotal3: 1240,
    level: '1/1/1',
  }, 101);

  assert.equal(result.applied, true);
  assert.equal(result.character.xpTotal, 2023);
  assert.equal(result.character.xpTotal2, 2523);
  assert.equal(result.character.xpTotal3, 1273);
  assert.equal(result.character.level, '2/2/2');
  assert.equal(result.character.xpNextLevel, 4001);
  assert.equal(result.character.xpNextLevel2, 5001);
  assert.equal(result.character.xpNextLevel3, 2501);
  assert.deepEqual(result.components.map((component) => component.awardedExperience), [33, 33, 33]);
});

test('unsupported class records are left untouched for the combat fallback', () => {
  const original = { characterClass: 'Bard', xpTotal: 100 };
  const result = awardLegacyCharacterExperience(original, 50);
  assert.equal(result.applied, false);
  assert.equal(result.reason, 'unsupported-class');
  assert.deepEqual(result.character, original);
});

test('single-class awards include the prime-requisite bonus when ability scores qualify', () => {
  const result = awardLegacyCharacterExperience({
    characterClass: 'Fighter', str: 16, int: 9, wis: 9, dex: 9, con: 12, cha: 9,
    xpTotal: 1000, level: 1,
  }, 101);

  assert.equal(result.applied, true);
  assert.equal(result.totalAward, 101);
  assert.equal(result.bonusAward, 11);
  assert.equal(result.creditedAward, 112);
  assert.equal(result.character.xpTotal, 1112);
  assert.equal(result.components[0].baseAwardedExperience, 101);
  assert.equal(result.components[0].bonusExperience, 11);
  assert.equal(result.components[0].awardedExperience, 112);
});

test('multiclass prime-requisite bonuses are calculated independently after splitting the base award', () => {
  const result = awardLegacyCharacterExperience({
    characterClass: 'Fighter / Magic User',
    str: 16, int: 15, wis: 9, dex: 9, con: 12, cha: 9,
    xpTotal: 1000, xpTotal2: 1000, level: '1/1',
  }, 101);

  assert.equal(result.applied, true);
  assert.deepEqual(result.components.map((component) => component.baseAwardedExperience), [50, 50]);
  assert.deepEqual(result.components.map((component) => component.bonusExperience), [5, 0]);
  assert.deepEqual(result.components.map((component) => component.awardedExperience), [55, 50]);
  assert.equal(result.bonusAward, 5);
  assert.equal(result.creditedAward, 105);
  assert.equal(result.character.xpTotal, 1055);
  assert.equal(result.character.xpTotal2, 1050);
});

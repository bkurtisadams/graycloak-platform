import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

import {
  AGE_ADJUSTMENTS,
  AGE_BRACKETS,
  CLASS_HIT_DICE,
  EXPERIENCE_PER_LEVEL_AFTER_TABLE,
  EXPERIENCE_TABLES,
  FIGHTER_SAVING_THROWS,
  CLERIC_SAVING_THROWS,
  MAGIC_USER_SAVING_THROWS,
  THIEF_SAVING_THROWS,
  HIT_DIE_PROGRESSION,
  CLERIC_SPELLS,
  DRUID_SPELLS,
  MAGIC_USER_SPELLS,
  ILLUSIONIST_SPELLS,
  PALADIN_SPELLS,
  RANGER_SPELLS,
  WISDOM_BONUS_SPELLS,
  LEVEL_TITLES,
  CLASS_MINIMUMS,
  MULTICLASS_COMBINATIONS,
  RACIAL_ABILITY_ADJUSTMENTS,
  RACIAL_ABILITY_LIMITS,
  applyAgeAdjustments,
  applyRacialAbilityAdjustments,
  buildStartingCharacter,
  getAgeCategory,
  getClassExperienceBonus,
  getCharismaNpcReactionAdjustment,
  getConstitutionHitPointAdjustment,
  getLevelTitle,
  getSpellSlots,
  getNonproficiencyPenalty,
  getSavingThrows,
  getWeaponProficiencySlots,
  getCumulativeAgeAdjustments,
  rollAbilityMethodI,
  rollAbilityMethodII,
  rollAbilityMethodIII,
  rollAbilityMethodIV,
  rollHeightWeight,
  rollMaximumAge,
  rollPercentileStrength,
  rollSecondarySkills,
  rollStartingAge,
  rollStartingGold,
  rollStartingHitPoints,
} from '../dist/index.js';

const require = createRequire(import.meta.url);
const legacy = require('../../../gcc/adnd-chargen.js');
let legacyClassData = null;
try {
  legacyClassData = require('../../../gcc/adnd-class-data.js');
} catch {
  // The cumulative patch test fixture omits unchanged repository files.
  // The real repository and CI contain this file, so parity runs there.
}

function sequenceRandom(values) {
  let index = 0;
  return () => {
    const value = values[index % values.length];
    index += 1;
    return value;
  };
}

function runLegacyWithRandom(values, callback) {
  const previous = Math.random;
  Math.random = sequenceRandom(values);
  try {
    return callback();
  } finally {
    Math.random = previous;
  }
}

const values = [0, 0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.84, 0.96];
const scores = { str: 16, int: 12, wis: 11, dex: 15, con: 15, cha: 10 };

test('migrated static tables match the active legacy engine', () => {
  assert.deepEqual(RACIAL_ABILITY_ADJUSTMENTS, legacy.RACIAL_ADJ);
  assert.deepEqual(RACIAL_ABILITY_LIMITS, legacy.RACIAL_LIMITS);
  assert.deepEqual(CLASS_MINIMUMS, legacy.CLASS_MINS);
  assert.deepEqual(AGE_BRACKETS, legacy.AGE_BRACKETS);
  assert.deepEqual(AGE_ADJUSTMENTS, legacy.AGE_ADJ);
  assert.deepEqual(CLASS_HIT_DICE, legacy.CLASS_HD);
  assert.deepEqual(
    Object.fromEntries(Object.entries(MULTICLASS_COMBINATIONS).filter(([raceId]) => raceId !== 'human')),
    legacy.MULTICLASS_COMBOS,
  );
  assert.deepEqual(MULTICLASS_COMBINATIONS.human, []);
});

test('ability generation methods match the active legacy engine for the same random stream', () => {
  assert.deepEqual(
    rollAbilityMethodI(sequenceRandom(values)),
    runLegacyWithRandom(values, () => legacy.rollMethodI()),
  );
  assert.deepEqual(
    rollAbilityMethodII(sequenceRandom(values)),
    runLegacyWithRandom(values, () => legacy.rollMethodII()),
  );
  assert.deepEqual(
    rollAbilityMethodIII(sequenceRandom(values)),
    runLegacyWithRandom(values, () => legacy.rollMethodIII()),
  );
  assert.deepEqual(
    rollAbilityMethodIV(sequenceRandom(values)),
    runLegacyWithRandom(values, () => legacy.rollMethodIV()),
  );
});

test('racial and age transformations match the active legacy engine', () => {
  assert.deepEqual(
    applyRacialAbilityAdjustments(scores, 'dwarf'),
    legacy.applyRacialAdj(scores, 'dwarf'),
  );
  assert.equal(getAgeCategory('human', 42), legacy.getAgeCategory('human', 42));
  assert.deepEqual(getCumulativeAgeAdjustments(3), legacy.getAgeCumulativeAdj(3));
  assert.deepEqual(
    applyAgeAdjustments(scores, 'human', 3),
    legacy.applyAgeAdj(scores, 'human', 3),
  );
});

test('starting-character random calculations match the active legacy engine', () => {
  assert.equal(
    rollStartingAge('elf', 'magic-user', sequenceRandom(values)),
    runLegacyWithRandom(values, () => legacy.rollStartingAge('elf', 'magic-user')),
  );
  assert.equal(
    rollMaximumAge('human', sequenceRandom(values)),
    runLegacyWithRandom(values, () => legacy.rollMaxAge('human')),
  );
  assert.deepEqual(
    rollHeightWeight('half-elf', 'female', sequenceRandom(values)),
    runLegacyWithRandom(values, () => legacy.rollHeightWeight('half-elf', 'female')),
  );
  assert.deepEqual(
    rollSecondarySkills(sequenceRandom(values)),
    runLegacyWithRandom(values, () => legacy.rollSecondarySkills()),
  );
  assert.equal(
    rollStartingGold('fighter', sequenceRandom(values)),
    runLegacyWithRandom(values, () => legacy.rollStartingGold('fighter')),
  );
  assert.equal(
    rollStartingHitPoints('ranger', 17, sequenceRandom(values)),
    runLegacyWithRandom(values, () => legacy.rollHp('ranger', 17)),
  );
  assert.equal(
    rollPercentileStrength('fighter', 18, sequenceRandom(values)),
    runLegacyWithRandom(values, () => legacy.rollPercentileStr('fighter', 18)),
  );
  assert.equal(getClassExperienceBonus('fighter', scores, 101), legacy.classXPBonus('fighter', scores, 101));
});

test('starting-character builder matches the legacy profile for the same random stream', () => {
  const modern = buildStartingCharacter({
    raceId: 'human',
    classId: 'fighter',
    baseScores: scores,
    genderId: 'male',
    preRolledSecondarySkills: ['Armorer'],
    random: sequenceRandom(values),
  });
  const old = runLegacyWithRandom(values, () =>
    legacy.validateAndBuild('human', 'fighter', scores, 'male', ['Armorer']),
  );

  assert.equal(modern.valid, true);
  assert.equal(old.valid, true);
  assert.deepEqual(modern.racialScores, old.racialStats);
  assert.deepEqual(modern.finalScores, old.finalStats);
  assert.equal(modern.age, old.age);
  assert.equal(modern.ageCategory, old.ageCat);
  assert.equal(modern.ageCategoryName, old.ageCatName);
  assert.equal(modern.genderId, old.gender);
  assert.equal(modern.height, old.height);
  assert.equal(modern.weight, old.weight);
  assert.deepEqual(modern.secondarySkills, old.secondarySkills);
  assert.equal(modern.maximumAge, old.maxAge);
});


test('advancement and saving throw tables match the active class-data engine', { skip: !legacyClassData }, () => {
  const expectedXp = { ...legacyClassData.XP_TABLE, 'magic-user': legacyClassData.XP_TABLE.magic_user };
  delete expectedXp.magic_user;
  delete expectedXp.bard;
  assert.deepEqual(EXPERIENCE_TABLES, expectedXp);

  const expectedPostMax = { ...legacyClassData.XP_PER_LEVEL_AFTER, 'magic-user': legacyClassData.XP_PER_LEVEL_AFTER.magic_user };
  delete expectedPostMax.magic_user;
  delete expectedPostMax.bard;
  assert.deepEqual(EXPERIENCE_PER_LEVEL_AFTER_TABLE, expectedPostMax);

  const expectedTitles = { ...legacyClassData.LEVEL_TITLES, 'magic-user': legacyClassData.LEVEL_TITLES.magic_user };
  delete expectedTitles.magic_user;
  delete expectedTitles.bard;
  assert.deepEqual(LEVEL_TITLES, expectedTitles);

  const expectedHd = Object.fromEntries(Object.entries(legacyClassData.HD_INFO)
    .filter(([classId]) => classId !== 'bard')
    .map(([classId, value]) => [classId === 'magic_user' ? 'magic-user' : classId, {
      dieSize: value.hdType,
      maximumDice: value.hdCount,
      hitPointsPerLevelAfterMaximum: value.hpPerLevel,
      diceAtFirstLevel: value.startDice || 1,
    }]));
  assert.deepEqual(HIT_DIE_PROGRESSION, expectedHd);

  assert.deepEqual(FIGHTER_SAVING_THROWS, legacyClassData.SAVE_FIGHTER);
  assert.deepEqual(CLERIC_SAVING_THROWS, legacyClassData.SAVE_CLERIC);
  assert.deepEqual(MAGIC_USER_SAVING_THROWS, legacyClassData.SAVE_MU);
  assert.deepEqual(THIEF_SAVING_THROWS, legacyClassData.SAVE_THIEF);
});

test('advancement titles and saving throws match active class-data functions', { skip: !legacyClassData }, () => {
  for (const classId of ['fighter', 'paladin', 'ranger', 'cleric', 'druid', 'magic-user', 'illusionist', 'thief', 'assassin', 'monk']) {
    for (const level of [1, 2, 5, 9, 11, 17, 22]) {
      assert.equal(getLevelTitle(classId, level), legacyClassData.getLevelTitle(classId, level));
      assert.deepEqual(getSavingThrows(classId, level), legacyClassData.getSavingThrows(classId, level));
    }
  }
});

test('weapon proficiency calculations match the active chargen engine', () => {
  for (const classId of ['fighter', 'paladin', 'ranger', 'cleric', 'druid', 'magic-user', 'illusionist', 'thief', 'assassin', 'monk']) {
    for (const level of [1, 3, 4, 7, 12]) {
      assert.equal(getWeaponProficiencySlots(classId, level), legacy.getProficiencySlots(classId, level));
    }
    assert.equal(getNonproficiencyPenalty(classId), legacy.getNonProfPenalty(classId));
  }
});


test('active ability modifiers match the active chargen engine', () => {
  for (const constitution of [3, 5, 7, 14, 15, 16, 17, 18, 19]) {
    assert.equal(getConstitutionHitPointAdjustment(constitution), legacy.conHpBonus(constitution));
  }
  for (const charisma of [3, 4, 6, 9, 13, 16, 18, 20]) {
    assert.equal(getCharismaNpcReactionAdjustment(charisma), legacy.getChaReactionAdj(charisma));
  }
});


test('spell progression tables match the active class-data engine', { skip: !legacyClassData }, () => {
  assert.deepEqual(CLERIC_SPELLS, legacyClassData.CLERIC_SPELLS);
  assert.deepEqual(DRUID_SPELLS, legacyClassData.DRUID_SPELLS);
  assert.deepEqual(MAGIC_USER_SPELLS, legacyClassData.MU_SPELLS);
  assert.deepEqual(ILLUSIONIST_SPELLS, legacyClassData.ILLUSIONIST_SPELLS);
  assert.deepEqual(PALADIN_SPELLS, legacyClassData.PALADIN_SPELLS);
  assert.deepEqual(RANGER_SPELLS, legacyClassData.RANGER_SPELLS);
  assert.deepEqual(WISDOM_BONUS_SPELLS, legacyClassData.WIS_SPELL_BONUS);
});

test('legacy-parity spell slot mode matches active class-data calculations', { skip: !legacyClassData }, () => {
  const cases = [
    ['cleric', 1, 18],
    ['druid', 9, 15],
    ['magic-user', 12, 18],
    ['illusionist', 14, 18],
    ['paladin', 12, 16],
    ['ranger', 13, 18],
    ['fighter', 20, 18],
  ];
  for (const [classId, level, wisdom] of cases) {
    assert.deepEqual(
      getSpellSlots(classId, level, wisdom, 'legacy-parity'),
      legacyClassData.getSpellSlots(classId, level, wisdom),
    );
  }
});

import type {
  AbilityId,
  AbilityScores,
  ClassEligibility,
  ClassId,
  LevelCap,
  LevelCapRule,
  RaceId,
  RuleSource,
} from './types.js';

export const CLASS_RULE_SOURCE: RuleSource = Object.freeze({
  ruleset: 'legacy-adnd-1e',
  section: 'Race/class restrictions, class minimums, and level limits',
  auditStatus: 'legacy-import',
  note: 'Imported from gcc/adnd-chargen.js. Verify each row against OSRIC 3.0 before marking complete.',
});

export const CLASS_MINIMUMS: Readonly<Record<ClassId, Readonly<Partial<Record<AbilityId, number>>>>> =
  Object.freeze({
    fighter: { str: 9 },
    paladin: { str: 12, int: 9, wis: 13, con: 9, cha: 17 },
    ranger: { str: 13, int: 13, wis: 14, con: 14 },
    cleric: { wis: 9 },
    druid: { wis: 12, cha: 15 },
    'magic-user': { int: 9 },
    illusionist: { int: 15, dex: 16 },
    thief: { dex: 9 },
    assassin: { str: 12, int: 11, dex: 12 },
    monk: { str: 15, wis: 15, dex: 15, con: 11 },
  });

export const SINGLE_CLASS_OPTIONS: Readonly<Record<RaceId, readonly ClassId[]>> = Object.freeze({
  human: ['fighter', 'paladin', 'ranger', 'cleric', 'druid', 'magic-user', 'illusionist', 'thief', 'assassin', 'monk'],
  dwarf: ['fighter', 'thief', 'assassin'],
  elf: ['fighter', 'magic-user', 'thief', 'assassin'],
  gnome: ['fighter', 'illusionist', 'thief', 'assassin'],
  'half-elf': ['cleric', 'druid', 'fighter', 'ranger', 'magic-user', 'thief', 'assassin'],
  halfling: ['fighter', 'thief'],
  'half-orc': ['cleric', 'fighter', 'thief', 'assassin'],
});

export const MULTICLASS_COMBINATIONS: Readonly<Record<RaceId, readonly (readonly ClassId[])[]>> =
  Object.freeze({
    human: [],
    dwarf: [
      ['fighter', 'thief'],
    ],
    elf: [
      ['fighter', 'magic-user'],
      ['fighter', 'thief'],
      ['magic-user', 'thief'],
      ['fighter', 'magic-user', 'thief'],
    ],
    gnome: [
      ['fighter', 'illusionist'],
      ['fighter', 'thief'],
      ['illusionist', 'thief'],
    ],
    'half-elf': [
      ['cleric', 'fighter'],
      ['cleric', 'ranger'],
      ['cleric', 'magic-user'],
      ['fighter', 'magic-user'],
      ['fighter', 'thief'],
      ['magic-user', 'thief'],
      ['cleric', 'fighter', 'magic-user'],
      ['fighter', 'magic-user', 'thief'],
    ],
    halfling: [['fighter', 'thief']],
    'half-orc': [
      ['cleric', 'fighter'],
      ['cleric', 'thief'],
      ['cleric', 'assassin'],
      ['fighter', 'thief'],
      ['fighter', 'assassin'],
    ],
  });

const dwarfFighterCap = (scores: AbilityScores): LevelCap =>
  scores.str >= 18 ? 9 : scores.str === 17 ? 8 : 7;
const elfFighterCap = (scores: AbilityScores): LevelCap =>
  scores.str >= 18 ? 7 : scores.str === 17 ? 6 : 5;
const elfMagicUserCap = (scores: AbilityScores): LevelCap =>
  scores.int >= 18 ? 11 : scores.int === 17 ? 10 : 9;
const gnomeFighterCap = (scores: AbilityScores): LevelCap => (scores.str >= 18 ? 6 : 5);
const gnomeIllusionistCap = (scores: AbilityScores): LevelCap =>
  scores.int >= 17 && scores.dex >= 17 ? 7 : scores.int >= 17 || scores.dex >= 17 ? 6 : 5;
const halfElfFighterCap = (scores: AbilityScores): LevelCap =>
  scores.str >= 18 ? 8 : scores.str === 17 ? 7 : 6;
const halfElfMagicUserCap = (scores: AbilityScores): LevelCap =>
  scores.int >= 18 ? 8 : scores.int === 17 ? 7 : 6;
const halflingFighterCap = (scores: AbilityScores): LevelCap =>
  scores.str >= 18 ? 6 : scores.str === 17 ? 5 : 4;
const halfOrcThiefCap = (scores: AbilityScores): LevelCap =>
  scores.dex >= 18 ? 8 : scores.dex === 17 ? 7 : 6;

export const RACE_LEVEL_CAPS: Readonly<Record<RaceId, Readonly<Record<ClassId, LevelCapRule>>>> =
  Object.freeze({
    dwarf: {
      cleric: -8,
      druid: 0,
      fighter: dwarfFighterCap,
      paladin: 0,
      ranger: 0,
      'magic-user': 0,
      illusionist: 0,
      thief: null,
      assassin: 9,
      monk: 0,
    },
    elf: {
      cleric: -7,
      druid: 0,
      fighter: elfFighterCap,
      paladin: 0,
      ranger: 0,
      'magic-user': elfMagicUserCap,
      illusionist: 0,
      thief: null,
      assassin: 10,
      monk: 0,
    },
    gnome: {
      cleric: -7,
      druid: 0,
      fighter: gnomeFighterCap,
      paladin: 0,
      ranger: 0,
      'magic-user': 0,
      illusionist: gnomeIllusionistCap,
      thief: null,
      assassin: 8,
      monk: 0,
    },
    'half-elf': {
      cleric: 5,
      druid: null,
      fighter: halfElfFighterCap,
      paladin: 0,
      ranger: 8,
      'magic-user': halfElfMagicUserCap,
      illusionist: 0,
      thief: null,
      assassin: 11,
      monk: 0,
    },
    halfling: {
      cleric: 0,
      druid: 4,
      fighter: halflingFighterCap,
      paladin: 0,
      ranger: 0,
      'magic-user': 0,
      illusionist: 0,
      thief: null,
      assassin: 0,
      monk: 0,
    },
    'half-orc': {
      cleric: -6,
      druid: 0,
      fighter: 10,
      paladin: 0,
      ranger: 0,
      'magic-user': 0,
      illusionist: 0,
      thief: halfOrcThiefCap,
      assassin: 8,
      monk: 0,
    },
    human: {
      fighter: null,
      paladin: null,
      ranger: null,
      cleric: null,
      druid: null,
      'magic-user': null,
      illusionist: null,
      thief: null,
      assassin: null,
      monk: null,
    },
  });

export function getMissingClassMinimums(
  classId: ClassId,
  scores: AbilityScores,
): ClassEligibility['missingMinimums'] {
  const result: ClassEligibility['missingMinimums'] = {};
  const minimums = CLASS_MINIMUMS[classId];

  for (const [ability, required] of Object.entries(minimums) as [AbilityId, number][]) {
    const actual = scores[ability];
    if (actual < required) result[ability] = { required, actual };
  }

  return result;
}

export function meetsClassMinimums(classId: ClassId, scores: AbilityScores): boolean {
  return Object.keys(getMissingClassMinimums(classId, scores)).length === 0;
}

export function getRaceLevelCap(raceId: RaceId, classId: ClassId, scores: AbilityScores): LevelCap {
  const rule = RACE_LEVEL_CAPS[raceId][classId];
  return typeof rule === 'function' ? rule(scores) : rule;
}

export function getSingleClassEligibility(
  raceId: RaceId,
  classId: ClassId,
  scores: AbilityScores,
): ClassEligibility {
  const missingMinimums = getMissingClassMinimums(classId, scores);
  const levelCap = getRaceLevelCap(raceId, classId, scores);

  if (Object.keys(missingMinimums).length > 0) {
    return { allowed: false, reason: 'below-minimums', levelCap, missingMinimums };
  }

  if (!SINGLE_CLASS_OPTIONS[raceId].includes(classId) || levelCap === 0) {
    return { allowed: false, reason: 'forbidden', levelCap, missingMinimums };
  }

  if (typeof levelCap === 'number' && levelCap < 0) {
    return { allowed: false, reason: 'npc-only', levelCap, missingMinimums };
  }

  return {
    allowed: true,
    reason: levelCap === null ? 'unlimited' : 'allowed',
    levelCap,
    missingMinimums,
  };
}

export function canPlaySingleClass(
  raceId: RaceId,
  classId: ClassId,
  scores: AbilityScores,
): boolean {
  return getSingleClassEligibility(raceId, classId, scores).allowed;
}

export function getValidMulticlassCombinations(
  raceId: RaceId,
  scores: AbilityScores,
): readonly (readonly ClassId[])[] {
  return MULTICLASS_COMBINATIONS[raceId].filter((combination) =>
    combination.every((classId) => {
      if (!meetsClassMinimums(classId, scores)) return false;
      // A listed multiclass combination may intentionally include a class
      // whose negative cap makes it NPC-only when taken by itself.
      return getRaceLevelCap(raceId, classId, scores) !== 0;
    }),
  );
}

export function isValidMulticlassCombination(
  raceId: RaceId,
  classIds: readonly ClassId[],
  scores: AbilityScores,
): boolean {
  const wanted = [...classIds].sort().join('|');
  return getValidMulticlassCombinations(raceId, scores).some(
    (combination) => [...combination].sort().join('|') === wanted,
  );
}

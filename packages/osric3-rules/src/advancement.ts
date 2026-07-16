import type { ClassId, RuleSource } from './types.js';

export interface HitDieProgression {
  readonly dieSize: number;
  readonly maximumDice: number;
  readonly hitPointsPerLevelAfterMaximum: number;
  readonly diceAtFirstLevel: number;
}

export interface HitDiceAtLevel {
  readonly dice: number;
  readonly dieSize: number;
  readonly flatBonus: number;
}

export interface AdvancementSnapshot {
  readonly classId: ClassId;
  readonly level: number;
  readonly title: string;
  readonly experienceThreshold: number | null;
  readonly nextLevelThreshold: number | null;
  readonly hitDice: HitDiceAtLevel;
}

export const ADVANCEMENT_RULE_SOURCE: RuleSource = Object.freeze({
  ruleset: 'legacy-adnd-1e',
  section: 'Class experience, level titles, and hit-die progression',
  auditStatus: 'legacy-import',
  note: 'Imported from gcc/adnd-class-data.js. Verify each value against OSRIC 3.0 before marking complete.',
});

export const EXPERIENCE_TABLES: Readonly<Record<ClassId, readonly number[]>> = Object.freeze({
  fighter: [0, 2001, 4001, 8001, 18001, 35001, 70001, 125001, 250001, 500001, 750001],
  paladin: [0, 2751, 5501, 12001, 24001, 45001, 95001, 175001, 350001, 700001, 1050001],
  ranger: [0, 2251, 4501, 10001, 20001, 40001, 90001, 150001, 225001, 325001, 650001, 975001],
  cleric: [0, 1501, 3001, 6001, 13001, 27501, 55001, 110001, 225001, 450001, 675001],
  druid: [0, 2001, 4001, 7501, 12501, 20001, 35001, 60001, 90001, 125001, 200001, 300001, 750001, 1500001],
  'magic-user': [0, 2501, 5001, 10001, 22501, 40001, 60001, 90001, 135001, 250001, 375001, 750001, 1125001, 1500001, 1875001, 2250001, 2625001, 3000001],
  illusionist: [0, 2251, 4501, 9001, 18001, 35001, 60001, 95001, 145001, 220001, 440001, 660001],
  thief: [0, 1251, 2501, 5001, 10001, 20001, 42501, 70001, 110001, 160001, 220001, 440001],
  assassin: [0, 1501, 3001, 6001, 12001, 25001, 50001, 100001, 200001, 300001, 425001, 575001, 750001, 1000001, 1500001],
  monk: [0, 2251, 4751, 10001, 22501, 47501, 98001, 200001, 350001, 500001, 700001, 950001, 1250001, 1750001, 2250001, 2750001, 3250001],
});

export const EXPERIENCE_PER_LEVEL_AFTER_TABLE: Readonly<Record<ClassId, number | null>> = Object.freeze({
  fighter: 250000,
  paladin: 350000,
  ranger: 325000,
  cleric: 225000,
  druid: null,
  'magic-user': 375000,
  illusionist: 220000,
  thief: 220000,
  assassin: null,
  monk: null,
});

export const LEVEL_TITLES: Readonly<Record<ClassId, readonly string[]>> = Object.freeze({
  fighter: ['Veteran', 'Warrior', 'Swordsman', 'Hero', 'Swashbuckler', 'Myrmidon', 'Champion', 'Superhero', 'Lord'],
  paladin: ['Gallant', 'Keeper', 'Protector', 'Defender', 'Warder', 'Guardian', 'Chevalier', 'Justiciar', 'Paladin'],
  ranger: ['Runner', 'Strider', 'Scout', 'Courser', 'Tracker', 'Guide', 'Pathfinder', 'Ranger', 'Ranger Knight', 'Ranger Lord'],
  cleric: ['Acolyte', 'Adept', 'Priest', 'Curate', '', 'Canon', 'Lama', 'Patriarch', 'High Priest'],
  druid: ['Aspirant', 'Ovate', 'Initiate 1st Circle', 'Initiate 2nd Circle', 'Initiate 3rd Circle', 'Initiate 4th Circle', 'Initiate 5th Circle', 'Initiate 6th Circle', 'Initiate 7th Circle', 'Initiate 8th Circle', 'Initiate 9th Circle', 'Druid', 'Archdruid', 'The Great Druid'],
  'magic-user': ['Prestidigitator', 'Evoker', 'Conjurer', 'Theurgist', 'Thaumaturgist', 'Magician', 'Enchanter', 'Warlock', 'Sorcerer', 'Necromancer', 'Wizard'],
  illusionist: ['Prestidigitator', 'Minor Trickster', 'Trickster', 'Master Trickster', 'Cabalist', 'Visionist', 'Phantasmist', 'Apparitionist', 'Spellbinder', 'Illusionist'],
  thief: ['Rogue', 'Footpad', 'Cutpurse', 'Robber', 'Burglar', 'Filcher', 'Sharper', 'Magsman', 'Thief', 'Master Thief'],
  assassin: ['Bravo', 'Rutterkin', 'Waghalter', 'Murderer', 'Thug', 'Killer', 'Cutthroat', 'Executioner', 'Assassin', 'Expert Assassin', 'Senior Assassin', 'Chief Assassin', 'Prime Assassin', 'Guildmaster Assassin', 'Grandfather of Assassins'],
  monk: ['Novice', 'Initiate', 'Brother', 'Disciple', 'Immaculate', 'Master', 'Superior Master', 'Master of Dragons', 'Master of the North Wind', 'Master of the West Wind', 'Master of the South Wind', 'Master of the East Wind', 'Master of Winter', 'Master of Autumn', 'Master of Summer', 'Master of Spring', 'Grand Master of Flowers'],
});

export const HIT_DIE_PROGRESSION: Readonly<Record<ClassId, Readonly<HitDieProgression>>> = Object.freeze({
  fighter: { dieSize: 10, maximumDice: 9, hitPointsPerLevelAfterMaximum: 3, diceAtFirstLevel: 1 },
  paladin: { dieSize: 10, maximumDice: 9, hitPointsPerLevelAfterMaximum: 3, diceAtFirstLevel: 1 },
  ranger: { dieSize: 8, maximumDice: 11, hitPointsPerLevelAfterMaximum: 2, diceAtFirstLevel: 2 },
  cleric: { dieSize: 8, maximumDice: 9, hitPointsPerLevelAfterMaximum: 2, diceAtFirstLevel: 1 },
  druid: { dieSize: 8, maximumDice: 14, hitPointsPerLevelAfterMaximum: 0, diceAtFirstLevel: 1 },
  'magic-user': { dieSize: 4, maximumDice: 11, hitPointsPerLevelAfterMaximum: 1, diceAtFirstLevel: 1 },
  illusionist: { dieSize: 4, maximumDice: 10, hitPointsPerLevelAfterMaximum: 1, diceAtFirstLevel: 1 },
  thief: { dieSize: 6, maximumDice: 10, hitPointsPerLevelAfterMaximum: 2, diceAtFirstLevel: 1 },
  assassin: { dieSize: 6, maximumDice: 15, hitPointsPerLevelAfterMaximum: 0, diceAtFirstLevel: 1 },
  monk: { dieSize: 4, maximumDice: 17, hitPointsPerLevelAfterMaximum: 0, diceAtFirstLevel: 2 },
});

function normalizeLevel(level: number): number {
  if (!Number.isFinite(level)) throw new RangeError('Level must be a finite number.');
  return Math.max(1, Math.floor(level));
}

function normalizeExperience(experience: number): number {
  if (!Number.isFinite(experience)) throw new RangeError('Experience must be a finite number.');
  return Math.max(0, Math.floor(experience));
}

function ordinal(value: number): string {
  const remainder100 = value % 100;
  if (remainder100 >= 11 && remainder100 <= 13) return `${value}th`;
  switch (value % 10) {
    case 1: return `${value}st`;
    case 2: return `${value}nd`;
    case 3: return `${value}rd`;
    default: return `${value}th`;
  }
}

export function getExperienceThreshold(classId: ClassId, level: number): number | null {
  const normalizedLevel = normalizeLevel(level);
  const table = EXPERIENCE_TABLES[classId];
  if (normalizedLevel <= table.length) return table[normalizedLevel - 1] ?? null;

  const increment = EXPERIENCE_PER_LEVEL_AFTER_TABLE[classId];
  if (increment === null) return null;
  const lastThreshold = table[table.length - 1];
  if (lastThreshold === undefined) return null;
  return lastThreshold + increment * (normalizedLevel - table.length);
}

export function getLevelForExperience(classId: ClassId, experience: number): number {
  const xp = normalizeExperience(experience);
  let level = 1;

  while (true) {
    const nextThreshold = getExperienceThreshold(classId, level + 1);
    if (nextThreshold === null || xp < nextThreshold) return level;
    level += 1;
  }
}

export function getExperienceToNextLevel(
  classId: ClassId,
  level: number,
  currentExperience: number,
): number | null {
  const nextThreshold = getExperienceThreshold(classId, normalizeLevel(level) + 1);
  if (nextThreshold === null) return null;
  return Math.max(0, nextThreshold - normalizeExperience(currentExperience));
}

export function getLevelTitle(classId: ClassId, level: number): string {
  const normalizedLevel = normalizeLevel(level);
  const titles = LEVEL_TITLES[classId];
  const title = titles[Math.min(normalizedLevel, titles.length) - 1] ?? '';
  if (normalizedLevel <= titles.length) return title;
  return `${titles[titles.length - 1] ?? ''} (${ordinal(normalizedLevel)} level)`;
}

export function getHitDiceAtLevel(classId: ClassId, level: number): HitDiceAtLevel {
  const normalizedLevel = normalizeLevel(level);
  const progression = HIT_DIE_PROGRESSION[classId];
  const uncappedDice = progression.diceAtFirstLevel + normalizedLevel - 1;
  const dice = Math.min(progression.maximumDice, uncappedDice);
  const levelsAfterMaximum = Math.max(0, uncappedDice - progression.maximumDice);
  return {
    dice,
    dieSize: progression.dieSize,
    flatBonus: levelsAfterMaximum * progression.hitPointsPerLevelAfterMaximum,
  };
}

export function getAdvancementSnapshot(classId: ClassId, level: number): AdvancementSnapshot {
  const normalizedLevel = normalizeLevel(level);
  return {
    classId,
    level: normalizedLevel,
    title: getLevelTitle(classId, normalizedLevel),
    experienceThreshold: getExperienceThreshold(classId, normalizedLevel),
    nextLevelThreshold: getExperienceThreshold(classId, normalizedLevel + 1),
    hitDice: getHitDiceAtLevel(classId, normalizedLevel),
  };
}

import { rollDice, rollDie, type RandomSource } from './dice.js';
import {
  ABILITY_IDS,
  type AbilityId,
  type AbilityScoreArray,
  type AbilityScores,
  type RaceId,
  type RuleSource,
} from './types.js';

export const ABILITY_GENERATION_RULE_SOURCE: RuleSource = Object.freeze({
  ruleset: 'legacy-adnd-1e',
  section: 'Ability score generation methods and viability check',
  book: 'AD&D 1e Dungeon Masters Guide',
  auditStatus: 'legacy-import',
  note: 'Imported from gcc/adnd-chargen.js. Verify method definitions and viability rules against OSRIC 3.0 before marking complete.',
});

export const RACIAL_ABILITY_RULE_SOURCE: RuleSource = Object.freeze({
  ruleset: 'legacy-adnd-1e',
  section: 'Racial ability adjustments and minimum/maximum scores',
  book: "AD&D 1e Players Handbook",
  page: 14,
  auditStatus: 'legacy-import',
  note: 'Imported from gcc/adnd-chargen.js. Current limits intentionally preserve the legacy use of male maximums for both genders.',
});

export const RACIAL_ABILITY_ADJUSTMENTS: Readonly<
  Record<RaceId, Readonly<Partial<Record<AbilityId, number>>>>
> = Object.freeze({
  human: {},
  dwarf: { con: 1, cha: -1 },
  elf: { dex: 1, con: -1 },
  halfling: { str: -1, dex: 1 },
  gnome: {},
  'half-elf': {},
  'half-orc': { str: 1, con: 1, cha: -2 },
});

export type AbilityLimit = readonly [minimum: number, maximum: number];

export const RACIAL_ABILITY_LIMITS: Readonly<
  Record<RaceId, Readonly<Record<AbilityId, AbilityLimit>>>
> = Object.freeze({
  human: {
    str: [3, 18], int: [3, 18], wis: [3, 18], dex: [3, 18], con: [3, 18], cha: [3, 18],
  },
  dwarf: {
    str: [8, 18], int: [3, 18], wis: [3, 18], dex: [3, 17], con: [12, 19], cha: [3, 16],
  },
  elf: {
    str: [3, 18], int: [8, 18], wis: [3, 18], dex: [7, 19], con: [6, 18], cha: [8, 18],
  },
  gnome: {
    str: [6, 18], int: [7, 18], wis: [3, 18], dex: [3, 18], con: [8, 18], cha: [3, 18],
  },
  'half-elf': {
    str: [3, 18], int: [4, 18], wis: [3, 18], dex: [6, 18], con: [6, 18], cha: [3, 18],
  },
  halfling: {
    str: [6, 17], int: [6, 18], wis: [3, 17], dex: [8, 18], con: [10, 19], cha: [3, 18],
  },
  'half-orc': {
    str: [6, 18], int: [3, 17], wis: [3, 14], dex: [3, 17], con: [13, 19], cha: [3, 12],
  },
});

export type AbilityGenerationMethod = 'I' | 'II' | 'III' | 'IV';

function asAbilityScoreArray(scores: readonly number[]): AbilityScoreArray {
  if (scores.length !== 6) {
    throw new RangeError(`An ability score set must contain exactly six values; received ${scores.length}.`);
  }
  return scores as AbilityScoreArray;
}

export function roll3d6(random?: RandomSource): number {
  return rollDice(3, 6, random);
}

export function roll4d6DropLowest(random?: RandomSource): number {
  const rolls = [rollDie(6, random), rollDie(6, random), rollDie(6, random), rollDie(6, random)];
  rolls.sort((left, right) => left - right);
  return rolls[1]! + rolls[2]! + rolls[3]!;
}

export function rollAbilityMethodI(random?: RandomSource): readonly AbilityScoreArray[] {
  return [asAbilityScoreArray(Array.from({ length: 6 }, () => roll4d6DropLowest(random)))];
}

export function rollAbilityMethodII(random?: RandomSource): readonly AbilityScoreArray[] {
  const rolls = Array.from({ length: 12 }, () => roll3d6(random));
  rolls.sort((left, right) => right - left);
  return [asAbilityScoreArray(rolls.slice(0, 6))];
}

export function rollAbilityMethodIII(random?: RandomSource): readonly AbilityScoreArray[] {
  const scores = Array.from({ length: 6 }, () => {
    let best = 0;
    for (let attempt = 0; attempt < 6; attempt += 1) best = Math.max(best, roll3d6(random));
    return best;
  });
  return [asAbilityScoreArray(scores)];
}

export function rollAbilityMethodIV(random?: RandomSource): readonly AbilityScoreArray[] {
  return Array.from({ length: 12 }, () =>
    asAbilityScoreArray(Array.from({ length: 6 }, () => roll3d6(random))),
  );
}

export function rollAbilitySets(
  method: AbilityGenerationMethod,
  random?: RandomSource,
): readonly AbilityScoreArray[] {
  switch (method) {
    case 'I': return rollAbilityMethodI(random);
    case 'II': return rollAbilityMethodII(random);
    case 'III': return rollAbilityMethodIII(random);
    case 'IV': return rollAbilityMethodIV(random);
  }
}

export function rollThreeLegacyAbilitySets(random?: RandomSource): readonly AbilityScoreArray[] {
  return [
    rollAbilityMethodI(random)[0]!,
    rollAbilityMethodI(random)[0]!,
    rollAbilityMethodI(random)[0]!,
  ];
}

export function isViableAbilitySet(scores: readonly number[]): boolean {
  return scores.filter((score) => score >= 15).length >= 2;
}

export function clampAbilityScore(raceId: RaceId, abilityId: AbilityId, score: number): number {
  const [minimum, maximum] = RACIAL_ABILITY_LIMITS[raceId][abilityId];
  return Math.max(minimum, Math.min(maximum, score));
}

export function applyRacialAbilityAdjustments(
  scores: AbilityScores,
  raceId: RaceId,
): AbilityScores {
  const result: AbilityScores = { ...scores };
  const adjustments = RACIAL_ABILITY_ADJUSTMENTS[raceId];

  for (const abilityId of ABILITY_IDS) {
    result[abilityId] = clampAbilityScore(
      raceId,
      abilityId,
      result[abilityId] + (adjustments[abilityId] ?? 0),
    );
  }

  return result;
}

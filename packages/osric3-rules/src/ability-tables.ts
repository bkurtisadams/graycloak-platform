import type { RuleSource } from './types.js';
import { getWisdomBonusSpells } from './spells.js';

export interface StrengthCombatProfile {
  readonly hitAdjustment: number;
  readonly damageAdjustment: number;
  readonly exceptionalBand: 'none' | '01-50' | '51-75' | '76-90' | '91-99' | '00';
}

export interface IntelligenceDisplayProfile {
  readonly additionalLanguages: number;
  readonly learnSpellChance: number | null;
  readonly minimumSpellsPerLevel: number | null;
  readonly maximumSpellsPerLevel: number | 'all' | null;
}

export interface WisdomDisplayProfile {
  readonly magicalAttackAdjustment: number;
  readonly bonusSpells: readonly number[];
  readonly spellFailureChance: number;
}

export interface DexterityDisplayProfile {
  readonly reactionAdjustment: number;
  readonly missileAdjustment: number;
  readonly defenseAdjustment: number;
}

export interface ConstitutionDisplayProfile {
  readonly hitPointAdjustment: number;
  readonly fighterHitPointAdjustment: number;
  readonly systemShockChance: number;
  readonly resurrectionSurvivalChance: number;
}

export interface CharismaDisplayProfile {
  readonly maximumHenchmen: number;
  readonly loyaltyAdjustment: number;
  readonly reactionAdjustment: number;
}

export const ABILITY_DISPLAY_RULE_SOURCE: RuleSource = Object.freeze({
  ruleset: 'legacy-adnd-1e',
  section: 'Character-sheet ability display tables',
  auditStatus: 'legacy-import',
  note:
    'Stable legacy display values are centralized here. Intelligence spell-learning limits and Strength carrying/lifting fields remain null until the OSRIC 3.0 tables are directly verified.',
});

function score3To18(score: number): number {
  if (!Number.isFinite(score)) throw new RangeError('Ability score must be finite.');
  return Math.max(3, Math.min(18, Math.floor(score)));
}

export function getStrengthCombatProfile(score: number, exceptionalPercentile = 0): StrengthCombatProfile {
  const value = score3To18(score);
  if (value < 4) return { hitAdjustment: -3, damageAdjustment: -1, exceptionalBand: 'none' };
  if (value < 6) return { hitAdjustment: -2, damageAdjustment: -1, exceptionalBand: 'none' };
  if (value < 8) return { hitAdjustment: -1, damageAdjustment: 0, exceptionalBand: 'none' };
  if (value < 16) return { hitAdjustment: 0, damageAdjustment: 0, exceptionalBand: 'none' };
  if (value === 16) return { hitAdjustment: 0, damageAdjustment: 1, exceptionalBand: 'none' };
  if (value === 17) return { hitAdjustment: 1, damageAdjustment: 1, exceptionalBand: 'none' };
  if (exceptionalPercentile <= 0) return { hitAdjustment: 1, damageAdjustment: 2, exceptionalBand: 'none' };
  const percentile = Math.max(1, Math.min(100, Math.floor(exceptionalPercentile)));
  if (percentile <= 50) return { hitAdjustment: 1, damageAdjustment: 3, exceptionalBand: '01-50' };
  if (percentile <= 75) return { hitAdjustment: 2, damageAdjustment: 3, exceptionalBand: '51-75' };
  if (percentile <= 90) return { hitAdjustment: 2, damageAdjustment: 4, exceptionalBand: '76-90' };
  if (percentile <= 99) return { hitAdjustment: 2, damageAdjustment: 5, exceptionalBand: '91-99' };
  return { hitAdjustment: 3, damageAdjustment: 6, exceptionalBand: '00' };
}

const INTELLIGENCE_LANGUAGE_SLOTS: readonly number[] = Object.freeze([
  0, 0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 6, 7,
]);

export function getIntelligenceDisplayProfile(score: number): IntelligenceDisplayProfile {
  const value = score3To18(score);
  return Object.freeze({
    additionalLanguages: INTELLIGENCE_LANGUAGE_SLOTS[value - 3] ?? 0,
    learnSpellChance: null,
    minimumSpellsPerLevel: null,
    maximumSpellsPerLevel: null,
  });
}

const WISDOM_MAGIC_ADJUSTMENT: readonly number[] = Object.freeze([
  -3, -2, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4,
]);
const WISDOM_SPELL_FAILURE: readonly number[] = Object.freeze([
  80, 60, 50, 40, 35, 30, 20, 15, 10, 5, 0, 0, 0, 0, 0, 0,
]);

export function getWisdomDisplayProfile(score: number): WisdomDisplayProfile {
  const value = score3To18(score);
  return Object.freeze({
    magicalAttackAdjustment: WISDOM_MAGIC_ADJUSTMENT[value - 3] ?? 0,
    bonusSpells: getWisdomBonusSpells(value),
    spellFailureChance: WISDOM_SPELL_FAILURE[value - 3] ?? 0,
  });
}

const DEXTERITY_TABLE: readonly DexterityDisplayProfile[] = Object.freeze([
  { reactionAdjustment: -3, missileAdjustment: -3, defenseAdjustment: 4 },
  { reactionAdjustment: -2, missileAdjustment: -2, defenseAdjustment: 3 },
  { reactionAdjustment: -1, missileAdjustment: -1, defenseAdjustment: 2 },
  { reactionAdjustment: 0, missileAdjustment: 0, defenseAdjustment: 1 },
  { reactionAdjustment: 0, missileAdjustment: 0, defenseAdjustment: 0 },
  { reactionAdjustment: 0, missileAdjustment: 0, defenseAdjustment: 0 },
  { reactionAdjustment: 0, missileAdjustment: 0, defenseAdjustment: 0 },
  { reactionAdjustment: 0, missileAdjustment: 0, defenseAdjustment: 0 },
  { reactionAdjustment: 0, missileAdjustment: 0, defenseAdjustment: 0 },
  { reactionAdjustment: 0, missileAdjustment: 0, defenseAdjustment: 0 },
  { reactionAdjustment: 0, missileAdjustment: 0, defenseAdjustment: 0 },
  { reactionAdjustment: 0, missileAdjustment: 0, defenseAdjustment: 0 },
  { reactionAdjustment: 0, missileAdjustment: 0, defenseAdjustment: -1 },
  { reactionAdjustment: 1, missileAdjustment: 1, defenseAdjustment: -2 },
  { reactionAdjustment: 2, missileAdjustment: 2, defenseAdjustment: -3 },
  { reactionAdjustment: 3, missileAdjustment: 3, defenseAdjustment: -4 },
]);

export function getDexterityDisplayProfile(score: number): DexterityDisplayProfile {
  return Object.freeze({ ...(DEXTERITY_TABLE[score3To18(score) - 3] ?? DEXTERITY_TABLE[7]!) });
}

const SYSTEM_SHOCK = Object.freeze([35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 88, 91, 95, 97, 99]);
const RESURRECTION_SURVIVAL = Object.freeze([40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 92, 94, 96, 98, 100]);

function constitutionHitPointAdjustment(score: number, fighterType: boolean): number {
  if (score <= 3) return -2;
  if (score <= 6) return -1;
  if (score <= 14) return 0;
  if (score === 15) return 1;
  if (score === 16) return 2;
  if (!fighterType) return 2;
  return score === 17 ? 3 : 4;
}

export function getConstitutionDisplayProfile(score: number): ConstitutionDisplayProfile {
  const value = score3To18(score);
  return Object.freeze({
    hitPointAdjustment: constitutionHitPointAdjustment(value, false),
    fighterHitPointAdjustment: constitutionHitPointAdjustment(value, true),
    systemShockChance: SYSTEM_SHOCK[value - 3] ?? 0,
    resurrectionSurvivalChance: RESURRECTION_SURVIVAL[value - 3] ?? 0,
  });
}

const CHARISMA_TABLE: readonly CharismaDisplayProfile[] = Object.freeze([
  { maximumHenchmen: 1, loyaltyAdjustment: -30, reactionAdjustment: -25 },
  { maximumHenchmen: 1, loyaltyAdjustment: -25, reactionAdjustment: -20 },
  { maximumHenchmen: 2, loyaltyAdjustment: -20, reactionAdjustment: -15 },
  { maximumHenchmen: 2, loyaltyAdjustment: -15, reactionAdjustment: -10 },
  { maximumHenchmen: 3, loyaltyAdjustment: -10, reactionAdjustment: -5 },
  { maximumHenchmen: 3, loyaltyAdjustment: -5, reactionAdjustment: 0 },
  { maximumHenchmen: 4, loyaltyAdjustment: 0, reactionAdjustment: 0 },
  { maximumHenchmen: 4, loyaltyAdjustment: 0, reactionAdjustment: 0 },
  { maximumHenchmen: 4, loyaltyAdjustment: 0, reactionAdjustment: 0 },
  { maximumHenchmen: 5, loyaltyAdjustment: 0, reactionAdjustment: 0 },
  { maximumHenchmen: 5, loyaltyAdjustment: 0, reactionAdjustment: 5 },
  { maximumHenchmen: 6, loyaltyAdjustment: 5, reactionAdjustment: 10 },
  { maximumHenchmen: 7, loyaltyAdjustment: 15, reactionAdjustment: 15 },
  { maximumHenchmen: 8, loyaltyAdjustment: 20, reactionAdjustment: 25 },
  { maximumHenchmen: 10, loyaltyAdjustment: 30, reactionAdjustment: 30 },
  { maximumHenchmen: 15, loyaltyAdjustment: 40, reactionAdjustment: 35 },
]);

export function getCharismaDisplayProfile(score: number): CharismaDisplayProfile {
  return Object.freeze({ ...(CHARISMA_TABLE[score3To18(score) - 3] ?? CHARISMA_TABLE[7]!) });
}

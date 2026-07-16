export const ABILITY_IDS = ['str', 'int', 'wis', 'dex', 'con', 'cha'] as const;
export type AbilityId = (typeof ABILITY_IDS)[number];

export interface AbilityScores {
  str: number;
  int: number;
  wis: number;
  dex: number;
  con: number;
  cha: number;
}

export type AbilityScoreArray = readonly [number, number, number, number, number, number];

export const RACE_IDS = [
  'human',
  'dwarf',
  'elf',
  'gnome',
  'half-elf',
  'halfling',
  'half-orc',
] as const;
export type RaceId = (typeof RACE_IDS)[number];

export const CLASS_IDS = [
  'fighter',
  'paladin',
  'ranger',
  'cleric',
  'druid',
  'magic-user',
  'illusionist',
  'thief',
  'assassin',
  'monk',
] as const;
export type ClassId = (typeof CLASS_IDS)[number];

export type GenderId = 'male' | 'female';
export type AgeCategoryIndex = 0 | 1 | 2 | 3 | 4;

export type LevelCap = number | null;
export type LevelCapRule = LevelCap | ((scores: AbilityScores) => LevelCap);

export type RuleAuditStatus = 'legacy-import' | 'verified-osric3' | 'disputed';

export interface RuleSource {
  ruleset: 'legacy-adnd-1e' | 'osric-3.0';
  section: string;
  book?: string;
  page?: number;
  auditStatus: RuleAuditStatus;
  note?: string;
}

export type ClassEligibilityReason =
  | 'allowed'
  | 'unlimited'
  | 'forbidden'
  | 'npc-only'
  | 'below-minimums';

export interface ClassEligibility {
  allowed: boolean;
  reason: ClassEligibilityReason;
  levelCap: LevelCap;
  missingMinimums: Partial<Record<AbilityId, { required: number; actual: number }>>;
}

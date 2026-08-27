import { getExperienceThreshold, getLevelForExperience } from './advancement.js';
import { splitMulticlassExperienceAward } from './multiclass-advancement.js';
import { getClassExperienceBonus } from './starting-character.js';
import { CLASS_IDS } from './types.js';
import type { AbilityScores, ClassId, RuleSource } from './types.js';

export type LegacyCharacterRecord = Record<string, unknown>;

export interface LegacyCharacterExperienceComponent {
  readonly classId: ClassId;
  readonly slot: number;
  readonly previousExperience: number;
  readonly baseAwardedExperience: number;
  readonly bonusExperience: number;
  readonly awardedExperience: number;
  readonly experience: number;
  readonly previousLevel: number;
  readonly level: number;
  readonly gainedLevels: number;
  readonly nextLevelThreshold: number | null;
}

export interface LegacyCharacterExperienceResult {
  readonly applied: boolean;
  readonly reason: 'applied' | 'missing-class' | 'unsupported-class';
  readonly character: LegacyCharacterRecord;
  /** Base award supplied by the encounter before prime-requisite bonuses. */
  readonly totalAward: number;
  readonly bonusAward: number;
  readonly creditedAward: number;
  readonly components: readonly LegacyCharacterExperienceComponent[];
}

export const LEGACY_CHARACTER_XP_RULE_SOURCE: RuleSource = Object.freeze({
  ruleset: 'legacy-adnd-1e',
  section: 'GCC legacy character XP field adapter',
  auditStatus: 'legacy-import',
  note:
    'Maps combat awards onto characterClass, xpTotal/xpTotal2/xpTotal3, level, and xpNextLevel fields. Slice 6 applies the existing prime-requisite 10% bonus independently to each supported class component after the base award is divided.',
});

const CLASS_SET = new Set<string>(CLASS_IDS);
const XP_FIELDS = ['xpTotal', 'xpTotal2', 'xpTotal3'] as const;
const NEXT_FIELDS = ['xpNextLevel', 'xpNextLevel2', 'xpNextLevel3'] as const;

function normalizeExperience(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

function normalizeAward(value: number): number {
  if (!Number.isFinite(value)) throw new RangeError('Experience award must be finite.');
  return Math.max(0, Math.floor(value));
}

function normalizeClassName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-');
}

function normalizeAbilityScore(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

export function getLegacyCharacterAbilityScores(character: LegacyCharacterRecord): AbilityScores {
  return Object.freeze({
    str: normalizeAbilityScore(character.str),
    int: normalizeAbilityScore(character.int ?? character.intl),
    wis: normalizeAbilityScore(character.wis),
    dex: normalizeAbilityScore(character.dex),
    con: normalizeAbilityScore(character.con),
    cha: normalizeAbilityScore(character.cha),
  });
}

export function parseLegacyCharacterClasses(value: unknown): readonly ClassId[] {
  if (typeof value !== 'string' || !value.trim()) return Object.freeze([]);
  const classes: ClassId[] = [];
  for (const raw of value.split('/')) {
    const normalized = normalizeClassName(raw);
    if (CLASS_SET.has(normalized)) classes.push(normalized as ClassId);
  }
  return Object.freeze(classes);
}

function formatLevelField(levels: readonly number[]): number | string {
  return levels.length === 1 ? levels[0]! : levels.join('/');
}

function componentAward(
  classId: ClassId,
  slot: number,
  experience: number,
  baseAward: number,
  scores: AbilityScores,
): LegacyCharacterExperienceComponent {
  const previousLevel = getLevelForExperience(classId, experience);
  const bonusExperience = getClassExperienceBonus(classId, scores, baseAward);
  const awardedExperience = baseAward + bonusExperience;
  const nextExperience = experience + awardedExperience;
  const level = getLevelForExperience(classId, nextExperience);
  return Object.freeze({
    classId,
    slot,
    previousExperience: experience,
    baseAwardedExperience: baseAward,
    bonusExperience,
    awardedExperience,
    experience: nextExperience,
    previousLevel,
    level,
    gainedLevels: Math.max(0, level - previousLevel),
    nextLevelThreshold: getExperienceThreshold(classId, level + 1),
  });
}

export function awardLegacyCharacterExperience(
  character: LegacyCharacterRecord,
  totalExperience: number,
): LegacyCharacterExperienceResult {
  const award = normalizeAward(totalExperience);
  const copy: LegacyCharacterRecord = { ...character };
  const classValue = character.characterClass ?? character.class;
  const parsedClasses = parseLegacyCharacterClasses(classValue);

  if (typeof classValue !== 'string' || !classValue.trim()) {
    return Object.freeze({
      applied: false,
      reason: 'missing-class',
      character: copy,
      totalAward: award,
      bonusAward: 0,
      creditedAward: award,
      components: Object.freeze([]),
    });
  }
  const rawCount = classValue.split('/').map((part) => part.trim()).filter(Boolean).length;
  if (!parsedClasses.length || parsedClasses.length !== rawCount || parsedClasses.length > 3) {
    return Object.freeze({
      applied: false,
      reason: 'unsupported-class',
      character: copy,
      totalAward: award,
      bonusAward: 0,
      creditedAward: award,
      components: Object.freeze([]),
    });
  }

  const scores = getLegacyCharacterAbilityScores(character);
  const shares: Readonly<Record<ClassId, number>> = parsedClasses.length === 1
    ? Object.freeze({ [parsedClasses[0]!]: award } as Record<ClassId, number>)
    : splitMulticlassExperienceAward(award, parsedClasses);
  const components = parsedClasses.map((classId, slot) => componentAward(
    classId,
    slot,
    normalizeExperience(character[XP_FIELDS[slot]!]),
    shares[classId] ?? 0,
    scores,
  ));

  for (const component of components) {
    copy[XP_FIELDS[component.slot]!] = component.experience;
    copy[NEXT_FIELDS[component.slot]!] = component.nextLevelThreshold ?? '';
  }
  copy.level = formatLevelField(components.map((component) => component.level));

  const bonusAward = components.reduce((total, component) => total + component.bonusExperience, 0);
  return Object.freeze({
    applied: true,
    reason: 'applied',
    character: copy,
    totalAward: award,
    bonusAward,
    creditedAward: components.reduce((sum, component) => sum + component.awardedExperience, 0),
    components: Object.freeze(components),
  });
}

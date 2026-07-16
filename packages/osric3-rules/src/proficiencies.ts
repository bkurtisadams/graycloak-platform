import type { ClassId, RuleSource } from './types.js';

export interface WeaponProficiencyProgression {
  readonly initialSlots: number;
  readonly nonproficiencyPenalty: number;
  readonly levelsPerAdditionalSlot: number;
}

export const WEAPON_PROFICIENCY_RULE_SOURCE: RuleSource = Object.freeze({
  ruleset: 'legacy-adnd-1e',
  section: 'Weapon proficiency slots and nonproficiency penalties',
  auditStatus: 'legacy-import',
  note: 'Imported from gcc/adnd-chargen.js. Verify against the OSRIC 3.0 class and weapon proficiency rules.',
});

export const WEAPON_PROFICIENCY_PROGRESSION: Readonly<Record<ClassId, Readonly<WeaponProficiencyProgression>>> = Object.freeze({
  fighter: { initialSlots: 4, nonproficiencyPenalty: -2, levelsPerAdditionalSlot: 3 },
  paladin: { initialSlots: 3, nonproficiencyPenalty: -2, levelsPerAdditionalSlot: 3 },
  ranger: { initialSlots: 3, nonproficiencyPenalty: -2, levelsPerAdditionalSlot: 3 },
  cleric: { initialSlots: 2, nonproficiencyPenalty: -3, levelsPerAdditionalSlot: 4 },
  druid: { initialSlots: 2, nonproficiencyPenalty: -4, levelsPerAdditionalSlot: 5 },
  'magic-user': { initialSlots: 1, nonproficiencyPenalty: -5, levelsPerAdditionalSlot: 6 },
  illusionist: { initialSlots: 1, nonproficiencyPenalty: -5, levelsPerAdditionalSlot: 6 },
  thief: { initialSlots: 2, nonproficiencyPenalty: -3, levelsPerAdditionalSlot: 4 },
  assassin: { initialSlots: 3, nonproficiencyPenalty: -2, levelsPerAdditionalSlot: 4 },
  monk: { initialSlots: 1, nonproficiencyPenalty: -3, levelsPerAdditionalSlot: 2 },
});

export function getWeaponProficiencySlots(classId: ClassId, level: number): number {
  if (!Number.isFinite(level)) throw new RangeError('Level must be a finite number.');
  const progression = WEAPON_PROFICIENCY_PROGRESSION[classId];
  return progression.initialSlots
    + Math.floor(Math.max(0, Math.floor(level) - 1) / progression.levelsPerAdditionalSlot);
}

export function getNonproficiencyPenalty(classId: ClassId): number {
  return WEAPON_PROFICIENCY_PROGRESSION[classId].nonproficiencyPenalty;
}

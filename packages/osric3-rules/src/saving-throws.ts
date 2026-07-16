import type { ClassId, RuleSource } from './types.js';

export const SAVING_THROW_IDS = [
  'paralyzation-poison-death',
  'petrification-polymorph',
  'rod-staff-wand',
  'breath-weapon',
  'spell',
] as const;
export type SavingThrowId = (typeof SAVING_THROW_IDS)[number];
export type SavingThrowValues = readonly [number, number, number, number, number];
export type SavingThrowRecord = Readonly<Record<SavingThrowId, number>>;

export const SAVING_THROW_LEGACY_LABELS = [
  'Para/Poison/Death',
  'Petrify/Polymorph',
  'Rod/Staff/Wand',
  'Breath Weapon',
  'Spell',
] as const;

export const SAVING_THROW_LABELS: Readonly<Record<SavingThrowId, string>> = Object.freeze({
  'paralyzation-poison-death': 'Paralyzation, Poison, or Death Magic',
  'petrification-polymorph': 'Petrification or Polymorph',
  'rod-staff-wand': 'Rod, Staff, or Wand',
  'breath-weapon': 'Breath Weapon',
  spell: 'Spell',
});

export const SAVING_THROW_RULE_SOURCE: RuleSource = Object.freeze({
  ruleset: 'legacy-adnd-1e',
  section: 'Class saving throw matrices',
  auditStatus: 'legacy-import',
  note: 'Imported from gcc/adnd-class-data.js. Paladin adjustment and every matrix row require OSRIC 3.0 verification.',
});

export const FIGHTER_SAVING_THROWS: readonly SavingThrowValues[] = Object.freeze([
  [14, 15, 16, 17, 17],
  [14, 15, 16, 17, 17],
  [13, 14, 15, 16, 16],
  [11, 12, 13, 13, 14],
  [10, 11, 12, 12, 13],
  [8, 9, 10, 10, 11],
  [7, 8, 9, 9, 10],
  [5, 6, 7, 7, 8],
  [4, 5, 6, 6, 7],
  [3, 4, 5, 5, 6],
]);

export const CLERIC_SAVING_THROWS: readonly SavingThrowValues[] = Object.freeze([
  [10, 13, 14, 16, 15],
  [9, 12, 13, 15, 14],
  [7, 10, 11, 13, 12],
  [6, 9, 10, 12, 11],
  [5, 8, 9, 11, 10],
  [4, 7, 8, 10, 9],
  [2, 5, 6, 8, 7],
]);

export const MAGIC_USER_SAVING_THROWS: readonly SavingThrowValues[] = Object.freeze([
  [14, 13, 11, 15, 12],
  [13, 11, 9, 13, 10],
  [11, 9, 7, 11, 8],
  [10, 7, 5, 9, 6],
  [8, 5, 3, 7, 4],
]);

export const THIEF_SAVING_THROWS: readonly SavingThrowValues[] = Object.freeze([
  [13, 12, 14, 16, 15],
  [12, 11, 13, 15, 14],
  [11, 10, 12, 14, 13],
  [10, 9, 11, 13, 12],
  [9, 8, 10, 12, 11],
  [8, 7, 9, 11, 10],
]);

function normalizeLevel(level: number): number {
  if (!Number.isFinite(level)) throw new RangeError('Level must be a finite number.');
  return Math.floor(level);
}

function rowAt(table: readonly SavingThrowValues[], index: number): SavingThrowValues {
  const safeIndex = Math.max(0, Math.min(index, table.length - 1));
  const row = table[safeIndex];
  if (!row) throw new RangeError('Saving throw table is empty.');
  return row;
}

export function getSavingThrows(classId: ClassId, level: number): SavingThrowValues {
  const normalizedLevel = normalizeLevel(level);
  let values: SavingThrowValues;

  if (classId === 'fighter' || classId === 'paladin' || classId === 'ranger') {
    const index = normalizedLevel <= 0
      ? 0
      : normalizedLevel <= 2
        ? 1
        : 1 + Math.floor((normalizedLevel - 1) / 2);
    values = rowAt(FIGHTER_SAVING_THROWS, index);
  } else if (classId === 'cleric' || classId === 'druid') {
    values = rowAt(CLERIC_SAVING_THROWS, Math.floor((Math.max(1, normalizedLevel) - 1) / 3));
  } else if (classId === 'magic-user' || classId === 'illusionist') {
    values = rowAt(MAGIC_USER_SAVING_THROWS, Math.floor((Math.max(1, normalizedLevel) - 1) / 5));
  } else {
    values = rowAt(THIEF_SAVING_THROWS, Math.floor((Math.max(1, normalizedLevel) - 1) / 4));
  }

  if (classId !== 'paladin') return [...values] as SavingThrowValues;
  return values.map((value) => Math.max(1, value - 2)) as unknown as SavingThrowValues;
}

export function savingThrowsToRecord(values: SavingThrowValues): SavingThrowRecord {
  return Object.freeze({
    'paralyzation-poison-death': values[0],
    'petrification-polymorph': values[1],
    'rod-staff-wand': values[2],
    'breath-weapon': values[3],
    spell: values[4],
  });
}

export function getBestMulticlassSavingThrows(
  classes: readonly { classId: ClassId; level: number }[],
): SavingThrowValues {
  if (classes.length === 0) throw new RangeError('At least one class is required.');
  const rows = classes.map(({ classId, level }) => getSavingThrows(classId, level));
  return SAVING_THROW_IDS.map((_, index) => Math.min(...rows.map((row) => row[index] ?? Infinity))) as unknown as SavingThrowValues;
}

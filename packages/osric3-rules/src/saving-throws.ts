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

interface SavingThrowBand {
  readonly upTo: number;
  readonly values: SavingThrowValues;
}

// Values are [paralyzation/poison/death, petrification/polymorph, rod/staff/wand,
// breath weapon, spell], transcribed from the printed OSRIC 3.0 class tables.
// Every class has its own table: paladins are NOT fighters minus two (the top
// bands floor differently) and monks are NOT thieves.
const SAVING_THROW_TABLES: Readonly<Record<string, readonly SavingThrowBand[]>> = Object.freeze({
  fighter: Object.freeze([
    { upTo: 0, values: [16, 17, 18, 20, 19] },
    { upTo: 2, values: [14, 15, 16, 17, 17] },
    { upTo: 4, values: [13, 14, 15, 16, 16] },
    { upTo: 6, values: [11, 12, 13, 13, 14] },
    { upTo: 8, values: [10, 11, 12, 12, 13] },
    { upTo: 10, values: [8, 9, 10, 9, 11] },
    { upTo: 12, values: [7, 8, 9, 8, 10] },
    { upTo: 14, values: [5, 6, 7, 5, 8] },
    { upTo: 16, values: [4, 5, 6, 4, 7] },
    { upTo: 18, values: [3, 4, 5, 4, 6] },
    { upTo: Infinity, values: [2, 3, 4, 3, 5] },
  ] as readonly SavingThrowBand[]),
  paladin: Object.freeze([
    { upTo: 2, values: [12, 13, 14, 15, 15] },
    { upTo: 4, values: [11, 12, 13, 14, 14] },
    { upTo: 6, values: [9, 10, 11, 11, 12] },
    { upTo: 8, values: [8, 9, 10, 10, 11] },
    { upTo: 10, values: [6, 7, 8, 7, 9] },
    { upTo: 12, values: [5, 6, 7, 6, 8] },
    { upTo: 14, values: [3, 4, 5, 3, 6] },
    { upTo: 16, values: [2, 3, 4, 2, 5] },
    { upTo: 18, values: [2, 2, 3, 2, 4] },
    { upTo: Infinity, values: [2, 2, 2, 2, 3] },
  ] as readonly SavingThrowBand[]),
  cleric: Object.freeze([
    { upTo: 3, values: [10, 13, 14, 16, 15] },
    { upTo: 6, values: [9, 12, 13, 15, 14] },
    { upTo: 9, values: [7, 10, 11, 13, 12] },
    { upTo: 12, values: [6, 9, 10, 12, 11] },
    { upTo: 15, values: [5, 8, 9, 11, 10] },
    { upTo: 18, values: [4, 7, 8, 10, 9] },
    { upTo: Infinity, values: [2, 5, 6, 8, 7] },
  ] as readonly SavingThrowBand[]),
  'magic-user': Object.freeze([
    { upTo: 5, values: [14, 13, 11, 15, 12] },
    { upTo: 10, values: [13, 11, 9, 13, 10] },
    { upTo: 15, values: [11, 9, 7, 11, 8] },
    { upTo: Infinity, values: [10, 7, 5, 9, 6] },
  ] as readonly SavingThrowBand[]),
  thief: Object.freeze([
    { upTo: 4, values: [13, 12, 14, 16, 15] },
    { upTo: 8, values: [12, 11, 12, 15, 13] },
    { upTo: 12, values: [11, 10, 10, 14, 11] },
    { upTo: 16, values: [10, 9, 8, 13, 9] },
    { upTo: Infinity, values: [9, 8, 6, 12, 7] },
  ] as readonly SavingThrowBand[]),
  monk: Object.freeze([
    { upTo: 4, values: [13, 12, 14, 16, 15] },
    { upTo: 8, values: [12, 11, 12, 15, 13] },
    { upTo: 12, values: [11, 10, 10, 14, 11] },
    { upTo: 16, values: [10, 9, 8, 13, 9] },
    { upTo: Infinity, values: [9, 8, 6, 12, 7] },
  ] as readonly SavingThrowBand[]),
});

// Which printed table each class rolls on.
const SAVING_THROW_TABLE_OF: Readonly<Record<string, string>> = Object.freeze({
  fighter: 'fighter', ranger: 'fighter', paladin: 'paladin',
  cleric: 'cleric', druid: 'cleric',
  'magic-user': 'magic-user', illusionist: 'magic-user',
  thief: 'thief', assassin: 'thief', monk: 'monk',
});

// Retained for callers (and the legacy parity test) that read a table directly.
const rowsOf = (id: string): readonly SavingThrowValues[] =>
  Object.freeze((SAVING_THROW_TABLES[id] ?? []).map((b) => b.values));
export const FIGHTER_SAVING_THROWS = rowsOf('fighter');
export const PALADIN_SAVING_THROWS = rowsOf('paladin');
export const MONK_SAVING_THROWS = rowsOf('monk');
export const CLERIC_SAVING_THROWS = rowsOf('cleric');
export const MAGIC_USER_SAVING_THROWS = rowsOf('magic-user');
export const THIEF_SAVING_THROWS = rowsOf('thief');

function normalizeLevel(level: number): number {
  if (!Number.isFinite(level)) throw new RangeError('Level must be a finite number.');
  return Math.floor(level);
}

export function getSavingThrows(classId: ClassId, level: number): SavingThrowValues {
  const normalizedLevel = normalizeLevel(level);
  const tableId = SAVING_THROW_TABLE_OF[classId] ?? 'fighter';
  const table = SAVING_THROW_TABLES[tableId];
  if (!table) throw new RangeError(`No saving throw table for ${classId}.`);
  const band = table.find((b) => normalizedLevel <= b.upTo) ?? table[table.length - 1];
  if (!band) throw new RangeError('Saving throw table is empty.');
  return [...band.values] as SavingThrowValues;
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

import type { ClassId, RuleSource } from './types.js';

export type WisdomBonusMode = 'legacy-parity' | 'eligible-levels-only';
export type SpellTradition = 'Cleric' | 'Druid' | 'Magic-User' | 'Illusionist';

export interface SingleTraditionSpellSlots {
  readonly type: SpellTradition;
  readonly levels: readonly number[];
}

export interface RangerSpellSlots {
  readonly type: 'Ranger';
  readonly druid: readonly number[];
  readonly mu: readonly number[];
}

export type SpellSlots = SingleTraditionSpellSlots | RangerSpellSlots;

export const SPELL_PROGRESSION_RULE_SOURCE: RuleSource = Object.freeze({
  ruleset: 'legacy-adnd-1e',
  section: 'Class spell progression and Wisdom bonus spells',
  auditStatus: 'legacy-import',
  note: 'Imported from gcc/adnd-class-data.js. OSRIC 3.0 verification is still required.',
});

export const CLERIC_SPELLS = Object.freeze([
  [
    1,
    0,
    0,
    0,
    0,
    0,
    0
  ],
  [
    2,
    0,
    0,
    0,
    0,
    0,
    0
  ],
  [
    2,
    1,
    0,
    0,
    0,
    0,
    0
  ],
  [
    3,
    2,
    0,
    0,
    0,
    0,
    0
  ],
  [
    3,
    3,
    1,
    0,
    0,
    0,
    0
  ],
  [
    3,
    3,
    2,
    0,
    0,
    0,
    0
  ],
  [
    3,
    3,
    2,
    1,
    0,
    0,
    0
  ],
  [
    3,
    3,
    3,
    2,
    0,
    0,
    0
  ],
  [
    4,
    4,
    3,
    2,
    1,
    0,
    0
  ],
  [
    4,
    4,
    3,
    3,
    2,
    0,
    0
  ],
  [
    5,
    4,
    4,
    3,
    2,
    1,
    0
  ],
  [
    6,
    5,
    5,
    3,
    2,
    2,
    0
  ],
  [
    6,
    6,
    6,
    4,
    2,
    2,
    0
  ],
  [
    6,
    6,
    6,
    5,
    3,
    2,
    0
  ],
  [
    7,
    7,
    7,
    5,
    4,
    2,
    0
  ],
  [
    7,
    7,
    7,
    6,
    5,
    3,
    1
  ],
  [
    8,
    8,
    8,
    6,
    5,
    3,
    1
  ],
  [
    8,
    8,
    8,
    7,
    6,
    4,
    1
  ],
  [
    9,
    9,
    9,
    7,
    6,
    4,
    2
  ],
  [
    9,
    9,
    9,
    8,
    7,
    5,
    2
  ],
  [
    9,
    9,
    9,
    9,
    8,
    6,
    2
  ],
  [
    9,
    9,
    9,
    9,
    9,
    6,
    3
  ],
  [
    9,
    9,
    9,
    9,
    9,
    7,
    3
  ],
  [
    9,
    9,
    9,
    9,
    9,
    8,
    3
  ],
  [
    9,
    9,
    9,
    9,
    9,
    8,
    4
  ],
  [
    9,
    9,
    9,
    9,
    9,
    9,
    4
  ],
  [
    9,
    9,
    9,
    9,
    9,
    9,
    5
  ],
  [
    9,
    9,
    9,
    9,
    9,
    9,
    6
  ],
  [
    9,
    9,
    9,
    9,
    9,
    9,
    7
  ]
] as const);
export const DRUID_SPELLS = Object.freeze([
  [
    2,
    0,
    0,
    0,
    0,
    0,
    0
  ],
  [
    2,
    1,
    0,
    0,
    0,
    0,
    0
  ],
  [
    3,
    2,
    1,
    0,
    0,
    0,
    0
  ],
  [
    4,
    2,
    2,
    0,
    0,
    0,
    0
  ],
  [
    4,
    3,
    2,
    0,
    0,
    0,
    0
  ],
  [
    4,
    3,
    2,
    1,
    0,
    0,
    0
  ],
  [
    4,
    4,
    3,
    1,
    0,
    0,
    0
  ],
  [
    4,
    4,
    3,
    2,
    0,
    0,
    0
  ],
  [
    5,
    4,
    3,
    2,
    1,
    0,
    0
  ],
  [
    5,
    4,
    3,
    3,
    2,
    0,
    0
  ],
  [
    5,
    5,
    3,
    3,
    2,
    1,
    0
  ],
  [
    5,
    5,
    4,
    4,
    3,
    2,
    1
  ],
  [
    6,
    5,
    5,
    5,
    4,
    3,
    2
  ],
  [
    6,
    6,
    6,
    6,
    5,
    4,
    3
  ]
] as const);
export const MAGIC_USER_SPELLS = Object.freeze([
  [
    1,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0
  ],
  [
    2,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0
  ],
  [
    2,
    1,
    0,
    0,
    0,
    0,
    0,
    0,
    0
  ],
  [
    3,
    2,
    0,
    0,
    0,
    0,
    0,
    0,
    0
  ],
  [
    4,
    2,
    1,
    0,
    0,
    0,
    0,
    0,
    0
  ],
  [
    4,
    2,
    2,
    0,
    0,
    0,
    0,
    0,
    0
  ],
  [
    4,
    3,
    2,
    1,
    0,
    0,
    0,
    0,
    0
  ],
  [
    4,
    3,
    3,
    2,
    0,
    0,
    0,
    0,
    0
  ],
  [
    4,
    3,
    3,
    2,
    1,
    0,
    0,
    0,
    0
  ],
  [
    4,
    4,
    3,
    2,
    2,
    0,
    0,
    0,
    0
  ],
  [
    4,
    4,
    4,
    3,
    3,
    0,
    0,
    0,
    0
  ],
  [
    4,
    4,
    4,
    4,
    4,
    1,
    0,
    0,
    0
  ],
  [
    5,
    5,
    5,
    4,
    4,
    2,
    0,
    0,
    0
  ],
  [
    5,
    5,
    5,
    4,
    4,
    2,
    1,
    0,
    0
  ],
  [
    5,
    5,
    5,
    5,
    5,
    2,
    1,
    0,
    0
  ],
  [
    5,
    5,
    5,
    5,
    5,
    3,
    2,
    1,
    0
  ],
  [
    5,
    5,
    5,
    5,
    5,
    3,
    3,
    2,
    0
  ],
  [
    5,
    5,
    5,
    5,
    5,
    3,
    3,
    2,
    1
  ],
  [
    5,
    5,
    5,
    5,
    5,
    3,
    3,
    3,
    1
  ],
  [
    5,
    5,
    5,
    5,
    5,
    4,
    3,
    3,
    2
  ],
  [
    5,
    5,
    5,
    5,
    5,
    4,
    4,
    4,
    2
  ],
  [
    5,
    5,
    5,
    5,
    5,
    5,
    4,
    4,
    3
  ],
  [
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    3
  ],
  [
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    4
  ],
  [
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5,
    5
  ],
  [
    6,
    6,
    6,
    6,
    5,
    5,
    5,
    5,
    5
  ],
  [
    6,
    6,
    6,
    6,
    6,
    6,
    6,
    5,
    5
  ],
  [
    6,
    6,
    6,
    6,
    6,
    6,
    6,
    6,
    6
  ],
  [
    7,
    7,
    7,
    7,
    7,
    6,
    6,
    6,
    6
  ]
] as const);
export const ILLUSIONIST_SPELLS = Object.freeze([
  [
    1,
    0,
    0,
    0,
    0,
    0,
    0
  ],
  [
    2,
    0,
    0,
    0,
    0,
    0,
    0
  ],
  [
    2,
    1,
    0,
    0,
    0,
    0,
    0
  ],
  [
    3,
    2,
    0,
    0,
    0,
    0,
    0
  ],
  [
    4,
    2,
    1,
    0,
    0,
    0,
    0
  ],
  [
    4,
    3,
    1,
    0,
    0,
    0,
    0
  ],
  [
    4,
    3,
    2,
    0,
    0,
    0,
    0
  ],
  [
    4,
    3,
    2,
    1,
    0,
    0,
    0
  ],
  [
    5,
    3,
    3,
    2,
    1,
    0,
    0
  ],
  [
    5,
    4,
    3,
    2,
    1,
    0,
    0
  ],
  [
    5,
    4,
    3,
    3,
    2,
    0,
    0
  ],
  [
    5,
    5,
    4,
    3,
    2,
    1,
    0
  ],
  [
    5,
    5,
    4,
    3,
    2,
    2,
    0
  ],
  [
    5,
    5,
    4,
    3,
    2,
    2,
    1
  ],
  [
    5,
    5,
    5,
    4,
    3,
    2,
    2
  ],
  [
    5,
    5,
    5,
    5,
    4,
    3,
    2
  ],
  [
    5,
    5,
    5,
    5,
    5,
    3,
    2
  ],
  [
    5,
    5,
    5,
    5,
    5,
    3,
    3
  ],
  [
    5,
    5,
    5,
    5,
    5,
    4,
    3
  ],
  [
    5,
    5,
    5,
    5,
    5,
    4,
    3
  ],
  [
    5,
    5,
    5,
    5,
    5,
    4,
    3
  ],
  [
    5,
    5,
    5,
    5,
    5,
    5,
    4
  ],
  [
    5,
    5,
    5,
    5,
    5,
    5,
    5
  ],
  [
    6,
    6,
    6,
    6,
    6,
    5,
    5
  ],
  [
    6,
    6,
    6,
    6,
    6,
    6,
    6
  ],
  [
    7,
    7,
    7,
    7,
    7,
    6,
    6
  ]
] as const);
export const PALADIN_SPELLS = Object.freeze({
  "9": [
    1,
    0,
    0,
    0
  ],
  "10": [
    2,
    0,
    0,
    0
  ],
  "11": [
    2,
    1,
    0,
    0
  ],
  "12": [
    2,
    2,
    0,
    0
  ],
  "13": [
    2,
    2,
    1,
    0
  ],
  "14": [
    3,
    2,
    1,
    0
  ],
  "15": [
    3,
    2,
    1,
    1
  ],
  "16": [
    3,
    3,
    1,
    1
  ],
  "17": [
    3,
    3,
    2,
    1
  ],
  "18": [
    3,
    3,
    3,
    1
  ],
  "19": [
    3,
    3,
    3,
    2
  ],
  "20": [
    3,
    3,
    3,
    3
  ]
} as const);
export const RANGER_SPELLS = Object.freeze({
  "8": {
    "druid": [
      1,
      0,
      0
    ],
    "mu": [
      0,
      0
    ]
  },
  "9": {
    "druid": [
      1,
      0,
      0
    ],
    "mu": [
      1,
      0
    ]
  },
  "10": {
    "druid": [
      2,
      0,
      0
    ],
    "mu": [
      1,
      0
    ]
  },
  "11": {
    "druid": [
      2,
      0,
      0
    ],
    "mu": [
      2,
      0
    ]
  },
  "12": {
    "druid": [
      2,
      1,
      0
    ],
    "mu": [
      2,
      0
    ]
  },
  "13": {
    "druid": [
      2,
      1,
      0
    ],
    "mu": [
      2,
      1
    ]
  },
  "14": {
    "druid": [
      2,
      1,
      1
    ],
    "mu": [
      2,
      1
    ]
  },
  "15": {
    "druid": [
      2,
      2,
      0
    ],
    "mu": [
      2,
      2
    ]
  },
  "16": {
    "druid": [
      2,
      2,
      1
    ],
    "mu": [
      2,
      2
    ]
  },
  "17": {
    "druid": [
      2,
      2,
      2
    ],
    "mu": [
      2,
      2
    ]
  }
} as const);
export const WISDOM_BONUS_SPELLS = Object.freeze({
  "13": [
    1,
    0,
    0,
    0
  ],
  "14": [
    2,
    0,
    0,
    0
  ],
  "15": [
    2,
    1,
    0,
    0
  ],
  "16": [
    2,
    2,
    0,
    0
  ],
  "17": [
    2,
    2,
    1,
    0
  ],
  "18": [
    2,
    2,
    1,
    1
  ],
  "19": [
    3,
    2,
    1,
    1
  ],
  "20": [
    3,
    3,
    1,
    1
  ],
  "21": [
    3,
    3,
    2,
    2
  ],
  "22": [
    3,
    3,
    3,
    2
  ],
  "23": [
    3,
    3,
    3,
    3
  ],
  "24": [
    3,
    3,
    3,
    3
  ],
  "25": [
    3,
    3,
    3,
    3
  ]
} as const);

function normalizeLevel(level: number): number {
  if (!Number.isFinite(level)) throw new RangeError('Level must be a finite number.');
  return Math.max(1, Math.floor(level));
}

function copyRow(row: readonly number[]): number[] {
  return Array.from(row);
}

function cappedTableRow(table: readonly (readonly number[])[], level: number): number[] {
  const index = Math.min(normalizeLevel(level) - 1, table.length - 1);
  return copyRow(table[index] ?? []);
}

export function getWisdomBonusSpells(wisdom: number): readonly number[] {
  const score = Math.max(1, Math.min(25, Math.floor(Number.isFinite(wisdom) ? wisdom : 0)));
  const table = WISDOM_BONUS_SPELLS as Readonly<Record<number, readonly number[]>>;
  return copyRow(table[score] ?? [0, 0, 0, 0]);
}

export function applyWisdomBonusSpells(
  baseLevels: readonly number[],
  wisdom: number,
  mode: WisdomBonusMode = 'eligible-levels-only',
): readonly number[] {
  if (!Number.isFinite(wisdom) || wisdom < 13) return copyRow(baseLevels);
  const bonus = getWisdomBonusSpells(wisdom);
  return baseLevels.map((base, index) => {
    const amount = bonus[index] ?? 0;
    if (mode === 'legacy-parity') return base > 0 || amount > 0 ? base + amount : 0;
    return base > 0 ? base + amount : 0;
  });
}

export function getBaseSpellSlots(classId: ClassId, level: number): SpellSlots | null {
  const normalizedLevel = normalizeLevel(level);
  switch (classId) {
    case 'cleric':
      return { type: 'Cleric', levels: cappedTableRow(CLERIC_SPELLS, normalizedLevel) };
    case 'druid':
      return { type: 'Druid', levels: cappedTableRow(DRUID_SPELLS, normalizedLevel) };
    case 'magic-user':
      return { type: 'Magic-User', levels: cappedTableRow(MAGIC_USER_SPELLS, normalizedLevel) };
    case 'illusionist':
      return { type: 'Illusionist', levels: cappedTableRow(ILLUSIONIST_SPELLS, normalizedLevel) };
    case 'paladin': {
      if (normalizedLevel < 9) return null;
      const key = Math.min(normalizedLevel, 20);
      const row = (PALADIN_SPELLS as Readonly<Record<number, readonly number[]>>)[key];
      return row ? { type: 'Cleric', levels: copyRow(row) } : null;
    }
    case 'ranger': {
      if (normalizedLevel < 8) return null;
      const key = Math.min(normalizedLevel, 17);
      const row = (RANGER_SPELLS as Readonly<Record<number, { readonly druid: readonly number[]; readonly mu: readonly number[] }>>)[key];
      return row ? { type: 'Ranger', druid: copyRow(row.druid), mu: copyRow(row.mu) } : null;
    }
    default:
      return null;
  }
}

export function getSpellSlots(
  classId: ClassId,
  level: number,
  wisdom = 0,
  wisdomBonusMode: WisdomBonusMode = 'eligible-levels-only',
): SpellSlots | null {
  const base = getBaseSpellSlots(classId, level);
  if (!base || base.type === 'Ranger') return base;
  if (classId !== 'cleric' && classId !== 'druid' && classId !== 'paladin') return base;
  return {
    ...base,
    levels: applyWisdomBonusSpells(base.levels, wisdom, wisdomBonusMode),
  };
}

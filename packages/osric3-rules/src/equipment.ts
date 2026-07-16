import type { ClassId, RuleSource } from './types.js';

export interface RangedWeapon {
  name: string;
  damage: readonly number[];
  damageLarge: readonly number[];
  costGp: number;
  weightLb: number;
  speedFactor: number;
  armorClassAdjustments: readonly number[];
  classes: readonly ClassId[];
  ammoType: 'arrow' | 'bolt' | 'sling_bullet';
  rateOfFire: number;
  rangeTiles: readonly [number, number, number];
  twoHanded?: boolean;
}

export const RANGED_WEAPON_RULE_SOURCE: RuleSource = Object.freeze({
  ruleset: 'legacy-adnd-1e',
  section: 'Ranged weapon table',
  auditStatus: 'legacy-import',
  note: 'Imported from gcc/adnd-equipment.js. The heavy crossbow rate of fire is disputed by another legacy table and is deliberately not marked OSRIC 3 verified.',
});

export const RANGED_WEAPONS = Object.freeze({
  short_bow: {
    name: 'Short Bow',
    damage: [1, 6],
    damageLarge: [1, 6],
    costGp: 15,
    weightLb: 5,
    speedFactor: 7,
    armorClassAdjustments: [-5, -4, -1, 0, 0, 1, 2, 2, 2],
    classes: ['fighter', 'ranger', 'paladin', 'thief', 'assassin'],
    ammoType: 'arrow',
    rateOfFire: 2,
    rangeTiles: [5, 10, 15],
    twoHanded: true,
  },
  long_bow: {
    name: 'Long Bow',
    damage: [1, 6],
    damageLarge: [1, 6],
    costGp: 60,
    weightLb: 5,
    speedFactor: 8,
    armorClassAdjustments: [-1, 0, 0, 1, 2, 3, 3, 3, 3],
    classes: ['fighter', 'ranger', 'paladin'],
    ammoType: 'arrow',
    rateOfFire: 2,
    rangeTiles: [7, 14, 21],
    twoHanded: true,
  },
  light_crossbow: {
    name: 'Light Crossbow',
    damage: [1, 4],
    damageLarge: [1, 4],
    costGp: 12,
    weightLb: 5,
    speedFactor: 7,
    armorClassAdjustments: [-2, -1, 0, 0, 1, 2, 3, 3, 3],
    classes: ['fighter', 'ranger', 'paladin', 'thief', 'assassin'],
    ammoType: 'bolt',
    rateOfFire: 1,
    rangeTiles: [6, 12, 18],
    twoHanded: true,
  },
  heavy_crossbow: {
    name: 'Heavy Crossbow',
    damage: [1, 4, 1],
    damageLarge: [1, 6, 1],
    costGp: 20,
    weightLb: 8,
    speedFactor: 10,
    armorClassAdjustments: [-1, 0, 1, 2, 3, 3, 4, 4, 4],
    classes: ['fighter', 'ranger', 'paladin'],
    ammoType: 'bolt',
    rateOfFire: 1,
    rangeTiles: [8, 16, 24],
    twoHanded: true,
  },
  sling: {
    name: 'Sling',
    damage: [1, 4, 1],
    damageLarge: [1, 6, 1],
    costGp: 1,
    weightLb: 0,
    speedFactor: 7,
    armorClassAdjustments: [-2, -2, -1, 0, 0, 0, 2, 1, 3],
    classes: ['fighter', 'ranger', 'paladin', 'thief', 'assassin', 'druid', 'monk'],
    ammoType: 'sling_bullet',
    rateOfFire: 1,
    rangeTiles: [4, 8, 16],
  },
} satisfies Readonly<Record<string, RangedWeapon>>);

export const RANGED_WEAPON_AUDIT = Object.freeze({
  heavy_crossbow: {
    status: 'disputed' as const,
    activeLegacyValue: 1,
    duplicateLegacyValue: 0.5,
    osric3Value: null as number | null,
    note: 'gcc/adnd-equipment.js and the table embedded in gcc/adnd.html disagree. Resolve from the OSRIC 3.0 Player Guide before changing gameplay.',
  },
});

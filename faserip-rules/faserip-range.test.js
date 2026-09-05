// faserip-range test suite — run: node faserip-range.test.js
import {
  POWER_RANGE, THROW_RANGE, powerRange, throwRange, weaponRangeShift, thrownRangeShift,
  powerRangeShift, powerMaximumDistance, RANGE_SHIFT_PER_AREA, RANGE_VERSION, RANGE_CERTIFIED,
} from './faserip-range.js';
import { RANKS } from './faserip-kernel.js';

let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); pass++; console.log(`  ok  ${label}`); }
  catch (e) { fail++; console.log(`FAIL  ${label}\n      ${e.message}`); }
}
function eq(a, b) {
  const ja = JSON.stringify(a), jb = JSON.stringify(b);
  if (ja !== jb) throw new Error(`expected ${jb}, got ${ja}`);
}

console.log(`faserip-range v${RANGE_VERSION}  (RANGE_CERTIFIED=${RANGE_CERTIFIED})\n`);

t('[CERT] Power Rank Range Table: Shift 0/Feeble touch, Poor 1 ... Unearthly 60, Shift Z 400', () => {
  eq([POWER_RANGE.SH0.touch, POWER_RANGE.FE.touch], [true, true]);
  eq(['PR', 'TY', 'GD', 'EX', 'RM', 'IN', 'AM', 'MN', 'UN', 'SHX', 'SHY', 'SHZ'].map(k => POWER_RANGE[k].areas), [1, 2, 4, 6, 8, 10, 20, 40, 60, 80, 160, 400]);
});

t('[CERT] Class 1000 = 100 miles, 3000 = 10,000 miles, 5000 = 1,000,000 miles (the Moon), Beyond unlimited', () => {
  eq([POWER_RANGE.CL1000.miles, POWER_RANGE.CL3000.miles, POWER_RANGE.CL5000.miles], [100, 10000, 1000000]);
  eq(POWER_RANGE.BEYOND.unlimited, true);
  eq(powerRange('CL5000').los, true);
});

t('[CERT] Remarkable magnetic manipulation reaches 8 areas', () => {
  eq(powerRange('RM').areas, 8);
});

t('[CERT] both tables cover every rank key', () => {
  for (const r of RANKS) { powerRange(r.key); throwRange(r.key); }
});

t('[CERT] throwing range by Strength: Sh0 0, Fe/Pr/Ty 1, Gd 2, Ex 3, Rm 4, In 5, Am 6, Mn 7, Un 8, ShX 10, ShY 15, ShZ 20, Class 1000+ LOS', () => {
  eq(['SH0', 'FE', 'PR', 'TY', 'GD', 'EX', 'RM', 'IN', 'AM', 'MN', 'UN', 'SHX', 'SHY', 'SHZ'].map(k => THROW_RANGE[k].areas), [0, 1, 1, 1, 2, 3, 4, 5, 6, 7, 8, 10, 15, 20]);
  eq([THROW_RANGE.CL1000.los, THROW_RANGE.CL3000.los, THROW_RANGE.CL5000.los], [true, true, true]);
});

t('[CERT] weapons: -1CS per area traveled; a Rifle (range 15) at 4 areas is -4CS', () => {
  eq(RANGE_SHIFT_PER_AREA, -1);
  eq(weaponRangeShift({ distance: 4, maxRange: 15 }), { inRange: true, shift: -4, distance: 4, maxRange: 15 });
  eq(weaponRangeShift({ distance: 0, maxRange: 15 }).shift, 0);
});

t('[CERT] weapons cannot fire beyond their listed range', () => {
  eq(weaponRangeShift({ distance: 16, maxRange: 15 }).inRange, false);
});

t('[CERT] RULED 2026-09-05: thrown items take the weapon penalty, own area = 0; Strength caps the distance', () => {
  eq(thrownRangeShift({ distance: 2, strengthKey: 'EX' }), { inRange: true, shift: -2, distance: 2, maxRange: 3 });
  eq(thrownRangeShift({ distance: 4, strengthKey: 'EX' }).inRange, false);
  eq(thrownRangeShift({ distance: 30, strengthKey: 'CL1000' }).inRange, true);
});

t('[CERT] powers: no penalty within range, -1CS per additional area (Excellent power, Excellent Agility: 6 areas Ex, 7 Gd, 8 Ty)', () => {
  eq(powerRangeShift({ powerRank: 'EX', distance: 6, abilityRank: 'EX' }).effectiveRank, 'EX');
  eq(powerRangeShift({ powerRank: 'EX', distance: 7, abilityRank: 'EX' }).effectiveRank, 'GD');
  eq(powerRangeShift({ powerRank: 'EX', distance: 8, abilityRank: 'EX' }).effectiveRank, 'TY');
  eq(powerRangeShift({ powerRank: 'EX', distance: 8, abilityRank: 'EX' }).shift, -2);
});

t('[CERT] powers: the chance cannot fall below Shift 0 — that is maximum distance', () => {
  // Excellent Agility is 5 shifts above Shift 0: Ex, Gd, Ty, Pr, Fe, Sh0.
  eq(powerMaximumDistance({ powerRank: 'EX', abilityRank: 'EX' }), 11);
  eq(powerRangeShift({ powerRank: 'EX', distance: 10, abilityRank: 'EX' }).atMaximum, false);
  eq(powerRangeShift({ powerRank: 'EX', distance: 11, abilityRank: 'EX' }).atMaximum, true);
});

t('[CERT] line-of-sight powers have no range penalty or maximum', () => {
  eq(powerRangeShift({ powerRank: 'CL1000', distance: 500, abilityRank: 'GD' }).shift, 0);
  eq(powerMaximumDistance({ powerRank: 'BEYOND', abilityRank: 'GD' }), Infinity);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

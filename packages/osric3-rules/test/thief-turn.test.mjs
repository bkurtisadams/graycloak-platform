import assert from 'node:assert/strict';
import test from 'node:test';

import {
  THIEF_SKILLS_RULE_SOURCE,
  TURN_UNDEAD_RULE_SOURCE,
  getBackstab,
  getThiefSkillAncestryAdjustments,
  getThiefSkillBase,
  getThiefSkillDexterityAdjustments,
  getThiefSkillProfile,
  getTurnLevel,
  getTurnUndeadResult,
  getRuleSourceRecord,
} from '../dist/index.js';

// ── Thief skills: OSRIC 3.0 p.68 ──────────────────────────────────────────

test('thief base percentages match the printed level rows', () => {
  assert.deepEqual(getThiefSkillBase(1), {
    climb: 85, hide: 10, listen: 10, 'pick-locks': 25, 'pick-pockets': 30,
    'read-languages': 1, 'move-quietly': 15, traps: 20,
  });
  assert.deepEqual(getThiefSkillBase(7), {
    climb: 94, hide: 42, listen: 25, 'pick-locks': 52, 'pick-pockets': 60,
    'read-languages': 35, 'move-quietly': 55, traps: 50,
  });
  assert.deepEqual(getThiefSkillBase(16), {
    climb: 99, hide: 99, listen: 50, 'pick-locks': 97, 'pick-pockets': 125,
    'read-languages': 80, 'move-quietly': 99, traps: 95,
  });
});

test('levels 17-20 repeat the level-17 row and higher levels clamp to it', () => {
  const seventeen = getThiefSkillBase(17);
  assert.deepEqual(getThiefSkillBase(20), seventeen);
  assert.deepEqual(getThiefSkillBase(24), seventeen);
  assert.equal(seventeen.listen, 55);
  assert.equal(seventeen['pick-pockets'], 125);
});

test('backstab tiers expose both the multiplier and bonus-dice readings', () => {
  assert.deepEqual(getBackstab(1), { multiplier: 2, bonusDice: 1 });
  assert.deepEqual(getBackstab(4), { multiplier: 2, bonusDice: 1 });
  assert.deepEqual(getBackstab(5), { multiplier: 3, bonusDice: 2 });
  assert.deepEqual(getBackstab(9), { multiplier: 4, bonusDice: 3 });
  assert.deepEqual(getBackstab(13), { multiplier: 5, bonusDice: 4 });
  assert.deepEqual(getBackstab(17), { multiplier: 6, bonusDice: 5 });
  assert.deepEqual(getBackstab(20), { multiplier: 6, bonusDice: 5 });
});

test('dexterity adjustments follow the printed rows and clamp outside 9-19', () => {
  const nine = getThiefSkillDexterityAdjustments(9);
  assert.equal(nine['move-quietly'], -20);
  assert.equal(nine['pick-pockets'], -15);
  assert.equal(nine.climb, 0);
  const thirteen = getThiefSkillDexterityAdjustments(13);
  assert.ok(Object.values(thirteen).every((value) => value === 0));
  const sixteen = getThiefSkillDexterityAdjustments(16);
  assert.equal(sixteen['pick-locks'], 5);
  const nineteen = getThiefSkillDexterityAdjustments(19);
  assert.equal(nineteen['pick-locks'], 20);
  assert.equal(nineteen.hide, 15);
  assert.deepEqual(getThiefSkillDexterityAdjustments(25), nineteen);
  assert.deepEqual(getThiefSkillDexterityAdjustments(3), nine);
});

test('ancestry adjustments respect the differing printed column order', () => {
  const dwarf = getThiefSkillAncestryAdjustments('dwarf');
  assert.equal(dwarf['pick-locks'], 15);
  assert.equal(dwarf.traps, 15);
  assert.equal(dwarf['read-languages'], -5);
  assert.equal(dwarf['move-quietly'], -5);
  const halfling = getThiefSkillAncestryAdjustments('halfling');
  assert.equal(halfling['move-quietly'], 15);
  assert.equal(halfling.traps, 0);
  const halfElf = getThiefSkillAncestryAdjustments('half-elf');
  assert.equal(halfElf['pick-locks'], 0); // printed stray dash read as no adjustment
  assert.equal(halfElf['pick-pockets'], 10);
});

test('the composed profile sums base, dexterity, and ancestry uncapped', () => {
  const profile = getThiefSkillProfile({ level: 1, dexterity: 17, race: 'halfling' });
  // Hide: 10 base + 5 dex + 15 halfling = 30.
  assert.equal(profile.totals.hide, 30);
  // Climb: 85 base + 0 dex - 15 halfling = 70.
  assert.equal(profile.totals.climb, 70);
  const high = getThiefSkillProfile({ level: 16, dexterity: 19, race: 'human' });
  // Pick Pockets stays above 100 by design: 125 + 15 + 0.
  assert.equal(high.totals['pick-pockets'], 140);
  // Read Languages floors at 1 even with penalties elsewhere in range.
  const lowRead = getThiefSkillProfile({ level: 1, dexterity: 9, race: 'halfling' });
  assert.equal(lowRead.totals['read-languages'], 1);
});

test('thief skills register as the first verified OSRIC 3 source record', () => {
  assert.equal(THIEF_SKILLS_RULE_SOURCE.auditStatus, 'verified-osric3');
  assert.equal(THIEF_SKILLS_RULE_SOURCE.page, 68);
  const record = getRuleSourceRecord('thief-skills');
  assert.equal(record.auditStatus, 'verified-osric3');
  assert.ok(record.book && record.page === 68);
});

// ── Turn undead: parity with the legacy engines ───────────────────────────

test('turning matrix matches the legacy adnd-class-data values', () => {
  assert.deepEqual(getTurnUndeadResult(1, 'skeleton'), { result: 'roll', needed: 10 });
  assert.deepEqual(getTurnUndeadResult(1, 'wight'), { result: 'roll', needed: 20 });
  assert.deepEqual(getTurnUndeadResult(1, 'ghast'), { result: 'none' });
  assert.deepEqual(getTurnUndeadResult(4, 'skeleton'), { result: 'turned' });
  assert.deepEqual(getTurnUndeadResult(6, 'skeleton'), { result: 'destroyed' });
  assert.deepEqual(getTurnUndeadResult(9, 'special'), { result: 'roll', needed: 20 });
  assert.deepEqual(getTurnUndeadResult(14, 'lich'), { result: 'roll', needed: 19 }); // clamps to 9+ row
});

test('paladins turn two levels behind clerics starting at level 3', () => {
  assert.equal(getTurnLevel('cleric', 5), 5);
  assert.equal(getTurnLevel('paladin', 2), 0);
  assert.equal(getTurnLevel('paladin', 3), 1);
  assert.equal(getTurnLevel('paladin', 11), 9);
  assert.equal(getTurnLevel('fighter', 9), 0);
});

test('the turn undead source note flags the 2d6 discrepancy for the audit pass', () => {
  assert.equal(TURN_UNDEAD_RULE_SOURCE.auditStatus, 'legacy-import');
  assert.match(TURN_UNDEAD_RULE_SOURCE.note, /2d6/);
});

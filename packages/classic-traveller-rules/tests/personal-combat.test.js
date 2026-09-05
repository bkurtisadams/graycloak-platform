import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createSequenceDice,
  createPersonalCombatant,
  resolvePersonalSurprise,
  resolvePersonalAttack,
  resolvePersonalMorale,
  weaponTargetNumber,
  movePersonalCombatRange,
  endPersonalCombatRecovery,
  PERSONAL_WEAPONS,
  PERSONAL_ARMOR_TYPES,
  WEAPONS_MATRIX,
  evasionDefenseDM
} from '../index.js';

function hawkeye() {
  return createPersonalCombatant({ id: 'hawkeye', name: 'Hawkeye', side: 'party', playerCharacter: true,
    characteristics: { STR: 12, DEX: 9, END: 8, INT: 8 }, skills: { Rifle: 2 }, weaponKey: 'rifle' });
}

function raider() {
  return createPersonalCombatant({ id: 'raider', name: 'Raider', side: 'opposition',
    characteristics: { STR: 7, DEX: 7, END: 7, INT: 6 }, skills: { 'Automatic Pistol': 0 }, armor: 'jack', weaponKey: 'automatic-pistol' });
}

test('Book 1 pp.46-47 (errata applied) target numbers derive from the printed matrices', () => {
  // Rifle: nothing +3 / short +1 -> 4; cloth -3 / medium 0 -> 11; combat -5 / very long -3 -> 16.
  assert.equal(weaponTargetNumber('rifle', 'none', 'short'), 4);
  assert.equal(weaponTargetNumber('rifle', 'cloth', 'medium'), 11);
  assert.equal(weaponTargetNumber('rifle', 'combat', 'very-long'), 16);
  // Reflec is the anti-laser armor: laser rifle -8 / short +2 -> 14.
  assert.equal(weaponTargetNumber('laser-rifle', 'reflec', 'short'), 14);
  assert.equal(weaponTargetNumber('laser-carbine', 'reflec', 'close'), 18);
  // Errata: carbine vs ablat -1, SMG at long -3, dagger vs combat -7.
  assert.equal(weaponTargetNumber('carbine', 'ablat', 'short'), 8);
  assert.equal(weaponTargetNumber('submachine-gun', 'none', 'long'), 6);
  assert.equal(weaponTargetNumber('dagger', 'combat', 'close'), 14);
  // Body pistol vs reflec -4; hands vs jack -1; body pistol wounds 2D (errata).
  assert.equal(weaponTargetNumber('body-pistol', 'reflec', 'close'), 10);
  assert.equal(weaponTargetNumber('hands', 'jack', 'close'), 7);
  assert.equal(PERSONAL_WEAPONS['body-pistol'].damageDice, 2);
  assert.equal(PERSONAL_WEAPONS.hands.characteristic, 'STR');
  assert.equal(PERSONAL_WEAPONS.cutlass.fatigueDM, -4);
  for (const [key, spec] of Object.entries(PERSONAL_WEAPONS)) {
    PERSONAL_ARMOR_TYPES.forEach((armor, ai) => spec.rangeDMs.forEach((rangeDM, ri) => {
      const expected = rangeDM === null ? null : 8 - WEAPONS_MATRIX[key][ai] - rangeDM;
      assert.equal(spec.targets[armor][ri], expected, `${key} ${armor} ${ri}`);
    }));
  }
});

test('Book 1 p.32 evasion DM scales with range', () => {
  assert.equal(evasionDefenseDM('close'), -1);
  assert.equal(evasionDefenseDM('short'), -1);
  assert.equal(evasionDefenseDM('medium'), -2);
  assert.equal(evasionDefenseDM('long'), -4);
  assert.equal(evasionDefenseDM('very-long'), -4);
});

test('surprise requires a three-point margin after party DMs', () => {
  const player = hawkeye(); player.surpriseDM = 1;
  const result = resolvePersonalSurprise({ sides: [{ id: 'party', combatants: [player] }, { id: 'opposition', combatants: [raider()] }], dice: createSequenceDice([5, 2]) });
  assert.equal(result.surpriseSideId, 'party');
  assert.equal(result.surprisedSideId, 'opposition');
});

test('Rifle skill and DEX DM produce a visible Book 1 effective hit', () => {
  const result = resolvePersonalAttack({ attacker: hawkeye(), defender: raider(), range: 'medium', dice: createSequenceDice([2, 3, 4, 3, 2, 1]) });
  assert.equal(result.target, 5);
  assert.equal(result.skillDM, 2);
  assert.equal(result.characteristicDM, 1);
  assert.equal(result.total, 8);
  assert.equal(result.success, true);
  assert.deepEqual(result.damageDice, [4, 3, 2]);
  assert.equal(result.damageTotal, 9);
  assert.equal(result.firstBloodRoll, 1);
  assert.equal(result.defenderStatus, 'unconscious');
});

test('movement changes one abstract range band and morale starts at 25 percent casualties', () => {
  assert.equal(movePersonalCombatRange('medium', 'close'), 'short');
  assert.equal(movePersonalCombatRange('short', 'open'), 'medium');
  const below = resolvePersonalMorale({ casualties: 0, originalStrength: 4, dice: createSequenceDice([]) });
  assert.equal(below.required, false);
  const check = resolvePersonalMorale({ casualties: 1, originalStrength: 4, dice: createSequenceDice([2, 4]) });
  assert.equal(check.required, true);
  assert.equal(check.stands, false);
});

test('minor wounds receive the facsimile halfway reset when combat ends', () => {
  const character = hawkeye();
  character.current.STR = 6;
  const recovered = endPersonalCombatRecovery(character);
  assert.equal(recovered.current.STR, 9);
});

test('an untrained defender grants the printed +3 attack DM', () => {
  const defender = raider();
  defender.skills = {};
  const result = resolvePersonalAttack({ attacker: hawkeye(), defender, range: 'medium', dice: createSequenceDice([1, 1, 1, 1, 1, 1]) });
  assert.equal(result.defenderUntrainedDM, 3);
  assert.equal(result.totalDM, 6);
});

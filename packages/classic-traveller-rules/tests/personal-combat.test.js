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
  endPersonalCombatRecovery
} from '../index.js';

function hawkeye() {
  return createPersonalCombatant({ id: 'hawkeye', name: 'Hawkeye', side: 'party', playerCharacter: true,
    characteristics: { STR: 12, DEX: 9, END: 8, INT: 8 }, skills: { Rifle: 2 }, weaponKey: 'rifle' });
}

function raider() {
  return createPersonalCombatant({ id: 'raider', name: 'Raider', side: 'opposition',
    characteristics: { STR: 7, DEX: 7, END: 7, INT: 6 }, skills: { 'Automatic Pistol': 0 }, armor: 'jack', weaponKey: 'automatic-pistol' });
}

test('corrected Rifle table resolves armor and range throws', () => {
  assert.equal(weaponTargetNumber('rifle', 'none', 'short'), 4);
  assert.equal(weaponTargetNumber('rifle', 'cloth', 'medium'), 10);
  assert.equal(weaponTargetNumber('rifle', 'combat', 'very-long'), 15);
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

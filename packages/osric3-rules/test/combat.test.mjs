import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ATTACK_MATRIX_RULE_SOURCE,
  LEVEL_ZERO_THAC0,
  getAttackMatrixClass,
  getBestClassLinearThac0,
  getClassLinearThac0,
  getMonsterAttackRowId,
  getMonsterLinearThac0,
  getWeaponVsArmorAdjustment,
  linearToMatrixTarget,
  resolveAttackTarget,
} from '../dist/index.js';

test('classes fold onto the four legacy attack matrices', () => {
  assert.equal(getAttackMatrixClass('paladin'), 'fighter');
  assert.equal(getAttackMatrixClass('ranger'), 'fighter');
  assert.equal(getAttackMatrixClass('druid'), 'cleric');
  assert.equal(getAttackMatrixClass('illusionist'), 'magic-user');
  assert.equal(getAttackMatrixClass('assassin'), 'thief');
  assert.equal(getAttackMatrixClass('monk'), 'cleric');
});

test('linear THAC0 matches the sim anchors where the sim has rows', () => {
  // Parity with the THAC0 table in gcc/dungeon-encounter.html.
  assert.equal(getClassLinearThac0('fighter', 0), 21);
  assert.equal(getClassLinearThac0('fighter', 1), 20);
  assert.equal(getClassLinearThac0('fighter', 4), 18);
  assert.equal(getClassLinearThac0('fighter', 6), 16);
  assert.equal(getClassLinearThac0('fighter', 8), 14);
  assert.equal(getClassLinearThac0('fighter', 10), 12);
  assert.equal(getClassLinearThac0('cleric', 3), 20);
  assert.equal(getClassLinearThac0('cleric', 6), 18);
  assert.equal(getClassLinearThac0('cleric', 9), 16);
  assert.equal(getClassLinearThac0('magic-user', 5), 21);
  assert.equal(getClassLinearThac0('magic-user', 10), 19);
  assert.equal(getClassLinearThac0('magic-user', 15), 16);
  assert.equal(getClassLinearThac0('thief', 4), 21);
  assert.equal(getClassLinearThac0('thief', 8), 19);
  assert.equal(getClassLinearThac0('thief', 12), 16);
});

test('extended rows continue the bracket progression beyond the sim tables', () => {
  assert.equal(getClassLinearThac0('fighter', 11), 10);
  assert.equal(getClassLinearThac0('fighter', 17), 4);
  assert.equal(getClassLinearThac0('fighter', 30), 4);
  assert.equal(getClassLinearThac0('cleric', 12), 14);
  assert.equal(getClassLinearThac0('cleric', 19), 8);
  assert.equal(getClassLinearThac0('magic-user', 16), 13);
  assert.equal(getClassLinearThac0('magic-user', 21), 11);
  assert.equal(getClassLinearThac0('thief', 16), 14);
  assert.equal(getClassLinearThac0('thief', 21), 10);
});

test('multiclass characters attack on their best matrix row', () => {
  assert.equal(
    getBestClassLinearThac0([
      { classId: 'fighter', level: 5 },
      { classId: 'magic-user', level: 5 },
    ]),
    16,
  );
  assert.equal(
    getBestClassLinearThac0([
      { classId: 'cleric', level: 2 },
      { classId: 'thief', level: 9 },
    ]),
    16,
  );
  assert.equal(getBestClassLinearThac0([]), LEVEL_ZERO_THAC0);
});

test('monster hit dice select explicit rows, including the 1-1 row', () => {
  assert.equal(getMonsterAttackRowId({ hitDice: 0.5 }), 'up-to-1-1');
  assert.equal(getMonsterAttackRowId({ hitDice: 1, modifier: 'minus' }), '1-1');
  assert.equal(getMonsterAttackRowId({ hitDice: 1 }), '1');
  assert.equal(getMonsterAttackRowId({ hitDice: 1, modifier: 'plus' }), '1-plus');
  assert.equal(getMonsterAttackRowId({ hitDice: 3 }), '2-3');
  assert.equal(getMonsterAttackRowId({ hitDice: 5 }), '4-5');
  assert.equal(getMonsterAttackRowId({ hitDice: 7 }), '6-7');
  // Rows above 7 HD clamp to the top known row pending the audit pass.
  assert.equal(getMonsterAttackRowId({ hitDice: 12 }), '6-7');

  assert.equal(getMonsterLinearThac0({ hitDice: 1, modifier: 'minus' }), 20);
  assert.equal(getMonsterLinearThac0({ hitDice: 4 }), 15);
});

test('the repeating-20 span holds six armor-class columns', () => {
  assert.equal(linearToMatrixTarget(19), 19);
  assert.equal(linearToMatrixTarget(20), 20);
  assert.equal(linearToMatrixTarget(21), 20);
  assert.equal(linearToMatrixTarget(25), 20);
  assert.equal(linearToMatrixTarget(26), 21);
  assert.equal(linearToMatrixTarget(30), 25);
});

test('a first-level fighter walks the printed matrix row', () => {
  const row = (ac) => resolveAttackTarget({ linearThac0: 20, armorClass: ac });
  assert.equal(row(10).matrixTarget, 10);
  assert.equal(row(0).matrixTarget, 20);
  assert.equal(row(-1).matrixTarget, 20);
  assert.equal(row(-5).matrixTarget, 20);
  assert.equal(row(-5).inRepeating20Span, true);
  assert.equal(row(-6).matrixTarget, 21);
  assert.equal(row(-10).matrixTarget, 25);
  assert.equal(row(-10).inRepeating20Span, false);
});

test('a level-0 combatant reaches 20 at AC 1 and exits the span at AC -5', () => {
  const row = (ac) => resolveAttackTarget({ linearThac0: LEVEL_ZERO_THAC0, armorClass: ac });
  assert.equal(row(2).matrixTarget, 19);
  assert.equal(row(1).matrixTarget, 20);
  assert.equal(row(-4).matrixTarget, 20);
  assert.equal(row(-5).matrixTarget, 21);
});

test('roll modifiers adjust the required roll, not the matrix target', () => {
  const result = resolveAttackTarget({ linearThac0: 20, armorClass: -3, rollModifier: 2 });
  assert.equal(result.matrixTarget, 20);
  assert.equal(result.requiredRoll, 18);
  const unhittable = resolveAttackTarget({ linearThac0: 20, armorClass: -8 });
  assert.equal(unhittable.matrixTarget, 23);
  assert.equal(unhittable.requiredRoll, 23);
});

test('the required roll floors at the configured minimum', () => {
  const easy = resolveAttackTarget({ linearThac0: 4, armorClass: 10, rollModifier: 5 });
  assert.equal(easy.requiredRoll, 1);
  const floored = resolveAttackTarget({
    linearThac0: 4,
    armorClass: 10,
    rollModifier: 5,
    minimumRoll: 2,
  });
  assert.equal(floored.requiredRoll, 2);
});

test('weapon-vs-armor adjustments clamp to the AC 2-10 table columns', () => {
  const battleAxe = { 2: -3, 3: -1, 4: 1, 5: -1, 6: 0, 7: 0, 8: 1, 9: 1, 10: 2 };
  assert.equal(getWeaponVsArmorAdjustment(battleAxe, 10), 2);
  assert.equal(getWeaponVsArmorAdjustment(battleAxe, 4), 1);
  assert.equal(getWeaponVsArmorAdjustment(battleAxe, 0), -3);
  assert.equal(getWeaponVsArmorAdjustment(battleAxe, -6), -3);
  assert.equal(getWeaponVsArmorAdjustment(null, 5), 0);
  assert.equal(getWeaponVsArmorAdjustment({}, 5), 0);
});

test('the combat module ships disputed: 1e values held pending the OSRIC 3.0 progression ruling', () => {
  assert.equal(ATTACK_MATRIX_RULE_SOURCE.ruleset, 'legacy-adnd-1e');
  assert.equal(ATTACK_MATRIX_RULE_SOURCE.auditStatus, 'disputed');
  assert.match(ATTACK_MATRIX_RULE_SOURCE.note, /per level/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSurpriseAlarm } from '../index.js';

const dice = (...values) => ({
  rollD6: () => values.shift(),
  roll2D6() { const rolled = [this.rollD6(), this.rollD6()]; return { dice: rolled, total: rolled[0] + rolled[1] }; }
});

test('Book 1 p.26 an unsilenced gunshot immediately ends surprise', () => {
  const result = resolveSurpriseAlarm({
    attacks: [{ weaponKey: 'rifle', targetId: 'guard', hit: false }],
    defendingCombatants: [{ id: 'guard', status: 'active' }], dice: dice()
  });
  assert.deepEqual(result, { alarm: true, reason: 'unsilenced-gunshot', roll: null, dice: [] });
});

test('Book 1 p.26 lasers and silent misses do not end surprise', () => {
  const result = resolveSurpriseAlarm({
    attacks: [{ weaponKey: 'laser-rifle', targetId: 'guard', hit: false }],
    defendingCombatants: [{ id: 'guard', status: 'active' }], dice: dice()
  });
  assert.equal(result.alarm, false);
});

test('Book 1 p.26 a conscious victim raises the alarm', () => {
  const result = resolveSurpriseAlarm({
    attacks: [{ weaponKey: 'dagger', targetId: 'guard', hit: true, defenderStatus: 'active' }],
    defendingCombatants: [{ id: 'guard', status: 'active' }], dice: dice()
  });
  assert.equal(result.reason, 'conscious-victim');
  assert.equal(result.alarm, true);
});

test('Book 1 p.26 an unattacked witness notices a quiet fall on 9+', () => {
  const result = resolveSurpriseAlarm({
    attacks: [{ weaponKey: 'dagger', targetId: 'guard-1', hit: true, defenderStatus: 'unconscious' }],
    defendingCombatants: [{ id: 'guard-1', status: 'unconscious' }, { id: 'guard-2', status: 'active' }],
    dice: dice(4, 5)
  });
  assert.equal(result.alarm, true);
  assert.equal(result.reason, 'witness');
  assert.equal(result.roll, 9);
});

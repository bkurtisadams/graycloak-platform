import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRollFormula, rollFormula, formatRoll, createChatMessage, interpretChatInput, TRAY_DICE } from '../src/dice-tray.js';

test('formulas parse the way people type them', () => {
  assert.deepEqual(parseRollFormula('2d6+1'), { count: 2, sides: 6, modifier: 1, formula: '2d6+1' });
  assert.deepEqual(parseRollFormula('/roll 2D6 - 2'), { count: 2, sides: 6, modifier: -2, formula: '2d6-2' });
  assert.deepEqual(parseRollFormula('d20'), { count: 1, sides: 20, modifier: 0, formula: '1d20' });
  assert.equal(parseRollFormula('hello'), null);
  assert.equal(parseRollFormula('0d6'), null);
  assert.equal(parseRollFormula('2d1'), null);
  assert.equal(parseRollFormula('999d6'), null);
});

test('a roll uses the supplied dice and sums with the modifier', () => {
  const values = [0.99, 0.0];
  const roll = rollFormula('2d6+1', { random: () => values.shift() });
  assert.deepEqual(roll.dice, [6, 1]);
  assert.equal(roll.total, 8);
  assert.equal(formatRoll(roll), '2D6+1 → [6 1] + 1 = 8');
  assert.throws(() => rollFormula('nope'), RangeError);
});

test('chat input is a roll if it parses and speech otherwise', () => {
  const said = interpretChatInput('  we take the job  ', { uid: 'u', name: 'Isabel' });
  assert.equal(said.kind, 'say'); assert.equal(said.text, 'we take the job'); assert.equal(said.roll, null);
  const rolled = interpretChatInput('/roll 1d6', { uid: 'u', name: 'Isabel', random: () => 0.5 });
  assert.equal(rolled.kind, 'roll'); assert.deepEqual(rolled.roll.dice, [4]);
  assert.throws(() => createChatMessage({ uid: 'u', text: '   ' }), RangeError);
  assert.throws(() => createChatMessage({ uid: '' , text: 'x' }), TypeError);
  assert.equal(TRAY_DICE[0].label, '2D');
});

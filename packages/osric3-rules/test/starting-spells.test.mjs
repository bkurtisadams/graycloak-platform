import assert from 'node:assert/strict';
import test from 'node:test';

import {
  OSRIC3_MAGIC_USER_STARTING_SPELL_POLICY,
  createStartingSpellPolicy,
  selectStartingArcaneSpells,
} from '../dist/index.js';

function sequenceRandom(values) {
  let index = 0;
  return () => values[index++ % values.length];
}

test('the unaudited OSRIC policy refuses to invent missing category lists', () => {
  const result = selectStartingArcaneSpells(OSRIC3_MAGIC_USER_STARTING_SPELL_POLICY);
  assert.deepEqual(result.spells, ['Read Magic']);
  assert.deepEqual(result.choicesRequired, ['offensive', 'defensive', 'miscellaneous']);
});

test('starting arcane spells support rolled results and the choose face', () => {
  const policy = createStartingSpellPolicy({
    offensive: ['Offense 1', 'Offense 2', 'Offense 3', 'Offense 4', 'Offense 5', 'Offense 6', 'Offense 7', 'Offense 8', 'Offense 9'],
    defensive: ['Defense 1', 'Defense 2'],
    miscellaneous: ['Misc 1', 'Misc 2', 'Misc 3', 'Misc 4', 'Misc 5'],
  });
  const result = selectStartingArcaneSpells(
    policy,
    { defensive: 'Defense 2' },
    sequenceRandom([0, 0.99, 0.4]),
  );
  assert.deepEqual(result.rolls, { offensive: 1, defensive: 10, miscellaneous: 5 });
  assert.deepEqual(result.spells, ['Read Magic', 'Offense 1', 'Defense 2', 'Misc 5']);
  assert.deepEqual(result.choicesRequired, []);
});

test('a choose result remains unresolved when no valid spell is selected', () => {
  const policy = createStartingSpellPolicy({
    offensive: ['Magic Missile'],
    defensive: ['Shield'],
    miscellaneous: ['Light'],
  });
  const result = selectStartingArcaneSpells(policy, {}, sequenceRandom([0.99]));
  assert.deepEqual(result.spells, ['Read Magic']);
  assert.deepEqual(result.choicesRequired, ['offensive', 'defensive', 'miscellaneous']);
});

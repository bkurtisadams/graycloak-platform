import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CHARGEN_ACTIONS,
  CHARGEN_PHASES,
  createCharacter,
  createSequenceDice,
  performChargenAction
} from '../../packages/classic-traveller-rules/index.js';

import {
  buildCharacterRecord,
  buildGenerationLog,
  buildProcedure,
  buildServiceHistory,
  formatHistoryEvent
} from '../client/ui-model.js';

function sevenCharacter() {
  return createCharacter({
    name: 'Test Traveller',
    dice: createSequenceDice([3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4])
  });
}

test('initial browser model renders a personnel record and six legal service choices', () => {
  const character = sevenCharacter();
  const record = buildCharacterRecord(character);
  const procedure = buildProcedure(character);

  assert.match(record, /UPP 777777/);
  assert.match(record, /AGE 18/);
  assert.match(record, /SERVICE APPLICATION/);
  assert.equal(procedure.available.phase, CHARGEN_PHASES.SERVICE_SELECTION);
  assert.deepEqual(procedure.available.actions, [CHARGEN_ACTIONS.ATTEMPT_ENLISTMENT]);
  assert.equal(procedure.available.choices.services.length, 6);
});

test('browser model follows engine state after enlistment without carrying target numbers', () => {
  let character = sevenCharacter();
  character = performChargenAction(character, CHARGEN_ACTIONS.ATTEMPT_ENLISTMENT, {
    service: 'other',
    dice: createSequenceDice([2, 2])
  }).character;

  const procedure = buildProcedure(character);
  assert.equal(procedure.available.phase, CHARGEN_PHASES.TERM_READY);
  assert.deepEqual(procedure.available.actions, [CHARGEN_ACTIONS.BEGIN_TERM]);
  assert.match(buildServiceHistory(character), /ENLIST OTHER/);
  assert.match(buildGenerationLog(character), /ACCEPTED/);
});

test('history formatter exposes actual roll, DM, total, and target from engine history', () => {
  let character = createCharacter({
    dice: createSequenceDice([3, 4, 3, 4, 3, 4, 3, 4, 5, 5, 3, 4])
  });
  character = performChargenAction(character, CHARGEN_ACTIONS.ATTEMPT_ENLISTMENT, {
    service: 'navy',
    dice: createSequenceDice([1, 2])
  }).character;

  const event = character.history.at(-1);
  const line = formatHistoryEvent(event);
  assert.match(line, /roll 1\+2/);
  assert.match(line, /DM \+2/);
  assert.match(line, /total 5/);
  assert.match(line, /vs 8\+/);
  assert.match(line, /FAILED/);
});

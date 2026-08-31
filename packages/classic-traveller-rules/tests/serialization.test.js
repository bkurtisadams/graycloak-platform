import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CURRENT_CHARACTER_SCHEMA_VERSION,
  CharacterValidationError,
  CHARGEN_PHASES,
  createCharacter,
  createSequenceDice,
  exportCharacter,
  importCharacter,
  validateCharacter
} from '../index.js';

function freshCharacter() {
  return createCharacter({
    name: 'JSON Test',
    dice: createSequenceDice([
      3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4
    ])
  });
}

test('new characters use schema v4 and round-trip through strict JSON export/import', () => {
  const character = freshCharacter();
  assert.equal(character.schemaVersion, CURRENT_CHARACTER_SCHEMA_VERSION);

  const validation = validateCharacter(character);
  assert.equal(validation.valid, true, validation.errors.join('\n'));

  const json = exportCharacter(character);
  const imported = importCharacter(json);

  assert.deepEqual(imported, character);
  assert.notEqual(imported, character);
  assert.notEqual(imported.characteristics, character.characteristics);
});

test('compatible schema v3 documents migrate to v4 on import', () => {
  const legacy = { ...freshCharacter(), schemaVersion: 3 };
  const imported = importCharacter(JSON.stringify(legacy));
  assert.equal(imported.schemaVersion, 4);
  assert.equal(validateCharacter(imported).valid, true);
});

test('import rejects malformed JSON', () => {
  assert.throws(
    () => importCharacter('{"schemaVersion":4,'),
    (error) => error instanceof CharacterValidationError && /invalid JSON/.test(error.message)
  );
});

test('import rejects unknown fields instead of silently discarding them', () => {
  const corrupt = { ...freshCharacter(), mysteryField: 42 };
  assert.throws(
    () => importCharacter(corrupt),
    (error) => error instanceof CharacterValidationError
      && error.errors.some((message) => /unknown top-level field: mysteryField/.test(message))
  );
});

test('import rejects a UPP that does not match the characteristics', () => {
  const corrupt = { ...freshCharacter(), upp: 'AAAAAA' };
  assert.throws(
    () => importCharacter(corrupt),
    (error) => error instanceof CharacterValidationError
      && error.errors.some((message) => /upp must match/.test(message))
  );
});

test('import rejects impossible phase/state combinations', () => {
  const corrupt = {
    ...freshCharacter(),
    phase: CHARGEN_PHASES.TERM_COMPLETION_READY,
    service: 'navy',
    currentTerm: null,
    skillsDue: 1
  };

  const result = validateCharacter(corrupt);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => /requires currentTerm/.test(message)));
  assert.ok(result.errors.some((message) => /zero skillsDue/.test(message)));
  assert.throws(() => importCharacter(corrupt), CharacterValidationError);
});

test('import rejects rank titles inconsistent with service rank', () => {
  const corrupt = {
    ...freshCharacter(),
    service: 'navy',
    phase: CHARGEN_PHASES.TERM_READY,
    rank: 1,
    rankTitle: 'Admiral'
  };
  assert.throws(
    () => importCharacter(corrupt),
    (error) => error instanceof CharacterValidationError
      && error.errors.some((message) => /rankTitle does not match/.test(message))
  );
});

test('every ordinary chargen checkpoint can be exported and restored mid-career', async () => {
  const {
    CHARGEN_ACTIONS,
    performChargenAction
  } = await import('../index.js');

  let character = freshCharacter();
  const checkpoints = [character];
  const act = (action, payload = {}) => {
    character = performChargenAction(character, action, payload).character;
    checkpoints.push(character);
  };

  act(CHARGEN_ACTIONS.ATTEMPT_ENLISTMENT, { service: 'other', dice: createSequenceDice([2, 2]) });
  act(CHARGEN_ACTIONS.BEGIN_TERM);
  act(CHARGEN_ACTIONS.RESOLVE_SURVIVAL, { dice: createSequenceDice([3, 3]) });
  act(CHARGEN_ACTIONS.ROLL_SKILL, { tableKey: 'personal-development', dice: createSequenceDice([1]) });
  act(CHARGEN_ACTIONS.ROLL_SKILL, { tableKey: 'personal-development', dice: createSequenceDice([1]) });
  act(CHARGEN_ACTIONS.COMPLETE_TERM);
  act(CHARGEN_ACTIONS.ROLL_REENLISTMENT, { dice: createSequenceDice([3, 3]) });
  act(CHARGEN_ACTIONS.MUSTER_OUT);
  act(CHARGEN_ACTIONS.BEGIN_MUSTER_OUT);
  act(CHARGEN_ACTIONS.ROLL_MUSTER_CASH, { dice: createSequenceDice([1]) });

  for (const checkpoint of checkpoints) {
    const validation = validateCharacter(checkpoint);
    assert.equal(validation.valid, true, `${checkpoint.phase}: ${validation.errors.join('; ')}`);
    assert.deepEqual(importCharacter(exportCharacter(checkpoint)), checkpoint);
  }
});

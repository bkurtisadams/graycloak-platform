import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CHARACTER_DOCUMENT_TYPE,
  CURRENT_CHARACTER_DOCUMENT_SCHEMA_VERSION,
  CharacterDocumentValidationError,
  CHARGEN_ACTIONS,
  CHARGEN_PHASES,
  createCharacter,
  createCharacterDocument,
  createSequenceDice,
  exportCharacterDocument,
  importCharacterDocument,
  performChargenAction,
  summarizeMaterialBenefits,
  validateCharacterDocument
} from '../index.js';

function completeOneTermCharacter() {
  let character = createCharacter({
    name: 'Avery',
    dice: createSequenceDice([3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4])
  });
  character = performChargenAction(character, CHARGEN_ACTIONS.ATTEMPT_ENLISTMENT, {
    service: 'other', dice: createSequenceDice([2, 2])
  }).character;
  character = performChargenAction(character, CHARGEN_ACTIONS.BEGIN_TERM).character;
  character = performChargenAction(character, CHARGEN_ACTIONS.RESOLVE_SURVIVAL, {
    dice: createSequenceDice([3, 3])
  }).character;
  character = performChargenAction(character, CHARGEN_ACTIONS.ROLL_SKILL, {
    tableKey: 'personal-development', dice: createSequenceDice([1])
  }).character;
  character = performChargenAction(character, CHARGEN_ACTIONS.ROLL_SKILL, {
    tableKey: 'service-skills', dice: createSequenceDice([2])
  }).character;
  character = performChargenAction(character, CHARGEN_ACTIONS.COMPLETE_TERM).character;
  character = performChargenAction(character, CHARGEN_ACTIONS.ROLL_REENLISTMENT, {
    dice: createSequenceDice([1, 1])
  }).character;
  character = performChargenAction(character, CHARGEN_ACTIONS.BEGIN_MUSTER_OUT).character;
  character = performChargenAction(character, CHARGEN_ACTIONS.ROLL_MUSTER_BENEFIT, {
    dice: createSequenceDice([1])
  }).character;
  assert.equal(character.phase, CHARGEN_PHASES.COMPLETE);
  return character;
}

test('completed chargen state converts to a compact gameplay character document', () => {
  const chargen = completeOneTermCharacter();
  const document = createCharacterDocument(chargen, { aliases: ['Test Call Sign'] });

  assert.equal(document.documentType, CHARACTER_DOCUMENT_TYPE);
  assert.equal(document.schemaVersion, CURRENT_CHARACTER_DOCUMENT_SCHEMA_VERSION);
  assert.deepEqual(document.identity, { name: 'Avery', aliases: ['Test Call Sign'] });
  assert.equal(document.upp, chargen.upp);
  assert.deepEqual(document.characteristics, chargen.characteristics);
  assert.deepEqual(document.skills, chargen.skills);
  assert.equal(document.career.service, 'other');
  assert.equal(document.career.terms, 1);
  assert.equal(document.finances.credits, 0);
  assert.deepEqual(document.benefits.passages, [{ name: 'Low Passage', count: 1 }]);
  assert.equal(document.history.at(-1).type, 'chargen-complete');
  assert.equal(Object.hasOwn(document, 'phase'), false);
  assert.equal(Object.hasOwn(document, 'musterOut'), false);
  assert.equal(Object.hasOwn(document, 'currentTerm'), false);
  assert.equal(validateCharacterDocument(document).valid, true);
});

test('incomplete chargen state cannot become a gameplay character document', () => {
  const character = createCharacter({
    dice: createSequenceDice([3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4])
  });
  assert.throws(
    () => createCharacterDocument(character),
    (error) => error instanceof CharacterDocumentValidationError && /completed chargen/.test(error.message)
  );
});

test('material-benefit summary preserves duplicate ship results without inventing ownership semantics', () => {
  const benefits = summarizeMaterialBenefits([
    { type: 'material', name: 'Scout Ship' },
    { type: 'material', name: 'Low Passage' },
    { type: 'material', name: 'Scout Ship' }
  ]);

  assert.deepEqual(benefits.passages, [{ name: 'Low Passage', count: 1 }]);
  assert.deepEqual(benefits.shipEntitlements, [{
    name: 'Scout Ship',
    count: 2,
    disposition: 'unresolved'
  }]);
  assert.equal(benefits.raw.length, 3);
});

test('character documents round-trip through strict JSON export/import', () => {
  const document = createCharacterDocument(completeOneTermCharacter());
  const imported = importCharacterDocument(exportCharacterDocument(document));
  assert.deepEqual(imported, document);
  assert.notEqual(imported, document);
  assert.notEqual(imported.characteristics, document.characteristics);
});

test('character-document import rejects unknown fields', () => {
  const document = { ...createCharacterDocument(completeOneTermCharacter()), mystery: true };
  assert.throws(
    () => importCharacterDocument(document),
    (error) => error instanceof CharacterDocumentValidationError
      && error.errors.some((message) => /unknown top-level field: mystery/.test(message))
  );
});

test('character-document import rejects a UPP inconsistent with characteristics', () => {
  const document = { ...createCharacterDocument(completeOneTermCharacter()), upp: 'AAAAAA' };
  assert.throws(
    () => importCharacterDocument(document),
    (error) => error instanceof CharacterDocumentValidationError
      && error.errors.some((message) => /upp must match/.test(message))
  );
});

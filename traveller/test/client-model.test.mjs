import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CHARGEN_ACTIONS,
  CHARGEN_PHASES,
  createCharacter,
  createCharacterDocument,
  createSequenceDice,
  performChargenAction
} from '../../packages/classic-traveller-rules/index.js';

import {
  buildCharacterRecord,
  buildFinalCharacterRecord,
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

test('browser model supplies contextual help and attention state for decisions', async () => {
  const { helpForTopic } = await import('../client/ui-model.js');
  const help = helpForTopic('service-selection');
  assert.equal(help.title, 'SERVICE APPLICATION');
  assert.match(help.body, /draft/i);

  let character = sevenCharacter();
  character = performChargenAction(character, CHARGEN_ACTIONS.ATTEMPT_ENLISTMENT, {
    service: 'other',
    dice: createSequenceDice([2, 2])
  }).character;
  character = performChargenAction(character, CHARGEN_ACTIONS.BEGIN_TERM).character;
  character = performChargenAction(character, CHARGEN_ACTIONS.RESOLVE_SURVIVAL, {
    dice: createSequenceDice([6, 6])
  }).character;

  const procedure = buildProcedure(character);
  assert.equal(procedure.helpTopic, character.phase);
  assert.equal(typeof procedure.attention, 'boolean');
});


test('completed chargen renders a final gameplay personnel record', () => {
  let character = sevenCharacter();
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

  const document = createCharacterDocument(character);
  const record = buildFinalCharacterRecord(document);
  assert.match(record, /FINAL PERSONNEL RECORD/);
  assert.match(record, /GAMEPLAY DOCUMENT v1/);
  assert.match(record, /PASSAGE Low Passage/);
  assert.doesNotMatch(record, /PHASE/);
});

test('final record labels duplicate ship results as unresolved entitlements', () => {
  const document = {
    documentType: 'classic-traveller-character',
    schemaVersion: 1,
    identity: { name: 'Scout', aliases: [] },
    age: 38,
    chronology: { chronologicalAgeMonths: 456, physicalAgeMonths: 456, nextAgingCheckAgeMonths: 504 },
    characteristics: { STR: 10, DEX: 10, END: 6, INT: 7, EDU: 7, SOC: 7 },
    upp: 'AA6777',
    status: { alive: true, retired: true },
    career: { service: 'scouts', drafted: false, terms: 5, yearsServed: 20, rank: 0, rankTitle: '', separationReason: 'voluntary' },
    skills: { Pilot: 1 },
    finances: { credits: 0, retirementPayAnnual: 4000 },
    benefits: {
      raw: [{ type: 'material', name: 'Scout Ship' }, { type: 'material', name: 'Scout Ship' }],
      passages: [], memberships: [], equipment: [],
      shipEntitlements: [{ name: 'Scout Ship', count: 2, disposition: 'unresolved' }]
    },
    history: [], notes: '', provenance: { source: 'classic-traveller-book-1-chargen', chargenSchemaVersion: 4 }
  };
  const record = buildFinalCharacterRecord(document);
  assert.match(record, /SHIP ENTITLEMENT Scout Ship ×2/);
  assert.match(record, /DISPOSITION UNRESOLVED/);
});

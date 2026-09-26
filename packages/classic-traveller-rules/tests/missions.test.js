// v0.79.0: patron missions for solo play.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createDice, createSequenceDice } from '../src/dice.js';
import { draftPatronMission, throwMissionTask, missionTaskDays, MISSION_KINDS } from '../src/encounters/missions.js';

const places = [{ id: 'here', name: 'Here', distance: 0 }, { id: 'near', name: 'Near', distance: 1 }, { id: 'far', name: 'Far', distance: 2 }];

test('a smuggler mostly wants smuggling; the draft has a world, pay, days and cargo', () => {
  const draft = draftPatronMission(createSequenceDice([1, 1, 1, 3, 3, 3, 2]), { patronType: 'Smuggler', candidates: places });
  assert.equal(draft.kind, 'smuggling');
  assert.notEqual(draft.destinationSystemId, 'here', 'smuggling goes somewhere else');
  assert.ok(draft.paymentCr > 0 && draft.deadlineDays >= 21 && draft.cargoTons >= 1);
  assert.match(draft.title, /^Land \d t of .* on (Near|Far)$/);
});

test('every draft is one of the kinds the game can referee', () => {
  for (let i = 0; i < 200; i += 1) {
    const draft = draftPatronMission(createDice(), { patronType: ['Reporter', 'Spy', 'Noble', 'Clerk'][i % 4], candidates: places });
    assert.ok(MISSION_KINDS.includes(draft.kind));
    assert.notEqual(draft.distance, 0, 'the job is somewhere else');
  }
});

test('a task at the destination is 2D plus the best skill against 8', () => {
  assert.equal(throwMissionTask(createSequenceDice([3, 3]), { kind: 'retrieval', skillLevel: 2 }).success, true);
  assert.equal(throwMissionTask(createSequenceDice([3, 3]), { kind: 'investigation', skillLevel: 1 }).success, false);
  assert.equal(missionTaskDays(createSequenceDice([4]), 'investigation'), 5);
  assert.throws(() => throwMissionTask(createDice(), { kind: 'courier' }), /no task/);
});

// v0.83.0: p.124's shape — the hidden 1D thrown when the job is taken.
import { PATRON_OUTCOMES, rollPatronOutcome, patronOutcomeSettlement } from '../src/encounters/missions.js';

test('p.124: one hidden 1D picks what the patron is really about', () => {
  assert.equal(PATRON_OUTCOMES.length, 6);
  assert.deepEqual([1, 2, 3, 4, 5, 6].map((die) => rollPatronOutcome(createSequenceDice([die])).outcome),
    ['honest', 'honest', 'swindled', 'dishonest', 'crazy', 'lying']);
  assert.equal(rollPatronOutcome(createSequenceDice([6])).die, 6);
});

test('each outcome settles the job its own way', () => {
  assert.deepEqual({ ...patronOutcomeSettlement('honest', 12000) }, { outcome: 'honest', paidCr: 12000, completes: true, trouble: false, reason: null });
  assert.equal(patronOutcomeSettlement('swindled', 12500).paidCr, 6250);
  assert.equal(patronOutcomeSettlement('dishonest', 12000).paidCr, 0);
  assert.equal(patronOutcomeSettlement('dishonest', 12000).completes, true, 'the work is done');
  assert.equal(patronOutcomeSettlement('crazy', 12000).completes, false);
  assert.equal(patronOutcomeSettlement('lying', 12000).paidCr, 12000);
  assert.equal(patronOutcomeSettlement('lying', 12000).trouble, true);
  assert.equal(patronOutcomeSettlement(undefined, 5000).paidCr, 5000, 'a job taken before v0.83.0 is honest');
  assert.throws(() => patronOutcomeSettlement('sly', 1), /unknown patron outcome/);
});

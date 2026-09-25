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

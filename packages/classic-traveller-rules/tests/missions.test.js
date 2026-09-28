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

// 0.88.0: p.124's six outcomes on 1D (design.md 9.4).
import { PATRON_OUTCOMES, CRAZY_OUTCOMES, rollPatronOutcome, patronOutcomeSettlement } from '../src/encounters/missions.js';

test('p.124: the book\u2019s six, one each on 1D; crazy throws a second die', () => {
  assert.deepEqual([...PATRON_OUTCOMES], ['honest', 'crazy', 'swindled', 'lying', 'devious', 'dishonest']);
  assert.deepEqual([1, 3, 4, 5, 6].map((die) => rollPatronOutcome(createSequenceDice([die])).outcome), ['honest', 'swindled', 'lying', 'devious', 'dishonest']);
  const crazy = rollPatronOutcome(createSequenceDice([2, 3, 5]));
  assert.deepEqual({ outcome: crazy.outcome, kind: crazy.crazy.kind, shiftDie: crazy.crazy.shiftDie }, { outcome: 'crazy', kind: 'unstable', shiftDie: 5 });
  assert.equal(CRAZY_OUTCOMES.length, 6);
});

test('each outcome settles the job its own way', () => {
  const pay = 12000;
  const s = (outcome) => patronOutcomeSettlement(outcome, pay);
  assert.deepEqual([s('honest').paidCr, s('swindled').paidCr, s('lying').paidCr, s('devious').paidCr, s('dishonest').paidCr], [12000, 6000, 12000, 12000, 0]);
  assert.equal(s('lying').trouble, 'hostile');
  assert.equal(s('devious').trouble, 'law');
  assert.equal(s('dishonest').completes, true, 'the work is done');
  const crazy = (kind, extra = {}) => s({ outcome: 'crazy', crazy: { kind, ...extra } });
  assert.equal(crazy('eccentric').paidCr, 12000);
  assert.equal(crazy('wrong-facts').extraSearch, true);
  assert.equal(crazy('unstable', { factor: 2 / 3 }).paidCr, 8000);
  assert.equal(crazy('unstable', { factor: 4 / 3 }).paidCr, 16000);
  assert.equal(crazy('not-his').paidCr, 1200);
  assert.equal(crazy('paranoid').trouble, 'legal');
  assert.equal(crazy('right').lead, true);
  assert.equal(s(undefined).paidCr, 12000, 'no outcome: honest');
  assert.equal(s('crazy').crazyKind, 'eccentric', 'a crazy job taken before 0.88.0');
  assert.throws(() => s('sly'), /unknown patron outcome/);
});

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

import { patronAdvance } from '../src/encounters/missions.js';
test('0.89.0 the advance on expenses is a tenth of the fee', () => {
  assert.equal(patronAdvance(35000), 3500);
  assert.equal(patronAdvance(8000), 800);
  assert.equal(patronAdvance(0), 0);
});

// 0.90.0 (design.md 9.6): quests as stages; spoils.
import { QUEST_STAGES, QUEST_FOES, throwQuestStage, questStageDays, rollSpoils } from '../src/encounters/missions.js';
import { RANDOM_PERSON_ENCOUNTERS_1982 } from '../src/encounters/persons-1982.js';

test('0.90.0 every staged kind has four stages, ending in the handover; foes are rows of the p.101 list', () => {
  for (const [kind, stages] of Object.entries(QUEST_STAGES)) {
    assert.equal(stages.length, 4, kind);
    assert.equal(stages.at(-1).type, 'handover');
    assert.ok(MISSION_KINDS.includes(kind));
  }
  assert.deepEqual(QUEST_STAGES.kill.map((entry) => entry.key), ['find', 'reach', 'deed', 'handover']);
  for (const code of Object.values(QUEST_FOES)) assert.ok(RANDOM_PERSON_ENCOUNTERS_1982[code]);
  assert.equal(questStageDays(createSequenceDice([4]), QUEST_STAGES.retrieval[0]), 4);
  assert.equal(questStageDays(createSequenceDice([]), QUEST_STAGES.steal[2]), 0);
  assert.deepEqual({ ...throwQuestStage(createSequenceDice([3, 4]), { skillLevel: 1 }) }, { roll: 7, skillLevel: 1, total: 8, needed: 8, success: true });
});

test('0.90.0 spoils: 5+ after a fight won, 6 otherwise; 3D x Cr2,500', () => {
  assert.equal(rollSpoils(createSequenceDice([5]), {}).found, false);
  const won = rollSpoils(createSequenceDice([5, 1, 3, 4, 5]), { afterFight: true });
  assert.deepEqual({ found: won.found, what: won.what, valueCr: won.valueCr }, { found: true, what: 'a crate of electronic parts', valueCr: 30000 });
});

test('0.90.0 steal, kill and rescue jobs are drafted for the patrons who want them', () => {
  const kinds = new Set();
  for (let round = 0; round < 200; round += 1) {
    kinds.add(draftPatronMission(createDice(), { patronType: 'Assassin', candidates: [{ id: 'x', name: 'X', distance: 1 }] }).kind);
  }
  assert.ok(kinds.has('kill'));
  const rescue = draftPatronMission(createSequenceDice([1, 1, 1, 1, 3, 3]), { patronType: 'Financier', candidates: [{ id: 'x', name: 'X', distance: 1 }] });
  assert.equal(rescue.kind, 'rescue');
  assert.match(rescue.title, /^Rescue /);
  assert.equal(rescue.deadlineDays, 14 + 7 + 21);
});

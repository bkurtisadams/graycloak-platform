import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(new URL('../public/adnd-world-clock.js', import.meta.url));
const script = new vm.Script(fs.readFileSync(scriptPath, 'utf8') + '\nADNDWorldClock', {
  filename: 'adnd-world-clock.js',
});
const Clock = script.runInThisContext();

function actor(runtime) {
  return { id: 'actor-1', documentType: 'actor', type: 'character', runtime };
}

test('worldTick uses OSRIC segment-scale integer units', () => {
  assert.equal(Clock.TICKS_PER_SEGMENT, 1);
  assert.equal(Clock.SEGMENTS_PER_ROUND, 10);
  assert.equal(Clock.TICKS_PER_ROUND, 10);
  assert.equal(Clock.TICKS_PER_TURN, 100);
  assert.equal(Clock.TICKS_PER_HOUR, 600);
  assert.equal(Clock.TICKS_PER_DAY, 14400);
});

test('world ticks reject negative, fractional, and unsafe values', () => {
  assert.equal(Clock.normalizeTick(0), 0);
  assert.equal(Clock.normalizeTick(12345), 12345);
  assert.equal(Clock.normalizeTick(-1), null);
  assert.equal(Clock.normalizeTick(1.5), null);
  assert.equal(Clock.normalizeTick(Number.MAX_SAFE_INTEGER + 1), null);
  assert.equal(Clock.normalizeTick('120'), null);
});

test('campaign worldTick is read without inventing a default for legacy campaigns', () => {
  assert.equal(Clock.campaignWorldTick({ worldTick: 240 }), 240);
  assert.equal(Clock.campaignWorldTick({ currentDate: { year: 579, month: 1, day: 1 } }), null);
  assert.equal(Clock.campaignWorldTick(null), null);
});

test('an unbound actor is not silently treated as current', () => {
  const status = Clock.getActorTimeStatus(actor({
    lastResolvedTick: null,
    availableAtTick: null,
    activityId: null,
  }), 120);

  assert.equal(status.status, Clock.ACTOR_TIME_STATUS.UNBOUND);
  assert.equal(Clock.actorNeedsTimeBinding(actor({}), 120), true);
  assert.equal(Clock.actorNeedsCatchUp(actor({}), 120), false);
  assert.equal(Clock.isActorAvailable(actor({}), 120), false);
});

test('a current actor is available to act', () => {
  const current = actor({
    lastResolvedTick: 120,
    availableAtTick: null,
    activityId: null,
  });
  const status = Clock.getActorTimeStatus(current, 120);

  assert.equal(status.status, Clock.ACTOR_TIME_STATUS.CURRENT);
  assert.equal(status.catchUpTicks, 0);
  assert.equal(status.waitTicks, 0);
  assert.equal(Clock.isActorAvailable(current, 120), true);
});

test('a behind actor reports the exact catch-up distance', () => {
  const behind = actor({
    lastResolvedTick: 100,
    availableAtTick: null,
    activityId: null,
  });
  const status = Clock.getActorTimeStatus(behind, 120);

  assert.equal(status.status, Clock.ACTOR_TIME_STATUS.BEHIND);
  assert.equal(status.catchUpTicks, 20);
  assert.equal(Clock.actorNeedsCatchUp(behind, 120), true);
  assert.equal(Clock.isActorAvailable(behind, 120), false);
});

test('an active or future-reserved actor is unavailable rather than catch-up eligible', () => {
  const active = actor({
    lastResolvedTick: 120,
    availableAtTick: 144,
    activityId: 'activity-travel-1',
  });
  const status = Clock.getActorTimeStatus(active, 120);

  assert.equal(status.status, Clock.ACTOR_TIME_STATUS.UNAVAILABLE);
  assert.equal(status.waitTicks, 24);
  assert.equal(status.catchUpTicks, 0);
  assert.equal(Clock.actorNeedsCatchUp(active, 120), false);
  assert.equal(Clock.isActorAvailable(active, 120), false);

  const reserved = actor({
    lastResolvedTick: 120,
    availableAtTick: 130,
    activityId: null,
  });
  assert.equal(
    Clock.getActorTimeStatus(reserved, 120).status,
    Clock.ACTOR_TIME_STATUS.UNAVAILABLE,
  );
});

test('an actor resolved ahead of the world clock is exposed as invalid temporal state', () => {
  const status = Clock.getActorTimeStatus(actor({
    lastResolvedTick: 121,
    availableAtTick: null,
    activityId: null,
  }), 120);

  assert.equal(status.status, Clock.ACTOR_TIME_STATUS.AHEAD);
  assert.equal(Clock.isActorAvailable(actor({ lastResolvedTick: 121 }), 120), false);
});

test('tick arithmetic is pure and rejects invalid or unsafe results', () => {
  assert.equal(Clock.addTicks(120, Clock.TICKS_PER_TURN), 220);
  assert.equal(Clock.addTicks(120, -1), null);
  assert.equal(Clock.addTicks(1.5, 1), null);
  assert.equal(Clock.addTicks(Number.MAX_SAFE_INTEGER, 1), null);
});

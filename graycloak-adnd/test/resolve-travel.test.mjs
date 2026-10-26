import assert from 'node:assert/strict';
import test from 'node:test';

import { loadCommandRuntime } from '../runtime/command-runtime.mjs';
import { createCommandService, SERVICE_ERROR } from '../runtime/command-service.mjs';
import {
  TRANSACTION_ERROR,
  applyResolveBundle,
  validateResolveBundle,
} from '../runtime/firestore-transaction.mjs';
import {
  createResolveTravelHttpHandler,
  statusForCommandResult,
} from '../runtime/http-command-endpoint.mjs';

function clone(value) {
  return value == null ? value : structuredClone(value);
}

class FakeSnapshot {
  constructor(value) {
    this._value = value === undefined ? undefined : clone(value);
    this.exists = value !== undefined;
  }
  data() { return this.exists ? clone(this._value) : undefined; }
}
class FakeRef {
  constructor(db, path) { this.db = db; this.path = path; }
  async get() { return new FakeSnapshot(this.db.store.has(this.path) ? this.db.store.get(this.path) : undefined); }
}
class FakeCollection {
  constructor(db, name) { this.db = db; this.name = name; }
  doc(id) { return new FakeRef(this.db, `${this.name}/${id}`); }
}
class FakeTransaction {
  constructor(db) { this.db = db; this.writes = []; }
  async get(ref) { return ref.get(); }
  set(ref, value) { this.writes.push({ type: 'set', path: ref.path, value: clone(value) }); }
  update(ref, patch) { this.writes.push({ type: 'update', path: ref.path, value: clone(patch) }); }
  commit() {
    for (const write of this.writes) {
      if (write.type === 'set') { this.db.store.set(write.path, clone(write.value)); continue; }
      const current = this.db.store.get(write.path);
      if (current === undefined) throw new Error(`Cannot update missing document ${write.path}`);
      this.db.store.set(write.path, Object.assign({}, clone(current), clone(write.value)));
    }
  }
}
class FakeFirestore {
  constructor(initial = {}) {
    this.store = new Map(Object.entries(initial).map(([path, value]) => [path, clone(value)]));
    this.transactions = 0;
  }
  collection(name) { return new FakeCollection(this, name); }
  async runTransaction(fn) {
    this.transactions += 1;
    const tx = new FakeTransaction(this);
    const result = await fn(tx);
    tx.commit();
    return result;
  }
  read(path) { return this.store.has(path) ? clone(this.store.get(path)) : undefined; }
}

const principal = { uid: 'user-1' };

function fixtureDb(overrides = {}) {
  return new FakeFirestore({
    'campaigns/campaign-1': { worldTick: 100, regionId: 'flanaess' },
    'characters/char-val': {
      ownerUid: 'user-1', campaignId: 'campaign-1', name: 'Val',
      currentLocation: { subHexCoord: [10, 20] },
      runtime: { lastResolvedTick: 100, availableAtTick: 100, activityId: null },
      movementRate: 120,
    },
    'regions/flanaess': { hexes: { '0-0': 'plains' } },
    'subHexes/subhex_11_20': { terrain: 'plains' },
    ...overrides,
  });
}

function service(db, overrides = {}) {
  return createCommandService({
    db,
    commandRuntime: loadCommandRuntime(),
    ownerOf: () => ({ col: 0, row: 0 }),
    routeMilesPerStep: 3,
    rulesVersion: 'osric3-rules@test',
    now: () => new Date('2026-10-26T12:00:00Z'),
    ...overrides,
  });
}

function beginIntent(runtime) {
  return runtime.Commands.createBeginTravelIntent({
    commandId: 'command-travel-1', activityId: 'activity-travel-1', campaignId: 'campaign-1',
    expectedWorldTick: 100, actorIds: ['char-val'], routeCells: [[10, 20], [11, 20]],
  }).command;
}

function resolveIntent(runtime, overrides = {}) {
  return runtime.Commands.createResolveTravelIntent({
    commandId: 'command-resolve-1', activityId: 'activity-travel-1', campaignId: 'campaign-1',
    expectedWorldTick: 100, ...overrides,
  }).command;
}

async function begunDb() {
  const runtime = loadCommandRuntime();
  const db = fixtureDb();
  const begun = await service(db).handleBeginTravel(beginIntent(runtime), { principal });
  assert.equal(begun.ok, true);
  return { runtime, db, begun };
}

test('resolve intent carries only identity and the expected clock', () => {
  const runtime = loadCommandRuntime();
  const intent = runtime.Commands.createResolveTravelIntent({
    commandId: 'c', activityId: 'a', campaignId: 'camp', expectedWorldTick: 5,
    destination: { subHexCoord: [99, 99] }, worldTick: 999,
  });
  assert.equal(intent.ok, true);
  assert.deepEqual(intent.command, {
    schemaVersion: 1, commandId: 'c', type: 'resolveTravel', campaignId: 'camp', activityId: 'a', expectedWorldTick: 5,
  });
  assert.equal(runtime.Commands.createResolveTravelIntent({ activityId: 'a', campaignId: 'camp', expectedWorldTick: 5 }).code, 'invalid-command-id');
  assert.equal(runtime.Commands.normalizeResolveTravelCommand({ type: 'beginTravel' }).code, 'invalid-command-type');
});

test('pure executor completes the Activity, moves and releases Actors, and advances the clock', () => {
  const runtime = loadCommandRuntime();
  const activity = {
    id: 'activity-travel-1', documentType: 'activity', type: 'travel', campaignId: 'campaign-1',
    actorIds: ['char-val'], startedAtTick: 100, availableAtTick: 3700, status: 'active',
    system: { origin: { subHexCoord: [10, 20] }, destination: { subHexCoord: [11, 20] } },
  };
  const actor = {
    id: 'char-val', campaignId: 'campaign-1', currentLocation: { subHexCoord: [10, 20] },
    runtime: { lastResolvedTick: 100, availableAtTick: 3700, activityId: 'activity-travel-1' },
  };
  const result = runtime.Commands.executeResolveTravelCommand(resolveIntent(runtime), {
    campaign: { id: 'campaign-1', worldTick: 100 }, activity, actors: [actor],
  });
  assert.equal(result.ok, true);
  assert.equal(result.resolvedTick, 3700);
  assert.equal(result.clockAdvanced, true);
  assert.deepEqual(result.destination, { subHexCoord: [11, 20] });
  const bundle = result.commitBundle;
  assert.equal(bundle.commandType, 'resolveTravel');
  assert.deepEqual(bundle.updateCampaign, { worldTick: 3700 });
  assert.equal(bundle.updateActivity.status, 'completed');
  assert.equal(bundle.updateActivity.completedAtTick, 3700);
  assert.deepEqual(bundle.patchActors[0].currentLocation, { subHexCoord: [11, 20] });
  assert.deepEqual(bundle.patchActors[0].runtime, { lastResolvedTick: 3700, availableAtTick: 3700, activityId: null });
  assert.equal(bundle.createEvent.type, 'travel.completed');
  assert.equal(bundle.createEvent.data.previousWorldTick, 100);
  assert.equal(validateResolveBundle(bundle).ok, true);

  // Already-due journey: clock untouched, Actors catch up to the frontier.
  const due = runtime.Commands.executeResolveTravelCommand(resolveIntent(runtime, { expectedWorldTick: 5000 }), {
    campaign: { id: 'campaign-1', worldTick: 5000 }, activity, actors: [actor],
  });
  assert.equal(due.ok, true);
  assert.equal(due.resolvedTick, 5000);
  assert.equal(due.clockAdvanced, false);
  assert.equal(due.commitBundle.updateCampaign, null);

  // Clock policy off: an early resolve is refused rather than moving the frontier.
  const early = runtime.Commands.executeResolveTravelCommand(resolveIntent(runtime), {
    campaign: { id: 'campaign-1', worldTick: 100 }, activity, actors: [actor], advanceClock: false,
  });
  assert.equal(early.ok, false);
  assert.equal(early.code, 'activity-not-active');
  assert.equal(early.reason, 'not-yet-due');
});

test('pure executor refuses mismatched, inactive, or unreserved state', () => {
  const runtime = loadCommandRuntime();
  const activity = {
    id: 'activity-travel-1', documentType: 'activity', type: 'travel', campaignId: 'campaign-1',
    actorIds: ['char-val'], availableAtTick: 3700, status: 'active',
    system: { destination: { subHexCoord: [11, 20] } },
  };
  const actor = {
    id: 'char-val', campaignId: 'campaign-1', currentLocation: { subHexCoord: [10, 20] },
    runtime: { lastResolvedTick: 100, availableAtTick: 3700, activityId: 'activity-travel-1' },
  };
  const run = (ctx) => runtime.Commands.executeResolveTravelCommand(resolveIntent(runtime), Object.assign({
    campaign: { id: 'campaign-1', worldTick: 100 }, activity, actors: [actor],
  }, ctx));
  assert.equal(run({ activity: null }).code, 'activity-not-found');
  assert.equal(run({ activity: { ...activity, status: 'completed' } }).code, 'activity-not-active');
  assert.equal(run({ activity: { ...activity, type: 'rest' } }).code, 'activity-not-travel');
  assert.equal(run({ activity: { ...activity, campaignId: 'other' } }).code, 'activity-mismatch');
  assert.equal(run({ activity: { ...activity, system: {} } }).code, 'invalid-activity-destination');
  assert.equal(run({ actors: [{ ...actor, runtime: { ...actor.runtime, activityId: null } }] }).code, 'actor-not-reserved');
  assert.equal(run({ actors: [] }).code, 'actor-not-found');
  assert.equal(run({ campaign: { id: 'campaign-1', worldTick: 101 } }).code, 'stale-world-tick');
});

test('service resolves a begun journey end to end: Actor moved, reservation cleared, clock advanced', async () => {
  const { runtime, db, begun } = await begunDb();
  const result = await service(db).handleResolveTravel(resolveIntent(runtime), { principal });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.status, 'committed');
  assert.equal(result.resolvedTick, begun.availableAtTick);
  assert.equal(result.worldTick, begun.availableAtTick);
  assert.equal(result.clockAdvanced, true);
  assert.deepEqual(result.destination, { subHexCoord: [11, 20] });
  assert.equal(db.transactions, 2);

  assert.equal(db.read('campaigns/campaign-1').worldTick, begun.availableAtTick);
  const activity = db.read('activities/activity-travel-1');
  assert.equal(activity.status, 'completed');
  assert.equal(activity.completedAtTick, begun.availableAtTick);
  const actor = db.read('characters/char-val');
  assert.deepEqual(actor.currentLocation, { subHexCoord: [11, 20] });
  assert.deepEqual(actor.runtime, { lastResolvedTick: begun.availableAtTick, availableAtTick: begun.availableAtTick, activityId: null });
  assert.equal(actor.movementRate, 120, 'non-authority fields untouched');
  const event = db.read('events/command-resolve-1');
  assert.equal(event.type, 'travel.completed');
  assert.equal(event.data.requestedByUid, 'user-1');
  assert.equal(event.data.clockAdvanced, true);
});

test('service replays a resolved command idempotently and refuses a second resolve', async () => {
  const { runtime, db } = await begunDb();
  const svc = service(db);
  const first = await svc.handleResolveTravel(resolveIntent(runtime), { principal });
  assert.equal(first.ok, true);
  const replay = await svc.handleResolveTravel(resolveIntent(runtime), { principal });
  assert.equal(replay.ok, true);
  assert.equal(replay.idempotentReplay, true);
  assert.equal(db.transactions, 2, 'replay commits nothing');

  const again = await svc.handleResolveTravel(resolveIntent(runtime, {
    commandId: 'command-resolve-2', expectedWorldTick: first.worldTick,
  }), { principal });
  assert.equal(again.ok, false);
  assert.equal(again.code, 'activity-not-active');
  assert.equal(again.stage, 'execute');
});

test('service authorizes every reserved Actor and rejects stale clocks and missing Activities', async () => {
  const { runtime, db } = await begunDb();
  const forbidden = await service(db).handleResolveTravel(resolveIntent(runtime), { principal: { uid: 'someone-else' } });
  assert.equal(forbidden.code, SERVICE_ERROR.ACTOR_FORBIDDEN);
  assert.equal(statusForCommandResult(forbidden), 403);

  const stale = await service(db).handleResolveTravel(resolveIntent(runtime, { expectedWorldTick: 99 }), { principal });
  assert.equal(stale.code, 'stale-world-tick');
  assert.equal(statusForCommandResult(stale), 409);

  const missing = await service(db).handleResolveTravel(resolveIntent(runtime, { activityId: 'nope' }), { principal });
  assert.equal(missing.code, SERVICE_ERROR.ACTIVITY_NOT_FOUND);
  assert.equal(statusForCommandResult(missing), 404);
  assert.equal(db.transactions, 1, 'only the begin committed');
});

test('transaction adapter refuses when the Activity or Actor changed underneath the bundle', async () => {
  const { runtime, db } = await begunDb();
  const activity = Object.assign({}, db.read('activities/activity-travel-1'), { id: 'activity-travel-1' });
  const actor = Object.assign({}, db.read('characters/char-val'), { id: 'char-val' });
  const execution = runtime.Commands.executeResolveTravelCommand(resolveIntent(runtime), {
    campaign: { id: 'campaign-1', worldTick: 100 }, activity, actors: [actor],
  });
  assert.equal(execution.ok, true);

  const completed = new FakeFirestore(Object.fromEntries(db.store));
  completed.store.get('activities/activity-travel-1').status = 'completed';
  const r1 = await applyResolveBundle(completed, execution.commitBundle);
  assert.equal(r1.code, TRANSACTION_ERROR.ACTIVITY_PRECONDITION_FAILED);
  assert.equal(r1.field, 'status');

  const moved = new FakeFirestore(Object.fromEntries(db.store));
  moved.store.get('characters/char-val').currentLocation = { subHexCoord: [50, 50] };
  const r2 = await applyResolveBundle(moved, execution.commitBundle);
  assert.equal(r2.code, TRANSACTION_ERROR.ACTOR_PRECONDITION_FAILED);
  assert.equal(r2.field, 'currentLocation');

  assert.equal(validateResolveBundle({ ...execution.commitBundle, commandType: 'beginTravel' }).code, TRANSACTION_ERROR.INVALID_BUNDLE);
});

test('HTTP transport forwards the resolve intent and exposes the public result fields', async () => {
  const seen = {};
  const handler = createResolveTravelHttpHandler({
    commandService: {
      async handleResolveTravel(intent, context) {
        seen.intent = intent; seen.context = context;
        return { ok: true, status: 'committed', commandId: 'r1', activityId: 'a1', actorIds: ['x'],
          destination: { subHexCoord: [1, 2] }, resolvedTick: 500, worldTick: 500, clockAdvanced: true,
          eventId: 'r1', secret: 'no' };
      },
    },
    verifyIdToken: async () => ({ uid: 'user-1' }),
  });
  const res = {
    statusCode: 200, headers: {}, body: '',
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = String(value); },
    end(text = '') { this.body = String(text); },
  };
  await handler({
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer t' },
    body: { type: 'resolveTravel', commandId: 'r1', campaignId: 'c', activityId: 'a1', expectedWorldTick: 100 },
  }, res);
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.deepEqual(body, { ok: true, status: 'committed', commandId: 'r1', activityId: 'a1', actorIds: ['x'],
    eventId: 'r1', destination: { subHexCoord: [1, 2] }, resolvedTick: 500, worldTick: 500, clockAdvanced: true });
  assert.equal(seen.intent.type, 'resolveTravel');
  assert.equal(seen.context.principal.uid, 'user-1');
});

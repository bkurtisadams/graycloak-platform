import assert from 'node:assert/strict';
import test from 'node:test';

import { loadCommandRuntime } from '../runtime/command-runtime.mjs';
import { createCommandService, SERVICE_ERROR } from '../runtime/command-service.mjs';
import { TRANSACTION_ERROR, applyRestBundle, validateRestBundle } from '../runtime/firestore-transaction.mjs';
import { createRestHttpHandler, statusForCommandResult } from '../runtime/http-command-endpoint.mjs';

function clone(value) { return value == null ? value : structuredClone(value); }
class FakeSnapshot {
  constructor(value) { this._value = value === undefined ? undefined : clone(value); this.exists = value !== undefined; }
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
    for (const w of this.writes) {
      if (w.type === 'set') { this.db.store.set(w.path, clone(w.value)); continue; }
      const cur = this.db.store.get(w.path);
      if (cur === undefined) throw new Error(`Cannot update missing document ${w.path}`);
      this.db.store.set(w.path, Object.assign({}, clone(cur), clone(w.value)));
    }
  }
}
class FakeFirestore {
  constructor(initial = {}) { this.store = new Map(Object.entries(initial).map(([p, v]) => [p, clone(v)])); this.transactions = 0; }
  collection(name) { return new FakeCollection(this, name); }
  async runTransaction(fn) { this.transactions += 1; const tx = new FakeTransaction(this); const r = await fn(tx); tx.commit(); return r; }
  read(path) { return this.store.has(path) ? clone(this.store.get(path)) : undefined; }
}

const principal = { uid: 'user-1' };
const DAY = 14400;

function fixtureDb(overrides = {}) {
  return new FakeFirestore({
    'campaigns/campaign-1': { worldTick: 1000 },
    'characters/char-val': {
      ownerUid: 'user-1', campaignId: 'campaign-1', name: 'Val',
      currentLocation: { subHexCoord: [65, 26] },
      runtime: { lastResolvedTick: 1000, availableAtTick: 1000, activityId: null },
      hitPoints: { current: 3, maximum: 9 }, movementRate: 120,
    },
    'characters/char-kris': {
      ownerUid: 'user-1', campaignId: 'campaign-1', name: 'Kris',
      currentLocation: { subHexCoord: [65, 26] },
      runtime: { lastResolvedTick: 400, availableAtTick: 400, activityId: null },
    },
    ...overrides,
  });
}
function service(db, overrides = {}) {
  return createCommandService({
    db, commandRuntime: loadCommandRuntime(), ownerOf: () => ({ col: 0, row: 0 }), routeMilesPerStep: 3,
    rulesVersion: 'osric3-rules@test', now: () => new Date('2026-10-26T12:00:00Z'), ...overrides,
  });
}
function intent(runtime, overrides = {}) {
  return runtime.Commands.createRestIntent({
    commandId: 'command-rest-1', activityId: 'activity-rest-1', campaignId: 'campaign-1',
    expectedWorldTick: 1000, actorIds: ['char-val', 'char-kris'], days: 4, ...overrides,
  }).command;
}

test('rest intent validates days and drops client claims', () => {
  const runtime = loadCommandRuntime();
  const ok = runtime.Commands.createRestIntent({ commandId: 'c', activityId: 'a', campaignId: 'camp',
    expectedWorldTick: 0, actorIds: ['x'], days: '3', healPerDay: 99, hitPoints: { current: 99 } });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.command, { schemaVersion: 1, commandId: 'c', type: 'rest', campaignId: 'camp',
    activityId: 'a', expectedWorldTick: 0, actorIds: ['x'], days: 3 });
  for (const days of [0, 31, 1.5, 'lots', undefined]) {
    assert.equal(runtime.Commands.createRestIntent({ commandId: 'c', activityId: 'a', campaignId: 'camp',
      expectedWorldTick: 0, actorIds: ['x'], days }).code, 'invalid-rest-days', `days=${days}`);
  }
});

test('pure executor advances the clock, rebinds Actors, heals 1 hp/day capped at maximum', () => {
  const runtime = loadCommandRuntime();
  const db = fixtureDb();
  const actors = ['char-val', 'char-kris'].map(id => Object.assign({ id }, db.read(`characters/${id}`)));
  const result = runtime.Commands.executeRestCommand(intent(runtime), { campaign: { id: 'campaign-1', worldTick: 1000 }, actors });
  assert.equal(result.ok, true);
  assert.equal(result.resolvedTick, 1000 + 4 * DAY);
  const b = result.commitBundle;
  assert.equal(b.commandType, 'rest');
  assert.deepEqual(b.updateCampaign, { worldTick: 1000 + 4 * DAY });
  assert.equal(b.createActivity.type, 'rest');
  assert.equal(b.createActivity.status, 'completed');
  assert.deepEqual(b.patchActors[0].hitPoints, { current: 7, maximum: 9 });
  assert.equal(b.patchActors[1].hitPoints, undefined, 'no hitPoints field → untouched');
  assert.deepEqual(b.patchActors[1].runtime, { lastResolvedTick: 1000 + 4 * DAY, availableAtTick: 1000 + 4 * DAY, activityId: null });
  assert.deepEqual(result.restored, [{ actorId: 'char-val', hitPoints: 4 }, { actorId: 'char-kris', hitPoints: null }]);
  assert.equal(validateRestBundle(b).ok, true);

  const capped = runtime.Commands.executeRestCommand(intent(runtime, { days: 30 }), { campaign: { id: 'campaign-1', worldTick: 1000 }, actors });
  assert.deepEqual(capped.commitBundle.patchActors[0].hitPoints, { current: 9, maximum: 9 });
  const custom = runtime.Commands.executeRestCommand(intent(runtime, { days: 2 }), { campaign: { id: 'campaign-1', worldTick: 1000 }, actors, healPerDay: 3 });
  assert.deepEqual(custom.commitBundle.patchActors[0].hitPoints, { current: 9, maximum: 9 });
});

test('pure executor refuses reserved Actors and stale clocks', () => {
  const runtime = loadCommandRuntime();
  const db = fixtureDb();
  const actors = ['char-val', 'char-kris'].map(id => Object.assign({ id }, db.read(`characters/${id}`)));
  actors[0].runtime.activityId = 'activity-travel-9';
  const busy = runtime.Commands.executeRestCommand(intent(runtime), { campaign: { id: 'campaign-1', worldTick: 1000 }, actors });
  assert.equal(busy.code, 'actor-not-available');
  assert.equal(busy.actorId, 'char-val');
  assert.equal(busy.actorStatus, 'unavailable');
  const stale = runtime.Commands.executeRestCommand(intent(runtime), { campaign: { id: 'campaign-1', worldTick: 1001 }, actors });
  assert.equal(stale.code, 'stale-world-tick');
});

test('service commits Rest end to end and replays idempotently', async () => {
  const runtime = loadCommandRuntime();
  const db = fixtureDb();
  const svc = service(db);
  const result = await svc.handleRest(intent(runtime), { principal });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.worldTick, 1000 + 4 * DAY);
  assert.equal(result.days, 4);
  assert.equal(db.transactions, 1);
  assert.equal(db.read('campaigns/campaign-1').worldTick, 1000 + 4 * DAY);
  assert.deepEqual(db.read('characters/char-val').hitPoints, { current: 7, maximum: 9 });
  assert.equal(db.read('characters/char-val').movementRate, 120);
  assert.equal(db.read('characters/char-kris').runtime.lastResolvedTick, 1000 + 4 * DAY, 'behind Actor caught up');
  assert.equal(db.read('activities/activity-rest-1').status, 'completed');
  assert.equal(db.read('events/command-rest-1').type, 'rest.completed');

  const replay = await svc.handleRest(intent(runtime), { principal });
  assert.equal(replay.idempotentReplay, true);
  assert.equal(db.transactions, 1);
});

test('service authorizes each Actor, honours restHealPerDay, and surfaces precondition failures', async () => {
  const runtime = loadCommandRuntime();
  const forbidden = await service(fixtureDb()).handleRest(intent(runtime), { principal: { uid: 'other' } });
  assert.equal(forbidden.code, SERVICE_ERROR.ACTOR_FORBIDDEN);
  assert.equal(statusForCommandResult(forbidden), 403);

  const db = fixtureDb();
  const r = await service(db, { restHealPerDay: 2 }).handleRest(intent(runtime, { days: 2 }), { principal });
  assert.equal(r.ok, true);
  assert.deepEqual(db.read('characters/char-val').hitPoints, { current: 7, maximum: 9 });

  const moved = fixtureDb();
  const actors = ['char-val', 'char-kris'].map(id => Object.assign({ id }, moved.read(`characters/${id}`)));
  const exec = runtime.Commands.executeRestCommand(intent(runtime), { campaign: { id: 'campaign-1', worldTick: 1000 }, actors });
  moved.store.get('characters/char-kris').runtime.activityId = 'activity-travel-9';
  const refused = await applyRestBundle(moved, exec.commitBundle);
  assert.equal(refused.code, TRANSACTION_ERROR.ACTOR_PRECONDITION_FAILED);
  assert.equal(refused.actorId, 'char-kris');
  assert.equal(statusForCommandResult(refused), 409);
});

test('HTTP transport exposes rest public fields', async () => {
  const handler = createRestHttpHandler({
    commandService: { async handleRest() { return { ok: true, status: 'committed', commandId: 'r', activityId: 'a',
      actorIds: ['x'], days: 2, resolvedTick: 100, worldTick: 100, clockAdvanced: true,
      restored: [{ actorId: 'x', hitPoints: 2 }], eventId: 'r', internal: 'hidden' }; } },
    verifyIdToken: async () => ({ uid: 'user-1' }),
  });
  const res = { statusCode: 200, headers: {}, body: '', setHeader(n, v) { this.headers[n] = v; }, end(t = '') { this.body = String(t); } };
  await handler({ method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer t' },
    body: { type: 'rest', commandId: 'r', campaignId: 'c', activityId: 'a', expectedWorldTick: 0, actorIds: ['x'], days: 2 } }, res);
  const body = JSON.parse(res.body);
  assert.equal(body.internal, undefined);
  assert.equal(body.days, 2);
  assert.deepEqual(body.restored, [{ actorId: 'x', hitPoints: 2 }]);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import { loadCommandRuntime } from '../runtime/command-runtime.mjs';
import {
  SERVICE_ERROR,
  createCommandService,
} from '../runtime/command-service.mjs';

function clone(value) {
  return value == null ? value : structuredClone(value);
}

class FakeSnapshot {
  constructor(value) {
    this._value = value === undefined ? undefined : clone(value);
    this.exists = value !== undefined;
  }
  data() {
    return this.exists ? clone(this._value) : undefined;
  }
}

class FakeRef {
  constructor(db, path) {
    this.db = db;
    this.path = path;
  }
  async get() {
    this.db.reads.push(this.path);
    return new FakeSnapshot(this.db.store.has(this.path) ? this.db.store.get(this.path) : undefined);
  }
}

class FakeCollection {
  constructor(db, name) {
    this.db = db;
    this.name = name;
  }
  doc(id) {
    return new FakeRef(this.db, `${this.name}/${id}`);
  }
}

class FakeTransaction {
  constructor(db) {
    this.db = db;
    this.writes = [];
  }
  async get(ref) {
    this.db.transactionReads.push(ref.path);
    return new FakeSnapshot(this.db.store.has(ref.path) ? this.db.store.get(ref.path) : undefined);
  }
  set(ref, value) {
    this.writes.push({ type: 'set', path: ref.path, value: clone(value) });
  }
  update(ref, patch) {
    this.writes.push({ type: 'update', path: ref.path, value: clone(patch) });
  }
  commit() {
    for (const write of this.writes) {
      if (write.type === 'set') {
        this.db.store.set(write.path, clone(write.value));
      } else {
        const current = this.db.store.get(write.path);
        if (current === undefined) throw new Error(`Cannot update ${write.path}`);
        this.db.store.set(write.path, Object.assign({}, clone(current), clone(write.value)));
      }
    }
  }
}

class FakeFirestore {
  constructor(initial = {}) {
    this.store = new Map(Object.entries(initial).map(([path, value]) => [path, clone(value)]));
    this.transactions = 0;
    this.reads = [];
    this.transactionReads = [];
  }
  collection(name) {
    return new FakeCollection(this, name);
  }
  async runTransaction(fn) {
    this.transactions += 1;
    const tx = new FakeTransaction(this);
    const result = await fn(tx);
    tx.commit();
    return result;
  }
  read(path) {
    return this.store.has(path) ? clone(this.store.get(path)) : undefined;
  }
}

function baseActor(overrides = {}) {
  return {
    ownerUid: 'user-1',
    campaignId: 'campaign-1',
    name: 'Val',
    currentLocation: { regionalHexId: 'D4-86', subHexCoord: [10, 20] },
    runtime: {
      lastResolvedTick: 100,
      availableAtTick: null,
      activityId: null,
    },
    ...overrides,
  };
}

function fixtureDb(overrides = {}) {
  const initial = {
    'campaigns/campaign-1': { worldTick: 100, regionId: 'flanaess' },
    'characters/char-val': baseActor(),
    'regions/flanaess': { hexes: { '0-0': 'plains' } },
    'subHexes/subhex_11_20': { terrain: 'mountains' },
    ...overrides,
  };
  return new FakeFirestore(initial);
}

function intent(runtime, overrides = {}) {
  return runtime.Commands.createBeginTravelIntent({
    commandId: 'command-travel-1',
    activityId: 'activity-travel-1',
    campaignId: 'campaign-1',
    expectedWorldTick: 100,
    actorIds: ['char-val'],
    routeCells: [[10, 20], [11, 20]],
    ...overrides,
  }).command;
}

function service(db, overrides = {}) {
  const runtime = loadCommandRuntime();
  return createCommandService({
    db,
    commandRuntime: runtime,
    ownerOf: () => ({ col: 0, row: 0 }),
    routeMilesPerStep: 3,
    movementProfileResolver: () => ({ movementRate: 120 }),
    rulesVersion: 'osric3-rules@test',
    now: () => new Date('2026-08-30T12:00:00Z'),
    ...overrides,
  });
}

const principal = { uid: 'user-1' };

test('trusted command service loads authoritative context and commits Begin Travel', async () => {
  const runtime = loadCommandRuntime();
  const db = fixtureDb();
  const result = await service(db).handleBeginTravel(intent(runtime), { principal });

  assert.equal(result.ok, true);
  assert.equal(result.status, 'committed');
  assert.equal(result.durationTicks, runtime.Clock.TICKS_PER_DAY / 4);
  assert.equal(result.availableAtTick, 100 + runtime.Clock.TICKS_PER_DAY / 4);
  assert.equal(db.transactions, 1);

  const activity = db.read('activities/activity-travel-1');
  assert.equal(activity.type, 'travel');
  assert.equal(activity.system.outdoorTravel.partyMovementRate, 120);
  assert.equal(activity.system.outdoorTravel.segments[0].mapTerrain, 'mountains');

  const actor = db.read('characters/char-val');
  assert.equal(actor.runtime.activityId, 'activity-travel-1');
  assert.equal(actor.runtime.availableAtTick, result.availableAtTick);

  const event = db.read('events/command-travel-1');
  assert.equal(event.type, 'travel.started');
  assert.equal(event.data.requestedByUid, 'user-1');
  assert.equal(event.data.commandServiceVersion, 1);
  assert.equal(event.rulesVersion, 'osric3-rules@test');
});

test('client outcome claims remain irrelevant through the service boundary', async () => {
  const runtime = loadCommandRuntime();
  const db = fixtureDb();
  const raw = intent(runtime);
  raw.durationTicks = 1;
  raw.movementProfiles = { 'char-val': { movementRate: 99999 } };
  raw.terrain = 'level';

  const result = await service(db).handleBeginTravel(raw, { principal });
  assert.equal(result.ok, true);
  const activity = db.read('activities/activity-travel-1');
  assert.equal(activity.system.outdoorTravel.partyMovementRate, 120);
  assert.equal(activity.system.outdoorTravel.segments[0].mapTerrain, 'mountains');
  assert.equal(activity.system.durationTicks, runtime.Clock.TICKS_PER_DAY / 4);
});

test('service requires an authenticated principal', async () => {
  const runtime = loadCommandRuntime();
  const db = fixtureDb();
  const result = await service(db).handleBeginTravel(intent(runtime));
  assert.equal(result.ok, false);
  assert.equal(result.code, SERVICE_ERROR.UNAUTHENTICATED);
  assert.equal(db.transactions, 0);
});

test('default authorization only permits the Actor owner', async () => {
  const runtime = loadCommandRuntime();
  const db = fixtureDb();
  const result = await service(db).handleBeginTravel(intent(runtime), {
    principal: { uid: 'other-user' },
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, SERVICE_ERROR.ACTOR_FORBIDDEN);
  assert.equal(result.actorId, 'char-val');
  assert.equal(db.transactions, 0);
});

test('custom authorization hook can implement later party consent or GM authority', async () => {
  const runtime = loadCommandRuntime();
  const db = fixtureDb();
  const result = await service(db, {
    authorizeActor: (_actor, p) => p.uid === 'gm-1',
  }).handleBeginTravel(intent(runtime), {
    principal: { uid: 'gm-1' },
  });
  assert.equal(result.ok, true);
  assert.equal(result.status, 'committed');
});

test('retry of an already committed command is idempotent end to end', async () => {
  const runtime = loadCommandRuntime();
  const db = fixtureDb();
  const svc = service(db);
  const command = intent(runtime);

  const first = await svc.handleBeginTravel(command, { principal });
  assert.equal(first.ok, true);
  assert.equal(first.status, 'committed');
  assert.equal(db.transactions, 1);

  const second = await svc.handleBeginTravel(command, { principal });
  assert.equal(second.ok, true);
  assert.equal(second.status, 'already-committed');
  assert.equal(second.idempotentReplay, true);
  // The service recognizes the historical GameEvent before trying to reserve
  // the now-unavailable Actor again, so no second transaction is required.
  assert.equal(db.transactions, 1);
});

test('existing conflicting command event is rejected before execution', async () => {
  const runtime = loadCommandRuntime();
  const db = fixtureDb({
    'events/command-travel-1': {
      commandId: 'command-travel-1',
      campaignId: 'campaign-1',
      targetIds: ['char-val'],
      data: { activityId: 'some-other-activity' },
    },
  });
  const result = await service(db).handleBeginTravel(intent(runtime), { principal });
  assert.equal(result.ok, false);
  assert.equal(result.code, SERVICE_ERROR.IDEMPOTENCY_CONFLICT);
  assert.equal(db.transactions, 0);
});

test('stale client worldTick is rejected after fresh campaign read', async () => {
  const runtime = loadCommandRuntime();
  const db = fixtureDb({
    'campaigns/campaign-1': { worldTick: 101, regionId: 'flanaess' },
  });
  const result = await service(db).handleBeginTravel(intent(runtime), { principal });
  assert.equal(result.ok, false);
  assert.equal(result.stage, 'execute');
  assert.equal(result.code, runtime.Commands.COMMAND_ERROR.STALE_WORLD_TICK);
  assert.equal(db.transactions, 0);
});

test('service loads only route subhex documents rather than the whole subhex collection', async () => {
  const runtime = loadCommandRuntime();
  const db = fixtureDb();
  const result = await service(db).handleBeginTravel(intent(runtime), { principal });
  assert.equal(result.ok, true);
  assert.equal(db.reads.includes('subHexes/subhex_10_20'), true);
  assert.equal(db.reads.includes('subHexes/subhex_11_20'), true);
  assert.equal(db.reads.some(path => path === 'subHexes'), false);
});

test('Actor-stored movement remains authoritative when no resolver is configured', async () => {
  const runtime = loadCommandRuntime();
  const db = fixtureDb({
    'characters/char-val': baseActor({ movementRate: 90 }),
  });
  const result = await service(db, {
    movementProfileResolver: null,
  }).handleBeginTravel(intent(runtime), { principal });
  assert.equal(result.ok, true);
  assert.equal(db.read('activities/activity-travel-1').system.outdoorTravel.partyMovementRate, 90);
});

test('movement resolver failures are surfaced without committing state', async () => {
  const runtime = loadCommandRuntime();
  const db = fixtureDb();
  const result = await service(db, {
    movementProfileResolver: () => { throw new Error('movement policy unavailable'); },
  }).handleBeginTravel(intent(runtime), { principal });
  assert.equal(result.ok, false);
  assert.equal(result.code, SERVICE_ERROR.MOVEMENT_RESOLUTION_FAILED);
  assert.match(result.message, /movement policy unavailable/);
  assert.equal(db.transactions, 0);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_COLLECTIONS,
  TRANSACTION_ERROR,
  TRANSACTION_STATUS,
  applyCommitBundle,
  validateCommitBundle,
} from '../runtime/firestore-transaction.mjs';

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
  constructor(path) {
    this.path = path;
  }
}

class FakeCollection {
  constructor(name) {
    this.name = name;
  }
  doc(id) {
    return new FakeRef(`${this.name}/${id}`);
  }
}

class FakeTransaction {
  constructor(store) {
    this.store = store;
    this.writes = [];
  }
  async get(ref) {
    return new FakeSnapshot(this.store.has(ref.path) ? this.store.get(ref.path) : undefined);
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
        this.store.set(write.path, clone(write.value));
        continue;
      }
      const current = this.store.get(write.path);
      if (current === undefined) throw new Error(`Cannot update missing document ${write.path}`);
      this.store.set(write.path, Object.assign({}, clone(current), clone(write.value)));
    }
  }
}

class FakeFirestore {
  constructor(initial = {}) {
    this.store = new Map(Object.entries(initial).map(([path, value]) => [path, clone(value)]));
    this.transactions = 0;
  }
  collection(name) {
    return new FakeCollection(name);
  }
  async runTransaction(fn) {
    this.transactions += 1;
    const tx = new FakeTransaction(this.store);
    const result = await fn(tx);
    tx.commit();
    return result;
  }
  read(path) {
    return this.store.has(path) ? clone(this.store.get(path)) : undefined;
  }
}

function actorRuntime(activityId = null) {
  return {
    lastResolvedTick: 1200,
    availableAtTick: 1200,
    activityId,
  };
}

function fixtureBundle() {
  return {
    version: 1,
    commandId: 'command-travel-1',
    commandType: 'beginTravel',
    idempotencyKey: 'command-travel-1',
    campaignId: 'campaign-1',
    expectedWorldTick: 1200,
    preconditions: {
      campaign: {
        campaignId: 'campaign-1',
        worldTick: 1200,
      },
      actors: [
        {
          actorId: 'char-val',
          campaignId: 'campaign-1',
          currentLocation: { subHexCoord: [10, 20] },
          runtime: actorRuntime(),
        },
        {
          actorId: 'char-kris',
          campaignId: 'campaign-1',
          currentLocation: { subHexCoord: [10, 20] },
          runtime: actorRuntime(),
        },
      ],
      commandEventMustNotExist: 'command-travel-1',
      activityMustNotExist: 'activity-travel-1',
    },
    createActivity: {
      id: 'activity-travel-1',
      documentType: 'activity',
      type: 'travel',
      schemaVersion: 1,
      campaignId: 'campaign-1',
      name: 'Travel',
      createdAt: null,
      updatedAt: null,
      actorIds: ['char-val', 'char-kris'],
      startedAtTick: 1200,
      availableAtTick: 4200,
      status: 'active',
      system: {
        durationTicks: 3000,
        origin: { subHexCoord: [10, 20] },
        destination: { subHexCoord: [11, 20] },
      },
    },
    patchActors: [
      {
        actorId: 'char-val',
        runtime: {
          lastResolvedTick: 1200,
          availableAtTick: 4200,
          activityId: 'activity-travel-1',
        },
      },
      {
        actorId: 'char-kris',
        runtime: {
          lastResolvedTick: 1200,
          availableAtTick: 4200,
          activityId: 'activity-travel-1',
        },
      },
    ],
    createEvent: {
      id: 'command-travel-1',
      documentType: 'event',
      type: 'travel.started',
      schemaVersion: 1,
      campaignId: 'campaign-1',
      name: '',
      createdAt: null,
      updatedAt: null,
      actorId: null,
      targetIds: ['char-val', 'char-kris'],
      worldTick: 1200,
      rulesVersion: 'test-rules',
      commandId: 'command-travel-1',
      data: {
        activityId: 'activity-travel-1',
        actorIds: ['char-val', 'char-kris'],
      },
    },
  };
}

function initialStore() {
  return {
    'campaigns/campaign-1': {
      id: 'campaign-1',
      worldTick: 1200,
    },
    'characters/char-val': {
      id: 'char-val',
      campaignId: 'campaign-1',
      currentLocation: { subHexCoord: [10, 20] },
      runtime: actorRuntime(),
      hp: 33,
    },
    'characters/char-kris': {
      id: 'char-kris',
      campaignId: 'campaign-1',
      currentLocation: { subHexCoord: [10, 20] },
      runtime: actorRuntime(),
      hp: 41,
    },
  };
}

test('default physical collections keep PCs in characters and add activities/events', () => {
  assert.equal(DEFAULT_COLLECTIONS.actors, 'characters');
  assert.equal(DEFAULT_COLLECTIONS.activities, 'activities');
  assert.equal(DEFAULT_COLLECTIONS.events, 'events');
});

test('commit bundle validation rejects mismatched event/activity identity', () => {
  const bundle = fixtureBundle();
  bundle.createEvent.data.activityId = 'different-activity';
  const result = validateCommitBundle(bundle);
  assert.equal(result.ok, false);
  assert.equal(result.code, TRANSACTION_ERROR.INVALID_BUNDLE);
});

test('transaction atomically creates Activity, reserves Actors, and writes GameEvent', async () => {
  const db = new FakeFirestore(initialStore());
  const bundle = fixtureBundle();
  const result = await applyCommitBundle(db, bundle);

  assert.equal(result.ok, true);
  assert.equal(result.status, TRANSACTION_STATUS.COMMITTED);
  assert.equal(result.idempotentReplay, false);

  const activity = db.read('activities/activity-travel-1');
  const event = db.read('events/command-travel-1');
  const val = db.read('characters/char-val');
  const kris = db.read('characters/char-kris');

  assert.equal(activity.id, 'activity-travel-1');
  assert.equal(event.commandId, 'command-travel-1');
  assert.equal(val.runtime.activityId, 'activity-travel-1');
  assert.equal(kris.runtime.activityId, 'activity-travel-1');
  assert.equal(val.hp, 33, 'Actor update must preserve unrelated fields');
});

test('replaying the same recorded command is idempotent even after Actor state later changes', async () => {
  const db = new FakeFirestore(initialStore());
  const bundle = fixtureBundle();
  const first = await applyCommitBundle(db, bundle);
  assert.equal(first.status, TRANSACTION_STATUS.COMMITTED);

  // Simulate later travel completion/history. The durable GameEvent is the
  // idempotency marker; a retry must not attempt to reserve Actors again.
  const val = db.read('characters/char-val');
  val.currentLocation = { subHexCoord: [11, 20] };
  val.runtime = { lastResolvedTick: 4200, availableAtTick: 4200, activityId: null };
  db.store.set('characters/char-val', val);

  const second = await applyCommitBundle(db, bundle);
  assert.equal(second.ok, true);
  assert.equal(second.status, TRANSACTION_STATUS.ALREADY_COMMITTED);
  assert.equal(second.idempotentReplay, true);
});

test('existing event with conflicting identity is rejected', async () => {
  const store = initialStore();
  store['events/command-travel-1'] = {
    commandId: 'command-travel-1',
    campaignId: 'campaign-1',
    data: { activityId: 'activity-something-else' },
  };
  const db = new FakeFirestore(store);
  const result = await applyCommitBundle(db, fixtureBundle());
  assert.equal(result.ok, false);
  assert.equal(result.code, TRANSACTION_ERROR.IDEMPOTENCY_CONFLICT);
});

test('existing Activity without command event is rejected', async () => {
  const store = initialStore();
  store['activities/activity-travel-1'] = fixtureBundle().createActivity;
  const db = new FakeFirestore(store);
  const result = await applyCommitBundle(db, fixtureBundle());
  assert.equal(result.ok, false);
  assert.equal(result.code, TRANSACTION_ERROR.ACTIVITY_ALREADY_EXISTS);
  assert.equal(db.read('events/command-travel-1'), undefined);
});

test('stale campaign worldTick prevents every write', async () => {
  const store = initialStore();
  store['campaigns/campaign-1'].worldTick = 1201;
  const db = new FakeFirestore(store);
  const result = await applyCommitBundle(db, fixtureBundle());

  assert.equal(result.ok, false);
  assert.equal(result.code, TRANSACTION_ERROR.STALE_WORLD_TICK);
  assert.equal(db.read('activities/activity-travel-1'), undefined);
  assert.equal(db.read('events/command-travel-1'), undefined);
  assert.equal(db.read('characters/char-val').runtime.activityId, null);
});

test('changed Actor location prevents every write', async () => {
  const store = initialStore();
  store['characters/char-kris'].currentLocation = { subHexCoord: [9, 20] };
  const db = new FakeFirestore(store);
  const result = await applyCommitBundle(db, fixtureBundle());

  assert.equal(result.ok, false);
  assert.equal(result.code, TRANSACTION_ERROR.ACTOR_PRECONDITION_FAILED);
  assert.equal(result.actorId, 'char-kris');
  assert.equal(result.field, 'currentLocation');
  assert.equal(db.read('activities/activity-travel-1'), undefined);
});

test('changed Actor runtime reservation prevents every write', async () => {
  const store = initialStore();
  store['characters/char-val'].runtime.activityId = 'activity-other';
  const db = new FakeFirestore(store);
  const result = await applyCommitBundle(db, fixtureBundle());

  assert.equal(result.ok, false);
  assert.equal(result.code, TRANSACTION_ERROR.ACTOR_PRECONDITION_FAILED);
  assert.equal(result.actorId, 'char-val');
  assert.equal(result.field, 'runtime');
  assert.equal(db.read('events/command-travel-1'), undefined);
});

test('missing Actor prevents every write', async () => {
  const store = initialStore();
  delete store['characters/char-kris'];
  const db = new FakeFirestore(store);
  const result = await applyCommitBundle(db, fixtureBundle());

  assert.equal(result.ok, false);
  assert.equal(result.code, TRANSACTION_ERROR.ACTOR_NOT_FOUND);
  assert.equal(result.actorId, 'char-kris');
  assert.equal(db.read('activities/activity-travel-1'), undefined);
});

test('collection names are configurable without changing semantic bundle shape', async () => {
  const store = {
    'c/campaign-1': initialStore()['campaigns/campaign-1'],
    'a/char-val': initialStore()['characters/char-val'],
    'a/char-kris': initialStore()['characters/char-kris'],
  };
  const db = new FakeFirestore(store);
  const result = await applyCommitBundle(db, fixtureBundle(), {
    collections: { campaigns: 'c', actors: 'a', activities: 'x', events: 'e' },
  });

  assert.equal(result.ok, true);
  assert.equal(db.read('x/activity-travel-1').type, 'travel');
  assert.equal(db.read('e/command-travel-1').type, 'travel.started');
});

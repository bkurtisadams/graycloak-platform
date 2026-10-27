import assert from 'node:assert/strict';
import test from 'node:test';

import { loadCommandRuntime } from '../runtime/command-runtime.mjs';
import { createCommandService, SERVICE_ERROR } from '../runtime/command-service.mjs';
import { TRANSACTION_ERROR, applyEnterWorldBundle } from '../runtime/firestore-transaction.mjs';
import { createKernelBaseMovementRate } from '../runtime/firebase-deployment.mjs';

function clone(v) { return v == null ? v : structuredClone(v); }
class FakeSnapshot { constructor(v) { this._v = v === undefined ? undefined : clone(v); this.exists = v !== undefined; } data() { return this.exists ? clone(this._v) : undefined; } }
class FakeRef { constructor(db, path) { this.db = db; this.path = path; } async get() { return new FakeSnapshot(this.db.store.has(this.path) ? this.db.store.get(this.path) : undefined); } }
class FakeCollection { constructor(db, name) { this.db = db; this.name = name; } doc(id) { return new FakeRef(this.db, `${this.name}/${id}`); } }
class FakeTransaction {
  constructor(db) { this.db = db; this.writes = []; }
  async get(ref) { return ref.get(); }
  set(ref, v) { this.writes.push({ type: 'set', path: ref.path, value: clone(v) }); }
  update(ref, p) { this.writes.push({ type: 'update', path: ref.path, value: clone(p) }); }
  commit() { for (const w of this.writes) { if (w.type === 'set') { this.db.store.set(w.path, clone(w.value)); continue; } const c = this.db.store.get(w.path); if (c === undefined) throw new Error(`missing ${w.path}`); this.db.store.set(w.path, Object.assign({}, clone(c), clone(w.value))); } }
}
class FakeFirestore {
  constructor(initial = {}) { this.store = new Map(Object.entries(initial).map(([p, v]) => [p, clone(v)])); this.transactions = 0; }
  collection(n) { return new FakeCollection(this, n); }
  async runTransaction(fn) { this.transactions++; const tx = new FakeTransaction(this); const r = await fn(tx); tx.commit(); return r; }
  read(p) { return this.store.has(p) ? clone(this.store.get(p)) : undefined; }
}
const principal = { uid: 'user-1' };
function unboundPc(overrides = {}) {
  return { ownerUid: 'user-1', campaignId: 'campaign-1', name: 'Val', raceId: 'dwarf', classId: 'fighter',
    hitPoints: { current: 9, maximum: 9 }, gold: 110,
    runtime: { lastResolvedTick: null, availableAtTick: null, activityId: null },
    currentLocation: { regionalHexId: 'D4-86', subHexCoord: [65, 26] }, ...overrides };
}
function fixtureDb(overrides = {}) {
  return new FakeFirestore({
    'campaigns/campaign-1': { worldTick: 500 },
    'characters/pc-val': unboundPc(),
    'settlements/set_far_bank': { name: 'Far Bank', regionalHexId: 'D4-86', subHexCoord: [64, 26] },
    ...overrides,
  });
}
const kernel = { getRacialMovementRate(race) { const t = { human: 12, dwarf: 9, elf: 12 }; if (!(race in t)) throw new RangeError(race); return t[race]; } };
function service(db, overrides = {}) {
  return createCommandService({ db, commandRuntime: loadCommandRuntime(), ownerOf: () => ({ col: 0, row: 0 }), routeMilesPerStep: 3,
    baseMovementRate: createKernelBaseMovementRate(kernel), rulesVersion: 'osric3-rules@test', now: () => new Date('2026-10-26T12:00:00Z'), ...overrides });
}
function intent(runtime, overrides = {}) {
  return runtime.Commands.createEnterWorldIntent({ commandId: 'command-enter-1', campaignId: 'campaign-1', actorId: 'pc-val', expectedWorldTick: 500, ...overrides }).command;
}

test('enter-world intent keeps only identity, clock and an optional settlement', () => {
  const runtime = loadCommandRuntime();
  const c = runtime.Commands.createEnterWorldIntent({ commandId: 'c', campaignId: 'camp', actorId: 'a', expectedWorldTick: 1, movementRate: 999, settlementId: 's1' });
  assert.deepEqual(c.command, { schemaVersion: 1, commandId: 'c', type: 'enterWorld', campaignId: 'camp', actorId: 'a', expectedWorldTick: 1, settlementId: 's1' });
  assert.equal(runtime.Commands.createEnterWorldIntent({ commandId: 'c', campaignId: 'camp', expectedWorldTick: 1 }).code, 'invalid-actor-id');
});

test('pure executor binds an unbound Actor at its stored spawn with host movement', () => {
  const runtime = loadCommandRuntime();
  const r = runtime.Commands.executeEnterWorldCommand(intent(runtime), {
    campaign: { id: 'campaign-1', worldTick: 500 }, actors: [Object.assign({ id: 'pc-val' }, unboundPc())], movementRate: 90,
  });
  assert.equal(r.ok, true, JSON.stringify(r));
  const patch = r.commitBundle.patchActors[0];
  assert.deepEqual(patch.currentLocation, { regionalHexId: 'D4-86', subHexCoord: [65, 26] });
  assert.deepEqual(patch.runtime, { lastResolvedTick: 500, availableAtTick: 500, activityId: null });
  assert.equal(patch.movementRate, 90);
  assert.equal(r.commitBundle.createEvent.type, 'actor.entered');
  assert.equal(r.commitBundle.updateCampaign, undefined);

  const chosen = runtime.Commands.executeEnterWorldCommand(intent(runtime, { settlementId: 's' }), {
    campaign: { id: 'campaign-1', worldTick: 500 }, actors: [Object.assign({ id: 'pc-val' }, unboundPc({ currentLocation: null }))],
    entryLocation: { subHexCoord: [64, 26] }, movementRate: 90,
  });
  assert.deepEqual(chosen.location, { subHexCoord: [64, 26] });

  const noWhere = runtime.Commands.executeEnterWorldCommand(intent(runtime), {
    campaign: { id: 'campaign-1', worldTick: 500 }, actors: [Object.assign({ id: 'pc-val' }, unboundPc({ currentLocation: null }))], movementRate: 90,
  });
  assert.equal(noWhere.code, 'missing-entry-location');
  const bound = runtime.Commands.executeEnterWorldCommand(intent(runtime), {
    campaign: { id: 'campaign-1', worldTick: 500 }, actors: [Object.assign({ id: 'pc-val' }, unboundPc({ runtime: { lastResolvedTick: 1, availableAtTick: 1, activityId: null } }))], movementRate: 90,
  });
  assert.equal(bound.code, 'actor-already-bound');
  const noMove = runtime.Commands.executeEnterWorldCommand(intent(runtime), {
    campaign: { id: 'campaign-1', worldTick: 500 }, actors: [Object.assign({ id: 'pc-val' }, unboundPc())], movementRate: null,
  });
  assert.equal(noMove.code, 'missing-authoritative-movement');
});

test('service enters a chargen PC with kernel movement (dwarf 90 ft) and leaves hp/gold alone', async () => {
  const runtime = loadCommandRuntime();
  const db = fixtureDb();
  const r = await service(db).handleEnterWorld(intent(runtime), { principal });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.movementRate, 90);
  assert.deepEqual(r.destination, { regionalHexId: 'D4-86', subHexCoord: [65, 26] });
  const pc = db.read('characters/pc-val');
  assert.equal(pc.movementRate, 90);
  assert.deepEqual(pc.runtime, { lastResolvedTick: 500, availableAtTick: 500, activityId: null });
  assert.deepEqual(pc.hitPoints, { current: 9, maximum: 9 });
  assert.equal(pc.gold, 110);
  assert.equal(db.read('campaigns/campaign-1').worldTick, 500, 'clock untouched');
  assert.equal(db.read('events/command-enter-1').data.raceId, 'dwarf');

  const replay = await service(db).handleEnterWorld(intent(runtime), { principal });
  assert.equal(replay.idempotentReplay, true);
  const again = await service(db).handleEnterWorld(intent(runtime, { commandId: 'command-enter-2' }), { principal });
  assert.equal(again.code, 'actor-already-bound');
});

test('service resolves a chosen settlement, rejects unknown ones, and authorizes the owner', async () => {
  const runtime = loadCommandRuntime();
  const db = fixtureDb({ 'characters/pc-val': unboundPc({ currentLocation: null, raceId: 'elf' }) });
  const r = await service(db).handleEnterWorld(intent(runtime, { settlementId: 'set_far_bank' }), { principal });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(r.destination, { regionalHexId: 'D4-86', subHexCoord: [64, 26] });
  assert.equal(r.movementRate, 120);

  const missing = await service(fixtureDb()).handleEnterWorld(intent(runtime, { settlementId: 'nowhere' }), { principal });
  assert.equal(missing.code, SERVICE_ERROR.SETTLEMENT_NOT_FOUND);
  const forbidden = await service(fixtureDb()).handleEnterWorld(intent(runtime), { principal: { uid: 'x' } });
  assert.equal(forbidden.code, SERVICE_ERROR.ACTOR_FORBIDDEN);
  const unknownRace = fixtureDb({ 'characters/pc-val': unboundPc({ raceId: 'tiefling' }) });
  const fallback = await service(unknownRace).handleEnterWorld(intent(runtime), { principal });
  assert.equal(fallback.movementRate, 120, 'unknown race falls back to human');
});

test('transaction refuses when the Actor was bound underneath the bundle', async () => {
  const runtime = loadCommandRuntime();
  const db = fixtureDb();
  const exec = runtime.Commands.executeEnterWorldCommand(intent(runtime), {
    campaign: { id: 'campaign-1', worldTick: 500 }, actors: [Object.assign({ id: 'pc-val' }, db.read('characters/pc-val'))], movementRate: 90,
  });
  db.store.get('characters/pc-val').runtime.lastResolvedTick = 500;
  const r = await applyEnterWorldBundle(db, exec.commitBundle);
  assert.equal(r.code, TRANSACTION_ERROR.ACTOR_PRECONDITION_FAILED);
  assert.equal(r.field, 'runtime');
});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(new URL('../public/adnd-documents.js', import.meta.url));
const script = new vm.Script(fs.readFileSync(scriptPath, 'utf8') + '\nADNDDocuments', {
  filename: 'adnd-documents.js',
});
const Documents = script.runInThisContext();

test('actor documents have stable identity metadata and time-runtime defaults', () => {
  const actor = Documents.createActor({
    id: 'char-val',
    type: 'character',
    campaignId: 'campaign-1',
    name: 'Val',
    ownerUid: 'user-1',
  });

  assert.equal(actor.id, 'char-val');
  assert.equal(actor.documentType, 'actor');
  assert.equal(actor.type, 'character');
  assert.equal(actor.schemaVersion, 1);
  assert.equal(actor.campaignId, 'campaign-1');
  assert.deepEqual(actor.runtime, {
    lastResolvedTick: null,
    availableAtTick: null,
    activityId: null,
  });
  assert.equal(actor.ownerUid, 'user-1');
});

test('legacy character records normalize without destructive migration', () => {
  const actor = Documents.normalizeCharacter({
    ownerUid: 'user-1',
    campaignId: 'campaign-1',
    name: 'Old Character',
    level: 4,
  }, 'legacy-id');

  assert.equal(actor.id, 'legacy-id');
  assert.equal(actor.documentType, 'actor');
  assert.equal(actor.type, 'character');
  assert.equal(actor.level, 4);
});


test('normalization preserves Firestore-like non-plain runtime values', () => {
  class FakeTimestamp {
    constructor(seconds) { this.seconds = seconds; }
    toDate() { return new Date(this.seconds * 1000); }
  }
  const createdAt = new FakeTimestamp(12345);
  const actor = Documents.normalizeCharacter({
    name: 'Timestamped Character',
    createdAt,
  }, 'timestamped-id');

  assert.equal(actor.createdAt, createdAt);
  assert.equal(actor.createdAt.toDate().getTime(), 12345000);
});

test('owned item instances separate definition identity from owner identity', () => {
  const item = Documents.createItem({
    id: 'item-1',
    type: 'weapon',
    campaignId: 'campaign-1',
    name: 'Long Sword',
    definitionId: 'long-sword',
    ownerActorId: 'char-val',
    quantity: 1,
    system: { identified: true },
  });

  assert.equal(item.documentType, 'item');
  assert.equal(item.definitionId, 'long-sword');
  assert.equal(item.ownerActorId, 'char-val');
  assert.deepEqual(item.system, { identified: true });
});

test('activities model availability without creating a separate character timeline', () => {
  const activity = Documents.createActivity({
    id: 'travel-1',
    type: 'travel',
    actorIds: ['char-val', 'char-kris'],
    startedAtTick: 100,
    availableAtTick: 220,
    status: 'active',
    system: { destinationId: 'place-7' },
  });

  assert.equal(activity.documentType, 'activity');
  assert.deepEqual(activity.actorIds, ['char-val', 'char-kris']);
  assert.equal(activity.startedAtTick, 100);
  assert.equal(activity.availableAtTick, 220);
});

test('game events keep references and rules version together', () => {
  const event = Documents.createGameEvent({
    id: 'event-1',
    type: 'character.created',
    campaignId: 'campaign-1',
    actorId: 'char-val',
    worldTick: 100,
    rulesVersion: '3.0-test',
    commandId: 'command-1',
    data: { method: 'I' },
  });

  assert.equal(event.documentType, 'event');
  assert.equal(event.actorId, 'char-val');
  assert.equal(event.worldTick, 100);
  assert.equal(event.rulesVersion, '3.0-test');
  assert.deepEqual(event.data, { method: 'I' });
});

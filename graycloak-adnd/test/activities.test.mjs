import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const documentsPath = fileURLToPath(new URL('../public/adnd-documents.js', import.meta.url));
const clockPath = fileURLToPath(new URL('../public/adnd-world-clock.js', import.meta.url));
const activitiesPath = fileURLToPath(new URL('../public/adnd-activities.js', import.meta.url));

const source = [
  fs.readFileSync(documentsPath, 'utf8'),
  fs.readFileSync(clockPath, 'utf8'),
  fs.readFileSync(activitiesPath, 'utf8'),
  '({ Documents: ADNDDocuments, Clock: ADNDWorldClock, Activities: ADNDActivities })',
].join('\n');
const { Documents, Clock, Activities } = new vm.Script(source, {
  filename: 'activity-runtime.js',
}).runInThisContext();

function currentActor(id, worldTick = 100, currentLocation = null) {
  return Documents.createActor({
    id,
    type: 'character',
    campaignId: 'campaign-1',
    name: id,
    currentLocation,
    runtime: {
      lastResolvedTick: worldTick,
      availableAtTick: null,
      activityId: null,
    },
  });
}

const origin = { regionalHexId: 'D4-86', subHexCoord: [10, 20] };
const destination = { regionalHexId: 'D4-86', subHexCoord: [11, 20] };

test('travel planning creates one active Activity and pure Actor reservation patches', () => {
  const val = currentActor('char-val', 100, origin);
  const kris = currentActor('char-kris', 100, origin);

  const plan = Activities.createTravelPlan({
    id: 'activity-travel-1',
    campaignId: 'campaign-1',
    actors: [val, kris],
    worldTick: 100,
    durationTicks: Clock.TICKS_PER_TURN,
    origin,
    destination,
  });

  assert.equal(plan.ok, true);
  assert.equal(plan.activity.id, 'activity-travel-1');
  assert.equal(plan.activity.documentType, 'activity');
  assert.equal(plan.activity.type, 'travel');
  assert.equal(plan.activity.status, 'active');
  assert.equal(plan.activity.startedAtTick, 100);
  assert.equal(plan.activity.availableAtTick, 200);
  assert.equal(plan.activity.actorIds.length, 2);
  assert.equal(plan.activity.actorIds[0], 'char-val');
  assert.equal(plan.activity.actorIds[1], 'char-kris');
  assert.equal(plan.activity.system.durationTicks, 100);
  assert.equal(plan.activity.system.origin.regionalHexId, 'D4-86');
  assert.equal(plan.activity.system.destination.subHexCoord[0], 11);

  assert.equal(plan.actorRuntimePatches.length, 2);
  assert.equal(plan.actorRuntimePatches[0].actorId, 'char-val');
  assert.equal(plan.actorRuntimePatches[0].runtime.lastResolvedTick, 100);
  assert.equal(plan.actorRuntimePatches[0].runtime.availableAtTick, 200);
  assert.equal(plan.actorRuntimePatches[0].runtime.activityId, 'activity-travel-1');

  // Planning is pure: the source Actors are not reserved/mutated in place.
  assert.equal(val.runtime.availableAtTick, null);
  assert.equal(val.runtime.activityId, null);
  assert.equal(kris.runtime.availableAtTick, null);
});

test('travel accepts stable string location ids or structured map location refs', () => {
  const actor = currentActor('char-val');
  const byId = Activities.createTravelPlan({
    id: 'travel-by-id',
    campaignId: 'campaign-1',
    actors: [actor],
    worldTick: 100,
    durationTicks: 10,
    origin: 'place-hommlet',
    destination: 'place-nulb',
  });
  assert.equal(byId.ok, true);
  assert.equal(byId.activity.system.origin.id, 'place-hommlet');
  assert.equal(byId.activity.system.destination.id, 'place-nulb');

  const byMapRef = Activities.createTravelPlan({
    id: 'travel-by-map-ref',
    campaignId: 'campaign-1',
    actors: [actor],
    worldTick: 100,
    durationTicks: 10,
    origin,
    destination,
  });
  assert.equal(byMapRef.ok, true);
  assert.equal(byMapRef.activity.system.origin.subHexCoord[1], 20);
});

test('travel requires a stable Activity id, valid time, positive duration, and locations', () => {
  const actor = currentActor('char-val');

  assert.equal(Activities.createTravelPlan({
    campaignId: 'campaign-1', actors: [actor], worldTick: 100, durationTicks: 10, origin, destination,
  }).code, Activities.TRAVEL_ERROR.INVALID_ACTIVITY_ID);

  assert.equal(Activities.createTravelPlan({
    id: 'travel-1', campaignId: 'campaign-1', actors: [actor], worldTick: -1, durationTicks: 10, origin, destination,
  }).code, Activities.TRAVEL_ERROR.INVALID_WORLD_TICK);

  assert.equal(Activities.createTravelPlan({
    id: 'travel-1', campaignId: 'campaign-1', actors: [actor], worldTick: 100, durationTicks: 0, origin, destination,
  }).code, Activities.TRAVEL_ERROR.INVALID_DURATION);

  assert.equal(Activities.createTravelPlan({
    id: 'travel-1', campaignId: 'campaign-1', actors: [actor], worldTick: 100, durationTicks: 10, origin: null, destination,
  }).code, Activities.TRAVEL_ERROR.INVALID_LOCATION);
});

test('travel refuses unbound, behind, unavailable, and ahead Actors', () => {
  const cases = [
    ['unbound', { lastResolvedTick: null, availableAtTick: null, activityId: null }],
    ['behind', { lastResolvedTick: 90, availableAtTick: null, activityId: null }],
    ['unavailable', { lastResolvedTick: 100, availableAtTick: 120, activityId: 'other-activity' }],
    ['ahead', { lastResolvedTick: 101, availableAtTick: null, activityId: null }],
  ];

  for (const [expectedStatus, runtime] of cases) {
    const actor = Documents.createActor({ id: `actor-${expectedStatus}`, campaignId: 'campaign-1', runtime });
    const result = Activities.createTravelPlan({
      id: `travel-${expectedStatus}`,
      campaignId: 'campaign-1',
      actors: [actor],
      worldTick: 100,
      durationTicks: 10,
      origin,
      destination,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, Activities.TRAVEL_ERROR.ACTOR_NOT_AVAILABLE);
    assert.equal(result.actorStatuses[0].status, expectedStatus);
  }
});

test('travel rejects missing or duplicate Actor ids', () => {
  const missingId = currentActor('temp');
  missingId.id = null;
  const missing = Activities.createTravelPlan({
    id: 'travel-missing', campaignId: 'campaign-1', actors: [missingId], worldTick: 100,
    durationTicks: 10, origin, destination,
  });
  assert.equal(missing.code, Activities.TRAVEL_ERROR.INVALID_ACTOR_ID);

  const actor = currentActor('char-val');
  const duplicate = Activities.createTravelPlan({
    id: 'travel-duplicate', campaignId: 'campaign-1', actors: [actor, actor], worldTick: 100,
    durationTicks: 10, origin, destination,
  });
  assert.equal(duplicate.code, Activities.TRAVEL_ERROR.DUPLICATE_ACTOR);
  assert.equal(duplicate.actorId, 'char-val');
});



test('travel is campaign-bound and rejects cross-campaign Actors', () => {
  const actor = currentActor('char-val');
  const missingCampaign = Activities.createTravelPlan({
    id: 'travel-no-campaign',
    actors: [actor],
    worldTick: 100,
    durationTicks: 10,
    origin,
    destination,
  });
  assert.equal(missingCampaign.code, Activities.TRAVEL_ERROR.INVALID_CAMPAIGN_ID);

  const outsider = Documents.createActor({
    id: 'char-outsider',
    type: 'character',
    campaignId: 'campaign-2',
    runtime: { lastResolvedTick: 100, availableAtTick: null, activityId: null },
  });
  const mismatch = Activities.createTravelPlan({
    id: 'travel-cross-campaign',
    campaignId: 'campaign-1',
    actors: [actor, outsider],
    worldTick: 100,
    durationTicks: 10,
    origin,
    destination,
  });
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.code, Activities.TRAVEL_ERROR.CAMPAIGN_MISMATCH);
  assert.equal(mismatch.actorId, 'char-outsider');
});

test('travel completion cannot overflow the safe-integer world clock', () => {
  const actor = currentActor('char-val', Number.MAX_SAFE_INTEGER);
  const result = Activities.createTravelPlan({
    id: 'travel-overflow',
    campaignId: 'campaign-1',
    actors: [actor],
    worldTick: Number.MAX_SAFE_INTEGER,
    durationTicks: 1,
    origin,
    destination,
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, Activities.TRAVEL_ERROR.TICK_OVERFLOW);
});

test('active travel becomes due at its availability tick but is not auto-resolved', () => {
  const plan = Activities.createTravelPlan({
    id: 'travel-due', campaignId: 'campaign-1', actors: [currentActor('char-val', 100)], worldTick: 100,
    durationTicks: 20, origin, destination,
  });

  assert.equal(Activities.isTravelActivity(plan.activity), true);
  assert.equal(Activities.activityCompletionTick(plan.activity), 120);
  assert.equal(Activities.isActivityDue(plan.activity, 119), false);
  assert.equal(Activities.isActivityDue(plan.activity, 120), true);
  assert.equal(Activities.isActivityDue(plan.activity, 121), true);
  assert.equal(plan.activity.status, 'active');
});

test('travel planning carries optional system metadata without overriding canonical travel fields', () => {
  const plan = Activities.createTravelPlan({
    id: 'travel-meta', campaignId: 'campaign-1', actors: [currentActor('char-val', 100)], worldTick: 100,
    durationTicks: 20, origin, destination,
    system: {
      mode: 'mounted',
      durationTicks: 999,
      destination: { id: 'wrong-place' },
    },
  });

  assert.equal(plan.ok, true);
  assert.equal(plan.activity.system.mode, 'mounted');
  assert.equal(plan.activity.system.durationTicks, 20);
  assert.equal(plan.activity.system.destination.regionalHexId, 'D4-86');
});

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

test('OSRIC outdoor terrain converts movement rate into miles per day', () => {
  assert.equal(Activities.outdoorMilesPerDay(120, Activities.TRAVEL_TERRAIN.LEVEL), 24);
  assert.equal(Activities.outdoorMilesPerDay(120, Activities.TRAVEL_TERRAIN.RUGGED), 18);
  assert.equal(Activities.outdoorMilesPerDay(120, Activities.TRAVEL_TERRAIN.VERY_RUGGED), 12);
  assert.equal(Activities.outdoorMilesPerDay(120, 'swampy-ish'), null);
});

test('derived movement applies encumbrance to base rate and then the independent armour cap', () => {
  const profile = Activities.resolveMovementProfile({
    baseMovementRate: 120,
    armourMovementCap: 90,
    encumbrancePace: Activities.ENCUMBRANCE_PACE.HALF,
  });

  assert.equal(profile.ok, true);
  assert.equal(profile.baseMovementRate, 120);
  assert.equal(profile.armourMovementCap, 90);
  assert.equal(profile.encumbranceMultiplier, 0.5);
  assert.equal(profile.movementRate, 60);
});

test('effective movement can be supplied directly without using unaudited weight thresholds', () => {
  const profile = Activities.resolveMovementProfile({ movementRate: 60 });
  assert.equal(profile.ok, true);
  assert.equal(profile.source, 'effective');
  assert.equal(profile.movementRate, 60);
  assert.equal(profile.encumbrancePace, null);
});

test('party outdoor pace is set by the slowest Actor', () => {
  const val = currentActor('char-val');
  const kris = currentActor('char-kris');
  const pace = Activities.resolvePartyTravelPace(
    [val, kris],
    {
      'char-val': { movementRate: 120 },
      'char-kris': { movementRate: 60 },
    },
    Activities.TRAVEL_TERRAIN.LEVEL,
  );

  assert.equal(pace.ok, true);
  assert.equal(pace.partyMovementRate, 60);
  assert.equal(pace.milesPerDay, 12);
  assert.equal(pace.actorPaces.length, 2);
});

test('calculated outdoor duration converts fractional travel days into world ticks', () => {
  const halfDay = Activities.calculateOutdoorTravelDuration({
    distanceMiles: 12,
    terrain: Activities.TRAVEL_TERRAIN.LEVEL,
    movementProfiles: {
      'char-val': { movementRate: 120 },
    },
  }, [currentActor('char-val')]);

  assert.equal(halfDay.ok, true);
  assert.equal(halfDay.durationSource, Activities.TRAVEL_DURATION_SOURCE.OSRIC_OUTDOOR);
  assert.equal(halfDay.outdoorTravel.milesPerDay, 24);
  assert.equal(halfDay.outdoorTravel.travelDays, 0.5);
  assert.equal(halfDay.durationTicks, Clock.TICKS_PER_DAY / 2);
});

test('createTravelPlan calculates duration when manual durationTicks is omitted', () => {
  const plan = Activities.createTravelPlan({
    id: 'travel-calculated',
    campaignId: 'campaign-1',
    actors: [currentActor('char-val', 100)],
    worldTick: 100,
    distanceMiles: 12,
    terrain: Activities.TRAVEL_TERRAIN.LEVEL,
    movementProfiles: {
      'char-val': { movementRate: 120 },
    },
    origin,
    destination,
  });

  assert.equal(plan.ok, true);
  assert.equal(plan.activity.system.durationSource, Activities.TRAVEL_DURATION_SOURCE.OSRIC_OUTDOOR);
  assert.equal(plan.activity.system.durationTicks, Clock.TICKS_PER_DAY / 2);
  assert.equal(plan.activity.availableAtTick, 100 + Clock.TICKS_PER_DAY / 2);
  assert.equal(plan.activity.system.outdoorTravel.distanceMiles, 12);
  assert.equal(plan.activity.system.outdoorTravel.terrain, Activities.TRAVEL_TERRAIN.LEVEL);
  assert.equal(plan.activity.system.outdoorTravel.partyMovementRate, 120);
  assert.equal(plan.activity.system.outdoorTravel.actorPaces[0].actorId, 'char-val');
});

test('manual duration remains an explicit escape hatch and wins over calculated inputs', () => {
  const plan = Activities.createTravelPlan({
    id: 'travel-manual-override',
    campaignId: 'campaign-1',
    actors: [currentActor('char-val', 100)],
    worldTick: 100,
    durationTicks: 77,
    distanceMiles: 999,
    terrain: Activities.TRAVEL_TERRAIN.VERY_RUGGED,
    movementProfiles: {},
    origin,
    destination,
    system: { outdoorTravel: { bogus: true } },
  });

  assert.equal(plan.ok, true);
  assert.equal(plan.activity.system.durationTicks, 77);
  assert.equal(plan.activity.system.durationSource, Activities.TRAVEL_DURATION_SOURCE.MANUAL);
  assert.equal(Object.prototype.hasOwnProperty.call(plan.activity.system, 'outdoorTravel'), false);
});

test('calculated travel rejects invalid terrain, distance, movement profiles, and immobile parties', () => {
  const actor = currentActor('char-val');
  const base = {
    id: 'travel-invalid-calculation',
    campaignId: 'campaign-1',
    actors: [actor],
    worldTick: 100,
    origin,
    destination,
  };

  assert.equal(Activities.createTravelPlan({
    ...base,
    distanceMiles: 0,
    terrain: Activities.TRAVEL_TERRAIN.LEVEL,
    movementProfiles: { 'char-val': { movementRate: 120 } },
  }).code, Activities.TRAVEL_ERROR.INVALID_DISTANCE);

  assert.equal(Activities.createTravelPlan({
    ...base,
    distanceMiles: 10,
    terrain: 'forest',
    movementProfiles: { 'char-val': { movementRate: 120 } },
  }).code, Activities.TRAVEL_ERROR.INVALID_TERRAIN);

  assert.equal(Activities.createTravelPlan({
    ...base,
    distanceMiles: 10,
    terrain: Activities.TRAVEL_TERRAIN.LEVEL,
    movementProfiles: {},
  }).code, Activities.TRAVEL_ERROR.INVALID_MOVEMENT_PROFILE);

  assert.equal(Activities.createTravelPlan({
    ...base,
    distanceMiles: 10,
    terrain: Activities.TRAVEL_TERRAIN.LEVEL,
    movementProfiles: { 'char-val': { baseMovementRate: 120, encumbrancePace: 'immobile' } },
  }).code, Activities.TRAVEL_ERROR.NO_TRAVEL_SPEED);
});

test('encumbrance pace accepts OSRIC quarter bands and rejects arbitrary multipliers', () => {
  assert.equal(Activities.normalizeEncumbrancePace('full'), 'full');
  assert.equal(Activities.normalizeEncumbrancePace('three_quarter'), 'three-quarter');
  assert.equal(Activities.normalizeEncumbrancePace(0.5), 'half');
  assert.equal(Activities.normalizeEncumbrancePace(0.25), 'quarter');
  assert.equal(Activities.normalizeEncumbrancePace(0), 'immobile');
  assert.equal(Activities.normalizeEncumbrancePace(0.6), null);
});

test('caller system metadata cannot override canonical calculated travel fields', () => {
  const plan = Activities.createTravelPlan({
    id: 'travel-calculated-meta',
    campaignId: 'campaign-1',
    actors: [currentActor('char-val', 100)],
    worldTick: 100,
    distanceMiles: 12,
    terrain: Activities.TRAVEL_TERRAIN.LEVEL,
    movementProfiles: { 'char-val': { movementRate: 120 } },
    origin,
    destination,
    system: {
      durationTicks: 1,
      durationSource: 'bogus',
      outdoorTravel: { distanceMiles: 999 },
    },
  });

  assert.equal(plan.ok, true);
  assert.equal(plan.activity.system.durationTicks, Clock.TICKS_PER_DAY / 2);
  assert.equal(plan.activity.system.durationSource, Activities.TRAVEL_DURATION_SOURCE.OSRIC_OUTDOOR);
  assert.equal(plan.activity.system.outdoorTravel.distanceMiles, 12);
});


test('axial route distance accepts currentLocation/subHexCoord shapes', () => {
  assert.equal(Activities.axialDistance([10, 20], [11, 20]), 1);
  assert.equal(
    Activities.axialDistance(
      { subHexCoord: [10, 20] },
      { Q: 12, R: 19 },
    ),
    2,
  );
});

test('route normalization derives map distance from adjacent axial segments', () => {
  const route = Activities.normalizeRouteSegments([
    {
      from: { subHexCoord: [10, 20] },
      to: [11, 20],
      terrain: Activities.TRAVEL_TERRAIN.LEVEL,
    },
    {
      from: [11, 20],
      to: { Q: 12, R: 20 },
      terrain: Activities.TRAVEL_TERRAIN.RUGGED,
    },
  ], 3);

  assert.equal(route.ok, true);
  assert.equal(route.routeMilesPerStep, 3);
  assert.equal(route.segments.length, 2);
  assert.equal(route.segments[0].distanceMiles, 3);
  assert.equal(route.segments[1].distanceMiles, 3);
  assert.equal(route.totalDistanceMiles, 6);
  assert.equal(route.origin.Q, 10);
  assert.equal(route.destination.Q, 12);
});

test('route normalization rejects non-adjacent or broken segment chains', () => {
  const skippedCell = Activities.normalizeRouteSegments([
    {
      from: [10, 20],
      to: [12, 20],
      terrain: Activities.TRAVEL_TERRAIN.LEVEL,
    },
  ], 3);
  assert.equal(skippedCell.ok, false);
  assert.equal(skippedCell.code, Activities.TRAVEL_ERROR.NONCONTIGUOUS_ROUTE);
  assert.equal(skippedCell.reason, 'segment-not-adjacent');

  const brokenChain = Activities.normalizeRouteSegments([
    {
      from: [10, 20],
      to: [11, 20],
      terrain: Activities.TRAVEL_TERRAIN.LEVEL,
    },
    {
      from: [12, 20],
      to: [13, 20],
      terrain: Activities.TRAVEL_TERRAIN.LEVEL,
    },
  ], 3);
  assert.equal(brokenChain.ok, false);
  assert.equal(brokenChain.code, Activities.TRAVEL_ERROR.NONCONTIGUOUS_ROUTE);
  assert.equal(brokenChain.reason, 'segment-chain-break');
});

test('route normalization requires the map layer to supply a positive miles-per-step scale', () => {
  const segments = [{
    from: [10, 20],
    to: [11, 20],
    terrain: Activities.TRAVEL_TERRAIN.LEVEL,
  }];

  assert.equal(
    Activities.normalizeRouteSegments(segments, null).code,
    Activities.TRAVEL_ERROR.INVALID_ROUTE_SCALE,
  );
  assert.equal(
    Activities.normalizeRouteSegments(segments, 0).code,
    Activities.TRAVEL_ERROR.INVALID_ROUTE_SCALE,
  );
});

test('mixed-terrain route duration sums per-segment OSRIC travel time', () => {
  const result = Activities.calculateRouteTravelDuration({
    routeMilesPerStep: 3,
    routeSegments: [
      {
        from: [10, 20],
        to: [11, 20],
        terrain: Activities.TRAVEL_TERRAIN.LEVEL,
      },
      {
        from: [11, 20],
        to: [12, 20],
        terrain: Activities.TRAVEL_TERRAIN.RUGGED,
      },
    ],
    movementProfiles: {
      'char-val': { movementRate: 120 },
    },
  }, [currentActor('char-val')]);

  assert.equal(result.ok, true);
  assert.equal(result.durationSource, Activities.TRAVEL_DURATION_SOURCE.OSRIC_OUTDOOR_ROUTE);
  assert.equal(result.outdoorTravel.distanceMiles, 6);
  assert.equal(result.outdoorTravel.segmentCount, 2);
  assert.equal(result.outdoorTravel.segments[0].milesPerDay, 24);
  assert.equal(result.outdoorTravel.segments[1].milesPerDay, 18);
  assert.ok(Math.abs(result.outdoorTravel.travelDays - (7 / 24)) < Number.EPSILON * 4);
  assert.equal(result.durationTicks, 4200);
});

test('createTravelPlan records a map-derived mixed-terrain route', () => {
  const plan = Activities.createTravelPlan({
    id: 'travel-route-calculated',
    campaignId: 'campaign-1',
    actors: [currentActor('char-val', 100)],
    worldTick: 100,
    routeMilesPerStep: 3,
    routeSegments: [
      {
        from: origin,
        to: destination,
        terrain: Activities.TRAVEL_TERRAIN.LEVEL,
      },
      {
        from: destination,
        to: { subHexCoord: [12, 20] },
        terrain: Activities.TRAVEL_TERRAIN.RUGGED,
      },
    ],
    movementProfiles: {
      'char-val': { movementRate: 120 },
    },
    origin,
    destination: { regionalHexId: 'D4-86', subHexCoord: [12, 20] },
  });

  assert.equal(plan.ok, true);
  assert.equal(
    plan.activity.system.durationSource,
    Activities.TRAVEL_DURATION_SOURCE.OSRIC_OUTDOOR_ROUTE,
  );
  assert.equal(plan.activity.system.durationTicks, 4200);
  assert.equal(plan.activity.system.outdoorTravel.routeMode, 'axial-segments');
  assert.equal(plan.activity.system.outdoorTravel.routeMilesPerStep, 3);
  assert.equal(plan.activity.system.outdoorTravel.segmentCount, 2);
  assert.equal(plan.activity.system.outdoorTravel.distanceMiles, 6);
  assert.equal(plan.activity.system.outdoorTravel.segments[1].terrain, 'rugged');
  assert.equal(plan.activity.availableAtTick, 4300);
});

test('manual duration still overrides route calculation and route validation', () => {
  const plan = Activities.createTravelPlan({
    id: 'travel-route-manual',
    campaignId: 'campaign-1',
    actors: [currentActor('char-val', 100)],
    worldTick: 100,
    durationTicks: 50,
    routeSegments: [{ definitely: 'not-a-valid-segment' }],
    origin,
    destination,
  });

  assert.equal(plan.ok, true);
  assert.equal(plan.activity.system.durationSource, Activities.TRAVEL_DURATION_SOURCE.MANUAL);
  assert.equal(plan.activity.system.durationTicks, 50);
  assert.equal(Object.prototype.hasOwnProperty.call(plan.activity.system, 'outdoorTravel'), false);
});

test('single-terrain distance travel remains backward compatible after route support', () => {
  const result = Activities.calculateOutdoorTravelDuration({
    distanceMiles: 12,
    terrain: Activities.TRAVEL_TERRAIN.LEVEL,
    movementProfiles: {
      'char-val': { movementRate: 120 },
    },
  }, [currentActor('char-val')]);

  assert.equal(result.ok, true);
  assert.equal(result.durationSource, Activities.TRAVEL_DURATION_SOURCE.OSRIC_OUTDOOR);
  assert.equal(result.durationTicks, Clock.TICKS_PER_DAY / 2);
});


test('route-backed travel rejects structured origin or destination that disagrees with route endpoints', () => {
  const actor = currentActor('char-val', 100);
  const base = {
    id: 'travel-route-endpoint-check',
    campaignId: 'campaign-1',
    actors: [actor],
    worldTick: 100,
    routeMilesPerStep: 3,
    routeSegments: [
      {
        from: [10, 20],
        to: [11, 20],
        terrain: Activities.TRAVEL_TERRAIN.LEVEL,
      },
    ],
    movementProfiles: {
      'char-val': { movementRate: 120 },
    },
  };

  const badOrigin = Activities.createTravelPlan({
    ...base,
    origin: { subHexCoord: [9, 20] },
    destination: { subHexCoord: [11, 20] },
  });
  assert.equal(badOrigin.ok, false);
  assert.equal(badOrigin.code, Activities.TRAVEL_ERROR.ROUTE_ENDPOINT_MISMATCH);
  assert.equal(badOrigin.endpoint, 'origin');

  const badDestination = Activities.createTravelPlan({
    ...base,
    origin: { subHexCoord: [10, 20] },
    destination: { subHexCoord: [12, 20] },
  });
  assert.equal(badDestination.ok, false);
  assert.equal(badDestination.code, Activities.TRAVEL_ERROR.ROUTE_ENDPOINT_MISMATCH);
  assert.equal(badDestination.endpoint, 'destination');
});

test('route-backed travel may use named place ids when coordinate endpoint validation is unavailable', () => {
  const plan = Activities.createTravelPlan({
    id: 'travel-route-place-ids',
    campaignId: 'campaign-1',
    actors: [currentActor('char-val', 100)],
    worldTick: 100,
    routeMilesPerStep: 3,
    routeSegments: [
      {
        from: [10, 20],
        to: [11, 20],
        terrain: Activities.TRAVEL_TERRAIN.LEVEL,
      },
    ],
    movementProfiles: {
      'char-val': { movementRate: 120 },
    },
    origin: 'place-a',
    destination: 'place-b',
  });

  assert.equal(plan.ok, true);
  assert.equal(plan.activity.system.origin.id, 'place-a');
  assert.equal(plan.activity.system.destination.id, 'place-b');
});

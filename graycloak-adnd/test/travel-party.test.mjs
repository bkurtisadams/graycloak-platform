import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const publicFile = name => fileURLToPath(new URL(`../public/${name}`, import.meta.url));

function loadRuntime(){
  const context = vm.createContext({ console, URLSearchParams, location: { search: '?camp=camp-1' } });
  for (const file of [
    'adnd-documents.js',
    'adnd-world-clock.js',
    'adnd-activities.js',
    'adnd-map-route.js',
    'adnd-travel-party.js',
  ]) {
    new vm.Script(fs.readFileSync(publicFile(file), 'utf8'), { filename: file }).runInContext(context);
  }
  const api = new vm.Script('({ Documents: ADNDDocuments, Clock: ADNDWorldClock, Activities: ADNDActivities, Party: ADNDTravelParty })')
    .runInContext(context);
  return Object.assign({ context }, api);
}

function actor(context, input){
  context.__json = JSON.stringify(input);
  return vm.runInContext('ADNDDocuments.createActor(JSON.parse(__json))', context);
}

function realmValue(context, input){
  context.__json = JSON.stringify(input);
  return vm.runInContext('JSON.parse(__json)', context);
}

test('party candidates are limited to Actors at the selected route origin', () => {
  const { context, Party } = loadRuntime();
  const a = actor(context, {
    id: 'a', type: 'character', campaignId: 'camp-1', name: 'Alpha',
    currentLocation: { subHexCoord: [10, 20] },
    runtime: { lastResolvedTick: 100, availableAtTick: 100, activityId: null },
  });
  const b = actor(context, {
    id: 'b', type: 'character', campaignId: 'camp-1', name: 'Beta',
    currentLocation: { subHexCoord: [11, 20] },
    runtime: { lastResolvedTick: 100, availableAtTick: 100, activityId: null },
  });
  const candidates = Party.listCandidates({ a, b }, [10, 20], 100, 'camp-1');
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].actorId, 'a');
  assert.equal(candidates[0].time.status, 'current');
});

test('explicit Actor movement rate is discovered without inventing a default', () => {
  const { Party } = loadRuntime();
  assert.equal(Party.explicitMovementProfile({ movementRate: 120 }).movementRate, 120);
  assert.equal(Party.explicitMovementProfile({ movement: { rate: 90 } }).movementRate, 90);
  assert.equal(Party.explicitMovementProfile({ movement: { baseMovementRate: 120, encumbrancePace: 'half' } }).baseMovementRate, 120);
  assert.equal(Party.explicitMovementProfile({ name: 'No movement data' }), null);
});

test('preview Movement Rate overrides take precedence over Actor data', () => {
  const { context, Party } = loadRuntime();
  const a = actor(context, { id: 'a', type: 'character', campaignId: 'camp-1', movementRate: 120 });
  const result = Party.buildMovementProfiles([a], { a: '90' });
  assert.equal(result.ok, true);
  assert.equal(result.movementProfiles.a.movementRate, 90);
});

test('missing movement profiles are reported by Actor id', () => {
  const { context, Party } = loadRuntime();
  const a = actor(context, { id: 'a', type: 'character', campaignId: 'camp-1' });
  const result = Party.buildMovementProfiles([a], {});
  assert.equal(result.ok, false);
  assert.equal(result.code, Party.PARTY_ERROR.MISSING_MOVEMENT_PROFILE);
  assert.equal(result.missingActorIds.length, 1);
  assert.equal(result.missingActorIds[0], 'a');
});

test('slowest Actor is identified from effective Movement Rate', () => {
  const { context, Party } = loadRuntime();
  const a = actor(context, { id: 'a', type: 'character', campaignId: 'camp-1', name: 'Fast' });
  const b = actor(context, { id: 'b', type: 'character', campaignId: 'camp-1', name: 'Slow' });
  const profiles = realmValue(context, {
    a: { movementRate: 120 },
    b: { movementRate: 90 },
  });
  const slowest = Party.slowestActor([a, b], profiles);
  assert.equal(slowest.actorId, 'b');
  assert.equal(slowest.name, 'Slow');
  assert.equal(slowest.movementRate, 90);
});

test('party preview calculates mixed-terrain duration and arrival tick', () => {
  const { context, Party } = loadRuntime();
  const a = actor(context, {
    id: 'a', type: 'character', campaignId: 'camp-1', name: 'Fast',
    runtime: { lastResolvedTick: 100, availableAtTick: 100, activityId: null },
  });
  const b = actor(context, {
    id: 'b', type: 'character', campaignId: 'camp-1', name: 'Slow',
    runtime: { lastResolvedTick: 100, availableAtTick: 100, activityId: null },
  });
  context.__a = a; context.__b = b;
  const input = vm.runInContext(`({
    actors: [__a, __b],
    movementOverrides: {
      a: 120,
      b: 90
    },
    routeMilesPerStep: 3,
    routeSegments: [
      { from: {Q:0,R:0}, to: {Q:1,R:0}, terrain: 'level' },
      { from: {Q:1,R:0}, to: {Q:2,R:0}, terrain: 'rugged' }
    ],
    worldTick: 100
  })`, context);
  const preview = Party.buildPreview(input);
  assert.equal(preview.ok, true);
  assert.equal(preview.canBegin, true);
  assert.equal(preview.slowestActor.actorId, 'b');
  assert.equal(preview.outdoorTravel.distanceMiles, 6);
  // MR 90: 18 mi/day level and 13.5 mi/day rugged.
  const expectedTicks = Math.ceil((3 / 18 + 3 / 13.5) * 14400);
  assert.equal(preview.durationTicks, expectedTicks);
  assert.equal(preview.arrivalTick, 100 + expectedTicks);
});

test('preview remains useful for an unbound Actor but cannot begin travel', () => {
  const { context, Party } = loadRuntime();
  const a = actor(context, {
    id: 'a', type: 'character', campaignId: 'camp-1', name: 'Legacy',
    runtime: { lastResolvedTick: null, availableAtTick: null, activityId: null },
  });
  context.__a = a;
  const input = vm.runInContext(`({
    actors: [__a],
    movementOverrides: { a: 120 },
    routeMilesPerStep: 3,
    routeSegments: [
      { from: {Q:0,R:0}, to: {Q:1,R:0}, terrain: 'level' }
    ],
    worldTick: 100
  })`, context);
  const preview = Party.buildPreview(input);
  assert.equal(preview.ok, true);
  assert.equal(preview.canBegin, false);
  assert.equal(preview.actorStatuses[0].status, 'unbound');
  assert.equal(preview.durationTicks, 1800);
});

test('duration formatter uses the shared world-clock units', () => {
  const { Party } = loadRuntime();
  assert.equal(Party.formatDurationTicks(14400 + 1200 + 100), '1d 2h 1 turn');
  assert.equal(Party.formatDurationTicks(10), '1 round');
});

test('index loads party preview after route adapter and before map view', () => {
  const indexPath = fileURLToPath(new URL('../public/index.html', import.meta.url));
  const html = fs.readFileSync(indexPath, 'utf8');
  const route = html.indexOf('adnd-map-route.js');
  const party = html.indexOf('adnd-travel-party.js');
  const map = html.indexOf('adnd-map-view.js');
  assert.ok(route >= 0);
  assert.ok(party > route);
  assert.ok(map > party);
});

test('map party preview uses route-origin characters and local Movement Rate overrides', () => {
  const { context } = loadRuntime();
  context.requestAnimationFrame = () => 0;
  const MapView = new vm.Script(
    fs.readFileSync(publicFile('adnd-map-view.js'), 'utf8') + '\nADNDMapView',
    { filename: 'adnd-map-view.js' },
  ).runInContext(context);

  const a = actor(context, {
    id: 'a', type: 'character', campaignId: 'camp-1', name: 'Alpha',
    currentLocation: { subHexCoord: [0, 0] },
    runtime: { lastResolvedTick: 100, availableAtTick: 100, activityId: null },
  });
  MapView.state.data = {
    campaign: { worldTick: 100 },
    characters: { a },
    subhex: {},
    flanaess: { '0-0': 'clear' },
  };
  // The map-engine normally supplies these after ready(); stub only the pieces
  // used by previewSelectedRoute through the public state is not possible, so
  // exercise the selection/candidate side here and leave geometry to v0.8 tests.
  MapView.state.route = vm.runInContext(
    `ADNDMapRoute.createSelection({ active: false, cells: [[0,0], [1,0]] })`,
    context,
  );
  const candidates = MapView.travelPartyCandidates();
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].actorId, 'a');
  MapView.ensureTravelPartySelection();
  assert.equal(MapView.state.travelParty.selectedActorIds[0], 'a');
  MapView.state.travelParty.movementOverrides.a = '120';
  assert.equal(MapView.selectedTravelActors(candidates).length, 1);
});

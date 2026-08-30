import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const publicFile = name => fileURLToPath(new URL(`../public/${name}`, import.meta.url));

function loadRouteRuntime(){
  const context = vm.createContext({ console });
  for (const file of ['adnd-documents.js', 'adnd-world-clock.js', 'adnd-activities.js', 'adnd-map-route.js']){
    new vm.Script(fs.readFileSync(publicFile(file), 'utf8'), { filename: file }).runInContext(context);
  }
  const api = new vm.Script('({ Documents: ADNDDocuments, Clock: ADNDWorldClock, Activities: ADNDActivities, Route: ADNDMapRoute })')
    .runInContext(context);
  return Object.assign({ context }, api);
}

test('route selection appends adjacent cells in order', () => {
  const { Route } = loadRouteRuntime();
  let selection = Route.createSelection({ active: true });
  let result = Route.appendCell(selection, [0, 0]);
  assert.equal(result.ok, true);
  assert.equal(result.action, 'start');
  selection = result.selection;

  result = Route.appendCell(selection, [1, 0]);
  assert.equal(result.ok, true);
  assert.equal(result.action, 'append');
  selection = result.selection;

  result = Route.appendCell(selection, [2, 0]);
  assert.equal(result.ok, true);
  assert.equal(result.selection.cells.length, 3);
  assert.equal(result.selection.cells[2].Q, 2);
  assert.equal(result.selection.cells[2].R, 0);
  assert.equal(Route.routeDistanceMiles(result.selection, 3), 6);
});

test('route selection rejects non-adjacent jumps without losing the route', () => {
  const { Route } = loadRouteRuntime();
  let selection = Route.appendCell(Route.createSelection({ active: true }), [0, 0]).selection;
  const result = Route.appendCell(selection, [2, 0]);
  assert.equal(result.ok, false);
  assert.equal(result.code, Route.ROUTE_ERROR.NONCONTIGUOUS_ROUTE);
  assert.equal(result.selection.cells.length, 1);
  assert.equal(result.selection.error, Route.ROUTE_ERROR.NONCONTIGUOUS_ROUTE);
});

test('clicking the immediately previous cell backtracks one step', () => {
  const { Route } = loadRouteRuntime();
  let selection = Route.createSelection({ active: true, cells: [[0, 0], [1, 0], [2, 0]] });
  const result = Route.appendCell(selection, [1, 0]);
  assert.equal(result.ok, true);
  assert.equal(result.action, 'backtrack');
  assert.equal(result.selection.cells.length, 2);
  assert.equal(result.selection.cells[1].Q, 1);
});

test('route selection rejects loops through an earlier selected cell', () => {
  const { Route } = loadRouteRuntime();
  const selection = Route.createSelection({
    active: true,
    cells: [[0, 0], [1, 0], [1, -1]],
  });
  const result = Route.appendCell(selection, [0, 0]);
  assert.equal(result.ok, false);
  assert.equal(result.code, Route.ROUTE_ERROR.ROUTE_LOOP);
  assert.equal(result.selection.cells.length, 3);
});

test('route selection can seed from a supplied party start cell', () => {
  const { Route } = loadRouteRuntime();
  const result = Route.setActive(Route.createSelection(), true, [12, 34]);
  assert.equal(result.ok, true);
  assert.equal(result.selection.active, true);
  assert.equal(result.selection.cells.length, 1);
  assert.equal(result.selection.cells[0].Q, 12);
  assert.equal(result.selection.cells[0].R, 34);
});

test('selected authored route becomes a v0.7 Travel Activity plan', () => {
  const { context, Route } = loadRouteRuntime();
  const actor = vm.runInContext(`ADNDDocuments.createActor({
    id: 'actor-1',
    type: 'character',
    campaignId: 'camp-1',
    name: 'actor-1',
    runtime: {
      lastResolvedTick: 100,
      availableAtTick: 100,
      activityId: null
    }
  })`, context);
  const selection = Route.createSelection({
    active: false,
    cells: [[0, 0], [1, 0], [2, 0]],
  });
  context.__actor = actor;
  const input = vm.runInContext(`({
    id: 'activity-route-1',
    campaignId: 'camp-1',
    actors: [__actor],
    worldTick: 100,
    movementProfiles: {
      'actor-1': { movementRate: 120 }
    },
    routeMilesPerStep: 3,
    subhexes: {
      subhex_1_0: { terrain: 'forest' }
    },
    parentTerrain: {
      '0-0': 'clear'
    },
    ownerOf: () => ({ col: 0, row: 0 })
  })`, context);
  const result = Route.buildTravelPlan(selection, input);

  assert.equal(result.ok, true);
  assert.equal(result.activity.type, 'travel');
  assert.equal(result.activity.system.durationSource, 'osric-outdoor-route');
  assert.equal(result.activity.system.outdoorTravel.routeSource, 'authored-map');
  assert.equal(result.activity.system.outdoorTravel.distanceMiles, 6);
  assert.equal(result.activity.system.outdoorTravel.segmentCount, 2);
  assert.equal(result.activity.system.outdoorTravel.segments[0].mapTerrain, 'forest');
  assert.equal(result.activity.system.outdoorTravel.segments[0].terrain, 'rugged');
  assert.equal(result.activity.system.outdoorTravel.segments[1].mapTerrain, 'clear');
  assert.equal(result.actorRuntimePatches.length, 1);
  assert.equal(result.actorRuntimePatches[0].actorId, 'actor-1');
});

test('travel-plan adapter refuses an incomplete selected route', () => {
  const { Route } = loadRouteRuntime();
  const result = Route.buildTravelPlan(Route.createSelection({ cells: [[0, 0]] }), {
    routeMilesPerStep: 3,
    subhexes: {},
    parentTerrain: {},
    ownerOf: () => ({ col: 0, row: 0 }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, Route.ROUTE_ERROR.ROUTE_TOO_SHORT);
});

test('player map seeds a route only when loaded characters share one subhex', () => {
  const context = vm.createContext({
    console,
    URLSearchParams,
    location: { search: '?camp=camp-1' },
  });
  for (const file of ['adnd-documents.js', 'adnd-world-clock.js', 'adnd-activities.js', 'adnd-map-route.js']){
    new vm.Script(fs.readFileSync(publicFile(file), 'utf8'), { filename: file }).runInContext(context);
  }
  const MapView = new vm.Script(
    fs.readFileSync(publicFile('adnd-map-view.js'), 'utf8') + '\nADNDMapView',
    { filename: 'adnd-map-view.js' },
  ).runInContext(context);

  MapView.state.data = {
    characters: {
      a: { currentLocation: { subHexCoord: [8, 9] } },
      b: { currentLocation: { subHexCoord: [8, 9] } },
    },
  };
  let start = MapView.uniquePartyStartCell();
  assert.equal(start.Q, 8);
  assert.equal(start.R, 9);

  MapView.state.data.characters.b.currentLocation.subHexCoord = [9, 9];
  start = MapView.uniquePartyStartCell();
  assert.equal(start, null);
});

test('index loads the pure route adapter after Activities and before the map view', () => {
  const indexPath = fileURLToPath(new URL('../public/index.html', import.meta.url));
  const html = fs.readFileSync(indexPath, 'utf8');
  const activities = html.indexOf('adnd-activities.js');
  const route = html.indexOf('adnd-map-route.js');
  const map = html.indexOf('adnd-map-view.js');
  assert.ok(activities >= 0);
  assert.ok(route > activities);
  assert.ok(map > route);
});


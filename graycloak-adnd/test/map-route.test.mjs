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


function realm(context, value){
  context.__realm = JSON.stringify(value);
  return vm.runInContext('JSON.parse(__realm)', context);
}

test('findRoute prefers cheaper terrain over fewer hops and refuses impassable water', () => {
  const { context, Route } = loadRouteRuntime();
  const subhexes = {};
  // Straight line (10,20)→(14,20) runs through mountains; a plains detour
  // one row down costs fewer days despite being longer.
  for (let q = 11; q <= 13; q++) subhexes[`subhex_${q}_20`] = { owner: { col: 1, row: 1 }, terrain: 'mountains' };
  for (let q = 10; q <= 14; q++) subhexes[`subhex_${q}_21`] = { owner: { col: 1, row: 1 }, terrain: 'plains' };
  subhexes['subhex_14_20'] = { owner: { col: 1, row: 1 }, terrain: 'plains' };
  subhexes['subhex_10_20'] = { owner: { col: 1, row: 1 }, terrain: 'plains' };
  context.__json = JSON.stringify({ subhexes, parentTerrain: {} });
  const input = vm.runInContext('JSON.parse(__json)', context);
  const found = Route.findRoute(realm(context, { Q: 10, R: 20 }), realm(context, { Q: 14, R: 20 }), input);
  assert.equal(found.ok, true, JSON.stringify(found));
  assert.ok(found.cells.length >= 5);
  assert.deepEqual([found.cells[0].Q, found.cells[0].R], [10, 20]);
  const last = found.cells[found.cells.length - 1];
  assert.deepEqual([last.Q, last.R], [14, 20]);
  assert.ok(found.cells.every(c => !(c.R === 20 && c.Q >= 11 && c.Q <= 13)), 'detours around the mountains');
  for (let i = 1; i < found.cells.length; i++) assert.equal(Route.axialDistance(found.cells[i - 1], found.cells[i]), 1);

  subhexes['subhex_12_21'] = { owner: { col: 1, row: 1 }, terrain: 'water_fresh' };
  context.__json = JSON.stringify({ subhexes, parentTerrain: {} });
  const viaMountains = Route.findRoute(realm(context, { Q: 10, R: 20 }), realm(context, { Q: 14, R: 20 }), vm.runInContext('JSON.parse(__json)', context));
  assert.equal(viaMountains.ok, true);
  assert.ok(viaMountains.cells.some(c => c.R === 20 && c.Q === 12) || viaMountains.cells.length > 5, 'lake forces another way');

  const island = Route.findRoute(realm(context, { Q: 10, R: 20 }), realm(context, { Q: 50, R: 50 }), vm.runInContext('JSON.parse(__json)', context));
  assert.equal(island.ok, false);
  assert.equal(island.code, 'no-route');
});

test('appendPath appends adjacent cells directly and expands distant ones into a chain', () => {
  const { context, Route } = loadRouteRuntime();
  const subhexes = {};
  for (let q = 10; q <= 14; q++) subhexes[`subhex_${q}_20`] = { owner: { col: 1, row: 1 }, terrain: 'plains' };
  context.__json = JSON.stringify({ subhexes, parentTerrain: {} });
  const input = vm.runInContext('JSON.parse(__json)', context);
  let sel = Route.createSelection();
  sel = Route.appendPath(sel, realm(context, { Q: 10, R: 20 }), input).selection;
  const r1 = Route.appendPath(sel, realm(context, { Q: 11, R: 20 }), input);
  assert.equal(r1.action, 'append');
  const r2 = Route.appendPath(r1.selection, realm(context, { Q: 14, R: 20 }), input);
  assert.equal(r2.ok, true);
  assert.equal(r2.action, 'path');
  assert.equal(r2.added, 3);
  assert.equal(r2.selection.cells.length, 5);
});

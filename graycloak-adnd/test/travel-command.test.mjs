import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const documentsPath = fileURLToPath(new URL('../public/adnd-documents.js', import.meta.url));
const clockPath = fileURLToPath(new URL('../public/adnd-world-clock.js', import.meta.url));
const activitiesPath = fileURLToPath(new URL('../public/adnd-activities.js', import.meta.url));
const commandsPath = fileURLToPath(new URL('../public/adnd-commands.js', import.meta.url));

const source = [
  fs.readFileSync(documentsPath, 'utf8'),
  fs.readFileSync(clockPath, 'utf8'),
  fs.readFileSync(activitiesPath, 'utf8'),
  fs.readFileSync(commandsPath, 'utf8'),
  '({ Documents: ADNDDocuments, Clock: ADNDWorldClock, Activities: ADNDActivities, Commands: ADNDCommands })',
].join('\n');
const { Documents, Clock, Commands } = new vm.Script(source, {
  filename: 'travel-command-runtime.js',
}).runInThisContext();

function actor(id, worldTick = 100, cell = [10, 20]) {
  return Documents.createActor({
    id,
    type: 'character',
    campaignId: 'campaign-1',
    name: id,
    currentLocation: { regionalHexId: 'D4-86', subHexCoord: cell },
    runtime: {
      lastResolvedTick: worldTick,
      availableAtTick: null,
      activityId: null,
    },
  });
}

function intent(overrides = {}) {
  return Commands.createBeginTravelIntent({
    commandId: 'command-travel-1',
    activityId: 'activity-travel-1',
    campaignId: 'campaign-1',
    expectedWorldTick: 100,
    actorIds: ['char-val'],
    routeCells: [[10, 20], [11, 20]],
    ...overrides,
  });
}

function context(overrides = {}) {
  return {
    campaignId: 'campaign-1',
    campaign: { worldTick: 100 },
    actors: { 'char-val': actor('char-val') },
    authoritativeMovementProfiles: {
      'char-val': { movementRate: 120 },
    },
    routeMilesPerStep: 3,
    subhexes: {
      subhex_11_20: { terrain: 'mountains' },
    },
    parentTerrain: {},
    rulesVersion: 'osric3-rules@0.9.0',
    ...overrides,
  };
}

test('Begin Travel intent contains only player intent, not client-computed outcomes', () => {
  const result = intent({
    durationTicks: 1,
    availableAtTick: 101,
    movementProfiles: { 'char-val': { movementRate: 99999 } },
    terrain: 'level',
  });

  assert.equal(result.ok, true);
  assert.equal(result.command.type, 'beginTravel');
  assert.equal(result.command.commandId, 'command-travel-1');
  assert.equal(result.command.activityId, 'activity-travel-1');
  assert.equal(result.command.actorIds[0], 'char-val');
  assert.equal(result.command.routeCells.length, 2);
  assert.equal(Object.hasOwn(result.command, 'durationTicks'), false);
  assert.equal(Object.hasOwn(result.command, 'availableAtTick'), false);
  assert.equal(Object.hasOwn(result.command, 'movementProfiles'), false);
  assert.equal(Object.hasOwn(result.command, 'terrain'), false);
});

test('authoritative executor recomputes travel from trusted terrain and movement state', () => {
  const command = intent().command;
  // A malicious caller can append outcome-looking data to the raw command. The
  // executor normalizes back to the client-safe intent shape before resolving.
  command.movementProfiles = { 'char-val': { movementRate: 99999 } };
  command.durationTicks = 1;
  command.terrain = 'level';

  const result = Commands.executeBeginTravelCommand(command, context());

  assert.equal(result.ok, true);
  assert.equal(result.activity.system.durationSource, 'osric-outdoor-route');
  assert.equal(result.activity.system.outdoorTravel.distanceMiles, 3);
  assert.equal(result.activity.system.outdoorTravel.partyMovementRate, 120);
  // Mountains classify as very rugged. MR 120 => 12 miles/day; 3 miles = 1/4 day.
  assert.equal(result.activity.system.durationTicks, Clock.TICKS_PER_DAY / 4);
  assert.equal(result.activity.availableAtTick, 100 + Clock.TICKS_PER_DAY / 4);
  assert.equal(result.actorRuntimePatches[0].runtime.activityId, 'activity-travel-1');
  assert.equal(result.event.type, 'travel.started');
  assert.equal(result.event.commandId, 'command-travel-1');
  assert.equal(result.event.rulesVersion, 'osric3-rules@0.9.0');
  assert.equal(result.commitBundle.idempotencyKey, 'command-travel-1');
  assert.equal(result.commitBundle.createActivity.id, 'activity-travel-1');
  assert.equal(result.commitBundle.createEvent.id, 'command-travel-1');
});

test('Begin Travel rejects a stale client worldTick', () => {
  const result = Commands.executeBeginTravelCommand(intent().command, context({
    campaign: { worldTick: 101 },
  }));
  assert.equal(result.ok, false);
  assert.equal(result.code, Commands.COMMAND_ERROR.STALE_WORLD_TICK);
  assert.equal(result.expectedWorldTick, 100);
  assert.equal(result.authoritativeWorldTick, 101);
});

test('Begin Travel rechecks that every Actor is still at the route origin', () => {
  const moved = actor('char-val', 100, [9, 20]);
  const result = Commands.executeBeginTravelCommand(intent().command, context({
    actors: { 'char-val': moved },
  }));
  assert.equal(result.ok, false);
  assert.equal(result.code, Commands.COMMAND_ERROR.ACTOR_NOT_AT_ORIGIN);
  assert.equal(result.actorId, 'char-val');
});

test('Begin Travel refuses missing authoritative movement instead of trusting preview MR', () => {
  const result = Commands.executeBeginTravelCommand(intent().command, context({
    authoritativeMovementProfiles: {},
  }));
  assert.equal(result.ok, false);
  assert.equal(result.code, Commands.COMMAND_ERROR.MISSING_AUTHORITATIVE_MOVEMENT);
  assert.equal(result.missingActorIds[0], 'char-val');
});

test('Begin Travel reuses Activity time guards for behind or reserved Actors', () => {
  const behind = actor('char-val', 90);
  const result = Commands.executeBeginTravelCommand(intent().command, context({
    actors: { 'char-val': behind },
  }));
  assert.equal(result.ok, false);
  assert.equal(result.code, Commands.COMMAND_ERROR.TRAVEL_REJECTED);
  assert.equal(result.cause, 'actor-not-available');
});

test('successful command returns transaction preconditions without mutating source Actors', () => {
  const sourceActor = actor('char-val');
  const result = Commands.executeBeginTravelCommand(intent().command, context({
    actors: { 'char-val': sourceActor },
  }));

  assert.equal(result.ok, true);
  assert.equal(sourceActor.runtime.activityId, null);
  assert.equal(sourceActor.runtime.availableAtTick, null);
  assert.equal(result.commitBundle.preconditions.campaign.worldTick, 100);
  assert.equal(result.commitBundle.preconditions.actors[0].actorId, 'char-val');
  assert.equal(result.commitBundle.preconditions.actors[0].runtime.lastResolvedTick, 100);
  assert.equal(result.commitBundle.preconditions.commandEventMustNotExist, 'command-travel-1');
  assert.equal(result.commitBundle.preconditions.activityMustNotExist, 'activity-travel-1');
});

test('Begin Travel intent requires stable ids, current tick, unique Actors, and adjacent route cells', () => {
  assert.equal(intent({ commandId: null }).code, Commands.COMMAND_ERROR.INVALID_COMMAND_ID);
  assert.equal(intent({ activityId: null }).code, Commands.COMMAND_ERROR.INVALID_ACTIVITY_ID);
  assert.equal(intent({ expectedWorldTick: -1 }).code, Commands.COMMAND_ERROR.INVALID_EXPECTED_WORLD_TICK);
  assert.equal(intent({ actorIds: ['char-val', 'char-val'] }).code, Commands.COMMAND_ERROR.DUPLICATE_ACTOR);
  assert.equal(intent({ routeCells: [[10, 20], [12, 20]] }).code, Commands.COMMAND_ERROR.INVALID_ROUTE);
});

test('player map packages selected route and party into a client-safe Begin Travel intent', () => {
  const publicFile = name => fileURLToPath(new URL(`../public/${name}`, import.meta.url));
  const context = vm.createContext({
    console,
    URLSearchParams,
    location: { search: '?camp=campaign-1' },
  });
  for (const file of [
    'adnd-documents.js', 'adnd-world-clock.js', 'adnd-activities.js',
    'adnd-commands.js', 'adnd-map-route.js', 'adnd-travel-party.js',
  ]){
    new vm.Script(fs.readFileSync(publicFile(file), 'utf8'), { filename: file }).runInContext(context);
  }
  const MapView = new vm.Script(
    fs.readFileSync(publicFile('adnd-map-view.js'), 'utf8') + '\nADNDMapView',
    { filename: 'adnd-map-view.js' },
  ).runInContext(context);

  MapView.state.data = vm.runInContext(`({
    campaign: { worldTick: 100 },
    characters: {
      'char-val': ADNDDocuments.createActor({
        id: 'char-val',
        campaignId: 'campaign-1',
        name: 'Val',
        currentLocation: { subHexCoord: [10, 20] },
        runtime: { lastResolvedTick: 100, availableAtTick: null, activityId: null }
      })
    }
  })`, context);
  MapView.state.route = vm.runInContext(
    "ADNDMapRoute.createSelection({ cells: [[10,20],[11,20]] })", context,
  );
  MapView.state.travelParty = vm.runInContext(`({
    selectedActorIds: ['char-val'],
    movementOverrides: { 'char-val': '99999' },
    seedKey: '10,20|char-val'
  })`, context);

  const result = MapView.buildBeginTravelIntent({
    commandId: 'command-map-1',
    activityId: 'activity-map-1',
  });

  assert.equal(result.ok, true);
  assert.equal(result.command.expectedWorldTick, 100);
  assert.equal(result.command.actorIds[0], 'char-val');
  assert.equal(result.command.routeCells[1].Q, 11);
  assert.equal(Object.hasOwn(result.command, 'movementProfiles'), false);
});

test('index loads command boundary after Activities and before the map view', () => {
  const indexPath = fileURLToPath(new URL('../public/index.html', import.meta.url));
  const html = fs.readFileSync(indexPath, 'utf8');
  const activities = html.indexOf('adnd-activities.js');
  const commands = html.indexOf('adnd-commands.js');
  const map = html.indexOf('adnd-map-view.js');
  assert.ok(activities >= 0);
  assert.ok(commands > activities);
  assert.ok(map > commands);
});

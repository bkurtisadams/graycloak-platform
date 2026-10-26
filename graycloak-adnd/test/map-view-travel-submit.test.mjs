import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const publicFile = name => fileURLToPath(new URL(`../public/${name}`, import.meta.url));

function loadRuntime({ fetch, user, db } = {}){
  const context = vm.createContext({
    console, URLSearchParams,
    location: { search: '?camp=camp-1' },
    requestAnimationFrame: () => 0,
    fetch,
    ADNDAuth: {
      getUser: () => user === undefined ? { getIdToken: async () => 'tok-1' } : user,
      getDb: () => db || null,
      onAuthChange: () => {},
    },
  });
  for (const file of [
    'adnd-documents.js',
    'adnd-world-clock.js',
    'adnd-activities.js',
    'adnd-commands.js',
    'adnd-map-route.js',
    'adnd-travel-party.js',
    'adnd-map-view.js',
  ]) {
    new vm.Script(fs.readFileSync(publicFile(file), 'utf8'), {
      filename: file,
      importModuleDynamically: vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER,
    }).runInContext(context);
  }
  const View = vm.runInContext('ADNDMapView', context);
  return { context, View };
}

const ENGINE_URL = new URL('../public/vendor/map-engine/index.js', import.meta.url).href;

async function seedParty(context, View){
  assert.ok(await View.ready(ENGINE_URL), 'vendored map-engine loads');
  context.__json = JSON.stringify({
    id: 'a', type: 'character', campaignId: 'camp-1', name: 'Alpha',
    currentLocation: { subHexCoord: [10, 20] },
    runtime: { lastResolvedTick: 100, availableAtTick: 100, activityId: null },
    movementRate: 12,
  });
  const alpha = vm.runInContext('ADNDDocuments.createActor(JSON.parse(__json))', context);
  // Runtime files type-check with their own realm's isPlainObject, so world
  // data must be created inside the vm context.
  // (The vendored engine is loaded from the main realm, so its ownerOf()
  // results fail the runtime's realm check; author the route cells explicitly.)
  View.state.data = realmValue(context, {
    flanaess: {},
    subhex: {
      subhex_11_20: { owner: { col: 71, row: 52 }, terrain: 'plains' },
      subhex_12_20: { owner: { col: 71, row: 52 }, terrain: 'plains' },
    },
    lakes: {}, paths: {}, regions: {}, settlements: {}, freeholds: {},
    campaign: { worldTick: 100 },
    characters: {},
  });
  View.state.data.characters.a = alpha;
  View.addRouteCell(realmValue(context, { Q: 10, R: 20 }));
  View.addRouteCell(realmValue(context, { Q: 11, R: 20 }));
}

function realmValue(context, input){
  context.__json = JSON.stringify(input);
  return vm.runInContext('JSON.parse(__json)', context);
}

test('beginTravelRequest wraps the client-safe intent with the bearer token', () => {
  const { View } = loadRuntime();
  const intent = { ok: true, command: { type: 'beginTravel', commandId: 'c1' } };
  const req = View.beginTravelRequest(intent, 'tok-1');
  assert.equal(req.ok, true);
  assert.equal(req.url, '/api/commands/begin-travel');
  assert.equal(req.init.method, 'POST');
  assert.equal(req.init.headers.Authorization, 'Bearer tok-1');
  assert.equal(req.init.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(req.init.body), intent.command);
  assert.equal(View.beginTravelRequest(intent, null).code, 'unauthenticated');
  assert.equal(View.beginTravelRequest({ ok: false, code: 'route-too-short' }, 'tok-1').code, 'invalid-intent');
});

test('travelResultText renders committed, replayed, and refused results', () => {
  const { View } = loadRuntime();
  assert.equal(View.travelResultText(null), '');
  assert.match(View.travelResultText({ ok: true, activityId: 'act-1', durationTicks: 14400, availableAtTick: 14500 }),
    /^travel begun · activity act-1 · 1d · arrive tick 14500$/);
  assert.match(View.travelResultText({ ok: true, idempotentReplay: true, activityId: 'act-1' }), /already under way/);
  assert.match(View.travelResultText({ ok: false, code: 'stale-world-tick' }), /world clock moved on/);
  assert.match(View.travelResultText({ ok: false, code: 'actor-forbidden', actorId: 'a' }), /do not control.*actor a/);
  assert.match(View.travelResultText({ ok: false, code: 'travel-rejected' }), /rules check/);
  assert.match(View.travelResultText({ ok: false, httpStatus: 401, code: 'unauthenticated' }), /sign in again/);
  assert.match(View.travelResultText({ ok: false, code: 'something-new' }), /travel refused: something-new/);
});

test('submitBeginTravel POSTs the intent, reloads campaign state, and clears the route', async () => {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url, init });
    return {
      status: 200,
      json: async () => ({ ok: true, status: 'committed', commandId: JSON.parse(init.body).commandId,
        activityId: JSON.parse(init.body).activityId, actorIds: ['a'], availableAtTick: 1540, durationTicks: 1440 }),
    };
  };
  const reloaded = { campaign: { worldTick: 100 }, character: {
    id: 'a', type: 'character', campaignId: 'camp-1', name: 'Alpha',
    currentLocation: { subHexCoord: [10, 20] },
    runtime: { lastResolvedTick: 100, availableAtTick: 1540, activityId: 'act-x' },
  } };
  const db = {
    collection: name => ({
      doc: () => ({ get: async () => ({ exists: true, data: () => reloaded.campaign }) }),
      where: () => ({ get: async () => ({ forEach: fn => fn({ id: 'a', data: () => reloaded.character }) }) }),
    }),
  };
  const { context, View } = loadRuntime({ fetch, db });
  await seedParty(context, View);
  assert.equal(View.beginTravelDisabledReason(), null);

  const result = await View.submitBeginTravel();
  assert.equal(result.ok, true);
  assert.equal(result.httpStatus, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/commands/begin-travel');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer tok-1');
  const sent = JSON.parse(calls[0].init.body);
  assert.equal(sent.type, 'beginTravel');
  assert.match(sent.commandId, /^command-travel-/);
  assert.match(sent.activityId, /^activity-travel-/);
  assert.equal(sent.campaignId, 'camp-1');
  assert.equal(sent.expectedWorldTick, 100);
  assert.deepEqual(sent.actorIds, ['a']);
  assert.deepEqual(sent.routeCells, [{ Q: 10, R: 20 }, { Q: 11, R: 20 }]);
  assert.equal(sent.movementRate, undefined);
  assert.equal(sent.durationTicks, undefined);

  assert.equal(View.routeCells().length, 0, 'route cleared after commit');
  assert.equal(View.state.data.characters.a.runtime.activityId, 'act-x', 'Actors reloaded from Firestore');
  assert.equal(View.state.travelSubmit.inFlight, false);
  assert.equal(View.state.travelSubmit.result.ok, true);
});

test('submitBeginTravel surfaces a 409 service refusal and keeps the route', async () => {
  const fetch = async () => ({ status: 409, json: async () => ({ ok: false, code: 'stale-world-tick', stage: 'execute' }) });
  const { context, View } = loadRuntime({ fetch });
  await seedParty(context, View);
  const result = await View.submitBeginTravel();
  assert.equal(result.ok, false);
  assert.equal(result.code, 'stale-world-tick');
  assert.equal(result.httpStatus, 409);
  assert.equal(View.routeCells().length, 2, 'route kept so the player can retry');
  assert.match(View.travelResultText(result), /stage execute/);
  const ids = View.state.travelSubmit.ids;
  assert.ok(ids && ids.commandId && ids.activityId, 'attempt ids minted');
  await View.submitBeginTravel();
  assert.deepEqual(View.state.travelSubmit.ids, ids, 'retry reuses the same command/activity ids');
  View.addRouteCell(realmValue(context, { Q: 12, R: 20 }));
  assert.equal(View.state.travelSubmit.ids, null, 'route change drops the attempt ids');
});

test('submitBeginTravel reports network and unreadable-reply failures without throwing', async () => {
  const { context, View } = loadRuntime({ fetch: async () => { throw new Error('offline'); } });
  await seedParty(context, View);
  assert.equal((await View.submitBeginTravel()).code, 'network-error');

  const bad = loadRuntime({ fetch: async () => ({ status: 502, json: async () => { throw new Error('html'); } }) });
  await seedParty(bad.context, bad.View);
  const result = await bad.View.submitBeginTravel();
  assert.equal(result.code, 'invalid-response');
  assert.equal(result.httpStatus, 502);
});

test('submitBeginTravel refuses without a signed-in user and never calls fetch', async () => {
  let called = 0;
  const { context, View } = loadRuntime({ fetch: async () => { called++; }, user: null });
  await seedParty(context, View);
  const result = await View.submitBeginTravel();
  assert.equal(result.code, 'unauthenticated');
  assert.equal(called, 0);
});

test('beginTravelDisabledReason names the blocking condition', async () => {
  const { context, View } = loadRuntime();
  assert.equal(View.beginTravelDisabledReason(), 'no-world-tick');
  await seedParty(context, View);
  View.state.data.campaign = {};
  assert.equal(View.beginTravelDisabledReason(), 'no-world-tick');
  View.state.data.campaign = { worldTick: 100 };
  View.state.travelSubmit.inFlight = true;
  assert.equal(View.beginTravelDisabledReason(), 'in-flight');
});

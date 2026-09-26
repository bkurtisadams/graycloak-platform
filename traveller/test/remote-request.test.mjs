// v0.329.0: a player's button carried out on the server, with no referee page
// open. The store here is memory; traveller/functions/ gives it Firestore.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDocumentRegistry, createMemoryStorage } from '../src/document-registry.js';
import { createCampaignHome, importCampaignHome, StaleCampaignHomeError } from '../src/campaign-home.js';
import { applyRemoteRequest, playerMayRun, playerSituation } from '../src/remote-request.js';
import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js';
import { createShipDocument } from '../vendor/classic-traveller-rules/index.js';

const fixture = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'Sea-of-Suns-v0.11.2-buggy.campaign.json');
const OWNER = 'referee-1';
const PLAYER = 'player-1';

async function bundleAtAster(referee = 'game') {
  const bundle = JSON.parse(await readFile(fixture, 'utf8'));
  bundle.campaign.location = { systemId: 'aster', systemName: 'Aster', worldId: 'aster-main', worldName: 'Aster' };
  const old = bundle.documents.ships[0];
  const crewAssignments = [{ role: 'pilot', characterId: 'char-04164baa70c3b5a6', characterName: 'Hawkeye' }, { role: 'medic', characterId: 'char-04164baa70c3b5a6', characterName: 'Hawkeye' }];
  bundle.documents.ships[0] = createShipDocument({
    designKey: 'type-a-free-trader', id: old.identity.id, name: 'Marisol', registry: 'A-1', authority: old.authority, crewAssignments,
    state: { currentFuelTons: 30,
      finances: { balanceCr: 500000, ledger: [{ id: 'opening', date: '106-4800', kind: 'transfer', description: 'Opening balance', amountCr: 500000, balanceCr: 500000 }] },
      portCall: { systemId: 'aster', arrivalDate: '106-4800', berthingDueCr: 100, berthingPaid: true } }
  });
  const registry = createDocumentRegistry({ storage: createMemoryStorage() });
  const { campaign } = registry.putBundle(bundle);
  const put = registry.resolveCampaign(campaign.identity.id).campaign;
  registry.put({ ...put, roster: { ...(put.roster ?? {}), settings: { referee } } });
  return { campaignId: campaign.identity.id, bundle: registry.buildBundle(campaign.identity.id) };
}

// Memory standing in for Firestore, with the same revision rule as
// client/publish.js saveCampaignHome.
function memoryStore(home, { seated = [PLAYER] } = {}) {
  const store = {
    home, envelopes: [], saves: 0, interfere: null,
    loadHome: async () => JSON.parse(JSON.stringify(store.home)),
    isSeated: async (uid) => seated.includes(uid),
    saveHome: async (next, envelope, { expectedRevision }) => {
      if (store.interfere) { const bump = store.interfere; store.interfere = null; bump(store); }
      const current = store.home?.revision ?? null;
      if (current !== null && current !== expectedRevision) throw new StaleCampaignHomeError({ campaignId: next.campaignId, expectedRevision, currentRevision: current });
      if (current !== null && next.revision !== current + 1) throw new StaleCampaignHomeError({ campaignId: next.campaignId, expectedRevision, currentRevision: current });
      store.home = JSON.parse(JSON.stringify(next));
      store.envelopes.push(JSON.parse(JSON.stringify(envelope)));
      store.saves += 1;
      store.revisions = [...(store.revisions ?? []), next.revision];
      return next.revision;
    }
  };
  return store;
}

async function setup(referee = 'game') {
  const { campaignId, bundle } = await bundleAtAster(referee);
  const store = memoryStore(createCampaignHome(bundle, { ownerUid: OWNER, revision: 3 }));
  return { campaignId, store };
}
const apply = (campaignId, store, command, extra = {}) => applyRemoteRequest({ campaignId, store, subsector: FAR_MERIDIAN_SUBSECTOR, request: { uid: PLAYER, command, ...extra } });
const dateOf = (store) => importCampaignHome(store.home).bundle.campaign.time;

test('v0.329.0 a player\u2019s list: the ship\u2019s business, not the referee\u2019s', () => {
  for (const command of ['trip:wait', 'trip:choose-destination:calder', 'trip:depart', 'speculation:buy', 'patrons:seek', 'patrons:task:contract-1', 'persons:jail', 'shipfight:fire', 'repair:crew:hull', 'shipyard:turret:add']) {
    assert.equal(playerMayRun(command), true, command);
  }
  for (const command of ['referee:move:aster', 'time:set', 'time:pass', 'sector:rechart:G', 'persons:clear', 'patrons:referee', 'patrons:suggest', 'contract:complete:x', 'edit:ship', 'fight:setup', 'shipfight:vector-adjudicate', 'chat:clear', '', 'tripwire', 'speculation:buyall']) {
    assert.equal(playerMayRun(command), false, command);
  }
});

test('v0.329.0 the game refereeing, a seated player\u2019s request is carried out, saved and published', async () => {
  const { campaignId, store } = await setup('game');
  const before = dateOf(store);
  const result = await apply(campaignId, store, 'trip:wait');
  assert.equal(result.ok, true, result.message);
  assert.ok(result.revision > 3);
  assert.equal(store.home.revision, result.revision);
  assert.notDeepEqual(dateOf(store), before, 'a day passed');
  assert.equal(store.saves, 1, 'one save per request');
  assert.equal(store.home.ownerUid, OWNER, 'the campaign stays the referee\u2019s');
  const envelope = store.envelopes.at(-1);
  assert.equal(envelope.referee, 'game');
  assert.equal(envelope.situation.kind, 'port');
  assert.ok(envelope.situation.steps.some((step) => step.command === 'trip:wait'), 'the next press is published');
  assert.ok(envelope.situation.steps.every((step) => step.command === null || playerMayRun(step.command)));
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(envelope)));
});

test('v0.329.0 refused: a person refereeing, a player not seated, a referee\u2019s command', async () => {
  const person = await setup('person');
  assert.match((await apply(person.campaignId, person.store, 'trip:wait')).message, /a person referees/);
  assert.equal(person.store.saves, 0);
  const { campaignId, store } = await setup('game');
  const stranger = await applyRemoteRequest({ campaignId, store, subsector: FAR_MERIDIAN_SUBSECTOR, request: { uid: 'someone-else', command: 'trip:wait' } });
  assert.match(stranger.message, /not a player in this campaign/);
  assert.match((await apply(campaignId, store, 'referee:move:calder')).message, /cannot ask for that/);
  assert.match((await apply(campaignId, store, 'time:set')).message, /cannot ask for that/);
  assert.equal(store.saves, 0);
  // A command the situation does not allow is the session's own refusal.
  const wrong = await apply(campaignId, store, 'trip:jump-week');
  assert.equal(wrong.ok, false);
  assert.equal(store.saves, 0);
});

test('v0.329.0 a request that meets a newer save is carried out again from it', async () => {
  const { campaignId, store } = await setup('game');
  // Someone (the referee's page) saves between this request's load and save.
  store.interfere = (s) => { s.home = { ...s.home, revision: s.home.revision + 1 }; };
  const result = await apply(campaignId, store, 'trip:wait');
  assert.equal(result.ok, true, result.message);
  assert.equal(store.home.revision, result.revision);
});

test('v0.329.0 a player course, set and published', async () => {
  const { campaignId, store } = await setup('game');
  const result = await apply(campaignId, store, 'trip:choose-destination:calder');
  assert.equal(result.ok, true, result.message);
  const situation = store.envelopes.at(-1).situation;
  assert.equal(situation.courseId, 'calder');
  assert.equal(situation.canSetCourse, true);
});

test('v0.329.0 with a person refereeing the situation is shown without buttons', () => {
  const view = { situation: { kind: 'port', title: 'Port call', detail: 'Aster' }, steps: [{ id: 'wait', title: 'Wait', command: 'trip:wait', verb: 'Wait' }, { id: 'x', title: 'X', command: 'referee:move:aster' }], next: { title: 'n', actions: [{ command: 'trip:depart', label: 'Depart' }] }, done: [], jobs: [] };
  const person = playerSituation(view, { mode: 'person' });
  assert.ok(person.steps.every((step) => step.command === null));
  assert.equal(person.next.actions[0].command, null);
  const game = playerSituation(view, { mode: 'game' });
  assert.equal(game.steps[0].command, 'trip:wait');
  assert.equal(game.steps[1].command, null, 'never a referee\u2019s command');
  assert.equal(game.next.actions[0].command, 'trip:depart');
});

// v0.338.0: a player brings in his own character's mustering-out ship only.
test('v0.338.0 a player may ask to bring in only his own character\u2019s ship', async () => {
  assert.equal(playerMayRun('ship:from-benefit:char-x'), true);
  assert.equal(playerMayRun('ship:make-active:ship-x'), false, 'changing ships stays the referee\u2019s for now');
  const { campaignId, store } = await setup('game');
  const refused = await apply(campaignId, store, 'ship:from-benefit:char-04164baa70c3b5a6');
  assert.equal(refused.ok, false);
  assert.match(refused.message, /only the player of that character/);
  assert.equal(store.saves, 0);
});

// v0.378.0 (Kurt, Nov 2026): the Money tab — every account, and one transfer
// from any account to any other; players give to one another.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDocumentRegistry, createMemoryStorage } from '../src/document-registry.js';
import { createPlaySession } from '../src/play-session.js';
import { playerSituation } from '../src/player-requests.js';
import { createCampaignHome, importCampaignHome, StaleCampaignHomeError } from '../src/campaign-home.js';
import { applyRemoteRequest } from '../src/remote-request.js';
import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js';

const fixture = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'Sea-of-Suns-v0.11.2-buggy.campaign.json');
const HAWKEYE = 'char-04164baa70c3b5a6';

async function setup() {
  const bundle = JSON.parse(await readFile(fixture, 'utf8'));
  bundle.campaign.location = { systemId: 'orison', systemName: 'Orison', worldId: 'orison-main', worldName: 'Orison' };
  const registry = createDocumentRegistry({ storage: createMemoryStorage() });
  const { campaign } = registry.putBundle(bundle);
  const session = createPlaySession({ registry, campaignId: campaign.identity.id, subsector: FAR_MERIDIAN_SUBSECTOR });
  session.run('ship:new', { fight: { value: { designKey: 'type-a-free-trader', name: 'Majestic', holder: { kind: 'patron', name: 'House Sorell' } } } });
  return { registry, session, campaignId: campaign.identity.id };
}
const cash = (session, id) => session.resolved.characters.find((entry) => entry.identity.id === id).finances.credits;
const account = (session, name) => session.resolved.ships.find((entry) => entry.identity.name === name).state.finances.balanceCr;

test('v0.378.0 the Money view lists every character and ship, the travellers\u2019 ship first', async () => {
  const { session } = await setup();
  const money = session.view().money;
  assert.ok(money.characters.some((entry) => entry.id === HAWKEYE));
  assert.equal(money.ships[0].name, 'Marisol');
  assert.equal(money.ships[0].travellers, true);
  assert.ok(money.ships.some((entry) => entry.name === 'Majestic'));
  assert.equal(money.partyCr, money.characters.reduce((sum, entry) => sum + entry.cashCr, 0));
});

test('v0.378.0 money moves ship to ship, character to ship and back, and a balance is corrected', async () => {
  const { session } = await setup();
  const marisol = session.resolved.ships.find((entry) => entry.identity.name === 'Marisol');
  const majestic = session.resolved.ships.find((entry) => entry.identity.name === 'Majestic');
  const paid = session.run('money:move', { fight: { value: { from: { kind: 'character', id: HAWKEYE }, to: { kind: 'ship', id: majestic.identity.id }, amountCr: '10,000' } } });
  assert.equal(paid.ok, true, paid.message);
  assert.equal(account(session, 'Majestic'), 10_000);
  const between = session.run('money:move', { fight: { value: { from: { kind: 'ship', id: majestic.identity.id }, to: { kind: 'ship', id: marisol.identity.id }, amountCr: 4000 } } });
  assert.equal(between.ok, true, between.message);
  assert.match(between.message, /moves from Majestic\u2019s account to Marisol\u2019s/);
  assert.equal(account(session, 'Majestic'), 6_000);
  assert.equal(session.run('money:move', { fight: { value: { from: { kind: 'ship', id: majestic.identity.id }, to: { kind: 'ship', id: marisol.identity.id }, amountCr: 999_999 } } }).ok, false, 'not more than is there');
  const fixed = session.run('money:correct', { fight: { value: { account: { kind: 'ship', id: majestic.identity.id }, valueCr: '1,000' } } });
  assert.equal(fixed.ok, true, fixed.message);
  assert.equal(account(session, 'Majestic'), 1_000);
  assert.ok(session.view().money.recent.some((entry) => /from Majestic/.test(entry.text)));
});

test('v0.378.0 the player\u2019s projection names other travellers but never their money', async () => {
  const { session } = await setup();
  const situation = playerSituation(session.view(), { mode: 'game' });
  assert.ok(situation.money.travellers.every((entry) => !('cashCr' in entry)));
  assert.equal(situation.money.ship.name, 'Marisol');
});

function store(home) {
  const box = { home, saves: 0,
    loadHome: async () => JSON.parse(JSON.stringify(box.home)), isSeated: async () => true,
    saveHome: async (next, envelope, { expectedRevision }) => {
      const current = box.home?.revision ?? null;
      if (current !== null && (current !== expectedRevision || next.revision !== current + 1)) throw new StaleCampaignHomeError({ campaignId: next.campaignId, expectedRevision, currentRevision: current });
      box.home = JSON.parse(JSON.stringify(next)); box.saves += 1; return next.revision;
    } };
  return box;
}

test('v0.378.0 on a player\u2019s page: his own money to another traveller, never ship to ship', async () => {
  const { registry, campaignId } = await setup();
  const campaign = registry.resolveCampaign(campaignId).campaign;
  registry.put({ ...campaign, roster: { ...(campaign.roster ?? {}), settings: { referee: 'game' } }, ownership: { ...(campaign.ownership ?? {}), actors: { [HAWKEYE]: 'player-1' } } });
  const box = store(createCampaignHome(registry.buildBundle(campaignId), { ownerUid: 'referee-1', revision: 3 }));
  const ships = importCampaignHome(box.home).bundle.documents.ships;
  const send = (value) => applyRemoteRequest({ campaignId, store: box, subsector: FAR_MERIDIAN_SUBSECTOR, request: { uid: 'player-1', characterId: HAWKEYE, command: 'money:move', value } });
  const between = await send({ from: { kind: 'ship', id: ships[0].identity.id }, to: { kind: 'ship', id: ships[1].identity.id }, amountCr: 10 });
  assert.equal(between.ok, false);
  assert.match(between.message, /referee/);
  const notHis = await send({ from: { kind: 'character', id: 'someone-else' }, to: { kind: 'ship', id: ships[0].identity.id }, amountCr: 10 });
  assert.equal(notHis.ok, false);
  const paidIn = await send({ from: { kind: 'character', id: HAWKEYE }, to: { kind: 'ship', id: ships[0].identity.id }, amountCr: 10 });
  assert.equal(paidIn.ok, true, paidIn.message);
});

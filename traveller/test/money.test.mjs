// v0.372.0: the ship's account and a character's own money (Bruce, Nov 2026:
// "credits never change" — trade goes through the ship). A chat line that
// moves money says whose money moved and where it stands; money moves between
// a character and the ship; on a player's page only his own character's, and
// a draw only for the ship's owner (Book 2 p.6).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDocumentRegistry, createMemoryStorage } from '../src/document-registry.js';
import { createPlaySession } from '../src/play-session.js';
import { createCampaignHome, importCampaignHome, StaleCampaignHomeError } from '../src/campaign-home.js';
import { applyRemoteRequest, playerMayRun } from '../src/remote-request.js';
import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js';

const fixture = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'Sea-of-Suns-v0.11.2-buggy.campaign.json');
const HAWKEYE = 'char-04164baa70c3b5a6';
const OWNER = 'referee-1';
const PLAYER = 'player-1';

// relationship: Hawkeye's tie to Marisol — the fixture's 'reserve-assignee'
// (a Scout's detached-duty ship), 'owner', or 'none'.
async function atOrison({ relationship = 'reserve-assignee', referee = null, playerOwnsHawkeye = false } = {}) {
  const bundle = JSON.parse(await readFile(fixture, 'utf8'));
  bundle.campaign.location = { systemId: 'orison', systemName: 'Orison', worldId: 'orison-main', worldName: 'Orison' };
  const ship = bundle.documents.ships[0];
  ship.state.portCall = { systemId: 'orison', arrivalDate: '106-4800', berthingDueCr: 100, berthingPaid: false };
  const hawkeye = bundle.documents.characters.find((entry) => entry.identity.id === HAWKEYE);
  if (relationship !== 'reserve-assignee') {
    hawkeye.shipRefs = (hawkeye.shipRefs ?? []).filter((ref) => ref.shipId !== ship.identity.id);
    for (const entry of hawkeye.benefits?.shipEntitlements ?? []) if (entry.disposition === 'reserve-assignment-active') entry.disposition = 'reserve-assignment-available';
    if (relationship === 'owner') hawkeye.shipRefs.push({ shipId: ship.identity.id, relationship: 'owner', shipType: 'S', shipName: 'Marisol' });
  }
  const registry = createDocumentRegistry({ storage: createMemoryStorage() });
  const { campaign } = registry.putBundle(bundle);
  if (referee || playerOwnsHawkeye) {
    const put = registry.resolveCampaign(campaign.identity.id).campaign;
    registry.put({
      ...put,
      roster: referee ? { ...(put.roster ?? {}), settings: { referee } } : put.roster,
      ownership: playerOwnsHawkeye ? { ...(put.ownership ?? {}), actors: { ...(put.ownership?.actors ?? {}), [HAWKEYE]: PLAYER } } : put.ownership
    });
  }
  return { registry, campaignId: campaign.identity.id };
}

const lastEntry = (registry, campaignId) => registry.resolveCampaign(campaignId).activityLogs[0].entries.at(-1);

test('v0.372.0 a command that spends the ship\u2019s money ends its own chat line with the account', async () => {
  const { registry, campaignId } = await atOrison();
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const before = session.resolved.ships[0].state.finances.balanceCr;
  const count = registry.resolveCampaign(campaignId).activityLogs[0]?.entries.length ?? 0;
  assert.deepEqual(session.run('trip:pay-berthing'), { ok: true, message: 'Berthing paid, Cr100.' });
  const entries = registry.resolveCampaign(campaignId).activityLogs[0].entries;
  assert.equal(entries.length, count + 1, 'one line, not a second one');
  const fmt = (n) => `Cr ${n.toLocaleString('en-US')}`;
  assert.equal(entries.at(-1).message, `Berthing paid, Cr100. Marisol\u2019s account ${fmt(before - 100)} (was ${fmt(before)}).`);
  assert.equal(entries.at(-1).category, 'PORT');
});

test('v0.372.0 money moves between a character and the ship, and is refused past what is there', async () => {
  const { registry, campaignId } = await atOrison();
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const ship = () => session.resolved.ships[0].state.finances.balanceCr;
  const cash = () => session.resolved.characters.find((entry) => entry.identity.id === HAWKEYE).finances.credits;
  const [shipBefore, cashBefore] = [ship(), cash()];

  const paid = session.run('money:to-ship', { fight: { value: { characterId: HAWKEYE, amountCr: 5000 } } });
  assert.equal(paid.ok, true, paid.message);
  assert.equal(paid.message, 'Hawkeye paid Cr 5,000 into Marisol\u2019s account.');
  assert.equal(ship(), shipBefore + 5000);
  assert.equal(cash(), cashBefore - 5000);
  assert.match(lastEntry(registry, campaignId).message, /^Hawkeye paid Cr 5,000 into Marisol\u2019s account\. Marisol\u2019s account Cr [\d,]+ \(was Cr [\d,]+\); Hawkeye\u2019s own money Cr [\d,]+ \(was Cr [\d,]+\)\.$/);
  assert.equal(session.resolved.ships[0].state.finances.ledger.at(-1).kind, 'transfer');

  const drew = session.run('money:from-ship', { fight: { value: { characterId: HAWKEYE, amountCr: 2000 } } });
  assert.equal(drew.ok, true, drew.message);
  assert.equal(ship(), shipBefore + 3000);
  assert.equal(cash(), cashBefore - 3000);

  const tooMuch = session.run('money:to-ship', { fight: { value: { characterId: HAWKEYE, amountCr: cash() + 1 } } });
  assert.equal(tooMuch.ok, false);
  assert.match(tooMuch.message, /^Hawkeye has only Cr/);
  const overdraw = session.run('money:from-ship', { fight: { value: { characterId: HAWKEYE, amountCr: ship() + 1 } } });
  assert.equal(overdraw.ok, false);
  assert.match(overdraw.message, /account holds only Cr/);
  assert.equal(session.run('money:to-ship', { fight: { value: { characterId: HAWKEYE, amountCr: 0 } } }).ok, false);
  assert.equal(session.run('money:to-ship', { fight: { value: { characterId: 'nobody', amountCr: 10 } } }).ok, false);
});

test('v0.372.0 the referee\u2019s Vehicles row offers Move money on the travellers\u2019 ship', async () => {
  const { registry, campaignId } = await atOrison();
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const view = session.view();
  assert.equal(view.moneyOptions.shipName, 'Marisol');
  assert.ok(view.moneyOptions.characters.some((entry) => entry.id === HAWKEYE));
});

function memoryStore(home) {
  const store = {
    home, saves: 0,
    loadHome: async () => JSON.parse(JSON.stringify(store.home)),
    isSeated: async (uid) => uid === PLAYER,
    saveHome: async (next, envelope, { expectedRevision }) => {
      const current = store.home?.revision ?? null;
      if (current !== null && (current !== expectedRevision || next.revision !== current + 1)) throw new StaleCampaignHomeError({ campaignId: next.campaignId, expectedRevision, currentRevision: current });
      store.home = JSON.parse(JSON.stringify(next));
      store.saves += 1;
      return next.revision;
    }
  };
  return store;
}

async function remote(options) {
  const { registry, campaignId } = await atOrison({ referee: 'game', ...options });
  const store = memoryStore(createCampaignHome(registry.buildBundle(campaignId), { ownerUid: OWNER, revision: 3 }));
  const send = (command, value) => applyRemoteRequest({ campaignId, store, subsector: FAR_MERIDIAN_SUBSECTOR, request: { uid: PLAYER, characterId: HAWKEYE, command, value } });
  const shipCr = () => importCampaignHome(store.home).bundle.documents.ships[0].state.finances.balanceCr;
  return { store, send, shipCr };
}

test('v0.372.0 a player pays in his own character\u2019s money, in one save', async () => {
  assert.equal(playerMayRun('money:to-ship'), true);
  assert.equal(playerMayRun('money:from-ship'), true);
  const { store, send, shipCr } = await remote({ playerOwnsHawkeye: true });
  const before = shipCr();
  const result = await send('money:to-ship', { characterId: HAWKEYE, amountCr: 1000 });
  assert.equal(result.ok, true, result.message);
  assert.equal(shipCr(), before + 1000);
  assert.equal(store.saves, 1);
});

test('v0.372.0 a player cannot move another\u2019s money, nor draw from a ship his character does not own', async () => {
  const notHis = await remote({ playerOwnsHawkeye: false });
  const refused = await notHis.send('money:to-ship', { characterId: HAWKEYE, amountCr: 1000 });
  assert.equal(refused.ok, false);
  assert.match(refused.message, /only your own character/);

  const noOwner = await remote({ playerOwnsHawkeye: true, relationship: 'none' });
  const draw = await noOwner.send('money:from-ship', { characterId: HAWKEYE, amountCr: 1000 });
  assert.equal(draw.ok, false);
  assert.match(draw.message, /only the character who holds the ship/);
  assert.equal(noOwner.store.saves, 0);

  // The owner draws (Book 2 p.6), and so does a Scout holding his ship on
  // detached duty: nobody else could ever draw from it.
  for (const relationship of ['owner', 'reserve-assignee']) {
    const holder = await remote({ playerOwnsHawkeye: true, relationship });
    const before = holder.shipCr();
    const allowed = await holder.send('money:from-ship', { characterId: HAWKEYE, amountCr: 1000 });
    assert.equal(allowed.ok, true, `${relationship}: ${allowed.message}`);
    assert.equal(holder.shipCr(), before - 1000);
  }
});

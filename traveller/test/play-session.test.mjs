// play-session.test.mjs — the play page's headless view of a campaign.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDocumentRegistry, createMemoryStorage } from '../src/document-registry.js';
import { buildPlayViewState, characterView, daysBetween, formatCampaignDate, jobViews } from '../src/play-session.js';
import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js';

const fixture = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'Sea-of-Suns-v0.11.2-buggy.campaign.json');

async function resolved() {
  const registry = createDocumentRegistry({ storage: createMemoryStorage() });
  const { campaign } = registry.putBundle(JSON.parse(await readFile(fixture, 'utf8')));
  return registry.resolveCampaign(campaign.identity.id);
}

test('a resolved campaign becomes the play page view state', async () => {
  const state = buildPlayViewState(await resolved(), { subsector: FAR_MERIDIAN_SUBSECTOR });
  assert.equal(state.live, true);
  assert.deepEqual(state.campaign, { id: 'campaign-38a2aab661b8ebca', name: 'Sea of Suns', date: '106-4800' });
  assert.deepEqual(state.place, { name: 'Cinder', detail: 'Starport E, hex 0802' });
  assert.equal(state.situation.kind, 'port');
  assert.deepEqual(state.scene, { kind: 'subsector', currentId: 'cinder', selectedId: null, jump: 2 });
});

test('the character is read from the document, wounds from its current values', async () => {
  const { character } = buildPlayViewState(await resolved(), { subsector: FAR_MERIDIAN_SUBSECTOR });
  assert.equal(character.name, 'Hawkeye');
  assert.equal(character.upp, 'AB5678');
  assert.equal(character.service, 'Scout, 5 terms, age 38');
  assert.equal(character.cashCr, 60000);
  assert.equal(character.status, 'Unwounded');
  assert.ok(character.skills.includes('Navigation-2'));
  assert.deepEqual(character.weapons, [{ name: 'Laser Rifle', note: 'In hand' }]);

  const hurt = characterView({ identity: { id: 'c', name: 'X' }, characteristics: { STR: 8, DEX: 7, END: 6, INT: 5, EDU: 5, SOC: 5 }, current: { STR: 8, DEX: 7, END: 0 } });
  assert.equal(hurt.status, 'Unconscious');
  assert.equal(hurt.hurt, true);
  assert.deepEqual(hurt.characteristics.find((entry) => entry.key === 'END'), { key: 'END', full: 6, now: 0 });
});

test('the ship is read from its specification and state', async () => {
  const { ship } = buildPlayViewState(await resolved(), { subsector: FAR_MERIDIAN_SUBSECTOR });
  assert.equal(ship.name, 'Marisol');
  assert.equal(ship.kind, '100 t Scout/Courier');
  assert.equal(ship.accountCr, 843620);
  assert.deepEqual(ship.fuel, { now: 40, full: 40, note: 'Mixed fuel aboard' });
  assert.equal(ship.hold.now, 1);
  assert.equal(ship.hold.full, 3);
  assert.match(ship.hold.note, /1 t Priority Small-Lot Delivery/);
  assert.deepEqual(ship.crew, [{ name: 'Hawkeye', roles: 'Pilot' }]);
  assert.equal(ship.damage, null);
  assert.match(ship.upkeep, /Scout Service/);
});

test('accepted jobs are listed soonest first with their time left', async () => {
  const { jobs } = buildPlayViewState(await resolved(), { subsector: FAR_MERIDIAN_SUBSECTOR });
  assert.deepEqual(jobs.map((job) => [job.to, job.due, job.urgent]), [
    ['Calder', '14 days overdue', true],
    ['Pelagos', 'Due today', true],
    ['Orison', '14 days left', false]
  ]);
  assert.deepEqual(jobViews([{ status: 'completed', identity: { id: 'x', title: 'Done' } }], { year: 4800, dayOfYear: 1 }), []);
});

test('dates', () => {
  assert.equal(formatCampaignDate({ year: 4800, dayOfYear: 7 }), '007-4800');
  assert.equal(daysBetween({ year: 4800, dayOfYear: 360 }, { year: 4801, dayOfYear: 5 }), 10);
});

test('play-session touches no DOM', async () => {
  const source = await readFile(new URL('../src/play-session.js', import.meta.url), 'utf8');
  assert.equal(/createElement|querySelector|getElementById|addEventListener|innerHTML/.test(source), false);
  assert.equal(/\bwindow\b|localStorage/.test(source), false);
});

// ---------------------------------------------------------------- v0.207.0
import { createPlaySession, portProcedure } from '../src/play-session.js';
import { StaleCampaignHomeError } from '../src/campaign-home.js';

// The fixture is berthed and full at Cinder (starport E). Move it to Orison
// (starport B), owe the berthing and drain the tanks, so there is port
// business to do.
async function atOrison({ fuel = 10, berthingPaid = false } = {}) {
  const bundle = JSON.parse(await readFile(fixture, 'utf8'));
  bundle.campaign.location = { systemId: 'orison', systemName: 'Orison', worldId: 'orison-main', worldName: 'Orison' };
  const ship = bundle.documents.ships[0];
  ship.state.currentFuelTons = fuel;
  ship.state.portCall = { systemId: 'orison', arrivalDate: '106-4800', berthingDueCr: 100, berthingPaid };
  const registry = createDocumentRegistry({ storage: createMemoryStorage() });
  const { campaign } = registry.putBundle(bundle);
  return { registry, campaignId: campaign.identity.id };
}

function fakeCloud({ uid = 'referee-1', remote = null } = {}) {
  const calls = [];
  let stored = remote;
  return {
    calls,
    userId: () => uid,
    load: async () => stored,
    save: async (home, envelope, { expectedRevision }) => {
      const current = stored?.revision ?? null;
      if (current !== expectedRevision) throw new StaleCampaignHomeError({ campaignId: home.campaignId, expectedRevision, currentRevision: current });
      stored = home;
      calls.push({ revision: home.revision, expectedRevision, envelope });
      return home.revision;
    },
    bump: () => { stored = { ...stored, revision: stored.revision + 1 }; }
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

test('the port procedure leads with what is owed and lists the rest', async () => {
  const { registry, campaignId } = await atOrison();
  const procedure = portProcedure(registry.resolveCampaign(campaignId), { subsector: FAR_MERIDIAN_SUBSECTOR });
  assert.equal(procedure.next.title, 'Pay berthing');
  assert.deepEqual(procedure.next.actions.map((action) => action.command), ['berthing:pay']);
  assert.deepEqual(procedure.steps.map((step) => [step.id, step.state]), [['fuel', 'ready'], ['fuel-skim', 'ready'], ['speculate', 'ready'], ['jump', 'blocked']]);  assert.match(procedure.steps[0].figure, /^30 t refined, Cr 15,000$/);
});

test('paying berthing and filling the tanks change the ship, the ledger and the log', async () => {
  const { registry, campaignId } = await atOrison();
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const before = session.resolved.ships[0].state.finances.balanceCr;

  assert.deepEqual(session.run('berthing:pay'), { ok: true, message: 'Marisol paid Cr 100 berthing at Orison' });
  assert.equal(session.resolved.ships[0].state.portCall.berthingPaid, true);
  assert.equal(session.resolved.ships[0].state.finances.balanceCr, before - 100);

  const filled = session.run('fuel:fill');
  assert.equal(filled.ok, true);
  assert.equal(session.resolved.ships[0].state.currentFuelTons, 40);
  assert.equal(session.resolved.ships[0].state.finances.balanceCr, before - 100 - 15000);

  // It is in the registry, not only in the session: a fresh resolve sees it.
  const fresh = registry.resolveCampaign(campaignId);
  assert.equal(fresh.ships[0].state.currentFuelTons, 40);
  assert.deepEqual(fresh.activityLogs[0].entries.slice(-2).map((entry) => entry.category), ['PORT', 'SHIP']);

  const view = session.view();
  assert.equal(view.next.title, 'Choose a destination');
  assert.deepEqual(view.done, ['Berthed, Cr 100', 'Tanks full, 40 t']);
});

test('a refused command changes nothing', async () => {
  const { registry, campaignId } = await atOrison({ fuel: 40, berthingPaid: true });
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const before = JSON.stringify(registry.resolveCampaign(campaignId).ships[0]);
  assert.deepEqual(session.run('fuel:fill'), { ok: false, message: 'fuel tanks are already full' });
  assert.equal(session.run('warp:nine').ok, false);
  assert.equal(JSON.stringify(registry.resolveCampaign(campaignId).ships[0]), before);
});

test('a chosen destination is checked for reach and fuel', async () => {
  const { registry, campaignId } = await atOrison({ fuel: 10, berthingPaid: true });
  const resolved = registry.resolveCampaign(campaignId);
  const jump = (selectedSystemId) => portProcedure(resolved, { subsector: FAR_MERIDIAN_SUBSECTOR, selectedSystemId }).steps.find((step) => step.id === 'jump');
  assert.equal(jump(null).figure, 'No destination yet');
  assert.match(jump('cinder').figure, /short of fuel/);
  assert.match(jump('heliograph').figure, /parsecs$/);
});

test('signed out, changes stay in the browser; signed in, they are saved by revision', async () => {
  const local = await atOrison();
  const offline = createPlaySession({ ...local, subsector: FAR_MERIDIAN_SUBSECTOR });
  await offline.connect();
  assert.equal(offline.save.state, 'local');

  const { registry, campaignId } = await atOrison();
  const cloud = fakeCloud();
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR, cloud });
  await session.connect();
  assert.equal(session.revision, null, 'no cloud copy yet');
  session.run('berthing:pay');
  await settle();
  session.run('fuel:fill');
  await settle();
  assert.deepEqual(cloud.calls.map((call) => [call.expectedRevision, call.revision]), [[null, 1], [1, 2]]);
  assert.equal(session.save.state, 'cloud');
  assert.equal(registry.resolveCampaign(campaignId).campaign.ownership.ownerUid, 'referee-1');
});

test('a campaign changed elsewhere stops the page rather than overwrite it', async () => {
  const { registry, campaignId } = await atOrison();
  const cloud = fakeCloud();
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR, cloud });
  await session.connect();
  session.run('berthing:pay');
  await settle();
  cloud.bump(); // another browser saved revision 2
  session.run('fuel:fill');
  await settle();
  assert.equal(session.save.state, 'stale');
  assert.equal(cloud.calls.length, 1, 'the stale write never landed');
  assert.deepEqual(session.run('fuel:fill'), { ok: false, message: 'this campaign was changed elsewhere; reload first' });
  assert.equal(session.view().steps.every((step) => !step.command), true);
});

test('opening signed in adopts the cloud copy and its revision', async () => {
  const first = await atOrison();
  const cloud = fakeCloud();
  const writer = createPlaySession({ ...first, subsector: FAR_MERIDIAN_SUBSECTOR, cloud });
  await writer.connect();
  writer.run('berthing:pay');
  await settle();

  const second = await atOrison(); // a browser that has not seen the payment
  const reader = createPlaySession({ ...second, subsector: FAR_MERIDIAN_SUBSECTOR, cloud });
  assert.equal(reader.resolved.ships[0].state.portCall.berthingPaid, false);
  await reader.connect();
  assert.equal(reader.revision, 1);
  assert.equal(reader.resolved.ships[0].state.portCall.berthingPaid, true);
});

test('the page leaves a campaign alone while a fight is running there', async () => {
  const { registry, campaignId } = await atOrison();
  const resolved = registry.resolveCampaign(campaignId);
  const procedure = portProcedure({ ...resolved, encounters: [{ status: 'active', location: { systemId: 'orison' }, identity: { id: 'e1' } }] }, { subsector: FAR_MERIDIAN_SUBSECTOR });
  assert.equal(procedure.next.title, 'A fight is in progress');
  assert.equal(procedure.steps.every((step) => !step.command), true);
});

// ---------------------------------------------------------------- v0.208.0
import { routeMarketSeed, seededDice, campaignDateKey } from '../client/commerce-market.js';
import { generateFreightOffers, parseUniversalWorldProfile, getSubsectorSystem } from '../vendor/classic-traveller-rules/index.js';

// A trader with room: the fixture's scout has a 3 t hold, which no freight
// lot fits, and ship documents must match a canonical design, so swap in a
// Type A free trader (82 t, Jump-1) under the same id, at Aster, which has Jump-1 neighbours.
import { createShipDocument, armShipTurret } from '../vendor/classic-traveller-rules/index.js';

async function traderAtAster({ steward = false } = {}) {
  const bundle = JSON.parse(await readFile(fixture, 'utf8'));
  bundle.campaign.location = { systemId: 'aster', systemName: 'Aster', worldId: 'aster-main', worldName: 'Aster' };
  const old = bundle.documents.ships[0];
  const crewAssignments = [{ role: 'pilot', characterId: 'char-04164baa70c3b5a6', characterName: 'Hawkeye' }];
  if (steward) crewAssignments.push({ role: 'steward', characterId: 'char-04164baa70c3b5a6', characterName: 'Hawkeye' });
  bundle.documents.ships[0] = createShipDocument({
    designKey: 'type-a-free-trader', id: old.identity.id, name: 'Marisol', registry: 'A-1', authority: old.authority, crewAssignments,
    state: { currentFuelTons: 30,
      finances: { balanceCr: 500000, ledger: [{ id: 'opening', date: '106-4800', kind: 'transfer', description: 'Opening balance', amountCr: 500000, balanceCr: 500000 }] },
      portCall: { systemId: 'aster', arrivalDate: '106-4800', berthingDueCr: 100, berthingPaid: true } }
  });
  const registry = createDocumentRegistry({ storage: createMemoryStorage() });
  const { campaign } = registry.putBundle(bundle);
  return { registry, campaignId: campaign.identity.id };
}

test('a chosen destination lists its freight and passengers; berthing and fuel still lead', async () => {
  const { registry, campaignId } = await traderAtAster();
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  assert.equal(session.view().steps.some((step) => step.id.startsWith('freight')), false, 'nothing is offered until a destination is chosen');
  const view = session.view({ selectedSystemId: 'calder' });
  assert.equal(view.next.title, 'Bound for Calder');
  const freight = view.steps.filter((step) => step.command?.startsWith('freight:load:'));
  assert.ok(freight.length >= 1 && freight.length <= 4);
  assert.ok(view.steps.some((step) => step.command === 'passengers:book:middle'));
  // No steward: high passage is never bookable, and any waiting are turned
  // away in one quiet row that gives the reason.
  assert.equal(view.steps.some((step) => step.command === 'passengers:book:high'), false);
  const turned = view.steps.find((step) => step.id === 'pass-turned-away');
  if (turned && /high/.test(turned.figure)) assert.match(turned.copy, /steward/);
});

test('the offers are the ones the current client generates: same seed, same ids', async () => {
  const { registry, campaignId } = await traderAtAster();
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const { campaign } = session.resolved;
  const profile = (id) => parseUniversalWorldProfile(getSubsectorSystem(FAR_MERIDIAN_SUBSECTOR, id).mainWorld.uwp);
  const expected = generateFreightOffers(profile('aster'), profile('calder'), {
    destinationTravelZone: getSubsectorSystem(FAR_MERIDIAN_SUBSECTOR, 'calder').travelZone,
    dice: seededDice(routeMarketSeed(campaign, 'aster', 'calder', 'freight')),
    idPrefix: `freight-${campaignDateKey(campaign)}-aster-calder`
  }).offers.filter((offer) => offer.tons <= 82).slice(0, 4).map((offer) => `freight:load:${offer.id}`);
  const shown = session.view({ selectedSystemId: 'calder' }).steps.filter((step) => step.command?.startsWith('freight:load:')).map((step) => step.command);
  assert.deepEqual(shown, expected);
});

test('loading freight and booking passengers fill the ship and leave the offer board', async () => {
  const { registry, campaignId } = await traderAtAster({ steward: true });
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const at = { selectedSystemId: 'calder' };
  const lot = session.view(at).steps.find((step) => step.command?.startsWith('freight:load:'));
  assert.equal(session.run(lot.command, at).ok, true);
  const ship = () => registry.resolveCampaign(campaignId).ships[0];
  assert.equal(ship().state.cargoManifest.length, 1);
  assert.equal(ship().state.cargoManifest[0].destinationSystemId, 'calder');
  assert.ok(ship().state.cargoUsedTons > 0);
  assert.equal(session.view(at).steps.some((step) => step.command === lot.command), false, 'a loaded lot is no longer offered');
  assert.equal(session.run(lot.command, at).ok, false, 'and cannot be loaded twice');

  const before = ship().state.finances.balanceCr;
  const middle = session.view(at).steps.find((step) => step.command === 'passengers:book:middle');
  const count = Number(middle.verb.replace('Book ', ''));
  assert.equal(session.run('passengers:book:middle', at).ok, true);
  assert.equal(ship().state.passengerManifest.filter((entry) => entry.class === 'middle').length, count);
  assert.equal(ship().state.finances.balanceCr, before, 'the engine credits fares on delivery, not at booking');
  assert.equal(ship().state.passengerManifest[0].fareCr, 8000);
  assert.ok(session.view(at).done.some((line) => /middle passage booked for Calder/.test(line)));
  assert.equal(registry.resolveCampaign(campaignId).activityLogs[0].entries.at(-1).category, 'TRADE');

  // With passengers aboard for Aster, another destination cannot be jumped to.
  const jump = session.view({ selectedSystemId: 'port-meridian' }).steps.find((step) => step.id === 'jump');
  assert.match(jump.figure, /Passengers aboard for Calder/);
});

test('freight and passengers need a destination in range, and an exclusive charter refuses them', async () => {
  const { registry, campaignId } = await traderAtAster();
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  assert.deepEqual(session.run('passengers:book:middle'), { ok: false, message: 'choose a destination within jump range first' });
  assert.equal(session.run('passengers:book:middle', { selectedSystemId: 'heliograph' }).ok, false);

  const resolved = registry.resolveCampaign(campaignId);
  const charter = { ...resolved.contracts.find((entry) => entry.status === 'accepted'), requirements: { cargoTons: 0, exclusiveShip: true, description: '' } };
  // A destination other than the charter's own (Calder): commerce and the
  // jump itself both refuse, since the charter must be delivered first.
  const procedure = portProcedure({ ...resolved, contracts: [charter] }, { subsector: FAR_MERIDIAN_SUBSECTOR, selectedSystemId: 'port-meridian' });
  assert.equal(procedure.steps.some((step) => step.command), false);
  assert.match(procedure.steps.find((step) => step.id === 'commerce').figure, /^Chartered to /);
  assert.match(procedure.steps.find((step) => step.id === 'jump').figure, /^Chartered to /);

  // Departing for the charter's own destination is allowed: Depart appears
  // as the lead action and the jump row is ready.
  const toCharter = portProcedure({ ...resolved, contracts: [charter] }, { subsector: FAR_MERIDIAN_SUBSECTOR, selectedSystemId: 'calder' });
  assert.equal(toCharter.next.actions[0]?.command, 'depart');
  assert.equal(toCharter.steps.find((step) => step.id === 'jump').state, 'ready');
});

// ---------------------------------------------------------------- v0.208.3
import { weeklyTradeSeed } from '../client/commerce-market.js';
import { generateSpeculativeTradeOffer } from '../vendor/classic-traveller-rules/index.js';
import { speculativeLotPurchasedQuantity } from '../src/campaign-document.js';

test('the week\'s speculative lot is the current client\'s lot, bought as far as hold and account allow', async () => {
  const { registry, campaignId } = await atOrison({ fuel: 40, berthingPaid: true });
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const { campaign } = session.resolved;
  const expected = generateSpeculativeTradeOffer(parseUniversalWorldProfile(getSubsectorSystem(FAR_MERIDIAN_SUBSECTOR, 'orison').mainWorld.uwp),
    { dice: seededDice(weeklyTradeSeed(campaign, 'orison')) });
  const row = session.view().steps.find((step) => step.id === 'speculate');
  assert.match(row.title, new RegExp(expected.name));
  const before = session.resolved.ships[0];
  const free = before.specifications.cargo.capacityTons - before.state.cargoUsedTons;
  assert.equal(row.verb, `Buy ${Math.min(free, expected.quantityAvailable)} t`, 'a scout with 2 t free buys 2 t of it');

  assert.equal(session.run('speculation:buy').ok, true);
  const after = registry.resolveCampaign(campaignId);
  const lot = after.ships[0].state.cargoManifest.find((entry) => /^speculative:/.test(entry.category));
  assert.equal(lot.tons, free);
  assert.equal(lot.originSystemId, 'orison');
  assert.ok(after.ships[0].state.finances.balanceCr < before.state.finances.balanceCr);
  assert.equal(speculativeLotPurchasedQuantity(after.campaign, `${weeklyTradeSeed(campaign, 'orison')}|${expected.code}`), free, 'the campaign records how much of the lot is gone, as the current client does');
  const again = session.view().steps.find((step) => step.id === 'speculate');
  assert.equal(again.state, 'blocked');
  assert.equal(again.copy, 'The hold is full.');
  // Bought here, it cannot be sold here.
  assert.equal(session.view().steps.some((step) => step.id.startsWith('sell-')), false);
  assert.match(session.run(`speculation:sell:${lot.id}`).message, /another world/);
});

test('a speculative lot carried to another world is quoted there and sold', async () => {
  const { registry, campaignId } = await atOrison({ fuel: 40, berthingPaid: true });
  createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR }).run('speculation:buy');
  // Arrive at Aster without the jump machinery: move the campaign and the port call.
  const moved = registry.resolveCampaign(campaignId);
  registry.putAll([
    { ...moved.campaign, location: { systemId: 'aster', systemName: 'Aster', worldId: 'aster-main', worldName: 'Aster' } },
    { ...moved.ships[0], state: { ...moved.ships[0].state, portCall: { systemId: 'aster', arrivalDate: '113-4800', berthingDueCr: 100, berthingPaid: true } } }
  ]);
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const row = session.view().steps.find((step) => step.id.startsWith('sell-'));
  assert.ok(row, 'the lot is offered for sale at Aster');
  assert.match(row.figure, /^Cr [\d,]+, \d+% of base, (up|down) Cr [\d,]+$/);
  const before = session.resolved.ships[0].state.finances.balanceCr;
  const result = session.run(row.command);
  assert.equal(result.ok, true);
  const ship = registry.resolveCampaign(campaignId).ships[0];
  assert.ok(ship.state.finances.balanceCr > before);
  assert.equal(ship.state.cargoManifest.some((entry) => /^speculative:/.test(entry.category)), false);
  assert.equal(registry.resolveCampaign(campaignId).activityLogs[0].entries.at(-1).category, 'TRADE');
});

// ---------------------------------------------------------------- v0.209.0
test('a saved character gains an inventory on load, seeded from the weapon in hand', async () => {
  const { character } = buildPlayViewState(await resolved(), { subsector: FAR_MERIDIAN_SUBSECTOR });
  assert.deepEqual(character.inventory.map((item) => [item.name, item.weight, item.carried]), [['Laser Rifle, loaded', '10 kg', true]]);
  // Hawkeye is STR 10 on Cinder (size 2): (7 - 2) x 12.5% more may be carried.
  assert.equal(character.load.state, 'unencumbered');
  assert.equal(character.load.text, '10 kg of 16.25 kg');
});

test('inventory commands change the character, the load, and the saved document', async () => {
  const { registry, campaignId } = await atOrison({ fuel: 40, berthingPaid: true }); // Orison is size 5
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const id = session.view().character.id;
  const load = () => session.view().character.load;
  assert.equal(load().text, '10 kg of 12.5 kg');

  assert.equal(session.run('inventory:add', { characterId: id, item: { name: 'Medical kit', weightKg: '10', quantity: '1' } }).ok, true);
  assert.deepEqual([load().state, load().dm, load().text], ['encumbered', -1, '20 kg of 12.5 kg']);
  assert.equal(session.run('inventory:add', { characterId: id, item: { weaponKey: 'revolver' } }).ok, true);
  assert.equal(load().text, '21 kg of 12.5 kg');
  assert.equal(session.run('inventory:add', { characterId: id, item: { name: 'Vacc suit', weightKg: '10' } }).ok, true);
  assert.equal(load().state, 'overloaded', '31 kg is past double 12.5');
  assert.equal(session.run('inventory:military:on', { characterId: id }).ok, true);
  assert.deepEqual([load().state, load().dm], ['military-load', -2]);

  const kit = session.view().character.inventory.find((item) => item.name === 'Medical kit');
  assert.equal(session.run(`inventory:toggle:${kit.id}`, { characterId: id }).ok, true);
  assert.equal(load().text, '21 kg of 12.5 kg', 'put down, it no longer counts, but it stays listed');
  assert.equal(session.view().character.inventory.find((item) => item.id === kit.id).carried, false);
  assert.equal(session.run(`inventory:remove:${kit.id}`, { characterId: id }).ok, true);

  const saved = registry.resolveCampaign(campaignId).characters.find((entry) => entry.identity.id === id);
  assert.equal(saved.schemaVersion, 5);
  assert.deepEqual(saved.inventory.map((item) => item.name), ['Laser Rifle, loaded', 'Revolver, loaded', 'Vacc suit']);
  assert.equal(saved.loadout.militaryLoad, true);
  assert.equal(session.run('inventory:add', { characterId: id, item: { name: '  ', weightKg: '1' } }).ok, false);
});

test('the carrying limit follows the world the character is on, and is unadjusted in jump', async () => {
  const limit = async (mutate) => {
    const bundle = JSON.parse(await readFile(fixture, 'utf8'));
    mutate(bundle);
    const registry = createDocumentRegistry({ storage: createMemoryStorage() });
    const { campaign } = registry.putBundle(bundle);
    return buildPlayViewState(registry.resolveCampaign(campaign.identity.id), { subsector: FAR_MERIDIAN_SUBSECTOR }).character.load.text;
  };
  const at = (systemId, name) => (bundle) => { bundle.campaign.location = { systemId, systemName: name, worldId: `${systemId}-main`, worldName: name }; };
  // Hawkeye is STR 10. Cinder is size 2 (+62.5%), Orison size 5 (+25%), Aster size 7 (none).
  assert.equal(await limit(at('cinder', 'Cinder')), '10 kg of 16.25 kg');
  assert.equal(await limit(at('orison', 'Orison')), '10 kg of 12.5 kg');
  assert.equal(await limit(at('aster', 'Aster')), '10 kg of 10 kg');
  assert.equal(await limit((bundle) => { bundle.documents.ships[0].state.operationalStatus = 'in-jump'; }), '10 kg of 10 kg');
});

// ---------------------------------------------------------------- v0.210.0
test('departure advances a week, burns the whole jump fuel allowance, and opens a new port call', async () => {
  const { registry, campaignId } = await traderAtAster({ steward: true });
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const before = session.resolved;
  const beforeDate = before.campaign.time;
  const beforeFuel = before.ships[0].state.currentFuelTons;

  assert.deepEqual(session.run('depart'), { ok: false, message: 'choose a destination within jump range first' });
  const at = { selectedSystemId: 'calder' };
  const result = session.run('depart', at);
  assert.equal(result.ok, true);
  assert.match(result.message, /arrived at Calder/);

  const after = registry.resolveCampaign(campaignId);
  assert.equal(after.campaign.time.dayOfYear, beforeDate.dayOfYear + 7);
  assert.equal(after.campaign.location.systemId, 'calder');
  const ship = after.ships[0];
  // A free trader with a Jump-1 drive burns its whole jump-fuel allowance
  // (Book 2 p.6) regardless of the one-parsec distance actually jumped.
  assert.ok(ship.state.currentFuelTons < beforeFuel);
  assert.equal(ship.state.portCall.systemId, 'calder');
  assert.equal(ship.state.portCall.berthingPaid, false);
  // ARRIVAL is always logged; a NAV entry follows it when the arrival throw
  // turns up shipping (Book 2 p.38), so check ARRIVAL is among the last two.
  assert.ok(after.activityLogs[0].entries.slice(-2).some((entry) => entry.category === 'ARRIVAL'));

  // Cannot depart twice without a new destination in range of the new port.
  assert.equal(session.run('depart', at).ok, false);
});

test('freight and passengers loaded for the destination are delivered and paid on arrival', async () => {
  const { registry, campaignId } = await traderAtAster({ steward: true });
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const at = { selectedSystemId: 'calder' };
  const lot = session.view(at).steps.find((step) => step.command?.startsWith('freight:load:'));
  session.run(lot.command, at);
  session.run('passengers:book:middle', at);
  const before = session.resolved.ships[0].state.finances.balanceCr;

  const result = session.run('depart', at);
  assert.equal(result.ok, true);
  assert.match(result.message, /freight shipment.*delivered/);
  assert.match(result.message, /passenger.*disembarked/);

  const ship = registry.resolveCampaign(campaignId).ships[0];
  assert.equal(ship.state.cargoManifest.some((entry) => entry.destinationSystemId === 'calder'), false);
  assert.equal(ship.state.passengerManifest.length, 0);
  assert.ok(ship.state.finances.balanceCr > before, 'freight revenue and passenger fares were credited');
});

test('an accepted contract for the destination pays out on arrival; one overdue elsewhere fails', async () => {
  const { registry, campaignId } = await traderAtAster({ steward: true });
  const resolved = registry.resolveCampaign(campaignId);
  const contracts = resolved.contracts.map((contract) => (contract.status === 'accepted'
    ? { ...contract, destination: { ...contract.destination, systemId: 'calder', systemName: 'Calder' }, timing: { ...contract.timing, deadlineDate: { year: 4900, dayOfYear: 1 } } }
    : contract));
  registry.putAll(contracts);
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const before = session.resolved.ships[0].state.finances.balanceCr;
  const result = session.run('depart', { selectedSystemId: 'calder' });
  assert.equal(result.ok, true);
  assert.match(result.message, /completed, Cr/);

  const after = registry.resolveCampaign(campaignId);
  const completed = after.contracts.filter((entry) => entry.status === 'completed');
  assert.ok(completed.length >= 1);
  assert.ok(after.ships[0].state.finances.balanceCr > before);
});

test('departure is refused when berthing is owed, fuel is short, or an exclusive charter binds elsewhere', async () => {
  const { registry: unpaidRegistry, campaignId: unpaidId } = await traderAtAster({ steward: true });
  const unpaidResolved = unpaidRegistry.resolveCampaign(unpaidId);
  unpaidRegistry.put({ ...unpaidResolved.ships[0], state: { ...unpaidResolved.ships[0].state, portCall: { ...unpaidResolved.ships[0].state.portCall, berthingPaid: false } } });
  const unpaidSession = createPlaySession({ registry: unpaidRegistry, campaignId: unpaidId, subsector: FAR_MERIDIAN_SUBSECTOR });
  assert.deepEqual(unpaidSession.run('depart', { selectedSystemId: 'calder' }), { ok: false, message: 'pay berthing before departure' });

  const { registry: dryRegistry, campaignId: dryId } = await traderAtAster({ steward: true });
  const dryResolved = dryRegistry.resolveCampaign(dryId);
  dryRegistry.put({ ...dryResolved.ships[0], state: { ...dryResolved.ships[0].state, currentFuelTons: 0 } });
  const drySession = createPlaySession({ registry: dryRegistry, campaignId: dryId, subsector: FAR_MERIDIAN_SUBSECTOR });
  assert.match(drySession.run('depart', { selectedSystemId: 'calder' }).message, /insufficient fuel/);

  const { registry, campaignId } = await traderAtAster({ steward: true });
  const resolved = registry.resolveCampaign(campaignId);
  const charter = { ...resolved.contracts.find((entry) => entry.status === 'accepted'), destination: { systemId: 'port-meridian', systemName: 'Port Meridian' }, requirements: { cargoTons: 0, exclusiveShip: true, description: '' } };
  registry.put(charter);
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  assert.match(session.run('depart', { selectedSystemId: 'calder' }).message, /chartered to Port Meridian/);
  assert.equal(session.run('depart', { selectedSystemId: 'port-meridian' }).ok, true);
});

// ---------------------------------------------------------------- v0.211.0
test('arrival throws for shipping, leads the column with it, and lets it be dismissed', async () => {
  const { registry, campaignId } = await traderAtAster({ steward: true });
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  assert.equal(session.arrivalEncounter, null, 'nothing is standing before a jump');

  const result = session.run('depart', { selectedSystemId: 'calder' });
  assert.equal(result.ok, true);
  const encounter = session.arrivalEncounter;

  if (encounter) {
    // The throw found shipping: it leads the column until it is dismissed.
    assert.equal(encounter.systemId, 'calder');
    assert.ok(typeof encounter.label === 'string' && encounter.label.length > 0);
    assert.ok(typeof encounter.reaction === 'string' && encounter.reaction.length > 0);
    const view = session.view();
    assert.match(view.next.title, new RegExp(encounter.label));
    assert.equal(view.next.actions[0].command, 'arrival:dismiss');
    assert.equal(view.arrivalEncounter.label, encounter.label);
    // Port business is still listed behind it.
    assert.ok(view.steps.some((step) => step.id === 'berthing' || step.id === 'fuel'));

    assert.equal(session.run('arrival:dismiss').ok, true);
    assert.equal(session.arrivalEncounter, null);
    assert.equal(new RegExp(encounter.label).test(session.view().next.title), false);
    assert.equal(session.run('arrival:dismiss').ok, false, 'nothing left to dismiss');
  } else {
    // The throw found nothing: the port call proceeds as usual.
    assert.equal(session.view().arrivalEncounter, null);
    assert.equal(session.run('arrival:dismiss').ok, false);
  }
});

test('the arrival encounter is seeded on the arrival, so it does not reroll', async () => {
  const roll = async () => {
    const { registry, campaignId } = await traderAtAster({ steward: true });
    const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
    session.run('depart', { selectedSystemId: 'calder' });
    return session.arrivalEncounter;
  };
  const first = await roll();
  const second = await roll();
  assert.deepEqual(first, second, 'the same arrival always yields the same encounter');
});

// ---------------------------------------------------------------- v0.230.0
test('an arrival encounter can be fought — lasers only, abbreviated, to a real outcome', async () => {
  // Aster -> Calder is seeded to a Free Trader with a hostile reaction (a
  // fixed fact of this fixture, checked by hand before writing this test —
  // see the "does not reroll" test above for why that is safe to rely on).
  //
  // The fixture ship is a Type A Free Trader, whose own design ships with
  // armament: { hardpoints: 2, turrets: [] } — the hardpoints are a number,
  // not turret records, and nothing in the rules package fits a NEW turret
  // into one (armShipTurret only arms a turret mount the design already
  // specifies). So a Free Trader cannot be armed at all yet, by anyone, in
  // this engine — a real gap, unrelated to this slice, worth its own look.
  // Swapped in a Type S Scout/Courier here purely so this test can arm a
  // ship and actually exercise a fight.
  const { registry, campaignId } = await traderAtAster({ steward: true });
  const resolved = registry.resolveCampaign(campaignId);
  const oldShip = resolved.ships[0];
  let ship = createShipDocument({ designKey: 'type-s-scout-courier', id: oldShip.identity.id, name: oldShip.identity.name, authority: oldShip.authority, crewAssignments: oldShip.crew.assignments, state: { ...oldShip.state, currentFuelTons: 40 } });
  ship = armShipTurret(ship, { turretId: ship.specifications.armament.turrets[0].id, weapon: 'beam-laser', pricePerWeaponCr: 0 }).ship;
  registry.put(ship);

  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  assert.equal(session.run('depart', { selectedSystemId: 'calder' }).ok, true);
  assert.ok(session.arrivalEncounter, 'this route is seeded to an encounter');
  assert.equal(session.view().shipFight, undefined, 'nothing is fighting yet');

  assert.equal(session.run('shipfight:fire').ok, false, 'no fight to fire in yet');

  const started = session.run('arrival:fight');
  assert.equal(started.ok, true);
  assert.equal(session.arrivalEncounter, null, 'the encounter is consumed into the fight, not left standing behind it');
  assert.equal(session.run('arrival:fight').ok, false, 'a second fight cannot start over the first');

  let view = session.view();
  assert.ok(view.shipFight, 'the fight takes the screen');
  assert.equal(view.shipFight.roster.length, 2);
  assert.ok(view.shipFight.roster.some((entry) => entry.name === ship.identity.name));

  // Fire every round until it resolves one way or another — real dice, so the
  // number of rounds is not fixed, but Book 2 combat with an armed party ship
  // against an unarmed-by-default encounter resolves quickly.
  let guard = 0;
  while (session.view().shipFight.outcome === 'in-progress' && guard < 40) {
    guard += 1;
    const result = session.run('shipfight:fire');
    assert.equal(result.ok, true);
  }
  view = session.view();
  assert.notEqual(view.shipFight.outcome, 'in-progress', 'the fight reached a real conclusion within a sane number of rounds');
  assert.ok(view.shipFight.log.length > 0, 'shots were narrated');
  assert.deepEqual(view.shipFight.actions, [{ command: 'shipfight:end', label: 'End fight', primary: true }]);

  const ended = session.run('shipfight:end');
  assert.equal(ended.ok, true);
  assert.equal(session.view().shipFight, undefined, 'the fight is over and off the screen');
  assert.equal(session.run('shipfight:end').ok, false, 'nothing left to end');
  assert.equal(registry.resolveCampaign(campaignId).activityLogs[0].entries.some((entry) => entry.category === 'SHIP'), true);
});

// ---------------------------------------------------------------- v0.212.0
import { createEncounterDocument, endEncounterByReferee } from '../src/encounter-document.js';
import { addEncounterToCampaign } from '../src/campaign-document.js';
import { fightView } from '../src/play-session.js';

const fixedDice = { rollD6: () => 3, roll2D6: () => ({ dice: [2, 2], total: 4 }) };

async function campaignInAFight() {
  const registry = createDocumentRegistry({ storage: createMemoryStorage() });
  const { campaign } = registry.putBundle(JSON.parse(await readFile(fixture, 'utf8')));
  const r = registry.resolveCampaign(campaign.identity.id);
  const encounter = createEncounterDocument({
    campaign: r.campaign, characters: [r.characters[0]], opponents: [{ name: 'Thug' }, { name: 'Thug 2' }],
    spatialMode: 'range-line', date: { year: 4800, dayOfYear: 106 }, range: 'medium', dice: fixedDice
  });
  registry.put(encounter);
  registry.put(addEncounterToCampaign(r.campaign, encounter));
  return { registry, campaignId: campaign.identity.id, encounterId: encounter.identity.id };
}

test('a live encounter becomes the fight screen, and takes over the column', async () => {
  const { registry, campaignId } = await campaignInAFight();
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const view = session.view();

  assert.equal(view.situation.kind, 'fight');
  assert.match(view.situation.title, /^Fight, round 1$/);
  assert.equal(view.scene.kind, 'bands');
  assert.deepEqual(view.steps, [], 'port business is not offered during a fight');

  assert.equal(view.fighters.length, 3);
  const hawkeye = view.fighters.find((entry) => entry.playerCharacter);
  assert.equal(hawkeye.name, 'Hawkeye');
  assert.equal(hawkeye.side, 'party');
  assert.equal(hawkeye.down, false);
  // The range line keeps a combatant's band in position.column.
  assert.ok(Number.isInteger(hawkeye.band));
  // Full scores and wounded scores are kept apart.
  assert.deepEqual(hawkeye.full.STR, hawkeye.characteristics.STR);
  assert.ok(hawkeye.weapons.includes('hands'));
  assert.equal(hawkeye.upp, 'AB5678');

  const foes = view.fighters.filter((entry) => entry.side === 'foe');
  assert.equal(foes.length, 2);
  assert.ok(foes.every((entry) => entry.order === null), 'nothing is declared yet');
  assert.ok(view.fighters.every((entry) => entry.awaiting), 'everyone is awaiting orders in round 1');
});

test('fightView ignores an encounter that is over, so the port call returns', async () => {
  const { registry, campaignId, encounterId } = await campaignInAFight();
  const resolved = registry.resolveCampaign(campaignId);
  const encounter = resolved.encounters.find((entry) => entry.identity.id === encounterId);
  registry.put(endEncounterByReferee(encounter, { date: { year: 4800, dayOfYear: 106 } }).encounter);

  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const view = session.view();
  assert.equal(view.situation.kind, 'port');
  assert.equal(view.fighters, undefined);
  assert.equal(fightView({ status: 'resolved' }), null);
  assert.equal(fightView(null), null);
});

// ---------------------------------------------------------------- v0.213.0
import { engineActionFor } from '../src/play-session.js';

test('the screen\'s two rows map onto the engine\'s combined action (Book 1 p.28, p.32)', () => {
  // Walking while closing or opening still permits an attack; running and
  // evading do not. Kurt's ruling, and what the engine already did.
  assert.equal(engineActionFor({ move: 'Stand', attack: true }), 'attack');
  assert.equal(engineActionFor({ move: 'Stand', attack: false }), 'wait');
  assert.equal(engineActionFor({ move: 'Close', attack: true }), 'close');
  assert.equal(engineActionFor({ move: 'Close', running: true }), 'close-run');
  assert.equal(engineActionFor({ move: 'Open', attack: true }), 'open');
  assert.equal(engineActionFor({ move: 'Open', running: true }), 'open-run');
  assert.equal(engineActionFor({ move: 'Evade' }), 'evade');
  // Closing but holding fire has no combined action of its own; the engine's
  // nearest equivalent is the run, which also forbids the attack.
  assert.equal(engineActionFor({ move: 'Close', attack: false }), 'close-run');
});

test('declaring and resolving a round moves the fight on and writes it back', async () => {
  const { registry, campaignId } = await campaignInAFight();
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const before = session.view();
  const hawkeye = before.fighters.find((entry) => entry.playerCharacter);
  const thug = before.fighters.find((entry) => entry.side === 'foe');
  assert.equal(before.next.declare.actorId, hawkeye.id, 'the party character leads the declaration');

  const declared = session.run('fight:declare', { fight: { actorId: hawkeye.id, move: 'Close', attack: true, targetId: thug.id } });
  assert.equal(declared.ok, true);
  assert.match(declared.message, /Hawkeye declared close/);
  const mid = session.view();
  assert.equal(mid.fighters.find((entry) => entry.id === hawkeye.id).awaiting, false);
  assert.equal(mid.fighters.find((entry) => entry.id === hawkeye.id).order.engineAction, 'close');

  // A party character left undeclared still stops the round; the opposition
  // does not, because the engine falls back for them.
  assert.equal(session.run('fight:resolve').ok, true, 'the party has declared, so the round may resolve');

  const after = session.view();
  // Either the round advanced, or it paused for a wound the player must place.
  assert.ok(after.situation.title !== before.situation.title || after.next.wound);
  assert.equal(registry.resolveCampaign(campaignId).activityLogs[0].entries.at(-1).category, 'COMBAT');
});

test('ending a fight hands the column back to the port call', async () => {
  const { registry, campaignId } = await campaignInAFight();
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  assert.equal(session.view().situation.kind, 'fight');
  assert.deepEqual(session.view().refereeActions, [{ command: 'fight:end', label: 'End fight' }]);

  assert.equal(session.run('fight:end').ok, true);
  const after = session.view();
  assert.equal(after.situation.kind, 'port');
  assert.equal(after.fighters, undefined);
  assert.equal(session.run('fight:end').ok, false, 'no fight is running any more');
});

test('fight commands refuse what the rules refuse', async () => {
  const { registry, campaignId } = await campaignInAFight();
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const hawkeye = session.view().fighters.find((entry) => entry.playerCharacter);
  const thug = session.view().fighters.find((entry) => entry.side === 'foe');

  assert.match(session.run('fight:declare', { fight: {} }).message, /choose who is declaring/);
  assert.match(session.run('fight:wound').message, /no wound is waiting/);

  session.run('fight:declare', { fight: { actorId: hawkeye.id, move: 'Stand', attack: true, targetId: thug.id } });
  assert.match(session.run('fight:declare', { fight: { actorId: hawkeye.id, move: 'Stand', attack: true, targetId: thug.id } }).message, /already declared/);
});

test('a referee may let one NPC choose, or resolve with the rest on auto', async () => {
  const { registry, campaignId } = await campaignInAFight();
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const view = session.view();
  const thug = view.fighters.find((entry) => entry.side === 'foe');

  // Every fighter carries what it is holding, so the tracker can show it.
  assert.match(thug.weaponLabel, /^Automatic Pistol 3D/);
  assert.equal(thug.armorLabel, 'jack');
  // The target is defaulted to the nearest enemy; no click is needed to aim.
  assert.ok(view.next.declare.targetId);

  // One NPC, on the referee's say-so.
  assert.equal(session.run('fight:auto', { fight: { actorId: thug.id } }).ok, true);
  assert.equal(session.view().fighters.find((entry) => entry.id === thug.id).awaiting, false);
  // A declared combatant is never overridden by the auto pass.
  assert.equal(session.run('fight:auto', { fight: { actorId: thug.id } }).ok, false);

  // The rest, at resolution.
  assert.equal(session.run('fight:resolve-auto').ok, true);
  assert.match(registry.resolveCampaign(campaignId).activityLogs[0].entries.map((entry) => entry.message).join(' '), /\(auto\) declares/);
});

// ---------------------------------------------------------------- v0.218.0
import { chooseNpcDeclaration } from '../src/npc-tactics.js';
import { sheetRowToEngine, engineToSheetMove } from '../src/play-session.js';

test('NPC tactics read range from the board in use: four bands is medium, not four metres', async () => {
  // The Sea of Suns stalemate: club-armed opposition four bands from the party.
  const { registry, campaignId } = await campaignInAFight();
  const encounter = registry.resolveCampaign(campaignId).encounters[0];
  const thug = { ...encounter.combatants.find((entry) => entry.side === 'opposition'), weaponKey: 'club', skills: { Club: 1 } };
  const party = encounter.combatants.find((entry) => entry.side === 'party');
  const staged = { ...encounter, combatants: [{ ...party, position: { column: 0, row: 0 } }, { ...thug, position: { column: 4, row: 0 } }] };
  const choice = chooseNpcDeclaration(staged, staged.combatants[1]);
  assert.equal(choice.action, 'close', 'a club cannot reach at medium, so it closes');
  assert.match(choice.reason, /cannot reach at medium range/);
});

test('the sheet\'s rows meet the engine\'s combined action both ways', () => {
  assert.deepEqual(sheetRowToEngine({ move: 'Stand', targetId: 't' }), { action: 'attack', targetId: 't' });
  assert.deepEqual(sheetRowToEngine({ move: 'Stand', targetId: null }), { action: 'wait', targetId: null });
  assert.deepEqual(sheetRowToEngine({ move: 'Close', targetId: 't' }), { action: 'close', targetId: 't' });
  assert.deepEqual(sheetRowToEngine({ move: 'Close (run)', targetId: 't' }), { action: 'close-run', targetId: 't' });
  assert.deepEqual(sheetRowToEngine({ move: 'Evade', targetId: 't' }), { action: 'evade', targetId: null });
  for (const action of ['attack', 'close', 'close-run', 'open', 'open-run', 'evade']) {
    assert.equal(sheetRowToEngine({ move: engineToSheetMove(action), targetId: 't' }).action, action);
  }
});

test('fight:sheet declares every row, replaces standing orders, and resolves the round', async () => {
  const { registry, campaignId } = await campaignInAFight();
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const view = session.view();
  assert.equal(view.round, 1);
  assert.match(view.setup.range, /^Met at medium range$/);
  assert.ok(view.fighters.filter((entry) => entry.side === 'foe').every((entry) => entry.suggestion), 'each NPC row comes pre-filled with a suggestion and its reason');
  const hawkeye = view.fighters.find((entry) => entry.playerCharacter);
  const foes = view.fighters.filter((entry) => entry.side === 'foe');

  // An order already standing is replaced by what the sheet says.
  session.run('fight:declare', { fight: { actorId: hawkeye.id, move: 'Stand', attack: true, targetId: foes[0].id } });
  const rows = [{ actorId: hawkeye.id, move: 'Evade', targetId: null }, ...foes.map((foe) => ({ actorId: foe.id, move: 'Stand', targetId: hawkeye.id }))];
  const result = session.run('fight:sheet', { fight: { rows } });
  assert.equal(result.ok, true);
  const after = registry.resolveCampaign(campaignId).encounters[0];
  assert.equal(after.round, 2);
  assert.ok(after.history.some((entry) => entry.round === 1 && entry.kind === 'attack' && entry.actorId === foes[0].id), 'the opposition attacked');
  assert.equal(after.history.some((entry) => entry.round === 1 && entry.kind === 'attack' && entry.actorId === hawkeye.id), false, 'the evader did not');
});

// ---------------------------------------------------------------- v0.219.0
test('the referee may name, wound, heal and re-arm a character', async () => {
  const { registry, campaignId } = await atOrison({ fuel: 40, berthingPaid: true });
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const id = session.view().character.id;
  const character = () => registry.resolveCampaign(campaignId).characters.find((entry) => entry.identity.id === id);

  assert.equal(session.run('edit:character:name', { fight: { id, value: 'Hawk' } }).ok, true);
  assert.equal(character().identity.name, 'Hawk');
  assert.match(session.run('edit:character:name', { fight: { id, value: '  ' } }).message, /needs a name/);

  // Wounding: a characteristic at zero is unconscious, three zeros is dead.
  assert.equal(session.run('edit:character:current', { fight: { id, value: { END: 0 } } }).ok, true);
  assert.equal(character().current.END, 0);
  assert.equal(character().status.consciousness, 'unconscious');
  assert.equal(session.run('edit:character:current', { fight: { id, value: { STR: 0, DEX: 0 } } }).ok, true);
  assert.equal(character().status.alive, false);

  // Healing restores towards the original and cannot pass it.
  const full = character().characteristics;
  assert.equal(session.run('edit:character:current', { fight: { id, value: { STR: 99, DEX: 99, END: 99 } } }).ok, true);
  assert.deepEqual(['STR', 'DEX', 'END'].map((key) => character().current[key]), ['STR', 'DEX', 'END'].map((key) => full[key]));
  assert.equal(character().status.alive, true);
  assert.equal(session.run('edit:character:current', { fight: { id, value: { STR: -1 } } }).ok, false);

  assert.equal(session.run('edit:character:loadout', { fight: { id, value: { weaponKey: 'blade', armor: 'jack' } } }).ok, true);
  assert.equal(character().loadout.weaponKey, 'blade');
  assert.equal(character().loadout.armor, 'jack');
  assert.equal(registry.resolveCampaign(campaignId).activityLogs[0].entries.at(-1).category, 'REFEREE');
});

test('the referee may set a combatant mid-fight without touching the actor behind it', async () => {
  const { registry, campaignId } = await campaignInAFight();
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const thug = session.view().fighters.find((entry) => entry.side === 'foe');
  const actorBefore = JSON.stringify(registry.resolveCampaign(campaignId).npcActors);

  assert.equal(session.run('edit:combatant:current', { fight: { id: thug.id, value: { END: 1 } } }).ok, true);
  const after = session.view().fighters.find((entry) => entry.id === thug.id);
  assert.equal(after.characteristics.END, 1);
  assert.equal(JSON.stringify(registry.resolveCampaign(campaignId).npcActors), actorBefore, 'the roster actor is untouched');
});

// ---------------------------------------------------------------- v0.221.0
import { folderTree, refereeView, REFEREE_TABS } from '../src/play-session.js';
import { createNpcActorDocument, updateNpcActorDocument } from '../src/npc-actor-document.js';

test('folders are built from the paths on the entries, with counts that include what is deeper', () => {
  const tree = folderTree([
    { folder: 'Startown/Dock gangs' }, { folder: 'Startown/Dock gangs' },
    { folder: 'Startown/Port authority' }, { folder: 'Highport' }, { folder: '' }
  ]);
  assert.deepEqual(tree.map((entry) => [entry.path, entry.count, entry.depth]), [
    ['Highport', 1, 0],
    ['Startown', 3, 0],
    ['Startown/Dock gangs', 2, 1],
    ['Startown/Port authority', 1, 1],
    ['Unfiled', 1, 0]
  ]);
});

test('the directory shows one folder at a time, and a search looks everywhere', async () => {
  const { registry, campaignId } = await campaignInAFight();
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  assert.deepEqual(session.view().referee.tabs, [...REFEREE_TABS]);
  // v0.253.0: the activity log moved into Chat, and the Journal waits for
  // real journal documents rather than listing the log a second time.
  session.run('fight:end');
  assert.equal(session.view({ referee: { tab: 'Journal' } }).referee.total, 0);
  const chat = session.view().chat;
  assert.ok(chat.some((entry) => entry.kind === 'notice'), 'the log\u2019s lines are notices in Chat now');
  // Scenes used to say it was still referee-client-only; it has its own
  // directory now, so nothing is reported as unbuilt.
  assert.equal(session.view({ referee: { tab: 'Scenes' } }).referee.unbuilt, null);

  // The repository fixture carries no roster actors, so the directory's
  // folder behaviour is exercised against actors built here.
  const actors = [
    createNpcActorDocument({ name: 'Dock thug', folder: 'Startown/Dock gangs', weaponKey: 'club' }),
    createNpcActorDocument({ name: 'Second thug', folder: 'Startown/Dock gangs', weaponKey: 'club' }),
    createNpcActorDocument({ name: 'Customs officer', folder: 'Highport', weaponKey: 'automatic-pistol' }),
    createNpcActorDocument({ name: 'Nobody in particular' })
  ];
  const resolved = { ...registry.resolveCampaign(campaignId), npcActors: actors };

  const all = refereeView(resolved, { tab: 'Actors' });
  // v0.249.0: the campaign's player characters are actors too, and file
  // themselves under one folder of their own.
  assert.equal(all.total, 4 + (resolved.characters ?? []).length);
  assert.deepEqual(all.tree.map((entry) => [entry.path, entry.count]), [
    ['Highport', 1], ['Player characters', (resolved.characters ?? []).length], ['Startown', 2], ['Startown/Dock gangs', 2], ['Unfiled', 1]
  ]);

  const gang = refereeView(resolved, { tab: 'Actors', folder: 'Startown/Dock gangs' });
  assert.deepEqual(gang.shown.map((entry) => entry.name), ['Dock thug', 'Second thug']);
  // A parent folder holds nothing itself; its count is what lies deeper.
  assert.deepEqual(refereeView(resolved, { tab: 'Actors', folder: 'Startown' }).shown, []);

  // A search ignores the open folder.
  const found = refereeView(resolved, { tab: 'Actors', folder: 'Highport', query: 'thug' });
  assert.deepEqual(found.shown.map((entry) => entry.name), ['Dock thug', 'Second thug']);
});

// ---------------------------------------------------------------- v0.229.0
test('the Scenes tab creates, files, activates and deletes a scene', async () => {
  const { registry, campaignId } = await campaignInAFight();
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });

  // The first scene created has no active scene to compete with, so it
  // becomes the active one automatically — the same rule addScene() in the
  // referee client applies.
  assert.equal(session.run('scene:create', { fight: { value: { name: 'Alley' } } }).ok, true);
  let view = session.view({ referee: { tab: 'Scenes' } });
  assert.equal(view.referee.total, 1);
  let alley = view.referee.shown.find((entry) => entry.name === 'Alley');
  assert.ok(alley, 'the new scene is shown');
  assert.equal(alley.active, true);
  assert.match(alley.thumbnail, /<svg/, 'a colour-and-grid preview, not a photo');
  assert.equal(alley.folder, 'Scenes', 'the default folder');

  // A second scene in a named folder does not steal activation.
  assert.equal(session.run('scene:create', { fight: { value: { name: 'Dock gangs', folder: 'Startown' } } }).ok, true);
  view = session.view({ referee: { tab: 'Scenes' } });
  assert.equal(view.referee.total, 2);
  assert.deepEqual(view.referee.tree.map((entry) => entry.path).sort(), ['Scenes', 'Startown']);
  const dock = refereeView(registry.resolveCampaign(campaignId), { tab: 'Scenes', folder: 'Startown' }).shown[0];
  assert.equal(dock.active, false);

  // Filing moves it, and the campaign's own cached ref (used for the folder
  // tree without reading every scene document) moves with it.
  assert.equal(session.run('scene:file', { fight: { id: dock.id, value: 'Ports/Aster' } }).ok, true);
  assert.deepEqual(registry.resolveCampaign(campaignId).campaign.documentRefs.scenes.find((ref) => ref.id === dock.id).folder, 'Ports/Aster');

  // Activating the second scene deactivates the first; activating it again
  // (the same id) is a toggle back to none active.
  assert.equal(session.run('scene:activate', { fight: { id: dock.id } }).ok, true);
  assert.equal(registry.resolveCampaign(campaignId).campaign.activeSceneId, dock.id);
  assert.equal(session.run('scene:activate', { fight: { id: dock.id } }).ok, true);
  assert.equal(registry.resolveCampaign(campaignId).campaign.activeSceneId, null);

  // A scene with a fight on it cannot be deleted...
  const encounter = createEncounterDocument({
    campaign: registry.resolveCampaign(campaignId).campaign, characters: [registry.resolveCampaign(campaignId).characters[0]],
    opponents: [{ name: 'Thug' }], scene: registry.get(alley.id), date: { year: 4800, dayOfYear: 106 }, range: 'medium', dice: fixedDice
  });
  registry.put(encounter);
  registry.put(addEncounterToCampaign(registry.resolveCampaign(campaignId).campaign, encounter));
  session.reload(); // these two writes went straight to the registry, bypassing session.run()'s own reload
  assert.equal(session.run('scene:delete', { fight: { id: alley.id } }).ok, false);
  // ...but an unreferenced one goes, and clears activation and the ref.
  assert.equal(session.run('scene:delete', { fight: { id: dock.id } }).ok, true);
  const after = registry.resolveCampaign(campaignId);
  assert.equal(after.scenes.some((entry) => entry.identity.id === dock.id), false);
  assert.equal(after.campaign.documentRefs.scenes.some((ref) => ref.id === dock.id), false);
  assert.equal(registry.get(dock.id), null, 'the scene document itself is gone, not just the ref');
});

test('filing an actor moves it, and an unfiled actor keeps an empty path', () => {
  const actor = createNpcActorDocument({ name: 'Dock thug' });
  assert.equal(actor.profile.folder, '');
  const filed = updateNpcActorDocument(actor, { folder: ' Startown / Dock gangs ' });
  assert.equal(filed.profile.folder, 'Startown/Dock gangs');
  assert.equal(filed.identity.id, actor.identity.id, 'filing does not make a new actor');
});

// ---------------------------------------------------------------- v0.222.0
test('the Players tab files seats, open invites and requests to join', async () => {
  const { registry, campaignId } = await campaignInAFight();
  const resolved = registry.resolveCampaign(campaignId);
  const players = {
    seats: [{ uid: 'player-1', name: 'Rae', seatedAt: Date.UTC(4800, 0, 1) }],
    invites: [{ code: 'HJ42QP' }],
    joins: [{ uid: 'player-2', name: 'Tam', code: 'HJ42QP', characterId: resolved.characters[0].identity.id }]
  };
  const view = refereeView(resolved, { tab: 'Players', players });
  assert.deepEqual(view.tree.map((entry) => [entry.path, entry.count]), [
    ['Asking to join', 1], ['Open invites', 1], ['Seated', 1]
  ]);

  // A request shows the character it is asking to sit down with, not its uid.
  const asking = refereeView(resolved, { tab: 'Players', folder: 'Asking to join', players }).shown[0];
  assert.equal(asking.name, resolved.characters[0].identity.name);
  assert.deepEqual(asking.seat, { kind: 'join', uid: 'player-2', characterId: resolved.characters[0].identity.id });

  assert.equal(refereeView(resolved, { tab: 'Players', folder: 'Seated', players }).shown[0].seat.kind, 'seat');
  assert.equal(refereeView(resolved, { tab: 'Players', folder: 'Open invites', players }).shown[0].seat.code, 'HJ42QP');

  // Signed out there is nothing to show, and it says so rather than looking empty.
  assert.match(refereeView(resolved, { tab: 'Players' }).unbuilt, /Sign in/);
});

// ---------------------------------------------------------------- v0.225.0
test('v0.249.0 the Tables tab is gone; its reference is Journal material, not a directory', async () => {
  const { registry, campaignId } = await campaignInAFight();
  assert.equal(REFEREE_TABS.includes('Tables'), false);
  assert.deepEqual([...REFEREE_TABS], ['Journal', 'Actors', 'Players', 'Vehicles', 'Scenes']);
  // An unknown tab still falls back rather than throwing, so a stale link
  // or a saved tab name from before the change opens the Journal.
  const view = refereeView(registry.resolveCampaign(campaignId), { tab: 'Tables' });
  assert.equal(view.tab, 'Tables');
  assert.ok(Array.isArray(view.shown));
});

test('Vehicles says where a ship is and what it can do', async () => {
  const { registry, campaignId } = await atOrison({ fuel: 22, berthingPaid: true });
  const view = refereeView(registry.resolveCampaign(campaignId), { tab: 'Vehicles', folder: 'In service' });
  const ship = view.shown[0];
  assert.equal(ship.name, 'Marisol');
  assert.match(ship.note, /Jump-2/);
  assert.match(ship.note, /fuel 22\/40 t/);
  assert.match(ship.note, /berthed at orison/);
});

// v0.274.0: Kurt admitted a character to Sea of Suns from the play page and
// it never reached the Actors tab — Admit only seated the account.
test('v0.274.0 admitting a join request puts the character in the campaign, in the party, as the player\u2019s, and publishes their sheet', async () => {
  const { registry, campaignId } = await atOrison();
  const published = [];
  const cloud = { ...fakeCloud(), publishPlayerCharacter: async (sheet) => { published.push(sheet); } };
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR, cloud });
  const own = registry.resolveCampaign(campaignId).characters[0];
  const newcomer = JSON.parse(JSON.stringify(own));
  newcomer.identity = { ...newcomer.identity, id: 'char-newcomer', name: 'Leona Kade' };
  const admitted = session.run('character:admit', { fight: { value: { character: newcomer, ownerUid: 'player-7', playerName: 'BK' } } });
  assert.equal(admitted.ok, true, admitted.message);
  const resolved = registry.resolveCampaign(campaignId);
  assert.ok(resolved.characters.some((entry) => entry.identity.id === 'char-newcomer'));
  assert.ok(resolved.campaign.party.characterIds.includes('char-newcomer'));
  assert.equal(resolved.campaign.ownership.actors['char-newcomer'], 'player-7');
  assert.notEqual(resolved.campaign.activeCharacterId, 'char-newcomer', 'the referee\u2019s view does not jump to them');
  const rows = session.view({ referee: { tab: 'Actors', folder: 'Player characters' } }).referee.shown;
  assert.ok(rows.some((entry) => entry.name === 'Leona Kade'), 'and it is in the Actors tab');

  await settle(); await settle();
  assert.ok(published.some((sheet) => sheet.characterId === 'char-newcomer' && sheet.ownerUid === 'player-7'), 'their sheet goes up for player.html');
  const count = published.length;
  session.saveToCloud(); await settle(); await settle();
  assert.equal(published.length, count, 'an unchanged sheet is not written again');

  // A second Admit of the same character (one that stopped half-way) repairs rather than duplicates.
  assert.equal(session.run('character:admit', { fight: { value: { character: newcomer, ownerUid: 'player-7' } } }).ok, true);
  assert.equal(registry.resolveCampaign(campaignId).characters.filter((entry) => entry.identity.id === 'char-newcomer').length, 1);
});

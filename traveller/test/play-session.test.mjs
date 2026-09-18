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
  assert.deepEqual(procedure.steps.map((step) => [step.id, step.state]), [['fuel', 'ready'], ['speculate', 'ready'], ['jump', 'blocked']]);
  assert.match(procedure.steps[0].figure, /^30 t refined, Cr 15,000$/);
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
import { createShipDocument } from '../vendor/classic-traveller-rules/index.js';

async function traderAtAster({ steward = false } = {}) {
  const bundle = JSON.parse(await readFile(fixture, 'utf8'));
  bundle.campaign.location = { systemId: 'aster', systemName: 'Aster', worldId: 'aster-main', worldName: 'Aster' };
  const old = bundle.documents.ships[0];
  const crewAssignments = [{ role: 'pilot', characterId: 'char-04164baa70c3b5a6', characterName: 'Hawkeye' }];
  if (steward) crewAssignments.push({ role: 'steward', characterId: 'char-04164baa70c3b5a6', characterName: 'Hawkeye' });
  bundle.documents.ships[0] = createShipDocument({
    designKey: 'type-a-free-trader', id: old.identity.id, name: 'Marisol', registry: 'A-1', authority: old.authority, crewAssignments,
    state: { currentFuelTons: 30, portCall: { systemId: 'aster', arrivalDate: '106-4800', berthingDueCr: 100, berthingPaid: true } }
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
  const procedure = portProcedure({ ...resolved, contracts: [charter] }, { subsector: FAR_MERIDIAN_SUBSECTOR, selectedSystemId: 'calder' });
  assert.equal(procedure.steps.some((step) => step.command), false);
  assert.match(procedure.steps.find((step) => step.id === 'commerce').figure, /^Chartered to /);
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
  assert.equal(saved.schemaVersion, 4);
  assert.deepEqual(saved.inventory.map((item) => item.name), ['Laser Rifle, loaded', 'Revolver, loaded', 'Vacc suit']);
  assert.equal(saved.loadout.militaryLoad, true);
  assert.equal(session.run('inventory:add', { characterId: id, item: { name: '  ', weightKg: '1' } }).ok, false);
});

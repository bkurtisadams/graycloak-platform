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
  assert.deepEqual(procedure.next.actions.map((action) => action.command), ['trip:pay-berthing']);
  assert.deepEqual(procedure.steps.map((step) => [step.id, step.state]), [['fuel', 'ready'], ['fuel-skim', 'ready'], ['speculate', 'ready'], ['law', 'blocked'], ['wait', 'optional'], ['jump', 'blocked']]);
  // v0.315.2: Book 3 p.8 against what the party carries, as a row, not a caption block.
  assert.match(procedure.steps.find((step) => step.id === 'law').copy, /prohibited outside the starport/);
  assert.match(procedure.steps.find((step) => step.id === 'fuel').figure, /^30 t refined, Cr 15,000$/);
});

test('paying berthing and filling the tanks change the ship, the ledger and the log', async () => {
  const { registry, campaignId } = await atOrison();
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const before = session.resolved.ships[0].state.finances.balanceCr;

  assert.deepEqual(session.run('trip:pay-berthing'), { ok: true, message: 'Berthing paid, Cr100.' });
  assert.equal(session.resolved.ships[0].state.portCall.berthingPaid, true);
  assert.equal(session.resolved.ships[0].state.finances.balanceCr, before - 100);

  const filled = session.run('trip:fuel-fill');
  assert.equal(filled.ok, true);
  assert.equal(session.resolved.ships[0].state.currentFuelTons, 40);
  assert.equal(session.resolved.ships[0].state.finances.balanceCr, before - 100 - 15000);

  // It is in the registry, not only in the session: a fresh resolve sees it.
  const fresh = registry.resolveCampaign(campaignId);
  assert.equal(fresh.ships[0].state.currentFuelTons, 40);
  assert.deepEqual(fresh.activityLogs[0].entries.slice(-2).map((entry) => entry.category), ['PORT', 'PORT']);

  const view = session.view();
  assert.equal(view.next.title, 'Choose a destination');
  assert.deepEqual(view.done, ['Berthed, Cr 100', 'Overhauled 029-4800, next due 029-4801', 'Tanks full, 40 t']);
});

test('v0.315.1 an overhaul is offered when due, and not again once it is paid for', async () => {
  const { registry, campaignId } = await atOrison({ fuel: 40, berthingPaid: true });
  const ship = registry.resolveCampaign(campaignId).ships[0];
  // Last overhauled 330 days ago: due within 60 days.
  registry.put({ ...ship, state: { ...ship.state, maintenance: { status: 'current', lastOverhaulDate: '141-4799', monthsPastDue: 0 } } });
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const row = () => session.view().steps.find((step) => step.id === 'maintain');
  assert.equal(row().command, 'trip:maintain');
  const before = session.resolved.ships[0].state.finances.balanceCr;
  assert.equal(session.run('trip:maintain').ok, true);
  assert.equal(row(), undefined, 'paid for, it is not offered again');
  assert.ok(session.view().done.some((line) => /^Overhauled 106-4800, next due 106-4801$/.test(line)));
  assert.equal(session.resolved.ships[0].state.finances.balanceCr, before - 32490);
});

test('v0.315.1 a world picked on the map is a course to set from the column, not only from its caption', async () => {
  const { registry, campaignId } = await atOrison({ fuel: 40, berthingPaid: true });
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const picked = session.view({ selectedSystemId: 'pelagos' });
  assert.equal(picked.next.title, 'Set course for Pelagos');
  assert.deepEqual(picked.next.actions.map((action) => action.command), ['trip:choose-destination:pelagos']);
  assert.equal(session.run('trip:choose-destination:pelagos').ok, true);
  const other = session.view({ selectedSystemId: 'aster' });
  const change = other.steps.find((step) => step.id === 'change-course');
  assert.equal(change.command, 'trip:choose-destination:aster');
  assert.equal(session.view({ selectedSystemId: 'pelagos' }).steps.some((step) => step.id === 'change-course'), false, 'no change to the course already set');
});

test('a refused command changes nothing', async () => {
  const { registry, campaignId } = await atOrison({ fuel: 40, berthingPaid: true });
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const before = JSON.stringify(registry.resolveCampaign(campaignId).ships[0]);
  assert.deepEqual(session.run('trip:fuel-fill'), { ok: false, message: 'that is not possible in port now' });
  assert.equal(session.run('warp:nine').ok, false);
  assert.equal(JSON.stringify(registry.resolveCampaign(campaignId).ships[0]), before);
});

test('v0.315.0 a course is the runner\u2019s, set once and kept; the checklist says what it needs', async () => {
  const { registry, campaignId } = await atOrison({ fuel: 10, berthingPaid: true });
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const jump = () => session.view().steps.find((step) => step.id === 'jump');
  assert.equal(jump().figure, 'No course yet');
  assert.equal(session.view().checklist, null);
  assert.equal(session.run('trip:choose-destination:heliograph').ok, false, 'beyond jump range is no course');
  assert.equal(session.run('trip:choose-destination:pelagos').ok, true);
  assert.equal(registry.resolveCampaign(campaignId).campaign.roster.trip.destinationId, 'pelagos', 'the course is kept on the campaign');
  // A second session (a reload) sees the same course.
  const reloaded = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR }).view();
  assert.equal(reloaded.scene.courseId, 'pelagos');
  assert.match(jump().figure, /^Pelagos: fuel/);
  const checklist = session.view().checklist;
  assert.equal(checklist.ok, false);
  assert.equal(checklist.rows.find((row) => row.key === 'fuel').ok, false);
  assert.equal(checklist.rows.find((row) => row.key === 'flight-plan').ok, true);
  assert.match(checklist.diameters, /100 diameters/);
});

test('v0.315.0 off the lanes a course needs the Generate program', async () => {
  const { registry, campaignId } = await atOrison({ fuel: 40, berthingPaid: true });
  const scout = registry.resolveCampaign(campaignId).ships[0];
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  assert.equal(session.view().scene.generate, true, 'a Type S is delivered with Generate');
  const lanes = new Set(FAR_MERIDIAN_SUBSECTOR.routes.filter((route) => route.from === 'orison' || route.to === 'orison').map((route) => (route.from === 'orison' ? route.to : route.from)));
  const reachable = getJumpDestinations(FAR_MERIDIAN_SUBSECTOR, 'orison', 2).map((entry) => entry.system.id);
  const onLane = reachable.find((id) => lanes.has(id));
  const offLane = reachable.find((id) => !lanes.has(id));
  assert.ok(onLane && offLane, 'Orison has worlds in range both on and off its lanes');
  session.run(`trip:choose-destination:${offLane}`);
  assert.equal(session.view().checklist.rows.find((row) => row.key === 'flight-plan').ok, true, 'Generate plots it');

  registry.put({ ...scout, state: { ...scout.state, computer: { programs: scout.state.computer.programs.filter((key) => key !== 'generate') } } });
  const bare = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const row = () => bare.view().checklist.rows.find((entry) => entry.key === 'flight-plan');
  assert.equal(row().ok, false);
  assert.match(row().detail, /Generate/);
  assert.equal(bare.view().steps.find((step) => step.id === 'jump').state, 'blocked');
  bare.run(`trip:choose-destination:${onLane}`);
  assert.equal(row().ok, true, 'a charted lane sells its cassette here');
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
  session.run('trip:pay-berthing');
  await settle();
  session.run('trip:fuel-fill');
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
  session.run('trip:pay-berthing');
  await settle();
  cloud.bump(); // another browser saved revision 2
  session.run('trip:fuel-fill');
  await settle();
  assert.equal(session.save.state, 'stale');
  assert.equal(cloud.calls.length, 1, 'the stale write never landed');
  assert.deepEqual(session.run('trip:fuel-fill'), { ok: false, message: 'this campaign was changed elsewhere; reload first' });
  assert.equal(session.view().steps.every((step) => !step.command), true);
});

test('opening signed in adopts the cloud copy and its revision', async () => {
  const first = await atOrison();
  const cloud = fakeCloud();
  const writer = createPlaySession({ ...first, subsector: FAR_MERIDIAN_SUBSECTOR, cloud });
  await writer.connect();
  writer.run('trip:pay-berthing');
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
import { generateFreightOffers, parseUniversalWorldProfile, getSubsectorSystem, getJumpDestinations } from '../vendor/classic-traveller-rules/index.js';

// A trader with room: the fixture's scout has a 3 t hold, which no freight
// lot fits, and ship documents must match a canonical design, so swap in a
// Type A free trader (82 t, Jump-1) under the same id, at Aster, which has Jump-1 neighbours.
import { createShipDocument, armShipTurret } from '../vendor/classic-traveller-rules/index.js';

async function traderAtAster({ steward = false } = {}) {
  const bundle = JSON.parse(await readFile(fixture, 'utf8'));
  bundle.campaign.location = { systemId: 'aster', systemName: 'Aster', worldId: 'aster-main', worldName: 'Aster' };
  const old = bundle.documents.ships[0];
  // v0.315.0: a 200-ton hull needs a medic to depart (Book 2 p.17); Hawkeye doubles.
  const crewAssignments = [{ role: 'pilot', characterId: 'char-04164baa70c3b5a6', characterName: 'Hawkeye' }, { role: 'medic', characterId: 'char-04164baa70c3b5a6', characterName: 'Hawkeye' }];
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
  assert.equal(session.view().steps.some((step) => step.id.startsWith('freight')), false, 'nothing is offered until a course is set');
  session.run('trip:choose-destination:calder');
  const view = session.view();
  assert.equal(view.next.title, 'Bound for Calder');
  const freight = view.steps.filter((step) => step.command?.startsWith('trip:load-freight:'));
  assert.ok(freight.length >= 1 && freight.length <= 4);
  assert.ok(view.steps.some((step) => step.command === 'trip:book-passengers:middle'));
  // No steward: high passage is never bookable, and any waiting are turned
  // away in one quiet row that gives the reason.
  assert.equal(view.steps.some((step) => step.command === 'trip:book-passengers:high'), false);
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
  }).offers.filter((offer) => offer.tons <= 82).slice(0, 4).map((offer) => `trip:load-freight:${offer.id}`);
  session.run('trip:choose-destination:calder');
  const shown = session.view().steps.filter((step) => step.command?.startsWith('trip:load-freight:')).map((step) => step.command);
  assert.deepEqual(shown, expected);
});

test('loading freight and booking passengers fill the ship and leave the offer board', async () => {
  const { registry, campaignId } = await traderAtAster({ steward: true });
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  session.run('trip:choose-destination:calder');
  const lot = session.view().steps.find((step) => step.command?.startsWith('trip:load-freight:'));
  assert.equal(session.run(lot.command).ok, true);
  const ship = () => registry.resolveCampaign(campaignId).ships[0];
  assert.equal(ship().state.cargoManifest.length, 1);
  assert.equal(ship().state.cargoManifest[0].destinationSystemId, 'calder');
  assert.ok(ship().state.cargoUsedTons > 0);
  assert.equal(session.view().steps.some((step) => step.command === lot.command), false, 'a loaded lot is no longer offered');
  assert.equal(session.run(lot.command).ok, false, 'and cannot be loaded twice');

  const before = ship().state.finances.balanceCr;
  const middle = session.view().steps.find((step) => step.command === 'trip:book-passengers:middle');
  const count = Number(middle.verb.replace('Book ', ''));
  assert.equal(session.run('trip:book-passengers:middle').ok, true);
  assert.equal(ship().state.passengerManifest.filter((entry) => entry.class === 'middle').length, count);
  assert.equal(ship().state.finances.balanceCr, before, 'the engine credits fares on delivery, not at booking');
  assert.equal(ship().state.passengerManifest[0].fareCr, 8000);
  assert.ok(session.view().done.some((line) => /middle passage booked for Calder/.test(line)));

  // With passengers aboard for Calder, another course cannot be flown.
  session.run('trip:choose-destination:port-meridian');
  const jump = session.view().steps.find((step) => step.id === 'jump');
  assert.match(jump.figure, /Passengers aboard for Calder/);
});

test('freight and passengers need a course, and an exclusive charter refuses them', async () => {
  const { registry, campaignId } = await traderAtAster();
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  assert.equal(session.run('trip:book-passengers:middle').ok, false);

  const resolved = registry.resolveCampaign(campaignId);
  const charter = { ...resolved.contracts.find((entry) => entry.status === 'accepted'), requirements: { cargoTons: 0, exclusiveShip: true, description: '' } };
  const course = (systemId) => ({ ...resolved, contracts: [charter], campaign: { ...resolved.campaign, roster: { ...resolved.campaign.roster, trip: { situation: 'port', destinationId: systemId } } } });
  // A course other than the charter's own (Calder): commerce and the jump
  // itself both refuse, since the charter must be delivered first.
  const procedure = portProcedure(course('port-meridian'), { subsector: FAR_MERIDIAN_SUBSECTOR });
  assert.equal(procedure.steps.some((step) => step.command?.startsWith('trip:load-freight') || step.command?.startsWith('trip:book-passengers') || step.command === 'trip:depart'), false);
  assert.match(procedure.steps.find((step) => step.id === 'commerce').figure, /^Chartered to /);
  assert.match(procedure.steps.find((step) => step.id === 'jump').figure, /^Chartered to /);

  // Departing for the charter's own destination is allowed.
  const toCharter = portProcedure(course('calder'), { subsector: FAR_MERIDIAN_SUBSECTOR });
  assert.equal(toCharter.next.actions[0]?.command, 'trip:depart');
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
  assert.equal(saved.schemaVersion, 6);
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
// ---------------------------------------------------------------- v0.315.0
// The trip: depart, the encounter on the way out, the transit day, the jump
// as weeks, the encounter on the way in, and the landing — the runner's, with
// every step written back to the campaign.
function playTo(session, systemId, { limit = 20 } = {}) {
  const seen = [];
  for (let step = 0; step < limit; step += 1) {
    const view = session.view();
    seen.push(view.situation.kind);
    if (view.situation.kind === 'port' && session.resolved.campaign.location.systemId === systemId) return seen;
    const lead = view.situation.kind === 'encounter'
      ? view.next.actions.find((action) => /let-pass|pay-toll/.test(action.command)) ?? view.next.actions[0]
      : view.next.actions[0];
    if (!lead) return seen;
    const result = session.run(lead.command);
    if (!result.ok) throw new Error(result.message);
  }
  return seen;
}

test('departure lifts, jumps for a week and opens a new port call, each step kept on the campaign', async () => {
  const { registry, campaignId } = await traderAtAster({ steward: true });
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const before = session.resolved;
  const beforeDate = before.campaign.time;
  const beforeFuel = before.ships[0].state.currentFuelTons;

  assert.equal(session.run('trip:depart').ok, false, 'no course, no departure');
  session.run('trip:choose-destination:calder');
  assert.equal(session.run('trip:depart').ok, true);
  const trip = registry.resolveCampaign(campaignId).campaign.roster.trip;
  assert.ok(['encounter', 'in-jump'].includes(trip.situation), 'the trip is on the campaign');

  const seen = playTo(session, 'calder');
  assert.ok(seen.includes('jump'), 'the jump had a screen of its own');
  const after = registry.resolveCampaign(campaignId);
  // Book 2 p.1: about a day to 100 diameters, then the week in jump.
  assert.equal(after.campaign.time.dayOfYear, beforeDate.dayOfYear + 8);
  assert.equal(after.campaign.location.systemId, 'calder');
  const ship = after.ships[0];
  assert.ok(ship.state.currentFuelTons < beforeFuel);
  assert.equal(ship.state.portCall.systemId, 'calder');
  assert.equal(ship.state.portCall.berthingPaid, false);
  assert.ok(after.activityLogs[0].entries.some((entry) => entry.category === 'ARRIVAL'));
  assert.equal(after.campaign.roster.trip.situation, 'port');
});

test('a reload in jump space finds the ship still in jump space', async () => {
  const { registry, campaignId } = await traderAtAster({ steward: true });
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  session.run('trip:choose-destination:calder');
  session.run('trip:depart');
  if (session.view().situation.kind === 'encounter') session.run('trip:let-pass');
  const view = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR }).view();
  assert.equal(view.situation.kind, 'jump');
  assert.equal(view.scene.kind, 'jump');
  assert.equal(view.scene.toId, 'calder');
  assert.deepEqual(view.next.actions.map((action) => action.command), ['trip:jump-week']);
  assert.equal(view.steps.some((step) => step.id === 'jump-drives'), true);
  assert.equal(view.checklist, undefined, 'no port business shows in jump');
});

test('freight and passengers loaded for the destination are delivered and paid on arrival', async () => {
  const { registry, campaignId } = await traderAtAster({ steward: true });
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  session.run('trip:choose-destination:calder');
  const lot = session.view().steps.find((step) => step.command?.startsWith('trip:load-freight:'));
  session.run(lot.command);
  session.run('trip:book-passengers:middle');
  const before = session.resolved.ships[0].state.finances.balanceCr;
  session.run('trip:depart');
  playTo(session, 'calder');
  const ship = registry.resolveCampaign(campaignId).ships[0];
  assert.equal(ship.state.cargoManifest.some((entry) => entry.destinationSystemId === 'calder'), false);
  assert.equal(ship.state.passengerManifest.length, 0);
  assert.ok(ship.state.finances.balanceCr > before, 'freight revenue and passenger fares were credited, net of life support');
  assert.ok(registry.resolveCampaign(campaignId).activityLogs[0].entries.some((entry) => /freight delivered/.test(entry.message)));
});

test('an accepted contract for the destination pays out on arrival', async () => {
  const { registry, campaignId } = await traderAtAster({ steward: true });
  const resolved = registry.resolveCampaign(campaignId);
  registry.putAll(resolved.contracts.map((contract) => (contract.status === 'accepted'
    ? { ...contract, destination: { ...contract.destination, systemId: 'calder', systemName: 'Calder' }, timing: { ...contract.timing, deadlineDate: { year: 4900, dayOfYear: 1 } } }
    : contract)));
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  session.run('trip:choose-destination:calder');
  session.run('trip:depart');
  playTo(session, 'calder');
  const after = registry.resolveCampaign(campaignId);
  assert.ok(after.contracts.some((entry) => entry.status === 'completed'));
});

test('departure is refused when berthing is owed, fuel is short, or an exclusive charter binds elsewhere', async () => {
  const { registry: unpaidRegistry, campaignId: unpaidId } = await traderAtAster({ steward: true });
  const unpaidResolved = unpaidRegistry.resolveCampaign(unpaidId);
  unpaidRegistry.put({ ...unpaidResolved.ships[0], state: { ...unpaidResolved.ships[0].state, portCall: { ...unpaidResolved.ships[0].state.portCall, berthingPaid: false } } });
  const unpaid = createPlaySession({ registry: unpaidRegistry, campaignId: unpaidId, subsector: FAR_MERIDIAN_SUBSECTOR });
  unpaid.run('trip:choose-destination:calder');
  assert.equal(unpaid.run('trip:depart').ok, false);
  assert.match(unpaid.view().steps.find((step) => step.id === 'jump').figure, /berthing unpaid/);

  const { registry: dryRegistry, campaignId: dryId } = await traderAtAster({ steward: true });
  const dryResolved = dryRegistry.resolveCampaign(dryId);
  dryRegistry.put({ ...dryResolved.ships[0], state: { ...dryResolved.ships[0].state, currentFuelTons: 0 } });
  const dry = createPlaySession({ registry: dryRegistry, campaignId: dryId, subsector: FAR_MERIDIAN_SUBSECTOR });
  dry.run('trip:choose-destination:calder');
  assert.match(dry.run('trip:depart').message, /fuel/);
  assert.equal(dryRegistry.resolveCampaign(dryId).campaign.roster.trip.situation, 'port', 'a refusal is not a halt');

  const { registry, campaignId } = await traderAtAster({ steward: true });
  const resolved = registry.resolveCampaign(campaignId);
  registry.put({ ...resolved.contracts.find((entry) => entry.status === 'accepted'), destination: { systemId: 'port-meridian', systemName: 'Port Meridian' }, requirements: { cargoTons: 0, exclusiveShip: true, description: '' } });
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  session.run('trip:choose-destination:calder');
  assert.match(session.run('trip:depart').message, /chartered to Port Meridian/);
});

// A standing encounter, written straight onto the trip.
function standEncounter(registry, campaignId, encounter = {}) {
  const r = registry.resolveCampaign(campaignId);
  registry.put({ ...r.campaign, roster: { ...r.campaign.roster, trip: {
    situation: 'encounter', destinationId: null,
    departure: { fromSystemId: 'aster', toSystemId: 'calder', distance: 1, lane: true, leftOn: '106-4800' },
    encounter: { key: 'pirate', label: 'Pirate', hull: 'Type S', hullKey: 'type-s-scout-courier', phase: 'outbound', hostileByDefault: true,
      reaction: 'Hostile.', reactionTotal: 4, reactionDM: 0, systemId: 'aster', seedBase: 'test', tollDemandCr: null, ...encounter }
  } } });
}

async function armedScoutAtAster({ target = true } = {}) {
  const { registry, campaignId } = await traderAtAster({ steward: true });
  const oldShip = registry.resolveCampaign(campaignId).ships[0];
  let ship = createShipDocument({ designKey: 'type-s-scout-courier', id: oldShip.identity.id, name: oldShip.identity.name, authority: oldShip.authority, crewAssignments: oldShip.crew.assignments, state: { ...oldShip.state, currentFuelTons: 40 } });
  ship = armShipTurret(ship, { turretId: ship.specifications.armament.turrets[0].id, weapon: 'beam-laser', pricePerWeaponCr: 0 }).ship;
  const programs = ship.state.computer.programs.filter((key) => key !== 'target');
  ship = { ...ship, state: { ...ship.state, computer: { programs: target ? [...programs, 'target'] : programs } } };
  registry.put(ship);
  return { registry, campaignId };
}

test('an encounter leads the column, can be let pass, and the trip goes on', async () => {
  const { registry, campaignId } = await traderAtAster({ steward: true });
  standEncounter(registry, campaignId, { key: 'free-trader', label: 'Free Trader', hull: null, hullKey: 'free-trader', hostileByDefault: false });
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const view = session.view();
  assert.equal(view.situation.kind, 'encounter');
  assert.match(view.next.title, /Free Trader as the ship leaves Aster/);
  assert.deepEqual(view.next.actions.map((action) => action.command), ['trip:let-pass', 'trip:fight'], 'a hail is for the way in only');
  assert.equal(view.steps.length, 0, 'no port business behind it');
  assert.equal(session.run('trip:let-pass').ok, true);
  assert.equal(session.view().situation.kind, 'jump');
});

test('an encounter can be fought — lasers only, abbreviated — survives a reload, and the trip goes on after', async () => {
  const { registry, campaignId } = await armedScoutAtAster();
  standEncounter(registry, campaignId);
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  assert.equal(session.view().shipFight, undefined, 'nothing is fighting yet');
  assert.equal(session.run('shipfight:fire').ok, false, 'no fight to fire in yet');

  assert.equal(session.run('trip:fight').ok, true);
  assert.equal(registry.resolveCampaign(campaignId).campaign.roster.trip.situation, 'halted');
  assert.ok(registry.resolveCampaign(campaignId).campaign.roster.shipFight, 'the fight is kept on the campaign');
  assert.equal(session.run('trip:fight').ok, false, 'a second fight cannot start over the first');

  let view = session.view();
  assert.ok(view.shipFight, 'the fight takes the screen');
  assert.equal(view.shipFight.roster.length, 2);
  const turn = view.shipFight.gameTurn;

  // A reload picks the fight up where it left off.
  const reloaded = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  assert.equal(reloaded.view().shipFight.gameTurn, turn);
  assert.deepEqual(reloaded.view().shipFight.log, view.shipFight.log);

  // Real dice: a long exchange of misses is possible, so after forty rounds
  // the ship breaks off (Book 2 p.37), which always ends it.
  let guard = 0;
  while (reloaded.view().shipFight.outcome === 'in-progress' && guard < 200) {
    guard += 1;
    const actions = reloaded.view().shipFight.actions;
    const flee = guard > 40 ? actions.find((action) => action.command === 'shipfight:flee') : null;
    assert.equal(reloaded.run((flee ?? actions[0]).command).ok, true);
  }
  view = reloaded.view();
  assert.notEqual(view.shipFight.outcome, 'in-progress', 'the fight reached a real conclusion');
  assert.deepEqual(view.shipFight.actions, [{ command: 'shipfight:end', label: 'End fight', primary: true, kind: 'neutral' }]);
  assert.equal(reloaded.run('shipfight:end').ok, true);
  assert.equal(reloaded.view().shipFight, undefined, 'the fight is over and off the screen');
  assert.equal(registry.resolveCampaign(campaignId).campaign.roster.shipFight, undefined);
  assert.equal(reloaded.run('shipfight:end').ok, false, 'nothing left to end');

  const after = reloaded.view();
  assert.equal(after.situation.kind, 'halted');
  assert.deepEqual(after.next.actions.map((action) => action.command), ['trip:resume:continue', 'trip:resume:return']);
  assert.equal(reloaded.run('trip:resume:return').ok, true);
  assert.equal(reloaded.view().situation.kind, 'port');
  assert.equal(registry.resolveCampaign(campaignId).activityLogs[0].entries.some((entry) => entry.category === 'SHIP'), true);
});

test('v0.315.0 no Target program, no laser fire', async () => {
  const { registry, campaignId } = await armedScoutAtAster({ target: false });
  standEncounter(registry, campaignId);
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  session.run('trip:fight');
  const fight = session.view().shipFight;
  assert.equal(fight.actions.some((action) => action.command === 'shipfight:fire'), false);
  assert.match(fight.fireBlocked, /Target/);
  const combat = registry.resolveCampaign(campaignId).campaign.roster.shipFight.encounter;
  assert.equal(combat.participants.find((entry) => entry.id === 'player').computer.carried.includes('target'), false, 'the ship carries what it bought');
  assert.equal(combat.participants.find((entry) => entry.id === 'opponent').computer.loaded.includes('target'), true, 'an armed encountered ship carries Target');
});
// ---------------------------------------------------------------- v0.211.0
// ---------------------------------------------------------------- v0.230.0
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

// v0.276.0: the multiplayer channels the play page lacked. Only the referee
// client published the fight for players, read their orders and wound
// answers back, published their logs, or shared the chat.
async function multiplayerFixture() {
  const { registry, campaignId } = await atOrison();
  const { setDocumentOwner } = await import('../src/campaign-document.js');
  const me = registry.resolveCampaign(campaignId).characters[0].identity.id;
  registry.put(setDocumentOwner(registry.resolveCampaign(campaignId).campaign, { documentId: me, ownerUid: 'player-7' }));
  const sent = { views: [], logs: [], chat: [], cleared: [] };
  const cloud = {
    ...fakeCloud(),
    publishPlayerCharacter: async () => {},
    publishEncounterView: async (view) => { sent.views.push(view); },
    publishPlayerLog: async (log) => { sent.logs.push(log); },
    clearDeclarations: async (campaign, encounterId) => { sent.cleared.push(['declarations', encounterId]); },
    clearWoundAllocations: async (campaign, encounterId) => { sent.cleared.push(['wounds', encounterId]); },
    sendChat: async (campaign, message) => { sent.chat.push(message); }
  };
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR, cloud });
  const thug = session.run('actor:create', { fight: { value: { kind: 'statblock', name: 'Thug' } } }).createdId;
  session.run('fight:setup');
  session.run('fight:place', { fight: { value: { kind: 'character', id: me, column: 0 } } });
  session.run('fight:place', { fight: { value: { kind: 'actor', id: thug, column: 3 } } });
  session.run('fight:begin', { fight: { value: { surprise: 'none' } } });
  for (let tick = 0; tick < 6; tick += 1) await settle();
  const encounter = () => registry.resolveCampaign(campaignId).encounters.find((entry) => entry.status === 'active');
  return { session, registry, campaignId, me, sent, encounter };
}

test('v0.276.0 the live fight and each player\u2019s log are published for players when the referee saves', async () => {
  const { sent, encounter } = await multiplayerFixture();
  assert.ok(sent.views.some((view) => view.encounterId === encounter().identity.id), 'the fight view goes up');
  assert.ok(sent.logs.some((log) => log.uid === 'player-7'), 'and the player\u2019s log');
});

test('v0.276.0 a declaration for someone else\u2019s combatant is refused and told to that player', async () => {
  const { session, me, encounter } = await multiplayerFixture();
  const foe = encounter().combatants.find((entry) => entry.side !== 'party');
  const refused = session.applyPlayerDeclarations([{ uid: 'intruder', actorId: me, action: 'attack', targetId: foe.id, round: encounter().round, declaredAt: 1 }]);
  assert.equal(refused.length, 1);
  assert.match(refused[0].message, /does not own/);
});

test('v0.276.0 an owner\u2019s declaration lands as the character\u2019s order, once, however often the listener fires', async () => {
  const { session, me, encounter } = await multiplayerFixture();
  const foe = encounter().combatants.find((entry) => entry.side !== 'party');
  const entry = { uid: 'player-7', actorId: me, action: 'attack', targetId: foe.id, round: encounter().round, declaredAt: 5 };
  assert.deepEqual(session.applyPlayerDeclarations([entry]), []);
  const declared = encounter().declarations ?? encounter().orders ?? null;
  const view = session.view().fighters.find((fighter) => fighter.id === me);
  assert.ok(view.order || declared, 'the order is on the referee\u2019s board');
  assert.deepEqual(session.applyPlayerDeclarations([entry]), [], 'a repeat is ignored, not refused');
  assert.match(session.view().chat.map((line) => line.text).join('\n'), /declares attack from their own screen/);
});

test('v0.276.0 players\u2019 chat shows on the referee\u2019s page, and the referee\u2019s public chat is sent to them', async () => {
  const { session, sent } = await multiplayerFixture();
  session.setCloudChat([
    { id: 'm1', uid: 'player-7', name: 'Leona', kind: 'say', text: 'I take cover', createdAt: Date.now() },
    { id: 'm2', uid: 'referee-1', name: 'Referee', kind: 'say', text: 'mine, already in the log', createdAt: Date.now() }
  ]);
  const lines = session.view().chat;
  assert.ok(lines.some((line) => line.who === 'Leona' && line.text === 'I take cover'));
  assert.ok(!lines.some((line) => line.text === 'mine, already in the log'), 'the referee\u2019s own messages are not shown twice');
  session.run('chat:say', { fight: { value: 'Roll for initiative, just kidding' } });
  assert.ok(sent.chat.some((message) => message.text === 'Roll for initiative, just kidding' && message.uid === 'referee-1'));
});

test('v0.276.0 once the round moves on, the players\u2019 spent declarations and wound answers are cleared', async () => {
  const { session, sent, encounter } = await multiplayerFixture();
  const id = encounter().identity.id;
  session.run('fight:sheet', { fight: { rows: session.view().fighters.filter((entry) => !entry.down).map((entry) => ({ actorId: entry.id, move: 'Stand', targetId: null })) } });
  for (let tick = 0; tick < 6; tick += 1) await settle();
  assert.ok(sent.cleared.some(([what, encounterId]) => what === 'declarations' && encounterId === id));
  assert.ok(sent.cleared.some(([what, encounterId]) => what === 'wounds' && encounterId === id));
});

// v0.277.0: the player's seat builds the referee page's sheet from what the
// referee publishes for that player, read-only.
test('v0.277.0 a player\u2019s sheet is built from their published character and the campaign summary', async () => {
  const { registry, campaignId } = await atOrison();
  const { buildPublishedCharacter, buildPublishedCampaign } = await import('../src/published-view.js');
  const { playerSheetViews } = await import('../src/play-session.js');
  const { importCharacterDocument } = await import('../vendor/classic-traveller-rules/index.js');
  const resolved = registry.resolveCampaign(campaignId);
  const source = resolved.characters[0];
  const published = buildPublishedCharacter(source, { campaignId, ownerUid: 'player-7', publishedAt: 1 });
  assert.deepEqual(published.inventory, source.inventory, 'the Gear tab has what it needs');
  const { campaignId: _c, characterId: _id, ownerUid: _o, publishedAt: _p, ...document } = published;
  const character = importCharacterDocument(document);
  const envelope = buildPublishedCampaign(resolved.campaign, { publishedAt: 1 });
  for (const tab of ['Play', 'Gear', 'Record', 'Notes']) {
    const [sheet] = playerSheetViews(envelope, [character], [{ kind: 'actor', id: character.identity.id, tab }], { subsector: FAR_MERIDIAN_SUBSECTOR });
    assert.equal(sheet.title, source.identity.name);
    assert.deepEqual(sheet.tabs, ['Play', 'Gear', 'Record', 'Notes']);
    assert.equal(sheet.editable, false, 'the referee\u2019s copy is the one that counts');
    assert.equal(sheet.playerSeat, true);
  }
});

// v0.280.0: Kurt set up a fight and the player's page did not change: only a
// begun fight was published as current.
test('v0.280.0 a fight being set up is published as the current one, with its view', async () => {
  const { registry, campaignId } = await atOrison();
  const envelopes = [];
  const views = [];
  const cloud = { ...fakeCloud(), publishEncounterView: async (view) => { views.push(view); } };
  const save = cloud.save;
  cloud.save = async (home, envelope, options) => { envelopes.push(envelope); return save(home, envelope, options); };
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR, cloud });
  const me = registry.resolveCampaign(campaignId).characters[0].identity.id;
  session.run('fight:setup');
  session.run('fight:place', { fight: { value: { kind: 'character', id: me, column: 1 } } });
  for (let tick = 0; tick < 6; tick += 1) await settle();
  const setup = registry.resolveCampaign(campaignId).encounters.find((entry) => entry.status === 'setup');
  assert.ok(setup);
  assert.equal(envelopes.at(-1).currentEncounterId, setup.identity.id);
  assert.ok(views.some((view) => view.encounterId === setup.identity.id && view.status === 'setup'));
});

// v0.281.0: the log keeps ISO times and the cloud chat milliseconds; mixed,
// the order broke and the referee's Clear hid nothing.
test('v0.281.0 players\u2019 chat lines carry ISO times and sit in time order among the log\u2019s', async () => {
  const { session } = await multiplayerFixture();
  const later = Date.now() + 60000;
  session.setCloudChat([{ id: 'late', uid: 'player-7', name: 'Leona', kind: 'say', text: 'after everything', createdAt: later }]);
  const lines = session.view().chat;
  assert.ok(lines.every((line) => typeof line.at === 'string' && Number.isFinite(Date.parse(line.at))), 'every time an ISO string');
  assert.equal(lines.at(-1).text, 'after everything', 'the newest line is last');
  const times = lines.map((line) => Date.parse(line.at));
  assert.deepEqual(times, [...times].sort((a, b) => a - b));
});

// v0.282.0: Kurt — the player saw nothing of a ship fight, and the referee's
// Clear did not reach the player's chat.
test('v0.282.0 a ship fight is published for players with no controls, and gone when it ends', async () => {
  const { registry, campaignId } = await armedScoutAtAster();
  standEncounter(registry, campaignId);
  const envelopes = [];
  const cloud = fakeCloud();
  const save = cloud.save;
  cloud.save = async (home, envelope, options) => { envelopes.push(envelope); return save(home, envelope, options); };
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR, cloud });
  assert.equal(session.run('trip:fight').ok, true);
  for (let tick = 0; tick < 6; tick += 1) await settle();
  const published = envelopes.at(-1).shipFight;
  assert.ok(published, 'the fight is on the players\u2019 page');
  assert.equal(published.readOnly, true);
  assert.deepEqual(published.actions, []);
  assert.deepEqual(published.repairActions, []);
  assert.equal(published.roster.length, 2);
  let guard = 0;
  while (session.view().shipFight?.outcome === 'in-progress' && guard < 200) {
    guard += 1;
    const actions = session.view().shipFight.actions;
    session.run(((guard > 40 ? actions.find((action) => action.command === 'shipfight:flee') : null) ?? actions[0]).command);
  }
  session.run('shipfight:end');
  for (let tick = 0; tick < 6; tick += 1) await settle();
  assert.equal(envelopes.at(-1).shipFight, null, 'and leaves when it ends');
});

test('v0.282.0 the referee\u2019s Clear is kept on the campaign and published for players', async () => {
  const { registry, campaignId } = await atOrison();
  const envelopes = [];
  const cloud = fakeCloud();
  const save = cloud.save;
  cloud.save = async (home, envelope, options) => { envelopes.push(envelope); return save(home, envelope, options); };
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR, cloud });
  const at = new Date().toISOString();
  assert.equal(session.run('chat:clear', { fight: { value: at } }).ok, true);
  for (let tick = 0; tick < 6; tick += 1) await settle();
  assert.equal(envelopes.at(-1).chatClearedAt, at);
  assert.equal(session.run('chat:clear', { fight: { value: 'not a time' } }).ok, false);
});

// v0.283.0: Kurt — a player could not take up Hands; only the referee could.
test('v0.283.0 a player\u2019s order can change their weapon to one their character could take up', async () => {
  const { session, me, sent, encounter } = await multiplayerFixture();
  const mine = sent.views.at(-1).combatants.find((entry) => entry.id === me);
  assert.ok(mine.weaponChoices.some((choice) => choice.key === 'hands'), 'the choices are published for the player\u2019s own character');
  assert.ok(sent.views.at(-1).combatants.filter((entry) => !entry.playerCharacter).every((entry) => entry.weaponChoices === undefined), 'and not for the enemy');
  const foe = encounter().combatants.find((entry) => entry.side !== 'party');
  const refused = session.applyPlayerDeclarations([{ uid: 'player-7', actorId: me, action: 'attack', targetId: foe.id, round: encounter().round, declaredAt: 1, weaponKey: 'fusion-gun-man-portable' }]);
  assert.equal(refused.length, 1);
  assert.match(refused[0].message, /no fusion-gun-man-portable to take up/);
});

test('v0.283.0 taking up hands with an order sets the weapon, then declares', async () => {
  const { session, me, encounter } = await multiplayerFixture();
  const foe = encounter().combatants.find((entry) => entry.side !== 'party');
  assert.deepEqual(session.applyPlayerDeclarations([{ uid: 'player-7', actorId: me, action: 'attack', targetId: foe.id, round: encounter().round, declaredAt: 2, weaponKey: 'hands' }]), []);
  assert.equal(encounter().combatants.find((entry) => entry.id === me).weaponKey, 'hands');
  const { createPlayerDeclaration } = await import('../src/player-declaration.js');
  assert.equal(createPlayerDeclaration({ uid: 'u', actorId: 'a', action: 'wait', round: 1, weaponKey: 'hands' }).weaponKey, 'hands');
  assert.equal(createPlayerDeclaration({ uid: 'u', actorId: 'a', action: 'wait', round: 1 }).weaponKey, null);
});

// v0.285.0: the Players tab as one list, Remove, and a character going home.
test('v0.285.0 the players model lists requests, members with their characters, and anyone whose player has gone', async () => {
  const { registry, campaignId } = await atOrison();
  const { setDocumentOwner } = await import('../src/campaign-document.js');
  const { playersModel } = await import('../src/play-session.js');
  const resolved = () => registry.resolveCampaign(campaignId);
  const me = resolved().characters[0].identity.id;
  registry.put(setDocumentOwner(resolved().campaign, { documentId: me, ownerUid: 'player-7' }));
  const withSeat = playersModel(resolved(), { seats: [{ uid: 'player-7', name: 'Kurt', lastSeenAt: Date.now() }], invites: [{ code: 'ABC234' }], joins: [{ uid: 'p9', name: 'Ann', characterName: 'Leona' }] });
  assert.equal(withSeat.link, 'ABC234');
  assert.deepEqual(withSeat.requests.map((entry) => entry.characterName), ['Leona']);
  assert.deepEqual(withSeat.members.map((entry) => [entry.name, entry.characters.map((character) => character.id)]), [['Kurt', [me]]]);
  assert.deepEqual(withSeat.departed, []);
  const gone = playersModel(resolved(), { seats: [], invites: [], joins: [] });
  assert.deepEqual(gone.departed.map((entry) => [entry.id, entry.uid]), [[me, 'player-7']], 'no seat: their character is flagged');
});

test('v0.285.0 releasing a player\u2019s character takes it out of the campaign, optionally keeping an unowned copy', async () => {
  const { registry, campaignId } = await atOrison();
  const { setDocumentOwner, addCharacterToCampaign } = await import('../src/campaign-document.js');
  const resolved = () => registry.resolveCampaign(campaignId);
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const hawkeye = resolved().characters[0].identity.id;
  const copyId = session.run('character:copy', { fight: { id: hawkeye } }).createdId;
  const nico = resolved().characters.find((entry) => entry.identity.id === copyId);
  registry.put(setDocumentOwner(addCharacterToCampaign(resolved().campaign, nico, { active: true, makeActive: false }), { documentId: copyId, ownerUid: 'player-7' }));
  session.reload();
  const kept = session.run('character:release', { fight: { id: copyId, value: { keepCopy: true } } });
  assert.equal(kept.ok, true, kept.message);
  assert.equal(resolved().characters.some((entry) => entry.identity.id === copyId), false);
  assert.equal(resolved().campaign.ownership.actors[copyId], undefined);
  const copy = resolved().characters.find((entry) => entry.identity.name.endsWith('(kept)'));
  assert.ok(copy, 'a copy stays');
  assert.equal(resolved().campaign.ownership.actors[copy.identity.id], undefined, 'unowned: the referee\u2019s own');
});

test('v0.285.0 a character comes home with its campaign sheet and a stamp on its history', async () => {
  const { registry, campaignId } = await atOrison();
  const { createCharacterRecord, setCharacterRecordWorld, returnCharacterHome } = await import('../src/character-record.js');
  const { buildPublishedCharacter } = await import('../src/published-view.js');
  const { formatHistoryEvent } = await import('../client/ui-model.js');
  const source = registry.resolveCampaign(campaignId).characters[0];
  const record = setCharacterRecordWorld(createCharacterRecord(source, { ownerUid: 'player-7' }), { kind: 'campaign', campaignId: 'sea', campaignName: 'Sea of Suns', since: 1 });
  const played = JSON.parse(JSON.stringify(source));
  played.current.STR -= 2;
  played.finances.credits += 500;
  const home = returnCharacterHome({ ...record, lastCampaign: { campaignId: 'sea', campaignName: 'Sea of Suns', refereeName: 'BK Adams', from: '106-4800', to: '239-4804' } },
    buildPublishedCharacter(played, { campaignId: 'sea', ownerUid: 'player-7', publishedAt: 1 }),
    { campaignId: 'sea', campaignName: 'Sea of Suns', refereeName: 'BK Adams', from: '106-4800', to: '239-4804' });
  assert.equal(home.character.current.STR, source.current.STR - 2, 'wounds come home');
  assert.equal(home.character.finances.credits, source.finances.credits + 500, 'and money');
  assert.equal(home.lastCampaign, null);
  const stamp = home.character.history.at(-1);
  assert.equal(stamp.type, 'campaign');
  assert.equal(formatHistoryEvent(stamp), 'PLAYED IN SEA OF SUNS UNDER BK ADAMS  106-4800 TO 239-4804');
  assert.equal(returnCharacterHome(home, null, { campaignId: 'sea', to: '239-4804' }).character.history.filter((entry) => entry.type === 'campaign').length, 1, 'stamped once');
});

test('v0.291.0 a member seated by their own link shows the character still coming in', async () => {
  const { registry, campaignId } = await atOrison();
  const { playersModel } = await import('../src/play-session.js');
  const model = playersModel(registry.resolveCampaign(campaignId), { seats: [{ uid: 'p7', name: 'kurt' }], invites: [], joins: [{ uid: 'p7', characterId: 'c1', characterName: 'Nico Arden' }] });
  assert.equal(model.members[0].characters.length, 0);
  assert.equal(model.members[0].joining.characterName, 'Nico Arden');
});

// ---------------------------------------------------------------- v0.315.3
import { commandKind } from '../src/play-session.js';

test('v0.315.3 every button and port row has a kind: owed, travel, money, optional, danger or plain', async () => {
  assert.equal(commandKind('trip:pay-berthing'), 'owed');
  assert.equal(commandKind('trip:depart'), 'travel');
  assert.equal(commandKind('trip:resume:continue'), 'travel');
  assert.equal(commandKind('trip:load-freight:freight-1'), 'money');
  assert.equal(commandKind('speculation:buy'), 'optional');
  assert.equal(commandKind('speculation:sell:x'), 'money');
  assert.equal(commandKind('trip:fight'), 'danger');
  assert.equal(commandKind('trip:let-pass'), 'neutral');
  assert.equal(commandKind('shipfight:flee'), 'travel');

  const { registry, campaignId } = await atOrison();
  const view = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR }).view();
  assert.equal(view.next.actions[0].kind, 'owed', 'Pay berthing leads, owed');
  const kinds = Object.fromEntries(view.steps.map((step) => [step.id, step.kind]));
  assert.equal(kinds.fuel, 'owed');
  assert.equal(kinds['fuel-skim'], 'optional');
  assert.equal(kinds.speculate, 'optional');
  assert.equal(kinds.wait, 'optional');
  assert.equal(kinds.law, 'danger', 'the law row has no button but is coloured as a risk');
  assert.equal(kinds.jump, 'travel');
});

// ---------------------------------------------------------------- v0.315.6
import { financeShip } from '../vendor/classic-traveller-rules/index.js';

test('v0.315.6 Pass time in port runs the ship\u2019s clock; away from port it is refused', async () => {
  const { registry, campaignId } = await traderAtAster({ steward: true });
  const ship = registry.resolveCampaign(campaignId).ships[0];
  registry.put(financeShip(ship, { startedOn: '106-4800', homeSystemId: 'aster' }));
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const passed = session.run('time:pass', { fight: { value: { amount: 31, unit: 'days' } } });
  assert.equal(passed.ok, true, passed.message);
  const after = registry.resolveCampaign(campaignId);
  assert.equal(formatCampaignDate(after.campaign.time), '137-4800');
  assert.ok(after.ships[0].state.finances.ledger.some((entry) => entry.kind === 'mortgage' && entry.date === '136-4800'), 'the mortgage fell due and was paid');

  session.run('trip:choose-destination:calder');
  session.run('trip:depart');
  if (session.view().situation.kind === 'encounter') session.run('trip:let-pass');
  const date = formatCampaignDate(registry.resolveCampaign(campaignId).campaign.time);
  const refused = session.run('time:pass', { fight: { value: { amount: 1, unit: 'days' } } });
  assert.equal(refused.ok, false);
  assert.match(refused.message, /in jump space/);
  assert.equal(formatCampaignDate(registry.resolveCampaign(campaignId).campaign.time), date);
});

test('v0.315.6 a hijacking halts the trip with the Start a fight panel, the party ready to take the field', async () => {
  const { registry, campaignId } = await traderAtAster({ steward: true });
  const r = registry.resolveCampaign(campaignId);
  registry.put({ ...r.campaign, roster: { ...r.campaign.roster, trip: {
    situation: 'halted', halt: { reason: 'hijack', detail: 'a passenger attempts a hijacking (3D: 18) on day 3 of the voyage (Book 2 p.3)', from: 'in-jump' },
    jump: { fromSystemId: 'aster', toSystemId: 'calder', startedOn: '106-4800', weeks: 1, weeksDone: 0, misjump: false, destroyed: false, landedHex: '0606', landedSystemId: 'calder' }
  } } });
  const view = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR }).view();
  assert.equal(view.situation.kind, 'halted');
  assert.deepEqual(view.boardFight, { reason: 'hijack', opponents: 'the hijackers' });
  assert.ok(view.partyChoices.length >= 1);
  assert.deepEqual(view.next.actions.map((action) => action.command), ['trip:resume:continue']);
});

// ---------------------------------------------------------------- v0.316.0
test('v0.316.0 at a class A or B port the shipyard fits a turret, a laser and the Target program', async () => {
  const { registry, campaignId } = await traderAtAster({ steward: true });
  const ship = registry.resolveCampaign(campaignId).ships[0];
  const rich = { balanceCr: 5_000_000, ledger: [{ id: 'opening', date: '106-4800', kind: 'transfer', description: 'Opening balance', amountCr: 5_000_000, balanceCr: 5_000_000 }], mortgage: null };
  registry.put({ ...ship, state: { ...ship.state, finances: rich, computer: { programs: ship.state.computer.programs.filter((key) => key !== 'target') } } });
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const yard = session.view().shipyard;
  assert.ok(yard, 'Aster (class B) has a shipyard');
  assert.deepEqual(yard.hardpoints, { total: 2, fitted: 0, empty: 2 });
  assert.deepEqual(yard.mounts.map((entry) => entry.command), ['shipyard:turret:single', 'shipyard:turret:double', 'shipyard:turret:triple']);
  assert.equal(session.run('shipyard:turret:double').ok, true);
  let after = registry.resolveCampaign(campaignId).ships[0];
  assert.equal(after.specifications.armament.turrets[0].id, 'T-1');
  assert.equal(after.specifications.cargo.capacityTons, 81);
  assert.equal(session.run('shipyard:weapon:T-1:beam-laser').ok, true);
  const target = session.view().shipyard.software.find((entry) => entry.command === 'shipyard:software:target');
  assert.match(target.note, /cannot fire without it/, 'Target is flagged once a laser is fitted');
  assert.equal(session.view().shipyard.software[0].command, 'shipyard:software:target', 'and leads the list');
  assert.equal(session.run('shipyard:software:target').ok, true);
  after = registry.resolveCampaign(campaignId).ships[0];
  assert.deepEqual(after.state.armament.turrets, [{ id: 'T-1', weapons: ['beam-laser'] }]);
  assert.ok(after.state.computer.programs.includes('target'));
  assert.equal(after.state.finances.balanceCr, 5_000_000 - 500_000 - 1_000_000 - 1_000_000);
});

test('v0.316.0 a class C, D or E port has no shipyard for fitting out', async () => {
  const { registry, campaignId } = await atOrison({ fuel: 40, berthingPaid: true });
  const r = registry.resolveCampaign(campaignId);
  registry.put({ ...r.campaign, location: { systemId: 'cinder', systemName: 'Cinder', worldId: 'cinder-main', worldName: 'Cinder' } });
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  assert.equal(session.view().shipyard, null);
  assert.match(session.run('shipyard:software:target').message, /class A or B only/);
});

test('v0.315.7 an attacking pirate offers Run or Fight; running starts the fight already breaking off', async () => {
  const { registry, campaignId } = await armedScoutAtAster();
  standEncounter(registry, campaignId, { attacking: true, attackThrow: 'attack throw 9 against 8+' });
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const view = session.view();
  assert.match(view.next.title, /^Pirate attacks as the ship leaves Aster/);
  assert.deepEqual(view.next.actions.map((action) => [action.command, action.kind]), [['trip:run', 'travel'], ['trip:fight', 'danger']]);
  assert.equal(session.run('trip:let-pass').ok, false);
  assert.equal(session.run('trip:run').ok, true);
  const fight = registry.resolveCampaign(campaignId).campaign.roster.shipFight.encounter;
  // Real dice: the pirate intrudes and fires first, and now and then that
  // volley ends the fight before the ship can break off at all.
  if (fight.outcome === 'in-progress' || fight.participants.find((entry) => entry.id === 'player').fled) {
    assert.equal(fight.participants.find((entry) => entry.id === 'player').fled, true);
    assert.match(session.view().shipFight.log.join(' '), /breaks off and runs/);
  }
});

// ---------------------------------------------------------------- v0.316.1
test('v0.316.1 a pirate that holds off says so; one met before the attack throw existed throws it on load', async () => {
  const { registry, campaignId } = await armedScoutAtAster();
  standEncounter(registry, campaignId, { attacking: false, attackThrow: 'attack throw 5 against 8+' });
  let view = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR }).view();
  assert.match(view.next.title, /^Pirate holds off as the ship leaves Aster/);
  assert.match(view.next.copy, /attack throw 5 against 8\+ failed/);
  assert.equal(view.next.actions[0].command, 'trip:let-pass');

  standEncounter(registry, campaignId, { reactionTotal: 2, reaction: 'Violent. Immediate attack.' });
  view = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR }).view();
  assert.deepEqual(view.next.actions.map((action) => action.command), ['trip:run', 'trip:fight'], 'an old standing pirate with a violent reaction attacks');
});

test('v0.316.1 the Shipyard is a masthead drawer, and the data card names the weapons', async () => {
  const { registry, campaignId } = await armedScoutAtAster();
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const view = session.view();
  assert.equal(view.shipyardAt, 'B');
  assert.ok(view.shipyard);
  const sheet = session.view({ sheets: [{ kind: 'ship', id: session.resolved.ships[0].identity.id }] }).sheets[0];
  assert.ok(sheet.lines.some((line) => /^T-1 \(B\) Gunner-0 \u2014 beam laser, double turret$/.test(line)), sheet.lines.join('\n'));
});

// ---------------------------------------------------------------- v0.316.3
import { shipSectionStrip } from '../src/play-session.js';

test('v0.316.3 the section strip lights hits, destroyed sections and a declared repair', async () => {
  const { registry, campaignId } = await armedScoutAtAster();
  const ship = registry.resolveCampaign(campaignId).ships[0];
  const clean = shipSectionStrip(ship);
  assert.deepEqual(clean.map((cell) => cell.key), ['maneuver-drive', 'jump-drive', 'power-plant', 'fuel', 'hold', 'computer', 'hull', 'turret-T-1']);
  assert.ok(clean.every((cell) => cell.state === 'ok'));
  const hurt = { ...ship, state: { ...ship.state, damage: { ...ship.state.damage, hold: 1, turrets: ['T-1'] } } };
  const strip = shipSectionStrip(hurt, { repairing: { location: 'hold', turretId: null } });
  assert.equal(strip.find((cell) => cell.key === 'hold').state, 'repairing');
  assert.equal(strip.find((cell) => cell.key === 'turret-T-1').state, 'out');
  const view = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR }).view({ sheets: [{ kind: 'ship', id: ship.identity.id }] });
  assert.equal(view.sheets[0].strip.length, 8);
  assert.equal(view.ship.strip.length, 8);
});

test('v0.316.3 the Shipyard chip asks for attention only when the yard can put something right', async () => {
  const { registry, campaignId } = await armedScoutAtAster({ target: false });
  let yard = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR }).view().shipyard;
  assert.match(yard.attention.join(' '), /Target program is not carried/);
  const ship = registry.resolveCampaign(campaignId).ships[0];
  registry.put({ ...ship, state: { ...ship.state, computer: { programs: [...ship.state.computer.programs, 'target'] } } });
  yard = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR }).view().shipyard;
  assert.deepEqual(yard.attention, [], 'a good port with nothing wrong: plain');
});

// ---------------------------------------------------------------- v0.316.4
import { programUnusable } from '../src/play-session.js';

test('v0.316.4 the Shipyard greys out a program the ship can never run, and refuses to sell it', async () => {
  const { registry, campaignId } = await armedScoutAtAster();
  const rich = { balanceCr: 20_000_000, ledger: [{ id: 'opening', date: '106-4800', kind: 'transfer', description: 'Opening balance', amountCr: 20_000_000, balanceCr: 20_000_000 }], mortgage: null };
  const ship = registry.resolveCampaign(campaignId).ships[0];
  registry.put({ ...ship, state: { ...ship.state, finances: rich } });
  const scout = registry.resolveCampaign(campaignId).ships[0];
  assert.match(programUnusable(scout, 'jump-4'), /needs a Jump-4 drive; .* has Jump-2/);
  assert.match(programUnusable(scout, 'predict-5'), /too large to run beside Target in a Model\/1 \(CPU 2\)/);
  assert.equal(programUnusable(scout, 'predict-3'), null);
  assert.equal(programUnusable(scout, 'return-fire'), null);
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const jump4 = session.view().shipyard.software.find((entry) => entry.key === 'jump-4');
  assert.equal(jump4.command, null);
  assert.match(jump4.blocked, /Jump-4 drive/);
  assert.match(session.run('shipyard:software:jump-4').message, /would never run/);
});

test('v0.316.4 the referee can take a program off the card', async () => {
  const { registry, campaignId } = await armedScoutAtAster();
  const ship = registry.resolveCampaign(campaignId).ships[0];
  registry.put({ ...ship, state: { ...ship.state, computer: { programs: [...ship.state.computer.programs, 'jump-4'] } } });
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const sheet = session.view({ sheets: [{ kind: 'ship', id: ship.identity.id }] }).sheets[0];
  assert.match(sheet.programs.find((entry) => entry.key === 'jump-4').unusable, /Jump-4 drive/);
  assert.equal(session.run('edit:ship:remove-program', { fight: { id: ship.identity.id, value: 'jump-4' } }).ok, true);
  assert.equal(registry.resolveCampaign(campaignId).ships[0].state.computer.programs.includes('jump-4'), false);
});

test('v0.316.4 an Air/Raft lot is sold each at 4 t of hold; a scout\u2019s 3 t cannot take one', async () => {
  // Calder's lot in the week of day 114 is three Air/Rafts at Cr 4,200,000.
  const place = async (registry, campaignId) => {
    const r = registry.resolveCampaign(campaignId);
    const ship = r.ships[0];
    const rich = { balanceCr: 20_000_000, ledger: [{ id: 'opening', date: '114-4800', kind: 'transfer', description: 'Opening balance', amountCr: 20_000_000, balanceCr: 20_000_000 }], mortgage: null };
    registry.putAll([
      { ...r.campaign, time: { ...r.campaign.time, dayOfYear: 114 }, location: { systemId: 'calder', systemName: 'Calder', worldId: 'calder-main', worldName: 'Calder' } },
      { ...ship, state: { ...ship.state, finances: rich, portCall: { ...ship.state.portCall, systemId: 'calder', arrivalDate: '114-4800', berthingPaid: true } } }
    ]);
    return createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  };
  const trader = await traderAtAster({ steward: true });
  const session = await place(trader.registry, trader.campaignId);
  const row = session.view().steps.find((step) => step.id === 'speculate');
  assert.equal(row.title, 'Buy Air/Raft to resell');
  assert.equal(row.verb, 'Buy 3');
  assert.match(row.figure, /^3 \(12 t\) at Cr 4,200,000 each/);
  assert.equal(session.run('speculation:buy').ok, true);
  const lot = trader.registry.resolveCampaign(trader.campaignId).ships[0].state.cargoManifest.find((entry) => entry.category === 'speculative:52');
  assert.equal(lot.tons, 12);

  const scout = await armedScoutAtAster();
  const blocked = (await place(scout.registry, scout.campaignId)).view().steps.find((step) => step.id === 'speculate');
  assert.equal(blocked.state, 'blocked');
  assert.match(blocked.copy, /One Air\/Raft takes 4 t of hold; 3 t is free/);
  assert.match(blocked.figure, /Cr 4,200,000 each$/);
});

// ---------------------------------------------------------------- v0.317.0
test('v0.317.0 the Shipyard retrofits a bigger computer, the old traded in, and the programs it frees become usable', async () => {
  const { registry, campaignId } = await armedScoutAtAster();
  const rich = { balanceCr: 20_000_000, ledger: [{ id: 'opening', date: '106-4800', kind: 'transfer', description: 'Opening balance', amountCr: 20_000_000, balanceCr: 20_000_000 }], mortgage: null };
  const ship = registry.resolveCampaign(campaignId).ships[0];
  registry.put({ ...ship, state: { ...ship.state, finances: rich } });
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  const offers = session.view().shipyard.computer.offers;
  const two = offers.find((entry) => entry.label === 'Model/2');
  assert.equal(two.command, 'shipyard:computer:2');
  assert.equal(two.costCr, 8_500_000);
  assert.match(offers.find((entry) => entry.label === 'Model/5').blocked, /needs 4 t more/);
  assert.match(programUnusable(registry.resolveCampaign(campaignId).ships[0], 'predict-5'), /too large/);
  assert.equal(session.run('shipyard:computer:2').ok, true);
  const after = registry.resolveCampaign(campaignId).ships[0];
  assert.equal(after.specifications.computer.model, '2');
  assert.equal(after.specifications.cargo.capacityTons, 2);
  assert.equal(programUnusable(after, 'predict-5'), null, 'Predict 5 (2 space) runs beside Target in CPU 3');
  assert.equal(session.view().shipyard.computer.model, '2');
});

test('v0.317.0 the fight never loads a program the CPU can never run', async () => {
  const { shipCombatLoadout } = await import('../src/ship-arrival-combat.js');
  const { registry, campaignId } = await armedScoutAtAster();
  const ship = registry.resolveCampaign(campaignId).ships[0];
  const loaded = shipCombatLoadout({ ...ship, state: { ...ship.state, computer: { programs: ['target', 'predict-5', 'predict-3', 'return-fire'] } } }).loaded;
  assert.deepEqual(loaded, ['target', 'return-fire', 'predict-3']);
});

// ---------------------------------------------------------------- v0.318.0
import { personEncounterRecord, describePersonEncounter, personState } from '../src/play-session.js';
import { createSequenceDice, rollPersonEncounter } from '../vendor/classic-traveller-rules/index.js';

test('v0.318.0 police who meet a party carrying what the law forbids throw the law level to avoid arrest', () => {
  const police = rollPersonEncounter(createSequenceDice([2, 3, 4, 3, 3, 4, 4, 5, 5, 6, 6, 6, 6, 1]));
  const law = { level: 7, caught: [{ name: 'Hawkeye', weaponName: 'Laser Rifle' }] };
  const arrested = personEncounterRecord(createSequenceDice([3, 2, 4]), police, { date: '106-4800', worldName: 'Orison', law });
  assert.deepEqual(arrested.law, { level: 7, violations: ['Hawkeye\u2019s Laser Rifle'], total: 5, avoided: false, arrested: ['Hawkeye'], jailDays: 4,
    seized: [{ id: null, name: 'Hawkeye', weaponKey: undefined, weaponName: 'Laser Rifle' }] });
  const waved = personEncounterRecord(createSequenceDice([4, 4]), police, { date: '106-4800', worldName: 'Orison', law });
  assert.equal(waved.law.avoided, true);
  assert.equal(personEncounterRecord(createSequenceDice([]), police, { date: '106-4800', worldName: 'Orison', law: null }).law, null, 'nothing forbidden, nothing to throw');
  assert.equal(describePersonEncounter(arrested), '4 police with a vehicle (automatic pistols, cloth armour)');
});

test('v0.318.0 a person encounter waits on the campaign, goes on the board as statblocks, and is set aside', async () => {
  const { registry, campaignId } = await atOrison({ fuel: 40, berthingPaid: true });
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  let pending = null;
  // Police here would arrest Hawkeye (law level 7) and offer jail instead;
  // that path has its own test, so they are set aside and thrown again.
  for (let tries = 0; tries < 60 && !pending; tries += 1) {
    assert.equal(session.run('persons:roll').ok, true);
    pending = personState(registry.resolveCampaign(campaignId).campaign).pending;
    if (pending?.law && !pending.law.avoided) { session.run('persons:clear'); pending = null; }
  }
  assert.ok(pending, 'the table gives a group within forty throws');
  const view = session.view();
  assert.equal(view.personEncounter.type, pending.type);
  assert.deepEqual(view.personEncounter.actions.map((action) => [action.command, action.kind]), [['persons:board', 'danger'], ['persons:clear', 'neutral']]);
  assert.equal(session.run('persons:roll').ok, false, 'one at a time');
  assert.equal(session.run('persons:board').ok, true);
  const after = registry.resolveCampaign(campaignId);
  const ids = personState(after.campaign).pending.actorIds;
  assert.equal(ids.length, pending.quantity);
  const actor = after.npcActors.find((entry) => entry.identity.id === ids.at(-1));
  assert.equal(actor.characteristics.STR, pending.characteristics.strength);
  assert.equal(actor.loadout.weaponKey, pending.weapon);
  assert.deepEqual(session.view().personEncounter.actions.map((action) => action.command), ['persons:clear']);
  assert.equal(session.run('persons:clear').ok, true);
  assert.equal(personState(registry.resolveCampaign(campaignId).campaign).pending, null);
});

test('v0.318.1 an arrest is served as 1D days in jail: the party leaves the surface and the days pass', async () => {
  const { registry, campaignId } = await atOrison({ fuel: 40, berthingPaid: true });
  const r = registry.resolveCampaign(campaignId);
  const record = { date: '106-4800', worldName: 'Orison', code: 23, type: 'Police', quantity: 3, quantityDice: '1D', vehicle: true, weaponry: 'Automatic Pistols', armor: 'Cloth',
    weapon: 'automatic-pistol', armorKey: 'cloth', characteristics: { strength: 7, dexterity: 7, endurance: 7 }, extraordinary: null,
    reaction: { total: 5, dice: [2, 3], description: 'Hostile. May attack.' }, enforcement: true, actorIds: [],
    law: { level: 7, violations: ['Hawkeye\u2019s Laser Rifle'], total: 4, avoided: false, arrested: ['Hawkeye'], jailDays: 3,
      seized: [{ id: r.characters[0].identity.id, name: 'Hawkeye', weaponKey: 'laser-rifle', weaponName: 'Laser Rifle' }] } };
  registry.put({ ...r.campaign, roster: { ...r.campaign.roster, persons: { pending: record } } });
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  assert.deepEqual(session.view().personEncounter.actions.map((action) => [action.command, action.kind]),
    [['persons:jail', 'owed'], ['persons:board', 'danger'], ['persons:clear', 'neutral']]);
  const before = registry.resolveCampaign(campaignId).campaign.time.dayOfYear;
  const served = session.run('persons:jail');
  assert.equal(served.ok, true, served.message);
  const after = registry.resolveCampaign(campaignId);
  assert.equal(after.campaign.time.dayOfYear, before + 3);
  assert.equal(after.campaign.roster.persons.pending, null);
  assert.ok(after.activityLogs[0].entries.some((entry) => /Hawkeye is arrested on Orison .* 3 days in jail/.test(entry.message)));
  // v0.318.2: the laser rifle is confiscated, from hand and from the pack.
  const hawkeye = after.characters.find((entry) => entry.identity.id === r.characters[0].identity.id);
  assert.equal(hawkeye.loadout.weaponKey, 'hands');
  assert.equal(hawkeye.inventory.some((entry) => entry.weaponKey === 'laser-rifle'), false);
  assert.ok(after.activityLogs[0].entries.some((entry) => /Confiscated by the police on Orison: Hawkeye\u2019s Laser Rifle/.test(entry.message)));
});

// ---------------------------------------------------------------- v0.319.0

test('v0.319.0 patrons and rumours are thrown once a week, and a patron\u2019s job is written up and settled by the referee', async () => {
  const { registry, campaignId } = await traderAtAster({ steward: true });
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  assert.equal(session.view().patrons.seek.command, 'patrons:seek');
  assert.equal(session.run('patrons:seek').ok, true);
  const people = personState(registry.resolveCampaign(campaignId).campaign);
  if (!people.patron) {
    assert.match(session.run('patrons:seek').message, /week\u2019s throws are made; 7 more days/);
    assert.equal(session.view().patrons.seek, null);
  }

  // A patron waiting: write the job up.
  const r = registry.resolveCampaign(campaignId);
  const patron = { date: '106-4800', worldName: 'Aster', systemId: 'aster', listKey: 'one', code: 43, type: 'Spy', reaction: { total: 9, description: 'Intrigued.' }, speaker: 'Hawkeye', dms: [] };
  registry.put({ ...r.campaign, roster: { ...r.campaign.roster, persons: { ...(r.campaign.roster.persons ?? {}), patron, rumors: [{ id: 'rumor-1', date: '106-4800', worldName: 'Aster', letter: 'E', type: 'Veiled clue', general: false, source: 'weekly', text: '' }] } } });
  const s2 = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  assert.equal(s2.view().patrons.patron.type, 'Spy');
  assert.equal(s2.view().patrons.rumors.length, 1);
  assert.equal(s2.run('patrons:accept', { fight: { value: { title: 'Recover the ledger', destinationSystemId: 'calder', paymentCr: '20000', deadlineDays: '30', notes: 'Expenses paid' } } }).ok, true);
  const job = registry.resolveCampaign(campaignId).contracts.find((entry) => entry.kind === 'patron');
  assert.deepEqual({ title: job.identity.title, to: job.destination.systemId, pay: job.economics.paymentCr, status: job.status, issuer: job.issuer.name },
    { title: 'Recover the ledger', to: 'calder', pay: 20000, status: 'accepted', issuer: 'Spy' });
  assert.equal(s2.view().jobs.find((entry) => entry.id === job.identity.id).kind, 'patron');
  assert.equal(personState(registry.resolveCampaign(campaignId).campaign).patron, null);

  // The rumour is written to the Journal.
  assert.equal(s2.run('rumors:write', { fight: { value: { id: 'rumor-1', text: 'The ledger was last seen at Calder downport.' } } }).ok, true);
  const journal = refereeView(registry.resolveCampaign(campaignId), { tab: 'Journal' });
  assert.ok(JSON.stringify(journal).includes('The ledger was last seen at Calder downport.'));

  // Settled by the referee, not by arriving.
  const before = registry.resolveCampaign(campaignId).ships[0].state.finances.balanceCr;
  assert.equal(s2.run(`contract:complete:${job.identity.id}`).ok, true);
  const after = registry.resolveCampaign(campaignId);
  assert.equal(after.contracts.find((entry) => entry.identity.id === job.identity.id).status, 'completed');
  assert.equal(after.ships[0].state.finances.balanceCr, before + 20000);
});

test('v0.319.0 a patron\u2019s job is not completed by landing at its world', async () => {
  const { registry, campaignId } = await traderAtAster({ steward: true });
  const r = registry.resolveCampaign(campaignId);
  const patron = { date: '106-4800', worldName: 'Aster', systemId: 'aster', listKey: 'one', code: 43, type: 'Spy', reaction: { total: 9, description: 'Intrigued.' }, speaker: 'Hawkeye', dms: [] };
  registry.put({ ...r.campaign, roster: { ...r.campaign.roster, persons: { patron } } });
  const session = createPlaySession({ registry, campaignId, subsector: FAR_MERIDIAN_SUBSECTOR });
  session.run('patrons:accept', { fight: { value: { title: 'Meet the contact', destinationSystemId: 'calder', paymentCr: '5000', deadlineDays: '30' } } });
  session.run('trip:choose-destination:calder');
  session.run('trip:depart');
  playTo(session, 'calder');
  assert.equal(registry.resolveCampaign(campaignId).contracts.find((entry) => entry.kind === 'patron').status, 'accepted');
});

// ---------------------------------------------------------------- v0.321.0
import { MERIDIAN_REACH_SECTOR } from '../world/meridian-reach-sector.js';
import { sectorState, subsectorsWithinReach, sectorExportText } from '../src/play-session.js';

test('v0.321.0 on the sector, a subsector the ship could reach is charted on opening, seeded, and kept', async () => {
  const { registry, campaignId } = await atOrison({ fuel: 40, berthingPaid: true });
  const session = createPlaySession({ registry, campaignId, sector: MERIDIAN_REACH_SECTOR });
  const map = session.map;
  const orison = map.systems.find((system) => system.id === 'orison');
  assert.equal(orison.subsector, 'F');
  const state = sectorState(registry.resolveCampaign(campaignId).campaign);
  assert.deepEqual(state.visited, ['orison'], 'where the party is counts as visited');
  // Nothing left uncharted within the scout's Jump-2 of Orison.
  assert.deepEqual(subsectorsWithinReach(map, 'orison', 2), []);
  const charted = Object.keys(state.charted);
  for (const letter of charted) assert.ok(map.systems.some((system) => system.subsector === letter));
  // The same campaign charts the same subsector the same way.
  if (charted.length) {
    const again = await atOrison({ fuel: 40, berthingPaid: true });
    createPlaySession({ registry: again.registry, campaignId: again.campaignId, sector: MERIDIAN_REACH_SECTOR });
    const other = sectorState(again.registry.resolveCampaign(again.campaignId).campaign).charted[charted[0]];
    assert.deepEqual(other.systems.map((system) => system.name), state.charted[charted[0]].systems.map((system) => system.name));
  }
});

test('v0.321.0 the referee charts ahead; the map frames the charted subsectors; players see chart facts until they visit', async () => {
  const { registry, campaignId } = await atOrison({ fuel: 40, berthingPaid: true });
  const session = createPlaySession({ registry, campaignId, sector: MERIDIAN_REACH_SECTOR });
  assert.equal(session.run('sector:chart:K').ok, true);
  assert.equal(session.run('sector:chart:K').ok, false, 'once');
  assert.equal(session.run('sector:chart:F').ok, false, 'Far Meridian is authored');
  const view = session.view();
  assert.ok(view.scene.map.borders.some((border) => border.letter === 'K'));
  assert.ok(view.scene.map.frame.columns >= 16 && view.scene.map.frame.rows >= 20, 'the frame spans F to K');
  const stranger = session.map.systems.find((system) => system.subsector === 'K');
  const playerView = session.view({ seat: 'player' }).scene.map.systems.find((system) => system.id === stranger.id);
  assert.equal(playerView.hidden, true);
  assert.match(playerView.mainWorld.uwp, /^[A-EX]\?{6}-\?$/);
  assert.equal(session.view().scene.map.systems.find((system) => system.id === stranger.id).hidden, undefined, 'the referee sees everything');
  const text = sectorExportText(session.map);
  assert.match(text.split('\n')[1], /^Hex\tName\tUWP\tBases\tRemarks\tZone\tPBG\tAllegiance\tStars$/);
  assert.ok(text.includes(`${stranger.hex}\t${stranger.name}\t${stranger.mainWorld.uwp}`));
});

test('v0.321.0 a jump across a subsector edge is an ordinary jump', async () => {
  const { registry, campaignId } = await atOrison({ fuel: 40, berthingPaid: true });
  const session = createPlaySession({ registry, campaignId, sector: MERIDIAN_REACH_SECTOR });
  const map = session.map;
  const outside = getJumpDestinations(map, 'orison', 2).find((entry) => entry.system.subsector !== 'F');
  if (!outside) return; // nothing charted within two parsecs across the edge for this seed
  assert.equal(session.run(`trip:choose-destination:${outside.system.id}`).ok, true);
  const jump = session.view().steps.find((step) => step.id === 'jump');
  assert.ok(jump, 'the departure row reads the far world like any other');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlayProcedure, chargenTablesForPhase, PLAY_PROCEDURE_TAGS } from '../client/ui-model.js';

const base = () => ({
  currentSystem: { name: 'Cinder', starport: 'E', hasGasGiant: true },
  destination: { name: 'Orison', distance: 1, reachable: true },
  encounterActive: false,
  situationActive: null,
  berthing: { due: true, dueCr: 100, paid: true },
  fuel: { currentTons: 40, capacityTons: 40, requiredTons: 20, sufficient: true, canBuy: false, canSkim: true },
  freight: { offers: 3, fitting: 2, accepted: 0 },
  passengers: { demand: { high: 1, middle: 2, low: 0 }, booked: 0, capacity: 3, blockReason: null },
  speculation: { available: true, name: 'RADIOACTIVES', quantity: '3t', purchased: 0, holdFree: 2 },
  patron: { available: true, attemptedThisCall: false },
  jobs: { offers: 1, active: 2 },
  lifeSupportCr: 2000,
  jumpReady: true,
  jumpBlockReason: null
});

const cards = (model) => model.groups.flatMap((group) => group.cards);
const byId = (model, id) => cards(model).find((card) => card.id === id);

test('no mapped location yields a single required card pointing at the map', () => {
  const model = buildPlayProcedure({ currentSystem: null });
  assert.equal(model.groups.length, 1);
  assert.equal(model.groups[0].cards[0].id, 'map-location');
  assert.equal(model.groups[0].cards[0].tag, PLAY_PROCEDURE_TAGS.required);
});

test('Book 2 p.8 ordering: cargo is READY and passengers are BLOCKED until cargo announces the destination', () => {
  const model = buildPlayProcedure(base());
  assert.equal(byId(model, 'freight').tag, PLAY_PROCEDURE_TAGS.ready);
  assert.equal(byId(model, 'passengers').tag, PLAY_PROCEDURE_TAGS.blocked);
  assert.match(byId(model, 'passengers').copy, /Book 2 p\.8/);
  assert.equal(model.groups[0].label, 'NEEDS ATTENTION');
  assert.equal(model.headline, 'Accept cargo for Orison');
});

test('once cargo is accepted passengers open and the jump card is READY with the life-support charge', () => {
  const s = base(); s.freight.accepted = 1;
  const model = buildPlayProcedure(s);
  assert.equal(byId(model, 'passengers').tag, PLAY_PROCEDURE_TAGS.ready);
  assert.equal(byId(model, 'jump').tag, PLAY_PROCEDURE_TAGS.ready);
  assert.match(byId(model, 'jump').copy, /Cr2,000/);
  assert.equal(byId(model, 'freight-done').tag, PLAY_PROCEDURE_TAGS.done);
});

test('with no acceptable cargo the destination counts as announced and passengers open', () => {
  const s = base(); s.freight = { offers: 0, fitting: 0, accepted: 0 };
  assert.equal(byId(buildPlayProcedure(s), 'passengers').tag, PLAY_PROCEDURE_TAGS.ready);
});

test('insufficient fuel is REQUIRED when a source exists and BLOCKED when none does', () => {
  const s = base(); s.fuel.sufficient = false; s.fuel.currentTons = 10;
  assert.equal(byId(buildPlayProcedure(s), 'fuel').tag, PLAY_PROCEDURE_TAGS.required);
  s.fuel.canSkim = false;
  assert.equal(byId(buildPlayProcedure(s), 'fuel').tag, PLAY_PROCEDURE_TAGS.blocked);
});

test('active combat and situations lead the attention group and block departure', () => {
  const s = base(); s.encounterActive = true; s.situationActive = { title: 'Dead Approach Beacon' }; s.jumpReady = false; s.jumpBlockReason = 'Resolve the encounter first.';
  const model = buildPlayProcedure(s);
  assert.equal(model.groups[0].cards[0].id, 'combat');
  assert.equal(model.groups[0].cards[1].title, 'Dead Approach Beacon');
  assert.equal(byId(model, 'jump').tag, PLAY_PROCEDURE_TAGS.blocked);
  assert.equal(byId(model, 'jump').copy, 'Resolve the encounter first.');
});

test('weekly opportunities: speculation once per week, patron search once per port call', () => {
  const s = base(); s.speculation.purchased = 3; s.patron.attemptedThisCall = true;
  const model = buildPlayProcedure(s);
  assert.equal(byId(model, 'spec'), undefined);
  assert.equal(byId(model, 'spec-done').tag, PLAY_PROCEDURE_TAGS.done);
  assert.equal(byId(model, 'patron-done').tag, PLAY_PROCEDURE_TAGS.done);
  const done = model.groups.find((group) => group.label === 'DONE THIS PORT CALL');
  assert.equal(done.collapsed, true);
});

test('unpaid berthing is required before anything else at the port', () => {
  const s = base(); s.berthing.paid = false;
  const model = buildPlayProcedure(s);
  assert.equal(model.groups[0].cards[0].id, 'berthing');
  // v0.97.1: the card pays the fee instead of opening the port panel.
  assert.equal(model.groups[0].cards[0].action, 'berthing:pay');
});

test('chargen context tables follow the phase', () => {
  assert.equal(chargenTablesForPhase('skills-pending'), 'skills');
  assert.equal(chargenTablesForPhase('muster-out-rolls-pending'), 'muster');
  assert.equal(chargenTablesForPhase('aging-required'), 'aging');
  assert.equal(chargenTablesForPhase('survival-required'), 'service');
  assert.equal(chargenTablesForPhase('service-selection'), 'service');
});

test('Book 2 p.46 resale: a lot aboard becomes a READY card naming the money', () => {
  const s = base();
  s.sales = { lots: [{ id: 'lot-1', tons: 12, description: 'Textiles', netCr: 43200, percentage: 140, dm: 3, sellable: true, blockReason: null, declined: false, brokerCommissionCr: 0 }] };
  const card = byId(buildPlayProcedure(s), 'sale-lot-1');
  assert.equal(card.tag, PLAY_PROCEDURE_TAGS.ready);
  assert.equal(card.title, 'Sell 12t Textiles');
  assert.match(card.copy, /Cr43,200/);
  assert.match(card.copy, /140% of base/);
  assert.equal(card.action, 'sale:lot-1');
});

test('with the port call otherwise clear, selling is what the dock leads with', () => {
  const s = base();
  s.sales = { lots: [{ id: 'lot-1', tons: 12, description: 'Textiles', netCr: 43200, percentage: 140, dm: 3, sellable: true, blockReason: null, declined: false, brokerCommissionCr: 0 }] };
  s.freight = { offers: 0, fitting: 0, accepted: 0 };
  s.passengers = null;
  assert.equal(buildPlayProcedure(s).headline, 'Sell 12t Textiles');
});

test('a lot bought at this world is blocked, not offered', () => {
  const s = base();
  s.sales = { lots: [{ id: 'lot-2', tons: 5, description: 'Radioactives', netCr: 0, percentage: 0, dm: 0, sellable: false, blockReason: 'Bought here.', declined: false, brokerCommissionCr: 0 }] };
  const card = byId(buildPlayProcedure(s), 'sale-lot-2');
  assert.equal(card.tag, PLAY_PROCEDURE_TAGS.blocked);
  assert.equal(card.copy, 'Bought here.');
});

test('a declined quote still offers the sale and names the Book 2 p.48 commission', () => {
  const s = base();
  s.sales = { lots: [{ id: 'lot-3', tons: 8, description: 'Crystals', netCr: 12000, percentage: 90, dm: -1, sellable: true, blockReason: null, declined: true, brokerCommissionCr: 600 }] };
  const card = byId(buildPlayProcedure(s), 'sale-lot-3');
  assert.equal(card.tag, PLAY_PROCEDURE_TAGS.ready);
  assert.match(card.copy, /Cr600/);
  assert.match(card.copy, /declined this call/);
});

test('freight and speculative cards carry their numbers', () => {
  const s = base();
  s.freight = { offers: 3, fitting: 2, accepted: 0, bestCr: 18000 };
  s.speculation = { available: true, name: 'RADIOACTIVES', quantity: '3t', purchased: 0, holdFree: 2, pricePerUnitCr: 950000, percentage: 95 };
  assert.match(byId(buildPlayProcedure(s), 'freight').copy, /Cr18,000 on delivery/);
  assert.match(byId(buildPlayProcedure(s), 'spec').copy, /Cr950,000 each \(95% of base\)/);
});

test('v0.97.1 every trade step acts from the dock instead of opening a panel', () => {
  const s = base();
  s.berthing = { due: true, dueCr: 100, paid: false };
  s.fuel = { currentTons: 10, capacityTons: 40, requiredTons: 20, sufficient: false, canBuy: true, canSkim: true, priceCr: 15000 };
  s.freight = { offers: 3, fitting: 2, accepted: 0, bestCr: 18000, lots: [
    { id: 'f1', tons: 12, category: 'Machine parts', revenueCr: 12000 },
    { id: 'f2', tons: 6, category: 'Textiles', revenueCr: 6000 }
  ] };
  s.passengers = { demand: { high: 1, middle: 2, low: 0 }, booked: 0, capacity: 3, blockReason: null, classes: [
    { passageClass: 'high', available: 1, fareCr: 10000, berths: 2 },
    { passageClass: 'middle', available: 2, fareCr: 8000, berths: 2 },
    { passageClass: 'low', available: 0, fareCr: 1000, berths: 4 }
  ] };
  s.speculation = { available: true, name: 'RADIOACTIVES', quantity: '3t', purchased: 0, holdFree: 3, pricePerUnitCr: 950000, percentage: 95, buyQuantity: 3, buyCostCr: 2850000 };
  const model = buildPlayProcedure(s);
  assert.equal(byId(model, 'berthing').action, 'berthing:pay');
  assert.equal(byId(model, 'fuel').action, 'fuel:buy');
  assert.match(byId(model, 'fuel').copy, /Cr15,000/);
  assert.equal(byId(model, 'freight-f1').action, 'freight:f1');
  assert.match(byId(model, 'freight-f1').title, /Accept 12t Machine parts/);
  assert.match(byId(model, 'freight-f2').copy, /Cr6,000 on delivery/);
  assert.equal(byId(model, 'spec').action, 'spec:3');
  assert.match(byId(model, 'spec').copy, /Buying 3t costs Cr2,850,000/);
  // Nothing in the trade cycle sends the player to a panel to find a button.
  const panelHunts = cards(model).filter((card) => card.action === 'trade' || card.action === 'port');
  assert.deepEqual(panelHunts, []);
});

test('a fuel card with no starport pump skims the gas giant instead', () => {
  const s = base();
  s.fuel = { currentTons: 10, capacityTons: 40, requiredTons: 20, sufficient: false, canBuy: false, canSkim: true, priceCr: 0 };
  assert.equal(byId(buildPlayProcedure(s), 'fuel').action, 'fuel:skim');
});

test('v0.97.1 each waiting passage class is its own card, once cargo has announced the destination', () => {
  const s = base();
  s.freight = { offers: 3, fitting: 2, accepted: 1, bestCr: 18000, lots: [] };
  s.passengers = { demand: { high: 1, middle: 2, low: 0 }, booked: 0, capacity: 3, blockReason: null, classes: [
    { passageClass: 'high', available: 1, fareCr: 10000, berths: 2 },
    { passageClass: 'middle', available: 2, fareCr: 8000, berths: 2 },
    { passageClass: 'low', available: 0, fareCr: 1000, berths: 4 }
  ] };
  const model = buildPlayProcedure(s);
  assert.equal(byId(model, 'passengers-high').action, 'passenger:high');
  assert.match(byId(model, 'passengers-middle').copy, /2 waiting at Cr8,000 each/);
  // No low passengers are waiting, so no card offers a berth for them.
  assert.equal(byId(model, 'passengers-low'), undefined);
});

test('a lot the ship cannot afford says so instead of quietly opening a panel', () => {
  const s = base();
  s.speculation = { available: true, name: 'RADIOACTIVES', quantity: '3t', purchased: 0, holdFree: 3,
    pricePerUnitCr: 950000, percentage: 95, buyQuantity: 0, buyCostCr: 0,
    buyBlockReason: 'Cr950,000 a ton is beyond the ship account (Cr12,400).' };
  const card = byId(buildPlayProcedure(s), 'spec');
  assert.equal(card.tag, PLAY_PROCEDURE_TAGS.blocked);
  assert.match(card.copy, /beyond the ship account/);
  assert.equal(card.action, null);
});

test('v0.98.0 an acting card states its verb with the money in it; a blocked card has none', () => {
  const s = base();
  s.berthing = { due: true, dueCr: 100, paid: false };
  s.sales = { lots: [{ id: 'lot-1', tons: 12, description: 'Textiles', netCr: 43200, percentage: 140, dm: 3, sellable: true, blockReason: null, declined: false, brokerCommissionCr: 0 }] };
  s.speculation = { available: true, name: 'RADIOACTIVES', quantity: '3t', purchased: 0, holdFree: 3, pricePerUnitCr: 950000, percentage: 95, buyQuantity: 0, buyCostCr: 0, buyBlockReason: 'Beyond the ship account.' };
  const model = buildPlayProcedure(s);
  assert.equal(byId(model, 'berthing').verb, '[ PAY CR100 ]');
  assert.equal(byId(model, 'sale-lot-1').verb, '[ SELL FOR CR43,200 ]');
  assert.equal(byId(model, 'jump').verb, '[ JUMP ]');
  assert.equal(byId(model, 'spec').verb, null);
  // Every card that can be clicked says what the click does.
  for (const card of cards(model)) {
    if (card.action) assert.ok(card.verb, `${card.id} acts but states no verb`);
    else assert.equal(card.verb, null, `${card.id} has no action but states a verb`);
  }
});

test('v0.99.0 the destination card says it is what gates the trade board', () => {
  const s = base();
  s.destination = null;
  const card = byId(buildPlayProcedure(s), 'destination');
  assert.match(card.copy, /Nothing to trade until this is set/);
  assert.equal(card.verb, '[ MAP ]');
});

test('v0.102.0 accepted jobs are always tracked, with their deadline on the card', () => {
  const s = base();
  s.contracts = [
    { id: 'c1', title: 'Route Verification Survey', destinationName: 'Orison', destinationSystemId: 'orison', paymentCr: 12000, daysRemaining: 9, overdue: false },
    { id: 'c2', title: 'Priority Courier Packet', destinationName: 'Calder', destinationSystemId: 'calder', paymentCr: 8000, daysRemaining: 1, overdue: false },
    { id: 'c3', title: 'Ore Assay Run', destinationName: 'Sable', destinationSystemId: 'sable', paymentCr: 4000, daysRemaining: -3, overdue: true }
  ];
  const model = buildPlayProcedure(s);
  const group = model.groups.find((entry) => entry.label.startsWith('ACCEPTED JOBS'));
  assert.equal(group.label, 'ACCEPTED JOBS 3');
  // The tracker leads the dock: what is owed is read before what is offered.
  assert.equal(model.groups[0], group);
  assert.match(byId(model, 'contract-c1').copy, /Deliver to Orison · Cr12,000 · 9d left/);
  assert.equal(byId(model, 'contract-c1').tag, 'ACCEPTED');
  // A deadline inside two days, or missed, is not a quiet line in a list.
  assert.equal(byId(model, 'contract-c2').tag, PLAY_PROCEDURE_TAGS.required);
  assert.match(byId(model, 'contract-c3').copy, /OVERDUE/);
  assert.equal(byId(model, 'contract-c3').tag, PLAY_PROCEDURE_TAGS.required);
  // Clicking one points at the system it concerns.
  assert.equal(byId(model, 'contract-c1').action, 'contract:c1');
  assert.equal(byId(model, 'contract-c1').verb, '[ SHOW ]');
});

test('v0.102.0 with nothing accepted the tracker takes no room at all', () => {
  const s = base();
  s.contracts = [];
  assert.equal(buildPlayProcedure(s).groups.some((g) => g.label.startsWith('ACCEPTED JOBS')), false);
});

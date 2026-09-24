import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  createSequenceDice,
  generatePassengerDemand,
  generateFreightOffers,
  generateSpeculativeTradeOffer,
  calculateSpeculativePurchaseCost,
  quoteSpeculativeResale,
  createTypeSScoutReserveShipForCharacter,
  importCharacterDocument,
  importShipDocument,
  performMaintenance,
  shipMaintenanceStatus,
  transferCharacterCreditsToShip,
  bookPassenger,
  availablePassengerCapacity,
  calculateLifeSupportCostForTrip,
  chargeLifeSupportForTrip,
  loadCargo,
  deliverFreightAtDestination,
  purchaseSpeculativeCargo,
  sellSpeculativeCargo,
  CURRENT_SHIP_DOCUMENT_SCHEMA_VERSION,
  TRADE_GOODS,
  crewMemberSalaryCr,
  calculateMonthlyCrewSalaries,
  annualMaintenanceCr,
  MAINTENANCE_STARPORTS,
  MAINTENANCE_WEEKS,
  shipMortgage,
  shipCashPriceCr,
  transferShipCreditsToCharacter,
  speculativeLotPosition,
  shipUpkeepDue,
  chargeShipUpkeep,
  assignShipCrew,
  summariseShipVoyages,
  shipDistributableCr,
  payCurrentBerthing,
  beginPortCall,
  disembarkPassengersAtDestination
} from '../index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
async function hawkeye() {
  return importCharacterDocument(await readFile(path.join(here, 'fixtures/Hawkeye-v0.6.character.json'), 'utf8'));
}
async function ship() { return createTypeSScoutReserveShipForCharacter(await hawkeye()).ship; }
const neutralProfile = Object.freeze({ population: 7, techLevel: 9, atmosphere: 10, hydrographics: 5, government: 0 });

test('Book 2 p.7 passengers: origin population throws the dice, destination population modifies', () => {
  // Origin population 6 throws 3D-2D high. Destination population 10 gives
  // high +1, middle +1, low +2.
  const origin = { population: 6, techLevel: 8 };
  const destination = { population: 10, techLevel: 8 };
  const demand = generatePassengerDemand(origin, destination, {
    dice: createSequenceDice([5, 4, 3, 2, 1, 5, 4, 3, 2, 1, 6, 6, 6])
  });
  assert.deepEqual(demand.dm, { high: 1, middle: 1, low: 2 });
  assert.ok(demand.high >= 0 && demand.middle >= 0 && demand.low >= 0);
});

test('Book 2 p.7: populations 0 and 1 carry nobody, whatever the destination offers', () => {
  const sixes = { rollD6: () => 6, roll2D6: () => ({ dice: [6, 6], total: 12 }) };
  for (const population of [0, 1]) {
    const demand = generatePassengerDemand({ population, techLevel: 8 }, { population: 11, techLevel: 8 }, { dice: sixes });
    assert.deepEqual({ high: demand.high, middle: demand.middle, low: demand.low }, { high: 0, middle: 0, low: 0 });
  }
});

test('Book 2 p.7: a destination DM cannot drive demand below zero', () => {
  // Destination population 2 is high -1, middle -2, low -4.
  const ones = { rollD6: () => 1, roll2D6: () => ({ dice: [1, 1], total: 2 }) };
  const demand = generatePassengerDemand({ population: 7, techLevel: 8 }, { population: 2, techLevel: 8 }, { dice: ones });
  assert.ok(demand.high >= 0 && demand.middle >= 0 && demand.low >= 0);
});

test('Book 2 p.7 cargo: one die per point of destination population, each a shipment of 5-ton multiples', () => {
  // "roll a number of dice equal to the population number of the destination.
  // Each die represents one shipment, expressed in multiples of 5 tons."
  const origin = { population: 1, techLevel: 8 };
  const destination = { population: 5, techLevel: 8 };
  const result = generateFreightOffers(origin, destination, {
    dice: createSequenceDice([6, 5, 1, 2, 3]), idPrefix: 'route'
  });
  assert.equal(result.shipments, 5);
  assert.deepEqual(result.offers.map((entry) => entry.tons), [30, 25, 5, 10, 15]);
  assert.deepEqual(result.offers.map((entry) => entry.revenueCr), [30000, 25000, 5000, 10000, 15000]);
  // The origin world has no bearing on cargo at all in the 1977 rules.
  const swapped = generateFreightOffers({ population: 12, techLevel: 3 }, destination, {
    dice: createSequenceDice([6, 5, 1, 2, 3]), idPrefix: 'route'
  });
  assert.deepEqual(swapped.offers.map((entry) => entry.tons), [30, 25, 5, 10, 15]);
});

test('Book 2 p.7: a shipment may not be broken down, so hold size decides what fits', () => {
  const result = generateFreightOffers({ population: 8, techLevel: 8 }, { population: 3, techLevel: 8 }, {
    dice: createSequenceDice([6, 1, 4]), idPrefix: 'hold'
  });
  assert.deepEqual(result.offers.map((entry) => entry.tons), [30, 5, 20]);
  // A three-ton hold can take none of them; a five-ton hold takes exactly one.
  assert.equal(result.offers.filter((entry) => entry.tons <= 3).length, 0);
  assert.equal(result.offers.filter((entry) => entry.tons <= 5).length, 1);
});

test('Book 2 speculative market finds one weekly lot and prices it from Actual Value', () => {
  const offer = generateSpeculativeTradeOffer(neutralProfile, {
    dice: createSequenceDice([1, 5, 3, 3, 4])
  });
  assert.equal(offer.code, 15);
  assert.equal(offer.name, 'Crystals');
  assert.equal(offer.quantityAvailable, 3);
  assert.equal(offer.purchaseDM, 0);
  assert.equal(offer.percentage, 100);
  assert.equal(offer.pricePerUnitCr, 20000);
  assert.deepEqual(calculateSpeculativePurchaseCost(offer, 1), {
    subtotalCr: 20000, handlingFeeCr: 200, totalCr: 20200, partialPurchase: true
  });
});

test('Type S has three passenger staterooms after its one-person standard crew', async () => {
  let vessel = await ship();
  assert.equal(availablePassengerCapacity(vessel, 'middle'), 3);
  vessel = bookPassenger(vessel, { id: 'p1', passageClass: 'middle', originSystemId: 'calder', destinationSystemId: 'aster' });
  vessel = bookPassenger(vessel, { id: 'p2', passageClass: 'middle', originSystemId: 'calder', destinationSystemId: 'aster' });
  vessel = bookPassenger(vessel, { id: 'p3', passageClass: 'middle', originSystemId: 'calder', destinationSystemId: 'aster' });
  assert.equal(availablePassengerCapacity(vessel, 'middle'), 0);
  assert.throws(() => bookPassenger(vessel, { id: 'p4', passageClass: 'middle', originSystemId: 'calder', destinationSystemId: 'aster' }), /no middle passenger capacity/);
  const fresh = await ship();
  assert.throws(() => bookPassenger(fresh, { id: 'h1', passageClass: 'high', originSystemId: 'calder', destinationSystemId: 'aster' }), /requires a steward/);
});

test('Book 2 p.6: life support is charged per stateroom built, occupied or not', async () => {
  const character = await hawkeye();
  let vessel = createTypeSScoutReserveShipForCharacter(character).ship;
  vessel = transferCharacterCreditsToShip(character, vessel, 20000, { dateLabel: '001-4800' }).ship;
  vessel = bookPassenger(vessel, { id: 'p1', passageClass: 'middle', originSystemId: 'calder', destinationSystemId: 'aster' });
  vessel = bookPassenger(vessel, { id: 'p2', passageClass: 'middle', originSystemId: 'calder', destinationSystemId: 'aster' });
  // The Type S has four staterooms and no low berths. Three are occupied —
  // one crew, two passengers — but the empty fourth is charged too.
  assert.deepEqual(calculateLifeSupportCostForTrip(vessel), {
    staterooms: 4, lowBerths: 0, occupiedStaterooms: 3, lowPassengers: 0,
    stateroomCostCr: 8000, lowBerthCostCr: 0, totalCr: 8000
  });
  const charged = chargeLifeSupportForTrip(vessel, { dateLabel: '001-4800' });
  assert.equal(charged.ship.state.finances.balanceCr, 12000);
});

test('Book 2 pp.6-7: crew salaries, maintenance and the mortgage', async () => {
  const character = await hawkeye();
  const vessel = createTypeSScoutReserveShipForCharacter(character).ship;

  // The printed schedule, and +10% per level of expertise above 1.
  assert.equal(crewMemberSalaryCr('pilot'), 6000);
  assert.equal(crewMemberSalaryCr('gunner'), 1000);
  assert.equal(crewMemberSalaryCr('pilot', 3), 7200);
  assert.throws(() => crewMemberSalaryCr('sommelier'), /no Book 2 salary/);

  // The reserve scout comes with its owner already flying it.
  const payroll = calculateMonthlyCrewSalaries(vessel, { skillLevels: { [character.identity.id]: 2 } });
  assert.equal(payroll.entries.length, 1);
  assert.equal(payroll.totalCr, 6600);
  // Book 2 p.6 allows an owner-aboard to draw from profits instead of pay.
  assert.equal(calculateMonthlyCrewSalaries(vessel, { unpaid: [character.identity.id] }).totalCr, 0);

  // 0.1% of the cash price annually.
  assert.equal(annualMaintenanceCr(vessel), Math.round(shipCashPriceCr(vessel) * 0.001));
  assert.deepEqual(MAINTENANCE_STARPORTS, ['A', 'B']);
  assert.equal(MAINTENANCE_WEEKS, 2);

  // 20% down, 1/240th monthly for 480 months: 220% of cash price financed.
  const mortgage = shipMortgage(vessel);
  assert.equal(mortgage.downPaymentCr, Math.round(mortgage.cashPriceCr * 0.2));
  assert.equal(mortgage.monthlyPaymentCr, Math.round(mortgage.cashPriceCr / 240));
  assert.equal(mortgage.termMonths, 480);
  assert.ok(Math.abs(mortgage.financedTotalCr / mortgage.cashPriceCr - 2) < 0.01);
});

test('freight pays Cr1000 per ton when delivered to its destination', async () => {
  let vessel = await ship();
  vessel = loadCargo(vessel, {
    id: 'freight-1', category: 'freight', description: 'Calder freight', tons: 2,
    originSystemId: 'aster', destinationSystemId: 'calder', acquisitionCostCr: 0, notes: ''
  });
  const delivered = deliverFreightAtDestination(vessel, 'calder', { dateLabel: '008-4800' });
  assert.equal(delivered.revenueCr, 2000);
  assert.equal(delivered.ship.state.cargoUsedTons, 0);
  assert.equal(delivered.ship.state.finances.balanceCr, 2000);
});

test('speculative cargo purchase uses the hold and sale returns a quoted market value', async () => {
  const character = await hawkeye();
  let vessel = createTypeSScoutReserveShipForCharacter(character).ship;
  vessel = transferCharacterCreditsToShip(character, vessel, 50000, { dateLabel: '001-4800' }).ship;
  const offer = generateSpeculativeTradeOffer(neutralProfile, { dice: createSequenceDice([1, 5, 3, 3, 4]) });
  const purchased = purchaseSpeculativeCargo(vessel, offer, 1, { originSystemId: 'calder', dateLabel: '001-4800' });
  vessel = purchased.ship;
  assert.equal(vessel.state.cargoUsedTons, 1);
  assert.equal(vessel.state.finances.balanceCr, 29800);
  const quote = quoteSpeculativeResale(15, 1, neutralProfile, { dice: createSequenceDice([3, 4]) });
  const sold = sellSpeculativeCargo(vessel, purchased.cargoId, quote, { dateLabel: '008-4800', destinationSystemId: 'aster' });
  assert.equal(sold.revenueCr, 20000);
  assert.equal(sold.profitCr, -200);
  assert.equal(sold.ship.state.cargoUsedTons, 0);
  assert.equal(sold.ship.state.finances.balanceCr, 49800);
});


test('speculative cargo cannot be resold on the world where it was purchased', async () => {
  const character = await hawkeye();
  let vessel = createTypeSScoutReserveShipForCharacter(character).ship;
  vessel = transferCharacterCreditsToShip(character, vessel, 50000, { dateLabel: '001-4800' }).ship;
  const offer = generateSpeculativeTradeOffer(neutralProfile, { dice: createSequenceDice([1, 5, 3, 3, 4]) });
  const purchased = purchaseSpeculativeCargo(vessel, offer, 1, { originSystemId: 'calder', dateLabel: '001-4800' });
  const quote = quoteSpeculativeResale(15, 1, neutralProfile, { dice: createSequenceDice([3, 4]) });
  assert.throws(
    () => sellSpeculativeCargo(purchased.ship, purchased.cargoId, quote, { dateLabel: '001-4800', destinationSystemId: 'calder' }),
    /transported to another world/
  );
});

test('ship schema v2 migrates to v3 with an empty passenger manifest', async () => {
  const current = await ship();
  const legacy = structuredClone(current);
  legacy.schemaVersion = 2;
  delete legacy.state.passengerManifest;
  const migrated = importShipDocument(legacy);
  assert.equal(migrated.schemaVersion, CURRENT_SHIP_DOCUMENT_SCHEMA_VERSION);
  assert.deepEqual(migrated.state.passengerManifest, []);
});


test('Book 2 travel-zone restrictions suppress red-zone freight and non-high passengers', () => {
  const origin = { population: 9, techLevel: 10 };
  const destination = { population: 9, techLevel: 10 };
  const dice = { rollD6: () => 6, roll2D6: () => ({ dice: [6, 6], total: 12 }) };
  const passengers = generatePassengerDemand(origin, destination, { destinationTravelZone: 'red', dice });
  assert.equal(passengers.middle, 0);
  assert.equal(passengers.low, 0);
  const freight = generateFreightOffers(origin, destination, { destinationTravelZone: 'red', dice, idPrefix: 'red' });
  assert.deepEqual(freight.offers, []);
});

test('travel zones are a Graycloak overlay, not a 1977 rule: red suppresses traffic', () => {
  const dice = { rollD6: () => 6, roll2D6: () => ({ dice: [6, 6], total: 12 }) };
  const profile = { population: 9, techLevel: 10 };
  const freight = generateFreightOffers(profile, profile, { destinationTravelZone: 'red', dice, idPrefix: 'red' });
  assert.equal(freight.shipments, 0);
  assert.deepEqual(freight.offers, []);
  const demand = generatePassengerDemand(profile, profile, { destinationTravelZone: 'red', dice });
  assert.deepEqual({ high: demand.high, middle: demand.middle, low: demand.low }, { high: 0, middle: 0, low: 0 });
});


test('the vehicle prices follow the 1977 printing, not the facsimile scan', () => {
  // These three were pinned at a tenth and a hundredth of their value as
  // "facsimile errata". The 1977 printing gives 6,000,000 / 3,000,000 /
  // 7,000,000, and Book 3 p.16 states the same figures for the vehicles
  // themselves, so the facsimile values were dropped zeros in a scan rather
  // than a real printing difference — the same failure as the 2.5m/25m range
  // band. The 1977 books are the authority.
  assert.equal(TRADE_GOODS[52].basePriceCr, 6000000);
  assert.equal(TRADE_GOODS[54].basePriceCr, 3000000);
  assert.equal(TRADE_GOODS[55].basePriceCr, 7000000);
  assert.deepEqual(TRADE_GOODS[31].quantity, { dice: 6, multiplier: 5 });
});

test('Book 2 p.43 base prices match the printed table, including the vehicles', async () => {
  // These four were wrong in the engine until rules 0.28.0: Air/Raft by a
  // factor of ten, ATV and AFV by a hundred, Mechanical Parts outright.
  // Book 3 p.16 states the same figures for the vehicles themselves.
  assert.equal(TRADE_GOODS[52].basePriceCr, 6000000, 'Air/Raft');
  assert.equal(TRADE_GOODS[54].basePriceCr, 3000000, 'ATV');
  assert.equal(TRADE_GOODS[55].basePriceCr, 7000000, 'AFV');
  assert.equal(TRADE_GOODS[62].basePriceCr, 75000, 'Mechanical Parts');
  // Spot checks across the rest of the table.
  assert.equal(TRADE_GOODS[11].basePriceCr, 3000, 'Textiles');
  assert.equal(TRADE_GOODS[16].basePriceCr, 1000000, 'Radioactives');
  assert.equal(TRADE_GOODS[53].basePriceCr, 10000000, 'Computers');
  assert.equal(TRADE_GOODS[65].basePriceCr, 750000, 'Machine Tools');
});

test('credits move both ways between a character and the ship account', async () => {
  const character = await hawkeye();
  let vessel = createTypeSScoutReserveShipForCharacter(character).ship;
  const funded = transferCharacterCreditsToShip(character, vessel, 5000, { dateLabel: '001-4800' });
  vessel = funded.ship;
  assert.equal(vessel.state.finances.balanceCr, 5000);

  // Book 2 p.6's owner-aboard draws from the profits: the money has to be able
  // to come back out, which it could not before.
  const drawn = transferShipCreditsToCharacter(vessel, funded.character, 2000, { dateLabel: '002-4800' });
  assert.equal(drawn.ship.state.finances.balanceCr, 3000);
  assert.equal(drawn.character.finances.credits, funded.character.finances.credits + 2000);
  assert.throws(() => transferShipCreditsToCharacter(drawn.ship, drawn.character, 99999), /insufficient credits/);
});

test('a speculative lot states its position against what was paid for it', async () => {
  const character = await hawkeye();
  let vessel = createTypeSScoutReserveShipForCharacter(character).ship;
  vessel = loadCargo(vessel, {
    id: 'lot-1', category: 'speculative:42', description: 'Firearms', tons: 3,
    originSystemId: 'aster', destinationSystemId: null, acquisitionCostCr: 99990, notes: ''
  });
  // Cost basis alone, before any quote exists.
  assert.deepEqual(speculativeLotPosition(vessel, 'lot-1'),
    { cargoId: 'lot-1', costCr: 99990, proceedsCr: null, gainCr: null, returnPercent: null });
  // Against a quote: the gain, and the return on capital actually committed.
  const position = speculativeLotPosition(vessel, 'lot-1', { proceedsCr: 117000 });
  assert.equal(position.gainCr, 17010);
  assert.equal(position.returnPercent, 17);
  // A losing quote is stated as a loss, not hidden.
  assert.equal(speculativeLotPosition(vessel, 'lot-1', { proceedsCr: 80000 }).gainCr, -19990);
  assert.throws(() => speculativeLotPosition(vessel, 'missing'), /no cargo aboard/);
});

test('Book 2 pp.6-7: upkeep accrues in whole periods and is charged against the clock', async () => {
  const character = await hawkeye();
  let vessel = createTypeSScoutReserveShipForCharacter(character).ship;
  vessel = assignShipCrew(vessel, { role: 'steward', characterId: 'npc-venn', characterName: 'Mara Venn' });
  vessel = transferCharacterCreditsToShip(character, vessel, 60000, { dateLabel: '001-4800' }).ship;

  // Hawkeye owns her and draws from profits, so only the steward is on wages.
  const due = shipUpkeepDue(vessel, { dateLabel: '101-4800', sinceLabel: '001-4800', unpaid: [character.identity.id] });
  assert.equal(due.salaryPerPeriodCr, 3000);
  assert.equal(due.salaryPeriods, 3, '100 days is three whole 30-day periods');
  // v0.67.0: maintenance is reported, not owed — it falls due a year on.
  assert.equal(due.maintenance.dueDate, '001-4801');
  assert.equal(due.maintenance.overdue, false, 'not yet a full year');
  assert.equal(due.totalDueCr, 9000);

  const charged = chargeShipUpkeep(vessel, { dateLabel: '101-4800', sinceLabel: '001-4800', unpaid: [character.identity.id] });
  assert.equal(charged.paidCr, 9000);
  assert.equal(charged.outstandingCr, 0);
  assert.equal(charged.ship.state.finances.balanceCr, 51000);

  // Charging again the same day finds nothing further due: the ledger dates
  // the last period.
  assert.equal(chargeShipUpkeep(charged.ship, { dateLabel: '101-4800', unpaid: [character.identity.id] }).paidCr, 0);
});

test('a year served brings the overhaul due; it is performed at a class A or B port, not charged by upkeep', async () => {
  const character = await hawkeye();
  let vessel = createTypeSScoutReserveShipForCharacter(character).ship;
  vessel = transferCharacterCreditsToShip(character, vessel, 20000, { dateLabel: '001-4800' }).ship;

  // v0.67.0: Book 2 p.6 makes the overhaul two weeks at a class A or B
  // starport, and p.4 hangs drive failure and misjump on skipping it — so it
  // is an act the ship performs, not money the account quietly loses.
  const due = shipUpkeepDue(vessel, { dateLabel: '002-4801', sinceLabel: '001-4800', unpaid: [character.identity.id] });
  assert.equal(due.maintenance.overdue, true);
  assert.equal(due.maintenance.daysOverdue, 1);
  assert.equal(due.maintenance.costCr, 32490, '0.1% of the Book 2 p.18 price');
  assert.equal(due.totalDueCr, 0, 'nothing is owed to anyone until the overhaul is done');

  const charged = chargeShipUpkeep(vessel, { dateLabel: '002-4801', sinceLabel: '001-4800', unpaid: [character.identity.id] });
  assert.equal(charged.paidCr, 0);
  assert.equal(charged.ship.state.finances.ledger.some((entry) => entry.kind === 'maintenance'), false);
  assert.equal(charged.maintenance.overdue, true);

  // Cr20,000 will not cover a Cr32,490 overhaul, and a class C port cannot do
  // one at all. The ship still flies while it is overdue.
  assert.throws(() => performMaintenance(vessel, { dateLabel: '002-4801', starport: 'C' }), /class A or B/);
  assert.throws(() => performMaintenance(vessel, { dateLabel: '002-4801', starport: 'B' }), /requires Cr32,490/);

  // Funded, at a class B port, the overhaul is done: fee, two weeks, and a
  // new due date a year from the day it was started.
  const funded = transferCharacterCreditsToShip(character, vessel, 30000, { dateLabel: '002-4801' }).ship;
  const done = performMaintenance(funded, { dateLabel: '002-4801', starport: 'B' });
  assert.equal(done.costCr, 32490);
  assert.equal(done.daysTaken, 14);
  assert.equal(done.completedOn, '016-4801');
  assert.equal(done.ship.state.finances.balanceCr, 17510);
  assert.equal(done.ship.state.maintenance.lastOverhaulDate, '002-4801');
  assert.equal(shipMaintenanceStatus(done.ship, { dateLabel: '016-4801' }).dueDate, '002-4802');

  // A Scout ship on reserve assignment is overhauled free at a scout base.
  const free = performMaintenance(funded, { dateLabel: '002-4801', starport: 'B', scoutBase: true });
  assert.equal(free.costCr, 0);
  assert.equal(free.ship.state.finances.balanceCr, 50000);
});

test('the ledger splits into voyages at each departure, and states what each leg made', async () => {
  const character = await hawkeye();
  let vessel = createTypeSScoutReserveShipForCharacter(character).ship;
  vessel = transferCharacterCreditsToShip(character, vessel, 20000, { dateLabel: "001-4800" }).ship;

  // A leg: life support at departure, then a sale and berthing at the far end.
  vessel = chargeLifeSupportForTrip(vessel, { dateLabel: '008-4800' }).ship;
  vessel = loadCargo(vessel, {
    id: 'lot-1', category: 'speculative:42', description: 'Firearms', tons: 3,
    originSystemId: 'aster', destinationSystemId: null, acquisitionCostCr: 0, notes: ''
  });
  vessel = beginPortCall(vessel, { systemId: 'orison', arrivalDate: '015-4800', berthingDueCr: 100 });
  vessel = payCurrentBerthing(vessel, { dateLabel: '015-4800' }).ship;

  const voyages = summariseShipVoyages(vessel);
  // The funding transfer opens a first voyage; the life-support charge starts
  // the second.
  assert.equal(voyages.length, 2);
  assert.equal(voyages[0].incomeCr, 20000, 'the transfer in');
  assert.equal(voyages[1].startDate, '008-4800');
  assert.equal(voyages[1].open, true, 'the ship has not departed again');
  assert.equal(voyages[1].expenseCr > 0, true, 'life support and berthing went out');
  assert.equal(voyages[1].netCr, voyages[1].incomeCr - voyages[1].expenseCr);
  assert.equal(voyages[1].closingBalanceCr, vessel.state.finances.balanceCr);
});

test('a losing leg affords no withdrawal, and upkeep owed comes off what can be drawn', async () => {
  const character = await hawkeye();
  let vessel = createTypeSScoutReserveShipForCharacter(character).ship;
  vessel = transferCharacterCreditsToShip(character, vessel, 20000, { dateLabel: "001-4800" }).ship;

  // Departure charges life support: Book 2 p.6, per stateroom built, so a Type
  // S pays Cr8,000 a trip whether anyone is aboard or not.
  vessel = chargeLifeSupportForTrip(vessel, { dateLabel: '008-4800' }).ship;
  assert.equal(shipDistributableCr(vessel), 0, 'a leg in deficit distributes nothing');

  // Three tons of freight pays Cr3,000 — less than the life support that got
  // it there. A scout cannot trade its way out on carrying capacity alone.
  vessel = loadCargo(vessel, {
    id: 'freight-1', category: 'freight', description: 'Orison freight', tons: 3,
    originSystemId: 'aster', destinationSystemId: 'orison', acquisitionCostCr: 0, notes: ''
  });
  vessel = deliverFreightAtDestination(vessel, 'orison', { dateLabel: '015-4800' }).ship;
  assert.equal(shipDistributableCr(vessel), 0, 'Cr3,000 in against Cr8,000 out is still a loss');

  // Passages are what actually pay for a hull this size: two middle berths at
  // Cr8,000 clear the trip's life support on their own.
  vessel = bookPassenger(vessel, { id: 'p1', passageClass: 'middle', originSystemId: 'aster', destinationSystemId: 'orison' });
  vessel = bookPassenger(vessel, { id: 'p2', passageClass: 'middle', originSystemId: 'aster', destinationSystemId: 'orison' });
  vessel = disembarkPassengersAtDestination(vessel, 'orison', { dateLabel: '016-4800' }).ship;
  const spare = shipDistributableCr(vessel);
  assert.ok(spare > 0, 'a leg in profit distributes its net');
  // Wages owed are not available to withdraw.
  assert.equal(shipDistributableCr(vessel, { outstandingUpkeepCr: spare + 1 }), 0);
});

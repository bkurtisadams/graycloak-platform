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
  TRADE_GOODS
} from '../index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
async function hawkeye() {
  return importCharacterDocument(await readFile(path.join(here, 'fixtures/Hawkeye-v0.6.character.json'), 'utf8'));
}
async function ship() { return createTypeSScoutReserveShipForCharacter(await hawkeye()).ship; }
const neutralProfile = Object.freeze({ population: 7, techLevel: 9, atmosphere: 10, hydrographics: 5, government: 0 });

test('Book 2 passenger table resolves demand from origin population and destination DMs', () => {
  const origin = { population: 1, techLevel: 8 };
  const destination = { population: 5, techLevel: 8 };
  const demand = generatePassengerDemand(origin, destination, { dice: createSequenceDice([5, 4, 3]) });
  assert.equal(demand.high, 0);
  assert.equal(demand.middle, 3);
  assert.equal(demand.low, 1);
  assert.equal(demand.dm, 0);
});

test('Book 2 freight table generates distinct indivisible cargo shipments', () => {
  const origin = { population: 1, techLevel: 8 };
  const destination = { population: 5, techLevel: 8 };
  const result = generateFreightOffers(origin, destination, {
    dice: createSequenceDice([6, 5, 1, 2, 3]), idPrefix: 'route'
  });
  assert.deepEqual(result.counts, { major: 2, minor: 1, incidental: 0 });
  assert.deepEqual(result.offers.map((entry) => entry.tons), [10, 20, 15]);
  assert.deepEqual(result.offers.map((entry) => entry.revenueCr), [10000, 20000, 15000]);
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

test('life support charges Cr2000 per occupied stateroom per trip', async () => {
  const character = await hawkeye();
  let vessel = createTypeSScoutReserveShipForCharacter(character).ship;
  vessel = transferCharacterCreditsToShip(character, vessel, 10000, { dateLabel: '001-4800' }).ship;
  vessel = bookPassenger(vessel, { id: 'p1', passageClass: 'middle', originSystemId: 'calder', destinationSystemId: 'aster' });
  vessel = bookPassenger(vessel, { id: 'p2', passageClass: 'middle', originSystemId: 'calder', destinationSystemId: 'aster' });
  assert.deepEqual(calculateLifeSupportCostForTrip(vessel), {
    occupiedStaterooms: 3, lowPassengers: 0, stateroomCostCr: 6000, lowBerthCostCr: 0, totalCr: 6000
  });
  const charged = chargeLifeSupportForTrip(vessel, { dateLabel: '001-4800' });
  assert.equal(charged.ship.state.finances.balanceCr, 4000);
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


test('Book 2 dash entries remain unavailable even when destination DMs are positive', () => {
  const origin = { population: 1, techLevel: 10 };
  const destination = { population: 9, techLevel: 8 };
  const passengers = generatePassengerDemand(origin, destination, {
    dice: { rollD6: () => 6, roll2D6: () => ({ dice: [6, 6], total: 12 }) }
  });
  assert.equal(passengers.high, 0);

  const freight = generateFreightOffers(origin, destination, {
    dice: { rollD6: () => 6, roll2D6: () => ({ dice: [6, 6], total: 12 }) }, idPrefix: 'dash-test'
  });
  assert.equal(freight.counts.incidental, 0);
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

test('Book 2 amber-zone freight contains no major shipments', () => {
  const origin = { population: 9, techLevel: 10 };
  const destination = { population: 9, techLevel: 10 };
  const dice = { rollD6: () => 6, roll2D6: () => ({ dice: [6, 6], total: 12 }) };
  const freight = generateFreightOffers(origin, destination, { destinationTravelZone: 'amber', dice, idPrefix: 'amber' });
  assert.equal(freight.counts.major, 0);
  assert.equal(freight.offers.some((entry) => entry.category === 'major'), false);
});


test('facsimile trade-table errata are present in the source-backed goods table', () => {
  assert.equal(TRADE_GOODS[52].basePriceCr, 600000);
  assert.equal(TRADE_GOODS[54].basePriceCr, 30000);
  assert.equal(TRADE_GOODS[55].basePriceCr, 70000);
  assert.deepEqual(TRADE_GOODS[31].quantity, { dice: 6, multiplier: 5 });
});

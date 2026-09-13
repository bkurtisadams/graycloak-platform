import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  importCharacterDocument,
  importShipDocument,
  transferCharacterCreditsToShip,
  parseUniversalWorldProfile,
  generatePassengerDemand,
  generateFreightOffers,
  generateSpeculativeTradeOffer,
  availablePassengerCapacity,
  bookPassenger,
  calculateLifeSupportCostForTrip,
  loadCargo,
  purchaseSpeculativeCargo,
  deliverFreightAtDestination,
  disembarkPassengersAtDestination
} from '../vendor/classic-traveller-rules/index.js';
import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js';
import { seededDice, routeMarketSeed, weeklyTradeSeed } from '../client/commerce-market.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const examples = path.resolve(here, '../examples');

function system(id) {
  return FAR_MERIDIAN_SUBSECTOR.systems.find((entry) => entry.id === id);
}

async function fixtures() {
  const character = importCharacterDocument(await readFile(path.join(examples, 'Hawkeye.character.json'), 'utf8'));
  const ship = importShipDocument(await readFile(path.join(examples, 'Hawkeye.ship.json'), 'utf8'));
  return { character, ship };
}

const campaign = {
  identity: { id: 'campaign-commerce-flow' },
  time: { year: 4800, dayOfYear: 1, secondsOfDay: 0 }
};

test('Calder commerce fixture exposes route passengers and a deterministic weekly speculative lot', async () => {
  let { character, ship } = await fixtures();
  ({ character, ship } = transferCharacterCreditsToShip(character, ship, 30000, { dateLabel: '001-4800' }));

  const calder = system('calder');
  const aster = system('aster');
  const origin = parseUniversalWorldProfile(calder.mainWorld.uwp);
  const destination = parseUniversalWorldProfile(aster.mainWorld.uwp);
  const passengerDemand = generatePassengerDemand(origin, destination, {
    destinationTravelZone: aster.travelZone,
    dice: seededDice(routeMarketSeed(campaign, calder.id, aster.id, 'passengers'))
  });
  assert.ok(passengerDemand.middle > 0);
  assert.equal(availablePassengerCapacity(ship, 'middle'), 3);
  ship = bookPassenger(ship, {
    id: 'pass-calder-aster-1', passageClass: 'middle',
    originSystemId: calder.id, destinationSystemId: aster.id
  });
  // Book 2 p.6 charges per stateroom built, occupied or not: the Type S has
  // four, so a trip costs Cr8,000 whether one berth is filled or three.
  assert.equal(calculateLifeSupportCostForTrip(ship).totalCr, 8000);

  const offer = generateSpeculativeTradeOffer(origin, {
    dice: seededDice(weeklyTradeSeed(campaign, calder.id))
  });
  assert.equal(offer.name, 'Spices');
  assert.equal(offer.pricePerUnitCr, 2400);
  ship = purchaseSpeculativeCargo(ship, offer, 1, { originSystemId: calder.id, dateLabel: '001-4800' }).ship;
  assert.equal(ship.state.cargoUsedTons, 1);

  const arrived = disembarkPassengersAtDestination(ship, aster.id, { dateLabel: '008-4800' });
  assert.equal(arrived.passengers.length, 1);
  assert.equal(arrived.revenueCr, 8000);
});

test('Book 2 p.7: the smallest shipment is five tons, so a Type S can carry no freight at all', async () => {
  const { ship } = await fixtures();
  const calder = system('calder');
  const orison = system('orison');
  const freight = generateFreightOffers(
    parseUniversalWorldProfile(calder.mainWorld.uwp),
    parseUniversalWorldProfile(orison.mainWorld.uwp),
    {
      destinationTravelZone: orison.travelZone,
      dice: seededDice(routeMarketSeed(campaign, calder.id, orison.id, 'freight')),
      idPrefix: 'commerce-flow'
    }
  );
  // One die per point of the destination's population, each die a shipment of
  // that many multiples of five tons, and a shipment may not be broken down.
  assert.ok(freight.offers.length > 0);
  for (const offer of freight.offers) {
    assert.equal(offer.tons % 5, 0);
    assert.ok(offer.tons >= 5 && offer.tons <= 30);
    assert.equal(offer.revenueCr, offer.tons * 1000);
  }
  // The scout's three-ton hold cannot take the smallest of them. A scout is
  // not a freight hauler under these rules: it carries speculative goods and
  // messages.
  assert.equal(ship.specifications.cargo.capacityTons, 3);
  assert.equal(freight.offers.filter((offer) => offer.tons <= 3).length, 0);
});

test('freight still pays Cr1000 per ton on delivery where a hold can take it', async () => {
  let { ship } = await fixtures();
  const calder = system('calder');
  const orison = system('orison');
  ship = loadCargo(ship, {
    id: 'manual-shipment', category: 'freight', description: 'Orison freight', tons: 3,
    originSystemId: calder.id, destinationSystemId: orison.id, acquisitionCostCr: 0, notes: ''
  });
  const delivered = deliverFreightAtDestination(ship, orison.id, { dateLabel: '008-4800' });
  assert.equal(delivered.revenueCr, 3000);
  assert.equal(delivered.ship.state.cargoUsedTons, 0);
});

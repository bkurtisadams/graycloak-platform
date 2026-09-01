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
} from '../../packages/classic-traveller-rules/index.js';
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
  assert.equal(calculateLifeSupportCostForTrip(ship).totalCr, 4000);

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

test('a fitting incidental freight offer can be loaded and pays Cr1000 per ton on delivery', async () => {
  let { ship } = await fixtures();
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
  const fitting = freight.offers.find((entry) => entry.tons <= 3);
  assert.ok(fitting);
  ship = loadCargo(ship, {
    id: fitting.id, category: 'freight', description: 'Orison freight', tons: fitting.tons,
    originSystemId: calder.id, destinationSystemId: orison.id, acquisitionCostCr: 0, notes: ''
  });
  const delivered = deliverFreightAtDestination(ship, orison.id, { dateLabel: '008-4800' });
  assert.equal(delivered.revenueCr, fitting.tons * 1000);
  assert.equal(delivered.ship.state.cargoUsedTons, 0);
});

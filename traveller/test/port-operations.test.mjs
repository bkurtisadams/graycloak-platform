import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  beginPortCall,
  consumeJumpFuel,
  importCharacterDocument,
  importShipDocument,
  loadCargo,
  payCurrentBerthing,
  purchaseShipFuel,
  parseUniversalWorldProfile,
  refuelShipToCapacity,
  starportFuelService,
  transferCharacterCreditsToShip
} from '../../packages/classic-traveller-rules/index.js';

import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js';
import { createDocumentRegistry, createMemoryStorage } from '../src/document-registry.js';
import { createCampaignDocument, updateCampaignLocation, advanceCampaignDays } from '../src/campaign-document.js';
import { createContractDocument } from '../src/contract-document.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const examples = path.resolve(here, '../examples');

async function loadFixture() {
  const character = importCharacterDocument(await readFile(path.join(examples, 'Hawkeye.character.json'), 'utf8'));
  const ship = importShipDocument(await readFile(path.join(examples, 'Hawkeye.ship.json'), 'utf8'));
  return { character, ship };
}

function system(id) {
  return FAR_MERIDIAN_SUBSECTOR.systems.find((entry) => entry.id === id);
}

test('accepted job cargo does not block a partial fuel purchase when a full refill is unaffordable', async () => {
  let { character, ship } = await loadFixture();
  ship = refuelShipToCapacity(ship, {
    quality: 'refined', pricePerTonCr: 0, source: 'SCOUT BASE', dateLabel: '001-4800'
  }).ship;
  ship = consumeJumpFuel(ship, 1).ship;
  ({ character, ship } = transferCharacterCreditsToShip(character, ship, 500, { dateLabel: '008-4800' }));

  const contract = createContractDocument({
    offerId: 'fuel-regression-job',
    kind: 'delivery',
    title: 'Test Delivery',
    rulesBasis: 'sea-of-suns-original',
    setting: 'Sea of Suns',
    issuerName: 'Test Dispatcher',
    issuerType: 'private',
    originSystemId: 'calder',
    originSystemName: 'Calder',
    destinationSystemId: 'pelagos',
    destinationSystemName: 'Pelagos',
    paymentCr: 5000,
    deadlineDays: 21,
    cargoTons: 1,
    exclusiveShip: false,
    requirementsDescription: 'Carry one ton.',
    notes: ''
  }, {
    acceptedByCharacterId: character.identity.id,
    acceptedShipId: ship.identity.id,
    acceptedDate: { year: 4800, dayOfYear: 8 }
  });

  ship = loadCargo(ship, {
    id: `${contract.identity.id}:cargo`,
    category: `contract:${contract.identity.id}`,
    description: contract.identity.title,
    tons: contract.requirements.cargoTons,
    originSystemId: contract.origin.systemId,
    destinationSystemId: contract.destination.systemId,
    acquisitionCostCr: 0,
    notes: 'Contract cargo'
  });

  assert.equal(ship.state.currentFuelTons, 20);
  assert.equal(ship.state.finances.balanceCr, 500);
  assert.equal(ship.state.cargoUsedTons, 1);

  const partial = purchaseShipFuel(ship, {
    tons: 5,
    quality: 'unrefined',
    pricePerTonCr: 100,
    source: 'STARPORT C',
    dateLabel: '008-4800'
  });
  assert.equal(partial.ship.state.currentFuelTons, 25);
  assert.equal(partial.ship.state.finances.balanceCr, 0);
  assert.equal(partial.ship.state.cargoUsedTons, 1);
});

test('Hawkeye and Marisol can establish fuel, fund the ship, jump, pay port costs, and persist the ledger', async () => {
  let { character, ship } = await loadFixture();
  assert.equal(ship.schemaVersion, 3);
  assert.equal(ship.state.currentFuelTons, null);

  const aster = system('aster');
  const asterProfile = parseUniversalWorldProfile(aster.mainWorld.uwp);
  const asterFuel = starportFuelService(asterProfile.starport, { scoutBase: aster.bases.scout, ship });
  assert.equal(asterFuel.freeScoutFuel, true);
  ship = refuelShipToCapacity(ship, {
    quality: asterFuel.quality,
    pricePerTonCr: asterFuel.pricePerTonCr,
    source: 'Aster Scout Base',
    dateLabel: '001-4800'
  }).ship;
  assert.equal(ship.state.currentFuelTons, 40);
  assert.equal(ship.state.finances.balanceCr, 0);

  ({ character, ship } = transferCharacterCreditsToShip(character, ship, 5000, { dateLabel: '001-4800' }));
  assert.equal(character.finances.credits, 75000);
  assert.equal(ship.state.finances.balanceCr, 5000);

  ship = consumeJumpFuel(ship, 1).ship;
  assert.equal(ship.state.currentFuelTons, 20);
  ship = beginPortCall(ship, { systemId: 'calder', arrivalDate: '008-4800', berthingDueCr: 100 });
  ship = payCurrentBerthing(ship, { dateLabel: '008-4800', description: 'Calder starport berthing' }).ship;
  assert.equal(ship.state.finances.balanceCr, 4900);

  const calder = system('calder');
  const calderProfile = parseUniversalWorldProfile(calder.mainWorld.uwp);
  const calderFuel = starportFuelService(calderProfile.starport, { scoutBase: calder.bases.scout, ship });
  assert.equal(calderFuel.quality, 'unrefined');
  assert.equal(calderFuel.pricePerTonCr, 100);
  const refueled = refuelShipToCapacity(ship, {
    quality: calderFuel.quality,
    pricePerTonCr: calderFuel.pricePerTonCr,
    source: 'STARPORT C',
    dateLabel: '008-4800'
  });
  ship = refueled.ship;
  assert.equal(refueled.addedTons, 20);
  assert.equal(refueled.costCr, 2000);
  assert.equal(ship.state.currentFuelTons, 40);
  assert.equal(ship.state.fuelQuality, 'mixed');
  assert.equal(ship.state.finances.balanceCr, 2900);

  let campaign = createCampaignDocument({
    id: 'campaign-port-ops-test', name: 'Sea of Suns',
    characters: [character], ships: [ship],
    partyCharacterIds: [character.identity.id], activeShipId: ship.identity.id
  });
  campaign = updateCampaignLocation(campaign, {
    systemId: aster.id, systemName: aster.name, worldId: aster.mainWorld.id, worldName: aster.mainWorld.name
  });
  campaign = advanceCampaignDays(campaign, 7);
  campaign = updateCampaignLocation(campaign, {
    systemId: calder.id, systemName: calder.name, worldId: calder.mainWorld.id, worldName: calder.mainWorld.name
  });

  const storage = createMemoryStorage();
  const registry = createDocumentRegistry({ storage });
  registry.put(character);
  registry.put(ship);
  registry.put(campaign);
  const restored = createDocumentRegistry({ storage }).resolveCampaign(campaign.identity.id);
  assert.deepEqual(restored.ships[0].state.finances, ship.state.finances);
  assert.equal(restored.ships[0].state.currentFuelTons, 40);
  assert.equal(restored.ships[0].state.portCall.berthingPaid, true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  BASE_BERTHING_COST_CR,
  CURRENT_SHIP_DOCUMENT_SCHEMA_VERSION,
  calculateBerthingCost,
  calculateJumpFuelRequirement,
  canShipMakeJump,
  consumeJumpFuel,
  createTypeSScoutReserveShipForCharacter,
  importCharacterDocument,
  importShipDocument,
  loadCargo,
  unloadCargo,
  payCurrentBerthing,
  refuelShipToCapacity,
  skimGasGiantToCapacity,
  starportFuelService,
  transferCharacterCreditsToShip,
  creditShipAccount,
  beginPortCall
} from '../index.js';

const here = path.dirname(fileURLToPath(import.meta.url));

async function hawkeye() {
  return importCharacterDocument(await readFile(path.join(here, 'fixtures/Hawkeye-v0.6.character.json'), 'utf8'));
}

async function fixtureShip() {
  const character = await hawkeye();
  return createTypeSScoutReserveShipForCharacter(character).ship;
}

test('Book 2 starport fuel service uses refined A/B and unrefined C/D pricing', async () => {
  const ship = await fixtureShip();
  assert.deepEqual(starportFuelService('A', { ship, scoutBase: false }), {
    available: true, quality: 'refined', pricePerTonCr: 500, source: 'STARPORT A', freeScoutFuel: false
  });
  assert.deepEqual(starportFuelService('C', { ship, scoutBase: false }), {
    available: true, quality: 'unrefined', pricePerTonCr: 100, source: 'STARPORT C', freeScoutFuel: false
  });
  assert.equal(starportFuelService('E', { ship }).available, false);
  assert.equal(starportFuelService('X', { ship }).available, false);
  const scout = starportFuelService('B', { ship, scoutBase: true });
  assert.equal(scout.freeScoutFuel, true);
  assert.equal(scout.pricePerTonCr, 0);
});

test('Book 2 baseline berthing is Cr100 for six days then Cr100 each additional day', () => {
  assert.equal(BASE_BERTHING_COST_CR, 100);
  assert.equal(calculateBerthingCost(1), 100);
  assert.equal(calculateBerthingCost(6), 100);
  assert.equal(calculateBerthingCost(7), 200);
  assert.equal(calculateBerthingCost(10), 500);
});

test('Type S one-week Jump-1 and Jump-2 fuel requirements include proportional power-plant use', async () => {
  const ship = await fixtureShip();
  assert.deepEqual(calculateJumpFuelRequirement(ship, 1), {
    distance: 1, jumpFuelTons: 10, powerPlantFuelTons: 5, totalTons: 15, travelDays: 7
  });
  assert.deepEqual(calculateJumpFuelRequirement(ship, 2), {
    distance: 2, jumpFuelTons: 20, powerPlantFuelTons: 5, totalTons: 25, travelDays: 7
  });
});

test('legacy unrecorded fuel blocks operational jumps until fuel state is established', async () => {
  const ship = await fixtureShip();
  const check = canShipMakeJump(ship, 1);
  assert.equal(check.allowed, false);
  assert.equal(check.reason, 'FUEL UNRECORDED');
  assert.equal(check.availableTons, null);
});

test('character credits transfer into ship account without duplicating money', async () => {
  const character = await hawkeye();
  const { ship } = createTypeSScoutReserveShipForCharacter(character);
  const result = transferCharacterCreditsToShip(character, ship, 5000, { dateLabel: '001-4800' });
  assert.equal(result.character.finances.credits, character.finances.credits - 5000);
  assert.equal(result.ship.state.finances.balanceCr, 5000);
  assert.equal(result.ship.state.finances.ledger.length, 1);
  assert.equal(result.ship.state.finances.ledger[0].amountCr, 5000);
});

test('paid and Scout-free refueling fill Type S tanks and update operating ledger correctly', async () => {
  const character = await hawkeye();
  let { ship } = createTypeSScoutReserveShipForCharacter(character);
  let funded = transferCharacterCreditsToShip(character, ship, 20000, { dateLabel: '001-4800' });
  ship = funded.ship;
  const paid = refuelShipToCapacity(ship, {
    quality: 'refined', pricePerTonCr: 500, source: 'STARPORT A', dateLabel: '001-4800'
  });
  assert.equal(paid.addedTons, 40);
  assert.equal(paid.costCr, 20000);
  assert.equal(paid.ship.state.currentFuelTons, 40);
  assert.equal(paid.ship.state.fuelQuality, 'refined');
  assert.equal(paid.ship.state.finances.balanceCr, 0);

  const fresh = createTypeSScoutReserveShipForCharacter(await hawkeye()).ship;
  const free = refuelShipToCapacity(fresh, {
    quality: 'refined', pricePerTonCr: 0, source: 'SCOUT BASE', dateLabel: '001-4800'
  });
  assert.equal(free.costCr, 0);
  assert.equal(free.ship.state.currentFuelTons, 40);
  assert.equal(free.ship.state.finances.ledger.length, 0);
});

test('jump fuel consumption and port berthing payment persist in ship state', async () => {
  let ship = createTypeSScoutReserveShipForCharacter(await hawkeye()).ship;
  ship = refuelShipToCapacity(ship, { quality: 'refined', pricePerTonCr: 0 }).ship;
  const jump = consumeJumpFuel(ship, 1);
  assert.equal(jump.consumedTons, 15);
  assert.equal(jump.ship.state.currentFuelTons, 25);

  const character = await hawkeye();
  const funded = transferCharacterCreditsToShip(character, jump.ship, 1000, { dateLabel: '008-4800' });
  ship = beginPortCall(funded.ship, { systemId: 'calder', arrivalDate: '008-4800', berthingDueCr: 100 });
  const paid = payCurrentBerthing(ship, { dateLabel: '008-4800', description: 'Calder starport berthing' });
  assert.equal(paid.costCr, 100);
  assert.equal(paid.ship.state.finances.balanceCr, 900);
  assert.equal(paid.ship.state.portCall.berthingPaid, true);
});

test('streamlined Type S can skim a gas giant to full capacity with unrefined fuel', async () => {
  let ship = createTypeSScoutReserveShipForCharacter(await hawkeye()).ship;
  ship = refuelShipToCapacity(ship, { quality: 'refined', pricePerTonCr: 0 }).ship;
  ship = consumeJumpFuel(ship, 1).ship;
  const skim = skimGasGiantToCapacity(ship);
  assert.equal(skim.addedTons, 15);
  assert.equal(skim.elapsedDays, 7);
  assert.equal(skim.ship.state.currentFuelTons, 40);
  assert.equal(skim.ship.state.fuelQuality, 'mixed');
});

test('ship document schema v1 migrates through v3 without inventing legacy fuel or finances', async () => {
  const current = createTypeSScoutReserveShipForCharacter(await hawkeye()).ship;
  const legacy = structuredClone(current);
  legacy.schemaVersion = 1;
  legacy.state = {
    operationalStatus: 'available',
    currentFuelTons: null,
    cargoUsedTons: null,
    maintenance: { status: 'unknown', lastOverhaulDate: null, monthsPastDue: null }
  };
  const migrated = importShipDocument(legacy);
  assert.equal(migrated.schemaVersion, CURRENT_SHIP_DOCUMENT_SCHEMA_VERSION);
  assert.equal(migrated.state.currentFuelTons, null);
  assert.equal(migrated.state.fuelQuality, 'unknown');
  assert.equal(migrated.state.cargoUsedTons, 0);
  assert.deepEqual(migrated.state.cargoManifest, []);
  assert.deepEqual(migrated.state.passengerManifest, []);
  assert.deepEqual(migrated.state.finances, { balanceCr: 0, ledger: [] });
  assert.equal(migrated.state.portCall, null);
});

test('cargo manifest bookkeeping enforces the Type S three-ton cargo capacity', async () => {
  let ship = await fixtureShip();
  ship = loadCargo(ship, {
    id: 'lot-1', category: 'freight', description: 'Test freight', tons: 2,
    originSystemId: 'aster', destinationSystemId: 'calder', acquisitionCostCr: 0, notes: ''
  });
  assert.equal(ship.state.cargoUsedTons, 2);
  assert.equal(ship.state.cargoManifest.length, 1);
  assert.throws(() => loadCargo(ship, {
    id: 'lot-2', category: 'freight', description: 'Too much', tons: 2,
    originSystemId: 'aster', destinationSystemId: 'calder', acquisitionCostCr: 0, notes: ''
  }), /only 1 tons available/);
  const unloaded = unloadCargo(ship, 'lot-1');
  assert.equal(unloaded.cargo.tons, 2);
  assert.equal(unloaded.ship.state.cargoUsedTons, 0);
  assert.deepEqual(unloaded.ship.state.cargoManifest, []);
});



test('generic ship-account credits support contract payments without touching character cash', async () => {
  const ship = await fixtureShip();
  const credited = creditShipAccount(ship, 17000, { kind: 'contract', description: 'Priority courier completed', dateLabel: '015-4800' });
  assert.equal(credited.state.finances.balanceCr, 17000);
  assert.equal(credited.state.finances.ledger.at(-1).kind, 'contract');
  assert.equal(credited.state.finances.ledger.at(-1).amountCr, 17000);
});

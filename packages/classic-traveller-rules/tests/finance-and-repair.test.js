import test from 'node:test';
import assert from 'node:assert/strict';
import { createSequenceDice } from '../src/dice.js';
import { createShipDocument, migrateShipDocument, CURRENT_SHIP_DOCUMENT_SCHEMA_VERSION } from '../src/starships/ship-document.js';
import {
  financeShip, shipMortgageSchedule, chargeShipUpkeep, creditShipAccount, loadCargo, bookPassenger,
  deliverFreightAtDestination, disembarkPassengersAtDestination, SUBSIDY_GROSS_RECEIPTS_SHARE
} from '../src/starships/operations.js';
import { attendingEngineerExpertise, quoteStarportDriveRepair, repairDrivesAtStarport } from '../src/starships/jump.js';

const AUTHORITY = {
  assignmentType: 'owned', controllingAuthority: 'owner', legalTitleHolder: null, legalTitleSourceStatus: 'test',
  characterOwnsShip: true, assignedCharacterId: 'captain', assignedCharacterName: 'Captain', recallable: false,
  saleAllowed: true, useAsDesired: true, possessionAtServicePleasure: false,
  servicePrivileges: { freeFuelAtScoutBases: false, freeMaintenanceAtScoutBasesAtClassBStarports: false },
  operatorResponsibilities: { upkeep: true, crewCosts: true }
};
const ship = (designKey, crew = [{ role: 'pilot', characterId: 'captain', characterName: 'Captain' }], state = {}) =>
  createShipDocument({ designKey, id: `ship-${designKey}`, authority: AUTHORITY, crewAssignments: crew, state });

test('Book 2 p.5: a bank will not generally finance a yacht, cruiser or scout without guaranteed income', () => {
  for (const key of ['type-y-yacht', 'type-c-cruiser', 'type-s-scout-courier']) {
    assert.throws(() => financeShip(ship(key), { startedOn: '001-1105' }), /guaranteed income/);
    assert.equal(financeShip(ship(key), { startedOn: '001-1105', guaranteedIncome: true }).state.finances.mortgage.subsidized, false);
  }
  assert.ok(financeShip(ship('type-a-free-trader'), { startedOn: '001-1105' }).state.finances.mortgage);
});

test('Book 2 p.5 subsidies: 600-ton hulls and up; the government pays the bank and takes half the gross receipts', () => {
  assert.throws(() => financeShip(ship('type-a-free-trader'), { startedOn: '001-1105', subsidized: true }), /600/);
  let merchant = financeShip(ship('type-m-subsidized-merchant', [
    { role: 'pilot', characterId: 'captain', characterName: 'Captain' },
    { role: 'steward', characterId: 'purser', characterName: 'Purser' }
  ]), { startedOn: '001-1105', subsidized: true });
  const schedule = shipMortgageSchedule(merchant, { dateLabel: '200-1105' });
  assert.equal(schedule.subsidized, true);
  assert.equal(schedule.skipped, false);
  assert.equal(schedule.arrearsCr, 0);
  assert.equal(chargeShipUpkeep(merchant, { dateLabel: '200-1105', unpaid: ['captain', 'purser'] }).paidCr, 0);

  merchant = creditShipAccount(merchant, 100_000, { description: 'seed' });
  merchant = loadCargo(merchant, { id: 'f1', category: 'freight', tons: 10, destinationSystemId: 'b' });
  merchant = bookPassenger(merchant, { id: 'p1', passageClass: 'middle', originSystemId: 'a', destinationSystemId: 'b' });
  const freight = deliverFreightAtDestination(merchant, 'b', { dateLabel: '010-1105' });
  assert.equal(freight.revenueCr, 10_000);
  assert.equal(freight.ship.state.finances.balanceCr, 100_000 + 10_000 * (1 - SUBSIDY_GROSS_RECEIPTS_SHARE));
  const passage = disembarkPassengersAtDestination(freight.ship, 'b', { dateLabel: '010-1105' });
  assert.equal(passage.ship.state.finances.ledger.at(-1).kind, 'subsidy');
  assert.equal(passage.ship.state.finances.balanceCr, 105_000 + 4_000);
});

test('ship document v10: an existing mortgage is not subsidized', () => {
  const financed = financeShip(ship('type-a-free-trader'), { startedOn: '001-1105' });
  const v9 = structuredClone(financed);
  v9.schemaVersion = 9;
  delete v9.state.finances.mortgage.subsidized;
  const migrated = migrateShipDocument(v9);
  assert.equal(migrated.schemaVersion, CURRENT_SHIP_DOCUMENT_SCHEMA_VERSION);
  assert.equal(migrated.state.finances.mortgage.subsidized, false);
});

test('repairs in jump space: engineers only, and a doubled engineer throws without his expertise (Book 2 p.17)', () => {
  assert.equal(attendingEngineerExpertise(ship('type-a-free-trader'), { captain: 3 }), null);
  const dedicated = ship('type-a-free-trader', [
    { role: 'pilot', characterId: 'captain', characterName: 'Captain' },
    { role: 'engineer', characterId: 'chief', characterName: 'Chief' }
  ]);
  assert.equal(attendingEngineerExpertise(dedicated, { chief: 2 }), 2);
  const doubled = ship('type-a-free-trader', [
    { role: 'pilot', characterId: 'captain', characterName: 'Captain' },
    { role: 'engineer', characterId: 'captain', characterName: 'Captain' }
  ]);
  assert.equal(attendingEngineerExpertise(doubled, { captain: 2 }), 0);
});

test('p.18 discounts: -2 when an engineer installs the parts, and never more than a new drive', () => {
  const failed = { malfunction: { failed: ['jumpDrive'], since: '001-1105', patched: false } };
  const crewed = ship('type-a-free-trader', [
    { role: 'pilot', characterId: 'captain', characterName: 'Captain' },
    { role: 'engineer', characterId: 'chief', characterName: 'Chief' }
  ], failed);
  const byCrew = quoteStarportDriveRepair(crewed, createSequenceDice([3, 4]));
  assert.equal(byCrew.crewInstalls, true);
  assert.equal(byCrew.parts[0].percent, 50);
  assert.equal(quoteStarportDriveRepair(crewed, createSequenceDice([1, 1])).costCr, 0, '2 - 2 is 0%: inconsequential');
  const yard = quoteStarportDriveRepair(ship('type-a-free-trader', undefined, failed), createSequenceDice([6, 6]));
  assert.equal(yard.parts[0].percent, 100);
  assert.equal(yard.parts[0].replaced, true);
  assert.equal(yard.costCr, 10_000_000);
});

test('starport drive repair is priced by Book 2 p.18: 2D x 10% of each failed drive, at class A-C', () => {
  const broken = creditShipAccount(ship('type-a-free-trader', undefined, {
    malfunction: { failed: ['jumpDrive', 'powerPlant'], since: '001-1105', patched: false }
  }), 20_000_000, { description: 'seed' });
  // Free Trader: jump drive A MCr 10, power plant A MCr 8.
  const quote = quoteStarportDriveRepair(broken, createSequenceDice([3, 4, 1, 1]));
  assert.deepEqual(quote.parts.map((part) => [part.drive, part.percent, part.costCr]), [['jumpDrive', 70, 7_000_000], ['powerPlant', 20, 1_600_000]]);
  assert.equal(quote.costCr, 8_600_000);
  assert.throws(() => repairDrivesAtStarport(broken, { starport: 'D', quote }), /class A, B or C/);
  const fixed = repairDrivesAtStarport(broken, { starport: 'C', quote, dateLabel: '010-1105' });
  assert.equal(fixed.ship.state.malfunction, null);
  assert.equal(fixed.ship.state.finances.balanceCr, 20_000_000 - 8_600_000);
  assert.equal(fixed.ship.state.finances.ledger.at(-1).kind, 'repair');
});

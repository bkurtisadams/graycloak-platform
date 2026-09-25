// v0.72.0: a shipyard fits a turret into an empty hardpoint (Book 2 p.15).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createShipDocument, migrateShipDocument, assertValidShipDocument, CURRENT_SHIP_DOCUMENT_SCHEMA_VERSION, applyRefit
} from '../src/starships/ship-document.js';
import { fitShipTurret, shipHardpoints, armShipTurret, loadCargo } from '../src/starships/operations.js';

const AUTHORITY = {
  assignmentType: 'owned', controllingAuthority: 'owner', legalTitleHolder: null, legalTitleSourceStatus: 'test',
  characterOwnsShip: true, assignedCharacterId: 'captain', assignedCharacterName: 'Captain', recallable: false,
  saleAllowed: true, useAsDesired: true, possessionAtServicePleasure: false,
  servicePrivileges: { freeFuelAtScoutBases: false, freeMaintenanceAtScoutBasesAtClassBStarports: false },
  operatorResponsibilities: { upkeep: true, crewCosts: true }
};
const trader = (balanceCr = 5_000_000) => createShipDocument({
  designKey: 'type-a-free-trader', id: 'ship-a', authority: AUTHORITY,
  crewAssignments: [{ role: 'pilot', characterId: 'captain', characterName: 'Captain' }],
  state: { finances: { balanceCr, ledger: [{ id: 'opening', date: '106-4800', kind: 'transfer', description: 'Opening balance', amountCr: balanceCr, balanceCr }] } }
});

test('a Free Trader has two empty hardpoints, and a fitted turret takes one, its price and a ton of hold', () => {
  const ship = trader();
  assert.deepEqual({ ...shipHardpoints(ship) }, { total: 2, fitted: 0, empty: 2 });
  const fitted = fitShipTurret(ship, { mount: 'double', dateLabel: '106-4800' });
  assert.equal(fitted.turretId, 'T-1');
  assert.equal(fitted.costCr, 500_000);
  assert.equal(fitted.ship.state.finances.balanceCr, 4_500_000);
  assert.equal(fitted.ship.specifications.cargo.capacityTons, 81);
  assert.deepEqual(fitted.ship.refit, { turrets: [{ id: 'T-1', mount: 'double', fittedOn: '106-4800' }], computer: null });
  // Weapons go into it after (p.16), as into any turret.
  const armed = armShipTurret(fitted.ship, { turretId: 'T-1', weapon: 'beam-laser' }).ship;
  assert.deepEqual(armed.state.armament.turrets, [{ id: 'T-1', weapons: ['beam-laser'] }]);
  const second = fitShipTurret(armed, { mount: 'single' });
  assert.equal(second.turretId, 'T-2');
  assert.throws(() => fitShipTurret(second.ship, { mount: 'single' }), /every hardpoint/);
});

test('the refit is the only way the specifications may differ from the design', () => {
  const fitted = fitShipTurret(trader(), { mount: 'triple' }).ship;
  const tampered = structuredClone(fitted);
  tampered.specifications.cargo.capacityTons = 82;
  assert.throws(() => assertValidShipDocument(tampered), /refit/);
  const unrecorded = structuredClone(trader());
  unrecorded.specifications.armament.turrets.push({ id: 'T-1', mount: 'single', fireControlInstalled: true, fireControlTons: 1, weapons: [] });
  assert.throws(() => assertValidShipDocument(unrecorded), /canonical/);
  assert.deepEqual(applyRefit(trader().specifications, fitted.refit), fitted.specifications);
});

test('the fire control ton must be free in the hold, and the account must cover the mount', () => {
  const full = loadCargo(trader(), { id: 'lot', category: 'freight', description: 'full hold', tons: 82, originSystemId: 'a', destinationSystemId: 'b', acquisitionCostCr: 0 });
  assert.throws(() => fitShipTurret(full, { mount: 'single' }), /hold is full/);
  assert.throws(() => fitShipTurret(trader(100_000), { mount: 'single' }), /requires Cr200,000/);
});

test('a v10 ship migrates to v11 with no refit', () => {
  const v10 = structuredClone(trader());
  v10.schemaVersion = 10;
  delete v10.refit;
  const migrated = migrateShipDocument(v10);
  assert.equal(migrated.schemaVersion, CURRENT_SHIP_DOCUMENT_SCHEMA_VERSION);
  assert.deepEqual(migrated.refit, { turrets: [], computer: null });
});

// v0.72.1: goods sold each carry the ship-vehicle table's tonnage.
import { purchaseSpeculativeCargo, sellSpeculativeCargo, speculativeCargoUnits, speculativeTonsPerUnit } from '../src/starships/operations.js';

test('an Air/Raft bought as speculative cargo takes 4 tons of hold; goods with no tonnage on record are refused', () => {
  const ship = trader(20_000_000);
  const offer = { code: 52, name: 'Air/Raft', unit: 'each', quantityAvailable: 2, pricePerUnitCr: 4_800_000, percentage: 80, basePriceCr: 6_000_000 };
  const bought = purchaseSpeculativeCargo(ship, offer, 2, { originSystemId: 'aster', dateLabel: '106-4800' });
  const lot = bought.ship.state.cargoManifest[0];
  assert.equal(lot.tons, 8);
  assert.equal(speculativeCargoUnits(lot), 2);
  assert.equal(bought.costCr, 9_600_000);
  assert.equal(speculativeTonsPerUnit(54), 10);
  assert.equal(speculativeTonsPerUnit(53), null);
  assert.throws(() => purchaseSpeculativeCargo(ship, { ...offer, code: 53, name: 'Computers' }, 1, { originSystemId: 'aster' }), /no tonnage is on record/);
  const sold = sellSpeculativeCargo(bought.ship, lot.id, { code: 52, quantity: 2, netCr: 12_000_000, percentage: 100 }, { destinationSystemId: 'calder', dateLabel: '113-4800' });
  assert.equal(sold.revenueCr, 12_000_000);
});

// v0.73.0: a computer retrofitted in place of the design's (Book 2 p.15).
import { quoteComputerRefit, refitShipComputer } from '../src/starships/operations.js';

const scout = (balanceCr = 20_000_000) => createShipDocument({
  designKey: 'type-s-scout-courier', id: 'ship-s', authority: AUTHORITY,
  crewAssignments: [{ role: 'pilot', characterId: 'captain', characterName: 'Captain' }],
  state: { finances: { balanceCr, ledger: [{ id: 'opening', date: '106-4800', kind: 'transfer', description: 'Opening balance', amountCr: balanceCr, balanceCr }] } }
});

test('a Type S trades her Model/1 in at 25% for a Model/2, and the extra ton comes out of the hold', () => {
  const quote = quoteComputerRefit(scout(), { model: '2' });
  assert.deepEqual({ priceCr: quote.priceCr, tradeInCr: quote.tradeInCr, costCr: quote.costCr, deltaTons: quote.deltaTons, possible: quote.possible },
    { priceCr: 9_000_000, tradeInCr: 500_000, costCr: 8_500_000, deltaTons: 1, possible: true });
  const refit = refitShipComputer(scout(), { model: '2', dateLabel: '106-4800' });
  assert.deepEqual(refit.ship.specifications.computer, { model: '2', tons: 2, cpu: 3, storage: 6, maximumSupportedJump: 2 });
  assert.equal(refit.ship.specifications.cargo.capacityTons, 2);
  assert.equal(refit.ship.state.finances.balanceCr, 11_500_000);
  assert.deepEqual(refit.ship.refit.computer, { model: '2', fittedOn: '106-4800' });
  // It survives a round trip through import, which refreshes the computer.
  const again = migrateShipDocument(JSON.parse(JSON.stringify(refit.ship)));
  assert.deepEqual(again.specifications.computer, refit.ship.specifications.computer);
});

test('a computer that needs more hold than is free, or more money than is held, is refused with the reason', () => {
  const four = quoteComputerRefit(scout(), { model: '4' });
  assert.equal(four.possible, false, 'a Model/4 is 3 t more than the Model/1; a Type S has 3 t of hold, so it fits');
  assert.match(four.reasons.join(' '), /account holds/);
  const five = quoteComputerRefit(scout(100_000_000), { model: '5' });
  assert.match(five.reasons.join(' '), /needs 4 t more than the Model\/1; 3 t of hold is free/);
  assert.throws(() => refitShipComputer(scout(), { model: '1' }), /already installed/);
});

test('a v11 ship saved before refit.computer existed is filled in on load', () => {
  const doc = JSON.parse(JSON.stringify(scout()));
  delete doc.refit.computer;
  assert.equal(migrateShipDocument(doc).refit.computer, null);
});

// v0.74.0: the 1982 computer jump limit, as a floor over the design.
import { computerJumpLimit } from '../src/starships/ship-document.js';

test('a computer model supports its own jump number (a bis one more), never below the design', () => {
  assert.deepEqual(['1', '1bis', '2', '2bis', '3', '4', '7'].map(computerJumpLimit), [1, 2, 2, 3, 3, 4, 6]);
  assert.equal(refitShipComputer(scout(), { model: '2' }).ship.specifications.computer.maximumSupportedJump, 2, 'the design Model/1 already made jump-2');
  assert.equal(refitShipComputer(scout(100_000_000), { model: '4' }).ship.specifications.computer.maximumSupportedJump, 4);
});

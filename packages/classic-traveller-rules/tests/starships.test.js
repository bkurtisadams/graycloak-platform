import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  CURRENT_CHARACTER_DOCUMENT_SCHEMA_VERSION,
  CURRENT_SHIP_DOCUMENT_SCHEMA_VERSION,
  SHIP_DOCUMENT_TYPE,
  TYPE_S_SCOUT_COURIER,
  createTypeSScoutReserveShipForCharacter,
  exportShipDocument,
  importCharacterDocument,
  importShipDocument,
  updateCharacterShipReference,
  updateShipIdentity,
  validateShipDocument,
  SHIP_CREW_ROLES,
  assignShipCrew,
  releaseShipCrew,
  shipCrewRole,
  shipCrewMemberRoles,
  calculateMonthlyCrewSalaries,
  shipCashPriceCr,
  annualMaintenanceCr,
  shipMortgage
} from '../index.js';

const here = path.dirname(fileURLToPath(import.meta.url));

async function hawkeyeV06Document() {
  return readFile(path.join(here, 'fixtures/Hawkeye-v0.6.character.json'), 'utf8');
}

test('canonical Type S Scout/Courier matches the 1977 Book 2', () => {
  const ship = TYPE_S_SCOUT_COURIER;
  assert.equal(ship.typeCode, 'S');
  assert.equal(ship.hull.tons, 100);
  assert.equal(ship.hull.standard, true);
  assert.equal(ship.hull.streamlined, true);
  assert.deepEqual(ship.drives.jump, { letter: 'A', rating: 2 });
  assert.deepEqual(ship.drives.maneuver, { letter: 'A', rating: 2 });
  assert.deepEqual(ship.drives.powerPlant, { letter: 'A', rating: 2 });
  assert.equal(ship.fuel.capacityTons, 40);
  // Book 2 p.19 ships the Scout with Model/1; p.14 gives it CPU 2, storage 4.
  assert.equal(ship.computer.model, '1');
  assert.equal(ship.computer.cpu, 2);
  assert.equal(ship.computer.storage, 4);
  assert.equal(ship.accommodations.staterooms, 4);
  assert.equal(ship.accommodations.lowBerths, 0);
  assert.equal(ship.cargo.capacityTons, 3);
  assert.equal(ship.armament.hardpoints, 1);
  assert.equal(ship.armament.turrets[0].mount, 'double');
  assert.equal(ship.armament.turrets[0].fireControlInstalled, true);
  assert.deepEqual(ship.armament.turrets[0].weapons, []);
  assert.equal(ship.vehicles[0].name, 'Air/Raft');
  assert.equal(ship.crew.standardCount, 1);
  assert.deepEqual(ship.crew.standardDuties, ['pilot', 'engineer']);
  // Book 2 p.18, 1977 printing.
  assert.equal(ship.economics.newCostMCr, 32.49);
  assert.equal(ship.economics.buildMonths, 9);
  assert.equal(ship.economics.annualRoutineMaintenanceCr, 32490);
});

test('Hawkeye v0.6 character document migrates duplicate Scout Ship rolls to the Book 1 reserve rule', async () => {
  const hawkeye = importCharacterDocument(await hawkeyeV06Document());
  assert.equal(hawkeye.schemaVersion, CURRENT_CHARACTER_DOCUMENT_SCHEMA_VERSION);
  assert.match(hawkeye.identity.id, /^char-[0-9a-f]{16}$/);
  assert.deepEqual(hawkeye.benefits.shipEntitlements, [{
    name: 'Scout Ship',
    rolls: 2,
    effectiveCount: 1,
    noEffectCount: 1,
    disposition: 'reserve-assignment-available'
  }]);
  assert.deepEqual(hawkeye.shipRefs, []);
});

test('Hawkeye can receive exactly one reserve Type S and the character links to it by ID', async () => {
  const hawkeye = importCharacterDocument(await hawkeyeV06Document());
  const result = createTypeSScoutReserveShipForCharacter(hawkeye);
  const { character, ship } = result;

  assert.equal(ship.documentType, SHIP_DOCUMENT_TYPE);
  assert.equal(ship.schemaVersion, CURRENT_SHIP_DOCUMENT_SCHEMA_VERSION);
  assert.equal(ship.design.key, 'type-s-scout-courier');
  assert.equal(ship.authority.assignmentType, 'reserve');
  assert.equal(ship.authority.controllingAuthority, 'Scout Service');
  assert.equal(ship.authority.legalTitleHolder, null);
  assert.equal(ship.authority.characterOwnsShip, false);
  assert.equal(ship.authority.recallable, true);
  assert.equal(ship.authority.saleAllowed, false);
  assert.equal(ship.authority.useAsDesired, true);
  assert.equal(ship.authority.possessionAtServicePleasure, true);
  assert.equal(ship.authority.servicePrivileges.freeFuelAtScoutBases, true);
  assert.equal(ship.authority.servicePrivileges.freeMaintenanceAtScoutBasesAtClassBStarports, true);
  assert.equal(ship.authority.operatorResponsibilities.upkeep, true);
  assert.equal(ship.authority.operatorResponsibilities.crewCosts, true);
  assert.deepEqual(ship.crew.assignments, [{
    role: 'pilot',
    characterId: character.identity.id,
    characterName: 'Hawkeye'
  }]);
  assert.deepEqual(character.shipRefs, [{
    shipId: ship.identity.id,
    relationship: 'reserve-assignee',
    shipType: 'S',
    shipName: ''
  }]);
  assert.equal(character.benefits.shipEntitlements[0].disposition, 'reserve-assignment-active');
  assert.equal(validateShipDocument(ship).valid, true);

  assert.throws(
    () => createTypeSScoutReserveShipForCharacter(character),
    /available Scout Ship reserve assignment|already has a reserve-assigned/
  );
});

test('character ship reference can track an assigned ship name without embedding the ship', async () => {
  const hawkeye = importCharacterDocument(await hawkeyeV06Document());
  const { character, ship } = createTypeSScoutReserveShipForCharacter(hawkeye);
  const updated = updateCharacterShipReference(character, {
    shipId: ship.identity.id,
    shipName: 'Wayfarer'
  });
  assert.equal(updated.shipRefs[0].shipName, 'Wayfarer');
  assert.equal(Object.hasOwn(updated.shipRefs[0], 'specifications'), false);
});

test('ship documents round-trip strictly and allow identity edits without changing design data', async () => {
  const hawkeye = importCharacterDocument(await hawkeyeV06Document());
  const { ship } = createTypeSScoutReserveShipForCharacter(hawkeye);
  const named = updateShipIdentity(ship, { name: 'Wayfarer', registry: 'S-001' });
  assert.equal(named.identity.name, 'Wayfarer');
  assert.equal(named.identity.registry, 'S-001');
  assert.deepEqual(named.specifications, ship.specifications);

  const imported = importShipDocument(exportShipDocument(named));
  assert.deepEqual(imported, named);
  assert.notEqual(imported, named);
  assert.notEqual(imported.specifications, named.specifications);
});

test('ship import rejects altered canonical Type S specifications', async () => {
  const hawkeye = importCharacterDocument(await hawkeyeV06Document());
  const { ship } = createTypeSScoutReserveShipForCharacter(hawkeye);
  const altered = structuredClone(ship);
  altered.specifications.cargo.capacityTons = 40;
  assert.throws(() => importShipDocument(altered), /canonical standard design/);
});

test('a stale computer block is refreshed from the design rather than rejected', async () => {
  const hawkeye = importCharacterDocument(await hawkeyeV06Document());
  const { ship } = createTypeSScoutReserveShipForCharacter(hawkeye);
  const stale = structuredClone(ship);
  // Every ship saved before the Model/1 correction carries the old block.
  stale.specifications.computer = { model: '1bis', tons: 1, cpu: 4, storage: 0, maximumSupportedJump: 2 };
  const imported = importShipDocument(stale);
  assert.equal(imported.specifications.computer.model, '1');
  assert.equal(imported.specifications.computer.cpu, 2);
  assert.equal(imported.specifications.computer.storage, 4);
});


test('Book 2 crew: a role is assigned to a character, and a role is not held twice', async () => {
  const character = importCharacterDocument(await hawkeyeV06Document());
  let ship = createTypeSScoutReserveShipForCharacter(character).ship;
  assert.deepEqual(shipCrewRole(ship, 'steward'), []);
  // The reserve scout is created with its owner already flying it.
  assert.equal(shipCrewRole(ship, 'pilot')[0].characterId, character.identity.id);

  assert.throws(() => assignShipCrew(ship, { role: 'pilot', characterId: character.identity.id }), /already holds the pilot position/);

  ship = assignShipCrew(ship, { role: 'steward', characterId: 'npc-mara-venn', characterName: 'Mara Venn' });
  assert.equal(shipCrewRole(ship, 'steward')[0].characterName, 'Mara Venn');
  // The document stays valid, so a crewed ship round-trips.
  assert.equal(validateShipDocument(importShipDocument(exportShipDocument(ship))).valid, true);

  ship = releaseShipCrew(ship, 'npc-mara-venn');
  assert.deepEqual(shipCrewRole(ship, 'steward'), []);
  assert.throws(() => releaseShipCrew(ship, 'npc-mara-venn'), /not assigned/);
});

test('Book 2 p.17: one person may fill two positions, at 75% of each and with no expertise DMs', async () => {
  const character = importCharacterDocument(await hawkeyeV06Document());
  const id = character.identity.id;
  let ship = createTypeSScoutReserveShipForCharacter(character).ship;

  assert.equal(shipCrewMemberRoles(ship, id).appliesExpertise, true);

  // The owner-pilot of a scout takes the steward's post so the ship can carry a
  // high passenger at all: Book 2 p.16 requires a steward, and p.17 exempts a
  // 100-ton hull from needing an engineer, so there is no one else aboard.
  ship = assignShipCrew(ship, { role: 'steward', characterId: id });
  const held = shipCrewMemberRoles(ship, id);
  assert.deepEqual([...held.roles].sort(), ['pilot', 'steward']);
  assert.equal(held.doubledUp, true);
  assert.equal(held.appliesExpertise, false);

  // Two is the ceiling the book states.
  assert.throws(() => assignShipCrew(ship, { role: 'medic', characterId: id }), /allows two/);

  // Pilot CR 6000 and steward CR 3000, each at 75%.
  const payroll = calculateMonthlyCrewSalaries(ship);
  assert.equal(payroll.totalCr, 4500 + 2250);
  assert.ok(payroll.entries.every((entry) => entry.doubledUp === true));

  // Giving up one post restores full pay and expertise in the other.
  ship = releaseShipCrew(ship, id, { role: 'steward' });
  assert.deepEqual(shipCrewMemberRoles(ship, id).roles, ['pilot']);
  assert.equal(shipCrewMemberRoles(ship, id).appliesExpertise, true);
  assert.equal(calculateMonthlyCrewSalaries(ship).totalCr, 6000);
});

test('an unknown crew role is refused rather than stored', async () => {
  const ship = createTypeSScoutReserveShipForCharacter(importCharacterDocument(await hawkeyeV06Document())).ship;
  assert.ok(SHIP_CREW_ROLES.includes('steward'));
  assert.throws(() => assignShipCrew(ship, { role: 'sommelier', characterId: 'x' }), /unknown crew role/);
});

test('the Type S base price is the 1977 printed figure, with no second discount', async () => {
  const design = TYPE_S_SCOUT_COURIER;
  // Book 2 p.18: CR 32,490,000, a figure that already includes the 10%
  // standard-design reduction. Nothing may apply that reduction again.
  assert.equal(design.economics.newCostMCr, 32.49);
  const ship = createTypeSScoutReserveShipForCharacter(importCharacterDocument(await hawkeyeV06Document())).ship;
  assert.equal(shipCashPriceCr(ship), 32490000);
  // Maintenance and the mortgage both scale off it.
  assert.equal(annualMaintenanceCr(ship), 32490);
  assert.equal(shipMortgage(ship).monthlyPaymentCr, Math.round(32490000 / 240));
  assert.equal(shipMortgage(ship).downPaymentCr, 6498000);
});

test('a stored ship picks up a corrected design price instead of failing to load', async () => {
  const hawkeye = importCharacterDocument(await hawkeyeV06Document());
  const { ship } = createTypeSScoutReserveShipForCharacter(hawkeye);
  const stale = structuredClone(ship);
  // A document saved before the Book 2 p.18 correction.
  stale.specifications.economics.newCostMCr = 29.43;
  stale.specifications.economics.annualRoutineMaintenanceCr = 29430;
  const loaded = importShipDocument(stale);
  assert.equal(loaded.specifications.economics.newCostMCr, 32.49);
  // Only economics is refreshed; the rest of the specs still reject tampering.
  const tampered = structuredClone(ship);
  tampered.specifications.cargo.capacityTons = 99;
  assert.throws(() => importShipDocument(tampered), /canonical standard design/);
});

test('Book 2: the Type S printed price reproduces from the component tables', async () => {
  const ship = TYPE_S_SCOUT_COURIER;
  // Book 2 pp.10-16 component prices, in millions of credits.
  const HULL_100 = 2;             // p.10 hull types
  const JUMP_A = 10, MANEUVER_A = 4, POWER_PLANT_A = 8;  // p.11 drives and power plants
  const MODEL_1 = 2;              // p.14 computer models
  const BRIDGE_PER_100_TONS = 0.5;
  const STATEROOM = 0.5;
  const HARDPOINT = 0.1;
  const DOUBLE_TURRET = 0.5;
  const STREAMLINING_PER_100_TONS = 1;
  const AIR_RAFT = 6;             // p.16 ship's vehicles
  const STANDARD_DESIGN_REDUCTION = 0.9;  // p.9, already included in the printed price

  const components = HULL_100
    + JUMP_A + MANEUVER_A + POWER_PLANT_A
    + MODEL_1
    + BRIDGE_PER_100_TONS * (ship.hull.tons / 100)
    + STATEROOM * ship.accommodations.staterooms
    + HARDPOINT * ship.armament.hardpoints
    + DOUBLE_TURRET
    + STREAMLINING_PER_100_TONS * (ship.hull.tons / 100)
    + AIR_RAFT;

  assert.equal(components, 36.1);
  assert.equal(Number((components * STANDARD_DESIGN_REDUCTION).toFixed(3)), ship.economics.newCostMCr);
  assert.equal(ship.economics.newCostMCr, 32.49);
});

test('Book 2: the Type S tankage is exactly one jump-2 trip of fuel', () => {
  const ship = TYPE_S_SCOUT_COURIER;
  // p.6 formulae: 0.1 x M x Jn for the jump, 10Pn for the trip's power plant.
  const jumpFuelTons = 0.1 * ship.hull.tons * ship.drives.jump.rating;
  const powerPlantFuelTons = 10 * ship.drives.powerPlant.rating;
  assert.equal(jumpFuelTons, ship.fuel.jumpFuelTonsAtMaxJump);
  assert.equal(powerPlantFuelTons, ship.fuel.powerPlantFuelTonsPerTrip);
  assert.equal(jumpFuelTons + powerPlantFuelTons, ship.fuel.capacityTons);
});

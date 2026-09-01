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
  validateShipDocument
} from '../index.js';

const here = path.dirname(fileURLToPath(import.meta.url));

async function hawkeyeV06Document() {
  return readFile(path.join(here, 'fixtures/Hawkeye-v0.6.character.json'), 'utf8');
}

test('canonical Type S Scout/Courier matches Book 2 p.19 plus facsimile errata', () => {
  const ship = TYPE_S_SCOUT_COURIER;
  assert.equal(ship.typeCode, 'S');
  assert.equal(ship.hull.tons, 100);
  assert.equal(ship.hull.standard, true);
  assert.equal(ship.hull.streamlined, true);
  assert.deepEqual(ship.drives.jump, { letter: 'A', rating: 2 });
  assert.deepEqual(ship.drives.maneuver, { letter: 'A', rating: 2 });
  assert.deepEqual(ship.drives.powerPlant, { letter: 'A', rating: 2 });
  assert.equal(ship.fuel.capacityTons, 40);
  assert.equal(ship.computer.model, '1bis');
  assert.equal(ship.computer.cpu, 4);
  assert.equal(ship.computer.storage, 0);
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
  assert.equal(ship.economics.newCostMCr, 29.43);
  assert.equal(ship.economics.buildMonths, 9);
  assert.equal(ship.economics.annualRoutineMaintenanceCr, 29430);
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
  altered.specifications.computer.model = '1';
  assert.throws(() => importShipDocument(altered), /canonical standard design/);
});

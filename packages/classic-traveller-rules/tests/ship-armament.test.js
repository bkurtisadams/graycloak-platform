import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  importCharacterDocument,
  createTypeSScoutReserveShipForCharacter,
  importShipDocument,
  creditShipAccount,
  exportShipDocument,
  validateShipDocument,
  assignShipCrew,
  armShipTurret,
  stripShipTurret,
  turretWeapons,
  turretDataCardCode,
  shipIsArmed,
  shipGunnerRequirement,
  magazineCapacity,
  purchaseOrdnance,
  getStandardShipDesign,
  CURRENT_SHIP_DOCUMENT_SCHEMA_VERSION
} from '../index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const hawkeye = async () => importCharacterDocument(
  JSON.parse(await readFile(path.join(here, 'fixtures', 'Hawkeye-v0.6.character.json'), 'utf8'))
);

// A funded scout: arming costs millions, so the account needs millions in it.
async function fundedScout(credits = 5000000) {
  const character = await hawkeye();
  const { ship } = createTypeSScoutReserveShipForCharacter(character);
  return creditShipAccount(ship, credits, { kind: 'capital', description: 'Fitting-out fund' });
}

test('Book 2 p.16: a standard design is delivered unarmed', async () => {
  const ship = await fundedScout();
  assert.equal(shipIsArmed(ship), false);
  assert.deepEqual(turretWeapons(ship, 'T-1'), []);
  // The turret itself is real; it is the weaponry that is absent.
  assert.equal(getStandardShipDesign('type-s-scout-courier').armament.turrets[0].mount, 'double');
});

test('Book 2 p.16: weapons are bought and fitted, and the account pays', async () => {
  let ship = await fundedScout();
  const first = armShipTurret(ship, { turretId: 'T-1', weapon: 'beam-laser', dateLabel: '001-4800' });
  assert.equal(first.priceCr, 1000000);
  ship = first.ship;
  assert.equal(ship.state.finances.balanceCr, 4000000);
  assert.equal(shipIsArmed(ship), true);

  const second = armShipTurret(ship, { turretId: 'T-1', weapon: 'missile-launcher', dateLabel: '001-4800' });
  assert.equal(second.priceCr, 750000);
  ship = second.ship;

  // Book 2 p.24 data card notation for the Suleiman's turret: B, M.
  assert.equal(turretDataCardCode(ship, 'T-1'), 'B, M');
  assert.equal(ship.state.finances.balanceCr, 3250000);
  assert.equal(ship.state.finances.ledger.at(-1).kind, 'armament');
});

test('Book 2 p.15: a turret holds no more weapons than its mount', async () => {
  let ship = await fundedScout();
  ship = armShipTurret(ship, { turretId: 'T-1', weapon: 'beam-laser' }).ship;
  ship = armShipTurret(ship, { turretId: 'T-1', weapon: 'beam-laser' }).ship;
  // The Scout's single hardpoint carries a double turret: two, and no more.
  assert.throws(() => armShipTurret(ship, { turretId: 'T-1', weapon: 'sandcaster' }), /double mount and already holds 2/);
  assert.throws(() => armShipTurret(ship, { turretId: 'T-9', weapon: 'beam-laser' }), /no turret T-9/);
});

test('weapons cannot be bought without the money for them', async () => {
  const ship = await fundedScout(500000);
  assert.throws(() => armShipTurret(ship, { turretId: 'T-1', weapon: 'beam-laser' }), /insufficient funds/);
  // A pulse laser is the cheaper, worse weapon, and this ship can afford it.
  const armed = armShipTurret(ship, { turretId: 'T-1', weapon: 'pulse-laser' });
  assert.equal(armed.priceCr, 500000);
  assert.equal(armed.ship.state.finances.balanceCr, 0);
});

test('Book 2 p.17: an armed turret owes a gunner', async () => {
  let ship = await fundedScout();
  assert.deepEqual({ ...shipGunnerRequirement(ship) }, { armedTurrets: 0, gunners: 0, shortfall: 0 });

  ship = armShipTurret(ship, { turretId: 'T-1', weapon: 'beam-laser' }).ship;
  assert.equal(shipGunnerRequirement(ship).shortfall, 1);

  ship = assignShipCrew(ship, { role: 'gunner', characterId: 'npc-tam-iresh', characterName: 'Tam Iresh' });
  assert.equal(shipGunnerRequirement(ship).shortfall, 0);
});

test('a stripped weapon leaves the turret, and a resale credits the account', async () => {
  let ship = await fundedScout();
  ship = armShipTurret(ship, { turretId: 'T-1', weapon: 'beam-laser' }).ship;
  ship = armShipTurret(ship, { turretId: 'T-1', weapon: 'sandcaster' }).ship;
  assert.equal(turretDataCardCode(ship, 'T-1'), 'B, S');

  const stripped = stripShipTurret(ship, { turretId: 'T-1', weapon: 'sandcaster', resaleCr: 62500 });
  ship = stripped.ship;
  assert.deepEqual(turretWeapons(ship, 'T-1'), ['beam-laser']);
  // Beam laser MCr 1 and sandcaster MCr 0.25 out of MCr 5, then the resale in.
  assert.equal(ship.state.finances.balanceCr, 3750000 + 62500);

  ship = stripShipTurret(ship, { turretId: 'T-1', weapon: 'beam-laser' }).ship;
  assert.equal(shipIsArmed(ship), false);
  assert.throws(() => stripShipTurret(ship, { turretId: 'T-1', weapon: 'beam-laser' }), /no Beam Laser fitted/);
});

test('Book 2 pp.18, 31: ordnance is bought by the round and three fit a launcher', async () => {
  let ship = await fundedScout();
  ship = armShipTurret(ship, { turretId: 'T-1', weapon: 'missile-launcher' }).ship;
  ship = armShipTurret(ship, { turretId: 'T-1', weapon: 'sandcaster' }).ship;

  let magazine = magazineCapacity(ship);
  assert.deepEqual(
    { launchers: magazine.launchers, ready: magazine.readyMissiles, sand: magazine.readySandCanisters },
    { launchers: 1, ready: 3, sand: 3 }
  );
  assert.equal(magazine.missiles, 0);

  const bought = purchaseOrdnance(ship, { missiles: 5, sandCanisters: 3, dateLabel: '001-4800' });
  // Book 2 p.18: missiles CR 5000, sand CR 400 a canister.
  assert.equal(bought.costCr, 5 * 5000 + 3 * 400);
  ship = bought.ship;
  magazine = magazineCapacity(ship);
  assert.equal(magazine.missiles, 5);
  assert.equal(magazine.sandCanisters, 3);
  assert.equal(ship.state.finances.ledger.at(-1).kind, 'ordnance');

  assert.throws(() => purchaseOrdnance(ship, {}), /nothing to purchase/);
});

test('an armed ship still matches its canonical design and round-trips', async () => {
  let ship = await fundedScout();
  ship = armShipTurret(ship, { turretId: 'T-1', weapon: 'beam-laser' }).ship;
  ship = purchaseOrdnance(ship, { missiles: 3 }).ship;

  // Book 2 p.16 keeps weapons out of plans and specifications, so the canonical
  // comparison is untouched by arming the ship.
  assert.deepEqual(ship.specifications.armament.turrets[0].weapons, []);
  assert.equal(validateShipDocument(ship).valid, true);

  const restored = importShipDocument(exportShipDocument(ship));
  assert.deepEqual(turretWeapons(restored, 'T-1'), ['beam-laser']);
  assert.equal(restored.state.armament.missiles, 3);
});

test('ship document schema v3 migrates to v4 as an unarmed ship', async () => {
  const current = await fundedScout();
  const legacy = structuredClone(current);
  legacy.schemaVersion = 3;
  delete legacy.state.armament;

  const migrated = importShipDocument(legacy);
  assert.equal(migrated.schemaVersion, CURRENT_SHIP_DOCUMENT_SCHEMA_VERSION);
  assert.deepEqual(migrated.state.armament, { turrets: [], missiles: 0, sandCanisters: 0 });
  assert.equal(shipIsArmed(migrated), false);
});

test('a turret id that is not on the ship is refused in state', async () => {
  const ship = await fundedScout();
  const tampered = structuredClone(ship);
  tampered.state.armament.turrets = [{ id: 'T-4', weapons: ['beam-laser'] }];
  assert.throws(() => importShipDocument(tampered), /does not name a turret on this ship/);

  const overloaded = structuredClone(ship);
  overloaded.state.armament.turrets = [{ id: 'T-1', weapons: ['beam-laser', 'beam-laser', 'beam-laser'] }];
  assert.throws(() => importShipDocument(overloaded), /more weapons than a double turret mounts/);
});

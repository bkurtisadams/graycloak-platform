import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  importCharacterDocument,
  createTypeSScoutReserveShipForCharacter,
  importShipDocument,
  exportShipDocument,
  validateShipDocument,
  creditShipAccount,
  armShipTurret,
  applyShipHit,
  applyMissileDetonation,
  repairShipDamage,
  clearShipDamage,
  currentDriveState,
  canDoubleFire,
  fuelDamage,
  releaseFuelFromHit,
  establishShipFuelState,
  computerOperation,
  turretOperational,
  operationalTurrets,
  hullDecompressed,
  damageReport,
  repairableLocations,
  rollHitLocation,
  HIT_LOCATION_TABLE,
  MISSILE_HIT_LOCATION_DM,
  FUEL_TONS_LOST_PER_HIT,
  COMPUTER_PERMANENT_FAILURE_HITS,
  CURRENT_SHIP_DOCUMENT_SCHEMA_VERSION
} from '../index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const hawkeye = async () => importCharacterDocument(
  JSON.parse(await readFile(path.join(here, 'fixtures', 'Hawkeye-v0.6.character.json'), 'utf8'))
);

async function scout() {
  const { ship } = createTypeSScoutReserveShipForCharacter(await hawkeye());
  return creditShipAccount(ship, 5000000, { kind: 'capital', description: 'Fitting-out fund' });
}

// Dice that return a fixed sequence, so a located hit is deterministic.
function sequenceDice(values) {
  const queue = [...values];
  const next = () => (queue.length ? queue.shift() : 1);
  return {
    rollD6: () => next(),
    roll2D6: () => { const a = next(); const b = next(); return { dice: [a, b], total: a + b }; }
  };
}

// Applies a hit at a chosen location by feeding the p.34 table the total it wants.
function hitAt(ship, total, extra = []) {
  const a = Math.min(6, Math.max(1, total - 1));
  return applyShipHit(ship, sequenceDice([a, total - a, ...extra]));
}

test('Book 2 p.34: the hit location table reads two dice per column', () => {
  assert.equal(HIT_LOCATION_TABLE.starship[2], 'power-plant');
  assert.equal(HIT_LOCATION_TABLE.starship[7], 'hull');
  assert.equal(HIT_LOCATION_TABLE.starship[12], 'turret');
  assert.equal(HIT_LOCATION_TABLE['small-craft'][2], 'drive');
  assert.equal(HIT_LOCATION_TABLE['small-craft'][7], 'cabin');
  assert.equal(HIT_LOCATION_TABLE['small-craft'][12], 'weaponry');

  // Book 2 p.31: missile detonation applies -4, which pushes damage toward the
  // power plant and drives, and cannot fall off the bottom of the table.
  const located = rollHitLocation(sequenceDice([1, 1]), { dm: MISSILE_HIT_LOCATION_DM });
  assert.equal(located.total, -2);
  assert.equal(located.location, 'power-plant');
});

test('a new ship is undamaged and reports itself so', async () => {
  const ship = await scout();
  const report = damageReport(ship);
  assert.equal(report.undamaged, true);
  assert.equal(report.totalHits, 0);
  assert.equal(report.adrift, false);
  assert.equal(report.canJump, true);
  assert.equal(hullDecompressed(ship), false);
});

test('Book 2 p.33: one hit destroys an A drive on a scout, and it cannot be repaired', async () => {
  let ship = await scout();
  // Total 3 is the maneuver drive.
  ship = hitAt(ship, 3).ship;
  const drive = currentDriveState(ship, 'maneuverDrive');
  assert.equal(drive.hits, 1);
  assert.equal(drive.destroyed, true);
  assert.equal(drive.functional, false);
  assert.equal(drive.potential, null);

  const report = damageReport(ship);
  assert.equal(report.adrift, true);
  // p.35: drive damage which has completely destroyed a drive cannot be
  // repaired, so damage control is not offered it.
  assert.ok(!repairableLocations(ship).includes('maneuver-drive'));
});

test('Book 2 p.33: a jump drive hit strands the ship in system', async () => {
  let ship = await scout();
  ship = hitAt(ship, 4).ship;
  assert.equal(currentDriveState(ship, 'jumpDrive').destroyed, true);
  assert.equal(damageReport(ship).canJump, false);
  // The maneuver drive is untouched, so the ship is not adrift — just stuck.
  assert.equal(damageReport(ship).adrift, false);
});

test('Book 2 p.33: fuel hits release 20 tons each and bite at 60% of tankage', async () => {
  let ship = await scout();
  const capacity = ship.specifications.fuel.capacityTons;
  assert.equal(capacity, 40);

  // Total 9 is fuel.
  ship = hitAt(ship, 9).ship;
  let fuel = fuelDamage(ship);
  assert.equal(fuel.puncturedTons, FUEL_TONS_LOST_PER_HIT);
  // 20 of 40 tons is half, short of the 60% that stops a jump.
  assert.equal(fuel.jumpDisabled, false);

  ship = hitAt(ship, 9).ship;
  fuel = fuelDamage(ship);
  assert.equal(fuel.puncturedTons, 40);
  assert.equal(fuel.jumpDisabled, true);
  assert.equal(fuel.maneuverDisabled, true);
  assert.equal(damageReport(ship).adrift, true);
});

test('Book 2 p.33: a fuel hit releases fuel for good, and repairing the hit does not refill the tank', async () => {
  let ship = establishShipFuelState(await scout(), { tons: 30, quality: 'refined' });

  let hit = hitAt(ship, 9);
  ship = hit.ship;
  assert.equal(hit.location, 'fuel');
  assert.equal(hit.fuelReleasedTons, 20);
  assert.equal(ship.state.currentFuelTons, 10);
  assert.equal(ship.state.fuelQuality, 'refined');

  // p.35: damage control patches the puncture, which lifts the tankage
  // threshold, but the 20 tons that went into space stay gone.
  const repaired = repairShipDamage(ship, { location: 'fuel' });
  assert.equal(fuelDamage(repaired).hits, 0);
  assert.equal(fuelDamage(repaired).puncturedTons, 0);
  assert.equal(repaired.state.currentFuelTons, 10);

  // A second hit can only release what is left, and an empty tank has no quality.
  hit = hitAt(repaired, 9);
  assert.equal(hit.fuelReleasedTons, 10);
  assert.equal(hit.ship.state.currentFuelTons, 0);
  assert.equal(hit.ship.state.fuelQuality, 'unknown');
  assert.equal(validateShipDocument(hit.ship).valid, true);
});

test('a fuel hit on a ship whose fuel is unrecorded releases nothing known', async () => {
  const ship = await scout();
  assert.equal(ship.state.currentFuelTons, null);
  const hit = hitAt(ship, 9);
  assert.equal(hit.fuelReleasedTons, null);
  assert.equal(hit.ship.state.currentFuelTons, null);
  assert.equal(releaseFuelFromHit(null).releasedTons, null);
});

test('Book 2 p.33: a hull hit decompresses once and further hits do nothing', async () => {
  let ship = await scout();
  ship = hitAt(ship, 7).ship;
  assert.equal(hullDecompressed(ship), true);
  const before = ship.state.damage.hull;
  ship = hitAt(ship, 7).ship;
  // The counter still rises — damage control can repair each — but the ship is
  // no more decompressed than it already was.
  assert.equal(ship.state.damage.hull, before + 1);
  assert.equal(hullDecompressed(ship), true);
});

test('Book 2 p.33: a turret hit incapacitates a turret', async () => {
  let ship = await scout();
  ship = armShipTurret(ship, { turretId: 'T-1', weapon: 'beam-laser' }).ship;
  assert.deepEqual(operationalTurrets(ship), ['T-1']);

  // Total 10 is a turret; the scout has one, so no random selection is needed.
  const hit = hitAt(ship, 10);
  ship = hit.ship;
  assert.equal(hit.turretId, 'T-1');
  assert.equal(turretOperational(ship, 'T-1'), false);
  assert.deepEqual(operationalTurrets(ship), []);

  // The weapons are still fitted; it is the turret that cannot function.
  assert.deepEqual(ship.state.armament.turrets[0].weapons, ['beam-laser']);
});

test('Book 2 p.34: computer hits are a -1 DM each on a throw of 1+', async () => {
  let ship = await scout();
  assert.deepEqual({ ...computerOperation(ship) }, { hits: 0, target: 1, dm: 0, permanentlyFailed: false });

  // Total 5 is the computer.
  ship = hitAt(ship, 5).ship;
  ship = hitAt(ship, 5).ship;
  ship = hitAt(ship, 5).ship;
  const operation = computerOperation(ship);
  assert.equal(operation.dm, -3);
  assert.equal(operation.permanentlyFailed, false);
  // Computer expertise is a positive DM on the throw.
  assert.equal(computerOperation(ship, { computerSkill: 2 }).dm, -1);

  for (let index = 3; index < COMPUTER_PERMANENT_FAILURE_HITS; index += 1) ship = hitAt(ship, 5).ship;
  assert.equal(computerOperation(ship).permanentlyFailed, true);
});

test('Book 2 p.30: Double Fire needs a power plant a letter above the maneuver drive', async () => {
  const ship = await scout();
  // The scout is A/A/A, so it could never double fire even undamaged.
  assert.equal(canDoubleFire(ship), false);
});

test('Book 2 p.35: damage control repairs one hit at a time', async () => {
  let ship = await scout();
  ship = hitAt(ship, 5).ship;
  ship = hitAt(ship, 5).ship;
  assert.equal(computerOperation(ship).hits, 2);

  ship = repairShipDamage(ship, { location: 'computer' });
  assert.equal(computerOperation(ship).hits, 1);
  ship = repairShipDamage(ship, { location: 'computer' });
  assert.equal(computerOperation(ship).hits, 0);
  assert.throws(() => repairShipDamage(ship, { location: 'computer' }), /no computer damage to repair/);
});

test('Book 2 p.35: a disabled turret can be brought back', async () => {
  let ship = await scout();
  ship = armShipTurret(ship, { turretId: 'T-1', weapon: 'beam-laser' }).ship;
  ship = hitAt(ship, 10).ship;
  assert.equal(turretOperational(ship, 'T-1'), false);

  ship = repairShipDamage(ship, { location: 'turret', turretId: 'T-1' });
  assert.equal(turretOperational(ship, 'T-1'), true);
  assert.throws(() => repairShipDamage(ship, { location: 'turret', turretId: 'T-1' }), /is not disabled/);
});

test('Book 2 p.31: a missile detonates for one die of hits, each located at -4', async () => {
  const ship = await scout();
  // One die of 3 hits, then three 2D throws which the -4 drops to the low rows.
  const result = applyMissileDetonation(ship, sequenceDice([3, 3, 3, 4, 4, 5, 5]));
  assert.equal(result.hitCount, 3);
  assert.equal(result.hits.length, 3);
  assert.equal(damageReport(result.ship).totalHits, 3);
});

test('a damaged ship still matches its canonical design and round-trips', async () => {
  let ship = await scout();
  ship = hitAt(ship, 5).ship;
  ship = hitAt(ship, 9).ship;

  // Damage is state: the design says what the ship was built as, and the
  // specifications still say exactly that.
  assert.equal(ship.specifications.drives.jump.rating, 2);
  assert.equal(validateShipDocument(ship).valid, true);

  const restored = importShipDocument(exportShipDocument(ship));
  assert.equal(computerOperation(restored).hits, 1);
  assert.equal(fuelDamage(restored).puncturedTons, 20);

  const cleared = clearShipDamage(restored);
  assert.equal(damageReport(cleared).undamaged, true);
});

test('ship document schema v4 migrates to v5 as an undamaged ship', async () => {
  const current = await scout();
  const legacy = structuredClone(current);
  legacy.schemaVersion = 4;
  delete legacy.state.damage;

  const migrated = importShipDocument(legacy);
  assert.equal(migrated.schemaVersion, CURRENT_SHIP_DOCUMENT_SCHEMA_VERSION);
  assert.equal(damageReport(migrated).undamaged, true);
});

test('a turret id that is not on the ship is refused in damage state', async () => {
  const ship = await scout();
  const tampered = structuredClone(ship);
  tampered.state.damage.turrets = ['T-7'];
  assert.throws(() => importShipDocument(tampered), /does not name a turret on this ship/);
});

// v0.57.0: the whole of Book 2 p.10 (1977), pinned. The 2000- and 3000-ton
// rows were one letter late until this release.
test('Book 2 p.10 maximum drive potential matches the 1977 printing, every cell', async () => {
  const { MAXIMUM_DRIVE_POTENTIAL } = await import('../index.js');
  const printed = {
    100: '2 4 6 - - - - - - - - - - - - - - - - - - - - -',
    200: '1 2 3 4 5 6 - - - - - - - - - - - - - - - - - -',
    400: '- - 1 2 2 3 3 4 4 5 5 6 6 - - - - - - - - - - -',
    600: '- - - 1 1 2 2 2 3 3 3 4 4 4 5 5 5 6 6 6 - - - -',
    800: '- - - - - 1 1 2 2 2 2 3 3 3 3 4 4 4 4 5 5 5 5 6',
    1000: '- - - - - - - 1 1 2 2 2 2 2 3 3 3 3 3 4 4 4 5 6',
    2000: '- - - - - - - - - 1 1 1 1 1 1 1 1 1 1 1 2 3 4 5',
    3000: '- - - - - - - - - - - - - - 1 1 1 1 1 1 1 2 3 4',
    4000: '- - - - - - - - - - - - - - - - - - - 1 1 1 2 3',
    5000: '- - - - - - - - - - - - - - - - - - - - - - 1 2'
  };
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('');
  for (const [hull, row] of Object.entries(printed)) {
    const expected = row.split(' ').map((cell) => (cell === '-' ? null : Number(cell)));
    assert.deepEqual(letters.map((letter) => MAXIMUM_DRIVE_POTENTIAL[hull][letter]), expected, `${hull}-ton row`);
  }
});

// ---------------------------------------------------------------------------
// Classic Traveller Book 2 pp.33-35 (1977): damage.
//
// Hits from laser fire, return fire and missile detonation are located with the
// hit location table and marked on the ship's data card. What each hit does is
// defined by the damage definitions on pp.33-34.
//
// Nothing here destroys a ship. Book 2 has no ship-destruction rule: a hull hit
// after the first does nothing, a drive reduced below A is destroyed while the
// hull persists, and the result of a fight is a disabled vessel rather than a
// dead one. That is deliberate and is why a pirate bothers to attack at all.
// ---------------------------------------------------------------------------

import { damagedDrivePotential, maximumDrivePotential, DRIVE_LETTERS } from './drive-potential.js';

// Book 2 p.34. Two dice per hit, read against the column for the target's kind.
export const HIT_LOCATION_TABLE = Object.freeze({
  starship: Object.freeze({
    2: 'power-plant', 3: 'maneuver-drive', 4: 'jump-drive', 5: 'computer',
    6: 'hull', 7: 'hull', 8: 'hold', 9: 'fuel',
    10: 'turret', 11: 'turret', 12: 'turret'
  }),
  'small-craft': Object.freeze({
    2: 'drive', 3: 'drive', 4: 'drive', 5: 'drive',
    6: 'drive', 7: 'cabin', 8: 'cabin', 9: 'cabin',
    10: 'weaponry', 11: 'weaponry', 12: 'weaponry'
  })
});

export const HIT_LOCATIONS = Object.freeze([
  'power-plant', 'maneuver-drive', 'jump-drive', 'computer', 'hull', 'hold', 'fuel', 'turret'
]);

// Book 2 p.31: missile detonation applies a DM of -4 to the hit type throw,
// which pushes missile damage toward the power plant and drives.
export const MISSILE_HIT_LOCATION_DM = -4;

// Book 2 p.33: "Each fuel hit punctures a fuel tank, and releases about 20 tons
// of fuel."
export const FUEL_TONS_LOST_PER_HIT = 20;
// "When sufficient fuel hits have been inflicted to account for 60% of fuel
// tankage, the vessel may not make a jump; when all fuel is accounted for, the
// vessel may not use its maneuver drive."
export const FUEL_LOSS_JUMP_THRESHOLD = 0.6;

// Book 2 p.34: the basic throw for a computer to operate is 1+, each hit is a
// -1 DM on that throw, and twelve hits is permanent.
export const COMPUTER_BASE_OPERATION_THROW = 1;
export const COMPUTER_PERMANENT_FAILURE_HITS = 12;

// Book 2 p.35: "Usually, a throw of 9+ will repair one hit of damage, with skill
// serving as a positive DM. One repair attempt may be made per ten minute turn."
export const DAMAGE_REPAIR_THROW = 9;

export function emptyDamageState() {
  return {
    powerPlant: 0,
    maneuverDrive: 0,
    jumpDrive: 0,
    computer: 0,
    hull: 0,
    hold: 0,
    fuel: 0,
    turrets: []
  };
}

function locationForTotal(total, kind) {
  const table = HIT_LOCATION_TABLE[kind];
  if (!table) throw new RangeError(`unknown hit location column: ${kind}`);
  return table[Math.max(2, Math.min(12, total))];
}

/**
 * Book 2 p.34. `dm` carries the missile detonation modifier where it applies.
 */
export function rollHitLocation(dice, { kind = 'starship', dm = 0 } = {}) {
  const roll = dice.roll2D6();
  const total = roll.total + dm;
  return Object.freeze({
    dice: Object.freeze([...roll.dice]),
    roll: roll.total,
    dm,
    total,
    location: locationForTotal(total, kind)
  });
}

const DRIVE_DAMAGE_KEYS = Object.freeze({
  'power-plant': 'powerPlant',
  'maneuver-drive': 'maneuverDrive',
  'jump-drive': 'jumpDrive'
});

const DRIVE_SPECIFICATION_KEYS = Object.freeze({
  powerPlant: 'powerPlant',
  maneuverDrive: 'maneuver',
  jumpDrive: 'jump'
});

/**
 * The current state of a drive or power plant after damage: its reduced letter,
 * the potential read from Book 2 p.11 for that letter, and whether it works.
 *
 * `which` is powerPlant, maneuverDrive or jumpDrive.
 */
export function currentDriveState(ship, which) {
  const specKey = DRIVE_SPECIFICATION_KEYS[which];
  if (!specKey) throw new RangeError(`unknown drive: ${which}`);
  const drive = ship.specifications.drives[specKey];
  const hits = ship.state.damage[which] ?? 0;
  const damaged = damagedDrivePotential(ship.specifications.hull.tons, drive.letter, hits);
  return Object.freeze({
    which,
    designLetter: drive.letter,
    designPotential: drive.rating,
    letter: damaged.letter,
    potential: damaged.potential,
    hits,
    destroyed: damaged.destroyed,
    functional: damaged.functional
  });
}

/**
 * Book 2 p.30's Double Fire program: it needs a power plant rated at least one
 * letter above the maneuver drive, "and which has not yet taken damage to
 * reduce the current letter rating to equal to or below the M-Drive letter".
 * Derived rather than stored, so a power plant hit removes it automatically.
 */
export function canDoubleFire(ship) {
  const powerPlant = currentDriveState(ship, 'powerPlant');
  const maneuver = currentDriveState(ship, 'maneuverDrive');
  if (!powerPlant.functional || powerPlant.letter === null || maneuver.letter === null) return false;
  return DRIVE_LETTERS.indexOf(powerPlant.letter) > DRIVE_LETTERS.indexOf(maneuver.letter);
}

/**
 * Book 2 pp.33-34. Two different things, kept apart:
 *
 * - The fuel a hit releases is gone. applyShipHit drains it from
 *   state.currentFuelTons at the moment of the hit, and repairing the hit does
 *   not bring it back.
 * - The p.33 thresholds ("sufficient fuel hits ... to account for 60% of fuel
 *   tankage") are read from the hits still outstanding, 20 tons of tankage
 *   each. Damage control patches a puncture and removes one of them.
 */
export function fuelDamage(ship) {
  const hits = ship.state.damage.fuel ?? 0;
  const capacityTons = ship.specifications.fuel.capacityTons;
  const puncturedTons = Math.min(capacityTons, hits * FUEL_TONS_LOST_PER_HIT);
  return Object.freeze({
    hits,
    puncturedTons,
    capacityTons,
    remainingCapacityTons: capacityTons - puncturedTons,
    jumpDisabled: puncturedTons >= capacityTons * FUEL_LOSS_JUMP_THRESHOLD,
    maneuverDisabled: puncturedTons >= capacityTons
  });
}

/**
 * Book 2 p.33: "Each fuel hit punctures a fuel tank, and releases about 20
 * tons of fuel." Returns the fuel after one hit and how much went. Unrecorded
 * fuel (null) stays unrecorded and nothing is known to have been released.
 */
export function releaseFuelFromHit(currentFuelTons) {
  if (!Number.isFinite(currentFuelTons)) return Object.freeze({ currentFuelTons: null, releasedTons: null });
  const releasedTons = Math.min(currentFuelTons, FUEL_TONS_LOST_PER_HIT);
  return Object.freeze({ currentFuelTons: currentFuelTons - releasedTons, releasedTons });
}

/**
 * Book 2 p.34. The throw to operate is made each time the computer is used,
 * generally once per phase. Computer expertise is a positive DM.
 */
export function computerOperation(ship, { computerSkill = 0 } = {}) {
  const hits = ship.state.damage.computer ?? 0;
  return Object.freeze({
    hits,
    target: COMPUTER_BASE_OPERATION_THROW,
    dm: -hits + Number(computerSkill || 0),
    permanentlyFailed: hits >= COMPUTER_PERMANENT_FAILURE_HITS
  });
}

export function turretOperational(ship, turretId) {
  return !(ship.state.damage.turrets ?? []).includes(turretId);
}

export function operationalTurrets(ship) {
  return Object.freeze(
    ship.specifications.armament.turrets
      .map((turret) => turret.id)
      .filter((id) => turretOperational(ship, id))
  );
}

/**
 * Book 2 p.33: "A hull hit decompresses the ship's hull interior. Further hull
 * hits have no effect." Whether that kills anyone depends on p.35's
 * decompression rule and is a personal-combat matter, not a ship one.
 */
export function hullDecompressed(ship) {
  return (ship.state.damage.hull ?? 0) > 0;
}

/**
 * Book 2 p.33: a turret hit incapacitates a turret, and "in cases where
 * multiple hits occur on a ship with more than one turret, dice randomly to
 * determine which turret or turrets are hit". Returns null when every turret is
 * already out, in which case the hit has nothing left to disable.
 */
export function selectTurretHit(ship, dice) {
  const live = operationalTurrets(ship);
  if (!live.length) return null;
  if (live.length === 1) return live[0];
  return live[Math.min(live.length - 1, Math.floor((dice.rollD6() - 1) / (6 / live.length)))];
}

/**
 * Applies one located hit and returns the new damage state plus a description
 * of what it did. Pure: takes and returns a damage object, so the ship document
 * module owns validation.
 */
export function applyHitToDamage(damage, location, { turretId = null } = {}) {
  const next = { ...damage, turrets: [...(damage.turrets ?? [])] };
  const key = DRIVE_DAMAGE_KEYS[location];
  if (key) {
    next[key] = (next[key] ?? 0) + 1;
    return next;
  }
  if (location === 'turret') {
    if (turretId && !next.turrets.includes(turretId)) next.turrets.push(turretId);
    return next;
  }
  if (location === 'computer' || location === 'hull' || location === 'hold' || location === 'fuel') {
    next[location] = (next[location] ?? 0) + 1;
    return next;
  }
  throw new RangeError(`unknown hit location: ${location}`);
}

/**
 * A summary for a data card or a panel: what still works.
 */
export function damageReport(ship) {
  const drives = ['powerPlant', 'maneuverDrive', 'jumpDrive'].map((which) => currentDriveState(ship, which));
  const fuel = fuelDamage(ship);
  const computer = computerOperation(ship);
  const disabledTurrets = (ship.state.damage.turrets ?? []).length;
  const totalHits = drives.reduce((sum, drive) => sum + drive.hits, 0)
    + computer.hits + fuel.hits + disabledTurrets
    + (ship.state.damage.hull ?? 0) + (ship.state.damage.hold ?? 0);
  return Object.freeze({
    drives: Object.freeze(drives),
    fuel,
    computer,
    decompressed: hullDecompressed(ship),
    holdHits: ship.state.damage.hold ?? 0,
    disabledTurrets,
    operationalTurrets: operationalTurrets(ship),
    totalHits,
    // Book 2 p.34: "A computer which is not operating effectively paralyses a
    // starship." A ship that cannot maneuver and cannot jump is adrift.
    adrift: !drives[1].functional || fuel.maneuverDisabled,
    canJump: drives[2].functional && !fuel.jumpDisabled && drives[0].functional,
    undamaged: totalHits === 0
  });
}

/**
 * Book 2 p.35 damage control. Drive damage which has completely destroyed a
 * drive or power plant cannot be repaired.
 */
export function repairableLocations(ship) {
  const locations = [];
  for (const [location, key] of Object.entries(DRIVE_DAMAGE_KEYS)) {
    const state = currentDriveState(ship, key);
    if (state.hits > 0 && !state.destroyed) locations.push(location);
  }
  for (const location of ['computer', 'hull', 'hold', 'fuel']) {
    if ((ship.state.damage[location] ?? 0) > 0) locations.push(location);
  }
  if ((ship.state.damage.turrets ?? []).length) locations.push('turret');
  return Object.freeze(locations);
}

export { maximumDrivePotential };

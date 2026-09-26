// ship-repair.js — Book 2 p.18 Repair Parts, applied to one ship's own
// actual fit rather than a generic design record.
//
// "Most items in a starship which malfunction can be temporarily repaired
// from the stock of emergency materials in the ship's Stores. Malfunctions
// usually occur in terms of a specific assembly (ship's computer, jump
// drive, etc), and the cost of the repair is based on the cost of the
// original assembly. After determining the cost of the assembly... roll two
// dice: this indicates the cost of replacement of the item in 10%
// increments; DMs: -2 if the repair installation will be made by ship's
// crew rather than a shipyard... a repair part cost which is indicated to
// be 0% is considered to be inconsequential." The per-component prices this
// needs — hull, drives by letter, computer model, turret mounts and
// weapons — already exist in components.js/design-costing.js, built to
// reproduce a standard design's own printed price from its parts; this just
// looks the same tables up against one ship's actual current fit instead of
// a design record.
//
// Rulings (Kurt):
// - Book 3 p.5: only a Class A starport has a shipyard capable of starship
//   construction; Class B's shipyard is explicitly limited to non-starship
//   construction. Class C has no shipyard but does have "reasonable repair
//   facilities". Shipyard-rate repair (no crew DM) is offered at A and C;
//   not at B, D, E or X.
// - Crew self-repair ("from the stock of emergency materials in the ship's
//   Stores") has no starport requirement in the text, so it's offered
//   everywhere, any time.
// - Book 2 prices no separate assembly for a hull breach, a holed cargo
//   bay, or a punctured fuel tank — hold and fuel damage are structurally
//   part of the hull, not equipment with their own listed price, so this
//   prices them against the hull's own cost.
// - p.18 prices "the assembly", not a hit point of it (unlike p.35's
//   damage control, which is explicitly "one hit... per turn"): one paid
//   repair clears a location's damage entirely, however many hits it
//   currently carries.

import {
  HULL_TYPES, POWER_PLANTS, MANEUVER_DRIVES, JUMP_DRIVES, COMPUTER_MODELS,
  getTurretMount, getTurretWeapon, repairShipDamage
} from '../vendor/classic-traveller-rules/index.js?v=r0.82.0';

export const SHIPYARD_STARPORTS = Object.freeze(['A', 'C']);
export const REPAIR_PARTS_CREW_DM = -2;

const DAMAGE_KEYS = Object.freeze({
  'power-plant': 'powerPlant', 'maneuver-drive': 'maneuverDrive', 'jump-drive': 'jumpDrive',
  computer: 'computer', hull: 'hull', hold: 'hold', fuel: 'fuel'
});
const DRIVE_SPEC_KEYS = Object.freeze({ 'power-plant': 'powerPlant', 'maneuver-drive': 'maneuver', 'jump-drive': 'jump' });
const DRIVE_TABLES = Object.freeze({ 'power-plant': POWER_PLANTS, 'maneuver-drive': MANEUVER_DRIVES, 'jump-drive': JUMP_DRIVES });

// Every currently-damaged location on a ship, including a destroyed drive —
// p.35's "cannot be repaired" is specific to in-combat damage control; a
// proper repair, crew or shipyard, is not limited that way.
export function shipDamagedLocations(ship) {
  const damage = ship.state?.damage ?? {};
  const locations = [];
  for (const [location, key] of Object.entries(DAMAGE_KEYS)) {
    if ((damage[key] ?? 0) > 0) locations.push({ location, turretId: null });
  }
  for (const turretId of damage.turrets ?? []) locations.push({ location: 'turret', turretId });
  return locations;
}

// "The cost of the original assembly" for one damaged location, read off
// this ship's own specifications (which drive letters, which computer
// model, which weapons are actually fitted in which turret) against the
// Book 2 component tables.
export function assemblyCostCr({ specifications, state }, { location, turretId }) {
  if (location === 'turret') {
    const turret = specifications.armament.turrets.find((entry) => entry.id === turretId);
    if (!turret) throw new RangeError(`no turret ${turretId} on this ship`);
    const fitted = (state.armament?.turrets ?? []).find((entry) => entry.id === turretId)?.weapons ?? [];
    const mcr = getTurretMount(turret.mount).priceMCr + fitted.reduce((sum, key) => sum + getTurretWeapon(key).priceMCr, 0);
    return Math.round(mcr * 1_000_000);
  }
  if (DRIVE_TABLES[location]) {
    const letter = specifications.drives[DRIVE_SPEC_KEYS[location]].letter;
    return Math.round(DRIVE_TABLES[location][letter].priceMCr * 1_000_000);
  }
  if (location === 'computer') return Math.round(COMPUTER_MODELS[specifications.computer.model].priceMCr * 1_000_000);
  return Math.round(HULL_TYPES[specifications.hull.tons].priceMCr * 1_000_000);
}

export function rollRepairCost(dice, assemblyCr, { byCrew }) {
  const roll = dice.roll2D6();
  const dm = byCrew ? REPAIR_PARTS_CREW_DM : 0;
  const total = roll.total + dm;
  const percent = Math.max(0, total) * 10;
  const costCr = Math.round(assemblyCr * percent / 100);
  return { roll: roll.total, dice: [...roll.dice], dm, total, percent, costCr };
}

export function fullyRepairLocation(ship, { location, turretId }) {
  if (location === 'turret') return repairShipDamage(ship, { location, turretId });
  let next = ship;
  const key = DAMAGE_KEYS[location];
  while ((next.state.damage[key] ?? 0) > 0) next = repairShipDamage(next, { location });
  return next;
}

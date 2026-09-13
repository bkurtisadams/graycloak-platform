// ---------------------------------------------------------------------------
// Classic Traveller Book 2 pp.10-18 (1977): starship components.
//
// Prices are in millions of credits and masses in tons throughout, as printed.
// These tables exist so a standard design's printed price can be reproduced
// from its parts rather than trusted, and so weapons — which Book 2 p.16 says
// are "never included in ship plans and specifications, and must be acquired
// and installed after delivery" — can be bought and fitted in play.
// ---------------------------------------------------------------------------

import { DRIVE_LETTERS } from './drive-potential.js';

function freezeTable(entries) {
  return Object.freeze(Object.fromEntries(entries.map(([key, value]) => [key, Object.freeze(value)])));
}

// Book 2 p.10. Main and engine are the hull's fixed division; only drives and
// power plants may go in the engineering section.
export const HULL_TYPES = freezeTable([
  [100, { tons: 100, mainTons: 85, engineTons: 15, priceMCr: 2, buildMonths: 10 }],
  [200, { tons: 200, mainTons: 185, engineTons: 15, priceMCr: 8, buildMonths: 12 }],
  [400, { tons: 400, mainTons: 350, engineTons: 50, priceMCr: 16, buildMonths: 16 }],
  [600, { tons: 600, mainTons: 520, engineTons: 80, priceMCr: 48, buildMonths: 24 }],
  [800, { tons: 800, mainTons: 635, engineTons: 165, priceMCr: 80, buildMonths: 28 }],
  [1000, { tons: 1000, mainTons: 835, engineTons: 165, priceMCr: 100, buildMonths: 30 }]
]);

export const CUSTOM_HULL_PRICE_PER_TON_CR = 100000;
export const CUSTOM_HULL_MINIMUM_PRICE_CR = 20000000;
export const CUSTOM_HULL_BUILD_MONTHS = 36;
export const MAXIMUM_CUSTOM_HULL_TONS = 5000;

// Book 2 p.11. Power plant, maneuver drive and jump drive all run A..Z, each
// stepping by a fixed increment.
function drivesTable(massStart, massStep, priceStart, priceStep) {
  return freezeTable(DRIVE_LETTERS.map((letter, index) => [letter, {
    letter,
    tons: massStart + massStep * index,
    priceMCr: priceStart + priceStep * index
  }]));
}

export const POWER_PLANTS = drivesTable(4, 3, 8, 8);
export const MANEUVER_DRIVES = drivesTable(1, 2, 4, 4);
export const JUMP_DRIVES = drivesTable(10, 5, 10, 10);

// Book 2 p.14. Storage of null is the table's dash: a bis model has no storage
// at all, so it can hold nothing in reserve to cycle into the CPU during the
// reprogramming phase.
export const COMPUTER_MODELS = freezeTable([
  ['1', { model: '1', priceMCr: 2, tons: 1, cpu: 2, storage: 4 }],
  ['1bis', { model: '1bis', priceMCr: 5, tons: 1, cpu: 4, storage: null }],
  ['2', { model: '2', priceMCr: 9, tons: 2, cpu: 3, storage: 6 }],
  ['2bis', { model: '2bis', priceMCr: 12, tons: 2, cpu: 6, storage: null }],
  ['3', { model: '3', priceMCr: 18, tons: 3, cpu: 5, storage: 9 }],
  ['4', { model: '4', priceMCr: 30, tons: 4, cpu: 8, storage: 15 }],
  ['5', { model: '5', priceMCr: 45, tons: 5, cpu: 12, storage: 25 }],
  ['6', { model: '6', priceMCr: 55, tons: 5, cpu: 15, storage: 35 }],
  ['7', { model: '7', priceMCr: 60, tons: 5, cpu: 20, storage: 50 }]
]);

// Book 2 pp.13-15, main compartment fittings.
export const BRIDGE_TONS = 20;
export const BRIDGE_PRICE_MCR_PER_100_TONS = 0.5;
export const STATEROOM_TONS = 4;
export const STATEROOM_PRICE_MCR = 0.5;
export const LOW_BERTH_TONS = 0.5;
export const LOW_BERTH_PRICE_MCR = 0.05;
export const STREAMLINING_PRICE_MCR_PER_100_TONS = 1;
export const NAVAL_ARCHITECT_FEE_RATE = 0.01;
export const STANDARD_DESIGN_PRICE_REDUCTION = 0.1;

// Book 2 p.15. One hardpoint per 100 tons of hull; one turret per hardpoint;
// one ton of fire control per installed turret.
export const HARDPOINT_PRICE_MCR = 0.1;
export const HARDPOINT_TONS_PER_HULL_TON = 1 / 100;
export const FIRE_CONTROL_TONS_PER_TURRET = 1;
export const USED_TURRET_RESALE_RATE = 0.25;

export const TURRET_MOUNTS = freezeTable([
  ['single', { mount: 'single', weapons: 1, priceMCr: 0.2 }],
  ['double', { mount: 'double', weapons: 2, priceMCr: 0.5 }],
  ['triple', { mount: 'triple', weapons: 3, priceMCr: 1 }]
]);

// Book 2 p.16. Weapons are bought and installed after delivery, never in the
// plans and specifications — which is why every standard design mounts empty
// turrets.
//
// `code` is the letter used on Book 2 p.24's data card: B beam laser, P pulse
// laser, M missile launcher, S sandcaster.
export const TURRET_WEAPONS = freezeTable([
  ['beam-laser', {
    key: 'beam-laser', code: 'B', label: 'Beam Laser', priceMCr: 1,
    fires: 'laser', attackDM: 0,
    notes: 'Continuous beam. More effective than the pulse laser, which takes a -1.'
  }],
  ['pulse-laser', {
    key: 'pulse-laser', code: 'P', label: 'Pulse Laser', priceMCr: 0.5,
    fires: 'laser', attackDM: -1,
    notes: 'Book 2 p.30 laser fire DMs: pulse laser -1.'
  }],
  ['missile-launcher', {
    key: 'missile-launcher', code: 'M', label: 'Missile Launcher', priceMCr: 0.75,
    fires: 'ordnance', attackDM: 0,
    notes: 'Launch rack. Holds three rounds; reloading costs the gunner a turn.'
  }],
  ['sandcaster', {
    key: 'sandcaster', code: 'S', label: 'Sandcaster', priceMCr: 0.25,
    fires: 'ordnance', attackDM: 0,
    notes: 'Dispenses a canister of sand. Book 2 p.30: -3 per half inch of cloud.'
  }]
]);

// Book 2 p.31: "Each launcher (sand or missile) has an inherent capacity for
// three missiles or canisters."
export const ROUNDS_PER_LAUNCHER = 3;
export const RELOAD_TURNS_PER_LAUNCHER = 1;

// Book 2 p.18, expendables.
export const MISSILE_PRICE_CR = 5000;
export const SAND_CANISTER_PRICE_CR = 400;
export const SAND_CANISTER_MASS_KG = 50;

// Book 2 p.16, ship's vehicles.
export const SHIP_VEHICLES = freezeTable([
  ['atv', { key: 'atv', label: 'ATV', tons: 10, priceMCr: 3 }],
  ['air-raft', { key: 'air-raft', label: 'Air/Raft', tons: 4, priceMCr: 6 }],
  ['life-boat', { key: 'life-boat', label: 'Life Boat', tons: 20, priceMCr: 14 }],
  ['ships-boat', { key: 'ships-boat', label: "Ship's Boat", tons: 30, priceMCr: 16 }],
  ['pinnace', { key: 'pinnace', label: 'Pinnace', tons: 40, priceMCr: 20 }],
  ['cutter', { key: 'cutter', label: 'Cutter', tons: 50, priceMCr: 28 }],
  ['shuttle', { key: 'shuttle', label: 'Shuttle', tons: 95, priceMCr: 33 }]
]);

// ---------------------------------------------------------------------------
// Book 2 p.12: COMPUTER SOFTWARE LIST.
//
// `space` is the size the program occupies in CPU or storage. All programs in
// the CPU run simultaneously; storage holds programs in readiness and cycles
// them in during the reprogramming phase. That is the whole tactical layer: a
// Model/1 has a CPU of 2, so a ship returning fire spends both points on Target
// and Return Fire and gets no Predict benefit at all.
// ---------------------------------------------------------------------------

export const PROGRAM_CLASSES = Object.freeze(['offensive', 'defensive', 'routine']);

export const COMPUTER_PROGRAMS = freezeTable([
  // Offensive
  ['predict-1', { key: 'predict-1', label: 'Predict 1', class: 'offensive', space: 1, priceMCr: 2, attackDM: 1 }],
  ['predict-2', { key: 'predict-2', label: 'Predict 2', class: 'offensive', space: 2, priceMCr: 4, attackDM: 2 }],
  ['predict-3', { key: 'predict-3', label: 'Predict 3', class: 'offensive', space: 1, priceMCr: 6, attackDM: 2 }],
  ['predict-4', { key: 'predict-4', label: 'Predict 4', class: 'offensive', space: 3, priceMCr: 8, attackDM: 3 }],
  ['predict-5', { key: 'predict-5', label: 'Predict 5', class: 'offensive', space: 2, priceMCr: 10, attackDM: 3 }],
  ['gunner-interact', {
    key: 'gunner-interact', label: 'Gunner Interact', class: 'offensive', space: 1, priceMCr: 1,
    notes: "Adds the turret gunner's expertise as an attack DM."
  }],
  ['target', {
    key: 'target', label: 'Target', class: 'offensive', space: 1, priceMCr: 1,
    notes: 'Required for all laser fire and all launches. Not required for anti-missile fire.'
  }],
  ['selective-1', { key: 'selective-1', label: 'Selective 1', class: 'offensive', space: 1, priceMCr: 0.5, attackDM: -2 }],
  ['selective-2', { key: 'selective-2', label: 'Selective 2', class: 'offensive', space: 2, priceMCr: 0.8, attackDM: -1 }],
  ['selective-3', { key: 'selective-3', label: 'Selective 3', class: 'offensive', space: 1, priceMCr: 1, attackDM: 0 }],
  ['multi-target-2', { key: 'multi-target-2', label: 'Multi-Target 2', class: 'offensive', space: 1, priceMCr: 1, targets: 2 }],
  ['multi-target-3', { key: 'multi-target-3', label: 'Multi-Target 3', class: 'offensive', space: 2, priceMCr: 2, targets: 3 }],
  ['multi-target-4', { key: 'multi-target-4', label: 'Multi-Target 4', class: 'offensive', space: 4, priceMCr: 3, targets: 4 }],
  ['launch', {
    key: 'launch', label: 'Launch', class: 'offensive', space: 1, priceMCr: 2,
    notes: 'Required to launch missiles or fire sand. Target is also required.'
  }],

  // Defensive. Maneuver/Evade DMs are a fraction of pilot expertise, so they
  // are carried as a rate applied to the pilot's level rather than a constant.
  ['maneuver-evade-1', { key: 'maneuver-evade-1', label: 'Maneuver/Evade 1', class: 'defensive', space: 1, priceMCr: 1, pilotExpertiseRate: 0.25, servesAsManeuver: true }],
  ['maneuver-evade-2', { key: 'maneuver-evade-2', label: 'Maneuver/Evade 2', class: 'defensive', space: 2, priceMCr: 2, pilotExpertiseRate: 0.5, servesAsManeuver: true }],
  ['maneuver-evade-3', { key: 'maneuver-evade-3', label: 'Maneuver/Evade 3', class: 'defensive', space: 3, priceMCr: 3, pilotExpertiseRate: 0.75, servesAsManeuver: true }],
  ['maneuver-evade-4', { key: 'maneuver-evade-4', label: 'Maneuver/Evade 4', class: 'defensive', space: 4, priceMCr: 4, pilotExpertiseRate: 1, servesAsManeuver: true }],
  ['maneuver-evade-5', { key: 'maneuver-evade-5', label: 'Maneuver/Evade 5', class: 'defensive', space: 2, priceMCr: 5, pilotExpertiseRate: 1, servesAsManeuver: true }],
  ['maneuver-evade-6', { key: 'maneuver-evade-6', label: 'Maneuver/Evade 6', class: 'defensive', space: 3, priceMCr: 6, defenseDM: -5, servesAsManeuver: true }],
  ['auto-evade', { key: 'auto-evade', label: 'Auto/Evade', class: 'defensive', space: 1, priceMCr: 0.5, defenseDM: -2 }],
  ['return-fire', {
    key: 'return-fire', label: 'Return Fire', class: 'defensive', space: 1, priceMCr: 0.5,
    notes: 'Fires at a ship which fired in the immediately previous phase. Target also required.'
  }],
  ['anti-missile', {
    key: 'anti-missile', label: 'Anti-Missile', class: 'defensive', space: 2, priceMCr: 1,
    notes: 'Laser fire at contacting missiles. Target and Multi-Target are not required.'
  }],
  ['ecm', {
    key: 'ecm', label: 'ECM', class: 'defensive', space: 3, priceMCr: 4,
    notes: 'Destroys contacting missiles on 7+ in the laser return fire phase.'
  }],

  // Routine
  ['maneuver', { key: 'maneuver', label: 'Maneuver', class: 'routine', space: 1, priceMCr: 0.1, notes: 'Required for use of the maneuver drive.' }],
  ['jump-1', { key: 'jump-1', label: 'Jump 1', class: 'routine', space: 1, priceMCr: 0.1, jump: 1 }],
  ['jump-2', { key: 'jump-2', label: 'Jump 2', class: 'routine', space: 2, priceMCr: 0.3, jump: 2 }],
  ['jump-3', { key: 'jump-3', label: 'Jump 3', class: 'routine', space: 2, priceMCr: 0.4, jump: 3 }],
  ['jump-4', { key: 'jump-4', label: 'Jump 4', class: 'routine', space: 2, priceMCr: 0.5, jump: 4 }],
  ['jump-5', { key: 'jump-5', label: 'Jump 5', class: 'routine', space: 2, priceMCr: 0.6, jump: 5 }],
  ['jump-6', { key: 'jump-6', label: 'Jump 6', class: 'routine', space: 2, priceMCr: 0.7, jump: 6 }],
  ['library', { key: 'library', label: 'Library', class: 'routine', space: 1, priceMCr: 0.3 }],
  ['navigation', { key: 'navigation', label: 'Navigation', class: 'routine', space: 1, priceMCr: 0.4 }],
  ['generate', { key: 'generate', label: 'Generate', class: 'routine', space: 2, priceMCr: 0.8 }],
  ['anti-hijack', { key: 'anti-hijack', label: 'Anti-Hijack', class: 'routine', space: 1, priceMCr: 0.1 }]
]);

// "The basic software package provided with new ships consists of a credit of
// CR 2 million, applicable to any programs on the above list."
export const BASIC_SOFTWARE_PACKAGE_CREDIT_MCR = 2;

export function getComputerModel(model) {
  const entry = COMPUTER_MODELS[String(model ?? '').trim().toLowerCase().replace(/\s+/g, '')];
  if (!entry) throw new RangeError(`unknown computer model: ${model}`);
  return entry;
}

export function getTurretWeapon(key) {
  const entry = TURRET_WEAPONS[String(key ?? '').trim().toLowerCase()];
  if (!entry) throw new RangeError(`unknown turret weapon: ${key}`);
  return entry;
}

export function getTurretMount(mount) {
  const entry = TURRET_MOUNTS[String(mount ?? '').trim().toLowerCase()];
  if (!entry) throw new RangeError(`unknown turret mount: ${mount}`);
  return entry;
}

export function getComputerProgram(key) {
  const entry = COMPUTER_PROGRAMS[String(key ?? '').trim().toLowerCase()];
  if (!entry) throw new RangeError(`unknown computer program: ${key}`);
  return entry;
}

/**
 * Book 2 p.15: hulls accommodate one hardpoint per 100 tons of displacement.
 */
export function maximumHardpoints(hullTons) {
  return Math.floor(Number(hullTons) * HARDPOINT_TONS_PER_HULL_TON);
}

/**
 * Book 2 p.31: a gunner reloading a launcher cannot fire other weaponry in the
 * turret that turn, and each launcher takes its own turn.
 */
export function reloadTurnsFor(launcherCount) {
  const count = Math.max(0, Math.floor(Number(launcherCount) || 0));
  return count * RELOAD_TURNS_PER_LAUNCHER;
}

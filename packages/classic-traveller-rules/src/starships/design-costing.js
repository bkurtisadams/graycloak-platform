// ---------------------------------------------------------------------------
// Classic Traveller Book 2 pp.9-21 (1977): costing a design from its parts.
//
// Book 2 p.9: "The actual cash price of a ship is computed from the sum of the
// costs of its components. Standard design ships are granted a 10% reduction in
// price because of their ease of construction... and this reduction is
// contained in the price stated for each in the standard ship rules section."
//
// This exists to check printed prices rather than to replace them. The stored
// designs keep their printed figures; costing is how a transcription error gets
// caught, and it is what found the Type S carrying a Model/1 bis.
// ---------------------------------------------------------------------------

import {
  HULL_TYPES,
  POWER_PLANTS,
  MANEUVER_DRIVES,
  JUMP_DRIVES,
  BRIDGE_TONS,
  BRIDGE_PRICE_MCR_PER_100_TONS,
  STATEROOM_TONS,
  STATEROOM_PRICE_MCR,
  LOW_BERTH_TONS,
  LOW_BERTH_PRICE_MCR,
  STREAMLINING_PRICE_MCR_PER_100_TONS,
  HARDPOINT_PRICE_MCR,
  FIRE_CONTROL_TONS_PER_TURRET,
  STANDARD_DESIGN_PRICE_REDUCTION,
  SHIP_VEHICLES,
  getComputerModel,
  getTurretMount,
  getTurretWeapon
} from './components.js';

function round(value) {
  return Number(Number(value).toFixed(6));
}

function vehicleEntry(vehicle) {
  const byName = Object.values(SHIP_VEHICLES).find(
    (entry) => entry.label.toLowerCase() === String(vehicle?.name ?? '').trim().toLowerCase()
  );
  if (!byName) throw new RangeError(`unknown ship's vehicle: ${vehicle?.name}`);
  return byName;
}

/**
 * Costs a standard design from the Book 2 component tables. Returns the itemised
 * components, the total before the standard-design reduction, and the price
 * after it.
 */
export function costDesign(design) {
  const hull = HULL_TYPES[design.hull.tons];
  if (!hull) throw new RangeError(`no standard hull of ${design.hull.tons} tons`);
  const hullHundreds = design.hull.tons / 100;

  const items = [];
  const add = (label, priceMCr) => { items.push(Object.freeze({ label, priceMCr: round(priceMCr) })); };

  add(`Hull ${design.hull.tons}`, hull.priceMCr);
  add(`Jump drive-${design.drives.jump.letter}`, JUMP_DRIVES[design.drives.jump.letter].priceMCr);
  add(`Maneuver drive-${design.drives.maneuver.letter}`, MANEUVER_DRIVES[design.drives.maneuver.letter].priceMCr);
  add(`Power plant-${design.drives.powerPlant.letter}`, POWER_PLANTS[design.drives.powerPlant.letter].priceMCr);
  add('Bridge', BRIDGE_PRICE_MCR_PER_100_TONS * hullHundreds);
  add(`Computer Model/${design.computer.model}`, getComputerModel(design.computer.model).priceMCr);
  if (design.accommodations.staterooms) {
    add(`Staterooms x${design.accommodations.staterooms}`, STATEROOM_PRICE_MCR * design.accommodations.staterooms);
  }
  if (design.accommodations.lowBerths) {
    add(`Low berths x${design.accommodations.lowBerths}`, LOW_BERTH_PRICE_MCR * design.accommodations.lowBerths);
  }
  if (design.armament.hardpoints) {
    add(`Hardpoints x${design.armament.hardpoints}`, HARDPOINT_PRICE_MCR * design.armament.hardpoints);
  }
  for (const turret of design.armament.turrets) {
    add(`${turret.mount} turret ${turret.id}`, getTurretMount(turret.mount).priceMCr);
    // Book 2 p.16: weapons are never in the plans and specifications, so a
    // design's turrets are empty and contribute no weapon cost. Anything a
    // player has since fitted is costed here all the same.
    for (const weapon of turret.weapons ?? []) {
      add(getTurretWeapon(weapon).label, getTurretWeapon(weapon).priceMCr);
    }
  }
  if (design.hull.streamlined) {
    add('Streamlining', STREAMLINING_PRICE_MCR_PER_100_TONS * hullHundreds);
  }
  for (const vehicle of design.vehicles ?? []) {
    add(vehicle.name, vehicleEntry(vehicle).priceMCr);
  }

  const componentsMCr = round(items.reduce((sum, item) => sum + item.priceMCr, 0));
  const standardDesignMCr = round(componentsMCr * (1 - STANDARD_DESIGN_PRICE_REDUCTION));
  return Object.freeze({
    items: Object.freeze(items),
    componentsMCr,
    standardDesignMCr,
    printedMCr: design.economics.newCostMCr,
    matchesPrinted: standardDesignMCr === design.economics.newCostMCr
  });
}

/**
 * Book 2 p.10: the engineering section holds only drives and power plants, and
 * everything else lives in the main compartment. Neither may be overspent.
 */
export function tonnageBudget(design) {
  const hull = HULL_TYPES[design.hull.tons];
  if (!hull) throw new RangeError(`no standard hull of ${design.hull.tons} tons`);

  const engineeringTons = JUMP_DRIVES[design.drives.jump.letter].tons
    + MANEUVER_DRIVES[design.drives.maneuver.letter].tons
    + POWER_PLANTS[design.drives.powerPlant.letter].tons;

  const vehicleTons = (design.vehicles ?? []).reduce((sum, vehicle) => sum + vehicleEntry(vehicle).tons, 0);
  const fireControlTons = design.armament.turrets.length * FIRE_CONTROL_TONS_PER_TURRET;
  const mainTons = BRIDGE_TONS
    + getComputerModel(design.computer.model).tons
    + STATEROOM_TONS * design.accommodations.staterooms
    + LOW_BERTH_TONS * design.accommodations.lowBerths
    + design.fuel.capacityTons
    + design.cargo.capacityTons
    + vehicleTons
    + fireControlTons;

  return Object.freeze({
    engineeringTons: round(engineeringTons),
    engineeringCapacityTons: hull.engineTons,
    engineeringSpareTons: round(hull.engineTons - engineeringTons),
    mainTons: round(mainTons),
    mainCapacityTons: hull.mainTons,
    mainSpareTons: round(hull.mainTons - mainTons),
    fits: engineeringTons <= hull.engineTons && mainTons <= hull.mainTons
  });
}

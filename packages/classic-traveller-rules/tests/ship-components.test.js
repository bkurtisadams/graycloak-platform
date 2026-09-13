import test from 'node:test';
import assert from 'node:assert/strict';

import {
  STANDARD_SHIP_DESIGN_KEYS,
  getStandardShipDesign,
  costDesign,
  tonnageBudget,
  maximumDrivePotential,
  damagedDrivePotential,
  drivePotentialHullSize,
  COMPUTER_MODELS,
  COMPUTER_PROGRAMS,
  TURRET_WEAPONS,
  TURRET_MOUNTS,
  HULL_TYPES,
  ROUNDS_PER_LAUNCHER,
  MISSILE_PRICE_CR,
  SAND_CANISTER_PRICE_CR,
  BASIC_SOFTWARE_PACKAGE_CREDIT_MCR,
  maximumHardpoints,
  getComputerProgram
} from '../index.js';

// ---------------------------------------------------------------------------
// Book 2 p.11: maximum drive potential
// ---------------------------------------------------------------------------

test('Book 2 p.11: the maximum drive potential table reproduces every standard design rating', () => {
  for (const key of STANDARD_SHIP_DESIGN_KEYS) {
    const design = getStandardShipDesign(key);
    const tons = design.hull.tons;
    assert.equal(maximumDrivePotential(tons, design.drives.jump.letter), design.drives.jump.rating, `${key} jump`);
    assert.equal(maximumDrivePotential(tons, design.drives.maneuver.letter), design.drives.maneuver.rating, `${key} maneuver`);
    assert.equal(maximumDrivePotential(tons, design.drives.powerPlant.letter), design.drives.powerPlant.rating, `${key} power plant`);
  }
});

test('Book 2 p.11: dashes mark combinations that do not function', () => {
  assert.equal(maximumDrivePotential(100, 'D'), null);
  assert.equal(maximumDrivePotential(400, 'B'), null);
  assert.equal(maximumDrivePotential(800, 'E'), null);
  // The corners of the table.
  assert.equal(maximumDrivePotential(100, 'A'), 2);
  assert.equal(maximumDrivePotential(5000, 'Z'), 2);
  assert.equal(maximumDrivePotential(1000, 'Z'), 6);
});

test('Book 2 p.10: a custom hull rounds up to the next row', () => {
  assert.equal(drivePotentialHullSize(150), 200);
  assert.equal(drivePotentialHullSize(400), 400);
  assert.equal(drivePotentialHullSize(4001), 5000);
  assert.throws(() => drivePotentialHullSize(6000), /largest is 5000/);
});

test('Book 2 p.33: a drive hit reduces the letter by one and the potential is reread', () => {
  // A 100-ton scout runs A/A/A, so one hit destroys the fitting outright:
  // p.33 says a drive reduced to less than A must be replaced, not repaired.
  const scout = damagedDrivePotential(100, 'A', 1);
  assert.equal(scout.destroyed, true);
  assert.equal(scout.functional, false);
  assert.equal(scout.potential, null);

  // A 400-ton Type R drops C to B, which is a dash on that hull: not destroyed
  // by the letter rule, but it cannot function either.
  const merchant = damagedDrivePotential(400, 'C', 1);
  assert.equal(merchant.letter, 'B');
  assert.equal(merchant.destroyed, false);
  assert.equal(merchant.functional, false);

  // The cruiser is the only standard design that degrades gracefully.
  assert.deepEqual(
    { letter: damagedDrivePotential(800, 'M', 1).letter, potential: damagedDrivePotential(800, 'M', 1).potential },
    { letter: 'L', potential: 2 }
  );
  // M down four letters is H, still 2 on an 800 hull; it takes six hits to
  // reach 1 and twelve to destroy the drive outright.
  assert.equal(damagedDrivePotential(800, 'M', 4).letter, 'H');
  assert.equal(damagedDrivePotential(800, 'M', 4).potential, 2);
  assert.equal(damagedDrivePotential(800, 'M', 6).potential, 1);
  assert.equal(damagedDrivePotential(800, 'M', 12).destroyed, true);
  assert.equal(damagedDrivePotential(800, 'M', 0).potential, 3);
});

// ---------------------------------------------------------------------------
// Book 2 pp.9-21: costing the standard designs from their parts
// ---------------------------------------------------------------------------

// Book 2 p.20's printed CR 219,870,000 for the Type M is MCr 18 above its
// components before the standard-design reduction — exactly the price of the
// Model/3 it carries, as though the computer were counted twice. Flagged for
// the printed books; the printed price is kept and nothing depends on it.
const KNOWN_PRICE_EXCEPTIONS = new Set(['type-m-subsidized-merchant']);

test('Book 2: every standard design price reproduces from the component tables', () => {
  for (const key of STANDARD_SHIP_DESIGN_KEYS) {
    const costed = costDesign(getStandardShipDesign(key));
    if (KNOWN_PRICE_EXCEPTIONS.has(key)) {
      assert.equal(costed.matchesPrinted, false, `${key} is recorded as a known exception but now matches`);
      continue;
    }
    assert.equal(costed.matchesPrinted, true, `${key}: components give ${costed.standardDesignMCr}, printed ${costed.printedMCr}`);
  }
});

test('Book 2: the Type M discrepancy is exactly the price of its computer', () => {
  const design = getStandardShipDesign('type-m-subsidized-merchant');
  const costed = costDesign(design);
  const impliedComponentsMCr = Number((costed.printedMCr / 0.9).toFixed(2));
  assert.equal(Number((impliedComponentsMCr - costed.componentsMCr).toFixed(2)), 18);
  assert.equal(COMPUTER_MODELS['3'].priceMCr, 18);
});

test('Book 2 p.10: every standard design fits its hull, section by section', () => {
  for (const key of STANDARD_SHIP_DESIGN_KEYS) {
    const budget = tonnageBudget(getStandardShipDesign(key));
    assert.equal(budget.fits, true, `${key} overruns its hull`);
    assert.ok(budget.engineeringSpareTons >= 0, `${key} engineering section`);
    assert.ok(budget.mainSpareTons >= 0, `${key} main compartment`);
  }
});

test('Book 2 p.19: the Free Trader holds two tons back for fire control', () => {
  const budget = tonnageBudget(getStandardShipDesign('type-a-free-trader'));
  assert.equal(budget.mainSpareTons, 2);
});

test('Book 2 p.16: standard designs are delivered with empty turrets', () => {
  for (const key of STANDARD_SHIP_DESIGN_KEYS) {
    for (const turret of getStandardShipDesign(key).armament.turrets) {
      assert.deepEqual(turret.weapons, [], `${key} ${turret.id} ships armed`);
    }
  }
  // The cruiser is the only standard design that arrives with turrets fitted.
  assert.equal(getStandardShipDesign('type-c-cruiser').armament.turrets.length, 8);
  assert.equal(getStandardShipDesign('type-a-free-trader').armament.turrets.length, 0);
});

test('Book 2 p.15: hardpoints are one per 100 tons of hull', () => {
  for (const key of STANDARD_SHIP_DESIGN_KEYS) {
    const design = getStandardShipDesign(key);
    assert.ok(design.armament.hardpoints <= maximumHardpoints(design.hull.tons), `${key} overruns its hardpoints`);
  }
  assert.equal(maximumHardpoints(100), 1);
  assert.equal(maximumHardpoints(800), 8);
});

// ---------------------------------------------------------------------------
// Book 2 pp.12-16: computers, programs and weapons
// ---------------------------------------------------------------------------

test('Book 2 p.14: bis computers trade storage for CPU', () => {
  assert.deepEqual(
    { cpu: COMPUTER_MODELS['1'].cpu, storage: COMPUTER_MODELS['1'].storage, priceMCr: COMPUTER_MODELS['1'].priceMCr },
    { cpu: 2, storage: 4, priceMCr: 2 }
  );
  // A dash in the storage column: a bis model has nothing to cycle into the CPU
  // during the reprogramming phase.
  assert.equal(COMPUTER_MODELS['1bis'].storage, null);
  assert.equal(COMPUTER_MODELS['1bis'].cpu, 4);
  assert.equal(COMPUTER_MODELS['7'].cpu, 20);
});

test("Book 2 p.24: the sample Type S data card's programs match the software list sizes", () => {
  // Suleiman (Type S) carries Target 1, Return Fire 1, Launch 1, Predict-1 1,
  // Navigation 1, Auto/Evade 1, Anti-Missile 2, Jump-1 1, Jump-2 2, Library 1.
  const card = {
    target: 1, 'return-fire': 1, launch: 1, 'predict-1': 1, navigation: 1,
    'auto-evade': 1, 'anti-missile': 2, 'jump-1': 1, 'jump-2': 2, library: 1
  };
  for (const [key, space] of Object.entries(card)) {
    assert.equal(getComputerProgram(key).space, space, key);
  }
  // Those total 12 points against a Model/1's 2 CPU and 4 storage, which is the
  // point: programs carried aboard are not the same as programs loaded.
  const carried = Object.values(card).reduce((sum, space) => sum + space, 0);
  assert.equal(carried, 12);
  assert.ok(carried > COMPUTER_MODELS['1'].cpu + COMPUTER_MODELS['1'].storage);
});

test('Book 2 p.31: a Model/1 returning fire has no CPU left for Predict', () => {
  const cpu = COMPUTER_MODELS['1'].cpu;
  const returnFire = getComputerProgram('target').space + getComputerProgram('return-fire').space;
  assert.equal(returnFire, cpu);
  assert.ok(returnFire + getComputerProgram('predict-1').space > cpu);
  // In a laser fire phase the same CPU affords Target plus exactly one of them.
  assert.equal(getComputerProgram('target').space + getComputerProgram('gunner-interact').space, cpu);
});

test('Book 2 p.16: turret weapons carry their data card letters and prices', () => {
  assert.equal(TURRET_WEAPONS['beam-laser'].code, 'B');
  assert.equal(TURRET_WEAPONS['pulse-laser'].code, 'P');
  assert.equal(TURRET_WEAPONS['missile-launcher'].code, 'M');
  assert.equal(TURRET_WEAPONS['sandcaster'].code, 'S');
  assert.equal(TURRET_WEAPONS['beam-laser'].priceMCr, 1);
  assert.equal(TURRET_WEAPONS['pulse-laser'].priceMCr, 0.5);
  // Book 2 p.30 laser fire DMs: the pulse laser is the cheaper, worse weapon.
  assert.equal(TURRET_WEAPONS['pulse-laser'].attackDM, -1);
  assert.equal(TURRET_WEAPONS['beam-laser'].attackDM, 0);
});

test('Book 2 pp.15-18: mounts, launcher capacity and expendables', () => {
  assert.equal(TURRET_MOUNTS.single.weapons, 1);
  assert.equal(TURRET_MOUNTS.triple.weapons, 3);
  assert.equal(TURRET_MOUNTS.triple.priceMCr, 1);
  // A triple turret of missile launchers holds nine rounds ready.
  assert.equal(ROUNDS_PER_LAUNCHER * TURRET_MOUNTS.triple.weapons, 9);
  assert.equal(MISSILE_PRICE_CR, 5000);
  assert.equal(SAND_CANISTER_PRICE_CR, 400);
});

test('Book 2 p.12: the basic software package is a credit, not a fixed set', () => {
  assert.equal(BASIC_SOFTWARE_PACKAGE_CREDIT_MCR, 2);
  // Enough for a working combat loadout on a Model/1: target, return fire,
  // auto/evade, maneuver and predict-1 come to MCr 3.6 — so not quite.
  const loadout = ['target', 'return-fire', 'auto-evade', 'maneuver', 'predict-1']
    .reduce((sum, key) => sum + COMPUTER_PROGRAMS[key].priceMCr, 0);
  assert.equal(Number(loadout.toFixed(2)), 4.1);
});

test('Book 2 p.10: hull types divide into engineering and main compartments', () => {
  for (const hull of Object.values(HULL_TYPES)) {
    assert.equal(hull.mainTons + hull.engineTons, hull.tons);
  }
});

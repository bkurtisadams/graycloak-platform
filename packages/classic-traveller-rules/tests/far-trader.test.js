// 0.97.0 (Kurt, Nov 2026): the Type A2 Far Trader of Supplement 7, built to
// Book 2's rules on a custom hull.
import test from 'node:test';
import assert from 'node:assert/strict';
import { getStandardShipDesign, costDesign, tonnageBudget, designHull, maximumDrivePotential } from '../index.js';

test('Supplement 7\u2019s Far Trader as printed cannot be built on a standard 200-ton hull (Book 2 p.10)', () => {
  const printed = JSON.parse(JSON.stringify(getStandardShipDesign('type-a2-far-trader')));
  printed.hull = { tons: 200, standard: true, streamlined: true };
  printed.fuel.capacityTons = 50;
  printed.cargo.capacityTons = 61;
  const budget = tonnageBudget(printed);
  assert.equal(budget.engineeringTons, 23);
  assert.equal(budget.engineeringCapacityTons, 15);
  assert.equal(budget.fits, false);
});

test('Book 2: the Far Trader on a custom hull fits, carries its fuel, and reproduces its price', () => {
  const design = getStandardShipDesign('type-a2-far-trader');
  assert.equal(maximumDrivePotential(200, 'B'), 2);
  const hull = designHull(design);
  assert.deepEqual([hull.engineTons, hull.mainTons, hull.priceMCr, hull.buildMonths], [23, 177, 20, 36]);
  const budget = tonnageBudget(design);
  assert.equal(budget.fits, true);
  assert.equal(budget.mainSpareTons, 2, 'two tons for fire control, as on the Type A');
  // p.6: jump-2 in 200 tons is 40, power plant-2 is 20.
  assert.equal(design.fuel.capacityTons, 40 + 20);
  const costed = costDesign(design);
  assert.equal(costed.componentsMCr, 79.4);
  assert.equal(costed.standardDesignMCr, 80.194, 'no standard reduction; the architect\u2019s 1%');
  assert.equal(costed.matchesPrinted, true);
});

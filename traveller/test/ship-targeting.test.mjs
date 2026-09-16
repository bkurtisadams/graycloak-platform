// v0.190.0: T on a hovered ship. See src/ship-targeting.js for the rulings.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createShipDocument, createShipCombatEncounter, advanceShipCombatPhase, armShipTurret, creditShipAccount, currentPhase
} from '../vendor/classic-traveller-rules/index.js';
import { targetHoveredShip, clearShipTargets, targetsOfShip } from '../src/ship-targeting.js';

function cruiser(id, turrets) {
  let ship = createShipDocument({
    designKey: 'type-c-cruiser', id, name: id,
    authority: {
      assignmentType: 'private-owner', controllingAuthority: id,
      legalTitleHolder: 'Captain', legalTitleSourceStatus: 'referee-generated-encounter',
      characterOwnsShip: true, assignedCharacterId: 'npc-cap', assignedCharacterName: 'Captain',
      recallable: false, saleAllowed: true, useAsDesired: true, possessionAtServicePleasure: false,
      servicePrivileges: { freeFuelAtScoutBases: false, freeMaintenanceAtScoutBasesAtClassBStarports: false },
      operatorResponsibilities: { upkeep: true, crewCosts: true }
    },
    crewAssignments: [{ role: 'pilot', characterId: 'npc-cap', characterName: 'Captain' }]
  });
  ship = creditShipAccount(ship, 50_000_000, { kind: 'capital', description: 'test' });
  for (const turretId of turrets) ship = armShipTurret(ship, { turretId, weapon: 'beam-laser', pricePerWeaponCr: 0 }).ship;
  return ship;
}

// Intruder "corsair" with three laser turrets against three native ships, in
// phase B. `programs` is what the corsair has loaded.
function laserFire(programs) {
  const loaded = ['target', ...programs];
  let encounter = createShipCombatEncounter({
    id: 'targeting', intruderSide: 'intruder',
    participants: [
      { shipId: 'corsair', side: 'intruder', name: 'Corsair', ship: cruiser('corsair', ['T-1', 'T-2', 'T-3']), carriedPrograms: loaded, loadedPrograms: loaded, pressurisedSections: [] },
      ...['alpha', 'bravo', 'charlie'].map((id) => ({ shipId: id, side: 'native', name: id, ship: cruiser(id, ['T-1']), carriedPrograms: ['target'], loadedPrograms: ['target'], pressurisedSections: [] }))
    ]
  });
  encounter = advanceShipCombatPhase(encounter);
  assert.equal(currentPhase(encounter).key, 'laser-fire');
  return encounter;
}

test('without Multi-Target, T points every turret at the hovered ship', () => {
  const encounter = laserFire([]);
  let result = targetHoveredShip(encounter, {}, { shooterId: 'corsair', targetId: 'alpha' });
  assert.equal(result.ok, true);
  assert.deepEqual(result.allocation, { corsair: { 'T-1': 'alpha', 'T-2': 'alpha', 'T-3': 'alpha' } });
  assert.equal(result.message, 'ALL 3 TURRETS \u2192 ALPHA');
  // Another ship moves them all; there is never an illegal split on the key.
  result = targetHoveredShip(encounter, result.allocation, { shooterId: 'corsair', targetId: 'bravo' });
  assert.deepEqual(targetsOfShip(result.allocation, 'corsair'), ['bravo']);
});

test('with Multi-Target, T walks down the turrets up to the program\u2019s limit', () => {
  const encounter = laserFire(['multi-target-2']);
  let allocation = {};
  const press = (targetId) => {
    const result = targetHoveredShip(encounter, allocation, { shooterId: 'corsair', targetId });
    if (result.ok) allocation = result.allocation;
    return result;
  };
  assert.equal(press('alpha').message, 'T-1 \u2192 ALPHA');
  assert.equal(press('bravo').message, 'T-2 \u2192 BRAVO');
  // A third ship is past Multi-Target 2, and the refusal names the program.
  const refused = press('charlie');
  assert.equal(refused.ok, false);
  assert.match(refused.message, /MULTI-TARGET 2: 2 TARGETS ALREADY/);
  // An engaged ship can still take another turret.
  assert.equal(press('alpha').message, 'T-3 \u2192 ALPHA');
  // Every turret assigned: T says so rather than overwriting.
  assert.match(press('bravo').message, /EVERY TURRET ON CORSAIR IS ASSIGNED/);
  assert.deepEqual(allocation, { corsair: { 'T-1': 'alpha', 'T-2': 'bravo', 'T-3': 'alpha' } });
});

test('Multi-Target 3 allows a third target', () => {
  const encounter = laserFire(['multi-target-3']);
  let allocation = {};
  for (const target of ['alpha', 'bravo', 'charlie']) {
    const result = targetHoveredShip(encounter, allocation, { shooterId: 'corsair', targetId: target });
    assert.equal(result.ok, true, result.message);
    allocation = result.allocation;
  }
  assert.equal(targetsOfShip(allocation, 'corsair').length, 3);
});

test('an armed turret takes the next T alone, and Shift+T clears it or the ship', () => {
  const encounter = laserFire(['multi-target-2']);
  let allocation = targetHoveredShip(encounter, {}, { shooterId: 'corsair', targetId: 'alpha' }).allocation;
  const armed = targetHoveredShip(encounter, allocation, { shooterId: 'corsair', targetId: 'bravo', armedTurretId: 'T-3' });
  assert.equal(armed.message, 'T-3 \u2192 BRAVO');
  allocation = armed.allocation;
  assert.deepEqual(allocation.corsair, { 'T-1': 'alpha', 'T-3': 'bravo' });
  // Arming a turret cannot break the limit either.
  const over = targetHoveredShip(encounter, allocation, { shooterId: 'corsair', targetId: 'charlie', armedTurretId: 'T-2' });
  assert.equal(over.ok, false);

  const one = clearShipTargets(encounter, allocation, { shooterId: 'corsair', armedTurretId: 'T-3' });
  assert.deepEqual(one.allocation.corsair, { 'T-1': 'alpha' });
  const all = clearShipTargets(encounter, allocation, { shooterId: 'corsair' });
  assert.equal(all.allocation.corsair, undefined);
  assert.equal(all.message, 'CORSAIR HOLDS FIRE');
  // The input allocation is never mutated.
  assert.deepEqual(allocation.corsair, { 'T-1': 'alpha', 'T-3': 'bravo' });
});

test('T refuses outside the fire phases, from the wrong side, and at friends', () => {
  const encounter = laserFire([]);
  const movement = createShipCombatEncounter({
    id: 'early', intruderSide: 'intruder',
    participants: encounter.participants.map((entry) => ({ shipId: entry.id, side: entry.side, name: entry.name, ship: entry.ship, carriedPrograms: ['target'], loadedPrograms: ['target'], pressurisedSections: [] }))
  });
  assert.match(targetHoveredShip(movement, {}, { shooterId: 'corsair', targetId: 'alpha' }).message, /THIS IS MOVEMENT/);
  assert.match(targetHoveredShip(encounter, {}, { shooterId: 'alpha', targetId: 'corsair' }).message, /ALPHA IS NOT ACTING/);
  assert.match(targetHoveredShip(encounter, {}, { shooterId: 'corsair', targetId: 'corsair' }).message, /OWN SIDE/);
  assert.match(targetHoveredShip(encounter, {}, { shooterId: 'corsair', targetId: null }).message, /HOVER A SHIP/);
});

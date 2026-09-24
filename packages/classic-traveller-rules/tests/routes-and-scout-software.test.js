import test from 'node:test';
import assert from 'node:assert/strict';
import { createSequenceDice } from '../src/dice.js';
import { jumpRouteThrow, rollJumpRoutes, laneBetween, lanesFrom, routePairKey } from '../src/worlds/routes.js';
import { validateAuthoredSubsector } from '../src/worlds/subsector.js';
import { deliveredSoftwarePackage, basicSoftwarePackage, softwarePackageCostMCr } from '../src/starships/software.js';
import { createShipDocument, migrateShipDocument, CURRENT_SHIP_DOCUMENT_SCHEMA_VERSION } from '../src/starships/ship-document.js';

const world = (id, uwp) => ({ id: `${id}-main`, name: id, uwp });
const system = (id, hex, uwp) => ({ id, hex, name: id, mainWorld: world(id, uwp) });

test('Book 3 p.3 jump routes table: by starport pair and distance, E only at jump-1, X never', () => {
  assert.equal(routePairKey('E', 'a'), 'A-E');
  assert.equal(jumpRouteThrow('A', 'A', 1), 1);
  assert.equal(jumpRouteThrow('B', 'A', 4), 5);
  assert.equal(jumpRouteThrow('C', 'C', 2), 6);
  assert.equal(jumpRouteThrow('C', 'C', 3), null);
  assert.equal(jumpRouteThrow('E', 'B', 1), 4);
  assert.equal(jumpRouteThrow('E', 'B', 2), null);
  assert.equal(jumpRouteThrow('E', 'E', 1), 6);
  assert.equal(jumpRouteThrow('X', 'A', 1), null);
  assert.equal(jumpRouteThrow('A', 'A', 5), null);
});

test('routes are thrown once per pair in range and kept as subsector data', () => {
  const subsector = { id: 's', name: 'S', systems: [
    system('a', '0101', 'A000000-0'), system('b', '0102', 'B000000-0'),
    system('e', '0103', 'E000000-0'), system('far', '0808', 'A000000-0')
  ] };
  // Pairs by hex order: a-b J1 (1+), a-e J2 (dash, no throw), b-e J1 (4+).
  const { routes, checks } = rollJumpRoutes(subsector, createSequenceDice([1, 3]));
  assert.equal(checks.length, 2);
  assert.deepEqual(routes, [{ from: 'a', to: 'b', distance: 1 }]);
  const charted = { ...subsector, routes };
  assert.equal(validateAuthoredSubsector(charted).valid, true);
  assert.equal(laneBetween(charted, 'b', 'a'), true);
  assert.equal(laneBetween(charted, 'b', 'e'), false);
  assert.deepEqual(lanesFrom(charted, 'b'), [{ systemId: 'a', distance: 1 }]);
  assert.equal(validateAuthoredSubsector({ ...subsector, routes: [{ from: 'a', to: 'b', distance: 2 }] }).valid, false);
  assert.equal(validateAuthoredSubsector({ ...subsector, routes: [{ from: 'a', to: 'nowhere', distance: 1 }] }).valid, false);
});

test('a Type S is delivered with Generate in place of Library and Anti-Hijack; other designs keep the basic package', () => {
  const scout = deliveredSoftwarePackage('type-s-scout-courier', 2);
  assert.deepEqual([...scout], ['maneuver', 'jump-1', 'jump-2', 'navigation', 'generate']);
  assert.equal(softwarePackageCostMCr(scout), 1.7);
  assert.deepEqual(deliveredSoftwarePackage('type-a-free-trader', 1), basicSoftwarePackage(1));
});

test('ship document v9: a new Type S carries Generate; a Type S in service gains it and keeps the rest', () => {
  const authority = {
    assignmentType: 'owned', controllingAuthority: 'x', legalTitleHolder: null, legalTitleSourceStatus: 'test',
    characterOwnsShip: true, assignedCharacterId: 'c', assignedCharacterName: 'C', recallable: false,
    saleAllowed: true, useAsDesired: true, possessionAtServicePleasure: false,
    servicePrivileges: { freeFuelAtScoutBases: false, freeMaintenanceAtScoutBasesAtClassBStarports: false },
    operatorResponsibilities: { upkeep: true, crewCosts: true }
  };
  const crewAssignments = [{ role: 'pilot', characterId: 'c', characterName: 'C' }];
  const fresh = createShipDocument({ designKey: 'type-s-scout-courier', id: 's', authority, crewAssignments });
  assert.ok(fresh.state.computer.programs.includes('generate'));
  const v8 = structuredClone(fresh);
  v8.schemaVersion = 8;
  v8.state.computer.programs = [...basicSoftwarePackage(2)];
  const migrated = migrateShipDocument(v8);
  assert.equal(migrated.schemaVersion, CURRENT_SHIP_DOCUMENT_SCHEMA_VERSION);
  assert.deepEqual(migrated.state.computer.programs, [...basicSoftwarePackage(2), 'generate']);
  const trader = { ...createShipDocument({ designKey: 'type-a-free-trader', id: 't', authority, crewAssignments }), schemaVersion: 8 };
  assert.equal(migrateShipDocument(trader).state.computer.programs.includes('generate'), false);
});

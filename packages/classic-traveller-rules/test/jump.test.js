// jump.test.js — v0.68.0: software, departure, and the jump.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createSequenceDice } from '../src/dice.js';
import { createShipDocument, migrateShipDocument } from '../src/starships/ship-document.js';
import { basicSoftwarePackage, softwarePackageCostMCr } from '../src/starships/software.js';
import {
  creditShipAccount, establishShipFuelState, purchaseComputerProgram, performMaintenance
} from '../src/starships/operations.js';
import {
  shipCrewRequirements, missingEngineers, misjumpDMParts, driveFailureDMParts, departureChecklist,
  hexInDirection, rollMisjump, rollDriveFailure, applyDriveFailure, attemptDriveRepair, completeDriveRepair,
  shipBatteryStatus, rollHijackAttempt, rollHijackersReachBridge, beginJump, resolveJumpWeek, installedDriveTons
} from '../src/starships/jump.js';
import { subsectorHexDistance } from '../src/worlds/subsector.js';

const AUTHORITY = {
  assignmentType: 'owned', controllingAuthority: 'owner', legalTitleHolder: 'char-kurt',
  legalTitleSourceStatus: 'test', characterOwnsShip: true, assignedCharacterId: 'char-kurt',
  assignedCharacterName: 'Kurt Vance', recallable: false, saleAllowed: true, useAsDesired: true,
  possessionAtServicePleasure: false,
  servicePrivileges: { freeFuelAtScoutBases: false, freeMaintenanceAtScoutBasesAtClassBStarports: false },
  operatorResponsibilities: { upkeep: true, crewCosts: true }
};

const FULL_CREW = [
  { role: 'pilot', characterId: 'char-kurt', characterName: 'Kurt Vance' },
  { role: 'engineer', characterId: 'npc-dara', characterName: 'Dara' },
  { role: 'medic', characterId: 'npc-ilse', characterName: 'Ilse' }
];

function ship({ designKey = 'type-a-free-trader', crew = FULL_CREW, fuel = 'refined', balanceCr = 0, passengers = [] } = {}) {
  let vessel = createShipDocument({ designKey, id: `ship-${designKey}`, name: 'Test', authority: AUTHORITY, crewAssignments: crew, state: { passengerManifest: passengers } });
  if (fuel) vessel = establishShipFuelState(vessel, { tons: vessel.specifications.fuel.capacityTons, quality: fuel });
  if (balanceCr) vessel = creditShipAccount(vessel, balanceCr, { description: 'Opening balance', dateLabel: '001-1105' });
  return vessel;
}

function highPassengers(count) {
  return Array.from({ length: count }, (_, index) => ({ id: `pax-${index}`, class: 'high', originSystemId: 'regina', destinationSystemId: 'efate', fareCr: 10000 }));
}

// ---------------------------------------------------------------- software

test('the basic software package: the flight set, then Target, then a defensive program, within CR 2M', () => {
  const freeTrader = basicSoftwarePackage(1);
  assert.deepEqual([...freeTrader], ['maneuver', 'jump-1', 'navigation', 'library', 'anti-hijack', 'target']);
  assert.equal(softwarePackageCostMCr(freeTrader), 2);
  // Jump-2 costs 0.3, so a Scout's flight set is 1.3 and Target will not fit.
  const scout = basicSoftwarePackage(2);
  assert.ok(scout.includes('jump-2') && scout.includes('jump-1'));
  assert.ok(!scout.includes('target'));
  assert.ok(scout.includes('auto-evade'));
  assert.ok(softwarePackageCostMCr(scout) <= 2);
  assert.ok(softwarePackageCostMCr(basicSoftwarePackage(3)) <= 2);
});

test('ship document v6 migrates to v7 carrying the basic package, with no malfunction', () => {
  const v6 = { ...ship(), schemaVersion: 6 };
  delete v6.state.computer;
  delete v6.state.malfunction;
  const v7 = migrateShipDocument(v6);
  assert.equal(v7.schemaVersion, 7);
  assert.deepEqual(v7.state.computer.programs, [...basicSoftwarePackage(1)]);
  assert.equal(v7.state.malfunction, null);
});

test('Book 2 p.12: a program is bought once, at its listed price, from the ship account', () => {
  const vessel = ship({ balanceCr: 1_000_000 });
  const bought = purchaseComputerProgram(vessel, 'generate', { dateLabel: '010-1105' });
  assert.equal(bought.costCr, 800_000);
  assert.ok(bought.ship.state.computer.programs.includes('generate'));
  assert.equal(bought.ship.state.finances.ledger.at(-1).kind, 'software');
  assert.throws(() => purchaseComputerProgram(bought.ship, 'generate'), /already carried/);
  assert.throws(() => purchaseComputerProgram(bought.ship, 'predict-1'), /requires Cr2,000,000/);
});

// -------------------------------------------------------------------- crew

test('Book 2 p.16: a Free Trader needs a pilot, a medic and one engineer, and a steward per 8 high passengers', () => {
  assert.equal(installedDriveTons(ship()), 15);
  const rows = Object.fromEntries(shipCrewRequirements(ship({ passengers: highPassengers(6) })).map((row) => [row.role, row]));
  assert.equal(rows.pilot.required, 1);
  assert.equal(rows.navigator.required, 0, '200 tons is not over 200');
  assert.equal(rows.engineer.required, 1);
  assert.equal(rows.medic.required, 1);
  assert.equal(rows.steward.required, 1);
  assert.equal(rows.steward.missing, 1);
  assert.equal(missingEngineers(ship({ crew: [FULL_CREW[0], FULL_CREW[2]] })), 1);
  // A 100-ton Scout needs no engineer and no medic.
  const scout = Object.fromEntries(shipCrewRequirements(ship({ designKey: 'type-s-scout-courier', crew: [FULL_CREW[0]] })).map((row) => [row.role, row]));
  assert.equal(scout.engineer.required, 0);
  assert.equal(scout.medic.required, 0);
});

// ---------------------------------------------------------------------- DMs

test('1982 misjump DMs: unrefined fuel only for ships not built for it; 100 and 10 diameters', () => {
  assert.deepEqual(misjumpDMParts(ship()).map((part) => part.dm), []);
  assert.deepEqual(misjumpDMParts(ship({ fuel: 'unrefined' })).map((part) => part.dm), [1]);
  assert.deepEqual(misjumpDMParts(ship({ designKey: 'type-s-scout-courier', crew: [FULL_CREW[0]], fuel: 'unrefined' })).map((part) => part.dm), []);
  assert.deepEqual(misjumpDMParts(ship(), { diametersFromWorld: 50 }).map((part) => part.dm), [5]);
  assert.deepEqual(misjumpDMParts(ship(), { diametersFromWorld: 5 }).map((part) => part.dm), [15]);
  assert.deepEqual(misjumpDMParts(ship(), { diametersFromWorld: 100 }).map((part) => part.dm), []);
});

test('1982 drive-failure DMs: unrefined fuel, each engineer missing, each week past the overhaul', () => {
  let vessel = ship({ fuel: 'unrefined', crew: [FULL_CREW[0], FULL_CREW[2]], balanceCr: 100_000 });
  vessel = performMaintenance(vessel, { dateLabel: '001-1105', starport: 'A' }).ship;
  // Due 001-1106; 22 days late is three whole weeks.
  const parts = driveFailureDMParts(vessel, { dateLabel: '023-1106' });
  assert.deepEqual(parts.map((part) => part.dm), [1, 1, 3]);
  assert.deepEqual(driveFailureDMParts(ship(), { dateLabel: '001-1105' }), []);
});

// -------------------------------------------------------------- checklist

test('departure checklist: a crewed, fuelled Free Trader on a lane may leave; each gate blocks on its own', () => {
  const ready = departureChecklist(ship(), { distance: 1, dateLabel: '010-1105', laneExists: true });
  assert.equal(ready.ok, true);
  assert.equal(ready.misjumpDM, 0);

  const offLane = departureChecklist(ship(), { distance: 1, dateLabel: '010-1105' });
  assert.equal(offLane.ok, false);
  assert.equal(offLane.rows.find((row) => row.key === 'flight-plan').ok, false);

  const tooFar = departureChecklist(ship(), { distance: 2, dateLabel: '010-1105', laneExists: true });
  assert.equal(tooFar.rows.find((row) => row.key === 'jump-drive').ok, false);
  assert.equal(tooFar.ok, false);

  const noMedic = departureChecklist(ship({ crew: FULL_CREW.slice(0, 2) }), { distance: 1, dateLabel: '010-1105', laneExists: true });
  assert.equal(noMedic.ok, false);

  // An engineer short is a risk, not a gate.
  const noEngineer = departureChecklist(ship({ crew: [FULL_CREW[0], FULL_CREW[2]] }), { distance: 1, dateLabel: '010-1105', laneExists: true });
  assert.equal(noEngineer.ok, true);
  assert.equal(noEngineer.driveFailureDM, 1);

  const empty = departureChecklist(ship({ fuel: null }), { distance: 1, dateLabel: '010-1105', laneExists: true });
  assert.equal(empty.rows.find((row) => row.key === 'fuel').ok, false);

  const failed = departureChecklist(applyDriveFailure(ship(), { failed: ['jumpDrive'], dateLabel: '005-1105' }), { distance: 1, dateLabel: '010-1105', laneExists: true });
  assert.equal(failed.rows.find((row) => row.key === 'drives').ok, false);

  const close = departureChecklist(ship(), { distance: 1, dateLabel: '010-1105', laneExists: true, diametersFromWorld: 5 });
  assert.match(close.rows.find((row) => row.key === 'misjump-risk').detail, /destroyed on 16\+/);
});

// ----------------------------------------------------------------- misjump

test('1982 misjump: 13+ throws the ship 1D-dice hexes in one of six directions for 1D weeks; 16+ destroys it', () => {
  const clean = rollMisjump(createSequenceDice([6, 6]), { dm: 0 });
  assert.equal(clean.misjump, false);
  assert.equal(clean.weeksInJump, 1);

  // 12 + 1 = 13: misjump. Two dice of distance (3 + 4), direction 2, 3 weeks.
  const lost = rollMisjump(createSequenceDice([6, 6, 2, 3, 4, 2, 3]), { dm: 1 });
  assert.equal(lost.misjump, true);
  assert.equal(lost.destroyed, false);
  assert.equal(lost.distanceHexes, 7);
  assert.equal(lost.direction, 2);
  assert.equal(lost.weeksInJump, 3);

  const gone = rollMisjump(createSequenceDice([1, 1]), { dm: 15 });
  assert.equal(gone.destroyed, true);
  assert.equal(gone.weeksInJump, null);
});

test('misjump directions walk the Book 3 hex grid, and may leave the subsector', () => {
  assert.equal(hexInDirection('0101', 3, 1).hex, '0201');
  assert.equal(hexInDirection('0405', 1, 2).hex, '0403');
  assert.equal(hexInDirection('0405', 4, 3).hex, '0408');
  for (let direction = 1; direction <= 6; direction += 1) {
    const landed = hexInDirection('0405', direction, 3);
    if (landed.inSubsector) assert.equal(subsectorHexDistance('0405', landed.hex), 3);
  }
  const off = hexInDirection('0101', 6, 4);
  assert.equal(off.inSubsector, false);
  assert.equal(off.hex, null);
  assert.equal(off.column, -3);
});

// ----------------------------------------------------------- drive failure

test('1982 drive failure: 13+ is a malfunction, then 7+ for each drive in use', () => {
  const none = rollDriveFailure(createSequenceDice([6, 6]), { dm: 0 });
  assert.equal(none.malfunction, false);
  assert.deepEqual([...none.failed], []);
  // 12 + 1: malfunction. Power plant 7 fails, maneuver 6 holds, jump 12 fails.
  const struck = rollDriveFailure(createSequenceDice([6, 6, 3, 4, 3, 3, 6, 6]), { dm: 1 });
  assert.equal(struck.malfunction, true);
  assert.deepEqual([...struck.failed], ['powerPlant', 'jumpDrive']);
});

test('failed drives are patched on 10+ plus engineering, and cleared for good only at a class A-C starport', () => {
  let vessel = applyDriveFailure(ship(), { failed: ['powerPlant', 'maneuverDrive'], dateLabel: '010-1105' });
  assert.deepEqual(vessel.state.malfunction, { failed: ['powerPlant', 'maneuverDrive'], since: '010-1105', patched: false });
  const miss = attemptDriveRepair(vessel, createSequenceDice([3, 4]), { engineeringSkill: 2, dateLabel: '011-1105' });
  assert.equal(miss.success, false);
  const hit = attemptDriveRepair(vessel, createSequenceDice([4, 4]), { engineeringSkill: 2, dateLabel: '011-1105' });
  assert.equal(hit.success, true);
  assert.deepEqual(hit.ship.state.malfunction, { failed: [], since: '010-1105', patched: true });
  assert.throws(() => completeDriveRepair(hit.ship, { starport: 'D' }), /class A, B or C/);
  assert.equal(completeDriveRepair(hit.ship, { starport: 'C' }).state.malfunction, null);
});

test('1982: with the power plant down, batteries hold life support for ten days', () => {
  const vessel = applyDriveFailure(ship(), { failed: ['powerPlant'], dateLabel: '010-1105' });
  const day3 = shipBatteryStatus(vessel, { dateLabel: '013-1105' });
  assert.equal(day3.onBatteries, true);
  assert.equal(day3.exhaustedOn, '020-1105');
  assert.equal(day3.daysRemaining, 7);
  assert.equal(shipBatteryStatus(vessel, { dateLabel: '021-1105' }).exhausted, true);
  assert.equal(shipBatteryStatus(ship(), { dateLabel: '010-1105' }).onBatteries, false);
});

// ------------------------------------------------------------------ hijack

test('Book 2 p.3: 3D of exactly 18 is a hijacking; the anti-hijack program holds the bridge on 6+', () => {
  assert.equal(rollHijackAttempt(createSequenceDice([]), { nonPlayerPassengers: 0 }).rolled, false);
  assert.equal(rollHijackAttempt(createSequenceDice([6, 6, 5]), { nonPlayerPassengers: 3 }).attempt, false);
  const attempt = rollHijackAttempt(createSequenceDice([6, 6, 6, 4]), { nonPlayerPassengers: 3 });
  assert.equal(attempt.attempt, true);
  assert.equal(attempt.day, 4);

  const guarded = ship();
  assert.equal(rollHijackersReachBridge(createSequenceDice([3, 3]), guarded).reached, false);
  assert.equal(rollHijackersReachBridge(createSequenceDice([2, 3]), guarded).reached, true);
  const open = { ...guarded, state: { ...guarded.state, computer: { programs: ['maneuver'] } } };
  assert.equal(rollHijackersReachBridge(createSequenceDice([]), open).reached, true);
});

// -------------------------------------------------------------------- jump

test('beginJump burns the fuel, rolls misjump and hijack, and says when and where the ship comes out', () => {
  const vessel = ship();
  // Misjump 2D = 7 (clean). No passengers, so no hijack throw.
  const jump = beginJump(vessel, { dice: createSequenceDice([3, 4]), distance: 1, fromHex: '0405', toHex: '0406', dateLabel: '010-1105', laneExists: true });
  assert.equal(jump.destroyed, false);
  assert.equal(jump.misjump.misjump, false);
  assert.equal(jump.fuelConsumedTons, 30);
  assert.equal(jump.ship.state.currentFuelTons, 0);
  assert.equal(jump.weeksInJump, 1);
  assert.equal(jump.emergesOn, '017-1105');
  assert.equal(jump.destination.hex, '0406');
  assert.equal(jump.hijack.rolled, false);

  assert.throws(() => beginJump(vessel, { dice: createSequenceDice([]), distance: 1, fromHex: '0405', toHex: '0406', dateLabel: '010-1105' }), /flight-plan/);
});

test('beginJump: jumping from inside 100 diameters on unrefined fuel can misjump into another hex, for weeks', () => {
  const vessel = ship({ fuel: 'unrefined' });
  // 2D 7 + 6 (100D +5, unrefined +1) = 13: misjump. 1 die of distance: 3. Direction 4. 2 weeks.
  const jump = beginJump(vessel, { dice: createSequenceDice([3, 4, 1, 3, 4, 2]), distance: 1, fromHex: '0405', toHex: '0406', dateLabel: '010-1105', laneExists: true, diametersFromWorld: 50 });
  assert.equal(jump.misjump.misjump, true);
  assert.equal(jump.destination.planned, false);
  assert.equal(jump.destination.hex, '0408');
  assert.equal(jump.weeksInJump, 2);
  assert.equal(jump.emergesOn, '024-1105');
});

test('resolveJumpWeek records a weekly drive failure and lets the engineer try a repair each day after', () => {
  const vessel = ship();
  // Failure 2D 6+6 + DM 1 = 13. Sections: PP 4+4 fails, M 1+1 holds, J 2+2 holds.
  // Repairs at Engineering-1: day 1 = 3+3+1 = 7, day 2 = 5+4+1 = 10.
  const week = resolveJumpWeek(vessel, { dice: createSequenceDice([6, 6, 4, 4, 1, 1, 2, 2, 3, 3, 5, 4]), weekStartsOn: '010-1105', dm: 1, engineeringSkill: 1 });
  assert.deepEqual([...week.failure.failed], ['powerPlant']);
  assert.deepEqual(week.repairs.map((repair) => repair.success), [false, true]);
  assert.deepEqual([...week.stillFailed], []);
  assert.equal(week.ship.state.malfunction.patched, true);
  assert.equal(week.batteries.onBatteries, false);

  // No engineer attending: the failure stands and the batteries are running down.
  const adrift = resolveJumpWeek(vessel, { dice: createSequenceDice([6, 6, 4, 4, 1, 1, 2, 2]), weekStartsOn: '010-1105', dm: 1 });
  assert.deepEqual([...adrift.stillFailed], ['powerPlant']);
  assert.equal(adrift.batteries.daysRemaining, 3);
});

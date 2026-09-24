// runner.test.mjs — the headless trip runner (build-order step 4).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDocumentRegistry, createMemoryStorage } from '../src/document-registry.js';
import { createShipDocument, financeShip } from '../vendor/classic-traveller-rules/index.js';
import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js';
import { createTrip, listActions, applyAction, tripDate, portFacts } from '../src/runner/trip.js';
import { runTrip } from '../src/runner/run.js';
import { createDefaultPolicy } from '../src/runner/policy.js';

const fixture = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'Sea-of-Suns-v0.11.2-buggy.campaign.json');
const HAWKEYE = 'char-04164baa70c3b5a6';
const context = { subsector: FAR_MERIDIAN_SUBSECTOR };

const OWNED = {
  assignmentType: 'owned', controllingAuthority: 'Hawkeye', legalTitleHolder: 'Hawkeye', legalTitleSourceStatus: 'test',
  characterOwnsShip: true, assignedCharacterId: HAWKEYE, assignedCharacterName: 'Hawkeye', recallable: false,
  saleAllowed: true, useAsDesired: true, possessionAtServicePleasure: false,
  servicePrivileges: { freeFuelAtScoutBases: false, freeMaintenanceAtScoutBasesAtClassBStarports: false },
  operatorResponsibilities: { upkeep: true, crewCosts: true }
};

async function resolvedAt(systemId, { design = 'type-a-free-trader', financed = false, shipState = {} } = {}) {
  const bundle = JSON.parse(await readFile(fixture, 'utf8'));
  const system = FAR_MERIDIAN_SUBSECTOR.systems.find((entry) => entry.id === systemId);
  bundle.campaign.location = { systemId, systemName: system.name, worldId: system.mainWorld.id, worldName: system.mainWorld.name };
  if (design !== 'fixture') {
    const old = bundle.documents.ships[0];
    let ship = createShipDocument({
      designKey: design, id: old.identity.id, name: 'Marisol', registry: 'A-1', authority: OWNED,
      crewAssignments: [
        { role: 'pilot', characterId: HAWKEYE, characterName: 'Hawkeye' },
        { role: 'medic', characterId: HAWKEYE, characterName: 'Hawkeye' }
      ],
      state: {
        currentFuelTons: 30, fuelQuality: 'refined',
        finances: { balanceCr: 500000, ledger: [{ id: 'opening', date: '106-4800', kind: 'transfer', description: 'Opening balance', amountCr: 500000, balanceCr: 500000 }] },
        portCall: { systemId, arrivalDate: '106-4800', berthingDueCr: 100, berthingPaid: true },
        ...shipState
      }
    });
    if (financed) ship = financeShip(ship, { startedOn: '106-4800', homeSystemId: systemId });
    bundle.documents.ships[0] = ship;
  } else {
    bundle.documents.ships[0].state.portCall = { systemId, arrivalDate: '106-4800', berthingDueCr: 100, berthingPaid: true };
  }
  const registry = createDocumentRegistry({ storage: createMemoryStorage() });
  const { campaign } = registry.putBundle(bundle);
  return registry.resolveCampaign(campaign.identity.id);
}

test('a trip starts in port with the courses in range and refuses what is not legal', async () => {
  const trip = createTrip(await resolvedAt('aster'));
  assert.equal(trip.situation, 'port');
  assert.equal(tripDate(trip), '106-4800');
  const actions = listActions(trip, context);
  const courses = actions.filter((entry) => entry.type === 'choose-destination');
  assert.ok(courses.length > 0);
  assert.ok(courses.every((entry) => entry.distance === 1), 'a Jump-1 ship is offered only one-parsec courses');
  assert.equal(actions.some((entry) => entry.type === 'depart'), false, 'no departure before a course is set');
  assert.throws(() => applyAction(trip, { type: 'depart' }, context), /not legal/);
  assert.throws(() => applyAction(trip, { type: 'jump-week' }, context), /not legal/);
});

test('one jump: a week in jump space, arrival at the course set, a new port call', async () => {
  let trip = createTrip(await resolvedAt('aster'), { seed: 'one' });
  trip = applyAction(trip, { type: 'choose-destination', systemId: 'calder' }, context).state;
  const departed = applyAction(trip, { type: 'depart' }, context);
  trip = departed.state;
  assert.ok(departed.events.some((entry) => entry.kind === 'depart'));
  // Book 2 p.3: traffic may be met leaving; let it pass.
  if (trip.situation === 'encounter') {
    assert.equal(trip.encounter.phase, 'outbound');
    trip = applyAction(trip, { type: 'let-pass' }, context).state;
  }
  assert.equal(trip.situation, 'in-jump');
  assert.equal(tripDate(trip), '107-4800', 'a day to 100 diameters (Book 2 p.1)');
  assert.ok(trip.ship.state.currentFuelTons < 30);
  let arrived = applyAction(trip, { type: 'jump-week' }, context);
  trip = arrived.state;
  assert.equal(trip.campaign.location.systemId, 'calder');
  if (trip.situation === 'encounter') {
    assert.equal(trip.encounter.phase, 'inbound');
    assert.equal(trip.ship.state.portCall.systemId, 'aster', 'the encounter comes before landing');
    arrived = applyAction(trip, { type: 'let-pass' }, context);
    trip = arrived.state;
  }
  assert.equal(tripDate(trip), '114-4800');
  assert.equal(trip.ship.state.portCall.systemId, 'calder');
  assert.equal(trip.ship.state.portCall.arrivalDate, '114-4800');
  assert.equal(trip.arrivals, 1);
  assert.equal(trip.situation, 'port');
  assert.ok(arrived.events.some((entry) => entry.kind === 'arrival'));
});

test('the same seed runs the same trip; another seed runs another', async () => {
  const resolved = await resolvedAt('aster');
  const texts = (seed) => runTrip(createTrip(resolved, { seed }), context, { arrivals: 4 }).events.map((entry) => `${entry.date} ${entry.text}`);
  assert.deepEqual(texts('alpha'), texts('alpha'));
  assert.notDeepEqual(texts('alpha'), texts('beta'));
});

test('the default policy spends Book 2 p.1\'s six days in port and keeps going', async () => {
  const outcome = runTrip(createTrip(await resolvedAt('aster'), { seed: 'steady' }), context, { arrivals: 3 });
  assert.ok(['arrivals', 'halted', 'stranded'].includes(outcome.stoppedBy));
  if (outcome.stoppedBy === 'arrivals') {
    assert.equal(outcome.state.arrivals, 3);
    const departures = outcome.events.filter((entry) => entry.kind === 'depart').map((entry) => entry.date);
    assert.equal(departures[0], '112-4800', 'six days after the opening port call');
    const jumps = outcome.events.filter((entry) => entry.kind === 'jump').map((entry) => entry.date);
    assert.equal(jumps[0], '113-4800', 'a day later at the jump point');
  }
});

test('flight plans follow the charted lanes: off-lane worlds need Generate, which a Type S now carries', async () => {
  // Cinder charts no lane (Book 3 p.3: an E port holds only jump-1 lanes,
  // and its nearest world is two hexes off). The fixture's Scout migrates
  // to ship document v9 with Generate, so it can leave anyway.
  const scout = await resolvedAt('cinder', { design: 'fixture' });
  assert.ok(scout.ships[0].state.computer.programs.includes('generate'));
  const trip = createTrip(scout, { seed: 'lanes' });
  const course = listActions(trip, context).find((entry) => entry.type === 'choose-destination');
  const facts = portFacts({ ...trip, destinationId: course.systemId }, context);
  assert.equal(facts.lane, false);
  assert.equal(facts.checklist.rows.find((row) => row.key === 'flight-plan').ok, true);
  assert.match(facts.checklist.rows.find((row) => row.key === 'flight-plan').detail, /Generate/);

  // A Free Trader carries no Generate: every one-parsec pair in Far Meridian
  // is laned, so it takes the starport's cassette; with no lanes it stays.
  const blocked = runTrip(createTrip(await resolvedAt('aster'), { lanes: 'never' }), context, { arrivals: 1 });
  assert.equal(blocked.stoppedBy, 'halted');
  assert.match(blocked.halt.detail, /flight-plan/);
  const onLane = createTrip(await resolvedAt('aster'));
  const toCalder = portFacts({ ...onLane, destinationId: 'calder' }, context);
  assert.equal(toCalder.lane, true);
  assert.equal(toCalder.checklist.rows.find((row) => row.key === 'flight-plan').ok, true);
});

test('an arrival encounter waits on the policy; a fight halts the trip for a person', async () => {
  const trip = { ...createTrip(await resolvedAt('aster')), situation: 'encounter',
    encounter: { key: 'patrol', label: 'Patrol', hull: null, hostileByDefault: false, reaction: 'x', systemId: 'aster', dateLabel: '106-4800', tollDemandCr: null } };
  const types = listActions(trip, context).map((entry) => entry.type);
  assert.deepEqual(types.sort(), ['fight', 'inspect', 'let-pass']);
  assert.equal(createDefaultPolicy()(trip, listActions(trip, context), context).type, 'let-pass');
  assert.equal(createDefaultPolicy({ inspect: true })(trip, listActions(trip, context), context).type, 'inspect');
  const fought = applyAction(trip, { type: 'fight' }, context).state;
  assert.equal(fought.situation, 'halted');
  assert.equal(fought.halt.reason, 'ship-fight');
  assert.deepEqual(listActions(fought, context), []);
});

test('a failed drive blocks departure until a class A-C starport repairs it', async () => {
  const rich = { balanceCr: 20_000_000, ledger: [{ id: 'opening', date: '106-4800', kind: 'transfer', description: 'Opening balance', amountCr: 20_000_000, balanceCr: 20_000_000 }] };
  let trip = createTrip(await resolvedAt('aster', { shipState: { finances: rich, malfunction: { failed: ['jumpDrive'], since: '100-4800', patched: false } } }));
  trip = applyAction(trip, { type: 'choose-destination', systemId: 'calder' }, context).state;
  const facts = portFacts(trip, context);
  assert.equal(facts.checklist.rows.find((row) => row.key === 'drives').ok, false);
  // Book 2 p.18: 2D x 10% of the jump drive's MCr 10.
  assert.ok(facts.driveRepair.costCr >= 2_000_000 && facts.driveRepair.costCr <= 12_000_000);
  const policy = createDefaultPolicy({ portDays: 0 });
  assert.equal(policy(trip, listActions(trip, context), context).type, 'repair-drives');
  trip = applyAction(trip, { type: 'repair-drives' }, context).state;
  assert.equal(trip.ship.state.malfunction, null);
  assert.equal(trip.ship.state.finances.balanceCr, 20_000_000 - facts.driveRepair.costCr);
  assert.equal(portFacts(trip, context).checklist.ok, true);
  // At the free trader's own Cr500,000 the same repair is out of reach.
  const poor = createTrip(await resolvedAt('aster', { shipState: { malfunction: { failed: ['jumpDrive'], since: '100-4800', patched: false } } }));
  assert.equal(listActions(poor, context).some((entry) => entry.type === 'repair-drives'), false);
});

test('time in port goes through the clock: a financed ship pays its mortgage on the day it falls due', async () => {
  const trip = createTrip(await resolvedAt('aster', { financed: true }));
  const waited = applyAction(trip, { type: 'wait', days: 31 }, context);
  assert.equal(tripDate(waited.state), '137-4800');
  assert.ok(waited.events.some((entry) => entry.kind === 'upkeep' && entry.paidCr > 0));
  assert.ok(waited.state.ship.state.finances.ledger.some((entry) => entry.kind === 'mortgage' && entry.date === '136-4800'));
});

test('a misjump into empty space leaves the ship stranded', async () => {
  const trip = { ...createTrip(await resolvedAt('aster')), situation: 'in-jump',
    jump: { fromSystemId: 'aster', toSystemId: 'calder', startedOn: '106-4800', weeks: 1, weeksDone: 0, misjump: true, destroyed: false, landedHex: '0110', landedSystemId: null } };
  const result = applyAction(trip, { type: 'jump-week' }, context);
  assert.equal(result.state.situation, 'stranded');
  assert.equal(result.state.jump, null);
  assert.ok(result.events.some((entry) => entry.kind === 'stranded'));
  assert.deepEqual(listActions(result.state, context), []);
});

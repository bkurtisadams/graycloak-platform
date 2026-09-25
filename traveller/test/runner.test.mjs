// runner.test.mjs — the headless trip runner (build-order step 4).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDocumentRegistry, createMemoryStorage } from '../src/document-registry.js';
import { createShipDocument, financeShip, loadCargo } from '../vendor/classic-traveller-rules/index.js';
import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js';
import { createTrip, listActions, applyAction, tripDate, portFacts, tripRecord, tripFromDocuments } from '../src/runner/trip.js';
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
  assert.equal(fought.halt.opponentInitiated, false, 'the party chose to fight a patrol');
  // v0.315.0: a halt waits for a person, then goes on.
  assert.deepEqual(listActions(fought, context).map((entry) => entry.type), ['resume']);
});

test('v0.315.0 a trip survives as its record plus the documents, and a fight on the way out resumes to the jump', async () => {
  const resolved = await resolvedAt('aster');
  let trip = createTrip(resolved);
  trip = applyAction(trip, { type: 'choose-destination', systemId: 'calder' }, context).state;
  const record = tripRecord(trip);
  assert.equal(record.destinationId, 'calder');
  assert.equal(Object.hasOwn(record, 'ship'), false, 'the documents are not copied into the record');
  const rebuilt = tripFromDocuments(resolved, JSON.parse(JSON.stringify(record)));
  assert.equal(rebuilt.destinationId, 'calder');
  assert.deepEqual(listActions(rebuilt, context).map((entry) => entry.type), listActions(trip, context).map((entry) => entry.type));

  const outbound = { ...trip, situation: 'encounter', departure: { fromSystemId: 'aster', toSystemId: 'calder', distance: 1, lane: true, leftOn: '106-4800' },
    encounter: { key: 'pirate', label: 'Pirate', hull: 'Type S', hullKey: 'type-s-scout-courier', phase: 'outbound', hostileByDefault: true, reaction: 'x', reactionTotal: 4, systemId: 'aster', seedBase: 's', tollDemandCr: null } };
  const fought = applyAction(outbound, { type: 'fight' }, context).state;
  assert.equal(fought.halt.opponentInitiated, true);
  assert.deepEqual(listActions(fought, context).map((entry) => entry.how), ['continue', 'return']);
  const on = applyAction(fought, { type: 'resume', how: 'continue' }, context).state;
  assert.ok(['in-jump', 'halted', 'destroyed'].includes(on.situation));
  assert.equal(on.departure, null);
  const back = applyAction(fought, { type: 'resume', how: 'return' }, context).state;
  assert.equal(back.situation, 'port');
  assert.equal(back.departure, null);
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

test('v0.315.0 a boarding party is beaten off or paid off, and the ship is back in port either way', async () => {
  const trip = createTrip(await resolvedAt('aster', { financed: true }));
  const held = { ...trip, situation: 'halted', halt: { reason: 'repossession-boarding', detail: 'boarding', from: 'port' },
    ship: { ...trip.ship, state: { ...trip.ship.state, impound: { systemId: 'aster', since: '106-4800', form: 'boarding', arrearsCr: 0 } } } };
  assert.deepEqual(listActions(held, context).map((entry) => entry.how), ['repelled', 'pay']);
  const repelled = applyAction(held, { type: 'resume', how: 'repelled' }, context).state;
  assert.equal(repelled.situation, 'port');
  assert.equal(repelled.ship.state.impound, null);
  assert.equal(repelled.halt, null);
});

test('v0.315.6 a contract that fails on its deadline elsewhere releases its reserved hold on the next landing', async () => {
  const resolved = await resolvedAt('aster');
  const accepted = resolved.contracts.find((entry) => entry.status === 'accepted');
  const contract = { ...accepted, destination: { systemId: 'orison', systemName: 'Orison' }, requirements: { ...accepted.requirements, cargoTons: 5, exclusiveShip: false }, timing: { ...accepted.timing, deadlineDate: { year: 4800, dayOfYear: 100 } } };
  let trip = createTrip({ ...resolved, contracts: [contract] });
  trip.ship = loadCargo(trip.ship, { id: `${contract.identity.id}:cargo`, category: 'contract', description: 'reserved', tons: 5, originSystemId: 'aster', destinationSystemId: 'orison', acquisitionCostCr: 0 });
  trip = { ...trip, situation: 'in-jump', jump: { fromSystemId: 'aster', toSystemId: 'calder', startedOn: '106-4800', weeks: 1, weeksDone: 0, misjump: false, destroyed: false, landedHex: '0606', landedSystemId: 'calder' } };
  let result = applyAction(trip, { type: 'jump-week' }, context);
  while (result.state.situation === 'encounter') result = applyAction(result.state, { type: 'let-pass' }, context);
  assert.equal(result.state.situation, 'port');
  assert.equal(result.state.contracts[0].status, 'failed');
  assert.equal(result.state.ship.state.cargoManifest.some((entry) => entry.id === `${contract.identity.id}:cargo`), false);
});

test('v0.315.7 a pirate that attacks cannot be let pass: run or fight, and either is a fight', async () => {
  const trip = { ...createTrip(await resolvedAt('aster')), situation: 'encounter',
    departure: { fromSystemId: 'aster', toSystemId: 'calder', distance: 1, lane: true, leftOn: '106-4800' },
    encounter: { key: 'pirate', label: 'Pirate', hull: 'Type S', hullKey: 'type-s-scout-courier', phase: 'outbound', hostileByDefault: true,
      reaction: 'Hostile.', reactionTotal: 4, reactionDM: 0, systemId: 'aster', seedBase: 's', tollDemandCr: null, attacking: true, attackThrow: 'attack throw 9 against 8+' } };
  assert.deepEqual(listActions(trip, context).map((entry) => entry.type), ['run', 'fight']);
  assert.throws(() => applyAction(trip, { type: 'let-pass' }, context), /not legal/);
  const ran = applyAction(trip, { type: 'run' }, context).state;
  assert.equal(ran.halt.reason, 'ship-fight');
  assert.equal(ran.halt.running, true);
  assert.equal(createDefaultPolicy()(trip, listActions(trip, context), context).type, 'run');
  const holding = { ...trip, encounter: { ...trip.encounter, attacking: false } };
  assert.equal(listActions(holding, context)[0].type, 'let-pass', 'a pirate that holds off can still be let pass');
});

// ---------------------------------------------------------------- v0.320.0
import { MERIDIAN_REACH_SECTOR } from '../world/meridian-reach-sector.js';
import { sectorMap, getJumpDestinations as reachOf, jumpDistanceBetweenSystems } from '../vendor/classic-traveller-rules/index.js';

test('v0.320.0 Far Meridian sits at F in Meridian Reach: its worlds on sector hexes, its lanes and distances unchanged', () => {
  const map = sectorMap({ id: MERIDIAN_REACH_SECTOR.id, name: MERIDIAN_REACH_SECTOR.name, subsectors: { ...MERIDIAN_REACH_SECTOR.authored }, routes: MERIDIAN_REACH_SECTOR.routes });
  const sanTelmo = map.systems.find((system) => system.id === 'san-telmo');
  assert.deepEqual({ hex: sanTelmo.hex, localHex: sanTelmo.localHex, subsector: sanTelmo.subsector }, { hex: '1115', localHex: '0305', subsector: 'F' });
  assert.equal(map.systems.length, FAR_MERIDIAN_SUBSECTOR.systems.length);
  assert.equal(map.routes.length, FAR_MERIDIAN_SUBSECTOR.routes.length);
  for (const route of FAR_MERIDIAN_SUBSECTOR.routes) assert.equal(jumpDistanceBetweenSystems(map, route.from, route.to), route.distance);
  assert.deepEqual(reachOf(map, 'orison', 2).map((entry) => entry.system.id), reachOf(FAR_MERIDIAN_SUBSECTOR, 'orison', 2).map((entry) => entry.system.id));
});

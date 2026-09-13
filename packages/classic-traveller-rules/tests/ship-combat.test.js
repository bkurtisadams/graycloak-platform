import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  importCharacterDocument,
  createTypeSScoutReserveShipForCharacter,
  creditShipAccount,
  armShipTurret,
  purchaseOrdnance,
  createSequenceDice,
  createShipCombatEncounter,
  SHIP_COMBAT_PHASE_KEYS,
  currentPhase,
  actingSide,
  opposingSide,
  advanceShipCombatPhase,
  elapsedMinutes,
  getParticipant,
  computerState,
  computerCapacity,
  cycleIntoCpu,
  reprogramComputer,
  laserAttackDM,
  laserDefenseDM,
  allocateLaserFire,
  resolveLaserFire,
  returnFireEligibility,
  launchOrdnance,
  declareFlight,
  creditShotAgainstEscape,
  surrender,
  participantStatus,
  shipCombatOutcome,
  shipDataCard,
  shipStations,
  stationsAwaitingDeclaration,
  markStationReady,
  sideAwaitingDeclaration,
  computerOperatorOf,
  LASER_HIT_THROW,
  GAME_TURN_MINUTES,
  ABBREVIATED_SAND_DM_IS_RAW
} from '../index.js';

const here = path.dirname(fileURLToPath(import.meta.url));

async function armedScout({ weapons = ['beam-laser'], missiles = 0, sand = 0 } = {}) {
  const character = importCharacterDocument(
    JSON.parse(await readFile(path.join(here, 'fixtures', 'Hawkeye-v0.6.character.json'), 'utf8'))
  );
  let { ship } = createTypeSScoutReserveShipForCharacter(character);
  ship = creditShipAccount(ship, 10000000, { kind: 'capital', description: 'Fitting-out fund' });
  for (const weapon of weapons) ship = armShipTurret(ship, { turretId: 'T-1', weapon }).ship;
  if (missiles || sand) ship = purchaseOrdnance(ship, { missiles, sandCanisters: sand }).ship;
  return ship;
}

// A Model/1 holds 6 points: CPU 2 plus storage 4.
const SCOUT_LOADOUT = ['target', 'return-fire', 'predict-1', 'gunner-interact', 'auto-evade', 'launch'];

async function twoScoutEncounter(overrides = {}) {
  const pirate = await armedScout({ weapons: ['beam-laser', 'beam-laser'] });
  const trader = await armedScout({ weapons: ['pulse-laser'] });
  return createShipCombatEncounter({
    id: 'enc-1',
    campaignId: 'camp-1',
    // The pirate is the one intruding on an otherwise peaceful ship, whoever
    // arrived in the system first.
    intruderSide: 'intruder',
    intruderAssignmentNote: 'Pirate initiated the encounter',
    participants: [
      {
        shipId: 'pirate', name: 'Corsair', side: 'intruder', ship: pirate,
        carriedPrograms: SCOUT_LOADOUT,
        loadedPrograms: ['target', 'predict-1', 'gunner-interact', 'auto-evade'],
        stations: { pilot: 'npc-pirate-pilot', gunners: { 'T-1': 'npc-pirate-gunner' } },
        skills: { pilot: 1, gunnery: { 'T-1': 2 } },
        pressurisedSections: [],
        ...overrides.pirate
      },
      {
        shipId: 'trader', name: 'Suleiman', side: 'native', ship: trader,
        carriedPrograms: SCOUT_LOADOUT,
        loadedPrograms: ['target', 'return-fire', 'auto-evade'],
        stations: { pilot: 'pc-hawkeye', gunners: { 'T-1': 'pc-marisol' } },
        skills: { pilot: 2, gunnery: { 'T-1': 1 } },
        pressurisedSections: [],
        ...overrides.trader
      }
    ],
    ...overrides.encounter
  });
}

// ---------------------------------------------------------------------------
// Turn sequence
// ---------------------------------------------------------------------------

test('Book 2 p.23: five phases per player turn, two player turns per game turn', async () => {
  let encounter = await twoScoutEncounter();
  assert.deepEqual([...SHIP_COMBAT_PHASE_KEYS], ['movement', 'laser-fire', 'return-fire', 'ordnance-launch', 'reprogramming']);
  assert.equal(encounter.gameTurn, 1);
  assert.equal(encounter.phasingSide, 'intruder');

  const seen = [];
  for (let step = 0; step < 10; step += 1) {
    seen.push(`${encounter.phasingSide}:${currentPhase(encounter).key}`);
    encounter = advanceShipCombatPhase(encounter);
  }
  assert.deepEqual(seen, [
    'intruder:movement', 'intruder:laser-fire', 'intruder:return-fire', 'intruder:ordnance-launch', 'intruder:reprogramming',
    'native:movement', 'native:laser-fire', 'native:return-fire', 'native:ordnance-launch', 'native:reprogramming'
  ]);
  // The interphase ends the game turn.
  assert.equal(encounter.gameTurn, 2);
  assert.equal(encounter.phasingSide, 'intruder');
  assert.ok(encounter.log.some((entry) => entry.phase === 'interphase'));
  assert.equal(elapsedMinutes(encounter), GAME_TURN_MINUTES);
});

test('Book 2 p.23 phase C: return fire belongs to the NON-phasing side', async () => {
  let encounter = await twoScoutEncounter();
  assert.equal(actingSide(encounter), 'intruder');            // movement
  encounter = advanceShipCombatPhase(encounter);
  assert.equal(actingSide(encounter), 'intruder');            // laser fire
  encounter = advanceShipCombatPhase(encounter);
  // The third phase of the intruder's turn is the native returning fire.
  assert.equal(currentPhase(encounter).key, 'return-fire');
  assert.equal(actingSide(encounter), 'native');
  encounter = advanceShipCombatPhase(encounter);
  assert.equal(actingSide(encounter), 'intruder');            // ordnance
  assert.equal(opposingSide('intruder'), 'native');
});

test('an encounter needs two sides and an explicit intruder', async () => {
  const ship = await armedScout();
  assert.throws(() => createShipCombatEncounter({
    id: 'x',
    participants: [{ shipId: 'a', side: 'intruder', ship }]
  }), /at least two ships/);
  assert.throws(() => createShipCombatEncounter({
    id: 'x',
    participants: [
      { shipId: 'a', side: 'intruder', ship },
      { shipId: 'b', side: 'intruder', ship }
    ]
  }), /no ships on the native side/);
  // Vector mode is a later milestone and says so rather than half-working.
  assert.throws(() => createShipCombatEncounter({
    id: 'x', spatialMode: 'vector',
    participants: [{ shipId: 'a', side: 'intruder', ship }, { shipId: 'b', side: 'native', ship }]
  }), /vector mode is a later milestone/);
});

// ---------------------------------------------------------------------------
// Computer, in three tiers
// ---------------------------------------------------------------------------

test('Book 2 pp.24, 31: carried, in the computer, and running in the CPU are three things', async () => {
  const encounter = await twoScoutEncounter();
  const trader = getParticipant(encounter, 'trader');
  const state = computerState(trader);

  // The corrected Type S carries a Model/1: CPU 2, storage 4, so six points in
  // the computer at once.
  assert.equal(state.model, '1');
  assert.equal(state.cpu, 2);
  assert.equal(state.storage, 4);
  assert.equal(state.inComputerCapacity, 6);

  // Six programs are carried aboard; three are in the computer.
  assert.equal(state.carried.length, 6);
  assert.deepEqual([...state.loaded], ['target', 'return-fire', 'auto-evade']);
  assert.equal(state.loadedSpace, 3);
  assert.equal(state.freeSpace, 3);

  // Running is the CPU's two points, cycled in automatically per Book 2 p.30.
  const firing = cycleIntoCpu(trader, { required: ['target'], optional: ['predict-1', 'gunner-interact'] });
  assert.equal(firing.possible, true);
  // Neither Predict nor Gunner Interact is in the computer on this ship, so
  // Target runs alone and the other CPU point goes unused.
  assert.deepEqual([...firing.running], ['target']);

  // Returning fire spends the whole CPU on Target and Return Fire.
  const returning = cycleIntoCpu(trader, { required: ['target', 'return-fire'], optional: ['predict-1'] });
  assert.deepEqual([...returning.running], ['target', 'return-fire']);
  assert.equal(returning.used, returning.cpu);
});

test('a program not in the computer cannot cycle into the CPU', async () => {
  const encounter = await twoScoutEncounter();
  const trader = getParticipant(encounter, 'trader');
  // Launch is carried aboard but not in the computer.
  assert.ok(computerState(trader).carried.includes('launch'));
  const cycle = cycleIntoCpu(trader, { required: ['launch', 'target'] });
  assert.equal(cycle.possible, false);
  assert.deepEqual([...cycle.missing], ['launch']);
});

test('Book 2 p.23 phase E: the computer changes only in the reprogramming phase', async () => {
  let encounter = await twoScoutEncounter();
  assert.throws(() => reprogramComputer(encounter, { shipId: 'pirate', load: ['launch'] }), /cannot be reprogrammed in the Movement phase/);

  // Advance to the intruder's reprogramming phase.
  for (let step = 0; step < 4; step += 1) encounter = advanceShipCombatPhase(encounter);
  assert.equal(currentPhase(encounter).key, 'reprogramming');

  encounter = reprogramComputer(encounter, { shipId: 'pirate', load: ['launch'], unload: ['auto-evade'] });
  const loaded = computerState(getParticipant(encounter, 'pirate')).loaded;
  assert.ok(loaded.includes('launch'));
  assert.ok(!loaded.includes('auto-evade'));

  // The native cannot reprogram during the intruder's phase E.
  assert.throws(() => reprogramComputer(encounter, { shipId: 'trader', load: ['launch'] }), /not on the phasing side/);
  // Nor can a program be loaded that is not carried aboard.
  assert.throws(() => reprogramComputer(encounter, { shipId: 'pirate', load: ['ecm'] }), /not carried aboard/);
});

test('Book 2 p.16: the computer operator holds loadout authority', async () => {
  let encounter = await twoScoutEncounter();
  const pirate = getParticipant(encounter, 'pirate');
  // Defaults to the pilot, who is usually the captain.
  assert.equal(computerOperatorOf(pirate), 'npc-pirate-pilot');
  for (let step = 0; step < 4; step += 1) encounter = advanceShipCombatPhase(encounter);
  assert.throws(
    () => reprogramComputer(encounter, { shipId: 'pirate', load: ['launch'], actorId: 'npc-pirate-gunner' }),
    /only npc-pirate-pilot operates the computer/
  );
  const ok = reprogramComputer(encounter, { shipId: 'pirate', load: ['launch'], actorId: 'npc-pirate-pilot' });
  assert.ok(computerState(getParticipant(ok, 'pirate')).loaded.includes('launch'));
});

test('a loadout larger than the computer is refused at setup', async () => {
  const ship = await armedScout();
  // Seven points into a Model/1 that holds six.
  assert.throws(() => createShipCombatEncounter({
    id: 'x',
    participants: [
      {
        shipId: 'a', side: 'intruder', ship,
        carriedPrograms: ['target', 'return-fire', 'anti-missile', 'ecm'],
        loadedPrograms: ['target', 'return-fire', 'anti-missile', 'ecm']
      },
      { shipId: 'b', side: 'native', ship }
    ]
  }), /that holds 6/);
});

// ---------------------------------------------------------------------------
// Laser fire
// ---------------------------------------------------------------------------

test('Book 2 p.30: attack DMs come from the programs that actually run', async () => {
  const encounter = await twoScoutEncounter();
  const pirate = getParticipant(encounter, 'pirate');

  // Target is required; Predict-1 gives +1; Gunner Interact would add the
  // gunner's 2 — but a CPU of 2 cannot run Target plus both.
  const attack = laserAttackDM(pirate, 'T-1');
  assert.equal(attack.possible, true);
  assert.equal(attack.dm, 1);
  assert.deepEqual([...attack.running], ['target', 'predict-1']);

  // Returning fire, the CPU is full before any benefit applies.
  const returning = laserAttackDM(pirate, 'T-1', { returnFire: true });
  assert.equal(returning.possible, false);
  assert.deepEqual([...returning.missing], ['return-fire']);
});

test('Book 2 p.30: Maneuver/Evade scales with pilot expertise, Auto/Evade is a flat -2', async () => {
  const encounter = await twoScoutEncounter({
    trader: {
      carriedPrograms: [...SCOUT_LOADOUT, 'maneuver-evade-4'],
      loadedPrograms: ['target', 'maneuver-evade-4'],
      skills: { pilot: 3, gunnery: { 'T-1': 1 } }
    }
  });
  // Maneuver/Evade 4 is the full pilot expertise as a defensive DM.
  const evading = laserDefenseDM(getParticipant(encounter, 'trader'));
  assert.equal(evading.dm, -3);

  // The pirate carries Auto/Evade only.
  assert.equal(laserDefenseDM(getParticipant(encounter, 'pirate')).dm, -2);
});

test('Book 2 p.29: allocation is locked before anything fires, and damage is immediate', async () => {
  let encounter = await twoScoutEncounter();
  encounter = advanceShipCombatPhase(encounter);
  assert.equal(currentPhase(encounter).key, 'laser-fire');

  // Fire cannot be allocated to one's own side, or from the non-acting side.
  assert.throws(() => allocateLaserFire(encounter, [{ shipId: 'pirate', turretId: 'T-1', targetId: 'pirate' }]), /own side/);
  assert.throws(() => allocateLaserFire(encounter, [{ shipId: 'trader', turretId: 'T-1', targetId: 'pirate' }]), /not on the acting side/);

  encounter = allocateLaserFire(encounter, [{ shipId: 'pirate', turretId: 'T-1', targetId: 'trader' }]);
  assert.equal(encounter.fireAllocation.entries.length, 1);

  // Two beam lasers in the pirate's double turret: two throws. Forced hits,
  // then a computer location (total 5) for each.
  const dice = createSequenceDice([6, 6, 2, 3, 6, 6, 2, 3]);
  const resolved = resolveLaserFire(encounter, dice);
  assert.equal(resolved.shots.length, 2);
  assert.ok(resolved.shots.every((shot) => shot.hit));
  assert.equal(resolved.shots[0].target, LASER_HIT_THROW);
  // Damage landed on the ship immediately, in the same phase.
  const trader = getParticipant(resolved.encounter, 'trader');
  assert.equal(trader.ship.state.damage.computer, 2);
  assert.equal(resolved.encounter.fireAllocation, null);
});

test('Book 2 pp.29-30: return fire needs the programs, a live turret, and someone who fired at you', async () => {
  let encounter = await twoScoutEncounter();
  encounter = advanceShipCombatPhase(encounter);
  encounter = allocateLaserFire(encounter, [{ shipId: 'pirate', turretId: 'T-1', targetId: 'trader' }]);
  // Both shots miss, so the trader is undamaged and can answer.
  encounter = resolveLaserFire(encounter, createSequenceDice([1, 1, 1, 1])).encounter;
  encounter = advanceShipCombatPhase(encounter);
  assert.equal(currentPhase(encounter).key, 'return-fire');

  const eligibility = returnFireEligibility(getParticipant(encounter, 'trader'));
  assert.deepEqual([...eligibility.targets], ['pirate']);
  assert.equal(eligibility.programsAvailable, true);
  assert.equal(eligibility.eligible, true);

  // It may only be aimed at a ship which fired at it.
  encounter = allocateLaserFire(encounter, [{ shipId: 'trader', turretId: 'T-1', targetId: 'pirate' }]);
  assert.equal(encounter.fireAllocation.side, 'native');

  // The pirate has no Return Fire program in the computer, so on the native's
  // turn it gets nothing.
  assert.equal(returnFireEligibility(getParticipant(encounter, 'pirate')).programsAvailable, false);
});

test('Book 2 p.29: a ship whose turret is knocked out cannot return fire', async () => {
  let encounter = await twoScoutEncounter();
  encounter = advanceShipCombatPhase(encounter);
  encounter = allocateLaserFire(encounter, [{ shipId: 'pirate', turretId: 'T-1', targetId: 'trader' }]);
  // Two hits, both located on a turret (total 10) — the trader has exactly one.
  encounter = resolveLaserFire(encounter, createSequenceDice([6, 6, 5, 5, 6, 6, 5, 5])).encounter;

  const trader = getParticipant(encounter, 'trader');
  const eligibility = returnFireEligibility(trader);
  assert.deepEqual([...eligibility.liveTurrets], []);
  assert.equal(eligibility.eligible, false);
  // Book 2 has no destruction rule: the ship is toothless, not dead.
  const status = participantStatus(trader);
  assert.equal(status.toothless, true);
  assert.equal(status.adrift, false);
});

// ---------------------------------------------------------------------------
// Ordnance, flight and endings
// ---------------------------------------------------------------------------

test('Book 2 p.30: launching needs Launch and Target in the computer', async () => {
  const pirate = await armedScout({ weapons: ['beam-laser', 'missile-launcher'], missiles: 5, sand: 2 });
  const trader = await armedScout();
  let encounter = createShipCombatEncounter({
    id: 'enc-2', intruderSide: 'intruder',
    participants: [
      {
        shipId: 'pirate', side: 'intruder', ship: pirate,
        carriedPrograms: ['target', 'launch'], loadedPrograms: ['target', 'launch'],
        pressurisedSections: []
      },
      { shipId: 'trader', side: 'native', ship: trader, pressurisedSections: [] }
    ]
  });

  assert.throws(() => launchOrdnance(encounter, { shipId: 'pirate', missiles: 1 }), /cannot be launched in the Movement phase/);
  for (let step = 0; step < 3; step += 1) encounter = advanceShipCombatPhase(encounter);
  assert.equal(currentPhase(encounter).key, 'ordnance-launch');

  encounter = launchOrdnance(encounter, { shipId: 'pirate', missiles: 2, sandCanisters: 1 });
  const participant = getParticipant(encounter, 'pirate');
  assert.equal(participant.ship.state.armament.missiles, 3);
  assert.equal(participant.expenditure.missiles, 2);
  assert.equal(participant.sandDeployed, 1);

  // The sand DM is a Graycloak extension and says so.
  const defense = laserDefenseDM(participant);
  assert.equal(defense.dm, -3);
  assert.equal(defense.components.at(-1).raw, ABBREVIATED_SAND_DM_IS_RAW);
  assert.equal(ABBREVIATED_SAND_DM_IS_RAW, false);

  assert.throws(() => launchOrdnance(encounter, { shipId: 'pirate', missiles: 99 }), /not enough missiles/);
  assert.throws(() => launchOrdnance(encounter, { shipId: 'trader', missiles: 1 }), /missing launch, target/);
});

test('Book 2 p.37: fleeing is a referee ruling on how many shots remain', async () => {
  let encounter = await twoScoutEncounter();
  // The count is the referee's; no formula is supplied.
  assert.throws(() => declareFlight(encounter, { shipId: 'trader' }), /referee must state/);

  encounter = declareFlight(encounter, { shipId: 'trader', shotsBeforeEscape: 2, note: 'Running for the jump point' });
  const entry = encounter.log.at(-1);
  assert.equal(entry.kind, 'flight');
  assert.equal(entry.refereeRuling, true);
  assert.equal(entry.raw, false);

  encounter = creditShotAgainstEscape(encounter, 'trader');
  assert.equal(getParticipant(encounter, 'trader').escaped, false);
  encounter = creditShotAgainstEscape(encounter, 'trader');
  assert.equal(getParticipant(encounter, 'trader').escaped, true);
  assert.ok(encounter.log.some((event) => event.kind === 'escape'));
});

test('Book 2: a fight ends with a hulk, not a wreck', async () => {
  let encounter = await twoScoutEncounter();
  encounter = advanceShipCombatPhase(encounter);
  encounter = allocateLaserFire(encounter, [{ shipId: 'pirate', turretId: 'T-1', targetId: 'trader' }]);
  // One turret hit (10) and one maneuver drive hit (3): toothless and adrift.
  encounter = resolveLaserFire(encounter, createSequenceDice([6, 6, 5, 5, 6, 6, 1, 2])).encounter;

  const status = participantStatus(getParticipant(encounter, 'trader'));
  assert.equal(status.toothless, true);
  assert.equal(status.adrift, true);
  assert.equal(status.disabled, true);
  // The hull is intact and the crew are alive; the encounter is over.
  assert.equal(status.decompressed, false);
  assert.equal(encounter.outcome, 'disabled');
});

test('Book 2 p.35: a hull hit decompresses a pressurised section and throws for each occupant', async () => {
  const trader = await armedScout();
  const pirate = await armedScout({ weapons: ['beam-laser'] });
  let encounter = createShipCombatEncounter({
    id: 'enc-3', intruderSide: 'intruder',
    participants: [
      {
        shipId: 'pirate', side: 'intruder', ship: pirate,
        carriedPrograms: ['target'], loadedPrograms: ['target'], pressurisedSections: []
      },
      {
        shipId: 'trader', side: 'native', ship: trader,
        // Book 2 p.35: ships depressurise before combat whenever possible. This
        // one did not.
        pressurisedSections: ['bridge'],
        occupants: {
          bridge: [
            { actorId: 'pc-hawkeye', name: 'Hawkeye', vaccSuitAvailable: true, vaccSuitSkill: 1, dexterity: 8 },
            { actorId: 'pc-marisol', name: 'Marisol', vaccSuitAvailable: false }
          ]
        }
      }
    ]
  });

  encounter = advanceShipCombatPhase(encounter);
  encounter = allocateLaserFire(encounter, [{ shipId: 'pirate', turretId: 'T-1', targetId: 'trader' }]);
  // A hit (6,6), located on the hull (3,4), then a vacc suit throw for each of
  // the two occupants (Book 2 p.35).
  const resolved = resolveLaserFire(encounter, createSequenceDice([6, 6, 3, 4, 1, 1, 1, 1]));
  const shot = resolved.shots[0];
  assert.equal(shot.location, 'hull');
  assert.ok(shot.decompression);

  const [hawkeye, marisol] = shot.decompression.occupants;
  // Vacc suit to hand, plus expertise and dexterity: survives.
  assert.equal(hawkeye.survived, true);
  // No suit available: no throw saves her.
  assert.equal(marisol.survived, false);

  const participant = getParticipant(resolved.encounter, 'trader');
  assert.deepEqual(participant.casualties.map((entry) => entry.actorId), ['pc-marisol']);
  // The section is now open, so a second hull hit decompresses nothing further.
  assert.deepEqual([...participant.pressurisedSections], []);
});

// ---------------------------------------------------------------------------
// Stations and readiness
// ---------------------------------------------------------------------------

test('ready means a station has finished declaring, not that it gets a turn', async () => {
  let encounter = await twoScoutEncounter();
  const trader = getParticipant(encounter, 'trader');
  const stations = shipStations(trader);
  assert.deepEqual(stations.map((entry) => entry.station).sort(), ['computer', 'gunner:T-1', 'pilot']);
  assert.equal(stationsAwaitingDeclaration(trader).length, 3);

  encounter = markStationReady(encounter, 'trader', 'pilot');
  assert.equal(stationsAwaitingDeclaration(getParticipant(encounter, 'trader')).length, 2);
  const waiting = sideAwaitingDeclaration(encounter, 'native');
  assert.ok(waiting.every((entry) => entry.shipId === 'trader'));
  assert.ok(!waiting.some((entry) => entry.station === 'pilot'));

  // Readiness resets when the player turn does.
  for (let step = 0; step < 5; step += 1) encounter = advanceShipCombatPhase(encounter);
  assert.equal(stationsAwaitingDeclaration(getParticipant(encounter, 'trader')).length, 3);
});

test('an unmanned turret is not waited on', async () => {
  const encounter = await twoScoutEncounter({
    trader: { stations: { pilot: 'pc-hawkeye', gunners: {} } }
  });
  const stations = shipStations(getParticipant(encounter, 'trader'));
  assert.ok(!stations.some((entry) => entry.station.startsWith('gunner:')));
});

// ---------------------------------------------------------------------------
// Data card and outcome
// ---------------------------------------------------------------------------

test('Book 2 p.24: the data card states the six sections, turrets and computer', async () => {
  const encounter = await twoScoutEncounter();
  const card = shipDataCard(getParticipant(encounter, 'trader'));

  assert.equal(card.typeCode, 'S');
  assert.deepEqual(card.sections.map((entry) => entry.label), ['M-Drive', 'J-Drive', 'Power Plant']);
  assert.equal(card.sections[0].reading, 'A / G-2');
  assert.equal(card.sections[1].reading, 'A / Jump-2');
  assert.equal(card.fuel.capacityTons, 40);
  assert.equal(card.hold.capacityTons, 3);

  // Book 2 p.24 notation: the turret's weapon letters and its gunner.
  assert.equal(card.turrets[0].code, 'P');
  assert.equal(card.turrets[0].mount, 'double');
  assert.equal(card.turrets[0].gunnerSkill, 1);
  assert.equal(card.bridge.pilotSkill, 2);

  assert.equal(card.computer.model, '1');
  assert.equal(card.computer.cpu, 2);
  assert.equal(card.computer.storage, 4);
  // A/A/A can never Double Fire: the power plant is not a letter above.
  assert.equal(card.doubleFire, false);
});

test('the data card reads damage off the design rather than a stored rating', async () => {
  let encounter = await twoScoutEncounter();
  encounter = advanceShipCombatPhase(encounter);
  encounter = allocateLaserFire(encounter, [{ shipId: 'pirate', turretId: 'T-1', targetId: 'trader' }]);
  // A jump drive hit (total 4) and a fuel hit (total 9).
  encounter = resolveLaserFire(encounter, createSequenceDice([6, 6, 2, 2, 6, 6, 4, 5])).encounter;

  const card = shipDataCard(getParticipant(encounter, 'trader'));
  assert.equal(card.sections[1].reading, 'A DESTROYED');
  assert.equal(card.fuel.lostTons, 20);
  assert.equal(card.status.canJump, false);
});

test('the outcome is computed, not applied', async () => {
  let encounter = await twoScoutEncounter();
  encounter = advanceShipCombatPhase(encounter);
  encounter = allocateLaserFire(encounter, [{ shipId: 'pirate', turretId: 'T-1', targetId: 'trader' }]);
  encounter = resolveLaserFire(encounter, createSequenceDice([6, 6, 2, 3, 1, 1])).encounter;
  encounter = surrender(encounter, 'trader');

  const outcome = shipCombatOutcome(encounter);
  assert.equal(outcome.encounterId, 'enc-1');
  assert.equal(outcome.campaignId, 'camp-1');
  assert.equal(outcome.spatialMode, 'abbreviated');
  assert.equal(outcome.intruderSide, 'intruder');
  assert.equal(outcome.ships.length, 2);

  const traderOut = outcome.ships.find((entry) => entry.shipId === 'trader');
  // The write-back carries the ship as the fight left it plus what it spent.
  assert.equal(traderOut.ship.state.damage.computer, 1);
  assert.equal(traderOut.status.surrendered, true);
  assert.equal(traderOut.computer.model, '1');
  assert.ok(Array.isArray(traderOut.casualties));
  // Nothing has been written anywhere: the caller applies this in one
  // transaction, because a marker alone is not atomic.
  assert.ok(outcome.log.length > 0);
  // No positions or velocities exist in abbreviated mode.
  assert.equal('positions' in outcome, false);
});

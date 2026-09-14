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
  createShipDocument,
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
  cpuFireOptions,
  bestCpuFireChoice,
  laserDefenseDM,
  allocateLaserFire,
  resolveLaserFire,
  returnFireEligibility,
  launchOrdnance,
  moveOrdnance,
  ordnanceInFlight,
  resolveAntiMissileFire,
  detonateContactedOrdnance,
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

async function armedCruiser({ racks = 3, missiles = 6 } = {}) {
  // The Type C is the only standard design with enough hardpoints for a salvo:
  // eight triple turrets against the Scout's one double. Built from the design
  // rather than edited from another hull, which the canonical check refuses.
  let ship = createShipDocument({
    designKey: 'type-c-cruiser',
    id: `cruiser-${racks}`,
    name: 'Corsair',
    authority: {
      assignmentType: 'private-owner', controllingAuthority: 'Corsair',
      legalTitleHolder: 'Captain', legalTitleSourceStatus: 'referee-generated-encounter',
      characterOwnsShip: true, assignedCharacterId: 'npc-cap', assignedCharacterName: 'Captain',
      recallable: false, saleAllowed: true, useAsDesired: true, possessionAtServicePleasure: false,
      servicePrivileges: { freeFuelAtScoutBases: false, freeMaintenanceAtScoutBasesAtClassBStarports: false },
      operatorResponsibilities: { upkeep: true, crewCosts: true }
    },
    crewAssignments: [{ role: 'pilot', characterId: 'npc-cap', characterName: 'Captain' }]
  });
  ship = creditShipAccount(ship, 50000000, { kind: 'capital', description: 'Fitting-out fund' });
  for (let index = 0; index < racks; index += 1) {
    ship = armShipTurret(ship, { turretId: `T-${index + 1}`, weapon: 'missile-launcher', pricePerWeaponCr: 0 }).ship;
  }
  return purchaseOrdnance(ship, { missiles }).ship;
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

  // Target is required; Predict-1 gives +1; Gunner Interact gives the gunner's
  // 2 — and a CPU of 2 runs Target plus exactly one of them.
  //
  // v1.208.00: a fixed preference order put Predict first and so traded a
  // Gunner-2's +2 for Predict-1's +1. Book 2 p.31's own example has the player
  // "select between predict 1 or gunner interact... depending on which would
  // allow the greater benefit", so the options are reported and the default is
  // the best-value set that fits.
  const options = cpuFireOptions(pirate, 'T-1');
  assert.equal(options.cpu, 2);
  assert.equal(options.freeSpace, 1);
  assert.deepEqual(options.candidates.map((entry) => [entry.key, entry.dm]), [['predict-1', 1], ['gunner-interact', 2]]);

  const attack = laserAttackDM(pirate, 'T-1');
  assert.equal(attack.possible, true);
  assert.equal(attack.dm, 2);
  assert.deepEqual([...attack.running], ['target', 'gunner-interact']);

  // The player may still choose the other, which is the point of p.31.
  assert.equal(laserAttackDM(pirate, 'T-1', { chosen: ['predict-1'] }).dm, 1);
  // And may decline both.
  assert.equal(laserAttackDM(pirate, 'T-1', { chosen: [] }).dm, 0);
  // An unmanned turret gets nothing from Gunner Interact, so Predict wins.
  const unmanned = { ...pirate, skills: { ...pirate.skills, gunnery: {} } };
  assert.deepEqual([...bestCpuFireChoice(unmanned, 'T-1')], ['predict-1']);

  // Returning fire, the CPU is full before any benefit applies.
  const returning = laserAttackDM(pirate, 'T-1', { returnFire: true });
  assert.equal(returning.possible, false);
  assert.deepEqual([...returning.missing], ['return-fire']);
});

test('Book 2 p.30: Maneuver/Evade scales with pilot expertise, Auto/Evade is a flat -2', async () => {
  const encounter = await twoScoutEncounter({
    trader: {
      carriedPrograms: [...SCOUT_LOADOUT, 'maneuver-evade-2', 'maneuver-evade-4'],
      loadedPrograms: ['target', 'maneuver-evade-2'],
      skills: { pilot: 4, gunnery: { 'T-1': 1 } }
    }
  });
  // Maneuver/Evade 2 is half the pilot's expertise: pilot-4 gives -2.
  const evading = laserDefenseDM(getParticipant(encounter, 'trader'));
  assert.equal(evading.dm, -2);

  // Book 2 p.31: a program has to fit the CPU to run. Maneuver/Evade 4 is four
  // points against a Model/1's two, so a Type S can carry it and never use it.
  const overCapacity = await twoScoutEncounter({
    trader: {
      carriedPrograms: [...SCOUT_LOADOUT, 'maneuver-evade-4'],
      loadedPrograms: ['maneuver-evade-4'],
      skills: { pilot: 4, gunnery: { 'T-1': 1 } }
    }
  });
  assert.equal(laserDefenseDM(getParticipant(overCapacity, 'trader')).dm, 0);

  // And a ship already returning fire has spent its CPU on Target and Return
  // Fire, so it cannot also evade.
  assert.equal(laserDefenseDM(getParticipant(encounter, 'trader'), { alsoRunning: ['target', 'return-fire'] }).dm, 0);

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
  const pirate = await armedScout({ weapons: ['sandcaster', 'missile-launcher'], missiles: 5, sand: 2 });
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

  assert.throws(() => launchOrdnance(encounter, { shipId: 'pirate', missiles: 1, targetId: 'trader' }), /cannot be launched in the Movement phase/);
  for (let step = 0; step < 3; step += 1) encounter = advanceShipCombatPhase(encounter);
  assert.equal(currentPhase(encounter).key, 'ordnance-launch');

  // Book 2 p.18: a missile is committed to a specific target when fired.
  assert.throws(() => launchOrdnance(encounter, { shipId: 'pirate', missiles: 1 }), /committed to a specific target/);
  // Book 2 p.30: one round per rack and one canister per sandcaster, per phase.
  // This turret holds one of each.
  assert.throws(() => launchOrdnance(encounter, { shipId: 'pirate', missiles: 2, targetId: 'trader' }), /launch rack/);
  encounter = launchOrdnance(encounter, { shipId: 'pirate', missiles: 1, sandCanisters: 1, targetId: 'trader' });
  const participant = getParticipant(encounter, 'pirate');
  assert.equal(participant.ship.state.armament.missiles, 4);
  assert.equal(participant.expenditure.missiles, 1);
  assert.equal(participant.sandDeployed, 1);
  // And the rack is spent for the rest of this phase.
  assert.throws(() => launchOrdnance(encounter, { shipId: 'pirate', missiles: 1, targetId: 'trader' }), /0 launch racks free/);

  // The sand DM is a Graycloak extension and says so.
  const defense = laserDefenseDM(participant);
  assert.equal(defense.dm, -3);
  assert.equal(defense.components.at(-1).raw, ABBREVIATED_SAND_DM_IS_RAW);
  assert.equal(ABBREVIATED_SAND_DM_IS_RAW, false);

  assert.throws(() => launchOrdnance(encounter, { shipId: 'pirate', missiles: 99, targetId: 'trader' }), /not enough missiles/);
  assert.throws(() => launchOrdnance(encounter, { shipId: 'trader', missiles: 1, targetId: 'pirate' }), /missing launch, target/);
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

// ---------------------------------------------------------------------------
// Missiles across the phases (Book 2 pp.18, 30-31)
// ---------------------------------------------------------------------------

async function missileEncounter({ traderPrograms = ['target'], racks = 1, traderIsCruiser = false } = {}) {
  // Book 2 p.30 allows one round per rack per phase, so a salvo needs racks.
  // A Scout's single double turret holds two weapons; three racks needs a hull
  // with more hardpoints.
  const pirate = racks > 1
    ? await armedCruiser({ racks, missiles: 6 })
    : await armedScout({ weapons: ['beam-laser', 'missile-launcher'], missiles: 6 });
  // Book 2 p.31: ECM is three points, so a Model/1's CPU of 2 can carry it and
  // never run it. A ship meant to use ECM needs a bigger computer.
  const trader = traderIsCruiser
    ? await armedCruiser({ racks: 1, missiles: 1 })
    : await armedScout({ weapons: ['beam-laser'] });
  return createShipCombatEncounter({
    id: 'enc-missile', intruderSide: 'intruder',
    participants: [
      {
        shipId: 'pirate', name: 'Corsair', side: 'intruder', ship: pirate,
        carriedPrograms: ['target', 'launch'], loadedPrograms: ['target', 'launch'],
        pressurisedSections: []
      },
      {
        shipId: 'trader', name: 'Suleiman', side: 'native', ship: trader,
        carriedPrograms: [...new Set([...traderPrograms, 'target'])],
        loadedPrograms: traderPrograms,
        pressurisedSections: []
      }
    ]
  });
}

// Walks to a named phase of a named side, moving ordnance in each movement
// phase as Book 2 p.23 phase A requires.
function advanceTo(encounter, side, phaseKey) {
  let current = encounter;
  for (let step = 0; step < 40; step += 1) {
    if (current.phasingSide === side && currentPhase(current).key === phaseKey) return current;
    if (currentPhase(current).key === 'movement') current = moveOrdnance(current);
    current = advanceShipCombatPhase(current);
  }
  throw new Error(`never reached ${side}:${phaseKey}`);
}

test('Book 2 p.30: a missile is launched, flies a turn, contacts, then detonates', async () => {
  let encounter = await missileEncounter();
  encounter = advanceTo(encounter, 'intruder', 'ordnance-launch');
  encounter = launchOrdnance(encounter, { shipId: 'pirate', missiles: 1, targetId: 'trader' });

  let round = ordnanceInFlight(encounter)[0];
  assert.equal(round.status, 'in-flight');
  assert.equal(round.targetShipId, 'trader');
  assert.equal(round.launchedGameTurn, 1);
  // Contact is automatic in abbreviated mode, and the record says so.
  assert.equal(round.raw, false);

  // It does not move in the launching player turn — phase D comes after phase A.
  encounter = advanceShipCombatPhase(encounter);
  assert.equal(currentPhase(encounter).key, 'reprogramming');
  assert.equal(ordnanceInFlight(encounter)[0].status, 'in-flight');

  // The next friendly movement phase is the intruder's, one game turn later.
  encounter = advanceTo(encounter, 'intruder', 'movement');
  assert.equal(encounter.gameTurn, 2);
  encounter = moveOrdnance(encounter);
  assert.equal(ordnanceInFlight(encounter)[0].status, 'contact');
  assert.ok(encounter.log.some((entry) => entry.kind === 'ordnance-contact'));

  // It detonates in the launcher's ordnance launch phase: one die of hits,
  // each located at -4.
  encounter = advanceShipCombatPhase(encounter);   // laser fire
  encounter = advanceShipCombatPhase(encounter);   // return fire
  encounter = advanceShipCombatPhase(encounter);   // ordnance launch
  assert.equal(currentPhase(encounter).key, 'ordnance-launch');

  const dice = createSequenceDice([2, 1, 1, 1, 1]);
  const detonated = detonateContactedOrdnance(encounter, dice);
  assert.equal(detonated.detonations.length, 1);
  assert.equal(detonated.detonations[0].hitCount, 2);
  assert.equal(ordnanceInFlight(detonated.encounter)[0].status, 'detonated');
  // The -4 pushes both hits onto the power plant, which destroys an A plant.
  assert.equal(getParticipant(detonated.encounter, 'trader').ship.state.damage.powerPlant, 2);
});

test('Book 2 p.30: anti-missile fire happens in the phase that belongs to the target', async () => {
  let encounter = await missileEncounter({ traderPrograms: ['target', 'anti-missile'] });
  encounter = advanceTo(encounter, 'intruder', 'ordnance-launch');
  encounter = launchOrdnance(encounter, { shipId: 'pirate', missiles: 1, targetId: 'trader' });
  encounter = advanceTo(encounter, 'intruder', 'movement');
  encounter = moveOrdnance(encounter);

  // Phase C of the intruder's turn is the native's, which is exactly where the
  // target gets to shoot at what is about to hit it.
  encounter = advanceShipCombatPhase(encounter);   // laser fire
  encounter = advanceShipCombatPhase(encounter);   // return fire
  assert.equal(currentPhase(encounter).key, 'return-fire');
  assert.equal(actingSide(encounter), 'native');

  const result = resolveAntiMissileFire(encounter, createSequenceDice([5, 4]), { shipId: 'trader' });
  assert.equal(result.shots.length, 1);
  assert.equal(result.shots[0].target, 8);
  assert.equal(result.shots[0].hit, true);
  assert.deepEqual([...result.destroyed], ['m-1']);

  // Destroyed before it could explode, so phase D finds nothing.
  encounter = advanceShipCombatPhase(result.encounter);
  const detonated = detonateContactedOrdnance(encounter, createSequenceDice([1]));
  assert.equal(detonated.detonations.length, 0);
  assert.equal(getParticipant(detonated.encounter, 'trader').ship.state.damage.powerPlant, 0);
});

test('Book 2 p.30: a ship without the Anti-Missile program cannot shoot at missiles', async () => {
  let encounter = await missileEncounter({ traderPrograms: ['target'] });
  encounter = advanceTo(encounter, 'intruder', 'ordnance-launch');
  encounter = launchOrdnance(encounter, { shipId: 'pirate', missiles: 1, targetId: 'trader' });
  encounter = advanceTo(encounter, 'intruder', 'movement');
  encounter = moveOrdnance(encounter);
  encounter = advanceShipCombatPhase(encounter);
  encounter = advanceShipCombatPhase(encounter);

  const result = resolveAntiMissileFire(encounter, createSequenceDice([6, 6]), { shipId: 'trader' });
  assert.equal(result.shots.length, 0);
  assert.equal(result.ecm, null);
  assert.deepEqual([...result.destroyed], []);
});

test('Book 2 p.30: ECM clears every contacting missile at once on 7+', async () => {
  let encounter = await missileEncounter({ traderPrograms: ['target', 'ecm'], racks: 3, traderIsCruiser: true });
  encounter = advanceTo(encounter, 'intruder', 'ordnance-launch');
  encounter = launchOrdnance(encounter, { shipId: 'pirate', missiles: 3, targetId: 'trader' });
  encounter = advanceTo(encounter, 'intruder', 'movement');
  encounter = moveOrdnance(encounter);
  assert.equal(ordnanceInFlight(encounter, { status: 'contact' }).length, 3);
  encounter = advanceShipCombatPhase(encounter);
  encounter = advanceShipCombatPhase(encounter);

  // A 7 exactly: all three go without a laser being fired.
  const result = resolveAntiMissileFire(encounter, createSequenceDice([4, 3]), { shipId: 'trader' });
  assert.equal(result.ecm.cleared, true);
  assert.equal(result.ecm.target, 7);
  assert.equal(result.destroyed.length, 3);
  assert.equal(result.shots.length, 0);

  // A failed ECM throw leaves them all in contact.
  const failed = resolveAntiMissileFire(encounter, createSequenceDice([1, 1]), { shipId: 'trader' });
  assert.equal(failed.ecm.cleared, false);
  assert.equal(failed.destroyed.length, 0);
});

test('Book 2 p.18: a missile whose target escapes has nothing left to home on', async () => {
  let encounter = await missileEncounter();
  encounter = advanceTo(encounter, 'intruder', 'ordnance-launch');
  encounter = launchOrdnance(encounter, { shipId: 'pirate', missiles: 1, targetId: 'trader' });
  encounter = declareFlight(encounter, { shipId: 'trader', shotsBeforeEscape: 1 });
  encounter = creditShotAgainstEscape(encounter, 'trader');
  assert.equal(getParticipant(encounter, 'trader').escaped, true);

  encounter = advanceTo(encounter, 'intruder', 'movement');
  encounter = moveOrdnance(encounter);
  assert.equal(ordnanceInFlight(encounter)[0].status, 'spent');
});

test('ordnance does not move or detonate on the wrong side turn', async () => {
  let encounter = await missileEncounter();
  encounter = advanceTo(encounter, 'intruder', 'ordnance-launch');
  encounter = launchOrdnance(encounter, { shipId: 'pirate', missiles: 1, targetId: 'trader' });

  // The native's movement phase does not move the intruder's missile.
  encounter = advanceTo(encounter, 'native', 'movement');
  encounter = moveOrdnance(encounter);
  assert.equal(ordnanceInFlight(encounter)[0].status, 'in-flight');

  assert.throws(() => moveOrdnance(advanceShipCombatPhase(encounter)), /does not move in the Laser Fire phase/);
  assert.throws(
    () => resolveAntiMissileFire(encounter, createSequenceDice([1, 1]), { shipId: 'trader' }),
    /anti-missile fire happens in the return fire phase/
  );
});

test('the outcome carries ordnance still in flight', async () => {
  let encounter = await missileEncounter();
  encounter = advanceTo(encounter, 'intruder', 'ordnance-launch');
  encounter = launchOrdnance(encounter, { shipId: 'pirate', missiles: 1, targetId: 'trader' });
  const outcome = shipCombatOutcome(encounter);
  assert.equal(outcome.ordnance.length, 1);
  assert.equal(outcome.ordnance[0].status, 'in-flight');
  // The magazine was debited at launch, and the expenditure is recorded.
  const pirateOut = outcome.ships.find((entry) => entry.shipId === 'pirate');
  assert.equal(pirateOut.ship.state.armament.missiles, 5);
  assert.equal(pirateOut.expenditure.missiles, 1);
});

// ---------------------------------------------------------------------------
// Rules the suite passed without: an action has to be spendable, and a broken
// computer has to stop the ship.
// ---------------------------------------------------------------------------

test('Book 2 p.29: a laser fires once per phase, however often it is allocated', async () => {
  let encounter = await twoScoutEncounter();
  encounter = advanceShipCombatPhase(encounter);

  encounter = allocateLaserFire(encounter, [{ shipId: 'pirate', turretId: 'T-1', targetId: 'trader' }]);
  const first = resolveLaserFire(encounter, createSequenceDice([1, 1, 1, 1]));
  encounter = first.encounter;
  assert.equal(first.shots.filter((shot) => shot.fired).length, 2);

  // Allocating the same turret again in the same phase is accepted — a turret
  // may be reassigned — but it has nothing left to fire.
  encounter = allocateLaserFire(encounter, [{ shipId: 'pirate', turretId: 'T-1', targetId: 'trader' }]);
  const second = resolveLaserFire(encounter, createSequenceDice([6, 6, 6, 6]));
  assert.equal(second.shots.filter((shot) => shot.fired).length, 0);
  assert.match(second.shots[0].reason, /already fired this phase/);

  // A new phase restores it: from the intruder's laser fire, five advances
  // reach the native's.
  let next = second.encounter;
  for (let step = 0; step < 5; step += 1) next = advanceShipCombatPhase(next);
  assert.equal(currentPhase(next).key, 'laser-fire');
  assert.equal(next.phasingSide, 'native');
  next = allocateLaserFire(next, [{ shipId: 'trader', turretId: 'T-1', targetId: 'pirate' }]);
  assert.equal(resolveLaserFire(next, createSequenceDice([1, 1])).shots.filter((shot) => shot.fired).length, 1);
});

test('Book 2 p.34: a computer that cannot operate paralyses the ship', async () => {
  let encounter = await twoScoutEncounter();
  // Twelve hits is permanent malfunction.
  getParticipant(encounter, 'pirate').ship.state.damage.computer = 12;
  encounter = advanceShipCombatPhase(encounter);
  encounter = allocateLaserFire(encounter, [{ shipId: 'pirate', turretId: 'T-1', targetId: 'trader' }]);
  const dead = resolveLaserFire(encounter, createSequenceDice([6, 6, 6, 6]));
  assert.equal(dead.shots.every((shot) => !shot.fired), true);
  assert.match(dead.shots[0].reason, /permanently malfunctioning/);

  // Short of that it is a throw of 1+ with -1 per hit, made once per phase.
  let damaged = await twoScoutEncounter();
  getParticipant(damaged, 'pirate').ship.state.damage.computer = 4;
  damaged = advanceShipCombatPhase(damaged);
  damaged = allocateLaserFire(damaged, [{ shipId: 'pirate', turretId: 'T-1', targetId: 'trader' }]);
  // One die of 2, less 4 hits, is -2 against a target of 1.
  const failed = resolveLaserFire(damaged, createSequenceDice([2]));
  assert.equal(failed.shots[0].fired, false);
  assert.match(failed.shots[0].reason, /failed its throw to operate/);

  // Computer expertise is a positive DM on that throw (p.34).
  let skilled = await twoScoutEncounter();
  const pirate = getParticipant(skilled, 'pirate');
  pirate.ship.state.damage.computer = 4;
  pirate.skills.computer = 4;
  skilled = advanceShipCombatPhase(skilled);
  skilled = allocateLaserFire(skilled, [{ shipId: 'pirate', turretId: 'T-1', targetId: 'trader' }]);
  assert.equal(resolveLaserFire(skilled, createSequenceDice([1, 1, 1, 1])).shots[0].fired, true);
});

test('Book 2 p.30: one round per rack per phase, and a dead turret launches none', async () => {
  const pirate = await armedCruiser({ racks: 2, missiles: 6 });
  const trader = await armedScout();
  let encounter = createShipCombatEncounter({
    id: 'enc-racks', intruderSide: 'intruder',
    participants: [
      { shipId: 'pirate', side: 'intruder', ship: pirate,
        carriedPrograms: ['target', 'launch'], loadedPrograms: ['target', 'launch'], pressurisedSections: [] },
      { shipId: 'trader', side: 'native', ship: trader, pressurisedSections: [] }
    ]
  });
  for (let step = 0; step < 3; step += 1) encounter = advanceShipCombatPhase(encounter);

  // Two racks, so two rounds this phase and no more, however full the magazine.
  assert.throws(() => launchOrdnance(encounter, { shipId: 'pirate', missiles: 3, targetId: 'trader' }), /2 launch racks free/);
  encounter = launchOrdnance(encounter, { shipId: 'pirate', missiles: 2, targetId: 'trader' });
  assert.throws(() => launchOrdnance(encounter, { shipId: 'pirate', missiles: 1, targetId: 'trader' }), /0 launch racks free/);
  assert.equal(getParticipant(encounter, 'pirate').ship.state.armament.missiles, 4);

  // Book 2 p.33: a turret hit takes its launcher with it.
  const knocked = structuredClone(encounter);
  const participant = getParticipant(knocked, 'pirate');
  participant.spentThisPhase.launchers = 0;
  participant.ship.state.damage.turrets = ['T-1'];
  assert.throws(() => launchOrdnance(knocked, { shipId: 'pirate', missiles: 2, targetId: 'trader' }), /1 launch rack free/);
});

test('Book 2 p.37: a referee who allows no shots has let the ship go', async () => {
  let encounter = await twoScoutEncounter();
  encounter = declareFlight(encounter, { shipId: 'trader', shotsBeforeEscape: 0, note: 'Clean break' });
  const trader = getParticipant(encounter, 'trader');
  assert.equal(trader.fled, true);
  assert.equal(trader.escaped, true);
  assert.ok(encounter.log.some((entry) => entry.kind === 'escape'));
});

test('Book 2 p.30: two turrets on two targets need Multi-Target', async () => {
  // Two lasers in two turrets, so the ship can physically split its fire; the
  // question is whether the software allows it.
  let cruiser = createShipDocument({
    designKey: 'type-c-cruiser', id: 'splitter', name: 'Splitter',
    authority: {
      assignmentType: 'private-owner', controllingAuthority: 'Splitter',
      legalTitleHolder: 'Captain', legalTitleSourceStatus: 'referee-generated-encounter',
      characterOwnsShip: true, assignedCharacterId: 'npc-cap', assignedCharacterName: 'Captain',
      recallable: false, saleAllowed: true, useAsDesired: true, possessionAtServicePleasure: false,
      servicePrivileges: { freeFuelAtScoutBases: false, freeMaintenanceAtScoutBasesAtClassBStarports: false },
      operatorResponsibilities: { upkeep: true, crewCosts: true }
    },
    crewAssignments: [{ role: 'pilot', characterId: 'npc-cap', characterName: 'Captain' }]
  });
  cruiser = creditShipAccount(cruiser, 50000000, { kind: 'capital', description: 'Fitting-out fund' });
  for (const turretId of ['T-1', 'T-2']) {
    cruiser = armShipTurret(cruiser, { turretId, weapon: 'beam-laser', pricePerWeaponCr: 0 }).ship;
  }

  const build = (loaded) => createShipCombatEncounter({
    id: 'enc-split', intruderSide: 'intruder',
    participants: [
      { shipId: 'pirate', side: 'intruder', ship: cruiser, carriedPrograms: ['target', 'multi-target-2'], loadedPrograms: loaded, pressurisedSections: [] },
      { shipId: 'a', side: 'native', ship: cruiser, carriedPrograms: ['target'], loadedPrograms: ['target'], pressurisedSections: [] },
      { shipId: 'b', side: 'native', ship: cruiser, carriedPrograms: ['target'], loadedPrograms: ['target'], pressurisedSections: [] }
    ]
  });
  const split = [
    { shipId: 'pirate', turretId: 'T-1', targetId: 'a' },
    { shipId: 'pirate', turretId: 'T-2', targetId: 'b' }
  ];

  // Without Multi-Target in the computer, neither turret fires.
  let without = advanceShipCombatPhase(build(['target']));
  without = allocateLaserFire(without, split);
  const refused = resolveLaserFire(without, createSequenceDice([6, 6, 6, 6, 6, 6]));
  assert.equal(refused.shots.every((shot) => !shot.fired), true);
  assert.match(refused.shots[0].reason, /multi-target-2/);

  // With it, both do — and a Model/5 has the CPU to run it alongside Target.
  let withIt = advanceShipCombatPhase(build(['target', 'multi-target-2']));
  withIt = allocateLaserFire(withIt, split);
  const allowed = resolveLaserFire(withIt, createSequenceDice([1, 1, 1, 1]));
  assert.equal(allowed.shots.filter((shot) => shot.fired).length, 2);

  // Both turrets on one target needs none of it.
  let single = advanceShipCombatPhase(build(['target']));
  single = allocateLaserFire(single, [
    { shipId: 'pirate', turretId: 'T-1', targetId: 'a' },
    { shipId: 'pirate', turretId: 'T-2', targetId: 'a' }
  ]);
  assert.equal(resolveLaserFire(single, createSequenceDice([1, 1, 1, 1])).shots.filter((shot) => shot.fired).length, 2);
});

test('Book 2 p.30: interception is once per phase and contends for the CPU', async () => {
  let encounter = await missileEncounter({ traderPrograms: ['target', 'anti-missile'], racks: 1 });
  encounter = advanceTo(encounter, 'intruder', 'ordnance-launch');
  encounter = launchOrdnance(encounter, { shipId: 'pirate', missiles: 1, targetId: 'trader' });
  encounter = advanceTo(encounter, 'intruder', 'movement');
  encounter = moveOrdnance(encounter);
  encounter = advanceShipCombatPhase(encounter);
  encounter = advanceShipCombatPhase(encounter);
  assert.equal(currentPhase(encounter).key, 'return-fire');

  // A miss, so the round survives and could be shot at again.
  const first = resolveAntiMissileFire(encounter, createSequenceDice([1, 1]), { shipId: 'trader' });
  assert.equal(first.shots.length, 1);
  assert.equal(first.shots[0].hit, false);

  // p.30 allows the attempt once in the phase; a second pass fires nothing.
  const second = resolveAntiMissileFire(first.encounter, createSequenceDice([6, 6]), { shipId: 'trader' });
  assert.equal(second.shots.length, 0);
  assert.match(second.reason, /already been made this phase/);
});

test('Book 2 p.33: a hull hit decompresses the whole interior, not one section', async () => {
  const trader = await armedScout();
  const pirate = await armedScout({ weapons: ['beam-laser'] });
  let encounter = createShipCombatEncounter({
    id: 'enc-decomp', intruderSide: 'intruder',
    participants: [
      { shipId: 'pirate', side: 'intruder', ship: pirate,
        carriedPrograms: ['target'], loadedPrograms: ['target'], pressurisedSections: [] },
      {
        shipId: 'trader', side: 'native', ship: trader,
        // p.35 regulates these individually; this ship depressurised none.
        pressurisedSections: ['bridge', 'engineering', 'staterooms'],
        occupants: {
          bridge: [{ actorId: 'pc-hawkeye', name: 'Hawkeye', vaccSuitAvailable: true, vaccSuitSkill: 1, dexterity: 8 }],
          engineering: [{ actorId: 'npc-tam', name: 'Tam', vaccSuitAvailable: false }],
          // Already sealed into a suit before the shooting started, so the
          // p.35 throw — which is to get one ON — does not apply.
          staterooms: [{ actorId: 'pc-marisol', name: 'Marisol', vaccSuitWorn: true }]
        }
      }
    ]
  });

  encounter = advanceShipCombatPhase(encounter);
  encounter = allocateLaserFire(encounter, [{ shipId: 'pirate', turretId: 'T-1', targetId: 'trader' }]);
  // A hit located on the hull (3,4), then one throw for each exposed occupant.
  const resolved = resolveLaserFire(encounter, createSequenceDice([6, 6, 3, 4, 1, 1, 1, 1]));
  const event = resolved.shots[0].decompression;
  assert.ok(event);
  assert.deepEqual(event.sections.map((entry) => entry.section), ['bridge', 'engineering', 'staterooms']);

  const participant = getParticipant(resolved.encounter, 'trader');
  // Nothing is left pressurised: p.33 decompresses the interior.
  assert.deepEqual([...participant.pressurisedSections], []);
  // Suit to hand and the DMs to make 9+; no suit at all; already wearing one.
  assert.deepEqual(participant.casualties.map((entry) => entry.actorId), ['npc-tam']);
  assert.equal(event.occupants.find((entry) => entry.actorId === 'pc-marisol').alreadySuited, true);
});

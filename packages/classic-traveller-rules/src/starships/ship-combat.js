// ---------------------------------------------------------------------------
// Classic Traveller Book 2 pp.22-37 (1977): starship combat.
//
// Book 2 p.22: "Most battles, regardless of the number of ships or players
// participating, will involve only two sides. These two sides alternate player
// turns within a game turn." Each ten-minute game turn holds two player turns
// of five phases, then an interphase.
//
// Four of the five phases belong to the phasing side. The third does not:
// phase C is the NON-phasing side returning fire inside the phasing side's
// turn, and anti-missile fire happens there too. Collapsing the turn into a
// single round would delete return fire from the game.
//
// This module builds p.37's abbreviated ("non-miniatures") mode: shots are
// traded without regard to range, and when a ship elects to flee the referee
// states how many shots may still be made before it is out of range. There are
// no positions or velocities anywhere in it. Vector mode is a later milestone
// and adds spatial state rather than changing this sequence.
//
// Nothing here destroys a ship. Book 2 has no ship-destruction rule: a fight
// ends with a hulk, adrift or stranded, hull intact and crew alive.
// ---------------------------------------------------------------------------

import { requireDice } from '../dice.js';
import {
  COMPUTER_PROGRAMS,
  getComputerProgram,
  getComputerModel,
  getTurretWeapon
} from './components.js';
import {
  damageReport,
  operationalTurrets,
  turretOperational,
  canDoubleFire,
  hullDecompressed
} from './damage.js';
import { applyShipHit, applyMissileDetonation, assertValidShipDocument } from './ship-document.js';

export const SHIP_COMBAT_SIDES = Object.freeze(['intruder', 'native']);

// Book 2 p.23's game turn sequence. `actor` names whose phase it is: the
// phasing side for four of them, the opposing side for return fire.
export const SHIP_COMBAT_PHASES = Object.freeze([
  Object.freeze({ key: 'movement', label: 'Movement', actor: 'phasing' }),
  Object.freeze({ key: 'laser-fire', label: 'Laser Fire', actor: 'phasing' }),
  Object.freeze({ key: 'return-fire', label: 'Laser Return Fire', actor: 'opposing' }),
  Object.freeze({ key: 'ordnance-launch', label: 'Ordnance Launch', actor: 'phasing' }),
  Object.freeze({ key: 'reprogramming', label: 'Computer Reprogramming', actor: 'phasing' })
]);

export const SHIP_COMBAT_PHASE_KEYS = Object.freeze(SHIP_COMBAT_PHASES.map((phase) => phase.key));

// Book 2 p.22: each game turn is ten minutes.
export const GAME_TURN_MINUTES = 10;

// Book 2 p.29: "lf the modified result equals or exceeds 8, a hit has been
// achieved."
export const LASER_HIT_THROW = 8;

// Book 2 p.29: allocation is fixed before any ship fires, and "such allocation
// may be changed (shifted) if the target is destroyed before any weapons on the
// attacking ship have fired, but such a shift is subject to a DM of -6".
export const SHIFTED_FIRE_DM = -6;

// Book 2 p.30 laser fire DMs. Range DMs are spatial and have no meaning in
// abbreviated mode, which is why they are listed separately.
export const LASER_RANGE_DMS = Object.freeze([
  Object.freeze({ overInches: 300, dm: -5 }),
  Object.freeze({ overInches: 150, dm: -2 })
]);

// Book 2 p.30 prices sand as "-3 per 1/2 inch of obscuring sand", which is a
// measurement of a cloud on a playing surface. Abbreviated mode has no surface,
// so a canister is taken as one cloud at -3.
//
// GRAYCLOAK EXTENSION, not RAW: the book gives no per-canister figure. Labelled
// so it reads as a house ruling on screen rather than a printed rule.
export const ABBREVIATED_SAND_DM_PER_CANISTER = -3;
export const ABBREVIATED_SAND_DM_IS_RAW = false;

// ---------------------------------------------------------------------------
// Ordnance in flight.
//
// Book 2 sequences a missile across three phases, and the phase structure holds
// it without any help:
//
//   p.30, launch      — launched in the launcher's phase D; "The launched item
//                       does not actually move until the following friendly
//                       movement phase."
//   p.30, movement    — it moves, and contacts, in the launcher's next phase A.
//   p.30, return fire — "Anti-missile fire also takes place in the laser return
//                       fire phase... at enemy missiles which have contacted the
//                       ship during the preceding movement phase." Phase C
//                       belongs to the target, so its one chance to stop the
//                       missile falls in its own reactive phase.
//   p.30, launch      — "missiles or sand which contacted a target in the
//                       preceding movement phase now explode."
//
// GRAYCLOAK EXTENSION, not RAW: contact is automatic on arrival. In vector mode
// a missile has to cross the distance and may fail to reach its target at all;
// abbreviated mode has no distance, so flight is exactly one player-turn cycle
// and a missile always arrives. Flagged on the record.
export const ABBREVIATED_MISSILE_CONTACT_IS_AUTOMATIC = true;
export const ABBREVIATED_MISSILE_CONTACT_IS_RAW = false;

export const ORDNANCE_STATUSES = Object.freeze(['in-flight', 'contact', 'destroyed', 'detonated', 'spent']);

// Book 2 p.30 ECM: "all missiles in contact with the ship are destroyed without
// damage to the ship, on a throw of 7+."
export const ECM_DESTROY_THROW = 7;

// Book 2 gives anti-missile fire no throw of its own, so p.29's laser throw of
// 8+ applies, and p.30 is explicit that "other programs do not effect the
// functioning of these programs" — no Predict, no Gunner Interact, no target
// program needed.
export const ANTI_MISSILE_THROW = LASER_HIT_THROW;

export const SHIP_COMBAT_OUTCOMES = Object.freeze([
  'in-progress', 'disabled', 'escaped', 'surrendered', 'disengaged', 'referee-called'
]);

// Book 2 p.35: "The following parts of the ship may be individually regulated:
// engineering section, hold, bridge, staterooms (individually), turrets
// (individually)." Ships depressurise before combat whenever possible, and a
// depressurised section takes a hull hit without explosive decompression.
export const PRESSURE_SECTIONS = Object.freeze(['engineering', 'hold', 'bridge', 'staterooms', 'turrets']);

// Book 2 p.35: "Throw 9+ to put on an available vacc suit; DM + level of vacc
// suit expertise, and DM + dexterity of the individual."
export const VACC_SUIT_THROW = 9;

function freeze(value) {
  return JSON.parse(JSON.stringify(value));
}

function programSpace(keys) {
  return keys.reduce((sum, key) => sum + getComputerProgram(key).space, 0);
}

// ---------------------------------------------------------------------------
// Computer state, in the three tiers Book 2 actually distinguishes.
//
// p.24: the data card lists "the computer programs which are carried on board
// the ship" — the sample Type S carries twelve points' worth against a Model/1
// that holds six. So carried is unbounded.
//
// p.31: "The computer might have in it six programs... Of these six, only two
// (the capacity limit of the CPU) can function at any one time (in one phase)."
// So in-the-computer is CPU + storage, and it changes only in the reprogramming
// phase.
//
// p.30: "Both the target and return fire programs must be in the computer, but
// they cycle into the CPU only if actually used." Cycling is automatic per
// phase and costs nothing — which is exactly why the reprogramming phase
// matters: it governs what is available to cycle, not what runs.
// ---------------------------------------------------------------------------

export function computerCapacity(participant) {
  const model = getComputerModel(participant.ship.specifications.computer.model);
  return Object.freeze({
    model: model.model,
    cpu: model.cpu,
    storage: model.storage ?? 0,
    inComputerCapacity: model.cpu + (model.storage ?? 0)
  });
}

export function computerState(participant) {
  const capacity = computerCapacity(participant);
  const loaded = participant.computer.loaded;
  return Object.freeze({
    ...capacity,
    carried: Object.freeze([...participant.computer.carried]),
    loaded: Object.freeze([...loaded]),
    carriedSpace: programSpace(participant.computer.carried),
    loadedSpace: programSpace(loaded),
    freeSpace: capacity.inComputerCapacity - programSpace(loaded)
  });
}

export function programInComputer(participant, key) {
  return participant.computer.loaded.includes(key);
}

/**
 * The programs that cycle into the CPU for a given use, in priority order, and
 * whether they fit. Automatic per Book 2 p.30 — no declaration, no cost.
 *
 * `required` are the programs the activity cannot happen without; `optional`
 * are the benefits, taken in the order given until the CPU is full.
 */
export function cycleIntoCpu(participant, { required = [], optional = [] } = {}) {
  const { cpu } = computerCapacity(participant);
  const missing = required.filter((key) => !programInComputer(participant, key));
  if (missing.length) {
    return Object.freeze({ running: Object.freeze([]), missing: Object.freeze(missing), cpu, used: 0, possible: false });
  }
  const running = [...required];
  let used = programSpace(running);
  if (used > cpu) {
    return Object.freeze({ running: Object.freeze([]), missing: Object.freeze([]), cpu, used, possible: false });
  }
  for (const key of optional) {
    if (!programInComputer(participant, key)) continue;
    const space = getComputerProgram(key).space;
    if (used + space > cpu) continue;
    running.push(key);
    used += space;
  }
  return Object.freeze({ running: Object.freeze(running), missing: Object.freeze([]), cpu, used, possible: true });
}

// ---------------------------------------------------------------------------
// Encounter construction
// ---------------------------------------------------------------------------

function createParticipant({
  shipId,
  name = '',
  side,
  ship,
  carriedPrograms = [],
  loadedPrograms = [],
  stations = {},
  skills = {},
  pressurisedSections = [...PRESSURE_SECTIONS],
  occupants = {}
} = {}) {
  if (!SHIP_COMBAT_SIDES.includes(side)) throw new RangeError(`unknown side: ${side}`);
  assertValidShipDocument(ship);
  for (const key of [...carriedPrograms, ...loadedPrograms]) getComputerProgram(key);
  for (const key of loadedPrograms) {
    if (!carriedPrograms.includes(key)) throw new RangeError(`${key} is loaded but not carried aboard`);
  }
  const participant = {
    id: shipId,
    name: name || ship.identity.name || shipId,
    side,
    ship: freeze(ship),
    computer: { carried: [...carriedPrograms], loaded: [...loadedPrograms] },
    // Stations: { pilot, computerOperator, engineer, gunners: { 'T-1': actorId } }
    stations: {
      pilot: stations.pilot ?? null,
      computerOperator: stations.computerOperator ?? stations.pilot ?? null,
      engineer: stations.engineer ?? null,
      gunners: { ...(stations.gunners ?? {}) }
    },
    // Expertise by station, so a doubled-up crewman's lost DMs are the caller's
    // business (Book 2 p.17) rather than inferred here.
    skills: { pilot: 0, computer: 0, engineering: 0, gunnery: {}, ...skills },
    pressurisedSections: [...pressurisedSections],
    occupants: { ...occupants },
    ready: {},
    fled: false,
    shotsRemainingBeforeEscape: null,
    escaped: false,
    surrendered: false,
    sandDeployed: 0,
    firedAt: [],
    wasFiredAtBy: [],
    expenditure: { missiles: 0, sandCanisters: 0 },
    casualties: [],
    decompressionEvents: []
  };
  const capacity = computerCapacity(participant);
  const loadedSpace = programSpace(loadedPrograms);
  if (loadedSpace > capacity.inComputerCapacity) {
    throw new RangeError(`${participant.name} loads ${loadedSpace} points into a Model/${capacity.model} that holds ${capacity.inComputerCapacity}`);
  }
  return participant;
}

/**
 * Book 2 p.22 names the two sides intruder and native "for convenience" and
 * never says which is which, so `intruderSide` is required rather than
 * inferred. The intruder acts first in every game turn and there is no
 * initiative throw anywhere in the 1977 books — which matters, because p.29
 * imposes damage immediately and a ship disabled during laser fire cannot
 * return fire at all.
 */
export function createShipCombatEncounter({
  id,
  campaignId = null,
  participants = [],
  intruderSide = 'intruder',
  spatialMode = 'abbreviated',
  intruderAssignmentNote = ''
} = {}) {
  if (typeof id !== 'string' || !id.trim()) throw new TypeError('an encounter id is required');
  if (spatialMode !== 'abbreviated') throw new RangeError(`unsupported spatial mode: ${spatialMode} (vector mode is a later milestone)`);
  if (!SHIP_COMBAT_SIDES.includes(intruderSide)) throw new RangeError(`unknown intruder side: ${intruderSide}`);
  const built = participants.map(createParticipant);
  if (built.length < 2) throw new RangeError('a ship combat encounter needs at least two ships');
  for (const side of SHIP_COMBAT_SIDES) {
    if (!built.some((entry) => entry.side === side)) throw new RangeError(`no ships on the ${side} side`);
  }
  return {
    id: id.trim(),
    campaignId,
    spatialMode,
    // Recorded rather than derived: the proposal is visible and the referee may
    // override it. A pirate ambushing a merchant is intruding whoever arrived
    // first, which is why arrival does not decide this.
    intruderSide,
    intruderAssignmentNote,
    gameTurn: 1,
    phasingSide: 'intruder',
    phaseIndex: 0,
    fireAllocation: null,
    ordnance: [],
    ordnanceSequence: 0,
    participants: built,
    outcome: 'in-progress',
    log: []
  };
}

export function currentPhase(encounter) {
  return SHIP_COMBAT_PHASES[encounter.phaseIndex];
}

export function opposingSide(side) {
  return side === 'intruder' ? 'native' : 'intruder';
}

/**
 * The side that acts in the current phase. Four phases belong to the phasing
 * side; return fire belongs to the other one.
 */
export function actingSide(encounter) {
  const phase = currentPhase(encounter);
  return phase.actor === 'phasing' ? encounter.phasingSide : opposingSide(encounter.phasingSide);
}

export function participantsOnSide(encounter, side) {
  return encounter.participants.filter((entry) => entry.side === side);
}

export function getParticipant(encounter, shipId) {
  const found = encounter.participants.find((entry) => entry.id === shipId);
  if (!found) throw new RangeError(`no ship ${shipId} in this encounter`);
  return found;
}

function logEvent(encounter, entry) {
  encounter.log.push({
    gameTurn: encounter.gameTurn,
    phasingSide: encounter.phasingSide,
    phase: currentPhase(encounter).key,
    ...entry
  });
}

/**
 * Advances one phase, then one player turn, then the game turn. The interphase
 * is the boundary at the end of the native reprogramming phase.
 */
export function advanceShipCombatPhase(encounter) {
  const next = freeze(encounter);
  next.log = encounter.log.map((entry) => ({ ...entry }));

  // Fire allocation is locked for one laser fire phase only.
  next.fireAllocation = null;
  if (currentPhase(encounter).key === 'laser-fire') {
    // Return fire may only be directed at a ship which fired at this ship in
    // the immediately previous fire phase, so the record does not outlive it.
    for (const participant of next.participants) {
      if (participant.side !== opposingSide(encounter.phasingSide)) participant.wasFiredAtBy = [];
    }
  }
  if (currentPhase(encounter).key === 'return-fire') {
    for (const participant of next.participants) participant.wasFiredAtBy = [];
  }

  if (next.phaseIndex < SHIP_COMBAT_PHASES.length - 1) {
    next.phaseIndex += 1;
    return next;
  }

  next.phaseIndex = 0;
  for (const participant of next.participants) {
    participant.ready = {};
    participant.firedAt = [];
  }
  if (next.phasingSide === 'intruder') {
    next.phasingSide = 'native';
    return next;
  }
  // Game turn interphase.
  next.phasingSide = 'intruder';
  next.gameTurn += 1;
  next.log.push({
    gameTurn: encounter.gameTurn,
    phasingSide: null,
    phase: 'interphase',
    kind: 'interphase',
    description: `Game turn ${encounter.gameTurn} ends (${GAME_TURN_MINUTES} minutes elapsed)`
  });
  return next;
}

export function elapsedMinutes(encounter) {
  return (encounter.gameTurn - 1) * GAME_TURN_MINUTES;
}

// ---------------------------------------------------------------------------
// Stations and readiness
//
// "Ready" means a station has finished its declarations for this player turn,
// not that it gets an individual turn. A station with no assigned actor is not
// waited on: the Type C cruiser has eight gunners and no table has eight
// players, so an unmanned turret falls through to whatever tactics the caller
// supplies.
// ---------------------------------------------------------------------------

export function shipStations(participant) {
  const stations = [];
  if (participant.stations.pilot) stations.push({ station: 'pilot', actorId: participant.stations.pilot });
  if (participant.stations.engineer) stations.push({ station: 'engineer', actorId: participant.stations.engineer });
  if (participant.stations.computerOperator) {
    stations.push({ station: 'computer', actorId: participant.stations.computerOperator });
  }
  for (const [turretId, actorId] of Object.entries(participant.stations.gunners)) {
    if (actorId) stations.push({ station: `gunner:${turretId}`, actorId });
  }
  return Object.freeze(stations);
}

/**
 * Book 2 p.16: "The starship captain is usually the pilot or navigator." The
 * computer operator defaults to the pilot and holds loadout authority; other
 * crew may ask, which is a conversation rather than a mechanism.
 */
export function computerOperatorOf(participant) {
  return participant.stations.computerOperator;
}

export function stationsAwaitingDeclaration(participant) {
  return Object.freeze(shipStations(participant).filter((entry) => !participant.ready[entry.station]));
}

export function markStationReady(encounter, shipId, station) {
  const next = freeze(encounter);
  next.log = encounter.log.map((entry) => ({ ...entry }));
  getParticipant(next, shipId).ready[station] = true;
  return next;
}

export function sideAwaitingDeclaration(encounter, side) {
  return Object.freeze(
    participantsOnSide(encounter, side)
      .filter((participant) => !participant.escaped && !participant.surrendered)
      .flatMap((participant) => stationsAwaitingDeclaration(participant).map((entry) => ({ shipId: participant.id, ...entry })))
  );
}

// ---------------------------------------------------------------------------
// Laser fire
// ---------------------------------------------------------------------------

/**
 * The attack DM for one turret firing, assembled from Book 2 p.30 plus the
 * programs that can actually cycle into the CPU this phase.
 */
export function laserAttackDM(participant, turretId, { returnFire = false, multipleTargets = false } = {}) {
  const gunnerSkill = participant.skills.gunnery?.[turretId] ?? 0;
  const required = ['target'];
  if (returnFire) required.push('return-fire');
  if (multipleTargets) required.push('multi-target-2');
  // Predict and Gunner Interact are the benefits, best first. A Model/1
  // returning fire spends its whole CPU on Target and Return Fire and gets
  // neither.
  const optional = ['predict-5', 'predict-4', 'predict-3', 'predict-2', 'predict-1', 'gunner-interact'];
  const cycle = cycleIntoCpu(participant, { required, optional });
  if (!cycle.possible) {
    return Object.freeze({ possible: false, missing: cycle.missing, dm: 0, running: cycle.running, components: Object.freeze([]) });
  }

  const components = [];
  let dm = 0;
  for (const key of cycle.running) {
    const program = COMPUTER_PROGRAMS[key];
    if (Number.isFinite(program.attackDM) && program.attackDM !== 0) {
      dm += program.attackDM;
      components.push({ label: program.label, dm: program.attackDM });
    }
    if (key === 'gunner-interact' && gunnerSkill) {
      dm += gunnerSkill;
      components.push({ label: `Gunner Interact (gunner-${gunnerSkill})`, dm: gunnerSkill });
    }
  }
  return Object.freeze({
    possible: true,
    missing: Object.freeze([]),
    running: cycle.running,
    dm,
    components: Object.freeze(components)
  });
}

/**
 * The defence DM for a target, from Book 2 p.30. Range DMs are omitted in
 * abbreviated mode because there is no range to measure; the sand figure is a
 * labelled Graycloak extension for the same reason.
 */
export function laserDefenseDM(participant) {
  const components = [];
  let dm = 0;
  const pilotSkill = participant.skills.pilot ?? 0;
  const evade = ['maneuver-evade-6', 'maneuver-evade-5', 'maneuver-evade-4', 'maneuver-evade-3', 'maneuver-evade-2', 'maneuver-evade-1']
    .find((key) => programInComputer(participant, key));
  if (evade) {
    const program = COMPUTER_PROGRAMS[evade];
    const value = Number.isFinite(program.defenseDM)
      ? program.defenseDM
      : -Math.floor(pilotSkill * program.pilotExpertiseRate);
    if (value) {
      dm += value;
      components.push({ label: `${program.label} (pilot-${pilotSkill})`, dm: value });
    }
  } else if (programInComputer(participant, 'auto-evade')) {
    dm += COMPUTER_PROGRAMS['auto-evade'].defenseDM;
    components.push({ label: 'Auto/Evade', dm: COMPUTER_PROGRAMS['auto-evade'].defenseDM });
  }
  if (participant.sandDeployed > 0) {
    const value = participant.sandDeployed * ABBREVIATED_SAND_DM_PER_CANISTER;
    dm += value;
    components.push({ label: `Obscuring sand x${participant.sandDeployed}`, dm: value, raw: ABBREVIATED_SAND_DM_IS_RAW });
  }
  return Object.freeze({ dm, components: Object.freeze(components) });
}

/**
 * Book 2 p.29: "Each firing ship must allocate its fire to a specific target
 * before any ship has actually fired." Allocation is locked side-wide first,
 * and only then is anything resolved.
 */
export function allocateLaserFire(encounter, allocations) {
  const phase = currentPhase(encounter);
  if (phase.key !== 'laser-fire' && phase.key !== 'return-fire') {
    throw new Error(`fire cannot be allocated in the ${phase.label} phase`);
  }
  const side = actingSide(encounter);
  const next = freeze(encounter);
  next.log = encounter.log.map((entry) => ({ ...entry }));
  const locked = [];
  for (const allocation of allocations) {
    const attacker = getParticipant(next, allocation.shipId);
    if (attacker.side !== side) throw new Error(`${attacker.name} is not on the acting side`);
    const target = getParticipant(next, allocation.targetId);
    if (target.side === attacker.side) throw new Error('a ship cannot allocate fire to its own side');
    if (!turretOperational(attacker.ship, allocation.turretId)) {
      throw new Error(`turret ${allocation.turretId} on ${attacker.name} is out of action`);
    }
    if (phase.key === 'return-fire' && !attacker.wasFiredAtBy.includes(allocation.targetId)) {
      throw new Error(`${attacker.name} may only return fire at a ship which fired at it in the previous phase`);
    }
    locked.push({ shipId: allocation.shipId, turretId: allocation.turretId, targetId: allocation.targetId, shifted: false });
  }
  next.fireAllocation = { side, phase: phase.key, entries: locked };
  return next;
}

function turretLasers(participant, turretId) {
  const turret = participant.ship.state.armament.turrets.find((entry) => entry.id === turretId);
  return (turret?.weapons ?? []).filter((key) => getTurretWeapon(key).fires === 'laser');
}

/**
 * Resolves the locked allocation. Book 2 p.29: the throw is made once for each
 * firing laser weapon, hits are located immediately, and return fire in the
 * following phase may only be conducted by ships still capable of it.
 */
export function resolveLaserFire(encounter, dice) {
  requireDice(dice);
  const allocation = encounter.fireAllocation;
  if (!allocation) throw new Error('no fire has been allocated');
  const phase = currentPhase(encounter);
  if (allocation.phase !== phase.key) throw new Error('the allocation was made in a different phase');

  let next = freeze(encounter);
  next.log = encounter.log.map((entry) => ({ ...entry }));
  const shots = [];

  for (const entry of allocation.entries) {
    const attacker = getParticipant(next, entry.shipId);
    const target = getParticipant(next, entry.targetId);
    if (target.escaped) continue;
    if (!turretOperational(attacker.ship, entry.turretId)) continue;

    const attack = laserAttackDM(attacker, entry.turretId, { returnFire: phase.key === 'return-fire' });
    if (!attack.possible) {
      shots.push(Object.freeze({
        shipId: entry.shipId, turretId: entry.turretId, targetId: entry.targetId,
        fired: false, reason: `missing ${attack.missing.join(', ')}`
      }));
      continue;
    }
    const defense = laserDefenseDM(target);

    for (const weaponKey of turretLasers(attacker, entry.turretId)) {
      const weapon = getTurretWeapon(weaponKey);
      const roll = dice.roll2D6();
      const dm = attack.dm + defense.dm + weapon.attackDM + (entry.shifted ? SHIFTED_FIRE_DM : 0);
      const total = roll.total + dm;
      const hit = total >= LASER_HIT_THROW;
      const shot = {
        shipId: entry.shipId,
        turretId: entry.turretId,
        targetId: entry.targetId,
        weapon: weaponKey,
        fired: true,
        dice: [...roll.dice],
        roll: roll.total,
        dm,
        total,
        hit,
        target: LASER_HIT_THROW,
        components: [
          ...attack.components,
          ...defense.components,
          ...(weapon.attackDM ? [{ label: weapon.label, dm: weapon.attackDM }] : []),
          ...(entry.shifted ? [{ label: 'Shifted fire', dm: SHIFTED_FIRE_DM }] : [])
        ]
      };
      if (hit) {
        // p.29: hits are imposed on the target ship immediately.
        const located = applyShipHit(target.ship, dice);
        target.ship = freeze(located.ship);
        shot.location = located.location;
        shot.turretHit = located.turretId;
        if (located.location === 'hull') {
          const decompression = resolveDecompression(target, dice);
          if (decompression) shot.decompression = decompression;
        }
      }
      if (!target.wasFiredAtBy.includes(entry.shipId)) target.wasFiredAtBy.push(entry.shipId);
      if (!attacker.firedAt.includes(entry.targetId)) attacker.firedAt.push(entry.targetId);
      shots.push(Object.freeze(shot));
    }
  }

  for (const shot of shots) {
    logEvent(next, { kind: 'laser-fire', ...shot });
  }
  next.fireAllocation = null;
  next = applyDisabledOutcomes(next);
  return Object.freeze({ encounter: next, shots: Object.freeze(shots) });
}

/**
 * Book 2 p.35: a hull hit causes explosive decompression if pressure has not
 * already been lowered, killing everyone in the section unless a vacc suit is
 * available and put on immediately — throw 9+, DM + vacc suit expertise and
 * + dexterity. Recorded per occupant so closing combat cannot discard it.
 *
 * A depressurised ship takes the hit without any of this, which is why p.35
 * says ships depressurise before combat whenever possible.
 */
function resolveDecompression(participant, dice, { section = 'bridge' } = {}) {
  if (!participant.pressurisedSections.includes(section)) return null;
  participant.pressurisedSections = participant.pressurisedSections.filter((entry) => entry !== section);
  const occupants = participant.occupants[section] ?? [];
  const results = occupants.map((occupant) => {
    const roll = dice.roll2D6();
    const dm = (occupant.vaccSuitSkill ?? 0) + (occupant.dexterity ?? 0);
    const total = roll.total + dm;
    const survived = Boolean(occupant.vaccSuitAvailable) && total >= VACC_SUIT_THROW;
    if (!survived) participant.casualties.push({ actorId: occupant.actorId, name: occupant.name ?? occupant.actorId, section });
    return Object.freeze({
      actorId: occupant.actorId,
      name: occupant.name ?? occupant.actorId,
      vaccSuitAvailable: Boolean(occupant.vaccSuitAvailable),
      dice: Object.freeze([...roll.dice]),
      total,
      target: VACC_SUIT_THROW,
      survived
    });
  });
  const event = Object.freeze({ section, occupants: Object.freeze(results) });
  participant.decompressionEvents.push(event);
  return event;
}

// ---------------------------------------------------------------------------
// Return fire eligibility
// ---------------------------------------------------------------------------

/**
 * Book 2 p.30: both Target and Return Fire must be in the computer, return fire
 * may only be directed at a ship which fired at this one in the preceding
 * phase, and p.29 limits it to ships "capable of doing so after this phase" —
 * so a ship whose only turret was knocked out in the fire phase gets nothing.
 */
export function returnFireEligibility(participant) {
  const targets = [...participant.wasFiredAtBy];
  const cycle = cycleIntoCpu(participant, { required: ['target', 'return-fire'] });
  const liveTurrets = operationalTurrets(participant.ship)
    .filter((turretId) => turretLasers(participant, turretId).length > 0);
  const needsMultiTarget = targets.length > 1;
  return Object.freeze({
    targets: Object.freeze(targets),
    programsAvailable: cycle.possible,
    missingPrograms: cycle.missing,
    liveTurrets: Object.freeze(liveTurrets),
    needsMultiTarget,
    hasMultiTarget: programInComputer(participant, 'multi-target-2'),
    eligible: targets.length > 0 && cycle.possible && liveTurrets.length > 0
  });
}

// ---------------------------------------------------------------------------
// Ordnance
// ---------------------------------------------------------------------------

/**
 * Book 2 p.30: missiles or sand may be launched "provided both launch and
 * target programs are running", one round per rack or sandcaster.
 */
export function launchOrdnance(encounter, { shipId, missiles = 0, sandCanisters = 0, targetId = null } = {}) {
  const phase = currentPhase(encounter);
  if (phase.key !== 'ordnance-launch') throw new Error(`ordnance cannot be launched in the ${phase.label} phase`);
  const next = freeze(encounter);
  next.log = encounter.log.map((entry) => ({ ...entry }));
  const participant = getParticipant(next, shipId);
  const cycle = cycleIntoCpu(participant, { required: ['launch', 'target'] });
  if (!cycle.possible) throw new Error(`${participant.name} cannot launch: missing ${cycle.missing.join(', ') || 'CPU capacity'}`);
  if (missiles > participant.ship.state.armament.missiles) throw new RangeError('not enough missiles aboard');
  if (sandCanisters > participant.ship.state.armament.sandCanisters) throw new RangeError('not enough sand aboard');

  // Book 2 p.18: "Such missiles are committed to a specific target when fired,
  // and after launch, home towards that target until either the missile or the
  // target is destroyed." So a missile needs a target at launch; sand does not,
  // being dispensed into the path of whatever is shooting.
  let target = null;
  if (missiles > 0) {
    if (!targetId) throw new TypeError('a missile is committed to a specific target when fired (Book 2 p.18)');
    target = getParticipant(next, targetId);
    if (target.side === participant.side) throw new Error('a missile cannot be committed to its own side');
  }

  participant.ship.state.armament.missiles -= missiles;
  participant.ship.state.armament.sandCanisters -= sandCanisters;
  participant.expenditure.missiles += missiles;
  participant.expenditure.sandCanisters += sandCanisters;
  participant.sandDeployed += sandCanisters;

  for (let index = 0; index < missiles; index += 1) {
    next.ordnanceSequence += 1;
    next.ordnance.push({
      id: `m-${next.ordnanceSequence}`,
      kind: 'missile',
      launcherShipId: shipId,
      launcherSide: participant.side,
      targetShipId: target.id,
      launchedGameTurn: next.gameTurn,
      status: 'in-flight',
      contactIsAutomatic: ABBREVIATED_MISSILE_CONTACT_IS_AUTOMATIC,
      raw: ABBREVIATED_MISSILE_CONTACT_IS_RAW
    });
  }

  logEvent(next, { kind: 'ordnance-launch', shipId, missiles, sandCanisters, targetId: target?.id ?? null });
  return next;
}

/**
 * Book 2 p.23 phase A: "Ordnance (missiles and sand) which he has launched in
 * previous game turns is moved at the same time." In abbreviated mode there is
 * nothing to cross, so a missile in flight reaches its target.
 */
export function moveOrdnance(encounter) {
  const phase = currentPhase(encounter);
  if (phase.key !== 'movement') throw new Error(`ordnance does not move in the ${phase.label} phase`);
  const next = freeze(encounter);
  next.log = encounter.log.map((entry) => ({ ...entry }));
  const contacted = [];
  for (const round of next.ordnance) {
    if (round.status !== 'in-flight') continue;
    // Only the phasing side's ordnance moves in its own movement phase, and not
    // in the same player turn it was launched in.
    if (round.launcherSide !== next.phasingSide) continue;
    // Phase D comes after phase A within a player turn, so "the following
    // friendly movement phase" is always the next game turn.
    if (round.launchedGameTurn >= next.gameTurn) continue;
    const target = next.participants.find((entry) => entry.id === round.targetShipId);
    if (!target || target.escaped) {
      // p.18: it homes until either the missile or the target is destroyed. A
      // target that is gone leaves the missile with nothing to home on.
      round.status = 'spent';
      continue;
    }
    round.status = 'contact';
    contacted.push(round.id);
  }
  if (contacted.length) logEvent(next, { kind: 'ordnance-contact', rounds: contacted });
  return next;
}

export function ordnanceInFlight(encounter, { targetShipId = null, status = null } = {}) {
  return Object.freeze(encounter.ordnance.filter((round) => {
    if (targetShipId && round.targetShipId !== targetShipId) return false;
    if (status && round.status !== status) return false;
    return true;
  }).map((round) => Object.freeze({ ...round })));
}

/**
 * Book 2 p.30, laser return fire phase. Anti-missile fire needs the
 * Anti-Missile program; ECM is separate and destroys contacting missiles on 7+
 * without any laser being fired. Neither needs Target or Multi-Target, and
 * "other programs do not effect the functioning of these programs", so no
 * Predict or Gunner Interact applies.
 */
export function resolveAntiMissileFire(encounter, dice, { shipId } = {}) {
  requireDice(dice);
  const phase = currentPhase(encounter);
  if (phase.key !== 'return-fire') throw new Error(`anti-missile fire happens in the return fire phase, not ${phase.label}`);
  const next = freeze(encounter);
  next.log = encounter.log.map((entry) => ({ ...entry }));
  const participant = getParticipant(next, shipId);
  const incoming = next.ordnance.filter((round) => round.targetShipId === shipId && round.status === 'contact');
  const results = [];

  if (!incoming.length) {
    return Object.freeze({ encounter: next, ecm: null, shots: Object.freeze([]), destroyed: Object.freeze([]) });
  }

  // ECM first: it destroys all contacting missiles at once rather than one per
  // laser, which is what makes a 3-point program worth its space.
  let ecm = null;
  if (programInComputer(participant, 'ecm')) {
    const roll = dice.roll2D6();
    const cleared = roll.total >= ECM_DESTROY_THROW;
    ecm = Object.freeze({ dice: Object.freeze([...roll.dice]), total: roll.total, target: ECM_DESTROY_THROW, cleared });
    if (cleared) {
      for (const round of incoming) round.status = 'destroyed';
      logEvent(next, { kind: 'anti-missile', shipId, ecm, destroyed: incoming.map((round) => round.id) });
      return Object.freeze({
        encounter: next, ecm, shots: Object.freeze([]),
        destroyed: Object.freeze(incoming.map((round) => round.id))
      });
    }
  }

  if (programInComputer(participant, 'anti-missile')) {
    // p.30: "any or all laser weaponry" may fire at contacting missiles.
    const lasers = operationalTurrets(participant.ship)
      .flatMap((turretId) => turretLasers(participant, turretId).map((weapon) => ({ turretId, weapon })));
    let remaining = incoming.filter((round) => round.status === 'contact');
    for (const laser of lasers) {
      const round = remaining.find((entry) => entry.status === 'contact');
      if (!round) break;
      const roll = dice.roll2D6();
      const hit = roll.total >= ANTI_MISSILE_THROW;
      if (hit) round.status = 'destroyed';
      results.push(Object.freeze({
        turretId: laser.turretId,
        weapon: laser.weapon,
        roundId: round.id,
        dice: Object.freeze([...roll.dice]),
        total: roll.total,
        target: ANTI_MISSILE_THROW,
        hit
      }));
      remaining = remaining.filter((entry) => entry.status === 'contact');
    }
  }

  const destroyed = incoming.filter((round) => round.status === 'destroyed').map((round) => round.id);
  logEvent(next, { kind: 'anti-missile', shipId, ecm, shots: results, destroyed });
  return Object.freeze({ encounter: next, ecm, shots: Object.freeze(results), destroyed: Object.freeze(destroyed) });
}

/**
 * Book 2 p.30 phase D: "missiles or sand which contacted a target in the
 * preceding movement phase now explode." p.31 gives the effect — one die for
 * the number of hits, each located separately at -4.
 */
export function detonateContactedOrdnance(encounter, dice) {
  requireDice(dice);
  const phase = currentPhase(encounter);
  if (phase.key !== 'ordnance-launch') throw new Error(`ordnance detonates in the ordnance launch phase, not ${phase.label}`);
  let next = freeze(encounter);
  next.log = encounter.log.map((entry) => ({ ...entry }));
  const detonations = [];

  for (const round of next.ordnance) {
    if (round.status !== 'contact') continue;
    if (round.launcherSide !== next.phasingSide) continue;
    const target = next.participants.find((entry) => entry.id === round.targetShipId);
    if (!target) { round.status = 'spent'; continue; }
    const result = applyMissileDetonation(target.ship, dice);
    target.ship = freeze(result.ship);
    round.status = 'detonated';
    const detonation = {
      roundId: round.id,
      targetShipId: round.targetShipId,
      hitCount: result.hitCount,
      hits: result.hits.map((hit) => ({ ...hit }))
    };
    // A hull hit still decompresses a pressurised section.
    for (const hit of result.hits) {
      if (hit.location !== 'hull') continue;
      const decompression = resolveDecompression(target, dice);
      if (decompression) detonation.decompression = decompression;
    }
    detonations.push(Object.freeze(detonation));
    logEvent(next, { kind: 'missile-detonation', ...detonation });
  }

  next = applyDisabledOutcomes(next);
  return Object.freeze({ encounter: next, detonations: Object.freeze(detonations) });
}

// ---------------------------------------------------------------------------
// Reprogramming
// ---------------------------------------------------------------------------

/**
 * Book 2 p.23 phase E and p.31: programs are removed from the computer and
 * others inserted "in anticipation of their use in later turns". Only in this
 * phase, and only by the ship's computer operator.
 */
export function reprogramComputer(encounter, { shipId, load = [], unload = [], actorId = null } = {}) {
  const phase = currentPhase(encounter);
  if (phase.key !== 'reprogramming') throw new Error(`the computer cannot be reprogrammed in the ${phase.label} phase`);
  const next = freeze(encounter);
  next.log = encounter.log.map((entry) => ({ ...entry }));
  const participant = getParticipant(next, shipId);
  if (participant.side !== encounter.phasingSide) throw new Error(`${participant.name} is not on the phasing side`);
  const operator = computerOperatorOf(participant);
  if (actorId !== null && operator && actorId !== operator) {
    throw new Error(`only ${operator} operates the computer aboard ${participant.name}`);
  }

  for (const key of unload) {
    const index = participant.computer.loaded.indexOf(key);
    if (index < 0) throw new RangeError(`${key} is not in the computer`);
    participant.computer.loaded.splice(index, 1);
  }
  for (const key of load) {
    getComputerProgram(key);
    if (!participant.computer.carried.includes(key)) throw new RangeError(`${key} is not carried aboard`);
    if (participant.computer.loaded.includes(key)) throw new RangeError(`${key} is already in the computer`);
    participant.computer.loaded.push(key);
  }
  const state = computerState(participant);
  if (state.loadedSpace > state.inComputerCapacity) {
    throw new RangeError(`${participant.name} would hold ${state.loadedSpace} points in a Model/${state.model} that takes ${state.inComputerCapacity}`);
  }
  logEvent(next, { kind: 'reprogramming', shipId, load: [...load], unload: [...unload] });
  return next;
}

// ---------------------------------------------------------------------------
// Fleeing and endings
// ---------------------------------------------------------------------------

/**
 * Book 2 p.37, abbreviated mode: "When one vessel elects to flee, the referee
 * then states that a certain number of shots may be made before the ship is out
 * of range."
 *
 * The count is the referee's. No formula is supplied here, because any formula
 * would be an added rule — `refereeRuling` records that it was a person's call.
 */
export function declareFlight(encounter, { shipId, shotsBeforeEscape, note = '' } = {}) {
  if (!Number.isInteger(shotsBeforeEscape) || shotsBeforeEscape < 0) {
    throw new TypeError('the referee must state how many shots may be made before the ship is out of range');
  }
  const next = freeze(encounter);
  next.log = encounter.log.map((entry) => ({ ...entry }));
  const participant = getParticipant(next, shipId);
  participant.fled = true;
  participant.shotsRemainingBeforeEscape = shotsBeforeEscape;
  logEvent(next, {
    kind: 'flight',
    shipId,
    shotsBeforeEscape,
    note,
    refereeRuling: true,
    raw: false
  });
  return next;
}

export function creditShotAgainstEscape(encounter, shipId) {
  const next = freeze(encounter);
  next.log = encounter.log.map((entry) => ({ ...entry }));
  const participant = getParticipant(next, shipId);
  if (!participant.fled) throw new Error(`${participant.name} is not fleeing`);
  participant.shotsRemainingBeforeEscape = Math.max(0, (participant.shotsRemainingBeforeEscape ?? 0) - 1);
  if (participant.shotsRemainingBeforeEscape === 0) {
    participant.escaped = true;
    logEvent(next, { kind: 'escape', shipId });
  }
  return next;
}

export function surrender(encounter, shipId) {
  const next = freeze(encounter);
  next.log = encounter.log.map((entry) => ({ ...entry }));
  getParticipant(next, shipId).surrendered = true;
  logEvent(next, { kind: 'surrender', shipId });
  return next;
}

/**
 * Book 2 has no ship-destruction rule, so a ship is disabled rather than
 * killed: adrift when it cannot maneuver, and out of the fight when no turret
 * can fire.
 */
export function participantStatus(participant) {
  const report = damageReport(participant.ship);
  const armedTurrets = operationalTurrets(participant.ship)
    .filter((turretId) => turretLasers(participant, turretId).length > 0);
  const toothless = armedTurrets.length === 0;
  return Object.freeze({
    shipId: participant.id,
    name: participant.name,
    adrift: report.adrift,
    canJump: report.canJump,
    decompressed: hullDecompressed(participant.ship),
    armedTurrets: Object.freeze(armedTurrets),
    toothless,
    escaped: participant.escaped,
    surrendered: participant.surrendered,
    fled: participant.fled,
    // "Disabled" is the Book 2 ending: a hulk with a live crew and an intact
    // hull, which is what a pirate wanted in the first place.
    disabled: report.adrift && toothless,
    damage: report
  });
}

function applyDisabledOutcomes(encounter) {
  const statuses = encounter.participants.map(participantStatus);
  for (const side of SHIP_COMBAT_SIDES) {
    const live = statuses.filter((status) => {
      const participant = getParticipant(encounter, status.shipId);
      return participant.side === side && !status.escaped && !status.surrendered && !status.disabled;
    });
    if (live.length === 0) {
      encounter.outcome = 'disabled';
      return encounter;
    }
  }
  return encounter;
}

/**
 * The write-back the campaign needs, computed and returned rather than applied.
 *
 * Deliberately pure: the caller applies it inside a single transaction keyed on
 * the encounter, because checking a marker, writing the ships and setting the
 * marker are three operations and a marker alone does not make them atomic.
 */
export function shipCombatOutcome(encounter) {
  return Object.freeze({
    encounterId: encounter.id,
    campaignId: encounter.campaignId,
    spatialMode: encounter.spatialMode,
    intruderSide: encounter.intruderSide,
    outcome: encounter.outcome,
    gameTurns: encounter.gameTurn,
    elapsedMinutes: elapsedMinutes(encounter),
    ships: Object.freeze(encounter.participants.map((participant) => Object.freeze({
      shipId: participant.id,
      name: participant.name,
      side: participant.side,
      status: participantStatus(participant),
      // The ship document as the fight left it: damage, fuel and magazines.
      ship: freeze(participant.ship),
      expenditure: Object.freeze({ ...participant.expenditure }),
      computer: computerState(participant),
      pressurisedSections: Object.freeze([...participant.pressurisedSections]),
      decompressionEvents: Object.freeze(participant.decompressionEvents.map((entry) => freeze(entry))),
      casualties: Object.freeze(participant.casualties.map((entry) => ({ ...entry })))
    }))),
    ordnance: Object.freeze(encounter.ordnance.map((round) => Object.freeze({ ...round }))),
    log: Object.freeze(encounter.log.map((entry) => ({ ...entry })))
  });
}

// ---------------------------------------------------------------------------
// Book 2 p.24: the ship's data card
//
// "Each ship involved in space combat must have a data card prepared for it.
// This card contains basic information about the ship, serving as a reference
// for the players during the course of the battle. As damage occurs, it is
// marked on the card to reduce the ship's abilities in later turns."
// ---------------------------------------------------------------------------

export function shipDataCard(participant) {
  const ship = participant.ship;
  const specs = ship.specifications;
  const drives = ['maneuverDrive', 'jumpDrive', 'powerPlant'];
  const report = damageReport(ship);
  const byKey = Object.fromEntries(report.drives.map((entry) => [entry.which, entry]));
  const fuel = report.fuel;

  const sections = drives.map((which) => {
    const entry = byKey[which];
    const label = { maneuverDrive: 'M-Drive', jumpDrive: 'J-Drive', powerPlant: 'Power Plant' }[which];
    const suffix = which === 'jumpDrive' ? 'Jump' : which === 'maneuverDrive' ? 'G' : 'Pn';
    return Object.freeze({
      label,
      designLetter: entry.designLetter,
      letter: entry.letter,
      potential: entry.potential,
      reading: entry.destroyed
        ? `${entry.designLetter} DESTROYED`
        : `${entry.letter}${entry.potential === null ? ' INOPERABLE' : ` / ${suffix}-${entry.potential}`}`,
      hits: entry.hits
    });
  });

  const turrets = specs.armament.turrets.map((turret) => {
    const weapons = ship.state.armament.turrets.find((entry) => entry.id === turret.id)?.weapons ?? [];
    return Object.freeze({
      id: turret.id,
      mount: turret.mount,
      code: weapons.map((key) => getTurretWeapon(key).code).join(', '),
      gunnerActorId: participant.stations.gunners[turret.id] ?? null,
      gunnerSkill: participant.skills.gunnery?.[turret.id] ?? 0,
      operational: turretOperational(ship, turret.id)
    });
  });

  const computer = computerState(participant);
  return Object.freeze({
    name: participant.name,
    typeCode: ship.design.typeCode,
    designName: ship.design.name,
    sections: Object.freeze(sections),
    fuel: Object.freeze({
      capacityTons: fuel.capacityTons,
      aboardTons: ship.state.currentFuelTons,
      lostTons: fuel.lostTons,
      jumpDisabled: fuel.jumpDisabled,
      maneuverDisabled: fuel.maneuverDisabled
    }),
    hold: Object.freeze({
      capacityTons: specs.cargo.capacityTons,
      usedTons: ship.state.cargoUsedTons,
      hits: report.holdHits
    }),
    bridge: Object.freeze({
      pilotActorId: participant.stations.pilot,
      pilotSkill: participant.skills.pilot ?? 0
    }),
    turrets,
    magazine: Object.freeze({
      missiles: ship.state.armament.missiles,
      sandCanisters: ship.state.armament.sandCanisters
    }),
    computer: Object.freeze({
      model: computer.model,
      cpu: computer.cpu,
      storage: computer.storage,
      carried: computer.carried,
      loaded: computer.loaded,
      loadedSpace: computer.loadedSpace,
      inComputerCapacity: computer.inComputerCapacity,
      hits: report.computer.hits,
      operationDM: report.computer.dm,
      permanentlyFailed: report.computer.permanentlyFailed
    }),
    doubleFire: canDoubleFire(ship),
    pressurisedSections: Object.freeze([...participant.pressurisedSections]),
    decompressed: hullDecompressed(ship),
    status: participantStatus(participant)
  });
}

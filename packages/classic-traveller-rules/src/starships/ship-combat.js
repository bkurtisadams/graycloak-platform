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
  hullDecompressed,
  computerOperation
} from './damage.js';
import { applyShipHit, applyMissileDetonation, assertValidShipDocument } from './ship-document.js';
import { createPersonalCombatant, PERSONAL_COMBAT_RANGES } from '../combat/personal-combat.js';
import {
  READY_CAPACITY,
  createLauncherState,
  advanceLauncherClock,
  startLauncherReload,
  assertTurretCanFire,
  fireLauncher,
  setTurretOperational as setAmmunitionTurretOperational,
  totalsAboard
} from './launcher-ammunition.js';
import {
  placeVectorOrdnance,
  validateOrdnanceRuling,
  moveVectorOrdnance,
  activateVectorSand,
  obscuringSand
} from './vector-ordnance.js';

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
  'in-progress', 'disarmed', 'disabled', 'escaped', 'surrendered', 'disengaged', 'referee-called'
]);

// ---------------------------------------------------------------------------
// What an encountered ship does, and when a fight is over.
//
// GRAYCLOAK EXTENSION, not RAW. Book 2 gives no destruction rule, no pursuit
// rule and no boarding procedure — p.37 names boarding in a single clause and
// stops. So the endings below and the dispositions that drive them are house
// rules, modelled on the one decision procedure the 1977 books do supply:
// Book 3 p.29 gives every animal a throw to attack and a throw to flee, and
// "If animals are attacked, they will attack if their throw to attack is less
// than their to flee throw; otherwise they will flee."
//
// Ruling (Graycloak, Sep 2026): combat ends when EITHER side can no longer
// fire, because neither has a move left in the combat system. What follows —
// running, surrendering, being boarded — is a situation rather than a combat
// round. A disarmed ship that still has a manoeuvre drive and fuel may try to
// run, and p.37's referee shot count IS the chase.
export const SHIP_DISPOSITIONS = Object.freeze({
  // A pirate wants the hull and its cargo intact, so it shoots to disarm and
  // then stops. A target still under power has to lose its manoeuvre drive
  // before it can be boarded — the two hits that matter on a one-turret hull.
  pirate: Object.freeze({
    label: 'Pirate', pressAttack: 5, breakOff: 10,
    wants: 'prize', aimsFor: ['turret', 'maneuver-drive'], boardsWhenDisarmed: true
  }),
  // p.36: a patrol "may be simple border pickets, or may be a form of pirate,
  // exacting tolls or penalties". It wants compliance, not a kill.
  patrol: Object.freeze({
    label: 'Patrol', pressAttack: 8, breakOff: 9,
    wants: 'compliance', aimsFor: ['turret'], boardsWhenDisarmed: true
  }),
  // A trader, a merchant or a yacht wants to leave, and fires only to cover
  // the break-off.
  merchant: Object.freeze({
    label: 'Merchant', pressAttack: 11, breakOff: 6,
    wants: 'escape', aimsFor: ['turret'], boardsWhenDisarmed: false
  })
});
export const SHIP_DISPOSITIONS_ARE_RAW = false;

export function shipDisposition(key) {
  return SHIP_DISPOSITIONS[String(key ?? '').trim().toLowerCase()] ?? SHIP_DISPOSITIONS.merchant;
}

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

/**
 * Book 2 p.34: "The basic throw for a computer to operate in any situation is
 * 1+... Each hit on the computer serves as a DM of -1 on the throw to operate.
 * The throw to operate is made each time the computer is used (in combat, this
 * is generally once per phase). A computer which does not make its throw to
 * operate malfunctions for the remainder of the phase... A computer which has
 * received 12 hits is permanently malfunctioning."
 *
 * And: "A computer which is not operating effectively paralyses a starship."
 * So this gates every computer-dependent action — all laser fire, all launches,
 * anti-missile fire and reprogramming — rather than being reported and ignored.
 *
 * Persons with computer expertise apply their skill as a DM.
 */
export function throwComputerOperation(participant, dice) {
  requireDice(dice);
  const operation = computerOperation(participant.ship, { computerSkill: participant.skills.computer ?? 0 });
  if (operation.permanentlyFailed) {
    return Object.freeze({ ...operation, roll: null, total: null, operating: false, permanentlyFailed: true });
  }
  // v1.214.00: this threw one die. Two is right, and p.34 settles it: a
  // computer is permanently malfunctioning at twelve hits, which is only
  // reachable on 2D — on one die it would already be dead at six, so the
  // printed twelve could never mean anything. Traveller throws are 2D unless
  // stated otherwise, and every other throw in these books is.
  //
  // It matters: at four hits, one die operates 33% of the time against 83% on
  // two, which made a damaged computer far deadlier than Book 2 intends.
  //
  // A throw that cannot fail is not thrown — 2 is the floor on 2D, so any DM
  // of -1 or better clears a target of 1 outright.
  if (2 + operation.dm >= operation.target) {
    return Object.freeze({ ...operation, roll: null, total: null, operating: true });
  }
  const roll = dice.roll2D6();
  const total = roll.total + operation.dm;
  return Object.freeze({ ...operation, roll: roll.total, dice: Object.freeze([...roll.dice]), total, operating: total >= operation.target });
}

/**
 * Boolean form of the p.34 throw, taken once per phase per ship and recorded so
 * a phase cannot be re-thrown. Vector movement needs the same gate laser fire
 * does: p.34's "a computer which is not operating effectively paralyses a
 * starship" is not limited to gunnery.
 */
export function checkShipComputer(encounter, participant, dice) {
  if (participant.spentThisPhase.computer) return participant.spentThisPhase.computer.operating;
  const result = throwComputerOperation(participant, dice);
  participant.spentThisPhase.computer = { operating: result.operating, hits: result.hits, roll: result.roll, dm: result.dm };
  logEvent(encounter, { kind: 'computer-operation', shipId: participant.id, ...participant.spentThisPhase.computer });
  return result.operating;
}

// ---------------------------------------------------------------------------
// Encounter construction
// ---------------------------------------------------------------------------

/**
 * Fill each rack to Book 2 p.31's three ready rounds out of the ship's
 * magazine, in turret order, without exceeding what is aboard. Anything the
 * caller states explicitly wins.
 */
function defaultReadyRacks(ship, stated = {}) {
  const remaining = {
    missiles: ship.state.armament.missiles,
    sandCanisters: ship.state.armament.sandCanisters
  };
  const ready = {};
  for (const turret of ship.state.armament.turrets) {
    for (const [index, weapon] of turret.weapons.entries()) {
      const pool = weapon === 'missile-launcher' ? 'missiles' : weapon === 'sandcaster' ? 'sandCanisters' : null;
      if (!pool) continue;
      const id = `${turret.id}:${index + 1}`;
      if (Object.hasOwn(stated, id)) {
        ready[id] = stated[id];
        remaining[pool] -= stated[id];
        continue;
      }
      const loaded = Math.max(0, Math.min(READY_CAPACITY, remaining[pool]));
      ready[id] = loaded;
      remaining[pool] -= loaded;
    }
  }
  return ready;
}

function createParticipant({
  shipId,
  name = '',
  side,
  disposition = 'merchant',
  ship,
  carriedPrograms = [],
  loadedPrograms = [],
  stations = {},
  skills = {},
  pressurisedSections = [...PRESSURE_SECTIONS],
  occupants = {},
  readyByLauncher = {}
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
    disposition: SHIP_DISPOSITIONS[String(disposition).toLowerCase()] ? String(disposition).toLowerCase() : 'merchant',
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
    // Book 2 p.29: "The dice throw is made once for each firing laser weapon."
    // Once per weapon, per phase — so what has already been spent this phase
    // has to be recorded, or the same turret fires as often as it is allocated.
    spentThisPhase: { weapons: [], launchers: 0, sandcasters: 0, antiMissile: false, computer: null },
    // Book 2 p.31: three ready rounds per launcher, reloaded by the turret's
    // gunner in one turn, and "a gunner engaged in reloading is unable to fire
    // other weaponry in the turret".
    //
    // A sidecar rather than a field inside ship.state.armament, whose schema
    // validates exact keys and would reject it. The ship's totals stay the
    // total aboard; this splits them into ready, reserve and being loaded.
    ammunition: createLauncherState({
      armament: ship.state.armament,
      ownerSide: side,
      gunners: { ...(stations.gunners ?? {}) },
      // The ported module starts every rack empty unless told otherwise, to
      // avoid inventing ammunition. Overridden here on purpose: Book 2 p.31
      // calls three rounds per launcher "in immediate position", so a ship
      // that comes to a fight has its racks loaded out of its magazine. A
      // caller may still state the loadout — an ambushed ship with empty racks
      // is a legitimate starting condition.
      readyByLauncher: defaultReadyRacks(ship, readyByLauncher),
      disabledTurretIds: [...(ship.state.damage?.turrets ?? [])]
    }),
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
  // v1.214.00: vector mode is a real mode now. It is entered through
  // enableVectorMovement rather than here, so an encounter still starts
  // abbreviated and the spatial state is added before the first action.
  if (spatialMode !== 'abbreviated') throw new RangeError(`create the encounter abbreviated and call enableVectorMovement (got ${spatialMode})`);
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

/**
 * The launcher whose reload is occupying this turret's gunner, or null. A
 * gunner reloading in one turret cannot fire in another either — Book 2 p.17
 * lets one person hold two posts, so the same gunner can be assigned twice.
 */
function reloadBlockingTurret(participant, turretId) {
  const ammunition = participant.ammunition;
  if (!ammunition) return null;
  const turret = ammunition.turrets.find((entry) => entry.id === turretId);
  const busy = ammunition.launchers.find((launcher) => launcher.reload
    && (launcher.turretId === turretId
      || (turret?.gunnerId && launcher.reload.gunnerId === turret.gunnerId)));
  return busy ? busy.id : null;
}

/** The ammunition module's clock reads the phase this way. */
function ammunitionContext(encounter) {
  return {
    gameTurn: encounter.gameTurn,
    phasingSide: encounter.phasingSide,
    phase: SHIP_COMBAT_PHASES[encounter.phaseIndex].key
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

  // Every phase starts with nothing spent. A weapon fires once per phase, so
  // the record cannot outlive the phase it belongs to.
  for (const participant of next.participants) {
    participant.spentThisPhase = { weapons: [], launchers: 0, sandcasters: 0, antiMissile: false, computer: null };
  }

  if (next.phaseIndex < SHIP_COMBAT_PHASES.length - 1) {
    next.phaseIndex += 1;
    return advanceAmmunitionClocks(next);
  }

  next.phaseIndex = 0;
  for (const participant of next.participants) {
    participant.ready = {};
    participant.firedAt = [];
    participant.spentThisPhase = { weapons: [], launchers: 0, sandcasters: 0, antiMissile: false, computer: null };
  }
  if (next.phasingSide === 'intruder') {
    next.phasingSide = 'native';
    return advanceAmmunitionClocks(next);
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
  return advanceAmmunitionClocks(next);
}

/**
 * Book 2 p.31's reload takes one turn, so the ammunition clock has to move with
 * the phase for BOTH sides — a native reload completes at the next native
 * movement, not when the game turn number changes. Completion at the same tick
 * is idempotent, so advancing twice cannot reload twice.
 */
function advanceAmmunitionClocks(encounter) {
  const context = ammunitionContext(encounter);
  for (const participant of encounter.participants) {
    if (!participant.ammunition) continue;
    const before = participant.ammunition.log.length;
    participant.ammunition = advanceLauncherClock(participant.ammunition, context);
    for (const entry of participant.ammunition.log.slice(before)) {
      encounter.log.push({
        gameTurn: encounter.gameTurn, phasingSide: encounter.phasingSide,
        phase: context.phase, shipId: participant.id, ...entry
      });
    }
  }
  return encounter;
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
/**
 * Book 2 p.31: what a program is worth to a specific turret. Predict has a flat
 * DM; Gunner Interact "interfaces the expertise of the gunner in a specific
 * turret", so it is worth that gunner's skill and nothing on an unmanned one.
 */
function programAttackValue(key, gunnerSkill) {
  if (key === 'gunner-interact') return gunnerSkill;
  const program = COMPUTER_PROGRAMS[key];
  return Number.isFinite(program.attackDM) ? program.attackDM : 0;
}

/**
 * The programs a turret could run this phase beyond the mandatory ones, what
 * each is worth to it, and what the CPU has left.
 *
 * Book 2 p.31 hands this choice to the player: its own worked example has a
 * Model/1 player "select between predict 1 or gunner interact... depending on
 * which would allow the greater benefit". So the options are reported rather
 * than resolved, and `laserAttackDM` takes an explicit choice.
 */
export function cpuFireOptions(participant, turretId, { returnFire = false, multipleTargets = false } = {}) {
  const gunnerSkill = participant.skills.gunnery?.[turretId] ?? 0;
  const required = ['target'];
  if (returnFire) required.push('return-fire');
  if (multipleTargets) required.push('multi-target-2');
  const mandatory = cycleIntoCpu(participant, { required });
  const candidates = ['predict-5', 'predict-4', 'predict-3', 'predict-2', 'predict-1', 'gunner-interact']
    .filter((key) => programInComputer(participant, key))
    .map((key) => Object.freeze({
      key,
      label: COMPUTER_PROGRAMS[key].label,
      space: COMPUTER_PROGRAMS[key].space,
      dm: programAttackValue(key, gunnerSkill)
    }));
  return Object.freeze({
    required: Object.freeze([...required]),
    possible: mandatory.possible,
    missing: mandatory.missing,
    cpu: mandatory.cpu,
    requiredSpace: mandatory.used,
    freeSpace: Math.max(0, mandatory.cpu - mandatory.used),
    gunnerSkill,
    candidates: Object.freeze(candidates)
  });
}

/**
 * The best-value set of optional programs that fits. Used as the default when
 * no choice has been declared: a fixed preference order put Predict first and
 * so traded a Gunner-3's +3 for Predict-1's +1, which is the opposite of p.31's
 * own advice about the greater benefit.
 */
export function bestCpuFireChoice(participant, turretId, options = {}) {
  const available = cpuFireOptions(participant, turretId, options);
  if (!available.possible) return Object.freeze([]);
  let best = { dm: 0, chosen: [] };
  const total = available.candidates.length;
  for (let mask = 0; mask < (1 << total); mask += 1) {
    let space = 0;
    let dm = 0;
    const chosen = [];
    for (let index = 0; index < total; index += 1) {
      if (!(mask & (1 << index))) continue;
      const candidate = available.candidates[index];
      space += candidate.space;
      dm += candidate.dm;
      chosen.push(candidate.key);
    }
    if (space > available.freeSpace) continue;
    // Ties go to the smaller set, so a program is not loaded for nothing.
    if (dm > best.dm || (dm === best.dm && chosen.length < best.chosen.length && dm > 0)) best = { dm, chosen };
  }
  return Object.freeze(best.chosen);
}

/**
 * The attack DM for one turret firing, from Book 2 p.30 plus whichever optional
 * programs are running. `chosen` is the player's selection; omitted, the
 * best-value set that fits is used.
 */
export function laserAttackDM(participant, turretId, { returnFire = false, multipleTargets = false, chosen = null } = {}) {
  const gunnerSkill = participant.skills.gunnery?.[turretId] ?? 0;
  const available = cpuFireOptions(participant, turretId, { returnFire, multipleTargets });
  if (!available.possible) {
    return Object.freeze({ possible: false, missing: available.missing, dm: 0, running: Object.freeze([]), components: Object.freeze([]), options: available });
  }

  const selection = chosen === null
    ? bestCpuFireChoice(participant, turretId, { returnFire, multipleTargets })
    : chosen.filter((key) => available.candidates.some((candidate) => candidate.key === key));
  const cycle = cycleIntoCpu(participant, { required: available.required, optional: selection });
  if (!cycle.possible) {
    return Object.freeze({ possible: false, missing: cycle.missing, dm: 0, running: cycle.running, components: Object.freeze([]), options: available });
  }

  const components = [];
  let dm = 0;
  for (const key of cycle.running) {
    if (available.required.includes(key)) continue;
    const value = programAttackValue(key, gunnerSkill);
    if (!value) continue;
    dm += value;
    components.push({
      label: key === 'gunner-interact' ? `Gunner Interact (gunner-${gunnerSkill})` : COMPUTER_PROGRAMS[key].label,
      dm: value
    });
  }
  return Object.freeze({
    possible: true,
    missing: Object.freeze([]),
    running: cycle.running,
    dm,
    components: Object.freeze(components),
    options: available
  });
}

/**
 * The defence DM for a target, from Book 2 p.30. Range DMs are omitted in
 * abbreviated mode because there is no range to measure; the sand figure is a
 * labelled Graycloak extension for the same reason.
 */
export function laserDefenseDM(participant, { alsoRunning = [], encounter = null, firingLine = null } = {}) {
  const components = [];
  let dm = 0;
  const pilotSkill = participant.skills.pilot ?? 0;
  // v1.209.00: this asked only whether a program was in the computer. Book 2
  // p.31 requires it to be RUNNING, which means it has to fit the CPU
  // alongside whatever else the ship is doing this phase — a Model/1 returning
  // fire has both its points on Target and Return Fire and nothing left to
  // evade with.
  const fits = (key) => cycleIntoCpu(participant, { required: [...alsoRunning, key] }).possible;
  const evade = ['maneuver-evade-6', 'maneuver-evade-5', 'maneuver-evade-4', 'maneuver-evade-3', 'maneuver-evade-2', 'maneuver-evade-1']
    .find((key) => programInComputer(participant, key) && fits(key));
  if (evade) {
    const program = COMPUTER_PROGRAMS[evade];
    const value = Number.isFinite(program.defenseDM)
      ? program.defenseDM
      : -Math.floor(pilotSkill * program.pilotExpertiseRate);
    if (value) {
      dm += value;
      components.push({ label: `${program.label} (pilot-${pilotSkill})`, dm: value });
    }
  } else if (programInComputer(participant, 'auto-evade') && fits('auto-evade')) {
    dm += COMPUTER_PROGRAMS['auto-evade'].defenseDM;
    components.push({ label: 'Auto/Evade', dm: COMPUTER_PROGRAMS['auto-evade'].defenseDM });
  }
  // Book 2 p.30 prices sand at "-3 per 1/2 inch of obscuring sand", which is a
  // measurement along the firing line. Vector mode can measure it, so it uses
  // the printed rule; abbreviated mode has no line to measure and falls back to
  // the per-canister house figure.
  if (firingLine && encounter?.spatialMode === 'vector') {
    const sand = obscuringSand(encounter, firingLine.from, firingLine.to);
    if (sand.dm) {
      dm += sand.dm;
      components.push({ label: `Obscuring sand ${sand.length.toFixed(2)} units`, dm: sand.dm, raw: true });
    }
  } else if (participant.sandDeployed > 0) {
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

/**
 * Launchers of a kind in turrets that still work. Book 2 p.33: a turret hit
 * incapacitates the turret and everything in it.
 */
function launcherCount(participant, weaponKey) {
  let count = 0;
  for (const turret of participant.ship.state.armament.turrets) {
    if (!turretOperational(participant.ship, turret.id)) continue;
    count += turret.weapons.filter((key) => key === weaponKey).length;
  }
  return count;
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
export function resolveLaserFire(encounter, dice, { rangeDM = null } = {}) {
  requireDice(dice);
  const allocation = encounter.fireAllocation;
  if (!allocation) throw new Error('no fire has been allocated');
  const phase = currentPhase(encounter);
  if (allocation.phase !== phase.key) throw new Error('the allocation was made in a different phase');

  let next = freeze(encounter);
  next.log = encounter.log.map((entry) => ({ ...entry }));
  const shots = [];

  // Book 2 p.30: "lasers from different turrets may fire on different targets if
  // a multi-target program is running". Counted per ship across the whole
  // allocation, before anything fires.
  const targetsPerShip = new Map();
  for (const entry of allocation.entries) {
    const seen = targetsPerShip.get(entry.shipId) ?? new Set();
    seen.add(entry.targetId);
    targetsPerShip.set(entry.shipId, seen);
  }

  // p.34: the throw to operate is made once per phase per ship. A computer that
  // fails paralyses the ship for the remainder of the phase.
  const operation = new Map();
  for (const shipId of new Set(allocation.entries.map((entry) => entry.shipId))) {
    operation.set(shipId, throwComputerOperation(getParticipant(next, shipId), dice));
  }

  for (const entry of allocation.entries) {
    const attacker = getParticipant(next, entry.shipId);
    const target = getParticipant(next, entry.targetId);
    if (target.escaped) continue;
    if (!turretOperational(attacker.ship, entry.turretId)) continue;

    const computer = operation.get(entry.shipId);
    if (!computer.operating) {
      shots.push(Object.freeze({
        shipId: entry.shipId, turretId: entry.turretId, targetId: entry.targetId,
        fired: false, reason: computer.permanentlyFailed
          ? 'computer permanently malfunctioning (12 hits)'
          : `computer failed its throw to operate (${computer.total} vs ${computer.target})`,
        computer
      }));
      continue;
    }

    // p.29: the throw is made once for each firing laser weapon — once per
    // phase, so a turret already fired this phase has nothing left to fire.
    // Book 2 p.31: "A gunner engaged in reloading is unable to fire other
    // weaponry in the turret." That covers return fire and anti-missile fire,
    // since both are turret weapons.
    //
    // Deliberately narrower than the ported module's own guard, which also
    // refuses to let ANY turret fire without an assigned gunner. Book 2 p.17
    // says the opposite: "in many cases, especially where trouble is not
    // expected, the gunner position will be omitted." An unmanned turret fires
    // — it just gets nothing from Gunner Interact. The gunner requirement
    // belongs to reloading, which p.31 gives to "the turret's gunner".
    const reloading = reloadBlockingTurret(attacker, entry.turretId);
    if (reloading) {
      shots.push(Object.freeze({
        shipId: entry.shipId, turretId: entry.turretId, targetId: entry.targetId,
        fired: false, reason: `gunner is reloading ${reloading}`
      }));
      continue;
    }

    const alreadySpent = attacker.spentThisPhase.weapons.includes(entry.turretId);
    if (alreadySpent) {
      shots.push(Object.freeze({
        shipId: entry.shipId, turretId: entry.turretId, targetId: entry.targetId,
        fired: false, reason: `turret ${entry.turretId} has already fired this phase`
      }));
      continue;
    }

    const multipleTargets = (targetsPerShip.get(entry.shipId)?.size ?? 1) > 1;
    const attack = laserAttackDM(attacker, entry.turretId, { returnFire: phase.key === 'return-fire', multipleTargets });
    if (!attack.possible) {
      shots.push(Object.freeze({
        shipId: entry.shipId, turretId: entry.turretId, targetId: entry.targetId,
        fired: false, reason: `missing ${attack.missing.join(', ')}`
      }));
      continue;
    }
    const defense = laserDefenseDM(target, next.spatialMode === 'vector' ? {
      encounter: next,
      firingLine: { from: next.spatial.ships[entry.shipId].position, to: next.spatial.ships[entry.targetId].position }
    } : {});

    attacker.spentThisPhase.weapons.push(entry.turretId);
    for (const weaponKey of turretLasers(attacker, entry.turretId)) {
      const weapon = getTurretWeapon(weaponKey);
      const roll = dice.roll2D6();
      // Book 2 p.30's range DMs have no meaning in abbreviated mode, which has
      // no range. In vector mode the caller measures it and passes it in —
      // ship-combat does not import the vector module, because the vector
      // module imports ship-combat.
      const range = typeof rangeDM === 'function' ? rangeDM(entry.shipId, entry.targetId) : (rangeDM ?? 0);
      const dm = attack.dm + defense.dm + weapon.attackDM + range + (entry.shifted ? SHIFTED_FIRE_DM : 0);
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
          ...(range ? [{ label: 'Range', dm: range }] : []),
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
function resolveDecompression(participant, dice) {
  // Book 2 p.33: "A hull hit decompresses the ship's hull interior. Further
  // hull hits have no effect." The interior, not a section — so every section
  // still pressurised loses its air at once. p.35 then applies explosive
  // decompression to the people in each: "kills all persons in that section
  // unless a vacc suit is available and put on immediately. Throw 9+... DM +
  // level of vacc suit expertise, and DM + dexterity of the individual."
  //
  // v1.209.00: this used to decompress one section, defaulting to the bridge,
  // which left the rest of the ship pressurised after a hull breach and spared
  // everyone who happened not to be on the bridge.
  const breached = [...participant.pressurisedSections];
  if (!breached.length) return null;
  participant.pressurisedSections = [];

  const sections = breached.map((section) => {
    const occupants = participant.occupants[section] ?? [];
    const results = occupants.map((occupant) => {
      // Someone already sealed into a suit is not exposed at all — p.35's
      // throw is to get one ON in time.
      if (occupant.vaccSuitWorn) {
        return Object.freeze({
          actorId: occupant.actorId, name: occupant.name ?? occupant.actorId,
          vaccSuitAvailable: true, alreadySuited: true,
          dice: Object.freeze([]), total: null, target: VACC_SUIT_THROW, survived: true
        });
      }
      const roll = dice.roll2D6();
      const dm = (occupant.vaccSuitSkill ?? 0) + (occupant.dexterity ?? 0);
      const total = roll.total + dm;
      const survived = Boolean(occupant.vaccSuitAvailable) && total >= VACC_SUIT_THROW;
      if (!survived) participant.casualties.push({ actorId: occupant.actorId, name: occupant.name ?? occupant.actorId, section });
      return Object.freeze({
        actorId: occupant.actorId,
        name: occupant.name ?? occupant.actorId,
        vaccSuitAvailable: Boolean(occupant.vaccSuitAvailable),
        alreadySuited: false,
        dice: Object.freeze([...roll.dice]),
        total,
        target: VACC_SUIT_THROW,
        survived
      });
    });
    return Object.freeze({ section, occupants: Object.freeze(results) });
  });

  const event = Object.freeze({
    sections: Object.freeze(sections),
    // Kept for callers that read a single section off the old shape.
    section: sections[0]?.section ?? null,
    occupants: Object.freeze(sections.flatMap((entry) => entry.occupants))
  });
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
export function launchOrdnance(encounter, { shipId, missiles = 0, sandCanisters = 0, targetId = null, vectorRuling = null, launcherIds = [] } = {}) {
  const phase = currentPhase(encounter);
  if (phase.key !== 'ordnance-launch') throw new Error(`ordnance cannot be launched in the ${phase.label} phase`);
  const next = freeze(encounter);
  next.log = encounter.log.map((entry) => ({ ...entry }));
  const participant = getParticipant(next, shipId);
  const cycle = cycleIntoCpu(participant, { required: ['launch', 'target'] });
  if (!cycle.possible) throw new Error(`${participant.name} cannot launch: missing ${cycle.missing.join(', ') || 'CPU capacity'}`);
  if (missiles > participant.ship.state.armament.missiles) throw new RangeError('not enough missiles aboard');
  if (sandCanisters > participant.ship.state.armament.sandCanisters) throw new RangeError('not enough sand aboard');

  // Book 2 p.31: ready rounds are per launcher, three at a time. `launcherIds`
  // names the racks firing; without it the racks are taken in order, which is
  // what the older count-based callers expect.
  //
  // Book 2 p.30: "only one missile or sand canister may be launched from a
  // launch rack or sandcaster" in the phase. So the limit is the number of
  // working launchers, not the number of rounds in the magazine — and a turret
  // that has been knocked out launches nothing.
  const fittedLaunchers = launcherCount(participant, 'missile-launcher');
  const fittedSandcasters = launcherCount(participant, 'sandcaster');
  const launchersLeft = fittedLaunchers - participant.spentThisPhase.launchers;
  const sandcastersLeft = fittedSandcasters - participant.spentThisPhase.sandcasters;
  if (missiles > launchersLeft) {
    throw new RangeError(`${participant.name} has ${launchersLeft} launch rack${launchersLeft === 1 ? '' : 's'} free this phase (Book 2 p.30: one round each)`);
  }
  if (sandCanisters > sandcastersLeft) {
    throw new RangeError(`${participant.name} has ${sandcastersLeft} sandcaster${sandcastersLeft === 1 ? '' : 's'} free this phase (Book 2 p.30: one canister each)`);
  }

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

  // Book 2 p.31 ready rounds: spend them from the named racks, then reconcile
  // the ship's totals from the sidecar rather than deducting twice.
  if (participant.ammunition) {
    const context = ammunitionContext(next);
    const pick = (pool, count, named) => {
      const chosen = named.filter((id) => participant.ammunition.launchers.some((l) => l.id === id && l.pool === pool));
      const rest = participant.ammunition.launchers
        .filter((l) => l.pool === pool && l.ready > 0 && !chosen.includes(l.id))
        .map((l) => l.id);
      return [...chosen, ...rest].slice(0, count);
    };
    for (const id of pick('missiles', missiles, launcherIds)) {
      participant.ammunition = fireLauncher(participant.ammunition, context, id);
    }
    for (const id of pick('sandCanisters', sandCanisters, launcherIds)) {
      participant.ammunition = fireLauncher(participant.ammunition, context, id);
    }
    const totals = totalsAboard(participant.ammunition);
    participant.ship.state.armament.missiles = totals.missiles;
    participant.ship.state.armament.sandCanisters = totals.sandCanisters;
  } else {
    participant.ship.state.armament.missiles -= missiles;
    participant.ship.state.armament.sandCanisters -= sandCanisters;
  }
  participant.expenditure.missiles += missiles;
  participant.expenditure.sandCanisters += sandCanisters;
  participant.sandDeployed += sandCanisters;
  // Book 2 p.30: one round per rack per phase, so the racks used are spent.
  participant.spentThisPhase.launchers += missiles;
  participant.spentThisPhase.sandcasters += sandCanisters;

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

  if (next.spatialMode === 'vector') {
    // Book 2 p.30: "All ordnance which is launched has the launching ship's
    // vector, which must be taken into account." So a round starts where the
    // launcher is, moving as the launcher moves.
    //
    // Book 2 never prints a missile's thrust, a contact radius, or the size of
    // a sand cloud, so vectorRuling carries the referee's figures and refuses
    // to proceed without a recorded note.
    if (missiles) validateOrdnanceRuling('missile', vectorRuling);
    if (sandCanisters) validateOrdnanceRuling('sand', vectorRuling);
    const launcherState = next.spatial.ships[shipId];
    for (let index = next.ordnance.length - missiles; index < next.ordnance.length; index += 1) {
      next.ordnance[index] = placeVectorOrdnance(next.ordnance[index], launcherState, vectorRuling);
    }
    for (let index = 0; index < sandCanisters; index += 1) {
      next.ordnanceSequence += 1;
      next.ordnance.push(placeVectorOrdnance({
        id: `s-${next.ordnanceSequence}`, kind: 'sand', launcherShipId: shipId,
        launcherSide: participant.side, launchedGameTurn: next.gameTurn, status: 'in-flight'
      }, launcherState, vectorRuling));
    }
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
  // In vector mode a round has to cross the distance, so contact is earned
  // rather than automatic.
  if (encounter.spatialMode === 'vector') return moveVectorOrdnance(encounter);
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
  // Book 2 p.30 puts anti-missile fire in the same phase as return fire, so a
  // ship doing both contends for the same CPU. Whatever it has already
  // committed this phase is counted against it.
  const committed = participant.spentThisPhase.weapons.length ? ['target', 'return-fire'] : [];
  const fitsWithCommitments = (key) => cycleIntoCpu(participant, { required: [...committed, key] }).possible;

  // p.30 gives one interception attempt per phase; without a guard the same
  // lasers could be fired at the same missiles repeatedly.
  if (participant.spentThisPhase.antiMissile) {
    return Object.freeze({ encounter: next, ecm: null, shots: Object.freeze([]), destroyed: Object.freeze([]),
      reason: 'anti-missile fire has already been made this phase' });
  }
  participant.spentThisPhase.antiMissile = true;

  let ecm = null;
  if (programInComputer(participant, 'ecm') && fitsWithCommitments('ecm')) {
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

  if (programInComputer(participant, 'anti-missile') && fitsWithCommitments('anti-missile')) {
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

/**
 * Book 2 p.31: "When a launcher's missiles or canisters are exhausted, it may
 * be reloaded by the turret's gunner in one turn. Reloading three launchers
 * would take three turns."
 *
 * Launcher ids are the turret id plus a one-based slot: T-1:1, T-1:2.
 */
export function reloadLauncher(encounter, { shipId, launcherId } = {}) {
  const next = freeze(encounter);
  next.log = encounter.log.map((entry) => ({ ...entry }));
  const participant = getParticipant(next, shipId);
  participant.ammunition = startLauncherReload(participant.ammunition, ammunitionContext(next), launcherId);
  logEvent(next, { kind: 'reload-started', shipId, launcherId });
  return next;
}

/**
 * What each launcher holds ready, and what is being loaded. Book 2 p.31's nine
 * rounds in a triple turret are three per rack, not a pool of nine.
 */
export function launcherStatus(participant) {
  return Object.freeze({
    launchers: Object.freeze(participant.ammunition.launchers.map((launcher) => Object.freeze({
      id: launcher.id,
      turretId: launcher.turretId,
      pool: launcher.pool,
      ready: launcher.ready,
      reloading: Boolean(launcher.reload),
      reloadRounds: launcher.reload?.rounds ?? 0
    }))),
    reserve: Object.freeze({ ...participant.ammunition.reserve }),
    totals: totalsAboard(participant.ammunition)
  });
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
  // A referee who allows no further shots has said the ship is away. Recording
  // zero and leaving it in the fight made BREAK OFF / 0 do nothing at all.
  if (shotsBeforeEscape === 0) participant.escaped = true;
  logEvent(next, {
    kind: 'flight',
    shipId,
    shotsBeforeEscape,
    note,
    refereeRuling: true,
    raw: false
  });
  if (participant.escaped) logEvent(next, { kind: 'escape', shipId });
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
    disposition: participant.disposition,
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

/**
 * Ruling (Graycloak, Sep 2026): combat ends when either side can no longer
 * fire. A ship with no working armed turret has no move left in the combat
 * system, and the previous condition — adrift AND toothless — meant a disarmed
 * but mobile ship was shot at indefinitely. A thirty-turn test fight never
 * terminated for exactly that reason.
 *
 * 'disabled' is the stronger ending: no guns and no manoeuvre drive, so the
 * ship is not going anywhere and a boarding is uncontested. 'disarmed' leaves
 * a ship that may still run, which p.37's referee shot count adjudicates.
 */
function applyDisabledOutcomes(encounter) {
  for (const side of SHIP_COMBAT_SIDES) {
    const present = encounter.participants.filter((participant) => participant.side === side
      && !participant.escaped && !participant.surrendered);
    if (!present.length) {
      encounter.outcome = 'disengaged';
      return encounter;
    }
    const statuses = present.map(participantStatus);
    if (statuses.every((status) => status.toothless)) {
      encounter.outcome = statuses.every((status) => status.adrift) ? 'disabled' : 'disarmed';
      return encounter;
    }
  }
  return encounter;
}

/**
 * What an encountered ship does now, on the Book 3 p.29 shape: a throw to
 * press the attack and a throw to break off, and if both are possible the
 * lower target wins. GRAYCLOAK EXTENSION — Book 2 supplies no such procedure.
 *
 * The DMs are what the disposition cares about. A pirate wanting a prize has
 * no reason to keep shooting once the target cannot shoot back, and every
 * reason to break off once it is itself hurt: a damaged pirate cannot profit
 * from a capture.
 */
export function shipCombatIntent(encounter, shipId, dice) {
  requireDice(dice);
  const participant = getParticipant(encounter, shipId);
  const disposition = shipDisposition(participant.disposition);
  const own = participantStatus(participant);
  const foes = encounter.participants.filter((entry) => entry.side !== participant.side
    && !entry.escaped && !entry.surrendered);
  const foeStatuses = foes.map(participantStatus);
  const allFoesDisarmed = foeStatuses.length > 0 && foeStatuses.every((status) => status.toothless);

  if (own.toothless) {
    return Object.freeze({ intent: 'break-off', reason: 'cannot fire', disposition: disposition.label, raw: false });
  }
  // A pirate or a patrol that has disarmed its target stops shooting: it wants
  // the ship, and there is nothing left to shoot at.
  if (allFoesDisarmed && disposition.boardsWhenDisarmed) {
    const mobile = foeStatuses.some((status) => !status.adrift);
    return Object.freeze({
      intent: mobile ? 'disable-drives' : 'board',
      reason: mobile ? 'target disarmed but still under power' : 'target disarmed and adrift',
      disposition: disposition.label, raw: false
    });
  }
  if (allFoesDisarmed) {
    return Object.freeze({ intent: 'break-off', reason: 'nothing left to fight', disposition: disposition.label, raw: false });
  }

  const hurt = own.damage.totalHits;
  const press = dice.roll2D6();
  const flee = dice.roll2D6();
  // Damage makes pressing harder and breaking off easier, in both directions.
  const pressTotal = press.total - hurt;
  const fleeTotal = flee.total + hurt;
  const canPress = pressTotal >= disposition.pressAttack;
  const wouldFlee = fleeTotal >= disposition.breakOff;
  // Book 3 p.29's tie-break: the lower requirement wins.
  const intent = canPress && wouldFlee
    ? (disposition.pressAttack <= disposition.breakOff ? 'press-attack' : 'break-off')
    : canPress ? 'press-attack' : wouldFlee ? 'break-off' : 'hold';
  return Object.freeze({
    intent,
    reason: `press ${pressTotal} vs ${disposition.pressAttack}, break off ${fleeTotal} vs ${disposition.breakOff}`,
    disposition: disposition.label,
    hits: hurt,
    raw: false
  });
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

// ---------------------------------------------------------------------------
// Boarding (Graycloak extension)
//
// Book 2 p.37 names boarding in a single clause — "the encounter should be
// resolved, whether by communicator, boarding, warning shots, or simple
// combat" — and supplies no procedure at all. Nothing in the 1977 books says
// how ships close, grapple or cross.
//
// Ruling (Graycloak, Sep 2026): a boarding is a Book 1 personal combat on the
// range-band board. This module does not fight it; it hands off. What it owns
// is the handoff: who may board whom and when, where the fight starts, and what
// the ship encounter contributes to it.
// ---------------------------------------------------------------------------

export const BOARDING_IS_RAW = false;

// A corridor fight. Book 1's short band is 1 to 5 metres, which is a ship's
// passageway; close is touching. Boarders arrive at short and close from there.
export const BOARDING_STARTING_RANGE = 'short';

// Book 2 p.36, the ship's locker: "Weapons other than knives are not generally
// stocked on non-military vessels, but characters owning their own ships may
// elect to provide shotguns, rifles, or other guns if they desire." So a crew
// defending its own ship has a blade unless the owner armed the locker.
export const SHIPS_LOCKER_DEFAULT_WEAPON = 'blade';

/**
 * Whether a boarding may be attempted, and what it would be walking into.
 *
 * Follows the combat ruling: a ship is boardable once it cannot fire, because
 * until then it is still a fight. Adrift as well and the boarding is
 * uncontested in the approach — the target cannot manoeuvre away.
 */
export function boardingAssessment(encounter, { boarderShipId, defenderShipId } = {}) {
  const boarder = getParticipant(encounter, boarderShipId);
  const defender = getParticipant(encounter, defenderShipId);
  if (boarder.side === defender.side) throw new Error('a ship cannot board its own side');
  const defenderStatus = participantStatus(defender);
  const boarderStatus = participantStatus(boarder);

  const blockers = [];
  if (defender.escaped) blockers.push('the target has escaped');
  if (!defenderStatus.toothless && !defender.surrendered) {
    blockers.push('the target can still fire; boarding is offered once it cannot');
  }
  if (boarderStatus.adrift) blockers.push('the boarding ship cannot manoeuvre alongside');

  return Object.freeze({
    boarderShipId,
    defenderShipId,
    allowed: blockers.length === 0,
    blockers: Object.freeze(blockers),
    // Book 2 p.35: a ship that depressurised before combat, or one whose hull
    // was breached, has no air in it. Book 1 has no vacc suit armour type and
    // no rule for fighting in one, so the consequences are the referee's.
    defenderDecompressed: hullDecompressed(defender.ship) || defender.pressurisedSections.length === 0,
    defenderAdrift: defenderStatus.adrift,
    defenderSurrendered: Boolean(defender.surrendered),
    uncontestedApproach: defenderStatus.adrift || Boolean(defender.surrendered),
    raw: BOARDING_IS_RAW
  });
}

/**
 * The handoff. Returns everything a Book 1 personal encounter needs, plus the
 * provenance that ties it back to the ship fight it came out of.
 *
 * Rosters are passed in rather than derived: the ship encounter knows who is
 * aboard and where, but only the campaign has their characteristics and
 * skills. `armed` names the weapon a side's locker provided, defaulting to
 * Book 2 p.36's blade.
 */
export function prepareBoardingAction(encounter, {
  boarderShipId,
  defenderShipId,
  boarders = [],
  defenders = [],
  startingRange = BOARDING_STARTING_RANGE,
  refereeOverride = false
} = {}) {
  const assessment = boardingAssessment(encounter, { boarderShipId, defenderShipId });
  if (!assessment.allowed && !refereeOverride) {
    throw new Error(`boarding is not available: ${assessment.blockers.join('; ')}`);
  }
  if (!PERSONAL_COMBAT_RANGES.includes(startingRange)) throw new RangeError(`unknown range: ${startingRange}`);
  if (!boarders.length) throw new RangeError('a boarding needs a boarding party');

  const boarder = getParticipant(encounter, boarderShipId);
  const defender = getParticipant(encounter, defenderShipId);
  const toCombatant = (person, side) => createPersonalCombatant({
    id: person.id,
    name: person.name,
    side,
    characteristics: person.characteristics,
    skills: person.skills ?? {},
    armor: person.armor ?? 'none',
    weaponKey: person.weaponKey ?? SHIPS_LOCKER_DEFAULT_WEAPON,
    playerCharacter: Boolean(person.playerCharacter)
  });

  const notes = [
    'Graycloak extension: Book 2 p.37 names boarding and gives no procedure, so this is a Book 1 personal combat.',
    `Boarders arrive at ${startingRange} range — Book 1's short band is 1 to 5 metres, which is a ship's passageway.`
  ];
  if (assessment.defenderDecompressed) {
    notes.push('The target has no air in it. Book 1 has no vacc suit armour type and no rule for fighting in one, so the consequences are the referee\u2019s.');
  }
  if (assessment.defenderSurrendered) notes.push('The target has surrendered; whether anyone resists is the referee\u2019s call.');
  if (!assessment.allowed && refereeOverride) {
    notes.push(`Referee overrode: ${assessment.blockers.join('; ')}.`);
  }

  return Object.freeze({
    kind: 'boarding',
    range: startingRange,
    assessment,
    sides: Object.freeze({ boarder: boarder.name, defender: defender.name }),
    combatants: Object.freeze([
      ...boarders.map((person) => toCombatant(person, 'boarder')),
      ...defenders.map((person) => toCombatant(person, 'defender'))
    ]),
    // What the ship fight contributes, so the personal encounter can be read
    // back to it and the outcome applied to the right ships.
    provenance: Object.freeze({
      shipEncounterId: encounter.id,
      campaignId: encounter.campaignId,
      gameTurn: encounter.gameTurn,
      elapsedMinutes: elapsedMinutes(encounter),
      shipCombatOutcome: encounter.outcome,
      boarderShipId,
      defenderShipId
    }),
    notes: Object.freeze(notes),
    raw: BOARDING_IS_RAW
  });
}

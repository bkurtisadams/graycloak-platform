// Book 2 (1977), pp.22,25-26: 1 unit = 1000 miles; 1 turn = 10 minutes.
// Clear space only. No gravity or ordnance trajectories in this first slice.
import { currentDriveState, damageReport } from './damage.js';
import { currentPhase, checkShipComputer, cycleIntoCpu } from './ship-combat.js';
import { createPlanet, moveWithGravity, applyAtmosphericBraking } from './planetary-gravity.js';
import { previewVectorOrdnance } from './vector-ordnance.js';
const copy = value => JSON.parse(JSON.stringify(value));
function finitePoint(p) { return p && Number.isFinite(p.x) && Number.isFinite(p.y); }
// v1.215.00: a planet may be placed in the encounter, which turns on Book 2
// p.29 gravity and p.35 atmospheric braking. `atmosphere` is Book 3's digit,
// since only standard (6) and dense (8) brake and a planet template carries no
// UWP of its own.
export function enableVectorMovement(encounter, states, { planet = null, atmosphere = null } = {}) {
  const next = copy(encounter);
  if (encounter.gameTurn !== 1 || encounter.phaseIndex !== 0 || encounter.log.length) throw new Error('choose spatial mode before the first action');
  next.spatialMode = 'vector';
  next.spatial = { ships: {}, planet: planet ? copy(planet) : null, atmosphere, accelerationMode: 'instantaneous' };
  for (const p of next.participants) {
    const s = states[p.id];
    if (!finitePoint(s?.position) || !finitePoint(s?.velocity)) throw new Error('finite starting position and velocity required');
    next.spatial.ships[p.id] = { position: copy(s.position), velocity: copy(s.velocity), movedTurn: 0 };
  }
  return next;
}
export function previewShipVector(encounter, shipId, acceleration = { x: 0, y: 0 }) {
  if (encounter.spatialMode !== 'vector') throw new Error('vector mode required');
  if (!finitePoint(acceleration)) throw new Error('finite acceleration required');
  const p = encounter.participants.find(p => p.id === shipId);
  if (!p) throw new Error('unknown ship');
  const s = encounter.spatial.ships[shipId];
  const report = damageReport(p.ship);
  const maximumG = report.adrift ? 0 : Math.max(0, currentDriveState(p.ship, 'maneuverDrive').potential ?? 0);
  const g = Math.hypot(acceleration.x, acceleration.y) / 2;
  if (g > maximumG + 1e-9) throw new Error(`acceleration exceeds functioning ${maximumG} G drive`);
  // Book 2 p.29: gravity is sampled at the midpoint of the ship's course vector
  // and added along with the thrust. Book 2 p.26's drive limit applies only to
  // voluntary thrust, which is why it is checked above and gravity is not.
  const planet = encounter.spatial.planet ?? null;
  const moved = moveWithGravity({
    position: s.position, velocity: s.velocity, thrust: acceleration, planet,
    accelerationMode: encounter.spatial.accelerationMode ?? 'instantaneous'
  });
  if (!moved.resolved) {
    return { from: copy(s.position), unresolved: true, reason: moved.reason, requiresReferee: true, acceleration: copy(acceleration), g, maximumG };
  }
  // Book 2 p.35: a vector passing within a quarter unit of the surface of a
  // standard or dense atmosphere is shortened by a quarter unit.
  const braking = applyAtmosphericBraking({
    from: moved.from, endpoint: moved.endpoint, velocity: moved.velocity,
    planet, atmosphere: encounter.spatial.atmosphere
  });
  return {
    from: copy(s.position),
    velocity: braking.velocity,
    endpoint: braking.endpoint,
    acceleration: copy(acceleration),
    g,
    maximumG,
    bandG: moved.bandG,
    gravity: moved.gravity,
    braked: braking.braked,
    brakingReason: braking.braked ? braking.reason : null,
    surfaceContact: moved.surfaceContact,
    requiresReferee: moved.requiresReferee
  };
}
export function commitShipVector(encounter, shipId, acceleration, dice) {
  const p = encounter.participants.find(p => p.id === shipId);
  if (encounter.outcome !== 'in-progress' || currentPhase(encounter).key !== 'movement' || p?.side !== encounter.phasingSide || p.escaped || p.surrendered) throw new Error('ship cannot move in this phase');
  if (encounter.spatial.ships[shipId].movedTurn === encounter.gameTurn) throw new Error('ship already moved this turn');
  let preview = previewShipVector(encounter, shipId, acceleration);
  if (preview.unresolved) throw new Error(`course cannot be resolved: ${preview.reason}`);
  // v0.53.0: Book 2's gravity bands are external, and nothing in pp.26-29 or
  // p.35 says what a vector through a world does. The engine refuses the course
  // rather than flying a ship through a planet; the referee records a surface
  // ruling instead (adjudicateVectorSurface).
  if (preview.surfaceContact) throw new Error(surfaceRefusal(p.name));
  const next = copy(encounter), participant = next.participants.find(p => p.id === shipId);
  if (preview.g > 0) {
    const maneuver = participant.computer.loaded.find(k => k === 'maneuver' || k.startsWith('maneuver-evade-'));
    if (!maneuver || !cycleIntoCpu(participant, { required: [maneuver] }).possible) throw new Error('maneuver program and CPU capacity required');
    if (!checkShipComputer(next, participant, dice)) {
      preview = previewShipVector(next, shipId, { x: 0, y: 0 });
      // The computer failed, so the ship coasts — and a coasting course can
      // meet the world as well. Still the referee's call.
      if (preview.unresolved || preview.surfaceContact) throw new Error(`computer failed; ${surfaceRefusal(p.name)}`);
    }
  }
  next.spatial.ships[shipId] = { position: preview.endpoint, velocity: preview.velocity, movedTurn: next.gameTurn };
  next.log.push({ gameTurn: next.gameTurn, phasingSide: next.phasingSide, phase: 'movement', kind: 'vector-move', shipId, ...preview });
  return next;
}
function surfaceRefusal(name) {
  return `${name}'s course reaches the world's surface. Book 2 has no rule for that: record a surface ruling`;
}

/**
 * Book 2 p.26: a ship's vector "determines the direction and distance a ship
 * will travel in the next turn, provided it is not changed by voluntary
 * acceleration, or by gravitational effects". Movement is not optional; thrust
 * is. Every phasing ship that has not moved this turn travels its vector with
 * no thrust, gravity included (p.29) and braking included (p.35).
 *
 * No computer throw: coasting uses no drive, so p.34's throw to operate does
 * not arise.
 *
 * A coasting course that reaches the surface, or whose midpoint is inside it,
 * is not moved. It is returned in `awaitingRuling` for the referee, because p.23
 * does not let the movement phase end with a ship unmoved.
 *
 * Escaped and surrendered ships are skipped, matching commitShipVector's
 * eligibility.
 */
export function coastVectorShips(encounter) {
  if (encounter.spatialMode !== 'vector') throw new Error('vector mode required');
  if (encounter.outcome !== 'in-progress' || currentPhase(encounter).key !== 'movement') {
    throw new Error('ships coast in the movement phase');
  }
  const next = copy(encounter);
  const coasted = [], awaitingRuling = [];
  for (const participant of next.participants) {
    if (participant.side !== next.phasingSide || participant.escaped || participant.surrendered) continue;
    const state = next.spatial.ships[participant.id];
    if (!state || state.movedTurn === next.gameTurn) continue;
    const preview = previewShipVector(next, participant.id, { x: 0, y: 0 });
    if (preview.unresolved || preview.surfaceContact) {
      awaitingRuling.push({ shipId: participant.id, name: participant.name, reason: preview.unresolved ? preview.reason : 'surface-contact' });
      continue;
    }
    next.spatial.ships[participant.id] = { position: preview.endpoint, velocity: preview.velocity, movedTurn: next.gameTurn };
    const entry = { gameTurn: next.gameTurn, phasingSide: next.phasingSide, phase: 'movement', kind: 'vector-move', coasted: true, shipId: participant.id, ...preview };
    next.log.push(entry);
    coasted.push(entry);
  }
  return { encounter: next, coasted, awaitingRuling };
}

export function vectorRangeDM(encounter, a, b) {
  const x = encounter.spatial.ships[a].position, y = encounter.spatial.ships[b].position;
  const distance = Math.hypot(x.x-y.x, x.y-y.y);
  return { distance, dm: distance > 300 ? -5 : distance > 150 ? -2 : 0 };
}

/**
 * Place or replace the world after vector mode is on, and choose Book 2 p.37's
 * optional constant-acceleration rule. Takes a specification rather than a
 * built template so the encounter owns the planet it carries.
 *
 * Before the first action only: a world appearing mid-fight would change every
 * course already plotted.
 */
export function configureVectorPlanet(encounter, specification, accelerationMode = 'instantaneous', { atmosphere = null } = {}) {
  if (encounter.spatialMode !== 'vector' || encounter.gameTurn !== 1 || encounter.phaseIndex !== 0 || encounter.log.length) {
    throw new Error('configure planet before the first action');
  }
  if (!['instantaneous', 'constant'].includes(accelerationMode)) throw new Error('invalid acceleration mode');
  const next = copy(encounter);
  next.spatial.planet = specification ? createPlanet(specification) : null;
  next.spatial.accelerationMode = accelerationMode;
  // Book 3's atmosphere digit, for p.35 braking. Only standard and dense brake.
  if (atmosphere !== null) next.spatial.atmosphere = atmosphere;
  return next;
}

/**
 * Book 2's gravity bands are external and nothing in it describes motion inside
 * a world, so a course that reaches the surface is the referee's to resolve.
 * This records that ruling explicitly rather than inventing a landing, an
 * atmospheric entry or a destruction rule.
 *
 * Requires a note, and refuses to place the object inside the surface — a ship
 * that has genuinely landed or been destroyed ends the encounter instead.
 */
export function adjudicateVectorSurface(encounter, { id, position, velocity, note } = {}) {
  if (encounter.outcome !== 'in-progress' || encounter.spatialMode !== 'vector' || currentPhase(encounter).key !== 'movement') {
    throw new Error('surface ruling requires vector movement phase');
  }
  if (!finitePoint(position) || !finitePoint(velocity) || !String(note ?? '').trim()) {
    throw new Error('finite position, velocity and ruling note required');
  }
  const next = copy(encounter);
  const ship = next.participants.find((participant) => participant.id === id);
  const object = ship ? next.spatial.ships[id] : next.ordnance.find((round) => round.id === id);
  const side = ship?.side ?? object?.launcherSide;
  if (!object || side !== next.phasingSide || object.movedTurn === next.gameTurn || (ship && (ship.escaped || ship.surrendered))) {
    throw new Error('object cannot be adjudicated this phase');
  }
  if (!ship && !['in-flight', 'active', 'pending-effect'].includes(object.status)) throw new Error('ordnance cannot move');
  if (!ship && object.launchedGameTurn >= next.gameTurn) throw new Error('ordnance waits until next friendly movement');
  const preview = ship ? previewShipVector(next, id, { x: 0, y: 0 }) : previewVectorOrdnance(next, object);
  if (preview.resolved !== false && !preview.surfaceContact && !preview.unresolved) {
    throw new Error('no surface contact on the coasting course; choose another maneuver');
  }
  const planet = next.spatial.planet;
  if (planet && Math.hypot(position.x - planet.center.x, position.y - planet.center.y) <= planet.radius) {
    throw new Error('place the resolved object outside the surface; close the encounter for a landing or a loss');
  }
  object.position = copy(position);
  object.velocity = copy(velocity);
  object.movedTurn = next.gameTurn;
  next.log.push({
    gameTurn: next.gameTurn, phasingSide: next.phasingSide, phase: 'movement',
    kind: 'surface-ruling', id, position: copy(position), velocity: copy(velocity),
    note: String(note), refereeRuling: true, raw: false
  });
  return next;
}

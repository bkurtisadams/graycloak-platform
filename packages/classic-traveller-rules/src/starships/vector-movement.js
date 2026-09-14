// Book 2 (1977), pp.22,25-26: 1 unit = 1000 miles; 1 turn = 10 minutes.
// Clear space only. No gravity or ordnance trajectories in this first slice.
import { currentDriveState, damageReport } from './damage.js';
import { currentPhase, checkShipComputer, cycleIntoCpu } from './ship-combat.js';
import { moveWithGravity, applyAtmosphericBraking } from './planetary-gravity.js';
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
  next.spatial = { ships: {}, planet: planet ? copy(planet) : null, atmosphere };
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
    position: s.position, velocity: s.velocity, thrust: acceleration, planet
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
  const next = copy(encounter), participant = next.participants.find(p => p.id === shipId);
  if (preview.g > 0) {
    const maneuver = participant.computer.loaded.find(k => k === 'maneuver' || k.startsWith('maneuver-evade-'));
    if (!maneuver || !cycleIntoCpu(participant, { required: [maneuver] }).possible) throw new Error('maneuver program and CPU capacity required');
    if (!checkShipComputer(next, participant, dice)) preview = previewShipVector(next, shipId, { x: 0, y: 0 });
  }
  next.spatial.ships[shipId] = { position: preview.endpoint, velocity: preview.velocity, movedTurn: next.gameTurn };
  next.log.push({ gameTurn: next.gameTurn, phasingSide: next.phasingSide, phase: 'movement', kind: 'vector-move', shipId, ...preview });
  return next;
}
export function vectorRangeDM(encounter, a, b) {
  const x = encounter.spatial.ships[a].position, y = encounter.spatial.ships[b].position;
  const distance = Math.hypot(x.x-y.x, x.y-y.y);
  return { distance, dm: distance > 300 ? -5 : distance > 150 ? -2 : 0 };
}

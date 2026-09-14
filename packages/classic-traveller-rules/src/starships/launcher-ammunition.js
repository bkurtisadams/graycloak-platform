/**
 * Launcher-specific ammunition — Traveller Book 2 (1977), p.30.
 * Standalone ES module; no imports, DOM, dice, or game mutations.
 *
 * Printed: three ready rounds per launcher; one launch per launcher per launch
 * phase; reload an exhausted launcher in one turn; its gunner cannot fire other
 * weapons in the turret while reloading. Three launchers take that gunner three
 * turns. Separate gunners may reload their own turrets concurrently.
 *
 * Explicit implementation conventions:
 * - Declare reload at friendly movement; finish next friendly movement (one
 *   ten-minute game turn). This also locks intervening reactive fire.
 * - Reserve rounds at declaration; transfer at completion. Partial reserve stocks
 *   may fill fewer than three slots but still take one full turn. No topping up.
 * - Incapacitation cancels pending reload and returns reserved rounds to stores;
 *   no ammunition destruction is invented. Stored ready rounds remain unusable
 *   until the turret is operational again. Referee may resolve other damage.
 * - Standard missiles and sand only, matching the game's two numeric pools.
 *   Missile-type inventories are not invented here.
 *
 * Integration: store this sidecar under the encounter participant, NOT inside
 * ship.state.armament (its schema currently rejects extra fields). Existing
 * armament totals include all rounds aboard: ready + reserve + being loaded.
 * Set initial readyByLauncher explicitly; missing entries mean EMPTY, never full.
 * Launcher IDs are `${turretId}:${weapon-array-index + 1}` (one-based slots).
 * Do not reorder/refit weapon slots mid-encounter.
 *
 * Call advanceLauncherClock every phase; it completes due reloads idempotently.
 * Before any laser/return/anti-missile fire, call assertTurretCanFire.
 * After all launch/program/target checks succeed, call fireLauncher in the SAME
 * transaction as creating the missile/sand object. Use totalsAboard to write ship
 * totals; do NOT deduct a second time in the old launch code. Persist the sidecar
 * with that transaction and the final ship. This module does not wire itself in.
 */
export const READY_CAPACITY = 3;
const PHASES = ['movement', 'laser-fire', 'return-fire', 'ordnance-launch', 'reprogramming'];
const SIDES = ['intruder', 'native'];
const POOLS = ['missiles', 'sandCanisters'];
const clone = value => JSON.parse(JSON.stringify(value));
function integer(value, name, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum) throw new RangeError(`${name} must be a safe integer >= ${minimum}`);
  return value;
}
function tickOf({ gameTurn, phasingSide, phase } = {}) {
  integer(gameTurn, 'gameTurn', 1);
  if (!SIDES.includes(phasingSide) || !PHASES.includes(phase)) throw new Error('valid phasingSide and phase required');
  return integer((gameTurn - 1) * 10 + SIDES.indexOf(phasingSide) * 5 + PHASES.indexOf(phase), 'phase tick');
}
function getTurret(state, id) {
  const turret = state.turrets.find(t => t.id === id);
  if (!turret) throw new Error(`unknown turret ${id}`);
  return turret;
}
function getLauncher(state, id) {
  const launcher = state.launchers.find(l => l.id === id);
  if (!launcher) throw new Error(`unknown launcher ${id}`);
  return launcher;
}

/** Validate a checkpoint before use. Returns the supplied object without edits. */
export function validateLauncherState(state) {
  if (!state || state.schemaVersion !== 1 || !SIDES.includes(state.ownerSide)) throw new Error('invalid launcher state version or side');
  integer(state.clock, 'clock', -1);
  if (!Array.isArray(state.turrets) || !Array.isArray(state.launchers)) throw new Error('turrets and launchers required');
  for (const pool of POOLS) integer(state.reserve?.[pool], `reserve.${pool}`);
  const turretIds = new Set(), ids = new Set(), loadingGunners = new Set();
  for (const t of state.turrets) {
    if (typeof t.id !== 'string' || !t.id || turretIds.has(t.id) || typeof t.operational !== 'boolean') throw new Error('invalid/duplicate turret');
    if (t.gunnerId !== null && (typeof t.gunnerId !== 'string' || !t.gunnerId)) throw new Error('invalid gunner');
    turretIds.add(t.id);
  }
  for (const l of state.launchers) {
    if (typeof l.id !== 'string' || !l.id || ids.has(l.id) || !turretIds.has(l.turretId) || !POOLS.includes(l.pool)) throw new Error('invalid/duplicate launcher');
    ids.add(l.id); integer(l.ready, 'ready'); integer(l.lastLaunchTick, 'lastLaunchTick', -1);
    if (l.ready > READY_CAPACITY || l.lastLaunchTick > state.clock) throw new Error('invalid ready count or launch clock');
    if (l.reload) {
      integer(l.reload.rounds, 'reload rounds', 1); integer(l.reload.startedAt, 'reload start'); integer(l.reload.completesAt, 'reload completion');
      const turret = getTurret(state, l.turretId);
      if (l.ready || l.reload.rounds > READY_CAPACITY || !turret.operational || !turret.gunnerId || turret.gunnerId !== l.reload.gunnerId || loadingGunners.has(turret.gunnerId) || l.reload.completesAt !== l.reload.startedAt + 10 || l.reload.startedAt > state.clock) throw new Error('invalid reload reservation');
      loadingGunners.add(turret.gunnerId);
    }
  }
  if (!Array.isArray(state.log)) throw new Error('log required');
  return state;
}

/** armament is the existing ship.state.armament; totals include loaded rounds. */
export function createLauncherState({ armament, ownerSide, gunners = {}, readyByLauncher = {}, disabledTurretIds = [] } = {}) {
  if (!SIDES.includes(ownerSide) || !Array.isArray(armament?.turrets)) throw new Error('ownerSide and armament required');
  const state = { schemaVersion: 1, ownerSide, clock: -1, turrets: [], launchers: [],
    reserve: { missiles: integer(armament.missiles, 'missiles'), sandCanisters: integer(armament.sandCanisters, 'sandCanisters') }, log: [] };
  for (const t of armament.turrets) {
    if (!Array.isArray(t.weapons)) throw new Error('weapon slots required');
    state.turrets.push({ id: t.id, gunnerId: gunners[t.id] ?? null, operational: !disabledTurretIds.includes(t.id) });
    t.weapons.forEach((weapon, index) => {
      if (!['missile-launcher', 'sandcaster'].includes(weapon)) return;
      const id = `${t.id}:${index + 1}`, pool = weapon === 'missile-launcher' ? 'missiles' : 'sandCanisters';
      const ready = integer(readyByLauncher[id] ?? 0, `${id} ready`);
      if (ready > READY_CAPACITY || ready > state.reserve[pool]) throw new Error(`initial ready rounds exceed capacity or stock: ${id}`);
      state.reserve[pool] -= ready;
      state.launchers.push({ id, turretId: t.id, pool, ready, lastLaunchTick: -1, reload: null });
    });
  }
  for (const id of Object.keys(readyByLauncher)) getLauncher(state, id);
  for (const id of disabledTurretIds) getTurret(state, id);
  return validateLauncherState(state);
}

/** Forward-only clock: repeated calls at the same phase cannot reload twice. */
export function advanceLauncherClock(state, context) {
  validateLauncherState(state);
  const tick = tickOf(context);
  if (tick < state.clock) throw new Error('cannot move launcher clock backwards');
  const next = clone(state);
  next.clock = tick;
  for (const l of next.launchers) {
    if (l.reload && l.reload.completesAt <= tick) {
      const job = l.reload;
      l.ready += job.rounds; l.reload = null;
      next.log.push({ kind: 'reload-completed', tick: job.completesAt, launcherId: l.id, rounds: job.rounds });
    }
  }
  return next;
}
// v1.218.00, on port: the original required an assigned gunner for ANY turret
// action, firing included. Book 2 p.17 says otherwise — "in many cases,
// especially where trouble is not expected, the gunner position will be
// omitted" — so an unmanned turret fires, and merely gets nothing from Gunner
// Interact. The gunner requirement belongs to reloading, which p.31 gives to
// "the turret's gunner".
//
// Split accordingly: both paths respect the reload lock and an incapacitated
// turret; only reloading demands a gunner.
function ensureTurretFree(state, turret) {
  if (!turret.operational) throw new Error('turret is incapacitated');
  if (state.launchers.some(l => l.reload && (l.turretId === turret.id || (turret.gunnerId && l.reload.gunnerId === turret.gunnerId)))) throw new Error('gunner is reloading; turret cannot fire or start another reload');
}
function ensureGunnerFree(state, turret) {
  ensureTurretFree(state, turret);
  if (!turret.gunnerId) throw new Error('assigned gunner required');
}

/** A reload starts only in friendly movement, on an empty launcher. */
export function startLauncherReload(state, context, launcherId) {
  const next = advanceLauncherClock(state, context);
  if (context.phasingSide !== next.ownerSide || context.phase !== 'movement') throw new Error('declare reload in friendly movement');
  const l = getLauncher(next, launcherId), turret = getTurret(next, l.turretId);
  ensureGunnerFree(next, turret);
  if (l.ready) throw new Error('launcher must be exhausted before reloading');
  const rounds = Math.min(READY_CAPACITY, next.reserve[l.pool]);
  if (!rounds) throw new Error('no reserve ammunition available');
  next.reserve[l.pool] -= rounds;
  l.reload = { gunnerId: turret.gunnerId, rounds, startedAt: next.clock, completesAt: next.clock + 10 };
  next.log.push({ kind: 'reload-started', tick: next.clock, launcherId, rounds, gunnerId: turret.gunnerId });
  return next;
}

/** Guard ALL weapon fire, including laser anti-missile fire. ECM is not turret fire.
 * Returns the advanced state so callers can persist due completion events.
 * Existing combat code still checks programs, targets, damage and firing limits.
 */
export function assertTurretCanFire(state, context, turretId, mode = 'laser') {
  const next = advanceLauncherClock(state, context);
  const friendly = context.phasingSide === next.ownerSide;
  const allowed = mode === 'launch' ? friendly && context.phase === 'ordnance-launch'
    : mode === 'laser' ? (friendly && context.phase === 'laser-fire') || (!friendly && context.phase === 'return-fire')
    : mode === 'anti-missile' ? !friendly && context.phase === 'return-fire' : false;
  if (!allowed) throw new Error('wrong phase or side for this weapon action');
  ensureTurretFree(next, getTurret(next, turretId));
  return next;
}

/** Consume exactly one ready round after the caller's other checks succeed. */
export function fireLauncher(state, context, launcherId) {
  validateLauncherState(state);
  const original = getLauncher(state, launcherId);
  const next = assertTurretCanFire(state, context, original.turretId, 'launch');
  const l = getLauncher(next, launcherId);
  if (l.lastLaunchTick === next.clock) throw new Error('launcher already fired this launch phase');
  if (!l.ready) throw new Error('launcher empty; reserve ammunition must be reloaded');
  l.ready -= 1; l.lastLaunchTick = next.clock;
  next.log.push({ kind: 'launcher-fired', tick: next.clock, launcherId, pool: l.pool });
  return next;
}

/** Notify at the damage event, not later; cancellation conserves ammunition. */
export function setTurretOperational(state, context, turretId, operational) {
  if (typeof operational !== 'boolean') throw new Error('operational must be boolean');
  const next = advanceLauncherClock(state, context), turret = getTurret(next, turretId);
  turret.operational = operational;
  if (!operational) for (const l of next.launchers) {
    if (l.turretId === turretId && l.reload) {
      next.reserve[l.pool] += l.reload.rounds;
      next.log.push({ kind: 'reload-cancelled-by-damage', tick: next.clock, launcherId: l.id, rounds: l.reload.rounds });
      l.reload = null;
    }
  }
  return next;
}

/** Pool totals for reconciliation: reloading transfers ammo; firing expends it. */
export function totalsAboard(state) {
  validateLauncherState(state);
  const totals = { ...state.reserve };
  for (const l of state.launchers) totals[l.pool] += l.ready + (l.reload?.rounds ?? 0);
  return totals;
}

// ---------------------------------------------------------------------------
// v0.190.0: T on a hovered ship — which turrets that aims, and when it refuses.
//
// Book 2 p.29: all the lasers in one turret fire on the same target, and a
// ship's turrets may fire on different targets only with a Multi-Target
// program. So a target belongs to a TURRET, and the allocation is
// shipId -> turretId -> targetId, the shape app.js has always kept.
//
// Rulings (Kurt, 2026-09-16, provisional):
//   - Without Multi-Target, T points every turret that can fire at the hovered
//     ship. They must share a target, so one key sets the whole ship's fire.
//   - With Multi-Target N, each T gives the hovered ship to the next free
//     turret; at most N different targets (rules package turretTargetLimit).
//   - An armed turret (chosen on its card chip) takes the next T alone.
//   - Shift+T clears the armed turret, or every turret on the ship.
//
// Plain data in, plain data out: the rules (which turrets may fire at whom,
// and why not) come from fightTokenMenuModel and the rules package, and the
// app only applies the result and shows the message.
// ---------------------------------------------------------------------------

import { currentPhase, actingSide, turretTargetLimit } from '../vendor/classic-traveller-rules/index.js?v=r0.80.0';
import { fightTokenMenuModel } from './ship-token-menu.js';

const FIRE_PHASES = new Set(['laser-fire', 'return-fire']);

const copyAllocation = (allocation) => Object.fromEntries(
  Object.entries(allocation ?? {}).map(([shipId, byTurret]) => [shipId, { ...byTurret }])
);

const named = (encounter, id) => (encounter.participants.find((entry) => entry.id === id)?.name ?? id).toUpperCase();

function refuse(allocation, message) {
  return { allocation, ok: false, message, assigned: [] };
}

/**
 * Aim `shooterId`'s turrets at `targetId`. Returns { allocation, ok, message,
 * assigned }, where `assigned` lists the turret ids this press set.
 */
export function targetHoveredShip(encounter, allocation, { shooterId, targetId, armedTurretId = null }) {
  const current = allocation ?? {};
  if (!encounter || encounter.outcome !== 'in-progress') return refuse(current, 'THE FIGHT IS OVER');
  const phase = currentPhase(encounter);
  if (!FIRE_PHASES.has(phase.key)) {
    return refuse(current, `T AIMS TURRETS IN LASER FIRE AND RETURN FIRE / THIS IS ${phase.label.toUpperCase()}`);
  }
  const shooter = encounter.participants.find((entry) => entry.id === shooterId);
  const target = encounter.participants.find((entry) => entry.id === targetId);
  if (!shooter || !target) return refuse(current, 'HOVER A SHIP TO TARGET IT');
  if (shooter.side !== actingSide(encounter)) {
    return refuse(current, `${named(encounter, shooterId)} IS NOT ACTING / SELECT A SHIP ON THE ACTING SIDE`);
  }
  if (target.side === shooter.side) return refuse(current, `${named(encounter, targetId)} IS ON ${named(encounter, shooterId)}'S OWN SIDE`);

  // Every turret on the shooter that could fire at this target, with the
  // reason any of them cannot (knocked out, reloading, return-fire programs).
  const turrets = fightTokenMenuModel(encounter, targetId).fireAt.filter((entry) => entry.shipId === shooterId);
  if (phase.key === 'return-fire' && !shooter.wasFiredAtBy.includes(targetId)) {
    return refuse(current, `${named(encounter, shooterId)} MAY RETURN FIRE ONLY AT A SHIP THAT FIRED ON IT (BOOK 2 P.30)`);
  }
  const usable = turrets.filter((entry) => !entry.blocked).map((entry) => entry.turretId);
  if (!usable.length) {
    const reason = turrets.find((entry) => entry.blocked)?.blocked;
    return refuse(current, `NO TURRET ON ${named(encounter, shooterId)} CAN FIRE${reason ? ` / ${reason.toUpperCase()}` : ''}`);
  }

  const { limit, program } = turretTargetLimit(shooter);
  const mine = { ...(current[shooterId] ?? {}) };
  const distinctAfter = (byTurret) => new Set(Object.values(byTurret)).size;
  const limitMessage = () => (program
    ? `${program.toUpperCase().replace('MULTI-TARGET-', 'MULTI-TARGET ')}: ${limit} TARGETS ALREADY / SHIFT+T CLEARS`
    : `NEEDS MULTI-TARGET FOR A SECOND TARGET (BOOK 2 P.29) / SHIFT+T CLEARS`);
  const withMine = (byTurret) => {
    const next = copyAllocation(current);
    if (Object.keys(byTurret).length) next[shooterId] = byTurret; else delete next[shooterId];
    return next;
  };

  // An armed turret takes this press alone.
  if (armedTurretId) {
    if (!usable.includes(armedTurretId)) {
      const blocked = turrets.find((entry) => entry.turretId === armedTurretId)?.blocked;
      return refuse(current, `${armedTurretId} CANNOT FIRE AT ${named(encounter, targetId)}${blocked ? ` / ${blocked.toUpperCase()}` : ''}`);
    }
    const trial = { ...mine, [armedTurretId]: targetId };
    if (distinctAfter(trial) > limit) return refuse(current, limitMessage());
    return { allocation: withMine(trial), ok: true, message: `${armedTurretId} \u2192 ${named(encounter, targetId)}`, assigned: [armedTurretId] };
  }

  // No Multi-Target: the whole ship shares one target.
  if (limit === 1) {
    const all = Object.fromEntries(usable.map((turretId) => [turretId, targetId]));
    return {
      allocation: withMine(all), ok: true, assigned: usable,
      message: `${usable.length === 1 ? usable[0] : `ALL ${usable.length} TURRETS`} \u2192 ${named(encounter, targetId)}`
    };
  }

  // Multi-Target: the next free turret.
  const free = usable.find((turretId) => !mine[turretId]);
  if (!free) return refuse(current, `EVERY TURRET ON ${named(encounter, shooterId)} IS ASSIGNED / SHIFT+T CLEARS`);
  const trial = { ...mine, [free]: targetId };
  if (distinctAfter(trial) > limit) return refuse(current, limitMessage());
  return { allocation: withMine(trial), ok: true, message: `${free} \u2192 ${named(encounter, targetId)}`, assigned: [free] };
}

/** Shift+T: the armed turret, or every turret on the ship. */
export function clearShipTargets(encounter, allocation, { shooterId, armedTurretId = null }) {
  const next = copyAllocation(allocation);
  if (!next[shooterId]) return { allocation: next, message: `${named(encounter, shooterId)} HAS NO TARGETS` };
  if (armedTurretId) {
    delete next[shooterId][armedTurretId];
    if (!Object.keys(next[shooterId]).length) delete next[shooterId];
    return { allocation: next, message: `${armedTurretId} HOLDS FIRE` };
  }
  delete next[shooterId];
  return { allocation: next, message: `${named(encounter, shooterId)} HOLDS FIRE` };
}

/** The ships a shooter's turrets are aimed at, for the plot's target rings. */
export function targetsOfShip(allocation, shooterId) {
  return [...new Set(Object.values(allocation?.[shooterId] ?? {}))];
}

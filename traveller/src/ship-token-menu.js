// ---------------------------------------------------------------------------
// v0.170.0: what a right-click on a ship token offers.
//
// Two menus, because staging a scene and fighting on it are different jobs.
// Both are computed here as plain data, so the app only turns them into menu
// items and actions, and the rules about what may be offered are testable.
//
// The fight menu is filtered to the phase: it never offers what the engine
// would refuse, and when an item is shown but unavailable it says why.
// ---------------------------------------------------------------------------

import {
  currentPhase, actingSide, vectorRangeDM, previewShipVector, returnFireEligibility,
  launcherStatus, turretOperational, turretWeapons, getTurretWeapon
} from '../vendor/classic-traveller-rules/index.js?v=r0.82.0';
import { sceneActorIsDesignReference, SCENE_TOKEN_SIDES } from './scene-document.js';

// ---------------------------------------------------------------------------
// Staging
// ---------------------------------------------------------------------------

export function stagingTokenMenuModel(scene, tokenId) {
  const token = scene.tokens.find((entry) => entry.id === tokenId);
  if (!token) throw new Error('token is not on this scene');
  return {
    tokenId,
    label: token.label || token.actorId,
    side: token.side,
    sides: [...SCENE_TOKEN_SIDES],
    // A design is plans (Book 2 p.9), so another hull can be built from it; the
    // campaign's own ship is one hull and cannot.
    canDuplicate: sceneActorIsDesignReference(token.actorId),
    vectorTargets: scene.tokens
      .filter((entry) => entry.id !== tokenId)
      .map((entry) => ({ tokenId: entry.id, label: entry.label || entry.actorId }))
  };
}

/** A vector of `speed` inches from `from` toward `to`; a stop if they coincide. */
export function vectorToward(from, to, speed) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  if (!distance) return { x: 0, y: 0 };
  return { x: (dx / distance) * speed, y: (dy / distance) * speed };
}

/** "SCOUT 3" -> "SCOUT": placeSceneShip numbers repeats itself. */
export function baseShipLabel(label) {
  return String(label ?? '').replace(/\s+\d+$/, '');
}

// ---------------------------------------------------------------------------
// Fight
// ---------------------------------------------------------------------------

function laserTurrets(participant) {
  return participant.ship.specifications.armament.turrets
    .filter((turret) => turretWeapons(participant.ship, turret.id).some((key) => getTurretWeapon(key).fires === 'laser'))
    .map((turret) => turret.id);
}

function reloadingTurret(participant, turretId) {
  const racks = participant.ammunition ? launcherStatus(participant) : null;
  return Boolean(racks?.launchers.some((launcher) => launcher.turretId === turretId && launcher.reloading));
}

/**
 * Why a rack cannot launch this phase, or null. Shared by the rail and the
 * token menu so the two never disagree.
 */
export function launcherBlockedReason(participant, launcher, { enemies = [] } = {}) {
  const raw = participant.ammunition?.launchers.find((entry) => entry.id === launcher.id);
  const turret = participant.ammunition?.turrets.find((entry) => entry.id === launcher.turretId);
  if (turret && !turret.operational) return 'That turret is knocked out (Book 2 p.33).';
  if (launcher.reloading) return 'Loading; it completes at this ship\u2019s next movement phase (Book 2 p.31).';
  if (!launcher.ready) return 'Empty. Reload it in the movement phase (Book 2 p.31).';
  if (raw && raw.lastLaunchTick === participant.ammunition.clock) return 'Already fired this phase (Book 2 p.30: one round per launcher).';
  if (launcher.pool === 'missiles' && !enemies.length) return 'No enemy ship to commit a missile to (Book 2 p.18).';
  return null;
}

/**
 * The fight menu for one token. `own` means the clicked ship is on the side
 * acting in this phase; the actions it offers are for that side's ships.
 */
export function fightTokenMenuModel(encounter, participantId) {
  const clicked = encounter.participants.find((entry) => entry.id === participantId);
  if (!clicked) throw new Error('that ship is not in this fight');
  const phase = currentPhase(encounter);
  const acting = actingSide(encounter);
  const live = encounter.participants.filter((entry) => !entry.escaped && !entry.surrendered);
  const actingShips = live.filter((entry) => entry.side === acting);
  const enemiesOfActing = live.filter((entry) => entry.side !== acting);
  const inProgress = encounter.outcome === 'in-progress';
  const vector = encounter.spatialMode === 'vector';

  // p.30's range DMs, measured, to every other ship still in the fight.
  const ranges = vector
    ? live.filter((entry) => entry.id !== participantId).map((other) => {
      const { distance, dm } = vectorRangeDM(encounter, participantId, other.id);
      return { id: other.id, name: other.name, distance, dm };
    })
    : [];

  const model = {
    participantId, name: clicked.name, side: clicked.side, phase: phase.key,
    own: clicked.side === acting, ranges,
    movement: null, fireAt: [], launchAt: [], castSand: []
  };
  if (!inProgress || clicked.escaped || clicked.surrendered) return model;

  if (phase.key === 'movement' && vector && clicked.side === encounter.phasingSide) {
    const moved = encounter.spatial.ships[participantId]?.movedTurn === encounter.gameTurn;
    let surface = false;
    if (!moved) {
      try {
        const coast = previewShipVector(encounter, participantId, { x: 0, y: 0 });
        surface = Boolean(coast.unresolved || coast.surfaceContact);
      } catch { surface = false; }
    }
    model.movement = { moved, surface };
  }

  const enemyClicked = clicked.side !== acting;

  if ((phase.key === 'laser-fire' || phase.key === 'return-fire') && enemyClicked) {
    for (const ship of actingShips) {
      let eligibility = null;
      if (phase.key === 'return-fire') {
        eligibility = returnFireEligibility(ship);
        if (!ship.wasFiredAtBy.includes(clicked.id)) continue;
      }
      for (const turretId of laserTurrets(ship)) {
        const blocked = !turretOperational(ship.ship, turretId) ? 'Turret knocked out (Book 2 p.33).'
          : reloadingTurret(ship, turretId) ? 'Its gunner is reloading (Book 2 p.31).'
          : eligibility && !eligibility.programsAvailable ? `Needs ${eligibility.missingPrograms.join(' and ')} in the computer (Book 2 p.30).`
          : null;
        model.fireAt.push({ shipId: ship.id, shipName: ship.name, turretId, blocked });
      }
    }
  }

  if (phase.key === 'ordnance-launch') {
    for (const ship of actingShips) {
      if (!ship.ammunition) continue;
      for (const launcher of launcherStatus(ship).launchers) {
        const blocked = launcherBlockedReason(ship, launcher, { enemies: enemiesOfActing });
        const entry = { shipId: ship.id, shipName: ship.name, launcherId: launcher.id, ready: launcher.ready, blocked };
        if (launcher.pool === 'missiles' && enemyClicked) model.launchAt.push(entry);
        if (launcher.pool === 'sandCanisters' && ship.id === participantId) model.castSand.push(entry);
      }
    }
  }
  return model;
}

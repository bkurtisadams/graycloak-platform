// ship-arrival-combat.js — a Book 2 p.36 arrival encounter, made playable.
//
// v0.230.0: play.html's arrival card could only dismiss an encountered ship
// ("Let it pass"); fighting it required the referee client. This is the
// lasers-only, abbreviated-mode (p.37) first cut: no vector plot, no
// movement, no ordnance, no computer-program choice — createShipCombatEncounter
// already starts every fight this way, so this is the engine's own default,
// not a simplification invented for the port. Vector staging, ordnance, and
// manual computer programming are deferred to a later slice.
//
// Pure: no DOM, no ship documents beyond what the caller hands in. Mirrors
// client/app.js's buildEncounteredShip/opposingShipDesignKey/shipCombatLoadout,
// which stay as they are for now — this is a second, shared home for the same
// logic rather than a refactor of the working referee client.

import {
  createShipDocument, armShipTurret, createShipCombatEncounter, COMPUTER_MODELS, COMPUTER_PROGRAMS,
  actingSide, currentPhase, advanceShipCombatPhase, allocateLaserFire, resolveLaserFire,
  turretOperational, turretWeapons, getTurretWeapon, shipCombatIntent, participantStatus,
  declareFlight, creditShotAgainstEscape
} from '../vendor/classic-traveller-rules/index.js';

// Book 2 p.36 names the hull; these are the standard designs it resolves to.
const SHIP_ENCOUNTER_DESIGN_KEYS = Object.freeze({
  'free-trader': 'type-a-free-trader',
  'subsidized-merchant': 'type-r-subsidized-merchant',
  yacht: 'type-y-yacht',
  'type-s-scout-courier': 'type-s-scout-courier',
  'type-c-cruiser': 'type-c-cruiser',
  'type-y-yacht-armed': 'type-y-yacht',
  patrol: 'type-c-cruiser',
  pirate: 'type-s-scout-courier'
});

// Book 3 p.29's own three dispositions (SHIP_DISPOSITIONS_ARE_RAW = false —
// Book 2 supplies no such procedure). Only the pirate is one on the roll
// table; everything else defaults to merchant, which wants to escape rather
// than press an attack, matching the p.36 comment that traders and patrols
// are not inherently hostile.
const SHIP_ENCOUNTER_DISPOSITIONS = Object.freeze({ pirate: 'pirate', patrol: 'patrol' });

export function opposingShipDesignKey(encounter) {
  // `hullKey` is the one design-determining key regardless of which roll it
  // came from: the type itself for a free trader/subsidized merchant/yacht
  // (Book 2 p.36 names one design per type), or the separate p.36 hull throw
  // for a patrol or pirate (Type S, Type C, or an armed Type Y).
  return SHIP_ENCOUNTER_DESIGN_KEYS[encounter?.hullKey] ?? 'type-s-scout-courier';
}

export function opposingShipDisposition(encounter) {
  return SHIP_ENCOUNTER_DISPOSITIONS[encounter?.key] ?? 'merchant';
}

// An NPC ship built from one of Book 2 pp.18-20's standard designs, armed on
// its first two turrets with a beam laser each (p.16: standard designs are
// delivered unarmed, so anything meant to be a threat has to have been armed
// by its owner). Ported from client/app.js's buildEncounteredShip.
export function buildEncounteredShip({ designKey, name, key = null } = {}) {
  const captainId = `npc-captain-${Date.now()}`;
  const captainName = `${name} captain`;
  let ship = createShipDocument({
    designKey,
    id: `npc-${key ?? 'ship'}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    name,
    authority: {
      assignmentType: 'private-owner',
      controllingAuthority: name,
      legalTitleHolder: captainName,
      legalTitleSourceStatus: 'referee-generated-encounter',
      characterOwnsShip: true,
      assignedCharacterId: captainId,
      assignedCharacterName: captainName,
      recallable: false,
      saleAllowed: true,
      useAsDesired: true,
      possessionAtServicePleasure: false,
      servicePrivileges: { freeFuelAtScoutBases: false, freeMaintenanceAtScoutBasesAtClassBStarports: false },
      operatorResponsibilities: { upkeep: true, crewCosts: true }
    },
    crewAssignments: [{ role: 'pilot', characterId: captainId, characterName: captainName }]
  });
  for (const turret of ship.specifications.armament.turrets.slice(0, 2)) {
    ship = armShipTurret(ship, { turretId: turret.id, weapon: 'beam-laser', pricePerWeaponCr: 0 }).ship;
  }
  return { ship, captainId };
}

// A Model/1 holds six points: CPU 2 plus storage 4 (Book 2 p.14), and p.31's
// own worked example fills it with exactly these six. Launch is carried and
// goes in where there is room (p.23 phase E swaps it in otherwise).
//
// v0.246.0: the port from client/app.js dropped Maneuver and Launch. The
// abbreviated fight never noticed, since it never thrusts; a vector fight
// could not thrust at all (p.32: Maneuver is "required to allow the use of
// Maneuver drive"), for either side.
const DEFAULT_COMBAT_LOADOUT = ['target', 'return-fire', 'predict-1', 'gunner-interact', 'auto-evade', 'maneuver'];
const DEFAULT_COMBAT_STORAGE = ['launch'];
export function shipCombatLoadout(ship) {
  const model = COMPUTER_MODELS?.[ship.specifications.computer.model];
  const room = (model?.cpu ?? 2) + (model?.storage ?? 0);
  const loaded = [];
  let used = 0;
  for (const key of [...DEFAULT_COMBAT_LOADOUT, ...DEFAULT_COMBAT_STORAGE]) {
    const space = COMPUTER_PROGRAMS[key].space;
    if (used + space > room) continue;
    loaded.push(key);
    used += space;
  }
  return { carried: [...DEFAULT_COMBAT_LOADOUT, ...DEFAULT_COMBAT_STORAGE], loaded };
}

// Every operational turret carrying a laser fires at the one foe. A 1-v-1
// abbreviated fight has no real targeting choice yet — multi-ship, multi-
// target fire waits for a later slice.
//
// In the return-fire phase, Book 2 p.30 restricts a shooter to a ship that
// fired at it in the immediately preceding phase (allocateLaserFire enforces
// this too and throws if it is violated — checking here first means a caller
// gets an empty, harmless allocation instead of an exception).
export function laserAllocationAgainstSingleFoe(encounter, shipId, foeId) {
  const shooter = encounter.participants.find((entry) => entry.id === shipId);
  if (!shooter) return [];
  if (currentPhase(encounter).key === 'return-fire' && !shooter.wasFiredAtBy.includes(foeId)) return [];
  const allocations = [];
  for (const turret of shooter.ship.specifications.armament.turrets) {
    if (!turretOperational(shooter.ship, turret.id)) continue;
    if (!turretWeapons(shooter.ship, turret.id).some((key) => getTurretWeapon(key).fires === 'laser')) continue;
    allocations.push({ shipId, turretId: turret.id, targetId: foeId });
  }
  return allocations;
}

// Whether the named side actually has a choice to make in the current
// phase — an operational laser turret, and (in return-fire) a foe that shot
// at it last phase. If not, there is nothing to declare and the phase should
// advance on its own rather than stop and ask.
function playerHasFireChoice(encounter, playerSide) {
  const foe = encounter.participants.find((entry) => entry.side !== playerSide && !entry.escaped);
  if (!foe) return false;
  return encounter.participants
    .filter((entry) => entry.side === playerSide && !entry.escaped && !entry.surrendered)
    .some((entry) => laserAllocationAgainstSingleFoe(encounter, entry.id, foe.id).length > 0);
}

// Drives the encounter forward from wherever it stands until either it ends,
// or it is the named side's own laser-fire or return-fire phase AND it has an
// actual choice to make (an operational laser turret, and in return-fire a
// foe that fired at it last phase) — the only point this slice asks the
// referee anything. Everything else (the opposing side's fire, movement,
// ordnance launch, reprogramming — none of which this slice offers a choice
// in) is resolved automatically: the opposing side's fire uses
// shipCombatIntent, the Book 3 p.29-shaped AI your own driver script already
// exercises; the other phases have nothing to declare in abbreviated,
// lasers-only play, so advancing through them is not a simplification of
// anything the engine currently asks for.
// A shot log entry per resolved exchange comes back too, so a caller can
// narrate what just happened. newLogEntries carries anything else the engine
// logged during this call that a shot list doesn't cover — currently just a
// declared repair resolving at the game-turn interphase (advanceShipCombatPhase
// calls resolveDamageControl there internally); the caller narrates those too.
export function autoAdvanceShipFight(encounter, dice, { playerSide }) {
  let fight = encounter;
  const shots = [];
  const startingLogLength = encounter.log.length;
  let guard = 0;
  while (fight.outcome === 'in-progress' && guard < 200) {
    guard += 1;
    const phase = currentPhase(fight).key;
    const acting = actingSide(fight);
    if (phase === 'laser-fire' || phase === 'return-fire') {
      if (acting === playerSide) {
        if (playerHasFireChoice(fight, playerSide)) {
          return { encounter: fight, shots, awaitingPlayer: true, newLogEntries: fight.log.slice(startingLogLength) };
        }
      } else {
        const allocations = [];
        for (const shooter of fight.participants.filter((entry) => entry.side === acting && !entry.escaped && !entry.surrendered)) {
          const intent = shipCombatIntent(fight, shooter.id, dice);
          if (!['press-attack', 'disable-drives'].includes(intent.intent)) continue;
          const foe = fight.participants.find((entry) => entry.side !== shooter.side && !entry.escaped);
          if (!foe) continue;
          allocations.push(...laserAllocationAgainstSingleFoe(fight, shooter.id, foe.id));
        }
        if (allocations.length) {
          fight = allocateLaserFire(fight, allocations);
          const resolved = resolveLaserFire(fight, dice);
          fight = resolved.encounter;
          fight = creditEscapeShots(fight, resolved.shots);
          shots.push(...resolved.shots);
        }
      }
    }
    if (fight.outcome !== 'in-progress') break;
    fight = advanceShipCombatPhase(fight, { dice });
  }
  return { encounter: fight, shots, awaitingPlayer: false, newLogEntries: fight.log.slice(startingLogLength) };
}

// The roster line a referee actually needs: name, side, whether it can still
// fight, and its guns/hull state — the same status the driver script prints.
export function shipFightRoster(encounter) {
  return encounter.participants.map((participant) => {
    const status = participantStatus(participant);
    return {
      shipId: participant.id,
      name: participant.name,
      side: participant.side,
      disposition: participant.disposition,
      armedTurrets: status.armedTurrets.length,
      toothless: status.toothless,
      adrift: status.adrift,
      disabled: status.disabled,
      decompressed: status.decompressed,
      escaped: Boolean(participant.escaped),
      surrendered: Boolean(participant.surrendered),
      fled: Boolean(participant.fled),
      shotsRemainingBeforeEscape: participant.fled && !participant.escaped ? participant.shotsRemainingBeforeEscape : null,
      damage: shipStateDamageSummary(participant.ship),
      repairing: participant.damageControl ? damageLocationLabel(participant.damageControl) : null
    };
  });
}

// 'power-plant' -> 'Power Plant'; a turret carries its id ('turret', 'T-1' ->
// 'Turret T-1'). Shared between the roster's "Repairing: …" line and the
// repair-action button labels, so both always agree — and title-cased word
// by word (not just the first letter) so it also reads identically to
// shipStateDamageSummary's "Damage: …" line, whose labels come from
// state.damage's camelCase keys (space-inserted, so each word already
// carries its own capital) rather than this function's kebab-case input.
export function damageLocationLabel({ location, turretId }) {
  if (location === 'turret') return `Turret ${turretId}`;
  return String(location).split('-').filter(Boolean).map((word) => word[0].toUpperCase() + word.slice(1)).join(' ');
}

// resolveLaserFire already writes every hit onto the ship document's own
// state.damage (starships/damage.js) — the same field client/play-views.js's
// shipDrawer and the Vehicles directory already read. Reusing it here (with
// the same key-to-label logic play-session.js's shipView applies) means the
// roster's damage line and this ship's own info panel never disagree.
export function shipStateDamageSummary(ship) {
  const damage = ship?.state?.damage ?? {};
  return Object.entries(damage)
    .filter(([, value]) => (Array.isArray(value) ? value.length : Number(value) > 0))
    .map(([key]) => {
      const spaced = String(key).replace(/([A-Z])/g, ' $1').replace(/[-_]/g, ' ').trim();
      return spaced ? spaced[0].toUpperCase() + spaced.slice(1) : '';
    })
    .filter(Boolean);
}

// Book 2 p.37: shots fired at a ship that has broken off count against the
// number of shots the referee allowed it before it is out of range — nothing
// else reduces that count, so every resolved volley has to apply this or a
// fled ship would sit at "fleeing" forever. Ported from client/app.js's own
// loop after resolveShipCombatFire, run here for both the player's own fire
// and the auto-resolved side's.
export function creditEscapeShots(encounter, shots) {
  let next = encounter;
  for (const shot of shots) {
    if (!shot.fired) continue;
    const target = next.participants.find((entry) => entry.id === shot.targetId);
    if (!target?.fled || target.escaped) continue;
    next = creditShotAgainstEscape(next, shot.targetId);
  }
  return next;
}

// Book 2 p.37 supplies no formula for how many shots a referee should allow
// before a fleeing ship is out of range — client/app.js's referee client
// asks with a prompt each time. This client has no referee-input widget, so
// it fixes the number instead of asking; 2 is the standard ruling until a
// case turns up that wants otherwise.
export const STANDARD_SHOTS_BEFORE_ESCAPE = 2;

// Whether any foe still has a working weapon that could hit shipId. Book 2
// p.37's shot count is for a foe that can still take a parting shot; a
// toothless foe (no operational turret at all) cannot, so there is nothing
// to count down.
function anyOperationalThreatTo(encounter, shipId) {
  return encounter.participants.some((entry) =>
    entry.id !== shipId && !entry.escaped && !entry.surrendered && !participantStatus(entry).toothless);
}

export function fleeShipFight(encounter, shipId) {
  const threatened = anyOperationalThreatTo(encounter, shipId);
  let next = declareFlight(encounter, {
    shipId, shotsBeforeEscape: threatened ? STANDARD_SHOTS_BEFORE_ESCAPE : 0,
    note: threatened
      ? `Standard ruling: ${STANDARD_SHOTS_BEFORE_ESCAPE} shots before out of range (Book 2 p.37 sets no formula)`
      : 'No foe left with an operational weapon \u2014 nothing left to take a parting shot'
  });
  // Whatever a shotsBeforeEscape of 0 does on its own, this should never
  // depend on a shot being fired to notice that nothing CAN be fired — with
  // no threat left, the ship is simply gone.
  if (!threatened && next.outcome === 'in-progress') next = { ...next, outcome: 'disengaged' };
  return next;
}

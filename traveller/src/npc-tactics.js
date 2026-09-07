// npc-tactics.js — how an unattended combatant decides what to do.
//
// GRAYCLOAK POLICY, NOT RAW. Book 1 and Book 3 give the referee no NPC tactical
// procedure: Book 1 p.32 says only that "a non-player character will attempt to
// escape at the option of the referee", and Book 3 p.24 leaves an encountered
// group's behaviour to the referee entirely. Everything below is therefore a
// house routine, kept in the client rather than in classic-traveller-rules so
// that the rules package stays a facsimile of the books.
//
// The shape follows the AD&D sim's aiDeclare(): a pure function returning a
// declaration, so an automatic combatant feeds the same
// declareEncounterAction() that a player's click does, and no special path
// runs through the resolver.

import {
  getPersonalWeapon,
  weaponTargetNumber,
  previewPersonalAttack,
  blowsRemaining
} from '../../packages/classic-traveller-rules/index.js';

import { encounterPairRange, encounterMapDistance, encounterSituationDMs } from './encounter-document.js';

export const NPC_TACTICS = Object.freeze(['manual', 'auto']);

// A weakened blow is worth taking rather than standing idle, but a combatant
// with blows in hand should prefer to spend them.
function meleeReadiness(combatant) {
  const weapon = getPersonalWeapon(combatant.weaponKey);
  if (!weapon.melee) return 'ranged';
  return blowsRemaining(combatant) > 0 ? 'fresh' : 'weakened';
}

// Rank the enemies this combatant could engage: reachable first, then by the
// throw needed, then by proximity. A target already down is not a target.
export function rankNpcTargets(encounter, combatant) {
  const enemies = encounter.combatants.filter((entry) => entry.side !== combatant.side && entry.status === 'active');
  return enemies
    .map((enemy) => {
      const band = encounterPairRange(combatant, enemy);
      const reachable = weaponTargetNumber(combatant.weaponKey, enemy.armor, band) !== null;
      const preview = reachable
        ? previewPersonalAttack({
          attacker: combatant, defender: enemy, range: band,
          situationalDM: encounterSituationDMs(encounter, combatant, enemy).total
        })
        : null;
      return {
        enemy,
        band,
        reachable,
        distance: encounterMapDistance(combatant, enemy),
        requiredRoll: preview ? Math.max(2, preview.requiredRoll) : null,
        hopeless: preview ? preview.requiredRoll > 12 : true
      };
    })
    .sort((left, right) => {
      if (left.hopeless !== right.hopeless) return left.hopeless ? 1 : -1;
      if (left.reachable !== right.reachable) return left.reachable ? -1 : 1;
      if (left.requiredRoll !== right.requiredRoll) return (left.requiredRoll ?? 99) - (right.requiredRoll ?? 99);
      return left.distance - right.distance;
    });
}

// The routine, in one place so the reasoning is auditable:
//   1. No enemy left -> stand.
//   2. A reachable target this weapon can actually hit -> attack it.
//   3. Reachable but no 2D throw can make it (cover in darkness, say) -> close,
//      since closing improves most bands and nothing is lost by waiting.
//   4. Nothing reachable -> close on the nearest enemy.
//   5. Nothing at all to close on -> stand.
export function chooseNpcDeclaration(encounter, combatant) {
  if (!combatant || combatant.status !== 'active') return null;
  const ranked = rankNpcTargets(encounter, combatant);
  if (!ranked.length) return { actorId: combatant.id, action: 'wait', targetId: null, modifier: 0, reason: 'no active enemy' };

  const best = ranked[0];
  if (best.reachable && !best.hopeless) {
    const readiness = meleeReadiness(combatant);
    return {
      actorId: combatant.id,
      action: 'attack',
      targetId: best.enemy.id,
      modifier: 0,
      reason: `${best.band} range, needs ${best.requiredRoll}+${readiness === 'weakened' ? ', weakened blow' : ''}`
    };
  }

  const closest = [...ranked].sort((left, right) => left.distance - right.distance)[0];
  if (closest) {
    return {
      actorId: combatant.id,
      action: 'close',
      targetId: closest.enemy.id,
      modifier: 0,
      reason: best.reachable
        ? `no throw can hit at ${best.band} range; closing`
        : `${getPersonalWeapon(combatant.weaponKey).name} cannot reach at ${closest.band} range`
    };
  }
  return { actorId: combatant.id, action: 'wait', targetId: null, modifier: 0, reason: 'nothing to engage' };
}

// Every combatant that is on auto and still without orders this round.
export function pendingNpcDeclarations(encounter) {
  const declared = new Set((encounter.roundState?.declaredActions ?? []).map((entry) => entry.actorId));
  return encounter.combatants
    .filter((entry) => entry.status === 'active' && entry.tactics === 'auto' && !declared.has(entry.id))
    .map((entry) => chooseNpcDeclaration(encounter, entry))
    .filter(Boolean);
}

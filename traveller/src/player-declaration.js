// Player declarations cross the multiplayer trust boundary. Firestore rules
// remain the security boundary, but the referee also verifies every intent
// against the campaign state it is about to mutate.

export const PLAYER_DECLARATION_ACTIONS = Object.freeze(['attack', 'close', 'open', 'close-run', 'open-run', 'evade', 'escape', 'wait']);

function nonblank(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function createPlayerDeclaration({ uid, actorId, action, targetId = null, round, declaredAt = Date.now() } = {}) {
  if (!nonblank(uid)) throw new TypeError('a signed-in player is required');
  if (!nonblank(actorId)) throw new TypeError('actorId is required');
  if (!PLAYER_DECLARATION_ACTIONS.includes(action)) throw new RangeError(`unknown player action: ${action}`);
  if (!Number.isInteger(round) || round < 1) throw new RangeError('round must be a positive integer');
  if (!Number.isSafeInteger(declaredAt) || declaredAt < 0) throw new RangeError('declaredAt must be a non-negative integer');
  const needsTarget = ['attack', 'close', 'open', 'close-run', 'open-run'].includes(action);
  if (needsTarget && !nonblank(targetId)) throw new TypeError(`${action} requires a target`);
  if (!needsTarget && targetId !== null) throw new TypeError(`${action} does not take a target`);
  return Object.freeze({ uid: uid.trim(), actorId: actorId.trim(), action, targetId: targetId === null ? null : targetId.trim(), round, declaredAt });
}

export function authorizePlayerDeclaration(raw, { campaign, encounter } = {}) {
  const declaration = createPlayerDeclaration(raw);
  if (!campaign?.identity?.id || !encounter?.identity?.id) throw new TypeError('campaign and encounter are required');
  if (encounter.campaignId !== campaign.identity.id) throw new Error('encounter does not belong to this campaign');
  if (declaration.round !== encounter.round) throw new Error(`declaration is for round ${declaration.round}; current round is ${encounter.round}`);
  const actor = encounter.combatants?.find((entry) => entry.id === declaration.actorId);
  if (!actor || !actor.playerCharacter) throw new Error('declaration actor is not a player character in this encounter');
  const ownerUid = campaign.ownership?.actors?.[declaration.actorId] ?? null;
  if (!ownerUid || ownerUid !== declaration.uid) throw new Error('player does not own this combatant');
  if (declaration.targetId !== null) {
    const target = encounter.combatants.find((entry) => entry.id === declaration.targetId);
    if (!target) throw new Error('declaration target is not in this encounter');
    if (target.side === actor.side) throw new Error('a combatant cannot target its own side');
  }
  return declaration;
}

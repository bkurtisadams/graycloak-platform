// Player token moves cross the same multiplayer trust boundary as declarations.
// Firestore rejects writes for unowned combatants; the referee repeats the
// authorization against its private encounter before changing authoritative state.

function nonblank(value) { return typeof value === 'string' && value.trim().length > 0; }

export function createPlayerTokenMove({ uid, encounterId, actorId, column, row, movedAt = Date.now() } = {}) {
  if (!nonblank(uid) || !nonblank(encounterId) || !nonblank(actorId)) throw new TypeError('uid, encounterId, and actorId are required');
  if (!Number.isInteger(column) || column < 0 || column > 200 || !Number.isInteger(row) || row < 0 || row > 200) throw new RangeError('token position must be within the 201 by 201 map');
  if (!Number.isSafeInteger(movedAt) || movedAt < 0) throw new RangeError('movedAt must be a non-negative integer');
  return Object.freeze({ uid: uid.trim(), encounterId: encounterId.trim(), actorId: actorId.trim(), column, row, movedAt });
}

export function authorizePlayerTokenMove(raw, { campaign, encounter } = {}) {
  const move = createPlayerTokenMove(raw);
  if (!campaign?.identity?.id || !encounter?.identity?.id) throw new TypeError('campaign and encounter are required');
  if (encounter.campaignId !== campaign.identity.id || move.encounterId !== encounter.identity.id) throw new Error('move does not belong to this encounter');
  const actor = encounter.combatants?.find((entry) => entry.id === move.actorId);
  if (!actor || !actor.playerCharacter) throw new Error('move actor is not a player character in this encounter');
  if (campaign.ownership?.actors?.[move.actorId] !== move.uid) throw new Error('player does not own this combatant');
  return move;
}

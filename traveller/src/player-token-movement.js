// Player token moves cross the same multiplayer trust boundary as declarations.
// Firestore rejects writes for unowned combatants; the referee repeats the
// authorization against its private encounter before changing authoritative state.

function nonblank(value) { return typeof value === 'string' && value.trim().length > 0; }

export function createPlayerTokenMove({ uid, encounterId, actorId, column, row, pace = 'walk', round, movedAt = Date.now() } = {}) {
  if (!nonblank(uid) || !nonblank(encounterId) || !nonblank(actorId)) throw new TypeError('uid, encounterId, and actorId are required');
  if (!Number.isInteger(column) || column < 0 || column > 1000 || !Number.isInteger(row) || row < 0 || row > 1000) throw new RangeError('token position must be within the 1000-meter map');
  if (!['walk', 'run'].includes(pace)) throw new RangeError('pace must be walk or run');
  if (!Number.isInteger(round) || round < 1) throw new RangeError('round must be a positive integer');
  if (!Number.isSafeInteger(movedAt) || movedAt < 0) throw new RangeError('movedAt must be a non-negative integer');
  return Object.freeze({ uid: uid.trim(), encounterId: encounterId.trim(), actorId: actorId.trim(), column, row, pace, round, movedAt });
}

export function authorizePlayerTokenMove(raw, { campaign, encounter } = {}) {
  const move = createPlayerTokenMove(raw);
  if (!campaign?.identity?.id || !encounter?.identity?.id) throw new TypeError('campaign and encounter are required');
  if (encounter.campaignId !== campaign.identity.id || move.encounterId !== encounter.identity.id) throw new Error('move does not belong to this encounter');
  if (encounter.status !== 'active' || move.round !== encounter.round) throw new Error('move is not for the active encounter round');
  const actor = encounter.combatants?.find((entry) => entry.id === move.actorId);
  if (!actor || !actor.playerCharacter) throw new Error('move actor is not a player character in this encounter');
  if (campaign.ownership?.actors?.[move.actorId] !== move.uid) throw new Error('player does not own this combatant');
  const distance = Math.max(Math.abs(actor.position.column - move.column), Math.abs(actor.position.row - move.row));
  const allowance = move.pace === 'run' ? 50 : 25;
  if (distance > allowance) throw new Error(`${move.pace} movement exceeds ${allowance} meters`);
  return move;
}

// v0.73.1: the shape moveEncounterCombatantByPlayer takes. A move intent
// speaks of an actorId; the encounter speaks of a combatantId. They are the
// same id, and the referee's client passed one where the other was expected
// for twelve versions — every player drag was refused as "combatant is
// unavailable" the first time a rule let the write through.
export function playerMoveToCombatantMove(move) {
  return { combatantId: move.actorId, column: move.column, row: move.row, pace: move.pace, round: move.round, replaceExisting: true };
}

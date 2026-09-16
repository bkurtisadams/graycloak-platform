// player-wound-allocation.js — the wounded player's own distribution of a
// wound, crossing the multiplayer trust boundary.
//
// Book 1 p.30: "further modifications may be distributed against, or added to,
// such wound groups as desired (players do this themselves; the referee does
// it for non-player characters)." v0.178.0 made the round pause for that
// choice; this carries the choice from the player's browser to the referee's.
//
// Like a declaration, it is an intent and not a result: the player says where
// the dice fall, and the referee's own copy of the encounter applies it. A
// player who sends a distribution for somebody else's character, for a wound
// that is not the one waiting, or for dice that are not the dice thrown, is
// refused here as well as by the Firestore rules.

function nonblank(value) { return typeof value === 'string' && value.trim().length > 0; }

export const WOUND_CHARACTERISTICS = Object.freeze(['STR', 'DEX', 'END']);

export function createPlayerWoundAllocation({ uid, encounterId, actorId, key, targets, allocation = null, round, sentAt = Date.now() } = {}) {
  if (!nonblank(uid) || !nonblank(encounterId) || !nonblank(actorId)) throw new TypeError('uid, encounterId, and actorId are required');
  if (!nonblank(key)) throw new TypeError('the wound key is required');
  if (!Array.isArray(targets) || !targets.length || targets.length > 12
    || targets.some((entry) => !WOUND_CHARACTERISTICS.includes(entry))) {
    throw new TypeError('targets must name STR, DEX or END for each wound group');
  }
  if (allocation !== null) {
    if (!Array.isArray(allocation) || allocation.length !== targets.length
      || allocation.some((share) => !Number.isInteger(share) || share < -30 || share > 30)) {
      throw new TypeError('allocation must be one integer share per wound group');
    }
  }
  if (!Number.isInteger(round) || round < 1) throw new RangeError('round must be a positive integer');
  if (!Number.isSafeInteger(sentAt) || sentAt < 0) throw new RangeError('sentAt must be a non-negative integer');
  return Object.freeze({
    uid: uid.trim(), encounterId: encounterId.trim(), actorId: actorId.trim(), key: key.trim(),
    targets: Object.freeze([...targets]),
    allocation: allocation === null ? null : Object.freeze([...allocation]),
    round, sentAt
  });
}

// The referee's check, made against its own encounter rather than against
// anything the player sent. `pending` is pendingWoundAllocation(encounter).
export function authorizePlayerWoundAllocation(raw, { campaign, encounter, pending } = {}) {
  const intent = createPlayerWoundAllocation(raw);
  if (!campaign?.identity?.id || !encounter?.identity?.id) throw new TypeError('campaign and encounter are required');
  if (encounter.campaignId !== campaign.identity.id || intent.encounterId !== encounter.identity.id) throw new Error('allocation does not belong to this encounter');
  if (!pending) throw new Error('no wound is waiting to be allocated');
  if (intent.key !== pending.key) throw new Error('that wound is no longer waiting');
  if (intent.round !== encounter.round) throw new Error(`allocation is for round ${intent.round}; the paused round is ${encounter.round}`);
  if (intent.actorId !== pending.defender?.id) throw new Error('that wound is not on this character');
  const actor = encounter.combatants?.find((entry) => entry.id === intent.actorId);
  if (!actor || !actor.playerCharacter) throw new Error('allocation actor is not a player character in this encounter');
  if (campaign.ownership?.actors?.[intent.actorId] !== intent.uid) throw new Error('player does not own this combatant');
  // The groups are the dice the referee threw, not a count the player chose.
  if (intent.targets.length !== pending.damageDice.length) throw new Error('allocation must name one characteristic per wound die');
  if (intent.allocation) {
    const total = intent.allocation.reduce((sum, share) => sum + share, 0);
    if (total !== pending.modifier) throw new Error(`allocation must distribute the whole modifier (${pending.modifier}), not ${total}`);
  }
  return intent;
}

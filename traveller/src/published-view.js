// published-view.js — what players are allowed to see of an encounter.
//
// The encounter document carries enemy characteristics, wounds, cover and blow
// allowances. Firestore rules grant access per document and cannot filter
// fields, so players never read it: the referee publishes this projection and
// they read that instead.
//
// The rule for what belongs here is Kurt's: a player sees their own token and
// name, everyone's names and positions, and the narration of what happened —
// "so-and-so shoots Hawkeye with an SMG", "so-and-so is evading". No numbers.

// Book 1 wound status is public in the fiction — you can see a man go down —
// but the characteristic totals behind it are not.
const VISIBLE_STATUSES = Object.freeze(['active', 'unconscious', 'dead', 'escaped', 'withdrawn']);

function visibleCondition(combatant) {
  if (!VISIBLE_STATUSES.includes(combatant.status)) return 'active';
  return combatant.status;
}

// The referee's log line is an audit trail: it carries the dice, every DM and
// the target number, and the target number is the defender's armour. A player
// watching three rounds could reconstruct an enemy's armour and skill exactly.
// So the player's narration is generated from the structured result instead —
// who acted, on whom, with what, and what happened.
//
// Unrecognised entry kinds are dropped rather than passed through. Failing
// closed matters here: a new entry kind added later would otherwise publish
// whatever prose the referee's side happens to write.
const OUTCOME_TEXT = Object.freeze({
  active: 'and it tells',
  unconscious: 'and drops them',
  dead: 'and kills them',
  escaped: 'as they break away',
  withdrawn: 'as they fall back'
});

function combatantName(encounter, id) {
  return encounter.combatants.find((entry) => entry.id === id)?.name ?? 'someone';
}

function playerNarrationFor(encounter, entry) {
  if (entry.kind === 'attack') {
    const detail = entry.detail;
    if (!detail) return null;
    const attacker = combatantName(encounter, entry.actorId);
    const defender = combatantName(encounter, entry.targetId);
    const weapon = detail.weaponName ?? 'a weapon';
    if (!detail.success) return `${attacker} attacks ${defender} with ${weapon} and misses.`;
    const outcome = OUTCOME_TEXT[detail.defenderStatus] ?? 'and connects';
    return `${attacker} hits ${defender} with ${weapon} ${outcome}.`;
  }
  if (entry.kind === 'movement') {
    // The referee's movement line already names only the band, which players
    // can see on the map anyway.
    return entry.text;
  }
  if (entry.kind === 'escape') {
    const actor = combatantName(encounter, entry.actorId);
    const escaped = encounter.combatants.find((combatant) => combatant.id === entry.actorId)?.status === 'escaped';
    return escaped ? `${actor} breaks off and gets clear.` : `${actor} tries to break off and cannot.`;
  }
  if (entry.kind === 'morale') {
    return entry.detail?.stands === false
      ? 'The opposition breaks and withdraws.'
      : 'The opposition holds.';
  }
  if (entry.kind === 'surprise') return entry.text;
  if (entry.kind === 'status' || entry.kind === 'outcome' || entry.kind === 'placement') return entry.text;
  return null;
}

export function buildPublishedView(encounter, { campaignId, publishedAt, rounds = 4 } = {}) {
  if (!encounter) throw new TypeError('an encounter is required');
  // The round in progress is `round` while the fight runs; once it resolves,
  // `round` is the last one played rather than the next one.
  const currentRound = encounter.status === 'active' ? encounter.round - 1 : encounter.round;
  const earliest = Math.max(0, currentRound - (rounds - 1));
  const movementRound = Math.max(-1, ...(encounter.history ?? []).filter((entry) => entry.kind === 'movement' && entry.detail?.from && entry.detail?.to).map((entry) => entry.round));
  return {
    campaignId: campaignId ?? null,
    encounterId: encounter.identity.id,
    title: encounter.identity.title,
    round: currentRound,
    // The round a player would be declaring for: the one in progress while the
    // fight runs, and nothing once it is over. `round` is what has been played,
    // which is a different number and was confusing to reconcile.
    declaringRound: encounter.status === 'active' ? encounter.round : null,
    status: encounter.status,
    range: encounter.range,
    lighting: encounter.conditions?.lighting ?? 'normal',
    publishedAt: publishedAt ?? null,
    map: {
      columns: encounter.map.columns,
      rows: encounter.map.rows,
      metersPerSquare: encounter.map.metersPerSquare ?? null
    },
    movementPaths: (encounter.history ?? [])
      .filter((entry) => entry.kind === 'movement' && entry.round === movementRound && entry.detail?.from && entry.detail?.to)
      .map((entry) => ({ actorId: entry.actorId, pace: entry.detail.pace, meters: entry.detail.meters, squares: entry.detail.squares, from: { ...entry.detail.from }, to: { ...entry.detail.to } })),
    // Names, sides, positions and visible condition. Deliberately no
    // characteristics, no current/maximum values, no armour, no cover, no blow
    // allowance, and no weapon: which gun a foe is holding is something the
    // narration reveals when it is fired, not something the roster announces.
    combatants: encounter.combatants.map((combatant) => ({
      id: combatant.id,
      name: combatant.name,
      side: combatant.side,
      playerCharacter: Boolean(combatant.playerCharacter),
      condition: visibleCondition(combatant),
      position: { column: combatant.position.column, row: combatant.position.row },
      tokenLabel: combatant.tokenLabel ?? null
    })),
    // The last few rounds, so a player who looks away does not lose them.
    narration: (encounter.history ?? [])
      .filter((entry) => entry.round >= earliest && entry.round <= currentRound)
      .map((entry) => {
        const text = playerNarrationFor(encounter, entry);
        return text ? { round: entry.round, kind: entry.kind, text } : null;
      })
      .filter(Boolean)
  };
}

// A campaign document trimmed to what a player may see of the shared state.
export function buildPublishedCampaign(campaign, { publishedAt, currentEncounterId = null } = {}) {
  if (!campaign) throw new TypeError('a campaign is required');
  return {
    campaignId: campaign.identity.id,
    name: campaign.identity.name,
    schemaVersion: campaign.schemaVersion,
    time: { ...campaign.time },
    location: { ...campaign.location },
    ownership: {
      ownerUid: campaign.ownership?.ownerUid ?? null,
      actors: { ...(campaign.ownership?.actors ?? {}) }
    },
    // A player cannot list encounters — the encounter documents are
    // referee-only and Firestore does not return missing parents — so the
    // campaign has to say which scene is current.
    currentEncounterId: currentEncounterId ?? null,
    publishedAt: publishedAt ?? null
  };
}

// --- v0.65.0: what a player may see of the rest of the campaign ---------
//
// Two more projections, published per player under
// travellerCampaigns/{id}/players/{uid}/…, where the rules let only that
// account (and the referee) read. Firestore grants access per document, so the
// split is by reader: a player's own character is theirs in full, and the log
// they get is filtered to what the table would know.

function cloneJson(value) { return JSON.parse(JSON.stringify(value)); }

// A character document is the player's own record — Book 1 puts the whole
// personnel file in the player's hands — so this is the sheet in full, not a
// projection. Only the campaign's envelope is added. Anything a future schema
// adds under a referee-only key would have to be stripped here, which is why
// the fields are listed rather than spread.
export function buildPublishedCharacter(character, { campaignId, ownerUid, publishedAt } = {}) {
  if (!character?.identity?.id) throw new TypeError('a character document is required');
  return {
    campaignId: campaignId ?? null,
    characterId: character.identity.id,
    ownerUid: ownerUid ?? null,
    publishedAt: publishedAt ?? null,
    documentType: character.documentType,
    schemaVersion: character.schemaVersion,
    identity: cloneJson(character.identity),
    age: character.age,
    chronology: cloneJson(character.chronology ?? {}),
    characteristics: cloneJson(character.characteristics),
    current: cloneJson(character.current ?? {}),
    upp: character.upp,
    status: cloneJson(character.status ?? {}),
    career: cloneJson(character.career ?? {}),
    skills: cloneJson(character.skills ?? {}),
    loadout: cloneJson(character.loadout ?? {}),
    finances: cloneJson(character.finances ?? {}),
    benefits: cloneJson(character.benefits ?? {}),
    shipRefs: cloneJson(character.shipRefs ?? []),
    history: cloneJson(character.history ?? []),
    notes: character.notes ?? ''
  };
}

// The activity log is the referee's audit trail. Its COMBAT lines carry the
// dice, every DM and the target number — the same arithmetic the scene
// narration exists to hide — and the ROSTER, SITUATION and THREAD lines are
// the referee's bookkeeping of what the party has not yet found out. So the
// published log is an allowlist, not a filter: a category reaches a player
// only because it is named here as table knowledge. Failing closed means a
// category added later cannot leak by default.
export const PLAYER_LOG_CATEGORIES = Object.freeze([
  'ARRIVAL', 'JUMP', 'NAV', 'PORT', 'SHIP', 'TRADE', 'JOB', 'CONTRACT', 'CHAR', 'CHECK', 'NOTE', 'SYSTEM'
]);
const PLAYER_LOG_CATEGORY_SET = new Set(PLAYER_LOG_CATEGORIES);

// An entry addressed to players passes regardless of category — the referee
// chose its audience — and the audience may be named either by account or by
// the character that account plays.
function addressedTo(entry, uid, ownedCharacterIds) {
  if (entry.visibility !== 'players') return false;
  const audience = entry.audiencePlayerIds ?? [];
  return audience.includes(uid) || ownedCharacterIds.some((id) => audience.includes(id));
}

export function buildPublishedLog(log, { campaignId, uid, ownedCharacterIds = [], publishedAt, limit = 300 } = {}) {
  if (!log?.entries) throw new TypeError('an activity log document is required');
  if (!uid) throw new TypeError('the player uid is required');
  const entries = log.entries
    .filter((entry) => (entry.visibility === 'public' && PLAYER_LOG_CATEGORY_SET.has(entry.category))
      || addressedTo(entry, uid, ownedCharacterIds))
    .slice(-limit)
    // Source ids are dropped: an NPC actor id in the audit trail is not the
    // party's to read, and a player never needs them.
    .map((entry) => ({
      id: entry.id,
      sequence: entry.sequence,
      category: entry.category,
      message: entry.message,
      dateLabel: entry.dateLabel,
      createdAt: entry.createdAt,
      addressed: entry.visibility === 'players'
    }));
  return { campaignId: campaignId ?? null, uid, publishedAt: publishedAt ?? null, entries };
}

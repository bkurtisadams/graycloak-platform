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
  return {
    campaignId: campaignId ?? null,
    encounterId: encounter.identity.id,
    title: encounter.identity.title,
    round: currentRound,
    status: encounter.status,
    range: encounter.range,
    lighting: encounter.conditions?.lighting ?? 'normal',
    publishedAt: publishedAt ?? null,
    map: {
      columns: encounter.map.columns,
      rows: encounter.map.rows,
      metersPerSquare: encounter.map.metersPerSquare ?? null
    },
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

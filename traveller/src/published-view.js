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

export function buildPublishedView(encounter, { campaignId, publishedAt } = {}) {
  if (!encounter) throw new TypeError('an encounter is required');
  return {
    campaignId: campaignId ?? null,
    encounterId: encounter.identity.id,
    title: encounter.identity.title,
    round: encounter.round,
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
    // The round's history as prose. These are the same entries the referee's
    // activity log shows, which are already written as narration.
    narration: (encounter.history ?? [])
      .filter((entry) => entry.round === encounter.round - (encounter.status === 'active' ? 1 : 0))
      .map((entry) => ({ round: entry.round, kind: entry.kind, text: entry.text }))
  };
}

// A campaign document trimmed to what a player may see of the shared state.
export function buildPublishedCampaign(campaign, { publishedAt } = {}) {
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
    publishedAt: publishedAt ?? null
  };
}

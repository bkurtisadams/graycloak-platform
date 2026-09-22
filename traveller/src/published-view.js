import { throwCardModel } from '../client/combat-view.js';
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

// v0.179.0: the wound a paused round is waiting on (Book 1 p.30 step 2C).
// Only ever a player character's own wound — the engine never pauses for an
// NPC — so the numbers here are the player's own, and the weapon and attacker
// are already named by the narration line for the same blow. What is NOT
// published is any figure belonging to the attacker: no throw, no DM, no
// armour, no target number.
function publishedPendingWound(encounter) {
  const resolution = encounter.roundState?.resolution;
  if (!resolution) return null;
  const wound = resolution.wounds?.[resolution.nextIndex];
  if (!wound) return null;
  const defender = encounter.combatants.find((entry) => entry.id === wound.defenderId) ?? null;
  if (!defender) return null;
  return {
    key: wound.key,
    round: encounter.round,
    defenderId: wound.defenderId,
    defenderName: defender.name,
    attackerName: combatantName(encounter, wound.attackerId),
    weaponName: wound.weaponName ?? null,
    damageDice: [...wound.damageDice],
    modifier: wound.modifier,
    total: wound.damageDice.reduce((sum, die) => sum + die, 0) + wound.modifier,
    // The wounded character's own current values, so the page can show what
    // each choice would leave. Their sheet already carries these.
    current: { STR: defender.current.STR, DEX: defender.current.DEX, END: defender.current.END },
    remaining: resolution.wounds.length - resolution.nextIndex
  };
}

// v0.180.0: what a party combatant needs to roll against each visible foe.
//
// This is a deliberate change to the rule at the top of this file. "No
// numbers" was written to stop the enemy roster being published as a stat
// block; it was never meant to stop a player knowing their own throw. At the
// table the player rolls their own dice and is told what they need — Book 1
// p.30 is addressed to the player throwing — and the referee's own client has
// shown that figure since v0.178.0. Publishing it only for combatants the
// party actually has, against foes it can already see, keeps the asymmetry
// where it belongs.
//
// What is published is the total and the rows that belong to the ATTACKER:
// their expertise, their characteristic, their fatigue, the band. The
// defender's armour is never named — the weapons-matrix and range-matrix DMs
// are published as one combined TABLE row, exactly as the referee's own
// result card shows them. A player who does the arithmetic can still infer
// the armour, as they could at a table by looking at the man; what they
// cannot do is read it off a roster.
function publishedThrows(encounter) {
  if (encounter.status !== 'active') return [];
  const party = encounter.combatants.filter((entry) => entry.side === 'party' && entry.status === 'active');
  const foes = encounter.combatants.filter((entry) => entry.side !== 'party' && entry.status === 'active');
  const throws = [];
  for (const attacker of party) {
    for (const defender of foes) {
      let model = null;
      try { model = throwCardModel(encounter, attacker, defender); }
      catch { continue; }
      if (!model) continue;
      // Only the rows that belong to the ATTACKER are named: their
      // expertise, their characteristic, their fatigue, their stock, and the
      // light everyone is fighting in. Everything derived from the defender —
      // the weapons matrix (armour), the range matrix, their parry, their
      // evasion, their cover — is published as one combined figure with no
      // label at all, so no enemy attribute is ever named to a player.
      const ATTACKER_ROWS = ['skill', 'characteristic', 'untrained', 'weakened', 'foldingStock', 'surprise', 'lighting'];
      const rows = model.rows
        .filter((row) => ATTACKER_ROWS.includes(row.key))
        .map((row) => ({ label: row.label, dm: row.dm, source: row.source, note: row.note ?? null }));
      const defenceDM = model.rows
        .filter((row) => !ATTACKER_ROWS.includes(row.key))
        .reduce((sum, row) => sum + (row.dm ?? 0), 0);
      throws.push({
        attackerId: attacker.id,
        targetId: defender.id,
        range: model.range,
        bands: model.bands,
        reach: model.reach,
        basic: model.basic,
        // Tables and defence as one unnamed line.
        defenceDM: model.reach ? defenceDM : null,
        rows,
        totalDM: model.totalDM,
        needed: model.needed,
        chance: model.chance,
        wound: { ...model.wound },
        blowsRemaining: model.blowsRemaining,
        melee: model.weapon.melee,
        weaponName: model.weapon.name
      });
    }
  }
  return throws;
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
    // v0.179.0: what the round is waiting for, if anything.
    pendingWound: publishedPendingWound(encounter),
    // v0.180.0: each party combatant's own throw against each visible foe.
    throws: publishedThrows(encounter),
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
    // v0.180.0: the party's own dice. An attack with a party combatant on
    // either end is one the table watched being thrown, so its result is
    // published as a card: the dice, what was needed, and where the wound
    // landed. A fight between two other sides stays narrated only, and no
    // DM is broken out — the breakdown would name the defender's armour.
    attacks: (encounter.history ?? [])
      .filter((entry) => entry.kind === 'attack' && entry.detail && entry.round >= earliest && entry.round <= currentRound)
      .filter((entry) => encounter.combatants.some((combatant) => combatant.side === 'party'
        && (combatant.id === entry.actorId || combatant.id === entry.targetId)))
      .map((entry) => ({
        round: entry.round,
        attackerId: entry.actorId,
        targetId: entry.targetId,
        attackerName: combatantName(encounter, entry.actorId),
        defenderName: combatantName(encounter, entry.targetId),
        weaponName: entry.detail.weaponName ?? null,
        range: entry.detail.range ?? null,
        dice: [...(entry.detail.dice ?? [])],
        roll: entry.detail.roll ?? null,
        totalDM: entry.detail.totalDM ?? 0,
        needed: Math.max(2, (entry.detail.target ?? 8) - (entry.detail.totalDM ?? 0)),
        total: entry.detail.total ?? null,
        hit: Boolean(entry.detail.success),
        wound: entry.detail.success ? {
          dice: [...(entry.detail.damageDice ?? [])],
          modifier: entry.detail.damageModifier ?? 0,
          total: entry.detail.woundTotal ?? 0,
          noEffect: Boolean(entry.detail.noEffect),
          // Where it landed is public: a man clutching his arm is visible.
          allocations: (entry.detail.allocations ?? []).map((allocation) => ({
            characteristic: allocation.characteristic, amount: allocation.amount, firstBlood: Boolean(allocation.firstBlood)
          })),
          playerAllocated: Boolean(entry.detail.playerAllocated)
        } : null,
        defenderStatus: entry.detail.defenderStatus ?? 'active'
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

// v0.70.0: the ship as the party knows it — name, type, jump, fuel, hold and
// berths. Not the operating account, not the manifests: money and cargo are
// the referee's tables until the player page can act on them.
export function buildPublishedShip(ship) {
  if (!ship) return null;
  const specs = ship.specifications ?? {};
  const state = ship.state ?? {};
  return {
    shipId: ship.identity?.id ?? null,
    name: ship.identity?.name ?? null,
    registry: ship.identity?.registry ?? null,
    typeCode: ship.design?.typeCode ?? null,
    typeName: ship.design?.name ?? null,
    tons: specs.hull?.tons ?? null,
    jumpRating: specs.drives?.jump?.rating ?? null,
    fuel: { aboardTons: Number.isFinite(state.currentFuelTons) ? state.currentFuelTons : null, capacityTons: specs.fuel?.capacityTons ?? null },
    cargo: { usedTons: state.cargoUsedTons ?? 0, capacityTons: specs.cargo?.capacityTons ?? null },
    staterooms: specs.accommodations?.staterooms ?? null,
    passengers: Array.isArray(state.passengerManifest) ? state.passengerManifest.length : 0,
    operationalStatus: state.operationalStatus ?? null
  };
}

// A campaign document trimmed to what a player may see of the shared state.
export function buildPublishedCampaign(campaign, { publishedAt, currentEncounterId = null, ship = null, activeScene = null } = {}) {
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
    // v0.70.0: the world scene the player page draws between fights.
    ship: buildPublishedShip(ship),
    // v0.74.0: the staged scene, when the referee has one active.
    activeScene: activeScene ?? null,
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
    // v0.277.0: the rest of the personnel file, so the player's page can
    // draw the same sheet the referee's does (Gear and Record tabs).
    inventory: cloneJson(character.inventory ?? []),
    record: cloneJson(character.record ?? {}),
    provenance: cloneJson(character.provenance ?? {}),
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

// v0.74.0: the active scene as players see it — the board and who stands
// where, by name and label. Which tokens are in the tracker is the referee's
// business until the fight begins.
export function buildPublishedScene(scene, { names = new Map() } = {}) {
  if (!scene) return null;
  // v0.171.0: a space scene has no squares and no metres. This read
  // board.squares regardless, so activating one published a map of NaN columns
  // with every save, and the player canvas drew it from tokens with no
  // column or row. A vector scene publishes as the plot it is: its span, its
  // bodies, and each ship's point and vector. Players watch it; Book 2 moves a
  // ship by thrust, so nobody drags one here.
  if (scene.board?.kind === 'vector') {
    return {
      sceneId: scene.identity.id,
      name: scene.identity.name,
      kind: 'vector',
      spanThousandMiles: scene.board.spanThousandMiles,
      bodies: JSON.parse(JSON.stringify(scene.space?.bodies ?? [])),
      gravityBodyId: scene.space?.gravityBodyId ?? null,
      tokens: scene.tokens.map((token) => {
        const named = names.get(token.actorId) ?? {};
        return {
          id: token.id, actorId: token.actorId, name: token.label || named.name || token.actorId,
          label: token.label || named.name || '', side: token.side,
          position: { x: token.position.x, y: token.position.y },
          velocity: { x: Number(token.velocity?.x) || 0, y: Number(token.velocity?.y) || 0 }
        };
      })
    };
  }
  const meters = scene.board.squares * scene.board.metersPerSquare;
  return {
    sceneId: scene.identity.id,
    name: scene.identity.name,
    kind: 'grid',
    map: { columns: meters + 1, rows: meters + 1, metersPerSquare: scene.board.metersPerSquare },
    tokens: scene.tokens.map((token) => {
      const named = names.get(token.actorId) ?? {};
      return { id: token.id, actorId: token.actorId, name: named.name ?? token.label ?? '?', label: token.label || (named.name ?? '?').charAt(0), side: token.side, actorType: named.actorType ?? 'npc', position: { ...token.position } };
    })
  };
}

/**
 * v0.171.0: a published vector scene, shaped back into what the staging
 * renderer draws. Read-only: the result is for display, not for saving.
 */
export function publishedVectorSceneDocument(published) {
  if (published?.kind !== 'vector') throw new TypeError('not a published vector scene');
  return {
    identity: { id: published.sceneId, name: published.name },
    board: { kind: 'vector', spanThousandMiles: published.spanThousandMiles },
    space: { bodies: published.bodies ?? [], gravityBodyId: published.gravityBodyId ?? null, atmosphere: null },
    background: { assetId: null },
    tokens: published.tokens.map((token) => ({ id: token.id, actorId: token.actorId, side: token.side, label: token.name, position: { ...token.position }, velocity: { ...token.velocity } }))
  };
}

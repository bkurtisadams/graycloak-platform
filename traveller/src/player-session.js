import { stableDocumentId } from '../../packages/classic-traveller-rules/index.js';

export const PLAYER_SESSION_SCHEMA_VERSION = 1;
export const PLAYER_SESSION_STORAGE_PREFIX = 'graycloak-traveller-player-session-v1:';
export const PLAYER_ROLES = Object.freeze({
  SOLO: 'solo',
  PLAYER: 'player',
  REFEREE: 'referee',
  SPECTATOR: 'spectator'
});

const ROLE_VALUES = new Set(Object.values(PLAYER_ROLES));

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function nonblank(value) { return typeof value === 'string' && value.trim().length > 0; }

function uniqueIds(values = []) {
  if (!Array.isArray(values)) throw new TypeError('controlledCharacterIds must be an array');
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
}

export function createPlayerSession({
  id,
  campaignId,
  playerId = 'local-solo',
  displayName = 'Local Player',
  role = PLAYER_ROLES.SOLO,
  controlledCharacterIds = [],
  viewedCharacterId = null
} = {}) {
  if (!nonblank(campaignId)) throw new TypeError('campaignId is required');
  if (!nonblank(playerId)) throw new TypeError('playerId is required');
  if (!nonblank(displayName)) throw new TypeError('displayName is required');
  if (!ROLE_VALUES.has(role)) throw new TypeError(`unsupported player role: ${role}`);
  const controlled = uniqueIds(controlledCharacterIds);
  if (role === PLAYER_ROLES.SPECTATOR && controlled.length) throw new TypeError('spectators cannot control characters');
  if (viewedCharacterId !== null && !nonblank(viewedCharacterId)) throw new TypeError('viewedCharacterId must be null or nonblank');
  if ((role === PLAYER_ROLES.PLAYER || role === PLAYER_ROLES.SOLO) && viewedCharacterId !== null && !controlled.includes(viewedCharacterId)) {
    throw new TypeError('viewedCharacterId must be controlled by this player');
  }
  return {
    schemaVersion: PLAYER_SESSION_SCHEMA_VERSION,
    identity: {
      id: id ?? stableDocumentId('player-session', `${campaignId}|${playerId}`)
    },
    campaignId,
    player: { id: playerId, displayName, role },
    controlledCharacterIds: controlled,
    viewedCharacterId
  };
}

export function importPlayerSession(input) {
  let parsed = input;
  if (typeof input === 'string') {
    try { parsed = JSON.parse(input); }
    catch (error) { throw new Error(`invalid Traveller player session JSON: ${error.message}`); }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new TypeError('player session must be an object');
  if (parsed.schemaVersion !== PLAYER_SESSION_SCHEMA_VERSION) throw new TypeError(`unsupported player session schemaVersion: ${parsed.schemaVersion}`);
  if (!nonblank(parsed.identity?.id)) throw new TypeError('player session identity.id is required');
  return createPlayerSession({
    id: parsed.identity.id,
    campaignId: parsed.campaignId,
    playerId: parsed.player?.id,
    displayName: parsed.player?.displayName,
    role: parsed.player?.role,
    controlledCharacterIds: parsed.controlledCharacterIds,
    viewedCharacterId: parsed.viewedCharacterId
  });
}

export function playerCanControlCharacter(session, characterId) {
  const current = importPlayerSession(session);
  if (!nonblank(characterId)) return false;
  if (current.player.role === PLAYER_ROLES.REFEREE) return true;
  if (current.player.role === PLAYER_ROLES.SPECTATOR) return false;
  return current.controlledCharacterIds.includes(characterId);
}

export function setPlayerViewedCharacter(session, characterId, { partyCharacterIds = [] } = {}) {
  const current = importPlayerSession(session);
  if (!nonblank(characterId)) throw new TypeError('characterId is required');
  const partyIds = uniqueIds(partyCharacterIds);
  if (partyIds.length && !partyIds.includes(characterId)) throw new Error(`character is not in this campaign party: ${characterId}`);
  if (current.player.role !== PLAYER_ROLES.REFEREE && current.player.role !== PLAYER_ROLES.SPECTATOR && !playerCanControlCharacter(current, characterId)) {
    throw new Error(`player does not control character: ${characterId}`);
  }
  return createPlayerSession({
    ...current,
    id: current.identity.id,
    playerId: current.player.id,
    displayName: current.player.displayName,
    role: current.player.role,
    viewedCharacterId: characterId
  });
}

export function createPlayerSessionStore({ storage, storagePrefix = PLAYER_SESSION_STORAGE_PREFIX } = {}) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    throw new TypeError('storage must provide getItem and setItem');
  }
  const keyFor = (campaignId, playerId) => `${storagePrefix}${encodeURIComponent(campaignId)}:${encodeURIComponent(playerId)}`;
  return Object.freeze({
    get(campaignId, playerId = 'local-solo') {
      const raw = storage.getItem(keyFor(campaignId, playerId));
      return raw ? importPlayerSession(raw) : null;
    },
    put(session) {
      const validated = importPlayerSession(session);
      storage.setItem(keyFor(validated.campaignId, validated.player.id), JSON.stringify(validated));
      return clone(validated);
    },
    getOrCreate(options = {}) {
      const existing = this.get(options.campaignId, options.playerId ?? 'local-solo');
      return existing ?? this.put(createPlayerSession(options));
    }
  });
}

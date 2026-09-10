// character-record.js — a player's character before, and apart from, any
// campaign.
//
// v0.67.0. The referee's campaign keeps its own copy of every party character;
// this is the player's copy, in the top-level travellerCharacters collection,
// owned by the account that rolled it. It carries the Character Document in
// full plus an envelope saying where the character is: nowhere yet, seated at
// a referee's campaign, or in the solo world. A character is in one world at a
// time — a solo character and a table character would carry irreconcilable
// dates — so `world` is a single value, not a set.
//
// Joining a table is by invite: the referee mints a code, the player redeems
// it, and that writes a join request beneath the campaign carrying a snapshot
// of the character. The referee seats the request; the player's record is
// then marked as belonging to that campaign.

import { importCharacterDocument } from '../../packages/classic-traveller-rules/index.js';

export const CHARACTER_RECORD_SCHEMA_VERSION = 1;
export const WORLD_KINDS = Object.freeze({
  UNASSIGNED: 'unassigned',
  CAMPAIGN: 'campaign',
  SOLO: 'solo'
});
const WORLD_KIND_VALUES = new Set(Object.values(WORLD_KINDS));

function nonblank(value) { return typeof value === 'string' && value.trim().length > 0; }
function clone(value) { return JSON.parse(JSON.stringify(value)); }

export function unassignedWorld() {
  return { kind: WORLD_KINDS.UNASSIGNED, campaignId: null, campaignName: null, since: null };
}

export function createCharacterRecord(characterDocument, { ownerUid, createdAt = Date.now() } = {}) {
  const character = importCharacterDocument(characterDocument);
  if (!nonblank(ownerUid)) throw new TypeError('ownerUid is required');
  return {
    schemaVersion: CHARACTER_RECORD_SCHEMA_VERSION,
    characterId: character.identity.id,
    ownerUid: ownerUid.trim(),
    name: character.identity.name,
    world: unassignedWorld(),
    // A pending join is the player's own note of where they asked to sit,
    // cleared when the referee seats them or they withdraw.
    pendingJoin: null,
    createdAt,
    updatedAt: createdAt,
    character
  };
}

export function validateCharacterRecord(record) {
  const errors = [];
  if (!record || typeof record !== 'object') return ['record must be an object'];
  if (record.schemaVersion !== CHARACTER_RECORD_SCHEMA_VERSION) errors.push(`unsupported schemaVersion: ${record.schemaVersion}`);
  if (!nonblank(record.ownerUid)) errors.push('ownerUid is required');
  if (!nonblank(record.characterId)) errors.push('characterId is required');
  if (!record.world || !WORLD_KIND_VALUES.has(record.world.kind)) errors.push('world.kind is invalid');
  if (record.world?.kind === WORLD_KINDS.CAMPAIGN && !nonblank(record.world.campaignId)) errors.push('a campaign world needs a campaignId');
  try {
    const character = importCharacterDocument(record.character);
    if (character.identity.id !== record.characterId) errors.push('characterId does not match the character document');
  } catch (error) {
    errors.push(`character: ${error.message}`);
  }
  return errors;
}

export function importCharacterRecord(input) {
  const parsed = typeof input === 'string' ? JSON.parse(input) : input;
  const errors = validateCharacterRecord(parsed);
  if (errors.length) throw new TypeError(`invalid Traveller character record: ${errors.join('; ')}`);
  return clone(parsed);
}

// What the lobby shows beside the character, and which button it offers.
export function characterRecordStatus(record) {
  if (record.world?.kind === WORLD_KINDS.CAMPAIGN) {
    return { label: `SEATED AT ${String(record.world.campaignName ?? record.world.campaignId).toUpperCase()}`, enter: 'campaign', campaignId: record.world.campaignId };
  }
  if (record.world?.kind === WORLD_KINDS.SOLO) return { label: 'IN THE SOLO WORLD', enter: 'solo', campaignId: null };
  if (record.pendingJoin?.campaignId) {
    return { label: `AWAITING A SEAT AT ${String(record.pendingJoin.campaignName ?? record.pendingJoin.campaignId).toUpperCase()}`, enter: null, campaignId: null };
  }
  return { label: 'NOT YET AT A TABLE', enter: null, campaignId: null };
}

export function setCharacterRecordWorld(record, world, { updatedAt = Date.now() } = {}) {
  const next = importCharacterRecord(record);
  next.world = { ...unassignedWorld(), ...world };
  if (!WORLD_KIND_VALUES.has(next.world.kind)) throw new TypeError(`unsupported world kind: ${world?.kind}`);
  if (next.world.kind !== WORLD_KINDS.UNASSIGNED) next.pendingJoin = null;
  next.updatedAt = updatedAt;
  return next;
}

export function setCharacterRecordPendingJoin(record, pendingJoin, { updatedAt = Date.now() } = {}) {
  const next = importCharacterRecord(record);
  next.pendingJoin = pendingJoin ? { campaignId: pendingJoin.campaignId, campaignName: pendingJoin.campaignName ?? null, code: pendingJoin.code, requestedAt: pendingJoin.requestedAt ?? updatedAt } : null;
  next.updatedAt = updatedAt;
  return next;
}

// --- Invites ---------------------------------------------------------------
// invites/{code} is the platform's existing collection: any signed-in account
// may read a code and create one, and only its owner may change it. A
// Traveller invite names the campaign it opens.

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I
export function generateInviteCode({ random = Math.random, length = 6 } = {}) {
  let code = '';
  for (let index = 0; index < length; index += 1) code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length) % CODE_ALPHABET.length];
  return code;
}

export function normalizeInviteCode(code) {
  return String(code ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function createTravellerInvite({ code, ownerUid, campaignId, campaignName = null, createdAt = Date.now() } = {}) {
  const normalized = normalizeInviteCode(code);
  if (!normalized) throw new TypeError('an invite code is required');
  if (!nonblank(ownerUid)) throw new TypeError('ownerUid is required');
  if (!nonblank(campaignId)) throw new TypeError('campaignId is required');
  return { code: normalized, game: 'traveller', ownerUid: ownerUid.trim(), campaignId: campaignId.trim(), campaignName, createdAt };
}

// --- Join requests ---------------------------------------------------------
// travellerCampaigns/{campaignId}/joins/{uid}: one per account, create-only by
// the player redeeming a valid code, read and cleared by the referee. It
// carries the character in full so the referee can seat it without being
// able to read the player's own record.

export function createJoinRequest({ uid, name = null, code, campaignId, record, requestedAt = Date.now() } = {}) {
  if (!nonblank(uid)) throw new TypeError('uid is required');
  const normalized = normalizeInviteCode(code);
  if (!normalized) throw new TypeError('an invite code is required');
  if (!nonblank(campaignId)) throw new TypeError('campaignId is required');
  const current = importCharacterRecord(record);
  if (current.ownerUid !== uid.trim()) throw new TypeError('a player may only offer their own character');
  if (current.world.kind !== WORLD_KINDS.UNASSIGNED) throw new TypeError('this character is already in a world');
  return {
    uid: uid.trim(),
    name,
    code: normalized,
    campaignId: campaignId.trim(),
    characterId: current.characterId,
    characterName: current.name,
    character: clone(current.character),
    requestedAt
  };
}

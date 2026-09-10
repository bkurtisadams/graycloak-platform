import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { importCharacterDocument } from '../../packages/classic-traveller-rules/index.js';
import {
  createCharacterRecord, importCharacterRecord, validateCharacterRecord, characterRecordStatus,
  setCharacterRecordWorld, setCharacterRecordPendingJoin, generateInviteCode, normalizeInviteCode,
  createTravellerInvite, createJoinRequest, WORLD_KINDS
} from '../src/character-record.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const hawkeye = async () => importCharacterDocument(await readFile(path.join(here, '../examples/Hawkeye.character.json'), 'utf8'));

test('a character record wraps the document with an owner and an unassigned world', async () => {
  const record = createCharacterRecord(await hawkeye(), { ownerUid: 'uid-a', createdAt: 5 });
  assert.equal(record.ownerUid, 'uid-a');
  assert.equal(record.name, 'Hawkeye');
  assert.equal(record.characterId, record.character.identity.id);
  assert.equal(record.world.kind, WORLD_KINDS.UNASSIGNED);
  assert.equal(record.pendingJoin, null);
  assert.deepEqual(validateCharacterRecord(record), []);
  assert.equal(characterRecordStatus(record).label, 'NOT YET AT A TABLE');
  assert.equal(characterRecordStatus(record).enter, null);
  assert.throws(() => createCharacterRecord(record.character, {}), TypeError);
});

test('a character is in one world at a time, and seating clears the pending join', async () => {
  let record = createCharacterRecord(await hawkeye(), { ownerUid: 'uid-a' });
  record = setCharacterRecordPendingJoin(record, { campaignId: 'sea-of-suns', campaignName: 'Sea of Suns', code: 'ABC234' });
  assert.match(characterRecordStatus(record).label, /AWAITING A SEAT AT SEA OF SUNS/);
  record = setCharacterRecordWorld(record, { kind: WORLD_KINDS.CAMPAIGN, campaignId: 'sea-of-suns', campaignName: 'Sea of Suns', since: 9 });
  assert.equal(record.pendingJoin, null);
  const status = characterRecordStatus(record);
  assert.equal(status.enter, 'campaign');
  assert.equal(status.campaignId, 'sea-of-suns');
  assert.throws(() => setCharacterRecordWorld(record, { kind: 'both' }), TypeError);
  const solo = setCharacterRecordWorld(record, { kind: WORLD_KINDS.SOLO });
  assert.equal(characterRecordStatus(solo).enter, 'solo');
  assert.equal(solo.world.campaignId, null);
});

test('records validate on import', async () => {
  const record = createCharacterRecord(await hawkeye(), { ownerUid: 'uid-a' });
  assert.deepEqual(importCharacterRecord(JSON.stringify(record)).characterId, record.characterId);
  assert.throws(() => importCharacterRecord({ ...record, characterId: 'someone-else' }), /characterId does not match/);
  assert.throws(() => importCharacterRecord({ ...record, world: { kind: 'campaign', campaignId: '' } }), /needs a campaignId/);
});

test('invite codes avoid ambiguous glyphs and normalise on entry', () => {
  const code = generateInviteCode({ random: () => 0.999, length: 8 });
  assert.equal(code.length, 8);
  assert.doesNotMatch(generateInviteCode({ random: Math.random, length: 200 }), /[01IO]/);
  assert.equal(normalizeInviteCode(' ab-c2 34 '), 'ABC234');
  const invite = createTravellerInvite({ code: 'abc234', ownerUid: 'uid-ref', campaignId: 'sea-of-suns', campaignName: 'Sea of Suns', createdAt: 1 });
  assert.deepEqual(invite, { code: 'ABC234', game: 'traveller', ownerUid: 'uid-ref', campaignId: 'sea-of-suns', campaignName: 'Sea of Suns', createdAt: 1 });
  assert.throws(() => createTravellerInvite({ code: '', ownerUid: 'x', campaignId: 'y' }), TypeError);
});

test('a join request carries the character and only for an unassigned one the player owns', async () => {
  const record = createCharacterRecord(await hawkeye(), { ownerUid: 'uid-a' });
  const join = createJoinRequest({ uid: 'uid-a', name: 'Alex', code: 'abc234', campaignId: 'sea-of-suns', record, requestedAt: 3 });
  assert.equal(join.uid, 'uid-a');
  assert.equal(join.code, 'ABC234');
  assert.equal(join.characterId, record.characterId);
  assert.equal(join.character.identity.name, 'Hawkeye');
  assert.equal(join.character.skills.Pilot, 1);
  assert.throws(() => createJoinRequest({ uid: 'uid-b', code: 'abc234', campaignId: 'sea-of-suns', record }), /own character/);
  const seated = setCharacterRecordWorld(record, { kind: WORLD_KINDS.CAMPAIGN, campaignId: 'other' });
  assert.throws(() => createJoinRequest({ uid: 'uid-a', code: 'abc234', campaignId: 'sea-of-suns', record: seated }), /already in a world/);
});

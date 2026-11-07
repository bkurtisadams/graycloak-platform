import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { importCharacterDocument } from '../vendor/classic-traveller-rules/index.js';
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
  assert.equal(characterRecordStatus(record).label, 'NOT IN A CAMPAIGN');
  assert.equal(characterRecordStatus(record).enter, null);
  assert.throws(() => createCharacterRecord(record.character, {}), TypeError);
});

test('a character is in one world at a time, and seating clears the pending join', async () => {
  let record = createCharacterRecord(await hawkeye(), { ownerUid: 'uid-a' });
  record = setCharacterRecordPendingJoin(record, { campaignId: 'sea-of-suns', campaignName: 'Sea of Suns', code: 'ABC234' });
  assert.match(characterRecordStatus(record).label, /WAITING TO JOIN SEA OF SUNS/);
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
  assert.deepEqual(invite, { code: 'ABC234', game: 'traveller', ownerUid: 'uid-ref', campaignId: 'sea-of-suns', campaignName: 'Sea of Suns', createdAt: 1, approval: false, refereeName: null }, 'v0.289.0: a link seats at once unless it asks approval');
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

// v0.369.0 (Bruce, Nov 2026): taking one character out of a campaign deleted the
// player's seat there, though another of theirs still played in it, and the
// server then refused every press: "You are not a player in this campaign".
test('v0.369.0 the player\u2019s other characters in the same campaign are what keep their seat', async () => {
  const { otherCharactersInCampaign } = await import('../src/character-record.js');
  const base = await hawkeye();
  const make = (id, name, world) => {
    const record = createCharacterRecord({ ...base, identity: { ...base.identity, id, name } }, { ownerUid: 'uid-bruce', createdAt: 1 });
    return world ? setCharacterRecordWorld(record, world) : record;
  };
  const sea = { kind: WORLD_KINDS.CAMPAIGN, campaignId: 'campaign-sea', campaignName: 'Sea of Suns', since: 5 };
  const other = { kind: WORLD_KINDS.CAMPAIGN, campaignId: 'campaign-other', campaignName: 'Elsewhere', since: 5 };
  const katarina = make('char-kat', 'Baroness Katarina Sorell', sea);
  const gabriella = make('char-gab', 'Gabriella Bennett', sea);
  const elsewhere = make('char-else', 'Someone Else', other);
  const spare = make('char-spare', 'Anastasia', null);
  const records = [katarina, gabriella, elsewhere, spare];
  // Gabriella leaves while Katarina is still in Sea of Suns: the seat stays.
  assert.deepEqual(otherCharactersInCampaign(records, gabriella).map((entry) => entry.characterId), ['char-kat']);
  // Katarina is the last one there once Gabriella has gone: the seat may go.
  assert.deepEqual(otherCharactersInCampaign([katarina, elsewhere, spare], katarina), []);
  // A character in another campaign, or none, does not count; nor does the leaving one.
  assert.deepEqual(otherCharactersInCampaign([elsewhere, spare], katarina), []);
  assert.deepEqual(otherCharactersInCampaign(records, spare), [], 'not in any campaign');
  assert.deepEqual(otherCharactersInCampaign(null, katarina), []);
});

// v0.370.0: Leave says what it does — their copy comes home, the referee's stays.
test('v0.370.0 Leave says the referee keeps a copy, and whether the player stays in the campaign', async () => {
  const { leaveCampaignWords, otherCharactersInCampaign } = await import('../src/character-record.js');
  const base = await hawkeye();
  const sea = { kind: WORLD_KINDS.CAMPAIGN, campaignId: 'campaign-sea', campaignName: 'Sea of Suns', since: 5 };
  const make = (id, name, world) => {
    const record = createCharacterRecord({ ...base, identity: { ...base.identity, id, name } }, { ownerUid: 'uid-bruce', createdAt: 1 });
    return world ? setCharacterRecordWorld(record, world) : record;
  };
  const anastasia = make('char-ana', 'Anastasia Von Tirnow', sea);
  const katarina = make('char-kat', 'Baroness Katarina Sorell', sea);
  // With another character still there.
  const both = leaveCampaignWords(anastasia, [anastasia, katarina]);
  assert.match(both.question, /^Take Anastasia Von Tirnow out of Sea of Suns\?\n\n/);
  assert.match(both.question, /comes home with everything that happened there, free to join another campaign\./);
  assert.match(both.question, /Sea of Suns keeps its own copy of Anastasia Von Tirnow until its referee lets Anastasia Von Tirnow go\./);
  assert.match(both.question, /You stay in Sea of Suns with Baroness Katarina Sorell\.$/);
  assert.equal(both.done, 'ANASTASIA VON TIRNOW IS FREE; THE REFEREE OF SEA OF SUNS STILL HOLDS A COPY. YOU STILL PLAY BARONESS KATARINA SORELL THERE');
  // The last one there: the player goes too.
  const last = leaveCampaignWords(katarina, [katarina]);
  assert.match(last.question, /You stop being a player in Sea of Suns\.$/);
  assert.match(last.done, /^BARONESS KATARINA SORELL IS FREE; THE REFEREE OF SEA OF SUNS STILL HOLDS A COPY UNTIL THEY LET BARONESS KATARINA SORELL GO$/);
  // Several others are listed in words.
  const third = make('char-third', 'Third One', sea);
  assert.match(leaveCampaignWords(anastasia, [anastasia, katarina, third]).question, /with Baroness Katarina Sorell and Third One\.$/);
  // It never says "seat".
  for (const text of [both.question, both.done, last.question, last.done]) assert.doesNotMatch(text, /seat/i);
  // And it agrees with what Leave does: the player stays in exactly when others remain.
  assert.equal(otherCharactersInCampaign([anastasia, katarina], anastasia).length, 1);
});

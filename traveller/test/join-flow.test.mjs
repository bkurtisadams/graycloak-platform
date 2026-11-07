// join-flow: joining by link, against a fake that behaves as the Firestore
// rules do (gcc/firestore.rules v20 — the rules suite is the authority):
//   joins/{uid}   create once; update is refused; the player may delete it
//   players/{uid} the player may create their own seat with a code that opens
//                 this campaign and does not ask approval
//   travellerCharacters/{id} the owner may move it into a campaign only where
//                 they hold a seat
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { joinByLink, joinFailureMessage, JOIN_STEPS } from '../src/join-flow.js';
import { createCharacterRecord, WORLD_KINDS } from '../src/character-record.js';
import { importCharacterDocument } from '../vendor/classic-traveller-rules/index.js';

const fixture = new URL('./fixtures/Sea-of-Suns-v0.11.2-buggy.campaign.json', import.meta.url);
const CAMPAIGN = 'camp-sea-of-suns';
const UID = 'uid-bruce';

const denied = (what) => Object.assign(new Error(`Missing or insufficient permissions (${what})`), { code: 'permission-denied' });

async function anastasia() {
  const bundle = JSON.parse(await readFile(fixture, 'utf8'));
  const document = importCharacterDocument(bundle.documents.characters[0]);
  return createCharacterRecord(document, { ownerUid: UID, role: 'pc' });
}

function fakeFirestore({ approval = false, seatsAllowed = true, moveAllowed = true, game = 'traveller' } = {}) {
  const store = {
    invites: new Map([['SEA234', { code: 'SEA234', game, campaignId: CAMPAIGN, campaignName: 'Sea of Suns', approval }]]),
    joins: new Map(),
    players: new Map(),
    records: new Map(),
    calls: []
  };
  const io = {
    async readInvite(code) { store.calls.push('read'); return store.invites.get(code) ?? null; },
    async deleteJoinRequest(campaignId, uid) { store.calls.push('delete'); store.joins.delete(`${campaignId}/${uid}`); },
    async writeJoinRequest(join) {
      store.calls.push('note');
      const key = `${join.campaignId}/${join.uid}`;
      if (store.joins.has(key)) throw denied('joins are create-only; this is an update');
      store.joins.set(key, join);
    },
    async seatSelf(campaignId, uid, { name, code }) {
      store.calls.push('seat');
      const invite = store.invites.get(code);
      if (!seatsAllowed || !invite || invite.campaignId !== campaignId || invite.approval === true) throw denied('seat');
      store.players.set(`${campaignId}/${uid}`, { uid, name, code });
    },
    async saveCharacterRecord(record) {
      store.calls.push('record');
      const world = record.world ?? {};
      if (world.kind === WORLD_KINDS.CAMPAIGN && (!moveAllowed || !store.players.has(`${world.campaignId}/${record.ownerUid}`))) throw denied('character move');
      store.records.set(record.characterId, record);
    }
  };
  return { store, io };
}

const join = (record, fake, extra = {}) => joinByLink({ record, code: 'SEA234', uid: UID, playerName: 'Bruce', io: fake.io, now: 1000, ...extra });

test('v0.362.0 a good link seats the player, moves the character in, and leaves the join note for the referee', async () => {
  const record = await anastasia();
  const fake = fakeFirestore();
  const result = await join(record, fake);
  assert.equal(result.outcome, 'seated');
  assert.equal(result.moveError, null);
  assert.equal(result.campaignName, 'Sea of Suns');
  assert.ok(fake.store.players.has(`${CAMPAIGN}/${UID}`));
  assert.equal(fake.store.records.get(record.characterId).world.campaignId, CAMPAIGN);
  assert.ok(fake.store.joins.has(`${CAMPAIGN}/${UID}`), 'the referee’s page reads it to bring the character in');
});

test('v0.362.0 a join note left by an earlier attempt no longer turns every retry into "link not accepted"', async () => {
  const record = await anastasia();
  const fake = fakeFirestore();
  // What an earlier attempt that stopped part-way leaves behind.
  fake.store.joins.set(`${CAMPAIGN}/${UID}`, { uid: UID, code: 'SEA234', campaignId: CAMPAIGN, characterId: record.characterId, requestedAt: 1 });
  // The old sequence — write the note with no clearing — is exactly what the rules refuse.
  await assert.rejects(fake.io.writeJoinRequest({ uid: UID, campaignId: CAMPAIGN }), { code: 'permission-denied' });
  const result = await join(record, fake);
  assert.equal(result.outcome, 'seated');
  assert.equal(fake.store.joins.get(`${CAMPAIGN}/${UID}`).requestedAt, 1000, 'the note is the new one');
});

test('v0.362.0 a refused seat names its step, and the next try goes through', async () => {
  const record = await anastasia();
  const fake = fakeFirestore({ seatsAllowed: false });
  await assert.rejects(join(record, fake), (error) => {
    assert.equal(error.code, 'permission-denied');
    assert.equal(error.step, JOIN_STEPS.seat);
    assert.match(joinFailureMessage(error), /^THAT LINK WAS NOT ACCEPTED \(STEP: TAKING A SEAT\)\. /);
    return true;
  });
  assert.ok(fake.store.joins.has(`${CAMPAIGN}/${UID}`), 'the first attempt left its note behind');
  // The cause is put right; the same player tries again.
  const fixed = fakeFirestore();
  fixed.store.joins = fake.store.joins;
  const result = await join(record, fixed);
  assert.equal(result.outcome, 'seated');
});

test('v0.362.0 a seated player whose character could not be moved in is not stranded', async () => {
  const record = await anastasia();
  const fake = fakeFirestore({ moveAllowed: false });
  const result = await join(record, fake);
  assert.equal(result.outcome, 'seated');
  assert.equal(result.moveError.step, JOIN_STEPS.move);
  assert.ok(fake.store.players.has(`${CAMPAIGN}/${UID}`));
  assert.equal(fake.store.records.has(record.characterId), false, 'the record is unchanged; the referee’s page brings it in');
});

test('v0.362.0 a link that asks approval records the request and waits, with no seat', async () => {
  const record = await anastasia();
  const fake = fakeFirestore({ approval: true });
  const result = await join(record, fake);
  assert.equal(result.outcome, 'waiting');
  assert.equal(fake.store.players.size, 0);
  assert.equal(fake.store.records.get(record.characterId).pendingJoin.campaignId, CAMPAIGN);
  // Asked again (a withdrawn request, or a retry): the earlier note is cleared
  // first, which is what lets a second ask through the create-only rule.
  const again = await join(record, fake);
  assert.equal(again.outcome, 'waiting');
  assert.equal(fake.store.joins.size, 1);
});

test('v0.362.0 a link that is not a Traveller campaign says so in words, not as a refusal', async () => {
  const record = await anastasia();
  await assert.rejects(join(record, fakeFirestore({ game: 'adnd' })), /does not open a Traveller campaign/);
  await assert.rejects(joinByLink({ record, code: '', uid: UID, io: fakeFirestore().io }), /no code in it/);
  assert.equal(joinFailureMessage(new Error('plain words')), 'plain words');
});

test('v0.362.0 the lobby hands the join to join-flow and shows its message', async () => {
  const enter = await readFile(new URL('../client/enter.js', import.meta.url), 'utf8');
  assert.match(enter, /import \{ joinByLink, joinFailureMessage \} from '\.\.\/src\/join-flow\.js\?v=v\d+\.\d+\.\d+';/);
  assert.match(enter, /setStatus\(joinFailureMessage\(error\), 'error'\);/);
  assert.doesNotMatch(enter, /THAT LINK WAS NOT ACCEPTED/, 'the wording lives in one place');
});

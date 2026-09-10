// publish.js v1.1.0 — the referee's client putting a campaign online.
//
// The local campaign remains authoritative. This publishes a copy to Firestore
// so players can read it; nothing is read back in this version, and going
// offline simply stops publishing. Every write here is one the referee is
// permitted to make under the v11 rules: travellerCampaigns/{id} and
// encounters/{id}/view/current, both referee-only for writes.
//
// The full encounter document is NOT published. It carries enemy
// characteristics and wounds, and Firestore rules cannot filter fields, so
// players read the projection in src/published-view.js instead.

import { TRAVELLER_FIREBASE_CONFIG } from './firebase-config.js';
import { StaleCampaignHomeError } from '../src/campaign-home.js';

const SDK_VERSION = '10.12.2';
const FIRESTORE_SCRIPT = `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore-compat.js`;

let firestore = null;
let status = 'idle';
let lastError = null;

function loadScript(url) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${url}"]`)) { resolve(); return; }
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => reject(new Error(`failed to load ${url}`)));
    document.head.append(script);
  });
}

export function publishStatus() {
  return { status, error: lastError, available: firestore !== null };
}

// Firestore is loaded only when the referee first publishes, so a local game
// never fetches it at all.
export async function ensureFirestore() {
  if (firestore) return firestore;
  status = 'loading';
  try {
    await loadScript(FIRESTORE_SCRIPT);
    if (!globalThis.firebase?.firestore) throw new Error('Firestore SDK did not load');
    const app = globalThis.firebase.apps?.length
      ? globalThis.firebase.app()
      : globalThis.firebase.initializeApp(TRAVELLER_FIREBASE_CONFIG);
    firestore = globalThis.firebase.firestore(app);
    status = 'ready';
    return firestore;
  } catch (error) {
    status = 'unavailable';
    lastError = error?.message ?? String(error);
    throw error;
  }
}

export async function publishCampaign(published) {
  const db = await ensureFirestore();
  await db.collection('travellerCampaigns').doc(published.campaignId).set(published, { merge: true });
  return published.campaignId;
}

export async function publishEncounterView(view) {
  const db = await ensureFirestore();
  await db
    .collection('travellerCampaigns').doc(view.campaignId)
    .collection('encounters').doc(view.encounterId)
    .collection('view').doc('current')
    .set(view);
  return view.encounterId;
}

// Seating a player is what makes the campaign readable to them: the rules test
// membership of this subcollection.
export async function seatPlayer(campaignId, uid, { name = null } = {}) {
  const db = await ensureFirestore();
  await db
    .collection('travellerCampaigns').doc(campaignId)
    .collection('players').doc(uid)
    .set({ uid, name, seatedAt: Date.now() }, { merge: true });
  return uid;
}

export async function unseatPlayer(campaignId, uid) {
  const db = await ensureFirestore();
  // Their published character and log go with the seat: an unseated account
  // must not keep reading a sheet the referee has taken back.
  await clearPlayerDocuments(campaignId, uid);
  await db.collection('travellerCampaigns').doc(campaignId).collection('players').doc(uid).delete();
  return uid;
}

// --- v0.65.0: per-player documents ----------------------------------------
// travellerCampaigns/{id}/players/{uid}/characters/{characterId} and
// players/{uid}/log/current. The rules let that account and the referee read
// them and only the referee write, so the split by reader is done by path:
// one player's sheet and addressed log are never in a document another
// player can open.

function playerRef(db, campaignId, uid) {
  return db.collection('travellerCampaigns').doc(campaignId).collection('players').doc(uid);
}

export async function publishPlayerCharacter(published) {
  const db = await ensureFirestore();
  await playerRef(db, published.campaignId, published.ownerUid)
    .collection('characters').doc(published.characterId)
    .set(published);
  return published.characterId;
}

export async function removePlayerCharacter(campaignId, uid, characterId) {
  const db = await ensureFirestore();
  await playerRef(db, campaignId, uid).collection('characters').doc(characterId).delete();
  return characterId;
}

export async function publishPlayerLog(published) {
  const db = await ensureFirestore();
  await playerRef(db, published.campaignId, published.uid).collection('log').doc('current').set(published);
  return published.uid;
}

export async function clearPlayerDocuments(campaignId, uid) {
  const db = await ensureFirestore();
  const ref = playerRef(db, campaignId, uid);
  const characters = await ref.collection('characters').get();
  await Promise.all(characters.docs.map((entry) => entry.ref.delete()));
  await ref.collection('log').doc('current').delete();
  return characters.size;
}

export async function listSeatedPlayers(campaignId) {
  const db = await ensureFirestore();
  const snapshot = await db.collection('travellerCampaigns').doc(campaignId).collection('players').get();
  return snapshot.docs.map((entry) => entry.data());
}

// --- Declarations -------------------------------------------------------
// A player writes one document per combatant per round; the referee reads them
// and clears them once the round is resolved. The rules make these create-only
// for players, so a declaration cannot be revised after seeing what others did.

export async function watchDeclarations(campaignId, encounterId, onChange) {
  const db = await ensureFirestore();
  return db
    .collection('travellerCampaigns').doc(campaignId)
    .collection('encounters').doc(encounterId)
    .collection('declarations')
    .onSnapshot(
      (snapshot) => onChange(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }))),
      (error) => console.error('[traveller-publish] declarations:', error)
    );
}

export async function writeDeclaration(campaignId, encounterId, declaration) {
  const db = await ensureFirestore();
  await db
    .collection('travellerCampaigns').doc(campaignId)
    .collection('encounters').doc(encounterId)
    .collection('declarations').doc(declaration.actorId)
    .set(declaration);
  return declaration.actorId;
}

export async function clearDeclarations(campaignId, encounterId) {
  const db = await ensureFirestore();
  const collection = db
    .collection('travellerCampaigns').doc(campaignId)
    .collection('encounters').doc(encounterId)
    .collection('declarations');
  const snapshot = await collection.get();
  await Promise.all(snapshot.docs.map((entry) => entry.ref.delete()));
  return snapshot.size;
}

// --- Canvas interaction -------------------------------------------------
export async function writeTokenMove(campaignId, encounterId, move) {
  const db = await ensureFirestore();
  const ref = await db.collection('travellerCampaigns').doc(campaignId)
    .collection('encounters').doc(encounterId).collection('moves').add(move);
  return ref.id;
}

export async function watchTokenMoves(campaignId, encounterId, onChange) {
  const db = await ensureFirestore();
  return db.collection('travellerCampaigns').doc(campaignId)
    .collection('encounters').doc(encounterId).collection('moves')
    .onSnapshot((snapshot) => onChange(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }))),
      (error) => console.error('[traveller-publish] token moves:', error));
}

export async function clearTokenMove(campaignId, encounterId, moveId) {
  const db = await ensureFirestore();
  await db.collection('travellerCampaigns').doc(campaignId)
    .collection('encounters').doc(encounterId).collection('moves').doc(moveId).delete();
}

export async function writeCanvasPresence(campaignId, encounterId, presence) {
  const db = await ensureFirestore();
  await db.collection('travellerCampaigns').doc(campaignId)
    .collection('encounters').doc(encounterId).collection('presence').doc(presence.uid)
    .set(presence);
}

export async function watchCanvasPresence(campaignId, encounterId, onChange) {
  const db = await ensureFirestore();
  return db.collection('travellerCampaigns').doc(campaignId)
    .collection('encounters').doc(encounterId).collection('presence')
    .onSnapshot((snapshot) => onChange(snapshot.docs.map((entry) => entry.data())),
      (error) => console.error('[traveller-publish] canvas presence:', error));
}

// --- v0.67.0: the player's own characters, invites and join requests ------
// travellerCharacters/{characterId} is owned by the account that rolled it:
// the owner reads and writes it, and a referee may update only its `world`
// once it is seated at their campaign. invites/{code} is the platform's
// existing collection. travellerCampaigns/{id}/joins/{uid} is create-only by
// the player redeeming a code and read and cleared by the referee.

export async function saveCharacterRecord(record) {
  const db = await ensureFirestore();
  await db.collection('travellerCharacters').doc(record.characterId).set(record);
  return record.characterId;
}

export async function deleteCharacterRecord(characterId) {
  const db = await ensureFirestore();
  await db.collection('travellerCharacters').doc(characterId).delete();
  return characterId;
}

export async function watchOwnCharacterRecords(uid, onChange) {
  const db = await ensureFirestore();
  return db.collection('travellerCharacters').where('ownerUid', '==', uid)
    .onSnapshot((snapshot) => onChange(snapshot.docs.map((entry) => entry.data())),
      (error) => console.error('[traveller-publish] character records:', error));
}

// The referee may change where a character is, and nothing else about it.
export async function setCharacterRecordWorldRemote(characterId, world, { updatedAt = Date.now() } = {}) {
  const db = await ensureFirestore();
  await db.collection('travellerCharacters').doc(characterId).update({ world, pendingJoin: null, updatedAt });
  return characterId;
}

export async function readInvite(code) {
  const db = await ensureFirestore();
  const snapshot = await db.collection('invites').doc(code).get();
  return snapshot.exists ? snapshot.data() : null;
}

export async function createInvite(invite) {
  const db = await ensureFirestore();
  await db.collection('invites').doc(invite.code).set(invite);
  return invite.code;
}

export async function deleteInvite(code) {
  const db = await ensureFirestore();
  await db.collection('invites').doc(code).delete();
  return code;
}

export async function listCampaignInvites(campaignId) {
  const db = await ensureFirestore();
  const snapshot = await db.collection('invites').where('campaignId', '==', campaignId).where('game', '==', 'traveller').get();
  return snapshot.docs.map((entry) => entry.data());
}

export async function writeJoinRequest(join) {
  const db = await ensureFirestore();
  await db.collection('travellerCampaigns').doc(join.campaignId).collection('joins').doc(join.uid).set(join);
  return join.uid;
}

export async function deleteJoinRequest(campaignId, uid) {
  const db = await ensureFirestore();
  await db.collection('travellerCampaigns').doc(campaignId).collection('joins').doc(uid).delete();
  return uid;
}

export async function watchJoinRequests(campaignId, onChange) {
  const db = await ensureFirestore();
  return db.collection('travellerCampaigns').doc(campaignId).collection('joins')
    .onSnapshot((snapshot) => onChange(snapshot.docs.map((entry) => entry.data())),
      (error) => console.error('[traveller-publish] join requests:', error));
}

// --- v0.68.0: the campaign's home --------------------------------------------
// travellerCampaigns/{id}/state/current is the whole campaign as a bundle,
// referee-only, revisioned. The envelope travellerCampaigns/{id} is written
// in the same transaction so the two never disagree about the campaign's
// name, clock, location, ownership map or home revision.

function homeRef(db, campaignId) {
  return db.collection('travellerCampaigns').doc(campaignId).collection('state').doc('current');
}

// Saves a home at its stated revision, refusing if the home has moved on.
// `expectedRevision` is what this browser loaded (null for a campaign that
// has never been saved to Firestore). On success the home's revision is what
// was written; the caller keeps it for the next save.
export async function saveCampaignHome(home, envelope, { expectedRevision = null } = {}) {
  const db = await ensureFirestore();
  const ref = homeRef(db, home.campaignId);
  const envelopeRef = db.collection('travellerCampaigns').doc(home.campaignId);
  // v0.68.1: the home is referee-only and "referee" is read off the envelope,
  // so a first save must create the envelope before the transaction can read
  // or write beneath it. Creating is allowed to the account it names as owner.
  if (expectedRevision === null) {
    await envelopeRef.set({ ...envelope, homeRevision: null, homeSavedAt: null }, { merge: true });
  }
  await db.runTransaction(async (transaction) => {
    const current = await transaction.get(ref);
    const currentRevision = current.exists ? (current.data().revision ?? 0) : null;
    if (currentRevision !== null && currentRevision !== expectedRevision) {
      throw new StaleCampaignHomeError({ campaignId: home.campaignId, expectedRevision, currentRevision, savedAt: current.data().savedAt ?? null });
    }
    if (current.exists && home.revision !== currentRevision + 1) {
      throw new StaleCampaignHomeError({ campaignId: home.campaignId, expectedRevision, currentRevision });
    }
    transaction.set(ref, home);
    transaction.set(envelopeRef, { ...envelope, homeRevision: home.revision, homeSavedAt: home.savedAt }, { merge: true });
  });
  return home.revision;
}

export async function loadCampaignHome(campaignId) {
  const db = await ensureFirestore();
  const snapshot = await homeRef(db, campaignId).get();
  return snapshot.exists ? snapshot.data() : null;
}

// The campaigns this account referees: the envelopes, which name the home's
// revision and last save. A campaign saved only in a browser is not here.
export async function listOwnCampaigns(uid) {
  const db = await ensureFirestore();
  const snapshot = await db.collection('travellerCampaigns').where('ownership.ownerUid', '==', uid).get();
  return snapshot.docs.map((entry) => entry.data());
}

// v0.69.0: a character record by id, for the account that owns it.
export async function loadCharacterRecord(characterId) {
  const db = await ensureFirestore();
  const snapshot = await db.collection('travellerCharacters').doc(characterId).get();
  return snapshot.exists ? snapshot.data() : null;
}

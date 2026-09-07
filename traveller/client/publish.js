// publish.js v1.0.0 — the referee's client putting a campaign online.
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
  await db.collection('travellerCampaigns').doc(campaignId).collection('players').doc(uid).delete();
  return uid;
}

export async function listSeatedPlayers(campaignId) {
  const db = await ensureFirestore();
  const snapshot = await db.collection('travellerCampaigns').doc(campaignId).collection('players').get();
  return snapshot.docs.map((entry) => entry.data());
}

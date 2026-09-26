// ---------------------------------------------------------------------------
// traveller/functions — v0.329.0: the game referees with nobody's page open.
//
// A seated player's page writes travellerCampaigns/{id}/requests/{requestId}
// ({ uid, characterId, command, value, status: 'pending' }). This function
// fires once for each new request, hands it to the same engine the referee's
// page runs (app/src/remote-request.js, copied in by scripts/copy-app.mjs),
// and writes the answer back onto that request: status 'done' or 'refused'
// and a message. It never creates a request, so it cannot trigger itself.
//
// The campaign save is the referee page's own: the home at
// travellerCampaigns/{id}/state/current, written only at the next revision
// in a transaction (client/publish.js saveCampaignHome), and the envelope
// players read beside it. A referee page open at the same time sees the new
// revision and asks to reload, as it does for any other save.
// ---------------------------------------------------------------------------

import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { setGlobalOptions, logger } from 'firebase-functions/v2';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { applyRemoteRequest, StaleCampaignHomeError } from './app/src/remote-request.js';
import { MERIDIAN_REACH_SECTOR } from './app/world/meridian-reach-sector.js';

// The region must match the Firestore database's location (us-central1 for
// the nam5 multi-region). Change it here if the database lives elsewhere.
// maxInstances keeps a runaway from multiplying: requests queue instead.
setGlobalOptions({ region: 'us-central1', maxInstances: 2 });

initializeApp();
const db = getFirestore();

function campaignStore(campaignId) {
  const envelopeRef = db.collection('travellerCampaigns').doc(campaignId);
  const homeRef = envelopeRef.collection('state').doc('current');
  const playerRef = (uid) => envelopeRef.collection('players').doc(uid);
  return {
    async loadHome() {
      const snapshot = await homeRef.get();
      return snapshot.exists ? snapshot.data() : null;
    },
    async isSeated(uid) {
      const snapshot = await playerRef(uid).get();
      return snapshot.exists && Boolean(snapshot.data().seatedAt);
    },
    // client/publish.js saveCampaignHome, for a home that already exists.
    async saveHome(home, envelope, { expectedRevision }) {
      let written = home.revision;
      await db.runTransaction(async (transaction) => {
        const current = await transaction.get(homeRef);
        const currentRevision = current.exists ? (current.data().revision ?? 0) : null;
        if (currentRevision !== expectedRevision || home.revision !== (currentRevision ?? 0) + 1) {
          throw new StaleCampaignHomeError({ campaignId, expectedRevision, currentRevision, savedAt: current.data()?.savedAt ?? null });
        }
        transaction.set(homeRef, home);
        const payload = { ...envelope, homeRevision: home.revision, homeSavedAt: home.savedAt };
        transaction.set(envelopeRef, payload, { mergeFields: Object.keys(payload) });
        written = home.revision;
      });
      return written;
    },
    publishPlayerCharacter: (published) => playerRef(published.ownerUid).collection('characters').doc(published.characterId).set(published),
    publishPlayerLog: (published) => playerRef(published.uid).collection('log').doc('current').set(published),
    publishEncounterView: (view) => envelopeRef.collection('encounters').doc(view.encounterId).collection('view').doc('current').set(view)
  };
}

export const travellerRequest = onDocumentCreated({
  document: 'travellerCampaigns/{campaignId}/requests/{requestId}',
  timeoutSeconds: 60,
  memory: '512MiB',
  retry: false
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const request = snapshot.data();
  if (request.status !== 'pending') return;
  const { campaignId } = event.params;
  let result;
  try {
    const envelope = (await db.collection('travellerCampaigns').doc(campaignId).get()).data() ?? {};
    result = await applyRemoteRequest({
      campaignId, request, store: campaignStore(campaignId), sector: MERIDIAN_REACH_SECTOR, refereeName: envelope.refereeName ?? null
    });
  } catch (error) {
    logger.error('traveller request failed', { campaignId, command: request.command, error: error?.stack ?? String(error) });
    result = { ok: false, message: `The game could not carry that out: ${error?.message ?? error}`, revision: null };
  }
  await snapshot.ref.update({ status: result.ok ? 'done' : 'refused', message: result.message ?? '', revision: result.revision ?? null, doneAt: Date.now() });
});

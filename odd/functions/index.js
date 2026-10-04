// ---------------------------------------------------------------------------
// odd/functions — slice 5, step 2 (Oct 2026): the OD&D server.
//
// Two callable functions over fight-service.mjs:
//   oddCreateFight  the referee opens a fight; the server seeds the dice
//   oddAction       one action from a player or the referee
// Both return { ok, rev, ... } or { ok: false, code, error }; only a call
// with no signed-in user is thrown back as an error.
//
// The rules package is copied into app/rules by scripts/build.mjs, which
// builds the deployable folder graycloak-adnd\odd-functions ("odd" codebase).
// ---------------------------------------------------------------------------

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { randomInt } from 'node:crypto';
import * as rules from './app/rules/index.js';
import { createFightService } from './fight-service.mjs';

// Same region as the Firestore database (nam5) and the Traveller function.
setGlobalOptions({ region: 'us-central1', maxInstances: 2 });

initializeApp();
const db = getFirestore();

const store = {
  run: (fn) => db.runTransaction((t) => fn({
    get: async (path) => { const snap = await t.get(db.doc(path)); return snap.exists ? snap.data() : null; },
    set: (path, data) => { t.set(db.doc(path), data); }
  }))
};
// A player is named by the email he signs in with; the server finds his account.
const resolveUser = async (email) => {
  try { return (await getAuth().getUserByEmail(email)).uid; }
  catch (error) { if (error?.code === 'auth/user-not-found') return null; throw error; }
};
const service = createFightService({ rules, store, newSeed: () => randomInt(2 ** 31), resolveUser });

const signedIn = (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in first.');
  return request.auth.uid;
};

export const oddCreateFight = onCall({ timeoutSeconds: 60, memory: '512MiB' }, (request) => service.create({ uid: signedIn(request), data: request.data }));
export const oddAction = onCall({ timeoutSeconds: 60, memory: '512MiB' }, (request) => service.act({ uid: signedIn(request), data: request.data }));

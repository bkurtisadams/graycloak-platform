// ---------------------------------------------------------------------------
// odd/functions — slice 5, step 2 (Oct 2026): the OD&D server.
//
// Two callable functions over fight-service.mjs:
//   oddCreateFight  the referee opens a fight; the server seeds the dice
//   oddAction       one action from a player or the referee
//   oddDeleteFight  the referee deletes a fight (old test fights)
//   oddChat         a chat line or a /roll, to everyone or privately (no fid: the lobby)
//   oddCampaign     the game: open, join, profile, here, invite, live, reset, role, remove
//   oddCharacter    the roster (pass 4): roll, basics, buy, sell, finish, ready, remember, rename, notes, delete
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
import { createCampaignService } from './campaign-service.mjs';
import { createCharacterService } from './character-service.mjs';

// Same region as the Firestore database (nam5) and the Traveller function.
setGlobalOptions({ region: 'us-central1', maxInstances: 2 });

initializeApp();
const db = getFirestore();

const store = {
  run: (fn) => db.runTransaction((t) => fn({
    get: async (path) => { const snap = await t.get(db.doc(path)); return snap.exists ? snap.data() : null; },
    set: (path, data) => { t.set(db.doc(path), data); },
    list: async (path) => (await t.get(db.collection(path))).docs.map((d) => d.data())
  })),
  // A fight and everything under it (state, views, feeds, actions).
  deleteTree: (path) => db.recursiveDelete(db.doc(path))
};
// A player is named by the email he signs in with; the server finds his account.
const resolveUser = async (email) => {
  try { const u = await getAuth().getUserByEmail(email); return { uid: u.uid, name: u.displayName || u.email }; }
  catch (error) { if (error?.code === 'auth/user-not-found') return null; throw error; }
};
const service = createFightService({ rules, store, newSeed: () => randomInt(2 ** 31), resolveUser, rollDie: (n) => randomInt(1, n + 1) });

const signedIn = (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in first.');
  return request.auth.uid;
};

export const oddCreateFight = onCall({ timeoutSeconds: 60, memory: '512MiB' }, (request) => service.create({ uid: signedIn(request), name: request.auth.token.name || request.auth.token.email, data: request.data }));
export const oddDeleteFight = onCall({ timeoutSeconds: 120, memory: '512MiB' }, (request) => service.remove({ uid: signedIn(request), data: request.data }));
export const oddAction = onCall({ timeoutSeconds: 60, memory: '512MiB' }, (request) => service.act({ uid: signedIn(request), data: request.data }));
export const oddChat = onCall({ timeoutSeconds: 30, memory: '256MiB' }, (request) => service.chat({ uid: signedIn(request), data: request.data }));
const games = createCampaignService({ palette: rules.fightView.PLAYER_COLOURS, refereeColour: rules.fightView.REFEREE_COLOUR, store, newCode: () => Array.from({ length: 8 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[randomInt(32)]).join('') });
export const oddCampaign = onCall({ timeoutSeconds: 30, memory: '256MiB' }, (request) => games.handle({ uid: signedIn(request), email: request.auth.token.email, name: request.auth.token.name || request.auth.token.email, data: request.data }));
const roster = createCharacterService({ rules, store, rollDie: (n) => randomInt(1, n + 1), newId: () => `ch${Date.now().toString(36)}${randomInt(36 ** 4).toString(36)}` });
export const oddCharacter = onCall({ timeoutSeconds: 30, memory: '256MiB' }, (request) => roster.handle({ uid: signedIn(request), data: request.data }));

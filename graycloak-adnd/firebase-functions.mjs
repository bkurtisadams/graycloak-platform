// firebase-functions.mjs v1.4.0 — 2026-08-30
// Deployable Firebase Functions entry point for Graycloak authoritative commands.

import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';

import { ownerOf, SCALES } from './public/vendor/map-engine/index.js';
import { createFirebaseBeginTravelHandler } from './runtime/firebase-deployment.mjs';

const app = getApps()[0] || initializeApp();
const db = getFirestore(app);
const auth = getAuth(app);

const beginTravelHandler = createFirebaseBeginTravelHandler({
  db,
  auth,
  ownerOf,
  routeMilesPerStep: SCALES.subhex.milesAcross,
  logger,
});

// Infrastructure access must be public so Firebase Hosting can invoke the
// function. Graycloak application authentication still requires a verified
// Firebase ID token inside beginTravelHandler.
export const beginTravel = onRequest({
  region: 'us-central1',
  invoker: 'public',
  cors: false,
  timeoutSeconds: 30,
  memory: '256MiB',
  maxInstances: 10,
}, beginTravelHandler);

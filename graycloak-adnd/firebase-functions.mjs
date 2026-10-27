// firebase-functions.mjs v1.7.0 — 2026-10-26
// Deployable Firebase Functions entry point for Graycloak authoritative commands.
// v1.5.0 adds resolveTravel beside beginTravel, sharing one command service.
// v1.6.0 adds rest.
// v1.7.0 adds enterWorld, with the OSRIC kernel supplying racial movement.

import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';

import { ownerOf, SCALES } from './public/vendor/map-engine/index.js';
import * as osricRules from './public/vendor/osric3-rules/index.js';
import {
  createFirebaseBeginTravelHandler,
  createFirebaseCommandService,
  createFirebaseResolveTravelHandler,
  createFirebaseRestHandler,
  createFirebaseEnterWorldHandler,
} from './runtime/firebase-deployment.mjs';

const app = getApps()[0] || initializeApp();
const db = getFirestore(app);
const auth = getAuth(app);

const commandService = createFirebaseCommandService({
  db,
  ownerOf,
  routeMilesPerStep: SCALES.subhex.milesAcross,
  rules: osricRules,
});

const beginTravelHandler = createFirebaseBeginTravelHandler({
  db,
  auth,
  ownerOf,
  routeMilesPerStep: SCALES.subhex.milesAcross,
  commandService,
  logger,
});

const resolveTravelHandler = createFirebaseResolveTravelHandler({
  db,
  auth,
  commandService,
  logger,
});

const restHandler = createFirebaseRestHandler({
  db,
  auth,
  commandService,
  logger,
});

const enterWorldHandler = createFirebaseEnterWorldHandler({
  db,
  auth,
  commandService,
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

export const resolveTravel = onRequest({
  region: 'us-central1',
  invoker: 'public',
  cors: false,
  timeoutSeconds: 30,
  memory: '256MiB',
  maxInstances: 10,
}, resolveTravelHandler);

export const rest = onRequest({
  region: 'us-central1',
  invoker: 'public',
  cors: false,
  timeoutSeconds: 30,
  memory: '256MiB',
  maxInstances: 10,
}, restHandler);

export const enterWorld = onRequest({
  region: 'us-central1',
  invoker: 'public',
  cors: false,
  timeoutSeconds: 30,
  memory: '256MiB',
  maxInstances: 10,
}, enterWorldHandler);

// firebase-deployment.mjs v1.4.0 — 2026-08-30
// Firebase-specific composition for Graycloak's trusted Begin Travel stack.
//
// This module contains no Firebase SDK imports. The deploy wrapper injects the
// Admin Firestore/Auth instances and the canonical map geometry, which keeps
// the composition testable without cloud dependencies.

import { createCommandService } from './command-service.mjs';
import { createBeginTravelHttpHandler } from './http-command-endpoint.mjs';

export const FIREBASE_DEPLOYMENT_VERSION = 1;

export function createFirebaseBeginTravelHandler(options = {}) {
  const db = options.db;
  const auth = options.auth;
  const ownerOf = options.ownerOf;
  const routeMilesPerStep = options.routeMilesPerStep;

  if (!auth || typeof auth.verifyIdToken !== 'function') {
    throw new TypeError('Firebase Auth instance with verifyIdToken() is required');
  }

  const commandService = options.commandService || createCommandService({
    db,
    ownerOf,
    routeMilesPerStep,
    collections: options.collections,
    authorizeActor: options.authorizeActor,
    movementProfileResolver: options.movementProfileResolver,
    terrainClasses: options.terrainClasses,
    rulesVersion: options.rulesVersion,
    activityName: options.activityName,
    defaultRegionId: options.defaultRegionId,
    regionId: options.regionId,
    now: options.now,
  });

  return createBeginTravelHttpHandler({
    commandService,
    maxBodyBytes: options.maxBodyBytes,
    logger: options.logger,
    verifyIdToken: token => auth.verifyIdToken(token, true),
  });
}

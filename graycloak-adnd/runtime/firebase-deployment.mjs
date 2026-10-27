// firebase-deployment.mjs v1.6.0 — 2026-10-26
// Firebase-specific composition for Graycloak's trusted command stack
// (Begin Travel, Resolve Travel from v1.5.0, Rest from v1.6.0).
//
// This module contains no Firebase SDK imports. The deploy wrapper injects the
// Admin Firestore/Auth instances and the canonical map geometry, which keeps
// the composition testable without cloud dependencies.

import { createCommandService } from './command-service.mjs';
import {
  createBeginTravelHttpHandler,
  createResolveTravelHttpHandler,
  createRestHttpHandler,
} from './http-command-endpoint.mjs';

export const FIREBASE_DEPLOYMENT_VERSION = 1;

export function createFirebaseCommandService(options = {}) {
  return options.commandService || createCommandService({
    db: options.db,
    ownerOf: options.ownerOf,
    routeMilesPerStep: options.routeMilesPerStep,
    collections: options.collections,
    authorizeActor: options.authorizeActor,
    movementProfileResolver: options.movementProfileResolver,
    terrainClasses: options.terrainClasses,
    rulesVersion: options.rulesVersion,
    activityName: options.activityName,
    defaultRegionId: options.defaultRegionId,
    regionId: options.regionId,
    advanceClockOnResolve: options.advanceClockOnResolve,
    restHealPerDay: options.restHealPerDay,
    now: options.now,
  });
}

export function createFirebaseRestHandler(options = {}) {
  const auth = options.auth;
  if (!auth || typeof auth.verifyIdToken !== 'function') {
    throw new TypeError('Firebase Auth instance with verifyIdToken() is required');
  }
  return createRestHttpHandler({
    commandService: createFirebaseCommandService(options),
    maxBodyBytes: options.maxBodyBytes,
    logger: options.logger,
    verifyIdToken: token => auth.verifyIdToken(token, true),
  });
}

export function createFirebaseResolveTravelHandler(options = {}) {
  const auth = options.auth;
  if (!auth || typeof auth.verifyIdToken !== 'function') {
    throw new TypeError('Firebase Auth instance with verifyIdToken() is required');
  }
  return createResolveTravelHttpHandler({
    commandService: createFirebaseCommandService(options),
    maxBodyBytes: options.maxBodyBytes,
    logger: options.logger,
    verifyIdToken: token => auth.verifyIdToken(token, true),
  });
}

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

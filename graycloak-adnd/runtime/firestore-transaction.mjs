// firestore-transaction.mjs v1.1.0 — 2026-08-30
// Trusted-runtime Firestore adapter for Graycloak semantic commit bundles.
//
// This module is intentionally NOT loaded by public/index.html. It belongs on
// the authoritative side of the command boundary. It accepts a v1 semantic
// commit bundle, verifies the bundle's Firestore-backed preconditions inside a
// transaction, and applies Activity + Actor runtime + GameEvent writes atomically.

export const FIRESTORE_TRANSACTION_VERSION = 1;

export const DEFAULT_COLLECTIONS = Object.freeze({
  campaigns: 'campaigns',
  actors: 'characters',
  activities: 'activities',
  events: 'events',
});

export const TRANSACTION_STATUS = Object.freeze({
  COMMITTED: 'committed',
  ALREADY_COMMITTED: 'already-committed',
});

export const TRANSACTION_ERROR = Object.freeze({
  INVALID_FIRESTORE: 'invalid-firestore',
  INVALID_BUNDLE: 'invalid-bundle',
  INVALID_COLLECTIONS: 'invalid-collections',
  CAMPAIGN_NOT_FOUND: 'campaign-not-found',
  STALE_WORLD_TICK: 'stale-world-tick',
  ACTOR_NOT_FOUND: 'actor-not-found',
  ACTOR_PRECONDITION_FAILED: 'actor-precondition-failed',
  ACTIVITY_ALREADY_EXISTS: 'activity-already-exists',
  IDEMPOTENCY_CONFLICT: 'idempotency-conflict',
  TRANSACTION_FAILED: 'transaction-failed',
});

function cleanId(value) {
  if (value == null || value === '') return null;
  return String(value);
}

function isPlainObject(value) {
  if (value == null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function clonePlain(value) {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(clonePlain);
  if (!isPlainObject(value)) return value;
  const out = {};
  for (const [key, child] of Object.entries(value)) out[key] = clonePlain(child);
  return out;
}

function sameData(a, b) {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!sameData(a[i], b[i])) return false;
    }
    return true;
  }
  if (isPlainObject(a) || isPlainObject(b)) {
    if (!isPlainObject(a) || !isPlainObject(b)) return false;
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    if (aKeys.length !== bKeys.length) return false;
    for (let i = 0; i < aKeys.length; i++) {
      if (aKeys[i] !== bKeys[i] || !sameData(a[aKeys[i]], b[bKeys[i]])) return false;
    }
    return true;
  }
  // Preconditions currently contain only JSON-like campaign/Actor state. Do
  // not invent equality semantics for Firestore Timestamp/FieldValue objects.
  return false;
}

function normalizeRuntime(value) {
  value = value && typeof value === 'object' ? value : {};
  return {
    lastResolvedTick: Number.isSafeInteger(value.lastResolvedTick) && value.lastResolvedTick >= 0
      ? value.lastResolvedTick : null,
    availableAtTick: Number.isSafeInteger(value.availableAtTick) && value.availableAtTick >= 0
      ? value.availableAtTick : null,
    activityId: cleanId(value.activityId),
  };
}

function normalizeCollections(input) {
  const collections = Object.assign({}, DEFAULT_COLLECTIONS, input || {});
  for (const key of Object.keys(DEFAULT_COLLECTIONS)) {
    if (typeof collections[key] !== 'string' || !collections[key].trim()) return null;
    collections[key] = collections[key].trim();
  }
  return collections;
}

function snapshotExists(snapshot) {
  if (!snapshot) return false;
  if (typeof snapshot.exists === 'boolean') return snapshot.exists;
  if (typeof snapshot.exists === 'function') return !!snapshot.exists();
  return false;
}

function snapshotData(snapshot) {
  if (!snapshotExists(snapshot) || typeof snapshot.data !== 'function') return null;
  return snapshot.data();
}

function refFor(db, collectionName, id) {
  return db.collection(collectionName).doc(id);
}

function bundleActorMaps(bundle) {
  const preconditions = new Map();
  const patches = new Map();

  for (const precondition of bundle.preconditions.actors) {
    const actorId = cleanId(precondition && precondition.actorId);
    if (!actorId || preconditions.has(actorId)) return null;
    preconditions.set(actorId, precondition);
  }

  for (const patch of bundle.patchActors) {
    const actorId = cleanId(patch && patch.actorId);
    if (!actorId || patches.has(actorId) || !patch.runtime || typeof patch.runtime !== 'object') {
      return null;
    }
    patches.set(actorId, patch);
  }

  if (preconditions.size !== patches.size) return null;
  for (const actorId of preconditions.keys()) {
    if (!patches.has(actorId)) return null;
  }
  return { preconditions, patches };
}

export function validateCommitBundle(bundle) {
  if (!bundle || typeof bundle !== 'object' || bundle.version !== 1) {
    return { ok: false, code: TRANSACTION_ERROR.INVALID_BUNDLE };
  }

  const commandId = cleanId(bundle.commandId);
  const campaignId = cleanId(bundle.campaignId);
  const activityId = cleanId(bundle.createActivity && bundle.createActivity.id);
  const eventId = cleanId(bundle.createEvent && bundle.createEvent.id);
  if (!commandId || !campaignId || !activityId || !eventId || eventId !== commandId) {
    return { ok: false, code: TRANSACTION_ERROR.INVALID_BUNDLE };
  }

  const preconditions = bundle.preconditions;
  if (!preconditions || typeof preconditions !== 'object' ||
      !preconditions.campaign || !Array.isArray(preconditions.actors)) {
    return { ok: false, code: TRANSACTION_ERROR.INVALID_BUNDLE };
  }

  if (cleanId(preconditions.campaign.campaignId) !== campaignId ||
      preconditions.campaign.worldTick !== bundle.expectedWorldTick ||
      !Number.isSafeInteger(bundle.expectedWorldTick) || bundle.expectedWorldTick < 0 ||
      cleanId(preconditions.commandEventMustNotExist) !== commandId ||
      cleanId(preconditions.activityMustNotExist) !== activityId ||
      cleanId(bundle.createActivity.campaignId) !== campaignId ||
      cleanId(bundle.createEvent.campaignId) !== campaignId ||
      cleanId(bundle.createEvent.commandId) !== commandId ||
      cleanId(bundle.createEvent.data && bundle.createEvent.data.activityId) !== activityId) {
    return { ok: false, code: TRANSACTION_ERROR.INVALID_BUNDLE };
  }

  const actorMaps = bundleActorMaps(bundle);
  if (!actorMaps || actorMaps.preconditions.size === 0) {
    return { ok: false, code: TRANSACTION_ERROR.INVALID_BUNDLE };
  }

  return {
    ok: true,
    commandId,
    campaignId,
    activityId,
    eventId,
    actorMaps,
  };
}

function idempotencyMatch(existingEvent, validated) {
  if (!existingEvent || typeof existingEvent !== 'object') return false;
  return cleanId(existingEvent.commandId) === validated.commandId &&
    cleanId(existingEvent.campaignId) === validated.campaignId &&
    cleanId(existingEvent.data && existingEvent.data.activityId) === validated.activityId;
}

function actorPreconditionFailure(actual, expected) {
  if (cleanId(actual && actual.campaignId) !== cleanId(expected && expected.campaignId)) {
    return 'campaignId';
  }
  if (!sameData(clonePlain(actual && actual.currentLocation), clonePlain(expected && expected.currentLocation))) {
    return 'currentLocation';
  }
  if (!sameData(normalizeRuntime(actual && actual.runtime), normalizeRuntime(expected && expected.runtime))) {
    return 'runtime';
  }
  return null;
}

function resultError(code, details = {}) {
  return Object.assign({ ok: false, code }, details);
}

export async function applyCommitBundle(db, bundle, options = {}) {
  if (!db || typeof db.collection !== 'function' || typeof db.runTransaction !== 'function') {
    return resultError(TRANSACTION_ERROR.INVALID_FIRESTORE);
  }

  const validated = validateCommitBundle(bundle);
  if (!validated.ok) return validated;

  const collections = normalizeCollections(options.collections);
  if (!collections) return resultError(TRANSACTION_ERROR.INVALID_COLLECTIONS);

  const campaignRef = refFor(db, collections.campaigns, validated.campaignId);
  const activityRef = refFor(db, collections.activities, validated.activityId);
  const eventRef = refFor(db, collections.events, validated.eventId);
  const actorRefs = new Map();
  for (const actorId of validated.actorMaps.preconditions.keys()) {
    actorRefs.set(actorId, refFor(db, collections.actors, actorId));
  }

  try {
    return await db.runTransaction(async transaction => {
      // Read the idempotency marker first. A successful historical command must
      // remain replay-safe even after its Activity later completes and Actors
      // move on to other state.
      const eventSnapshot = await transaction.get(eventRef);
      if (snapshotExists(eventSnapshot)) {
        const existingEvent = snapshotData(eventSnapshot);
        if (idempotencyMatch(existingEvent, validated)) {
          return {
            ok: true,
            status: TRANSACTION_STATUS.ALREADY_COMMITTED,
            idempotentReplay: true,
            commandId: validated.commandId,
            activityId: validated.activityId,
          };
        }
        return resultError(TRANSACTION_ERROR.IDEMPOTENCY_CONFLICT, {
          commandId: validated.commandId,
        });
      }

      // All remaining reads happen before any write. Firestore will retry the
      // transaction if any read document changes before commit.
      const activitySnapshot = await transaction.get(activityRef);
      if (snapshotExists(activitySnapshot)) {
        return resultError(TRANSACTION_ERROR.ACTIVITY_ALREADY_EXISTS, {
          activityId: validated.activityId,
        });
      }

      const campaignSnapshot = await transaction.get(campaignRef);
      if (!snapshotExists(campaignSnapshot)) {
        return resultError(TRANSACTION_ERROR.CAMPAIGN_NOT_FOUND, {
          campaignId: validated.campaignId,
        });
      }
      const campaign = snapshotData(campaignSnapshot) || {};
      if (campaign.worldTick !== bundle.expectedWorldTick) {
        return resultError(TRANSACTION_ERROR.STALE_WORLD_TICK, {
          expectedWorldTick: bundle.expectedWorldTick,
          authoritativeWorldTick: campaign.worldTick,
        });
      }

      const actorSnapshots = new Map();
      for (const [actorId, actorRef] of actorRefs.entries()) {
        const snapshot = await transaction.get(actorRef);
        if (!snapshotExists(snapshot)) {
          return resultError(TRANSACTION_ERROR.ACTOR_NOT_FOUND, { actorId });
        }
        actorSnapshots.set(actorId, snapshot);
      }

      for (const [actorId, expected] of validated.actorMaps.preconditions.entries()) {
        const actual = snapshotData(actorSnapshots.get(actorId)) || {};
        const field = actorPreconditionFailure(actual, expected);
        if (field) {
          return resultError(TRANSACTION_ERROR.ACTOR_PRECONDITION_FAILED, {
            actorId,
            field,
          });
        }
      }

      transaction.set(activityRef, bundle.createActivity);
      for (const [actorId, patch] of validated.actorMaps.patches.entries()) {
        transaction.update(actorRefs.get(actorId), {
          runtime: clonePlain(patch.runtime),
        });
      }
      transaction.set(eventRef, bundle.createEvent);

      return {
        ok: true,
        status: TRANSACTION_STATUS.COMMITTED,
        idempotentReplay: false,
        commandId: validated.commandId,
        activityId: validated.activityId,
        actorIds: Array.from(validated.actorMaps.patches.keys()),
      };
    });
  } catch (error) {
    return resultError(TRANSACTION_ERROR.TRANSACTION_FAILED, {
      message: error && error.message ? String(error.message) : String(error),
    });
  }
}

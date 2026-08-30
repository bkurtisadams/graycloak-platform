// command-service.mjs v1.2.0 — 2026-08-30
// Trusted command-service shell for Graycloak Begin Travel.
//
// Responsibilities:
//   1. normalize the client intent through the authoritative command runtime;
//   2. authenticate/authorize the requesting principal;
//   3. load fresh campaign, Actor, and route terrain state from Firestore;
//   4. resolve trusted movement policy;
//   5. execute the pure Begin Travel command;
//   6. atomically apply its commit bundle through the v1.1 adapter.
//
// This is deliberately transport agnostic. An HTTP/Cloud Run/Functions layer can
// call handleBeginTravel() without putting rule or Firestore authority in the browser.

import {
  DEFAULT_COLLECTIONS as DEFAULT_TRANSACTION_COLLECTIONS,
  TRANSACTION_STATUS,
  applyCommitBundle,
} from './firestore-transaction.mjs';
import { loadCommandRuntime } from './command-runtime.mjs';

export const COMMAND_SERVICE_VERSION = 1;

export const DEFAULT_SERVICE_COLLECTIONS = Object.freeze({
  ...DEFAULT_TRANSACTION_COLLECTIONS,
  regions: 'regions',
  subhexes: 'subHexes',
});

export const SERVICE_ERROR = Object.freeze({
  INVALID_FIRESTORE: 'invalid-firestore',
  INVALID_COMMAND_RUNTIME: 'invalid-command-runtime',
  INVALID_MAP_GEOMETRY: 'invalid-map-geometry',
  INVALID_COLLECTIONS: 'invalid-collections',
  UNAUTHENTICATED: 'unauthenticated',
  ACTOR_FORBIDDEN: 'actor-forbidden',
  CAMPAIGN_NOT_FOUND: 'campaign-not-found',
  ACTOR_NOT_FOUND: 'actor-not-found',
  REGION_NOT_FOUND: 'region-not-found',
  MOVEMENT_RESOLUTION_FAILED: 'movement-resolution-failed',
  IDEMPOTENCY_CONFLICT: 'idempotency-conflict',
  READ_FAILED: 'read-failed',
  SERVICE_FAILED: 'service-failed',
});

function cleanId(value) {
  if (value == null || value === '') return null;
  return String(value);
}

function normalizeCollections(input) {
  const collections = Object.assign({}, DEFAULT_SERVICE_COLLECTIONS, input || {});
  for (const key of Object.keys(DEFAULT_SERVICE_COLLECTIONS)) {
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

function sameIds(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  const aa = a.map(String).sort();
  const bb = b.map(String).sort();
  return aa.every((id, index) => id === bb[index]);
}

function normalizePrincipal(principal) {
  const uid = cleanId(principal && principal.uid);
  if (!uid) return null;
  return Object.assign({}, principal, { uid });
}

function defaultAuthorizeActor(actor, principal) {
  return !!(actor && principal && cleanId(actor.ownerUid) && cleanId(actor.ownerUid) === principal.uid);
}

function validCommandRuntime(runtime) {
  return !!(runtime && runtime.Commands &&
    typeof runtime.Commands.normalizeBeginTravelCommand === 'function' &&
    typeof runtime.Commands.executeBeginTravelCommand === 'function');
}

function validMapGeometry(ownerOf, routeMilesPerStep) {
  return typeof ownerOf === 'function' && Number.isFinite(routeMilesPerStep) && routeMilesPerStep > 0;
}

function transactionCollections(collections) {
  return {
    campaigns: collections.campaigns,
    actors: collections.actors,
    activities: collections.activities,
    events: collections.events,
  };
}

function resultError(code, details = {}) {
  return Object.assign({ ok: false, code }, details);
}

async function readDoc(ref) {
  if (!ref || typeof ref.get !== 'function') throw new Error('Firestore document reference does not support get()');
  return ref.get();
}

function routeSubhexId(cell) {
  return `subhex_${cell.Q}_${cell.R}`;
}

function resolveRegionId(campaign, options) {
  return cleanId(options.regionId ||
    (campaign && (campaign.worldRegionId || campaign.regionId)) ||
    options.defaultRegionId || 'flanaess');
}

async function resolveRulesVersion(option, context) {
  if (typeof option === 'function') return option(context);
  return option == null ? null : String(option);
}

async function buildMovementProfiles(actors, resolver, context) {
  if (typeof resolver !== 'function') return {};
  const profiles = {};
  try {
    for (const actor of actors) {
      const profile = await resolver(actor, context);
      if (profile != null) profiles[actor.id] = profile;
    }
    return profiles;
  } catch (error) {
    throw Object.assign(new Error(error && error.message ? error.message : String(error)), {
      serviceCode: SERVICE_ERROR.MOVEMENT_RESOLUTION_FAILED,
    });
  }
}

function serviceIdempotencyMatch(existingEvent, command) {
  return !!(existingEvent &&
    cleanId(existingEvent.commandId) === command.commandId &&
    cleanId(existingEvent.campaignId) === command.campaignId &&
    cleanId(existingEvent.data && existingEvent.data.activityId) === command.activityId &&
    sameIds(existingEvent.targetIds || (existingEvent.data && existingEvent.data.actorIds), command.actorIds));
}

function annotateCommitBundle(execution, principal) {
  const bundle = execution.commitBundle;
  const event = bundle && bundle.createEvent;
  if (!event || !principal) return execution;
  event.data = Object.assign({}, event.data || {}, {
    requestedByUid: principal.uid,
    commandServiceVersion: COMMAND_SERVICE_VERSION,
  });
  if (execution.event === event) return execution;
  execution.event = event;
  return execution;
}

export function createCommandService(options = {}) {
  const db = options.db;
  const collections = normalizeCollections(options.collections);
  const commandRuntime = options.commandRuntime || loadCommandRuntime();
  const ownerOf = options.ownerOf;
  const routeMilesPerStep = options.routeMilesPerStep;
  const authorizeActor = typeof options.authorizeActor === 'function'
    ? options.authorizeActor
    : defaultAuthorizeActor;
  const movementProfileResolver = options.movementProfileResolver;
  const now = typeof options.now === 'function' ? options.now : () => new Date();
  const commitBundle = typeof options.applyCommitBundle === 'function'
    ? options.applyCommitBundle
    : applyCommitBundle;

  const configurationError = !db || typeof db.collection !== 'function' || typeof db.runTransaction !== 'function'
    ? SERVICE_ERROR.INVALID_FIRESTORE
    : !collections
      ? SERVICE_ERROR.INVALID_COLLECTIONS
      : !validCommandRuntime(commandRuntime)
        ? SERVICE_ERROR.INVALID_COMMAND_RUNTIME
        : !validMapGeometry(ownerOf, routeMilesPerStep)
          ? SERVICE_ERROR.INVALID_MAP_GEOMETRY
          : null;

  async function handleBeginTravel(rawIntent, request = {}) {
    if (configurationError) return resultError(configurationError);
    const principal = normalizePrincipal(request.principal || request.auth);
    if (!principal) return resultError(SERVICE_ERROR.UNAUTHENTICATED);

    const normalized = commandRuntime.Commands.normalizeBeginTravelCommand(rawIntent);
    if (!normalized.ok) return Object.assign({ stage: 'normalize' }, normalized);
    const command = normalized.command;

    try {
      const campaignRef = db.collection(collections.campaigns).doc(command.campaignId);
      const eventRef = db.collection(collections.events).doc(command.commandId);
      const [campaignSnapshot, eventSnapshot] = await Promise.all([
        readDoc(campaignRef),
        readDoc(eventRef),
      ]);
      if (!snapshotExists(campaignSnapshot)) {
        return resultError(SERVICE_ERROR.CAMPAIGN_NOT_FOUND, { campaignId: command.campaignId });
      }
      const campaign = snapshotData(campaignSnapshot) || {};

      // Actor reads/auth happen even on retries so an event id cannot be used as
      // an information oracle by a user who is not allowed to act for the party.
      const actors = [];
      for (const actorId of command.actorIds) {
        const actorRef = db.collection(collections.actors).doc(actorId);
        const actorSnapshot = await readDoc(actorRef);
        if (!snapshotExists(actorSnapshot)) {
          return resultError(SERVICE_ERROR.ACTOR_NOT_FOUND, { actorId });
        }
        const actor = Object.assign({}, snapshotData(actorSnapshot) || {}, { id: actorId });
        const allowed = await authorizeActor(actor, principal, { command, campaign, db, request });
        if (!allowed) return resultError(SERVICE_ERROR.ACTOR_FORBIDDEN, { actorId });
        actors.push(actor);
      }

      // End-to-end idempotency: after a successful Begin Travel, the Actors are
      // reserved and a fresh re-execution would correctly reject them. Therefore
      // detect a prior matching event before rebuilding the command outcome.
      if (snapshotExists(eventSnapshot)) {
        const existingEvent = snapshotData(eventSnapshot) || {};
        if (serviceIdempotencyMatch(existingEvent, command)) {
          return {
            ok: true,
            status: TRANSACTION_STATUS.ALREADY_COMMITTED,
            idempotentReplay: true,
            commandId: command.commandId,
            activityId: command.activityId,
            actorIds: command.actorIds.slice(),
          };
        }
        return resultError(SERVICE_ERROR.IDEMPOTENCY_CONFLICT, { commandId: command.commandId });
      }

      const regionId = resolveRegionId(campaign, options);
      const regionRef = db.collection(collections.regions).doc(regionId);
      const regionSnapshot = await readDoc(regionRef);
      if (!snapshotExists(regionSnapshot)) {
        return resultError(SERVICE_ERROR.REGION_NOT_FOUND, { regionId });
      }
      const region = snapshotData(regionSnapshot) || {};
      const parentTerrain = region.hexes && typeof region.hexes === 'object' ? region.hexes : {};

      const subhexes = {};
      const seenSubhexIds = new Set();
      for (const cell of command.routeCells) {
        const subhexId = routeSubhexId(cell);
        if (seenSubhexIds.has(subhexId)) continue;
        seenSubhexIds.add(subhexId);
        const snapshot = await readDoc(db.collection(collections.subhexes).doc(subhexId));
        if (snapshotExists(snapshot)) subhexes[subhexId] = snapshotData(snapshot) || {};
      }

      const timestamp = now();
      const movementProfiles = await buildMovementProfiles(actors, movementProfileResolver, {
        command,
        campaign,
        principal,
        db,
        request,
      });
      const rulesVersion = await resolveRulesVersion(options.rulesVersion, {
        command,
        campaign,
        actors,
        principal,
      });

      const execution = commandRuntime.Commands.executeBeginTravelCommand(command, {
        campaignId: command.campaignId,
        campaign,
        actors,
        authoritativeMovementProfiles: movementProfiles,
        routeMilesPerStep,
        subhexes,
        parentTerrain,
        ownerOf,
        terrainClasses: options.terrainClasses,
        rulesVersion,
        activityName: options.activityName || 'Travel',
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      if (!execution.ok) return Object.assign({ stage: 'execute' }, execution);
      annotateCommitBundle(execution, principal);

      const committed = await commitBundle(db, execution.commitBundle, {
        collections: transactionCollections(collections),
      });
      if (!committed.ok) return Object.assign({ stage: 'commit' }, committed);

      return {
        ok: true,
        status: committed.status,
        idempotentReplay: !!committed.idempotentReplay,
        commandId: command.commandId,
        activityId: command.activityId,
        actorIds: command.actorIds.slice(),
        availableAtTick: execution.activity.availableAtTick,
        durationTicks: execution.activity.system && execution.activity.system.durationTicks,
        eventId: execution.event && execution.event.id,
      };
    } catch (error) {
      return resultError(error && error.serviceCode ? error.serviceCode : SERVICE_ERROR.READ_FAILED, {
        message: error && error.message ? String(error.message) : String(error),
      });
    }
  }

  return Object.freeze({
    version: COMMAND_SERVICE_VERSION,
    handleBeginTravel,
  });
}

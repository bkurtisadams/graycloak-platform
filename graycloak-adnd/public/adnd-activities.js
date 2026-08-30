// adnd-activities.js v0.4.0 — 2026-08-30
// Pure Activity/travel planning primitives for Graycloak's shared world clock.
//
// This module does not write Firestore, move Actors, advance campaign time,
// roll encounters, or resolve completed Activities. It only validates a
// time-spanning travel request and returns the Activity document plus Actor
// runtime patches an authoritative command could later commit transactionally.
const ADNDActivities = (function(){
  'use strict';

  const ACTIVITY_VERSION = 1;
  const ACTIVITY_TYPES = Object.freeze({
    TRAVEL: 'travel',
  });
  const ACTIVITY_STATUS = Object.freeze({
    PENDING: 'pending',
    ACTIVE: 'active',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  });
  const TRAVEL_ERROR = Object.freeze({
    INVALID_REQUEST: 'invalid-request',
    INVALID_ACTIVITY_ID: 'invalid-activity-id',
    INVALID_CAMPAIGN_ID: 'invalid-campaign-id',
    CAMPAIGN_MISMATCH: 'campaign-mismatch',
    INVALID_WORLD_TICK: 'invalid-world-tick',
    INVALID_DURATION: 'invalid-duration',
    INVALID_LOCATION: 'invalid-location',
    NO_ACTORS: 'no-actors',
    INVALID_ACTOR_ID: 'invalid-actor-id',
    DUPLICATE_ACTOR: 'duplicate-actor',
    ACTOR_NOT_AVAILABLE: 'actor-not-available',
    TICK_OVERFLOW: 'tick-overflow',
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

  function cleanLocationRef(value) {
    if (typeof value === 'string') {
      const id = cleanId(value);
      return id ? { id } : null;
    }
    if (!isPlainObject(value)) return null;
    if (Object.keys(value).length === 0) return null;
    return clonePlain(value);
  }

  function activityCompletionTick(activity) {
    return ADNDWorldClock.normalizeTick(activity && activity.availableAtTick);
  }

  function isTravelActivity(activity) {
    return !!activity &&
      activity.documentType === ADNDDocuments.DOCUMENT_TYPES.ACTIVITY &&
      activity.type === ACTIVITY_TYPES.TRAVEL;
  }

  function isActivityDue(activity, worldTick) {
    const now = ADNDWorldClock.normalizeTick(worldTick);
    const completionTick = activityCompletionTick(activity);
    if (now === null || completionTick === null) return false;
    if (!activity || activity.status !== ACTIVITY_STATUS.ACTIVE) return false;
    return completionTick <= now;
  }

  function validateActorSet(actors, worldTick, campaignId) {
    if (!Array.isArray(actors) || actors.length === 0) {
      return { ok: false, code: TRAVEL_ERROR.NO_ACTORS, actorStatuses: [] };
    }

    const seen = new Set();
    const actorStatuses = [];
    for (const actor of actors) {
      const actorId = cleanId(actor && actor.id);
      if (!actorId) {
        return { ok: false, code: TRAVEL_ERROR.INVALID_ACTOR_ID, actorStatuses };
      }
      if (seen.has(actorId)) {
        return {
          ok: false,
          code: TRAVEL_ERROR.DUPLICATE_ACTOR,
          actorId,
          actorStatuses,
        };
      }
      seen.add(actorId);

      if (cleanId(actor && actor.campaignId) !== campaignId) {
        return {
          ok: false,
          code: TRAVEL_ERROR.CAMPAIGN_MISMATCH,
          actorId,
          actorStatuses,
        };
      }

      const time = ADNDWorldClock.getActorTimeStatus(actor, worldTick);
      actorStatuses.push({ actorId, status: time.status, time });
    }

    const unavailable = actorStatuses.filter(entry =>
      entry.status !== ADNDWorldClock.ACTOR_TIME_STATUS.CURRENT
    );
    if (unavailable.length > 0) {
      return {
        ok: false,
        code: TRAVEL_ERROR.ACTOR_NOT_AVAILABLE,
        actorStatuses,
        unavailableActorIds: unavailable.map(entry => entry.actorId),
      };
    }

    return { ok: true, actorStatuses };
  }

  function validateTravelRequest(input) {
    input = input || {};
    const activityId = cleanId(input.id || input.activityId);
    if (!activityId) return { ok: false, code: TRAVEL_ERROR.INVALID_ACTIVITY_ID };

    const campaignId = cleanId(input.campaignId);
    if (!campaignId) return { ok: false, code: TRAVEL_ERROR.INVALID_CAMPAIGN_ID };

    const worldTick = ADNDWorldClock.normalizeTick(input.worldTick);
    if (worldTick === null) return { ok: false, code: TRAVEL_ERROR.INVALID_WORLD_TICK };

    const durationTicks = ADNDWorldClock.normalizeTick(input.durationTicks);
    if (durationTicks === null || durationTicks <= 0) {
      return { ok: false, code: TRAVEL_ERROR.INVALID_DURATION };
    }

    const origin = cleanLocationRef(input.origin);
    const destination = cleanLocationRef(input.destination);
    if (!origin || !destination) {
      return { ok: false, code: TRAVEL_ERROR.INVALID_LOCATION };
    }

    const availableAtTick = ADNDWorldClock.addTicks(worldTick, durationTicks);
    if (availableAtTick === null) {
      return { ok: false, code: TRAVEL_ERROR.TICK_OVERFLOW };
    }

    const actorValidation = validateActorSet(input.actors, worldTick, campaignId);
    if (!actorValidation.ok) {
      return Object.assign({}, actorValidation, {
        worldTick,
        durationTicks,
        availableAtTick,
      });
    }

    return {
      ok: true,
      activityId,
      campaignId,
      worldTick,
      durationTicks,
      availableAtTick,
      origin,
      destination,
      actors: input.actors.slice(),
      actorStatuses: actorValidation.actorStatuses,
    };
  }

  function createTravelPlan(input) {
    const validation = validateTravelRequest(input);
    if (!validation.ok) return validation;

    const actorIds = validation.actors.map(actor => String(actor.id));
    const system = Object.assign({}, clonePlain(input.system || {}), {
      durationTicks: validation.durationTicks,
      origin: validation.origin,
      destination: validation.destination,
    });

    const activity = ADNDDocuments.createActivity({
      id: validation.activityId,
      type: ACTIVITY_TYPES.TRAVEL,
      campaignId: validation.campaignId,
      name: input.name || 'Travel',
      createdAt: input.createdAt == null ? null : input.createdAt,
      updatedAt: input.updatedAt == null ? null : input.updatedAt,
      actorIds,
      startedAtTick: validation.worldTick,
      availableAtTick: validation.availableAtTick,
      status: ACTIVITY_STATUS.ACTIVE,
      system,
    });

    const actorRuntimePatches = actorIds.map(actorId => ({
      actorId,
      runtime: {
        lastResolvedTick: validation.worldTick,
        availableAtTick: validation.availableAtTick,
        activityId: validation.activityId,
      },
    }));

    return {
      ok: true,
      activity,
      actorRuntimePatches,
      actorStatuses: validation.actorStatuses,
    };
  }

  return {
    ACTIVITY_VERSION,
    ACTIVITY_TYPES,
    ACTIVITY_STATUS,
    TRAVEL_ERROR,
    cleanLocationRef,
    activityCompletionTick,
    isTravelActivity,
    isActivityDue,
    validateActorSet,
    validateTravelRequest,
    createTravelPlan,
  };
})();

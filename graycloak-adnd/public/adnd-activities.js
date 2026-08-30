// adnd-activities.js v0.6.0 — 2026-08-30
// Pure Activity/travel planning primitives for Graycloak's shared world clock.
//
// v0.6 adds explicit axial route segments and map-derived distance. The map
// layer remains the authority for scale and supplies routeMilesPerStep (for the
// current subhex map this is @graycloak/map-engine SCALES.subhex.milesAcross).
// Mixed-terrain route time is the sum of each segment's OSRIC outdoor travel
// time. This file still does not pathfind, write Firestore, move Actors, advance
// campaign time, roll encounters, or resolve completed Activities.
const ADNDActivities = (function(){
  'use strict';

  const ACTIVITY_VERSION = 3;
  const ACTIVITY_TYPES = Object.freeze({
    TRAVEL: 'travel',
  });
  const ACTIVITY_STATUS = Object.freeze({
    PENDING: 'pending',
    ACTIVE: 'active',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  });
  const TRAVEL_TERRAIN = Object.freeze({
    LEVEL: 'level',
    RUGGED: 'rugged',
    VERY_RUGGED: 'very-rugged',
  });
  const TERRAIN_MILES_PER_MOVEMENT = Object.freeze({
    [TRAVEL_TERRAIN.LEVEL]: 0.20,
    [TRAVEL_TERRAIN.RUGGED]: 0.15,
    [TRAVEL_TERRAIN.VERY_RUGGED]: 0.10,
  });
  const ENCUMBRANCE_PACE = Object.freeze({
    FULL: 'full',
    THREE_QUARTER: 'three-quarter',
    HALF: 'half',
    QUARTER: 'quarter',
    IMMOBILE: 'immobile',
  });
  const ENCUMBRANCE_MULTIPLIER = Object.freeze({
    [ENCUMBRANCE_PACE.FULL]: 1,
    [ENCUMBRANCE_PACE.THREE_QUARTER]: 0.75,
    [ENCUMBRANCE_PACE.HALF]: 0.5,
    [ENCUMBRANCE_PACE.QUARTER]: 0.25,
    [ENCUMBRANCE_PACE.IMMOBILE]: 0,
  });
  const TRAVEL_DURATION_SOURCE = Object.freeze({
    MANUAL: 'manual',
    OSRIC_OUTDOOR: 'osric-outdoor',
    OSRIC_OUTDOOR_ROUTE: 'osric-outdoor-route',
  });
  const TRAVEL_ERROR = Object.freeze({
    INVALID_REQUEST: 'invalid-request',
    INVALID_ACTIVITY_ID: 'invalid-activity-id',
    INVALID_CAMPAIGN_ID: 'invalid-campaign-id',
    CAMPAIGN_MISMATCH: 'campaign-mismatch',
    INVALID_WORLD_TICK: 'invalid-world-tick',
    INVALID_DURATION: 'invalid-duration',
    INVALID_DISTANCE: 'invalid-distance',
    INVALID_TERRAIN: 'invalid-terrain',
    INVALID_ROUTE: 'invalid-route',
    INVALID_ROUTE_SEGMENT: 'invalid-route-segment',
    INVALID_ROUTE_SCALE: 'invalid-route-scale',
    NONCONTIGUOUS_ROUTE: 'noncontiguous-route',
    ROUTE_ENDPOINT_MISMATCH: 'route-endpoint-mismatch',
    INVALID_MOVEMENT_PROFILE: 'invalid-movement-profile',
    INVALID_MOVEMENT_RATE: 'invalid-movement-rate',
    INVALID_ENCUMBRANCE_PACE: 'invalid-encumbrance-pace',
    INVALID_ARMOUR_CAP: 'invalid-armour-cap',
    NO_TRAVEL_SPEED: 'no-travel-speed',
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

  function normalizePositiveFinite(value) {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  function normalizeNonnegativeFinite(value) {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  function normalizeAxialCoord(value) {
    let Q = null;
    let R = null;

    if (Array.isArray(value) && value.length >= 2) {
      Q = value[0];
      R = value[1];
    } else if (isPlainObject(value)) {
      if (Array.isArray(value.subHexCoord) && value.subHexCoord.length >= 2) {
        Q = value.subHexCoord[0];
        R = value.subHexCoord[1];
      } else {
        Q = value.Q;
        R = value.R;
      }
    }

    if (!Number.isSafeInteger(Q) || !Number.isSafeInteger(R)) return null;
    return { Q, R };
  }

  function sameAxialCoord(a, b) {
    const aa = normalizeAxialCoord(a);
    const bb = normalizeAxialCoord(b);
    return !!aa && !!bb && aa.Q === bb.Q && aa.R === bb.R;
  }

  // Cube-coordinate distance, matching @graycloak/map-engine axialDistance().
  // Geometry owns the miles-per-step scale; Activities only consumes the
  // supplied scale so this classic-script runtime does not duplicate map scale.
  function axialDistance(a, b) {
    const aa = normalizeAxialCoord(a);
    const bb = normalizeAxialCoord(b);
    if (!aa || !bb) return null;
    const dQ = aa.Q - bb.Q;
    const dR = aa.R - bb.R;
    return Math.max(Math.abs(dQ), Math.abs(dR), Math.abs(dQ + dR));
  }

  function normalizeRouteMilesPerStep(value) {
    return normalizePositiveFinite(value);
  }

  function normalizeRouteSegments(routeSegments, routeMilesPerStep) {
    if (!Array.isArray(routeSegments) || routeSegments.length === 0) {
      return { ok: false, code: TRAVEL_ERROR.INVALID_ROUTE };
    }

    const milesPerStep = normalizeRouteMilesPerStep(routeMilesPerStep);
    if (milesPerStep === null) {
      return { ok: false, code: TRAVEL_ERROR.INVALID_ROUTE_SCALE };
    }

    const normalized = [];
    let totalDistanceMiles = 0;
    let previousTo = null;

    for (let index = 0; index < routeSegments.length; index++) {
      const segment = routeSegments[index];
      if (!isPlainObject(segment)) {
        return { ok: false, code: TRAVEL_ERROR.INVALID_ROUTE_SEGMENT, segmentIndex: index };
      }

      const from = normalizeAxialCoord(segment.from);
      const to = normalizeAxialCoord(segment.to);
      const terrain = normalizeTerrain(segment.terrain);
      if (!from || !to) {
        return {
          ok: false,
          code: TRAVEL_ERROR.INVALID_ROUTE_SEGMENT,
          segmentIndex: index,
        };
      }
      if (!terrain) {
        return {
          ok: false,
          code: TRAVEL_ERROR.INVALID_TERRAIN,
          segmentIndex: index,
        };
      }

      const steps = axialDistance(from, to);
      // A route segment represents one entered map cell. Requiring adjacency
      // keeps terrain attribution exact and prevents a "rugged" long segment
      // from silently skipping intervening terrain.
      if (steps !== 1) {
        return {
          ok: false,
          code: TRAVEL_ERROR.NONCONTIGUOUS_ROUTE,
          segmentIndex: index,
          reason: 'segment-not-adjacent',
        };
      }

      if (previousTo && !sameAxialCoord(previousTo, from)) {
        return {
          ok: false,
          code: TRAVEL_ERROR.NONCONTIGUOUS_ROUTE,
          segmentIndex: index,
          reason: 'segment-chain-break',
        };
      }

      const distanceMiles = steps * milesPerStep;
      normalized.push({
        index,
        from,
        to,
        steps,
        distanceMiles,
        terrain,
      });
      totalDistanceMiles += distanceMiles;
      previousTo = to;
    }

    return {
      ok: true,
      routeMilesPerStep: milesPerStep,
      totalDistanceMiles,
      segments: normalized,
      origin: normalized[0].from,
      destination: normalized[normalized.length - 1].to,
    };
  }

  function normalizeTerrain(value) {
    if (value === TRAVEL_TERRAIN.LEVEL ||
        value === TRAVEL_TERRAIN.RUGGED ||
        value === TRAVEL_TERRAIN.VERY_RUGGED) return value;
    return null;
  }

  function normalizeEncumbrancePace(value) {
    if (value == null || value === '') return ENCUMBRANCE_PACE.FULL;
    if (typeof value === 'number') {
      for (const [pace, multiplier] of Object.entries(ENCUMBRANCE_MULTIPLIER)) {
        if (value === multiplier) return pace;
      }
      return null;
    }
    const text = String(value).trim().toLowerCase().replace(/_/g, '-');
    if (Object.prototype.hasOwnProperty.call(ENCUMBRANCE_MULTIPLIER, text)) return text;
    return null;
  }

  function resolveMovementProfile(profile) {
    if (!isPlainObject(profile)) {
      return { ok: false, code: TRAVEL_ERROR.INVALID_MOVEMENT_PROFILE };
    }

    // Callers that already have the final OSRIC Movement Rate may provide it
    // directly. This is the preferred bridge until the kernel's weight bands
    // are fully audited against OSRIC 3.
    if (profile.movementRate != null) {
      const movementRate = normalizeNonnegativeFinite(profile.movementRate);
      if (movementRate === null) {
        return { ok: false, code: TRAVEL_ERROR.INVALID_MOVEMENT_RATE };
      }
      return {
        ok: true,
        source: 'effective',
        baseMovementRate: null,
        armourMovementCap: null,
        encumbrancePace: null,
        encumbranceMultiplier: null,
        movementRate,
      };
    }

    const baseMovementRate = normalizePositiveFinite(profile.baseMovementRate);
    if (baseMovementRate === null) {
      return { ok: false, code: TRAVEL_ERROR.INVALID_MOVEMENT_RATE };
    }

    const encumbrancePace = normalizeEncumbrancePace(profile.encumbrancePace);
    if (encumbrancePace === null) {
      return { ok: false, code: TRAVEL_ERROR.INVALID_ENCUMBRANCE_PACE };
    }
    const encumbranceMultiplier = ENCUMBRANCE_MULTIPLIER[encumbrancePace];

    let armourMovementCap = null;
    if (profile.armourMovementCap != null) {
      armourMovementCap = normalizePositiveFinite(profile.armourMovementCap);
      if (armourMovementCap === null) {
        return { ok: false, code: TRAVEL_ERROR.INVALID_ARMOUR_CAP };
      }
    }

    // OSRIC treats armour as an absolute movement cap independent of weight
    // calculations. Derive the encumbered movement from base movement, then
    // apply the independent armour maximum to the result.
    const encumberedMovementRate = baseMovementRate * encumbranceMultiplier;
    const movementRate = armourMovementCap === null
      ? encumberedMovementRate
      : Math.min(encumberedMovementRate, armourMovementCap);

    return {
      ok: true,
      source: 'derived',
      baseMovementRate,
      armourMovementCap,
      encumbrancePace,
      encumbranceMultiplier,
      movementRate,
    };
  }

  function outdoorMilesPerDay(movementRate, terrain) {
    const rate = normalizeNonnegativeFinite(movementRate);
    const normalizedTerrain = normalizeTerrain(terrain);
    if (rate === null || normalizedTerrain === null) return null;
    return rate * TERRAIN_MILES_PER_MOVEMENT[normalizedTerrain];
  }

  function getMovementProfileForActor(movementProfiles, actorId) {
    if (!movementProfiles || typeof movementProfiles !== 'object') return null;
    if (!Object.prototype.hasOwnProperty.call(movementProfiles, actorId)) return null;
    return movementProfiles[actorId];
  }

  function resolvePartyTravelPace(actors, movementProfiles, terrain) {
    const normalizedTerrain = normalizeTerrain(terrain);
    if (!normalizedTerrain) {
      return { ok: false, code: TRAVEL_ERROR.INVALID_TERRAIN };
    }
    if (!Array.isArray(actors) || actors.length === 0) {
      return { ok: false, code: TRAVEL_ERROR.NO_ACTORS };
    }

    const actorPaces = [];
    let partyMovementRate = null;
    let milesPerDay = null;

    for (const actor of actors) {
      const actorId = cleanId(actor && actor.id);
      if (!actorId) {
        return { ok: false, code: TRAVEL_ERROR.INVALID_ACTOR_ID, actorPaces };
      }
      const profileInput = getMovementProfileForActor(movementProfiles, actorId);
      if (!profileInput) {
        return {
          ok: false,
          code: TRAVEL_ERROR.INVALID_MOVEMENT_PROFILE,
          actorId,
          actorPaces,
        };
      }
      const profile = resolveMovementProfile(profileInput);
      if (!profile.ok) {
        return Object.assign({}, profile, { actorId, actorPaces });
      }
      const actorMilesPerDay = outdoorMilesPerDay(profile.movementRate, normalizedTerrain);
      const pace = Object.assign({ actorId, milesPerDay: actorMilesPerDay }, profile);
      actorPaces.push(pace);

      if (partyMovementRate === null || profile.movementRate < partyMovementRate) {
        partyMovementRate = profile.movementRate;
      }
      if (milesPerDay === null || actorMilesPerDay < milesPerDay) {
        milesPerDay = actorMilesPerDay;
      }
    }

    if (!(milesPerDay > 0)) {
      return {
        ok: false,
        code: TRAVEL_ERROR.NO_TRAVEL_SPEED,
        terrain: normalizedTerrain,
        actorPaces,
        partyMovementRate,
        milesPerDay: milesPerDay || 0,
      };
    }

    return {
      ok: true,
      terrain: normalizedTerrain,
      terrainFactor: TERRAIN_MILES_PER_MOVEMENT[normalizedTerrain],
      actorPaces,
      partyMovementRate,
      milesPerDay,
    };
  }

  function calculateTravelDurationTicks(distanceMiles, milesPerDay) {
    const distance = normalizePositiveFinite(distanceMiles);
    const dailyMiles = normalizePositiveFinite(milesPerDay);
    if (distance === null || dailyMiles === null) return null;
    const travelDays = distance / dailyMiles;
    const rawTicks = travelDays * ADNDWorldClock.TICKS_PER_DAY;
    if (!Number.isFinite(rawTicks) || rawTicks > Number.MAX_SAFE_INTEGER) return null;
    return Math.max(1, Math.ceil(rawTicks));
  }

  function calculateOutdoorTravelDuration(input, actors) {
    input = input || {};
    const distanceMiles = normalizePositiveFinite(input.distanceMiles);
    if (distanceMiles === null) {
      return { ok: false, code: TRAVEL_ERROR.INVALID_DISTANCE };
    }

    const pace = resolvePartyTravelPace(actors, input.movementProfiles, input.terrain);
    if (!pace.ok) return pace;

    const durationTicks = calculateTravelDurationTicks(distanceMiles, pace.milesPerDay);
    if (durationTicks === null) {
      return { ok: false, code: TRAVEL_ERROR.TICK_OVERFLOW };
    }

    return {
      ok: true,
      durationTicks,
      durationSource: TRAVEL_DURATION_SOURCE.OSRIC_OUTDOOR,
      outdoorTravel: {
        ruleset: 'OSRIC 3.0',
        section: '1.5.3.2 Outdoor Movement',
        distanceMiles,
        terrain: pace.terrain,
        terrainFactor: pace.terrainFactor,
        partyMovementRate: pace.partyMovementRate,
        milesPerDay: pace.milesPerDay,
        travelDays: distanceMiles / pace.milesPerDay,
        actorPaces: pace.actorPaces,
      },
    };
  }

  function calculateRouteTravelDuration(input, actors) {
    input = input || {};
    const route = normalizeRouteSegments(input.routeSegments, input.routeMilesPerStep);
    if (!route.ok) return route;

    let travelDays = 0;
    let partyMovementRate = null;
    const segments = [];

    for (const routeSegment of route.segments) {
      const pace = resolvePartyTravelPace(
        actors,
        input.movementProfiles,
        routeSegment.terrain,
      );
      if (!pace.ok) {
        return Object.assign({}, pace, { segmentIndex: routeSegment.index });
      }

      const segmentTravelDays = routeSegment.distanceMiles / pace.milesPerDay;
      travelDays += segmentTravelDays;
      if (partyMovementRate === null) partyMovementRate = pace.partyMovementRate;

      segments.push({
        index: routeSegment.index,
        from: routeSegment.from,
        to: routeSegment.to,
        steps: routeSegment.steps,
        distanceMiles: routeSegment.distanceMiles,
        terrain: routeSegment.terrain,
        terrainFactor: pace.terrainFactor,
        partyMovementRate: pace.partyMovementRate,
        milesPerDay: pace.milesPerDay,
        travelDays: segmentTravelDays,
      });
    }

    const rawTicks = travelDays * ADNDWorldClock.TICKS_PER_DAY;
    if (!Number.isFinite(rawTicks) || rawTicks > Number.MAX_SAFE_INTEGER) {
      return { ok: false, code: TRAVEL_ERROR.TICK_OVERFLOW };
    }
    const durationTicks = Math.max(1, Math.ceil(rawTicks));

    return {
      ok: true,
      durationTicks,
      durationSource: TRAVEL_DURATION_SOURCE.OSRIC_OUTDOOR_ROUTE,
      outdoorTravel: {
        ruleset: 'OSRIC 3.0',
        section: '1.5.3.2 Outdoor Movement',
        routeMode: 'axial-segments',
        routeMilesPerStep: route.routeMilesPerStep,
        segmentCount: segments.length,
        distanceMiles: route.totalDistanceMiles,
        partyMovementRate,
        travelDays,
        origin: route.origin,
        destination: route.destination,
        segments,
      },
    };
  }

  function resolveTravelDuration(input, actors) {
    input = input || {};
    if (input.durationTicks != null) {
      const durationTicks = ADNDWorldClock.normalizeTick(input.durationTicks);
      if (durationTicks === null || durationTicks <= 0) {
        return { ok: false, code: TRAVEL_ERROR.INVALID_DURATION };
      }
      return {
        ok: true,
        durationTicks,
        durationSource: TRAVEL_DURATION_SOURCE.MANUAL,
        outdoorTravel: null,
      };
    }
    if (input.routeSegments != null) {
      return calculateRouteTravelDuration(input, actors);
    }
    return calculateOutdoorTravelDuration(input, actors);
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

    const origin = cleanLocationRef(input.origin);
    const destination = cleanLocationRef(input.destination);
    if (!origin || !destination) {
      return { ok: false, code: TRAVEL_ERROR.INVALID_LOCATION };
    }

    const actorValidation = validateActorSet(input.actors, worldTick, campaignId);
    if (!actorValidation.ok) {
      return Object.assign({}, actorValidation, { worldTick });
    }

    const duration = resolveTravelDuration(input, input.actors);
    if (!duration.ok) {
      return Object.assign({}, duration, {
        worldTick,
        actorStatuses: actorValidation.actorStatuses,
      });
    }

    if (duration.outdoorTravel &&
        duration.outdoorTravel.routeMode === 'axial-segments') {
      const requestedOrigin = normalizeAxialCoord(origin);
      const requestedDestination = normalizeAxialCoord(destination);
      if (requestedOrigin &&
          !sameAxialCoord(requestedOrigin, duration.outdoorTravel.origin)) {
        return {
          ok: false,
          code: TRAVEL_ERROR.ROUTE_ENDPOINT_MISMATCH,
          endpoint: 'origin',
        };
      }
      if (requestedDestination &&
          !sameAxialCoord(requestedDestination, duration.outdoorTravel.destination)) {
        return {
          ok: false,
          code: TRAVEL_ERROR.ROUTE_ENDPOINT_MISMATCH,
          endpoint: 'destination',
        };
      }
    }

    const availableAtTick = ADNDWorldClock.addTicks(worldTick, duration.durationTicks);
    if (availableAtTick === null) {
      return { ok: false, code: TRAVEL_ERROR.TICK_OVERFLOW };
    }

    return {
      ok: true,
      activityId,
      campaignId,
      worldTick,
      durationTicks: duration.durationTicks,
      durationSource: duration.durationSource,
      outdoorTravel: duration.outdoorTravel,
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
      durationSource: validation.durationSource,
      origin: validation.origin,
      destination: validation.destination,
    });
    if (validation.outdoorTravel) {
      system.outdoorTravel = clonePlain(validation.outdoorTravel);
    } else if (Object.prototype.hasOwnProperty.call(system, 'outdoorTravel')) {
      delete system.outdoorTravel;
    }

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
    TRAVEL_TERRAIN,
    TERRAIN_MILES_PER_MOVEMENT,
    ENCUMBRANCE_PACE,
    ENCUMBRANCE_MULTIPLIER,
    TRAVEL_DURATION_SOURCE,
    TRAVEL_ERROR,
    cleanLocationRef,
    normalizeAxialCoord,
    sameAxialCoord,
    axialDistance,
    normalizeRouteMilesPerStep,
    normalizeRouteSegments,
    normalizeTerrain,
    normalizeEncumbrancePace,
    resolveMovementProfile,
    outdoorMilesPerDay,
    resolvePartyTravelPace,
    calculateTravelDurationTicks,
    calculateOutdoorTravelDuration,
    calculateRouteTravelDuration,
    resolveTravelDuration,
    activityCompletionTick,
    isTravelActivity,
    isActivityDue,
    validateActorSet,
    validateTravelRequest,
    createTravelPlan,
  };
})();

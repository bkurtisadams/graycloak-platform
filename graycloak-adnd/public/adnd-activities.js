// adnd-activities.js v0.7.0 — 2026-08-30
// Pure Activity/travel planning primitives for Graycloak's shared world clock.
//
// v0.7 bridges authored world-map cells into the v0.6 route model. An ordered
// list of subhex coordinates can now resolve terrain using the same precedence
// as the player map: per-subhex override (including lake water) first, then the
// owning parent hex's base terrain. The destination/entered cell supplies each
// segment's terrain cost. This file still does not pathfind, write Firestore,
// move Actors, advance campaign time, roll encounters, or resolve Activities.
const ADNDActivities = (function(){
  'use strict';

  const ACTIVITY_VERSION = 4;
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
  // Graycloak map-terrain classification policy. OSRIC 3 defines the three
  // outdoor movement bands but does not assign Graycloak's authored terrain
  // vocabulary to them. Keep this mapping explicit and overridable rather than
  // pretending it is an OSRIC table. Water/river cells are intentionally absent
  // until a later crossing/naval travel layer can adjudicate them.
  const MAP_TERRAIN_TRAVEL_CLASS = Object.freeze({
    clear: TRAVEL_TERRAIN.LEVEL,
    plains: TRAVEL_TERRAIN.LEVEL,

    forest: TRAVEL_TERRAIN.RUGGED,
    hardwood: TRAVEL_TERRAIN.RUGGED,
    conifer: TRAVEL_TERRAIN.RUGGED,
    hills: TRAVEL_TERRAIN.RUGGED,
    desert: TRAVEL_TERRAIN.RUGGED,

    forest_hills: TRAVEL_TERRAIN.VERY_RUGGED,
    jungle: TRAVEL_TERRAIN.VERY_RUGGED,
    mountains: TRAVEL_TERRAIN.VERY_RUGGED,
    barrens: TRAVEL_TERRAIN.VERY_RUGGED,
    swamp: TRAVEL_TERRAIN.VERY_RUGGED,
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
    INVALID_ROUTE_CELLS: 'invalid-route-cells',
    MISSING_MAP_TERRAIN: 'missing-map-terrain',
    UNSUPPORTED_MAP_TERRAIN: 'unsupported-map-terrain',
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

  function subhexDocumentId(coord) {
    const cell = normalizeAxialCoord(coord);
    return cell ? `subhex_${cell.Q}_${cell.R}` : null;
  }

  function classifyMapTerrain(mapTerrain, terrainClasses) {
    if (mapTerrain == null || mapTerrain === '') return null;
    const key = String(mapTerrain).trim().toLowerCase();
    const direct = normalizeTerrain(key);
    if (direct) return direct;

    if (isPlainObject(terrainClasses) &&
        Object.prototype.hasOwnProperty.call(terrainClasses, key)) {
      return normalizeTerrain(terrainClasses[key]);
    }
    return MAP_TERRAIN_TRAVEL_CLASS[key] || null;
  }

  function normalizeParentOwner(value) {
    if (!isPlainObject(value)) return null;
    const col = value.col;
    const row = value.row;
    if (!Number.isSafeInteger(col) || !Number.isSafeInteger(row)) return null;
    return { col, row };
  }

  // Resolve authored terrain using the same precedence as adnd-map-view.js:
  // explicit subhex/lake override first, otherwise inherited parent terrain.
  function resolveAuthoredCellTerrain(coord, input) {
    input = input || {};
    const cell = normalizeAxialCoord(coord);
    if (!cell) return { ok: false, code: TRAVEL_ERROR.INVALID_ROUTE_CELLS };

    const docId = subhexDocumentId(cell);
    const subhexes = isPlainObject(input.subhexes) ? input.subhexes : {};
    const parentTerrain = isPlainObject(input.parentTerrain) ? input.parentTerrain : {};
    const authored = isPlainObject(subhexes[docId]) ? subhexes[docId] : null;

    let mapTerrain = null;
    let terrainSource = null;
    let owner = authored ? normalizeParentOwner(authored.owner) : null;

    if (authored && authored.lakeId &&
        !(typeof authored.terrain === 'string' && authored.terrain.startsWith('water'))) {
      mapTerrain = 'water_fresh';
      terrainSource = 'lake';
    } else if (authored && authored.terrain) {
      mapTerrain = String(authored.terrain);
      terrainSource = 'subhex-override';
    } else {
      if (!owner && typeof input.ownerOf === 'function') {
        owner = normalizeParentOwner(input.ownerOf(cell.Q, cell.R));
      }
      if (owner) {
        const inherited = parentTerrain[`${owner.col}-${owner.row}`];
        if (inherited != null && inherited !== '') {
          mapTerrain = String(inherited);
          terrainSource = 'parent-inherited';
        }
      }
    }

    if (!mapTerrain) {
      return {
        ok: false,
        code: TRAVEL_ERROR.MISSING_MAP_TERRAIN,
        coord: cell,
        documentId: docId,
        owner,
      };
    }

    const terrain = classifyMapTerrain(mapTerrain, input.terrainClasses);
    if (!terrain) {
      return {
        ok: false,
        code: TRAVEL_ERROR.UNSUPPORTED_MAP_TERRAIN,
        coord: cell,
        documentId: docId,
        mapTerrain,
        terrainSource,
        owner,
      };
    }

    return {
      ok: true,
      coord: cell,
      documentId: docId,
      mapTerrain,
      terrain,
      terrainSource,
      owner,
    };
  }

  // Convert an ordered list of map cells into v0.6 one-edge route segments.
  // Movement cost belongs to the cell being entered (the segment destination).
  function buildAuthoredRouteSegments(input) {
    input = input || {};
    if (!Array.isArray(input.routeCells) || input.routeCells.length < 2) {
      return { ok: false, code: TRAVEL_ERROR.INVALID_ROUTE_CELLS };
    }

    const routeMilesPerStep = normalizeRouteMilesPerStep(input.routeMilesPerStep);
    if (routeMilesPerStep === null) {
      return { ok: false, code: TRAVEL_ERROR.INVALID_ROUTE_SCALE };
    }

    const cells = [];
    for (let index = 0; index < input.routeCells.length; index++) {
      const cell = normalizeAxialCoord(input.routeCells[index]);
      if (!cell) {
        return { ok: false, code: TRAVEL_ERROR.INVALID_ROUTE_CELLS, cellIndex: index };
      }
      cells.push(cell);
    }

    const routeSegments = [];
    for (let index = 1; index < cells.length; index++) {
      const from = cells[index - 1];
      const to = cells[index];
      if (axialDistance(from, to) !== 1) {
        return {
          ok: false,
          code: TRAVEL_ERROR.NONCONTIGUOUS_ROUTE,
          cellIndex: index,
          reason: 'route-cells-not-adjacent',
        };
      }

      const resolved = resolveAuthoredCellTerrain(to, input);
      if (!resolved.ok) return Object.assign({}, resolved, { cellIndex: index });

      routeSegments.push({
        from,
        to,
        terrain: resolved.terrain,
        mapTerrain: resolved.mapTerrain,
        terrainSource: resolved.terrainSource,
        enteredCellId: resolved.documentId,
        owner: resolved.owner,
      });
    }

    return {
      ok: true,
      routeMilesPerStep,
      routeCells: cells,
      routeSegments,
      origin: cells[0],
      destination: cells[cells.length - 1],
    };
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
      const normalizedSegment = {
        index,
        from,
        to,
        steps,
        distanceMiles,
        terrain,
      };
      for (const key of ['mapTerrain', 'terrainSource', 'enteredCellId', 'owner']) {
        if (segment[key] != null) normalizedSegment[key] = clonePlain(segment[key]);
      }
      normalized.push(normalizedSegment);
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

      const calculatedSegment = {
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
      };
      for (const key of ['mapTerrain', 'terrainSource', 'enteredCellId', 'owner']) {
        if (routeSegment[key] != null) calculatedSegment[key] = clonePlain(routeSegment[key]);
      }
      segments.push(calculatedSegment);
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
        routeSource: cleanId(input.routeSource),
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

  function createAuthoredMapTravelPlan(input) {
    input = input || {};
    const route = buildAuthoredRouteSegments(input);
    if (!route.ok) return route;

    const origin = input.origin || { subHexCoord: [route.origin.Q, route.origin.R] };
    const destination = input.destination || {
      subHexCoord: [route.destination.Q, route.destination.R],
    };

    const request = Object.assign({}, input, {
      routeSegments: route.routeSegments,
      routeMilesPerStep: route.routeMilesPerStep,
      routeSource: 'authored-map',
      origin,
      destination,
    });
    delete request.routeCells;
    delete request.subhexes;
    delete request.parentTerrain;
    delete request.ownerOf;
    delete request.terrainClasses;

    return createTravelPlan(request);
  }

  return {
    ACTIVITY_VERSION,
    ACTIVITY_TYPES,
    ACTIVITY_STATUS,
    TRAVEL_TERRAIN,
    MAP_TERRAIN_TRAVEL_CLASS,
    TERRAIN_MILES_PER_MOVEMENT,
    ENCUMBRANCE_PACE,
    ENCUMBRANCE_MULTIPLIER,
    TRAVEL_DURATION_SOURCE,
    TRAVEL_ERROR,
    cleanLocationRef,
    normalizeAxialCoord,
    sameAxialCoord,
    subhexDocumentId,
    classifyMapTerrain,
    resolveAuthoredCellTerrain,
    buildAuthoredRouteSegments,
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
    createAuthoredMapTravelPlan,
  };
})();

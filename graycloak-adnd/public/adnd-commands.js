// adnd-commands.js v1.0.0 — 2026-08-30
// Graycloak authoritative game-command boundary.
//
// v1.0 introduces Begin Travel as the first authoritative command contract.
// The browser may construct an intent, but outcomes are recomputed from trusted
// campaign/Actor/map state. This module remains transport/storage agnostic: it
// returns an atomic semantic commit bundle but performs no Firestore writes.
const ADNDCommands = (function(){
  'use strict';

  const COMMAND_VERSION = 1;
  const COMMAND_TYPES = Object.freeze({
    BEGIN_TRAVEL: 'beginTravel',
  });
  const EVENT_TYPES = Object.freeze({
    TRAVEL_STARTED: 'travel.started',
  });
  const COMMAND_ERROR = Object.freeze({
    DEPENDENCY_UNAVAILABLE: 'dependency-unavailable',
    INVALID_COMMAND: 'invalid-command',
    INVALID_COMMAND_ID: 'invalid-command-id',
    INVALID_COMMAND_TYPE: 'invalid-command-type',
    INVALID_CAMPAIGN_ID: 'invalid-campaign-id',
    INVALID_ACTIVITY_ID: 'invalid-activity-id',
    INVALID_EXPECTED_WORLD_TICK: 'invalid-expected-world-tick',
    INVALID_ACTOR_IDS: 'invalid-actor-ids',
    DUPLICATE_ACTOR: 'duplicate-actor',
    INVALID_ROUTE: 'invalid-route',
    CAMPAIGN_NOT_FOUND: 'campaign-not-found',
    CAMPAIGN_MISMATCH: 'campaign-mismatch',
    STALE_WORLD_TICK: 'stale-world-tick',
    ACTOR_NOT_FOUND: 'actor-not-found',
    ACTOR_NOT_AT_ORIGIN: 'actor-not-at-origin',
    MISSING_AUTHORITATIVE_MOVEMENT: 'missing-authoritative-movement',
    INVALID_AUTHORITATIVE_MOVEMENT: 'invalid-authoritative-movement',
    INVALID_ROUTE_SCALE: 'invalid-route-scale',
    TRAVEL_REJECTED: 'travel-rejected',
  });

  function dependenciesReady(){
    return typeof ADNDDocuments !== 'undefined' && ADNDDocuments &&
      typeof ADNDWorldClock !== 'undefined' && ADNDWorldClock &&
      typeof ADNDActivities !== 'undefined' && ADNDActivities;
  }

  function cleanId(value){
    if (value == null || value === '') return null;
    return String(value);
  }

  function isPlainObject(value){
    if (value == null || typeof value !== 'object') return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }

  function clonePlain(value){
    if (value == null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(clonePlain);
    if (!isPlainObject(value)) return value;
    const out = {};
    for (const [key, child] of Object.entries(value)) out[key] = clonePlain(child);
    return out;
  }

  function normalizeActorIds(value){
    if (!Array.isArray(value) || value.length === 0) return null;
    const out = [];
    const seen = new Set();
    for (const rawId of value){
      const id = cleanId(rawId);
      if (!id) return null;
      if (seen.has(id)) return { error: COMMAND_ERROR.DUPLICATE_ACTOR, actorId: id };
      seen.add(id);
      out.push(id);
    }
    return out;
  }

  function normalizeRouteCells(value){
    if (!dependenciesReady() || !Array.isArray(value) || value.length < 2) return null;
    const out = [];
    for (let i = 0; i < value.length; i++){
      const cell = ADNDActivities.normalizeAxialCoord(value[i]);
      if (!cell) return null;
      if (i > 0 && ADNDActivities.axialDistance(out[i - 1], cell) !== 1) return null;
      out.push(cell);
    }
    return out;
  }

  // This is the CLIENT-SAFE intent shape. It intentionally excludes movement
  // rates, terrain classifications, duration, arrival time, and Actor runtime
  // patches. Those are outcomes and must be derived again from trusted state.
  function createBeginTravelIntent(input){
    if (!dependenciesReady()) return { ok: false, code: COMMAND_ERROR.DEPENDENCY_UNAVAILABLE };
    input = input || {};

    const commandId = cleanId(input.commandId || input.id);
    if (!commandId) return { ok: false, code: COMMAND_ERROR.INVALID_COMMAND_ID };
    const activityId = cleanId(input.activityId);
    if (!activityId) return { ok: false, code: COMMAND_ERROR.INVALID_ACTIVITY_ID };
    const campaignId = cleanId(input.campaignId);
    if (!campaignId) return { ok: false, code: COMMAND_ERROR.INVALID_CAMPAIGN_ID };
    const expectedWorldTick = ADNDWorldClock.normalizeTick(input.expectedWorldTick);
    if (expectedWorldTick === null) {
      return { ok: false, code: COMMAND_ERROR.INVALID_EXPECTED_WORLD_TICK };
    }

    const actorIds = normalizeActorIds(input.actorIds);
    if (!actorIds) return { ok: false, code: COMMAND_ERROR.INVALID_ACTOR_IDS };
    if (actorIds.error) return { ok: false, code: actorIds.error, actorId: actorIds.actorId };

    const routeCells = normalizeRouteCells(input.routeCells);
    if (!routeCells) return { ok: false, code: COMMAND_ERROR.INVALID_ROUTE };

    return {
      ok: true,
      command: {
        schemaVersion: COMMAND_VERSION,
        commandId,
        type: COMMAND_TYPES.BEGIN_TRAVEL,
        campaignId,
        activityId,
        expectedWorldTick,
        actorIds,
        routeCells,
      },
    };
  }

  function normalizeBeginTravelCommand(raw){
    if (!raw || typeof raw !== 'object') return { ok: false, code: COMMAND_ERROR.INVALID_COMMAND };
    if (raw.type !== COMMAND_TYPES.BEGIN_TRAVEL) {
      return { ok: false, code: COMMAND_ERROR.INVALID_COMMAND_TYPE };
    }
    return createBeginTravelIntent(raw);
  }

  function contextCampaignId(context){
    context = context || {};
    return cleanId(context.campaignId ||
      (context.campaign && (context.campaign.id || context.campaign.campaignId)));
  }

  function authoritativeActorMap(value){
    const out = {};
    if (Array.isArray(value)){
      for (const actor of value){
        const id = cleanId(actor && actor.id);
        if (id) out[id] = ADNDDocuments.normalizeCharacter(actor, id);
      }
      return out;
    }
    if (value && typeof value === 'object'){
      for (const [key, actor] of Object.entries(value)){
        if (!actor || typeof actor !== 'object') continue;
        const id = cleanId(actor.id || key);
        if (id) out[id] = ADNDDocuments.normalizeCharacter(actor, id);
      }
    }
    return out;
  }

  function explicitAuthoritativeMovementProfile(actor){
    if (!actor || typeof actor !== 'object') return null;
    const direct = actor.travelMovementProfile || actor.movementProfile;
    if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
      return clonePlain(direct);
    }
    if (Number.isFinite(actor.movementRate)) return { movementRate: actor.movementRate };
    const movement = actor.movement;
    if (movement && typeof movement === 'object' && !Array.isArray(movement)){
      if (Number.isFinite(movement.movementRate)) return { movementRate: movement.movementRate };
      if (Number.isFinite(movement.rate)) return { movementRate: movement.rate };
      if (Number.isFinite(movement.baseMovementRate)){
        const profile = { baseMovementRate: movement.baseMovementRate };
        if (movement.encumbrancePace != null) profile.encumbrancePace = movement.encumbrancePace;
        if (movement.armourMovementCap != null) profile.armourMovementCap = movement.armourMovementCap;
        return profile;
      }
    }
    return null;
  }

  function authoritativeMovementProfiles(actors, supplied){
    const out = {};
    const missingActorIds = [];
    const invalidActorIds = [];
    supplied = supplied && typeof supplied === 'object' ? supplied : {};

    for (const actor of actors){
      const actorId = cleanId(actor && actor.id);
      const hasSupplied = actorId && Object.prototype.hasOwnProperty.call(supplied, actorId);
      const profile = hasSupplied ? clonePlain(supplied[actorId])
        : explicitAuthoritativeMovementProfile(actor);
      if (!profile){
        missingActorIds.push(actorId);
        continue;
      }
      const resolved = ADNDActivities.resolveMovementProfile(profile);
      if (!resolved.ok){
        invalidActorIds.push(actorId);
        continue;
      }
      out[actorId] = profile;
    }

    if (invalidActorIds.length){
      return { ok: false, code: COMMAND_ERROR.INVALID_AUTHORITATIVE_MOVEMENT, invalidActorIds };
    }
    if (missingActorIds.length){
      return { ok: false, code: COMMAND_ERROR.MISSING_AUTHORITATIVE_MOVEMENT, missingActorIds };
    }
    return { ok: true, movementProfiles: out };
  }

  function actorRuntimePrecondition(actor){
    const runtime = ADNDWorldClock.actorTimeRuntime(actor);
    return {
      actorId: cleanId(actor && actor.id),
      campaignId: cleanId(actor && actor.campaignId),
      currentLocation: clonePlain(actor && actor.currentLocation),
      runtime,
    };
  }

  function executeBeginTravelCommand(rawCommand, context){
    if (!dependenciesReady()) return { ok: false, code: COMMAND_ERROR.DEPENDENCY_UNAVAILABLE };
    const normalized = normalizeBeginTravelCommand(rawCommand);
    if (!normalized.ok) return normalized;
    const command = normalized.command;
    context = context || {};

    const campaign = context.campaign;
    if (!campaign || typeof campaign !== 'object') {
      return { ok: false, code: COMMAND_ERROR.CAMPAIGN_NOT_FOUND };
    }
    const authoritativeCampaignId = contextCampaignId(context);
    if (!authoritativeCampaignId || authoritativeCampaignId !== command.campaignId){
      return {
        ok: false,
        code: COMMAND_ERROR.CAMPAIGN_MISMATCH,
        commandCampaignId: command.campaignId,
        authoritativeCampaignId,
      };
    }

    const worldTick = ADNDWorldClock.campaignWorldTick(campaign);
    if (worldTick === null) {
      return { ok: false, code: COMMAND_ERROR.INVALID_EXPECTED_WORLD_TICK };
    }
    if (worldTick !== command.expectedWorldTick){
      return {
        ok: false,
        code: COMMAND_ERROR.STALE_WORLD_TICK,
        expectedWorldTick: command.expectedWorldTick,
        authoritativeWorldTick: worldTick,
      };
    }

    const actorMap = authoritativeActorMap(context.actors || context.characters);
    const actors = [];
    for (const actorId of command.actorIds){
      const actor = actorMap[actorId];
      if (!actor) return { ok: false, code: COMMAND_ERROR.ACTOR_NOT_FOUND, actorId };
      actors.push(actor);
    }

    const origin = command.routeCells[0];
    for (const actor of actors){
      if (!ADNDActivities.sameAxialCoord(actor.currentLocation, origin)){
        return {
          ok: false,
          code: COMMAND_ERROR.ACTOR_NOT_AT_ORIGIN,
          actorId: actor.id,
          origin: clonePlain(origin),
          currentLocation: clonePlain(actor.currentLocation),
        };
      }
    }

    const movement = authoritativeMovementProfiles(
      actors,
      context.authoritativeMovementProfiles || context.movementProfiles,
    );
    if (!movement.ok) return movement;

    const routeMilesPerStep = ADNDActivities.normalizeRouteMilesPerStep(context.routeMilesPerStep);
    if (routeMilesPerStep === null) {
      return { ok: false, code: COMMAND_ERROR.INVALID_ROUTE_SCALE };
    }

    const plan = ADNDActivities.createAuthoredMapTravelPlan({
      id: command.activityId,
      campaignId: command.campaignId,
      actors,
      worldTick,
      routeCells: command.routeCells,
      routeMilesPerStep,
      subhexes: context.subhexes || {},
      parentTerrain: context.parentTerrain || {},
      ownerOf: context.ownerOf,
      terrainClasses: context.terrainClasses,
      movementProfiles: movement.movementProfiles,
      name: context.activityName || 'Travel',
      createdAt: context.createdAt == null ? null : context.createdAt,
      updatedAt: context.updatedAt == null ? null : context.updatedAt,
    });
    if (!plan.ok){
      return {
        ok: false,
        code: COMMAND_ERROR.TRAVEL_REJECTED,
        cause: plan.code,
        details: clonePlain(plan),
      };
    }

    const travel = plan.activity.system && plan.activity.system.outdoorTravel;
    const event = ADNDDocuments.createGameEvent({
      id: command.commandId,
      type: EVENT_TYPES.TRAVEL_STARTED,
      campaignId: command.campaignId,
      targetIds: command.actorIds,
      worldTick,
      rulesVersion: context.rulesVersion || null,
      commandId: command.commandId,
      createdAt: context.createdAt == null ? null : context.createdAt,
      updatedAt: context.updatedAt == null ? null : context.updatedAt,
      data: {
        activityId: command.activityId,
        actorIds: command.actorIds.slice(),
        origin: clonePlain(plan.activity.system.origin),
        destination: clonePlain(plan.activity.system.destination),
        durationTicks: plan.activity.system.durationTicks,
        availableAtTick: plan.activity.availableAtTick,
        durationSource: plan.activity.system.durationSource,
        distanceMiles: travel && Number.isFinite(travel.distanceMiles)
          ? travel.distanceMiles : null,
        segmentCount: travel && Number.isInteger(travel.segmentCount)
          ? travel.segmentCount : null,
        routeSource: travel && travel.routeSource ? travel.routeSource : null,
      },
    });

    const preconditions = {
      campaign: {
        campaignId: command.campaignId,
        worldTick,
      },
      actors: actors.map(actorRuntimePrecondition),
      commandEventMustNotExist: command.commandId,
      activityMustNotExist: command.activityId,
    };

    const commitBundle = {
      version: 1,
      commandId: command.commandId,
      commandType: command.type,
      idempotencyKey: command.commandId,
      campaignId: command.campaignId,
      expectedWorldTick: worldTick,
      preconditions,
      createActivity: plan.activity,
      patchActors: plan.actorRuntimePatches,
      createEvent: event,
    };

    return {
      ok: true,
      command,
      activity: plan.activity,
      actorRuntimePatches: plan.actorRuntimePatches,
      event,
      commitBundle,
    };
  }

  return {
    COMMAND_VERSION,
    COMMAND_TYPES,
    EVENT_TYPES,
    COMMAND_ERROR,
    cleanId,
    normalizeActorIds,
    normalizeRouteCells,
    createBeginTravelIntent,
    normalizeBeginTravelCommand,
    authoritativeActorMap,
    explicitAuthoritativeMovementProfile,
    authoritativeMovementProfiles,
    executeBeginTravelCommand,
  };
})();

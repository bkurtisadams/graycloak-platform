// adnd-commands.js v1.6.0 — 2026-08-30
// Graycloak authoritative game-command boundary.
//
// v1.6.0 adds the Create Character intent and pure trusted creation plan.
// It deliberately supports only fixed-order Method III until the arrangeable
// ability-roll workflow and its OSRIC provenance have been audited server-side.
//
// v1.0 introduced Begin Travel as the first authoritative command contract.
// The browser may construct an intent, but outcomes are recomputed from trusted
// campaign/Actor/map state. This module remains transport/storage agnostic: it
// returns an atomic semantic commit bundle but performs no Firestore writes.
const ADNDCommands = (function(){
  'use strict';

  const COMMAND_VERSION = 1;
  const COMMAND_TYPES = Object.freeze({
    BEGIN_TRAVEL: 'beginTravel',
    CREATE_CHARACTER: 'createCharacter',
  });
  const EVENT_TYPES = Object.freeze({
    TRAVEL_STARTED: 'travel.started',
    CHARACTER_CREATED: 'character.created',
  });
  const AUTHORITATIVE_CHARGEN_METHODS = Object.freeze(['III']);
  const CHARACTER_NAME_MAX_LENGTH = 80;
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
    INVALID_CHARACTER_NAME: 'invalid-character-name',
    INVALID_GENERATION_METHOD: 'invalid-generation-method',
    INVALID_RACE_ID: 'invalid-race-id',
    INVALID_CLASS_ID: 'invalid-class-id',
    INVALID_GENDER_ID: 'invalid-gender-id',
    INVALID_ALIGNMENT: 'invalid-alignment',
    CAMPAIGN_NOT_FOUND: 'campaign-not-found',
    CAMPAIGN_MISMATCH: 'campaign-mismatch',
    STALE_WORLD_TICK: 'stale-world-tick',
    ACTOR_NOT_FOUND: 'actor-not-found',
    ACTOR_NOT_AT_ORIGIN: 'actor-not-at-origin',
    MISSING_AUTHORITATIVE_MOVEMENT: 'missing-authoritative-movement',
    INVALID_AUTHORITATIVE_MOVEMENT: 'invalid-authoritative-movement',
    INVALID_ROUTE_SCALE: 'invalid-route-scale',
    TRAVEL_REJECTED: 'travel-rejected',
    MISSING_AUTHORITATIVE_OWNER: 'missing-authoritative-owner',
    INVALID_CHARACTER_ID: 'invalid-character-id',
    INVALID_CHARACTER_BUILDER: 'invalid-character-builder',
    CHARACTER_BUILD_REJECTED: 'character-build-rejected',
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


  function cleanChoice(value, maxLength){
    if (value == null) return null;
    const text = String(value).trim();
    if (!text || (Number.isInteger(maxLength) && text.length > maxLength)) return null;
    return text;
  }

  function cleanDocumentId(value){
    const id = cleanChoice(value, 512);
    if (!id || id === '.' || id === '..' || id.includes('/')) return null;
    return id;
  }

  function normalizeCharacterName(value){
    return cleanChoice(value, CHARACTER_NAME_MAX_LENGTH);
  }

  function normalizeGenerationMethod(value){
    const method = cleanChoice(value, 16);
    if (!method) return null;
    const normalized = method.toUpperCase();
    return AUTHORITATIVE_CHARGEN_METHODS.includes(normalized) ? normalized : null;
  }

  function createCreateCharacterIntent(input){
    if (!dependenciesReady()) return { ok: false, code: COMMAND_ERROR.DEPENDENCY_UNAVAILABLE };
    input = input || {};

    const commandId = cleanId(input.commandId || input.id);
    if (!commandId) return { ok: false, code: COMMAND_ERROR.INVALID_COMMAND_ID };
    const campaignId = cleanId(input.campaignId);
    if (!campaignId) return { ok: false, code: COMMAND_ERROR.INVALID_CAMPAIGN_ID };
    const name = normalizeCharacterName(input.name);
    if (!name) return { ok: false, code: COMMAND_ERROR.INVALID_CHARACTER_NAME };
    const generationMethod = normalizeGenerationMethod(input.generationMethod || input.method);
    if (!generationMethod) return { ok: false, code: COMMAND_ERROR.INVALID_GENERATION_METHOD };
    const raceId = cleanChoice(input.raceId || input.race, 64);
    if (!raceId) return { ok: false, code: COMMAND_ERROR.INVALID_RACE_ID };
    const classId = cleanChoice(input.classId, 64);
    if (!classId) return { ok: false, code: COMMAND_ERROR.INVALID_CLASS_ID };
    const genderId = cleanChoice(input.genderId, 64);
    if (!genderId) return { ok: false, code: COMMAND_ERROR.INVALID_GENDER_ID };

    let alignment = null;
    if (input.alignment != null && input.alignment !== ''){
      alignment = cleanChoice(input.alignment, 64);
      if (!alignment) return { ok: false, code: COMMAND_ERROR.INVALID_ALIGNMENT };
    }

    // v1.6.0 is intentionally one-shot only for fixed-order Method III. It does
    // not accept base scores, roll results, random seeds, HP, gold, spells,
    // owner uid, runtime, location, or other outcome-looking client claims.
    return {
      ok: true,
      command: {
        schemaVersion: COMMAND_VERSION,
        commandId,
        type: COMMAND_TYPES.CREATE_CHARACTER,
        campaignId,
        generationMethod,
        raceId,
        classId,
        genderId,
        name,
        alignment,
      },
    };
  }

  function normalizeCreateCharacterCommand(raw){
    if (!raw || typeof raw !== 'object') return { ok: false, code: COMMAND_ERROR.INVALID_COMMAND };
    if (raw.type !== COMMAND_TYPES.CREATE_CHARACTER) {
      return { ok: false, code: COMMAND_ERROR.INVALID_COMMAND_TYPE };
    }
    return createCreateCharacterIntent(raw);
  }

  function authoritativeOwnerUid(context){
    context = context || {};
    return cleanId(context.ownerUid || context.principalUid ||
      (context.principal && context.principal.uid));
  }

  function normalizeTrustedCharacterBuild(result){
    if (!result || typeof result !== 'object') return null;
    const accepted = result.ok === true || result.valid === true;
    if (!accepted) return {
      ok: false,
      reason: result.code || result.error || null,
    };
    const actorData = result.actor || result.doc || result.actorData;
    if (!actorData || typeof actorData !== 'object' || Array.isArray(actorData)) return null;
    return {
      ok: true,
      actorData: clonePlain(actorData),
      rulesVersion: result.rulesVersion || actorData.rulesVersion || null,
    };
  }

  function executeCreateCharacterCommand(rawCommand, context){
    if (!dependenciesReady()) return { ok: false, code: COMMAND_ERROR.DEPENDENCY_UNAVAILABLE };
    const normalized = normalizeCreateCharacterCommand(rawCommand);
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
    const ownerUid = authoritativeOwnerUid(context);
    if (!ownerUid) return { ok: false, code: COMMAND_ERROR.MISSING_AUTHORITATIVE_OWNER };
    const characterId = cleanDocumentId(context.characterId);
    if (!characterId) return { ok: false, code: COMMAND_ERROR.INVALID_CHARACTER_ID };
    if (typeof context.buildCharacter !== 'function') {
      return { ok: false, code: COMMAND_ERROR.INVALID_CHARACTER_BUILDER };
    }

    const choices = Object.freeze({
      generationMethod: command.generationMethod,
      raceId: command.raceId,
      classId: command.classId,
      genderId: command.genderId,
      name: command.name,
      alignment: command.alignment,
    });

    let built;
    try {
      built = normalizeTrustedCharacterBuild(context.buildCharacter(choices));
    } catch (error){
      return {
        ok: false,
        code: COMMAND_ERROR.CHARACTER_BUILD_REJECTED,
        reason: error && error.message ? String(error.message) : String(error),
      };
    }
    if (!built || built.ok !== true){
      return {
        ok: false,
        code: COMMAND_ERROR.CHARACTER_BUILD_REJECTED,
        reason: built && built.reason ? String(built.reason) : null,
      };
    }

    const createdAt = context.createdAt == null ? null : context.createdAt;
    const updatedAt = context.updatedAt == null ? createdAt : context.updatedAt;
    const rulesVersion = context.rulesVersion == null
      ? (built.rulesVersion == null ? null : String(built.rulesVersion))
      : String(context.rulesVersion);

    // Authority-sensitive identity, ownership, campaign, time, and placement are
    // always overwritten after the trusted rules builder returns. Character
    // creation does not enter the world yet; v1.7 owns initial placement.
    const actorInput = Object.assign({}, built.actorData, {
      id: characterId,
      type: 'character',
      ownerUid,
      campaignId: command.campaignId,
      name: command.name,
      generationMethod: command.generationMethod,
      raceId: command.raceId,
      classId: command.classId,
      genderId: command.genderId,
      alignment: command.alignment,
      currentLocation: null,
      runtime: {
        lastResolvedTick: worldTick,
        availableAtTick: null,
        activityId: null,
      },
      createdAt,
      updatedAt,
    });
    if (rulesVersion != null) actorInput.rulesVersion = rulesVersion;
    const actor = ADNDDocuments.createActor(actorInput);

    const event = ADNDDocuments.createGameEvent({
      id: command.commandId,
      type: EVENT_TYPES.CHARACTER_CREATED,
      campaignId: command.campaignId,
      actorId: characterId,
      targetIds: [characterId],
      worldTick,
      rulesVersion,
      commandId: command.commandId,
      createdAt,
      updatedAt,
      data: {
        characterId,
        generationMethod: command.generationMethod,
        raceId: command.raceId,
        classId: command.classId,
      },
    });

    // v1.6.0 stops at a semantic creation plan. The existing v1.1 transaction
    // adapter is Travel-specific and MUST NOT be reused for this shape. A later
    // v1.6 slice will add the atomic character + event transaction and Items.
    const creationPlan = {
      version: 1,
      kind: COMMAND_TYPES.CREATE_CHARACTER,
      commandId: command.commandId,
      campaignId: command.campaignId,
      characterId,
      worldTick,
      preconditions: {
        campaign: { campaignId: command.campaignId, worldTick },
        commandEventMustNotExist: command.commandId,
        characterMustNotExist: characterId,
      },
      createActor: actor,
      createEvent: event,
    };

    return {
      ok: true,
      command,
      actor,
      event,
      creationPlan,
    };
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
    AUTHORITATIVE_CHARGEN_METHODS,
    CHARACTER_NAME_MAX_LENGTH,
    COMMAND_ERROR,
    cleanId,
    cleanDocumentId,
    normalizeCharacterName,
    normalizeGenerationMethod,
    createCreateCharacterIntent,
    normalizeCreateCharacterCommand,
    authoritativeOwnerUid,
    executeCreateCharacterCommand,
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

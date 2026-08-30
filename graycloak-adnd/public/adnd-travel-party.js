// adnd-travel-party.js v0.9.0 — 2026-08-30
// Pure party-selection and travel-preview helpers for the Graycloak world map.
//
// This layer is deliberately non-authoritative. It selects loaded Actors at a
// route origin, resolves explicit/preview movement profiles, and calculates a
// read-only travel preview. It never writes Firestore, reserves Actors, moves
// them, or advances the campaign clock.
const ADNDTravelParty = (function(){
  'use strict';

  const PARTY_VERSION = 1;
  const PARTY_ERROR = Object.freeze({
    NO_ROUTE_START: 'no-route-start',
    NO_ACTORS: 'no-actors',
    NO_SELECTED_ACTORS: 'no-selected-actors',
    INVALID_ACTOR_ID: 'invalid-actor-id',
    ACTOR_NOT_AT_ROUTE_START: 'actor-not-at-route-start',
    CAMPAIGN_MISMATCH: 'campaign-mismatch',
    MISSING_MOVEMENT_PROFILE: 'missing-movement-profile',
    INVALID_MOVEMENT_PROFILE: 'invalid-movement-profile',
    ACTIVITIES_UNAVAILABLE: 'activities-unavailable',
    CLOCK_UNAVAILABLE: 'clock-unavailable',
    INVALID_ROUTE: 'invalid-route',
  });

  function cleanId(value){
    if (value == null || value === '') return null;
    return String(value);
  }

  function normalizeCell(value){
    if (typeof ADNDActivities !== 'undefined' && ADNDActivities &&
        typeof ADNDActivities.normalizeAxialCoord === 'function') {
      return ADNDActivities.normalizeAxialCoord(value);
    }
    let Q = null, R = null;
    if (Array.isArray(value) && value.length >= 2){
      Q = value[0]; R = value[1];
    } else if (value && typeof value === 'object') {
      if (Array.isArray(value.subHexCoord) && value.subHexCoord.length >= 2){
        Q = value.subHexCoord[0]; R = value.subHexCoord[1];
      } else {
        Q = value.Q; R = value.R;
      }
    }
    if (!Number.isSafeInteger(Q) || !Number.isSafeInteger(R)) return null;
    return { Q, R };
  }

  function sameCell(a, b){
    const aa = normalizeCell(a), bb = normalizeCell(b);
    return !!aa && !!bb && aa.Q === bb.Q && aa.R === bb.R;
  }

  function actorCell(actor){
    return normalizeCell(actor && actor.currentLocation);
  }

  function actorAtCell(actor, cell){
    return sameCell(actorCell(actor), cell);
  }

  function explicitMovementProfile(actor){
    if (!actor || typeof actor !== 'object') return null;
    // These are explicit data bridges only. We intentionally do not infer a
    // default OSRIC movement rate from race/class/ability data.
    const direct = actor.travelMovementProfile || actor.movementProfile;
    if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
      return Object.assign({}, direct);
    }
    if (Number.isFinite(actor.movementRate)) {
      return { movementRate: actor.movementRate };
    }
    const movement = actor.movement;
    if (movement && typeof movement === 'object' && !Array.isArray(movement)) {
      if (Number.isFinite(movement.movementRate)) {
        return { movementRate: movement.movementRate };
      }
      if (Number.isFinite(movement.rate)) {
        return { movementRate: movement.rate };
      }
      if (Number.isFinite(movement.baseMovementRate)) {
        const out = { baseMovementRate: movement.baseMovementRate };
        if (movement.encumbrancePace != null) out.encumbrancePace = movement.encumbrancePace;
        if (movement.armourMovementCap != null) out.armourMovementCap = movement.armourMovementCap;
        return out;
      }
    }
    return null;
  }

  function normalizeOverride(value){
    if (value == null || value === '') return null;
    if (typeof value === 'number') return Number.isFinite(value) ? { movementRate: value } : null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;
      const n = Number(trimmed);
      return Number.isFinite(n) ? { movementRate: n } : null;
    }
    if (typeof value === 'object' && !Array.isArray(value)) return Object.assign({}, value);
    return null;
  }

  function listCandidates(characters, startCell, worldTick, campaignId){
    const start = normalizeCell(startCell);
    if (!start) return [];
    const cid = cleanId(campaignId);
    const entries = characters && typeof characters === 'object'
      ? Object.entries(characters) : [];
    const out = [];
    for (const [key, actor] of entries){
      if (!actor || typeof actor !== 'object') continue;
      const actorId = cleanId(actor.id || key);
      if (!actorId || !actorAtCell(actor, start)) continue;
      if (cid && cleanId(actor.campaignId) !== cid) continue;
      let time = null;
      if (typeof ADNDWorldClock !== 'undefined' && ADNDWorldClock &&
          typeof ADNDWorldClock.getActorTimeStatus === 'function') {
        time = ADNDWorldClock.getActorTimeStatus(actor, worldTick);
      }
      out.push({
        actorId,
        name: actor.name || actorId,
        actor,
        time,
        movementProfile: explicitMovementProfile(actor),
      });
    }
    out.sort((a, b) => String(a.name).localeCompare(String(b.name)) || a.actorId.localeCompare(b.actorId));
    return out;
  }

  function selectedActors(characters, selectedActorIds, startCell, campaignId){
    if (!Array.isArray(selectedActorIds) || selectedActorIds.length === 0) {
      return { ok: false, code: PARTY_ERROR.NO_SELECTED_ACTORS, actors: [] };
    }
    const start = normalizeCell(startCell);
    if (!start) return { ok: false, code: PARTY_ERROR.NO_ROUTE_START, actors: [] };
    const cid = cleanId(campaignId);
    const byId = {};
    for (const [key, actor] of Object.entries(characters || {})) {
      if (!actor || typeof actor !== 'object') continue;
      const id = cleanId(actor.id || key);
      if (id) byId[id] = actor;
    }
    const seen = new Set();
    const actors = [];
    for (const rawId of selectedActorIds){
      const actorId = cleanId(rawId);
      if (!actorId || seen.has(actorId) || !byId[actorId]) {
        return { ok: false, code: PARTY_ERROR.INVALID_ACTOR_ID, actorId, actors };
      }
      seen.add(actorId);
      const actor = byId[actorId];
      if (!actorAtCell(actor, start)) {
        return { ok: false, code: PARTY_ERROR.ACTOR_NOT_AT_ROUTE_START, actorId, actors };
      }
      if (cid && cleanId(actor.campaignId) !== cid) {
        return { ok: false, code: PARTY_ERROR.CAMPAIGN_MISMATCH, actorId, actors };
      }
      actors.push(actor);
    }
    return { ok: true, actors };
  }

  function buildMovementProfiles(actors, overrides){
    if (!Array.isArray(actors) || actors.length === 0) {
      return { ok: false, code: PARTY_ERROR.NO_ACTORS, movementProfiles: {} };
    }
    const profiles = {};
    const missingActorIds = [];
    const invalidActorIds = [];
    for (const actor of actors){
      const actorId = cleanId(actor && actor.id);
      if (!actorId) return { ok: false, code: PARTY_ERROR.INVALID_ACTOR_ID, movementProfiles: profiles };
      const hasOverride = overrides && Object.prototype.hasOwnProperty.call(overrides, actorId);
      const profile = hasOverride ? normalizeOverride(overrides[actorId]) : explicitMovementProfile(actor);
      if (!profile) {
        missingActorIds.push(actorId);
        continue;
      }
      if (typeof ADNDActivities !== 'undefined' && ADNDActivities &&
          typeof ADNDActivities.resolveMovementProfile === 'function') {
        const resolved = ADNDActivities.resolveMovementProfile(profile);
        if (!resolved.ok) {
          invalidActorIds.push(actorId);
          continue;
        }
      }
      profiles[actorId] = profile;
    }
    if (invalidActorIds.length) {
      return {
        ok: false,
        code: PARTY_ERROR.INVALID_MOVEMENT_PROFILE,
        invalidActorIds,
        missingActorIds,
        movementProfiles: profiles,
      };
    }
    if (missingActorIds.length) {
      return {
        ok: false,
        code: PARTY_ERROR.MISSING_MOVEMENT_PROFILE,
        missingActorIds,
        movementProfiles: profiles,
      };
    }
    return { ok: true, movementProfiles: profiles };
  }

  function slowestActor(actors, movementProfiles){
    if (typeof ADNDActivities === 'undefined' || !ADNDActivities ||
        typeof ADNDActivities.resolveMovementProfile !== 'function') return null;
    let slowest = null;
    for (const actor of actors || []){
      const actorId = cleanId(actor && actor.id);
      if (!actorId) continue;
      const profile = movementProfiles && movementProfiles[actorId];
      const resolved = ADNDActivities.resolveMovementProfile(profile);
      if (!resolved.ok) continue;
      if (!slowest || resolved.movementRate < slowest.movementRate) {
        slowest = {
          actorId,
          name: actor.name || actorId,
          movementRate: resolved.movementRate,
        };
      }
    }
    return slowest;
  }

  function formatDurationTicks(value){
    if (typeof ADNDWorldClock === 'undefined' || !ADNDWorldClock ||
        typeof ADNDWorldClock.normalizeTick !== 'function') return null;
    let ticks = ADNDWorldClock.normalizeTick(value);
    if (ticks === null) return null;
    const parts = [];
    const units = [
      ['d', ADNDWorldClock.TICKS_PER_DAY],
      ['h', ADNDWorldClock.TICKS_PER_HOUR],
      ['turn', ADNDWorldClock.TICKS_PER_TURN],
      ['round', ADNDWorldClock.TICKS_PER_ROUND],
      ['seg', ADNDWorldClock.TICKS_PER_SEGMENT],
    ];
    for (const [label, size] of units){
      if (!(size > 0)) continue;
      const n = Math.floor(ticks / size);
      ticks -= n * size;
      if (n > 0) parts.push(`${n}${label === 'turn' || label === 'round' || label === 'seg' ? ' ' : ''}${label}${n !== 1 && (label === 'turn' || label === 'round' || label === 'seg') ? 's' : ''}`);
      if (parts.length >= 3) break;
    }
    return parts.length ? parts.join(' ') : '0 seg';
  }

  function buildPreview(input){
    input = input || {};
    if (typeof ADNDActivities === 'undefined' || !ADNDActivities ||
        typeof ADNDActivities.calculateRouteTravelDuration !== 'function') {
      return { ok: false, code: PARTY_ERROR.ACTIVITIES_UNAVAILABLE };
    }
    if (!Array.isArray(input.routeSegments) || input.routeSegments.length === 0) {
      return { ok: false, code: PARTY_ERROR.INVALID_ROUTE };
    }
    const actors = Array.isArray(input.actors) ? input.actors : [];
    if (!actors.length) return { ok: false, code: PARTY_ERROR.NO_ACTORS };

    const movement = buildMovementProfiles(actors, input.movementOverrides || input.movementProfiles);
    if (!movement.ok) return movement;

    const duration = ADNDActivities.calculateRouteTravelDuration({
      routeSegments: input.routeSegments,
      routeMilesPerStep: input.routeMilesPerStep,
      routeSource: input.routeSource || 'authored-map',
      movementProfiles: movement.movementProfiles,
    }, actors);
    if (!duration.ok) return duration;

    const worldTick = typeof ADNDWorldClock !== 'undefined' && ADNDWorldClock
      ? ADNDWorldClock.normalizeTick(input.worldTick) : null;
    const arrivalTick = worldTick !== null
      ? ADNDWorldClock.addTicks(worldTick, duration.durationTicks) : null;
    const actorStatuses = actors.map(actor => {
      const actorId = cleanId(actor && actor.id);
      const time = worldTick !== null && ADNDWorldClock &&
        typeof ADNDWorldClock.getActorTimeStatus === 'function'
        ? ADNDWorldClock.getActorTimeStatus(actor, worldTick) : null;
      return { actorId, status: time ? time.status : 'unknown', time };
    });
    const canBegin = worldTick !== null && actorStatuses.every(entry => entry.status === 'current');

    return {
      ok: true,
      canBegin,
      worldTick,
      arrivalTick,
      durationTicks: duration.durationTicks,
      durationText: formatDurationTicks(duration.durationTicks),
      outdoorTravel: duration.outdoorTravel,
      movementProfiles: movement.movementProfiles,
      slowestActor: slowestActor(actors, movement.movementProfiles),
      actorStatuses,
    };
  }

  return {
    PARTY_VERSION,
    PARTY_ERROR,
    cleanId,
    normalizeCell,
    sameCell,
    actorCell,
    actorAtCell,
    explicitMovementProfile,
    normalizeOverride,
    listCandidates,
    selectedActors,
    buildMovementProfiles,
    slowestActor,
    formatDurationTicks,
    buildPreview,
  };
})();

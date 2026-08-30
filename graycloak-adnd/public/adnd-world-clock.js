// adnd-world-clock.js v0.3.0 — 2026-08-30
// Graycloak's calendar-agnostic campaign-time primitives.
//
// One worldTick equals one OSRIC combat segment (6 seconds). The numeric
// world clock is authoritative game-time; calendar names/dates are display
// adapters layered on top and are intentionally not handled here.
const ADNDWorldClock = (function(){
  'use strict';

  const CLOCK_VERSION = 1;
  const TICKS_PER_SEGMENT = 1;
  const SEGMENTS_PER_ROUND = 10;
  const ROUNDS_PER_TURN = 10;
  const TURNS_PER_HOUR = 6;
  const HOURS_PER_DAY = 24;

  const TICKS_PER_ROUND = TICKS_PER_SEGMENT * SEGMENTS_PER_ROUND;
  const TICKS_PER_TURN = TICKS_PER_ROUND * ROUNDS_PER_TURN;
  const TICKS_PER_HOUR = TICKS_PER_TURN * TURNS_PER_HOUR;
  const TICKS_PER_DAY = TICKS_PER_HOUR * HOURS_PER_DAY;

  const ACTOR_TIME_STATUS = Object.freeze({
    UNKNOWN: 'unknown',
    UNBOUND: 'unbound',
    CURRENT: 'current',
    BEHIND: 'behind',
    UNAVAILABLE: 'unavailable',
    AHEAD: 'ahead',
  });

  function normalizeTick(value) {
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  }

  function cleanId(value) {
    if (value == null || value === '') return null;
    return String(value);
  }

  function campaignWorldTick(campaign) {
    return normalizeTick(campaign && campaign.worldTick);
  }

  function actorTimeRuntime(actor) {
    const runtime = actor && actor.runtime ? actor.runtime : {};
    return {
      lastResolvedTick: normalizeTick(runtime.lastResolvedTick),
      availableAtTick: normalizeTick(runtime.availableAtTick),
      activityId: cleanId(runtime.activityId),
    };
  }

  function getActorTimeStatus(actor, worldTick) {
    const now = normalizeTick(worldTick);
    const runtime = actorTimeRuntime(actor);
    let status = ACTOR_TIME_STATUS.UNKNOWN;

    if (now !== null) {
      if (runtime.lastResolvedTick !== null && runtime.lastResolvedTick > now) {
        // This should never occur in valid authoritative state. Keeping it as
        // an explicit status makes temporal corruption visible instead of
        // silently treating the actor as current.
        status = ACTOR_TIME_STATUS.AHEAD;
      } else if (runtime.activityId !== null ||
                 (runtime.availableAtTick !== null && runtime.availableAtTick > now)) {
        // An active Activity owns the actor until its resolver clears the
        // activity reference. A future availableAtTick is also sufficient to
        // reserve the actor even when an Activity document is not loaded.
        status = ACTOR_TIME_STATUS.UNAVAILABLE;
      } else if (runtime.lastResolvedTick === null) {
        // Legacy/newly created actors have not yet been bound to the campaign
        // clock. Binding is a separate authoritative operation; it is not an
        // implicit side effect of merely asking for status.
        status = ACTOR_TIME_STATUS.UNBOUND;
      } else if (runtime.lastResolvedTick < now) {
        status = ACTOR_TIME_STATUS.BEHIND;
      } else {
        status = ACTOR_TIME_STATUS.CURRENT;
      }
    }

    return {
      status,
      worldTick: now,
      lastResolvedTick: runtime.lastResolvedTick,
      availableAtTick: runtime.availableAtTick,
      activityId: runtime.activityId,
      catchUpTicks: status === ACTOR_TIME_STATUS.BEHIND
        ? now - runtime.lastResolvedTick : 0,
      waitTicks: status === ACTOR_TIME_STATUS.UNAVAILABLE &&
                 runtime.availableAtTick !== null &&
                 runtime.availableAtTick > now
        ? runtime.availableAtTick - now : 0,
    };
  }

  function actorNeedsTimeBinding(actor, worldTick) {
    return getActorTimeStatus(actor, worldTick).status === ACTOR_TIME_STATUS.UNBOUND;
  }

  function actorNeedsCatchUp(actor, worldTick) {
    return getActorTimeStatus(actor, worldTick).status === ACTOR_TIME_STATUS.BEHIND;
  }

  function isActorAvailable(actor, worldTick) {
    return getActorTimeStatus(actor, worldTick).status === ACTOR_TIME_STATUS.CURRENT;
  }

  function addTicks(worldTick, deltaTicks) {
    const base = normalizeTick(worldTick);
    const delta = normalizeTick(deltaTicks);
    if (base === null || delta === null) return null;
    const result = base + delta;
    return Number.isSafeInteger(result) ? result : null;
  }

  return {
    CLOCK_VERSION,
    TICKS_PER_SEGMENT,
    SEGMENTS_PER_ROUND,
    ROUNDS_PER_TURN,
    TURNS_PER_HOUR,
    HOURS_PER_DAY,
    TICKS_PER_ROUND,
    TICKS_PER_TURN,
    TICKS_PER_HOUR,
    TICKS_PER_DAY,
    ACTOR_TIME_STATUS,
    normalizeTick,
    campaignWorldTick,
    actorTimeRuntime,
    getActorTimeStatus,
    actorNeedsTimeBinding,
    actorNeedsCatchUp,
    isActorAvailable,
    addTicks,
  };
})();

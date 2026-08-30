// adnd-documents.js v0.2.0 — 2026-08-29
// v0.2.0 — Actor runtime integration support: normalization now preserves
//          non-plain objects such as Firestore Timestamp/FieldValue instances.
// Graycloak's lightweight Foundry-inspired document contract.
//
// This is deliberately an application abstraction, not a demand that all
// records live in one Firestore collection. Existing collections remain valid.
// The contract gives independently addressable game objects a stable identity,
// type, lifecycle metadata, and predictable references.
const ADNDDocuments = (function(){
  'use strict';

  const SCHEMA_VERSION = 1;
  const DOCUMENT_TYPES = Object.freeze({
    ACTOR: 'actor',
    ITEM: 'item',
    ACTIVE_EFFECT: 'activeEffect',
    ACTIVITY: 'activity',
    EVENT: 'event',
  });

  const ACTOR_TYPES = Object.freeze([
    'character', 'npc', 'henchman', 'hireling', 'mount', 'animal', 'monster',
  ]);

  function isPlainObject(value) {
    if (value == null || typeof value !== 'object') return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }
  function clonePlain(value) {
    if (value == null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(clonePlain);
    // Firestore Timestamps, FieldValue transforms, Dates, and other runtime
    // objects are values, not Graycloak document data to recursively reshape.
    if (!isPlainObject(value)) return value;
    const out = {};
    for (const [key, child] of Object.entries(value)) out[key] = clonePlain(child);
    return out;
  }

  function cleanId(value) {
    if (value == null || value === '') return null;
    return String(value);
  }

  function baseDocument(input, documentType) {
    input = input || {};
    return {
      id: cleanId(input.id),
      documentType,
      type: input.type || null,
      schemaVersion: Number.isInteger(input.schemaVersion) ? input.schemaVersion : SCHEMA_VERSION,
      campaignId: input.campaignId || null,
      name: input.name || '',
      createdAt: input.createdAt == null ? null : input.createdAt,
      updatedAt: input.updatedAt == null ? null : input.updatedAt,
    };
  }

  function actorRuntime(runtime) {
    runtime = runtime || {};
    return {
      lastResolvedTick: Number.isFinite(runtime.lastResolvedTick) ? runtime.lastResolvedTick : null,
      availableAtTick: Number.isFinite(runtime.availableAtTick) ? runtime.availableAtTick : null,
      activityId: cleanId(runtime.activityId),
    };
  }

  function createActor(input) {
    input = input || {};
    const actorType = input.type || 'character';
    const doc = Object.assign({}, clonePlain(input), baseDocument(input, DOCUMENT_TYPES.ACTOR), {
      type: actorType,
      runtime: actorRuntime(input.runtime),
    });
    return doc;
  }

  function createItem(input) {
    input = input || {};
    return Object.assign({}, clonePlain(input), baseDocument(input, DOCUMENT_TYPES.ITEM), {
      type: input.type || 'equipment',
      ownerActorId: cleanId(input.ownerActorId),
      definitionId: cleanId(input.definitionId),
      quantity: Number.isFinite(input.quantity) ? input.quantity : 1,
      system: clonePlain(input.system || {}),
    });
  }

  function createActiveEffect(input) {
    input = input || {};
    return Object.assign({}, clonePlain(input), baseDocument(input, DOCUMENT_TYPES.ACTIVE_EFFECT), {
      type: input.type || 'effect',
      ownerActorId: cleanId(input.ownerActorId),
      sourceDocumentId: cleanId(input.sourceDocumentId),
      startsAtTick: Number.isFinite(input.startsAtTick) ? input.startsAtTick : null,
      expiresAtTick: Number.isFinite(input.expiresAtTick) ? input.expiresAtTick : null,
      disabled: input.disabled === true,
      system: clonePlain(input.system || {}),
    });
  }

  function createActivity(input) {
    input = input || {};
    return Object.assign({}, clonePlain(input), baseDocument(input, DOCUMENT_TYPES.ACTIVITY), {
      type: input.type || 'activity',
      actorIds: Array.isArray(input.actorIds) ? input.actorIds.map(String) : [],
      startedAtTick: Number.isFinite(input.startedAtTick) ? input.startedAtTick : null,
      availableAtTick: Number.isFinite(input.availableAtTick) ? input.availableAtTick : null,
      status: input.status || 'pending',
      system: clonePlain(input.system || {}),
    });
  }

  function createGameEvent(input) {
    input = input || {};
    return Object.assign({}, clonePlain(input), baseDocument(input, DOCUMENT_TYPES.EVENT), {
      type: input.type || 'event',
      actorId: cleanId(input.actorId),
      targetIds: Array.isArray(input.targetIds) ? input.targetIds.map(String) : [],
      worldTick: Number.isFinite(input.worldTick) ? input.worldTick : null,
      rulesVersion: input.rulesVersion || null,
      commandId: cleanId(input.commandId),
      data: clonePlain(input.data || {}),
    });
  }

  // Compatibility bridge for characters created before the Document model.
  // No destructive migration is required: callers can normalize on read, then
  // persist the extra metadata only when that character is next legitimately
  // written.
  function normalizeCharacter(record, id) {
    record = record || {};
    return createActor(Object.assign({}, record, {
      id: cleanId(record.id) || cleanId(id),
      type: record.type || 'character',
    }));
  }

  function isDocument(value, documentType) {
    if (!value || typeof value !== 'object' || !value.documentType) return false;
    return documentType ? value.documentType === documentType : true;
  }

  return {
    SCHEMA_VERSION,
    DOCUMENT_TYPES,
    ACTOR_TYPES,
    actorRuntime,
    createActor,
    createItem,
    createActiveEffect,
    createActivity,
    createGameEvent,
    normalizeCharacter,
    isDocument,
  };
})();

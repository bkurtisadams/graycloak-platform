import {
  CHARACTER_DOCUMENT_TYPE,
  SHIP_DOCUMENT_TYPE,
  importCharacterDocument,
  importShipDocument
} from '../vendor/classic-traveller-rules/index.js?v=r0.81.0';

import {
  CAMPAIGN_DOCUMENT_TYPE,
  importCampaignDocument
} from './campaign-document.js';

import {
  CONTRACT_DOCUMENT_TYPE,
  importContractDocument
} from './contract-document.js';

import {
  SITUATION_DOCUMENT_TYPE,
  importSituationDocument
} from './situation-document.js';

import {
  CONTACT_DOCUMENT_TYPE,
  importContactDocument
} from './contact-document.js';

import {
  ADVENTURE_THREAD_DOCUMENT_TYPE,
  importAdventureThreadDocument
} from './adventure-thread-document.js';

import { ENCOUNTER_DOCUMENT_TYPE, importEncounterDocument } from './encounter-document.js';
import { NPC_ACTOR_DOCUMENT_TYPE, importNpcActorDocument } from './npc-actor-document.js';
import { SCENE_DOCUMENT_TYPE, importSceneDocument } from './scene-document.js';
import { MEDIA_ASSET_DOCUMENT_TYPE, importMediaAssetDocument } from './media-asset-document.js';
import { ACTIVITY_LOG_DOCUMENT_TYPE, importActivityLogDocument } from './activity-log-document.js';

import {
  CAMPAIGN_BUNDLE_TYPE,
  createCampaignBundle,
  importCampaignBundle
} from './campaign-bundle.js';

export const DOCUMENT_REGISTRY_SCHEMA_VERSION = 1;
export const DOCUMENT_REGISTRY_STORAGE_KEY = 'graycloak-traveller-document-registry-v1';
export const ACTIVE_CAMPAIGN_STORAGE_KEY = 'graycloak-traveller-active-campaign-id-v1';

function cloneJson(value) {
  return value === null || value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function validateDocument(document) {
  switch (document?.documentType) {
    case CHARACTER_DOCUMENT_TYPE: return importCharacterDocument(document);
    case SHIP_DOCUMENT_TYPE: return importShipDocument(document);
    case CAMPAIGN_DOCUMENT_TYPE: return importCampaignDocument(document);
    case CONTRACT_DOCUMENT_TYPE: return importContractDocument(document);
    case SITUATION_DOCUMENT_TYPE: return importSituationDocument(document);
    case CONTACT_DOCUMENT_TYPE: return importContactDocument(document);
    case ADVENTURE_THREAD_DOCUMENT_TYPE: return importAdventureThreadDocument(document);
    case ENCOUNTER_DOCUMENT_TYPE: return importEncounterDocument(document);
    case NPC_ACTOR_DOCUMENT_TYPE: return importNpcActorDocument(document);
    case SCENE_DOCUMENT_TYPE: return importSceneDocument(document);
    case MEDIA_ASSET_DOCUMENT_TYPE: return importMediaAssetDocument(document);
    case ACTIVITY_LOG_DOCUMENT_TYPE: return importActivityLogDocument(document);
    default: throw new Error(`unsupported registry documentType: ${document?.documentType ?? '(missing)'}`);
  }
}

function idFor(document) {
  return document?.identity?.id;
}

export function createMemoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { map.set(key, String(value)); },
    removeItem(key) { map.delete(key); },
    snapshot() { return Object.fromEntries(map.entries()); }
  };
}

export function createDocumentRegistry({
  storage,
  storageKey = DOCUMENT_REGISTRY_STORAGE_KEY,
  activeCampaignKey = ACTIVE_CAMPAIGN_STORAGE_KEY
} = {}) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    throw new TypeError('storage must provide getItem and setItem');
  }

  function readState() {
    const raw = storage.getItem(storageKey);
    if (!raw) return { schemaVersion: DOCUMENT_REGISTRY_SCHEMA_VERSION, documents: {} };
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new Error(`invalid Traveller document registry JSON: ${error.message}`);
    }
    if (parsed?.schemaVersion !== DOCUMENT_REGISTRY_SCHEMA_VERSION || !parsed.documents || typeof parsed.documents !== 'object' || Array.isArray(parsed.documents)) {
      throw new Error('unsupported Traveller document registry version');
    }
    return parsed;
  }

  function writeState(state) {
    storage.setItem(storageKey, JSON.stringify(state));
  }

  // v0.124.0: every put() used to parse the whole registry, replace one key and
  // serialize the whole registry back. A pass over N documents therefore cost N
  // full round-trips, which is quadratic in the registry's size: measured
  // against Type C cruiser documents, 10 documents took 15ms and 100 took
  // 394ms. Validation was 4% of that — the cost is the JSON round-trip, so the
  // fix is to do it once per batch rather than once per document.
  //
  // putAll is that batch. put() is putAll of one, so there is a single write
  // path and no second implementation to drift.
  function putAll(documents) {
    if (!Array.isArray(documents)) throw new TypeError('putAll takes an array of documents');
    const validatedEntries = documents.map((document) => {
      const validated = validateDocument(document);
      const id = idFor(validated);
      if (typeof id !== 'string' || !id) throw new Error('registry documents require identity.id');
      return [id, validated];
    });
    if (!validatedEntries.length) return [];
    // Every document is validated before anything is written, so a bad
    // document in the batch leaves the registry untouched rather than half
    // updated.
    const state = readState();
    for (const [id, validated] of validatedEntries) state.documents[id] = validated;
    writeState(state);
    return validatedEntries.map(([, validated]) => cloneJson(validated));
  }

  function put(document) {
    return putAll([document])[0];
  }

  function get(id) {
    const entry = readState().documents[id];
    return entry ? validateDocument(entry) : null;
  }

  function remove(id) {
    const state = readState();
    delete state.documents[id];
    writeState(state);
  }

  function putBundle(bundle) {
    const validated = importCampaignBundle(bundle);
    // One write for the whole bundle. Importing a campaign used to be the worst
    // case in the registry: a document per put, each paying for the entire
    // registry.
    putAll([
      ...validated.documents.characters,
      ...validated.documents.ships,
      ...validated.documents.contracts,
      ...validated.documents.situations,
      ...validated.documents.contacts,
      ...validated.documents.threads,
      ...validated.documents.encounters,
      ...validated.documents.npcActors,
      ...validated.documents.assets,
      ...validated.documents.activityLogs,
      ...(validated.documents.scenes ?? []),
      validated.campaign
    ]);
    return cloneJson(validated);
  }

  function resolveCampaign(campaignOrId) {
    // One parse of the registry for the whole resolve. This used to call get()
    // per reference across eleven categories, and get() parses everything.
    const snapshot = readState().documents;
    const fromSnapshot = (id) => {
      const entry = snapshot[id];
      return entry ? validateDocument(entry) : null;
    };
    const campaign = typeof campaignOrId === 'string'
      ? fromSnapshot(campaignOrId)
      : importCampaignDocument(campaignOrId);
    if (!campaign || campaign.documentType !== CAMPAIGN_DOCUMENT_TYPE) {
      throw new Error(`campaign not found: ${typeof campaignOrId === 'string' ? campaignOrId : '(document)'}`);
    }

    const characters = [];
    const ships = [];
    const contracts = [];
    const situations = [];
    const contacts = [];
    const threads = [];
    const encounters = [];
    const npcActors = [];
    const scenes = [];
    const assets = [];
    const activityLogs = [];
    const missing = [];
    for (const ref of campaign.documentRefs.characters) {
      const document = fromSnapshot(ref.id);
      if (!document || document.documentType !== CHARACTER_DOCUMENT_TYPE) missing.push(ref.id);
      else characters.push(document);
    }
    for (const ref of campaign.documentRefs.ships) {
      const document = fromSnapshot(ref.id);
      if (!document || document.documentType !== SHIP_DOCUMENT_TYPE) missing.push(ref.id);
      else ships.push(document);
    }
    for (const ref of campaign.documentRefs.contracts) {
      const document = fromSnapshot(ref.id);
      if (!document || document.documentType !== CONTRACT_DOCUMENT_TYPE) missing.push(ref.id);
      else contracts.push(document);
    }
    for (const ref of campaign.documentRefs.situations) {
      const document = fromSnapshot(ref.id);
      if (!document || document.documentType !== SITUATION_DOCUMENT_TYPE) missing.push(ref.id);
      else situations.push(document);
    }
    for (const ref of campaign.documentRefs.contacts) {
      const document = fromSnapshot(ref.id);
      if (!document || document.documentType !== CONTACT_DOCUMENT_TYPE) missing.push(ref.id);
      else contacts.push(document);
    }
    for (const ref of campaign.documentRefs.threads) {
      const document = fromSnapshot(ref.id);
      if (!document || document.documentType !== ADVENTURE_THREAD_DOCUMENT_TYPE) missing.push(ref.id);
      else threads.push(document);
    }
    for (const ref of campaign.documentRefs.encounters) {
      const document = fromSnapshot(ref.id);
      if (!document || document.documentType !== ENCOUNTER_DOCUMENT_TYPE) missing.push(ref.id);
      else encounters.push(document);
    }
    for (const ref of campaign.documentRefs.npcActors) {
      const document = fromSnapshot(ref.id);
      if (!document || document.documentType !== NPC_ACTOR_DOCUMENT_TYPE) missing.push(ref.id);
      else npcActors.push(document);
    }
    for (const ref of campaign.documentRefs.assets) {
      const document = fromSnapshot(ref.id);
      if (!document || document.documentType !== MEDIA_ASSET_DOCUMENT_TYPE) missing.push(ref.id);
      else assets.push(document);
    }
    for (const ref of campaign.documentRefs.activityLogs) {
      const document = fromSnapshot(ref.id);
      if (!document || document.documentType !== ACTIVITY_LOG_DOCUMENT_TYPE) missing.push(ref.id);
      else activityLogs.push(document);
    }
    for (const ref of campaign.documentRefs.scenes ?? []) {
      const document = fromSnapshot(ref.id);
      if (!document || document.documentType !== SCENE_DOCUMENT_TYPE) missing.push(ref.id);
      else scenes.push(document);
    }
    return { campaign, characters, ships, contracts, situations, contacts, threads, encounters, npcActors, assets, activityLogs, scenes, missing };
  }

  function buildBundle(campaignOrId) {
    const resolved = resolveCampaign(campaignOrId);
    if (resolved.missing.length) throw new Error(`campaign has missing referenced documents: ${resolved.missing.join(', ')}`);
    return createCampaignBundle(resolved.campaign, {
      characters: resolved.characters,
      ships: resolved.ships,
      contracts: resolved.contracts,
      situations: resolved.situations,
      contacts: resolved.contacts,
      threads: resolved.threads,
      encounters: resolved.encounters,
      npcActors: resolved.npcActors,
      assets: resolved.assets,
      activityLogs: resolved.activityLogs,
      scenes: resolved.scenes
    });
  }

  function setActiveCampaignId(id) {
    if (id === null || id === undefined || id === '') storage.removeItem(activeCampaignKey);
    else storage.setItem(activeCampaignKey, String(id));
  }

  function getActiveCampaignId() {
    return storage.getItem(activeCampaignKey);
  }

  // v1.214.00: a ship combat checkpoint, ported from a parallel implementation.
  // This supersedes the localStorage resume added in v0.133.0 for the part that
  // mattered: checking whether an outcome has already been applied, writing the
  // final ship, and marking the fight closed are ONE registry write. A marker
  // plus a separate write is not atomic, and a fight closed twice would
  // otherwise apply its damage twice.
  //
  // Returns false when the fight has already been closed, so a duplicate close
  // is a no-op rather than a second application.
  // One registry write commits the checkpoint and final ship together locally.
  function saveShipCombat(campaignId, encounter, { finalShip = null, finalCampaign = null } = {}) {
    const state = readState();
    state.shipCombats ??= {};
    const previous = state.shipCombats[campaignId];
    state.shipCombatArchives ??= {};
    if (state.shipCombatArchives[encounter.id] || (previous?.encounter?.id === encounter.id && previous.closed)) return false;
    if (encounter.campaignId !== campaignId) throw new Error('combat belongs to another campaign');
    if (finalShip) {
      const validated = validateDocument(finalShip);
      if (!encounter.participants.some(p => p.ship.identity.id === idFor(validated))) throw new Error('final ship is not a participant');
      state.documents[idFor(validated)] = validated;
    }
    if (finalCampaign) {
      const validated = validateDocument(finalCampaign);
      if (idFor(validated) !== campaignId) throw new Error('wrong campaign');
      state.documents[campaignId] = validated;
    }
    state.shipCombats[campaignId] = { encounter: cloneJson(encounter), closed: Boolean(finalShip) };
    if (finalShip) state.shipCombatArchives[encounter.id] = cloneJson(state.shipCombats[campaignId]);
    writeState(state);
    return true;
  }
  function getShipCombat(campaignId) { return cloneJson(readState().shipCombats?.[campaignId] ?? null); }

  return Object.freeze({
    put,
    putAll,
    saveShipCombat,
    getShipCombat,
    get,
    remove,
    putBundle,
    resolveCampaign,
    buildBundle,
    setActiveCampaignId,
    getActiveCampaignId,
    getState: () => cloneJson(readState())
  });
}

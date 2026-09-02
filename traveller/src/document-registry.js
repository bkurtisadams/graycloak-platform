import {
  CHARACTER_DOCUMENT_TYPE,
  SHIP_DOCUMENT_TYPE,
  importCharacterDocument,
  importShipDocument
} from '../../packages/classic-traveller-rules/index.js';

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
import { MEDIA_ASSET_DOCUMENT_TYPE, importMediaAssetDocument } from './media-asset-document.js';

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
    case MEDIA_ASSET_DOCUMENT_TYPE: return importMediaAssetDocument(document);
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

  function put(document) {
    const validated = validateDocument(document);
    const id = idFor(validated);
    if (typeof id !== 'string' || !id) throw new Error('registry documents require identity.id');
    const state = readState();
    state.documents[id] = validated;
    writeState(state);
    return cloneJson(validated);
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
    for (const character of validated.documents.characters) put(character);
    for (const ship of validated.documents.ships) put(ship);
    for (const contract of validated.documents.contracts) put(contract);
    for (const situation of validated.documents.situations) put(situation);
    for (const contact of validated.documents.contacts) put(contact);
    for (const thread of validated.documents.threads) put(thread);
    for (const encounter of validated.documents.encounters) put(encounter);
    for (const actor of validated.documents.npcActors) put(actor);
    for (const asset of validated.documents.assets) put(asset);
    put(validated.campaign);
    return cloneJson(validated);
  }

  function resolveCampaign(campaignOrId) {
    const campaign = typeof campaignOrId === 'string'
      ? get(campaignOrId)
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
    const assets = [];
    const missing = [];
    for (const ref of campaign.documentRefs.characters) {
      const document = get(ref.id);
      if (!document || document.documentType !== CHARACTER_DOCUMENT_TYPE) missing.push(ref.id);
      else characters.push(document);
    }
    for (const ref of campaign.documentRefs.ships) {
      const document = get(ref.id);
      if (!document || document.documentType !== SHIP_DOCUMENT_TYPE) missing.push(ref.id);
      else ships.push(document);
    }
    for (const ref of campaign.documentRefs.contracts) {
      const document = get(ref.id);
      if (!document || document.documentType !== CONTRACT_DOCUMENT_TYPE) missing.push(ref.id);
      else contracts.push(document);
    }
    for (const ref of campaign.documentRefs.situations) {
      const document = get(ref.id);
      if (!document || document.documentType !== SITUATION_DOCUMENT_TYPE) missing.push(ref.id);
      else situations.push(document);
    }
    for (const ref of campaign.documentRefs.contacts) {
      const document = get(ref.id);
      if (!document || document.documentType !== CONTACT_DOCUMENT_TYPE) missing.push(ref.id);
      else contacts.push(document);
    }
    for (const ref of campaign.documentRefs.threads) {
      const document = get(ref.id);
      if (!document || document.documentType !== ADVENTURE_THREAD_DOCUMENT_TYPE) missing.push(ref.id);
      else threads.push(document);
    }
    for (const ref of campaign.documentRefs.encounters) {
      const document = get(ref.id);
      if (!document || document.documentType !== ENCOUNTER_DOCUMENT_TYPE) missing.push(ref.id);
      else encounters.push(document);
    }
    for (const ref of campaign.documentRefs.npcActors) {
      const document = get(ref.id);
      if (!document || document.documentType !== NPC_ACTOR_DOCUMENT_TYPE) missing.push(ref.id);
      else npcActors.push(document);
    }
    for (const ref of campaign.documentRefs.assets) {
      const document = get(ref.id);
      if (!document || document.documentType !== MEDIA_ASSET_DOCUMENT_TYPE) missing.push(ref.id);
      else assets.push(document);
    }
    return { campaign, characters, ships, contracts, situations, contacts, threads, encounters, npcActors, assets, missing };
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
      assets: resolved.assets
    });
  }

  function setActiveCampaignId(id) {
    if (id === null || id === undefined || id === '') storage.removeItem(activeCampaignKey);
    else storage.setItem(activeCampaignKey, String(id));
  }

  function getActiveCampaignId() {
    return storage.getItem(activeCampaignKey);
  }

  return Object.freeze({
    put,
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

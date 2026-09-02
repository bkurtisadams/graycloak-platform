import {
  assertValidCharacterDocument,
  assertValidShipDocument,
  importCharacterDocument,
  importShipDocument
} from '../../packages/classic-traveller-rules/index.js';

import {
  CAMPAIGN_DOCUMENT_TYPE,
  assertValidCampaignDocument,
  importCampaignDocument
} from './campaign-document.js';

import {
  assertValidContractDocument,
  importContractDocument
} from './contract-document.js';

import {
  assertValidSituationDocument,
  importSituationDocument
} from './situation-document.js';

import {
  assertValidContactDocument,
  importContactDocument
} from './contact-document.js';

import {
  assertValidAdventureThreadDocument,
  importAdventureThreadDocument
} from './adventure-thread-document.js';

export const CAMPAIGN_BUNDLE_TYPE = 'graycloak-traveller-campaign-bundle';
export const CURRENT_CAMPAIGN_BUNDLE_SCHEMA_VERSION = 4;
export const SUPPORTED_CAMPAIGN_BUNDLE_SCHEMA_VERSIONS = Object.freeze([1, 2, 3, 4]);

export class CampaignBundleValidationError extends Error {
  constructor(errors) {
    const list = Array.isArray(errors) ? errors : [String(errors)];
    super(`invalid Graycloak Traveller campaign bundle: ${list.join('; ')}`);
    this.name = 'CampaignBundleValidationError';
    this.errors = Object.freeze([...list]);
  }
}

function cloneJson(value) { return JSON.parse(JSON.stringify(value)); }
function parseJson(input) {
  if (typeof input !== 'string') return input;
  try { return JSON.parse(input); }
  catch (error) { throw new CampaignBundleValidationError(`invalid JSON: ${error.message}`); }
}
function ids(entries) { return entries.map((entry) => entry.identity.id); }
function assertUnique(entries, label) {
  const values = ids(entries);
  if (new Set(values).size !== values.length) throw new CampaignBundleValidationError(`${label} document IDs must be unique`);
}
function exactIdSet(actual, expected, label) {
  const actualSorted = [...actual].sort();
  const expectedSorted = [...expected].sort();
  if (JSON.stringify(actualSorted) !== JSON.stringify(expectedSorted)) {
    throw new CampaignBundleValidationError(`${label} documents must exactly match campaign references`);
  }
}

export function createCampaignBundle(campaign, { characters = [], ships = [], contracts = [], situations = [], contacts = [], threads = [] } = {}) {
  assertValidCampaignDocument(campaign);
  for (const document of characters) assertValidCharacterDocument(document);
  for (const document of ships) assertValidShipDocument(document);
  for (const document of contracts) assertValidContractDocument(document);
  for (const document of situations) assertValidSituationDocument(document);
  for (const document of contacts) assertValidContactDocument(document);
  for (const document of threads) assertValidAdventureThreadDocument(document);
  assertUnique(characters, 'character');
  assertUnique(ships, 'ship');
  assertUnique(contracts, 'contract');
  assertUnique(situations, 'situation');
  assertUnique(contacts, 'contact');
  assertUnique(threads, 'thread');

  exactIdSet(ids(characters), campaign.documentRefs.characters.map((ref) => ref.id), 'character');
  exactIdSet(ids(ships), campaign.documentRefs.ships.map((ref) => ref.id), 'ship');
  exactIdSet(ids(contracts), campaign.documentRefs.contracts.map((ref) => ref.id), 'contract');
  exactIdSet(ids(situations), campaign.documentRefs.situations.map((ref) => ref.id), 'situation');
  exactIdSet(ids(contacts), campaign.documentRefs.contacts.map((ref) => ref.id), 'contact');
  exactIdSet(ids(threads), campaign.documentRefs.threads.map((ref) => ref.id), 'thread');

  const characterIds = new Set(ids(characters));
  const shipIds = new Set(ids(ships));
  for (const ship of ships) {
    if (ship.authority.assignedCharacterId) {
      if (!characterIds.has(ship.authority.assignedCharacterId)) {
        throw new CampaignBundleValidationError(`ship ${ship.identity.id} assigned character is missing from bundle: ${ship.authority.assignedCharacterId}`);
      }
      const linkedCharacter = characters.find((entry) => entry.identity.id === ship.authority.assignedCharacterId);
      if (linkedCharacter && !linkedCharacter.shipRefs.some((ref) => ref.shipId === ship.identity.id)) {
        throw new CampaignBundleValidationError(`ship ${ship.identity.id} is not referenced by assigned character ${linkedCharacter.identity.id}`);
      }
    }
  }
  for (const contract of contracts) {
    if (!characterIds.has(contract.assigned.characterId)) {
      throw new CampaignBundleValidationError(`contract ${contract.identity.id} assigned character is missing from bundle: ${contract.assigned.characterId}`);
    }
    if (!shipIds.has(contract.assigned.shipId)) {
      throw new CampaignBundleValidationError(`contract ${contract.identity.id} assigned ship is missing from bundle: ${contract.assigned.shipId}`);
    }
  }
  const situationIds = new Set(ids(situations));
  const contactIds = new Set(ids(contacts));
  const contractIds = new Set(ids(contracts));
  for (const thread of threads) {
    for (const id of thread.situationIds) if (!situationIds.has(id)) throw new CampaignBundleValidationError(`thread ${thread.identity.id} references missing situation: ${id}`);
    for (const id of thread.contactIds) if (!contactIds.has(id)) throw new CampaignBundleValidationError(`thread ${thread.identity.id} references missing contact: ${id}`);
    for (const id of thread.contractIds) if (!contractIds.has(id)) throw new CampaignBundleValidationError(`thread ${thread.identity.id} references missing contract: ${id}`);
  }

  return {
    documentType: CAMPAIGN_BUNDLE_TYPE,
    schemaVersion: CURRENT_CAMPAIGN_BUNDLE_SCHEMA_VERSION,
    campaign: cloneJson(campaign),
    documents: {
      characters: cloneJson(characters),
      ships: cloneJson(ships),
      contracts: cloneJson(contracts),
      situations: cloneJson(situations),
      contacts: cloneJson(contacts),
      threads: cloneJson(threads)
    }
  };
}

export function importCampaignBundle(input) {
  const parsed = parseJson(input);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new CampaignBundleValidationError('bundle must be an object');
  if (parsed.documentType !== CAMPAIGN_BUNDLE_TYPE) throw new CampaignBundleValidationError(`documentType must be ${CAMPAIGN_BUNDLE_TYPE}`);
  if (!SUPPORTED_CAMPAIGN_BUNDLE_SCHEMA_VERSIONS.includes(parsed.schemaVersion)) {
    throw new CampaignBundleValidationError(`unsupported schemaVersion: ${parsed.schemaVersion}`);
  }
  if (!parsed.campaign || parsed.campaign.documentType !== CAMPAIGN_DOCUMENT_TYPE) {
    throw new CampaignBundleValidationError('bundle.campaign must be a Campaign Document');
  }
  if (!parsed.documents || !Array.isArray(parsed.documents.characters) || !Array.isArray(parsed.documents.ships)) {
    throw new CampaignBundleValidationError('bundle.documents must contain character and ship arrays');
  }

  const campaign = importCampaignDocument(parsed.campaign);
  const characters = parsed.documents.characters.map((entry) => importCharacterDocument(entry));
  const ships = parsed.documents.ships.map((entry) => importShipDocument(entry));
  const contracts = (parsed.documents.contracts ?? []).map((entry) => importContractDocument(entry));
  const situations = (parsed.documents.situations ?? []).map((entry) => importSituationDocument(entry));
  const contacts = (parsed.documents.contacts ?? []).map((entry) => importContactDocument(entry));
  const threads = (parsed.documents.threads ?? []).map((entry) => importAdventureThreadDocument(entry));
  return createCampaignBundle(campaign, { characters, ships, contracts, situations, contacts, threads });
}

export function exportCampaignBundle(bundle, { space = 2 } = {}) {
  const validated = importCampaignBundle(bundle);
  return JSON.stringify(validated, null, space);
}

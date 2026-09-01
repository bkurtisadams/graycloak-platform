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

export const CAMPAIGN_BUNDLE_TYPE = 'graycloak-traveller-campaign-bundle';
export const CURRENT_CAMPAIGN_BUNDLE_SCHEMA_VERSION = 1;

export class CampaignBundleValidationError extends Error {
  constructor(errors) {
    const list = Array.isArray(errors) ? errors : [String(errors)];
    super(`invalid Graycloak Traveller campaign bundle: ${list.join('; ')}`);
    this.name = 'CampaignBundleValidationError';
    this.errors = Object.freeze([...list]);
  }
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function parseJson(input) {
  if (typeof input !== 'string') return input;
  try {
    return JSON.parse(input);
  } catch (error) {
    throw new CampaignBundleValidationError(`invalid JSON: ${error.message}`);
  }
}

function ids(entries) {
  return entries.map((entry) => entry.identity.id);
}

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

export function createCampaignBundle(campaign, { characters = [], ships = [] } = {}) {
  assertValidCampaignDocument(campaign);
  for (const document of characters) assertValidCharacterDocument(document);
  for (const document of ships) assertValidShipDocument(document);
  assertUnique(characters, 'character');
  assertUnique(ships, 'ship');

  exactIdSet(ids(characters), campaign.documentRefs.characters.map((ref) => ref.id), 'character');
  exactIdSet(ids(ships), campaign.documentRefs.ships.map((ref) => ref.id), 'ship');

  const characterIds = new Set(ids(characters));
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

  return {
    documentType: CAMPAIGN_BUNDLE_TYPE,
    schemaVersion: CURRENT_CAMPAIGN_BUNDLE_SCHEMA_VERSION,
    campaign: cloneJson(campaign),
    documents: {
      characters: cloneJson(characters),
      ships: cloneJson(ships)
    }
  };
}

export function importCampaignBundle(input) {
  const parsed = parseJson(input);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new CampaignBundleValidationError('bundle must be an object');
  }
  if (parsed.documentType !== CAMPAIGN_BUNDLE_TYPE) {
    throw new CampaignBundleValidationError(`documentType must be ${CAMPAIGN_BUNDLE_TYPE}`);
  }
  if (parsed.schemaVersion !== CURRENT_CAMPAIGN_BUNDLE_SCHEMA_VERSION) {
    throw new CampaignBundleValidationError(`schemaVersion must be ${CURRENT_CAMPAIGN_BUNDLE_SCHEMA_VERSION}`);
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
  return createCampaignBundle(campaign, { characters, ships });
}

export function exportCampaignBundle(bundle, { space = 2 } = {}) {
  const validated = importCampaignBundle(bundle);
  return JSON.stringify(validated, null, space);
}

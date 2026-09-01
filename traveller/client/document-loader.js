import {
  CHARACTER_DOCUMENT_TYPE,
  SHIP_DOCUMENT_TYPE,
  importCharacter,
  importCharacterDocument,
  importShipDocument
} from '../../packages/classic-traveller-rules/index.js';

import {
  CAMPAIGN_DOCUMENT_TYPE,
  importCampaignDocument
} from '../src/campaign-document.js';

import {
  CONTRACT_DOCUMENT_TYPE,
  importContractDocument
} from '../src/contract-document.js';

import {
  CAMPAIGN_BUNDLE_TYPE,
  importCampaignBundle
} from '../src/campaign-bundle.js';

export const TRAVELLER_DOCUMENT_KINDS = Object.freeze({
  CHARGEN: 'chargen',
  CHARACTER: 'character',
  SHIP: 'ship',
  CAMPAIGN: 'campaign',
  CONTRACT: 'contract',
  CAMPAIGN_BUNDLE: 'campaign-bundle'
});

function parseJson(input) {
  if (typeof input !== 'string') return input;
  try {
    return JSON.parse(input);
  } catch (error) {
    throw new Error(`invalid JSON: ${error.message}`);
  }
}

export function loadTravellerDocument(input) {
  const parsed = parseJson(input);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new TypeError('Traveller JSON must contain an object document');
  }

  if (parsed.documentType === CHARACTER_DOCUMENT_TYPE) {
    return {
      kind: TRAVELLER_DOCUMENT_KINDS.CHARACTER,
      characterDocument: importCharacterDocument(parsed)
    };
  }

  if (parsed.documentType === SHIP_DOCUMENT_TYPE) {
    return {
      kind: TRAVELLER_DOCUMENT_KINDS.SHIP,
      shipDocument: importShipDocument(parsed)
    };
  }

  if (parsed.documentType === CAMPAIGN_DOCUMENT_TYPE) {
    return {
      kind: TRAVELLER_DOCUMENT_KINDS.CAMPAIGN,
      campaignDocument: importCampaignDocument(parsed)
    };
  }

  if (parsed.documentType === CONTRACT_DOCUMENT_TYPE) {
    return {
      kind: TRAVELLER_DOCUMENT_KINDS.CONTRACT,
      contractDocument: importContractDocument(parsed)
    };
  }

  if (parsed.documentType === CAMPAIGN_BUNDLE_TYPE) {
    return {
      kind: TRAVELLER_DOCUMENT_KINDS.CAMPAIGN_BUNDLE,
      campaignBundle: importCampaignBundle(parsed)
    };
  }

  if (parsed.documentType !== undefined) {
    throw new Error(`unsupported Traveller documentType: ${parsed.documentType}`);
  }

  return {
    kind: TRAVELLER_DOCUMENT_KINDS.CHARGEN,
    character: importCharacter(parsed)
  };
}

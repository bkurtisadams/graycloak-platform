import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  TRAVELLER_DOCUMENT_KINDS,
  loadTravellerDocument
} from '../client/document-loader.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const examples = path.resolve(here, '../examples');

async function readExample(name) {
  return readFile(path.join(examples, name), 'utf8');
}

test('loader accepts a v0.7 gameplay Character Document instead of sending it to chargen import', async () => {
  const loaded = loadTravellerDocument(await readExample('Hawkeye.character.json'));
  assert.equal(loaded.kind, TRAVELLER_DOCUMENT_KINDS.CHARACTER);
  assert.equal(loaded.characterDocument.documentType, 'classic-traveller-character');
  assert.equal(loaded.characterDocument.schemaVersion, 2);
  assert.equal(loaded.characterDocument.identity.name, 'Hawkeye');
});

test('loader accepts a separate Ship Document', async () => {
  const loaded = loadTravellerDocument(await readExample('Hawkeye.ship.json'));
  assert.equal(loaded.kind, TRAVELLER_DOCUMENT_KINDS.SHIP);
  assert.equal(loaded.shipDocument.documentType, 'classic-traveller-ship');
  assert.equal(loaded.shipDocument.schemaVersion, 3);
});

test('loader rejects unknown typed documents instead of misrouting them as chargen', () => {
  assert.throws(
    () => loadTravellerDocument({ documentType: 'unknown-traveller-document', schemaVersion: 1 }),
    /unsupported Traveller documentType/
  );
});


test('loader recognizes Campaign Documents and portable Campaign Bundles', async () => {
  const { importCharacterDocument, importShipDocument } = await import('../../packages/classic-traveller-rules/index.js');
  const { createCampaignDocument } = await import('../src/campaign-document.js');
  const { createCampaignBundle } = await import('../src/campaign-bundle.js');
  const character = importCharacterDocument(await readExample('Hawkeye.character.json'));
  const ship = importShipDocument(await readExample('Hawkeye.ship.json'));
  const campaign = createCampaignDocument({
    id: 'campaign-loader-test',
    characters: [character],
    ships: [ship],
    partyCharacterIds: [character.identity.id],
    activeShipId: ship.identity.id
  });

  const campaignLoaded = loadTravellerDocument(campaign);
  assert.equal(campaignLoaded.kind, TRAVELLER_DOCUMENT_KINDS.CAMPAIGN);
  assert.equal(campaignLoaded.campaignDocument.identity.id, 'campaign-loader-test');

  const bundleLoaded = loadTravellerDocument(createCampaignBundle(campaign, { characters: [character], ships: [ship] }));
  assert.equal(bundleLoaded.kind, TRAVELLER_DOCUMENT_KINDS.CAMPAIGN_BUNDLE);
  assert.equal(bundleLoaded.campaignBundle.documents.characters[0].identity.name, 'Hawkeye');
});


test('loader recognizes a persistent Contract Document', async () => {
  const { createContractDocument } = await import('../src/contract-document.js');
  const contract = createContractDocument({
    offerId: 'loader-contract-offer', kind: 'survey', title: 'Route Verification Survey',
    rulesBasis: 'sea-of-suns-original', setting: 'Sea of Suns', issuerName: 'Survey Bureau', issuerType: 'survey',
    originSystemId: 'calder', originSystemName: 'Calder', destinationSystemId: 'aster', destinationSystemName: 'Aster',
    paymentCr: 18000, deadlineDays: 21, cargoTons: 0, exclusiveShip: false,
    requirementsDescription: 'Verify route.', notes: ''
  }, {
    acceptedByCharacterId: 'char-hawkeye', acceptedShipId: 'ship-marisol', acceptedDate: { year: 4800, dayOfYear: 8 }
  });
  const loaded = loadTravellerDocument(contract);
  assert.equal(loaded.kind, TRAVELLER_DOCUMENT_KINDS.CONTRACT);
  assert.equal(loaded.contractDocument.identity.title, 'Route Verification Survey');
});

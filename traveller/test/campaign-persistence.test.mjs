import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  importCharacterDocument,
  importShipDocument
} from '../../packages/classic-traveller-rules/index.js';

import {
  createCampaignDocument,
  exportCampaignDocument,
  importCampaignDocument,
  updateCampaignLocation,
  updateCampaignTime
} from '../src/campaign-document.js';

import {
  createCampaignBundle,
  exportCampaignBundle,
  importCampaignBundle
} from '../src/campaign-bundle.js';

import {
  createDocumentRegistry,
  createMemoryStorage
} from '../src/document-registry.js';

import {
  buildCampaignRecord
} from '../client/ui-model.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const examples = path.resolve(here, '../examples');

async function acceptanceDocuments() {
  const character = importCharacterDocument(await readFile(path.join(examples, 'Hawkeye.character.json'), 'utf8'));
  const ship = importShipDocument(await readFile(path.join(examples, 'Hawkeye.ship.json'), 'utf8'));
  return { character, ship };
}

function campaignFor(character, ship) {
  return createCampaignDocument({
    id: 'campaign-hawkeye-test',
    name: 'Aurelia Campaign',
    time: { year: 4800, dayOfYear: 1, secondsOfDay: 0 },
    location: { systemName: 'Port Meridian', worldName: 'New Esperanza' },
    characters: [character],
    ships: [ship],
    partyCharacterIds: [character.identity.id],
    activeShipId: ship.identity.id
  });
}

test('Campaign Document v1 links Hawkeye and Marisol by stable IDs without embedding them', async () => {
  const { character, ship } = await acceptanceDocuments();
  const campaign = campaignFor(character, ship);
  const roundTrip = importCampaignDocument(exportCampaignDocument(campaign));

  assert.equal(roundTrip.documentType, 'graycloak-traveller-campaign');
  assert.equal(roundTrip.schemaVersion, 1);
  assert.deepEqual(roundTrip.party.characterIds, [character.identity.id]);
  assert.equal(roundTrip.activeShipId, ship.identity.id);
  assert.deepEqual(roundTrip.documentRefs.characters, [{ id: character.identity.id, name: 'Hawkeye' }]);
  assert.equal(roundTrip.documentRefs.ships[0].name, 'Marisol');
  assert.equal(roundTrip.documents, undefined);
});

test('campaign date and free-text location remain editable campaign state', async () => {
  const { character, ship } = await acceptanceDocuments();
  let campaign = campaignFor(character, ship);
  campaign = updateCampaignTime(campaign, { dayOfYear: 42, year: 4801 });
  campaign = updateCampaignLocation(campaign, { systemName: 'Aster', worldName: 'Far Harbor' });

  assert.equal(campaign.time.dayOfYear, 42);
  assert.equal(campaign.time.year, 4801);
  assert.equal(campaign.location.systemName, 'Aster');
  assert.equal(campaign.location.worldName, 'Far Harbor');
});

test('portable Campaign Bundle contains the campaign plus exactly its referenced documents', async () => {
  const { character, ship } = await acceptanceDocuments();
  const campaign = campaignFor(character, ship);
  const bundle = createCampaignBundle(campaign, { characters: [character], ships: [ship] });
  const roundTrip = importCampaignBundle(exportCampaignBundle(bundle));

  assert.equal(roundTrip.documentType, 'graycloak-traveller-campaign-bundle');
  assert.equal(roundTrip.documents.characters.length, 1);
  assert.equal(roundTrip.documents.ships.length, 1);
  assert.equal(roundTrip.documents.characters[0].identity.id, character.identity.id);
  assert.equal(roundTrip.documents.ships[0].identity.id, ship.identity.id);
});

test('local document registry restores a saved campaign in a fresh registry instance', async () => {
  const { character, ship } = await acceptanceDocuments();
  const campaign = campaignFor(character, ship);
  const storage = createMemoryStorage();

  const firstSession = createDocumentRegistry({ storage });
  firstSession.put(character);
  firstSession.put(ship);
  firstSession.put(campaign);
  firstSession.setActiveCampaignId(campaign.identity.id);

  const secondSession = createDocumentRegistry({ storage });
  assert.equal(secondSession.getActiveCampaignId(), campaign.identity.id);
  const resolved = secondSession.resolveCampaign(campaign.identity.id);
  assert.deepEqual(resolved.missing, []);
  assert.equal(resolved.characters[0].identity.name, 'Hawkeye');
  assert.equal(resolved.ships[0].identity.name, 'Marisol');

  const bundle = secondSession.buildBundle(campaign.identity.id);
  assert.equal(bundle.campaign.identity.id, campaign.identity.id);
});

test('campaign status record shows date, location, party, and active Marisol', async () => {
  const { character, ship } = await acceptanceDocuments();
  const campaign = campaignFor(character, ship);
  const record = buildCampaignRecord(campaign, { characters: [character], ships: [ship], missing: [] });

  assert.match(record, /CAMPAIGN STATUS/);
  assert.match(record, /DATE 001-4800 00:00/);
  assert.match(record, /LOCATION SYSTEM Port Meridian \/ WORLD New Esperanza/);
  assert.match(record, /ACTIVE SHIP Marisol \/ S-17384 \/ TYPE S/);
  assert.match(record, /PARTY Hawkeye \/ SCOUTS \/ UPP AB5678 \/ Cr80,000/);
});

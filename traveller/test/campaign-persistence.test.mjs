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
  addCharacterToCampaign,
  createCampaignDocument,
  exportCampaignDocument,
  importCampaignDocument,
  updateCampaignLocation,
  updateCampaignTime,
  advanceCampaignSeconds,
  campaignClockLabel,
  COMBAT_ROUND_SECONDS,
  speculativeLotPurchasedQuantity,
  recordSpeculativeLotPurchase,
  setActiveCampaignCharacter
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

test('Campaign Document v9 links campaign records and identifies the active party character', async () => {
  const { character, ship } = await acceptanceDocuments();
  const campaign = campaignFor(character, ship);
  const roundTrip = importCampaignDocument(exportCampaignDocument(campaign));

  assert.equal(roundTrip.documentType, 'graycloak-traveller-campaign');
  assert.equal(roundTrip.schemaVersion, 9);
  assert.deepEqual(roundTrip.party.characterIds, [character.identity.id]);
  assert.equal(roundTrip.activeCharacterId, character.identity.id);
  assert.equal(roundTrip.activeShipId, ship.identity.id);
  assert.deepEqual(roundTrip.documentRefs.characters, [{ id: character.identity.id, name: 'Hawkeye' }]);
  assert.equal(roundTrip.documentRefs.ships[0].name, 'Marisol');
  assert.deepEqual(roundTrip.documentRefs.contracts, []);
  assert.deepEqual(roundTrip.documentRefs.situations, []);
  assert.deepEqual(roundTrip.documentRefs.encounters, []);
  assert.deepEqual(roundTrip.documentRefs.contacts, []);
  assert.deepEqual(roundTrip.documentRefs.threads, []);
  assert.deepEqual(roundTrip.documentRefs.activityLogs, []);
  assert.deepEqual(roundTrip.commerce.speculativeLots, []);
  assert.equal(roundTrip.documents, undefined);
});

test('a campaign can add a party character without changing focus, then activate it explicitly', async () => {
  const { character, ship } = await acceptanceDocuments();
  const second = structuredClone(character);
  second.identity.id = 'char-second-traveller';
  second.identity.name = 'Second Traveller';
  let campaign = campaignFor(character, ship);

  campaign = addCharacterToCampaign(campaign, second, { active: true, makeActive: false });
  assert.deepEqual(campaign.party.characterIds, [character.identity.id, second.identity.id]);
  assert.equal(campaign.activeCharacterId, character.identity.id);

  campaign = setActiveCampaignCharacter(campaign, second.identity.id);
  assert.equal(campaign.activeCharacterId, second.identity.id);
});

test('Campaign Document v8 migrates its first party member to activeCharacterId', async () => {
  const { character, ship } = await acceptanceDocuments();
  const legacy = structuredClone(campaignFor(character, ship));
  legacy.schemaVersion = 8;
  delete legacy.activeCharacterId;

  const migrated = importCampaignDocument(legacy);
  assert.equal(migrated.schemaVersion, 9);
  assert.equal(migrated.activeCharacterId, character.identity.id);
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
  assert.equal(roundTrip.documents.contracts.length, 0);
  assert.equal(roundTrip.documents.situations.length, 0);
  assert.equal(roundTrip.documents.encounters.length, 0);
  assert.equal(roundTrip.documents.contacts.length, 0);
  assert.equal(roundTrip.documents.threads.length, 0);
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
  assert.match(record, /ACTIVE CHARACTER Hawkeye \/ SCOUTS \/ UPP AB5678 \/ Cr80,000/);
});


test('Campaign Document v1 imports migrate to v9 with empty continuity, roster, and activity collections', async () => {
  const { character, ship } = await acceptanceDocuments();
  const current = campaignFor(character, ship);
  const legacy = structuredClone(current);
  legacy.schemaVersion = 1;
  delete legacy.documentRefs.contracts;
  const migrated = importCampaignDocument(legacy);
  assert.equal(migrated.schemaVersion, 9);
  assert.deepEqual(migrated.documentRefs.contracts, []);
  assert.deepEqual(migrated.documentRefs.situations, []);
  assert.deepEqual(migrated.documentRefs.encounters, []);
  assert.deepEqual(migrated.documentRefs.contacts, []);
  assert.deepEqual(migrated.documentRefs.threads, []);
  assert.deepEqual(migrated.documentRefs.activityLogs, []);
  assert.deepEqual(migrated.commerce.speculativeLots, []);
});

test('Campaign Bundle v1 imports migrate to v7 and add empty continuity, roster, and activity collections', async () => {
  const { character, ship } = await acceptanceDocuments();
  const campaign = campaignFor(character, ship);
  const current = createCampaignBundle(campaign, { characters: [character], ships: [ship] });
  const legacy = structuredClone(current);
  legacy.schemaVersion = 1;
  legacy.campaign.schemaVersion = 1;
  delete legacy.campaign.documentRefs.contracts;
  delete legacy.documents.contracts;
  const migrated = importCampaignBundle(legacy);
  assert.equal(migrated.schemaVersion, 7);
  assert.equal(migrated.campaign.schemaVersion, 9);
  assert.deepEqual(migrated.campaign.commerce.speculativeLots, []);
  assert.deepEqual(migrated.documents.contracts, []);
  assert.deepEqual(migrated.documents.situations, []);
  assert.deepEqual(migrated.documents.encounters, []);
  assert.deepEqual(migrated.documents.contacts, []);
  assert.deepEqual(migrated.documents.threads, []);
  assert.deepEqual(migrated.documents.activityLogs, []);
});

test('Campaign Document v2 migrates to v9 and speculative lot purchases survive round-trip', async () => {
  const { character, ship } = await acceptanceDocuments();
  let campaign = campaignFor(character, ship);
  const legacy = structuredClone(campaign);
  legacy.schemaVersion = 2;
  delete legacy.commerce;
  campaign = importCampaignDocument(legacy);
  assert.equal(campaign.schemaVersion, 9);
  assert.equal(speculativeLotPurchasedQuantity(campaign, 'weekly-lot'), 0);
  campaign = recordSpeculativeLotPurchase(campaign, {
    key: 'weekly-lot', systemId: 'calder', tradeGoodCode: 62, quantity: 2
  });
  campaign = recordSpeculativeLotPurchase(campaign, {
    key: 'weekly-lot', systemId: 'calder', tradeGoodCode: 62, quantity: 1
  });
  const roundTrip = importCampaignDocument(exportCampaignDocument(campaign));
  assert.equal(speculativeLotPurchasedQuantity(roundTrip, 'weekly-lot'), 3);
});


test('Campaign Document v9 and Bundle v7 persist Situation Documents through the registry', async () => {
  const { createSituationDocument } = await import('../src/situation-document.js');
  const { addSituationToCampaign } = await import('../src/campaign-document.js');
  const { character, ship } = await acceptanceDocuments();
  const situation = createSituationDocument({
    eventKey: 'campaign-hawkeye-test|cinder|106-4800|arrival-situation',
    kind: 'arrival-event', title: 'Dead Approach Beacon',
    location: { systemId: 'cinder', systemName: 'Cinder' },
    createdDate: { year: 4800, dayOfYear: 106 },
    summary: 'An obsolete beacon is transmitting.', detail: '', choices: []
  });
  let campaign = campaignFor(character, ship);
  campaign = addSituationToCampaign(campaign, situation);
  const storage = createMemoryStorage();
  const registry = createDocumentRegistry({ storage });
  registry.put(character); registry.put(ship); registry.put(situation); registry.put(campaign);
  const resolved = registry.resolveCampaign(campaign.identity.id);
  assert.equal(resolved.situations.length, 1);
  assert.equal(resolved.situations[0].identity.title, 'Dead Approach Beacon');
  const bundle = registry.buildBundle(campaign.identity.id);
  assert.equal(bundle.schemaVersion, 7);
  assert.equal(bundle.documents.situations.length, 1);
});

test('Campaign Document v3 migrates to v9 with empty situation, continuity, roster, and activity collections', async () => {
  const { character, ship } = await acceptanceDocuments();
  const legacy = structuredClone(campaignFor(character, ship));
  legacy.schemaVersion = 3;
  delete legacy.documentRefs.situations;
  const migrated = importCampaignDocument(legacy);
  assert.equal(migrated.schemaVersion, 9);
  assert.deepEqual(migrated.documentRefs.situations, []);
  assert.deepEqual(migrated.documentRefs.encounters, []);
  assert.deepEqual(migrated.documentRefs.contacts, []);
  assert.deepEqual(migrated.documentRefs.threads, []);
  assert.deepEqual(migrated.documentRefs.activityLogs, []);
});


test('Campaign Document v4 migrates to v9 with empty contact, thread, encounter, roster, and activity collections', async () => {
  const { character, ship } = await acceptanceDocuments();
  const legacy = structuredClone(campaignFor(character, ship));
  legacy.schemaVersion = 4;
  delete legacy.documentRefs.contacts;
  delete legacy.documentRefs.threads;
  const migrated = importCampaignDocument(legacy);
  assert.equal(migrated.schemaVersion, 9);
  assert.deepEqual(migrated.documentRefs.contacts, []);
  assert.deepEqual(migrated.documentRefs.threads, []);
  assert.deepEqual(migrated.documentRefs.encounters, []);
  assert.deepEqual(migrated.documentRefs.activityLogs, []);
});

test('Campaign Document v9 and Bundle v7 persist named contacts and adventure threads through the registry', async () => {
  const { createContactDocument } = await import('../src/contact-document.js');
  const { createAdventureThreadDocument } = await import('../src/adventure-thread-document.js');
  const { addContactToCampaign, addAdventureThreadToCampaign } = await import('../src/campaign-document.js');
  const { character, ship } = await acceptanceDocuments();
  const contact = createContactDocument({
    contactKey: 'campaign-hawkeye-test|aster|Mara Venn|Scout Archivist',
    name: 'Mara Venn', role: 'Scout Archivist', type: 'Scout Service',
    homeSystem: { systemId: 'aster', systemName: 'Aster' },
    firstMetDate: { year: 4800, dayOfYear: 120 }, standing: 'friendly'
  });
  const thread = createAdventureThreadDocument({
    threadKey: 'campaign-hawkeye-test|carranza-route', title: 'Carranza Route',
    createdDate: { year: 4800, dayOfYear: 106 }, origin: { systemId: 'cinder', systemName: 'Cinder' },
    objective: 'Review Carranza records at Aster.', targetSystemId: 'aster', targetSystemName: 'Aster',
    contactIds: [contact.identity.id]
  });
  let campaign = campaignFor(character, ship);
  campaign = addContactToCampaign(campaign, contact);
  campaign = addAdventureThreadToCampaign(campaign, thread);
  const registry = createDocumentRegistry({ storage: createMemoryStorage() });
  registry.put(character); registry.put(ship); registry.put(contact); registry.put(thread); registry.put(campaign);
  const resolved = registry.resolveCampaign(campaign.identity.id);
  assert.equal(resolved.contacts[0].identity.name, 'Mara Venn');
  assert.equal(resolved.threads[0].identity.title, 'Carranza Route');
  const bundle = registry.buildBundle(campaign.identity.id);
  assert.equal(bundle.schemaVersion, 7);
  assert.equal(bundle.documents.contacts.length, 1);
  assert.equal(bundle.documents.threads.length, 1);
});

test('Campaign Bundle v3 from v0.12.0 migrates to v7 with empty contacts, threads, encounters, roster, and activity records', async () => {
  const { character, ship } = await acceptanceDocuments();
  const current = createCampaignBundle(campaignFor(character, ship), { characters: [character], ships: [ship] });
  const legacy = structuredClone(current);
  legacy.schemaVersion = 3;
  legacy.campaign.schemaVersion = 4;
  delete legacy.campaign.documentRefs.contacts;
  delete legacy.campaign.documentRefs.threads;
  delete legacy.documents.contacts;
  delete legacy.documents.threads;
  const migrated = importCampaignBundle(legacy);
  assert.equal(migrated.schemaVersion, 7);
  assert.equal(migrated.campaign.schemaVersion, 9);
  assert.deepEqual(migrated.documents.contacts, []);
  assert.deepEqual(migrated.documents.threads, []);
  assert.deepEqual(migrated.documents.encounters, []);
  assert.deepEqual(migrated.documents.activityLogs, []);
});

test('v0.40.0 advances the campaign clock in seconds, rolling into days and years', async () => {
  const character = importCharacterDocument(await readFile(path.join(examples, 'Hawkeye.character.json'), 'utf8'));
  const base = {
    id: 'campaign-clock', name: 'Clock', location: { systemId: 'cinder', systemName: 'Cinder', worldId: 'cinder-main', worldName: 'Cinder' },
    characters: [character], ships: [], partyCharacterIds: [character.identity.id], activeShipId: null
  };
  const start = createCampaignDocument({ ...base, time: { year: 4800, dayOfYear: 106, secondsOfDay: 0 } });

  // A combat round is 15 seconds (B1 p.30).
  const oneRound = advanceCampaignSeconds(start, COMBAT_ROUND_SECONDS);
  assert.equal(oneRound.time.secondsOfDay, 15);
  assert.equal(oneRound.time.dayOfYear, 106);
  assert.equal(campaignClockLabel(oneRound), '00:00:15');

  // Ten minutes: the B1 p.34 recovery interval for an unconscious character.
  const tenMinutes = advanceCampaignSeconds(start, 600);
  assert.equal(campaignClockLabel(tenMinutes), '00:10:00');

  // Seconds roll into days, and days into years, without losing the remainder.
  const yearEnd = createCampaignDocument({ ...base, time: { year: 4800, dayOfYear: 365, secondsOfDay: 86_390 } });
  const rolled = advanceCampaignSeconds(yearEnd, 20);
  assert.equal(rolled.time.year, 4801);
  assert.equal(rolled.time.dayOfYear, 1);
  assert.equal(rolled.time.secondsOfDay, 10);

  assert.throws(() => advanceCampaignSeconds(start, -1), RangeError);
  assert.throws(() => advanceCampaignSeconds(start, 1.5), RangeError);
});

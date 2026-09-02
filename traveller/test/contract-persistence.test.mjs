import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { importCharacterDocument, importShipDocument } from '../../packages/classic-traveller-rules/index.js';
import { createCampaignDocument, addContractToCampaign } from '../src/campaign-document.js';
import { createContractDocument } from '../src/contract-document.js';
import { createDocumentRegistry, createMemoryStorage } from '../src/document-registry.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const examples = path.resolve(here, '../examples');

async function docs() {
  const character = importCharacterDocument(await readFile(path.join(examples, 'Hawkeye.character.json'), 'utf8'));
  const ship = importShipDocument(await readFile(path.join(examples, 'Hawkeye.ship.json'), 'utf8'));
  const offer = {
    offerId: 'calder-portcall:priority:port-meridian', kind: 'priority-courier', title: 'Priority Courier Packet',
    rulesBasis: 'sea-of-suns-original', setting: 'Sea of Suns', issuerName: 'Calder Dispatch Office', issuerType: 'government',
    originSystemId: 'calder', originSystemName: 'Calder', destinationSystemId: 'port-meridian', destinationSystemName: 'Port Meridian',
    paymentCr: 17000, deadlineDays: 14, cargoTons: 0, exclusiveShip: false,
    requirementsDescription: 'Sealed packet.', notes: ''
  };
  const contract = createContractDocument(offer, {
    acceptedByCharacterId: character.identity.id,
    acceptedShipId: ship.identity.id,
    acceptedDate: { year: 4800, dayOfYear: 8 }
  });
  let campaign = createCampaignDocument({
    id: 'campaign-contract-persistence', name: 'Sea of Suns', characters: [character], ships: [ship],
    partyCharacterIds: [character.identity.id], activeShipId: ship.identity.id
  });
  campaign = addContractToCampaign(campaign, contract);
  return { character, ship, contract, campaign };
}

test('registry resolves accepted Contract Documents and portable bundle includes them', async () => {
  const { character, ship, contract, campaign } = await docs();
  const storage = createMemoryStorage();
  const registry = createDocumentRegistry({ storage });
  registry.put(character);
  registry.put(ship);
  registry.put(contract);
  registry.put(campaign);

  const resolved = registry.resolveCampaign(campaign.identity.id);
  assert.deepEqual(resolved.missing, []);
  assert.equal(resolved.contracts.length, 1);
  assert.equal(resolved.contracts[0].identity.title, 'Priority Courier Packet');

  const bundle = registry.buildBundle(campaign.identity.id);
  assert.equal(bundle.schemaVersion, 6);
  assert.equal(bundle.documents.contracts.length, 1);
  assert.equal(bundle.documents.contracts[0].identity.id, contract.identity.id);
});

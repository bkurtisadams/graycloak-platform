import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  getJumpDestinations,
  importShipDocument
} from '../../packages/classic-traveller-rules/index.js';
import { createCampaignDocument, updateCampaignLocation } from '../src/campaign-document.js';
import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js';
import { contractBoardKey, generateContractBoard } from '../world/contract-board.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const examples = path.resolve(here, '../examples');

async function fixture() {
  const ship = importShipDocument(await readFile(path.join(examples, 'Hawkeye.ship.json'), 'utf8'));
  const { importCharacterDocument } = await import('../../packages/classic-traveller-rules/index.js');
  const character = importCharacterDocument(await readFile(path.join(examples, 'Hawkeye.character.json'), 'utf8'));
  let campaign = createCampaignDocument({
    id: 'campaign-contract-board', name: 'Sea of Suns', characters: [character], ships: [ship],
    partyCharacterIds: [character.identity.id], activeShipId: ship.identity.id,
    time: { year: 4800, dayOfYear: 8, secondsOfDay: 0 }
  });
  const calder = FAR_MERIDIAN_SUBSECTOR.systems.find((entry) => entry.id === 'calder');
  campaign = updateCampaignLocation(campaign, {
    systemId: calder.id, systemName: calder.name, worldId: calder.mainWorld.id, worldName: calder.mainWorld.name
  });
  ship.state.portCall = { systemId: 'calder', arrivalDate: '008-4800', berthingDueCr: 100, berthingPaid: true };
  return { ship: importShipDocument(ship), campaign, calder };
}

test('contract board is stable for one port call and includes a Book 2 Type S charter quote', async () => {
  const { ship, campaign, calder } = await fixture();
  const destinations = getJumpDestinations(FAR_MERIDIAN_SUBSECTOR, calder.id, 2);
  const first = generateContractBoard({ campaign, system: calder, destinations, ship });
  const second = generateContractBoard({ campaign, system: calder, destinations, ship });
  assert.deepEqual(first, second);
  const charter = first.offers.find((entry) => entry.kind === 'charter');
  assert.ok(charter);
  assert.equal(charter.paymentCr, 29700);
  assert.equal(charter.deadlineDays, 14);
  assert.equal(charter.exclusiveShip, true);
});

test('contract board key changes on a new port call even at the same world', async () => {
  const { ship, campaign, calder } = await fixture();
  const first = contractBoardKey({ campaign, system: calder, ship });
  ship.state.portCall.arrivalDate = '029-4800';
  const second = contractBoardKey({ campaign, system: calder, ship });
  assert.notEqual(first, second);
});

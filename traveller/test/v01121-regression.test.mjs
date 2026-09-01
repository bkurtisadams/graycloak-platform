import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { importCampaignBundle } from '../src/campaign-bundle.js';
import { reconcileContractDeadlines } from '../src/contract-document.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.resolve(here, 'fixtures/Sea-of-Suns-v0.11.2-buggy.campaign.json');

test('Sea of Suns v0.11.2 regression fixture migrates and exposes the overdue courier that prompted v0.11.2.1', async () => {
  const bundle = importCampaignBundle(await readFile(fixture, 'utf8'));
  assert.equal(bundle.campaign.schemaVersion, 3);
  assert.deepEqual(bundle.campaign.commerce.speculativeLots, []);
  assert.equal(bundle.campaign.time.dayOfYear, 106);
  const reconciled = reconcileContractDeadlines(bundle.documents.contracts, bundle.campaign.time);
  assert.ok(reconciled.failed.some((entry) => entry.identity.id === 'contract-3a5bbe658d9e0591'));
});

test('Sea of Suns regression fixture records the same-world speculative exploit without treating the inflated balance as canonical', async () => {
  const raw = JSON.parse(await readFile(fixture, 'utf8'));
  const ship = raw.documents.ships[0];
  const ledger = ship.state.finances.ledger;
  const mechanical = ledger.filter((entry) => entry.description.includes('Mechanical Parts'));
  const radioactives = ledger.filter((entry) => entry.description.includes('Radioactives'));
  assert.equal(mechanical.length, 4);
  assert.equal(radioactives.length, 2);
  assert.equal(ship.state.finances.balanceCr, 843620);
});

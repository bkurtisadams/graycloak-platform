// v0.376.0 (Kurt, Nov 2026): the Type A2 Far Trader, Book 2-legal on a custom
// hull, is one of the designs a referee can add (Bruce, Nov 2026: a jump-2
// trader for the Majestic's crew).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDocumentRegistry, createMemoryStorage } from '../src/document-registry.js';
import { createPlaySession } from '../src/play-session.js';
import { FAR_MERIDIAN_SUBSECTOR } from '../world/far-meridian-subsector.js';

const fixture = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'Sea-of-Suns-v0.11.2-buggy.campaign.json');

test('v0.376.0 the referee adds a Type A2 Far Trader: jump-2, 60 t fuel, 48 t hold', async () => {
  const registry = createDocumentRegistry({ storage: createMemoryStorage() });
  const { campaign } = registry.putBundle(JSON.parse(await readFile(fixture, 'utf8')));
  const session = createPlaySession({ registry, campaignId: campaign.identity.id, subsector: FAR_MERIDIAN_SUBSECTOR });
  const option = session.view().newShipOptions.designs.find((entry) => entry.key === 'type-a2-far-trader');
  assert.equal(option.label, 'Type A2 Far Trader (200 tons, custom hull)');
  const made = session.run('ship:new', { fight: { value: { designKey: 'type-a2-far-trader', name: 'Majestic II', holder: { kind: 'patron', name: 'Bruce\u2019s trading house' } } } });
  assert.equal(made.ok, true, made.message);
  const ship = session.resolved.ships.find((entry) => entry.identity.name === 'Majestic II');
  assert.equal(ship.specifications.drives.jump.rating, 2);
  assert.equal(ship.specifications.fuel.capacityTons, 60);
  assert.equal(ship.specifications.cargo.capacityTons, 48);
});

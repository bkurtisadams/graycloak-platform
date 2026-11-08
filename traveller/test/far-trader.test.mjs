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

async function atOrison() {
  const bundle = JSON.parse(await readFile(fixture, 'utf8'));
  bundle.campaign.location = { systemId: 'orison', systemName: 'Orison', worldId: 'orison-main', worldName: 'Orison' };
  const registry = createDocumentRegistry({ storage: createMemoryStorage() });
  const { campaign } = registry.putBundle(bundle);
  return createPlaySession({ registry, campaignId: campaign.identity.id, subsector: FAR_MERIDIAN_SUBSECTOR });
}

test('v0.377.0 the travellers\u2019 Type A is traded in for a Far Trader at a B starport, keeping her name', async () => {
  const session = await atOrison();
  session.run('ship:new', { fight: { value: { designKey: 'type-a-free-trader', name: 'Majestic', holder: { kind: 'patron', name: 'House Sorell' } } } });
  const majestic = session.resolved.ships.find((entry) => entry.identity.name === 'Majestic');
  const active = session.run(`ship:make-active:${majestic.identity.id}`);
  assert.equal(active.ok, true, active.message);
  const options = session.view().tradeInOptions;
  assert.equal(options.yard, true);
  const a2 = options.designs.find((entry) => entry.key === 'type-a2-far-trader');
  assert.equal(a2.saleCr, 22_248_000, '60% of MCr37.08');
  const traded = session.run('ship:trade-in', { fight: { value: { designKey: 'type-a2-far-trader', finance: true } } });
  assert.equal(traded.ok, true, traded.message);
  const after = session.resolved.ships.find((entry) => entry.identity.id === majestic.identity.id);
  assert.equal(after.identity.name, 'Majestic');
  assert.equal(after.design.key, 'type-a2-far-trader');
  assert.equal(after.state.finances.balanceCr, 22_248_000);
  assert.equal(after.state.finances.mortgage.cashPriceCr, 80_194_000);
});

test('v0.377.0 a Scout held on detached duty is not hers to trade in', async () => {
  const session = await atOrison();
  const result = session.run('ship:trade-in', { fight: { value: { designKey: 'type-a2-far-trader' } } });
  assert.equal(result.ok, false);
});

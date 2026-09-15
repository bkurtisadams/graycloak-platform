import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importShipDocument, exportShipDocument } from '../vendor/classic-traveller-rules/index.js';
import { resolveShipImport } from '../src/ship-import.js';

const text = readFileSync(new URL('../examples/Hawkeye.ship.json', import.meta.url), 'utf8');
const hawkeye = importShipDocument(JSON.parse(text));

test('an exported ship imports back as the same ship', () => {
  const exported = exportShipDocument(hawkeye, { space: 2 });
  const { ship, replaces, joinsAsActive } = resolveShipImport(exported);
  assert.deepEqual(ship, hawkeye);
  assert.equal(replaces, null);
  assert.equal(joinsAsActive, true);
});

test('the same id updates the ship already here; a new one joins the reserve', () => {
  assert.equal(resolveShipImport(text, { activeShip: hawkeye }).replaces, 'active');
  assert.equal(resolveShipImport(text, { reserveShips: [hawkeye] }).replaces, 'reserve');
  const other = { ...JSON.parse(text), identity: { ...JSON.parse(text).identity, id: 'ship-other' } };
  const joined = resolveShipImport(JSON.stringify(other), { activeShip: hawkeye });
  assert.equal(joined.replaces, null);
  assert.equal(joined.joinsAsActive, false);
});

test('a file that is not a ship says so before anything changes', () => {
  assert.throws(() => resolveShipImport('{ not json', { fileName: 'bad.json' }), /bad\.json is not JSON/);
  assert.throws(() => resolveShipImport(JSON.stringify({ documentType: 'classic-traveller-character' }), { fileName: 'char.json' }), /char\.json is not a Traveller ship document/);
});

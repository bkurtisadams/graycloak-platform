import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatSubsectorHex,
  parseSubsectorHex,
  subsectorHexDistance,
  validateAuthoredSubsector,
  getJumpDestinations,
  jumpDistanceBetweenSystems
} from '../index.js';

const fixture = {
  id: 'fixture',
  name: 'Fixture',
  systems: [
    { id: 'home', hex: '0405', name: 'Home', mainWorld: { id: 'home-world', name: 'Home' } },
    { id: 'near', hex: '0505', name: 'Near', mainWorld: { id: 'near-world', name: 'Near' } },
    { id: 'two', hex: '0407', name: 'Two', mainWorld: { id: 'two-world', name: 'Two' } },
    { id: 'far', hex: '0809', name: 'Far', mainWorld: { id: 'far-world', name: 'Far' } }
  ]
};

test('Traveller subsector hexes use the printed four-digit column/row format', () => {
  assert.equal(formatSubsectorHex(4, 5), '0405');
  assert.deepEqual(parseSubsectorHex('0405'), { column: 4, row: 5 });
  assert.throws(() => parseSubsectorHex('0911'), /column/);
});

test('adjacent subsector hexes are one parsec apart', () => {
  assert.equal(subsectorHexDistance('0405', '0505'), 1);
  assert.equal(subsectorHexDistance('0405', '0406'), 1);
  assert.equal(subsectorHexDistance('0405', '0407'), 2);
});

test('authored subsector validation rejects duplicate occupied hexes', () => {
  const duplicate = structuredClone(fixture);
  duplicate.systems[1].hex = '0405';
  const result = validateAuthoredSubsector(duplicate);
  assert.equal(result.valid, false);
  assert.match(result.errors.join('; '), /duplicate system hex: 0405/);
});

test('Jump-2 destinations include systems one or two parsecs away and exclude farther systems', () => {
  const entries = getJumpDestinations(fixture, 'home', 2);
  assert.deepEqual(entries.map((entry) => [entry.system.id, entry.distance]), [['near', 1], ['two', 2]]);
  assert.equal(jumpDistanceBetweenSystems(fixture, 'home', 'far') > 2, true);
});

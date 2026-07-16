import assert from 'node:assert/strict';
import test from 'node:test';

import { RANGED_WEAPON_AUDIT, RANGED_WEAPONS } from '../dist/index.js';

test('ranged weapon table exposes stable machine-readable data', () => {
  assert.equal(RANGED_WEAPONS.short_bow.rateOfFire, 2);
  assert.deepEqual(RANGED_WEAPONS.long_bow.rangeTiles, [7, 14, 21]);
});

test('heavy crossbow discrepancy remains visible until OSRIC 3 verification', () => {
  assert.equal(RANGED_WEAPONS.heavy_crossbow.rateOfFire, 1);
  assert.equal(RANGED_WEAPON_AUDIT.heavy_crossbow.status, 'disputed');
  assert.equal(RANGED_WEAPON_AUDIT.heavy_crossbow.duplicateLegacyValue, 0.5);
  assert.equal(RANGED_WEAPON_AUDIT.heavy_crossbow.osric3Value, null);
});

import test from 'node:test';
import assert from 'node:assert/strict';

import { SERVICES, SERVICE_KEYS, serviceForDraftRoll } from '../index.js';

test('prior service table keeps the six Classic Traveller services in draft order', () => {
  assert.deepEqual(SERVICE_KEYS, ['navy', 'marines', 'army', 'scouts', 'merchants', 'other']);
  assert.deepEqual([1, 2, 3, 4, 5, 6].map((roll) => serviceForDraftRoll(roll).key), SERVICE_KEYS);
});

test('prior service targets reproduce the Book 1 table', () => {
  assert.deepEqual(
    SERVICE_KEYS.map((key) => ({
      key,
      enlist: SERVICES[key].enlistment.target,
      survive: SERVICES[key].survival.target,
      commission: SERVICES[key].commission?.target ?? null,
      promote: SERVICES[key].promotion?.target ?? null,
      reenlist: SERVICES[key].reenlistment.target
    })),
    [
      { key: 'navy', enlist: 8, survive: 5, commission: 10, promote: 8, reenlist: 6 },
      { key: 'marines', enlist: 9, survive: 6, commission: 9, promote: 9, reenlist: 6 },
      { key: 'army', enlist: 5, survive: 5, commission: 5, promote: 6, reenlist: 7 },
      { key: 'scouts', enlist: 7, survive: 7, commission: null, promote: null, reenlist: 3 },
      { key: 'merchants', enlist: 7, survive: 5, commission: 4, promote: 10, reenlist: 4 },
      { key: 'other', enlist: 3, survive: 5, commission: null, promote: null, reenlist: 5 }
    ]
  );
});

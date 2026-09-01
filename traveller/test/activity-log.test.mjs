import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStorage } from '../src/document-registry.js';
import { createActivityLogStore } from '../src/activity-log.js';

test('activity log persists entries per campaign context across store instances', () => {
  const storage = createMemoryStorage();
  const first = createActivityLogStore({ storage, now: () => '2026-09-01T00:00:00.000Z' });
  first.setContext('campaign-sea-of-suns');
  first.append({ category: 'NAV', message: 'Aster selected / 0505', dateLabel: '001-4800' });
  first.append({ category: 'JUMP', message: 'Marisol departed Aster', dateLabel: '001-4800' });

  const second = createActivityLogStore({ storage });
  second.setContext('campaign-sea-of-suns');
  assert.deepEqual(second.list().map((entry) => [entry.category, entry.message, entry.dateLabel]), [
    ['NAV', 'Aster selected / 0505', '001-4800'],
    ['JUMP', 'Marisol departed Aster', '001-4800']
  ]);

  second.setContext('another-campaign');
  assert.deepEqual(second.list(), []);
});

test('activity log keeps only the newest configured maximum entries', () => {
  const storage = createMemoryStorage();
  const log = createActivityLogStore({ storage, maxEntries: 3, now: () => 'x' });
  log.setContext('campaign');
  for (let i = 1; i <= 5; i += 1) log.append({ category: 'SYSLOG', message: `event ${i}`, dateLabel: '001-4800' });
  assert.deepEqual(log.list().map((entry) => entry.message), ['event 3', 'event 4', 'event 5']);
});

test('activity log clear removes only the current context', () => {
  const storage = createMemoryStorage();
  const log = createActivityLogStore({ storage, now: () => 'x' });
  log.setContext('one');
  log.append({ category: 'SYSLOG', message: 'one', dateLabel: 'SESSION' });
  log.setContext('two');
  log.append({ category: 'SYSLOG', message: 'two', dateLabel: 'SESSION' });
  log.clear();
  assert.deepEqual(log.list(), []);
  log.setContext('one');
  assert.equal(log.list().length, 1);
});

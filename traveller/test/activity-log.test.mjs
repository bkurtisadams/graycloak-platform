import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { importCharacterDocument } from '../../packages/classic-traveller-rules/index.js';
import { createMemoryStorage } from '../src/document-registry.js';
import { createActivityLogStore } from '../src/activity-log.js';
import {
  appendActivityLogEntry,
  clearActivityLogDocument,
  createActivityLogDocument,
  exportActivityLogDocument,
  importActivityLogDocument
} from '../src/activity-log-document.js';
import { addActivityLogToCampaign, createCampaignDocument } from '../src/campaign-document.js';
import { createDocumentRegistry } from '../src/document-registry.js';

const here = path.dirname(fileURLToPath(import.meta.url));

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

test('portable Activity Log Document preserves linked journal entries without truncation', () => {
  let log = createActivityLogDocument({ campaignId: 'campaign-log-test', name: 'Log Test Activity' });
  for (let index = 1; index <= 260; index += 1) {
    log = appendActivityLogEntry(log, {
      category: index % 2 ? 'COMBAT' : 'TRADE',
      message: `event ${index}`,
      dateLabel: '042-4801',
      createdAt: `2026-09-01T00:${String(Math.floor((index - 1) / 60)).padStart(2, '0')}:${String((index - 1) % 60).padStart(2, '0')}.000Z`,
      sourceDocumentId: 'encounter-alpha',
      sourceActorId: index === 1 ? 'actor-hawkeye' : null
    });
  }
  const restored = importActivityLogDocument(exportActivityLogDocument(log));
  assert.equal(restored.entries.length, 260);
  assert.equal(restored.entries[0].sequence, 1);
  assert.equal(restored.entries[259].sequence, 260);
  assert.equal(restored.entries[0].sourceActorId, 'actor-hawkeye');
  assert.equal(restored.entries[259].message, 'event 260');
  assert.deepEqual(clearActivityLogDocument(restored).entries, []);
});

test('campaign registry and portable bundle preserve the campaign Activity Log Document', async () => {
  const character = importCharacterDocument(await readFile(path.resolve(here, '../examples/Hawkeye.character.json'), 'utf8'));
  let campaign = createCampaignDocument({ id: 'campaign-activity-test', name: 'Activity Test', characters: [character] });
  let log = createActivityLogDocument({ campaign });
  log = appendActivityLogEntry(log, {
    category: 'NOTE', message: 'Patron expects discretion.', dateLabel: '001-4800',
    createdAt: '2026-09-01T12:00:00.000Z', sourceDocumentId: campaign.identity.id
  });
  campaign = addActivityLogToCampaign(campaign, log);
  const registry = createDocumentRegistry({ storage: createMemoryStorage() });
  registry.put(character);
  registry.put(log);
  registry.put(campaign);

  const resolved = registry.resolveCampaign(campaign.identity.id);
  assert.equal(resolved.activityLogs.length, 1);
  assert.equal(resolved.activityLogs[0].entries[0].category, 'NOTE');
  const bundle = registry.buildBundle(campaign.identity.id);
  assert.equal(bundle.schemaVersion, 7);
  assert.equal(bundle.documents.activityLogs[0].campaignId, campaign.identity.id);
  assert.equal(bundle.documents.activityLogs[0].entries[0].message, 'Patron expects discretion.');
});

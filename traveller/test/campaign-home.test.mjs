import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { importCampaignBundle } from '../src/campaign-bundle.js';
import {
  createCampaignHome, importCampaignHome, validateCampaignHome, nextCampaignHome, campaignHomeBytes,
  campaignHomeSummary, StaleCampaignHomeError, CAMPAIGN_HOME_SOFT_LIMIT_BYTES
} from '../src/campaign-home.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const bundle = async () => importCampaignBundle(await readFile(path.join(here, 'fixtures/Sea-of-Suns-v0.11.2-buggy.campaign.json'), 'utf8'));

test('a campaign home wraps the portable bundle with owner and revision', async () => {
  const home = createCampaignHome(await bundle(), { ownerUid: 'uid-ref', savedAt: 5 });
  assert.equal(home.ownerUid, 'uid-ref');
  assert.equal(home.revision, 1);
  assert.equal(home.campaignId, home.bundle.campaign.identity.id);
  assert.equal(home.name, home.bundle.campaign.identity.name);
  assert.deepEqual(validateCampaignHome(home), []);
  assert.ok(campaignHomeBytes(home) < CAMPAIGN_HOME_SOFT_LIMIT_BYTES);
  assert.throws(() => createCampaignHome(home.bundle, {}), TypeError);
  assert.throws(() => createCampaignHome(home.bundle, { ownerUid: 'x', revision: 0 }), TypeError);
});

test('the next home carries the next revision and the same owner', async () => {
  const first = createCampaignHome(await bundle(), { ownerUid: 'uid-ref' });
  const second = nextCampaignHome(first, first.bundle, { savedAt: 9 });
  assert.equal(second.revision, 2);
  assert.equal(second.ownerUid, 'uid-ref');
  assert.equal(second.savedAt, 9);
});

test('a home validates on import and names a stale save', async () => {
  const home = createCampaignHome(await bundle(), { ownerUid: 'uid-ref' });
  const back = importCampaignHome(JSON.stringify(home));
  assert.equal(back.revision, 1);
  assert.throws(() => importCampaignHome({ ...home, campaignId: 'other' }), /does not match/);
  const stale = new StaleCampaignHomeError({ campaignId: 'c', expectedRevision: 3, currentRevision: 5 });
  assert.match(stale.message, /loaded revision 3, the home is at 5/);
  assert.equal(stale.currentRevision, 5);
});

test('the lobby summary comes from the player-readable envelope', () => {
  const summary = campaignHomeSummary({ campaignId: 'sea', name: 'Sea of Suns', time: { year: 4800, dayOfYear: 1, secondsOfDay: 0 }, location: { worldName: 'Cinder' }, homeRevision: 4, homeSavedAt: 77, publishedAt: 70 });
  assert.deepEqual(summary, { campaignId: 'sea', name: 'Sea of Suns', time: { year: 4800, dayOfYear: 1, secondsOfDay: 0 }, location: { worldName: 'Cinder' }, savedAt: 77, revision: 4, seatedCharacterIds: [] });
});

// v0.167.0: the campaign log had no cap and was 443 KB of a 903 KB home. The
// home carries the newest entries; a load puts back the older history the
// browser still has.
test('the home carries only the newest log entries, and a load keeps older local history', async () => {
  const { createActivityLogDocument, appendActivityLogEntry, mergeActivityLogHistory, trimActivityLogDocument } = await import('../src/activity-log-document.js');
  const { addActivityLogToCampaign } = await import('../src/campaign-document.js');
  const { CAMPAIGN_HOME_LOG_ENTRIES } = await import('../src/campaign-home.js');
  const source = await bundle();
  let log = createActivityLogDocument({ campaign: source.campaign });
  for (let index = 1; index <= CAMPAIGN_HOME_LOG_ENTRIES + 40; index += 1) {
    log = appendActivityLogEntry(log, { category: 'COMBAT', message: `line ${index}`, createdAt: new Date(1_700_000_000_000 + index).toISOString() });
  }
  const withLog = importCampaignBundle({
    ...source,
    campaign: addActivityLogToCampaign(source.campaign, log),
    documents: { ...source.documents, activityLogs: [log] }
  });

  const home = createCampaignHome(withLog, { ownerUid: 'uid-ref', savedAt: 5 });
  const homeLog = home.bundle.documents.activityLogs[0];
  assert.equal(homeLog.entries.length, CAMPAIGN_HOME_LOG_ENTRIES);
  assert.equal(homeLog.entries[0].message, 'line 41');
  assert.equal(homeLog.entries[0].sequence, 1);
  assert.equal(homeLog.entries.at(-1).id, log.entries.at(-1).id);
  assert.ok(campaignHomeBytes(home) < campaignHomeBytes({ bundle: withLog }));
  // It round-trips as a valid home.
  assert.deepEqual(validateCampaignHome(JSON.parse(JSON.stringify(home))), []);

  // Loading it back into a browser that has the whole log keeps all of it.
  const merged = mergeActivityLogHistory(log, homeLog);
  assert.equal(merged.entries.length, log.entries.length);
  assert.deepEqual(merged.entries.map((entry) => entry.id), log.entries.map((entry) => entry.id));
  assert.ok(merged.entries.every((entry, index) => entry.sequence === index + 1));

  // Another browser added lines since; the home's newer entries win and old history stays.
  const elsewhere = appendActivityLogEntry(homeLog, { message: 'from the other browser', createdAt: new Date(1_800_000_000_000).toISOString() });
  const both = mergeActivityLogHistory(log, trimActivityLogDocument(elsewhere, CAMPAIGN_HOME_LOG_ENTRIES));
  assert.equal(both.entries.at(-1).message, 'from the other browser');
  assert.equal(both.entries[0].message, 'line 1');

  // A browser with no log, or a different one, takes the home's as it is.
  assert.equal(mergeActivityLogHistory(null, homeLog).entries.length, CAMPAIGN_HOME_LOG_ENTRIES);
  assert.throws(() => trimActivityLogDocument(log, 0), TypeError);
});

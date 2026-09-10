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
  assert.deepEqual(summary, { campaignId: 'sea', name: 'Sea of Suns', time: { year: 4800, dayOfYear: 1, secondsOfDay: 0 }, location: { worldName: 'Cinder' }, savedAt: 77, revision: 4 });
});

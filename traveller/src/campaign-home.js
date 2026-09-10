// campaign-home.js — the campaign's home in Firestore.
//
// v0.68.0. Until now the referee's campaign lived in one browser's registry and
// Firestore held only what players may read. The home document turns that
// around: travellerCampaigns/{id}/state/current carries the whole campaign as
// a portable bundle, referee-only, revisioned; the browser registry is a cache
// of it. The envelope travellerCampaigns/{id} that players read is unchanged
// and is derived from the same save.
//
// Revisions are how two referee browsers avoid silently overwriting each
// other: a save names the revision it loaded, and the transaction refuses if
// the home has moved on since.

import { importCampaignBundle, exportCampaignBundle } from './campaign-bundle.js';

export const CAMPAIGN_HOME_SCHEMA_VERSION = 1;
// Firestore documents cap at 1 MiB; leave room for the envelope fields.
export const CAMPAIGN_HOME_SOFT_LIMIT_BYTES = 900 * 1024;

function nonblank(value) { return typeof value === 'string' && value.trim().length > 0; }

export class StaleCampaignHomeError extends Error {
  constructor({ campaignId, expectedRevision, currentRevision, savedAt }) {
    super(`campaign ${campaignId} changed elsewhere: this browser loaded revision ${expectedRevision ?? 'none'}, the home is at ${currentRevision}`);
    this.name = 'StaleCampaignHomeError';
    this.campaignId = campaignId;
    this.expectedRevision = expectedRevision ?? null;
    this.currentRevision = currentRevision;
    this.savedAt = savedAt ?? null;
  }
}

export function createCampaignHome(bundle, { ownerUid, revision = 1, savedAt = Date.now() } = {}) {
  const validated = importCampaignBundle(bundle);
  if (!nonblank(ownerUid)) throw new TypeError('ownerUid is required');
  if (!Number.isInteger(revision) || revision < 1) throw new TypeError('revision must be a positive integer');
  return {
    schemaVersion: CAMPAIGN_HOME_SCHEMA_VERSION,
    campaignId: validated.campaign.identity.id,
    name: validated.campaign.identity.name ?? null,
    ownerUid: ownerUid.trim(),
    revision,
    savedAt,
    bundle: validated
  };
}

export function validateCampaignHome(home) {
  const errors = [];
  if (!home || typeof home !== 'object') return ['home must be an object'];
  if (home.schemaVersion !== CAMPAIGN_HOME_SCHEMA_VERSION) errors.push(`unsupported schemaVersion: ${home.schemaVersion}`);
  if (!nonblank(home.ownerUid)) errors.push('ownerUid is required');
  if (!Number.isInteger(home.revision) || home.revision < 1) errors.push('revision must be a positive integer');
  try {
    const bundle = importCampaignBundle(home.bundle);
    if (bundle.campaign.identity.id !== home.campaignId) errors.push('campaignId does not match the bundle');
  } catch (error) {
    errors.push(`bundle: ${error.message}`);
  }
  return errors;
}

export function importCampaignHome(input) {
  const parsed = typeof input === 'string' ? JSON.parse(input) : input;
  const errors = validateCampaignHome(parsed);
  if (errors.length) throw new TypeError(`invalid Traveller campaign home: ${errors.join('; ')}`);
  return { ...parsed, bundle: importCampaignBundle(parsed.bundle) };
}

// Approximate serialised size, for the soft limit warning.
export function campaignHomeBytes(home) {
  return new TextEncoder().encode(exportCampaignBundle(home.bundle, { space: 0 })).length;
}

// The next revision of a home, from a fresh bundle.
export function nextCampaignHome(previous, bundle, { savedAt = Date.now() } = {}) {
  return createCampaignHome(bundle, { ownerUid: previous.ownerUid, revision: previous.revision + 1, savedAt });
}

// What the lobby lists: enough to pick a campaign, nothing the referee keeps.
export function campaignHomeSummary(envelope) {
  return {
    campaignId: envelope.campaignId,
    name: envelope.name ?? null,
    time: envelope.time ?? null,
    location: envelope.location ?? null,
    savedAt: envelope.homeSavedAt ?? envelope.publishedAt ?? null,
    revision: envelope.homeRevision ?? null
  };
}

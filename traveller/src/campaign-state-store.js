export const CAMPAIGN_STATE_ENVELOPE_VERSION = 1;

function clone(value) { return value === undefined ? undefined : structuredClone(value); }
function nonblank(value) { return typeof value === 'string' && value.trim().length > 0; }

function envelope(campaignId, state, revision = 0) {
  if (!nonblank(campaignId)) throw new TypeError('campaignId is required');
  if (!Number.isInteger(revision) || revision < 0) throw new TypeError('revision must be a nonnegative integer');
  return { schemaVersion: CAMPAIGN_STATE_ENVELOPE_VERSION, campaignId, revision, state: clone(state) };
}

export function createMemoryCampaignStateStore(initial = {}) {
  const records = new Map();
  const listeners = new Map();
  const commands = new Map();
  for (const [campaignId, value] of Object.entries(initial)) {
    const revision = value?.schemaVersion === CAMPAIGN_STATE_ENVELOPE_VERSION ? value.revision : 0;
    const state = value?.schemaVersion === CAMPAIGN_STATE_ENVELOPE_VERSION ? value.state : value;
    records.set(campaignId, envelope(campaignId, state, revision));
  }

  function notify(campaignId) {
    const snapshot = clone(records.get(campaignId));
    for (const listener of listeners.get(campaignId) ?? []) listener(snapshot);
  }

  return Object.freeze({
    read(campaignId) {
      return clone(records.get(campaignId) ?? null);
    },
    seed(campaignId, state, { revision = 0 } = {}) {
      if (records.has(campaignId)) throw new Error(`campaign state already exists: ${campaignId}`);
      const next = envelope(campaignId, state, revision);
      records.set(campaignId, next);
      notify(campaignId);
      return clone(next);
    },
    transact({ campaignId, expectedRevision, commandId, update }) {
      if (!nonblank(commandId)) throw new TypeError('commandId is required');
      if (typeof update !== 'function') throw new TypeError('update must be a function');
      const commandKey = `${campaignId}|${commandId}`;
      if (commands.has(commandKey)) return { status: 'already-committed', ...clone(commands.get(commandKey)) };
      const current = records.get(campaignId);
      if (!current) return { status: 'not-found', campaignId };
      if (current.revision !== expectedRevision) {
        return { status: 'stale', campaignId, expectedRevision, actualRevision: current.revision, snapshot: clone(current) };
      }
      const updatedState = update(clone(current.state));
      if (updatedState === undefined) throw new Error('campaign transaction update must return state');
      const next = envelope(campaignId, updatedState, current.revision + 1);
      records.set(campaignId, next);
      const committed = { campaignId, commandId, revision: next.revision, snapshot: clone(next) };
      commands.set(commandKey, committed);
      notify(campaignId);
      return { status: 'committed', ...clone(committed) };
    },
    subscribe(campaignId, listener) {
      if (typeof listener !== 'function') throw new TypeError('listener must be a function');
      if (!listeners.has(campaignId)) listeners.set(campaignId, new Set());
      listeners.get(campaignId).add(listener);
      if (records.has(campaignId)) listener(clone(records.get(campaignId)));
      return () => listeners.get(campaignId)?.delete(listener);
    }
  });
}

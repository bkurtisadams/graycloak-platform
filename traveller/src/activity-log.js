export const ACTIVITY_LOG_SCHEMA_VERSION = 1;
export const ACTIVITY_LOG_STORAGE_PREFIX = 'graycloak-traveller-activity-log-v1:';
export const ACTIVITY_LOG_MAX_ENTRIES = 250;

function cleanText(value, label) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`${label} is required`);
  return text;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createActivityLogStore({
  storage,
  storagePrefix = ACTIVITY_LOG_STORAGE_PREFIX,
  maxEntries = ACTIVITY_LOG_MAX_ENTRIES,
  now = () => new Date().toISOString()
} = {}) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function' || typeof storage.removeItem !== 'function') {
    throw new TypeError('storage must provide getItem, setItem, and removeItem');
  }
  if (!Number.isInteger(maxEntries) || maxEntries < 1) throw new TypeError('maxEntries must be a positive integer');

  let contextId = 'session';
  const keyFor = (id = contextId) => `${storagePrefix}${encodeURIComponent(String(id || 'session'))}`;

  function read(id = contextId) {
    const raw = storage.getItem(keyFor(id));
    if (!raw) return { schemaVersion: ACTIVITY_LOG_SCHEMA_VERSION, entries: [] };
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new Error(`invalid Traveller activity log JSON: ${error.message}`);
    }
    if (parsed?.schemaVersion !== ACTIVITY_LOG_SCHEMA_VERSION || !Array.isArray(parsed.entries)) {
      throw new Error('unsupported Traveller activity log version');
    }
    return parsed;
  }

  function write(state, id = contextId) {
    storage.setItem(keyFor(id), JSON.stringify(state));
  }

  function setContext(id) {
    contextId = cleanText(id || 'session', 'activity context');
    return list();
  }

  function append({ category = 'SYSLOG', message, dateLabel = 'SESSION' } = {}) {
    const state = read();
    state.entries.push({
      category: cleanText(category, 'activity category').toUpperCase(),
      message: cleanText(message, 'activity message'),
      dateLabel: cleanText(dateLabel, 'activity date label'),
      createdAt: String(now())
    });
    if (state.entries.length > maxEntries) state.entries.splice(0, state.entries.length - maxEntries);
    write(state);
    return cloneJson(state.entries.at(-1));
  }

  function list() {
    return cloneJson(read().entries);
  }

  function clear() {
    storage.removeItem(keyFor());
  }

  return Object.freeze({
    setContext,
    getContext: () => contextId,
    append,
    list,
    clear
  });
}

export const QUICK_SLOT_STORAGE_PREFIX = 'graycloak-traveller-quick-slots-v1:';
export const QUICK_SLOT_LIMIT = 6;

export const QUICK_SLOT_DEFAULT_PRIORITY = Object.freeze([
  'Pilot',
  'Navigation',
  'Electronics',
  'Mechanical',
  'Jack-of-All-Trades',
  'Grav Vehicle',
  'Laser Rifle'
]);

export function defaultQuickSlots(skillNames = []) {
  const names = [...skillNames];
  const prioritized = QUICK_SLOT_DEFAULT_PRIORITY.filter((name) => names.includes(name));
  const remaining = names.filter((name) => !prioritized.includes(name)).sort((a, b) => a.localeCompare(b));
  return [...prioritized, ...remaining].slice(0, QUICK_SLOT_LIMIT);
}

export function normalizeQuickSlots(selected = [], skillNames = []) {
  const seen = new Set();
  const result = [];
  for (const name of selected) {
    if (typeof name !== 'string') continue;
    if (!skillNames.includes(name)) continue;
    if (seen.has(name)) continue;
    seen.add(name);
    result.push(name);
    if (result.length >= QUICK_SLOT_LIMIT) break;
  }
  return result;
}

export function createQuickSlotStore({ storage, storagePrefix = QUICK_SLOT_STORAGE_PREFIX } = {}) {
  function key(characterId) {
    return `${storagePrefix}${characterId}`;
  }
  return {
    read(characterId, skillNames = []) {
      if (!storage || !characterId) return null;
      let raw = null;
      try {
        raw = storage.getItem(key(characterId));
      } catch {
        return null;
      }
      if (!raw) return null;
      let parsed = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return null;
      }
      if (!Array.isArray(parsed?.slots)) return null;
      return normalizeQuickSlots(parsed.slots, skillNames);
    },
    write(characterId, slots = [], skillNames = []) {
      if (!storage || !characterId) return false;
      try {
        storage.setItem(key(characterId), JSON.stringify({ slots: normalizeQuickSlots(slots, skillNames) }));
        return true;
      } catch {
        return false;
      }
    },
    clear(characterId) {
      if (!storage || !characterId) return false;
      try {
        storage.removeItem(key(characterId));
        return true;
      } catch {
        return false;
      }
    }
  };
}

export function resolveQuickSlots({ store = null, characterId = null, skillNames = [] } = {}) {
  const stored = store ? store.read(characterId, skillNames) : null;
  if (stored && stored.length) return { slots: stored, source: 'stored' };
  return { slots: defaultQuickSlots(skillNames), source: 'default' };
}

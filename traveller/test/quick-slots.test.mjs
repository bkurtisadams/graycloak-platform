import test from 'node:test';
import assert from 'node:assert/strict';

import {
  QUICK_SLOT_LIMIT,
  createQuickSlotStore,
  defaultQuickSlots,
  normalizeQuickSlots,
  resolveQuickSlots
} from '../client/quick-slots.js';

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => void map.set(key, String(value)),
    removeItem: (key) => void map.delete(key)
  };
}

const SCOUT_SKILLS = ['Vacc Suit', 'Pilot', 'Navigation', 'Electronics', 'Gun Combat', 'Air/Raft', 'Mechanical', 'Jack-of-All-Trades'];

test('defaults preserve the historic priority order and cap at the slot limit', () => {
  const slots = defaultQuickSlots(SCOUT_SKILLS);
  assert.equal(slots.length, QUICK_SLOT_LIMIT);
  assert.deepEqual(slots.slice(0, 4), ['Pilot', 'Navigation', 'Electronics', 'Mechanical']);
  assert.equal(slots[4], 'Jack-of-All-Trades');
});

test('normalization drops unknown skills, duplicates, and overflow', () => {
  const slots = normalizeQuickSlots(
    ['Pilot', 'Pilot', 'Broker', 'Navigation', 'Electronics', 'Gun Combat', 'Air/Raft', 'Vacc Suit', 'Mechanical'],
    SCOUT_SKILLS
  );
  assert.equal(slots.length, QUICK_SLOT_LIMIT);
  assert.equal(new Set(slots).size, slots.length);
  assert.ok(!slots.includes('Broker'));
  assert.equal(slots[0], 'Pilot');
});

test('stored slots survive a round trip and beat the defaults', () => {
  const store = createQuickSlotStore({ storage: memoryStorage() });
  store.write('char-1', ['Gun Combat', 'Vacc Suit'], SCOUT_SKILLS);
  assert.deepEqual(store.read('char-1', SCOUT_SKILLS), ['Gun Combat', 'Vacc Suit']);
  assert.deepEqual(resolveQuickSlots({ store, characterId: 'char-1', skillNames: SCOUT_SKILLS }), {
    slots: ['Gun Combat', 'Vacc Suit'],
    source: 'stored'
  });
});

test('slots are per character and fall back to defaults for anyone unset', () => {
  const store = createQuickSlotStore({ storage: memoryStorage() });
  store.write('char-1', ['Gun Combat'], SCOUT_SKILLS);
  const other = resolveQuickSlots({ store, characterId: 'char-2', skillNames: SCOUT_SKILLS });
  assert.equal(other.source, 'default');
  assert.equal(other.slots[0], 'Pilot');
});

test('a skill removed from the character drops out of its stored slots', () => {
  const store = createQuickSlotStore({ storage: memoryStorage() });
  store.write('char-1', ['Pilot', 'Gun Combat'], SCOUT_SKILLS);
  assert.deepEqual(store.read('char-1', ['Pilot', 'Navigation']), ['Pilot']);
});

test('a missing or unreadable storage falls back to defaults without throwing', () => {
  const store = createQuickSlotStore({ storage: null });
  assert.equal(store.read('char-1', SCOUT_SKILLS), null);
  assert.equal(store.write('char-1', ['Pilot'], SCOUT_SKILLS), false);
  assert.equal(resolveQuickSlots({ store, characterId: 'char-1', skillNames: SCOUT_SKILLS }).source, 'default');
});

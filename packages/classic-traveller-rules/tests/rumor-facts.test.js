// 0.81.0: rumours written from game facts (original tables, not rules text).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createDice, createSequenceDice } from '../src/dice.js';
import { RUMOR_TYPES } from '../src/encounters/persons.js';
import { RUMOR_CONTENT, draftRumor } from '../src/encounters/rumor-facts.js';
import { parseUniversalWorldProfile } from '../src/worlds/world-profile.js';

const HERE = { id: 'port-meridian', name: 'Port Meridian', uwp: 'A867944-C' };
const WORLDS = Object.freeze([
  { id: 'aster', name: 'Aster', uwp: 'B867944-C', distance: 1, naval: true, scout: false, gasGiant: true, zone: 'none' },
  { id: 'lacuna', name: 'Lacuna', uwp: 'D300000-0', distance: 2, naval: false, scout: false, gasGiant: true, zone: 'red' },
  { id: 'calder', name: 'Calder', uwp: 'C544635-8', distance: 2, naval: false, scout: true, gasGiant: true, zone: 'none' },
  { id: 'vesper', name: 'Vesper', uwp: 'D688A9C-7', distance: 3, naval: false, scout: false, gasGiant: false, zone: 'amber' }
]);
const byId = new Map(WORLDS.map((world) => [world.id, world]));

test('0.81.0 every matrix letter has content, and the untrue ones are the misleading letters', () => {
  assert.deepEqual(Object.keys(RUMOR_CONTENT).sort(), Object.keys(RUMOR_TYPES).sort());
  const untrue = Object.entries(RUMOR_CONTENT).filter(([, entry]) => entry.truth !== 'true').map(([letter]) => letter).sort();
  // D partial, F trap, J completely false, T misleading clue, V and Z misleading background.
  assert.deepEqual(untrue, ['D', 'F', 'J', 'T', 'V', 'Z']);
  for (const letter of untrue) assert.match(RUMOR_TYPES[letter], /misleading|false|trap/i, letter);
});

test('0.81.0 every letter drafts a sentence about a world in reach, many times over', () => {
  for (let round = 0; round < 40; round += 1) {
    const dice = createDice();
    for (const letter of Object.keys(RUMOR_CONTENT)) {
      const rumor = draftRumor(dice, { letter, here: HERE, worlds: WORLDS });
      assert.equal(rumor.letter, letter);
      assert.equal(rumor.truth, RUMOR_CONTENT[letter].truth);
      assert.ok(rumor.text.length > 20, `${letter}: ${rumor.text}`);
      assert.ok(rumor.subjectId === HERE.id || byId.has(rumor.subjectId), `${letter} names a world in reach`);
      assert.ok(rumor.text.includes(rumor.subjectName) || rumor.fact === 'region' || /within \d parsec/.test(rumor.text), `${letter}: ${rumor.text}`);
      assert.doesNotMatch(rumor.text, /undefined|null|NaN/);
    }
  }
});

test('0.81.0 a false rumour really is false, and a true one true', () => {
  for (let round = 0; round < 60; round += 1) {
    const dice = createDice();
    for (const letter of ['J', 'V', 'Z']) {
      const rumor = draftRumor(dice, { letter, here: HERE, worlds: WORLDS });
      assert.notDeepEqual(rumor.claimed, rumor.actual, `${letter}: ${rumor.text}`);
      const world = byId.get(rumor.subjectId);
      if (rumor.fact === 'starport') assert.notEqual(rumor.claimed, world.uwp[0]);
      if (rumor.fact === 'gas-giant') assert.equal(rumor.claimed, !world.gasGiant);
      if (rumor.fact === 'law') assert.notEqual(rumor.claimed, parseUniversalWorldProfile(world.uwp).lawLevel);
    }
    const minor = draftRumor(dice, { letter: 'B', here: HERE, worlds: WORLDS });
    const world = byId.get(minor.subjectId);
    if (minor.fact === 'starport') assert.ok(minor.text.includes(`class ${world.uwp[0]}`));
    if (minor.fact === 'gas-giant') assert.equal(/no gas giant/.test(minor.text), !world.gasGiant);
  }
});

test('0.81.0 a partial fact is true but leaves out the hazard; a trap points at danger', () => {
  for (let round = 0; round < 30; round += 1) {
    const dice = createDice();
    const partial = draftRumor(dice, { letter: 'D', here: HERE, worlds: WORLDS });
    assert.ok(['lacuna', 'vesper'].includes(partial.subjectId));
    assert.ok(partial.omits);
    assert.doesNotMatch(partial.text, /red|amber|zone|interdict/i);
    const trap = draftRumor(dice, { letter: 'F', here: HERE, worlds: WORLDS });
    assert.ok(['lacuna', 'vesper'].includes(trap.subjectId), trap.text);
  }
});

test('0.81.0 no market or law is claimed for an empty world; worlds not yet visited come first', () => {
  for (let round = 0; round < 40; round += 1) {
    const dice = createDice();
    for (const letter of ['A', 'C', 'H', 'O', 'P', 'Y']) {
      const rumor = draftRumor(dice, { letter, here: HERE, worlds: WORLDS });
      if (['market', 'law', 'government', 'population', 'trade-run', 'tech'].includes(rumor.fact)) assert.notEqual(rumor.subjectId, 'lacuna', rumor.text);
    }
  }
  const visited = WORLDS.map((world) => ({ ...world, visited: world.id !== 'calder' && world.id !== 'vesper' }));
  for (let round = 0; round < 20; round += 1) {
    const rumor = draftRumor(createDice(), { letter: 'B', here: HERE, worlds: visited });
    assert.ok(['calder', 'vesper'].includes(rumor.subjectId));
  }
});

test('0.81.0 seeded dice draft the same rumour; nothing in reach still gives words', () => {
  const seq = () => createSequenceDice(Array.from({ length: 60 }, (_, index) => (index % 6) + 1));
  assert.deepEqual({ ...draftRumor(seq(), { letter: 'C', here: HERE, worlds: WORLDS }) }, { ...draftRumor(seq(), { letter: 'C', here: HERE, worlds: WORLDS }) });
  const none = draftRumor(createDice(), { letter: 'A', here: HERE, worlds: [] });
  assert.equal(none.subjectId, null);
  assert.ok(none.text);
  assert.throws(() => draftRumor(createDice(), { letter: '?' }), RangeError);
});

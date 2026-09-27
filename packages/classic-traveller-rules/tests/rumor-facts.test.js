// 0.81.0: rumours written from game facts (original tables, not rules text).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createDice, createSequenceDice } from '../src/dice.js';
import { RUMOR_TYPES } from '../src/encounters/persons.js';
import { RUMOR_CONTENT, draftRumor } from '../src/encounters/rumor-facts.js';
import { parseUniversalWorldProfile } from '../src/worlds/world-profile.js';
import { RUMOR_LEADS, RUMOR_LEAD_DAYS, RUMOR_TIP_DM, rollFindValue } from '../src/encounters/rumor-facts.js';
import { TRADE_GOODS } from '../src/trade/commerce.js';
import { PATRON_LISTS } from '../src/encounters/persons.js';

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

test('0.81.0 a false world fact really is false (Z); background carries no lead', () => {
  for (let round = 0; round < 60; round += 1) {
    const dice = createDice();
    const rumor = draftRumor(dice, { letter: 'Z', here: HERE, worlds: WORLDS });
    assert.notDeepEqual(rumor.claimed, rumor.actual, `Z: ${rumor.text}`);
    const world = byId.get(rumor.subjectId);
    if (rumor.fact === 'law') assert.notEqual(rumor.claimed, parseUniversalWorldProfile(world.uwp).lawLevel);
    assert.equal(draftRumor(dice, { letter: 'Q', here: HERE, worlds: WORLDS }).lead, undefined);
  }
});

test('0.84.0 half the matrix leads somewhere: a patron, a find or a trade tip', () => {
  const cells = ['ABCDEF', 'GUUWWH', 'IUYYWJ', 'KXZZVL', 'MXXVVN', 'OPQRST'].join('').split('');
  const count = (kind) => cells.filter((letter) => RUMOR_LEADS[letter] === kind).length;
  assert.deepEqual({ patron: count('patron'), find: count('find'), tip: count('tip') }, { patron: 6, find: 7, tip: 9 });
  assert.deepEqual({ ...RUMOR_LEAD_DAYS }, { patron: 60, find: 60, tip: 30 });
  assert.equal(RUMOR_TIP_DM, 2);
});

test('0.84.0 a patron lead names a peopled world with a port and a patron off list one', () => {
  for (let round = 0; round < 60; round += 1) {
    const dice = createDice();
    for (const letter of ['C', 'H', 'I', 'O', 'P', 'J']) {
      const rumor = draftRumor(dice, { letter, here: HERE, worlds: WORLDS });
      assert.equal(rumor.lead.kind, 'patron', letter);
      assert.notEqual(rumor.subjectId, 'lacuna', 'nobody hires on an empty world');
      assert.ok(Object.values(PATRON_LISTS.one).includes(rumor.lead.patronType) && rumor.lead.patronType !== 'Rumor');
      assert.ok(rumor.text.includes(rumor.lead.worldName) && rumor.text.includes(rumor.lead.patronType.toLowerCase()), rumor.text);
      assert.equal(rumor.truth, letter === 'J' ? 'false' : 'true');
    }
  }
});

test('0.84.0 a find has a value when real (halved when partial), none when false or a trap; a trap is somewhere risky', () => {
  for (let round = 0; round < 60; round += 1) {
    const dice = createDice();
    for (const letter of ['E', 'G', 'N', 'S', 'D']) {
      const rumor = draftRumor(dice, { letter, here: HERE, worlds: WORLDS });
      assert.equal(rumor.lead.kind, 'find');
      assert.ok(rumor.lead.valueCr >= 5000 && rumor.lead.valueCr <= 30000 && rumor.lead.valueCr % 2500 === 0);
      assert.match(rumor.text, /lies out on .*nobody has claimed it/);
    }
    assert.equal(draftRumor(dice, { letter: 'T', here: HERE, worlds: WORLDS }).lead.valueCr, 0);
    const trap = draftRumor(dice, { letter: 'F', here: HERE, worlds: WORLDS });
    assert.equal(trap.truth, 'trap');
    assert.ok(['lacuna', 'vesper'].includes(trap.subjectId), trap.text);
    assert.equal(draftRumor(dice, { letter: 'D', here: HERE, worlds: WORLDS }).truth, 'partial');
  }
  assert.equal(rollFindValue(createSequenceDice([3, 4])), 17500);
});

test('0.84.0 a true tip names a good that sells well there, with the DM; a false one none', () => {
  for (let round = 0; round < 60; round += 1) {
    const dice = createDice();
    const tip = draftRumor(dice, { letter: 'B', here: HERE, worlds: WORLDS });
    assert.equal(tip.lead.kind, 'tip');
    assert.equal(tip.lead.tipDM, RUMOR_TIP_DM);
    assert.ok(TRADE_GOODS[tip.lead.good]);
    assert.ok(tip.text.includes(tip.lead.goodName.toLowerCase()) && tip.text.includes(tip.lead.worldName));
    assert.notEqual(tip.subjectId, 'lacuna');
    const lie = draftRumor(dice, { letter: 'V', here: HERE, worlds: WORLDS });
    assert.equal(lie.lead.tipDM, 0);
    assert.equal(lie.truth, 'false');
  }
});

test('0.84.0 with nowhere fit for a lead, a letter falls back to world facts', () => {
  const empty = [{ id: 'lacuna', name: 'Lacuna', uwp: 'D300000-0', distance: 2, naval: false, scout: false, gasGiant: true, zone: 'red' }];
  const rumor = draftRumor(createDice(), { letter: 'O', here: HERE, worlds: empty });
  assert.equal(rumor.lead, undefined);
  assert.ok(rumor.text);
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

import { quoteSpeculativeResale } from '../src/trade/commerce.js';
test('0.84.0 a tip adds to the resale throw, with no broker commission', () => {
  const profile = parseUniversalWorldProfile('A867944-C');
  const plain = quoteSpeculativeResale(11, 10, profile, { dice: createSequenceDice([3, 4]) });
  const tipped = quoteSpeculativeResale(11, 10, profile, { dice: createSequenceDice([3, 4]), tipDM: 2 });
  assert.equal(tipped.modifiedValueRoll, plain.modifiedValueRoll + 2);
  assert.equal(tipped.tipDM, 2);
  assert.equal(tipped.brokerCommissionCr, 0);
  assert.throws(() => quoteSpeculativeResale(11, 10, profile, { dice: createDice(), tipDM: 5 }), /tipDM/);
});

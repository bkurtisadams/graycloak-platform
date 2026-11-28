import test from 'node:test';
import assert from 'node:assert/strict';
import { radiationCell, poisonCell, antidoteChance } from '../index.js';

// Transcribed from the printed RADIATION MATRIX and POISON MATRIX: rows are Constitution 18 down to 3, columns
// are intensity 3 to 18. Rows are written up to their first D; every cell after it is D.
const RADIATION = ['0 0 0 0 0 1 2 3 4 5 6 7 8 M M D', '0 0 0 0 1 2 3 4 5 6 7 8 M M D', '0 0 0 1 2 3 4 5 6 7 8 M M D', '0 0 1 2 3 4 5 6 7 8 M M D', '0 1 2 3 4 5 6 7 8 M M D',
  '1 2 3 4 5 6 7 8 M M D', '2 3 4 5 6 7 8 M M D', '3 4 5 6 7 8 M M D', '4 5 6 7 8 M M D', '5 6 7 8 M M D', '6 7 8 M M D', '7 8 M M D', '8 M M D', 'M M D', 'M D', 'D'];
const POISON = ['* * * * * * * * * * * * 1 2 3 D', '* * * * * * * * * * * 1 2 3 D', '* * * * * * * * * * 1 2 3 D', '* * * * * * * * * 1 2 3 D', '* * * * * * * * 1 2 3 D',
  '* * * * * * * 1 2 3 D', '* * * * * * 1 2 3 D', '* * * * * 1 2 D', '* * * * 1 2 3 D', '* * * 1 2 3 D', '* * 1 2 3 D', '* 1 2 3 D', '1 2 3 D', '2 3 D', '3 D', 'D'];
const printed = (rows, r, c) => { const cells = rows[r].split(' '), v = cells[c] ?? 'D'; return v === '*' ? 0 : /\d/.test(v) ? Number(v) : v; };

test('radiation and poison matrices match the printed charts in all 256 cells each', () => {
  for (let cn = 18; cn >= 3; cn--) for (let intensity = 3; intensity <= 18; intensity++) {
    assert.equal(radiationCell(cn, intensity), printed(RADIATION, 18 - cn, intensity - 3), `radiation CN ${cn} intensity ${intensity}`);
    assert.equal(poisonCell(cn, intensity), printed(POISON, 18 - cn, intensity - 3), `poison CN ${cn} intensity ${intensity}`);
  }
  assert.equal(poisonCell(11, 10), 'D', 'the printed row for Constitution 11 goes 1, 2, D');
});

test('antidotes: the matching intensity is certain, others are 50% plus or minus 10% a level', () => {
  assert.deepEqual([antidoteChance(16, 16), antidoteChance(16, 14), antidoteChance(16, 18)], [100, 30, 70]);
});

import * as gw from '../index.js';
import { storeCombat, manifestRadiation } from '../../../gamma-world/campaign.js';

const seq = (...values) => { let i = 0; return () => values[i++ % values.length]; };
const survivor = (extra = {}) => ({ name: 'Ashe', species: 'psh', selectionComplete: true, hp: 40, maxHp: 40, armorClass: 9, mutations: [], attributes: { MS: 10, IN: 10, DX: 10, CH: 10, CN: 10, PS: 10 }, equipment: { weaponId: 'long-sword', armorId: 'none' }, effects: { movementMultiplier: 1, attacksPerRound: 1, mentalResistance: 10, poisonResistance: 6, radiationResistance: 10 }, reviewRequired: [], experience: 0, ...extra });
const serf = { name: 'Serf', ac: 6, hd: 10, move: 12, ms: 15, dx: 10, intelligent: true, natural: [0, 6], poison: { intensity: 8, paralytic: false, stone: false }, large: false };
// A fight in which the Serf has just clawed the survivor: intensity 8 against resistance 6 is D.
function clawed(antidotes) {
  const s = gw.beginInteractive(gw.createEncounter(survivor({ antidotes }), { creature: 'serf', definition: serf, count: 1, rng: seq(0.9, 0.1, 0.5) }), { rng: seq(0.5) });
  s.actors[1].x = s.actors[0].x + 1; s.actors[1].y = s.actors[0].y;
  return s;
}
const act = (s, command, ...rolls) => gw.interactiveCommand(s, { ...command, expectedRevision: s.revision }, { rng: seq(...rolls) });
const end = (s, ...rolls) => act(s, { type: 'end' }, ...rolls);
const untilPoisoned = s => { for (let i = 0; i < 6 && s.status === 'active' && !s.actors[0].poisoned; i++) s = end(s, 0.99); return s; };

test('antidotes: none carried is death at once; the specific antidote is certain and costs 2d6', () => {
  let s = untilPoisoned(clawed([]));
  assert.equal(s.status, 'defeat');
  assert.match(s.log.join(' '), /fatal, and there is no antidote/);
  s = untilPoisoned(clawed([8, 14]));
  assert.equal(s.status, 'active');
  assert.deepEqual(s.actors[0].poisoned.intensity, 8);
  const offered = gw.combatActions(s, s.actors[1].id).filter(a => a.id.startsWith('antidote-')).map(a => a.label);
  assert.deepEqual(offered, ['Antidote 8 (100%)', 'Antidote 14 (100%)']);
  const cured = act(s, { type: 'antidote', intensity: 8 }, 0.5);
  assert.equal(cured.actors[0].poisoned, null);
  assert.deepEqual(cured.actors[0].antidotes, [14]);
  assert.equal(cured.actors[0].hp, 40 - 8, '2d6 with both dice showing 4');
  assert.match(cured.log.join(' '), /the specific antidote, certain\. It works; 2d6 damage/);
  assert.throws(() => act(cured, { type: 'antidote', intensity: 14 }), /No poison to treat/);
  const bag = storeCombat({ inventory: [{ id: 'antidote-8', antidote: 8 }, { id: 'antidote-14', antidote: 14 }, { id: 'supplies' }], days: 0 }, cured).inventory;
  assert.deepEqual(bag.map(i => i.id), ['antidote-14', 'supplies']);
});

test('antidotes: another intensity is 50% plus or minus 10% a level, and time runs out after 2 melee rounds', () => {
  assert.equal(gw.antidoteChance(8, 6), 30);
  let s = untilPoisoned(clawed([6, 6, 6]));
  const failed = act(s, { type: 'antidote', intensity: 6 }, 0.9);
  assert.match(failed.log.join(' '), /30% chance, d100 91\. It fails/);
  assert.ok(failed.actors[0].poisoned);
  const worked = act(s, { type: 'antidote', intensity: 6 }, 0.2, 0);
  assert.equal(worked.actors[0].poisoned, null);
  // No further attempt: the survivor lasts the rest of this round and two more, then dies.
  let t = s, rounds = 0;
  while (t.status === 'active' && rounds < 6) { t = end(t, 0); rounds++; }
  assert.equal(t.status, 'defeat');
  assert.match(t.log.join(' '), /No antidote in time: Ashe dies of poison/);
  assert.ok(rounds <= 3, `died after ${rounds} more end-turns`);
});

test('radiation M and a survived D are filed from the fight and appear one week later', () => {
  const blaash = { name: 'Blaash', ac: 8, hd: 15, move: 6, ms: null, dx: 10, intelligent: false, radiate: { intensity: 10, range: 5 }, large: false };
  // Intensity 10 against resistance 12 is M on the matrix.
  let s = gw.createEncounter(survivor({ species: 'humanoid', effects: { movementMultiplier: 1, attacksPerRound: 1, mentalResistance: 10, poisonResistance: 10, radiationResistance: 12 } }), { creature: 'blaash', definition: blaash, count: 1, rng: seq(0.9, 0.1, 0.5) });
  s.actors[1].x = s.actors[0].x + 1; s.actors[1].y = s.actors[0].y;
  s = gw.resolveRound(s, { action: 'rest' }, { rng: seq(0.5) });
  assert.match(s.log.join(' '), /Radiation intensity 10 vs 12: M, a new mutation, to appear in one week/);
  assert.deepEqual(s.pendingEffects, [{ kind: 'mutation' }]);
  const record = { base: { species: 'humanoid' }, choices: ['physical-12'] };
  let entry = storeCombat({ record, inventory: [], days: 3, minutes: 600, steps: 9 }, s);
  assert.deepEqual(entry.radiation, [{ id: '3:600:9:0', kind: 'mutation', due: 10 }]);
  assert.equal(storeCombat(entry, s).radiation.length, 1, 'saving the same fight again files nothing new');
  assert.equal(manifestRadiation({ ...entry, days: 9 }).acquired, undefined, 'nothing before the week is up');
  const after = manifestRadiation({ ...entry, days: 10 }, seq(0, 0.3));
  assert.equal(after.acquired.length, 1);
  assert.match(after.acquired[0], /^physical-/);
  assert.notEqual(after.acquired[0], 'physical-12');
  assert.match(after.advancement.news[0], /A week after the radiation, a new mutation appears: /);
  assert.equal(after.radiation[0].done, true);
  assert.equal(manifestRadiation(after), after, 'it appears once');
  // Defects are drawn from the chart's defects; Pure Strain Humans have no chart.
  const defect = gw.radiationMutation('animal', 'defect', [], seq(0.9, 0.4));
  assert.equal(defect.defect, true);
  assert.equal(defect.kind, 'mental');
  assert.equal(gw.radiationMutation('psh', 'mutation'), null);
  assert.match(manifestRadiation({ record: { base: { species: 'psh' }, choices: [] }, days: 8, radiation: [{ id: 'x', kind: 'mutation', due: 7 }] }).advancement.news[0], /Referee ruling needed/);
  // A mutation gained in play is part of the character from then on.
  const b = gw.generateCharacter({ species: 'psh', name: 'T', rng: seq(0.5) });
  const plain = gw.deriveCharacter(b, gw.mutationDraft(b), [], {}), changed = gw.deriveCharacter(b, gw.mutationDraft(b), [], { acquired: ['physical-12'] });
  assert.deepEqual([plain.mutations, changed.mutations, changed.effects.poisonResistance], [[], ['physical-12'], 18]);
});

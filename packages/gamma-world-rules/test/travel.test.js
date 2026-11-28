import test from 'node:test';
import assert from 'node:assert/strict';
import * as gw from '../index.js';

const seq = (...values) => { let i = 0; return () => values[i++ % values.length]; };

test('route movement: a turn is four hours; one km a turn in mountains or swamp, eight in the open', () => {
  assert.equal(gw.ROUTE_TURN_MINUTES, 240);
  assert.deepEqual(['clear', 'mountains', 'swamp', 'marsh', 'snow-mountains'].map(gw.routeRate), [8, 1, 1, 1, 1]);
  for (const [terrain, km] of Object.entries(gw.ROUTE_KM)) assert.ok(km >= 1 && km <= 10, `${terrain} is inside the printed one to ten`);
  assert.equal(gw.routeRate('some-new-terrain'), 4);
  // Eight km a turn is 200 m in six minutes; a 3-mile hex is 2 h 25 min in the open and 19 h 19 min in mountains.
  assert.equal(gw.travelMinutes(0.2, 8), 6);
  assert.equal(gw.travelMinutes(4.828032, 8), 145);
  assert.equal(gw.travelMinutes(4.828032, 1), 1159);
  assert.equal(gw.travelMinutes(4.828032, 4), 290);
  assert.throws(() => gw.travelMinutes(1, 11));
  assert.throws(() => gw.travelMinutes(1, 0.5));
});

test('rest: two of a day\'s six route turns, or travel at half rate and double combat fatigue; collapse after two days', () => {
  assert.equal(gw.REST_MINUTES, 480);
  assert.deepEqual([gw.restState(0).exhausted, gw.restState(960).exhausted, gw.restState(961).exhausted], [false, false, true]);
  assert.deepEqual([gw.restState(2879).collapse, gw.restState(2880).collapse], [false, true]);
  assert.equal(gw.travelMinutes(0.2, 8, { halved: true }), 12);
  // The same tired fighter, rested and unrested: the fatigue factor doubles.
  const fighter = extra => ({ name: 'Ashe', species: 'psh', selectionComplete: true, hp: 40, maxHp: 40, armorClass: 6, mutations: [], attributes: { MS: 10, IN: 10, DX: 10, CH: 10, CN: 10, PS: 10 }, equipment: { weaponId: 'two-handed-sword', armorId: 'hide' }, effects: { movementMultiplier: 1, attacksPerRound: 1, mentalResistance: 10, poisonResistance: 10, radiationResistance: 10 }, reviewRequired: [], experience: 0, ...extra });
  const base = gw.fatigueFactor({ weaponId: 'two-handed-sword', armorAC: 6, rounds: 14, rest: 0, PS: 10 });
  assert.ok(base > 0);
  const state = exhausted => { const s = gw.beginInteractive(gw.createEncounter(fighter({ exhausted }), { creature: 'arn', count: 1, rng: seq(0.9, 0.1, 0.5) }), { rng: seq(0.5) }); s.actors[0].fightRounds = 13; return s; };
  const blocked = s => gw.combatActions(s, s.actors[1].id).find(a => a.id === 'attack').reason;
  const wc = gw.getWeapon('two-handed-sword').wc;
  assert.equal(/fatigued/i.test(blocked(state(true))), base * 2 >= wc);
  assert.equal(/fatigued/i.test(blocked(state(false))), base >= wc);
});

test('a march camps for two route turns after every four without rest; a forced march does not', () => {
  // A mountain hex of 3 miles from fresh: 16 h of walking, 8 h of sleep, then the last 3 h 19 min.
  assert.deepEqual(gw.marchTime(1159, 0), { total: 1159 + 480, awake: 199, camps: 1 });
  // Six minutes in the valley with a full day already behind you: sleep first.
  assert.deepEqual(gw.marchTime(6, 960), { total: 486, awake: 6, camps: 1 });
  assert.deepEqual(gw.marchTime(145, 0), { total: 145, awake: 145, camps: 0 });
  assert.deepEqual(gw.marchTime(1159, 600, { forced: true }), { total: 1159, awake: 1759, camps: 0 });
  // Three mountain hexes, rested: two full days of walking need three camps.
  let state = { awake: 0 }, total = 0;
  for (let i = 0; i < 3; i++) { state = gw.marchTime(1159, state.awake); total += state.total; }
  assert.equal(total, 3 * 1159 + 3 * 480);
});

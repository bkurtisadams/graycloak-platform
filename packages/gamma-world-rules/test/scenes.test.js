import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { regionFrom } from '../../../gamma-world/world.js';
import * as gw from '../index.js';
import { registerScene, stepsFrom, stepToward, cellPixel, SCENES, getScene, sceneOf, siteAt, scenePath, sitePosition, startOf, ancestry, exitTo, isBlocked, clockOf, addMinutes, describeDistance, describeTime, placeName, FIRST_SCENE } from '../../../gamma-world/scenes.js';

// The region is built from the campaign map's own scripts, run here the way the browser runs them.
const root = { console: { log() {}, warn() {} }, localStorage: { getItem: () => null, setItem() {} }, dispatchEvent() {}, CustomEvent: class {} };
root.window = root;
vm.createContext(root);
for (const name of ['gw-authored.js', 'gw-terrain-data.js', 'gcc-rng.js', 'gw-subhex-data.js', 'gw-encounter-data.js', 'gw-creatures.js']) vm.runInContext(readFileSync(new URL(`../../../gcc/${name}`, import.meta.url), 'utf8'), root);
const region = registerScene(regionFrom(root));

test('the region is a window of 3-mile sub-hexes from the campaign map, centred on Eden Valley', () => {
  assert.equal(region.layout, 'hex');
  assert.equal(region.terrain.length, region.cols * region.rows);
  const home = sitePosition(region, 'eden-valley');
  assert.deepEqual(home, { x: 15, y: 11 });
  assert.ok(region.terrain.every(t => t in region.palette));
  assert.ok(region.places.some(p => p.name === 'Fort Marsh'), 'Fort Marsh lies just west of the valley');
  assert.ok(region.strokes.length > 0);
  assert.deepEqual(regionFrom(root).terrain, region.terrain, 'the same seed gives the same country');
  for (const id of ['clearing', 'outpost']) assert.ok(scenePath(region, home, sitePosition(region, id)).length >= 2);
});

const seq = (...values) => { let i = 0; return () => values[i++ % values.length]; };

test('random encounters: one d6 each day and night, a six sets the hour, then d20 on the terrain table', () => {
  assert.deepEqual([gw.travelPeriod(360).index, gw.travelPeriod(1079).night, gw.travelPeriod(1080).night, gw.travelPeriod(1800).index], [0, false, true, 2]);
  // 08:00 on day 1, roll 3: nothing, and no second check in the same day.
  let r = gw.advanceWandering(null, 360, 480, seq(0.4));
  assert.deepEqual([r.due, r.check.roll, r.state], [false, 3, { period: 0, at: null }]);
  assert.equal(gw.advanceWandering(r.state, 480, 720, seq(0.99)).check, null);
  // Night falls: a six, hour 9 of the night (02:00). Not due at 22:00, due once 02:00 has passed.
  r = gw.advanceWandering(r.state, 720, 1320, seq(0.99, 0.7));
  assert.deepEqual([r.due, r.check.roll, r.check.hour, r.state.at], [false, 6, 9, 1080 + 8 * 60]);
  r = gw.advanceWandering(r.state, 1320, 1560, seq(0.1));
  assert.deepEqual([r.due, r.check, r.state.at], [true, null, null]);
  // Setting out after the rolled hour: the encounter happens at once.
  r = gw.advanceWandering(null, 900, 1000, seq(0.99, 0));
  assert.equal(r.due, true);
  const data = region.encounters;
  assert.deepEqual([gw.tableKey(data, { terrain: 'heavy-forest' }), gw.tableKey(data, { terrain: 'snow-mountains' }), gw.tableKey(data, { terrain: 'coast' })], ['forest', 'mountains', 'clear']);
  assert.equal(gw.tableKey(data, { terrain: 'forested-mountains' }), 'mountains');
  assert.equal(gw.tableKey(data, { terrain: 'plains', hazard: 'radiation' }), 'radioactive');
  assert.equal(gw.tableKey(data, { terrain: 'desert', feature: 'ruin' }), 'ruins');
  assert.deepEqual(gw.rollEncounter(data, 'mountains', seq(0)), { table: 'mountains', roll: 1, creature: 'Podog', number: 1 });
  assert.equal(gw.rollEncounter(data, 'ruins', seq(0.99)).creature, 'No Encounter');
  assert.deepEqual([gw.rollNumber('2d4', seq(0.99)), gw.rollNumber('1'), gw.rollNumber(null)], [8, 1, 1]);
});

test('bestiary creatures with a dice attack can be fought; the rest are reported, not invented', () => {
  const yexil = gw.playableCreature(region.bestiary, 'Yexil');
  assert.deepEqual([yexil.definition.ac, yexil.definition.hd, yexil.definition.natural, yexil.definition.large], [6, 10, [3, 6], true]);
  assert.match(yexil.definition.notes, /Not yet played: Eye laser/);
  assert.equal(gw.playableCreature(region.bestiary, 'Badder').definition, gw.CREATURES.badder);
  assert.equal(gw.playableCreature(region.bestiary, 'Horl Choo').definition.natural.join('d'), '3d6');
  for (const name of ['Hisser', 'Perth', 'Android', 'Tribesmen', 'Cryptic Alliance', 'Robotic Unit', 'Kep', 'Zarn', 'Win Seen', 'Barl Nep']) assert.equal(gw.playableCreature(region.bestiary, name), null, name);
  const names = new Set(Object.values(region.encounters.ENCOUNTER_TABLES).flat().map(row => row.creature));
  const playable = [...names].filter(n => gw.playableCreature(region.bestiary, n)).sort();
  assert.deepEqual(playable, ['Ark', 'Arn', 'Badder', 'Blaash', 'Blight', 'Brutorz', 'Cal Then', 'Ert', 'Fen', 'Fleshin', 'Herkel', 'Horl Choo', 'Obb', 'Parn', 'Pineto', 'Podog', 'Rakox', 'Sep', 'Serf', 'Soul Besh', 'Yexil']);
  const character = { ...gw.CREATURES, selectionComplete: true, effects: {}, hp: 30, attributes: { CN: 10 } };
  const fight = gw.createEncounter(character, { creature: yexil.key, definition: yexil.definition, count: 5, meeting: true, rng: seq(0.3, 0.6, 0.2, 0.8) });
  assert.equal(fight.actors.length, 6);
  assert.equal(fight.creatureName, 'Yexil');
  assert.equal(new Set(fight.actors.map(a => `${a.x},${a.y}`)).size, 6);
  assert.throws(() => gw.createEncounter(character, { creature: 'badder', count: 9 }));
});

test('poison and radiation attacks are read from the bestiary and resolved on the matrices', () => {
  const def = name => gw.playableCreature(region.bestiary, name).definition;
  assert.deepEqual(def('Horl Choo').poison, { intensity: 9, paralytic: false, stone: false });
  assert.deepEqual([def('Serf').natural, def('Serf').poison.intensity], [[0, 6], 8]);
  assert.deepEqual([def('Soul Besh').natural, def('Soul Besh').poison, def('Soul Besh').drain], [[1, 6], { intensity: 18, paralytic: true, stone: false }, 12]);
  assert.deepEqual([def('Blaash').radiate, def('Blaash').natural], [{ intensity: 18, range: 5 }, undefined]);
  assert.equal(def('Ert').poison.stone, true);
  assert.equal(def('Yexil').poison, undefined);
  const survivor = (poisonResistance, radiationResistance = 10) => ({ name: 'Ashe', species: 'psh', selectionComplete: true, hp: 40, maxHp: 40, armorClass: 9, mutations: [], attributes: { MS: 10, IN: 10, DX: 10, CH: 10, CN: 10, PS: 10 }, equipment: { weaponId: 'long-sword', armorId: 'none' }, effects: { movementMultiplier: 1, attacksPerRound: 1, mentalResistance: 10, poisonResistance, radiationResistance }, reviewRequired: [], experience: 0 });
  const meet = (name, c, rolls) => { const s = gw.createEncounter(c, { creature: name, definition: def(name), count: 1, rng: seq(0.9, 0.1, 0.5) }); const foe = s.actors[1], pc = s.actors[0]; foe.x = pc.x + 1; foe.y = pc.y; return gw.resolveRound(s, { action: 'rest' }, { rng: seq(...rolls) }); };
  // Serf claws: intensity 8 against resistance 6 is 6 on the matrix: death. Against 9 it is 3 dice. Against 12, nothing.
  assert.match(meet('Serf', survivor(6), [0.99]).log.join(' '), /Poison intensity 8 vs 6: fatal, and there is no antidote/);
  let after = meet('Serf', survivor(9), [0.99]);
  assert.match(after.log.join(' '), /Poison intensity 8 vs 9: 3d6/);
  assert.equal(after.actors[0].hp, 40 - 18);
  assert.match(meet('Serf', survivor(12), [0.99]).log.join(' '), /Poison intensity 8 vs 12: no effect/);
  assert.doesNotMatch(meet('Serf', survivor(6), [0]).log.join(' '), /Poison/, 'a miss delivers no poison');
  // Soul Besh: D on a paralytic poison paralyses, and a lone paralysed survivor dies.
  after = meet('Soul Besh', survivor(10), [0.99]);
  assert.match(after.log.join(' '), /Paralytic poison intensity 18 vs 10: Ashe is paralysed and helpless\. Soul Besh 1 drains 12 hit points a turn/);
  assert.equal(after.actors[0].hp, 0);
  // Blaash: no attack roll; everyone within 5 m is exposed to intensity 18.
  after = meet('Blaash', survivor(10, 18), [0.5]);
  assert.match(after.log.join(' '), /gives off radiation, 5 m radius\. Radiation intensity 18 vs 18/);
});

test('hex steps: six neighbours, odd columns set half a hex lower', () => {
  assert.equal(stepsFrom(region, 4).length, 6);
  assert.deepEqual(scenePath(region, { x: 15, y: 11 }, { x: 16, y: 11 }).length, 1);
  assert.deepEqual(scenePath(region, { x: 15, y: 11 }, { x: 16, y: 12 }).length, 1);
  assert.deepEqual(scenePath(region, { x: 15, y: 11 }, { x: 16, y: 10 }).length, 2);
  assert.deepEqual(scenePath(region, { x: 14, y: 11 }, { x: 15, y: 10 }).length, 1);
});

test('every exit leads to a scene and lands on an open cell there', () => {
  for (const scene of Object.values(SCENES)) {
    for (const site of scene.sites) {
      assert.equal(isBlocked(scene, site.x, site.y), false, `${scene.id}/${site.id}`);
      if (site.kind !== 'exit') continue;
      const to = getScene(site.to), at = sitePosition(to, site.arrive);
      assert.equal(isBlocked(to, at.x, at.y), false);
      assert.ok(to.sites.some(s => s.id === site.arrive));
    }
    if (scene.parent) assert.ok(exitTo(scene, scene.parent), `${scene.id} has a way out`);
  }
});

test('Eden Valley is a walled hex map: the gate is reachable and the country outside is not', () => {
  const valley = getScene('eden-valley'), start = sitePosition(valley, 'trading-post'), gate = sitePosition(valley, 'gate');
  assert.equal(valley.layout, 'hex');
  const path = scenePath(valley, start, gate);
  assert.ok(path.length >= 1 && path.length <= 4);
  assert.ok(path.every(p => !isBlocked(valley, p.x, p.y)));
  assert.equal(scenePath(valley, start, { x: 0, y: 0 }), null);
  assert.equal(scenePath(valley, start, { x: 99, y: 5 }), null);
  assert.deepEqual(valley.sites.filter(s => s.kind === 'place').map(s => s.name), ['Ape Village', 'Complex entrance', 'Rats', 'Bears', 'Badgers', 'Reptiles', 'Cats', 'Rabbits', 'Dogs', 'Bridge', 'Bridge']);
  assert.equal(new Set(valley.sites.map(s => `${s.x},${s.y}`)).size, valley.sites.length, 'no two sites share a hex');
  assert.ok(valley.open.cols < valley.cols && valley.open.rows < valley.rows);
  // Each site sits on the hex under its point on the referee's map (within one hex of it).
  const gatePx = cellPixel(valley, gate.x, gate.y);
  assert.ok(Math.hypot(gatePx.x - 990, gatePx.y - 785) < 33);
  // Rats to Badgers is about 122 px on the map, 760 m: four 200 m hexes.
  assert.equal(scenePath(valley, sitePosition(valley, 'rats'), sitePosition(valley, 'badgers')).length, 4);
});

test('movement keys take one step: six ways on hexes, four on squares, never into a closed cell', () => {
  const valley = getScene('eden-valley'), at = sitePosition(valley, 'cats'), legacy = getScene('legacy');
  const steps = ['n', 'ne', 'se', 's', 'sw', 'nw'].map(d => stepToward(valley, at, d));
  assert.equal(new Set(steps.map(p => `${p.x},${p.y}`)).size, 6);
  for (const p of steps) assert.equal(scenePath(valley, at, p).length, 1, 'each is an adjacent hex');
  // Sideways keys keep to the row whichever column you stand in.
  assert.deepEqual([stepToward(valley, at, 'e'), stepToward(valley, at, 'w')], [{ x: at.x + 1, y: at.y }, { x: at.x - 1, y: at.y }]);
  const gate = sitePosition(valley, 'gate');
  assert.ok(['n', 'ne', 'se', 's', 'sw', 'nw'].some(d => stepToward(valley, gate, d) === null), 'the wall stops a step');
  assert.deepEqual(stepToward(legacy, { x: 2, y: 5 }, 'e'), { x: 3, y: 5 });
  assert.equal(stepToward(legacy, { x: 2, y: 5 }, 'ne'), null);
  assert.equal(stepToward(legacy, { x: 0, y: 0 }, 'w'), null);
});

test('scenes nest from the region down, and a new character starts in the first scene', () => {
  assert.deepEqual(ancestry(getScene('eden-valley')).map(s => s.id), ['eden-region', 'eden-valley']);
  const start = startOf(FIRST_SCENE);
  assert.equal(siteAt(start).kind, 'town');
  assert.equal(placeName(start), 'Trading post');
  assert.equal(placeName({ scene: 'eden-region', position: { x: 0, y: 0 } }), 'Wilderness');
  assert.equal(placeName({ scene: 'not-loaded', position: { x: 0, y: 0 } }), 'Beyond Eden Valley');
  assert.equal(startOf('eden-region').sceneRev, 2);
  assert.equal(placeName({ scene: 'eden-valley', position: { x: 26, y: 16 } }), 'Eden Valley');
  assert.equal(startOf(FIRST_SCENE).sceneRev, 2);
});

test('a save from before scenes still stands on the old grid', () => {
  const old = { position: { x: 2, y: 5 } };
  assert.equal(sceneOf(old).id, 'legacy');
  assert.equal(siteAt(old).kind, 'town');
  assert.equal(scenePath(sceneOf(old), { x: 2, y: 5 }, { x: 7, y: 5 }).length, 5);
});

test('the clock starts at 06:00 on day 1, carries past midnight and adds rested days', () => {
  assert.equal(clockOf({}).text, 'Day 1, 06:00 (morning)');
  const late = addMinutes({}, 19 * 60);
  assert.deepEqual([late.days, late.minutes], [1, 60]);
  assert.equal(clockOf(late).text, 'Day 2, 01:00 (night)');
  assert.equal(clockOf({ days: 3, minutes: 780 }).text, 'Day 4, 13:00 (afternoon)');
});

test('distances and times read in the scene\'s own units', () => {
  assert.equal(describeDistance(getScene('eden-valley'), 5), '1.0 km');
  assert.equal(describeDistance(getScene('eden-valley'), 2), '400 m');
  assert.equal(describeDistance(getScene('eden-region'), 2), '6 miles');
  assert.deepEqual([describeTime(30), describeTime(150), describeTime(240), describeTime(1500)], ['30 min', '2 h 30 min', '4 h', '1 d 1 h']);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENES, getScene, sceneOf, siteAt, scenePath, sitePosition, startOf, ancestry, exitTo, isBlocked, clockOf, addMinutes, describeDistance, describeTime, placeName, FIRST_SCENE } from '../../../gamma-world/scenes.js';

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

test('Eden Valley is walled: the gate is reachable and the country outside is not', () => {
  const valley = getScene('eden-valley'), start = sitePosition(valley, 'trading-post'), gate = sitePosition(valley, 'gate');
  const path = scenePath(valley, start, gate);
  assert.ok(path.length >= Math.abs(gate.x - start.x) + Math.abs(gate.y - start.y));
  assert.ok(path.every(p => !isBlocked(valley, p.x, p.y)));
  assert.equal(scenePath(valley, start, { x: 0, y: 0 }), null);
  assert.equal(scenePath(valley, start, { x: 99, y: 5 }), null);
  assert.deepEqual(valley.sites.filter(s => s.kind === 'place').map(s => s.name), ['Ape Village', 'Complex entrance', 'Rats', 'Bears', 'Badgers', 'Reptiles', 'Cats', 'Rabbits', 'Dogs', 'Bridge', 'Bridge']);
  assert.ok(valley.open.cols < valley.cols && valley.open.rows < valley.rows);
});

test('scenes nest from the region down, and a new character starts in the first scene', () => {
  assert.deepEqual(ancestry(getScene('eden-valley')).map(s => s.id), ['eden-region', 'eden-valley']);
  const start = startOf(FIRST_SCENE);
  assert.equal(siteAt(start).kind, 'town');
  assert.equal(placeName(start), 'Trading post');
  assert.equal(placeName({ scene: 'eden-region', position: { x: 0, y: 0 } }), 'Wilderness');
  assert.equal(placeName({ scene: 'eden-valley', position: { x: 20, y: 14 } }), 'Eden Valley');
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

import test from 'node:test';
import assert from 'node:assert/strict';
import { MISSILE_WEAPONS, GIANT_ROCK_PROFILES, ARTILLERY_WEAPONS, missileDataFor, giantRockDataFor, rangeBand } from '../src/missiles.js';

test('existing missile and artillery range contracts remain unchanged', () => {
  assert.equal(MISSILE_WEAPONS.longbow.rof, 2);
  assert.equal(rangeBand(7, MISSILE_WEAPONS.longbow).band, 'short');
  assert.equal(rangeBand(10, MISSILE_WEAPONS.longbow).band, 'medium');
  assert.equal(rangeBand(20, MISSILE_WEAPONS.longbow).band, 'long');
  assert.equal(rangeBand(22, ARTILLERY_WEAPONS.lightCatapult).band, 'medium');
  assert.equal(rangeBand(10, ARTILLERY_WEAPONS.lightCatapult).ok, false);
});

test('BATTLESYSTEM Hill Giant example is 7/14/20 and 2d8', () => {
  const b = giantRockDataFor('Hill giant');
  assert.ok(b);
  assert.equal(b.cls, 'thrown');
  assert.equal(b.rof, 1);
  assert.equal(b.damage, '2d8');
  assert.deepEqual([b.s,b.m,b.l], [7,14,20]);
  assert.ok(!Object.values(ARTILLERY_WEAPONS).includes(b));
  assert.deepEqual(rangeBand(7,b), {ok:true,band:'short',arDelta:0});
  assert.deepEqual(rangeBand(14,b), {ok:true,band:'medium',arDelta:2});
  assert.deepEqual(rangeBand(20,b), {ok:true,band:'long',arDelta:5});
});

test('all supported giant races resolve subtype rock ranges and damage', () => {
  const expected = {
    hill: [[7,14,20],'2d8'], mountain:[[7,14,20],'2d8'],
    frost:[[7,14,20],'2d10'], fire:[[7,14,20],'2d10'],
    fog:[[8,16,24],'2d10'], cloud:[[8,16,24],'2d12'],
    storm:[[8,16,24],'3d12'], stone:[[10,20,30],'3d10']
  };
  for (const [type,[rng,dmg]] of Object.entries(expected)) {
    const b = GIANT_ROCK_PROFILES[type];
    assert.deepEqual([b.s,b.m,b.l],rng,type);
    assert.equal(b.damage,dmg,type);
    assert.equal(b.cls,'thrown',type);
    assert.equal(b.rof,1,type);
  }
});

test('giant race normalization accepts both Giant, Hill and Hill giant forms', () => {
  assert.equal(giantRockDataFor('Giant, Hill'), GIANT_ROCK_PROFILES.hill);
  assert.equal(giantRockDataFor('Hill Giants'), GIANT_ROCK_PROFILES.hill);
  assert.equal(giantRockDataFor('GIANT, STONE'), GIANT_ROCK_PROFILES.stone);
  assert.equal(giantRockDataFor('Ogre'), null);
});

test('explicit species rock aliases remain supported', () => {
  assert.equal(missileDataFor('Hill giant boulder'), GIANT_ROCK_PROFILES.hill);
  assert.equal(missileDataFor('Stone giant rock'), GIANT_ROCK_PROFILES.stone);
  assert.equal(missileDataFor('Cloud giant boulder'), GIANT_ROCK_PROFILES.cloud);
});

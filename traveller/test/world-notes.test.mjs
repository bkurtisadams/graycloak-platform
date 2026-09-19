// world-notes.test.mjs — Book 3 pp.5-11 beyond the one-line descriptions.

import test from 'node:test';
import assert from 'node:assert/strict';
import { atmosphereGear, lawCheck, prohibitedWeaponKeys, starportLine, worldDetail } from '../src/world-notes.js';

test('Book 3 p.8: law levels are cumulative, and 9 forbids carrying anything', () => {
  assert.deepEqual(prohibitedWeaponKeys(0), []);
  // Level 2 prohibits portable energy weapons and keeps level 1's.
  assert.ok(prohibitedWeaponKeys(2).includes('laser-rifle'));
  assert.ok(prohibitedWeaponKeys(2).includes('body-pistol'), 'level 1 still applies');
  // Level 5 prohibits personal concealable firearms, and everything below.
  for (const key of ['revolver', 'automatic-pistol', 'submachine-gun', 'automatic-rifle', 'laser-carbine']) {
    assert.ok(prohibitedWeaponKeys(5).includes(key), `${key} at law 5`);
  }
  assert.equal(prohibitedWeaponKeys(5).includes('shotgun'), false, 'shotguns wait for level 7');
  assert.ok(prohibitedWeaponKeys(7).includes('shotgun'));
  assert.ok(prohibitedWeaponKeys(8).includes('sword'));
  assert.ok(prohibitedWeaponKeys(9).includes('*'), 'level 9 is possession outside the home');
});

test('the law check reads what the party carries against what the world forbids', () => {
  const party = [
    { name: 'Alina Voss', weaponKey: 'body-pistol', weaponName: 'Body Pistol' },
    { name: 'Hawkeye', weaponKey: 'rifle', weaponName: 'Rifle' },
    { name: 'Elias', weaponKey: 'hands', weaponName: 'Hands' }
  ];
  const at5 = lawCheck({ lawLevel: 5 }, party);
  assert.deepEqual(at5.caught.map((entry) => entry.name), ['Alina Voss'], 'a rifle is legal until level 6');
  assert.match(at5.text, /prohibited outside the starport/);
  assert.match(at5.text, /Throw 5\+ to avoid arrest/);

  // Level 6 catches the rifle too; bare hands are never listed.
  assert.deepEqual(lawCheck({ lawLevel: 6 }, party).caught.map((entry) => entry.name), ['Alina Voss', 'Hawkeye']);
  // Nothing prohibited at all, so nothing to say.
  assert.equal(lawCheck({ lawLevel: 0 }, party), null);
  assert.equal(lawCheck({ lawLevel: 5 }, [{ name: 'Elias', weaponKey: 'hands', weaponName: 'Hands' }]).text, null);
});

test('Book 3 p.6: what each starport can do, and what each atmosphere demands', () => {
  assert.match(starportLine('A'), /refined fuel.*annual overhaul.*starships and non-starships/);
  assert.match(starportLine('C'), /unrefined fuel/);
  assert.equal(starportLine('C').includes('overhaul'), false, 'no overhaul below B');
  assert.equal(starportLine('E'), 'no fuel, facilities or bases');
  assert.equal(starportLine('X'), 'no fuel, facilities or bases');

  assert.match(atmosphereGear(0), /Vacc suit/);
  assert.match(atmosphereGear(3), /Respirator/);
  assert.match(atmosphereGear(7), /Filter mask/, 'tainted standard needs a mask');
  assert.equal(atmosphereGear(6), null, 'standard is breathable');
  assert.match(atmosphereGear(12), /defeated in 2-12 hours/);
});

test('the detail behind each digit cites its page and explains the digit', () => {
  const detail = worldDetail({ starport: 'B', size: 7, atmosphere: 6, hydrographics: 5, population: 8, government: 7, lawLevel: 5, techLevel: 9 });
  assert.match(detail.population, /exponent of ten: about 100,000,000/);
  assert.match(detail.size, /gravity/, 'size is the digit the encumbrance rule reads');
  assert.match(detail.government, /rival governments compete/, 'balkanization says where the law level comes from');
  assert.match(detail.lawLevel, /does not apply at a starport/);
  for (const value of Object.values(detail)) assert.match(value, /^Book 3 p\.\d+\./);
});

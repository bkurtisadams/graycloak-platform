// pp43-44-matrices.test.js — every cell of Book 1 (1977) p.43's RANGE MATRIX
// and p.44's WEAPONS TABLE, transcribed from docs/rules-1977 and compared with
// what the package encodes. The fight screen is arithmetic on these numbers,
// so a single wrong cell is a wrong throw in every fight for that weapon.
//
// One reading has to be stated: the book prints a "Required Level" and says
// the penalty applies to a character who does NOT have at least that level, so
// the highest score still penalised is one below it. The package stores that
// lower bound as `lowMax`, hence the +1 here.

import test from 'node:test';
import assert from 'node:assert/strict';
import { PERSONAL_WEAPONS, RANGE_MATRIX, getPersonalWeapon } from '../index.js';
// Book 1 p.43 RANGE MATRIX, transcribed from docs/rules-1977. null = "no".
const P43 = {
  hands:[2,1,null,null,null,'1D'], claws:[1,2,null,null,null,'1D+3'], teeth:[2,0,null,null,null,'2D-3'],
  horns:[-1,1,null,null,null,'2D-5'], hooves:[-1,2,null,null,null,'2D-6'], stinger:[4,2,null,null,null,'3D-6'],
  thrasher:[5,1,null,null,null,'2D+2'], club:[1,2,null,null,null,'2D-3'],
  dagger:[1,-1,null,null,null,'2D-3'], blade:[1,1,null,null,null,'2D'], foil:[-1,0,null,null,null,'1D+4'],
  cutlass:[-4,2,null,null,null,'2D+4'], sword:[-2,1,null,null,null,'2D+1'], broadsword:[-8,3,null,null,null,'4D+0'],
  bayonet:[-1,2,null,null,null,'3D'], spear:[-2,1,null,null,null,'2D+2'], halberd:[0,1,null,null,null,'3D'],
  pike:[-4,4,null,null,null,'3D'], cudgel:[0,0,null,null,null,'2D'],
  'body-pistol':[2,1,-6,null,null,'3D-8'], 'automatic-pistol':[1,2,-4,-6,null,'3D-3'], revolver:[1,2,-3,-5,null,'3D-3'],
  carbine:[-4,1,-2,-4,-5,'4D-8'], rifle:[-4,1,0,-1,-3,'3D'], 'automatic-rifle':[-8,0,2,1,-2,'3D'],
  shotgun:[-8,1,3,-6,null,'4D'], 'submachine-gun':[-4,3,3,-6,-9,'3D-3'],
  'laser-carbine':[-2,1,1,1,0,'4D'], 'laser-rifle':[-4,2,2,2,1,'5D']
};
// Book 1 p.44 WEAPONS TABLE: [characteristic, lowMax, lowDM, highMin, highDM, weakenedDM]
const P44 = {
  hands:['STR',6,-2,9,1,-2], club:['STR',5,-4,8,2,-1],
  dagger:['STR',4,-2,8,2,-2], blade:['STR',5,-2,9,1,-2], foil:['STR',5,-1,10,1,-2],
  cutlass:['STR',7,-2,11,2,-4], sword:['STR',6,-2,10,1,-3], broadsword:['STR',8,-4,12,2,-4],
  bayonet:['STR',5,-2,9,2,-2], spear:['STR',5,-1,9,2,-3], halberd:['STR',6,-2,10,2,-3],
  pike:['STR',7,-3,10,2,-3], cudgel:['STR',5,-1,8,2,-1],
  'body-pistol':['DEX',8,-3,11,1,0], 'automatic-pistol':['DEX',7,-2,10,1,0], revolver:['DEX',7,-2,9,1,0],
  carbine:['DEX',5,-1,9,1,0], rifle:['DEX',6,-2,8,2,0], 'automatic-rifle':['DEX',7,-2,10,2,0],
  shotgun:['DEX',4,-1,9,1,0], 'submachine-gun':['DEX',6,-2,9,2,0],
  'laser-carbine':['DEX',6,-3,10,2,0], 'laser-rifle':['DEX',7,-3,11,2,0]
};
const wound = (w) => `${w.damageDice}D${w.damageModifier > 0 ? '+' + w.damageModifier : w.damageModifier < 0 ? w.damageModifier : ''}`;
test('p.43 RANGE MATRIX: every weapon at every range, and its wound', () => {
  for (const [key, row] of Object.entries(P43)) {
    assert.ok(RANGE_MATRIX[key], `${key} is missing from RANGE_MATRIX`);
    assert.deepEqual(RANGE_MATRIX[key], row.slice(0, 5), `${key} range DMs`);
    assert.equal(wound(getPersonalWeapon(key)), row[5].replace('+0', ''), `${key} wound inflicted`);
  }
});

test('p.44 WEAPONS TABLE: required and advantageous levels, and the weakened DM', () => {
  for (const [key, row] of Object.entries(P44)) {
    const weapon = getPersonalWeapon(key);
    assert.deepEqual(
      [weapon.characteristic, weapon.lowMax + 1, weapon.lowDM, weapon.highMin, weapon.highDM, weapon.fatigueDM ?? 0],
      row,
      `${key}: characteristic, required level, required DM, advantageous level, advantageous DM, weakened DM`
    );
  }
});

test('the package encodes exactly the weapons the two pages print', () => {
  assert.deepEqual(Object.keys(PERSONAL_WEAPONS).filter((key) => !P43[key]), [], 'nothing encoded that p.43 does not print');
  assert.deepEqual(Object.keys(P43).filter((key) => !PERSONAL_WEAPONS[key]), [], 'nothing printed that the package omits');
  // The animal rows carry no required or advantageous characteristic.
  for (const key of ['claws', 'teeth', 'horns', 'hooves', 'stinger', 'thrasher']) {
    assert.equal(P44[key], undefined, `${key} has no p.44 row`);
  }
});

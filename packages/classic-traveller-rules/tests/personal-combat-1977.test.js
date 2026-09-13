// Tests derived from Classic Traveller Book 1 (1977), pp.42-44.
// Written from the printed tables rather than from the module, so a value
// that drifts in the catalog fails here instead of being pinned by it.
//
// Target numbers are 8 - armorDM - rangeDM.

import test from 'node:test';
import assert from 'node:assert';
import {
  PERSONAL_WEAPONS,
  weaponTargetNumber,
  personalWeaponSkillLevel,
  weaponCharacteristicDM
} from '../src/combat/personal-combat.js';

// Book 1 p.43 wound column. Nine of these carried a constant the old schema
// could not express, so they were stored as an approximate bare dice count.
test('Book 1 p.43 wound formulas carry their printed constant', () => {
  const wounds = {
    'hands': [1, 0],                          // 1D
    'claws': [1, 3],                          // 1D+3
    'teeth': [2, -3],                         // 2D-3
    'horns': [2, -5],                         // 2D-5
    'hooves': [2, -6],                        // 2D-6
    'stinger': [3, -6],                       // 3D-6
    'thrasher': [2, 2],                       // 2D+2
    'club': [2, -3],                          // 2D-3
    'dagger': [2, -3],                        // 2D-3
    'blade': [2, 0],                          // 2D
    'foil': [1, 4],                           // 1D+4
    'cutlass': [2, 4],                        // 2D+4
    'sword': [2, 1],                          // 2D+1
    'broadsword': [4, 0],                     // 4D
    'bayonet': [3, 0],                        // 3D
    'spear': [2, 2],                          // 2D+2
    'halberd': [3, 0],                        // 3D
    'pike': [3, 0],                           // 3D
    'cudgel': [2, 0],                         // 2D
    'body-pistol': [3, -8],                   // 3D-8
    'automatic-pistol': [3, -3],              // 3D-3
    'revolver': [3, -3],                      // 3D-3
    'carbine': [4, -8],                       // 4D-8
    'rifle': [3, 0],                          // 3D
    'automatic-rifle': [3, 0],                // 3D
    'shotgun': [4, 0],                        // 4D
    'submachine-gun': [3, -3],                // 3D-3
    'laser-carbine': [4, 0],                  // 4D
    'laser-rifle': [5, 0],                    // 5D
  };
  for (const [key, [dice, modifier]] of Object.entries(wounds)) {
    const spec = PERSONAL_WEAPONS[key];
    assert.ok(spec, `${key} is missing from PERSONAL_WEAPONS`);
    assert.equal(spec.damageDice, dice, `${key} damageDice`);
    assert.equal(spec.damageModifier ?? 0, modifier, `${key} damageModifier`);
  }
});

// Blades and Polearms (Book 1 p.11) that the facsimile port omitted. All five
// are reachable through the existing Blade Combat skill.
test('Book 1 blades and polearms absent from the facsimile port are present', () => {
  assert.equal(weaponTargetNumber('foil', 'none', 'close'), 7);
  assert.equal(weaponTargetNumber('foil', 'mesh', 'short'), 12);
  assert.equal(weaponTargetNumber('foil', 'combat', 'short'), 16);
  assert.equal(weaponTargetNumber('spear', 'none', 'close'), 9);
  assert.equal(weaponTargetNumber('spear', 'mesh', 'short'), 9);
  assert.equal(weaponTargetNumber('spear', 'combat', 'short'), 13);
  assert.equal(weaponTargetNumber('halberd', 'none', 'close'), 4);
  assert.equal(weaponTargetNumber('halberd', 'mesh', 'short'), 9);
  assert.equal(weaponTargetNumber('halberd', 'combat', 'short'), 12);
  assert.equal(weaponTargetNumber('pike', 'none', 'close'), 11);
  assert.equal(weaponTargetNumber('pike', 'mesh', 'short'), 6);
  assert.equal(weaponTargetNumber('pike', 'combat', 'short'), 10);
  assert.equal(weaponTargetNumber('cudgel', 'none', 'close'), 8);
  assert.equal(weaponTargetNumber('cudgel', 'mesh', 'short'), 10);
  assert.equal(weaponTargetNumber('cudgel', 'combat', 'short'), 15);

  // Book 1 p.43 note 1: the pike's +4 at short range applies only on the FIRST
  // combat round; thereafter its close-range -4 applies. The catalog holds the
  // printed value; the round-by-round rule belongs to the resolver.
  assert.equal(PERSONAL_WEAPONS.pike.rangeDMs[1], 4);
  assert.equal(PERSONAL_WEAPONS.pike.rangeDMs[0], -4);
});

// Book 3 animal encounters resolve through these same matrices ('as pike',
// 'as mesh'), so animal combat cannot work without the natural-weapon rows.
test('Book 1 natural weapon rows support Book 3 animal encounters', () => {
  assert.equal(weaponTargetNumber('claws', 'none', 'close'), 4);
  assert.equal(weaponTargetNumber('claws', 'cloth', 'short'), 5);
  assert.equal(weaponTargetNumber('teeth', 'none', 'close'), 4);
  assert.equal(weaponTargetNumber('teeth', 'cloth', 'short'), 8);
  assert.equal(weaponTargetNumber('horns', 'none', 'close'), 7);
  assert.equal(weaponTargetNumber('horns', 'cloth', 'short'), 8);
  assert.equal(weaponTargetNumber('hooves', 'none', 'close'), 6);
  assert.equal(weaponTargetNumber('hooves', 'cloth', 'short'), 4);
  assert.equal(weaponTargetNumber('stinger', 'none', 'close'), 0);
  assert.equal(weaponTargetNumber('stinger', 'cloth', 'short'), 5);
  assert.equal(weaponTargetNumber('thrasher', 'none', 'close'), -4);
  assert.equal(weaponTargetNumber('thrasher', 'cloth', 'short'), 3);

  // Natural weapons reach close and short range only.
  assert.equal(weaponTargetNumber('claws', 'none', 'medium'), null);
  assert.equal(weaponTargetNumber('teeth', 'none', 'medium'), null);
  assert.equal(weaponTargetNumber('horns', 'none', 'medium'), null);
  assert.equal(weaponTargetNumber('hooves', 'none', 'medium'), null);
  assert.equal(weaponTargetNumber('stinger', 'none', 'medium'), null);
  assert.equal(weaponTargetNumber('thrasher', 'none', 'medium'), null);
});

// The animal rows have no skill and no required/advantageous characteristic
// in the book (their p.44 entries are dashes), so the helpers must not fall
// through to Math.max() on an empty list or compare against a null threshold.
test('natural weapons resolve without a skill or a governing characteristic', () => {
  const beast = { characteristics: { STR: 9, DEX: 7, END: 8 }, skills: {} };
  for (const key of ['claws', 'teeth', 'horns', 'hooves', 'stinger', 'thrasher']) {
    assert.equal(personalWeaponSkillLevel(beast, key), 0, `${key} skill level`);
    assert.equal(weaponCharacteristicDM(beast, key), 0, `${key} characteristic DM`);
    assert.equal(PERSONAL_WEAPONS[key].characteristic, null);
  }
});

test('the catalog holds all 29 Book 1 weapon rows', () => {
  assert.equal(Object.keys(PERSONAL_WEAPONS).length, 29);
  for (const key of [
    'hands', 'claws', 'teeth', 'horns',
    'hooves', 'stinger', 'thrasher', 'club',
    'dagger', 'blade', 'foil', 'cutlass',
    'sword', 'broadsword', 'bayonet', 'spear',
    'halberd', 'pike', 'cudgel', 'body-pistol',
    'automatic-pistol', 'revolver', 'carbine', 'rifle',
    'automatic-rifle', 'shotgun', 'submachine-gun', 'laser-carbine',
    'laser-rifle',
  ]) {
    assert.ok(PERSONAL_WEAPONS[key], `${key} is missing`);
  }
});

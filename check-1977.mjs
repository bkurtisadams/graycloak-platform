// check-1977.mjs - verify personal-combat.js against the 1977 Book 1 tables.
//
// Run from the repo root:
//   node check-1977.mjs
//
// Expects ct1977-book1-tables.json beside it. Exits 0 if everything matches,
// 1 if anything differs, so it can gate a commit if you want it to.

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const MODULE_PATH = process.argv[2]
  ?? 'packages/classic-traveller-rules/src/combat/personal-combat.js';
const TABLES_PATH = path.join(import.meta.dirname, 'ct1977-book1-tables.json');

const book = JSON.parse(readFileSync(TABLES_PATH, 'utf8'));
const mod = await import(pathToFileURL(path.resolve(MODULE_PATH)).href);

// camelCase (book extraction) -> kebab-case (module key style)
const KEY = {
  hands: 'hands', claws: 'claws', teeth: 'teeth', horns: 'horns',
  hooves: 'hooves', stinger: 'stinger', thrasher: 'thrasher',
  club: 'club', dagger: 'dagger', blade: 'blade', foil: 'foil',
  cutlass: 'cutlass', sword: 'sword', broadsword: 'broadsword',
  bayonet: 'bayonet', spear: 'spear', halberd: 'halberd',
  pike: 'pike', cudgel: 'cudgel',
  bodyPistol: 'body-pistol', automaticPistol: 'automatic-pistol',
  revolver: 'revolver', carbine: 'carbine', rifle: 'rifle',
  automaticRifle: 'automatic-rifle', shotgun: 'shotgun',
  submachineGun: 'submachine-gun', laserCarbine: 'laser-carbine',
  laserRifle: 'laser-rifle'
};

const ARM = book.armorColumns;   // nothing jack mesh cloth reflec ablat battle
const RNG = book.rangeBands;     // close short medium long veryLong
const problems = [];
const missing = [];

for (const [bookKey, codeKey] of Object.entries(KEY)) {
  const wm = mod.WEAPONS_MATRIX[codeKey];
  const rm = mod.RANGE_MATRIX[codeKey];
  const spec = mod.PERSONAL_WEAPONS[codeKey];
  if (!wm || !rm || !spec) { missing.push(codeKey); continue; }

  ARM.forEach((col, i) => {
    const want = book.weaponsMatrix[bookKey][col];
    if (wm[i] !== want) problems.push(`WEAPONS_MATRIX ${codeKey}.${col}: ${wm[i]} should be ${want}`);
  });

  RNG.forEach((col, i) => {
    const want = book.rangeMatrix[bookKey][col];
    const got = rm[i] ?? null;
    if (got !== want) problems.push(`RANGE_MATRIX ${codeKey}.${col}: ${got} should be ${want}`);
  });

  const dmg = book.damage[bookKey];
  if (spec.damageDice !== dmg.dice) {
    problems.push(`PERSONAL_WEAPONS ${codeKey}.damageDice: ${spec.damageDice} should be ${dmg.dice}`);
  }
  const mods = spec.damageModifier ?? 0;
  if (mods !== dmg.modifier) {
    problems.push(`PERSONAL_WEAPONS ${codeKey}.damageModifier: ${spec.damageModifier ?? '(absent)'} should be ${dmg.modifier}`);
  }
}

const extra = Object.keys(mod.PERSONAL_WEAPONS)
  .filter((k) => !Object.values(KEY).includes(k));

console.log(`checked ${Object.keys(KEY).length} weapons in ${MODULE_PATH}`);
if (missing.length) console.log(`\nnot found in the module (${missing.length}): ${missing.join(', ')}`);
if (extra.length) console.log(`\nin the module but not in Book 1 (${extra.length}): ${extra.join(', ')}`);

if (problems.length) {
  console.log(`\n${problems.length} mismatch(es):`);
  for (const p of problems) console.log('  ' + p);
} else if (!missing.length) {
  console.log('\nall matrix, range and damage values match the 1977 tables.');
}

process.exit(problems.length || missing.length ? 1 : 0);

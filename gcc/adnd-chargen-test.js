// adnd-chargen-test.js - headless validation of the ported engine
const CG = require('./adnd-chargen.js');

let pass = 0, fail = 0;
function ok(name, cond) { cond ? (pass++) : (fail++, console.log('  FAIL: ' + name)); }
function inRange(v, lo, hi) { return typeof v === 'number' && v >= lo && v <= hi; }

// --- DMG methods: shape + ranges ---
const mI = CG.rollMethodI();
ok('Method I returns 1 set', Array.isArray(mI) && mI.length === 1);
ok('Method I set has 6 scores', mI[0].length === 6);
ok('Method I scores 3-18', mI[0].every(s => inRange(s, 3, 18)));

const mII = CG.rollMethodII();
ok('Method II returns 1 set of 6', mII.length === 1 && mII[0].length === 6);
ok('Method II scores 3-18', mII[0].every(s => inRange(s, 3, 18)));
ok('Method II kept the highest 6 (sorted desc)', mII[0].every((s,i,a) => i===0 || a[i-1] >= s));

const mIII = CG.rollMethodIII();
ok('Method III returns 1 set of 6 (fixed order)', mIII.length === 1 && mIII[0].length === 6);
ok('Method III scores 3-18', mIII[0].every(s => inRange(s, 3, 18)));

const mIV = CG.rollMethodIV();
ok('Method IV returns 12 sets', mIV.length === 12);
ok('Method IV each set has 6 scores 3-18', mIV.every(set => set.length === 6 && set.every(s => inRange(s,3,18))));

// --- viability (the two-15s PHB rule) ---
ok('isViable true for two 15s', CG.isViable([15,15,9,9,9,9]) === true);
ok('isViable true for higher', CG.isViable([18,16,3,3,3,3]) === true);
ok('isViable false for one 15', CG.isViable([15,14,14,14,14,14]) === false);
ok('isViable false for none', CG.isViable([14,14,14,14,14,14]) === false);

// --- racial adjustment + validateAndBuild ---
const base = { str:16, int:12, wis:11, dex:15, con:15, cha:10 };
const human = CG.validateAndBuild('human', 'fighter', base, 'male');
ok('human fighter is valid', human.valid === true);
ok('build returns finalStats with 6 abilities', human.valid && ['str','int','wis','dex','con','cha'].every(k => k in human.finalStats));
ok('build returns an age', human.valid && inRange(human.age, 1, 200));
ok('build returns height/weight', human.valid && human.height > 0 && human.weight > 0);
ok('build returns secondarySkills array', human.valid && Array.isArray(human.secondarySkills));

// race/class legality
const badRace = CG.validateAndBuild('halfling', 'magic-user', base, 'male');
ok('halfling magic-user rejected', badRace.valid === false && typeof badRace.error === 'string');

// class minimum failure
const weak = { str:6, int:6, wis:6, dex:6, con:6, cha:6 };
const badMin = CG.validateAndBuild('human', 'paladin', weak, 'male');
ok('underqualified paladin rejected', badMin.valid === false);

// dwarf con bonus applied (con +1)
const dwarf = CG.applyRacialAdj({ str:14, int:10, wis:10, dex:10, con:14, cha:10 }, 'dwarf');
ok('dwarf gets +1 con, -1 cha', dwarf.con === 15 && dwarf.cha === 9);

// --- getValidClasses ---
const strong = CG.applyRacialAdj({ str:17, int:16, wis:16, dex:16, con:16, cha:17 }, 'human');
const valid = CG.getValidClasses('human', strong);
ok('getValidClasses returns an array', Array.isArray(valid) && valid.length > 0);
ok('high stats qualify for paladin', valid.includes('paladin'));

const lowCha = CG.getValidClasses('human', { str:12, int:9, wis:13, dex:12, con:12, cha:9 });
ok('low cha disqualifies paladin', !lowCha.includes('paladin'));

// --- derived rolls ---
const hp = CG.rollHp('fighter', 15);
ok('fighter L1 HP in d10+conBonus range', inRange(hp, 1, 13));
const gold = CG.rollStartingGold('fighter');
ok('starting gold is a positive number', typeof gold === 'number' && gold > 0);

// --- multiclass ---
const mc = CG.getValidMulticlasses('elf', strong);
ok('elf multiclass options returned', Array.isArray(mc));
const mchp = CG.rollMulticlassHp(['fighter','magic-user'], 15);
ok('multiclass HP is a positive number', typeof mchp === 'number' && mchp > 0);

// --- distribution sanity: Method I should beat Method III rarely-but-plausibly on viability ---
let viableI = 0;
for (let i = 0; i < 1000; i++) if (CG.isViable(CG.rollMethodI()[0])) viableI++;
ok('Method I viability plausible (200-900/1000)', inRange(viableI, 200, 900));

console.log(`\n${pass}/${pass+fail} passed` + (fail ? ` (${fail} FAILED)` : ' — all green'));
process.exit(fail ? 1 : 0);

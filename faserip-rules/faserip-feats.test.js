// faserip-feats test suite — run: node faserip-feats.test.js
import { combinedActionColumn, multipleActionColor, MAX_NONCOMBAT_ACTIONS_PER_ROUND, MAX_COMBAT_PLUS_NONCOMBAT, FEATS_VERSION, FEATS_CERTIFIED } from './faserip-feats.js';

let pass = 0, fail = 0;
function t(label, fn) { try { fn(); pass++; console.log(`  ok  ${label}`); } catch (e) { fail++; console.log(`FAIL  ${label}\n      ${e.message}`); } }
function eq(a, b) { const ja = JSON.stringify(a), jb = JSON.stringify(b); if (ja !== jb) throw new Error(`expected ${jb}, got ${ja}`); }

console.log(`faserip-feats v${FEATS_VERSION}  (FEATS_CERTIFIED=${FEATS_CERTIFIED})\n`);

t('[CERT] Vision (Am) helps She-Hulk (Mn) lift the crane: Unearthly column', () => {
  eq(combinedActionColumn({ leaderRank: 'MN', helperRank: 'AM' }).column, 'UN');
});

t('[CERT] Sunspot (Rm) helping She-Hulk: still Monstrous', () => {
  eq(combinedActionColumn({ leaderRank: 'MN', helperRank: 'RM' }), { shift: 0, column: 'MN', helperCounts: false });
});

t('[CERT] Shaman\'s Amazing wind: Unearthly only if the Judge rules the Power complements the FEAT', () => {
  eq(combinedActionColumn({ leaderRank: 'MN', helperRank: 'AM', complements: true }).column, 'UN');
  eq(combinedActionColumn({ leaderRank: 'MN', helperRank: 'AM', complements: false }).column, 'MN');
});

t('[CERT] multiple actions: automatic+automatic stay automatic; green tougher -> both yellow; yellow -> both red; red cannot pair', () => {
  eq(multipleActionColor(['automatic', 'automatic']).needed, 'automatic');
  eq(multipleActionColor(['automatic', 'green']).needed, 'yellow');
  eq(multipleActionColor(['green', 'yellow']).needed, 'red');
  eq(multipleActionColor(['red', 'green']).possible, false);
});

t('[CERT] up to three non-combat actions a round, or one combat and one non-combat', () => {
  eq(MAX_NONCOMBAT_ACTIONS_PER_ROUND, 3);
  eq(MAX_COMBAT_PLUS_NONCOMBAT, { combat: 1, noncombat: 1 });
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

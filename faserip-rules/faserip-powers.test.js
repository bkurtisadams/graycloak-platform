// faserip-powers test suite — run: node faserip-powers.test.js
// [CERT] = certified against Players Book Appendix A power text.
// [RULED] = Judge ruling, dated in the kernel ERRATA.

import {
  ABSORPTION_POOL_ROUNDS, ABSORPTION_REDIRECT_COLUMNS, absorptionRedirectColumn,
  absorbAttack, applyDamageToPool, absorptionPoolExpired, absorptionDisplayHealth,
  POWERS_VERSION, POWERS_CERTIFIED,
} from './faserip-powers.js';

let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); pass++; console.log(`  ok  ${label}`); }
  catch (e) { fail++; console.log(`FAIL  ${label}\n      ${e.message}`); }
}
function eq(a, b) {
  const ja = JSON.stringify(a), jb = JSON.stringify(b);
  if (ja !== jb) throw new Error(`expected ${jb}, got ${ja}`);
}

console.log(`faserip-powers v${POWERS_VERSION}  (POWERS_CERTIFIED=${POWERS_CERTIFIED})\n`);

t('[CERT] book example: Health 100, Amazing(48) Absorption, absorbed bolt -> 148 displayed', () => {
  const r = absorbAttack({ rankNumber: 48, damage: 48, health: 100 });
  eq(r.health, 100);
  eq(r.pool, 48);
  eq(absorptionDisplayHealth({ health: r.health, pool: r.pool }), 148);
});

t('[CERT] book example continued: 30 points off 148 come out of the pool, real Health untouched', () => {
  const after = applyDamageToPool({ pool: 48, health: 100, damage: 30 });
  eq(after.pool, 18);
  eq(after.health, 100);
  eq(after.fromPool, 30);
});

t('[CERT] when the absorbed energy wears off the character still has 100 Health', () => {
  eq(absorptionDisplayHealth({ health: 100, pool: 18, expired: true }), 100);
});

t('[RULED 2026-09-05] the pool is the Power rank number flat, whatever the damage absorbed', () => {
  eq(absorbAttack({ rankNumber: 48, damage: 5, health: 100 }).pool, 48);
  eq(absorbAttack({ rankNumber: 48, damage: 48, health: 100 }).pool, 48);
});

t('[RULED 2026-09-05] damage above the rank number hits real Health and does not touch the pool', () => {
  const r = absorbAttack({ rankNumber: 48, damage: 60, health: 100 });
  eq(r.absorbed, 48);
  eq(r.healthLoss, 12);
  eq(r.health, 88);
  eq(r.pool, 48);
  eq(absorptionDisplayHealth({ health: r.health, pool: r.pool }), 136);
});

t('[RULED 2026-09-05] the excess is the absorber\'s attack the following round', () => {
  const r = absorbAttack({ rankNumber: 48, damage: 60, health: 100, round: 3 });
  eq(r.redirect, 12);
  eq(r.redirectRound, 4);
});

t('[RULED 2026-09-05] a second absorption refreshes the pool, it does not stack', () => {
  const first = absorbAttack({ rankNumber: 48, damage: 48, health: 100, round: 1 });
  const second = absorbAttack({ rankNumber: 48, damage: 48, health: first.health, round: 4 });
  eq(second.pool, 48);
  eq(second.poolExpiresRound, 14);
});

t('[CERT] the pool dissipates 10 rounds after it was absorbed', () => {
  eq(ABSORPTION_POOL_ROUNDS, 10);
  const r = absorbAttack({ rankNumber: 48, damage: 48, health: 100, round: 2 });
  eq(r.poolExpiresRound, 12);
  eq(absorptionPoolExpired(11, r.poolExpiresRound), false);
  eq(absorptionPoolExpired(12, r.poolExpiresRound), true);
});

t('[CERT] loss spills to real Health once the pool is spent', () => {
  const r = applyDamageToPool({ pool: 10, health: 100, damage: 30 });
  eq(r, { pool: 0, health: 80, fromPool: 10, fromHealth: 20 });
});

t('[RULED 2026-09-05] redirect rolls on the absorbed type\'s own column', () => {
  eq(absorptionRedirectColumn('energy'), 'En');
  eq(absorptionRedirectColumn('physical-blunt'), 'BA');
  eq(absorptionRedirectColumn('physical-edged'), 'EA');
  eq(ABSORPTION_REDIRECT_COLUMNS.force, 'Fo');
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

// faserip-resources test suite — run: node faserip-resources.test.js
import {
  purchaseColor, resourceFeatAvailable, purchaseBlockedByFailure, resolveResourceFeat, bankLoan,
  RESOURCE_FEAT_INTERVAL_DAYS, RESOURCE_KARMA_ALLOWED, RESOURCES_VERSION, RESOURCES_CERTIFIED,
} from './faserip-resources.js';

let pass = 0, fail = 0;
function t(label, fn) { try { fn(); pass++; console.log(`  ok  ${label}`); } catch (e) { fail++; console.log(`FAIL  ${label}\n      ${e.message}`); } }
function eq(a, b) { const ja = JSON.stringify(a), jb = JSON.stringify(b); if (ja !== jb) throw new Error(`expected ${jb}, got ${ja}`); }
const DAY = 86400;

console.log(`faserip-resources v${RESOURCES_VERSION}  (RESOURCES_CERTIFIED=${RESOURCES_CERTIFIED})\n`);

t('[CERT] Peter Parker, Poor Resources, Poor rent: yellow FEAT', () => {
  eq(purchaseColor({ resourceRank: 'PR', itemRank: 'PR' }).needed, 'yellow');
});

t('[CERT] Tony Stark, Excellent Resources: a Good car is a green FEAT', () => {
  eq(purchaseColor({ resourceRank: 'EX', itemRank: 'GD' }).needed, 'green');
});

t('[CERT] RULED 2026-09-05: three ranks below is automatic (Excellent buys Poor freely); two below is green — the Stark "Typical night out" example is in error', () => {
  eq(purchaseColor({ resourceRank: 'EX', itemRank: 'PR' }).automatic, true);
  eq(purchaseColor({ resourceRank: 'EX', itemRank: 'TY' }).needed, 'green');
});

t('[CERT] two ranks below is still green; three or more is automatic', () => {
  eq(purchaseColor({ resourceRank: 'RM', itemRank: 'GD' }).needed, 'green');
  eq(purchaseColor({ resourceRank: 'RM', itemRank: 'TY' }).automatic, true);
});

t('[CERT] a lone character may not try to buy above his Resource rank', () => {
  eq(purchaseColor({ resourceRank: 'PR', itemRank: 'TY' }).allowed, false);
});

t('[CERT] one Resource FEAT per week; another within seven days fails automatically', () => {
  eq(RESOURCE_FEAT_INTERVAL_DAYS, 7);
  eq(resourceFeatAvailable({ lastFeatAt: 0, now: 6 * DAY }).available, false);
  eq(resourceFeatAvailable({ lastFeatAt: 0, now: 7 * DAY }).available, true);
  eq(resourceFeatAvailable({ lastFeatAt: null, now: 0 }).available, true);
});

t('[CERT] after a failure, no item of that rank or higher for a week (saving up)', () => {
  eq(purchaseBlockedByFailure({ failedRank: 'GD', failedAt: 0, itemRank: 'GD', now: 3 * DAY }), true);
  eq(purchaseBlockedByFailure({ failedRank: 'GD', failedAt: 0, itemRank: 'EX', now: 3 * DAY }), true);
  eq(purchaseBlockedByFailure({ failedRank: 'GD', failedAt: 0, itemRank: 'TY', now: 3 * DAY }), false);
  eq(purchaseBlockedByFailure({ failedRank: 'GD', failedAt: 0, itemRank: 'GD', now: 7 * DAY }), false);
});

t('[CERT] Karma may not manipulate a Resource FEAT (Excellent, Good car, roll 30 stays white)', () => {
  eq(RESOURCE_KARMA_ALLOWED, false);
  const r = resolveResourceFeat({ resourceRank: 'EX', itemRank: 'GD', roll: 30, karma: 40 });
  eq([r.total, r.karma, r.karmaAllowed, r.success], [30, 0, false, false]);
});

t('[CERT] resolution rolls on the Resource column; automatic purchases need no roll', () => {
  eq(resolveResourceFeat({ resourceRank: 'EX', itemRank: 'GD', roll: 50 }).success, true);   // Excellent: green from 41
  eq(resolveResourceFeat({ resourceRank: 'EX', itemRank: 'GD', roll: 5 }).success, false);
  eq(resolveResourceFeat({ resourceRank: 'EX', itemRank: 'PR', roll: 1 }).success, true);
});

t('[CERT] Bank Loan: one rank above Resources with no purchase FEAT (RULED 2026-09-05), monthly FEAT two ranks below the item for rank-number months', () => {
  const loan = bankLoan({ resourceRank: 'GD', itemRank: 'EX' });
  eq([loan.allowed, loan.purchaseFeat, loan.paymentRank, loan.months], [true, null, 'TY', 20]);
  eq(loan.monthlyFeat.automatic, false);
  eq(loan.monthlyFeat.needed, 'green');
  eq(bankLoan({ resourceRank: 'GD', itemRank: 'RM' }).allowed, false);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

// faserip-popularity test suite — run: node faserip-popularity.test.js
import {
  DISPOSITION_COLOR, REQUEST_MODIFIERS, requestShift, popularityRank, popularityFeat,
  resolvePopularityFeat, FAILURE_CONSEQUENCE, POPULARITY_KARMA_ALLOWED, POPULARITY_VERSION, POPULARITY_CERTIFIED,
} from './faserip-popularity.js';

let pass = 0, fail = 0;
function t(label, fn) { try { fn(); pass++; console.log(`  ok  ${label}`); } catch (e) { fail++; console.log(`FAIL  ${label}\n      ${e.message}`); } }
function eq(a, b) { const ja = JSON.stringify(a), jb = JSON.stringify(b); if (ja !== jb) throw new Error(`expected ${jb}, got ${ja}`); }

console.log(`faserip-popularity v${POPULARITY_VERSION}  (POPULARITY_CERTIFIED=${POPULARITY_CERTIFIED})\n`);

t('[CERT] dispositions: Friendly green, Neutral yellow, Unfriendly red, Hostile impossible', () => {
  eq(DISPOSITION_COLOR, { friendly: 'green', neutral: 'yellow', unfriendly: 'red', hostile: null });
  eq(popularityFeat({ popularity: 30, disposition: 'hostile' }).allowed, false);
});

t('[CERT] a Popularity of 45 rolls on the Incredible column', () => {
  eq(popularityRank(45), 'IN');
});

t('[CERT] request shifts: benefits +2, danger -3, Good value -1, Remarkable value -2, may not return -2, unique -3', () => {
  eq(REQUEST_MODIFIERS, { targetBenefits: 2, targetInDanger: -3, valueUpToGood: -1, valueUpToRemarkable: -2, mayNotBeReturned: -2, unique: -3 });
  eq(requestShift({ unique: true, mayNotBeReturned: true }), -5);
});

t('[CERT] Captain America, Unearthly (100), Neutral crowd that benefits: Shift Y column, yellow', () => {
  const f = popularityFeat({ popularity: 100, disposition: 'neutral', request: { targetBenefits: true } });
  eq([f.column, f.needed], ['SHY', 'yellow']);
});

t('[CERT] Iron Man (20) asking the DOD for a unique device they may not get back: Shift 0 column (see ERRATA NOTE on the colour)', () => {
  const f = popularityFeat({ popularity: 20, disposition: 'neutral', request: { unique: true, mayNotBeReturned: true } });
  eq([f.baseRank, f.shift, f.column, f.needed], ['EX', -5, 'SH0', 'yellow']);
});

t('[CERT] Spider-Man (40) vs Unfriendly Jameson needs red; his benefit argument is +2CS by the table', () => {
  eq(popularityFeat({ popularity: 40, disposition: 'unfriendly' }).needed, 'red');
  eq(popularityFeat({ popularity: 40, disposition: 'unfriendly', request: { targetBenefits: true } }).column, 'MN');
});

t('[CERT] failure consequences by disposition', () => {
  eq(Object.keys(FAILURE_CONSEQUENCE), ['friendly', 'neutral', 'unfriendly', 'hostile']);
  const r = resolvePopularityFeat({ popularity: 30, disposition: 'neutral', roll: 5 });
  eq([r.success, r.consequence], [false, FAILURE_CONSEQUENCE.neutral]);
});

t('[CERT] negative Popularity: everything yellow, only the benefit modifier, Contacts only', () => {
  eq(popularityFeat({ popularity: -5, disposition: 'friendly' }).allowed, false);
  const c = popularityFeat({ popularity: -5, disposition: 'unfriendly', isContact: true, request: { unique: true, targetBenefits: true } });
  eq([c.allowed, c.needed, c.baseRank, c.shift, c.column], [true, 'yellow', 'TY', 2, 'EX']);
});

t('[CERT] resolution uses the Universal Table on the shifted column; Karma may not manipulate a Popularity FEAT', () => {
  eq(POPULARITY_KARMA_ALLOWED, false);
  const r = resolvePopularityFeat({ popularity: 100, disposition: 'neutral', request: { targetBenefits: true }, roll: 60, karma: 50 });
  eq([r.total, r.karma, r.karmaAllowed, r.color, r.success], [60, 0, false, 'yellow', true]);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

// faserip-poisons test suite — run: node faserip-poisons.test.js
import {
  POISON_UNCONSCIOUS_ROUNDS, POISON_REFEAT_TURNS, MAX_ENDURANCE_RANKS_LOST_PER_ROUND, POISON_LOSS_PRIORITY,
  POISON_DEATH_AT, HALTING, helperCanHalt, POISON_IMPAIRED_SHIFT, DYING_IMPAIRED_SHIFT,
  poisonFeat, poisonFailure, rankLossAllowed, poisonedEnduranceNumber, POISONS_VERSION, POISONS_CERTIFIED,
} from './faserip-poisons.js';
import { INTENSITY_TABLES, findIntensity, INTENSITIES_VERSION } from './faserip-intensities.js';
import { RANKS } from './faserip-kernel.js';

let pass = 0, fail = 0;
function t(label, fn) { try { fn(); pass++; console.log(`  ok  ${label}`); } catch (e) { fail++; console.log(`FAIL  ${label}\n      ${e.message}`); } }
function eq(a, b) { const ja = JSON.stringify(a), jb = JSON.stringify(b); if (ja !== jb) throw new Error(`expected ${jb}, got ${ja}`); }

console.log(`faserip-poisons v${POISONS_VERSION}  (POISONS_CERTIFIED=${POISONS_CERTIFIED}); intensities v${INTENSITIES_VERSION}\n`);

t('[CERT] exposure is an Endurance FEAT against the toxin Intensity (Good End vs Good snake venom needs yellow)', () => {
  const f = poisonFeat({ featRank: 'GD', toxinIntensity: 'GD', roll: 50 });
  eq(f.needed, 'yellow');
  eq(poisonFeat({ featRank: 'RM', toxinIntensity: 'GD', roll: 50 }).needed, 'green');
  eq(poisonFeat({ featRank: 'UN', toxinIntensity: 'GD', roll: 1 }).success, true); // 3+ ranks above: automatic
});

t('[CERT] failure: unconscious 1-10 rounds, one Endurance rank lost (to the highest number of the new rank), re-FEAT in 1-10 turns', () => {
  const r = poisonFailure({ enduranceRank: 'EX' });
  eq([r.dead, r.rank, r.number], [false, 'GD', 15]);
  eq(r.unconscious, POISON_UNCONSCIOUS_ROUNDS);
  eq(r.refeatIn, POISON_REFEAT_TURNS);
  eq([POISON_UNCONSCIOUS_ROUNDS, POISON_REFEAT_TURNS], [{ min: 1, max: 10 }, { min: 1, max: 10 }]);
});

t('[CERT] reaching Shift 0 by poison is death (Feeble -> Shift 0 dies; the dying spiral would not yet)', () => {
  eq(poisonFailure({ enduranceRank: 'FE' }).dead, true);
  eq(POISON_DEATH_AT, 'SH0');
});

t('[CERT] at most one Endurance rank lost per round from any cause; poison losses take priority', () => {
  eq(MAX_ENDURANCE_RANKS_LOST_PER_ROUND, 1);
  eq(POISON_LOSS_PRIORITY, 'poison');
  eq(rankLossAllowed({ lostThisRound: 0 }).allowed, true);
  eq(rankLossAllowed({ lostThisRound: 1, cause: 'dying' }), { allowed: false, deferred: 'dying' });
});

t('[CERT] halting: the victim\'s own FEAT, or a helper with First Aid/Medicine AND antitoxin; untrained help cannot', () => {
  eq(HALTING.victimFeat, true);
  eq(HALTING.untrainedHelp, false);
  eq([helperCanHalt({ trained: true, antitoxin: true }), helperCanHalt({ trained: true }), helperCanHalt({ antitoxin: true })], [true, false, false]);
});

t('[CERT] PR2 (Judge): poison rank loss carries no -2CS of its own; dying does', () => {
  eq([POISON_IMPAIRED_SHIFT, DYING_IMPAIRED_SHIFT], [0, -2]);
});

t('[CERT] poisoned Endurance number follows the highest-of-rank rule (Ex -> Gd counts as 15)', () => {
  eq(poisonedEnduranceNumber('GD'), 15);
});

t('[CERT] Intensity Tables: tear gas Typical, snake venom Good, spider venom Excellent, vacuum Unearthly', () => {
  eq(findIntensity('endurance', 'tear gas').rank, 'TY');
  eq(findIntensity('endurance', 'snake').rank, 'GD');
  eq(findIntensity('endurance', 'spider').rank, 'EX');
  eq(findIntensity('endurance', 'vacuum').rank, 'UN');
});

t('[CERT] Intensity Tables spot checks: 1-10 tons Incredible, surface of a star Class 1000, house current Excellent, concentrated acid Incredible+', () => {
  eq(findIntensity('strength', '1-10 tons').rank, 'IN');
  eq(findIntensity('fire', 'star').rank, 'CL1000');
  eq(findIntensity('stunning', 'house current').rank, 'EX');
  eq([findIntensity('corrosive', 'concentrated').rank, findIntensity('corrosive', 'concentrated').plus], ['IN', true]);
});

t('[CERT] every Intensity Table rank is a kernel rank key (or null where the book prints none)', () => {
  const keys = new Set(RANKS.map(r => r.key));
  for (const [cat, list] of Object.entries(INTENSITY_TABLES)) for (const e of list) {
    if (e.rank !== null && !keys.has(e.rank)) throw new Error(`${cat}: ${e.item} -> ${e.rank}`);
  }
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

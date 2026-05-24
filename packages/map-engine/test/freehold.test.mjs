// Tests for @graycloak/map-engine freehold rules.
// Run after build: `node --test test/freehold.test.mjs`

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  qualifiesForFreehold, freeholdGate, FREEHOLD_GATE,
  monthlyRevenue, REVENUE_SP_PER_INHABITANT, SP_PER_GP,
  defaultAttractedRoster, rosterHeadcount, monthlyUpkeepGp, monthlyNetGp,
  DEFAULT_WAGES,
  clampFreeholdRadius, freeholdFootprintMiles, isBorderCell,
  FREEHOLD_RADIUS_MIN_MILES, FREEHOLD_RADIUS_MAX_MILES,
  rollConstructionIncursion, clearedCheckPlan, isSettledByRadius,
  nextTerritoryState, CONSTRUCTION_INCURSION_PER_DAY,
  alignmentDistance, settlerAlignmentMatches,
  axialDistance,
} from '../dist/index.js';

test('fighter reaches Lord at 9th and gets fighter-style revenue', () => {
  assert.equal(qualifiesForFreehold('fighter', 8), false);
  assert.equal(qualifiesForFreehold('fighter', 9), true);
  assert.equal(qualifiesForFreehold('fighter', 12), true);
  const g = freeholdGate('fighter');
  assert.equal(g.level, 9);
  assert.equal(g.title, 'Lord');
  assert.equal(g.fighterStyleRevenue, true);
});

test('non-fighter classes gate at their own levels, no fighter revenue', () => {
  assert.equal(qualifiesForFreehold('cleric', 8), true);
  assert.equal(qualifiesForFreehold('magic-user', 11), false);
  assert.equal(qualifiesForFreehold('magic-user', 12), true);
  for (const cls of Object.keys(FREEHOLD_GATE)) {
    if (cls === 'fighter') continue;
    assert.equal(FREEHOLD_GATE[cls].fighterStyleRevenue, false, `${cls} should not use fighter revenue`);
  }
});

test('revenue is 7 sp/inhabitant/month, gp = sp/10', () => {
  assert.equal(REVENUE_SP_PER_INHABITANT, 7);
  const r = monthlyRevenue(1000);
  assert.equal(r.population, 1000);
  assert.equal(r.silverPieces, 7000);
  assert.equal(r.goldPieces, 700);
  // Fractional/negative population is floored/clamped.
  assert.equal(monthlyRevenue(199.9).silverPieces, 199 * 7);
  assert.equal(monthlyRevenue(-5).silverPieces, 0);
});

test('attracted roster has a leader (above-average fighter) + rank-and-file', () => {
  const roster = defaultAttractedRoster();
  const leader = roster.find(t => t.type === 'leader');
  assert.ok(leader, 'must include a leader');
  assert.equal(leader.count, 1);
  assert.ok(leader.level >= 2, 'leader is above-average');
  assert.ok(rosterHeadcount(roster) > 1);
  // Scaling grows the rank-and-file.
  assert.ok(rosterHeadcount(defaultAttractedRoster(2)) > rosterHeadcount(roster));
});

test('upkeep sums wages; net = revenue - upkeep', () => {
  const roster = [
    { type: 'leader', count: 1, level: 3 },
    { type: 'heavy-foot', count: 20 },
    { type: 'archer', count: 10 },
  ];
  const expected =
    1 * DEFAULT_WAGES['leader'].gpPerMonth +
    20 * DEFAULT_WAGES['heavy-foot'].gpPerMonth +
    10 * DEFAULT_WAGES['archer'].gpPerMonth;
  assert.equal(monthlyUpkeepGp(roster), expected);
  // A 1000-soul hold (700 gp) easily covers this modest garrison.
  assert.equal(monthlyNetGp(1000, roster), 700 - expected);
  // Custom wage table is honoured.
  const cheap = { ...DEFAULT_WAGES, 'heavy-foot': { gpPerMonth: 1 } };
  assert.equal(monthlyUpkeepGp(roster, cheap),
    expected - 20 * DEFAULT_WAGES['heavy-foot'].gpPerMonth + 20);
});

test('freehold radius clamps to 20–50 miles', () => {
  assert.equal(clampFreeholdRadius(5), FREEHOLD_RADIUS_MIN_MILES);
  assert.equal(clampFreeholdRadius(35), 35);
  assert.equal(clampFreeholdRadius(999), FREEHOLD_RADIUS_MAX_MILES);
});

test('footprint is a mile-hex disk; border cells sit on the outer ring', () => {
  const ctr = { Q: 0, R: 0 };
  const radius = 20; // min legal
  const cells = freeholdFootprintMiles(ctr, radius);
  assert.equal(cells.length, 1 + 3 * radius * (radius + 1)); // 1261 cells
  // Centre is interior, a cell at exactly the radius is border.
  assert.equal(isBorderCell(ctr, { Q: 0, R: 0 }, radius), false);
  const onRing = cells.find(c => axialDistance(ctr, c) === radius);
  assert.equal(isBorderCell(ctr, onRing, radius), true);
});

test('construction incursion: suppressed by patrolling, else ~1-in-20', () => {
  // Patrolling beyond the area suppresses the check entirely.
  assert.equal(rollConstructionIncursion({ patrolling: true }, () => 0), false);
  // Deterministic rng below/above the threshold.
  assert.equal(rollConstructionIncursion({ patrolling: false }, () => 0.01), true);
  assert.equal(rollConstructionIncursion({ patrolling: false }, () => 0.99), false);
  assert.ok(Math.abs(CONSTRUCTION_INCURSION_PER_DAY - 0.05) < 1e-12);
});

test('cleared-hold check plan: road through triples the inhabited checks', () => {
  const noRoad = clearedCheckPlan({ roadThrough: false });
  const road = clearedCheckPlan({ roadThrough: true });
  assert.equal(noRoad.inhabitedChecksPerWeek, 1);
  assert.equal(road.inhabitedChecksPerWeek, 3);
  assert.equal(noRoad.borderChecksPerDay, 1);
  assert.equal(noRoad.centralChecksPerWeek, 1);
});

test('settled threshold is >30 miles to border', () => {
  assert.equal(isSettledByRadius(30), false);
  assert.equal(isSettledByRadius(31), true);
});

test('territory state machine: build -> clear -> settle, and reversion', () => {
  const base = { castleComplete: false, patrolsMaintained: true, patrolledRadiusMiles: 20, surroundedByCivilization: false };
  // wilderness always begins construction.
  assert.equal(nextTerritoryState('wilderness', base), 'constructing');
  // Still building until the castle is done.
  assert.equal(nextTerritoryState('constructing', base), 'constructing');
  // Done + patrols -> cleared.
  assert.equal(nextTerritoryState('constructing', { ...base, castleComplete: true }), 'cleared');
  // Done but patrols lapsed -> reverting.
  assert.equal(nextTerritoryState('constructing', { ...base, castleComplete: true, patrolsMaintained: false }), 'reverting');
  // Cleared and radius grows past 30 -> settled.
  assert.equal(nextTerritoryState('cleared', { ...base, patrolledRadiusMiles: 40 }), 'settled');
  // Cleared, patrols lapse -> reverting.
  assert.equal(nextTerritoryState('cleared', { ...base, patrolsMaintained: false }), 'reverting');
  // Reverting with patrols restored -> cleared.
  assert.equal(nextTerritoryState('reverting', base), 'cleared');
  // Reverting, no patrols, open frontier -> wilderness.
  assert.equal(nextTerritoryState('reverting', { ...base, patrolsMaintained: false }), 'wilderness');
  // Reverting, no patrols, but ringed by civilisation -> lingers (troubled enclave).
  assert.equal(nextTerritoryState('reverting', { ...base, patrolsMaintained: false, surroundedByCivilization: true }), 'reverting');
});

test('alignment adjacency for settler eligibility', () => {
  assert.equal(alignmentDistance('LG', 'LG'), 0);
  assert.equal(alignmentDistance('LG', 'LN'), 1);
  assert.equal(alignmentDistance('LG', 'CE'), 2);
  assert.equal(alignmentDistance('N', 'LG'), 1);
  // Default tolerance 1: a LG lord draws LG/NG/LN settlers, not CE.
  assert.equal(settlerAlignmentMatches('LG', 'NG'), true);
  assert.equal(settlerAlignmentMatches('LG', 'LN'), true);
  assert.equal(settlerAlignmentMatches('LG', 'CE'), false);
  // Wider tolerance opens it up.
  assert.equal(settlerAlignmentMatches('LG', 'CE', 2), true);
});

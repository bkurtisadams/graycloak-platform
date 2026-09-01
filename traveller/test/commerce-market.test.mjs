import test from 'node:test';
import assert from 'node:assert/strict';

import {
  seededDice,
  campaignDateKey,
  campaignWeekKey,
  routeMarketSeed,
  weeklyTradeSeed,
  saleQuoteSeed
} from '../client/commerce-market.js';

const campaign = {
  identity: { id: 'campaign-sea-of-suns' },
  time: { year: 4800, dayOfYear: 15, secondsOfDay: 0 }
};

test('commerce dice are deterministic for the same market seed', () => {
  const a = seededDice('same-seed');
  const b = seededDice('same-seed');
  const first = Array.from({ length: 12 }, () => a.rollD6());
  const second = Array.from({ length: 12 }, () => b.rollD6());
  assert.deepEqual(first, second);
});

test('route markets vary by date, route, and market kind', () => {
  const base = routeMarketSeed(campaign, 'calder', 'port-meridian', 'freight');
  assert.notEqual(base, routeMarketSeed(campaign, 'calder', 'port-meridian', 'passengers'));
  assert.notEqual(base, routeMarketSeed(campaign, 'calder', 'aster', 'freight'));
  assert.equal(campaignDateKey(campaign), '015-4800');
});

test('speculative trade seed stays stable throughout a campaign week', () => {
  const sameWeek = structuredClone(campaign);
  sameWeek.time.dayOfYear = 20;
  const nextWeek = structuredClone(campaign);
  nextWeek.time.dayOfYear = 22;
  assert.equal(campaignWeekKey(campaign), '4800-W03');
  assert.equal(weeklyTradeSeed(campaign, 'calder'), weeklyTradeSeed(sameWeek, 'calder'));
  assert.notEqual(weeklyTradeSeed(campaign, 'calder'), weeklyTradeSeed(nextWeek, 'calder'));
});

test('speculative resale quotes vary by date, world, and cargo lot', () => {
  const a = saleQuoteSeed(campaign, 'calder', 'cargo-1');
  assert.notEqual(a, saleQuoteSeed(campaign, 'aster', 'cargo-1'));
  assert.notEqual(a, saleQuoteSeed(campaign, 'calder', 'cargo-2'));
});

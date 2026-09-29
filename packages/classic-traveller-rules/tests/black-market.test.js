// 0.91.0 (Kurt, Sep 2026): the black market's terms.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOGUE, blackMarketTerms } from '../src/equipment/catalogue.js';
import { parseUniversalWorldProfile } from '../src/worlds/world-profile.js';

const at = (tl) => parseUniversalWorldProfile(`A867943-${tl.toString(16).toUpperCase()}`);

test('+50% one tech level short, double for two or three or military, none beyond', () => {
  const laser = CATALOGUE.find((entry) => !entry.military && Number(entry.techLevel) >= 9);
  assert.equal(blackMarketTerms(laser, at(laser.techLevel)), null, 'on sale openly: no black market');
  assert.deepEqual({ ...blackMarketTerms(laser, at(laser.techLevel - 1)) }, { available: true, factor: 1.5, priceCr: Math.round(laser.priceCr * 1.5), why: 'an import, 1 tech level short' });
  assert.equal(blackMarketTerms(laser, at(laser.techLevel - 3)).factor, 2);
  assert.equal(blackMarketTerms(laser, at(laser.techLevel - 4)).available, false);
  const dress = CATALOGUE.find((entry) => entry.military);
  assert.ok(dress, 'battle dress is marked military');
  assert.equal(blackMarketTerms(dress, at(15)).factor, 2);
  assert.equal(blackMarketTerms(laser, null), null);
});

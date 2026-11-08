// 0.95.0: Book 2 pp.38-39 (1977), the drugs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DRUGS, getDrug, drugForItemName, drugAvailabilityThrow, drugLegalityThrow, drugSynergy, combatDrugRounds,
  CATALOGUE_DRUGS, CATALOGUE_PACKS, catalogueAvailability, blackMarketTerms
} from '../index.js';

const fixed = (total, d6 = 1) => ({ rollD6: () => d6, roll2D6: () => ({ dice: [1, total - 1], total }) });

test('Book 2 p.39: the drug table, by the dose', () => {
  assert.deepEqual([DRUGS.slow.priceCr, DRUGS.slow.techLevel, DRUGS.slow.availability], [500, 8, 9]);
  assert.deepEqual([DRUGS['medical-slow'].priceCr, DRUGS['medical-slow'].techLevel, DRUGS['medical-slow'].availability], [100, 7, 7]);
  assert.deepEqual([DRUGS.anagathics.priceCr, DRUGS.anagathics.techLevel, DRUGS.anagathics.availability], [20000, 15, 10]);
  assert.deepEqual([DRUGS.combat.priceCr, DRUGS.combat.techLevel, DRUGS.combat.availability], [750, 9, 6]);
  assert.deepEqual([DRUGS.medical.priceCr, DRUGS.medical.techLevel, DRUGS.medical.availability], [100, 6, 9]);
  assert.equal(drugForItemName('slow drug').key, 'slow');
  assert.equal(drugForItemName('Respirator'), null);
  assert.throws(() => getDrug('psi-booster'));
});

test('Book 2 p.39: availability, +1 a tech level above the index; below it, not found', () => {
  // Slow drug (TL 8, 9+) on a TL 10 world: a 7 is 9 with the DM.
  const found = drugAvailabilityThrow(fixed(7), 'slow', { worldTechLevel: 10 });
  assert.equal(found.techDM, 2);
  assert.equal(found.found, true);
  assert.equal(drugAvailabilityThrow(fixed(6), 'slow', { worldTechLevel: 10 }).found, false);
  // The searcher's Medical, Admin or Bribery is a DM.
  assert.equal(drugAvailabilityThrow(fixed(6), 'slow', { worldTechLevel: 10, dm: 1 }).found, true);
  const below = drugAvailabilityThrow(fixed(12), 'slow', { worldTechLevel: 7 });
  assert.equal(below.belowTech, true);
  assert.equal(below.found, false);
});

test('Book 2 p.39: legal on 2D equal to or above the law level', () => {
  assert.equal(drugLegalityThrow(fixed(5), 5).legal, true);
  assert.equal(drugLegalityThrow(fixed(4), 5).legal, false);
});

test('Book 2 p.39: synergy is 1D a drug, multiplied; medical drug is left out', () => {
  assert.equal(drugSynergy(fixed(7, 3), ['slow']), null);
  assert.equal(drugSynergy(fixed(7, 3), ['slow', 'medical']), null);
  assert.equal(drugSynergy(fixed(7, 3), ['slow', 'combat']).wounds, 9);
});

test('Book 2 p.38: slow drug from 3 rounds on for 40; combat drug from 2 on for 30', () => {
  assert.deepEqual({ ...combatDrugRounds('slow', 1) }, { first: 4, last: 43 });
  assert.deepEqual({ ...combatDrugRounds('combat', 1) }, { first: 3, last: 32 });
});

test('0.95.0 drugs are in the Store, searched for rather than sold off the shelf', () => {
  assert.ok(CATALOGUE_PACKS.includes('Drugs'));
  const slow = CATALOGUE_DRUGS.find((entry) => entry.key === 'drug:slow');
  assert.equal(catalogueAvailability(slow, { techLevel: 7, lawLevel: 0 }).buy, false);
  assert.equal(catalogueAvailability(slow, { techLevel: 9, lawLevel: 0 }).buy, true);
  assert.equal(blackMarketTerms(slow, { techLevel: 7, lawLevel: 0 }), null);
});

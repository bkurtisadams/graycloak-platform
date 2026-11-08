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

test('The Traveller Book p.106: availability, DM world tech level less the drug\u2019s index, negative below it', () => {
  const found = drugAvailabilityThrow(fixed(7), 'slow', { worldTechLevel: 10 });
  assert.equal(found.techDM, 2);
  assert.equal(found.found, true);
  assert.equal(drugAvailabilityThrow(fixed(6), 'slow', { worldTechLevel: 10 }).found, false);
  assert.equal(drugAvailabilityThrow(fixed(6), 'slow', { worldTechLevel: 10, dm: 1 }).found, true);
  const below = drugAvailabilityThrow(fixed(12), 'slow', { worldTechLevel: 4 });
  assert.equal(below.techDM, -4);
  assert.equal(below.found, false);
  assert.equal(drugAvailabilityThrow(fixed(12), 'slow', { worldTechLevel: 7 }).found, true, 'one short is still to be had');
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
  assert.equal(catalogueAvailability(slow, { techLevel: 7, lawLevel: 0 }).buy, true);
  assert.match(catalogueAvailability(slow, { techLevel: 7, lawLevel: 0 }).warning, /DM \u22121/);
  assert.equal(catalogueAvailability(slow, { techLevel: 9, lawLevel: 0 }).buy, true);
  assert.equal(blackMarketTerms(slow, { techLevel: 7, lawLevel: 0 }), null);
});

// 0.96.0 ----------------------------------------------------------------
import { fastDrugAgingSavedMonths, truthDrugWounds, resolveCharacterAging, resolvePlayAgingCrisis, importCharacterDocument, createSequenceDice } from '../index.js';
import { readFileSync } from 'node:fs';

test('Book 2 p.38: fast drug saves 59 of 60 days\u2019 aging, in whole months', () => {
  assert.equal(fastDrugAgingSavedMonths(60), 2);
  assert.equal(fastDrugAgingSavedMonths(10), 0);
  assert.equal(fastDrugAgingSavedMonths(90), 2, 'one dose lasts 60 days');
  assert.equal(truthDrugWounds(fixed(9)).wounds, 9);
});

function agedCharacter() {
  const bundle = JSON.parse(readFileSync(new URL('../../../traveller/test/fixtures/Sea-of-Suns-v0.11.2-buggy.campaign.json', import.meta.url), 'utf8'));
  const character = importCharacterDocument(bundle.documents.characters[0]);
  return { ...character, chronology: { ...character.chronology, physicalAgeMonths: character.chronology.nextAgingCheckAgeMonths } };
}

test('Book 2 p.38: on anagathics the aging checkpoint passes without throws', () => {
  const character = agedCharacter();
  const result = resolveCharacterAging(character, { dice: fixed(2), anagathics: true });
  assert.equal(result.checks.length, 0);
  assert.equal(result.document.chronology.nextAgingCheckAgeMonths, character.chronology.nextAgingCheckAgeMonths + 48);
  assert.deepEqual(result.document.characteristics, character.characteristics);
});

test('Book 1 p.7: an aging crisis in play — 8+ with Medical, 1D months; failed, death', () => {
  const character = agedCharacter();
  const zeroed = { ...character, upp: `${character.upp.slice(0, 2)}0${character.upp.slice(3)}`, characteristics: { ...character.characteristics, END: 0 }, current: { ...character.current, END: 0 } };
  const lived = resolvePlayAgingCrisis(zeroed, { characteristic: 'END', dice: createSequenceDice([3, 3, 4]), medicalSkill: 2 });
  assert.equal(lived.success, true);
  assert.equal(lived.document.characteristics.END, 1);
  assert.equal(lived.document.chronology.physicalAgeMonths, zeroed.chronology.physicalAgeMonths + 4);
  assert.equal(lived.document.chronology.chronologicalAgeMonths, zeroed.chronology.chronologicalAgeMonths, 'under slow drug: at once');
  const noDrug = resolvePlayAgingCrisis(zeroed, { characteristic: 'END', dice: createSequenceDice([3, 3, 4]), medicalSkill: 2, slowDrug: false });
  assert.equal(noDrug.document.chronology.chronologicalAgeMonths, zeroed.chronology.chronologicalAgeMonths + 4);
  const died = resolvePlayAgingCrisis(zeroed, { characteristic: 'END', dice: createSequenceDice([3, 3]), medicalSkill: 1 });
  assert.equal(died.success, false);
  assert.equal(died.document.status.alive, false);
});

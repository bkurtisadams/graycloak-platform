// drugs.js — 0.95.0. Classic Traveller Book 2 (1977) pp.38-39, the drugs
// (Kurt, Nov 2026: the 1977 rules). Prices, tech indexes and availability
// throws are the book's table; the effects are paraphrased. Psi-drugs wait
// for psionics, and fast drug, anagathics and truth drug for a later slice.
//
// Rulings (Graycloak), where the book leaves the referee to say:
//  - Availability: a "determined search" is one day. The throw is 2D, +1 for
//    each tech level the world has above the drug's index, + the searcher's
//    best of Medical, Admin and Bribery ("DMs might be allowed for trained
//    medical personnel, or admin or bribery expertise"). Below the drug's
//    index it is not generally available in pill form: not found.
//  - Legality: thrown once per drug per world (seeded, so the answer stays).
//  - Medical drug (Kurt, Nov 2026): one dose, given by an attendant with
//    Medical-1 or better, is medical attention for ordinary wounds in place
//    of a medical kit. The seriously wounded still need a facility.
//  - Medical slow drug: thirty days' ordinary healing in one day, so a
//    wounded (not seriously wounded) patient recovers by the end of the day,
//    unconscious meanwhile, and ages a month.

import { requireDice } from '../dice.js';

export const DRUG_SOURCE = 'Book 2 pp.38-39 (1977)';

const drug = (entry) => Object.freeze(entry);

export const DRUGS = Object.freeze({
  slow: drug({ key: 'slow', name: 'Slow drug', effect: '2:1 slower', priceCr: 500, techLevel: 8, availability: 9,
    note: 'Lives at twice the normal rate: two combat rounds for each one. Takes effect after 3 rounds, lasts 40, then 1D wounds.' }),
  'medical-slow': drug({ key: 'medical-slow', name: 'Medical slow drug', effect: '30:1 slower', priceCr: 100, techLevel: 7, availability: 7,
    note: 'Unconscious; thirty days of ordinary healing pass in one day. No wounds from it.' }),
  'slow-antidote': drug({ key: 'slow-antidote', name: 'Slow drug antidote', effect: 'counteracts slow drug', priceCr: 600, techLevel: 10, availability: 10,
    note: 'Cancels slow drug.' }),
  fast: drug({ key: 'fast', name: 'Fast drug', effect: '60:1 faster', priceCr: 200, techLevel: 9, availability: 8,
    note: 'Metabolism slowed 60:1: one dose makes 60 days pass as one, slowing aging and saving air and food.' }),
  'fast-antidote': drug({ key: 'fast-antidote', name: 'Fast drug antidote', effect: 'counteracts fast drug', priceCr: 900, techLevel: 12, availability: 9,
    note: 'Cancels fast drug.' }),
  anagathics: drug({ key: 'anagathics', name: 'Anagathics', effect: 'voids aging throws', priceCr: 20000, techLevel: 15, availability: 10,
    note: 'A regular monthly dose and aging throws are ignored. Often unavailable at any price.' }),
  truth: drug({ key: 'truth', name: 'Truth drug', effect: 'two minutes of truth', priceCr: 5000, techLevel: 8, availability: 7,
    note: 'About two minutes of truthful answers, then an hour unconscious and 2D wounds.' }),
  combat: drug({ key: 'combat', name: 'Combat drug', effect: '+2 strength, endurance', priceCr: 750, techLevel: 9, availability: 6,
    note: 'Strength and endurance +2 each, from 2 rounds after taking, for 30 rounds; then 1D wounds.' }),
  medical: drug({ key: 'medical', name: 'Medical drug', effect: 'aids recovery', priceCr: 100, techLevel: 6, availability: 9,
    note: 'Given by someone with Medical skill, it serves as medical treatment.' })
});

export function getDrug(key) {
  const entry = DRUGS[key];
  if (!entry) throw new RangeError(`unknown drug: ${key}`);
  return entry;
}

/** The drug an inventory item is a dose of, by its name, or null. */
export function drugForItemName(name) {
  const wanted = String(name ?? '').trim().toLowerCase();
  return Object.values(DRUGS).find((entry) => entry.name.toLowerCase() === wanted) ?? null;
}

/**
 * Book 2 p.39: after a determined search, 2D for the table's throw, +1 for
 * each tech level the world has above the drug's index. Below the index:
 * not generally available (ruling). dm is the searcher's skill DM.
 */
export function drugAvailabilityThrow(dice, key, { worldTechLevel, dm = 0 } = {}) {
  requireDice(dice);
  const entry = getDrug(key);
  const tech = Number(worldTechLevel);
  if (!Number.isFinite(tech) || tech < entry.techLevel) {
    return Object.freeze({ drug: entry.key, belowTech: true, found: false, target: entry.availability, techDM: 0, dm: 0, roll: null, total: null });
  }
  const throwResult = dice.roll2D6();
  const techDM = tech - entry.techLevel;
  const total = throwResult.total + techDM + Number(dm || 0);
  return Object.freeze({ drug: entry.key, belowTech: false, found: total >= entry.availability, target: entry.availability, techDM, dm: Number(dm || 0), dice: throwResult.dice, roll: throwResult.total, total });
}

/** Book 2 p.39: 2D equal to or above the law level, no problem; below, illegal. */
export function drugLegalityThrow(dice, lawLevel) {
  requireDice(dice);
  const throwResult = dice.roll2D6();
  const law = Number(lawLevel ?? 0);
  return Object.freeze({ dice: throwResult.dice, roll: throwResult.total, lawLevel: law, legal: throwResult.total >= law });
}

/**
 * Book 2 p.39: more than one drug taken (medical drug aside), 1D for each,
 * multiplied together, in wounds at the end of the period of use. Returns
 * null when there is no synergy.
 */
export function drugSynergy(dice, drugKeys = []) {
  requireDice(dice);
  const counted = drugKeys.filter((key) => key !== 'medical');
  if (counted.length < 2) return null;
  const dice1 = counted.map(() => dice.rollD6());
  return Object.freeze({ drugs: [...counted], dice: dice1, wounds: dice1.reduce((product, die) => product * die, 1) });
}

// Book 2 p.38, in combat rounds from the round the drug is taken.
export const COMBAT_DRUG_TIMING = Object.freeze({
  slow: Object.freeze({ onsetRounds: 3, durationRounds: 40, endWoundDice: 1, actionsPerRound: 2, boost: null }),
  combat: Object.freeze({ onsetRounds: 2, durationRounds: 30, endWoundDice: 1, actionsPerRound: 1, boost: Object.freeze({ STR: 2, END: 2 }) })
});

/** The rounds a combat drug taken in `takenRound` is in effect: [first, last]. */
export function combatDrugRounds(key, takenRound) {
  const timing = COMBAT_DRUG_TIMING[key];
  if (!timing) throw new RangeError(`${key} is not a combat drug`);
  const first = Number(takenRound) + timing.onsetRounds;
  return Object.freeze({ first, last: first + timing.durationRounds - 1 });
}

export const MEDICAL_SLOW_AGING_MONTHS = 1;

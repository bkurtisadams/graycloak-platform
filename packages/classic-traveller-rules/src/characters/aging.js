export const AGING_START_AGE = 34;
export const AGING_INTERVAL_YEARS = 4;
export const AGING_START_MONTHS = AGING_START_AGE * 12;
export const AGING_INTERVAL_MONTHS = AGING_INTERVAL_YEARS * 12;

function rule(characteristic, loss, target) {
  return Object.freeze({ characteristic, loss, target });
}

// Classic Traveller Book 1 aging table, grouped by the age bands that share
// the same saving throws and characteristic losses.
export const AGING_BANDS = Object.freeze([
  Object.freeze({
    minimumAge: 34,
    maximumAge: 49,
    rules: Object.freeze([
      rule('STR', 1, 8),
      rule('DEX', 1, 7),
      rule('END', 1, 8)
    ])
  }),
  Object.freeze({
    minimumAge: 50,
    maximumAge: 65,
    rules: Object.freeze([
      rule('STR', 1, 9),
      rule('DEX', 1, 8),
      rule('END', 1, 9)
    ])
  }),
  Object.freeze({
    minimumAge: 66,
    maximumAge: Infinity,
    rules: Object.freeze([
      rule('STR', 2, 9),
      rule('DEX', 2, 9),
      rule('END', 2, 9),
      rule('INT', 1, 9)
    ])
  })
]);

export function agingRulesForAge(ageYears) {
  if (!Number.isFinite(ageYears) || ageYears < 0) {
    throw new RangeError(`age must be a non-negative number; received ${ageYears}`);
  }
  if (ageYears < AGING_START_AGE) return Object.freeze([]);
  return AGING_BANDS.find((band) => ageYears >= band.minimumAge && ageYears <= band.maximumAge).rules;
}

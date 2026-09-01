function normalizeProfile(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('world profile must be an object');
  }
  const keys = ['atmosphere', 'hydrographics', 'population', 'government'];
  for (const key of keys) {
    if (!Number.isInteger(input[key]) || input[key] < 0) {
      throw new TypeError(`world profile ${key} must be a non-negative integer`);
    }
  }
  return input;
}

export const TRADE_CLASSIFICATIONS = Object.freeze({
  agricultural: Object.freeze({ label: 'Agricultural' }),
  nonAgricultural: Object.freeze({ label: 'Non-Agricultural' }),
  industrial: Object.freeze({ label: 'Industrial' }),
  nonIndustrial: Object.freeze({ label: 'Non-Industrial' }),
  rich: Object.freeze({ label: 'Rich' }),
  poor: Object.freeze({ label: 'Poor' })
});

export function deriveTradeClassifications(input) {
  const profile = normalizeProfile(input);
  const a = profile.atmosphere;
  const h = profile.hydrographics;
  const p = profile.population;
  const g = profile.government;
  const result = [];

  if (a >= 4 && a <= 9 && h >= 4 && h <= 8 && p >= 5 && p <= 7) result.push('agricultural');
  // Classic Traveller Facsimile errata corrects Book 3 p.16 to:
  // atmosphere 3-, hydrographics 3-, population 6+.
  if (a <= 3 && h <= 3 && p >= 6) result.push('nonAgricultural');
  if ([0, 1, 2, 4, 7, 9].includes(a) && p >= 9) result.push('industrial');
  if (p <= 6) result.push('nonIndustrial');
  if ([6, 8].includes(a) && p >= 6 && p <= 8 && g >= 4 && g <= 9) result.push('rich');
  if (a >= 2 && a <= 5 && h <= 3) result.push('poor');

  return Object.freeze(result);
}

export function describeTradeClassifications(input) {
  return deriveTradeClassifications(input).map((key) => TRADE_CLASSIFICATIONS[key]);
}

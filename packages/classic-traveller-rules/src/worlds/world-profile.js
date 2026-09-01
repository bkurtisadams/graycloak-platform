const TRAVELLER_DIGITS = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const STARPORTS = Object.freeze({
  A: 'Excellent quality installation',
  B: 'Good quality installation',
  C: 'Routine quality installation',
  D: 'Poor quality installation',
  E: 'Frontier installation',
  X: 'No starport'
});
const ATMOSPHERES = Object.freeze({
  0: 'No atmosphere',
  1: 'Trace atmosphere',
  2: 'Very thin, tainted',
  3: 'Very thin',
  4: 'Thin, tainted',
  5: 'Thin',
  6: 'Standard',
  7: 'Standard, tainted',
  8: 'Dense',
  9: 'Dense, tainted',
  10: 'Exotic',
  11: 'Corrosive',
  12: 'Insidious'
});
const POPULATIONS = Object.freeze({
  0: 'No inhabitants',
  1: 'Tens of inhabitants',
  2: 'Hundreds of inhabitants',
  3: 'Thousands of inhabitants',
  4: 'Tens of thousands',
  5: 'Hundreds of thousands',
  6: 'Millions of inhabitants',
  7: 'Tens of millions',
  8: 'Hundreds of millions',
  9: 'Billions of inhabitants',
  10: 'Tens of billions'
});
const GOVERNMENTS = Object.freeze({
  0: 'No government structure',
  1: 'Company / corporation',
  2: 'Participating democracy',
  3: 'Self-perpetuating oligarchy',
  4: 'Representative democracy',
  5: 'Feudal technocracy',
  6: 'Captive government',
  7: 'Balkanization',
  8: 'Civil service bureaucracy',
  9: 'Impersonal bureaucracy',
  10: 'Charismatic dictator',
  11: 'Non-charismatic leader',
  12: 'Charismatic oligarchy',
  13: 'Religious dictatorship'
});
const LAW_LEVELS = Object.freeze({
  0: 'No prohibitions',
  1: 'Body pistols, explosives, and poison gas prohibited',
  2: 'Portable energy weapons prohibited',
  3: 'Military weapons prohibited',
  4: 'Light assault weapons prohibited',
  5: 'Personal concealable firearms prohibited',
  6: 'Most firearms prohibited',
  7: 'Shotguns controlled; carrying restricted',
  8: 'Long bladed weapons controlled; open possession prohibited',
  9: 'Possession of weapons outside the residence prohibited'
});

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function encodeTravellerDigit(value) {
  if (!Number.isInteger(value) || value < 0 || value >= TRAVELLER_DIGITS.length) {
    throw new RangeError(`Traveller digit value must be an integer from 0 to ${TRAVELLER_DIGITS.length - 1}`);
  }
  return TRAVELLER_DIGITS[value];
}

export function decodeTravellerDigit(value) {
  const token = String(value ?? '').trim().toUpperCase();
  if (token.length !== 1) throw new TypeError('Traveller digit must be one character');
  const index = TRAVELLER_DIGITS.indexOf(token);
  if (index < 0) throw new RangeError(`invalid Traveller digit: ${token}`);
  return index;
}

export function formatUniversalWorldProfile(profile) {
  if (!isPlainObject(profile)) throw new TypeError('world profile must be an object');
  const starport = String(profile.starport ?? '').trim().toUpperCase();
  if (!Object.hasOwn(STARPORTS, starport)) throw new RangeError(`invalid starport code: ${starport || '(blank)'}`);
  const values = [
    profile.size,
    profile.atmosphere,
    profile.hydrographics,
    profile.population,
    profile.government,
    profile.lawLevel
  ].map(encodeTravellerDigit);
  const tech = encodeTravellerDigit(profile.techLevel);
  return `${starport}${values.join('')}-${tech}`;
}

export function parseUniversalWorldProfile(uwp) {
  const text = String(uwp ?? '').trim().toUpperCase();
  const match = /^([ABCDEX])([0-9A-HJ-NP-Z]{6})-([0-9A-HJ-NP-Z])$/.exec(text);
  if (!match) throw new TypeError('UWP must use the form C432430-8');
  const [size, atmosphere, hydrographics, population, government, lawLevel] = [...match[2]].map(decodeTravellerDigit);
  return {
    starport: match[1],
    size,
    atmosphere,
    hydrographics,
    population,
    government,
    lawLevel,
    techLevel: decodeTravellerDigit(match[3])
  };
}

export function validateUniversalWorldProfile(input) {
  try {
    const profile = typeof input === 'string' ? parseUniversalWorldProfile(input) : input;
    const formatted = formatUniversalWorldProfile(profile);
    return { valid: true, errors: [], profile: parseUniversalWorldProfile(formatted), uwp: formatted };
  } catch (error) {
    return { valid: false, errors: [error.message] };
  }
}

export function assertValidUniversalWorldProfile(input) {
  const result = validateUniversalWorldProfile(input);
  if (!result.valid) throw new Error(`invalid universal world profile: ${result.errors.join('; ')}`);
  return result.profile;
}

export function describeStarport(code) {
  const key = String(code ?? '').trim().toUpperCase();
  return STARPORTS[key] ?? 'Unknown starport classification';
}

export function describeWorldSize(value) {
  const size = Number(value);
  if (!Number.isInteger(size) || size < 0) return 'Unknown size';
  if (size === 0) return 'Asteroid / planetoid belt';
  return `${size * 1000} miles diameter (approx.)`;
}

export function describeAtmosphere(value) {
  return ATMOSPHERES[Number(value)] ?? `Atmosphere code ${encodeTravellerDigit(Number(value))}`;
}

export function describeHydrographics(value) {
  const hydro = Number(value);
  if (!Number.isInteger(hydro) || hydro < 0) return 'Unknown hydrographics';
  if (hydro === 0) return 'No free-standing water / desert';
  if (hydro === 10) return 'No land masses / water world';
  if (hydro >= 1 && hydro <= 9) return `${hydro * 10}% water`;
  return `Hydrographics code ${encodeTravellerDigit(hydro)}`;
}

export function describePopulation(value) {
  const population = Number(value);
  return POPULATIONS[population] ?? `Population code ${encodeTravellerDigit(population)}`;
}

export function describeGovernment(value) {
  const government = Number(value);
  return GOVERNMENTS[government] ?? `Government code ${encodeTravellerDigit(government)}`;
}

export function describeLawLevel(value) {
  const law = Number(value);
  return LAW_LEVELS[law] ?? `Law level ${encodeTravellerDigit(law)}`;
}

export const TRAVEL_ZONE_CODES = Object.freeze(['none', 'amber', 'red']);

export function validateAuthoredSystemRecord(system) {
  const errors = [];
  if (!isPlainObject(system)) return { valid: false, errors: ['system must be an object'] };
  if (typeof system.id !== 'string' || !system.id.trim()) errors.push('system.id must be a nonblank string');
  if (typeof system.hex !== 'string' || !/^\d{4}$/.test(system.hex)) errors.push('system.hex must be a four-digit subsector coordinate');
  if (typeof system.name !== 'string' || !system.name.trim()) errors.push('system.name must be a nonblank string');
  if (!isPlainObject(system.mainWorld)) {
    errors.push('system.mainWorld must be an object');
  } else {
    if (typeof system.mainWorld.id !== 'string' || !system.mainWorld.id.trim()) errors.push('mainWorld.id must be a nonblank string');
    if (typeof system.mainWorld.name !== 'string' || !system.mainWorld.name.trim()) errors.push('mainWorld.name must be a nonblank string');
    const uwp = validateUniversalWorldProfile(system.mainWorld.uwp);
    if (!uwp.valid) errors.push(`mainWorld.uwp invalid: ${uwp.errors.join('; ')}`);
  }
  if (!isPlainObject(system.bases)) {
    errors.push('system.bases must be an object');
  } else {
    if (typeof system.bases.scout !== 'boolean') errors.push('system.bases.scout must be boolean');
    if (typeof system.bases.naval !== 'boolean') errors.push('system.bases.naval must be boolean');
  }
  if (typeof system.gasGiant !== 'boolean') errors.push('system.gasGiant must be boolean');
  if (!TRAVEL_ZONE_CODES.includes(system.travelZone)) errors.push('system.travelZone must be none, amber, or red');
  if (typeof system.notes !== 'string') errors.push('system.notes must be a string');
  return { valid: errors.length === 0, errors };
}

export function assertValidAuthoredSystemRecord(system) {
  const result = validateAuthoredSystemRecord(system);
  if (!result.valid) throw new Error(`invalid authored system record: ${result.errors.join('; ')}`);
  return system;
}

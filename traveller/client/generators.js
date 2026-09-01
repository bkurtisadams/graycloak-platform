// Client-side setting utilities for Traveller v0.7.2.
// These are intentionally not Classic Traveller RAW. They provide optional
// suggestions only; the player can always type a different value.

const CHARACTER_GIVEN_NAMES = Object.freeze([
  'Adrian', 'Alina', 'Amara', 'Anton', 'Beatriz', 'Celia', 'Darius', 'Elena',
  'Elias', 'Farah', 'Gabriel', 'Helena', 'Ilya', 'Isabel', 'Jonas', 'Leona',
  'Lucia', 'Marisol', 'Mara', 'Nadia', 'Nico', 'Rafael', 'Rina', 'Tomas'
]);

const CHARACTER_SURNAMES = Object.freeze([
  'Ames', 'Arden', 'Bennett', 'Calder', 'Corvin', 'Dane', 'Esteban', 'Farrow',
  'Galen', 'Hale', 'Ibarra', 'Kade', 'Lascari', 'Mercer', 'Navarro', 'Ortega',
  'Quill', 'Renn', 'Serrano', 'Tallis', 'Vale', 'Vega', 'Voss', 'Ward'
]);

const SHIP_NAMES = Object.freeze([
  'Marisol', 'Isabel', 'Lucia', 'Rosalind', 'Celia', 'Evelina', 'Anna Bell',
  'Resolution', 'Providence', 'Vigilant', 'Resolute', 'Endeavour', 'Wayfinder',
  'Far Horizon', 'Northstar', 'Second Dawn', 'Last Light', 'Quiet Sea',
  'Long Memory', 'Bright Meridian', 'Peregrine', 'Argosy', 'Free Wind',
  'Distant Harbor', 'Morning Tide', 'Constancy', 'Fortune', 'Venture'
]);

function randomIndex(length, random) {
  if (!Number.isInteger(length) || length <= 0) throw new RangeError('length must be a positive integer');
  if (typeof random !== 'function') throw new TypeError('random must be a function');
  const value = Number(random());
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError('random must return a number from 0 inclusive to 1 exclusive');
  }
  return Math.floor(value * length);
}

function choose(values, random) {
  return values[randomIndex(values.length, random)];
}

export function generateCharacterName({ random = Math.random } = {}) {
  return `${choose(CHARACTER_GIVEN_NAMES, random)} ${choose(CHARACTER_SURNAMES, random)}`;
}

export function generateShipName({ random = Math.random } = {}) {
  return choose(SHIP_NAMES, random);
}

export function generateShipRegistry(typeCode = 'S', { random = Math.random } = {}) {
  const prefix = String(typeCode ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 3) || 'X';
  const serial = 10000 + randomIndex(90000, random);
  return `${prefix}-${serial}`;
}

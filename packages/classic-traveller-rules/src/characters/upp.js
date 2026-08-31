import { createDice, requireDice } from '../dice.js';

export const CHARACTERISTIC_KEYS = Object.freeze([
  'STR',
  'DEX',
  'END',
  'INT',
  'EDU',
  'SOC'
]);

const UPP_DIGITS = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function encodeCharacteristic(value) {
  if (!Number.isInteger(value) || value < 0 || value >= UPP_DIGITS.length) {
    throw new RangeError(`characteristic cannot be encoded in UPP: ${value}`);
  }
  return UPP_DIGITS[value];
}

export function formatUPP(characteristics) {
  return CHARACTERISTIC_KEYS.map((key) => encodeCharacteristic(characteristics[key])).join('');
}

export function generateCharacteristics({ dice = createDice() } = {}) {
  requireDice(dice);

  const characteristics = {};
  for (const key of CHARACTERISTIC_KEYS) {
    characteristics[key] = dice.roll2D6().total;
  }
  return characteristics;
}

export function generateUPP({ dice = createDice() } = {}) {
  const characteristics = generateCharacteristics({ dice });
  return {
    characteristics,
    upp: formatUPP(characteristics)
  };
}

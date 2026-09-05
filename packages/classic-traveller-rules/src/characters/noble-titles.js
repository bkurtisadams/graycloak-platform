import { encodeCharacteristic } from './upp.js';

function titleEntry(socialStanding, titles, alternatePrefixes = []) {
  return Object.freeze({
    socialStanding,
    code: encodeCharacteristic(socialStanding),
    titles: Object.freeze([...titles]),
    alternatePrefixes: Object.freeze([...alternatePrefixes])
  });
}

// Classic Traveller Book 1, p.6. The printed table defines specific titles
// only for Social Standing B (11) through F (15).
export const NOBLE_TITLE_TABLE = Object.freeze([
  titleEntry(11, ['Knight', 'Knightess', 'Dame']),
  titleEntry(12, ['Baron', 'Baronet', 'Baroness'], ['von', 'haut', 'hault']),
  titleEntry(13, ['Marquis', 'Marquesa', 'Marchioness']),
  titleEntry(14, ['Count', 'Countess']),
  titleEntry(15, ['Duke', 'Duchess'])
]);

export function nobleTitleEntitlement(socialStanding) {
  if (!Number.isInteger(socialStanding) || socialStanding < 0) {
    throw new RangeError(`social standing must be a non-negative integer; received ${socialStanding}`);
  }

  if (socialStanding < 11) {
    return Object.freeze({ eligible: false, listed: false, hereditary: false, landsAndAuthority: 'none', socialStanding, code: encodeCharacteristic(socialStanding), titles: Object.freeze([]), alternatePrefixes: Object.freeze([]) });
  }

  const listed = NOBLE_TITLE_TABLE.find((entry) => entry.socialStanding === socialStanding);
  if (listed) return Object.freeze({ eligible: true, listed: true, hereditary: true, landsAndAuthority: 'referee-discretion', ...listed });

  // A character of SOC 16+ is still a noble under the general 11+ rule, but
  // Book 1 does not name a title above Duke. Leave that choice to the referee.
  return Object.freeze({ eligible: true, listed: false, hereditary: true, landsAndAuthority: 'referee-discretion', socialStanding, code: encodeCharacteristic(socialStanding), titles: Object.freeze([]), alternatePrefixes: Object.freeze([]) });
}

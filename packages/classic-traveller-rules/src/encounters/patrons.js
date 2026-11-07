import { requireDice } from '../dice.js';

// Book 3 p.20: one throw per week for the whole band; a 5 or 6 on one die
// indicates a likely patron has been found.
export const PATRON_AVAILABILITY_FOUND_ROLLS = Object.freeze([5, 6]);
// Reaction DMs: +1 for five or more terms in the army, navy, marines or
// scouts; -1 if the planetary population is 9 or greater. The Traveller Book
// (1982) p.101. Book 3 (1977) p.23 printed 11 or greater, which no 1977 world
// can reach (population runs 0-10), so Graycloak takes the 1982 figure
// (Kurt, Sep 2026).
export const REACTION_DMS = Object.freeze({
  fiveOrMoreMilitaryTerms: 1,
  planetaryPopulation9Plus: -1
});
export const PATRON_SUITABILITY_TARGET = 7;

export const PATRON_ENCOUNTER_TABLE = Object.freeze([
  Object.freeze(['Arsonist', 'Cutthroat', 'Assassin', 'Hijacker', 'Smuggler', 'Terrorist']),
  Object.freeze(['Crewperson', 'Peasant', 'Rumor', 'Clerk', 'Soldier', 'Shopkeeper']),
  Object.freeze(['Shipowner', 'Tourist', 'Merchant', 'Police', 'Scout', 'Rumor']),
  Object.freeze(['Diplomat', 'Courier', 'Spy', 'Scholar', 'Governor', 'Administrator']),
  Object.freeze(['Mercenary', 'Naval', 'Marine', 'Scout', 'Army', 'Mercenary']),
  Object.freeze(['Noble', 'Playboy', 'Avenger', 'Emigre', 'Speculator', 'Rumor'])
]);

export const REACTION_TABLE = Object.freeze({
  2: 'Violent. Immediate attack.',
  3: 'Hostile. Attacks on 5+.',
  4: 'Hostile. Attacks on 8+.',
  5: 'Hostile. May attack.',
  6: 'Unreceptive.',
  7: 'Non-committal.',
  8: 'Interested.',
  9: 'Intrigued.',
  10: 'Responsive.',
  11: 'Enthusiastic.',
  12: 'Genuinely friendly.'
});

// Book 3 p.22: natural 2 and 12 are not subject to DMs; any other result is
// modified, with results below 3 becoming 3 and above 12 becoming 12.
export function modifiedReactionTotal(naturalRoll, dm = 0) {
  if (!Number.isInteger(naturalRoll) || naturalRoll < 2 || naturalRoll > 12) throw new TypeError('reaction roll must be a 2D total');
  if (!Number.isInteger(dm)) throw new TypeError('reaction dm must be an integer');
  if (naturalRoll === 2 || naturalRoll === 12) return naturalRoll;
  return Math.max(3, Math.min(12, naturalRoll + dm));
}

function clampReactionTotal(total) {
  return Math.max(2, Math.min(12, total));
}

export function reactionForTotal(total) {
  if (!Number.isInteger(total)) throw new TypeError('reaction total must be an integer');
  const clamped = clampReactionTotal(total);
  return Object.freeze({ total, tableTotal: clamped, description: REACTION_TABLE[clamped] });
}

export function rollReaction(dice, { dm = 0 } = {}) {
  requireDice(dice);
  if (!Number.isInteger(dm)) throw new TypeError('reaction dm must be an integer');
  const roll = dice.roll2D6();
  const modifiedTotal = modifiedReactionTotal(roll.total, dm);
  const reaction = reactionForTotal(modifiedTotal);
  return Object.freeze({
    dice: Object.freeze([...roll.dice]),
    roll: roll.total,
    dm,
    total: modifiedTotal,
    tableTotal: reaction.tableTotal,
    description: reaction.description
  });
}

export function rollPatronType(dice) {
  requireDice(dice);
  const row = dice.rollD6();
  const column = dice.rollD6();
  return Object.freeze({ row, column, type: PATRON_ENCOUNTER_TABLE[row - 1][column - 1] });
}

export function generatePatronContact(dice, { reactionDM = 0 } = {}) {
  requireDice(dice);
  if (!Number.isInteger(reactionDM)) throw new TypeError('reactionDM must be an integer');

  const availabilityRoll = dice.rollD6();
  if (!PATRON_AVAILABILITY_FOUND_ROLLS.includes(availabilityRoll)) {
    return Object.freeze({
      available: false,
      availabilityRoll,
      patron: null,
      rumor: false,
      reaction: null,
      suitable: false
    });
  }

  const patron = rollPatronType(dice);
  if (patron.type === 'Rumor') {
    return Object.freeze({
      available: true,
      availabilityRoll,
      patron,
      rumor: true,
      reaction: null,
      suitable: true
    });
  }

  const reaction = rollReaction(dice, { dm: reactionDM });
  return Object.freeze({
    available: true,
    availabilityRoll,
    patron,
    rumor: false,
    reaction,
    suitable: reaction.total >= PATRON_SUITABILITY_TARGET
  });
}

// ---------------------------------------------------------------------------
// Classic Traveller Book 2 p.36 (1977): starship encounters. Kept for
// reference (the Journal's Book 2 table); rollShipEncounter below reads The
// Traveller Book's (1982) table instead (Kurt, Nov 2026).
//
// "When a ship enters a star system, there is a chance that any one of a
// variety of ships will be encountered." Two dice, modified by the starport of
// the primary world, read against the table. Eight or less is nothing.
//
// Note what the book says about these meetings: free traders and subsidized
// merchants "may serve as a source of information", and patrols "may be simple
// border pickets, or may be a form of pirate, exacting tolls or penalties."
// Only the pirate is a fight by default, and even that is a reaction away from
// being something else.
// ---------------------------------------------------------------------------

export const SHIP_ENCOUNTER_STARPORT_DMS = Object.freeze({
  A: 6, B: 4, C: 2, D: 1, E: -2, X: -4
});

export const SHIP_ENCOUNTER_TABLE = Object.freeze({
  9: 'free-trader',
  10: 'free-trader',
  11: 'free-trader',
  12: 'pirate',
  13: 'subsidized-merchant',
  14: 'patrol',
  15: 'subsidized-merchant',
  16: 'yacht',
  17: 'yacht',
  18: 'patrol'
});

export const SHIP_ENCOUNTER_TYPES = Object.freeze({
  'free-trader': { label: 'Free Trader', design: 'type-a-free-trader', hostileByDefault: false, informant: true },
  'subsidized-merchant': { label: 'Subsidized Merchant', design: 'type-r-subsidized-merchant', hostileByDefault: false, informant: true },
  yacht: { label: 'Yacht', design: 'type-y-yacht', hostileByDefault: false, informant: false },
  patrol: { label: 'Patrol', design: null, hostileByDefault: false, informant: false },
  pirate: { label: 'Pirate', design: null, hostileByDefault: true, informant: false },
  // The Traveller Book (1982) p.75's other standard starships.
  'subsidized-liner': { label: 'Subsidized Liner', design: 'type-m-subsidized-merchant', hostileByDefault: false, informant: false },
  scout: { label: 'Scout/Courier', design: 'type-s-scout-courier', hostileByDefault: false, informant: false },
  'mercenary-cruiser': { label: 'Mercenary Cruiser', design: 'type-c-cruiser', hostileByDefault: false, informant: false },
  'safari-ship': { label: 'Safari Ship', design: 'type-y-yacht', hostileByDefault: false, informant: false },
  'laboratory-ship': { label: 'Laboratory Ship', design: 'type-r-subsidized-merchant', hostileByDefault: false, informant: false }
});

// "Both Patrol and Pirate Ships will generally be Type S Scout/Couriers (throw
// 6-) or Type C Cruisers (throw 8+), with the chance that they are Armed Type Y
// Yachts (throw 7)."
export function rollPatrolOrPirateHull(dice) {
  requireDice(dice);
  const roll = dice.rollD6() + dice.rollD6();
  if (roll <= 6) return Object.freeze({ roll, hull: 'type-s-scout-courier', label: 'Type S Scout/Courier' });
  if (roll === 7) return Object.freeze({ roll, hull: 'type-y-yacht-armed', label: 'Armed Type Y Yacht' });
  return Object.freeze({ roll, hull: 'type-c-cruiser', label: 'Type C Cruiser' });
}

export function shipEncounterStarportDM(starport) {
  return SHIP_ENCOUNTER_STARPORT_DMS[String(starport ?? '').trim().toUpperCase()] ?? 0;
}

// ---------------------------------------------------------------------------
// The Traveller Book (1982) p.75/p.78: starship encounters, adopted in place
// of 1977 Book 2 p.36 (Kurt, Nov 2026).
//
// Thrown on entering or leaving a system: 2D, +2 with a naval base, +1 with a
// scout base, read in the column of the system's starport. A dash is no
// encounter. P is a pirate ("will probably attack, or at least try to achieve
// a position where it can make the attempt"); * is a small craft met as well,
// 1D on the small craft table (+1 naval base, -1 scout base). Ships are
// otherwise "going about their business": free traders swap rumours, scouts
// want information, patrol cruisers inspect for smugglers (p.78).
// ---------------------------------------------------------------------------

const SHIP_ENCOUNTER_COLUMNS_1982 = Object.freeze(['A', 'B', 'C', 'D', 'E', 'X']);

// Rows 2-15, columns A B C D E X; '' is a dash. Read from the printed table.
export const SHIP_ENCOUNTER_TABLE_1982 = Object.freeze({
  2: Object.freeze(['', '', '', '', '', '']),
  3: Object.freeze(['', '', '', '', '', '']),
  4: Object.freeze(['', '', '', '', 'K', '']),
  5: Object.freeze(['', '', '', '', '', 'L']),
  6: Object.freeze(['S', 'A', '', 'L', '', '']),
  7: Object.freeze(['A', 'S', 'R', 'K', '', '']),
  8: Object.freeze(['R', 'A', 'A', 'S', '', '']),
  9: Object.freeze(['M*', 'R*', 'R*', 'SP', 'S', 'T']),
  10: Object.freeze(['Y', 'M', 'TP', 'A', 'A', 'TP']),
  11: Object.freeze(['T', 'R', 'T', 'R', 'TP', 'CP']),
  12: Object.freeze(['R*', 'C*', 'Y', 'M', 'CP', 'C']),
  13: Object.freeze(['M*', 'Y*', 'A', 'Y', '', '']),
  14: Object.freeze(['C*', 'T*', 'S*', 'TP', '', '']),
  15: Object.freeze(['T*', 'C*', 'Y*', '', '', ''])
});

// p.75's standard starships. design: the standard design this game builds for
// one, or a stand-in until K, L and T have designs of their own: a 200-ton
// yacht for the 200-ton safari ship, a 400-ton subsidized merchant for the
// 400-ton laboratory ship, and the cruiser for the patrol cruiser (1977
// p.36 sent patrols to Type C hulls too).
export const STARSHIP_TYPES_1982 = Object.freeze({
  A: Object.freeze({ code: 'A', key: 'free-trader', label: 'Free Trader', tons: 200, design: 'type-a-free-trader', standIn: false }),
  K: Object.freeze({ code: 'K', key: 'safari-ship', label: 'Safari Ship', tons: 200, design: 'type-y-yacht', standIn: true }),
  L: Object.freeze({ code: 'L', key: 'laboratory-ship', label: 'Laboratory Ship', tons: 400, design: 'type-r-subsidized-merchant', standIn: true }),
  C: Object.freeze({ code: 'C', key: 'mercenary-cruiser', label: 'Mercenary Cruiser', tons: 800, design: 'type-c-cruiser', standIn: false }),
  M: Object.freeze({ code: 'M', key: 'subsidized-liner', label: 'Subsidized Liner', tons: 600, design: 'type-m-subsidized-merchant', standIn: false }),
  R: Object.freeze({ code: 'R', key: 'subsidized-merchant', label: 'Subsidized Merchant', tons: 400, design: 'type-r-subsidized-merchant', standIn: false }),
  S: Object.freeze({ code: 'S', key: 'scout', label: 'Scout/Courier', tons: 100, design: 'type-s-scout-courier', standIn: false }),
  T: Object.freeze({ code: 'T', key: 'patrol', label: 'Patrol Cruiser', tons: 400, design: 'type-c-cruiser', standIn: true }),
  Y: Object.freeze({ code: 'Y', key: 'yacht', label: 'Yacht', tons: 200, design: 'type-y-yacht', standIn: false })
});

export const SMALL_CRAFT_1982 = Object.freeze({
  0: '20-ton Launch', 1: '30-ton Ship\u2019s Boat', 2: '30-ton Slow Boat', 3: '40-ton Pinnace',
  4: '40-ton Slow Pinnace', 5: '50-ton Cutter', 6: '95-ton Shuttle', 7: '10-ton Fighter'
});

/**
 * The Traveller Book (1982) p.75. Returns type null when nothing is met.
 * hull is { hull: design key, label, code, standIn } for every ship met, so
 * the fight builds the ship the table named. smallCraft is the small craft
 * met as well, or null.
 */
export function rollShipEncounter(dice, { starport = 'C', navalBase = false, scoutBase = false, dm = 0 } = {}) {
  requireDice(dice);
  const throwResult = dice.roll2D6();
  const baseDM = (navalBase ? 2 : 0) + (scoutBase ? 1 : 0);
  const total = throwResult.total + baseDM + dm;
  const column = SHIP_ENCOUNTER_COLUMNS_1982.indexOf(String(starport ?? '').trim().toUpperCase());
  const row = SHIP_ENCOUNTER_TABLE_1982[Math.max(2, Math.min(15, total))];
  const entry = column >= 0 ? row[column] : '';
  const base = { dice: throwResult.dice, roll: throwResult.total, starportDM: 0, baseDM, total, code: entry || null, source: 'The Traveller Book (1982) p.75' };
  if (!entry) return Object.freeze({ ...base, type: null });
  const pirate = entry.includes('P');
  const type = STARSHIP_TYPES_1982[entry[0]];
  const key = pirate ? 'pirate' : type.key;
  let smallCraft = null;
  if (entry.includes('*')) {
    const craftRoll = Math.max(0, Math.min(7, dice.rollD6() + (navalBase ? 1 : 0) - (scoutBase ? 1 : 0)));
    smallCraft = Object.freeze({ roll: craftRoll, label: SMALL_CRAFT_1982[craftRoll] });
  }
  return Object.freeze({
    ...base,
    type: key,
    label: pirate ? 'Pirate' : type.label,
    hostileByDefault: pirate,
    informant: Boolean(SHIP_ENCOUNTER_TYPES[key]?.informant),
    hull: Object.freeze({ hull: type.design, label: `Type ${type.code} ${type.label}${type.standIn ? ' (built as a stand-in)' : ''}`, code: type.code, standIn: type.standIn }),
    smallCraft
  });
}

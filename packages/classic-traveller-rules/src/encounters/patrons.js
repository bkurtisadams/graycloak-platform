import { requireDice } from '../dice.js';

// Book 3 p.20: one throw per week for the whole band; a 5 or 6 on one die
// indicates a likely patron has been found.
export const PATRON_AVAILABILITY_FOUND_ROLLS = Object.freeze([5, 6]);
// Book 3 pp.22-23 reaction DMs: +1 for five or more terms in the army, navy,
// marines or scouts; -1 if the planetary population is 11 or greater.
export const REACTION_DMS = Object.freeze({
  fiveOrMoreMilitaryTerms: 1,
  planetaryPopulation11Plus: -1
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
// Classic Traveller Book 2 p.36 (1977): starship encounters.
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
  pirate: { label: 'Pirate', design: null, hostileByDefault: true, informant: false }
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

/**
 * Book 2 p.36. Returns null when nothing is met, which is the common result at
 * a poor starport: an X-class port throws 2D-4, so it cannot reach 9 on two
 * dice at all and never sees traffic.
 */
export function rollShipEncounter(dice, { starport = 'C', dm = 0 } = {}) {
  requireDice(dice);
  const throwResult = dice.roll2D6();
  const starportDM = shipEncounterStarportDM(starport);
  const total = throwResult.total + starportDM + dm;
  const key = SHIP_ENCOUNTER_TABLE[Math.min(18, total)] ?? null;
  if (!key) {
    return Object.freeze({ dice: throwResult.dice, roll: throwResult.total, starportDM, total, type: null });
  }
  const type = SHIP_ENCOUNTER_TYPES[key];
  const hull = (key === 'patrol' || key === 'pirate') ? rollPatrolOrPirateHull(dice) : null;
  return Object.freeze({
    dice: throwResult.dice,
    roll: throwResult.total,
    starportDM,
    total,
    type: key,
    label: type.label,
    hostileByDefault: type.hostileByDefault,
    informant: type.informant,
    hull
  });
}

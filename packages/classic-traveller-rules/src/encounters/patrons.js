import { requireDice } from '../dice.js';

// Book 3 p.25: one throw per week for the whole band; a 5 or 6 on one die
// indicates a likely patron has been found.
export const PATRON_AVAILABILITY_FOUND_ROLLS = Object.freeze([5, 6]);
// Book 3 p.27 standard reaction DMs.
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

// Book 3 p.27: natural 2 and 12 are not subject to DMs; any other result is
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

import { requireDice } from '../dice.js';

export const PATRON_AVAILABILITY_NO_PATRON_ROLLS = Object.freeze([5, 6]);
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
  const modifiedTotal = roll.total + dm;
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
  if (PATRON_AVAILABILITY_NO_PATRON_ROLLS.includes(availabilityRoll)) {
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

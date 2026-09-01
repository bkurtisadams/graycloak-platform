import { requireDice } from '../dice.js';

export const REFEREE_SKILL_CHECK_BASIS = 'graycloak-generalized-from-book1-electronics';

export function resolveRefereeSkillCheck({
  dice,
  target,
  skillLevel = 0,
  intelligence = null,
  education = null,
  intelligenceThreshold = 10,
  educationThreshold = 9,
  situationalDM = 0
} = {}) {
  requireDice(dice);
  if (!Number.isInteger(target) || target < 2) throw new TypeError('target must be an integer of 2 or greater');
  if (!Number.isInteger(skillLevel) || skillLevel < 0) throw new TypeError('skillLevel must be a non-negative integer');
  if (intelligence !== null && (!Number.isInteger(intelligence) || intelligence < 0)) throw new TypeError('intelligence must be null or a non-negative integer');
  if (education !== null && (!Number.isInteger(education) || education < 0)) throw new TypeError('education must be null or a non-negative integer');
  if (!Number.isInteger(intelligenceThreshold)) throw new TypeError('intelligenceThreshold must be an integer');
  if (!Number.isInteger(educationThreshold)) throw new TypeError('educationThreshold must be an integer');
  if (!Number.isInteger(situationalDM)) throw new TypeError('situationalDM must be an integer');

  const intelligenceDM = intelligence !== null && intelligence > intelligenceThreshold ? 1 : 0;
  const educationDM = education !== null && education > educationThreshold ? 1 : 0;
  const dm = skillLevel + intelligenceDM + educationDM + situationalDM;
  const roll = dice.roll2D6();
  const total = roll.total + dm;
  return Object.freeze({
    basis: REFEREE_SKILL_CHECK_BASIS,
    dice: Object.freeze([...roll.dice]),
    roll: roll.total,
    target,
    skillLevel,
    intelligenceDM,
    educationDM,
    situationalDM,
    dm,
    total,
    success: total >= target
  });
}

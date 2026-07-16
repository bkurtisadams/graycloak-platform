import { getStrengthWeightAllowance } from './encumbrance.js';
import { constitutionHitPointBonus } from './starting-character.js';
export const ACTIVE_ABILITY_MODIFIER_RULE_SOURCE = Object.freeze({
    ruleset: 'legacy-adnd-1e',
    section: 'Ability modifiers currently used by the GCC character generator',
    auditStatus: 'legacy-import',
    note: 'Centralizes the active Constitution hit-point adjustment, Charisma NPC reaction adjustment, and Strength weight allowance. The remaining displayed ability tables still require extraction and OSRIC 3.0 verification.',
});
export function getConstitutionHitPointAdjustment(constitution) {
    if (!Number.isFinite(constitution)) {
        throw new RangeError('Constitution must be a finite number.');
    }
    return constitutionHitPointBonus(Math.floor(constitution));
}
export function getCharismaNpcReactionAdjustment(charisma) {
    if (!Number.isFinite(charisma)) {
        throw new RangeError('Charisma must be a finite number.');
    }
    const score = Math.floor(charisma);
    if (score <= 3)
        return -25;
    if (score <= 5)
        return -20;
    if (score <= 8)
        return -10;
    if (score <= 12)
        return 0;
    if (score <= 15)
        return 10;
    if (score <= 17)
        return 20;
    return 25;
}
export function getActiveAbilityModifiers(scores, exceptionalStrength = 0) {
    return Object.freeze({
        constitutionHitPointAdjustment: getConstitutionHitPointAdjustment(scores.con),
        charismaNpcReactionAdjustment: getCharismaNpcReactionAdjustment(scores.cha),
        strengthWeightAllowance: getStrengthWeightAllowance(scores.str, exceptionalStrength),
    });
}

import { getExperienceThreshold, getLevelForExperience } from './advancement.js';
export const MULTICLASS_ADVANCEMENT_RULE_SOURCE = Object.freeze({
    ruleset: 'legacy-adnd-1e',
    section: 'Multiclass experience division and independent advancement',
    auditStatus: 'legacy-import',
    note: 'Adds the helper layer required by the current combat bridge TODO. Verify the division rule against OSRIC 3.0 before final certification.',
});
function normalizeAward(experience) {
    if (!Number.isFinite(experience))
        throw new RangeError('Experience must be finite.');
    return Math.max(0, Math.floor(experience));
}
function validateClasses(classIds) {
    if (classIds.length < 2)
        throw new RangeError('Multiclass advancement requires at least two classes.');
    if (new Set(classIds).size !== classIds.length)
        throw new RangeError('Multiclass classes must be unique.');
}
export function splitMulticlassExperienceAward(totalExperience, classIds) {
    validateClasses(classIds);
    const award = normalizeAward(totalExperience);
    const baseShare = Math.floor(award / classIds.length);
    let remainder = award % classIds.length;
    const shares = {};
    for (const classId of classIds) {
        shares[classId] = baseShare + (remainder > 0 ? 1 : 0);
        remainder = Math.max(0, remainder - 1);
    }
    return Object.freeze(shares);
}
export function applyMulticlassExperienceAward(components, totalExperience) {
    validateClasses(components.map((component) => component.classId));
    const shares = splitMulticlassExperienceAward(totalExperience, components.map((component) => component.classId));
    return Object.freeze(components.map((component) => {
        const previousExperience = normalizeAward(component.experience);
        const awardedExperience = shares[component.classId] ?? 0;
        const experience = previousExperience + awardedExperience;
        const previousLevel = getLevelForExperience(component.classId, previousExperience);
        const level = getLevelForExperience(component.classId, experience);
        return Object.freeze({
            classId: component.classId,
            previousExperience,
            awardedExperience,
            experience,
            previousLevel,
            level,
            gainedLevels: Math.max(0, level - previousLevel),
            nextLevelThreshold: getExperienceThreshold(component.classId, level + 1),
        });
    }));
}

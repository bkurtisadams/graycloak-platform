import { getExperienceThreshold, getLevelForExperience } from './advancement.js';
export const MULTICLASS_ADVANCEMENT_RULE_SOURCE = Object.freeze({
    ruleset: 'osric-3.0',
    section: 'Multiclass experience division and independent advancement',
    book: 'OSRIC 3.0 Player Guide, §1.3.11',
    page: 69,
    auditStatus: 'verified-osric3',
    note: 'XP divides equally with fractions dropped (125 xp to a two-class character is 62 each, 1 lost). Capped classes still receive their share.',
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
    const shares = {};
    for (const classId of classIds) {
        shares[classId] = baseShare;
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

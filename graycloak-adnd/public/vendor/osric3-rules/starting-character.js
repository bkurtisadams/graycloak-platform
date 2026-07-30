import { applyRacialAbilityAdjustments, RACIAL_ABILITY_LIMITS } from './abilities.js';
import { getSingleClassEligibility } from './classes.js';
import { rollDice, rollDie, rollPercentile } from './dice.js';
import { ABILITY_IDS, } from './types.js';
export const STARTING_CHARACTER_RULE_SOURCE = Object.freeze({
    ruleset: 'legacy-adnd-1e',
    section: 'Starting age, age adjustments, height, weight, gold, hit points, and secondary skills',
    book: 'AD&D 1e Players Handbook / Dungeon Masters Guide',
    auditStatus: 'legacy-import',
    note: 'Imported from gcc/adnd-chargen.js. Each table remains subject to OSRIC 3.0 verification.',
});
export const STARTING_AGE = Object.freeze({
    human: {
        cleric: { base: 18, dice: [1, 4] }, druid: { base: 18, dice: [1, 4] },
        fighter: { base: 15, dice: [1, 4] }, paladin: { base: 17, dice: [1, 4] },
        ranger: { base: 20, dice: [1, 4] }, 'magic-user': { base: 24, dice: [2, 8] },
        illusionist: { base: 30, dice: [1, 6] }, thief: { base: 18, dice: [1, 4] },
        assassin: { base: 20, dice: [1, 4] }, monk: { base: 21, dice: [1, 4] },
    },
    dwarf: {
        fighter: { base: 40, dice: [5, 4] }, thief: { base: 75, dice: [3, 6] },
        assassin: { base: 75, dice: [3, 6] },
    },
    elf: {
        fighter: { base: 130, dice: [5, 6] }, 'magic-user': { base: 150, dice: [5, 6] },
        thief: { base: 100, dice: [5, 6] }, assassin: { base: 100, dice: [5, 6] },
    },
    gnome: {
        fighter: { base: 60, dice: [5, 4] }, illusionist: { base: 100, dice: [2, 12] },
        thief: { base: 80, dice: [5, 4] }, assassin: { base: 80, dice: [5, 4] },
    },
    'half-elf': {
        cleric: { base: 40, dice: [2, 4] }, druid: { base: 40, dice: [2, 4] },
        fighter: { base: 22, dice: [3, 4] }, ranger: { base: 22, dice: [3, 4] },
        'magic-user': { base: 30, dice: [2, 8] }, thief: { base: 22, dice: [3, 8] },
        assassin: { base: 22, dice: [3, 8] },
    },
    halfling: {
        fighter: { base: 20, dice: [3, 4] }, thief: { base: 40, dice: [2, 4] },
    },
    'half-orc': {
        cleric: { base: 20, dice: [1, 4] }, fighter: { base: 13, dice: [1, 4] },
        thief: { base: 20, dice: [2, 4] }, assassin: { base: 20, dice: [2, 4] },
    },
});
export const AGE_BRACKETS = Object.freeze({
    human: [14, 21, 41, 61, 91, 120],
    dwarf: [35, 51, 151, 251, 351, 450],
    'mountain dwarf': [40, 61, 176, 276, 401, 525],
    elf: [100, 176, 551, 876, 1201, 1600],
    'high elf': [100, 176, 551, 876, 1201, 1600],
    'aquatic elf': [75, 151, 451, 701, 1001, 1200],
    drow: [50, 101, 401, 601, 801, 1000],
    'gray elf': [150, 251, 651, 1001, 1501, 2000],
    'wood elf': [75, 151, 501, 801, 1101, 1350],
    gnome: [50, 91, 301, 451, 601, 750],
    'half-elf': [24, 41, 101, 176, 251, 325],
    halfling: [22, 34, 69, 102, 145, 199],
    'half-orc': [12, 16, 31, 46, 61, 80],
});
export const AGE_CATEGORY_NAMES = [
    'Young Adult',
    'Mature',
    'Middle Aged',
    'Old',
    'Venerable',
];
export const AGE_ADJUSTMENTS = Object.freeze([
    { str: 0, int: 0, wis: -1, dex: 0, con: 1, cha: 0 },
    { str: 1, int: 0, wis: 1, dex: 0, con: 0, cha: 0 },
    { str: -1, int: 1, wis: 1, dex: 0, con: -1, cha: 0 },
    { str: -2, int: 0, wis: 1, dex: -2, con: -1, cha: 0 },
    { str: -1, int: 1, wis: 1, dex: -1, con: -1, cha: 0 },
]);
export const MAGICAL_AGING_YEARS = Object.freeze({
    alter_reality: 3,
    gate: 5,
    limited_wish: 1,
    restoration: 2,
    resurrection: 3,
    wish: 3,
    speed_potion: 1,
    haste: 1,
});
function getAgeBrackets(raceId) {
    return AGE_BRACKETS[raceId] ?? AGE_BRACKETS.human;
}
function getAgeInterval(raceId) {
    const brackets = getAgeBrackets(raceId);
    const venerableSpan = brackets[5] - brackets[4];
    if (venerableSpan < 100)
        return 1;
    if (venerableSpan <= 250)
        return 10;
    return 20;
}
export function rollStartingAge(raceId, classId, random) {
    const entry = STARTING_AGE[raceId][classId];
    if (!entry)
        return getAgeBrackets(raceId)[0] + rollDice(1, 4, random);
    return entry.base + rollDice(entry.dice[0], entry.dice[1], random);
}
export function getAgeCategory(raceId, age) {
    const brackets = getAgeBrackets(raceId);
    if (age < brackets[1])
        return 0;
    if (age < brackets[2])
        return 1;
    if (age < brackets[3])
        return 2;
    if (age < brackets[4])
        return 3;
    return 4;
}
export function getCumulativeAgeAdjustments(category) {
    const totals = { str: 0, int: 0, wis: 0, dex: 0, con: 0, cha: 0 };
    for (let index = 0; index <= category; index += 1) {
        const adjustment = AGE_ADJUSTMENTS[index];
        for (const abilityId of ABILITY_IDS)
            totals[abilityId] += adjustment[abilityId];
    }
    return totals;
}
export function applyAgeAdjustments(scores, raceId, category) {
    const adjustments = getCumulativeAgeAdjustments(category);
    const result = { ...scores };
    for (const abilityId of ABILITY_IDS) {
        const [minimum, racialMaximum] = RACIAL_ABILITY_LIMITS[raceId][abilityId];
        const maximum = abilityId === 'wis'
            ? Math.max(racialMaximum, 18 + adjustments[abilityId])
            : racialMaximum;
        result[abilityId] = Math.max(minimum, Math.min(maximum, result[abilityId] + adjustments[abilityId]));
    }
    return result;
}
export function rollMaximumAge(raceId, random) {
    const brackets = getAgeBrackets(raceId);
    const oldLow = brackets[3];
    const oldHigh = brackets[4] - 1;
    const venerableLow = brackets[4];
    const venerableHigh = brackets[5];
    const interval = getAgeInterval(raceId);
    const percentile = rollPercentile(random);
    let base;
    let variable;
    if (percentile <= 10) {
        base = oldLow;
        variable = rollDie(8, random) * interval;
    }
    else if (percentile <= 25) {
        base = oldHigh;
        variable = -rollDie(4, random) * interval;
    }
    else if (percentile <= 60) {
        base = venerableLow;
        variable = rollDie(6, random) * interval;
    }
    else if (percentile <= 90) {
        base = venerableHigh;
        const sample = random?.() ?? Math.random();
        if (!Number.isFinite(sample) || sample < 0 || sample >= 1)
            throw new RangeError('Invalid random sample.');
        variable = -Math.floor(sample * 10) * interval;
    }
    else {
        base = venerableHigh;
        const sample = random?.() ?? Math.random();
        if (!Number.isFinite(sample) || sample < 0 || sample >= 1)
            throw new RangeError('Invalid random sample.');
        variable = Math.floor(sample * 20) * interval;
    }
    return Math.max(base, base + variable);
}
export function applyUnnaturalAging(subject, years) {
    const oldAge = subject.age;
    const newAge = oldAge + years;
    const oldCategory = getAgeCategory(subject.race, oldAge);
    const newCategory = getAgeCategory(subject.race, newAge);
    const oldAdjustments = getCumulativeAgeAdjustments(oldCategory);
    const newAdjustments = getCumulativeAgeAdjustments(newCategory);
    const statChanges = {};
    if (newCategory > oldCategory) {
        for (const abilityId of ABILITY_IDS) {
            const delta = newAdjustments[abilityId] - oldAdjustments[abilityId];
            if (delta === 0)
                continue;
            const [minimum, racialMaximum] = RACIAL_ABILITY_LIMITS[subject.race][abilityId];
            const maximum = abilityId === 'wis' ? Math.max(racialMaximum, 18) : racialMaximum;
            const oldValue = subject[abilityId];
            const newValue = Math.max(minimum, Math.min(maximum, oldValue + delta));
            const actualChange = newValue - oldValue;
            if (actualChange !== 0) {
                subject[abilityId] = newValue;
                statChanges[abilityId] = actualChange;
            }
        }
    }
    subject.age = newAge;
    return { newAge, oldCategory, newCategory, statChanges };
}
export const HEIGHT_WEIGHT = Object.freeze({
    male: {
        dwarf: { hAvg: 48, hUnder: [1, 4], hOver: [1, 6], wAvg: 150, wUnder: [2, 16], wOver: [2, 24] },
        elf: { hAvg: 60, hUnder: [1, 4], hOver: [1, 6], wAvg: 100, wUnder: [1, 10], wOver: [1, 20] },
        gnome: { hAvg: 42, hUnder: [1, 3], hOver: [1, 3], wAvg: 80, wUnder: [2, 8], wOver: [2, 12] },
        'half-elf': { hAvg: 66, hUnder: [1, 6], hOver: [1, 6], wAvg: 130, wUnder: [1, 20], wOver: [1, 20] },
        halfling: { hAvg: 36, hUnder: [1, 3], hOver: [1, 6], wAvg: 60, wUnder: [2, 8], wOver: [2, 12] },
        'half-orc': { hAvg: 66, hUnder: [1, 4], hOver: [1, 4], wAvg: 150, wUnder: [2, 16], wOver: [4, 40] },
        human: { hAvg: 72, hUnder: [1, 12], hOver: [1, 12], wAvg: 175, wUnder: [3, 36], wOver: [5, 60] },
    },
    female: {
        dwarf: { hAvg: 46, hUnder: [1, 4], hOver: [1, 4], wAvg: 120, wUnder: [2, 16], wOver: [2, 20] },
        elf: { hAvg: 54, hUnder: [1, 4], hOver: [1, 6], wAvg: 80, wUnder: [1, 10], wOver: [2, 12] },
        gnome: { hAvg: 39, hUnder: [1, 3], hOver: [1, 3], wAvg: 75, wUnder: [1, 8], wOver: [1, 8] },
        'half-elf': { hAvg: 62, hUnder: [1, 6], hOver: [1, 6], wAvg: 100, wUnder: [1, 12], wOver: [2, 16] },
        halfling: { hAvg: 33, hUnder: [1, 3], hOver: [1, 3], wAvg: 50, wUnder: [2, 8], wOver: [2, 8] },
        'half-orc': { hAvg: 62, hUnder: [1, 3], hOver: [1, 3], wAvg: 120, wUnder: [3, 18], wOver: [4, 32] },
        human: { hAvg: 66, hUnder: [1, 6], hOver: [1, 8], wAvg: 130, wUnder: [3, 30], wOver: [4, 48] },
    },
});
export const HEIGHT_WEIGHT_DISTRIBUTION = Object.freeze({
    dwarf: { hUnder: 15, hOver: 80, wUnder: 20, wOver: 65 },
    elf: { hUnder: 10, hOver: 80, wUnder: 15, wOver: 90 },
    gnome: { hUnder: 20, hOver: 85, wUnder: 20, wOver: 75 },
    'half-elf': { hUnder: 35, hOver: 90, wUnder: 20, wOver: 85 },
    halfling: { hUnder: 10, hOver: 90, wUnder: 10, wOver: 50 },
    'half-orc': { hUnder: 45, hOver: 75, wUnder: 30, wOver: 55 },
    human: { hUnder: 20, hOver: 80, wUnder: 25, wOver: 75 },
});
export function rollHeightWeight(raceId, genderId, random) {
    const table = HEIGHT_WEIGHT[genderId][raceId];
    const distribution = HEIGHT_WEIGHT_DISTRIBUTION[raceId];
    const shortRace = table.hAvg < 60;
    const heightRoll = rollPercentile(random);
    let height;
    if (heightRoll <= distribution.hUnder) {
        height = table.hAvg - rollDice(table.hUnder[0], table.hUnder[1], random);
    }
    else if (heightRoll > distribution.hOver) {
        height = table.hAvg + rollDice(table.hOver[0], table.hOver[1], random);
    }
    else {
        const varianceRoll = rollPercentile(random);
        const variance = shortRace ? rollDice(1, 3, random) : rollDice(1, 4, random);
        if (varianceRoll <= 30)
            height = table.hAvg - variance;
        else if (varianceRoll >= 71)
            height = table.hAvg + variance;
        else
            height = table.hAvg;
    }
    const weightRoll = rollPercentile(random);
    let weight;
    const lightRace = table.wAvg <= 100;
    if (weightRoll <= distribution.wUnder) {
        weight = table.wAvg - rollDice(table.wUnder[0], table.wUnder[1], random);
    }
    else if (weightRoll > distribution.wOver) {
        weight = table.wAvg + rollDice(table.wOver[0], table.wOver[1], random);
    }
    else {
        const varianceRoll = rollPercentile(random);
        const variance = lightRace ? rollDice(1, 4, random) : rollDice(1, 8, random);
        if (varianceRoll <= 30)
            weight = table.wAvg - variance;
        else if (varianceRoll >= 71)
            weight = table.wAvg + variance;
        else
            weight = table.wAvg;
    }
    return { height: Math.max(24, height), weight: Math.max(30, weight) };
}
export function formatHeight(inches) {
    return `${Math.floor(inches / 12)}'${inches % 12}"`;
}
export const SECONDARY_SKILLS = Object.freeze([
    { range: [1, 2], name: 'Armorer' },
    { range: [3, 4], name: 'Bowyer/Fletcher' },
    { range: [5, 10], name: 'Farmer/Gardener' },
    { range: [11, 14], name: 'Fisher (netting)' },
    { range: [15, 20], name: 'Forester' },
    { range: [21, 23], name: 'Gambler' },
    { range: [24, 27], name: 'Hunter/Fisher' },
    { range: [28, 32], name: 'Husbandman' },
    { range: [33, 34], name: 'Jeweler/Lapidary' },
    { range: [35, 37], name: 'Leather Worker/Tanner' },
    { range: [38, 39], name: 'Limner/Painter' },
    { range: [40, 42], name: 'Mason/Carpenter' },
    { range: [43, 44], name: 'Miner' },
    { range: [45, 46], name: 'Navigator' },
    { range: [47, 49], name: 'Sailor' },
    { range: [50, 51], name: 'Shipwright' },
    { range: [52, 54], name: 'Tailor/Weaver' },
    { range: [55, 57], name: 'Teamster/Freighter' },
    { range: [58, 60], name: 'Trader/Barterer' },
    { range: [61, 64], name: 'Trapper/Furrier' },
    { range: [65, 67], name: 'Woodworker/Cabinetmaker' },
    { range: [68, 85], name: null },
]);
function findSecondarySkill(roll) {
    return SECONDARY_SKILLS.find((entry) => roll >= entry.range[0] && roll <= entry.range[1])?.name ?? null;
}
function rollSecondarySkillEntry(random) {
    return findSecondarySkill(rollDie(85, random));
}
export function rollSecondarySkills(random) {
    const percentile = rollPercentile(random);
    if (percentile >= 86) {
        const first = rollSecondarySkillEntry(random);
        const second = rollSecondarySkillEntry(random);
        const result = [];
        if (first)
            result.push(first);
        if (second && second !== first)
            result.push(second);
        return result;
    }
    const skill = findSecondarySkill(percentile);
    return skill ? [skill] : [];
}
export function rollStartingGold(classId, random) {
    switch (classId) {
        case 'fighter':
        case 'paladin':
        case 'ranger': return rollDice(5, 4, random) * 10;
        case 'cleric':
        case 'druid': return rollDice(3, 6, random) * 10;
        case 'thief':
        case 'assassin': return rollDice(2, 6, random) * 10;
        case 'magic-user':
        case 'illusionist': return rollDice(2, 4, random) * 10;
        case 'monk': return rollDice(5, 4, random);
    }
}
export const CLASS_HIT_DICE = Object.freeze({
    fighter: 10,
    cleric: 8,
    thief: 6,
    'magic-user': 4,
    ranger: 8,
    paladin: 10,
    assassin: 6,
    monk: 4,
    druid: 8,
    illusionist: 4,
});
export const FIGHTER_CLASS_IDS = Object.freeze(['fighter', 'paladin', 'ranger']);
export function rollPercentileStrength(classId, strength, random) {
    return strength === 18 && FIGHTER_CLASS_IDS.includes(classId) ? rollPercentile(random) : 0;
}
export function constitutionHitPointBonus(constitution) {
    if (constitution <= 3)
        return -2;
    if (constitution <= 6)
        return -1;
    if (constitution <= 14)
        return 0;
    if (constitution === 15)
        return 1;
    if (constitution === 16)
        return 2;
    if (constitution === 17)
        return 3;
    if (constitution === 18)
        return 4;
    return 5;
}
export function rollStartingHitPoints(classId, constitution, random) {
    let bonus = constitutionHitPointBonus(constitution);
    if (!FIGHTER_CLASS_IDS.includes(classId) && bonus > 2)
        bonus = 2;
    const numberOfDice = classId === 'ranger' ? 2 : 1;
    let total = 0;
    for (let index = 0; index < numberOfDice; index += 1) {
        total += rollDie(CLASS_HIT_DICE[classId], random) + bonus;
    }
    return Math.max(1, total);
}
export function getClassExperienceBonus(classId, scores, baseExperience) {
    let qualifies = false;
    switch (classId) {
        case 'fighter':
            qualifies = scores.str > 15;
            break;
        case 'paladin':
            qualifies = scores.str > 15 && scores.wis > 15;
            break;
        case 'ranger':
            qualifies = scores.str > 15 && scores.int > 15 && scores.wis > 15;
            break;
        case 'cleric':
            qualifies = scores.wis > 15;
            break;
        case 'druid':
            qualifies = scores.wis > 15 && scores.cha > 15;
            break;
        case 'magic-user':
            qualifies = scores.int > 15;
            break;
        case 'thief':
            qualifies = scores.dex > 15;
            break;
        case 'illusionist':
        case 'assassin':
        case 'monk':
            qualifies = false;
            break;
    }
    return qualifies ? Math.ceil(baseExperience * 0.1) : 0;
}
export function buildStartingCharacter(request) {
    const { raceId, classId, baseScores, random } = request;
    const racialScores = applyRacialAbilityAdjustments(baseScores, raceId);
    const eligibility = getSingleClassEligibility(raceId, classId, racialScores);
    if (!eligibility.allowed) {
        if (eligibility.reason === 'below-minimums') {
            const first = Object.entries(eligibility.missingMinimums)[0];
            if (first) {
                const [abilityId, values] = first;
                return {
                    valid: false,
                    error: `${classId} requires ${abilityId.toUpperCase()} ${values.required}, you have ${values.actual}.`,
                };
            }
        }
        return { valid: false, error: `A ${raceId} cannot be a player-character ${classId}.` };
    }
    const age = rollStartingAge(raceId, classId, random);
    const ageCategory = getAgeCategory(raceId, age);
    const finalScores = applyAgeAdjustments(racialScores, raceId, ageCategory);
    const genderId = request.genderId === 'female' ? 'female' : 'male';
    let { height, weight } = rollHeightWeight(raceId, genderId, random);
    if (raceId === 'human') {
        if (rollPercentile(random) >= 96) {
            height += genderId === 'male' ? rollDice(1, 20, random) : rollDice(1, 12, random);
        }
        if (rollPercentile(random) >= 96) {
            weight += genderId === 'male' ? rollDice(10, 20, random) : rollDice(10, 12, random);
        }
    }
    return {
        valid: true,
        racialScores,
        finalScores,
        age,
        ageCategory,
        ageCategoryName: AGE_CATEGORY_NAMES[ageCategory],
        genderId,
        height,
        weight,
        secondarySkills: request.preRolledSecondarySkills ?? rollSecondarySkills(random),
        maximumAge: rollMaximumAge(raceId, random),
    };
}

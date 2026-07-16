export const ENCUMBRANCE_CATEGORIES = ['normal', 'heavy', 'loaded', 'maximum', 'overloaded'];
export const ENCUMBRANCE_RULE_SOURCE = Object.freeze({
    ruleset: 'legacy-adnd-1e',
    section: 'Strength weight allowance, encumbrance bands, and movement multipliers',
    auditStatus: 'legacy-import',
    note: 'Centralized from active GCC encumbrance behavior and legacy AD&D tables. Verify thresholds and rounding against OSRIC 3.0.',
});
export const BASE_ENCUMBRANCE_THRESHOLDS = Object.freeze({
    normal: 350,
    heavy: 700,
    loaded: 1050,
    maximum: 1500,
});
export const MOVEMENT_MULTIPLIERS = Object.freeze({
    normal: 1,
    heavy: 0.75,
    loaded: 0.5,
    maximum: 0.25,
    overloaded: 0,
});
export const BASE_MOVEMENT_RATES = Object.freeze({
    human: 12,
    dwarf: 9,
    elf: 12,
    gnome: 9,
    'half-elf': 12,
    halfling: 9,
    'half-orc': 12,
});
export function getStrengthWeightAllowance(strength, exceptionalStrength = 0) {
    if (!Number.isFinite(strength) || !Number.isFinite(exceptionalStrength)) {
        throw new RangeError('Strength values must be finite numbers.');
    }
    const score = Math.floor(strength);
    const percentile = Math.max(0, Math.min(100, Math.floor(exceptionalStrength)));
    if (score <= 3)
        return -350;
    if (score <= 5)
        return -250;
    if (score <= 7)
        return -150;
    if (score <= 11)
        return 0;
    if (score <= 13)
        return 100;
    if (score <= 15)
        return 200;
    if (score === 16)
        return 350;
    if (score === 17)
        return 500;
    if (score === 18) {
        if (percentile === 0)
            return 750;
        if (percentile <= 50)
            return 1000;
        if (percentile <= 75)
            return 1250;
        if (percentile <= 90)
            return 1500;
        if (percentile <= 99)
            return 2000;
        return 3000;
    }
    return 3000;
}
export function getEncumbranceThresholds(strength, exceptionalStrength = 0) {
    const allowance = getStrengthWeightAllowance(strength, exceptionalStrength);
    return Object.freeze({
        normal: Math.max(0, BASE_ENCUMBRANCE_THRESHOLDS.normal + allowance),
        heavy: Math.max(0, BASE_ENCUMBRANCE_THRESHOLDS.heavy + allowance),
        loaded: Math.max(0, BASE_ENCUMBRANCE_THRESHOLDS.loaded + allowance),
        maximum: Math.max(0, BASE_ENCUMBRANCE_THRESHOLDS.maximum + allowance),
    });
}
export function getEncumbranceCategory(totalCoinWeight, strength, exceptionalStrength = 0) {
    if (!Number.isFinite(totalCoinWeight))
        throw new RangeError('Coin weight must be a finite number.');
    const weight = Math.max(0, totalCoinWeight);
    const thresholds = getEncumbranceThresholds(strength, exceptionalStrength);
    if (weight <= thresholds.normal)
        return 'normal';
    if (weight <= thresholds.heavy)
        return 'heavy';
    if (weight <= thresholds.loaded)
        return 'loaded';
    if (weight <= thresholds.maximum)
        return 'maximum';
    return 'overloaded';
}
export function getMovementMultiplier(category) {
    return MOVEMENT_MULTIPLIERS[category];
}
export function getAdjustedMovementRate(baseMovementRate, category) {
    if (!Number.isFinite(baseMovementRate) || baseMovementRate < 0) {
        throw new RangeError('Base movement rate must be a nonnegative finite number.');
    }
    return baseMovementRate * getMovementMultiplier(category);
}
export function getRacialMovementRate(raceId, category = 'normal') {
    return getAdjustedMovementRate(BASE_MOVEMENT_RATES[raceId], category);
}
export function evaluateEncumbrance(totalCoinWeight, strength, exceptionalStrength = 0) {
    const category = getEncumbranceCategory(totalCoinWeight, strength, exceptionalStrength);
    return Object.freeze({
        totalCoinWeight: Math.max(0, totalCoinWeight),
        thresholds: getEncumbranceThresholds(strength, exceptionalStrength),
        category,
        movementMultiplier: getMovementMultiplier(category),
    });
}
export function coinsToPounds(coinWeight) {
    if (!Number.isFinite(coinWeight))
        throw new RangeError('Coin weight must be a finite number.');
    return coinWeight / 10;
}
export function poundsToCoins(pounds) {
    if (!Number.isFinite(pounds))
        throw new RangeError('Pounds must be a finite number.');
    return pounds * 10;
}

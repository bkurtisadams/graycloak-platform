// Gamma World 1e (1981), printed pp.41-42: experience awards and bonuses.
import { die, integer } from './index.js';

export const EXPERIENCE_THRESHOLDS = Object.freeze([3000, 6000, 12000, 25000, 50000, 100000, 200000, 500000, 1000000]);

// Every listed total reached or passed between two experience totals; one per further 1,000,000 after the list.
export function thresholdsCrossed(before, after) {
    integer(before, 0, Number.MAX_SAFE_INTEGER, 'experience');
    integer(after, before, Number.MAX_SAFE_INTEGER, 'experience');
    const out = EXPERIENCE_THRESHOLDS.filter(t => before < t && after >= t);
    for (let t = 2000000; t <= after; t += 1000000) if (before < t) out.push(t);
    return out;
}

const ATTRIBUTE_BY_ROLL = { 1: 'MS', 2: 'CN', 3: 'DX', 4: 'CH', 5: 'PS', 6: 'IN' };
// Experience bonus matrix: d10. An attribute already at 18 gains nothing and there is no further roll.
export function experienceBonus(roll, attributes = {}) {
    integer(roll, 1, 10, 'bonus roll');
    if (roll <= 6) {
        const attribute = ATTRIBUTE_BY_ROLL[roll];
        return (attributes[attribute] ?? 0) >= 18 ? { roll, kind: 'none', attribute, text: `${attribute} is already 18: no bonus` } : { roll, kind: 'attribute', attribute, text: `+1 ${attribute}` };
    }
    return roll <= 8 ? { roll, kind: 'hit', text: '+1 to hit in physical combat' } : { roll, kind: 'damage', text: '+1 per die of damage with non-energy weapons' };
}
export function rollExperienceBonus(attributes, rng = Math.random) { return experienceBonus(die(10, rng), attributes); }

// Suggested experience values for artifacts, awarded once the find is correctly identified.
export const ARTIFACT_EXPERIENCE = Object.freeze({ 'Laser pistol': 1000, 'Energy cell charger': 500, 'Hydrogen energy cell': 150 });

// Gamma World 1e, third printing (1981). Printed pages in comments.
export function integer(n, min, max, label = 'value') { if (!Number.isInteger(n) || n < min || n > max)
    throw new RangeError(`${label}: expected integer ${min}–${max}`); return n; }
export function die(sides, rng = Math.random) { integer(sides, 1, 100000, 'sides'); const r = rng(); if (!Number.isFinite(r) || r < 0 || r >= 1)
    throw new RangeError('RNG must return [0,1)'); return Math.floor(r * sides) + 1; }
export function dice(count, sides, rng = Math.random) { integer(count, 0, 10000, 'count'); return Array.from({ length: count }, () => die(sides, rng)).reduce((a, b) => a + b, 0); }
export const ATTRIBUTES = Object.freeze(['MS', 'IN', 'DX', 'CH', 'CN', 'PS']);
export const SPECIES = Object.freeze(['psh', 'humanoid', 'animal', 'plant', 'robot']);
// pp. 6–8: attribute rolls, PSH charisma, constitution dice.
export function generateCharacter({ species = 'psh', name = '', animalStock = '', method = '4d6', rng = Math.random } = {}) { if (!SPECIES.includes(species))
    throw new RangeError('Unknown species'); if (!['3d6', '4d6'].includes(method))
    throw new RangeError('Unknown method'); if (species === 'animal' && !animalStock.trim())
    throw new Error('Animal stock required'); const attributes = Object.fromEntries(ATTRIBUTES.map(k => [k, Array.from({ length: method === '4d6' ? 4 : 3 }, () => die(6, rng)).sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0)])); if (species === 'psh')
    attributes.CH = Math.min(18, attributes.CH + 3); const hp = dice(attributes.CN, 6, rng); return { schemaVersion: 1, name: name.trim(), species, animalStock: species === 'animal' ? animalStock.trim() : null, attributes, hp, maxHp: hp, armorClass: 10, experience: 0, mutations: [], mutationCounts: ['psh', 'robot'].includes(species) ? { physical: 0, mental: 0 } : species === 'plant' ? { physical: 0, mental: 0, plant: die(4, rng) } : { physical: die(4, rng), mental: die(4, rng) }, status: 'draft', reviewRequired: species === 'animal' ? ['speech', 'manipulation', 'locomotion'] : [] }; }
export function artifactIntelligenceModifier(IN) { integer(IN, 3, 18); return IN > 15 ? 15 - IN : IN < 7 ? 7 - IN : 0; }
export function strengthDamageModifier(PS) { integer(PS, 3, 18); return PS > 15 ? PS - 15 : PS < 6 ? PS - 6 : 0; }
export function charisma(CH) { integer(CH, 3, 18); return { followers: [1, 1, 2, 2, 3, 3, 4, 4, 4, 5, 5, 6, 7, 8, 10, 15][CH - 3], morale: [-3, -3, -2, -2, -1, -1, 0, 0, 0, 0, 0, 1, 1, 2, 2, 3][CH - 3], reaction: [-3, -2, -2, -1, -1, 0, 0, 0, 0, 0, 1, 1, 2, 2, 3, 3][CH - 3] }; }
// p.20: rows AC 1–10, columns WC 1–16. WC16/AC4 is printed 18 (not normalized).
export const WEAPON_MATRIX = Object.freeze([
    [19, 19, 18, 15, 13, 16, 14, 18, 18, 16, 16, 16, 12, 14, 14, 12],
    [17, 18, 17, 14, 12, 15, 13, 17, 16, 15, 15, 15, 11, 13, 13, 11],
    [16, 16, 16, 12, 10, 15, 12, 16, 15, 14, 15, 15, 8, 12, 13, 11],
    [15, 14, 15, 12, 10, 15, 11, 15, 14, 13, 15, 15, 8, 11, 13, 18],
    [14, 13, 14, 12, 10, 15, 10, 14, 13, 12, 14, 15, 8, 11, 13, 11],
    [13, 12, 13, 12, 10, 15, 9, 13, 12, 11, 11, 15, 8, 10, 13, 11],
    [12, 11, 12, 12, 10, 13, 8, 12, 11, 10, 10, 11, 8, 10, 13, 11],
    [11, 10, 11, 12, 10, 13, 7, 11, 10, 9, 9, 9, 8, 9, 13, 11],
    [10, 9, 10, 12, 10, 7, 6, 10, 9, 8, 7, 6, 8, 8, 8, 11],
    [9, 8, 9, 11, 9, 6, 5, 9, 8, 7, 6, 5, 8, 8, 8, 10]
].map(Object.freeze));
export function weaponTarget(ac, wc) { return WEAPON_MATRIX[integer(ac, 1, 10, 'AC') - 1][integer(wc, 1, 16, 'WC') - 1]; }
export function naturalTarget(ac, hd) { integer(ac, 1, 10, 'AC'); integer(hd, 1, 10000, 'HD'); const band = [1, 3, 5, 8, 10, 14, Infinity].findIndex(v => hd <= v); return [20, 19, 18, 17, 16, 14, 13, 12, 11, 10][ac - 1] - band; }
export function mentalTarget(attacker, defender) { integer(attacker, 3, 18, 'attacker MS'); integer(defender, 3, 18, 'defender MS'); const n = 10 + defender - attacker; return n < 2 ? 'A' : n > 20 ? 'NE' : n; }
export function mentalAttack({ attackerMS, defenderMS, rng = Math.random }) { const target = mentalTarget(attackerMS, defenderMS); const roll = typeof target === 'number' ? die(20, rng) : null; return { target, roll, hit: target === 'A' || (roll !== null && roll >= target) }; }
// p.20: only missile/throwing range modifiers; referee supplies other modifiers.
export function physicalAttack({ ac, wc, hd, damageDice, damageSides, damageBonus = 0, hitModifier = 0, distance = 0, effectiveRange = null, rng = Math.random }) { const target = wc === undefined ? naturalTarget(ac, hd) : weaponTarget(ac, wc); integer(damageDice, 1, 100, 'damage dice'); integer(damageSides, 1, 100, 'damage sides'); if (!Number.isFinite(distance) || distance < 0)
    throw new RangeError('distance'); if (effectiveRange !== null && (!Number.isFinite(effectiveRange) || effectiveRange <= 0))
    throw new RangeError('range'); if (!Number.isInteger(hitModifier) || !Number.isInteger(damageBonus))
    throw new RangeError('modifiers'); if (effectiveRange !== null && distance > 2 * effectiveRange)
    return { target, hit: false, reason: 'out-of-range', roll: null, damage: 0 }; const rangePenalty = effectiveRange !== null && distance > effectiveRange ? -5 : 0; const roll = die(20, rng), hit = roll + hitModifier + rangePenalty >= target; return { target, roll, hit, rangePenalty, damage: hit ? Math.max(0, dice(damageDice, damageSides, rng) + damageBonus) : 0 }; }
// pp.28–29: matrix patterns; D is a distinct outcome, never ordinary HP damage.
export function radiationCell(cn, intensity) { integer(cn, 3, 18, 'CN'); integer(intensity, 3, 18, 'intensity'); const n = intensity - cn + 11; return n <= 0 ? 0 : n <= 8 ? n : n <= 10 ? 'M' : 'D'; }
export function poisonCell(cn, intensity) { integer(cn, 3, 18, 'CN'); integer(intensity, 3, 18, 'intensity'); const n = intensity - cn + 4; if (cn === 11 && intensity === 10)
    return 'D'; return n <= 0 ? 0 : n <= 3 ? n : 'D'; }
export function radiation({ cn, intensity, rng = Math.random }) { const cell = radiationCell(cn, intensity); if (cell === 'M')
    return { cell, outcome: 'mutation', manifestsAfterDays: 7 }; if (cell === 'D') {
    const defect = die(100, rng) <= 20;
    return defect ? { cell, outcome: 'defect', manifestsAfterDays: 7 } : { cell, outcome: 'death' };
} return { cell, outcome: 'damage', damage: dice(cell, 6, rng) }; }
export function poison({ cn, intensity, paralytic = false, rng = Math.random }) { const cell = poisonCell(cn, intensity); return cell === 'D' ? { cell, outcome: paralytic ? 'paralysis' : 'fatal-poison', antidoteWindowRounds: 2 } : { cell, outcome: 'damage', damage: dice(cell, 6, rng) }; }
export function antidoteChance(poisonIntensity, antidoteIntensity) { integer(poisonIntensity, 3, 18); integer(antidoteIntensity, 3, 18); return poisonIntensity === antidoteIntensity ? 100 : Math.max(0, Math.min(100, 50 + 10 * (antidoteIntensity - poisonIntensity))); }
// p.37: ordinary rest, no automatic resurrection.
export function healRest(character, days) { integer(days, 0, 100000); if (character.hp <= 0 || character.species === 'robot')
    return { ...character }; return { ...character, hp: Math.min(character.maxHp, character.hp + days) }; }
export function initiative({ leftHighDX = false, rightHighDX = false, rng = Math.random } = {}) { const left = die(6, rng) + Number(leftHighDX), right = die(6, rng) + Number(rightHighDX); return { left, right, first: left === right ? 'simultaneous' : left > right ? 'left' : 'right' }; }
export function movement({ mode = 'combat', pace = 'normal', indoors = false, encumbered = false } = {}) { if (mode === 'search')
    return { seconds: 10, meters: (indoors ? 1 : 6) * (encumbered ? .5 : 1) }; if (mode !== 'combat')
    throw new RangeError('Use referee-defined route movement'); if (!['normal', 'trot', 'charge'].includes(pace))
    throw new RangeError('pace'); return { seconds: 10, meters: { normal: 12, trot: 16, charge: 24 }[pace], canFire: pace === 'normal', requiresRuling: encumbered }; }
export function artifactCondition(rng = Math.random) { const roll = dice(2, 6, rng); const i = roll <= 5 ? 0 : roll <= 7 ? 1 : roll <= 9 ? 2 : roll - 7; return { roll, condition: ['broken', 'poor', 'fair', 'good', 'excellent', 'perfect'][i], functionChance: i * 20 }; }
export { PHYSICAL, MENTAL, PLANT, mutationSlots, mutationResult, rollMutation, selectedDefects, mutationDraft, assignWorkshopDefects } from './mutations.js';
export const dexterityHitModifier = strengthDamageModifier;
// p.17: referee selects route distance; ordinary walking guideline 1–10 km/turn.
export function routeMovement(kilometers, { fatigued = false } = {}) { if (!Number.isFinite(kilometers) || kilometers < 1 || kilometers > 10)
    throw new RangeError('Referee walking rate must be 1–10 km per route turn'); return { seconds: 14400, kilometers: kilometers * (fatigued ? .5 : 1) }; }
export * from './equipment.js';
export * from './character-mechanics.js';
export * from "./encounter.js";
export * from "./technology.js";
export * from "./actions.js";
export * from "./experience.js";

import { ATTRIBUTES, SPECIES, integer, dice, artifactIntelligenceModifier, radiation, poison, mentalAttack } from './index.js';
import { PHYSICAL, MENTAL, PLANT, mutationSlots } from './mutations.js';
import { getArmor, getWeapon } from './equipment.js';
const entries = [...PHYSICAL, ...MENTAL, ...PLANT];
// These describe implemented portions, not blanket claims that the entire mutation works.
export const EFFECT_COVERAGE = Object.freeze({
    'physical-6': ['partial', 'Double all damage'],
    'physical-7': ['partial', 'Contact electrical damage 3d6 per round'],
    'physical-10': ['partial', 'Heat beam 4d6, 15 m, every three rounds'],
    'physical-37': ['partial', 'Radiation intensity 3d6, 10 m, every four rounds'],
    'physical-42': ['partial', 'Sonic area damage 3d6, 10 m, every four rounds'],
    'physical-12': ['implemented', 'Bonus HP; poison resistance 18; radiation resistance +3'],
    'physical-13': ['partial', 'Base AC 4; encumbrance ruling pending'],
    'physical-14': ['partial', 'Hearing range 60 m; surprise immunity flag'],
    'physical-15': ['partial', 'Two additional weapon damage dice'],
    'physical-17': ['partial', 'Three additional non-powered weapon damage dice'],
    'physical-21': ['partial', 'Bleeding after injury; 2 HP per round; binding helper'],
    'physical-23': ['partial', 'Double movement and two attacks per round; scheduler pending'],
    'physical-29': ['partial', 'Any poison exposure fatal unless antidote; timed resolution pending'],
    'physical-32': ['partial', 'Base AC 6; half damage for back/head hits'],
    'physical-33': ['partial', 'Dark movement, sunlight rest healing, food and temperature flags'],
    'physical-38': ['partial', 'Regeneration based on weight; fractional rate rounded down per day'],
    'physical-45': ['partial', 'AC 4, half damage, three-quarter movement'],
    'physical-47': ['partial', '−4 hit modifier; vision limitation flag'],
    'mental-16': ['implemented', 'Mental resistance +4 (max 18), artifact roll −2'],
    'mental-24': ['partial', 'Mental blast, 15 m, 3d6, every other round'],
    'mental-27': ['implemented', 'Mental Strength becomes 3'],
    'mental-28': ['partial', 'Mental resistance +4 (max 18); mental power detection flag'],
    'mental-47': ['partial', 'Restore all HP; once per 24 hours, four uses per rolling week'],
    'mental-31': ['partial', 'Double damage (default referee choice; triple not implemented)'],
    'plant-8': ['partial', 'One 1d8 jaw attack in sandbox; additional jaws pending'],
    'plant-14': ['partial', 'Contact electrical attack, 1d6 recharge per round, maximum 4d6'],
    'plant-16': ['partial', 'Heat beam 4d6, 15 m, every three rounds'],
    'plant-19': ['partial', 'Weapon manipulation; baseline playable plant already has manipulators'],
    'plant-20': ['partial', 'Locomotion; baseline playable plant already mobile'],
    'plant-22': ['partial', 'Normal senses; baseline playable plant already has senses'],
    'plant-33': ['partial', 'Sonic area attack, 3d6, 10 m, every four rounds'],
    'plant-38': ['partial', 'Extra 2 damage per die from heat/cold/energy'],
});
export function mutationCoverage(id) { if (!entries.some(e => e.id === id))
    throw Error('Unknown mutation'); const [status, detail] = EFFECT_COVERAGE[id] ?? ['catalog-only', 'No mechanical effect yet']; return { status, detail }; }
export function validateBase(c) { if (!c || !SPECIES.includes(c.species) || typeof c.name !== 'string' || c.name.length > 80)
    throw Error('Invalid character'); for (const a of ATTRIBUTES)
    integer(c.attributes?.[a], 3, 18, a); integer(c.maxHp, c.attributes.CN, c.attributes.CN * 6, 'base HP'); integer(c.hp, 0, c.maxHp, 'current base HP'); integer(c.armorClass, 1, 10, 'base armor class'); integer(c.experience, 0, Number.MAX_SAFE_INTEGER, 'experience'); if (c.reviewRequired !== undefined && (!Array.isArray(c.reviewRequired) || c.reviewRequired.some(x => typeof x !== 'string')))
    throw Error('Invalid review flags'); if (c.species === 'animal' && !(typeof c.animalStock === 'string' && c.animalStock.trim()))
    throw Error('Animal stock required'); return c; }
// Recompute from immutable draft, never from derived values. Selections must match original slots.
export function validateSelections(base, generation, ids, { preview = false } = {}) { validateBase(base); if (!Array.isArray(ids))
    throw Error('Invalid mutation selections'); const slots = mutationSlots(base, generation); if (ids.length > slots.length || !preview && (ids.length !== slots.length || ids.some(id => !id)))
    throw Error('Complete all mutation selections'); const selected = []; for (let i = 0; i < slots.length; i++) {
    const id = ids[i], s = slots[i];
    if (!id) {
        if (preview)
            continue;
        throw Error('Complete all mutation selections');
    }
    const e = entries.find(x => x.id === id);
    if (!e || (s.kind === 'either' ? !['physical', 'mental'].includes(e.kind) : s.kind !== e.kind) || s.defectOnly && !e.defect || !s.defectOnly && (s.goodOnly || generation.method === 'selected') && e.defect || s.entry && s.entry.id !== id)
        throw Error('Invalid mutation selection in slot ' + (i + 1));
    if (generation.strictSelections && generation.method === 'selected' && selected.some(m => m.id === e.id))
        throw Error('Duplicate mutation selection: ' + e.name);
    selected.push(e);
} return selected; }
export function previewCharacter(base, generation, ids, options = {}) { return derive(base, generation, ids, options, true); }
export function deriveCharacter(base, generation, ids, options = {}) { return derive(base, generation, ids, options, false); }
function derive(base, generation, ids, { armorId = 'none', weaponId = 'club', weightKg = 70, acquired = [] } = {}, preview = false) { const selected = validateSelections(base, generation, ids, { preview }); const missing = mutationSlots(base, generation).length - selected.length; /* Mutations gained in play (radiation) sit outside the creation slots. */ for (const id of acquired) { const e = entries.find(x => x.id === id); if (e && !selected.includes(e)) selected.push(e); } /* Referee ruling: a Pure Strain Human who gains a mutation is a mutated humanoid from then on. */ if (base.species === 'psh' && selected.length) base = { ...base, species: 'humanoid' }; ids = selected.map(e => e.id); if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 100000)
    throw Error('Invalid body weight'); const armor = getArmor(armorId); if (armor.advanced)
    throw Error('Powered armor requires artifact implementation'); getWeapon(weaponId); const has = id => ids.includes(id), a = { ...base.attributes }; if (has('mental-27'))
    a.MS = 3; const e = { hitModifier: has('physical-47') ? -4 : 0, weaponExtraDice: has('physical-15') ? 2 : 0, nonPoweredExtraDice: has('physical-17') ? 3 : 0, poisonResistance: has('physical-12') ? 18 : a.CN, radiationResistance: Math.min(18, a.CN + (has('physical-12') ? 3 : 0)), mentalResistance: Math.min(18, a.MS + (has('mental-16') ? 4 : 0) + (has('mental-28') ? 4 : 0)), mentalDetectionRange: has('mental-28') ? 30 : null, artifactModifier: artifactIntelligenceModifier(a.IN) - (has('mental-16') ? 2 : 0) + (has('physical-30') ? 2 : 0) - (has('mental-14') && [3, 4].includes(generation.geniusRoll) ? 1 : 0), scientificGenius: has('mental-14') && [3, 4].includes(generation.geniusRoll), movementMultiplier: (has('physical-23') ? 2 : 1) * (has('physical-45') ? .75 : 1), attacksPerRound: has('physical-23') ? 2 : 1, hearingRange: has('physical-14') ? 60 : null, surpriseImmune: has('physical-14'), visionLimit: has('physical-47') ? 15 : null, partialCarapace: has('physical-32'), totalCarapace: has('physical-45'), doublePain: has('physical-6'), multipleDamage: has('mental-31'), hemophilia: has('physical-21'), poisonDefect: has('physical-29'), photosynthesis: has('physical-33'), regenerationPerDay: has('physical-38') ? Math.floor(weightKg / 5) : 0, mentalBlast: has('mental-24'), totalHealing: has('mental-47'), plantTemperature: has('plant-38'), synthetic: base.species === 'robot', plant: base.species === 'plant' }; const bonus = has('physical-12') ? 2 * a.CN : 0; const naturalAC = Math.min(base.armorClass, has('physical-13') || has('physical-45') ? 4 : has('physical-32') ? 6 : 10); const review = [...(base.reviewRequired ?? [])]; if (missing)
    review.unshift(`${missing} mutation/defect selection(s) still required; preview only`); if (base.species === 'plant')
    review.push('Experimental playable plant; daylight, ecology and plant physiology incomplete'); if (base.species === 'robot')
    review.push('Experimental robot PC; power and repair systems incomplete'); if (has('mental-46') && (a.IN !== 18 || !has('mental-16')))
    review.push('Time Field Manipulation requires IN 18 and Heightened Intelligence; reroll required'); if (new Set(ids).size !== ids.length)
    review.push('Duplicate mutation ruling'); for (const m of selected)
    if (mutationCoverage(m.id).status !== 'implemented')
        review.push(`${m.name}: ${mutationCoverage(m.id).status}`); if (has('physical-29') && has('physical-12'))
    review.push('Conflicting poison mutations'); if (has('mental-27') && (has('mental-16') || has('mental-28')))
    review.push('Conflicting mental resistance mutations'); return { ...base, schemaVersion: 2, attributes: { ...a }, hp: base.hp === 0 ? 0 : base.hp + bonus, maxHp: base.maxHp + bonus, armorClass: Math.min(naturalAC, armor.ac), naturalArmorClass: naturalAC, mutations: [...ids], equipment: { armorId, weaponId }, weightKg, effects: e, reviewRequired: review, selectionComplete: missing === 0, status: review.length ? 'draft' : 'local-ready', mutationEffectsApplied: 'partial', bleeding: false, totalHealingUses: [] }; }
export function characterMovement(c, meters, { dark = false } = {}) { if (!Number.isFinite(meters) || meters < 0)
    throw Error('Invalid distance'); return meters * c.effects.movementMultiplier * (dark && c.effects.photosynthesis ? .5 : 1); }
// Explicit damage context; no duplicate carapace reductions. Multipliers combine (prototype ruling).
export function receiveDamage(c, amount, { location = 'body', damageType = 'ordinary', damageDice = 0 } = {}) { integer(amount, 0, 100000, 'damage'); integer(damageDice, 0, 100000, 'damage dice'); const e = c.effects; let n = amount; if (n && e.plantTemperature && ['heat', 'cold', 'energy'].includes(damageType))
    n += 2 * damageDice; if (n && e.photosynthesis && ['heat', 'cold'].includes(damageType))
    n += damageDice; if ((e.totalCarapace || e.partialCarapace && ['back', 'head'].includes(location)))
    n = Math.floor(n / 2); if (e.doublePain)
    n *= 2; if (e.multipleDamage)
    n *= 2; return { ...c, hp: Math.max(0, c.hp - n), bleeding: c.bleeding || Boolean(n && e.hemophilia), lastDamage: n }; }
export function bleedingRound(c) { return c.hp > 0 && c.bleeding ? { ...c, hp: Math.max(0, c.hp - 2) } : { ...c }; }
export function bindWounds(c) { return { ...c, bleeding: false }; }
export function characterRest(c, days, { basking = false } = {}) { integer(days, 0, 100000); if (c.hp <= 0 || c.bleeding || c.species === 'robot')
    return { ...c }; const daily = (basking && c.effects.photosynthesis ? 4 : 1) + c.effects.regenerationPerDay; return { ...c, hp: Math.min(c.maxHp, c.hp + days * daily) }; }
export function characterHazard(c, kind, intensity, rng = Math.random) { if (kind === 'poison') {
    if (c.species === 'robot' || c.effects.poisonImmune)
        return { outcome: 'immune' };
    if (c.effects.poisonDefect)
        return { outcome: 'fatal-poison', antidoteWindowRounds: 2, requiresRuling: c.effects.poisonResistance === 18 && c.mutations.includes('physical-12') };
    return poison({ cn: c.effects.poisonResistance, intensity, rng });
} if (kind === 'radiation') {
    if (c.species === 'robot')
        return { outcome: 'referee-required', reason: 'Robot radiation tolerance depends on chassis; no biological mutation roll' };
    return radiation({ cn: c.effects.radiationResistance, intensity, rng });
} throw Error('Unknown hazard'); }
export function mentalBlast({ attacker, defender, distance, round, lastUsedRound = null, rng = Math.random }) { if (attacker.species === 'robot' || defender.species === 'robot')
    throw Error('Robots cannot participate in ordinary biological mental combat (prototype policy)'); if (!attacker.effects.mentalBlast)
    throw Error('Mental Blast not available'); integer(round, 1, 1000000); if (lastUsedRound !== null) {
    integer(lastUsedRound, 1, round);
    if (round - lastUsedRound < 2)
        throw Error('Mental Blast requires an intervening round');
} if (!Number.isFinite(distance) || distance < 0 || distance > 15)
    throw Error('Mental Blast out of range'); const result = mentalAttack({ attackerMS: attacker.attributes.MS, defenderMS: defender.effects?.mentalResistance ?? defender.attributes.MS, rng }); return { ...result, damage: result.hit ? dice(3, 6, rng) : 0, lastUsedRound: round }; }
// Rolling seven-day window is an explicit interpretation of the weekly limit.
export function totalHealing(c, gameSeconds) { integer(gameSeconds, 0, Number.MAX_SAFE_INTEGER, 'game time'); if (!c.effects.totalHealing || c.hp <= 0)
    throw Error('Total Healing unavailable'); const uses = c.totalHealingUses ?? []; if (uses.some(t => t > gameSeconds))
    throw Error('Game time cannot go backwards'); if (uses.length && gameSeconds - uses.at(-1) < 86400)
    throw Error('Total Healing requires 24 hours'); const recent = uses.filter(t => gameSeconds - t < 604800); if (recent.length >= 4)
    throw Error('Total Healing weekly limit reached'); return { ...c, hp: c.maxHp, totalHealingUses: [...recent, gameSeconds] }; }
// pp.9–11. Isolated effect resolution after target acquisition/hit adjudication.
// Contact/range and interval are enforced; caller owns encounter scheduling and hit rolls.
export const PHYSICAL_POWER_RULES = Object.freeze({
    'physical-7': Object.freeze({ interval: 1, contact: true, range: 0, dice: 3, type: 'electrical' }),
    'physical-10': Object.freeze({ interval: 3, range: 15, dice: 4, type: 'heat' }),
    'physical-37': Object.freeze({ interval: 4, range: 10, dice: 3, type: 'radiation' }),
    'physical-42': Object.freeze({ interval: 4, range: 10, dice: 3, type: 'sonic', area: true })
});
export function physicalPower({ attacker, mutationId, targets, round, lastUsedRound = null, rng = Math.random }) { const rule = PHYSICAL_POWER_RULES[mutationId]; if (!rule || !attacker.mutations.includes(mutationId) || attacker.hp <= 0)
    throw Error('Physical mutation unavailable'); integer(round, 1, 1000000, 'round'); if (lastUsedRound !== null) {
    integer(lastUsedRound, 1, round, 'last used');
    if (round - lastUsedRound < rule.interval)
        throw Error('Mutation requires more recovery time');
} if (!Array.isArray(targets) || (!rule.area && targets.length !== 1))
    throw Error('Invalid targets'); const seen = new Set(); for (const t of targets) {
    if (typeof t.id !== 'string' || !t.id || seen.has(t.id) || !Number.isFinite(t.distance) || t.distance < 0)
        throw Error('Invalid target');
    seen.add(t.id);
} const eligible = targets.filter(t => !t.self && t.distance <= rule.range && (!rule.contact || t.touching === true)); if (!rule.area && eligible.length !== 1)
    throw Error('Target out of range or contact'); const roll = dice(rule.dice, 6, rng); return { mutationId, lastUsedRound: round, rolled: roll, results: eligible.map(t => ({ id: t.id, type: rule.type, ...(rule.type === 'radiation' ? { intensity: roll } : { damage: roll, damageDice: rule.dice }) })) }; }

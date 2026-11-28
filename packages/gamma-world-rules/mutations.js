import { die, integer } from './index.js';
// Printed pp.9,11. Upper endpoints preserve separate human/animal weights.
const physical = 'Attraction Odor|Body Structure Change|Chameleon Powers|Density Control|Diminished Sense|Double Physical Pain|Electrical Generation|Fat Cell Accumulation|Gas Generation - Musk|Heat Generation|Heightened Balance|Heightened Constitution|Heightened Dexterity|Heightened Hearing|Heightened Precision|Heightened Smell|Heightened Strength|Heightened Taste|Heightened Touch|Heightened Vision|Hemophilia|Increased Metabolism|Increased Speed|Infravision|Light Generation|Multiple Body Parts|New Body Parts|No Resistance to Bacteria|No Resistance to Poison|No Sensory Nerve Endings|Oversized Body Parts|Partial Carapace|Photosynthetic Skin|Physical Reflection|Poor Respiratory System|Quills/Spines|Radiated Eyes|Regeneration|Shapechange|Shorter|Skin Structure Change|Sonic Attack Ability|Symbiotic Attachment|Taller|Total Carapace|Ultravision|Vision Defect|Weight Decrease|Wings';
const mental = 'Absorption|Anti-reflection|Complete Mental Block|Cryokinesis|Death Field Generation|De-evolution|Density Control (others)|Directional Sense|Dual Brain|Empathy|Epilepsy|Fear Impulse|Force Field Generation|Genius Capability|Heightened Brain Talent|Heightened Intelligence|Hostility Field|Illusion Generation|Intuition|Life Leech|Light Wave Manipulation|Magnetic Control|Mass Mind|Mental Blast|Mental Control|Mental Control over Physical State|Mental Defenselessness|Mental Defense Shield|Molecular Disruption|Molecular Understanding|Multiple Damage|Planar Travel|Poor Dual Brain|Precognition|Pyrokinesis|Radar/Sonar|Reflection|Repulsion Field|Sound Imitation|Telekinesis|Telekinetic Arm|Telekinetic Flight|Telepathy|Teleportation|Thought Imitation|Time Field Manipulation|Total Healing|Weather Manipulation|Will Force';
function catalog(kind, names, h, a, defects) { return Object.freeze(names.split('|').map((name, i) => Object.freeze({ id: `${kind}-${i + 1}`, kind, name, number: i + 1, defect: defects.includes(i + 1), human: [i ? h[i - 1] + 1 : 1, h[i]], animal: [i ? a[i - 1] + 1 : 1, a[i]], status: 'catalog-only' }))); }
export const PHYSICAL = catalog('physical', physical, [2, 4, 5, 6, 8, 10, 12, 14, 16, 17, 18, 22, 23, 24, 25, 26, 32, 33, 34, 35, 37, 39, 42, 43, 44, 46, 51, 53, 55, 57, 58, 59, 61, 62, 64, 65, 67, 69, 70, 74, 76, 77, 78, 83, 84, 85, 87, 89, 90], [2, 3, 6, 7, 8, 9, 11, 12, 13, 14, 15, 21, 22, 23, 24, 25, 29, 32, 33, 34, 36, 37, 39, 41, 42, 45, 47, 48, 49, 51, 52, 56, 60, 61, 62, 63, 64, 67, 68, 71, 72, 73, 74, 82, 83, 86, 87, 88, 90], [1, 2, 5, 6, 8, 21, 22, 28, 29, 30, 35, 41, 47, 48]);
export const MENTAL = catalog('mental', mental, [1, 2, 6, 7, 8, 10, 11, 12, 13, 14, 18, 22, 25, 26, 31, 41, 45, 46, 47, 52, 53, 54, 55, 58, 59, 60, 62, 63, 64, 66, 69, 70, 73, 74, 75, 76, 77, 78, 79, 82, 83, 84, 85, 86, 87, 88, 89, 90, 95], [1, 2, 4, 5, 6, 9, 10, 13, 14, 15, 18, 20, 24, 25, 28, 43, 44, 45, 49, 52, 53, 54, 55, 56, 57, 58, 61, 66, 67, 68, 71, 72, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 95], [2, 3, 11, 12, 17, 27, 31, 33]);
// pp.15–17: original NPC plant table. Playable plants are a campaign extension.
const plantNames = 'Adaptation|Aromatic Powers|Attraction Odor|Bacterial Symbiosis|Barbed Leaves|Berries|Boring Tendrils|Carnivorous Jaws|Color Sensitivity and Imitation|Contact Poison Sap|Daylight Stasis|Dissolving Juices|Divisional Body Segments|Electrical Generation|Explosive and/or Radiated Fruit or Seeds|Heat Generation|Increased Senses|Low Fertility|Manipulation Vines|Mobility|New Plant Parts|New Senses|Parasitic Attachment|Physical Reflection|Poison Throwing Thorns|Poison Vines|Radiated Plant Fiber|Razor-edged Leaves|Saw-edged Leaves|Seed Mobility|Size Decrease|Size Increase|Sonic Attack Ability|Squeeze Vines/Roots|Spore Cloud and/or Shooting Seeds|Sucker Vines|Tangle Vines|Temperature Sensitivity|Texture Change|Thorns/Spines|Throwing Thorns|Wings/Gas Bag';
const plantEnds = [1, 5, 7, 8, 9, 10, 13, 15, 17, 19, 21, 24, 25, 26, 28, 29, 30, 32, 34, 39, 46, 54, 55, 56, 58, 60, 66, 68, 70, 71, 72, 82, 83, 85, 87, 88, 90, 91, 92, 94, 96, 97];
export const PLANT = Object.freeze(plantNames.split('|').map((name, i) => Object.freeze({ id: `plant-${i + 1}`, kind: 'plant', name, number: i + 1, defect: [3, 11, 18, 38].includes(i + 1), plant: [i ? plantEnds[i - 1] + 1 : 1, plantEnds[i]], status: 'catalog-only' })));
export function mutationResult(kind, species, roll) { integer(roll, 1, 100); if (kind === 'plant' && species === 'plant') {
    const entry = PLANT.find(m => roll >= m.plant[0] && roll <= m.plant[1]);
    return entry ? { type: 'mutation', entry } : roll < 100 ? { type: 'extra-mutation' } : { type: 'choice' };
} if (!['physical', 'mental'].includes(kind) || !['humanoid', 'animal'].includes(species))
    throw new RangeError('mutation category/species'); const list = kind === 'physical' ? PHYSICAL : MENTAL; const entry = list.find(m => { const [lo, hi] = m[species === 'animal' ? 'animal' : 'human']; return roll >= lo && roll <= hi; }); return entry ? { type: 'mutation', entry } : roll <= (kind === 'physical' ? 94 : 99) ? { type: 'good-reroll' } : { type: 'choice' }; }
export function rollMutation(kind, species, rng = Math.random) { let good = false; for (let i = 0; i < 1000; i++) {
    const roll = die(100, rng), r = mutationResult(kind, species, roll);
    if (r.type === 'good-reroll') {
        good = true;
        continue;
    }
    if (good && r.entry?.defect)
        continue;
    return { ...r, roll, goodOnly: good };
} throw new Error('Mutation reroll limit reached'); }
export function selectedDefects(counts) { const p = integer(counts.physical, 1, 4), m = integer(counts.mental, 1, 4); return { physical: p >= 3 ? 1 : 0, mental: m >= 3 ? 1 : 0, refereeChoice: p === 2 && m === 2 ? 1 : 0 }; }
export function mutationDraft(character, method = 'random', rng = Math.random) { if (!['random', 'selected'].includes(method))
    throw new RangeError('mutation method'); if (['psh', 'robot'].includes(character.species))
    return { method, slots: [], defects: null }; const slots = []; if (character.species === 'plant') {
    let remaining = integer(character.mutationCounts.plant, 1, 4), extra = 0;
    while (remaining > 0) {
        if (method === 'selected') {
            slots.push({ kind: 'plant', type: 'choice', goodOnly: true });
            remaining--;
            continue;
        }
        const roll = rollMutation('plant', 'plant', rng);
        if (roll.type === 'extra-mutation') {
            if (++extra > 20)
                throw Error('Plant bonus roll limit reached');
            remaining++;
            continue;
        }
        slots.push({ kind: 'plant', ...roll });
        remaining--;
    }
    return { method, slots, extra, defects: null };
} for (const kind of ['physical', 'mental'])
    for (let i = 0; i < character.mutationCounts[kind]; i++)
        slots.push({ kind, ...(method === 'random' ? rollMutation(kind, character.species, rng) : { type: 'choice', goodOnly: true }) }); return { method, slots, defects: method === 'selected' ? selectedDefects(character.mutationCounts) : null }; }
// One source of truth for both UI and validation, including referee defect slots.
function rawMutationSlots(base, generation) { if (!Array.isArray(generation?.slots) || !['random', 'selected'].includes(generation.method))
    throw Error('Invalid mutation generation'); const slots = [...generation.slots]; if (['psh', 'robot'].includes(base.species)) {
    if (slots.length)
        throw Error('This character type cannot have mutations');
    return slots;
} if (base.species === 'plant') {
    const n = integer(base.mutationCounts?.plant, 1, 4), extra = integer(generation.extra ?? 0, 0, 20);
    if (slots.length !== n + (generation.method === 'random' ? extra : 0) || slots.some(s => s.kind !== 'plant'))
        throw Error('Plant mutation count mismatch');
    if (generation.method === 'selected' && n >= 3)
        slots.push({ kind: 'plant', type: 'choice', defectOnly: true });
    return slots;
} for (const kind of ['physical', 'mental']) {
    integer(base.mutationCounts?.[kind], 1, 4);
    if (slots.filter(s => s.kind === kind).length !== base.mutationCounts[kind])
        throw Error('Mutation count mismatch');
} if (slots.length !== base.mutationCounts.physical + base.mutationCounts.mental)
    throw Error('Invalid slot category'); if (generation.method === 'selected') {
    const d = selectedDefects(base.mutationCounts);
    for (const kind of ['physical', 'mental'])
        for (let i = 0; i < d[kind]; i++)
            slots.push({ kind, type: 'choice', defectOnly: true });
    if (d.refereeChoice)
        slots.push({ kind: 'either', type: 'choice', defectOnly: true });
} return slots; }
// New workshop records have persistent referee-assigned defects. Legacy drafts retain their assignments.
export function assignWorkshopDefects(base, generation, rng = Math.random) {
    const next = structuredClone(generation);
    next.strictSelections = true;
    if (['humanoid', 'animal'].includes(base.species))
        next.geniusRoll = die(6, rng);
    next.refereeDefects = mutationSlots(base, next).filter(s => s.defectOnly).map(s => {
        const choices = (s.kind === 'either' ? [...PHYSICAL, ...MENTAL] : s.kind === 'physical' ? PHYSICAL : s.kind === 'mental' ? MENTAL : PLANT).filter(e => e.defect);
        return choices[die(choices.length, rng) - 1].id;
    });
    return next;
}
export function mutationSlots(base, generation) { let i = 0; return rawMutationSlots(base, generation).map(s => { if (!s.defectOnly || !generation.refereeDefects)
    return s; const id = generation.refereeDefects[i++], entry = [...PHYSICAL, ...MENTAL, ...PLANT].find(e => e.id === id && e.defect && (e.kind === s.kind || s.kind === 'either' && e.kind !== 'plant')); if (!entry)
    throw Error('Missing or invalid referee defect assignment'); return { ...s, entry }; }); }

// RADIATION MATRIX text: M is "a new mutation (roll for one randomly on either the physical or mental mutations
// chart)"; D is a 20% chance of "a mutational defect (determine randomly)". Policies: the chart is chosen by a coin
// toss; plants roll on the plant chart; a result already held, a free choice or an extra roll is rerolled; a defect
// is drawn evenly from the chart's defects. Pure Strain Humans and robots have no chart here: returns null.
export function radiationMutation(species, kind, held = [], rng = Math.random) {
    if (!['humanoid', 'animal', 'plant'].includes(species)) return null;
    const have = new Set(held), chart = species === 'plant' ? 'plant' : die(2, rng) === 1 ? 'physical' : 'mental';
    if (kind === 'defect') {
        const list = (chart === 'plant' ? PLANT : chart === 'physical' ? PHYSICAL : MENTAL).filter(m => m.defect && !have.has(m.id));
        return list.length ? list[die(list.length, rng) - 1] : null;
    }
    for (let i = 0; i < 200; i++) {
        const r = chart === 'plant' ? mutationResult('plant', 'plant', die(100, rng)) : mutationResult(chart, species, die(100, rng));
        if (r.type === 'mutation' && !have.has(r.entry.id)) return r.entry;
    }
    return null;
}

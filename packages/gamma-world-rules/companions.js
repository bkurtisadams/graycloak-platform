// Followers and hirelings (CHARISMA). Followers serve out of loyalty and are limited by the leader's Charisma;
// hirelings serve for pay and are not limited. The CHARISMA TABLE gives maximum followers, morale adjustment and
// reaction adjustment; CHARISMA TABLE MODIFIERS change all three when leader and non-player character differ in type.
import { die, dice, charisma, generateCharacter, mutationDraft, deriveCharacter } from './index.js';
import { reactionLabel } from './encounter.js';

// Rows are the player character's type, columns the non-player character's: [followers, morale, reaction].
export const TYPE_MODIFIERS = Object.freeze({
    psh: { psh: [0, 0, 0], humanoid: [-2, -1, -1], animal: [-3, -1, -1] },
    humanoid: { psh: [-2, -1, -1], humanoid: [0, 0, 0], animal: [-2, -1, -1] },
    animal: { psh: [-3, -2, -2], humanoid: [-2, -2, -1], animal: [0, 0, 0] },
});
// Types the table does not list (plants, robots) are read with no type modifier: referee policy.
export function leadership(character, npcType) {
    const base = charisma(Math.min(18, Math.max(3, character.attributes.CH))), [f, m, r] = TYPE_MODIFIERS[character.species]?.[npcType] ?? [0, 0, 0];
    return { followers: Math.max(0, base.followers + f), morale: base.morale + m, reaction: base.reaction + r };
}
// REACTION TABLE: 2d6, the leader's adjustment, and at most a point or two for an offer.
export function recruitReaction(character, npcType, offer = 0, rng = Math.random) {
    const rolled = dice(2, 6, rng), modifier = leadership(character, npcType).reaction + offer, score = Math.min(12, Math.max(2, rolled + modifier));
    return { rolled, modifier, score, label: reactionLabel(score), outcome: recruitOutcome(score) };
}
// What the reaction means for someone asked to come along. The table gives the words; reading "enthusiastic, loyal"
// as a follower and "friendly, helpful" as willing to hire on is automated-referee policy. Hostile results end it
// (the table's footnote); uncertain allows another offer.
export const recruitOutcome = score => score >= 12 ? 'follower' : score >= 9 ? 'hireling' : score >= 6 ? 'uncertain' : 'refused';
export const canLead = (character, npcType, followersNow) => followersNow < leadership(character, npcType).followers;

const WEAPONS = ['spear', 'club', 'short-sword', 'hand-axe', 'long-sword', 'mace'], ARMOR = ['none', 'shield', 'skins', 'skins-shield', 'hide'];
// A non-player character rolled the way a player character is (3d6 attributes, rolled mutations), armed at random
// from primitive gear. Equipment is referee policy. Mutation rolls that need a player's choice are rolled again.
export function generateCompanion({ species = 'animal', stock = '', name = '', rng = Math.random } = {}) {
    for (let i = 0; i < 50; i++) {
        const base = generateCharacter({ species, name, animalStock: species === 'animal' ? stock : '', method: '3d6', rng }), draft = mutationDraft(base, 'random', rng);
        const ids = draft.slots.map(s => s.entry?.id ?? null);
        if (ids.some(id => !id) || new Set(ids).size !== ids.length) continue;
        try { return deriveCharacter(base, draft, ids, { weaponId: WEAPONS[die(WEAPONS.length, rng) - 1], armorId: ARMOR[die(ARMOR.length, rng) - 1] }); }
        catch { /* an armour or mutation combination the rules reject: roll another */ }
    }
    throw Error('Could not generate a companion');
}

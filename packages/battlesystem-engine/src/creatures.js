// creatures.js v1.0.0 - 2026-03-15
// Special Creature Abilities [13.0]

export class BattlesystemCreatures {

    // =========================================================================
    // [13.1] COMBAT BONUSES AND PENALTIES
    // =========================================================================

    /**
     * Apply creature-specific damage adjustment per [13.1].
     * Each +/- equals 1 CRT column shift per attacking figure.
     * AR/AC adjustments apply before dice roll.
     * Damage adjustments apply after dice roll as column shifts.
     *
     * @param {number} damageBonus — creature damage bonus (e.g., +1 vs certain targets)
     * @returns {number} — CRT column shifts to apply
     */
    static getDamageColumnShift(damageBonus) {
        return parseInt(damageBonus) || 0;
    }

    // =========================================================================
    // [13.2] POISON
    // =========================================================================

    /**
     * Calculate poison extra damage as CRT column shifts per [13.2].
     * Uses same dice roll as conventional attack.
     * No saving throw in BATTLESYSTEM.
     *
     * @param {string} strength — 'weak', 'normal', 'strong'
     * @returns {{ columnShifts, description }}
     */
    static getPoisonDamage(strength = 'normal') {
        switch ((strength || 'normal').toLowerCase()) {
            case 'weak':
                return { columnShifts: 1, description: 'Weak poison: +1 column shift (save bonus)' };
            case 'strong':
                return { columnShifts: 3, description: 'Strong poison: +3 column shifts (save penalty)' };
            case 'normal':
            default:
                return { columnShifts: 2, description: 'Poison: +2 column shifts (no save in BS)' };
        }
    }

    // =========================================================================
    // [13.3] INVULNERABILITY
    // =========================================================================

    /**
     * Check if unit triggers invulnerability morale check per [13.3].
     * At end of Melee Phase, unit in contact with unharmable enemy must check.
     */
    static checkInvulnerabilityMorale(unitCanHarmTarget) {
        if (!unitCanHarmTarget) {
            return {
                mustCheck: true,
                description: 'In contact with creature unit cannot harm — immediate Morale Check [13.3]'
            };
        }
        return { mustCheck: false };
    }

    // =========================================================================
    // [13.4] PARALYSIS
    // =========================================================================

    /**
     * Resolve paralysis attack per [13.4].
     * Any damage from paralyzing creature paralyzes all enemy in base-to-base contact.
     * Fractional damage paralyzes entire figure.
     * If creature's only attack is paralysis (no conventional damage), use D4 column.
     *
     * @param {boolean} onlyParalysis — creature has no conventional damage, only paralyze
     * @returns {{ useDiceColumn, fractionalParalyzes, description }}
     */
    static getParalysisRules(onlyParalysis = false) {
        return {
            useDiceColumn: onlyParalysis ? 'D4' : null,
            fractionalParalyzes: true,
            neverCausesWounds: true,
            savingThrow: 'Individual figure gets save if any damage affects it (if save allowed)',
            description: onlyParalysis
                ? 'Paralysis only: use D4 column. Any fractional damage paralyzes entire figure.'
                : 'Paralysis on touch: any damage paralyzes all enemy in base-to-base contact. Fractional damage paralyzes entire figure.'
        };
    }

    // =========================================================================
    // [13.5] LEVEL DRAINING
    // =========================================================================

    /**
     * Get level drain combat effects per [13.5].
     * Double damage in melee.
     * Immediate Morale Check with -2 at end of Melee Phase.
     */
    static getLevelDrainEffects() {
        return {
            damageMultiplier: 2,
            moraleCheckAtEndOfMelee: true,
            moralePenalty: -2,  // in addition to the -3 from Table 4 (undeadContact)
            description: 'Level drain: double damage in melee. Morale check at end of Melee Phase.'
        };
    }

    // =========================================================================
    // [13.6] AWE AND FEAR (AD&D only)
    // =========================================================================

    /**
     * Check awe/fear effects per [13.6].
     * All affected units within 12" must make immediate Morale Check.
     *
     * @param {string} sourceType — 'dragon', 'demon', 'devil', 'deity', 'illusion', 'other'
     * @param {number} sourceHD — HD of the creature
     * @param {number} sourceCha — Charisma (for deities)
     * @returns {{ range, moraleMod, autoStun, description }}
     */
    static getAweFearEffect(sourceType, sourceHD = 0, sourceCha = 0) {
        // Divine awe: god/demigod with CHA 19+ = auto-stun, no save
        if (sourceType === 'deity' && sourceCha >= 19) {
            return {
                range: Infinity,
                moraleMod: 0,
                autoStun: true,
                affectsBothSides: true,
                noSave: true,
                description: 'Divine Awe: all forces in sight on both sides stunned while deity present. No saving throw.'
            };
        }

        let moraleMod = 0;
        if (sourceType === 'dragon' || sourceHD >= 12) moraleMod = -1;
        if (sourceType === 'illusion') moraleMod = +1;

        return {
            range: 12,
            moraleMod,
            autoStun: false,
            affectsBothSides: false,
            noSave: false,
            description: `Awe/Fear: all affected units within 12" make Morale Check (modifier: ${moraleMod >= 0 ? '+' : ''}${moraleMod})`
        };
    }

    // =========================================================================
    // [13.7] BREATH WEAPONS
    // =========================================================================

    /**
     * Get breath weapon rules per [13.7].
     * Damage calculated per [14.5].
     * Range from monster description. AoE per [14.2].
     * Can be used as split-fire or pass-through fire.
     */
    static getBreathWeaponRules() {
        return {
            timing: 'Missile and Magic Phase',
            canSplitFire: true,
            canPassThrough: true,
            damageCalc: 'Per [14.5] magical artillery damage calculation',
            rangeSource: 'Official monster description',
            aoeConversion: 'Per [14.2] area of effect table',
            note: 'Range from monster description, AoE converted per Table 17'
        };
    }

    // =========================================================================
    // [13.8] REGENERATION
    // =========================================================================

    /**
     * Check regeneration status per [13.8].
     * 2 rounds without combat removes 1 Wound marker.
     * Dead regenerating creature: place 2nd Wound marker, leave on field.
     * 2 rounds later, remove 1 Wound → fights normally.
     * Enemy within 1" prevents regeneration (1 enemy blocks up to 2 creatures).
     *
     * @param {number} roundsSinceCombat — rounds since last combat
     * @param {boolean} isDead — was the figure killed
     * @param {boolean} enemyWithin1Inch — enemy figure within 1"
     * @returns {{ canRegenerate, action, description }}
     */
    static checkRegeneration(roundsSinceCombat, isDead = false, enemyWithin1Inch = false) {
        if (enemyWithin1Inch) {
            return {
                canRegenerate: false,
                action: 'blocked',
                description: 'Regeneration blocked: enemy figure within 1".'
            };
        }

        if (roundsSinceCombat < 2) {
            return {
                canRegenerate: false,
                action: 'waiting',
                roundsRemaining: 2 - roundsSinceCombat,
                description: `Regenerating: ${2 - roundsSinceCombat} round(s) remaining.`
            };
        }

        if (isDead) {
            return {
                canRegenerate: true,
                action: 'revive',
                description: 'Regeneration complete: remove 1 Wound marker. Figure can move and fight normally.'
            };
        }

        return {
            canRegenerate: true,
            action: 'heal',
            description: 'Regeneration complete: remove 1 Wound marker.'
        };
    }

    /**
     * Damage types that prevent regeneration per [13.8].
     */
    static preventsRegeneration(damageType) {
        const blocked = ['fire', 'acid'];
        return blocked.includes((damageType || '').toLowerCase());
    }

    // =========================================================================
    // [13.9] UNDEAD AND MINDLESS CREATURES
    // =========================================================================

    /**
     * Get undead/mindless behavior rules per [13.9].
     * Must be in command to move or fight.
     * Never check morale or discipline (but must have ML calculated).
     * OOC: continues last order regardless of circumstances.
     */
    static getUndeadMindlessRules() {
        return {
            requiresCommandToAct: true,
            neverCheckMorale: true,
            neverCheckDiscipline: true,
            mustCalculateMorale: true,
            outOfCommandBehavior: 'Continues last order (move, fight, pursue, halt) regardless of circumstances',
            selfDestructRisk: 'Will fight friendlies, walk off table/cliff/into river if command not reestablished',
            lastOrders: ['move', 'fight', 'pursue', 'halt']
        };
    }

    /**
     * Check if a mindless undead unit should self-destruct.
     * Called when unit is out of command and following its last order.
     * @param {string} lastOrder — 'move', 'fight', 'pursue', 'halt'
     * @param {boolean} friendlyInPath — would collide with friendly unit
     * @param {boolean} hazardInPath — cliff, river, table edge in path
     */
    static checkMindlessSelfDestruct(lastOrder, friendlyInPath = false, hazardInPath = false) {
        if (lastOrder === 'halt') {
            return { selfDestructs: false, description: 'Halted — remains in place.' };
        }
        if (friendlyInPath) {
            return {
                selfDestructs: false,
                attacksFriendly: true,
                description: 'Mindless undead attacks friendly unit in its path.'
            };
        }
        if (hazardInPath) {
            return {
                selfDestructs: true,
                description: 'Mindless undead walks into hazard — destroyed.'
            };
        }
        return { selfDestructs: false, description: 'Continues following last order.' };
    }
}

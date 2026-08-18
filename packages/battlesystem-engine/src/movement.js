// movement.js v1.1.1 - 2026-08-16
// v1.1.1: Block voluntary Movement actions after a failed declared wheel commits
//         the unit to no further action for the phase under [7.7].
// v1.1.0: Permit a mob with a valid standing Force March order to use [7.13],
//         despite mobs always suffering Out of Command penalties [2.10].
// Movement rules: routing [7.15], fighting withdrawal [7.12], flee [8.8], forced march [7.13]

import { BattlesystemMorale } from './morale.js';

export class BattlesystemMovement {

    // =========================================================================
    // [7.15] ROUTING
    // =========================================================================

    /**
     * Calculate rout movement distance per [7.15].
     * Routing unit moves MV + 1/3 MV away from enemy.
     */
    static getRoutMovement(movementRate) {
        const mv = parseInt(movementRate) || 12;
        return mv + Math.floor(mv / 3);
    }

    /**
     * Process a routing unit's movement phase per [6.4] and [7.15].
     * Called during Movement Phase for units with isRouting=true that were not rallied.
     * Returns actions the GM should take (move token, check friendlies, remove if off-table).
     */
    static processRoutMovement(bsFlags) {
        const mv = parseInt(bsFlags.movementRate) || 12;
        const routMV = this.getRoutMovement(mv);
        const name = bsFlags.unitName || '?';

        return {
            routDistance: routMV,
            normalMV: mv,
            direction: 'Away from cause of rout, toward own lines if possible',
            facing: 'Back to enemy',
            canMove: false,     // [6.4] cannot voluntarily move
            canShoot: false,    // [6.4] cannot shoot
            canMelee: false,    // [6.4] cannot engage in melee
            ifAttacked: {
                takeDamage: true,
                autoRoutAgain: true,  // [6.4] automatically routs again
                extraMove: true,      // exception to one-move-per-round rule
                description: `If attacked, ${name} takes damage and automatically routs again ${routMV}" away.`
            },
            description: `${name} continues routing ${routMV}" (MV ${mv} + ${Math.floor(mv / 3)}) away from enemy, back to enemy.`
        };
    }

    /**
     * Check if routing unit hits a friendly unit per [7.15].
     * The friendly unit must make an immediate Morale Check.
     * Returns the cascade check info.
     */
    static getRoutCascadeInfo() {
        return {
            friendlyMustCheckMorale: true,
            ifFriendlyRouts: 'Moves ahead of the routing unit that forced the check',
            ifFriendlyHolds: 'Routing unit breaks around, reforms on other side, continues movement',
            skirmishPassThrough: 'Can pass through skirmish formation, but skirmish unit must still check morale'
        };
    }

    /**
     * Check if a routing unit is surrounded and destroyed per [7.15].
     * @param {boolean} completelySurrounded — all passable terrain blocked by enemy closed/open formation
     * @param {boolean} hasGap — 1"+ gap of passable terrain for single figure
     */
    static checkSurroundedRout(completelySurrounded, hasGap) {
        if (completelySurrounded && !hasGap) {
            return { destroyed: true, description: 'Routing unit is completely surrounded — automatically destroyed and removed from play.' };
        }
        if (completelySurrounded && hasGap) {
            return { destroyed: false, escapesThroughGap: true, description: 'Entire unit entitled to rout through gap. No figure can exceed rout movement rate.' };
        }
        return { destroyed: false, escapesThroughGap: false };
    }

    /**
     * Check if routing unit has left the table per [6.4] / [7.15].
     */
    static checkOffTable() {
        return { removed: true, description: 'Routed off the table — permanently removed from play.' };
    }

    // =========================================================================
    // [7.12] FIGHTING WITHDRAWAL
    // =========================================================================

    /**
     * Check if a unit can make a fighting withdrawal per [7.12].
     */
    static canFightingWithdrawal(bsFlags) {
        if (bsFlags.movementActionCommittedThisPhase) {
            return { can: false, reason: 'A declared Movement action is already committed for this phase [7.7].' };
        }
        const mv = parseInt(bsFlags.movementRate) || 12;
        if (mv < 3) {
            return { can: false, reason: `Movement rate must be at least 3" (currently ${mv}").` };
        }
        if (!bsFlags.inMeleeContact) {
            return { can: false, reason: 'Must be in base-to-base contact with enemy.' };
        }
        if (bsFlags.isRouting) {
            return { can: false, reason: 'Cannot withdraw while routing.' };
        }
        if (bsFlags.outOfCommand) {
            return { can: false, reason: 'Cannot fighting withdraw — unit is out of command [4.7].' };
        }
        return { can: true, reason: '' };
    }

    /**
     * Execute fighting withdrawal per [7.12].
     * Returns the withdrawal details and enemy options.
     * @param {object} bsFlags — withdrawing unit flags
     * @param {object} enemyFlags — enemy unit flags (for discipline check determination)
     */
    static executeFightingWithdrawal(bsFlags, enemyFlags = {}) {
        const withdrawDistance = 3; // always 3"
        const enemyMustCheckDiscipline = BattlesystemMorale.pursuerRequiresDisciplineCheck(enemyFlags);

        return {
            distance: withdrawDistance,
            cannotContactEnemy: true, // cannot end in base-to-base with another enemy
            enemyOptions: {
                canAdvance: true,
                advanceDistance: withdrawDistance,  // enemy can advance 3" even if already used full MV
                canRemainInPlace: true,
                remainPenalty: 'Cannot charge the withdrawn unit for remainder of Game Round',
                mustCheckDiscipline: enemyMustCheckDiscipline,
                disciplineFailure: 'Automatically advances to continue melee'
            },
            description: `Withdraws ${withdrawDistance}" backward, away from enemy.`
        };
    }

    // =========================================================================
    // [8.8] FLEE
    // =========================================================================

    /**
     * Check if a unit can flee a melee per [8.8].
     */
    static canFlee(bsFlags) {
        if (bsFlags.movementActionCommittedThisPhase) {
            return { can: false, reason: 'A declared Movement action is already committed for this phase [7.7].' };
        }
        if (!bsFlags.inMeleeContact) {
            return { can: false, reason: 'Must be in melee contact to flee.' };
        }
        if (bsFlags.isRouting) {
            return { can: false, reason: 'Already routing.' };
        }
        return { can: true, reason: '' };
    }

    /**
     * Execute flee per [8.8].
     * About face (no MV cost), move full MV away.
     * Enemy gets one free attack at -2 to hit (attacking from behind).
     * Fleeing unit cannot fight back but must check morale for losses.
     */
    static executeFlee(bsFlags) {
        const mv = parseInt(bsFlags.movementRate) || 12;

        return {
            aboutFaceCost: 0,   // no movement cost for about face when fleeing
            fleeDistance: mv,   // full movement rate
            canFightBack: false,
            mustCheckMorale: true, // for any losses taken from free attack
            enemyFreeAttack: {
                attacks: 1,
                arBonus: -2,      // bonus to hit (attacking from behind)
                description: 'Enemy gets one free attack at -2 AR (attacking from behind)'
            },
            description: `${bsFlags.unitName || '?'} flees! About face (no cost), moves ${mv}" away from enemy.`
        };
    }

    // =========================================================================
    // [7.13] FORCED MARCH
    // =========================================================================

    /**
     * Check if a unit can forced march per [7.13].
     */
    static canForcedMarch(bsFlags) {
        if (bsFlags.movementActionCommittedThisPhase) {
            return { can: false, reason: 'A declared Movement action is already committed for this phase [7.7].' };
        }
        if (bsFlags.isRouting) {
            return { can: false, reason: 'Cannot forced march while routing.' };
        }
        const orderedMob = bsFlags.unitType === 'mob' && bsFlags.mobOrder?.type === 'forcedMarch';
        if (bsFlags.outOfCommand && bsFlags.unitType !== 'individual' && !orderedMob) {
            return { can: false, reason: 'Must be in command to forced march (individuals and properly ordered mobs excepted).' };
        }
        if (bsFlags.inMeleeContact) {
            return { can: false, reason: 'Cannot be in base-to-base contact during any part of forced march.' };
        }
        return { can: true, reason: '' };
    }

    /**
     * Get forced march distances per [7.13].
     */
    static getForcedMarchDistance(movementRate) {
        const mv = parseInt(movementRate) || 12;
        return {
            normalMV: mv,
            forcedMarchMV: Math.floor(mv * 1.5)
        };
    }

    /**
     * Apply forced march AR penalty per [7.13].
     * After forced march, unit must make Morale Check.
     * Failure: AR worsens by 1 (accumulates).
     * Recovery: AR improves by 1 per Game Round of no activity and no attacks (up to original).
     * @param {boolean} moralePassed — did the morale check succeed?
     * @param {number} currentARPenalty — current accumulated AR penalty from prior forced marches
     * @returns {object} — { newARPenalty, description }
     */
    static applyForcedMarchPenalty(moralePassed, currentARPenalty = 0) {
        if (moralePassed) {
            return {
                newARPenalty: currentARPenalty,
                description: 'Morale check passed — no additional AR penalty.'
            };
        }
        const newPenalty = currentARPenalty + 1;
        return {
            newARPenalty: newPenalty,
            description: `Morale check failed — AR worsens by 1 (total penalty: +${newPenalty}).`
        };
    }

    /**
     * Recover forced march AR penalty per [7.13].
     * Unit spends entire Game Round doing nothing and is not attacked.
     * @param {number} currentARPenalty
     * @returns {object}
     */
    static recoverForcedMarchPenalty(currentARPenalty = 0) {
        if (currentARPenalty <= 0) {
            return { newARPenalty: 0, description: 'No forced march penalty to recover.' };
        }
        const newPenalty = currentARPenalty - 1;
        return {
            newARPenalty: newPenalty,
            description: `AR improves by 1 after rest (remaining penalty: +${newPenalty}).`
        };
    }

    // =========================================================================
    // [7.9] FACING CHANGES — movement costs
    // =========================================================================

    /**
     * Calculate movement cost for facing changes per [7.9].
     * @param {string} changeType — 'rightFace', 'leftFace', 'aboutFace', 'wheel'
     * @param {number} movementRate — unit MV
     * @param {number} wheelDistance — distance moved by outermost figure (wheel only)
     */
    static getFacingChangeCost(changeType, movementRate, wheelDistance = 0) {
        const mv = parseInt(movementRate) || 12;
        switch (changeType) {
            case 'rightFace':
            case 'leftFace':
                return { cost: Math.floor(mv / 3), description: `Right/Left Face: ${Math.floor(mv / 3)}" (1/3 MV)` };
            case 'aboutFace':
                return { cost: Math.floor(mv / 2), description: `About Face: ${Math.floor(mv / 2)}" (1/2 MV)` };
            case 'wheel':
                return { cost: wheelDistance, description: `Wheel: ${wheelDistance}" (distance of outermost figure)` };
            default:
                return { cost: 0, description: 'No cost' };
        }
    }

    // =========================================================================
    // [7.10] FRONTAGE CHANGE — movement cost
    // =========================================================================

    /**
     * Calculate movement cost for frontage change per [7.10].
     * @param {number} figuresChanged — figures added or subtracted from frontage
     */
    static getFrontageChangeCost(figuresChanged) {
        const cost = Math.abs(parseInt(figuresChanged) || 0);
        return { cost, description: `Frontage change: ${cost}" (1" per figure added/removed)` };
    }

    // =========================================================================
    // [7.6] FORMATION CHANGE — movement cost
    // =========================================================================

    /**
     * Calculate movement cost for formation change per [7.6].
     * Voluntary = 1/3 MV. Involuntary (rout, OOC) = 0.
     */
    static getFormationChangeCost(movementRate, involuntary = false) {
        if (involuntary) return { cost: 0, description: 'Involuntary formation change — no cost' };
        const mv = parseInt(movementRate) || 12;
        const cost = Math.floor(mv / 3);
        return { cost, description: `Formation change: ${cost}" (1/3 MV)` };
    }
}

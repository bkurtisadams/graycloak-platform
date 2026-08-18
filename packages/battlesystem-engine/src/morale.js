// morale.js v3.0.0 - 2026-08-17 — @graycloak/battlesystem-engine
// v3.0.0: Extracted to engine package. checkMorale/checkDiscipline synchronous
//         with injectable roll2d10 (Foundry Roll dependency removed).
// v2.1.1: HD bracket boundaries fixed for +1 HD variants (0.5 / 8.5 / 14.5) per Table 3
// v2.1.0: Table 7 discipline triggers, discipline failure handling, fighting withdrawal discipline
// Morale, Discipline, and Rally per [4.0]-[6.0]

export class BattlesystemMorale {
    static MORALE_TABLES = {
        baseMoraleModifiers: {
            hitDiceLessThanHalf: -2,
            hitDiceLessThanOne: -1,
            hitDiceFourToEight: 1,
            hitDiceNineToFourteen: 2,
            hitDiceMoreThanFourteen: 3,
            demihumans: 1,
            specialAbilities: 1,
            exceptionalAbilities: 1,
            magicEquipment: 1,
            sixOrFewerFigures: -2,
            sevenToElevenFigures: -1,
            armorClassZeroOrBetter: 2,
            armorClassOneToFour: 1,
            armorClassEightToTen: -1,
            mounted: 1,
            regular: 1
        },
        situationalFactors: {
            fiftyPercentLosses: -2,
            seventyFivePercentLosses: -4,
            enemyAtRear: -2,
            outOfCommand: -2,
            magicLoss: -1,
            commanderKilled: -1,
            failedCharge: -3,
            closedFormation: 1,
            mobWithSupport: 2,
            undeadContact: -3,
            cannotHarmContact: -3
        },
        // [4.6] Table 6 — additional discipline modifiers
        disciplineModifiers: {
            lowIntelligence: -1,
            highIntelligence: 1,
            chaoticAlignment: -1,
            lawfulAlignment: 1
        }
    };

    /**
     * Calculate base morale per rules [4.1] Table 3
     */
    static calculateBaseMorale(unit) {
        let morale = 11;

        // HD modifiers — "+1 HD" in AD&D notation treated as +0.5 (e.g. 8+1 HD ≈ 8.5)
        if (unit.hitDice <= 0.5) morale += this.MORALE_TABLES.baseMoraleModifiers.hitDiceLessThanHalf;
        else if (unit.hitDice < 1) morale += this.MORALE_TABLES.baseMoraleModifiers.hitDiceLessThanOne;
        else if (unit.hitDice >= 4 && unit.hitDice <= 8.5) morale += this.MORALE_TABLES.baseMoraleModifiers.hitDiceFourToEight;
        else if (unit.hitDice >= 9 && unit.hitDice <= 14.5) morale += this.MORALE_TABLES.baseMoraleModifiers.hitDiceNineToFourteen;
        else if (unit.hitDice > 14.5) morale += this.MORALE_TABLES.baseMoraleModifiers.hitDiceMoreThanFourteen;

        if (unit.isDemihuman) morale += this.MORALE_TABLES.baseMoraleModifiers.demihumans;
        if (unit.hasSpecialAbilities) morale += this.MORALE_TABLES.baseMoraleModifiers.specialAbilities;
        if (unit.hasExceptionalAbilities) morale += this.MORALE_TABLES.baseMoraleModifiers.exceptionalAbilities;
        if (unit.hasMagicEquipment) morale += this.MORALE_TABLES.baseMoraleModifiers.magicEquipment;

        if (unit.figures <= 6) morale += this.MORALE_TABLES.baseMoraleModifiers.sixOrFewerFigures;
        else if (unit.figures <= 11) morale += this.MORALE_TABLES.baseMoraleModifiers.sevenToElevenFigures;

        // AC modifiers [4.1] Table 3
        const ac = unit.armorClass ?? 10;
        if (ac <= 0) morale += this.MORALE_TABLES.baseMoraleModifiers.armorClassZeroOrBetter;
        else if (ac <= 4) morale += this.MORALE_TABLES.baseMoraleModifiers.armorClassOneToFour;
        else if (ac >= 8) morale += this.MORALE_TABLES.baseMoraleModifiers.armorClassEightToTen;

        if (unit.mounted) morale += this.MORALE_TABLES.baseMoraleModifiers.mounted;
        if (unit.unitIsRegular) morale += this.MORALE_TABLES.baseMoraleModifiers.regular;

        return morale;
    }

    /**
     * Calculate discipline rating per [4.6]
     * Same as base morale + intelligence/alignment modifiers
     * Situational morale factors NEVER apply to discipline
     */
    static calculateDiscipline(unit) {
        let dl = this.calculateBaseMorale(unit);
        if (unit.lowIntelligence) dl += this.MORALE_TABLES.disciplineModifiers.lowIntelligence;
        if (unit.highIntelligence) dl += this.MORALE_TABLES.disciplineModifiers.highIntelligence;
        if (unit.chaoticAlignment) dl += this.MORALE_TABLES.disciplineModifiers.chaoticAlignment;
        if (unit.lawfulAlignment) dl += this.MORALE_TABLES.disciplineModifiers.lawfulAlignment;
        // [4.6] "SOME units that never check morale (notably berserkers) have a
        // discipline rating of 0" — GM-designated via isBerserker, not inferred
        // from neverCheckMorale. Mindless undead never check discipline at all
        // [13.9], so their computed DL is retained but unused.
        if (unit.isBerserker) dl = 0;
        return dl;
    }

    /**
     * Calculate current morale per rules [4.2] Table 4
     */
    static calculateCurrentMorale(unit, situation = {}) {
        let currentMorale = unit.baseMorale;

        // Apply situational modifiers
        // 75% losses supersedes 50% — don't double-apply
        if (situation.seventyFivePercentLosses) {
            currentMorale += this.MORALE_TABLES.situationalFactors.seventyFivePercentLosses;
        } else if (situation.fiftyPercentLosses) {
            currentMorale += this.MORALE_TABLES.situationalFactors.fiftyPercentLosses;
        }

        if (situation.enemyAtRear) currentMorale += this.MORALE_TABLES.situationalFactors.enemyAtRear;
        if (situation.outOfCommand) currentMorale += this.MORALE_TABLES.situationalFactors.outOfCommand;
        if (situation.magicLoss) currentMorale += this.MORALE_TABLES.situationalFactors.magicLoss;
        if (situation.commanderKilledModifier) currentMorale += this.MORALE_TABLES.situationalFactors.commanderKilled;
        if (situation.failedCharge) currentMorale += this.MORALE_TABLES.situationalFactors.failedCharge;
        if (situation.closedFormation) currentMorale += this.MORALE_TABLES.situationalFactors.closedFormation;
        if (situation.mobWithSupport) currentMorale += this.MORALE_TABLES.situationalFactors.mobWithSupport;
        if (situation.undeadContact) currentMorale += this.MORALE_TABLES.situationalFactors.undeadContact;
        if (situation.cannotHarmContact) currentMorale += this.MORALE_TABLES.situationalFactors.cannotHarmContact;

        // Commander charisma bonus [4.9]
        if (unit.commander?.charismaBonus) {
            currentMorale += unit.commander.charismaBonus;
        }

        return currentMorale;
    }

    /**
     * Default 2d10 roller. Same injection contract as combat.js roll2d6:
     * hosts pass () => ({ total, dice }).
     */
    static defaultRoll2d10() {
        const d10 = () => Math.floor(Math.random() * 10) + 1;
        const dice = [d10(), d10()];
        return { total: dice[0] + dice[1], dice };
    }

    /**
     * Perform morale check per rules [4.3]. Synchronous; dice via injected roller.
     * Returns { passed, roll, currentMorale, modifierBreakdown }
     */
    static checkMorale(unit, situation = {}, roll2d10 = null) {
        const currentMorale = this.calculateCurrentMorale(unit, situation);
        const diceRoll = (roll2d10 || this.defaultRoll2d10)();
        const roll = diceRoll.total;
        const passed = roll <= currentMorale;

        // Build breakdown for chat card
        const breakdown = this._buildMoraleBreakdown(unit, situation);

        return {
            passed,
            roll,
            currentMorale,
            baseMorale: unit.baseMorale,
            diceResults: diceRoll.dice || [],
            breakdown
        };
    }

    /**
     * Perform discipline check per [4.6]. Synchronous; dice via injected roller.
     * Returns { passed, roll, discipline }
     */
    static checkDiscipline(unit, roll2d10 = null) {
        // [13.9] Mindless undead never check discipline — auto-pass.
        if (unit.isMindlessUndead) return { passed: true, roll: 0, discipline: null, autoPass: true, mindless: true };
        const dl = unit.discipline ?? this.calculateDiscipline(unit);
        // DL of 0 = auto-fail
        if (dl <= 0) return { passed: false, roll: 0, discipline: 0, autoFail: true };
        const diceRoll = (roll2d10 || this.defaultRoll2d10)();
        const roll = diceRoll.total;
        return {
            passed: roll <= dl,
            roll,
            discipline: dl,
            autoFail: false,
            diceResults: diceRoll.dice || []
        };
    }

    /**
     * Handle morale check effects per rules [4.5]
     */
    static handleMoraleFailure(unit) {
        if (unit.formation === 'closed') {
            return { effect: 'breakFormation', description: 'Breaks to Open Formation' };
        } else if (['open', 'skirmish', 'mob'].includes(unit.formation)) {
            return { effect: 'rout', description: 'Unit Routs!' };
        }
        return { effect: 'none', description: 'No effect' };
    }

    // Back-compat alias
    static handleMoraleCheck(unit) {
        return this.handleMoraleFailure(unit);
    }

    /**
     * Check rally conditions per [6.1]
     */
    static canRally(unit) {
        if (unit.inMeleeContact) return { canRally: false, reason: 'Cannot rally while in melee contact' };
        if (!unit.commanderInRange) return { canRally: false, reason: 'No eligible commander within command radius' };
        return { canRally: true, reason: '' };
    }

    /**
     * Attempt rally per [6.2] — morale check. Synchronous; roller threads through.
     */
    static attemptRally(unit, situation = {}, roll2d10 = null) {
        const check = this.canRally(unit);
        if (!check.canRally) return { rallied: false, reason: check.reason };
        const result = this.checkMorale(unit, situation, roll2d10);
        return {
            rallied: result.passed,
            roll: result.roll,
            currentMorale: result.currentMorale,
            diceResults: result.diceResults,
            breakdown: result.breakdown
        };
    }

    /**
     * Table 7: Determine if a discipline check is required.
     * Returns { required, reason } for the first matching trigger.
     * @param {object} unit — unit flags/data
     * @param {object} situation — { hatedOpponentInChargeRange, enemyWithdrawingOrFleeing, orderedChargeInClosed, seesEnemyInChargeRange }
     */
    static checkDisciplineTrigger(unit, situation = {}) {
        // [13.9] Mindless undead never check discipline. Out of command they
        // follow their last order — a command problem, not a discipline roll.
        if (unit.isMindlessUndead) return { required: false, reason: 'Mindless undead never check discipline [13.9]' };

        const chaotic = unit.chaoticAlignment || false;
        const lowInt = unit.lowIntelligence || false;
        const isMob = unit.unitType === 'mob';
        const isBerserker = unit.isBerserker || false;

        // 1) Hated opponent within charge range at beginning of movement
        if (situation.hatedOpponentInChargeRange) {
            return { required: true, reason: 'Sees hated opponent within charge range [Table 7]' };
        }

        // 2) Chaotic or low-int, enemy makes fighting withdrawal or flees while engaged
        if ((chaotic || lowInt) && situation.enemyWithdrawingOrFleeing) {
            return { required: true, reason: 'Enemy withdrawing/fleeing — chaotic or low intelligence [Table 7]' };
        }

        // 3) Chaotic or low-int, ordered to charge in closed formation
        if ((chaotic || lowInt) && situation.orderedChargeInClosed) {
            return { required: true, reason: 'Ordered to charge in closed formation — chaotic or low intelligence [Table 7]' };
        }

        // 4) Mob or berserker, sees any opponent within charge range at movement phase start
        if ((isMob || isBerserker) && situation.seesEnemyInChargeRange) {
            return { required: true, reason: `${isBerserker ? 'Berserker' : 'Mob'} sees enemy within charge range [Table 7]` };
        }

        return { required: false, reason: '' };
    }

    /**
     * Handle discipline check failure per [4.6].
     * Unit goes OOC, attacks/charges enemy. If closed → open formation.
     * Commander cannot reassert until after attack; rally per [6.0].
     */
    static handleDisciplineFailure(unit) {
        const effects = {
            outOfCommand: true,
            mustAttack: true,
            description: 'Discipline failed — unit is Out of Command and must charge/attack the enemy.'
        };
        if (unit.formation === 'closed') {
            effects.breakFormation = true;
            effects.newFormation = 'open';
            effects.description += ' Breaks to Open Formation.';
        }
        return effects;
    }

    /**
     * Fighting withdrawal: check if the pursuing enemy must make a discipline check.
     * Per [7.12]: if enemy is chaotic or low-int, must check discipline.
     * Failure = automatically advances to continue melee.
     * Success = option to remain in place or advance.
     */
    static pursuerRequiresDisciplineCheck(enemyUnit) {
        return (enemyUnit.chaoticAlignment || false) || (enemyUnit.lowIntelligence || false);
    }

    /**
     * Build human-readable breakdown of morale modifiers for chat
     */
    static _buildMoraleBreakdown(unit, situation) {
        const lines = [];
        lines.push({ label: 'Base Morale', value: unit.baseMorale });
        if (situation.seventyFivePercentLosses) lines.push({ label: '75%+ losses', value: -4 });
        else if (situation.fiftyPercentLosses) lines.push({ label: '50%+ losses', value: -2 });
        if (situation.enemyAtRear) lines.push({ label: 'Enemy at rear', value: -2 });
        if (situation.outOfCommand) lines.push({ label: 'Out of command', value: -2 });
        if (situation.magicLoss) lines.push({ label: 'Loss by magic', value: -1 });
        if (situation.commanderKilledModifier) lines.push({ label: 'Commander killed', value: -1 });
        if (situation.failedCharge) lines.push({ label: 'Failed charge', value: -3 });
        if (situation.closedFormation) lines.push({ label: 'Closed formation', value: +1 });
        if (situation.mobWithSupport) lines.push({ label: 'Mob w/ support', value: +2 });
        if (situation.undeadContact) lines.push({ label: 'Undead/drainer contact', value: -3 });
        if (situation.cannotHarmContact) lines.push({ label: 'Cannot harm target', value: -3 });
        if (unit.commander?.charismaBonus) lines.push({ label: 'Commander CHA', value: unit.commander.charismaBonus });
        return lines;
    }
}

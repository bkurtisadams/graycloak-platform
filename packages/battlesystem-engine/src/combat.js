// combat.js v3.0.0 - 2026-08-17 — @graycloak/battlesystem-engine
// v3.0.0: Extracted to engine package. resolveMeleeCombat is synchronous with an
//         injectable roll2d6 (Foundry Roll dependency removed); diceResults now
//         comes from the roller's { total, dice } contract.
// v2.6.0: [8.1] contact-aware eligibility support. contactFrontage=0 now means
//         no melee contact instead of falling back to the full unit frontage, and
//         callers may provide the actual number of closed-formation side extras.
// v2.5.0: AR pipeline three-layer fix — calculateAR now accepts optional
//         baseOverride (replaces THAC0+ratio); resolveMeleeCombat now applies
//         modifiers (sunlight/formation/OOC/charge) AND arDelta (terrain/missile/
//         rear attack) on top of override. Pre-fix, the `arOverride || calculateAR`
//         short-circuit silently dropped all modifiers when GM had set a base AR,
//         so e.g. orc unit with AR override 20 fighting in daylight rolled at 20
//         instead of 21. Sunlight, formation +1, charge bonuses etc. now correctly
//         apply regardless of override state.
// v2.4.0: Note — rearAttack [8.8] is handled in _resolveAttack's AR delta pipeline,
//         not here, so it composes correctly with arOverride (manual GM override).
// v2.3.0: Sunlight penalty +1 AR for sunlight-sensitive creatures [12.5]
// v2.2.0: Eligible fighters [8.1] rewrite — contact front + closed +1L/+1R + pole weapon rear ranks
// v2.1.0: Charge AR modifiers [11.4], charge damage multiplier [11.7]
import { CombatResultsTable } from './combat-table.js';

export class BattlesystemCombat {
    static COMBAT_TABLES = {
        ratioAdjustments: {
            "10:1": 0,
            "5:1": 5,
            "2:1": 10,
            "1:1": 15
        }
    };

    /**
     * Calculate Attack Rating per rules [8.3]
     * @param {number} thaco - Base THAC0 (or hero attack matrix value)
     * @param {string} ratio - Counter ratio (e.g. '10:1')
     * @param {object} modifiers - Situational modifiers (sunlight, formation, OOC, charge, etc.)
     * @param {number|null} baseOverride - GM AR override; replaces THAC0+ratio base, modifiers still applied on top [3.1]
     */
    static calculateAR(thaco, ratio, modifiers = {}, baseOverride = null) {
        let baseAR;
        if (baseOverride != null) {
            baseAR = baseOverride;
        } else {
            baseAR = thaco;
            baseAR += this.COMBAT_TABLES.ratioAdjustments[ratio] || 0;
        }

        if (modifiers.openFormation) baseAR += 1;
        if (modifiers.outOfCommand) baseAR += 1;
        if (modifiers.higherGround) baseAR -= 1;
        if (modifiers.chargingClosed) baseAR -= 1;
        if (modifiers.commanderFighting) baseAR -= 1;
        // Charge AR bonus [11.4]: cavalry/chariot -2, closed infantry -1
        if (modifiers.cavalryCharge) baseAR -= 2;
        else if (modifiers.chargeClosedInfantry) baseAR -= 1;
        // Sunlight penalty: orcs/goblins etc in daylight [12.5]
        if (modifiers.sunlightPenalty) baseAR += 1;

        return baseAR;
    }

    /**
     * Default 2d6 roller. Hosts inject their own:
     *   Foundry: pre-evaluate Roll("2d6"), pass () => ({ total, dice })
     *   Node sim: seeded PRNG for reproducible battles
     *   Browser: default is fine
     * Contract: returns { total: number, dice: number[] }
     */
    static defaultRoll2d6() {
        const d6 = () => Math.floor(Math.random() * 6) + 1;
        const dice = [d6(), d6()];
        return { total: dice[0] + dice[1], dice };
    }

    /**
     * Process melee combat per rules [8.4]. Synchronous; dice via injected roller.
     *
     * AR pipeline:
     *   1. Base = arBaseOverride (GM-set unitAROverride/heroAROverride flag) OR thaco + ratio adjustment
     *   2. Modifiers (from attacker.modifiers): sunlight, formation, OOC, charge bonuses [12.5, 11.4, 9.2]
     *   3. Delta (attacker.arDelta): situational deltas accumulated per-attack — terrain low-ground,
     *      forced march, missile Table 13 range/cover, [8.8] rear attack on routing target
     *   Final AR = base + modifiers + delta. All three layers always applied.
     */
    static resolveMeleeCombat(attacker, defender, roll2d6 = null) {
        // A. Calculate AR - AC. Override (if any) replaces THAC0+ratio base; modifiers always applied on top; arDelta added.
        const adjustedAR = this.calculateAR(attacker.thaco, attacker.ratio, attacker.modifiers, attacker.arBaseOverride ?? attacker.arOverride)
            + (attacker.arDelta || 0);
        const arMinusAC = adjustedAR - defender.ac;

        // B. Roll 2d6
        const diceRoll = (roll2d6 || this.defaultRoll2d6)();
        const rollTotal = diceRoll.total;
        const totalAttackRoll = arMinusAC + rollTotal;

        // [PHB] vs-Large weapon damage variant — used when target is Large or bigger
        const sizeStr = String(defender.size || 'M').toLowerCase();
        const isLarge = sizeStr.startsWith('l') || sizeStr.startsWith('h') || sizeStr.startsWith('g')
            || sizeStr === 'large' || sizeStr === 'huge' || sizeStr === 'gargantuan';
        const useLargeVariant = isLarge && attacker.weapon.damageDiceVsLarge && (
            attacker.weapon.damageDiceVsLarge !== attacker.weapon.damageDice ||
            (attacker.weapon.numberOfDiceVsLarge || 1) !== (attacker.weapon.numberOfDice || 1)
        );
        const effectiveWeapon = useLargeVariant
            ? {
                ...attacker.weapon,
                damageDice: attacker.weapon.damageDiceVsLarge,
                numberOfDice: attacker.weapon.numberOfDiceVsLarge || attacker.weapon.numberOfDice || 1
              }
            : attacker.weapon;

        // C & D. Get damage from CRT
        const damagePerFigure = CombatResultsTable.calculateTotalDamage(
            totalAttackRoll,
            effectiveWeapon,
            attacker.numberOfAttacks
        );

        // E. Total damage for all eligible figures
        const rawTotalDamage = damagePerFigure * attacker.eligibleFigures;
        // Charge damage multiplier [11.7]: double damage weapons, set spears
        const chargeMult = attacker.chargeDamageMultiplier || 1;
        const totalDamage = Math.floor(rawTotalDamage * chargeMult);

        // F. Process casualties
        const casualties = this.processCasualties(defender, totalDamage);

        // Display dice string: prefix numberOfDice if > 1 (e.g. "3D6+9");
        // component weapons render as "1D8 + 2D4" [11.5]
        const _fmt = w => `${(w.numberOfDice || 1) > 1 ? w.numberOfDice : ''}${w.damageDice}${w.damageModifier ? (w.damageModifier > 0 ? '+' + w.damageModifier : w.damageModifier) : ''}`;
        const weaponDiceDisplay = Array.isArray(effectiveWeapon.components)
            ? effectiveWeapon.components.map(_fmt).join(' + ')
            : `${(effectiveWeapon.numberOfDice || 1) > 1 ? effectiveWeapon.numberOfDice : ''}${effectiveWeapon.damageDice}`;

        return {
            ...casualties,
            adjustedAR,
            defenderAC: defender.ac,
            arMinusAC,
            rollTotal,
            totalAttackRoll,
            damagePerFigure,
            rawTotalDamage,
            eligibleFigures: attacker.eligibleFigures,
            weaponDice: weaponDiceDisplay,
            weaponMod: effectiveWeapon.damageModifier || 0,
            numberOfAttacks: attacker.numberOfAttacks || 1,
            usedLargeVariant: useLargeVariant,
            defenderSize: defender.size || 'M',
            diceResults: diceRoll.dice || []
        };
    }

    /**
     * Process casualties and wounds per rules [8.7]
     */
    static processCasualties(unit, damage) {
        const hdPerFigure = unit.hitDice;
        if (hdPerFigure <= 0 || damage <= 0) {
            return { killed: 0, wounds: 0, totalDamage: damage };
        }
        const killedFigures = Math.floor(damage / hdPerFigure);
        const remainingDamage = damage % hdPerFigure;
        const wounds = (remainingDamage >= (hdPerFigure / 4)) ? 1 : 0;

        return {
            killed: killedFigures,
            wounds,
            totalDamage: damage
        };
    }

    /**
     * Calculate eligible figures for melee per rules [8.1]
     * For individuals (1:1), always 1.
     * For units:
     *   Base: figures in base-to-base contact (contactFrontage, defaults to frontage)
     *   Closed formation: +1 figure to left, +1 to right of contact front
     *   Pole weapons (closed only):
     *     Pikes — 2 rear rows each add contactFront figures
     *     Spears/polearms/halberds — 1 rear row adds contactFront figures
     * Result capped at total figures in unit.
     */
    static calculateEligibleFighters(unit) {
        if (unit.ratio === '1:1') return 1;

        // How many figures are in base-to-base contact with the enemy.
        // A caller that supplies contactFrontage=0 has explicitly measured no
        // contact; only an omitted/null value falls back to full frontage.
        const hasMeasuredContact = unit.contactFrontage !== undefined && unit.contactFrontage !== null;
        const contactFront = hasMeasuredContact
            ? Math.max(0, Number(unit.contactFrontage) || 0)
            : Math.max(1, Number(unit.frontage) || 1);
        if (contactFront <= 0) return 0;

        let eligible = contactFront;

        if (unit.formation === 'closed') {
            // [8.1] "+1 figure to left and +1 to right of enemy contact". Geometry-
            // aware callers pass the number that actually exists (0-2); legacy
            // callers retain the old +2 assumption and the final figure cap.
            const sideExtras = unit.sideExtraFigures !== undefined && unit.sideExtraFigures !== null
                ? Math.max(0, Math.min(2, Number(unit.sideExtraFigures) || 0))
                : 2;
            eligible += sideExtras;

            // Pole weapon rear rank support (closed formation only)
            const wpn = (unit.weapon || '').toLowerCase();
            if (wpn === 'pike') {
                // 2 rows behind the contact row, each contributes contactFront attacks
                eligible += contactFront * 2;
            } else if (['spear', 'polearm', 'halberd'].includes(wpn)) {
                // 1 row behind the contact row contributes contactFront attacks
                eligible += contactFront;
            }
        }

        return Math.min(eligible, unit.figures || 1);
    }

    /**
     * Weapon definition lookup
     * Returns { damageDice, damageModifier, numberOfDice, numberOfAttacks }
     */
    static defineWeapon(type) {
        const weapons = {
            'longsword':     { damageDice: 'D8',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
            'longsword+1':   { damageDice: 'D8',  damageModifier: 1, numberOfDice: 1, numberOfAttacks: 1 },
            'longsword+2':   { damageDice: 'D8',  damageModifier: 2, numberOfDice: 1, numberOfAttacks: 1 },
            'longsword+3':   { damageDice: 'D8',  damageModifier: 3, numberOfDice: 1, numberOfAttacks: 1 },
            'twohanded':     { damageDice: 'D10', damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
            'twohanded+1':   { damageDice: 'D10', damageModifier: 1, numberOfDice: 1, numberOfAttacks: 1 },
            'twohanded+2':   { damageDice: 'D10', damageModifier: 2, numberOfDice: 1, numberOfAttacks: 1 },
            'twohanded+3':   { damageDice: 'D10', damageModifier: 3, numberOfDice: 1, numberOfAttacks: 1 },
            'shortsword':    { damageDice: 'D6',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
            'dagger':        { damageDice: 'D4',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
            'battleaxe':     { damageDice: 'D8',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
            'mace':          { damageDice: 'D6',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
            'morningstar':   { damageDice: 'D8',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
            'flail':         { damageDice: 'D8',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
            'warhammer':     { damageDice: 'D6',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
            'spear':         { damageDice: 'D6',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
            'pike':          { damageDice: 'D6',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
            'halberd':       { damageDice: 'D10', damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
            'polearm':       { damageDice: 'D8',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
            'shortbow':      { damageDice: 'D6',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 2 },
            'longbow':       { damageDice: 'D6',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 2 },
            'crossbow':      { damageDice: 'D8',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
            'javelin':       { damageDice: 'D6',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
            'sling':         { damageDice: 'D4',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
            'club':          { damageDice: 'D6',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
            'greatclub':     { damageDice: 'D10', damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
            'staff':         { damageDice: 'D6',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
            'quarterstaff':  { damageDice: 'D6',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
            'handaxe':       { damageDice: 'D6',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
            'scimitar':      { damageDice: 'D8',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
            'trident':       { damageDice: 'D8',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
            'claw':          { damageDice: 'D6',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 2 },
            'bite':          { damageDice: 'D8',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
            'fist':          { damageDice: 'D4',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
        };
        const key = (type || 'longsword').toLowerCase().replace(/\s+/g, '');
        const w = weapons[key];
        if (!w) {
            console.warn(`[BS:combat] Unknown weapon "${type}", defaulting to longsword`);
            return { ...weapons['longsword'] };
        }
        return { ...w };
    }
}
// combat.js v3.3.0 - 2026-08-21 — @graycloak/battlesystem-engine
// v3.3.0: PHB lances for the cavalry slice — light lance 1d6/1d6 (identical vs L,
//         keys omitted), medium lance 1d6+1 / 2d6 L, heavy lance 1d8+1 / 3d6 L;
//         'lance' is an alias for the medium horse lance. VERIFY vs the physical
//         PHB weapon table (values from the 1e PHB lance rows, Kurt to confirm).
// v3.2.1: PHB verification pass (Kurt, 2026-08-19). 'warhammer' is not a PHB
//         weapon — the entry is renamed 'hammer' (PHB Hammer 2-5 S/M, 1-4 L) with
//         'warhammer' retained as an alias so existing actors keep resolving;
//         'lucernhammer' added (2-8 S/M as 2d4, 1-6 L); 'horsemansmace' added
//         (1-6 S/M, 1-4 L) — 'mace' remains the footman's (2-7 S/M, 1-6 L).
//         Confirmed against the PHB: mace footman's, morningstar (2-8/2-7),
//         trident (2-7/3-12), heavy crossbow (2-5/2-7), and all other pairs.
// v3.2.0: defineWeapon carries the 1e PHB S/M-vs-Large damage pairs on the
//         *VsLarge keys that selectWeaponForTargetSize (v3.1.0) already consumes
//         — the mechanism existed but the table had no data, so usedLargeVariant
//         never fired for table weapons. S/M bases corrected to PHB where the old
//         table diverged (RAW): mace 1d6+1 (was 1d6), morningstar 2d4 (was 1d8),
//         flail footman's 1d6+1 (was 1d8), hammer 1d4+1 (was 1d6 'warhammer'),
//         crossbow heavy 1d4+1 (was 1d8), trident 1d6+1 (was 1d8). Hobgoblin
//         morningstar units and saved sims using these weapons WILL see different
//         damage. 'polearm' stays generic D8 (PHB family — set per type).
// v3.1.0: Port module v2.7.0 — isLargeTarget/selectWeaponForTargetSize walk every
//         weapon component and swap S/M to Large dice, modifiers, and dice-count
//         independently, fixing cavalry rider+mount and mixed natural attacks vs L.
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
     * True when the BATTLESYSTEM defender size is Large. normalizeBSSize() callers
     * normally pass S/M/L, but accept the ARS words too for defensive compatibility.
     */
    static isLargeTarget(size) {
        const sizeStr = String(size || 'M').trim().toLowerCase();
        return sizeStr === 'l' || sizeStr.startsWith('large') || sizeStr.startsWith('huge') || sizeStr.startsWith('gargantuan');
    }

    /**
     * Select the AD&D Large-target damage variant recursively. [8.5] damage
     * components (including cavalry rider + mount [11.5]) keep separate target-size
     * profiles, so only the component whose weapon changes vs L is swapped.
     */
    static selectWeaponForTargetSize(weapon, size) {
        if (!weapon || !this.isLargeTarget(size)) return weapon;
        if (Array.isArray(weapon.components) && weapon.components.length) {
            return {
                ...weapon,
                components: weapon.components.map(c => this.selectWeaponForTargetSize(c, size))
            };
        }
        if (!weapon.damageDiceVsLarge) return weapon;
        return {
            ...weapon,
            damageDice: weapon.damageDiceVsLarge || weapon.damageDice,
            damageModifier: Number.isFinite(Number(weapon.damageModifierVsLarge))
                ? Number(weapon.damageModifierVsLarge)
                : (weapon.damageModifier || 0),
            numberOfDice: weapon.numberOfDiceVsLarge || weapon.numberOfDice || 1
        };
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

        // AD&D S/M vs Large weapon damage. Select recursively so cavalry rider +
        // mount and multi-component attacks do not lose their individual L profiles.
        const effectiveWeapon = this.selectWeaponForTargetSize(attacker.weapon, defender.size);
        const useLargeVariant = this.isLargeTarget(defender.size) && JSON.stringify(effectiveWeapon) !== JSON.stringify(attacker.weapon);

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
        // 1e PHB damage table: S/M base + vs-Large variant on the *VsLarge keys
        // consumed by selectWeaponForTargetSize. Weapons identical vs L omit the
        // keys so usedLargeVariant stays false. S/M values corrected to PHB where
        // they diverged (flagged in v3.2.0 header): mace, morningstar, flail,
        // warhammer, crossbow, trident. 'polearm' is a PHB family — pick per type.
        const weapons = {
            'longsword':     { damageDice: 'D8',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1, damageDiceVsLarge: 'D12', damageModifierVsLarge: 0, numberOfDiceVsLarge: 1 },
            'longsword+1':   { damageDice: 'D8',  damageModifier: 1, numberOfDice: 1, numberOfAttacks: 1, damageDiceVsLarge: 'D12', damageModifierVsLarge: 1, numberOfDiceVsLarge: 1 },
            'longsword+2':   { damageDice: 'D8',  damageModifier: 2, numberOfDice: 1, numberOfAttacks: 1, damageDiceVsLarge: 'D12', damageModifierVsLarge: 2, numberOfDiceVsLarge: 1 },
            'longsword+3':   { damageDice: 'D8',  damageModifier: 3, numberOfDice: 1, numberOfAttacks: 1, damageDiceVsLarge: 'D12', damageModifierVsLarge: 3, numberOfDiceVsLarge: 1 },
            'twohanded':     { damageDice: 'D10', damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1, damageDiceVsLarge: 'D6',  damageModifierVsLarge: 0, numberOfDiceVsLarge: 3 },
            'twohanded+1':   { damageDice: 'D10', damageModifier: 1, numberOfDice: 1, numberOfAttacks: 1, damageDiceVsLarge: 'D6',  damageModifierVsLarge: 1, numberOfDiceVsLarge: 3 },
            'twohanded+2':   { damageDice: 'D10', damageModifier: 2, numberOfDice: 1, numberOfAttacks: 1, damageDiceVsLarge: 'D6',  damageModifierVsLarge: 2, numberOfDiceVsLarge: 3 },
            'twohanded+3':   { damageDice: 'D10', damageModifier: 3, numberOfDice: 1, numberOfAttacks: 1, damageDiceVsLarge: 'D6',  damageModifierVsLarge: 3, numberOfDiceVsLarge: 3 },
            'shortsword':    { damageDice: 'D6',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1, damageDiceVsLarge: 'D8',  damageModifierVsLarge: 0, numberOfDiceVsLarge: 1 },
            'dagger':        { damageDice: 'D4',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1, damageDiceVsLarge: 'D3',  damageModifierVsLarge: 0, numberOfDiceVsLarge: 1 },
            'battleaxe':     { damageDice: 'D8',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
            'mace':          { damageDice: 'D6',  damageModifier: 1, numberOfDice: 1, numberOfAttacks: 1, damageDiceVsLarge: 'D6',  damageModifierVsLarge: 0, numberOfDiceVsLarge: 1 }, // footman's
            'horsemansmace': { damageDice: 'D6',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1, damageDiceVsLarge: 'D4',  damageModifierVsLarge: 0, numberOfDiceVsLarge: 1 },
            'morningstar':   { damageDice: 'D4',  damageModifier: 0, numberOfDice: 2, numberOfAttacks: 1, damageDiceVsLarge: 'D6',  damageModifierVsLarge: 1, numberOfDiceVsLarge: 1 },
            'flail':         { damageDice: 'D6',  damageModifier: 1, numberOfDice: 1, numberOfAttacks: 1, damageDiceVsLarge: 'D4',  damageModifierVsLarge: 0, numberOfDiceVsLarge: 2 },
            'hammer':        { damageDice: 'D4',  damageModifier: 1, numberOfDice: 1, numberOfAttacks: 1, damageDiceVsLarge: 'D4',  damageModifierVsLarge: 0, numberOfDiceVsLarge: 1 },
            'warhammer':     { damageDice: 'D4',  damageModifier: 1, numberOfDice: 1, numberOfAttacks: 1, damageDiceVsLarge: 'D4',  damageModifierVsLarge: 0, numberOfDiceVsLarge: 1 }, // alias — PHB weapon is 'Hammer'
            'lucernhammer':  { damageDice: 'D4',  damageModifier: 0, numberOfDice: 2, numberOfAttacks: 1, damageDiceVsLarge: 'D6',  damageModifierVsLarge: 0, numberOfDiceVsLarge: 1 },
            'spear':         { damageDice: 'D6',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1, damageDiceVsLarge: 'D8',  damageModifierVsLarge: 0, numberOfDiceVsLarge: 1 },
            'pike':          { damageDice: 'D6',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1, damageDiceVsLarge: 'D12', damageModifierVsLarge: 0, numberOfDiceVsLarge: 1 },
            'halberd':       { damageDice: 'D10', damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1, damageDiceVsLarge: 'D6',  damageModifierVsLarge: 0, numberOfDiceVsLarge: 2 },
            'polearm':       { damageDice: 'D8',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
            'shortbow':      { damageDice: 'D6',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 2 },
            'longbow':       { damageDice: 'D6',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 2 },
            'crossbow':      { damageDice: 'D4',  damageModifier: 1, numberOfDice: 1, numberOfAttacks: 1, damageDiceVsLarge: 'D6',  damageModifierVsLarge: 1, numberOfDiceVsLarge: 1 },
            'javelin':       { damageDice: 'D6',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
            'sling':         { damageDice: 'D4',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
            'club':          { damageDice: 'D6',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1, damageDiceVsLarge: 'D3',  damageModifierVsLarge: 0, numberOfDiceVsLarge: 1 },
            'greatclub':     { damageDice: 'D10', damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
            'staff':         { damageDice: 'D6',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
            'quarterstaff':  { damageDice: 'D6',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
            'handaxe':       { damageDice: 'D6',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1, damageDiceVsLarge: 'D4',  damageModifierVsLarge: 0, numberOfDiceVsLarge: 1 },
            'scimitar':      { damageDice: 'D8',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
            'lightlance':    { damageDice: 'D6',  damageModifier: 0, numberOfDice: 1, numberOfAttacks: 1 },
            'mediumlance':   { damageDice: 'D6',  damageModifier: 1, numberOfDice: 1, numberOfAttacks: 1, damageDiceVsLarge: 'D6',  damageModifierVsLarge: 0, numberOfDiceVsLarge: 2 },
            'lance':         { damageDice: 'D6',  damageModifier: 1, numberOfDice: 1, numberOfAttacks: 1, damageDiceVsLarge: 'D6',  damageModifierVsLarge: 0, numberOfDiceVsLarge: 2 }, // alias — medium horse lance
            'heavylance':    { damageDice: 'D8',  damageModifier: 1, numberOfDice: 1, numberOfAttacks: 1, damageDiceVsLarge: 'D6',  damageModifierVsLarge: 0, numberOfDiceVsLarge: 3 },
            'trident':       { damageDice: 'D6',  damageModifier: 1, numberOfDice: 1, numberOfAttacks: 1, damageDiceVsLarge: 'D4',  damageModifierVsLarge: 0, numberOfDiceVsLarge: 3 },
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
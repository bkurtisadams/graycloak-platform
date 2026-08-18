// combat-table.js — @graycloak/battlesystem-engine
// Combat Results Table and damage-column mechanics [8.4]-[8.6]

export class CombatResultsTable {
    /**
     * The Combat Results Table.
     * Each array has 37 entries:
     * Index 0: Attack Roll "0/less"
     * Index 1: Attack Roll "1"
     * Index 2: Attack Roll "2"
     * ...
     * Index 34: Attack Roll "34"
     * Index 35: Attack Roll "35-39" band
     * Index 36: Attack Roll "40+" band
     */
    static DAMAGE_TABLE = {
        //       0/l  1    2    3    4    5    6    7    8    9   10   11   12   13   14   15   16   17   18   19   20   21   22   23   24   25   26   27   28   29   30   31   32   33   34  35-39 40+
        D2:  [    5,   4,   3,   3,   3,   3,   3,   3,   2,   2,   2,   2,   2,   2,   2,   1,   1,   1,   1,   1,   1,   1,   1, 0.5, 0.5, 0.5, 0.2, 0.2, 0.1, 0.1, 0.1,   0,   0,   0,   0,   0,   0],
        D3:  [    7,   6,   6,   5,   5,   4,   4,   4,   4,   3,   3,   3,   3,   3,   2,   2,   2,   2,   2,   2,   1,   1,   1,   1,   1, 0.5, 0.5, 0.5, 0.2, 0.1, 0.1, 0.1,   0,   0,   0,   0,   0],
        D4:  [    9,   8,   7,   7,   7,   6,   6,   6,   5,   5,   5,   5,   4,   4,   4,   4,   3,   3,   3,   3,   2,   2,   2,   1,   1,   1,   1, 0.5, 0.5, 0.2, 0.1, 0.1,   0,   0,   0,   0,   0],
        D6:  [   12,  11,  10,  10,   9,   9,   8,   8,   8,   7,   7,   6,   6,   6,   5,   5,   5,   4,   4,   4,   3,   3,   2,   2,   2,   1,   1, 0.5, 0.5, 0.2, 0.2, 0.1, 0.1,   0,   0,   0,   0],
        D8:  [   15,  14,  13,  13,  12,  11,  11,  11,  10,  10,   9,   8,   8,   7,   7,   6,   6,   5,   5,   5,   4,   4,   3,   3,   2,   2,   1,   1, 0.5, 0.5, 0.2, 0.2, 0.1, 0.1, 0.1,   0,   0],
        D10: [   18,  17,  16,  15,  15,  14,  14,  13,  12,  12,  11,  10,  10,   9,   8,   8,   7,   7,   6,   6,   5,   4,   4,   3,   3,   2,   1,   1,   1, 0.5, 0.5, 0.2, 0.1, 0.1, 0.1, 0.1,   0],
        D12: [   20,  19,  18,  18,  17,  17,  16,  15,  15,  14,  13,  12,  11,  11,  10,   9,   9,   8,   7,   6,   6,   5,   4,   4,   3,   2,   2,   1,   1,   1, 0.5, 0.5, 0.2, 0.2, 0.1, 0.1,   0],
        D14: [   22,  21,  20,  20,  19,  18,  17,  15,  15,  14,  13,  12,  12,  11,  11,  10,   9,   8,   8,   7,   6,   5,   5,   4,   4,   3,   3,   3,   2,   2,   1,   1, 0.5, 0.5, 0.5, 0.2,   0],
        D16: [   24,  23,  22,  22,  20,  20,  18,  17,  16,  15,  15,  14,  13,  12,  11,  11,  10,   9,   8,   8,   7,   7,   6,   5,   5,   4,   3,   3,   3,   2,   2,   1,   1, 0.5, 0.5, 0.2,   0],
        D18: [   28,  26,  24,  23,  22,  21,  20,  19,  18,  17,  16,  15,  14,  13,  12,  12,  11,  10,   9,   8,   8,   8,   7,   6,   6,   6,   5,   5,   4,   3,   3,   2,   2,   1,   1, 0.5,   0],
        D20: [   32,  29,  26,  25,  24,  23,  22,  21,  20,  19,  18,  17,  16,  15,  13,  13,  12,  11,  10,   9,   8,   8,   8,   7,   7,   6,   5,   5,   4,   4,   3,   3,   2,   2,   1,   1,   0]
    };

    /**
     * Get damage result from the table.
     * @param {number} attackRoll - The final attack roll (AR-AC+2d6).
     * @param {string} diceType - The damage dice type (D2-D20).
     * @returns {number} - The damage result in Hit Dice.
     */
    static getDamageResult(attackRoll, diceType) {
        let rowIndex;

        if (attackRoll <= 0) { // Handles "0/less"
            rowIndex = 0;
        } else if (attackRoll >= 1 && attackRoll <= 34) {
            rowIndex = attackRoll; // Direct mapping for Attack Rolls 1 through 34
        } else if (attackRoll >= 35 && attackRoll <= 39) {
            rowIndex = 35; // Maps to the "35-39" band (index 35 in 0-indexed array)
        } else { // attackRoll >= 40
            rowIndex = 36; // Maps to the "40+" band (index 36 in 0-indexed array)
        }

        // Ensure rowIndex is within the bounds of our 37-element arrays (0-36)
        // This also handles if somehow attackRoll was NaN or undefined, defaulting to 0
        const row = Math.max(0, Math.min(rowIndex, 36));
        const column = diceType.toUpperCase();

        if (!this.DAMAGE_TABLE[column]) {
            console.error(`Battlesystem CRT: Invalid dice type provided: ${diceType}`);
            throw new Error(`Invalid dice type: ${diceType}`);
        }
        if (this.DAMAGE_TABLE[column][row] === undefined) {
            console.error(`Battlesystem CRT: Undefined value at column ${column}, row index ${row} (AttackRoll: ${attackRoll})`);
            // Fallback to 0 damage if something went very wrong with indexing
            return 0;
        }

        return this.DAMAGE_TABLE[column][row];
    }

    /**
     * Handle damage modifiers per rules [8.5]
     * @param {string} baseDice - Base damage dice (e.g., "D8")
     * @param {number} modifier - Damage modifier
     * @returns {Object} - Contains `dice` (the final dice column to read from)
     *                     and `additionalD20s` (how many full D20 results to add).
     */
    static handleDamageModifier(baseDice, modifier) {
        const diceTypes = ['D2', 'D3', 'D4', 'D6', 'D8', 'D10', 'D12', 'D14', 'D16', 'D18', 'D20'];
        const maxIdx = diceTypes.length - 1; // 10 = D20
        let currentIndex = diceTypes.indexOf(baseDice.toUpperCase());

        if (currentIndex === -1) {
            console.error(`Battlesystem CRT: Invalid base dice for modifier: ${baseDice}`);
            throw new Error(`Invalid base dice: ${baseDice}`);
        }

        let additionalD20s = 0;

        if (modifier > 0) {
            // [8.5] Shift right. Past D20, wrap to D2 and add D20 result each pass.
            // D20+3 → D20 + D4 (wrap: D2→D3→D4)
            // D8+11 → D20 + D12 (2 right to D20, wrap, 9 more from D2)
            // D10+40 → D20+D20+D20+D20+D8
            for (let i = 0; i < modifier; i++) {
                currentIndex++;
                if (currentIndex > maxIdx) {
                    additionalD20s++;
                    currentIndex = 0; // restart from D2
                }
            }
        } else if (modifier < 0) {
            // [8.5] Shift left. Cannot go past D2.
            for (let i = 0; i < Math.abs(modifier); i++) {
                if (currentIndex === 0) break;
                currentIndex--;
            }
        }

        return {
            dice: diceTypes[currentIndex],
            additionalD20s
        };
    }

    /**
     * Calculate total damage including multiple attacks and damage modifiers [8.5, 8.6]
     * @param {number} attackRoll - The attack roll result.
     * @param {Object} weapon - Weapon information. Expected: { damageDice: "D8", damageModifier: 0, numberOfDice: 1 }
     * @param {number} numberOfAttacks - Number of attacks the figure makes.
     * @returns {number} - Total damage in Hit Dice.
     */
    static calculateTotalDamage(attackRoll, weapon, numberOfAttacks = 1) {
        // [8.6]/[11.5] Multi-component damage (cavalry rider+mount, mixed natural
        // attacks): ONE Attack Roll, but each damage type is read on its OWN CRT
        // column and the column results are added. Each component may carry its
        // own damageModifier, so a sword +1 shifts only the sword's column [8.5].
        if (Array.isArray(weapon?.components) && weapon.components.length) {
            let sum = 0;
            for (const c of weapon.components) {
                sum += this.calculateTotalDamage(attackRoll, c, 1);
            }
            return sum * numberOfAttacks;
        }
        if (!weapon || typeof weapon.damageDice !== 'string') {
            console.error("Battlesystem CRT: Invalid weapon object provided to calculateTotalDamage.", weapon);
            return 0;
        }

        const { dice: modifiedDiceType, additionalD20s } = this.handleDamageModifier(weapon.damageDice, weapon.damageModifier || 0);

        let damagePerHit = this.getDamageResult(attackRoll, modifiedDiceType);

        if (additionalD20s > 0) {
            const d20Damage = this.getDamageResult(attackRoll, 'D20');
            damagePerHit += (d20Damage * additionalD20s);
        }

        // Handle multiple damage dice for the weapon itself (e.g., 2D4 means multiply D4 result by 2)
        damagePerHit *= (weapon.numberOfDice || 1);

        // Total damage is damage per hit times number of attacks. A component-
        // specific multiplier lets cavalry double the rider's lance component
        // without incorrectly doubling the mount's hoof/bite damage [11.4-11.5].
        const totalDamage = damagePerHit * numberOfAttacks;
        return totalDamage * (weapon.damageMultiplier || 1);
    }
}
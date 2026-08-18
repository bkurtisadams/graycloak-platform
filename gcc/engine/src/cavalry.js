// cavalry.js v1.1.0 - 2026-08-17
// v1.1.0: Accept AD&D HD expressions (e.g. 3+3) for rider/mount cavalry
//         ratings. Bonus hit points are treated as fractional d8 HD for the
//         [11.2] average, then the combined cavalry HD is rounded up.
// Cavalry and Chariot rating [11.1]-[11.5]

export class BattlesystemCavalry {

    /**
     * Parse an AD&D creature HD expression for cavalry averaging [11.2].
     * Monster bonus hit points are fractional HD for this purpose: 3+3 is
     * treated as 3 + 3/8 = 3.375 HD. The final rider/mount average is rounded
     * up by calculateCavalryHD().
     *
     * @param {number|string} value
     * @param {number} hitDieSize AD&D monster HD are d8 by default.
     * @returns {number}
     */
    static parseHDExpression(value, hitDieSize = 8) {
        if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
        const text = String(value ?? '').trim();
        if (!text) return 0;
        const match = text.match(/^(\d+(?:\.\d+)?)(?:\s*\+\s*(\d+(?:\.\d+)?))?$/);
        if (!match) {
            const n = parseFloat(text);
            return Number.isFinite(n) ? n : 0;
        }
        const base = parseFloat(match[1]) || 0;
        const bonusHP = parseFloat(match[2]) || 0;
        // DMG: hp bonus above +3 counts as an extra HD; +3 or less does not.
        // Same rule as readCreatureHD in shared.js — do not treat the bonus
        // fractionally, it produces a different [11.2] average.
        return base + (bonusHP > 3 ? 1 : 0);
    }

    /** Return the effective cavalry HD from rider + mount [11.2]. */
    static calculateCavalryHD(riderHD, mountHD) {
        const rider = this.parseHDExpression(riderHD);
        const mount = this.parseHDExpression(mountHD);
        if (rider <= 0 || mount <= 0) return 0;
        return Math.ceil((rider + mount) / 2);
    }

    // =========================================================================
    // [11.2] RATING CAVALRY
    // =========================================================================

    /**
     * Calculate cavalry unit stats per [11.2].
     * AR: Rider's AR
     * HD: Average of rider HD and mount HD (round up)
     * AC: Poorer (higher number) of rider or mount
     * MV: Mount's MV
     * Dmg: Rider damage + mount damage
     * SA: Either rider or steed abilities usable
     * SD: Special defenses only if BOTH have them
     *
     * @param {object} rider — { ar, hd, ac, mv, dmg, specialAbilities[], specialDefenses[] }
     * @param {object} mount — { hd, ac, mv, dmg, specialAbilities[], specialDefenses[] }
     * @returns {object} combined cavalry stats
     */
    static calculateCavalryRating(rider, mount) {
        const ar = rider.ar;
        const hd = this.calculateCavalryHD(rider.hd, mount.hd);
        const riderAC = Number(rider.ac);
        const mountAC = Number(mount.ac);
        const ac = Math.max(
            Number.isFinite(riderAC) ? riderAC : 10,
            Number.isFinite(mountAC) ? mountAC : 10
        ); // higher number = worse AC
        const mv = Number(mount.mv) || 0;

        // Combine damage
        const riderDmg = rider.dmg || '0';
        const mountDmg = mount.dmg || '0';

        // SA: union of both
        const sa = [
            ...(rider.specialAbilities || []),
            ...(mount.specialAbilities || [])
        ];

        // SD: intersection only (both must have it)
        const riderSD = new Set(rider.specialDefenses || []);
        const sd = (mount.specialDefenses || []).filter(d => riderSD.has(d));

        return {
            ar,
            hd,
            ac,
            mv,
            riderDmg,
            mountDmg,
            combinedDmg: `${riderDmg} + ${mountDmg}`,
            specialAbilities: sa,
            specialDefenses: sd,
            isCavalry: true,
            killedRule: 'If either rider or steed killed, entire figure removed.'
        };
    }

    // =========================================================================
    // [11.3] RATING CHARIOTS
    // =========================================================================

    /**
     * Calculate chariot unit stats per [11.3].
     * AR: Average of all passengers and pulling creatures (round in favor of chariot = round down since lower is better)
     * HD: Average HD of pulling creatures + average HD of passengers
     * AC: Average AC of all, then -2 bonus
     * MV: 2/3 of pulling creatures MV (full if pullers have 3x+ total HD of riders)
     * Dmg: All pulling creature damage + all passenger damage
     * SA: Either riders or steeds abilities usable
     * SD: Special defenses only if ALL creatures have them
     *
     * @param {object[]} passengers — [{ ar, hd, ac, dmg, specialAbilities[], specialDefenses[] }]
     * @param {object[]} pullers — [{ ar, hd, ac, mv, dmg, specialAbilities[], specialDefenses[] }]
     */
    static calculateChariotRating(passengers, pullers) {
        if (!passengers.length || !pullers.length) {
            console.warn('[BS:cavalry] Chariot requires at least 1 passenger and 1 puller');
            return null;
        }

        // AR: average all, round down (lower = better = "in favor of chariot")
        const allAR = [...passengers.map(p => p.ar), ...pullers.map(p => p.ar)];
        const ar = Math.floor(allAR.reduce((s, v) => s + v, 0) / allAR.length);

        // HD: average puller HD + average passenger HD
        const avgPullerHD = pullers.reduce((s, p) => s + p.hd, 0) / pullers.length;
        const avgPassengerHD = passengers.reduce((s, p) => s + p.hd, 0) / passengers.length;
        const hd = Math.ceil(avgPullerHD + avgPassengerHD);

        // AC: average all, then -2 bonus
        const allAC = [...passengers.map(p => p.ac), ...pullers.map(p => p.ac)];
        const ac = Math.floor(allAC.reduce((s, v) => s + v, 0) / allAC.length) - 2;

        // MV: 2/3 puller MV, or full if pullers have 3x+ total HD of riders
        const pullerTotalHD = pullers.reduce((s, p) => s + p.hd, 0);
        const passengerTotalHD = passengers.reduce((s, p) => s + p.hd, 0);
        const pullerMV = pullers[0]?.mv || 12;
        const mv = (pullerTotalHD >= passengerTotalHD * 3)
            ? pullerMV
            : Math.floor(pullerMV * 2 / 3);

        // Dmg: sum all
        const allDmg = [
            ...pullers.map(p => p.dmg || '0'),
            ...passengers.map(p => p.dmg || '0')
        ];

        // SA: union of all
        const sa = [
            ...pullers.flatMap(p => p.specialAbilities || []),
            ...passengers.flatMap(p => p.specialAbilities || [])
        ];

        // SD: intersection of ALL creatures (every creature must have it)
        const allCreatures = [...passengers, ...pullers];
        const firstSD = new Set(allCreatures[0]?.specialDefenses || []);
        const sd = [...firstSD].filter(d =>
            allCreatures.every(c => (c.specialDefenses || []).includes(d))
        );

        return {
            ar,
            hd,
            ac,
            mv,
            pullerMV,
            fullMVUsed: pullerTotalHD >= passengerTotalHD * 3,
            allDmg,
            combinedDmg: allDmg.join(' + '),
            specialAbilities: sa,
            specialDefenses: sd,
            isChariot: true,
            killedRule: 'If either rider or steed killed, entire figure removed.'
        };
    }

    // =========================================================================
    // [11.4] CAVALRY AND CHARIOT CHARGES
    // =========================================================================

    /**
     * Get charge AR modifier for cavalry/chariots per [11.4].
     * -2 AR bonus unless defender has Set Spears/Pikes.
     * Weapons that do double damage in charge also apply.
     */
    static getCavalryChargeModifier(defenderHasSetSpears = false) {
        if (defenderHasSetSpears) return { arBonus: 0, reason: 'Set spears negate cavalry/chariot charge bonus' };
        return { arBonus: -2, reason: 'Cavalry/chariot charge: -2 AR' };
    }

    // =========================================================================
    // [11.5] CAVALRY AND CHARIOTS IN MELEE
    // =========================================================================

    /**
     * Per [11.5]: only one attack roll for cavalry/chariot.
     * Rider + mount (or all passengers + pullers) damage added together using same die roll.
     * This returns the combined weapon definition for CRT.
     *
     * @param {string[]} damageStrings — array of damage expressions like ['1d8', '1d6+1']
     * @returns {object} — combined weapon for CRT { damageDice, damageModifier, numberOfDice }
     */
    static combineCavalryDamage(damageStrings) {
        // [8.6]/[11.5] One Attack Roll; each damage type reads its own CRT
        // column, results added. Components with identical die AND modifier
        // merge into one entry with a higher numberOfDice.
        const merged = new Map();
        for (const dmgStr of damageStrings) {
            const m = String(dmgStr).match(/(\d+)?d(\d+)(?:\s*\+\s*(\d+))?/i);
            if (!m) continue;
            const numDice = parseInt(m[1]) || 1;
            const dieSize = parseInt(m[2]);
            const bonus = parseInt(m[3]) || 0;
            const key = `${dieSize}|${bonus}`;
            const c = merged.get(key) || { damageDice: 'D' + dieSize, damageModifier: bonus, numberOfDice: 0 };
            c.numberOfDice += numDice;
            merged.set(key, c);
        }
        const components = [...merged.values()];
        if (!components.length) components.push({ damageDice: 'D8', damageModifier: 0, numberOfDice: 1 });

        return {
            components,
            numberOfAttacks: 1,
            note: 'Single attack roll — each damage type on its own CRT column, summed [8.6/11.5]'
        };
    }
}

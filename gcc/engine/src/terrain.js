// terrain.js v1.0.0 - 2026-03-15
// Terrain effects on movement [11.8] and combat [11.9]

export class BattlesystemTerrain {

    // [11.8] Table 14 — Terrain Effects on Movement
    static TERRAIN_TYPES = {
        clear:     { mvMultiplier: 1.0,   canCharge: true,  canClosed: true,  label: 'Clear' },
        road:      { mvMultiplier: 4/3,   canCharge: true,  canClosed: true,  label: 'Road', note: 'Entire unit must be on road for entire move' },
        woods:     { mvMultiplier: 2/3,   canCharge: true,  canClosed: false, label: 'Woods' },
        obstacles: { mvMultiplier: 2/3,   canCharge: false, canClosed: false, label: 'Obstacles', note: 'Streams, walls, fences, gulleys. Closed→Open on crossing (no MV cost).' },
        elevation: { mvMultiplier: null,  canCharge: false, canClosed: true,  label: 'Elevation', note: 'Cost: 1/3 MV per 10ft gained. Cannot charge uphill.' },
        rough:     { mvMultiplier: 0.5,   canCharge: true,  canClosed: false, label: 'Rough Terrain' },
        swamps:    { mvMultiplier: 0.5,   canCharge: true,  canClosed: false, label: 'Swamps' },
        water:     { mvMultiplier: 0,     canCharge: false, canClosed: false, label: 'Rivers/Ponds/Lakes', note: 'Aquatic/amphibious only at full MV.' }
    };

    // Creatures immune to terrain penalties
    static TERRAIN_IMMUNITY = {
        woods:  ['elf', 'halfling', 'treant', 'sylph', 'dryad', 'centaur', 'pixie', 'sprite', 'satyr'],
        rough:  ['dwarf', 'hill giant', 'stone giant', 'mountain dwarf', 'gnome'],
        swamps: ['lizard man', 'sahuagin', 'lacedon', 'bullywug', 'troglodyte', 'black dragon', 'hydra']
    };

    /**
     * Get terrain data for a terrain type.
     */
    static getTerrainData(terrainType) {
        return this.TERRAIN_TYPES[terrainType] || this.TERRAIN_TYPES.clear;
    }

    /**
     * Check if a creature type is immune to a terrain's movement penalty.
     * @param {string} terrainType
     * @param {string} creatureType — race/monster type (lowercase)
     */
    static isImmuneToTerrain(terrainType, creatureType) {
        const immuneList = this.TERRAIN_IMMUNITY[terrainType];
        if (!immuneList) return false;
        const ct = (creatureType || '').toLowerCase();
        return immuneList.some(immune => ct.includes(immune));
    }

    /**
     * Calculate effective movement rate in terrain per [11.8].
     * @param {number} baseMV — unit base movement rate in inches
     * @param {string} terrainType
     * @param {boolean} isImmune — creature is immune to this terrain's penalty
     * @param {boolean} isAquatic — creature is aquatic/amphibious (for water)
     * @returns {{ effectiveMV, penalty, canEnter, canCharge, canClosed, description }}
     */
    static calculateTerrainMovement(baseMV, terrainType, isImmune = false, isAquatic = false) {
        const terrain = this.getTerrainData(terrainType);
        const mv = parseInt(baseMV) || 12;

        // Water: only aquatic/amphibious can enter
        if (terrainType === 'water') {
            if (isAquatic) {
                return {
                    effectiveMV: mv, penalty: 0,
                    canEnter: true, canCharge: false, canClosed: false,
                    description: `${terrain.label}: Full movement (aquatic creature)`
                };
            }
            return {
                effectiveMV: 0, penalty: mv,
                canEnter: false, canCharge: false, canClosed: false,
                description: `${terrain.label}: Cannot enter (non-aquatic)`
            };
        }

        // Elevation: special cost per 10ft
        if (terrainType === 'elevation') {
            return {
                effectiveMV: mv, penalty: 0,  // penalty applied per 10ft, not flat
                canEnter: true, canCharge: false, canClosed: true,
                elevationCostPer10ft: Math.floor(mv / 3),
                description: `${terrain.label}: ${Math.floor(mv / 3)}" per 10ft elevation gained. Cannot charge uphill.`
            };
        }

        // Immune creatures ignore penalty
        if (isImmune) {
            return {
                effectiveMV: mv, penalty: 0,
                canEnter: true, canCharge: terrain.canCharge, canClosed: terrain.canClosed,
                description: `${terrain.label}: Full movement (immune)`
            };
        }

        // Standard terrain multiplier
        const effectiveMV = Math.floor(mv * terrain.mvMultiplier);
        const penalty = mv - effectiveMV;

        return {
            effectiveMV, penalty,
            canEnter: true,
            canCharge: terrain.canCharge,
            canClosed: terrain.canClosed,
            description: `${terrain.label}: ${effectiveMV}" (${penalty}" penalty from ${mv}")`
        };
    }

    /**
     * Check if crossing an obstacle forces closed→open per [11.8].
     */
    static forcesOpenFormation(terrainType, currentFormation) {
        if (currentFormation !== 'closed') return false;
        const terrain = this.getTerrainData(terrainType);
        return !terrain.canClosed;
    }

    // =========================================================================
    // [11.9] TERRAIN EFFECTS ON COMBAT
    // =========================================================================

    /**
     * Check missile fire restrictions in woods per [11.9].
     * Units in woods can only fire from edge outward.
     * Cannot fire INTO woods, but can fire AT units at the edge.
     */
    static checkWoodsMissile(attackerInWoods, attackerAtEdge, defenderInWoods, defenderAtEdge) {
        // Attacker in woods, not at edge → cannot fire
        if (attackerInWoods && !attackerAtEdge) {
            return { canFire: false, reason: 'Cannot fire from inside woods (must be at edge).' };
        }
        // Defender in woods, not at edge → cannot be targeted by missiles
        if (defenderInWoods && !defenderAtEdge) {
            return { canFire: false, reason: 'Cannot fire at targets inside woods (only at edge).' };
        }
        return { canFire: true, reason: '' };
    }

    /**
     * Get sight/spell range in woods per [11.9].
     * Woodland creatures: 6". All others: 1".
     */
    static getWoodsSightRange(isWoodlandCreature) {
        return isWoodlandCreature ? 6 : 1;
    }

    /**
     * Get low-ground AR penalty per [11.9].
     * Units in ditch/gulley/trench, fording stream, or in swamp
     * attacking a unit at the edge suffer +4 AR penalty.
     */
    static getLowGroundPenalty(attackerInLowGround, defenderAtEdge) {
        if (attackerInLowGround && defenderAtEdge) {
            return { arPenalty: 4, description: 'Low ground penalty: +4 AR (attacking from ditch/stream/swamp)' };
        }
        return { arPenalty: 0, description: '' };
    }

    /**
     * Get terrain info summary for a unit's current terrain.
     * Used for display in battle console and chat cards.
     */
    static getTerrainSummary(terrainType, baseMV, creatureType = '', isAquatic = false) {
        const isImmune = this.isImmuneToTerrain(terrainType, creatureType);
        const mvResult = this.calculateTerrainMovement(baseMV, terrainType, isImmune, isAquatic);
        const terrain = this.getTerrainData(terrainType);

        return {
            terrain: terrain.label,
            effectiveMV: mvResult.effectiveMV,
            penalty: mvResult.penalty,
            canCharge: mvResult.canCharge,
            canClosed: terrain.canClosed,
            isImmune,
            description: mvResult.description
        };
    }
}

// unit-math.js v1.0.0 - 2026-08-17 — @graycloak/battlesystem-engine
// Pure unit-math helpers extracted from ars-battlesystem-tab shared.js v1.13.0.
// Foundry-coupled readers (effectiveUnitHD, effectiveUnitAC, readActorTHAC0,
// getUnitMeleeProfile, readCreatureHD) remain in the module's shared.js and
// should delegate to these where applicable.

// ─── Ratio from HD per [2.2] Table 1 ───
// Determines ratio from CREATURE hit dice, not figure total HD.
// Less than 4+1 HD → 10:1, 4+1 to 8+ HD → 5:1, 9+ HD → 2:1
export function ratioFromHD(hd) {
    if (hd < 4.5) return '10:1';
    if (hd < 9) return '5:1';
    return '2:1';
}

// ─── Creatures per figure from ratio string ───
// "10:1" → 10, "5:1" → 5, "2:1" → 2, "1:1" → 1
export function creaturesPerFigure(ratio) {
    const n = parseInt(String(ratio).split(':')[0]);
    return isNaN(n) ? 1 : n;
}

// ─── HD per figure per [3.1] / [8.7] ───
// "HD/fig. Number of Hit Dice represented by each figure."
// = creature HD × creatures per figure
// e.g. 1 HD orc at 10:1 = 10 HD/fig; 4 HD ogre at 5:1 = 20 HD/fig
export function calculateHDPerFigure(creatureHD, ratio) {
    return creatureHD * creaturesPerFigure(ratio);
}

// ─── AD&D HD expression → effective numeric HD ───
// DMG p.10: monster hp bonus above +3 counts as an additional Hit Die
// (e.g. "6+6" = 7 effective HD; "3+3" = 3). Returns { string, numeric }.
export function parseHDNumeric(raw) {
    const string = String(raw ?? '1');
    let base = parseFloat(string);
    let bonus = 0;
    if (string.includes('+')) {
        const parts = string.split('+');
        base = parseFloat(parts[0]) || 1;
        bonus = parseFloat(parts[1]) || 0;
    }
    if (isNaN(base)) base = 1;
    const numeric = bonus > 3 ? base + 1 : base;
    return { string, numeric };
}

// ─── Damage string → CRT weapon definition ───
// "2d4" → { damageDice: 'D4', numberOfDice: 2 }; "1d8+1" → D8 with modifier 1.
// Returns null for unparseable or non-CRT die sizes.
export function parseDamageString(dmgStr) {
    if (!dmgStr) return null;
    const m = String(dmgStr).match(/(\d+)?d(\d+)(?:\s*\+\s*(\d+))?/i);
    if (!m) return null;
    const numDice = parseInt(m[1]) || 1;
    const dieSize = parseInt(m[2]);
    const bonus = parseInt(m[3]) || 0;
    const validDice = [2, 3, 4, 6, 8, 10, 12, 14, 16, 18, 20];
    if (!validDice.includes(dieSize)) return null;
    return {
        damageDice: 'D' + dieSize,
        damageModifier: bonus,
        numberOfDice: numDice,
        numberOfAttacks: 1
    };
}

// ─── [11.5] Cavalry component damage ───
// Cavalry melee uses one Attack Roll but adds rider and mount damage
// components. Mount attacks may be separated by '/', ',' or ';'.
export function appendMountDamageComponents(weaponDef, mountDamage) {
    if (!mountDamage) return weaponDef;
    const mountParts = String(mountDamage).split(/[\/,;]+/)
        .map(s => parseDamageString(s.trim()))
        .filter(Boolean);
    if (!mountParts.length) return weaponDef;
    const riderComponents = Array.isArray(weaponDef?.components)
        ? weaponDef.components.map(c => ({ ...c }))
        : [{ ...weaponDef }];
    return { components: [...riderComponents, ...mountParts], numberOfAttacks: 1 };
}

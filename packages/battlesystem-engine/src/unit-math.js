// unit-math.js v1.1.0 - 2026-08-17 — @graycloak/battlesystem-engine
// v1.1.0: S/M-vs-Large damage-pair helpers ported from shared.js v1.14.0
//         (splitLegacyDamagePair, resolveDamagePair, buildWeaponDamageDefinition).
// Pure unit-math helpers extracted from ars-battlesystem-tab shared.js v1.13.0+.
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
const CRT_DICE = [2, 3, 4, 6, 8, 10, 12, 14, 16, 18, 20];
export function parseDamageString(dmgStr) {
    if (!dmgStr) return null;
    const m = String(dmgStr).trim().match(/^(\d+)?d(\d+)(?:\s*([+-])\s*(\d+))?$/i);
    if (!m) return null;
    const numDice = parseInt(m[1]) || 1;
    const dieSize = parseInt(m[2]);
    const bonus = (m[3] === '-' ? -1 : 1) * (parseInt(m[4]) || 0);
    if (!CRT_DICE.includes(dieSize)) return null;
    return {
        damageDice: 'D' + dieSize,
        damageModifier: bonus,
        numberOfDice: numDice,
        numberOfAttacks: 1
    };
}

// ─── AD&D damage expression → min / max / average ───
// Accepts NdS±M term sums ("1d4+1d4", "2d5-1") and MM range notation ("3-12").
export function damageExpressionStats(expr) {
    const t = String(expr || '').trim().replace(/\s+/g, '').toLowerCase();
    if (!t) return null;
    const range = t.match(/^(\d+)-(\d+)$/);
    if (range && Number(range[1]) < Number(range[2])) {
        const min = Number(range[1]), max = Number(range[2]);
        return { expr: t, min, max, avg: (min + max) / 2, range: true };
    }
    if (!/^[+-]?(\d*d\d+|\d+)([+-](\d*d\d+|\d+))*$/.test(t)) return null;
    let min = 0, max = 0;
    for (const m of t.matchAll(/([+-]?)(\d*)d(\d+)|([+-]?)(\d+)/g)) {
        if (m[3] !== undefined) {
            const sign = m[1] === '-' ? -1 : 1, n = Math.max(1, Number(m[2] || 1)), sides = Math.max(1, Number(m[3]));
            if (sign > 0) { min += n; max += n * sides; } else { min -= n * sides; max -= n; }
        } else {
            const v = (m[4] === '-' ? -1 : 1) * Number(m[5]);
            min += v; max += v;
        }
    }
    return { expr: t, min, max, avg: (min + max) / 2, range: false };
}

// ─── Nearest legal CRT weapon definition for a non-CRT AD&D expression ───
// Hero-vs-hero (§9.4B) rolls the AD&D expression as written; only the
// hero-vs-unit CRT path (§9.4A) needs a legal die. When no exact CRT die
// exists the closest NdS+M profile by average/min/max is returned with
// approximated:true and sourceExpr so the host can log the substitution.
export function approximateCrtDamage(expr) {
    const exact = parseDamageString(expr);
    if (exact) return exact;
    const stats = damageExpressionStats(expr);
    if (!stats) return null;
    let best = null;
    for (let n = 1; n <= 4; n++) {
        for (const die of CRT_DICE) {
            const avgDice = n * (die + 1) / 2, mod = Math.max(0, Math.round(stats.avg - avgDice));
            const score = Math.abs(stats.avg - (avgDice + mod)) * 10 + Math.abs((n * die + mod) - stats.max) + Math.abs((n + mod) - stats.min) + mod * 0.5 + n * 0.1;
            if (!best || score < best.score) best = { score, n, die, mod };
        }
    }
    return {
        damageDice: 'D' + best.die, damageModifier: best.mod, numberOfDice: best.n, numberOfAttacks: 1,
        approximated: true, sourceExpr: stats.expr
    };
}

// ─── AD&D S/M vs Large damage profiles (from module shared.js v1.14.0) ───
// 1e AD&D weapons can have different damage against S/M and L targets. Older
// module versions sometimes stored a composite string such as "1d8 / 1d12 L"
// in one field. Keep reading that representation while the explicit pair fields
// migrate existing actors.
export function splitLegacyDamagePair(rawValue) {
    const raw = String(rawValue ?? '').trim();
    if (!raw) return { sm: '', large: '' };

    // Only split an old combined field when the right-hand side is explicitly
    // marked as the Large-target value. Ordinary natural-attack routines such as
    // "1d4/1d4/1d8" must remain intact.
    const parts = raw.split(/\s*\/\s*/);
    if (parts.length === 2 && /(?:^|\s)L(?:\s|$)/i.test(parts[1])) {
        return {
            sm: parts[0].trim(),
            large: parts[1].replace(/(?:^|\s)L(?:\s|$)/i, ' ').replace(/\s+/g, ' ').trim()
        };
    }
    return { sm: raw, large: '' };
}

export function resolveDamagePair(smValue = '', largeValue = '', legacyValue = '', fallbackSM = '', fallbackLarge = '') {
    const legacy = splitLegacyDamagePair(legacyValue);
    const sm = String(smValue || legacy.sm || fallbackSM || '').trim();
    const large = String(largeValue || legacy.large || fallbackLarge || sm || '').trim();
    return { sm, large };
}

// Build the CRT weapon object while retaining a Large-target variant on the same
// component. The Large value falls back to S/M when no separate value is supplied.
export function buildWeaponDamageDefinition(smDamage, largeDamage = '', fallbackWeapon = null) {
    const smParsed = parseDamageString(smDamage);
    const base = smParsed
        ? { ...smParsed }
        : (fallbackWeapon ? { ...fallbackWeapon } : null);
    if (!base) return null;

    const largeParsed = parseDamageString(largeDamage) || smParsed || base;
    base.damageDiceVsLarge = largeParsed.damageDice || base.damageDice;
    base.damageModifierVsLarge = Number.isFinite(Number(largeParsed.damageModifier))
        ? Number(largeParsed.damageModifier)
        : (base.damageModifier || 0);
    base.numberOfDiceVsLarge = largeParsed.numberOfDice || base.numberOfDice || 1;
    return base;
}

// ─── [11.5] Cavalry component damage ───
// Cavalry melee uses one Attack Roll but adds rider and mount damage
// components. Mount attacks may be separated by '/', ',' or ';'. Each mount
// component keeps its own S/M-vs-Large profile (mountDamageL pairs positionally
// with mountDamageSM; missing entries fall back to the S/M value).
export function appendMountDamageComponents(weaponDef, mountDamageSM, mountDamageL = '') {
    if (!mountDamageSM && !mountDamageL) return weaponDef;
    const splitComponents = value => String(value || '').split(/[\/,;]+/).map(s => s.trim()).filter(Boolean);
    const smParts = splitComponents(mountDamageSM);
    const largeParts = splitComponents(mountDamageL);
    const count = Math.max(smParts.length, largeParts.length);
    const mountParts = [];
    for (let i = 0; i < count; i++) {
        const sm = smParts[i] || largeParts[i] || '';
        const large = largeParts[i] || sm;
        const parsed = buildWeaponDamageDefinition(sm, large);
        if (parsed) mountParts.push(parsed);
    }
    if (!mountParts.length) return weaponDef;
    const riderComponents = Array.isArray(weaponDef?.components)
        ? weaponDef.components.map(c => ({ ...c }))
        : [{ ...weaponDef }];
    return { components: [...riderComponents, ...mountParts], numberOfAttacks: 1 };
}

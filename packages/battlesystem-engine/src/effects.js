// effects.js v0.1.0 - 2026-08-26 — @graycloak/battlesystem-engine
// Pure effect vocabulary/evaluation shared by BATTLESYSTEM consumers.
// No DOM, Foundry, board state, or dice dependencies.
//
// Design notes:
// - Accepts the v0.50 board's legacy `stat` + `mode: "set"` shape.
// - Canonicalizes `set` to `override` while retaining `stat` as a compatibility alias.
// - Numeric modes mirror the useful ARS Active Effect vocabulary without importing
//   Foundry system paths or document semantics into the engine.

export const EFFECT_MODES = Object.freeze([
    'add', 'subtract', 'multiply', 'override', 'upgrade', 'downgrade', 'custom'
]);

export const EFFECT_MODE_ALIASES = Object.freeze({
    set: 'override',
    plus: 'add',
    minus: 'subtract'
});

function text(value = '') {
    return String(value ?? '').trim();
}

function nullableNumber(value) {
    if (value === null || value === undefined || text(value) === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

export function normalizeEffectMode(value = 'add') {
    const raw = text(value).toLowerCase() || 'add';
    const mode = EFFECT_MODE_ALIASES[raw] || raw;
    return EFFECT_MODES.includes(mode) ? mode : 'add';
}

export function normalizeEffect(raw = {}, index = 0, options = {}) {
    raw = raw && typeof raw === 'object' ? raw : {};
    const key = text(raw.key ?? raw.stat).toLowerCase();
    const label = text(raw.label ?? raw.name ?? key ?? `effect ${index + 1}`) || `effect ${index + 1}`;
    if (!key && !label) return null;
    const mode = normalizeEffectMode(raw.mode ?? raw.type);
    const numeric = mode !== 'custom';
    const value = numeric ? nullableNumber(raw.value) : raw.value;
    const defaultCondition = options.defaultCondition ?? 'equipped';
    const condition = text(raw.condition ?? raw.when ?? defaultCondition);
    const properties = Array.isArray(raw.properties)
        ? raw.properties.map(text).filter(Boolean)
        : text(raw.properties).split(',').map(text).filter(Boolean);
    return {
        ...raw, // preserve host provenance such as itemId/itemName/source metadata
        id: text(raw.id) || `fx-${index + 1}`,
        key,
        stat: key, // v0.50 compatibility alias; consumers should prefer key.
        mode,
        value,
        label,
        condition,
        properties,
        notes: text(raw.notes),
        enabled: raw.enabled !== false
    };
}

export function normalizeEffects(rows = [], options = {}) {
    return (Array.isArray(rows) ? rows : [])
        .map((row, index) => normalizeEffect(row, index, options))
        .filter(Boolean);
}

export function applyNumericEffect(before, effect) {
    const e = normalizeEffect(effect, 0, { defaultCondition: '' });
    if (!e || e.enabled === false || e.mode === 'custom' || e.value === null) {
        return { applied: false, value: before, effect: e };
    }
    const base = Number(before);
    const amount = Number(e.value);
    if (!Number.isFinite(amount)) return { applied: false, value: before, effect: e };
    if (!Number.isFinite(base) && e.mode !== 'override') {
        return { applied: false, value: before, effect: e };
    }
    let value;
    switch (e.mode) {
        case 'subtract': value = base - amount; break;
        case 'multiply': value = base * amount; break;
        case 'override': value = amount; break;
        case 'upgrade': value = Math.max(base, amount); break;
        case 'downgrade': value = Math.min(base, amount); break;
        case 'add':
        default: value = base + amount; break;
    }
    return Number.isFinite(value)
        ? { applied: true, value, effect: e }
        : { applied: false, value: before, effect: e };
}

export function applyEffectsToProfile(profile = {}, effects = [], options = {}) {
    const out = { ...(profile || {}) };
    const aliases = { ...(options.aliases || {}) };
    const allowed = Array.isArray(options.allowedStats) && options.allowedStats.length
        ? new Set(options.allowedStats.map(x => text(x).toLowerCase()))
        : null;
    const breakdown = [];
    for (const raw of normalizeEffects(effects, { defaultCondition: '' })) {
        if (raw.enabled === false || !raw.key) continue;
        let key = aliases[raw.key] || raw.key;
        if (key.startsWith('save:')) key = key.slice(5);
        if (allowed && !allowed.has(key)) continue;
        const before = out[key];
        const result = applyNumericEffect(before, raw);
        if (!result.applied) continue;
        out[key] = result.value;
        breakdown.push({ stat: key, key, before, after: result.value, effect: raw });
    }
    if (breakdown.length && options.breakdownKey !== false) {
        out[options.breakdownKey || 'effectBreakdown'] = breakdown;
    }
    return out;
}

export class BattlesystemEffects {
    static normalizeMode(value) { return normalizeEffectMode(value); }
    static normalize(raw, index = 0, options = {}) { return normalizeEffect(raw, index, options); }
    static normalizeAll(rows, options = {}) { return normalizeEffects(rows, options); }
    static applyNumeric(before, effect) { return applyNumericEffect(before, effect); }
    static applyProfile(profile, effects, options = {}) { return applyEffectsToProfile(profile, effects, options); }
}

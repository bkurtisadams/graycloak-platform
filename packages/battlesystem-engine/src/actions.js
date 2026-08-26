// actions.js v0.1.0 - 2026-08-26 — @graycloak/battlesystem-engine
// Pure action/action-group vocabulary shared by BATTLESYSTEM consumers.
// No DOM, Foundry, board state, or dice dependencies.
//
// The module intentionally understands both the board's v0.50 flat action shape
// and ARS-like ordered action groups. Resolution remains in the host/rules adapters.

export const CHARACTER_ACTION_KINDS = Object.freeze([
    'meleeAttack', 'missileAttack', 'castSpell', 'activateMagic', 'innate', 'useItem'
]);

export const ACTION_STEP_KINDS = Object.freeze([
    'attack', 'damage', 'save', 'check', 'effect', 'item-effect', 'resource', 'cast', 'none', 'custom'
]);

function text(value = '') {
    return String(value ?? '').trim();
}

function nullableInt(value) {
    if (value === null || value === undefined || text(value) === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.round(n)) : null;
}

function resourceFrom(raw = {}) {
    const nested = raw.resource && typeof raw.resource === 'object' ? raw.resource : {};
    const count = nested.count && typeof nested.count === 'object' ? nested.count : {};
    const kind = text(raw.resourceKind ?? nested.kind ?? nested.type);
    const cost = Math.max(0, Math.round(Number(raw.resourceCost ?? raw.cost ?? nested.cost ?? count.cost) || 0));
    return kind || cost ? { kind, cost } : null;
}

export function normalizeAction(raw = {}, index = 0, options = {}) {
    raw = raw && typeof raw === 'object' ? raw : {};
    const name = text(raw.name ?? raw.label) || 'Use item';
    const requestedKind = text(raw.kind ?? raw.type) || options.fallbackKind || 'useItem';
    const allowed = Array.isArray(options.allowedKinds) ? new Set(options.allowedKinds) : null;
    const kind = allowed && !allowed.has(requestedKind)
        ? (options.fallbackKind || 'useItem')
        : requestedKind;
    const resource = resourceFrom(raw);
    const effectiveLevel = nullableInt(raw.effectiveLevel ?? raw.level);
    const effects = Array.isArray(raw.effects) ? raw.effects.map(x => ({ ...x })) : [];
    return {
        id: text(raw.id) || `act-${index + 1}`,
        name,
        kind,
        target: raw.target && typeof raw.target === 'object' ? { ...raw.target } : (text(raw.target) || null),
        formula: text(raw.formula ?? raw.damageFormula),
        save: raw.save && typeof raw.save === 'object' ? { ...raw.save } : (text(raw.save) || null),
        effects,
        resource,
        resourceKind: resource?.kind || '', // v0.50 compatibility fields
        resourceCost: resource?.cost || 0,
        effectiveLevel,
        sourceFunction: text(raw.sourceFunction),
        notes: text(raw.notes),
        properties: Array.isArray(raw.properties)
            ? raw.properties.map(text).filter(Boolean)
            : text(raw.properties).split(',').map(text).filter(Boolean)
    };
}

export function normalizeActionGroup(raw = {}, index = 0, options = {}) {
    raw = raw && typeof raw === 'object' ? raw : {};
    const actions = (Array.isArray(raw.actions) ? raw.actions : [])
        .map((action, i) => normalizeAction(action, i, options.actionOptions || {}))
        .filter(Boolean);
    return {
        id: text(raw.id) || `group-${index + 1}`,
        name: text(raw.name ?? raw.label) || `Action Group ${index + 1}`,
        actions,
        notes: text(raw.notes)
    };
}

export function normalizeActionGroups(groups = [], options = {}) {
    return (Array.isArray(groups) ? groups : [])
        .map((group, index) => normalizeActionGroup(group, index, options))
        .filter(Boolean);
}

export function flattenActionGroups(groups = [], options = {}) {
    return normalizeActionGroups(groups, options).flatMap(group =>
        group.actions.map((action, actionIndex) => ({
            ...action,
            groupId: group.id,
            groupName: group.name,
            actionIndex
        }))
    );
}

export function buildUnifiedActionSurface(sources = {}) {
    const out = [];
    for (const weapon of Array.isArray(sources.weapons) ? sources.weapons : []) {
        if (!weapon?.name) continue;
        out.push({
            id: text(weapon.id) || `weapon:${text(weapon.itemId)}`,
            kind: text(weapon.kind) || 'meleeAttack',
            name: text(weapon.name),
            source: 'item',
            itemId: text(weapon.itemId),
            weapon: weapon.weapon || weapon
        });
    }
    for (const spell of Array.isArray(sources.spells) ? sources.spells : []) {
        if (!spell?.name) continue;
        out.push({
            id: text(spell.id) || `spell:${Number(spell.level) || 0}:${text(spell.key || spell.name)}`,
            kind: 'castSpell',
            name: text(spell.name),
            source: 'spell',
            level: Number(spell.level) || 0
        });
    }
    for (const item of Array.isArray(sources.items) ? sources.items : []) {
        const itemId = text(item?.itemId ?? item?.id);
        for (const rawAction of Array.isArray(item?.actions) ? item.actions : []) {
            const action = normalizeAction(rawAction, 0, {
                allowedKinds: CHARACTER_ACTION_KINDS,
                fallbackKind: 'useItem'
            });
            out.push({
                id: `item:${itemId}:${action.id}`,
                kind: action.kind,
                name: action.name,
                source: 'item',
                itemId,
                action
            });
        }
    }
    for (const raw of Array.isArray(sources.innate) ? sources.innate : []) {
        const entry = typeof raw === 'string' ? { name: raw } : (raw || {});
        const name = text(entry.name);
        if (!name) continue;
        out.push({
            id: text(entry.id) || `innate:${text(entry.key || name)}`,
            kind: 'innate',
            name,
            source: 'innate'
        });
    }
    return out;
}

export class BattlesystemActions {
    static normalize(raw, index = 0, options = {}) { return normalizeAction(raw, index, options); }
    static normalizeGroup(raw, index = 0, options = {}) { return normalizeActionGroup(raw, index, options); }
    static normalizeGroups(groups, options = {}) { return normalizeActionGroups(groups, options); }
    static flattenGroups(groups, options = {}) { return flattenActionGroups(groups, options); }
    static buildSurface(sources = {}) { return buildUnifiedActionSurface(sources); }
}

// Local campaign persistence. No server authority or cross-player synchronization yet.
export const KEY = 'graycloak.gw.campaign.v1';
export function readCampaign(storage = localStorage) { const raw = storage.getItem(KEY); return raw ? JSON.parse(raw) : { version: 1, active: null, characters: {} }; }
export function writeCampaign(data, storage = localStorage) { storage.setItem(KEY, JSON.stringify(data)); return data; }
export function saveRecord(record, id, storage = localStorage) { const data = readCampaign(storage); id = id || (globalThis.crypto?.randomUUID?.() ?? ('local-' + Date.now() + '-' + Math.random().toString(36).slice(2))); const old = data.characters[id]; if (old?.encounter || old?.pendingEncounter)
    throw Error('Resume and finish the active encounter before editing this character.'); if (old?.started) {
    const comparable = r => JSON.stringify([Object.fromEntries(Object.entries(r.base).filter(([k]) => k !== 'name')), r.generation, r.choices, r.equipment, r.weightKg]);
    if (comparable(old.record) !== comparable(record))
        throw Error('Adventuring characters cannot be rebuilt in the workshop. Equip owned gear in the world, or create a new character.');
} data.characters[id] = { ...old, id, record: structuredClone(record), progress: old?.progress ?? null, inventory: old?.inventory ?? [], position: old?.position ?? { x: 2, y: 5 }, encounter: old?.encounter ?? null }; data.active = id; writeCampaign(data, storage); return id; }
export function selectRecord(id, storage = localStorage) { const d = readCampaign(storage); if (!d.characters[id])
    throw Error('Character not found'); d.active = id; writeCampaign(d, storage); return d.characters[id]; }
export function updateEntry(id, fn, storage = localStorage) { const d = readCampaign(storage); if (!d.characters[id])
    throw Error('Character not found'); const next = fn(structuredClone(d.characters[id])); d.characters[id] = next; writeCampaign(d, storage); return next; }
export function applyProgress(c, p) { if (!p)
    return c; return { ...c, hp: Math.max(0, c.maxHp - p.damage), experience: p.experience, attributes: { ...c.attributes, MS: p.MS }, effects: { ...c.effects, mentalResistance: p.mentalResistance }, bleeding: p.bleeding, totalHealingUses: p.totalHealingUses ?? [] }; }
export function storeCombat(entry, state) { const p = state.actors.find(a => a.id === 'player'); if (!p)
    throw Error('Missing player'); return { ...entry, inventory: entry.inventory.map(i => i.id === 'outpost-device' && p.artifact ? { ...i, artifact: p.artifact } : i), encounter: state.status === 'active' ? structuredClone(state) : null, pendingEncounter: null, clearingResolved: entry.clearingResolved || state.site === 'clearing' && ['victory', 'peaceful'].includes(state.status), progress: { damage: p.maxHp - p.hp, experience: p.experience, MS: p.attributes.MS, mentalResistance: p.effects.mentalResistance, bleeding: p.bleeding, totalHealingUses: p.totalHealingUses } }; }
// Prototype settlement map, not the existing authored campaign geography.
export const WORLD = { width: 20, height: 12, sites: [{ x: 2, y: 5, name: 'Eden Valley', kind: 'town' }, { x: 10, y: 5, name: 'Forest clearing', kind: 'encounter' }, { x: 17, y: 8, name: 'Ancient outpost', kind: 'ruin' }], walls: [[7, 3], [7, 4], [7, 6], [7, 7], [13, 2], [13, 3], [13, 4], [13, 5], [16, 7], [17, 7], [18, 7]] };
export function worldPath(start, end) { if (!Number.isInteger(end.x) || !Number.isInteger(end.y) || end.x < 0 || end.y < 0 || end.x >= WORLD.width || end.y >= WORLD.height)
    return null; const q = [[start, []]], seen = new Set([`${start.x},${start.y}`]), walls = new Set(WORLD.walls.map(p => p.join(','))); while (q.length) {
    const [p, path] = q.shift();
    if (p.x === end.x && p.y === end.y)
        return path;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = p.x + dx, y = p.y + dy, k = `${x},${y}`;
        if (x < 0 || y < 0 || x >= WORLD.width || y >= WORLD.height || seen.has(k) || walls.has(k))
            continue;
        seen.add(k);
        q.push([{ x, y }, [...path, { x, y }]]);
    }
} return null; }

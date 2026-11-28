// Local campaign persistence. No server authority or cross-player synchronization yet.
import { startOf, FIRST_SCENE } from './scenes.js';
import { thresholdsCrossed, rollExperienceBonus, radiationMutation } from '../packages/gamma-world-rules/index.js';
export const KEY = 'graycloak.gw.campaign.v1';
export function readCampaign(storage = localStorage) { const raw = storage.getItem(KEY); return raw ? JSON.parse(raw) : { version: 1, active: null, characters: {} }; }
export function writeCampaign(data, storage = localStorage) { storage.setItem(KEY, JSON.stringify(data)); return data; }
export function saveRecord(record, id, storage = localStorage) { const data = readCampaign(storage); id = id || (globalThis.crypto?.randomUUID?.() ?? ('local-' + Date.now() + '-' + Math.random().toString(36).slice(2))); const old = data.characters[id]; if (old?.encounter || old?.pendingEncounter)
    throw Error('Resume and finish the active encounter before editing this character.'); if (old?.started) {
    const comparable = r => JSON.stringify([Object.fromEntries(Object.entries(r.base).filter(([k]) => k !== 'name')), r.generation, r.choices, r.equipment, r.weightKg]);
    if (comparable(old.record) !== comparable(record))
        throw Error('Adventuring characters cannot be rebuilt in the workshop. Equip owned gear in the world, or create a new character.');
} data.characters[id] = { ...old, id, record: structuredClone(record), progress: old?.progress ?? null, inventory: old?.inventory ?? [], ...(old ? { position: old.position ?? { x: 2, y: 5 } } : startOf(FIRST_SCENE)), encounter: old?.encounter ?? null }; data.active = id; writeCampaign(data, storage); return id; }
export function selectRecord(id, storage = localStorage) { const d = readCampaign(storage); if (!d.characters[id])
    throw Error('Character not found'); d.active = id; writeCampaign(d, storage); return d.characters[id]; }
export function updateEntry(id, fn, storage = localStorage) { const d = readCampaign(storage); if (!d.characters[id])
    throw Error('Character not found'); const next = fn(structuredClone(d.characters[id])); d.characters[id] = next; writeCampaign(d, storage); return next; }
export function applyProgress(c, p) { if (!p)
    return c; return { ...c, hp: Math.max(0, c.maxHp - p.damage), experience: p.experience, attributes: { ...c.attributes, MS: p.MS }, effects: { ...c.effects, mentalResistance: p.mentalResistance }, bleeding: p.bleeding, totalHealingUses: p.totalHealingUses ?? [] }; }
// Experience bonuses (printed p.42). Mental Strength gains live in progress because combat already carries them;
// the rest are replayed onto the derived character. Constitution gained this way does not reroll hit points.
export function applyAdvancement(c, entry) {
    const bonuses = entry?.advancement?.bonuses;
    if (!bonuses?.length) return c;
    const attributes = { ...c.attributes }, effects = { ...c.effects };
    for (const b of bonuses) {
        if (b.kind === 'attribute' && b.attribute !== 'MS' && attributes[b.attribute] < 18) {
            attributes[b.attribute]++;
            if (b.attribute === 'CN') { if (effects.poisonResistance < 18) effects.poisonResistance++; effects.radiationResistance = Math.min(18, effects.radiationResistance + 1); }
        }
        else if (b.kind === 'hit') effects.hitModifier = (effects.hitModifier ?? 0) + 1;
        else if (b.kind === 'damage') effects.damagePerDie = (effects.damagePerDie ?? 0) + 1;
    }
    return { ...c, attributes, effects };
}
export function settleExperience(entry, before, attributes, rng = Math.random) {
    const after = entry.progress?.experience ?? 0;
    const crossed = after > before ? thresholdsCrossed(before, after) : [];
    if (!crossed.length) return entry;
    const e = structuredClone(entry), current = { ...attributes };
    e.advancement = { bonuses: [...(e.advancement?.bonuses ?? [])], news: [...(e.advancement?.news ?? [])] };
    for (const threshold of crossed) {
        const b = rollExperienceBonus(current, rng);
        if (b.kind === 'attribute') {
            current[b.attribute]++;
            if (b.attribute === 'MS') { e.progress.MS = Math.min(18, e.progress.MS + 1); e.progress.mentalResistance = Math.min(18, e.progress.mentalResistance + 1); }
        }
        e.advancement.bonuses.push({ threshold, ...b });
        e.advancement.news.push(`Reached ${threshold.toLocaleString('en-US')} experience: d10 ${b.roll}, ${b.text}.`);
    }
    return e;
}
// Antidotes used in the fight leave the bag; radiation results (M, or a survived D) are filed to appear a week later.
function afterCombat(entry, state, p) {
    const left = p.antidotes ? [...p.antidotes] : null;
    const inventory = entry.inventory.filter(i => { if (!i.antidote || !left) return true; const k = left.indexOf(i.antidote); if (k < 0) return false; left.splice(k, 1); return true; });
    const stamp = `${entry.days ?? 0}:${entry.minutes ?? 360}:${entry.steps ?? 0}`, known = new Set((entry.radiation ?? []).map(r => r.id));
    const fresh = (state.pendingEffects ?? []).map((e, i) => ({ id: `${stamp}:${i}`, kind: e.kind, due: (entry.days ?? 0) + 7 })).filter(r => !known.has(r.id));
    return { inventory, radiation: [...(entry.radiation ?? []), ...fresh] };
}
export function manifestRadiation(entry, rng = Math.random) {
    const due = (entry.radiation ?? []).filter(r => !r.done && (entry.days ?? 0) >= r.due);
    if (!due.length) return entry;
    const acquired = [...(entry.acquired ?? [])], news = [];
    for (const r of due) {
        const what = r.kind === 'defect' ? 'mutational defect' : 'new mutation', got = radiationMutation(entry.record.base.species, r.kind, [...(entry.record.choices ?? []), ...acquired], rng);
        if (got) { acquired.push(got.id); news.push(`A week after the radiation, a ${what} appears: ${got.name}.`); }
        else news.push(`A week after the radiation a ${what} was due, but this character type has no mutation chart in the game. Referee ruling needed.`);
    }
    return { ...entry, acquired, radiation: entry.radiation.map(r => due.includes(r) ? { ...r, done: true } : r), advancement: { bonuses: entry.advancement?.bonuses ?? [], news: [...(entry.advancement?.news ?? []), ...news] } };
}
export function storeCombat(entry, state) { const p = state.actors.find(a => a.id === 'player'); if (!p)
    throw Error('Missing player'); const kept = afterCombat(entry, state, p); return { ...entry, radiation: kept.radiation, inventory: kept.inventory.map(i => i.id === 'outpost-device' && p.artifact ? { ...i, artifact: p.artifact } : i), encounter: state.status === 'active' ? structuredClone(state) : null, pendingEncounter: null, clearingResolved: entry.clearingResolved || state.site === 'clearing' && ['victory', 'peaceful'].includes(state.status), progress: { damage: p.maxHp - p.hp, experience: p.experience, MS: p.attributes.MS, mentalResistance: p.effects.mentalResistance, bleeding: p.bleeding, totalHealingUses: p.totalHealingUses } }; }
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

import { getWeapon, getArmor, deriveCharacter, healRest } from '../packages/gamma-world-rules/index.js';
import { applyProgress } from './campaign.js';
// Printed p.37 category prices. Specific stock, resale, starting purse and local NPCs are referee policies.
export const STOCK = Object.freeze([
    { id: 'dagger', kind: 'weapon', price: 50 }, { id: 'short-sword', kind: 'weapon', price: 50 }, { id: 'long-sword', kind: 'weapon', price: 50 }, { id: 'arrow', kind: 'weapon', price: 75 }, { id: 'crossbow', kind: 'weapon', price: 100 },
    { id: 'shield', kind: 'armor', price: 50 }, { id: 'hide', kind: 'armor', price: 300 }, { id: 'supplies', kind: 'item', price: 5, name: 'Travel supplies' }, { id: 'spare-part', kind: 'item', price: 5, name: 'Robot spare part' }
].map(x => Object.freeze({ ...x, name: x.name ?? (x.kind === 'weapon' ? getWeapon(x.id).name : getArmor(x.id).name) })));
export const purse = e => e.domars ?? 100;
export function owned(e) { return e.owned ?? { weapon: [e.record.equipment.weaponId], armor: ['none', e.record.equipment.armorId].filter((v, i, a) => a.indexOf(v) === i) }; }
export function characterFor(e) { const r = e.record; return applyProgress(deriveCharacter(r.base, r.generation, r.choices, { ...r.equipment, weightKg: r.weightKg }), e.progress); }
function check(e, town = false) { if (e.encounter || e.pendingEncounter)
    throw Error('Finish the encounter first'); if (characterFor(e).hp <= 0)
    throw Error('Character is dead'); if (town && (e.position.x !== 2 || e.position.y !== 5))
    throw Error('Visit Eden Valley to trade or rest'); }
export function buy(e, id) { check(e, true); const s = STOCK.find(x => x.id === id); if (!s)
    throw Error('Item unavailable'); if (purse(e) < s.price)
    throw Error('Not enough domars'); const o = structuredClone(owned(e)); if (s.kind !== 'item' && o[s.kind].includes(id))
    throw Error('Already owned'); if (s.kind === 'item' && id === 'supplies' && e.inventory.some(i => i.id === id))
    throw Error('Already owned'); if (s.kind === 'item' && id === 'spare-part' && e.record.base.species !== 'robot')
    throw Error('Only robots can use these parts in this prototype'); return { ...e, domars: purse(e) - s.price, owned: s.kind === 'item' ? o : { ...o, [s.kind]: [...o[s.kind], id] }, inventory: s.kind === 'item' ? [...e.inventory, { id, name: s.name }] : e.inventory }; }
export function equip(e, kind, id) { check(e); if (!['armor', 'weapon'].includes(kind) || !owned(e)[kind].includes(id))
    throw Error('Equipment is not owned'); return { ...e, record: { ...e.record, equipment: { ...e.record.equipment, [kind + 'Id']: id } } }; }
export function sell(e, id) { check(e, true); const s = STOCK.find(x => x.id === id && x.kind !== 'item'); if (!s || !owned(e)[s.kind].includes(id))
    throw Error('Item not for sale'); if (e.record.equipment[s.kind + 'Id'] === id)
    throw Error('Unequip item before selling'); const o = structuredClone(owned(e)); o[s.kind] = o[s.kind].filter(x => x !== id); return { ...e, domars: purse(e) + Math.floor(s.price / 2), owned: o }; }
export function rest(e, untilHealed = false) { check(e, true); const c = characterFor(e); if (c.species === 'robot')
    throw Error('Robots require repairs'); if (c.bleeding)
    throw Error('Bind wounds before resting'); if (c.hp === c.maxHp)
    throw Error('Already at full health'); const days = untilHealed ? c.maxHp - c.hp : 1; const healed = healRest(c, days); return { ...e, days: (e.days ?? 0) + days, progress: { ...e.progress, damage: healed.maxHp - healed.hp, experience: c.experience, MS: c.attributes.MS, mentalResistance: c.effects.mentalResistance, bleeding: c.bleeding, totalHealingUses: c.totalHealingUses ?? [] } }; }
export function repair(e) { check(e, true); const c = characterFor(e), i = e.inventory.findIndex(x => x.id === 'spare-part'); if (c.species !== 'robot' || i < 0 || c.hp === c.maxHp)
    throw Error('Repair needs a damaged robot and spare parts'); return { ...e, inventory: e.inventory.filter((_, j) => j !== i), progress: { ...e.progress, damage: c.maxHp - c.hp - 1, experience: c.experience, MS: c.attributes.MS, mentalResistance: c.effects.mentalResistance, bleeding: false, totalHealingUses: [] } }; }

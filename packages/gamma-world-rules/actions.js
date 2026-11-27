// Shared availability policy; actual commands remain validated by encounter.js.
import { availableActions, interactivePlan, canParley } from './encounter.js';
import { getWeapon } from './equipment.js';
export const isTextEntry = target => !!target?.closest?.('input,select,textarea,[contenteditable]:not([contenteditable="false"])');
const status = (id, label, visible, reason = '', extra = {}) => ({ id, label, visible, enabled: visible && !reason, reason, ...extra });
export function combatActions(s, targetId) {
    const p = s?.actors.find(a => a.id === 'player');
    if (!p)
        return [];
    const list = availableActions(p), active = s.status === 'active', weapon = p.equipment?.weaponId && getWeapon(p.equipment.weaponId), mode = ['arrow', 'crossbow', 'sling-stone', 'sling-bullet'].includes(p.equipment?.weaponId) ? 'missile' : 'melee';
    const check = (id, label, action, attackMode, visible = true) => { let reason = ''; if (visible) {
        try {
            interactivePlan(s, action, targetId, attackMode);
        }
        catch (e) {
            reason = e.message;
        }
    } return status(id, label, visible, reason, { command: { type: 'attack', action, targetId, mode: attackMode } }); };
    const result = [check('attack', weapon ? `Attack · ${weapon.name}` : 'Attack', 'weapon', mode, !!weapon), check('throw', 'Throw', 'weapon', 'missile', !!weapon && mode === 'melee' && weapon.range !== null)];
    for (const a of list.filter(a => !['weapon', 'advance', 'rest', 'bind', 'flee'].includes(a.id)))
        result.push(check(a.id, a.label, a.id));
    result.push(check('bind', 'Bind wounds', 'bind', undefined, !!p.bleeding), check('flee', 'Withdraw', 'flee'), status('parley', 'Parley', canParley(s), '', { command: { type: 'parley' } }), status('endTurn', 'End Turn', true, active ? '' : 'Encounter ended', { command: { type: 'end' } }));
    return result;
}
export function worldActions({ entry, character, site, moving = false }) {
    const c = character, e = entry, locked = !c ? 'Select a character' : c.hp <= 0 ? 'Character is deceased' : e.encounter || e.pendingEncounter ? 'Resume encounter first' : '', a = e?.inventory?.find(i => i.id === 'outpost-device')?.artifact;
    return [status('interact', site?.kind === 'town' ? 'Talk to Mara' : site?.kind === 'encounter' ? 'Investigate clearing' : 'Search outpost', !!site && !(site.kind === 'encounter' && e?.clearingResolved) && !(site.kind === 'ruin' && a), locked), status('supply', 'Collect supplies', site?.kind === 'town' && !e?.inventory?.some(i => i.id === 'supplies'), locked), status('resume', 'Resume encounter', !!(e?.encounter || e?.pendingEncounter)), status('experiment', 'Experiment', !!a && !a.identified, locked), status('install', 'Install hydrogen cell', !!a?.identified && !!e?.inventory?.some(i => i.id === 'hydrogen-cell'), locked), status('stop', 'Stop', moving)];
}
// Slots retain order even if temporarily disabled. Unsupported/passive mutations never become commands.
export function powerSlots(actions, preferred = []) { const powers = actions.filter(a => !['attack', 'throw', 'bind', 'flee', 'parley', 'endTurn'].includes(a.id) && a.visible); const ids = [...new Set([...preferred, ...powers.map(a => a.id)])]; return ids.map(id => powers.find(a => a.id === id)).filter(Boolean); }

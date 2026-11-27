import { readCampaign, writeCampaign, saveRecord, selectRecord, updateEntry } from './campaign.js';
import { previewCharacter } from '../packages/gamma-world-rules/index.js';
import { characterFor } from './settlement.js';
export const LEGACY = 'graycloak.gw.workshop.v2';
export function validateRecord(r) {
    if (r?.format !== 'graycloak-gw-workshop' || r.version !== 2) throw Error('Expected a Gamma World workshop export (version 2).');
    return previewCharacter(r.base, r.generation, r.choices, {...r.equipment, weightKg:r.weightKg});
}
export function migrateLegacy(storage = localStorage) {
    const key = 'graycloak.gw.legacyMigrated';
    if (storage.getItem(key)) return;
    const raw = storage.getItem(LEGACY);
    if (raw) {
        const r = JSON.parse(raw); validateRecord(r);
        const same = Object.values(readCampaign(storage).characters).some(e => JSON.stringify(e.record) === JSON.stringify(r) || JSON.stringify([e.record.base,e.record.generation,e.record.choices]) === JSON.stringify([r.base,r.generation,r.choices]));
        if (!same && !Object.keys(readCampaign(storage).characters).length) saveRecord(r, null, storage);
    }
    storage.setItem(key,'1');
}
export function survivorStatus(e) {
    try { const p = validateRecord(e.record); if (e.wizardDraft || !p.selectionComplete) return {label:'Draft', ready:false, hp:null};
        const c = characterFor(e); return {label:e.encounter || e.pendingEncounter ? 'Encounter in progress' : c.hp <= 0 ? 'Deceased' : 'Ready', ready:c.hp>0 || !!e.encounter, hp:`${c.hp}/${c.maxHp} HP`};
    } catch { return {label:'Needs review',ready:false,hp:null}; }
}
export function renameSurvivor(id,name,storage=localStorage) {
    name=String(name).trim(); if (!name || name.length>80) throw Error('Enter a name of 1–80 characters.');
    return updateEntry(id,e=>{e.record.base.name=name; if(e.record.character) e.record.character.name=name; if(e.encounter) {const p=e.encounter.actors?.find(a=>a.id==='player'); if(p) p.name=name;} return e;},storage);
}
export function deleteSurvivor(id,storage=localStorage) {
    const d=readCampaign(storage); if(!d.characters[id]) throw Error('Survivor not found'); delete d.characters[id]; if(d.active===id) d.active=null; writeCampaign(d,storage);
}

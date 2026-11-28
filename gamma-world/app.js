import { readCampaign, saveRecord, selectRecord, applyProgress, updateEntry } from './campaign.js';
import * as gw from '../packages/gamma-world-rules/index.js';
const $ = id => document.getElementById(id);
let draft = null, choices = [], character = null, recordId = null;
const node = (tag, text, cls) => { const n = document.createElement(tag); n.textContent = text; if (cls)
    n.className = cls; return n; };
function stat(label, value) { const div = node('div', '', 'stat'); div.append(node('small', label), node('strong', value)); return div; }
function event(message) { $('events').append(node('p', message)); if ($('events').children.length > 100)
    $('events').firstChild.remove(); $('events').scrollTop = $('events').scrollHeight; }
function guidance(message) { $('status').textContent = message; $('guidance').textContent = message; }
function options(id, entries) { $(id).replaceChildren(...entries.map(e => { const o = node('option', e.name); o.value = e.id; return o; })); }
options('weapon', gw.WEAPONS);
options('armor', gw.ARMOR.filter(a => !a.advanced));
$('weapon').value = 'club';
$('species').addEventListener('change', () => { $('stockLabel').hidden = $('species').value !== 'animal'; $('stock').required = $('species').value === 'animal'; $('mutationMethod').disabled = ['psh', 'robot'].includes($('species').value); });
$('species').dispatchEvent(new Event('change'));
function slots() { return gw.mutationSlots(draft.character, draft.mutations); }
function render() { const c = draft.character; $('charName').textContent = c.name || 'Unnamed survivor'; $('type').textContent = ({ psh: 'Pure Strain Human', humanoid: 'Humanoid', animal: 'Mutated Animal', plant: 'Intelligent Plant (experimental)', robot: 'Robot (experimental)' })[c.species] + (c.animalStock ? ' · ' + c.animalStock : ''); const list = $('mutations'); list.replaceChildren(); const ss = slots(); if (!ss.length)
    list.append(node('p', 'No mutations for this character type.')); for (const [i, slot] of ss.entries()) {
    const row = node('div', '', 'mutation');
    if (slot.entry) {
        choices[i] = slot.entry.id;
        row.append(node('strong', slot.entry.name + (slot.entry.defect ? ' (defect)' : '')), node('small', `${slot.kind} · ${slot.defectOnly ? 'Assigned by referee' : 'Roll ' + slot.roll} · ${gw.mutationCoverage(slot.entry.id).detail}`));
    }
    else {
        const select = node('select', '');
        select.setAttribute('aria-label', `${slot.kind} mutation selection`);
        const placeholder = node('option', 'Choose ' + (slot.defectOnly ? 'defect' : 'mutation'));
        placeholder.value = '';
        select.append(placeholder);
        const entries = slot.kind === 'either' ? [...gw.PHYSICAL, ...gw.MENTAL] : slot.kind === 'physical' ? gw.PHYSICAL : slot.kind === 'plant' ? gw.PLANT : gw.MENTAL;
        for (const entry of entries.filter(e => slot.defectOnly ? e.defect : !slot.goodOnly || !e.defect)) {
            const option = node('option', entry.name + (entry.defect ? ' (defect)' : '') + '');
            option.value = entry.id;
            select.append(option);
        }
        select.value = choices[i] || '';
        choices[i] = select.value;
        select.addEventListener('change', () => { if (select.value && draft.mutations.strictSelections && choices.some((id, j) => j !== i && id === select.value)) {
            select.value = choices[i] || '';
            guidance('That mutation is already selected. Choose a different one.');
            return;
        } choices[i] = select.value; update(); });
        row.append(node('small', `${slot.kind} · ${slot.defectOnly ? 'referee defect selection (local demo)' : 'player choice'}`), select);
    }
    list.append(row);
} update(); }
function update() { if (draft)
    $('saveStatus').textContent = 'Unsaved changes. Save character or draft above.'; character = null; $('effects').replaceChildren(); const base = draft?.character; if (!base)
    return; let c = base; try {
    c = gw.previewCharacter(base, draft.mutations, choices, { armorId: $('armor').value, weaponId: $('weapon').value, weightKg: Number($('weight').value) });
    if (recordId) {
        const progress = readCampaign().characters[recordId]?.progress;
        if (progress)
            c = applyProgress(c, progress);
    }
    character = c.selectionComplete && c.hp > 0 ? c : null;
    guidance(c.reviewRequired.length ? 'Draft: ' + c.reviewRequired.join('; ') : 'Character ready for local rules tests.');
    for (const id of c.mutations) {
        const e = [...gw.PHYSICAL, ...gw.MENTAL, ...gw.PLANT].find(e => e.id === id);
        const m = gw.mutationCoverage(id);
        $('effects').append(node('p', `${e.name}: ${m.detail}`));
    }
    const fx = c.effects;
    if (c.species === 'robot')
        $('effects').append(node('p', 'Robot extension: no biological mutations, ordinary mental attacks or poison effects; repair and power supply pending. No PSH identification privilege.'));
    else
        $('effects').append(node('p', `Mental resistance ${fx.mentalResistance} · Poison resistance ${fx.poisonResistance} · Radiation resistance ${fx.radiationResistance} · Normal movement multiplier ×${fx.movementMultiplier}`));
}
catch (err) {
    guidance(err.message);
} $('attributes').replaceChildren(...Object.entries(c.attributes).map(([k, v]) => stat(k, v))); $('derived').replaceChildren(stat('Hit Points', `${c.hp}/${c.maxHp}`), stat('Base HP', base.maxHp), stat('Mutation HP bonus', c.maxHp - base.maxHp), stat('AC', c.armorClass), stat('Natural AC', c.naturalArmorClass ?? base.armorClass), stat('Experience', c.experience), stat('Hit modifier', gw.dexterityHitModifier(c.attributes.DX) + (c.effects?.hitModifier ?? 0))); for (const id of ['attack', 'sandbox', 'enterWorld'])
    $(id).disabled = !character; $('sandbox').textContent = character ? 'Practice combat' : 'Practice combat (finish selections)'; for (const id of ['download', 'save'])
    $(id).disabled = !draft; $('save').textContent = character ? 'Save character' : 'Save draft'; $('download').textContent = character ? 'Export JSON' : 'Export draft JSON'; }
$('builder').addEventListener('submit', e => { e.preventDefault(); try {
    const c = gw.generateCharacter({ name: $('name').value, species: $('species').value, animalStock: $('stock').value, method: $('method').value });
    draft = { character: c, mutations: gw.assignWorkshopDefects(c, gw.mutationDraft(c, $('mutationMethod').value)) };
    choices = [];
    recordId = null;
    render();
    $('saveStatus').textContent = 'Not saved yet.';
    event('Generated ' + (c.name || 'unnamed survivor') + '.');
}
catch (err) {
    guidance(err.message);
} });
for (const id of ['armor', 'weapon', 'weight'])
    $(id).addEventListener('change', update);
function record() { if (!draft)
    throw Error('Generate a character first'); return { format: 'graycloak-gw-workshop', version: 2, base: draft.character, generation: draft.mutations, choices: [...choices], equipment: { armorId: $('armor').value, weaponId: $('weapon').value }, weightKg: Number($('weight').value), character }; }
$('sandbox').addEventListener('click', () => { try {
    sessionStorage.setItem('graycloak.gw.sandbox.character', JSON.stringify(record()));
    location.href = 'tactical.html';
}
catch (err) {
    guidance(err.message);
} });
function restore(data) { if (data?.schemaVersion === 1 && data.mutationEffectsApplied === false && Array.isArray(data.mutations) && data.mutationGeneration) {
    const { mutationGeneration, mutations, mutationEffectsApplied, duplicateMutationReview, ...base } = data;
    data = { format: 'graycloak-gw-workshop', version: 2, base: { ...base, mutations: [] }, generation: mutationGeneration, choices: mutations, equipment: { armorId: 'none', weaponId: 'club' }, weightKg: 70 };
} if (data?.format !== 'graycloak-gw-workshop' || data.version !== 2)
    throw Error('Expected a v0.2 workshop record or Phase 1 draft'); const c = gw.previewCharacter(data.base, data.generation, data.choices, { ...data.equipment, weightKg: data.weightKg }); draft = { character: data.base, mutations: data.generation }; choices = [...data.choices]; $('armor').value = c.equipment.armorId; $('weapon').value = c.equipment.weaponId; $('weight').value = c.weightKg; $('name').value = c.name; $('species').value = c.species; $('stock').value = c.animalStock || ''; $('species').dispatchEvent(new Event('change')); $('mutationMethod').value = draft.mutations.method; render(); $('saveStatus').textContent = 'Loaded saved character or draft.'; event('Loaded ' + (c.name || 'unnamed survivor') + '.'); }
$('download').addEventListener('click', () => { try {
    const url = URL.createObjectURL(new Blob([JSON.stringify(record(), null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gamma-world-character.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
catch (err) {
    guidance(err.message);
} });
function refreshRoster() { const data = readCampaign(); options('roster', [{ id: '', name: 'Legacy saved character' }, ...Object.values(data.characters).map(e => ({ id: e.id, name: e.record.base.name || 'Unnamed survivor' }))]); $('roster').value = data.active || ''; }
function saveRoster() { const r = record(); recordId = saveRecord(r, recordId); localStorage.setItem('graycloak.gw.workshop.v2', JSON.stringify(r)); refreshRoster(); }
$('enterWorld').addEventListener('click', () => { try {
    if (!character)
        throw Error('Finish required mutation selections first');
    saveRoster();
    location.href = 'play.html';
}
catch (err) {
    guidance(err.message);
} });
$('save').addEventListener('click', () => { try {
    saveRoster();
    event((character ? 'Character' : 'Draft') + ' saved in this browser.');
    $('saveStatus').textContent = (character ? 'Character' : 'Draft') + ' saved successfully. Use Load saved to resume.';
}
catch (err) {
    guidance(err.message);
} });
$('load').addEventListener('click', () => { try {
    const id = $('roster').value;
    if (id) {
        const e = selectRecord(id);
        recordId = id;
        restore(e.record);
        return;
    }
    const raw = localStorage.getItem('graycloak.gw.workshop.v2');
    recordId = null;
    if (!raw)
        throw Error('No local character saved');
    restore(JSON.parse(raw));
}
catch (err) {
    guidance(err.message);
} });
$('import').addEventListener('change', async () => { try {
    const f = $('import').files[0];
    if (!f)
        return;
    if (f.size > 1000000)
        throw Error('Character file too large');
    recordId = null;
    restore(JSON.parse(await f.text()));
}
catch (err) {
    guidance(err.message);
}
finally {
    $('import').value = '';
} });
$('attack').addEventListener('click', () => { try {
    const result = gw.equipmentAttack({ character, weaponId: $('weapon').value, targetAC: Number($('targetAC').value), distance: Number($('distance').value), mode: $('attackMode').value, large: $('targetSize').value === 'large' });
    const msg = result.reason || `Roll ${result.roll}, target ${result.target}, ${result.hit ? 'hit for ' + result.damage + ' damage' : 'miss'}`;
    $('attackResult').textContent = msg;
    event(msg);
}
catch (err) {
    $('attackResult').textContent = err.message;
} });
$('lookup').addEventListener('click', () => { try {
    const a = Number($('first').value), b = Number($('second').value), fn = { weapon: gw.weaponTarget, natural: gw.naturalTarget, mental: gw.mentalTarget, radiation: gw.radiationCell, poison: gw.poisonCell }[$('matrix').value];
    $('result').textContent = 'Matrix result: ' + fn(a, b);
}
catch (err) {
    $('result').textContent = err.message;
} });
for (const [id, chat] of [['eventsTab', false], ['chatTab', true]])
    $(id).addEventListener('click', () => { $('events').hidden = chat; $('chat').hidden = !chat; $('eventsTab').setAttribute('aria-pressed', String(!chat)); $('chatTab').setAttribute('aria-pressed', String(chat)); });
$('chatForm').addEventListener('submit', e => { e.preventDefault(); const msg = $('chatText').value.trim(); if (!msg)
    return; $('messages').append(node('p', `${character?.name || 'You'}: ${msg}`)); if ($('messages').children.length > 100)
    $('messages').firstChild.remove(); $('chatText').value = ''; $('messages').scrollTop = $('messages').scrollHeight; });
refreshRoster();
event('Rules laboratory v0.6.7 initialized. Select mutations to preview immediately.');

// Wizard adapter: reuse the existing generation, preview and persistence handlers.
export function wizardState(){return {generated:!!draft,ready:!!character,species:draft?.character.species,recordId};}
export function wizardRestore(id){const e=readCampaign().characters[id];if(!e||e.started)throw Error('Only unstarted survivors can be edited.');recordId=id;restore(e.record);}
export function wizardName(name){if(!draft)throw Error('Generate attributes first.');draft.character.name=String(name).trim();update();}
export function wizardSave(final=false){saveRoster();updateEntry(recordId,e=>({...e,wizardDraft:!final}));return recordId;}

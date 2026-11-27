import { readCampaign, saveRecord, selectRecord, WORLD } from './campaign.js';
import { migrateLegacy, survivorStatus, validateRecord, renameSurvivor, deleteSurvivor } from './roster.js';
import { characterFor } from './settlement.js';
import * as gw from '../packages/gamma-world-rules/index.js';

const $ = id => document.getElementById(id);
const el = (tag, text, cls) => {
    const e = document.createElement(tag);
    if (text != null) e.textContent = text;
    if (cls) e.className = cls;
    return e;
};
const TYPES = { psh: 'Pure Strain Human', humanoid: 'Humanoid', animal: 'Mutated animal', plant: 'Intelligent plant', robot: 'Robot' };
const MUTATIONS = [...gw.PHYSICAL, ...gw.MENTAL, ...gw.PLANT];
let selectedId = null;

const entries = () => Object.values(readCampaign().characters);
const selected = () => readCampaign().characters[selectedId] ?? null;
const typeOf = e => TYPES[e.record.base.species] + (e.record.base.animalStock ? ` (${e.record.base.animalStock})` : '');
const nameOf = e => e.record.base.name || 'Unnamed survivor';
const siteOf = e => WORLD.sites.find(s => s.x === e.position?.x && s.y === e.position?.y)?.name || 'Wilderness';
const dayOf = e => (e.days ?? 0) + 1;
const status = msg => { $('rosterStatus').textContent = msg; };

function slotLine(e, s) {
    if (!s.ready && s.label === 'Draft') return 'Creation not finished · Resume';
    if (s.label === 'Needs review') return 'Needs review in the Rules Lab';
    if (s.label === 'Deceased') return `${typeOf(e)} · Deceased, day ${dayOf(e)}`;
    const where = e.started ? siteOf(e) : 'Not yet adventuring';
    return `${typeOf(e)} · ${where}${s.label === 'Encounter in progress' ? ' · In encounter' : ''}`;
}

function renderList() {
    const list = entries();
    if (!list.some(e => e.id === selectedId)) selectedId = readCampaign().active ?? list[0]?.id ?? null;
    if (!list.some(e => e.id === selectedId)) selectedId = list[0]?.id ?? null;
    $('survivors').replaceChildren(...list.map(e => {
        const s = survivorStatus(e);
        const b = el('button', null, `slot${e.id === selectedId ? ' selected' : ''}${s.label === 'Deceased' ? ' dead' : ''}${s.label === 'Draft' ? ' draft' : ''}`);
        b.type = 'button';
        b.setAttribute('aria-pressed', String(e.id === selectedId));
        b.append(el('strong', nameOf(e) + (s.label === 'Draft' ? ' (draft)' : '')), el('span', slotLine(e, s)));
        b.onclick = () => { selectedId = e.id; status(''); render(); };
        b.ondblclick = () => $('enterWorld').click();
        return b;
    }));
    if (!list.length) $('survivors').append(el('p', 'No characters yet.'));
}

function renderPreview() {
    const e = selected(), box = $('preview');
    if (!e) {
        box.replaceChildren(el('div', '?', 'portrait dead'), el('h1', 'No character selected'), el('p', 'Create a new character to begin your adventure.'));
        return;
    }
    const s = survivorStatus(e);
    let c = null;
    try { c = s.label === 'Draft' ? validateRecord(e.record) : characterFor(e); } catch { c = null; }
    const parts = [el('div', nameOf(e).trim()[0]?.toUpperCase() ?? '?', `portrait${s.label === 'Deceased' ? ' dead' : ''}`)];
    const head = el('div');
    head.append(el('h1', nameOf(e)), el('p', s.label === 'Draft' ? `${typeOf(e)} · Draft` : `${typeOf(e)} · ${c?.experience ?? 0} XP · Day ${dayOf(e)} in Eden Valley`));
    parts.push(head);
    if (c) {
        const stats = el('div', null, 'stats');
        for (const [k, v] of Object.entries(c.attributes)) {
            const box = el('div', null, 'stat');
            box.append(el('small', k), el('strong', v));
            stats.append(box);
        }
        parts.push(stats);
        const names = c.mutations.map(id => MUTATIONS.find(m => m.id === id)?.name ?? id);
        const gear = `${gw.getWeapon(c.equipment.weaponId).name}, ${gw.getArmor(c.equipment.armorId).name.toLowerCase()}`;
        const line = el('p');
        line.append(`${c.hp} / ${c.maxHp} HP · AC ${c.armorClass} · ${gear}`, el('br'), names.length ? names.join(' · ') : 'No mutations');
        parts.push(line);
    } else parts.push(el('p', 'This record could not be read. Open it from the Rules Lab workshop.'));
    box.replaceChildren(...parts);
}

function renderButtons() {
    const e = selected(), s = e ? survivorStatus(e) : null, enter = $('enterWorld');
    enter.disabled = !e || (!s.ready && s.label !== 'Draft');
    enter.textContent = !e ? 'Enter World' : s.label === 'Draft' ? 'Resume Creation' : s.label === 'Deceased' ? 'Deceased' : 'Enter World';
    for (const id of ['renameCharacter', 'exportCharacter', 'deleteCharacter']) $(id).disabled = !e;
}

function render() { renderList(); renderPreview(); renderButtons(); }
const guard = fn => () => { try { fn(); } catch (err) { status(err.message); } };

$('enterWorld').onclick = guard(() => {
    const e = selected();
    if (!e) return;
    if (survivorStatus(e).label === 'Draft') { location.href = 'create.html?id=' + encodeURIComponent(e.id); return; }
    selectRecord(e.id);
    location.href = 'play.html';
});
$('renameCharacter').onclick = guard(() => {
    const e = selected();
    const name = e && prompt('Character name', e.record.base.name);
    if (name != null && e) { renameSurvivor(e.id, name); render(); }
});
$('exportCharacter').onclick = guard(() => {
    const e = selected();
    if (!e) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(e.record, null, 2)], { type: 'application/json' }));
    const a = el('a');
    a.href = url;
    a.download = 'gamma-world-survivor.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status('Exported the character build. Campaign progress is not included.');
});
$('deleteCharacter').onclick = guard(() => {
    const e = selected();
    if (e && confirm(`Permanently delete ${nameOf(e)} and all campaign progress?`)) { deleteSurvivor(e.id); selectedId = null; render(); }
});
$('importLink').onclick = () => $('importSurvivor').click();
$('importSurvivor').onchange = async () => {
    try {
        const f = $('importSurvivor').files[0];
        if (!f) return;
        if (f.size > 1000000) throw Error('Character file too large');
        const r = JSON.parse(await f.text());
        validateRecord(r);
        selectedId = saveRecord(r);
        render();
        status('Character imported. Campaign progress is not included in character files.');
    } catch (err) { status(err.message); } finally { $('importSurvivor').value = ''; }
};
try { migrateLegacy(); } catch (err) { status('Could not migrate old save: ' + err.message); }
render();

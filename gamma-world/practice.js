import * as gw from '../packages/gamma-world-rules/index.js';
import { readCampaign } from './campaign.js';
import { survivorStatus } from './roster.js';
import { loadRegion } from './world.js';
import { mountCombat } from './combat-scene.js';

const $ = id => document.getElementById(id), el = (tag, text = '', cls = '') => { const n = document.createElement(tag); n.textContent = text; if (cls) n.className = cls; return n; };
const TYPE = { psh: 'Pure Strain Human', humanoid: 'Humanoid', animal: 'Mutated animal', plant: 'Mutated plant', robot: 'Robot' };
const derive = r => gw.deriveCharacter(r.base, r.generation, r.choices, { ...r.equipment, weightKg: r.weightKg });
let combat = null, zoom = 42, workshop = null;

try {
    const data = JSON.parse(sessionStorage.getItem('graycloak.gw.sandbox.character') || 'null');
    sessionStorage.removeItem('graycloak.gw.sandbox.character');
    if (data?.format === 'graycloak-gw-workshop' && data.version === 2) workshop = derive(data);
}
catch { workshop = null; }
const option = (select, value, text) => { const o = el('option', text); o.value = value; $(select).append(o); return o; };
if (workshop) { option('practiceRoster', 'workshop', `${workshop.name || 'Workshop character'} (from the workshop)`); $('practiceRoster').value = 'workshop'; }
for (const e of Object.values(readCampaign().characters)) if (survivorStatus(e).ready) option('practiceRoster', e.id, e.record.base.name || 'Unnamed survivor');
for (const [id, c] of Object.entries(gw.CREATURES)) option('creature', id, c.name);
// Every creature on the encounter tables that can be played, straight from the campaign bestiary.
const bestiary = new Map();
loadRegion().then(sc => {
    for (const name of [...new Set(Object.values(sc.encounters.ENCOUNTER_TABLES).flat().map(r => r.creature))].sort()) {
        const found = gw.playableCreature(sc.bestiary, name);
        if (!found || gw.CREATURES[found.key]) continue;
        bestiary.set(`bestiary:${found.key}`, found);
        option('creature', `bestiary:${found.key}`, `${name} — ${found.definition.notes.split('.')[0]}`);
    }
}).catch(() => {});

function character() {
    const id = $('practiceRoster').value, saved = readCampaign().characters[id];
    if (id === 'workshop' && workshop) return workshop;
    if (saved) return derive(saved.record);
    const b = gw.generateCharacter({ species: 'psh', name: 'Test survivor' });
    return gw.deriveCharacter(b, gw.mutationDraft(b), [], { armorId: 'hide', weaponId: 'long-sword' });
}
function options() {
    const picked = bestiary.get($('creature').value);
    return { character: character(), creature: picked?.key ?? $('creature').value, definition: picked?.definition ?? null, count: Number($('count').value), allies: Number($('allies').value), surprise: $('surprise').checked, hostile: $('hostile').checked, antidotes: ($('antidotes').value.match(/\d+/g) ?? []).map(Number).filter(n => n >= 3 && n <= 18) };
}
function post(text) {
    const feed = $('messages'), line = el('div', '', `msg event ${/\bd\d+\b|\d+d\d+/.test(text) ? 'roll' : 'combat'} g-combat`), body = el('div', text, 'text');
    line.append(body);
    feed.append(line);
    while (feed.children.length > 300) feed.firstChild.remove();
    feed.scrollTop = feed.scrollHeight;
}
new MutationObserver(list => { for (const m of list) for (const n of m.addedNodes) if (n.textContent) post(n.textContent); }).observe($('events'), { childList: true });

function setZoom(n) { zoom = Math.max(18, Math.min(96, n)); $('board').style.setProperty('--cell', zoom + 'px'); $('worldScale').style.width = zoom * 2 + 'px'; }
function fit() { const vp = $('viewport'), sc = combat?.scene; if (!sc || !vp.clientWidth) return; setZoom(Math.floor(Math.min(vp.clientWidth / sc.cols, vp.clientHeight / sc.rows))); vp.scrollTo(0, 0); }
function frames(state) {
    const me = state.actors.find(a => a.id === 'player'), cond = (icon, title) => { const i = el('i', '', `ico-${icon} bad`); i.title = title; return i; };
    $('name').textContent = me.name || 'Unnamed survivor';
    $('unitAc').textContent = `AC ${me.armorClass}`;
    $('pcPortrait').textContent = (me.name || '?')[0].toUpperCase();
    $('worldHpFill').style.width = `${100 * Math.max(0, me.hp) / me.maxHp}%`;
    $('pcHp').className = 'hp-track ' + (me.hp / me.maxHp > .6 ? '' : me.hp / me.maxHp > .3 ? 'warn' : 'low');
    $('pcHpText').textContent = `${me.hp} / ${me.maxHp} HP`;
    $('stats').textContent = `${TYPE[me.species] ?? me.species} · MS ${me.attributes.MS} · DX ${me.attributes.DX}`;
    $('pcConds').replaceChildren(...[me.poisoned && cond('poison', `Poisoned: ${Math.max(0, me.poisoned.deadline - state.round)} more rounds to take an antidote`), me.bleeding && cond('bleed', 'Bleeding: bind the wound')].filter(Boolean));
    const allies = state.actors.filter(a => a.ally);
    $('partyLabel').hidden = !allies.length;
    $('partyFrames').replaceChildren(...allies.map(a => {
        const box = el('div', '', `frame unit-frame member${a.hp <= 0 || a.fled ? ' down' : ''}`), body = el('div', '', 'body'), line = el('div', '', 'line'), track = el('div', '', 'hp-track'), bar = el('div');
        line.append(el('strong', a.name), el('span', `AC ${a.armorClass}`));
        bar.style.width = `${100 * Math.max(0, a.hp) / a.maxHp}%`;
        track.append(bar);
        body.append(line, track, el('small', `${Math.max(0, a.hp)} / ${a.maxHp}${a.fled ? ' · Fled' : ''}`));
        box.append(el('div', a.name[0], 'portrait'), body);
        return box;
    }));
    $('dayLabel').textContent = state.status === 'active' ? `Round ${state.round}` : 'Fight over';
}
function begin() {
    try {
        $('messages').replaceChildren();
        if (combat) combat.restart(options());
        else { combat = mountCombat({ practice: options(), onChange: frames, onExit: begin }); frames(combat.getState()); }
        fit();
    }
    catch (err) { $('guidance').textContent = err.message; }
}
$('setup').addEventListener('submit', e => { e.preventDefault(); document.activeElement?.blur?.(); begin(); });
$('worldZoomIn').onclick = () => setZoom(zoom + 6);
$('worldZoomOut').onclick = () => setZoom(zoom - 6);
$('worldFit').onclick = fit;
addEventListener('resize', fit);
{ const vp = $('viewport'); let drag = null;
  vp.addEventListener('wheel', e => { e.preventDefault(); setZoom(zoom + (e.deltaY < 0 ? 4 : -4)); }, { passive: false });
  vp.addEventListener('contextmenu', e => e.preventDefault());
  vp.addEventListener('mousedown', e => { if (e.button === 0) return; e.preventDefault(); drag = { x: e.clientX, y: e.clientY, l: vp.scrollLeft, t: vp.scrollTop }; });
  addEventListener('mousemove', e => { if (drag) { vp.scrollLeft = drag.l - (e.clientX - drag.x); vp.scrollTop = drag.t - (e.clientY - drag.y); } });
  addEventListener('mouseup', () => { drag = null; }); }
document.addEventListener('keydown', e => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || gw.isTextEntry(e.target)) return;
    if (e.key.toLowerCase() === 'f') { fit(); return; }
    combat?.key(e);
});
begin();

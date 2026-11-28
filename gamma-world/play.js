import * as gw from '../packages/gamma-world-rules/index.js';
import { STOCK, purse, owned, characterFor, buy, sell, equip, rest, repair, awardExperience } from './settlement.js';
import { manifestRadiation, readCampaign, selectRecord, updateEntry, applyProgress } from './campaign.js';
import { sceneOf, getScene, hasScene, registerScene, siteAt, scenePath, stepToward, sitePosition, startOf, ancestry, exitTo, clockOf, addMinutes, describeDistance, describeTime, FIRST_SCENE } from './scenes.js';
import { loadRegion } from './world.js';
import { party, followers, seekCompanion, approach, takeOn, dismiss, payWages, describe, WAGE, OFFER } from './party.js';
// The country outside the valley is read from the campaign map before the first draw. Without it the valley still plays.
let worldError = null;
try { registerScene(await loadRegion()); } catch (e) { worldError = e; }
const HEX_H = 2 / Math.sqrt(3), unit = sc => sc.layout === 'hex' ? 'hex' : 'square';
const worldArea = document.getElementById('worldArea');
const $ = id => id === 'worldArea' ? worldArea : worldArea.querySelector('#' + id) ?? document.getElementById(id), el = (tag, text = '') => { const n = document.createElement(tag); n.textContent = text; return n; };
let entry = null, c = null, path = [], timer = null, combat = null, opening = false, worldZoom = 36;
const cellOf = e => { const b = e.target.closest?.('.cell'); return b && b.dataset.x != null ? { x: Number(b.dataset.x), y: Number(b.dataset.y), el: b } : null; };
const idle = () => !opening && !combat && c && c.hp > 0 && !(entry.encounter || entry.pendingEncounter);
const centre = (sc, p) => sc.layout === 'hex' ? { x: p.x * worldZoom + worldZoom * 2 / 3, y: (p.y + (p.x & 1) / 2 + .5) * worldZoom * HEX_H } : { x: (p.x + .5) * worldZoom, y: (p.y + .5) * worldZoom };
let selected = null, hovered = null;
const thing = p => { const sc = scene(); return sc.sites.find(s => s.x === p.x && s.y === p.y) ?? (sc.places ?? []).find(s => s.x === p.x && s.y === p.y) ?? null; };
const KIND = { exit: 'Way out', town: 'Settlement', encounter: 'Unexplored', ruin: 'Ruin', place: 'Landmark', fortification: 'Fortress', village: 'Village', 'robot-farm': 'Robot farm' };
const TERRAIN_FILL = {"plains": "#9c9a6c", "grassland": "#a3a06a", "clear": "#a09d70", "coast": "#aaa67c", "hills": "#928657", "forested-hill": "#69744a", "mountains": "#857b68", "snow-mountains": "#b9b7ae", "forested-mountains": "#5f6851", "forest": "#48613c", "woods": "#526a44", "heavy-forest": "#2b4638", "marsh": "#4d6a5c", "swamp": "#45604f", "desert": "#a48a5e", "badlands": "#96805a", "wasteland": "#96805a", "water": "#476d7c", "sea": "#3f6474", "lake": "#4b7383", "river": "#4b7383", "ruins": "#7d6657", "city": "#74605a", "radioactive": "#7c7a45", "unknown": "#3f4a3d"};
const hpClass = (hp, max) => hp / max > .6 ? '' : hp / max > .3 ? 'warn' : 'low';
const TYPE = { psh: 'Pure Strain Human', humanoid: 'Humanoid', animal: 'Mutated animal', plant: 'Mutated plant', robot: 'Robot' };
const printedByCharacter = new Map();
const device = () => entry?.inventory.find(i => i.id === 'outpost-device')?.artifact;
// One Information feed. Every line carries the game time and a tag; dice rolls are kept, in their own quieter style.
let lastStampDay = null;
function stamp() {
    if (!entry) return '';
    const day = (entry.days ?? 0) + 1, m = entry.minutes ?? 360, hm = `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    const text = day === lastStampDay ? hm : `Day ${day} · ${hm}`;
    lastStampDay = day;
    return text;
}
const ROLL = /\bd\d+\b|\d+d\d+|morale check|Reaction:|intensity \d+ vs/i, FIGHT = /attack|falls|flee|damage|Round \d|Encounter|morale|victory|defeat|killed|poison|radiation|antidote|first strike|surpris|withdraw|parley|rests\.|moves \d|dying|binds/i;
function classify(text, fromCombat = false) {
    const group = fromCombat || FIGHT.test(text) ? 'combat' : 'travel';
    return ROLL.test(text) ? { tag: 'roll', label: 'Roll', group } : { tag: group, label: group === 'combat' ? 'Combat' : 'Travel', group };
}
function post(kind, text, speaker, as) {
    const feed = $('messages'), line = document.createElement('div'), meta = document.createElement('div'), body = document.createElement('div');
    const k = as ?? (kind === 'event' ? classify(text) : kind === 'system' ? { tag: 'system', label: 'System', group: 'system' } : { tag: 'npc', label: kind === 'me' ? 'You' : 'NPC', group: 'npc' });
    line.className = `msg ${kind} ${k.tag} g-${k.group}`;
    meta.className = 'meta';
    meta.append(el('time', stamp()), el('b', k.label));
    body.className = 'text';
    if (speaker) body.append(el('strong', speaker + ': '), text);
    else body.textContent = text;
    line.append(meta, body);
    const pinned = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 40;
    const tail = feed.querySelector('.choices');
    if (tail) feed.insertBefore(line, tail); else feed.append(line);
    while (feed.children.length > 300) feed.firstChild.remove();
    if (pinned) feed.scrollTop = feed.scrollHeight;
    return line;
}
function choices(options) {
    for (const old of $('messages').querySelectorAll('.choices')) old.remove();
    const line = el('p');
    line.className = 'msg choices';
    for (const [label, fn, hidden] of options) {
        if (hidden) continue;
        const b = el('button', label);
        b.type = 'button';
        b.onclick = fn;
        line.append(b);
    }
    $('messages').append(line);
    $('messages').scrollTop = $('messages').scrollHeight;
}
function showTab(name) {
    for (const [tab, pane] of [['chatTab', 'chat'], ['eventsTab', 'events'], ['partyTab', 'partyPane'], ['bagTab', 'bagPane']]) {
        const on = tab === name + 'Tab';
        $(pane).hidden = !on;
        $(tab).setAttribute('aria-pressed', String(on));
    }
    $('chatForm').hidden = name !== 'chat';
    $('feedFilters').hidden = name !== 'chat';
    if (name === 'bag') showBag();
    if (name === 'party') showParty();
}
function log(msg) { post('event', msg); }
function say(msg) { $('guidance').textContent = msg; }
// Combat writes its log to the hidden Events sink; each new line is copied into the feed.
new MutationObserver(list => { for (const m of list) for (const n of m.addedNodes) if (n.textContent) post('event', n.textContent, null, classify(n.textContent, true)); }).observe(document.getElementById('events'), { childList: true });
function stop() { clearInterval(timer); timer = null; path = []; }
// Experience for a find is awarded once it is correctly identified (printed p.42).
function withArtifact(e, itemId, artifact) {
    const old = e.inventory.find(i => i.id === itemId)?.artifact, next = { ...e, inventory: e.inventory.map(i => i.id === itemId ? { ...i, artifact } : i) };
    const points = artifact.identified && !old?.identified ? gw.ARTIFACT_EXPERIENCE[artifact.definition.name] ?? 0 : 0;
    if (!points) return next;
    const out = awardExperience(next, points);
    out.advancement = { bonuses: out.advancement?.bonuses ?? [], news: [`Identified the ${artifact.definition.name}: ${points.toLocaleString('en-US')} experience.`, ...(out.advancement?.news ?? [])] };
    return out;
}
function flushNews() {
    if (entry?.radiation?.some(r => !r.done && (entry.days ?? 0) >= r.due)) entry = updateEntry(entry.id, e => manifestRadiation(e));
    const news = entry?.advancement?.news;
    if (!news?.length) return;
    entry = updateEntry(entry.id, e => ({ ...e, advancement: { ...e.advancement, news: [] } }));
    c = characterFor(entry);
    for (const line of news) log(line);
}
function atSite() { return entry && siteAt(entry); }
const scene = () => sceneOf(entry && hasScene(entry.scene ?? 'legacy') ? entry : { scene: FIRST_SCENE });
let drawn = null;
// The grid is rebuilt only when the scene changes; a step just moves the token.
function drawScene() {
    const sc = scene(), board = $('board');
    drawn = sc.id;
    const hex = sc.layout === 'hex';
    board.classList.toggle('hex', hex);
    board.style.setProperty('--cols', sc.cols);
    board.style.setProperty('--rows', sc.rows);
    board.style.gridTemplateColumns = `repeat(${sc.cols},var(--cell))`;
    board.style.gridTemplateRows = `repeat(${sc.rows},var(--cell))`;
    board.classList.toggle('has-image', !!sc.image);
    board.style.backgroundImage = sc.image ? `url("${sc.image.src}")` : '';
    board.style.backgroundSize = sc.image ? `calc(var(--cell) * ${sc.image.width / sc.pixelsPerCell}) calc(var(--cell) * ${sc.image.height / sc.pixelsPerCell})` : '';
    const cells = [];
    for (let y = 0; y < sc.rows; y++)
        for (let x = 0; x < sc.cols; x++) {
            const site = sc.sites.find(t => t.x === x && t.y === y), wall = sc.blocked.has(`${x},${y}`), b = el('button');
            if (site && !hex) { const tag = el('span', site.name); tag.className = 'site-label'; b.append(tag); }
            if (hex) { b.style.setProperty('--x', x); b.style.setProperty('--y', y + (x & 1) / 2); if (sc.terrain) { const t = sc.terrain[y * sc.cols + x]; b.title = sc.terrainNames[t] ?? t; } }
            b.className = `cell ${wall ? 'wall' : ''} ${site ? 'site' : ''} ${site?.kind === 'exit' ? 'exit' : ''}${hex && sc.terrain ? ` t-${TERRAIN_FILL[sc.terrain[y * sc.cols + x]] ? sc.terrain[y * sc.cols + x] : 'unknown'}` : ''}`;
            b.dataset.x = x;
            b.dataset.y = y;
            if (site) b.title = site.name;
            b.disabled = wall;
            cells.push(b);
        }
    // Hexes are clipped to shape, so rivers, roads and names sit in layers above them. Cells stay first: render() indexes them.
    const extras = [];
    if (hex && sc.strokes) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', `${sc.view.x} ${sc.view.y} ${sc.view.width} ${sc.view.height}`);
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.classList.add('strokes');
        for (const s of sc.strokes) { const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline'); line.setAttribute('points', s.pts.map(p => p.join(',')).join(' ')); line.setAttribute('class', s.kind); svg.append(line); }
        extras.push(svg);
    }
    if (hex) {
        const tag = (p, cls) => { const t = el('span', p.name); t.className = `hex-label ${cls} k-${p.kind ?? ''}`; t.style.setProperty('--x', p.x); t.style.setProperty('--y', p.y + (p.x & 1) / 2); return t; };
        extras.push(...(sc.places ?? []).filter(p => !sc.sites.some(s => s.x === p.x && s.y === p.y)).map(p => tag(p, 'place')), ...sc.sites.map(s => tag(s, 'site')));
    }
    const route = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    route.id = 'route';
    route.append(document.createElementNS('http://www.w3.org/2000/svg', 'polyline'));
    const tip = el('div');
    tip.id = 'routeTip';
    tip.hidden = true;
    board.replaceChildren(...cells, ...extras, route, tip);
    board.classList.toggle('no-grid', localStorage.getItem('graycloak.gw.grid') === 'off');
    selected = null;
    const mm = $('minimap');
    mm.style.aspectRatio = `${sc.cols} / ${sc.rows}`;
    let chart = '';
    if (hex && sc.terrain) { const cv = document.createElement('canvas'); cv.width = sc.cols * 3; cv.height = sc.rows * 6 + 3; const g = cv.getContext('2d'); sc.terrain.forEach((t, i) => { const x = i % sc.cols, y = Math.floor(i / sc.cols); g.fillStyle = TERRAIN_FILL[t] ?? TERRAIN_FILL.unknown; g.fillRect(x * 3, y * 6 + (x & 1) * 3, 3, 6); }); chart = `url("${cv.toDataURL()}")`; }
    mm.style.backgroundImage = sc.image ? `url("${sc.image.src}")` : chart;
    mm.style.backgroundSize = hex && !sc.image ? '100% 100%' : sc.image ? `${100 * sc.image.width / sc.pixelsPerCell / (sc.cols + (hex ? 1 / 3 : 0))}% ${100 * sc.image.height / sc.pixelsPerCell / (hex ? (sc.rows + 0.5) * HEX_H : sc.rows)}%` : '';
    $('minimapName').textContent = sc.name;
    $('minimapScale').textContent = `${describeDistance(sc, 1)} per ${unit(sc)}`;
    $('worldScaleLabel').textContent = sc.scale.label;
    const chain = ancestry(sc);
    const beyond = el('button', 'Continent');
    beyond.type = 'button';
    beyond.disabled = true;
    beyond.title = 'The continent map is not built yet';
    $('sceneTrail').replaceChildren(...(chain[0].parent ? [] : [beyond]), ...chain.map((node, i) => {
        const here = node.id === sc.id, b = el('button', node.name);
        b.type = 'button';
        b.setAttribute('aria-pressed', String(here));
        b.disabled = here;
        if (!here) { b.title = `Walk to the way out toward ${node.name}`; b.onclick = () => headFor(exitTo(sc, sc.parent)); }
        return b;
    }));
    fitWorld();
}
function render() {
    const sc = scene(), board = $('board');
    if (drawn !== sc.id) drawScene();
    for (const old of board.querySelectorAll('.player')) { old.classList.remove('player', 'party'); if (old.firstChild?.nodeType === 3) old.firstChild.remove(); }
    if (entry) { const cell = board.children[entry.position.y * sc.cols + entry.position.x]; if (cell) { cell.classList.add('player'); cell.classList.toggle('party', party(entry).length > 0); cell.dataset.initial = (c?.name || 'P')[0].toUpperCase(); cell.prepend('PC'); } }
    $('worldScale').style.width = worldZoom * sc.scale.cells + 'px';
    drawFrames();
    $('dayLabel').textContent = entry ? clockOf(entry).text : '';
    const pct = (n, of) => `${100 * n / of}%`, dot = (cls, x, y) => { const i = el('i'); i.className = cls; Object.assign(i.style, { left: pct(x, sc.cols), top: pct(y, sc.rows), width: pct(1, sc.cols), height: pct(1, sc.rows) }); return i; };
    const north = el('i', 'N ↑'), view = el('i');
    north.className = 'north';
    view.className = 'view';
    $('minimap').replaceChildren(...(sc.image || sc.layout === 'hex' ? [] : [...sc.blocked].map(k => dot('w', ...k.split(',').map(Number)))), ...sc.sites.map(p => dot('s', p.x, p.y)), ...(entry ? [dot('p', entry.position.x, entry.position.y)] : []), view, north);
    drawView();
    const s = atSite();
    $('site').textContent = s?.name || (sc.terrain && entry ? sc.terrainNames[sc.terrain[entry.position.y * sc.cols + entry.position.x]] : sc.parent ? sc.name : 'Wilderness');
    for (const action of gw.worldActions({ entry, character: c, site: s, moving: !!timer })) {
        const b = $(action.id);
        b.hidden = !action.visible;
        b.disabled = !action.enabled;
        b.title = action.reason;
        b.textContent = action.id === 'interact' ? ({ exit: s?.to === sc.parent ? 'Leave' : 'Enter', town: 'Talk', encounter: 'Investigate', ruin: 'Search' })[s?.kind] ?? 'Interact' : action.id === 'supply' ? 'Supplies' : action.id === 'resume' ? 'Resume' : action.label;
        if (action.id === 'interact') { b.dataset.icon = ({ exit: s?.to === sc.parent ? 'leave' : 'enter', town: 'talk', encounter: 'search', ruin: 'search' })[s?.kind] ?? 'talk'; b.title = action.reason || (s ? action.label : 'Nothing to interact with here'); b.hidden = false; b.disabled = !action.visible || !action.enabled; }
        if (action.id === 'supply') { b.hidden = false; b.disabled = !action.visible || !action.enabled; if (!action.visible) b.title = 'Supplies are collected at the trading post'; }
    } // Artifact interactions belong in inventory, not the exploration toolbar.
    $('experiment').hidden = true;
    $('install').hidden = true;
    const busy = !c || c.hp <= 0 || !!(entry.encounter || entry.pendingEncounter), town = s?.kind === 'town';
    for (const id of ['tradeBtn', 'restBtn']) { $(id).hidden = false; $(id).disabled = busy || !town; $(id).title = town ? '' : 'Only at the trading post'; }
    $('restBtn').textContent = c?.species === 'robot' ? 'Repair' : 'Rest';
    $('stop').hidden = !timer;
    $('sleepBtn').disabled = busy || !!timer;
    $('sleepBtn').title = 'Sleep for two route turns (8 hours). Six route turns make a day and two of them must be rest.';
    $('powerDivider').hidden = true;
    $('worldPowers').replaceChildren();
    let key = 0;
    for (const b of worldArea.querySelectorAll('.action-bar button')) { if (b.hidden) delete b.dataset.key; else b.dataset.key = ++key; }
    $('placeTitle').textContent = $('site').textContent;
    drawTarget();
    if (!combat && !opening) flushNews();
}
function load(id) { stop(); entry = null; c = null; try {
    entry = selectRecord(id);
    if (entry.wizardDraft) throw Error('Finish this draft from Character Select before playing.');
    c = characterFor(entry);
    if (!entry.scene && !entry.encounter && !entry.pendingEncounter) entry = updateEntry(id, e => ({ ...e, ...startOf(FIRST_SCENE) }));
    // A scene that is missing sends the survivor home; one that was redrawn (rev) puts them back at its entry point.
    if (entry.scene && !hasScene(entry.scene)) entry = updateEntry(id, e => ({ ...e, ...startOf(FIRST_SCENE) }));
    else if (entry.scene && (getScene(entry.scene).rev ?? null) !== (entry.sceneRev ?? null)) entry = updateEntry(id, e => ({ ...e, ...startOf(e.scene) }));
    if (c.hp > 0 && !entry.started)
        entry = updateEntry(id, e => ({ ...e, started: true, domars: purse(e), owned: owned(e) }));
    say((entry.encounter || entry.pendingEncounter) ? 'An encounter is in progress. Resume it before exploring.' : c.hp <= 0 ? 'This character is dead. Choose another survivor from Character Select.' : 'Move with Q W E / A S D or the arrow keys, one step each, or click a destination. Hover to see the route and its time.');
}
catch (e) {
    say(e.message + ' — open Character Select to continue.');
} render(); }
function refresh() { const d = readCampaign(); const placeholder = el('option', 'Select character'); placeholder.value = ''; $('roster').replaceChildren(placeholder, ...Object.values(d.characters).map(e => { const o = el('option', e.record.base.name || 'Unnamed survivor'); o.value = e.id; return o; })); $('roster').value = d.active || ''; if (d.active)
    load(d.active);
else {
    say('Choose or create a survivor from Character Select.');
    render();
} }
$('roster').addEventListener('change', () => load($('roster').value));
$('stop').onclick = () => { stop(); render(); };
// The map: hover shows the route and its cost, a click walks, a click on a site selects it and a double-click goes there.
// Time for a run of steps, counting the slower pace once the party is short of rest.
function routeMinutes(sc, steps) { let awake = entry.awake ?? 0, total = 0; for (const p of steps) { const plan = stepPlan(sc, p, awake); total += plan.total; awake = plan.awake; } return total; }
function routeTo(target) {
    const sc = scene(), steps = scenePath(sc, entry.position, target);
    if (!steps) return null;
    const minutes = routeMinutes(sc, steps), from = clockTotal(entry), to = from + minutes;
    const arrive = (() => { const d = Math.floor(to / 1440), m = to % 1440, hm = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; return d === Math.floor(from / 1440) ? hm : `Day ${d + 1}, ${hm}`; })();
    // Encounter checks are made once each day and each night of travel: count the periods this route enters.
    const checks = sc.encounters && steps.length ? gw.travelPeriod(to).index - gw.travelPeriod(from).index + (entry.wandering?.period === gw.travelPeriod(from).index ? 0 : 1) : 0;
    return { steps, distance: describeDistance(sc, steps.length), time: minutes ? describeTime(minutes) : '', arrive, checks };
}
function drawRoute(target, name) {
    const board = $('board'), line = board.querySelector('#route polyline'), tip = board.querySelector('#routeTip'), sc = scene();
    if (!line) return;
    const r = target && entry && idle() ? routeTo(target) : null;
    if (!r || !r.steps.length) { line.setAttribute('points', ''); tip.hidden = true; return null; }
    line.setAttribute('points', [entry.position, ...r.steps].map(p => { const q = centre(sc, p); return `${q.x},${q.y}`; }).join(' '));
    const end = centre(sc, target);
    tip.textContent = `${name ? name + ' · ' : ''}${r.distance}${r.time ? ' · ' + r.time : ''}`;
    Object.assign(tip.style, { left: end.x + 'px', top: end.y + 'px' });
    tip.hidden = false;
    return r;
}
function drawTarget() {
    const frame = $('targetFrame'), sc = scene();
    for (const old of $('board').querySelectorAll('.cell.selected')) old.classList.remove('selected');
    if (!selected || !entry) { frame.hidden = true; if (!hovered) drawRoute(null); return; }
    $('board').children[selected.y * sc.cols + selected.x]?.classList.add('selected');
    const here = selected.x === entry.position.x && selected.y === entry.position.y, r = here ? null : drawRoute(selected, selected.name);
    $('targetTitle').textContent = selected.name;
    $('targetKind').textContent = KIND[selected.kind] ?? selected.kind ?? '';
    $('targetRoute').textContent = here ? 'You are here.' : r ? `${r.distance}${r.time ? ` · ${r.time} · arrive ${r.arrive}` : ''}` : 'No way there from here.';
    const exit = selected.kind === 'exit' && hasScene(selected.to) ? `Leads to ${getScene(selected.to).name}. ` : '';
    $('targetNote').textContent = here ? '' : `${exit}${r?.checks ? `${r.checks} encounter check${r.checks === 1 ? '' : 's'} on the way. ` : ''}${r ? 'Click to go there.' : ''}`;
    frame.hidden = false;
}
$('board').addEventListener('mousemove', e => { if (timer) return; const p = cellOf(e), key = p && `${p.x},${p.y}`; if (key === hovered) return; hovered = key; selected = p ? thing(p) : null; if (selected) drawTarget(); else { drawTarget(); drawRoute(p && !p.el.disabled ? p : null); } });
$('board').addEventListener('mouseleave', () => { if (timer) return; hovered = null; selected = null; drawTarget(); });
$('board').addEventListener('click', e => { const p = cellOf(e); if (!p || !idle()) return; selected = thing(p); hovered = null; drawTarget(); walkTo({ x: p.x, y: p.y }); });
const clockTotal = e => (e.days ?? 0) * 1440 + (e.minutes ?? 360);
// Route movement through uncharted country: one d6 check each day and each night, a six is an encounter (ENCOUNTERS).
// Returns true when travel was interrupted.
function wander(sc, from) {
    // A slow step can run through more than one day or night: each period entered gets its own check, in order.
    const to = clockTotal(entry);
    let r = null, t = from, state = entry.wandering ?? null;
    while (t < to) {
        const end = Math.min(to, gw.travelPeriod(t).start + gw.PERIOD - 1);
        r = gw.advanceWandering(state, t, end);
        state = r.state;
        if (r.check) log(`Random encounter check (${r.check.night ? 'night' : 'day'}): d6 = ${r.check.roll}${r.check.roll === 6 ? `, an encounter in hour ${r.check.hour} of the ${r.check.night ? 'night' : 'day'}` : ', none'}.`);
        if (r.due) break;
        t = end + 1;
    }
    entry = updateEntry(entry.id, e => ({ ...e, wandering: state }));
    if (!r) return false;
    if (!r.due) return false;
    const i = entry.position.y * sc.cols + entry.position.x, place = sc.places.find(p => p.x === entry.position.x && p.y === entry.position.y);
    const key = gw.tableKey(sc.encounters, { terrain: sc.terrain[i], hazard: sc.hazards[i], feature: place?.kind }), met = gw.rollEncounter(sc.encounters, key);
    const where = `${sc.terrainNames[sc.terrain[i]] ?? sc.terrain[i]}, ${key} table`;
    if (met.creature === 'No Encounter') { log(`Encounter (${where}): d20 = ${met.roll}, no encounter.`); return false; }
    stop();
    const playable = sc.bestiary && gw.playableCreature(sc.bestiary, met.creature), count = Math.min(met.number ?? 1, 8);
    if (!playable) {
        const why = met.creature === 'Cryptic Alliance' ? 'which alliance is per the referee\'s map' : met.creature === 'Tribesmen' ? `a band of ${met.number}` : `${met.number ?? 1} sighted`;
        log(`Encounter (${where}): d20 = ${met.roll}, ${met.creature} (${why}). This encounter cannot be played yet; you avoid it and travel on.`);
        render();
        say(`${clockOf(entry).text}. You came upon ${met.creature} and kept your distance. Click a destination to continue.`);
        return true;
    }
    log(`Encounter (${where}): d20 = ${met.roll}, ${met.creature}, ${met.number ?? 1} appearing${count < (met.number ?? 1) ? ` (${count} take the field)` : ''}. ${playable.definition.notes ?? ''}`);
    entry = updateEntry(entry.id, e => ({ ...e, pendingEncounter: { creature: playable.key, definition: playable.definition, count, site: 'wandering' } }));
    render();
    beginCombat();
    return true;
}
function headFor(site) { if (site && !opening && !combat && c && c.hp > 0 && !(entry.encounter || entry.pendingEncounter)) walkTo({ x: site.x, y: site.y }); }
// Every move is a run of single steps: a movement key takes one, a click queues the steps of the shortest way.
// Returns true when the step was interrupted by an encounter.
// Time to walk into a cell. On route maps it is the terrain's rate (1 km a turn in mountains or swamp to 8 km in the open).
// The party camps when four route turns have passed without rest, unless it is on a forced march; then it keeps going,
// at half rate once exhausted.
const forcedMarch = () => localStorage.getItem('graycloak.gw.forced') === 'on';
function stepPlan(sc, p, awake = entry.awake ?? 0) {
    const forced = forcedMarch(), halved = forced && gw.restState(awake).exhausted;
    const walking = sc.route && sc.terrain ? gw.travelMinutes(sc.cellMeters / 1000, gw.routeRate(sc.terrain[p.y * sc.cols + p.x]), { halved }) : (sc.minutesPerCell ?? 0) * (halved ? 2 : 1);
    return gw.marchTime(walking, awake, { forced });
}
function takeStep(p) {
    const sc = scene(), from = clockTotal(entry), plan = stepPlan(sc, p);
    entry = updateEntry(entry.id, d => addMinutes({ ...d, position: p, steps: (d.steps ?? 0) + 1, awake: plan.awake }, plan.total));
    if (plan.camps) log(`Made camp ${plan.camps === 1 ? 'once' : plan.camps + ' times'} on the way: two route turns of sleep each.`);
    dayTick(Math.floor(from / 1440));
    if (sc.encounters && wander(sc, from)) return true;
    return tire();
}
// The day's rest: two route turns of sleep. Without it travel is at half rate and combat fatigue doubles; after two days
// of exertion the referee "may have to enforce this rule by declaring the players unconscious".
function sleep(forced = false) {
    const sc = scene(), from = clockTotal(entry);
    entry = updateEntry(entry.id, d => addMinutes({ ...d, awake: 0 }, gw.REST_MINUTES));
    dayTick(Math.floor(from / 1440));
    log(forced ? `After two days without rest ${c.name || 'the survivor'} collapses and sleeps for two route turns. ${clockOf(entry).text}.` : `Slept for two route turns (8 hours). ${clockOf(entry).text}.`);
    if (sc.encounters && wander(sc, from)) return true;
    render();
    return false;
}
function tire() {
    const state = gw.restState(entry.awake ?? 0);
    if (state.collapse) { stop(); sleep(true); return true; }
    if (state.exhausted && !entry.tiredTold) { entry = updateEntry(entry.id, e => ({ ...e, tiredTold: true })); log('No rest in four route turns: travel is at half rate and combat fatigue is doubled until you sleep.'); }
    if (!state.exhausted && entry.tiredTold) entry = updateEntry(entry.id, e => ({ ...e, tiredTold: false }));
    return false;
}
const arrived = () => say(atSite() ? `Arrived at ${atSite().name}. ${clockOf(entry).text}.` : `${clockOf(entry).text}.`);
function walkTo(target) { stop(); const sc = scene(); path = scenePath(sc, entry.position, target); if (!path) {
    say('You cannot get there from here.');
    return;
} if (!path.length)
    return; { const total = routeMinutes(sc, path); say(`Walking ${describeDistance(sc, path.length)}${total ? `, about ${describeTime(total)}` : ''}. Click elsewhere, press a movement key or Stop to change course.`); } timer = setInterval(() => { try {
    const p = path.shift();
    if (p && takeStep(p)) return;
    render();
    if (!path.length) {
        stop();
        selected = null;
        render();
        arrived();
    }
}
catch (err) {
    stop();
    say(err.message);
} }, 180); render(); }
// Movement keys: one step each. Hex maps use Q W E / A S D for the six sides; arrows and squares use the four ways.
const HEX_KEYS = { w: 'n', s: 's', q: 'nw', e: 'ne', a: 'sw', d: 'se', arrowup: 'n', arrowdown: 's', arrowleft: 'w', arrowright: 'e' }, SQUARE_KEYS = { w: 'n', s: 's', a: 'w', d: 'e', arrowup: 'n', arrowdown: 's', arrowleft: 'w', arrowright: 'e' };
function keyStep(key) {
    const sc = scene(), direction = (sc.layout === 'hex' ? HEX_KEYS : SQUARE_KEYS)[key];
    if (!direction || !idle()) return false;
    stop();
    selected = null;
    hovered = null;
    const to = stepToward(sc, entry.position, direction);
    if (!to) { render(); say('You cannot go that way.'); return true; }
    try { if (takeStep(to)) return true; render(); arrived(); } catch (err) { say(err.message); }
    return true;
}
$('interact').onclick = () => { stop(); const s = atSite(); if (opening || combat || !s || !c || c.hp <= 0 || (entry.encounter || entry.pendingEncounter))
    return; try {
    if (s.kind === 'exit') {
        if (!hasScene(s.to)) { say(`The country beyond is not available: ${worldError?.message ?? 'the campaign map did not load'}. It is read from the gcc folder beside gamma-world.`); return; }
        const to = getScene(s.to);
        entry = updateEntry(entry.id, e => ({ ...e, scene: to.id, sceneRev: to.rev ?? null, position: sitePosition(to, s.arrive) }));
        log(`${s.label}. ${clockOf(entry).text}.`);
        render();
        say(to.route ? `You are now on the ${to.name} map. One ${unit(to)} is ${describeDistance(to, 1)}: about ${describeTime(gw.travelMinutes(to.cellMeters / 1000, 8))} in the open, ${describeTime(gw.travelMinutes(to.cellMeters / 1000, 4))} in forest or hills, ${describeTime(gw.travelMinutes(to.cellMeters / 1000, 1))} in mountains or swamp.` : `You are now on the ${to.name} map. One ${unit(to)} is ${describeDistance(to, 1)}${to.minutesPerCell ? ` and takes about ${describeTime(to.minutesPerCell)} to cross` : ''}.`);
        return;
    }
    if (s.kind === 'encounter') {
        if (entry.clearingResolved) {
            say('The clearing is quiet.');
            return;
        }
        entry = updateEntry(entry.id, e => ({ ...e, pendingEncounter: { creature: 'badder', count: 1, site: 'clearing' } }));
        beginCombat();
        return;
    }
    if (s.kind === 'ruin') {
        if (entry.inventory.some(i => i.id === 'outpost-device')) {
            say('You already recovered the device.');
            return;
        }
        entry = updateEntry(entry.id, d => { const found = awardExperience({ ...d, inventory: [...d.inventory, { id: 'outpost-device', name: 'Unidentified Ancient device', artifact: { ...gw.discoverArtifact(gw.TECHNOLOGY.laserPistol), functioning: true } }, { id: 'hydrogen-cell', name: 'Charged hydrogen cell' }] }, gw.ARTIFACT_EXPERIENCE['Hydrogen energy cell']); found.advancement = { bonuses: found.advancement?.bonuses ?? [], news: [`Recovered a charged hydrogen energy cell: ${gw.ARTIFACT_EXPERIENCE['Hydrogen energy cell']} experience.`, ...(found.advancement?.news ?? [])] }; return found; });
        c = characterFor(entry);
        log('Recovered an unidentified device. Open Inventory and choose Experiment.');
    }
    else
        talkMara();
    render();
}
catch (err) {
    say(err.message);
} };
$('resume').onclick = () => { stop(); beginCombat(); };
$('supply').onclick = () => { if (!c || c.hp <= 0 || atSite()?.kind !== 'town' || (entry.encounter || entry.pendingEncounter) || entry.inventory.some(i => i.id === 'supplies'))
    return; entry = updateEntry(entry.id, d => ({ ...d, inventory: [...d.inventory, { id: 'supplies', name: 'Travel supplies' }] })); log('Travel supplies collected.'); render(); };
$('experiment').onclick = () => { try {
    if (!c || c.hp <= 0 || (entry.encounter || entry.pendingEncounter) || !device() || device().identified)
        return;
    stop();
    const a = gw.experiment(device(), { IN: c.attributes.IN, mutations: c.mutations, scientificGenius: c.effects.scientificGenius });
    entry = updateEntry(entry.id, e => withArtifact(e, 'outpost-device', a));
    c = characterFor(entry);
    log(a.identified ? 'Identified ' + a.definition.name + '.' : a.last.hazard ? 'Hazardous result; identification restarts. Harm requires referee ruling.' : 'Experimentation continues. ' + a.minutes.toFixed(1) + ' game minutes elapsed.');
    render();
}
catch (e) {
    say(e.message);
} };
$('install').onclick = () => { try {
    if (!c || c.hp <= 0 || (entry.encounter || entry.pendingEncounter) || !entry.inventory.some(i => i.id === 'hydrogen-cell'))
        return;
    const a = gw.installCell(device(), 'hydrogen');
    entry = updateEntry(entry.id, e => ({ ...e, inventory: e.inventory.filter(i => i.id !== 'hydrogen-cell').map(i => i.id === 'outpost-device' ? { ...i, artifact: a } : i) }));
    log('Charged cell installed. Laser pistol ready in combat.');
    render();
}
catch (e) {
    say(e.message);
} };
$('chatTab').onclick = () => showTab('chat');

$('bagTab').onclick = () => showTab('bag');
$('partyTab').onclick = () => showTab('party');
$('chatForm').onsubmit = e => { e.preventDefault(); const msg = $('chatText').value.trim(); if (msg) {
    const line = `${c?.name || 'You'}: ${msg}`;
    const data = JSON.parse(localStorage.getItem('graycloak.gw.chat.local') || '[]');
    data.push(line);
    localStorage.setItem('graycloak.gw.chat.local', JSON.stringify(data.slice(-100)));
    post('me', msg, c?.name || 'You');
} $('chatText').value = ''; };
try {
    for (const line of JSON.parse(localStorage.getItem('graycloak.gw.chat.local') || '[]')) {
        const at = line.indexOf(': ');
        if (at > 0) post('me', line.slice(at + 2), line.slice(0, at)); else post('me', line);
    }
    refresh();
    if (c) post('system', `Welcome back, ${c.name || 'survivor'}. Day ${(entry.days ?? 0) + 1} in Eden Valley.`);
    if (c && (entry?.encounter || entry?.pendingEncounter)) queueMicrotask(()=>beginCombat());
}
catch (e) {
    say(e.message);
}
async function beginCombat() {
    if (opening || combat || !entry || !c || c.hp <= 0 && !entry.encounter)
        return;
    stop();
    opening = true;
    const id = entry.id;
    try {
        const response = await fetch('tactical.html');
        if (!response.ok)
            throw Error('Unable to load combat interface');
        const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
        const source = doc.querySelector('.battle-area');
        if (!source)
            throw Error('Missing combat interface');
        const area = $('combatArea');
        area.replaceChildren(...Array.from(source.children).map(n => document.importNode(n, true)));
        area.querySelector('.battle-controls').hidden = true;
        area.querySelector('#battleNotice').hidden = true;
        for (const [id, label] of [['returnWorld', 'Return'], ['leaveEncounter', 'Pause']]) {
            const b = el('button', label);
            b.id = id;
            b.hidden = true;
            b.title = id === 'returnWorld' ? 'Return to exploration' : 'Leave the fight paused and return to the map';
            area.querySelector('.action-bar').append(b);
        }
        const mod = await import('./tactical.js');
        if (entry.id !== id)
            throw Error('Character changed; try again');
        $('utilityPanel').hidden=true; activeUtility=null; area.append($('utilityPanel')); worldArea.remove(); showTab('chat');
        area.hidden = false;
        combat = mod.mountTactical({ root: area, information: $('sharedInformation'), embedded: true, characterId: id, onChange:()=>{ entry = readCampaign().characters[id] ?? entry; drawFrames(); if(activeUtility===showSheet && !$('utilityPanel').hidden) showSheet();}, initialPrinted: entry.encounter ? printedByCharacter.get(id) ?? 0 : 0, onExit: () => { const previous = combat?.getState(); if (previous?.status === 'active')
                printedByCharacter.set(id, previous.log.length);
            else
                printedByCharacter.delete(id); combat?.dispose(); combat = null; worldArea.append($('utilityPanel')); $('utilityPanel').hidden = true; activeUtility = null; area.hidden = true; area.replaceChildren(); $('worldShell').prepend(worldArea); load(id); showTab('chat'); log('Returned to exploration.'); fitWorld(); } });
        if (!combat.getState()) {
            combat.dispose();
            combat = null;
            throw Error('Encounter could not start. Check the saved character and retry.');
        }
    }
    catch (e) {
        worldArea.append($('utilityPanel'));
        $('combatArea').replaceChildren();
        $('combatArea').hidden = true;
        if (!worldArea.isConnected)
            $('worldShell').prepend(worldArea);
        say(e.message);
    }
    finally {
        opening = false;
    }
}
let activeUtility = null;
function dialog(title, body) { stop(); if (!combat && !opening)
    render();
    $('utilityTitle').textContent = title; $('utilityBody').replaceChildren(...body); $('utilityPanel').hidden = false; }
$('closeDialog').onclick = () => $('gameDialog').close();
const closeWindow = () => { $('utilityPanel').hidden = true; activeUtility = null; };
$('closeUtility').onclick = closeWindow;
function utility(fn) { return () => { if (activeUtility === fn && !$('utilityPanel').hidden) { closeWindow(); return; } activeUtility = fn; fn(); }; }
$('mapExpand').onclick = () => { const expanded = document.body.classList.toggle('expanded-map'); $('mapExpand').textContent = expanded ? 'Show panel' : 'Hide panel'; if (!combat) fitWorld(); };
function current() { if (!entry)
    throw Error('Select a saved character'); entry = readCampaign().characters[entry.id]; c = characterFor(entry); return c; }
function row(text, buttons = []) { const r = el('div'); r.className = 'item-row'; r.append(el('span', text)); for (const [label, fn, disabled] of buttons) {
    const b = el('button', label);
    b.disabled = !!disabled;
    b.onclick = fn;
    r.append(b);
} return r; }
function run(fn, next) { try {
    stop();
    entry = updateEntry(entry.id, fn);
    c = characterFor(entry);
    render();
    next();
}
catch (e) {
    say(e.message);
    post('system', e.message);
} }
function showSheet() { try {
    const ch = current(), stats = el('div');
    stats.className = 'stats';
    for (const [k, v] of Object.entries(ch.attributes)) {
        const box = el('div');
        box.className = 'stat';
        box.append(el('small', k), el('strong', v));
        stats.append(box);
    }
    const names = ch.mutations.map(id => [...gw.PHYSICAL, ...gw.MENTAL, ...gw.PLANT].find(x => x.id === id)?.name ?? id);
    dialog(ch.name || 'Survivor', [el('p', `${ch.species} · HP ${ch.hp}/${ch.maxHp} · AC ${ch.armorClass} · XP ${ch.experience}`), stats, el('h3', 'Mutations'), ...names.map(n => el('p', n)), el('h3', 'Experience'), el('p', `${ch.experience.toLocaleString('en-US')} XP · next bonus roll at ${(gw.EXPERIENCE_THRESHOLDS.find(t => t > ch.experience) ?? (Math.floor(ch.experience / 1000000) + 1) * 1000000).toLocaleString('en-US')}`), ...(entry.advancement?.bonuses ?? []).map(b => el('p', `${b.threshold.toLocaleString('en-US')} XP: ${b.text}`)), el('p', ch.reviewRequired.join('; ') || 'No pending construction rulings.')]);
}
catch (e) {
    say(e.message);
} }
function showBag() { try {
    const ch = current(), o = owned(entry), locked = !!(entry.encounter || entry.pendingEncounter) || ch.hp <= 0;
    const body = [el('p', `${purse(entry)} domars`), el('h3', 'Owned equipment')];
    for (const kind of ['weapon', 'armor'])
        for (const id of o[kind]) {
            const name = (kind === 'weapon' ? gw.getWeapon(id) : gw.getArmor(id)).name;
            const equipped = entry.record.equipment[kind + 'Id'] === id;
            body.push(row(name + (equipped ? ' · Equipped' : ''), [['Equip', () => run(e => equip(e, kind, id), showBag), locked || equipped]]));
        }
    body.push(el('h3', 'Recovered items'));
    for (const item of entry.inventory) {
        const a = item.artifact, buttons = [];
        if (a) {
            buttons.push(['Examine', () => dialog('Artifact', [el('p', a.identified ? a.definition.name : 'Unidentified Ancient device'), el('p', a.identified ? `${a.charges ?? 0} shots remaining${a.conditionKnown && a.functioning === false ? ' · Nonfunctional' : ''}` : 'Its purpose is unknown.'), row('Done', [['Close', closeWindow]])])]);
            if (!a.identified) {
                const stuck = !gw.canIdentify(a, { IN: ch.attributes.IN, mutations: ch.mutations, scientificGenius: ch.effects.scientificGenius });
                if (stuck) body.push(el('p', a.node === 'S' ? 'This device is beyond this survivor’s understanding. Ask Mara in Eden Valley to lead the research.' : 'This line of experiment is a dead end. Restart identification, or ask Mara in Eden Valley to lead the research.'));
                buttons.push(['Experiment', () => { $('experiment').onclick(); showBag(); }, locked || stuck], ['Restart identification', () => run(e => ({ ...e, inventory: e.inventory.map(i => i.id === item.id ? { ...i, artifact: gw.interruptIdentification(i.artifact) } : i) }), showBag), locked]);
                if (atSite()?.kind === 'town')
                    buttons.push(['Ask Mara to lead research', () => run(e => withArtifact(e, item.id, gw.experiment(e.inventory.find(i => i.id === item.id).artifact, { IN: 12, assistants: 1 })), showBag), locked]);
            }
            if (a.identified && entry.inventory.some(i => i.id === 'hydrogen-cell'))
                buttons.push(['Install cell', () => { $('install').onclick(); showBag(); }, locked]);
        }
        body.push(row(a?.identified ? `${a.definition.name} · ${a.charges} shots${a.conditionKnown && a.functioning === false ? ' · Nonfunctional' : ''}` : item.name, buttons));
    }
    if (!entry.inventory.length)
        body.push(el('p', 'No recovered items.'));
    $('bagPane').replaceChildren(...body);
}
catch (e) {
    say(e.message);
} }
const MARA = 'Mara';
const inTown = () => atSite()?.kind === 'town' && c && c.hp > 0 && !(entry.encounter || entry.pendingEncounter);
function maraTopics() {
    choices([
        ['Ask about the forest', () => ask('What is out in the forest?', 'Badders have been seen near the clearing. Keep your weapon ready, but talk first if they allow it.')],
        ['Ask about the ruins', () => ask('Anything worth salvaging in the ruins?', 'An Ancient outpost lies east of the clearing. Bring any strange devices back and we will study them.')],
        ['Trade', () => { if (leftTown()) return; showTrade(); }],
        ['Look for companions', () => seek()],
        ['Rest one day', () => restAt(false), c?.species === 'robot'],
        ['Rest until healed', () => restAt(true), c?.species === 'robot'],
        ['Repair', () => restAt(false), c?.species !== 'robot'],
    ]);
}
function leftTown() { if (inTown()) return false; post('system', 'You are no longer with Mara in Eden Valley.'); for (const old of $('messages').querySelectorAll('.choices')) old.remove(); return true; }
function ask(question, answer) { if (leftTown()) return; post('me', question, c.name || 'You'); post('npc', answer, MARA); maraTopics(); }
// Followers and hirelings. The CHARISMA rules give the limit, the reaction roll and the adjustments; the rest is the automated referee.
function leaderLine() { const l = gw.leadership(c, 'animal'); return `With the valley's mutated animals your Charisma ${c.attributes.CH} allows ${l.followers} follower${l.followers === 1 ? '' : 's'} (you have ${followers(entry).length}), reaction ${l.reaction >= 0 ? '+' : ''}${l.reaction}, morale ${l.morale >= 0 ? '+' : ''}${l.morale}. Hirelings are not limited.`; }
function showParty() {
    const pane = $('partyPane'), list = entry ? party(entry) : [];
    if (!entry || !c) { pane.replaceChildren(el('p', 'No survivor selected.')); return; }
    const rows = list.map(m => { const ch = m.character, hp = ch.maxHp - (m.damage ?? 0), row = document.createElement('div'); row.className = 'party-member';
        const out = el('button', 'Dismiss'); out.onclick = () => { if (entry.encounter || entry.pendingEncounter) { say('Finish the encounter first.'); return; } entry = updateEntry(entry.id, e => dismiss(e, m.id)); log(`${describe(m)} leaves the party.`); showParty(); };
        row.append(el('strong', m.name), el('span', `${m.stock || m.species} · ${m.role}${m.wage ? ` · ${m.wage} domars a day` : ''}`), el('span', `HP ${hp}/${ch.maxHp} · AC ${ch.armorClass} · ${gw.getWeapon(ch.equipment.weaponId).name}`), el('small', ch.mutations.length ? `Mutations: ${ch.mutations.map(id => [...gw.PHYSICAL, ...gw.MENTAL].find(x => x.id === id)?.name ?? id).join(', ')} (not used in fights yet)` : 'No mutations'), out); return row; });
    pane.replaceChildren(el('p', leaderLine()), ...(rows.length ? rows : [el('p', 'You travel alone. Ask at the trading post for companions.')]));
}
function dayTick(before) {
    const days = (entry.days ?? 0) - before;
    if (days <= 0 || !party(entry).some(m => m.role === 'hireling')) return;
    const paid = payWages(entry, days);
    entry = updateEntry(entry.id, e => ({ ...e, domars: paid.entry.domars, party: paid.entry.party }));
    for (const line of paid.news) log(line);
}
function seek() {
    if (leftTown()) return;
    try {
        entry = updateEntry(entry.id, e => seekCompanion(e));
        const r = entry.recruit;
        if (!r.candidate) { post('system', `You ask around where the valley folk gather (d6 ${r.roll}, someone comes forward on 4 or more). No one is interested today.`); maraTopics(); return; }
        post('system', `You ask around where the valley folk gather (d6 ${r.roll}). ${describe(r.candidate)} will hear you out. ${leaderLine()}`);
        recruitChoices();
    }
    catch (err) { post('system', err.message); maraTopics(); }
}
function recruitChoices() {
    const r = entry.recruit, who = r.candidate, first = r.state === 'open';
    const speak = offer => { try { entry = updateEntry(entry.id, e => approach(e, offer)); render(); answer(); } catch (err) { post('system', err.message); recruitChoices(); } };
    choices([['Make your case', () => speak(false), !first], [`Make an offer (${OFFER} domars, +1)`, () => speak(true)], ['Leave it', () => { post('system', `You part from ${who.name}.`); maraTopics(); }]]);
}
function answer() {
    const r = entry.recruit, who = r.candidate, x = r.reaction;
    post('system', `Reaction: 2d6 ${x.rolled}${x.modifier ? ` ${x.modifier > 0 ? '+' : '−'} ${Math.abs(x.modifier)}` : ''} = ${x.score}, ${x.label}.`);
    const join = () => { try { entry = updateEntry(entry.id, e => takeOn(e)); render(); log(`${describe(who)} joins as a ${r.state}.`); post('npc', r.state === 'follower' ? 'I am with you.' : 'Paid each dawn, and I am yours.', who.name); } catch (err) { post('system', err.message); } maraTopics(); };
    if (r.state === 'follower') { post('npc', 'I will follow you, and ask nothing for it.', who.name); choices([['Welcome them as a follower', join], ['Decline', () => maraTopics()]]); }
    else if (r.state === 'hireling') { post('npc', r.capped ? `I would follow you, but you lead as many as you can. I will come for pay: ${WAGE} domars a day.` : `I will come for pay: ${WAGE} domars a day.`, who.name); choices([[`Hire (${WAGE} domars now, then each dawn)`, join], ['Decline', () => maraTopics()]]); }
    else if (r.state === 'uncertain') { post('npc', 'I am not sure of you.', who.name); recruitChoices(); }
    else { post('system', `${who.name} wants nothing to do with you. No further attempt can be made.`); maraTopics(); }
}
function talkMara() { showTab('chat'); post('npc', 'Welcome to Eden Valley. Stock up before you follow the old road.', MARA); maraTopics(); }
function restAt(untilHealed) {
    if (leftTown()) return;
    try {
        stop();
        const before = entry.days ?? 0, robot = c.species === 'robot';
        entry = updateEntry(entry.id, e => robot ? repair(e) : rest(e, untilHealed));
        c = characterFor(entry);
        dayTick(before);
        render();
        const days = (entry.days ?? 0) - before;
        log(robot ? `Repairs made. ${c.hp} / ${c.maxHp} HP.` : `Rested ${days} day${days === 1 ? '' : 's'}. ${c.hp} / ${c.maxHp} HP.`);
    } catch (e) { say(e.message); post('system', e.message); }
}
function showTrade() { try {
    current();
    const o = owned(entry), body = [el('p', `Purse: ${purse(entry)} domars · resale at half price (prototype policy).`)];
    for (const item of STOCK) {
        const has = item.kind === 'item' ? entry.inventory.some(x => x.id === item.id) : o[item.kind].includes(item.id);
        if (item.id === 'spare-part' && c.species !== 'robot')
            continue;
        body.push(row(`${item.name} · ${item.price} domars`, [['Buy', () => run(e => buy(e, item.id), showTrade), purse(entry) < item.price || has && item.id !== 'spare-part'], ['Sell', () => run(e => sell(e, item.id), showTrade), item.kind === 'item' || !has || entry.record.equipment[item.kind + 'Id'] === item.id]]));
    }
    body.push(row('Done trading', [['Close', closeWindow]]));
    dialog('Mara · Trading post', body);
}
catch (e) {
    say(e.message);
} }
$('sheetBtn').onclick = utility(showSheet);
$('bagBtn').onclick = () => showTab('bag');
$('tradeBtn').onclick = () => { if (inTown()) { activeUtility = showTrade; showTrade(); } };
$('restBtn').onclick = () => restAt(true);
$('journalBtn').onclick = utility(() => dialog('Journal', [el('p', 'Eden Valley: visit the settlement for supplies, conversation and trade.'), el('p', 'Forest clearing: investigate the patrol.'), el('p', 'Ancient outpost: recover and identify the device.'), el('p', 'Prototype region; authored campaign coordinates not yet mapped.')]));
// Game-only terrain colours (the campaign map keeps its own). hud.css draws the matching symbols.
function cond(icon, title, cls = '') { const i = el('i'); i.className = `ico-${icon} ${cls}`; i.title = title; return i; }
// Survivor and party frames, shared by the world and by combat (live from the fight when one is on).
function drawFrames() {
    const fight = combat?.getState?.(), live = id => fight?.actors.find(a => id === 'player' ? a.id === 'player' : a.companionId === id);
    const me = live('player'), hp = me ? me.hp : c?.hp ?? 0, max = c?.maxHp ?? 1;
    $('name').textContent = c?.name || 'No active character';
    $('unitAc').textContent = c ? `AC ${c.armorClass}` : '';
    $('pcPortrait').textContent = (c?.name || '?')[0].toUpperCase();
    $('worldHpFill').style.width = c ? `${100 * hp / max}%` : '0';
    $('pcHp').className = 'hp-track ' + hpClass(hp, max);
    $('pcHpText').textContent = c ? `${hp} / ${max} HP` : '';
    $('stats').textContent = c ? `${(me?.experience ?? c.experience).toLocaleString('en-US')} XP · ${TYPE[c.species] ?? c.species}` : '';
    const due = (entry?.radiation ?? []).filter(r => !r.done), marks = [];
    if (me?.poisoned) marks.push(cond('poison', `Poisoned: ${Math.max(0, me.poisoned.deadline - fight.round)} more round${me.poisoned.deadline - fight.round === 1 ? '' : 's'} to take an antidote`, 'bad'));
    if (me ? me.bleeding : c?.bleeding) marks.push(cond('bleed', 'Bleeding: bind the wound', 'bad'));
    const weary = gw.restState(entry?.awake ?? 0);
    if (me && c) { const f = gw.fatigueFactor({ weaponId: me.equipment?.weaponId, armorAC: gw.getArmor(me.equipment?.armorId ?? 'none').ac, rounds: me.fightRounds + 1, rest: me.rest, PS: me.attributes.PS, synthetic: me.species === 'robot' }) * (me.exhausted ? 2 : 1); if (f) marks.push(cond('tired', `Fatigued: weapon class −${f}${me.exhausted ? ' (doubled: no rest)' : ''}`)); }
    else if (weary.exhausted) marks.push(cond('tired', `No rest for ${describeTime(weary.awake)}: travel at half rate, combat fatigue doubled. Sleep to recover.`, 'bad'));
    for (const r of due) marks.push(cond('rad', `Radiation: a ${r.kind === 'defect' ? 'defect' : 'mutation'} appears in ${Math.max(0, r.due - (entry.days ?? 0))} day${r.due - (entry.days ?? 0) === 1 ? '' : 's'}`, 'good'));
    $('pcConds').replaceChildren(...marks);
    const members = entry ? party(entry) : [];
    $('partyLabel').hidden = !members.length;
    $('partyFrames').replaceChildren(...members.map(m => {
        const a = live(m.id), ch = m.character, now = a ? a.hp : ch.maxHp - (m.damage ?? 0), box = el('div'), body = el('div'), line = el('div'), track = el('div'), bar = el('div'), port = el('div', m.name[0]);
        box.className = `frame unit-frame member${a && (a.hp <= 0 || a.fled) ? ' down' : ''}`;
        box.title = 'Open the Party tab';
        box.onclick = () => showTab('party');
        port.className = 'portrait';
        body.className = 'body';
        line.className = 'line';
        line.append(el('strong', m.name), el('span', `AC ${ch.armorClass}`));
        track.className = 'hp-track ' + hpClass(now, ch.maxHp);
        bar.style.width = `${100 * Math.max(0, now) / ch.maxHp}%`;
        track.append(bar);
        body.append(line, track, el('small', `${Math.max(0, now)} / ${ch.maxHp} · ${a?.fled ? 'Fled' : m.role === 'follower' ? 'Follower' : 'Hireling'} · ${m.stock || m.species}${m.wage ? ` · ${m.wage} a day` : ''}`));
        box.append(port, body);
        return box;
    }));
}
// The part of the map on screen, outlined on the minimap.
function drawView() {
    const vp = $('viewport'), b = $('board'), v = $('minimap').querySelector('.view');
    if (!v || !b.offsetWidth) return;
    const l = Math.max(0, (vp.scrollLeft - b.offsetLeft) / b.offsetWidth), t = Math.max(0, (vp.scrollTop - b.offsetTop) / b.offsetHeight), r = Math.min(1, (vp.scrollLeft + vp.clientWidth - b.offsetLeft) / b.offsetWidth), d = Math.min(1, (vp.scrollTop + vp.clientHeight - b.offsetTop) / b.offsetHeight);
    Object.assign(v.style, { left: l * 100 + '%', top: t * 100 + '%', width: Math.max(0, r - l) * 100 + '%', height: Math.max(0, d - t) * 100 + '%' });
    v.hidden = r - l >= .999 && d - t >= .999;
}
function centreOn(fx, fy) { const vp = $('viewport'), b = $('board'); vp.scrollLeft = b.offsetLeft + fx * b.offsetWidth - vp.clientWidth / 2; vp.scrollTop = b.offsetTop + fy * b.offsetHeight - vp.clientHeight / 2; drawView(); }
const centreOnSurvivor = () => { if (entry) { const sc = scene(), p = centre(sc, entry.position), b = $('board'); centreOn(p.x / b.offsetWidth, p.y / b.offsetHeight); } };
$('viewport').addEventListener('scroll', drawView);
$('minimap').onclick = e => { const r = $('minimap').getBoundingClientRect(); centreOn((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); };
$('mmCentre').onclick = centreOnSurvivor;
$('mmCollapse').onclick = () => { const on = $('minimap').parentElement.classList.toggle('collapsed'); $('mmCollapse').textContent = on ? '+' : '–'; $('mmCollapse').title = on ? 'Show the minimap' : 'Collapse the minimap'; };
// Mouse wheel zooms toward the cursor; the right or middle button drags the map.
$('viewport').addEventListener('wheel', e => { e.preventDefault(); const vp = $('viewport'), b = $('board'), r = b.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height, v = vp.getBoundingClientRect(); zoomWorld(worldZoom + (e.deltaY < 0 ? 4 : -4)); vp.scrollLeft = b.offsetLeft + fx * b.offsetWidth - (e.clientX - v.left); vp.scrollTop = b.offsetTop + fy * b.offsetHeight - (e.clientY - v.top); drawView(); }, { passive: false });
{ let drag = null; const vp = $('viewport'); vp.addEventListener('mousedown', e => { if (e.button === 0) return; e.preventDefault(); drag = { x: e.clientX, y: e.clientY, l: vp.scrollLeft, t: vp.scrollTop }; }); addEventListener('mousemove', e => { if (drag) { vp.scrollLeft = drag.l - (e.clientX - drag.x); vp.scrollTop = drag.t - (e.clientY - drag.y); } }); addEventListener('mouseup', () => { drag = null; }); vp.addEventListener('contextmenu', e => e.preventDefault()); }
$('gridBtn').onclick = () => { const off = $('board').classList.toggle('no-grid'); localStorage.setItem('graycloak.gw.grid', off ? 'off' : 'on'); $('gridBtn').setAttribute('aria-pressed', String(!off)); };
$('gridBtn').setAttribute('aria-pressed', String(localStorage.getItem('graycloak.gw.grid') !== 'off'));
$('stop').onclick = () => { stop(); render(); say('You stop.'); };
function showMarch() { const on = forcedMarch(); $('marchBtn').setAttribute('aria-pressed', String(on)); $('marchBtn').textContent = on ? 'Forced march: On' : 'Forced march: Off'; $('marchBtn').title = on ? 'No stops for sleep. After four route turns without rest: half travel rate and double combat fatigue; after two days you collapse.' : 'The party makes camp for two route turns whenever four have passed without rest.'; }
$('marchBtn').onclick = () => { localStorage.setItem('graycloak.gw.forced', forcedMarch() ? 'off' : 'on'); showMarch(); hovered = null; };
showMarch();
$('sleepBtn').onclick = () => { if (!idle()) return; stop(); try { if (!sleep()) say(`Rested. ${clockOf(entry).text}.`); } catch (err) { say(err.message); } };
// Feed filters and the sidebar width are remembered.
for (const b of $('feedFilters').querySelectorAll('[data-filter]')) b.onclick = () => { $('messages').dataset.filter = b.dataset.filter; for (const o of $('feedFilters').querySelectorAll('[data-filter]')) o.setAttribute('aria-pressed', String(o === b)); };
function showRolls(on) { $('messages').classList.toggle('no-rolls', !on); $('rollsBtn').setAttribute('aria-pressed', String(on)); $('rollsBtn').textContent = on ? 'Dice rolls: shown' : 'Dice rolls: hidden'; localStorage.setItem('graycloak.gw.rolls', on ? 'on' : 'off'); }
$('rollsBtn').onclick = () => showRolls($('messages').classList.contains('no-rolls'));
showRolls(localStorage.getItem('graycloak.gw.rolls') !== 'off');
{ const shell = $('worldShell'), saved = Number(localStorage.getItem('graycloak.gw.side')); if (saved) shell.style.setProperty('--side', saved + 'px'); let on = false;
  $('sideGrip').addEventListener('mousedown', e => { on = true; e.preventDefault(); });
  addEventListener('mousemove', e => { if (!on) return; const w = Math.max(260, Math.min(640, shell.getBoundingClientRect().right - e.clientX)); shell.style.setProperty('--side', w + 'px'); localStorage.setItem('graycloak.gw.side', String(Math.round(w))); drawView(); });
  addEventListener('mouseup', () => { on = false; }); }
function zoomWorld(n) { worldZoom = Math.max(10, Math.min(90, n)); $('board').style.setProperty('--cell', worldZoom + 'px'); $('worldScale').style.width = worldZoom * scene().scale.cells + 'px'; if (selected) drawTarget(); else drawRoute(null); drawView(); }
$('worldZoomIn').onclick = () => zoomWorld(worldZoom + 6);
$('worldZoomOut').onclick = () => zoomWorld(worldZoom - 6);
function fitWorld() { const vp = $('viewport'), sc = scene(), o = sc.open, hex = sc.layout === 'hex'; if (!vp?.clientWidth || !vp.clientHeight) return; zoomWorld(Math.floor(hex ? Math.min(vp.clientWidth / (o.cols + 1 / 3), vp.clientHeight / ((o.rows + 0.5) * HEX_H)) : Math.min(vp.clientWidth / o.cols, vp.clientHeight / o.rows))); const b = $('board'), w = hex ? (o.cols + 1 / 3) * worldZoom : o.cols * worldZoom, h = hex ? (o.rows + 0.5) * HEX_H * worldZoom : o.rows * worldZoom; vp.scrollLeft = b.offsetLeft + o.x * worldZoom + w / 2 - vp.clientWidth / 2; vp.scrollTop = b.offsetTop + o.y * worldZoom * (hex ? HEX_H : 1) + h / 2 - vp.clientHeight / 2; drawView(); }
$('worldFit').onclick = fitWorld;
fitWorld();
globalThis.addEventListener?.('resize', () => { if (!combat) fitWorld(); });
const viewport = $('viewport');
let pan = null;
viewport.oncontextmenu = e => e.preventDefault();
viewport.onpointerdown = e => { if (e.button === 2) {
    e.preventDefault();
    pan = { x: e.clientX, y: e.clientY, l: viewport.scrollLeft, t: viewport.scrollTop };
    viewport.setPointerCapture(e.pointerId);
} };
viewport.onpointermove = e => { if (pan) {
    viewport.scrollLeft = pan.l + pan.x - e.clientX;
    viewport.scrollTop = pan.t + pan.y - e.clientY;
} };
viewport.onpointerup = viewport.onpointercancel = viewport.onlostpointercapture = () => pan = null;
// Universal tools stay accessible; shortcuts never fire inside text fields or dialogs.
$('mapBtn').onclick = utility(() => { const sc = scene(); dialog(`Map · ${sc.name}`, [el('p', `One ${unit(sc)} is ${describeDistance(sc, 1)}${sc.minutesPerCell ? `, about ${describeTime(sc.minutesPerCell)} on foot` : ''}.`), ...sc.sites.map(t => row(`${t.name}${t.kind === 'exit' && hasScene(t.to) ? ` (to ${getScene(t.to).name})` : ''}`, [['Walk there', () => { closeWindow(); headFor(t); }, t.x === entry.position.x && t.y === entry.position.y]])), ...(sc.parent ? [] : [el('p', 'This is the widest map so far. The continent map is not built yet.')])]); });
document.addEventListener('keydown', e => { if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || gw.isTextEntry(e.target) || $('gameDialog').open)
    return; if (!combat) { if (/^[1-9]$/.test(e.key)) { const b = [...worldArea.querySelectorAll('.action-bar button')].find(x => x.dataset.key === e.key); if (b && !b.disabled) b.click(); return; } if (e.key === 'Home') { centreOnSurvivor(); return; } if (e.key.toLowerCase() === 'f') { fitWorld(); return; } if (e.key === 'Escape') { if (timer) { stop(); render(); } selected = null; drawTarget(); drawRoute(null); return; } if (keyStep(e.key.toLowerCase())) { e.preventDefault(); return; } } const id = { c: 'sheetBtn', i: 'bagBtn', m: 'mapBtn', j: 'journalBtn' }[e.key.toLowerCase()]; if (id) {
    e.preventDefault();
    $(id).onclick();
}
else if (e.key === 'Enter' && !e.target.closest?.('button,a')) {
    e.preventDefault();
    document.body.classList.remove('expanded-map'); $('mapExpand').textContent='Hide panel'; $('chatTab').onclick();
    $('chatText').focus();
} });

import * as gw from '../packages/gamma-world-rules/index.js';
import { STOCK, purse, owned, characterFor, buy, sell, equip, rest, repair, awardExperience } from './settlement.js';
import { readCampaign, selectRecord, updateEntry, applyProgress } from './campaign.js';
import { sceneOf, getScene, siteAt, scenePath, sitePosition, startOf, ancestry, exitTo, clockOf, addMinutes, describeDistance, describeTime, FIRST_SCENE } from './scenes.js';
const worldArea = document.getElementById('worldArea');
const $ = id => id === 'worldArea' ? worldArea : worldArea.querySelector('#' + id) ?? document.getElementById(id), el = (tag, text = '') => { const n = document.createElement(tag); n.textContent = text; return n; };
let entry = null, c = null, path = [], timer = null, combat = null, opening = false, worldZoom = 36;
const printedByCharacter = new Map();
const device = () => entry?.inventory.find(i => i.id === 'outpost-device')?.artifact;
function post(kind, text, speaker) {
    const feed = $('messages'), line = el('p');
    line.className = 'msg ' + kind;
    if (speaker) line.append(el('strong', speaker + ': '), text);
    else line.textContent = kind === 'system' ? '[System] ' + text : kind === 'event' ? '[Event] ' + text : text;
    feed.append(line);
    while (feed.children.length > 200) feed.firstChild.remove();
    feed.scrollTop = feed.scrollHeight;
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
    for (const [tab, pane] of [['chatTab', 'chat'], ['eventsTab', 'events'], ['bagTab', 'bagPane']]) {
        const on = tab === name + 'Tab';
        $(pane).hidden = !on;
        $(tab).setAttribute('aria-pressed', String(on));
    }
    $('chatForm').hidden = name !== 'chat';
    if (name === 'bag') showBag();
}
function log(msg) { $('events').append(el('p', msg)); if ($('events').children.length > 300)
    $('events').firstChild.remove(); $('events').scrollTop = $('events').scrollHeight; post('event', msg); }
function say(msg) { $('guidance').textContent = msg; }
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
    const news = entry?.advancement?.news;
    if (!news?.length) return;
    entry = updateEntry(entry.id, e => ({ ...e, advancement: { ...e.advancement, news: [] } }));
    c = characterFor(entry);
    for (const line of news) log(line);
}
function atSite() { return entry && siteAt(entry); }
const scene = () => sceneOf(entry ?? { scene: FIRST_SCENE });
let drawn = null;
// The grid is rebuilt only when the scene changes; a step just moves the token.
function drawScene() {
    const sc = scene(), board = $('board');
    drawn = sc.id;
    board.style.gridTemplateColumns = `repeat(${sc.cols},var(--cell))`;
    board.style.gridTemplateRows = `repeat(${sc.rows},var(--cell))`;
    board.classList.toggle('has-image', !!sc.image);
    board.style.backgroundImage = sc.image ? `url("${sc.image.src}")` : '';
    board.style.backgroundSize = sc.image ? `calc(var(--cell) * ${sc.image.width / sc.pixelsPerCell}) calc(var(--cell) * ${sc.image.height / sc.pixelsPerCell})` : '';
    const cells = [];
    for (let y = 0; y < sc.rows; y++)
        for (let x = 0; x < sc.cols; x++) {
            const site = sc.sites.find(t => t.x === x && t.y === y), wall = sc.blocked.has(`${x},${y}`), b = el('button');
            if (site) { const tag = el('span', site.name); tag.className = 'site-label'; b.append(tag); }
            b.className = `cell ${wall ? 'wall' : ''} ${site ? 'site' : ''} ${site?.kind === 'exit' ? 'exit' : ''}`;
            b.dataset.x = x;
            b.dataset.y = y;
            if (site) b.title = site.name;
            b.disabled = wall;
            cells.push(b);
        }
    board.replaceChildren(...cells);
    const mm = $('minimap');
    mm.style.aspectRatio = `${sc.cols} / ${sc.rows}`;
    mm.style.backgroundImage = sc.image ? `url("${sc.image.src}")` : '';
    mm.style.backgroundSize = sc.image ? `${100 * sc.image.width / sc.pixelsPerCell / sc.cols}% ${100 * sc.image.height / sc.pixelsPerCell / sc.rows}%` : '';
    $('minimapName').textContent = sc.name;
    $('minimapScale').textContent = `${describeDistance(sc, 1)} per square`;
    $('worldScaleLabel').textContent = sc.scale.label;
    const chain = ancestry(sc);
    $('sceneTrail').replaceChildren(...chain.map((node, i) => {
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
    for (const old of board.querySelectorAll('.player')) { old.classList.remove('player'); if (old.firstChild?.nodeType === 3) old.firstChild.remove(); }
    if (entry) { const cell = board.children[entry.position.y * sc.cols + entry.position.x]; if (cell) { cell.classList.add('player'); cell.prepend('PC'); } }
    $('worldScale').style.width = worldZoom * sc.scale.cells + 'px';
    $('name').textContent = c?.name || 'No active character';
    $('stats').textContent = c ? `${c.hp} / ${c.maxHp} HP · ${c.experience} XP${c.bleeding ? ' · Bleeding' : ''}` : '';
    $('unitAc').textContent = c ? `AC ${c.armorClass}` : '';
    $('worldHpFill').style.width = c ? `${100 * c.hp / c.maxHp}%` : '0';
    $('dayLabel').textContent = entry ? clockOf(entry).text : '';
    const pct = (n, of) => `${100 * n / of}%`, dot = (cls, x, y) => { const i = el('i'); i.className = cls; Object.assign(i.style, { left: pct(x, sc.cols), top: pct(y, sc.rows), width: pct(1, sc.cols), height: pct(1, sc.rows) }); return i; };
    $('minimap').replaceChildren(...(sc.image ? [] : [...sc.blocked].map(k => dot('w', ...k.split(',').map(Number)))), ...sc.sites.map(p => dot('s', p.x, p.y)), ...(entry ? [dot('p', entry.position.x, entry.position.y)] : []));
    const s = atSite();
    $('site').textContent = s?.name || (sc.parent ? sc.name : 'Wilderness');
    for (const action of gw.worldActions({ entry, character: c, site: s, moving: !!timer })) {
        const b = $(action.id);
        b.hidden = !action.visible;
        b.disabled = !action.enabled;
        b.title = action.reason;
        b.textContent = action.label;
    } // Artifact interactions belong in inventory, not the exploration toolbar.
    $('experiment').hidden = true;
    $('install').hidden = true;
    const busy = !c || c.hp <= 0 || !!(entry.encounter || entry.pendingEncounter), town = s?.kind === 'town';
    $('tradeBtn').hidden = !town;
    $('tradeBtn').disabled = busy;
    $('restBtn').hidden = !town;
    $('restBtn').disabled = busy;
    $('restBtn').textContent = c?.species === 'robot' ? 'Repair' : 'Rest';
    const powers = c ? gw.availableActions(c).filter(a => !['weapon', 'advance', 'rest', 'bind', 'flee'].includes(a.id)).slice(0, 4) : [];
    $('powerDivider').hidden = !powers.length;
    $('worldPowers').replaceChildren(...powers.map((a, i) => { const b = el('button', `${i + 1} ${a.label}`); b.className = 'slot-key'; b.disabled = true; b.title = `${a.label}: available in combat`; return b; }));
    if (!combat && !opening) flushNews();
}
function load(id) { stop(); entry = null; c = null; try {
    entry = selectRecord(id);
    if (entry.wizardDraft) throw Error('Finish this draft from Character Select before playing.');
    c = characterFor(entry);
    if (!entry.scene && !entry.encounter && !entry.pendingEncounter) entry = updateEntry(id, e => ({ ...e, ...startOf(FIRST_SCENE) }));
    if (c.hp > 0 && !entry.started)
        entry = updateEntry(id, e => ({ ...e, started: true, domars: purse(e), owned: owned(e) }));
    say((entry.encounter || entry.pendingEncounter) ? 'An encounter is in progress. Resume it before exploring.' : c.hp <= 0 ? 'This character is dead. Choose another survivor from Character Select.' : 'Click the map to walk. Sites are labelled; the gate leads out of the valley.');
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
$('board').addEventListener('click', e => { const b = e.target.closest('.cell'); if (opening || combat || !b || !c || c.hp <= 0 || (entry.encounter || entry.pendingEncounter))
    return; walkTo({ x: +b.dataset.x, y: +b.dataset.y }); });
function headFor(site) { if (site && !opening && !combat && c && c.hp > 0 && !(entry.encounter || entry.pendingEncounter)) walkTo({ x: site.x, y: site.y }); }
function walkTo(target) { stop(); const sc = scene(); path = scenePath(sc, entry.position, target); if (!path) {
    say('You cannot get there from here.');
    return;
} if (!path.length)
    return; say(`Walking ${describeDistance(sc, path.length)}${sc.minutesPerCell ? `, about ${describeTime(path.length * sc.minutesPerCell)}` : ''}. Click elsewhere or Stop to change course.`); timer = setInterval(() => { try {
    const p = path.shift();
    if (p) {
        entry = updateEntry(entry.id, d => addMinutes({ ...d, position: p, steps: (d.steps ?? 0) + 1 }, sc.minutesPerCell)); /* Wandering encounter checks are not yet rolled. */
    }
    render();
    if (!path.length) {
        stop();
        render();
        say(atSite() ? `Arrived at ${atSite().name}. ${clockOf(entry).text}.` : `${clockOf(entry).text}. Click a destination to continue.`);
    }
}
catch (err) {
    stop();
    say(err.message);
} }, 180); render(); }
$('interact').onclick = () => { stop(); const s = atSite(); if (opening || combat || !s || !c || c.hp <= 0 || (entry.encounter || entry.pendingEncounter))
    return; try {
    if (s.kind === 'exit') {
        const to = getScene(s.to);
        entry = updateEntry(entry.id, e => ({ ...e, scene: to.id, position: sitePosition(to, s.arrive) }));
        log(`${s.label}. ${clockOf(entry).text}.`);
        render();
        say(`You are now on the ${to.name} map. One square is ${describeDistance(to, 1)}${to.minutesPerCell ? ` and takes about ${describeTime(to.minutesPerCell)} to cross` : ''}.`);
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
        entry = updateEntry(entry.id, d => { const found = awardExperience({ ...d, inventory: [...d.inventory, { id: 'outpost-device', name: 'Unidentified Ancient device', artifact: gw.discoverArtifact(gw.TECHNOLOGY.laserPistol) }, { id: 'hydrogen-cell', name: 'Charged hydrogen cell' }] }, gw.ARTIFACT_EXPERIENCE['Hydrogen energy cell']); found.advancement = { bonuses: found.advancement?.bonuses ?? [], news: [`Recovered a charged hydrogen energy cell: ${gw.ARTIFACT_EXPERIENCE['Hydrogen energy cell']} experience.`, ...(found.advancement?.news ?? [])] }; return found; });
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
$('eventsTab').onclick = () => showTab('events');
$('bagTab').onclick = () => showTab('bag');
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
        for (const [id, label] of [['returnWorld', 'Return to exploration'], ['leaveEncounter', 'Leave (pause fight)']]) {
            const b = el('button', label);
            b.id = id;
            b.hidden = true;
            area.querySelector('.action-bar').append(b);
        }
        const mod = await import('./tactical.js');
        if (entry.id !== id)
            throw Error('Character changed; try again');
        $('utilityPanel').hidden=true; activeUtility=null; area.append($('utilityPanel')); worldArea.remove(); showTab('events');
        area.hidden = false;
        combat = mod.mountTactical({ root: area, information: $('sharedInformation'), embedded: true, characterId: id, onChange:()=>{if(activeUtility===showSheet && !$('utilityPanel').hidden) showSheet();}, initialPrinted: entry.encounter ? printedByCharacter.get(id) ?? 0 : 0, onExit: () => { const previous = combat?.getState(); if (previous?.status === 'active')
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
        ['Rest one day', () => restAt(false), c?.species === 'robot'],
        ['Rest until healed', () => restAt(true), c?.species === 'robot'],
        ['Repair', () => restAt(false), c?.species !== 'robot'],
    ]);
}
function leftTown() { if (inTown()) return false; post('system', 'You are no longer with Mara in Eden Valley.'); for (const old of $('messages').querySelectorAll('.choices')) old.remove(); return true; }
function ask(question, answer) { if (leftTown()) return; post('me', question, c.name || 'You'); post('npc', answer, MARA); maraTopics(); }
function talkMara() { showTab('chat'); post('npc', 'Welcome to Eden Valley. Stock up before you follow the old road.', MARA); maraTopics(); }
function restAt(untilHealed) {
    if (leftTown()) return;
    try {
        stop();
        const before = entry.days ?? 0, robot = c.species === 'robot';
        entry = updateEntry(entry.id, e => robot ? repair(e) : rest(e, untilHealed));
        c = characterFor(entry);
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
function zoomWorld(n) { worldZoom = Math.max(10, Math.min(90, n)); $('board').style.setProperty('--cell', worldZoom + 'px'); $('worldScale').style.width = worldZoom * scene().scale.cells + 'px'; }
$('worldZoomIn').onclick = () => zoomWorld(worldZoom + 6);
$('worldZoomOut').onclick = () => zoomWorld(worldZoom - 6);
function fitWorld() { const vp = $('viewport'), o = scene().open; if (!vp?.clientWidth || !vp.clientHeight) return; zoomWorld(Math.floor(Math.min(vp.clientWidth / o.cols, vp.clientHeight / o.rows))); const b = $('board'); vp.scrollLeft = b.offsetLeft + (o.x + o.cols / 2) * worldZoom - vp.clientWidth / 2; vp.scrollTop = b.offsetTop + (o.y + o.rows / 2) * worldZoom - vp.clientHeight / 2; }
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
$('mapBtn').onclick = utility(() => { const sc = scene(); dialog(`Map · ${sc.name}`, [el('p', `One square is ${describeDistance(sc, 1)}${sc.minutesPerCell ? `, about ${describeTime(sc.minutesPerCell)} on foot` : ''}.`), ...sc.sites.map(t => row(`${t.name}${t.kind === 'exit' ? ` (to ${getScene(t.to).name})` : ''}`, [['Walk there', () => { closeWindow(); headFor(t); }, t.x === entry.position.x && t.y === entry.position.y]])), ...(sc.parent ? [] : [el('p', 'This is the widest map so far. The continent map is not built yet.')])]); });
document.addEventListener('keydown', e => { if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || gw.isTextEntry(e.target) || $('gameDialog').open)
    return; const id = { c: 'sheetBtn', i: 'bagBtn', m: 'mapBtn', j: 'journalBtn' }[e.key.toLowerCase()]; if (id) {
    e.preventDefault();
    $(id).onclick();
}
else if (e.key === 'Enter' && !e.target.closest?.('button,a')) {
    e.preventDefault();
    document.body.classList.remove('expanded-map'); $('mapExpand').textContent='Hide panel'; $('chatTab').onclick();
    $('chatText').focus();
} });

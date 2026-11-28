// Combat as a scene of the play screen: the fight is drawn on the shared board, with the shared frames and action bar.
// Rounds advance when the player acts or passes (Space); there is no End Turn button and no timer.
import { readCampaign, updateEntry, applyProgress, applyAdvancement, settleExperience, storeCombat } from './campaign.js';
import * as gw from '../packages/gamma-world-rules/index.js';
import { partyFor } from './party.js';

const GIFT = 10;
const RESULT = { victory: 'Victory', defeat: 'Defeat', withdrawn: 'You withdrew', peaceful: 'Parted in peace' };
const ICON = { attack: 'attack', throw: 'throw', bind: 'bleed', flee: 'flee', parley: 'talk', gift: 'gift' };
const SHORT = { attack: 'Attack', throw: 'Throw', bind: 'Bind', flee: 'Withdraw', parley: 'Parley' };
const MEET = { attack: 'Attack', parley: 'Talk', gift: 'Gift', flee: 'Back away' };
const WEAPON = ['attack', 'throw'];
const STEP = { w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], arrowup: [0, -1], arrowdown: [0, 1], arrowleft: [-1, 0], arrowright: [1, 0] };
const CAMPAIGN_WALLS = [{ x: 6, y: 3 }, { x: 6, y: 4 }, { x: 6, y: 5 }, { x: 9, y: 6 }];
const PRACTICE_NAMES = ['Thistle', 'Sable', 'Bracken', 'Ember'], PRACTICE_STOCK = ['badger', 'bear', 'dog', 'cat'];

export function mountCombat({ root = globalThis.document, characterId = null, practice = null, initialPrinted = 0, onExit = null, onChange = null } = {}) {
    const $ = id => root.querySelector('#' + id);
    const make = (tag, text, cls) => { const n = document.createElement(tag); if (text != null) n.textContent = text; if (cls) n.className = cls; return n; };
    const campaign = !!characterId;
    let entry = null, base = null, state = null, targetId = null, auto = null, printed = 0, scene = null, mounting = true, setup = practice;
    const addEvent = msg => { const feed = $('events'); feed.append(make('p', msg)); if (feed.children.length > 300) feed.children[0].remove?.(); };
    const guidance = msg => { $('guidance').textContent = msg; };
    const player = () => state?.actors.find(a => a.id === 'player');
    const target = () => state?.actors.find(a => a.id === targetId);
    const alive = a => !!a && a.hp > 0 && !a.fled;
    const foes = () => state.actors.filter(a => a.side === 'right' && alive(a));
    const unfocus = () => globalThis.document?.activeElement?.blur?.();

    function campaignCharacter() {
        entry = readCampaign().characters[characterId];
        if (!entry) throw Error('Select a saved character in the world first');
        const r = entry.record;
        const ch = applyAdvancement(applyProgress(gw.deriveCharacter(r.base, r.generation, r.choices, { ...r.equipment, weightKg: r.weightKg, acquired: entry.acquired ?? [] }), entry.progress), entry);
        ch.antidotes = entry.inventory.filter(i => i.antidote).map(i => i.antidote);
        ch.exhausted = gw.restState(entry.awake ?? 0).exhausted;
        ch.artifact = entry.inventory.find(i => i.id === 'outpost-device')?.artifact;
        if (ch.hp <= 0 && !entry.encounter) throw Error('Character is dead');
        return ch;
    }
    function commit(next, previous) {
        if (campaign)
            entry = updateEntry(characterId, e => {
                const saved = e.encounter;
                if (previous ? (!saved || saved.round !== previous.round || saved.seconds !== previous.seconds || (saved.revision ?? 0) !== (previous.revision ?? 0)) : !!saved)
                    throw Error('Encounter changed in another tab. Reload to resume.');
                const stored = storeCombat(e, next);
                return next.status === 'active' ? stored : settleExperience(stored, e.progress?.experience ?? 0, next.actors.find(a => a.id === 'player').attributes);
            });
        state = next;
    }
    function start(options = setup) {
        setup = options;
        const old = campaign ? entry.encounter : null, pending = campaign ? entry.pendingEncounter : null;
        if (!campaign) base = { ...setup.character, antidotes: [...(setup.antidotes ?? [])] };
        const allies = campaign ? partyFor(entry, base) : Array.from({ length: setup.allies ?? 0 }, (_, i) => ({ ...gw.generateCompanion({ species: 'animal', stock: PRACTICE_STOCK[i % 4], name: PRACTICE_NAMES[i % 4] }), moraleAdjust: gw.leadership(base, 'animal').morale }));
        const fresh = old ?? gw.createEncounter(base, {
            unwary: !!pending?.unwary, allies,
            definition: pending?.definition ?? setup?.definition ?? null,
            creature: pending?.creature ?? setup?.creature ?? 'badder',
            count: pending?.count ?? setup?.count ?? 1,
            surprisePossible: campaign || setup.surprise !== false,
            meeting: campaign || !setup.hostile,
            intelligentMorale: true,
            blocked: campaign ? CAMPAIGN_WALLS : [],
        });
        if (pending?.site) fresh.site = pending.site;
        state = null;
        commit(gw.beginInteractive(fresh), old);
        targetId = null;
        auto = null;
        printed = old ? Math.min(initialPrinted, state.log.length) : 0;
        scene = { id: 'combat', name: 'Combat', layout: 'square', cols: state.width, rows: state.height, open: { x: 0, y: 0, cols: state.width, rows: state.height }, cellMeters: 3, scale: { cells: 2, label: '6 m' }, sites: [], blocked: new Set(), parent: null };
        const board = $('board');
        board.classList?.remove('hex', 'has-image');
        board.classList?.add('combat');
        board.style.backgroundImage = '';
        board.style.setProperty('--cols', state.width);
        board.style.setProperty('--rows', state.height);
        board.style.gridTemplateColumns = `repeat(${state.width},var(--cell))`;
        board.style.gridTemplateRows = `repeat(${state.height},var(--cell))`;
        render();
    }
    const actionsFor = id => gw.combatActions(state, id);
    function preferences() {
        try { const p = JSON.parse(localStorage.getItem('graycloak.gw.powerSlots') || '[]'); return Array.isArray(p) ? p.filter(x => typeof x === 'string') : []; }
        catch { return []; }
    }
    function command(c) {
        const before = state.revision;
        try { commit(gw.interactiveCommand(state, { ...c, expectedRevision: state.revision }), state); }
        catch (e) { guidance(e.message); return false; }
        if (!alive(target())) targetId = null;
        if (auto && !alive(state.actors.find(a => a.id === auto.targetId))) auto = null;
        return state.revision !== before;
    }
    // The round closes itself once the survivor's action is spent; movement alone leaves it open.
    function settle() { if (state.status === 'active' && state.turn?.action) command({ type: 'end' }); }
    function swing() {
        if (!auto || state.status !== 'active' || state.turn?.action) return false;
        const a = actionsFor(auto.targetId).find(a => a.id === auto.id);
        if (!a?.visible || !a.enabled) return false;
        if (!command(a.command)) return false;
        settle();
        return true;
    }
    function invoke(id) {
        if (!state || state.status !== 'active') return;
        const a = actionsFor(targetId).find(a => a.id === id);
        if (!a?.visible) return;
        if (WEAPON.includes(id) && alive(target()) && !gw.meetingOptions(state)) auto = { id, targetId };
        if (!a.enabled) { render(); guidance(auto?.id === id ? `${a.reason}. Auto-attack is set on ${target().name}: it swings when the attack is legal.` : a.reason || 'Action unavailable'); return; }
        if (a.command.type === 'meet' && a.command.choice === 'gift' && campaign) {
            if ((entry.domars ?? 100) < GIFT) { guidance(`A gift costs ${GIFT} domars.`); return; }
            entry = updateEntry(characterId, e => ({ ...e, domars: (e.domars ?? 100) - GIFT }));
        }
        if (command(a.command)) settle();
        render();
    }
    function pass() {
        if (!state || state.status !== 'active') return;
        if (gw.meetingOptions(state)) { guidance('Decide how to meet them first: talk, attack or back away.'); return; }
        if (!swing()) command({ type: 'end' });
        render();
    }
    function moveTo(x, y, pace) {
        if (!gw.interactivePath(state, x, y, pace)?.length) return false;
        if (command({ type: 'move', x, y, pace })) swing();
        render();
        return true;
    }
    function step([dx, dy], pace) {
        if (!state || state.status !== 'active') return;
        const p = player(), x = p.x + dx, y = p.y + dy, there = state.actors.find(a => a.x === x && a.y === y && alive(a));
        if (there?.side === 'right') { select(there.id); invoke('attack'); return; }
        if (moveTo(x, y, pace)) return;
        const turn = state.turn ?? {};
        guidance(gw.meetingOptions(state) ? 'Decide how to meet them first: talk, attack or back away.' : there ? `${there.name} is in the way.` : gw.movementLimit(p, pace) - (turn.moved ?? 0) < 3 ? 'No movement left this round. Press Space to pass the round.' : 'You cannot go that way.');
    }
    function select(id) { targetId = id; if (auto && id) auto = { ...auto, targetId: id }; }
    function fatigue(a) {
        const weaponId = a.equipment?.weaponId;
        if (!weaponId || a.hp <= 0) return { factor: 0, blocked: false, wc: 0, restNeeded: 0 };
        const wc = gw.getWeapon(weaponId).wc, factor = gw.fatigueFactor({ weaponId, armorAC: gw.getArmor(a.equipment?.armorId ?? 'none').ac, rounds: (a.fightRounds ?? 0) + 1, rest: a.rest ?? 0, PS: a.attributes.PS, synthetic: a.species === 'robot' });
        return { factor, wc, blocked: factor >= wc, restNeeded: Math.max(0, factor - wc + 1) };
    }
    const injury = a => a.hp <= 0 ? 'Down' : a.hp === a.maxHp ? 'Uninjured' : a.hp / a.maxHp > .75 ? 'Lightly wounded' : a.hp / a.maxHp > .5 ? 'Wounded' : a.hp / a.maxHp > .25 ? 'Badly wounded' : 'Near death';
    const leave = () => onExit?.(state);
    function showResult(ended) {
        const host = $('viewport')?.parentElement;
        if (!host?.querySelector) return;
        host.querySelector('.result-banner')?.remove();
        if (!ended) return;
        const box = make('div', null, 'result-banner'), p = player(), fallen = state.status === 'victory' && p.hp <= 0;
        box.append(make('h2', fallen ? 'Fallen' : RESULT[state.status] ?? state.status), make('p', fallen ? `${p.name || 'Your survivor'} has fallen, but the companions held the field.` : state.status === 'victory' ? `${state.xpAwarded} experience gained. ${p.hp} / ${p.maxHp} HP left after ${state.round} round${state.round === 1 ? '' : 's'}.` : state.status === 'defeat' ? `${p.name || 'Your survivor'} has fallen.` : `The encounter is over. ${p.hp} / ${p.maxHp} HP.`));
        const b = make('button', campaign ? (state.status === 'defeat' ? 'Leave the field' : 'Return to exploration') : 'New encounter', 'primary');
        b.type = 'button';
        b.title = 'Enter';
        b.onclick = leave;
        box.append(b);
        host.append(box);
    }
    function drawBoard(ended) {
        const reachable = new Set(), cells = [];
        if (!ended)
            for (let y = 0; y < state.height; y++)
                for (let x = 0; x < state.width; x++)
                    if (gw.interactivePath(state, x, y)?.length) reachable.add(`${x},${y}`);
        for (let y = 0; y < state.height; y++)
            for (let x = 0; x < state.width; x++) {
                const a = state.actors.find(a => !a.fled && a.x === x && a.y === y && a.hp > 0) ?? state.actors.find(a => !a.fled && a.x === x && a.y === y);
                const cell = make('button', '', ['cell', gw.blockedCell(state, x, y) ? 'wall' : '', Math.abs(y - (5 + Math.sin(x * .45) * 1.5)) < 1.1 ? 'road' : (x + y) % 7 === 0 ? 'woods' : '', reachable.has(`${x},${y}`) ? 'reachable' : '', a ? 'actor' : '', a && a.id === targetId ? 'selected' : '', a?.id === 'player' ? 'pc' : ''].filter(Boolean).join(' '));
                cell.type = 'button';
                cell.dataset.x = x;
                cell.dataset.y = y;
                cell.setAttribute('aria-label', a ? `${a.name}, ${a.side === 'left' ? a.hp + ' HP' : injury(a)}, column ${x + 1}, row ${y + 1}` : `Column ${x + 1}, row ${y + 1}`);
                if (a) {
                    cell.append(make('span', (a.name || 'P')[0].toUpperCase() + (a.side === 'right' ? a.name.match(/\d+$/)?.[0] ?? '' : ''), `token ${a.side === 'right' ? 'npc' : a.ally ? 'ally' : ''} ${a.hp <= 0 || a.fled ? 'dead' : ''}${auto?.targetId === a.id ? ' marked' : ''}`));
                    if (a.side === 'right') cell.append(make('small', injury(a), 'token-caption'));
                    if (a.ally) cell.append(make('small', `${a.name} ${a.hp}/${a.maxHp}`, 'token-caption'));
                    if (a.side === 'right' && alive(a)) cell.dataset.target = a.id;
                }
                cells.push(cell);
            }
        $('board').replaceChildren(...cells);
    }
    function drawFoe() {
        const t = target(), frame = $('foeFrame'), p = player();
        frame.hidden = !t;
        if (!t) return;
        const mood = state.meeting?.result?.label;
        $('foePortrait').textContent = t.name[0].toUpperCase();
        $('foeName').textContent = t.name;
        $('foeAc').textContent = `AC ${t.armorClass}`;
        // Creatures are reported by condition, not by number: four bands from uninjured down to near death.
        const left = t.hp <= 0 ? 0 : Math.max(1, Math.ceil(4 * t.hp / t.maxHp));
        [...$('foeBands').children].forEach((b, i) => { b.className = i < left ? 'on' : ''; });
        $('foeState').textContent = `${mood ? mood[0].toUpperCase() + mood.slice(1) : 'Hostile'} · ${injury(t).toLowerCase()} · ${gw.distance(p, t).toFixed(0)} m`;
        $('foeAttack').textContent = [t.natural ? (t.natural[0] ? `Attack ${t.natural[0]}d${t.natural[1]}` : 'Touch attack') : '', t.poison ? `${t.poison.paralytic ? 'paralytic ' : ''}poison ${t.poison.intensity}` : '', t.radiate ? `radiation ${t.radiate.intensity}, ${t.radiate.range} m` : ''].filter(Boolean).join(', ');
    }
    function drawBar(states, ended, tired) {
        const by = id => states.find(a => a.id === id), meeting = gw.meetingOptions(state), slots = [];
        const slot = (a, label, icon, extra = {}) => { if (a?.visible) slots.push({ a, label, icon, ...extra }); };
        if (!ended) {
            slot(by('attack'), meeting ? MEET.attack : tired.blocked && !state.turn?.action ? 'Too tired' : SHORT.attack, ICON.attack);
            slot(by('throw'), SHORT.throw, ICON.throw);
            for (const a of gw.powerSlots(states, preferences())) slot(a, a.id.startsWith('antidote-') ? a.label.replace(/ \(.*$/, '') : a.label, a.id.startsWith('antidote-') ? 'poison' : 'power');
            slot(by('bind'), SHORT.bind, ICON.bind);
            slot(by('parley'), meeting ? MEET.parley : SHORT.parley, ICON.parley);
            slot(by('gift'), MEET.gift, ICON.gift, meeting && campaign && (entry.domars ?? 100) < GIFT ? { blocked: `A gift costs ${GIFT} domars` } : {});
            slot(by('flee'), meeting ? MEET.flee : SHORT.flee, ICON.flee);
        }
        const buttons = slots.map(({ a, label, icon, blocked }, i) => {
            const b = make('button', label);
            b.type = 'button';
            b.dataset.icon = icon;
            if (i < 9) b.dataset.key = String(i + 1);
            b.dataset.action = a.id;
            b.disabled = !!blocked || (!a.enabled && !(WEAPON.includes(a.id) && alive(target()) && !meeting));
            b.title = blocked || (a.enabled ? a.label : `${a.label}: ${a.reason}`);
            if (auto?.id === a.id) { b.setAttribute('aria-pressed', 'true'); b.title += ' · auto-attack on'; }
            if (!a.enabled) b.className = 'dim';
            b.onclick = () => { unfocus(); invoke(a.id); };
            return b;
        });
        if (campaign) {
            const b = make('button', ended ? 'Return' : 'Leave');
            b.type = 'button';
            b.dataset.icon = 'back';
            if (buttons.length < 9) b.dataset.key = String(buttons.length + 1);
            b.dataset.action = 'leave';
            b.title = ended ? 'Return to exploration' : 'Leave the fight paused and return to the map';
            b.onclick = leave;
            buttons.push(b);
        }
        $('combatBar').replaceChildren(...buttons);
    }
    function render() {
        if (!state) return;
        const p = player(), t = target(), ended = state.status !== 'active', turn = state.turn ?? { moved: 0, action: null }, tired = fatigue(p), meeting = gw.meetingOptions(state), states = actionsFor(targetId);
        drawBoard(ended);
        drawFoe();
        drawBar(states, ended, tired);
        const chip = $('turnChip'), left = turn.action || p.hp <= 0 ? 0 : +Math.max(0, gw.movementLimit(p, turn.pace ?? 'normal') - turn.moved).toFixed(1), marked = !ended && auto && state.actors.find(a => a.id === auto.targetId);
        chip.hidden = false;
        chip.replaceChildren(...[
            ended ? `${RESULT[state.status] ?? state.status} · ${state.seconds} seconds` : `Round ${state.round} · ${state.order.first === 'left' ? 'You act first' : state.order.first === 'right' ? 'Creatures acted first' : 'Simultaneous'}`,
            ended ? '' : `${left} m left`,
            !ended && tired.factor ? `Fatigue −${tired.factor}: ${tired.blocked ? 'too tired to attack' : `weapon class ${tired.wc} → ${tired.wc - tired.factor}`}` : '',
            marked ? `Auto-attack: ${marked.name}` : '',
            ended ? 'Enter: leave' : 'Space: pass the round',
        ].filter(Boolean).map(text => make('span', text)));
        showResult(ended);
        const error = states.find(a => a.id === 'attack')?.reason ?? '';
        guidance(meeting ? (meeting.result ? `They are ${meeting.result.label} (reaction ${meeting.result.score}). ${meeting.gift ? `Make an offer worth ${GIFT} domars to roll again at +1, attack, or back away.` : 'Attack or back away.'}` : `You have the first move and they have not attacked. Talk (2d6 reaction roll with your Charisma), offer a gift worth ${GIFT} domars for +1, attack, or back away.`)
            : ended ? `Encounter ${state.status}. ${state.pendingRulings.join('; ')}`
            : p.dying && !turn.action ? 'Dying stroke: select your attacker and attack at close range, or press Space.'
            : tired.blocked ? `Fatigue: after ${p.fightRounds} rounds of fighting you are too tired to attack with the ${gw.getWeapon(p.equipment.weaponId).name}. Press Space without moving to rest (${tired.restNeeded} round${tired.restNeeded === 1 ? '' : 's'}), or Withdraw.`
            : !t ? 'Click an opponent or press T to select one. Move with W A S D, the arrows or a click; Shift trots. Space passes the round.'
            : auto ? (error ? `${error}. Move into range and the attack follows.` : 'Auto-attack is on: Space or a step in range swings again. Escape stops it.')
            : error ? `${error}. Move into range or choose another action.` : 'Press 1 to attack. After that the attack repeats each round you pass with Space.');
        while (printed < state.log.length) addEvent(state.log[printed++]);
        if (!mounting) onChange?.(state);
    }
    const paceOf = e => e.ctrlKey ? 'charge' : e.shiftKey ? 'trot' : 'normal';
    const clearPreview = () => { for (const n of $('board').children) if (n.className.includes(' path') || n.className.includes('unreachable-preview')) n.className = n.className.replace(/ (path|unreachable-preview)\b/g, ''); };
    function onOver(e) {
        const cell = e.target.closest?.('.cell');
        if (!cell || !state || cell.dataset.x == null) return;
        clearPreview();
        if (cell.dataset.target || state.status !== 'active') return;
        const x = +cell.dataset.x, y = +cell.dataset.y, path = gw.interactivePath(state, x, y, paceOf(e));
        if (path?.length) {
            for (const q of path) { const n = $('board').children[q.y * state.width + q.x]; if (n) n.className += ' path'; }
            cell.title = `Move ${gw.pathDistance(player(), path).toFixed(1)} m`;
        }
        else if (!(x === player().x && y === player().y)) {
            cell.className += ' unreachable-preview';
            cell.title = `${gw.distance(player(), { x, y }).toFixed(1)} m · out of reach this round`;
        }
    }
    function onClick(e) {
        const cell = e.target.closest?.('.cell');
        if (!cell || !state || state.status !== 'active' || cell.dataset.x == null) return;
        unfocus();
        if (cell.dataset.target) { select(cell.dataset.target); render(); return; }
        const x = +cell.dataset.x, y = +cell.dataset.y;
        if (x === player().x && y === player().y) return;
        if (!moveTo(x, y, paceOf(e))) guidance(gw.meetingOptions(state) ? 'Decide how to meet them first: talk, attack or back away.' : 'Out of reach this round. Highlighted squares can be reached; Shift-click trots, Ctrl-click charges.');
    }
    function key(e) {
        if (!state) return false;
        const k = e.key.toLowerCase(), focus = e.target?.closest?.('button,a');
        const done = () => { e.preventDefault?.(); return true; };
        if (state.status !== 'active') { if (k === 'enter' && !focus) { leave(); return done(); } return false; }
        if (/^[1-9]$/.test(k)) { const b = [...$('combatBar').children].find(b => b.dataset.key === k); if (b && !b.disabled) b.onclick(); return done(); }
        if (STEP[k]) { step(STEP[k], e.shiftKey ? 'trot' : 'normal'); return done(); }
        if (k === ' ') { if (focus && !focus.closest?.('#board')) return false; pass(); return done(); }
        if (k === 'escape') { auto = null; targetId = null; render(); return done(); }
        if (k === 't' || k === 'tab' && !focus) {
            const list = foes();
            if (list.length) { select(list[(list.findIndex(a => a.id === targetId) + 1) % list.length].id); render(); }
            return done();
        }
        return false;
    }
    function dispose() {
        const board = $('board');
        board.removeEventListener?.('pointerover', onOver);
        board.removeEventListener?.('pointerleave', clearPreview);
        board.removeEventListener?.('click', onClick);
        board.classList?.remove('combat');
        $('viewport')?.parentElement?.querySelector?.('.result-banner')?.remove();
        $('combatBar').replaceChildren();
        $('foeFrame').hidden = true;
        $('turnChip').hidden = true;
    }
    if (campaign) base = campaignCharacter();
    $('board').addEventListener('pointerover', onOver);
    $('board').addEventListener('pointerleave', clearPreview);
    $('board').addEventListener('click', onClick);
    try { start(); }
    catch (err) { dispose(); throw err; }
    mounting = false;
    return { get scene() { return scene; }, render, key, pass, dispose, getState: () => state, position: () => ({ x: player().x, y: player().y }), restart(options) { start(options); onChange?.(state); } };
}

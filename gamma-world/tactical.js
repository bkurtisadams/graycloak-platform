import { readCampaign, updateEntry, applyProgress, storeCombat } from './campaign.js';
import * as gw from '../packages/gamma-world-rules/index.js';
export function mountTactical({ root = null, information = null, embedded = false, characterId = null, initialPrinted = 0, onExit = null, onChange = null } = {}) {
    const $ = id => root?.querySelector('#' + id) ?? information?.querySelector('#' + id) ?? (!root ? document.getElementById(id) : null);
    const make = (tag, text, cls) => { const n = document.createElement(tag); if (text != null)
        n.textContent = text; if (cls)
        n.className = cls; return n; };
    const campaignMode = embedded || new URLSearchParams(globalThis.location?.search ?? '').get('campaign') === '1';
    let campaignId = null, campaignEntry = null;
    let base = null, state = null, targetId = null, zoom = 42, printed = 0, drag = null, hoverTarget = null, reachable = new Set();
    const addEvent = msg => { const feed = $('events'); feed.append(make('p', msg)); if (feed.children.length > 300)
        feed.firstChild.remove(); feed.scrollTop = feed.scrollHeight; };
    const guidance = msg => { $('guidance').textContent = msg; };
    function readCharacter() { for (const [storage, key] of [[sessionStorage, 'graycloak.gw.sandbox.character']]) {
        try {
            const data = JSON.parse(storage.getItem(key) || 'null');
            storage.removeItem?.(key);
            if (data?.format === 'graycloak-gw-workshop' && data.version === 2)
                return gw.deriveCharacter(data.base, data.generation, data.choices, { ...data.equipment, weightKg: data.weightKg });
        }
        catch (err) {
            addEvent(`Saved character not loaded: ${err.message}`);
        }
    } const b = gw.generateCharacter({ species: 'psh', name: 'Test survivor' }); return gw.deriveCharacter(b, gw.mutationDraft(b), [], { armorId: 'hide', weaponId: 'long-sword' }); }
    if (campaignMode) {
        try {
            const d = readCampaign();
            campaignId = characterId || new URLSearchParams(globalThis.location?.search ?? '').get('id') || d.active;
            campaignEntry = d.characters[campaignId];
            if (!campaignEntry)
                throw Error('Select a saved character in the world first');
            const r = campaignEntry.record;
            base = applyProgress(gw.deriveCharacter(r.base, r.generation, r.choices, { ...r.equipment, weightKg: r.weightKg }), campaignEntry.progress);
            base.artifact = campaignEntry.inventory.find(i => i.id === 'outpost-device')?.artifact;
            if (base.hp <= 0 && !campaignEntry.encounter)
                throw Error('Character is dead');
            $('battleNotice').textContent = 'Campaign encounter: damage, Mental Strength and XP persist after each committed action.';
        }
        catch (e) {
            guidance(e.message);
            throw e;
        }
    }
    else
        base = readCharacter();
    if ($('warnings'))
        $('warnings').textContent = base.reviewRequired.length ? base.reviewRequired.join(' • ') : 'No pending construction rulings.';
    for (const [id, c] of Object.entries(gw.CREATURES)) {
        const o = make('option', c.name);
        o.value = id;
        $('creature').append(o);
    }
    const player = () => state?.actors.find(a => a.id === 'player');
    const target = () => state?.actors.find(a => a.id === targetId);
    const alive = a => a && a.hp > 0 && !a.fled;
    function setZoom(n) { zoom = Math.min(96, Math.max(22, n)); $('board').style.setProperty('--cell', `${zoom}px`); $('mapScale').textContent = `3 m / square · ${Math.round(zoom / 42 * 100)}%`; }
    function fit() { if (!state)
        return; const vp = $('viewport'); setZoom(Math.floor(Math.min(vp.clientWidth / state.width, vp.clientHeight / state.height))); vp.scrollTo(0, 0); }
    function commit(next, previous) { if (campaignMode)
        campaignEntry = updateEntry(campaignId, e => { const saved = e.encounter; if (previous ? (!saved || saved.round !== previous.round || saved.seconds !== previous.seconds || (saved.revision ?? 0) !== (previous.revision ?? 0)) : !!saved)
            throw Error('Encounter changed in another tab. Reload to resume.'); return storeCombat(e, next); }); state = next; }
    function start() { try {
        const old = campaignMode ? campaignEntry.encounter : null;
        if (campaignMode && state)
            return;
        const fresh = old ?? gw.createEncounter(base, { creature: campaignEntry?.pendingEncounter?.creature ?? $('creature').value, count: campaignEntry?.pendingEncounter?.count ?? Number($('count').value), surprisePossible: $('surprise').checked, blocked: campaignMode ? [{ x: 6, y: 3 }, { x: 6, y: 4 }, { x: 6, y: 5 }, { x: 9, y: 6 }] : [] });
        if (campaignEntry?.pendingEncounter?.site)
            fresh.site = campaignEntry.pendingEncounter.site;
        commit(gw.beginInteractive(fresh), old);
        targetId = null;
        printed = old && embedded ? Math.min(initialPrinted, state.log.length) : 0;
        if (!embedded)
            $('events').replaceChildren();
        render();
        fit();
    }
    catch (err) {
        guidance(err.message);
        if (embedded)
            throw err;
    } }
    function preferences() { try {
        const p = JSON.parse(localStorage.getItem('graycloak.gw.powerSlots') || '[]');
        return Array.isArray(p) ? p.filter(x => typeof x === 'string') : [];
    }
    catch {
        return [];
    } }
    function actionStates() { return gw.combatActions(state, targetId); }
    function invoke(id) { const a = actionStates().find(a => a.id === id); if (!a?.visible || !a.enabled) {
        guidance(a?.reason || 'Action unavailable');
        return;
    } command(a.command); }
    function command(c) { try {
        commit(gw.interactiveCommand(state, { ...c, expectedRevision: state.revision }), state);
        if (!alive(target()))
            targetId = null;
        render();
        onChange?.(state);
    }
    catch (e) {
        guidance(e.message);
    } }
    function injury(a) { return a.hp <= 0 ? 'Down' : a.hp === a.maxHp ? 'Uninjured' : a.hp / a.maxHp > .75 ? 'Lightly wounded' : a.hp / a.maxHp > .5 ? 'Wounded' : a.hp / a.maxHp > .25 ? 'Badly wounded' : 'Near death'; }
    function render() {
        if (!state)
            return;
        const p = player(), t = target(), ended = state.status !== 'active', board = $('board');
        reachable = new Set();
        if (!ended)
            for (let y = 0; y < state.height; y++)
                for (let x = 0; x < state.width; x++)
                    if (gw.interactivePath(state, x, y)?.length)
                        reachable.add(`${x},${y}`);
        const cells = [];
        for (let y = 0; y < state.height; y++)
            for (let x = 0; x < state.width; x++) {
                const key = `${x},${y}`;
                const a = state.actors.find(a => !a.fled && a.x === x && a.y === y && a.hp > 0) ?? state.actors.find(a => !a.fled && a.x === x && a.y === y);
                const cls = ['cell', gw.blockedCell(state, x, y) ? 'wall' : '', Math.abs(y - (5 + Math.sin(x * .45) * 1.5)) < 1.1 ? 'road' : (x + y) % 7 === 0 ? 'woods' : '', reachable.has(key) ? 'reachable' : '', a ? 'actor' : '', a?.id === targetId ? 'selected' : '', a?.id === 'player' ? 'player' : ''].filter(Boolean).join(' ');
                const cell = make('button', '', cls);
                cell.type = 'button';
                cell.dataset.x = x;
                cell.dataset.y = y;
                cell.setAttribute('aria-label', a ? `${a.name}, ${a.side === 'left' ? a.hp + ' HP' : injury(a)}, column ${x + 1}, row ${y + 1}` : `Column ${x + 1}, row ${y + 1}`);
                if (a) {
                    const token = make('span', a.side === 'left' ? (a.species === 'robot' ? 'R' : a.species === 'plant' ? 'P' : 'PC') : a.name[0], `token ${a.side === 'right' ? 'npc' : ''} ${a.hp <= 0 ? 'dead' : ''}`);
                    cell.append(token);
                    if (a.side === 'right') cell.append(make('small', injury(a), 'token-caption'));
                    if (a.id !== 'player' && alive(a))
                        cell.dataset.target = a.id;
                }
                cells.push(cell);
            }
        board.replaceChildren(...cells);
        board.style.gridTemplateColumns = `repeat(${state.width},var(--cell))`;
        board.style.gridTemplateRows = `repeat(${state.height},var(--cell))`;
        $('roundInfo').textContent = ended ? `${state.status.toUpperCase()} · ${state.seconds} seconds · ${state.xpAwarded} sandbox XP` : `Round ${state.round} · ${state.seconds} seconds elapsed · ${state.order.first === 'left' ? 'Player first' : state.order.first === 'right' ? 'Creatures acted first' : 'Simultaneous'}`;
        $('pcName').textContent = p.name || 'Unnamed survivor';
        $('pcStats').textContent = `${p.species} · AC ${p.armorClass} · MS ${p.attributes.MS} · DX ${p.attributes.DX}`;
        $('pcHP').textContent = `${p.hp} / ${p.maxHp} HP${p.bleeding ? ' · BLEEDING' : ''}`;
        $('hpFill').style.width = `${100 * p.hp / p.maxHp}%`;
        $('targetName').textContent = t ? t.name : 'None';
        $('targetStats').textContent = t ? `${injury(t)} · ${gw.distance(p, t).toFixed(1)} m` : 'Click an opponent on the map.';
        const turn = state.turn ?? { moved: 0, action: null };
        $('planText').textContent = `${turn.action ? 'Action used' : 'Action available'} · ${turn.action || p.hp <= 0 ? 0 : +Math.max(0, gw.movementLimit(p, turn.pace ?? 'normal') - turn.moved).toFixed(1)} m remaining`;
        const states = actionStates(), by = id => states.find(a => a.id === id);
        const btn = (id, key = id) => { const b = $(id), a = by(key); b.hidden = !a?.visible; b.disabled = !a?.enabled; b.title = a?.reason || ''; if (a)
            b.textContent = a.label; return a?.reason || ''; };
        const error = btn('attack');
        btn('throw');
        btn('bind');
        btn('flee');
        btn('parley');
        btn('endTurn');
        $('mental').hidden = true;
        $('powersLabel').hidden = true;
        $('usePower').hidden = true;
        const slots = $('powerSlots');
        if (slots) {
            const powers = gw.powerSlots(states, preferences());
            slots.replaceChildren(...powers.map((a, i) => { const b = make('button', `${i < 9 ? i + 1 + ' · ' : ''}${a.label}`); b.disabled = !a.enabled; b.title = a.reason; b.onclick = () => invoke(a.id); return b; }));
            $('customizePowers').hidden = !powers.length;
        }
        if (campaignMode)
            for (const id of ['start', 'creature', 'count', 'surprise'])
                $(id).disabled = true;
        if (embedded) {
            $('returnWorld').hidden = !ended;
            $('leaveEncounter').hidden = ended;
        }
        guidance(ended ? `Encounter ${state.status}. ${state.pendingRulings.join('; ')}` : p.dying && !turn.action ? 'Dying stroke available. Target your attacker, attack at close range or End Turn.' : turn.queued ? 'Action declared. End Turn resolves both sides simultaneously.' : turn.action ? 'Action committed. End Turn to resolve remaining combat.' : !t ? 'Click a highlighted square to move, or select an opponent. End Turn to wait.' : error ? `${error}. Move into range or choose another legal action. End Turn when finished.` : 'Attack the selected opponent, or move before attacking. End Turn when finished.');
        while (printed < state.log.length)
            addEvent(state.log[printed++]);
    }
    $('board').addEventListener('pointerover', e => { const cell = e.target.closest?.('.cell'); hoverTarget = cell?.dataset.target ?? null; if (!cell || !state)
        return; for (const n of $('board').children)
        n.classList?.remove('path', 'unreachable-preview'); if (hoverTarget)
        return; const x = +cell.dataset.x, y = +cell.dataset.y, pace = e.ctrlKey ? 'charge' : e.shiftKey ? 'trot' : 'normal'; const path = gw.interactivePath(state, x, y, pace); if (path?.length) {
        for (const q of path)
            $('board').children[q.y * state.width + q.x]?.classList?.add('path');
        cell.title = `Move ${gw.pathDistance(player(), path).toFixed(1)} m`;
        $('mapScale').textContent = cell.title;
    }
    else {
        cell.classList?.add('unreachable-preview');
        cell.title = `${gw.distance(player(), { x, y }).toFixed(1)} m direct · Unreachable`;
        $('mapScale').textContent = cell.title;
    } });
    $('board').addEventListener('pointerleave', () => { hoverTarget = null; for (const n of $('board').children)
        n.classList?.remove('path', 'unreachable-preview'); $('mapScale').textContent = `3 m / square · ${Math.round(zoom / 42 * 100)}%`; });
    $('board').addEventListener('click', e => { const cell = e.target.closest('.cell'); if (!cell || !state || state.status !== 'active')
        return; if (cell.dataset.target) {
        targetId = cell.dataset.target;
        render();
        return;
    } const x = Number(cell.dataset.x), y = Number(cell.dataset.y); if (x === player().x && y === player().y)
        return; const pace = e.ctrlKey ? 'charge' : e.shiftKey ? 'trot' : 'normal'; if (!gw.interactivePath(state, x, y, pace)?.length) {
        guidance('Cannot move there. Choose a reachable square before attacking.');
        return;
    } command({ type: 'move', x, y, pace }); });
    $('start').addEventListener('click', start);
    $('attack').addEventListener('click', () => invoke('attack'));
    $('throw').addEventListener('click', () => invoke('throw'));
    $('mental').addEventListener('click', () => invoke('mental-24'));
    $('usePower').addEventListener('click', () => invoke($('action').value));
    $('bind').addEventListener('click', () => invoke('bind'));
    $('flee').addEventListener('click', () => invoke('flee'));
    $('parley').addEventListener('click', () => invoke('parley'));
    $('endTurn').addEventListener('click', e => { if (e.detail > 1)
        return; invoke('endTurn'); });
    $('action').addEventListener('change', render);
    $('zoomOut').onclick = () => setZoom(zoom - 8);
    $('zoomIn').onclick = () => setZoom(zoom + 8);
    $('fit').onclick = fit;
    const vp = $('viewport');
    vp.addEventListener('wheel', e => { if (e.ctrlKey) {
        e.preventDefault();
        setZoom(zoom + (e.deltaY < 0 ? 6 : -6));
    } }, { passive: false });
    vp.addEventListener('contextmenu', e => e.preventDefault());
    vp.addEventListener('pointerdown', e => { if (e.button === 2) {
        e.preventDefault();
        drag = { x: e.clientX, y: e.clientY, left: vp.scrollLeft, top: vp.scrollTop };
        vp.setPointerCapture(e.pointerId);
    } });
    vp.addEventListener('pointermove', e => { if (drag) {
        vp.scrollLeft = drag.left - (e.clientX - drag.x);
        vp.scrollTop = drag.top - (e.clientY - drag.y);
    } });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
        vp.addEventListener(type, () => drag = null);
    const customize = $('customizePowers');
    if (customize)
        customize.onclick = () => { const panel = $('powerConfig'); if (!panel)
            return; panel.hidden = !panel.hidden; const powers = gw.powerSlots(actionStates(), preferences()); panel.replaceChildren(...powers.map((a, i) => { const b = make('button', `Move ${a.label} earlier`); b.disabled = i === 0; b.onclick = () => { const ids = powers.map(p => p.id); [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]]; localStorage.setItem('graycloak.gw.powerSlots', JSON.stringify(ids)); panel.hidden = true; render(); }; return b; })); };
    const keyHandler = e => { if ((embedded && document.querySelector('dialog[open]')) || e.repeat || gw.isTextEntry(e.target) || e.ctrlKey || e.altKey || e.metaKey)
        return; if (!state)
        return; if (/^[1-9]$/.test(e.key)) {
        const a = gw.powerSlots(actionStates(), preferences())[Number(e.key) - 1];
        if (a) {
            e.preventDefault();
            invoke(a.id);
        }
        return;
    } if (e.key === 'Escape') {
        e.preventDefault();
        targetId = null;
        render();
    }
    else if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        const enemies = state.actors.filter(a => a.side === 'right' && alive(a));
        if (enemies.length) {
            targetId = enemies.some(a => a.id === hoverTarget) ? hoverTarget : enemies[(enemies.findIndex(a => a.id === targetId) + 1) % enemies.length].id;
            render();
        }
    }
    else if (e.key.toLowerCase() === 'a' && !$('attack').disabled && !$('attack').hidden) {
        e.preventDefault();
        invoke('attack');
    }
    else if ((e.key.toLowerCase() === 'r' || e.key === ' ' && !e.target.closest?.('button,a')) && !$('endTurn').disabled) {
        e.preventDefault();
        invoke('endTurn');
    } };
    document.addEventListener('keydown', keyHandler);
    if (!embedded)
        for (const [id, chat] of [['eventsTab', false], ['chatTab', true]])
            $(id).addEventListener('click', () => { $('events').hidden = chat; $('chat').hidden = !chat; $('eventsTab').setAttribute('aria-pressed', String(!chat)); $('chatTab').setAttribute('aria-pressed', String(chat)); });
    if (!embedded)
        $('chatForm').addEventListener('submit', e => { e.preventDefault(); const msg = $('chatText').value.trim(); if (!msg)
            return; $('messages').append(make('p', `${base.name || 'You'}: ${msg}`)); if ($('messages').children.length > 100)
            $('messages').firstChild.remove(); $('chatText').value = ''; $('messages').scrollTop = $('messages').scrollHeight; });
    if (embedded) {
        $('returnWorld').onclick = () => onExit?.();
        $('leaveEncounter').onclick = () => onExit?.();
    }
    try {
        start();
    }
    catch (err) {
        document.removeEventListener('keydown', keyHandler);
        throw err;
    }
    return { dispose() { document.removeEventListener('keydown', keyHandler); }, getState: () => state };
}
if (globalThis.document && !globalThis.document.querySelector?.('#worldShell'))
    mountTactical();

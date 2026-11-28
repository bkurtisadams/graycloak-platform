import { readCampaign, updateEntry, applyProgress, applyAdvancement, settleExperience, storeCombat } from './campaign.js';
import * as gw from '../packages/gamma-world-rules/index.js';
import { loadRegion } from './world.js';
import { partyFor } from './party.js';
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
            base = applyAdvancement(applyProgress(gw.deriveCharacter(r.base, r.generation, r.choices, { ...r.equipment, weightKg: r.weightKg, acquired: campaignEntry.acquired ?? [] }), campaignEntry.progress), campaignEntry);
            base.antidotes = campaignEntry.inventory.filter(i => i.antidote).map(i => i.antidote);
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
    // Practice only: every creature on the encounter tables that can be played, straight from the campaign bestiary.
    const practice = new Map();
    if (!campaignMode) loadRegion().then(sc => {
        const names = [...new Set(Object.values(sc.encounters.ENCOUNTER_TABLES).flat().map(r => r.creature))].sort();
        for (const name of names) {
            const found = gw.playableCreature(sc.bestiary, name);
            if (!found || gw.CREATURES[found.key]) continue;
            practice.set(`bestiary:${found.key}`, found);
            const o = make('option', `${name} — ${found.definition.notes.split('.')[0]}`);
            o.value = `bestiary:${found.key}`;
            $('creature').append(o);
        }
    }).catch(() => {});
    const player = () => state?.actors.find(a => a.id === 'player');
    const target = () => state?.actors.find(a => a.id === targetId);
    const alive = a => a && a.hp > 0 && !a.fled;
    function setZoom(n) { zoom = Math.min(96, Math.max(22, n)); $('board').style.setProperty('--cell', `${zoom}px`); $('mapScale').textContent = `3 m / square · ${Math.round(zoom / 42 * 100)}%`; const bar = $('scaleBar'); if (bar?.style) bar.style.width = `${zoom * 2}px`; }
    function fit() { if (!state)
        return; const vp = $('viewport'); setZoom(Math.floor(Math.min(vp.clientWidth / state.width, vp.clientHeight / state.height))); vp.scrollTo(0, 0); }
    function commit(next, previous) { if (campaignMode)
        campaignEntry = updateEntry(campaignId, e => { const saved = e.encounter; if (previous ? (!saved || saved.round !== previous.round || saved.seconds !== previous.seconds || (saved.revision ?? 0) !== (previous.revision ?? 0)) : !!saved)
            throw Error('Encounter changed in another tab. Reload to resume.'); const stored = storeCombat(e, next); return next.status === 'active' ? stored : settleExperience(stored, e.progress?.experience ?? 0, next.actors.find(a => a.id === 'player').attributes); }); state = next; }
    function start() { try {
        const old = campaignMode ? campaignEntry.encounter : null;
        if (campaignMode && state)
            return;
        const picked = campaignMode ? null : practice.get($('creature').value);
        if (!campaignMode && $('antidotes')) base.antidotes = ($('antidotes').value.match(/\d+/g) ?? []).map(Number).filter(n => n >= 3 && n <= 18);
        const fresh = old ?? gw.createEncounter(base, { allies: campaignMode ? partyFor(campaignEntry, base) : Array.from({ length: Number($('allies')?.value ?? 0) }, (_, i) => ({ ...gw.generateCompanion({ species: 'animal', stock: ['badger', 'bear', 'dog', 'cat'][i % 4], name: ['Thistle', 'Sable', 'Bracken', 'Ember'][i % 4] }), moraleAdjust: gw.leadership(base, 'animal').morale })), definition: campaignEntry?.pendingEncounter?.definition ?? picked?.definition ?? null, creature: campaignEntry?.pendingEncounter?.creature ?? picked?.key ?? $('creature').value, count: campaignEntry?.pendingEncounter?.count ?? Number($('count').value), surprisePossible: $('surprise').checked, meeting: campaignMode || !$('hostile')?.checked, intelligentMorale: true, blocked: campaignMode ? [{ x: 6, y: 3 }, { x: 6, y: 4 }, { x: 6, y: 5 }, { x: 9, y: 6 }] : [] });
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
    // Repeat attack: once on, the last attack is used again each round until something changes.
    let auto = false, autoTimer = null, lastAttack = null;
    try { auto = localStorage.getItem('graycloak.gw.repeatAttack') === '1'; } catch { auto = false; }
    const PASSIVE = ['endTurn', 'flee', 'parley', 'bind'];
    function renderAuto() { const b = $('autoAttack'); if (!b) return; b.textContent = auto ? 'Repeat: On' : 'Repeat: Off'; b.setAttribute('aria-pressed', String(auto)); b.title = auto ? 'Your last attack repeats every round until the target drops, you are badly hurt, or you click the map. Press Q to turn off.' : 'Turn on to keep using your last attack each round without clicking. Press Q.'; }
    function stopAuto(reason) { clearTimeout(autoTimer); autoTimer = null; lastAttack = null; if (reason) guidance(reason); }
    function scheduleAuto() { clearTimeout(autoTimer); autoTimer = null; if (auto && lastAttack && state?.status === 'active') { autoTimer = setTimeout(autoStep, 550); guidance('Repeating your attack each round. Click the map or press Escape to interrupt.'); } }
    function autoStep() {
        autoTimer = null;
        if (!auto || !lastAttack || !state || state.status !== 'active') return;
        const p = player(), t = state.actors.find(a => a.id === lastAttack.targetId), before = state.revision;
        if (state.turn?.action) { command({ type: 'end' }); if (state.revision === before) return stopAuto(); return scheduleAuto(); }
        if (!alive(t)) return stopAuto('Repeat stopped: the target is down. Pick another target.');
        if (p.hp <= 0) return stopAuto();
        if (p.poisoned) return stopAuto('Repeat stopped: you are poisoned. Take an antidote within 2 rounds.');
        if (p.bleeding) return stopAuto('Repeat stopped: you are bleeding. Bind wounds or fight on.');
        if (p.hp <= p.maxHp / 3) return stopAuto('Repeat stopped: you are badly hurt. Fight on or withdraw.');
        targetId = t.id;
        const a = actionStates().find(a => a.id === lastAttack.id);
        if ((!a?.visible || !a.enabled) && lastAttack.id === 'attack' && fatigue(p).blocked && !state.turn?.moved) { command({ type: 'end' }); if (state.revision === before) return stopAuto(); scheduleAuto(); guidance('Too tired to attack: resting this round, then your attack resumes. Click the map or press Escape to interrupt.'); return; }
        if (!a?.visible || !a.enabled) { render(); return stopAuto(`Repeat stopped: ${a?.reason || 'that attack is unavailable'}.`); }
        command(a.command);
        if (state.revision === before) return stopAuto();
        scheduleAuto();
    }
    function invoke(id) { const a = actionStates().find(a => a.id === id); if (!a?.visible || !a.enabled) {
        guidance(a?.reason || 'Action unavailable');
        return;
    } if (a.command.type === 'meet') {
            if (a.command.choice === 'gift' && campaignMode) { if ((campaignEntry.domars ?? 100) < GIFT) { guidance(`A gift costs ${GIFT} domars.`); return; } campaignEntry = updateEntry(campaignId, e => ({ ...e, domars: (e.domars ?? 100) - GIFT })); }
            command(a.command);
            return;
        } const before = state.revision, wasTarget = targetId; clearTimeout(autoTimer); command(a.command);
        if (state.revision === before) return;
        if (id === 'endTurn') { scheduleAuto(); return; }
        if (PASSIVE.includes(id)) { stopAuto(); return; }
        lastAttack = { id, targetId: wasTarget };
        scheduleAuto(); }
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
    function fatigue(a) {
        const weaponId = a.equipment?.weaponId;
        if (!weaponId || a.hp <= 0) return { factor: 0, blocked: false, wc: 0, restNeeded: 0 };
        const wc = gw.getWeapon(weaponId).wc, factor = gw.fatigueFactor({ weaponId, armorAC: gw.getArmor(a.equipment?.armorId ?? 'none').ac, rounds: (a.fightRounds ?? 0) + 1, rest: a.rest ?? 0, PS: a.attributes.PS, synthetic: a.species === 'robot' });
        return { factor, wc, blocked: factor >= wc, restNeeded: Math.max(0, factor - wc + 1) };
    }
    const GIFT = 10;
    const RESULT = { victory: 'Victory', defeat: 'Defeat', withdrawn: 'You withdrew', peaceful: 'Parted in peace' };
    function showResult(ended) {
        const host = $('viewport')?.parentElement;
        if (!host?.querySelector) return;
        host.querySelector('.result-banner')?.remove();
        if (!ended) return;
        const box = make('div', null, 'result-banner'), p = player();
        box.append(make('h2', state.status === 'victory' && p.hp <= 0 ? 'Fallen' : RESULT[state.status] ?? state.status), make('p', state.status === 'victory' && p.hp <= 0 ? `${p.name || 'Your survivor'} has fallen, but the companions held the field.` : state.status === 'victory' ? `${state.xpAwarded} experience gained. ${p.hp} / ${p.maxHp} HP left after ${state.round} round${state.round === 1 ? '' : 's'}.` : state.status === 'defeat' ? `${p.name || 'Your survivor'} has fallen.` : `The encounter is over. ${p.hp} / ${p.maxHp} HP.`));
        const b = make('button', embedded ? (state.status === 'defeat' ? 'Leave the field' : 'Return to exploration') : 'New encounter', 'primary');
        b.type = 'button';
        b.onclick = () => embedded ? onExit?.() : start();
        box.append(b);
        host.append(box);
        b.focus?.();
    }
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
                    const token = make('span', a.ally ? a.name[0] : a.side === 'left' ? (a.species === 'robot' ? 'R' : a.species === 'plant' ? 'P' : 'PC') : a.name[0], `token ${a.side === 'right' ? 'npc' : a.ally ? 'ally' : ''} ${a.hp <= 0 || a.fled ? 'dead' : ''}`);
                    cell.append(token);
                    if (a.side === 'right') cell.append(make('small', injury(a), 'token-caption'));
                    if (a.ally) cell.append(make('small', a.fled ? `${a.name} fled` : `${a.name} ${a.hp}/${a.maxHp}`, 'token-caption'));
                    if (a.side === 'right' && alive(a))
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
        const meeting = gw.meetingOptions(state);
        const tired = fatigue(p);
        $('planText').textContent = `${turn.action ? 'Action used' : 'Action available'} · ${turn.action || p.hp <= 0 ? 0 : +Math.max(0, gw.movementLimit(p, turn.pace ?? 'normal') - turn.moved).toFixed(1)} m remaining${tired.factor ? ` · Fatigue −${tired.factor}: ${tired.blocked ? 'too tired to attack' : `weapon class ${tired.wc} → ${tired.wc - tired.factor}`}` : ''}`;
        const states = actionStates(), by = id => states.find(a => a.id === id);
        const btn = (id, key = id) => { const b = $(id), a = by(key); b.hidden = !a?.visible; b.disabled = !a?.enabled; b.title = a?.reason || ''; if (a)
            b.textContent = a.label; return a?.reason || ''; };
        const error = btn('attack');
        btn('throw');
        btn('bind');
        btn('flee');
        btn('parley');
        if ($('gift')) { btn('gift'); if (meeting && campaignMode && (campaignEntry.domars ?? 100) < GIFT) { $('gift').disabled = true; $('gift').title = `A gift costs ${GIFT} domars`; } }
        btn('endTurn');
        if (!ended && tired.blocked && !turn.action) { $('attack').textContent = 'Too tired to attack'; if (!turn.moved) $('endTurn').textContent = 'Rest (End Turn)'; }
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
        showResult(ended);
        if (meeting) { const r = meeting.result; guidance(r ? `They are ${r.label} (reaction ${r.score}). ${meeting.gift ? `Make an offer worth ${GIFT} domars to roll again at +1, attack, or back away.` : 'Attack or back away.'}` : `You have the first move and they have not attacked. Talk (2d6 reaction roll with your Charisma), offer a gift worth ${GIFT} domars for +1, attack, or back away.`); while (printed < state.log.length) addEvent(state.log[printed++]); return; }
        if (!ended && tired.blocked && !turn.action && !turn.queued && !(p.dying)) { guidance(`Fatigue: after ${p.fightRounds} rounds of fighting you are too tired to attack with the ${gw.getWeapon(p.equipment.weaponId).name}. Rest ${tired.restNeeded} round${tired.restNeeded === 1 ? '' : 's'} (End Turn without moving) to swing again, or Withdraw.`); while (printed < state.log.length) addEvent(state.log[printed++]); return; }
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
        return; stopAuto(); if (cell.dataset.target) {
        targetId = cell.dataset.target;
        render();
        return;
    } const x = Number(cell.dataset.x), y = Number(cell.dataset.y); if (x === player().x && y === player().y)
        return; const pace = e.ctrlKey ? 'charge' : e.shiftKey ? 'trot' : 'normal'; if (!gw.interactivePath(state, x, y, pace)?.length) {
        guidance('Cannot move there. Choose a reachable square before attacking.');
        return;
    } command({ type: 'move', x, y, pace }); });
    // Drag the survivor's token to move: the path lights up and a ruler shows distance against the allowance.
    let moveDrag = null;
    const cellAt = e => globalThis.document?.elementFromPoint?.(e.clientX, e.clientY)?.closest?.('#board .cell') ?? null;
    const paceOf = e => e.ctrlKey ? 'charge' : e.shiftKey ? 'trot' : 'normal';
    function endMoveDrag() { moveDrag?.ruler.remove(); moveDrag = null; $('board')?.classList?.remove('dragging'); }
    function trackMove(e) {
        if (!moveDrag || !state) return;
        const cell = cellAt(e), r = moveDrag.ruler, p = player(), pace = paceOf(e);
        r.style.left = `${e.clientX + 14}px`;
        r.style.top = `${e.clientY + 14}px`;
        const left = Math.max(0, gw.movementLimit(p, pace) - (state.turn?.moved ?? 0));
        if (!cell || cell.closest('#board') !== $('board')) { r.textContent = 'Off the map'; r.className = 'drag-ruler bad'; return; }
        const x = +cell.dataset.x, y = +cell.dataset.y;
        if (x === p.x && y === p.y) { r.textContent = `0 m of ${left.toFixed(0)} m`; r.className = 'drag-ruler'; return; }
        const path = gw.interactivePath(state, x, y, pace);
        if (path?.length) { r.textContent = `${gw.pathDistance(p, path).toFixed(1)} m of ${left.toFixed(0)} m${pace === 'normal' ? '' : ' · ' + pace}`; r.className = 'drag-ruler'; }
        else { r.textContent = cell.dataset.target ? 'Occupied' : `${gw.distance(p, { x, y }).toFixed(1)} m · too far (${left.toFixed(0)} m left)`; r.className = 'drag-ruler bad'; }
    }
    function dropMove(e) {
        if (!moveDrag) return;
        const cell = cellAt(e), pace = paceOf(e);
        endMoveDrag();
        if (!cell || !state || state.status !== 'active' || cell.dataset.target || cell.closest('#board') !== $('board')) return;
        const x = +cell.dataset.x, y = +cell.dataset.y;
        if (x === player().x && y === player().y) return;
        if (!gw.interactivePath(state, x, y, pace)?.length) { guidance('Too far or blocked. The ruler turns red past your movement allowance.'); return; }
        stopAuto();
        command({ type: 'move', x, y, pace });
    }
    $('board').addEventListener('pointerdown', e => {
        if (e.button !== 0 || !state || state.status !== 'active' || state.turn?.action) return;
        const cell = e.target.closest?.('.cell');
        if (!cell || !cell.classList?.contains('player') || !globalThis.document?.body) return;
        e.preventDefault();
        const ruler = make('div', '', 'drag-ruler');
        document.body.append(ruler);
        moveDrag = { ruler };
        $('board').classList.add('dragging');
        trackMove(e);
    });
    document.addEventListener('pointermove', trackMove);
    document.addEventListener('pointerup', dropMove);
    function toggleAuto() { auto = !auto; try { localStorage.setItem('graycloak.gw.repeatAttack', auto ? '1' : '0'); } catch { /* storage unavailable */ } if (!auto) stopAuto(); renderAuto(); guidance(auto ? 'Repeat is on. Attack once and it continues each round. Click the map or press Escape to interrupt.' : 'Repeat is off.'); }
    $('autoAttack')?.addEventListener('click', toggleAuto);
    renderAuto();
    $('start').addEventListener('click', start);
    $('attack').addEventListener('click', () => invoke('attack'));
    $('throw').addEventListener('click', () => invoke('throw'));
    $('mental').addEventListener('click', () => invoke('mental-24'));
    $('usePower').addEventListener('click', () => invoke($('action').value));
    $('bind').addEventListener('click', () => invoke('bind'));
    $('flee').addEventListener('click', () => invoke('flee'));
    $('parley').addEventListener('click', () => invoke('parley'));
    $('gift')?.addEventListener('click', () => invoke('gift'));
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
        stopAuto();
        targetId = null;
        render();
    }
    else if (e.key.toLowerCase() === 'q') {
        e.preventDefault();
        toggleAuto();
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
    return { dispose() { clearTimeout(autoTimer); endMoveDrag(); document.removeEventListener('keydown', keyHandler); document.removeEventListener('pointerup', dropMove); document.removeEventListener('pointermove', trackMove); }, getState: () => state };
}
if (globalThis.document && !globalThis.document.querySelector?.('#worldShell'))
    mountTactical();

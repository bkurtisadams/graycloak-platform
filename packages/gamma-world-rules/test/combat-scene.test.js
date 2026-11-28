// DOM contract test for combat as a scene of the play screen. This is not a full browser test.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as gw from '../index.js';

class Element {
    constructor(tag = 'div') { this.tag = tag; this.children = []; this.events = {}; this.attrs = {}; this._text = ''; this.className = ''; this.disabled = false; this.hidden = false; this.dataset = {}; this.style = { setProperty: (k, v) => { this.style[k] = v; } }; this.classList = { add: (...c) => { this.className = [...new Set([...this.className.split(' '), ...c])].filter(Boolean).join(' '); }, remove: (...c) => { this.className = this.className.split(' ').filter(x => !c.includes(x)).join(' '); } }; }
    set textContent(v) { this._text = String(v ?? ''); this.children = []; }
    get textContent() { return this._text + this.children.map(x => x.textContent).join(''); }
    append(...x) { this.children.push(...x); }
    replaceChildren(...x) { this._text = ''; this.children = [...x]; }
    addEventListener(k, fn) { (this.events[k] ??= []).push(fn); }
    removeEventListener(k, fn) { this.events[k] = (this.events[k] ?? []).filter(f => f !== fn); }
    dispatchEvent(e) { for (const fn of this.events[e.type] ?? []) fn(e); return true; }
    setAttribute(k, v) { this.attrs[k] = String(v); }
    getAttribute(k) { return this.attrs[k] ?? null; }
    closest(selector) { return selector === '.cell' && this.className.split(' ').includes('cell') ? this : null; }
}
const storage = () => { const map = new Map(); return { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k) }; };
const press = key => ({ key, preventDefault() {} });

async function fight(weaponId, pending) {
    const ids = new Map(), make = id => { if (!ids.has(id)) ids.set(id, new Element()); return ids.get(id); };
    make('foeBands').append(new Element('i'), new Element('i'), new Element('i'), new Element('i'));
    const root = { querySelector: s => make(s.slice(1)) };
    const prior = { document: globalThis.document, localStorage: globalThis.localStorage, sessionStorage: globalThis.sessionStorage, location: globalThis.location, random: Math.random };
    Object.assign(globalThis, { document: { createElement: t => new Element(t) }, localStorage: storage(), sessionStorage: storage(), location: { href: '', search: '' } });
    let i = 0;
    Math.random = () => [.3, .8, .4, .6][i++ % 4];
    const restore = () => { Math.random = prior.random; for (const k of ['document', 'localStorage', 'sessionStorage', 'location']) { if (prior[k] === undefined) delete globalThis[k]; else globalThis[k] = prior[k]; } };
    try {
        const { saveRecord, updateEntry, readCampaign } = await import('../../../gamma-world/campaign.js');
        const base = gw.generateCharacter({ species: 'psh', name: 'Scene survivor', rng: () => .5 }), id = saveRecord({ format: 'graycloak-gw-workshop', version: 2, base, generation: gw.mutationDraft(base, 'selected'), choices: [], equipment: { armorId: 'hide', weaponId }, weightKg: 70 });
        updateEntry(id, e => ({ ...e, pendingEncounter: pending }));
        const { mountCombat } = await import('../../../gamma-world/combat-scene.js');
        return { id, make, root, readCampaign, mountCombat, restore };
    }
    catch (e) { restore(); throw e; }
}
const slot = (make, action) => make('combatBar').children.find(b => b.dataset.action === action);

test('combat scene draws on the shared board with no End Turn button; Space passes the round', async () => {
    const t = await fight('long-sword', { creature: 'podog', count: 1 });
    try {
        let exits = 0, changes = 0;
        const scene = t.mountCombat({ root: t.root, characterId: t.id, onExit: () => exits++, onChange: () => changes++ });
        assert.equal(t.make('board').children.length, 165);
        assert.ok(t.make('board').className.includes('combat'));
        assert.deepEqual([scene.scene.layout, scene.scene.cols, scene.scene.rows, scene.scene.cellMeters], ['square', 15, 11, 3]);
        assert.equal(scene.getState().actors[1].creatureKey, 'podog');
        assert.ok(t.readCampaign().characters[t.id].encounter);
        assert.equal(t.readCampaign().characters[t.id].pendingEncounter, null);
        assert.ok(!t.make('combatBar').children.some(b => /end turn/i.test(b.textContent)));
        assert.ok(slot(t.make, 'leave'));
        if (gw.meetingOptions(scene.getState())) slot(t.make, 'attack').onclick();
        const start = scene.getState();
        assert.equal(scene.key(press('a')), true);
        assert.equal(scene.getState().seconds, start.seconds, 'a step alone leaves the round open');
        assert.equal(scene.position().x, start.actors[0].x - 1);
        assert.equal(scene.key(press(' ')), true);
        assert.equal(scene.getState().seconds, start.seconds + 10);
        assert.equal(t.readCampaign().characters[t.id].encounter.seconds, start.seconds + 10);
        assert.ok(changes > 0);
        slot(t.make, 'leave').onclick();
        assert.equal(exits, 1);
        scene.dispose();
        assert.deepEqual([t.make('board').events.click.length, t.make('board').events.pointerover.length], [0, 0]);
        assert.ok(!t.make('board').className.includes('combat'));
    }
    finally { t.restore(); }
});

test('auto-attack: one press of Attack, then the swing follows each round the player moves into reach or passes', async () => {
    const t = await fight('long-sword', { creature: 'badder', count: 1 });
    try {
        const scene = t.mountCombat({ root: t.root, characterId: t.id });
        if (gw.meetingOptions(scene.getState())) slot(t.make, 'attack').onclick();
        scene.key(press('t'));
        assert.equal(t.make('foeFrame').hidden, false);
        assert.match(t.make('foeName').textContent, /Badder/);
        scene.key(press('1'));
        assert.equal(slot(t.make, 'attack').getAttribute('aria-pressed'), 'true');
        assert.match(t.make('turnChip').textContent, /Auto-attack: Badder 1/);
        const swings = () => scene.getState().log.filter(l => l.startsWith('Scene survivor → ')).length;
        assert.equal(swings(), 0, 'out of reach: the attack is set, not made');
        let rounds = 0;
        while (scene.getState().status === 'active' && rounds++ < 60) {
            const s = scene.getState(), p = s.actors[0], foe = s.actors.find(a => a.side === 'right'), before = s.round;
            if (Math.abs(foe.x - p.x) + Math.abs(foe.y - p.y) > 1) scene.key(press(Math.abs(foe.x - p.x) >= Math.abs(foe.y - p.y) ? (foe.x > p.x ? 'd' : 'a') : (foe.y > p.y ? 's' : 'w')));
            if (scene.getState().status === 'active' && scene.getState().round === before) scene.key(press(' '));
            if (swings() >= 2) break;
        }
        assert.ok(swings() >= 2, 'the attack repeated without pressing Attack again');
        scene.key(press('Escape'));
        if (scene.getState().status === 'active') assert.doesNotMatch(t.make('turnChip').textContent, /Auto-attack/);
        scene.dispose();
    }
    finally { t.restore(); }
});

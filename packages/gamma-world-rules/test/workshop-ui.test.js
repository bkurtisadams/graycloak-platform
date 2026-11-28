// DOM contract test for the real workshop module. This is not a full browser test.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as gw from '../index.js';
class Element {
    constructor(tag = 'div') { this.tag = tag; this.children = []; this.events = {}; this.attrs = {}; this._text = ''; this._value = undefined; this.disabled = false; this.hidden = false; this.dataset = {}; this.style = { setProperty: (k, v) => { this.style[k] = v; } }; this.clientWidth = 800; this.clientHeight = 500; }
    set textContent(v) { this._text = String(v ?? ''); this.children = []; }
    get textContent() { return this._text + this.children.map(x => x.textContent).join(''); }
    set value(v) { this._value = String(v); }
    get value() { return this._value ?? (this.tag === 'select' ? this.children[0]?.value ?? '' : ''); }
    append(...x) { this.children.push(...x); }
    replaceChildren(...x) { this._text = ''; this.children = [...x]; if (this.tag === 'select')
        this._value = undefined; }
    addEventListener(k, fn) { (this.events[k] ??= []).push(fn); }
    dispatchEvent(e) { for (const fn of this.events[e.type] ?? [])
        fn(e); return true; }
    setAttribute(k, v) { this.attrs[k] = String(v); }
    get scrollHeight() { return 0; }
    get options() { return this.children; }
    get selectedOptions() { return this.children.filter(x => x.value === this.value); }
    querySelector(selector) { const m = selector.match(/^\[value=(.*?)\]$/); return m ? this.children.find(c => c.value === m[1]) : null; }
    closest(selector) { return selector === '.cell' && this.className?.split(' ').includes('cell') ? this : null; }
    scrollTo(x, y) { this.scrollLeft = x; this.scrollTop = y; }
}
const storage = () => { const map = new Map(); return { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) }; };
const find = (root, fn) => root.children.flatMap(c => [...(fn(c) ? [c] : []), ...find(c, fn)]);
test('real workshop handlers preview selected HP/AC, then save/load and launch valid character', async () => {
    const ids = new Map();
    const make = id => { if (!ids.has(id))
        ids.set(id, new Element(['species', 'mutationMethod', 'method', 'armor', 'weapon', 'attackMode', 'targetSize', 'matrix'].includes(id) ? 'select' : 'div')); return ids.get(id); };
    const doc = { getElementById: make, createElement: t => new Element(t) };
    const prior = { document: globalThis.document, localStorage: globalThis.localStorage, sessionStorage: globalThis.sessionStorage, location: globalThis.location, random: Math.random };
    Object.assign(globalThis, { document: doc, localStorage: storage(), sessionStorage: storage(), location: { href: '' } });
    Math.random = () => .6;
    const change = (el, v) => { el.value = v; el.dispatchEvent(new Event('change')); };
    const click = id => make(id).dispatchEvent(new Event('click'));
    try {
        make('species').value = 'humanoid';
        make('mutationMethod').value = 'selected';
        make('method').value = '4d6';
        make('name').value = 'Thorn';
        make('stock').value = '';
        make('weight').value = '70';
        await import('../../../gamma-world/app.js');
        make('builder').dispatchEvent(new Event('submit', { cancelable: true }));
        const selects = find(make('mutations'), c => c.tag === 'select');
        assert.equal(selects.length, 6);
        const stat = label => make('derived').children.find(x => x.children[0].textContent === label)?.children[1].textContent;
        assert.equal(stat('Base HP'), '48');
        assert.equal(stat('Mutation HP bonus'), '0');
        assert.equal(make('sandbox').disabled, true);
        change(selects[0], 'physical-12');
        assert.equal(stat('Mutation HP bonus'), '24');
        assert.equal(stat('Hit Points'), '72/72');
        assert.equal(make('sandbox').disabled, true);
        change(selects[1], 'physical-45');
        assert.equal(stat('AC'), '4');
        assert.equal(stat('Natural AC'), '4');
        assert.equal(make('save').disabled, false);
        click('save');
        assert.match(make('saveStatus').textContent, /Draft saved/);
        click('load');
        assert.equal(stat('Mutation HP bonus'), '24');
        assert.equal(make('sandbox').disabled, true);
        const restored = find(make('mutations'), c => c.tag === 'select');
        selects.splice(0, selects.length, ...restored);
        for (const sel of selects)
            if (!sel.value) {
                const used = selects.map(s => s.value);
                change(sel, sel.children.find(o => o.value && !used.includes(o.value)).value);
            }
        assert.equal(make('sandbox').disabled, false);
        assert.equal(make('save').disabled, false);
        click('save');
        assert.ok(globalThis.localStorage.getItem('graycloak.gw.workshop.v2'));
        click('load');
        assert.equal(stat('Mutation HP bonus'), '24');
        assert.equal(stat('AC'), '4');
        click('sandbox');
        assert.equal(globalThis.location.href, 'tactical.html');
        assert.ok(globalThis.sessionStorage.getItem('graycloak.gw.sandbox.character'));
        change(make('species'), 'plant');
        make('builder').dispatchEvent(new Event('submit', { cancelable: true }));
        assert.ok(find(make('mutations'), c => c.tag === 'option' && c.value === 'plant-16').length);
        change(make('species'), 'robot');
        make('builder').dispatchEvent(new Event('submit', { cancelable: true }));
        assert.equal(make('mutationMethod').disabled, true);
        assert.equal(make('sandbox').disabled, false);
        assert.match(make('type').textContent, /Robot/);
    }
    finally {
        Math.random = prior.random;
        for (const k of ['document', 'localStorage', 'sessionStorage', 'location']) {
            if (prior[k] === undefined)
                delete globalThis[k];
            else
                globalThis[k] = prior[k];
        }
    }
});
test('tactical page handlers construct a map, target, move directly, attack and end turn, and post local chat', async () => {
    const ids = new Map(), selects = ['creature', 'count', 'pace', 'action', 'mode'];
    const make = id => { if (!ids.has(id))
        ids.set(id, new Element(selects.includes(id) ? 'select' : 'div')); return ids.get(id); };
    const options = (id, values) => { make(id).replaceChildren(...values.map(v => { const o = new Element('option'); o.value = v; o.textContent = v; return o; })); };
    const doc = { getElementById: make, createElement: t => new Element(t), addEventListener() { } };
    const prior = { document: globalThis.document, localStorage: globalThis.localStorage, sessionStorage: globalThis.sessionStorage, location: globalThis.location, random: Math.random };
    Object.assign(globalThis, { document: doc, localStorage: storage(), sessionStorage: storage(), location: { href: '' } });
    let i = 0;
    Math.random = () => [.3, .8, .4, .6][i++ % 4];
    try {
        options('count', ['1', '2', '3']);
        options('pace', ['normal', 'trot', 'charge']);
        options('mode', ['melee', 'missile']);
        make('surprise').checked = true;
        const base = gw.generateCharacter({ species: 'psh', name: 'Thorn', rng: () => .5 }), generation = gw.mutationDraft(base, 'selected');
        sessionStorage.setItem('graycloak.gw.sandbox.character', JSON.stringify({ format: 'graycloak-gw-workshop', version: 2, base, generation, choices: [], equipment: { armorId: 'hide', weaponId: 'arrow' }, weightKg: 70 }));
        await import('../../../gamma-world/tactical.js');
        assert.equal(make('board').children.length, 165);
        assert.equal(make('pcName').textContent, 'Thorn');
        assert.match(make('roundInfo').textContent, /Round 1/);
        const target = make('board').children.find(c => c.dataset.target === 'npc-1');
        assert.ok(target);
        make('board').dispatchEvent({ type: 'click', target });
        assert.match(make('targetName').textContent, /Badder/);
        if (/first move|They are/.test(make('guidance').textContent)) { assert.equal(make('endTurn').disabled, true); make('attack').dispatchEvent({ type: 'click' }); }
        const dest = make('board').children.find(c => Number(c.dataset.x) === 3 && Number(c.dataset.y) === 5);
        make('board').dispatchEvent({ type: 'click', target: dest });
        assert.match(make('planText').textContent, /9 m remaining/);
        assert.ok(make('board').children.find(c => Number(c.dataset.x) === 3 && Number(c.dataset.y) === 5).className.includes('player'));
        assert.equal(make('attack').disabled, false);
        make('attack').dispatchEvent(new Event('click'));
        assert.equal(make('attack').disabled, true);
        assert.match(make('planText').textContent, /Action used/);
        assert.match(make('roundInfo').textContent, /0 seconds/);
        make('endTurn').dispatchEvent(new Event('click'));
        assert.match(make('roundInfo').textContent, /10 seconds/);
        make('chatTab').dispatchEvent(new Event('click'));
        assert.equal(make('chat').hidden, false);
        make('chatText').value = 'hello team';
        make('chatForm').dispatchEvent(new Event('submit', { cancelable: true }));
        assert.match(make('messages').textContent, /Thorn: hello team/);
    }
    finally {
        Math.random = prior.random;
        for (const k of ['document', 'localStorage', 'sessionStorage', 'location']) {
            if (prior[k] === undefined)
                delete globalThis[k];
            else
                globalThis[k] = prior[k];
        }
    }
});
test('embedded campaign combat keeps shared feed and chat untouched, preserves state, and disposes keyboard handler', async () => {
    const ids = new Map(), shared = new Map(), selects = ['creature', 'count', 'action'];
    const make = (map, id) => { if (!map.has(id))
        map.set(id, new Element(selects.includes(id) ? 'select' : 'div')); return map.get(id); };
    const infoIds = new Set(['guidance', 'events', 'eventsTab', 'chatTab', 'chat', 'messages', 'chatForm', 'chatText']);
    const root = { querySelector: s => infoIds.has(s.slice(1)) || s === '#warnings' ? null : make(ids, s.slice(1)) }, info = { querySelector: s => infoIds.has(s.slice(1)) ? make(shared, s.slice(1)) : null };
    const opt = new Element('option');
    opt.value = '1';
    make(ids, 'count').append(opt);
    make(ids, 'surprise').checked = true;
    make(shared, 'events').append(new Element('p'));
    make(shared, 'events').children[0].textContent = 'World event before encounter';
    let handler = null, removed = false, exits = 0;
    const doc = { getElementById: id => make(ids, id), createElement: t => new Element(t), querySelector: s => null, addEventListener: (k, fn) => { if (k === 'keydown')
            handler = fn; }, removeEventListener: (k, fn) => { if (k === 'keydown' && fn === handler)
            removed = true; } };
    const prior = { document: globalThis.document, localStorage: globalThis.localStorage, sessionStorage: globalThis.sessionStorage, location: globalThis.location, random: Math.random };
    Object.assign(globalThis, { document: doc, localStorage: storage(), sessionStorage: storage(), location: { href: '', search: '' } });
    let i = 0;
    Math.random = () => [.3, .8, .4, .6][i++ % 4];
    try {
        const { saveRecord, updateEntry, readCampaign } = await import('../../../gamma-world/campaign.js');
        const base = gw.generateCharacter({ species: 'psh', name: 'Embedded survivor', rng: () => .5 }), id = saveRecord({ format: 'graycloak-gw-workshop', version: 2, base, generation: gw.mutationDraft(base, 'selected'), choices: [], equipment: { armorId: 'hide', weaponId: 'arrow' }, weightKg: 70 });
        updateEntry(id, e => ({ ...e, pendingEncounter: { creature: 'podog', count: 1 } }));
        const { mountTactical } = await import('../../../gamma-world/tactical.js');
        const instance = mountTactical({ root, information: info, embedded: true, characterId: id, onExit: () => exits++ });
        assert.equal(make(ids, 'board').children.length, 165);
        assert.match(make(shared, 'events').textContent, /World event before encounter/);
        assert.equal(make(shared, 'chatForm').events.submit, undefined);
        assert.equal(instance.getState().actors[1].creatureKey, 'podog');
        assert.ok(readCampaign().characters[id].encounter);
        assert.equal(readCampaign().characters[id].pendingEncounter, null);
        if (make(ids, 'endTurn').disabled) make(ids, 'attack').dispatchEvent(new Event('click'));
        make(ids, 'endTurn').dispatchEvent(new Event('click'));
        assert.equal(readCampaign().characters[id].encounter?.seconds ?? 10, 10);
        make(ids, 'leaveEncounter').onclick();
        assert.equal(exits, 1);
        instance.dispose();
        assert.equal(removed, true);
    }
    finally {
        Math.random = prior.random;
        for (const k of ['document', 'localStorage', 'sessionStorage', 'location']) {
            if (prior[k] === undefined)
                delete globalThis[k];
            else
                globalThis[k] = prior[k];
        }
    }
});

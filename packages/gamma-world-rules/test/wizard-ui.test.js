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
test('actual wizard flow skips mutations for PSH, saves named draft and finishes without duplicating', async () => {
    const ids=new Map();const make=id=>{if(!ids.has(id))ids.set(id,new Element(['species','mutationMethod','method','armor','weapon','roster'].includes(id)?'select':'div'));return ids.get(id);};
    const doc={getElementById:make,createElement:t=>new Element(t)};
    Object.assign(globalThis,{document:doc,localStorage:storage(),sessionStorage:storage(),location:{href:'',search:''}});
    make('species').value='psh';make('method').value='4d6';make('mutationMethod').value='random';make('weight').value='70';
    await import('../../../gamma-world/wizard.js');
    assert.equal(make('step0').hidden,false);
    make('wizardNext').onclick();assert.equal(make('step1').hidden,false);
    make('wizardRoll').onclick();assert.equal(make('wizardRoll').disabled,true);
    make('wizardNext').onclick();assert.equal(make('step2').hidden,true);assert.equal(make('step3').hidden,false);
    make('wizardNext').onclick();assert.equal(make('step4').hidden,false);
    make('name').value='Wizard survivor';make('wizardSave').onclick();
    const {readCampaign}=await import('../../../gamma-world/campaign.js');
    assert.equal(readCampaign().characters[readCampaign().active].wizardDraft,true);
    make('wizardNext').onclick();assert.equal(location.href,'play.html');
    const data=readCampaign();assert.equal(Object.keys(data.characters).length,1);assert.equal(data.characters[data.active].wizardDraft,false);assert.equal(data.characters[data.active].record.base.name,'Wizard survivor');
});

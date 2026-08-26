import assert from 'node:assert/strict';
import { BattlesystemEffects, normalizeEffect, applyEffectsToProfile } from '../src/effects.js';
import { BattlesystemActions, normalizeActionGroups, buildUnifiedActionSurface } from '../src/actions.js';

const legacy = normalizeEffect({stat:'ac', mode:'set', value:'4', label:'Legacy'}, 0);
assert.equal(legacy.key, 'ac');
assert.equal(legacy.stat, 'ac');
assert.equal(legacy.mode, 'override');
let p = applyEffectsToProfile({ac:8,mv:12,thaco:14}, [
  legacy,
  {key:'mv',mode:'subtract',value:3,label:'Load'},
  {key:'thaco',mode:'downgrade',value:12,label:'Better THAC0'}
], {allowedStats:['ac','mv','thaco']});
assert.equal(p.ac,4);
assert.equal(p.mv,9);
assert.equal(p.thaco,12);
assert.equal(p.effectBreakdown.length,3);
const prov = applyEffectsToProfile({ac:5}, [{id:'ring',stat:'ac',mode:'add',value:-1,itemId:'r1',itemName:'Ring of Protection'}], {allowedStats:['ac']});
assert.equal(prov.effectBreakdown[0].effect.itemName,'Ring of Protection');

const groups = normalizeActionGroups([{name:'Attack then damage', actions:[
  {type:'attack',name:'Attack',target:'single'},
  {type:'damage',name:'Damage',formula:'1d8+2',resource:{type:'charges',count:{cost:2}}}
]}]);
assert.equal(groups.length,1);
assert.deepEqual(groups[0].actions.map(x=>x.kind),['attack','damage']);
assert.equal(groups[0].actions[1].resourceKind,'charges');
assert.equal(groups[0].actions[1].resourceCost,2);

const surface = buildUnifiedActionSurface({
  weapons:[{id:'weapon:w1',itemId:'w1',kind:'meleeAttack',name:'Sword',weapon:{name:'Sword'}}],
  spells:[{id:'spell:3:fireball',key:'fireball',name:'Fireball',level:3}],
  items:[{itemId:'wand',actions:[{id:'fireball',name:'Fireball',kind:'activateMagic',resourceKind:'charges',resourceCost:2}]}],
  innate:[{id:'innate:fear',key:'fear',name:'Fear'}]
});
assert.deepEqual(surface.map(x=>x.kind),['meleeAttack','castSpell','activateMagic','innate']);
assert.equal(surface[2].action.resourceCost,2);
assert.equal(BattlesystemEffects.normalizeMode('set'),'override');
assert.equal(BattlesystemActions.normalize({kind:'bogus'},0,{allowedKinds:['useItem'],fallbackKind:'useItem'}).kind,'useItem');
console.log('battlesystem-engine v0.5.0 actions/effects tests: ok');

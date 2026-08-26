import test from 'node:test';
import assert from 'node:assert/strict';
import { BattlesystemItems as Items } from '../src/items.js';

test('canonical inventory normalization is explicitly marked and loadout-aware', () => {
  const inv=Items.normalizeInventory({items:[
    {id:'w1',name:'longsword +1',type:'weapon',state:'equipped',weaponData:{hit:1,sm:'1d8',l:'1d12',magic:true,magicPlus:1}},
    {id:'w2',name:'longbow',type:'weapon',state:'carried',weaponData:{sm:'1d6',l:'1d6',rangeS:'7',rangeM:'14',rangeL:'21'}},
    {id:'wf',name:'Wand of Fire',state:'carried',magic:true,magicData:{id:'wfmi',name:'Wand of Fire',current:32,maximum:80}}
  ],readyMagic:['wf']});
  assert.equal(inv.schemaVersion,2);
  assert.equal(Items.isNormalizedInventory(inv),true);
  assert.equal(Items.itemActive(inv,Items.inventoryItem(inv,'w1')),true);
  assert.equal(Items.itemActive(inv,Items.inventoryItem(inv,'w2')),false);
  assert.equal(Items.itemActive(inv,Items.inventoryItem(inv,'wf')),true);
});

test('Wand of Fire retains its reference functions and persistent two-charge Fireball use', () => {
  const wand=Items.normalizeMagicItem({name:'Wand of Fire',current:32,maximum:80});
  const fireball=Items.magicItemFunctions(wand).find(f=>f.name==='Fireball');
  assert.equal(fireball?.chargeCost,2);
  const result=Items.expendMagicItemUse(wand,{kind:'item',chargeCost:fireball.chargeCost},{round:4,setup:false,loadoutActive:true});
  assert.equal(result.ok,true);
  assert.equal(result.label,'charges 32→30');
  assert.equal(wand.current,30);
  assert.equal(wand.lastUseRound,4);
  assert.equal(wand.usesInLastRound,1);
});

test('Setup advisory item use does not expend a persistent resource', () => {
  const wand=Items.normalizeMagicItem({name:'Wand of Fire',current:3,maximum:80});
  const result=Items.expendMagicItemUse(wand,{kind:'item',chargeCost:2},{sandbox:true,setup:true,round:0});
  assert.equal(result.ok,true);
  assert.equal(wand.current,3);
  assert.match(result.label,/resource not expended/);
});

test('loadout dry-run validates without mutating and committed change updates equipment state', () => {
  const inv=Items.normalizeInventory({items:[
    {id:'w1',name:'longsword',type:'weapon',state:'equipped',weaponData:{sm:'1d8'}},
    {id:'w2',name:'longbow',type:'weapon',state:'carried',weaponData:{sm:'1d6'}}
  ]});
  const before=inv.mainWeapon;
  assert.equal(Items.setLoadoutSlot(inv,'mainWeapon','w2',{dryRun:true}).ok,true);
  assert.equal(inv.mainWeapon,before);
  assert.equal(Items.setLoadoutSlot(inv,'mainWeapon','w2').ok,true);
  assert.equal(inv.mainWeapon,'w2');
  assert.equal(Items.inventoryItem(inv,'w2').state,'equipped');
});

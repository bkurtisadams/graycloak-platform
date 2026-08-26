import test from 'node:test';
import assert from 'node:assert/strict';
import { BattlesystemSpells } from '../src/spells.js';

const daoud=(fn)=>({kind:'item',sourceName:"Daoud's Wondrous Lanthorn",functionName:fn,name:`Daoud's Wondrous Lanthorn · ${fn}`});

test('Daoud Hold Monster supplies source range/target/save/duration instead of referee guesses',()=>{
  const e=daoud('Hold Monster (One Target)'),p=BattlesystemSpells.sourcePreset(e);
  assert.equal(BattlesystemSpells.itemEffectiveLevel(e),19);
  assert.equal(BattlesystemSpells.itemResourceCost(e),5);
  assert.equal(p.rangeIn,3);
  assert.equal(p.sourceRangeFeet,30);
  assert.equal(p.defaultTarget,'target');
  assert.equal(p.singleCreatureTarget,true);
  assert.equal(p.saveType,'sp');
  assert.equal(p.saveMod,-3);
  assert.equal(p.statusEffect,'hold');
  assert.equal(p.durationRounds,19);
  assert.equal(p.noSaveWithinIn,1);
});

test('Daoud close range suppresses saves and records magic-resistance bypass',()=>{
  const p=BattlesystemSpells.sourcePreset(daoud('Hold Monster (One Target)'));
  const close=BattlesystemSpells.sourceSaveRule(p,.75,'sp'),edge=BattlesystemSpells.sourceSaveRule(p,1,'sp'),far=BattlesystemSpells.sourceSaveRule(p,1.01,'sp');
  assert.equal(close.saveType,'none');
  assert.equal(close.closeRangeNoSave,true);
  assert.equal(close.ignoreMagicResistance,true);
  assert.equal(edge.saveType,'none');
  assert.equal(edge.ignoreMagicResistance,true);
  assert.equal(far.saveType,'sp');
  assert.equal(far.closeRangeNoSave,false);
});

test('Daoud single-prism spell presets keep their artifact overrides',()=>{
  const haste=BattlesystemSpells.sourcePreset(daoud('Haste'));
  const flame=BattlesystemSpells.sourcePreset(daoud('Flame Strike'));
  const fear=BattlesystemSpells.sourcePreset(daoud('Fear'));
  assert.equal(haste.durationRounds,22);
  assert.equal(haste.statusEffect,'haste');
  assert.equal(flame.damageExpr,'6d8');
  assert.equal(flame.damageTag,'fire');
  assert.equal(flame.saveMod,0);
  assert.equal(flame.lockSaveMod,true);
  assert.equal(fear.saveMod,0);
  assert.equal(fear.lockSaveMod,true);
  assert.equal(fear.onsetRounds,1);
  assert.equal(fear.durationRounds,19);
  for(const p of [haste,flame,fear]){
    assert.equal(p.rangeIn,3);
    assert.equal(p.defaultTarget,'target');
    assert.equal(p.singleCreatureTarget,true);
  }
});

test('Daoud special combination fuel costs are source-backed even before full resolvers',()=>{
  assert.equal(BattlesystemSpells.itemResourceCost(daoud('Confusion')),10);
  assert.equal(BattlesystemSpells.itemResourceCost(daoud('Prismatic Spray')),50);
  assert.equal(BattlesystemSpells.itemResourceCost(daoud('Prismatic Sphere')),50);
  assert.equal(BattlesystemSpells.sourcePreset(daoud('Confusion')),null);
});

test('unrelated item magic receives no Daoud override',()=>{
  const e={kind:'item',sourceName:'Wand of Fire',functionName:'Fireball'};
  assert.equal(BattlesystemSpells.itemEffectiveLevel(e),null);
  assert.equal(BattlesystemSpells.itemResourceCost(e),null);
  assert.equal(BattlesystemSpells.sourcePreset(e),null);
});

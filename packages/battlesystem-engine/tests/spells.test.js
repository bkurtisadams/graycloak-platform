import test from 'node:test';
import assert from 'node:assert/strict';
import { BattlesystemSpells } from '../src/spells.js';

const daoud=(fn)=>({kind:'item',sourceName:"Daoud's Wondrous Lanthorn",functionName:fn,name:`Daoud's Wondrous Lanthorn · ${fn}`});

test('PHB catalog and metadata are engine-owned without changing canonical lookups',()=>{
  assert.ok(BattlesystemSpells.spellNames('magic-user',3).includes('Fireball'));
  assert.ok(BattlesystemSpells.spellNames('cleric',5).includes('Flame Strike'));
  assert.equal(BattlesystemSpells.canonicalSpellNameForKeys(['illusionist'],1,'Colour Spray'),'Color Spray');
  const flame=BattlesystemSpells.spellMetadataForKeys(['cleric'],5,'Flame Strike');
  assert.equal(flame.range,'6”');
  assert.equal(flame.savingThrow,'½');
  assert.match(flame.area,/1” diameter/);
  const color=BattlesystemSpells.spellMetadataForKeys(['illusionist'],1,'Colour Spray');
  assert.equal(color.name,'Color Spray');
  assert.equal(color.castingTime,'1 segment');
  assert.equal(color.savingThrow,'Special');
});

test('named battlefield presets reproduce the board-owned v0.53 behavior',()=>{
  const fire=BattlesystemSpells.spellPreset({name:'Fireball',kind:'spell'},{casterLevel:10});
  const haste=BattlesystemSpells.spellPreset({name:'Haste',kind:'spell'},{casterLevel:5});
  const slow=BattlesystemSpells.spellPreset({name:'Slow',kind:'spell'},{casterLevel:5});
  const sleep=BattlesystemSpells.spellPreset({name:'Sleep',kind:'spell'},{casterLevel:5});
  const hold=BattlesystemSpells.spellPreset({name:'Hold Person',kind:'spell'},{casterLevel:5});
  const fear=BattlesystemSpells.spellPreset({name:'Fear',kind:'spell'},{casterLevel:10});
  const detect=BattlesystemSpells.spellPreset({name:'Detect Invisibility',kind:'spell'},{casterLevel:10,battlePathWidthIn:.333});
  assert.deepEqual([fire.rangeIn,fire.sourceLength,fire.damageExpr,fire.saveType],[20,2,'10d6','sp']);
  assert.deepEqual([haste.rangeIn,haste.sourceLength,haste.durationRounds],[6,4,8]);
  assert.deepEqual([slow.rangeIn,slow.sourceLength,slow.durationRounds],[14,4,8]);
  assert.deepEqual([sleep.rangeIn,sleep.sourceLength,sleep.durationRounds],[8,1.5,25]);
  assert.deepEqual([hold.rangeIn,hold.durationRounds,hold.saveType],[12,10,'sp']);
  assert.deepEqual([fear.sourceLength,fear.sourceWidth,fear.onsetRounds,fear.durationRounds],[6,3,1,10]);
  assert.deepEqual([detect.rangeIn,detect.sourceWidth,detect.durationRounds,detect.defaultTarget],[10,1,50,'self']);
});

test('Hold Person target-count and Sleep HD capacity rules live in spells.js',()=>{
  assert.deepEqual([1,2,3,4].map(BattlesystemSpells.holdPersonSaveMod),[-3,-1,0,0]);
  assert.equal(BattlesystemSpells.sleepCreatureCapacity(1,()=>.999).count,16);
  assert.equal(BattlesystemSpells.sleepCreatureCapacity(2,()=>.999).count,8);
  assert.equal(BattlesystemSpells.sleepCreatureCapacity(3,()=>.999).count,4);
  assert.equal(BattlesystemSpells.sleepCreatureCapacity(4,()=>.999).count,2);
  assert.equal(BattlesystemSpells.sleepCreatureCapacity(4.5,()=>.999).count,1);
});

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

test('Daoud remaining single-prism powers retain their source-backed engine presets',()=>{
  const haste=BattlesystemSpells.sourcePreset(daoud('Haste'));
  const color=BattlesystemSpells.sourcePreset(daoud('Color Spray'));
  const fear=BattlesystemSpells.sourcePreset(daoud('Fear'));
  const rage=BattlesystemSpells.sourcePreset(daoud('Emotion (Rage)'));
  const flame=BattlesystemSpells.sourcePreset(daoud('Flame Strike'));
  assert.equal(haste.durationRounds,22);
  assert.equal(haste.statusEffect,'haste');
  assert.equal(color.specialResolver,'colorSpray');
  assert.equal(rage.specialResolver,'emotionRage');
  assert.equal(flame.damageExpr,'6d8');
  assert.equal(flame.damageTag,'fire');
  assert.equal(fear.onsetRounds,1);
  assert.equal(fear.durationRounds,19);
  for(const p of [haste,color,fear,rage,flame]){
    assert.equal(p.rangeIn,3);
    assert.equal(p.defaultTarget,'target');
    assert.equal(p.singleCreatureTarget,true);
    assert.equal(p.resourceCost,5);
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


test('execution contracts centralize resolver, caster, target, save, damage, timing, and status vocabulary',()=>{
  const firePreset=BattlesystemSpells.spellPreset({name:'Fireball',kind:'spell',level:3},{casterLevel:9});
  const fire=BattlesystemSpells.executionContract({name:'Fireball',kind:'spell',level:3},firePreset);
  assert.equal(fire.spellKey,'fireball');
  assert.equal(fire.resolver,'damage');
  assert.equal(fire.automation,'full');
  assert.deepEqual(fire.casterClassKeys,['magic-user']);
  assert.equal(fire.target.policy,'area');
  assert.equal(fire.target.rangeIn,19);
  assert.equal(fire.save.type,'sp');
  assert.equal(fire.save.effect,'half');
  assert.equal(fire.damage.expr,'9d6');
  assert.equal(fire.damage.tag,'fire');
  assert.equal(fire.timing.durationRounds,null);

  const hastePreset=BattlesystemSpells.spellPreset({name:'Haste',kind:'spell',level:3},{casterLevel:9});
  const haste=BattlesystemSpells.executionContract({name:'Haste',kind:'spell',level:3},hastePreset);
  assert.equal(haste.resolver,'speed');
  assert.equal(haste.status.effect,'haste');
  assert.equal(haste.timing.durationRounds,12);
});

test('execution contracts preserve class-specific Hold and Fear caster requirements',()=>{
  assert.deepEqual(BattlesystemSpells.castingClassKeys({name:'Hold Person',kind:'spell',level:2}),['cleric']);
  assert.deepEqual(BattlesystemSpells.castingClassKeys({name:'Hold Person',kind:'spell',level:3}),['magic-user']);
  assert.deepEqual(BattlesystemSpells.castingClassKeys({name:'Fear',kind:'spell',level:3}),['illusionist']);
  assert.deepEqual(BattlesystemSpells.castingClassKeys({name:'Fear',kind:'spell',level:4}),['magic-user']);
  assert.deepEqual(BattlesystemSpells.castingClassKeys({name:'Detect Invisibility',kind:'spell',level:1}),['illusionist']);
  assert.deepEqual(BattlesystemSpells.castingClassKeys({name:'Detect Invisibility',kind:'spell',level:2}),['magic-user']);
  assert.equal(BattlesystemSpells.holdPersonSaveMod(1,2),-2);
  assert.equal(BattlesystemSpells.holdPersonSaveMod(1,3),-3);
  assert.equal(BattlesystemSpells.holdMonsterSaveMod(1),-3);
});

test('Daoud item spells use the same execution contract vocabulary with source overrides',()=>{
  const e=daoud('Flame Strike'),p=BattlesystemSpells.sourcePreset(e),c=BattlesystemSpells.executionContract(e,p);
  assert.equal(c.spellKey,'flameStrike');
  assert.deepEqual(c.casterClassKeys,[]);
  assert.equal(c.resolver,'damage');
  assert.equal(c.automation,'full');
  assert.equal(c.target.singleCreature,true);
  assert.equal(c.target.defaultMode,'target');
  assert.equal(c.target.rangeIn,3);
  assert.equal(c.save.type,'sp');
  assert.equal(c.save.effect,'half');
  assert.equal(c.save.noSaveWithinIn,1);
  assert.equal(c.save.ignoreMagicResistanceWithinIn,1);
  assert.equal(c.damage.expr,'6d8');
  assert.equal(c.damage.tag,'fire');
});

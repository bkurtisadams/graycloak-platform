import test from 'node:test';
import assert from 'node:assert/strict';
import { BattlesystemSecondaryEffects as Secondary } from '../src/secondary-effects.js';

test('secondary effects normalize capability records without monster-name logic',()=>{
  const rows=Secondary.normalizeEffects([
    {name:'Petrifying Gaze',trigger:'gaze',effectType:'petrification',saveType:'petrification'},
    {name:'Rust Touch',trigger:'onHit',effectType:'equipmentDamage',attackMatch:'antenna',saveType:'none'}
  ]);
  assert.equal(rows.length,2);
  assert.equal(rows[0].trigger,'gaze');
  assert.equal(rows[1].effectType,'equipmentDamage');
  assert.equal(rows[1].attackMatch,'antenna');
});

test('damaging-hit poison rider matches only a damaging successful attack',()=>{
  const poison={name:'Venom',trigger:'onDamage',effectType:'poison',saveType:'poison'};
  assert.equal(Secondary.eventMatches(poison,{hit:true,damage:4,attackKind:'melee',weapon:'bite'}),true);
  assert.equal(Secondary.eventMatches(poison,{hit:true,damage:0,attackKind:'melee',weapon:'bite'}),false);
  assert.equal(Secondary.eventMatches(poison,{hit:false,damage:4,attackKind:'melee',weapon:'bite'}),false);
});

test('attack match keeps conditional riders tied to the configured attack component',()=>{
  const rust={name:'Rust',trigger:'onHit',effectType:'equipmentDamage',attackMatch:'antenna'};
  assert.equal(Secondary.eventMatches(rust,{hit:true,weapon:'Antenna touch'}),true);
  assert.equal(Secondary.eventMatches(rust,{hit:true,weapon:'Bite'}),false);
});

test('multi-hit hug/constriction resolves once after the configured hit threshold',()=>{
  const hug={name:'Hug',trigger:'onHit',effectType:'constriction',minHits:2,attackMatch:'claw'};
  const one=Secondary.resolveBatch([hug],[{hit:true,damage:3,attackKind:'melee',weapon:'claw 1'}],()=>0);
  const two=Secondary.resolveBatch([hug],[{hit:true,damage:3,attackKind:'melee',weapon:'claw 1'},{hit:true,damage:4,attackKind:'melee',weapon:'claw 2'}],()=>0);
  assert.equal(one.length,0);
  assert.equal(two.length,1);
  assert.equal(two[0].hitCount,2);
  assert.equal(two[0].triggered,true);
});

test('chance checks use inclusive d100 threshold',()=>{
  const disease={name:'Disease',trigger:'onHit',effectType:'disease',chancePct:30};
  assert.deepEqual(Secondary.chanceCheck(disease,()=>0.29),{applies:true,chancePct:30,roll:30,success:true});
  assert.deepEqual(Secondary.chanceCheck(disease,()=>0.30),{applies:true,chancePct:30,roll:31,success:false});
});

test('numeric level drain can bridge a generic effect into the existing level-loss pause',()=>{
  assert.equal(Secondary.numericLevelDrain({name:'Drain',effectType:'levelDrain',amount:'2 levels'}),2);
  assert.equal(Secondary.numericLevelDrain({name:'Disease',effectType:'disease',amount:'2 levels'}),0);
});

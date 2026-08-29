import test from 'node:test';
import assert from 'node:assert/strict';
import { BattlesystemInnateActions as Innate } from '../src/innate-actions.js';

const TYPE_III = [
  {name:'Darkness',casterLevel:10,target:'point',resolver:'spell'},
  {name:'Fear',casterLevel:10,target:'area',resolver:'spell'},
  {name:'Levitate',casterLevel:10,target:'self',resolver:'spell'},
  {name:'Pyrotechnics',casterLevel:10,target:'point',resolver:'spell'},
  {name:'Polymorph Self',casterLevel:10,target:'self',resolver:'spell'},
  {name:'Telekinesis',casterLevel:10,target:'creature',resolver:'spell'},
  {name:'Teleport',casterLevel:10,target:'self',resolver:'spell'},
  {name:'Gate',chancePct:30,casterLevel:10,target:'point',resolver:'summon'}
];

test('Type III demon innate actions normalize as reusable records', () => {
  const rows=Innate.normalizeActions(TYPE_III);
  assert.equal(rows.length,8);
  const gate=rows.find(x=>x.name==='Gate');
  assert.equal(gate.chancePct,30);
  assert.equal(gate.casterLevel,10);
  assert.equal(gate.timing,'missileMagic');
  assert.equal(gate.resolver,'summon');
});

test('spell-backed innate action bridges into the shared Magic entry shape', () => {
  const fear=Innate.normalizeAction(TYPE_III[1]);
  const entry=Innate.toMagicEntry(fear);
  assert.equal(entry.kind,'innate');
  assert.equal(entry.functionName,'Fear');
  assert.equal(entry.effectiveLevel,10);
  assert.equal(entry.defaultTarget,'area');
});

test('Gate retains summon bridge and 30 percent activation chance', () => {
  const gate=Innate.normalizeAction(TYPE_III[7]);
  const profile=Innate.magicProfile(gate);
  assert.equal(profile.executionResolver,'summon');
  assert.equal(profile.createKind,'summoned');
  assert.equal(profile.innateChancePct,30);
  assert.deepEqual(Innate.chanceCheck(gate,()=>0.29),{applies:true,chancePct:30,roll:30,success:true});
  assert.deepEqual(Innate.chanceCheck(gate,()=>0.30),{applies:true,chancePct:30,roll:31,success:false});
});

test('Missile and Magic timing is engine-enforced in live battle', () => {
  const teleport=Innate.normalizeAction(TYPE_III[6]);
  assert.equal(Innate.timingState(teleport,{liveBattle:true,phaseId:'missileMagic'}).ok,true);
  assert.equal(Innate.timingState(teleport,{liveBattle:true,phaseId:'movement'}).ok,false);
});

test('legacy flat innate names remain bridgeable', () => {
  const old=Innate.fromLegacyName('Teleport');
  assert.equal(old.name,'Teleport');
  assert.equal(old.frequency,'atWill');
  assert.equal(old.resolver,'spell');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { BattlesystemIndividualCombat as IC } from '../src/individual-combat.js';

const sequence=(values)=>{let i=0;return ()=>values[Math.min(i++,values.length-1)];};

test('§9.4B duel cadence keys and state survive host snapshots without unit scans',()=>{
  const map={};
  assert.equal(IC.pairKey(9,2),'2|9');
  assert.deepEqual(IC.pairIds('2|9'),['2','9']);
  assert.equal(IC.cadenceNext(map,9,2),1);
  assert.equal(IC.setCadence(map,9,2,4),true);
  assert.equal(IC.cadenceNext(map,2,9),4);
  assert.deepEqual(map['2|9'],{nextRound:4});
  assert.equal(IC.clearCadence(map,2,9),true);
  assert.equal(IC.cadenceNext(map,2,9),1);
});

test('fractional #AT cadence preserves 3/2 and Haste/Slow continuation',()=>{
  assert.deepEqual([1,2,3,4,5,6].map(r=>IC.attackCount('3/2',r,1)),[2,1,2,1,2,1]);
  assert.deepEqual([1,2,3].map(r=>IC.attackCount('3/2',r,2)),[3,3,3]);
  assert.deepEqual([1,2,3,4].map(r=>IC.attackCount('3/2',r,.5)),[1,1,1,0]);
  assert.deepEqual(IC.attackTimes(2),[0,1]);
  assert.deepEqual(IC.attackTimes(1),[.5]);
});

test('damage parser/roller remains deterministic and clamps negative totals',()=>{
  assert.deepEqual(IC.rollDamage('2d6+3',sequence([0,.999])),{total:10,expr:'2d6+3',rolls:[1,6],modifier:3,invalid:false});
  assert.equal(IC.rollDamage('1d4-9',()=>0).total,0);
  assert.equal(IC.rollDamage('not dice').invalid,true);
});

test('weapon traits preserve named +N, sharpness hitability, silver, fire, and acid',()=>{
  assert.deepEqual(IC.weaponTraits({name:'Longsword +2'}),{magic:true,magicPlus:2,silver:false,sharpness:false,fire:false,acid:false});
  const sharp=IC.weaponTraits({name:'Sword of Sharpness',sharpness:true});
  assert.equal(sharp.magic,true);
  assert.equal(sharp.magicPlus,3);
  const mixed=IC.weaponTraits({name:'Silver Flaming Acid Blade'});
  assert.equal(mixed.silver,true);
  assert.equal(mixed.fire,true);
  assert.equal(mixed.acid,true);
  assert.equal(IC.meetsInvulnerability('magic',sharp),true);
  assert.equal(IC.meetsInvulnerability('silver',{magic:false,silver:false}),false);
  assert.equal(IC.meetsInvulnerability('magicOrSilver',{magic:false,silver:true}),true);
});

test('THAC0 vs AC attack resolution preserves modifiers, hp damage, and no-effect invulnerability',()=>{
  const hit=IC.resolveAttack({thaco:16,thacoDelta:0,ac:6,hitBonus:2,targetBonus:0,damageExpr:'1d8+1',damageModifier:2,attackTags:{magic:true},invulnerability:'magic',weaponTraits:{sharpness:false}},()=>.999);
  assert.equal(hit.need,10);
  assert.equal(hit.d20,20);
  assert.equal(hit.total,22);
  assert.equal(hit.hit,true);
  assert.equal(hit.canHarm,true);
  assert.equal(hit.damage.total,11);
  const blocked=IC.resolveAttack({thaco:10,ac:10,damageExpr:'1d8',attackTags:{magic:false,silver:false},invulnerability:'magic'},()=>.999);
  assert.equal(blocked.hit,true);
  assert.equal(blocked.canHarm,false);
  assert.equal(blocked.damage,null);
});

test('Sharpness uses the existing +1 special roll and size thresholds',()=>{
  const traits=IC.weaponTraits({name:'Sword of Sharpness',sharpness:true});
  assert.equal(IC.sharpnessCheck({defenderSize:'M',traits,d20:18,hit:true}).triggered,true);
  assert.equal(IC.sharpnessCheck({defenderSize:'L',traits,d20:18,hit:true}).triggered,false);
  assert.equal(IC.sharpnessCheck({defenderSize:'L',traits,d20:19,hit:true}).triggered,true);
});

test('attack state applies hp and pending level drain without doubling individual damage',()=>{
  const attack={hit:true,canHarm:true,damage:{total:7},levelDrain:2};
  const out=IC.applyAttackState({hp:30,pendingLevelDrain:1},attack);
  assert.equal(out.state.hp,23);
  assert.equal(out.state.pendingLevelDrain,3);
  assert.equal(out.result.before,30);
  assert.equal(out.result.after,23);
  assert.equal(out.result.down,false);
});

test('regeneration is one normal AD&D melee-round state step capped at max hp',()=>{
  assert.deepEqual(IC.regenerationStep({enabled:true,hp:18,maxHp:20,rate:3}),{before:18,after:20,amount:2,rate:3});
  assert.equal(IC.regenerationStep({enabled:true,hp:20,maxHp:20,rate:3}),null);
  assert.equal(IC.regenerationStep({enabled:false,hp:10,maxHp:20,rate:3}),null);
});

test('round plan schedules d6 initiative and multiple routines using persistent cadence round',()=>{
  const r=IC.roundPlan({meleeRound:2,cadenceRound:5,aRate:'3/2',bRate:'1/1'},sequence([0,.999]));
  assert.equal(r.round,2);
  assert.equal(r.cadenceRound,5);
  assert.deepEqual([r.ia,r.ib,r.ca,r.cb],[1,6,2,1]);
  assert.deepEqual(r.events,[{time:0,who:'a',seq:0},{time:.5,who:'b',seq:0},{time:1,who:'a',seq:1}]);
});

test('level-drain pause payload preserves remaining routines and per-victim totals',()=>{
  const pending=IC.pendingFromRound(7,8,{round:1,cadenceRound:4,ia:6,ib:2,ca:2,cb:1,remainingEvents:[{time:1,who:'b',seq:0}],drainTargets:[8],drainById:{8:2}});
  assert.deepEqual(pending,{aId:7,bId:8,round:1,cadenceRound:4,ia:6,ib:2,ca:2,cb:1,events:[{time:1,who:'b',seq:0}],nextRound:1,waitingIds:[8],waitingDrainById:{8:2}});
});


test('round execution preserves tied simultaneity even when one attack drops its opponent',()=>{
  const hp={a:5,b:5},plan={round:1,cadenceRound:1,ia:4,ib:4,ca:1,cb:1,events:[{time:.5,who:'a',seq:0},{time:.5,who:'b',seq:0}]};
  const out=IC.executeRoundPlan(plan,{
    aId:'A',bId:'B',isDown:who=>hp[who]<=0,
    rollAttack:who=>({who,hit:true,canHarm:true,damage:{total:5},levelDrain:0}),
    applyAttack:r=>{const def=r.who==='a'?'b':'a';hp[def]=Math.max(0,hp[def]-r.damage.total);return r;}
  });
  assert.equal(out.attacks.length,2);
  assert.equal(out.attacks.every(x=>x.simultaneous===true),true);
  assert.deepEqual(hp,{a:0,b:0});
  assert.equal(out.roundFinished,true);
});

test('higher individual initiative level drain pauses lower-initiative same-time routines',()=>{
  const hp={a:20,b:20},plan={round:1,cadenceRound:1,ia:6,ib:2,ca:1,cb:1,events:[{time:.5,who:'a',seq:0},{time:.5,who:'b',seq:0}]};
  const out=IC.executeRoundPlan(plan,{
    aId:7,bId:8,isDown:who=>hp[who]<=0,
    rollAttack:who=>({who,hit:true,canHarm:true,damage:{total:2},levelDrain:who==='a'?2:0}),
    applyAttack:r=>{const def=r.who==='a'?'b':'a';hp[def]-=2;return r;}
  });
  assert.equal(out.attacks.length,1);
  assert.deepEqual(out.drainTargets,[8]);
  assert.deepEqual(out.drainById,{8:2});
  assert.deepEqual(out.remainingEvents,[{time:.5,who:'b',seq:0}]);
  assert.equal(out.roundFinished,false);
});

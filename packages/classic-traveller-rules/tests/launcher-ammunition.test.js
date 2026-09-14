import test from 'node:test';
import assert from 'node:assert/strict';
import {createLauncherState,advanceLauncherClock,startLauncherReload,assertTurretCanFire,fireLauncher,setTurretOperational,totalsAboard,validateLauncherState} from '../src/starships/launcher-ammunition.js';
const context=(gameTurn=1,phase='movement',phasingSide='intruder')=>({gameTurn,phase,phasingSide});
function state(ready={},extra={}){return createLauncherState({ownerSide:'intruder',armament:{turrets:[{id:'T-1',weapons:['missile-launcher','missile-launcher','sandcaster']},{id:'T-2',weapons:['beam-laser','missile-launcher']}],missiles:12,sandCanisters:6},gunners:{'T-1':'A','T-2':'B'},readyByLauncher:ready,...extra});}
test('initial pools split into explicit ready/reserve; absent ready means empty',()=>{
 const s=state({'T-1:1':3,'T-1:2':3,'T-1:3':3});assert.equal(s.reserve.missiles,6);assert.equal(s.reserve.sandCanisters,3);assert.equal(s.launchers[3].ready,0);assert.deepEqual(totalsAboard(s),{missiles:12,sandCanisters:6});
 assert.throws(()=>state({'T-1:1':4}),/capacity/);assert.throws(()=>state({'missing':1}),/unknown/);
});
test('three launchers can hold nine missiles, with one launch each per phase',()=>{
 let s=createLauncherState({ownerSide:'intruder',armament:{turrets:[{id:'T',weapons:Array(3).fill('missile-launcher')}],missiles:9,sandCanisters:0},gunners:{T:'A'},readyByLauncher:{'T:1':3,'T:2':3,'T:3':3}});
 for(let turn=1;turn<=3;turn++)for(const id of ['T:1','T:2','T:3']){s=fireLauncher(s,context(turn,'ordnance-launch'),id);assert.throws(()=>fireLauncher(s,context(turn,'ordnance-launch'),id),/already/);}
 assert.equal(totalsAboard(s).missiles,0);assert.throws(()=>fireLauncher(s,context(4,'ordnance-launch'),'T:1'),/empty/);
});
test('reload reserves rounds, takes ten phases, completes once and preserves totals',()=>{
 const original=state();let s=startLauncherReload(original,context(),'T-1:1');assert.equal(original.reserve.missiles,12);assert.equal(s.reserve.missiles,9);assert.equal(s.launchers[0].ready,0);assert.equal(s.launchers[0].reload.completesAt,10);assert.equal(totalsAboard(s).missiles,12);
 s=advanceLauncherClock(s,context(1,'reprogramming','native'));assert.equal(s.launchers[0].ready,0);
 s=advanceLauncherClock(s,context(2));assert.equal(s.launchers[0].ready,3);assert.equal(s.launchers[0].reload,null);assert.deepEqual(advanceLauncherClock(s,context(2)),s);assert.equal(totalsAboard(s).missiles,12);
 s=fireLauncher(s,context(2,'ordnance-launch'),'T-1:1');assert.equal(totalsAboard(s).missiles,11);
});
test('reload blocks all same-turret fire including reactive anti-missile, but not another gunner',()=>{
 const s=startLauncherReload(state({'T-1:2':3,'T-2:2':3}),context(),'T-1:1');
 assert.throws(()=>assertTurretCanFire(s,context(1,'laser-fire'),'T-1'),/reloading/);
 assert.throws(()=>fireLauncher(s,context(1,'ordnance-launch'),'T-1:2'),/reloading/);
 assert.throws(()=>assertTurretCanFire(s,context(1,'return-fire','native'),'T-1'),/reloading/);
 assert.throws(()=>assertTurretCanFire(s,context(1,'return-fire','native'),'T-1','anti-missile'),/reloading/);
 assert.doesNotThrow(()=>fireLauncher(s,context(1,'ordnance-launch'),'T-2:2'));
});
test('one gunner reloads one launcher per turn; separate gunners work concurrently',()=>{
 let s=startLauncherReload(state(),context(),'T-1:1');assert.throws(()=>startLauncherReload(s,context(),'T-1:2'),/reloading/);
 s=startLauncherReload(s,context(),'T-2:2');assert.equal(s.reserve.missiles,6);
 s=startLauncherReload(s,context(2),'T-1:2');assert.equal(s.launchers[0].ready,3);
 s=startLauncherReload(s,context(3),'T-1:3');assert.equal(s.launchers[1].ready,3);
 s=advanceLauncherClock(s,context(4));assert.equal(s.launchers[2].ready,3);
});
test('shared gunner cannot reload a second turret or fire it while occupied',()=>{
 const s=startLauncherReload(state({'T-2:2':3},{gunners:{'T-1':'A','T-2':'A'}}),context(),'T-1:1');assert.throws(()=>startLauncherReload(s,context(),'T-2:2'),/reloading/);assert.throws(()=>fireLauncher(s,context(1,'ordnance-launch'),'T-2:2'),/reloading/);
});
test('partial reserve stock takes a full turn; no topping-up or empty reserve reload',()=>{
 let s=createLauncherState({ownerSide:'intruder',armament:{turrets:[{id:'T',weapons:['sandcaster']}],missiles:0,sandCanisters:2},gunners:{T:'A'}});
 s=startLauncherReload(s,context(),'T:1');assert.equal(s.launchers[0].reload.rounds,2);assert.equal(s.launchers[0].ready,0);s=advanceLauncherClock(s,context(2));assert.equal(s.launchers[0].ready,2);assert.throws(()=>startLauncherReload(s,context(2),'T:1'),/exhausted/);
 s=fireLauncher(s,context(2,'ordnance-launch'),'T:1');s=fireLauncher(s,context(3,'ordnance-launch'),'T:1');assert.throws(()=>startLauncherReload(s,context(4),'T:1'),/no reserve/);
});
test('native reload crosses game boundary and finishes at next native movement',()=>{
 let s=startLauncherReload(state({}, {ownerSide:'native'}),context(1,'movement','native'),'T-1:1');assert.equal(s.launchers[0].reload.completesAt,15);
 assert.throws(()=>assertTurretCanFire(s,context(2,'return-fire','intruder'),'T-1'),/reloading/);
 s=advanceLauncherClock(s,context(2,'movement','native'));assert.equal(s.launchers[0].ready,3);
});
test('incapacitation cancels reload without losing ammo and cannot be bypassed by fire',()=>{
 let s=startLauncherReload(state(),context(),'T-1:1');s=setTurretOperational(s,context(1,'laser-fire'),'T-1',false);assert.equal(s.reserve.missiles,12);assert.equal(s.launchers[0].reload,null);assert.equal(totalsAboard(s).missiles,12);
 assert.throws(()=>fireLauncher(s,context(1,'ordnance-launch'),'T-1:1'),/incapacitated/);s=advanceLauncherClock(s,context(2));assert.equal(s.launchers[0].ready,0);
 s=setTurretOperational(s,context(2),'T-1',true);assert.doesNotThrow(()=>startLauncherReload(s,context(2),'T-1:1'));
});
test('wrong phase, backwards clock and missing gunner are rejected',()=>{
 const s=state({'T-1:1':3});assert.throws(()=>fireLauncher(s,context(),'T-1:1'),/phase/);assert.throws(()=>fireLauncher(s,context(1,'ordnance-launch','native'),'T-1:1'),/phase/);
 assert.throws(()=>startLauncherReload(state(),context(1,'ordnance-launch'),'T-1:1'),/friendly movement/);
 assert.throws(()=>advanceLauncherClock(advanceLauncherClock(s,context(2)),context(1)),/backwards/);
 assert.throws(()=>startLauncherReload(state({}, {gunners:{}}),context(),'T-1:1'),/gunner/);
});
test('JSON checkpoint preserves pending work and cannot duplicate completion or spend',()=>{
 let s=JSON.parse(JSON.stringify(startLauncherReload(state(),context(),'T-1:1')));validateLauncherState(s);
 s=advanceLauncherClock(s,context(2));s=JSON.parse(JSON.stringify(fireLauncher(s,context(2,'ordnance-launch'),'T-1:1')));assert.throws(()=>fireLauncher(s,context(2,'ordnance-launch'),'T-1:1'),/already/);assert.equal(totalsAboard(s).missiles,11);
 s.launchers[0].ready=99;assert.throws(()=>validateLauncherState(s));
});

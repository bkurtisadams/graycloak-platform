// @graycloak/battlesystem-engine attack-routines.js v1.0.0 - 2026-08-27
// Pure AD&D 1e attack-routine vocabulary + initiative scheduling.
//
// A routine is the attack or attacks usual to the combatant. Multiple attacks
// inside one routine happen together at that routine's initiative opportunity.
// Routine cadence (1/1, 3/2, 2/1, etc.) says how often the ENTIRE routine occurs.
// Hosts own target selection/splitting, hp state, special-effect dialogs, logs, and UI.

const finite=(v,fallback=0)=>Number.isFinite(Number(v))?Number(v):fallback;
const positiveInt=(v,fallback=1)=>Math.max(1,Math.round(finite(v,fallback)));
const nonNegativeInt=(v,fallback=0)=>Math.max(0,Math.round(finite(v,fallback)));
const text=(v,fallback='')=>String(v??fallback).trim();

function rollDie(sides,rng=Math.random){
  sides=positiveInt(sides,1);
  return Math.max(1,Math.min(sides,Math.floor(rng()*sides)+1));
}
function normalizeCadence(raw='1/1'){
  const s=text(raw,'1/1'),m=s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if(m&&Number(m[2])>0)return `${Math.max(0,Number(m[1])||0)}/${Math.max(1,Number(m[2])||1)}`;
  const n=Number(s);if(!Number.isFinite(n)||n<0)return '1/1';
  if(Number.isInteger(n))return `${n}/1`;
  if(Math.abs((n-Math.floor(n))-.5)<1e-9)return `${Math.floor(n)*2+1}/2`;
  return s;
}
function cadenceParts(raw='1/1'){
  const s=normalizeCadence(raw),m=s.match(/^(\d+)\/(\d+)$/);
  if(m)return {n:Number(m[1]),d:Math.max(1,Number(m[2]))};
  const n=Number(s);return Number.isFinite(n)?{n:Math.max(0,Math.round(n*1000)),d:1000}:{n:1,d:1};
}
function routineCount(raw='1/1',meleeRound=1,speed=1){
  let {n,d}=cadenceParts(raw);speed=finite(speed,1);
  if(speed>1+1e-9)n*=Math.max(1,Math.round(speed));
  else if(speed<1-1e-9)d*=Math.max(1,Math.round(1/speed));
  const base=Math.floor(n/d),extra=n%d,round=positiveInt(meleeRound,1);
  return Math.max(0,base+(((round-1)%d)<extra?1:0));
}
function routineTimes(count){
  count=Math.max(0,Math.floor(finite(count,0)));
  if(count===0)return [];
  if(count===1)return [.5];
  return Array.from({length:count},(_,i)=>i/(count-1));
}
function normalizeComponent(raw={},index=0){
  raw=raw&&typeof raw==='object'?raw:{};
  const name=text(raw.name,`Attack ${index+1}`)||`Attack ${index+1}`;
  const sm=text(raw.sm??raw.damageSM??raw.damage,'1d6')||'1d6';
  const l=text(raw.l??raw.damageL,sm)||sm;
  return {
    id:text(raw.id,`component-${index+1}`)||`component-${index+1}`,
    name,sm,l,
    hit:finite(raw.hit,0),dmod:finite(raw.dmod??raw.damageBonus,0),
    magic:!!raw.magic,magicPlus:nonNegativeInt(raw.magicPlus,0),silver:!!raw.silver,
    sharpness:!!raw.sharpness,fire:!!raw.fire,acid:!!raw.acid,
    notes:text(raw.notes).slice(0,240)
  };
}
function normalizeRoutine(raw={},index=0){
  raw=raw&&typeof raw==='object'?raw:{};
  const components=Array.isArray(raw.components)?raw.components.slice(0,20).map(normalizeComponent):[];
  return {
    id:text(raw.id,`routine-${index+1}`)||`routine-${index+1}`,
    name:text(raw.name,`Routine ${index+1}`)||`Routine ${index+1}`,
    cadence:normalizeCadence(raw.cadence??raw.rate??'1/1'),
    maxTargets:Math.max(1,Math.min(9,positiveInt(raw.maxTargets??raw.targetLimit,1))),
    components,
    notes:text(raw.notes).slice(0,400)
  };
}
function normalizeRoutines(raw=[]){
  return (Array.isArray(raw)?raw:[]).slice(0,12).map(normalizeRoutine).filter(r=>r.components.length);
}
function activeRoutine(raw=[],activeId=''){
  const list=normalizeRoutines(raw);if(!list.length)return null;
  return list.find(r=>r.id===String(activeId||''))||list[0];
}
function componentWeaponEntry(component={}){
  const c=normalizeComponent(component,0);
  return {name:c.name,sm:c.sm,l:c.l,hit:c.hit,dmod:c.dmod,magic:c.magic,magicPlus:c.magicPlus,silver:c.silver,sharpness:c.sharpness,fire:c.fire,acid:c.acid,_routineComponent:true,_routineComponentId:c.id};
}
function routineSummary(raw={}){
  const r=normalizeRoutine(raw,0),parts=r.components.map(c=>`${c.name} ${c.sm}${c.l&&c.l!==c.sm?`/${c.l}`:''}`).join(' + ');
  return `${r.name}: ${parts||'no attacks'} · ${r.cadence} routine${r.cadence==='1/1'?'':'s'} · max ${r.maxTargets} target${r.maxTargets===1?'':'s'}`;
}
function roundPlan({meleeRound=1,cadenceRound=meleeRound,aCadence='1/1',bCadence='1/1',aSpeed=1,bSpeed=1}={},rng=Math.random){
  const round=positiveInt(meleeRound,1),absRound=positiveInt(cadenceRound,round),ia=rollDie(6,rng),ib=rollDie(6,rng),ca=routineCount(aCadence,absRound,aSpeed),cb=routineCount(bCadence,absRound,bSpeed);
  const events=[...routineTimes(ca).map((time,i)=>({time,who:'a',seq:i,componentIndex:0})),...routineTimes(cb).map((time,i)=>({time,who:'b',seq:i,componentIndex:0}))].sort((x,y)=>x.time-y.time||x.seq-y.seq);
  return {round,cadenceRound:absRound,ia,ib,ca,cb,events};
}
function executeRoundPlan(plan={},hooks={}){
  if(typeof hooks.routineFor!=='function')throw new TypeError('executeRoundPlan requires routineFor(who,event)');
  if(typeof hooks.rollComponent!=='function')throw new TypeError('executeRoundPlan requires rollComponent(who,component,event)');
  const isDown=typeof hooks.isDown==='function'?hooks.isDown:()=>false,apply=typeof hooks.applyAttack==='function'?hooks.applyAttack:r=>r,regen=typeof hooks.regenerate==='function'?hooks.regenerate:()=>null;
  const events=(plan.events||[]).map(e=>({...e,componentIndex:nonNegativeInt(e.componentIndex,0)})),attacks=[],drainTargets=new Set(),drainById={};
  const targetId=(who,r)=>r?.defId??(typeof hooks.defenderId==='function'?hooks.defenderId(who,r):(who==='a'?hooks.bId:hooks.aId));
  const noteDrain=(r,who)=>{if(r?.levelDrain>0){const id=targetId(who,r);if(id!=null){drainTargets.add(id);drainById[id]=(drainById[id]||0)+r.levelDrain;}}};
  const routineData=(ev)=>normalizeRoutine(hooks.routineFor(ev.who,ev)||{},0);
  const rollRoutine=(ev)=>{const routine=routineData(ev),start=nonNegativeInt(ev.componentIndex,0),rolled=[];for(let ci=start;ci<routine.components.length;ci++){const component=routine.components[ci],r=hooks.rollComponent(ev.who,component,{...ev,componentIndex:ci,routine});rolled.push({r,ci,component,routine});}return rolled;};
  let interrupted=false;
  while(events.length&&!interrupted){
    const time=events[0].time,batch=[];while(events.length&&Math.abs(events[0].time-time)<1e-9)batch.push(events.shift());
    if(isDown('a')||isDown('b'))break;
    const hasA=batch.some(x=>x.who==='a'),hasB=batch.some(x=>x.who==='b');
    if(hasA&&hasB&&plan.ia===plan.ib){
      // Exact initiative ties are simultaneous: roll every component in every
      // routine at this timing point before applying any result.
      const rolled=[];for(const ev of batch)rolled.push(...rollRoutine(ev).map(x=>({...x,ev})));
      for(const x of rolled){const rr=apply(x.r,x.ev.who,{...x.ev,componentIndex:x.ci,routine:x.routine,component:x.component});noteDrain(rr,x.ev.who);attacks.push({...rr,simultaneous:true,routineName:x.routine.name,routineSeq:x.ev.seq,componentName:x.component.name,componentSeq:x.ci});}
    } else {
      const first=plan.ia>plan.ib?'a':'b';batch.sort((x,y)=>x.who===y.who?x.seq-y.seq:(x.who===first?-1:1));
      for(let bi=0;bi<batch.length&&!interrupted;bi++){
        const ev=batch[bi],other=ev.who==='a'?'b':'a';if(isDown(ev.who)||isDown(other))continue;
        const routine=routineData(ev),start=nonNegativeInt(ev.componentIndex,0);
        for(let ci=start;ci<routine.components.length;ci++){
          if(isDown(ev.who)||isDown(other))break;
          const component=routine.components[ci],meta={...ev,componentIndex:ci,routine,component};
          const rr=apply(hooks.rollComponent(ev.who,component,meta),ev.who,meta);attacks.push({...rr,routineName:routine.name,routineSeq:ev.seq,componentName:component.name,componentSeq:ci});
          if(rr?.levelDrain>0){noteDrain(rr,ev.who);const resume=ci+1<routine.components.length?{...ev,componentIndex:ci+1}:null;const rest=[...(resume?[resume]:[]),...batch.slice(bi+1)];events.unshift(...rest);interrupted=true;break;}
        }
      }
    }
    // An exact tied segment finishes simultaneously before an immediate level-drain pause.
    if(drainTargets.size)interrupted=true;
  }
  const roundFinished=events.length===0||isDown('a')||isDown('b'),regeneration=roundFinished?[regen('a'),regen('b')].filter(Boolean):[];
  return {...plan,attacks,regeneration,remainingEvents:events,drainTargets:[...drainTargets],drainById,roundFinished,tied:plan.ia===plan.ib};
}

export const BattlesystemAttackRoutines=Object.freeze({
  normalizeCadence,cadenceParts,routineCount,routineTimes,
  normalizeComponent,normalizeRoutine,normalizeRoutines,activeRoutine,
  componentWeaponEntry,routineSummary,roundPlan,executeRoundPlan
});

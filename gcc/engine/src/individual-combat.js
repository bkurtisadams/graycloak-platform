// @graycloak/battlesystem-engine individual-combat.js v0.10.0 - 2026-08-27
// Pure AD&D 1e / BATTLESYSTEM §9.4B individual-combat rules helpers.
// Hosts retain battlefield geometry/contact, roster/profile adaptation, DOM/UI,
// logging, undo/save orchestration, invisibility side effects, and referee dialogs.

const finite=(v,fallback=0)=>Number.isFinite(Number(v))?Number(v):fallback;
const positiveInt=(v,fallback=1)=>Math.max(1,Math.round(finite(v,fallback)));
const nonNegativeInt=(v,fallback=0)=>Math.max(0,Math.round(finite(v,fallback)));

function rollDie(sides,rng=Math.random){
  sides=positiveInt(sides,1);
  return Math.max(1,Math.min(sides,Math.floor(rng()*sides)+1));
}

function idCompare(x,y){
  const nx=Number(x),ny=Number(y);
  return Number.isFinite(nx)&&Number.isFinite(ny)?nx-ny:String(x).localeCompare(String(y));
}

function pairKey(aId,bId){
  if(aId==null||bId==null)return '';
  return [String(aId),String(bId)].sort(idCompare).join('|');
}
function pairIds(key){
  const ids=String(key||'').split('|');
  return ids.length===2&&ids[0]&&ids[1]?ids:null;
}
function cadenceNext(map,aId,bId){
  const key=pairKey(aId,bId),rec=key&&map?.[key],n=Math.round(Number(rec?.nextRound??rec));
  return Number.isFinite(n)&&n>0?n:1;
}
function setCadence(map,aId,bId,nextRound){
  const key=pairKey(aId,bId);if(!key||!map||typeof map!=='object'||Array.isArray(map))return false;
  map[key]={nextRound:positiveInt(nextRound,1)};return true;
}
function clearCadence(map,aId,bId){
  const key=pairKey(aId,bId);if(!key||!map||typeof map!=='object'||Array.isArray(map))return false;
  const had=Object.prototype.hasOwnProperty.call(map,key);delete map[key];return had;
}

function attackRateParts(raw='1'){
  const str=String(raw??'1').trim(),frac=str.match(/^(\d+)\s*\/\s*(\d+)$/);let n,d;
  if(frac){n=Math.max(0,Number(frac[1])||0);d=Math.max(1,Number(frac[2])||1);}
  else {
    const x=Number(str);
    if(!Number.isFinite(x)){n=1;d=1;}
    else if(Math.abs(x-Math.round(x))<1e-9){n=Math.max(0,Math.round(x));d=1;}
    else if(Math.abs((x-Math.floor(x))-.5)<1e-9){n=Math.max(0,Math.floor(x)*2+1);d=2;}
    else {n=Math.max(0,Math.round(x*1000));d=1000;}
  }
  return {n,d};
}
function attackCount(raw='1',meleeRound=1,speed=1){
  let {n,d}=attackRateParts(raw);
  speed=finite(speed,1);
  if(speed>1+1e-9)n*=Math.max(1,Math.round(speed));
  else if(speed<1-1e-9)d*=Math.max(1,Math.round(1/speed));
  const base=Math.floor(n/d),extra=n%d,round=positiveInt(meleeRound,1);
  return Math.max(0,base+(((round-1)%d)<extra?1:0));
}
function attackTimes(count){
  count=Math.max(0,Math.floor(finite(count,0)));
  if(count===0)return [];
  if(count===1)return [.5];
  return Array.from({length:count},(_,i)=>i/(count-1));
}

function rollDamage(expr,rng=Math.random){
  const t=String(expr||'').trim().replace(/\s+/g,'').toLowerCase(),m=t.match(/^(\d*)d(\d+)([+-]\d+)?$/);
  if(!m)return {total:0,expr:t||'—',rolls:[],modifier:0,invalid:true};
  const n=Math.max(1,Number(m[1]||1)),sides=Math.max(1,Number(m[2])),modifier=Number(m[3]||0),rolls=Array.from({length:n},()=>rollDie(sides,rng));
  return {total:Math.max(0,rolls.reduce((a,b)=>a+b,0)+modifier),expr:t,rolls,modifier,invalid:false};
}

function weaponTraits(entry={}){
  const name=String(entry?.name||''),m=name.match(/\+\s*(\d+)\s*$/),namedPlus=m?Math.max(0,Number(m[1])||0):0;
  const sharpness=!!entry?.sharpness,explicitPlus=Math.max(0,Math.round(Number(entry?.magicPlus)||0)),magicPlus=Math.max(explicitPlus,namedPlus,sharpness?3:0);
  return {
    magic:!!entry?.magic||magicPlus>0,
    magicPlus,
    silver:!!entry?.silver||/\bsilver(?:ed)?\b/i.test(name),
    sharpness,
    fire:!!entry?.fire||/\b(?:fire|flame|flaming|burn)/i.test(name),
    acid:!!entry?.acid||/\bacid/i.test(name)
  };
}
function meetsInvulnerability(requirement='none',tags={}){
  const req=String(requirement||'none');
  if(req==='none')return true;
  if(req==='magic')return !!tags.magic;
  if(req==='silver')return !!tags.silver;
  return !!tags.magic||!!tags.silver;
}
function sharpnessCheck({defenderSize='M',traits={},d20=0,hit=true}={}){
  if(!hit||!traits?.sharpness)return null;
  const size=String(defenderSize||'M').toUpperCase(),category=size==='L'?'larger than man-sized':'normal/armored',threshold=size==='L'?20:19,score=finite(d20,0)+1;
  return {triggered:score>=threshold,score,threshold,category,magicPlus:nonNegativeInt(traits.magicPlus,0)};
}

function resolveAttack(input={},rng=Math.random){
  const effectiveThaco=finite(input.thaco,NaN)+finite(input.thacoDelta,0),effectiveAc=finite(input.ac,NaN),hitBonus=finite(input.hitBonus,0),targetBonus=finite(input.targetBonus,0);
  const need=effectiveThaco-effectiveAc,d20=rollDie(20,rng),total=d20+hitBonus+targetBonus,hit=!!input.autoHit||(Number.isFinite(need)&&total>=need);
  const tags=input.attackTags||{},canHarm=input.canHarm==null?meetsInvulnerability(input.invulnerability,tags):!!input.canHarm;
  let damage=hit&&canHarm?rollDamage(input.damageExpr,rng):null;
  const specialDamage=finite(input.damageModifier,0);
  if(damage&&specialDamage)damage={...damage,total:Math.max(0,damage.total+specialDamage),specialModifier:specialDamage};
  const levelDrain=hit&&canHarm?nonNegativeInt(input.levelDrain,0):0;
  const poison=hit&&canHarm&&input.poison&&input.poison!=='none'?input.poison:'none';
  const paralysis=hit&&canHarm&&input.paralysis&&input.paralysis!=='none'?input.paralysis:'none';
  const traits=input.weaponTraits||weaponTraits({name:input.weapon});
  return {d20,hitBonus,targetBonus,total,need,hit,canHarm,damage,effectiveThaco,effectiveAc,levelDrain,poison,paralysis,sharpness:sharpnessCheck({defenderSize:input.defenderSize,traits,d20,hit:hit&&canHarm})};
}

function applyAttackState(defenderState={},attack={}){
  const state={...defenderState};
  if(!attack?.hit)return {state,result:{...attack}};
  const before=Math.max(0,finite(state.hp,0)),result={...attack,before};
  if(!attack.canHarm){result.after=before;result.down=false;return {state,result};}
  if(attack.damage)state.hp=Math.max(0,before-finite(attack.damage.total,0));
  else state.hp=before;
  result.after=Math.max(0,finite(state.hp,0));result.down=result.after<=0;
  if(attack.levelDrain>0)state.pendingLevelDrain=nonNegativeInt(state.pendingLevelDrain,0)+nonNegativeInt(attack.levelDrain,0);
  return {state,result};
}
function regenerationStep({enabled=true,hp=0,maxHp=0,rate=0}={}){
  rate=nonNegativeInt(rate,0);hp=Math.max(0,finite(hp,0));maxHp=Math.max(0,finite(maxHp,0));
  if(!enabled||rate<=0||hp<=0)return null;
  const after=Math.min(maxHp,hp+rate);if(after<=hp)return null;
  return {before:hp,after,amount:after-hp,rate};
}

function roundPlan({meleeRound=1,cadenceRound=meleeRound,aRate='1',bRate='1',aSpeed=1,bSpeed=1}={},rng=Math.random){
  const round=positiveInt(meleeRound,1),absRound=positiveInt(cadenceRound,round),ia=rollDie(6,rng),ib=rollDie(6,rng),ca=attackCount(aRate,absRound,aSpeed),cb=attackCount(bRate,absRound,bSpeed);
  const events=[...attackTimes(ca).map((time,i)=>({time,who:'a',seq:i})),...attackTimes(cb).map((time,i)=>({time,who:'b',seq:i}))].sort((x,y)=>x.time-y.time||x.seq-y.seq);
  return {round,cadenceRound:absRound,ia,ib,ca,cb,events};
}

function executeRoundPlan(plan={},hooks={}){
  if(typeof hooks.rollAttack!=='function')throw new TypeError('executeRoundPlan requires rollAttack(who)');
  const isDown=typeof hooks.isDown==='function'?hooks.isDown:()=>false,apply=typeof hooks.applyAttack==='function'?hooks.applyAttack:r=>r,regen=typeof hooks.regenerate==='function'?hooks.regenerate:()=>null;
  const events=(plan.events||[]).map(e=>({...e})),attacks=[],drainTargets=new Set(),drainById={};
  const targetId=(who,r)=>r?.defId??(typeof hooks.defenderId==='function'?hooks.defenderId(who,r):(who==='a'?hooks.bId:hooks.aId));
  const noteDrain=(r,who)=>{if(r?.levelDrain>0){const id=targetId(who,r);if(id!=null){drainTargets.add(id);drainById[id]=(drainById[id]||0)+r.levelDrain;}}};
  while(events.length){
    const time=events[0].time,batch=[];while(events.length&&Math.abs(events[0].time-time)<1e-9)batch.push(events.shift());
    if(isDown('a')||isDown('b'))break;
    const hasA=batch.some(x=>x.who==='a'),hasB=batch.some(x=>x.who==='b');
    if(hasA&&hasB&&plan.ia===plan.ib){
      const rolled=batch.map(x=>hooks.rollAttack(x.who,x));
      for(let i=0;i<rolled.length;i++){const r=apply(rolled[i],batch[i].who,batch[i]);noteDrain(r,batch[i].who);}
      attacks.push(...rolled.map(r=>({...r,simultaneous:true})));
    } else {
      const first=plan.ia>plan.ib?'a':'b';batch.sort((x,y)=>x.who===y.who?x.seq-y.seq:(x.who===first?-1:1));
      for(let bi=0;bi<batch.length;bi++){const ev=batch[bi],other=ev.who==='a'?'b':'a';if(isDown(ev.who)||isDown(other))continue;
        const r=apply(hooks.rollAttack(ev.who,ev),ev.who,ev);attacks.push(r);
        if(r?.levelDrain>0){noteDrain(r,ev.who);events.unshift(...batch.slice(bi+1));break;}
      }
    }
    // A level drain changes the victim immediately under normal AD&D combat.
    // Finish an exact tied segment simultaneously, then pause before later routines.
    if(drainTargets.size)break;
  }
  const roundFinished=events.length===0||isDown('a')||isDown('b'),regeneration=roundFinished?[regen('a'),regen('b')].filter(Boolean):[];
  return {...plan,attacks,regeneration,remainingEvents:events,drainTargets:[...drainTargets],drainById,roundFinished,tied:plan.ia===plan.ib};
}

function pendingFromRound(aId,bId,r={}){
  return {aId,bId,round:r.round,cadenceRound:r.cadenceRound||r.round,ia:r.ia,ib:r.ib,ca:r.ca,cb:r.cb,events:(r.remainingEvents||[]).map(e=>({...e})),nextRound:(r.remainingEvents||[]).length?r.round:r.round+1,waitingIds:[...(r.drainTargets||[])],waitingDrainById:{...(r.drainById||{})}};
}

export const BattlesystemIndividualCombat=Object.freeze({
  pairKey,pairIds,cadenceNext,setCadence,clearCadence,
  attackRateParts,attackCount,attackTimes,rollDamage,
  weaponTraits,meetsInvulnerability,sharpnessCheck,
  resolveAttack,applyAttackState,regenerationStep,roundPlan,executeRoundPlan,pendingFromRound
});

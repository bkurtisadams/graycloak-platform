// @graycloak/battlesystem-engine secondary-effects.js v0.1.0 - 2026-08-28
// Pure reusable secondary/conditional creature-effect vocabulary.
// Hosts retain battlefield state mutation, AD&D save rolls, status application,
// equipment mutation, logs, UI, and referee rulings.

const TRIGGERS=Object.freeze(['onHit','onDamage','onTouch','onDamaged','onContact','gaze','manual']);
const EFFECT_TYPES=Object.freeze(['poison','paralysis','petrification','disease','constriction','levelDrain','abilityDrain','equipmentDamage','damage','status','reactive','custom']);
const SAVE_TYPES=Object.freeze(['none','poison','petrification','paralysis','spell','custom']);

const text=v=>String(v??'').trim();
const int=(v,f=0)=>Number.isFinite(Number(v))?Math.round(Number(v)):f;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const slug=v=>text(v).toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60);
const key=v=>text(v).toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9+]+/g,' ').trim();

function normalizeEffect(raw={},index=0){
  raw=raw&&typeof raw==='object'?raw:{};
  const name=text(raw.name||raw.label||raw.effectName||`Secondary Effect ${index+1}`)||`Secondary Effect ${index+1}`;
  const trigger=TRIGGERS.includes(raw.trigger)?raw.trigger:'onHit';
  const effectType=EFFECT_TYPES.includes(raw.effectType||raw.type)?(raw.effectType||raw.type):'custom';
  const saveType=SAVE_TYPES.includes(raw.saveType||raw.save)?(raw.saveType||raw.save):'none';
  const id=text(raw.id)||`secondary-${slug(name)||index+1}`;
  return {
    id,
    name,
    trigger,
    effectType,
    chancePct:clamp(int(raw.chancePct??raw.chance,100),0,100),
    minHits:clamp(int(raw.minHits??raw.hits,1),1,20),
    attackMatch:text(raw.attackMatch||raw.attack||raw.weaponMatch).slice(0,120),
    saveType,
    saveMod:clamp(int(raw.saveMod??raw.saveModifier,0),-20,20),
    amount:text(raw.amount||raw.result||raw.magnitude).slice(0,120),
    duration:text(raw.duration).slice(0,120),
    notes:text(raw.notes).slice(0,320)
  };
}

function normalizeEffects(raw=[]){
  const list=Array.isArray(raw)?raw:[];
  const out=[],seen=new Set();
  for(let i=0;i<list.length;i++){
    const x=normalizeEffect(list[i],i);let id=x.id,n=2;while(seen.has(id))id=`${x.id}-${n++}`;seen.add(id);out.push(id===x.id?x:{...x,id});
  }
  return out;
}

function triggerLabel(trigger='onHit'){
  return ({onHit:'On hit',onDamage:'On damaging hit',onTouch:'On melee touch/hit',onDamaged:'When damaged',onContact:'On contact',gaze:'Gaze / viewer',manual:'Manual / referee'})[trigger]||'On hit';
}
function effectTypeLabel(type='custom'){
  return ({poison:'Poison',paralysis:'Paralysis',petrification:'Petrification',disease:'Disease',constriction:'Hug / constriction',levelDrain:'Level drain',abilityDrain:'Ability drain',equipmentDamage:'Equipment damage',damage:'Extra damage',status:'Status / condition',reactive:'Reactive defense',custom:'Custom / referee'})[type]||'Custom / referee';
}
function saveTypeLabel(type='none'){
  return ({none:'No save recorded',poison:'Save vs Poison',petrification:'Save vs Petrification/Polymorph',paralysis:'Save vs Paralysis/Poison/Death',spell:'Save vs Spell',custom:'Custom save'})[type]||'No save recorded';
}

function attackText(event={}){
  return key([event.weapon,event.attackName,event.componentName,event.attackLabel].filter(Boolean).join(' '));
}
function attackMatch(effect={},event={}){
  const want=key(effect.attackMatch);if(!want)return true;const got=attackText(event);if(!got)return false;
  return want.split(/[,;|]+/).map(key).filter(Boolean).some(part=>got.includes(part));
}
function baseTriggerMatch(effect={},event={}){
  if(effect.trigger==='manual'||effect.trigger==='gaze')return false;
  if(effect.trigger==='onHit')return !!event.hit;
  if(effect.trigger==='onDamage')return !!event.hit&&Number(event.damage)>0;
  if(effect.trigger==='onTouch')return !!event.hit&&String(event.attackKind||'').toLowerCase()==='melee';
  if(effect.trigger==='onDamaged')return Number(event.receivedDamage??event.damage)>0;
  if(effect.trigger==='onContact')return !!event.contact;
  return false;
}
function eventMatches(rawEffect={},event={}){
  const effect=normalizeEffect(rawEffect);return baseTriggerMatch(effect,event)&&attackMatch(effect,event);
}
function chanceCheck(rawEffect={},rng=Math.random){
  const effect=normalizeEffect(rawEffect);const chance=effect.chancePct;if(chance>=100)return{applies:false,chancePct:100,roll:null,success:true};
  if(chance<=0)return{applies:true,chancePct:0,roll:null,success:false};
  const raw=clamp(Number(rng?.())||0,0,0.999999999999);const r=clamp(Math.floor(raw*100+1e-9)+1,1,100);return{applies:true,chancePct:chance,roll:r,success:r<=chance};
}
function resolveEvent(rawEffects=[],event={},rng=Math.random){
  const effects=normalizeEffects(rawEffects),out=[];
  for(const effect of effects){if(effect.minHits>1||!eventMatches(effect,event))continue;const chance=chanceCheck(effect,rng);out.push({effect,chance,triggered:chance.success});}
  return out;
}
function resolveBatch(rawEffects=[],events=[],rng=Math.random){
  const effects=normalizeEffects(rawEffects),list=Array.isArray(events)?events:[],out=[];
  for(const effect of effects){
    if(effect.trigger==='manual'||effect.trigger==='gaze')continue;
    const matches=list.filter(ev=>baseTriggerMatch(effect,ev)&&attackMatch(effect,ev));
    if(matches.length<effect.minHits)continue;
    const chance=chanceCheck(effect,rng);out.push({effect,chance,triggered:chance.success,hitCount:matches.length,matchedEvents:matches});
  }
  return out;
}
function manualEffects(rawEffects=[],trigger='manual'){
  return normalizeEffects(rawEffects).filter(x=>x.trigger===trigger);
}
function dueLabel(rawEffect={},meta={}){
  const effect=normalizeEffect(rawEffect),bits=[effect.name,effectTypeLabel(effect.effectType)];
  if(effect.minHits>1)bits.push(`${meta.hitCount??effect.minHits}/${effect.minHits} hits`);
  if(effect.chancePct<100)bits.push(`${effect.chancePct}%`);
  if(effect.saveType!=='none')bits.push(`${saveTypeLabel(effect.saveType)}${effect.saveMod?` ${effect.saveMod>0?'+':''}${effect.saveMod}`:''}`);
  if(effect.amount)bits.push(effect.amount);if(effect.duration)bits.push(effect.duration);return bits.join(' · ');
}
function numericLevelDrain(rawEffect={}){
  const effect=normalizeEffect(rawEffect);if(effect.effectType!=='levelDrain')return 0;const m=effect.amount.match(/-?\d+/);return m?clamp(Math.abs(int(m[0],0)),0,9):0;
}

export const BattlesystemSecondaryEffects=Object.freeze({
  triggers:TRIGGERS,effectTypes:EFFECT_TYPES,saveTypes:SAVE_TYPES,
  normalizeEffect,normalizeEffects,triggerLabel,effectTypeLabel,saveTypeLabel,
  attackMatch,eventMatches,chanceCheck,resolveEvent,resolveBatch,manualEffects,dueLabel,numericLevelDrain
});

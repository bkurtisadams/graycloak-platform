// @graycloak/battlesystem-engine innate-actions.js v0.1.0 - 2026-08-28
// Pure reusable innate/spell-like action vocabulary.
// Hosts retain battlefield state mutation, UI, logs, spell/item resource handling,
// geometry, summon placement, and referee rulings.

const FREQUENCIES=Object.freeze(['atWill','oncePerRound','oncePerDay','limited','custom']);
const TIMINGS=Object.freeze(['missileMagic','anyMagic','custom']);
const TARGETS=Object.freeze(['auto','self','creature','point','area','none']);
const RESOLVERS=Object.freeze(['spell','summon','custom']);

const text=v=>String(v??'').trim();
const int=(v,f=0)=>Number.isFinite(Number(v))?Math.round(Number(v)):f;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const slug=v=>text(v).toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60);

function normalizeAction(raw={},index=0){
  raw=raw&&typeof raw==='object'?raw:{};
  const name=text(raw.name||raw.label||raw.spellName||`Innate ${index+1}`)||`Innate ${index+1}`;
  const frequency=FREQUENCIES.includes(raw.frequency)?raw.frequency:'atWill';
  const timing=TIMINGS.includes(raw.timing)?raw.timing:'missileMagic';
  const target=TARGETS.includes(raw.target)?raw.target:'auto';
  const resolver=RESOLVERS.includes(raw.resolver)?raw.resolver:'spell';
  const chanceRaw=raw.chancePct??raw.chance??100;
  const chancePct=clamp(int(chanceRaw,100),0,100);
  const casterLevel=Math.max(0,int(raw.casterLevel??raw.effectiveLevel,0));
  const uses=Math.max(0,int(raw.uses??raw.frequencyUses,0));
  const id=text(raw.id)||`innate-${slug(name)||index+1}`;
  return {
    id,
    name,
    frequency,
    uses,
    chancePct,
    casterLevel,
    timing,
    target,
    resolver,
    spellName:text(raw.spellName||raw.functionName||(resolver==='spell'?name:'')),
    notes:text(raw.notes).slice(0,320)
  };
}

function normalizeActions(raw=[]){
  const list=Array.isArray(raw)?raw:[];
  const out=[],seen=new Set();
  for(let i=0;i<list.length;i++){
    const a=normalizeAction(list[i],i);
    let id=a.id,n=2;while(seen.has(id))id=`${a.id}-${n++}`;
    seen.add(id);out.push(id===a.id?a:{...a,id});
  }
  return out;
}

function frequencyLabel(a={}){
  const x=normalizeAction(a);
  if(x.frequency==='atWill')return'At will';
  if(x.frequency==='oncePerRound')return'1/round';
  if(x.frequency==='oncePerDay')return'1/day';
  if(x.frequency==='limited')return x.uses?`${x.uses} uses`:'Limited';
  return'Custom';
}
function timingLabel(a={}){const x=normalizeAction(a);return x.timing==='missileMagic'?'Missile & Magic':x.timing==='anyMagic'?'Normal magic timing':'Custom timing';}
function targetLabel(a={}){const x=normalizeAction(a);return({auto:'Spell/default',self:'Self',creature:'Creature',point:'Point',area:'Area',none:'None'})[x.target]||x.target;}
function resolverLabel(a={}){const x=normalizeAction(a);return({spell:'Spell engine',summon:'Summon/Create Troops',custom:'Referee/custom'})[x.resolver]||x.resolver;}
function summary(a={}){const x=normalizeAction(a),bits=[x.name,frequencyLabel(x)];if(x.chancePct<100)bits.push(`${x.chancePct}%`);if(x.casterLevel)bits.push(`CL ${x.casterLevel}`);bits.push(timingLabel(x));bits.push(targetLabel(x));if(x.resolver!=='spell'||(x.spellName&&x.spellName!==x.name))bits.push(resolverLabel(x));return bits.join(' · ');}

function targetMode(a={}){const t=normalizeAction(a).target;return t==='self'?'self':t==='creature'?'target':t==='point'||t==='area'?'area':t==='none'?'none':null;}
function toMagicEntry(a={}){
  const x=normalizeAction(a),fn=x.spellName||x.name;
  return {
    name:x.name,
    kind:'innate',
    level:null,
    sourceId:'innate-actions',
    sourceName:'Innate Actions',
    functionName:fn,
    effectiveLevel:x.casterLevel||null,
    defaultTarget:targetMode(x),
    innateAction:{...x}
  };
}
function magicProfile(a={}){
  const x=normalizeAction(a),mode=targetMode(x),out={
    innateAction:true,
    innateActionId:x.id,
    innateFrequency:x.frequency,
    innateChancePct:x.chancePct,
    innateTiming:x.timing,
    effectiveLevel:x.casterLevel||null,
    label:summary(x)
  };
  if(mode)out.defaultTarget=mode;
  if(x.resolver==='summon')Object.assign(out,{executionResolver:'summon',automation:'referee',createKind:'summoned'});
  else if(x.resolver==='custom')Object.assign(out,{executionResolver:'referee',automation:'referee'});
  return out;
}
function timingState(a={},opts={}){
  const x=normalizeAction(a);if(opts.liveBattle!==true)return{applies:true,ok:true,requiredPhase:x.timing==='missileMagic'?'missileMagic':null};
  const phase=String(opts.phaseId||'');
  if(x.timing==='missileMagic'&&phase!=='missileMagic')return{applies:true,ok:false,requiredPhase:'missileMagic',reason:'this innate action is usable only in the Missile & Magic Phase'};
  return{applies:true,ok:true,requiredPhase:x.timing==='missileMagic'?'missileMagic':null};
}
function chanceCheck(a={},rng=Math.random){
  const x=normalizeAction(a),chance=x.chancePct;
  if(chance>=100)return{applies:false,chancePct:100,roll:null,success:true};
  if(chance<=0)return{applies:true,chancePct:0,roll:null,success:false};
  const raw=clamp(Number(rng())||0,0,0.999999999999);
  const r=clamp(Math.floor(raw*100+1e-9)+1,1,100);
  return{applies:true,chancePct:chance,roll:r,success:r<=chance};
}
function fromLegacyName(name,index=0){return normalizeAction({id:`legacy-${slug(name)||index+1}`,name,frequency:'atWill',chancePct:100,timing:'missileMagic',target:'auto',resolver:'spell',spellName:name},index);}

export const BattlesystemInnateActions=Object.freeze({
  frequencies:FREQUENCIES,timings:TIMINGS,targets:TARGETS,resolvers:RESOLVERS,
  normalizeAction,normalizeActions,frequencyLabel,timingLabel,targetLabel,resolverLabel,summary,targetMode,toMagicEntry,magicProfile,timingState,chanceCheck,fromLegacyName
});

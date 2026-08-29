// @graycloak/battlesystem-engine creature-defenses.js v0.1.0 - 2026-08-28
// Pure AD&D 1e / BATTLESYSTEM creature-defense capabilities.
// Hosts retain roster/profile adaptation, state mutation, UI, logs, undo/save
// orchestration, spell targeting, and referee rulings.

const DAMAGE_RESPONSE_TYPES=Object.freeze(['normal','half','immune','double','special']);
const WEAPON_REQUIREMENT_TYPES=Object.freeze(['normal','silver','iron','coldIron','magic','plus1','plus2','plus3','blessed','special']);

const finite=(v,fallback=0)=>Number.isFinite(Number(v))?Number(v):fallback;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

function rollDie(sides,rng=Math.random){
  sides=Math.max(1,Math.round(finite(sides,1)));
  return clamp(Math.floor(clamp(finite(rng(),0),0,0.999999999999)*sides)+1,1,sides);
}

function normalizeTag(raw=''){
  return String(raw||'').trim().toLowerCase().replace(/\s+/g,' ').slice(0,40);
}

function normalizeDamageResponse(row={}){
  if(typeof row==='string')row={tag:row,response:'normal'};
  row=row&&typeof row==='object'?row:{};
  const tag=normalizeTag(row.tag||row.type||row.damageTag);
  const response=DAMAGE_RESPONSE_TYPES.includes(row.response)?row.response:'normal';
  if(!tag)return null;
  return {tag,response,note:String(row.note||row.notes||'').trim().slice(0,160)};
}

function normalizeWeaponRequirement(row={}){
  if(typeof row==='string')row={type:row};
  row=row&&typeof row==='object'?row:{};
  let type=String(row.type||row.requirement||'').trim();
  if(/^\+?1(?:\+|\s*or better)?$/i.test(type))type='plus1';
  else if(/^\+?2(?:\+|\s*or better)?$/i.test(type))type='plus2';
  else if(/^\+?3(?:\+|\s*or better)?$/i.test(type))type='plus3';
  else if(/^cold[ -]?iron$/i.test(type))type='coldIron';
  if(!WEAPON_REQUIREMENT_TYPES.includes(type))return null;
  return {type,note:String(row.note||row.notes||'').trim().slice(0,160)};
}

function legacyInvulnerabilityValue(legacy={}){
  if(typeof legacy==='string')return legacy;
  return String(legacy?.invulnerability||legacy?.weaponInvulnerability||'none');
}

function legacyWeaponRequirements(legacy={}){
  const req=legacyInvulnerabilityValue(legacy);
  if(req==='magic')return [{type:'magic',note:'migrated from legacy §13.3 Magic required'}];
  if(req==='silver')return [{type:'silver',note:'migrated from legacy §13.3 Silver required'}];
  if(req==='magicOrSilver')return [
    {type:'magic',note:'migrated from legacy §13.3 Magic OR Silver'},
    {type:'silver',note:'migrated from legacy §13.3 Magic OR Silver'}
  ];
  return [];
}

function normalize(raw={},opts={}){
  raw=raw&&typeof raw==='object'?raw:{};
  const mrRaw=raw.magicResistance;
  const percent=clamp(Math.round(finite(
    typeof mrRaw==='number'?mrRaw:(mrRaw?.percent??raw.mr),0
  )),0,100);
  const referenceLevel=clamp(Math.round(finite(
    typeof mrRaw==='object'
      ?(mrRaw?.referenceLevel??raw.mrReferenceLevel)
      :raw.mrReferenceLevel,
    11
  )),1,40);

  let damageResponses=[];
  if(Array.isArray(raw.damageResponses)){
    damageResponses=raw.damageResponses.map(normalizeDamageResponse).filter(Boolean);
  }else if(raw.damageResponses&&typeof raw.damageResponses==='object'){
    damageResponses=Object.entries(raw.damageResponses)
      .map(([tag,response])=>normalizeDamageResponse({tag,response}))
      .filter(Boolean);
  }

  const seenTags=new Set();
  damageResponses=damageResponses.filter(row=>{
    if(seenTags.has(row.tag))return false;
    seenTags.add(row.tag);
    return true;
  });

  let weaponRequirements=Array.isArray(raw.weaponRequirements)
    ?raw.weaponRequirements.map(normalizeWeaponRequirement).filter(Boolean)
    :[];

  const legacy=opts?.legacyAbilities??opts?.legacyInvulnerability??null;

  if(!weaponRequirements.length&&legacy!=null){
    weaponRequirements=legacyWeaponRequirements(legacy);
  }

  if(weaponRequirements.some(row=>row.type==='normal')){
    weaponRequirements=[];
  }

  const seenRequirements=new Set();
  weaponRequirements=weaponRequirements.filter(row=>{
    if(seenRequirements.has(row.type))return false;
    seenRequirements.add(row.type);
    return true;
  });

  return {
    magicResistance:{percent,referenceLevel},
    damageResponses,
    weaponRequirements
  };
}

function isEmpty(defenses={}){
  const d=normalize(defenses);
  return !d.magicResistance.percent
    &&!d.damageResponses.length
    &&!d.weaponRequirements.length;
}

function damageResponse(defenses={},tag='normal'){
  const key=normalizeTag(tag||'normal');
  const d=normalize(defenses);
  return d.damageResponses.find(row=>row.tag===key)
    ||{tag:key,response:'normal',note:''};
}

function applyDamageResponse(value,rowOrResponse,{integer=false}={}){
  let n=Math.max(0,finite(value,0));
  const response=typeof rowOrResponse==='string'
    ?rowOrResponse
    :(rowOrResponse?.response||'normal');

  if(response==='immune')n=0;
  else if(response==='half')n/=2;
  else if(response==='double')n*=2;
  else if(response==='special')return null;

  return integer?Math.floor(n+1e-9):n;
}

function damageResponseSymbol(response='normal'){
  return response==='half'?'½'
    :response==='immune'?'immune'
    :response==='double'?'×2'
    :response==='special'?'special'
    :'normal';
}

function weaponRequirementLabel(type=''){
  return ({
    silver:'Silver',
    iron:'Iron',
    coldIron:'Cold iron',
    magic:'Magic',
    plus1:'+1 or better',
    plus2:'+2 or better',
    plus3:'+3 or better',
    blessed:'Blessed',
    special:'Special / referee',
    normal:'Normal weapons'
  })[type]||type;
}

function weaponRequirementSummary(defenses={}){
  const req=normalize(defenses).weaponRequirements;
  return req.length
    ?req.map(row=>weaponRequirementLabel(row.type)).join(' OR ')
    :'Normal weapons';
}

function weaponGate(defenses={},traits={}){
  const req=normalize(defenses).weaponRequirements;

  if(!req.length){
    return {
      ok:true,
      due:false,
      label:'Normal weapons',
      requirements:[]
    };
  }

  const tags={
    magic:!!traits.magic,
    magicPlus:Math.max(0,Math.round(finite(traits.magicPlus,0))),
    silver:!!traits.silver,
    iron:!!traits.iron,
    coldIron:!!traits.coldIron,
    blessed:!!traits.blessed
  };

  let due=false;

  for(const row of req){
    let hit=false;

    if(row.type==='silver')hit=tags.silver;
    else if(row.type==='iron')hit=tags.iron||tags.coldIron;
    else if(row.type==='coldIron')hit=tags.coldIron;
    else if(row.type==='magic')hit=tags.magic;
    else if(row.type==='plus1')hit=tags.magicPlus>=1;
    else if(row.type==='plus2')hit=tags.magicPlus>=2;
    else if(row.type==='plus3')hit=tags.magicPlus>=3;
    else if(row.type==='blessed')hit=tags.blessed;
    else if(row.type==='special')due=true;
    else if(row.type==='normal')hit=true;

    if(hit){
      return {
        ok:true,
        due:false,
        label:weaponRequirementSummary(defenses),
        requirements:req,
        matched:row,
        tags
      };
    }
  }

  return {
    ok:false,
    due,
    label:weaponRequirementSummary(defenses),
    requirements:req,
    tags
  };
}

function magicResistance(defenses={},casterLevel,rng=Math.random){
  const mr=normalize(defenses).magicResistance;

  if(!mr.percent){
    return {
      applies:false,
      due:false,
      resisted:false,
      base:0,
      referenceLevel:mr.referenceLevel,
      adjusted:0,
      roll:null
    };
  }

  const level=Number(casterLevel);

  if(!Number.isFinite(level)||level<=0){
    return {
      applies:true,
      due:true,
      resisted:false,
      base:mr.percent,
      referenceLevel:mr.referenceLevel,
      casterLevel:null,
      adjusted:null,
      roll:null
    };
  }

  const caster=Math.round(level);
  const adjusted=clamp(
    mr.percent+(mr.referenceLevel-caster)*5,
    0,
    100
  );
  const roll=rollDie(100,rng);

  return {
    applies:true,
    due:false,
    resisted:roll<=adjusted,
    base:mr.percent,
    referenceLevel:mr.referenceLevel,
    casterLevel:caster,
    adjusted,
    roll
  };
}

export const BattlesystemCreatureDefenses=Object.freeze({
  damageResponseTypes:DAMAGE_RESPONSE_TYPES,
  weaponRequirementTypes:WEAPON_REQUIREMENT_TYPES,
  normalizeTag,
  normalizeDamageResponse,
  normalizeWeaponRequirement,
  legacyWeaponRequirements,
  normalize,
  isEmpty,
  damageResponse,
  applyDamageResponse,
  damageResponseSymbol,
  weaponRequirementLabel,
  weaponRequirementSummary,
  weaponGate,
  magicResistance
});
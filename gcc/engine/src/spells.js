// @graycloak/battlesystem-engine spells.js v0.7.0 - 2026-08-26
// Pure spell/source adapter vocabulary. The board still owns battlefield geometry,
// saving-throw rolls, damage application, status application, spell preparation,
// PHB catalog/UI, and referee-facing orchestration.
//
// First extraction slice: source-backed item-spell overrides, beginning with
// Daoud's Wondrous Lanthorn. Known source overrides are data, not host UI hints:
// an item can alter effective caster level, resource cost, range, targeting, and
// save behavior while the underlying spell resolver remains shared.

const DAOUD_LANTHORN = Object.freeze({
  key:'daouds-wondrous-lanthorn',
  name:"Daoud's Wondrous Lanthorn",
  effectiveLevel:19,
  // BATTLESYSTEM is an outdoor battlefield scale: 1 tabletop inch = 10 yards.
  // The artifact's literal 30-foot range is therefore 10 yards = 1 battlefield inch.
  rangeFeet:30,
  rangeIn:1,
  // Its literal 10-foot no-save/no-MR zone is one-third of a battlefield inch.
  closeFeet:10,
  closeIn:1/3,
  costs:Object.freeze({
    holdPerson:5,
    holdMonster:5,
    haste:5,
    colorSpray:5,
    fear:5,
    emotionRage:5,
    flameStrike:5,
    confusion:10,
    prismaticSpray:50,
    prismaticSphere:50
  })
});

function textKey(value='') {
  return String(value||'').toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9]+/g,' ').trim();
}

function entryText(entry={},notes='') {
  return `${entry?.functionName||''} ${entry?.name||''} ${entry?.sourceName||''} ${notes||''}`.trim();
}

function isDaoudLanthorn(entry={}) {
  return /\bdaoud s wondrous lanthorn\b/.test(textKey(entry?.sourceName||entry?.itemName||entry?.name||''));
}

function namedSpellKey(entry={},notes='') {
  const fn=String(entry?.functionName||entry?.name||''),txt=textKey(`${fn} ${notes||''}`),magicKind=['spell','item','innate'].includes(entry?.kind);
  if(!magicKind)return'';
  if(/\bfire ball\b/.test(txt)||/\bfireball\b/.test(txt))return'fireball';
  if(/\bflame strike\b/.test(txt))return'flameStrike';
  if(/\bhaste\b/.test(txt))return'haste';
  if(/\bslow\b/.test(txt))return'slow';
  if(/\bsleep\b/.test(txt))return'sleep';
  if(/\bhold monster\b/.test(txt))return'holdMonster';
  if(/\bhold person\b/.test(txt))return'holdPerson';
  if(/\bcolor spray\b|\bcolour spray\b/.test(txt))return'colorSpray';
  if(/\bemotion\b.*\brage\b|\brage\b.*\bemotion\b/.test(txt))return'emotionRage';
  if(/\bscare\b/.test(txt))return'scare';
  if(/^\s*fear\s*$/i.test(fn)||textKey(fn)==='fear')return'fear';
  if(/\bconfusion\b/.test(txt))return'confusion';
  if(/\bprismatic spray\b/.test(txt))return'prismaticSpray';
  if(/\bprismatic sphere\b/.test(txt))return'prismaticSphere';
  return'';
}

function daoudFunctionKey(entry={},notes='') {
  if(!isDaoudLanthorn(entry))return'';
  return namedSpellKey({...entry,kind:'item'},notes);
}

function itemEffectiveLevel(entry={}) {
  return isDaoudLanthorn(entry)?DAOUD_LANTHORN.effectiveLevel:null;
}

function itemResourceCost(entry={},notes='') {
  const key=daoudFunctionKey(entry,notes);
  return key&&Object.prototype.hasOwnProperty.call(DAOUD_LANTHORN.costs,key)?DAOUD_LANTHORN.costs[key]:null;
}

function daoudSinglePrismBase(key,prism,labelTail='') {
  return {
    sourceAdapter:DAOUD_LANTHORN.key,
    sourceKind:'artifact',
    sourceMode:'single-prism',
    prism,
    spellKey:key,
    level:DAOUD_LANTHORN.effectiveLevel,
    effectiveLevel:DAOUD_LANTHORN.effectiveLevel,
    rangeIn:DAOUD_LANTHORN.rangeIn,
    sourceRangeFeet:DAOUD_LANTHORN.rangeFeet,
    defaultTarget:'target',
    shape:'point',
    singleCreatureTarget:true,
    lockTargetMode:true,
    lockRange:true,
    noSaveWithinIn:DAOUD_LANTHORN.closeIn,
    noSaveWithinFeet:DAOUD_LANTHORN.closeFeet,
    ignoreMagicResistanceWithinIn:DAOUD_LANTHORN.closeIn,
    resourceCost:DAOUD_LANTHORN.costs[key]??5,
    resourceUnit:'years',
    label:`${DAOUD_LANTHORN.name} · ${prism} prism · ${labelTail}`.trim()
  };
}

function sourcePreset(entry={},opts={}) {
  const key=daoudFunctionKey(entry,opts.notes||'');
  if(!key)return null;
  const L=DAOUD_LANTHORN.effectiveLevel;
  if(key==='holdMonster')return {...daoudSinglePrismBase(key,'Ruby',`Hold Monster · one victim · 30′ range = 1″ battlefield · effective level ${L} · 1 round/level (${L} rounds) · one-target save -3 beyond 10′; within 10′ no save and magic resistance does not protect · 5 years fuel`),saveType:'sp',saveEffect:'negates',saveMod:-3,lockSaveType:true,lockSaveMod:true,statusEffect:'hold',durationRounds:L};
  if(key==='holdPerson')return {...daoudSinglePrismBase(key,'Ruby',`Hold Person · one victim · 30′ range = 1″ battlefield · effective level ${L} · 2 rounds/level (${2*L} rounds) · one-target save -3 beyond 10′; within 10′ no save and magic resistance does not protect · 5 years fuel`),saveType:'sp',saveEffect:'negates',saveMod:-3,lockSaveType:true,lockSaveMod:true,statusEffect:'hold',durationRounds:2*L};
  if(key==='haste')return {...daoudSinglePrismBase(key,'Oriental Emerald',`Haste · one victim · 30′ range = 1″ battlefield · effective level ${L} · ${3+L} rounds · no save · 5 years fuel`),saveType:'none',saveEffect:'none',lockSaveType:true,statusEffect:'haste',durationRounds:3+L};
  if(key==='colorSpray')return {...daoudSinglePrismBase(key,'Diamond',`Color Spray · one victim · 30′ range = 1″ battlefield · effective level ${L} · PHB level/HD outcome and special save remain spell-specific · within 10′ the artifact allows no save/MR · 5 years fuel`),saveType:'none',saveEffect:'none',lockSaveType:true,specialResolver:'colorSpray'};
  if(key==='fear')return {...daoudSinglePrismBase(key,'Sapphire',`Fear · one victim · 30′ range = 1″ battlefield · effective level ${L} · save negates beyond 10′; within 10′ no save/MR · panic begins next round and lasts ${L} rounds · 5 years fuel`),saveType:'sp',saveEffect:'negates',saveMod:0,lockSaveType:true,lockSaveMod:true,statusEffect:'fear',onsetRounds:1,durationRounds:L};
  if(key==='emotionRage')return {...daoudSinglePrismBase(key,'Oriental Amethyst',`Emotion (Rage) · one victim · 30′ range = 1″ battlefield · effective level ${L} · save negates beyond 10′; within 10′ no save/MR · rage modifiers/concentration remain spell-specific · 5 years fuel`),saveType:'sp',saveEffect:'negates',saveMod:0,lockSaveType:true,lockSaveMod:true,specialResolver:'emotionRage'};
  if(key==='flameStrike')return {...daoudSinglePrismBase(key,'Jacinth',`Flame Strike · one victim · 30′ range = 1″ battlefield · effective level ${L} · 6d8 fire · save for half beyond 10′; within 10′ no save/MR · 5 years fuel`),saveType:'sp',saveEffect:'half',saveMod:0,lockSaveType:true,lockSaveMod:true,damageExpr:'6d8',damageTag:'fire'};
  return null;
}

function sourceSaveRule(preset={},rangeUsed=null,requestedSaveType=null) {
  const threshold=Number(preset?.noSaveWithinIn),range=Number(rangeUsed),base=String(requestedSaveType??preset?.saveType??'none');
  const close=Number.isFinite(threshold)&&threshold>0&&Number.isFinite(range)&&range<=threshold+1e-9;
  const mrThreshold=Number(preset?.ignoreMagicResistanceWithinIn),ignoreMagicResistance=Number.isFinite(mrThreshold)&&mrThreshold>0&&Number.isFinite(range)&&range<=mrThreshold+1e-9;
  return {
    saveType:close?'none':base,
    closeRangeNoSave:close,
    ignoreMagicResistance,
    thresholdIn:Number.isFinite(threshold)?threshold:null,
    rangeUsed:Number.isFinite(range)?range:null,
    detail:close?`within ${preset?.noSaveWithinFeet??10}′: no saving throw${ignoreMagicResistance?' and magic resistance does not protect':''}`:''
  };
}

export const BattlesystemSpells = Object.freeze({
  DAOUD_LANTHORN,
  textKey,
  entryText,
  namedSpellKey,
  isDaoudLanthorn,
  daoudFunctionKey,
  itemEffectiveLevel,
  itemResourceCost,
  sourcePreset,
  sourceSaveRule
});

// @graycloak/battlesystem-engine magic-movement.js v0.1.0 - 2026-08-27
// Pure BATTLESYSTEM §14.13 movement-magic vocabulary and timing contract.
// Hosts own spell preparation/expenditure, battlefield geometry/state mutation,
// normal AD&D/D&D spell-specific movement resolution, UI, logs, and referee rulings.
//
// BATTLESYSTEM §14.13 says movement spells use normal AD&D/D&D rules, but adds
// one hard timing override: movement spells, including Teleport when it is an
// innate ability, must always be used in the Missile and Magic Phase.

const MOVEMENT_NAMES = Object.freeze([
  'Astral Spell','Travel','Wind Walk',
  'Plant Door','Pass Plant','Transport via Plant','Transport through Plants','Chariot of Sustarre',
  'Spider Climb','Jump','Levitate','Fly','Dimension Door','Passwall','Teleport','Phase Door'
]);

function textKey(value='') {
  return String(value||'').toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9]+/g,' ').trim();
}

const MOVEMENT_KEY_TO_NAME = Object.freeze(Object.fromEntries(MOVEMENT_NAMES.map(name=>[textKey(name),name])));
const MOVEMENT_ALIASES = Object.freeze({
  'transport via plants':'Transport via Plant',
  'transport through plant':'Transport through Plants'
});

function entryTexts(entry={}) {
  return [entry?.functionName,entry?.name,entry?.sourceName].map(textKey).filter(Boolean);
}

function movementName(entry={},opts={}) {
  const texts=entryTexts(entry);
  for(const t of texts){if(MOVEMENT_KEY_TO_NAME[t])return MOVEMENT_KEY_TO_NAME[t];if(MOVEMENT_ALIASES[t])return MOVEMENT_ALIASES[t];}
  // Item/spell-like function labels may contain the canonical spell name as a
  // complete normalized phrase. Notes are deliberately ignored so commentary
  // such as "teleport later" cannot silently reclassify an unrelated spell.
  const keys=[...Object.keys(MOVEMENT_KEY_TO_NAME),...Object.keys(MOVEMENT_ALIASES)].sort((a,b)=>b.length-a.length);
  for(const t of texts)for(const key of keys)if((` ${t} `).includes(` ${key} `))return MOVEMENT_KEY_TO_NAME[key]||MOVEMENT_ALIASES[key];
  return null;
}

function movementProfile(entry={},opts={}) {
  const name=movementName(entry,opts);if(!name)return null;
  return Object.freeze({
    movementMagic:true,
    movementKey:textKey(name).replace(/ /g,'-'),
    movementName:name,
    sourceSection:'14.13',
    requiredPhase:'missileMagic',
    passThroughFire:false,
    automation:'referee',
    executionResolver:'movement',
    label:`${name} · movement magic [14.13] · normal AD&D/D&D spell rules · Missile & Magic Phase only`
  });
}

function timingState(entryOrProfile={},opts={}) {
  const profile=entryOrProfile?.movementMagic?entryOrProfile:movementProfile(entryOrProfile,opts);
  if(!profile)return{applies:false,ok:true,requiredPhase:null};
  const liveBattle=opts.liveBattle===true,phaseId=String(opts.phaseId||'');
  if(!liveBattle)return{applies:true,ok:true,requiredPhase:'missileMagic',reason:'pre-battle/setup timing is referee-managed'};
  if(phaseId!=='missileMagic')return{applies:true,ok:false,requiredPhase:'missileMagic',reason:'movement magic must always be used in the Missile & Magic Phase [14.13]'};
  return{applies:true,ok:true,requiredPhase:'missileMagic'};
}

export const BattlesystemMagicMovement = Object.freeze({
  names:MOVEMENT_NAMES,
  textKey,
  movementName,
  movementProfile,
  timingState
});

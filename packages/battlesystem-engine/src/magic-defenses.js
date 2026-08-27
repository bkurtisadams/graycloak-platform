// @graycloak/battlesystem-engine magic-defenses.js v0.1.0 - 2026-08-27
// Pure BATTLESYSTEM §14.12 defensive-magic vocabulary.
// Hosts own spell preparation/expenditure, battlefield geometry, state mutation,
// AD&D spell-specific resolution, UI, logs, and referee decisions.
//
// BATTLESYSTEM §14.12 says defensive magic otherwise follows normal AD&D/D&D
// rules, may need referee rulings when used offensively, and may be used as
// pass-through fire. Mirror Image receives one explicit BATTLESYSTEM conversion:
// incoming BATTLESYSTEM damage is divided equally among the real figure and its
// current duplicates; every duplicate that takes damage disappears.

const DEFENSE_NAMES = Object.freeze([
  'Blade Barrier','Barrier','Word of Recall',
  'Barkskin','Feign Death','Repel Insects','Anti-Plant Shell','Anti-Animal Shell',
  'Feather Fall','Hold Portal','Shield','Mirror Image','Rope Trick','Blink',
  "Leomund's Tiny Hut",'Fire Shield','Minor Globe of Invulnerability',
  "Bigby's Interposing Hand",'Anti-Magic Shell',"Bigby's Forceful Hand",
  'Globe of Invulnerability','Guards & Wards',"Bigby's Grasping Hand",
  'Duo-Dimension','Statue','Mind Blank',"Serten's Spell Immunity",'Prismatic Sphere',
  'Blur','Prismatic Wall'
]);

function textKey(value='') {
  return String(value||'').toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9]+/g,' ').trim();
}

const DEFENSE_KEY_TO_NAME = Object.freeze(Object.fromEntries(DEFENSE_NAMES.map(name=>[textKey(name),name])));

function entryTexts(entry={}) {
  return [entry?.functionName, entry?.name, entry?.sourceName]
    .map(textKey).filter(Boolean);
}

function defenseName(entry={}, opts={}) {
  const texts=entryTexts(entry);
  for(const t of texts) if(DEFENSE_KEY_TO_NAME[t]) return DEFENSE_KEY_TO_NAME[t];
  // Item functions commonly carry the spell name inside a longer source label.
  // Match whole normalized phrases, longest first, after exact matching.
  const keys=Object.keys(DEFENSE_KEY_TO_NAME).sort((a,b)=>b.length-a.length);
  for(const t of texts) for(const key of keys) if((` ${t} `).includes(` ${key} `)) return DEFENSE_KEY_TO_NAME[key];
  return null;
}

function defenseProfile(entry={}, opts={}) {
  const name=defenseName(entry,opts);if(!name)return null;
  const key=textKey(name).replace(/ /g,'-');
  const base={
    defense:true,
    defenseKey:key,
    defenseName:name,
    sourceSection:'14.12',
    passThroughFire:true,
    refereeWhenOffensive:true,
    automation:'referee',
    executionResolver:'defense',
    label:`${name} · defensive magic [14.12] · normal AD&D/D&D spell rules · pass-through eligible`
  };
  if(name==='Mirror Image')return{
    ...base,
    defenseKey:'mirror-image',
    automation:'partial',
    executionResolver:'mirror-image',
    defaultTarget:'self',
    lockTargetMode:true,
    saveType:'none',
    lockSaveType:true,
    requiresDuplicateCount:true,
    label:'Mirror Image · self · enter duplicates produced by normal AD&D resolution · BATTLESYSTEM damage is divided among real figure + duplicates; damaged duplicates disappear [14.12]'
  };
  return base;
}

function mirrorImageDamage(incomingDamage, duplicates) {
  const incoming=Math.max(0,Number(incomingDamage)||0),images=Math.max(0,Math.floor(Number(duplicates)||0));
  if(!images||incoming<=0)return{incomingDamage:incoming,duplicatesBefore:images,shares:images+1,realDamage:incoming,absorbedDamage:0,duplicatesLost:0,duplicatesAfter:images};
  const shares=images+1,realDamage=incoming/shares,duplicatesLost=images;
  return{incomingDamage:incoming,duplicatesBefore:images,shares,realDamage,absorbedDamage:incoming-realDamage,duplicatesLost,duplicatesAfter:0};
}

export const BattlesystemMagicDefenses = Object.freeze({
  names:DEFENSE_NAMES,
  textKey,
  defenseName,
  defenseProfile,
  mirrorImageDamage
});

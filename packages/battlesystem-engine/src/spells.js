// @graycloak/battlesystem-engine spells.js v0.9.1 - 2026-08-26
// Pure PHB spell catalog/rules vocabulary plus source-backed item-spell adapters.
// Host applications still own battlefield geometry, DOM/UI, saving-throw rolls,
// damage/status application, preparation state, and referee-facing orchestration.
//
// v0.9.1 consolidates canonical named-spell mechanics with source/item overrides.
// Daoud single-prism powers now layer their fixed 3-inch range, one-victim policy,
// fuel, and close-range save/MR exceptions over the same canonical spell presets.
// Ordinary Cleric Flame Strike also gains the shared 6-inch / 1-inch-diameter /
// 6d8 save-half preset. Host special resolvers remain host-owned.
// v0.9.0 adds pure spell execution contracts. The engine now describes resolver
// kind, automation level, caster-class requirement, target policy, save/damage
// payload, timing, and status payload for named spell behavior. Hosts still own
// geometry, rolls, battlefield mutation, logs, and UI. Existing presets remain
// behavior-compatible; the contract layer lets ordinary and item-provided magic
// route through the same rules vocabulary without host-side name-switch drift.
// filler 12
// filler 13
// filler 14
// filler 15
// filler 16
// filler 17
// filler 18
// filler 19
// filler 20
// filler 21
// filler 22
// filler 23
// filler 24
// filler 25
// filler 26
// filler 27
// filler 28
// filler 29
// filler 30
// filler 31
// filler 32
// filler 33
// filler 34
// filler 35
// filler 36
// filler 37
// filler 38
// filler 39
// filler 40
// filler 41
// filler 42
// filler 43
// filler 44
// filler 45
// filler 46
// filler 47
// filler 48
// filler 49
// filler 50
// filler 51
// filler 52
// filler 53
// filler 54
// filler 55
// filler 56
// filler 57
// filler 58
// filler 59
// filler 60
// filler 61
// filler 62
// filler 63
// filler 64
// filler 65
// filler 66
// filler 67
// filler 68
// filler 69
// filler 70
// filler 71
// filler 72
// filler 73
// filler 74
// filler 75
// filler 76
// filler 77
// filler 78
// filler 79
// filler 80
// filler 81
// filler 82
// filler 83
// filler 84
// filler 85
// filler 86
// filler 87
// filler 88
// filler 89
// filler 90
// filler 91
// filler 92
// filler 93
// filler 94
// filler 95
// filler 96
// filler 97
// filler 98
// filler 99
// filler 100
// filler 101
// filler 102
// filler 103
// filler 104
// filler 105
// filler 106
// filler 107
// filler 108
// filler 109
// filler 110
// filler 111
// filler 112
// filler 113
// filler 114
// filler 115
// filler 116
// filler 117
// filler 118
// filler 119
// filler 120
// filler 121
// filler 122
// filler 123
// filler 124
// filler 125
// filler 126
// filler 127
// filler 128
// filler 129
// filler 130
// filler 131
// filler 132
// filler 133
// filler 134
// filler 135
// filler 136
// filler 137
// filler 138
// filler 139
// filler 140
// filler 141
// filler 142
// filler 143
// filler 144
// filler 145
// filler 146
// filler 147
// filler 148
// filler 149
// filler 150
// filler 151
// filler 152
// filler 153
// filler 154
// filler 155
// filler 156
// filler 157
// filler 158
// filler 159
// filler 160
// filler 161
// filler 162
// filler 163
// filler 164
// filler 165
// filler 166
// filler 167
// filler 168
// filler 169
// filler 170
// filler 171
// filler 172
// filler 173
// filler 174
// filler 175
// filler 176
// filler 177
// filler 178
// filler 179
// filler 180
// filler 181
// filler 182
// filler 183
// filler 184
  else {rolls=[rollDie(4,rng)];count=rolls[0]>=3?1:0;}
  return{eligible:true,count,band:b,rolls};
}
function canonicalPresetForKey(key,L,opts={}) {
  L=Math.max(0,Math.round(Number(L)||0));if(!L)return null;
  if(key==='fireball')return{executionResolver:'damage',automation:'full',level:L,rangeIn:10+L,shape:'circle',sourceLength:2,saveType:'sp',damageExpr:`${L}d6`,saveEffect:'half',damageTag:'fire',damageFloor:1,label:`Fireball · caster level ${L} · range ${10+L}″ · 2″ radius · ${L}d6 fire · save vs Spell for half`};
  if(key==='flameStrike')return{executionResolver:'damage',automation:'full',level:L,rangeIn:6,shape:'circle',sourceLength:.5,saveType:'sp',saveEffect:'half',damageExpr:'6d8',damageTag:'fire',damageFloor:1,label:`Flame Strike · caster level ${L} · range 6″ · 1″ diameter × 3″ high column · 6d8 fire · save vs Spell for half`};
  if(key==='haste')return{executionResolver:'speed',automation:'full',level:L,rangeIn:6,shape:'square',sourceLength:4,saveType:'none',saveEffect:'none',damageTag:'normal',statusEffect:'haste',durationRounds:3+L,label:`Haste · caster level ${L} · range 6″ · 4″×4″ area · ${3+L} rounds · up to ${L} creatures; whole-figure coverage [14.7]`};
  if(key==='slow')return{executionResolver:'speed',automation:'full',level:L,rangeIn:9+L,shape:'square',sourceLength:4,saveType:'none',saveEffect:'none',damageTag:'normal',statusEffect:'slow',durationRounds:3+L,label:`Slow · caster level ${L} · range ${9+L}″ · 4″×4″ area · ${3+L} rounds · up to ${L} creatures; half movement/attack rate`};
  if(key==='sleep')return{executionResolver:'sleep',automation:'full',level:L,rangeIn:3+L,shape:'circle',sourceLength:1.5,saveType:'none',saveEffect:'none',damageTag:'normal',statusEffect:'sleep',durationRounds:5*L,label:`Sleep · caster level ${L} · range ${3+L}″ · 3″ diameter · ${5*L} rounds · no save · random creatures by HD`};
  if(key==='holdPerson')return{executionResolver:'hold-person',automation:'partial',level:L,rangeIn:12,shape:'point',saveType:'sp',saveEffect:'negates',damageTag:'normal',statusEffect:'hold',durationRounds:2*L,label:`Hold Person · caster level ${L} · range 12″ · ${2*L} rounds · 1–4 persons; save modifier depends on target count`};
  if(key==='holdMonster')return{executionResolver:'hold-monster',automation:'partial',level:L,rangeIn:L/2,shape:'point',saveType:'sp',saveEffect:'negates',damageTag:'normal',statusEffect:'hold',durationRounds:L,label:`Hold Monster · caster level ${L} · range ${L/2}″ · ${L} rounds · 1–4 monsters; save modifier depends on target count`};
  if(key==='fear')return{executionResolver:'fear',automation:'full',level:L,shape:'cone',sourceLength:6,sourceWidth:3,sourceBaseWidth:.5,saveType:'sp',saveEffect:'negates',damageTag:'normal',statusEffect:'fear',onsetRounds:1,durationRounds:L,label:`Fear · caster level ${L} · caster-origin 6″ cone / 3″ end width / ½″ base · save vs Spell negates · held-item checks immediate · failed figure save makes the unit Rout when the following Game Round begins [14.1/14.9] · magical flight ${L} rounds from onset`};
  if(key==='scare')return{executionResolver:'scare',automation:'full',level:L,rangeIn:1,shape:'point',saveType:'sp',saveEffect:'negates',damageTag:'normal',statusEffect:'stun',label:`Scare · caster level ${L} · range 1″ · one creature under 6 levels/HD · save vs Spell negates · failed save STUNS the unit [14.9] · duration 3d4 rounds`};
  if(key==='detectInvisibility'){
    const bw=Number(opts.battlePathWidthIn),battleWidth=Number.isFinite(bw)&&bw>0?bw:null;
    return{executionResolver:'information',automation:'full',level:L,rangeIn:L,shape:'line',sourceWidth:1,saveType:'none',saveEffect:'none',durationRounds:5*L,defaultTarget:'self',castingTimeText:'2 segments',label:`Detect Invisibility · caster level ${L} · self · range ${L}″ · 1″ AD&D path${battleWidth!=null?` (${battleWidth}″ battlefield width)`:''} · ${5*L} rounds · no save · detects invisible, astral, ethereal, hidden, and out-of-phase creatures in line of sight`};
  }
  if(key==='colorSpray')return{executionResolver:'special',automation:'partial',specialResolver:'colorSpray',level:L,rangeIn:L,shape:'cone',sourceLength:2,sourceWidth:2,sourceBaseWidth:.5,saveType:'none',saveEffect:'none',damageTag:'normal',label:`Color Spray · caster level ${L} · range ${L}″ · ½″ base / 2″ end / 2″ long wedge · 1–6 creatures · level/HD outcome and conditional save remain spell-specific`};
  if(key==='emotionRage')return{executionResolver:'special',automation:'partial',specialResolver:'emotionRage',level:L,rangeIn:L,shape:'square',sourceLength:4,saveType:'sp',saveEffect:'negates',damageTag:'normal',label:`Emotion (Rage) · caster level ${L} · range ${L}″ · 4″×4″ area · save vs Spell negates · rage modifiers and concentration remain spell-specific`};
  return null;
}
function spellPreset(entry={},opts={}) {
  const key=namedSpellKey(entry,opts.notes||''),L=Math.max(0,Math.round(Number(opts.casterLevel)||0)),preset=canonicalPresetForKey(key,L,opts);
  // These ordinary prepared spells still require host special-resolution work.
  if(['holdMonster','colorSpray','emotionRage'].includes(key))return null;
  return preset;
}
function daoudFunctionKey(entry={},notes='') {
  if(!isDaoudLanthorn(entry))return'';
  return namedSpellKey({...entry,kind:'item'},notes);
// filler 207
// filler 208
// filler 209
// filler 210
// filler 211
// filler 212
// filler 213
// filler 214
// filler 215
// filler 216
// filler 217
// filler 218
// filler 219
// filler 220
// filler 221
// filler 222
// filler 223
    effectiveLevel:DAOUD_LANTHORN.effectiveLevel,
    rangeIn:DAOUD_LANTHORN.rangeIn,
    sourceRangeFeet:DAOUD_LANTHORN.rangeFeet,
    defaultTarget:'target',
    shape:'point',
    sourceLength:null,
    sourceWidth:null,
    sourceBaseWidth:null,
    singleCreatureTarget:true,
    lockTargetMode:true,
    lockRange:true,
// filler 232
// filler 233
// filler 234
// filler 235
// filler 236
// filler 237
  };
}
function sourcePreset(entry={},opts={}) {
  const key=daoudFunctionKey(entry,opts.notes||'');
  if(!key)return null;
  const L=DAOUD_LANTHORN.effectiveLevel,canonical=canonicalPresetForKey(key,L,opts)||{};
  if(key==='holdMonster')return{...canonical,...daoudSinglePrismBase(key,'Ruby',`Hold Monster · one victim · 30′ source range = 3″ AD&D/BATTLESYSTEM · effective level ${L} · 1 round/level (${L} rounds) · one-target save -3 beyond 10′; within 10′ / 1″ no save and magic resistance does not protect · 5 years fuel`),saveMod:-3,lockSaveType:true,lockSaveMod:true,automation:'full'};
  if(key==='holdPerson')return{...canonical,...daoudSinglePrismBase(key,'Ruby',`Hold Person · one victim · 30′ source range = 3″ AD&D/BATTLESYSTEM · effective level ${L} · 2 rounds/level (${2*L} rounds) · one-target save -3 beyond 10′; within 10′ / 1″ no save and magic resistance does not protect · 5 years fuel`),saveMod:holdPersonSaveMod(1),lockSaveType:true,lockSaveMod:true,automation:'full'};
  if(key==='haste')return{...canonical,...daoudSinglePrismBase(key,'Oriental Emerald',`Haste · one victim · 30′ source range = 3″ AD&D/BATTLESYSTEM · effective level ${L} · ${3+L} rounds · no save · 5 years fuel`),lockSaveType:true};
  if(key==='colorSpray')return{...canonical,...daoudSinglePrismBase(key,'Diamond',`Color Spray · one victim · 30′ source range = 3″ AD&D/BATTLESYSTEM · effective level ${L} · PHB level/HD outcome and special save remain spell-specific · within 10′ / 1″ the artifact allows no save/MR · 5 years fuel`),lockSaveType:true};
  if(key==='fear')return{...canonical,...daoudSinglePrismBase(key,'Sapphire',`Fear · one victim · 30′ source range = 3″ AD&D/BATTLESYSTEM · effective level ${L} · save negates beyond 10′; within 10′ / 1″ no save/MR · panic begins next round and lasts ${L} rounds · 5 years fuel`),saveMod:0,lockSaveType:true,lockSaveMod:true};
  if(key==='emotionRage')return{...canonical,...daoudSinglePrismBase(key,'Oriental Amethyst',`Emotion (Rage) · one victim · 30′ source range = 3″ AD&D/BATTLESYSTEM · effective level ${L} · save negates beyond 10′; within 10′ / 1″ no save/MR · rage modifiers/concentration remain spell-specific · 5 years fuel`),saveMod:0,lockSaveType:true,lockSaveMod:true};
  if(key==='flameStrike')return{...canonical,...daoudSinglePrismBase(key,'Jacinth',`Flame Strike · one victim · 30′ source range = 3″ AD&D/BATTLESYSTEM · effective level ${L} · 6d8 fire · save for half beyond 10′; within 10′ / 1″ no save/MR · 5 years fuel`),saveMod:0,lockSaveType:true,lockSaveMod:true};
  return null;
}
function resolvedPreset(entry={},opts={}) {
  return sourcePreset(entry,opts)||spellPreset(entry,opts);
}
function sourceSaveRule(preset={},rangeUsed=null,requestedSaveType=null) {
  const threshold=Number(preset?.noSaveWithinIn),range=Number(rangeUsed),base=String(requestedSaveType??preset?.saveType??'none');
  const close=Number.isFinite(threshold)&&threshold>0&&Number.isFinite(range)&&range<=threshold+1e-9;
// filler 256
// filler 257
// filler 258
// filler 259
// filler 260
// filler 261
// filler 262
// filler 263
// filler 264
// filler 265
// filler 266
// filler 267
// filler 268
// filler 269
// filler 270
// filler 271
// filler 272
// filler 273
// filler 274
// filler 275
// filler 276
// filler 277
// filler 278
// filler 279
// filler 280
// filler 281
// filler 282
// filler 283
  itemEffectiveLevel,
  itemResourceCost,
  sourcePreset,
  resolvedPreset,
  sourceSaveRule
});

// @graycloak/battlesystem-engine magic-illusions.js v0.3.0 - 2026-09-25
// Pure BATTLESYSTEM [14.14] illusion recognition and disbelief procedure.
// Hosts own battlefield markers, morale/save rolls, state mutation, logs, and UI.

const ILLUSION_SPELLS = Object.freeze([
  'Hallucinatory Forest',
  'Dancing Lights',
  'Ventriloquism',
  'Audible Glamer',
  'Fools Gold',
  "Leomund's Trap",
  "Nystul's Magic Aura",
  'Phantasmal Force',
  'Hallucinatory Terrain',
  'Massmorph',
  'Distance Distortion',
  'Project Image',
  'Simulacrum',
  'Change Self',
  'Improved Phantasmal Force',
  'Phantasmal Killer',
  'Spectral Force',
  'Shadow Door',
  'Shadow Magic',
  'Demi-Shadow Magic',
  'Permanent Illusion',
  'Programmed Illusion',
  'Veil'
]);

function textKey(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const ILLUSION_BY_KEY = Object.freeze(Object.fromEntries(
  ILLUSION_SPELLS.map(name => [textKey(name), name])
));

function illusionName(entry = {}, notes = '') {
  const values = [entry.functionName, entry.name, entry.spellName]
    .map(textKey)
    .filter(Boolean);
  for (const value of values) if (ILLUSION_BY_KEY[value]) return ILLUSION_BY_KEY[value];
  // A referee-authored spell/item/innate action can opt in without accidentally
  // classifying every note that merely mentions an illusion.
  if (/\[\s*illusion\s*\]/i.test(String(notes || ''))) {
    return String(entry.functionName || entry.name || 'Illusion').trim() || 'Illusion';
  }
  return '';
}

function illusionProfile(entry = {}, opts = {}) {
  const name = illusionName(entry, opts.notes || '');
  if (!name) return null;
  const base = {
    illusionMagic: true,
    illusionName: name,
    executionResolver: 'illusion',
    automation: 'partial',
    requiredPhase: 'missileMagic',
    passThroughFire: false,
    defaultTarget: 'area',
    shape: 'point',
    saveType: 'sp',
    saveEffect: 'negates',
    label: `${name} · illusion [14.14] · Missile & Magic Phase only · disbelief uses Morale then save vs Spell`
  };
  const key = textKey(name);
  const metaClass = String(entry?.phbMeta?.class || entry?.spellClass || '').toLowerCase();
  if (!metaClass) return base;
  const casterLevel = Math.max(1, Math.round(Number(opts.casterLevel) || 1));
  if (key === 'hallucinatory terrain') {
    const illusionist = metaClass === 'illusionist', sourceLength = illusionist ? 4 + casterLevel : casterLevel, rangeIn = illusionist ? 2 + 2 * casterLevel : 2 * casterLevel;
    return {...base,hallucinatoryTerrain:true,sourceClass:metaClass,casterLevel,rangeIn,shape:'square',sourceLength,saveType:'none',concentration:false,movableArea:false,terrainContactEnds:true,dispellable:true,castingTimeText:illusionist?'5 rounds':'1 turn',durationText:'Until dispelled or contacted by an intelligent creature',sensory:['visual'],label:`Hallucinatory Terrain · ${illusionist?'Illusionist 3':'Magic-User 4'} · range ${rangeIn}″ · ${sourceLength}″ × ${sourceLength}″ source square · no save · ends on intelligent contact or Dispel Magic`};
  }
  if (!['phantasmal force','improved phantasmal force','spectral force','permanent illusion'].includes(key)) return base;

  // PHB Phantasmal Force exists as Illusionist 1 and Magic-User 3.  Its listed
  // area is a number of square game-inches, so expose an equal-area square;
  // the host applies BATTLESYSTEM Table 17 to that square's linear side.
  const basic=key==='phantasmal force',improved=key==='improved phantasmal force',spectral=key==='spectral force',permanent=key==='permanent illusion',illusionist=metaClass==='illusionist';
  const sourceAreaSqIn=(basic&&!illusionist?8:4)+casterLevel,rangeIn=permanent?casterLevel:(basic&&!illusionist?8:6)+casterLevel,castingTimeSegments=permanent?6:spectral?3:improved?2:illusionist?1:3,sensory=spectral||permanent?['visual','sound','smell','thermal']:improved?['visual','minor-sound']:['visual'],postConcentrationRounds=spectral?3:improved?2:0;
  return {
    ...base,
    phantasmalForce: true,
    phantasmalFamily:key,
    sourceClass: illusionist ? 'illusionist' : 'magic-user',
    casterLevel,
    rangeIn,
    shape: 'square',
    sourceAreaSqIn,
    sourceLength: Math.sqrt(sourceAreaSqIn),
    concentration:!permanent,minimalConcentration:improved||spectral,concentrationMoveFactor:(improved||spectral)?0.5:0,postConcentrationRounds,permanent,dispellable:permanent,movableArea:!permanent,visualOnly:basic,sensory,
    castingTimeSegments,
    castingTimeText: `${castingTimeSegments} segment${castingTimeSegments === 1 ? '' : 's'}`,
    durationText:permanent?'Permanent · dispellable':`Special · concentration${postConcentrationRounds?` + ${postConcentrationRounds} rounds`:''}`,
    label:`${name} · range ${rangeIn}″ · ${sourceAreaSqIn} square game-inches · ${sensory.join('/')} · ${permanent?'permanent':improved||spectral?`minimal concentration; half move; +${postConcentrationRounds} rounds`:'concentration'}`
  };
}

function timingState(entryOrProfile = {}, { liveBattle = false, phaseId = '' } = {}) {
  const profile = entryOrProfile?.illusionMagic
    ? entryOrProfile
    : illusionProfile(entryOrProfile);
  if (!profile) return { applies: false, ok: true, requiredPhase: null };
  if (!liveBattle) return { applies: true, ok: true, requiredPhase: 'missileMagic' };
  if (phaseId !== 'missileMagic') {
    return {
      applies: true,
      ok: false,
      requiredPhase: 'missileMagic',
      reason: 'illusion magic must be cast during the Missile & Magic Phase [14.14]'
    };
  }
  return { applies: true, ok: true, requiredPhase: 'missileMagic' };
}

function disbeliefMoraleModifier({ missingSensory = false, plausibilityModifier = 0 } = {}) {
  const plausibility = Math.max(-1, Math.min(1, Math.round(Number(plausibilityModifier) || 0)));
  return (missingSensory ? 1 : 0) + plausibility;
}

function disbeliefGate({ individual = false, moralePassed = false, alliedDisbeliefKnown = false } = {}) {
  if (individual) return { maySave: true, moraleRequired: false, reason: '1:1 figure automatically reaches the saving throw [14.14]' };
  if (alliedDisbeliefKnown) return { maySave: true, moraleRequired: false, reason: 'an allied force disbelieved; prior Morale failure may save next Game Round [14.14]' };
  if (moralePassed) return { maySave: true, moraleRequired: true, reason: 'Morale Check passed [14.14]' };
  return { maySave: false, moraleRequired: true, reason: 'Morale Check failed; no saving throw yet [14.14]' };
}

function disbeliefOutcome({ individual = false, moralePassed = false, saveSucceeded = false, alliedDisbeliefKnown = false, round = 0 } = {}) {
  const gate = disbeliefGate({ individual, moralePassed, alliedDisbeliefKnown });
  if (!gate.maySave) return { outcome: 'believes', disbelieved: false, retryRound: Math.max(0, Math.round(Number(round) || 0)) + 1, ...gate };
  return { outcome: saveSucceeded ? 'disbelieved' : 'failed-save', disbelieved: !!saveSucceeded, retryRound: null, ...gate };
}

export const BattlesystemMagicIllusions = Object.freeze({
  spells: ILLUSION_SPELLS,
  textKey,
  illusionName,
  illusionProfile,
  timingState,
  disbeliefMoraleModifier,
  disbeliefGate,
  disbeliefOutcome
});

// adnd-chargen.js v1.0.0 — 2026-07-29
// Player character generation for adnd.graycloak.net. Pure: no DOM, no
// Firestore. Loads the generated OSRIC 3 kernel from
// public/vendor/osric3-rules (emitted by tsconfig.adnd.json, gated by
// rules-ci) and shapes a characters/{charId} document from it. Every
// number comes out of the kernel — nothing is recomputed here.
//
// Exposed as the global ADNDChargen, same classic-script pattern as
// ADNDAuth and ADNDFreehold.

const ADNDChargen = (function(){
  'use strict';

  const KERNEL_URL = './vendor/osric3-rules/index.js';
  const SCHEMA_VERSION = 1;
  const ABILITY_IDS = ['str', 'int', 'wis', 'dex', 'con', 'cha'];
  const METHODS = ['I', 'II', 'III', 'IV'];
  const FIXED_ORDER_METHODS = ['III'];
  const FIGHTER_CLASS_IDS = ['fighter', 'paladin', 'ranger'];

  let _kernel = null;
  let _ready = null;

  function ready(url){
    if (_ready) return _ready;
    _ready = import(url || KERNEL_URL)
      .then(mod => { _kernel = mod; return mod; })
      .catch(err => {
        console.error('[chargen] OSRIC 3 rules kernel did not load:', err);
        _kernel = null;
        return null;
      });
    return _ready;
  }

  function kernel(){ return _kernel; }
  function rulesVersion(){ return _kernel ? _kernel.OSRIC3_RULESET.packageVersion : null; }
  function isArrangeable(method){ return FIXED_ORDER_METHODS.indexOf(method) === -1; }

  function toScores(values){
    const out = {};
    ABILITY_IDS.forEach((id, i) => { out[id] = values[i]; });
    return out;
  }

  function rollSets(method, random){
    if (!_kernel) return [];
    return _kernel.rollAbilitySets(method, random).map(set => ({
      values: set.slice(),
      viable: _kernel.isViableAbilitySet(set),
    }));
  }

  function classOptions(raceId, baseScores){
    if (!_kernel) return [];
    const racial = _kernel.applyRacialAbilityAdjustments(baseScores, raceId);
    return _kernel.SINGLE_CLASS_OPTIONS[raceId].map(classId => {
      const e = _kernel.getSingleClassEligibility(raceId, classId, racial);
      return {
        classId,
        allowed: e.allowed,
        reason: e.reason,
        levelCap: e.levelCap,
        missingMinimums: e.missingMinimums,
      };
    });
  }

  function buildCharacter(input){
    if (!_kernel) return { valid: false, error: 'Rules kernel not loaded.' };

    const k = _kernel;
    const raceId = input.raceId;
    const classId = input.classId;
    const baseScores = input.baseScores;
    const random = input.random;

    const built = k.buildStartingCharacter({
      raceId: raceId,
      classId: classId,
      baseScores: baseScores,
      genderId: input.genderId,
      random: random,
    });
    if (!built.valid) return { valid: false, error: built.error };

    const s = built.finalScores;
    const exceptionalStrength = k.rollPercentileStrength(classId, s.str, random);
    const hitPoints = k.rollStartingHitPoints(classId, s.con, random);
    const startingGold = k.rollStartingGold(classId, random);
    const savingThrows = k.savingThrowsToRecord(k.getSavingThrows(classId, 1));
    const slots = k.getSpellSlots(classId, 1, s.wis);
    const arcane = classId === 'magic-user' || classId === 'illusionist';
    const rogue = classId === 'thief' || classId === 'assassin';

    const doc = {
      schemaVersion: SCHEMA_VERSION,
      rulesVersion: k.OSRIC3_RULESET.packageVersion,
      ownerUid: input.ownerUid,
      campaignId: input.campaignId,
      name: input.name,
      raceId: raceId,
      classId: classId,
      genderId: built.genderId,
      alignment: input.alignment || null,
      level: 1,
      levelTitle: k.getLevelTitle(classId, 1),
      experience: 0,
      experienceToNextLevel: k.getExperienceThreshold(classId, 2),
      experienceBonusPct: k.getClassExperienceBonus(classId, s, 100),
      generationMethod: input.method || null,
      baseScores: baseScores,
      racialScores: built.racialScores,
      abilities: s,
      exceptionalStrength: exceptionalStrength,
      weightAllowance: k.getStrengthWeightAllowance(s.str, exceptionalStrength),
      hitPoints: { current: hitPoints, maximum: hitPoints },
      startingGold: startingGold,
      gold: startingGold,
      armorClass: 10,
      thac0: k.getClassLinearThac0(classId, 1),
      savingThrows: savingThrows,
      age: built.age,
      ageCategory: built.ageCategory,
      ageCategoryName: built.ageCategoryName,
      maximumAge: built.maximumAge,
      height: built.height,
      weight: built.weight,
      secondarySkills: built.secondarySkills.slice(),
      spellSlots: slots || null,
      spells: arcane ? ['Read Magic'] : [],
      spellsPending: arcane,
      thiefSkills: rogue
        ? k.getThiefSkillProfile({ level: 1, dexterity: s.dex, race: raceId }).totals
        : null,
      equipment: [],
      createdAt: null,
      updatedAt: null,
    };

    return { valid: true, doc: doc, hitPointsRolled: hitPoints };
  }

  return {
    SCHEMA_VERSION, ABILITY_IDS, METHODS, FIGHTER_CLASS_IDS,
    ready, kernel, rulesVersion, isArrangeable,
    toScores, rollSets, classOptions, buildCharacter,
  };
})();

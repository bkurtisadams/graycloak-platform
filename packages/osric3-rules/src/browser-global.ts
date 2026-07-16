import {
  OSRIC3_RULESET,
  applyMulticlassExperienceAward,
  awardLegacyCharacterExperience,
  getCharismaDisplayProfile,
  getRuleSourceRecord,
  listRuleSourceRecords,
  getConstitutionDisplayProfile,
  getDexterityDisplayProfile,
  getIntelligenceDisplayProfile,
  getSpellSlots,
  getStrengthCombatProfile,
  getStrengthWeightAllowance,
  getWisdomDisplayProfile,
  splitMulticlassExperienceAward,
} from './index.js';

export const GraycloakOSRIC3 = Object.freeze({
  version: OSRIC3_RULESET.packageVersion,
  getSpellSlots,
  splitMulticlassExperienceAward,
  applyMulticlassExperienceAward,
  awardLegacyCharacterExperience,
  getStrengthCombatProfile,
  getStrengthWeightAllowance,
  getIntelligenceDisplayProfile,
  getWisdomDisplayProfile,
  getDexterityDisplayProfile,
  getConstitutionDisplayProfile,
  getCharismaDisplayProfile,
  getRuleSourceRecord,
  listRuleSourceRecords,
});

Object.assign(globalThis, { GraycloakOSRIC3 });

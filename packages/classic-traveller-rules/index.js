// @graycloak/classic-traveller-rules v0.1.0
// First source-backed Book 1 chargen slice: dice, initial UPP, prior-service
// tables, enlistment/draft, term start, survival, commission, promotion, and
// deterministic state transitions. No host/UI/persistence dependencies.

export {
  createDice,
  createSequenceDice,
  requireDice
} from './src/dice.js';

export {
  CHARACTERISTIC_KEYS,
  encodeCharacteristic,
  formatUPP,
  generateCharacteristics,
  generateUPP
} from './src/characters/upp.js';

export {
  SERVICE_KEYS,
  SERVICES,
  getService,
  serviceForDraftRoll,
  calculateDM
} from './src/careers/services.js';

export {
  CHARGEN_PHASES,
  ChargenStateError,
  createCharacter,
  attemptEnlistment,
  resolveDraft,
  beginTerm,
  resolveSurvival,
  resolveCommission,
  skipCommission,
  resolvePromotion,
  skipPromotion
} from './src/characters/chargen.js';

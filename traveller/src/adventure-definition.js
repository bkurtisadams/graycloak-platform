export const ADVENTURE_DEFINITION_TYPE = 'graycloak-traveller-adventure-definition';
export const CURRENT_ADVENTURE_DEFINITION_SCHEMA_VERSION = 1;

export const ADVENTURE_ACTION_TYPES = Object.freeze([
  'ensure-thread',
  'link-situation',
  'add-clue',
  'set-objective',
  'add-history',
  'ensure-contact',
  'create-follow-up',
  'create-contract',
  'emit-event'
]);

export class AdventureDefinitionValidationError extends Error {
  constructor(errors) {
    const list = Array.isArray(errors) ? errors : [String(errors)];
    super(`invalid Graycloak Traveller adventure definition: ${list.join('; ')}`);
    this.name = 'AdventureDefinitionValidationError';
    this.errors = Object.freeze([...list]);
  }
}

function cloneJson(value) { return JSON.parse(JSON.stringify(value)); }
function plain(value) { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function nonblank(value) { return typeof value === 'string' && value.trim().length > 0; }
function add(errors, condition, message) { if (!condition) errors.push(message); }
function validSystem(value) { return plain(value) && nonblank(value.systemId) && nonblank(value.systemName); }

function validateChoice(choice, errors, path) {
  add(errors, plain(choice), `${path} must be an object`);
  if (!plain(choice)) return;
  add(errors, nonblank(choice.id), `${path}.id must be nonblank`);
  add(errors, nonblank(choice.label), `${path}.label must be nonblank`);
  add(errors, ['skill-check', 'resolve', 'decline'].includes(choice.action), `${path}.action is invalid`);
  if (choice.action === 'skill-check') {
    add(errors, nonblank(choice.skillName), `${path}.skillName is required for skill checks`);
    add(errors, Number.isInteger(choice.target) && choice.target >= 2, `${path}.target must be an integer of 2 or greater`);
  }
}

export function validateAdventureDefinition(definition) {
  const errors = [];
  add(errors, plain(definition), 'definition must be an object');
  if (!plain(definition)) return { valid: false, errors };
  add(errors, definition.documentType === ADVENTURE_DEFINITION_TYPE, `documentType must be ${ADVENTURE_DEFINITION_TYPE}`);
  add(errors, definition.schemaVersion === CURRENT_ADVENTURE_DEFINITION_SCHEMA_VERSION, `schemaVersion must be ${CURRENT_ADVENTURE_DEFINITION_SCHEMA_VERSION}`);

  add(errors, plain(definition.identity), 'identity must be an object');
  if (plain(definition.identity)) {
    add(errors, nonblank(definition.identity.id), 'identity.id must be nonblank');
    add(errors, nonblank(definition.identity.title), 'identity.title must be nonblank');
  }

  add(errors, plain(definition.provenance), 'provenance must be an object');
  if (plain(definition.provenance)) {
    add(errors, nonblank(definition.provenance.setting), 'provenance.setting must be nonblank');
    add(errors, nonblank(definition.provenance.rulesBasis), 'provenance.rulesBasis must be nonblank');
  }

  add(errors, plain(definition.thread), 'thread must be an object');
  if (plain(definition.thread)) {
    add(errors, nonblank(definition.thread.title), 'thread.title must be nonblank');
    add(errors, validSystem(definition.thread.origin), 'thread.origin requires systemId and systemName');
    add(errors, typeof definition.thread.objective === 'string', 'thread.objective must be a string');
  }

  const contactIds = new Set();
  add(errors, Array.isArray(definition.contacts), 'contacts must be an array');
  if (Array.isArray(definition.contacts)) definition.contacts.forEach((contact, index) => {
    const path = `contacts[${index}]`;
    add(errors, plain(contact), `${path} must be an object`);
    if (!plain(contact)) return;
    add(errors, nonblank(contact.id), `${path}.id must be nonblank`);
    add(errors, !contactIds.has(contact.id), `${path}.id must be unique`);
    if (nonblank(contact.id)) contactIds.add(contact.id);
    add(errors, nonblank(contact.name), `${path}.name must be nonblank`);
    add(errors, validSystem(contact.homeSystem), `${path}.homeSystem requires systemId and systemName`);
  });

  const sceneIds = new Set();
  add(errors, Array.isArray(definition.scenes), 'scenes must be an array');
  if (Array.isArray(definition.scenes)) definition.scenes.forEach((scene, index) => {
    const path = `scenes[${index}]`;
    add(errors, plain(scene), `${path} must be an object`);
    if (!plain(scene)) return;
    add(errors, nonblank(scene.id), `${path}.id must be nonblank`);
    add(errors, !sceneIds.has(scene.id), `${path}.id must be unique`);
    if (nonblank(scene.id)) sceneIds.add(scene.id);
    add(errors, nonblank(scene.title), `${path}.title must be nonblank`);
    add(errors, typeof scene.summary === 'string', `${path}.summary must be a string`);
    add(errors, typeof scene.detail === 'string', `${path}.detail must be a string`);
    add(errors, Array.isArray(scene.choices), `${path}.choices must be an array`);
    if (Array.isArray(scene.choices)) scene.choices.forEach((choice, choiceIndex) => validateChoice(choice, errors, `${path}.choices[${choiceIndex}]`));
    if (scene.actorRef !== undefined && scene.actorRef !== null) add(errors, contactIds.has(scene.actorRef), `${path}.actorRef must reference a contact`);
    if (scene.arrivalSystemId !== undefined && scene.arrivalSystemId !== null) add(errors, nonblank(scene.arrivalSystemId), `${path}.arrivalSystemId must be nonblank or null`);
    if (scene.legacyTitles !== undefined) add(errors, Array.isArray(scene.legacyTitles) && scene.legacyTitles.every(nonblank), `${path}.legacyTitles must be nonblank strings`);
  });

  const contractIds = new Set();
  add(errors, Array.isArray(definition.contracts), 'contracts must be an array');
  if (Array.isArray(definition.contracts)) definition.contracts.forEach((contract, index) => {
    const path = `contracts[${index}]`;
    add(errors, plain(contract), `${path} must be an object`);
    if (!plain(contract)) return;
    add(errors, nonblank(contract.id), `${path}.id must be nonblank`);
    add(errors, !contractIds.has(contract.id), `${path}.id must be unique`);
    if (nonblank(contract.id)) contractIds.add(contract.id);
    add(errors, nonblank(contract.kind), `${path}.kind must be nonblank`);
    add(errors, nonblank(contract.title), `${path}.title must be nonblank`);
    add(errors, validSystem(contract.origin), `${path}.origin requires systemId and systemName`);
    add(errors, validSystem(contract.destination), `${path}.destination requires systemId and systemName`);
    add(errors, Number.isInteger(contract.deadlineDays) && contract.deadlineDays >= 0, `${path}.deadlineDays must be a non-negative integer`);
    add(errors, Number.isInteger(contract.paymentCr) && contract.paymentCr >= 0, `${path}.paymentCr must be a non-negative integer`);
    add(errors, Number.isInteger(contract.cargoTons) && contract.cargoTons >= 0, `${path}.cargoTons must be a non-negative integer`);
    if (contract.issuerContactRef !== undefined && contract.issuerContactRef !== null) add(errors, contactIds.has(contract.issuerContactRef), `${path}.issuerContactRef must reference a contact`);
  });

  const ruleIds = new Set();
  add(errors, Array.isArray(definition.rules), 'rules must be an array');
  if (Array.isArray(definition.rules)) definition.rules.forEach((rule, index) => {
    const path = `rules[${index}]`;
    add(errors, plain(rule), `${path} must be an object`);
    if (!plain(rule)) return;
    add(errors, nonblank(rule.id), `${path}.id must be nonblank`);
    add(errors, !ruleIds.has(rule.id), `${path}.id must be unique`);
    if (nonblank(rule.id)) ruleIds.add(rule.id);
    add(errors, plain(rule.when), `${path}.when must be an object`);
    if (plain(rule.when) && rule.when.sceneRef !== undefined) add(errors, sceneIds.has(rule.when.sceneRef), `${path}.when.sceneRef must reference a scene`);
    add(errors, Array.isArray(rule.actions) && rule.actions.length > 0, `${path}.actions must be a nonempty array`);
    if (Array.isArray(rule.actions)) rule.actions.forEach((action, actionIndex) => {
      const actionPath = `${path}.actions[${actionIndex}]`;
      add(errors, plain(action), `${actionPath} must be an object`);
      if (!plain(action)) return;
      add(errors, ADVENTURE_ACTION_TYPES.includes(action.type), `${actionPath}.type is invalid`);
      if (action.type === 'ensure-contact') add(errors, contactIds.has(action.contactRef), `${actionPath}.contactRef must reference a contact`);
      if (action.type === 'create-follow-up') add(errors, sceneIds.has(action.sceneRef), `${actionPath}.sceneRef must reference a scene`);
      if (action.type === 'create-contract') add(errors, contractIds.has(action.contractRef), `${actionPath}.contractRef must reference a contract`);
      if (action.type === 'add-clue') {
        add(errors, nonblank(action.id), `${actionPath}.id must be nonblank`);
        add(errors, nonblank(action.label), `${actionPath}.label must be nonblank`);
        add(errors, typeof action.text === 'string' || plain(action.textByOutcome), `${actionPath} requires text or textByOutcome`);
      }
      if (action.type === 'set-objective') add(errors, typeof action.text === 'string', `${actionPath}.text must be a string`);
      if (action.type === 'add-history') {
        add(errors, nonblank(action.kind), `${actionPath}.kind must be nonblank`);
        add(errors, nonblank(action.text), `${actionPath}.text must be nonblank`);
      }
      if (action.type === 'emit-event') add(errors, nonblank(action.text), `${actionPath}.text must be nonblank`);
    });
  });

  return { valid: errors.length === 0, errors };
}

export function assertValidAdventureDefinition(definition) {
  const result = validateAdventureDefinition(definition);
  if (!result.valid) throw new AdventureDefinitionValidationError(result.errors);
  return definition;
}

export function importAdventureDefinition(input) {
  let parsed = input;
  if (typeof input === 'string') {
    try { parsed = JSON.parse(input); }
    catch (error) { throw new AdventureDefinitionValidationError(`invalid JSON: ${error.message}`); }
  }
  assertValidAdventureDefinition(parsed);
  return cloneJson(parsed);
}

export function exportAdventureDefinition(definition, { space = 2 } = {}) {
  assertValidAdventureDefinition(definition);
  return JSON.stringify(definition, null, space);
}

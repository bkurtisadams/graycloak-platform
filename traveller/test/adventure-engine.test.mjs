import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ADVENTURE_DEFINITION_TYPE,
  CURRENT_ADVENTURE_DEFINITION_SCHEMA_VERSION,
  importAdventureDefinition,
  exportAdventureDefinition
} from '../src/adventure-definition.js';
import {
  applyAdventureConsequences,
  instantiateAdventureScene
} from '../src/adventure-engine.js';
import {
  createSituationDocument,
  resolveSituationDocument
} from '../src/situation-document.js';

const definition = {
  documentType: ADVENTURE_DEFINITION_TYPE,
  schemaVersion: CURRENT_ADVENTURE_DEFINITION_SCHEMA_VERSION,
  identity: { id: 'user.missing-surveyor', title: 'The Missing Surveyor' },
  provenance: { setting: 'Test Expanse', rulesBasis: 'user-authored-adventure' },
  thread: {
    title: 'The Missing Surveyor',
    origin: { systemId: 'alpha', systemName: 'Alpha' },
    objective: 'Find Dr. Halden.',
    targetSystemId: 'beta',
    targetSystemName: 'Beta',
    historyStart: 'A surveyor failed to return.',
    notes: 'User-authored test adventure.'
  },
  contacts: [],
  scenes: [{
    id: 'empty-office',
    kind: 'arrival-event',
    arrivalSystemId: 'beta',
    legacyTitles: [],
    title: 'The Empty Office',
    summary: 'The survey office is empty.',
    detail: 'A damaged recorder remains on the desk.',
    choices: [{
      id: 'search', label: 'SEARCH / ELECTRONICS', action: 'skill-check',
      skillName: 'Electronics', target: 8, situationalDM: 0,
      successText: 'A route fragment is recovered.', failureText: 'The recorder remains unreadable.', resolutionText: ''
    }],
    notes: ''
  }],
  contracts: [],
  rules: [{
    id: 'search-starts-thread',
    when: { sceneRef: 'empty-office', choiceId: 'search' },
    actions: [
      { type: 'ensure-thread' },
      { type: 'link-situation' },
      { type: 'add-clue', id: 'route-fragment', label: 'ROUTE FRAGMENT', textByOutcome: { success: 'The recorder points to Gamma.', failure: 'Only a damaged departure timestamp survives.' } },
      { type: 'set-objective', text: 'Trace the recorder route.', targetSystemId: 'gamma', targetSystemName: 'Gamma' },
      { type: 'emit-event', text: 'USER ADVENTURE / route clue recorded' }
    ]
  }]
};

const campaign = {
  identity: { id: 'campaign-user-adventure' },
  time: { year: 4800, dayOfYear: 200 }
};

test('Adventure Definition v1 is portable JSON data rather than executable campaign code', () => {
  const roundTrip = importAdventureDefinition(exportAdventureDefinition(definition));
  assert.deepEqual(roundTrip, definition);
  assert.equal(roundTrip.provenance.setting, 'Test Expanse');
});

test('generic adventure engine resolves an arbitrary user-authored thread without Sea of Suns knowledge', () => {
  const imported = importAdventureDefinition(definition);
  const offer = instantiateAdventureScene({
    definition: imported,
    sceneRef: 'empty-office',
    eventKey: 'campaign-user-adventure|beta|200-4800|empty-office',
    location: { systemId: 'beta', systemName: 'Beta' },
    createdDate: { year: 4800, dayOfYear: 200 },
    kind: 'arrival-event'
  });
  let situation = createSituationDocument(offer);
  situation = resolveSituationDocument(situation, {
    date: { year: 4800, dayOfYear: 200 },
    choiceId: 'search',
    success: true,
    roll: { dice: [4, 3], total: 8 },
    notes: 'Test resolution.'
  });

  const result = applyAdventureConsequences({
    definitions: [imported],
    campaign,
    situation
  });

  assert.equal(result.threads.length, 1);
  assert.equal(result.threads[0].identity.title, 'The Missing Surveyor');
  assert.equal(result.threads[0].objective.targetSystemId, 'gamma');
  assert.equal(result.threads[0].clues[0].label, 'ROUTE FRAGMENT');
  assert.equal(result.threads[0].provenance.setting, 'Test Expanse');
  assert.deepEqual(result.events, ['USER ADVENTURE / route clue recorded']);
});

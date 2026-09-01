import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createSituationDocument,
  exportSituationDocument,
  importSituationDocument,
  resolveSituationDocument
} from '../src/situation-document.js';

function sampleSituation() {
  return createSituationDocument({
    eventKey: 'campaign|cinder|106-4800|arrival-situation',
    kind: 'arrival-event',
    title: 'Dead Approach Beacon',
    location: { systemId: 'cinder', systemName: 'Cinder' },
    createdDate: { year: 4800, dayOfYear: 106 },
    summary: 'A beacon is transmitting again.',
    detail: 'The signal uses an obsolete protocol.',
    choices: [
      {
        id: 'investigate', label: 'INVESTIGATE / ELECTRONICS', action: 'skill-check',
        skillName: 'Electronics', target: 8, situationalDM: 0,
        successText: 'Data recovered.', failureText: 'Signal lost.', resolutionText: ''
      },
      {
        id: 'ignore', label: 'IGNORE', action: 'decline', skillName: null, target: null,
        situationalDM: 0, successText: '', failureText: '', resolutionText: 'Ignored.'
      }
    ]
  });
}

test('Situation Document v1 round-trips persistent active adventure state', () => {
  const original = sampleSituation();
  const roundTrip = importSituationDocument(exportSituationDocument(original));
  assert.equal(roundTrip.documentType, 'graycloak-traveller-situation');
  assert.equal(roundTrip.schemaVersion, 1);
  assert.equal(roundTrip.status, 'active');
  assert.equal(roundTrip.choices[0].skillName, 'Electronics');
});

test('Situation Document resolves once and retains its skill-check result', () => {
  const resolved = resolveSituationDocument(sampleSituation(), {
    date: { year: 4800, dayOfYear: 106 },
    choiceId: 'investigate',
    success: true,
    roll: { roll: 7, dm: 1, total: 8, target: 8 },
    notes: 'Data recovered.'
  });
  assert.equal(resolved.status, 'resolved');
  assert.equal(resolved.resolution.success, true);
  assert.equal(resolved.resolution.roll.total, 8);
  assert.deepEqual(resolved.timing.resolvedDate, { year: 4800, dayOfYear: 106 });
  assert.throws(() => resolveSituationDocument(resolved, { date: { year: 4800, dayOfYear: 106 } }), /only active situations/);
});

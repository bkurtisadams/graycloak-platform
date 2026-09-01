import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createContractDocument,
  completeContractDocument,
  failContractDocument,
  importContractDocument,
  isContractOverdue,
  reconcileContractDeadlines
} from '../src/contract-document.js';

const offer = {
  offerId: 'board:1:priority-courier:aster',
  kind: 'priority-courier',
  title: 'Priority Courier Packet',
  rulesBasis: 'sea-of-suns-original',
  setting: 'Sea of Suns',
  issuerName: 'Calder Dispatch Office',
  issuerType: 'government',
  originSystemId: 'calder',
  originSystemName: 'Calder',
  destinationSystemId: 'aster',
  destinationSystemName: 'Aster',
  paymentCr: 15000,
  deadlineDays: 14,
  cargoTons: 0,
  exclusiveShip: false,
  requirementsDescription: 'Sealed packet.',
  notes: ''
};

test('accepted Contract Document carries stable route, payment, deadline, character, and ship state', () => {
  const contract = createContractDocument(offer, {
    acceptedByCharacterId: 'char-hawkeye',
    acceptedShipId: 'ship-marisol',
    acceptedDate: { year: 4800, dayOfYear: 8 }
  });
  const restored = importContractDocument(JSON.stringify(contract));
  assert.equal(restored.documentType, 'graycloak-traveller-contract');
  assert.equal(restored.schemaVersion, 1);
  assert.equal(restored.status, 'accepted');
  assert.equal(restored.destination.systemId, 'aster');
  assert.equal(restored.economics.paymentCr, 15000);
  assert.deepEqual(restored.timing.deadlineDate, { year: 4800, dayOfYear: 22 });
  assert.equal(restored.assigned.shipId, 'ship-marisol');
});

test('contract overdue check and completion/failure states are deterministic', () => {
  const contract = createContractDocument(offer, {
    acceptedByCharacterId: 'char-hawkeye', acceptedShipId: 'ship-marisol',
    acceptedDate: { year: 4800, dayOfYear: 8 }
  });
  assert.equal(isContractOverdue(contract, { year: 4800, dayOfYear: 22 }), false);
  assert.equal(isContractOverdue(contract, { year: 4800, dayOfYear: 23 }), true);

  const completed = completeContractDocument(contract, { date: { year: 4800, dayOfYear: 15 } });
  assert.equal(completed.status, 'completed');
  assert.equal(completed.resolution.paymentCr, 15000);

  const failed = failContractDocument(contract, { date: { year: 4800, dayOfYear: 23 }, notes: 'deadline missed' });
  assert.equal(failed.status, 'failed');
  assert.equal(failed.resolution.paymentCr, 0);
});


test('deadline reconciliation fails accepted contracts once campaign time passes the deadline', () => {
  const contract = createContractDocument(offer, {
    acceptedByCharacterId: 'char-hawkeye', acceptedShipId: 'ship-marisol',
    acceptedDate: { year: 4800, dayOfYear: 8 }
  });
  const result = reconcileContractDeadlines([contract], { year: 4800, dayOfYear: 30 });
  assert.equal(result.failed.length, 1);
  assert.equal(result.contracts[0].status, 'failed');
  assert.deepEqual(result.contracts[0].resolution.date, { year: 4800, dayOfYear: 30 });
});

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getRuleSourceRecord,
  listRuleSourceRecords,
} from '../dist/index.js';

test('source catalog exposes stable module-level audit hooks', () => {
  assert.deepEqual(getRuleSourceRecord('legacy-character-xp'), {
    id: 'legacy-character-xp',
    module: 'legacy-character-xp',
    ruleset: 'legacy-adnd-1e',
    section: 'GCC character XP field adapter',
    auditStatus: 'legacy-import',
  });
  assert.ok(listRuleSourceRecords().length >= 10);
  assert.equal(getRuleSourceRecord('prime-requisite-xp').auditStatus, 'legacy-import');
  assert.equal(listRuleSourceRecords('verified-osric3').length, 1); // thief-skills, OSRIC 3.0 p.68
});

test('verified source records can never omit book and page metadata', () => {
  for (const record of listRuleSourceRecords()) {
    if (record.auditStatus === 'verified-osric3') {
      assert.ok(record.book);
      assert.ok(Number.isInteger(record.page));
    }
  }
});

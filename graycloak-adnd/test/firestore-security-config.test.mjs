import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const rulesPath = fileURLToPath(new URL('../../gcc/firestore.rules', import.meta.url));
const firebasePath = fileURLToPath(new URL('../firebase.json', import.meta.url));
const rules = fs.readFileSync(rulesPath, 'utf8');
const firebaseConfig = JSON.parse(fs.readFileSync(firebasePath, 'utf8'));

test('graycloak-adnd Firebase config points at the shared canonical Firestore rules', () => {
  assert.equal(firebaseConfig.firestore?.rules, '../gcc/firestore.rules');
});

test('campaign client updates cannot change world authority fields', () => {
  assert.match(rules, /campaignAuthorityFieldsUnchanged\(\)/);
  assert.match(rules, /hasAny\(\['worldTick', 'worldRevision'\]\)/);
});

test('character client updates cannot change Actor travel authority fields', () => {
  for (const field of [
    'currentLocation', 'runtime', 'movementRate', 'movement',
    'movementProfile', 'travelMovementProfile',
  ]) {
    assert.ok(rules.includes(`'${field}'`), `missing protected Actor field ${field}`);
  }
  assert.match(rules, /actorAuthorityFieldsUnchanged\(\)/);
});

test('browser-created characters must begin unbound', () => {
  assert.match(rules, /runtime\.lastResolvedTick == null/);
  assert.match(rules, /runtime\.availableAtTick == null/);
  assert.match(rules, /runtime\.activityId == null/);
});

test('authoritative Activity and GameEvent collections deny client access', () => {
  assert.match(rules, /match \/activities\/\{activityId\}[\s\S]*?allow read, write: if false;/);
  assert.match(rules, /match \/events\/\{eventId\}[\s\S]*?allow read, write: if false;/);
});

test('hosting API rewrite remains before the SPA catch-all', () => {
  const rewrites = firebaseConfig.hosting?.[0]?.rewrites || [];
  assert.equal(rewrites[0]?.source, '/api/commands/begin-travel');
  assert.equal(rewrites[0]?.function?.functionId, 'beginTravel');
  assert.equal(rewrites.at(-1)?.source, '**');
});

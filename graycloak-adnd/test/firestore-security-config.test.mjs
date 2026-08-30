import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const canonicalRulesPath = fileURLToPath(new URL('../../gcc/firestore.rules', import.meta.url));
const localRulesPath = fileURLToPath(new URL('../firestore.rules', import.meta.url));
const firebasePath = fileURLToPath(new URL('../firebase.json', import.meta.url));

const canonicalRules = fs.readFileSync(canonicalRulesPath, 'utf8');
const localRules = fs.readFileSync(localRulesPath, 'utf8');
const firebaseConfig = JSON.parse(fs.readFileSync(firebasePath, 'utf8'));

test('graycloak-adnd Firebase config uses its local Firestore rules mirror', () => {
  assert.equal(firebaseConfig.firestore.rules, 'firestore.rules');
});

test('graycloak-adnd Firestore rules mirror matches GCC canonical rules', () => {
  assert.equal(localRules, canonicalRules);
});

test('campaign client updates cannot change world authority fields', () => {
  assert.match(canonicalRules, /campaignAuthorityFieldsUnchanged\(\)/);
  assert.match(canonicalRules, /hasAny\(\['worldTick', 'worldRevision'\]\)/);
});

test('character client updates cannot change Actor travel authority fields', () => {
  for (const field of [
    'currentLocation', 'runtime', 'movementRate', 'movement',
    'movementProfile', 'travelMovementProfile',
  ]) {
    assert.ok(
      canonicalRules.includes(`'${field}'`),
      `missing protected Actor field ${field}`
    );
  }

  assert.match(canonicalRules, /actorAuthorityFieldsUnchanged\(\)/);
});

test('browser-created characters must begin unbound', () => {
  assert.match(canonicalRules, /runtime\.lastResolvedTick == null/);
  assert.match(canonicalRules, /runtime\.availableAtTick == null/);
  assert.match(canonicalRules, /runtime\.activityId == null/);
});

test('authoritative Activity and GameEvent collections deny client access', () => {
  assert.match(
    canonicalRules,
    /match \/activities\/\{activityId\}[\s\S]*?allow read, write: if false;/
  );

  assert.match(
    canonicalRules,
    /match \/events\/\{eventId\}[\s\S]*?allow read, write: if false;/
  );
});

test('hosting API rewrite remains before the SPA catch-all', () => {
  const rewrites = firebaseConfig.hosting?.[0]?.rewrites || [];

  assert.equal(rewrites[0]?.source, '/api/commands/begin-travel');
  assert.equal(rewrites[0]?.function?.functionId, 'beginTravel');
  assert.equal(rewrites.at(-1)?.source, '**');
});
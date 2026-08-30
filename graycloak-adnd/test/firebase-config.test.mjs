import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const packagePath = fileURLToPath(new URL('../package.json', import.meta.url));
const firebasePath = fileURLToPath(new URL('../firebase.json', import.meta.url));

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

test('Functions package is ESM on Node 22+ with current Firebase server dependencies', () => {
  const pkg = readJson(packagePath);
  assert.equal(pkg.type, 'module');
  assert.equal(pkg.main, 'firebase-functions.mjs');
  assert.equal(pkg.engines.node, '>=22');
  assert.equal(pkg.dependencies['firebase-admin'], '^14.3.0');
  assert.equal(pkg.dependencies['firebase-functions'], '^7.3.2');
});

test('Firebase config deploys graycloak-adnd itself as a Node 22 Functions source', () => {
  const config = readJson(firebasePath);
  assert.equal(config.functions.source, '.');
  assert.equal(config.functions.runtime, 'nodejs22');
  assert.ok(config.functions.ignore.includes('test'));
  assert.ok(config.functions.ignore.includes('docs'));
});

test('Begin Travel Hosting rewrite precedes the SPA catch-all and pins the function revision', () => {
  const config = readJson(firebasePath);
  const hosting = config.hosting.find(entry => entry.target === 'adnd');
  assert.ok(hosting);
  assert.equal(hosting.rewrites[0].source, '/api/commands/begin-travel');
  assert.equal(hosting.rewrites[0].function.functionId, 'beginTravel');
  assert.equal(hosting.rewrites[0].function.region, 'us-central1');
  assert.equal(hosting.rewrites[0].function.pinTag, true);
  assert.deepEqual(hosting.rewrites[1], { source: '**', destination: '/index.html' });
});

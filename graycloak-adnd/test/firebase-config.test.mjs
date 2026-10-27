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
  const codebases = Array.isArray(config.functions) ? config.functions : [config.functions];
  const adnd = codebases.find(entry => entry.source === '.');
  assert.ok(adnd, 'graycloak-adnd codebase present');
  assert.equal(adnd.codebase, 'default');
  assert.equal(adnd.runtime, 'nodejs22');
  assert.ok(adnd.ignore.includes('test'));
  assert.ok(adnd.ignore.includes('docs'));
});

test('command Hosting rewrites precede the SPA catch-all and pin the function revisions', () => {
  const config = readJson(firebasePath);
  const hosting = config.hosting.find(entry => entry.target === 'adnd');
  assert.ok(hosting);
  const expected = [
    ['/api/commands/begin-travel', 'beginTravel'],
    ['/api/commands/resolve-travel', 'resolveTravel'],
    ['/api/commands/rest', 'rest'],
    ['/api/commands/enter-world', 'enterWorld'],
  ];
  expected.forEach(([source, functionId], i) => {
    assert.equal(hosting.rewrites[i].source, source);
    assert.equal(hosting.rewrites[i].function.functionId, functionId);
    assert.equal(hosting.rewrites[i].function.region, 'us-central1');
    assert.equal(hosting.rewrites[i].function.pinTag, true);
  });
  assert.deepEqual(hosting.rewrites[expected.length], { source: '**', destination: '/index.html' });
});

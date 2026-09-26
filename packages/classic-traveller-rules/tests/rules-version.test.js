import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { RULES_VERSION } from '../index.js';

// 0.80.0: the exported version is what a client compares against; a bump to
// package.json without it (or the other way round) would make every client
// report a mismatch that is not there, or miss one that is.
test('0.80.0 RULES_VERSION is the package.json version', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(RULES_VERSION, pkg.version);
  assert.match(RULES_VERSION, /^\d+\.\d+\.\d+$/);
});

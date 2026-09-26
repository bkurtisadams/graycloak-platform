// v0.327.0: the pages say when the server serves a different rules package.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { rulesMismatch, EXPECTED_RULES_VERSION } from '../client/rules-check.js';
import { RULES_VERSION } from '../vendor/classic-traveller-rules/index.js';

test('v0.327.0 the client is stamped for the rules package it ships with', async () => {
  const pkg = JSON.parse(await readFile(new URL('../../packages/classic-traveller-rules/package.json', import.meta.url), 'utf8'));
  assert.equal(EXPECTED_RULES_VERSION, pkg.version, 'run node scripts\\bump.mjs (stamp-client) after a rules bump');
  assert.equal(RULES_VERSION, pkg.version, 'vendor/ is in step (npm test syncs it)');
  const boot = await readFile(new URL('../client/boot.mjs', import.meta.url), 'utf8');
  assert.match(boot, new RegExp(`const EXPECTED_RULES_VERSION = '${pkg.version.replace(/\./g, '\\.')}'`));
});

test('v0.327.0 rulesMismatch: silent when equal, says what the server sent otherwise', () => {
  assert.equal(rulesMismatch('0.80.0', '0.80.0'), null);
  const older = rulesMismatch('0.79.1', '0.80.0');
  assert.match(older.body, /built for classic-traveller-rules 0\.80\.0; the package the server is serving is classic-traveller-rules 0\.79\.1/);
  assert.equal(older.command, 'node scripts\\sync-vendor.mjs --link');
  assert.match(rulesMismatch(null, '0.80.0').body, /an older copy with no version stamp/);
  assert.match(rulesMismatch(null, '0.80.0', { error: new Error('boom') }).body, /could not be loaded \(boom\)/);
});

test('v0.327.0 every page outside boot.mjs runs the check; nothing imports past the rules index', async () => {
  for (const page of ['play.html', 'seat.html', 'player.html', 'enter.html']) {
    const html = await readFile(new URL(`../client/${page}`, import.meta.url), 'utf8');
    assert.match(html, /<script type="module" src="\.\/rules-check\.js\?v=v[\d.]+"><\/script>/, page);
  }
  const deep = [];
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir);
      if (entry.isDirectory()) await walk(url);
      else if (/\.m?js$/.test(entry.name)) {
        const text = await readFile(url, 'utf8');
        for (const match of text.matchAll(/from\s*'([^']*\/vendor\/classic-traveller-rules\/[^']*)'/g)) {
          if (!/\/vendor\/classic-traveller-rules\/index\.js\?v=r[\d.]+$/.test(match[1])) deep.push(`${entry.name}: ${match[1]}`);
        }
      }
    }
  };
  for (const dir of ['client/', 'src/', 'world/']) await walk(new URL(`../${dir}`, import.meta.url));
  assert.deepEqual(deep, [], 'rules imports go through index.js with the rules stamp');
});

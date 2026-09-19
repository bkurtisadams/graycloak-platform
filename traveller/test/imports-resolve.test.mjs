// imports-resolve.test.mjs — every named import in the client resolves to a
// real export, and every stub the page-load test substitutes provides what the
// pages ask of it.
//
// v0.225.1. pages-load.test.mjs already catches a module that will not load,
// but it needs jsdom and is skipped where jsdom is absent — so on a machine
// without it, a missing export ships. This check is plain source reading: no
// jsdom, no browser, nothing to install. It exists because v0.219.0 added
// openPasswordDialog to enter.js and to signin-ui.js but not to the page-load
// test's stub, and the failure surfaced only on a machine that had jsdom.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clientDir = path.join(root, 'client');

// `import { a, b as c } from './x.js?v=1'` -> { from: './x.js', names: ['a','b'] }
function namedImports(source) {
  const found = [];
  const pattern = /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
  for (const match of source.matchAll(pattern)) {
    const names = match[1]
      .split(',')
      .map((part) => part.trim().split(/\s+as\s+/)[0].trim())
      .filter(Boolean);
    found.push({ names, from: match[2].split('?')[0] });
  }
  return found;
}

function exportedNames(source) {
  const names = new Set();
  for (const match of source.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/g)) names.add(match[1]);
  for (const match of source.matchAll(/export\s+(?:const|let|var|class)\s+([A-Za-z0-9_$]+)/g)) names.add(match[1]);
  // `export { a, b as c }` re-exports.
  for (const match of source.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of match[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).at(-1).trim();
      if (name) names.add(name);
    }
  }
  return names;
}

test('every named import in client/ resolves to a real export', async () => {
  const files = (await readdir(clientDir)).filter((name) => name.endsWith('.js'));
  const cache = new Map();
  const read = async (file) => {
    if (!cache.has(file)) cache.set(file, await readFile(file, 'utf8').catch(() => null));
    return cache.get(file);
  };
  const missing = [];
  for (const file of files) {
    const source = await read(path.join(clientDir, file));
    for (const entry of namedImports(source)) {
      if (!entry.from.startsWith('.')) continue;
      const target = path.resolve(clientDir, entry.from);
      const targetSource = await read(target);
      if (targetSource === null) { missing.push(`${file}: cannot find ${entry.from}`); continue; }
      const exported = exportedNames(targetSource);
      for (const name of entry.names) {
        if (!exported.has(name)) missing.push(`${file} imports ${name} from ${entry.from}, which does not export it`);
      }
    }
  }
  assert.deepEqual(missing, []);
});

test('the page-load stubs provide everything the pages import from them', async () => {
  const harness = await readFile(path.join(root, 'test', 'pages-load.test.mjs'), 'utf8');
  const stubs = {
    './auth.js': exportedNames(/const STUB_AUTH = `([\s\S]*?)`;/.exec(harness)?.[1] ?? ''),
    './signin-ui.js': exportedNames(/const STUB_SIGNIN = `([\s\S]*?)`;/.exec(harness)?.[1] ?? '')
  };
  const pages = ['app.js', 'player.js', 'enter.js'];
  const missing = [];
  for (const page of pages) {
    const source = await readFile(path.join(clientDir, page), 'utf8');
    for (const entry of namedImports(source)) {
      const stub = stubs[entry.from];
      if (!stub) continue;
      for (const name of entry.names) {
        if (!stub.has(name)) missing.push(`${page} imports ${name} from ${entry.from}; the stub does not provide it`);
      }
    }
  }
  assert.deepEqual(missing, []);
});

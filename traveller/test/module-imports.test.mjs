import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.resolve(here, '../client');

// v0.103.1: a named import added to the wrong import block resolves to a
// module that does not export it, and the page dies at load with a
// SyntaxError before a single line runs. The suite was entirely green while
// index.html was unopenable, because nothing imported app.js.
async function namedImports(file) {
  const source = await readFile(path.join(clientDir, file), 'utf8');
  return [...source.matchAll(/import\s*\{([^}]*)\}\s*from\s*'(\.[^']+)'/g)].map((match) => ({
    names: match[1].split(',').map((name) => name.trim().split(/\s+as\s+/)[0]).filter(Boolean),
    specifier: match[2]
  }));
}

for (const file of ['app.js', 'player.js', 'enter.js']) {
  test(`every named import in client/${file} is actually exported`, async () => {
    for (const { names, specifier } of await namedImports(file)) {
      const resolved = path.resolve(clientDir, specifier);
      let module;
      try {
        module = await import(`file://${resolved}`);
      } catch (error) {
        assert.fail(`client/${file} imports '${specifier}', which failed to load: ${error.message}`);
      }
      for (const name of names) {
        assert.ok(name in module, `client/${file} imports { ${name} } from '${specifier}', which does not export it`);
      }
    }
  });
}

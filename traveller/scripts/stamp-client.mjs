#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Stamp every module the browser fetches with the client version.
//
// The browser caches each module separately, and nothing was stamped:
// index.html loaded boot.mjs unstamped, boot.mjs imported the vendored rules
// index unstamped, and app.js imported its siblings unstamped. So a browser
// could hold any one of them indefinitely while the rest updated around it,
// and the only symptom is a missing export from a file that is correct on disk.
//
// That cost two separate hunts: a cached ui-model.js, and a cached vendor index
// that survived a full re-extract and several syncs.
//
// A static import cannot carry a template literal, so the query is written into
// the source. This is idempotent — an existing stamp is replaced, not appended
// — so it is safe to run on every version bump, which is when it should run:
//
//   node scripts/stamp-client.mjs
//
// It takes the version from traveller/package.json, so bump that first.
// ---------------------------------------------------------------------------

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const clientDir = path.join(root, 'client');

const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const stamp = `v${pkg.version}`;

// Relative module specifiers the browser fetches: siblings, and the vendored
// rules package. Anything else (a bare specifier, an absolute URL) is left
// alone.
const SPECIFIER = /(from\s*['"])(\.[^'"?]+\.(?:js|mjs))(\?v=[^'"]*)?(['"])/g;
const DYNAMIC = /(import\(\s*['"])(\.[^'"?]+\.(?:js|mjs))(\?v=[^'"]*)?(['"]\s*\))/g;
const SCRIPT_SRC = /(<script[^>]*src=")(\.[^"?]+\.(?:js|mjs))(\?v=[^"]*)?(")/g;

let changed = 0;
const touched = [];

async function stampFile(file, patterns) {
  const full = path.join(clientDir, file);
  const before = await readFile(full, 'utf8');
  let after = before;
  for (const pattern of patterns) {
    after = after.replace(pattern, (whole, lead, specifier, existing, tail) =>
      `${lead}${specifier}?v=${stamp}${tail}`);
  }
  // The constant boot.mjs uses for the modules it imports dynamically.
  after = after.replace(/(export const CLIENT_VERSION = ')[^']*(';)/, `$1${stamp}$2`);
  if (after !== before) {
    await writeFile(full, after, 'utf8');
    changed += 1;
    touched.push(file);
  }
}

for (const file of await readdir(clientDir)) {
  if (file.endsWith('.js') || file.endsWith('.mjs')) await stampFile(file, [SPECIFIER, DYNAMIC]);
  else if (file.endsWith('.html')) await stampFile(file, [SCRIPT_SRC]);
}

console.log(`stamped ${stamp} into ${changed} file${changed === 1 ? '' : 's'}`);
if (touched.length) console.log(`  ${touched.join(', ')}`);

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
// v0.204.0: script tags written without a leading "./" (theme.js, shell-chat.js)
// and stylesheet links were not matched, so every bump left them to be edited
// by hand, along with the mastheads and the version pins in the tests.
const SCRIPT_SRC = /(<script[^>]*src=")(\.[^"?]+\.(?:js|mjs))(\?v=[^"]*)?(")/g;
// A tag that already carries a stamp is restamped whatever its path looks
// like; a bare one (enter.js, player.js) is left bare, as the pins require.
const SCRIPT_RESTAMP = /(<script[^>]*src=")([^"?:]+\.(?:js|mjs))(\?v=[^"]*)(")/g;
const LINK_HREF = /(<link[^>]*rel="stylesheet"[^>]*href=")(\.[^"?]+\.css)(\?v=[^"]*)()(?=")/g;
const MASTHEAD = /(class="subtitle">(?:[A-Z]+ )?)v\d+\.\d+\.\d+/g;

// The version going out, read before anything is rewritten.
const previous = /export const CLIENT_VERSION = '([^']*)'/.exec(await readFile(path.join(clientDir, 'boot.mjs'), 'utf8'))?.[1] ?? null;

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
  if (file.endsWith('.html')) after = after.replace(MASTHEAD, `$1${stamp}`);
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
  else if (file.endsWith('.html')) await stampFile(file, [SCRIPT_SRC, SCRIPT_RESTAMP, LINK_HREF]);
}

// The static pins assert the masthead version literally; move them with it.
// Only the outgoing version on assert lines changes: other versions pinned in
// assertions are deliberate, and version numbers in comments are history.
if (previous && previous !== stamp) {
  const pins = path.join(root, 'test', 'static-client.test.mjs');
  const before = await readFile(pins, 'utf8');
  const from = previous.replace(/\./g, '\\.');
  const to = stamp.replace(/\./g, '\\.');
  const after = before.split('\n').map((line) => (line.includes('assert') ? line.split(from).join(to) : line)).join('\n');
  if (after !== before) { await writeFile(pins, after, 'utf8'); changed += 1; touched.push('../test/static-client.test.mjs'); }
}

console.log(`stamped ${stamp} into ${changed} file${changed === 1 ? '' : 's'}`);
if (touched.length) console.log(`  ${touched.join(', ')}`);

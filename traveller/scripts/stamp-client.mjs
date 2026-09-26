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

// v0.327.0: the rules package carries its own stamp, r<rules version>, on every
// import of it — client/, src/ and world/ alike — so a rules bump reaches the
// browser as a new URL, and every importer names the same one (one module
// instance, one cache entry). The client's own stamp stays on its siblings.
// The version is read from packages/ (the source); vendor/ is the fallback for
// a tree with no packages/ above it.
async function rulesPackageVersion() {
  for (const candidate of [
    path.join(root, '..', 'packages', 'classic-traveller-rules', 'package.json'),
    path.join(root, 'vendor', 'classic-traveller-rules', 'package.json')
  ]) {
    try { return JSON.parse(await readFile(candidate, 'utf8')).version; } catch { /* next */ }
  }
  throw new Error('stamp-client: no classic-traveller-rules package.json in packages/ or vendor/');
}
const rulesVersion = await rulesPackageVersion();
const rulesStamp = `r${rulesVersion}`;
const isRules = (specifier) => specifier.includes('/vendor/classic-traveller-rules/');

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

async function stampFile(file, patterns, { base = clientDir, rulesOnly = false } = {}) {
  const full = path.join(base, file);
  const before = await readFile(full, 'utf8');
  let after = before;
  for (const pattern of patterns) {
    after = after.replace(pattern, (whole, lead, specifier, existing, tail) => {
      if (isRules(specifier)) return `${lead}${specifier}?v=${rulesStamp}${tail}`;
      return rulesOnly ? whole : `${lead}${specifier}?v=${stamp}${tail}`;
    });
  }
  if (file.endsWith('.html')) after = after.replace(MASTHEAD, `$1${stamp}`);
  // The constant boot.mjs uses for the modules it imports dynamically.
  after = after.replace(/(export const CLIENT_VERSION = ')[^']*(';)/, `$1${stamp}$2`);
  // v0.327.0: the rules version this client is built for (boot.mjs,
  // rules-check.js), compared at run time with the package's RULES_VERSION.
  after = after.replace(/((?:export )?const EXPECTED_RULES_VERSION = ')[^']*(';)/g, `$1${rulesVersion}$2`);
  if (after !== before) {
    await writeFile(full, after, 'utf8');
    changed += 1;
    touched.push(path.relative(clientDir, full).split(path.sep).join('/'));
  }
}

for (const file of await readdir(clientDir)) {
  if (file.endsWith('.js') || file.endsWith('.mjs')) await stampFile(file, [SPECIFIER, DYNAMIC]);
  else if (file.endsWith('.html')) await stampFile(file, [SCRIPT_SRC, SCRIPT_RESTAMP, LINK_HREF]);
}

// v0.327.0: src/ and world/ import the rules too, and were never stamped — so
// the browser held an unstamped rules index beside the stamped one. Only the
// rules imports are stamped there; their sibling imports stay bare, as the
// node tests import those modules bare and must get the same instances.
async function modulesUnder(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await modulesUnder(full));
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) out.push(full);
  }
  return out;
}
for (const dir of ['src', 'world']) {
  for (const full of await modulesUnder(path.join(root, dir))) {
    await stampFile(path.relative(clientDir, full), [SPECIFIER, DYNAMIC], { rulesOnly: true });
  }
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

console.log(`stamped ${stamp} (rules ${rulesStamp}) into ${changed} file${changed === 1 ? '' : 's'}`);
if (touched.length) console.log(`  ${touched.join(', ')}`);

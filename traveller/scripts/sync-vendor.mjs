// sync-vendor.mjs — copy the rules package into traveller/vendor/.
//
// v0.72.1. The client, src/ and world/ import the Classic Traveller rules as
// ../vendor/classic-traveller-rules/, so the same files run from the repo, from
// serve-traveller.bat, and from graycloak.net/traveller/ where there is no
// packages/ directory above them. This script is the one place the copy is
// made: `npm test` runs it first, serve-traveller.bat runs it before serving,
// and the Pages workflow runs it before assembling gcc/traveller/. The vendor
// directory is git-ignored; packages/classic-traveller-rules stays the source.

import { cp, rm, mkdir, readFile, symlink, lstat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(here, '../../packages/classic-traveller-rules');
const target = path.resolve(here, '../vendor/classic-traveller-rules');

// v0.114.1: --link points vendor/ at packages/ instead of copying it.
//
// The copy goes stale the moment packages/ changes, and locally that happens
// while a server is already running: the sync runs at startup, files are
// extracted into a live tree, the browser reloads, and the page dies on a
// missing export. That failure has cost six round trips. A junction cannot go
// stale because there is nothing to re-copy.
//
// The copy remains the default and is what CI and the Pages build use: a link
// does not survive being packaged, and graycloak.net/traveller/ has no
// packages/ directory above it.
const link = process.argv.includes('--link');
const pkg = JSON.parse(await readFile(path.join(source, 'package.json'), 'utf8'));
await rm(target, { recursive: true, force: true });

if (link) {
  await mkdir(path.dirname(target), { recursive: true });
  // 'junction' is the Windows type that needs no elevated privileges; it is
  // ignored on other platforms, which take an ordinary directory symlink.
  await symlink(source, target, 'junction');
  const stat = await lstat(target);
  console.log(`linked ${pkg.name}@${pkg.version} -> ${path.relative(process.cwd(), target)}${stat.isSymbolicLink() ? '' : ' (junction)'}`);
  console.log('vendor/ now follows packages/ and cannot go stale. Re-run without --link before packaging.');
} else {
  await mkdir(target, { recursive: true });
  for (const entry of ['index.js', 'package.json', 'src']) {
    await cp(path.join(source, entry), path.join(target, entry), { recursive: true });
  }
  console.log(`vendored ${pkg.name}@${pkg.version} -> ${path.relative(process.cwd(), target)}`);
}

// ---------------------------------------------------------------------------
// v0.145.0: check the client against the package it just vendored.
//
// Syncing copies packages/ into vendor/, so it cannot add an export the source
// package does not have. A patch spanning both trees whose packages/ half was
// not extracted leaves the client importing names the package never gained,
// and the only symptom is a browser SyntaxError that says "run sync-vendor" —
// which does nothing, because the sync is not what is wrong.
//
// Catching it here turns a confusing runtime failure into a clear one, at the
// moment the mismatch is created.
// ---------------------------------------------------------------------------

const exported = new Set();
const indexSource = await readFile(path.join(source, 'index.js'), 'utf8');
// Both forms the package uses: a re-export block, and a bare export list.
for (const block of indexSource.matchAll(/export\s*\{([^}]*)\}/g)) {
  for (const name of block[1].split(',')) {
    const local = name.trim().split(/\s+as\s+/).pop().trim();
    if (local) exported.add(local);
  }
}
for (const declaration of indexSource.matchAll(/export\s+(?:const|function|class)\s+([A-Za-z0-9_$]+)/g)) {
  exported.add(declaration[1]);
}

const clientDir = path.join(here, '..', 'client');
const missing = [];
for (const file of await readdir(clientDir)) {
  if (!file.endsWith('.js') && !file.endsWith('.mjs')) continue;
  const text = await readFile(path.join(clientDir, file), 'utf8');
  for (const statement of text.matchAll(/import\s*\{([^}]*)\}\s*from\s*'([^']*classic-traveller-rules[^']*)'/g)) {
    for (const name of statement[1].split(',')) {
      const wanted = name.trim().split(/\s+as\s+/)[0].trim();
      if (!wanted || wanted.startsWith('//')) continue;
      if (!exported.has(wanted)) missing.push(`${file} imports ${wanted}`);
    }
  }
}

if (missing.length) {
  console.error(`\n${pkg.name}@${pkg.version} does not export everything the client imports:\n`);
  for (const entry of missing) console.error(`  ${entry}`);
  console.error('\nSyncing cannot fix this — the source package does not have these.');
  console.error('A patch spanning packages/ and traveller/ was probably extracted into traveller/ alone.');
  console.error('Re-extract it at the platform root so both halves land, then run this again.\n');
  process.exitCode = 1;
}

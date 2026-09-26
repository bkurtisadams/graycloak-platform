// sync-vendor.mjs — copy the rules package into traveller/vendor/.
//
// v0.72.1. The client, src/ and world/ import the Classic Traveller rules as
// ../vendor/classic-traveller-rules/, so the same files run from the repo, from
// serve-traveller.bat, and from graycloak.net/traveller/ where there is no
// packages/ directory above them. This script is the one place the copy is
// made: `npm test` runs it first, serve-traveller.bat runs it before serving,
// and the Pages workflow runs it before assembling gcc/traveller/. The vendor
// directory is git-ignored; packages/classic-traveller-rules stays the source.
//
// v0.309.0: PACKAGES lists every package vendored this way. The runner
// (classic-traveller-runner) lands as a second entry; nothing else changes.
// The export check below covers every listed package, not only the rules.

import { cp, rm, mkdir, readFile, writeFile, symlink, lstat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const packagesDir = path.resolve(here, '../../packages');
const vendorDir = path.resolve(here, '../vendor');

// Every package the client imports from ../vendor/<name>/. Add the runner here
// when it exists; the copy, the link, and the export check all follow the list.
const PACKAGES = [
  'classic-traveller-rules'
];

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

const RELATIVE_IMPORT = /(from\s*['"])(\.{1,2}\/[^'"?]+\.js)(\?v=[^'"]*)?(['"])/g;
async function jsFilesUnder(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await jsFilesUnder(full));
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) out.push(full);
  }
  return out;
}
async function stampPackageImports(dir, stamp) {
  let count = 0;
  for (const file of await jsFilesUnder(dir)) {
    const before = await readFile(file, 'utf8');
    const after = before.replace(RELATIVE_IMPORT, (whole, lead, specifier, existing, tail) => `${lead}${specifier}?v=${stamp}${tail}`);
    if (after !== before) { await writeFile(file, after, 'utf8'); count += 1; }
  }
  return count;
}
const vendored = [];

for (const name of PACKAGES) {
  const source = path.join(packagesDir, name);
  const target = path.join(vendorDir, name);
  const pkg = JSON.parse(await readFile(path.join(source, 'package.json'), 'utf8'));
  await rm(target, { recursive: true, force: true });

  if (link) {
    await mkdir(path.dirname(target), { recursive: true });
    // 'junction' is the Windows type that needs no elevated privileges; it is
    // ignored on other platforms, which take an ordinary directory symlink.
    await symlink(source, target, 'junction');
    const stat = await lstat(target);
    console.log(`linked ${pkg.name}@${pkg.version} -> ${path.relative(process.cwd(), target)}${stat.isSymbolicLink() ? '' : ' (junction)'}`);
  } else {
    await mkdir(target, { recursive: true });
    for (const entry of ['index.js', 'package.json', 'src']) {
      await cp(path.join(source, entry), path.join(target, entry), { recursive: true });
    }
    // v0.327.0: the copy's own imports carry the package's stamp too. The
    // client asks for index.js?v=r<version>, a new URL on every rules bump,
    // but index.js's imports of ./src/... were bare, so a browser could run a
    // new index over cached old files. Only the copy is stamped: packages/
    // stays bare, and so does a --link junction (which is the source).
    const stamped = await stampPackageImports(target, `r${pkg.version}`);
    if (stamped) console.log(`  stamped r${pkg.version} into ${stamped} vendored module${stamped === 1 ? '' : 's'}`);
    console.log(`vendored ${pkg.name}@${pkg.version} -> ${path.relative(process.cwd(), target)}`);
  }
  vendored.push({ name, source, pkg });
}
if (link) console.log('vendor/ now follows packages/ and cannot go stale. Re-run without --link before packaging.');

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

async function exportsOf(source) {
  const exported = new Set();
  const indexSource = await readFile(path.join(source, 'index.js'), 'utf8');
  // Both forms the packages use: a re-export block, and a bare export list.
  for (const block of indexSource.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const name of block[1].split(',')) {
      const local = name.trim().split(/\s+as\s+/).pop().trim();
      if (local) exported.add(local);
    }
  }
  for (const declaration of indexSource.matchAll(/export\s+(?:const|function|class)\s+([A-Za-z0-9_$]+)/g)) {
    exported.add(declaration[1]);
  }
  return exported;
}

// v0.327.0: src/ and world/ import the rules as well as client/, and a deep
// import (../vendor/<name>/src/...) is refused: it bypasses the index, so the
// check above cannot see it and the browser holds a second copy of the module.
const traveller = path.join(here, '..');
const clientFiles = [];
for (const dir of ['client', 'src', 'world']) {
  for (const full of await jsFilesUnder(path.join(traveller, dir))) clientFiles.push(path.relative(traveller, full));
}
const clientDir = traveller;
let failed = false;
const deepImports = [];

for (const { name, source, pkg } of vendored) {
  const exported = await exportsOf(source);
  const missing = [];
  const importFrom = new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*'([^']*${name}[^']*)'`, 'g');
  for (const file of clientFiles) {
    const text = await readFile(path.join(clientDir, file), 'utf8');
    for (const statement of text.matchAll(importFrom)) {
      for (const entry of statement[1].split(',')) {
        const wanted = entry.trim().split(/\s+as\s+/)[0].trim();
        if (!wanted || wanted.startsWith('//')) continue;
        if (!exported.has(wanted)) missing.push(`${file} imports ${wanted}`);
      }
    }
  }
  const deep = new RegExp(`from\\s*'[^']*/vendor/${name}/src/[^']*'`, 'g');
  for (const file of clientFiles) {
    const text = await readFile(path.join(clientDir, file), 'utf8');
    for (const statement of text.matchAll(deep)) deepImports.push(`${file}: ${statement[0]}`);
  }
  if (missing.length) {
    failed = true;
    console.error(`\n${pkg.name}@${pkg.version} does not export everything the client imports:\n`);
    for (const entry of missing) console.error(`  ${entry}`);
  }
}

if (deepImports.length) {
  console.error('\nImports past the rules index (import from index.js instead; export the name there if it is missing):\n');
  for (const entry of deepImports) console.error(`  ${entry}`);
  process.exitCode = 1;
}

if (failed) {
  console.error('\nSyncing cannot fix this — the source package does not have these.');
  console.error('A patch spanning packages/ and traveller/ was probably extracted into traveller/ alone.');
  console.error('Re-extract it at the platform root so both halves land, then run this again.\n');
  process.exitCode = 1;
}

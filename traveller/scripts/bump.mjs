#!/usr/bin/env node
// ---------------------------------------------------------------------------
// bump.mjs — the whole per-slice ritual as one command.
//
// v0.309.0. Until now every slice meant three steps by hand: edit the version
// in traveller/package.json, run sync-vendor, run stamp-client. Any one of
// them skipped leaves a browser holding a stale module, and the symptom is a
// missing export from a file that is correct on disk. This does all three, in
// order, and refuses to run if the version is not a strict increase.
//
//   node scripts/bump.mjs 0.309.0          bump, copy vendor/, stamp
//   node scripts/bump.mjs 0.309.0 --link   bump, junction vendor/, stamp
//   node scripts/bump.mjs --link           no bump; just re-sync and re-stamp
//
// The commit still carries the platform-wide number by hand; this script only
// knows the client's own version.
// ---------------------------------------------------------------------------

import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const pkgPath = path.join(root, 'package.json');

const args = process.argv.slice(2);
const link = args.includes('--link');
const requested = args.find((arg) => !arg.startsWith('--')) ?? null;

const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
const current = pkg.version;

function parse(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) return null;
  return match.slice(1).map(Number);
}

if (requested !== null) {
  const next = parse(requested);
  const now = parse(current);
  if (!next) {
    console.error(`bump: "${requested}" is not a MAJOR.MINOR.PATCH version`);
    process.exit(1);
  }
  // First differing part decides; equal or lower is refused.
  const decides = now.findIndex((part, index) => next[index] !== part);
  if (decides === -1 || next[decides] < now[decides]) {
    console.error(`bump: ${requested} is not greater than the current ${current}`);
    process.exit(1);
  }
  pkg.version = requested;
  await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  console.log(`version ${current} -> ${requested}`);
} else {
  console.log(`version ${current} (unchanged)`);
}

function run(script, extra = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(here, script), ...extra], { stdio: 'inherit', cwd: root });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${script} exited ${code}`))));
  });
}

try {
  await run('sync-vendor.mjs', link ? ['--link'] : []);
  await run('stamp-client.mjs');
} catch (error) {
  console.error(`bump: ${error.message}`);
  process.exit(1);
}

console.log(`bump complete at ${pkg.version}${link ? ' (vendor linked)' : ''}`);

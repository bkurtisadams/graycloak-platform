// build.mjs — v0.330.1: make the deployable function folder.
//
// The Firebase CLI deploys only folders inside the project directory (the
// one holding firebase.json, graycloak-adnd\), so the Traveller function
// cannot be deployed from traveller\functions itself. This builds a complete
// copy — index.js, package.json and the game in app\ — at
// graycloak-adnd\traveller-functions, which firebase.json names as the
// "traveller" codebase. The folder is output only: it ignores itself in git,
// and every build replaces it. Edit traveller\functions, never the copy.

import { cp, rm, mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const functionsDir = path.resolve(here, '..');
const platform = path.resolve(functionsDir, '..', '..');
const out = path.join(platform, 'graycloak-adnd', 'traveller-functions');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const file of ['index.js', 'package.json']) await cp(path.join(functionsDir, file), path.join(out, file));
await writeFile(path.join(out, '.gitignore'), '# Built by traveller\\functions\\scripts\\build.mjs; not source.\n*\n');
await writeFile(path.join(out, 'README.txt'), 'Built by traveller\\functions\\scripts\\build.mjs (deploy.bat). Do not edit: every build replaces this folder.\n');

const copied = spawnSync(process.execPath, [path.join(here, 'copy-app.mjs'), path.join(out, 'app')], { stdio: 'inherit' });
if (copied.status !== 0) process.exit(copied.status ?? 1);

// The copied game loads under Node (no Firebase needed for this part).
const { applyRemoteRequest, playerMayRun } = await import(pathToFileURL(path.join(out, 'app', 'src', 'remote-request.js')).href);
if (typeof applyRemoteRequest !== 'function' || !playerMayRun('trip:wait')) {
  console.error('the built function does not load the request handler');
  process.exit(1);
}
console.log(`built ${out}`);

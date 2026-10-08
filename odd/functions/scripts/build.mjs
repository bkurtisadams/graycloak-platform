// build.mjs — slice 5, step 2: make the deployable OD&D function folder.
//
// The Firebase CLI deploys only folders beside graycloak-adnd\firebase.json,
// so this builds graycloak-adnd\odd-functions (the "odd" codebase): index.js,
// fight-service.mjs, package.json and the rules package in app\rules. The
// folder is output only and ignores itself in git; edit odd\functions.
// node_modules there is kept between builds and brought up to date with
// npm install, because the CLI loads the functions locally before deploying.

import { cp, rm, mkdir, writeFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const functionsDir = path.resolve(here, '..');
const platform = path.resolve(functionsDir, '..', '..');
const rulesSource = path.join(platform, 'packages', 'odd-chainmail-rules');
const out = path.join(platform, 'graycloak-adnd', 'odd-functions');

await mkdir(out, { recursive: true });
for (const entry of await readdir(out)) if (entry !== 'node_modules') await rm(path.join(out, entry), { recursive: true, force: true });
for (const file of ['index.js', 'fight-service.mjs', 'campaign-service.mjs', 'package.json']) await cp(path.join(functionsDir, file), path.join(out, file));
for (const entry of ['index.js', 'package.json', 'src']) await cp(path.join(rulesSource, entry), path.join(out, 'app', 'rules', entry), { recursive: true });
await writeFile(path.join(out, '.gitignore'), '# Built by odd\\functions\\scripts\\build.mjs; not source.\n*\n');
await writeFile(path.join(out, 'README.txt'), 'Built by odd\\functions\\scripts\\build.mjs (deploy.bat). Do not edit: every build replaces this folder.\n');

const npm = spawnSync('npm', ['install', '--omit=dev', '--no-audit', '--no-fund'], { cwd: out, stdio: 'inherit', shell: process.platform === 'win32' });
if (npm.status !== 0) process.exit(npm.status ?? 1);

const rules = await import(pathToFileURL(path.join(out, 'app', 'rules', 'index.js')).href);
const { createFightService } = await import(pathToFileURL(path.join(out, 'fight-service.mjs')).href);
if (typeof createFightService !== 'function' || typeof rules.session?.applyAs !== 'function') {
  console.error('the built function does not load the fight service');
  process.exit(1);
}
console.log(`built ${out} (rules ${rules.fightStore.RULES_VERSION})`);

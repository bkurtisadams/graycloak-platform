// copy-app.mjs — v0.329.0: put the game's own modules beside the function.
//
// Firebase uploads only this directory, so the engine the function runs is
// copied into app/ with the layout its imports expect (src/ imports
// ../vendor/classic-traveller-rules/ and ../client/commerce-market.js). The
// rules package is copied fresh from packages/ with its imports stamped, as
// sync-vendor does, so a --link junction in traveller/vendor is never
// uploaded as a link. app/ is a build artifact (git-ignored); firebase.json's
// predeploy runs this before every deploy.

import { cp, rm, mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const functionsDir = path.resolve(here, '..');
const traveller = path.resolve(functionsDir, '..');
const rulesSource = path.resolve(traveller, '..', 'packages', 'classic-traveller-rules');
// v0.330.1: the target can be given (build.mjs copies into the deployable
// folder beside graycloak-adnd/firebase.json); functions/app by default.
const app = process.argv[2] ? path.resolve(process.argv[2]) : path.join(functionsDir, 'app');

await rm(app, { recursive: true, force: true });
await mkdir(app, { recursive: true });
for (const dir of ['src', 'world', 'client']) {
  await cp(path.join(traveller, dir), path.join(app, dir), { recursive: true, filter: (source) => !source.endsWith('.html') && !source.endsWith('.css') && !source.endsWith('.svg') });
}
const rules = path.join(app, 'vendor', 'classic-traveller-rules');
await mkdir(rules, { recursive: true });
for (const entry of ['index.js', 'package.json', 'src']) await cp(path.join(rulesSource, entry), path.join(rules, entry), { recursive: true });

// The same stamp sync-vendor puts on the copy's own imports.
const pkg = JSON.parse(await readFile(path.join(rulesSource, 'package.json'), 'utf8'));
const RELATIVE_IMPORT = /(from\s*['"])(\.{1,2}\/[^'"?]+\.js)(\?v=[^'"]*)?(['"])/g;
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (entry.name.endsWith('.js')) {
      const text = await readFile(full, 'utf8');
      const next = text.replace(RELATIVE_IMPORT, (whole, lead, specifier, existing, tail) => `${lead}${specifier}?v=r${pkg.version}${tail}`);
      if (next !== text) await writeFile(full, next, 'utf8');
    }
  }
}
await walk(rules);
const client = JSON.parse(await readFile(path.join(traveller, 'package.json'), 'utf8'));
await writeFile(path.join(app, 'VERSION.json'), `${JSON.stringify({ client: client.version, rules: pkg.version, copiedAt: new Date().toISOString() }, null, 2)}\n`);
console.log(`copied the game (client ${client.version}, rules ${pkg.version}) into ${app}`);

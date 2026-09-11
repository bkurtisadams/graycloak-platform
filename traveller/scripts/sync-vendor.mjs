// sync-vendor.mjs — copy the rules package into traveller/vendor/.
//
// v0.72.1. The client, src/ and world/ import the Classic Traveller rules as
// ../vendor/classic-traveller-rules/, so the same files run from the repo, from
// serve-traveller.bat, and from graycloak.net/traveller/ where there is no
// packages/ directory above them. This script is the one place the copy is
// made: `npm test` runs it first, serve-traveller.bat runs it before serving,
// and the Pages workflow runs it before assembling gcc/traveller/. The vendor
// directory is git-ignored; packages/classic-traveller-rules stays the source.

import { cp, rm, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(here, '../../packages/classic-traveller-rules');
const target = path.resolve(here, '../vendor/classic-traveller-rules');

const pkg = JSON.parse(await readFile(path.join(source, 'package.json'), 'utf8'));
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
for (const entry of ['index.js', 'package.json', 'src']) {
  await cp(path.join(source, entry), path.join(target, entry), { recursive: true });
}
console.log(`vendored ${pkg.name}@${pkg.version} -> ${path.relative(process.cwd(), target)}`);

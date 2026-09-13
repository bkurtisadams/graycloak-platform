// sync-vendor.mjs — copy the rules package into traveller/vendor/.
//
// v0.72.1. The client, src/ and world/ import the Classic Traveller rules as
// ../vendor/classic-traveller-rules/, so the same files run from the repo, from
// serve-traveller.bat, and from graycloak.net/traveller/ where there is no
// packages/ directory above them. This script is the one place the copy is
// made: `npm test` runs it first, serve-traveller.bat runs it before serving,
// and the Pages workflow runs it before assembling gcc/traveller/. The vendor
// directory is git-ignored; packages/classic-traveller-rules stays the source.

import { cp, rm, mkdir, readFile, symlink, lstat } from 'node:fs/promises';
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

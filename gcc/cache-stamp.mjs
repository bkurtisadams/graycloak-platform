#!/usr/bin/env node
// cache-stamp.mjs v1.0.0 — 2026-07-09
// Node port of cache-stamp.py (same behavior, no dependencies).
// Stamp every local <script src> / <link href> include in the HTML files with a
// short content hash (?v=<hash>) so browsers refetch a file only when it changes.
// External URLs (with a scheme) are left alone. Run from the site root before deploy:
//   node cache-stamp.mjs                              # stamp all *.html in this dir
//   node cache-stamp.mjs index.html character.html    # stamp specific files
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';

const INCLUDE_RE = /(<(?:script|link)\b[^>]*?\b(?:src|href)=")([^"?#>]+\.(?:js|css))((?:\?[^"#>]*)?)("[^>]*>)/gi;

function shortHash(path){
  return createHash('md5').update(readFileSync(path)).digest('hex').slice(0, 8);
}

function stampFile(htmlPath){
  const base = dirname(resolve(htmlPath));
  const src = readFileSync(htmlPath, 'utf8');
  let changed = 0;

  const out = src.replace(INCLUDE_RE, (m, pre, asset, _oldq, post) => {
    if (asset.includes('://') || asset.startsWith('//')) return m;
    const target = join(base, asset);
    if (!existsSync(target) || !statSync(target).isFile()) return m;
    changed++;
    return pre + asset + '?v=' + shortHash(target) + post;
  });

  if (out !== src) writeFileSync(htmlPath, out, 'utf8');
  return changed;
}

const args = process.argv.slice(2);
const files = args.length
  ? args
  : readdirSync('.').filter(f => f.toLowerCase().endsWith('.html'));

if (!files.length){
  console.log('cache-stamp: no HTML files found.');
  process.exit(1);
}
let total = 0;
for (const f of files){
  if (!existsSync(f)){ console.log(`skip (not found): ${f}`); continue; }
  const n = stampFile(f);
  total += n;
  console.log(`${f}: stamped ${n} include${n === 1 ? '' : 's'}`);
}
console.log(`done — ${total} include${total === 1 ? '' : 's'} across ${files.length} file${files.length === 1 ? '' : 's'}`);

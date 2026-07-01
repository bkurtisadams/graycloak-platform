#!/usr/bin/env node
// cache-stamp.js v1.0.0 — 2026-07-01
// Stamp every local <script src> / <link href> include in the HTML files with a
// short content hash (?v=<hash>) so browsers refetch a file only when it changes.
// External URLs (with a scheme) are left alone. Run from the site root before deploy:
//   node cache-stamp.js            # stamp all *.html in this dir
//   node cache-stamp.js index.html character.html   # stamp specific files
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const INCLUDE_RE = /(<(?:script|link)\b[^>]*?\b(?:src|href)=")([^"?#>]+\.(?:js|css))((?:\?[^"#>]*)?)("[^>]*>)/gi;

function shortHash(file) {
  return crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex').slice(0, 8);
}

function stampFile(htmlPath) {
  const base = path.dirname(path.resolve(htmlPath));
  const src = fs.readFileSync(htmlPath, 'utf8');
  let count = 0;
  const out = src.replace(INCLUDE_RE, (m, pre, asset, _oldq, post) => {
    if (asset.includes('://') || asset.startsWith('//')) return m;
    const target = path.join(base, asset);
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) return m;
    count++;
    return pre + asset + '?v=' + shortHash(target) + post;
  });
  if (out !== src) fs.writeFileSync(htmlPath, out);
  return count;
}

function main() {
  const args = process.argv.slice(2);
  const files = args.length ? args
    : fs.readdirSync('.').filter(f => f.toLowerCase().endsWith('.html'));
  let totalFiles = 0, totalTags = 0;
  for (const f of files) {
    const n = stampFile(f);
    if (n) { totalFiles++; totalTags += n; console.log(`  ${f}: ${n} include(s) stamped`); }
  }
  console.log(`Stamped ${totalTags} include(s) across ${totalFiles} file(s).`);
}

main();

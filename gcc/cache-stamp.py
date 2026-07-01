#!/usr/bin/env python3
# cache-stamp.py v1.0.0 — 2026-07-01
# Stamp every local <script src> / <link href> include in the HTML files with a
# short content hash (?v=<hash>) so browsers refetch a file only when it changes.
# External URLs (with a scheme) are left alone. Run from the site root before deploy:
#   python3 cache-stamp.py            # stamp all *.html in this dir
#   python3 cache-stamp.py index.html character.html   # stamp specific files
import sys, os, re, hashlib

INCLUDE_RE = re.compile(
    r'(<(?:script|link)\b[^>]*?\b(?:src|href)=")([^"?#>]+\.(?:js|css))((?:\?[^"#>]*)?)("[^>]*>)',
    re.IGNORECASE)

def short_hash(path):
    h = hashlib.md5()
    with open(path, 'rb') as f:
        h.update(f.read())
    return h.hexdigest()[:8]

def stamp_file(html_path):
    base = os.path.dirname(os.path.abspath(html_path))
    src = open(html_path, encoding='utf-8', newline='').read()
    changed = [0]

    def repl(m):
        pre, asset, _oldq, post = m.group(1), m.group(2), m.group(3), m.group(4)
        if '://' in asset or asset.startswith('//'):
            return m.group(0)
        target = os.path.join(base, asset)
        if not os.path.isfile(target):
            return m.group(0)
        newq = '?v=' + short_hash(target)
        changed[0] += 1
        return pre + asset + newq + post

    out = INCLUDE_RE.sub(repl, src)
    if out != src:
        open(html_path, 'w', encoding='utf-8', newline='').write(out)
    return changed[0]

def main(argv):
    files = argv[1:] or [f for f in os.listdir('.') if f.lower().endswith('.html')]
    total_files = 0
    total_tags = 0
    for f in files:
        n = stamp_file(f)
        if n:
            total_files += 1
            total_tags += n
            print(f'  {f}: {n} include(s) stamped')
    print(f'Stamped {total_tags} include(s) across {total_files} file(s).')

if __name__ == '__main__':
    main(sys.argv)

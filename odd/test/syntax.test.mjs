// The inline module scripts of the pages must parse: node --check on each (a cheap catch for a broken edit).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

for (const page of ["index.html", "combat-grid.html", "combat-tester.html"]) {
  test(`${page}: inline scripts parse`, () => {
    const html = readFileSync(new URL(`../${page}`, import.meta.url), "utf8");
    const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).filter((s) => s.trim());
    assert.ok(scripts.length, "no inline script found");
    const dir = mkdtempSync(join(tmpdir(), "odd-syntax-"));
    scripts.forEach((src, i) => { const f = join(dir, `${page}.${i}.mjs`); writeFileSync(f, src); execFileSync(process.execPath, ["--check", f], { stdio: "pipe" }); });
  });
}

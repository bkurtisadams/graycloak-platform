// Runs each module's built-in self-tests (node <module>) under node --test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const src = fileURLToPath(new URL("../src/", import.meta.url));
for (const file of readdirSync(src).filter((f) => f.endsWith(".mjs"))) {
  test(file, () => {
    const out = execFileSync(process.execPath, [join(src, file)], { encoding: "utf8" });
    if (file === "name-generator.mjs") return; // no self-tests in this module
    assert.match(out, /all self-tests passed/, `${file} did not report passing self-tests`);
  });
}

test("index.js loads and exposes the core API", async () => {
  const api = await import("../index.js");
  for (const name of ["toHit", "resolveExchange", "hitDiceFor", "fightingCapabilityFor", "moraleReactionFor", "retainerReactionFor", "encounterReaction", "offerService", "drainLevels", "gazeCheck", "chargeCurve", "areaSpellDice"]) {
    assert.equal(typeof api[name], "function", name);
  }
  assert.equal(typeof api.fightRunner.apply, "function", "fightRunner.apply");
  assert.equal(typeof api.board.isWall, "function", "board.isWall");
});

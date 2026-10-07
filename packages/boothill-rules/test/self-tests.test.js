import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const src = fileURLToPath(new URL("../src/", import.meta.url));
for (const file of readdirSync(src).filter((f) => f.endsWith(".mjs") && f !== "selftest.mjs")) {
  test(file, () => {
    const out = execFileSync(process.execPath, [join(src, file)], { encoding: "utf8" });
    assert.match(out, /all self-tests passed/, `${file} did not report passing self-tests`);
  });
}

test("index.js loads and exposes the core API", async () => {
  const api = await import("../index.js");
  for (const name of ["d100", "rollCharacter", "applyInitialModification", "deriveAbilities", "firstShotBase", "hitBase", "baseNumbers", "weaponProfile", "rangeBand", "isAvailable", "awardSurvival", "rollWound", "condition", "exposedLocations", "netSpeed", "firingOrder", "hitChance", "rollToHit", "fieldOfFire"]) {
    assert.equal(typeof api[name], "function", name);
  }
});

test("RULES_VERSION matches package.json", async () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const { RULES_VERSION } = await import("../index.js");
  assert.equal(RULES_VERSION, pkg.version);
});

test("cert: The Colorado Kid", async () => {
  const { baseNumbers, gunfightsFromExperienceRoll } = await import("../index.js");
  const kid = { speed: 90, gunAccuracy: 64, throwAccuracy: 62, strength: 80, bravery: 55, experience: 30 };
  const b = baseNumbers(kid, gunfightsFromExperienceRoll(kid.experience), ["DAR6"]);
  assert.equal(b.firstShot.DAR6.total, 18);
  assert.equal(b.firearms.total, 48);
});

test("cert: Colorado Kid fires his DAR6 at medium range on a walking target", async () => {
  const { baseNumbers, hitChance, netSpeed } = await import("../index.js");
  const kid = { speed: 90, gunAccuracy: 64, throwAccuracy: 62, strength: 80, bravery: 55, experience: 30 };
  const b = baseNumbers(kid, 0, ["DAR6"]);
  assert.equal(netSpeed(b.firstShot.DAR6.total, { hipshoots: true }).total, 23);
  assert.equal(hitChance(b.firearms.total, { range: "medium", targetMovement: "walking", hipshooting: true }).chance, 33);
});

test.todo("Shotgun/Scatter Gun Effects Table encoded from scan");

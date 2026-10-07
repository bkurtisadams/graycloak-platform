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
  for (const name of ["d100", "rollCharacter", "applyInitialModification", "deriveAbilities", "firstShotBase", "hitBase", "baseNumbers", "weaponProfile", "rangeBand", "isAvailable", "awardSurvival", "rollWound", "condition", "exposedLocations", "netSpeed", "firingOrder", "hitChance", "rollToHit", "fieldOfFire", "startBrawl", "brawlAction", "punchResult", "grappleResult", "firstBlow", "movementOrder", "validateDeclaration", "resolveFiring", "firingQueue", "fireNextGroup"]) {
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

test("cert: Juan Burrito vs Silver Dollar Sam (ERRATA 1: arm lock 2)", async () => {
  const { startBrawl, brawlAction, holdOn, brawlOver, speedAbility } = await import("../index.js");
  let s = startBrawl([
    { id: "juan", strengthScore: 13, speedScore: speedAbility(40).score },
    { id: "sam", strengthScore: 15, speedScore: speedAbility(85).score }
  ]);
  assert.deepEqual(s.order, ["sam", "juan"]);
  const last = () => s.log[s.log.length - 1];

  s = brawlAction(s, "sam", { type: "punch", weapon: "club", raw: 14 });
  assert.equal(last().score, 13); assert.equal(last().result, "glancing"); assert.equal(s.fighters.juan.damage, 2);
  s = brawlAction(s, "juan", { type: "grapple", raw: 18 });
  assert.equal(holdOn(s, "sam").hold, "headLock"); assert.equal(s.fighters.sam.damage, 4); assert.equal(s.fighters.sam.carry, -2);

  s = brawlAction(s, "sam", { type: "grapple", raw: 5 });
  assert.equal(last().score, 3); assert.equal(holdOn(s, "sam"), null);
  s = brawlAction(s, "juan", { type: "punch", raw: 16 });
  assert.equal(last().result, "combination"); assert.equal(s.fighters.sam.damage, 8);

  s = brawlAction(s, "sam", { type: "punch", raw: 7 });
  assert.equal(last().hit, false);
  s = brawlAction(s, "juan", { type: "grapple", raw: 3 });
  assert.equal(last().result, "gouged"); assert.equal(s.fighters.juan.damage, 3);

  s = brawlAction(s, "sam", { type: "punch", weapon: "chair", raw: 15 });
  assert.equal(last().score, 13); assert.equal(s.fighters.juan.damage, 6);
  s = brawlAction(s, "juan", { type: "grapple", raw: 13 });
  assert.equal(last().score, 11); assert.equal(holdOn(s, "sam").hold, "armLockLeft");
  assert.equal(s.fighters.juan.strengthScore - s.fighters.juan.damage, 7, "Juan 7 left after round 4");
  assert.equal(s.fighters.sam.strengthScore - s.fighters.sam.damage, 5, "Sam 5 left after round 4 (book says 6; ERRATA 1)");

  s = brawlAction(s, "sam", { type: "grapple", raw: 17 });
  assert.equal(last().score, 16); assert.equal(last().result, "throw"); assert.equal(holdOn(s, "sam"), null);
  s = brawlAction(s, "juan", { type: "grapple", raw: 3 });
  assert.equal(last().score, 1); assert.equal(last().result, "kneed");
  assert.equal(s.fighters.juan.strengthScore - s.fighters.juan.damage, 1, "Juan down to a single point");

  s = brawlAction(s, "sam", { type: "punch", raw: 15 });
  assert.equal(last().result, "hook");
  assert.ok(s.fighters.juan.out && brawlOver(s), "Juan knocked out");
  assert.equal(s.fighters.sam.strengthScore - s.fighters.sam.damage, 5);
});

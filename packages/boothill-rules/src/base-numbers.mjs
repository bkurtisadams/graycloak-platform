/**
 * BOOT HILL 2e · base numbers (First Shot & "To Hit")
 * First shot base = speed ability score + bravery speed modifier + weapon speed modifier.
 * Hit base = 50 + accuracy ability score + bravery accuracy modifier + experience modifier,
 * once for firearms (gun accuracy) and once for thrown/launched weapons (throwing accuracy).
 */
import { makeChecker, isMain } from "./selftest.mjs";
import { speedAbility, accuracyAbility, braveryAbility, experienceModifier, gunfightsFromExperienceRoll } from "./abilities.mjs";
import { weaponProfile } from "./weapons.mjs";

export function firstShotBase({ speedPct, braveryPct, weaponKey }) {
  const weapon = weaponProfile(weaponKey);
  if (!weapon) throw new Error(`firstShotBase: unknown weapon ${weaponKey}`);
  const speed = speedAbility(speedPct).score;
  const bravery = braveryAbility(braveryPct).speed;
  return { total: speed + bravery + weapon.speedModifier, parts: { speed, bravery, weapon: weapon.speedModifier } };
}

export function hitBase({ accuracyPct, braveryPct, gunfights }) {
  const accuracy = accuracyAbility(accuracyPct).score;
  const bravery = braveryAbility(braveryPct).accuracy;
  const experience = experienceModifier(gunfights);
  const modifier = accuracy + bravery + experience;
  return { total: 50 + modifier, modifier, parts: { accuracy, bravery, experience } };
}

export function baseNumbers(pct, gunfights, weaponKeys = []) {
  return {
    firearms: hitBase({ accuracyPct: pct.gunAccuracy, braveryPct: pct.bravery, gunfights }),
    thrown: hitBase({ accuracyPct: pct.throwAccuracy, braveryPct: pct.bravery, gunfights }),
    firstShot: Object.fromEntries(weaponKeys.map((k) => [k, firstShotBase({ speedPct: pct.speed, braveryPct: pct.bravery, weaponKey: k })]))
  };
}

export function runSelfTests() {
  const { ok, eq, count } = makeChecker();
  const kid = { speed: 90, gunAccuracy: 64, throwAccuracy: 62, strength: 80, bravery: 55, experience: 30 };
  const gunfights = gunfightsFromExperienceRoll(kid.experience);
  eq(gunfights, 0, "Colorado Kid no previous gunfights");
  const b = baseNumbers(kid, gunfights, ["DAR6"]);
  eq(b.firstShot.DAR6.total, 18, "Colorado Kid first shot 18");
  ok(b.firstShot.DAR6.parts.speed === 12 && b.firstShot.DAR6.parts.bravery === 1 && b.firstShot.DAR6.parts.weapon === 5, "first shot parts +12 +1 +5");
  eq(b.firearms.modifier, -2, "Colorado Kid hit rating -2");
  eq(b.firearms.total, 48, "Colorado Kid hit 48%");
  eq(b.thrown.total, 48, "Colorado Kid throwing 62 Fair, also 48%");
  eq(firstShotBase({ speedPct: 90, braveryPct: 55, weaponKey: "SAR6" }).total, 21, "single action Fast +8 → 21");
  eq(firstShotBase({ speedPct: 1, braveryPct: 1, weaponKey: "BR" }).total, -19, "floor case -5 -4 -10");
  eq(hitBase({ accuracyPct: 100, braveryPct: 100, gunfights: 11 }).total, 95, "ceiling case 50+20+15+10");
  let threw = false;
  try { firstShotBase({ speedPct: 50, braveryPct: 50, weaponKey: "XYZ" }); } catch { threw = true; }
  ok(threw, "unknown weapon throws");
  console.log(`base-numbers.mjs — all self-tests passed (${count()} assertions).`);
}

if (isMain(import.meta.url)) runSelfTests();

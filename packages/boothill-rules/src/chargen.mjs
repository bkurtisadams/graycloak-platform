/**
 * BOOT HILL 2e · character generation
 * One d100 per ability; player characters only get Initial Modification on
 * SPEED, both ACCURACY rolls, STRENGTH and BRAVERY (never EXPERIENCE, ERRATA 6).
 * Age = three d10 + 12 (15–42). Starting cash $150.00.
 */
import { makeChecker, isMain } from "./selftest.mjs";
import { d100, rollD10, mulberry32 } from "./dice.mjs";
import { ABILITIES, INITIAL_MOD_ABILITIES, initialModification, gunfightsFromExperienceRoll, deriveAbilities } from "./abilities.mjs";
import { STARTING_CASH } from "./weapons.mjs";

export function applyInitialModification(rolled) {
  const pct = { ...rolled };
  const added = {};
  for (const k of INITIAL_MOD_ABILITIES) {
    added[k] = initialModification(rolled[k]);
    pct[k] = rolled[k] + added[k];
  }
  added.experience = 0;
  return { pct, added };
}

export function rollAge(rng = Math.random) {
  const dice = [rollD10(rng), rollD10(rng), rollD10(rng)];
  return { dice, age: dice[0] + dice[1] + dice[2] + 12 };
}

export function rollCharacter({ isPlayerCharacter = false, rng = Math.random } = {}) {
  const rolled = Object.fromEntries(ABILITIES.map((k) => [k, d100(rng)]));
  const { pct, added } = isPlayerCharacter
    ? applyInitialModification(rolled)
    : { pct: { ...rolled }, added: Object.fromEntries(ABILITIES.map((k) => [k, 0])) };
  const gunfights = gunfightsFromExperienceRoll(pct.experience);
  const { dice: ageDice, age } = rollAge(rng);
  return {
    isPlayerCharacter,
    rolled,
    added,
    pct,
    gunfights,
    age,
    ageDice,
    cash: STARTING_CASH,
    derived: deriveAbilities(pct, gunfights)
  };
}

export function runSelfTests() {
  const { ok, eq, count } = makeChecker();
  const { pct, added } = applyInitialModification({ speed: 85, gunAccuracy: 59, throwAccuracy: 52, strength: 75, bravery: 45, experience: 30 });
  ok(pct.speed === 90 && pct.gunAccuracy === 69 && pct.strength === 80 && pct.bravery === 60, "modified values");
  eq(pct.experience, 30, "experience untouched");
  eq(added.experience, 0, "experience added 0");

  const a = rollCharacter({ isPlayerCharacter: true, rng: mulberry32(42) });
  const b = rollCharacter({ isPlayerCharacter: true, rng: mulberry32(42) });
  eq(JSON.stringify(a), JSON.stringify(b), "seeded chargen repeatable");

  const rng = mulberry32(9);
  for (let i = 0; i < 500; i++) {
    const pc = rollCharacter({ isPlayerCharacter: true, rng });
    for (const k of ABILITIES) ok(pc.pct[k] >= 1 && pc.pct[k] <= 100, `PC ${k} in range`);
    for (const k of ["speed", "gunAccuracy", "throwAccuracy", "strength", "bravery"]) ok(pc.pct[k] >= 26, `PC ${k} lifted to at least 26`);
    eq(pc.pct.experience, pc.rolled.experience, "PC experience unmodified");
    ok(pc.age >= 15 && pc.age <= 42, "age 15–42");
    eq(pc.gunfights, gunfightsFromExperienceRoll(pc.rolled.experience), "gunfights from experience roll");
    const npc = rollCharacter({ rng });
    for (const k of ABILITIES) eq(npc.pct[k], npc.rolled[k], `NPC ${k} unmodified`);
  }
  eq(a.cash, 15000, "starts with $150.00");
  ok(a.derived.speed.label && typeof a.derived.experience.modifier === "number", "derived attached");
  console.log(`chargen.mjs — all self-tests passed (${count()} assertions).`);
}

if (isMain(import.meta.url)) runSelfTests();

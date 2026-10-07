/**
 * BOOT HILL 2e · Hit Determination Chart
 * Chance = hit base + every applicable modifier (all cumulative). Roll d100;
 * at or under the chance hits. One roll per shot.
 */
import { makeChecker, isMain } from "./selftest.mjs";
import { d100, forceRolls } from "./dice.mjs";

export const HIT_MODIFIERS = Object.freeze({
  range: { short: 10, medium: 0, long: -15, extreme: -25 },
  shooter: { walking: -5, crawling: -10, runningDodging: -30, running: -20, trotting: -15, galloping: -25 },
  target: { walking: -5, crawling: -5, running: -10, trotting: -10, galloping: -15, runningDodging: -20 },
  wounds: { "under-half": -5, "half-or-more": -20 },
  atRest: 10,
  shotNumber: { 1: 0, 2: -10, 3: -20 },
  spread: { scatter: 20, shotgun: 10 },
  wrongHand: -10,
  gunArm: { light: -25, serious: -50 },
  twoPistols: -30,
  hipshooting: -10,
  obscured: -10
});

const LABELS = {
  short: "Short range", medium: "Medium range", long: "Long range", extreme: "Extreme range",
  walking: "walking", crawling: "crawling", running: "running", runningDodging: "running and dodging",
  trotting: "trotting", galloping: "galloping",
  "under-half": "Wounds under 50% of STRENGTH", "half-or-more": "Wounds 50% or more of STRENGTH",
  scatter: "Firing a scatter gun", shotgun: "Firing a shotgun"
};

/**
 * conditions: { range, shooterMovement, targetMovement, wounds, atRest, shotNumber,
 * spread ("scatter" | "shotgun", from weaponProfile), wrongHand, gunArm ("light" |
 * "serious", from gunArmPenalty), twoPistols, hipshooting, obscured,
 * brawlCarry (± from the last brawl round, ×10%) }.
 * atRest is not allowed on the turn the weapon is first aimed; the caller checks.
 */
export function hitChance(base, c = {}) {
  const M = HIT_MODIFIERS;
  const parts = [];
  const add = (key, label, value) => { if (value) parts.push({ key, label, value }); };
  if (c.range == null || !(c.range in M.range)) throw new Error(`hitChance: range band required (got ${c.range})`);
  parts.push({ key: "range", label: LABELS[c.range], value: M.range[c.range] });
  if (c.shooterMovement && c.shooterMovement !== "none") {
    if (!(c.shooterMovement in M.shooter)) throw new Error(`hitChance: unknown shooter movement ${c.shooterMovement}`);
    add("shooterMovement", `Shooter ${LABELS[c.shooterMovement]}`, M.shooter[c.shooterMovement]);
  }
  if (c.targetMovement && c.targetMovement !== "none") {
    if (!(c.targetMovement in M.target)) throw new Error(`hitChance: unknown target movement ${c.targetMovement}`);
    add("targetMovement", `Target ${LABELS[c.targetMovement]}`, M.target[c.targetMovement]);
  }
  if (c.wounds && c.wounds !== "none") add("wounds", LABELS[c.wounds], M.wounds[c.wounds]);
  if (c.atRest) add("atRest", "Weapon at rest", M.atRest);
  const n = c.shotNumber ?? 1;
  if (!(n in M.shotNumber)) throw new Error(`hitChance: shot number ${n} (max 3 per turn)`);
  add("shotNumber", n === 2 ? "Second shot this turn" : "Third shot this turn", M.shotNumber[n]);
  if (c.spread) add("spread", LABELS[c.spread], M.spread[c.spread]);
  if (c.wrongHand) add("wrongHand", "Wrong hand", M.wrongHand);
  if (c.gunArm) add("gunArm", c.gunArm === "serious" ? "Serious wound in gun arm" : "Light wound in gun arm", M.gunArm[c.gunArm]);
  if (c.twoPistols) add("twoPistols", "Firing two pistols", M.twoPistols);
  if (c.hipshooting) add("hipshooting", "Hipshooting", M.hipshooting);
  if (c.obscured) add("obscured", "Target obscured", M.obscured);
  if (c.brawlCarry) add("brawlCarry", "Brawl carryover", 10 * c.brawlCarry);
  return { base, parts, chance: base + parts.reduce((s, p) => s + p.value, 0) };
}

export function rollToHit(chance, rng = Math.random) {
  const roll = d100(rng);
  return { roll, chance, hit: roll <= chance };
}

export function runSelfTests() {
  const { ok, eq, count } = makeChecker();
  eq(hitChance(48, { range: "short" }).chance, 58, "Colorado Kid short range 58");
  eq(hitChance(48, { range: "medium" }).chance, 48, "medium 0");
  eq(hitChance(48, { range: "long" }).chance, 33, "long -15");
  eq(hitChance(48, { range: "extreme" }).chance, 23, "extreme -25");
  eq(hitChance(50, { range: "medium", shooterMovement: "runningDodging" }).chance, 20, "shooter running and dodging -30");
  eq(hitChance(50, { range: "medium", shooterMovement: "galloping" }).chance, 25, "shooter galloping -25");
  eq(hitChance(50, { range: "medium", targetMovement: "crawling" }).chance, 45, "target crawling -5");
  eq(hitChance(50, { range: "medium", targetMovement: "trotting" }).chance, 40, "target trotting -10");
  eq(hitChance(50, { range: "medium", targetMovement: "runningDodging" }).chance, 30, "target running and dodging -20");
  eq(hitChance(50, { range: "medium", wounds: "half-or-more" }).chance, 30, "wounds -20");
  eq(hitChance(50, { range: "medium", atRest: true }).chance, 60, "at rest +10");
  eq(hitChance(50, { range: "medium", shotNumber: 2 }).chance, 40, "second shot -10");
  eq(hitChance(50, { range: "medium", shotNumber: 3 }).chance, 30, "third shot -20");
  eq(hitChance(50, { range: "short", spread: "scatter" }).chance, 80, "scatter gun +20");
  eq(hitChance(50, { range: "short", spread: "shotgun" }).chance, 70, "shotgun +10");
  eq(hitChance(50, { range: "medium", gunArm: "serious" }).chance, 0, "serious gun arm -50");
  eq(hitChance(50, { range: "medium", gunArm: "light", wrongHand: true }).chance, 15, "light gun arm -25, wrong hand -10");
  eq(hitChance(50, { range: "medium", twoPistols: true, hipshooting: true, obscured: true }).chance, 0, "two pistols -30, hip -10, obscured -10");
  eq(hitChance(50, { range: "medium", brawlCarry: -2 }).chance, 30, "brawl -2 = -20%");
  eq(hitChance(50, { range: "medium", shooterMovement: "walking", targetMovement: "walking" }).parts.length, 3, "parts itemized");
  let threw = 0;
  for (const bad of [{}, { range: "point-blank" }, { range: "short", shotNumber: 4 }, { range: "short", shooterMovement: "flying" }]) {
    try { hitChance(50, bad); } catch { threw++; }
  }
  eq(threw, 4, "bad conditions throw");
  ok(rollToHit(48, forceRolls([0.4, 0.85])).hit, "48 on 48 hits");
  ok(!rollToHit(48, forceRolls([0.4, 0.95])).hit, "49 on 48 misses");
  ok(!rollToHit(0, forceRolls([0, 0.15])).hit, "chance 0 never hits");
  console.log(`hit.mjs — all self-tests passed (${count()} assertions).`);
}

if (isMain(import.meta.url)) runSelfTests();

/**
 * BOOT HILL 2e · Wound Chart, strength loss, wound effects
 * Two d100 rolls per hit: location, then severity on that location's bands.
 * Light −3 STRENGTH, serious −7, mortal = immediate death.
 * Wound band compares accumulated damage with the unwounded STRENGTH ability
 * score (ERRATA 2). STRENGTH 0 or less from wounds → unconscious and flagged
 * for a GM survival ruling (ERRATA 4). Hard cover: a hit on a covered
 * location is a miss.
 */
import { makeChecker, isMain } from "./selftest.mjs";
import { d100, forceRolls } from "./dice.mjs";

export const WOUND_POINTS = Object.freeze({ light: 3, serious: 7 });

export const WOUND_CHART = Object.freeze([
  { max: 10, location: "leftLeg", label: "Left Leg", light: 40, serious: 100 },
  { max: 20, location: "rightLeg", label: "Right Leg", light: 40, serious: 100 },
  { max: 25, location: "leftArm", label: "Left Arm/Hand", light: 75, serious: 100 },
  { max: 30, location: "rightArm", label: "Right Arm/Hand", light: 75, serious: 100 },
  { max: 40, location: "rightShoulder", label: "Right Shoulder", light: 40, serious: 90 },
  { max: 50, location: "leftShoulder", label: "Left Shoulder", light: 40, serious: 80 },
  { max: 70, location: "abdomen", label: "Abdomen/Groin", light: 40, serious: 80 },
  { max: 85, location: "chest", label: "Chest", light: 20, serious: 60 },
  { max: 100, location: "head", label: "Head", light: 20, serious: 40 }
]);

export const LOCATIONS = Object.freeze(WOUND_CHART.map((r) => r.location));
const clampPct = (n) => Math.min(100, Math.max(1, Math.floor(n)));

export const locationFromRoll = (roll) => WOUND_CHART.find((r) => clampPct(roll) <= r.max);

export function severityFromRoll(location, roll) {
  const row = WOUND_CHART.find((r) => r.location === location);
  if (!row) throw new Error(`severityFromRoll: unknown location ${location}`);
  const s = clampPct(roll);
  if (s <= row.light) return "light";
  if (s <= row.serious) return "serious";
  return "mortal";
}

/**
 * Roll location and severity. Options: location (sharpshooter's called shot,
 * skips the location roll), locationBonus / severityBonus (+5 Crack Shot,
 * +10 Dead Eye), severityModifier (−20 for horses).
 */
export function rollWound({ rng = Math.random, location, locationBonus = 0, severityBonus = 0, severityModifier = 0 } = {}) {
  let locationRoll = null;
  let loc = location;
  if (!loc) {
    locationRoll = d100(rng);
    loc = locationFromRoll(locationRoll + locationBonus).location;
  }
  const severityRoll = d100(rng);
  const severity = severityFromRoll(loc, severityRoll + severityBonus + severityModifier);
  return { locationRoll, location: loc, severityRoll, severity, points: WOUND_POINTS[severity] ?? null };
}

export const sideOf = (handedness) => (handedness === "left" ? "left" : "right");
export const offSide = (handedness) => (sideOf(handedness) === "left" ? "right" : "left");

/** Locations exposed behind hard cover. Gun-side arm, shoulder and leg (ERRATA 10). */
export function exposedLocations(preset, handedness = "right") {
  const g = sideOf(handedness), o = offSide(handedness);
  switch (preset) {
    case "none": return [...LOCATIONS];
    case "pistolOverCover": return ["head", `${g}Arm`, `${g}Shoulder`];
    case "rifleOverCover": return ["head", "leftArm", "rightArm", `${g}Shoulder`];
    case "rifleAroundCorner": return ["head", "leftArm", "rightArm", `${g}Shoulder`, `${g}Leg`];
    default: throw new Error(`exposedLocations: unknown preset ${preset}`);
  }
}

export const coverStopsHit = (location, exposed) => Array.isArray(exposed) && !exposed.includes(location);

export function damageTotal(wounds = [], brawlDamage = 0) {
  return wounds.reduce((sum, w) => sum + (w.severity === "mortal" ? 0 : (w.points ?? WOUND_POINTS[w.severity] ?? 0) - (w.healed ?? 0)), 0) + (brawlDamage || 0);
}

export function woundBand(damage, strengthScore) {
  if (!(damage > 0)) return "none";
  return damage * 2 >= strengthScore ? "half-or-more" : "under-half";
}

/** A wound's special penalty lifts once it is more than 50% healed. */
export const woundActive = (w) => (w.healed ?? 0) * 2 <= (w.points ?? WOUND_POINTS[w.severity] ?? 0);

export function condition({ strengthScore, wounds = [], brawlDamage = 0 }) {
  const dead = wounds.some((w) => w.severity === "mortal");
  const damage = damageTotal(wounds, brawlDamage);
  const woundDamage = damageTotal(wounds, 0);
  const current = strengthScore - damage;
  const out = current <= 0;
  return {
    dead,
    damage,
    currentStrength: current,
    band: woundBand(damage, strengthScore),
    unconscious: !dead && out,
    needsSurvivalRuling: !dead && out && strengthScore - woundDamage <= 0
  };
}

export function gunArmPenalty(wounds = [], handedness = "right") {
  const arm = `${sideOf(handedness)}Arm`;
  const active = wounds.filter((w) => w.location === arm && woundActive(w));
  if (active.some((w) => w.severity === "serious")) return "serious";
  if (active.some((w) => w.severity === "light")) return "light";
  return null;
}

/** Movement limits from wounds (Movement · Wounds). */
export function movementLimits(wounds = []) {
  const active = wounds.filter((w) => w.severity !== "mortal" && woundActive(w));
  const leg = (s) => active.some((w) => /Leg$/.test(w.location) && w.severity === s);
  if (leg("serious")) return { walkOnly: true, factor: 0.5, walkingExempt: false };
  const otherSerious = active.some((w) => !/Leg$/.test(w.location) && w.severity === "serious");
  if (leg("light")) return { walkOnly: false, factor: 0.5, walkingExempt: false };
  if (otherSerious) return { walkOnly: false, factor: 0.5, walkingExempt: true };
  return { walkOnly: false, factor: 1, walkingExempt: false };
}

export function runSelfTests() {
  const { ok, eq, count } = makeChecker();
  let lo = 1;
  for (const r of WOUND_CHART) { eq(locationFromRoll(lo).location, r.location, `location low ${lo}`); eq(locationFromRoll(r.max).location, r.location, `location high ${r.max}`); lo = r.max + 1; }
  eq(lo, 101, "wound chart covers 01-00");
  eq(locationFromRoll(49).location, "leftShoulder", "book example: 49 left shoulder");
  eq(severityFromRoll("leftShoulder", 72), "serious", "book example: 72 serious");
  eq(severityFromRoll("leftLeg", 100), "serious", "legs never mortal");
  eq(severityFromRoll("rightArm", 76), "serious", "arm 76 serious");
  eq(severityFromRoll("rightShoulder", 91), "mortal", "right shoulder 91 mortal");
  eq(severityFromRoll("leftShoulder", 81), "mortal", "left shoulder 81 mortal");
  eq(severityFromRoll("chest", 61), "mortal", "chest 61 mortal");
  eq(severityFromRoll("head", 41), "mortal", "head 41 mortal");
  eq(severityFromRoll("head", 40), "serious", "head 40 serious");
  eq(severityFromRoll("head", 61 - 20), "mortal", "horse head: 61 before −20 is fatal");
  eq(severityFromRoll("head", 60 - 20), "serious", "horse head: 60 before −20 is not");

  const w = rollWound({ rng: forceRolls([0.4, 0.95, 0.7, 0.25]) });
  ok(w.locationRoll === 49 && w.location === "leftShoulder" && w.severityRoll === 72 && w.severity === "serious" && w.points === 7, "rollWound book example");
  const called = rollWound({ rng: forceRolls([0.1, 0.15]), location: "head" });
  ok(called.locationRoll === null && called.location === "head" && called.severityRoll === 11, "called shot skips location roll");
  eq(rollWound({ rng: forceRolls([0.8, 0.45, 0.3, 0.95]), locationBonus: 10 }).location, "head", "Dead Eye +10 pushes 84 to head");

  eq(exposedLocations("pistolOverCover", "right").join(), "head,rightArm,rightShoulder", "pistol over wall, right-handed");
  eq(exposedLocations("pistolOverCover", "left").join(), "head,leftArm,leftShoulder", "pistol over wall, left-handed");
  ok(exposedLocations("rifleAroundCorner").includes("rightLeg") && !exposedLocations("rifleOverCover").includes("rightLeg"), "corner adds a leg");
  ok(coverStopsHit("chest", exposedLocations("pistolOverCover")), "chest behind wall = miss");
  ok(!coverStopsHit("head", exposedLocations("pistolOverCover")), "head over wall = hit");
  ok(!coverStopsHit("chest", undefined), "no cover");

  eq(woundBand(0, 16), "none", "unhurt");
  eq(woundBand(7, 16), "under-half", "7 of 16");
  eq(woundBand(8, 16), "half-or-more", "8 of 16 (ERRATA 2)");
  eq(woundBand(7, 15), "under-half", "7 of 15");
  eq(woundBand(8, 15), "half-or-more", "8 of 15");

  const c1 = condition({ strengthScore: 13, wounds: [{ location: "chest", severity: "serious", points: 7 }, { location: "leftArm", severity: "light", points: 3 }, { location: "rightLeg", severity: "light", points: 3 }] });
  ok(c1.currentStrength === 0 && c1.unconscious && c1.needsSurvivalRuling && !c1.dead, "wounds to 0: unconscious + GM ruling");
  const c2 = condition({ strengthScore: 13, brawlDamage: 13 });
  ok(c2.unconscious && !c2.needsSurvivalRuling, "brawl knockout never raises the flag");
  const c3 = condition({ strengthScore: 18, wounds: [{ location: "head", severity: "mortal" }] });
  ok(c3.dead && !c3.unconscious, "mortal = dead");
  eq(condition({ strengthScore: 16, wounds: [{ location: "chest", severity: "serious", points: 7, healed: 4 }] }).damage, 3, "healing reduces damage");

  eq(gunArmPenalty([{ location: "rightArm", severity: "light", points: 3 }]), "light", "light gun arm");
  eq(gunArmPenalty([{ location: "leftArm", severity: "serious", points: 7 }]), null, "off arm no penalty");
  eq(gunArmPenalty([{ location: "leftArm", severity: "serious", points: 7 }], "left"), "serious", "left-hander gun arm");
  eq(gunArmPenalty([{ location: "rightArm", severity: "serious", points: 7, healed: 4 }]), null, "over half healed lifts penalty");
  eq(gunArmPenalty([{ location: "rightArm", severity: "serious", points: 7, healed: 3 }]), "serious", "under half healed keeps penalty");

  eq(movementLimits([{ location: "leftLeg", severity: "light", points: 3 }]).factor, 0.5, "light leg ½ speed");
  ok(movementLimits([{ location: "rightLeg", severity: "serious", points: 7 }]).walkOnly, "serious leg walk only");
  ok(movementLimits([{ location: "chest", severity: "serious", points: 7 }]).walkingExempt, "other serious: ½ except walking");
  eq(movementLimits([{ location: "leftArm", severity: "light", points: 3 }]).factor, 1, "light arm no effect");
  console.log(`wounds.mjs — all self-tests passed (${count()} assertions).`);
}

if (isMain(import.meta.url)) runSelfTests();

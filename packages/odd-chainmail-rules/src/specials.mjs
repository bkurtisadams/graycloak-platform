/**
 * OD&D — Chainmail engine · monster special abilities in man-to-man combat
 * odd-chainmail-rules · src/specials.mjs
 *
 * Pure. Book II p.5–19 behaviours a fight needs, read from the tagged
 * `specialAbilities.entries` of monsters.mjs. Readings the books leave open are
 * marked OPEN and listed in the rules reference for Kurt's ruling.
 */
import { rollDie } from "./dice.mjs";

/** First ability entry with this tag on a monster record, or null. */
export function abilityOf(monster, tag) {
  return monster?.specialAbilities?.entries?.find((a) => a.tag === tag) ?? null;
}

/**
 * Energy drain (wights 1, wraiths 1, spectres 2, vampires 2). Book II: a hit
 * "removes both the hit die and the corresponding energy to fight". OPEN
 * reading: the hit drains levels instead of doing 1d6; each level lost also
 * removes one hit die (rolled) from current and maximum hit points.
 */
export function drainHit(levels, rng) {
  let hp = 0; const rolls = [];
  for (let i = 0; i < levels; i++) { const r = rollDie(rng); rolls.push(r); hp += r; }
  return { levels, hpLost: hp, rolls };
}

/**
 * Regeneration. Troll: begins the third melee round after it is first hit,
 * 3 hit points a round (OPEN: Book II says "per turn"; read as per melee
 * round in combat). A troll at 0 or less keeps regenerating and fights again
 * at 6 hit points unless burned or put in acid. Vampire: from the first hit.
 */
export function regenAmount({ kind, roundsSinceHit, burned = false }) {
  if (burned) return 0;
  if (kind === "troll") return roundsSinceHit >= 2 ? 3 : 0;
  if (kind === "vampire") return roundsSinceHit >= 0 ? 3 : 0;
  return 0;
}
export const TROLL_RISES_AT = 6;

/** Dragon (and chimera) breath or bite: 2d6, 7+ breathes if uses remain (Book II p.11). */
export function breathOrBite(usesLeft, rng) {
  const a = rollDie(rng), b = rollDie(rng);
  return { roll: [a, b], breathes: usesLeft > 0 && a + b >= 7 };
}

/**
 * Breath areas from Book II p.11, in inches (1" = 3 cells indoors).
 * cone: starts at the mouth ½" wide and widens to `width` at `length`.
 * line: ½" wide. cloud: `length` deep by `width` across, ground to 3" high.
 */
export const BREATH = Object.freeze({
  white:  { shape: "cone",  length: 8,  width: 3,   kind: "cold" },
  black:  { shape: "line",  length: 6,  width: 0.5, kind: "acid" },
  green:  { shape: "cloud", length: 5,  width: 4,   kind: "chlorine" },
  blue:   { shape: "line",  length: 10, width: 0.5, kind: "lightning" },
  red:    { shape: "cone",  length: 9,  width: 3,   kind: "fire" },
  golden: { shape: "cone",  length: 9,  width: 3,   kind: "fire" },
  chimera:{ shape: "cone",  length: 5,  width: 2,   kind: "fire", dice: 3 }
});

/**
 * Is point p (inches) inside a breath aimed from origin o toward aim a?
 * Cone and cloud widen linearly from ½" at the mouth; a line stays ½".
 */
export function inBreath(o, a, p, spec) {
  const dx = a.x - o.x, dy = a.y - o.y; const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const px = p.x - o.x, py = p.y - o.y;
  const along = px * ux + py * uy;
  if (along < 0 || along > spec.length) return false;
  const across = Math.abs(-px * uy + py * ux);
  const half = spec.shape === "line" ? spec.width / 2 : (0.25 + (spec.width / 2 - 0.25) * (along / spec.length));
  return across <= half + 1e-9;
}

/** Purple worm: a hit that beats the number needed by 20% or more, or a 12, swallows (Book II p.15). */
export function swallows(effective, need, natural) {
  return natural === 12 || effective >= Math.ceil(need * 1.2);
}

/** Wyvern: stings two-thirds of the time, bites on 5–6 (Book II p.11). */
export function wyvernStings(rng) { const r = rollDie(rng); return { roll: r, sting: r <= 4 }; }

/** Hydra: one attack per remaining head; each head is a 6-point hit die (Book II p.10). */
export function hydraHeads(hp) { return Math.max(0, Math.ceil(hp / 6)); }

/** Dwarves and gnomes take half damage from ogres, giants and the like (Book II p.16). */
export const CLUMSY_BIG = Object.freeze(["ogre", "giant-hill", "giant-stone", "giant-frost", "giant-fire", "giant-cloud", "troll"]);

/* ---------------------------------------------------------------- tests */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };
  const seq = (v) => { let i = 0; return () => v[i++ % v.length]; };

  ok(abilityOf({ specialAbilities: { entries: [{ tag: "drain", value: 2 }] } }, "drain").value === 2, "abilityOf finds by tag");
  ok(abilityOf({}, "drain") === null, "abilityOf null when absent");
  const d = drainHit(2, seq([0.5, 0.99]));
  ok(d.levels === 2 && d.hpLost === 4 + 6 && d.rolls.length === 2, "drain 2 levels: two hit dice lost");
  ok(regenAmount({ kind: "troll", roundsSinceHit: 1 }) === 0 && regenAmount({ kind: "troll", roundsSinceHit: 2 }) === 3, "troll starts the third round after a hit");
  ok(regenAmount({ kind: "troll", roundsSinceHit: 5, burned: true }) === 0, "burned trolls stop");
  ok(regenAmount({ kind: "vampire", roundsSinceHit: 0 }) === 3, "vampire regenerates at once");
  ok(breathOrBite(3, seq([0.99, 0])).breathes === true && breathOrBite(3, seq([0, 0])).breathes === false, "2d6: 7+ breathes");
  ok(breathOrBite(0, seq([0.99])).breathes === false, "no uses left: bites");
  const o = { x: 0, y: 0 }, a = { x: 1, y: 0 };
  ok(inBreath(o, a, { x: 9, y: 1.4 }, BREATH.red) && !inBreath(o, a, { x: 9, y: 1.6 }, BREATH.red), "red cone 3\" wide at 9\"");
  ok(inBreath(o, a, { x: 1, y: 0.3 }, BREATH.red) && !inBreath(o, a, { x: 1, y: 0.6 }, BREATH.red), "cone narrow near the mouth");
  ok(!inBreath(o, a, { x: 10, y: 0 }, BREATH.red) && !inBreath(o, a, { x: -1, y: 0 }, BREATH.red), "cone length and direction");
  ok(inBreath(o, a, { x: 10, y: 0.2 }, BREATH.blue) && !inBreath(o, a, { x: 5, y: 0.3 }, BREATH.blue), "blue line ½\" wide, 10\" long");
  ok(swallows(10, 8, 0) && !swallows(9, 8, 0) && swallows(5, 8, 12), "swallow at 120% of the number needed, or a 12");
  ok(wyvernStings(seq([0.5])).sting && !wyvernStings(seq([0.9])).sting, "wyvern stings 1-4");
  ok(hydraHeads(36) === 6 && hydraHeads(31) === 6 && hydraHeads(30) === 5 && hydraHeads(0) === 0, "hydra heads from hit points");

  console.log(`specials.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

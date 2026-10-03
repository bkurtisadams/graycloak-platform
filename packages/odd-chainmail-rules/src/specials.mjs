/**
 * OD&D — Chainmail engine · monster special abilities in man-to-man combat
 * odd-chainmail-rules · src/specials.mjs
 *
 * Pure. Book II p.5–19 behaviours a fight needs, read from the tagged
 * `specialAbilities.entries` of monsters.mjs. Readings the books leave open are
 * marked OPEN and listed in the rules reference for Kurt's ruling.
 */
import { rollDie } from "./dice.mjs";
import { attackFacing } from "./engagement.mjs";

/** First ability entry with this tag on a monster record, or null. */
export function abilityOf(monster, tag) {
  return monster?.specialAbilities?.entries?.find((a) => a.tag === tag) ?? null;
}

/**
 * Energy drain, legacy roll-only form. Use drainLevels, which follows Kurt's
 * ruling on stored hit-die rolls.
 */
export function drainHit(levels, rng) {
  let hp = 0; const rolls = [];
  for (let i = 0; i < levels; i++) { const r = rollDie(rng); rolls.push(r); hp += r; }
  return { levels, hpLost: hp, rolls };
}

/**
 * Energy drain (Kurt's ruling, Oct 2026). Each melee hit drains levels
 * instead of doing hit-point damage. For each level lost, the figure also
 * loses that level's hit points: the stored roll for that level if the record
 * has one (hpRolls[level - 1]), otherwise 1d6. Maximum drops by that amount
 * and current is capped at the new maximum. Level 0 = fully drained.
 * figure: { level, hp, maxHp, hpRolls? } (monsters: level = hit dice).
 */
export function drainLevels(figure, levels, rng) {
  let level = Math.max(0, Math.trunc(figure.level) || 0);
  let maxHp = figure.maxHp, hp = figure.hp;
  const lost = [];
  for (let i = 0; i < levels && level > 0; i++) {
    const stored = figure.hpRolls?.[level - 1];
    const amount = Number.isFinite(stored) ? stored : rollDie(rng);
    lost.push({ level, amount, stored: Number.isFinite(stored) });
    maxHp = Math.max(0, maxHp - amount);
    level--;
  }
  hp = Math.min(hp, maxHp);
  return { level, maxHp, hp, lost, drained: level === 0, hpRolls: figure.hpRolls?.slice(0, level) };
}

/** What a victim rises as. Killed or fully drained by a wight: wight. Man-types killed by ghouls: ghoul. */
export function risesAs(attackerKey, { manType = true, killed = false, drained = false } = {}) {
  if (attackerKey === "wight" && (killed || drained)) return "wight";
  if (attackerKey === "ghoul" && killed && manType) return "ghoul";
  return null;
}

/**
 * Damage to drainers from silver and magic (Kurt's ruling, Oct 2026).
 * Wight: normal missiles nothing, silver arrows normal, magic arrows double;
 * magic weapons full damage plus their bonus as extra hit points.
 * Wraith: silver arrows half a die, magic arrows one die.
 * attack: { missile, silver, magical, bonus }. roll: the 1d6 rolled.
 */
export function drainerDamage(monsterKey, attack, roll) {
  const { missile = false, silver = false, magical = false, bonus = 0 } = attack ?? {};
  if (monsterKey === "wight") {
    if (missile) return magical ? roll * 2 : silver ? roll : 0;
    return magical ? roll + Math.max(0, bonus) : silver ? roll : 0;
  }
  if (monsterKey === "wraith" && missile) return magical ? roll : silver ? Math.ceil(roll / 2) : 0;
  return null;
}

/**
 * Ghoul touch (Kurt's ruling, Oct 2026): save vs Paralyzation (the wands
 * column) or held for 9 turns, as a cleric's Hold Person. Elves are immune.
 */
export const GHOUL_PARALYSIS_TURNS = 9;
export function ghoulTouch(saves, rng, { elf = false, mod = 0 } = {}) {
  if (elf) return { immune: true, held: false };
  const roll = 1 + Math.floor(rng() * 20);
  const need = saves.wands;
  const saved = roll + mod >= need;
  return { immune: false, roll, need, mod, saved, held: !saved, turns: saved ? 0 : GHOUL_PARALYSIS_TURNS };
}

/**
 * Regeneration. Troll: 3 hit points a melee round, beginning the third round
 * after it is first hit. A downed troll stays on the board and rises at 6
 * hit points unless burned or put in acid. Vampire: from the first hit.
 */
export function regenAmount({ kind, roundsSinceHit, burned = false }) {
  if (burned) return 0;
  if (kind === "troll") return roundsSinceHit >= 2 ? 3 : 0;
  if (kind === "vampire") return roundsSinceHit >= 0 ? 3 : 0;
  return 0;
}
export const TROLL_RISES_AT = 6;

/** Attack tags that stop troll regeneration. */
export const TROLL_BANE = Object.freeze(["fire", "acid"]);
export function stopsRegeneration(tags = []) { return tags.some((t) => TROLL_BANE.includes(t)); }

/**
 * One troll round. hp may be 0 or less (downed). Downed trolls store the
 * regeneration until it reaches 6, then rise at 6. Burned or acid: nothing.
 */
export function trollRound({ hp, maxHp, roundsSinceHit, burned = false, store = 0 }) {
  const amt = regenAmount({ kind: "troll", roundsSinceHit, burned });
  if (!amt) return { hp, store, regen: 0, rises: false, down: hp <= 0 };
  if (hp > 0) return { hp: Math.min(maxHp, hp + amt), store: 0, regen: amt, rises: false, down: false };
  const s = store + amt;
  if (s >= TROLL_RISES_AT) return { hp: TROLL_RISES_AT, store: 0, regen: amt, rises: true, down: false };
  return { hp: Math.min(hp, 0), store: s, regen: amt, rises: false, down: true };
}

/**
 * Gaze (basilisk, medusa). Every round each figure that can see the creature
 * (it is in the figure's front arc, with line of sight) while the creature is
 * looking its way (the figure is in the creature's front arc) saves vs Stone;
 * no set range (Kurt, Oct 2026). A figure averting its eyes is safe but blind
 * (house rule from AD&D 1e: -4 to hit, missiles only at adjacent targets).
 * A figure holding a good reflector in sufficient light turns the gaze back
 * on the creature, which saves vs Stone against it (Kurt's ruling, Oct 2026).
 */
export const BLIND = Object.freeze({ everyDieBonus: -4, missileAdjacentOnly: true });
export const GAZERS = Object.freeze(["basilisk", "medusa"]);

export function seesGazer(viewer, gazer) {
  return attackFacing({ x: viewer.x, y: viewer.y }, viewer.facing, { x: gazer.x, y: gazer.y }) === "front";
}

/** The gazer is aware of the viewer: the viewer is in the gazer's front arc. A gazer with no facing looks every way. */
export function gazerLooksAt(gazer, viewer) {
  if (gazer.facing == null) return true;
  return attackFacing({ x: gazer.x, y: gazer.y }, gazer.facing, { x: viewer.x, y: viewer.y }) === "front";
}

export function gazeCheck(viewer, gazer, saves, rng, { lit = true } = {}) {
  if (!seesGazer(viewer, gazer) || !gazerLooksAt(gazer, viewer)) return { exposed: false };
  if (viewer.reflector && lit) return { exposed: false, reflected: true };
  if (viewer.averted) return { exposed: false, averted: true };
  const roll = 1 + Math.floor(rng() * 20);
  const need = saves.stone;
  const saved = roll + (viewer.saveMod ?? 0) >= need;
  return { exposed: true, roll, need, saved, petrified: !saved };
}

export function reflectedGaze(gazerSaves, rng) {
  const roll = 1 + Math.floor(rng() * 20);
  return { roll, need: gazerSaves.stone, petrified: roll < gazerSaves.stone };
}

/** Medusa's snake bites: deadly poison, save vs Poison. */
export function poisonBite(saves, rng, mod = 0) {
  const roll = 1 + Math.floor(rng() * 20);
  const need = saves.deathPoison;
  return { roll, need, saved: roll + mod >= need, dies: roll + mod < need };
}

/** Petrifying touch (basilisk, cockatrice) and gorgon breath (6 feet): save vs Stone. */
export const PETRIFY_TOUCH = Object.freeze(["basilisk", "cockatrice"]);
export const GORGON_BREATH_FEET = 6;
export function petrifySave(saves, rng, mod = 0) {
  const roll = 1 + Math.floor(rng() * 20);
  return { roll, need: saves.stone, saved: roll + mod >= saves.stone, petrified: roll + mod < saves.stone };
}

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

  const st = (lvl, hp, rolls) => ({ level: lvl, hp, maxHp: hp, hpRolls: rolls });
  const dr = drainLevels(st(3, 14, [6, 3, 5]), 1, seq([0]));
  ok(dr.level === 2 && dr.maxHp === 9 && dr.hp === 9 && dr.lost[0].stored && dr.lost[0].amount === 5, "drain uses the stored roll for the lost level");
  const dr2 = drainLevels({ level: 3, hp: 4, maxHp: 14 }, 1, seq([0.99]));
  ok(dr2.maxHp === 8 && dr2.hp === 4 && !dr2.lost[0].stored, "no stored roll: 1d6, current kept under new max");
  const dr3 = drainLevels(st(1, 5, [5]), 2, seq([0]));
  ok(dr3.drained && dr3.level === 0 && dr3.lost.length === 1, "fully drained stops at 0");
  ok(risesAs("wight", { drained: true }) === "wight" && risesAs("wight", { killed: true }) === "wight", "wight victims rise as wights");
  ok(risesAs("ghoul", { killed: true }) === "ghoul" && risesAs("ghoul", { killed: true, manType: false }) === null, "man-types killed by ghouls rise");
  ok(drainerDamage("wight", { missile: true }, 4) === 0 && drainerDamage("wight", { missile: true, silver: true }, 4) === 4 && drainerDamage("wight", { missile: true, magical: true }, 4) === 8, "wight vs arrows");
  ok(drainerDamage("wight", { magical: true, bonus: 2 }, 3) === 5, "magic weapon adds its bonus");
  ok(drainerDamage("wraith", { missile: true, silver: true }, 5) === 3 && drainerDamage("wraith", { missile: true, magical: true }, 5) === 5, "wraith: silver half, magic one die");
  ok(drainerDamage("orc", {}, 3) === null, "others: no special rule");

  ok(ghoulTouch({ wands: 13 }, seq([0]), { elf: true }).immune, "elves immune to ghouls");
  const gt = ghoulTouch({ wands: 13 }, seq([0.55]));
  ok(gt.roll === 12 && gt.held && gt.turns === 9, "fail vs wands: held 9 turns");
  ok(!ghoulTouch({ wands: 13 }, seq([0.6])).held, "save 13: free");

  ok(stopsRegeneration(["fire"]) && stopsRegeneration(["acid"]) && !stopsRegeneration(["silver"]), "fire and acid stop trolls");
  ok(trollRound({ hp: 10, maxHp: 30, roundsSinceHit: 2 }).hp === 13, "troll heals 3");
  ok(trollRound({ hp: 29, maxHp: 30, roundsSinceHit: 4 }).hp === 30, "troll capped at max");
  const down = trollRound({ hp: -2, maxHp: 30, roundsSinceHit: 3, store: 3 });
  ok(down.rises && down.hp === 6, "downed troll rises at 6");
  ok(trollRound({ hp: -2, maxHp: 30, roundsSinceHit: 3, store: 0 }).store === 3 && !trollRound({ hp: -2, maxHp: 30, roundsSinceHit: 3 }).rises, "stores until 6");
  ok(trollRound({ hp: -2, maxHp: 30, roundsSinceHit: 3, store: 3, burned: true }).regen === 0, "burned: stays down");

  const gz = { x: 5, y: 0 };
  ok(seesGazer({ x: 0, y: 0, facing: 0 }, gz) && !seesGazer({ x: 0, y: 0, facing: 4 }, gz), "front arc sees the gaze");
  ok(gazeCheck({ x: 0, y: 0, facing: 0, averted: true }, gz, { stone: 14 }, seq([0])).averted, "averting blocks the gaze");
  ok(gazeCheck({ x: 0, y: 0, facing: 0, reflector: true }, gz, { stone: 14 }, seq([0])).reflected, "reflector turns it back in light");
  ok(gazeCheck({ x: 0, y: 0, facing: 0, reflector: true }, gz, { stone: 14 }, seq([0]), { lit: false }).petrified, "no light: reflector useless");
  ok(gazeCheck({ x: 0, y: 0, facing: 4 }, gz, { stone: 14 }, seq([0])).exposed === false, "back turned: safe");
  ok(gazeCheck({ x: 0, y: 0, facing: 0 }, { x: 5, y: 0, facing: 0 }, { stone: 14 }, seq([0])).exposed === false, "gazer looking away: safe");
  ok(gazeCheck({ x: 0, y: 0, facing: 0 }, { x: 5, y: 0, facing: 4 }, { stone: 14 }, seq([0])).petrified, "gazer looking his way: exposed");
  ok(gazeCheck({ x: 0, y: 0, facing: 0 }, { x: 40, y: 0, facing: 4 }, { stone: 14 }, seq([0])).petrified, "no set range");
  ok(gazeCheck({ x: 0, y: 0, facing: 0 }, gz, { stone: 14 }, seq([0.7])).saved, "15 vs 14 saves");
  ok(BLIND.everyDieBonus === -4 && BLIND.missileAdjacentOnly, "averted = blind");
  ok(poisonBite({ deathPoison: 12 }, seq([0.5])).dies && !poisonBite({ deathPoison: 12 }, seq([0.55])).dies, "bite: save vs poison");
  ok(reflectedGaze({ stone: 14 }, seq([0])).petrified, "reflected gaze can stone the gazer");

  console.log(`specials.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

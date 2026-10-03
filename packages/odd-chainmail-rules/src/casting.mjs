/**
 * OD&D — Chainmail engine · combat spellcasting
 * odd-chainmail-rules · src/casting.mjs
 *
 * Pure. The rules a caster needs in a fight (Book I p.19-34, Chainmail p.32):
 *   - OD&D spell slots govern casting; no Chainmail complexity roll (ruling).
 *   - A caster must be stationary and undisturbed to cast or keep a spell going
 *     (Chainmail p.32). Kurt's ruling: any movement this round, or being HIT
 *     earlier in the missile-and-spell step (Dexterity order), spoils the
 *     casting. A miss does not. The slot is still spent.
 *   - First combat spells: Sleep, Hold Person, Charm Person, Protection from Evil.
 *
 * Referee calls marked OPEN below are defaults the rulings log hasn't settled.
 */
import { rollDie } from "./dice.mjs";
import { savesFor } from "./tables.mjs";

export const COMBAT_SPELLS = Object.freeze({
  sleep:         { id: "sleep",         name: "Sleep",               level: 1, classes: ["magic-user"], range: 24 },
  charmPerson:   { id: "charmPerson",   name: "Charm Person",        level: 1, classes: ["magic-user"], range: 12 },
  protectionEvil:{ id: "protectionEvil",name: "Protection from Evil",level: 1, classes: ["magic-user", "cleric"], range: 0 },
  holdPerson:    { id: "holdPerson",    name: "Hold Person",         level: 3, classes: ["magic-user"], range: 12, clericLevel: 2, clericRange: 18 },
  fireBall:      { id: "fireBall",      name: "Fire Ball",           level: 3, classes: ["magic-user"], range: 24, area: "burst", radius: 2 },
  lightningBolt: { id: "lightningBolt", name: "Lightning Bolt",      level: 3, classes: ["magic-user"], range: 24, area: "bolt", length: 6, width: 0.75 }
});

/** Fire Ball and Lightning Bolt (Book I p.25): one die per caster level (a 6th-level caster throws 6 dice). */
export function spellDamageDice(casterLevel) { return Math.max(1, Math.trunc(casterLevel) || 1); }

/**
 * Dice and save column by source (Kurt's ruling, Oct 2026): cast = 1d6 per
 * caster level, save as Spells; scroll = 6 dice, Spells; wand = 6 dice, Wands;
 * staff = 8 dice, Staves. A save halves the damage.
 */
export const AREA_SPELL_SOURCE = Object.freeze({
  cast:   Object.freeze({ dice: null, save: "staves" }),
  scroll: Object.freeze({ dice: 6, save: "staves" }),
  wand:   Object.freeze({ dice: 6, save: "wands" }),
  staff:  Object.freeze({ dice: 8, save: "staves" })
});
export function areaSpellDice(source = "cast", casterLevel = 1) {
  const s = AREA_SPELL_SOURCE[source] ?? AREA_SPELL_SOURCE.cast;
  return { dice: s.dice ?? spellDamageDice(casterLevel), save: s.save };
}
/** Save for half: d20 meet or beat the column's number. Damage rounds down, minimum 1 on a hit. */
export function saveForHalf(saves, column, damage, rng, mod = 0) {
  const roll = 1 + Math.floor(rng() * 20);
  const need = saves[column];
  const saved = roll + mod >= need;
  return { roll, need, mod, saved, damage: saved ? Math.max(1, Math.floor(damage / 2)) : damage };
}

/**
 * Lightning Bolt start point (Kurt's ruling, Oct 2026): the caster picks the
 * start point anywhere, as long as the far end of a straight 6" bolt stays
 * within 24". Positions in cells.
 */
export function lightningStartOk(caster, start, { lengthInches = 6, rangeInches = 24 } = {}) {
  const d = Math.hypot(start.x - caster.x, start.y - caster.y) / CELLS_PER_INCH_C;
  return d + lengthInches <= rangeInches + 1e-9;
}

const CELLS_PER_INCH_C = 3;
/**
 * Fire Ball burst (Book I p.25): radius 2" (6 cells); in a confined space it
 * conforms to the space. Cells fill outward from the centre by walking
 * distance until they cover a 2"-radius circle's area, so in the open it is a
 * circle and in a corridor it stretches along the corridor.
 * isOpen(x, y) -> floor cell. Returns array of [x, y].
 */
export function fireBallCells(center, isOpen, radiusInches = 2) {
  const r = radiusInches * CELLS_PER_INCH_C;
  const target = Math.round(Math.PI * r * r);
  if (!isOpen(center.x, center.y)) return [];
  const key = (x, y) => `${x},${y}`;
  const dist = new Map([[key(center.x, center.y), 0]]);
  const open = [{ x: center.x, y: center.y, d: 0 }];
  const out = [];
  while (open.length && out.length < target) {
    open.sort((a, b) => a.d - b.d || Math.hypot(a.x - center.x, a.y - center.y) - Math.hypot(b.x - center.x, b.y - center.y));
    const c = open.shift();
    if (c.d > (dist.get(key(c.x, c.y)) ?? Infinity)) continue;
    out.push([c.x, c.y]);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = c.x + dx, ny = c.y + dy;
      if (!isOpen(nx, ny)) continue;
      if (dx && dy && (!isOpen(c.x + dx, c.y) || !isOpen(c.x, c.y + dy))) continue;
      const nd = c.d + (dx && dy ? Math.SQRT2 : 1);
      if (nd < (dist.get(key(nx, ny)) ?? Infinity)) { dist.set(key(nx, ny), nd); open.push({ x: nx, y: ny, d: nd }); }
    }
  }
  return out;
}

/**
 * Lightning Bolt (Book I p.25): 6" long, up to 3/4" wide, starting where it is
 * aimed and running straight away from the caster. Where the space is too
 * short it doubles back to reach 6", possibly striking its creator; its head
 * may never pass 24" from the caster. Returns { cells, maxReach } in cells.
 */
export function lightningCells(caster, start, isOpen, { lengthInches = 6, widthInches = 0.75 } = {}) {
  let dx = start.x - caster.x, dy = start.y - caster.y; const len = Math.hypot(dx, dy) || 1;
  dx /= len; dy /= len;
  const total = lengthInches * CELLS_PER_INCH_C, half = (widthInches * CELLS_PER_INCH_C) / 2;
  const pts = []; let px = start.x, py = start.y, dir = 1, maxReach = 0;
  let travelled = 0, bounces = 0;
  pts.push([px, py]); maxReach = Math.hypot(px - caster.x, py - caster.y);
  while (travelled < total && bounces < 8) {
    const nx = px + dx * dir * 0.25, ny = py + dy * dir * 0.25;
    if (!isOpen(Math.round(nx), Math.round(ny))) { dir = -dir; bounces++; continue; }
    px = nx; py = ny; travelled += 0.25;
    pts.push([px, py]); maxReach = Math.max(maxReach, Math.hypot(px - caster.x, py - caster.y));
  }
  const seen = new Set(), cells = [];
  for (const [x, y] of pts) {
    for (let ox = -Math.ceil(half); ox <= Math.ceil(half); ox++) for (let oy = -Math.ceil(half); oy <= Math.ceil(half); oy++) {
      const cx = Math.round(x) + ox, cy = Math.round(y) + oy;
      const along = (cx - x) * dx + (cy - y) * dy; const across = Math.abs(-(cx - x) * dy + (cy - y) * dx);
      if (across > half + 0.01 || Math.abs(along) > 0.6) continue;
      if (!isOpen(cx, cy)) continue;
      const k = `${cx},${cy}`; if (!seen.has(k)) { seen.add(k); cells.push([cx, cy]); }
    }
  }
  return { cells, maxReach };
}

/** Spells of a class that fit the caster's slot levels. */
export function combatSpellsFor(rawClass, slots) {
  const cls = String(rawClass || "").toLowerCase();
  return Object.values(COMBAT_SPELLS).filter((s) => {
    if (!s.classes.includes(cls) && !(cls === "cleric" && s.clericLevel)) return false;
    const lvl = cls === "cleric" && s.clericLevel ? s.clericLevel : s.level;
    return (slots?.[lvl - 1] ?? 0) > 0;
  }).map((s) => ({ ...s, level: cls === "cleric" && s.clericLevel ? s.clericLevel : s.level, range: cls === "cleric" && s.clericRange ? s.clericRange : s.range }));
}

/** Chainmail p.32: stationary and undisturbed by attack. */
export function castingGate({ moved = 0, hitFirst = false } = {}) {
  if (moved > 0) return { ok: false, reason: "moved this round" };
  if (hitFirst) return { ok: false, reason: "hit before the spell went off" };
  return { ok: true, reason: null };
}

/** Hit dice as a comparable number: 1+1 -> 1.5, 2 -> 2, 1-1 -> 0.75. */
export function hdValue(count, bonus = 0) {
  const c = Math.max(0, Math.trunc(count) || 0);
  const b = Math.trunc(bonus) || 0;
  return b > 0 ? c + 0.5 : b < 0 ? Math.max(0.25, c - 0.25) : c;
}

/**
 * Sleep (Book I p.23): how many creatures of this hit-dice class it can put
 * down. 2-16 up to 1+1 HD, 2-12 up to 2+1, 1-6 third level (up to 3+1),
 * one creature up to 4+1; nothing larger. No saving throw.
 */
export function sleepCapacity(count, bonus, rng) {
  const hd = hdValue(count, bonus);
  if (hd <= 1.5) return { dice: "2d8", n: rollDie8(rng) + rollDie8(rng) };
  if (hd <= 2.5) return { dice: "2d6", n: rollDie(rng) + rollDie(rng) };
  if (hd <= 3.5) return { dice: "1d6", n: rollDie(rng) };
  if (hd <= 4.5) return { dice: "one", n: 1 };
  return { dice: "none", n: 0 };
}
function rollDie8(rng) { return 1 + Math.floor(rng() * 8); }

/**
 * Sleep's area. OD&D gives Sleep a range (24") and numbers by hit dice but no
 * area; Kurt's ruling (Oct 2026) borrows 1st edition AD&D's 3" diameter
 * (1½" radius; 30 feet across underground). Every open cell reachable from
 * the centre within it, not spreading round corners as a Fire Ball does.
 */
export const SLEEP_RADIUS = 1.5;
export function sleepCells(center, isOpen, radiusInches = SLEEP_RADIUS) {
  const r = radiusInches * CELLS_PER_INCH_C, key = (x, y) => `${x},${y}`;
  if (!isOpen(center.x, center.y)) return [];
  const seen = new Set([key(center.x, center.y)]), out = [], queue = [[center.x, center.y]];
  while (queue.length) {
    const [x, y] = queue.shift();
    out.push([x, y]);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny);
      if (seen.has(k) || !isOpen(nx, ny) || Math.hypot(nx - center.x, ny - center.y) > r) continue;
      seen.add(k); queue.push([nx, ny]);
    }
  }
  return out;
}
/**
 * Who a placed Sleep puts down. The number is rolled for the toughest creature
 * caught (4+1 hit dice or less; tougher ones are unaffected), then that many
 * of those caught are chosen at random (Book I). figures: [{ id, hd }].
 */
export function sleepInArea(figures, rng) {
  const able = figures.filter((f) => f.hd <= 4.5);
  if (!able.length) return { cap: { dice: "none", n: 0 }, toughest: null, asleep: [] };
  const toughest = able.reduce((a, b) => (b.hd > a.hd ? b : a));
  const cap = sleepCapacity(toughest.hd, 0, rng);
  return { cap, toughest, asleep: pickRandom(able, cap.n, rng) };
}

/** Pick n of the eligible at random (Book I: random selection if more could be affected). */
export function pickRandom(list, n, rng) {
  const pool = list.slice();
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}

/**
 * Charm Person / Hold Person targets (Book I p.23): two-legged, generally
 * mammalian, man-size or smaller, not undead. Monster keys in the package
 * that qualify; men always qualify.
 */
export const PERSON_MONSTERS = Object.freeze(["goblin", "kobold", "orc", "hobgoblin", "gnoll"]);
export function isPerson(fig) {
  return fig.kind === "pc" || PERSON_MONSTERS.includes(fig.monsterKey);
}

/**
 * A monster's saving throws (Kurt's ruling, Oct 2026): as a Fighting-Man of
 * its hit dice. Under 1 HD uses the 1-3 row, pluses are ignored for row
 * choice, 13+ HD uses the top row.
 */
export function monsterSaves(count) {
  return savesFor("fighter", Math.max(1, Math.trunc(count) || 1));
}

/** Save vs spells: d20 at or above the staves-and-spells number, plus modifiers. */
export function saveVsSpells(saves, rng, mod = 0) {
  const roll = 1 + Math.floor(rng() * 20);
  const need = saves.staves;
  return { roll, need, mod, saved: roll + mod >= need };
}

/** Hold Person (Book I p.25): 1-4 persons, or one at -2 on his save. */
export function holdPersonCount(single, rng) {
  return single ? 1 : 1 + Math.floor(rng() * 4);
}
export const HOLD_PERSON_MAX = 4;

/** Kurt's ruling: a magically held or paralyzed target is hit at +4 and takes double damage. */
export const HELD_TARGET = Object.freeze({ everyDieBonus: 4, damageDoubled: true });

/**
 * Protection from Evil (Book I p.23): +1 on the caster's saves and -1 from the
 * hit dice of evil attackers. In man-to-man the -1 applies to each attack die
 * an evil figure rolls against him (OPEN: reading of "hit dice").
 */
export const PROTECTION_FROM_EVIL = Object.freeze({ saveBonus: 1, attackPenalty: -1, turns: 6 });

/* ---------------------------------------------------------------- tests */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };
  const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };

  ok(castingGate({ moved: 0 }).ok, "stationary and unattacked casts");
  ok(!castingGate({ moved: 2 }).ok && castingGate({ moved: 2 }).reason === "moved this round", "moving spoils");
  ok(!castingGate({ hitFirst: true }).ok, "a hit before the spell spoils");

  ok(hdValue(1, 1) === 1.5 && hdValue(1, -1) === 0.75 && hdValue(4, 1) === 4.5, "hd values");
  ok(sleepCapacity(1, 0, seq([0.99])).dice === "2d8" && sleepCapacity(1, 0, seq([0.99])).n === 16, "orc: 2d8, max 16");
  ok(sleepCapacity(2, 1, seq([0])).dice === "2d6", "2+1 HD: 2d6");
  ok(sleepCapacity(3, 0, seq([0])).dice === "1d6", "3 HD: 1d6");
  ok(sleepCapacity(4, 1, seq([0])).n === 1, "4+1 HD: one");
  ok(sleepCapacity(5, 0, seq([0])).n === 0, "5 HD: immune");

  ok(pickRandom([1, 2, 3], 5, seq([0])).length === 3, "can't pick more than exist");
  ok(isPerson({ kind: "pc" }) && isPerson({ kind: "monster", monsterKey: "orc" }) && !isPerson({ kind: "monster", monsterKey: "ogre" }), "persons");

  ok(monsterSaves(1).staves === savesFor("fighter", 1).staves, "1 HD saves as 1st-level fighter");
  ok(monsterSaves(0).deathPoison === 12, "under 1 HD: 1-3 row");
  ok(monsterSaves(3).staves === 16 && monsterSaves(4).staves === 14, "3+1 stays on the 1-3 row, 4 HD moves up");
  ok(monsterSaves(13).stone === 5 && monsterSaves(20).stone === 5, "13+ HD: top row");
  ok(savesFor("fighter", 1, "dwarf").staves === savesFor("fighter", 5).staves && savesFor("fighter", 1, "halfling").wands === savesFor("fighter", 5).wands, "dwarf and halfling save as 4 levels higher vs magic");
  ok(savesFor("fighter", 1, "dwarf").deathPoison === 12 && savesFor("fighter", 1, "dwarf").dragon === 15, "no dwarf bonus vs death/poison or breath");
  ok(areaSpellDice("cast", 7).dice === 7 && areaSpellDice("cast", 7).save === "staves", "cast: level dice, Spells");
  ok(areaSpellDice("scroll").dice === 6 && areaSpellDice("wand").dice === 6 && areaSpellDice("wand").save === "wands", "scroll and wand: 6 dice; wand saves as Wands");
  ok(areaSpellDice("staff").dice === 8 && areaSpellDice("staff").save === "staves", "staff: 8 dice, Staves");
  ok(saveForHalf({ staves: 16 }, "staves", 21, seq([0.8])).damage === 10, "save halves");
  ok(saveForHalf({ staves: 16 }, "staves", 21, seq([0.1])).damage === 21, "fail: full");
  { const open = () => true; const c = sleepCells({ x: 10, y: 10 }, open);
    ok(c.length > 50 && c.every(([x, y]) => Math.hypot(x - 10, y - 10) <= 4.5), "sleep: 3\" diameter circle");
    const walled = (x, y) => x !== 12; ok(sleepCells({ x: 10, y: 10 }, walled).every(([x]) => x < 12), "sleep doesn't pass walls");
    const r = sleepInArea([{ id: 1, hd: 1 }, { id: 2, hd: 1 }, { id: 3, hd: 6 }], seq([0.99, 0.99, 0, 0]));
    ok(r.toughest.id <= 2 && r.asleep.length === 2 && !r.asleep.some((f) => f.id === 3), "6 HD immune; 1 HD band rolls 2d8");
    ok(sleepInArea([{ id: 1, hd: 7 }], seq([0])).asleep.length === 0, "nothing sleepable"); }
  ok(lightningStartOk({ x: 0, y: 0 }, { x: 54, y: 0 }) && !lightningStartOk({ x: 0, y: 0 }, { x: 55, y: 0 }), "far end within 24\": start at most 18\" away");
  ok(saveVsSpells({ staves: 16 }, seq([0.75]), 0).roll === 16 && saveVsSpells({ staves: 16 }, seq([0.75]), 0).saved, "save roll 16 vs 16");
  ok(!saveVsSpells({ staves: 16 }, seq([0.75]), -2).saved, "Hold Person single target -2");
  ok(holdPersonCount(true, seq([0.9])) === 1 && holdPersonCount(false, seq([0.99])) === 4, "hold count");

  const mu1 = combatSpellsFor("magic-user", [1, 0, 0, 0, 0, 0]).map((s) => s.id);
  ok(mu1.includes("sleep") && mu1.includes("charmPerson") && !mu1.includes("holdPerson"), "MU 1 spells");
  const mu5 = combatSpellsFor("magic-user", [4, 2, 1, 0, 0, 0]).map((s) => s.id);
  ok(mu5.includes("holdPerson"), "MU with a 3rd-level slot gets Hold Person");
  const cl1 = combatSpellsFor("cleric", [0, 0, 0, 0, 0]);
  ok(cl1.length === 0, "Acolyte has no spells");
  const cl3 = combatSpellsFor("cleric", [2, 1, 0, 0, 0]);
  ok(cl3.some((s) => s.id === "holdPerson" && s.level === 2 && s.range === 18), "cleric Hold Person is 2nd level, 18\"");

  // Fire Ball and Lightning Bolt
  ok(spellDamageDice(6) === 6 && spellDamageDice(0) === 1, "one die per caster level");
  const open = () => true;
  const ball = fireBallCells({ x: 20, y: 20 }, open);
  ok(ball.length === Math.round(Math.PI * 36), "burst covers a 2-inch-radius circle's area in the open");
  ok(ball.every(([x, y]) => Math.hypot(x - 20, y - 20) <= 7), "open burst is round (within 7 cells)");
  const corridor = (x, y) => y >= 10 && y <= 12;
  const cb = fireBallCells({ x: 50, y: 11 }, corridor);
  ok(cb.length === ball.length && Math.max(...cb.map(([x]) => Math.abs(x - 50))) > 15, "in a 10-foot corridor the burst stretches along it");
  ok(fireBallCells({ x: 0, y: 0 }, corridor).length === 0, "no burst inside rock");
  const bolt = lightningCells({ x: 0, y: 11 }, { x: 6, y: 11 }, open);
  ok(bolt.cells.some(([x]) => x === 24) && !bolt.cells.some(([x]) => x > 25) && Math.round(bolt.maxReach) === 24, "bolt runs 6 inches (18 cells) beyond its start");
  const boxed = (x, y) => x <= 12 && x >= -40 && y >= 9 && y <= 13;
  const bb = lightningCells({ x: 0, y: 11 }, { x: 6, y: 11 }, boxed);
  ok(bb.cells.some(([x]) => x === 0), "bolt doubles back off a wall toward its caster");
  console.log(`casting.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

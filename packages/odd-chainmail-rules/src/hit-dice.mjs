/**
 * OD&D — Chainmail engine · Dice for Accumulative Hits (Men & Magic, p.18-19)
 * odd-chainmail · module/rules/hit-dice.mjs
 * system 0.1.214 · slice: book-ii-bestiary · stamp 0.1.214-book-ii-bestiary.1
 *
 * The accumulative-hit-dice column rendered as { dice, bonus, label }:
 *   dice  — number of d6 rolled
 *   bonus — flat pips added to the TOTAL once (not per die), per the book's
 *           "pluses are merely the number of pips to add to the total of all
 *           dice rolled not to each die" (Superhero 8 dice +2 → 8d6 + 2).
 *
 * Max HP for a character derives from class + level; for a monster from its
 * own HD count + bonus. rollHitPoints() does the dice; deriveMaxHpAverage()
 * gives a no-roll default (3.5/die, floor) so a freshly-created actor isn't
 * stuck at the schema default.
 *
 * Beyond-table levels follow the "Levels Above those Listed" paragraph where
 * the book is explicit (fighter 11th = 10+3 dice fighting as 10th, 12th =
 * 11+1, 13th = 11+3; wizard 17th = 9+3, 18th = 10+1; patriarch 11th = 7+3,
 * 12th = 8+1, 13th = 8+2). Past the encoded rows the table clamps.
 */

import { classKey } from "./advancement.mjs";
import { forceDice } from "./dice.mjs";

/** Per-level [dice, bonus, label]; index 0 = level 1. Last row clamps upward. */
const HD = Object.freeze({
  fighter: [
    [1, 1, "1+1"],
    [2, 0, "2"],
    [3, 0, "3"],
    [4, 0, "4"],
    [5, 1, "5+1"],
    [6, 0, "6"],
    [7, 1, "7+1"],
    [8, 2, "8+2"],
    [9, 3, "9+3"],
    [10, 1, "10+1"],  // Lord 10th
    [10, 3, "10+3"],  // 11th
    [11, 1, "11+1"],  // 12th
    [11, 3, "11+3"]   // 13th+ (clamp)
  ],
  "magic-user": [
    [1, 0, "1"],
    [1, 1, "1+1"],
    [2, 0, "2"],
    [2, 1, "2+1"],
    [3, 0, "3"],
    [3, 1, "3+1"],
    [4, 0, "4"],
    [5, 0, "5"],
    [6, 1, "6+1"],
    [7, 0, "7"],
    [8, 1, "8+1"],     // Wizard 11th
    [8, 2, "8+2"],     // 12th
    [8, 3, "8+3"],     // 13th
    [8, 4, "8+4"],     // 14th
    [9, 1, "9+1"],     // 15th
    [9, 2, "9+2"],     // 16th
    [9, 3, "9+3"],     // 17th
    [10, 1, "10+1"]    // 18th+ (clamp)
  ],
  cleric: [
    [1, 0, "1"],
    [2, 0, "2"],
    [3, 0, "3"],
    [4, 0, "4"],
    [4, 1, "4+1"],
    [5, 0, "5"],
    [6, 0, "6"],
    [7, 0, "7"],
    [7, 1, "7+1"],     // Patriarch 9th
    [7, 2, "7+2"],     // 10th
    [7, 3, "7+3"],     // 11th
    [8, 1, "8+1"],     // 12th
    [8, 2, "8+2"]      // 13th+ (clamp)
  ],
  thief: [             // Greyhawk thief table, d6 like every class (Kurt's ruling, Sep 2026)
    [1, 0, "1"],
    [2, 0, "2"],
    [3, 0, "3"],
    [4, 0, "4"],
    [5, 0, "5"],
    [6, 0, "6"],
    [7, 0, "7"],
    [8, 0, "8"],
    [9, 0, "9"],
    [10, 0, "10"],     // Master Thief 10th
    [10, 0, "10"],     // 11th
    [10, 1, "10+1"],   // 12th
    [10, 1, "10+1"],   // 13th
    [10, 2, "10+2"]    // 14th+ (clamp)
  ]
});

/**
 * Accumulative hit dice for a class/level.
 * @param {string} rawClass  free-text class (normalized via classKey)
 * @param {number} level
 * @returns {{dice:number, bonus:number, label:string}}
 */
export function hitDiceFor(rawClass, level) {
  const key = classKey(rawClass);
  const table = HD[key] ?? HD.fighter;
  const idx = Math.min(Math.max(1, Math.trunc(level) || 1), table.length) - 1;
  const [dice, bonus, label] = table[idx];
  return { dice, bonus, label };
}

/**
 * Roll hit points: NdY + bonus (bonus added once to the total).
 * @param {{dice:number, bonus:number}} hd
 * @param {() => number} [rng=Math.random]
 * @param {number} [faces=6]
 */
export function rollHitPoints({ dice, bonus, faces = 6 }, rng = Math.random) {
  const sides = Math.max(2, Math.trunc(faces) || 6);
  let total = 0;
  for (let i = 0; i < dice; i++) total += 1 + Math.floor(rng() * sides);
  return Math.max(1, total + (Math.trunc(bonus) || 0));
}

/** No-roll average max HP for NdY + bonus, floored after summing averages. */
export function deriveMaxHpAverage({ dice, bonus, faces = 6 }) {
  const sides = Math.max(2, Math.trunc(faces) || 6);
  const avg = dice * ((sides + 1) / 2);
  return Math.max(1, Math.floor(avg) + (Math.trunc(bonus) || 0));
}

/* Self-tests — Node only (`node module/rules/hit-dice.mjs`). */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };

  // Fighter column, key rows.
  ok(hitDiceFor("fighter", 1).dice === 1 && hitDiceFor("fighter", 1).bonus === 1, "Veteran 1+1");
  ok(hitDiceFor("fighter", 2).dice === 2 && hitDiceFor("fighter", 2).bonus === 0, "Warrior 2");
  ok(hitDiceFor("fighter", 4).label === "4", "Hero 4");
  ok(hitDiceFor("fighter", 8).dice === 8 && hitDiceFor("fighter", 8).bonus === 2, "Superhero 8+2");
  ok(hitDiceFor("fighter", 9).dice === 9 && hitDiceFor("fighter", 9).bonus === 3, "Lord 9+3");
  ok(hitDiceFor("fighter", 10).label === "10+1", "Lord 10th = 10+1");
  ok(hitDiceFor("fighter", 11).label === "10+3", "11th = 10+3");
  ok(hitDiceFor("fighter", 12).label === "11+1", "12th = 11+1");
  ok(hitDiceFor("fighter", 30).label === "11+3", "fighter clamps");

  // Magic-user column.
  ok(hitDiceFor("magic-user", 1).label === "1", "Medium 1");
  ok(hitDiceFor("MU", 2).label === "1+1", "Seer 1+1");
  ok(hitDiceFor("magic-user", 10).label === "7", "Necromancer 7");
  ok(hitDiceFor("magic-user", 11).label === "8+1", "Wizard 11th = 8+1");
  ok(hitDiceFor("magic-user", 16).label === "9+2", "16th = 9+2");
  ok(hitDiceFor("magic-user", 25).label === "10+1", "MU clamps");

  // Cleric column.
  ok(hitDiceFor("cleric", 1).label === "1", "Acolyte 1");
  ok(hitDiceFor("cleric", 5).label === "4+1", "Curate 4+1");
  ok(hitDiceFor("cleric", 8).label === "7", "Patriarch 7");
  ok(hitDiceFor("cleric", 9).label === "7+1", "Patriarch 9th = 7+1");
  ok(hitDiceFor("cleric", 20).label === "8+2", "cleric clamps");

  // Thief uses its own Greyhawk hit-dice column; race default routes to fighter.
  ok(hitDiceFor("thief", 1).label === "1", "thief 1 = 1 die");
  ok(hitDiceFor("thief", 9).label === "9" && hitDiceFor("thief", 14).label === "10+2", "thief own table: 9th = 9, 14th = 10+2");
  ok(hitDiceFor("dwarf", 4).label === "4", "dwarf on fighter table");

  // rollHitPoints: deterministic dice → known total; bonus added once.
  {
    const hp = rollHitPoints({ dice: 8, bonus: 2 }, forceDice([3, 3, 3, 3, 3, 3, 3, 3]));
    ok(hp === 8 * 3 + 2, "8d6+2 with all 3s = 26");
  }
  ok(rollHitPoints({ dice: 0, bonus: 0 }) === 1, "min 1 HP");
  ok(rollHitPoints({ dice: 1, bonus: 0, faces: 3 }, () => 0.99) === 3, "1d3 supports monster half-HD");

  // deriveMaxHpAverage: 4 dice → floor(14)=14; +bonus.
  ok(deriveMaxHpAverage({ dice: 4, bonus: 0 }) === 14, "avg 4d6 = 14");
  ok(deriveMaxHpAverage({ dice: 1, bonus: 1 }) === 4, "avg 1d6+1 = 4");
  ok(deriveMaxHpAverage({ dice: 1, bonus: 0, faces: 3 }) === 2, "avg 1d3 = 2");
  ok(deriveMaxHpAverage({ dice: 0, bonus: 0 }) === 1, "avg min 1");

  console.log(`hit-dice.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

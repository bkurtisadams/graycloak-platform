/**
 * OD&D — Chainmail engine · Fighting Capability (Men & Magic, p.18-19)
 * odd-chainmail · module/rules/fighting-capability.mjs
 * system 0.1.3 · slice: fc+immunity · stamp 0.1.3-fc.1
 *
 * The Fighting-Capability column rendered into the engine's currency:
 *   attacks — man-rolls on the man-to-man table (the action-dice pool)
 *   bonus   — a "+1" from the "N Men +1" form rides ONE die as a to-hit
 *             bonus, exactly like a monster's HD "+X" (Book II convention)
 *   label   — the table's own words, for the sheet
 *
 * Readings (per odd-foundry-spec.md): explicit "N Men" is used where given;
 * "Hero ±X" / "Superhero ±X" adjusts the count from the anchors Hero = 4,
 * Superhero = 8 (the FCT being dropped, count is all the ± now does).
 *
 * RULING — the "Wizard" tier (MU 10+): Chainmail's literal "fights as two
 * Armored Foot" would drop a Necromancer below the Sorcerer's Hero +1. We
 * read "Wizard" as the (dropped) FCT-row identity and PLATEAU the man-count
 * at the best earned value, 5, with the ± adjusting count: Wizard +1 = 6,
 * Wizard +2 = 7. Swap WIZARD_TIER_ATTACKS to 2 for the Chainmail-literal read.
 *
 * Beyond-table levels follow the "Levels Above those Listed" paragraph where
 * given (fighter 11th as 10th, 12th-13th Superhero +2; cleric 13th Superhero,
 * next change 17th — unspecified, so clamped). Thieves use the Greyhawk thief
 * table's own Fighting Capability column (Kurt's ruling, Sep 2026).
 */

import { classKey } from "./advancement.mjs";

export const WIZARD_TIER_ATTACKS = 5;

const W = WIZARD_TIER_ATTACKS;

/** Per-level [attacks, bonus, label]; index 0 = level 1. Last row clamps upward. */
const FC = Object.freeze({
  fighter: [
    [1, 1, "Man +1"],
    [2, 1, "2 Men +1"],
    [3, 0, "3 Men (Hero -1)"],
    [4, 0, "Hero"],
    [5, 0, "5 Men (Hero +1)"],
    [6, 0, "6 Men (Hero +1)"],
    [7, 0, "Superhero -1"],
    [8, 0, "Superhero"],
    [9, 0, "Superhero +1"],
    [9, 0, "Superhero +1"],   // Lord 10th
    [9, 0, "Superhero +1"],   // 11th fights as 10th
    [10, 0, "Superhero +2"]   // 12th+ (13th unchanged; clamp)
  ],
  "magic-user": [
    [1, 0, "Man"],
    [1, 1, "Man +1"],
    [2, 0, "2 Men"],
    [2, 1, "2 Men +1"],
    [3, 0, "3 Men"],
    [3, 1, "3 Men +1"],
    [3, 0, "Hero -1"],
    [4, 0, "Hero"],
    [5, 0, "Hero +1"],
    [W, 0, "Wizard"],         // Necromancer 10th
    [W, 0, "Wizard"],
    [W, 0, "Wizard"],
    [W, 0, "Wizard"],
    [W + 1, 0, "Wizard +1"],  // 14th
    [W + 1, 0, "Wizard +1"],
    [W + 2, 0, "Wizard +2"]   // 16th+ (clamp)
  ],
  cleric: [
    [1, 0, "Man"],
    [1, 1, "Man +1"],
    [2, 0, "2 Men"],
    [3, 0, "3 Men"],
    [3, 1, "3 Men +1"],
    [3, 0, "Hero -1"],
    [4, 0, "Hero"],
    [5, 0, "Hero +1"],
    [7, 0, "Superhero -1"],   // Patriarch 9th
    [7, 0, "Superhero -1"],   // 10th (11th-12th unchanged)
    [7, 0, "Superhero -1"],
    [7, 0, "Superhero -1"],
    [8, 0, "Superhero"]       // 13th+ (next change 17th unspecified; clamp)
  ],
  thief: [                    // Greyhawk thief table (Kurt's transcription, Sep 2026)
    [1, 0, "Man"],
    [1, 1, "Man +1"],
    [2, 0, "2 Men"],
    [2, 1, "2 Men +1"],
    [3, 0, "3 Men"],
    [3, 1, "3 Men +1"],
    [3, 0, "Hero -1"],
    [4, 0, "Hero"],
    [5, 0, "Hero +1"],
    [7, 0, "Superhero -1"],   // Master Thief 10th
    [7, 0, "Superhero -1"],   // 11th
    [7, 0, "Superhero -1"],   // 12th
    [8, 0, "Superhero"]       // 13th+ (14th unchanged; clamp)
  ]
});

/**
 * Fighting Capability for a class/level.
 * @param {string} rawClass  free-text class (normalized via classKey)
 * @param {number} level
 * @returns {{attacks:number, bonus:number, label:string}}
 */
export function fightingCapabilityFor(rawClass, level) {
  const key = classKey(rawClass);
  const table = FC[key] ?? FC.fighter;
  const idx = Math.min(Math.max(1, Math.trunc(level) || 1), table.length) - 1;
  const [attacks, bonus, label] = table[idx];
  return { attacks, bonus, label };
}

/* Self-tests — Node only; skipped in Foundry. */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };

  // Fighter: tracks level to Superhero +1, +1 bonus rides at 1st-2nd.
  ok(fightingCapabilityFor("fighter", 1).attacks === 1 && fightingCapabilityFor("fighter", 1).bonus === 1, "fighter 1 = Man +1");
  ok(fightingCapabilityFor("fighter", 2).attacks === 2 && fightingCapabilityFor("fighter", 2).bonus === 1, "fighter 2 = 2 Men +1");
  ok(fightingCapabilityFor("fighter", 3).bonus === 0, "fighter 3 drops the pip");
  ok(fightingCapabilityFor("fighter", 4).attacks === 4, "Hero = 4");
  ok(fightingCapabilityFor("fighter", 8).attacks === 8, "Superhero = 8");
  ok(fightingCapabilityFor("fighter", 9).attacks === 9, "Lord = Superhero +1 = 9");
  ok(fightingCapabilityFor("fighter", 11).attacks === 9, "11th fights as 10th");
  ok(fightingCapabilityFor("fighter", 12).attacks === 10, "12th = Superhero +2");
  ok(fightingCapabilityFor("fighter", 30).attacks === 10, "clamps past table");

  // Magic-user: the load-bearing fix — a Necromancer is NOT 10 attacks.
  ok(fightingCapabilityFor("magic-user", 1).attacks === 1, "MU 1 = Man");
  ok(fightingCapabilityFor("MU", 6).attacks === 3 && fightingCapabilityFor("MU", 6).bonus === 1, "Magician = 3 Men +1");
  ok(fightingCapabilityFor("magic-user", 7).attacks === 3 && fightingCapabilityFor("magic-user", 7).bonus === 0, "Enchanter = Hero -1");
  ok(fightingCapabilityFor("magic-user", 9).attacks === 5, "Sorcerer = Hero +1");
  ok(fightingCapabilityFor("magic-user", 10).attacks === WIZARD_TIER_ATTACKS, "Necromancer = Wizard tier");
  ok(fightingCapabilityFor("magic-user", 11).attacks === WIZARD_TIER_ATTACKS, "Wizard 11 plateau");
  ok(fightingCapabilityFor("magic-user", 14).attacks === WIZARD_TIER_ATTACKS + 1, "14th = Wizard +1");
  ok(fightingCapabilityFor("magic-user", 16).attacks === WIZARD_TIER_ATTACKS + 2, "16th = Wizard +2");
  ok(fightingCapabilityFor("magic-user", 25).attacks === WIZARD_TIER_ATTACKS + 2, "MU clamps past table");

  // Cleric.
  ok(fightingCapabilityFor("cleric", 4).attacks === 3, "Vicar = 3 Men");
  ok(fightingCapabilityFor("cleric", 5).bonus === 1, "Curate = 3 Men +1");
  ok(fightingCapabilityFor("cleric", 7).attacks === 4, "Lama = Hero");
  ok(fightingCapabilityFor("cleric", 8).attacks === 5, "Patriarch = Hero +1");
  ok(fightingCapabilityFor("cleric", 9).attacks === 7, "Patriarch 9th = Superhero -1");
  ok(fightingCapabilityFor("cleric", 13).attacks === 8, "13th = Superhero");
  ok(fightingCapabilityFor("cleric", 20).attacks === 8, "cleric clamps past table");

  // Thief uses its own Greyhawk FC column; race defaults route to fighter.
  ok(fightingCapabilityFor("thief", 9).attacks === 5, "thief 9 Hero +1 (own table)");
  ok(fightingCapabilityFor("thief", 2).bonus === 1 && fightingCapabilityFor("thief", 2).label === "Man +1", "thief 2 Man +1");
  ok(fightingCapabilityFor("thief", 10).label === "Superhero -1" && fightingCapabilityFor("thief", 13).label === "Superhero", "thief 10 Superhero -1, 13 Superhero");
  ok(fightingCapabilityFor("dwarf", 4).attacks === 4, "dwarf on the fighter table");

  console.log(`fighting-capability.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

/**
 * OD&D — Chainmail engine · turn undead (Clerics vs. Undead Monsters)
 * odd-chainmail · module/rules/turn-undead.mjs
 * system 0.1.117 · slice: turn-undead-row · stamp 0.1.117-turn-undead-row.1
 *
 * Men & Magic p.22, verbatim from Kurt's transcription. Columns are cleric
 * levels 1-8 (Acolyte … Patriarch); cells hold the 2d6 score to match-or-exceed
 * to turn, or a letter:
 *   number  roll 2d6 >= it to turn the monster away
 *   "T"     turned away automatically, up to two dice (2d6) in number
 *   "D"     dispelled / dissolved (destroyed), up to two dice (2d6) in number
 *   "N"     no effect
 * There is no separate Greyhawk table — this is the only undead-turning table,
 * so the row ships ungated (core LBB cleric ability). RULES-CALLS (referee-
 * overridable, surfaced here not buried): (a) clerics above Patriarch (lvl > 8)
 * read the Patriarch column — the printed table simply stops; (b) "up to two
 * dice in number" is taken as a 2d6 roll for the count, on numeric successes
 * as well as T/D; (c) "evil Clerics" lose the effect entirely — mapped to this
 * system's Chaos alignment (see clericCanTurn). No Foundry deps: the caller owns
 * the dice and the chat card.
 */

/** Undead rows, level-1..8 columns left-to-right. `label` is the i18n suffix. */
export const UNDEAD_TYPES = Object.freeze([
  Object.freeze({ key: "skeleton", label: "ODDCM.Undead.Skeleton", row: Object.freeze([7, "T", "T", "D", "D", "D", "D", "D"]) }),
  Object.freeze({ key: "zombie",   label: "ODDCM.Undead.Zombie",   row: Object.freeze([9, 7, "T", "T", "D", "D", "D", "D"]) }),
  Object.freeze({ key: "ghoul",    label: "ODDCM.Undead.Ghoul",    row: Object.freeze([11, 9, 7, "T", "T", "D", "D", "D"]) }),
  Object.freeze({ key: "wight",    label: "ODDCM.Undead.Wight",    row: Object.freeze(["N", 11, 9, 7, "T", "T", "D", "D"]) }),
  Object.freeze({ key: "wraith",   label: "ODDCM.Undead.Wraith",   row: Object.freeze(["N", "N", 11, 9, 7, "T", "T", "D"]) }),
  Object.freeze({ key: "mummy",    label: "ODDCM.Undead.Mummy",    row: Object.freeze(["N", "N", "N", 11, 9, 7, "T", "T"]) }),
  Object.freeze({ key: "spectre",  label: "ODDCM.Undead.Spectre",  row: Object.freeze(["N", "N", "N", "N", 11, 9, 7, "T"]) }),
  Object.freeze({ key: "vampire",  label: "ODDCM.Undead.Vampire",  row: Object.freeze(["N", "N", "N", "N", "N", 11, 9, 7]) })
]);

/** Dice rolled for "up to two dice in number" affected, and for the turn check. */
export const TURN_DICE = "2d6";

const BY_KEY = Object.freeze(Object.fromEntries(UNDEAD_TYPES.map((u) => [u.key, u])));

/**
 * Resolve the table cell for a cleric level vs. an undead key.
 * @returns {{outcome: "turn"|"auto-turn"|"destroy"|"none", target: number|null, cell: (number|string)}}
 *   turn      numeric cell — roll 2d6 >= target to turn
 *   auto-turn "T" — turned automatically
 *   destroy   "D" — dispelled / dissolved
 *   none      "N" — no effect (or unknown undead key)
 */
export function turnResult(level, undeadKey) {
  const u = BY_KEY[undeadKey];
  if (!u) return { outcome: "none", target: null, cell: "N" };
  const col = Math.min(8, Math.max(1, Math.trunc(Number(level)) || 1)) - 1; // lvl > 8 -> Patriarch
  const cell = u.row[col];
  if (cell === "N") return { outcome: "none", target: null, cell };
  if (cell === "T") return { outcome: "auto-turn", target: null, cell };
  if (cell === "D") return { outcome: "destroy", target: null, cell };
  return { outcome: "turn", target: cell, cell };
}

/**
 * RAW: "evil Clerics do not have this effect, the entire effect being lost."
 * This system's alignment axis is Law / Neutral / Chaos, so evil maps to Chaos.
 * Lawful and neutral clerics turn normally. Referee-overridable upstream.
 */
export function clericCanTurn(alignment) {
  return String(alignment ?? "").toLowerCase() !== "chaos";
}

/* Self-tests — Node only. */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`turn-undead.mjs FAIL: ${l}`); pass++; };

  // Numeric / T / D / N reads across the table corners and diagonal.
  ok(turnResult(1, "skeleton").outcome === "turn" && turnResult(1, "skeleton").target === 7, "skeleton @1 = turn 7");
  ok(turnResult(2, "skeleton").outcome === "auto-turn", "skeleton @2 = T");
  ok(turnResult(4, "skeleton").outcome === "destroy", "skeleton @4 = D");
  ok(turnResult(1, "zombie").target === 9 && turnResult(2, "zombie").target === 7, "zombie @1=9 @2=7");
  ok(turnResult(1, "ghoul").target === 11, "ghoul @1 = 11");
  ok(turnResult(1, "wight").outcome === "none", "wight @1 = N");
  ok(turnResult(2, "wight").target === 11 && turnResult(4, "wight").target === 7, "wight @2=11 @4=7");
  ok(turnResult(5, "vampire").outcome === "none" && turnResult(6, "vampire").target === 11, "vampire @5=N @6=11");
  ok(turnResult(8, "vampire").target === 7, "vampire @8 (Patriarch) = 7");
  ok(turnResult(8, "spectre").outcome === "auto-turn" && turnResult(8, "mummy").outcome === "auto-turn", "spectre/mummy @8 = T");
  ok(turnResult(8, "skeleton").outcome === "destroy", "skeleton @8 = D");

  // Level clamps: > 8 -> Patriarch column; < 1 -> Acolyte column.
  ok(turnResult(12, "vampire").target === 7 && turnResult(12, "skeleton").outcome === "destroy", "lvl>8 reads Patriarch");
  ok(turnResult(0, "skeleton").target === 7 && turnResult(-3, "zombie").target === 9, "lvl<1 reads Acolyte");

  // Unknown undead is inert, never throws.
  ok(turnResult(8, "lich").outcome === "none", "unknown undead -> none");

  // Evil (Chaos) clerics lose turning; law/neutral keep it.
  ok(!clericCanTurn("chaos") && clericCanTurn("law") && clericCanTurn("neutral"), "chaos cannot turn; law/neutral can");
  ok(clericCanTurn("") && clericCanTurn(undefined), "blank/undefined alignment defaults to able");

  console.log(`turn-undead.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

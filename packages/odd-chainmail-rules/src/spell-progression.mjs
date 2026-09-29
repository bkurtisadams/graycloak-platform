/**
 * OD&D — Chainmail engine · spell slot progression
 * odd-chainmail · module/rules/spell-progression.mjs
 * system 0.1.105 · slice: spell-slots · stamp 0.1.105-spell-slots.1
 *
 * The Men & Magic "Spells & Levels" matrix, encoded verbatim. slotsFor returns
 * the per-spell-level capacity array for a caster (index 0 = 1st-level spells,
 * index 1 = 2nd, ...). This is a HARD cap: a character may memorize no more
 * than this many spells of each level for an adventuring day.
 */

// Magic-User: level -> [slots at spell level 1, 2, 3, 4, 5, 6].
const MU = {
  1: [1], 2: [2], 3: [3, 1], 4: [4, 2], 5: [4, 2, 1], 6: [4, 2, 2],
  7: [4, 3, 2, 1], 8: [4, 3, 3, 2], 9: [4, 3, 3, 2, 1], 10: [4, 4, 3, 3, 2],
  11: [4, 4, 4, 3, 3], 12: [4, 4, 4, 4, 4, 1], 13: [5, 5, 5, 4, 4, 2],
  14: [5, 5, 5, 4, 4, 3], 15: [5, 5, 5, 4, 4, 4], 16: [5, 5, 5, 5, 5, 5],
  17: [6, 6, 6, 5, 5, 5], 18: [6, 6, 6, 6, 6, 6]
};
const MU_MAX = 18;

// Cleric: level -> [slots at spell level 1, 2, 3, 4, 5]. Acolyte (1st) casts none.
const CLERIC = {
  1: [], 2: [1], 3: [2], 4: [2, 1], 5: [2, 2], 6: [2, 2, 1, 1], 7: [2, 2, 2, 1, 1],
  8: [2, 2, 2, 2, 2], 9: [3, 3, 3, 2, 2], 10: [3, 3, 3, 3, 3], 11: [4, 4, 4, 3, 3],
  12: [4, 4, 4, 4, 4], 13: [5, 5, 5, 4, 4]
};
const CLERIC_MAX = 13;

/** Per-spell-level capacity array for a caster class + level (RAW hard cap). */
export function slotsFor(rawClass, level) {
  const isCleric = String(rawClass || "").toLowerCase() === "cleric";
  const table = isCleric ? CLERIC : MU;
  const max = isCleric ? CLERIC_MAX : MU_MAX;
  const lvl = Math.max(1, Math.min(max, Math.floor(Number(level) || 1)));
  return (table[lvl] ?? []).slice();
}

// ── self-tests ───────────────────────────────────────────────────────────────
export function runSelfTests() {
  let pass = 0;
  const ok = (cond, msg) => { if (!cond) throw new Error(`spell-progression: ${msg}`); pass++; };
  const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), msg);

  eq(slotsFor("magic-user", 1), [1], "MU 1 = 1");
  eq(slotsFor("magic-user", 6), [4, 2, 2], "MU 6 Magician = 4/2/2");
  eq(slotsFor("magic-user", 11), [4, 4, 4, 3, 3], "MU 11 Wizard = 4/4/4/3/3");
  eq(slotsFor("magic-user", 12), [4, 4, 4, 4, 4, 1], "MU 12 opens 6th");
  eq(slotsFor("magic-user", 16), [5, 5, 5, 5, 5, 5], "MU 16 = fives");
  eq(slotsFor("magic-user", 17), [6, 6, 6, 5, 5, 5], "MU 17 = 6/6/6/5/5/5");
  eq(slotsFor("magic-user", 25), [6, 6, 6, 6, 6, 6], "MU clamps to 18 = sixes");

  eq(slotsFor("cleric", 1), [], "Cleric 1 Acolyte = none");
  eq(slotsFor("cleric", 2), [1], "Cleric 2 Adept = 1");
  eq(slotsFor("cleric", 6), [2, 2, 1, 1], "Cleric 6 Bishop = 2/2/1/1");
  eq(slotsFor("cleric", 8), [2, 2, 2, 2, 2], "Cleric 8 Patriarch = 2/2/2/2/2");
  eq(slotsFor("cleric", 13), [5, 5, 5, 4, 4], "Cleric 13 = 5/5/5/4/4");
  eq(slotsFor("cleric", 20), [5, 5, 5, 4, 4], "Cleric clamps to 13");

  console.log(`spell-progression.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

/**
 * OD&D — Chainmail engine · level titles & XP thresholds
 * odd-chainmail · module/rules/advancement.mjs
 * system 0.1.163 · slice: settle-adventure-cap · stamp 0.1.163-settle-adventure-cap.1
 *
 * Men & Magic level/title/XP tables. Dwarves, halflings, and (by default)
 * elves advance on the fighting-man table. Name levels (above the printed
 * table) cost a flat increment per level equal to the class's top threshold
 * (Greyhawk: thief 125k/level past the table; F 240k, MU 300k, C 100k by the
 * same rule) — no cap.
 */

const PROGRESSION = Object.freeze({
  fighter: [
    ["Veteran", 0], ["Warrior", 2000], ["Swordsman", 4000], ["Hero", 8000], ["Swashbuckler", 16000],
    ["Myrmidon", 32000], ["Champion", 64000], ["Superhero", 120000], ["Lord", 240000]
  ],
  "magic-user": [
    ["Medium", 0], ["Seer", 2500], ["Conjurer", 5000], ["Theurgist", 10000], ["Thaumaturgist", 20000],
    ["Magician", 35000], ["Enchanter", 50000], ["Warlock", 75000], ["Sorcerer", 100000], ["Necromancer", 200000], ["Wizard", 300000]
  ],
  cleric: [
    ["Acolyte", 0], ["Adept", 1500], ["Village Priest", 3000], ["Vicar", 6000], ["Curate", 12000],
    ["Bishop", 25000], ["Lama", 50000], ["Patriarch", 100000]
  ],
  thief: [
    ["Apprentice", 0], ["Footpad", 1200], ["Robber", 2400], ["Burglar", 4800], ["Cutpurse", 9600],
    ["Sharper", 20000], ["Pilferer", 40000], ["Master Pilferer", 60000], ["Thief", 90000], ["Master Thief", 125000]
  ]
});

/** Normalize a free-text class to a progression key. */
export function classKey(raw) {
  const s = String(raw ?? "").toLowerCase().trim();
  if (/magic|^mu$|mage|wizard/.test(s)) return "magic-user";
  if (s.includes("cleric")) return "cleric";
  if (s.includes("thief")) return "thief";
  return "fighter"; // fighting-man, dwarf, halfling, elf (default)
}

function clampIndex(prog, level) {
  return Math.min(Math.max(1, Math.trunc(level) || 1), prog.length) - 1;
}

/** Title name for a class/level (clamped to the table). */
export function titleFor(rawClass, level) {
  const prog = PROGRESSION[classKey(rawClass)];
  return prog[clampIndex(prog, level)][0];
}

/** XP required to be at this level. Name levels (past the printed table) cost a
 *  flat increment per level equal to the class's top threshold, with no cap. */
export function xpThreshold(rawClass, level) {
  const prog = PROGRESSION[classKey(rawClass)];
  const lv = Math.max(1, Math.trunc(level) || 1);
  if (lv <= prog.length) return prog[lv - 1][1];
  const inc = prog[prog.length - 1][1];           // top threshold = name-level increment
  return inc * (lv - prog.length + 1);
}

/** XP required for the next level. Never null — name levels continue forever. */
export function nextThreshold(rawClass, level) {
  return xpThreshold(rawClass, Math.max(1, Math.trunc(level) || 1) + 1);
}

/** The level a given XP total buys for a class (1+, uncapped by race here —
 *  the model clamps to the racial maximum). Within the table it's a lookup;
 *  past the top it extrapolates on the flat name-level increment. */
export function levelForXp(rawClass, xp) {
  const prog = PROGRESSION[classKey(rawClass)];
  const x = Math.max(0, Math.trunc(Number(xp)) || 0);
  const top = prog[prog.length - 1][1];
  if (x >= top) return prog.length - 1 + Math.floor(x / top); // name levels
  let lvl = 1;
  for (let i = 0; i < prog.length; i++) { if (x >= prog[i][1]) lvl = i + 1; else break; }
  return lvl;
}

/** Title of the next level, or null past the table. */
export function nextTitle(rawClass, level) {
  const prog = PROGRESSION[classKey(rawClass)];
  const lv = Math.max(1, Math.trunc(level) || 1);
  return lv < prog.length ? prog[lv][0] : null;
}

/**
 * One-level-per-adventure cap (HANDOFF §7 step 4): an award may not carry a
 * character's total to or past the threshold for currentLevel + 2 — at most one
 * level may be gained per adventure. Returns the awardable portion of `amount`
 * (≥ 0; pass the already-prime-%-adjusted amount).
 *
 * The ceiling is (threshold[currentLevel + 2] − 1). Name-level thresholds are
 * defined (flat increment, no table cap), so the one-level cap now applies at
 * every level — the null guard is defensive only.
 */
export function cappedAward(rawClass, currentLevel, currentXp, amount) {
  const lvl = Math.max(1, Math.trunc(currentLevel) || 1);
  const xp = Math.max(0, Math.trunc(currentXp) || 0);
  const amt = Math.max(0, Math.trunc(amount) || 0);
  const twoUp = nextThreshold(rawClass, lvl + 1); // threshold to REACH level+2
  if (twoUp == null) return amt;                  // defensive (no longer reachable)
  return Math.min(amt, Math.max(0, (twoUp - 1) - xp));
}

/* Self-tests — Node only. */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };

  ok(titleFor("fighter", 4) === "Hero", "fighter 4 = Hero");
  ok(xpThreshold("fighter", 4) === 8000, "fighter 4 xp 8000");
  ok(nextThreshold("fighter", 4) === 16000, "fighter 4 next 16000");
  ok(nextTitle("fighter", 4) === "Swashbuckler", "fighter 4 next = Swashbuckler");
  ok(titleFor("magic-user", 8) === "Warlock", "mu 8 = Warlock");
  ok(nextThreshold("magic-user", 8) === 100000, "mu 8 next 100000");
  ok(titleFor("cleric", 1) === "Acolyte", "cleric 1 = Acolyte");
  ok(nextThreshold("cleric", 8) === 200000, "cleric 8 next = name-level (100k inc)");
  ok(titleFor("thief", 10) === "Master Thief", "thief 10 = Master Thief");
  ok(nextThreshold("thief", 10) === 250000, "thief 10 next = name-level (125k inc)");
  ok(classKey("Fighting-Man") === "fighter", "fighting-man -> fighter");
  ok(classKey("MU") === "magic-user", "MU -> magic-user");
  ok(classKey("dwarf") === "fighter", "dwarf -> fighter");
  ok(titleFor("fighter", 99) === "Lord", "title clamps to Lord");

  // Name-level XP thresholds (flat increment = top threshold).
  ok(xpThreshold("fighter", 10) === 480000, "fighter 10 = 480k");
  ok(xpThreshold("fighter", 11) === 720000, "fighter 11 = 720k");
  ok(xpThreshold("cleric", 9) === 200000, "cleric 9 = 200k");
  ok(xpThreshold("thief", 11) === 250000, "thief 11 = 250k");

  // levelForXp — table lookup then name-level extrapolation.
  ok(levelForXp("fighter", 0) === 1, "0 xp = L1");
  ok(levelForXp("fighter", 1999) === 1, "just under L2");
  ok(levelForXp("fighter", 2000) === 2, "exactly L2");
  ok(levelForXp("fighter", 8000) === 4, "fighter 8000 = Hero");
  ok(levelForXp("fighter", 239999) === 8, "just under Lord");
  ok(levelForXp("fighter", 240000) === 9, "exactly Lord");
  ok(levelForXp("fighter", 480000) === 10, "fighter name L10");
  ok(levelForXp("magic-user", 300000) === 11, "MU exactly Wizard");
  ok(levelForXp("magic-user", 600000) === 12, "MU name L12");
  ok(levelForXp("thief", 250000) === 11, "thief name L11");

  // §7 step 4 — one-level-per-adventure cap.
  // Fighter L5 (xp 16000): ceiling = threshold[7] − 1 = 63999, room = 47999.
  ok(cappedAward("fighter", 5, 16000, 100000) === 47999, "L5 fighter capped to reach L6, not L7");
  ok(cappedAward("fighter", 5, 16000, 1000) === 1000, "small award passes under the cap");
  // Reaching exactly the cap leaves you below level+2.
  ok(16000 + cappedAward("fighter", 5, 16000, 100000) === 63999, "capped total stays under L7 threshold (64000)");
  // Name levels are now capped too (thresholds defined past the table).
  ok(cappedAward("fighter", 9, 240000, 500000) === 479999, "L9 fighter capped to reach L10, not L11");
  ok(cappedAward("fighter", 8, 120000, 500000) === 359999, "L8 fighter capped to reach L9... not L10");
  // Cleric L6 (xp 12000): threshold[8] = 100000 → ceiling 99999, room 87999.
  ok(cappedAward("cleric", 6, 12000, 200000) === 87999, "L6 cleric capped to reach L7, not L8");
  ok(cappedAward("fighter", 5, 16000, -50) === 0, "negative award floors to 0");

  // RAW veteran (U&WA): a 1st-level fighter at 0 XP whose raw award (5,000)
  // would cross two levels is capped to just under L3 → 3,999.
  ok(cappedAward("fighter", 1, 0, 5000) === 3999, "veteran capped to warrior (3999)");

  // Per-ADVENTURE cap must anchor to the adventure-START level, not the live
  // level. Two rooms settled in one adventure: capping against the LIVE level
  // leaks a second level; capping against the frozen baseline does not.
  const room = (lvlOf, xp, amt) => cappedAward("fighter", lvlOf(xp), xp, amt);
  const live = (xp) => levelForXp("fighter", xp);  // bug: ceiling tracks upward
  const base1 = () => 1;                            // fix: frozen at start level
  let lx = 0; lx += room(live, lx, 3999); lx += room(live, lx, 100000);
  ok(levelForXp("fighter", lx) === 3, "live-level cap LEAKS to L3 across two rooms");
  let bx = 0; bx += room(base1, bx, 3999); bx += room(base1, bx, 100000);
  ok(levelForXp("fighter", bx) === 2, "baseline cap holds at L2 across two rooms");

  console.log(`advancement.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

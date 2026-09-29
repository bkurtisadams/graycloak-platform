/**
 * OD&D — Chainmail engine · encounter XP derivation (monster side)
 * odd-chainmail · module/rules/encounter-xp.mjs
 * system 0.1.164 · slice: monster-qty · stamp 0.1.164-monster-qty.1
 *
 * Pure XP math for the encounter-settlement subsystem (HANDOFF §1, §2, §5).
 * No Foundry deps — Node-testable. RULED rules only; one OPEN item flagged.
 *
 * CRITICAL ASYMMETRY (HANDOFF §1): the XP-level is NOT the attack-count HD.
 * A troll (6+3) attacks 6 times but its XP-level is 7. The combat engine keeps
 * its own attack-count derivation (one roll per BASE die); this module is the
 * separate XP derivation and must never be reused for attacks.
 */

/** Normalize an {count, bonus} HD shape, tolerating partial/garbage input. */
function hd(hitDice) {
  const count = Math.trunc(Number(hitDice?.count) || 0);
  const bonus = Math.trunc(Number(hitDice?.bonus) || 0);
  return { count, bonus };
}

/**
 * Monster XP-level from Hit Dice (HANDOFF §1, RULED):
 *   XP-level = full HD + 1 if there is any "+" pip bonus.
 * A negative ("−") pip does NOT subtract a level (1−1 stays at its base die).
 * Returns the raw formula value (may be 0 for a count-0 sub-1-HD stub); callers
 * that need the ratio numerator use oppositionLevel(), which floors at 1.
 */
export function monsterXpLevel(hitDice) {
  const { count, bonus } = hd(hitDice);
  return count + (bonus > 0 ? 1 : 0);
}

/**
 * Opposition level — the ratio numerator (HANDOFF §5, with the §1-OPEN floor):
 * the encounter's difficulty tier is set by its scariest monster's XP-level,
 * floored at 1 (the relative-level ratio never divides by a level below 1).
 */
export function oppositionLevel(hitDice) {
  return Math.max(1, monsterXpLevel(hitDice));
}

/**
 * Kill value in XP (HANDOFF §2, RULED): XP-level × 100. Worked troll example,
 * 7 × 100 = 700. Greyhawk Sup-I per-monster values are a future gated
 * alternative (xpMonsterTable: lbb | greyhawk); LBB is the default and the only
 * table implemented here.
 *
 * OPEN (HANDOFF §1, §13.1): sub-1-HD kill value — round-to-level-1 (this code,
 * 100 XP floor) vs prorate (½ → 50). Implemented default is round-to-1; when
 * Kurt rules prorate, change ONLY the floored level below.
 */
export function killValue(hitDice) {
  return Math.max(1, monsterXpLevel(hitDice)) * 100;
}

/**
 * Sum of kill values for an array of monster HD shapes (the kill pool input,
 * HANDOFF §3). Each row may carry a `qty` (number appearing); its contribution
 * is qty × killValue(hd). A missing/null qty counts as 1 (backward-compatible);
 * qty 0 contributes nothing. Tolerates an empty/missing array.
 */
export function killPool(monsters) {
  if (!Array.isArray(monsters)) return 0;
  return monsters.reduce((sum, m) => {
    const qty = m?.qty == null ? 1 : Math.max(0, Math.trunc(Number(m.qty)) || 0);
    return sum + qty * killValue(m);
  }, 0);
}

/* Self-tests — Node only. */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`encounter-xp.mjs FAIL: ${l}`); pass++; };
  const lvl = (count, bonus) => monsterXpLevel({ count, bonus });

  // §1 table — XP-level = full HD + 1 only on a "+" pip.
  ok(lvl(6, 3) === 7, "troll 6+3 -> 7");
  ok(lvl(4, 1) === 5, "ogre 4+1 -> 5");
  ok(lvl(5, 1) === 6, "mummy 5+1 -> 6");
  ok(lvl(6, 1) === 7, "basilisk/manticore 6+1 -> 7");
  ok(lvl(1, 2) === 2, "hobgoblin/gnoll 1+2 -> 2");
  ok(lvl(7, 1) === 8, "djinn 7+1 -> 8");
  ok(lvl(6, 0) === 6, "spectre 6 -> 6");
  ok(lvl(7, 0) === 7, "wyvern 7 -> 7");
  ok(lvl(8, 2) === 9 && lvl(12, 2) === 13, "giants 8+2..12+2 -> 9..13");

  // Negative pip does not subtract a level; floor handles the ratio numerator.
  ok(lvl(1, -1) === 1, "1-1 stays level 1 (no '−' subtraction)");
  ok(monsterXpLevel({ count: 0, bonus: 0 }) === 0, "raw level can be 0 (sub-1 stub)");
  ok(oppositionLevel({ count: 0, bonus: 0 }) === 1, "opposition level floors at 1");

  // §2 kill value = level × 100 (worked fixtures from §8).
  ok(killValue({ count: 6, bonus: 3 }) === 700, "troll kill value 700");
  ok(killValue({ count: 3, bonus: 0 }) === 300, "wight kill value 300");
  ok(killValue({ count: 0, bonus: 0 }) === 100, "sub-1 round-to-1 = 100 (OPEN default)");

  // §3 kill pool sums; tolerant of junk.
  ok(killPool([{ count: 6, bonus: 3 }, { count: 3, bonus: 0 }]) === 1000, "kill pool sum");
  ok(killPool([]) === 0 && killPool(undefined) === 0, "empty/missing pool = 0");

  // qty (number appearing) multiplies each row's kill value.
  ok(killPool([{ count: 1, bonus: 0, qty: 18 }]) === 1800, "18 orcs = 18 × 100");
  ok(killPool([{ count: 6, bonus: 3, qty: 2 }]) === 1400, "2 trolls = 2 × 700");
  ok(killPool([{ count: 3, bonus: 0 }]) === 300, "missing qty defaults to 1");
  ok(killPool([{ count: 1, bonus: 0, qty: 0 }]) === 0, "qty 0 contributes nothing");

  console.log(`encounter-xp.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

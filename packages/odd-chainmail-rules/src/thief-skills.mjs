/**
 * OD&D — Chainmail engine · thief skills (Supplement I: Greyhawk)
 * odd-chainmail · module/rules/thief-skills.mjs
 * system 0.1.120 · slice: thief-abilities-reconcile · stamp 0.1.120-thief-abilities-reconcile.1
 *
 * Sup-I "Other Statistics Regarding Thieves", verbatim from Kurt's
 * transcription. Six skills by thief level 1-14. In the book Pick Pockets and
 * Move Silently share one base column ("Pickpocket or Move Silently"); they
 * carry the same base here and diverge only through the racial modifiers below.
 * Hear Noise is the high end of a d6 range ("1-2" -> 2): success on a d6 roll at
 * or under it. The five percentage skills resolve d100 roll-under (footnote *:
 * a score ABOVE the listed percentage is failure, one attempt only).
 *
 * RULES-CALLS (referee-overridable, surfaced not buried): (a) levels above 14
 * read the 14th-level row — the printed table stops there; (b) "dash" entries
 * in the racial table are read as no modifier (0); (c) the pickpocket victim
 * penalty (-5% per victim level over 5th, footnote *) is provided as a pure
 * helper but not auto-applied on the sheet — the sheet can't know the mark's
 * level, so it's left to the GM. No Foundry deps: caller owns dice + chat.
 */

/** Skill keys in display order. pickPockets and moveSilently share a base. */
export const THIEF_SKILL_KEYS = Object.freeze([
  "openLocks", "removeTraps", "pickPockets", "moveSilently", "hideInShadows", "hearNoise"
]);

/** True for the d6 (range-in-6) skill; the rest are d100 percentages. */
export const HEAR_NOISE = "hearNoise";

/** Rows are level 1..14: [openLocks, removeTraps, pickPockets/moveSilently, hideInShadows, hearNoise]. */
const ROWS = Object.freeze([
  Object.freeze([15, 10, 20, 10, 2]),   // 1  Apprentice
  Object.freeze([20, 15, 25, 15, 2]),   // 2  Footpad
  Object.freeze([25, 20, 30, 20, 3]),   // 3  Robber       ** read languages
  Object.freeze([35, 30, 35, 25, 3]),   // 4  Burglar
  Object.freeze([40, 35, 45, 35, 3]),   // 5  Cutpurse
  Object.freeze([45, 40, 55, 45, 3]),   // 6  Sharper
  Object.freeze([55, 50, 60, 50, 4]),   // 7  Pilferer
  Object.freeze([65, 60, 65, 55, 4]),   // 8  Master Pilferer
  Object.freeze([75, 70, 75, 65, 4]),   // 9  Thief         *** read scrolls
  Object.freeze([85, 80, 85, 75, 4]),   // 10 Master Thief
  Object.freeze([95, 90, 95, 85, 5]),   // 11 Master Thief, 11th
  Object.freeze([100, 95, 100, 90, 5]), // 12 Master Thief, 12th
  Object.freeze([100, 100, 100, 95, 6]),// 13 Master Thief, 13th
  Object.freeze([100, 100, 100, 100, 6])// 14 Master Thief, 14th
]);

/** Racial adjustments added to the base (dash in the book = 0). Halfling's
 *  Hear Noise +1 is a die-range step, not a percentage. */
const RACIAL = Object.freeze({
  dwarf:    Object.freeze({ openLocks: 5, removeTraps: 15, pickPockets: 0, moveSilently: 5, hideInShadows: 5, hearNoise: 0 }),
  elf:      Object.freeze({ openLocks: 0, removeTraps: 0, pickPockets: 5, moveSilently: 10, hideInShadows: 15, hearNoise: 0 }),
  halfling: Object.freeze({ openLocks: 10, removeTraps: 5, pickPockets: 5, moveSilently: 10, hideInShadows: 10, hearNoise: 1 })
});

const clampPct = (n) => Math.max(0, Math.min(100, n));
const clampSix = (n) => Math.max(0, Math.min(6, n));

/**
 * Resolved thief skills for a level + race: base row plus racial modifier,
 * clamped (percentages 0-100, hear noise 0-6).
 * @returns {{openLocks,removeTraps,pickPockets,moveSilently,hideInShadows,hearNoise: number}}
 */
export function thiefSkills(level, race) {
  const row = ROWS[Math.min(14, Math.max(1, Math.trunc(Number(level)) || 1)) - 1];
  const m = RACIAL[String(race ?? "").toLowerCase()] ?? {};
  const [ol, rt, ppms, his, hn] = row;
  return {
    openLocks: clampPct(ol + (m.openLocks ?? 0)),
    removeTraps: clampPct(rt + (m.removeTraps ?? 0)),
    pickPockets: clampPct(ppms + (m.pickPockets ?? 0)),
    moveSilently: clampPct(ppms + (m.moveSilently ?? 0)),
    hideInShadows: clampPct(his + (m.hideInShadows ?? 0)),
    hearNoise: clampSix(hn + (m.hearNoise ?? 0))
  };
}

/** Footnote *: pickpocketing a mark above 5th level costs 5% per level over 5. */
export function pickPocketVsLevel(pct, victimLevel) {
  return clampPct(pct - Math.max(0, (Math.trunc(Number(victimLevel) || 0)) - 5) * 5);
}

/** Footnote **: thieves read most (80%) non-magical languages from 3rd level. */
export function canReadLanguages(level) { return (Math.trunc(Number(level)) || 0) >= 3; }
/**
 * Thieves understand magical writings (non-clerical scrolls) from 10th level.
 * Kurt's ruling resolves the source conflict in favour of the prose text
 * (10th), over the skill table's "***" on the 9th-level row. Scrolls of 7th
 * level and above carry a 10% chance the effect reverses (known only after
 * reading) — surfaced for the GM; there is no scroll-use mechanic to hook yet.
 */
export function canReadScrolls(level) { return (Math.trunc(Number(level)) || 0) >= 10; }

/* Self-tests — Node only. */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`thief-skills.mjs FAIL: ${l}`); pass++; };

  const a = thiefSkills(1, "human");
  ok(a.openLocks === 15 && a.removeTraps === 10 && a.pickPockets === 20 && a.moveSilently === 20 && a.hideInShadows === 10 && a.hearNoise === 2, "Apprentice human row");
  const t9 = thiefSkills(9, "human");
  ok(t9.openLocks === 75 && t9.removeTraps === 70 && t9.hideInShadows === 65 && t9.hearNoise === 4, "Thief (9) human row");
  const t14 = thiefSkills(14, "human");
  ok(t14.openLocks === 100 && t14.hideInShadows === 100 && t14.hearNoise === 6, "Master Thief 14th maxes out");

  // Pick Pockets / Move Silently share a base, diverge by race.
  ok(thiefSkills(1, "human").pickPockets === thiefSkills(1, "human").moveSilently, "PP == MS for humans (shared base)");
  const e1 = thiefSkills(1, "elf");
  ok(e1.pickPockets === 25 && e1.moveSilently === 30 && e1.hideInShadows === 25, "elf: PP 20+5, MS 20+10, HiS 10+15");
  const d1 = thiefSkills(1, "dwarf");
  ok(d1.removeTraps === 25 && d1.pickPockets === 20 && d1.openLocks === 20, "dwarf: RT 10+15, PP unchanged, OL 15+5");
  const h1 = thiefSkills(1, "halfling");
  ok(h1.hearNoise === 3 && h1.openLocks === 25, "halfling: HN 2+1, OL 15+10");

  // Clamps: percentages cap at 100; level clamps to 1..14.
  ok(thiefSkills(13, "halfling").openLocks === 100, "racial bonus clamps at 100");
  ok(thiefSkills(99, "human").openLocks === thiefSkills(14, "human").openLocks, "level > 14 reads 14th row");
  ok(thiefSkills(0, "human").openLocks === thiefSkills(1, "human").openLocks, "level < 1 reads 1st row");

  // Footnotes.
  ok(pickPocketVsLevel(75, 10) === 50 && pickPocketVsLevel(75, 5) === 75 && pickPocketVsLevel(75, 3) === 75, "pickpocket vs victim level");
  ok(canReadLanguages(3) && !canReadLanguages(2), "read languages from 3rd");
  ok(canReadScrolls(10) && !canReadScrolls(9), "read scrolls from 10th");

  console.log(`thief-skills.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

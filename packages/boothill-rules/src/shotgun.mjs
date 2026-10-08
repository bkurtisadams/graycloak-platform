/**
 * BOOT HILL 2e · shotgun and scatter gun fire
 * Field of fire widens with range (Target Selection). Every target inside it
 * rolls to hit separately; each hit rolls d10 on the Shotgun/Scatter Gun
 * Effects Table for the number of wounds, each wound rolled on the Wound Chart.
 * Effects Table transcribed from the scan of the printed page. At the longest
 * ranges a hit can still leave no wound (a 0 on the table).
 */
import { makeChecker, isMain } from "./selftest.mjs";

/** width = spaces (inches) across the field; "single" = one target only. */
export const FIELD_OF_FIRE = Object.freeze({
  shotgun: { short: "single", medium: 1, long: 3, extreme: 3 },
  scatter: { short: 1, medium: 3, long: 5, extreme: 5 }
});

export function fieldOfFire(spread, band) {
  const f = FIELD_OF_FIRE[spread]?.[band];
  if (f == null) throw new Error(`fieldOfFire: unknown ${spread}/${band}`);
  return f === "single" ? { single: true, width: null } : { single: false, width: f };
}

/** Wounds by d10 roll (index 0 = a roll of 1, index 9 = 10), per range band. */
export const SPREAD_EFFECTS = Object.freeze({
  scatter: {
    short:   [1, 1, 1, 1, 2, 2, 2, 2, 3, 3],
    medium:  [1, 1, 1, 1, 1, 1, 1, 2, 2, 2],
    long:    [0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
    extreme: [0, 0, 0, 0, 1, 1, 1, 1, 1, 1]
  },
  shotgun: {
    short:   [1, 2, 2, 2, 3, 3, 3, 4, 4, 4],
    medium:  [1, 1, 1, 2, 2, 2, 2, 2, 3, 3],
    long:    [1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
    extreme: [0, 0, 1, 1, 1, 1, 1, 1, 1, 1]
  }
});

export function spreadWounds(spread, band, d10) {
  const row = SPREAD_EFFECTS[spread]?.[band];
  if (!row) throw new Error(`spreadWounds: unknown ${spread}/${band}`);
  const n = Math.min(10, Math.max(1, Math.floor(d10)));
  return row[n - 1];
}

export function runSelfTests() {
  const { ok, eq, count } = makeChecker();
  ok(fieldOfFire("shotgun", "short").single, "shotgun short: single target");
  eq(fieldOfFire("shotgun", "medium").width, 1, "shotgun medium: the space");
  eq(fieldOfFire("shotgun", "extreme").width, 3, "shotgun long/extreme: 3 spaces");
  eq(fieldOfFire("scatter", "short").width, 1, "scatter short: the space");
  eq(fieldOfFire("scatter", "medium").width, 3, "scatter medium: 3 spaces");
  eq(fieldOfFire("scatter", "long").width, 5, "scatter long: 5 spaces");
  let threw = 0;
  try { fieldOfFire("rifle", "short"); } catch { threw++; }
  try { spreadWounds("rifle", "short", 5); } catch { threw++; }
  eq(threw, 2, "unknown spread throws");
  // Spot checks against the printed table.
  eq(spreadWounds("scatter", "short", 1), 1, "scatter short 1 → 1");
  eq(spreadWounds("scatter", "short", 10), 3, "scatter short 10 → 3");
  eq(spreadWounds("scatter", "medium", 8), 2, "scatter medium 8 → 2");
  eq(spreadWounds("scatter", "long", 2), 0, "scatter long 2 → 0");
  eq(spreadWounds("scatter", "extreme", 4), 0, "scatter extreme 4 → 0");
  eq(spreadWounds("scatter", "extreme", 5), 1, "scatter extreme 5 → 1");
  eq(spreadWounds("shotgun", "short", 1), 1, "shotgun short 1 → 1");
  eq(spreadWounds("shotgun", "short", 8), 4, "shotgun short 8 → 4");
  eq(spreadWounds("shotgun", "medium", 4), 2, "shotgun medium 4 → 2");
  eq(spreadWounds("shotgun", "medium", 9), 3, "shotgun medium 9 → 3");
  eq(spreadWounds("shotgun", "long", 10), 2, "shotgun long 10 → 2");
  eq(spreadWounds("shotgun", "extreme", 2), 0, "shotgun extreme 2 → 0");
  eq(spreadWounds("shotgun", "extreme", 3), 1, "shotgun extreme 3 → 1");
  for (const spread of ["scatter", "shotgun"]) for (const band of ["short", "medium", "long", "extreme"]) {
    const row = SPREAD_EFFECTS[spread][band];
    ok(row.length === 10 && row.every((v, i) => i === 0 || v >= row[i - 1]), `${spread} ${band}: 10 entries, never falling`);
  }
  console.log(`shotgun.mjs — all self-tests passed (${count()} assertions).`);
}

if (isMain(import.meta.url)) runSelfTests();

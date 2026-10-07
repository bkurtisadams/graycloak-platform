/**
 * BOOT HILL 2e · shotgun and scatter gun fire
 * Field of fire widens with range (Target Selection). Every target inside it
 * rolls to hit separately; each hit rolls d10 on the Shotgun/Scatter Gun
 * Effects Table for the number of wounds, each wound rolled on the Wound Chart.
 *
 * PENDING SCAN: the Effects Table. The OCR rows carry 7 values for 8 columns,
 * so the numbers are not encoded; spreadWounds() throws until they are.
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

export const SPREAD_EFFECTS = null;

export function spreadWounds(spread, band, d10) {
  if (!SPREAD_EFFECTS) throw new Error("spreadWounds: Shotgun/Scatter Gun Effects Table pending scan");
  return SPREAD_EFFECTS[spread][band][d10 - 1];
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
  try { spreadWounds("shotgun", "short", 5); } catch { threw++; }
  eq(threw, 2, "unknown spread throws; effects table pending");
  console.log(`shotgun.mjs — all self-tests passed (${count()} assertions).`);
}

if (isMain(import.meta.url)) runSelfTests();

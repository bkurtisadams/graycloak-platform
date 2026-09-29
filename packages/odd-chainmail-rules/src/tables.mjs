/**
 * OD&D — Chainmail engine · man-to-man to-hit table (shared lookup)
 * odd-chainmail · module/rules/tables.mjs
 * system 0.1.85 · slice: missile-range-units · stamp 0.1.85-missile-range-units.1
 *
 * The canonical 2d6 to-hit matrix from odd-chainmail-combat.md: weapon row by
 * defender AC. Pure data + a clamped lookup. The grapple grab uses it now;
 * rules/combat-engine.mjs (attack / parry / breakage) will use the same table.
 *
 * Also carries the Individual Fires (missile) table — the same weapon × armor
 * shape with a third dimension for the range thirds. See MISSILE_KILL below.
 *
 * Keyed by weapon id rather than class number because class 9 has two distinct
 * rows (pole arm vs halberd) — id avoids that collision. WEAPON_CLASS carries
 * the class number for the breakage check combat-engine.mjs will add later.
 *
 * Columns are in the PRINTED Appendix B order (No Armor, Leather or Padded,
 * Shield Only, Leather + Shield, Chain, Chain + Shield, Plate, Plate + Shield).
 * AC_COLUMNS gives the OD&D armour class of each printed column. Book I p.19
 * numbers Leather Armor AC 7 and Shield Only AC 8, so the second and third
 * printed columns are AC 7 then AC 8 (not 8 then 7). Fixed in the package,
 * Sep 2026; the earlier build read Leather as AC 8.
 */
import { classKey } from "./advancement.mjs";

export const AC_COLUMNS = Object.freeze([9, 7, 8, 6, 5, 4, 3, 2]);

export const TO_HIT = Object.freeze({
  dagger: [6, 7, 8, 8, 9, 10, 12, 12],
  handaxe: [7, 7, 8, 9, 10, 10, 11, 12],
  mace: [8, 8, 8, 9, 8, 8, 7, 8],
  sword: [7, 8, 8, 9, 8, 9, 10, 11],
  battleaxe: [8, 8, 8, 8, 7, 7, 9, 10],
  morningstar: [6, 6, 7, 7, 6, 7, 8, 8],
  flail: [7, 7, 7, 7, 6, 7, 6, 7],
  spear: [8, 8, 9, 9, 10, 10, 11, 12],
  polearm: [6, 6, 6, 7, 7, 8, 9, 10],
  halberd: [8, 8, 8, 7, 6, 6, 7, 8],
  twohanded: [6, 6, 6, 6, 5, 5, 6, 7],
  lance: [5, 5, 5, 5, 6, 7, 8, 9],
  pike: [8, 8, 8, 8, 8, 8, 9, 10]
});

export const WEAPON_CLASS = Object.freeze({
  dagger: 1,
  handaxe: 2,
  mace: 3,
  sword: 4,
  battleaxe: 5,
  morningstar: 6,
  flail: 7,
  spear: 8,
  polearm: 9,
  halberd: 9,
  twohanded: 10,
  lance: 11,
  pike: 12
});

const CLASS_TO_WEAPON = Object.freeze({
  1: "dagger",
  2: "handaxe",
  3: "mace",
  4: "sword",
  5: "battleaxe",
  6: "morningstar",
  7: "flail",
  8: "spear",
  9: "halberd",
  10: "twohanded",
  11: "lance",
  12: "pike"
});

/**
 * Resolve a weapon-class number to a representative table row. Used for monster
 * natural attacks, which store a class. Class 9 has two rows (pole arm /
 * halberd); this defaults to halberd — a GM ruling, overridable later.
 */
export function weaponIdForClass(weaponClass) {
  const c = Math.min(12, Math.max(1, Math.trunc(weaponClass) || 1));
  return CLASS_TO_WEAPON[c] ?? "dagger";
}

/* ---- Saving throws (d20, meet or beat) ----------------------------------- *
 * Rows are level bands; columns are the five save categories. Thieves save as
 * magic-users. */
export const SAVE_KEYS = Object.freeze(["deathPoison", "wands", "stone", "dragon", "staves"]);

/** Categories treated as "magic" for the dwarf/halfling +4-levels bonus: magic
 *  wands, turn-to-stone, and staves & spells. Death Ray/Poison and Dragon
 *  Breath are left at normal level (mixed/physical — referee may rule otherwise). */
export const MAGIC_SAVE_KEYS = Object.freeze(["wands", "stone", "staves"]);

export const SAVES = Object.freeze({
  fighter: [
    [12, 13, 14, 15, 16], // 1-3
    [10, 11, 12, 13, 14], // 4-6
    [8, 9, 10, 10, 12],   // 7-9
    [6, 7, 8, 8, 10],     // 10-12
    [4, 5, 5, 5, 8]       // 13+
  ],
  "magic-user": [
    [13, 14, 13, 16, 15], // 1-5
    [11, 12, 11, 14, 12], // 6-10
    [8, 9, 8, 11, 8],     // 11-15
    [5, 6, 5, 8, 3]       // 16+
  ],
  cleric: [
    [11, 12, 14, 16, 15], // 1-4
    [9, 10, 12, 14, 12],  // 5-8
    [6, 7, 9, 11, 9],     // 9-12
    [3, 5, 7, 8, 7]       // 13+
  ]
});

function fighterBand(l) { return l <= 3 ? 0 : l <= 6 ? 1 : l <= 9 ? 2 : l <= 12 ? 3 : 4; }
function muBand(l) { return l <= 5 ? 0 : l <= 10 ? 1 : l <= 15 ? 2 : 3; }
function clericBand(l) { return l <= 4 ? 0 : l <= 8 ? 1 : l <= 12 ? 2 : 3; }

function saveRowFor(key, l) {
  if (key === "fighter") return SAVES.fighter[fighterBand(l)];
  if (key === "cleric") return SAVES.cleric[clericBand(l)];
  return SAVES["magic-user"][muBand(l)]; // magic-user AND thief
}

/**
 * Saving throws for a class/level as {deathPoison, wands, stone, dragon, staves}.
 * Dwarves and Halflings save against magic (MAGIC_SAVE_KEYS) as if four levels
 * higher (Men & Magic p.6).
 */
export function savesFor(rawClass, level, race) {
  const key = classKey(rawClass);
  const l = Math.max(1, Math.trunc(level) || 1);
  const base = saveRowFor(key, l);
  const magicHardy = race === "dwarf" || race === "halfling";
  const boosted = magicHardy ? saveRowFor(key, l + 4) : base;
  return Object.fromEntries(SAVE_KEYS.map((k, i) =>
    [k, (magicHardy && MAGIC_SAVE_KEYS.includes(k)) ? boosted[i] : base[i]]));
}

/**
 * The 2d6 number a weapon must meet or beat against a defender's AC.
 * AC is clamped to the table's range (2..9).
 * @param {string} weaponId  key of TO_HIT (e.g., "sword")
 * @param {number} acValue   defender armor class
 * @returns {number} to-hit target
 */
export function toHit(weaponId, acValue) {
  const row = TO_HIT[weaponId];
  if (!row) throw new RangeError(`toHit: unknown weapon "${weaponId}"`);
  const ac = Math.min(9, Math.max(2, Math.trunc(acValue)));
  return row[AC_COLUMNS.indexOf(ac)];
}

/* ---- Individual missile fire (Chainmail Appendix B) ---------------------- *
 * The man-to-man missile table: weapon row by defender AC, three values per
 * cell for the close / medium / maximum range third. Book III scales OD&D
 * missile fire straight off this; a kill is meet-or-beat on 2d6 and, like
 * melee, downgrades to a hit (1d6 off the pool).
 *
 * Chainmail's eight armor classes map onto AC 9..2 in the same order the melee
 * table uses. The leather / shield-only swap that bites in melee is a no-op
 * here: those two columns are identical in every missile row, so classes 1..8
 * land directly on AC 9..8..2. Each band array is indexed AC-high-to-low like
 * TO_HIT (row[9 - ac]); null is the table's "/" — cannot kill that armor at
 * that range.
 *
 * Range is the Chainmail value in inches; the resolution layer converts table
 * distance to inches before calling missileBand. Sling fires as a short bow in
 * every respect (Hobbit writeup) and aliases here. Hand-hurled weapons use the
 * short-bow hit numbers but keep their OWN range (man-to-man amendment), so the
 * resolution layer calls missileKill("shortbow", ...) with the item's range —
 * not handled by an alias, since the range is per-item. */

export const MISSILE_RANGE = Object.freeze({
  shortbow: 15,
  horsebow: 18,
  lightcrossbow: 18,
  longbow: 21,
  compositebow: 24,
  heavycrossbow: 24,
  arquebus: 18
});

export const MISSILE_KILL = Object.freeze({
  shortbow: {
    close:  [6, 6, 6, 7, 8, 9, 11, 12],
    medium: [7, 7, 7, 8, 9, 10, 12, null],
    max:    [8, 8, 8, 9, 10, 11, null, null]
  },
  horsebow: {
    close:  [5, 5, 5, 6, 8, 9, 11, 12],
    medium: [6, 6, 6, 7, 9, 10, 12, null],
    max:    [7, 8, 8, 8, 10, 11, null, null]
  },
  lightcrossbow: {
    close:  [5, 5, 5, 6, 8, 10, 11, 12],
    medium: [6, 7, 7, 7, 9, 11, 12, null],
    max:    [7, 8, 8, 9, 10, null, null, null]
  },
  longbow: {
    close:  [5, 5, 5, 5, 6, 8, 9, 11],
    medium: [6, 6, 6, 6, 7, 9, 11, 12],
    max:    [7, 7, 7, 8, 9, 10, null, null]
  },
  compositebow: {
    close:  [5, 5, 5, 5, 6, 8, 9, 11],
    medium: [6, 6, 6, 7, 8, 10, 12, null],
    max:    [7, 7, 7, 8, 10, 11, null, null]
  },
  heavycrossbow: {
    close:  [4, 4, 4, 5, 6, 7, 8, 10],
    medium: [5, 6, 6, 7, 8, 9, 10, 11],
    max:    [6, 7, 7, 8, 9, 10, 11, 12]
  },
  arquebus: {
    close:  [5, 5, 5, 5, 6, 6, 7, 8],
    medium: [6, 6, 6, 6, 7, 8, 9, 10],
    max:    [8, 8, 8, 8, 8, 9, 10, 12]
  }
});

/** Weapons that fire on another weapon's row. Sling = short bow, row and range
 *  alike. (Hand-hurled weapons are NOT aliased here — see the header note.) */
export const MISSILE_ALIAS = Object.freeze({
  sling: "shortbow"
});

const RANGE_BANDS = Object.freeze(["close", "medium", "max"]);

/** Resolve a weapon id to its firing row id, following aliases. */
function missileRowId(weaponId) {
  return MISSILE_ALIAS[weaponId] ?? weaponId;
}

/**
 * The range third a shot falls in. Ranges divide in thirds; the boundary inch
 * belongs to the lower band (a 24" composite is close 1-8, medium 9-16, max
 * 17-24). Beyond maximum range returns null — out of range, no shot.
 * @param {number} distance  same unit as range (Chainmail inches)
 * @param {number} range     the weapon's maximum range
 * @returns {"close"|"medium"|"max"|null}
 */
export function missileBand(distance, range) {
  if (distance < 0 || distance > range) return null;
  const third = range / 3;
  if (distance <= third) return "close";
  if (distance <= 2 * third) return "medium";
  return "max";
}

/**
 * The 2d6 number a missile weapon must meet or beat to kill a target of the
 * given AC at the given range band. AC clamps to the table range (2..9).
 * @param {string} weaponId  a MISSILE_KILL key or MISSILE_ALIAS
 * @param {number} acValue   defender armor class
 * @param {"close"|"medium"|"max"} band
 * @returns {number|null} to-kill target, or null if the weapon cannot kill that
 *                        armor at that range
 */
export function missileKill(weaponId, acValue, band) {
  const id = missileRowId(weaponId);
  const rows = MISSILE_KILL[id];
  if (!rows) throw new RangeError(`missileKill: unknown missile weapon "${weaponId}"`);
  if (!RANGE_BANDS.includes(band)) throw new RangeError(`missileKill: bad range band "${band}"`);
  const ac = Math.min(9, Math.max(2, Math.trunc(acValue)));
  return rows[band][9 - ac];
}

/** Maximum range (inches) for a missile weapon, following aliases. */
export function missileRange(weaponId) {
  const id = missileRowId(weaponId);
  const r = MISSILE_RANGE[id];
  if (r == null) throw new RangeError(`missileRange: unknown missile weapon "${weaponId}"`);
  return r;
}

/** Dungeon scale: 1 tabletop inch = 10 feet (Chainmail ranges and moves are in
 *  inches; the VTT measures feet). Outdoor scale would be 1" = 10 yards — a
 *  world setting later, hence the constant. */
export const DUNGEON_SCALE_FEET = 10;

/**
 * Convert a measured distance in feet to Chainmail inches, for missileBand.
 * @param {number} feet
 * @param {number} [scaleFeet=DUNGEON_SCALE_FEET]  feet per inch
 * @returns {number} distance in inches
 */
export function inchesFromDistance(feet, scaleFeet = DUNGEON_SCALE_FEET) {
  const s = Number(scaleFeet) || DUNGEON_SCALE_FEET;
  const f = Math.max(0, Number(feet) || 0);
  return f / s;
}

/** Outdoor ground scale: 1 tabletop inch = 10 yards (Chainmail wilderness/mass). */
export const OUTDOOR_SCALE_YARDS = 10;

/**
 * Convert a Foundry measured distance — given in the SCENE's own grid units — to
 * Chainmail tabletop inches, the unit every range and move table is written in.
 * A scene measured in inches needs no conversion (1 square = 1"); feet use the
 * Underworld scale (1" = 10'); yards and metres use the outdoor scale (1" = 10yd).
 * Unknown units fall back to feet, the dungeon default.
 * @param {number} measured  distance in scene units
 * @param {string} [units]   scene grid units string (canvas.scene.grid.units)
 * @returns {number} distance in Chainmail inches
 */
export function inchesFromScene(measured, units = "ft") {
  const m = Math.max(0, Number(measured) || 0);
  const u = String(units ?? "").trim().toLowerCase();
  if (["in", "inch", "inches", "\"", "\u2033"].includes(u)) return m;
  if (["yd", "yard", "yards"].includes(u)) return m / OUTDOOR_SCALE_YARDS;
  if (["m", "meter", "meters", "metre", "metres"].includes(u)) return (m * 1.09361) / OUTDOOR_SCALE_YARDS;
  return m / DUNGEON_SCALE_FEET;
}

/* Self-tests — Node only; skipped in Foundry. */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => {
    if (!c) throw new Error(`FAIL: ${l}`);
    pass++;
  };

  // Spot-check cells straight from the doc.
  ok(toHit("sword", 6) === 9, "sword vs AC6 = 9");
  ok(toHit("battleaxe", 6) === 8, "battleaxe vs AC6 = 8");
  ok(toHit("dagger", 9) === 6, "dagger vs AC9 = 6");
  ok(toHit("dagger", 4) === 10, "dagger vs AC4 = 10");
  ok(toHit("spear", 9) === 8, "spear vs AC9 = 8");
  ok(toHit("morningstar", 4) === 7, "morningstar vs AC4 = 7");
  ok(toHit("twohanded", 5) === 5, "two-handed vs AC5 = 5");
  ok(toHit("pike", 2) === 10, "pike vs AC2 = 10");

  // Clamping at both ends.
  ok(toHit("sword", 12) === toHit("sword", 9), "AC clamps high to 9");
  ok(toHit("sword", 0) === toHit("sword", 2), "AC clamps low to 2");

  // Appendix B vs OD&D armour class (Book I p.19: Leather = AC 7, Shield Only
  // = AC 8). Values are the printed Leather / Shield Only columns (0.1.213
  // photo check); the AC mapping puts Leather on AC 7. Pin the cells that differ.
  ok(toHit("dagger", 7) === 7 && toHit("dagger", 8) === 8, "dagger vs leather AC7 = 7, shield only AC8 = 8");
  ok(toHit("handaxe", 7) === 7 && toHit("handaxe", 8) === 8, "hand axe vs leather AC7 = 7, shield only AC8 = 8");
  ok(toHit("morningstar", 7) === 6 && toHit("morningstar", 8) === 7, "morning star vs leather AC7 = 6, shield only AC8 = 7");
  ok(toHit("spear", 7) === 8 && toHit("spear", 8) === 9, "spear vs leather AC7 = 8, shield only AC8 = 9");
  ok(toHit("sword", 6) === 9 && toHit("sword", 4) === 9 && toHit("sword", 5) === 8, "sword: leather+shield 9, chain+shield 9, chain 8");
  ok(toHit("flail", 4) === 7 && toHit("flail", 3) === 6 && toHit("flail", 2) === 7, "flail AC4/3/2 = 7/6/7 (plate-killer profile)");
  ok(toHit("twohanded", 9) === 6, "two-handed vs no armor = 6 (was mis-keyed 8)");

  // Class -> weapon resolution.
  ok(weaponIdForClass(4) === "sword", "class 4 -> sword");
  ok(weaponIdForClass(3) === "mace", "class 3 -> mace (natural-attack baseline)");
  ok(weaponIdForClass(1) === "dagger", "class 1 -> dagger");
  ok(weaponIdForClass(9) === "halberd", "class 9 -> halberd (default)");
  ok(weaponIdForClass(99) === "pike", "class clamps high to 12");
  ok(weaponIdForClass(0) === "dagger", "class clamps low to 1");

  // Saving throws.
  ok(savesFor("fighter", 1).deathPoison === 12, "fighter 1 death 12");
  ok(savesFor("fighter", 4).deathPoison === 10, "fighter 4 death 10");
  ok(savesFor("fighter", 13).staves === 8, "fighter 13+ staves 8");
  ok(savesFor("magic-user", 8).deathPoison === 11, "mu 8 death 11");
  ok(savesFor("cleric", 1).stone === 14, "cleric 1 stone 14");
  ok(savesFor("thief", 3).deathPoison === 13, "thief saves as mu (band 0)");
  ok(savesFor("thief", 8).wands === 12, "thief 8 wands as mu band 1");
  // Dwarf/halfling save vs magic as +4 levels (wands/stone/staves); other
  // categories unchanged. Fighter L1 base [12,13,14,15,16]; L5 band [10,11,12,13,14].
  {
    const dwf = savesFor("fighter", 1, "dwarf");
    ok(dwf.wands === 11 && dwf.stone === 12 && dwf.staves === 14, "dwarf fighter 1 magic saves as L5");
    ok(dwf.deathPoison === 12 && dwf.dragon === 15, "dwarf fighter 1 non-magic saves unchanged");
    const hob = savesFor("fighter", 4, "halfling");
    ok(hob.wands === 9 && savesFor("fighter", 4).wands === 11, "halfling fighter 4 wands improved (band cross)");
    // Banded matrix: +4 levels only helps when it crosses a band boundary,
    // so a halfling MU at L1 (band 1-5) sees no change until L2 (-> band 6-10).
    ok(savesFor("magic-user", 1, "halfling").wands === savesFor("magic-user", 1).wands, "halfling mu 1 within band: unchanged");
    ok(savesFor("magic-user", 2, "halfling").wands < savesFor("magic-user", 2).wands, "halfling mu 2 crosses band: improved");
    ok(savesFor("fighter", 1, "human").wands === 13, "human gets no magic-save bonus");
    ok(savesFor("fighter", 1, "elf").wands === 13, "elf gets no magic-save bonus");
  }

  // Every row has 8 columns and the metadata stays in sync.
  for (const [id, row] of Object.entries(TO_HIT)) {
    ok(row.length === AC_COLUMNS.length, `${id} row width`);
    ok(Number.isInteger(WEAPON_CLASS[id]), `${id} has a class`);
  }

  // ---- Missile fire (Individual Fires, Appendix B) ----
  // Spot cells decoded straight from the table (0=10, 1=11, 2=12, / = null).
  ok(missileKill("shortbow", 9, "close") === 6, "short bow vs AC9 close = 6");
  ok(missileKill("shortbow", 2, "close") === 12, "short bow vs AC2 close = 12");
  ok(missileKill("shortbow", 3, "medium") === 12, "short bow vs AC3 medium = 12 (table '2')");
  ok(missileKill("shortbow", 2, "medium") === null, "short bow vs AC2 medium = / (null)");
  ok(missileKill("shortbow", 3, "max") === null, "short bow vs AC3 max = / (null)");
  ok(missileKill("heavycrossbow", 9, "close") === 4, "heavy xbow vs AC9 close = 4");
  ok(missileKill("heavycrossbow", 2, "max") === 12, "heavy xbow vs AC2 max = 12");
  ok(missileKill("longbow", 5, "max") === 9, "longbow vs AC5 max = 9");
  ok(missileKill("compositebow", 6, "max") === 8, "composite vs AC6 max = 8");
  ok(missileKill("arquebus", 2, "max") === 12, "arquebus vs AC2 max = 12 (table '2')");

  // Leather (AC8) and shield-only (AC7) are identical in every missile row,
  // which is why classes 1..8 drop straight onto AC 9..2 with no swap.
  for (const id of Object.keys(MISSILE_KILL)) {
    for (const band of RANGE_BANDS) {
      ok(MISSILE_KILL[id][band][1] === MISSILE_KILL[id][band][2], `${id} ${band} AC8==AC7`);
    }
  }

  // AC clamps to the table's 2..9 window.
  ok(missileKill("shortbow", 12, "close") === missileKill("shortbow", 9, "close"), "missile AC clamps high");
  ok(missileKill("shortbow", 0, "close") === missileKill("shortbow", 2, "close"), "missile AC clamps low");

  // Sling fires as a short bow — same row, same range.
  ok(missileKill("sling", 6, "close") === missileKill("shortbow", 6, "close"), "sling = short bow row");
  ok(missileRange("sling") === missileRange("shortbow"), "sling = short bow range");

  // Range thirds: a 15" bow is close 1-5, medium 6-10, max 11-15; beyond, null.
  ok(missileBand(0, 15) === "close", "15in @0 = close (point blank)");
  ok(missileBand(5, 15) === "close", "15in @5 = close (low boundary)");
  ok(missileBand(6, 15) === "medium", "15in @6 = medium");
  ok(missileBand(10, 15) === "medium", "15in @10 = medium (boundary)");
  ok(missileBand(11, 15) === "max", "15in @11 = max");
  ok(missileBand(15, 15) === "max", "15in @15 = max (edge)");
  ok(missileBand(16, 15) === null, "15in @16 = out of range");
  ok(missileBand(8, 24) === "close", "24in @8 = close (composite, per footnote)");
  ok(missileBand(17, 24) === "max", "24in @17 = max (composite, per footnote)");

  // Structure: every missile weapon has a range and three 8-wide bands.
  for (const [id, r] of Object.entries(MISSILE_RANGE)) {
    ok(Number.isInteger(r), `${id} has a range`);
    for (const band of RANGE_BANDS) {
      ok(MISSILE_KILL[id][band].length === AC_COLUMNS.length, `${id} ${band} width`);
    }
  }

  // Distance-to-inches bridge for the range bands.
  ok(inchesFromDistance(150) === 15, "150 ft = 15in (short bow range, 1in=10ft)");
  ok(inchesFromDistance(240) === 24, "240 ft = 24in (composite range)");
  ok(inchesFromDistance(0) === 0, "0 ft = 0in");
  ok(inchesFromDistance(-50) === 0, "negative distance clamps to 0");
  ok(inchesFromDistance(150, 30) === 5, "outdoor scale 1in=10yd -> 150 ft = 5in");
  ok(inchesFromScene(23, "inches") === 23, "scene in inches: 23 stays 23 (no conversion)");
  ok(inchesFromScene(23, "in") === 23, "scene unit 'in' also treated as inches");
  ok(inchesFromScene(150, "ft") === 15, "scene in feet: 150 ft = 15in (dungeon scale)");
  ok(inchesFromScene(200, "yd") === 20, "scene in yards: 200 yd = 20in (outdoor scale)");
  ok(inchesFromScene(50, "frobnitz") === 5, "unknown unit falls back to feet");

  console.log(`tables.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

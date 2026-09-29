/**
 * OD&D — Chainmail engine · equipment price/weight list (Men & Magic, p.13-15)
 * odd-chainmail · module/rules/equipment.mjs
 * system 0.1.33 · slice: missile-identity · stamp 0.1.33-missile-identity.1
 *
 * The Book I shop, as item-ready seed data the buy-step creates with
 * createEmbeddedDocuments. Pure data + helpers; no Foundry deps.
 *
 * Conventions / rulings:
 *  • DAMAGE is "1d6" across the board — Book I's alternative combat system is
 *    explicit that every hit does 1–6 "unless otherwise noted".
 *  • COST is always RAW (the p.13-14 price list is complete).
 *  • WEIGHT provenance is flagged per entry: rawWeight:true means the value
 *    comes straight off the p.15 encumbrance table (armor, the listed weapons,
 *    saddle, waterskin); rawWeight:false is a designer estimate for a sundry
 *    Book I never weighs — a referee-tunable number, not a RAW claim.
 *  • weaponId on a bow/crossbow is the MELEE fallback row only (dagger-class
 *    sidearm); the real ranged data rides the missile fields. Remap if you
 *    prefer a different "swung as a club" class.
 *  • helmet/barding map to no actor slot in the current armor model, so they
 *    ride as gear (no AC effect) until a head/mount slot exists.
 */

import { WEAPON_CLASS, MISSILE_RANGE, MISSILE_ALIAS } from "./tables.mjs";

const DMG = "1d6";

/** Build a weapon entry; missile opts attach the ranged row. */
function melee(key, name, weaponId, cost, weight, rawWeight) {
  return { key, name, type: "weapon", cost, category: "weapon-melee",
    system: { weaponId, damage: DMG, weight, cost } , rawWeight };
}
function bow(key, name, cost, weight, rawWeight, missileId, ammoType, thrown = false, thrownRange = 0) {
  return { key, name, type: "weapon", cost, category: "weapon-missile",
    system: { weaponId: "", damage: DMG, weight, cost, missile: true, missileId, ammoType, thrown, thrownRange },
    rawWeight };
}
function armor(key, name, acValue, slot, cost, weight, rawWeight) {
  return { key, name, type: "armor", cost, category: "armor", system: { acValue, slot, weight, cost }, rawWeight };
}
function gear(key, name, cost, weight, rawWeight, { qty = 1, ammoType = "none", category = "gear" } = {}) {
  return { key, name, type: "gear", cost, category, system: { cost, weight, qty, ammoType }, rawWeight };
}
function container(key, name, cost, weight, rawWeight) {
  return { key, name, type: "container", cost, category: "container", system: { cost, weight }, rawWeight };
}

export const EQUIPMENT = Object.freeze([
  // ── Melee weapons (cost p.13, weight p.15 where listed) ──────────────
  melee("dagger",      "Dagger",            "dagger",      3,  20,  true),
  melee("handaxe",     "Hand Axe",          "handaxe",     3,  50,  true),
  melee("mace",        "Mace",              "mace",        5,  50,  true),
  melee("sword",       "Sword",             "sword",      10,  50,  true),
  melee("battleaxe",   "Battle Axe",        "battleaxe",   7, 100,  true),
  melee("morningstar", "Morning Star",      "morningstar", 6, 100,  true),
  melee("flail",       "Flail",             "flail",       8, 100,  true),
  melee("spear",       "Spear",             "spear",       1,  50,  false),
  melee("polearm",     "Pole Arm",          "polearm",     7, 150,  true),
  melee("halberd",     "Halberd",           "halberd",     7, 150,  true),
  melee("twohanded",   "Two-Handed Sword",  "twohanded",  15, 150,  true),
  melee("lance",       "Lance",             "lance",       4, 150,  false),
  melee("pike",        "Pike",              "pike",        5, 150,  true),

  // ── Missile weapons (the "Bow & Arrows 50" lump covers the launcher) ──
  bow("shortbow",      "Short Bow",         25, 50, true,  "shortbow",      "arrow"),
  bow("longbow",       "Long Bow",          40, 50, true,  "longbow",       "arrow"),
  bow("compositebow",  "Composite Bow",     50, 50, true,  "compositebow",  "arrow"),
  bow("lightcrossbow", "Light Crossbow",    15, 50, true,  "lightcrossbow", "bolt"),
  bow("heavycrossbow", "Heavy Crossbow",    25, 50, true,  "heavycrossbow", "bolt"),

  // ── Ammunition (gear, carries ammoType for the fire action) ──────────
  gear("quiver20",     "Quiver of 20 Arrows", 10, 10, false, { qty: 20, ammoType: "arrow", category: "ammo" }),
  gear("arrows20",     "20 Arrows (refill)",   5, 10, false, { qty: 20, ammoType: "arrow", category: "ammo" }),
  gear("quarrels30",   "Case with 30 Quarrels",10, 10, false, { qty: 30, ammoType: "bolt",  category: "ammo" }),
  gear("silverarrow",  "Silver-Tipped Arrow",  5,  1, false, { qty: 1,  ammoType: "arrow", category: "ammo" }),

  // ── Armor (acValue body: leather 7, mail 5, plate 3; shield via slot) ─
  armor("leather", "Leather Armor",  7, "body",   15, 250, true),
  armor("mail",    "Chain-type Mail", 5, "body",   30, 500, true),
  armor("plate",   "Plate Mail",     3, "body",   50, 750, true),
  armor("shield",  "Shield",         7, "shield", 10, 150, true),

  // ── Adventuring gear (cost p.14; sundry weights are estimates) ───────
  gear("helmet",    "Helmet",            10,  50, true),
  gear("rope",      "50' of Rope",        1,  50, false),
  gear("pole10",    "10' Pole",           1,  50, false),
  gear("spikes",    "12 Iron Spikes",     1,  30, false),
  gear("waterskin", "Water/Wine Skin",    1,  30, true),
  gear("torches",   "6 Torches",          1,  30, false, { qty: 6 }),
  gear("lantern",   "Lantern",           10,  50, false),
  gear("oil",       "Flask of Oil",       2,  10, false),
  gear("stakes",    "3 Stakes & Mallet",  3,  60, false),
  gear("steelmir",  "Steel Mirror",       5,  10, false),
  gear("silvermir", "Silver Mirror, Small",15, 10, false),
  gear("woodcross", "Wooden Cross",       2,  10, false),
  gear("silvcross", "Silver Cross",      25,  10, false),
  gear("holywater", "Holy Water/Vial",   25,  30, false),
  gear("wolvesbane","Wolvesbane, bunch", 10,   5, false),
  gear("belladonna","Belladonna, bunch", 10,   5, false),
  gear("garlic",    "Garlic, bud",        5,   1, false),
  gear("wine",      "Wine, quart",        1,  30, false),
  gear("ironration","Iron Rations (1 wk)",15, 75, false),
  gear("rations",   "Standard Rations (1 wk)",5,100, false),

  // ── Containers (p.14; capacities live on the container model) ────────
  container("backpack", "Leather Back Pack", 5,  10, false),
  container("largesack", "Large Sack",       2,   5, false),
  container("smallsack", "Small Sack",       1,   2, false),

  // ── Mounts & transport (cost p.14; not carried, so weight 0) ─────────
  gear("mule",       "Mule",            20, 0, false, { category: "mount" }),
  gear("drafthorse", "Draft Horse",     30, 0, false, { category: "mount" }),
  gear("lighthorse", "Light Horse",     40, 0, false, { category: "mount" }),
  gear("warhorsem",  "Warhorse, Medium",100,0, false, { category: "mount" }),
  gear("warhorseh",  "Warhorse, Heavy", 200,0, false, { category: "mount" }),
  gear("saddle",     "Saddle",          25,250,true,  { category: "mount" }),
  gear("saddlebags", "Saddle Bags",     10, 10, false,{ category: "mount" }),
  gear("barding",    "Barding (Horse Armor)",150,750,true,{ category: "mount" })
]);

/** Index by key for O(1) lookup from the buy-step. */
export const EQUIPMENT_BY_KEY = Object.freeze(
  Object.fromEntries(EQUIPMENT.map(e => [e.key, e]))
);

/** Foundry item payload for createEmbeddedDocuments. */
export function toItemData(entry) {
  return { name: entry.name, type: entry.type, system: { ...entry.system } };
}

/** Group entries for a tabbed/sectioned buy UI. */
export function equipmentByCategory() {
  const out = {};
  for (const e of EQUIPMENT) (out[e.category] ??= []).push(e);
  return out;
}

/* ---- Self-tests — Node only (`node module/rules/equipment.mjs`). ---- */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };
  const missileIds = new Set([...Object.keys(MISSILE_RANGE), ...Object.keys(MISSILE_ALIAS)]);

  ok(EQUIPMENT.length === Object.keys(EQUIPMENT_BY_KEY).length, "keys are unique");
  for (const e of EQUIPMENT) {
    ok(e.cost > 0, `${e.key}: cost is positive`);
    ok(typeof e.rawWeight === "boolean", `${e.key}: weight provenance flagged`);
    if (e.type === "weapon") {
      if (e.system.weaponId) ok(e.system.weaponId in WEAPON_CLASS, `${e.key}: weaponId is a real man-to-man row`);
      ok(e.system.damage === "1d6", `${e.key}: universal d6 damage`);
      if (e.system.missile) ok(missileIds.has(e.system.missileId), `${e.key}: missileId resolves`);
    }
    if (e.type === "armor") ok(["body", "shield"].includes(e.system.slot), `${e.key}: valid armor slot`);
  }
  // Spot-check a couple of RAW values.
  ok(EQUIPMENT_BY_KEY.plate.cost === 50 && EQUIPMENT_BY_KEY.plate.system.weight === 750, "plate 50gp / 750wt");
  ok(EQUIPMENT_BY_KEY.sword.cost === 10 && EQUIPMENT_BY_KEY.dagger.system.weight === 20, "sword 10gp, dagger 20wt");
  ok(EQUIPMENT_BY_KEY.shortbow.system.weaponId === "" && EQUIPMENT_BY_KEY.shortbow.system.missile === true, "short bow is a launcher: no melee row");
  ok(toItemData(EQUIPMENT_BY_KEY.sword).type === "weapon", "toItemData shape");

  const cats = equipmentByCategory();
  ok(cats["weapon-missile"].length === 5 && cats["armor"].length === 4, "category grouping");

  console.log(`equipment.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

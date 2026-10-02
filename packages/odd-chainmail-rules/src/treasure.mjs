/**
 * OD&D — treasure generation (Book II p.22–26, 39–40)
 * odd-chainmail-rules · src/treasure.mjs
 *
 * Pure. Treasure types A–I, gems and jewellery values, the Magic/Maps
 * Determination Table and the item tables. Every item comes out unidentified
 * (OD&D items are learned by trying them or Detect Magic) with a Book I weight.
 */

const pct = (rng) => 1 + Math.floor(rng() * 100);
const die = (n, rng) => 1 + Math.floor(rng() * n);
const roll = (count, sides, rng) => { let t = 0; for (let i = 0; i < count; i++) t += die(sides, rng); return t; };
const range = (lo, hi, rng) => lo + Math.floor(rng() * (hi - lo + 1));

/* ---- Treasure Types (Book II p.22). Coins in thousands; gems and jewellery rolled separately. ---- */
// [lo, hi, chance%]; gems/jewelry same entry unless split.
export const TREASURE_TYPES = Object.freeze({
  "A-land":   { cp: [1, 6, 25],  sp: [1, 6, 30],   gp: [2, 12, 35],  gems: [6, 36, 50],  jewelry: [6, 36, 50],   magic: { chance: 40, spec: "any", count: 3 } },
  "A-desert": { cp: [1, 4, 20],  sp: [1, 4, 25],   gp: [1, 6, 30],   gems: [10, 40, 50], jewelry: [10, 40, 50],  magic: { chance: 60, spec: "magic", count: 3 } },
  "A-water":  { cp: null,        sp: null,         gp: [5, 30, 60],  gems: [10, 60, 60], jewelry: [10, 60, 60],  magic: { chance: 50, spec: "map", count: 1 } },
  B: { cp: [1, 8, 50],  sp: [1, 6, 25],   gp: [1, 3, 25],   gems: [1, 6, 25],   jewelry: [1, 6, 25],   magic: { chance: 10, spec: "weaponArmor", count: 1 } },
  C: { cp: [1, 12, 20], sp: [1, 4, 30],   gp: null,         gems: [1, 4, 25],   jewelry: [1, 4, 25],   magic: { chance: 10, spec: "any", count: 2 } },
  D: { cp: [1, 8, 10],  sp: [1, 12, 15],  gp: [1, 6, 60],   gems: [1, 8, 30],   jewelry: [1, 8, 30],   magic: { chance: 20, spec: "any", count: 2, plus: ["potion"] } },
  E: { cp: [1, 10, 5],  sp: [1, 12, 30],  gp: [1, 8, 25],   gems: [1, 10, 10],  jewelry: [1, 10, 10],  magic: { chance: 30, spec: "any", count: 3, plus: ["scroll"] } },
  F: { cp: null,        sp: [2, 20, 10],  gp: [1, 12, 45],  gems: [2, 24, 20],  jewelry: [2, 24, 20],  magic: { chance: 35, spec: "noWeapons", count: 3, plus: ["potion", "scroll"] } },
  G: { cp: null,        sp: null,         gp: [10, 40, 75], gems: [3, 18, 25],  jewelry: [1, 10, 25],  magic: { chance: 40, spec: "any", count: 4, plus: ["scroll"] } },
  H: { cp: [3, 24, 25], sp: [1, 100, 50], gp: [10, 60, 75], gems: [1, 100, 50], jewelry: [10, 40, 50], magic: { chance: 20, spec: "any", count: 4, plus: ["potion", "scroll"] } },
  I: { cp: null,        sp: null,         gp: null,         gems: [2, 16, 50],  jewelry: [2, 16, 50],  magic: { chance: 20, spec: "any", count: 1 } }
});

/* ---- Gems and jewellery (Book II p.39–40) ---- */
const GEM_STEPS = [10, 50, 100, 500, 1000, 5000, 10000, 25000, 50000, 100000, 500000];
export function rollGem(rng) {
  const p = pct(rng);
  let i = p <= 10 ? 0 : p <= 25 ? 1 : p <= 75 ? 2 : p <= 90 ? 3 : 4;
  if (die(6, rng) === 1 && i < GEM_STEPS.length - 1) i++; // a 1 on d6 raises it one category
  return GEM_STEPS[i];
}
export function rollJewelry(rng) {
  const p = pct(rng);
  if (p <= 20) return roll(3, 6, rng) * 100;
  if (p <= 80) return die(6, rng) * 1000;
  return die(10, rng) * 1000;
}

/* ---- Magic items (Book II p.23–26). w = Book I weight in coins. ---- */
const SWORDS = [
  [35, "Sword +1", { bonus: 1 }], [40, "Sword +1, +2 vs. Lycanthropes", { bonus: 1, vs: { lycanthrope: 2 } }],
  [45, "Sword +1, +2 vs. Magic-Users and Enchanted Monsters", { bonus: 1, vs: { enchanted: 2 } }],
  [50, "Sword +1, Locating Objects", { bonus: 1, power: "locate objects" }], [60, "Sword +1, +3 vs. Trolls", { bonus: 1, vs: { troll: 3 } }],
  [65, "Flaming Sword +1 (+2 vs. Trolls, +3 vs. Undead)", { bonus: 1, vs: { troll: 2, undead: 3 }, flaming: true }],
  [70, "Sword +1, Wishes (2–8)", { bonus: 1, wishes: "2d4" }], [75, "Sword +1, +3 vs. Dragons", { bonus: 1, vs: { dragon: 3 } }],
  [78, "Sword +2", { bonus: 2 }], [80, "Sword +2, Charm Person", { bonus: 2, power: "charm person" }],
  [82, "Sword +3", { bonus: 3 }], [83, "Sword +1, Energy Draining", { bonus: 1, drain: true }], [100, "Sword −2 (cursed)", { bonus: -2, cursed: true }]
];
const ARMOR = [[30, "Shield +1", { shield: 1 }], [60, "Armor +1", { armor: 1 }], [75, "Armor & Shield +1", { armor: 1, shield: 1 }],
  [83, "Shield +2", { shield: 2 }], [90, "Armor +2", { armor: 2 }], [97, "Armor & Shield +2", { armor: 2, shield: 2 }], [100, "Shield +3", { shield: 3 }]];
const MISC_WEAPONS = [[25, "10 Magic Arrows", { bonus: 1, qty: 10, w: 0 }], [40, "Magic Arrows", { bonus: 1, qty: "3d10", w: 0 }],
  [55, "Dagger +1 (+2 vs. Goblins and Kobolds)", { bonus: 1, vs: { goblin: 2, kobold: 2 }, w: 20 }],
  [60, "Dagger +2 (+3 vs. Orcs, Goblins and Kobolds)", { bonus: 2, vs: { orc: 3, goblin: 3, kobold: 3 }, w: 20 }],
  [65, "Magic Bow", { bonus: 1, w: 50 }], [70, "Axe +1", { bonus: 1, w: 50 }], [80, "Mace +2", { bonus: 2, w: 50 }],
  [85, "War Hammer +1", { bonus: 1, w: 50 }], [89, "War Hammer +2", { bonus: 2, w: 50 }], [90, "War Hammer +3 (returns to a dwarf)", { bonus: 3, w: 50 }],
  [96, "Spear +1", { bonus: 1, w: 50 }], [99, "Spear +2", { bonus: 2, w: 50 }], [100, "Spear +3", { bonus: 3, w: 50 }]];
const POTIONS = [[4, "Growth"], [8, "Diminution"], [12, "Giant Strength"], [16, "Invisibility"], [20, "Gaseous Form"], [24, "Polymorph (Self)"],
  [28, "Speed"], [32, "Levitation"], [36, "Flying"], [38, "ESP"], [40, "Delusion"], [44, "Healing"], [48, "Longevity"], [52, "Clairvoyance"],
  [55, "Clairaudience"], [60, "Animal Control"], [64, "Undead Control"], [68, "Plant Control"], [72, "Human Control"], [76, "Giant Control"],
  [80, "Dragon Control"], [84, "Poison"], [88, "Invulnerability"], [92, "Fire Resistance"], [96, "Treasure Finding"], [100, "Heroism"]];
const SCROLLS = [[20, "Scroll of 1 Spell", { spells: 1 }], [35, "Scroll of 2 Spells", { spells: 2 }], [45, "Scroll of 3 Spells", { spells: 3 }],
  [50, "Scroll of 7 Spells", { spells: 7 }], [60, "Cursed Scroll", { curse: true }], [70, "Scroll of Protection from Lycanthropes", {}],
  [80, "Scroll of Protection from Undead", {}], [90, "Scroll of Protection from Elementals", {}], [100, "Scroll of Protection from Magic", {}]];
const RINGS = [[9, "Invisibility"], [15, "Mammal Control"], [21, "Human Control"], [30, "Weakness"], [39, "Protection"], [49, "Three Wishes"],
  [60, "Delusion"], [70, "Water Walking"], [80, "Fire Resistance"], [85, "Protection, 5' radius"], [90, "Regeneration"], [92, "Djinn Summoning"],
  [94, "Telekinesis"], [96, "X-Ray Vision"], [98, "Spell Turning"], [99, "Spell Storing"], [100, "Many Wishes (4–24)"]];
const WANDS = [[15, "Wand of Metal Detection"], [20, "Wand of Enemy Detection"], [25, "Wand of Magic Detection"], [30, "Wand of Secret Doors & Traps Detection"],
  [35, "Wand of Illusion"], [40, "Wand of Fear"], [45, "Wand of Cold"], [50, "Wand of Paralyzation"], [55, "Wand of Fire Balls"], [60, "Wand of Lightning Bolts"],
  [65, "Wand of Polymorph"], [70, "Wand of Negation"], [80, "Staff of Healing"], [85, "Staff of Commanding"], [90, "Snake Staff"], [95, "Staff of Striking"],
  [97, "Staff of Withering"], [99, "Staff of Power"], [100, "Staff of Wizardry"]];
const MISC_MAGIC = [[4, "Crystal Ball"], [6, "Crystal Ball with Clairaudience"], [7, "Crystal Ball with ESP"], [12, "Medallion of ESP, 3\" range"],
  [15, "Medallion of ESP, 9\" range"], [18, "Amulet vs. Crystal Balls and ESP"], [24, "Scarab of Protection from Evil High Priests"], [29, "Bag of Holding"],
  [30, "Censer Controlling Air Elementals"], [31, "Stone Controlling Earth Elementals"], [32, "Brazier Commanding Fire Elementals"], [33, "Bowl Commanding Water Elementals"],
  [35, "Efreet Bottle"], [38, "Displacer Cloak"], [47, "Elven Cloak and Boots"], [52, "Boots of Speed"], [57, "Boots of Levitation"], [62, "Boots of Traveling and Leaping"],
  [67, "Broom of Flying"], [72, "Helm of Reading Magic and Languages"], [75, "Helm of Telepathy"], [76, "Helm of Teleportation"], [87, "Helm of Chaos (Law)"],
  [88, "Flying Carpet"], [89, "Drums of Panic, 24\" range"], [90, "Horn of Blasting, 10\" range"], [97, "Gauntlets of Ogre Power"], [99, "Girdle of Giant Strength"], [100, "Mirror of Life Trapping"]];
const pick = (table, rng) => { const p = pct(rng); return table.find((r) => p <= r[0]); };

const STAFF_KEYS = ["Staff"];
const UNID = { sword: "a sword", armor: "a suit of armour", shield: "a shield", weapon: "a weapon", potion: "a potion", scroll: "a scroll", ring: "a ring", wand: "a wand", staff: "a staff", misc: "a strange item", map: "a map" };

function item(kind, name, extra = {}, w = 0) { return { kind, name, unidName: UNID[kind] ?? "an item", identified: false, weight: w, ...extra }; }

function rollSword(rng) {
  const [, name, x] = pick(SWORDS, rng);
  const a = pct(rng); const flip = x.drain;
  const alignment = flip ? (a <= 65 ? "chaos" : a <= 90 ? "neutral" : "law") : (a <= 65 ? "law" : a <= 90 ? "neutral" : "chaos");
  const intelligence = die(12, rng);
  const egoism = intelligence >= 7 ? die(12, rng) : null;
  const purpose = pct(rng) >= 91;
  return item("sword", name, { ...x, alignment, intelligence: purpose ? 12 : intelligence, egoism: purpose ? 12 : egoism, purpose }, 50);
}
/** One item from the Magic Items table (Book II p.23); `allowed` limits categories. */
export function rollMagicItem(rng, allowed = null) {
  for (let guard = 0; guard < 50; guard++) {
    const p = pct(rng);
    const cat = p <= 20 ? "sword" : p <= 35 ? "armor" : p <= 40 ? "weapon" : p <= 65 ? "potion" : p <= 85 ? "scroll" : p <= 90 ? "ring" : p <= 95 ? "wand" : "misc";
    if (allowed && !allowed.includes(cat)) continue;
    return rollInCategory(cat, rng);
  }
  return rollInCategory("potion", rng);
}
export function rollInCategory(cat, rng) {
  switch (cat) {
    case "sword": return rollSword(rng);
    case "armor": { const [, name, x] = pick(ARMOR, rng); const kind = x.armor ? "armor" : "shield"; return item(kind, name, x, x.armor ? 500 : 150); }
    case "weapon": { const [, name, x] = pick(MISC_WEAPONS, rng); const qty = typeof x.qty === "string" ? roll(3, 10, rng) : x.qty; return item("weapon", qty ? `${qty} Magic Arrows` : name, { ...x, qty }, x.w ?? 50); }
    case "potion": { const [, name] = pick(POTIONS, rng); return item("potion", `Potion of ${name}`, { poison: name === "Poison" }, 30); }
    case "scroll": { const [, name, x] = pick(SCROLLS, rng); const clerical = x.spells ? pct(rng) <= 25 : false; return item("scroll", name + (clerical ? " (clerical)" : ""), { ...x, clerical }, 20); }
    case "ring": { const [, name] = pick(RINGS, rng); return item("ring", `Ring of ${name}`, {}, 0); }
    case "wand": { const [, name] = pick(WANDS, rng); const staff = STAFF_KEYS.some((k) => name.startsWith(k)) || name === "Snake Staff"; return item(staff ? "staff" : "wand", name, { charges: staff ? 200 : 100 }, staff ? 300 : 100); }
    default: { const [, name] = pick(MISC_MAGIC, rng); return item("misc", name, {}, 50); }
  }
}
/** Treasure, magic and combined maps (Book II p.26). */
export function rollMap(rng) {
  const p = pct(rng);
  const kind = p <= 60 ? "treasure" : p <= 90 ? "magic" : "magic & treasure";
  return item("map", `Map to ${kind}`, { mapKind: kind, mapRoll: die(8, rng) }, 0);
}

/** Roll a treasure type ("A-land", "B" … "I"). Coins in pieces; gems and jewellery as values in gp. */
export function rollTreasure(type, rng) {
  const t = TREASURE_TYPES[type] ?? TREASURE_TYPES[`A-${type}`];
  if (!t) throw new Error(`unknown treasure type ${type}`);
  const out = { type, coins: { cp: 0, sp: 0, gp: 0 }, gems: [], jewelry: [], items: [] };
  for (const c of ["cp", "sp", "gp"]) if (t[c] && pct(rng) <= t[c][2]) out.coins[c] = range(t[c][0], t[c][1], rng) * 1000;
  if (t.gems && pct(rng) <= t.gems[2]) { const n = range(t.gems[0], t.gems[1], rng); for (let i = 0; i < n; i++) out.gems.push(rollGem(rng)); }
  if (t.jewelry && pct(rng) <= t.jewelry[2]) { const n = range(t.jewelry[0], t.jewelry[1], rng); for (let i = 0; i < n; i++) out.jewelry.push(rollJewelry(rng)); }
  const m = t.magic;
  if (m && pct(rng) <= m.chance) {
    for (let i = 0; i < m.count; i++) {
      if (m.spec === "map") out.items.push(rollMap(rng));
      else if (m.spec === "magic") out.items.push(rollMagicItem(rng));
      else if (m.spec === "weaponArmor") out.items.push(rollMagicItem(rng, ["sword", "armor", "weapon"]));
      else if (m.spec === "noWeapons") out.items.push(rollMagicItem(rng, ["armor", "potion", "scroll", "ring", "wand", "misc"]));
      else out.items.push(pct(rng) <= 75 ? rollMagicItem(rng) : rollMap(rng));
    }
    for (const p of m.plus ?? []) out.items.push(rollInCategory(p, rng));
  }
  return out;
}

/** Book II lair extras beyond the lettered type, and coins carried by men on their persons (Book II p.22 notes). */
export const LAIR_EXTRAS = Object.freeze({ ogre: { gp: 1000 }, "giant-hill": { gp: 5000 }, "giant-stone": { gp: 5000 }, "giant-frost": { gp: 5000 }, "giant-fire": { gp: 5000 }, "giant-cloud": { gp: 5000 } });
export const CARRIED_COINS = Object.freeze({
  bandit: { sp: [2, 20] }, brigand: { sp: [2, 20] }, nomad: { sp: [5, 30] }, pirate: { gp: [2, 12] }, buccaneer: { gp: [2, 12] },
  goblin: { gp: [1, 6] }, kobold: { gp: [1, 6] }
});
export function carriedCoins(monsterKey, rng) {
  const c = CARRIED_COINS[monsterKey]; const out = { cp: 0, sp: 0, gp: 0 };
  if (c) for (const [k, [lo, hi]] of Object.entries(c)) out[k] = range(lo, hi, rng);
  return out;
}

/** Total gp value of coins, gems and jewellery (1 gp = 10 sp = 50 cp, Book II p.39). Magic items have no gp value in OD&D. */
export function treasureValue(t) {
  const coin = (t.coins?.gp ?? 0) + (t.coins?.sp ?? 0) / 10 + (t.coins?.cp ?? 0) / 50;
  return coin + (t.gems ?? []).reduce((a, b) => a + b, 0) + (t.jewelry ?? []).reduce((a, b) => a + b, 0);
}

/* ---------------------------------------------------------------- tests */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };
  const seq = (v) => { let i = 0; return () => v[i++ % v.length]; };
  let s = 7; const rng = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

  ok(Object.keys(TREASURE_TYPES).length === 11, "types A (land/desert/water) and B–I");
  ok(rollGem(seq([0.05, 0.5])) === 10 && rollGem(seq([0.05, 0])) === 50, "gem base 10, a 1 on d6 bumps to 50");
  ok(rollGem(seq([0.95, 0.9])) === 1000 && rollGem(seq([0.95, 0])) === 5000, "1,000 gp gems step up to 5,000");
  ok(rollJewelry(seq([0.1, 0.99, 0.99, 0.99])) === 1800, "jewellery 01–20: 3d6 × 100");
  ok(rollJewelry(seq([0.5, 0.99])) === 6000 && rollJewelry(seq([0.9, 0.99])) === 10000, "jewellery 21–80 d6 × 1,000; 81–00 d10 × 1,000");
  for (let i = 0; i < 300; i++) {
    const t = rollTreasure("BCDEFGHI"[i % 8], rng);
    ok(["cp", "sp", "gp"].every((k) => t.coins[k] % 1000 === 0), "coins come in thousands");
    ok(t.items.every((it) => !it.identified && it.unidName), "items start unidentified");
  }
  const h = []; for (let i = 0; i < 400; i++) h.push(rollTreasure("H", rng));
  ok(h.some((t) => t.items.length >= 6), "type H can give any 4 + potion + scroll");
  ok(rollTreasure("F", seq([0.01, 0.99, 0.01, 0.99, 0.99, 0.01, 0.0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5])).items.every((it) => !["sword", "weapon"].includes(it.kind)), "type F: no weapons");
  const sw = rollInCategory("sword", seq([0.0, 0.0, 0.5, 0.5, 0.95]));
  ok(sw.kind === "sword" && sw.bonus === 1 && sw.alignment === "law" && sw.purpose === true && sw.intelligence === 12, "sword +1, lawful, special purpose maxes intelligence");
  ok(rollInCategory("wand", seq([0.75])).kind === "staff" && rollInCategory("wand", seq([0.75])).charges === 200, "staff of healing, 200 charges");
  ok(rollInCategory("wand", seq([0.42])).charges === 100, "wands 100 charges");
  ok(carriedCoins("bandit", seq([0])).sp === 2 && carriedCoins("orc", seq([0])).gp === 0, "bandits carry silver; orcs nothing");
  ok(treasureValue({ coins: { gp: 100, sp: 100, cp: 100 }, gems: [50], jewelry: [1000] }) === 100 + 10 + 2 + 50 + 1000, "values in gp");

  console.log(`treasure.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

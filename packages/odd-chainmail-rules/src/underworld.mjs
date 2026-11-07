/**
 * OD&D — underworld procedures and stocking (Book III p.6–13)
 * odd-chainmail-rules · src/underworld.mjs
 *
 * Pure. Searching, doors, listening, traps, wandering checks, sighting and
 * surprise underground, pursuit past corners, the Monster Determination
 * matrix, and stocking rooms with monsters and unguarded treasure.
 * Dice come from rng() in [0,1). The six Monster Level Tables (p.10–11) are
 * transcribed as printed, repeats included (Wyverns twice on Table 5).
 */
import { rollGem, rollJewelry, rollMagicItem } from "./treasure.mjs";

const die = (n, rng) => 1 + Math.floor(rng() * n);
const DEMI = new Set(["elf", "dwarf", "halfling"]);
const norm = (race) => String(race ?? "human").toLowerCase();

/** One turn per 10' of wall searched; found on 1–2, elves 1–4. An elf passing by notices on 1–2 (referee's option). */
export const SEARCH_TURNS_PER_10FT = 1;
export function secretDoorFound(race, d6, { passing = false } = {}) {
  const r = norm(race);
  if (passing) return r === "elf" && d6 <= 2;
  return d6 <= (r === "elf" ? 4 : 2);
}

/** Forcing a stuck door: 1–2, small or light characters 1; up to three may try at once. */
export const MAX_DOOR_FORCERS = 3;
export function doorForced(d6, { small = false } = {}) { return d6 <= (small ? 1 : 2); }
/** Doors swing shut unless spiked or wedged; a spike slips on 5–6. */
export function spikeSlips(d6) { return d6 >= 5; }

/** Listening at a door: humans 1, elves, dwarves and halflings 1–2. Undead make no sound. A thief may pass his own Hear Noise range. */
export function noiseHeard(race, d6, { undead = false, thiefRange = 0 } = {}) {
  if (undead) return false;
  const base = DEMI.has(norm(race)) ? 2 : 1;
  return d6 <= Math.max(base, thiefRange);
}

/** Traps and pits spring on 1–2 when passed. */
export function trapSprings(d6) { return d6 <= 2; }

/** Wandering monster: d6 at the end of every turn, 6 = encounter. */
export function wanderingDue(d6) { return d6 === 6; }

/** Sighting distance underground, 2d4 × 10 feet; surprised, 1–3 × 10 feet. */
export function sightingFeet(rng, surprised = false) {
  return surprised ? die(3, rng) * 10 : (die(4, rng) + die(4, rng)) * 10;
}

/**
 * Surprise underground: a side unaware rolls d6, surprised on 1–2. A party carrying light
 * cannot surprise monsters unless it comes through a door. Returns who was surprised.
 */
export function surpriseUnderground({ partyD6, monstersD6, partyLit = true, throughDoor = false, monstersAware = false }) {
  const party = partyD6 <= 2;
  const monsters = !monstersAware && (!partyLit || throughDoor) && monstersD6 <= 2;
  if (party && monsters) return null;
  return party ? "party" : monsters ? "monsters" : null;
}
/** A surprised character drops a held item 25% of the time. */
export function dropsItem(d100) { return d100 <= 25; }

/** Pursuit goes on in line of sight to 90'; past a corner, door or stairs on 1–2, through a secret door on 1. */
export const PURSUIT_SIGHT_FEET = 90;
export function pursuitContinues(d6, { past = "corner" } = {}) {
  if (past === "none") return true;
  return d6 <= (past === "secret" ? 1 : 2);
}

/** Monster Determination matrix (p.10): by dungeon level, the d6 ranges that pick Monster Level Table 1–6. */
export const DETERMINATION = Object.freeze([
  { levels: [1, 1],    tables: [[1, 2], [3, 4], [5, 5], [6, 6], null, null] },
  { levels: [2, 2],    tables: [[1, 1], [2, 2], [3, 4], [5, 5], [6, 6], null] },
  { levels: [3, 3],    tables: [null, [1, 1], [2, 2], [3, 4], [5, 5], [6, 6]] },
  { levels: [4, 5],    tables: [null, null, [1, 1], [2, 3], [4, 5], [6, 6]] },
  { levels: [6, 7],    tables: [null, null, null, [1, 1], [2, 4], [5, 6]] },
  { levels: [8, 9],    tables: [null, null, null, null, [1, 2], [3, 6]] },
  { levels: [10, 12],  tables: [null, null, null, null, [1, 1], [2, 6]] },
  { levels: [13, 999], tables: [null, null, null, null, null, [1, 6]] }
]);
const rowFor = (rows, level) => rows.find((r) => level >= r.levels[0] && level <= r.levels[1]);
export function monsterTableFor(dungeonLevel, d6) {
  const row = rowFor(DETERMINATION, Math.max(1, Math.trunc(dungeonLevel) || 1));
  const i = row.tables.findIndex((t) => t && d6 >= t[0] && d6 <= t[1]);
  return i + 1;
}

/**
 * Monster Level Tables (p.10–11): Table 1 a d8, Tables 2–4 a d10 (0 = 10), Tables 5–6 a d12.
 * key: a Book II entry in monsters.mjs; options: the referee or a roll picks one; npc: a character type
 * by its Book I title; none of these: no bestiary entry yet. Number appearing is Book II's, set by the
 * referee for the party (Book III p.10).
 */
const fm = (level) => ({ cls: "fighter", level }), mu = (level) => ({ cls: "magic-user", level });
const RETINUE = "1–4 apprentices (Enchanters or Evil Priests) and 1–6 fighter-type bodyguards of levels 4–6";
export const MONSTER_LEVEL_TABLES = Object.freeze({
  1: { die: 8, rows: [
    { name: "Kobolds", key: "kobold" }, { name: "Goblins", key: "goblin" }, { name: "Skeletons", key: "skeleton" },
    { name: "Orcs", key: "orc" }, { name: "Giant Rats" }, { name: "Centipedes" }, { name: "Bandits", key: "bandit" },
    { name: "Spiders" }] },
  2: { die: 10, rows: [
    { name: "Hobgoblins", key: "hobgoblin" }, { name: "Zombies", key: "zombie" }, { name: "Lizards" },
    { name: "Warriors", npc: fm(2) }, { name: "Conjurers", npc: mu(3) }, { name: "Gnolls", key: "gnoll" },
    { name: "Thouls" }, { name: "Ghouls", key: "ghoul" }, { name: "Berserkers", key: "berserker" },
    { name: "Theurgists", npc: mu(4) }] },
  3: { die: 10, rows: [
    { name: "Wights", key: "wight" }, { name: "Heroes", npc: fm(4) }, { name: "Giant Hogs" }, { name: "Giant Ants" },
    { name: "Ochre Jelly", key: "ochre-jelly" }, { name: "Thaumaturgists", npc: mu(5) },
    { name: "Swashbucklers", npc: fm(5) }, { name: "Magicians", npc: mu(6) }, { name: "Giant Snakes" },
    { name: "Giant Weasels" }] },
  4: { die: 10, rows: [
    { name: "Wraiths", key: "wraith" }, { name: "Ogres", key: "ogre" }, { name: "Evil Priests", npc: { cls: "cleric", level: null, alignment: "chaos" } },
    { name: "Myrmidons", npc: fm(6) }, { name: "Giant Beetles" }, { name: "Giant Scorpions" },
    { name: "Lycanthropes", options: ["werewolf", "wereboar", "weretiger", "werebear"] },
    { name: "Gargoyles", key: "gargoyle" }, { name: "White Apes" }, { name: "Enchanters", npc: mu(7) }] },
  5: { die: 12, rows: [
    { name: "Trolls", key: "troll" }, { name: "Superheroes", npc: fm(8) }, { name: "Wyverns", key: "wyvern" },
    { name: "Spectres", key: "spectre" }, { name: "Mummies", key: "mummy" }, { name: "Minotaurs", key: "minotaur" },
    { name: "Manticores", key: "manticore" }, { name: "Cockatrices", key: "cockatrice" },
    { name: "Sorcerers", npc: mu(9) }, { name: "Wyverns", key: "wyvern" },
    { name: "Hydra (6–8 heads)", key: "hydra", heads: [6, 8] }, { name: "Medusae", key: "medusa" }] },
  6: { die: 12, rows: [
    { name: "Giants", options: ["giant-hill", "giant-stone", "giant-frost", "giant-fire", "giant-cloud"] },
    { name: "Hydra (9–12 heads)", key: "hydra", heads: [9, 12] },
    { name: "Dragons", options: ["dragon-white", "dragon-black", "dragon-green", "dragon-blue", "dragon-red", "dragon-golden"] },
    { name: "Basilisks", key: "basilisk" }, { name: "Gorgons", key: "gorgon" }, { name: "Chimeras", key: "chimera" },
    { name: "Vampires", key: "vampire" }, { name: "Lords", npc: fm(9) }, { name: "Spectres", key: "spectre" },
    { name: "Wizards", npc: mu(11), retinue: RETINUE },
    { name: "Evil High Priests", npc: { cls: "cleric", level: 8, alignment: "chaos" }, retinue: RETINUE },
    { name: "Purple Worms", key: "purple-worm" }] }
});
/** Book III's list of others to consider by level and surroundings; the referee places these, never a roll. */
export const OTHER_MONSTERS = Object.freeze(["Giant Crabs", "Giant Leeches", "Giant Octopi", "Crocodiles", "Giant Squids", "Sea Monsters", "Nixies", "Mermen", "Griffons", "Pterodactyls", "Rocs", "Invisible Stalkers", "Cyborgs", "Robots", "Androids", "Shadows", "Dopplegangers"]);

/** Roll on one Monster Level Table; a row with options picks one of them. */
export function monsterFromTable(table, rng) {
  const t = MONSTER_LEVEL_TABLES[table];
  const row = t.rows[die(t.die, rng) - 1];
  const out = { table, ...row };
  if (row.options) out.key = row.options[die(row.options.length, rng) - 1];
  if (row.heads) out.heads = row.heads[0] + die(row.heads[1] - row.heads[0] + 1, rng) - 1;
  return out;
}
/** A wandering monster or room monster for a dungeon level: the matrix picks the table, the table the monster. */
export function rollDungeonMonster(dungeonLevel, rng) {
  return monsterFromTable(monsterTableFor(dungeonLevel, die(6, rng)), rng);
}

/** Unguarded treasure by dungeon level (p.7): silver always, gold 50%, gems and jewellery each at a chance × a die, magic by chance. */
export const DUNGEON_TREASURE = Object.freeze([
  { levels: [1, 1],    silver: 100,   gold: 10,   gemPct: 5,  gemDie: 6,  magicPct: 5 },
  { levels: [2, 3],    silver: [100, 12], gold: 100, gemPct: 10, gemDie: 6,  magicPct: 5 },
  { levels: [4, 5],    silver: 1000,  gold: 200,  gemPct: 20, gemDie: 6,  magicPct: 10 },
  { levels: [6, 7],    silver: 2000,  gold: 500,  gemPct: 30, gemDie: 6,  magicPct: 15 },
  { levels: [8, 9],    silver: 5000,  gold: 1000, gemPct: 40, gemDie: 12, magicPct: 20 },
  { levels: [10, 12],  silver: 5000,  gold: 2000, gemPct: 50, gemDie: 12, magicPct: 25 },
  { levels: [13, 999], silver: 10000, gold: 5000, gemPct: 50, gemDie: 12, magicPct: 30 }
]);
export function dungeonTreasure(dungeonLevel, rng) {
  const row = rowFor(DUNGEON_TREASURE, Math.max(1, Math.trunc(dungeonLevel) || 1));
  const [silverMul, silverDie] = Array.isArray(row.silver) ? row.silver : [row.silver, 6];
  const pct = () => die(100, rng);
  const out = { sp: silverMul * die(silverDie, rng), gp: 0, gems: [], jewelry: [], magic: [] };
  if (pct() <= 50) out.gp = row.gold * die(6, rng);
  if (pct() <= row.gemPct) { const n = die(row.gemDie, rng); for (let i = 0; i < n; i++) out.gems.push(rollGem(rng)); }
  if (pct() <= row.gemPct) { const n = die(row.gemDie, rng); for (let i = 0; i < n; i++) out.jewelry.push(rollJewelry(rng)); }
  if (pct() <= row.magicPct) out.magic.push(rollMagicItem(rng));
  return out;
}

/** Stocking an unallocated room (p.7): monster on 1–2; treasure on 1–3 with a monster, on 1 without. */
export function stockRoom(dungeonLevel, rng) {
  const monster = die(6, rng) <= 2;
  const treasure = die(6, rng) <= (monster ? 3 : 1);
  return {
    monster: monster ? rollDungeonMonster(dungeonLevel, rng) : null,
    treasure: treasure ? dungeonTreasure(dungeonLevel, rng) : null
  };
}
/** Stock every room id given, skipping rooms the referee has already allocated. */
export function stockLevel(roomIds, dungeonLevel, rng, allocated = new Set()) {
  const out = {};
  for (const id of roomIds) if (!allocated.has(id)) out[id] = stockRoom(dungeonLevel, rng);
  return out;
}

function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };
  const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
  const f = (d, n) => (d - 0.5) / n;

  ok(secretDoorFound("human", 2) && !secretDoorFound("human", 3), "men find secret doors on 1–2");
  ok(secretDoorFound("elf", 4) && !secretDoorFound("elf", 5), "elves on 1–4");
  ok(secretDoorFound("elf", 2, { passing: true }) && !secretDoorFound("dwarf", 1, { passing: true }), "only elves notice in passing");
  ok(doorForced(2) && !doorForced(3) && !doorForced(2, { small: true }) && doorForced(1, { small: true }), "forcing doors");
  ok(spikeSlips(5) && !spikeSlips(4), "spikes slip on 5–6");
  ok(noiseHeard("human", 1) && !noiseHeard("human", 2) && noiseHeard("dwarf", 2), "listening by race");
  ok(!noiseHeard("elf", 1, { undead: true }), "undead make no sound");
  ok(noiseHeard("human", 3, { thiefRange: 3 }), "a thief's Hear Noise range");
  ok(trapSprings(2) && !trapSprings(3), "traps spring on 1–2");
  ok(wanderingDue(6) && !wanderingDue(5), "wandering monster on 6");
  ok(sightingFeet(seq(f(1, 4), f(1, 4))) === 20 && sightingFeet(seq(f(4, 4), f(4, 4))) === 80, "sighting 20–80'");
  ok(sightingFeet(seq(f(3, 3)), true) === 30, "surprised at 10–30'");
  ok(surpriseUnderground({ partyD6: 3, monstersD6: 1 }) === null, "a lit party can't surprise monsters");
  ok(surpriseUnderground({ partyD6: 3, monstersD6: 1, throughDoor: true }) === "monsters", "unless through a door");
  ok(surpriseUnderground({ partyD6: 2, monstersD6: 5 }) === "party", "party surprised on 1–2");
  ok(dropsItem(25) && !dropsItem(26), "25% to drop a held item");
  ok(pursuitContinues(2) && !pursuitContinues(3) && !pursuitContinues(2, { past: "secret" }), "pursuit past corners and secret doors");
  ok(monsterTableFor(1, 2) === 1 && monsterTableFor(1, 5) === 3 && monsterTableFor(1, 6) === 4, "level 1 matrix");
  ok(monsterTableFor(5, 3) === 4 && monsterTableFor(11, 1) === 5 && monsterTableFor(20, 1) === 6, "deeper rows");
  for (let lvl = 1; lvl <= 14; lvl++) for (let d = 1; d <= 6; d++) ok(monsterTableFor(lvl, d) >= 1, `matrix covers level ${lvl} roll ${d}`);
  const t1 = dungeonTreasure(1, seq(f(6, 6), f(100, 100), f(100, 100), f(100, 100), f(100, 100)));
  ok(t1.sp === 600 && t1.gp === 0 && !t1.gems.length && !t1.magic.length, "level 1: silver always, the rest missed");
  const t2 = dungeonTreasure(2, seq(f(12, 12), f(50, 100), f(3, 6), f(100, 100), f(100, 100), f(100, 100)));
  ok(t2.sp === 1200 && t2.gp === 300, "levels 2–3: 100 × d12 silver, 100 × d6 gold");
  const empty = stockRoom(1, seq(f(3, 6), f(2, 6)));
  ok(!empty.monster && !empty.treasure, "empty room: treasure only on a 1");
  const lair = stockRoom(1, seq(f(1, 6), f(3, 6), f(6, 6), f(5, 10), f(1, 6), f(100, 100)));
  ok(lair.monster && lair.monster.table === 4 && lair.monster.name === "Giant Beetles" && lair.treasure, "monster room with treasure on 1–3");
  ok([1, 2, 3, 4].every((n) => MONSTER_LEVEL_TABLES[n].rows.length === MONSTER_LEVEL_TABLES[n].die) && MONSTER_LEVEL_TABLES[5].rows.length === 12 && MONSTER_LEVEL_TABLES[6].rows.length === 12, "table sizes match their dice");
  ok(monsterFromTable(1, seq(f(4, 8))).key === "orc" && monsterFromTable(2, seq(f(10, 10))).name === "Theurgists", "rows read in order, 0 = 10");
  ok(monsterFromTable(5, seq(f(3, 12))).name === "Wyverns" && monsterFromTable(5, seq(f(10, 12))).name === "Wyverns", "Wyverns twice on Table 5, as printed");
  const hy = monsterFromTable(5, seq(f(11, 12), f(3, 3)));
  ok(hy.key === "hydra" && hy.heads === 8, "hydra heads rolled in range");
  ok(monsterFromTable(6, seq(f(3, 12), f(5, 6))).key === "dragon-red", "Dragons pick a kind");
  ok(monsterFromTable(6, seq(f(10, 12))).retinue && monsterFromTable(6, seq(f(10, 12))).npc.level === 11, "Wizards bring a retinue");
  const lvl = stockLevel(["a", "b", "c"], 1, Math.random, new Set(["b"]));
  ok(lvl.a && lvl.c && !("b" in lvl), "allocated rooms are left alone");
  console.log(`underworld.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

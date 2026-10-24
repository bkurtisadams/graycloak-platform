/**
 * OD&D — Chainmail engine · wilderness (Book III, "The Wilderness")
 *
 * Hexes about 5 miles across, a move is a day. Movement by mode in hexes per
 * day, terrain costs (Outdoor Survival's, as Book III restates them), the
 * lost roll by the terrain a party starts on, the end-of-day wandering
 * monster check by the terrain it ends on, and the type tables. Also Book
 * III's healing of wounds (nothing the first day of complete rest, a hit
 * point every other day after) and the six-days-then-rest rule.
 *
 * Hexes are axial (q, r), flat-topped; the six directions are the compass
 * points a flat-top hex has. The Westmark key (Kurt, Oct 2026): Langstead the
 * home village at (0,0), Fosscraig two hexes north-east on the crag, Kingwold
 * two hexes west at the wood's edge, the river south of the village.
 *
 * Rulings (Kurt, Oct 2026): a lone character may walk the map as a party of
 * one; at the start the players' map holds the home village and its ring of
 * six (Book III's "immediate surroundings"); rumours and walking fill in the
 * rest. Hills are mountains for cost and encounters (Book III has no hill).
 */

export const HEX_MILES = 5;

/** Hexes per day by mode (Book III MOVEMENT; swamp figure in brackets for water craft). */
export const MOVE = Object.freeze({
  foot: 3, cart: 4, draft: 5, heavy: 6, medium: 8, light: 10, raft: 10, boat: 15, merchant: 12, galley: 20,
});

/** Terrain cost in movement factors per hex (Book III TERRAIN PENALTIES). Tracks: mountains 2, woods and swamp 1. */
export const TERRAIN = Object.freeze({
  clear: { label: "clear", cost: 1, lost: 0, encounter: 6 },
  woods: { label: "woods", cost: 2, lost: 1, encounter: 5 },
  river: { label: "river", cost: 3, lost: 2, encounter: 5 },      // crossing at a non-ford hex costs 3; a ford is a clear move
  swamp: { label: "swamp", cost: 3, lost: 1, encounter: 4 },
  mountains: { label: "mountains", cost: 3, lost: 3, encounter: 4 },
  desert: { label: "desert", cost: 2, lost: 2, encounter: 5 },
  city: { label: "city", cost: 1, lost: 0, encounter: 6 },
});

/** Cost to enter a hex; a track through it, or a ford across a river, lowers it. */
export function hexCost(hex) {
  const t = TERRAIN[hex?.t ?? "clear"] ?? TERRAIN.clear;
  if (hex?.t === "river" && hex.ford) return 1;
  if (hex?.track) return hex.t === "mountains" ? 2 : hex.t === "woods" || hex.t === "swamp" ? 1 : t.cost;
  return t.cost;
}

/** Lost: a d6 at or under the terrain's number (clear and city never). */
export function isLost(terrain, d6) { return d6 <= (TERRAIN[terrain]?.lost ?? 0); }
/** Wandering monster at the end of the day: a d6 at or over the terrain's number. */
export function hasEncounter(terrain, d6) { return d6 >= (TERRAIN[terrain]?.encounter ?? 6); }

/* ---------- hex geometry: axial, flat-top ---------- */
export const DIRS = Object.freeze({ N: [0, -1], NE: [1, -1], SE: [1, 0], S: [0, 1], SW: [-1, 1], NW: [-1, 0] });
export const DIR_NAMES = Object.freeze(Object.keys(DIRS));
export const key = (q, r) => `${q},${r}`;
export const parse = (k) => { const [q, r] = String(k).split(",").map(Number); return { q, r }; };
export function neighbour(h, dir) { const [dq, dr] = DIRS[dir]; return { q: h.q + dq, r: h.r + dr }; }
export function ring(h) { return DIR_NAMES.map((d) => neighbour(h, d)); }
export function distance(a, b) { const dq = a.q - b.q, dr = a.r - b.r; return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr)); }
/** A lost party's direction: the d6 picks one of the six. */
export function lostDirection(d6) { return DIR_NAMES[(d6 - 1) % 6]; }
/** The direction that most closely heads from a toward b (ties to the first in compass order). */
export function toward(a, b) {
  if (distance(a, b) === 0) return null;
  let best = null, bd = Infinity;
  for (const d of DIR_NAMES) { const n = neighbour(a, d), dd = distance(n, b); if (dd < bd) { bd = dd; best = d; } }
  return best;
}
/** Pixel centre of a flat-top hex of the given size (centre to corner). */
export function toPixel(h, size) { return { x: size * 1.5 * h.q, y: size * Math.sqrt(3) * (h.r + h.q / 2) }; }
export function hexCorners(cx, cy, size) {
  return Array.from({ length: 6 }, (_, i) => { const a = (Math.PI / 3) * i; return [cx + size * Math.cos(a), cy + size * Math.sin(a)]; });
}

/**
 * A day's walk. From `from`, step by step in `dir` (or, with `to`, along the
 * line toward it), spending the mode's factors; a hex that would overspend
 * ends the day short of it, except that the first hex of the day is always
 * entered when its cost alone exceeds the allowance (3 factors move a party
 * one mountain hex). `hexAt(h)` returns the referee's hex or null for unmapped;
 * walking into the unmapped stops the day with reason "unmapped".
 */
export function planDay({ from, dir = null, to = null, mode = "foot", hexAt, largeParty = 0 }) {
  let allowance = MOVE[mode] ?? MOVE.foot;
  if (largeParty > 1000) allowance -= 2; else if (largeParty > 100) allowance -= 1;
  const path = []; let at = { ...from }, spent = 0, reason = "spent";
  for (;;) {
    const d = dir ?? (to ? toward(at, to) : null);
    if (!d) { reason = "arrived"; break; }
    const next = neighbour(at, d), hex = hexAt(next);
    if (!hex) { reason = "unmapped"; break; }
    const cost = hexCost(hex);
    if (spent + cost > allowance && path.length) { reason = "spent"; break; }
    path.push({ ...next, t: hex.t ?? "clear", cost, place: hex.place ?? null }); spent += cost; at = next;
    if (to && distance(at, to) === 0) { reason = "arrived"; break; }
    if (spent >= allowance) { reason = "spent"; break; }
  }
  return { path, end: at, spent, allowance, reason };
}

/* ---------- Book III WILDERNESS WANDERING MONSTERS ---------- */
/** d8 for the type, by the terrain the day ends on. Rows 7 and 8 missing in a column reroll. */
export const ENCOUNTER_TYPE = Object.freeze({
  clear: ["men", "flyer", "giant", "lycanthrope", "animals", "men", "animals", "dragon"],
  woods: ["men", "flyer", "giant", "lycanthrope", "lycanthrope", "men", "animals", "dragon"],
  river: ["men", "flyer", "giant", "lycanthrope", "swimmer", "swimmer", "animals", "dragon"],
  swamp: ["men", "flyer", "giant", "lycanthrope", "swimmer", "undead", "undead", "dragon"],
  mountains: ["men", "flyer", "giant", "lycanthrope", "animals", "giant", "dragon", "dragon"],
  desert: ["men", "flyer", "giant", "men", "animals", "dragon", null, null],
  city: ["men", "undead", "undead", "men", null, null, null, null],
});
/** d12 for the kind within a type. Men by terrain column; animals: the basic column, with optional woods/swamp/mountains columns. */
export const MEN = Object.freeze({
  typical: ["Bandits", "Brigands", "Necromancer", "Wizard", "Bandits", "Berserkers", "Lord", "Superhero", "Brigands", "Bandits", "Evil High Priest", "Patriarch"],
  mountains: ["Bandits", "Berserkers", "Brigands", "Lord", "Wizard", "Superhero", "Cavemen", "Necromancer", "Evil High Priest", "Cavemen", "Patriarch", "Berserkers"],
  desert: ["Nomads", "Dervishes", "Nomads", "Lord", "Wizard", "Nomads", "Nomads", "Nomads", "Nomads", "Nomads", "Nomads", "Nomads"],
  waterborne: ["Buccaneers", "Pirates", "Buccaneers", "Pirates", "Buccaneers", "Mermen"],
});
export const KINDS = Object.freeze({
  flyer: ["Pegasi", "Rocs", "Chimeras", "Hippogriffs", "Griffons", "Manticores", "Rocs", "Wyverns", "Dragons", "Pegasi", "Hippogriffs", "Griffons"],
  undead: ["Skeletons", "Zombies", "Ghouls", "Wights", "Wraiths", "Mummies", "Spectres", "Vampires"],
  giant: ["Kobolds", "Goblins", "Orcs", "Hobgoblins", "Gnolls", "Ogres", "Trolls", "Giants", "Gnomes", "Dwarves", "Elves", "Treants"],
  lycanthrope: ["Werewolves", "Wereboars", "Weretigers", "Werebears"],
  swimmer: ["Giant Crabs", "Nixies", "Giant Octopi", "Giant Squid", "Sea Monster", "Giant Snakes", "Crocodiles", "Giant Leeches", "Mermen", "Nixies", "Giant Fish", "Dragon Turtle"],
  dragon: ["Black Dragons", "White Dragons", "Green Dragons", "Blue Dragons", "Red Dragons", "Gold Dragons", "Cockatrices", "Basilisks", "Wyverns", "Chimeras", "Hydra (7-9 heads)", "Hydra (10-12 heads)"],
  animals: ["Spiders", "Centipedes", "Lizards", "Toads", "Ants", "Weasels", "Apes", "Beetles", "Scorpions", "Lions", "Boars", "Snakes"],
  animalsWoods: ["Centaurs", "Unicorns", "Minotaurs", "Gorgons", "Pixies", "Manticores", "Dryads", "Medusae"],
  animalsSwamp: ["Tyrannosaurus Rex", "Pterodactyl", "Triceratops", "Brontosaurus", "Stegosaurus", "Tyrannosaurus Rex", "Pterodactyl", "Triceratops"],
  animalsMountains: ["Cave Bears", "Dire Wolves", "Sabre-Tooth Tigers", "Mastodons", "Spotted Lions", "Woolly Rhinos", "Titanotheres", "Cave Bears", "Mammoths", "Sabre-Tooth Tigers", "Dire Wolves", "Spotted Lions"],
});

/** Roll the encounter's type and kind. `roll(n)` gives 1..n. Rerolls a blank row. */
export function wanderingMonster(terrain, roll, { optionalAnimals = false, waterborne = false } = {}) {
  const col = ENCOUNTER_TYPE[terrain] ?? ENCOUNTER_TYPE.clear;
  let type = null;
  for (let i = 0; i < 20 && !type; i++) type = col[roll(8) - 1];
  if (!type) type = "men";
  let table;
  if (type === "men") table = waterborne ? MEN.waterborne : MEN[terrain] ?? MEN.typical;
  else if (type === "animals" && optionalAnimals && KINDS[`animals${terrain[0].toUpperCase()}${terrain.slice(1)}`]) table = KINDS[`animals${terrain[0].toUpperCase()}${terrain.slice(1)}`];
  else table = KINDS[type];
  const kind = table[(roll(12) - 1) % table.length];
  return { type, kind };
}

/* ---------- the meeting: how many, how far, who saw whom ---------- */
/** Book II's No. Appearing ("4d10 × 10", "2d6", "1"): rolled, with the dice's maximum; null for "—", "summoned", "conjured". */
export function rollNumberAppearing(str, roll) {
  const t = String(str ?? "").trim().toLowerCase();
  if (!t || t === "—" || t === "-" || t === "summoned" || t === "conjured") return null;
  if (t === "one" || /^\d+$/.test(t)) return { n: t === "one" ? 1 : Number(t), max: t === "one" ? 1 : Number(t), dice: t };
  const m = /^(\d+)d(\d+)(?:\s*[×x*]\s*(\d+))?$/.exec(t); if (!m) return null;
  const count = Number(m[1]), sides = Number(m[2]), mult = m[3] ? Number(m[3]) : 1;
  let n = 0; for (let i = 0; i < count; i++) n += roll(sides);
  return { n: n * mult, max: count * sides * mult, dice: str };
}
/** Sighting: 40-240 yards unless surprised, then 10-30 (Book III; inches convert to tens of yards in the wilderness). */
export function sightingYards(roll, surprised = false) { return surprised ? roll(3) * 10 : (roll(6) + roll(6) + roll(6) + roll(6)) * 10; }
/** Surprise as in the underworld: each side on a 1-2. */
export function surpriseOf(partyD6, monstersD6) { const p = partyD6 <= 2, m = monstersD6 <= 2; return p && m ? null : p ? "monsters" : m ? "party" : null; } // "party": the party surprised them
/** Twice as fast one way or the other, else even (Book III EVADING). */
export function speedCompare(partyInches, monsterInches) { if (monsterInches >= 2 * partyInches) return "slower"; if (partyInches >= 2 * monsterInches) return "faster"; return "even"; }

/* ---------- Book III EVADING IN THE WILDERNESS ---------- */
const EVASION = [[50, 70, 90], [30, 50, 70], [15, 30, 50], [5, 20, 35]];
const sizeRow = (n) => (n <= 3 ? 0 : n <= 9 ? 1 : n <= 24 ? 2 : 3);
const ratioCol = (r) => (r <= 0.25 ? 0 : r <= 0.6 ? 1 : 2);
/**
 * The chance of evading, 0-100: the party's size against the monsters' share of their possible number (metRatio,
 * 0-1; unknown counts as the middle column); surprise by the party doubles it, surprise by the monsters negates it
 * except in woods (10, plus the woods' 25); woods add 25; a party twice as fast gets 25 more, twice as slow 25 less.
 */
export function evasionChance({ partySize = 1, metRatio = null, surprise = null, woods = false, speed = "even" } = {}) {
  let base = EVASION[sizeRow(partySize)][metRatio == null ? 1 : ratioCol(metRatio)];
  const notes = [`party of ${partySize}, ${metRatio == null ? "their number unknown" : `they are ${Math.round(metRatio * 100)}% of their possible number`}: ${base}`];
  if (surprise === "party") { base *= 2; notes.push("you surprised them: doubled"); }
  if (surprise === "monsters") { base = woods ? 10 : 0; notes.push(woods ? "they surprised you: 10 in the woods" : "they surprised you: no evading"); }
  if (woods) { base += 25; notes.push("woods +25"); }
  if (speed === "faster") { base += 25; notes.push("twice as fast +25"); }
  if (speed === "slower") { base -= 25; notes.push("half as fast -25"); }
  return { chance: Math.max(0, Math.min(100, base)), notes };
}
/**
 * One step of pursuit after a failed evasion: the pursuit goes a random direction (d6), a faster monster catches the party
 * on 50% (25 in woods or swamp), and if not caught the pursuit goes on on a 1-3 (as castle folk pursue). Each hex run
 * costs the party half a day's rest.
 */
export function pursuitStep({ faster = false, woodsOrSwamp = false, dirD6, catchD100, onD6 }) {
  const direction = lostDirection(dirD6);
  const chance = faster ? (woodsOrSwamp ? 25 : 50) : 0;
  const caught = catchD100 <= chance;
  return { direction, chance, caught, continues: !caught && onD6 <= 3, restOwed: 0.5 };
}

/* ---------- Book III HEALING WOUNDS and REST ---------- */
/** Hit points regained by `days` of complete rest: none the first day, one every other day after. */
export function healingAfter(days) { return Math.max(0, Math.floor((Math.max(0, Math.trunc(days)) - 1) / 2)); }
/** All creatures must rest a full day after six days of movement. */
export const DAYS_BEFORE_REST = 6;
export function mustRest(daysWalked) { return daysWalked >= DAYS_BEFORE_REST; }

/* ---------- RUMORS, INFORMATION, AND LEGENDS ---------- */
/** The cost of making the rounds: a round of drinks 10-60 gp, the barman 1-10 gp. */
export function rumourCost(d6, d10) { return d6 * 10 + d10; }

/* ---------- the Westmark: the referee's key (Kurt, Oct 2026) ---------- */
export const WESTMARK = Object.freeze({
  name: "the Westmark", home: "Langstead", radius: 5,
  places: Object.freeze({
    Langstead: { q: 0, r: 0, kind: "village", inn: "The Ox and Ford", market: true, desc: "A long single street climbing from the ford to the road north-east; a village of a few hundred souls." },
    Fosscraig: { q: 2, r: -2, kind: "ruin", desc: "A ditched fort on a crag, long empty; the dungeons lie beneath it." },
    Kingwold: { q: -2, r: 0, kind: "village", inn: "The Woodman's Rest", market: false, shrine: true, desc: "A woodcutters' village at the edge of the king's own wood." },
  }),
  /** Named hexes; everything else within the radius comes from terrainAt. */
  hexes: Object.freeze({
    "0,0": { t: "clear", place: "Langstead", ford: true, track: true },
    "1,-1": { t: "clear", track: true },
    "2,-2": { t: "mountains", place: "Fosscraig", track: true },
    "-1,0": { t: "clear", track: true },
    "-2,0": { t: "woods", place: "Kingwold", track: true },
    "0,1": { t: "river" }, "-1,1": { t: "river" }, "1,0": { t: "river" }, "-2,1": { t: "river" }, "2,-1": { t: "river" },
  }),
  rumours: Object.freeze([
    { text: "A ruined fort stands on the crag a long day north-east by the old track. The carters won't camp under it.", truth: true, reveals: { q: 2, r: -2 } },
    { text: "Kingwold's woodcutters lost two men to wolves this spring, west at the wood's edge.", truth: true, reveals: { q: -2, r: 0 } },
    { text: "Goblins have been seen on the Fosscraig road since the last new moon.", truth: true },
    { text: "The old lord of Fosscraig walled his gold into the well before the fort fell.", truth: false },
    { text: "The river below the ford is deep enough to drown a horse; cross only at the ford.", truth: true, reveals: { q: 0, r: 1 } },
  ]),
});

/** The referee's terrain at a hex of the Westmark: named hexes first, then the lie of the land. Null beyond the radius. */
export function terrainAt(k, world = WESTMARK) {
  const { q, r } = parse(k);
  if (distance({ q, r }, { q: 0, r: 0 }) > world.radius) return null;
  if (world.hexes[k]) return { ...world.hexes[k] };
  if (q >= 2 && r <= -1) return { t: "mountains" };
  if (q <= -2) return { t: "woods" };
  if (r >= 3) return { t: "swamp" };
  return { t: "clear" };
}
/** The whole referee's map as an object keyed "q,r". */
export function fullMap(world = WESTMARK) {
  const out = {};
  for (let q = -world.radius; q <= world.radius; q++) for (let r = -world.radius; r <= world.radius; r++) {
    const k = key(q, r), h = terrainAt(k, world); if (h) out[k] = h;
  }
  return out;
}
/** What the players know at the start: the home village and its ring of six (the immediate surroundings). */
export function startingKnowledge(world = WESTMARK) {
  const home = world.places[world.home], out = {};
  for (const h of [home, ...ring(home)]) { const k = key(h.q, h.r), t = terrainAt(k, world); if (t) out[k] = { t: t.t, ...(t.place ? { place: t.place } : {}), ...(t.ford ? { ford: true } : {}) }; }
  return out;
}

function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };
  ok(MOVE.foot === 3 && MOVE.light === 10 && MOVE.galley === 20, "movement table");
  ok(hexCost({ t: "mountains" }) === 3 && hexCost({ t: "woods" }) === 2 && hexCost({ t: "river" }) === 3 && hexCost({ t: "river", ford: true }) === 1, "terrain costs, a ford is clear");
  ok(hexCost({ t: "mountains", track: true }) === 2 && hexCost({ t: "woods", track: true }) === 1 && hexCost({ t: "swamp", track: true }) === 1, "tracks: mountains 2, woods and swamp 1");
  ok(!isLost("clear", 1) && isLost("woods", 1) && !isLost("woods", 2) && isLost("mountains", 3) && !isLost("mountains", 4) && isLost("desert", 2), "lost by terrain");
  ok(hasEncounter("clear", 6) && !hasEncounter("clear", 5) && hasEncounter("woods", 5) && hasEncounter("swamp", 4) && !hasEncounter("mountains", 3), "encounter by terrain");
  ok(distance({ q: 0, r: 0 }, { q: 2, r: -2 }) === 2 && distance({ q: 0, r: 0 }, { q: -2, r: 0 }) === 2 && ring({ q: 0, r: 0 }).length === 6, "axial distance and the ring");
  ok(toward({ q: 0, r: 0 }, { q: 2, r: -2 }) === "NE" && toward({ q: 0, r: 0 }, { q: -2, r: 0 }) === "NW" || toward({ q: 0, r: 0 }, { q: -2, r: 0 }) === "SW", "heading toward a place");
  ok(lostDirection(1) === "N" && lostDirection(6) === "NW", "a lost party's die");
  const hexAt = (h) => terrainAt(key(h.q, h.r));
  let d = planDay({ from: { q: 0, r: 0 }, to: { q: 2, r: -2 }, hexAt });
  ok(d.path.length === 2 && d.reason === "arrived" && d.path[1].place === "Fosscraig" && d.spent === 3, "Langstead to Fosscraig by the track: the clear hex (1) and the crag by its track (2) in one long day");
  d = planDay({ from: { q: 0, r: 0 }, to: { q: 2, r: -2 }, hexAt: (h) => { const x = hexAt(h); return x && { ...x, track: false }; } });
  ok(d.path.length === 1 && d.reason === "spent" && d.end.q === 1, "without the track the crag (3) is over the 3 allowed: stop short, two days");
  d = planDay({ from: { q: 0, r: 0 }, dir: "NE", mode: "light", hexAt });
  ok(d.path.length >= 3 && d.spent <= 10, "a light horse goes further");
  d = planDay({ from: { q: 4, r: -4 }, dir: "NE", hexAt });
  ok(d.reason === "unmapped" || d.reason === "spent", "the edge of the referee's map stops the day");
  d = planDay({ from: { q: 0, r: 0 }, dir: "S", hexAt });
  ok(d.path.length === 1 && d.path[0].t === "river" && d.spent === 3, "the first hex of the day is always entered: the river crossing takes the day");
  ok(planDay({ from: { q: 0, r: 0 }, dir: "N", largeParty: 150, hexAt }).allowance === 2, "a party over 100 loses a hex");
  const seq = (...v) => { let i = 0; return () => v[i++]; };
  let e = wanderingMonster("clear", seq(1, 3)); ok(e.type === "men" && e.kind === "Necromancer", "clear, d8 1 men, d12 3 Necromancer");
  e = wanderingMonster("mountains", seq(1, 7)); ok(e.kind === "Cavemen", "mountain men column");
  e = wanderingMonster("desert", seq(7, 2, 2)); ok(e.type === "flyer" && e.kind === "Rocs", "a blank row rerolls");
  e = wanderingMonster("swamp", seq(6, 4)); ok(e.type === "undead" && e.kind === "Wights", "swamp undead");
  e = wanderingMonster("woods", seq(7, 1), { optionalAnimals: true }); ok(e.kind === "Centaurs", "optional woods animals");
  ok(healingAfter(1) === 0 && healingAfter(2) === 0 && healingAfter(3) === 1 && healingAfter(7) === 3, "nothing the first day, a point every other day after");
  ok(!mustRest(5) && mustRest(6), "six days then rest");
  ok(rumourCost(6, 10) === 70 && rumourCost(1, 1) === 11, "a round and the barman");
  const seq2 = (...v) => { let i = 0; return () => v[i++]; };
  let na = rollNumberAppearing("4d10 × 10", seq2(3, 4, 5, 6)); ok(na.n === 180 && na.max === 400, "4d10 x 10: 18 x 10 of a possible 400");
  ok(rollNumberAppearing("1", () => 1).n === 1 && rollNumberAppearing("—", () => 1) === null && rollNumberAppearing("2d6", seq2(2, 5)).n === 7, "number appearing forms");
  ok(sightingYards(seq2(1, 2, 3, 4)) === 100 && sightingYards(seq2(2), true) === 20, "40-240 yards, 10-30 surprised");
  ok(surpriseOf(1, 5) === "monsters" && surpriseOf(5, 2) === "party" && surpriseOf(1, 1) === null && surpriseOf(4, 4) === null, "who surprised whom");
  ok(speedCompare(12, 24) === "slower" && speedCompare(12, 6) === "faster" && speedCompare(12, 18) === "even", "twice as fast or not");
  ok(evasionChance({ partySize: 2, metRatio: 0.5 }).chance === 70 && evasionChance({ partySize: 6, metRatio: 0.1 }).chance === 30 && evasionChance({ partySize: 30, metRatio: 0.9 }).chance === 35, "the evasion table");
  ok(evasionChance({ partySize: 2, metRatio: 0.5, surprise: "party" }).chance === 100 && evasionChance({ partySize: 2, metRatio: 0.5, surprise: "monsters" }).chance === 0, "surprise doubles or negates");
  ok(evasionChance({ partySize: 2, metRatio: 0.5, surprise: "monsters", woods: true }).chance === 35 && evasionChance({ partySize: 2, metRatio: 0.5, woods: true, speed: "faster" }).chance === 100, "woods 10+25; speed +25");
  ok(evasionChance({ partySize: 1, metRatio: null, speed: "slower" }).chance === 45, "unknown number: the middle column, half as fast -25");
  const ps = pursuitStep({ faster: true, dirD6: 2, catchD100: 40, onD6: 1 }); ok(ps.direction === "NE" && ps.caught && !ps.continues, "a faster monster catches on 50");
  ok(!pursuitStep({ faster: false, dirD6: 1, catchD100: 1, onD6: 2 }).caught && pursuitStep({ faster: false, dirD6: 1, catchD100: 1, onD6: 2 }).continues, "not faster: never caught; pursuit goes on on 1-3");
  ok(pursuitStep({ faster: true, woodsOrSwamp: true, dirD6: 1, catchD100: 30, onD6: 6 }).caught === false, "woods or swamp: 25");
  const sk = startingKnowledge(); ok(Object.keys(sk).length === 7 && sk["0,0"].place === "Langstead" && sk["0,1"].t === "river" && !sk["2,-2"], "the home village and its ring of six, not the crag");
  const fm = fullMap(); ok(fm["2,-2"].place === "Fosscraig" && fm["-2,0"].place === "Kingwold" && fm["3,-3"].t === "mountains" && fm["-3,0"].t === "woods" && !fm["6,0"], "the Westmark's lie of the land");
  console.log(`wilderness.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

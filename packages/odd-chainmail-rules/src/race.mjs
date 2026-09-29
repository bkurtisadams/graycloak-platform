/**
 * OD&D — Chainmail engine · racial traits (Men & Magic p.6-8; Monsters & Treasure)
 * odd-chainmail · module/rules/race.mjs
 * system 0.1.129 · slice: race-infravision · stamp 0.1.129-race-infravision.1
 *
 * Single source of truth for the demihuman abilities. Pure and runtime-free:
 * the data models and the Actor document read these helpers; combat-engine.mjs never
 * sees a race. Three abilities reduce to engine currency the combat layer
 * already accepts; the rest are sheet/narrative flags.
 *
 *   Elf magic-weapon pip   Monsters & Treasure restates the Chainmail "extra
 *                          die in normal combat" in OD&D's grammar: +1 to each
 *                          damage die (d6 -> 2-7), magic-weapon-gated. Carried
 *                          as attacker.damageBonus into resolveAttackPool /
 *                          resolveVolley. The Chainmail "+3 dice vs goblins /
 *                          +2 vs orcs" was a mass-table artifact not carried
 *                          into OD&D individual combat; kept out of the engine
 *                          but surfaced for the sheet as ELF_CHAINMAIL_FOES.
 *   Dwarf small-target     "clumsy monsters like Ogres, Giants and the like
 *                          will have a difficult time hitting Dwarves, so score
 *                          only one-half the usual hit points when a hit is
 *                          scored." Defender-side: target.damageHalved when the
 *                          attacker is one of HALF_HP_ATTACKER_TYPES.
 *   Halfling missiles      Deadly accuracy: +1 to every missile roll. Carried
 *                          as attacker.fireBonus (alongside the heavy xbow +1).
 *
 * Saves vs magic (+4 levels) live in tables.mjs; race/class legality and level
 * caps live in chargen.mjs. magicSaveBonus is mirrored here for the sheet only.
 */

/** Attacker chainmailTypes that score only half hit points against a dwarf. */
export const HALF_HP_ATTACKER_TYPES = Object.freeze(["troll", "ogre", "giant"]);

/**
 * Per-race trait bundle. Combat-relevant numbers are consumed by the engine;
 * the booleans/strings drive the sheet. Human is the empty baseline.
 */
export const RACE_TRAITS = Object.freeze({
  human: {
    magicSaveBonus: 0,
    magicWeaponDamageBonus: 0,
    halfHpVsBig: false,
    missileFireBonus: 0,
    stealth: false,
    splitMoveFire: false,
    infravision: 0,
    detection: "",
    notes: ""
  },
  dwarf: {
    magicSaveBonus: 4,
    magicWeaponDamageBonus: 0,
    halfHpVsBig: true,
    missileFireBonus: 0,
    stealth: false,
    splitMoveFire: false,
    infravision: 60,
    detection: "Slanting passages, traps, shifting walls, new construction underground",
    notes: "Only the dwarf may fully employ the +3 Magic War Hammer."
  },
  elf: {
    magicSaveBonus: 0,
    magicWeaponDamageBonus: 1,
    halfHpVsBig: false,
    missileFireBonus: 0,
    stealth: true,
    splitMoveFire: true,
    infravision: 60,
    detection: "Secret and hidden doors",
    notes: "May act as fighter or magic-user; switches between adventures, not within one."
  },
  halfling: {
    magicSaveBonus: 4,
    magicWeaponDamageBonus: 0,
    halfHpVsBig: false,
    missileFireBonus: 1,
    stealth: true,
    splitMoveFire: false,
    infravision: 0,
    detection: "",
    notes: "Deadly accuracy with missiles; blends into background as a scout."
  }
});

/** Normalize a free-text race to a RACE_TRAITS key (defaults to human). */
export function raceKey(raw) {
  const s = String(raw ?? "").toLowerCase().trim();
  if (s.includes("dwarf") || s.includes("gnome")) return "dwarf";
  if (s.includes("elf") || s.includes("elv") || s.includes("fairy") || s.includes("fairies")) return "elf";
  if (s.includes("halfling") || s.includes("hobbit")) return "halfling";
  return "human";
}

/** The full trait bundle for a race (frozen baseline if unknown). */
export function traitsFor(race) {
  return RACE_TRAITS[raceKey(race)] ?? RACE_TRAITS.human;
}

/**
 * Innate racial tongues (Men & Magic p.7-8). These are spoken in addition to
 * the "usual tongues" (Common + the character's divisional language) and do NOT
 * count against the INT-derived learnable-language slots — they are free. Human
 * and halfling are granted no extra creature languages by the book.
 */
export const RACE_LANGUAGES = Object.freeze({
  human: Object.freeze([]),
  dwarf: Object.freeze(["Gnome", "Kobold", "Goblin"]),
  elf: Object.freeze(["Elvish", "Orc", "Hobgoblin", "Gnoll"]),
  halfling: Object.freeze([])
});

/** Innate racial languages for a race (empty array if none / unknown). */
export function racialLanguagesFor(race) {
  return RACE_LANGUAGES[raceKey(race)] ?? RACE_LANGUAGES.human;
}

/** Infravision range in feet (Greyhawk: dwarves and elves see 60' in the dark). */
export function infravisionFor(race) {
  return traitsFor(race).infravision ?? 0;
}

/**
 * Elf advantages "when fighting certain fantastic creatures" (Chainmail). These
 * are mass-combat / Fantasy Combat Table entries, NOT carried into OD&D
 * individual combat — surfaced for the sheet as a reference only. "+N dice"
 * are Combat Table adds; the bare numbers are Fantasy Combat Table scores.
 */
export const ELF_CHAINMAIL_FOES = Object.freeze([
  Object.freeze({ foe: "Goblins", effect: "+3 dice (Combat Table)" }),
  Object.freeze({ foe: "Orcs", effect: "+2 dice (Combat Table)" }),
  Object.freeze({ foe: "Hero-types", effect: "Fantasy Combat Table 9" }),
  Object.freeze({ foe: "Super Heroes", effect: "Fantasy Combat Table 11" }),
  Object.freeze({ foe: "Wizards", effect: "Fantasy Combat Table 10" }),
  Object.freeze({ foe: "Wraiths", effect: "Fantasy Combat Table 8" }),
  Object.freeze({ foe: "Wights", effect: "Fantasy Combat Table 6" }),
  Object.freeze({ foe: "Lycanthropes", effect: "Fantasy Combat Table 9" })
]);

/**
 * Per-die damage bonus an attacker adds to each hit.
 * Elf with a magical weapon: +1 (Monsters & Treasure). Otherwise 0.
 * @param {{race?:string, weaponMagical?:boolean}} o
 * @returns {number}
 */
export function meleeDamageBonus({ race, weaponMagical } = {}) {
  const t = traitsFor(race);
  return weaponMagical ? t.magicWeaponDamageBonus : 0;
}

/**
 * Whether the defender halves the hit points of each blow it takes — a dwarf
 * struck by a clumsy giant-class attacker.
 * @param {{defenderRace?:string, attackerType?:string}} o
 * @returns {boolean}
 */
export function defenseDamageHalved({ defenderRace, attackerType } = {}) {
  const t = traitsFor(defenderRace);
  return t.halfHpVsBig && HALF_HP_ATTACKER_TYPES.includes(String(attackerType ?? "").toLowerCase());
}

/**
 * Per-roll missile bonus from race (halfling accuracy). The heavy-crossbow +1
 * is a weapon property and is added by the caller, not here.
 * @param {{race?:string}} o
 * @returns {number}
 */
export function missileFireBonus({ race } = {}) {
  return traitsFor(race).missileFireBonus;
}

/**
 * Per-die missile damage bonus (elf loosing a magical arrow). Same pip as melee.
 * @param {{race?:string, weaponMagical?:boolean}} o
 * @returns {number}
 */
export function missileDamageBonus({ race, weaponMagical } = {}) {
  return meleeDamageBonus({ race, weaponMagical });
}

/**
 * Whether a figure may split-move and fire this turn: elves on foot only
 * (mounted elves may not — Monsters & Treasure).
 *
 * TODO (mass combat): bow-armed HORSEMEN are also split-move-and-fire eligible
 * per Chainmail ("Horsemen armed with bows are permitted to perform this type of
 * movement"). That needs a `mounted` + `bowArmed` signal on the figure; when it
 * lands, the predicate becomes: (foot elf) OR (mounted && bowArmed && !elf) — a
 * mounted elf stays excluded. Deferred; this slice is elf-on-foot only.
 * @param {{race?:string, mounted?:boolean}} o
 * @returns {boolean}
 */
export function canSplitMoveAndFire({ race, mounted = false } = {}) {
  return traitsFor(race).splitMoveFire && !mounted;
}

/* Self-tests — Node only (`node module/rules/race.mjs`). */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };

  // Key normalization, including the gnome/fairy/hobbit synonyms.
  ok(raceKey("Dwarf") === "dwarf" && raceKey("gnome") === "dwarf", "dwarf/gnome key");
  ok(raceKey("Elf") === "elf" && raceKey("Fairies") === "elf", "elf/fairy key");
  ok(raceKey("Halfling") === "halfling" && raceKey("hobbit") === "halfling", "halfling/hobbit key");
  ok(raceKey("man") === "human" && raceKey("") === "human" && raceKey(null) === "human", "default human");

  // Elf magic-weapon pip — gated on the weapon being magical.
  ok(meleeDamageBonus({ race: "elf", weaponMagical: true }) === 1, "elf magic weapon +1 dmg");
  ok(meleeDamageBonus({ race: "elf", weaponMagical: false }) === 0, "elf plain weapon no bonus");
  ok(meleeDamageBonus({ race: "human", weaponMagical: true }) === 0, "human magic weapon no race bonus");
  ok(meleeDamageBonus({ race: "dwarf", weaponMagical: true }) === 0, "dwarf no damage pip");
  ok(missileDamageBonus({ race: "elf", weaponMagical: true }) === 1, "elf magic arrow +1 dmg");

  // Dwarf half-HP vs clumsy giants — only those three attacker types.
  ok(defenseDamageHalved({ defenderRace: "dwarf", attackerType: "giant" }), "dwarf halves vs giant");
  ok(defenseDamageHalved({ defenderRace: "dwarf", attackerType: "ogre" }), "dwarf halves vs ogre");
  ok(defenseDamageHalved({ defenderRace: "dwarf", attackerType: "troll" }), "dwarf halves vs troll");
  ok(!defenseDamageHalved({ defenderRace: "dwarf", attackerType: "orc" }), "dwarf normal vs orc");
  ok(!defenseDamageHalved({ defenderRace: "dwarf", attackerType: "none" }), "dwarf normal vs man");
  ok(!defenseDamageHalved({ defenderRace: "halfling", attackerType: "giant" }), "halfling does NOT halve (dwarf-only)");
  ok(!defenseDamageHalved({ defenderRace: "elf", attackerType: "giant" }), "elf does not halve");

  // Halfling missiles.
  ok(missileFireBonus({ race: "halfling" }) === 1, "halfling +1 missile");
  ok(missileFireBonus({ race: "elf" }) === 0 && missileFireBonus({ race: "human" }) === 0, "others no missile bonus");

  // Split-move-and-fire: elf on foot yes, mounted no, others no.
  ok(canSplitMoveAndFire({ race: "elf" }), "elf foot split-move-fire");
  ok(!canSplitMoveAndFire({ race: "elf", mounted: true }), "elf mounted may not");
  ok(!canSplitMoveAndFire({ race: "halfling" }), "halfling may not split-move-fire");

  // Sheet-facing trait bundle stays intact.
  ok(traitsFor("dwarf").magicSaveBonus === 4 && traitsFor("halfling").magicSaveBonus === 4, "magic save bonus mirrored");
  ok(traitsFor("elf").stealth === true && traitsFor("dwarf").detection.length > 0, "trait flags present");
  ok(traitsFor("unknown") === RACE_TRAITS.human, "unknown race -> human baseline");

  // Innate racial languages — free, on top of Common + divisional.
  ok(racialLanguagesFor("dwarf").join(",") === "Gnome,Kobold,Goblin", "dwarf racial tongues");
  ok(racialLanguagesFor("elf")[0] === "Elvish" && racialLanguagesFor("elf").includes("Gnoll"), "elf racial tongues incl Elvish + Gnoll");
  ok(racialLanguagesFor("human").length === 0 && racialLanguagesFor("halfling").length === 0, "human/halfling no racial tongues");
  ok(racialLanguagesFor("gnome").includes("Goblin"), "gnome buckets to dwarf tongues");

  // Infravision (Greyhawk: dwarves and elves 60'; humans and halflings none).
  ok(infravisionFor("dwarf") === 60 && infravisionFor("elf") === 60, "dwarf/elf infravision 60'");
  ok(infravisionFor("human") === 0 && infravisionFor("halfling") === 0, "human/halfling no infravision");
  ok(ELF_CHAINMAIL_FOES[1].foe === "Orcs" && ELF_CHAINMAIL_FOES[1].effect.includes("+2"), "elf +2 dice vs orcs (Chainmail ref)");

  console.log(`race.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

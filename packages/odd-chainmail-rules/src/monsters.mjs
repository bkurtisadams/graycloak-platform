/**
 * OD&D — Chainmail engine · Book II starter bestiary
 * odd-chainmail · module/rules/monsters.mjs
 * system 0.1.215 · slice: book-ii-bestiary · stamp 0.1.214-book-ii-bestiary.1
 *
 * Pure source records for the monster compendium. Book II supplies the OD&D
 * reference block; the Chainmail Fantasy Supplement supplies normal-combat
 * identity and special-ability notes. The pack builder is the only writer of
 * src/packs/monsters.
 */

import { HitOnlyBy } from "./combat-engine.mjs";
import { MonsterAttackMethod } from "./monster-attacks.mjs";
import { deriveMaxHpAverage } from "./hit-dice.mjs";

export const MONSTER_FOLDERS = Object.freeze([
  Object.freeze({ key: "humanoids", name: "Humanoids", sort: 100000 }),
  Object.freeze({ key: "undead", name: "Undead", sort: 200000 }),
  Object.freeze({ key: "fantastic-creatures", name: "Fantastic Creatures", sort: 300000 }),
  Object.freeze({ key: "clean-up-crew", name: "Clean-Up Crew", sort: 400000 })
]);

const IMG = Object.freeze({
  humanoids: "icons/svg/mystery-man.svg",
  undead: "systems/odd-chainmail/assets/icons/skull.svg",
  "fantastic-creatures": "systems/odd-chainmail/assets/icons/cave.svg",
  "clean-up-crew": "systems/odd-chainmail/assets/icons/flame.svg"
});

const ability = (kind, name, text, tag = "", value = null) => ({ kind, name, text, tag, value });
const chainmail = (attacksAs = "", attackFigures = 0, defendsAs = "", defenseFigures = 0, extraDice = 0) => ({
  attacksAs, attackFigures, extraDice, defendsAs, defenseFigures
});

/**
 * Mind of each monster: intelligence tier (also the default behaviour
 * profile), language, and whether a group knows common ("always" for men,
 * "roll" = 20% per group, Book I). null language = does not speak. talks and
 * sleeps = % chance a dragon speaks at all or is found asleep (Book II).
 * Monsters never speak an alignment tongue (Kurt's ruling, Oct 2026).
 */
const M = "mindless", B = "bestial", C = "cunning", I = "intelligent";
const MINDS = Object.freeze({
  goblin: [C, "goblin"], kobold: [C, "kobold"], orc: [C, "orc"], hobgoblin: [C, "hobgoblin"], gnoll: [C, "gnoll"],
  ogre: [C, "ogre"], troll: [C, "troll"],
  skeleton: [M], zombie: [M], ghoul: [B], wight: [C], gargoyle: [B], minotaur: [B],
  "ochre-jelly": [M], "black-pudding": [M],
  bandit: [C, "common", "always"], berserker: [C, "common", "always"], brigand: [C, "common", "always"], caveman: [C, "caveman"],
  merman: [C, "merman"], gnome: [C, "gnome"], dwarf: [C, "dwarvish"], elf: [C, "elvish"],
  pixie: [I, "pixie"], nixie: [I, "nixie"], dryad: [I, "dryad"],
  wraith: [C], mummy: [C], spectre: [I], vampire: [I, "common", "always"],
  cockatrice: [B], basilisk: [B], medusa: [I, "medusa"], gorgon: [B], manticore: [B], hydra: [B], chimera: [B], wyvern: [B],
  "dragon-white": [I, "dragon", "roll", 25, 60], "dragon-black": [I, "dragon", "roll", 40, 50], "dragon-green": [I, "dragon", "roll", 55, 40],
  "dragon-blue": [I, "dragon", "roll", 70, 30], "dragon-red": [I, "dragon", "roll", 85, 20], "dragon-golden": [I, "dragon", "roll", 100, 10],
  "purple-worm": [M], centaur: [I, "centaur"], unicorn: [I, "unicorn"], treant: [I, "treant"], pegasus: [B], hippogriff: [B], roc: [B], griffon: [B],
  "invisible-stalker": [I], "elemental-air": [C], "elemental-earth": [C], "elemental-fire": [C], "elemental-water": [C],
  djinn: [I, "djinn"], efreet: [I, "efreet"],
  "giant-hill": [I, "giant-hill"], "giant-stone": [I, "giant-stone"], "giant-frost": [I, "giant-frost"], "giant-fire": [I, "giant-fire"], "giant-cloud": [I, "giant-cloud"],
  werewolf: [B], wereboar: [B], weretiger: [B], werebear: [B],
  "green-slime": [M], "gray-ooze": [M], "yellow-mold": [M],
  "horse-light": [B], "horse-medium": [B], "horse-heavy": [B], "horse-draft": [B], mule: [B]
});

function mindOf(key) {
  const [intelligence, language = null, common, talks = null, sleeps = null] = MINDS[key] ?? [B];
  return Object.freeze({
    intelligence,
    behavior: intelligence,
    language,
    common: language ? (common ?? "roll") : null,
    talks,
    sleeps
  });
}

/**
 * Morale dice adjustment for a monster, read from its data (Book II): the
 * monster's own morale bonus, plus any "light" vulnerability in full
 * daylight (goblins, kobolds, orcs −1). Never-check monsters return null.
 */
/** Radius in inches inside which enemy NPC units check morale (dragons 15"; wraiths 24" and rocs 48", their full move). PCs never check. */
export function fearRadius(entry) {
  return (entry?.specialAbilities?.entries ?? []).find((e) => e.tag === "fear")?.value ?? 0;
}

export function moraleDiceBonus(entry, { daylight = false } = {}) {
  if (!entry || entry.morale?.never) return null;
  let b = entry.morale?.bonus ?? 0;
  if (daylight) for (const e of entry.specialAbilities?.entries ?? []) if (e.tag === "light") b += e.value ?? 0;
  return b;
}

function monster({
  key,
  name,
  folder,
  ac,
  hd,
  move,
  alignment = "chaos",
  chainmailType = "none",
  attack,
  morale = {},
  reference,
  hitOnlyBy = HitOnlyBy.ANY,
  abilities = [],
  description = "",
  size = 1
}) {
  return Object.freeze({
    key,
    name,
    folder,
    img: IMG[folder] ?? IMG.humanoids,
    ac,
    hd: Object.freeze({ count: hd.count, dieSize: hd.dieSize ?? 6, bonus: hd.bonus ?? 0 }),
    move: Object.freeze({ ground: move.ground, fly: move.fly ?? 0, charge: move.charge ?? 0 }),
    alignment,
    mind: mindOf(key),
    chainmailType,
    attack: Object.freeze({
      method: attack.method,
      description: attack.description ?? "",
      weaponClass: attack.weaponClass ?? 4,
      damage: Object.freeze({ dice: attack.damage?.dice ?? 1, bonus: attack.damage?.bonus ?? 0 }),
      diceOverride: attack.diceOverride ?? 0,
      chainmail: Object.freeze(attack.chainmail ?? chainmail())
    }),
    morale: Object.freeze({ rating: morale.rating ?? 0, never: morale.never ?? false, bonus: morale.bonus ?? 0 }),
    // Grid footprint in 3⅓' cells per side (1 = man-sized). Proposed defaults; Book II gives sizes only for giants.
    size,
    reference: Object.freeze({
      numberAppearing: reference.numberAppearing,
      inLairPct: reference.inLairPct,
      treasureType: reference.treasureType ?? ""
    }),
    specialAbilities: Object.freeze({
      hitOnlyBy,
      entries: Object.freeze(abilities.map((entry) => Object.freeze(entry))),
      description
    })
  });
}

export const MONSTERS = Object.freeze([
  monster({
    key: "goblin", name: "Goblin", folder: "humanoids", ac: 6,
    hd: { count: 1, bonus: -1 }, move: { ground: 6, charge: 9 },
    chainmailType: "goblin",
    attack: { method: MonsterAttackMethod.WEAPON, description: "Weapon", weaponClass: 4, chainmail: chainmail("HF", 1, "LF", 1) },
    morale: { rating: 5 }, reference: { numberAppearing: "4d10 × 10", inLairPct: 50 },
    abilities: [
      ability("other", "Dark sight", "Sees well in darkness or dim light.", "senses"),
      ability("vulnerability", "Bright light", "In full daylight, subtract 1 from attack and morale dice.", "light", -1),
      ability("other", "Dwarf hatred", "Attacks dwarves on sight when able.")
    ],
    description: "Small subterranean humanoids. A lair includes a goblin king and 5d6 hobgoblin guards. Each normally carries 1d6 gold pieces."
  }),

  monster({
    key: "kobold", name: "Kobold", folder: "humanoids", ac: 7,
    hd: { count: 1, dieSize: 3 }, move: { ground: 6, charge: 9 },
    chainmailType: "kobold",
    attack: { method: MonsterAttackMethod.WEAPON, description: "Weapon", weaponClass: 4, chainmail: chainmail("HF", 1, "LF", 1) },
    morale: { rating: 5 }, reference: { numberAppearing: "4d10 × 10", inLairPct: 50 },
    abilities: [
      ability("other", "Dark sight", "Sees well in darkness or dim light.", "senses"),
      ability("vulnerability", "Bright light", "In full daylight, subtract 1 from attack and morale dice.", "light", -1),
      ability("other", "Dwarf hatred", "Attacks dwarves or gnomes within reach when able.")
    ],
    description: "Kobolds use the goblin rules but take only 1d3 hit points. Each normally carries 1d6 gold pieces."
  }),

  monster({
    key: "orc", name: "Orc", folder: "humanoids", ac: 6,
    hd: { count: 1 }, move: { ground: 9, charge: 12 },
    chainmailType: "orc",
    attack: { method: MonsterAttackMethod.WEAPON, description: "Weapon", weaponClass: 4, chainmail: chainmail("HF", 1, "HF", 1) },
    morale: { rating: 5 }, reference: { numberAppearing: "3d10 × 10", inLairPct: 50, treasureType: "D" },
    abilities: [
      ability("other", "Dark sight", "Sees well in darkness or dim light.", "senses"),
      ability("vulnerability", "Bright light", "In full daylight, subtract 1 from attack and morale dice.", "light", -1),
      ability("other", "Tribal hostility", "Orcs of different tribes attack one another unless a stronger leader maintains obedience.")
    ],
    description: "Orcs live in tribal cave complexes or fortified villages. Record a tribe when placing them on a campaign map; nearby orcs usually belong to the same tribe."
  }),

  monster({
    key: "hobgoblin", name: "Hobgoblin", folder: "humanoids", ac: 5,
    hd: { count: 1, bonus: 1 }, move: { ground: 9 },
    chainmailType: "hobgoblin",
    attack: { method: MonsterAttackMethod.WEAPON, description: "Weapon", weaponClass: 4, chainmail: chainmail("AF", 1, "HF", 1) },
    morale: { rating: 6, bonus: 1 }, reference: { numberAppearing: "2d10 × 10", inLairPct: 30, treasureType: "D" },
    abilities: [ability("other", "Fearless goblin", "Hobgoblins have 1 point better morale than goblins.")],
    description: "Large, disciplined goblins. A hobgoblin king fights as an ogre and is attended by 1d3+1 guards that do the same."
  }),

  monster({
    key: "gnoll", name: "Gnoll", folder: "humanoids", ac: 5,
    hd: { count: 2 }, move: { ground: 9 },
    chainmailType: "gnoll",
    attack: { method: MonsterAttackMethod.WEAPON, description: "Weapon", weaponClass: 4, chainmail: chainmail("AF", 1, "HF", 1) },
    morale: { rating: 7, bonus: 2 }, reference: { numberAppearing: "2d10 × 10", inLairPct: 30, treasureType: "D" },
    abilities: [ability("other", "High morale", "Gnolls have 2 points better morale than ordinary goblins.")],
    description: "Gnolls otherwise resemble hobgoblins. Their king and 1d4 bodyguards fight as trolls but do not regenerate."
  }),

  monster({
    key: "ogre", name: "Ogre", size: 2, folder: "humanoids", ac: 5,
    hd: { count: 4, bonus: 1 }, move: { ground: 9, charge: 12 },
    chainmailType: "ogre",
    attack: { method: MonsterAttackMethod.PROFILE, description: "Huge weapon", damage: { dice: 1, bonus: 2 }, chainmail: chainmail("HF", 6, "HF", 6) },
    morale: { rating: 8 }, reference: { numberAppearing: "3d6", inLairPct: 30, treasureType: "C" },
    abilities: [ability("other", "Dark sight", "Sees in normal darkness as if it were light.", "senses")],
    description: "Ogres stand roughly 7 to 10 feet tall. A wandering ogre carries 1d6 × 100 gold pieces; a lair also has Treasure Type C."
  }),

  monster({
    key: "troll", name: "Troll", size: 2, folder: "humanoids", ac: 4,
    hd: { count: 6, bonus: 3 }, move: { ground: 12, charge: 12 },
    chainmailType: "troll",
    attack: { method: MonsterAttackMethod.PROFILE, description: "Talons and fangs", damage: { dice: 1, bonus: 0 }, chainmail: chainmail("HF", 6, "HF", 6) },
    morale: { never: true }, reference: { numberAppearing: "2d6", inLairPct: 50, treasureType: "D" },
    abilities: [
      ability("defense", "Regeneration", "Beginning on the third melee round after being wounded, restores 3 hit points per turn.", "regeneration", 3),
      ability("vulnerability", "Fire or acid", "Burning or immersion in acid prevents sundered parts from regenerating."),
      ability("other", "Dark sight", "Sees in normal darkness as if it were light.", "senses")
    ],
    description: "Thin, rubbery and difficult to destroy. Even a sundered troll eventually returns unless fire or acid prevents regeneration; it resumes combat upon reaching 6 hit points."
  }),

  monster({
    key: "skeleton", name: "Skeleton", folder: "undead", ac: 7,
    hd: { count: 1, dieSize: 3 }, move: { ground: 6 },
    attack: { method: MonsterAttackMethod.WEAPON, description: "Weapon", weaponClass: 4 },
    morale: { never: true }, reference: { numberAppearing: "3d10", inLairPct: 0 },
    abilities: [
      ability("defense", "Unliving", "Never checks morale and fights until destroyed."),
      ability("other", "Controlled undead", "Acts under the instructions of its magic-user or chaotic cleric creator.")
    ],
    description: "Animated bones found around graveyards, forsaken places and dungeons, or set to guard an object."
  }),

  monster({
    key: "zombie", name: "Zombie", folder: "undead", ac: 8,
    hd: { count: 1 }, move: { ground: 6, charge: 9 },
    attack: { method: MonsterAttackMethod.PROFILE, description: "Dead hands", damage: { dice: 1, bonus: 0 }, chainmail: chainmail("HF", 1, "HH", 1) },
    morale: { never: true }, reference: { numberAppearing: "3d10", inLairPct: 0 },
    abilities: [
      ability("defense", "Unliving", "Never checks morale and fights until destroyed."),
      ability("other", "Controlled undead", "Acts under the instructions of its magic-user or chaotic cleric creator.")
    ],
    description: "Animated corpses. In Chainmail normal combat they attack as orcs, defend in the wight class, and move as goblins."
  }),

  monster({
    key: "ghoul", name: "Ghoul", folder: "undead", ac: 6,
    hd: { count: 2 }, move: { ground: 9, charge: 9 },
    attack: { method: MonsterAttackMethod.PROFILE, description: "Paralyzing touch", damage: { dice: 1, bonus: 0 }, chainmail: chainmail("LH", 1, "HH", 1) },
    morale: { rating: 10 }, reference: { numberAppearing: "2d12", inLairPct: 20, treasureType: "B" },
    abilities: [
      ability("attack", "Paralyzing touch", "A normal figure touched is paralyzed; elves are immune.", "paralysis", 1),
      ability("attack", "Create ghoul", "A man-type killed by a ghoul becomes a ghoul."),
      ability("other", "Dark sight", "Sees in normal darkness as if it were light.", "senses"),
      ability("vulnerability", "Full light", "Subtract 1 from its dice in full light.", "light", -1)
    ],
    description: "Corpse-eating undead that fight in ordinary melee and are subject to missile fire."
  }),

  monster({
    key: "wight", name: "Wight", folder: "undead", ac: 5,
    hd: { count: 3 }, move: { ground: 9, charge: 9 },
    attack: { method: MonsterAttackMethod.PROFILE, description: "Life-draining touch", damage: { dice: 1, bonus: 0 }, chainmail: chainmail("LH", 1, "HH", 1) },
    morale: { rating: 10 }, reference: { numberAppearing: "2d12", inLairPct: 60, treasureType: "B" },
    hitOnlyBy: HitOnlyBy.SILVER,
    abilities: [
      ability("attack", "Energy drain", "Each melee hit drains one experience level and its corresponding Hit Die.", "drain", 1),
      ability("attack", "Create wight", "A man-type killed or fully drained by a wight becomes a wight."),
      ability("defense", "Enchanted body", "Normal missiles have no effect; silver-tipped or magical missiles can harm it.", "immunity"),
      ability("other", "Dark sight", "Sees in normal darkness as if it were light.", "senses"),
      ability("vulnerability", "Full light", "Subtract 1 from its dice in full light.", "light", -1)
    ],
    description: "Undead that drain life energy. The enforced weapon gate allows silver or magical weapons; referee adjudication still governs Book II's special missile damage."
  }),

  monster({
    key: "gargoyle", name: "Gargoyle", folder: "fantastic-creatures", ac: 5,
    hd: { count: 4 }, move: { ground: 9, fly: 15 },
    attack: { method: MonsterAttackMethod.PROFILE, description: "Horns, talons and fangs", damage: { dice: 1, bonus: 0 } },
    reference: { numberAppearing: "2d10", inLairPct: 25, treasureType: "C" },
    hitOnlyBy: HitOnlyBy.MAGIC,
    abilities: [
      ability("defense", "Magic immunity", "Only magical weapons or magical attacks affect a gargoyle.", "immunity"),
      ability("other", "Hostile", "Usually attacks without provocation and can plan with at least semi-intelligence.")
    ],
    description: "A horned, winged reptilian creature resembling the figures carved into medieval buildings."
  }),

  monster({
    key: "minotaur", name: "Minotaur", size: 2, folder: "fantastic-creatures", ac: 6,
    hd: { count: 6 }, move: { ground: 12 },
    attack: { method: MonsterAttackMethod.PROFILE, description: "Horns and weapon", damage: { dice: 1, bonus: 0 } },
    morale: { never: true }, reference: { numberAppearing: "1d8", inLairPct: 10, treasureType: "C" },
    abilities: [
      ability("other", "Relentless", "Always attacks and pursues while prey remains in sight."),
      ability("defense", "Fearless", "Never checks morale.")
    ],
    description: "A bull-headed, man-eating creature larger than a human."
  }),

  monster({
    key: "ochre-jelly", name: "Ochre Jelly", size: 2, folder: "clean-up-crew", ac: 8,
    hd: { count: 5 }, move: { ground: 3 }, alignment: "neutral",
    attack: { method: MonsterAttackMethod.PROFILE, description: "Acidic contact", damage: { dice: 1, bonus: 0 } },
    reference: { numberAppearing: "1", inLairPct: 0 },
    abilities: [
      ability("defense", "Weapon and lightning division", "Weapon blows or lightning divide it into smaller ochre jellies rather than killing it.", "immunity"),
      ability("vulnerability", "Fire or cold", "Fire or cold kills it."),
      ability("attack", "Acidic contact", "Causes 1d6 damage per turn to exposed flesh."),
      ability("other", "Wood eater", "Destroys wood, does not affect stone or metal, and seeps through small cracks.")
    ],
    description: "A giant amoeba and dungeon clean-up creature. Its division into smaller jellies remains a referee procedure."
  }),

  monster({
    key: "black-pudding", name: "Black Pudding", size: 2, folder: "clean-up-crew", ac: 6,
    hd: { count: 10 }, move: { ground: 6 }, alignment: "neutral",
    attack: { method: MonsterAttackMethod.PROFILE, description: "Corrosive contact", damage: { dice: 3, bonus: 0 } },
    reference: { numberAppearing: "1", inLairPct: 0 },
    abilities: [
      ability("defense", "Cold immunity", "Cold does not affect a black pudding.", "immunity"),
      ability("defense", "Chop and lightning division", "Chopping blows or lightning divide it into smaller puddings rather than killing it.", "immunity"),
      ability("vulnerability", "Fire", "Fire kills it."),
      ability("attack", "Corrosive contact", "Causes 3d6 damage to exposed flesh and rapidly corrodes metal."),
      ability("other", "Surface crawler", "Dissolves wood, leaves stone unharmed, passes through small openings, and travels on walls or ceilings.")
    ],
    description: "A corrosive dungeon clean-up creature. Armor exposed by passing through it loses foot and leg protection on the following turn."
  }),

  monster({
    key: "bandit", name: "Bandit", folder: "humanoids", ac: 6,
    hd: { count: 1 }, move: { ground: 12 }, alignment: "neutral", size: 1,
    attack: { method: MonsterAttackMethod.WEAPON, description: "Weapon", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("LF", 1, "LF", 1, 0) },
    morale: { rating: 5 }, reference: { numberAppearing: "3d10 × 10", inLairPct: 15, treasureType: "A" },
    abilities: [
      ability("other", "Leaders", "Per 30 bandits a 4th-level fighter; per 50 a 5th–6th; per 100 an 8th–9th; over 200, chances of a Magic-User and Cleric.")
    ],
    description: "Normal men under super-normal leaders. Force: light foot (leather and shield) 40%, short bow or light crossbow 25%, light horse 25%, medium horse 20%. Half neutral, half chaotic."
  }),

  monster({
    key: "berserker", name: "Berserker", folder: "humanoids", ac: 7,
    hd: { count: 1, bonus: 1 }, move: { ground: 12 }, alignment: "neutral", size: 1,
    attack: { method: MonsterAttackMethod.WEAPON, description: "Weapon", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("LF", 1, "LF", 1, 0) },
    morale: { never: true }, reference: { numberAppearing: "3d10 × 10", inLairPct: 15, treasureType: "A" },
    abilities: [
      ability("attack", "Battle fury", "+2 to dice against normal men.", "fury", 2),
      ability("defense", "Fearless", "Never checks morale.")
    ],
    description: "Men mad with battle-lust, led only by fighters as for bandits. Chainmail treats them as leather and shield."
  }),

  monster({
    key: "brigand", name: "Brigand", folder: "humanoids", ac: 6,
    hd: { count: 1 }, move: { ground: 12 }, alignment: "chaos", size: 1,
    attack: { method: MonsterAttackMethod.WEAPON, description: "Weapon", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("LF", 1, "LF", 1, 0) },
    morale: { rating: 6, bonus: 1 }, reference: { numberAppearing: "3d10 × 10", inLairPct: 15, treasureType: "A" },
    abilities: [
      ability("other", "Steadier", "+1 morale over bandits.", "morale", 1)
    ],
    description: "As bandits, but chaotic and +1 morale."
  }),

  monster({
    key: "caveman", name: "Caveman", folder: "humanoids", ac: 9,
    hd: { count: 2 }, move: { ground: 12 }, alignment: "neutral", size: 1,
    attack: { method: MonsterAttackMethod.WEAPON, description: "Club (as morning star)", weaponClass: 6, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("LF", 1, "LF", 1, 0) },
    morale: { rating: 4, bonus: -1 }, reference: { numberAppearing: "3d10 × 10", inLairPct: 15, treasureType: "A" },
    abilities: [
      ability("other", "Primitive", "Fights as a 2nd-level Fighting-Man with morning-star-class clubs; no armour; −1 morale.", "morale", -1)
    ],
    description: "Primitive men, always neutral."
  }),

  monster({
    key: "merman", name: "Merman", folder: "humanoids", ac: 7,
    hd: { count: 1, bonus: 1 }, move: { ground: 12 }, alignment: "neutral", size: 1,
    attack: { method: MonsterAttackMethod.WEAPON, description: "Trident or darts", weaponClass: 8, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("LF", 1, "LF", 1, 0) },
    morale: { never: true }, reference: { numberAppearing: "3d10 × 10", inLairPct: 15, treasureType: "A" },
    abilities: [
      ability("vulnerability", "Out of water", "−1 when fighting on land.", "land", -1)
    ],
    description: "Sea folk much like berserkers, armed with tridents and darts; armour as leather."
  }),

  monster({
    key: "gnome", name: "Gnome", folder: "humanoids", ac: 5,
    hd: { count: 1 }, move: { ground: 6 }, alignment: "neutral", size: 1,
    attack: { method: MonsterAttackMethod.WEAPON, description: "Weapon", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("HF", 1, "LF", 1, 0) },
    morale: { rating: 5 }, reference: { numberAppearing: "4d10 × 10", inLairPct: 60, treasureType: "C" },
    abilities: [
      ability("defense", "Small", "Ogres, giants and similar clumsy monsters score half damage on them.", "small", 0.5)
    ],
    description: "Smaller cousins of dwarves living in hills and lowland burrows; otherwise as dwarves."
  }),

  monster({
    key: "dwarf", name: "Dwarf", folder: "humanoids", ac: 4,
    hd: { count: 1 }, move: { ground: 6 }, alignment: "law", size: 1,
    attack: { method: MonsterAttackMethod.WEAPON, description: "Axe or hammer", weaponClass: 2, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("HF", 1, "LF", 1, 0) },
    morale: { rating: 5 }, reference: { numberAppearing: "4d10 × 10", inLairPct: 50, treasureType: "G" },
    abilities: [
      ability("defense", "Small", "Ogres, giants and similar clumsy monsters score half damage on them.", "small", 0.5),
      ability("other", "Champions", "One above-average fighter per 40 (level 1d6; 3rd–6th in the lair), 10% per level for a magic item."),
      ability("other", "Goblin hatred", "Attacks goblins and kobolds first.")
    ],
    description: "Mountain folk; may keep domesticated bears or wolves as guards."
  }),

  monster({
    key: "elf", name: "Elf", folder: "humanoids", ac: 5,
    hd: { count: 1, bonus: 1 }, move: { ground: 12 }, alignment: "law", size: 1,
    attack: { method: MonsterAttackMethod.WEAPON, description: "Sword, spear or bow", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("HF", 1, "HF", 1, 0) },
    morale: { rating: 6 }, reference: { numberAppearing: "3d10 × 10", inLairPct: 25, treasureType: "E" },
    abilities: [
      ability("other", "Stealth", "Moves silently; nearly invisible in grey-green cloaks."),
      ability("other", "Split-move and fire", "Elves on foot may split-move and fire."),
      ability("attack", "Magic weapons", "With magic weapons they add 1 to each damage die."),
      ability("other", "Leaders", "One exceptional elf per 50; a Hero/Warlock per 100.")
    ],
    description: "Half bear bows, half spears; all carry swords."
  }),

  monster({
    key: "pixie", name: "Pixie", folder: "fantastic-creatures", ac: 6,
    hd: { count: 1 }, move: { ground: 9, fly: 18 }, alignment: "neutral", size: 1,
    attack: { method: MonsterAttackMethod.WEAPON, description: "Small weapon", weaponClass: 1, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("LF", 1, "LF", 1, 0) },
    morale: { rating: 3 }, reference: { numberAppearing: "1d10 × 10", inLairPct: 25, treasureType: "C" },
    abilities: [
      ability("defense", "Invisible", "Naturally invisible and can attack while remaining so; seen only by magic, dragons or high-level fighters.", "invisible")
    ],
    description: "Air sprites."
  }),

  monster({
    key: "nixie", name: "Nixie", folder: "fantastic-creatures", ac: 7,
    hd: { count: 1 }, move: { ground: 12 }, alignment: "neutral", size: 1,
    attack: { method: MonsterAttackMethod.WEAPON, description: "Dagger or javelin", weaponClass: 1, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("LF", 1, "LF", 1, 0) },
    morale: { rating: 3 }, reference: { numberAppearing: "1d10 × 10", inLairPct: 100, treasureType: "B" },
    abilities: [
      ability("attack", "Charm", "Per 10 nixies, one Charm Person at anyone within 3\" of the lair; the charmed go underwater for a year."),
      ability("other", "Fish", "Accompanied in water by 10–100 large fish that attack on command.")
    ],
    description: "Water sprites who enslave humans for a year."
  }),

  monster({
    key: "dryad", name: "Dryad", folder: "fantastic-creatures", ac: 5,
    hd: { count: 2 }, move: { ground: 12 }, alignment: "neutral", size: 1,
    attack: { method: MonsterAttackMethod.NONE, description: "None", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("", 0, "", 0, 0) },
    morale: { rating: 3 }, reference: { numberAppearing: "1d6", inLairPct: 20, treasureType: "D" },
    abilities: [
      ability("attack", "Charm", "Powerful Charm Person (+10% chance) thrown at anyone who approaches or follows (90%). The charmed never return.")
    ],
    description: "Shy tree sprites who stay within 24\" of their trees."
  }),

  monster({
    key: "wraith", name: "Wraith", folder: "undead", ac: 3,
    hd: { count: 4 }, move: { ground: 12, fly: 24 }, alignment: "chaos", size: 1,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Life-draining touch", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("AF", 2, "AF", 2, 0) },
    morale: { rating: 10 }, reference: { numberAppearing: "2d8", inLairPct: 20, treasureType: "E" },
    hitOnlyBy: HitOnlyBy.SILVER,
    abilities: [
      ability("special", "Dread", "Enemy NPC units within its full move (24\") check morale as for excess casualties, as for a Super Hero within charge range (Chainmail; Kurt, Oct 2026).", "fear", 24),
      ability("attack", "Energy drain", "Each melee hit drains one level.", "drain", 1),
      ability("defense", "Enchanted body", "Silver-tipped arrows score only half a die; magic arrows one die.", "immunity")
    ],
    description: "High-class wights with more mobility, hit dice and treasure."
  }),

  monster({
    key: "mummy", name: "Mummy", folder: "undead", ac: 3,
    hd: { count: 5, bonus: 1 }, move: { ground: 6 }, alignment: "chaos", size: 1,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Rotting touch", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("", 0, "", 0, 0) },
    morale: { never: true }, reference: { numberAppearing: "1d12", inLairPct: 30, treasureType: "D" },
    hitOnlyBy: HitOnlyBy.MAGIC,
    abilities: [
      ability("attack", "Mummy rot", "Wounds heal ten times slower; Cure Disease within an hour reduces this to twice.", "disease"),
      ability("defense", "Magic only", "Only magic weapons hit it, and all hits and bonuses are halved.", "immunity"),
      ability("vulnerability", "Fire", "Vulnerable to fire, even a torch.")
    ],
    description: "Undead whose touch rots."
  }),

  monster({
    key: "spectre", name: "Spectre", folder: "undead", ac: 2,
    hd: { count: 6 }, move: { ground: 15, fly: 30 }, alignment: "chaos", size: 1,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Draining touch", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("", 0, "", 0, 0) },
    morale: { never: true }, reference: { numberAppearing: "1d8", inLairPct: 25, treasureType: "E" },
    hitOnlyBy: HitOnlyBy.MAGIC,
    abilities: [
      ability("attack", "Energy drain", "Each hit drains two levels.", "drain", 2),
      ability("defense", "Incorporeal", "Immune to all normal weapons, silver included; magic weapons hit.", "immunity"),
      ability("attack", "Create spectre", "Men slain become spectres under their maker's control.")
    ],
    description: "Bodiless undead."
  }),

  monster({
    key: "vampire", name: "Vampire", folder: "undead", ac: 2,
    hd: { count: 8 }, move: { ground: 12, fly: 18 }, alignment: "chaos", size: 1,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Bite", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("", 0, "", 0, 0) },
    morale: { never: true }, reference: { numberAppearing: "1d6", inLairPct: 20, treasureType: "F" },
    hitOnlyBy: HitOnlyBy.MAGIC,
    abilities: [
      ability("attack", "Energy drain", "Each hit drains two levels.", "drain", 2),
      ability("defense", "Regeneration", "Regenerates 3 hit points per turn from the moment it is hit; at 0 it turns gaseous rather than dying.", "regeneration", 3),
      ability("attack", "Charming gaze", "As Charm Person with −2 on the save."),
      ability("vulnerability", "Sun, running water, stake", "Killed by sunlight, immersion in running water, or a stake through the heart; repelled by garlic, mirrors and crosses."),
      ability("other", "Summons", "Calls 10–100 rats or bats, or 3–18 wolves; can become a huge bat or gas.")
    ],
    description: "Hit dice 7–9 (8 shown). Must rest in a coffin of native soil by day."
  }),

  monster({
    key: "cockatrice", name: "Cockatrice", folder: "fantastic-creatures", ac: 6,
    hd: { count: 5 }, move: { ground: 9, fly: 18 }, alignment: "chaos", size: 1,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Petrifying touch", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("", 0, "", 0, 0) },
    morale: { rating: 0 }, reference: { numberAppearing: "1d8", inLairPct: 35, treasureType: "D" },
    abilities: [
      ability("attack", "Petrifying touch", "Touch turns to stone (save vs stone).", "petrify")
    ],
    description: "A smaller, flying basilisk. Not intelligent."
  }),

  monster({
    key: "basilisk", name: "Basilisk", folder: "fantastic-creatures", ac: 4,
    hd: { count: 6, bonus: 1 }, move: { ground: 6 }, alignment: "chaos", size: 2,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Bite", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("", 0, "", 0, 0) },
    morale: { never: true }, reference: { numberAppearing: "1d6", inLairPct: 40, treasureType: "F" },
    abilities: [
      ability("attack", "Petrifying touch and gaze", "Touch or meeting its glance turns to stone (save vs stone).", "petrify"),
      ability("vulnerability", "Own reflection", "Can be petrified by its own reflection in good light.")
    ],
    description: "Not intelligent."
  }),

  monster({
    key: "medusa", name: "Medusa", folder: "fantastic-creatures", ac: 8,
    hd: { count: 4 }, move: { ground: 9 }, alignment: "chaos", size: 1,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Snake bite", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("", 0, "", 0, 0) },
    morale: { rating: 0 }, reference: { numberAppearing: "1d4", inLairPct: 75, treasureType: "F" },
    abilities: [
      ability("attack", "Petrifying gaze", "Those who meet its eyes turn to stone (save vs stone).", "petrify"),
      ability("attack", "Poison", "The asps' bite is poisonous (save vs poison).", "poison"),
      ability("vulnerability", "Reflection", "Subject to its own reflected glance.")
    ],
    description: "Intelligent; tries to beguile victims into looking."
  }),

  monster({
    key: "gorgon", name: "Gorgon", folder: "fantastic-creatures", ac: 2,
    hd: { count: 8 }, move: { ground: 12 }, alignment: "chaos", size: 2,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Horns", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("", 0, "", 0, 0) },
    morale: { rating: 0 }, reference: { numberAppearing: "1d4", inLairPct: 50, treasureType: "E" },
    abilities: [
      ability("attack", "Petrifying breath", "Breath turns to stone those within 6' (save vs stone).", "petrify")
    ],
    description: "Bull-like with iron scales."
  }),

  monster({
    key: "manticore", name: "Manticore", folder: "fantastic-creatures", ac: 4,
    hd: { count: 6, bonus: 1 }, move: { ground: 12, fly: 18 }, alignment: "chaos", size: 2,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Claws and bite", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("", 0, "", 0, 0) },
    morale: { rating: 0 }, reference: { numberAppearing: "1d4", inLairPct: 25, treasureType: "D" },
    abilities: [
      ability("attack", "Tail spikes", "24 spikes, fired 6 at a time, as crossbow bolts with 18\" range.", "missile", 6)
    ],
    description: "Lion body, man's face, dragon wings; prefers men as prey."
  }),

  monster({
    key: "hydra", name: "Hydra", folder: "fantastic-creatures", ac: 5,
    hd: { count: 6 }, move: { ground: 12 }, alignment: "neutral", size: 3,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Heads", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("", 0, "", 0, 0) },
    morale: { rating: 0 }, reference: { numberAppearing: "one", inLairPct: 25, treasureType: "B" },
    abilities: [
      ability("attack", "Many heads", "5–12 heads (6 shown); each head is one hit die of 6 hit points and attacks at once; it fights as a fighter of level equal to its starting heads.", "heads")
    ],
    description: "A multi-headed dinosaur. Each 6 hit points scored kills a head."
  }),

  monster({
    key: "chimera", name: "Chimera", folder: "fantastic-creatures", ac: 4,
    hd: { count: 9 }, move: { ground: 12, fly: 18 }, alignment: "chaos", size: 2,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Three heads", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("", 0, "", 0, 0) },
    morale: { rating: 0 }, reference: { numberAppearing: "1d4", inLairPct: 50, treasureType: "F" },
    abilities: [
      ability("attack", "Fire breath", "The dragon head breathes fire: 5\" range, 3 dice.", "breath", 3)
    ],
    description: "Lion forebody, goat hindquarters, dragon wings; goat, lion and dragon heads."
  }),

  monster({
    key: "wyvern", name: "Wyvern", folder: "fantastic-creatures", ac: 3,
    hd: { count: 7 }, move: { ground: 9, fly: 24 }, alignment: "chaos", size: 2,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Sting or bite", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("HH", 4, "HH", 4, 0) },
    morale: { never: true }, reference: { numberAppearing: "1d6", inLairPct: 60, treasureType: "E" },
    abilities: [
      ability("attack", "Poison sting", "Stings two-thirds of the time (bites on 5–6); poison, save or die.", "poison")
    ],
    description: "A smaller, two-legged dragon kin. Chainmail treats wyverns as dragons."
  }),

  monster({
    key: "dragon-white", name: "White Dragon", folder: "fantastic-creatures", ac: 2,
    hd: { count: 6 }, move: { ground: 9, fly: 24 }, alignment: "chaos", size: 3,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Bite", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("HH", 4, "HH", 4, 0) },
    morale: { never: true }, reference: { numberAppearing: "1d4", inLairPct: 60, treasureType: "H" },
    abilities: [
      ability("attack", "Breath weapon", "Breathes cold, 8\" × 3\" cone, three times a day; on 2d6 it breathes on 7+, bites on 6 or less. Breath does damage equal to the dragon's hit points (save for half; Book II p.12 example).", "breath"),
      ability("other", "Talking / sleeping", "Chance to talk / be asleep: 25%/60%. Sleeping dragons give a free melee round at +2."),
      ability("special", "Dread", "Enemy troops within 15\" check morale as if they had taken excess casualties (Chainmail; Kurt, Oct 2026).", "fear", 15),
      ability("other", "Subdual", "May be subdued and sold for 500–1,000 gp per hit point.")
    ],
    description: "Hit dice shown are the middle of the range; age (1d6) sets hit points per die from 1 to 6."
  }),

  monster({
    key: "dragon-black", name: "Black Dragon", folder: "fantastic-creatures", ac: 2,
    hd: { count: 7 }, move: { ground: 9, fly: 24 }, alignment: "chaos", size: 3,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Bite", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("HH", 4, "HH", 4, 0) },
    morale: { never: true }, reference: { numberAppearing: "1d4", inLairPct: 60, treasureType: "H" },
    abilities: [
      ability("attack", "Breath weapon", "Breathes acid, 6\" × ½\" line, three times a day; on 2d6 it breathes on 7+, bites on 6 or less. Breath does damage equal to the dragon's hit points (save for half; Book II p.12 example).", "breath"),
      ability("other", "Talking / sleeping", "Chance to talk / be asleep: 40%/50%. Sleeping dragons give a free melee round at +2."),
      ability("special", "Dread", "Enemy troops within 15\" check morale as if they had taken excess casualties (Chainmail; Kurt, Oct 2026).", "fear", 15),
      ability("other", "Subdual", "May be subdued and sold for 500–1,000 gp per hit point.")
    ],
    description: "Hit dice shown are the middle of the range; age (1d6) sets hit points per die from 1 to 6."
  }),

  monster({
    key: "dragon-green", name: "Green Dragon", folder: "fantastic-creatures", ac: 2,
    hd: { count: 8 }, move: { ground: 9, fly: 24 }, alignment: "chaos", size: 3,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Bite", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("HH", 4, "HH", 4, 0) },
    morale: { never: true }, reference: { numberAppearing: "1d4", inLairPct: 60, treasureType: "H" },
    abilities: [
      ability("attack", "Breath weapon", "Breathes chlorine gas, 5\" × 4\" cloud, three times a day; on 2d6 it breathes on 7+, bites on 6 or less. Breath does damage equal to the dragon's hit points (save for half; Book II p.12 example).", "breath"),
      ability("other", "Talking / sleeping", "Chance to talk / be asleep: 55%/40%. Sleeping dragons give a free melee round at +2."),
      ability("special", "Dread", "Enemy troops within 15\" check morale as if they had taken excess casualties (Chainmail; Kurt, Oct 2026).", "fear", 15),
      ability("other", "Subdual", "May be subdued and sold for 500–1,000 gp per hit point.")
    ],
    description: "Hit dice shown are the middle of the range; age (1d6) sets hit points per die from 1 to 6."
  }),

  monster({
    key: "dragon-blue", name: "Blue Dragon", folder: "fantastic-creatures", ac: 2,
    hd: { count: 9 }, move: { ground: 9, fly: 24 }, alignment: "chaos", size: 3,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Bite", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("HH", 4, "HH", 4, 0) },
    morale: { never: true }, reference: { numberAppearing: "1d4", inLairPct: 60, treasureType: "H" },
    abilities: [
      ability("attack", "Breath weapon", "Breathes lightning, 10\" × ½\" line, three times a day; on 2d6 it breathes on 7+, bites on 6 or less. Breath does damage equal to the dragon's hit points (save for half; Book II p.12 example).", "breath"),
      ability("other", "Talking / sleeping", "Chance to talk / be asleep: 70%/30%. Sleeping dragons give a free melee round at +2."),
      ability("special", "Dread", "Enemy troops within 15\" check morale as if they had taken excess casualties (Chainmail; Kurt, Oct 2026).", "fear", 15),
      ability("other", "Subdual", "May be subdued and sold for 500–1,000 gp per hit point.")
    ],
    description: "Hit dice shown are the middle of the range; age (1d6) sets hit points per die from 1 to 6."
  }),

  monster({
    key: "dragon-red", name: "Red Dragon", folder: "fantastic-creatures", ac: 2,
    hd: { count: 10 }, move: { ground: 9, fly: 24 }, alignment: "chaos", size: 3,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Bite", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("HH", 4, "HH", 4, 0) },
    morale: { never: true }, reference: { numberAppearing: "1d4", inLairPct: 60, treasureType: "H" },
    abilities: [
      ability("attack", "Breath weapon", "Breathes fire, 9\" × 3\" cone, three times a day; on 2d6 it breathes on 7+, bites on 6 or less. Breath does damage equal to the dragon's hit points (save for half; Book II p.12 example).", "breath"),
      ability("other", "Talking / sleeping", "Chance to talk / be asleep: 85%/20%. Sleeping dragons give a free melee round at +2."),
      ability("special", "Dread", "Enemy troops within 15\" check morale as if they had taken excess casualties (Chainmail; Kurt, Oct 2026).", "fear", 15),
      ability("other", "Subdual", "May be subdued and sold for 500–1,000 gp per hit point.")
    ],
    description: "Hit dice shown are the middle of the range; age (1d6) sets hit points per die from 1 to 6."
  }),

  monster({
    key: "dragon-golden", name: "Golden Dragon", folder: "fantastic-creatures", ac: 2,
    hd: { count: 11 }, move: { ground: 9, fly: 24 }, alignment: "law", size: 3,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Bite", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("HH", 4, "HH", 4, 0) },
    morale: { never: true }, reference: { numberAppearing: "1d4", inLairPct: 60, treasureType: "H" },
    abilities: [
      ability("attack", "Breath weapon", "Breathes fire or gas, three times a day; on 2d6 it breathes on 7+, bites on 6 or less. Breath does damage equal to the dragon's hit points (save for half; Book II p.12 example).", "breath"),
      ability("other", "Talking / sleeping", "Chance to talk / be asleep: 100%/10%. Sleeping dragons give a free melee round at +2."),
      ability("special", "Dread", "Enemy troops within 15\" check morale as if they had taken excess casualties (Chainmail; Kurt, Oct 2026).", "fear", 15),
      ability("other", "Subdual", "May be subdued and sold for 500–1,000 gp per hit point.")
    ],
    description: "Hit dice shown are the middle of the range; age (1d6) sets hit points per die from 1 to 6."
  }),

  monster({
    key: "purple-worm", name: "Purple Worm", folder: "fantastic-creatures", ac: 6,
    hd: { count: 15 }, move: { ground: 6 }, alignment: "neutral", size: 4,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Bite or sting", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("", 0, "", 0, 0) },
    morale: { never: true }, reference: { numberAppearing: "1d4", inLairPct: 25, treasureType: "D" },
    abilities: [
      ability("attack", "Swallow", "A hit that beats the number needed by 20% or more (or a natural 100%) swallows a victim up to ogre size; dead in 6 turns, gone in 12.", "swallow"),
      ability("attack", "Poison sting", "Tail sting is poisonous.", "poison")
    ],
    description: "Huge burrowing worm up to 50' long. Always attacks."
  }),

  monster({
    key: "centaur", name: "Centaur", folder: "fantastic-creatures", ac: 5,
    hd: { count: 4 }, move: { ground: 18 }, alignment: "neutral", size: 2,
    attack: { method: MonsterAttackMethod.WEAPON, description: "Club, lance or bow", weaponClass: 6, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("MH", 1, "MH", 1, 0) },
    morale: { rating: 0 }, reference: { numberAppearing: "2d10", inLairPct: 5, treasureType: "A" },
    abilities: [
      ability("attack", "Two attacks", "Attacks once as a man and once as a medium horse.")
    ],
    description: "Half carry clubs (as morning stars), a quarter lances, the rest composite bows."
  }),

  monster({
    key: "unicorn", name: "Unicorn", folder: "fantastic-creatures", ac: 2,
    hd: { count: 4 }, move: { ground: 24 }, alignment: "law", size: 2,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Horn and hooves", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("HH", 1, "HH", 1, 0) },
    morale: { rating: 0 }, reference: { numberAppearing: "1d4", inLairPct: 0 },
    abilities: [
      ability("attack", "Charge", "Fights as a lance on its first charge, then as spear and heavy horse."),
      ability("defense", "Magic resistance", "Resists magic as an 11th-level Magic-User."),
      ability("other", "Teleport", "Dimension Door up to 36\" once a day, with rider.")
    ],
    description: "Only a pure maiden may approach or ride one."
  }),

  monster({
    key: "treant", name: "Treant", folder: "fantastic-creatures", ac: 2,
    hd: { count: 8 }, move: { ground: 6 }, alignment: "law", size: 2,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Branches", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("AF", 6, "AF", 6, 0) },
    morale: { rating: 20 }, reference: { numberAppearing: "2d10", inLairPct: 0 },
    abilities: [
      ability("other", "Animate trees", "Within 6\" of a tree, can move up to two trees 3\" a turn, which fight as treants.")
    ],
    description: "Tree folk of the forests (Chainmail's Ents)."
  }),

  monster({
    key: "pegasus", name: "Pegasus", folder: "fantastic-creatures", ac: 6,
    hd: { count: 2, bonus: 2 }, move: { ground: 24, fly: 48 }, alignment: "law", size: 2,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Hooves", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("HH", 1, "HH", 1, 0) },
    morale: { rating: 0 }, reference: { numberAppearing: "1d12", inLairPct: 0 },
    abilities: [
      ability("other", "Steed", "Serves only Lawful characters; fights as a heavy horse.")
    ],
    description: "Winged horses, wild and shy."
  }),

  monster({
    key: "hippogriff", name: "Hippogriff", folder: "fantastic-creatures", ac: 5,
    hd: { count: 3, bonus: 1 }, move: { ground: 18, fly: 36 }, alignment: "law", size: 2,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Hooves and beak", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("HH", 1, "HH", 1, 0) },
    morale: { rating: 0 }, reference: { numberAppearing: "2d8", inLairPct: 0 },
    abilities: [
      ability("other", "Rival of pegasi", "Will normally fight pegasi.")
    ],
    description: "Fierce flying steeds."
  }),

  monster({
    key: "roc", name: "Roc", folder: "fantastic-creatures", ac: 4,
    hd: { count: 6 }, move: { ground: 6, fly: 48 }, alignment: "law", size: 3,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Talons and beak", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("LH", 4, "HH", 4, 0) },
    morale: { never: true }, reference: { numberAppearing: "1d20", inLairPct: 20, treasureType: "I" },
    abilities: [
      ability("special", "Dread", "Enemy NPC units within its full move (48\") check morale as for excess casualties (Chainmail treats rocs as Heroes; Kurt, Oct 2026).", "fear", 48),
      ability("other", "Nest", "In the nest, 50% chance of 1–6 young, which can be tamed as steeds; adults are then always hostile.")
    ],
    description: "Giant birds; the largest double or treble these figures."
  }),

  monster({
    key: "griffon", name: "Griffon", folder: "fantastic-creatures", ac: 3,
    hd: { count: 7 }, move: { ground: 12, fly: 30 }, alignment: "neutral", size: 2,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Talons and beak", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("LH", 4, "HH", 4, 0) },
    morale: { never: true }, reference: { numberAppearing: "2d8", inLairPct: 10, treasureType: "E" },
    abilities: [
      ability("other", "Horse-eater", "Cannot be brought within 36\" of horses.")
    ],
    description: "Prized steeds once tamed; attack with little provocation in the wild. Chainmail treats them as rocs."
  }),

  monster({
    key: "invisible-stalker", name: "Invisible Stalker", folder: "fantastic-creatures", ac: 3,
    hd: { count: 8 }, move: { ground: 12 }, alignment: "neutral", size: 1,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Strike", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("", 0, "", 0, 0) },
    morale: { never: true }, reference: { numberAppearing: "conjured", inLairPct: 0 },
    abilities: [
      ability("defense", "Invisible", "Invisible.", "invisible"),
      ability("other", "Tracker", "Follows its mission until destroyed or dispelled.")
    ],
    description: "Conjured by a 6th-level spell."
  }),

  monster({
    key: "elemental-air", name: "Air Elemental", folder: "fantastic-creatures", ac: 2,
    hd: { count: 16 }, move: { ground: 0, fly: 36 }, alignment: "neutral", size: 3,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Elemental force", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("LH", 4, "LH", 4, 0) },
    morale: { never: true }, reference: { numberAppearing: "1", inLairPct: 0 },
    hitOnlyBy: HitOnlyBy.MAGIC,
    abilities: [
      ability("attack", "Elemental power", "Flies only; +1 damage in air; can become a whirlwind sweeping away creatures under 2 hit dice."),
      ability("defense", "Magic only", "Only magical weapons or attacks affect it.", "immunity"),
      ability("other", "Control", "Turns on its summoner if his concentration breaks; control is never regained.")
    ],
    description: "16 HD when conjured (12 from a device, 8 from a staff). One of each type per day."
  }),

  monster({
    key: "elemental-earth", name: "Earth Elemental", folder: "fantastic-creatures", ac: 2,
    hd: { count: 16 }, move: { ground: 6 }, alignment: "neutral", size: 3,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Elemental force", weaponClass: 4, damage: { dice: 3, bonus: 0 }, chainmail: chainmail("HH", 4, "HH", 4, 0) },
    morale: { never: true }, reference: { numberAppearing: "1", inLairPct: 0 },
    hitOnlyBy: HitOnlyBy.MAGIC,
    abilities: [
      ability("attack", "Elemental power", "3 dice against anything on the ground (2 dice otherwise); batters walls; cannot cross water."),
      ability("defense", "Magic only", "Only magical weapons or attacks affect it.", "immunity"),
      ability("other", "Control", "Turns on its summoner if his concentration breaks; control is never regained.")
    ],
    description: "16 HD when conjured (12 from a device, 8 from a staff). One of each type per day."
  }),

  monster({
    key: "elemental-fire", name: "Fire Elemental", folder: "fantastic-creatures", ac: 2,
    hd: { count: 16 }, move: { ground: 12 }, alignment: "neutral", size: 3,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Elemental force", weaponClass: 4, damage: { dice: 2, bonus: 0 }, chainmail: chainmail("MH", 4, "MH", 4, 0) },
    morale: { never: true }, reference: { numberAppearing: "1", inLairPct: 0 },
    hitOnlyBy: HitOnlyBy.MAGIC,
    abilities: [
      ability("attack", "Elemental power", "2 dice against non-fire-users; sets inflammables alight; cannot cross water."),
      ability("defense", "Magic only", "Only magical weapons or attacks affect it.", "immunity"),
      ability("other", "Control", "Turns on its summoner if his concentration breaks; control is never regained.")
    ],
    description: "16 HD when conjured (12 from a device, 8 from a staff). One of each type per day."
  }),

  monster({
    key: "elemental-water", name: "Water Elemental", folder: "fantastic-creatures", ac: 2,
    hd: { count: 16 }, move: { ground: 6 }, alignment: "neutral", size: 3,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Elemental force", weaponClass: 4, damage: { dice: 2, bonus: 0 }, chainmail: chainmail("HH", 4, "HH", 4, 0) },
    morale: { never: true }, reference: { numberAppearing: "1", inLairPct: 0 },
    hitOnlyBy: HitOnlyBy.MAGIC,
    abilities: [
      ability("attack", "Elemental power", "18\" in water, 6\" out; 2 dice in water, 1 die out of it; stays within 6\" of water."),
      ability("defense", "Magic only", "Only magical weapons or attacks affect it.", "immunity"),
      ability("other", "Control", "Turns on its summoner if his concentration breaks; control is never regained.")
    ],
    description: "16 HD when conjured (12 from a device, 8 from a staff). One of each type per day."
  }),

  monster({
    key: "djinn", name: "Djinn", folder: "fantastic-creatures", ac: 5,
    hd: { count: 7, bonus: 1 }, move: { ground: 9, fly: 24 }, alignment: "neutral", size: 2,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Fists", weaponClass: 4, damage: { dice: 2, bonus: -1 }, chainmail: chainmail("", 0, "", 0, 0) },
    morale: { rating: 0 }, reference: { numberAppearing: "summoned", inLairPct: 0 },
    abilities: [
      ability("other", "Powers", "Creates food, drink, soft goods and illusions; whirlwind; invisible or gaseous at will.")
    ],
    description: "Aerial spirits; fight as giants at −1 damage."
  }),

  monster({
    key: "efreet", name: "Efreet", folder: "fantastic-creatures", ac: 3,
    hd: { count: 10 }, move: { ground: 9, fly: 24 }, alignment: "chaos", size: 2,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Fists", weaponClass: 4, damage: { dice: 2, bonus: 0 }, chainmail: chainmail("", 0, "", 0, 0) },
    morale: { rating: 0 }, reference: { numberAppearing: "summoned", inLairPct: 0 },
    abilities: [
      ability("other", "Powers", "Wall of Fire; incendiary; otherwise as djinn. Serves 1,001 days.")
    ],
    description: "Fire spirits of the City of Brass, enemies of the djinn."
  }),

  monster({
    key: "giant-hill", name: "Hill Giant", folder: "humanoids", ac: 4,
    hd: { count: 8 }, move: { ground: 12 }, alignment: "chaos", size: 3,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Huge weapon", weaponClass: 4, damage: { dice: 2, bonus: 0 }, chainmail: chainmail("HF", 12, "AF", 12, 1) },
    morale: { never: true }, reference: { numberAppearing: "1d8", inLairPct: 30, treasureType: "E" },
    abilities: [
      ability("attack", "Boulders", "Throws rocks as a light catapult, 20\" range."),
      ability("other", "Wandering treasure", "Carries 1,000–6,000 gp when away from its lair.")
    ],
    description: "Most common (60%). Lair also holds 5,000 gp plus Type E."
  }),

  monster({
    key: "giant-stone", name: "Stone Giant", folder: "humanoids", ac: 4,
    hd: { count: 9 }, move: { ground: 12 }, alignment: "chaos", size: 3,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Huge weapon", weaponClass: 4, damage: { dice: 2, bonus: 0 }, chainmail: chainmail("HF", 12, "AF", 12, 1) },
    morale: { never: true }, reference: { numberAppearing: "1d8", inLairPct: 30, treasureType: "E" },
    abilities: [
      ability("attack", "Boulders", "Throws rocks as a light catapult, 20\" range."),
      ability("other", "Wandering treasure", "Carries 1,000–6,000 gp when away from its lair.")
    ],
    description: "Throws boulders as a heavy catapult. Lair also holds 5,000 gp plus Type E."
  }),

  monster({
    key: "giant-frost", name: "Frost Giant", folder: "humanoids", ac: 4,
    hd: { count: 10, bonus: 1 }, move: { ground: 12 }, alignment: "chaos", size: 3,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Huge weapon", weaponClass: 4, damage: { dice: 2, bonus: 1 }, chainmail: chainmail("HF", 12, "AF", 12, 1) },
    morale: { never: true }, reference: { numberAppearing: "1d8", inLairPct: 30, treasureType: "E" },
    abilities: [
      ability("attack", "Boulders", "Throws rocks as a light catapult, 20\" range."),
      ability("other", "Wandering treasure", "Carries 1,000–6,000 gp when away from its lair.")
    ],
    description: "Immune to cold. Lair also holds 5,000 gp plus Type E."
  }),

  monster({
    key: "giant-fire", name: "Fire Giant", folder: "humanoids", ac: 4,
    hd: { count: 11, bonus: 3 }, move: { ground: 12 }, alignment: "chaos", size: 3,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Huge weapon", weaponClass: 4, damage: { dice: 2, bonus: 2 }, chainmail: chainmail("HF", 12, "AF", 12, 1) },
    morale: { never: true }, reference: { numberAppearing: "1d8", inLairPct: 30, treasureType: "E" },
    abilities: [
      ability("attack", "Boulders", "Throws rocks as a light catapult, 20\" range."),
      ability("other", "Wandering treasure", "Carries 1,000–6,000 gp when away from its lair.")
    ],
    description: "Immune to fire. Lair also holds 5,000 gp plus Type E."
  }),

  monster({
    key: "giant-cloud", name: "Cloud Giant", folder: "humanoids", ac: 4,
    hd: { count: 12, bonus: 2 }, move: { ground: 12 }, alignment: "chaos", size: 3,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Huge weapon", weaponClass: 4, damage: { dice: 3, bonus: 0 }, chainmail: chainmail("HF", 12, "AF", 12, 1) },
    morale: { never: true }, reference: { numberAppearing: "1d8", inLairPct: 30, treasureType: "E" },
    abilities: [
      ability("attack", "Boulders", "Throws rocks as a light catapult, 20\" range."),
      ability("other", "Wandering treasure", "Carries 1,000–6,000 gp when away from its lair.")
    ],
    description: "Keen sense of smell. Lair also holds 5,000 gp plus Type E."
  }),

  monster({
    key: "werewolf", name: "Werewolf", folder: "fantastic-creatures", ac: 5,
    hd: { count: 4 }, move: { ground: 15 }, alignment: "chaos", size: 1,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Claws and bite", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("AF", 4, "HF", 4, 0) },
    morale: { rating: 20 }, reference: { numberAppearing: "2d10", inLairPct: 15, treasureType: "C" },
    hitOnlyBy: HitOnlyBy.SILVER,
    abilities: [
      ability("defense", "Silver or magic", "Only silver or magic weapons affect it.", "immunity"),
      ability("attack", "Lycanthropy", "Anyone badly wounded (about half their hit points) becomes one in 2–24 days unless given Cure Disease.")
    ],
    description: "Packs of 2–4 or family packs of 5–8."
  }),

  monster({
    key: "wereboar", name: "Wereboar", folder: "fantastic-creatures", ac: 4,
    hd: { count: 4, bonus: 1 }, move: { ground: 12 }, alignment: "neutral", size: 1,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Claws and bite", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("AF", 4, "HF", 4, 0) },
    morale: { rating: 20 }, reference: { numberAppearing: "2d10", inLairPct: 15, treasureType: "C" },
    hitOnlyBy: HitOnlyBy.SILVER,
    abilities: [
      ability("defense", "Silver or magic", "Only silver or magic weapons affect it.", "immunity"),
      ability("attack", "Lycanthropy", "Anyone badly wounded (about half their hit points) becomes one in 2–24 days unless given Cure Disease.")
    ],
    description: "Packs of 2–4 or family packs of 5–8."
  }),

  monster({
    key: "weretiger", name: "Weretiger", folder: "fantastic-creatures", ac: 3,
    hd: { count: 5 }, move: { ground: 12 }, alignment: "neutral", size: 1,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Claws and bite", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("AF", 4, "HF", 4, 0) },
    morale: { rating: 20 }, reference: { numberAppearing: "2d10", inLairPct: 15, treasureType: "C" },
    hitOnlyBy: HitOnlyBy.SILVER,
    abilities: [
      ability("defense", "Silver or magic", "Only silver or magic weapons affect it.", "immunity"),
      ability("attack", "Lycanthropy", "Anyone badly wounded (about half their hit points) becomes one in 2–24 days unless given Cure Disease.")
    ],
    description: "Packs of 2–4 or family packs of 5–8."
  }),

  monster({
    key: "werebear", name: "Werebear", folder: "fantastic-creatures", ac: 2,
    hd: { count: 6 }, move: { ground: 9 }, alignment: "law", size: 1,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Claws and bite", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("AF", 4, "HF", 4, 0) },
    morale: { rating: 20 }, reference: { numberAppearing: "2d10", inLairPct: 15, treasureType: "C" },
    hitOnlyBy: HitOnlyBy.SILVER,
    abilities: [
      ability("defense", "Silver or magic", "Only silver or magic weapons affect it.", "immunity"),
      ability("attack", "Lycanthropy", "Anyone badly wounded (about half their hit points) becomes one in 2–24 days unless given Cure Disease.")
    ],
    description: "Packs of 2–4 or family packs of 5–8."
  }),

  monster({
    key: "green-slime", name: "Green Slime", folder: "clean-up-crew", ac: 9,
    hd: { count: 2 }, move: { ground: 0 }, alignment: "neutral", size: 1,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Engulf", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("", 0, "", 0, 0) },
    morale: { never: true }, reference: { numberAppearing: "—", inLairPct: 0 },
    abilities: [
      ability("attack", "Turns flesh to slime", "Sticks to flesh and converts it in one turn; must be cut away or cured.", "slime"),
      ability("defense", "Immunities", "Unharmed by weapons or lightning; killed by fire, cold or Cure Disease.", "immunity")
    ],
    description: "A non-mobile hazard that eats wood and metal."
  }),

  monster({
    key: "gray-ooze", name: "Gray Ooze", folder: "clean-up-crew", ac: 8,
    hd: { count: 3 }, move: { ground: 1 }, alignment: "neutral", size: 1,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Corrosive contact", weaponClass: 4, damage: { dice: 2, bonus: 0 }, chainmail: chainmail("", 0, "", 0, 0) },
    morale: { never: true }, reference: { numberAppearing: "—", inLairPct: 0 },
    abilities: [
      ability("defense", "Fire and cold immunity", "Hurt only by lightning and weapon blows.", "immunity"),
      ability("attack", "Corrodes metal", "Corrodes metal like a black pudding.")
    ],
    description: "Looks like wet stone."
  }),

  monster({
    key: "yellow-mold", name: "Yellow Mold", folder: "clean-up-crew", ac: 9,
    hd: { count: 1 }, move: { ground: 0 }, alignment: "neutral", size: 1,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Contact", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("", 0, "", 0, 0) },
    morale: { never: true }, reference: { numberAppearing: "—", inLairPct: 0 },
    abilities: [
      ability("attack", "Spores", "Rough contact: 50% chance of a 1\" spore cloud; save vs poison or die.", "poison"),
      ability("defense", "Fire only", "Destroyed only by fire.", "immunity")
    ],
    description: "A deadly underground fungus. Book II gives no hit dice; 1 shown as a placeholder."
  }),

  monster({
    key: "horse-light", name: "Light Horse", folder: "fantastic-creatures", ac: 7,
    hd: { count: 2 }, move: { ground: 24 }, alignment: "neutral", size: 2,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Hooves", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("LH", 1, "LH", 1, 0) },
    morale: { rating: 0 }, reference: { numberAppearing: "—", inLairPct: 0 },
    abilities: [],
    description: "War horses melee as in Chainmail."
  }),

  monster({
    key: "horse-medium", name: "Medium Horse", folder: "fantastic-creatures", ac: 7,
    hd: { count: 2, bonus: 1 }, move: { ground: 18 }, alignment: "neutral", size: 2,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Hooves", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("MH", 1, "MH", 1, 0) },
    morale: { rating: 0 }, reference: { numberAppearing: "—", inLairPct: 0 },
    abilities: [],
    description: "War horses melee as in Chainmail."
  }),

  monster({
    key: "horse-heavy", name: "Heavy Horse", folder: "fantastic-creatures", ac: 7,
    hd: { count: 3 }, move: { ground: 12 }, alignment: "neutral", size: 2,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Hooves", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("HH", 1, "HH", 1, 0) },
    morale: { rating: 0 }, reference: { numberAppearing: "—", inLairPct: 0 },
    abilities: [],
    description: "War horses melee as in Chainmail."
  }),

  monster({
    key: "horse-draft", name: "Draft Horse", folder: "fantastic-creatures", ac: 7,
    hd: { count: 2, bonus: 1 }, move: { ground: 12 }, alignment: "neutral", size: 2,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Hooves", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("", 0, "", 0, 0) },
    morale: { rating: 0 }, reference: { numberAppearing: "—", inLairPct: 0 },
    abilities: [],
    description: "War horses melee as in Chainmail."
  }),

  monster({
    key: "mule", name: "Mule", folder: "fantastic-creatures", ac: 7,
    hd: { count: 2, bonus: 1 }, move: { ground: 12 }, alignment: "neutral", size: 2,
    attack: { method: MonsterAttackMethod.PROFILE, description: "Hooves", weaponClass: 4, damage: { dice: 1, bonus: 0 }, chainmail: chainmail("", 0, "", 0, 0) },
    morale: { rating: 0 }, reference: { numberAppearing: "—", inLairPct: 0 },
    abilities: [],
    description: "War horses melee as in Chainmail."
  })
]);

/** Convert a source record to a complete Foundry Actor source object. */
export function toMonsterActorData(entry) {
  const max = deriveMaxHpAverage({ dice: entry.hd.count, bonus: entry.hd.bonus, faces: entry.hd.dieSize });
  return {
    name: entry.name,
    type: "monster",
    img: entry.img,
    system: {
      ac: { value: entry.ac },
      hd: { ...entry.hd },
      move: { ...entry.move },
      hp: { value: max, max },
      attack: {
        method: entry.attack.method,
        description: entry.attack.description,
        weaponClass: entry.attack.weaponClass,
        damage: { ...entry.attack.damage },
        diceOverride: entry.attack.diceOverride,
        chainmail: { ...entry.attack.chainmail }
      },
      alignment: entry.alignment,
      mind: { ...entry.mind },
      chainmailType: entry.chainmailType,
      side: "",
      specialAbilities: {
        hitOnlyBy: entry.specialAbilities.hitOnlyBy,
        entries: entry.specialAbilities.entries.map((abilityEntry) => ({ ...abilityEntry })),
        description: entry.specialAbilities.description
      },
      morale: { ...entry.morale },
      reference: { ...entry.reference },
      stance: { held: 0, spent: 0, mode: "split" }
    }
  };
}

/* Self-tests — Node only. */
function runSelfTests() {
  let pass = 0;
  const ok = (condition, label) => {
    if (!condition) throw new Error(`monsters.mjs FAIL: ${label}`);
    pass++;
  };

  ok(MONSTERS.length === 76, "seventy-six Book II monsters");
  ok(MONSTERS.every((m) => Number.isInteger(m.size) && m.size >= 1 && m.size <= 4), "every monster has a grid size");
  ok(MONSTERS.find((m) => m.key === "ogre")?.size === 2 && MONSTERS.find((m) => m.key === "giant-hill")?.size === 3, "ogre 2x2, giant 3x3");
  ok(MONSTERS.find((m) => m.key === "spectre")?.specialAbilities.entries.some((a) => a.tag === "drain" && a.value === 2), "spectre drains two levels");
  ok(MONSTERS.find((m) => m.key === "werewolf")?.specialAbilities.hitOnlyBy === HitOnlyBy.SILVER, "werewolf silver gate");
  ok(MONSTERS.find((m) => m.key === "mummy")?.specialAbilities.hitOnlyBy === HitOnlyBy.MAGIC, "mummy magic gate");
  ok(MONSTERS.find((m) => m.key === "giant-fire")?.attack.damage.dice === 2 && MONSTERS.find((m) => m.key === "giant-fire")?.attack.damage.bonus === 2, "fire giant 2d6+2");
  ok(MONSTERS.find((m) => m.key === "dwarf")?.attack.chainmail.defendsAs === "LF", "dwarf defends as light foot (Fantasy Reference Table)");
  ok(MONSTERS.find((m) => m.key === "dragon-red")?.morale.never === true, "dragons never check morale");
  ok(new Set(MONSTERS.map((m) => m.key)).size === MONSTERS.length, "monster keys are unique");
  ok(new Set(MONSTER_FOLDERS.map((f) => f.key)).size === MONSTER_FOLDERS.length, "folder keys are unique");
  ok(MONSTERS.every((m) => MONSTER_FOLDERS.some((f) => f.key === m.folder)), "every monster uses a declared folder");
  ok(MONSTERS.find((m) => m.key === "kobold")?.hd.dieSize === 3, "kobold uses d3 hit points");
  ok(MONSTERS.find((m) => m.key === "skeleton")?.hd.dieSize === 3, "skeleton uses d3 hit points");
  ok(MONSTERS.find((m) => m.key === "troll")?.specialAbilities.entries.some((a) => a.tag === "regeneration" && a.value === 3), "troll regeneration tagged");
  ok(MONSTERS.find((m) => m.key === "wight")?.specialAbilities.hitOnlyBy === HitOnlyBy.SILVER, "wight silver gate");
  ok(MONSTERS.find((m) => m.key === "gargoyle")?.specialAbilities.hitOnlyBy === HitOnlyBy.MAGIC, "gargoyle magic gate");
  ok(toMonsterActorData(MONSTERS.find((m) => m.key === "black-pudding")).system.attack.damage.dice === 3, "black pudding damage retained");
  ok(MONSTERS.every((m) => Object.hasOwn(MINDS, m.key)), "every monster has a mind entry");
  const mb = (k, o) => moraleDiceBonus(MONSTERS.find((m) => m.key === k), o);
  ok(mb("hobgoblin") === 1 && mb("gnoll") === 2 && mb("brigand") === 1 && mb("caveman") === -1 && mb("orc") === 0, "morale bonus from monster data");
  ok(mb("orc", { daylight: true }) === -1 && mb("goblin", { daylight: true }) === -1 && mb("gnoll", { daylight: true }) === 2, "daylight from the light vulnerability");
  ok(MONSTERS.filter((m) => fearRadius(m) === 15).length === 6 && fearRadius(MONSTERS.find((m) => m.key === "wyvern")) === 0, "dragons cause fear at 15\"");
  ok(fearRadius(MONSTERS.find((m) => m.key === "wraith")) === 24 && fearRadius(MONSTERS.find((m) => m.key === "roc")) === 48, "wraiths and rocs cause fear within their move");
  ok(mb("skeleton") === null && mb("berserker") === null, "never-check monsters: no check");
  ok(Object.keys(MINDS).length === MONSTERS.length, "no stray mind entries");
  ok(MONSTERS.every((m) => ["mindless", "bestial", "cunning", "intelligent"].includes(m.mind.intelligence) && m.mind.behavior === m.mind.intelligence), "tier and behaviour profile set");
  ok(MONSTERS.every((m) => ["law", "chaos", "neutral"].includes(m.alignment)), "alignment set");
  const mindFor = (k) => MONSTERS.find((m) => m.key === k).mind;
  ok(mindFor("skeleton").intelligence === "mindless" && mindFor("skeleton").language === null, "skeleton mindless, mute");
  ok(mindFor("orc").intelligence === "cunning" && mindFor("orc").language === "orc" && mindFor("orc").common === "roll", "orc cunning, orcish, 20% common");
  ok(mindFor("bandit").common === "always", "bandits speak common");
  ok(mindFor("dragon-white").talks === 25 && mindFor("dragon-red").talks === 85 && mindFor("dragon-golden").talks === 100, "dragon talk chance (Book II)");
  ok(mindFor("dragon-white").sleeps === 60 && mindFor("dragon-blue").sleeps === 30 && mindFor("dragon-golden").sleeps === 10, "dragon sleep chance (Book II)");
  ok(mindFor("elemental-fire").intelligence === "cunning" && mindFor("unicorn").intelligence === "intelligent" && mindFor("unicorn").language === "unicorn", "elementals low, unicorns average with own tongue");
  ok(MONSTERS.every((m) => !String(m.mind.language).startsWith("tongue-")), "no monster speaks an alignment tongue");
  ok(mindFor("basilisk").intelligence !== "intelligent" && mindFor("medusa").intelligence === "intelligent", "basilisk not intelligent, medusa intelligent");
  ok(toMonsterActorData(MONSTERS.find((m) => m.key === "orc")).system.mind.language === "orc", "mind carried to actor data");

  console.log(`monsters.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

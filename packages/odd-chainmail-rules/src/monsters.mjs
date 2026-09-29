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
  description = ""
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
    chainmailType,
    attack: Object.freeze({
      method: attack.method,
      description: attack.description ?? "",
      weaponClass: attack.weaponClass ?? 4,
      damage: Object.freeze({ dice: attack.damage?.dice ?? 1, bonus: attack.damage?.bonus ?? 0 }),
      diceOverride: attack.diceOverride ?? 0,
      chainmail: Object.freeze(attack.chainmail ?? chainmail())
    }),
    morale: Object.freeze({ rating: morale.rating ?? 0, never: morale.never ?? false }),
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
    morale: { rating: 6 }, reference: { numberAppearing: "2d10 × 10", inLairPct: 30, treasureType: "D" },
    abilities: [ability("other", "Fearless goblin", "Hobgoblins have 1 point better morale than goblins.")],
    description: "Large, disciplined goblins. A hobgoblin king fights as an ogre and is attended by 1d3+1 guards that do the same."
  }),

  monster({
    key: "gnoll", name: "Gnoll", folder: "humanoids", ac: 5,
    hd: { count: 2 }, move: { ground: 9 },
    chainmailType: "gnoll",
    attack: { method: MonsterAttackMethod.WEAPON, description: "Weapon", weaponClass: 4, chainmail: chainmail("AF", 1, "HF", 1) },
    morale: { rating: 7 }, reference: { numberAppearing: "2d10 × 10", inLairPct: 30, treasureType: "D" },
    abilities: [ability("other", "High morale", "Gnolls have 2 points better morale than ordinary goblins.")],
    description: "Gnolls otherwise resemble hobgoblins. Their king and 1d4 bodyguards fight as trolls but do not regenerate."
  }),

  monster({
    key: "ogre", name: "Ogre", folder: "humanoids", ac: 5,
    hd: { count: 4, bonus: 1 }, move: { ground: 9, charge: 12 },
    chainmailType: "ogre",
    attack: { method: MonsterAttackMethod.PROFILE, description: "Huge weapon", damage: { dice: 1, bonus: 2 }, chainmail: chainmail("HF", 6, "HF", 6) },
    morale: { rating: 8 }, reference: { numberAppearing: "3d6", inLairPct: 30, treasureType: "C" },
    abilities: [ability("other", "Dark sight", "Sees in normal darkness as if it were light.", "senses")],
    description: "Ogres stand roughly 7 to 10 feet tall. A wandering ogre carries 1d6 × 100 gold pieces; a lair also has Treasure Type C."
  }),

  monster({
    key: "troll", name: "Troll", folder: "humanoids", ac: 4,
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
    key: "minotaur", name: "Minotaur", folder: "fantastic-creatures", ac: 6,
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
    key: "ochre-jelly", name: "Ochre Jelly", folder: "clean-up-crew", ac: 8,
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
    key: "black-pudding", name: "Black Pudding", folder: "clean-up-crew", ac: 6,
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

  ok(MONSTERS.length === 15, "fifteen starter monsters");
  ok(new Set(MONSTERS.map((m) => m.key)).size === MONSTERS.length, "monster keys are unique");
  ok(new Set(MONSTER_FOLDERS.map((f) => f.key)).size === MONSTER_FOLDERS.length, "folder keys are unique");
  ok(MONSTERS.every((m) => MONSTER_FOLDERS.some((f) => f.key === m.folder)), "every monster uses a declared folder");
  ok(MONSTERS.find((m) => m.key === "kobold")?.hd.dieSize === 3, "kobold uses d3 hit points");
  ok(MONSTERS.find((m) => m.key === "skeleton")?.hd.dieSize === 3, "skeleton uses d3 hit points");
  ok(MONSTERS.find((m) => m.key === "troll")?.specialAbilities.entries.some((a) => a.tag === "regeneration" && a.value === 3), "troll regeneration tagged");
  ok(MONSTERS.find((m) => m.key === "wight")?.specialAbilities.hitOnlyBy === HitOnlyBy.SILVER, "wight silver gate");
  ok(MONSTERS.find((m) => m.key === "gargoyle")?.specialAbilities.hitOnlyBy === HitOnlyBy.MAGIC, "gargoyle magic gate");
  ok(toMonsterActorData(MONSTERS.find((m) => m.key === "black-pudding")).system.attack.damage.dice === 3, "black pudding damage retained");

  console.log(`monsters.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

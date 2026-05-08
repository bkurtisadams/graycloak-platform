// gcc-encounter-data.js — bundled encounter data
// Auto-generated from the adndEnc Foundry module's data files.
// Strategy 1: bundle all encounter data in one file.
(function(){

// ─── from scripts/data/monster-manual.js ─────────────────────────────────────────────────
const MONSTER_MANUAL = {
  monsters: [
    {
      "name": "Aerial Servant",
      "category": "Extraplanar",
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Large (8' tall)",
      "move": "240 ft",
      "armorClass": 3,
      "hitDice": "16",
      "attacks": 1,
      "damage": "8d4",
      "specialAttacks": "Surprise on 1-4",
      "specialDefenses": "Can only be hit by magic weapons",
      "magicResistance": "Standard",
      "lairProbability": "0%",
      "intelligence": "Semi-",
      "alignment": "Neutral",
      "levelXP": "8/4000+20/hp",
      "TREASURE TYPE": "Nil",
      "treasure": "Nil",
      "description": "Aerial servants are creatures from the elemental planes that can be summoned by clerics. Nearly invisible, they surprise opponents easily and can only be harmed by magical weapons. They are extraordinarily strong and can strangle opponents."
    },
    {
      "name": "Amber Creeping Vine",
      "category": "Plant",
      "variants": [
        {
          "name": "Amber Creeping Vine",
          "description": "A parasitic plant with intelligence-draining tendrils that feed on victims' brains, transforming some into Amber Zombies.",
          "specialAbilities": {
            "attack": "Consumes 1d4 Intelligence per round from a captured victim.",
            "zombieCreation": "If Intelligence is reduced to 1–2, victim becomes an Amber Zombie.",
            "killingBlow": "Piercing the buried root (1 ft below) kills the vine instantly.",
            "zombieControl": "Controls 1 Amber Zombie per 2 blooms it possesses.",
            "camouflage": "Covers remains and victim gear with foliage and dirt."
          },
          "vulnerabilities": {
            "healing": "Healing magic restores Intelligence, but does not heal HP simultaneously.",
            "cure": "Killing the vine halts the drain; otherwise, the process continues."
          },
          "dwelling": {
            "location": "Woodlands or caverns with soft earth",
            "buriedRoot": "1 ft underground"
          },
          "TREASURE TYPE": "Nil",
          "treasure": {
            "individual": "None",
            "lair": "Victims' items buried beneath vine"
          },
          "alignment": "Neutral",
          "intelligence": "Low",
          "armorClass": "Varies (typically plant cover)",
          "hitDice": "Unknown (GM’s discretion)",
          "attacks": "1+ (Tendrils)",
          "damage": "Intelligence drain",
          "specialDefenses": "None",
          "magicResistance": "Standard",
          "lairProbability": "90%",
          "size": "Large (covers 10–20 ft area)"
        },
        {
          "name": "Amber Zombie",
          "description": "A mindless humanoid husk controlled by the Amber Creeping Vine. Amber-hued skin and lifeless eyes betray its origin.",
          "appearance": {
            "skin": "Amber",
            "eyes": "Glazed, lifeless"
          },
          "combat": {
            "hitDice": 2,
            "attacks": 1,
            "damage": "By weapon",
            "equipment": "Uses whatever it carried in life",
            "noSpells": true
          },
          "immunities": ["Mind-affecting spells", "Turning"],
          "behavior": {
            "guarding": "Defends the vine at all costs",
            "hunting": "Lures new prey to the vine",
            "lifespan": "Wanders away after 2 months, dies, and sprouts a new vine"
          },
          "cure": {
            "method": [
              "Kill the controlling vine",
              "Cast neutralise poison",
              "Then cast heal"
            ],
            "recoveryTime": "1 week per 4 Int lost"
          },
          "alignment": "Neutral",
          "intelligence": "None",
          "armorClass": 7,
          "hitDice": "2",
          "attacks": 1,
          "damage": "By weapon type",
          "specialAttacks": "None",
          "specialDefenses": "Immune to charm, sleep, mind control",
          "magicResistance": "Standard",
          "lairProbability": "As per vine",
          "size": "Medium (as former race)",
          "treasure": {
            "individual": "None",
            "lair": "Items carried at time of transformation"
          }
        }
      ]
    },
    {
      "name": "Anhkheg",
      "category": "Monster",
      "frequency": "Rare",
      "numberAppearing": "1d6",
      "size": "Large (10'-20' long)",
      "move": "120 ft (60 ft burrowing)",
      "armorClass": "2 (overall); 4 (underside)",
      "hitDice": "3-8",
      "attacks": 1,
      "damage": "3d6 (+1d4 acid)",
      "specialAttacks": "Acid squirt",
      "specialDefenses": "Nil",
      "magicResistance": "Standard",
      "lairProbability": "15%",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": "Variable based on HD",
      "TREASURE TYPE": "C",
      "treasure": "none",
      "description": "Insectoid burrowing predators with chitinous shells and powerful mandibles. They squirt acid and burrow through soil to ambush prey."
    },
    {
      "name": "Annis",
      "category": "Giant-kin",
      "variants": [
        {
          "name": "Annis",
          "description": "Evil hag-like giants, gaunt and ragged, infamous for their hunger and cruelty. Often mistaken for horrid old women at a distance.",
          "appearance": {
            "height": "8 ft",
            "clothing": "Stained and filthy garments",
            "physique": "Gaunt, lank-haired, giantesses with hideous features"
          },
          "abilities": {
            "strength": "19 (as strong as a hill giant)",
            "grapple": "If all 3 attacks hit in 1 round, opponent is held and auto-hit each following round"
          },
          "magic": {
            "fogCloud": "3×/day",
            "changeSelf": "3×/day"
          },
          "speech": {
            "languages": ["Common", "Giantish tongues", "Own language"]
          },
          "behavior": {
            "alignment": "Chaotic evil",
            "habits": "Anthropophagic; will eat any meat when hungry",
            "associates": ["Occasionally found with giants or trolls"]
          },
          "TREASURE TYPE": "D",
          "lair": {
            "chance": "20%",
            "treasure": {
              "cp": "1d20×1,000 (25%)",
              "sp": "1d8×1,000 (35%)",
              "ep": "1d6×1,000 (10%)",
              "gp": "1d6×1,000 (40%)",
              "gems": "1d8 (30%)",
              "jewellery": "1d6 (25%)",
              "magicItems": "Any 2 + 1 potion (15%)"
            }
          }
        }
      ],
      "frequency": "Very rare",
      "numberAppearing": "1d3",
      "size": "Large (8 ft)",
      "move": "150 ft",
      "armorClass": 0,
      "hitDice": 9,
      "attacks": 3,
      "damage": "1d8+8 / 1d8+8 / 1d8+1",
      "specialAttacks": {
        "grapple": "Hold opponent if all 3 attacks hit, automatic hits thereafter"
      },
      "specialDefenses": "Immune to illusions",
      "magicResistance": "Standard",
      "lairProbability": "20%",
      "intelligence": "Average to exceptional",
      "alignment": "Chaotic evil",
      "psionicAbility": "Nil",
      "levelXP": "7/1,200+10/hp",
      "specialAbilities": {
        "spellcasting": {
          "fogCloud": "3/day",
          "changeSelf": "3/day"
        },
        "grappling": "Opponent is automatically hit once grappled"
      },
      "treasure": {
        "individual": "None",
        "lair": "cp, sp, ep, gp, gems, jewellery, 2 magic items and 1 potion (see percentages)"
      }
    },    
    {
      "name": "Ant, Giant",
      "category": "Insect",
      "variants": [
        {
          "name": "Worker",
          "description": "The most numerous caste in a giant ant colony. Responsible for foraging, construction, and tending to eggs and larvae.",
          "frequency": "Rare",
          "numberAppearing": "1d100",
          "size": "Small",
          "move": "180 ft",
          "armorClass": 3,
          "hitDice": 2,
          "TREASURE TYPE": "Q (x3), S",
          "attacks": 1,
          "damage": "1d6",
          "specialAttacks": "None",
          "specialDefenses": "None",
          "magicResistance": "Standard",
          "lairProbability": "10%",
          "intelligence": "Animal",
          "alignment": "Neutral",
          "levelXP": "2/30+1/hp",
          "behavior": {
            "role": "Foraging and colony maintenance",
            "colonyNote": "Presence of soldiers: 1 per 5 workers"
          }
        },
        {
          "name": "Soldier",
          "description": "Larger, more aggressive ants bred for defense. Appear with colonies or patrolling near the queen’s chamber.",
          "frequency": "Very rare",
          "numberAppearing": "1 per 5 workers",
          "size": "Small",
          "move": "180 ft",
          "armorClass": 3,
          "hitDice": 3,
          "TREASURE TYPE": "Q (x3), S",
          "attacks": 2,
          "damage": "2d4 / 3d4",
          "specialAttacks": "Poison",
          "specialDefenses": "None",
          "magicResistance": "Standard",
          "lairProbability": "10%",
          "intelligence": "Animal",
          "alignment": "Neutral",
          "levelXP": "2/50+2/hp",
          "behavior": {
            "role": "Colony defense",
            "guardQueen": "5+ soldiers protect the queen at all times"
          }
        },
        {
          "name": "Queen",
          "description": "The heart of the colony. Immobile and completely dependent on her protectors.",
          "frequency": "Very rare",
          "numberAppearing": "1",
          "size": "Large",
          "move": "None",
          "armorClass": 4,
          "hitDice": 10,
          "TREASURE TYPE": "Q (x3), S",
          "attacks": "None",
          "damage": "None",
          "specialAttacks": "None",
          "specialDefenses": "None",
          "magicResistance": "Standard",
          "lairProbability": "100%",
          "intelligence": "Low",
          "alignment": "Neutral",
          "levelXP": "7/700+13/hp",
          "behavior": {
            "role": "Reproduction and colony cohesion",
            "deathEffect": "Slaying the queen causes colony-wide confusion (as druid spell) for 1d6 rounds; ants scatter thereafter"
          }
        }
      ],
      "specialAbilities": {
        "organization": {
          "nestDefense": "At least 5d10 workers and 5 soldiers defend the queen",
          "cohesion": "Queen's presence organizes the colony; without her, ants disperse"
        }
      },
      "treasure": {
        "individual": "None",
        "lair": {
          "gems": "3d4 (50%)",
          "potions": "2d4 (40%)"
        }
      }
    },
    {
      "name": "Ape, Carnivorous",
      "category": "Animal",
      "frequency": "Very rare",
      "numberAppearing": "2d4",
      "size": "Large",
      "move": "120 ft",
      "armorClass": 6,
      "hitDice": "5",
      "TREASURE TYPE": "C",
      "attacks": "3",
      "damage": "1d4/1d4/1d8",
      "specialAttacks": "Mangle",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "10%",
      "intelligence": "Low",
      "alignment": "Neutral",
      "levelXP": "3/125+4/hp",
      "treasure": "None",
      "description": "Carnivorous apes are larger, more aggressive versions of normal apes. They can deliver a devastating mangle attack when both hands hit the same target in a round, dealing an additional 1d6 damage."
    },
    {
      "name": "Ape, Normal",
      "category": "Animal",
      "frequency": "Rare",
      "numberAppearing": "1d4",
      "size": "Man-sized",
      "move": "120 ft",
      "armorClass": 6,
      "hitDice": "4+1",
      "TREASURE TYPE": "Nil",
      "attacks": "3",
      "damage": "1d3/1d3/1d6",
      "specialAttacks": "Mangle",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Low",
      "alignment": "Neutral",
      "levelXP": "3/110+4/hp",
      "treasure": "None",
      "description": "Normal apes are peaceful primates found in rainforests who fight only when threatened. If they hit with both hands in the same round, they deal an additional 1d6 damage by mangling their opponent."
    },
    {
      "name": "Aurumvorax",
      "category": "Beast",
      "variants": [
        {
          "name": "Aurumvorax",
          "description": "Also known as the 'golden gorger', this dense, burrowing predator has a beautiful golden pelt and the temperament of a furious badger. Though small in size, it is incredibly heavy and strong.",
          "appearance": {
            "coat": "Golden fur",
            "body": "Eight-legged, low-bodied like a weasel or badger"
          },
          "behavior": {
            "alignment": "Neutral",
            "habitat": "Plains and woodlands",
            "diet": "Carnivore—attacks anything it can kill and eat"
          },
          "combat": {
            "bite": {
              "effect": "Locks jaw like a bulldog; victim takes 2d4 damage per round while attached"
            },
            "clawRake": {
              "effect": "Each round after bite, 1d8 claws rake for 1d6 damage each"
            },
            "detachment": "The aurumvorax cannot be dislodged without killing it"
          },
          "defenses": {
            "bluntResistance": "Takes only half damage from blunt weapons",
            "fireResistance": "Takes only half damage from fire",
            "immunities": ["Poison", "Gas"]
          },
          "rumors": {
            "origin": "Possibly an extraplanar species, not native to the Prime Material Plane"
          },
          "treasure": {
            "individual": "None",
            "lair": "GM-determined; may contain treasure from past kills"
          }
        }
      ],
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Small (dense as a bear)",
      "move": "90 ft; 30 ft burrowing",
      "armorClass": 0,
      "hitDice": 12,
      "TREASURE TYPE": "Nil",
      "attacks": 1,
      "damage": "2d4 (bite) + claws if attached",
      "specialAttacks": {
        "biteAndRake": "On successful bite, victim is raked for 1d6 damage ×1d8 claws each round"
      },
      "specialDefenses": "Half damage from fire and blunt; immune to gas and poison",
      "magicResistance": "Standard",
      "lairProbability": "25%",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "psionicAbility": "Nil",
      "levelXP": "8/2,250+16/hp"
    },    
    {
      "name": "Axe Beak",
      "category": "Animal",
      "frequency": "Uncommon",
      "numberAppearing": "1-6",
      "size": "Large (7'+ tall)",
      "move": "180 ft",
      "armorClass": 6,
      "hitDice": 3,
      "TREASURE TYPE": "Nil",
      "attacks": 3,
      "damage": "1-3/1-3/2-8",
      "specialAttacks": "Nil",
      "specialDefenses": "Nil",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "levelXP": "3/60+3/hp",
      "treasure": "Nil",
      "description": "Axe beaks are large, flightless birds with sharp, axe-shaped beaks. They are aggressive predators that attack with their beaks and talons."
    },
    {
      "name": "Babbler",
      "category": "Humanoid (Mutant)",
      "variants": [
        {
          "name": "Babbler",
          "description": "Large, reptilian humanoids found in swamps and marshes. They emit incomprehensible speech and have an unsettling resemblance to miniature tyrannosaurs with longer arms. Possibly a mutant strain of lizard men.",
          "appearance": {
            "coloration": "Yellow with grey blotches and a grey underbelly",
            "body": "Mini-tyrannosaur body with humanoid arms",
            "size": "8 ft tall"
          },
          "behavior": {
            "alignment": "Chaotic evil",
            "habitat": "Swamps and marshes",
            "language": "Babbling tongue incomprehensible to humans and demi-humans",
            "diet": "Carnivorous, particularly fond of human flesh",
            "associates": "Occasionally found with lizard man raiding parties"
          },
          "combat": {
            "attacks": 3,
            "attackForms": "Two claws and one bite",
            "damage": "1d6 / 1d6 / 1d8",
            "tactics": {
              "stealth": "May hide like a 5th-level thief when prone in swampy terrain",
              "mobility": "Uses quadrupedal movement (120 ft) for speed; bipedal when attacking"
            }
          },
          "treasure": {
            "individual": "None",
            "lair": {
              "cp": "1d12×1,000 (20%)",
              "sp": "1d6×1,000 (35%)",
              "ep": "1d6×1,000 (10%)",
              "gp": "1d6×1,000 (40%)",
              "gems": "1d4 (30%)",
              "jewellery": "1d3 (25%)",
              "magicItems": "1 magic item and 1 potion (10%)"
            }
          }
        }
      ],
      "frequency": "Very rare",
      "numberAppearing": "1d4",
      "size": "Large (8 ft tall)",
      "move": "60 ft bipedal; 120 ft quadrupedal",
      "armorClass": 6,
      "hitDice": 5,
      "TREASURE TYPE": "B",
      "attacks": 3,
      "damage": "1d6 / 1d6 / 1d8",
      "specialAttacks": {
        "stealth": "Hides in swamp like a 5th-level thief"
      },
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "15%",
      "intelligence": "Average",
      "alignment": "Chaotic evil",
      "psionicAbility": "Nil",
      "levelXP": "3/100+5/hp"
    },    
    {
      "name": "Baboon",
      "category": "Animal",
      "frequency": "Common",
      "numberAppearing": "10-100",
      "size": "Medium (5' tall)",
      "move": "120 ft",
      "hitDice": "1-1",
      "TREASURE TYPE": "Nil",
      "armorClass": 6,
      "attacks": 1,
      "damage": "1-3",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "10%",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "levelXP": "1/5+1/hp",
      "treasure": "Nil",
      "description": "Baboons are social primates that live in large troops. Though not normally aggressive, they can be dangerous when threatened or provoked."
    },
    {
      "name": "Badger",
      "category": "Animal",
      "frequency": "Uncommon",
      "numberAppearing": "1-6",
      "size": "Small (3' long)",
      "move": "90 ft (30 ft burrowing)",
      "armorClass": 4,
      "hitDice": "3",
      "TREASURE TYPE": "Nil",
      "attacks": 3,
      "damage": "1-3/1-3/1-6",
      "specialAttacks": "Ferocity: +2 to hit if wounded",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "20%",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "levelXP": "3/60+3/hp",
      "treasure": "Nil",
      "description": "Badgers are burrowing mammals known for their tenacity. When wounded, they fight with increased ferocity, gaining a +2 bonus to hit."
    },
    {
      "name": "Baluchitherium",
      "category": "Animal",
      "frequency": "Very Rare",
      "numberAppearing": "1-3",
      "size": "Large (20' tall)",
      "move": "120 ft",
      "armorClass": 6,
      "hitDice": "12",
      "TREASURE TYPE": "Nil",
      "attacks": 1,
      "damage": "2-12",
      "specialAttacks": "Trample on charge",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "levelXP": "6/800+12/hp",
      "treasure": "Nil",
      "description": "The baluchitherium is an enormous prehistoric rhinoceros-like creature. When frightened, it charges and attempts to trample opponents."
    },
    
    {
      "name": "Banshee",
      "category": "Undead",
      "name_variants": "Groaning Spirit",
      "turnResistance": 13,
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Man-sized",
      "move": "150 ft",
      "armorClass": 0,
      "hitDice": "7",
      "TREASURE TYPE": "D",
      "attacks": "1",
      "damage": "1d8",
      "specialAttacks": "Groan (save vs magic or die), fear (save vs spells or flee)",
      "specialDefenses": "+1 weapon or better to hit; immune to sleep, charm, hold, cold, electrical attacks; exorcism slays",
      "magicResistance": "50%",
      "lairProbability": "10%",
      "intelligence": "Exceptional",
      "alignment": "Chaotic evil",
      "levelXP": "6/665+8/hp",
      "treasure": "None",
      "description": "The legendary banshee is the ghost of an evil elven female that haunts remote natural areas. Its chilling touch deals 1d8 damage, and its wail forces all creatures within 30 ft to save vs magic or die. Merely seeing a banshee causes fear unless the viewer saves vs spells. Immune to many spells and resistant to cold and electrical attacks, a banshee can be slain by exorcism."
    },
    {
      "name": "Barghest",
      "category": "Extraplanar",
      "variants": [
        {
          "name": "Barghest (Larval Form)",
          "description": "Fiendish beings from Gehenna that appear during a larval phase on the Prime Material Plane. Initially resembling large goblins, they can shapeshift into monstrous dogs.",
          "appearance": {
            "baseForm": "Large goblin-like humanoid",
            "alternateForm": "Huge dog with glowing eyes (at will)",
            "size": "Man-sized"
          },
          "behavior": {
            "origin": "Native to Gehenna, sent to Prime Material Plane during larval stage",
            "mission": "To grow in power by devouring souls; returns to Gehenna when mature",
            "diet": "Devours humanoids to grow stronger",
            "tactics": "Uses illusion and misdirection to isolate and consume victims"
          },
          "combat": {
            "hitDice": "6+6 and increasing",
            "attacks": 2,
            "damage": "2d4 + modifiers based on consumed victims",
            "growth": {
              "perHumanConsumed": {
                "HD": "+1+1",
                "AC": "-1",
                "MR": "+5%",
                "damage": "+1"
              },
              "maturity": "At 12+12 HD, can plane shift back to Gehenna"
            },
            "dogForm": {
              "speed": "Doubles to 300 ft",
              "surpriseChance": "50%",
              "specialMove": "Pass without trace (at will)"
            }
          },
          "spellAbilities": {
            "atWill": [
              "change self",
              "levitate",
              "misdirection",
              "projected image"
            ],
            "daily": [
              "charm person (1/day)",
              "dimension door (1/day)"
            ]
          },
          "vulnerabilities": {
            "fire": "If takes 15+ fire damage in one hit, must save vs spell or be banished to Gehenna"
          },
          "speech": {
            "intelligence": "High and higher",
            "languages": ["Goblin", "Infernal", "Common (sometimes)"]
          },
          "treasure": {
            "individual": "None",
            "lair": "None (wanders Prime Material Plane)"
          }
        }
      ],
      "frequency": "Very rare",
      "numberAppearing": "1d2",
      "size": "Man-sized",
      "move": "150 ft (double in dog form)",
      "armorClass": "2 and lower (improves as they grow)",
      "hitDice": "6+6 and higher",
      "TREASURE TYPE": "Nil",
      "attacks": 2,
      "damage": "2d4 + modifiers",
      "specialAttacks": "Spell-like powers; devouring victims increases power",
      "specialDefenses": "Can shapeshift; pass without trace; banishment trigger from fire",
      "magicResistance": "30% and increases with growth",
      "lairProbability": "Nil",
      "intelligence": "High and higher",
      "alignment": "Lawful evil",
      "psionicAbility": "Nil",
      "levelXP": "7/1,250+10/hp and higher"
    },    
    {
      "name": "Barracuda",
      "category": "Animal",
      "frequency": "Uncommon",
      "numberAppearing": "2d6",
      "size": "Small to Large",
      "move": "300 ft swimming",
      "armorClass": 6,
      "hitDice": "1-3",
      "TREASURE TYPE": "Nil",
      "attacks": 1,
      "damage": "2d4",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": "Variable based on HD",
      "treasure": "Nil",
      "description": "Barracudas are swift, predatory fish with sharp teeth. They are attracted to shiny objects and may attack swimmers wearing jewelry or metal equipment."
    },
    {
      "name": "Basilisk",
      "category": "Monster",
      "frequency": "Uncommon",
      "numberAppearing": "1d4",
      "size": "Medium (7' long)",
      "move": "60 ft",
      "armorClass": 4,
      "hitDice": "6+1",
      "TREASURE TYPE": "F",
      "attacks": 1,
      "damage": "1d10",
      "specialAttacks": "Petrifying gaze",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "40%",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "levelXP": "5/500+6/hp",
      "treasure": "Type F",
      "description": "The basilisk is a reptilian monster with a deadly gaze that turns victims to stone. Even seeing a basilisk's reflection can trigger its petrifying effect. It hunts in rocky terrain and often accumulates a collection of stone statues - former victims."
    },
    {
      "name": "Bat",
      "category": "Animal",
      "variants": [
        {
          "type": "Ordinary",
          "frequency": "Common",
          "numberAppearing": "1d100×10",
          "size": "Small",
          "move": "10 ft; 240 ft flying (AA:V)",
          "armorClass": "8, see below",
          "hitDice": "1d2 hp",
          "TREASURE TYPE": "Nil",
          "attacks": 1,
          "damage": 1,
          "specialAttacks": "Swarm, see below",
          "specialDefenses": "None",
          "levelXP": "1/1"
        },
        {
          "type": "Giant",
          "frequency": "Uncommon",
          "numberAppearing": "3d6",
          "size": "Small",
          "move": "10 ft; 240 ft flying (AA:V)",
          "armorClass": "8, see below",
          "hitDice": "1d4 hp",
          "TREASURE TYPE": "Nil",
          "attacks": 1,
          "damage": "1d2",
          "specialAttacks": "None",
          "specialDefenses": "See below",
          "levelXP": "1/5+1/hp"
        }
      ],
      "magicResistance": "Standard",
      "lairProbability": "10%",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "treasure": "None",
      "description": "Bats only attack when trapped, seeking to escape. When startled, they swarm, causing confusion and extinguishing torches. Their sonar navigation gives them AC 4 in optimal conditions. Giant bats grow up to 3 ft long with 6 ft wingspans. They're highly maneuverable, imposing -3 to hit with missiles (unless attacker has DEX 13+). Their bite carries a 1% chance of rabies or similar infection."
    },
    {
      "name": "Bat, Mobat",
      "category": "Animal",
      "frequency": "Rare",
      "numberAppearing": "1d8",
      "size": "Medium",
      "move": "30 ft; 150 ft flying (AA:IV)",
      "armorClass": "2 to 10, see below",
      "hitDice": "4 to 6, see below",
      "TREASURE TYPE": "C",
      "attacks": 1,
      "damage": "2d4",
      "specialAttacks": "See below",
      "specialDefenses": "See below",
      "magicResistance": "Standard",
      "lairProbability": "15%",
      "intelligence": "Low",
      "alignment": "Neutral (evil)",
      "levelXP": "3/135+3/hp (4 HD); 5/300+6/hp (6 HD)",
      "treasure": {
        "cp": {"amount": "1d12×1,000", "chance": "20%"},
        "sp": {"amount": "1d6×1,000", "chance": "30%"},
        "ep": {"amount": "1d4×1,000", "chance": "10%"},
        "gems": {"amount": "1d6", "chance": "25%"},
        "jewellery": {"amount": "1d3", "chance": "20%"},
        "magic_items": {"amount": "any 2", "chance": "10%"}
      },
      "description": "The very large mobat inhabits warm regions with plentiful warm-blooded prey. With 12-16 ft wingspans, they need large cave entrances. Their silent flight grants 50% surprise chance. They emit paralysing shrieks forcing victims to save vs paralysis or cover their ears defensively. Flying AC is 2, grounded AC is 10."
    },
    {
      "name": "Bear, Greater",
      "category": "Animal",
      "variants": [
        {
          "type": "Cave",
          "frequency": "Uncommon",
          "numberAppearing": "1d2",
          "size": "Large (12 ft)",
          "move": "120 ft",
          "armorClass": 6,
          "hitDice": "6+6",
          "TREASURE TYPE": "Nil",
          "attacks": 3,
          "damage": "1d8/1d8/1d12",
          "specialAttacks": "Hug: 2d8",
          "specialDefenses": "None",
          "levelXP": "5/225+8/hp"
        },
        {
          "type": "Polar",
          "frequency": "Rare",
          "numberAppearing": "1d6",
          "size": "Large (14 ft)",
          "move": "120 ft; 90 ft swimming",
          "armorClass": 6,
          "hitDice": "8+8",
          "TREASURE TYPE": "Nil",
          "attacks": 3,
          "damage": "1d10/1d10/2d6",
          "specialAttacks": "Hug: 3d6",
          "specialDefenses": "None",
          "levelXP": "6/600+12/hp"
        }
      ],
      "magicResistance": "Standard",
      "lairProbability": "10% (Cave); Nil (Polar)",
      "intelligence": "Semi-",
      "alignment": "Neutral",
      "treasure": "None",
      "description": "Cave bears are particularly carnivorous giant relics of past ages. Paw hits of 18+ cause additional hug damage. They have good hearing and smell but weak vision. If reduced to 0 hp, they continue fighting for 1d4 rounds or until reaching -9 hp. Polar bears are similar but fight for 1d4+1 rounds or until -13 hp after reaching 0 hp, and can swim effectively."
    },
    {
      "name": "Bear, Lesser",
      "category": "Animal",
      "variants": [
        {
          "type": "Black",
          "frequency": "Common",
          "numberAppearing": "1d3",
          "size": "Medium",
          "move": "120 ft",
          "armorClass": 7,
          "hitDice": "3+3",
          "TREASURE TYPE": "Nil",
          "attacks": 3,
          "damage": "1d3/1d3/1d6",
          "specialAttacks": "Hug: 2d4",
          "specialDefenses": "None",
          "levelXP": "3/75+3/hp"
        },
        {
          "type": "Brown",
          "frequency": "Uncommon",
          "numberAppearing": "1d6",
          "size": "Large (9 ft)",
          "move": "120 ft",
          "armorClass": 6,
          "hitDice": "5+5",
          "TREASURE TYPE": "Nil",
          "attacks": 3,
          "damage": "1d6/1d6/1d8",
          "specialAttacks": "Hug: 2d6",
          "specialDefenses": "None",
          "levelXP": "4/160+6/hp"
        }
      ],
      "magicResistance": "Standard",
      "lairProbability": "10%",
      "intelligence": "Semi-",
      "alignment": "Neutral",
      "treasure": "None",
      "description": "Black bears are the least aggressive bear type but will defend themselves and cubs. Paw hits of 18+ cause additional hug damage. Brown bears (including grizzlies) are more aggressive, with good hearing and smell but weak vision. If reduced to 0 hp, brown bears continue fighting for 1d4 rounds or until reaching -9 hp."
    },
    {
      "name": "Bee, Giant",
      "category": "Insect",
      "variants": [
        {
          "name": "Worker Honeybee",
          "description": "Diligent gatherers and hive tenders. Will defend the hive if threatened but usually flee from smoke or fire.",
          "frequency": "Rare",
          "numberAppearing": "1d10 (20d10 in lair)",
          "size": "Medium",
          "move": "90 ft; 300 ft flying (AA: IV)",
          "armorClass": 6,
          "hitDice": "3+1",
          "TREASURE TYPE": "Nil",
          "attacks": 1,
          "damage": "1d3",
          "specialAttacks": "Poisonous sting (once per encounter)",
          "specialDefenses": "None",
          "magicResistance": "Standard",
          "lairProbability": "20%",
          "intelligence": "Semi-",
          "alignment": "Neutral",
          "levelXP": "3/100+4/hp",
          "behavior": {
            "stingLimit": "Stings once per encounter; 25% chance of dying after stinging",
            "smokeAversion": "Flees from fire and smoke unless hive is threatened"
          }
        },
        {
          "name": "Soldier Honeybee",
          "description": "Larger and more aggressive than workers, tasked with defending the hive. Deadly poison in stinger.",
          "frequency": "Very rare",
          "numberAppearing": "1 (3d6 in lair)",
          "size": "Medium",
          "move": "120 ft; 300 ft flying (AA: III)",
          "armorClass": 5,
          "hitDice": "4+2",
          "TREASURE TYPE": "Nil",
          "attacks": 1,
          "damage": "1d4",
          "specialAttacks": "Poisonous sting (once per encounter)",
          "specialDefenses": "None",
          "magicResistance": "Standard",
          "lairProbability": "90%",
          "intelligence": "Semi-",
          "alignment": "Neutral",
          "levelXP": "3/150+5/hp",
          "behavior": {
            "defenseRole": "Primary defenders of the hive",
            "stingLimit": "Stings once per encounter; 25% chance of dying after"
          }
        },
        {
          "name": "Bumblebee",
          "description": "Aggressive nest defenders with powerful venom. Found in burrows or wild nests. Deadlier than honeybee types.",
          "frequency": "Rare",
          "numberAppearing": "1 (1d6+6 in lair)",
          "size": "Medium",
          "move": "60 ft; 240 ft flying (AA: II)",
          "armorClass": 5,
          "hitDice": "6+4",
          "TREASURE TYPE": "Nil",
          "attacks": 1,
          "damage": "1d6",
          "specialAttacks": "Poisonous sting (once per encounter)",
          "specialDefenses": "None",
          "magicResistance": "Standard",
          "lairProbability": "10%",
          "intelligence": "Semi-",
          "alignment": "Neutral",
          "levelXP": "4/300+8/hp",
          "behavior": {
            "aggression": "Very defensive if nest is disturbed",
            "stingLimit": "Same sting mechanic as others"
          }
        }
      ],
      "specialAbilities": {
        "stingDeath": "25% chance of dying after stinging; otherwise regrows slowly",
        "pupae": "Hives contain non-combatant queens (10 HD, no attack) and 2d3 drones (2 HD, no attack)",
        "royalJelly": {
          "chance": "15%",
          "effects": [
            "2d3 potions of extra healing (7th+ level caster)",
            "Unguent of youth (12th+ level caster): Makes user appear 2d3 years younger",
            "Market value: 3d6×1,000 gp"
          ]
        }
      },
      "treasure": {
        "individual": "None",
        "lair": "Honey worth 10d10 gp; 15% chance of royal jelly"
      }
    },    
    {
      "name": "Behir",
      "category": "Monster (Serpentine)",
      "variants": [
        {
          "name": "Behir",
          "description": "Massive serpentine creature with a crocodilian head and twelve clawed legs. It dwells in deep underground lairs or caves and is a deadly, fast-moving predator that can climb and constrict prey.",
          "appearance": {
            "body": "40 ft long snake-like torso",
            "legs": "12 clawed legs",
            "head": "Crocodilian with large, jagged teeth",
            "coloration": "Dark, earthy tones, scales often streaked with lightning patterns"
          },
          "behavior": {
            "alignment": "Neutral evil",
            "habitat": "Subterranean regions, caves, mountains",
            "temperament": "Aggressive, solitary predator"
          },
          "combat": {
            "attacks": "2 (bite + constriction) or 7 (bite + 6 claws)",
            "damage": {
              "constriction": "2d4 (bite) + 1d4 (wrap)",
              "clawSequence": "2d4 + 1d6×6 if wrapping victim",
              "lightning": "4d6+24 (breath weapon, 20 ft bolt every 10 rounds)"
            },
            "constriction": {
              "effect": "Wraps victim and claws them for 6 attacks in subsequent rounds"
            },
            "breathWeapon": {
              "type": "Lightning bolt",
              "range": "20 ft line",
              "damage": "4d6+24 (save vs breath for half)",
              "cooldown": "Once per 10 rounds"
            },
            "swallow": {
              "chance": "On attack roll of 20",
              "effect": "Victim is swallowed whole"
            }
          },
          "movement": {
            "speed": "150 ft",
            "climbing": "Vertical climb at half speed"
          },
          "defenses": {
            "immunities": ["Electricity", "Poison"]
          },
          "treasure": {
            "individual": "None",
            "lair": {
              "gems": "10d4 (60%)",
              "jewellery": "1d8 (30%)",
              "magicItem": "1 miscellaneous item (10%)"
            },
            "location": "Inside the creature’s stomach"
          }
        }
      ],
      "frequency": "Rare",
      "numberAppearing": "1d2",
      "size": "Large",
      "move": "150 ft",
      "armorClass": 4,
      "hitDice": 12,
      "attacks": "2 or 7",
      "damage": "2d4/1d4 or 2d4/1d6/1d6/1d6/1d6/1d6/1d6",
      "specialAttacks": {
        "lightning": "4d6+24, 20 ft bolt every 10 rounds",
        "constriction": "Wraps and claws if bite hits",
        "swallow": "On natural 20, swallows target"
      },
      "specialDefenses": "Immune to electricity and poison",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Low",
      "alignment": "Neutral evil",
      "psionicAbility": "Nil",
      "levelXP": "7/2,750+16/hp"
    },
    {
      "name": "Beetle, Giant",
      "category": "Insect",
      "variants": [
        {
          "name": "Bombardier Beetle",
          "description": "Found in forested areas, scavenges for rotting matter. When threatened, it releases a caustic and stunning chemical cloud.",
          "frequency": "Common",
          "numberAppearing": "3d4",
          "size": "Medium",
          "move": "90 ft",
          "armorClass": 4,
          "hitDice": "2+2",
          "TREASURE TYPE": "Nil",
          "attacks": 1,
          "damage": "2d6",
          "specialAttacks": {
            "acidCloud": {
              "range": "8 ft cube",
              "damage": "3d4",
              "effects": ["20% chance to stun (2d4 rounds)", "20% chance to deafen (2d6 rounds)"],
              "uses": "Every 3 rounds, max 2 uses per 8 hours"
            }
          },
          "specialDefenses": "None",
          "magicResistance": "Standard",
          "lairProbability": "Nil",
          "intelligence": "Non-",
          "alignment": "Neutral",
          "levelXP": "3/65+2/hp",
          "treasure": "None"
        },
        {
          "name": "Boring Beetle",
          "description": "Tunnel-dwelling beetle that consumes wood and fungus. May display emergent hive-like intelligence if colony is threatened.",
          "frequency": "Common",
          "numberAppearing": "3d6",
          "size": "Large",
          "move": "60 ft",
          "armorClass": 3,
          "hitDice": 5,
          "TREASURE TYPE": "C, R, S, T",
          "attacks": 1,
          "damage": "5d4",
          "specialAttacks": "None",
          "specialDefenses": "None",
          "magicResistance": "Standard",
          "lairProbability": "40%",
          "intelligence": "Non-",
          "alignment": "Neutral",
          "levelXP": "3/110+4/hp",
          "treasure": {
            "cp": "1d12×1,000 (20%)",
            "sp": "1d6×1,000 (30%)",
            "ep": "1d4×1,000 (10%)",
            "gp": "2d4×100 (40%)",
            "pp": "1d6×10 (50%)",
            "gems": "3d8 (55%)",
            "jewellery": "1d12 (45%)",
            "potions": "2d4 (40%)",
            "scrolls": "1d4 (50%)",
            "magicItems": "Any 2 (10%)"
          }
        },
        {
          "name": "Death Watch Beetle",
          "description": "Camouflages with debris and attacks with deadly bass vibrations. Feared for its droning death call.",
          "frequency": "Very rare",
          "numberAppearing": "1",
          "size": "Large",
          "move": "120 ft",
          "armorClass": 3,
          "hitDice": "9+1",
          "attacks": 1,
          "damage": "2d6",
          "specialAttacks": {
            "deathDrone": {
              "area": "30 ft radius",
              "save": "Save vs death or die",
              "failSave": "Take 4d6 damage",
              "cooldown": "Once every 12 turns"
            }
          },
          "specialDefenses": "None",
          "magicResistance": "Standard",
          "lairProbability": "10%",
          "intelligence": "Non-",
          "alignment": "Neutral",
          "levelXP": "7/1,100+12/hp",
          "treasure": "None"
        },
        {
          "name": "Fire Beetle",
          "description": "Nocturnal beetles with glowing red glands. Often harvested for light sources by adventurers.",
          "frequency": "Common",
          "numberAppearing": "3d4",
          "size": "Small",
          "move": "120 ft",
          "armorClass": 4,
          "hitDice": "1+2",
          "TREASURE TYPE": "Nil",
          "attacks": 1,
          "damage": "2d4",
          "specialAttacks": "None",
          "specialDefenses": "None",
          "magicResistance": "Standard",
          "lairProbability": "Nil",
          "intelligence": "Non-",
          "alignment": "Neutral",
          "levelXP": "1/30+1/hp",
          "specialAbilities": {
            "glowingGlands": {
              "effect": "Illuminates 10 ft radius for 1d6 days after death"
            }
          },
          "treasure": "None"
        },
        {
          "name": "Rhinoceros Beetle",
          "description": "Massive beetles that roam the tropics, crushing fruit and vegetation in their path.",
          "frequency": "Uncommon",
          "numberAppearing": "1d6",
          "size": "Large",
          "move": "60 ft",
          "armorClass": 2,
          "hitDice": 12,
          "TREASURE TYPE": "Nil",
          "attacks": 2,
          "damage": "3d8 / 2d8",
          "specialAttacks": "None",
          "specialDefenses": "None",
          "magicResistance": "Standard",
          "lairProbability": "Nil",
          "intelligence": "Non-",
          "alignment": "Neutral",
          "levelXP": "7/1,300+6/hp",
          "treasure": "None"
        },
        {
          "name": "Stag Beetle",
          "description": "Often destructive to farmland, devouring cultivated grains. Found near woodlands and fields.",
          "frequency": "Common",
          "numberAppearing": "2d6",
          "size": "Large",
          "move": "60 ft",
          "armorClass": 3,
          "hitDice": 7,
          "TREASURE TYPE": "Nil",
          "attacks": 3,
          "damage": "4d4 / 1d10 / 1d10",
          "specialAttacks": "None",
          "specialDefenses": "None",
          "magicResistance": "Standard",
          "lairProbability": "Nil",
          "intelligence": "Non-",
          "alignment": "Neutral",
          "levelXP": "4/225+8/hp",
          "treasure": "None"
        },
        {
          "name": "Water Beetle",
          "description": "Dwelling in freshwater depths, this predatory beetle hunts anything it detects by vibration or scent.",
          "frequency": "Common",
          "numberAppearing": "1d12",
          "size": "Medium",
          "move": "30 ft; 120 ft swimming",
          "armorClass": 3,
          "hitDice": 4,
          "TREASURE TYPE": "Nil",
          "attacks": 1,
          "damage": "3d6",
          "specialAttacks": "None",
          "specialDefenses": "None",
          "magicResistance": "Standard",
          "lairProbability": "Nil",
          "intelligence": "Non-",
          "alignment": "Neutral",
          "levelXP": "3/75+3/hp",
          "treasure": "None"
        }
      ]
    },
    {
      "name": "Bird",
      "category": "Animal",
      "variants": [
        {
          "type": "Normal",
          "frequency": "Common",
          "numberAppearing": "1d20",
          "size": "Small",
          "move": "30 ft; 360 ft flying (AA:IV)",
          "armorClass": 6,
          "hitDice": 1,
          "TREASURE TYPE": "Nil",
          "attacks": 3,
          "damage": "1d2/1d2/1",
          "specialAttacks": "See below",
          "specialDefenses": "None",
          "levelXP": "1/15 +1/hp"
        },
        {
          "type": "Huge",
          "frequency": "Rare",
          "numberAppearing": 1,
          "size": "Small",
          "move": "30 ft; 360 ft flying (AA:IV)",
          "armorClass": 5,
          "hitDice": 2,
          "TREASURE TYPE": "Nil",
          "attacks": 3,
          "damage": "1d4/1d4/2",
          "specialAttacks": "See below",
          "specialDefenses": "None",
          "levelXP": "2/40 +1/hp"
        },
        {
          "type": "Giant",
          "frequency": "Very rare",
          "numberAppearing": 1,
          "size": "Medium",
          "move": "30 ft; 360 ft flying (AA:IV)",
          "armorClass": 7,
          "hitDice": 4,
          "TREASURE TYPE": "Nil",
          "attacks": 3,
          "damage": "1d6/1d6/2d6",
          "specialAttacks": "See below",
          "specialDefenses": "None",
          "levelXP": "4/105 +3/hp"
        }
      ],
      "magicResistance": "Standard",
      "lairProbability": "20%",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "treasure": "None",
      "description": "Birds of prey (eagles, hawks, falcons) can perform dive attacks from 120+ ft, gaining +2 to hit and double talon damage. Giant birds (likely magical in origin) can dive from 60 ft with +4 to hit and double talon damage. Some giant birds are rumored to possess intelligence and speech capability."
    },
    {
      "name": "Blindheim",
      "category": "Humanoid (Subterranean)",
      "variants": [
        {
          "name": "Blindheim",
          "description": "A strange subterranean frog-like creature with eyes that emit beams of intense, blinding light. Highly territorial and aggressive, they dwell in the depths of the underworld.",
          "appearance": {
            "form": "Humanoid frog",
            "color": "Yellowish skin",
            "eyes": "Large, luminescent — project blinding beams"
          },
          "behavior": {
            "alignment": "Chaotic evil",
            "habitat": "Deep underground caverns and tunnels",
            "aggression": "Attack intruders on sight, especially in groups"
          },
          "combat": {
            "attacks": 1,
            "damage": "1d8",
            "special": {
              "blindingLight": {
                "range": "30 ft",
                "effect": "Save vs aimed magic item or be blinded for 1d8+12 turns",
                "penalty": "-3 to save if victim has infravision"
              },
              "fightingBlind": {
                "options": {
                  "attackPenalty": "-2 if avoiding gaze",
                  "normalAttack": "If immune to light"
                }
              }
            }
          },
          "defenses": {
            "specialDefenses": "None"
          },
          "speech": {
            "intelligence": "Animal",
            "language": "None"
          },
          "treasure": {
            "individual": "None",
            "lair": {
              "cp": "2d6×1,000 (20%)",
              "sp": "1d6×1,000 (35%)",
              "ep": "1d6×1,000 (20%)",
              "gems": "1d4 (20%)",
              "jewellery": "1d4 (25%)",
              "magicItems": "Random weapon or magic item (15%)"
            }
          }
        }
      ],
      "frequency": "Very rare",
      "numberAppearing": "1d4",
      "size": "Small",
      "move": "90 ft",
      "armorClass": 3,
      "hitDice": "4+2",
      "TREASURE TYPE": "Nil",
      "attacks": 1,
      "damage": "1d8",
      "specialAttacks": {
        "blinding": "Twin beams of bright light from eyes; save or be blinded"
      },
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "5%",
      "intelligence": "Animal",
      "alignment": "Chaotic evil",
      "psionicAbility": "Nil",
      "levelXP": "3/110+5/hp"
    },
    {
      "name": "Blink Dog",
      "category": "Magical Beast",
      "variants": [
        {
          "name": "Blink Dog",
          "description": "Intelligent, teleporting canines known for their loyalty, tactical cunning, and unerring ability to blink unpredictably in and out of combat. Natural enemies of coeurls.",
          "appearance": {
            "size": "Medium (3 ft at shoulder)",
            "coloration": "Dark brown with white highlights"
          },
          "behavior": {
            "alignment": "Lawful good",
            "habitat": "Forests, plains, or magical glades",
            "intelligence": "Comparable to average human",
            "communication": "High-pitched barks and low growls",
            "packTactics": "Fight in coordinated groups, blinking to flank or harass enemies",
            "blinkTriggers": "If pack suffers >25% losses, all remaining dogs blink away and flee"
          },
          "combat": {
            "attacks": 1,
            "damage": "1d6",
            "specialAttacks": {
              "rearAttack": "75% chance to blink into rear or flank position, bypassing shield and Dex bonuses",
              "blink": {
                "triggerRoll": "Blink occurs on roll of 12+ on 1d20 each round",
                "targetRoll": "01–15: behind, 16–18: right flank, 19: left flank, 20: front",
                "limitations": "Never teleports into solid objects or occupied space"
              }
            },
            "defensiveTactics": "Uses blinking defensively to avoid danger or withdraw"
          },
          "specialAbilities": {
            "teleportation": "Short-range blink-style teleportation as natural ability"
          },
          "lair": {
            "probability": "20%",
            "pups": {
              "chance": "60%",
              "number": "3d4",
              "combatStats": {
                "hitDice": "1",
                "damage": "1d2",
                "tactics": "More likely to flee than fight"
              },
              "value": "Loyal companion to good-aligned humans; can be sold for 1,500 gp (±100–600 gp)"
            },
            "treasure": {
              "cp": "2d6×1,000 (20%)",
              "sp": "1d6×1,000 (30%)",
              "ep": "1d6×1,000 (15%)",
              "gems": "1d6 (20%)",
              "jewellery": "1d4 (25%)",
              "magicItems": "2 random magic items or weapons (15%)"
            }
          },
          "relationships": {
            "enemies": ["Coeurls (attack on sight)"],
            "companions": ["Good-aligned humanoids (if tamed young)"]
          }
        }
      ],
      "frequency": "Rare",
      "numberAppearing": "4d4",
      "size": "Medium (3 ft at shoulder)",
      "move": "120 ft",
      "armorClass": 5,
      "hitDice": 4,
      "TREASURE TYPE": "C",
      "attacks": 1,
      "damage": "1d6",
      "specialAttacks": {
        "rearAttack": "75% chance to attack from rear or flank due to blinking"
      },
      "specialDefenses": "Teleportation (blink)",
      "magicResistance": "Standard",
      "lairProbability": "20%",
      "intelligence": "Average",
      "alignment": "Lawful good",
      "psionicAbility": "Nil",
      "levelXP": "4/175 + 5/hp"
    },
    {
      "name": "Black Pudding",
      "category": "Ooze",
      "frequency": "Uncommon",
      "numberAppearing": "1 or 1d4",
      "size": "Small to Large (5-8 ft diameter)",
      "move": "60 ft",
      "armorClass": 6,
      "hitDice": 10,
      "TREASURE TYPE": "Nil",
      "attacks": 1,
      "damage": "3d8",
      "specialAttacks": "Dissolves wood and metal (chain in 1 round, plate in 2, +1 round per plus of magic armor)",
      "specialDefenses": "Blows and lightning divide it into smaller parts, each able to attack; immune to cold",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": "10/3,400+14/hp",
      "description": "A scavenger/hunter composed of groups of single cells found in underground areas. Can flow through narrow openings such as a 1-inch crack under a door. Travels on walls and ceilings. Fire causes normal damage. If chopped, struck, or hit by lightning, it splits into two or more parts, each able to attack. Color variations include grey, brown, and white."
    },    
    {
      "name": "Boar",
      "category": "Animal",
      "variants": [
        {
          "type": "Wild",
          "frequency": "Common",
          "numberAppearing": "1d12",
          "size": "Medium",
          "move": "150 ft",
          "armorClass": 7,
          "hitDice": "3+3",
          "TREASURE TYPE": "Nil",
          "attacks": 1,
          "damage": "3d4",
          "specialAttacks": "None",
          "specialDefenses": "None",
          "levelXP": "3/75+3/hp"
        },
        {
          "type": "Giant",
          "frequency": "Uncommon",
          "numberAppearing": "2d4",
          "size": "Large",
          "move": "120 ft",
          "armorClass": 6,
          "hitDice": 7,
          "TREASURE TYPE": "Nil",
          "attacks": 1,
          "damage": "3d6",
          "specialAttacks": "None",
          "specialDefenses": "None",
          "levelXP": "4/225+8/hp"
        }
      ],
      "magicResistance": "Standard",
      "lairProbability": "20%",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "treasure": "None",
      "description": "Aggressive omnivores related to pigs. Wild boar groups include sows (3 HD, 2d4 damage) and young (which flee). Both boars and sows fight for 1d4+1 rounds after reaching 0 hp, or until -7 hp. Giant boars are prehistoric ancestors, even more aggressive, fighting to -11 hp or for 1d4 rounds after 0 hp. Young giants have 2-6 HD and do 1d4 to 3d4 damage."
    },
    {
      "name": "Boar, Warthog",
      "category": "Animal",
      "frequency": "Common",
      "numberAppearing": "1d6",
      "size": "Small",
      "move": "120 ft",
      "armorClass": 7,
      "hitDice": 3,
      "TREASURE TYPE": "Nil",
      "attacks": 2,
      "damage": "2d4/2d4",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "20%",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "levelXP": "3/50+2/hp",
      "treasure": "None",
      "description": "Tropical relatives of common boars, warthogs attack only if threatened or cornered. Groups larger than two consist of mated pairs with young. All fight for 1-2 rounds below 0 hit points, or to -6 hp. Young have 1-2 HD and do 1d4-1 or 1d4+1 damage."
    },
    {
      "name": "Bugbear",
      "category": "Humanoid",
      "frequency": "Uncommon",
      "numberAppearing": "6d6",
      "size": "Large (7 ft tall)",
      "move": "90 ft",
      "armorClass": 5,
      "hitDice": "3+1",
      "TREASURE TYPE": "Individuals: J, K, L, M; Lair: B",
      "attacks": 1,
      "damage": "2d4 or by weapon",
      "specialAttacks": "Surprise on a 1-3 on 1d6",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "25%",
      "intelligence": "Low to average",
      "alignment": "Chaotic evil",
      "levelXP": "3/135+4/hp",
      "description": "Bugbears are stealthy goblinoid raiders with a talent for surprising prey. Their lair contains chieftains, sub-chiefs, females, and young. They use looted weapons and speak hobgoblin, goblin, and their own tongue.",
      "leaders": {
        "per_12": {
          "leader": {
            "hitPoints": "22-25",
            "armorClass": 4,
            "attacks": "As 4 HD monster",
            "damage": "+1 on damage caused"
          }
        },
        "per_24": {
          "additions": [
            {
              "chief": {
                "hitPoints": "28-30",
                "armorClass": 3,
                "attacks": "As 4 HD monster",
                "damage": "+2 damage"
              }
            },
            {
              "subChief": {
                "hitPoints": "22-25",
                "armorClass": 4,
                "attacks": "As 4 HD monster",
                "damage": "+1 on damage caused"
              }
            }
          ]
        },
        "lair": {
          "leadership": "Always a chief and sub-chief",
          "females": "50% of males; fight as hobgoblins if in life-threatening situation",
          "young": "50% of males; fight as kobolds if in life-threatening situation"
        }
      },
      "equipment": {
        "weapons": {
          "types": [
            "Swords",
            "Morning stars (wooden clubs with spikes)",
            "Spears",
            "Axes",
            "Maces",
            "Hammers"
          ],
          "missileUse": {
            "types": ["Spears", "Axes", "Maces", "Hammers"],
            "range": {
              "maximum": "4\"",
              "medium": "Under 2\""
            }
          }
        }
      },
      "specialAbilities": {
        "strength": "Strong enough to throw heavy weapons up to 4\""
      },
      "treasure": {
        "individual": "4d6 sp, 2d4 gp",
        "lair": {
          "cp": "1d8×1,000",
          "gp": "1d3×1,000",
          "gems": {"amount": "1d8", "chance": "30%"},
          "jewellery": {"amount": "1d4", "chance": "20%"},
          "magic_items": {"type": "weapon", "chance": "10%"}
        }
      }
    },
    {
      "name": "Bulette",
      "category": "Monster (Magical Beast)",
      "variants": [
        {
          "name": "Bulette",
          "description": "Feared apex predators known as 'land sharks' for their burrowing ambushes. Engineered monstrosities with armored plates, a massive maw, and an insatiable hunger—especially for horses. Elves and dwarves are generally avoided as prey.",
          "appearance": {
            "body": "Heavily armored, plated like a turtle or armadillo",
            "head": "Large, shark-like jaw filled with gnashing teeth",
            "size": "Large, ~9 ft tall at hump"
          },
          "behavior": {
            "alignment": "Neutral",
            "habitat": "Hills, plains, and open terrain",
            "temperament": "Aggressively territorial",
            "diet": "Carnivore—especially fond of horses",
            "reproduction": "Unknown; believed to be artificially created",
            "tactics": "Burrows just below the surface, ambushing prey from below"
          },
          "combat": {
            "attacks": 3,
            "damage": "3d6 / 3d6 / 4d12 (bite)",
            "movement": {
              "surface": "140 ft",
              "burrowing": "30 ft"
            },
            "armorClass": {
              "body": -2,
              "eyes": 4,
              "underbelly": 6
            },
            "specialAttacks": {
              "leap": {
                "range": "8 ft vertical",
                "effect": "Attempts to land on victim and attack with all four limbs"
              }
            }
          },
          "defenses": {
            "armor": "Heavily plated back and flanks; underbelly and eyes are vulnerable"
          },
          "treasure": {
            "individual": "None",
            "lair": "None—nomadic and never lairs",
            "special": {
              "armorPlates": "Highly prized by armorers; can be used to craft +1 or +2 shields"
            }
          }
        }
      ],
      "frequency": "Very rare",
      "numberAppearing": "1d2",
      "size": "Large",
      "move": "140 ft; 30 ft burrowing",
      "armorClass": "-2 (back) / 4 (eyes) / 6 (underbelly)",
      "hitDice": 9,
      "TREASURE TYPE": "Nil",
      "attacks": 3,
      "damage": "3d6 / 3d6 / 4d12",
      "specialAttacks": {
        "leap": "Can leap 8 ft and land atop a target, attacking with all four feet"
      },
      "specialDefenses": "Heavily armored body; weak points at eyes and underbelly",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "psionicAbility": "Nil",
      "levelXP": "8/2,000+12/hp"
    },
    {
      "name": "Camel",
      "category": "Animal",
      "frequency": "Common",
      "numberAppearing": "1d12",
      "size": "Large",
      "move": "210 ft dromedary / 180 ft bactrian",
      "armorClass": 7,
      "hitDice": 3,
      "TREASURE TYPE": "Nil",
      "attacks": 1,
      "damage": "1d4",
      "specialAttacks": "Spit",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "levelXP": "2/50+2/hp",
      "treasure": "None",
      "description": "Ornery beasts of burden in two varieties: single-humped dromedaries (warmer climates) and two-humped bactrians (more adaptable, 30 ft slower). Both can carry up to 6,000 gp weight (halving movement) or 4,000-5,000 gp (reducing speed to 60 ft). They bite to attack and can spit (50% chance, with 25% chance to blind for 1d3 rounds)."
    },
    {
      "name": "Carbuncle",
      "category": "Magical Beast",
      "variants": [
        {
          "name": "Carbuncle",
          "description": "Small armadillo-like creatures with a magical ruby embedded in their forehead. Agents of chaos, they spread discord through lies and betrayal.",
          "appearance": {
            "size": "Small",
            "feature": "Large ruby set above its eyes"
          },
          "behavior": {
            "alignment": "Chaotic neutral",
            "intelligence": "Average (empathic)",
            "habitat": "Woodlands or ruins",
            "diet": "Leaves and small insects",
            "telepathy": "Minor empathic communication",
            "motive": "Joins adventuring parties to spread mischief"
          },
          "specialAbilities": {
            "gem": {
              "value": "At least 500 gp (randomized)",
              "regeneration": "Regrows over several months if given willingly",
              "shatter": "Destroyed if carbuncle dies"
            },
            "enchantment": "Can be persuaded to give gem only via charm or magic"
          },
          "treasure": "Gemstone (see behavior)",
          "lairProbability": "10%"
        }
      ],
      "frequency": "Rare",
      "numberAppearing": "1",
      "size": "Small",
      "move": "30 ft",
      "armorClass": 2,
      "hitDice": 1,
      "TREASURE TYPE": "Nil",
      "attacks": "None",
      "damage": "None",
      "specialAttacks": "None",
      "specialDefenses": "See gem behavior",
      "magicResistance": "Standard",
      "intelligence": "Average",
      "alignment": "Chaotic neutral",
      "levelXP": "1/5+1/hp"
    },
    {
      "name": "Carcass Creeper",
      "category": "Aberration",
      "variants": [
        {
          "name": "Carcass Creeper",
          "description": "A grotesque blend of cutworm and squid, the carcass creeper is a fast, paralytic horror that dwells underground and feeds on corpses.",
          "appearance": {
            "form": "Segmented worm with many tentacles",
            "feature": "Armored head, soft body"
          },
          "behavior": {
            "alignment": "Neutral",
            "intelligence": "Non-",
            "habitat": "Subterranean lairs",
            "instinct": "Lays eggs in fresh corpses"
          },
          "combat": {
            "attacks": 8,
            "damage": "Paralysis (no damage)",
            "reach": "2 ft per tentacle"
          },
          "armorClass": {
            "head": 3,
            "body": 7
          },
          "treasure": {
            "cp": "1d8×1,000 (50%)",
            "sp": "1d6×1,000 (25%)",
            "ep": "1d4×1,000 (25%)",
            "gp": "1d3×1,000 (25%)",
            "gems": "1d8 (30%)",
            "jewellery": "1d4 (20%)",
            "magicItem": "1 weapon, armor, or miscellaneous (20%)"
          }
        }
      ],
      "frequency": "Uncommon",
      "numberAppearing": "1d6",
      "size": "Large",
      "move": "120 ft",
      "armorClass": "3/7",
      "hitDice": "3+1",
      "TREASURE TYPE": "B",
      "attacks": 8,
      "damage": "Paralysis",
      "specialAttacks": "Paralysis",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "50%",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": "3/105+3/hp"
    },
    {
      "name": "Caryatid Column",
      "category": "Construct",
      "variants": [
        {
          "name": "Caryatid Column",
          "description": "Magical guardian statues carved in humanoid form. They animate to defend treasures or locations, then return to statue form.",
          "appearance": {
            "form": "Intricately carved humanoid statue (usually a maiden)",
            "pose": "Holds faintly outlined sword"
          },
          "behavior": {
            "alignment": "Neutral",
            "intelligence": "Non-",
            "activation": "Triggers when someone opens a door, lifts an item, or enters room",
            "combat": "Returns to statue form after defending"
          },
          "combat": {
            "attacks": 1,
            "damage": "2d4 (sword)",
            "weaponBreak": "25% chance to break weapon on hit, reduced by 5% per +1"
          },
          "specialDefenses": {
            "damageReduction": "Normal weapons half damage",
            "magicImmunity": "Immune to magical weapon effects",
            "savingThrows": "+4 to all saves"
          }
        }
      ],
      "frequency": "Very rare",
      "numberAppearing": "1d12",
      "size": "Medium",
      "move": "60 ft",
      "armorClass": 5,
      "hitDice": 5,
      "TREASURE TYPE": "Nil",
      "attacks": 1,
      "damage": "2d4",
      "specialAttacks": "None",
      "specialDefenses": "See weapon break and immunity",
      "magicResistance": "All saves at +4",
      "lairProbability": "Nil",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": "5/110 + 3/hp"
    },    
    {
      "name": "Cat",
      "category": "Animal",
      "variants": [
        {
          "type": "Domestic",
          "frequency": "Common",
          "numberAppearing": "1 or 2d6",
          "size": "Small",
          "move": "50 ft",
          "armorClass": 6,
          "hitDice": "1d2 hp",
          "TREASURE TYPE": "Nil",
          "attacks": 1,
          "damage": "1d2-1",
          "specialAttacks": "Rear claws",
          "specialDefenses": "None",
          "levelXP": "1/3+1/hp"
        },
        {
          "type": "Wild",
          "frequency": "Uncommon",
          "numberAppearing": "1 or 1d4+1",
          "size": "Small",
          "move": "180 ft",
          "armorClass": 5,
          "hitDice": "1d6 hp",
          "TREASURE TYPE": "Nil",
          "attacks": 3,
          "damage": "1/1/1d2",
          "specialAttacks": "Rear claws",
          "specialDefenses": "None",
          "levelXP": "1/10+1/hp"
        },
        {
          "type": "Lynx, Giant",
          "frequency": "Rare",
          "numberAppearing": "1d4",
          "size": "Medium",
          "move": "120 ft",
          "armorClass": 5,
          "hitDice": "2+2",
          "TREASURE TYPE": "Nil",
          "attacks": 3,
          "damage": "1d2/1d2/1d4",
          "specialAttacks": "Rear claws; surprise on a 1d4",
          "specialDefenses": "Thief skills",
          "levelXP": "3/90+3/hp"
        }
      ],
      "magicResistance": "Standard",
      "lairProbability": "75% (Domestic); 5% (Wild and Giant Lynx)",
      "intelligence": "Animal (Very for Giant Lynx)",
      "alignment": "Neutral",
      "treasure": "None",
      "description": "Cats are agile and rarely surprised (only on 1 on d6), while able to surprise others on 1-3 on d6. Cats exceeding their needed 'to hit' score by 4+ can rake with rear claws (roll damage twice). Black cats serving as mage familiars grant excellent hearing and night vision. Giant lynxes are magical beings dwelling in icy wastes, possessing thief skills (90% Hide/Move Silently/Climb Walls, 75% Find/Remove Traps) and their own language."
    },
    {
      "name": "Caterwaul",
      "category": "Magical Beast",
      "variants": [
        {
          "name": "Caterwaul",
          "description": "Upright-walking feline predators that haunt dark caves, known for their eerie screech and deadly agility. Fierce and territorial.",
          "appearance": {
            "form": "Black panther-like, walks upright or on all fours",
            "movement": "180 ft upright, 240 ft sprint on all fours"
          },
          "behavior": {
            "alignment": "Chaotic evil",
            "intelligence": "Low",
            "habitat": "Caves and shadowy terrain",
            "instinct": "Ambush predators attracted to shiny objects"
          },
          "combat": {
            "attacks": "3 (claw, claw, bite)",
            "damage": "1d4 / 1d4 / 1d6",
            "screech": {
              "effect": "All within 60 ft take 1d8 damage",
              "trigger": "When pouncing"
            },
            "dexterityEffects": {
              "acBonus": "Varies from 0 to -7",
              "attacksPerRound": "Varies from 1/1 to 5/2",
              "table": "Roll d%; reference table for AC/attacks"
            }
          },
          "specialDefenses": {
            "stealth": "75% hide in shadows, 75% move silently",
            "climbing": "Scales walls with 5% failure chance",
            "surprise": "Can only be surprised on 1 in 10"
          },
          "treasure": {
            "gp": "1d6×1,000 (50%)",
            "gems": "1d8 (40%)",
            "jewellery": "5d6 (40%)",
            "magicItems": "2d4 potions + 1 item (40%)"
          }
        }
      ],
      "frequency": "Rare",
      "numberAppearing": "1",
      "size": "Medium",
      "move": "180 ft (upright), 240 ft (sprint)",
      "armorClass": 6,
      "hitDice": "4+2",
      "TREASURE TYPE": "N, R, S, U",
      "attacks": 3,
      "damage": "1d4 / 1d4 / 1d6",
      "specialAttacks": "Screech (1d8 in 60 ft)",
      "specialDefenses": "See stealth, climbing, surprise",
      "magicResistance": "Standard",
      "lairProbability": "20%",
      "intelligence": "Low",
      "alignment": "Chaotic evil",
      "levelXP": "5/400+5/hp"
    },    
    {
      "name": "Cattle",
      "category": "Animal",
      "variants": [
        {
          "type": "Buffalo",
          "frequency": "Uncommon",
          "numberAppearing": "4d6",
          "size": "Large",
          "move": "150 ft",
          "armorClass": 7,
          "hitDice": 5,
          "TREASURE TYPE": "Nil",
          "attacks": 2,
          "damage": "1d8/1d8",
          "specialAttacks": "Charge",
          "specialDefenses": "Head is AC 3",
          "levelXP": "3/110+4/hp"
        },
        {
          "type": "Bull",
          "frequency": "Common",
          "numberAppearing": "1, plus 50% chance of 3d6 cattle",
          "size": "Large",
          "move": "150 ft",
          "armorClass": 7,
          "hitDice": 4,
          "TREASURE TYPE": "Nil",
          "attacks": 2,
          "damage": "1d6/1d6",
          "specialAttacks": "Charge",
          "specialDefenses": "None",
          "levelXP": "3/75+3/hp"
        },
        {
          "type": "Wild",
          "frequency": "Common",
          "numberAppearing": "20d10",
          "size": "Large",
          "move": "150 ft",
          "armorClass": 7,
          "hitDice": "2-4 HD",
          "TREASURE TYPE": "Nil",
          "attacks": 1,
          "damage": "1d4",
          "specialAttacks": "Stampede",
          "specialDefenses": "None",
          "levelXP": "1/10+1/hp"
        }
      ],
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "treasure": "None",
      "description": "Buffalo attack if approached within 60 ft, potentially causing the whole herd to charge. Charges (minimum 40 ft) deal 3d6 impact plus 1d4 trampling damage. 50% are non-aggressive. Bulls are very aggressive (75% chance to charge if approached within 80 ft), dealing 3d4 impact plus 1d4 trampling damage over minimum 30 ft. Wild cattle are skittish herd animals; stampedes cause characters to be trampled by 2d4 animals for 1d4 damage each."
    },
    {
      "name": "Centipede",
      "category": "Vermin",
      "variants": [
        {
          "name": "Large Centipede",
          "frequency": "Uncommon",
          "numberAppearing": "5d6",
          "size": "Small",
          "move": "210 ft",
          "armorClass": 9,
          "hitDice": "1 hp",
          "TREASURE TYPE": "Nil",
          "attacks": 1,
          "damage": "None",
          "specialAttacks": "Poison (save at +4, 4d4 damage)",
          "specialDefenses": "None",
          "magicResistance": "Standard",
          "lairProbability": "15%",
          "intelligence": "Non-",
          "alignment": "Neutral",
          "levelXP": "2/31"
        },
        {
          "name": "Huge Centipede",
          "frequency": "Common",
          "numberAppearing": "2d12",
          "size": "Small",
          "move": "150 ft",
          "armorClass": 9,
          "hitDice": "1 to 2 hp",
          "TREASURE TYPE": "Nil",
          "attacks": 1,
          "damage": "None",
          "specialAttacks": "Poison (save at +4, lethal)",
          "specialDefenses": "None",
          "magicResistance": "Standard",
          "lairProbability": "15%",
          "intelligence": "Non-",
          "alignment": "Neutral",
          "levelXP": "2/30+1/hp"
        },
        {
          "name": "Giant Centipede",
          "frequency": "Very rare",
          "numberAppearing": "1d4",
          "size": "Man-sized",
          "move": "180 ft",
          "armorClass": 5,
          "hitDice": 3,
          "attacks": 1,
          "damage": "1d3",
          "specialAttacks": "Poison (save or die, or 1d8 acid dmg on save)",
          "specialDefenses": "None",
          "magicResistance": "Standard",
          "lairProbability": "15%",
          "intelligence": "Non-",
          "alignment": "Neutral",
          "levelXP": "3/125+3/hp"
        }
      ],
      "treasure": "None"
    },
    {
      "name": "Chimæra",
      "category": "Magical Beast",
      "variants": [
        {
          "name": "Chimæra",
          "description": "A three-headed hybrid of lion, goat, and red dragon with wings. Vicious and chaotic, capable of six natural attacks and fiery breath.",
          "frequency": "Rare",
          "numberAppearing": "1d4",
          "size": "Large",
          "move": "90 ft; 180 ft flying (AA: II)",
          "armorClass": 4,
          "hitDice": 9,
          "TREASURE TYPE": "F",
          "attacks": 6,
          "damage": "1d3 / 1d3 / 1d4 / 2d6 / 3d4",
          "specialAttacks": {
            "breath": "60 ft cone of fire (3d8, save for half)"
          },
          "specialDefenses": "None",
          "magicResistance": "Standard",
          "lairProbability": "40%",
          "intelligence": "Semi-",
          "alignment": "Chaotic evil",
          "levelXP": "7/1,300+12/hp",
          "speech": "Speaks crude red dragon tongue",
          "treasure": {
            "sp": "1d20×1,000 (10%)",
            "ep": "1d12×1,000 (15%)",
            "gp": "1d10×1,000 (40%)",
            "pp": "1d8×100 (35%)",
            "gems": "3d10 (20%)",
            "jewellery": "1d10 (10%)",
            "magicItems": "3 items, 1 scroll, 1 potion (30%)"
          }
        },
        {
          "name": "Gorgimæra",
          "description": "A variant of the chimæra with a gorgon head replacing the goat’s. Capable of both fire breath and petrifying gas.",
          "frequency": "Very rare",
          "numberAppearing": "1",
          "size": "Large",
          "move": "120 ft; 150 ft flying (AA: II)",
          "armorClass": 3,
          "hitDice": "10+1",
          "TREASURE TYPE": "F",
          "attacks": 5,
          "damage": "1d3 / 1d3 / 2d4 / 1d4 / 2d4 / 3d4",
          "specialAttacks": {
            "fireBreath": "Same as chimæra",
            "gorgonBreath": "30 ft cone of petrifying gas"
          },
          "specialDefenses": "None",
          "magicResistance": "Standard",
          "lairProbability": "30%",
          "intelligence": "Semi-",
          "alignment": "Chaotic evil",
          "levelXP": "8/2,250+14/hp",
          "speech": "Same language as chimæra",
          "treasure": {
            "sp": "1d20×1,000 (20%)",
            "ep": "1d12×1,000 (25%)",
            "gp": "1d20×1,000 (50%)",
            "pp": "1d10×100 (40%)",
            "gems": "4d10 (25%)",
            "jewellery": "1d12 (15%)",
            "magicItems": "3 items, 1 scroll, 1 potion (40%)"
          }
        }
      ]
    },
    {
      "name": "Cockatrice",
      "category": "Magical Beast",
      "variants": [
        {
          "name": "Cockatrice",
          "description": "A hybrid of rooster and serpent, capable of turning creatures to stone with a mere touch. Often flies with leathery wings in search of prey to petrify.",
          "appearance": {
            "head": "Cock",
            "body": "Serpentine",
            "wings": "Functional, allows flight"
          },
          "behavior": {
            "alignment": "Neutral",
            "intelligence": "Animal",
            "habitat": "Caves, ruins, deep forests",
            "legend": "Said to be born from a cock’s egg hatched by a serpent"
          },
          "combat": {
            "attacks": 1,
            "damage": "1d3",
            "specialAttacks": {
              "petrification": {
                "trigger": "Touch",
                "effect": "Save vs petrification or turn to stone",
                "notes": "Affects astral and æthereal beings"
              }
            }
          },
          "treasure": {
            "cp": "1d10×1,000 (5%)",
            "sp": "1d12×1,000 (25%)",
            "ep": "1d6×1,000 (25%)",
            "gp": "1d8×1,000 (25%)",
            "gems": "1d12 (15%)",
            "jewellery": "1d8 (10%)",
            "magicItems": "3 items and 1 scroll (35%)"
          }
        }
      ],
      "frequency": "Uncommon",
      "numberAppearing": "1d6",
      "size": "Small",
      "move": "60 ft; 180 ft flying (AA: IV)",
      "armorClass": 6,
      "hitDice": 5,
      "TREASURE TYPE": "D",
      "attacks": 1,
      "damage": "1d3",
      "specialAttacks": "Touch petrifies",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "40%",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "levelXP": "4/170 + 4/hp"
    },
    {
      "name": "Coeurl",
      "category": "Alien Beast",
      "variants": [
        {
          "name": "Coeurl",
          "description": "Tentacle-limbed panther-like alien predators that feed on the 'id' or life force. Elusive, intelligent, and deadly. Mortal enemies of blink dogs.",
          "appearance": {
            "body": "Feline, black",
            "tentacles": "Two long, whip-like"
          },
          "behavior": {
            "alignment": "Neutral",
            "intelligence": "Average",
            "habitat": "Remote wilderness",
            "communication": "Telepathic (seldom used)",
            "enemy": "Attacks blink dogs on sight"
          },
          "combat": {
            "attacks": 2,
            "damage": "2d4 / 2d4",
            "specialDefenses": {
              "savingThrows": "Save at +6"
            }
          },
          "treasure": {
            "cp": "1d8×1,000 (15%)",
            "sp": "2d6×1,000 (20%)",
            "ep": "1d6×1,000 (5%)",
            "gp": "1d8×1,000 (35%)",
            "gems": "2d6 (15%)",
            "jewellery": "1d8 (10%)",
            "magicItems": "2 items (25%)"
          }
        }
      ],
      "frequency": "Very rare",
      "numberAppearing": "1d4",
      "size": "Large",
      "move": "150 ft",
      "armorClass": 2,
      "hitDice": "6+6",
      "TREASURE TYPE": "See treasure",
      "attacks": 2,
      "damage": "2d4 / 2d4",
      "specialAttacks": "None",
      "specialDefenses": "Save at +6",
      "magicResistance": "Standard",
      "lairProbability": "25%",
      "intelligence": "Average",
      "alignment": "Neutral",
      "levelXP": "6/400+6/hp"
    },
    {
      "name": "Coffer Corpse",
      "category": "Undead",
      "turnResistance": 7,
      "frequency": "Rare",
      "numberAppearing": "1",
      "size": "Man-sized",
      "move": "60 ft",
      "armorClass": 8,
      "hitDice": "2",
      "TREASURE TYPE": "B",
      "attacks": "1",
      "damage": "1d6 or by weapon",
      "specialAttacks": "Strangle",
      "specialDefenses": "Can only be hit by magical weapons; fakes death if struck by normal weapon for 6+ damage",
      "magicResistance": "Standard",
      "lairProbability": "80%",
      "intelligence": "Low",
      "alignment": "Chaotic evil",
      "levelXP": "2/30 + 2/hp",
      "treasure": {
        "cp": {"amount": "1d8×1,000", "chance": "50%"},
        "sp": {"amount": "1d6×1,000", "chance": "25%"},
        "ep": {"amount": "1d4×1,000", "chance": "25%"},
        "gp": {"amount": "1d3×1,000", "chance": "25%"},
        "gems": {"amount": "1d8", "chance": "30%"},
        "jewellery": {"amount": "1d4", "chance": "20%"},
        "magic_items": {"amount": 1, "chance": "10%"}
      },
      "description": "A coffer corpse resembles a zombie but can only be harmed by magic weapons. When hit for 6+ damage by normal weapons, it falls as if dead only to rise again next round, causing all witnesses to save vs. fear. When attacking bare-handed, it grabs victims by the throat (1d6 damage) and continues strangling for 1d6 damage each round without needing additional attack rolls."
    },
    {
      "name": "Couatl",
      "category": "Celestial Serpent",
      "variants": [
        {
          "name": "Couatl",
          "description": "Feathered winged serpents of great intelligence and divine purpose. Rarely intervene in mortal affairs. Treated as gods in remote tropical lands.",
          "appearance": {
            "form": "Winged serpent",
            "color": "Brightly feathered"
          },
          "behavior": {
            "alignment": "Lawful good",
            "intelligence": "Genius",
            "habitat": "Remote tropical regions",
            "abilities": ["Polymorph", "Turn æthereal", "Spellcasting"]
          },
          "combat": {
            "attacks": 2,
            "damage": "1d3 / 2d4",
            "poison": {
              "bite": "Save or die"
            },
            "constriction": {
              "effect": "2d4 damage on grab, continues each round"
            }
          },
          "spellcasting": {
            "types": {
              "mage5": "45%",
              "cleric7": "35%",
              "mage/cleric": "20%"
            }
          },
          "treasure": {
            "cp": "1d8×1,000 (50%)",
            "sp": "1d6×1,000 (25%)",
            "ep": "1d4×1,000 (25%)",
            "gp": "1d3×1,000 (25%)",
            "pp": "3d4×100 (30%)",
            "gems": "2d10 (55%)",
            "jewellery": "1d12 (50%)",
            "magicItems": "1 item (15%)"
          }
        }
      ],
      "frequency": "Very rare",
      "numberAppearing": "1d4",
      "size": "Medium",
      "move": "60 ft; 180 ft flying (AA: VI)",
      "armorClass": 5,
      "hitDice": 9,
      "TREASURE TYPE": "B, I",
      "attacks": 2,
      "damage": "1d3 / 2d4",
      "specialAttacks": "Poison, constriction, spell use",
      "specialDefenses": "Æthereal ability",
      "magicResistance": "Standard",
      "lairProbability": "10%",
      "intelligence": "Genius",
      "alignment": "Lawful good",
      "levelXP": "8/2,000+12/hp"
    },
    {
      "name": "Crabman",
      "category": "Humanoid (Aquatic)",
      "variants": [
        {
          "name": "Crabman",
          "description": "Amphibious humanoids with pincers and hard shells. Peaceful but prone to frenzied raids inland. Prized silver above all.",
          "appearance": {
            "height": "9 ft",
            "coloration": "Reddish-brown exoskeleton",
            "hands": "Replaced by pincers"
          },
          "behavior": {
            "alignment": "Neutral",
            "intelligence": "Low to average",
            "habitat": "Coastal caves and shorelines",
            "frenzy": "Occasionally form raiding parties of 30–40",
            "silverAttraction": "Will attack on sight if silver is visible"
          },
          "combat": {
            "attacks": 2,
            "damage": "1d4 / 1d4"
          },
          "treasure": {
            "sp": "3d8 per individual"
          }
        }
      ],
      "frequency": "Rare",
      "numberAppearing": "2d6",
      "size": "Large",
      "move": "90 ft; 60 ft swimming",
      "armorClass": 4,
      "hitDice": 3,
      "TREASURE TYPE": "K",
      "attacks": 2,
      "damage": "1d4 / 1d4",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "20%",
      "intelligence": "Low to average",
      "alignment": "Neutral",
      "levelXP": "2/40 + 2/hp"
    },
    {
      "name": "Crocodile",
      "category": "Animal",
      "variants": [
        {
          "type": "Normal",
          "frequency": "Common",
          "numberAppearing": "3d8",
          "size": "Large",
          "move": "60 ft; 120 ft swimming",
          "armorClass": 4,
          "hitDice": 3,
          "TREASURE TYPE": "Nil",
          "attacks": 2,
          "damage": "2d4/1d12",
          "specialAttacks": "None",
          "specialDefenses": "None",
          "levelXP": "2/50+2/hp"
        },
        {
          "type": "Giant",
          "frequency": "Rare",
          "numberAppearing": "1 to 2d6",
          "size": "Large",
          "move": "60 ft; 120 ft swimming",
          "armorClass": 3,
          "hitDice": 7,
          "TREASURE TYPE": "Nil",
          "attacks": 2,
          "damage": "3d6/2d10",
          "specialAttacks": "None",
          "specialDefenses": "None",
          "levelXP": "5/225+8/hp"
        }
      ],
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "treasure": "None",
      "description": "Crocodiles may be found in shallow fresh or salt water. They surprise on 1-3 on d6, lurking concealed before attacking prey. They eat almost anything within reach. Cold is their weakness, halving their movement speed. Giant crocodiles are typically found in prehistoric or saltwater environments and are even more fearsome opponents."
    },
    {
      "name": "Crypt Thing",
      "category": "Undead-like (not truly undead)",
      "variants": [
        {
          "name": "Crypt Thing",
          "description": "Lurking skeletal guardians that teleport attackers to random locations when disturbed. Immune to turning despite their appearance.",
          "appearance": {
            "form": "Cloaked skeleton",
            "note": "Not truly undead"
          },
          "behavior": {
            "alignment": "Neutral",
            "intelligence": "Very",
            "habitat": "Underground lairs",
            "reaction": "Does not attack unless first attacked",
            "speech": "Speaks Common"
          },
          "combat": {
            "attacks": 1,
            "damage": "1d8 (claw)",
            "teleport": {
              "trigger": "When attacked",
              "effect": "Save vs spell or be teleported 100–1,000 ft or 1 dungeon level up/down",
              "roll": "d% determines direction",
              "safe": "Never teleports into solid objects"
            }
          },
          "specialDefenses": {
            "immunity": "Immune to non-magical weapons, cannot be turned"
          },
          "treasure": {
            "cp": "1d3×1,000 (20%)",
            "sp": "1d4×1,000 (25%)",
            "ep": "1d4×1,000 (25%)",
            "gp": "1d4×1,000 (30%)",
            "pp": "1d6×100 (30%)",
            "gems": "10d6 (55%)",
            "jewellery": "5d6 (50%)",
            "magicItems": "3 items (50%)"
          }
        }
      ],
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Man-sized",
      "move": "120 ft",
      "armorClass": 3,
      "hitDice": 6,
      "TREASURE TYPE": "Z",
      "attacks": 1,
      "damage": "1d8",
      "specialAttacks": "Teleport attackers (see rules)",
      "specialDefenses": "Immune to non-magical weapons and turning",
      "magicResistance": "Standard",
      "lairProbability": "100%",
      "intelligence": "Very",
      "alignment": "Neutral",
      "levelXP": "4/160 + 4/hp"
    },
    {
      "name": "Crustacean, Giant",
      "category": "Animal",
      "variants": [
        {
          "type": "Crab",
          "frequency": "Rare",
          "numberAppearing": "2d6",
          "size": "Large",
          "move": "90 ft",
          "armorClass": 3,
          "hitDice": 3,
          "TREASURE TYPE": "Nil",
          "attacks": 2,
          "damage": "2d4/2d4",
          "specialAttacks": "None",
          "specialDefenses": "None",
          "levelXP": "3/75+3/hp"
        },
        {
          "type": "Crayfish",
          "frequency": "Uncommon",
          "numberAppearing": "2d6",
          "size": "Large",
          "move": "60 ft; 120 ft swimming",
          "armorClass": 4,
          "hitDice": "4+4",
          "TREASURE TYPE": "Nil",
          "attacks": 2,
          "damage": "2d6/2d6",
          "specialAttacks": "None",
          "specialDefenses": "None",
          "levelXP": "3/110+4/hp"
        }
      ],
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "treasure": "None",
      "description": "Giant crabs are found near fresh or salt water and surprise on 1-4 on 1d6. They typically rush prey from concealment, using their eyestalks to scout the area. Giant crayfish inhabit freshwater environments and surprise on 1-3 on 1d6, but lack the eyestalks that give crabs their superior surprise capability."
    },
    {
      "name": "Cyclops",
      "category": "Giants",
      "name_variants": "",
      "frequency": "Very rare",
      "numberAppearing": "1d2",
      "size": "Large (20 ft)",
      "move": "150 ft",
      "armorClass": 2,
      "hitDice": 13,
      "TREASURE TYPE": "F",
      "attacks": 1,
      "damage": "6d6 or 4d10",
      "specialAttacks": "Rock throwing",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "80%",
      "intelligence": "Low",
      "alignment": "Chaotic evil",
      "levelXP": "7/3,300 + 17/hp",
      "description": "Cyclopes are extremely tall, ugly humanoids, each with a single eye centred under its slightly drooping brow. These oafish, antisocial creatures prefer to inhabit lonesome environs, such as out-of-the-way, otherwise deserted islands.",
      "specialAbilities": {
        "rockThrowing": {
          "range": "60 ft",
          "damage": ""
        }
      },
      "treasure": {
        "cp": {"amount": "1d10×1,000", "chance": "5%"},
        "sp": {"amount": "1d12×1,000", "chance": "25%"},
        "ep": {"amount": "1d6×1,000", "chance": "25%"},
        "gp": {"amount": "1d8×1,000", "chance": "25%"},
        "gems": {"amount": "1d12", "chance": "15%"},
        "jewellery": {"amount": "1d8", "chance": "10%"},
        "magic_items": {"amount": 3, "chance": "25%"},
        "potions": {"amount": "2d8", "chance": "40%"},
        "scrolls": {"amount": 1, "chance": "40%"}
      }
    },
    {
      "name": "Dakon",
      "category": "Humanoid (Ape)",
      "variants": [
        {
          "name": "Dakon",
          "description": "Intelligent, peaceful ape-like beings resembling gorillas with light brown fur, green eyes, and black hands. Known for their strength, wisdom, and lawful behavior.",
          "appearance": {
            "size": "Man-sized",
            "color": "Light brown with green eyes and black hands"
          },
          "behavior": {
            "alignment": "Lawful neutral",
            "intelligence": "Average",
            "habitat": "Forests or hills, avoid water bodies",
            "language": "Common tongue",
            "relationships": {
              "allies": ["Lawful humans", "Demi-humans"],
              "enemies": ["Humanoids (distrusted)"]
            },
            "combatTactics": "Avoids combat unless defending or recovering stolen treasure",
            "toHitBonus": "+2 due to strength and sharp claws"
          },
          "combat": {
            "attacks": 2,
            "damage": "1d10 / 1d10"
          },
          "treasure": {
            "cp": "2d6×1,000 (5%)",
            "sp": "2d6×1,000 (30%)",
            "ep": "1d4×1,000 (20%)",
            "gp": "1d10×1,000 (45%)",
            "pp": "1d10×100 (40%)",
            "gems": "3d12 (25%)",
            "jewellery": "1d10 (10%)",
            "magicItems": "Any 3 maps or magic items + 1 scroll (35%)"
          }
        }
      ],
      "frequency": "Uncommon",
      "numberAppearing": "6d10",
      "size": "Man-sized",
      "move": "60 ft",
      "armorClass": 5,
      "hitDice": "1+1",
      "TREASURE TYPE": "E",
      "attacks": 2,
      "damage": "1d10 / 1d10",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "50%",
      "intelligence": "Average",
      "alignment": "Lawful neutral",
      "levelXP": "2/25 + 2/hp"
    },
    {
      "name": "Dark Creeper",
      "category": "Humanoid (Shadow Folk)",
      "variants": [
        {
          "name": "Dark Creeper",
          "description": "Short, pale humanoids wrapped in dark robes. They despise light and hoard magic items, using stealth and magical darkness to ambush and steal.",
          "appearance": {
            "height": "4 ft",
            "clothing": "Loose, layered dark robes exposing only hands and glowing eyes"
          },
          "behavior": {
            "alignment": "Chaotic neutral",
            "intelligence": "Average",
            "skills": "Acts as a 4th-level thief",
            "abilities": [
              "Detect magic (3×/day)",
              "Create darkness (3×/day, 50 ft radius, 1 hour duration)"
            ],
            "tactics": "Extinguishes light sources and steals magic items",
            "deathEffect": "Explodes in green/purple flames (metal items 80% survive)"
          },
          "combat": {
            "attacks": 1,
            "damage": "1d4 (dagger)",
            "armorClass": {
              "inDarkness": 0,
              "inLight": 8
            },
            "equipmentUse": "Will use magic daggers/rings"
          },
          "treasure": "See individual and lair table in source text"
        },
        {
          "name": "Dark Stalker",
          "description": "Leaders of the dark creeper clans, taller and more powerful, with similar darkness-based powers and the ability to cast wall of fog.",
          "appearance": {
            "size": "Man-sized",
            "garb": "Same layered dark robes as creepers"
          },
          "behavior": {
            "alignment": "Chaotic neutral",
            "intelligence": "Average",
            "leadership": "Commands dark creeper clans",
            "abilities": [
              "All creeper abilities",
              "Wall of fog (2×/day)",
              "Fireball death burst (3d8 damage)"
            ]
          },
          "combat": {
            "attacks": 1,
            "damage": "1d6 (short sword)",
            "armorClass": {
              "inDarkness": 0,
              "inLight": 8
            },
            "equipmentUse": "May carry magic weapons or rings"
          },
          "treasure": "See individual treasure table; magic items 75% survival on death"
        }
      ],
      "frequency": {
        "Dark Creeper": "Rare",
        "Dark Stalker": "Very rare"
      },
      "numberAppearing": {
        "Dark Creeper": "1 or 20d4",
        "Dark Stalker": "1"
      },
      "size": {
        "Dark Creeper": "Small",
        "Dark Stalker": "Man-sized"
      },
      "move": "90 ft",
      "armorClass": "0 (in darkness) / 8 (in light)",
      "hitDice": {
        "Dark Creeper": "1+1",
        "Dark Stalker": "2+1"
      },
      "attacks": 1,
      "specialAttacks": "Darkness, stealth, magical fire death",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "20%",
      "intelligence": "Average",
      "alignment": "Chaotic neutral",
      "levelXP": {
        "Dark Creeper": "3/50 + 2/hp",
        "Dark Stalker": "4/200 + 3/hp"
      }
    },
    {
      "name": "Disenchanter",
      "category": "Magical Beast",
      "variants": [
        {
          "name": "Disenchanter",
          "description": "A strange, blue, translucent creature resembling a camel-cow hybrid with a magical snout used to drain enchantments from magical items.",
          "appearance": {
            "form": "Electric blue dromedary/cow-like beast",
            "notableFeature": "Prehensile snout, can extend 5 ft"
          },
          "behavior": {
            "alignment": "Neutral",
            "intelligence": "Average",
            "habitat": "Rarely known, appears only to feed on magic",
            "ecology": "Feeds exclusively on magic dweomers"
          },
          "combat": {
            "attacks": 1,
            "damage": "None",
            "specialEffect": "Disenchants one magic item per hit (except artifacts)",
            "snout": {
              "range": "5 ft",
              "function": "Drains enchantment, renders item inert"
            }
          },
          "specialDefenses": "Can only be hit by magical weapons",
          "magicResistance": "Standard",
          "treasure": "None"
        }
      ],
      "frequency": "Very rare",
      "numberAppearing": "1d2",
      "size": "Medium (5 ft at shoulder)",
      "move": "120 ft",
      "armorClass": 5,
      "hitDice": 5,
      "TREASURE TYPE": "Nil",
      "attacks": 1,
      "damage": "None (see disenchanting effect)",
      "specialAttacks": "Disenchants magical items",
      "specialDefenses": "Only hit by magical weapons",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Average",
      "alignment": "Neutral",
      "levelXP": "4/225 + 5/hp"
    },
    {
      "name": "Demon, Babau",
      "category": "Demons",
      "name_variants": "Horned Demon, Bone Demon",
      "frequency": "Uncommon",
      "numberAppearing": "1d3 or 1d6 (in the Abyss)",
      "size": "Man-sized (7 ft)",
      "move": "150 ft",
      "armorClass": -3,
      "hitDice": "7+14",
      "TREASURE TYPE": "C",
      "attacks": "2 claws/1 bite or 1 weapon",
      "damage": "1d4+1/1d4+1/2d4 or by weapon +7",
      "specialAttacks": "Thief abilities, magical abilities, eye gaze",
      "specialDefenses": "Immune to normal weapons, ichor protection",
      "magicResistance": "50%",
      "lairProbability": "20%",
      "intelligence": "Very",
      "alignment": "Chaotic evil",
      "levelXP": "8/2,000+ 12/hp",
      "description": "Babau are skeletal demons covered in leathery black skin. Their feet, taloned hands and head are grossly oversized, nearly the same as a hill giant's. From the base of the skull protrudes a hooked horn.",
      "specialAbilities": {
        "strength": 19,
        "ichor": "Secretes slimy rust colored ichor that halves damage from melee weapons",
        "darkness": "Can cause darkness at will (5 ft radius)",
        "thiefAbilities": "Equal to a 9th level thief",
        "spellLikeAbilities": {
          "atWill": [
            "Fear (touch only, otherwise as 4th level magic user spell)",
            "Levitate (as 2nd level magic user spell)",
            "Fly (as 3rd level magic user spell)",
            "Dispel magic (as 3rd level magic user spell)",
            "Polymorph self (as 4th level magic user spell)",
            "Heat metal (as 2nd level druid spell)"
          ],
          "gateBabau": "25% chance of success"
        },
        "eyeGaze": "Ray of enfeeblement (as 2nd level magic user spell) to anyone within 20 feet who fails save vs spells",
        "weaponVulnerability": "Iron weapons inflict +2 damage"
      },
      "treasure": {
        "cp": {"amount": "1d12×1000", "chance": "20%"},
        "sp": {"amount": "1d6×1000", "chance": "30%"},
        "ep": {"amount": "1d4×1000", "chance": "10%"},
        "gems": {"amount": "1d6", "chance": "25%"},
        "jewellery": {"amount": "1d3", "chance": "20%"},
        "magic_items": {"amount": "1d2", "chance": "10%"}
      }
    },
    {
      "name": "Demon, Vrock",
      "category": "Demons",
      "name_variants": "Class A Demon",
      "frequency": "Common",
      "numberAppearing": "1d3 or 1d6 (in the Abyss)",
      "size": "Large",
      "move": "120 ft; 180 ft flying (AA:IV)",
      "armorClass": 0,
      "hitDice": 8,
      "TREASURE TYPE": "B",
      "attacks": "2 talons/2 claws/1 bite",
      "damage": "1d4/1d4/1d8/1d8/1d6",
      "specialAttacks": "Multiple attacks",
      "specialDefenses": "None",
      "magicResistance": "50%",
      "lairProbability": "5%",
      "intelligence": "Low",
      "alignment": "Chaotic evil",
      "levelXP": "7/1,275 +10/hp",
      "description": "Vrock, considered one of the weakest of demonkind, look like a hideous cross between a vulture and a humanoid.",
      "specialAbilities": {
        "darkness": "Can cause darkness at will (5 ft radius)",
        "spellLikeAbilities": {
          "atWill": [
            "Detect invisibility (objects only, otherwise as 2nd level magic user spell)",
            "Telekinesis (as 5th level magic user spell, up to 200 lbs)"
          ],
          "gateVrock": "10% chance of success"
        }
      },
      "motivation": "Love the sight of precious gems and jewellery, and enjoy feasting on the flesh of men",
      "treasure": {
        "cp": {"amount": "1d8×1,000", "chance": "50%"},
        "sp": {"amount": "1d6×1,000", "chance": "25%"},
        "ep": {"amount": "1d4×1,000", "chance": "25%"},
        "gp": {"amount": "1d3×1,000", "chance": "25%"},
        "gems": {"amount": "1d8", "chance": "30%"},
        "jewellery": {"amount": "1d4", "chance": "20%"},
        "magic_weapons": {"amount": 1, "chance": "10%"}
      }
    },
    {
      "name": "Demon, Hezrou",
      "category": "Demons",
      "name_variants": "Class B Demon",
      "frequency": "Common",
      "numberAppearing": "1d3 or 1d6 (in the Abyss)",
      "size": "Large",
      "move": "60 ft; 120 ft hopping",
      "armorClass": -2,
      "hitDice": 9,
      "TREASURE TYPE": "C",
      "attacks": "2 claws/1 bite",
      "damage": "1d3/1d3/4d4",
      "specialAttacks": "Multiple attacks",
      "specialDefenses": "None",
      "magicResistance": "55%",
      "lairProbability": "10%",
      "intelligence": "Low",
      "alignment": "Chaotic evil",
      "levelXP": "8/2,000 + 12/hp",
      "description": "Slightly shorter than the vrock, hezrou resemble loathsome toads with humanoid arms.",
      "specialAbilities": {
        "darkness": "Can cause darkness at will (15 ft radius)",
        "spellLikeAbilities": {
          "atWill": [
            "Cause fear (as 4th level magic user spell)",
            "Levitate (as 2nd level magic user spell)",
            "Detect invisibility (objects only, otherwise as 2nd level magic user spell)",
            "Telekinesis (as 5th level magic user spell, up to 300 lbs)"
          ],
          "gateHezrou": "20% chance of success"
        }
      },
      "motivation": "Share a love of human flesh with vrock, will gladly fight vrock",
      "treasure": {
        "cp": {"amount": "1d12×1,000", "chance": "20%"},
        "sp": {"amount": "1d6×1,000", "chance": "30%"},
        "ep": {"amount": "1d4×1,000", "chance": "10%"},
        "gems": {"amount": "1d6", "chance": "25%"},
        "jewellery": {"amount": "1d3", "chance": "20%"},
        "magic_items": {"amount": "1d2", "chance": "10%"}
      }
    },
    {
      "name": "Demon, Glabrezu",
      "category": "Demons",
      "name_variants": "Class C Demon",
      "frequency": "Uncommon",
      "numberAppearing": "1d3 or 1d6 (in the Abyss)",
      "size": "Large",
      "move": "90 ft",
      "armorClass": -4,
      "hitDice": 10,
      "TREASURE TYPE": "D",
      "attacks": "2 pincers/2 claws/1 bite",
      "damage": "2d6/2d6/1d3/1d3/1d4+1",
      "specialAttacks": "Multiple attacks",
      "specialDefenses": "None",
      "magicResistance": "60%",
      "lairProbability": "15%",
      "intelligence": "Average",
      "alignment": "Chaotic evil",
      "levelXP": "8/2,400 + 14/hp",
      "description": "These muscular demons have a head like a horned dog, and from their broad chest sprouts four arms: 2 with sharp pincers and 2 with hands.",
      "specialAbilities": {
        "darkness": "Can cause darkness at will (10 ft radius)",
        "spellLikeAbilities": {
          "atWill": [
            "Cause fear (as 4th level magic user spell)",
            "Levitate (as 2nd level magic user spell)",
            "Pyrotechnics (as 2nd level magic user spell)",
            "Polymorph self (as 4th level magic user spell)",
            "Telekinesis (as 5th level magic user spell, up to 400 lbs)"
          ],
          "gateDemon": "30% chance of success for Class A to C demon"
        }
      },
      "treasure": {
        "cp": {"amount": "1d8×1,000", "chance": "10%"},
        "sp": {"amount": "1d12×1,000", "chance": "15%"},
        "ep": {"amount": "1d8×1,000", "chance": "15%"},
        "gp": {"amount": "1d6×1,000", "chance": "50%"},
        "gems": {"amount": "1d10", "chance": "30%"},
        "jewellery": {"amount": "1d6", "chance": "25%"},
        "magic_items": {"amount": 3, "chance": "15%"},
        "potions": {"amount": 1, "chance": "15%"}
      }
    },
    {
      "name": "Demon, Nalfeshnee",
      "category": "Demons",
      "name_variants": "Class D Demon",
      "frequency": "Uncommon",
      "numberAppearing": "1d3 or 1d6 (in the Abyss)",
      "size": "Large",
      "move": "90 ft; 120 ft flying (AA:II)",
      "armorClass": -1,
      "hitDice": 11,
      "TREASURE TYPE": "E",
      "attacks": "1 claw/1 bite",
      "damage": "1d4/2d4",
      "specialAttacks": "+2 to hit",
      "specialDefenses": "+1 or better magic weapon to hit",
      "magicResistance": "65%",
      "lairProbability": "15%",
      "intelligence": "Very",
      "alignment": "Chaotic evil",
      "levelXP": "9/3,000 + 16/hp",
      "description": "Particularly malevolent demons, the class D have the upper body of an ape and the cloven-hoofed lower body of a boar. They have rather small feathered wings as well, which seem undersized compared to their corpulent bodies.",
      "specialAbilities": {
        "darkness": "Can cause darkness at will (10 ft radius)",
        "spellLikeAbilities": {
          "atWill": [
            "Improved phantasmal force (as 2nd level illusionist spell)",
            "Fear (as 4th level magic user spell)",
            "Levitate (as 2nd level magic user spell)",
            "Detect magic (as 1st level magic user spell)",
            "Comprehend languages (as 1st level magic user spell)",
            "Dispel magic (as 3rd level magic user spell)",
            "Polymorph self (as 4th level magic user spell)",
            "Telekinesis (as 5th level magic user spell, up to 500 lbs)",
            "Project image (as 6th level magic user spell)",
            "Symbol of fear or discord (as 8th level magic user spell)"
          ],
          "gateDemon": "60% chance of success for random Class A to D demon"
        },
        "secretName": "90% certain to answer a summons if secret name is spoken"
      },
      "motivation": "Particularly enjoy feasting on human blood and meat",
      "treasure": {
        "cp": {"amount": "1d10×1,000", "chance": "5%"},
        "sp": {"amount": "1d12×1,000", "chance": "15%"},
        "ep": {"amount": "1d6×1,000", "chance": "25%"},
        "gp": {"amount": "1d8×1,000", "chance": "25%"},
        "gems": {"amount": "1d12", "chance": "15%"},
        "jewellery": {"amount": "1d8", "chance": "10%"},
        "magic_items": {"amount": 3, "chance": "25%"},
        "scrolls": {"amount": 1, "chance": "25%"}
      }
    },
    {
      "name": "Demon, Marilith",
      "category": "Demons",
      "name_variants": "Class E Demon",
      "frequency": "Rare",
      "numberAppearing": "1d3 or 1d6 (in the Abyss)",
      "size": "Large",
      "move": "120 ft",
      "armorClass": -7,
      "hitDice": "7+7",
      "TREASURE TYPE": "G",
      "attacks": "6 arms/1 constriction",
      "damage": "2d4 (x6)/1d6",
      "specialAttacks": "Multiple weapon attacks, constriction",
      "specialDefenses": "+1 or better magic weapon to hit",
      "magicResistance": "80%",
      "lairProbability": "10%",
      "intelligence": "High",
      "alignment": "Chaotic evil",
      "levelXP": "9/3,000 + 12/hp",
      "description": "Infamous even among demonkind for their cruel and ill-tempered nature, the marilith are invariably female. From the waist up they appear to be a full-figured human female with six arms and skin tones ranging from deep violet to a putrescent green. Below the waist however, they have the coiling body of a large serpent.",
      "specialAbilities": {
        "darkness": "Can cause darkness at will (5 ft radius)",
        "spellLikeAbilities": {
          "atWill": [
            "Charm person (as 1st level magic user spell)",
            "Levitate (as 2nd level magic user spell)",
            "Comprehend languages (as 1st level magic user spell)",
            "Detect invisibility (objects only, otherwise as 2nd level magic user spell)",
            "Pyrotechnics (as 2nd level magic user spell)",
            "Polymorph self (as 4th level magic user spell)",
            "Project image (as 6th level magic user spell)"
          ],
          "gateDemon": {
            "chance": "50% chance of success",
            "summoned": {
              "1-30": "Class A",
              "31-55": "Class B",
              "56-70": "Class C",
              "71-85": "Class D",
              "86-00": "Class F"
            }
          }
        },
        "secretName": "Can be used to summon and bargain with them"
      },
      "combat": "In melee they prefer to wield a variety of barbed and hooked swords and battle axes or simply constrict their prey with their powerful serpentine tail",
      "motivation": "Reportedly prefer the sacrifice of powerful male warriors as payment",
      "treasure": {
        "gp": {"amount": "10d4×1000", "chance": "50%"},
        "pp": {"amount": "1d20×100", "chance": "50%"},
        "gems": {"amount": "5d4", "chance": "30%"},
        "jewellery": {"amount": "1d10", "chance": "10%"},
        "magic_items": {"amount": 4, "chance": "35%"},
        "scrolls": {"amount": 1, "chance": "35%"}
      }
    },
    {
      "name": "Demon, Balor",
      "category": "Demons",
      "name_variants": "Class F Demon",
      "frequency": "Rare",
      "numberAppearing": "1d3 or 1d6 (in the Abyss)",
      "size": "Large",
      "move": "60 ft; 150 ft flying (AA:III)",
      "armorClass": -2,
      "hitDice": "8+8",
      "TREASURE TYPE": "F",
      "attacks": "1 bite",
      "damage": "1d12+1",
      "specialAttacks": "Flaming whip (3d6)",
      "specialDefenses": "+1 or better magic weapon to hit",
      "magicResistance": "75%",
      "lairProbability": "20%",
      "intelligence": "High",
      "alignment": "Chaotic evil",
      "levelXP": "9/3,600 + 12/hp",
      "description": "Reportedly only six of this class of demon exist, each with their own secret name.",
      "specialAbilities": {
        "darkness": "Can cause darkness at will (10 ft radius)",
        "spellLikeAbilities": {
          "atWill": [
            "Fear (as 4th level magic user spell)",
            "Detect magic (as 1st level magic user spell)",
            "Read magic (as 1st level magic user spell)",
            "Comprehend languages (as 1st level magic user spell)",
            "Detect invisibility (objects only, otherwise as 2nd level magic user spell)",
            "Pyrotechnics (as 2nd level magic user spell)",
            "Dispel magic (as 3rd level magic user spell)",
            "Suggestion (as 3rd level magic user spell)",
            "Telekinesis (as 5th level magic user spell, up to 600 lbs)",
            "Symbol of fear, discord, sleep, or stunning (as 8th level magic user spell)"
          ],
          "gateDemon": {
            "chance": "70% chance of success",
            "summoned": {
              "1-80": "Class C",
              "81-100": "Class D"
            }
          }
        }
      },
      "combat": {
        "weapons": "Wield massive +1 swords and a cat-o-nine-tails whip",
        "whipUse": "4 in 6 chance per round",
        "whipEffect": "Victims failing save vs spells are burnt by flames for 4d6 additional damage",
        "immolation": "Continually immolate themselves in flames"
      },
      "leadership": {
        "charismaticEvil": "Many other chaotic evil monsters and demons are attracted to their aura",
        "desireToDominate": "Always try to bully and intimidate their masters in an effort to usurp leadership"
      },
      "treasure": {
        "sp": {"amount": "1d20×1,000", "chance": "10%"},
        "ep": {"amount": "1d12×1,000", "chance": "15%"},
        "gp": {"amount": "1d10×1,000", "chance": "40%"},
        "pp": {"amount": "1d8×100", "chance": "35%"},
        "gems": {"amount": "3d10", "chance": "20%"},
        "jewellery": {"amount": "1d10", "chance": "10%"},
        "potions": {"amount": 1, "chance": "30%"},
        "scrolls": {"amount": 1, "chance": "30%"},
        "magic_items": {"amount": 3, "chance": "30%", "note": "no weapons"}
      }
    },
    {
      "name": "Demon, Demonette",
      "category": "Demons",
      "name_variants": "",
      "frequency": "Rare",
      "numberAppearing": 1,
      "size": "Man-sized",
      "move": "120 ft; 120 ft flying (AA:IV)",
      "armorClass": 5,
      "hitDice": "6+1d6",
      "TREASURE TYPE": "See treasure",
      "attacks": 1,
      "damage": "By weapon type + strength bonus",
      "specialAttacks": "Life energy drain, spellcasting",
      "specialDefenses": "Iron or +1 or better weapon to hit",
      "magicResistance": "30%",
      "lairProbability": "15%",
      "intelligence": "Very to genius",
      "alignment": "Chaotic evil",
      "levelXP": "9/4,050 +14/hp",
      "description": "Demonettes are the result of union between a succubus and a human male. Their individual appearances vary, but their vestigial horns and small leathery bat-like wings denote their demonic heritage.",
      "specialAbilities": {
        "spellLikeAbilities": {
          "threeDailyUses": [
            "Charm person (as 1st level magic user spell)",
            "ESP (as 2nd level magic user spell)",
            "Polymorph self (humanoid shapes only, otherwise as 4th level magic user spell)",
            "Suggestion (as 3rd level magic user spell)"
          ],
          "onceDaily": "Dimension door (as 4th level magic user spell)"
        },
        "spellcasting": "25% have genius intelligence and can cast spells as a 1d12 level magic user",
        "lifeEnergyDrain": {
          "touch": "Drains 1d8 hit points from victim and adds 1d4 hit points to the demonette"
        },
        "infravision": "120 ft range"
      },
      "armor": {
        "naturalAC": 5,
        "magicalArmor": "Only adds bonus unless superior to AC 5"
      },
      "alignment": {
        "chaoticEvil": "80%",
        "lessDemoniacal": "20%, but never lawful or good"
      },
      "treasure": {
        "scrolls": {"amount": "1d4", "chance": "50%"},
        "potions": {"amount": "2d4", "chance": "40%"},
        "gems": {"amount": "1d8×10", "chance": "90%"},
        "jewellery": {"amount": "5d6", "chance": "80%"},
        "magic_items": {"amount": "1d6", "chance": "70%", "note": "excluding potions and scrolls"}
      }
    },
    {
      "name": "Demon, Demoniac",
      "category": "Demons",
      "name_variants": "",
      "frequency": "Very rare",
      "numberAppearing": 1,
      "size": "Man-sized to Large",
      "move": "150 ft",
      "armorClass": 6,
      "hitDice": "5 to 8 (1d4+4)",
      "TREASURE TYPE": "See treasure",
      "attacks": 2,
      "damage": "By weapon type + strength bonus",
      "specialAttacks": "Depends on class abilities",
      "specialDefenses": "Invulnerable to silver weapons",
      "magicResistance": "5%-20%",
      "lairProbability": "See description",
      "intelligence": "Low to exceptional",
      "alignment": "Chaotic evil",
      "levelXP": "7/1,275 +10/hp",
      "description": "Demoniacs are the result of a mating between a major demon and a human female. As such, each is slightly different depending upon parentage. Generally, demoniacs are strong and heavily-built. They will usually have several other demonic characteristics as well, such as vestigial horns, barbs, or scaled skin.",
      "specialAbilities": {
        "infravision": "Standard",
        "demonCommunication": "Able to communicate with demons",
        "weaponResistances": {
          "silver": "Invulnerable to silver weapons",
          "iron": "Takes double damage from iron weapons"
        },
        "abilityScores": {
          "strength": "1d3+16",
          "dexterity": "1d8+12",
          "intelligence": "1d8+8",
          "wisdom": "3d6"
        },
        "classes": {
          "cleric": "Maximum level equal to hit dice",
          "magicUser": "Maximum 5th level",
          "thief": "Maximum level equal to hit dice",
          "assassin": "Maximum level equal to hit dice"
        }
      },
      "armor": {
        "naturalAC": 6,
        "magicalArmor": "Only adds bonus unless superior to AC 6"
      },
      "treasure": {
        "scrolls": {"amount": "1d4", "chance": "50%"},
        "potions": {"amount": "2d4", "chance": "40%"},
        "gems": {"amount": "1d8×10", "chance": "90%"},
        "jewellery": {"amount": "5d6", "chance": "80%"},
        "magic_items": {"amount": "1d6", "chance": "70%", "note": "excluding potions and scrolls"}
      },
    },
    {
      "name": "Demon, Dretch",
      "category": "Demons",
      "name_variants": "",
      "frequency": "Common",
      "numberAppearing": "2d4 or 5d4 (in the Abyss)",
      "size": "Small",
      "move": "90 ft",
      "armorClass": 2,
      "hitDice": 4,
      "TREASURE TYPE": "J, K, L, M",
      "attacks": "2 claws/1 bite",
      "damage": "1d4/1d4/1d4+1",
      "specialAttacks": "Special abilities",
      "specialDefenses": "None",
      "magicResistance": "30%",
      "lairProbability": "15%",
      "intelligence": "Low",
      "alignment": "Chaotic evil",
      "levelXP": "4/175+4/hp",
      "description": "Dretch are the weakest of all demonkind. Their appearance is almost comical, with a plump body with thin, gangly arms and legs. Their squat heads are bald and they have a slobbering, stupid visage.",
      "specialAbilities": {
        "spellLikeAbilities": {
          "atWill": [
            "Darkness (5 ft radius)",
            "Scare (as 2nd level magic user spell)",
            "Telekinesis (as 5th level magic user spell, up to 50 lbs)"
          ],
          "onceDaily": [
            "Stinking cloud (as 2nd level magic user spell)",
            "Teleport without fail (as 5th level magic user spell, no chance of error)"
          ],
          "gateDemon": "15% chance of success for a class A demon"
        }
      },
      "combat": "Usually attack in hordes, using tooth and claw in blind abandon",
      "treasure": {
        "individual": {
          "cp": {"amount": "3d8", "chance": "100%"},
          "sp": {"amount": "3d6", "chance": "100%"},
          "ep": {"amount": "2d6", "chance": "100%"},
          "gp": {"amount": "2d4", "chance": "100%"}
        }
      }
    },
    {
      "name": "Demon, Ekivu",
      "category": "Demons",
      "name_variants": "Chasme, Fly Demon",
      "frequency": "Common",
      "numberAppearing": "1d3 or 1d6 (in the Abyss)",
      "size": "Medium",
      "move": "50 ft; 210 ft flying (AA:III)",
      "armorClass": -1,
      "hitDice": "7+2",
      "TREASURE TYPE": "B",
      "attacks": "2 claws/1 bite",
      "damage": "2d4/2d4/1d4",
      "specialAttacks": "Buzzing drone",
      "specialDefenses": "Invulnerable to poison",
      "magicResistance": "40%",
      "lairProbability": "5%",
      "intelligence": "Average",
      "alignment": "Chaotic evil",
      "levelXP": "7/1,275 +10/hp",
      "description": "Ekivu resemble a hideous crossbreed between a giant fly and a human. Their hindlegs are insect-like and their forelimbs resemble human arms, but with bony, sharp claws. Like flies, their bodies are covered in blueish-black chitin with bristling hair. Their heads are vaguely human, but with bulbous, faceted eyes like those of a fly. Their mouths are ringed with sharp teeth and their long noses are actually a sharp proboscis for drawing blood from their victims.",
      "specialAbilities": {
        "darkness": "Can cause darkness at will (5 ft radius)",
        "spellLikeAbilities": {
          "atWill": [
            "Detect good (as 1st level cleric spell)",
            "Detect invisibility (as 2nd level magic user spell)",
            "Telekinesis (as 5th level magic user spell, up to 150 lbs)",
            "Fear (touch only, otherwise as 4th level magic user spell)"
          ],
          "gateEkivu": "15% chance of success"
        },
        "buzzingDrone": {
          "effect": "Lulls listeners into comatose state unless save vs spells",
          "duration": "2d4 hours or until 1d4 hp of blood is drawn"
        },
        "resistances": {
          "poison": "Invulnerable to all forms of poison"
        }
      },
      "relationships": {
        "hatred": "Long standing hatred of most other classes of demons, especially classes A and B",
        "enslavedShub": "Have managed to enslave a number of shub"
      },
      "treasure": {
        "cp": {"amount": "1d8×1,000", "chance": "50%"},
        "sp": {"amount": "1d6×1,000", "chance": "25%"},
        "ep": {"amount": "1d4×1,000", "chance": "25%"},
        "gp": {"amount": "1d3×1000", "chance": "25%"},
        "gems": {"amount": "1d8", "chance": "30%"},
        "jewellery": {"amount": "1d4", "chance": "20%"},
        "magic_weapons": {"amount": 1, "chance": "10%"}
      }
    },
    {
      "name": "Demon Lord",
      "category": "Demons",
      "name_variants": "Demon Prince, Demon, prince",
      "description": "The demon lords and princes are the rulers of the Abyss. Each commands one or more of the 666 layers. They are of godlike power. Select one: Demogorgon (AC -8, 200 hp, MR 95%), Orcus (AC -6, 120 hp, MR 85%), Juiblex (AC -7, 88 hp, MR 65%), Yeenoghu (AC -5, 100 hp, MR 80%), and others at DM's discretion. Stats below use Orcus as default.",
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Large",
      "move": "90 ft; 180 ft flying",
      "armorClass": -6,
      "hitDice": "120 hp",
      "TREASURE TYPE": "H, S, T",
      "attacks": "2 (weapon or fists) + tail",
      "damage": "By weapon or 1d4+6/1d4+6/2d4 (tail: poison)",
      "specialAttacks": "At-will spell-like abilities; gate demons; unique powers per individual",
      "specialDefenses": "+2 or better weapon to hit",
      "magicResistance": "85%",
      "lairProbability": "75%",
      "intelligence": "Genius to Supra-genius",
      "alignment": "Chaotic evil",
      "levelXP": "Special"
    },
    {
      "name": "Devil, Lemure",
      "category": "Devils",
      "name_variants": "Lemure",
      "frequency": "Common",
      "numberAppearing": "5d6",
      "size": "Medium",
      "move": "30 ft",
      "armorClass": 7,
      "hitDice": 3,
      "TREASURE TYPE": "Nil",
      "attacks": "1 claw",
      "damage": "1d3",
      "specialAttacks": "Nil",
      "specialDefenses": "Regenerate 1 hp/round; permanently destroyed only by blessed things (holy water, holy swords, etc.); immune to sleep, charm",
      "magicResistance": "Standard",
      "lairProbability": "100%",
      "intelligence": "Semi-",
      "alignment": "Lawful evil",
      "levelXP": "3/65+3/hp",
      "description": "Lemures are the form which the dead who inhabit the Nine Hells are put in. These vaguely human blobs are tormented by devils. Their minds are quite gone, and they will attack anything non-devilish which they see. They regenerate at 1 hp per round. After being in Hell for a time certain lemures will be chosen to form wraiths or spectres."
    },
    {
      "name": "Devil, Erinyes",
      "category": "Devils",
      "name_variants": "Erinyes",
      "frequency": "Uncommon",
      "numberAppearing": "1d3 or 4d4",
      "size": "Medium (6' tall)",
      "move": "60 ft; 210 ft flying (AA:I)",
      "armorClass": 2,
      "hitDice": "6+6",
      "TREASURE TYPE": "R",
      "attacks": "1 dagger",
      "damage": "2d4 (poison)",
      "specialAttacks": "Poisoned dagger (save vs poison or faint 1d6 rounds); rope of entanglement",
      "specialDefenses": "Can be struck by normal weapons",
      "magicResistance": "30%",
      "lairProbability": "20%",
      "intelligence": "Average",
      "alignment": "Lawful evil",
      "levelXP": "6/900+10/hp",
      "description": "The erinyes are female devils common to Hell's second plane as well as the kind most commonly sent forth to garner more souls. They can appear as male. Armed with a magical poisoned dagger and a rope of entanglement. Strength 18/01. Will pursue evil persons unceasingly to take them alive into Hell.",
      "specialAbilities": {
        "spellLikeAbilities": {
          "atWill": ["Cause fear (save vs wand)", "Detect invisible", "Locate object", "Invisibility", "Polymorph self", "Produce flame"],
          "summon": "Summon another erinyes (25% chance)"
        }
      }
    },
    {
      "name": "Devil, Barbed",
      "category": "Devils",
      "name_variants": "Barbed Devil, Hamatula",
      "frequency": "Uncommon",
      "numberAppearing": "1d2 or 3d4",
      "size": "Medium (7' tall)",
      "move": "120 ft",
      "armorClass": 0,
      "hitDice": 8,
      "TREASURE TYPE": "Nil",
      "attacks": "2 claws/1 tail",
      "damage": "2d4/2d4/3d4",
      "specialAttacks": "Generate fear (save vs wand); hug for additional damage if both claws hit",
      "specialDefenses": "Can be struck by normal weapons; barbs damage attackers in melee",
      "magicResistance": "35%",
      "lairProbability": "50%",
      "intelligence": "Very",
      "alignment": "Lawful evil",
      "levelXP": "8/2,800+12/hp",
      "description": "Barbed devils populate the third and fourth planes of Hell. Excellent guards, never surprised. They carry no weapons but have horny barbed hands and horrid tails. Their barbs damage any creature striking them in melee.",
      "specialAbilities": {
        "spellLikeAbilities": {
          "atWill": ["Pyrotechnics", "Produce flame", "Hold person"],
          "summon": "Summon another barbed devil (30% chance)"
        }
      }
    },
    {
      "name": "Devil, Bone",
      "category": "Devils",
      "name_variants": "Bone Devil, Osyluth",
      "frequency": "Uncommon",
      "numberAppearing": "1d2 or 2d4",
      "size": "Large (9½' tall)",
      "move": "150 ft",
      "armorClass": -1,
      "hitDice": 9,
      "TREASURE TYPE": "Nil",
      "attacks": "1 bone hook/1 tail",
      "damage": "3d4/2d4 (tail: strength drain)",
      "specialAttacks": "Bone hook (50% chance of sticking fast); tail sting causes 1d4 strength loss for 10 rounds (save vs poison negates)",
      "specialDefenses": "Can be struck by normal weapons; ultravision 60 ft",
      "magicResistance": "40%",
      "lairProbability": "55%",
      "intelligence": "Very",
      "alignment": "Lawful evil",
      "levelXP": "9/4,000+14/hp",
      "description": "Bone devils populate the lower planes of Hell, particularly the fifth. Particularly malicious, delighting in making less powerful creatures suffer. Prefer cold to heat. Have ultravision (60 ft range).",
      "specialAbilities": {
        "spellLikeAbilities": {
          "atWill": ["Generate fear (5 ft radius)", "Create illusion", "Fly", "Become invisible", "Detect invisible", "Fear (spell)"],
          "summon": "Summon another bone devil (40% chance)",
          "daily": "Wall of ice (1/day)"
        }
      }
    },
    {
      "name": "Devil, Horned",
      "category": "Devils",
      "name_variants": "Horned Devil, Malebranche",
      "frequency": "Uncommon",
      "numberAppearing": "1d2 or 2d3",
      "size": "Large (9' tall)",
      "move": "90 ft; 180 ft flying (AA:III)",
      "armorClass": -5,
      "hitDice": "5+5",
      "TREASURE TYPE": "I",
      "attacks": "1 fork or claw/claw/bite + 1 tail",
      "damage": "2d6 (fork) or 1d4/1d4/2d3/1d3 (claw/claw/bite/tail)",
      "specialAttacks": "Fear (5 ft radius, save vs wand); tail causes bleeding wound (1 hp/turn until bound); fork (75%) does 2d6 or barbed whip (25%) does 1d4 + stun",
      "specialDefenses": "+1 or better weapon to hit",
      "magicResistance": "50%",
      "lairProbability": "55%",
      "intelligence": "High",
      "alignment": "Lawful evil",
      "levelXP": "7/2,000+8/hp",
      "psionicAbility": 113,
      "description": "The 'evil horns' (malebranche) are primarily from Hell's sixth and seventh planes. The least of the greater devils. They hate anything stronger than themselves and fear stronger devils accordingly.",
      "specialAbilities": {
        "spellLikeAbilities": {
          "atWill": ["Pyrotechnics", "Produce flame", "ESP", "Detect magic", "Illusion"],
          "summon": "Summon another horned devil (50% chance)",
          "daily": "Wall of fire (triple strength, 3d8 damage, 1/day)"
        }
      }
    },
    {
      "name": "Devil, Ice",
      "category": "Devils",
      "name_variants": "Ice Devil, Gelugon",
      "frequency": "Uncommon",
      "numberAppearing": "1 or 1d4",
      "size": "Large (10½' tall)",
      "move": "60 ft",
      "armorClass": -4,
      "hitDice": 11,
      "TREASURE TYPE": "Q, R",
      "attacks": "2 claws/1 mandibles/1 tail",
      "damage": "1d4/1d4/2d4/3d4",
      "specialAttacks": "Tail causes slow (50%, save vs paralyzation); fear (10 ft radius, save vs wand); 25% carry spear (2d6 + numbing cold/slow)",
      "specialDefenses": "+2 or better weapon to hit; regenerate 1 hp/round; ultravision 60 ft; grasping strength 18/76",
      "magicResistance": "55%",
      "lairProbability": "60%",
      "intelligence": "High",
      "alignment": "Lawful evil",
      "levelXP": "10/6,400+16/hp",
      "psionicAbility": 166,
      "description": "The frigid eighth plane of Hell is populated mainly with ice devils. Greater devils in every sense, preferring to attack and torment victims with claws, mandibles, and tails. They have personal names.",
      "specialAbilities": {
        "spellLikeAbilities": {
          "atWill": ["Fly", "Wall of ice", "Detect magic", "Detect invisible", "Polymorph self"],
          "gate": "Gate 2 bone devils (70%) or 1 ice devil (30%), 60% chance of success",
          "daily": "Ice storm (1/day)"
        }
      }
    },
    {
      "name": "Devil, Pit Fiend",
      "category": "Devils",
      "name_variants": "Pit Fiend",
      "frequency": "Rare",
      "numberAppearing": "1 or 1d3",
      "size": "Large (12' tall)",
      "move": "60 ft; 150 ft flying (AA:III)",
      "armorClass": -3,
      "hitDice": 13,
      "TREASURE TYPE": "J, R",
      "attacks": "2 (weapon + tail)",
      "damage": "5d4 (ancus)/2d4 (tail constrict per turn)",
      "specialAttacks": "Fear (20 ft radius, save vs magic); tail constriction 2d4/turn; strength 18/00",
      "specialDefenses": "+2 or better weapon to hit; regenerate 2 hp/round",
      "magicResistance": "65%",
      "lairProbability": "65%",
      "intelligence": "Exceptional",
      "alignment": "Lawful evil",
      "levelXP": "13/12,000+18/hp",
      "psionicAbility": 213,
      "description": "The lowest plane of Hell is home to the dreaded pit fiend. They possess terrible strength (18/00) and the most evil nature. All pit fiends have personal names. They are the personal servants of Asmodeus. Each typically carries an ancus-like weapon and a jagged-toothed club, striking with both per round.",
      "specialAbilities": {
        "spellLikeAbilities": {
          "atWill": ["Pyrotechnics", "Produce flame", "Wall of fire", "Detect magic", "Detect invisible", "Polymorph self", "Hold person"],
          "gate": "Gate 1d3 barbed devils (60%) or 1 pit fiend (70% chance of success)",
          "daily": "Symbol of pain (save vs magic or -4 attack, -2 Dex for 2d20 rounds, 1/day)"
        }
      }
    },
    {
      "name": "Devil, Arch-Devil",
      "category": "Devils",
      "name_variants": "Arch-Devil",
      "description": "The arch-devils are the rulers of the Nine Hells. Each commands one or more planes. They are of godlike power. Select one: Asmodeus (AC -7, 199 hp, MR 90%, TT I/R/U/V), Baalzebul (AC -5, 166 hp, MR 85%, TT E/R/V), Dispater (AC -2, 144 hp, MR 80%, TT Q×10/S), Geryon (AC -3, 133 hp, MR 75%, TT H/R). Stats below use Geryon as default — adjust per selection.",
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Large (10' tall, 30' long)",
      "move": "30 ft; 180 ft flying",
      "armorClass": -3,
      "hitDice": "133 hp",
      "TREASURE TYPE": "H, R",
      "attacks": "2 claws/1 tail",
      "damage": "3d6/3d6/2d4 (tail: poison, save at -4)",
      "specialAttacks": "Fear gaze (save vs magic); at-will spell-like abilities; gate devils; unique powers per individual",
      "specialDefenses": "+2 or better weapon to hit",
      "magicResistance": "75%",
      "lairProbability": "70%",
      "intelligence": "Exceptional",
      "alignment": "Lawful evil",
      "levelXP": "Special",
      "variants": [
        {
          "name": "Asmodeus",
          "armorClass": -7, "hitDice": "199 hp", "move": "120 ft; 240 ft flying",
          "attacks": "1 (ruby rod)", "damage": "4d4+1 (rod touch) or breath weapon",
          "magicResistance": "90%", "lairProbability": "90%", "intelligence": "Supra-genius",
          "psionicAbility": 366, "TREASURE TYPE": "I, R, U, V",
          "description": "Arch-fiend, Overlord of all dukes of Hell. As strong as a storm giant. His ruby rod acts as a rod of absorption and causes serious wounds on touch; it can shoot a cone of frost, jet of acid, or bolt of lightning."
        },
        {
          "name": "Baalzebul",
          "armorClass": -5, "hitDice": "166 hp", "move": "90 ft; 240 ft flying",
          "attacks": "1 bite", "damage": "2d6 + poison",
          "magicResistance": "85%", "lairProbability": "80%", "intelligence": "Genius",
          "psionicAbility": 313, "TREASURE TYPE": "E, R, V",
          "description": "Lord of the Flies, ruler of the sixth and seventh planes (Malbolge and Maladomini). Second only to Asmodeus in power. Can summon 1d4 horned devils."
        },
        {
          "name": "Dispater",
          "armorClass": -2, "hitDice": "144 hp", "move": "150 ft",
          "attacks": "1 (rod)", "damage": "4d6 (double-strength staff of striking)",
          "magicResistance": "80%", "lairProbability": "80%", "intelligence": "Genius",
          "psionicAbility": 266, "TREASURE TYPE": "Q (×10), S",
          "description": "Ruler of Hell's second plane. His iron city of Dis is filled with zombies, erinyes, and barbed devils. Evilly handsome with small horns, tail, and cloven left hoof. His rod combines rod of rulership with double-strength staff of striking."
        },
        {
          "name": "Geryon",
          "armorClass": -3, "hitDice": "133 hp", "move": "30 ft; 180 ft flying",
          "attacks": "2 claws/1 tail", "damage": "3d6/3d6/2d4 (tail: poison, save at -4)",
          "magicResistance": "75%", "lairProbability": "70%", "intelligence": "Exceptional",
          "psionicAbility": 213, "TREASURE TYPE": "H, R",
          "description": "The Wild Beast, gigantic ruler of the fifth plane. As powerful as a storm giant. A great bull's horn summons 5d4 minotaurs (1/week). Serpentine lower body with bat wings."
        }
      ]
    },
    {
      "name": "Dog",
      "category": "Animal",
      "variants": [
        {
          "type": "War",
          "frequency": "Uncommon",
          "numberAppearing": "Varies",
          "size": "Medium",
          "move": "120 ft",
          "armorClass": "6 (or as armor)",
          "hitDice": "2+2",
          "TREASURE TYPE": "Nil",
          "attacks": 1,
          "damage": "2d4",
          "specialAttacks": "None",
          "specialDefenses": "None",
          "levelXP": "2/50+2/hp"
        },
        {
          "type": "Wild",
          "frequency": "Common",
          "numberAppearing": "4d4",
          "size": "Small",
          "move": "150 ft",
          "armorClass": 7,
          "hitDice": 1,
          "TREASURE TYPE": "Nil",
          "attacks": 1,
          "damage": "1d4",
          "specialAttacks": "None",
          "specialDefenses": "None",
          "levelXP": "1/10+1/hp"
        }
      ],
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Semi-",
      "alignment": "Neutral",
      "treasure": "None",
      "description": "War dogs are large, fearsome canines (like mastiffs or pit bulls) trained for combat and typically armored in leather. They remain loyal unto death. Wild dogs roam in packs, competing with wolves and sometimes refugees for food. They avoid conflict when well-fed but attack when hungry. They can be tamed if removed from their pack."
    },
    {
      "name": "Doppelgänger",
      "category": "Shapechanger",
      "name_variants": "Doppelganger, Doppleganger",
      "variants": [
        {
          "name": "Doppelgänger",
          "description": "Mimicry specialists capable of perfectly assuming humanoid forms and infiltrating society or adventuring parties with deadly precision. Their natural form is pale, hairless, and alien.",
          "appearance": {
            "natural": "Tall, gangly humanoid with bulging yellow eyes and no hair",
            "mimicry": "Any humanoid form (4–8 ft tall), including clothing and gear"
          },
          "behavior": {
            "alignment": "Neutral",
            "intelligence": "Very",
            "habitat": "Dungeons, ruins, populated areas",
            "abilities": [
              "ESP for accurate impersonation",
              "Immune to charm and sleep",
              "Disguise fails only 10% of the time"
            ],
            "tactics": "Murder and replace a party member to ambush or rob others"
          },
          "combat": {
            "attacks": 1,
            "damage": "1d12",
            "special": "Surprises on 1–4 in 6"
          },
          "defenses": {
            "savingThrows": "As 10th level fighter"
          },
          "treasure": {
            "cp": "1d10×1,000 (5%)",
            "sp": "1d12×1,000 (25%)",
            "ep": "1d6×1,000 (25%)",
            "gp": "1d8×1,000 (25%)",
            "gems": "1d12 (15%)",
            "jewellery": "1d8 (10%)",
            "magicItems": "1 scroll and any 3 magic items (25%)"
          }
        }
      ],
      "frequency": "Very rare",
      "numberAppearing": "3d4",
      "size": "Man-sized",
      "move": "90 ft",
      "armorClass": 5,
      "hitDice": 4,
      "TREASURE TYPE": "E",
      "attacks": 1,
      "damage": "1d12",
      "specialAttacks": "Stealth (surprise 1-4 in 6)",
      "specialDefenses": "Immune to charm and sleep; saves as 10th level fighter",
      "magicResistance": "Standard",
      "lairProbability": "20%",
      "intelligence": "Very",
      "alignment": "Neutral",
      "levelXP": "4/285 + 3/hp"
    },

    {
      "name": "Dracolisk",
      "category": "Dragon Hybrid",
      "variants": [
        {
          "name": "Dracolisk",
          "description": "A fusion of black dragon and basilisk, this six-limbed winged terror combines acid breath with petrifying gaze. Rare and fearsome.",
          "appearance": {
            "size": "Large (20 ft)",
            "form": "Black-scaled, dragon-like with basilisk traits and six limbs"
          },
          "behavior": {
            "alignment": "Chaotic evil",
            "intelligence": "Low to average",
            "language": "Usually Draconic"
          },
          "combat": {
            "attacks": 3,
            "damage": "1d6 / 1d6 / 3d4",
            "breathWeapon": {
              "type": "Acid stream",
              "range": "30 ft long, 5 ft wide",
              "damage": "4d6 (save for half)",
              "usesPerDay": 3
            },
            "gazeAttack": {
              "range": "30 ft",
              "effect": "Save vs petrifaction or turn to stone",
              "note": "Affects astral and æthereal creatures"
            }
          },
          "defenses": {
            "flying": "150 ft, short bursts only"
          },
          "treasure": {
            "cp": "1d10×1,000 (25%)",
            "sp": "1d8×1,000 (25%)",
            "gp": "1d6×1,000 (25%)",
            "pp": "1d6×100 (25%)",
            "gems": "3d6 (50%)",
            "jewellery": "3d4 (50%)",
            "magicItems": "Any 3 items (25%)"
          }
        }
      ],
      "frequency": "Very rare",
      "numberAppearing": "1d2",
      "size": "Large",
      "move": "90 ft; 150 ft flying (AA: II)",
      "armorClass": 3,
      "hitDice": "7+3",
      "TREASURE TYPE": "C, I",
      "attacks": 3,
      "damage": "1d6 / 1d6 / 3d4",
      "specialAttacks": "Acid breath and petrifying gaze",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "60%",
      "intelligence": "Low to average",
      "alignment": "Chaotic evil",
      "levelXP": "7/1,000 + 10/hp"
    },
    {
      "name": "Dragon Turtle",
      "category": "Dragonkin",
      "variants": [
        {
          "name": "Dragon Turtle",
          "description": "Massive, steam-breathing sea monsters resembling dragons crossed with turtles. Often mistaken for islands before they surface and attack ships.",
          "appearance": {
            "form": "Gigantic turtle with dragon-like head and flippers",
            "size": "Large"
          },
          "behavior": {
            "alignment": "Neutral",
            "intelligence": "Very",
            "habitat": "Deep oceans and coastal waters",
            "tactics": [
              "Capsizes ships from below",
              "Breathes devastating steam clouds"
            ]
          },
          "combat": {
            "attacks": 3,
            "damage": "2d6 / 2d6 / 4d8",
            "breathWeapon": {
              "type": "Steam cloud",
              "area": "60 ft long, 40 ft wide, 40 ft high",
              "damage": "Equal to current HP (save for half)"
            },
            "shipAttack": "90% chance to capsize vessel it surfaces beneath"
          },
          "treasure": {
            "cp": "5d6×1,000 (25%)",
            "sp": "1d100×1,000 (40%)",
            "ep": "1d4×10,000 (40%)",
            "gp": "1d6×10,000 (55%)",
            "pp": "5d10×100 (25%)",
            "gems": "1d100 (50%)",
            "jewellery": "1d4×10 (50%)",
            "magicItems": "4 items + 1 scroll + 1 potion (15%), 2d4 potions (40%), 1d4 scrolls (50%)"
          }
        }
      ],
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Large",
      "move": "90 ft swimming",
      "armorClass": 0,
      "hitDice": 13,
      "TREASURE TYPE": "B, R, S, T, V",
      "attacks": 3,
      "damage": "2d6 / 2d6 / 4d8",
      "specialAttacks": "Steam cloud breath, capsizing ships",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "5%",
      "intelligence": "Very",
      "alignment": "Neutral",
      "levelXP": "10/7,000+18/hp"
    },
    {
      "name": "Black Dragon",
      "category": "Dragons",
      "name_variants": "",
      "frequency": "Uncommon",
      "numberAppearing": "1d4",
      "size": "L (30' long)",
      "move": "12\"; 24\" flying (AA:II)",
      "armorClass": 3,
      "hitDice": "6–8",
	    "TREASURE TYPE": "H",
      "attacks": 3,
      "damage": "1d4/1d4/3d6",
      "specialAttacks": "Acid breath (50' stream x 5'), 3x/day",
      "specialDefenses": "Standard; save vs breath weapon for half",
      "magicResistance": "Standard",
      "lairProbability": "30%",
      "intelligence": "Average",
      "alignment": "Chaotic evil",
      "levelXP": "Varies by age and HD",
      "description": "Black dragons haunt swamps and dark caves, exuding cruelty and malice. Their breath is a corrosive acid stream, deadly even to those who survive the initial blast. They are often found sleeping but may feign sleep to ambush prey.",
      "specialAbilities": {
        "breathWeapon": "Acid stream (50 ft x 5 ft), damage = HP, save for half, usable 3/day",
        "spells": {
          "casterLevel": "Half age category (if spellcaster)",
          "castingChance": "10%"
        },
        "sleepChance": "50%, with 1-in-6 chance of waking if adventurers are nearby",
        "speakingChance": "30%",
        "feignSleep": true
      },
      "treasure": "5d6×1,000 cp (25%), 1d100×1,000 sp (40%), 1d4×10,000 ep (40%), 1d6×10,000 gp (55%), 5d10×100 pp (25%), 1d100 gems (50%), 1d4×10 jewellery (50%), 4 magic items plus 1 potion and 1 scroll (15%)",
      "habitats": [
        {
          "type": "Swamps",
          "chance": "60%"
        },
        {
          "type": "Marshes",
          "chance": "30%"
        },
        {
          "type": "Dark Caves",
          "chance": "10%"
        }
      ],
      "ageCategories": [
        {
          "age": "Young",
          "hitDice": 6,
          "hpPerDie": 1,
          "casterLevel": 0,
          "saveBonus": 0
        },
        {
          "age": "Juvenile",
          "hitDice": 6,
          "hpPerDie": 3,
          "casterLevel": 0,
          "saveBonus": 0
        },
        {
          "age": "Adult",
          "hitDice": 7,
          "hpPerDie": 5,
          "casterLevel": 2,
          "saveBonus": 1
        },
        {
          "age": "Old",
          "hitDice": 8,
          "hpPerDie": 6,
          "casterLevel": 3,
          "saveBonus": 2
        },
        {
          "age": "Ancient",
          "hitDice": 8,
          "hpPerDie": 8,
          "casterLevel": 4,
          "saveBonus": 4
        }
      ]
    },
    {
      "name": "Blue Dragon",
      "category": "Dragons",
      "name_variants": "",
      "frequency": "Rare",
      "numberAppearing": "1d4",
      "size": "L (42' long)",
      "move": "9\"; 24\" flying (AA:II)",
      "armorClass": 2,
      "hitDice": "8–10",
      "TREASURE TYPE": "H, S",
      "attacks": 3,
      "damage": "1d6/1d6/3d8",
      "specialAttacks": "Lightning breath (100' x 5') for full HP damage, 3x/day",
      "specialDefenses": "Standard; save vs breath weapon for half",
      "magicResistance": "Standard",
      "lairProbability": "50%",
      "intelligence": "Very",
      "alignment": "Lawful evil",
      "levelXP": "Varies by age and HD",
      "description": "Deadly dragons of the desert, blue dragons dwell in vast arid caverns. They breathe lightning bolts up to 100 feet long, and may cast spells if intelligent enough. Known for cruelty and arrogance, they are powerful foes even for experienced parties.",
      "specialAbilities": {
        "breathWeapon": "Lightning bolt (100 ft x 5 ft), damage = HP, save for half, usable 3/day",
        "spells": {
          "casterLevel": "Equal to age category (if spellcaster)",
          "castingChance": "30%"
        },
        "sleepChance": "30%, with 1-in-6 chance of waking if adventurers are nearby",
        "speakingChance": "60%",
        "feignSleep": true
      },
      "treasure": "5d6×1,000 cp (25%), 1d100×1,000 sp (40%), 1d4×10,000 ep (40%), 1d6×10,000 gp (55%), 5d10×100 pp (25%), 1d100 gems (50%), 1d4×10 jewellery (50%), 4 magic items plus 1 potion and 1 scroll (15%), 2d4 potions (40%)",
      "habitats": [
        {
          "type": "Deserts",
          "chance": "90%"
        },
        {
          "type": "Arid Caverns",
          "chance": "10%"
        }
      ],
      "ageCategories": [
        {
          "age": "Young",
          "hitDice": 8,
          "hpPerDie": 1,
          "casterLevel": 0,
          "saveBonus": 0
        },
        {
          "age": "Juvenile",
          "hitDice": 8,
          "hpPerDie": 3,
          "casterLevel": 0,
          "saveBonus": 0
        },
        {
          "age": "Adult",
          "hitDice": 9,
          "hpPerDie": 5,
          "casterLevel": 4,
          "saveBonus": 1
        },
        {
          "age": "Old",
          "hitDice": 10,
          "hpPerDie": 6,
          "casterLevel": 5,
          "saveBonus": 2
        },
        {
          "age": "Ancient",
          "hitDice": 10,
          "hpPerDie": 8,
          "casterLevel": 8,
          "saveBonus": 4
        }
      ]
    },

    {
      "name": "Brass Dragon",
      "category": "Dragons",
      "name_variants": "",
      "frequency": "Uncommon",
      "numberAppearing": "1d4",
      "size": "L (30' long)",
      "move": "12\"; 24\" flying (AA:II)",
      "armorClass": 3,
      "hitDice": "6–8",
      "TREASURE TYPE": "H",
      "attacks": 3,
      "damage": "1d4/1d4/4d4",
      "specialAttacks": "Cone of sleep gas (70'x20') or cone of fear gas (40'x50'x20'), 3x/day",
      "specialDefenses": "Standard; saves against breath vary by size",
      "magicResistance": "Standard",
      "lairProbability": "25%",
      "intelligence": "High",
      "alignment": "Chaotic good or chaotic neutral",
      "levelXP": "Varies by age and HD",
      "description": "Brass dragons are desert-dwelling and social, known for their talkativeness and curiosity. Unlike their more violent cousins, they prefer conversation to combat, though their breath weapons can be formidable.",
      "specialAbilities": {
        "breathWeapon": "Cone of sleep gas (70'x20') or cone of fear gas (40'x50'x20'); 3/day",
        "spells": {
          "casterLevel": "1/2 age category",
          "castingChance": "30%"
        },
        "sleepChance": "50%, 1-in-6 chance to wake if adventurers nearby",
        "speakingChance": "30%",
        "feignSleep": true
      },
      "treasure": "5d6×1,000 cp (25%), 1d100×1,000 sp (40%), 1d4×10,000 ep (40%), 1d6×10,000 gp (55%), 5d10×100 pp (25%), 1d100 gems (50%), 1d4×10 jewellery (50%), 4 magic items + 1 potion + 1 scroll (15%)",
      "habitats": [
        {
          "type": "Desert caves",
          "chance": "100%"
        }
      ],
      "ageCategories": [
        {
          "age": "Young",
          "hitDice": 6,
          "hpPerDie": 1,
          "casterLevel": 0,
          "saveBonus": 0
        },
        {
          "age": "Juvenile",
          "hitDice": 6,
          "hpPerDie": 3,
          "casterLevel": 1,
          "saveBonus": 0
        },
        {
          "age": "Adult",
          "hitDice": 7,
          "hpPerDie": 5,
          "casterLevel": 2,
          "saveBonus": 1
        },
        {
          "age": "Old",
          "hitDice": 8,
          "hpPerDie": 6,
          "casterLevel": 3,
          "saveBonus": 2
        },
        {
          "age": "Ancient",
          "hitDice": 8,
          "hpPerDie": 8,
          "casterLevel": 4,
          "saveBonus": 4
        }
      ]
    },

    {
      "name": "Bronze Dragon",
      "category": "Dragons",
      "name_variants": "",
      "frequency": "Rare",
      "numberAppearing": "1d4",
      "size": "L (42' long)",
      "move": "9\"; 24\" flying (AA:II)",
      "armorClass": 2,
      "hitDice": "8–10",
      "TREASURE TYPE": "H, S, T",
      "attacks": 3,
      "damage": "1d6/1d6/4d6",
      "specialAttacks": "Breath weapon: lightning bolt (100' x 5') or repulsion gas cloud (20'x30'x30'), 3x/day",
      "specialDefenses": "Standard",
      "magicResistance": "Standard",
      "lairProbability": "45%",
      "intelligence": "Exceptional",
      "alignment": "Lawful good",
      "levelXP": "Varies by age and HD",
      "description": "Reclusive and noble, bronze dragons dwell near water in temperate zones. Curious about humans, they sometimes assume humanoid form to observe or help. Their breath can blast with lightning or drive foes away with a gas cloud.",
      "specialAbilities": {
        "breathWeapon": "Lightning bolt (100'x5') or repulsion gas (20'x30'x30'); 3/day",
        "spells": {
          "casterLevel": "Equal to age category",
          "castingChance": "60%"
        },
        "sleepChance": "25%, 1-in-6 chance to awaken if disturbed",
        "speakingChance": "60%",
        "feignSleep": true
      },
      "treasure": "5d6×1,000 cp (25%), 1d100×1,000 sp (40%), 1d4×10,000 ep (40%), 1d6×10,000 gp (55%), 5d10×100 pp (25%), 1d100 gems (50%), 1d4×10 jewellery (50%), 4 magic items + 1 potion + 1 scroll (15%), 2d4 potions (40%), 1d4 scrolls (50%)",
      "habitats": [
        {
          "type": "Coastal cliffs, underwater caves, or lakefront caverns",
          "chance": "100%"
        }
      ],
      "ageCategories": [
        {
          "age": "Young",
          "hitDice": 8,
          "hpPerDie": 1,
          "casterLevel": 1,
          "saveBonus": 0
        },
        {
          "age": "Juvenile",
          "hitDice": 8,
          "hpPerDie": 3,
          "casterLevel": 3,
          "saveBonus": 0
        },
        {
          "age": "Adult",
          "hitDice": 9,
          "hpPerDie": 5,
          "casterLevel": 5,
          "saveBonus": 1
        },
        {
          "age": "Old",
          "hitDice": 10,
          "hpPerDie": 6,
          "casterLevel": 7,
          "saveBonus": 2
        },
        {
          "age": "Ancient",
          "hitDice": 10,
          "hpPerDie": 8,
          "casterLevel": 10,
          "saveBonus": 4
        }
      ]
    },

        {
      "name": "Copper Dragon",
      "category": "Dragons",
      "name_variants": "",
      "frequency": "Uncommon to Rare",
      "numberAppearing": "1d4",
      "size": "L (36' long)",
      "move": "9\"; 24\" flying (AA:II)",
      "armorClass": 1,
      "hitDice": "7–9",
      "TREASURE TYPE": "H, S",
      "attacks": 3,
      "damage": "1d4/1d4/3d6+2",
      "specialAttacks": "Breath weapon: acid (stream, hp damage) or slowing gas (20'x30'x30'), 3x/day",
      "specialDefenses": "Standard",
      "magicResistance": "Standard",
      "lairProbability": "35%",
      "intelligence": "High",
      "alignment": "Chaotic good",
      "levelXP": "Varies by age and HD",
      "description": "Copper dragons are witty and whimsical creatures that prefer rocky hills and arid lands. They can breathe either acid or slowing gas and are known to use their magic to toy with or help adventurers. Despite their good nature, they can be vain and greedy.",
      "specialAbilities": {
        "breathWeapon": "Acid stream (hp damage) or slowing gas cloud (20'x30'x30'); 3/day",
        "spells": {
          "casterLevel": "Equal to age category",
          "castingChance": "40%"
        },
        "sleepChance": "40%, 1-in-6 chance to awaken if disturbed",
        "speakingChance": "45%",
        "feignSleep": true
      },
      "treasure": "5d6×1,000 cp (25%), 1d100×1,000 sp (40%), 1d4×10,000 ep (40%), 1d6×10,000 gp (55%), 5d10×100 pp (25%), 1d100 gems (50%), 1d4×10 jewellery (50%), 4 magic items + 1 potion + 1 scroll (15%), 2d4 potions (40%)",
      "habitats": [
        {
          "type": "Arid hills, rocky uplands, or desert cliffs",
          "chance": "100%"
        }
      ],
      "ageCategories": [
        {
          "age": "Young",
          "hitDice": 7,
          "hpPerDie": 1,
          "casterLevel": 1,
          "saveBonus": 0
        },
        {
          "age": "Juvenile",
          "hitDice": 7,
          "hpPerDie": 3,
          "casterLevel": 3,
          "saveBonus": 0
        },
        {
          "age": "Adult",
          "hitDice": 8,
          "hpPerDie": 5,
          "casterLevel": 5,
          "saveBonus": 1
        },
        {
          "age": "Old",
          "hitDice": 9,
          "hpPerDie": 6,
          "casterLevel": 7,
          "saveBonus": 2
        },
        {
          "age": "Ancient",
          "hitDice": 9,
          "hpPerDie": 8,
          "casterLevel": 9,
          "saveBonus": 4
        }
      ]
    },

    {
      "name": "Gold Dragon",
      "category": "Dragons",
      "name_variants": "",
      "frequency": "Very Rare",
      "numberAppearing": "1d3",
      "size": "L (54' long)",
      "move": "12\"; 30\" flying (AA:II)",
      "armorClass": -2,
      "hitDice": "10–12",
      "TREASURE TYPE": "H, R, S, T",
      "attacks": 3,
      "damage": "1d8/1d8/6d6",
      "specialAttacks": "Breath weapon: fire cone (90' long, 15' radius) or poisonous gas cloud (save or die), 3x/day",
      "specialDefenses": "Standard",
      "magicResistance": "Standard",
      "lairProbability": "65%",
      "intelligence": "Genius",
      "alignment": "Lawful good",
      "levelXP": "Varies by age and HD",
      "description": "Gold dragons are the most powerful and majestic of the metallic dragons. Noble, wise, and just, they are often protectors of the innocent and champions of justice. They may assume human or animal form and prefer lairs hidden in remote lakes or deep mountain valleys.",
      "specialAbilities": {
        "breathWeapon": "Cone of fire (90' long, 15' radius at base) or poisonous gas cloud (save or die); 3/day",
        "spells": {
          "casterLevel": "Equal to age category",
          "castingChance": "100% if speaking (which is 90% likely)"
        },
        "sleepChance": "10%, 1-in-6 chance to awaken if disturbed",
        "speakingChance": "90%",
        "feignSleep": true,
        "shapeChange": "Can take human or animal form to observe mortals"
      },
      "treasure": "5d6×1,000 cp (25%), 1d100×1,000 sp (40%), 1d4×10,000 ep (40%), 2d6×10,000 gp (55%), 10d10×100 pp (25%), 7d20 gems (50%), 1d6×10 jewellery (50%), 4 magic items + 1 potion + 1 scroll (15%), 2d4 potions (40%), 1d4 scrolls (50%)",
      "habitats": [
        {
          "type": "Remote mountains, lakes, or secluded caverns",
          "chance": "100%"
        }
      ],
      "ageCategories": [
        {
          "age": "Young",
          "hitDice": 10,
          "hpPerDie": 1,
          "casterLevel": 1,
          "saveBonus": 0
        },
        {
          "age": "Juvenile",
          "hitDice": 10,
          "hpPerDie": 3,
          "casterLevel": 3,
          "saveBonus": 0
        },
        {
          "age": "Adult",
          "hitDice": 11,
          "hpPerDie": 5,
          "casterLevel": 5,
          "saveBonus": 1
        },
        {
          "age": "Old",
          "hitDice": 12,
          "hpPerDie": 6,
          "casterLevel": 7,
          "saveBonus": 2
        },
        {
          "age": "Ancient",
          "hitDice": 12,
          "hpPerDie": 8,
          "casterLevel": 9,
          "saveBonus": 4
        }
      ]
    },
    
    {
      "name": "Green Dragon",
      "category": "Dragons",
      "name_variants": "",
      "frequency": "Rare",
      "numberAppearing": "1d4",
      "size": "L (36' long)",
      "move": "9\"; 24\" flying (AA:II)",
      "armorClass": 2,
      "hitDice": "7–9",
      "TREASURE TYPE": "H",
      "attacks": 3,
      "damage": "1d6/1d6/2d10",
      "specialAttacks": "Poison gas breath (50' × 40' × 30'), 3x/day",
      "specialDefenses": "Standard; save vs breath weapon for half",
      "magicResistance": "Standard",
      "lairProbability": "40%",
      "intelligence": "Average to very",
      "alignment": "Lawful evil",
      "levelXP": "Varies by age and HD",
      "description": "Green dragons are known for their foul temperament and malicious cunning. They prefer wooded lairs and have a breath weapon of deadly poisonous gas. They may cast spells and speak, but are often found feigning sleep to ambush intruders.",
      "specialAbilities": {
        "breathWeapon": "Poison gas cloud (50' long, 40' wide, 30' high), damage = HP, save for half, 3/day",
        "spells": {
          "casterLevel": "Equal to age category (if spellcaster)",
          "castingChance": "20%"
        },
        "sleepChance": "40%, with 1-in-6 chance of waking if adventurers are nearby",
        "speakingChance": "45%",
        "feignSleep": true
      },
      "treasure": "5d6×1,000 cp (25%), 1d100×1,000 sp (40%), 1d4×10,000 ep (40%), 1d6×10,000 gp (55%), 5d10×100 pp (25%), 1d100 gems (50%), 1d4×10 jewellery (50%), 4 magic items plus 1 potion and 1 scroll (15%), 2d4 potions (40%), 1d4 scrolls (50%)",
      "habitats": [
        {
          "type": "Forests",
          "chance": "80%"
        },
        {
          "type": "Ruins or caverns near forests",
          "chance": "20%"
        }
      ],
      "ageCategories": [
        {
          "age": "Young",
          "hitDice": 7,
          "hpPerDie": 1,
          "casterLevel": 0,
          "saveBonus": 0
        },
        {
          "age": "Juvenile",
          "hitDice": 7,
          "hpPerDie": 3,
          "casterLevel": 0,
          "saveBonus": 0
        },
        {
          "age": "Adult",
          "hitDice": 8,
          "hpPerDie": 5,
          "casterLevel": 5,
          "saveBonus": 1
        },
        {
          "age": "Old",
          "hitDice": 9,
          "hpPerDie": 6,
          "casterLevel": 6,
          "saveBonus": 2
        },
        {
          "age": "Ancient",
          "hitDice": 9,
          "hpPerDie": 8,
          "casterLevel": 9,
          "saveBonus": 4
        }
      ]
    },

    {
      "name": "Red Dragon",
      "category": "Dragons",
      "name_variants": "",
      "frequency": "Rare",
      "numberAppearing": "1d4",
      "size": "L (48' long)",
      "move": "9\"; 24\" flying (AA:II)",
      "armorClass": -1,
      "hitDice": "9–11",
      "TREASURE TYPE": "H, S, T",
      "attacks": 3,
      "damage": "1d8/1d8/3d10",
      "specialAttacks": "Fire breath (cone 90' long, 15' radius base), 3x/day",
      "specialDefenses": "Standard; save vs breath weapon for half",
      "magicResistance": "Standard",
      "lairProbability": "60%",
      "intelligence": "Exceptional",
      "alignment": "Chaotic evil",
      "levelXP": "Varies by age and HD",
      "description": "Red dragons are the most fearsome and iconic of all dragons—greedy, arrogant, and overwhelmingly powerful. They hoard treasure obsessively and attack without provocation. Their fiery breath is devastating, and they are often encountered in mountainous lairs.",
      "specialAbilities": {
        "breathWeapon": "Cone of fire (90' long, 15' radius), damage = HP, save for half, 3/day",
        "spells": {
          "casterLevel": "Equal to age category (if spellcaster)",
          "castingChance": "40%"
        },
        "sleepChance": "20%, 1-in-6 chance to wake if adventurers nearby",
        "speakingChance": "80%",
        "feignSleep": true
      },
      "treasure": "5d6×1,000 cp (25%), 1d100×1,000 sp (40%), 1d4×10,000 ep (40%), 1d6×10,000 gp (55%), 5d10×100 pp (25%), 1d100 gems (50%), 1d4×10 jewellery (50%), 4 magic items + 1 potion + 1 scroll (15%), 2d4 potions (40%), 1d4 scrolls (50%)",
      "habitats": [
        {
          "type": "Mountain peaks and volcanoes",
          "chance": "90%"
        },
        {
          "type": "Remote caverns",
          "chance": "10%"
        }
      ],
      "ageCategories": [
        {
          "age": "Young",
          "hitDice": 9,
          "hpPerDie": 1,
          "casterLevel": 0,
          "saveBonus": 0
        },
        {
          "age": "Juvenile",
          "hitDice": 9,
          "hpPerDie": 3,
          "casterLevel": 0,
          "saveBonus": 0
        },
        {
          "age": "Adult",
          "hitDice": 10,
          "hpPerDie": 5,
          "casterLevel": 5,
          "saveBonus": 1
        },
        {
          "age": "Old",
          "hitDice": 11,
          "hpPerDie": 6,
          "casterLevel": 6,
          "saveBonus": 2
        },
        {
          "age": "Ancient",
          "hitDice": 11,
          "hpPerDie": 8,
          "casterLevel": 8,
          "saveBonus": 4
        }
      ]
    },

    {
      "name": "Silver Dragon",
      "category": "Dragons",
      "name_variants": "",
      "frequency": "Very rare",
      "numberAppearing": "1d4",
      "size": "L (48' long)",
      "move": "9\"; 24\" flying (AA:II)",
      "armorClass": -1,
      "hitDice": "9–11",
      "TREASURE TYPE": "H, T",
      "attacks": 3,
      "damage": "1d6/1d6/5d6",
      "specialAttacks": "Frost or paralysing gas breath, 3x/day",
      "specialDefenses": "Standard; breath save for half or paralysis",
      "magicResistance": "Standard",
      "lairProbability": "55%",
      "intelligence": "Exceptional",
      "alignment": "Lawful good",
      "levelXP": "Varies by age and HD",
      "description": "Silver dragons are noble and benevolent creatures found in high mountains and cloud-covered peaks. They often take human form to observe and aid humankind, guided by a strong moral compass. Though peaceful by nature, they are powerful defenders of good.",
      "specialAbilities": {
        "breathWeapon": "Cone of frost (50' long, 25' diameter) or cloud of paralysing gas (save or paralyzed for 3d4 turns), 3/day",
        "spells": {
          "casterLevel": "Equal to age category",
          "castingChance": "75%"
        },
        "sleepChance": "15%, 1-in-6 chance to wake if adventurers nearby",
        "speakingChance": "75%",
        "feignSleep": true
      },
      "treasure": "5d6×1,000 cp (25%), 1d100×1,000 sp (40%), 1d4×10,000 ep (40%), 1d6×10,000 gp (55%), 5d10×100 pp (25%), 1d100 gems (50%), 1d4×10 jewellery (50%), 4 magic items + 1 potion + 1 scroll (15%), 1d4 scrolls (50%)",
      "habitats": [
        {
          "type": "Mountain peaks",
          "chance": "70%"
        },
        {
          "type": "Cloud islands",
          "chance": "30%"
        }
      ],
      "ageCategories": [
        {
          "age": "Young",
          "hitDice": 9,
          "hpPerDie": 1,
          "casterLevel": 0,
          "saveBonus": 0
        },
        {
          "age": "Juvenile",
          "hitDice": 9,
          "hpPerDie": 3,
          "casterLevel": 0,
          "saveBonus": 0
        },
        {
          "age": "Adult",
          "hitDice": 10,
          "hpPerDie": 5,
          "casterLevel": 5,
          "saveBonus": 1
        },
        {
          "age": "Old",
          "hitDice": 11,
          "hpPerDie": 6,
          "casterLevel": 6,
          "saveBonus": 2
        },
        {
          "age": "Ancient",
          "hitDice": 11,
          "hpPerDie": 8,
          "casterLevel": 8,
          "saveBonus": 4
        }
      ]
    },

    {
      "name": "White Dragon",
      "category": "Dragons",
      "name_variants": "",
      "frequency": "Uncommon",
      "numberAppearing": "1d4",
      "size": "L (24' long)",
      "move": "12\"; 30\" flying (AA:II)",
      "armorClass": 3,
      "hitDice": "5–7",
      "TREASURE TYPE": "E, O, S",
      "attacks": 3,
      "damage": "1d4/1d4/2d8",
      "specialAttacks": "Cone of frost (50' long, 25' base), 3x/day",
      "specialDefenses": "Standard; save vs breath weapon for half damage",
      "magicResistance": "Standard",
      "lairProbability": "30%",
      "intelligence": "Low",
      "alignment": "Chaotic evil",
      "levelXP": "Varies by age and HD",
      "description": "White dragons are cruel and unintelligent predators dwelling in arctic and mountainous regions. Though less cunning than their chromatic cousins, they are vicious foes and masters of frigid breath attacks.",
      "specialAbilities": {
        "breathWeapon": "Cone of frost, 50' long and 25' wide at the base; damage equals current HP, 3/day",
        "spells": {
          "casterLevel": "1/2 age category (only 5% chance)",
          "castingChance": "5%"
        },
        "sleepChance": "60%, 1-in-6 chance to wake if adventurers nearby",
        "speakingChance": "20%",
        "feignSleep": true
      },
      "treasure": "1d12×1,000 cp (15%), 1d20×1,000 sp (25%), 1d6×1,000 ep (25%), 1d8×1,000 gp (25%), 1d12 gems (15%), 1d8 jewellery (10%), 3 magic items + 2d4 potions + 1 scroll (25%)",
      "habitats": [
        {
          "type": "Frozen tundra",
          "chance": "50%"
        },
        {
          "type": "Icy mountain lairs",
          "chance": "50%"
        }
      ],
      "ageCategories": [
        {
          "age": "Young",
          "hitDice": 5,
          "hpPerDie": 1,
          "casterLevel": 0,
          "saveBonus": 0
        },
        {
          "age": "Juvenile",
          "hitDice": 5,
          "hpPerDie": 3,
          "casterLevel": 0,
          "saveBonus": 0
        },
        {
          "age": "Adult",
          "hitDice": 6,
          "hpPerDie": 5,
          "casterLevel": 3,
          "saveBonus": 1
        },
        {
          "age": "Old",
          "hitDice": 7,
          "hpPerDie": 6,
          "casterLevel": 4,
          "saveBonus": 2
        },
        {
          "age": "Ancient",
          "hitDice": 7,
          "hpPerDie": 8,
          "casterLevel": 4,
          "saveBonus": 4
        }
      ]
    },
    {
      "name": "Dwarf",
      "category": "Demi-Human",
      "name_variants": "dwarves, dwarfs",
      "frequency": "Common",
      "numberAppearing": "40d10",
      "size": "Small (4 ft tall)",
      "move": "60 ft",
      "armorClass": 4,
      "hitDice": 1,
      "TREASURE TYPE": "Individuals: M (x10); Lair: G, Q (x20), R",
      "attacks": 1,
      "damage": "1d8 or by weapon",
      "specialAttacks": "+1 to hit orcs and goblins",
      "specialDefenses": "Save at 4 levels higher; giants, trolls, and ogres fight at -4",
      "magicResistance": "As above",
      "lairProbability": "50%",
      "intelligence": "Very",
      "alignment": "Lawful good",
      "levelXP": "2/30+1/hp",
      "description": "Dwarfs are sturdy humanoids who live in extended clans, often in rocky hills. They hate orcs and goblins, gaining +1 to hit them. Giants, trolls, and ogres fight at -4 when fighting dwarfs. Save vs poison/magic as if 4 levels higher.",
      "leaders": {
        "per_40": "1d6 (1 = 2nd level, 2–6 = 6th level) fighter",
        "over_160": [
          "1 6th level fighter (chief)",
          "1 4th level fighter (lieutenant)"
        ],
        "over_200": "1 fighter/cleric (3rd–6th level fighter, 4th–7th level cleric)",
        "over_320": [
          "1 8th level fighter",
          "1 7th level fighter",
          "1 6th level fighter / 7th level cleric"
        ]
      },
      "variants": {
        "Mountain Dwarf": {
          "hitDice": "1d8+1",
          "height": "4½ ft"
        }
      },
      "treasure": {
        "individual": "2d4×5 gp",
        "lair": {
          "gp": { "amount": "10d4×1,000", "chance": "50%" },
          "pp": { "amount": "1d20×100", "chance": "50%" },
          "gems1": { "amount": "5d4", "chance": "30%" },
          "gems2": { "amount": "1d4×20", "chance": "50%" },
          "jewellery": { "amount": "1d10", "chance": "25%" },
          "magic_items": { "amount": 4, "chance": "15%" }
        }
      }
    },

    {
      "name": "Mountain Dwarf",
      "category": "Demi-Human",
      "name_variants": "mountain dwarves, mountain dwarfs",
      "frequency": "Common",
      "numberAppearing": "40d10",
      "size": "Small (4 ft tall)",
      "move": "60 ft",
      "armorClass": 4,
      "hitDice": 1,
      "TREASURE TYPE": "Individuals: M (x10); Lair: G, Q (x20), R",
      "attacks": 1,
      "damage": "1d8 or by weapon",
      "specialAttacks": "+1 to hit orcs and goblins",
      "specialDefenses": "Save at 4 levels higher; giants, trolls, and ogres fight at -4",
      "magicResistance": "As above",
      "lairProbability": "50%",
      "intelligence": "Very",
      "alignment": "Lawful good",
      "levelXP": "2/30+1/hp",
      "description": "Dwarfs are sturdy humanoids who live in extended clans, often in rocky hills. They hate orcs and goblins, gaining +1 to hit them. Giants, trolls, and ogres fight at -4 when fighting dwarfs. Save vs poison/magic as if 4 levels higher.",
      "leaders": {
        "per_40": "1d6 (1 = 2nd level, 2–6 = 6th level) fighter",
        "over_160": [
          "1 6th level fighter (chief)",
          "1 4th level fighter (lieutenant)"
        ],
        "over_200": "1 fighter/cleric (3rd–6th level fighter, 4th–7th level cleric)",
        "over_320": [
          "1 8th level fighter",
          "1 7th level fighter",
          "1 6th level fighter / 7th level cleric"
        ]
      },
      "variants": {
        "Mountain Dwarf": {
          "hitDice": "1d8+1",
          "height": "4½ ft"
        }
      },
      "treasure": {
        "individual": "2d4×5 gp",
        "lair": {
          "gp": { "amount": "10d4×1,000", "chance": "50%" },
          "pp": { "amount": "1d20×100", "chance": "50%" },
          "gems1": { "amount": "5d4", "chance": "30%" },
          "gems2": { "amount": "1d4×20", "chance": "50%" },
          "jewellery": { "amount": "1d10", "chance": "25%" },
          "magic_items": { "amount": 4, "chance": "15%" }
        }
      }
    },

    {
      "name": "Eel, Giant",
      "category": "Animal",
      "variants": [
        {
          "type": "Moray",
          "frequency": "Uncommon",
          "numberAppearing": "1d4",
          "size": "Large",
          "move": "90 ft swimming",
          "armorClass": 6,
          "hitDice": 5,
          "TREASURE TYPE": "Nil",
          "attacks": 1,
          "damage": "3d6",
          "specialAttacks": "None",
          "specialDefenses": "None",
          "levelXP": "4/110+4/hp"
        },
        {
          "type": "Electric",
          "frequency": "Rare",
          "numberAppearing": "1d4",
          "size": "Medium",
          "move": "120 ft swimming",
          "armorClass": 9,
          "hitDice": 2,
          "TREASURE TYPE": "Nil",
          "attacks": 1,
          "damage": "1d4",
          "specialAttacks": "Electricity",
          "specialDefenses": "None",
          "levelXP": "2/40+2/hp"
        },
        {
          "type": "Weed",
          "frequency": "Very rare",
          "numberAppearing": "1d4",
          "size": "Small",
          "move": "150 ft swimming",
          "armorClass": 8,
          "hitDice": "1d6 hp",
          "TREASURE TYPE": "O, P, R",
          "attacks": 1,
          "damage": 1,
          "specialAttacks": "Poison",
          "specialDefenses": "None",
          "levelXP": "1/30+1/hp"
        }
      ],
      "magicResistance": "Standard",
      "lairProbability": "Nil (Moray, Electric); 100% (Weed)",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "treasure": {
        "weed_eel_lair": {
          "cp": {"amount": "1d4×1,000", "chance": "30%"},
          "sp": {"amount": "1d10×1,000", "chance": "50%"},
          "ep": {"amount": "1d3×1,000", "chance": "20%"},
          "gp": {"amount": "1d8×1,000", "chance": "45%"},
          "pp": {"amount": "2d8×100", "chance": "60%"},
          "gems": {"amount": "6d6", "chance": "50%"},
          "jewellery": {"amount": "2d6", "chance": "50%"}
        }
      },
      "description": "Giant moray eels inhabit saltwater environments, sometimes serving locathah as battle mounts or guards. Electric eels discharge electricity when threatened, damaging creatures within 15 ft (3d8 damage at 5 ft, 2d8 at 5-10 ft, 1d8 at 10-15 ft). Weed eels camouflage themselves as seaweed and deliver lethal poison through their bite (save or die). Their lairs connect through small tunnels to a large central cave paved with shiny objects."
    },
    {
      "name": "Ear Seeker",
      "category": "Vermin",
      "frequency": "Very rare",
      "numberAppearing": "1d4",
      "size": "Small (about ½ inch long)",
      "move": "10 ft",
      "armorClass": 9,
      "hitDice": "1 hp",
      "TREASURE TYPE": "Nil",
      "attacks": "1 (see below)",
      "damage": "Special",
      "specialAttacks": "Lays 9d8 eggs in warm places (favors ears); eggs hatch in 4d6 hours; larvae eat surrounding flesh, burrowing inward; kills host 90% of the time",
      "specialDefenses": "Nil",
      "magicResistance": "Standard",
      "lairProbability": "90%",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": "1/7",
      "description": "Small insectoids found in wood, living by eating dead cellulose. They need warm places to lay eggs and favor ears. The creature enters a warm place, lays 9-16 tiny eggs, then crawls out to die. A cure disease spell will destroy the eggs."
    },
    {
      "name": "Elephant",
      "category": "Animal",
      "variants": [
        {
          "type": "African",
          "frequency": "Common",
          "numberAppearing": "1d12",
          "size": "Large",
          "move": "150 ft",
          "armorClass": 6,
          "hitDice": 11,
          "TREASURE TYPE": "Nil",
          "attacks": 5,
          "damage": "2d8/2d8/2d6/2d6/2d6",
          "specialAttacks": "None",
          "specialDefenses": "None",
          "levelXP": "7/1,400 +14/hp"
        },
        {
          "type": "Asian",
          "frequency": "Common",
          "numberAppearing": "1d12",
          "size": "Large",
          "move": "150 ft",
          "armorClass": 5,
          "hitDice": 10,
          "TREASURE TYPE": "Nil",
          "attacks": 5,
          "damage": "2d8/2d8/2d6/2d6/2d6",
          "specialAttacks": "None",
          "specialDefenses": "None",
          "levelXP": "7/1,100 +13/hp"
        },
        {
          "type": "Mammoth",
          "frequency": "Very rare",
          "numberAppearing": "1d12",
          "size": "Large",
          "move": "150 ft",
          "armorClass": 6,
          "hitDice": 13,
          "TREASURE TYPE": "Nil",
          "attacks": 5,
          "damage": "3d6/3d6/2d8/2d8/2d8",
          "specialAttacks": "None",
          "specialDefenses": "None",
          "levelXP": "7/2,300 +17/hp"
        },
        {
          "type": "Mastodon",
          "frequency": "Very rare",
          "numberAppearing": "1d12",
          "size": "Large",
          "move": "150 ft",
          "armorClass": 6,
          "hitDice": 12,
          "TREASURE TYPE": "Nil",
          "attacks": 5,
          "damage": "2d8/2d8/2d6/2d6/2d6",
          "specialAttacks": "None",
          "specialDefenses": "None",
          "levelXP": "7/1,900 +16/hp"
        }
      ],
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "treasure": "Ivory is worth 1d6×100gp per tusk. An elephant tusk is hugely encumbering.",
      "description": "Elephants are large mammals found in subtropical regions, traveling in small herds across plains and grasslands. African elephants are typically larger with bigger ears than Asian elephants. Both can be trained as beasts of burden. Mammoths and mastodons are prehistoric ancestors with woolly coats suited to subarctic environments. All elephants attack with tusks, trunk, and forelegs, although no single opponent can be subject to more than two attacks simultaneously."
    },

    {
      "name": "Elf",
      "category": "Demi-Human",
      "variants": [
        {
          "name": "High Elf",
          "description": "The standard elven type. Slim of build and pale complected with dark hair and green eyes. Typically wear pastel garb of blue, green, or violet, often covered by a greenish gray cloak.",
          "lifespan": "Over 1,200 years"
        },
        {
          "name": "Aquatic Elf",
          "description": "Sea elves with gill slits on the throat, greenish-silver skin, and green or blue-green hair. Live in caverns in lagoon bottoms and reefs.",
          "specialAbilities": {
            "movement": "Seaweed affords little or no hindrance",
            "invisibility": "Invisible in weeds or on reefs",
            "companions": "50% chance of 1-3 friendly dolphins per 20 sea elves"
          },
          "equipment": {
            "weapons": "Spears and tridents, usually with nets",
            "noMagic": true
          },
          "relationships": {
            "friends": ["Dolphins", "Land elves"],
            "enemies": ["Sharks", "Sahuagin"],
            "neutral": ["All others"],
            "dislike": ["Fishermen"]
          },
          "languages": ["Elvish only"]
        },
        {
          "name": "Drow",
          "TREASURE TYPE": "Individuals: N (x5), Q (x2); Lair: G, S, T",
          "description": "The 'Black Elves' are only legend. They purportedly dwell deep beneath the surface in a strange subterranean realm. Said to be as dark as faeries are bright and as evil as the latter are good.",
          "combat": {
            "fighting": "Weak",
            "magic": "Strong"
          },
          "status": "Legendary, not confirmed to exist"
        },
        {
          "name": "Gray Elf (Faerie)",
          "description": "Noble elves, the rarest and most powerful of their kind. They favor white, yellow, silver, or gold garments with cloaks often deep blue or purple.",
          "appearance": {
            "variant1": {"hair": "Silver", "eyes": "Amber"},
            "variant2": {"hair": "Pale golden", "eyes": "Violet", "name": "Faerie"}
          },
          "specialAbilities": {
            "intelligence": "+1 on dice roll",
            "wizardry": "Those with supra-genius abilities can become wizards"
          },
          "equipment": {
            "armor": "Chain mail and shield",
            "weapons": "All carry swords"
          },
          "mounts": {
            "hippogriffs": {"chance": "50% × 70%"},
            "griffons": {"number": "3-12", "chance": "50% × 30%"}
          },
          "behavior": "Very reclusive, live in isolated meadowlands, never associate with other humanoids (except elves) for long",
          "languages": "Same as high elves",
          "lifespan": "Beyond 1,500 years"
        },
        {
          "name": "Half-Elf",
          "description": "All half-elves are of human stock. Handsome folk with good features of each race. Slightly taller than average elf (5½') and weighing about 150 pounds.",
          "specialAbilities": {
            "secretDoors": "Detect as elves (⅓ to ½ chance)",
            "infravision": "Normal",
            "multiclass": "Can progress in two or three categories simultaneously"
          },
          "maxLevel": {
            "standard": "6/6/4 (fighter/magic-user/cleric)",
            "exceptional": {
              "strength17": "7th level fighter",
              "strength18": "8th level fighter",
              "intelligence17": "7th level magic-user",
              "intelligence18": "8th level magic-user"
            }
          },
          "languages": ["Goblin", "Orcish", "Gnoll", "Halflingish", "Gnomish", "Elvish", "Alignment", "Common"],
          "lifespan": "250 years"
        },
        {
          "name": "Wood Elf",
          "description": "Also called sylvan elves, very reclusive and generally avoid all contact (75%). Fair complexion with yellow to coppery red hair and light brown, light green, or hazel eyes. Wear russets, reds, brown and tans with green or greenish brown cloaks.",
          "specialAbilities": {
            "strength": "+1 to all die rolls (19 treated as 18)",
            "intelligence": "Slightly lower (18 treated as 17)"
          },
          "equipment": {
            "armor": "Studded leather or ring mail (AC 6)",
            "weapons": {
              "bows": "50%",
              "swords": "20%",
              "spears": "40%"
            }
          },
          "lairGuards": {
            "chance": "70%",
            "options": [
              {"type": "Giant owls", "number": "2-8", "chance": "80%"},
              {"type": "Giant lynx", "number": "1-6", "chance": "20%"}
            ]
          },
          "habitat": "Primaeval forests and distant woodlands",
          "languages": ["Elvish", "Certain woods animals", "Treant"],
          "alignment": "More neutral than other elves",
          "lifespan": "Several centuries"
        }
      ],
      "frequency": "Uncommon",
      "numberAppearing": "20-200",
      "size": "M (5'+ tall)",
      "move": "12\"",
      "armorClass": 5,
      "hitDice": "1+1",
      "TREASURE TYPE": "Individuals: N; Lair: G, S, T",
      "attacks": 1,
      "damage": "By weapon type",
      "specialAttacks": "+1 with normal bow or sword",
      "specialDefenses": "90% resistant to charm and sleep spells",
      "magicResistance": "90% to charm and sleep only",
      "lairProbability": "10%",
      "intelligence": "High and up",
      "alignment": "Chaotic good",
      "psionicAbility": "Nil",
      "specialAbilities": {
        "multiclass": "Able to operate in two or more classes simultaneously",
        "stealth": {
          "movement": "In natural surroundings can move silently (surprise on 1-4)",
          "invisibility": "Can blend into vegetation as long as not attacking"
        },
        "combat": "Can move, fire bows, and move back all in the same round",
        "senses": {
          "infravision": "60 ft",
          "secretDoors": "Note secret or hidden doors ⅓ to ½ of the time"
        },
        "languages": ["Common", "Alignment", "Elvish", "Halflingish", "Gnomish", "Goblin", "Orc", "Hobgoblin", "Gnoll"]
      },
      "leaders": {
        "per_20": {"level": "2nd or 3rd", "class": "fighter", "count": 1},
        "per_40": {"level": ["2nd or 3rd fighter", "1st or 2nd magic-user"], "count": 1},
        "over_100": [
          {"level": ["4th fighter", "8th magic-user"], "count": 1},
          {"level": ["4th fighter", "5th magic-user"], "count": 2},
          {"level": ["4th fighter", "4th magic-user", "4th cleric"], "count": 1}
        ],
        "over_160": {
          "main": [
            {"level": ["6th fighter", "9th magic-user"], "count": 1},
            {"level": ["6th fighter", "6th magic-user", "6th cleric"], "count": 1}
          ],
          "retainers": [
            {"level": ["4th fighter", "5th magic-user"], "count": 2},
            {"level": ["3rd fighter", "3rd magic-user", "3rd cleric"], "count": 2}
          ]
        },
        "lair_additional": [
          {"level": ["4th fighter", "7th magic-user"], "count": 1},
          {"level": "4th fighter", "count": "1 per 40 elves"},
          {"level": ["2nd fighter", "2nd magic-user", "2nd cleric"], "count": "1 per 40 elves"},
          {"level": "5th fighter", "count": 1},
          {"level": "6th fighter", "count": 1},
          "Females and young equal to 100% and 5% respectively"
        ],
        "magic_item_chance": "10% per level per class for usable items"
      },
      "dwelling": {
        "location": "Secluded copse, wood or forest",
        "guards": {"type": "Giant eagles", "number": "2-12", "chance": "65%"}
      },
      "equipment": {
        "armor": "Usually in scale, ring, or chain mail, most carry shields",
        "weaponDistribution": {
          "swordAndBow": "10%",
          "swordAndSpear": "20%",
          "sword": "20%",
          "twoHandedSword": "5%",
          "spear": "30%",
          "bow": "15%"
        }
      },
      "mounts": {
        "unicorns": {
          "riders": "Female fighters (elfmaids)",
          "number": "10-30",
          "chance": "5%"
        }
      },
      "treasure": {
        "individual": "N",
        "lair": "G, S, T"
      }
    },
    {
      "name": "Elves, Patrol (Foot)",
      "category": "Elves",
      "frequency": "Rare",
      "numberAppearing": "13d6+5",
      "size": "Man-sized",
      "move": "120 ft",
      "armorClass": "5 (varies by role)",
      "hitDice": "1 (base elves); variable for leaders",
      "TREASURE TYPE": "Individuals: N; Lair: G, S, T",
      "attacks": 1,
      "damage": "By weapon",
      "specialAttacks": "Magic and ranged attacks",
      "specialDefenses": "Resistance to charm and sleep (as elves); spells",
      "magicResistance": "Standard",
      "lairProbability": "5%",
      "intelligence": "Very to high",
      "alignment": "Neutral good or chaotic good",
      "levelXP": "Variable",
      "description": "Elven Patrols consist of elves and half-elves performing reconnaissance or defensive sweeps through their territory. While often mounted, some operate afoot depending on terrain. All carry bows and long swords, and are trained in stealth and woodland tactics. Leaders include fighter/magic-users and ranger-clerics. Patrols may ambush enemies and withdraw before engaging heavily.",
      "leaders": {
        "captain": {
          "level": "F/M-U, 4-6 / 5-7",
          "class": "fighter/magic-user",
          "count": 1
        },
        "lieutenants": {
          "level": "F/M-U, 3-5 / 4-6",
          "class": "fighter/magic-user",
          "count": 2
        },
        "serjeants": {
          "level": "3-5",
          "class": "fighter",
          "count": 4
        },
        "scout_half_elf": {
          "level": "C/R, 5 / 5-7",
          "class": "cleric/ranger",
          "count": 1
        },
        "scouts": {
          "level": "1-2",
          "class": "ranger",
          "count": 4
        }
      },
      "equipment": {
        "weapons": "All carry bows and long swords",
        "armor": "Standard elven chain (AC 5); leaders may have enchanted items",
        "magic_items": "5% per highest level for armor, shield, sword, potion, scroll"
      },
      "treasure": {
        "individual": "1d6 sp, 1d4 arrows (1 per level is magical)",
        "lair": {
          "gems": {"amount": "2d4", "chance": "50%"},
          "jewellery": {"amount": "1d6", "chance": "30%"},
          "magic_items": {"amount": 1, "chance": "20%"}
        }
      }
    },
    {
      "name": "Elves, Patrol (Mounted)",
      "category": "Elves",
      "name_variants": "Elven Patrol, Mounted Elves",
      "frequency": "Uncommon",
      "numberAppearing": "25d6", 
      "size": "Man-sized",
      "move": "120 ft",
      "armorClass": "4–5",
      "hitDice": "Varies by type",
      "TREASURE TYPE": "Individuals: N; Lair: G, S, T",
      "attacks": 1,
      "damage": "By weapon",
      "specialAttacks": "Surprise on 4-in-6 if in forested terrain",
      "specialDefenses": "Standard elven resistances; see Elves",
      "magicResistance": "Standard",
      "lairProbability": "5%",
      "intelligence": "High",
      "alignment": "Chaotic Good or Neutral Good",
      "levelXP": "Variable",
      "description": "Mounted Elven Patrols consist of elite warrior-spellcasters and scouts from elven realms, traveling on light and medium warhorses. They patrol wilderness borders, often with bows and swords, and rely on stealth, magic, and ambush tactics.",
      "leaders": {
        "captain": { "level": "4-6 / 5-7", "class": "fighter/magic-user", "count": 1 },
        "lieutenants": { "level": "3-5 / 4-6", "class": "fighter/magic-user", "count": 2 },
        "serjeants": { "level": "3-5", "class": "fighter", "count": 4 },
        "scout_leader": { "level": "5 / 5-7", "class": "cleric/ranger", "count": 1 },
        "scouts": { "level": "1-2", "class": "ranger", "count": 4 },
        "troopers": { "level": 1, "class": "fighter", "count": "13-18" }
      },
      "equipment": {
        "armor_and_weapons": {
          "captain": "AC 4; bow, long sword, spells",
          "lieutenants": "AC 5; bow, long sword, spells",
          "serjeants": "AC 4; bow, long sword, mace",
          "scouts": "AC 5; bow, long sword",
          "troopers": "AC 5; bow, long sword"
        },
        "mounts": {
          "captain": "Medium warhorse",
          "lieutenants": "Medium warhorse",
          "serjeants": "Light warhorse",
          "scouts": "Light warhorse",
          "troopers": "Mix of light/medium warhorses"
        }
      },
      "treasure": {
        "individual": "1d6 gp",
        "group": {
          "gems": { "amount": "2d10", "chance": "30%" },
          "magic_items": { "chance": "5% per level of leader" }
        }
      }
    },
    
    {
      "name": "Elves, Knights",
      "category": "Elves",
      "name_variants": "Elven Knights, Knights of the Hart",
      "frequency": "Rare",
      "numberAppearing": "15d6+1d6",
      "size": "Man-sized",
      "move": "120 ft",
      "armorClass": "3 (Knights), 4 (Esquires), 5 (Serjeants)",
      "hitDice": "2 (all knights are Level 2 fighters at minimum)",
      "TREASURE TYPE": "Individuals: N; Lair: G, S, T",
      "attacks": 1,
      "damage": "By weapon",
      "specialAttacks": "Magic-users may cast spells",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "15%",
      "intelligence": "High",
      "alignment": "Chaotic Good",
      "levelXP": "Variable by class and level",
      "description": "Elven Knights are mounted warriors of the Knights of the Hart. Parties include knights, esquires, serjeants, and elven fighter/magic-users. Knights ride medium, barded warhorses; esquires ride medium warhorses; serjeants ride light warhorses. Units are well-equipped and may possess magical items based on level.",
      "leaders": {
        "commander": { "level": "7/7", "class": "fighter/cleric", "count": 1 },
        "lieutenant": { "level": "6/6", "class": "fighter/cleric", "count": 1 },
        "knights": { "level": "5/5", "class": "fighter/cleric", "count": "5d4" },
        "magic_user": {
          "main": { "level": "4-6/8-11", "class": "fighter/magic-user", "count": 1 },
          "assistants": { "level": "3-5/4-7", "class": "fighter/magic-user", "count": "1d3" }
        },
          "serjeant": {
            "level": 2,
            "class": "fighter",
            "count": "3-12 per knight"
          },
        "entourage": {
          "esquire": { "level": "3-4/3-4", "class": "fighter/cleric", "count": "1d4 per knight" },
          "serjeants": { "level": 2, "class": "fighter", "count": "3d4 per knight" }
        }
      },
      "equipment": {
        "mounts_armor_weapons": {
          "knights": "Medium barded horse, shield, lance, long sword, mace",
          "esquires": "Medium horse, shield, lance, long sword, mace",
          "serjeants": "Light horse, bow, long sword, mace",
          "magic_users": "Same armor as esquires; bow, long sword"
        },
        "magic_item_chance": "5% per level of highest class (armor, shield, sword, potion, scroll, ring, rod)",
        "magic_arrow_count": "1 per highest level for bow-armed elves"
      },
      "treasure": {
        "individual": "1d8 gp",
        "lair": {
          "gems": { "amount": "2d6", "chance": "40%" },
          "magic_items": { "amount": 1, "chance": "25%" }
        }
      }
    },
    
    {
      "name": "Ettercap",
      "category": "Aberration",
      "variants": [
        {
          "name": "Ettercap",
          "description": "Grotesque humanoid-arachnid hybrids that spin silk from stubby tails and construct web-based traps and snares around their lairs. They are cunning ambush predators.",
          "appearance": {
            "size": "Man-sized",
            "features": "Arachnid face, silk-spinning tail"
          },
          "behavior": {
            "alignment": "Neutral evil",
            "intelligence": "Semi-",
            "habitat": "Underground or forested lairs",
            "tactics": "Sets traps using silk; may use lassos or garrottes"
          },
          "combat": {
            "attacks": 3,
            "damage": "1d4 / 1d4 / 1d8",
            "specialAttacks": "Poisonous bite"
          }
        }
      ],
      "frequency": "Rare",
      "numberAppearing": "1d2",
      "size": "Man-sized",
      "move": "120 ft",
      "armorClass": 6,
      "hitDice": "5+1",
      "TREASURE TYPE": "Nil",
      "attacks": 3,
      "damage": "1d4 / 1d4 / 1d8",
      "specialAttacks": "Poison",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "30%",
      "intelligence": "Semi-",
      "alignment": "Neutral evil",
      "levelXP": "4/150 + 5/hp",
      "treasure": "None"
    },
    {
      "name": "Executioner’s Hood",
      "category": "Aberration",
      "variants": [
        {
          "name": "Executioner’s Hood",
          "description": "A small, amorphous predator that drops from ceilings and envelops a victim’s head, attempting to strangle them to death.",
          "appearance": {
            "size": "Small",
            "form": "Amorphous, flaccid mass with strong muscular body"
          },
          "behavior": {
            "alignment": "Neutral evil",
            "intelligence": "Semi-",
            "habitat": "Underground or ruin ceilings",
            "tactics": "Ambush drop, then auto-hit while latched on"
          },
          "combat": {
            "attacks": 1,
            "damage": "1d4 per round (if attached)",
            "specialAttacks": "Auto-hit while attached; only removable by alcohol or death"
          },
          "defenses": {
            "note": "Attacks targeting the creature also affect the victim"
          }
        }
      ],
      "frequency": "Rare",
      "numberAppearing": "1",
      "size": "Small",
      "move": "60 ft",
      "armorClass": 6,
      "hitDice": "3 to 6",
      "TREASURE TYPE": "Nil",
      "attacks": 1,
      "damage": "1d4",
      "specialAttacks": "Latch-on suffocation",
      "specialDefenses": "Must be bathed in alcohol or slain to remove",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Semi-",
      "alignment": "Neutral evil",
      "levelXP": "4/250 + 4/hp",
      "treasure": "None"
    },
    {
      "name": "Eye of the Deep",
      "category": "Aberration",
      "variants": [
        {
          "name": "Eye of the Deep",
          "description": "An aquatic beholder-like horror with powerful eye magic, massive claws, and a central eye that stuns its prey. It lurks in deep waters or sunken ruins.",
          "appearance": {
            "size": "Large (4 ft diameter)",
            "features": "Floating orb with central eye, 2 eyestalks, lobster claws"
          },
          "behavior": {
            "alignment": "Lawful evil",
            "intelligence": "Very",
            "habitat": "Underwater lairs or ruins",
            "abilities": [
              "Central eye: 30 ft cone, stun 2d4 rounds (save vs magic item)",
              "Left eyestalk: Hold monster",
              "Right eyestalk: Hold person",
              "Both eyestalks: Phantasmal force"
            ]
          },
          "combat": {
            "attacks": 3,
            "damage": "2d4 / 2d4 / 1d6",
            "magicUse": "Spell-like powers usable every round"
          },
          "treasure": {
            "gp": "2d6×1,000 (50%)",
            "pp": "1d4×1,000 (40%)",
            "gems": "4d10 (40%)",
            "jewellery": "2d6 (35%)"
          }
        }
      ],
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Large",
      "move": "60 ft swimming",
      "armorClass": 5,
      "hitDice": 11,
      "attacks": 3,
      "damage": "2d4 / 2d4 / 1d6",
      "specialAttacks": "Stun cone, hold monster/person, phantasmal force",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "20%",
      "intelligence": "Very",
      "alignment": "Lawful evil",
      "levelXP": "9/3,000 + 16/hp"
    },
    {
      "name": "Ettin",
      "category": "Giants",
      "name_variants": "",
      "frequency": "Very rare",
      "numberAppearing": "1d4",
      "size": "Large (13 ft +)",
      "move": "120 ft",
      "armorClass": 3,
      "hitDice": 10,
      "TREASURE TYPE": "Individuals: O, C; Lair: Y",
      "attacks": 2,
      "damage": "2d8/3d6",
      "specialAttacks": "None",
      "specialDefenses": "Rarely surprised (dual heads)",
      "magicResistance": "Standard",
      "lairProbability": "20%",
      "intelligence": "Low",
      "alignment": "Chaotic evil",
      "levelXP": "7/1,370 + 14/hp",
      "description": "Ettins are large, nocturnal creatures that live below ground. They have two heads, each of which controls one arm. They are dirty creatures that wear tattered skins and often use wicked weapons, such as barbed clubs. They share some affinity to orcs, witnessed in their pig-like faces.",
      "specialAbilities": {
        "dualHeads": "Seldom surprised because one head or the other is usually keeping watch",
        "asymmetricAttacks": "Right arm (dominant) causes 3d6 damage, left arm causes 2d8"
      },
      "treasure": {
        "individual": {
          "gp": {"amount": "2d10", "chance": "100%"},
          "gems": {"amount": "1d6", "chance": "25%"},
          "jewellery": {"amount": "1d4", "chance": "20%"},
          "magic_items": {"amount": 2, "chance": "100%"}
        },
        "lair": {
          "gp": {"amount": "2d6×1,000", "chance": "70%"}
        }
      }
    },
    {
      "name": "Fish, Giant",
      "category": "Animal",
      "variants": [
        {
          "type": "Gar, Giant",
          "frequency": "Rare",
          "numberAppearing": "1d6",
          "size": "Large",
          "move": "300 ft swimming",
          "armorClass": 3,
          "hitDice": 8,
          "TREASURE TYPE": "Nil",
          "attacks": 1,
          "damage": "2d10",
          "specialAttacks": "See below",
          "specialDefenses": "Nil",
          "levelXP": "6/575+4/hp"
        },
        {
          "type": "Pike, Giant",
          "frequency": "Rare",
          "numberAppearing": "1d8",
          "size": "Large",
          "move": "300 ft swimming",
          "armorClass": 5,
          "hitDice": 4,
          "TREASURE TYPE": "Nil",
          "attacks": 1,
          "damage": "3d6",
          "specialAttacks": "Surprise",
          "specialDefenses": "Nil",
          "levelXP": "4/90+10/hp"
        },
        {
          "type": "Leviathan",
          "frequency": "Very rare",
          "numberAppearing": "1",
          "size": "Huge",
          "move": "300 ft swimming",
          "armorClass": 6,
          "hitDice": 24,
          "TREASURE TYPE": "Nil",
          "attacks": 1,
          "damage": "5d4",
          "specialAttacks": "Swallow whole on 1-4",
          "specialDefenses": "Nil",
          "levelXP": "9/5,000+24/hp"
        }
      ],
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "treasure": "None",
      "description": "Giant gar inhabit deep rivers and lakes. They can swallow man-sized prey whole on a roll of 20. Swallowed victims have a cumulative 5% chance per segment of drowning but may cut themselves free by dealing 25% of the gar's HP in damage. Giant pike are aggressive deep-lake predators that often guard nixies' lairs and surprise prey on 1-4 on 1d6. Leviathans are enormous fish that can capsize vessels and swallow victims whole on a failed save vs. death."
    },

    {
      "name": "Flind",
      "category": "Humanoid",
      "frequency": "Rare",
      "numberAppearing": "2d12",
      "size": "Man-sized",
      "move": "120 ft",
      "armorClass": 5,
      "hitDice": "2+3",
      "TREASURE TYPE": "A",
      "attacks": 1,
      "damage": "2d4 or by weapon",
      "specialAttacks": "Disarm (25% chance to wield flindbar)",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "20%",
      "intelligence": "Average",
      "alignment": "Chaotic evil",
      "levelXP": "2/40+4/hp",
      "description": "Stronger kin of gnolls. Often lead gnoll bands. May use flindbars (special disarming weapons). Dislike trolls.",
      "leaders": {
        "over_20": "1 leader (3+3 HD, STR 18, CHA 18 to gnolls); uses flindbar"
      },
      "languages": ["gnoll", "bugbear", "hobgoblin", "ogrish", "orcish"],
      "treasure": {
        "individual": "1d6 gp",
        "lair": {
          "cp": {"amount": "1d6×1,000", "chance": "30%"},
          "sp": {"amount": "1d6×1,000", "chance": "25%"},
          "ep": {"amount": "2d4×1,000", "chance": "35%"},
          "gp": {"amount": "1d10×1,000", "chance": "45%"},
          "pp": {"amount": "1d4×100", "chance": "20%"},
          "gems": {"amount": "5d8", "chance": "50%"},
          "jewellery": {"amount": "4d12", "chance": "65%"},
          "magic": {"amount": "3 items or maps", "chance": "25%"}
        }
      }
    },
    {
      "name": "Fly, Giant",
      "category": "Giant Insect",
      "variants": [
        {
          "name": "Blow Fly, Giant",
          "description": "Large, metallic green or blue flies attracted to carrion, blood, and sweet substances. They rarely attack the living unless blood is present.",
          "appearance": {
            "size": "Medium",
            "color": "Metallic green or blue with coarse black hairs and dark orange eyes"
          },
          "behavior": {
            "alignment": "Neutral",
            "intelligence": "Non-",
            "habitat": "Areas of decay, waste, or spoiled food",
            "tactics": "Hover, land to bite, leap away defensively"
          },
          "combat": {
            "attacks": 1,
            "damage": "1d8+1",
            "specialAttacks": "10% chance of disease with bite",
            "defenses": "Leap-jump 30 ft and hover (non-retreating)"
          }
        },
        {
          "name": "Horsefly, Giant",
          "description": "Aggressive bloodsuckers with tan and brown coloration. They land to bite warm-blooded creatures and feed continuously if not driven off.",
          "appearance": {
            "size": "Large (9 ft long)",
            "color": "Flat tan and brown with shiny brown eyes"
          },
          "behavior": {
            "alignment": "Neutral",
            "intelligence": "Non-",
            "habitat": "Any warm-blooded prey territory",
            "tactics": "Attack with bite, drain blood next round"
          },
          "combat": {
            "attacks": 1,
            "damage": "2d6",
            "specialAttacks": "Inflicts same damage next round unless interrupted",
            "defenses": "Leap 30 ft and hover"
          }
        }
      ],
      "frequency": {
        "Blow Fly": "Rare",
        "Horsefly": "Very rare"
      },
      "numberAppearing": {
        "Blow Fly": "1d12",
        "Horsefly": "1d6"
      },
      "move": "90 ft; 300 ft flying (AA:III)",
      "armorClass": {
        "Blow Fly": 6,
        "Horsefly": 5
      },
      "hitDice": {
        "Blow Fly": 3,
        "Horsefly": 6
      },
      "attacks": 1,
      "damage": {
        "Blow Fly": "1d8+1",
        "Horsefly": "2d6"
      },
      "specialAttacks": "Disease (Blow Fly), Blood Drain (Horsefly)",
      "specialDefenses": "Leap/hover avoidance",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": {
        "Blow Fly": "3/40 + 3/hp",
        "Horsefly": "4/165 + 6/hp"
      },
      "TREASURE TYPE": "Nil",
      "treasure": "None"
    },
    {
      "name": "Frog, Giant",
      "category": "Animal",
      "frequency": "Uncommon",
      "numberAppearing": "5d8",
      "size": "Small to medium",
      "move": "30 ft; 90 ft swimming",
      "armorClass": 7,
      "hitDice": "1 to 3",
      "TREASURE TYPE": "Nil",
      "attacks": "1",
      "damage": "1d3, 1d6 or 2d4",
      "specialAttacks": "Tongue attack, swallow",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": "1/10 +5/hp, 2/30 +10/hp, 3/50 +15/hp",
      "treasure": "None",
      "description": "Giant frogs can be 2, 4, or 6 ft in length. Found in similar habitats to normal frogs, they have camouflage and surprise on a roll of 1-4 on 1d6. They jump vast distances, shoot sticky tongues to attack, and may attempt to drag smaller victims into their mouths. If they score a natural 20, they can swallow prey whole."
    },
    {
      "name": "Fungi, Violet",
      "category": "Plant",
      "variants": [
        {
          "name": "Violet Fungi",
          "description": "Fungal creatures resembling shriekers, with waving rot-spore branches that cause rapid tissue decay. Often found in dungeon environments.",
          "appearance": {
            "size": "Small to medium (4–7 ft tall)",
            "structure": "1d4 rot-spore branches, length = height in ft"
          },
          "behavior": {
            "alignment": "Neutral",
            "intelligence": "Non-",
            "habitat": "Underground areas; often with shriekers",
            "tactics": "Detects movement, waves branches to release rot spores"
          },
          "combat": {
            "attacks": "1d4",
            "damage": "Save vs poison or rot flesh in 1 round",
            "specialAttacks": "Rot spores require cure disease if failed save"
          }
        }
      ],
      "frequency": "Rare",
      "numberAppearing": "1d4",
      "size": "Small to Medium",
      "move": "10 ft",
      "armorClass": 7,
      "hitDice": 3,
      "TREASURE TYPE": "Nil",
      "attacks": "1d4",
      "damage": "Rot flesh (Save vs poison)",
      "specialAttacks": "Rotting spores",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": "3/50 + 1/hp",
      "treasure": "None"
    },
    {
      "name": "Gargoyle",
      "category": "Magical Beast",
      "variants": [
        {
          "name": "Gargoyle",
          "description": "Malicious, horned winged humanoids made of enchanted stone. Gargoyles lie in wait, blending into masonry before springing to attack with tooth, claw, and horn.",
          "appearance": {
            "size": "Man-sized",
            "form": "Grotesque stone-skinned creature with wings and a horn"
          },
          "behavior": {
            "alignment": "Chaotic evil",
            "intelligence": "Low",
            "habitat": "Ruins, dungeons, ancient towers",
            "tactics": "Attack any living creature 90% of the time"
          },
          "combat": {
            "attacks": 4,
            "damage": "1d3 / 1d3 / 1d6 / 1d4",
            "specialDefenses": "Only hit by +1 or better magical weapons"
          }
        }
      ],
      "frequency": "Uncommon",
      "numberAppearing": "2d8",
      "size": "Man-sized",
      "move": "90 ft; 150 ft flying (AA:IV)",
      "armorClass": 5,
      "hitDice": "4+4",
      "TREASURE TYPE": "Individuals: M (x10); Lair: C",
      "attacks": 4,
      "damage": "1d3 / 1d3 / 1d6 / 1d4",
      "specialAttacks": "None",
      "specialDefenses": "+1 or better weapon to hit",
      "magicResistance": "Standard",
      "lairProbability": "20%",
      "intelligence": "Low",
      "alignment": "Chaotic evil",
      "levelXP": "4/155 + 4/hp",
      "treasure": "None"
    },
    {
      "name": "Gelatinous Cube",
      "category": "Ooze",
      "variants": [
        {
          "name": "Gelatinous Cube",
          "description": "Transparent dungeon scavenger that silently glides through corridors absorbing organic matter. Nearly invisible, it paralyzes with its touch.",
          "appearance": {
            "size": "Large (10 ft cube)",
            "form": "Gelatinous, nearly invisible cube"
          },
          "behavior": {
            "alignment": "Neutral",
            "intelligence": "Non-",
            "habitat": "Dungeon corridors, ruins",
            "tactics": "Absorbs paralyzed prey, surprises on 1–3 in 6"
          },
          "combat": {
            "attacks": 1,
            "damage": "2d4",
            "specialAttacks": "Paralysis (3d6+2 rounds, save vs paralysis)"
          },
          "defenses": {
            "immunities": [
              "Electricity",
              "Fear",
              "Sleep",
              "Hold",
              "Paralysis",
              "Polymorph"
            ],
            "resistance": {
              "Cold": "1d4 damage max, save negates",
              "Fire": "Normal resistance"
            }
          },
          "treasure": "Incidental (items suspended within)"
        }
      ],
      "frequency": "Uncommon",
      "numberAppearing": "1",
      "size": "Large",
      "move": "60 ft",
      "armorClass": 8,
      "hitDice": 4,
      "TREASURE TYPE": "J, K, L, M, N, Q",
      "attacks": 1,
      "damage": "2d4",
      "specialAttacks": "Paralyzing touch, surprise 1-3 in 6",
      "specialDefenses": "See description",
      "magicResistance": "Normal",
      "lairProbability": "Nil",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": "3/150 + 4/hp"
    },
    {
      "name": "Genie",
      "category": "Extraplanar",
      "variants": [
        {
          "name": "Genie",
          "description": "Noble elemental beings from the Plane of Air. Capable of powerful magic and physical strength, often encountered when summoned or bound into service.",
          "appearance": {
            "size": "Large",
            "form": "Humanoid with swirling vapor lower half or fully solid form"
          },
          "behavior": {
            "alignment": "Chaotic good",
            "intelligence": "Average to high",
            "habitat": "Elemental Plane of Air, occasionally the Astral or Prime Material",
            "abilities": [
              "Invisible or gaseous form at will",
              "Wind walking, whirlwind form (2d6 dmg to all <2 HD)",
              "Create food, water, cloth, wood, metal (non-permanent)",
              "Create illusion (sight and sound)",
              "Can carry up to 600 lbs indefinitely; 1,200 lbs briefly"
            ]
          },
          "combat": {
            "attacks": 1,
            "damage": "2d8",
            "specialAttacks": "Whirlwind form (once/round, 2d6 dmg, kills <2 HD instantly)"
          },
          "variants": {
            "Noble Genie": {
              "hitDice": "10 HD",
              "damage": "3d8",
              "whirlwindDamage": "3d6",
              "special": "Grants 3 wishes when subdued"
            }
          },
          "communication": "Genie language and telepathy"
        }
      ],
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Large",
      "move": "90 ft; 240 ft flying (AA:VI)",
      "armorClass": 4,
      "hitDice": "7+3",
      "TREASURE TYPE": "Nil",
      "attacks": 1,
      "damage": "2d8",
      "specialAttacks": "Magical abilities, whirlwind",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Average to high",
      "alignment": "Chaotic good",
      "levelXP": "5/350 + 8/hp",
      "treasure": "None"
    },
    {
      "name": "Ghast",
      "category": "Undead",
      "turnResistance": 6,
      "frequency": "Rare",
      "numberAppearing": "1d6",
      "size": "Man-sized",
      "move": "150 ft",
      "armorClass": 4,
      "hitDice": "4",
      "TREASURE TYPE": "B, Q, R, S, T",
      "attacks": "3",
      "damage": "1d4/1d4/1d8",
      "specialAttacks": "Paralysation, Stench",
      "specialDefenses": "Standard undead immunities",
      "magicResistance": "Standard",
      "lairProbability": "10%",
      "intelligence": "Very",
      "alignment": "Chaotic evil",
      "levelXP": "4/195 +4/hp",
      "treasure": {
        "cp": {"amount": "1d8×1,000", "chance": "50%"},
        "sp": {"amount": "1d6×1,000", "chance": "25%"},
        "ep": {"amount": "1d4×1,000", "chance": "25%"},
        "gp": {"amount": "1d12×1,000", "chance": "65%"},
        "pp": {"amount": "1d6×1,000", "chance": "30%"},
        "gems": {"amount": "3d8", "chance": "50%"},
        "jewellery": {"amount": "2d6", "chance": "50%"},
        "magic_items": {"amount": "1-2", "chance": "25%"}
      },
      "description": "These terrible creatures are more powerful versions of ghouls, distinguished by their terrible stench that requires a save vs poison to avoid retching and -2 to all actions. They can ignore protection from evil unless combined with certain pure metals. Ghasts share ghouls' spell immunities and can travel dream-realms to reach the prime material and lower planes."
    },
    {
      "name": "Ghost",
      "category": "Undead",
      "turnResistance": 11,
      "frequency": "Very Rare",
      "numberAppearing": "1",
      "size": "Man-sized",
      "move": "90 ft hovering",
      "armorClass": "0 when manifest/special",
      "hitDice": "10+4",
      "TREASURE TYPE": "E, S",
      "attacks": "1",
      "damage": "Special",
      "specialAttacks": "Wither; Magic Jar",
      "specialDefenses": "Magic weapons or special metals required to hit when manifest; immune to spells when aethereal unless the caster is also aethereal",
      "magicResistance": "As above",
      "lairProbability": "25%",
      "intelligence": "High",
      "alignment": "Any evil",
      "levelXP": "8/4200 +14/hp",
      "treasure": {
        "cp": {"amount": "1d10×1,000", "chance": "5%"},
        "sp": {"amount": "2d6×1,000", "chance": "30%"},
        "ep": {"amount": "1d6×1,000", "chance": "25%"},
        "gp": {"amount": "2d4×1,000", "chance": "25%"},
        "gems": {"amount": "2d6", "chance": "15%"},
        "jewellery": {"amount": "1d6", "chance": "20%"},
        "magic_items": {"amount": "1d3-1", "chance": "30%"}
      },
      "description": "Ghosts are evil human spirits denied passage to the outer planes. They exist partially in the aethereal plane, allowing them to drain life from victims. Witnessing a ghost requires a saving throw vs magic or flee in panic while aging 3d6 years. The ghost's touch ages victims 7d6 years. They can possess victims via magic jar and manifest physically, then only harmed by magic weapons or pure metals."
    },
    {
      "name": "Ghoul",
      "category": "Undead",
      "turnResistance": 3,
      "frequency": "Uncommon",
      "numberAppearing": "4d6",
      "size": "Man-sized",
      "move": "90 ft loping",
      "armorClass": 6,
      "hitDice": "2",
      "TREASURE TYPE": "B, T",
      "attacks": "3",
      "damage": "1d3/1d3/1d6",
      "specialAttacks": "Paralysation",
      "specialDefenses": "Immune to sleep and charm spells",
      "magicResistance": "Standard",
      "lairProbability": "20%",
      "intelligence": "Low",
      "alignment": "Chaotic evil",
      "levelXP": "3/70 +2/hp",
      "treasure": {
        "cp": {"amount": "1d8×1,000", "chance": "50%"},
        "sp": {"amount": "1d6×1,000", "chance": "25%"},
        "ep": {"amount": "1d4×1,000", "chance": "25%"},
        "gp": {"amount": "1d3×1,000", "chance": "25%"},
        "gems": {"amount": "2d4", "chance": "30%"},
        "jewellery": {"amount": "1d4", "chance": "20%"},
        "magic_items": {"amount": "1", "chance": "10%"}
      },
      "description": "Ghouls are humans who became undead by feasting on corpses or being killed by another ghoul. Any human or demihuman (except elves) attacked by a ghoul must save or be paralyzed for 3d4 turns. Protection from evil keeps them at bay unless the circle is violated. Marine ghouls called 'lacedons' sometimes dwell in shipwrecks."
    },
    
    {
      "name": "Giant, Cloud",
      "category": "Giants",
      "name_variants": "Cloud Giant",
      "frequency": "Rare",
      "numberAppearing": "1d6",
      "size": "L (18' tall)",
      "move": "15\"",
      "armorClass": 2,
      "hitDice": "12 + 1d6+1",
      "TREASURE TYPE": "E, Q (x5)",
      "attacks": 1,
      "damage": "6d6",
      "specialAttacks": "Hurling rocks for 2-24 hit points",
      "specialDefenses": "Surprised only on 1",
      "magicResistance": "Standard",
      "lairProbability": "40%",
      "intelligence": "Average to very",
      "alignment": "Neutral (good 50%, evil 50%)",
      "levelXP": "8/3,520 + 16/hp",
      "description": "Cloud giants usually reside in crude castles built atop mountains or on magical cloud islands. They have pale blue white to light blue skin, silver white or brass colored hair, and wear various items of clothing and jewelry. They are armed with great clubs.",
      "specialAbilities": {
        "rockThrowing": {
          "range": "1\"-24\"",
          "damage": "2-24"
        },
        "catchMissiles": "60% chance",
        "senseOfSmell": "Surprised only on a roll of 1",
        "levitate": "10% of cloud giants can levitate themselves and additional weight of up to 20,000 gold pieces twice per day"
      },
      "pets": {
        "type": "Spotted lions",
        "number": "1-4",
        "chance": "60%"
      },
      "treasure": "E, Q (X5)"
    },
    {
      "name": "Giant, Fire",
      "category": "Giants",
      "name_variants": "Fire Giant",
      "frequency": "Uncommon",
      "numberAppearing": "1d8",
      "size": "L (12' tall)",
      "move": "12\"",
      "armorClass": 3,
      "hitDice": "11 + 1d4+1",
      "TREASURE TYPE": "E",
      "attacks": 1,
      "damage": "5d6",
      "specialAttacks": "Hurling rocks for 2-20 hit points",
      "specialDefenses": "Impervious to fire",
      "magicResistance": "Standard",
      "lairProbability": "35%",
      "intelligence": "Average to low",
      "alignment": "Lawful evil",
      "levelXP": "7/2,720 + 16/hp",
      "description": "Fire giants are very broad (about 6' at the shoulders), looking almost like dwarves. Their skins are coal black, hair is flaming red or bright orange, and eyes are deep red. Their teeth are usually yellow orange. They wear armor or dragon hides. They favor huge swords.",
      "specialAbilities": {
        "rockThrowing": {
          "range": "1\"-20\"",
          "damage": "2-20"
        },
        "catchMissiles": "50% chance",
        "fireImmunity": "Impervious to fire, even red dragon breath"
      },
      "pets": {
        "type": "Hell hounds (largest size)",
        "number": "1-4",
        "chance": "25%"
      },
      "treasure": "E"
    },
    {
      "name": "Giant, Frost",
      "category": "Giants",
      "name_variants": "Frost Giant",
      "frequency": "Rare",
      "numberAppearing": "1d8",
      "size": "L (15' tall)",
      "move": "12\"",
      "armorClass": 4,
      "hitDice": "10 + 1d4",
      "TREASURE TYPE": "E",
      "attacks": 1,
      "damage": "4d6",
      "specialAttacks": "Hurling rocks for 2-20 hit points",
      "specialDefenses": "Impervious to cold",
      "magicResistance": "Standard",
      "lairProbability": "30%",
      "intelligence": "Average to low",
      "alignment": "Chaotic evil",
      "levelXP": "7/1,820 + 14/hp",
      "description": "Frost giants have dead white or ivory skin color, blue-white or yellow hair, and pale blue or yellow eyes. Their build is basically similar to a muscular human, with appropriate size differences. Frost giants wear armor and bear arms similar to those of humans of the northern barbarian sort.",
      "specialAbilities": {
        "rockThrowing": {
          "range": "1\"-20\"",
          "damage": "2-20"
        },
        "catchMissiles": "40% chance",
        "coldImmunity": "Impervious to cold, even white dragon breath"
      },
      "pets": {
        "type": "Winter wolves",
        "number": "1-6",
        "chance": "50%"
      },
      "treasure": "E"
    },
    {
      "name": "Giant, Hill",
      "category": "Giants",
      "name_variants": "Hill Giant",
      "frequency": "Common",
      "numberAppearing": "1d10",
      "size": "L (10½' tall)",
      "move": "12\"",
      "armorClass": 4,
      "hitDice": "8 + 1d2",
      "TREASURE TYPE": "D",
      "attacks": 1,
      "damage": "2d8",
      "specialAttacks": "Hurling rocks for 2-16 hit points",
      "specialDefenses": "",
      "magicResistance": "Standard",
      "lairProbability": "25%",
      "intelligence": "Low",
      "alignment": "Chaotic evil",
      "levelXP": "6/1,200 + 12/hp",
      "description": "Hill giants have tan to reddish brown skins, brown to black hair, and red-rimmed eyes. They typically dress in rough hides or skins. They use any form of weapon available but favor clubs.",
      "specialAbilities": {
        "rockThrowing": {
          "range": "1\"-20\"",
          "damage": "2-16"
        },
        "catchMissiles": "30% chance",
        "languages": "50% speak ogre"
      },
      "pets": {
        "options": [
          {
            "type": "Dire wolves",
            "number": "2-8",
            "chance": "50% × 50%"
          },
          {
            "type": "Giant lizards",
            "number": "1-3",
            "chance": "50% × 30%"
          },
          {
            "type": "Ogres",
            "number": "2-8",
            "chance": "50% × 20%"
          }
        ]
      },
      "treasure": "D"
    },
    {
      "name": "Giant, Stone",
      "category": "Giants",
      "name_variants": "Stone Giant",
      "frequency": "Uncommon",
      "numberAppearing": "1d8",
      "size": "L (12' tall)",
      "move": "12\"",
      "armorClass": 0,
      "hitDice": "9 + 1d4",
      "TREASURE TYPE": "D",
      "attacks": 1,
      "damage": "3-18",
      "specialAttacks": "Hurling rocks for 3-30 hit points",
      "specialDefenses": "",
      "magicResistance": "Standard",
      "lairProbability": "30%",
      "intelligence": "Average",
      "alignment": "Neutral",
      "levelXP": "7/1,500 + 14/hp",
      "description": "With their gray to gray-brown skins, dark gray to blue-gray hair, and metallic-looking eyes (silver to steel), stone giants are both striking in appearance and able to blend easily into stoney settings. The latter effect is enhanced by their choice of rock-colored garments. Stone giants are typically armed with stone weapons.",
      "specialAbilities": {
        "rockThrowing": {
          "range": "1\"-30\"",
          "damage": "3-30"
        },
        "catchMissiles": "90% chance"
      },
      "pets": {
        "type": "Cave bears",
        "number": "1-4",
        "chance": "75%"
      },
      "treasure": "D"
    },
    {
      "name": "Giant, Storm",
      "category": "Giants",
      "name_variants": "Storm Giant",
      "frequency": "Rare",
      "numberAppearing": "1d4",
      "size": "L (21' tall)",
      "move": "15\"",
      "armorClass": 1,
      "hitDice": "15+1d6+1",
      "TREASURE TYPE": "E, Q (x10), S",
      "attacks": 1,
      "damage": "7d6",
      "specialAttacks": "Lightning bolt (8d8) once per day, weather control spells",
      "specialDefenses": "Impervious to electrical energy",
      "magicResistance": "Standard",
      "lairProbability": "55%",
      "intelligence": "Exceptional",
      "alignment": "Chaotic good",
      "levelXP": "9/6,000 + 20/hp",
      "description": "The skin coloration of storm giants ranges from pale light green to violet, the former being typical of those specimens which are marine. Green colored storm giants have dark green hair and emerald green eyes, while other storm giants tend towards deep violet or blue-black hair coloration with silvery gray or purple eyes.",
      "specialAbilities": {
        "lightningBolt": "8d8 damage once per day",
        "spells": {
          "daily": ["Predict weather", "Call lightning (3 bolts of 10-15d6 each)", "Control winds", "Weather summoning"]
        },
        "levitate": "Twice per day, lifting weights up to 30,000 gold pieces",
        "underwaterBreathing": "Able to breathe normally underwater",
        "electricalImmunity": "Not harmed by electrical energy, including blue dragon breath"
      },
      "pets": {
        "options": [
          {
            "habitat": "Cloud islands or mountain peaks",
            "pets": [
              {
                "type": "Rocs",
                "number": "1-2",
                "chance": "30% × 70%",
                "note": "Also used as riding animals"
              },
              {
                "type": "Griffons",
                "number": "1-4",
                "chance": "30% × 30%"
              }
            ]
          },
          {
            "habitat": "Underwater",
            "pets": {
              "type": "Sea lions",
              "number": "2-8",
              "chance": "30% × 10%"
            }
          }
        ]
      },
      "habitats": [
        {
          "type": "Cloud islands",
          "chance": "60%"
        },
        {
          "type": "Mountain peaks",
          "chance": "30%"
        },
        {
          "type": "Underwater",
          "chance": "10%"
        }
      ],
      "treasure": "E, Q (X10), S"
    },
    {
      "name": "Gnoll",
      "category": "Humanoid",
      "frequency": "Uncommon",
      "numberAppearing": "20d10",
      "size": "Large",
      "move": "90 ft",
      "armorClass": 5,
      "hitDice": 2,
      "TREASURE TYPE": "Individuals: L, M; Lair: D, Q (x5), S",
      "attacks": 1,
      "damage": "2d4 or by weapon",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "20%",
      "intelligence": "Low to average",
      "alignment": "Chaotic evil",
      "levelXP": "2/30+2/hp",
      "description": "Hyena-faced humanoids. Often led by Flinds. Use scavenged armor. Infravision 60 ft. Speak gnoll, troll, orc, hobgoblin, and chaotic evil.",
      "leaders": {
        "per_20": {"count": 1, "hd": 3, "hp": 16, "note": "Leader, fights as 3 HD"},
        "over_100": {
          "chieftain": {"count": 1, "hd": 4, "hp": 22, "ac": 3, "damage": "2d4+2", "note": "Fights as 4 HD"},
          "guards": {"count": "2d6", "hd": 3, "hp": 20, "ac": 4, "damage": "2d4+1"}
        },
        "lair": {
          "females": "50% of males",
          "young": "200% of males",
          "flind": "20% chance of 1 flind leading the tribe"
        }
      },
      "equipment": {
        "weapons_distribution": {
          "sword_pole_arm": "20%",
          "sword_morning_star": "10%",
          "two_handed_sword": "10%",
          "pole_arm": "20%",
          "morning_star_spear": "10%",
          "spear": "10%",
          "battle_axe": "20%"
        }
      },
      "treasure": {
        "individual": "2d6 ep, 2d4 gp",
        "lair": {
          "cp": {"amount": "1d8×1,000", "chance": "60%"},
          "sp": {"amount": "1d6×1,000", "chance": "50%"},
          "ep": {"amount": "1d8×1,000", "chance": "35%"},
          "gp": {"amount": "1d6×1,000", "chance": "50%"},
          "gems": {"amount": "5d4", "chance": "30%"},
          "jewellery": {"amount": "1d6", "chance": "25%"},
          "potions": {"amount": "2d4", "chance": "40%"}
        }
      }
    },
    {
      "name": "Gnome",
      "category": "Demi-Human",
      "frequency": "Rare",
      "numberAppearing": "40d10",
      "size": "Small",
      "move": "60 ft",
      "armorClass": 5,
      "hitDice": 1,
      "TREASURE TYPE": "Individuals: M (x3); Lair: C, Q (x20)",
      "attacks": 1,
      "damage": "1d6 or by weapon",
      "specialAttacks": "+1 vs kobolds/goblins",
      "specialDefenses": "Enemies -4 to hit (giants, ogres, etc.)",
      "magicResistance": "Save vs magic/poison as if 4 levels higher",
      "lairProbability": "50%",
      "intelligence": "Very",
      "alignment": "Neutral to lawful good",
      "levelXP": "1/10 + 1/hp",
      "description": "Gnomes are resilient underground dwellers with bonuses against specific foes. Speak burrowing animal language. Detect underground features and slopes.",
      "leadership": {
        "per_40": "1 fighter of level 2 (1-2), 3 (3-4), or 4 (5-6)",
        "over_160": ["1 5th level fighter (chief)", "1 3rd level fighter (lieutenant)"],
        "over_200": "Add 1 cleric of 4th-6th level",
        "over_320": [
          "1 6th level fighter",
          "2 5th level fighters",
          "1 7th level cleric",
          "4 3rd level clerics"
        ]
      },
      "treasure": {
        "individual": "6d4 gp"
      }
    },
    {
      "name": "Goblin",
      "category": "Humanoid",
      "frequency": "Uncommon",
      "numberAppearing": "40d10",
      "size": "Small (4 ft tall)",
      "move": "60 ft",
      "armorClass": 6,
      "hitDice": "1-1",
      "TREASURE TYPE": "Individuals: K; Lair: C",
      "attacks": 1,
      "damage": "1d6 or by weapon",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "40%",
      "intelligence": "Average (low)",
      "alignment": "Lawful evil",
      "levelXP": "1/10+1/hp",
      "description": "Small evil humanoids with red eyes and yellow to red skin. Hate dwarves and gnomes. Sunlight penalty (-1 to hit). Infravision 60 ft. Leaders and guards typically carry two weapons each.",
      "leaders": {
        "per_40": {"count": 1, "note": "Leader + 4 assistants, fight as orcs, 7 hp each"},
        "over_200": {
          "subchief": {"count": 1, "hp": 8, "ac": 5, "damage": "1d8", "note": "Fights as hobgoblin"},
          "guards": {"count": "2d8", "hp": 8, "ac": 5, "damage": "1d8", "note": "Fight as hobgoblins"}
        },
        "lair": {
          "chief": {"count": 1, "hp": "9-14", "ac": 4, "damage": "2d8", "note": "Fights as gnoll"},
          "bodyguards": {"count": "2d8", "hp": "9-14", "ac": 4, "damage": "2d8", "note": "Fight as gnolls"},
          "females": "60% of males (non-combatant)",
          "young": "100% of males (non-combatant)"
        },
        "wolf_riders": "25% chance 10% of force mounted on huge wolves (+ 10-40 riderless wolves)",
        "lair_wolves": "60% chance of 5-30 huge wolves guarding lair",
        "bugbears": "20% chance of 2-12 bugbears in lair"
      },
      "equipment": {
        "weapons_distribution": {
          "short_sword_military_pick": "10%",
          "short_sword_sling": "10%",
          "short_sword_spear": "10%",
          "sling": "10%",
          "morning_star": "20%",
          "military_pick": "10%",
          "spear": "30%"
        }
      },
      "treasure": {
        "individual": "3d6 sp",
        "lair": {
          "cp": {"amount": "1d12×1,000", "chance": "75%"},
          "sp": {"amount": "1d6×1,000", "chance": "50%"},
          "gems": {"amount": "1d6", "chance": "25%"},
          "jewellery": {"amount": "1d3", "chance": "20%"},
          "potions": {"amount": "2d4", "chance": "40%"}
        }
      }
    },
    {
      "name": "Golem, Flesh",
      "category": "Construct",
      "name_variants": "Flesh Golem",
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Large (7½' tall)",
      "move": "80 ft",
      "armorClass": 9,
      "hitDice": "40 hp",
      "TREASURE TYPE": "Nil",
      "attacks": 2,
      "damage": "2d8/2d8",
      "specialAttacks": "Strength enough to smash through reinforced doors",
      "specialDefenses": "Hit only by magical weapons; fire/cold slow 50% for 2d6 rounds; electricity heals (1 hp per die of damage); immune to most spells",
      "magicResistance": "Special",
      "lairProbability": "Nil",
      "intelligence": "Semi-",
      "alignment": "Neutral",
      "levelXP": "9/2,000+12/hp",
      "description": "Created from human remains by a 14th+ level magic-user using wish, polymorph any object, geas, protection from normal missiles, and strength spells. Cost 1,000 gp per hit point, 1 month to fashion. Each turn of melee has 1% cumulative chance per round of going berserk, attacking anything in sight. Master has 10% per round chance of regaining control. Can smash through oaken doors with iron reinforcements in 5-8 rounds."
    },
    {
      "name": "Golem, Clay",
      "category": "Construct",
      "name_variants": "Clay Golem",
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Large (8' tall)",
      "move": "70 ft",
      "armorClass": 7,
      "hitDice": "50 hp",
      "TREASURE TYPE": "Nil",
      "attacks": 1,
      "damage": "3d10",
      "specialAttacks": "Haste self 1/day for 3 rounds (strikes twice per round); wounds require heal spell from 17th+ level cleric to repair; 1% cumulative chance per round of being possessed by chaotic evil spirit (permanently uncontrollable); attacks as 11 HD creature",
      "specialDefenses": "Hit only by blunt magical weapons; immune to most spells; move earth drives back 120 ft and does 3d12 damage; disintegrate slows 50% and does 1d12 damage; earthquake stops movement 1 turn and does 5d10 damage",
      "magicResistance": "Special",
      "lairProbability": "Nil",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": "11/5,400+16/hp",
      "description": "Created by a lawful good cleric of 17th+ level using resurrection, animate objects, commune, prayer, and bless spells. Materials cost 20,000 gp, vestments cost 30,000 gp minimum. Once out of control it attacks the closest living thing and can never be regained."
    },
    {
      "name": "Golem, Stone",
      "category": "Construct",
      "name_variants": "Stone Golem",
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Large (9½' tall)",
      "move": "60 ft",
      "armorClass": 5,
      "hitDice": "60 hp",
      "TREASURE TYPE": "Nil",
      "attacks": 1,
      "damage": "3d8",
      "specialAttacks": "Casts slow on any opponent within 10 ft of front every other round; twice the strength of a flesh golem; 1 structural damage every other round",
      "specialDefenses": "Hit only by +2 or better weapons; immune to most spells; rock to mud slows 50% for 2d6 rounds; mud to rock restores all damage; stone to flesh makes vulnerable to normal attacks for 1 round",
      "magicResistance": "Special",
      "lairProbability": "Nil",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": "14/10,000+18/hp",
      "description": "Created by a 16th+ level magic-user using wish, polymorph any object, geas, and slow spells. Cost 1,000 gp per hit point, 2 months construction time."
    },
    {
      "name": "Golem, Iron",
      "category": "Construct",
      "name_variants": "Iron Golem",
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Large (12' tall)",
      "move": "60 ft",
      "armorClass": 3,
      "hitDice": "80 hp",
      "TREASURE TYPE": "Nil",
      "attacks": 1,
      "damage": "4d10",
      "specialAttacks": "Poison gas breath (10 ft cube, every 7 rounds); three times the strength of a flesh golem; 1 structural damage per round",
      "specialDefenses": "Hit only by +3 or better weapons; electrical attacks slow 50% for 3 rounds; fire-based attacks heal 1 hp per 1 hp of damage; immune to most spells; subject to rust monster attacks",
      "magicResistance": "Special",
      "lairProbability": "Nil",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": "18/13,500+25/hp",
      "description": "Created by an 18th+ level magic-user using wish, polymorph any object, geas, and cloudkill spells. Cost 1,000 gp per hit point, 3 months construction time. Always remains under control of creator."
    },
    {
      "name": "Green Slime",
      "category": "Ooze",
      "frequency": "Rare",
      "numberAppearing": "1d6",
      "size": "Small",
      "move": "0 ft",
      "armorClass": 9,
      "hitDice": 2,
      "TREASURE TYPE": "Nil",
      "attacks": 0,
      "damage": "Special",
      "specialAttacks": "Attaches to living flesh, turns victim to green slime in 1d4 rounds (no resurrection possible); eats through plate armor in 3 rounds; devours wood at 1 inch per hour",
      "specialDefenses": "Only fire, freezing, or cure disease destroys it; weapons and other spells have no effect",
      "magicResistance": "Special",
      "lairProbability": "Nil",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": "2/65+2/hp",
      "description": "Strange plant growths found underground. Cannot move but slowly grow, feeding on animal, vegetable, and metallic substances. Sensitive to vibrations and often drop on passing creatures from above. Can be scraped off quickly (discard scraper), excised, frozen, or burned. Cure disease kills it."
    },
    {
      "name": "Gorgon",
      "category": "Magical Beast",
      "variants": [
        {
          "name": "Gorgon",
          "description": "Large, bull-like beasts covered in metallic scales. Known for their petrifying breath, they are aggressive and lethal hunters.",
          "appearance": {
            "size": "Large",
            "form": "Giant bull with metallic scales"
          },
          "behavior": {
            "alignment": "Neutral",
            "intelligence": "Animal",
            "habitat": "Wilderness, ruins, underground",
            "tactics": "Uses petrifying breath 85% of the time before goring"
          },
          "combat": {
            "attacks": 1,
            "damage": "2d6",
            "specialAttacks": "Breath weapon (cone of petrifying gas, 60 ft x 10 ft radius, 3/day)"
          }
        }
      ],
      "frequency": "Rare",
      "numberAppearing": "1d4",
      "size": "Large",
      "move": "120 ft",
      "armorClass": 2,
      "hitDice": 8,
      "TREASURE TYPE": "E",
      "attacks": 1,
      "damage": "2d6",
      "specialAttacks": "Petrifying breath (save or turn to stone)",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "40%",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "levelXP": "7/1,500 + 10/hp",
      "treasure": {
        "cp": "1d8×1,000 (10%)",
        "sp": "1d12×1,000 (25%)",
        "ep": "1d6×1,000 (25%)",
        "gp": "1d8×1,000 (25%)",
        "gems": "1d10 (15%)",
        "jewellery": "1d8 (10%)",
        "magicItems": "Any 4 magic items (25%)"
      }
    },
    {
      "name": "Grimlock",
      "category": "Humanoid",
      "frequency": "Uncommon",
      "numberAppearing": "20d10",
      "size": "Man-sized",
      "move": "120 ft",
      "armorClass": 5,
      "hitDice": 2,
      "TREASURE TYPE": "See treasure",
      "attacks": 1,
      "damage": "1d6 or by weapon",
      "specialAttacks": "None",
      "specialDefenses": "Immune to visual illusions; vulnerable to sensory disruption",
      "magicResistance": "Special",
      "lairProbability": "75%",
      "intelligence": "Average",
      "alignment": "Neutral evil",
      "levelXP": "2/28 + 2/hp",
      "description": "Blind subterranean humanoids with heightened non-visual senses. Immune to light-based effects. Detect hidden foes easily.",
      "leaders": {
        "per_30": "1 with 3 HD, AC 4",
        "per_40": "1 with 4 HD, AC 3"
      },
      "treasure": {
        "lair": {
          "cp": {"amount": "1d6×1,000", "chance": "25%"},
          "sp": {"amount": "1d4×1,000", "chance": "25%"},
          "gp": {"amount": "2d10×100", "chance": "25%"},
          "gems": {"amount": "1d8", "chance": "25%"},
          "jewellery": {"amount": "1d4", "chance": "25%"},
          "magic_items": {"amount": "1 item", "chance": "10%"}
        }
      }
    },
    {
      "name": "Grey Ooze",
      "category": "Ooze",
      "name_variants": "Gray Ooze",
      "variants": [
        {
          "name": "Grey Ooze",
          "description": "A nearly undetectable slime that appears as wet stone. It corrodes metal rapidly and is immune to cold and heat-based magic.",
          "appearance": {
            "form": "Amorphous ooze blending into dungeon floors",
            "size": "Medium to Large"
          },
          "behavior": {
            "alignment": "Neutral",
            "intelligence": "Animal",
            "habitat": "Underground ruins, dungeons",
            "traits": [
              "Appears as part of stone floor",
              "Forms pseudopods to strike prey",
              "Consumes metal, not stone or wood"
            ]
          },
          "combat": {
            "attacks": 1,
            "damage": "2d8",
            "specialAttacks": "Corrodes metal (eats through chain in 1 round, plate in 2)",
            "defenses": [
              "Immune to heat/cold-based magic",
              "Takes full damage from weapons, but corrodes metal ones"
            ]
          },
          "growth": {
            "note": "Larger specimens may reach 36 sq ft and develop rudimentary awareness"
          }
        }
      ],
      "frequency": "Rare",
      "numberAppearing": "1d3",
      "size": "Medium to Large",
      "move": "10 ft",
      "armorClass": 8,
      "hitDice": "3+3",
      "TREASURE TYPE": "Nil",
      "attacks": 1,
      "damage": "2d8",
      "specialAttacks": "Metal corrosion",
      "specialDefenses": "Immune to heat/cold; corrodes metal weapons",
      "magicResistance": "See description",
      "lairProbability": "Nil",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "levelXP": "4/75 + 3/hp",
      "treasure": "None"
    },
    {
      "name": "Griffon",
      "category": "Magical Beast",
      "variants": [
        {
          "name": "Griffon",
          "description": "Fierce aerial hunters with the body of a lion and head, wings, and forelegs of an eagle. Known for their hatred of horses and highly sought after as flying mounts.",
          "appearance": {
            "form": "Lion’s body with eagle head, wings, and talons",
            "size": "Large"
          },
          "behavior": {
            "alignment": "Neutral",
            "intelligence": "Semi-",
            "habitat": "Cliffside aeries and mountain caves",
            "traits": [
              "Hunt horses on sight",
              "Valuable as flying mounts if raised from hatchlings",
              "Cannot be trained once mature"
            ]
          },
          "combat": {
            "attacks": 3,
            "damage": "1d4 / 1d4 / 2d8",
            "notes": "Decreased aerial agility (to III) when bearing >100 lbs rider"
          }
        }
      ],
      "frequency": "Uncommon",
      "numberAppearing": "2d6",
      "size": "Large",
      "move": "120 ft; 300 ft flying (AA:IV)",
      "armorClass": 3,
      "hitDice": 7,
      "TREASURE TYPE": "C, S",
      "attacks": 3,
      "damage": "1d4 / 1d4 / 2d8",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "25%",
      "intelligence": "Semi-",
      "alignment": "Neutral",
      "levelXP": "7/225 + 8/hp",
      "treasure": {
        "cp": "1d12×1,000 (20%)",
        "sp": "1d6×1,000 (30%)",
        "ep": "1d4×1,000 (10%)",
        "gems": "1d6 (25%)",
        "jewellery": "1d3 (20%)",
        "magicItems": "2 items (10%), 2d4 potions (40%)"
      }
    },
    {
      "name": "Halfling",
      "category": "Demi-Human",
      "name_variants": "halflings, hairfeet",
      "variants": [
        {
          "name": "Hairfoot",
          "description": "The standard halfling type. They are stealthy rural folk with a strong resistance to magic and poison. Experts at hiding outdoors. Often accompanied by guard dogs.",
          "size": "Small (~3')",
          "armorClass": 7,
          "abilities": {
            "missile": "+3 to hit with bow or sling",
            "stealth": "Surprise on 1-4; invisible in foliage",
            "magicResistance": "Save vs magic/poison as if 4 levels higher"
          },
          "maxLevel": "Fighter 4"
        },
        {
          "name": "Tallfellow",
          "description": "A taller, slimmer halfling, with fairer skin and hair. Very rare. Very friendly with elves.",
          "size": "Small (~4')",
          "armorClass": 6,
          "lifespan": "180 years average",
          "abilities": {
            "missile": "+3 to hit with bow or sling",
            "stealth": "Surprise on 1-4; invisible in foliage",
            "magicResistance": "Save vs magic/poison as if 4 levels higher",
            "languages": "Can speak elvish"
          },
          "equipment": {
            "weapons": "Use more spears",
            "mounts": "Ride ponies"
          },
          "maxLevel": {
            "fighter": {
              "standard": "4th level",
              "exceptional": "5th or 6th level with 17-18 strength"
            }
          }
        },
        {
          "name": "Stout",
          "description": "Smaller and stockier than the typical halfling. They have no fear of water and can swim. Enjoy dwarven company.",
          "size": "Small (~3½')",
          "armorClass": 6,
          "lifespan": "200+ years",
          "abilities": {
            "missile": "+3 to hit with bow or sling",
            "stealth": "Surprise on 1-4; invisible in foliage",
            "magicResistance": "Save vs magic/poison as if 4 levels higher",
            "infravision": true,
            "dungeoneering": "Can detect sloping passageways",
            "swimming": true,
            "languages": "Can speak dwarvish"
          },
          "equipment": {
            "weapons": "Use morning stars in addition to usual halfling arms"
          },
          "maxLevel": {
            "fighter": {
              "standard": "4th level",
              "exceptional": "5th level with 18 strength"
            }
          }
        }
      ],
      "frequency": "Rare",
      "numberAppearing": "30-300",
      "size": "Small (3+ ' tall)",
      "move": "9\"",
      "armorClass": 7,
      "hitDice": "1d6 hitpoints",
      "TREASURE TYPE": "Individuals: K; Lair: B",
      "attacks": 1,
      "damage": "By weapon",
      "specialAttacks": "+3 with bow",
      "specialDefenses": "Save at 4 levels higher",
      "magicResistance": "As above",
      "lairProbability": "70%",
      "intelligence": "Very",
      "alignment": "Lawful good",
      "psionicAbility": "Nil (possible to exist in unusual characters)",
      "levelXP": "1/5 + 1/hp",
      "dwelling": "Villages with burrow homes and surface cottages, typically in pastoral countryside",
      "equipment": {
        "armor": "Padded or leather armor",
        "weaponDistribution": {
          "smallSwordAndShortBow": "10%",
          "smallSwordAndSpear": "10%",
          "shortBow": "10%",
          "sling": "20%",
          "smallSword": "10%",
          "spear": "20%",
          "handAxe": "20%"
        }
      },
      "leaders": {
        "per_30": {"level": 2, "class": "fighter", "count": 2},
        "over_90": {"level": 3, "class": "fighter", "count": 1},
        "over_150": {
          "additional": [
            {"level": 4, "class": "fighter", "count": 1},
            {"level": 3, "class": "fighter", "count": 2},
            {"level": 2, "class": "fighter", "count": 3}
          ]
        },
        "higherLevelArmor": {
          "normal": {"armorClass": 6},
          "third": {"armorClass": 5},
          "fourth": {"armorClass": 4},
          "magicChance": "10% per level of having magic armor and/or miscellaneous weapons"
        },
        "lair": {
          "females": "100% of adult males",
          "children": "60% of adult males",
          "guards": "1-4 dogs per halfling (treat as wild dogs)"
        }
      },
      "treasure": {
        "individual": "K",
        "lair": "B"
      }
    },
    {
      "name": "Harpy",
      "category": "Monstrous Humanoid",
      "frequency": "Rare",
      "numberAppearing": "2d6",
      "size": "Medium",
      "move": "60 ft; 150 ft flying (AA:IV)",
      "armorClass": 7,
      "hitDice": 3,
      "TREASURE TYPE": "C",
      "attacks": 3,
      "damage": "1d3/1d3/1d6",
      "specialAttacks": "Singing and charm",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "25%",
      "intelligence": "Low",
      "alignment": "Chaotic evil",
      "levelXP": "3/50 + 3/hp",
      "description": "These vile creatures lure victims with a magical song, then charm and devour them.",
      "treasure": {
        "cp": "1d12×1,000 (20%)",
        "sp": "1d6×1,000 (30%)",
        "ep": "1d4×1,000 (10%)",
        "gems": "1d6 (25%)",
        "jewellery": "1d3 (20%)",
        "magicItems": "2 items (10%)"
      }
    },
    {
      "name": "Hell Hound",
      "category": "Extraplanar Beast",
      "frequency": "Very rare",
      "numberAppearing": "2d4",
      "size": "Medium",
      "move": "120 ft",
      "armorClass": 4,
      "hitDice": "4 to 7",
      "TREASURE TYPE": "C",
      "attacks": 1,
      "damage": "1d10",
      "specialAttacks": "Breathe fire",
      "specialDefenses": "High surprise rating; keen senses",
      "magicResistance": "Standard",
      "lairProbability": "30%",
      "intelligence": "Low",
      "alignment": "Lawful evil",
      "levelXP": {
        "4HD": "4/75 + 4/hp",
        "5HD": "5/110 + 5/hp",
        "6HD": "6/160 + 6/hp",
        "7HD": "7/225 + 8/hp"
      },
      "description": "Infernal dogs that serve as otherworldly sentries, attacking with fiery breath and terrifying silence.",
      "treasure": {
        "cp": "1d12×1,000 (20%)",
        "sp": "1d6×1,000 (30%)",
        "ep": "1d4×1,000 (10%)",
        "gems": "1d6 (25%)",
        "jewellery": "1d3 (25%)",
        "magicItems": "2 items (10%)"
      }
    },
    {
      "name": "Hippogriff",
      "category": "Magical Beast",
      "frequency": "Rare",
      "numberAppearing": "2d8",
      "size": "Large",
      "move": "180 ft; 360 ft flying (AA:IV)",
      "armorClass": 5,
      "hitDice": "3 +3",
      "TREASURE TYPE": "Q (x5)",
      "attacks": 3,
      "damage": "1d6/1d6/1d10",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "10%",
      "intelligence": "Semi-",
      "alignment": "Neutral",
      "levelXP": "4/150 + 3/hp",
      "description": "A winged creature combining features of horse and eagle, often sought as a mount but highly territorial.",
      "treasure": {
        "gems": "5d4 (50%)"
      }
    },
    {
      "name": "Hippopotamus",
      "category": "Animal",
      "frequency": "Uncommon",
      "numberAppearing": "2d6",
      "size": "Large",
      "move": "90 ft; 120 ft swimming",
      "armorClass": 6,
      "hitDice": "8",
      "TREASURE TYPE": "Nil",
      "attacks": "1",
      "damage": "2d6 or 3d6",
      "specialAttacks": "Capsize boats",
      "specialDefenses": "Nil",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "levelXP": "5/600 + 12/hp",
      "treasure": "None",
      "description": "Hippopotami are large semi-aquatic mammals. Bulls bite for 3d6 damage, cows for 2d6. Boats passing over hippos have a 50% chance of being tipped."
    },
    {
      "name": "Hobgoblin",
      "category": "Humanoid",
      "frequency": "Uncommon",
      "numberAppearing": "20d10",
      "size": "Man-sized (6½ ft tall)",
      "move": "90 ft",
      "armorClass": 5,
      "hitDice": "1+1",
      "TREASURE TYPE": "Individuals: J, M; Lair: D, Q (x5)",
      "attacks": 1,
      "damage": "1d8 or by weapon",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "25%",
      "intelligence": "Average",
      "alignment": "Lawful evil",
      "levelXP": "2/20 + 2/hp",
      "description": "Larger cousins of goblins, hobgoblins are militaristic, competitive, and organized into hostile tribes with infamous names like Skull Smashers and Marrow Suckers. They hate elves above all else, and are often found bullying goblins and orcs or leading them in battle. Hobgoblins thrive underground or in fortified surface lairs and keep carnivorous apes as guards.",
      "leaders": {
        "per_20": {
          "level": 1,
          "class": "fighter",
          "count": 3,
          "hp": 9,
          "note": "1 sergeant + 2 assistants"
        },
        "commander": {
          "under_100": {
            "level": 3,
            "class": "fighter",
            "count": 1,
            "hp": 16,
            "damage": "1d8+2",
            "armorClass": 3,
            "note": "Sub-chief, fights as 3 HD"
          },
          "over_100": {
            "chief": {
              "level": 4,
              "class": "fighter",
              "count": 1,
              "hp": 22,
              "damage": "2d6",
              "armorClass": 2,
              "note": "Fights as 4 HD"
            },
            "guards": {
              "level": 3,
              "class": "fighter",
              "count": "5d4",
              "hp": 16,
              "damage": "1d8+2",
              "armorClass": 3
            }
          }
        },
        "psionic_abilities": "None"
      },
      "lair": {
        "types": {
          "underground": "80%",
          "fortified_village": "20%"
        },
        "features": {
          "underground": {
            "guards": {
              "carnivorous_apes": {
                "chance": "60%",
                "number": "2d12",
                "note": "Used as brutish guards"
              }
            }
          },
          "fortified_village": {
            "defenses": "Ditch, rampart, palisade, 2 gates, 3–6 guard towers",
            "artillery": {
              "heavy_catapults": "2 per 50 warriors",
              "light_catapults": "2 per 50 warriors",
              "ballista": "1 per 50 warriors"
            }
          }
        },
        "occupants": {
          "females": "150% of males",
          "young": "300% of males"
        }
      },
      "equipment": {
        "weapons_distribution": {
          "sword_composite_bow": "20%",
          "sword_spear": "10%",
          "sword_morning_star": "5%",
          "sword_whip": "5%",
          "polearm": "30%",
          "spear": "10%",
          "morning_star": "20%"
        },
        "leaders": {
          "note": "Always carry two weapons"
        },
        "standard": {
          "presence": {
            "subchief": "20%",
            "chief": "Always"
          },
          "effect": "+1 to attack and morale for all hobgoblins within 6\""
        }
      },
      "senses_languages": {
        "infravision": "60 ft",
        "mining_detection": "40% chance to detect sloping passages, shifting walls, and new construction",
        "languages": [
          "Hobgoblin",
          "Goblin",
          "Orcish",
          "Carnivorous Ape (rudimentary)",
          "Alignment tongue (Lawful Evil)",
          "Common (20%)"
        ]
      },
      "treasure": {
        "individual": "3d12 cp, 2d8 gp",
        "lair": {
          "cp": { "amount": "1d8×1,000", "chance": "75%" },
          "sp": { "amount": "1d12×1,000", "chance": "60%" },
          "ep": { "amount": "1d8×1,000", "chance": "35%" },
          "gp": { "amount": "1d6×1,000", "chance": "50%" },
          "gems": { "amount": "5d4", "chance": "50%" },
          "jewellery": { "amount": "1d6", "chance": "25%" },
          "potions": { "amount": "1", "chance": "15%" }
        }
      }
    },
    {
      "name": "Homonculus",
      "category": "Construct",
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Small (18 in)",
      "move": "60 ft; 180 ft flying (AA:V)",
      "armorClass": 6,
      "hitDice": 2,
      "TREASURE TYPE": "Nil",
      "attacks": 1,
      "damage": "1d3",
      "specialAttacks": "Bite causes sleep",
      "specialDefenses": "See below",
      "magicResistance": "See below",
      "lairProbability": "Nil",
      "intelligence": "See below",
      "alignment": "See below",
      "levelXP": "2/81 + 2/hp",
      "description": "A magically created construct under the complete control of its wizard master. Communicates telepathically within 500 ft and transmits what it sees and hears. If killed, its creator takes 2d10 damage.",
      "treasure": "None"
    },
    {
      "name": "Hippopotamus",
      "category": "Animal",
      "frequency": "Uncommon",
      "numberAppearing": "2d6",
      "size": "Large",
      "move": "90 ft; 120 ft swimming",
      "armorClass": 6,
      "hitDice": 8,
      "TREASURE TYPE": "Nil",
      "attacks": 1,
      "damage": "2d6 or 3d6",
      "specialAttacks": "Capsize boats",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "levelXP": "5/600 + 12/hp",
      "treasure": "None",
      "description": "Hippopotami are large semi-aquatic mammals that spend most of their time in water. Though herbivores, they aggressively defend their territory and can outrun humans on land despite their bulk. They can't float but can propel themselves to the surface for air, staying submerged for up to 15 minutes. Bull hippos (1 per 4 animals) bite for 3d6 damage, while cows bite for 2d6. Boats passing over a hippo have a 50% chance of being tipped over when the animal surfaces."
    },
    {
      "name": "Horse",
      "category": "Animal",
      "variants": [
        {
          "type": "Draft",
          "frequency": "Common",
          "numberAppearing": "1",
          "size": "Large",
          "move": "120 ft",
          "armorClass": 7,
          "hitDice": "3",
          "TREASURE TYPE": "Nil",
          "attacks": "1",
          "damage": "1d3",
          "levelXP": "2/20+2/hp"
        },
        {
          "type": "Heavy (Warhorse)",
          "frequency": "Uncommon",
          "numberAppearing": "1",
          "size": "Large",
          "move": "150 ft",
          "armorClass": 7,
          "hitDice": "3+3",
          "TREASURE TYPE": "Nil",
          "attacks": "3",
          "damage": "1d8/1d8/1d3",
          "levelXP": "2/20+2/hp"
        },
        {
          "type": "Light (Warhorse)",
          "frequency": "Uncommon",
          "numberAppearing": "1",
          "size": "Large",
          "move": "240 ft",
          "armorClass": 7,
          "hitDice": "2",
          "TREASURE TYPE": "Nil",
          "attacks": "2",
          "damage": "1d4/1d4",
          "levelXP": "2/20+2/hp"
        },
        {
          "type": "Medium (Warhorse)",
          "frequency": "Uncommon",
          "numberAppearing": "1",
          "size": "Large",
          "move": "180 ft",
          "armorClass": 7,
          "hitDice": "2+2",
          "TREASURE TYPE": "Nil",
          "attacks": "3",
          "damage": "1d6/1d6/1d3",
          "levelXP": "2/20+2/hp"
        },
        {
          "type": "Pony",
          "frequency": "Uncommon",
          "numberAppearing": "1",
          "size": "Large",
          "move": "120 ft",
          "armorClass": 7,
          "hitDice": "1+1",
          "TREASURE TYPE": "Nil",
          "attacks": "1",
          "damage": "1d2",
          "levelXP": "2/20+2/hp"
        },
        {
          "type": "Wild",
          "frequency": "Uncommon",
          "numberAppearing": "5d6",
          "size": "Large",
          "move": "240 ft",
          "armorClass": 7,
          "hitDice": "2",
          "TREASURE TYPE": "Nil",
          "attacks": "1",
          "damage": "1d3",
          "levelXP": "2/20+2/hp"
        }
      ],
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "treasure": "None",
      "description": "Horses are ubiquitous domesticated animals. Warhorses are classified as heavy, medium, or light, with only 10% able to be trained as such. Draft horses are used for hauling, ponies for light loads or children. Wild horses travel in herds."
    },
    {
      "name": "Hydra",
      "category": "Magical Beast",
      "frequency": "Uncommon",
      "numberAppearing": "1",
      "size": "Large",
      "move": "90 ft",
      "armorClass": 5,
      "hitDice": "5 to 16",
      "TREASURE TYPE": "B",
      "attacks": "5 to 16",
      "damage": "1d6 to 1d12 based on size",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "20%",
      "intelligence": "Semi-",
      "alignment": "Neutral",
      "levelXP": "5/110 + 5/hp up to 9/5,000 + 20/hp",
      "description": "Multi-headed lizard-like creatures. Each head attacks independently and deals variable damage by size. Found in swamps, bogs, or underground lairs.",
      "treasure": {
        "cp": "1d8×1,000 (50%)",
        "sp": "1d6×1,000 (25%)",
        "ep": "1d4×1,000 (25%)",
        "gp": "1d3×1,000 (25%)",
        "gems": "1d8 (30%)",
        "jewellery": "1d4 (20%)",
        "magicItems": "sword, armour or misc. weapon (10%)"
      }
    },
    {
      "name": "Hyena",
      "category": "Animal",
      "variants": [
        {
          "type": "Normal",
          "frequency": "Common",
          "numberAppearing": "2d6",
          "size": "Medium",
          "move": "120 ft",
          "armorClass": 7,
          "hitDice": "2",
          "attacks": "1",
          "damage": "2d4",
          "levelXP": "3/50 +2/hp"
        },
        {
          "type": "Huge",
          "frequency": "Rare",
          "numberAppearing": "2d6",
          "size": "Medium",
          "move": "120 ft",
          "armorClass": 6,
          "hitDice": "3",
          "attacks": "1",
          "damage": "2d4+1",
          "levelXP": "4/75 +3/hp"
        },
        {
          "type": "Giant",
          "frequency": "Very rare",
          "numberAppearing": "1d6",
          "size": "Large",
          "move": "180 ft",
          "armorClass": 5,
          "hitDice": "4",
          "attacks": "1",
          "damage": "2d6",
          "levelXP": "6/160 +6/hp"
        }
      ],
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "TREASURE TYPE": "Nil",
      "treasure": "None",
      "description": "Hyenas are 4-5 ft long scavengers and predators with strong jaws. Huge types are more aggressive; Giant types may be magically bred. Found in grasslands, woodlands, and deserts. Known for grave-raiding and eerie vocalizations."
    },
    {
      "name": "Imp",
      "category": "Devils",
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Small (2' tall)",
      "move": "60 ft; 180 ft flying",
      "armorClass": 2,
      "hitDice": "2+2",
      "TREASURE TYPE": "Q",
      "attacks": "1 tail sting",
      "damage": "1d4 + poison",
      "specialAttacks": "Poison tail sting (save vs poison or die); polymorph self (limited to two of: large spider, raven, giant rat, goat); suggestion 1/day; detect good; detect magic",
      "specialDefenses": "Regenerate 1 hp/round; hit only by silver or magical weapons; immune to cold, fire, and lightning; saves as 7 HD creature",
      "magicResistance": "25%",
      "lairProbability": "0%",
      "intelligence": "Average",
      "alignment": "Lawful evil",
      "levelXP": "3/150+3/hp",
      "description": "A very minor devil created from a larva to serve as familiar to a lawful evil magic-user or cleric. Can polymorph into two animal forms. Tail sting considered a dagger for hit determination. As familiar: telepathic link (all senses including infravision up to 1 mile), within 10 ft grants 25% MR and 1 hp/round regeneration to master, within 1 mile grants +1 level, beyond 1 mile -1 level, if killed master loses 4 levels. Can contact lower plane once per week (6 questions as commune)."
    },
    {
      "name": "Indricotherium",
      "category": "Animal",
      "frequency": "Rare",
      "numberAppearing": "1d3",
      "size": "Large",
      "move": "120 ft",
      "armorClass": 5,
      "hitDice": "14",
      "TREASURE TYPE": "Nil",
      "attacks": "2",
      "damage": "5d4",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Semi-",
      "alignment": "Neutral",
      "levelXP": "7/1,800+18/hp",
      "treasure": "None",
      "description": "A prehistoric ruminant, the indricotherium looks rather like its contemporary descendant the rhinoceros. If spooked, it will charge in an effort to trample. A 'two' on the Number Encountered roll means a mated pair; a 'three' means a mated pair with a juvenile."
    },
    {
      "name": "Invisible Stalker",
      "category": "Elemental",
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Large (8 ft tall)",
      "move": "120 ft",
      "armorClass": 3,
      "hitDice": 8,
      "TREASURE TYPE": "Nil",
      "attacks": 1,
      "damage": "2d8",
      "specialAttacks": "Surprise on 1-5",
      "specialDefenses": "Invisibility",
      "magicResistance": "30%",
      "lairProbability": "Nil",
      "intelligence": "High",
      "alignment": "Neutral",
      "levelXP": "7/1,100 + 10/hp",
      "description": "Summoned air elementals that track and attack at their master's command. May attempt to twist instructions for prolonged tasks. Cannot be permanently killed on the Prime Material Plane.",
      "treasure": "None"
    },
    {
      "name": "Jackal",
      "category": "Animal",
      "variants": [
        {
          "type": "Normal",
          "frequency": "Common",
          "numberAppearing": "1d6",
          "size": "Small",
          "move": "120 ft",
          "armorClass": 7,
          "hitDice": "1",
          "attacks": "1",
          "damage": "1d4",
          "levelXP": "1/10 +1/hp"
        },
        {
          "type": "Huge",
          "frequency": "Rare",
          "numberAppearing": "1d6",
          "size": "Small",
          "move": "150 ft",
          "armorClass": 6,
          "hitDice": "2",
          "attacks": "1",
          "damage": "1d4+1",
          "levelXP": "2/30 +1/hp"
        },
        {
          "type": "Giant",
          "frequency": "Very rare",
          "numberAppearing": "1d4",
          "size": "Medium",
          "move": "180 ft",
          "armorClass": 5,
          "hitDice": "4",
          "attacks": "1",
          "damage": "1d8",
          "levelXP": "3/75 +3/hp"
        }
      ],
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "25%",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "TREASURE TYPE": "Nil",
      "treasure": "None",
      "description": "Jackals are nocturnal scavengers and occasional predators found in grasslands and wastelands. Huge jackals are more aggressive. Giant jackals are possibly magical and sometimes associated with evil cults. Some rumors claim they possess unnatural intelligence and will."
    },
    {
      "name": "Jackalwere",
      "category": "Shapechanger",
      "frequency": "Rare",
      "numberAppearing": "1d4",
      "size": "Small (medium)",
      "move": "120 ft",
      "armorClass": 4,
      "hitDice": 4,
      "TREASURE TYPE": "C",
      "attacks": 1,
      "damage": "2d8 or by weapon",
      "specialAttacks": "Gaze causes sleep",
      "specialDefenses": "Iron or +1 weapon to hit",
      "magicResistance": "Standard",
      "lairProbability": "30%",
      "intelligence": "Very",
      "alignment": "Chaotic evil",
      "levelXP": "4/75+4/hp",
      "description": "Malevolent jackal creatures in human form. They prey on travelers, using their sleep gaze to subdue victims. Immune to non-magical, non-iron weapons.",
      "treasure": {
        "cp": "1d12×1,000 (20%)",
        "sp": "1d6×1,000 (30%)",
        "ep": "1d4×1,000 (10%)",
        "gems": "1d6 (25%)",
        "jewellery": "1d3 (20%)",
        "magicItems": "any 2 magic items (10%)"
      }
    },
    {
      "name": "Koalinth",
      "category": "Humanoid",
      "frequency": "Rare",
      "numberAppearing": "20d10",
      "size": "Man-sized (6 ft tall)",
      "move": "90 ft, 120 ft swim",
      "armorClass": 5,
      "hitDice": "1+1",
      "TREASURE TYPE": "Individuals: J, M; Lair: D, Q (x5)",
      "attacks": 1,
      "damage": "By weapon (typically spear or polearm)",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "25%",
      "intelligence": "Average",
      "alignment": "Lawful evil",
      "levelXP": "2/20 + 2/hp",
      "description": "Koalinth are aquatic hobgoblins with gills and webbed limbs, dwelling in shallow water caverns and sea caves. They are aggressive, territorial, and prey on all other creatures. While similar to land hobgoblins in most respects, Koalinth use aquatic versions of polearms and spears. Their coloration is lighter, with green faces, and they do not speak Common.",
      "leaders": {
        "per_20": {
          "level": 1,
          "class": "fighter",
          "count": 3,
          "hp": 9,
          "note": "1 sergeant + 2 assistants"
        },
        "commander": {
          "under_100": {
            "level": 3,
            "class": "fighter",
            "count": 1,
            "hp": 16,
            "damage": "1d8+2",
            "armorClass": 3,
            "note": "Sub-chief, fights as 3 HD"
          },
          "over_100": {
            "chief": {
              "level": 4,
              "class": "fighter",
              "count": 1,
              "hp": 22,
              "damage": "2d6",
              "armorClass": 2,
              "note": "Fights as 4 HD"
            },
            "guards": {
              "level": 3,
              "class": "fighter",
              "count": "5d4",
              "hp": 16,
              "damage": "1d8+2",
              "armorClass": 3
            }
          }
        },
        "psionic_abilities": "None"
      },
      "lair": {
        "types": {
          "underwater_cavern": "100%"
        },
        "features": {
          "environment": "Typically located in shallow saltwater sea caves or ruins"
        },
        "occupants": {
          "females": "150% of males",
          "young": "300% of males"
        }
      },
      "equipment": {
        "weapons_distribution": {
          "spear": "50%",
          "polearm": "50%"
        },
        "note": "Weapons adapted for underwater use"
      },
      "senses_languages": {
        "infravision": "60 ft",
        "languages": [
          "Koalinth (hobgoblin dialect)",
          "Alignment tongue (Lawful Evil)"
        ]
      },
      "treasure": {
        "individual": "None",
        "lair": {
          "cp": { "amount": "1d6×1,000", "chance": "50%" },
          "sp": { "amount": "1d8×1,000", "chance": "40%" },
          "ep": { "amount": "1d4×1,000", "chance": "25%" },
          "gp": { "amount": "1d4×1,000", "chance": "40%" },
          "gems": { "amount": "2d6", "chance": "35%" },
          "jewellery": { "amount": "1d4", "chance": "20%" },
          "magic_items": { "amount": 1, "chance": "10%" }
        }
      }
    },
    {
      "name": "Kraken",
      "category": "Aquatic Monster",
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Large",
      "move": "210 ft swimming",
      "armorClass": "5/0",
      "hitDice": 20,
      "TREASURE TYPE": "G, R, S",
      "attacks": 9,
      "damage": "2d6(x8)/5d4",
      "specialAttacks": "Crushing tentacles, poison ink cloud, spell-like abilities",
      "specialDefenses": "See below",
      "magicResistance": "Standard",
      "lairProbability": "75%",
      "intelligence": "Genius",
      "alignment": "Neutral evil",
      "levelXP": "10/17,500+30/hp",
      "description": "Giant sea monsters with massive tentacles, poisonous ink, and devastating magic. Will drag ships and sailors to the depths. Intelligent and ruthless.",
      "treasure": {
        "gp": "12d4×1,000 (50%)",
        "pp": "1d8×1,000 (50%)",
        "gems": "9d6 (55%)",
        "jewellery": "2d10 (45%)",
        "magicItems": "4 magic items + 1d6 scrolls + 2d4 potions (50%)"
      }
    },
    {
      "name": "Lamia",
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Medium",
      "move": "240 ft",
      "armorClass": 3,
      "hitDice": "9",
      "TREASURE TYPE": "D",
      "attacks": "1",
      "damage": "1d4",
      "specialAttacks": "Spells (charm person, mirror image, suggestion, illusion); Wisdom drain (1 per touch)",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "60%",
      "intelligence": "High",
      "alignment": "Chaotic evil",
      "levelXP": "7/1,500 + 12/hp",
      "treasure": "1d8×1,000 cp (10%), 1d12×1,000 sp (15%), 1d8×1,000 ep (15%), 1d6×1,000 gp (50%), 1d10 gems (30%), 1d6 jewellery (25%), any 2 magic items + 1 potion (15%)"
    },
    {
      "name": "Lammasu",
      "frequency": "Rare",
      "numberAppearing": "1d8",
      "size": "Large",
      "move": "120 ft; 240 ft flying (AA:III)",
      "armorClass": 6,
      "hitDice": "7+7",
      "TREASURE TYPE": "R, S, T",
      "attacks": "2",
      "damage": "1d6+1/1d6+1",
      "specialAttacks": "Spells as 8th-level cleric; holy word (20%)",
      "specialDefenses": "Dimension door, invisibility, protection from evil 10 ft radius",
      "magicResistance": "30%",
      "lairProbability": "25%",
      "intelligence": "Genius",
      "alignment": "Lawful good",
      "levelXP": "8/875+10/hp",
      "treasure": "2d4×1,000 gp (45%), 1d8×100pp (60%), 4d8 gems (50%), 2d6 jewellery (40%), 2d4 potions (40%), 1 misc magic (20%)"
    },
    {
      "name": "Leech, Giant",
      "frequency": "Uncommon",
      "numberAppearing": "4d4",
      "size": "Small",
      "move": "30 ft",
      "armorClass": 9,
      "hitDice": "1-4 HD",
      "TREASURE TYPE": "Nil",
      "attacks": "1",
      "damage": "1d4 (1 HD), 1d6 (2–3 HD), 1d8 (4 HD)",
      "specialAttacks": "Blood drain per round; disease",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": "2/50 + 3/hp",
      "treasure": "None"
    },
    
    {
      "name": "Kobold",
      "category": "Humanoid",
      "frequency": "Uncommon",
      "numberAppearing": "40d10",
      "size": "Small (3 ft tall)",
      "move": "60 ft",
      "armorClass": 7,
      "hitDice": "1d4 hp",
      "TREASURE TYPE": "Individuals: J; Lair: O, Q (x5)",
      "attacks": 1,
      "damage": "1d4 or by weapon",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "40%",
      "intelligence": "Average (low)",
      "alignment": "Lawful evil",
      "levelXP": "1/5+1/hp",
      "description": "Hateful, small reptilian humanoids. Hate sunlight (-1 to hit) and gnomes. Lair underground. Infravision 60 ft. May use wild boars or giant weasels as guards.",
      "leaders": {
        "per_40": {"count": 1, "note": "Sergeant + 2 assistants, fight as goblins (1-1 HD, 7 hp)"},
        "lair": {
          "chief": {"count": 1, "hp": 7, "note": "Fights as gnoll (2 HD)"},
          "guards": {"count": "5d4", "hp": 7, "note": "Fight as goblins"},
          "females": "50% of males (non-combatant)",
          "young": "100% of males (non-combatant)",
          "eggs": "100% of males",
          "wild_boars": "30% chance of 2d4 wild boars as guards",
          "giant_weasels": "30% chance of 2d6 giant weasels as guards"
        }
      },
      "equipment": {
        "weapons_distribution": {
          "short_sword": "20%",
          "javelin": "10%",
          "spear": "10%",
          "axe": "20%",
          "short_sword_javelin": "10%",
          "spiked_club": "30%"
        }
      },
      "treasure": {
        "individual": "3d6 cp",
        "lair": {
          "cp": {"amount": "1d4×1,000", "chance": "50%"},
          "sp": {"amount": "1d3×1,000", "chance": "30%"},
          "gems": {"amount": "1d4", "chance": "50%"}
        }
      }
    },
    
    {
      "name": "Lich",
      "category": "Undead",
      "turnResistance": 12,
      "frequency": "Very Rare",
      "numberAppearing": "1",
      "size": "Man-sized",
      "move": "60 ft",
      "armorClass": 0,
      "hitDice": "12 or more",
      "TREASURE TYPE": "A",
      "attacks": "1",
      "damage": "2d6 + paralysation",
      "specialAttacks": "Spell use at at least 18th level of ability; fear",
      "specialDefenses": "+1 or better weapon to hit; immune to cold, electrical, poison, paralysation, polymorph, and death magic, as well as sleep, charm, hold and other mental attacks",
      "magicResistance": "Standard",
      "lairProbability": "95%",
      "intelligence": "Genius or higher",
      "alignment": "Any evil",
      "levelXP": "10/at least 10,000 +16/hp",
      "treasure": {
        "cp": {"amount": "(1d4+1)×1,000", "chance": "30%"},
        "sp": {"amount": "(1d4+1)×1,000", "chance": "25%"},
        "ep": {"amount": "1d6×1,000", "chance": "40%"},
        "gp": {"amount": "(1d8+1)×1,000", "chance": "45%"},
        "pp": {"amount": "1d4×1,000", "chance": "25%"},
        "gems": {"amount": "5d8", "chance": "55%"},
        "jewellery": {"amount": "8d4", "chance": "45%"},
        "magic_items": {"amount": "3", "chance": "40%"}
      },
      "description": "Liches are the remains of powerful wizard-priests who have cheated death through fell magic. A lich's talisman contains a portion of its essence. They cast spells at 18th level minimum and typically dwell in complex underground labyrinths. Their touch inflicts 2d6 cold damage and paralysis (save or be held for 3d8 turns). Creatures below 6th level must save vs magic when seeing a lich or flee permanently."
    },

    {
      "name": "Lion",
      "category": "Animal",
      "variants": [
        {
          "type": "Lion",
          "frequency": "Common",
          "numberAppearing": "2d6",
          "size": "Large",
          "move": "120 ft",
          "armorClass": 5,
          "hitDice": "5+3",
          "attacks": 3,
          "damage": "1d6/1d6/1d10",
          "specialAttacks": "Rear claws",
          "specialDefenses": "Only surprised on 1",
          "levelXP": "4/250+6/hp"
        },
        {
          "type": "Cougar",
          "frequency": "Common",
          "numberAppearing": "1d2",
          "size": "Medium",
          "move": "150 ft",
          "armorClass": 6,
          "hitDice": "3+2",
          "attacks": 3,
          "damage": "1d4/1d4/1d6",
          "specialAttacks": "Rear claws",
          "specialDefenses": "Only surprised on 1",
          "levelXP": "3/100+3/hp"
        },
        {
          "type": "Prehistoric",
          "frequency": "Rare",
          "numberAppearing": "2d4",
          "size": "Large",
          "move": "120 ft",
          "armorClass": 5,
          "hitDice": "6+3",
          "attacks": 3,
          "damage": "2d4/2d4/2d6",
          "specialAttacks": "Rear claws",
          "specialDefenses": "Only surprised on 1",
          "levelXP": "4/300+6/hp"
        }
      ],
      "magicResistance": "Standard",
      "lairProbability": "25% (Lion, Prehistoric); 15% (Cougar)",
      "intelligence": "Semi-",
      "alignment": "Neutral",
      "TREASURE TYPE": "Nil",
      "treasure": "None",
      "description": "All lions gain two additional rear leg raking claw attacks if they hit with both forepaw attacks. Lions organize into family 'prides' with 1d2 males and 2d4+1 females. When encountered in their lair, 1d10 cubs will be present, with adults fighting to the death to protect young. Cougars (mountain lions) are more solitary and wide-ranging, capable of 20 ft horizontal leaps and 15 ft vertical jumps. Prehistoric lions (cave lions) are larger versions typically found in 'lost world' settings."
    },
    {
      "name": "Lizard, Giant (Fire)",
      "frequency": "Very rare",
      "numberAppearing": "1d4",
      "size": "Large (30 ft long)",
      "move": "90 ft",
      "armorClass": 3,
      "hitDice": "10",
      "TREASURE TYPE": "B, Q (x10), S, T",
      "attacks": "3",
      "damage": "1d8/1d8/2d8",
      "specialAttacks": "Flame breath (cone 150 ft, 2d6 dmg, save for half)",
      "specialDefenses": "Tough scaled hide",
      "magicResistance": "Standard",
      "lairProbability": "40%",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "levelXP": "7/1,500 + 14/hp",
      "treasure": "None carried. In lair: 1d8×1,000 cp (45%), 1d6×1,000 sp (30%), 1d6×1,000 ep (25%), 1d4×1,000 gp (33%), 1d4×100 pp (10%), 2d4 gems (30%), 1d6 jewellery (20%), Magic Sword/Armour/Weapon (12%), 2d4 potions (50%), 1d6 scrolls (40%)"
    },
    {
      "name": "Lizard, Giant",
      "frequency": "Uncommon",
      "numberAppearing": "2d6",
      "size": "Large (20 ft long)",
      "move": "150 ft",
      "armorClass": 5,
      "hitDice": "3+1",
      "TREASURE TYPE": "Nil",
      "attacks": "1",
      "damage": "1d8+1",
      "specialAttacks": "Double damage on nat 20",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": "3/120 + 4/hp",
      "treasure": "None"
    },
    {
      "name": "Lizard, Monitor",
      "frequency": "Rare",
      "numberAppearing": "1d6",
      "size": "Large (40 ft long)",
      "move": "60 ft",
      "armorClass": 5,
      "hitDice": "8",
      "TREASURE TYPE": "J, N, Q, C",
      "attacks": "3",
      "damage": "2d6/2d6/3d6",
      "specialAttacks": "Clamp on nat 20, auto-damage following round",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": "6/925 + 10/hp",
      "treasure": "In lair: 4d6 cp (90%), 3d6 sp (80%), 3d6 ep (70%), 2d6 gp (60%), 1d6 pp (50%), 2d6 gems (40%), 1d2 magic items (10%)"
    },
    {
      "name": "Lizard, Cave",
      "frequency": "Uncommon",
      "numberAppearing": "1d6",
      "size": "Large (20 ft long)",
      "move": "120 ft",
      "armorClass": 5,
      "hitDice": "6",
      "TREASURE TYPE": "See treasure",
      "attacks": "1",
      "damage": "2d6",
      "specialAttacks": "Clamp on nat 20; will drag victim to lair",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": "7/375 + 6/hp",
      "treasure": "In lair: 1d4×1,000 cp (30%), 2d4×1,000 sp (40%), 1d3×1,000 ep (25%), 1d4 gems (50%)"
    },
    {
      "name": "Lizard Man",
      "category": "Humanoid",
      "frequency": "Rare",
      "numberAppearing": "10d4",
      "size": "Man-sized (7 ft tall)",
      "move": "60 ft; 120 ft swimming",
      "armorClass": "5 (4 with shield)",
      "hitDice": "2+1",
      "TREASURE TYPE": "See treasure",
      "attacks": 3,
      "damage": "1d2/1d2/1d8",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "30%",
      "intelligence": "Low (average)",
      "alignment": "Neutral",
      "levelXP": "2/20+2/hp",
      "description": "Semi-aquatic tribal reptilians. Prefer underwater cave lairs. Crude villages. Often use javelins or barbed darts.",
      "treasure": {
        "lair": {
          "cp": {"amount": "1d8×1,000", "chance": "10%"},
          "sp": {"amount": "1d12×1,000", "chance": "15%"},
          "ep": {"amount": "1d8×1,000", "chance": "15%"},
          "gp": {"amount": "1d6×1,000", "chance": "50%"},
          "gems": {"amount": "1d10", "chance": "30%"},
          "jewellery": {"amount": "1d6", "chance": "25%"},
          "magic_items": {"amount": "2 items or 1 potion", "chance": "15%"}
        }
      }
    },
    {
      "name": "Locathah",
      "frequency": "Rare",
      "numberAppearing": "20d10",
      "size": "Man-sized",
      "move": "120 ft",
      "armorClass": 6,
      "hitDice": "2",
      "TREASURE TYPE": "A",
      "attacks": "1",
      "damage": "By weapon",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "10%",
      "intelligence": "Very",
      "alignment": "Neutral",
      "levelXP": "2/30 + 1/hp",
      "treasure": "None carried. In lair: 1d4×1,000 cp (30%), 1d6×1,000 sp (20%), 1d8×1,000 ep (30%), 1d10×1,000 gp (40%), 1d6×100 pp (25%), 3d12 gems (65%), 4d10 jewellery (50%), 3 magic items (33%)"
    },
    {
      "name": "Lurker Above",
      "frequency": "Rare",
      "numberAppearing": "1",
      "size": "Large",
      "move": "10 ft; 90 ft flying (AA:I)",
      "armorClass": 6,
      "hitDice": "10",
      "TREASURE TYPE": "C, Y",
      "attacks": "1",
      "damage": "1d6",
      "specialAttacks": "Engulf and constrict (1d6/round), suffocation",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "95%",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": "7/1,500 + 4/hp",
      "treasure": "1d10×1,000 cp (25%), 1d8×1,000 sp (25%), 1d6×1,000 gp (25%), 1d6 gems (25%), 1d3 jewellery (25%), any two Magic Items (10%)"
    },
    {
      "name": "Manticore",
      "frequency": "Uncommon",
      "number_appearing": "1d4",
      "size": "Large",
      "movement": "120 ft; 180 ft flying (AA:II)",
      "armor_class": 4,
      "hit_dice": "6+3",
      "TREASURE TYPE": "E",
      "attacks": 3,
      "damage": "1d3/1d3/1d8",
      "special_attacks": "Tail spikes",
      "special_defenses": null,
      "magic_resistance": "Standard",
      "lair_probability": "20%",
      "intelligence": "Low",
      "alignment": "Lawful evil",
      "level_xp": "6/525 + 8/hp",
      "treasure": "1d10×1,000 cp (5%), 1d12×1,000 sp (25%), 1d6×1,000 ep (25%), 1d8×1,000 gp (25%), 1d12 gems, 1d8 jewellery, 3 misc. magic and 1 scroll (25%)"
    },
    {
      "name": "Medusa",
      "frequency": "Rare",
      "number_appearing": "1d3",
      "size": "Medium",
      "movement": "90 ft",
      "armor_class": 5,
      "hit_dice": "6+1",
      "TREASURE TYPE": "P, Q (x10), X, V",
      "attacks": 1,
      "damage": "1d6",
      "special_attacks": "Poison, petrifaction",
      "special_defenses": null,
      "magic_resistance": "Normal",
      "lair_probability": "50%",
      "intelligence": "Very to High",
      "alignment": "Neutral evil",
      "level_xp": "5/750+6/hp",
      "treasure": "1d6×1,000 sp (30%), 1d2×1,000 ep (25%), 2d6×1,000 gp (70%), 10d4 gems (50%), 1 misc magic + 1 potion (60%)"
    },
    {
      "name": "Men, Bandit",
      "category": "Men",
      "name_variants": "Brigand",
      "menLeaderMagicItems": {
        "description": "For each level a leader has attained, there is a 5% chance per category of possessing a magical item. Reroll cursed/undesirable once.",
        "fighter": ["armor", "shield", "sword", "miscellaneous_weapon", "potion"],
        "magic_user": ["scroll", "ring", "wand_staff_rod", "miscellaneous_magic"],
        "cleric": ["armor", "shield", "miscellaneous_weapon", "potion", "scroll", "miscellaneous_magic"],
        "cleric_note": "If no misc weapon or one with an edge, roll for wand/staff/rod instead; if not usable by cleric, no item",
        "thief": ["shield", "sword", "miscellaneous_weapon", "potion", "ring", "miscellaneous_magic"]
      },
      "frequency": "Common",
      "numberAppearing": "20d10",
      "size": "Man-sized",
      "move": "120 ft",
      "armorClass": "Determined by armor worn",
      "hitDice": "1d6 hp",
      "TREASURE TYPE": "Individuals: M; Lair: A",
      "attacks": 1,
      "damage": "By weapon",
      "specialAttacks": "Leader types may have spells",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "20%",
      "intelligence": "Mean (average to very)",
      "alignment": "Neutral (chaotic evil)",
      "levelXP": "Variable",
      "description": "Bandits roam every clime from temperate to subtropical. They travel in groups, generally led by high level fighters, magic-users and clerics. Those encountered in dungeons will be far fewer in number and often cooperating with thieves.",
      "leaders": {
        "per_20": {"level": 3, "class": "fighter", "count": 1},
        "per_30": {"level": 4, "class": "fighter", "count": 1},
        "per_40": {"level": 5, "class": "fighter", "count": 1},
        "per_50": {"level": 6, "class": "fighter", "count": 1},
        "commander": {
          "under_100": {"level": 8, "class": "fighter", "count": 1},
          "100_to_150": {"level": 9, "class": "fighter", "count": 1},
          "over_150": {"level": 10, "class": "fighter", "count": 1},
          "lieutenant": {"level": 7, "class": "fighter", "count": 1},
          "guards": {"level": 2, "class": "fighter", "count": 6}
        },
        "magic_user": {
          "chance": "25% per 50 bandits",
          "level": "7th to 10th (1d4+6)"
        },
        "cleric": {
          "chance": "15% per 50 bandits",
          "level": "5th or 6th",
          "assistant": {"level": "3rd or 4th", "count": 1}
        },
        "psionic_abilities": "Normal chances for leader-types"
      },
      "lair": {
        "types": {
          "informal_camp": "80%",
          "cave_complex": {"chance": "10%", "features": "Secret entrance"},
          "castle": {"chance": "10%", "defenses": "1-4 light catapults"}
        },
        "occupants": {
          "important_prisoners": "2-20",
          "camp_followers_slaves": "5-30"
        }
      },
      "equipment": {
        "mounts_armor_weapons": {
          "medium_horse_chainmail_shield_sword": "10%",
          "light_horse_leather_shield_spear": "10%",
          "light_horse_leather_light_crossbow": "10%",
          "leather_polearm": "10%",
          "leather_light_crossbow": "10%",
          "leather_short_bow": "10%",
          "leather_shield_sword": "40%"
        },
        "mounted_percentage": {
          "hills_mountains": "No more than 10%",
          "open_country": "90%"
        }
      },
      "brigand_variant": {
        "description": "Brigands are chaotic evil bandits with +1 morale in combat",
        "lair": {
          "cave_complex": "20%",
          "castle": "30%",
          "important_prisoners": "1-10",
          "camp_followers_slaves": "20-50"
        }
      },
      "treasure": {
        "individual": "2d4 gp",
        "lair": {
          "cp": {"amount": "1d6×1,000", "chance": "25%"},
          "sp": {"amount": "1d6×1,000", "chance": "30%"},
          "ep": {"amount": "1d6×1,000", "chance": "35%"},
          "gp": {"amount": "1d10×1,000", "chance": "40%"},
          "pp": {"amount": "1d4×100", "chance": "25%"},
          "gems": {"amount": "4d10", "chance": "60%"},
          "jewellery": {"amount": "3d10", "chance": "50%"},
          "magic_items": {"amount": 3, "chance": "30%"}
        }
      }
    },
    {
      "name": "Men, Berserker",
      "category": "Men",
      "frequency": "Rare",
      "numberAppearing": "10d10",
      "size": "Man-sized",
      "move": "120 ft",
      "armorClass": 7,
      "hitDice": "1d6+1 hp",
      "TREASURE TYPE": "Individuals: K; Lair: B",
      "attacks": "1 (or 2)",
      "damage": "By weapon",
      "specialAttacks": "Battle fury (strike twice or at +2)",
      "specialDefenses": "Never check morale",
      "magicResistance": "Standard",
      "lairProbability": "10%",
      "intelligence": "Mean (average to very)",
      "alignment": "Neutral",
      "levelXP": "Variable",
      "description": "Berserkers are warrior bands that fight with fierce battle-fury, either striking twice per round or making one attack at +2. They never use armor and never make morale checks in battle.",
      "leaders": {
        "per_10": {"level": 1, "class": "fighter", "count": 1},
        "per_20": {"level": 2, "class": "fighter", "count": 1},
        "per_30": {"level": 3, "class": "fighter", "count": 1},
        "per_40": {"level": 4, "class": "fighter", "count": 1},
        "per_50": {"level": 5, "class": "fighter", "count": 1},
        "war_chief": {
          "less_than_60": {"level": 9, "class": "fighter", "count": 1},
          "more_than_60": {"level": 10, "class": "fighter", "count": 1}
        },
        "subchieftains": {
          "less_than_60": {"level": 6, "class": "fighter", "count": 2},
          "more_than_60": {"level": 7, "class": "fighter", "count": 2}
        },
        "cleric": {
          "chance": "50% per 10 berserkers",
          "level": 7,
          "class": "cleric",
          "count": 1,
          "assistants": {"level": "3rd or 4th", "count": "1d4"}
        }
      },
      "treasure": {
        "individual": "3d6 sp",
        "lair": {
          "cp": {"amount": "1d8×1,000", "chance": "50%"},
          "sp": {"amount": "1d6×1,000", "chance": "25%"},
          "ep": {"amount": "1d4×1,000", "chance": "25%"},
          "pp": {"amount": "1d3×1,000", "chance": "25%"},
          "gems": {"amount": "1d8", "chance": "30%"},
          "jewellery": {"amount": "1d4", "chance": "20%"},
          "magic_items": {"amount": 1, "chance": "10%"}
        }
      }
    },
    {
      "name": "Men, Buccaneer",
      "category": "Men",
      "name_variants": "Pirate",
      "frequency": "Uncommon",
      "numberAppearing": "50d6",
      "size": "Man-sized",
      "move": "120 ft",
      "armorClass": "Determined by armor worn",
      "hitDice": "1d6 hp",
      "TREASURE TYPE": "Individuals: K; Lair: W",
      "attacks": 1,
      "damage": "By weapon",
      "specialAttacks": "Leader types",
      "specialDefenses": "Leader types",
      "magicResistance": "Standard",
      "lairProbability": "80% or 100%",
      "intelligence": "Mean (average to very)",
      "alignment": "Neutral (chaotic evil)",
      "levelXP": "Variable",
      "description": "Buccaneers are seafaring raiders found on oceans, seas, large lakes, and broad rivers. Their lair is typically their vessel(s). Only 20% of the time will they be encountered off their ship(s) along some coast or shore. Pirates are chaotic evil buccaneers who otherwise conform to the same characteristics.",
      "leaders": {
        "per_50": {"level": 3, "class": "fighter", "count": 1},
        "per_100": {"level": 5, "class": "fighter", "count": 1},
        "captain": {
          "less_than_200": {"level": 8, "class": "fighter", "count": 1},
          "more_than_200": {"level": 10, "class": "fighter", "count": 1}
        },
        "officers": {
          "lieutenant": {"level": "6th or 7th", "count": 1},
          "mates": {"level": 4, "count": 4}
        },
        "spellcasters": {
          "cleric": {"level": "12th to 15th", "chance": "15% per 50 buccaneers"},
          "magic_user": {"level": "6th to 8th", "chance": "10% per 50 buccaneers"}
        }
      },
      "prisoners": "2-5 in lair, held for ransom",
      "equipment": {
        "armor_weapons": {
          "chainmail_shield_sword_handaxe": "5%",
          "chainmail_sword": "5%",
          "leather_shield_sword": "10%",
          "leather_spear": "30%",
          "leather_axe": "20%",
          "leather_heavy_crossbow": "10%",
          "leather_light_crossbow": "20%"
        },
        "leader_armor": "Leaders wear chainmail rather than plate armor; magic armor will be chain variety"
      },
      "treasure": {
        "individual": "3d6 sp",
        "lair": {
          "gp": {"amount": "5d6×1,000", "chance": "60%"},
          "pp": {"amount": "1d8×100", "chance": "15%"},
          "gems": {"amount": "1d8×10", "chance": "60%"},
          "jewellery": {"amount": "5d8", "chance": "50%"},
          "map": {"chance": "55%"}
        }
      }
    },
    {
      "name": "Men, Caveman",
      "category": "Men",
      "frequency": "Rare",
      "numberAppearing": "10d10",
      "size": "Man-sized",
      "move": "120 ft",
      "armorClass": 8,
      "hitDice": 2,
      "TREASURE TYPE": "See treasure",
      "attacks": 1,
      "damage": "By weapon (+1 damage from strength)",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "40%",
      "intelligence": "Low (to average)",
      "alignment": "Neutral",
      "levelXP": "2/20+2/hp",
      "description": "Cavemen are primitive, very fierce humans found in areas otherwise uninhabited by humans. They use spears, stone axes (treat as battle axes), and clubs (treat as morning stars). +1 damage from strength. Fearful of the unknown (–1 morale checks).",
      "leaders": {
        "per_10": {"level": 3, "class": "fighter", "count": 1},
        "commander": {
          "chief": {"level": 5, "class": "fighter", "count": 1},
          "subchiefs": {"level": 4, "class": "fighter", "count": "1d4"}
        },
        "shaman": {"chance": "10% per 10 cavemen", "level": 3, "class": "cleric", "count": 1}
      },
      "equipment": {
        "spear_stone_axe": "10%",
        "stone_axe": "20%",
        "club": "50%",
        "spear": "20%"
      },
      "lair": {
        "type": "Caves or caverns",
        "population": {
          "females": "100% of males",
          "young": "50% of males"
        }
      },
      "treasure": {
        "lair": {
          "chance": "5% per 10 cavemen, only one type if any",
          "ivory_tusks": {"amount": "2d6", "value": "1,000 gp each", "carry": "2 men per tusk"},
          "gold_nuggets": {"amount": "4d20", "value": "5 gp each"},
          "uncut_gems": {"amount": "1d100", "value": "10 gp base each"}
        }
      },
      "tribesman_variant": {
        "description": "Primitive tribesmen typically found in tropical jungles or on islands. Use large shields (AC 7). Dwell in villages of grass, bamboo, or mud huts.",
        "frequency": "Rare",
        "numberAppearing": "10d12",
        "armorClass": 7,
        "hitDice": 1,
        "leaders": {
          "per_10": {"level": 4, "class": "cleric (druidical)", "count": 1},
          "per_30": {"level": 6, "class": "cleric (druidical)", "count": 1},
          "head_cleric": {"level": 8, "class": "cleric (witchdoctor)", "count": 1}
        },
        "equipment": {
          "shield_spear_club": "30%",
          "shield_2_spears": "40%",
          "shortbow_club": "30%",
          "note": "Treat clubs as maces"
        },
        "lair": {
          "type": "Village of grass, bamboo, or mud huts",
          "palisade": "50% chance of log palisade",
          "population": {
            "females_and_young": "100% of males",
            "slaves": {"chance": "75%", "amount": "20-50"},
            "captives": {"chance": "50%", "amount": "2-12"}
          }
        },
        "treasure": "Same as cavemen but can possess all three types simultaneously"
      }
    },
    {
      "name": "Men, Characters",
      "category": "Men",
      "generator": "generateCharacterParty",
      "description": "This encounter generates a full adventuring party per DMG Appendix C rules. Includes 2–5 characters with henchmen to make a total of 7–9 members. Most will be mounted, level 7–10, and equipped with appropriate gear and magic items."
    },
    {
      "name": "Men, Dervish",
      "category": "Men",
      "name_variants": "Nomad",
      "frequency": "Rare (Uncommon)",
      "numberAppearing": "30d10",
      "size": "Man-sized",
      "move": "120 ft",
      "armorClass": "Determined by armor worn",
      "hitDice": "1d6 hp",
      "TREASURE TYPE": "Individuals: J, L; Lair: Z",
      "attacks": 1,
      "damage": "By weapon",
      "specialAttacks": "Leader types, +1 to hit and damage",
      "specialDefenses": "Never check morale",
      "magicResistance": "Standard",
      "lairProbability": "5% (15%)",
      "intelligence": "Mean (average to very)",
      "alignment": "Lawful good (neutral)",
      "levelXP": "Variable",
      "description": "Dervishes are highly religious desert nomads who are fanatical devotees to their religion. They gain +1 to combat and never check morale. Always mounted on light or medium warhorses. Encountered only in desert or steppes/plains areas.",
      "leaders": {
        "fighters": {
          "per_30": {"level": 3, "class": "fighter", "count": 1},
          "per_40": {"level": 4, "class": "fighter", "count": 1},
          "per_50": {"level": 5, "class": "fighter", "count": 1},
          "per_60": {"level": 6, "class": "fighter", "count": 1}
        },
        "clerics": {
          "under_125": {"level": 10, "class": "cleric", "count": 1},
          "under_250": {"level": 11, "class": "cleric", "count": 1},
          "over_250": {"level": 12, "class": "cleric", "count": 1},
          "assistants": {"level": "4th to 8th", "class": "cleric", "count": 2}
        },
        "magic_users": {
          "chance": "15% per 50 dervishes",
          "main": {"level": "7th or 8th", "count": 1},
          "assistants": {"level": "3rd or 4th", "count": 2},
          "note": "If more than 200 dervishes, magic-users will be higher level"
        },
        "psionic_abilities": "Leaders have normal chances for possession"
      },
      "equipment": {
        "mounts_armor_weapons": {
          "medium_warhorse_chainmail_shield_lance_sword": "25%",
          "medium_warhorse_chainmail_shield_composite_bow_sword": "5%",
          "light_warhorse_leather_shield_lance_sword": "50%",
          "light_warhorse_leather_shield_composite_bow_sword": "10%",
          "light_warhorse_leather_shield_light_crossbow_mace": "10%"
        },
        "leader_armor": "Leaders wear chainmail; if magic armor indicated, will be of that variety"
      },
      "fortress": {
        "population": "200-300 dervishes",
        "defenses": {
          "walls": true,
          "ballistae": "1-4",
          "light_catapults": "1-4",
          "heavy_catapults": "1-2"
        }
      },
      "nomad_variant": {
        "description": "Bands of desert or steppes/plains dwellers who roam freely about herding and hunting. They surprise on a 1-4 due to ability to use terrain.",
        "leaders": {
          "fighters": {
            "same_as_dervish": true,
            "main_leader": {
              "under_150": {"level": 8, "class": "fighter", "count": 1},
              "150_to_250": {"level": 9, "class": "fighter", "count": 1},
              "over_250": {"level": 10, "class": "fighter", "count": 1}
            },
            "subcommander": {"level": "6th to 8th", "count": 1},
            "guards": {"level": 2, "count": 12}
          },
          "clerics": {
            "chance": "15% per 50 nomads",
            "level": "4th to 7th",
            "permanent": {"level": 3, "count": 2}
          },
          "magic_users": {
            "chance": "15% per 50 nomads",
            "level": "5th to 8th",
            "permanent": {"level": 4, "count": 1}
          },
          "psionic_abilities": "Normal possibilities"
        },
        "equipment": {
          "desert_nomads": {
            "medium_warhorse_chainmail_shield_lance_sword": "10%",
            "medium_warhorse_chainmail_light_crossbow_sword": "10%",
            "light_warhorse_leather_shield_lance_sword": "50%",
            "light_warhorse_leather_shield_sword_javelins": "20%",
            "light_warhorse_leather_light_crossbow_sword": "10%"
          },
          "steppes_plains_nomads": {
            "medium_warhorse_chainmail_shield_lance_sword": "20%",
            "medium_warhorse_chainmail_composite_bow_sword": "10%",
            "light_warhorse_leather_shield_lance_sword": "20%",
            "light_warhorse_leather_composite_bow_sword": "50%"
          }
        },
        "lair": {
          "type": {
            "tents_or_yurts": {
              "chance": "90%",
              "location": "Oasis or stream"
            },
            "walled_city": {
              "chance": "10%",
              "additional_forces": {
                "footmen": "20-80",
                "armor": "Chain and shield",
                "weapons": {
                  "spear_sword": "50%",
                  "composite_bow_sword": "50%"
                }
              }
            }
          },
          "population": {
            "females": "200% of males",
            "children": "100% of males",
            "slaves": "10-100"
          },
          "animals": {
            "horses": "100-400",
            "herd_animals": "200-800 (sheep, goats, camels, cattle, and/or yaks)"
          }
        },
        "tactics": {
          "withdrawal": "Withdraw if over 25% casualties and enemy continues resistance",
          "feigned_retreat": "Will feign retreat to lure enemies into ambush",
          "capture": "75% likely to capture weaker groups",
          "parley": "90% likely to parley with near equal strength"
        }
      },
      "treasure": {
        "individual": {
          "dervish": "3d12 cp",
          "nomad": "2d6 ep"
        },
        "lair": {
          "cp": {"amount": "1d3×1,000", "chance": "20%"},
          "sp": {"amount": "1d4×1,000", "chance": "25%"},
          "ep": {"amount": "1d4×1,000", "chance": "25%"},
          "gp": {"amount": "1d4×1,000", "chance": "30%"},
          "pp": {"amount": "1d6×100", "chance": "30%"},
          "gems": {"amount": "1d6×10", "chance": "55%"},
          "jewellery": {"chance": "50%"},
          "magic_items": {"amount": 3, "chance": "50%"}
        }
      }
    },
    {
      "name": "Men, Merchant",
      "category": "Men",
      "frequency": "Common",
      "numberAppearing": "50d6",
      "size": "Man-sized",
      "move": "120 ft",
      "armorClass": "Determined by armor worn",
      "hitDice": "1d6 hp",
      "TREASURE TYPE": "See treasure",
      "attacks": "See below",
      "damage": "By weapon",
      "specialAttacks": "See below",
      "specialDefenses": "See below",
      "magicResistance": "Standard",
      "lairProbability": "0%",
      "intelligence": "Mean (very to high)",
      "alignment": "Neutral",
      "levelXP": "Variable",
      "description": "Merchant encounters are caravans with merchants (10%), drovers (10%), and guards (80%). The caravan includes pack animals, carts, and horses. At least 50% of guards are mounted on light or medium warhorses.",
      "leaders": {
        "captain": {"level": "6-11 (1d6+5)", "class": "fighter", "count": 1},
        "lieutenant": {"level": "1 less than captain", "class": "fighter", "count": 1},
        "guards": {"level": 2, "class": "fighter", "count": 12},
        "magic_user": {"chance": "10% per 50 persons", "level": "6-8 (1d3+5)"},
        "cleric": {"chance": "5% per 50 persons", "level": "5-7 (1d3+4)"},
        "thief": {"chance": "15% per 50 persons", "level": "8-10 (1d3+7)", "assistants": {"count": "1d4", "level": "3-7 (1d5+2)"}}
      },
      "equipment": {
        "armor_weapons": {
          "heavy_warhorse_plate_shield_lance_sword": {"chance": "10%", "note": "All 1st level fighters"},
          "medium_warhorse_chainmail_shield_lance_sword": "20%",
          "medium_warhorse_chainmail_shield_flail_mace": "10%",
          "light_warhorse_scale_light_crossbow_sword": "10%",
          "chainmail_polearm_mace": "10%",
          "chainmail_heavy_crossbow_mace": "10%",
          "ringmail_shield_spear_morning_star": "30%"
        },
        "leader_armor": "All higher level fighters and clerics will have plate armor and shield",
        "merchant_mounts": "Merchants always mounted on very swift light horses"
      },
      "treasure": {
        "merchants": "3d12 cp, 3d6 sp, 2d6 ep, 2d4 gp, 1d6 pp, 2d4 gp (40%), 1d6x10 pp (50%), 4d8 gems (55%), 1d12 pieces of jewellery (45%) each",
        "mercenaries": "3d6 sp each",
        "leaders": "2d4 gp each",
        "pay_box": {
          "description": "Hidden in caravan",
          "gold": "2,000-4,000 (1d3+1 × 1,000)",
          "platinum": "100-400 (1d4 × 100)",
          "gems": "4d4"
        },
        "caravan_goods": {
          "value": "10,000 to 60,000 gp",
          "transport": "10 pack animals or 1 cart per 5,000 gp worth of goods"
        }
      }
    },
    {
      "name": "Men, Patrol (Heavy)",
      "category": "Men",
      "name_variants": "Heavy Patrol, State Patrol (Heavy)",
      "frequency": "Uncommon",
      "numberAppearing": "d20+20",
      "size": "Man-sized",
      "move": "120 ft (mounted) or 90 ft (afoot)",
      "armorClass": "2 (officers), 3 (NCOs and veterans)",
      "hitDice": "F 0–6",
      "TREASURE TYPE": "See treasure",
      "attacks": 1,
      "damage": "By weapon",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "5%",
      "intelligence": "Average to High",
      "alignment": "Any (typically Lawful Neutral or Lawful Evil)",
      "levelXP": "Variable by class and level",
      "description": "Heavy patrols are organized military units of 21–40 men, typically mounted on medium or heavy warhorses unless terrain demands marching. They are trained for close-order combat and usually heavily armored. Patrol nationality determines specific weapons and heraldry. Encounters may include a spellcaster.",
      "leaders": {
        "officer": { "level": "5-6", "class": "fighter", "count": 1 },
        "subalterns": { "level": "3-4", "class": "fighter", "count": 2 },
        "serjeants": { "level": "2-3", "class": "fighter", "count": 6 },
        "veterans": { "level": 1, "class": "fighter", "hp": "7-12", "count": "7-10" },
        "regulars": { "level": 0, "class": "fighter", "hp": "4-7", "count": "9-24" },
        "spellcaster": {
          "options": [
            { "class": "cleric", "level": "5-6", "armorClass": 2 },
            { "class": "druid", "level": "5-6", "armorClass": 8 },
            { "class": "magic-user", "level": "4-5", "armorClass": 10 }
          ],
          "chance": "100%",
          "count": 1
        }
      },
      "equipment": {
        "mounts_armor_weapons": {
          "officer": "Heavy/medium horse, plate or banded mail, shield, broad or long sword",
          "subalterns": "As officer",
          "serjeants": "Chain or scale mail, shield, broad or long sword, appropriate national arms",
          "veterans": "Chain or scale mail, shield, melee weapon",
          "regulars": "Chain or leather armor, shield, melee weapon",
          "spellcaster": "Varies by class (e.g., clerics with chain, M-Us unarmored)"
        },
        "magic_item_chance": "5% per level of highest class (armor, shield, sword, potion, scroll, ring, rod)",
        "magic_item_types": {
          "fighter": ["armor", "shield", "sword", "misc weapon", "potion", "scroll"],
          "cleric": ["armor", "shield", "misc weapon", "misc magic", "potion", "scroll"],
          "magic_user": ["potion", "scroll", "ring", "rod", "misc magic"]
        }
      },
      "treasure": {
        "individual": "1d8 gp",
        "lair": {
          "gems": { "amount": "1d6", "chance": "25%" },
          "magic_items": { "amount": 1, "chance": "15%" }
        }
      }
    },
    {
      "name": "Men, Patrol (False)",
      "category": "Men",
      "name_variants": "False Patrol, Disguised Raiders, Impostor Soldiers",
      "frequency": "Rare",
      "numberAppearing": "15-60",
      "size": "Man-sized",
      "move": "120 ft (mounted) or 90 ft (afoot)",
      "armorClass": "Varies by role (see below)",
      "hitDice": "F 0–6",
      "TREASURE TYPE": "See treasure",
      "attacks": 1,
      "damage": "By weapon",
      "specialAttacks": "Surprise (disguise), Ambush tactics",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "10%",
      "intelligence": "Average to High",
      "alignment": "Neutral Evil or Chaotic Evil (usually)",
      "levelXP": "Variable by class and level",
      "description": "False patrols are raiding or scouting groups disguised as state soldiery. They use forged heraldry and mimic patrol formations to pass for legitimate forces. Small groups (under 42) act as scouts. Larger groups (42+) are raiders who deliberately conceal their full strength to appear as a typical patrol of 25–30 men. 30% of false patrols are raider types, often including hidden reserves.",
      "leaders": {
        "officer": { "level": "5-6", "class": "fighter", "count": 1 },
        "subalterns": { "level": "3-4", "class": "fighter", "count": 2 },
        "serjeants": { "level": "2-3", "class": "fighter", "count": 6 },
        "veterans": { "level": 1, "class": "fighter", "hp": "7-12", "count": "7-10" },
        "regulars": { "level": 0, "class": "fighter", "hp": "4-7", "count": "9-24" },
        "spellcaster": {
          "options": [
            { "class": "cleric", "level": "5-6", "armorClass": 2 },
            { "class": "druid", "level": "5-6", "armorClass": 8 },
            { "class": "magic-user", "level": "4-5", "armorClass": 10 }
          ],
          "chance": "30%",
          "count": 1
        }
      },
      "equipment": {
        "mounts_armor_weapons": {
          "officer": "Heavy/medium horse, plate or banded mail, shield, forged insignia, broad or long sword",
          "subalterns": "As officer",
          "serjeants": "Chain or scale mail, shield, forged insignia, broad or long sword",
          "veterans": "Chain or scale mail, melee weapon",
          "regulars": "Leather or chain armor, melee weapon",
          "spellcaster": "As appropriate to class (usually disguised as regulars)"
        },
        "magic_item_chance": "5% per level of highest class (armor, shield, sword, potion, scroll, ring, rod)",
        "magic_item_types": {
          "fighter": ["armor", "shield", "sword", "misc weapon", "potion", "scroll"],
          "cleric": ["armor", "shield", "misc weapon", "misc magic", "potion", "scroll"],
          "magic_user": ["potion", "scroll", "ring", "rod", "misc magic"]
        }
      },
      "treasure": {
        "individual": "1d8 gp",
        "lair": {
          "gems": { "amount": "2d6", "chance": "40%" },
          "magic_items": { "amount": 1, "chance": "20%" }
        }
      }
    },
    {
      "name": "Men, Patrol (Knight)",
      "category": "Men",
      "name_variants": "Knightly Patrol, Cavalry Patrol",
      "frequency": "Rare",
      "numberAppearing": "11-14 knights plus retainers",
      "size": "Man-sized",
      "move": "120 ft (mounted)",
      "armorClass": "2 (Knights, Clerics), 3 (Esquires), 4 (Serjeants)",
      "hitDice": "F 0–10",
      "TREASURE TYPE": "See treasure",
      "attacks": 1,
      "damage": "By weapon",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "10%",
      "intelligence": "High",
      "alignment": "Lawful Good or Lawful Neutral",
      "levelXP": "Variable by class and level",
      "description": "Knightly patrols are elite units of mounted warriors supported by retainers and clergy. They are mounted on heavy horses with full equipment and engage in military and ceremonial duties. Knights are well-armored and well-trained; their entourage includes esquires and serjeants, while chaplains offer divine aid.",
      "leaders": {
        "commander": { "level": "8-9", "class": "paladin or fighter", "count": 1 },
        "lieutenant": { "level": "6-7", "class": "paladin or fighter", "count": 1 },
        "knights": { "level": "4-6", "class": "fighter", "count": "9-12" },
        "chaplain": { "level": "7-9", "class": "cleric", "count": 1 },
        "assistant_clerics": { "level": "3-5", "class": "cleric", "count": "1d3" },
        "entourage": {
          "esquire": { "level": "2-3", "class": "fighter", "count": "1 per knight" },
          "serjeants": { "level": 1, "class": "fighter", "count": "5-8 per knight" }
        }
      },
      "equipment": {
        "mounts_armor_weapons": {
          "knights": "Heavy warhorse, plate or banded mail, lance, bastard sword, mace",
          "esquires": "Medium warhorse, chain or scale mail, lance, long sword, mace",
          "serjeants": "Light horse (optional), studded or leather armor, short sword; 50% with light crossbow or spear",
          "clerics": "Medium warhorse, plate or banded mail, flail, hammer, or mace"
        },
        "magic_item_chance": "5% per level of highest class (armor, shield, sword, potion, scroll, ring, rod)",
        "magic_item_types": {
          "fighter": ["armor", "shield", "sword", "misc weapon", "potion", "scroll"],
          "cleric": ["armor", "shield", "misc weapon", "misc magic", "potion", "scroll"]
        }
      },
      "treasure": {
        "individual": "2d6 gp",
        "lair": {
          "gems": { "amount": "1d4", "chance": "30%" },
          "magic_items": { "amount": 1, "chance": "20%" }
        }
      }
    },

    {
      "name": "Men, Patrol (Levies)",
      "category": "Men",
      "name_variants": "Levy Patrol, Militia Patrol",
      "frequency": "Common",
      "numberAppearing": "50–70",
      "size": "Man-sized",
      "move": "90 ft (afoot), officers on light horses",
      "armorClass": "4 (Captains), 5 (Lieutenants, Serjeants, Veterans), 6-7 (Levies)",
      "hitDice": "F 0–8",
      "TREASURE TYPE": "See treasure",
      "attacks": 1,
      "damage": "By weapon",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "5%",
      "intelligence": "Average",
      "alignment": "Lawful Neutral or Neutral",
      "levelXP": "Variable by class and level",
      "description": "Levies are hastily-raised militia footmen, drawn from the local populace in times of threat. They are commanded by trained officers and equipped with weapons typical of their region. In dangerous zones, they may be accompanied by scouts or spellcasters for added support. Non-human levies may be used in some areas.",
      "leaders": {
        "captain": { "level": "6-8", "class": "fighter or ranger", "count": 1 },
        "lieutenants": { "level": "4-5", "class": "fighter", "count": 2 },
        "serjeants": { "level": 3, "class": "fighter", "count": 4 },
        "veterans": { "level": "1-2", "class": "fighter", "count": 8 },
        "levies": { "level": 0, "class": "fighter", "hp": "3-6", "count": "41-50" },
        "spellcaster": {
          "options": [
            { "class": "cleric", "level": "4-5", "armorClass": 4 },
            { "class": "druid", "level": "4-6", "armorClass": 8 },
            { "class": "magic-user", "level": "3-5", "armorClass": 10 },
            { "class": "illusionist", "level": "3-5", "armorClass": 10 }
          ],
          "chance": "50% (1-2 may be present)",
          "count": "1–2"
        },
        "scouts": {
          "level": "3-5",
          "class": "ranger or thief",
          "armorClass": 5,
          "count": "1-4",
          "chance": "50% in troubled regions"
        }
      },
      "equipment": {
        "mounts_armor_weapons": {
          "captain": "Light horse, chain or banded mail, shield, regional sword or pole arm",
          "lieutenants": "Light horse, chain mail, melee weapon",
          "serjeants": "Chain mail or studded leather, pole arm or sword",
          "veterans": "Leather or chain armor, typical regional weapons",
          "levies": "Leather or padded armor, pikes, long spears, or pole arms; up to 50% with missile weapons (e.g., shortbows, slings)",
          "spellcasters": "Varies by class; often disguised or cloaked"
        },
        "magic_item_chance": "5% per level of highest class (armor, shield, sword, potion, scroll, ring, rod)",
        "magic_item_types": {
          "fighter": ["armor", "shield", "sword", "misc weapon", "potion", "scroll"],
          "cleric": ["armor", "shield", "misc weapon", "misc magic", "potion", "scroll"],
          "magic_user": ["potion", "scroll", "ring", "rod", "misc magic"]
        }
      },
      "treasure": {
        "individual": "1d4 gp",
        "lair": {
          "gems": { "amount": "1d4", "chance": "20%" },
          "magic_items": { "amount": 1, "chance": "10%" }
        }
      }
    },
    
    {
      "name": "Men, Patrol (Light)",
      "category": "Men",
      "name_variants": "Light Patrol, Skirmisher Patrol",
      "frequency": "Uncommon",
      "numberAppearing": "21-40",
      "size": "Man-sized",
      "move": "120 ft (mounted)",
      "armorClass": "4 (officers), 5 (NCOs and veterans), 6 (regulars)",
      "hitDice": "F 0–6",
      "TREASURE TYPE": "See treasure",
      "attacks": 1,
      "damage": "By weapon",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "5%",
      "intelligence": "Average to High",
      "alignment": "Any (usually Lawful Neutral or Chaotic Neutral)",
      "levelXP": "Variable by class and level",
      "description": "Light patrols are mobile reconnaissance units mounted on light warhorses. They are structured similarly to heavy patrols but have lighter armor, emphasize missile combat, and typically include 17–24 regulars. They are suited to skirmishes, screening operations, or pursuit.",
      "leaders": {
        "officer": { "level": "5-6", "class": "fighter", "count": 1 },
        "subalterns": { "level": "3-4", "class": "fighter", "count": 2 },
        "serjeants": { "level": "2-3", "class": "fighter", "count": 6 },
        "veterans": { "level": 1, "class": "fighter", "hp": "7-12", "count": "7-10" },
        "regulars": { "level": 0, "class": "fighter", "hp": "4-7", "count": "17-24" },
        "spellcaster": {
          "options": [
            { "class": "cleric", "level": "5-6", "armorClass": 4 },
            { "class": "druid", "level": "5-6", "armorClass": 10 },
            { "class": "magic-user", "level": "4-5", "armorClass": 12 }
          ],
          "chance": "100%",
          "count": 1
        }
      },
      "equipment": {
        "mounts_armor_weapons": {
          "officer": "Light warhorse, chain mail or equivalent, shield, sword or lance",
          "subalterns": "Light warhorse, chain or studded leather, sword or bow",
          "serjeants": "Light warhorse, studded leather, shortbow or spear",
          "veterans": "Light warhorse, studded or padded armor, shortbow or melee weapon",
          "regulars": "Light warhorse, padded or leather armor, shortbow or sling",
          "spellcaster": "As appropriate to class; likely unarmored if a magic-user"
        },
        "magic_item_chance": "5% per level of highest class (armor, shield, sword, potion, scroll, ring, rod)",
        "magic_item_types": {
          "fighter": ["armor", "shield", "sword", "misc weapon", "potion", "scroll"],
          "cleric": ["armor", "shield", "misc weapon", "misc magic", "potion", "scroll"],
          "magic_user": ["potion", "scroll", "ring", "rod", "misc magic"]
        }
      },
      "treasure": {
        "individual": "1d8 gp",
        "lair": {
          "gems": { "amount": "1d6", "chance": "25%" },
          "magic_items": { "amount": 1, "chance": "15%" }
        }
      }
    },

    {
      "name": "Men, Patrol (Medium)",
      "category": "Men",
      "name_variants": "Medium Patrol, Standard Cavalry Patrol",
      "frequency": "Uncommon",
      "numberAppearing": "21-40",
      "size": "Man-sized",
      "move": "120 ft (mounted)",
      "armorClass": "3 (officers), 4 (NCOs and veterans), 5 (regulars)",
      "hitDice": "F 0–6",
      "TREASURE TYPE": "See treasure",
      "attacks": 1,
      "damage": "By weapon",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "5%",
      "intelligence": "Average to High",
      "alignment": "Any (often Lawful Neutral)",
      "levelXP": "Variable by class and level",
      "description": "Medium patrols are structured like heavy patrols, but their equipment and armor are lighter. Officers ride medium warhorses while troops ride light horses. These patrols are balanced in speed, defense, and combat ability, often reflecting the culture and tactics of their home nation.",
      "leaders": {
        "officer": { "level": "5-6", "class": "fighter", "count": 1 },
        "subalterns": { "level": "3-4", "class": "fighter", "count": 2 },
        "serjeants": { "level": "2-3", "class": "fighter", "count": 6 },
        "veterans": { "level": 1, "class": "fighter", "hp": "7-12", "count": "7-10" },
        "regulars": { "level": 0, "class": "fighter", "hp": "4-7", "count": "9-24" },
        "spellcaster": {
          "options": [
            { "class": "cleric", "level": "5-6", "armorClass": 3 },
            { "class": "druid", "level": "5-6", "armorClass": 9 },
            { "class": "magic-user", "level": "4-5", "armorClass": 11 }
          ],
          "chance": "100%",
          "count": 1
        }
      },
      "equipment": {
        "mounts_armor_weapons": {
          "officer": "Medium warhorse, chain or scale mail, shield, national melee weapon",
          "subalterns": "Medium warhorse, chain or studded leather, weapon typical to homeland",
          "serjeants": "Light horse, studded leather or leather, national melee weapon",
          "veterans": "Light horse, leather armor, appropriate arms",
          "regulars": "Light horse, padded or leather armor, weapon typical of origin",
          "spellcaster": "Per class; usually unarmored for M-U or lightly armored for clerics"
        },
        "magic_item_chance": "5% per level of highest class (armor, shield, sword, potion, scroll, ring, rod)",
        "magic_item_types": {
          "fighter": ["armor", "shield", "sword", "misc weapon", "potion", "scroll"],
          "cleric": ["armor", "shield", "misc weapon", "misc magic", "potion", "scroll"],
          "magic_user": ["potion", "scroll", "ring", "rod", "misc magic"]
        }
      },
      "treasure": {
        "individual": "1d8 gp",
        "lair": {
          "gems": { "amount": "1d6", "chance": "30%" },
          "magic_items": { "amount": 1, "chance": "15%" }
        }
      }
    },
    
    {
      "name": "Men, Patrol (Slaver)",
      "category": "Men",
      "name_variants": "Slaver Patrol, Slave Train Escort",
      "frequency": "Rare",
      "numberAppearing": "20–50 (plus wagons/carts and slaves)",
      "size": "Man-sized",
      "move": "90 ft (afoot) or 120 ft (mounted)",
      "armorClass": "4 (officers), 5 (NCOs), 6 (guards)",
      "hitDice": "F 0–6",
      "TREASURE TYPE": "See treasure",
      "attacks": 1,
      "damage": "By weapon",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "10%",
      "intelligence": "Average",
      "alignment": "Lawful Evil or Neutral Evil",
      "levelXP": "Variable by class and level",
      "description": "Slaver patrols escort and guard slave caravans between strongholds or toward market destinations. They are similar in composition to levy or light patrols, but travel with 3–5 prison wagons or 5–7 carts. Each vehicle is guarded and chained for holding captives. These groups are cruel and well-prepared for dealing with escape attempts or ambushes. Slaves are typically chained in pairs and closely guarded.",
      "leaders": {
        "officer": { "level": "5-6", "class": "fighter or slaver", "count": 1 },
        "lieutenants": { "level": "3-4", "class": "fighter", "count": 2 },
        "serjeants": { "level": "2-3", "class": "fighter", "count": 4 },
        "guards": { "level": 0, "class": "fighter", "hp": "4-7", "count": "12-30" },
        "drivers": { "level": 0, "class": "fighter or teamster", "hp": "3-6", "count": "3-7" }
      },
      "equipment": {
        "mounts_armor_weapons": {
          "officer": "Medium warhorse, scale or chain mail, whip or sword",
          "lieutenants": "Light horse, studded leather, sword or crossbow",
          "serjeants": "Afoot or mounted, studded leather, pole arm, short sword",
          "guards": "Afoot, leather or padded armor, short sword, whip, 50% with missile weapon",
          "drivers": "Afoot, leather armor, club or short sword",
          "vehicles": "3–5 prison wagons or 5–7 carts, each with chains and restraints"
        },
        "magic_item_chance": "5% per level of highest class (armor, shield, weapon, potion, scroll)",
        "magic_item_types": {
          "fighter": ["armor", "shield", "sword", "misc weapon", "potion", "scroll"]
        }
      },
      "treasure": {
        "individual": "1d10 gp (officers only)",
        "lair": {
          "gems": { "amount": "2d4", "chance": "50%" },
          "magic_items": { "amount": 1, "chance": "20%" },
          "trade_goods": "1–100 slaves, 10–100 gp per head if sold"
        }
      },
      "slaves": {
        "count": "1d100",
        "status": "Chained in pairs, lightly clothed, poorly fed; 90% are noncombatants"
      }
    },
    
    {
      "name": "Men, Patrol (Warband)",
      "category": "Men",
      "name_variants": "Nomadic Warband, Raider Warband",
      "frequency": "Rare",
      "numberAppearing": "90–120",
      "size": "Man-sized",
      "move": "120 ft (mounted)",
      "armorClass": "Determined by armor worn",
      "hitDice": "1d6 hp",
      "TREASURE TYPE": "See treasure",
      "attacks": 1,
      "damage": "By weapon",
      "specialAttacks": "Tactical ambush, feigned retreat",
      "specialDefenses": "Morale bonuses, surprise in terrain",
      "magicResistance": "Standard",
      "lairProbability": "15% (special loot carried if lair result)",
      "intelligence": "Mean (average to very)",
      "alignment": "Neutral (often with Chaotic or Evil tendencies)",
      "levelXP": "Variable",
      "description": "Warbands are large, fast-moving forces of nomadic warriors, raiders, or militant tribesmen. They operate as mobile forces with flexible tactics, often carrying special loot and surprising enemies using terrain or retreat lures. Their structure follows nomadic patterns, including experienced leaders and specialized mounted troops.",
      "leaders": {
        "fighters": {
          "per_30": { "level": 3, "class": "fighter", "count": 1 },
          "per_40": { "level": 4, "class": "fighter", "count": 1 },
          "per_50": { "level": 5, "class": "fighter", "count": 1 },
          "per_60": { "level": 6, "class": "fighter", "count": 1 },
          "main_leader": {
            "under_150": { "level": 8, "class": "fighter", "count": 1 },
            "150_to_250": { "level": 9, "class": "fighter", "count": 1 },
            "over_250": { "level": 10, "class": "fighter", "count": 1 }
          },
          "subcommander": { "level": "6th to 8th", "class": "fighter", "count": 1 },
          "guards": { "level": 2, "class": "fighter", "count": 12 }
        },
        "clerics": {
          "chance": "15% per 50 warband members",
          "level": "4th to 7th",
          "permanent": { "level": 3, "class": "cleric", "count": 2 }
        },
        "magic_users": {
          "chance": "15% per 50 warband members",
          "level": "5th to 8th",
          "permanent": { "level": 4, "class": "magic-user", "count": 1 }
        },
        "psionic_abilities": "Normal chances for psionic leadership"
      },
      "equipment": {
        "mounts_armor_weapons": {
          "medium_warhorse_chainmail_shield_lance_sword": "10%",
          "medium_warhorse_chainmail_composite_bow_sword": "10%",
          "light_warhorse_leather_shield_lance_sword": "20%",
          "light_warhorse_leather_composite_bow_sword": "50%",
          "light_warhorse_leather_crossbow_sword": "10%"
        },
        "leader_armor": "Chainmail or better; magical items if applicable"
      },
      "tactics": {
        "withdrawal": "Withdraw if 25% casualties and resistance continues",
        "feigned_retreat": "Will feign retreat to lure enemies into ambush",
        "capture": "75% likely to capture smaller or weaker groups",
        "parley": "90% chance to parley if opposing force is of similar strength"
      },
      "treasure": {
        "individual": "2d6 ep",
        "lair": {
          "cp": { "amount": "1d3×1000", "chance": "20%" },
          "sp": { "amount": "1d4×1000", "chance": "25%" },
          "ep": { "amount": "1d4×1000", "chance": "25%" },
          "gp": { "amount": "1d4×1000", "chance": "30%" },
          "pp": { "amount": "1d6×100", "chance": "30%" },
          "gems": { "amount": "1d6×10", "chance": "55%" },
          "jewellery": { "chance": "50%" },
          "magic_items": { "amount": 3, "chance": "50%" },
          "special_loot": "If lair result rolled, this represents loot being carried rather than a fixed site"
        }
      }
    },
    {
      "name": "Men, Raider",
      "category": "Men",
      "name_variants": "Raiding Party, Human Raiders",
      "frequency": "Variable (by region)",
      "numberAppearing": "Base group size of matching type + 5d6",
      "size": "Man-sized",
      "move": "Varies (mounted or afoot)",
      "armorClass": "Varies by source group",
      "hitDice": "Varies by group type (F 0–10)",
      "TREASURE TYPE": "See treasure",
      "attacks": 1,
      "damage": "By weapon",
      "specialAttacks": "Ambush, surprise, mounted charge (if applicable)",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "15% (represents spoils from recent raids)",
      "intelligence": "Average",
      "alignment": "Typically Chaotic Neutral or Neutral Evil",
      "levelXP": "Variable by composition",
      "description": "Raider bands are composed of hostile forces from nearby regions. Their composition mirrors nearby patrol or humanoid types, with an additional 5–30 troops. Raiders may be mounted or afoot depending on terrain, origin, and success—e.g., swamp tribesmen raiding with captured horses. Raider morale and discipline vary greatly. If encountered 'in lair', they carry treasure from recent raids.",
      "composition": {
        "base_type": "Derived from adjacent encounter table entry (e.g., Bandits, Knights, Patrol types, Humanoids)",
        "additional_troops": "5–30 extra members (1d6+4 × 5)",
        "mount_status": "50% chance of being mounted if terrain and origin allow",
        "example": "If based on 'Bandits', roll Bandit stats and add 5–30; if based on 'Hool marshmen', use 'Men, Tribesmen' template plus 5–30"
      },
      "equipment": {
        "armor_weapons": "Varies by parent type; raiders often have mixed or scavenged gear",
        "mounts": "Light or medium horses, possibly stolen",
        "loot_transport": "Captured carts, beasts of burden, or magical bags if successful"
      },
      "tactics": {
        "alert_in_enemy_territory": true,
        "relaxed_in_own_territory": true,
        "ambush_or_hit_and_run": true,
        "fallback_behavior": "Will retreat if severely outnumbered unless fanatical"
      },
      "treasure": {
        "individual": "1d10 gp or stolen trade goods",
        "lair": {
          "type": "Loot from raids or Type A treasure",
          "details": {
            "cp": { "amount": "2d10×100", "chance": "20%" },
            "sp": { "amount": "2d8×100", "chance": "30%" },
            "ep": { "amount": "1d6×100", "chance": "25%" },
            "gp": { "amount": "2d6×100", "chance": "50%" },
            "gems": { "amount": "2d6", "chance": "40%" },
            "magic_items": { "amount": "1–3", "chance": "25%" }
          }
        }
      },
      "notes": "This is a template-type encounter. The DM or system should determine the specific base type from nearby regions, then apply raider modifications (size boost, tactics, treasure). Examples include: 'Bandits from Shield Lands', 'Soldiery from Ket', or 'Knights from the Great Kingdom'."
    },
    
    {
      "name": "Men, Pilgrim",
      "category": "Men",
      "frequency": "Uncommon",
      "numberAppearing": "10d10",
      "size": "Man-sized",
      "move": "120 ft",
      "armorClass": "Determined by armor worn",
      "hitDice": "1d6 hp",
      "TREASURE TYPE": "See treasure",
      "attacks": "See below",
      "damage": "By weapon",
      "specialAttacks": "See below",
      "specialDefenses": "See below",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Mean (very to high)",
      "alignment": "See below",
      "levelXP": "Variable",
      "description": "Pilgrims are religious followers traveling to holy sites. Most (75%) travel without mounts, but if mounted, all members will be mounted.",
      "alignment_table": {
        "lawful_good": {"chance": "35%", "fighter_class": "paladin", "cleric_class": "cleric"},
        "chaotic_good": {"chance": "20%", "fighter_class": "ranger", "cleric_class": "cleric"},
        "neutral": {"chance": "10%", "fighter_class": "fighter", "cleric_class": "druid"},
        "lawful_evil": {"chance": "20%", "fighter_class": "fighter", "cleric_class": "cleric", "special": "All pilgrims fight as berserkers, armed only with daggers"},
        "chaotic_evil": {"chance": "15%", "fighter_class": "fighter", "cleric_class": "cleric", "thief_class": "assassin"}
      },
      "leaders": {
        "clerics": {
          "level_2": {"level": 2, "class": "cleric", "count": "1d6"},
          "level_4": {"level": 4, "class": "cleric", "count": "1d4"},
          "level_6": {"level": 6, "class": "cleric", "count": "1d2"},
          "level_8": {"level": 8, "class": "cleric", "count": 1},
          "assistants": [
            {"level": 3, "class": "cleric", "count": 1},
            {"level": 5, "class": "cleric", "count": 1}
          ]
        },
        "fighters": {
          "chance": "10% per 10 pilgrims",
          "count": "1d10",
          "level": "1d8",
          "note": "Class depends on alignment: LG=paladin, CG=ranger, otherwise fighter"
        },
        "thieves": {
          "chance": "10% per 10 pilgrims",
          "count": "1d6",
          "level": "2d4 (2nd-7th)",
          "note": "If chaotic evil alignment, thieves are assassins of same level"
        },
        "magic_user": {
          "chance": "5% per 10 pilgrims",
          "level": "1d4+5 (6th-9th)"
        },
        "monk": {
          "chance": "25%",
          "level": "1d2+4 (5th or 6th)",
          "count": 1
        },
        "psionic_abilities": "All above average characters have normal chances"
      },
      "mounted": "25% chance all mounted; otherwise 75% chance all afoot (never mixed)",
      "treasure": {
        "pilgrims_and_monks": "Type J each",
        "fighters": "Types L and M each",
        "clerics": "Types J, K, and M each",
        "magic_users": "Types L, N, and Q each",
        "thieves": "Types J, N, and Q each",
        "holy_artifact": {
          "chance": "5%",
          "description": "Religious artifact, carefully hidden and well guarded by traps and/or magic devices"
        }
      }
    },
    {
      "name": "Men, Rhennee",
      "category": "Men",
      "name_variants": "Rhennee, Gypsy Barge Folk, Rhenn-Folk",
      "frequency": "Uncommon (Rare inland)",
      "numberAppearing": "7–12 barges (each with 17–31 adults + children)",
      "size": "Man-sized",
      "move": "120 ft (mounted or ashore), 90 ft (aboard barge)",
      "armorClass": "Varies by location and rank (see Equipment)",
      "hitDice": "Varies by role; average HP by class and level",
      "TREASURE TYPE": "See treasure",
      "attacks": 1,
      "damage": "By weapon; harpoon special",
      "specialAttacks": "Harpoon (2d8/2d12, dragging), coordinated ranged attacks",
      "specialDefenses": "All Rhennee trained in crossbows and daggers",
      "magicResistance": "Standard",
      "lairProbability": "10% (15% if at secret camp)",
      "intelligence": "High (scheming)",
      "alignment": "Neutral",
      "levelXP": "Variable by level",
      "description": "The Rhennee are semi-nomadic barge folk who ply the rivers and lakes of the central Flanaess. Known for their secretive and self-serving culture, they rarely travel inland except in multi-barge flotillas. All Rhennee are trained in dagger and crossbow from youth, and many are skilled thieves or illusionists. Although friendly-seeming, they are deceitful to outsiders. Children, outsiders adopted into the folk, or kidnapped youth may be raised as full Rhennee.",
      "leaders": {
        "chief": { "level": "4-6 / 5-7", "class": "fighter/thief", "count": 1 },
        "guards": { "level": "3-5 / 2-4", "class": "fighter/thief", "count": "2-4" },
        "folk": { "level": "1-2 / 1-4", "class": "fighter/thief", "count": "13-24" },
        "wise_woman": { "level": "4-7 / 1-4", "class": "illusionist/thief", "count": 1 },
        "advisors": { "level": "1-3 / 1-2", "class": "illusionist/thief", "count": "1-2" },
        "children": { "level": "0 or thief 1 / fighter 0", "count": "7-12", "note": "Children above age 9 fight as 1st-level thieves and 0-level fighters" },
        "noble": {
          "chance": "If max barge group (12), 50% chance",
          "level": "8-9 / 10-13",
          "class": "fighter/thief",
          "magic_items": ["magic armor", "misc weapon", "misc magic", "ring"],
          "note": "One barge will have maximum stats and noble leadership"
        },
        "bard": {
          "chance": "50% if >1 mile inland; automatic if noble is present",
          "level": "3rd–8th (no noble) or 7th–12th (with noble)",
          "class": "bard"
        }
      },
      "equipment": {
        "training": "All Rhennee know dagger, crossbow, sling, harpoon, and one melee weapon by adulthood.",
        "aboard_barge": {
          "chief": "Leather & shield, harpoon, battle axe, long sword, sling, daggers",
          "guards": "Leather & shield, harpoon, battle axe, long sword, sling, dagger",
          "folk": [
            "Leather + dagger + 30%: glaive-guisarme, short sword",
            "30%: trident, sling",
            "40%: javelins, battle axe"
          ],
          "children": "Club, dagger",
          "weapons": "Each barge carries 2 ballistae (fore & aft), 12 heavy crossbows, harpoons, spears, and javelins"
        },
        "ashore": {
          "chief": "Chain & shield, battle axe, long sword, sling, dagger, 6 darts",
          "guards": "Scale & shield, spear, battle axe, long sword, sling, dagger, darts",
          "folk": [
            "Leather & dagger + 30%: light crossbow, short sword",
            "30%: trident, sling",
            "40%: spear, javelins, battle axe"
          ],
          "children": "Club, dagger"
        },
        "harpoon_rules": {
          "range": "30 yards (spear)",
          "damage": "2d8 (S-M), 2d12 (L)",
          "effects": "On hit, target must save vs poison or take 1 extra damage/round and be subject to dragging"
        },
        "magic_item_chance": {
          "fighter": "5% per fighter level for armor/shield/misc weapon",
          "highest_level": "5% per highest level for sword, potion, scroll, ring, misc magic",
          "illusionist": "5% per level for rods, etc."
        }
      },
      "treasure": {
        "individual": "1d3 of each coin type per level",
        "barge": {
          "type": ["O", "P", "Q", "Q (jewelry bonus)"],
          "jewelry": "2-5 pieces (if Q)",
          "note": "Each barge stores treasure in concealed compartments; nobles have highest shares"
        }
      },
      "vessel": {
        "type": "60-ft junk-like barge",
        "layout": {
          "forecastle": "Wise women and families",
          "sterncastle": "Chief, guards, and their families",
          "lower_deck": "Folk, animals, and cargo",
          "defense": "Ballistae, crossbows at 4 ft. intervals, sweeps, longboat, and dinghy"
        },
        "construction": "10-ft forecastle, 12-ft sterncastle, low draft, chained or cabled to other barges"
      },
      "special_notes": {
        "habitat": "Always near major lakes or rivers; 10% chance of being at inland camp",
        "behavior": "Seem friendly, actually scheming and cautious; dishonest to outsiders, loyal to folk",
        "culture": "Strict internal code, raise stolen or adopted children as their own",
        "appearance": "Short, wiry, dark curly hair, claim extraplanar origin from Rhop",
        "stat_generation": {
          "female": {
            "strength": "3 of 4d6",
            "intelligence": "3 of 4d6",
            "wisdom": "3 of 4d6",
            "dexterity": "2 of 3d6+6",
            "constitution": "3 of 5d6",
            "charisma": "3 of 6d6"
          },
          "male": {
            "strength": "3 of 5d6",
            "intelligence": "3 of 4d6",
            "wisdom": "3 of 4d6",
            "dexterity": "2 of 3d6+6",
            "constitution": "3 of 5d6",
            "charisma": "3 of 5d6"
          }
        }
      }
    },

    {
      "name": "Men, Tribesmen",
      "category": "Men",
      "name_variants": "Jungle Tribesmen, Hillmen, Marshmen, Mountaineers",
      "frequency": "Uncommon (Varies by region)",
      "numberAppearing": "10d12 plus leaders and spellcasters",
      "size": "Man-sized",
      "move": "120 ft (afoot)",
      "armorClass": "7 (primitive) to 5 (civilized types with better gear)",
      "hitDice": "1d6 hp (standard tribesmen), variable for leaders",
      "TREASURE TYPE": "See treasure",
      "attacks": 1,
      "damage": "By weapon",
      "specialAttacks": "Ambush (if terrain allows), spell use by leaders",
      "specialDefenses": "Terrain camouflage",
      "magicResistance": "Standard",
      "lairProbability": "60% (village or camp)",
      "intelligence": "Low to Average",
      "alignment": "Neutral or Chaotic Neutral",
      "levelXP": "Variable by class and role",
      "description": "Tribesmen are semi-primitive or primitive peoples dwelling in wilderness areas of the Flanaess. Jungle or island tribes are more savage and use shamans and witch doctors (druidic clerics), while hillmen, marshmen, and mountaineers may be refugees with access to more advanced weapons and trained clerics or illusionists. Tribesmen are highly territorial and often keep slaves or captives. Their armament varies by region and culture.",
      "leaders": {
        "chieftain": { "level": "1d4+2", "class": "fighter", "count": 1 },
        "lieutenants": { "level": "1d3+1", "class": "fighter", "count": "1 per 20 tribesmen" },
        "clerics": {
          "primitive": [
            { "level": 4, "class": "druid", "count": "1 per 10 tribesmen" },
            { "level": 6, "class": "druid", "count": "1 per 30 tribesmen" },
            { "level": 8, "class": "druid", "title": "head cleric (witchdoctor)", "count": 1 }
          ],
          "civilized": {
            "chance": "Common",
            "level": "1d4+2",
            "class": "cleric or druid",
            "count": "1d3"
          }
        },
        "illusionists": {
          "chance": "10% per 10 civilized tribesmen",
          "level": "1d3+3",
          "class": "illusionist",
          "count": "1"
        }
      },
      "equipment": {
        "primitive": [
          "Shield, spear, and club",
          "Shield and 2 spears",
          "Shortbow and club (treat clubs as maces)"
        ],
        "civilized": {
          "hillmen": "Sling and spear",
          "marshmen": "Shortbow and long spear",
          "mountaineers": "Crossbow and pole arm",
          "note": "Armor and arms similar to bandits but modified by terrain and availability"
        }
      },
      "village": {
        "structure": "Grass, bamboo, or mud huts",
        "defenses": {
          "palisade": { "chance": "50%", "type": "log" }
        },
        "inhabitants": {
          "females": "Equal to number of males",
          "children": "Equal to number of males",
          "slaves": { "chance": "75%", "count": "20–50" },
          "captives": { "chance": "50%", "count": "2–12", "note": "Held as food" }
        }
      },
      "magic_item_chance": {
        "fighters": "5% per level (armor, sword, misc weapon, potion)",
        "clerics": "5% per level (armor, misc weapon, potion, scroll, misc magic)",
        "illusionists": "5% per level (potion, scroll, ring, misc magic)"
      },
      "treasure": {
        "individual": "1d6 cp or ep per tribesman",
        "lair": {
          "reference": "Same as Cavemen (Types O, P, and Q)",
          "note": "May include jewelry and basic magic if spellcasters are present"
        }
      }
    },
      {
        "name": "Mephit, Fire",
        "frequency": "Very rare",
        "number_appearing": "1",
        "size": "Man-sized (5 ft tall)",
        "movement": "120 ft; 240 ft flying (AA:IV)",
        "armor_class": 5,
        "hit_dice": "3+1",
        "TREASURE TYPE": "See treasure",
        "attacks": 2,
        "damage": "1d3/1d3 (+1 heat each)",
        "special_attacks": "Breath weapon (jet or blanket of flame)",
        "special_defenses": "See below",
        "magic_resistance": "Standard",
        "lair_probability": "Nil",
        "intelligence": "Average",
        "alignment": "Any evil",
        "level_xp": "3/155 + 4/hp",
        "treasure": "3d12pp per individual",
    },
    {
        "name": "Mephit, Lava",
        "frequency": "Very rare",
        "number_appearing": "1",
        "size": "Man-sized (5 ft tall)",
        "movement": "120 ft; 240 ft flying (AA:IV)",
        "armor_class": 6,
        "hit_dice": "3",
        "TREASURE TYPE": "See treasure",
        "attacks": 2,
        "damage": "1 + 1d8 heat each",
        "special_attacks": "Breath weapon (molten blob); dissolves materials",
        "special_defenses": "Regenerates in lava",
        "magic_resistance": "Standard",
        "lair_probability": "Nil",
        "intelligence": "Average",
        "alignment": "Any evil",
        "level_xp": "3/110 + 3/hp",
        "treasure": "3d12pp per individual"
    },
    {
        "name": "Mephit, Smoke",
        "frequency": "Very rare",
        "number_appearing": "1",
        "size": "Man-sized (5 ft tall)",
        "movement": "120 ft; 240 ft flying (AA:IV)",
        "armor_class": 4,
        "hit_dice": "3",
        "TREASURE TYPE": "See treasure",
        "attacks": 2,
        "damage": "1d2/1d2",
        "special_attacks": "Breath weapon (smoke orb)",
        "special_defenses": "Flash-fire on death",
        "magic_resistance": "Standard",
        "lair_probability": "Nil",
        "intelligence": "Average",
        "alignment": "Any evil",
        "level_xp": "3/100 + 3/hp",
        "treasure": "3d12pp per individual"
    },
    {
        "name": "Mephit, Steam",
        "frequency": "Very rare",
        "number_appearing": "1",
        "size": "Man-sized (5 ft tall)",
        "movement": "120 ft; 240 ft flying (AA:IV)",
        "armor_class": 7,
        "hit_dice": "3+3",
        "TREASURE TYPE": "See treasure",
        "attacks": 2,
        "damage": "1d4/1d4",
        "special_attacks": "Breath weapon (scalding water)",
        "special_defenses": "See below",
        "magic_resistance": "Standard",
        "lair_probability": "Nil",
        "intelligence": "Average",
        "alignment": "Any evil",
        "level_xp": "3/170 + 4/hp",
        "treasure": "3d12pp per individual"
    },
    {
      "name": "Mule",
      "category": "Animal",
      "frequency": "Common",
      "numberAppearing": "1",
      "size": "Large",
      "move": "120 ft",
      "armorClass": 7,
      "hitDice": 3,
      "TREASURE TYPE": "See treasure",
      "attacks": "1 or 2",
      "damage": "1d2 (bite) or 1d6/1d6 (kick)",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Semi-",
      "alignment": "Neutral",
      "levelXP": "2/20+2/hp",
      "treasure": "None",
      "description": "Mules are sterile crosses between horses and donkeys, sufficiently sure-footed to be taken into dungeons. Their stubbornness is legendary. These statistics can also be used for asses and donkeys, though these should have hit points rolled on d6s rather than d8s to reflect their smaller size."
    },
    {
      "name": "Merman",
      "frequency": "Uncommon",
      "number_appearing": "20d10",
      "size": "Man-sized",
      "movement": "10 ft; 180 ft swimming",
      "armor_class": 7,
      "hit_dice": "1+1",
      "TREASURE TYPE": "C, R",
      "attacks": "1",
      "damage": "By weapon",
      "special_attacks": "None",
      "special_defenses": "None",
      "magic_resistance": "Standard",
      "lair_probability": "25%",
      "intelligence": "Average",
      "alignment": "Neutral",
      "level_xp": "2/30 + 1/hp",
      "treasure": "1d12×1,000 cp (20%), 1d6×1,000 sp (30%), 1d4×1,000 ep (10%), 2d4×1,000 gp (40%), 1d6×1,000 pp (50%), 5d8 gems (55%), 1d12 jewellery (45%), 2 magic items (10%)"
  },
    {
      "name": "Mimic",
      "category": "Monster",
      "frequency": "Rare",
      "numberAppearing": "1",
      "size": "Large",
      "move": "30 ft",
      "armorClass": 7,
      "hitDice": "7-10",
      "TREASURE TYPE": "Nil",
      "attacks": 1,
      "damage": "3d4",
      "specialAttacks": "Glue (holds fast whatever member touched the mimic)",
      "specialDefenses": "Camouflage (perfectly mimics stone or wood)",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Semi- to Average",
      "alignment": "Neutral",
      "levelXP": "7/1,200+10/hp",
      "description": "Subterranean creatures that cannot stand sunlight. Perfectly mimic stone or wood, posing as stonework, doors, chests, or any other object. Two varieties: large (9-10 HD) semi-intelligent carnivorous 'killer mimic' that attacks anything nearby, and a slightly smaller intelligent sort that is generally friendly if offered food. The intelligent sort speaks its own language and usually several other tongues. Mimics excrude a glue that holds fast whatever touched it."
    },
    {
      "name": "Mezzodaemon",
      "category": "Extraplanar",
      "frequency": "Uncommon",
      "numberAppearing": "1 (rarely 1d3)",
      "size": "Medium (7' tall)",
      "move": "150 ft",
      "armorClass": -3,
      "hitDice": "10+40",
      "TREASURE TYPE": "Q (×5), X",
      "attacks": "2 fists or 1 weapon",
      "damage": "7d2/7d2 or by weapon +6",
      "specialAttacks": "Strength 18/00 (+6 damage); +3 to hit with weapon and shield; dimension door 2/day; magic jar 1/day; repulsion 1/day",
      "specialDefenses": "Immune to non-magical weapons (including iron and silver), paralysis, and poison; acid, cold, and fire cause half damage; graduated magic resistance (95% vs 1st level spells to 55% vs 9th, based on 11th level caster, ±5%/level); immune to charm and suggestion",
      "magicResistance": "Special (55-95%)",
      "lairProbability": "Nil",
      "intelligence": "High to Exceptional",
      "alignment": "Neutral evil",
      "levelXP": "10/6,000+16/hp",
      "description": "Inhabit the lower planes between the Abyssal Layers and the Hells (Tarterus, Hades, Gehenna). Freely associate with night hags and demons. Enjoy wreaking havoc on the Prime Material Plane. Often use magical weapons (battle axe, flail, or sword) with magic shield. At will: comprehend languages, detect invisibility, detect magic, ESP, invisibility, levitate, polymorph self, read magic. Also: passwall 4/day, become ethereal 1/day, wind walk 1/day, word of recall 1/day. Infravision and ultravision. Limited telepathy with low+ intelligence creatures. Each has a secret personal name."
    },
  {
      "name": "Minotaur",
      "frequency": "Rare",
      "movement": "120 ft",
      "armor_class": 6,
      "hit_dice": "6+3",
      "TREASURE TYPE": "C",
      "attacks": "2 or 1",
      "damage": "2d4/1d4, or by weapon",
      "special_attacks": "None",
      "special_defenses": "Surprised only on a 1",
      "magic_resistance": "Standard",
      "lair_probability": "20%",
      "intelligence": "Low",
      "alignment": "Chaotic evil",
      "level_xp": "5/225 + 6/hp",
      "treasure": "1d12×1,000 cp (20%), 1d6×1,000 sp (30%), 1d4×1,000 ep (10%), 1d6 gems (25%), 1d3 jewellery (20%), any 2 magic items (10%)"
  },
  {
      "name": "Mongrelman",
      "frequency": "Rare",
      "number_appearing": "10d10",
      "size": "Man-sized",
      "movement": "90 ft",
      "armor_class": 5,
      "hit_dice": "1 to 4 hit dice",
      "TREASURE TYPE": "C",
      "attacks": "1",
      "damage": "1d4 (1HD), 1d6 (2HD), 1d8 (3HD), 1d10 (4HD)",
      "special_attacks": "None",
      "special_defenses": "Camouflage",
      "magic_resistance": "Standard",
      "lair_probability": "40%",
      "intelligence": "Low to average",
      "alignment": "Lawful neutral",
      "level_xp": "(1 HD) 1/20+1/hp, (2 HD) 2/30+2/hp, (3 HD) 3/50+3/hp, (4 HD) 3/100+4/hp",
      "treasure": "2d6×1,000 cp (20%), 1d6×1,000 sp (35%), 1d4×1,000 ep (10%), 1d4 gems (25%), 1d3 jewellery (20%), any two magic items plus two potions (10%)"
  },
  {
      "name": "Mold, Brown",
      "category": "Hazard",
      "name_variants": "Brown Mold",
      "frequency": "Very rare",
      "numberAppearing": "1 patch",
      "size": "Small to Large",
      "move": "0 ft",
      "armorClass": 9,
      "hitDice": "N/A",
      "TREASURE TYPE": "Nil",
      "attacks": 0,
      "damage": "Special",
      "specialAttacks": "Drains heat: 1d8 frost damage per round per 10 degrees of body heat over 55°F within 5 ft; fire causes instant growth (torch 2×, flaming oil 4×, fireball 8× area)",
      "specialDefenses": "Affected only by magical cold; ice storm/wall of ice causes dormancy for 5d6 turns; cold wand or white dragon breath kills it; not fed by light spells or faerie fire",
      "magicResistance": "Special",
      "lairProbability": "Nil",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": "Special",
      "description": "Light tan to golden brown growth found underground. Feeds on radiant energy. Areas near it are below average temperature. Does not harm creatures that use cold (white dragons, ice toads, winter wolves). Cannot stand high concentrations of ultraviolet light."
  },
  {
      "name": "Mold, Yellow",
      "category": "Hazard",
      "name_variants": "Yellow Mold",
      "frequency": "Uncommon",
      "numberAppearing": "1 patch",
      "size": "Small to Large",
      "move": "0 ft",
      "armorClass": 9,
      "hitDice": "Special",
      "TREASURE TYPE": "Nil",
      "attacks": 1,
      "damage": "1d8",
      "specialAttacks": "50% chance per rough contact of releasing spore cloud (10 ft cube); save vs poison or die (lungs fill with mold growth); cure disease + resurrection within 24 hours to save victim",
      "specialDefenses": "Affected only by fire-based attacks (flaming oil, fire elemental, etc.); continual light causes dormancy for 2d6 turns but mold eventually grows over it",
      "magicResistance": "Special",
      "lairProbability": "Nil",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": "Special",
      "description": "Pale yellow to golden orange underground fungus. Attacks flesh on contact with enzymes, affects wood slowly, no harm to metals or stone. Colonies of 300+ square feet have 1-in-6 chance of forming collective intelligence with psionic sensing (10-60 ft) and id insinuation attack capability (1-10 attacks per rest cycle)."
  },
    {
      "name": "Mummy",
      "category": "Undead",
      "turnResistance": 8,
      "frequency": "Rare",
      "numberAppearing": "2d4",
      "size": "Man-sized",
      "move": "60 ft",
      "armorClass": 3,
      "hitDice": "6+3",
      "TREASURE TYPE": "D",
      "attacks": "1",
      "damage": "1d12",
      "specialAttacks": "Fear",
      "specialDefenses": "See below",
      "magicResistance": "See below",
      "lairProbability": "80%",
      "intelligence": "Low",
      "alignment": "Lawful evil",
      "levelXP": "6/985+8/hp",
      "treasure": {
        "cp": {"amount": "1d8×1,000", "chance": "10%"},
        "sp": {"amount": "1d12×1,000", "chance": "15%"},
        "ep": {"amount": "1d8×1,000", "chance": "15%"},
        "gp": {"amount": "1d6×1,000", "chance": "50%"},
        "gems": {"amount": "1d10", "chance": "30%"},
        "jewellery": {"amount": "1d6", "chance": "25%"},
        "magic_items": {"amount": "any 2 + 1 potion", "chance": "15%"}
      },
      "description": "Mummies exist on both the normal and negative material planes. Their touch causes a rotting disease that kills within 1d6 months and prevents magical healing. All creatures within 60 ft must save vs magic or be paralyzed with fear for 1d4 rounds. Mummies can only be harmed by fire, holy water, or magic weapons (which do half damage). Immunity to sleep, charm, cold, poison, and paralysis."
    },
    {
      "name": "Norker",
      "category": "Humanoid",
      "frequency": "Rare",
      "numberAppearing": "3d10",
      "size": "Small (4' tall)",
      "move": "90 ft",
      "armorClass": 3,
      "hitDice": "1+2",
      "TREASURE TYPE": "E",
      "attacks": 2,
      "damage": "1d3 bite / 1d6 club",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "20%",
      "intelligence": "Average",
      "alignment": "Chaotic evil",
      "levelXP": "1/20 + 2/hp",
      "description": "Relatives of hobgoblins, norkers possess 3-inch fangs and club their enemies in melee. Their hardened skin functions as natural armor (AC 3). They lack claw attacks and rely solely on weapon and bite. Norkers are tribal and often found in similar lairs as hobgoblins, though usually more savage and insular.",
      "leaders": {
        "per_20": { "level": 2, "class": "fighter", "count": 1 },
        "commander": {
          "under_100": { "level": 3, "class": "fighter", "count": 1, "hp": 16, "damage": "1d8+2", "armorClass": 3 },
          "chief": { "level": 4, "class": "fighter", "count": 1, "hp": 22, "damage": "2d6", "armorClass": 2 },
          "guards": { "level": 3, "class": "fighter", "count": "5d4", "hp": 16, "damage": "1d8+2", "armorClass": 3 }
        },
        "psionic_abilities": "None"
      },
      "lair": {
        "types": {
          "underground": "80%",
          "fortified_camp": "20%"
        },
        "features": {
          "carnivorous_apes": {
            "chance": "60%",
            "number": "2d6",
            "notes": "Used as guards, similar to hobgoblins"
          }
        },
        "occupants": {
          "females": "150% of males",
          "young": "300% of males"
        }
      },
      "equipment": {
        "weapons": {
          "club_and_bite": "100%"
        },
        "armor": {
          "natural_exoskeleton": "AC 3 (no worn armor)"
        }
      },
      "treasure": {
        "individual": "None",
        "lair": {
          "type": "E"
        }
      }
    },
    {
      "name": "Ogre",
      "category": "Giants",
      "name_variants": "",
      "frequency": "Common",
      "numberAppearing": "2d10",
      "size": "Large (9 ft +)",
      "move": "90 ft",
      "armorClass": 5,
      "hitDice": "4+1",
      "TREASURE TYPE": "Individuals: M (x10); Lair: Q, B, S",
      "attacks": 1,
      "damage": "1d10 or weapon",
      "specialAttacks": "Weapon damage bonus (+2)",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "20%",
      "intelligence": "Low",
      "alignment": "Chaotic evil",
      "levelXP": "3/95 + 5/hp",
      "description": "Ogres are malicious beings who live in all environments, whether above or below ground. Aside from the elusive unhealthy-purple coloured ogre, most ogres have skin that is dull yellow or dark brown. They have black-green or blue-black hair, and their skin is covered in dark wart-like bumps. They have purple eyes and white pupils, and their hard, thick nails and teeth are orange and sometimes black.",
      "specialAbilities": {
        "weaponDamage": "+2 to damage when using weapons",
        "languages": "Speak orc, troll, hill giant, and their own language"
      },
      "leaders": {
        "per_11": {"hitPoints": 33, "armorClass": 3, "damage": "2d6", "attacksAs": "7 HD monster", "damageBonus": "+3", "count": 1},
        "per_16": {"type": "chief", "attacksAs": "7 HD monster", "damage": "1d10+4", "armorClass": 4, "damageBonus": "+4", "count": 1}
      },
      "lair": {
        "females": {"number": "2d6", "damage": "2d4", "hitPoints": "4d6+1"},
        "young": {"number": "2d4", "capabilities": "As goblins"},
        "slaves": {"chance": "30%", "slavery_rate": "25%", "food_rate": "75%"}
      },
      "treasure": {
        "individual": {"gp": {"amount": "20d4", "chance": "100%"}},
        "lair": {
          "gp": {"amount": "1d3×1,000", "chance": "30%"},
          "gems": {"amount": "5d8", "chance": "40%"},
          "magic_items": {"amount": 2, "chance": "10%"},
          "potions": {"amount": "2d4", "chance": "40%"}
        }
      }
    },
    {
      "name": "Ogre Mage",
      "category": "Giants",
      "name_variants": "",
      "frequency": "Rare",
      "numberAppearing": "1d6",
      "size": "Large (9 ft +)",
      "move": "90 ft; 150 ft flying (AA:III)",
      "armorClass": 4,
      "hitDice": "5+2",
      "TREASURE TYPE": "G, R, S",
      "attacks": 1,
      "damage": "1d12 or by weapon",
      "specialAttacks": "Spell use",
      "specialDefenses": "Regeneration",
      "magicResistance": "Standard",
      "lairProbability": "25%",
      "intelligence": "Average to high",
      "alignment": "Chaotic evil",
      "levelXP": "5/750+6/hp",
      "description": "Ogre Magi are fearsome evil creatures, well versed in magic and of unnatural size and strength. Most have reddish coloured eyes, two or more yellow to white horns, thick tusks, sharp yellow to black nails and long dark hair. They speak common and ogrish, amongst other languages.",
      "specialAbilities": {
        "regeneration": "1 hp per combat round",
        "spells": {
          "atWill": ["Fly (12 turn duration)", "Invisibility", "Darkness 10 ft radius", "Polymorph self (limited to humanoid forms 4-12 ft)"],
          "daily": ["Charm person", "Sleep", "Gaseous form", "Cone of cold (as 12th level caster)"]
        }
      },
      "leaders": {
        "hitPoints": "30-42",
        "combatability": "Fight and save as 9 HD monster"
      },
      "treasure": {
        "gp": {"amount": "2d10×1,000", "chance": "50%"},
        "pp": {"amount": "1d10×1,000", "chance": "50%"},
        "gems": {"amount": "3d6", "chance": "25%"},
        "jewellery": {"amount": "1d6", "chance": "25%"},
        "potions": {"amount": "1d6", "chance": "100%"},
        "magic_items": {"amount": "1d6", "chance": "25%"}
      }
    },
    {
      "name": "Ogrillon",
      "category": "Giants",
      "name_variants": "",
      "frequency": "Rare",
      "numberAppearing": "1-4 (5-30 in lair)",
      "size": "M",
      "move": "12\"",
      "armorClass": 6,
      "hitDice": 2,
      "TREASURE TYPE": "Individuals: M; Lair: B, S",
      "attacks": 2,
      "damage": "2-7/2-7",
      "specialAttacks": "Nil",
      "specialDefenses": "Nil",
      "magicResistance": "Standard",
      "lairProbability": "20%",
      "intelligence": "Low",
      "alignment": "Chaotic evil",
      "levelXP": "11/28 + 2 per hit point",
      "description": "The ogrillon is a smaller species of the ogre, being an orc-ogre crossbreed and displays the same general behaviour as its larger cousin with one exception - it never wields a weapon and fights with its horny fists.",
      "specialAbilities": {
        "strength": "18(01)",
        "appearance": {
          "orc-like": {"chance": "90%", "note": "Cannot be distinguished from orcs"},
          "ogre-like": {"chance": "10%", "note": "Smaller than true ogres, distinguishable from orcs"}
        },
        "languages": ["Ogrish", "Alignment language"]
      },
      "associations": "Often associate with orcs for short periods",
      "combat": "Fights with horny fists, never wields weapons",
      "treasure": {
        "individual": "M",
        "lair": "C, S"
      }
    },
    {
      "name": "Ochre Jelly",
      "category": "Ooze",
      "frequency": "Uncommon",
      "numberAppearing": "1d3",
      "size": "Medium",
      "move": "30 ft",
      "armorClass": 8,
      "hitDice": 6,
      "TREASURE TYPE": "Nil",
      "attacks": 1,
      "damage": "3d4",
      "specialAttacks": "Dissolves flesh (3d4 per round of exposure)",
      "specialDefenses": "Lightning divides into smaller creatures each doing half damage; cold has normal effect",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": "6/475+6/hp",
      "description": "A form of giant amoeba that seeps through dungeons hunting flesh or cellulose, preferring the former. Amorphous form allows it to flow through small spaces and travel along walls or ceilings. Lightning bolts divide the creature into one or more smaller creatures each doing half normal damage."
    },
    {
      "name": "Otyugh",
      "category": "Aberration",
      "frequency": "Uncommon",
      "numberAppearing": "1 (2)",
      "size": "Medium to Large",
      "move": "60 ft",
      "armorClass": 3,
      "hitDice": "6-8",
      "TREASURE TYPE": "See below",
      "attacks": "2 tentacles/1 bite",
      "damage": "1d8/1d8/2d5",
      "specialAttacks": "Disease (typhus, 90% chance on bite)",
      "specialDefenses": "Never surprised (sensory stalk)",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Low to Average",
      "alignment": "Neutral",
      "levelXP": "6/500+8/hp",
      "description": "Omnivorous scavengers found underground, dwelling in piles of dung and rubbish. Usually (90%) a single individual is encountered, as they typically live in partnership with other subterranean monsters, dwelling in truce to scavenge droppings and leavings. Has a sensory organ stalk (prevents surprise) and two tentacle arms with sharp ridges. Sucker-like mouth filled with teeth. No interest in treasure, but partners may require guarding treasure as condition of symbiosis. Speaks own language and is semi-telepathic."
    },
    {
      "name": "Neo-Otyugh",
      "category": "Aberration",
      "name_variants": "Neo-otyugh",
      "frequency": "Rare",
      "numberAppearing": "1",
      "size": "Large (8 ft+ diameter)",
      "move": "60 ft",
      "armorClass": 0,
      "hitDice": "9-12",
      "TREASURE TYPE": "See below",
      "attacks": "2 tentacles/1 bite",
      "damage": "2d6/2d6/1d3",
      "specialAttacks": "Disease",
      "specialDefenses": "Never surprised",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Average to Very",
      "alignment": "Neutral",
      "levelXP": "10/5,000+16/hp",
      "description": "A larger, more intelligent species of otyugh. Conforms to general characteristics of otyugh but even more aggressive in hunting prey. Slightly better at telepathic communication. Some specimens reach 8 ft diameter and 3 ft+ height. Tougher hide than otyugh."
    },
    {
      "name": "Orc",
      "category": "Humanoid",
      "frequency": "Common",
      "numberAppearing": "30d10",
      "size": "Man-sized (6 ft tall)",
      "move": "90 ft",
      "armorClass": 6,
      "hitDice": 1,
      "TREASURE TYPE": "Individuals: L; Lair: C, O, Q (x10), S",
      "attacks": 1,
      "damage": "1d8 or by weapon",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "35%",
      "intelligence": "Average (low)",
      "alignment": "Lawful evil",
      "levelXP": "1/10+1 per hp",
      "description": "Tribal and cruel. Hate elves. Use lairs and crude fortifications. Skilled miners. Sunlight penalty (-1 to hit). Infravision 60 ft.",
      "leaders": {
        "per_30": {"count": 1, "note": "Leader, fights as double-strength orc (2 HD, AC 4, 11 hp, 1d6+1)"},
        "over_150": {
          "captain": {"count": 1, "hd": 2, "hp": 11, "ac": 4, "damage": "1d6+1"},
          "guards": {"count": "3d6", "hd": 2, "hp": 11, "ac": 4, "damage": "1d6+1"}
        },
        "lair": {
          "chief": {"count": 1, "hd": 3, "hp": 15, "ac": 4, "damage": "2d4"},
          "guards": {"count": "5d6", "hd": 2, "hp": 11, "ac": 4, "damage": "1d6+1"},
          "females": "50% of males",
          "young": "100% of males",
          "ogres": "10% chance of 1d6 ogres in lair",
          "trolls": "5% chance of 1d4 trolls in lair"
        }
      },
      "equipment": {
        "weapons_distribution": {
          "sword_spear": "5%",
          "sword_pole_arm": "5%",
          "sword_short_bow": "5%",
          "spear": "10%",
          "pole_arm": "10%",
          "short_bow_spear": "10%",
          "light_crossbow": "10%",
          "axe": "20%",
          "sword": "15%",
          "morning_star_spear": "10%"
        }
      },
      "treasure": {
        "individual": "2d6 ep",
        "lair": {
          "cp": {"amount": "1d12×1,000", "chance": "50%"},
          "sp": {"amount": "1d6×1,000", "chance": "40%"},
          "gems": {"amount": "1d6", "chance": "25%"},
          "jewellery": {"amount": "1d3", "chance": "20%"},
          "potions": {"amount": "2d4", "chance": "40%"}
        }
      }
    },
    {
      "name": "Poltergeist",
      "category": "Undead",
      "turnResistance": "1 or 3",
      "frequency": "Rare",
      "numberAppearing": "1d8",
      "size": "Man-sized",
      "move": "60 ft",
      "armorClass": 10,
      "hitDice": "1d4 hit points",
      "TREASURE TYPE": "Nil",
      "attacks": "Nil",
      "damage": "Nil",
      "specialAttacks": "Fear, telekinesis",
      "specialDefenses": "Invisible, silver/magic weapons to hit",
      "magicResistance": "Standard",
      "lairProbability": "97%",
      "intelligence": "Low",
      "alignment": "Lawful evil",
      "levelXP": "2/35 + 1/hp",
      "treasure": "None",
      "description": "Poltergeists are invisible spirits of humans who died tragically. When wandering, they're treated as type 1 undead for turning; in their haunting area, they're treated as type 3. They can only be struck by magic or silver weapons at -4 penalty due to invisibility. They attack by telekinetically hurling objects (as 5 HD monster), causing victims to save vs spells or flee for 2d12 rounds with 50% chance of dropping held items."
    },
    {
      "name": "Portuguese Man O' War, Giant",
      "category": "Aquatic",
      "frequency": "Uncommon",
      "numberAppearing": "1d10",
      "size": "Variable",
      "move": "10 ft swimming",
      "armorClass": 9,
      "hitDice": "1 to 4",
      "TREASURE TYPE": "Nil",
      "attacks": 1,
      "damage": "1d10",
      "specialAttacks": "Paralysation",
      "specialDefenses": "Transparent",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": "1 HD 2/45+1/hp; 2 HD 3/80+2/hp; 3 HD 4/110+3/hp; 4 HD 4/150+4/hp",
      "treasure": "None",
      "description": "These creatures float in warm salt water with poisonous tentacles trailing below. Their venom causes damage and paralysis (save negates paralysis), and paralyzed victims are consumed in 3d4 turns. The flotation sac is translucent and 90% likely to be unseen without detect invisibility. Size varies with HD: body diameter is 2½ ft per HD, with 10 tentacles per HD, each 10 ft long per HD. Damaging tentacles doesn't harm the creature but requires 1d3 days for regrowth."
    },
    {
      "name": "Purple Worm",
      "category": "Monster",
      "frequency": "Rare",
      "numberAppearing": "1d2",
      "size": "Large (50' long, 8-9' diameter)",
      "move": "90 ft; 10 ft burrow",
      "armorClass": 6,
      "hitDice": 15,
      "TREASURE TYPE": "B, Q (×5), X",
      "attacks": "1 bite/1 sting",
      "damage": "2d12/2d4 + poison",
      "specialAttacks": "Swallow whole (hit 20% over required or natural 20; victim dead in 6 rounds, digested in 12 turns — no raise dead after); poison tail sting (save vs poison or die); tail sting used in rear defense or vs large/numerous opponents in spacious areas",
      "specialDefenses": "Nil",
      "magicResistance": "Standard",
      "lairProbability": "30%",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": "15/10,200+20/hp",
      "description": "Burrow deep beneath ground in constant search for food. Sense vibrations at 60 ft. Can swallow creatures up to 8 ft tall and 6 ft wide. Swallowed creature can try to cut out (inner AC 9, but cumulative -1 damage per round inside). Return to lairs to rest, expelling indigestible waste (metals, mineral crystals). Mottled worm is an aquatic variety inhabiting shallow bottom muck."
    },
    {
      "name": "Qullan",
      "category": "Humanoids",
      "name_variants": "",
      "frequency": "Rare",
      "numberAppearing": "1d6",
      "size": "L (8'+ tall)",
      "move": "12\"",
      "armorClass": 10,
      "hitDice": 2,
      "TREASURE TYPE": "See treasure",
      "attacks": 1,
      "damage": "2d4+3",
      "specialAttacks": "Confusion aura",
      "specialDefenses": "Confusion feedback",
      "magicResistance": "Standard",
      "lairProbability": "10%",
      "intelligence": "Low",
      "alignment": "Chaotic evil",
      "levelXP": "2/73 + 2 per hit point",
      "description": "Qullans are strong, large, seemingly insane humanoids which wear warpaint in a wild variety of clashing colours and sport their battle-scars proudly, often emphasising them with cosmetic paint. They never wear armour, either wandering naked or clad in tiger-skins.",
      "specialAbilities": {
        "confusion": {
          "aura": "Continually radiates confusion in a 5' radius",
          "effect": "Victims must save each round or be confused (equal probability of standing still, attacking nearest qullan without regard for safety, or attacking nearest friend)",
          "recovery": "New save allowed each round, effect disappears if victim moves outside radius"
        },
        "confusionFeedback": {
          "trigger": "Any attempt to force a qullan to do something it would not normally do",
          "result": "Instant death of the qullan",
          "spellEffect": "Same reaction when fails to save against any charm or control spell"
        }
      },
      "weapons": {
        "broadsword": {
          "special": "Honed to incredible sharpness using technique not emulated by man",
          "bonus": "+3 hit probability, +3 damage (5-11 total)",
          "usage": "Wielded two-handed (no additional advantage)",
          "blunting": "20% cumulative chance per hit of becoming normal broadsword",
          "transferability": "Non-magical, can be used by humans but will blunt normally"
        }
      },
      "behavior": "Extremely hostile, attacks all human or near-human races regardless of alignment or party size",
      "treasure": "Most types in lair but in small quantity (10% of A at most)"
    },
    {
      "name": "Quasit",
      "category": "Demons",
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Small",
      "move": "150 ft",
      "armorClass": 2,
      "hitDice": 3,
      "TREASURE TYPE": "Q (×3)",
      "attacks": "2 claws/1 bite",
      "damage": "1d2/1d2/1d4",
      "specialAttacks": "Claw wounds cause burning itch draining 1 Dexterity per wound (save vs poison negates, loss lasts 2d6 rounds); detect good; detect magic; fear blast (30 ft radius, 1/day); invisibility at will",
      "specialDefenses": "Regenerate 1 hp/round; hit only by magical or cold iron weapons; immune to cold, fire, and lightning; saves as 7 HD creature",
      "magicResistance": "25%",
      "lairProbability": "0%",
      "intelligence": "Low",
      "alignment": "Chaotic evil",
      "levelXP": "3/175+3/hp",
      "description": "A larva changed into minor demon form to serve as familiar to a chaotic evil magic-user or cleric. Can polymorph into two of: giant centipede, bat, frog, or wolf. Sly and cunning despite low intelligence, able to call upon thinking power of a demon lord. As familiar: telepathic link (all senses including infravision up to 1 mile), within 10 ft grants 25% MR and 1 hp/round regeneration to master, within 1 mile grants +1 level, beyond 1 mile -1 level, if killed master loses 4 levels. Can contact lower plane once per week (6 questions as commune)."
    },
    {
      "name": "Rat",
      "category": "Animal",
      "variants": [
        {
          "type": "Huge",
          "frequency": "Common",
          "numberAppearing": "4d20",
          "size": "Small",
          "move": "120 ft",
          "armorClass": 8,
          "hitDice": "1 hp",
          "attacks": 1,
          "damage": 1,
          "specialAttacks": "Disease",
          "specialDefenses": "None",
          "levelXP": "1/5 + 1/hp"
        },
        {
          "type": "Giant",
          "frequency": "Common",
          "numberAppearing": "5d10",
          "size": "Small",
          "move": "120 ft",
          "armorClass": 7,
          "hitDice": "1d4 hp",
          "attacks": 1,
          "damage": "1d3",
          "specialAttacks": "Disease",
          "specialDefenses": "None",
          "levelXP": "1/7 + 1/hp"
        }
      ],
      "magicResistance": "Standard",
      "lairProbability": "10%",
      "intelligence": "Semi-",
      "alignment": "Neutral",
      "TREASURE TYPE": "Nil",
      "treasure": "None",
      "description": "Huge and giant rats are vicious omnivores commonly found in ruins and upper dungeon levels. Each successful bite has a 5% chance of causing disease (as the cleric spell) unless the victim passes a saving throw vs poison."
    },
    {
      "name": "Remorhaz",
      "category": "Monster",
      "frequency": "Rare",
      "numberAppearing": "1",
      "size": "Large (21+ ft long)",
      "move": "Not specified",
      "armorClass": "Not specified",
      "hitDice": "7-14",
      "TREASURE TYPE": "F",
      "attacks": "Not specified",
      "damage": "6d6",
      "specialAttacks": "See below",
      "specialDefenses": "See below",
      "magicResistance": "75%",
      "lairProbability": "20%",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "levelXP": {
        "7HD": "6/625+8/hp",
        "8HD": "6/950+10/hp",
        "9HD": "7/1,400+12/hp",
        "10HD": "7/1,700+13/hp",
        "11HD": "7/2,100+14/hp",
        "12HD": "8/3,000+16/hp",
        "13HD": "8/3,500+17/hp",
        "14HD": "8/4,200+18/hp"
      },
      "description": "These great polar worms are found only in arctic areas. The remorhaz attacks on sight, and if encountered in its lair there is a 1 in 4 chance it has a mate and 1d3 eggs; the eggs can be sold on some markets for 5,000 gp each. The HD of the remorhaz determines its length: starting at 21 ft, each hit die above 7 adds 3 ft, so that a 14 HD specimen will be roughly 42 ft long. The remorhaz is ice-blue in colour, with white protrusions along its back and white insect-like eyes. When attacking, the remorhaz rises on the back section of its body and begins beating its bat-like wings. Its attack is blinding, and the larger-sized remorhaz can swallow its prey whole. All remorhaz generate an intense internal heat that instantly destroys any swallowed opponent. An opponent is swallowed and destroyed if the remorhaz' attack score is a 20. When aroused for combat, the internal heat of the remorhaz seeps up into the protrusions on the back of the creature. Non-magical weapons that strike the back will melt, and any physical touch deals 10d10 hp damage.",
      "treasure": "None"
    },
    {
      "name": "Rhinoceros",
      "category": "Animal",
      "variants": [
        {
          "type": "Common",
          "frequency": "Common",
          "numberAppearing": "1d6",
          "size": "Large",
          "move": "120 ft",
          "armorClass": 6,
          "hitDice": "8 or 9",
          "TREASURE TYPE": "Nil",
          "attacks": 1,
          "damage": "2d4 or 2d6",
          "specialAttacks": "Charge",
          "specialDefenses": "None",
          "levelXP": "7/550 + 10/hp"
        },
        {
          "type": "Woolly",
          "frequency": "Common",
          "numberAppearing": "1d4",
          "size": "Large",
          "move": "120 ft",
          "armorClass": 5,
          "hitDice": 10,
          "attacks": 1,
          "damage": "2d6",
          "specialAttacks": "Charge",
          "specialDefenses": "None",
          "levelXP": "7/900 + 12/hp"
        }
      ],
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "TREASURE TYPE": "Nil",
      "treasure": "None",
      "description": "Rhinoceroses are aggressive herbivores that charge any detected creature. Despite poor eyesight, they have excellent smell and hearing. Single-horned varieties (8 HD, 2d4 damage) and double-horned varieties (9 HD, 2d6 damage) charge for double damage and trample prone opponents for 2d4 damage per foreleg. Woolly rhinoceroses are larger Arctic variants found in 'lost world' settings."
    },
    {
      "name": "Roc",
      "category": "Monster",
      "frequency": "Rare",
      "numberAppearing": "1d2",
      "size": "Large (60 ft + wingspan)",
      "move": "30 ft; 300 ft flying (AA:II)",
      "armorClass": 4,
      "hitDice": 18,
      "TREASURE TYPE": "C",
      "attacks": "1 or 2",
      "damage": "4d6 or 3d6/3d6",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "10%",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "levelXP": "8/3,010 + 25/hp",
      "description": "Rocs are powerful creatures living at high elevations in warm environments, and look somewhat like huge eagles. They will sometimes be found with giants, who keep them as pets. The immense size of a roc is accompanied by its equally immense appetites, as rocs will frequently consume large mammals including horses and cattle. A roc hunts much like an eagle, swooping down on its meal and capturing it in its immense claws, carrying it back to its nest. A roc will silence struggling prey by impaling it with its powerful beak for 4d6 hit points of damage. Any treasure found in the gigantic nests of rocs is there purely on accident, since rocs have no concept of wealth. The belongings of past victims will be found woven into the intricate nest.",
      "treasure": {
        "cp": { "amount": "1d12×1,000", "chance": "20%" },
        "sp": { "amount": "1d6×1,000", "chance": "30%" },
        "ep": { "amount": "1d4×1,000", "chance": "10%" },
        "gems": { "amount": "1d6", "chance": "25%" },
        "jewellery": { "amount": "1d33", "chance": "20%" },
        "magic_items": { "amount": 2, "chance": "10%" }
      }
    },
    {
      "name": "Roper",
      "category": "Monster",
      "frequency": "Rare",
      "numberAppearing": "1d4",
      "size": "Large",
      "move": "30 ft",
      "armorClass": 0,
      "hitDice": "11",
      "TREASURE TYPE": "See treasure",
      "attacks": 1,
      "damage": "2d10+2",
      "specialAttacks": "See below",
      "specialDefenses": "See below",
      "magicResistance": "80%",
      "lairProbability": "93%",
      "intelligence": "Exceptional",
      "alignment": "Chaotic evil",
      "levelXP": "9/2,700+16/hp",
      "description": "Ropers are cavern-dwelling monsters and are frequently mistaken for stalagmites. These monsters are grey-green in colour, standing around 8 ft-12 ft tall, with a hide that mimics the smooth limestone formations of a natural cavern. Ropers are about 3 ft-4 ft at the base and approximately 1 ft wide at the apex. These monsters are almost always encountered in their stalagmite shape but can alter their appearance to some degree. A roper can assume the shape of a pillar, a boulder, or flatten themselves and lie flat to appear as no more than an irregularity on the walking surface of the cavern floor. It can also cling to a cavern ceiling (or wall) and appear as a stalactite. Through means of tiny adhesive cilia on its underside, the roper can move slowly and these cilia are what allow it to cling upside down to the ceiling. Ropers are predators and attack by means of the 6 rope-like appendages that give these monsters their name. The ropes secrete a powerful and poisonous adhesive and can lash out some distance from the creature; up to 50 ft. A successful to hit roll will weaken the target, decreasing its strength ability score by 50% (rounded down) within 1d3 rounds and lasting 2d4 turns; with multiple hits having a cumulative strength drain effect. An ensnared victim can break the strand by performing a Minor Test of Strength but for every round the victim is roped he or she will be dragged 10 ft closer to the roper. Creatures within 10 ft of the roper are subject to its vicious bite attack, this attack automatically hits any victim held by the strands of the roper. A strand can be sliced with an edged weapon but the attack must do a minimum of 6 points of damage in a single attack to the AC 0 tentacle to sever it. The strand of a roper can easily pull 800 lbs and can lift about a third of that amount. A roper is a tough monster. The stony hide grants it AC 0 in combat and it has an innate resistance to magic. Besides its base 80% magic resistance, the roper is completely immune to electricity based damage including lightning, ropers are also resistant to cold based magic and take only half damage from any such attacks. These creatures have few weaknesses but are susceptible to fire, saving vs fire based attacks at -4. Any fire based magic attacks, however, must still overcome the monster's magic resistance.",
      "variants": {
        "Quartz Roper": {
          "frequency": "Rare",
          "numberAppearing": "1",
          "size": "Medium (5 ft)",
          "move": "10 ft",
          "armorClass": 0,
          "hitDice": 6,
          "attacks": 1,
          "damage": "1d10",
          "specialAttacks": "See below",
          "specialDefenses": "See below",
          "magicResistance": "Standard",
          "lairProbability": "93%",
          "intelligence": "High",
          "alignment": "Chaotic evil",
          "levelXP": "5/525+6/hp",
          "description": "To adventurers familiar with ropers, a quartz roper appears as a 5 ft tall and 2 ft wide (at the base) statue of a roper hewn from some brownish or smoky grey crystalline mineral. The quartz roper is actually a monster with a rocky hide composed of living quartz. Quartz ropers are very sensitive to motion and are able to sense movement up to 225 ft away. In combat, quartz ropers fight in a manner similar to ropers: its tentacles can hit targets up to 50 ft away, the poisonous adhesive of the tentacles inflicts a 50% strength penalty on its targets, and it drags roped victims toward itself to deliver its nasty bite automatically. A quartz roper also differs from its larger cousins in a number of ways. First, it tends to concentrate its first attacks on two victims, striking each with 3 tentacles. The first two successfully roped victims will be injected with a venom which allows no saving throw and causes the victim to freeze in place, looking as if he or she has been turned to stone. One round after this apparent stoning the victim recovers and but is now under the delusion the quartz roper is a close friend and valued ally. These influenced adventurers will fight to protect the monster to the utmost of their abilities for the duration of effect of the venom; 10 turns. If the quartz roper is killed before the venom expires the deluded defenders will cease attacking and wander about aimlessly until the venom expires. The quartz roper can only inject its venom twice per day and afterward its combat tactics conform to those of a roper. A quartz roper's tentacles are strong, but not so strong as the larger variety of roper. A roped character's chances of breaking free are equal to double his or her chance to perform a Minor Test of Strength. Quartz ropers also lack a roper's magic resistance but its mineral-laden hide will resist normal missile fire, though magic missiles and hand held weapons damage it normally. All magic spells do normal damage as well. A quartz roper's gizzard has the same percentage chance of containing platinum pieces and gemstones as the standard variety of roper."
        }
      },
      "treasure": "Ropers do not hoard treasure but their acidic bile cannot dissolve platinum or gemstones. Cutting open the gizzard of a roper has a 40% chance of yielding 3d6 (3-18) platinum pieces and 30% chance of 4d6 (4-24) gems."
    },
    {
      "name": "Rot Grub",
      "category": "Monster",
      "frequency": "Rare",
      "numberAppearing": "5d4",
      "size": "Small",
      "move": "10 ft",
      "armorClass": 9,
      "hitDice": "1 hit point",
      "attacks": 0,
      "damage": "None",
      "specialAttacks": "See below",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": "1/5 + 1/hp",
      "description": "Although rot grubs can be found in animal waste and other foul refuse, they prefer to consume tissue that is still alive. Upon contact with a living being, rot grubs will begin to vigorously burrow deep into the body. Fire must be applied to the site of contact at once in order to prevent the rot grubs from burrowing further. This application of flame inflicts 1d6 hit points of damage per instance. If not stopped immediately, within 1 to 3 turns the rot grubs will find the heart and kill their victim.",
      "treasure": "None"
    },
    {
      "name": "Rust Monster",
      "category": "Monster",
      "frequency": "Uncommon",
      "numberAppearing": "1d2",
      "size": "Medium (5 ft long)",
      "move": "180 ft",
      "armorClass": 2,
      "hitDice": 5,
      "TREASURE TYPE": "Q (x10)",
      "attacks": 2,
      "damage": "Nil",
      "specialAttacks": "See below",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "10%",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "levelXP": "3/185 + 4 per hp",
      "description": "Rust monsters are creatures vaguely resembling a 5 ft long and 3 ft tall giant bug-like armadillo that weighs about 200 lbs. Rust monsters have rust-red colouration on their dorsal hides, yellowish tan on their ventral hides, and two prehensile antennae on their heads. Rust monsters are only found in underground type environments, which they prowl constantly in search of food. Rust monsters consume metal of any kind, especially ferrous metals and ferrous metal alloys. The antennae of a rust monster can \"smell\" metal 90 ft away, and the creature will dart toward such a source of food with blinding speed, rolling 2 attacks with its antennae at the largest piece of metal it can sense. A successful attack causes up to 10 cubic ft of metal instantly to crumble into easily-digestible rust and the creature will immediately cease attacking in such a case and begin devouring its newly-created meal. Metal with magical bonuses gains a 10% chance per plus of not being affected by the rust monsters attack. For instance a +3 shield would have a 30% of resisting the rusting effect. A successful \"to hit\" roll against a rust monster with a metal weapon automatically subjects that weapon to a rust attack. Rust monsters are motivated by animal intelligence and blind hunger, therefore can be easily distracted from pursuit by dropping metal objects and fleeing; some iron spikes or a heavy mace will cause the attacking rust monster to stop for 1 round to devour the treat. Otherwise, rust monsters will relentlessly pursue the PCs until slain or all metal items have been consumed.",
      "treasure": "1d4 gems per individual (50%)"
    },
    {
      "name": "Sahuagin",
      "category": "Monster",
      "variants": [
        {
          "name": "Warrior",
          "frequency": "Uncommon",
          "numberAppearing": "20d4",
          "size": "Man-sized",
          "move": "120 ft; 240 ft swimming",
          "armorClass": 5,
          "hitDice": "2+2",
          "TREASURE TYPE": "Individuals: N; Lair: I, O, P, Q (x10), X, Y",
          "attacks": 1,
          "damage": "By weapon",
          "specialAttacks": "See below",
          "specialDefenses": "See below",
          "magicResistance": "Standard",
          "lairProbability": "25%",
          "intelligence": "High",
          "alignment": "Lawful evil",
          "levelXP": "2/30+3/hp"
        },
        {
          "name": "Female",
          "frequency": "Uncommon",
          "numberAppearing": "30d4",
          "size": "Man-sized",
          "move": "120 ft; 240 ft swimming",
          "armorClass": 6,
          "hitDice": 2,
          "attacks": 1,
          "damage": "By weapon",
          "specialAttacks": "See below",
          "specialDefenses": "See below",
          "magicResistance": "Standard",
          "lairProbability": "100%",
          "intelligence": "High",
          "alignment": "Lawful evil",
          "levelXP": "2/20+2/hp"
        },
        {
          "name": "Hatchling",
          "frequency": "Uncommon",
          "numberAppearing": "10d4",
          "size": "Small",
          "move": "120 ft; 240 ft swimming",
          "armorClass": 7,
          "hitDice": 1,
          "attacks": 1,
          "damage": "1d4",
          "specialAttacks": "See below",
          "specialDefenses": "See below",
          "magicResistance": "Standard",
          "lairProbability": "100%",
          "intelligence": "High",
          "alignment": "Lawful evil",
          "levelXP": "1/10+1/hp"
        },
        {
          "name": "Guard",
          "frequency": "Uncommon",
          "numberAppearing": "3d6",
          "size": "Man-sized",
          "move": "120 ft; 240 ft swimming",
          "armorClass": 5,
          "hitDice": "3+3",
          "attacks": 1,
          "damage": "By weapon",
          "specialAttacks": "See below",
          "specialDefenses": "See below",
          "magicResistance": "Standard",
          "lairProbability": "25%",
          "intelligence": "High",
          "alignment": "Lawful evil",
          "levelXP": "3/50+4/hp"
        },
        {
          "name": "Warchief",
          "frequency": "Rare",
          "numberAppearing": "1",
          "size": "Man-sized",
          "move": "120 ft; 240 ft swimming",
          "armorClass": 4,
          "hitDice": "4+4",
          "attacks": 1,
          "damage": "By weapon",
          "specialAttacks": "See below",
          "specialDefenses": "See below",
          "magicResistance": "Standard",
          "lairProbability": "25%",
          "intelligence": "High",
          "alignment": "Lawful evil",
          "levelXP": "4/100+5/hp"
        },
        {
          "name": "Priestess",
          "frequency": "Very rare",
          "numberAppearing": "1d4+1",
          "size": "Man-sized",
          "move": "120 ft; 240 ft swimming",
          "armorClass": 5,
          "hitDice": "2 to 6",
          "attacks": 1,
          "damage": "By weapon",
          "specialAttacks": "See below",
          "specialDefenses": "See below",
          "magicResistance": "Standard",
          "lairProbability": "100%",
          "intelligence": "Exceptional",
          "alignment": "Lawful evil",
          "levelXP": "Variable"
        },
        {
          "name": "Baron",
          "frequency": "Very rare",
          "numberAppearing": "1",
          "size": "Man-sized",
          "move": "120 ft; 240 ft swimming",
          "armorClass": 3,
          "hitDice": "6+6",
          "attacks": 1,
          "damage": "By weapon",
          "specialAttacks": "See below",
          "specialDefenses": "See below",
          "magicResistance": "Standard",
          "lairProbability": "100%",
          "intelligence": "High",
          "alignment": "Lawful evil",
          "levelXP": "4/300+8/hp"
        },
        {
          "name": "Prince",
          "frequency": "Very rare",
          "numberAppearing": "1",
          "size": "Man-sized",
          "move": "120 ft; 240 ft swimming",
          "armorClass": 2,
          "hitDice": "8+8",
          "attacks": 2,
          "damage": "By weapon",
          "specialAttacks": "See below",
          "specialDefenses": "See below",
          "magicResistance": "Standard",
          "lairProbability": "100%",
          "intelligence": "High",
          "alignment": "Lawful evil",
          "levelXP": "5/500+12/hp"
        },
        {
          "name": "King",
          "frequency": "Very rare",
          "numberAppearing": "1",
          "size": "Man-sized",
          "move": "120 ft; 240 ft swimming",
          "armorClass": 1,
          "hitDice": "10+10",
          "attacks": 4,
          "damage": "By weapon",
          "specialAttacks": "See below",
          "specialDefenses": "See below",
          "magicResistance": "Standard",
          "lairProbability": "100%",
          "intelligence": "Exceptional",
          "alignment": "Lawful evil",
          "levelXP": "6/1,250+14/hp"
        }
      ],
      "description": "Sahuagin are humanoid ichthyans of evil alignment. They dwell in shallow, warmer salt waters and raid villages and communities on land for loot and sport. They are nocturnal. Each sahuagin realm has a King and is divided into nine provinces, each ruled by a Prince. Each Prince will have a number of Barons under his command, and each Baron controls a war-band. The \"Number Encountered\" listing for this creature is for the lair of a typical war-band; the lairs of a Prince will be much larger. If encountered outside their lair, there will be no females or hatchlings, no priestesses or above, and the band will be led by a warchief. Sahuagin are typically armed as follows: Dagger and spear 25% of the band, Dagger, trident and net 50% of the band, Dagger and heavy crossbow 25% of the band. All these weapons are fully usable both above and below the water, which makes them quite highly prized. The sahuagin clergy will always be led by a priestess with 6 HD and the spellcasting powers of an 8th level cleric. The remaining priestesses will be trainees of 2nd to 7th level (1d6+1). Their HD are equal to their spellcasting level -2 (minimum 2). Sahuagin priestesses will typically be attended by zombie or skeleton servants, as they are fond of the animate dead spell. Sahuagin have been known to tame sharks and keep them as pets.",
      "treasure": {
        "individual": "1d6 pp each",
        "lair": {
          "gp": { "amount": "2d6×1,000", "chance": "75%" },
          "pp": { "amount": "3d6×100", "chance": "50%" },
          "gems": { "amount": "3d8", "chance": "50%" },
          "jewellery": { "amount": "2d6", "chance": "50%" },
          "magic_items": { "amount": "1 miscellaneous magic and 1 potion", "chance": "50%" }
        }
      }
    },
    {
      "name": "Salamander",
      "category": "Elemental",
      "frequency": "Rare",
      "numberAppearing": "2d3",
      "size": "Medium",
      "move": "90 ft",
      "armorClass": "5/3",
      "hitDice": "7+7",
      "TREASURE TYPE": "F",
      "attacks": "1 weapon/1 tail constrict",
      "damage": "By weapon +1d6 heat / 2d6 +1d6 heat",
      "specialAttacks": "Heat (all attacks +1d6 fire damage); metal spear does 1d6 +1d6 heat; tail constriction 2d6 +1d6 heat",
      "specialDefenses": "+1 or better weapon to hit; immune to all fire-based attacks; immune to sleep, charm, and hold",
      "magicResistance": "Standard",
      "lairProbability": "75%",
      "intelligence": "High",
      "alignment": "Chaotic evil",
      "levelXP": "8/2,200+12/hp",
      "description": "Creatures of the elemental plane of fire. Hate cold, preferring temperatures of 300°F+, able to abide lower temperatures only for a few hours. Lair is typically 500°F+. Upper body (AC 5) is copper-colored with yellow glowing eyes. Lower body (AC 3) is snake-like, orange shading to dull red at tail. Cold-based attacks cause +1 damage per die. Fire-resistant creatures take normal damage but not heat damage."
    },
    {
      "name": "Scorpion",
      "category": "Monster",
      "variants": [
        {
          "name": "Large",
          "frequency": "Common",
          "numberAppearing": "1d6",
          "size": "Small",
          "move": "90 ft",
          "armorClass": 5,
          "hitDice": "2+2",
          "TREASURE TYPE": "D",
          "attacks": 3,
          "damage": "1d4/1d4/1d2",
          "specialAttacks": "Poison sting",
          "specialDefenses": "None",
          "magicResistance": "Standard",
          "lairProbability": "25%",
          "intelligence": "Non-",
          "alignment": "Neutral",
          "levelXP": "3/75+3/hp"
        },
        {
          "name": "Huge",
          "frequency": "Uncommon",
          "numberAppearing": "1d4",
          "size": "Small",
          "move": "120 ft",
          "armorClass": 4,
          "hitDice": "4+4",
          "TREASURE TYPE": "D",
          "attacks": 3,
          "damage": "1d8/1d8/1d3",
          "specialAttacks": "Poison sting",
          "specialDefenses": "None",
          "magicResistance": "Standard",
          "lairProbability": "25%",
          "intelligence": "Non-",
          "alignment": "Neutral",
          "levelXP": "4/125+5/hp"
        },
        {
          "name": "Giant",
          "frequency": "Uncommon",
          "numberAppearing": "1d3",
          "size": "Medium",
          "move": "150 ft",
          "armorClass": 3,
          "hitDice": "5+5",
          "TREASURE TYPE": "D",
          "attacks": 3,
          "damage": "1d10/1d10/1d4",
          "specialAttacks": "Poison sting",
          "specialDefenses": "None",
          "magicResistance": "Standard",
          "lairProbability": "50%",
          "intelligence": "Non-",
          "alignment": "Neutral",
          "levelXP": "5/600 + 6/hp"
        }
      ],
      "description": "Large, huge and giant scorpions are vicious, fearless predators found almost anywhere. Their usual tactic is to attack anything smaller than themselves. The scorpion will try and grab its prey with its huge claws then sting it to death with its tail. While its tail only does 1d4 points of damage the victim must save vs poison or die. The scorpion can use its attacks independently of each other on 3 different targets. Anything that the scorpion kills is taken back to its lair and consumed. It should be noted that the scorpion is not immune to its own poison; if it stings itself it could die.",
      "treasure": {
        "lair": {
          "cp": { "amount": "1d8×1,000", "chance": "10%" },
          "sp": { "amount": "1d12×1,000", "chance": "15%" },
          "ep": { "amount": "1d8×1,000", "chance": "15%" },
          "gp": { "amount": "1d6×1,000", "chance": "30%" },
          "gems": { "amount": "1d10", "chance": "10%" },
          "jewellery": { "amount": "1d6", "chance": "5%" },
          "magic_items": { "amount": "2 misc. magic + 1 potion", "chance": "5%" }
        }
      }
    },
    {
      "name": "Sea Hag",
      "category": "Monster",
      "frequency": "Rare",
      "numberAppearing": "1d3",
      "size": "Medium",
      "move": "90 ft; 150 ft swimming",
      "armorClass": 7,
      "hitDice": 3,
      "TREASURE TYPE": "C, Y",
      "attacks": "2 claws or 1 weapon",
      "damage": "1d3+3/1d3+3 or by weapon +3",
      "specialAttacks": "See Below",
      "specialDefenses": "See Below",
      "magicResistance": "50%",
      "lairProbability": "50%",
      "intelligence": "Average",
      "alignment": "Chaotic evil",
      "levelXP": "5/410 +2/hp",
      "description": "Sea Hags are wretched creatures given to committing dreadful acts of evil. They typically make their lairs beneath the ocean depths, but they are occasionally found in large lakes or other significant bodies of water. Their true form is that of a decrepit old woman, ravaged by time and repellent beyond reason, but they generally use their magic to assume a much more pleasant visage. They have sharp claws and teeth, as well as an insatiable appetite for flesh. Most Sea Hags are thought to be capable of speaking a number of languages. The appearance of a Sea Hag belies their true abilities, for they are all supernaturally swift and strong, but more potent are their magical abilities. They take particular delight in their ability to use change self to deceive the unwary, either luring them to an unpleasant and immediate death or as part of a more subtle scheme; they can use this power at will and the duration is unlimited. Should a Sea Hag's true appearance ever be revealed, then the horror causes anyone within thirty feet to be subject to a saving throw versus spells to avoid losing half their strength score for 1d6 turns. Furthermore, a Sea Hag can employ an evil gaze up to three times per day that subjects one creature within thirty feet to a saving throw vs poison; failure results in immediate collapse and paralysis for three days, though for 1 in 4 victims the effect is stronger and causes instant death. If physical combat becomes unavoidable, Sea Hags will attack with a weapon or their sharp claws; regardless, they have +3 to hit and +3 to damage. Sea Hags are immune to charm, fear, sleep and fire or cold based spells and immune to weapons that are not forged of cold iron, silver or else enchanted with at least a +1 bonus.",
      "treasure": {
        "cp": { "amount": "1d10×1,000", "chance": "25%" },
        "sp": { "amount": "1d8×1,000", "chance": "25%" },
        "gp": { "amount": "1d6×1,000", "chance": "25%" },
        "gems": { "amount": "1d6", "chance": "25%" },
        "jewellery": { "amount": "1d3", "chance": "25%" },
        "magic_items": { "amount": "any two", "chance": "10%" }
      }
    },
    {
      "name": "Sea Serpent",
      "category": "Monster",
      "frequency": "Uncommon",
      "numberAppearing": "1d2",
      "size": "Large (50 ft long)",
      "move": "120 ft swimming",
      "armorClass": 5,
      "hitDice": 10,
      "TREASURE TYPE": "Nil",
      "attacks": 2,
      "damage": "1d6/3d6",
      "specialAttacks": "Poison, constrict",
      "specialDefenses": "Nil",
      "magicResistance": "Nil",
      "lairProbability": "5%",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "levelXP": "7/1,000 + 12/hp",
      "description": "Descriptions of sea serpents vary with the region in which they are found. Sometimes they appear as giant sea snakes and other times as dragon-like serpentine creatures with legs or flippers. What is known for certain is a sea serpent can be encountered in any ocean, sea, or large body of fresh water. Sea serpents have two attacks. It has a poisonous bite for 1d6 points of damage and death in 1d4 rounds, save vs poison to negate; and a coiling attack which can crush a ship or creature in 1d6+4 (5-10) rounds. Sea serpents are very territorial but are not otherwise aggressive, only attacking when hungry. Once a sea serpent attacks, however, it is fearless and relentless and will fight to the death. Sea serpents are capable of diving to great depths and staying underwater for long periods of time. Sea serpents only lair in caves in very deep water and tend to be solitary or, at most, a mated pair.",
      "treasure": "None"
    },
    {
      "name": "Shadow",
      "category": "Undead",
      "turnResistance": 4,
      "frequency": "Rare",
      "numberAppearing": "2d10+1",
      "size": "Man-sized",
      "move": "120 ft",
      "armorClass": 7,
      "hitDice": "3+1",
      "TREASURE TYPE": "F",
      "attacks": "1",
      "damage": "1d6",
      "specialAttacks": "Drains strength, dexterity or constitution",
      "specialDefenses": "+1 or better weapon to hit; immune to cold, poison, and paralysation, as well as sleep, charm, hold and other mental attacks",
      "magicResistance": "Standard",
      "lairProbability": "40%",
      "intelligence": "Low",
      "alignment": "Chaotic evil",
      "levelXP": "4/250 +4/hp",
      "treasure": {
        "sp": {"amount": "2d10×1,000", "chance": "10%"},
        "ep": {"amount": "2d6×1,000", "chance": "15%"},
        "gp": {"amount": "2d4×1,000", "chance": "45%"},
        "pp": {"amount": "1d6×1,000", "chance": "33%"},
        "gems": {"amount": "4d8", "chance": "20%"},
        "jewellery": {"amount": "2d4", "chance": "8%"},
        "magic_items": {"amount": "3", "chance": "33%"}
      },
      "description": "Shadows are undead creatures that drain random attributes (Str, Dex, or Con) with each hit. Victims reduced to zero become shadows under the control of their killer. Drained points return after an hour if not reduced to zero. They can only be hit by magic weapons and are immune to cold, mind-affecting spells, and most detection methods."
    },
    {
      "name": "Shambling Mound",
      "category": "Monster",
      "frequency": "Rare",
      "numberAppearing": "1d3",
      "size": "Large",
      "move": "60 ft",
      "armorClass": 0,
      "hitDice": "8 to 11",
      "TREASURE TYPE": "B, T, X",
      "attacks": 2,
      "damage": "2d8/2d8",
      "specialAttacks": "Suffocation",
      "specialDefenses": "See below",
      "magicResistance": "See below",
      "lairProbability": "30%",
      "intelligence": "Low",
      "alignment": "Neutral",
      "levelXP": "Variable according to hit dice",
      "description": "Shambling mounds appear to be piles of rotting vegetation. They are a type of intelligent plant. They dwell deep underground and in swamps, wherever there is ample moisture and decay. Shambling mounds will eat anything organic. They feed by wrapping their roots around their prey and absorbing the nutrients as the material rots. When attacking, the shambling mound swings its arms around wildly. If both arms strike the same target within the same round, that target has become tangled up inside the creature. The victim will be smothered in 2d4 rounds unless the monster can be killed. These things are rugged since the actual creature is surrounded by layers upon layers of rotting material. Fire has no effect as they are so wet, nothing will burn. Electricity will actually cause the shambling mound to grow, add an additional hit die. Cold based attacks do no damage if the creature makes it save, half if it does. Weapons only do half damage as well. Shambling mounds are vulnerable to spells that affect plants such as plant control or charm plant.",
      "treasure": {
        "cp": { "amount": "1d8×1,000", "chance": "50%" },
        "sp": { "amount": "1d6×1,000", "chance": "25%" },
        "ep": { "amount": "1d4×1,000", "chance": "25%" },
        "gp": { "amount": "1d3×1,000", "chance": "25%" },
        "gems": { "amount": "1d8", "chance": "30%" },
        "jewellery": { "amount": "1d4", "chance": "20%" },
        "magic_items": { "amount": "sword, armour, or misc. weapon + 1d4 scrolls + 1 misc. magic item + 1 potion", "chance": "60%" }
      }
    },
    {
      "name": "Shark",
      "category": "Animal",
      "frequency": "Common",
      "numberAppearing": "3d4",
      "size": "Medium to large",
      "move": "240 ft swimming",
      "armorClass": 6,
      "hitDice": "3, 5 or 8",
      "TREASURE TYPE": "Nil",
      "attacks": 1,
      "damage": "1d4+1, 2d4 or 3d4",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": "3/50 + 2/hp or more",
      "treasure": "None",
      "description": "Sharks are vicious sea scavengers attracted to splashing, movement, and especially blood in water. When feeding, they enter a frenzy attacking everything, sometimes even each other. Sharks have two notable weaknesses: they must remain in constant motion to breathe (immobilization causes drowning), and they can be killed instantly by a well-placed blunt force blow to their side."
    },
    {
      "name": "Shedu",
      "category": "Monster",
      "frequency": "Rare",
      "numberAppearing": "2d4",
      "size": "Large",
      "move": "120 ft; 240 ft flying (AA:IV)",
      "armorClass": 4,
      "hitDice": "9+9",
      "TREASURE TYPE": "G",
      "attacks": 2,
      "damage": "1d6/1d6",
      "specialAttacks": "See below",
      "specialDefenses": "See below",
      "magicResistance": "25%",
      "lairProbability": "25%",
      "intelligence": "Exceptional",
      "alignment": "Lawful good",
      "levelXP": "7/1,950 + 14/hp",
      "description": "Shedu are winged bulls with human heads. They wander endlessly battling evil and chaos. They will aid anyone of good alignment, who is in need. They are powerful magic users who cast with a 9th level ability. If attacked, they will defend themselves with their front hooves. Shedu not only travel the material plane but the æthereal and astral planes as well. They can become æthereal at will. Shedu speak their own language, using their telepathy to communicate with others.",
      "treasure": {
        "gp": { "amount": "10d4×1,000", "chance": "50%" },
        "pp": { "amount": "1d20×100", "chance": "50%" },
        "gems": { "amount": "5d4", "chance": "30%" },
        "jewellery": { "amount": "1d10", "chance": "25%" },
        "magic_items": { "amount": "any 4 magic item + 1 scroll", "chance": "35%" }
      }
    },
    {
      "name": "Shrieker",
      "category": "Monster",
      "frequency": "Common",
      "numberAppearing": "2d4",
      "size": "Small to large",
      "move": "10 ft",
      "armorClass": 7,
      "hitDice": 3,
      "TREASURE TYPE": "Nil",
      "attacks": "None",
      "damage": "Nil",
      "specialAttacks": "Nil",
      "specialDefenses": "Noise",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": "3/50 + 2/hp",
      "description": "Shriekers are mobile fungi that wander around quietly underground soaking up moisture. They are the favourite food of purple worms and shambling mounds. They give off an ear-piercing shriek whenever they detect light within 30 ft or movement within 10 ft. Shriekers will continue to shriek for 1d3 rounds, with a 50% chance to attract a wandering monster each round.",
      "treasure": "None"
    },
    {
      "name": "Skeleton",
      "category": "Undead",
      "turnResistance": 1,
      "frequency": "Rare",
      "numberAppearing": "3d10",
      "size": "Man-sized",
      "move": "120 ft",
      "armorClass": 7,
      "hitDice": "1",
      "TREASURE TYPE": "Nil",
      "attacks": "1",
      "damage": "1d6",
      "specialAttacks": "None",
      "specialDefenses": "Immune to cold, sleep, charm, hold and other mental based attacks.",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "None",
      "alignment": "Neutral",
      "levelXP": "1/15 +1/hp",
      "treasure": "None",
      "description": "Animated fleshless remains created by evil magic. They mindlessly obey simple commands. All attacks deal 1d6 damage regardless of weapon. Immune to cold and mind-affecting spells. Take half damage from edged/cutting weapons and minimal damage from piercing weapons. Holy water inflicts 2d4 damage per vial."
    },
    {
      "name": "Skeleton Warrior",
      "category": "Monster",
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Man-sized",
      "move": "60 ft",
      "armorClass": 2,
      "hitDice": "9+2 or higher",
      "TREASURE TYPE": "A",
      "attacks": 1,
      "damage": "By weapon (+3 to hit)",
      "specialAttacks": "See below",
      "specialDefenses": "See below",
      "magicResistance": "90%",
      "lairProbability": "5%",
      "intelligence": "Exceptional",
      "alignment": "Neutral evil",
      "levelXP": "7/2,000+16/hp",
      "description": "Skeleton Warriors are the unfortunate victims of powerful magic; in life they were fighters of great prowess and likely lords in their own right. In death they have become abominations, compelled by evil sorcery to serve any who possess the golden circlets that contain their souls. Skeleton Warriors desire above all else to gain possession of their own circlet and to be revenged upon any who have possessed and used it in the past. The appearance of a Skeleton Warrior is terrifying and creatures with less than five HD will panic and flee from its presence. A visage of desiccated and decaying flesh hanging from exposed bone is perhaps fearsome enough, but the flame red-eyes that stare forth from black sockets are said to haunt the dreams of those upon whom they look. They are generally armed and armoured with the remains of what they wore in life, or their grave goods. A character in possession of the circlet of a Skeleton Warrior and within 240 ft may attempt to dominate it. The circlet must be worn on the attempting character's head in order to do this; it cannot be used whilst wearing a helmet or similar headgear. On the first attempt at domination, the character has a chance of success equal to his or her Wisdom score × 5, but he or she must be able to see his or her victim and have the freedom to concentrate for one round. If the attempt fails, it may be attempted again on the following round. If concentration is interrupted before domination is achieved, such as by an attack, the character must concentrate for a further three rounds. During this time, the Skeleton Warrior will attempt to kill its would-be master and take possession of the circlet if such is at all possible. In the event of successful domination, the Skeleton Warrior is rendered inert for as long as the character remains in possession of the circlet. Additionally, whenever they are within 240 ft of one another and the character wears the circlet without helmet as described above, the user may take control of the Skeleton Warrior, being able to see through its eyes and direct its actions as he or she desires; whilst controlling the actions of the Skeleton Warrior, the user may not act him- or herself. Should the user lose possession of the circlet for any reason, the Skeleton Warrior will seek him or her out and slay him or her, moving at double its usual movement rate. In the event that the Skeleton Warrior ever regains possession of its circlet, it will place it upon its head and as a result both will turn to dust. Skeleton Warriors are powerful combatants, may use any weapon and always have a +3 bonus to hit; they can only be harmed by magical weapons. The lair of a Skeleton Warrior is normally a richly adorned tomb filled with considerable treasure. However, because they are usually either seeking the current possessor of their circlet or else in the unwilling service of said possessor, they are rarely found in their lairs. Contrary to appearances, the Skeleton Warrior is not undead in the conventional sense. It cannot be turned, is unaffected by a scroll of protection from undead, etc.",
      "treasure": {
        "cp": { "amount": "1d8×1,000", "chance": "50%" },
        "sp": { "amount": "1d6×1,000", "chance": "25%" },
        "ep": { "amount": "1d4×1,000", "chance": "25%" },
        "gp": { "amount": "1d3×1,000", "chance": "25%" },
        "gems": { "amount": "1d8", "chance": "30%" },
        "jewellery": { "amount": "1d4", "chance": "20%" },
        "magic_items": { "amount": "sword, armour, or misc. weapon + 1d4 scrolls + 1 misc. magic item + 1 potion", "chance": "60%" }
      }
    },
    {
      "name": "Slithering Tracker",
      "category": "Monster",
      "frequency": "Rare",
      "numberAppearing": "1",
      "size": "Small",
      "move": "120 ft",
      "armorClass": 5,
      "hitDice": 5,
      "TREASURE TYPE": "See treasure",
      "attacks": "None",
      "damage": "None",
      "specialAttacks": "See below",
      "specialDefenses": "See below",
      "magicResistance": "Standard",
      "lairProbability": "10%",
      "intelligence": "Average",
      "alignment": "Neutral",
      "levelXP": "3/250+5/hp",
      "description": "Slithering trackers live in dungeons, ruins and dark places. They are transparent and if not in natural sunlight are almost impossible to see (1 in 20 chance of spotting). They almost never attack their prey immediately, instead following and waiting until their target is asleep. They can follow through almost anything, being amorphous in shape and capable of seeping through tiny gaps, such as door jambs or cracks in stonework. If a slithering tracker catches its victim asleep, it will touch it, forcing the victim to roll a saving throw vs paralysation or be totally paralysed for 1d6 hours. The tracker will then feed directly on its victim's life energy, killing it in 1 hour.",
      "treasure": {
        "lair": {
          "cp": { "amount": "1d10×1,000", "chance": "20%" },
          "sp": { "amount": "1d6×1,000", "chance": "25%" },
          "ep": { "amount": "1d3×1,000", "chance": "10%" },
          "gems": { "amount": "1d4", "chance": "20%" },
          "jewellery": { "amount": "1d2", "chance": "20%" },
          "magic_items": { "amount": "any two", "chance": "5%" }
        }
      }
    },
    {
      "name": "Slime, Green",
      "category": "Monster",
      "frequency": "Rare",
      "numberAppearing": "1d4",
      "size": "Small",
      "move": "None",
      "armorClass": 10,
      "hitDice": 2,
      "TREASURE TYPE": "Nil",
      "attacks": "None",
      "damage": "Nil",
      "specialAttacks": "See below",
      "specialDefenses": "See below",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": "2/20+2/hp",
      "description": "Green slime is an occasional dungeon hazard. Sages debate whether it is vegetable or fungoid in nature. It grows over the ceiling of an area until a pendulous bulb of slime is almost ready to drop. The vibrations from passing creatures cause these bulbs to fall. If a bulb strikes exposed flesh, it will convert the flesh rapidly to green slime. It can also eat through wood (slowly) and metal (quickly—a metal item will be consumed in 1d6 rounds). Only stone can stop it. Green slime is unharmed by most weapons or spells. It does take damage from cold or fire, and can be killed by a cure disease spell. Failing that, a creature with green slime on it must cut away the affected area, amputate the affected limb, or die in 1d4 rounds (after which it will be converted to green slime and cannot be raised or resurrected).",
      "treasure": "None"
    },
    {
      "name": "Slug, Giant",
      "category": "Monster",
      "frequency": "Uncommon",
      "numberAppearing": "1",
      "size": "Large",
      "move": "60 ft",
      "armorClass": 8,
      "hitDice": 12,
      "TREASURE TYPE": "Nil",
      "attacks": 1,
      "damage": "1d12",
      "specialAttacks": "Spit acid",
      "specialDefenses": "See below",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": "7/2,000+16/hp",
      "description": "Giant slugs live in dungeons and other underground complexes where they can avoid sunlight. Since these creatures are boneless they can squeeze through narrow openings and navigate around most obstructions. They use their sharp tongues to burrow through wood and hard ground. Giant slugs have a nasty bite, but their most effective weapon is their ability to spit acid up to 100 ft away. The first shot is almost always a miss (only 10% chance to hit), but this attack serves to approximate distance. After the first shot the chance hitting is base 100%, going down 10% for every 10 ft distance from giant slug; thus at 20 ft away the chance to hit is 80%, at 70 ft away 30%, etc. Because of their tough, flexible bodies, non-magical blunt weapons do no damage against giant slugs—only edged, piercing, or magical blunt weapons can harm them. These creatures are usually a pale light grey with a white belly, but can be brown or black.",
      "treasure": "None"
    },
    {
      "name": "Snake, Giant",
      "category": "Monster",
      "variants": [
        {
          "name": "Boa",
          "frequency": "Uncommon",
          "numberAppearing": "1d2",
          "size": "Large",
          "move": "90 ft",
          "armorClass": 5,
          "hitDice": "6 + 1",
          "attacks": 2,
          "damage": "1d4/2d4",
          "specialAttacks": "Constriction",
          "specialDefenses": "None",
          "magicResistance": "Standard",
          "lairProbability": "Nil",
          "TREASURE TYPE": "Nil",
          "intelligence": "Animal",
          "alignment": "Neutral",
          "levelXP": "5/345+8/hp",
          "description": "Boas will drop on its prey from above, coiling its long body around the chosen target victim and attacking by both biting and squeezing for 2d4 points of damage. Once a snake has a victim within its coils it is quite difficult to release him or her. Several strong creatures can grasp each end of the snake and uncoil the victim in 1d4+1 segments. Four very strong humans, 16 or greater strength each, should be able to accomplish this task. Attacks directed against a snake will also affect the victim trapped within the snake coils, though the GM may allow certain types of attacks to not do so."
        },
        {
          "name": "Adder",
          "frequency": "Uncommon",
          "numberAppearing": "1d6",
          "size": "Large",
          "move": "150 ft",
          "armorClass": 5,
          "hitDice": "4 + 2",
          "attacks": 1,
          "damage": "1d4",
          "specialAttacks": "Poison",
          "specialDefenses": "None",
          "magicResistance": "Standard",
          "lairProbability": "Nil",
          "TREASURE TYPE": "Nil",
          "intelligence": "Animal",
          "alignment": "Neutral",
          "levelXP": "4/155+4/hp",
          "description": "Adder is the common name for giant poisonous snakes and they come in a variety of species. The poisons are usually negated by a saving throw but some types of adders have a powerful poison which, even if saved against, causes 3d6 points of damage to the victim."
        },
        {
          "name": "Cobra",
          "frequency": "Rare",
          "numberAppearing": "1d4",
          "size": "Large",
          "move": "120 ft",
          "armorClass": 5,
          "hitDice": "4 + 2",
          "attacks": 1,
          "damage": "1d4",
          "specialAttacks": "See below",
          "specialDefenses": "None",
          "magicResistance": "Standard",
          "lairProbability": "Nil",
          "TREASURE TYPE": "Nil",
          "intelligence": "Animal",
          "alignment": "Neutral",
          "levelXP": "4/190+4/hp",
          "description": "Cobras are hooded giant snakes with the ability to spit poison at a single target up to 30 ft distant. The bite of the giant cobra is also quite poisonous. In either case, the victim gets a saving throw to negate the poison."
        },
        {
          "name": "Amphisbaena",
          "frequency": "Very rare",
          "numberAppearing": "1d3",
          "size": "Medium (6 ft long)",
          "move": "120 ft",
          "armorClass": 3,
          "hitDice": 6,
          "attacks": 2,
          "damage": "1d4/1d4",
          "specialAttacks": "Poison",
          "specialDefenses": "Immune to cold",
          "magicResistance": "Standard",
          "lairProbability": "Nil",
          "TREASURE TYPE": "Nil",
          "intelligence": "Animal",
          "alignment": "Neutral",
          "levelXP": "5/475+6/hp",
          "description": "Amphisbaena are 6 ft long snakes with a head at both ends of its body. Both heads are capable of delivering a poisonous bite and victims must save vs poison or die instantly. Its method of travel is as bizarre as the creature's appearance, one head of this unusual snake will grab the neck of the other and the creature then rolls like a hoop upon the ground! Amphisbaena are carnivorous and like most other reptiles, are cold-blooded and prefer warmer climes. Oddly enough, the amphisbaena is immune to cold based attacks, though the sages are at a loss as to why this is so."
        },
        {
          "name": "Constrictor",
          "frequency": "Uncommon",
          "numberAppearing": "1d2",
          "size": "Large",
          "move": "90 ft",
          "armorClass": 5,
          "hitDice": "6 + 1",
          "attacks": 2,
          "damage": "1d4/2d8",
          "specialAttacks": "Constriction",
          "specialDefenses": "None",
          "magicResistance": "Standard",
          "lairProbability": "Nil",
          "TREASURE TYPE": "Nil",
          "intelligence": "Animal",
          "alignment": "Neutral",
          "levelXP": "5/345+8/hp",
          "description": "These snakes usually drop coils from above, grab prey within their coils, deliver a bite, and then constrict causing 2–8 points of damage per melee round. Several strong creatures can uncoil it in 2–5 rounds if grabbing both ends. After eating, it sleeps for days."
        },
        {
          "name": "Poisonous",
          "frequency": "Uncommon",
          "numberAppearing": "1d6",
          "size": "Large",
          "move": "150 ft",
          "armorClass": 5,
          "hitDice": "4 + 2",
          "attacks": 1,
          "damage": "1d3",
          "specialAttacks": "Poison",
          "specialDefenses": "None",
          "magicResistance": "Standard",
          "lairProbability": "Nil",
          "TREASURE TYPE": "Nil",
          "intelligence": "Animal",
          "alignment": "Neutral",
          "levelXP": "4/155+4/hp",
          "description": "These giant snakes deliver venom with their bite. Most allow a saving throw to avoid the effect, but particularly virulent types deal 3d6 or even 3d6+ damage on a successful save."
        },
        {
          "name": "Sea",
          "frequency": "Uncommon",
          "numberAppearing": "1d8",
          "size": "Large",
          "move": "120 ft (swim only)",
          "armorClass": 5,
          "hitDice": "8–10",
          "attacks": 2,
          "damage": "1d6/3d6",
          "specialAttacks": "Poison, Constriction vs ships",
          "specialDefenses": "None",
          "magicResistance": "Standard",
          "lairProbability": "Nil",
          "TREASURE TYPE": "Nil",
          "intelligence": "Animal",
          "alignment": "Neutral",
          "levelXP": "Varies by HD (use 8–10 HD XP chart)",
          "description": "Found only in tropical waters, sea snakes usually ignore ships unless hungry (20% chance). Their bite is poisonous and the largest can constrict small vessels, dealing 10% of ship value in damage per round."
        },
        {
          "name": "Spitting",
          "frequency": "Rare",
          "numberAppearing": "1d4",
          "size": "Medium",
          "move": "120 ft",
          "armorClass": 5,
          "hitDice": "4 + 2",
          "attacks": 1,
          "damage": "1d3",
          "specialAttacks": "Spit poison 30 ft, poisonous bite",
          "specialDefenses": "None",
          "magicResistance": "Standard",
          "lairProbability": "Nil",
          "TREASURE TYPE": "Nil",
          "intelligence": "Animal",
          "alignment": "Neutral",
          "levelXP": "4/190+4/hp",
          "description": "A variety of giant poisonous snakes capable of spitting venom up to 30 ft at a single target. The bite is also poisonous. Spitting cobras are the most well-known subtype."
        }
      ],
      "description": "All giant snakes are carnivorous and can be found in every type of climate except for the coldest. NB: For giant sea snakes see the listing for sea serpent.",
      "TREASURE TYPE": "Nil",
      "treasure": "None (for all giant snakes)"
    },

    {
      "name": "Soldiery",
      "category": "Men",
      "name_variants": "Mercenary Company, Infantry Company",
      "frequency": "Uncommon",
      "numberAppearing": "140+10d6",  // 150–200 total
      "size": "Man-sized",
      "move": "120 ft (afoot), 180 ft (mounted leaders)",
      "armorClass": "2 (commander), 3 (lieutenants), 4 (serjeants), 5–6 (soldiers)",
      "hitDice": "F 0 to F 8",
      "TREASURE TYPE": "See treasure",
      "attacks": 1,
      "damage": "By weapon",
      "specialAttacks": "Coordinated formations, spellcaster support",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "10%",
      "intelligence": "Average",
      "alignment": "Lawful Neutral or Neutral",
      "levelXP": "Variable by rank",
      "description": "A disciplined mercenary infantry company of 150–200 soldiers. Most troops are footmen, while leaders and scouts are mounted. Forces are armed according to their region, with a mix of polearms, sidearms, and missile weapons. In hostile regions, they are often accompanied by a cleric or magic-user. Armor Class values exclude Dexterity or magic bonuses.",
      "leaders": {
        "commander": { "level": "6–8", "class": "fighter", "count": 1 },
        "lieutenants": { "level": "3–5", "class": "fighter", "count": 5 },
        "serjeants": { "level": 2, "class": "fighter", "count": "2 per 10 soldiers" },
        "scouts": { "level": 1, "class": "fighter", "count": 10 },
        "soldiers": { "level": 0, "class": "fighter", "count": "140–190" },
        "hostile_area_spellcaster": {
          "options": [
            { "level": "4–6", "class": "cleric", "count": 1 },
            { "level": "3–5", "class": "magic-user", "count": 1 }
          ],
          "condition": "Only present in hostile regions"
        }
      },
      "equipment": {
        "weapon_mix": {
          "polearms": "50%",
          "sidearms": "30%",
          "missile_weapons": "20%"
        },
        "armor_notes": "Commanders and officers wear superior armor (AC 2–4); troops AC 5–6 depending on gear; AC does not include Dex or magic bonuses",
        "mounts": "Commanders, serjeants, and scouts are mounted on light warhorses"
      },
      "magic_item_chance": {
        "reference": "Same as Men, Patrol, Levies",
        "fighters": "5% per level (armor, sword, misc weapon, potion)",
        "clerics": "5% per level (armor, misc weapon, potion, scroll, misc magic)",
        "magic_users": "5% per level (potion, scroll, ring, misc magic)"
      },
      "treasure": {
        "individual": "1d6 sp or ep",
        "lair": {
          "cp": { "amount": "1d6×100", "chance": "15%" },
          "sp": { "amount": "1d4×100", "chance": "25%" },
          "gp": { "amount": "1d3×100", "chance": "25%" },
          "gems": { "amount": "1d6", "chance": "35%" },
          "magic_items": { "amount": 1, "chance": "25%" }
        }
      }
    },
    {
      "name": "Soldiery, Hobgoblin",
      "category": "Humanoids",
      "frequency": "Uncommon",
      "numberAppearing": "90d8+70",
      "size": "Man-sized",
      "move": "90 ft",
      "armorClass": "5 (Serjeants AC 4, Captain/Officers AC 2–4)",
      "hitDice": "Hobgoblins: 1+1 (5–8 hp), Serjeants: 9 hp",
      "TREASURE TYPE": "See treasure",
      "attacks": 1,
      "damage": "By weapon",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "15%",
      "intelligence": "Average to very",
      "alignment": "Lawful evil",
      "levelXP": "Variable",
      "description": "Hobgoblin soldiery are disciplined, close-order heavy infantry led by human officers. Their morale is excellent as long as leaders remain. Equipment varies but is standardized by unit.",
      "leaders": {
        "captain": { "level": "6-8", "class": "fighter", "count": 1 },
        "lieutenant": { "level": 5, "class": "fighter", "count": 1 },
        "subalterns": { "level": 3, "class": "fighter", "count": 4 },
        "serjeants": { "level": 2, "class": "fighter", "count": 8 },
        "cleric": {
          "chance": "50%",
          "level": "4-7",
          "class": "cleric"
        },
        "magic_user": {
          "chance": "30%",
          "level": "3-6",
          "class": "magic-user"
        },
        "thief": {
          "chance": "70%",
          "level": "5-8",
          "class": "thief"
        }
      },
      "equipment": {
        "hobgoblins": {
          "composite_bow_short_sword": "20%",
          "fauchard_fork_short_sword": "50%",
          "morning_star": "30%"
        },
        "human_leaders": {
          "mounts": "Medium warhorses",
          "weapons": "Lance, whip, long sword, mace"
        }
      },
      "treasure": {
        "individual": "1d6 ep",
        "lair": {
          "gp": { "amount": "2d10×1000", "chance": "50%" },
          "gems": { "amount": "1d8", "chance": "25%" },
          "magic_items": { "amount": 1, "chance": "20%" }
        }
      }
    },
    {
      "name": "Soldiery, Orcs",
      "category": "Humanoids",
      "name_variants": "Orc Soldiery",
      "frequency": "Uncommon",
      "numberAppearing": "120–150",
      "size": "Man-sized",
      "move": "120 ft",
      "armorClass": 6,
      "hitDice": "1d8 (leaders vary)",
      "TREASURE TYPE": "See treasure",
      "attacks": 1,
      "damage": "By weapon",
      "specialAttacks": "Organized tactics, potential magic use",
      "specialDefenses": "Poor morale if leaders flee",
      "magicResistance": "Standard",
      "lairProbability": "20%",
      "intelligence": "Low to Average",
      "alignment": "Lawful evil",
      "levelXP": "Variable",
      "description": "These organized troops of orcs are led by human or half-orc officers, and may include hobgoblins or half-orcs. They fight as well-trained units and have poor morale if their leaders fall. Orcs use standard weapons and armor, while leaders may possess magic.",
      "leaders": {
        "captain": {
          "count": 1,
          "options": [
            {"level": "5-6", "class": "fighter"},
            {"level": "4-5 / 4-5", "class": "fighter/thief", "chance": "20%"},
            {"level": "4-5 / 4-5", "class": "fighter/assassin", "chance": "20%"}
          ]
        },
        "lieutenants": {
          "count": "3d3",
          "options": [
            {"level": "3-4", "class": "fighter"},
            {"level": "2-3 / 2-3", "class": "fighter/thief", "chance": "20%"},
            {"level": "2-3 / 2-3", "class": "fighter/assassin", "chance": "20%"}
          ]
        },
        "cleric": {
          "chance": "100%",
          "level": "3-4 / 3-4",
          "class": "cleric/thief or cleric/assassin",
          "race": "half-orc"
        }
      },
      "equipment": {
        "infantry": {
          "weapon_types": "Standard orc weapons, regional variation",
          "notes": "Includes some hobgoblins or half-orcs"
        }
      },
      "treasure": {
        "individual": "As orc standard",
        "lair": {
          "cp": {"amount": "2d6×1,000", "chance": "25%"},
          "sp": {"amount": "2d6×1,000", "chance": "30%"},
          "gp": {"amount": "2d10×1,000", "chance": "40%"},
          "gems": {"amount": "2d10", "chance": "30%"},
          "jewellery": {"amount": "1d10", "chance": "20%"},
          "magic_items": {"amount": 2, "chance": "20%"}
        }
      }
    },

    {
      "name": "Spider",
      "category": "Monster",
      "description": "Spiders are found in all regions except frigid climes and are aggressive predators. Even if not hungry, they attack creatures which disturb their webs. They dwell both above and below ground.",
      "variants": [
        {
          "name": "Spider, Giant",
          "type": "Giant",
          "frequency": "Uncommon",
          "numberAppearing": "1d8",
          "size": "Large",
          "move": "3\"*12\"",
          "armorClass": 4,
          "hitDice": "4+4",
          "attacks": "1",
          "damage": "2-8",
          "specialAttacks": "Poison (save vs poison or die); webs equivalent to web spell (Str 18+ breaks free in 1 round, 17 in 2 rounds, etc.); webs are inflammable",
          "specialDefenses": "Nil",
          "magicResistance": "Standard",
          "lairProbability": "70%",
          "intelligence": "Low",
          "alignment": "Chaotic evil",
          "levelXP": "4/305+5/hp",
          "TREASURE TYPE": "C",
          "treasure": {
            "cp": {"amount": "1d12×1,000", "chance": "20%"},
            "sp": {"amount": "1d4×1,000", "chance": "30%"},
            "ep": {"amount": "1d4×1,000", "chance": "10%"},
            "gems": {"amount": "1d6", "chance": "25%"},
            "jewellery": {"amount": "1d3", "chance": "20%"},
            "magic_items": {"amount": "2", "chance": "10%"}
          },
          "description": "Giant spiders are web builders that construct sticky traps horizontally or vertically to entrap prey. Some lurk above paths to drop upon victims. Their webs are as tough and clinging as a web spell. Their bite is fatally poisonous. They will flee from superior foes, hiding in secret spots for safety."
        },
        {
          "name": "Spider, Huge",
          "type": "Huge",
          "frequency": "Common",
          "numberAppearing": "1d12",
          "size": "Medium",
          "move": "18\"",
          "armorClass": 6,
          "hitDice": "2+2",
          "attacks": "1",
          "damage": "1-6",
          "specialAttacks": "Poison (save at +1); leap 3\" upon prey; surprise on 1-5",
          "specialDefenses": "Nil",
          "magicResistance": "Standard",
          "lairProbability": "50%",
          "intelligence": "Animal",
          "alignment": "Neutral",
          "levelXP": "2/65+3/hp",
          "TREASURE TYPE": "J, K, L, M, N, Q",
          "treasure": {
            "cp": {"amount": "3d8", "chance": "25%"},
            "sp": {"amount": "1d8", "chance": "10%"},
            "ep": {"amount": "2d6", "chance": "15%"},
            "gp": {"amount": "2d4", "chance": "5%"},
            "gems": {"amount": "1d4", "chance": "25%"}
          },
          "description": "Huge spiders are roving hunters such as wolf spiders that can leap 3\" upon prey. Others are trapdoor spiders that build concealed places and rush forth upon victims. Saving throws versus their poison are at +1. They surprise prey on 1-5 out of 6."
        },
        {
          "name": "Spider, Large",
          "type": "Large",
          "frequency": "Common",
          "numberAppearing": "2d20",
          "size": "Small",
          "move": "6\"*15\"",
          "armorClass": 8,
          "hitDice": "1+1",
          "attacks": "1",
          "damage": "1",
          "specialAttacks": "Poison (save at +2); 90% likely to attack any creature within 3\"",
          "specialDefenses": "Nil",
          "magicResistance": "Standard",
          "lairProbability": "60%",
          "intelligence": "Non-",
          "alignment": "Neutral",
          "levelXP": "1/28+1/hp",
          "TREASURE TYPE": "J, K, L, M, N",
          "treasure": {
            "cp": {"amount": "3d8", "chance": "25%"},
            "sp": {"amount": "1d8", "chance": "10%"},
            "ep": {"amount": "2d6", "chance": "15%"},
            "gp": {"amount": "2d4", "chance": "5%"}
          },
          "description": "Large spiders scuttle about on walls, ceilings, and floors, always searching for victims. They are 90% likely to attack any creature within 3\". Their poison is relatively weak; saving throws are at +2."
        },
        {
          "name": "Phase Spider",
          "name_variants": "Spider, Phase",
          "type": "Phase",
          "frequency": "Rare",
          "numberAppearing": "1d4",
          "size": "Large",
          "move": "6\"*15\"",
          "armorClass": 7,
          "hitDice": "5+5",
          "attacks": "1",
          "damage": "1-6",
          "specialAttacks": "Poison (save at -2); phases in and out to attack",
          "specialDefenses": "When out of phase, impervious to nearly all attacks; phase door spell forces 7 rounds in phase; oil/armor of etherealness puts wearer in same phase",
          "magicResistance": "Standard",
          "lairProbability": "75%",
          "intelligence": "Low",
          "alignment": "Neutral",
          "levelXP": "5/575+6/hp",
          "TREASURE TYPE": "E",
          "treasure": {
            "cp": {"amount": "1d8×1,000", "chance": "5%"},
            "sp": {"amount": "1d12×1,000", "chance": "25%"},
            "ep": {"amount": "1d6×1,000", "chance": "25%"},
            "gp": {"amount": "1d8×1,000", "chance": "25%"},
            "gems": {"amount": "1d10", "chance": "15%"},
            "jewellery": {"amount": "1d4", "chance": "10%"},
            "magic_items": {"amount": "1d4+1", "chance": "25%"}
          },
          "description": "Phase spiders can shift out of phase with their surroundings when attacking or being attacked, returning only to deliver their poisonous bite. Victims save at -2 vs poison. When out of phase they are impervious to nearly all attacks. A phase door spell forces them to remain in phase for 7 rounds. Their webs are equal to those of giant spiders."
        },
        {
          "name": "Spider, Water Giant",
          "name_variants": "Water Spider, Giant Water Spider",
          "type": "Water, Giant",
          "frequency": "Common",
          "numberAppearing": "1d10",
          "size": "Medium",
          "move": "15\"",
          "armorClass": 5,
          "hitDice": "3+3",
          "attacks": "1",
          "damage": "1-4",
          "specialAttacks": "Poison",
          "specialDefenses": "Nil",
          "magicResistance": "Standard",
          "lairProbability": "90%",
          "intelligence": "Semi-",
          "alignment": "Neutral",
          "levelXP": "3/135+4/hp",
          "TREASURE TYPE": "J, K, L, M, N, Q",
          "treasure": {
            "cp": {"amount": "3d8", "chance": "25%"},
            "sp": {"amount": "1d8", "chance": "10%"},
            "ep": {"amount": "2d6", "chance": "15%"},
            "gp": {"amount": "2d4", "chance": "5%"},
            "gems": {"amount": "1d4", "chance": "25%"}
          },
          "description": "Fresh water dwellers found only in large lakes. They build great nests of air amidst underwater vegetation and can run along the bottom or up and down surfaces underwater. They snatch passing prey and deliver a poisonous bite. Semi-intelligent, they can be approached with offerings of food. Abandoned lairs make excellent refuges for air-breathers."
        }
      ]
    },
    
    {
      "name": "Spectre",
      "category": "Undead",
      "turnResistance": 9,
      "frequency": "Rare",
      "numberAppearing": "1d6",
      "size": "Man-sized",
      "move": "150 ft hovering; 300 ft flying (AA: IV)",
      "armorClass": 2,
      "hitDice": "7+3",
      "TREASURE TYPE": "Q (x3), X, Y",
      "attacks": "1",
      "damage": "1d8",
      "specialAttacks": "Level drain",
      "specialDefenses": "+1 or better weapon to hit; immune to cold, poison, paralysation, and elemental spells, as well as sleep, charm, hold and other mental attacks",
      "magicResistance": "Standard",
      "lairProbability": "20%",
      "intelligence": "High",
      "alignment": "Lawful evil",
      "levelXP": "7/1,815 +10/hp",
      "treasure": {
        "gems": {"amount": "3d4", "chance": "50%"},
        "gp": {"amount": "3d4×1,000", "chance": "70%"},
        "magic_items": {"amount": "1", "chance": "60%"},
        "potions": {"amount": "1d2", "chance": "70%"}
      },
      "description": "Spectres are insubstantial undead that drain two levels of experience with each hit. Victims reduced below level zero become half-strength spectres under their killer's control. They can only be damaged by magic weapons (+1 or better) or spells. Elemental spells and mind-affecting magic have no effect on them. Holy water works normally."
    },
    {
      "name": "Squid, Giant",
      "category": "Aquatic",
      "variants": [
        {
          "type": "Squid",
          "frequency": "Rare",
          "numberAppearing": "1",
          "size": "Large",
          "move": "180 ft swimming",
          "armorClass": "3/7",
          "hitDice": 12,
          "TREASURE TYPE": "A",
          "attacks": 9,
          "damage": "1d6 (×8)/5d4",
          "specialAttacks": "Constriction",
          "specialDefenses": "See below",
          "levelXP": "7/2,000 + 16/hp"
        },
        {
          "type": "Octopus",
          "frequency": "Rare",
          "numberAppearing": "1",
          "size": "Large",
          "move": "180 ft swimming",
          "armorClass": 7,
          "hitDice": 8,
          "TREASURE TYPE": "A",
          "attacks": 7,
          "damage": "1d4+1(×7)/4d4",
          "specialAttacks": "Constriction",
          "specialDefenses": "See below",
          "levelXP": "5/500+10/hp"
        }
      ],
      "magicResistance": "Standard",
      "lairProbability": "40%",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "treasure": "None",
      "description": "Giant squid attack ships by attaching with two tentacles and using the remaining eight to attack crew. Each tentacle deals 1d6 damage initially, then 2d6 crushing damage in subsequent rounds until the victim dies. Victims have a 25% chance of having both arms held (helpless), 50% one arm held (-3 penalty), or 25% both arms free (-1 penalty). Tentacles require 10 hp damage to sever. The squid's body has AC 3 while tentacles have AC 7. If it loses 3+ arms, it flees, releasing a 60×80 ft ink cloud."
    },
    {
      "name": "Tiger",
      "category": "Animal",
      "variants": [
        {
          "type": "Tiger",
          "frequency": "Uncommon",
          "numberAppearing": "1d4",
          "size": "Large",
          "move": "120 ft",
          "armorClass": 6,
          "hitDice": "5+5",
          "attacks": 3,
          "damage": "1d6/1d6/1d10",
          "specialAttacks": "See below",
          "specialDefenses": "Surprised only on 1",
          "levelXP": "4/250 + 6/hp"
        },
        {
          "type": "Smilodon",
          "frequency": "Rare",
          "numberAppearing": "1d2",
          "size": "Large",
          "move": "120 ft",
          "armorClass": 6,
          "hitDice": "7+2",
          "attacks": 3,
          "damage": "1d8/1d8/2d6",
          "specialAttacks": "See below",
          "specialDefenses": "Surprised only on 1",
          "levelXP": "5/525 + 10/hp"
        }
      ],
      "magicResistance": "Standard",
      "lairProbability": "7% (Tiger); 15% (Smilodon)",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "TREASURE TYPE": "Nil",
      "treasure": "None",
      "description": "Tigers are cunning predators that hunt in pairs or family groups. They can climb trees effortlessly, leap 40 ft to attack, move silently at quarter speed, and spring 10 ft vertically. If both claw attacks hit, they gain two additional rear leg attacks at +4 to hit for 1d6+2 damage each. Tigers with cubs (25% chance in lair) fight to the death to protect them. Smilodons (sabretooth tigers) are prehistoric variants with powerful jaws that grant +2 to hit with bite attacks."
    },
    {
      "name": "Tick, Giant",
      "category": "Vermin",
      "name_variants": "Giant Tick, Tick",
      "frequency": "Rare",
      "numberAppearing": "3d4",
      "size": "Small",
      "move": "30 ft",
      "armorClass": 3,
      "hitDice": "2-4",
      "TREASURE TYPE": "Nil",
      "attacks": "1 bite",
      "damage": "1d4",
      "specialAttacks": "Blood drain (1d6 hp/round after attachment until satiated at hp equal to tick's own hp, then drops off); 50% chance of fatal disease (death in 2d4 days unless cure disease cast)",
      "specialDefenses": "Nil",
      "magicResistance": "Standard",
      "lairProbability": "0%",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": "3/85+3/hp",
      "description": "Found in forests and occasionally in caves or caverns. Seek to drop upon prey, insert hollow mouthtube, and suck blood. A hit indicates the tick has attached itself. Must be killed, severely burned, or immersed in water to detach prior to satiation."
    },
    {
      "name": "Toad",
      "category": "Animal",
      "variants": [
        {
          "type": "Giant",
          "frequency": "Common",
          "numberAppearing": "1d12",
          "size": "Medium",
          "move": "60 ft; 60 ft leaping",
          "armorClass": 6,
          "hitDice": "2+4",
          "TREASURE TYPE": "Nil",
          "attacks": 1,
          "damage": "2d4",
          "specialAttacks": "Leap",
          "specialDefenses": "None",
          "levelXP": "2/20+2/hp"
        },
        {
          "type": "Ice Toad",
          "frequency": "Rare",
          "numberAppearing": "1d4",
          "size": "Large",
          "move": "90 ft; 90 ft leaping",
          "armorClass": 4,
          "hitDice": "5",
          "TREASURE TYPE": "C",
          "attacks": 1,
          "damage": "3d4",
          "specialAttacks": "Aura 10 ft. radius 3d6 cold",
          "specialDefenses": "None",
          "levelXP": "5/205+5/hp"
        },
        {
          "type": "Giant Poisonous",
          "frequency": "Uncommon",
          "numberAppearing": "1d8",
          "size": "Medium",
          "move": "60 ft; 60 ft leaping",
          "armorClass": 7,
          "hitDice": 2,
          "TREASURE TYPE": "Nil",
          "attacks": 1,
          "damage": "1d4+1",
          "specialAttacks": "Leap, poison",
          "specialDefenses": "None",
          "levelXP": "2/50+2/hp"
        }
      ],
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "treasure": "None",
      "description": "Giant toads hunt all prey including humans. They can leap forward up to 60 ft and attack in the same round. Poisonous giant toads look identical to normal giant toads but have a deadly venomous bite that kills on a failed saving throw."
    },
    {
      "name": "Troglodyte",
      "category": "Humanoid",
      "frequency": "Common",
      "numberAppearing": "10d10",
      "size": "Man-sized",
      "move": "120 ft",
      "armorClass": 5,
      "hitDice": 2,
      "TREASURE TYPE": "A",
      "attacks": "3 or 1",
      "damage": "1d3/1d3/1d4+1 or by weapon",
      "specialAttacks": "Odour (save vs poison or lose 1 STR/round, lasts 10 rounds after exposure)",
      "specialDefenses": "Chameleon skin: Surprise on 1-4",
      "magicResistance": "Standard",
      "lairProbability": "15%",
      "intelligence": "Low",
      "alignment": "Chaotic evil",
      "levelXP": "2/20+2/hp",
      "description": "Subterranean lizardfolk. Hate humans. Emit a stench in combat. Surprise prey with camouflaged skin.",
      "leaders": {
        "raiding_party": "1 leader (3 HD)",
        "war_party": "2 leaders (4 HD)",
        "lair": {
          "chief": "6 HD",
          "guards": "2d4 (3 HD)"
        }
      },
      "treasure": {
        "individual": "2d6 ep",
        "lair": {
          "cp": {"amount": "1d6×1,000", "chance": "25%"},
          "sp": {"amount": "1d6×1,000", "chance": "30%"},
          "ep": {"amount": "1d6×1,000", "chance": "35%"},
          "gp": {"amount": "1d10×1,000", "chance": "40%"},
          "pp": {"amount": "1d4×100", "chance": "25%"},
          "gems": {"amount": "4d10", "chance": "60%"},
          "jewellery": {"amount": "3d10", "chance": "50%"},
          "magic_items": {"amount": 3, "chance": "30%"}
        }
      }
    },
    {
      "name": "Trapper",
      "category": "Monster",
      "frequency": "Rare",
      "numberAppearing": "1",
      "size": "Large (up to 400-600 sq ft)",
      "move": "30 ft",
      "armorClass": 3,
      "hitDice": 12,
      "TREASURE TYPE": "G",
      "attacks": "4+",
      "damage": "Special",
      "specialAttacks": "Crushes prey (4 + victim's AC damage per turn); smothers in 6 rounds regardless of damage; often creates protuberance resembling chest or box as lure; nearly impossible to detect (95%) by normal means",
      "specialDefenses": "Resistant to fire and cold (half or no damage)",
      "magicResistance": "Standard",
      "lairProbability": "85%",
      "intelligence": "Highly",
      "alignment": "Neutral",
      "levelXP": "10/5,000+16/hp",
      "description": "Clever monsters found only in caves, caverns, and dark places. Shape their flat bodies to conform to the floor surface. Consistency almost as hard as stone. Wait until prey is near center then suddenly close, crushing and smothering victims. Those entrapped cannot use weapons. Must be killed or faced with certain death to release prey. Treasure kept beneath it. Can alter coloration to blend with floor. Typical trapper covers up to 400 sq ft, giant specimens up to 600 sq ft."
    },

    {
      "name": "Troll",
      "category": "Giants",
      "name_variants": "",
      "frequency": "Uncommon",
      "numberAppearing": "1d12",
      "size": "Large (9 ft + tall)",
      "move": "120 ft",
      "armorClass": 4,
      "hitDice": "6+6",
      "TREASURE TYPE": "D",
      "attacks": 3,
      "damage": "1d4+4/1d4+4/2d6",
      "specialAttacks": "Detached limbs attack independently",
      "specialDefenses": "Regeneration",
      "magicResistance": "Standard",
      "lairProbability": "40%",
      "intelligence": "Low",
      "alignment": "Chaotic evil",
      "levelXP": "6/525+8/hp",
      "description": "Trolls are vile, putrid creatures found in almost any climate. The hides of trolls are a sickly green or grey and they have cold black eyes.",
      "specialAbilities": {
        "regeneration": {
          "rate": "3 hp per round",
          "startTime": "After three rounds of combat",
          "limbReattachment": true,
          "weaknesses": ["Fire", "Acid"]
        },
        "detachedLimbs": "Continue to attack independently"
      },
      "treasure": {
        "lair": {
          "cp": {"amount": "1d8×1,000", "chance": "10%"},
          "sp": {"amount": "1d12×1,000", "chance": "15%"},
          "ep": {"amount": "1d8×1,000", "chance": "15%"},
          "gp": {"amount": "1d6×1,000", "chance": "50%"},
          "gems": {"amount": "1d10", "chance": "30%"},
          "jewellery": {"amount": "1d6", "chance": "25%"},
          "magic_items": {"amount": 2, "chance": "15%"},
          "potions": {"amount": 1, "chance": "15%"}
        }
      }
    },
    {
      "name": "Troll, Giant",
      "category": "Giants",
      "name_variants": "",
      "frequency": "Rare",
      "numberAppearing": "1d12",
      "size": "Large (10 ft tall)",
      "move": "120 ft",
      "armorClass": 4,
      "hitDice": 8,
      "TREASURE TYPE": "C",
      "attacks": 1,
      "damage": "2d8",
      "specialAttacks": "Dual claw attacks (1d6 each) when unarmed",
      "specialDefenses": "Regeneration",
      "magicResistance": "Standard",
      "lairProbability": "33%",
      "intelligence": "Low",
      "alignment": "Chaotic evil",
      "levelXP": "6/750 + 10/hp",
      "description": "These horrible creatures are the result of crossbreeding trolls with hill giants, resulting in a monster that looks like a troll combined with the large size and pot-belly of a hill giant. The hide of a giant troll is reddish brown and they have tough wiry black hair, bulbous nose, and red rimmed eyes.",
      "specialAbilities": {
        "regeneration": {
          "rate": "2 hp per round",
          "limitedTo": "Cannot rebond severed limbs",
          "weaknesses": ["Fire", "Acid"]
        },
        "missileDefense": "Can snatch missiles from the air 25% of the time and throw them back",
        "weapon": "Giant spiked club (2d8 damage)",
        "naturalWeapons": "Claws (1d6 each) with ability to attack two targets",
        "senses": {
          "infravision": "90 ft",
          "smell": "Acute"
        },
        "fearless": true
      },
      "treasure": {
        "cp": {"amount": "2d6×1,000", "chance": "20%"},
        "sp": {"amount": "1d6×1,000", "chance": "35%"},
        "ep": {"amount": "1d4×1,000", "chance": "15%"},
        "gems": {"amount": "1d6", "chance": "25%"},
        "jewellery": {"amount": "1d4", "chance": "25%"},
        "magic_maps": {"amount": 2, "chance": "10%"}
      }
    },
    {
      "name": "Troll, Giant Two-Headed",
      "category": "Giants",
      "name_variants": "",
      "frequency": "Very rare",
      "numberAppearing": "1d3",
      "size": "Large (10 ft tall)",
      "move": "120 ft",
      "armorClass": 4,
      "hitDice": 10,
      "TREASURE TYPE": "D, Q",
      "attacks": 4,
      "damage": "1d6/1d6/1d10/1d10",
      "specialAttacks": "Multiple attacks",
      "specialDefenses": "Regeneration, rarely surprised",
      "magicResistance": "Standard",
      "lairProbability": "35%",
      "intelligence": "Average",
      "alignment": "Chaotic evil",
      "levelXP": "7/1,750 + 15/hp",
      "description": "Giant two-headed trolls are the vicious offspring of trolls and ettins. In appearance they look most like trolls, though they have two heads like an ettin and prefer wearing filthy animal skins as ettins do. Giant two-headed trolls are nocturnal and prefer underground dwellings such as dungeons or caverns.",
      "specialAbilities": {
        "regeneration": {
          "rate": "1 hp per round",
          "limitedTo": "Cannot rebond severed limbs"
        },
        "dualHeads": "One head can sleep while the other stays alert; surprised only on a 1 in 6",
        "multipleAttacks": {
          "claws": {"damage": "1d6 each", "targets": "Can attack two different opponents"},
          "bites": {"damage": "1d10 each", "targets": "Must be directed at the same opponent"}
        },
        "infravision": "60 ft"
      },
      "treasure": {
        "cp": {"amount": "1d8×1,000", "chance": "20%"},
        "sp": {"amount": "1d10×1,000", "chance": "30%"},
        "ep": {"amount": "1d10×1,000", "chance": "15%"},
        "gp": {"amount": "1d6×1,000", "chance": "60%"},
        "gems": {"amount": "2d6", "chance": "35%"},
        "jewellery": {"amount": "1d6", "chance": "20%"},
        "magic": {"amount": 2, "chance": "25%"},
        "potions": {"amount": 1, "chance": "25%"}
      }
    },
    {
      "name": "Troll, Ice",
      "category": "Giants",
      "name_variants": "",
      "frequency": "Rare",
      "numberAppearing": "1d6",
      "size": "Large (9 ft tall)",
      "move": "90 ft",
      "armorClass": 8,
      "hitDice": 2,
      "TREASURE TYPE": "See treasure",
      "attacks": 2,
      "damage": "1d8/1d8",
      "specialAttacks": "Nil",
      "specialDefenses": "Regeneration, impervious to cold, magical weapons to hit",
      "magicResistance": "Standard",
      "lairProbability": "10%",
      "intelligence": "Semi-",
      "alignment": "Chaotic evil",
      "levelXP": "2/45 + 2/hp",
      "description": "An ice troll has the general form of a troll but its cold, semi-transparent body seems to have been chiselled from blue-tinged ice. Ice trolls prefer underground dwellings such as dungeons or caverns and will always lair near running water if possible.",
      "specialAbilities": {
        "regeneration": {
          "rate": "2 hp per round",
          "limbReattachment": "Only if limb is immersed in water",
          "severedLimbs": "Move toward nearest body of water within 30 ft, will not attack independently"
        },
        "resistances": {
          "cold": "Immune to cold-based attacks",
          "fire": "Takes double damage from fire"
        },
        "weaponResistance": "Can only be hit with magical weapons",
        "senses": {
          "infravision": "90 ft",
          "smell": "Acute"
        },
        "racialTraits": {
          "strength": "Great",
          "fearless": true,
          "persistence": "Attacks until victorious or slain"
        }
      },
      "treasure": {
        "cp": {"amount": "1d10×1,000", "chance": "10%"},
        "sp": {"amount": "1d20×1,000", "chance": "20%"},
        "ep": {"amount": "1d6×1,000", "chance": "10%"},
        "gp": {"amount": "1d8×1,000", "chance": "40%"},
        "gems": {"amount": "1d12", "chance": "25%"},
        "jewellery": {"amount": "1d8", "chance": "25%"}
      }
    },
    {
      "name": "Troll, Spectral",
      "category": "Giants",
      "name_variants": "",
      "frequency": "Very rare",
      "numberAppearing": "1d2",
      "size": "Large (8 ft tall)",
      "move": "150 ft",
      "armorClass": 2,
      "hitDice": "5 + 5",
      "TREASURE TYPE": "See treasure",
      "attacks": 3,
      "damage": "1d6/1d3/1d3",
      "specialAttacks": "Strength point drain",
      "specialDefenses": "Regeneration, invulnerable to cold, magical weapons to hit, invisibility",
      "magicResistance": "30%",
      "lairProbability": "Nil",
      "intelligence": "Very",
      "alignment": "Chaotic evil",
      "levelXP": "6/625 + 6/hp",
      "description": "Long ago these creatures were created in some bizarre and perverted arcane ritual merging the life essences of a troll and some extra-planar creature. Spectral trolls are invisible. Anyone able to see invisible will see a monster that appears very much like a shorter-than-normal troll with somewhat indistinct features and glowing amber eyes.",
      "specialAbilities": {
        "invisibility": "Permanently invisible",
        "regeneration": {
          "rate": "3 hp per round",
          "limbReattachment": true,
          "severedLimbs": "Continue to attack independently"
        },
        "resistances": {
          "cold": "Impervious to cold and cold-based attacks",
          "fire": "Takes damage that does not regenerate"
        },
        "weaponResistance": "Can only be hit by magical weapons",
        "specialAttacks": {
          "claws": {
            "damage": "1d3",
            "strengthDrain": "1d3 points from strength score",
            "recovery": "1 point per 2d4 turns",
            "effects": [
              {"strength0": "Death"},
              {"strength1-2": "Comatose until strength reaches 3+"}
            ]
          },
          "bite": {
            "damage": "1d6 plus creature's own hit point value"
          }
        },
        "senses": {
          "infravision": "120 ft (superior)",
          "smell": "Acute"
        },
        "racialTraits": {
          "strength": "Strong",
          "fearless": true,
          "persistence": "Attacks relentlessly until it kills its opponent or is itself slain"
        }
      }
    },

    {
      "name": "Turtle",
      "category": "Animal",
      "variants": [
        {
          "type": "Giant Sea",
          "frequency": "Uncommon",
          "numberAppearing": "1d3",
          "size": "Large",
          "move": "10 ft; 150 ft swimming",
          "armorClass": "2 (shell) or 5 (head and flippers)",
          "hitDice": 15,
          "TREASURE TYPE": "Nil",
          "attacks": 1,
          "damage": "4d4",
          "specialAttacks": "Overturn boats",
          "specialDefenses": "None",
          "levelXP": "7/2,400+ 20/hp"
        },
        {
          "type": "Giant Snapping",
          "frequency": "Uncommon",
          "numberAppearing": "1d4",
          "size": "Large",
          "move": "30 ft; 120 ft swimming",
          "armorClass": "0 (shell) or 5 (head and legs)",
          "hitDice": 10,
          "attacks": 1,
          "damage": "6d4",
          "specialAttacks": "Surprise on a 1-4 on d6",
          "specialDefenses": "None",
          "levelXP": "7/1,500+14/hp"
        }
      ],
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "treasure": "None",
      "description": "Giant sea turtles are normally placid but fierce when threatened. They can overturn boats (90%), small ships (50%), or even huge vessels (10%). Giant snapping turtles are aggressive predators that lie in wait in shallow waters. Their lumpy shells provide excellent camouflage, and their disproportionately long necks can snap at enemies up to 10 ft away. Both turtle types can retract vulnerable parts into their shells for protection but cannot attack or move when doing so."
    },
    {
      "name": "Unicorn",
      "category": "Monster",
      "frequency": "Rare",
      "numberAppearing": "1d4+1",
      "size": "Large",
      "move": "240 ft",
      "armorClass": 2,
      "hitDice": "4+4",
      "TREASURE TYPE": "X",
      "attacks": "3 (hoof/hoof/horn)",
      "damage": "1d6/1d6/1d12",
      "specialAttacks": "Charge",
      "specialDefenses": "Save as level 11 magic user; immune to charm, hold, death magic, and poison; never surprised within 240 ft; surprise 1-5 on d6; dimension door 1/day (360 ft range)",
      "magicResistance": "Standard",
      "lairProbability": "5%",
      "intelligence": "Average",
      "alignment": "Chaotic good",
      "levelXP": "5/440 + 4 per hit point",
      "treasure": {
        "gems": {"amount": "20d4", "chance": "50%"},
        "magic_items": {"amount": "1 misc. magic item and 1 potion", "chance": "60%"}
      },
      "description": "Unicorns avoid most beings but may assist pure-hearted maidens, allowing themselves to be ridden. They charge into battle for double horn damage on initial attack. Their horn neutralizes poison with a touch."
    },
    {
      "name": "Vampire",
      "category": "Undead",
      "turnResistance": 10,
      "frequency": "Rare",
      "numberAppearing": "1d4",
      "size": "Man-sized",
      "move": "120 ft; 180 ft flying (AA:V)",
      "armorClass": 1,
      "hitDice": "8+3",
      "TREASURE TYPE": "F",
      "attacks": "1",
      "damage": "1d6+4",
      "specialAttacks": "Level drain, charm gaze, summon creatures",
      "specialDefenses": "Regeneration; gaseous form; immune to normal weapons, charm, sleep, hold, cold, electricity; affected only by magical/sacred means",
      "magicResistance": "See below",
      "lairProbability": "25%",
      "intelligence": "Exceptional",
      "alignment": "Chaotic evil",
      "levelXP": "8/3,810 +12/hp",
      "treasure": {
        "sp": {"amount": "1d20×1,000", "chance": "10%"},
        "ep": {"amount": "1d12×1,000", "chance": "10%"},
        "gp": {"amount": "1d10×1,000", "chance": "40%"},
        "pp": {"amount": "1d8×100", "chance": "35%"},
        "gems": {"amount": "3d10", "chance": "20%"},
        "jewellery": {"amount": "1d10", "chance": "10%"},
        "magic_items": {"amount": "3", "chance": "30%"}
      },
      "description": "Vampires are powerful undead with immense strength (18.76). Their touch drains two levels. They can assume gaseous form, shape-change into a bat, and summon creatures (rats, bats, wolves). Their charm gaze imposes a -2 save penalty. They recoil from garlic, mirrors, and holy symbols, and are destroyed by sunlight, running water, staking and decapitation. They regenerate 3 hp/round and create new vampires from drained victims."
    },
    {
      "name": "Walrus",
      "category": "Animal",
      "frequency": "Uncommon",
      "numberAppearing": "3d6",
      "size": "Large",
      "move": "60 ft; 180 ft swimming",
      "armorClass": 5,
      "hitDice": 6,
      "TREASURE TYPE": "See treasure",
      "attacks": 3,
      "damage": "1d6/1d6/2d12",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "20%",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "levelXP": "4/160 + 6/hp",
      "treasure": "The ivory tusks of this animal can be sold for 1d4+1×100 gp on the market.",
      "description": "Walruses are large, flippered marine mammals with long ivory tusks. Territorial and aggressive, they become more dangerous in groups. The largest males can weigh up to 4,400 lbs. They attack with clawed front flippers and tusks. Males primarily defend the herd, though females (also tusked) will fight if necessary."
    },
    {
      "name": "Water Weird",
      "category": "Extraplanar",
      "frequency": "Very rare",
      "numberAppearing": "1-3",
      "size": "Large (10'+ long)",
      "move": "120 ft",
      "armorClass": 4,
      "hitDice": "3+3",
      "TREASURE TYPE": "I, Q, P, Y",
      "attacks": 0,
      "damage": "Nil",
      "specialAttacks": "Drowning",
      "specialDefenses": "See below",
      "magicResistance": "Standard",
      "lairProbability": "50%",
      "intelligence": "Very",
      "alignment": "Chaotic evil",
      "levelXP": "3/100+3/hp",
      "treasure": "I, O, P, Y",
      "description": "Water weirds originate from the elemental plane of water. They form a serpentine shape from water in two melee rounds and strike as 6 HD monsters. Victims must save vs. paralyzation or be dragged into water. Sharp weapons cause only 1 hp damage while blunt weapons do normal damage. Disrupting a weird (damage equal to total hp) only delays it for 2 rounds before reforming. Cold spells slow it, fire spells do half/no damage, but purify water kills it. A water weird can take over a water elemental on a roll of 11+ on d20."
    },
    {
      "name": "Wasp, Giant",
      "category": "Insect",
      "frequency": "Rare",
      "numberAppearing": "1-20",
      "size": "Medium",
      "move": "60 ft/210 ft flying",
      "armorClass": 4,
      "hitDice": 4,
      "TREASURE TYPE": "Q (x20)",
      "attacks": 2,
      "damage": "2-8/1-4",
      "specialAttacks": "Poison",
      "specialDefenses": "Nil",
      "magicResistance": "Standard",
      "lairProbability": "25%",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": "3/120+4/hp",
      "treasure": "Q (x20)",
      "description": "Giant wasps are feared hunters that prey on other creatures both for food and as hosts for their eggs. They attack with powerful jaws (2-8 damage) and a poisonous stinger (1-4 damage). Victims stung must save versus poison or become permanently paralyzed, dying in 2-5 days unless treated with neutralize poison or antidote. During this period, paralyzed victims are typically eaten by wasp larvae. While some giant wasps build mud nests, those building paper nests are most dangerous, as their lairs contain 21-40 adults. Their wings are highly vulnerable to fire - exposure to flames renders them flightless but doesn't otherwise harm them."
    },
    {
      "name": "Werebear",
      "category": "Lycanthrope",
      "frequency": "Rare",
      "numberAppearing": "1d4",
      "size": "Large",
      "move": "90 ft",
      "armorClass": 2,
      "hitDice": "7+3",
      "TREASURE TYPE": "R, T, X",
      "attacks": 3,
      "damage": "1d3/1d3/2d8",
      "specialAttacks": "Hug for 2d16 on 18-20",
      "specialDefenses": "Hit only by silver or +1 or better magic weapons",
      "magicResistance": "Standard",
      "lairProbability": "10%",
      "intelligence": "Exceptional",
      "alignment": "Chaotic good",
      "levelXP": "7/1,250+10/hp",
      "description": "Great werebears are the most powerful of all lycanthropes. 50% likely to be in company with 1-6 brown bears. Can summon 1-6 brown bears in 2-12 turns if within one mile. Heal wounds at three times normal rate, immune to disease, can cure disease in others in 1-4 weeks.",
      "treasure": {
        "individual": "Nil",
        "lair": {
          "gold": "2d4×1,000 (40%)",
          "platinum": "10d6×100 (50%)",
          "gems": "4d8 (55%)",
          "jewellery": "1d12 (45%)",
          "scrolls": "1d4 (50%)",
          "miscMagic": "1 misc magic + 1 potion (60%)"
        }
      }
    },
    {
      "name": "Wereboar",
      "category": "Lycanthrope",
      "frequency": "Rare",
      "numberAppearing": "2d4",
      "size": "Large",
      "move": "120 ft",
      "armorClass": 4,
      "hitDice": "5+2",
      "TREASURE TYPE": "B, S",
      "attacks": 1,
      "damage": "2d12",
      "specialAttacks": "Nil",
      "specialDefenses": "Hit only by silver or +1 or better magic weapons",
      "magicResistance": "Standard",
      "lairProbability": "20%",
      "intelligence": "Average",
      "alignment": "Neutral evil",
      "levelXP": "5/275+6/hp",
      "description": "Found in dense woodlands, wereboars are of ugly temper and likely to attack. In human form they are hot tempered and irascible with typical berserker nature. 15% chance to mingle with normal boars.",
      "treasure": {
        "individual": "1d8×1,000 cp (50%), 1d6×1,000 sp (25%), 1d4×1,000 ep (25%), 1d3×1,000 gp (25%)",
        "lair": {
          "scrolls": "2d4 potions (40%)"
        }
      }
    },
    {
      "name": "Wererat",
      "category": "Lycanthrope",
      "frequency": "Uncommon",
      "numberAppearing": "4d6",
      "size": "Small to Medium",
      "move": "120 ft",
      "armorClass": 6,
      "hitDice": "3+1",
      "TREASURE TYPE": "C",
      "attacks": 1,
      "damage": "1d8 (sword)",
      "specialAttacks": "Surprise on 1-4",
      "specialDefenses": "Hit only by silver or +1 or better magic weapons",
      "magicResistance": "Standard",
      "lairProbability": "30%",
      "intelligence": "Very",
      "alignment": "Lawful evil",
      "levelXP": "3/65+4/hp",
      "description": "Sometimes known as ratmen, these sly creatures inhabit subterranean tunnel complexes beneath cities. Can take three forms: human, human-sized ratman, and giant rat. Use human form to dupe humans. Can summon and control 2d12 giant rats.",
      "treasure": {
        "cp": "1d12×1,000 (20%)",
        "sp": "1d6×1,000 (30%)",
        "ep": "1d4×1,000 (10%)",
        "gems": "1d6 (25%)",
        "jewellery": "1d3 (20%)",
        "magicItems": "any 2 magic items (10%)"
      }
    },
    {
      "name": "Weretiger",
      "category": "Lycanthrope",
      "frequency": "Very rare",
      "numberAppearing": "1d6",
      "size": "Large",
      "move": "120 ft",
      "armorClass": 3,
      "hitDice": "6+2",
      "TREASURE TYPE": "D, Q (x5)",
      "attacks": 3,
      "damage": "1d4/1d4/1d12",
      "specialAttacks": "Rake for 2d5/2d5",
      "specialDefenses": "Hit only by silver or +1 or better magic weapons",
      "magicResistance": "Standard",
      "lairProbability": "15%",
      "intelligence": "Average",
      "alignment": "Neutral",
      "levelXP": "6/570+8/hp",
      "description": "Similar to normal tigers in habitat, most often female. Only 5% likely to mingle with normal cats. Can speak with all sorts of cats, and cats are 75% likely to be friendly due to this ability.",
      "treasure": {
        "individual": "1d8×1,000 cp (10%), 1d12×1,000 sp (15%), 1d8×1,000 ep (15%), 1d6×1,000 gp (50%)",
        "lair": {
          "gems": "10d8 (90%)",
          "jewellery": "5d6 (80%)",
          "magicItems": "1 of each magic excluding potions & scrolls (70%)"
        }
      }
    },
    {
      "name": "Werewolf",
      "category": "Lycanthrope",
      "frequency": "Common",
      "numberAppearing": "3d6",
      "size": "Medium",
      "move": "150 ft",
      "armorClass": 5,
      "hitDice": "4+3",
      "TREASURE TYPE": "C",
      "attacks": 1,
      "damage": "2d8",
      "specialAttacks": "Surprise on 1-3",
      "specialDefenses": "Hit only by silver or +1 or better magic weapons",
      "magicResistance": "Standard",
      "lairProbability": "25%",
      "intelligence": "Average",
      "alignment": "Chaotic evil",
      "levelXP": "4/125+5/hp",
      "description": "Very difficult to detect in human form. Prone to retain bipedal form in wolf state. Packs of 5-8 are family groups with male, female, and 3-6 young. Male fights at +2 to hit if female attacked, female at +3 if young attacked. Young fight at -4 to -1 to hit based on maturity.",
      "treasure": {
        "cp": "1d12×1,000 (20%)",
        "sp": "1d6×1,000 (30%)",
        "ep": "1d4×1,000 (10%)",
        "gems": "1d6 (25%)",
        "jewellery": "1d3 (20%)",
        "magicItems": "any 2 magic items (10%)"
      }
    },
    {
      "name": "Weasel",
      "category": "Animal",
      "variants": [
        {
          "type": "Huge",
          "frequency": "Uncommon",
          "numberAppearing": "2d6",
          "size": "Small",
          "move": "150 ft",
          "armorClass": 7,
          "hitDice": "1+1",
          "TREASURE TYPE": "See treasure",
          "attacks": 1,
          "damage": "1d8",
          "specialAttacks": "Blood drain",
          "specialDefenses": "None",
          "levelXP": "2/40+2/hp"
        },
        {
          "type": "Giant",
          "frequency": "Rare",
          "numberAppearing": "1d8",
          "size": "Medium",
          "move": "150 ft",
          "armorClass": 6,
          "hitDice": "3+3",
          "TREASURE TYPE": "See treasure",
          "attacks": 1,
          "damage": "2d6",
          "specialAttacks": "Blood drain",
          "specialDefenses": "None",
          "levelXP": "3/75+3/hp"
        }
      ],
      "magicResistance": "Standard",
      "lairProbability": "10%",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "treasure": "Huge weasel pelts sell for 1d6×100 gp, giant weasel pelts for twice that amount or more.",
      "description": "Huge and giant weasels typically inhabit forests, though some may be found in dungeons. After a successful bite attack, they drain blood continuously (1d8 hp per round for huge weasels, 2d6 hp per round for giant weasels). Their pelts are valuable."
    },
    {
      "name": "Whale",
      "category": "Animal",
      "frequency": "Common",
      "numberAppearing": "1d8",
      "size": "Large",
      "move": "180 ft to 240 ft swimming",
      "armorClass": 4,
      "hitDice": "12 to 36",
      "TREASURE TYPE": "See treasure",
      "attacks": "1 bite or 1 tail",
      "damage": "5-15 d4 (bite), 1-5 d8 (tail)",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Low",
      "alignment": "Neutral",
      "levelXP": "Varies according to hit dice",
      "treasure": "Whale ambergris from a single whale is worth 1d20×1,000 gp. Whale meat is worth 100 gp per hit die. Additionally, 1% chance each of finding cp, sp, ep, pp, gems, jewellery, and magic items in stomach.",
      "description": "Whales vary considerably in size between species. Larger specimens can swallow prey whole, with digestive juices causing 1 hp damage per turn. Whales will disgorge prey that attack from inside, though possibly in deep water where escape is difficult."
    },
    {
      "name": "Wight",
      "category": "Undead",
      "turnResistance": 5,
      "frequency": "Uncommon",
      "numberAppearing": "2d8",
      "size": "Man-sized",
      "move": "120 ft",
      "armorClass": 5,
      "hitDice": "4+3",
      "TREASURE TYPE": "B",
      "attacks": "1 (claw)",
      "damage": "1d4 + level drain",
      "specialAttacks": "Level drain",
      "specialDefenses": "Silver or magic weapon required to hit; spell immunities",
      "magicResistance": "Standard",
      "lairProbability": "70%",
      "intelligence": "Average",
      "alignment": "Lawful evil",
      "levelXP": "6/590 +4/hp",
      "treasure": {
        "cp": {"amount": "1d8×1,000", "chance": "50%"},
        "sp": {"amount": "1d6×1,000", "chance": "25%"},
        "ep": {"amount": "1d4×1,000", "chance": "25%"},
        "gp": {"amount": "1d3×1,000", "chance": "25%"},
        "gems": {"amount": "1d8", "chance": "30%"},
        "jewellery": {"amount": "1d4", "chance": "20%"},
        "magic_items": {"amount": "1", "chance": "10%"}
      },
      "description": "Wights are undead corpses with twisted intelligence. Their touch drains one level of experience permanently. Although not harmed by sunlight, they avoid daylight. Immune to sleep, hold, cold, and enchantment spells. Holy water deals 2d4 damage per vial, and raise dead destroys them. Victims they kill become wights under their control."
    },
    {
      "name": "Will-O-(The)-Wisp",
      "category": "Monster",
      "name_variants": "Will-o'-Wisp, Will-o-Wisp, Will-o-wisp",
      "frequency": "Uncommon",
      "numberAppearing": "1 (or 1-3)",
      "size": "Small",
      "move": "180 ft",
      "armorClass": -8,
      "hitDice": 9,
      "TREASURE TYPE": "Z",
      "attacks": 1,
      "damage": "2-16",
      "specialAttacks": "See below",
      "specialDefenses": "See below",
      "magicResistance": "See below",
      "lairProbability": "5%",
      "intelligence": "Exceptional",
      "alignment": "Chaotic evil",
      "levelXP": "6/900+12/hp",
      "treasure": "Z",
      "description": "Will-o-wisps haunt dangerous places like bogs and catacombs, luring victims to hazards to feed on their life force. Their electrical attack causes 2-16 damage. They can glow brightly or dimly to confuse prey, and can extinguish their glow entirely for 2-8 rounds (detectable only by see invisible). Most spells don't affect them except protection from evil, magic missile, and maze. If reduced to 5 or fewer hp, they reveal their lair and surrender treasure. They appear as glowing spheres resembling lanterns or torches, glowing blue, violet, or pale green in combat."
    },
    {
      "name": "Wind Walker",
      "category": "Extraplanar",
      "frequency": "Rare",
      "numberAppearing": "1-3",
      "size": "Large",
      "move": "150 ft/300 ft",
      "armorClass": 7,
      "hitDice": "6+3",
      "TREASURE TYPE": "C, R",
      "attacks": "See below",
      "damage": "3-18",
      "specialAttacks": "See below",
      "specialDefenses": "See below",
      "magicResistance": "See below",
      "lairProbability": "20%",
      "intelligence": "Very",
      "alignment": "Neutral",
      "levelXP": "5/350+6/hp",
      "treasure": "C, R",
      "description": "Wind walkers are air elementals that inhabit high mountains or deep caverns. Their approach can be detected at 100-300 ft as whistling, howling, or roaring sounds. They are telepathic, detecting thoughts at 100-300 ft by working in series. They attack with wind force, causing 3-18 damage per turn to all creatures within 10 ft. Being ethereal, they can only be fought by certain creatures (djinn, efreet, invisible stalkers, aerial servants) or affected by specific spells: control weather (kills if save fails), slow (damages like fireball), ice storm (drives away 1-4 rounds). Haste does half damage but doubles their damage output. Magical barriers stop them, but they pursue for 2-5 rounds minimum."
    },
    {
      "name": "Wolf",
      "category": "Animal",
      "variants": [
        {
          "type": "Normal",
          "frequency": "Common",
          "numberAppearing": "3d10",
          "size": "Small",
          "move": "180 ft",
          "armorClass": 7,
          "hitDice": "2+2",
          "TREASURE TYPE": "Nil",
          "attacks": 1,
          "damage": "1d4+1",
          "specialAttacks": "None",
          "specialDefenses": "None",
          "levelXP": "2/50 + 2/hp"
        },
        {
          "type": "Dire",
          "frequency": "Rare",
          "numberAppearing": "3d4",
          "size": "Medium",
          "move": "180 ft",
          "armorClass": 6,
          "hitDice": "3+3",
          "TREASURE TYPE": "Nil",
          "attacks": 1,
          "damage": "2d4",
          "specialAttacks": "None",
          "specialDefenses": "None",
          "levelXP": "3/75+3/hp"
        },
        {
          "type": "Winter",
          "frequency": "Very Rare",
          "numberAppearing": "2d4",
          "size": "Medium",
          "move": "180 ft",
          "armorClass": 5,
          "hitDice": "5",
          "TREASURE TYPE": "Pelt is 5,000 gp",
          "attacks": 1,
          "damage": "2d4",
          "specialAttacks": "6d4 10 frost breath attack",
          "specialDefenses": "Immune to cold attacks",
          "levelXP": "5/205+5/hp"
        }
      ],
      "magicResistance": "Standard",
      "lairProbability": "10%",
      "intelligence": "Semi-",
      "alignment": "Neutral",
      "treasure": "None",
      "description": "Wolves are pack hunters (up to 30), standing 26-30 inches tall at the shoulder with males weighing 80-100 lbs. Their howling may panic horses and other herbivores (50% chance). Packs encircle prey, preferring to attack from behind, and often (75%) follow potential prey waiting for an opportune moment. Dire wolves are massive prehistoric ancestors with similar hunting tactics."
    },
    {
      "name": "Wolverine",
      "category": "Animal",
      "variants": [
        {
          "type": "Normal",
          "frequency": "Uncommon",
          "numberAppearing": "1",
          "size": "Small",
          "move": "120 ft",
          "armorClass": 5,
          "hitDice": 3,
          "attacks": 3,
          "damage": "1d4/1d4/1d4+1",
          "specialAttacks": "Musk, +4 to hit",
          "specialDefenses": "None",
          "levelXP": "3/125+2/hp"
        },
        {
          "type": "Giant",
          "frequency": "Rare",
          "numberAppearing": "1",
          "size": "Medium",
          "move": "150 ft",
          "armorClass": 4,
          "hitDice": "4+4",
          "attacks": 3,
          "damage": "1d6/1d6/2d4",
          "specialAttacks": "Musk, +4 to hit",
          "specialDefenses": "None",
          "levelXP": "4/235+4/hp"
        }
      ],
      "magicResistance": "Standard",
      "lairProbability": "15%",
      "intelligence": "Semi-",
      "alignment": "Neutral Evil",
      "TREASURE TYPE": "Nil",
      "treasure": "None",
      "description": "Wolverines are deadly predators resembling a cross between huge weasels and small bears. These cold-weather hunters spray musk in a 60 ft cone, requiring a save vs poison or causing blindness for 1d8 hours. Regardless of save, victims within the musk cloud have Strength and Dexterity effectively halved. Their savagery and speed grants them +4 on attacks. They are intelligent enough to set ambushes and to have evil alignment."
    },
    {
      "name": "Worg",
      "category": "Animal",
      "frequency": "Rare",
      "numberAppearing": "3d4",
      "size": "Large",
      "move": "180 ft",
      "armorClass": 6,
      "hitDice": "4+4",
      "TREASURE TYPE": "Nil",
      "attacks": "1 bite",
      "damage": "2d4",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "10%",
      "intelligence": "Low",
      "alignment": "Neutral evil",
      "levelXP": "3/75+3/hp",
      "treasure": "None",
      "description": "Worgs are evil wolves of great size, standing 4-5 ft tall at the shoulder and weighing 600-700 lbs. They speak their own language and often cooperate with goblin tribes."
    },
    
    {
      "name": "Wraith",
      "category": "Undead",
      "turnResistance": 7,
      "frequency": "Uncommon",
      "numberAppearing": "2d6",
      "size": "Man-sized",
      "move": "120 ft; 240 ft flying (AA:IV)",
      "armorClass": 4,
      "hitDice": "5+3",
      "TREASURE TYPE": "E",
      "attacks": "1",
      "damage": "1d6 + level drain",
      "specialAttacks": "Level drain",
      "specialDefenses": "Only hit by silver or magic weapons; immune to cold, charm, sleep, hold",
      "magicResistance": "Standard",
      "lairProbability": "25%",
      "intelligence": "Very",
      "alignment": "Lawful evil",
      "levelXP": "6/550 +6/hp",
      "treasure": {
        "cp": {"amount": "1d10×1,000", "chance": "5%"},
        "sp": {"amount": "1d12×1,000", "chance": "25%"},
        "ep": {"amount": "1d6×1,000", "chance": "25%"},
        "gp": {"amount": "1d8×1,000", "chance": "25%"},
        "gems": {"amount": "1d12", "chance": "15%"},
        "jewellery": {"amount": "1d8", "chance": "10%"},
        "magic_items": {"amount": "3 + 1 scroll", "chance": "25%"}
      },
      "description": "Wraiths are shadowy undead partially existing in the negative material plane. Their touch drains one level of experience (except in sunlight). Silver weapons do half damage, magical weapons do full damage. They are immune to cold, charm, sleep, and hold spells."
    },
    {
      "name": "Wyvern",
      "category": "Dragon",
      "frequency": "Uncommon",
      "numberAppearing": "1-6",
      "size": "Large (35' long)",
      "move": "60 ft/240 ft flying",
      "armorClass": 3,
      "hitDice": "7+7",
      "TREASURE TYPE": "E",
      "attacks": 2,
      "damage": "2-16/1-4",
      "specialAttacks": "Poison",
      "specialDefenses": "Nil",
      "magicResistance": "Standard",
      "lairProbability": "30%",
      "intelligence": "Low",
      "alignment": "Neutral (evil)",
      "levelXP": "6/800+10/hp",
      "treasure": "E",
      "description": "Wyverns are distant dragon relatives that inhabit similar environments - tangled forests and great caverns. Despite low intelligence, they're highly aggressive and always attack. Their primary weapons are a powerful bite (2-16 damage) and a stinger-equipped tail that can reach over their back to strike. The tail's poison kills unless a saving throw is made, and even with a successful save it inflicts 1-6 damage. They appear dark brown to gray with orange or red eyes."
    },
    {
      "name": "Zombie",
      "name_variants": "Normal",
      "category": "Undead",
      "turnResistance": 2,
      "frequency": "Rare",
      "numberAppearing": "3d8",
      "size": "Man-sized",
      "move": "60 ft",
      "armorClass": 8,
      "hitDice": "2",
      "TREASURE TYPE": "Nil",
      "attacks": "1",
      "damage": "1d8",
      "specialAttacks": "None",
      "specialDefenses": "See below",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": "2/30+1/hp",
      "treasure": "None",
      "description": "Zombies are animated corpses that attack last in each round regardless of initiative. Once engaged, they never flee unless turned. Immune to enchantments, hold spells, and cold-based magic."
    },
    {
      "name": "Zombie, Juju",
      "category": "Undead",
      "turnResistance": 9,
      "frequency": "Very rare",
      "numberAppearing": "1d6",
      "size": "Man-sized",
      "move": "90 ft",
      "armorClass": 6,
      "hitDice": "3+12",
      "TREASURE TYPE": "Nil",
      "attacks": "1",
      "damage": "2d6+1",
      "specialAttacks": "See below",
      "specialDefenses": "Can only be hit with magic weapons",
      "magicResistance": "See below",
      "lairProbability": "Nil",
      "intelligence": "Low",
      "alignment": "Neutral (evil)",
      "levelXP": "3/115 +4/hp",
      "treasure": "None",
      "description": "Juju zombies are created through forbidden necromancy, draining all life force from victims. They move faster than regular zombies, have thief-like climbing abilities, attack as 6 HD monsters, and can use missile weapons. They can only be hit by magic weapons (piercing/blunt do half damage)."
    },
    // =============================================
    // NEW MONSTERS — Wave 1: Core Dungeon
    // =============================================
    {
      "name": "Stirge",
      "category": "Monster",
      "frequency": "Uncommon",
      "numberAppearing": "3d10",
      "size": "Small",
      "move": "30 ft / 180 ft (flying)",
      "armorClass": 8,
      "hitDice": "1+1",
      "attacks": 1,
      "damage": "1d3",
      "specialAttacks": "Blood drain (1d4 hp/round after attachment, detaches after 12 hp drained); attacks as 4 HD creature",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "60%",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "levelXP": "1/28+1/hp",
      "TREASURE TYPE": "D",
      "treasure": "D",
      "description": "Blood-draining flying predators found in dark forests and subterranean lairs. Attacks as a 4 HD creature. On hit, attaches proboscis for 1-3 damage, then drains 1-4 hp per round until 12 hp consumed. Can only be detached by killing it."
    },
    {
      "name": "Piercer",
      "category": "Monster",
      "frequency": "Uncommon",
      "numberAppearing": "3d6",
      "size": "Small to Medium",
      "move": "10 ft",
      "armorClass": 3,
      "hitDice": "1-4 (variable)",
      "attacks": 1,
      "damage": "Variable by HD: 1 HD=1d6, 2 HD=2d6, 3 HD=3d6, 4 HD=4d6",
      "specialAttacks": "95% chance to surprise; drops from ceiling",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "0%",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": "1/14+1/hp",
      "TREASURE TYPE": "Nil",
      "treasure": "Nil",
      "description": "Stalactite-like subterranean ambush predators. Indistinguishable from normal stalactites, attracted by noise and heat. Drop from cave roofs onto prey below. Size and damage scale with HD (equal probability of 1-4 HD). Largest specimens reach 6 ft long, 500 lbs."
    },
    {
      "name": "Gas Spore",
      "category": "Plant",
      "frequency": "Rare",
      "numberAppearing": "1d3",
      "size": "Large",
      "move": "30 ft",
      "armorClass": 9,
      "hitDice": "1 hp",
      "attacks": 1,
      "damage": "Explosion: 6d6 in 20 ft radius (3d6 on save vs. wands)",
      "specialAttacks": "Explodes if struck for any damage; contact infects with lethal spores (cure disease within 24 hrs or death, victim sprouts 2-8 new gas spores)",
      "specialDefenses": "90% mistaken for beholder at >10 ft; 25% at close range",
      "magicResistance": "Standard",
      "lairProbability": "0%",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "levelXP": "1/14",
      "TREASURE TYPE": "Nil",
      "treasure": "Nil",
      "description": "A beholder-like floating fungus with false central eye and rhizome growths resembling eyestalks. Has only 1 hit point. Any damage causes immediate explosion affecting all within 20 ft radius for 6-36 damage (half on save vs. wands). Contact with exposed flesh injects rhizomes; victim dies in 24 hours without cure disease, sprouting 2-8 new gas spores."
    },
    {
      "name": "Owlbear",
      "category": "Monster",
      "frequency": "Rare",
      "numberAppearing": "2d4+1",
      "size": "Large (8' tall)",
      "move": "120 ft",
      "armorClass": 5,
      "hitDice": "5+2",
      "attacks": 3,
      "damage": "1d6/1d6/2d6",
      "specialAttacks": "Hug (2d8 additional damage per round if forelimb hits on natural 18+, continues until owlbear killed)",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "30%",
      "intelligence": "Low",
      "alignment": "Neutral",
      "levelXP": "5/225+5/hp",
      "TREASURE TYPE": "C",
      "treasure": "C",
      "description": "Savage forest and subterranean predators, likely the result of magical experimentation. Attack on sight and fight to the death. Claw/claw/bite; if either forelimb scores 18+ (and roll hits target AC), victim is dragged in for additional 2-16 hug damage each round until owlbear dies. Lair may contain 1-6 eggs (20%) or young (80%)."
    },
    {
      "name": "Displacer Beast",
      "category": "Monster",
      "frequency": "Very rare",
      "numberAppearing": "2d4+1",
      "size": "Large",
      "move": "150 ft",
      "armorClass": 4,
      "hitDice": "6",
      "attacks": 2,
      "damage": "2d4/2d4",
      "specialAttacks": "None",
      "specialDefenses": "Displacement (-2 on opponent attack rolls, +2 on own saving throws)",
      "magicResistance": "Saves as 12th-level fighter",
      "lairProbability": "25%",
      "intelligence": "Semi-",
      "alignment": "Neutral",
      "levelXP": "6/400+6/hp",
      "TREASURE TYPE": "D",
      "treasure": "D",
      "description": "Panther-like predator with two tentacles. Molecular vibrations cause it to appear 3 ft from its actual position. Opponents subtract 2 from attack rolls; beast adds 2 to saving throws. Packs contain only full-grown beasts. Particularly hates blink dogs."
    },
    {
      "name": "Leucrotta",
      "category": "Monster",
      "frequency": "Uncommon",
      "numberAppearing": "1d4",
      "size": "Large",
      "move": "180 ft",
      "armorClass": 4,
      "hitDice": "6+1",
      "attacks": 1,
      "damage": "3d6",
      "specialAttacks": "Voice mimicry to lure prey",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "25%",
      "intelligence": "Low",
      "alignment": "Chaotic Evil",
      "levelXP": "6/475+6/hp",
      "TREASURE TYPE": "D",
      "treasure": "D",
      "description": "A grotesque beast with the body of a stag, tail of a lion, and cloven hooves. Instead of teeth it has sharp bony ridges that can inflict terrible wounds. Can mimic human and demihuman voices to lure prey into ambushes. Very fast and aggressive."
    },
    {
      "name": "Su-Monster",
      "category": "Monster",
      "frequency": "Rare",
      "numberAppearing": "1d12",
      "size": "Medium",
      "move": "120 ft",
      "armorClass": 6,
      "hitDice": "5+5",
      "attacks": 5,
      "damage": "1d4/1d4/1d4/1d4/2d4",
      "specialAttacks": "Psionic attack (psychic crush)",
      "specialDefenses": "Psionic defense",
      "magicResistance": "Standard",
      "lairProbability": "10%",
      "intelligence": "Average",
      "alignment": "Chaotic Neutral",
      "levelXP": "5/300+5/hp",
      "TREASURE TYPE": "Nil (V in lair)",
      "treasure": "V (in lair)",
      "psionics": "120",
      "description": "Grey-furred primates with prehensile tails found in dense forests and subterranean areas. Attack with all four claws and bite while hanging by tail. Possess psionic ability and attack with psychic crush. Highly aggressive and territorial."
    },
    {
      "name": "Succubus",
      "category": "Demons",
      "frequency": "Rare",
      "numberAppearing": "1",
      "size": "Medium (6' tall)",
      "move": "120 ft; 180 ft flying",
      "armorClass": 0,
      "hitDice": 6,
      "TREASURE TYPE": "I, Q",
      "attacks": "2 claws",
      "damage": "1d3/1d3",
      "specialAttacks": "Energy drain (kiss drains 1 level); darkness 5 ft radius; charm person; ESP; clairaudience; suggestion; gate type IV demon (70%), type VI (25%), or demon lord (5%) — 40% chance of gate opening",
      "specialDefenses": "+1 or better weapon to hit",
      "magicResistance": "70%",
      "lairProbability": "5%",
      "intelligence": "Exceptional",
      "alignment": "Chaotic evil",
      "levelXP": "6/1,200+8/hp",
      "psionicAbility": 200,
      "description": "Female demons that prefer to act alone. In natural form appears as a tall, very beautiful human female with bat-like wings. Can become ethereal, shape change to any humanoid form of similar height and weight. Rules lower demons through wit and threat."
    },
    {
      "name": "Beholder",
      "category": "Monster",
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Large (4-6 ft diameter)",
      "move": "30 ft",
      "armorClass": "0 (body), 2 (eyestalks), 7 (eyes)",
      "hitDice": "45-75 hp",
      "attacks": 1,
      "damage": "2d4",
      "specialAttacks": "Eye rays: 1-Charm Person, 2-Charm Monster, 3-Sleep, 4-Telekinesis (2500 gp wt), 5-Flesh to Stone (3 in range), 6-Disintegrate (2 in range), 7-Fear (as wand), 8-Slow, 9-Cause Serious Wounds (5 in range), 10-Death Ray (4 in range)",
      "specialDefenses": "Central eye anti-magic ray (14 in range); body takes 2/3 hp, central eye takes 1/3 hp; eyestalks take 8-12 hp each and regrow in 1 week",
      "magicResistance": "Special (anti-magic ray)",
      "lairProbability": "80%",
      "intelligence": "Exceptional",
      "alignment": "Lawful Evil",
      "levelXP": "10/14000",
      "TREASURE TYPE": "I, S, T",
      "treasure": "I, S, T",
      "description": "The eye tyrant is a floating sphere with a central eye, large fanged mouth, and 10 eyestalks. Levitates at will. Central eye projects anti-magic ray. Each eyestalk has a different magical power. Frontal 90 degree arc allows central eye plus 1-4 stalks; wider arcs allow more. Attacks from above allow all stalks but not central eye. Hateful, aggressive, and avaricious."
    },
    {
      "name": "Mind Flayer",
      "category": "Monster",
      "frequency": "Rare",
      "numberAppearing": "1d4",
      "size": "Medium",
      "move": "120 ft",
      "armorClass": 5,
      "hitDice": "8+4",
      "attacks": 4,
      "damage": "2/2/2/2",
      "specialAttacks": "Mind blast (6 in cone); tentacle brain extraction (kills in 1-4 rounds after hit)",
      "specialDefenses": "None",
      "magicResistance": "90%",
      "lairProbability": "50%",
      "intelligence": "Genius",
      "alignment": "Lawful Evil",
      "levelXP": "8/4000+12/hp",
      "TREASURE TYPE": "B, S, T, X",
      "treasure": "B, S, T, X",
      "psionics": "241-340 (Attack: B / Defense: F,G,H)",
      "description": "Subterranean psionic predators that consider humanity as cattle. Four tentacles strike for 2 damage each; a hit reaches the brain in 1-4 rounds and extracts it, killing instantly. Mind blast affects a 6 in cone. Innate psionic abilities include levitation, domination, ESP, body equilibrium, astral projection, and probability travel at 7th-level mastery. Flees immediately if losing."
    },
    {
      "name": "Intellect Devourer",
      "category": "Monster",
      "frequency": "Very rare",
      "numberAppearing": "1d4",
      "size": "Small",
      "move": "150 ft",
      "armorClass": 4,
      "hitDice": "6+6",
      "attacks": 4,
      "damage": "1d4/1d4/1d4/1d4",
      "specialAttacks": "Psionic attacks; inhabits victim's body after killing",
      "specialDefenses": "Can only be hit by magic weapons; immune to all spells except protection from evil, fireball, and lightning bolt (latter two drive it to astral plane)",
      "magicResistance": "Special",
      "lairProbability": "75%",
      "intelligence": "Exceptional",
      "alignment": "Chaotic Evil",
      "levelXP": "6/1100+8/hp",
      "TREASURE TYPE": "B",
      "treasure": "B",
      "psionics": "200+",
      "description": "Brain-shaped creatures on bestial legs that lurk underground, stalking intelligent prey. Attack with claws and powerful psionic abilities. After killing a victim psionically, they consume the brain and inhabit the body. Vulnerable only to magic weapons; most spells have no effect. Fireball or lightning bolt drives them to the astral plane."
    },
    {
      "name": "Umber Hulk",
      "category": "Monster",
      "frequency": "Rare",
      "numberAppearing": "1d4",
      "size": "Large (8' tall, 5' wide)",
      "move": "60 ft (10-60 ft burrowing)",
      "armorClass": 2,
      "hitDice": "8+8",
      "attacks": 3,
      "damage": "3d4/3d4/2d10",
      "specialAttacks": "Confusion gaze (save vs. magic or confused 3-12 rounds)",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "30%",
      "intelligence": "Average",
      "alignment": "Chaotic Evil",
      "levelXP": "8/3000+12/hp",
      "TREASURE TYPE": "G",
      "treasure": "G",
      "description": "Subterranean predators with iron-like claws that burrow through solid stone at 10 ft/turn and loam at 60 ft/turn. Attack with two claws and mandibles. Any intelligent creature viewing all four eyes must save vs. magic or be confused for 3-12 rounds. Can be mistaken for a humanoid at 40+ ft distance. Favorite prey is humans."
    },
    {
      "name": "Xorn",
      "category": "Extraplanar",
      "frequency": "Rare",
      "numberAppearing": "1d4",
      "size": "Medium (5' tall)",
      "move": "90 ft",
      "armorClass": -2,
      "hitDice": "7+7",
      "attacks": 4,
      "damage": "1d3/1d3/1d3/6d4",
      "specialAttacks": "None",
      "specialDefenses": "Immune to fire and cold; resistant to electricity; harmed only by +2 or better weapons; can phase through earth and stone",
      "magicResistance": "Standard",
      "lairProbability": "0%",
      "intelligence": "Average",
      "alignment": "Neutral",
      "levelXP": "7/1100+10/hp",
      "TREASURE TYPE": "O, P, Q (x2)",
      "treasure": "O, P, Q (x2)",
      "description": "Three-armed, three-legged, three-eyed creatures from the Elemental Plane of Earth. Can move through earth and stone as easily as walking. Feed on precious metals and gems. Three clawed arms deal minor damage; powerful maw deals heavy damage. Immune to fire and cold, resistant to electricity, require +2 weapons to hit."
    },
    // =============================================
    // NEW MONSTERS — Wave 2: Planar
    // =============================================
    {
      "name": "Djinni",
      "category": "Extraplanar",
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Large (10.5' tall)",
      "move": "90 ft / 240 ft (flying)",
      "armorClass": 4,
      "hitDice": "7+3",
      "attacks": 1,
      "damage": "2d8",
      "specialAttacks": "Whirlwind (cone 70 ft tall, 10 ft base, 30 ft top); spell-like abilities: create food/water, create soft/wooden goods, create metal goods (limited), become invisible, assume gaseous form, wind walk",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "15%",
      "intelligence": "Exceptional",
      "alignment": "Chaotic Good",
      "levelXP": "7/1100+10/hp",
      "TREASURE TYPE": "Nil",
      "treasure": "Nil",
      "description": "Powerful beings from the Elemental Plane of Air. Can create whirlwinds, become invisible, assume gaseous form, and create illusions. Can carry up to 600 lbs flying, 300 lbs walking. Whirlwind form sweeps away creatures under 2 HD. Can be summoned and bound to service."
    },
    {
      "name": "Efreeti",
      "category": "Extraplanar",
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Large (12' tall)",
      "move": "90 ft / 240 ft (flying)",
      "armorClass": 2,
      "hitDice": "10",
      "attacks": 1,
      "damage": "3d8",
      "specialAttacks": "Wall of fire, pyrotechnics, produce flame at will; grant limited wishes (3 per day to non-efreet)",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "15%",
      "intelligence": "Exceptional",
      "alignment": "Lawful Evil",
      "levelXP": "10/6000+14/hp",
      "TREASURE TYPE": "Nil",
      "treasure": "Nil",
      "description": "Powerful fire beings from the Elemental Plane of Fire. Can produce wall of fire, pyrotechnics, and produce flame at will. Become invisible, assume gaseous form, polymorph self, and create illusions. Can carry 750 lbs flying. Efreeti encountered on the Prime Material can grant up to 3 wishes to their master. Cruel and avaricious."
    },
    {
      "name": "Elemental, Air",
      "category": "Extraplanar",
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Large",
      "move": "360 ft (flying)",
      "armorClass": 2,
      "hitDice": "8, 12, or 16",
      "attacks": 1,
      "damage": "2d10 (8 HD), 2d20 (12 HD), or 4d10 (16 HD)",
      "specialAttacks": "Whirlwind (1 round to form); +1 damage/die vs. airborne foes",
      "specialDefenses": "Can only be hit by +2 or better weapons",
      "magicResistance": "Standard",
      "lairProbability": "0%",
      "intelligence": "Low",
      "alignment": "Neutral",
      "levelXP": "8/3000+12/hp",
      "TREASURE TYPE": "Nil",
      "treasure": "Nil",
      "description": "Summoned from the Elemental Plane of Air. Appears as an amorphous whirling cloud. Can form a whirlwind that sweeps away creatures under 3 HD. Gains combat advantage against airborne opponents. Requires +2 or better weapons to hit. Conjured versions: 8 HD (spell), 12 HD (staff), 16 HD (device)."
    },
    {
      "name": "Elemental, Earth",
      "category": "Extraplanar",
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Large",
      "move": "60 ft",
      "armorClass": 2,
      "hitDice": "8, 12, or 16",
      "attacks": 1,
      "damage": "4d8 (8 HD), 4d8+4 (12 HD), or 4d8+8 (16 HD)",
      "specialAttacks": "+1 damage/die vs. grounded opponents; demolishes structures",
      "specialDefenses": "Can only be hit by +2 or better weapons",
      "magicResistance": "Standard",
      "lairProbability": "0%",
      "intelligence": "Low",
      "alignment": "Neutral",
      "levelXP": "8/3000+12/hp",
      "TREASURE TYPE": "Nil",
      "treasure": "Nil",
      "description": "Summoned from the Elemental Plane of Earth. Appears as a massive humanoid of stone and earth. Gains combat advantage against opponents touching the ground. Can demolish stone structures. Cannot cross water wider than its height. Requires +2 or better weapons to hit."
    },
    {
      "name": "Elemental, Fire",
      "category": "Extraplanar",
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Large",
      "move": "120 ft",
      "armorClass": 2,
      "hitDice": "8, 12, or 16",
      "attacks": 1,
      "damage": "3d8 (8 HD), 3d8+4 (12 HD), or 3d8+8 (16 HD)",
      "specialAttacks": "Sets fire to combustibles; +1 damage/die vs. cold-based creatures",
      "specialDefenses": "Can only be hit by +2 or better weapons",
      "magicResistance": "Standard",
      "lairProbability": "0%",
      "intelligence": "Low",
      "alignment": "Neutral",
      "levelXP": "8/3000+12/hp",
      "TREASURE TYPE": "Nil",
      "treasure": "Nil",
      "description": "Summoned from the Elemental Plane of Fire. Appears as a towering column of flame. Sets fire to all combustible materials within reach. Gains combat advantage against cold-using or cold-dwelling creatures. Cannot cross water wider than its height. Requires +2 or better weapons to hit."
    },
    {
      "name": "Elemental, Water",
      "category": "Extraplanar",
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Large",
      "move": "60 ft / 180 ft (swimming)",
      "armorClass": 2,
      "hitDice": "8, 12, or 16",
      "attacks": 1,
      "damage": "5d6 (8 HD), 5d6+4 (12 HD), or 5d6+8 (16 HD)",
      "specialAttacks": "Overturns water vessels; +1 damage/die vs. waterborne opponents",
      "specialDefenses": "Can only be hit by +2 or better weapons",
      "magicResistance": "Standard",
      "lairProbability": "0%",
      "intelligence": "Low",
      "alignment": "Neutral",
      "levelXP": "8/3000+12/hp",
      "TREASURE TYPE": "Nil",
      "treasure": "Nil",
      "description": "Summoned from the Elemental Plane of Water. Appears as a towering wave of water. Overturns small vessels and gains combat advantage in water. Must remain within 60 ft of a body of water. Requires +2 or better weapons to hit."
    },
    {
      "name": "Ki-rin",
      "category": "Extraplanar",
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Large",
      "move": "240 ft / 480 ft (flying)",
      "armorClass": -5,
      "hitDice": "12",
      "attacks": 3,
      "damage": "2d4/2d4/3d6",
      "specialAttacks": "Spell-like abilities (as 18th-level magic-user); can summon weather",
      "specialDefenses": "Can only be hit by +3 or better weapons; immune to poison and disease",
      "magicResistance": "90%",
      "lairProbability": "5%",
      "intelligence": "Supra-genius",
      "alignment": "Lawful Good",
      "levelXP": "10/14000+16/hp",
      "TREASURE TYPE": "I, X",
      "treasure": "I, X",
      "description": "Majestic aerial creatures of great power and goodness. Hooves and horn attacks. Possess extensive spell-like abilities functioning at 18th level, including create food/water, wind walk, call lightning, and summon weather. Telepathic. Can assume gaseous or ethereal form. Extremely rare on the Prime Material Plane."
    },
    {
      "name": "Nightmare",
      "category": "Extraplanar",
      "frequency": "Very rare",
      "numberAppearing": "1d4",
      "size": "Large",
      "move": "150 ft / 360 ft (flying)",
      "armorClass": -4,
      "hitDice": "6+6",
      "attacks": 3,
      "damage": "2d4/2d4/2d4",
      "specialAttacks": "Breath smoke cloud (5 ft radius, -2 to hit for opponents); hooves burn for additional flame damage",
      "specialDefenses": "Can become ethereal or astral at will",
      "magicResistance": "Standard",
      "lairProbability": "0%",
      "intelligence": "Very",
      "alignment": "Neutral Evil",
      "levelXP": "6/975+8/hp",
      "TREASURE TYPE": "Nil",
      "treasure": "Nil",
      "description": "Demonic steeds from the lower planes. Coal-black with flaming mane, tail, and hooves. Can fly, become ethereal or astral at will, carrying a rider to those planes. Burning hooves deal extra fire damage. Breath produces a choking smoke cloud. Serve as mounts for powerful undead and evil extraplanar beings."
    },
    {
      "name": "Night Hag",
      "category": "Extraplanar",
      "frequency": "Very rare",
      "numberAppearing": "1d4",
      "size": "Medium",
      "move": "90 ft",
      "armorClass": 9,
      "hitDice": "8",
      "attacks": 1,
      "damage": "2d6",
      "specialAttacks": "Disease; uses heartstone to become ethereal and haunt sleepers, causing them to lose 1 level per visit if save vs. magic fails",
      "specialDefenses": "Can only be hit by +3 or better cold iron weapons; immune to sleep, charm, cold, fire",
      "magicResistance": "65%",
      "lairProbability": "25%",
      "intelligence": "Exceptional",
      "alignment": "Neutral Evil",
      "levelXP": "8/3500+12/hp",
      "TREASURE TYPE": "R, S",
      "treasure": "R, S",
      "description": "Fiendish hags that dwell on the Ethereal Plane and haunt the dreams of mortals. Use a periapt of proof against poison (heartstone) to become ethereal. Visit sleeping victims nightly, draining levels. Victims who die become larvae on the lower planes. Trade in larvae and souls. Immune to many attack forms and require +3 cold iron weapons to hit."
    },
    {
      "name": "Rakshasa",
      "category": "Extraplanar",
      "frequency": "Very rare",
      "numberAppearing": "1d4",
      "size": "Medium",
      "move": "150 ft",
      "armorClass": -4,
      "hitDice": "7",
      "attacks": 3,
      "damage": "1d3/1d3/2d4",
      "specialAttacks": "Illusion and ESP at will; spells as 1st-level cleric and 3rd-level magic-user",
      "specialDefenses": "Immune to all spells below 8th level; vulnerable only to blessed crossbow bolts (kill instantly)",
      "magicResistance": "Special (immune to spells below 8th level)",
      "lairProbability": "30%",
      "intelligence": "Very",
      "alignment": "Lawful Evil",
      "levelXP": "7/2000+10/hp",
      "TREASURE TYPE": "F",
      "treasure": "F",
      "description": "Evil spirits in humanoid form with backwards-facing hands and tiger heads (when visible). Masters of illusion and ESP. Can appear as any humanoid and charm victims into trust. Immune to all spells under 8th level. Only a blessed crossbow bolt can slay one outright. Cast spells as a cleric and magic-user."
    },
    {
      "name": "Titan",
      "category": "Extraplanar",
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Gargantuan (25' tall)",
      "move": "210 ft",
      "armorClass": -3,
      "hitDice": "17-22",
      "attacks": 1,
      "damage": "7d6",
      "specialAttacks": "Spell-like abilities as combined 5th-9th level magic-user and 5th-9th level cleric (varies by HD)",
      "specialDefenses": "Can only be hit by +3 or better weapons",
      "magicResistance": "Special",
      "lairProbability": "5%",
      "intelligence": "Supra-genius",
      "alignment": "Varies (usually Chaotic Good)",
      "levelXP": "10/20000+25/hp",
      "TREASURE TYPE": "A",
      "treasure": "A",
      "description": "Impossibly powerful humanoids of great size and intelligence. Possess both magic-user and cleric spell abilities, the level of which varies with their hit dice. Benevolent titans aid those of good alignment. Among the most powerful non-divine beings in existence. Extremely rare even on the outer planes."
    },
    // =============================================
    // NEW MONSTERS — Wave 3: Outdoor/Wilderness
    // =============================================
    {
      "name": "Pegasus",
      "category": "Animal",
      "frequency": "Rare",
      "numberAppearing": "1d12",
      "size": "Large",
      "move": "240 ft / 480 ft (flying)",
      "armorClass": 6,
      "hitDice": "4",
      "attacks": 3,
      "damage": "1d8/1d8/1d3",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "20%",
      "intelligence": "Average to Very",
      "alignment": "Chaotic Good",
      "levelXP": "4/175+4/hp",
      "TREASURE TYPE": "Nil",
      "treasure": "Nil",
      "description": "Winged horses of great beauty and intelligence. Wild pegasi are shy and difficult to approach. Can be tamed if captured young, but hate hippogriffs and will attack them. Can carry a rider aloft. Lair in remote mountain meadows and high cliffs."
    },
    {
      "name": "Sphinx",
      "category": "Monster",
      "variants": [
        {
          "name": "Androsphinx",
          "frequency": "Very rare",
          "numberAppearing": "1",
          "size": "Large (12' long, 7' tall)",
          "move": "180 ft / 300 ft (flying)",
          "armorClass": -2,
          "hitDice": "12",
          "attacks": 2,
          "damage": "2d6/2d6",
          "specialAttacks": "Roar (1st: flee 3 turns, 2nd: save vs. paralysis or stunned 1d4 rounds, 3rd: save vs. magic or deafened/weak 2d4 turns plus 8d6 damage in 6 in radius)",
          "specialDefenses": "None",
          "magicResistance": "Standard",
          "lairProbability": "60%",
          "intelligence": "Very",
          "alignment": "Chaotic Good",
          "levelXP": "10/8000+16/hp",
          "TREASURE TYPE": "E",
          "treasure": "E",
          "description": "Male sphinxes with the body of a lion, eagle wings, and a human male head. Possess devastating roar used up to 3 times per day with escalating effects. Guard sacred places and test the worthy with riddles."
        },
        {
          "name": "Criosphinx",
          "frequency": "Rare",
          "numberAppearing": "1",
          "size": "Large (10' long)",
          "move": "150 ft / 240 ft (flying)",
          "armorClass": 0,
          "hitDice": "10",
          "attacks": 2,
          "damage": "2d4/2d4",
          "specialAttacks": "Head butt (3d6 on charge)",
          "specialDefenses": "None",
          "magicResistance": "Standard",
          "lairProbability": "50%",
          "intelligence": "Low",
          "alignment": "Neutral",
          "levelXP": "10/4000+14/hp",
          "TREASURE TYPE": "E",
          "treasure": "E",
          "description": "Ram-headed sphinxes that guard roads and passages, demanding treasure as toll. Less intelligent and more greedy than other sphinxes. Head butt on a charge deals 3d6 damage."
        },
        {
          "name": "Gynosphinx",
          "frequency": "Very rare",
          "numberAppearing": "1",
          "size": "Large (10' long, 7' tall)",
          "move": "150 ft / 240 ft (flying)",
          "armorClass": -1,
          "hitDice": "8",
          "attacks": 2,
          "damage": "2d4/2d4",
          "specialAttacks": "Spell-like abilities (symbol, detect magic, read magic, read languages, detect invisibility, locate object, dispel magic, clairaudience, clairvoyance, remove/bestow curse, legend lore — each 1/day)",
          "specialDefenses": "None",
          "magicResistance": "Standard",
          "lairProbability": "80%",
          "intelligence": "Very to Genius",
          "alignment": "Neutral",
          "levelXP": "8/3000+10/hp",
          "TREASURE TYPE": "E",
          "treasure": "E",
          "description": "Female sphinxes, the wisest of their kind. Pose riddles and reward the clever. Possess numerous spell-like abilities. Most diplomatic and least aggressive of sphinxes, preferring intellectual challenges."
        },
        {
          "name": "Hieracosphinx",
          "frequency": "Uncommon",
          "numberAppearing": "1",
          "size": "Large (9' long)",
          "move": "90 ft / 270 ft (flying)",
          "armorClass": 1,
          "hitDice": "9",
          "attacks": 3,
          "damage": "2d4/2d4/1d10",
          "specialAttacks": "None",
          "specialDefenses": "None",
          "magicResistance": "Standard",
          "lairProbability": "40%",
          "intelligence": "Animal",
          "alignment": "Chaotic Evil",
          "levelXP": "9/2000+12/hp",
          "TREASURE TYPE": "E",
          "treasure": "E",
          "description": "Hawk-headed sphinxes and the most bestial of their kind. Purely predatory, they have no interest in riddles. Attack with claws and sharp beak. Often haunt remote crags and desert wastes."
        }
      ],
      "description": "Powerful hybrid creatures with lion bodies and various heads, dwelling in remote areas. Four types exist with varying intelligence, alignment, and abilities."
    },
    // =============================================
    // NEW MONSTERS — Wave 4: Underwater
    // =============================================
    {
      "name": "Hippocampus",
      "category": "Animal",
      "frequency": "Uncommon",
      "numberAppearing": "2d4",
      "size": "Large",
      "move": "240 ft (swimming)",
      "armorClass": 5,
      "hitDice": "4",
      "attacks": 1,
      "damage": "1d4",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "0%",
      "intelligence": "Semi-",
      "alignment": "Neutral",
      "levelXP": "4/100+4/hp",
      "TREASURE TYPE": "Nil",
      "treasure": "Nil",
      "description": "Sea horses with the forequarters of a horse and hindquarters of a great fish. Used as steeds by aquatic races including tritons and sea elves. Relatively docile and can be tamed. Dwell in temperate and warm seas."
    },
    {
      "name": "Kopoacinth",
      "category": "Monster",
      "frequency": "Uncommon",
      "numberAppearing": "1d6",
      "size": "Medium",
      "move": "90 ft (swimming)",
      "armorClass": 5,
      "hitDice": "4+4",
      "attacks": 3,
      "damage": "1d3/1d3/1d6",
      "specialAttacks": "None",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "30%",
      "intelligence": "Low",
      "alignment": "Chaotic Evil",
      "levelXP": "4/135+5/hp",
      "TREASURE TYPE": "Nil",
      "treasure": "Nil",
      "description": "Aquatic gargoyles found in submerged caves and reefs. Resemble their land-dwelling kin but with webbed claws and finned tails. Attack with two claws and a bite. Cannot fly but are strong swimmers. Equally savage and cruel as normal gargoyles."
    },
    {
      "name": "Lacedon",
      "category": "Undead",
      "frequency": "Uncommon",
      "numberAppearing": "2d4",
      "size": "Medium",
      "move": "90 ft (swimming)",
      "armorClass": 6,
      "hitDice": "2",
      "attacks": 3,
      "damage": "1d3/1d3/1d6",
      "specialAttacks": "Paralysis (touch, save vs. paralysis or paralyzed 2-8 rounds; elves immune)",
      "specialDefenses": "Immune to sleep and charm",
      "magicResistance": "Standard",
      "lairProbability": "20%",
      "intelligence": "Low",
      "alignment": "Chaotic Evil",
      "levelXP": "2/65+2/hp",
      "TREASURE TYPE": "B",
      "treasure": "B",
      "turnResistance": "Normal ghoul",
      "description": "Aquatic ghouls that haunt warm coastal waters, sunken wrecks, and underwater caves. Identical to land ghouls in abilities including paralytic touch (elves immune), but dwell and hunt exclusively underwater. Often lurk near shipwrecks to prey on divers and swimmers."
    },
    {
      "name": "Nycadaemon",
      "category": "Extraplanar",
      "frequency": "Very rare",
      "numberAppearing": "1 (very rarely 1d2)",
      "size": "Large (8' tall and broad)",
      "move": "120 ft; 360 ft flying",
      "armorClass": -4,
      "hitDice": "12+36",
      "TREASURE TYPE": "Q (×10), X",
      "attacks": "2 fists or 1 weapon",
      "damage": "9d2/9d2 or by weapon +8",
      "specialAttacks": "Strength comparable to stone giant (+8 damage, +4 to hit with weapon); command 3/day; dispel magic 2/day; dimension door 3/day; reverse gravity 2/day; mirror image 2/day; fear (by touch); enlarge at will; project image at will",
      "specialDefenses": "+2 or better weapon to hit; immune to paralysis, poison, and gas; acid, cold, and fire cause half damage; regenerate 3 hp/turn; graduated magic resistance (100% vs 1st level to 60% vs 9th, based on 11th level caster, ±5%/level); immune to beguiling, charm, and suggestion",
      "magicResistance": "Special (60-100%)",
      "lairProbability": "Nil",
      "intelligence": "Exceptional to Genius",
      "alignment": "Neutral evil",
      "levelXP": "12/10,000+18/hp",
      "description": "Among the most powerful creatures native to the middle lower planes (Tarterus, Hades, Gehenna). Unlike mezzodaemons, can enter the Abyss and Nine Hells at will. Avoided by all lesser creatures. Totally wicked and domineering, acting in calculated manner to maximize personal power. At will: comprehend languages, detect invisibility, detect magic, invisibility (10 ft radius), polymorph self, read magic, telepathy. Also: gaseous form 1/day, wind walk 3/day, word of recall 1/day. Can see entire radiation spectrum (infrared, ultraviolet, gamma, X-rays, microwaves). Each has a secret personal name."
    },
    {
      "name": "Naga, Guardian",
      "name_variants": "Guardian Naga",
      "category": "Monster",
      "frequency": "Very rare",
      "numberAppearing": "1d2",
      "size": "Large (20' long)",
      "move": "150 ft",
      "armorClass": 3,
      "hitDice": "11-12",
      "TREASURE TYPE": "H",
      "attacks": "2 (bite + constrict)",
      "damage": "1d6/2d4",
      "specialAttacks": "Poisonous bite (1d6); constriction (2d4); poison spit (30 ft range, save vs poison or die); clerical spells as 6th level cleric (2×1st, 2×2nd, 1×3rd, 1×4th per day)",
      "specialDefenses": "Nil",
      "magicResistance": "Standard",
      "lairProbability": "75%",
      "intelligence": "Exceptional",
      "alignment": "Lawful good",
      "levelXP": "11/3,800+16/hp",
      "description": "Wise and good, guardian naga are found principally in sacred places, guarding treasure of lawful good minions, or as watchers over some evil. Covered in green-gold scales with silvery triangles along the back. Golden eyes."
    },
    {
      "name": "Naga, Spirit",
      "name_variants": "Spirit Naga",
      "category": "Monster",
      "frequency": "Rare",
      "numberAppearing": "1d3",
      "size": "Large (15' long)",
      "move": "120 ft",
      "armorClass": 4,
      "hitDice": "9-10",
      "TREASURE TYPE": "B, T, X",
      "attacks": 1,
      "damage": "1d3 + poison",
      "specialAttacks": "Poisonous bite (1d3); permanent charm gaze (save vs paralyzation or charmed); magic-user spells at 5th level (4×1st, 2×2nd, 1×3rd) and cleric spells at 4th level (2×1st, 1×2nd) per day",
      "specialDefenses": "Nil",
      "magicResistance": "Standard",
      "lairProbability": "60%",
      "intelligence": "High",
      "alignment": "Chaotic evil",
      "levelXP": "9/4,000+14/hp",
      "description": "Totally evil, spirit naga seek to do harm whenever and wherever possible. Prefer dwelling in ruined, dismal, or subterranean places. Black scaled with crimson bands. Bulbous heads with very human appearance, even to coloration and hair."
    },
    {
      "name": "Naga, Water",
      "name_variants": "Water Naga",
      "category": "Monster",
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Large (10-20 ft long)",
      "move": "90 ft / 180 ft (swimming)",
      "armorClass": 5,
      "hitDice": "7",
      "attacks": 1,
      "damage": "1d4 + poison",
      "specialAttacks": "Venomous bite (save vs. poison or die); spells as 5th-level magic-user",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "60%",
      "intelligence": "Very",
      "alignment": "Neutral",
      "levelXP": "7/1400+10/hp",
      "TREASURE TYPE": "H",
      "treasure": "H",
      "description": "Serpentine creatures with humanoid faces dwelling in deep lakes, rivers, and subterranean waterways. Possess a lethal venomous bite and cast spells as a 5th-level magic-user. Guard their territory fiercely and are often found near underwater treasure caches."
    },
    {
      "name": "Nixie",
      "category": "Fey",
      "frequency": "Uncommon",
      "numberAppearing": "3d6",
      "size": "Small (4' tall)",
      "move": "60 ft / 120 ft (swimming)",
      "armorClass": 7,
      "hitDice": "1-1",
      "attacks": 1,
      "damage": "By weapon (small sword or javelin)",
      "specialAttacks": "Charm Person (10 nixies acting together, save vs. magic at -2 or serve nixies for 1 year); water breathing spell on charmed victims",
      "specialDefenses": "None",
      "magicResistance": "25%",
      "lairProbability": "100%",
      "intelligence": "Very",
      "alignment": "Neutral",
      "levelXP": "1/28+1/hp",
      "TREASURE TYPE": "B",
      "treasure": "B",
      "description": "Small aquatic fey dwelling in cool, clear freshwater lakes and streams. Groups of 10 can charm a victim to serve them for one year underwater. Cast water breathing on charmed victims. Each group of 10 keeps 1d10 giant fish as guards. Avoid violence when possible, preferring charm."
    },
    {
      "name": "Triton",
      "category": "Monster",
      "frequency": "Uncommon",
      "numberAppearing": "1d12",
      "size": "Medium",
      "move": "150 ft (swimming)",
      "armorClass": 5,
      "hitDice": "3",
      "attacks": 1,
      "damage": "By weapon (trident or crossbow)",
      "specialAttacks": "Conch horn effects (calm or summon sea creatures); spellcasters among them",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "40%",
      "intelligence": "Very",
      "alignment": "Neutral Good",
      "levelXP": "3/65+3/hp",
      "TREASURE TYPE": "A",
      "treasure": "A",
      "description": "Noble aquatic humanoids with fish-like lower bodies. Dwell in undersea communities and patrol their territories. Use conch horns that can calm rough seas or summon sea creatures. Armed with tridents and crossbows. Larger groups may include leaders with cleric or magic-user abilities."
    },
    {
      "name": "Octopus, Giant",
      "name_variants": "Giant Octopus",
      "category": "Animal",
      "frequency": "Uncommon",
      "numberAppearing": "1d2",
      "size": "Large (8-10 ft body, 20+ ft tentacle span)",
      "move": "30 ft / 120 ft (swimming)",
      "armorClass": 7,
      "hitDice": "8",
      "attacks": 7,
      "damage": "1d4/1d4/1d4/1d4/1d4/1d4 (tentacles) + 2d6 (beak)",
      "specialAttacks": "Constriction (tentacles); ink cloud (40 ft radius, obscures vision 3 rounds)",
      "specialDefenses": "Jet propulsion for quick escape",
      "magicResistance": "Standard",
      "lairProbability": "30%",
      "intelligence": "Animal to Semi-",
      "alignment": "Neutral",
      "levelXP": "8/1800+10/hp",
      "TREASURE TYPE": "A",
      "treasure": "A",
      "description": "Enormous eight-armed cephalopods lurking in undersea caves and reefs. Six tentacles attack for 1d4 each; a constricting tentacle drags prey to the crushing beak for 2d6. Can jet-propel backward to escape and release a 40 ft radius ink cloud to obscure pursuit."
    },
    {
      "name": "Bodak",
      "category": "Undead",
      "source": "S4 Lost Caverns of Tsojcanth",
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Medium",
      "move": "60 ft",
      "armorClass": 5,
      "hitDice": "9+9",
      "TREASURE TYPE": "Nil",
      "attacks": 1,
      "damage": "By weapon",
      "specialAttacks": "Death gaze (30 ft range, save vs. Death or die)",
      "specialDefenses": "+1 or better weapon to hit; immune to poison, charm, sleep, hold; half damage from cold, electricity, fire",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Low",
      "alignment": "Chaotic evil",
      "levelXP": "7/1,950+14/hp",
      "description": "Bodaks are evil humans transformed by exposure to demonic forces of the Abyss. Hairless, sexless, muscular bodies with dark gray pearly skin, long heads with distorted features, and large milky-white oval eyes. They speak demonic languages but remember few human words. 90% chance of possessing a random weapon. Direct sunlight inflicts 1 hp/round. Have 60 ft infravision and ultravision. Each time given a new task by its summoner, the bodak rolls d20 for intelligence; if higher than the magic-user's intelligence, it controls and enslaves the summoner."
    },
    {
      "name": "Cave Cricket, Giant",
      "category": "Insect",
      "source": "S4 Lost Caverns of Tsojcanth",
      "frequency": "Rare",
      "numberAppearing": "1d8",
      "size": "Small to Medium",
      "move": "60 ft (hop 30 ft)",
      "armorClass": 4,
      "hitDice": "1+3",
      "TREASURE TYPE": "Nil",
      "attacks": 1,
      "damage": "1d4",
      "specialAttacks": "Jump/Kick",
      "specialDefenses": "Chirping (drowns speech in 90 ft radius)",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "levelXP": "1/20+2/hp",
      "description": "Identical to normal crickets but larger with pale gray or white coloration. Eats vegetation, fungus, cloth, or paper. Normally just a noisy pest. When frightened, chirps to drown out all speech in 90 ft radius (2-in-6 chance of attracting predators within 90 ft). Frightened cricket has 1-in-6 chance of jumping on anyone within 30 ft for 1d4 automatic damage. Non-jumping crickets can randomly kick targets within 10 ft."
    },
    {
      "name": "Cave Moray",
      "category": "Monster",
      "source": "S4 Lost Caverns of Tsojcanth",
      "frequency": "Rare",
      "numberAppearing": "4d4",
      "size": "Medium",
      "move": "10 ft",
      "armorClass": "0 (head) / 5 (body)",
      "hitDice": "4+4",
      "TREASURE TYPE": "N",
      "attacks": "1 every 2 rounds",
      "damage": "2d4",
      "specialAttacks": "Surprise on 1-5",
      "specialDefenses": "Withdraws into rock cyst between attacks; only 1-in-20 chance of striking body instead of head",
      "magicResistance": "Standard",
      "lairProbability": "100%",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "levelXP": "3/130+5/hp",
      "description": "Snail-like creatures resembling the rock formations in which they dwell, with brownish-gray skin and knobby mottled heads. They live in cyst-like burrows in rock. When prey passes, the cave moray lunges with a striking range of 3-5 ft, then withdraws into its cyst to recoil for another lunge. Attacks once every two rounds."
    },
    {
      "name": "Cooshee",
      "category": "Animal",
      "source": "S4 Lost Caverns of Tsojcanth",
      "name_variants": "Elven Dog",
      "frequency": "Rare",
      "numberAppearing": "1d8",
      "size": "Medium",
      "move": "150 ft (210 ft straight-line chase)",
      "armorClass": 5,
      "hitDice": "3+3",
      "TREASURE TYPE": "Nil",
      "attacks": "1 bite",
      "damage": "1d4+6",
      "specialAttacks": "Forepaw knockdown (man-sized or smaller; if successful, bite at +4)",
      "specialDefenses": "Camouflage (75% hide in brush/woodlands); moves silently",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Semi-",
      "alignment": "Neutral",
      "levelXP": "3/110+4/hp",
      "description": "Elven dogs the size of the largest dogs, weighing 165-210 lbs. Huge heavily-nailed paws and curled tail. Found only with sylvan or valley elves. Can move 150 ft normally or 210 ft in straight-line chases. Forepaw attack knocks two-legged man-sized or smaller opponents off feet (if successful, bite is at +4 to hit). Avoids other dogs. Bark audible over a mile but only used to warn master. 75% chance to hide in brush or woodlands due to coloration and silent movement."
    },
    {
      "name": "Crystal Ooze",
      "category": "Ooze",
      "source": "S4 Lost Caverns of Tsojcanth",
      "frequency": "Rare",
      "numberAppearing": "1d2",
      "size": "Medium to Large",
      "move": "10 ft (30 ft swimming)",
      "armorClass": 8,
      "hitDice": 4,
      "TREASURE TYPE": "Nil",
      "attacks": 1,
      "damage": "4d4",
      "specialAttacks": "Paralysis (save vs. Poison or paralyzed 5d4 rounds); destroys wood (save vs. Acid or destroyed)",
      "specialDefenses": "Immune to acid, cold, fire; weapons cause only 1 hp per hit",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "levelXP": "4/225+4/hp",
      "description": "A variety of gray ooze adapted to life in water. Lives in dim or dark bodies of shallow water but can survive outside water for several hours. 75% chance of being unseen when immersed. Attacks by flowing over victims and exuding paralytic poison (4d4 damage, save vs. Poison or paralyzed 5d4 rounds). Paralyzed victims are quickly consumed. Lightning and magic missiles cause full damage. Medium specimens have 16 hp or less; large have 17+; those with 28+ are about 2 ft wide, 14 ft long, 6 inches thick."
    },
    {
      "name": "Dao",
      "category": "Extraplanar",
      "source": "S4 Lost Caverns of Tsojcanth",
      "name_variants": "Earth Genie",
      "frequency": "Rare",
      "numberAppearing": "1 (10% chance of 1d4+1)",
      "size": "Large (8-11 ft tall)",
      "move": "90 ft; 150 ft flying (60 ft through earth)",
      "armorClass": 3,
      "hitDice": "8+3",
      "TREASURE TYPE": "Nil",
      "attacks": 1,
      "damage": "3d6",
      "specialAttacks": "Spell-like abilities (18th level)",
      "specialDefenses": "Immune to earth-based spells; vulnerable to holy water (double damage)",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Low to very",
      "alignment": "Neutral evil",
      "levelXP": "8/1,300+12/hp",
      "specialAbilities": {
        "spellLikeAbilities": {
          "sixPerDay": ["Dig"],
          "threePerDay": ["Rock to mud"],
          "oncePerDay": ["Change self (6x normal duration)", "Detect good", "Detect magic", "Gaseous form", "Invisibility", "Limited wish", "Misdirection", "Passwall", "Spectral force", "Wall of stone"]
        },
        "movement": "Can move through earth/unworked stone at 60 ft (like xorn, cannot carry others)",
        "carrying": "5,000 gp weight without tiring; 10,000 gp forces rest after 3 turns; -1,000 gp = +1 turn"
      },
      "description": "Related to djinn, efreet, and marids, originating on the Elemental Plane of Earth. Travel Astral, Elemental, and Prime Material Planes but come to Prime Material only to work evil. More resentful and treacherous than efreet. Hate djinn and marids but friendly toward efreet. Can be forced to serve by bold magic-users. On their own plane they live in the Great Dismal Delve ruled by a khan. All abilities equivalent to 18th level spell use."
    },
    {
      "name": "Demi-Lich",
      "category": "Undead",
      "source": "S4 Lost Caverns of Tsojcanth",
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Medium",
      "move": "Special",
      "armorClass": -6,
      "hitDice": "50 hp",
      "TREASURE TYPE": "Z",
      "attacks": "Special",
      "damage": "Special",
      "specialAttacks": "Howl (death, 20 ft radius, save vs. Death); soul drain (no save, imprisons life force in gem); curse (after all gems filled)",
      "specialDefenses": "See below",
      "magicResistance": "See below",
      "lairProbability": "100%",
      "intelligence": "Supra-genius",
      "alignment": "Neutral evil",
      "levelXP": "9/5,950+16/hp",
      "specialAbilities": {
        "dustForm": "Swirls into man-like shape if lair entered; dissipates in 3 rounds if ignored; attacks on dust-form strengthen it (gains 1 hp per physical attack, hp equal to spell level per spell); at 50 hp becomes a ghost",
        "skullAttack": "If skull touched, rises and attacks strongest party member (magic-users first, then fighters, clerics, thieves, monks). 50% chance of howl or soul drain",
        "soulDrain": "No saving throw; life force imprisoned in gem (2d4 gems in eye sockets and jaw). Body becomes putrid mass in 1 round",
        "curse": "When all gems filled: always struck by opponent weapons, never make saves, or never gain XP. Remove curse works but permanently reduces CHA by 2",
        "canBeHarmed": [
          "Forget or exorcism spell forces skull down without attacking",
          "Shatter spell inflicts 10 hp damage",
          "Power word kill from astral/ethereal magic-user destroys skull",
          "Fighters with vorpal blade; rangers with sword of sharpness/+5/vorpal; paladins with sword of sharpness/vorpal/+5/+4",
          "Dispel evil inflicts 5 hp damage",
          "Holy word inflicts 20 hp damage"
        ],
        "reformation": "If destroyed, remains must be sprinkled with holy water or reforms in 1d10 days",
        "soulGems": "Gems containing life force glow faintly; visible with true seeing/gem of seeing. Soul freed by crushing gem if material body within 10 ft. Failed save vs. Spell on gem = demi-lich devoured the soul"
      },
      "description": "The final form of an ancient lich whose life force has waned. Only dust, skull, and possibly a few bones remain. Cannot be turned in any form. The dust-form gains power from attacks against it. The skull attacks the strongest party member with howl or soul drain. One of the most dangerous creatures in existence."
    },
    {
      "name": "Demon, Alu-Demon",
      "category": "Demons",
      "source": "S4 Lost Caverns of Tsojcanth",
      "name_variants": "Demi-demon",
      "frequency": "Rare",
      "numberAppearing": "1",
      "size": "Medium (5.5-7 ft tall)",
      "move": "120 ft; 120 ft flying",
      "armorClass": "5 or variable (magical armor)",
      "hitDice": "6+2d12",
      "TREASURE TYPE": "I, S, T",
      "attacks": "1 weapon or 1 touch",
      "damage": "By weapon or 1d8 hp drain (touch)",
      "specialAttacks": "Hit point drain (gains half drained, rounded up)",
      "specialDefenses": "+1 or better weapon to hit; half damage from cold, electricity, fire, gas",
      "magicResistance": "30%",
      "lairProbability": "15%",
      "intelligence": "Very to genius",
      "alignment": "Chaotic evil (20% chaotic neutral)",
      "levelXP": "8/3,000+14/hp (9/4,050+14/hp for leaders)",
      "psionicAbility": "200 (leaders only), Attack/Defense: D/G, I",
      "specialAbilities": {
        "spellLikeAbilities": {
          "upToThreePerDay": ["Charm person", "ESP", "Shape change (human/humanoid of own size)", "Suggestion"],
          "oncePerDay": ["Dimension door"],
          "spellLevel": "12th level"
        },
        "armor": "Only magical armor; if base AC worse than 5, gains only magical bonus; otherwise full protection",
        "leaders": "Genius intelligence (17-18) can be magic-users (level 1d12) with psionic abilities",
        "infravision": "90 ft"
      },
      "description": "Appear quite human with vestigial horns and small bat-like wings. Rumored offspring of succubi and humans. Always female. Character stats rolled with 2d6+6 for each ability except intelligence (10+1d8). Can use any weapon. Touch drains 1d8 hp from victim (demon gains half). Can only be wounded by magic or cold-wrought unforged iron weapons."
    },
    {
      "name": "Demon, Baphomet",
      "category": "Demons",
      "source": "S4 Lost Caverns of Tsojcanth",
      "name_variants": "Demon Prince of Minotaurs",
      "frequency": "Unique",
      "numberAppearing": "1",
      "size": "Large (12 ft tall)",
      "move": "240 ft",
      "armorClass": -4,
      "hitDice": "106 hp",
      "TREASURE TYPE": "S, T, X, Z",
      "attacks": "3 (1 weapon, 1 gore, 1 bite)",
      "damage": "3d4+8/2d6/1d4+1",
      "specialAttacks": "Spell-like abilities (20th level); bellow (300 ft, save vs. Spells or flee 6 rounds); gate type III demon (85%)",
      "specialDefenses": "+2 or better weapon to hit; half damage from cold, electricity, fire, gas",
      "magicResistance": "75%",
      "lairProbability": "40%",
      "intelligence": "Genius",
      "alignment": "Chaotic evil",
      "levelXP": "10/45,000 (material form only)",
      "specialAbilities": {
        "weapon": "Bardiche (3d4+8 damage; struck armor/shields/weapons save vs. Crushing Blow or destroyed)",
        "atWill": ["Darkness 10 ft radius", "Detect invisibility", "Detect magic", "Dispel magic", "Levitate", "Phantasmal force", "Telekinese 7,500 gp", "Teleport"],
        "threePerDay": ["Maze", "Passwall", "Shape change", "Wall of stone"],
        "oncePerDay": "Gate type III demon (85%)",
        "bellow": "All within 300 ft save vs. Spells or flee in panic 6 rounds",
        "summonMinotaurs": "1d8+8 normal minotaurs once per day; usually attended by 1d4+1 max-hp minotaurs",
        "senses": "120 ft infravision, double normal human hearing"
      },
      "description": "Has an ogre's body, bull's head with large curving horns, broad feet, bovine tail, and thick powerful hands covered in coarse black hair. Minotaurs are his worshippers. Mutual hatred with Yeenoghu is legendary. Speaks Common and Minotaur, communicates telepathically with animals. Attacks as 16+ HD monster."
    },
    {
      "name": "Demon, Bar-lgura",
      "category": "Demons",
      "source": "S4 Lost Caverns of Tsojcanth",
      "name_variants": "Minor demon",
      "frequency": "Uncommon",
      "numberAppearing": "1d3 (lair 1d6)",
      "size": "Medium (5 ft tall, broad)",
      "move": "90 ft (climbing 150 ft)",
      "armorClass": -3,
      "hitDice": "6+6",
      "TREASURE TYPE": "D",
      "attacks": "2 claws, 1 bite",
      "damage": "1d6/1d6/2d6",
      "specialAttacks": "Spell-like abilities (7th level); gate bar-lgura (25%)",
      "specialDefenses": "Half damage from cold, electricity, fire, gas",
      "magicResistance": "45%",
      "lairProbability": "10%",
      "intelligence": "Very to high",
      "alignment": "Chaotic evil",
      "levelXP": "8/1,275+10/hp",
      "specialAbilities": {
        "spellLikeAbilities": {
          "atWill": ["Darkness 10 ft radius", "Create water (6th level cleric)", "Cause fear (touch)", "Detect illusion", "Detect invisibility", "Dispel magic", "Entangle", "Plant growth", "Telekinese 2,500 gp", "Teleport"],
          "twicePerDay": ["Change self", "Invisibility", "Spectral force"]
        },
        "leap": "Can leap up to 40 ft",
        "camouflage": "Can change coloration in 1 round (black, brown, gray, green, orange, purple, red)",
        "infravision": "60 ft"
      },
      "description": "Appears similar to an orangutan with bloated belly, bandy legs, long arms, shaggy hair, and tusks. Evil sunken eyes reveal its demonic nature. Six clawed fingers and toes. Normally found in forests, jungles, or buildings where they can climb. Live in small groups, shun other demons. Can be wounded by normal weapons."
    },
    {
      "name": "Demon, Fraz-Urb-luu",
      "category": "Demons",
      "source": "S4 Lost Caverns of Tsojcanth",
      "name_variants": "Prince of Deception",
      "frequency": "Unique",
      "numberAppearing": "1",
      "size": "Large (18 ft tall)",
      "move": "120 ft; 180 ft flying",
      "armorClass": -2,
      "hitDice": "233 hp",
      "TREASURE TYPE": "O, P, U, Z",
      "attacks": "3 (2 fists + bite or tail)",
      "damage": "1d6+12/1d6+12/3d6 (bite) or 1d12 (tail)",
      "specialAttacks": "Spell-like abilities (20th level); gate 1d4 type I demons (60%); trick other demon prince (75%)",
      "specialDefenses": "+2 or better weapon to hit; immune to mind-affecting spells/psionics; half damage from cold, electricity, fire, gas",
      "magicResistance": "70%",
      "lairProbability": "20%",
      "intelligence": "Supra-genius",
      "alignment": "Chaotic evil",
      "levelXP": "10/50,000 (material form only)",
      "psionicAbility": "233, Attack/Defense: All/All",
      "specialAbilities": {
        "atWill": ["Darkness 30 ft radius", "Dispel magic", "Hypnotic pattern", "Misdirection", "Polymorph other", "Polymorph self", "Programmed illusion", "Telekinese 10,000 gp", "Teleport", "Veil"],
        "oncePerDay": ["Plane shift", "Power word blind", "Prismatic spray"],
        "tail": "15 ft tail can slash for 1d12 or entwine opponent and lift to bite for 3d6",
        "trickDemonPrince": "75% chance to deceive another demon prince into attacking his enemies; enraged prince 85% likely to attack Fraz-Urb-luu's opponents",
        "planeEffects": "Magical items taken to his plane have 90% chance of losing magic (except artifacts/relics)"
      },
      "description": "Hulking body covered in short coarse hair, broad splayed feet, large stubby hands, beautiful but cruel face with fanged mouth, large pointed head, ragged ears, vast black wings, long cruelly barbed hairless tail. Pale blue hair, grayish skin. Was imprisoned in a bas-relief in dungeons beneath Castle Greyhawk for centuries. Prefers trickery over combat. Speaks all human languages and communicates telepathically. Attacks as 16+ HD monster. His staff (rod of beguiling + rod of rulership + staff of command) was stolen and has disappeared."
    },
    {
      "name": "Demon, Graz'zt",
      "category": "Demons",
      "source": "S4 Lost Caverns of Tsojcanth",
      "name_variants": "Demon Prince",
      "frequency": "Unique",
      "numberAppearing": "1",
      "size": "Large (8 ft tall)",
      "move": "120 ft",
      "armorClass": "-9 (or -6 without shield)",
      "hitDice": "186 hp",
      "TREASURE TYPE": "U, Z",
      "attacks": "2 or 4 (1 weapon + shield, or 2 weapons for 4 attacks)",
      "damage": "By weapon +6",
      "specialAttacks": "Spell-like abilities (20th level); fear (60 ft, by word); gate 1d2 type VI demons (100%)",
      "specialDefenses": "+2 or better weapon to hit; half damage from cold, electricity, fire, gas",
      "magicResistance": "70%",
      "lairProbability": "60%",
      "intelligence": "Supra-genius",
      "alignment": "Chaotic evil",
      "levelXP": "10/66,510 (material form only)",
      "psionicAbility": "266, Attack/Defense: All/All",
      "specialAbilities": {
        "atWill": ["Alter reality (for someone else)", "Chaos", "Continual darkness", "Dispel magic", "Duo-dimension", "Emotion", "Magic missile (5 missiles)", "Mirror image", "Polymorph self", "Read languages", "Read magic", "Telekinese 15,000 gp", "Teleport", "Vanish", "Water breathing"],
        "twicePerDay": ["Polymorph others"],
        "oncePerDay": ["Disintegrate", "Polymorph any object", "Veil"],
        "oncePerWeek": ["Trap the soul"],
        "weapon": "Shield +3, wavy-bladed bastard sword that drips acid (+1d4+4 acid damage; unmodified 20 destroys inanimate objects that fail save vs. Acid)",
        "secondaryWeapon": "Sometimes uses guisarme +1",
        "fear": "Sneer and word causes fear in all within 60 ft",
        "servants": "1d3 lamias always present; 50% chance of 1d3 succubi (50%) or type VI demon (50%) in lair"
      },
      "description": "Most powerful demon prince of the Abyss, lord of an entire layer, dedicated foe of Demogorgon and Orcus. Most handsome of demon princes by human standards—huge, good-looking man with shiny black skin, green glowing eyes, pointed ears, small fangs, six fingers on each hand and six toes on each foot. Was magically taken to Prime Material and placed in bondage by Iggwilv; battled free at cost of being confined to his plane for a century. Attacks as 16+ HD monster."
    },
    {
      "name": "Demon, Kostchtchie",
      "category": "Demons",
      "source": "S4 Lost Caverns of Tsojcanth",
      "name_variants": "Demon Lord",
      "frequency": "Unique",
      "numberAppearing": "1",
      "size": "Medium (7 ft tall)",
      "move": "60 ft",
      "armorClass": -3,
      "hitDice": "96 hp",
      "TREASURE TYPE": "A, I, S, T",
      "attacks": 1,
      "damage": "2d6+10",
      "specialAttacks": "Hammer stun (save vs. Paralysis or stunned this round and next); spell-like abilities (20th level); gate 1d4+1 bar-lgura (100%)",
      "specialDefenses": "+1 or better weapon to hit; half damage from cold, electricity, fire, gas",
      "magicResistance": "60%",
      "lairProbability": "25%",
      "intelligence": "Supra-genius",
      "alignment": "Chaotic evil",
      "levelXP": "10/42,000 (material form only)",
      "psionicAbility": "230, Attack/Defense: All/All",
      "specialAbilities": {
        "weapon": "Huge cold iron hammer inlaid with nickel and silver (2d6+10 damage; save vs. Paralysis or stunned)",
        "atWill": ["Command", "Curse (reversed remove curse)", "Darkness 15 ft radius", "Dispel good", "Know alignment", "Protection from good 10 ft radius", "Speak with monsters", "Teleport", "Telekinese 5,000 gp"],
        "twicePerDay": ["Poison (reversed neutralize poison)", "Wind walk"],
        "oncePerDay": ["Harm (reversed heal)", "Unholy word"],
        "companions": "2 leucrotta (49 hp each) always present; rumored ancient white dragon steed; sometimes (40%) attended by frost giants"
      },
      "description": "Powerful demon lord despised even by his own kind except minor demons. Appears as a giant with bandy deformed legs, flat oval head with slitted eyes and gross features, muscular hairless body (except eyebrows), pale yellow skin. Communicates telepathically and speaks many human languages. Attacks as 16+ HD monster."
    },
    {
      "name": "Demon, Rutterkin",
      "category": "Demons",
      "source": "S4 Lost Caverns of Tsojcanth",
      "name_variants": "Minor demon",
      "frequency": "Common",
      "numberAppearing": "1d4 (lair 1d10+2)",
      "size": "Medium (5-7 ft tall)",
      "move": "120 ft",
      "armorClass": 1,
      "hitDice": "5+1",
      "TREASURE TYPE": "L (x10), M (x5), Q, Q",
      "attacks": "1 or 2",
      "damage": "By weapon",
      "specialAttacks": "Special weapons; spell-like abilities",
      "specialDefenses": "Half damage from cold, electricity, fire, gas",
      "magicResistance": "40%",
      "lairProbability": "20%",
      "intelligence": "Average",
      "alignment": "Chaotic evil",
      "levelXP": "5/425+6/hp",
      "specialAbilities": {
        "atWill": ["Darkness 5 ft radius", "Fear (touch)", "Fly", "Telekinese 1,000 gp"],
        "oncePerDay": ["Teleport"],
        "gate": "15% chance to gate in a chasme",
        "weapons": {
          "snapTongs": "2d4 damage per hit, 2d4 automatic damage per round thereafter (break free by spending 1 round not attacking, rolling to hit)",
          "doubleCrescentPoleArm": "1d10 vs man-sized or smaller, 1d12 vs larger",
          "sawToothBroadsword": "+1 damage vs unarmored",
          "threeBladedMissile": "1d6+2 vs man-sized or smaller, 1d4+2 vs larger (hurled from atlatl, 150 ft range)"
        }
      },
      "description": "Look like ugly humans or humanoids, nearly hairless with pointed skulls, large features, backward-pointing ears, and misshapen bodies. One of the weakest but most bullying demons. Hated and abused by most demons. Prefer using strange weapons: snap-tongs, double crescent pole arms, saw-toothed broadswords, and three-bladed missiles hurled from atlatls."
    },
    {
      "name": "Derro",
      "category": "Humanoid",
      "source": "S4 Lost Caverns of Tsojcanth",
      "frequency": "Very rare",
      "numberAppearing": "3d10+",
      "size": "Small (4 ft tall)",
      "move": "90 ft",
      "armorClass": "Variable",
      "hitDice": 3,
      "TREASURE TYPE": "Individuals: N (x5), Q (x2) in lair",
      "attacks": "1 or 2",
      "damage": "By weapon type",
      "specialAttacks": "Hooking weapons; poisoned crossbow bolts (2d6 extra, save vs. Poison negates extra)",
      "specialDefenses": "High dexterity (15-18) bonuses to AC and missiles",
      "magicResistance": "30%",
      "lairProbability": "20%",
      "intelligence": "Very to genius",
      "alignment": "Chaotic evil",
      "levelXP": "Variable",
      "specialAbilities": {
        "infravision": "30 ft",
        "ultravision": "120 ft underground",
        "equipment": {
          "type1": "Repeating light crossbow (120 ft range, 2 shots/round, 6 bolt capacity, poisoned bolts: 1d3 + 2d6 poison)",
          "type2": "Hook fauchard (6 ft, 1d4 damage, unmodified 16+ pulls man-sized target off balance) + dagger",
          "type3": "Aklys (throwing club on 10 ft thong, 19-20 pulls off balance) + dagger",
          "type4": "Spear + military pick"
        },
        "leaders": "Per 3: one 4 HD; per 6: one 5 HD; per 10: one 7 HD leader + 6 HD lieutenant",
        "savants": "If 20+: 1 savant (6-9 spells, 2-3 magic items) + 2 students (1-3 spells, 1 magic item). All spells at 12th level. Know comprehend languages and read magic plus: affect normal fires, anti-magic shell, blink, charm person, cloudkill, ESP, hypnotic pattern, ice storm, invisibility, levitate, light, lightning bolt, minor creation, paralyzation, repulsion, shadow magic, spider climb, ventriloquism, wall of fog, wall of force",
        "lair": "30 derro, 1d10+2 leaders, 1-3 savants, 1d4+1 students, 5d6+10 slaves (80% female), 1-3 gargoyles (70%) or 1 lamia (30%)"
      },
      "description": "Degenerate race of dwarven stature, rumored cross between evil humans and dwarves. Shorter than humans, slightly more muscular. Pale blond hair, white skin with bluish overtones, large eyes, gross features. Inhabit great subterranean realms. Become nauseous in sunlight but raid human settlements at night for slaves and sacrificial victims. Speak own language, underearth trade vernacular, and smattering of Common."
    },
    {
      "name": "Elf, Valley",
      "category": "Demi-Human",
      "source": "S4 Lost Caverns of Tsojcanth",
      "frequency": "Very rare",
      "numberAppearing": "10d4 (lair 20d12)",
      "size": "Medium (5.5 ft tall)",
      "move": "120 ft",
      "armorClass": 4,
      "hitDice": "1+2",
      "TREASURE TYPE": "Individuals: M, N; Lair: G, S, T",
      "attacks": 1,
      "damage": "By weapon or 1d10",
      "specialAttacks": "+1 with bow or sword",
      "specialDefenses": "90% resistance to charm and sleep",
      "magicResistance": "Standard",
      "lairProbability": "10%",
      "intelligence": "High to genius",
      "alignment": "Chaotic neutral",
      "levelXP": "3/65+2/hp",
      "specialAbilities": {
        "cooshee": "75% chance of 1d4 cooshee with wandering band; 90% chance of 2d4 cooshee in lair",
        "characteristics": "Follow gray elf characteristics for habitation, group composition, armament, and special abilities"
      },
      "description": "Either a separate race or offshoot of gray elves. As tall as most humans, thin with sharp pointed features. Reclusive, resent intrusion, distrust strangers. Do not use steeds other than horses. All other elves including Drow shun them. Will not associate with other races except gnomes. In the World of Greyhawk, they live near the Valley of the Mage and have raided into Bissel, Geoff, Gran March, and Ket."
    },
    {
      "name": "Formorian",
      "category": "Giants",
      "source": "S4 Lost Caverns of Tsojcanth",
      "frequency": "Uncommon",
      "numberAppearing": "1d4",
      "size": "Large (13.5 ft tall)",
      "move": "90 ft",
      "armorClass": "3 (some 2 or 1 with crude armor)",
      "hitDice": "13+1d3",
      "TREASURE TYPE": "D, Q (x10)",
      "attacks": 1,
      "damage": "4d8",
      "specialAttacks": "None",
      "specialDefenses": "Never surprised (oddly placed eyes, huge ears, large noses)",
      "magicResistance": "Standard",
      "lairProbability": "45%",
      "intelligence": "Average",
      "alignment": "Neutral evil",
      "levelXP": "7/2,750+18/hp",
      "specialAbilities": {
        "stealth": "Move with considerable stealth despite size",
        "weapons": "Huge clubs or chains with heavy metal balls",
        "lair": {
          "females": "25% chance of 1-2 per male (fight as males, 13 HD)",
          "young": "1-3 per female: Small (7d4 HD, 2d4 dmg), Half-grown (13d4 HD, 4d4 dmg), Near-adult (13d6 HD, 4d6 dmg)"
        }
      },
      "description": "Most hideous, deformed, and wicked of giantkind. Terrible body deformities: misplaced or oversized arms, huge feet on short legs, oddly placed eyes, hump, pointed head, etc. Scattered patches of hair tough as wire. AC 3 from thick hides and heavy pelts reinforced with scrap metal. Cannot hurl rocks due to deformities but those same handicaps prevent them from being surprised."
    },
    {
      "name": "Gorgimera",
      "category": "Monster",
      "source": "S4 Lost Caverns of Tsojcanth",
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Large (5 ft at shoulder)",
      "move": "120 ft; 150 ft flying",
      "armorClass": "2 (60% of attacks) / 5 (40% lion parts)",
      "hitDice": 10,
      "TREASURE TYPE": "F",
      "attacks": "5 (2 claws, 2 bites, 1 butt)",
      "damage": "1d3/1d3/2d4/1d10+2/2d6",
      "specialAttacks": "Gorgon breath (3 ft x 10 ft cone, petrification, 2/day); dragon breath (5 ft x 20 ft cone, 3d8 fire, 2/day)",
      "specialDefenses": "None",
      "magicResistance": "Standard",
      "lairProbability": "25%",
      "intelligence": "Semi-",
      "alignment": "Chaotic evil",
      "levelXP": "7/2,550+14/hp",
      "specialAbilities": {
        "gorgonBreath": "30 ft long x 10 ft wide cone; save vs. Petrification or turned to stone; extends to Astral/Ethereal; gorgon head can see into those planes; usable 2/day",
        "dragonBreath": "50 ft long x 20 ft wide cone; 3d8 fire damage (save vs. Breath Weapon for half); usable 2/day",
        "meleeBreath": "In melee, d6: 1=dragon breath, 2=gorgon breath, 3-6=standard attacks",
        "rangedBehavior": "Always uses breath weapon at 10 ft+ range"
      },
      "description": "Similar to chimera but far worse. Sterile cross-bred with hindquarters and head of a gorgon (metallic blue), forequarters and head of a lion, and mid-body, wings, and head of a red dragon. Speaks very limited Red Dragon dialect. 40% chance per blow of striking lion parts (AC 5), rest is AC 2."
    },
    {
      "name": "Marid",
      "category": "Extraplanar",
      "source": "S4 Lost Caverns of Tsojcanth",
      "name_variants": "Water Genie",
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Large (18 ft tall)",
      "move": "90 ft; 150 ft flying; 240 ft swimming",
      "armorClass": 0,
      "hitDice": 13,
      "TREASURE TYPE": "Nil",
      "attacks": 1,
      "damage": "8d4",
      "specialAttacks": "Spell-like abilities (26th level); water jet (60 ft, 1d6 + blind 1 round)",
      "specialDefenses": "Immune to water-based spells; +2 save vs cold (-2 per die damage); -1 save vs fire (+1 per die damage); immune to steam",
      "magicResistance": "25%",
      "lairProbability": "Nil",
      "intelligence": "High to genius",
      "alignment": "Chaotic neutral",
      "levelXP": "9/3,650+18/hp",
      "specialAbilities": {
        "atWill": ["Water walk", "Create water (or 60 ft water jet: 1d6 + blind 1 round)"],
        "sevenPerDay": ["Gaseous form", "Lower water", "Part water", "Wall of fog", "Water breathing (full day on others)"],
        "twicePerDay": ["Detect evil", "Detect good", "Detect invisibility", "Detect magic", "Invisibility", "Liquid form", "Polymorph self", "Purify water"],
        "oncePerWeek": ["Alter reality"],
        "carrying": "10,000 gp without tiring; 20,000 gp for 3 turns; -2,000 gp = +1 turn"
      },
      "description": "Most powerful of geniekind. Formed from material of the Elemental Plane of Water. Independent and egotistical. Tolerate djinn, dislike dao and efreet. Can breathe water and are comfortable at any depth. Have ultravision and 60 ft infravision. Loosely ruled by a Padishah but all claim grand titles. Forcing service is difficult and dangerous; bribery and flattery slightly more successful but they are too arrogant to be reliable servants. All powers equivalent to 26th level spell use."
    },
    {
      "name": "Margoyle",
      "category": "Magical Beast",
      "source": "S4 Lost Caverns of Tsojcanth",
      "frequency": "Rare",
      "numberAppearing": "2d4",
      "size": "Medium (7 ft tall)",
      "move": "60 ft; 120 ft flying",
      "armorClass": 2,
      "hitDice": 6,
      "TREASURE TYPE": "Individuals: Q; Lair: C",
      "attacks": "4 (2 claws, 1 horn, 1 bite)",
      "damage": "1d6/1d6/2d4/2d4",
      "specialAttacks": "Surprise (80% chance unseen against stone; 70% for dwarves/gnomes)",
      "specialDefenses": "+1 or better weapon to hit",
      "magicResistance": "Standard",
      "lairProbability": "30%",
      "intelligence": "Low",
      "alignment": "Chaotic evil",
      "levelXP": "5/350+6/hp",
      "description": "A particularly horrid form of gargoyle found in natural caves and caverns. Flesh so similar to stone that 80% chance (70% for dwarves/gnomes) of being unseen when lurking against stone. Always surprises when unseen. Can only be wounded by magical weapons. Despite low intelligence, will gather valuables—particularly weapons or magical items that could hurt them. Sometimes (20%) found as leaders and masters of gargoyles. Speak gargoyle language and their own."
    },
    {
      "name": "Olive Slime",
      "category": "Plant",
      "source": "S4 Lost Caverns of Tsojcanth",
      "frequency": "Very rare",
      "numberAppearing": "1d4",
      "size": "Small",
      "move": "0 ft",
      "armorClass": 9,
      "hitDice": "2+2",
      "TREASURE TYPE": "Nil",
      "attacks": 1,
      "damage": "Nil (parasitic attachment)",
      "specialAttacks": "Parasitic attachment (numbing poison, save vs. Poison or unaware); host metamorphosis into slime creature in 1d6+6 days",
      "specialDefenses": "Only harmed by acid, cold, fire, or cure disease; affected by plant-affecting spells",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Non- (special)",
      "alignment": "Neutral",
      "levelXP": "5/330+3/hp",
      "specialAbilities": {
        "attachment": "Drops on passing creatures; save vs. Poison or fail to notice attachment",
        "mindControl": "After 1 turn, victim's mind affected—protects slime, refuses to remove clothing in front of others",
        "hostNeeds": "Victim must eat double food or lose 10% of original hp per day",
        "metamorphosis": "After 1d6+6 days, host transforms into a slime creature (more plant than human)",
        "cureRequired": "After 1 turn of attachment, cure disease needed to stop metamorphosis even if slime killed by other means",
        "mutualDestruction": "Green slime and olive slime attack and kill each other"
      },
      "description": "Monstrous plant life similar to green slime but worse. Grows in subterranean areas, feeds on animal, vegetable, or metallic substances. Drops on passing creatures' backs, secreting numbing poison on contact. In humans, usually attaches along the spine. Sends parasitic tendrils to feed on host fluids. Gradually replaces skin tissue and flesh, forms brain attachment. New creature exists as a new species, feeds by photosynthesis or parasitism. Upon death, generates new patch of olive slime."
    },
    {
      "name": "Pech",
      "category": "Humanoid",
      "source": "S4 Lost Caverns of Tsojcanth",
      "frequency": "Rare",
      "numberAppearing": "5d4 (lair 10d4)",
      "size": "Small (4 ft tall)",
      "move": "90 ft",
      "armorClass": 3,
      "hitDice": 4,
      "TREASURE TYPE": "See below",
      "attacks": 1,
      "damage": "By weapon +3",
      "specialAttacks": "Maximum damage vs stone/earth monsters; group spells",
      "specialDefenses": "Immune to petrification; 25% magic resistance; flesh nearly as hard as granite",
      "magicResistance": "25%",
      "lairProbability": "5%",
      "intelligence": "Average to exceptional",
      "alignment": "Neutral good",
      "levelXP": "4/240+4/hp",
      "specialAbilities": {
        "spellLikeAbilities": {
          "fourPerDay": ["Stone shape", "Stone tell"],
          "groupSpells": {
            "fourPech": "Wall of stone (once per day per group)",
            "eightPech": "Stone to flesh (once per day per group)"
          },
          "spellLevel": "16th level"
        },
        "combatBonus": "+3 damage due to strength; always maximum damage vs stone/earth-based monsters",
        "senses": "Infravision 60 ft, ultravision",
        "languages": ["Dwarvish", "Gnomish", "Goblin", "Common (smattering)", "Pech"]
      },
      "treasure": {
        "lair": "50-100 gems, 5d6 jewelry/ornamental dishes (stone and raw metal, 100-1,000 gp base value, ~150 gp weight each)"
      },
      "description": "Thin beings of dwarven stature with long arms and legs, broad feet and hands, pale yellowish skin, red or reddish-brown hair, large pupilless eyes. Flesh nearly as hard as granite. Possibly from the Elemental Plane of Earth. Marvellous workers of stone. Basically good, want to be left alone. Hate bright light and open skies. Lair contains males, equal females, and 20-50% young of female count. Use great picks and hammers."
    },
    {
      "name": "Pudding, Deadly",
      "category": "Ooze",
      "source": "S4 Lost Caverns of Tsojcanth",
      "variants": [
        {
          "type": "Brown",
          "frequency": "Uncommon",
          "numberAppearing": "1 or 1d4",
          "size": "Small to Large (3-8 ft diameter)",
          "move": "60 ft",
          "armorClass": 5,
          "hitDice": 11,
          "attacks": 1,
          "damage": "5d4",
          "specialAttacks": "Destroys leather and wood in 1 round (regardless of magic)",
          "specialDefenses": "Immune to acid, cold, poison; lightning/blows divide into smaller living puddings; fire/magic missiles cause normal damage",
          "levelXP": "8/1,600+16/hp",
          "habitat": "Marsh and swampy areas",
          "description": "Tougher skin but less effective attack than other deadly puddings. Does not dissolve metal but destroys leather or wood in one round regardless of magical plusses."
        },
        {
          "type": "Dun",
          "frequency": "Rare",
          "numberAppearing": "1 or 1d3",
          "size": "Small to Large (3-8 ft diameter)",
          "move": "120 ft",
          "armorClass": 7,
          "hitDice": "8+1",
          "attacks": 1,
          "damage": "4d6",
          "specialAttacks": "Dissolves leather/wood in 1 round, chain in 2 rounds, plate in 4 rounds (regardless of magic)",
          "specialDefenses": "Immune to acid, cold, poison; lightning/blows divide into smaller living puddings; fire/magic missiles cause normal damage",
          "levelXP": "8/1,000+12/hp",
          "habitat": "Barren or desert land",
          "description": "Scavengers in barren or desert land, feeding on silicates if no animal or vegetable food available. Dissolves leather and wood in one round, chain mail in two, plate mail in four, regardless of magical bonuses."
        },
        {
          "type": "White",
          "frequency": "Rare",
          "numberAppearing": "1 or 1d3",
          "size": "Small to Large (3-8 ft diameter)",
          "move": "90 ft",
          "armorClass": 8,
          "hitDice": 9,
          "attacks": 1,
          "damage": "7d4",
          "specialAttacks": "Destroys wood and leather (as other deadly puddings); does not affect metals",
          "specialDefenses": "Immune to acid, cold, poison; lightning/blows divide into smaller living puddings; fire/magic missiles cause normal damage",
          "levelXP": "8/1,000+12/hp",
          "habitat": "Polar areas",
          "description": "Cold-dwelling creatures, 50% likely to be mistaken for snow and ice even under good visibility. Can survive on ice or snow if no other food available. Does not affect metals but destroys wood and leather as other deadly puddings."
        }
      ],
      "TREASURE TYPE": "Nil",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Non-",
      "alignment": "Neutral",
      "description": "Varieties of the black (deadly) pudding. All can flow through 1-inch cracks, travel on walls and ceilings. All are immune to acid, cold, and poison. Lightning or weapon blows divide them into smaller living puddings. Fire or magic missiles cause normal damage."
    },
    {
      "name": "Slime Creature",
      "category": "Plant",
      "source": "S4 Lost Caverns of Tsojcanth",
      "frequency": "Rare",
      "numberAppearing": "1d20",
      "size": "Small, Medium, or Large",
      "move": "60 ft",
      "armorClass": 9,
      "hitDice": "3+2 / 5+2 / 8+2",
      "TREASURE TYPE": "Nil",
      "attacks": 1,
      "damage": "1d4 (S) / 2d4 (M) / 4d4 (L)",
      "specialAttacks": "10% chance per hit of infecting opponent with olive slime",
      "specialDefenses": "Only harmed by acid, freezing cold, fire (magical only if water-dwelling), magic missiles, and plant-affecting spells",
      "magicResistance": "Standard",
      "lairProbability": "Nil",
      "intelligence": "Animal",
      "alignment": "Neutral",
      "levelXP": "Variable",
      "specialAbilities": {
        "telepathy": "Limited telepathic communication with own kind, 200 ft radius",
        "cunning": "Can learn from experience and use traps for self-protection"
      },
      "description": "Metamorphosed hosts of olive slime. Regardless of former existence, a slime creature is only small, medium, or large with variable HD and damage. Gather together for mutual assistance in feeding and defense. Equally at home on land or in warm shallow water. Vegetable intelligence of animal nature but cunning enables them to learn from experience."
    },
    {
      "name": "Troll, Marine",
      "category": "Giants",
      "source": "S4 Lost Caverns of Tsojcanth",
      "name_variants": "Scrag",
      "variants": [
        {
          "type": "Fresh Water",
          "frequency": "Rare",
          "numberAppearing": "1d6",
          "size": "Medium (7+ ft tall)",
          "move": "30 ft; 150 ft swimming",
          "armorClass": 3,
          "hitDice": "5+5",
          "TREASURE TYPE": "C",
          "attacks": 3,
          "damage": "1d4+1/1d4+1/1d10+2",
          "specialAttacks": "Can attack up to 3 different opponents per round",
          "specialDefenses": "Regeneration (3 hp/round, only when immersed in water)",
          "levelXP": "5/400+8/hp",
          "description": "Smaller than normal trolls with heavy scales. Less formidable claws but enlarged lower jaws with many small sharp fangs. Coloration blue-green to olive."
        },
        {
          "type": "Salt Water",
          "frequency": "Uncommon",
          "numberAppearing": "1d8",
          "size": "Large (10 ft tall)",
          "move": "30 ft; 120 ft swimming",
          "armorClass": "2 (10% have shell/sharkskin armor for AC 1)",
          "hitDice": "6+12",
          "TREASURE TYPE": "D",
          "attacks": 3,
          "damage": "1d4/1d4/1d8+8",
          "specialAttacks": "Huge maw with numerous fangs",
          "specialDefenses": "Regeneration (3 hp/round, only when in water)",
          "levelXP": "6/900+12/hp",
          "description": "At least as large as normal trolls. Thick heavily scaled skin. Shorter weaker forelimbs but massive maw and numerous fangs. 10% intelligent enough to wear shell/sharkskin armor (AC 1). Coloration blue-green to olive."
        }
      ],
      "magicResistance": "Standard",
      "lairProbability": "20% (fresh) / 15% (salt)",
      "intelligence": "Semi- to low (fresh) / Low to average (salt)",
      "alignment": "Chaotic evil",
      "description": "Gilled forms of the common troll inhabiting large bodies of water. They regenerate only when immersed in water. Coloration runs from blue-green to olive."
    },
    {
      "name": "Wolfwere",
      "category": "Lycanthrope",
      "source": "S4 Lost Caverns of Tsojcanth",
      "frequency": "Rare",
      "numberAppearing": "1d3",
      "size": "Medium",
      "move": "150 ft",
      "armorClass": 3,
      "hitDice": "5+1",
      "TREASURE TYPE": "S, 50% of S, T",
      "attacks": "1 bite (2d6) + possible weapon",
      "damage": "2d6 + by weapon",
      "specialAttacks": "Song (slow effect for 5-8 rounds, save vs. Spell; takes effect after 1 round of listening)",
      "specialDefenses": "Only hit by cold-wrought iron or +1 or better weapons",
      "magicResistance": "10%",
      "lairProbability": "35%",
      "intelligence": "High to exceptional",
      "alignment": "Chaotic evil",
      "levelXP": "6/550+6/hp",
      "specialAbilities": {
        "shapeChange": "Can take form of a human of considerable charisma",
        "halfChange": "Can gain human-like arms/legs while retaining wolf form to wield weapons",
        "song": "After 1 round of listening, victims save vs. Spell or affected by lethargy (as slow spell) for 5-8 rounds; cannot be countered once in effect",
        "packLeader": "75% chance of running with normal wolves (30%) or worgs (70%)",
        "tactics": "Slips away to don human garb and approach as pilgrim, minstrel, or tinker"
      },
      "description": "The reverse of a werewolf—a wolf that can take human form. Inhabits out-of-the-way places, slyly hunts and devours humans, halflings, elves, and similar prey. Powerful jaws deliver terrible bites. Can half-change to wield weapons while biting. Most feared for its lethargy-inducing song, often disguised as a minstrel. Great enmity with werewolves. Disgusted by wolfsbane."
    },
    {
      "name": "Xag-Ya",
      "category": "Extraplanar",
      "source": "S4 Lost Caverns of Tsojcanth",
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Medium",
      "move": "60 ft",
      "armorClass": 0,
      "hitDice": "5 to 8",
      "TREASURE TYPE": "Nil",
      "attacks": "1 touch",
      "damage": "1d6+6",
      "specialAttacks": "Energy bolt (10 ft, every other round, same effect as touch); touch ignites flammables, melts normal metal, heats magical metal (save vs. Lightning or destroyed)",
      "specialDefenses": "+1 or better weapon to hit; 15% magic resistance",
      "magicResistance": "15%",
      "lairProbability": "Nil",
      "intelligence": "High (alien)",
      "alignment": "Neutral",
      "levelXP": "Variable",
      "psionicAbility": "120 + 10d6, Attack/Defense: All/All",
      "specialAbilities": {
        "touch": "1d6+6 damage; energy surge ignites parchment/cloth/wood, melts normal metal, heats magical metal (save vs. Lightning or destroyed)",
        "bolt": "10 ft range, every other round, same effect as touch",
        "heatedMetal": "Persons carrying heated metal take 1d4 damage per round until dropped",
        "vulnerabilities": ["Disintegrate (normal)", "Magic missile (normal)", "Cold-based spells (normal)", "Shield spell (blocks bolt)", "Protection from evil (keeps at bay)"],
        "banishment": ["Abjure", "Alter reality", "Banishment", "Dismissal", "Holy word", "Limited wish", "Plane shift", "Wish", "Dispel magic (vs 2x HD level)"],
        "guardian": "Can be ensnared and linked to guarded objects; appears and attacks all within 30 ft when object disturbed",
        "deathBurst": "Slaying releases 2d6+12 damage in 10 ft radius (save vs. Death for half)",
        "xegYiMeeting": "If meets xeg-yi, both rush together and explode: 4d6+24 damage to all within 30 ft (save vs. Death for half)"
      },
      "description": "Creatures from the Positive Material Plane. Silvery spheres with tentacle-like appendages and glowing golden eyes. High but alien intelligence. Mortal enemies of xeg-yi. Often used as guardians of magic, ensnared and linked to guarded objects. Thaumaturgic triangle keeps them at bay. Rod of absorption or wand of negation cancels their attack without harm to item."
    },
    {
      "name": "Xeg-Yi",
      "category": "Extraplanar",
      "source": "S4 Lost Caverns of Tsojcanth",
      "frequency": "Very rare",
      "numberAppearing": "1",
      "size": "Medium",
      "move": "60 ft",
      "armorClass": 0,
      "hitDice": "5 to 8",
      "TREASURE TYPE": "Nil",
      "attacks": "1 touch",
      "damage": "1d6+6",
      "specialAttacks": "Chilling bolt (10 ft, every other round, same effect as touch); touch rots soft materials, corrodes metal (magical metal saves vs. Lightning or destroyed)",
      "specialDefenses": "+1 or better weapon to hit; 15% magic resistance",
      "magicResistance": "15%",
      "lairProbability": "Nil",
      "intelligence": "High (alien)",
      "alignment": "Neutral",
      "levelXP": "Variable",
      "psionicAbility": "120 + 10d6, Attack/Defense: All/All",
      "specialAbilities": {
        "touch": "1d6+6 damage; chilling rots soft/flammable materials, corrodes normal metal instantly, magical metal saves vs. Lightning or destroyed",
        "bolt": "10 ft range, every other round, same effect as touch",
        "chilledMetal": "Persons carrying chilled metal take 1d4 damage per round until dropped",
        "vulnerabilities": ["Disintegrate (normal)", "Magic missile (normal)", "Cold-based spells (normal)", "Shield spell (blocks bolt)", "Protection from evil (keeps at bay)"],
        "banishment": ["Abjure", "Alter reality", "Banishment", "Dismissal", "Holy word", "Limited wish", "Plane shift", "Wish", "Dispel magic (vs 2x HD level)"],
        "guardian": "Can be ensnared and linked to guarded objects; appears and attacks all within 30 ft when object disturbed",
        "deathBurst": "Slaying releases 2d6+12 damage in 10 ft radius (save vs. Death for half)",
        "xagYaMeeting": "If meets xag-ya, both rush together and explode: 4d6+24 damage to all within 30 ft (save vs. Death for half)"
      },
      "description": "Creatures from the Negative Material Plane. Black spheres with tentacle-like appendages and dull metallic black eyes. High but alien intelligence. Mortal enemies of xag-ya. Often used as guardians of magic, ensnared and linked to guarded objects. Thaumaturgic triangle keeps them at bay. Mace of disruption or rod of cancellation cancels their energy draining bolt without harm to item."
    },
    // end of monsters
  ]
}
// end of file
 

// ─── from scripts/data/dmg-outdoor-tables.js ─────────────────────────────────────────────────
// scripts/data/dmg-outdoor-tables.js

const DMG_OUTDOOR_TIMING_RULES = {
  'forest': ['morning', 'noon', 'evening', 'night', 'midnight', 'predawn'],
  'marsh': ['morning', 'noon', 'evening', 'night', 'midnight', 'predawn'],
  'plain': ['morning', 'evening', 'midnight'],
  'hills': ['noon', 'night', 'predawn'],
  'mountains': ['morning', 'night'],
  'desert': ['morning', 'night', 'predawn'],
  'scrub': ['morning', 'evening', 'night', 'predawn']
};

const DMG_ENCOUNTER_FREQUENCY = {
  // DMG p.47 "Chance Of Encounter" labels:
  //   relatively dense              → 1 in 20
  //   moderate to sparse/patrolled  → 1 in 12
  //   uninhabited/wilderness        → 1 in 10
  'uninhabited': { die: 10, successOn: 1 },
  'patrolled':   { die: 12, successOn: 1 },
  'dense':       { die: 20, successOn: 1 },
};

// Complete DMG Temperate/Subtropical Tables
const DMG_TEMPERATE_UNINHABITED = {
  plain: [
    {min: 1, max: 1, creature: "Ant, giant", number: "1-4"},
    {min: 2, max: 2, creature: "Bear, brown", number: "1-4"},
    {min: 3, max: 3, creature: "Blink dog", number: "2-5"},
    {min: 4, max: 4, creature: "Boar, wild", number: "1-4"},
    {min: 5, max: 5, creature: "Bugbear", number: "2-7"},
    {min: 6, max: 9, creature: "Bull/Cattle, wild", number: "3d6"},
    {min: 10, max: 10, creature: "Demi-human", subtable: "demi_human", number: "2d6"},
    {min: 11, max: 12, creature: "Dog, wild", number: "2d4"},
    {min: 13, max: 14, creature: "Dragon", subtable: "dragon", number: "1"},
    {min: 15, max: 15, creature: "Eagle, giant", number: "1d3"},
    {min: 16, max: 16, creature: "Elephant", number: "2d4"},
    {min: 17, max: 18, creature: "Giant", subtable: "giant", number: "1d2"},
    {min: 19, max: 19, creature: "Griffon", number: "1d4"},
    {min: 20, max: 25, creature: "Herd animal", number: "3d10"},
    {min: 26, max: 27, creature: "Hippogriff", number: "1d6"},
    {min: 28, max: 30, creature: "Horse, wild", number: "1d8"},
    {min: 31, max: 33, creature: "Humanoid", subtable: "humanoid", number: "2d6"},
    {min: 34, max: 38, creature: "Jackal", number: "1d6"},
    {min: 39, max: 39, creature: "Ki-rin/Lammasu/Shedu", number: "1", note: "Choose or roll"},
    {min: 40, max: 49, creature: "Lion", number: "1d8"},
    {min: 50, max: 50, creature: "Lycanthrope", subtable: "lycanthrope", number: "1d4"},
    {min: 51, max: 70, creature: "Men", subtable: "men", number: "3d6"},
    {min: 71, max: 74, creature: "Ogre", number: "1d6"},
    {min: 75, max: 75, creature: "Owl, giant", number: "1d6"},
    {min: 76, max: 77, creature: "Pegasus", number: "1d12"},
    {min: 78, max: 78, creature: "Snake", subtable: "snake", number: "1"},
    {min: 79, max: 80, creature: "Spider", subtable: "spider", number: "1d4"},
    {min: 81, max: 81, creature: "Stag", number: "3d6"},
    {min: 82, max: 82, creature: "Toad, giant", number: "1d4"},
    {min: 83, max: 84, creature: "Troll", number: "1d6"},
    {min: 85, max: 86, creature: "Wasp, giant", number: "1d6"},
    {min: 87, max: 87, creature: "Weasel, giant", number: "1d4"},
    {min: 88, max: 97, creature: "Wolf", number: "2d6"},
    {min: 98, max: 100, creature: "Wolf, worg", number: "1d4+1"}
  ],

  forest: [
    {min: 1, max: 1, creature: "Ant, giant", number: "1-4"},
    {min: 2, max: 2, creature: "Badger", number: "1-4"},
    {min: 3, max: 4, creature: "Bear, brown", number: "1-4"},
    {min: 5, max: 5, creature: "Beetle, bombardier", number: "2d4"},
    {min: 6, max: 6, creature: "Beetle, stag", number: "3d4"},
    {min: 7, max: 7, creature: "Blink dog", number: "2-5"},
    {min: 8, max: 8, creature: "Boar, wild", number: "1-4"},
    {min: 9, max: 9, creature: "Bugbear", number: "2-7"},
    {min: 10, max: 10, creature: "Bull/Cattle, wild", number: "3d6"},
    {min: 11, max: 11, creature: "Demi-human", subtable: "demi_human", number: "2d6"},
    {min: 12, max: 12, creature: "Displacer beast", number: "1-2"},
    {min: 13, max: 13, creature: "Dog, wild", number: "2d4"},
    {min: 14, max: 14, creature: "Dragon", subtable: "dragon", number: "1"},
    {min: 15, max: 15, creature: "Eagle, giant", number: "1d3"},
    {min: 16, max: 16, creature: "Giant", subtable: "giant", number: "1d2"},
    {min: 17, max: 17, creature: "Griffon", number: "1d4"},
    {min: 18, max: 20, creature: "Herd animal", number: "3d10"},
    {min: 21, max: 22, creature: "Hippogriff", number: "1d6"},
    {min: 23, max: 25, creature: "Horse, wild", number: "1d8"},
    {min: 26, max: 30, creature: "Humanoid", subtable: "humanoid", number: "2d6"},
    {min: 31, max: 31, creature: "Ki-rin/Lammasu/Shedu", number: "1"},
    {min: 32, max: 32, creature: "Leprechaun/Brownie", number: "4d4"},
    {min: 33, max: 35, creature: "Lion", number: "1d8"},
    {min: 36, max: 36, creature: "Lizard, giant", number: "1d3"},
    {min: 37, max: 38, creature: "Lycanthrope", subtable: "lycanthrope", number: "1d4"},
    {min: 39, max: 40, creature: "Lynx, giant", number: "1d4"},
    {min: 41, max: 50, creature: "Men", subtable: "men", number: "3d6"},
    {min: 51, max: 55, creature: "Ogre", number: "1d6"},
    {min: 56, max: 58, creature: "Owl, giant", number: "1d6"},
    {min: 59, max: 60, creature: "Owlbear", number: "1d4"},
    {min: 61, max: 63, creature: "Porcupine/Skunk", number: "1d8"},
    {min: 64, max: 65, creature: "Pseudo-dragon", number: "1d4"},
    {min: 66, max: 66, creature: "Shambling mound", number: "1d4"},
    {min: 67, max: 68, creature: "Snake", subtable: "snake", number: "1"},
    {min: 69, max: 70, creature: "Sphinx", subtable: "sphinx", number: "1"},
    {min: 71, max: 73, creature: "Spider", subtable: "spider", number: "1d4"},
    {min: 74, max: 76, creature: "Stag", number: "3d6"},
    {min: 77, max: 78, creature: "Tick, giant", number: "1d3"},
    {min: 79, max: 79, creature: "Toad, giant", number: "1d4"},
    {min: 80, max: 84, creature: "Treant", number: "1d4"},
    {min: 85, max: 85, creature: "Troll", number: "1d6"},
    {min: 86, max: 87, creature: "Undead", subtable: "undead", number: "varies"},
    {min: 88, max: 88, creature: "Wasp, giant", number: "1d6"},
    {min: 89, max: 89, creature: "Weasel, giant", number: "1d4"},
    {min: 90, max: 90, creature: "Will-o-wisp", number: "1d4"},
    {min: 91, max: 97, creature: "Wolf", number: "2d6"},
    {min: 98, max: 100, creature: "Wolf, worg", number: "1d4+1"}
  ],

  hills: [
    {min: 1, max: 1, creature: "Ant, giant", number: "1-4"},
    {min: 2, max: 3, creature: "Bear, brown", number: "1-4"},
    {min: 4, max: 4, creature: "Blink dog", number: "2-5"},
    {min: 5, max: 8, creature: "Bugbear", number: "2-7"},
    {min: 9, max: 9, creature: "Bull/Cattle, wild", number: "3d6"},
    {min: 10, max: 20, creature: "Demi-human", subtable: "demi_human", number: "2d6"},
    {min: 21, max: 22, creature: "Dog, wild", number: "2d4"},
    {min: 23, max: 24, creature: "Dragon", subtable: "dragon", number: "1"},
    {min: 25, max: 25, creature: "Eagle, giant", number: "1d3"},
    {min: 26, max: 27, creature: "Giant", subtable: "giant", number: "1d2"},
    {min: 28, max: 30, creature: "Goat, giant", number: "1d8"},
    {min: 31, max: 32, creature: "Griffon", number: "1d4"},
    {min: 33, max: 35, creature: "Herd animal", number: "3d10"},
    {min: 36, max: 37, creature: "Hippogriff", number: "1d6"},
    {min: 38, max: 39, creature: "Horse, wild", number: "1d8"},
    {min: 40, max: 50, creature: "Humanoid", subtable: "humanoid", number: "2d6"},
    {min: 51, max: 51, creature: "Ki-rin/Lammasu/Shedu", number: "1"},
    {min: 52, max: 53, creature: "Leprechaun/Brownie", number: "4d4"},
    {min: 54, max: 55, creature: "Lion", number: "1d8"},
    {min: 56, max: 58, creature: "Lycanthrope", subtable: "lycanthrope", number: "1d4"},
    {min: 59, max: 70, creature: "Men", subtable: "men", number: "3d6"},
    {min: 71, max: 75, creature: "Ogre", number: "1d6"},
    {min: 76, max: 76, creature: "Owl, giant", number: "1d6"},
    {min: 77, max: 77, creature: "Pegasus", number: "1d12"},
    {min: 78, max: 78, creature: "Porcupine/Skunk", number: "1d8"},
    {min: 79, max: 79, creature: "Snake", subtable: "snake", number: "1"},
    {min: 80, max: 81, creature: "Sphinx", subtable: "sphinx", number: "1"},
    {min: 82, max: 83, creature: "Spider", subtable: "spider", number: "1d4"},
    {min: 84, max: 87, creature: "Stag", number: "3d6"},
    {min: 88, max: 88, creature: "Toad, giant", number: "1d4"},
    {min: 89, max: 89, creature: "Troll", number: "1d6"},
    {min: 90, max: 91, creature: "Undead", subtable: "undead", number: "varies"},
    {min: 92, max: 92, creature: "Wasp, giant", number: "1d6"},
    {min: 93, max: 93, creature: "Weasel, giant", number: "1d4"},
    {min: 94, max: 98, creature: "Wolf", number: "2d6"},
    {min: 99, max: 100, creature: "Wolf, worg", number: "1d4+1"}
  ],

  mountains: [
    {min: 1, max: 1, creature: "Ant, giant", number: "1-4"},
    {min: 2, max: 3, creature: "Bear, brown", number: "1-4"},
    {min: 4, max: 5, creature: "Bugbear", number: "2-7"},
    {min: 6, max: 7, creature: "Demi-human", subtable: "demi_human", number: "2d6"},
    {min: 8, max: 8, creature: "Displacer beast", number: "1-2"},
    {min: 9, max: 9, creature: "Dog, wild", number: "2d4"},
    {min: 10, max: 11, creature: "Dragon", subtable: "dragon", number: "1"},
    {min: 12, max: 12, creature: "Dragonne", number: "1d4"},
    {min: 13, max: 14, creature: "Eagle, giant", number: "1d3"},
    {min: 15, max: 15, creature: "Gargoyle", number: "2d6"},
    {min: 16, max: 16, creature: "Giant", subtable: "giant", number: "1d2"},
    {min: 17, max: 28, creature: "Giant", subtable: "giant", number: "1d2"},
    {min: 29, max: 29, creature: "Goat, giant", number: "1d8"},
    {min: 30, max: 30, creature: "Griffon", number: "1d4"},
    {min: 31, max: 32, creature: "Hippogriff", number: "1d6"},
    {min: 33, max: 40, creature: "Humanoid", subtable: "humanoid", number: "2d6"},
    {min: 41, max: 41, creature: "Ki-rin/Lammasu/Shedu", number: "1"},
    {min: 42, max: 42, creature: "Leucrotta", number: "1d4"},
    {min: 43, max: 45, creature: "Lycanthrope", subtable: "lycanthrope", number: "1d4"},
    {min: 46, max: 60, creature: "Men", subtable: "men", number: "3d6"},
    {min: 61, max: 65, creature: "Ogre", number: "1d6"},
    {min: 66, max: 66, creature: "Owl, giant", number: "1d6"},
    {min: 67, max: 67, creature: "Pegasus", number: "1d12"},
    {min: 68, max: 68, creature: "Snake", subtable: "snake", number: "1"},
    {min: 69, max: 72, creature: "Sphinx", subtable: "sphinx", number: "1"},
    {min: 73, max: 78, creature: "Troll", number: "1d6"},
    {min: 79, max: 83, creature: "Undead", subtable: "undead", number: "varies"},
    {min: 84, max: 86, creature: "Weasel, giant", number: "1d4"},
    {min: 87, max: 92, creature: "Will-o-wisp", number: "1d4"},
    {min: 93, max: 94, creature: "Wind walker", number: "1d8"},
    {min: 95, max: 96, creature: "Wolf", number: "2d6"},
    {min: 97, max: 100, creature: "Wolf, worg", number: "1d4+1"}
  ],

  desert: [
    {min: 1, max: 1, creature: "Blink dog", number: "2-5"},
    {min: 2, max: 5, creature: "Dog, wild", number: "2d4"},
    {min: 6, max: 7, creature: "Dragon", subtable: "dragon", number: "1"},
    {min: 8, max: 8, creature: "Dragonne", number: "1d4"},
    {min: 9, max: 9, creature: "Eagle, giant", number: "1d3"},
    {min: 10, max: 11, creature: "Griffon", number: "1d4"},
    {min: 12, max: 12, creature: "Herd animal", number: "3d10"},
    {min: 13, max: 14, creature: "Hippogriff", number: "1d6"},
    {min: 15, max: 19, creature: "Horse, wild", number: "1d8"},
    {min: 20, max: 28, creature: "Humanoid", subtable: "humanoid", number: "2d6"},
    {min: 29, max: 30, creature: "Ki-rin/Lammasu/Shedu", number: "1"},
    {min: 31, max: 40, creature: "Lion", number: "1d8"},
    {min: 41, max: 44, creature: "Lizard, giant", number: "1d3"},
    {min: 45, max: 69, creature: "Men", subtable: "men", number: "3d6"},
    {min: 70, max: 70, creature: "Owl, giant", number: "1d6"},
    {min: 71, max: 74, creature: "Pegasus", number: "1d12"},
    {min: 75, max: 79, creature: "Snake", subtable: "snake", number: "1"},
    {min: 80, max: 89, creature: "Sphinx", subtable: "sphinx", number: "1"},
    {min: 90, max: 93, creature: "Spider", subtable: "spider", number: "1d4"},
    {min: 94, max: 95, creature: "Wasp, giant", number: "1d6"},
    {min: 96, max: 100, creature: "Wolf", number: "2d6"}
  ],

  scrub: [
    {min: 1, max: 1, creature: "Ant, giant", number: "1-4"},
    {min: 2, max: 2, creature: "Bear, brown", number: "1-4"},
    {min: 3, max: 3, creature: "Blink dog", number: "2-5"},
    {min: 4, max: 5, creature: "Boar, wild", number: "1-4"},
    {min: 6, max: 6, creature: "Bugbear", number: "2-7"},
    {min: 7, max: 8, creature: "Bull/Cattle, wild", number: "3d6"},
    {min: 9, max: 9, creature: "Demi-human", subtable: "demi_human", number: "2d6"},
    {min: 10, max: 10, creature: "Dog, wild", number: "2d4"},
    {min: 11, max: 11, creature: "Dragon", subtable: "dragon", number: "1"},
    {min: 12, max: 13, creature: "Giant", subtable: "giant", number: "1d2"},
    {min: 14, max: 14, creature: "Griffon", number: "1d4"},
    {min: 15, max: 20, creature: "Herd animal", number: "3d10"},
    {min: 21, max: 22, creature: "Hippogriff", number: "1d6"},
    {min: 23, max: 25, creature: "Horse, wild", number: "1d8"},
    {min: 26, max: 32, creature: "Humanoid", subtable: "humanoid", number: "2d6"},
    {min: 33, max: 34, creature: "Jackal", number: "1d6"},
    {min: 35, max: 35, creature: "Ki-rin/Lammasu/Shedu", number: "1"},
    {min: 36, max: 40, creature: "Lion", number: "1d8"},
    {min: 41, max: 60, creature: "Men", subtable: "men", number: "3d6"},
    {min: 61, max: 65, creature: "Ogre", number: "1d6"},
    {min: 66, max: 66, creature: "Owl, giant", number: "1d6"},
    {min: 67, max: 67, creature: "Pegasus", number: "1d12"},
    {min: 68, max: 69, creature: "Porcupine/Skunk", number: "1d8"},
    {min: 70, max: 70, creature: "Pseudo-dragon", number: "1d4"},
    {min: 71, max: 71, creature: "Snake", subtable: "snake", number: "1"},
    {min: 72, max: 80, creature: "Spider", subtable: "spider", number: "1d4"},
    {min: 81, max: 85, creature: "Stag", number: "3d6"},
    {min: 86, max: 86, creature: "Tick, giant", number: "1d3"},
    {min: 87, max: 87, creature: "Toad, giant", number: "1d4"},
    {min: 88, max: 88, creature: "Troll", number: "1d6"},
    {min: 89, max: 89, creature: "Wasp, giant", number: "1d6"},
    {min: 90, max: 91, creature: "Weasel, giant", number: "1d4"},
    {min: 92, max: 97, creature: "Wolf", number: "2d6"},
    {min: 98, max: 100, creature: "Wolf, worg", number: "1d4+1"}
  ],

  marsh: [
    {min: 1, max: 1, creature: "Beholder", number: "1"},
    {min: 2, max: 2, creature: "Catoblepas", number: "1d4"},
    {min: 3, max: 5, creature: "Catoblepas", number: "1d4"},
    {min: 6, max: 6, creature: "Displacer beast", number: "1-2"},
    {min: 7, max: 7, creature: "Dragon", subtable: "dragon", number: "1"},
    {min: 8, max: 8, creature: "Eagle, giant", number: "1d3"},
    {min: 9, max: 15, creature: "Frog", subtable: "frog", number: "varies"},
    {min: 16, max: 16, creature: "Gargoyle", number: "2d6"},
    {min: 17, max: 30, creature: "Humanoid", subtable: "humanoid", number: "2d6"},
    {min: 31, max: 31, creature: "Ki-rin/Lammasu/Shedu", number: "1"},
    {min: 32, max: 32, creature: "Leucrotta", number: "1d4"},
    {min: 33, max: 36, creature: "Lizard, giant", number: "1d3"},
    {min: 37, max: 52, creature: "Men", subtable: "men", number: "3d6"},
    {min: 53, max: 53, creature: "Owl, giant", number: "1d6"},
    {min: 54, max: 54, creature: "Owlbear", number: "1d4"},
    {min: 55, max: 58, creature: "Shambling mound", number: "1d4"},
    {min: 59, max: 72, creature: "Snake", subtable: "snake", number: "1"},
    {min: 73, max: 78, creature: "Sphinx", subtable: "sphinx", number: "1"},
    {min: 79, max: 83, creature: "Toad, giant", number: "1d4"},
    {min: 84, max: 86, creature: "Troll", number: "1d6"},
    {min: 87, max: 92, creature: "Undead", subtable: "undead", number: "varies"},
    {min: 93, max: 94, creature: "Wasp, giant", number: "1d6"},
    {min: 95, max: 96, creature: "Weasel, giant", number: "1d4"},
    {min: 97, max: 100, creature: "Will-o-wisp", number: "1d4"}
  ]
};

// Inhabited/Patrolled Areas (simplified - patrol chance handled separately)
const DMG_TEMPERATE_INHABITED = {
  plain: [
    {min: 1, max: 2, creature: "Anhkheg", number: "1d6"},
    {min: 3, max: 5, creature: "Ant, giant", number: "1-4"},
    {min: 6, max: 6, creature: "Beetle, bombardier", number: "2d4"},
    {min: 7, max: 7, creature: "Beetle, stag", number: "3d4"},
    {min: 8, max: 10, creature: "Boar, wild", number: "1-4"},
    {min: 11, max: 11, creature: "Bulette", number: "1d2"},
    {min: 12, max: 12, creature: "Elf", number: "2d6"},
    {min: 13, max: 13, creature: "Giant, hill", number: "1d4"},
    {min: 14, max: 15, creature: "Gnoll", number: "2d6"},
    {min: 16, max: 16, creature: "Gnome", number: "2d6"},
    {min: 17, max: 18, creature: "Goblin", number: "4d6"},
    {min: 19, max: 19, creature: "Groaning spirit", number: "1"},
    {min: 20, max: 21, creature: "Halfling", number: "2d6"},
    {min: 22, max: 22, creature: "Hobgoblin", number: "2d6"},
    {min: 23, max: 23, creature: "Leprechaun", number: "4d4"},
    {min: 24, max: 24, creature: "Lycanthrope, weretiger", number: "1d4"},
    {min: 25, max: 26, creature: "Lycanthrope, werewolf", number: "1d4"},
    {min: 27, max: 27, creature: "Manticore", number: "1d2"},
    {min: 28, max: 32, creature: "Men, bandit", number: "2d6"},
    {min: 33, max: 34, creature: "Men, berserker", number: "1d6"},
    {min: 35, max: 38, creature: "Men, brigand", number: "2d6"},
    {min: 39, max: 40, creature: "Men, dervish", number: "2d6"},
    {min: 41, max: 68, creature: "Men, merchant", number: "3d6"},
    {min: 69, max: 70, creature: "Men, nomad", number: "3d10"},
    {min: 71, max: 80, creature: "Men, pilgrim", number: "3d6"},
    {min: 81, max: 83, creature: "Ogre", number: "1d6"},
    {min: 84, max: 87, creature: "Orc", number: "2d6"},
    {min: 88, max: 89, creature: "Rat, giant", number: "3d6"},
    {min: 90, max: 91, creature: "Skunk, giant", number: "1d6"},
    {min: 92, max: 92, creature: "Vampire", number: "1"},
    {min: 93, max: 100, creature: "Wolf", number: "2d6"}
  ],

  // ADD THESE MISSING TABLES:
  forest: [
    {min: 1, max: 2, creature: "Anhkheg", number: "1d6"},
    {min: 3, max: 4, creature: "Ant, giant", number: "1-4"},
    {min: 5, max: 7, creature: "Bear, black", number: "1-4"},
    {min: 8, max: 9, creature: "Beetle, bombardier", number: "2d4"},
    {min: 10, max: 11, creature: "Beetle, stag", number: "3d4"},
    {min: 12, max: 14, creature: "Boar, wild", number: "1-4"},
    {min: 15, max: 18, creature: "Elf", number: "2d6"},
    {min: 19, max: 19, creature: "Giant, hill", number: "1d4"},
    {min: 20, max: 20, creature: "Gnoll", number: "2d6"},
    {min: 21, max: 22, creature: "Gnome", number: "2d6"},
    {min: 23, max: 23, creature: "Goblin", number: "4d6"},
    {min: 24, max: 24, creature: "Halfling", number: "2d6"},
    {min: 25, max: 25, creature: "Hobgoblin", number: "2d6"},
    {min: 26, max: 26, creature: "Lycanthrope, werebear", number: "1d4"},
    {min: 27, max: 27, creature: "Lycanthrope, wereboar", number: "1d4"},
    {min: 28, max: 28, creature: "Lycanthrope, weretiger", number: "1d4"},
    {min: 29, max: 29, creature: "Lycanthrope, werewolf", number: "1d4"},
    {min: 30, max: 32, creature: "Men, bandit", number: "2d6"},
    {min: 33, max: 35, creature: "Men, berserker", number: "1d6"},
    {min: 36, max: 40, creature: "Men, brigand", number: "2d6"},
    {min: 41, max: 42, creature: "Men, dervish", number: "2d6"},
    {min: 43, max: 55, creature: "Men, merchant", number: "3d6"},
    {min: 56, max: 60, creature: "Men, pilgrim", number: "3d6"},
    {min: 61, max: 70, creature: "Ogre", number: "1d6"},
    {min: 71, max: 82, creature: "Orc", number: "2d6"},
    {min: 83, max: 85, creature: "Rat, giant", number: "3d6"},
    {min: 86, max: 91, creature: "Skunk, giant", number: "1d6"},
    {min: 92, max: 92, creature: "Vampire", number: "1"},
    {min: 93, max: 100, creature: "Wolf", number: "2d6"}
  ],

  mountains: [
    {min: 1, max: 2, creature: "Bear, black", number: "1-4"},
    {min: 3, max: 15, creature: "Dwarf", number: "2d6"},
    {min: 16, max: 17, creature: "Giant, hill", number: "1d4"},
    {min: 18, max: 19, creature: "Gnoll", number: "2d6"},
    {min: 20, max: 21, creature: "Gnome", number: "2d6"},
    {min: 22, max: 24, creature: "Goblin", number: "4d6"},
    {min: 25, max: 26, creature: "Hobgoblin", number: "2d6"},
    {min: 27, max: 27, creature: "Lycanthrope, werebear", number: "1d4"},
    {min: 28, max: 29, creature: "Lycanthrope, werewolf", number: "1d4"},
    {min: 30, max: 30, creature: "Manticore", number: "1d2"},
    {min: 31, max: 32, creature: "Men, bandit", number: "2d6"},
    {min: 33, max: 34, creature: "Men, berserker", number: "1d6"},
    {min: 35, max: 39, creature: "Men, brigand", number: "2d6"},
    {min: 40, max: 41, creature: "Men, dervish", number: "2d6"},
    {min: 42, max: 51, creature: "Men, merchant", number: "3d6"},
    {min: 52, max: 59, creature: "Men, pilgrim", number: "3d6"},
    {min: 60, max: 67, creature: "Ogre", number: "1d6"},
    {min: 68, max: 80, creature: "Orc", number: "2d6"},
    {min: 81, max: 87, creature: "Vampire", number: "1"},
    {min: 88, max: 89, creature: "Will-o-wisp", number: "1d4"},
    {min: 90, max: 100, creature: "Wolf", number: "2d6"}
  ],

  hills: [
    {min: 1, max: 1, creature: "Anhkheg", number: "1d6"},
    {min: 2, max: 2, creature: "Ant, giant", number: "1-4"},
    {min: 3, max: 5, creature: "Boar, wild", number: "1-4"},
    {min: 6, max: 6, creature: "Bulette", number: "1d2"},
    {min: 7, max: 8, creature: "Dwarf", number: "2d6"},
    {min: 9, max: 10, creature: "Elf", number: "2d6"},
    {min: 11, max: 15, creature: "Giant, hill", number: "1d4"},
    {min: 16, max: 17, creature: "Gnoll", number: "2d6"},
    {min: 18, max: 21, creature: "Gnome", number: "2d6"},
    {min: 22, max: 24, creature: "Goblin", number: "4d6"},
    {min: 25, max: 27, creature: "Halfling", number: "2d6"},
    {min: 28, max: 28, creature: "Hobgoblin", number: "2d6"},
    {min: 29, max: 30, creature: "Leprechaun", number: "4d4"},
    {min: 31, max: 31, creature: "Lycanthrope, werewolf", number: "1d4"},
    {min: 32, max: 32, creature: "Manticore", number: "1d2"},
    {min: 33, max: 36, creature: "Men, bandit", number: "2d6"},
    {min: 37, max: 38, creature: "Men, berserker", number: "1d6"},
    {min: 39, max: 44, creature: "Men, brigand", number: "2d6"},
    {min: 45, max: 46, creature: "Men, dervish", number: "2d6"},
    {min: 47, max: 60, creature: "Men, merchant", number: "3d6"},
    {min: 61, max: 62, creature: "Men, nomad", number: "3d10"},
    {min: 63, max: 67, creature: "Men, pilgrim", number: "3d6"},
    {min: 68, max: 75, creature: "Ogre", number: "1d6"},
    {min: 76, max: 85, creature: "Orc", number: "2d6"},
    {min: 86, max: 88, creature: "Rat, giant", number: "3d6"},
    {min: 89, max: 90, creature: "Skunk, giant", number: "1d6"},
    {min: 91, max: 100, creature: "Wolf", number: "2d6"}
  ],

  // Add desert, scrub, marsh similarly...
  desert: [
    {min: 1, max: 3, creature: "Gnoll", number: "2d6"},
    {min: 4, max: 12, creature: "Men, bandit", number: "2d6"},
    {min: 13, max: 14, creature: "Men, berserker", number: "1d6"},
    {min: 15, max: 19, creature: "Men, brigand", number: "2d6"},
    {min: 20, max: 30, creature: "Men, dervish", number: "2d6"},
    {min: 31, max: 56, creature: "Men, merchant", number: "3d6"},
    {min: 57, max: 76, creature: "Men, nomad", number: "3d10"},
    {min: 77, max: 84, creature: "Men, pilgrim", number: "3d6"},
    {min: 85, max: 94, creature: "Orc", number: "2d6"},
    {min: 95, max: 95, creature: "Vampire", number: "1"},
    {min: 96, max: 100, creature: "Wolf", number: "2d6"}
  ],

  scrub: [
  {min: 1, max: 1, creature: "Ant, giant", number: "1-4"},
  {min: 2, max: 2, creature: "Beetle, bombardier", number: "2d4"},
  {min: 3, max: 4, creature: "Bear, black", number: "1-4"},
  {min: 5, max: 5, creature: "Beetle, bombardier", number: "2d4"},
  {min: 6, max: 6, creature: "Beetle, stag", number: "3d4"},
  {min: 7, max: 8, creature: "Boar, wild", number: "1-4"},
  {min: 9, max: 9, creature: "Bulette", number: "1d2"},
  {min: 10, max: 11, creature: "Elf", number: "2d6"},
  {min: 12, max: 12, creature: "Giant, hill", number: "1d4"},
  {min: 13, max: 13, creature: "Gnoll", number: "2d6"},
  {min: 14, max: 14, creature: "Groaning spirit", number: "1"},
  {min: 15, max: 15, creature: "Halfling", number: "2d6"},
  {min: 16, max: 17, creature: "Hobgoblin", number: "2d6"},
  {min: 18, max: 19, creature: "Lycanthrope, wereboar", number: "1d4"},
  {min: 20, max: 20, creature: "Lycanthrope, wererat", number: "1d4"},
  {min: 21, max: 21, creature: "Lycanthrope, weretiger", number: "1d4"},
  {min: 22, max: 22, creature: "Manticore", number: "1d2"},
  {min: 23, max: 27, creature: "Men, bandit", number: "2d6"},
  {min: 28, max: 29, creature: "Men, berserker", number: "1d6"},
  {min: 30, max: 34, creature: "Men, brigand", number: "2d6"},
  {min: 35, max: 36, creature: "Men, dervish", number: "2d6"},
  {min: 37, max: 56, creature: "Men, merchant", number: "3d6"},
  {min: 57, max: 58, creature: "Men, nomad", number: "3d10"},
  {min: 59, max: 69, creature: "Men, pilgrim", number: "3d6"},
  {min: 70, max: 76, creature: "Ogre", number: "1d6"},
  {min: 77, max: 86, creature: "Orc", number: "2d6"},
  {min: 87, max: 89, creature: "Rat, giant", number: "3d6"},
  {min: 90, max: 91, creature: "Skunk, giant", number: "1d6"},
  {min: 92, max: 100, creature: "Wolf", number: "2d6"}
],

marsh: [
  {min: 1, max: 5, creature: "Bear, black", number: "1-4"},
  {min: 6, max: 8, creature: "Boar, wild", number: "1-4"},
  {min: 9, max: 10, creature: "Ghoul", number: "2d8"},
  {min: 11, max: 13, creature: "Gnoll", number: "2d6"},
  {min: 14, max: 14, creature: "Groaning spirit", number: "1"},
  {min: 15, max: 15, creature: "Hobgoblin", number: "2d6"},
  {min: 16, max: 16, creature: "Lycanthrope, wererat", number: "1d4"},
  {min: 17, max: 17, creature: "Lycanthrope, werewolf", number: "1d4"},
  {min: 18, max: 19, creature: "Manticore", number: "1d2"},
  {min: 20, max: 22, creature: "Men, bandit", number: "2d6"},
  {min: 23, max: 24, creature: "Men, berserker", number: "1d6"},
  {min: 25, max: 29, creature: "Men, brigand", number: "2d6"},
  {min: 30, max: 31, creature: "Men, pilgrim", number: "3d6"},
  {min: 32, max: 40, creature: "Ogre", number: "1d6"},
  {min: 41, max: 60, creature: "Orc", number: "2d6"},
  {min: 61, max: 75, creature: "Rat, giant", number: "3d6"},
  {min: 76, max: 80, creature: "Vampire", number: "1"},
  {min: 81, max: 100, creature: "Will-o-wisp", number: "1d4"}
]
};

// Climate-specific tables
const DMG_ARCTIC_CONDITIONS = {
  plain: [
    {min: 1, max: 10, creature: "Bear, brown", number: "1d4", note: "Polar bear variant"},
    {min: 11, max: 12, creature: "Dragon, white", number: "1"},
    {min: 13, max: 15, creature: "Giant, frost", number: "1d3"},
    {min: 16, max: 55, creature: "Herd animal", number: "3d10"},
    {min: 56, max: 65, creature: "Men, tribesmen", number: "3d10"},
   {min: 66, max: 70, creature: "Owl, giant", number: "1d6"},
   {min: 71, max: 72, creature: "Remorhaz", number: "1d2"},
   {min: 73, max: 74, creature: "Snake, giant, constrictor", number: "1", note: "White-furred variant"},
   {min: 75, max: 80, creature: "Toad, ice", number: "1d4"},
   {min: 81, max: 90, creature: "Wolf", number: "2d6"},
   {min: 91, max: 95, creature: "Wolf, winter", number: "1d6"},
   {min: 96, max: 100, creature: "Yeti", number: "1d6"}
 ]
};

const DMG_SUBARCTIC_CONDITIONS = {
 plain: [
   {min: 1, max: 5, creature: "Dragon, white", number: "1"},
   {min: 6, max: 10, creature: "Giant, frost", number: "1d3"},
   {min: 11, max: 15, creature: "Gnoll", number: "2d6"},
   {min: 16, max: 40, creature: "Herd animal", number: "3d10"},
   {min: 41, max: 45, creature: "Mammoth", number: "2d4"},
   {min: 46, max: 55, creature: "Mastodon", number: "1d8"},
   {min: 56, max: 65, creature: "Men, tribesmen", number: "3d10"},
   {min: 66, max: 70, creature: "Owl, giant", number: "1d6"},
   {min: 71, max: 80, creature: "Rhino, woolly", number: "1d6"},
   {min: 81, max: 90, creature: "Tiger", number: "1d4"},
   {min: 91, max: 100, creature: "Wolf", number: "2d6"}
 ]
};

// Subtables
const DMG_SUBTABLES = {
  "demi_human": {
    "plain": [
      { min: 1, max: 5, race: "Dwarf" },
      { min: 6, max: 70, race: "Elf" },
      { min: 71, max: 80, race: "Gnome" },
      { min: 81, max: 100, race: "Halfling" }
    ],
    "scrub": [
      { min: 1, max: 5, race: "Dwarf" },
      { min: 6, max: 60, race: "Elf" },
      { min: 61, max: 80, race: "Gnome" },
      { min: 81, max: 100, race: "Halfling" }
    ],
    "forest": [
      { min: 1, max: 5, race: "Dwarf" },
      { min: 6, max: 70, race: "Elf" },
      { min: 71, max: 95, race: "Gnome" },
      { min: 96, max: 100, race: "Halfling" }
    ],
    "rough": [
      { min: 1, max: 10, race: "Dwarf" },
      { min: 11, max: 15, race: "Elf" },
      { min: 16, max: 85, race: "Gnome" },
      { min: 86, max: 100, race: "Halfling" }
    ],
    "hills": [
      { min: 1, max: 20, race: "Dwarf" },
      { min: 21, max: 30, race: "Elf" },
      { min: 31, max: 70, race: "Gnome" },
      { min: 71, max: 100, race: "Halfling" }
    ],
    "mountains": [
      { min: 1, max: 70, race: "Dwarf" },
      { min: 71, max: 75, race: "Elf" },
      { min: 76, max: 95, race: "Gnome" },
      { min: 96, max: 100, race: "Halfling" }
    ]
  },

  "dragon": {
    "plain": [
      { min: 1, max: 2, type: "Black" },
      { min: 3, max: 4, type: "Blue" },
      { min: 5, max: 6, type: "Brass" },
      { min: 7, max: 8, type: "Bronze" },
      { min: 9, max: 10, type: "Chimera" },
      { min: 11, max: 12, type: "Copper" },
      { min: 13, max: 28, type: "Gold" },
      { min: 29, max: 30, type: "Green" },
      { min: 31, max: 32, type: "Red" },
      { min: 33, max: 34, type: "White" },
      { min: 35, max: 100, type: "Wyvern" }
    ],
    "scrub": [
      { min: 1, max: 2, type: "Black" },
      { min: 3, max: 4, type: "Blue" },
      { min: 5, max: 6, type: "Brass" },
      { min: 7, max: 8, type: "Bronze" },
      { min: 9, max: 10, type: "Chimera" },
      { min: 11, max: 14, type: "Copper" },
      { min: 15, max: 16, type: "Gold" },
      { min: 17, max: 36, type: "Green" },
      { min: 37, max: 38, type: "Red" },
      { min: 39, max: 40, type: "White" },
      { min: 41, max: 100, type: "Wyvern" }
    ],
    "forest": [
      { min: 1, max: 16, type: "Black" },
      { min: 17, max: 18, type: "Blue" },
      { min: 19, max: 20, type: "Brass" },
      { min: 21, max: 22, type: "Bronze" },
      { min: 24, max: 30, type: "Chimera" },
      { min: 31, max: 35, type: "Copper" },
      { min: 36, max: 40, type: "Gold" },
      { min: 41, max: 80, type: "Green" },
      { min: 81, max: 82, type: "Red" },
      { min: 83, max: 84, type: "White" },
      { min: 85, max: 100, type: "Wyvern" }
    ],
    "rough": [
      { min: 1, max: 30, type: "Black" },
      { min: 31, max: 32, type: "Blue" },
      { min: 33, max: 40, type: "Brass" },
      { min: 41, max: 45, type: "Bronze" },
      { min: 46, max: 50, type: "Chimera" },
      { min: 51, max: 55, type: "Copper" },
      { min: 56, max: 57, type: "Gold" },
      { min: 58, max: 59, type: "Green" },
      { min: 60, max: 64, type: "Red" },
      { min: 65, max: 66, type: "White" },
      { min: 67, max: 100, type: "Wyvern" }
    ],
    "desert": [
      { min: 1, max: 2, type: "Black" },
      { min: 3, max: 20, type: "Blue" },
      { min: 21, max: 65, type: "Brass" },
      { min: 66, max: 67, type: "Bronze" },
      { min: 68, max: 70, type: "Chimera" },
      { min: 71, max: 80, type: "Copper" },
      { min: 81, max: 82, type: "Gold" },
      { min: 83, max: 84, type: "Green" },
      { min: 85, max: 88, type: "Red" },
      { min: 89, max: 90, type: "White" },
      { min: 91, max: 100, type: "Wyvern" }
    ],
    "hills": [
      { min: 1, max: 6, type: "Black" },
      { min: 7, max: 10, type: "Blue" },
      { min: 11, max: 20, type: "Brass" },
      { min: 21, max: 25, type: "Bronze" },
      { min: 26, max: 35, type: "Chimera" },
      { min: 36, max: 45, type: "Copper" },
      { min: 46, max: 50, type: "Gold" },
      { min: 51, max: 52, type: "Green" },
      { min: 53, max: 60, type: "Red" },
      { min: 61, max: 65, type: "White" },
      { min: 66, max: 100, type: "Wyvern" }
    ],
    "mountains": [
      { min: 1, max: 4, type: "Black" },
      { min: 5, max: 15, type: "Blue" },
      { min: 16, max: 17, type: "Brass" },
      { min: 18, max: 25, type: "Bronze" },
      { min: 26, max: 30, type: "Chimera" },
      { min: 31, max: 40, type: "Copper" },
      { min: 41, max: 45, type: "Gold" },
      { min: 46, max: 47, type: "Green" },
      { min: 48, max: 60, type: "Red" },
      { min: 61, max: 95, type: "White" },
      { min: 96, max: 100, type: "Wyvern" }
    ],
    "marsh": [
      { min: 1, max: 50, type: "Black" },
      { min: 51, max: 52, type: "Blue" },
      { min: 53, max: 54, type: "Brass" },
      { min: 55, max: 56, type: "Bronze" },
      { min: 57, max: 58, type: "Chimera" },
      { min: 59, max: 60, type: "Copper" },
      { min: 61, max: 62, type: "Gold" },
      { min: 63, max: 75, type: "Green" },
      { min: 76, max: 77, type: "Red" },
      { min: 78, max: 79, type: "White" },
      { min: 80, max: 100, type: "Wyvern" }
    ]
  },

  "frog": {
    "marsh": [
      { min: 1, max: 70, type: "Giant" },
      { min: 71, max: 80, type: "Killer" },
      { min: 81, max: 100, type: "Poisonous" }
    ]
  },

  "giant": {
    "plain": [
      { min: 1, max: 2, type: "Cloud" },
      { min: 3, max: 4, type: "Ettin" },
      { min: 5, max: 6, type: "Fire" },
      { min: 7, max: 8, type: "Frost" },
      { min: 9, max: 95, type: "Hill" },
      { min: 96, max: 98, type: "Stone" },
      { min: 99, max: 99, type: "Storm" },
      { min: 100, max: 100, type: "Titan" }
    ],
    "scrub": [
      { min: 1, max: 2, type: "Cloud" },
      { min: 3, max: 5, type: "Ettin" },
      { min: 6, max: 7, type: "Fire" },
      { min: 8, max: 9, type: "Frost" },
      { min: 10, max: 94, type: "Hill" },
      { min: 95, max: 98, type: "Stone" },
      { min: 99, max: 99, type: "Storm" },
      { min: 100, max: 100, type: "Titan" }
    ],
    "forest": [
      { min: 1, max: 2, type: "Cloud" },
      { min: 3, max: 10, type: "Ettin" },
      { min: 11, max: 12, type: "Fire" },
      { min: 13, max: 14, type: "Frost" },
      { min: 15, max: 93, type: "Hill" },
      { min: 94, max: 98, type: "Stone" },
      { min: 99, max: 99, type: "Storm" },
      { min: 100, max: 100, type: "Titan" }
    ],
    "rough": [
      { min: 1, max: 2, type: "Cloud" },
      { min: 3, max: 10, type: "Ettin" },
      { min: 11, max: 20, type: "Fire" },
      { min: 21, max: 25, type: "Frost" },
      { min: 26, max: 85, type: "Hill" },
      { min: 86, max: 98, type: "Stone" },
      { min: 99, max: 99, type: "Storm" },
      { min: 100, max: 100, type: "Titan" }
    ],
    "hills": [
      { min: 1, max: 3, type: "Cloud" },
      { min: 4, max: 10, type: "Ettin" },
      { min: 11, max: 15, type: "Fire" },
      { min: 16, max: 20, type: "Frost" },
      { min: 21, max: 81, type: "Hill" },
      { min: 82, max: 98, type: "Stone" },
      { min: 99, max: 99, type: "Storm" },
      { min: 100, max: 100, type: "Titan" }
    ],
    "mountains": [
      { min: 1, max: 15, type: "Cloud" },
      { min: 16, max: 20, type: "Ettin" },
      { min: 21, max: 30, type: "Fire" },
      { min: 31, max: 45, type: "Frost" },
      { min: 46, max: 50, type: "Hill" },
      { min: 51, max: 90, type: "Stone" },
      { min: 91, max: 98, type: "Storm" },
      { min: 99, max: 100, type: "Titan" }
    ]
  },

  "humanoid": {
    "plain": [
      { min: 1, max: 5, type: "Gnoll" },
      { min: 6, max: 10, type: "Goblin" },
      { min: 11, max: 15, type: "Hobgoblin" },
      { min: 16, max: 100, type: "Orc" }
    ],
    "scrub": [
      { min: 1, max: 10, type: "Gnoll" },
      { min: 11, max: 15, type: "Goblin" },
      { min: 16, max: 50, type: "Hobgoblin" },
      { min: 51, max: 80, type: "Kobold" },
      { min: 81, max: 100, type: "Orc" }
    ],
    "forest": [
      { min: 1, max: 10, type: "Gnoll" },
      { min: 11, max: 20, type: "Goblin" },
      { min: 21, max: 30, type: "Hobgoblin" },
      { min: 31, max: 80, type: "Kobold" },
      { min: 81, max: 100, type: "Orc" }
    ],
    "rough": [
      { min: 1, max: 20, type: "Gnoll" },
      { min: 21, max: 30, type: "Goblin" },
      { min: 31, max: 50, type: "Hobgoblin" },
      { min: 51, max: 55, type: "Kobold" },
      { min: 56, max: 100, type: "Orc" }
    ],
    "desert": [
      { min: 1, max: 40, type: "Goblin" },
      { min: 41, max: 90, type: "Hobgoblin" },
      { min: 91, max: 100, type: "Orc" }
    ],
    "hills": [
      { min: 1, max: 25, type: "Gnoll" },
      { min: 26, max: 50, type: "Goblin" },
      { min: 51, max: 75, type: "Hobgoblin" },
      { min: 76, max: 100, type: "Orc" }
    ],
    "mountains": [
      { min: 1, max: 15, type: "Gnoll" },
      { min: 16, max: 50, type: "Goblin" },
      { min: 51, max: 65, type: "Hobgoblin" },
      { min: 66, max: 100, type: "Orc" }
    ],
    "marsh": [
      { min: 1, max: 25, type: "Gnoll" },
      { min: 26, max: 35, type: "Goblin" },
      { min: 36, max: 75, type: "Hobgoblin" },
      { min: 76, max: 100, type: "Orc" }
    ]
  },

  "lycanthrope": {
    "plain": [
      { min: 1, max: 2, type: "Werebear" },
      { min: 3, max: 25, type: "Wereboar" },
      { min: 26, max: 30, type: "Wererat" },
      { min: 31, max: 40, type: "Weretiger" },
      { min: 41, max: 100, type: "Werewolf" }
    ],
    "forest": [
      { min: 1, max: 10, type: "Werebear" },
      { min: 11, max: 70, type: "Wereboar" },
      { min: 71, max: 90, type: "Weretiger" },
      { min: 91, max: 100, type: "Werewolf" }
    ],
    "rough": [
      { min: 1, max: 2, type: "Werebear" },
      { min: 3, max: 15, type: "Wereboar" },
      { min: 16, max: 90, type: "Wererat" },
      { min: 91, max: 100, type: "Werewolf" }
    ],
    "hills": [
      { min: 1, max: 2, type: "Werebear" },
      { min: 3, max: 15, type: "Wereboar" },
      { min: 16, max: 20, type: "Wererat" },
      { min: 21, max: 30, type: "Weretiger" },
      { min: 31, max: 100, type: "Werewolf" }
    ],
    "mountains": [
      { min: 1, max: 75, type: "Werebear" },
      { min: 76, max: 80, type: "Wererat" },
      { min: 81, max: 90, type: "Weretiger" },
      { min: 91, max: 100, type: "Werewolf" }
    ]
  },

  "men": {
    "plain": [
      { min: 1, max: 5, type: "Bandit" },
      { min: 6, max: 7, type: "Berserker" },
      { min: 8, max: 10, type: "Brigand" },
      { min: 21, max: 22, type: "Dervish" },
      { min: 23, max: 60, type: "Merchant" },
      { min: 61, max: 90, type: "Nomad" },
      { min: 91, max: 95, type: "Pilgrim" },
      { min: 96, max: 100, type: "Tribesman" }
    ],
    "scrub": [
      { min: 1, max: 10, type: "Bandit" },
      { min: 11, max: 12, type: "Berserker" },
      { min: 13, max: 15, type: "Brigand" },
      { min: 26, max: 27, type: "Dervish" },
      { min: 28, max: 60, type: "Merchant" },
      { min: 61, max: 80, type: "Nomad" },
      { min: 81, max: 85, type: "Pilgrim" },
      { min: 86, max: 100, type: "Tribesman" }
    ],
    "forest": [
      { min: 1, max: 10, type: "Bandit" },
      { min: 11, max: 15, type: "Brigand" },
      { min: 26, max: 40, type: "Merchant" },
      { min: 41, max: 45, type: "Pilgrim" },
      { min: 46, max: 100, type: "Tribesman" }
    ],
    "rough": [
      { min: 1, max: 10, type: "Bandit" },
      { min: 11, max: 12, type: "Berserker" },
      { min: 13, max: 15, type: "Brigand" },
      { min: 26, max: 27, type: "Dervish" },
      { min: 28, max: 50, type: "Merchant" },
      { min: 51, max: 60, type: "Nomad" },
      { min: 61, max: 80, type: "Pilgrim" },
      { min: 81, max: 100, type: "Tribesman" }
    ],
    "desert": [
      { min: 1, max: 5, type: "Bandit" },
      { min: 6, max: 10, type: "Brigand" },
      { min: 21, max: 50, type: "Dervish" },
      { min: 51, max: 75, type: "Merchant" },
      { min: 76, max: 95, type: "Nomad" },
      { min: 96, max: 100, type: "Pilgrim" }
    ],
    "hills": [
      { min: 1, max: 10, type: "Bandit" },
      { min: 11, max: 12, type: "Berserker" },
      { min: 13, max: 20, type: "Brigand" },
      { min: 31, max: 40, type: "Dervish" },
      { min: 41, max: 65, type: "Merchant" },
      { min: 66, max: 80, type: "Nomad" },
      { min: 81, max: 90, type: "Pilgrim" },
      { min: 91, max: 100, type: "Tribesman" }
    ],
    "mountains": [
      { min: 1, max: 5, type: "Bandit" },
      { min: 6, max: 10, type: "Berserker" },
      { min: 11, max: 20, type: "Brigand" },
      { min: 31, max: 35, type: "Dervish" },
      { min: 36, max: 50, type: "Merchant" },
      { min: 51, max: 65, type: "Pilgrim" },
      { min: 66, max: 100, type: "Tribesman" }
    ],
    "marsh": [
      { min: 1, max: 5, type: "Bandit" },
      { min: 6, max: 10, type: "Brigand" },
      { min: 21, max: 35, type: "Merchant" },
      { min: 36, max: 30, type: "Pilgrim" },
      { min: 31, max: 100, type: "Tribesman" }
    ]
  },

  "snake": {
    "plain": [
      { min: 1, max: 10, type: "Amphisbaena" },
      { min: 11, max: 80, type: "Poisonous" },
      { min: 81, max: 100, type: "Spitting" }
    ],
    "scrub": [
      { min: 1, max: 5, type: "Amphisbaena" },
      { min: 6, max: 10, type: "Constrictor" },
      { min: 11, max: 80, type: "Poisonous" },
      { min: 81, max: 100, type: "Spitting" }
    ],
    "forest": [
      { min: 1, max: 65, type: "Constrictor" },
      { min: 66, max: 95, type: "Poisonous" },
      { min: 96, max: 100, type: "Spitting" }
    ],
    "rough": [
      { min: 1, max: 5, type: "Constrictor" },
      { min: 6, max: 95, type: "Poisonous" },
      { min: 96, max: 100, type: "Spitting" }
    ],
    "desert": [
      { min: 1, max: 15, type: "Amphisbaena" },
      { min: 16, max: 90, type: "Poisonous" },
      { min: 91, max: 100, type: "Spitting" }
    ],
    "hills": [
      { min: 1, max: 5, type: "Amphisbaena" },
      { min: 6, max: 10, type: "Constrictor" },
      { min: 11, max: 90, type: "Poisonous" },
      { min: 91, max: 100, type: "Spitting" }
    ],
    "mountains": [
      { min: 1, max: 90, type: "Poisonous" },
      { min: 91, max: 100, type: "Spitting" }
    ],
    "marsh": [
      { min: 1, max: 70, type: "Constrictor" },
      { min: 71, max: 100, type: "Poisonous" }
    ]
  },

  "sphinx": {
    "forest": [
      { min: 1, max: 5, type: "Androsphinx" },
      { min: 6, max: 75, type: "Criosphinx" },
      { min: 76, max: 80, type: "Gynosphinx" },
      { min: 81, max: 100, type: "Hieracosphinx" }
    ],
    "rough": [
      { min: 1, max: 10, type: "Androsphinx" },
      { min: 11, max: 30, type: "Criosphinx" },
      { min: 31, max: 50, type: "Gynosphinx" },
      { min: 51, max: 100, type: "Hieracosphinx" }
    ],
    "desert": [
      { min: 1, max: 40, type: "Androsphinx" },
      { min: 41, max: 50, type: "Criosphinx" },
      { min: 51, max: 90, type: "Gynosphinx" },
      { min: 91, max: 100, type: "Hieracosphinx" }
    ],
    "hills": [
      { min: 1, max: 10, type: "Androsphinx" },
      { min: 11, max: 70, type: "Criosphinx" },
      { min: 71, max: 80, type: "Gynosphinx" },
      { min: 81, max: 100, type: "Hieracosphinx" }
    ],
    "mountains": [
      { min: 1, max: 15, type: "Androsphinx" },
      { min: 16, max: 35, type: "Criosphinx" },
      { min: 36, max: 55, type: "Gynosphinx" },
      { min: 56, max: 100, type: "Hieracosphinx" }
    ],
    "marsh": [
      { min: 1, max: 5, type: "Androsphinx" },
      { min: 6, max: 55, type: "Criosphinx" },
      { min: 56, max: 65, type: "Gynosphinx" },
      { min: 66, max: 100, type: "Hieracosphinx" }
    ]
  },

  "spider": {
    "plain": [
      { min: 1, max: 15, type: "Huge" },
      { min: 16, max: 100, type: "Large" }
    ],
    "scrub": [
      { min: 1, max: 25, type: "Huge" },
      { min: 26, max: 100, type: "Large" }
    ],
    "forest": [
      { min: 1, max: 55, type: "Giant" },
      { min: 56, max: 75, type: "Huge" },
      { min: 76, max: 80, type: "Large" },
      { min: 81, max: 100, type: "Phase" }
    ],
    "rough": [
      { min: 1, max: 20, type: "Huge" },
      { min: 21, max: 100, type: "Large" }
    ],
    "desert": [
      { min: 1, max: 100, type: "Large" }
    ],
    "hills": [
      { min: 1, max: 20, type: "Huge" },
      { min: 21, max: 100, type: "Large" }
    ]
  },

  "undead": {
    "forest": [
      { min: 1, max: 10, type: "Ghast" },
      { min: 11, max: 12, type: "Ghost" },
      { min: 13, max: 55, type: "Ghoul" },
      { min: 56, max: 56, type: "Lich" },
      { min: 57, max: 70, type: "Shadow" },
      { min: 71, max: 79, type: "Spectre" },
      { min: 80, max: 89, type: "Vampire" },
      { min: 90, max: 96, type: "Wight" },
      { min: 97, max: 100, type: "Wraith" }
    ],
    "rough": [
      { min: 1, max: 15, type: "Ghast" },
      { min: 16, max: 20, type: "Ghost" },
      { min: 21, max: 55, type: "Ghoul" },
      { min: 56, max: 60, type: "Lich" },
      { min: 61, max: 70, type: "Mummy" },
      { min: 71, max: 84, type: "Shadow" },
      { min: 85, max: 87, type: "Spectre" },
      { min: 88, max: 89, type: "Vampire" },
      { min: 90, max: 98, type: "Wight" },
      { min: 99, max: 100, type: "Wraith" }
    ],
    "hills": [
      { min: 1, max: 10, type: "Ghast" },
      { min: 11, max: 12, type: "Ghost" },
      { min: 13, max: 35, type: "Ghoul" },
      { min: 36, max: 40, type: "Lich" },
      { min: 41, max: 55, type: "Mummy" },
      { min: 56, max: 61, type: "Shadow" },
      { min: 62, max: 64, type: "Spectre" },
      { min: 65, max: 74, type: "Vampire" },
      { min: 75, max: 97, type: "Wight" },
      { min: 98, max: 100, type: "Wraith" }
    ],
    "mountains": [
      { min: 1, max: 10, type: "Ghast" },
      { min: 11, max: 13, type: "Ghost" },
      { min: 14, max: 30, type: "Ghoul" },
      { min: 31, max: 35, type: "Lich" },
      { min: 36, max: 40, type: "Mummy" },
      { min: 41, max: 50, type: "Shadow" },
      { min: 51, max: 60, type: "Spectre" },
      { min: 61, max: 75, type: "Vampire" },
      { min: 76, max: 94, type: "Wight" },
      { min: 95, max: 100, type: "Wraith" }
    ],
    "marsh": [
      { min: 1, max: 15, type: "Ghast" },
      { min: 16, max: 18, type: "Ghost" },
      { min: 19, max: 75, type: "Ghoul" },
      { min: 76, max: 81, type: "Shadow" },
      { min: 82, max: 91, type: "Spectre" },
      { min: 92, max: 93, type: "Vampire" },
      { min: 94, max: 100, type: "Wraith" }
    ]
  },

  "frog": {
    "marsh": [
      { min: 1, max: 70, type: "Giant" },
      { min: 71, max: 80, type: "Killer" },
      { min: 81, max: 100, type: "Poisonous" }
    ]
  }
};

// ✅ Also add the character subtable as mentioned in the DMG
const DMG_CHARACTER_ENCOUNTERS = {
 // Special note from DMG: Characters encountered will be 7th-10th level
 // 90% mounted (warhorses where applicable), 10% afoot
 // Mounted fighters have lances, afoot have spears
 // Henchmen approximately half character level (round up)
 
 generateCharacterParty() {
   const partySize = Math.floor(Math.random() * 4) + 2; // 2-5 characters
   const characters = [];
   
   for (let i = 0; i < partySize; i++) {
     const level = Math.floor(Math.random() * 4) + 7; // 7-10
     const classes = ['Fighter', 'Cleric', 'Magic-User', 'Thief', 'Ranger', 'Paladin'];
     const characterClass = classes[Math.floor(Math.random() * classes.length)];
     
     characters.push({
       class: characterClass,
       level: level,
       mounted: Math.random() < 0.9, // 90% mounted
       henchmenLevel: Math.ceil(level / 2)
     });
   }
   
   return {
     characters: characters,
     totalPartySize: partySize,
     mountedParty: characters[0].mounted, // Assume whole party same mount status
     henchmen: characters.reduce((total, char) => total + Math.floor(Math.random() * 3) + 1, 0)
   };
 }
};

// Patrol Encounters
const DMG_PATROL_ENCOUNTERS = {
 composition: {
   leader: {level: "6-8", class: "Fighter/Ranger"},
   lieutenant: {level: "4-5", class: "Fighter"},
   sergeant: {level: "2-3", class: "Fighter"},
   fighters: {count: "3-4", level: 1},
   soldiers: {count: "13-24", level: 0},
   spellcaster: {
     chance: 100,
     cleric: {chance: 40, level: "6-7"},
     magicUser: {chance: 60, level: "5-8"}
   }
 },
 equipment: {
   leaders: "Plate mail, shield, lance, flail, long sword",
   soldiers: "Chain/scale mail, shield, bow/crossbow, hand weapon"
 },
 mounts: {
   chance: 100, // Always mounted unless terrain prohibits
   type: "Warhorse for leaders, riding horses for others"
 }
};

// Fortress Encounters
const DMG_FORTRESS_ENCOUNTERS = {
  castleSize: [
    {min: 1, max: 10, size: "Small", type: "Small shell keep"},
    {min: 11, max: 25, size: "Small", type: "Tower"},
    {min: 26, max: 35, size: "Small", type: "Moat house or friary"},
    {min: 36, max: 45, size: "Medium", type: "Large shell keep"},
    {min: 46, max: 65, size: "Medium", type: "Small walled castle with keep"},
    {min: 66, max: 80, size: "Medium", type: "Medium walled castle with keep"},
    {min: 81, max: 88, size: "Large", type: "Concentric castle"},
    {min: 89, max: 95, size: "Large", type: "Large walled castle with keep"},
    {min: 96, max: 100, size: "Large", type: "Fortress complex"}
  ],

  inhabitants: {
    "Small": [
      {min: 1, max: 45, type: "Totally deserted"},
      {min: 46, max: 60, type: "Deserted (monster therein)"},
      {min: 61, max: 70, type: "Humans"},
      {min: 71, max: 100, type: "Character-types"}
    ],
    "Medium": [
      {min: 1, max: 30, type: "Totally deserted"},
      {min: 31, max: 50, type: "Deserted (monster therein)"},
      {min: 51, max: 65, type: "Humans"},
      {min: 66, max: 100, type: "Character-types"}
    ],
    "Large": [
      {min: 1, max: 15, type: "Totally deserted"},
      {min: 16, max: 40, type: "Deserted (monster therein)"},
      {min: 41, max: 60, type: "Humans"},
      {min: 61, max: 100, type: "Character-types"}
    ]
  },

  humanTypes: [
    {min: 1, max: 25, type: "Bandits"},
    {min: 26, max: 85, type: "Brigands"},
    {min: 86, max: 97, type: "Berserkers"},
    {min: 98, max: 100, type: "Dervishes"}
  ],

  characterTypes: [
    {min: 1, max: 18, class: "Cleric", level: "9-12"},
    {min: 19, max: 20, class: "Druid", level: "12-13"},
    {min: 21, max: 65, class: "Fighter", level: "9-12"},
    {min: 66, max: 66, class: "Paladin", level: "9-10"},
    {min: 67, max: 68, class: "Ranger", level: "10-13"},
    {min: 69, max: 80, class: "Magic-User", level: "11-14"},
    {min: 81, max: 85, class: "Illusionist", level: "10-13"},
    {min: 86, max: 93, class: "Thief", level: "10-14"},
    {min: 94, max: 96, class: "Assassin", level: "14"},
    {min: 97, max: 99, class: "Monk", level: "9-12"},
    {min: 100, max: 100, class: "Bard", level: "23"}
  ],

  artillery: {
    "Moat house or friary": {ballistae: 2, scorpions: 0, lightCatapults: 0, oilCauldrons: 1},
    "Tower": {ballistae: 1, scorpions: 0, lightCatapults: 0, oilCauldrons: 1},
    "Small shell keep": {ballistae: 0, scorpions: 1, lightCatapults: 2, oilCauldrons: 0},
    "Large shell keep": {ballistae: 0, scorpions: 1, lightCatapults: 2, oilCauldrons: 0},
    "Small walled castle with keep": {ballistae: 1, scorpions: 1, lightCatapults: 2, oilCauldrons: 0},
    "Medium walled castle with keep": {ballistae: 2, scorpions: 2, lightCatapults: 5, oilCauldrons: 0},
    "Concentric castle": {ballistae: 2, scorpions: 1, lightCatapults: 4, oilCauldrons: 0},
    "Large walled castle with keep": {ballistae: 4, scorpions: 4, lightCatapults: 8, oilCauldrons: 0},
    "Fortress complex": {ballistae: 4, scorpions: 4, lightCatapults: 8, oilCauldrons: 0}
  },

  garrisonStructure: {
    heavyHorse: {count: "9-12", equipment: "splint mail & shield, lance, long sword, mace"},
    lightHorse: {count: "9-16", equipment: "studded leather, light crossbow, long sword"},
    menAtArms1: {count: "13-24", equipment: "scale mail, shield, spear, hand axe"},
    menAtArms2: {count: "7-12", equipment: "scale mail, heavy crossbow, morning star"},
    leaders: {level: "3-4", note: "Each unit led by a fighter of 3rd or 4th level"}
  },

  henchmenRules: {
    count: "2-5",
    note: "Found within fortress, approximately half master's level (round up)"
  }
};    

// ─── from scripts/data/greyhawk-regions.js ─────────────────────────────────────────────────
// Exports political region encounter Tables for World of Greyhawk
const GREYHAWK_REGIONAL_TABLES = {
  // Political Regions
  "bandit_kingdoms": [
    { "min": 1, "max": 2, "encounter": "Bugbear" },
    { "min": 3, "max": 4, "encounter": "Gnoll" },
    { "min": 5, "max": 5, "encounter": "Gnolls and Flinds" },
    { "min": 6, "max": 8, "encounter": "Goblin" },
    { "min": 9, "max": 10, "encounter": "Goblin and Xvart" },
    { "min": 11, "max": 12, "encounter": "Hobgoblin" },
    { "min": 13, "max": 13, "encounter": "Hobgoblins and Norkers" },
    { "min": 14, "max": 33, "encounter": "Men, Bandit" },
    { "min": 34, "max": 50, "encounter": "Men, Brigand" },
    { "min": 51, "max": 55, "encounter": "Men, Patrol (Knight)" },
    { "min": 56, "max": 59, "encounter": "Orc" },
    { "min": 60, "max": 60, "encounter": "Orcs and Ogrillons" },
    { "min": 61, "max": 100, "encounter": "Use Standard encounter Tables", useStandard: true }
  ],
  
  "horned_society": [
  { "min": 1, "max": 3, "encounter": "Flinds" },
  { "min": 4, "max": 5, "encounter": "Goblins" },
  { "min": 6, "max": 6, "encounter": "Goblins and Xvarts" },
  { "min": 7, "max": 15, "encounter": "Hobgoblins", "note": "25% are soldiery" },
  { "min": 16, "max": 20, "encounter": "Hobgoblins and Norkers", "note": "20–50 encountered" },
  { "min": 21, "max": 22, "encounter": "Humanoids" },
  { "min": 23, "max": 25, "encounter": "Kobolds" },
  { "min": 26, "max": 28, "encounter": "Men, Bandits" },
  { "min": 29, "max": 33, "encounter": "Men, Brigands" },
  { "min": 34, "max": 36, "encounter": "Men, Nomads" },
  { "min": 37, "max": 37, "encounter": "Men, Patrol, Knights" },
  { "min": 38, "max": 40, "encounter": "Men, Patrol, Medium" },
  { "min": 41, "max": 45, "encounter": "Men, Raiders" },
  { "min": 46, "max": 48, "encounter": "Men, Tribesmen", "note": "Hillmen or marshmen" },
  { "min": 49, "max": 53, "encounter": "Orcs", "note": "20% are soldiery" },
  { "min": 54, "max": 55, "encounter": "Orcs and Ogrillons", "note": "20–80 encountered" },
  { "min": 56, "max": 100, "encounter": "Use Standard encounter Tables", "useStandard": true }
],

  "iuz": [
    { "min": 1, "max": 3, "encounter": "Bugbear" },
  { "min": 4, "max": 4, "encounter": "Giant" },
  { "min": 5, "max": 10, "encounter": "Gnoll" },
  { "min": 11, "max": 12, "encounter": "Gnoll and Flinds" },
  { "min": 13, "max": 14, "encounter": "Goblin" },
  { "min": 15, "max": 16, "encounter": "Hobgoblin" },
  { "min": 17, "max": 18, "encounter": "Hobgoblin and Norker", "note": "20–50 individuals" },
  { "min": 19, "max": 22, "encounter": "Men, Bandit" },
  { "min": 23, "max": 25, "encounter": "Men, Brigand" },
  { "min": 26, "max": 30, "encounter": "Men, Nomads" },
  { "min": 31, "max": 34, "encounter": "Men, Tribesmen" },
  { "min": 35, "max": 37, "encounter": "Norker" },
  { "min": 38, "max": 39, "encounter": "Ogre" },
  { "min": 40, "max": 41, "encounter": "Ogrillon" },
  { "min": 42, "max": 45, "encounter": "Orc", },
  { "min": 46, "max": 48, "encounter": "Orc and Ogrillon","note": "20–80 encountered" },
  { "min": 49, "max": 53, "encounter": "Soldiery" },
  { "min": 54, "max": 55, "encounter": "Troll" },
  { "min": 56, "max": 100, "encounter": "Use Standard encounter Tables", useStandard: true }
  ],
  "rovers_of_the_barrens": [
    { "min": 1, "max": 6, "encounter": "Centaur" },
  { "min": 7, "max": 10, "encounter": "Gnoll" },
  { "min": 11, "max": 12, "encounter": "Goblin and Wargs" },
  { "min": 13, "max": 15, "encounter": "Humanoid" },
  { "min": 16, "max": 20, "encounter": "Men, Merchant" },
  { "min": 21, "max": 40, "encounter": "Men, Nomads" },
  { "min": 41, "max": 45, "encounter": "Men, Raider" },
  { "min": 46, "max": 53, "encounter": "Men, Tribesmen", "note": "Found in hills or woods in the Barrens" },
  { "min": 54, "max": 55, "encounter": "Qullan" },
  { "min": 56, "max": 100, "encounter": "Use Standard encounter Tables", useStandard: true }
  ],

  "bissel_gran_march_keoland": [
    { "min": 1, "max": 2, "encounter": "Demi-human" },
    { "min": 3, "max": 4, "encounter": "Dwarf", number: "40d10" },
    { "min": 5, "max": 6, "encounter": "Dwarf, Mountain" },
    { "min": 7, "max": 10, "encounter": "Elf, High" },
    { "min": 11, "max": 15, "encounter": "Elf, Sylvan" },
    { "min": 16, "max": 16, "encounter": "Gnome" },
    { "min": 17, "max": 18, "encounter": "Halfling, Hairfeet" },
    { "min": 19, "max": 19, "encounter": "Halfling, Stout" },
    { "min": 20, "max": 20, "encounter": "Halfling, Tallfellow" },
    { "min": 21, "max": 25, "encounter": "Humanoid" },
    { "min": 26, "max": 29, "encounter": "Men, Bandit", number: "30d10" },
    { "min": 30, "max": 31, "encounter": "Men, Brigand", number: "30d10" },
    { "min": 32, "max": 41, "encounter": "Men, Merchant", number: "10d4" },
    { "min": 42, "max": 43, "encounter": "Men, Patrol (Knight)" },
    { "min": 44, "max": 48, "encounter": "Men, Patrol (Light)" },
    { "min": 49, "max": 55, "encounter": "Men, Patrol (Medium)" },
    { "min": 56, "max": 57, "encounter": "Men, Pilgrim" },
    { "min": 58, "max": 61, "encounter": "Men, Raider", number: "11d6 + 1d6" },
    { "min": 62, "max": 65, "encounter": "Men, Tribesmen (marshmen)", number: "20d6" },
    { "min": 66, "max": 100, "encounter": "Use Standard encounter Tables", useStandard: true }
  ],

  "bone_march": [
    { "min": 1, "max": 2, "encounter": "Bugbear" },
    { "min": 3, "max": 3, "encounter": "Giant (evil only)" },
    { "min": 4, "max": 5, "encounter": "Gnoll" },
    { "min": 6, "max": 6, "encounter": "Gnoll and Flinds" },
    { "min": 7, "max": 12, "encounter": "Goblin" },
    { "min": 13, "max": 15, "encounter": "Goblin and Xvarts" },
    { "min": 16, "max": 17, "encounter": "Hobgoblin" },
    { "min": 18, "max": 18, "encounter": "Hobgoblin and Norker" },
    { "min": 19, "max": 20, "encounter": "Kobolds" },
    { "min": 21, "max": 25, "encounter": "Men, Bandit" },
    { "min": 26, "max": 28, "encounter": "Men, Brigand" },
    { "min": 29, "max": 30, "encounter": "Men, Raider" },
    { "min": 31, "max": 32, "encounter": "Men, Tribesmen (hillmen)" },
    { "min": 33, "max": 33, "encounter": "Norker" },
    { "min": 34, "max": 35, "encounter": "Ogre" },
    { "min": 36, "max": 39, "encounter": "Ogre and Ogrillon" },
    { "min": 40, "max": 40, "encounter": "Ogrillon" },
    { "min": 41, "max": 43, "encounter": "Orc" },
    { "min": 44, "max": 45, "encounter": "Orc and Ogrillon" },
    { "min": 46, "max": 46, "encounter": "Troll" },
    { "min": 47, "max": 48, "encounter": "Xvarts" },
    { "min": 49, "max": 100, "encounter": "Use Standard encounter Tables", useStandard: true }
  ],

  "county_duchy_urnst": [
    { "min": 1, "max": 3, "encounter": "Demi-human" },
    { "min": 4, "max": 7, "encounter": "Dwarf" },
    { "min": 8, "max": 11, "encounter": "Gnome" },
    { "min": 12, "max": 14, "encounter": "Halfling, Hairfeet" },
    { "min": 15, "max": 17, "encounter": "Halfling, Stout" },
    { "min": 18, "max": 20, "encounter": "Humanoid" },
    { "min": 21, "max": 24, "encounter": "Men, Bandit" },
    { "min": 25, "max": 27, "encounter": "Men, Brigand" },
    { "min": 28, "max": 40, "encounter": "Men, Merchant" },
    { "min": 41, "max": 45, "encounter": "Men, Patrol, Heavy" },
    { "min": 46, "max": 47, "encounter": "Men, Pilgrim" },
    { "min": 48, "max": 53, "encounter": "Men, Raider" },
    { "min": 54, "max": 55, "encounter": "Men, Rhennee (near water)" },
    { "min": 56, "max": 57, "encounter": "Men, Tribesmen (hillmen)" },
    { "min": 58, "max": 100, "encounter": "Use Standard encounter Tables", useStandard: true }
  ],

  "county_duchy_principality_ulek": [
    { "min": 1, "max": 3, "encounter": "Demi-human" },
    { "min": 4, "max": 9, "encounter": "Dwarf" },
    { "min": 10, "max": 17, "encounter": "Dwarf, Mountain" },
    { "min": 18, "max": 23, "encounter": "Elf, High" },
    { "min": 24, "max": 29, "encounter": "Elf, Patrol" },
    { "min": 30, "max": 34, "encounter": "Elf, Sylvan" },
    { "min": 35, "max": 40, "encounter": "Gnome" },
    { "min": 41, "max": 44, "encounter": "Halfling, Hairfeet" },
    { "min": 45, "max": 47, "encounter": "Halfling, Stout" },
    { "min": 48, "max": 49, "encounter": "Halfling, Tallfellow" },
    { "min": 50, "max": 51, "encounter": "Humanoid" },
    { "min": 52, "max": 56, "encounter": "Men, Bandit" },
    { "min": 57, "max": 65, "encounter": "Men, Merchant" },
    { "min": 66, "max": 68, "encounter": "Men, Patrol (Light)" },
    { "min": 69, "max": 71, "encounter": "Men, Pilgrim" },
    { "min": 72, "max": 74, "encounter": "Men, Tribesmen (hillmen in County and Duchy)" },
    { "min": 75, "max": 100, "encounter": "Use Standard encounter Tables", useStandard: true }
  ],

  "pomarj": [
    { "min": 1, "max": 2, "encounter": "Bugbear" },
    { "min": 3, "max": 3, "encounter": "Giant (evil only)" },
    { "min": 4, "max": 5, "encounter": "Gnoll" },
    { "min": 6, "max": 6, "encounter": "Gnoll and Flinds" },
    { "min": 7, "max": 12, "encounter": "Goblin" },
    { "min": 13, "max": 15, "encounter": "Goblin and Xvarts" },
    { "min": 16, "max": 17, "encounter": "Hobgoblin" },
    { "min": 18, "max": 18, "encounter": "Hobgoblin and Norker" },
    { "min": 19, "max": 20, "encounter": "Kobolds" },
    { "min": 21, "max": 25, "encounter": "Men, Bandit" },
    { "min": 26, "max": 28, "encounter": "Men, Brigand" },
    { "min": 29, "max": 30, "encounter": "Men, Raider" },
    { "min": 31, "max": 32, "encounter": "Men, Tribesmen (hillmen)" },
    { "min": 33, "max": 33, "encounter": "Norker" },
    { "min": 34, "max": 35, "encounter": "Ogre" },
    { "min": 36, "max": 39, "encounter": "Ogre and Ogrillon" },
    { "min": 40, "max": 40, "encounter": "Ogrillon" },
    { "min": 41, "max": 43, "encounter": "Orc" },
    { "min": 44, "max": 45, "encounter": "Orc and Ogrillon" },
    { "min": 46, "max": 46, "encounter": "Troll" },
    { "min": 47, "max": 48, "encounter": "Xvarts" },
    { "min": 49, "max": 100, "encounter": "Use Standard encounter Tables", useStandard: true }
  ],

  "celene": [
    { "min": 1, "max": 2, "encounter": "Dwarf" },
    { "min": 3, "max": 3, "encounter": "Dwarf, Mountain" },
    { "min": 4, "max": 20, "encounter": "Elf, Gray" },
    { "min": 21, "max": 25, "encounter": "Elf, High" },
    { "min": 26, "max": 40, "encounter": "Elf, Sylvan" },
    { "min": 41, "max": 46, "encounter": "Gnome" },
    { "min": 47, "max": 47, "encounter": "Halfling, Hairfeet" },
    { "min": 48, "max": 48, "encounter": "Halfling, Stout" },
    { "min": 49, "max": 50, "encounter": "Halfling, Tallfellow" },
    { "min": 51, "max": 53, "encounter": "Humanoid" },
    { "min": 54, "max": 55, "encounter": "Men, Bandit" },
    { "min": 56, "max": 57, "encounter": "Men, Brigand" },
    { "min": 58, "max": 63, "encounter": "Men, Merchant" },
    { "min": 64, "max": 77, "encounter": "Men, Patrol (Light)" },
    { "min": 78, "max": 80, "encounter": "Men, Pilgrim" },
    { "min": 81, "max": 100, "encounter": "Use Standard encounter Tables", useStandard: true }
  ],

  "geoff_sterich_yeomanry": [
    { "min": 1, "max": 2, "encounter": "Demi-human" },
    { "min": 3, "max": 5, "encounter": "Dwarf" },
    { "min": 6, "max": 9, "encounter": "Elf, High" },
    { "min": 10, "max": 10, "encounter": "Gnome" },
    { "min": 11, "max": 11, "encounter": "Halfling, Hairfeet" },
    { "min": 12, "max": 12, "encounter": "Halfling, Stout" },
    { "min": 13, "max": 15, "encounter": "Halfling, Tallfellow" },
    { "min": 16, "max": 20, "encounter": "Humanoid" },
    { "min": 21, "max": 26, "encounter": "Men, Bandit" },
    { "min": 27, "max": 30, "encounter": "Men, Brigand" },
    { "min": 31, "max": 32, "encounter": "Men, Cavemen (in mountains)" },
    { "min": 33, "max": 40, "encounter": "Men, Merchant" },
    { "min": 41, "max": 42, "encounter": "Men, Patrol (Levies)" },
    { "min": 43, "max": 46, "encounter": "Ogre" },
    { "min": 47, "max": 48, "encounter": "Men, Pilgrim" },
    { "min": 49, "max": 52, "encounter": "Men, Raider" },
    { "min": 53, "max": 55, "encounter": "Men, Tribesmen (hillmen or marshmen)" },
    { "min": 56, "max": 57, "encounter": "Ogre (repeat entry)" },
    { "min": 58, "max": 59, "encounter": "Troll" },
    { "min": 60, "max": 100, "encounter": "Use Standard encounter Tables", useStandard: true }
  ],

  "great_kingdom_medegia_north_province_south_province": [
    { "min": 1, "max": 3, "encounter": "Demi-human" },
    { "min": 4, "max": 8, "encounter": "Dwarf" },
    { "min": 9, "max": 15, "encounter": "Elf, Sylvan" },
    { "min": 16, "max": 20, "encounter": "Hobgoblin Soldiery" },
    { "min": 21, "max": 25, "encounter": "Humanoid" },
    { "min": 26, "max": 30, "encounter": "Men, Bandit" },
    { "min": 31, "max": 35, "encounter": "Men, Brigand" },
    { "min": 36, "max": 50, "encounter": "Men, Merchant" },
    { "min": 51, "max": 54, "encounter": "Men, Patrol, Heavy" },
    { "min": 55, "max": 57, "encounter": "Men, Patrol (Light)" },
    { "min": 58, "max": 60, "encounter": "Men, Patrol (Medium)" },
    { "min": 61, "max": 63, "encounter": "Men, Patrol (Slaver)" },
    { "min": 64, "max": 66, "encounter": "Men, Pilgrim" },
    { "min": 67, "max": 80, "encounter": "Men, Raider" },
    { "min": 81, "max": 83, "encounter": "Men, Tribesmen (hillmen)" },
    { "min": 84, "max": 85, "encounter": "Ogrillon and Orc" },
    { "min": 86, "max": 90, "encounter": "Orc (soldiery)" },
    { "min": 91, "max": 100, "encounter": "Use Standard encounter Tables", useStandard: true }
  ],

  "greyhawk": [
    { "min": 1, "max": 1, "encounter": "Demi-human" },
    { "min": 2, "max": 3, "encounter": "Men, Characters" },
    { "min": 4, "max": 5, "encounter": "Humanoid" },
    { "min": 6, "max": 7, "encounter": "Men, Bandit" },
    { "min": 8, "max": 9, "encounter": "Men, Brigand" },
    { "min": 10, "max": 11, "encounter": "Men, Characters" },
    { "min": 12, "max": 30, "encounter": "Men, Merchant" },
    { "min": 31, "max": 40, "encounter": "Men, Patrol (Medium)" },
    { "min": 41, "max": 100, "encounter": "Use Standard encounter Tables", useStandard: true }
  ],

  "highfolk": [
    { "min": 1, "max": 2, "encounter": "Dwarf" },
    { "min": 3, "max": 3, "encounter": "Dwarf, Mountain" },
    { "min": 4, "max": 20, "encounter": "Elf, Gray" },
    { "min": 21, "max": 25, "encounter": "Elf, High" },
    { "min": 26, "max": 40, "encounter": "Elf, Sylvan" },
    { "min": 41, "max": 46, "encounter": "Gnome" },
    { "min": 47, "max": 47, "encounter": "Halfling, Hairfeet" },
    { "min": 48, "max": 48, "encounter": "Halfling, Stout" },
    { "min": 49, "max": 50, "encounter": "Halfling, Tallfellow" },
    { "min": 51, "max": 53, "encounter": "Humanoid" },
    { "min": 54, "max": 55, "encounter": "Men, Bandit" },
    { "min": 56, "max": 57, "encounter": "Men, Brigand" },
    { "min": 58, "max": 63, "encounter": "Men, Merchant" },
    { "min": 64, "max": 77, "encounter": "Men, Patrol (Light)" },
    { "min": 78, "max": 80, "encounter": "Men, Pilgrim" },
    { "min": 81, "max": 100, "encounter": "Use Standard encounter Tables", useStandard: true }
  ],

  "furyondy_shield_lands_veluna": [
    { "min": 1, "max": 3, "encounter": "Demi-human" },
    { "min": 4, "max": 5, "encounter": "Elf, Gray" },
    { "min": 6, "max": 10, "encounter": "Elf, High" },
    { "min": 11, "max": 15, "encounter": "Gnome" },
    { "min": 16, "max": 20, "encounter": "Halfling" },
    { "min": 21, "max": 24, "encounter": "Hobgoblin (raiding)" },
    { "min": 25, "max": 26, "encounter": "Hobgoblin and Norker (raiding)" },
    { "min": 27, "max": 30, "encounter": "Humanoid" },
    { "min": 31, "max": 35, "encounter": "Men, Bandit" },
    { "min": 36, "max": 48, "encounter": "Men, Brigand" },
    { "min": 49, "max": 50, "encounter": "Men, Bucaneer" },
    { "min": 51, "max": 52, "encounter": "Men, Characters" },
    { "min": 53, "max": 67, "encounter": "Men, Merchant" },
    { "min": 68, "max": 68, "encounter": "Men, Patrol, Heavy" },
    { "min": 69, "max": 73, "encounter": "Men, Patrol (Knight)" },
    { "min": 74, "max": 80, "encounter": "Men, Patrol (Light)" },
    { "min": 81, "max": 85, "encounter": "Men, Patrol (Medium)" },
    { "min": 86, "max": 88, "encounter": "Men, Pilgrim" },
    { "min": 89, "max": 90, "encounter": "Men, Raider" },
    { "min": 91, "max": 92, "encounter": "Men, Pirate (near water)" },
    { "min": 93, "max": 95, "encounter": "Men, Rhennee (near water)" },
    { "min": 96, "max": 97, "encounter": "Men, Tribesmen (hillmen)" },
    { "min": 98, "max": 98, "encounter": "Orc (raiding)" },
    { "min": 99, "max": 100, "encounter": "Orc and Ogrillon (raiding)" }
  ],

  "idee_irongate_onnwal": [
    { "min": 1, "max": 2, "encounter": "Demi-human" },
    { "min": 3, "max": 6, "encounter": "Gnome" },
    { "min": 7, "max": 10, "encounter": "Men, Bandit" },
    { "min": 11, "max": 12, "encounter": "Men, Brigand" },
    { "min": 13, "max": 14, "encounter": "Men, Bucaneer" },
    { "min": 15, "max": 30, "encounter": "Men, Merchant" },
    { "min": 31, "max": 34, "encounter": "Men, Patrol (Levies)" },
    { "min": 35, "max": 37, "encounter": "Men, Patrol (Medium)" },
    { "min": 38, "max": 40, "encounter": "Men, Pilgrim" },
    { "min": 41, "max": 45, "encounter": "Men, Pirate (near water)" },
    { "min": 46, "max": 100, "encounter": "Use Standard encounter Tables", useStandard: true }
  ],

  "ket_perrenland": [
    { "min": 1, "max": 2, "encounter": "Demi-human" },
    { "min": 3, "max": 5, "encounter": "Humanoid" },
    { "min": 6, "max": 9, "encounter": "Men, Bandit" },
    { "min": 10, "max": 11, "encounter": "Men, Brigand" },
    { "min": 12, "max": 13, "encounter": "Men, Dervish" },
    { "min": 14, "max": 25, "encounter": "Men, Merchant" },
    { "min": 26, "max": 29, "encounter": "Men, Nomads" },
    { "min": 30, "max": 33, "encounter": "Men, Patrol (Levies)" },
    { "min": 34, "max": 36, "encounter": "Men, Patrol (Medium)" },
    { "min": 37, "max": 40, "encounter": "Men, Pilgrim" },
    { "min": 41, "max": 45, "encounter": "Men, Raider" },
    { "min": 46, "max": 50, "encounter": "Men, Tribesmen (hillmen in Perrenland; 10–60 in Ket)" },
    { "min": 51, "max": 100, "encounter": "Use Standard encounter Tables", useStandard: true }
  ],

  "pale_ratik_tenh": [
    { "min": 1, "max": 3, "encounter": "Demi-human" },
    { "min": 4, "max": 5, "encounter": "Dwarf" },
    { "min": 6, "max": 9, "encounter": "Dwarf, Mountain" },
    { "min": 10, "max": 11, "encounter": "Elf, Sylvan" },
    { "min": 12, "max": 13, "encounter": "Gnome" },
    { "min": 14, "max": 17, "encounter": "Humanoid" },
    { "min": 18, "max": 21, "encounter": "Men, Bandit" },
    { "min": 22, "max": 23, "encounter": "Men, Brigand" },
    { "min": 24, "max": 30, "encounter": "Men, Merchant" },
    { "min": 31, "max": 35, "encounter": "Men, Patrol (Levies)" },
    { "min": 36, "max": 37, "encounter": "Men, Patrol (Medium)" },
    { "min": 38, "max": 40, "encounter": "Men, Pilgrim" },
    { "min": 41, "max": 44, "encounter": "Men, Raider" },
    { "min": 45, "max": 45, "encounter": "Men, Tribesmen (hillmen)" },
    { "min": 46, "max": 46, "encounter": "Troll" },
    { "min": 47, "max": 100, "encounter": "Use Standard encounter Tables", useStandard: true }
  ],

  "scarlet_brotherhood_sunndi": [
    { "min": 1, "max": 5, "encounter": "Demi-human" },
    { "min": 6, "max": 9, "encounter": "Dwarf, Mountain" },
    { "min": 10, "max": 13, "encounter": "Elf, Gray" },
    { "min": 14, "max": 15, "encounter": "Gnome" },
    { "min": 16, "max": 22, "encounter": "Humanoid" },
    { "min": 23, "max": 25, "encounter": "Lizardmen (near swamp)" },
    { "min": 26, "max": 28, "encounter": "Men, Bandit" },
    { "min": 29, "max": 30, "encounter": "Men, Brigand" },
    { "min": 31, "max": 40, "encounter": "Men, Merchant" },
    { "min": 41, "max": 43, "encounter": "Men, Patrol (Levies)" },
    { "min": 44, "max": 45, "encounter": "Men, Patrol (Light)" },
    { "min": 46, "max": 47, "encounter": "Men, Patrol (Slaver)" },
    { "min": 48, "max": 49, "encounter": "Men, Pilgrim" },
    { "min": 50, "max": 56, "encounter": "Men, Raider" },
    { "min": 57, "max": 60, "encounter": "Men, Tribesmen (hillmen)" },
    { "min": 61, "max": 100, "encounter": "Use Standard encounter Tables", useStandard: true }
  ],

  "sea_princes": [
    { "min": 1, "max": 3, "encounter": "Demi-human" },
    { "min": 4, "max": 7, "encounter": "Humanoid" },
    { "min": 8, "max": 12, "encounter": "Men, Bandit" },
    { "min": 13, "max": 15, "encounter": "Men, Brigand" },
    { "min": 16, "max": 18, "encounter": "Men, Bucaneer" },
    { "min": 19, "max": 28, "encounter": "Men, Merchant" },
    { "min": 29, "max": 33, "encounter": "Men, Patrol (Light)" },
    { "min": 34, "max": 39, "encounter": "Men, Patrol (Slaver)" },
    { "min": 40, "max": 41, "encounter": "Men, Pilgrim" },
    { "min": 42, "max": 45, "encounter": "Men, Tribesmen (hills or marshes)" },
    { "min": 46, "max": 100, "encounter": "Use Standard encounter Tables", useStandard: true }
  ],

  "wild_coast": [
    { "min": 1, "max": 5, "encounter": "Demi-human" },
    { "min": 6, "max": 12, "encounter": "Humanoid" },
    { "min": 13, "max": 18, "encounter": "Men, Bandit" },
    { "min": 19, "max": 22, "encounter": "Men, Brigand" },
    { "min": 23, "max": 30, "encounter": "Men, Merchant" },
    { "min": 31, "max": 36, "encounter": "Men, Patrol (Medium)" },
    { "min": 37, "max": 38, "encounter": "Men, Patrol (Slaver)" },
    { "min": 39, "max": 40, "encounter": "Men, Raider" },
    { "min": 41, "max": 100, "encounter": "Use Standard encounter Tables", useStandard: true }
  ]
};

// Export default for easier importing


// ─── from scripts/data/greyhawk-geography.js ─────────────────────────────────────────────────
// Exports geographical area encounter tables for World of Greyhawk
const GREYHAWK_GEOGRAPHICAL_TABLES = {
    // Forests
    "adri_forest": [
      { min: 1, max: 5, encounter: "Elves, Sylvan" },
      { min: 6, max: 8, encounter: "Gnomes" },
      { min: 9, max: 15, encounter: "Halflings" },
      { min: 16, max: 18, encounter: "Humanoids" },
      { min: 19, max: 20, encounter: "Men, Bandits" },
      { min: 21, max: 45, encounter: "Men, Woodsmen" },
      { min: 46, max: 0, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "grandwood": [
      { min: 1, max: 7, encounter: "Elves, Sylvan" },
      { min: 8, max: 10, encounter: "Halflings" },
      { min: 11, max: 15, encounter: "Humanoids" },
      { min: 16, max: 20, encounter: "Men, Bandits", note: "50% of Grandwood Forest woodsmen tend toward good alignment" },
      { min: 21, max: 23, encounter: "Men, Brigands" },
      { min: 24, max: 25, encounter: "Men, Patrol, False" },
      { min: 26, max: 30, encounter: "Men, Patrol, Light" },
      { min: 31, max: 45, encounter: "Men, Woodsmen" },
      { min: 46, max: 50, encounter: "Orc Soldiery" },
      { min: 51, max: 0, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "amedio_jungle_hepmonaland": [
      { min: 1, max: 10, encounter: "Dakon" },
      { min: 11, max: 15, encounter: "Gibberlings" },
      { min: 16, max: 20, encounter: "Men, Patrol, Slaver" },
      { min: 21, max: 30, encounter: "Men, Tribesmen" },
      { min: 31, max: 45, encounter: "Men, Tribesmen (cannibals/headhunters)" },
      { min: 46, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "axewood_menowood_silverwood": [
      { min: 1, max: 30, encounter: "Elves, Sylvan" },
      { min: 31, max: 35, encounter: "Gnomes" },
      { min: 36, max: 38, encounter: "Halflings, Tallfellows" },
      { min: 39, max: 40, encounter: "Men, Patrol, Light" },
      { min: 41, max: 42, encounter: "Men, Tribesmen", note: "Tribesmen are woodsmen in Axewood" },
      { min: 43, max: 50, encounter: "Treants" },
      { min: 51, max: 55, encounter: "Unicorns" },
      { min: 56, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true, note: "Faerie tables for Axewood, Menowood, Silverwood" }
    ],

    "dreadwood": [
      { min: 1, max: 10, encounter: "Elves, Sylvan" },
      { min: 11, max: 13, encounter: "Gnomes" },
      { min: 14, max: 14, encounter: "Halflings, Hairfeet" },
      { min: 15, max: 15, encounter: "Halflings, Tallfellows" },
      { min: 16, max: 25, encounter: "Humanoids" },
      { min: 26, max: 40, encounter: "Men, Tribesmen", note: "Tribesmen are woodsmen in Axewood" },
      { min: 41, max: 42, encounter: "Ogres" },
      { min: 43, max: 44, encounter: "Treants" },
      { min: 45, max: 45, encounter: "Trolls" },
      { min: 46, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true, note: "Faerie tables for Axewood, Menowood, Silverwood" }
    ],
    
    "rieuwood": [
      { min: 1, max: 5, encounter: "Elves, Patrol" },
      { min: 6, max: 15, encounter: "Elves, Sylvan" },
      { min: 16, max: 20, encounter: "Gnomes" },
      { min: 21, max: 25, encounter: "Humanoids" },
      { min: 26, max: 30, encounter: "Men, Bandits" },
      { min: 31, max: 33, encounter: "Men, Brigands" },
      { min: 34, max: 35, encounter: "Men, Characters" },
      { min: 36, max: 40, encounter: "Men, Patrol, Light" },
      { min: 41, max: 45, encounter: "Men, Raiders" },
      { min: 46, max: 65, encounter: "Men, Tribesmen", note: "Tribesmen are woodsmen in Axewood" },
      { min: 66, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true, note: "Faerie tables for Axewood, Menowood, Silverwood" }
    ],

    "bramblewood_nutherwood_phostwood_udgru": [
      { min: 1, max: 3, encounter: "Demi-humans" },
      { min: 4, max: 10, encounter: "Humanoids" },
      { min: 11, max: 15, encounter: "Men, Bandits" },
      { min: 16, max: 18, encounter: "Men, Brigands" },
      { min: 19, max: 22, encounter: "Men, Patrol, Medium" },
      { min: 23, max: 28, encounter: "Men, Tribesmen (woodsmen)" },
      { min: 29, max: 30, encounter: "Ogres" },
      { min: 31, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "burneal_forest": [
      { min: 1, max: 5, encounter: "Kobolds" },
      { min: 6, max: 10, encounter: "Men, Nomads" },
      { min: 11, max: 20, encounter: "Men, Tribesmen", note: "plus 1-20 wolf dogs" },
      { min: 21, max: 25, encounter: "Quaggoths" },
      { min: 26, max: 30, encounter: "Wolf Dogs", note: "as wild dogs but equal to war dogs" },
      { min: 31, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "celadon_forest": [
      { min: 1, max: 3, encounter: "Demi-humans" },
      { min: 4, max: 25, encounter: "Elves, Sylvan" },
      { min: 26, max: 27, encounter: "Gnolls" },
      { min: 28, max: 30, encounter: "Humanoids" },
      { min: 31, max: 35, encounter: "Men, Bandits" },
      { min: 36, max: 45, encounter: "Men, Brigands" },
      { min: 46, max: 65, encounter: "Men, Tribesmen (rovers)" },
      { min: 66, max: 75, encounter: "Men, Woodsmen" },
      { min: 76, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "fellreev_forest": [
      { min: 1, max: 5, encounter: "Humanoids" },
      { min: 6, max: 13, encounter: "Men, Bandits" },
      { min: 14, max: 19, encounter: "Men, Brigands" },
      { min: 20, max: 23, encounter: "Men, Characters" },
      { min: 24, max: 30, encounter: "Men, Patrol, Light" },
      { min: 31, max: 40, encounter: "Men, Tribesmen (rovers)" },
      { min: 41, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "gamboge_forest": [
      { min: 1, max: 1, encounter: "Demi-humans" },
      { min: 2, max: 4, encounter: "Dwarves" },
      { min: 5, max: 14, encounter: "Elves, High" },
      { min: 15, max: 17, encounter: "Elves, Sylvan" },
      { min: 18, max: 22, encounter: "Gnomes" },
      { min: 23, max: 23, encounter: "Halflings, Hairfeet" },
      { min: 24, max: 25, encounter: "Halflings, Tallfellows" },
      { min: 26, max: 30, encounter: "Humanoids" },
      { min: 31, max: 34, encounter: "Men, Bandits" },
      { min: 35, max: 37, encounter: "Men, Brigands" },
      { min: 38, max: 48, encounter: "Men, Nomads", note: "forest edges only" },
      { min: 49, max: 50, encounter: "Ogres" },
      { min: 51, max: 100, encounter: "Treants" }
    ],

    "dim_forest": [
      { min: 1, max: 3, encounter: "Demi-humans" },
      { min: 4, max: 12, encounter: "Elves, Sylvan" },
      { min: 13, max: 18, encounter: "Gnomes" },
      { min: 19, max: 22, encounter: "Humanoids" },
      { min: 23, max: 25, encounter: "Men, Bandits" },
      { min: 26, max: 27, encounter: "Men, Brigands" },
      { min: 28, max: 31, encounter: "Men, Patrol, Light" },
      { min: 32, max: 35, encounter: "Men, Raiders" },
      { min: 36, max: 100, encounter: "Men, Tribesmen (woodsmen)" }
    ],

    "hornwood": [
      { min: 1, max: 5, encounter: "Demi-humans" },
      { min: 6, max: 20, encounter: "Elves, Sylvan" },
      { min: 21, max: 25, encounter: "Gnomes" },
      { min: 26, max: 30, encounter: "Humanoids" },
      { min: 31, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "oytwood": [
      { min: 1, max: 5, encounter: "Demi-humans" },
      { min: 6, max: 20, encounter: "Elves, Sylvan" },
      { min: 21, max: 25, encounter: "Gnomes" },
      { min: 26, max: 30, encounter: "Humanoids" },
      { min: 31, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "forlorn_forest": [
      { min: 1, max: 5, encounter: "Humanoids" },
      { min: 6, max: 10, encounter: "Men, Tribesmen" },
      { min: 11, max: 20, encounter: "Ogres" },
      { min: 21, max: 25, encounter: "Quaggoth" },
      { min: 26, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "hraak_forest": [
      { min: 1, max: 5, encounter: "Humanoids" },
      { min: 6, max: 10, encounter: "Men, Tribesmen" },
      { min: 11, max: 20, encounter: "Ogres" },
      { min: 21, max: 25, encounter: "Quaggoth" },
      { min: 26, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "sablewood": [
      { min: 1, max: 10, encounter: "Humanoids" },
      { min: 11, max: 15, encounter: "Men, Berserkers (patrol)" },
      { min: 16, max: 25, encounter: "Men, Tribesmen", note: "Sablewood and Spikey Forest tribesmen are woodsmen" },
      { min: 26, max: 30, encounter: "Ogres" },
      { min: 31, max: 100, encounter: "Quaggoth" }
    ],

    "spikey_forest": [
      { min: 1, max: 10, encounter: "Humanoids" },
      { min: 11, max: 15, encounter: "Men, Berserkers (patrol)" },
      { min: 16, max: 25, encounter: "Men, Tribesmen", note: "Sablewood and Spikey Forest tribesmen are woodsmen" },
      { min: 26, max: 30, encounter: "Ogres" },
      { min: 31, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "gnarley_forest": [
      { min: 1, max: 5, encounter: "Demi-humans" },
      { min: 6, max: 15, encounter: "Elves, Sylvan" },
      { min: 16, max: 19, encounter: "Gnomes" },
      { min: 20, max: 24, encounter: "Humanoids" },
      { min: 25, max: 27, encounter: "Men, Bandits" },
      { min: 28, max: 29, encounter: "Men, Brigands" },
      { min: 30, max: 35, encounter: "Men, Merchants" },
      { min: 36, max: 38, encounter: "Men, Patrol, Light" },
      { min: 39, max: 50, encounter: "Men, Tribesmen (woodsmen)" },
      { min: 51, max: 100, encounter: "Men, Woodsmen" }
    ],

    "welkwood": [
      { min: 1, max: 8, encounter: "Demi-humans" },
      { min: 9, max: 15, encounter: "Elves, Sylvan" },
      { min: 16, max: 20, encounter: "Humanoids" },
      { min: 21, max: 24, encounter: "Men, Bandits" },
      { min: 25, max: 26, encounter: "Men, Brigands" },
      { min: 27, max: 46, encounter: "Treants" },
      { min: 47, max: 48, encounter: "Unicorns" },
      { min: 49, max: 50, encounter: "Use Standard Encounter Tables", useStandard: true },
      { min: 51, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "loftwood_timberway": [
      { min: 1, max: 10, encounter: "Humanoids" },
      { min: 11, max: 15, encounter: "Men, Patrol, Light" },
      { min: 16, max: 20, encounter: "Men, Raiders" },
      { min: 21, max: 30, encounter: "Men, Tribesmen (woodsmen)" },
      { min: 31, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "suss_forest": [
      { min: 1, max: 2, encounter: "Demi-humans" },
      { min: 3, max: 4, encounter: "Ettercaps" },
      { min: 5, max: 8, encounter: "Gibberlings" },
      { min: 9, max: 12, encounter: "Gnolls" },
      { min: 13, max: 18, encounter: "Humanoids" },
      { min: 19, max: 24, encounter: "Kobolds" },
      { min: 25, max: 27, encounter: "Men, Bandits" },
      { min: 28, max: 29, encounter: "Men, Brigands" },
      { min: 30, max: 30, encounter: "Men, Characters" },
      { min: 31, max: 33, encounter: "Men, Patrol, Light" },
      { min: 34, max: 35, encounter: "Ogres" },
      { min: 36, max: 37, encounter: "Spiders, Giant" },
      { min: 38, max: 40, encounter: "Spiders, Large" },
      { min: 41, max: 42, encounter: "Susseri" },
      { min: 43, max: 48, encounter: "Tree (sentient, semi-mobile)", note: "30% are dangerous" },
      { min: 49, max: 49, encounter: "Trolls" },
      { min: 50, max: 55, encounter: "Vegetation (dangerous)", note: "Use those described in AD&D or devise special ones" },
      { min: 56, max: 100, encounter: "Weasels, Giant" }
    ],

    "tangles": [
      { min: 1, max: 10, encounter: "Humanoids" },
      { min: 11, max: 22, encounter: "Men, Bandits" },
      { min: 23, max: 30, encounter: "Men, Brigands" },
      { min: 31, max: 35, encounter: "Men, Patrol, Light" },
      { min: 36, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "vesve_forest_eastern": [
      { min: 1, max: 2, encounter: "Bugbears" },
      { min: 3, max: 5, encounter: "Gnolls" },
      { min: 6, max: 12, encounter: "Humanoids" },
      { min: 13, max: 18, encounter: "Men, Bandits" },
      { min: 19, max: 25, encounter: "Men, Patrol, Light" },
      { min: 26, max: 30, encounter: "Men, Raiders" },
      { min: 31, max: 34, encounter: "Norkers" },
      { min: 35, max: 36, encounter: "Ogres" },
      { min: 37, max: 40, encounter: "Ogrillons" },
      { min: 41, max: 42, encounter: "Trolls" },
      { min: 43, max: 50, encounter: "Xvarts" },
      { min: 51, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "vesve_forest_western": [
      { min: 1, max: 5, encounter: "Elves, High" },
      { min: 6, max: 10, encounter: "Elves, Patrol" },
      { min: 11, max: 20, encounter: "Elves, Sylvan" },
      { min: 21, max: 25, encounter: "Gnomes" },
      { min: 26, max: 27, encounter: "Halflings, Hairfeet" },
      { min: 28, max: 30, encounter: "Halflings, Tallfellow" },
      { min: 31, max: 35, encounter: "Humanoids" },
      { min: 36, max: 40, encounter: "Men, Bandits" },
      { min: 41, max: 45, encounter: "Men, Patrol, Light" },
      { min: 46, max: 58, encounter: "Men, Tribesmen (woodsmen)" },
      { min: 59, max: 60, encounter: "Ogres" },
      { min: 61, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],
    
    // Mountains
    "barrier_peaks_crystalmist_jotens": [
      { min: 1, max: 4, encounter: "Dwarves, Mountain" },
      { min: 5, max: 10, encounter: "Giants" },
      { min: 11, max: 15, encounter: "Giants, Frost" },
      { min: 16, max: 18, encounter: "Giants, Hill" },
      { min: 19, max: 20, encounter: "Giants, Mountain" },
      { min: 21, max: 24, encounter: "Giants, Stone" },
      { min: 25, max: 35, encounter: "Humanoids" },
      { min: 36, max: 38, encounter: "Men, Cavemen" },
      { min: 39, max: 42, encounter: "Men, Tribesmen" },
      { min: 43, max: 47, encounter: "Ogres" },
      { min: 48, max: 50, encounter: "Trolls" },
      { min: 51, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "clatspur_range_yatil_mountains": [
      { min: 1, max: 5, encounter: "Dwarves, Mountain" },
      { min: 6, max: 7, encounter: "Giants" },
      { min: 8, max: 11, encounter: "Humanoids" },
      { min: 12, max: 13, encounter: "Men, Cavemen" },
      { min: 14, max: 15, encounter: "Men, Patrol, Medium" },
      { min: 16, max: 20, encounter: "Men, Patrol, Light" },
      { min: 21, max: 32, encounter: "Men, Tribesmen (mountaineers)" },
      { min: 33, max: 34, encounter: "Ogres" },
      { min: 35, max: 35, encounter: "Trolls" },
      { min: 36, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "corusk_mountains_griff_mountains_rakers": [
      { min: 1, max: 4, encounter: "Aarakoora" },
      { min: 5, max: 6, encounter: "Dwarves" },
      { min: 7, max: 10, encounter: "Dwarves, Mountain" },
      { min: 11, max: 14, encounter: "Giants" },
      { min: 15, max: 20, encounter: "Griffons" },
      { min: 21, max: 25, encounter: "Humanoids" },
      { min: 26, max: 27, encounter: "Men, Raiders" },
      { min: 28, max: 36, encounter: "Men, Tribesmen (mountaineers)" },
      { min: 37, max: 38, encounter: "Ogres" },
      { min: 39, max: 40, encounter: "Trolls" },
      { min: 41, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "hellfurnaces": [
      { min: 1, max: 2, encounter: "Firedrake" },
      { min: 3, max: 6, encounter: "Firenewt" },
      { min: 7, max: 10, encounter: "Firetoad" },
      { min: 11, max: 15, encounter: "Giants" },
      { min: 16, max: 25, encounter: "Giants, Fire" },
      { min: 26, max: 30, encounter: "Hell Hounds" },
      { min: 31, max: 38, encounter: "Humanoids" },
      { min: 39, max: 40, encounter: "Men, Cavemen" },
      { min: 41, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "lortmil_mountains": [
      { min: 1, max: 4, encounter: "Aarakoora" },
      { min: 5, max: 12, encounter: "Dwarves" },
      { min: 13, max: 25, encounter: "Dwarves, Mountain" },
      { min: 26, max: 35, encounter: "Gnomes" },
      { min: 36, max: 38, encounter: "Halflings, Hairfeet" },
      { min: 39, max: 45, encounter: "Halflings, Stouts" },
      { min: 46, max: 49, encounter: "Humanoids" },
      { min: 50, max: 53, encounter: "Men, Bandits" },
      { min: 54, max: 55, encounter: "Men, Brigands" },
      { min: 56, max: 57, encounter: "Men, Characters" },
      { min: 58, max: 65, encounter: "Men, Patrol, Light" },
      { min: 66, max: 75, encounter: "Men, Tribesmen (mountaineers)" },
      { min: 76, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "sulhaut_mountains": [
      { min: 1, max: 3, encounter: "Demi-humans" },
      { min: 4, max: 10, encounter: "Elves, Drow (night only)" },
      { min: 11, max: 12, encounter: "Giants" },
      { min: 13, max: 17, encounter: "Humanoids" },
      { min: 18, max: 25, encounter: "Men, Nomads", note: "appear only in extreme north of Sulhaut Mountains" },
      { min: 26, max: 40, encounter: "Men, Tribesmen" },
      { min: 41, max: 60, encounter: "Ogres" },
      { min: 61, max: 100, encounter: "Use Pleistocene Conditions Encounter Tables" }
    ],

    "ullsprue": [
      { min: 1, max: 8, encounter: "Humanoids" },
      { min: 9, max: 15, encounter: "Men, Nomads", note: "appear only in extreme north of Sulhaut Mountains" },
      { min: 16, max: 35, encounter: "Men, Tribesmen" },
      { min: 36, max: 40, encounter: "Ogres" },
      { min: 41, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],
    
    // Hills and Highlands
    "abbor_alz": [
      { min: 1, max: 3, encounter: "Giants, Hill" },
      { min: 4, max: 10, encounter: "Humanoids" },
      { min: 11, max: 15, encounter: "Men, Patrol, Medium" },
      { min: 16, max: 40, encounter: "Men, Tribesmen", note: "plus 20-80" },
      { min: 41, max: 43, encounter: "Ogres" },
      { min: 44, max: 45, encounter: "Trolls" },
      { min: 46, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "blemu_hills_bluff_hills_drachensgrabs_howling_hills_spire_ridge_tors": [
      { min: 1, max: 2, encounter: "Giants, Hill" },
      { min: 3, max: 20, encounter: "Humanoids" },
      { min: 21, max: 24, encounter: "Men, Bandits" },
      { min: 25, max: 30, encounter: "Men, Brigands" },
      { min: 31, max: 40, encounter: "Men, Tribesmen (hillmen)" },
      { min: 41, max: 42, encounter: "Ogres" },
      { min: 43, max: 44, encounter: "Trolls" },
      { min: 45, max: 45, encounter: "Trolls, Giant" },
      { min: 46, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "cairn_hills": [
      { min: 1, max: 5, encounter: "Dwarves" },
      { min: 6, max: 10, encounter: "Gnomes" },
      { min: 11, max: 14, encounter: "Halflings, Hairfeet" },
      { min: 15, max: 17, encounter: "Halflings, Stouts" },
      { min: 18, max: 23, encounter: "Humanoids" },
      { min: 24, max: 29, encounter: "Men, Bandits" },
      { min: 30, max: 33, encounter: "Men, Brigands" },
      { min: 34, max: 36, encounter: "Men, Characters" },
      { min: 37, max: 45, encounter: "Men, Merchants" },
      { min: 46, max: 48, encounter: "Men, Patrol" },
      { min: 49, max: 50, encounter: "Men, Rhennee (near water)" },
      { min: 51, max: 60, encounter: "Men, Tribesmen" },
      { min: 61, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "flinty_hills_good_hills_gull_cliffs_headlands_hollow_highlands_iron_hills_little_hills_lorridges_stark_mounds": [
      { min: 1, max: 5, encounter: "Demi-humans" },
      { min: 6, max: 20, encounter: "Dwarves" },
      { min: 21, max: 40, encounter: "Gnomes" },
      { min: 41, max: 50, encounter: "Halflings, Stouts" },
      { min: 51, max: 55, encounter: "Men, Bandits" },
      { min: 56, max: 75, encounter: "Men, Tribesmen (hillmen)" },
      { min: 76, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "hestmark_highlands_glorioles": [
      { min: 1, max: 3, encounter: "Demi-humans" },
      { min: 4, max: 12, encounter: "Dwarves" },
      { min: 13, max: 16, encounter: "Dwarves, Mountain" },
      { min: 17, max: 25, encounter: "Elves, High" },
      { min: 26, max: 28, encounter: "Elves, Patrol" },
      { min: 29, max: 35, encounter: "Gnomes" },
      { min: 36, max: 40, encounter: "Humanoids" },
      { min: 41, max: 50, encounter: "Men, Bandits", note: "90% are actually good hillmen" },
      { min: 51, max: 55, encounter: "Men, Brigands" },
      { min: 56, max: 60, encounter: "Men, Merchants" },
      { min: 61, max: 63, encounter: "Men, Patrol, Light" },
      { min: 64, max: 70, encounter: "Men, Raiders" },
      { min: 71, max: 75, encounter: "Men, Tribesmen (hillmen)" },
      { min: 76, max: 80, encounter: "Orc Soldiery" },
      { min: 81, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "kron_hills": [
      { min: 1, max: 5, encounter: "Demi-humans" },
      { min: 6, max: 10, encounter: "Dwarves" },
      { min: 11, max: 30, encounter: "Gnomes" },
      { min: 31, max: 35, encounter: "Halflings, Stouts" },
      { min: 36, max: 40, encounter: "Humanoids" },
      { min: 41, max: 47, encounter: "Men, Bandits", note: "50% are actually good hillmen" },
      { min: 48, max: 50, encounter: "Men, Brigands" },
      { min: 51, max: 60, encounter: "Men, Tribesmen (hillmen)" },
      { min: 61, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "sepia_uplands_tusman_hills_yecha_hills": [
      { min: 1, max: 5, encounter: "Demi-humans" },
      { min: 6, max: 15, encounter: "Humanoids" },
      { min: 16, max: 20, encounter: "Men, Bandits" },
      { min: 21, max: 25, encounter: "Men, Brigands" },
      { min: 26, max: 40, encounter: "Men, Nomads" },
      { min: 41, max: 55, encounter: "Men, Tribesmen" },
      { min: 56, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    // Bodies of Water
    "artonsamay_nesser_selintan_velverdyva_veng_rivers": [
      { min: 1, max: 20, encounter: "Men, Rhennee" },
      { min: 21, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "nyr_dyv_quag_lake_whyestil_lake": [
      { min: 1, max: 20, encounter: "Men, Buccaneers (patrol warship)" },
      { min: 21, max: 40, encounter: "Men, Merchants" },
      { min: 41, max: 50, encounter: "Men, Merchants (fishing fleet)" },
      { min: 51, max: 60, encounter: "Men, Pirates" },
      { min: 61, max: 80, encounter: "Men, Rhennee" },
      { min: 81, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "salt_water_seas_bays": [
      { min: 1, max: 5, encounter: "Men, Buccaneers" },
      { min: 6, max: 25, encounter: "Men, Merchants" },
      { min: 26, max: 30, encounter: "Men, Patrol" },
      { min: 31, max: 35, encounter: "Men, Pirates" },
      { min: 36, max: 40, encounter: "Men, Raiders (Galley-type craft)" },
      { min: 41, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    // Wastelands
    "bright_desert": [
      { min: 1, max: 15, encounter: "Men, Dervishes" },
      { min: 16, max: 40, encounter: "Men, Nomads" },
      { min: 41, max: 45, encounter: "Men, Tribesmen (hills)" },
      { min: 46, max: 50, encounter: "Pernicons" },
      { min: 51, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "dry_steppes": [
      { min: 1, max: 7, encounter: "Herd Animals" },
      { min: 8, max: 10, encounter: "Horses" },
      { min: 11, max: 15, encounter: "Humanoids" },
      { min: 16, max: 19, encounter: "Men, Dervishes" },
      { min: 20, max: 30, encounter: "Men, Nomads" },
      { min: 31, max: 35, encounter: "Men, Tribesmen" },
      { min: 36, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "land_of_black_ice": [
      { min: 1, max: 15, encounter: "Bugbears, Blue", note: "same as normal bugbears" },
      { min: 16, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "rift_canyon": [
      { min: 1, max: 10, encounter: "Humanoids" },
      { min: 11, max: 25, encounter: "Men, Bandits" },
      { min: 26, max: 30, encounter: "Men, Brigands" },
      { min: 31, max: 32, encounter: "Men, Characters" },
      { min: 33, max: 37, encounter: "Men, Raiders (as knights)" },
      { min: 38, max: 40, encounter: "Ogres" },
      { min: 41, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "sea_of_dust": [
      { min: 1, max: 3, encounter: "Beetle, Boring" },
      { min: 4, max: 5, encounter: "Bulettes", note: "half-strength, sand variety" },
      { min: 6, max: 12, encounter: "Centipedes, Giant", note: "half HD" },
      { min: 13, max: 17, encounter: "Dune Stalkers (1-6)" },
      { min: 18, max: 25, encounter: "Firenewts", note: "near Hellfurnaces only" },
      { min: 26, max: 30, encounter: "Firetoads", note: "near Hellfurnaces only" },
      { min: 31, max: 39, encounter: "Jermlaine", note: "These creatures inhabit thoqqua tunnels" },
      { min: 40, max: 43, encounter: "Meenlocks", note: "These creatures inhabit thoqqua tunnels" },
      { min: 44, max: 45, encounter: "Men, Characters", note: "extreme west and south only" },
      { min: 46, max: 47, encounter: "Men, Nomads", note: "extreme west and south only" },
      { min: 48, max: 53, encounter: "Mites", note: "These creatures inhabit thoqqua tunnels" },
      { min: 54, max: 61, encounter: "Osquips", note: "These creatures inhabit thoqqua tunnels" },
      { min: 62, max: 70, encounter: "Pernicon" },
      { min: 71, max: 77, encounter: "Rats, Giant" },
      { min: 78, max: 80, encounter: "Scorpions, Giant" },
      { min: 81, max: 82, encounter: "Snake, Giant, Amphisbaena" },
      { min: 83, max: 85, encounter: "Snakes, Giant, Poisonous" },
      { min: 86, max: 88, encounter: "Snakes, Giant, Spitting" },
      { min: 89, max: 93, encounter: "Snyads", note: "These creatures inhabit thoqqua tunnels" },
      { min: 94, max: 96, encounter: "Spiders, Huge" },
      { min: 97, max: 99, encounter: "Thoqqua", note: "2-foot diameter, sand/ash eater" },
      { min: 100, max: 100, encounter: "Roll again or choose any creature" }
    ],
    
    // Marshes
    "cold_marshes": [
      { min: 1, max: 3, encounter: "Frost Men" },
      { min: 4, max: 10, encounter: "Gnolls" },
      { min: 11, max: 30, encounter: "Men, Tribesmen" },
      { min: 31, max: 40, encounter: "Quaggoths" },
      { min: 41, max: 45, encounter: "Toad, Ice" },
      { min: 46, max: 50, encounter: "Troll, Ice" },
      { min: 51, max: 0, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "lone_heath": [
      { min: 1, max: 30, encounter: "Demi-humans" },
      { min: 31, max: 55, encounter: "Men, Bandits", note: "good alignment" },
      { min: 56, max: 65, encounter: "Men, Patrol, Light" },
      { min: 66, max: 95, encounter: "Men, Tribesmen", note: "good marshmen" },
      { min: 96, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ],

    "vast_swamp": [
      { min: 1, max: 10, encounter: "Bullywugs" },
      { min: 11, max: 15, encounter: "Humanoids" },
      { min: 16, max: 20, encounter: "Lizardmen" },
      { min: 21, max: 25, encounter: "Men, Bandits" },
      { min: 26, max: 27, encounter: "Men, Patrol, Light", note: "near edges only" },
      { min: 28, max: 36, encounter: "Men, Tribesmen (marshmen)" },
      { min: 37, max: 40, encounter: "Trolls" },
      { min: 41, max: 100, encounter: "Use Standard Encounter Tables", useStandard: true }
    ]
    
    // Add other geographical regions as needed
  };
  
  // Export default for easier importing


// ── Waterborne tables (Slice 4) ───────────────────────────────────────
// Lake / sea encounter tables, dispatched by lake.kind × lake.depth.
// Empty stubs — content seeding is a separate task. Engine returns
// "no entries seeded" when the table is empty, mirroring the existing
// "no outdoor table for terrain X" pattern.
//
// Schema matches GREYHAWK_GEOGRAPHICAL_TABLES rows:
//   { min, max, encounter, useStandard?, note?, subtable? }
// The d100 roll runs on these the same way rollOnTable does.
//
// Per design DESIGN-paths-water.md Slice 4. Tables stay empty until
// the GM seeds them — this just wires the dispatch.

const WATERBORNE_TABLES = {
  lake_shallow: [
    // TODO: seed from MM water encounters (giant frog, giant crayfish,
    // crocodile, lizardman, fish men) and Greyhawk-canonical lake life.
  ],
  lake_deep: [
    // TODO: seed deep-lake creatures (giant pike, lake serpents,
    // sahuagin in inland sea cases, etc).
  ],
  sea_shallow: [
    // TODO: seed coastal / shallow sea (sharks, barracuda, lacedons,
    // merfolk, sahuagin, ixitxachitl).
  ],
  sea_deep: [
    // TODO: seed open-ocean / deep-sea (giant squid, kraken, deepspawn,
    // pirate ships, sahuagin raiders, dragon turtles).
  ],
};


// ─── expose as a single namespace object ──────────────────────────
window.GCCEncounterData = {
  MONSTER_MANUAL,
  DMG_OUTDOOR_TIMING_RULES,
  DMG_ENCOUNTER_FREQUENCY,
  DMG_TEMPERATE_UNINHABITED,
  DMG_TEMPERATE_INHABITED,
  DMG_ARCTIC_CONDITIONS,
  DMG_SUBARCTIC_CONDITIONS,
  DMG_SUBTABLES,
  DMG_CHARACTER_ENCOUNTERS,
  DMG_PATROL_ENCOUNTERS,
  DMG_FORTRESS_ENCOUNTERS,
  GREYHAWK_REGIONAL_TABLES,
  GREYHAWK_GEOGRAPHICAL_TABLES,
  WATERBORNE_TABLES,
};
})();

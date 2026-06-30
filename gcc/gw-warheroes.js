// gw-warheroes.js v0.1.0 — War Heroes commando + Place of Birth + Standard Weapons
// Place of Birth wraps species/culture. Commando = alternate PSH path.
// Standard Weapons feed commando weapon picks and are available to PSH.
// NOTE: the Alliance Native branch needs the Cryptic Alliance table (not yet provided).
(function(){ window.GWWarHeroes = {
 "version": "0.1.0",
 "placeOfBirth": [
  {
   "lo": 1,
   "hi": 80,
   "key": "alliance",
   "name": "Alliance Native",
   "desc": "Born/raised in a Cryptic Alliance; roll the Cryptic Alliance table for species and culture."
  },
  {
   "lo": 81,
   "hi": 90,
   "key": "nonAlliance",
   "name": "Non-Alliance Native",
   "desc": "Born outside Alliance influence; roll species and culture."
  },
  {
   "lo": 91,
   "hi": 100,
   "key": "anachronist",
   "name": "Anachronist",
   "desc": "From just before the holocaust; High Tech culture."
  }
 ],
 "nonAllianceCulture": [
  {
   "lo": 1,
   "hi": 33,
   "name": "Primitive"
  },
  {
   "lo": 34,
   "hi": 66,
   "name": "Mixed"
  },
  {
   "lo": 67,
   "hi": 100,
   "name": "High Tech"
  }
 ],
 "anachronistSpecies": [
  {
   "lo": 1,
   "hi": 80,
   "name": "Pure Strain Human"
  },
  {
   "lo": 81,
   "hi": 100,
   "name": "Tech Construct"
  }
 ],
 "commando": {
  "training": {
   "ability": "Natural Weaponry",
   "cp": 5,
   "weakness": "Subject to Orders",
   "weaknessCp": -5
  },
  "offensive": [
   {
    "lo": 1,
    "hi": 10,
    "name": "Experience Levels"
   },
   {
    "lo": 11,
    "hi": 30,
    "name": "Heightened Agility"
   },
   {
    "lo": 31,
    "hi": 40,
    "name": "Heightened Attack"
   },
   {
    "lo": 41,
    "hi": 50,
    "name": "Heightened Expertise"
   },
   {
    "lo": 51,
    "hi": 70,
    "name": "Heightened Strength"
   },
   {
    "lo": 71,
    "hi": 90,
    "name": "Natural Weaponry"
   },
   {
    "lo": 91,
    "hi": 100,
    "name": "Willpower C) Self-Control"
   }
  ],
  "defensive": [
   {
    "lo": 1,
    "hi": 10,
    "name": "Experience Levels"
   },
   {
    "lo": 11,
    "hi": 20,
    "name": "Durability"
   },
   {
    "lo": 21,
    "hi": 40,
    "name": "Heightened Agility"
   },
   {
    "lo": 41,
    "hi": 60,
    "name": "Heightened Defense"
   },
   {
    "lo": 61,
    "hi": 80,
    "name": "Heightened Endurance"
   },
   {
    "lo": 81,
    "hi": 90,
    "name": "Heightened Initiative"
   },
   {
    "lo": 91,
    "hi": 100,
    "name": "Willpower F) Iron Will"
   }
  ],
  "misc": [
   {
    "lo": 1,
    "hi": 10,
    "name": "Knowledge"
   },
   {
    "lo": 11,
    "hi": 20,
    "name": "Companion"
   },
   {
    "lo": 21,
    "hi": 30,
    "name": "Heightened Cool"
   },
   {
    "lo": 31,
    "hi": 40,
    "name": "Heightened Intelligence"
   },
   {
    "lo": 41,
    "hi": 50,
    "name": "Heightened Sense: Acute Sense"
   },
   {
    "lo": 51,
    "hi": 60,
    "name": "Luck"
   },
   {
    "lo": 61,
    "hi": 70,
    "name": "Willpower B) Pain Resistance"
   },
   {
    "lo": 71,
    "hi": 80,
    "name": "Rank"
   },
   {
    "lo": 81,
    "hi": 90,
    "name": "Speed"
   },
   {
    "lo": 91,
    "hi": 100,
    "name": "Wealth"
   }
  ],
  "weaknesses": [
   {
    "lo": 1,
    "hi": 10,
    "name": "Diminished Senses"
   },
   {
    "lo": 11,
    "hi": 20,
    "name": "Low Self-Control"
   },
   {
    "lo": 21,
    "hi": 30,
    "name": "Personal Problem"
   },
   {
    "lo": 31,
    "hi": 40,
    "name": "Phobia"
   },
   {
    "lo": 41,
    "hi": 50,
    "name": "Physical Handicap"
   },
   {
    "lo": 51,
    "hi": 60,
    "name": "Poverty"
   },
   {
    "lo": 61,
    "hi": 70,
    "name": "Prejudice"
   },
   {
    "lo": 71,
    "hi": 80,
    "name": "Psychosis"
   },
   {
    "lo": 81,
    "hi": 90,
    "name": "Uneducated"
   },
   {
    "lo": 91,
    "hi": 100,
    "name": "Unlucky"
   }
  ],
  "coreCount": 4,
  "coreCp": 5,
  "maxPerAbility": 20,
  "bonusFromWeaknesses": 20
 },
 "standardWeapons": {
  "melee": [
   {
    "name": "Axe",
    "hit": "-2",
    "damage": "+2d6 sharp",
    "range": "touch",
    "cp": 10,
    "twoHanded": false,
    "notes": ""
   },
   {
    "name": "Big Axe",
    "hit": "-1",
    "damage": "+2d8 sharp",
    "range": "touch",
    "cp": 15,
    "twoHanded": true,
    "notes": ""
   },
   {
    "name": "Blade",
    "hit": "+0",
    "damage": "+d8+1 sharp",
    "range": "touch",
    "cp": 10,
    "twoHanded": false,
    "notes": ""
   },
   {
    "name": "Chain",
    "hit": "+3",
    "damage": "+d2 blunt",
    "range": "3\"",
    "cp": 10,
    "twoHanded": true,
    "notes": ""
   },
   {
    "name": "Club or Staff",
    "hit": "+2",
    "damage": "+d3 blunt",
    "range": "touch",
    "cp": 10,
    "twoHanded": false,
    "notes": ""
   },
   {
    "name": "Javelin",
    "hit": "+1",
    "damage": "+d4 sharp",
    "range": "STx2\"",
    "cp": 5,
    "twoHanded": false,
    "notes": ""
   },
   {
    "name": "Long Blade",
    "hit": "+1",
    "damage": "+2d6 sharp",
    "range": "touch",
    "cp": 15,
    "twoHanded": true,
    "notes": ""
   },
   {
    "name": "Large Club",
    "hit": "+2",
    "damage": "+d6+1 blunt",
    "range": "touch",
    "cp": 15,
    "twoHanded": true,
    "notes": ""
   },
   {
    "name": "Nunchaku",
    "hit": "+1",
    "damage": "+d4 blunt",
    "range": "touch",
    "cp": 10,
    "twoHanded": false,
    "notes": ""
   },
   {
    "name": "Short Axe",
    "hit": "-2",
    "damage": "+1d8+1 sharp",
    "range": "touch",
    "cp": 5,
    "twoHanded": false,
    "notes": ""
   },
   {
    "name": "Short Blade",
    "hit": "+0",
    "damage": "+d6 sharp",
    "range": "touch",
    "cp": 5,
    "twoHanded": false,
    "notes": ""
   },
   {
    "name": "Small Club",
    "hit": "+2",
    "damage": "+d2-1 blunt",
    "range": "touch",
    "cp": 5,
    "twoHanded": false,
    "notes": ""
   },
   {
    "name": "Spear",
    "hit": "+2",
    "damage": "+d8+1 sharp",
    "range": "3\"",
    "cp": 15,
    "twoHanded": true,
    "notes": ""
   }
  ],
  "missile": [
   {
    "name": "Auto Rifle",
    "hit": "+0",
    "damage": "d6+1 sharp",
    "range": "AGx2",
    "cp": 15,
    "twoHanded": true,
    "notes": "24 charges, Autofire x3"
   },
   {
    "name": "Blast Pistol",
    "hit": "+0",
    "damage": "d10+1 energy",
    "range": "AGx2",
    "cp": 10,
    "twoHanded": false,
    "notes": "12 charges"
   },
   {
    "name": "Blast Rifle",
    "hit": "+0",
    "damage": "2d8 energy",
    "range": "AGx2",
    "cp": 15,
    "twoHanded": true,
    "notes": "12 charges"
   },
   {
    "name": "Boomerang",
    "hit": "+1",
    "damage": "+d4 blunt",
    "range": "STx1",
    "cp": 3,
    "twoHanded": false,
    "notes": "Range x2 w/o return"
   },
   {
    "name": "Bow",
    "hit": "+1",
    "damage": "+d3 sharp",
    "range": "AGx2",
    "cp": 8,
    "twoHanded": true,
    "notes": "12 charges"
   },
   {
    "name": "Heavy Bow",
    "hit": "+1",
    "damage": "+d6 sharp",
    "range": "AGx2",
    "cp": 13,
    "twoHanded": true,
    "notes": "12 charges"
   },
   {
    "name": "Pistol",
    "hit": "+0",
    "damage": "d10+1 sharp",
    "range": "AGx2",
    "cp": 5,
    "twoHanded": false,
    "notes": "12 charges"
   },
   {
    "name": "Rifle",
    "hit": "+1",
    "damage": "d6+d8 sharp",
    "range": "AGx2",
    "cp": 10,
    "twoHanded": true,
    "notes": "12 charges"
   },
   {
    "name": "Short Bow",
    "hit": "+1",
    "damage": "+d2-1 sharp",
    "range": "AGx2",
    "cp": 3,
    "twoHanded": true,
    "notes": "12 charges"
   },
   {
    "name": "Shotgun",
    "hit": "+0",
    "damage": "d8+d10 blunt",
    "range": "AGx1",
    "cp": 8,
    "twoHanded": false,
    "notes": "2 charges, 3\" Area"
   },
   {
    "name": "Shuriken",
    "hit": "+3",
    "damage": "+1 sharp",
    "range": "ST/2",
    "cp": 13,
    "twoHanded": false,
    "notes": "12 charges"
   }
  ]
 }
}; })();

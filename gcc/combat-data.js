// combat-data.js — AD&D 1e data harvested from AMMOG (Phase 1: equipment, class tables, bestiary)
// AUTO-GENERATED 2026-05-27 — do not hand-edit; regenerate from the AMMOG source.
// Loaded via <script src="combat-data.js"></script> BEFORE dungeon-encounter's main <script>. Exposes global CDATA.
// Weapon damage as 'NdD(+b)' dice strings; vs_ac keyed AC2..AC10; weights in lb (reconcile vs gp-weight at use).

const CDATA = {
  "_meta": {
    "source": "AMMOG (ammog_2)",
    "harvested": "2026-05-27",
    "phase": "Phase 1 — data tier"
  },
  "turnUndead": [
    [
      10,
      13,
      16,
      19,
      20,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    [
      7,
      10,
      13,
      16,
      19,
      20,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    [
      4,
      7,
      10,
      13,
      16,
      19,
      20,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    [
      "T",
      4,
      7,
      10,
      13,
      16,
      19,
      20,
      0,
      0,
      0,
      0,
      0
    ],
    [
      "T",
      "T",
      4,
      7,
      10,
      13,
      16,
      19,
      20,
      0,
      0,
      0,
      0
    ],
    [
      "D",
      "T",
      "T",
      4,
      7,
      10,
      13,
      16,
      19,
      20,
      0,
      0,
      0
    ],
    [
      "D",
      "D",
      "T",
      "T",
      4,
      7,
      10,
      13,
      16,
      19,
      20,
      0,
      0
    ],
    [
      "D",
      "D",
      "D",
      "T",
      "T",
      4,
      7,
      10,
      13,
      16,
      19,
      20,
      0
    ],
    [
      "D",
      "D",
      "D",
      "D",
      "T",
      "T",
      4,
      7,
      10,
      13,
      16,
      19,
      20
    ]
  ],
  "undeadTypes": [
    "Skeleton",
    "Zombie",
    "Ghoul",
    "Shadow",
    "Wight",
    "Ghast",
    "Wraith",
    "Mummy",
    "Spectre",
    "Vampire",
    "Ghost",
    "Lich",
    "Special"
  ],
  "saves": {
    "fighter": [
      [
        14,
        15,
        16,
        17,
        17
      ],
      [
        14,
        15,
        16,
        17,
        17
      ],
      [
        13,
        14,
        15,
        16,
        16
      ],
      [
        11,
        12,
        13,
        13,
        14
      ],
      [
        10,
        11,
        12,
        12,
        13
      ],
      [
        8,
        9,
        10,
        10,
        11
      ],
      [
        7,
        8,
        9,
        9,
        10
      ],
      [
        5,
        6,
        7,
        7,
        8
      ],
      [
        4,
        5,
        6,
        6,
        7
      ],
      [
        3,
        4,
        5,
        5,
        6
      ]
    ],
    "cleric": [
      [
        10,
        13,
        14,
        16,
        15
      ],
      [
        9,
        12,
        13,
        15,
        14
      ],
      [
        7,
        10,
        11,
        13,
        12
      ],
      [
        6,
        9,
        10,
        12,
        11
      ],
      [
        5,
        8,
        9,
        11,
        10
      ],
      [
        4,
        7,
        8,
        10,
        9
      ],
      [
        2,
        5,
        6,
        8,
        7
      ]
    ],
    "mu": [
      [
        14,
        13,
        11,
        15,
        12
      ],
      [
        13,
        11,
        9,
        13,
        10
      ],
      [
        11,
        9,
        7,
        11,
        8
      ],
      [
        10,
        7,
        5,
        9,
        6
      ],
      [
        8,
        5,
        3,
        7,
        4
      ]
    ],
    "thief": [
      [
        13,
        12,
        14,
        16,
        15
      ],
      [
        12,
        11,
        13,
        15,
        14
      ],
      [
        11,
        10,
        12,
        14,
        13
      ],
      [
        10,
        9,
        11,
        13,
        12
      ],
      [
        9,
        8,
        10,
        12,
        11
      ],
      [
        8,
        7,
        9,
        11,
        10
      ]
    ]
  },
  "saveNames": [
    "Para/Poison/Death",
    "Petrify/Polymorph",
    "Rod/Staff/Wand",
    "Breath Weapon",
    "Spell"
  ],
  "spellSlots": {
    "cleric": [
      [
        1,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        2,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        2,
        1,
        0,
        0,
        0,
        0,
        0
      ],
      [
        3,
        2,
        0,
        0,
        0,
        0,
        0
      ],
      [
        3,
        3,
        1,
        0,
        0,
        0,
        0
      ],
      [
        3,
        3,
        2,
        0,
        0,
        0,
        0
      ],
      [
        3,
        3,
        2,
        1,
        0,
        0,
        0
      ],
      [
        3,
        3,
        3,
        2,
        0,
        0,
        0
      ],
      [
        4,
        4,
        3,
        2,
        1,
        0,
        0
      ],
      [
        4,
        4,
        3,
        3,
        2,
        0,
        0
      ],
      [
        5,
        4,
        4,
        3,
        2,
        1,
        0
      ],
      [
        6,
        5,
        5,
        3,
        2,
        2,
        0
      ],
      [
        6,
        6,
        6,
        4,
        2,
        2,
        0
      ],
      [
        6,
        6,
        6,
        5,
        3,
        2,
        0
      ],
      [
        7,
        7,
        7,
        5,
        4,
        2,
        0
      ],
      [
        7,
        7,
        7,
        6,
        5,
        3,
        1
      ],
      [
        8,
        8,
        8,
        6,
        5,
        3,
        1
      ],
      [
        8,
        8,
        8,
        7,
        6,
        4,
        1
      ],
      [
        9,
        9,
        9,
        7,
        6,
        4,
        2
      ],
      [
        9,
        9,
        9,
        8,
        7,
        5,
        2
      ],
      [
        9,
        9,
        9,
        9,
        8,
        6,
        2
      ],
      [
        9,
        9,
        9,
        9,
        9,
        6,
        3
      ],
      [
        9,
        9,
        9,
        9,
        9,
        7,
        3
      ],
      [
        9,
        9,
        9,
        9,
        9,
        8,
        3
      ],
      [
        9,
        9,
        9,
        9,
        9,
        8,
        4
      ],
      [
        9,
        9,
        9,
        9,
        9,
        9,
        4
      ],
      [
        9,
        9,
        9,
        9,
        9,
        9,
        5
      ],
      [
        9,
        9,
        9,
        9,
        9,
        9,
        6
      ],
      [
        9,
        9,
        9,
        9,
        9,
        9,
        7
      ]
    ],
    "druid": [
      [
        2,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        2,
        1,
        0,
        0,
        0,
        0,
        0
      ],
      [
        3,
        2,
        1,
        0,
        0,
        0,
        0
      ],
      [
        4,
        2,
        2,
        0,
        0,
        0,
        0
      ],
      [
        4,
        3,
        2,
        0,
        0,
        0,
        0
      ],
      [
        4,
        3,
        2,
        1,
        0,
        0,
        0
      ],
      [
        4,
        4,
        3,
        1,
        0,
        0,
        0
      ],
      [
        4,
        4,
        3,
        2,
        0,
        0,
        0
      ],
      [
        5,
        4,
        3,
        2,
        1,
        0,
        0
      ],
      [
        5,
        4,
        3,
        3,
        2,
        0,
        0
      ],
      [
        5,
        5,
        3,
        3,
        2,
        1,
        0
      ],
      [
        5,
        5,
        4,
        4,
        3,
        2,
        1
      ],
      [
        6,
        5,
        5,
        5,
        4,
        3,
        2
      ],
      [
        6,
        6,
        6,
        6,
        5,
        4,
        3
      ]
    ],
    "mu": [
      [
        1,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        2,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        2,
        1,
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        3,
        2,
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        4,
        2,
        1,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        4,
        2,
        2,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        4,
        3,
        2,
        1,
        0,
        0,
        0,
        0,
        0
      ],
      [
        4,
        3,
        3,
        2,
        0,
        0,
        0,
        0,
        0
      ],
      [
        4,
        3,
        3,
        2,
        1,
        0,
        0,
        0,
        0
      ],
      [
        4,
        4,
        3,
        2,
        2,
        0,
        0,
        0,
        0
      ],
      [
        4,
        4,
        4,
        3,
        3,
        0,
        0,
        0,
        0
      ],
      [
        4,
        4,
        4,
        4,
        4,
        1,
        0,
        0,
        0
      ],
      [
        5,
        5,
        5,
        4,
        4,
        2,
        0,
        0,
        0
      ],
      [
        5,
        5,
        5,
        4,
        4,
        2,
        1,
        0,
        0
      ],
      [
        5,
        5,
        5,
        5,
        5,
        2,
        1,
        0,
        0
      ],
      [
        5,
        5,
        5,
        5,
        5,
        3,
        2,
        1,
        0
      ],
      [
        5,
        5,
        5,
        5,
        5,
        3,
        3,
        2,
        0
      ],
      [
        5,
        5,
        5,
        5,
        5,
        3,
        3,
        2,
        1
      ],
      [
        5,
        5,
        5,
        5,
        5,
        3,
        3,
        3,
        1
      ],
      [
        5,
        5,
        5,
        5,
        5,
        4,
        3,
        3,
        2
      ],
      [
        5,
        5,
        5,
        5,
        5,
        4,
        4,
        4,
        2
      ],
      [
        5,
        5,
        5,
        5,
        5,
        5,
        4,
        4,
        3
      ],
      [
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        3
      ],
      [
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        4
      ],
      [
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5
      ],
      [
        6,
        6,
        6,
        6,
        5,
        5,
        5,
        5,
        5
      ],
      [
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        5,
        5
      ],
      [
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        6
      ],
      [
        7,
        7,
        7,
        7,
        7,
        6,
        6,
        6,
        6
      ]
    ],
    "illusionist": [
      [
        1,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        2,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        2,
        1,
        0,
        0,
        0,
        0,
        0
      ],
      [
        3,
        2,
        0,
        0,
        0,
        0,
        0
      ],
      [
        4,
        2,
        1,
        0,
        0,
        0,
        0
      ],
      [
        4,
        3,
        1,
        0,
        0,
        0,
        0
      ],
      [
        4,
        3,
        2,
        0,
        0,
        0,
        0
      ],
      [
        4,
        3,
        2,
        1,
        0,
        0,
        0
      ],
      [
        5,
        3,
        3,
        2,
        1,
        0,
        0
      ],
      [
        5,
        4,
        3,
        2,
        1,
        0,
        0
      ],
      [
        5,
        4,
        3,
        3,
        2,
        0,
        0
      ],
      [
        5,
        5,
        4,
        3,
        2,
        1,
        0
      ],
      [
        5,
        5,
        4,
        3,
        2,
        2,
        0
      ],
      [
        5,
        5,
        4,
        3,
        2,
        2,
        1
      ],
      [
        5,
        5,
        5,
        4,
        3,
        2,
        2
      ],
      [
        5,
        5,
        5,
        5,
        4,
        3,
        2
      ],
      [
        5,
        5,
        5,
        5,
        5,
        3,
        2
      ],
      [
        5,
        5,
        5,
        5,
        5,
        3,
        3
      ],
      [
        5,
        5,
        5,
        5,
        5,
        4,
        3
      ],
      [
        5,
        5,
        5,
        5,
        5,
        4,
        3
      ],
      [
        5,
        5,
        5,
        5,
        5,
        4,
        3
      ],
      [
        5,
        5,
        5,
        5,
        5,
        5,
        4
      ],
      [
        5,
        5,
        5,
        5,
        5,
        5,
        5
      ],
      [
        6,
        6,
        6,
        6,
        6,
        5,
        5
      ],
      [
        6,
        6,
        6,
        6,
        6,
        6,
        6
      ],
      [
        7,
        7,
        7,
        7,
        7,
        6,
        6
      ]
    ]
  },
  "xp": {
    "fighter": [
      0,
      2001,
      4001,
      8001,
      18001,
      35001,
      70001,
      125001,
      250001,
      500001,
      750001
    ],
    "paladin": [
      0,
      2751,
      5501,
      12001,
      24001,
      45001,
      95001,
      175001,
      350001,
      700001,
      1050001
    ],
    "ranger": [
      0,
      2251,
      4501,
      10001,
      20001,
      40001,
      90001,
      150001,
      225001,
      325001,
      650001,
      975001
    ],
    "cleric": [
      0,
      1501,
      3001,
      6001,
      13001,
      27501,
      55001,
      110001,
      225001,
      450001,
      675001
    ],
    "druid": [
      0,
      2001,
      4001,
      7501,
      12501,
      20001,
      35001,
      60001,
      90001,
      125001,
      200001,
      300001,
      750001,
      1500001
    ],
    "magic_user": [
      0,
      2501,
      5001,
      10001,
      22501,
      40001,
      60001,
      90001,
      135001,
      250001,
      375001,
      750001,
      1125001,
      1500001,
      1875001,
      2250001,
      2625001,
      3000001
    ],
    "illusionist": [
      0,
      2251,
      4501,
      9001,
      18001,
      35001,
      60001,
      95001,
      145001,
      220001,
      440001,
      660001
    ],
    "thief": [
      0,
      1251,
      2501,
      5001,
      10001,
      20001,
      42501,
      70001,
      110001,
      160001,
      220001,
      440001
    ],
    "assassin": [
      0,
      1501,
      3001,
      6001,
      12001,
      25001,
      50001,
      100001,
      200001,
      300001,
      425001,
      575001,
      750001,
      1000001,
      1500001
    ],
    "monk": [
      0,
      2251,
      4751,
      10001,
      22501,
      47501,
      98001,
      200001,
      350001,
      500001,
      700001,
      950001,
      1250001,
      1750001,
      2250001,
      2750001,
      3250001
    ],
    "bard": [
      0,
      2001,
      4001,
      8001,
      16001,
      25001,
      40001,
      60001,
      85001,
      110001,
      150001,
      200001,
      400001,
      600001,
      800001,
      1000001,
      1200001,
      1400001,
      1600001,
      2000001,
      2200001,
      3000001
    ]
  },
  "weapons": {
    "dagger": {
      "id": "dagger",
      "name": "Dagger",
      "melee": true,
      "speed": 2,
      "length": 1.25,
      "weight": 1,
      "cost": 2,
      "space": 1,
      "damage": {
        "sm": "1d4",
        "l": "1d3"
      },
      "vs_ac": {
        "2": -3,
        "3": -3,
        "4": -2,
        "5": -2,
        "6": 0,
        "7": 0,
        "8": 1,
        "9": 1,
        "10": 3
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin",
        "cleric",
        "thief",
        "assassin",
        "magic-user",
        "illusionist",
        "druid",
        "monk"
      ],
      "verb": "stabs",
      "two_handed": false,
      "settable": null,
      "dismount": false
    },
    "hand_axe": {
      "id": "hand_axe",
      "name": "Hand Axe",
      "melee": true,
      "speed": 4,
      "length": 1.5,
      "weight": 5,
      "cost": 1,
      "space": 1,
      "damage": {
        "sm": "1d6",
        "l": "1d4"
      },
      "vs_ac": {
        "2": -3,
        "3": -2,
        "4": -2,
        "5": -1,
        "6": 0,
        "7": 0,
        "8": 1,
        "9": 1,
        "10": 1
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin",
        "assassin"
      ],
      "verb": "chops",
      "two_handed": false,
      "settable": null,
      "dismount": false
    },
    "club": {
      "id": "club",
      "name": "Club",
      "melee": true,
      "speed": 4,
      "length": 3,
      "weight": 3,
      "cost": 0,
      "space": 2,
      "damage": {
        "sm": "1d6",
        "l": "1d3"
      },
      "vs_ac": {
        "2": -5,
        "3": -4,
        "4": -3,
        "5": -2,
        "6": -1,
        "7": -1,
        "8": 0,
        "9": 0,
        "10": 1
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin",
        "cleric",
        "thief",
        "assassin",
        "druid"
      ],
      "verb": "clubs",
      "two_handed": false,
      "settable": null,
      "dismount": false
    },
    "hammer": {
      "id": "hammer",
      "name": "Hammer",
      "melee": true,
      "speed": 4,
      "length": 1.5,
      "weight": 5,
      "cost": 1,
      "space": 2,
      "damage": {
        "sm": "1d4+1",
        "l": "1d4"
      },
      "vs_ac": {
        "2": 0,
        "3": 1,
        "4": 0,
        "5": 1,
        "6": 0,
        "7": 0,
        "8": 0,
        "9": 0,
        "10": 0
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin",
        "cleric"
      ],
      "verb": "smashes",
      "two_handed": false,
      "settable": null,
      "dismount": false
    },
    "mace": {
      "id": "mace",
      "name": "Mace",
      "melee": true,
      "speed": 7,
      "length": 2.5,
      "weight": 10,
      "cost": 8,
      "space": 4,
      "damage": {
        "sm": "1d6+1",
        "l": "1d6"
      },
      "vs_ac": {
        "2": 1,
        "3": 1,
        "4": 0,
        "5": 0,
        "6": 0,
        "7": 0,
        "8": 0,
        "9": 1,
        "10": -1
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin",
        "cleric"
      ],
      "verb": "smashes",
      "two_handed": false,
      "settable": null,
      "dismount": false
    },
    "horsemans_mace": {
      "id": "horsemans_mace",
      "name": "Horseman's Mace",
      "melee": true,
      "speed": 6,
      "length": 1.5,
      "weight": 5,
      "cost": 4,
      "space": 2,
      "damage": {
        "sm": "1d6",
        "l": "1d4"
      },
      "vs_ac": {
        "2": 1,
        "3": 1,
        "4": 0,
        "5": 0,
        "6": 0,
        "7": 0,
        "8": 0,
        "9": 0,
        "10": 0
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin",
        "cleric"
      ],
      "verb": "smashes",
      "two_handed": false,
      "settable": null,
      "dismount": false
    },
    "horsemans_flail": {
      "id": "horsemans_flail",
      "name": "Horseman's Flail",
      "melee": true,
      "speed": 6,
      "length": 2,
      "weight": 3,
      "cost": 8,
      "space": 4,
      "damage": {
        "sm": "1d4+1",
        "l": "1d4+1"
      },
      "vs_ac": {
        "2": 0,
        "3": 0,
        "4": 0,
        "5": 0,
        "6": 0,
        "7": 1,
        "8": 1,
        "9": 1,
        "10": 0
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin",
        "cleric"
      ],
      "verb": "flails at",
      "two_handed": false,
      "settable": null,
      "dismount": false
    },
    "horsemans_pick": {
      "id": "horsemans_pick",
      "name": "Horseman's Pick",
      "melee": true,
      "speed": 5,
      "length": 2,
      "weight": 4,
      "cost": 7,
      "space": 2,
      "damage": {
        "sm": "1d4+1",
        "l": "1d4"
      },
      "vs_ac": {
        "2": 1,
        "3": 1,
        "4": 1,
        "5": 1,
        "6": 0,
        "7": 0,
        "8": -1,
        "9": -1,
        "10": -1
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin"
      ],
      "verb": "picks at",
      "two_handed": false,
      "settable": null,
      "dismount": false
    },
    "morning_star": {
      "id": "morning_star",
      "name": "Morning Star",
      "melee": true,
      "speed": 7,
      "length": 4,
      "weight": 12,
      "cost": 10,
      "space": 5,
      "damage": {
        "sm": "2d4",
        "l": "1d6+1"
      },
      "vs_ac": {
        "2": 0,
        "3": 1,
        "4": 1,
        "5": 1,
        "6": 1,
        "7": 1,
        "8": 1,
        "9": 2,
        "10": 2
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin",
        "cleric"
      ],
      "verb": "bashes",
      "two_handed": false,
      "settable": null,
      "dismount": false
    },
    "short_sword": {
      "id": "short_sword",
      "name": "Short Sword",
      "melee": true,
      "speed": 3,
      "length": 2,
      "weight": 5,
      "cost": 8,
      "space": 1,
      "damage": {
        "sm": "1d6",
        "l": "1d8"
      },
      "vs_ac": {
        "2": -3,
        "3": -2,
        "4": -1,
        "5": 0,
        "6": 0,
        "7": 0,
        "8": 1,
        "9": 0,
        "10": 2
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin",
        "thief",
        "assassin"
      ],
      "verb": "slashes",
      "two_handed": false,
      "settable": null,
      "dismount": false
    },
    "broad_sword": {
      "id": "broad_sword",
      "name": "Broad Sword",
      "melee": true,
      "speed": 5,
      "length": 3.5,
      "weight": 7,
      "cost": 10,
      "space": 4,
      "damage": {
        "sm": "2d4",
        "l": "1d6+1"
      },
      "vs_ac": {
        "2": -3,
        "3": -2,
        "4": -1,
        "5": 0,
        "6": 0,
        "7": 1,
        "8": 1,
        "9": 1,
        "10": 2
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin"
      ],
      "verb": "cleaves",
      "two_handed": false,
      "settable": null,
      "dismount": false
    },
    "long_sword": {
      "id": "long_sword",
      "name": "Long Sword",
      "melee": true,
      "speed": 5,
      "length": 3.5,
      "weight": 6,
      "cost": 15,
      "space": 3,
      "damage": {
        "sm": "1d8",
        "l": "1d12"
      },
      "vs_ac": {
        "2": -2,
        "3": -1,
        "4": 0,
        "5": 0,
        "6": 0,
        "7": 0,
        "8": 0,
        "9": 1,
        "10": 2
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin",
        "thief",
        "assassin"
      ],
      "verb": "slashes",
      "two_handed": false,
      "settable": null,
      "dismount": false
    },
    "scimitar": {
      "id": "scimitar",
      "name": "Scimitar",
      "melee": true,
      "speed": 4,
      "length": 3,
      "weight": 4,
      "cost": 15,
      "space": 2,
      "damage": {
        "sm": "1d8",
        "l": "1d8"
      },
      "vs_ac": {
        "2": -3,
        "3": -2,
        "4": -2,
        "5": 1,
        "6": 0,
        "7": 0,
        "8": 1,
        "9": 1,
        "10": 3
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin",
        "druid",
        "thief"
      ],
      "verb": "slashes",
      "two_handed": false,
      "settable": null,
      "dismount": false
    },
    "battle_axe": {
      "id": "battle_axe",
      "name": "Battle Axe",
      "melee": true,
      "speed": 7,
      "length": 4,
      "weight": 7,
      "cost": 5,
      "space": 4,
      "damage": {
        "sm": "1d8",
        "l": "1d8"
      },
      "vs_ac": {
        "2": -3,
        "3": -2,
        "4": -1,
        "5": -1,
        "6": 0,
        "7": 0,
        "8": 1,
        "9": 1,
        "10": 2
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin"
      ],
      "verb": "cleaves",
      "two_handed": false,
      "settable": null,
      "dismount": false
    },
    "bastard_sword": {
      "id": "bastard_sword",
      "name": "Bastard Sword",
      "melee": true,
      "speed": 6,
      "length": 4.5,
      "weight": 10,
      "cost": 25,
      "space": 4,
      "damage": {
        "sm": "2d4",
        "l": "2d8"
      },
      "vs_ac": {
        "2": 0,
        "3": 0,
        "4": 1,
        "5": 1,
        "6": 1,
        "7": 1,
        "8": 1,
        "9": 1,
        "10": 0
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin"
      ],
      "verb": "cleaves",
      "two_handed": true,
      "settable": null,
      "dismount": false
    },
    "two_h_sword": {
      "id": "two_h_sword",
      "name": "Two-Handed Sword",
      "melee": true,
      "speed": 10,
      "length": 6,
      "weight": 25,
      "cost": 30,
      "space": 6,
      "damage": {
        "sm": "1d10",
        "l": "3d6"
      },
      "vs_ac": {
        "2": 2,
        "3": 2,
        "4": 2,
        "5": 2,
        "6": 3,
        "7": 3,
        "8": 3,
        "9": 1,
        "10": 0
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin"
      ],
      "verb": "cleaves",
      "two_handed": true,
      "settable": null,
      "dismount": false
    },
    "flail": {
      "id": "flail",
      "name": "Flail",
      "melee": true,
      "speed": 7,
      "length": 4,
      "weight": 15,
      "cost": 8,
      "space": 6,
      "damage": {
        "sm": "1d6+1",
        "l": "2d4"
      },
      "vs_ac": {
        "2": 2,
        "3": 2,
        "4": 1,
        "5": 2,
        "6": 1,
        "7": 1,
        "8": 1,
        "9": 1,
        "10": -1
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin",
        "cleric"
      ],
      "verb": "flails at",
      "two_handed": true,
      "settable": null,
      "dismount": false
    },
    "military_pick": {
      "id": "military_pick",
      "name": "Military Pick",
      "melee": true,
      "speed": 7,
      "length": 4,
      "weight": 6,
      "cost": 8,
      "space": 4,
      "damage": {
        "sm": "1d6+1",
        "l": "2d4"
      },
      "vs_ac": {
        "2": 2,
        "3": 2,
        "4": 1,
        "5": 1,
        "6": 0,
        "7": -1,
        "8": -1,
        "9": -1,
        "10": -2
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin"
      ],
      "verb": "picks at",
      "two_handed": false,
      "settable": null,
      "dismount": false
    },
    "quarterstaff": {
      "id": "quarterstaff",
      "name": "Quarterstaff",
      "melee": true,
      "speed": 4,
      "length": 7,
      "weight": 4,
      "cost": 1,
      "space": 3,
      "damage": {
        "sm": "1d6",
        "l": "1d6"
      },
      "vs_ac": {
        "2": -7,
        "3": -5,
        "4": -3,
        "5": -1,
        "6": 0,
        "7": 0,
        "8": 1,
        "9": 1,
        "10": 0
      },
      "classes": [
        "fighter",
        "cleric",
        "magic-user",
        "illusionist",
        "druid",
        "monk"
      ],
      "verb": "strikes",
      "two_handed": true,
      "settable": null,
      "dismount": false
    },
    "bo_stick": {
      "id": "bo_stick",
      "name": "Bo Stick",
      "melee": true,
      "speed": 3,
      "length": 5,
      "weight": 1,
      "cost": 1,
      "space": 3,
      "damage": {
        "sm": "1d6",
        "l": "1d3"
      },
      "vs_ac": {
        "2": -9,
        "3": -7,
        "4": -5,
        "5": -3,
        "6": -1,
        "7": 0,
        "8": 1,
        "9": 0,
        "10": 3
      },
      "classes": [
        "fighter",
        "monk"
      ],
      "verb": "strikes",
      "two_handed": true,
      "settable": null,
      "dismount": false
    },
    "jo_stick": {
      "id": "jo_stick",
      "name": "Jo Stick",
      "melee": true,
      "speed": 2,
      "length": 3,
      "weight": 4,
      "cost": 1,
      "space": 2,
      "damage": {
        "sm": "1d6",
        "l": "1d4"
      },
      "vs_ac": {
        "2": -8,
        "3": -6,
        "4": -4,
        "5": -2,
        "6": -1,
        "7": 0,
        "8": 1,
        "9": 0,
        "10": 2
      },
      "classes": [
        "fighter",
        "monk"
      ],
      "verb": "strikes",
      "two_handed": false,
      "settable": null,
      "dismount": false
    },
    "spear": {
      "id": "spear",
      "name": "Spear",
      "melee": true,
      "speed": 7,
      "length": 9,
      "weight": 5,
      "cost": 1,
      "space": 1,
      "damage": {
        "sm": "1d6",
        "l": "1d8"
      },
      "vs_ac": {
        "2": -2,
        "3": -1,
        "4": -1,
        "5": -1,
        "6": 0,
        "7": 0,
        "8": 0,
        "9": 0,
        "10": 0
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin",
        "assassin"
      ],
      "verb": "thrusts",
      "two_handed": false,
      "settable": "all",
      "dismount": false
    },
    "bardiche": {
      "id": "bardiche",
      "name": "Bardiche",
      "melee": true,
      "speed": 9,
      "length": 5,
      "weight": 12,
      "cost": 7,
      "space": 5,
      "damage": {
        "sm": "2d4",
        "l": "3d4"
      },
      "vs_ac": {
        "2": -2,
        "3": -1,
        "4": 0,
        "5": 0,
        "6": 1,
        "7": 1,
        "8": 2,
        "9": 2,
        "10": 3
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin"
      ],
      "verb": "cleaves",
      "two_handed": true,
      "settable": "L",
      "dismount": true
    },
    "bec_de_corbin": {
      "id": "bec_de_corbin",
      "name": "Bec de Corbin",
      "melee": true,
      "speed": 9,
      "length": 6,
      "weight": 10,
      "cost": 6,
      "space": 6,
      "damage": {
        "sm": "1d8",
        "l": "1d6"
      },
      "vs_ac": {
        "2": 2,
        "3": 2,
        "4": 2,
        "5": 0,
        "6": 0,
        "7": 0,
        "8": 0,
        "9": 0,
        "10": -1
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin"
      ],
      "verb": "hooks at",
      "two_handed": true,
      "settable": "L",
      "dismount": true
    },
    "bill_guisarme": {
      "id": "bill_guisarme",
      "name": "Bill-Guisarme",
      "melee": true,
      "speed": 10,
      "length": 8,
      "weight": 15,
      "cost": 7,
      "space": 2,
      "damage": {
        "sm": "2d4",
        "l": "1d10"
      },
      "vs_ac": {
        "2": 0,
        "3": 0,
        "4": 0,
        "5": 0,
        "6": 0,
        "7": 0,
        "8": 1,
        "9": 0,
        "10": 0
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin"
      ],
      "verb": "hooks at",
      "two_handed": true,
      "settable": "L",
      "dismount": true
    },
    "fauchard": {
      "id": "fauchard",
      "name": "Fauchard",
      "melee": true,
      "speed": 8,
      "length": 8,
      "weight": 6,
      "cost": 3,
      "space": 2,
      "damage": {
        "sm": "1d6",
        "l": "1d8"
      },
      "vs_ac": {
        "2": -2,
        "3": -2,
        "4": -1,
        "5": -1,
        "6": 0,
        "7": 0,
        "8": 0,
        "9": -1,
        "10": -1
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin"
      ],
      "verb": "slashes",
      "two_handed": true,
      "settable": "L",
      "dismount": false
    },
    "fauchard_fork": {
      "id": "fauchard_fork",
      "name": "Fauchard-Fork",
      "melee": true,
      "speed": 8,
      "length": 8,
      "weight": 8,
      "cost": 8,
      "space": 2,
      "damage": {
        "sm": "1d8",
        "l": "1d10"
      },
      "vs_ac": {
        "2": -1,
        "3": -1,
        "4": -1,
        "5": 0,
        "6": 0,
        "7": 0,
        "8": 1,
        "9": 0,
        "10": 1
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin"
      ],
      "verb": "impales",
      "two_handed": true,
      "settable": "L",
      "dismount": true
    },
    "military_fork": {
      "id": "military_fork",
      "name": "Military Fork",
      "melee": true,
      "speed": 7,
      "length": 7,
      "weight": 7,
      "cost": 4,
      "space": 1,
      "damage": {
        "sm": "1d8",
        "l": "2d4"
      },
      "vs_ac": {
        "2": -2,
        "3": -2,
        "4": 1,
        "5": 0,
        "6": 0,
        "7": 1,
        "8": 1,
        "9": 0,
        "10": 1
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin"
      ],
      "verb": "impales",
      "two_handed": true,
      "settable": "L",
      "dismount": true
    },
    "glaive": {
      "id": "glaive",
      "name": "Glaive",
      "melee": true,
      "speed": 8,
      "length": 8,
      "weight": 7,
      "cost": 6,
      "space": 1,
      "damage": {
        "sm": "1d6",
        "l": "1d10"
      },
      "vs_ac": {
        "2": -1,
        "3": -1,
        "4": 0,
        "5": 0,
        "6": 0,
        "7": 0,
        "8": 0,
        "9": 0,
        "10": 0
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin"
      ],
      "verb": "slashes",
      "two_handed": true,
      "settable": "L",
      "dismount": false
    },
    "glaive_guisarme": {
      "id": "glaive_guisarme",
      "name": "Glaive-Guisarme",
      "melee": true,
      "speed": 9,
      "length": 8,
      "weight": 10,
      "cost": 10,
      "space": 1,
      "damage": {
        "sm": "2d4",
        "l": "2d6"
      },
      "vs_ac": {
        "2": -1,
        "3": -1,
        "4": 0,
        "5": 0,
        "6": 0,
        "7": 0,
        "8": 0,
        "9": 0,
        "10": 0
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin"
      ],
      "verb": "slashes",
      "two_handed": true,
      "settable": "L",
      "dismount": true
    },
    "guisarme": {
      "id": "guisarme",
      "name": "Guisarme",
      "melee": true,
      "speed": 8,
      "length": 6,
      "weight": 8,
      "cost": 5,
      "space": 2,
      "damage": {
        "sm": "2d4",
        "l": "1d8"
      },
      "vs_ac": {
        "2": -2,
        "3": -2,
        "4": -1,
        "5": -1,
        "6": 0,
        "7": 0,
        "8": 0,
        "9": -1,
        "10": -1
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin"
      ],
      "verb": "hooks at",
      "two_handed": true,
      "settable": "L",
      "dismount": true
    },
    "guisarme_voulge": {
      "id": "guisarme_voulge",
      "name": "Guisarme-Voulge",
      "melee": true,
      "speed": 10,
      "length": 7,
      "weight": 15,
      "cost": 8,
      "space": 2,
      "damage": {
        "sm": "2d4",
        "l": "2d4"
      },
      "vs_ac": {
        "2": -1,
        "3": -1,
        "4": 0,
        "5": 1,
        "6": 1,
        "7": 1,
        "8": 0,
        "9": 0,
        "10": 0
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin"
      ],
      "verb": "slashes",
      "two_handed": true,
      "settable": "L",
      "dismount": true
    },
    "halberd": {
      "id": "halberd",
      "name": "Halberd",
      "melee": true,
      "speed": 9,
      "length": 5,
      "weight": 17,
      "cost": 9,
      "space": 5,
      "damage": {
        "sm": "1d10",
        "l": "2d6"
      },
      "vs_ac": {
        "2": 1,
        "3": 1,
        "4": 1,
        "5": 2,
        "6": 2,
        "7": 2,
        "8": 1,
        "9": 1,
        "10": 0
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin"
      ],
      "verb": "cleaves",
      "two_handed": true,
      "settable": "L",
      "dismount": true
    },
    "lucern_hammer": {
      "id": "lucern_hammer",
      "name": "Lucern Hammer",
      "melee": true,
      "speed": 9,
      "length": 5,
      "weight": 15,
      "cost": 7,
      "space": 5,
      "damage": {
        "sm": "2d4",
        "l": "1d6"
      },
      "vs_ac": {
        "2": 1,
        "3": 1,
        "4": 2,
        "5": 2,
        "6": 2,
        "7": 1,
        "8": 1,
        "9": 0,
        "10": 0
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin"
      ],
      "verb": "smashes",
      "two_handed": true,
      "settable": "L",
      "dismount": true
    },
    "partisan": {
      "id": "partisan",
      "name": "Partisan",
      "melee": true,
      "speed": 9,
      "length": 7,
      "weight": 8,
      "cost": 10,
      "space": 3,
      "damage": {
        "sm": "1d6",
        "l": "1d6+1"
      },
      "vs_ac": {
        "2": 0,
        "3": 0,
        "4": 0,
        "5": 0,
        "6": 0,
        "7": 0,
        "8": 0,
        "9": 0,
        "10": 0
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin"
      ],
      "verb": "thrusts",
      "two_handed": true,
      "settable": "L",
      "dismount": true
    },
    "pike": {
      "id": "pike",
      "name": "Pike",
      "melee": true,
      "speed": 13,
      "length": 18,
      "weight": 8,
      "cost": 3,
      "space": 1,
      "damage": {
        "sm": "1d6",
        "l": "1d12"
      },
      "vs_ac": {
        "2": -1,
        "3": 0,
        "4": 0,
        "5": 0,
        "6": 0,
        "7": 0,
        "8": 0,
        "9": -1,
        "10": -2
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin"
      ],
      "verb": "impales",
      "two_handed": true,
      "settable": "L",
      "dismount": false
    },
    "ranseur": {
      "id": "ranseur",
      "name": "Ranseur",
      "melee": true,
      "speed": 8,
      "length": 8,
      "weight": 5,
      "cost": 4,
      "space": 1,
      "damage": {
        "sm": "2d4",
        "l": "2d4"
      },
      "vs_ac": {
        "2": -2,
        "3": -1,
        "4": -1,
        "5": 0,
        "6": 0,
        "7": 0,
        "8": 0,
        "9": 0,
        "10": 1
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin"
      ],
      "verb": "impales",
      "two_handed": true,
      "settable": "L",
      "dismount": true
    },
    "spetum": {
      "id": "spetum",
      "name": "Spetum",
      "melee": true,
      "speed": 8,
      "length": 8,
      "weight": 5,
      "cost": 3,
      "space": 1,
      "damage": {
        "sm": "1d6+1",
        "l": "2d6"
      },
      "vs_ac": {
        "2": -2,
        "3": -1,
        "4": 0,
        "5": 0,
        "6": 0,
        "7": 0,
        "8": 0,
        "9": 1,
        "10": 2
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin"
      ],
      "verb": "impales",
      "two_handed": true,
      "settable": "L",
      "dismount": true
    },
    "trident": {
      "id": "trident",
      "name": "Trident",
      "melee": true,
      "speed": 7,
      "length": 7,
      "weight": 5,
      "cost": 4,
      "space": 1,
      "damage": {
        "sm": "1d6+1",
        "l": "3d4"
      },
      "vs_ac": {
        "2": -3,
        "3": -2,
        "4": -1,
        "5": -1,
        "6": 0,
        "7": 0,
        "8": 1,
        "9": 0,
        "10": 1
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin"
      ],
      "verb": "impales",
      "two_handed": false,
      "settable": "L",
      "dismount": true
    },
    "voulge": {
      "id": "voulge",
      "name": "Voulge",
      "melee": true,
      "speed": 10,
      "length": 8,
      "weight": 12,
      "cost": 2,
      "space": 2,
      "damage": {
        "sm": "2d4",
        "l": "2d4"
      },
      "vs_ac": {
        "2": -1,
        "3": -1,
        "4": 0,
        "5": 1,
        "6": 1,
        "7": 1,
        "8": 0,
        "9": 0,
        "10": 0
      },
      "classes": [
        "fighter",
        "ranger",
        "paladin"
      ],
      "verb": "slashes",
      "two_handed": true,
      "settable": "L",
      "dismount": true
    },
    "short_bow": {
      "id": "short_bow",
      "name": "Short Bow",
      "ranged": true,
      "speed": 7,
      "weight": 5,
      "cost": 15,
      "damage": {
        "sm": "1d6",
        "l": "1d6"
      },
      "range_squares": {
        "s": 5,
        "m": 10,
        "l": 15
      },
      "rof": 2,
      "classes": [
        "fighter",
        "ranger",
        "paladin",
        "thief",
        "assassin"
      ],
      "verb": "shoots",
      "two_handed": true
    },
    "long_bow": {
      "id": "long_bow",
      "name": "Long Bow",
      "ranged": true,
      "speed": 8,
      "weight": 5,
      "cost": 60,
      "damage": {
        "sm": "1d6",
        "l": "1d6"
      },
      "range_squares": {
        "s": 7,
        "m": 14,
        "l": 21
      },
      "rof": 2,
      "classes": [
        "fighter",
        "ranger",
        "paladin"
      ],
      "verb": "shoots",
      "two_handed": true
    },
    "light_crossbow": {
      "id": "light_crossbow",
      "name": "Light Crossbow",
      "ranged": true,
      "speed": 7,
      "weight": 5,
      "cost": 12,
      "damage": {
        "sm": "1d4",
        "l": "1d4"
      },
      "range_squares": {
        "s": 6,
        "m": 12,
        "l": 18
      },
      "rof": 1,
      "classes": [
        "fighter",
        "ranger",
        "paladin",
        "thief",
        "assassin"
      ],
      "verb": "shoots",
      "two_handed": true
    },
    "heavy_crossbow": {
      "id": "heavy_crossbow",
      "name": "Heavy Crossbow",
      "ranged": true,
      "speed": 10,
      "weight": 8,
      "cost": 20,
      "damage": {
        "sm": "1d4+1",
        "l": "1d6+1"
      },
      "range_squares": {
        "s": 8,
        "m": 16,
        "l": 24
      },
      "rof": 1,
      "classes": [
        "fighter",
        "ranger",
        "paladin"
      ],
      "verb": "shoots",
      "two_handed": true
    },
    "sling": {
      "id": "sling",
      "name": "Sling",
      "ranged": true,
      "speed": 7,
      "weight": 0,
      "cost": 1,
      "damage": {
        "sm": "1d4+1",
        "l": "1d6+1"
      },
      "range_squares": {
        "s": 4,
        "m": 8,
        "l": 16
      },
      "rof": 1,
      "classes": [
        "fighter",
        "ranger",
        "paladin",
        "thief",
        "assassin",
        "druid",
        "monk"
      ],
      "verb": "slings at",
      "two_handed": false
    }
  },
  "armor": {
    "leather": {
      "id": "leather",
      "name": "Leather Armor",
      "ac": 8,
      "weight": 15,
      "cost": 5,
      "classes": [
        "fighter",
        "ranger",
        "paladin",
        "cleric",
        "druid",
        "thief",
        "assassin",
        "monk",
        "bard"
      ]
    },
    "studded": {
      "id": "studded",
      "name": "Studded Leather",
      "ac": 7,
      "weight": 20,
      "cost": 15,
      "classes": [
        "fighter",
        "ranger",
        "paladin",
        "cleric",
        "thief",
        "assassin"
      ]
    },
    "ring_mail": {
      "id": "ring_mail",
      "name": "Ring Mail",
      "ac": 7,
      "weight": 25,
      "cost": 30,
      "classes": [
        "fighter",
        "ranger",
        "paladin",
        "cleric"
      ]
    },
    "scale_mail": {
      "id": "scale_mail",
      "name": "Scale Mail",
      "ac": 6,
      "weight": 40,
      "cost": 45,
      "classes": [
        "fighter",
        "ranger",
        "paladin",
        "cleric"
      ]
    },
    "chain_mail": {
      "id": "chain_mail",
      "name": "Chain Mail",
      "ac": 5,
      "weight": 30,
      "cost": 75,
      "classes": [
        "fighter",
        "ranger",
        "paladin",
        "cleric"
      ]
    },
    "banded_mail": {
      "id": "banded_mail",
      "name": "Banded Mail",
      "ac": 4,
      "weight": 35,
      "cost": 200,
      "classes": [
        "fighter",
        "ranger",
        "paladin",
        "cleric"
      ]
    },
    "plate_mail": {
      "id": "plate_mail",
      "name": "Plate Mail",
      "ac": 3,
      "weight": 45,
      "cost": 400,
      "classes": [
        "fighter",
        "ranger",
        "paladin"
      ]
    }
  },
  "shields": {
    "small_shield": {
      "id": "small_shield",
      "name": "Small Shield",
      "ac_bonus": 1,
      "weight": 5,
      "cost": 10,
      "classes": [
        "fighter",
        "ranger",
        "paladin",
        "cleric"
      ]
    },
    "large_shield": {
      "id": "large_shield",
      "name": "Large Shield",
      "ac_bonus": 1,
      "weight": 8,
      "cost": 15,
      "classes": [
        "fighter",
        "ranger",
        "paladin",
        "cleric"
      ]
    }
  },
  "supplies": {
    "torch": {
      "name": "Torch (5)",
      "cost": 1,
      "weight": 1,
      "qty": 5,
      "light": {
        "radius": 16,
        "turns": 6,
        "type": "torch"
      }
    },
    "lantern": {
      "name": "Lantern",
      "cost": 10,
      "weight": 2,
      "light": {
        "radius": 12,
        "turns": 24,
        "type": "lantern"
      }
    },
    "oil_flask": {
      "name": "Oil Flask",
      "cost": 1,
      "weight": 1
    },
    "tinderbox": {
      "name": "Tinderbox",
      "cost": 1,
      "weight": 0
    },
    "rations": {
      "name": "Iron Rations (7d)",
      "cost": 5,
      "weight": 7,
      "consumable": "rations",
      "charges": 7
    },
    "std_rations": {
      "name": "Standard Rations (7d)",
      "cost": 3,
      "weight": 10,
      "consumable": "rations",
      "charges": 7
    },
    "rope": {
      "name": "Rope (50')",
      "cost": 1,
      "weight": 7
    },
    "backpack": {
      "name": "Backpack",
      "cost": 2,
      "weight": 2
    },
    "waterskin": {
      "name": "Waterskin",
      "cost": 1,
      "weight": 5,
      "consumable": "water",
      "charges": 2
    },
    "healing_potion": {
      "name": "Potion of Healing",
      "cost": 200,
      "weight": 1,
      "heal": [
        2,
        8,
        1
      ]
    },
    "antidote": {
      "name": "Antidote",
      "cost": 100,
      "weight": 1
    }
  },
  "ammo": {
    "arrow": {
      "name": "Arrows (20)",
      "cost": 2,
      "weight": 3,
      "qty": 20,
      "ammoType": "arrow"
    },
    "bolt": {
      "name": "Bolts (30)",
      "cost": 2,
      "weight": 3,
      "qty": 30,
      "ammoType": "bolt"
    },
    "sling_bullet": {
      "name": "Sling Bullets (10)",
      "cost": 1,
      "weight": 2,
      "qty": 10,
      "ammoType": "sling_bullet"
    }
  },
  "gems": {
    "gem_quartz": {
      "name": "Quartz",
      "cost": 10,
      "weight": 0
    },
    "gem_turquoise": {
      "name": "Turquoise",
      "cost": 10,
      "weight": 0
    },
    "gem_onyx": {
      "name": "Onyx",
      "cost": 50,
      "weight": 0
    },
    "gem_garnet": {
      "name": "Garnet",
      "cost": 100,
      "weight": 0
    },
    "gem_pearl": {
      "name": "Pearl",
      "cost": 100,
      "weight": 0
    },
    "gem_topaz": {
      "name": "Topaz",
      "cost": 500,
      "weight": 0
    },
    "gem_opal": {
      "name": "Black Opal",
      "cost": 1000,
      "weight": 0
    }
  },
  "jewelry": {
    "jewel_silver_ring": {
      "name": "Silver Ring",
      "cost": 25,
      "weight": 0
    },
    "jewel_gold_chain": {
      "name": "Gold Chain",
      "cost": 100,
      "weight": 0
    },
    "jewel_gold_bracelet": {
      "name": "Gold Bracelet",
      "cost": 200,
      "weight": 0
    },
    "jewel_jeweled_brooch": {
      "name": "Jeweled Brooch",
      "cost": 500,
      "weight": 0
    }
  },
  "monsters": {
    "training_dummy": {
      "id": "training_dummy",
      "name": "Training Dummy",
      "size": "M",
      "hd": 4,
      "hpRange": [
        30,
        30
      ],
      "ac": 8,
      "thac0": 18,
      "attacks": [
        {
          "name": "wooden sword",
          "damage": [
            1,
            4
          ],
          "verb": "whacks"
        }
      ],
      "speed": 4,
      "moveRate": 6,
      "xp": 0,
      "intelligence": 0,
      "subdual": true,
      "stationary": true
    },
    "giant_rat": {
      "id": "giant_rat",
      "name": "Giant Rat",
      "size": "S",
      "hd": 0.5,
      "ac": 7,
      "thac0": 20,
      "attacks": [
        {
          "name": "bite",
          "damage": [
            1,
            3
          ],
          "verb": "bites",
          "specialAttack": {
            "type": "disease",
            "chance": 5,
            "save": "ppd",
            "text": "filth fever"
          }
        }
      ],
      "speed": 3,
      "moveRate": 12,
      "xp": 7,
      "treasureIndividual": [],
      "treasureLair": [
        "C"
      ],
      "lootTable": "vermin",
      "intelligence": 1
    },
    "kobold": {
      "id": "kobold",
      "name": "Kobold",
      "size": "S",
      "hd": 0.5,
      "hpRange": [
        1,
        4
      ],
      "ac": 7,
      "thac0": 20,
      "attacks": [
        {
          "name": "short sword",
          "damage": [
            1,
            4
          ],
          "verb": "slashes"
        }
      ],
      "rangedAttacks": [
        {
          "name": "javelin",
          "damage": [
            1,
            4
          ],
          "verb": "hurls a javelin at",
          "range": [
            2,
            4,
            6
          ]
        }
      ],
      "speed": 4,
      "moveRate": 6,
      "xp": 7,
      "treasureIndividual": [
        "J"
      ],
      "treasureLair": [
        "O",
        "Q*5"
      ],
      "lootTable": "humanoid_weak",
      "intelligence": 3
    },
    "goblin": {
      "id": "goblin",
      "name": "Goblin",
      "size": "S",
      "hd": 1,
      "hpRange": [
        1,
        7
      ],
      "ac": 6,
      "thac0": 20,
      "attacks": [
        {
          "name": "morning star",
          "damage": [
            1,
            6
          ],
          "verb": "smashes"
        }
      ],
      "rangedAttacks": [
        {
          "name": "sling",
          "damage": [
            1,
            4
          ],
          "verb": "slings a stone at",
          "range": [
            4,
            8,
            16
          ]
        }
      ],
      "speed": 4,
      "moveRate": 6,
      "xp": 15,
      "treasureIndividual": [
        "K"
      ],
      "treasureLair": [
        "C"
      ],
      "lootTable": "humanoid_med",
      "intelligence": 5
    },
    "skeleton": {
      "id": "skeleton",
      "name": "Skeleton",
      "size": "M",
      "hd": 1,
      "ac": 7,
      "thac0": 19,
      "attacks": [
        {
          "name": "rusty sword",
          "damage": [
            1,
            6
          ],
          "verb": "strikes"
        }
      ],
      "speed": 5,
      "moveRate": 12,
      "xp": 15,
      "treasureIndividual": [],
      "treasureLair": [],
      "lootTable": "undead_weak",
      "undead": true,
      "intelligence": 0
    },
    "orc": {
      "id": "orc",
      "name": "Orc",
      "size": "M",
      "hd": 1,
      "ac": 6,
      "thac0": 19,
      "attacks": [
        {
          "name": "battle axe",
          "damage": [
            1,
            8
          ],
          "verb": "chops"
        }
      ],
      "rangedAttacks": [
        {
          "name": "javelin",
          "damage": [
            1,
            6
          ],
          "verb": "hurls a javelin at",
          "range": [
            2,
            4,
            6
          ]
        }
      ],
      "speed": 4,
      "moveRate": 9,
      "xp": 15,
      "treasureIndividual": [
        "L"
      ],
      "treasureLair": [
        "C",
        "O",
        "Q*10",
        "S"
      ],
      "lootTable": "humanoid_med",
      "intelligence": 5
    },
    "wolf": {
      "id": "wolf",
      "name": "Wolf",
      "size": "M",
      "hd": 2,
      "ac": 7,
      "thac0": 18,
      "attacks": [
        {
          "name": "bite",
          "damage": [
            2,
            5
          ],
          "verb": "bites"
        }
      ],
      "speed": 2,
      "moveRate": 18,
      "xp": 35,
      "treasureIndividual": [],
      "treasureLair": [],
      "lootTable": "beast",
      "intelligence": 1
    },
    "worg": {
      "id": "worg",
      "name": "Worg",
      "size": "L",
      "hd": 3,
      "ac": 6,
      "thac0": 17,
      "attacks": [
        {
          "name": "bite",
          "damage": [
            2,
            8
          ],
          "verb": "bites"
        }
      ],
      "speed": 2,
      "moveRate": 18,
      "xp": 65,
      "treasureIndividual": [],
      "treasureLair": [],
      "lootTable": "beast",
      "intelligence": 2
    },
    "hyena": {
      "id": "hyena",
      "name": "Hyena",
      "size": "M",
      "hd": 3,
      "ac": 7,
      "thac0": 17,
      "attacks": [
        {
          "name": "bite",
          "damage": [
            2,
            8
          ],
          "verb": "bites"
        }
      ],
      "speed": 2,
      "moveRate": 12,
      "xp": 50,
      "treasureIndividual": [],
      "treasureLair": [],
      "lootTable": "beast",
      "intelligence": 1
    },
    "hyaenodon": {
      "id": "hyaenodon",
      "name": "Hyaenodon",
      "size": "L",
      "hd": 5,
      "ac": 7,
      "thac0": 15,
      "attacks": [
        {
          "name": "bite",
          "damage": [
            3,
            12
          ],
          "verb": "bites"
        }
      ],
      "speed": 2,
      "moveRate": 12,
      "xp": 150,
      "treasureIndividual": [],
      "treasureLair": [],
      "lootTable": "beast",
      "intelligence": 1
    },
    "gnoll": {
      "id": "gnoll",
      "name": "Gnoll",
      "size": "L",
      "hd": 2,
      "ac": 5,
      "thac0": 18,
      "attacks": [
        {
          "name": "two-handed sword",
          "damage": [
            2,
            8
          ],
          "verb": "cleaves"
        }
      ],
      "rangedAttacks": [
        {
          "name": "long bow",
          "damage": [
            1,
            6
          ],
          "verb": "shoots an arrow at",
          "range": [
            7,
            14,
            21
          ]
        }
      ],
      "speed": 4,
      "moveRate": 9,
      "xp": 35,
      "treasureIndividual": [
        "L",
        "M"
      ],
      "treasureLair": [
        "D",
        "Q*5",
        "S"
      ],
      "lootTable": "humanoid_strong",
      "intelligence": 7
    },
    "hobgoblin": {
      "id": "hobgoblin",
      "name": "Hobgoblin",
      "size": "M",
      "hd": 1,
      "ac": 5,
      "thac0": 18,
      "attacks": [
        {
          "name": "long sword",
          "damage": [
            1,
            8
          ],
          "verb": "slashes"
        }
      ],
      "rangedAttacks": [
        {
          "name": "short bow",
          "damage": [
            1,
            6
          ],
          "verb": "shoots an arrow at",
          "range": [
            5,
            10,
            15
          ]
        }
      ],
      "speed": 4,
      "moveRate": 9,
      "xp": 20,
      "treasureIndividual": [
        "J",
        "M"
      ],
      "treasureLair": [
        "D",
        "Q*5"
      ],
      "lootTable": "humanoid_strong",
      "intelligence": 9
    },
    "giant_spider": {
      "id": "giant_spider",
      "name": "Giant Spider",
      "size": "S",
      "hd": 1,
      "ac": 8,
      "thac0": 18,
      "attacks": [
        {
          "name": "bite",
          "damage": [
            1,
            6
          ],
          "verb": "bites",
          "specialAttack": {
            "type": "poison",
            "save": "ppd",
            "modifier": 2,
            "onFail": "death",
            "text": "venom"
          }
        }
      ],
      "speed": 3,
      "moveRate": 12,
      "xp": 25,
      "treasureIndividual": [],
      "treasureLair": [
        "C"
      ],
      "lootTable": "spider",
      "intelligence": 1
    },
    "troglodyte": {
      "id": "troglodyte",
      "name": "Troglodyte",
      "size": "M",
      "hd": 2,
      "ac": 5,
      "thac0": 18,
      "attacks": [
        {
          "name": "claws",
          "damage": [
            1,
            4
          ],
          "verb": "claws"
        },
        {
          "name": "bite",
          "damage": [
            1,
            4
          ],
          "verb": "bites"
        }
      ],
      "speed": 4,
      "moveRate": 12,
      "xp": 40,
      "treasureIndividual": [
        "M"
      ],
      "treasureLair": [
        "D"
      ],
      "lootTable": "humanoid_strong",
      "intelligence": 5
    },
    "zombie": {
      "id": "zombie",
      "name": "Zombie",
      "size": "M",
      "hd": 2,
      "ac": 8,
      "thac0": 18,
      "attacks": [
        {
          "name": "slam",
          "damage": [
            1,
            8
          ],
          "verb": "slams"
        }
      ],
      "speed": 6,
      "moveRate": 6,
      "xp": 30,
      "treasureIndividual": [],
      "treasureLair": [],
      "lootTable": "undead_med",
      "undead": true,
      "intelligence": 0
    },
    "bugbear": {
      "id": "bugbear",
      "name": "Bugbear",
      "size": "L",
      "hd": 3,
      "ac": 5,
      "thac0": 17,
      "attacks": [
        {
          "name": "morning star",
          "damage": [
            2,
            8
          ],
          "verb": "smashes"
        }
      ],
      "rangedAttacks": [
        {
          "name": "javelin",
          "damage": [
            1,
            6
          ],
          "verb": "hurls a javelin at",
          "range": [
            2,
            4,
            6
          ]
        }
      ],
      "speed": 4,
      "moveRate": 9,
      "xp": 60,
      "treasureIndividual": [
        "J",
        "K",
        "L",
        "M"
      ],
      "treasureLair": [
        "B"
      ],
      "lootTable": "humanoid_elite",
      "intelligence": 9
    },
    "ghoul": {
      "id": "ghoul",
      "name": "Ghoul",
      "size": "M",
      "hd": 2,
      "ac": 6,
      "thac0": 18,
      "attacks": [
        {
          "name": "claws",
          "damage": [
            1,
            3
          ],
          "verb": "rakes",
          "specialAttack": {
            "type": "paralysis",
            "save": "ppd",
            "duration": [
              1,
              6
            ],
            "immune": [
              "elf"
            ],
            "text": "paralysis"
          }
        },
        {
          "name": "bite",
          "damage": [
            1,
            6
          ],
          "verb": "bites",
          "specialAttack": {
            "type": "paralysis",
            "save": "ppd",
            "duration": [
              1,
              6
            ],
            "immune": [
              "elf"
            ],
            "text": "paralysis"
          }
        }
      ],
      "speed": 3,
      "moveRate": 9,
      "xp": 50,
      "treasureIndividual": [],
      "treasureLair": [
        "B",
        "T"
      ],
      "lootTable": "undead_strong",
      "undead": true,
      "intelligence": 5
    },
    "ghast": {
      "id": "ghast",
      "name": "Ghast",
      "size": "M",
      "hd": 4,
      "ac": 4,
      "thac0": 16,
      "attacks": [
        {
          "name": "claws",
          "damage": [
            1,
            4
          ],
          "verb": "rakes",
          "specialAttack": {
            "type": "paralysis",
            "save": "ppd",
            "duration": [
              1,
              6
            ],
            "text": "paralysis"
          }
        },
        {
          "name": "bite",
          "damage": [
            1,
            8
          ],
          "verb": "bites",
          "specialAttack": {
            "type": "paralysis",
            "save": "ppd",
            "duration": [
              1,
              6
            ],
            "text": "paralysis"
          }
        }
      ],
      "speed": 2,
      "moveRate": 15,
      "xp": 190,
      "treasureIndividual": [],
      "treasureLair": [
        "B",
        "Q",
        "R",
        "S",
        "T"
      ],
      "lootTable": "undead_strong",
      "undead": true,
      "intelligence": 7
    },
    "ogre": {
      "id": "ogre",
      "name": "Ogre",
      "size": "L",
      "hd": 4,
      "ac": 5,
      "thac0": 16,
      "attacks": [
        {
          "name": "great club",
          "damage": [
            1,
            10
          ],
          "verb": "smashes"
        }
      ],
      "speed": 4,
      "moveRate": 9,
      "xp": 90,
      "treasureIndividual": [
        "M*10"
      ],
      "treasureLair": [
        "B",
        "Q",
        "S"
      ],
      "lootTable": "ogre",
      "intelligence": 5
    },
    "gnoll_chieftain": {
      "id": "gnoll_chieftain",
      "name": "Gnoll Chieftain",
      "size": "L",
      "hd": 3,
      "ac": 4,
      "thac0": 17,
      "attacks": [
        {
          "name": "two-handed sword",
          "damage": [
            2,
            8
          ],
          "verb": "cleaves"
        }
      ],
      "rangedAttacks": [
        {
          "name": "javelin",
          "damage": [
            1,
            6
          ],
          "verb": "hurls a javelin at",
          "range": [
            2,
            4,
            6
          ]
        }
      ],
      "speed": 3,
      "moveRate": 9,
      "xp": 75,
      "treasureIndividual": [
        "M"
      ],
      "treasureLair": [
        "D"
      ],
      "lootTable": "humanoid_elite"
    },
    "bandit": {
      "id": "bandit",
      "name": "Bandit",
      "size": "M",
      "hd": 1,
      "ac": 7,
      "thac0": 19,
      "attacks": [
        {
          "name": "short sword",
          "damage": [
            1,
            6
          ],
          "verb": "slashes"
        }
      ],
      "rangedAttacks": [
        {
          "name": "short bow",
          "damage": [
            1,
            6
          ],
          "verb": "shoots",
          "range": [
            5,
            10,
            15
          ]
        }
      ],
      "speed": 4,
      "moveRate": 12,
      "xp": 10,
      "treasureIndividual": [
        "L",
        "M"
      ],
      "treasureLair": [
        "A"
      ],
      "lootTable": "humanoid_med"
    },
    "bandit_captain": {
      "id": "bandit_captain",
      "name": "Bandit Captain",
      "size": "M",
      "hd": 4,
      "ac": 5,
      "thac0": 17,
      "attacks": [
        {
          "name": "longsword",
          "damage": [
            1,
            8
          ],
          "verb": "strikes"
        }
      ],
      "rangedAttacks": [
        {
          "name": "throwing dagger",
          "damage": [
            1,
            4
          ],
          "verb": "flings a dagger at",
          "range": [
            1,
            2,
            3
          ]
        }
      ],
      "speed": 4,
      "moveRate": 12,
      "xp": 120,
      "treasureIndividual": [
        "M",
        "N",
        "O"
      ],
      "treasureLair": [],
      "lootTable": "humanoid_elite"
    },
    "orc_sergeant": {
      "id": "orc_sergeant",
      "name": "Orc Sergeant",
      "size": "M",
      "hd": 2,
      "ac": 5,
      "thac0": 18,
      "attacks": [
        {
          "name": "morning star",
          "damage": [
            2,
            4
          ],
          "verb": "bludgeons"
        }
      ],
      "rangedAttacks": [
        {
          "name": "javelin",
          "damage": [
            1,
            6
          ],
          "verb": "hurls a javelin at",
          "range": [
            2,
            4,
            6
          ]
        }
      ],
      "speed": 4,
      "moveRate": 9,
      "xp": 35,
      "treasureIndividual": [
        "L",
        "M"
      ],
      "treasureLair": [],
      "lootTable": "humanoid_med"
    },
    "orc_chieftain": {
      "id": "orc_chieftain",
      "name": "Orc Chieftain",
      "size": "L",
      "hd": 5,
      "ac": 3,
      "thac0": 16,
      "attacks": [
        {
          "name": "two-handed sword",
          "damage": [
            2,
            8
          ],
          "verb": "cleaves"
        },
        {
          "name": "fist",
          "damage": [
            1,
            3
          ],
          "verb": "smashes"
        }
      ],
      "rangedAttacks": [
        {
          "name": "javelin",
          "damage": [
            1,
            6
          ],
          "verb": "hurls a javelin at",
          "range": [
            2,
            4,
            6
          ]
        }
      ],
      "speed": 3,
      "moveRate": 9,
      "xp": 225,
      "treasureIndividual": [
        "M",
        "N",
        "O"
      ],
      "treasureLair": [
        "D",
        "E"
      ],
      "lootTable": "humanoid_elite"
    },
    "wight": {
      "id": "wight",
      "name": "Wight",
      "size": "M",
      "hd": 4,
      "ac": 5,
      "thac0": 15,
      "attacks": [
        {
          "name": "claw",
          "damage": [
            1,
            4
          ],
          "verb": "claws",
          "specialAttack": {
            "type": "drain",
            "drainType": "level",
            "amount": 1,
            "text": "energy drain"
          }
        }
      ],
      "speed": 3,
      "moveRate": 12,
      "xp": 310,
      "treasureIndividual": [],
      "treasureLair": [
        "B"
      ],
      "lootTable": "undead_deep",
      "undead": true
    },
    "wraith": {
      "id": "wraith",
      "name": "Wraith",
      "size": "M",
      "hd": 5,
      "ac": 4,
      "thac0": 15,
      "attacks": [
        {
          "name": "touch",
          "damage": [
            1,
            6
          ],
          "verb": "touches",
          "specialAttack": {
            "type": "drain",
            "drainType": "level",
            "amount": 1,
            "text": "energy drain"
          }
        }
      ],
      "speed": 3,
      "moveRate": 12,
      "xp": 475,
      "treasureIndividual": [],
      "treasureLair": [
        "E"
      ],
      "lootTable": "undead_deep",
      "undead": true
    },
    "owlbear": {
      "id": "owlbear",
      "name": "Owlbear",
      "size": "L",
      "hd": 5,
      "ac": 5,
      "thac0": 15,
      "attacks": [
        {
          "name": "claw",
          "damage": [
            1,
            6
          ],
          "verb": "rakes"
        },
        {
          "name": "claw",
          "damage": [
            1,
            6
          ],
          "verb": "rakes"
        },
        {
          "name": "beak",
          "damage": [
            2,
            6
          ],
          "verb": "bites"
        }
      ],
      "speed": 3,
      "moveRate": 12,
      "xp": 275,
      "treasureIndividual": [],
      "treasureLair": [
        "C"
      ],
      "lootTable": "beast_deep"
    },
    "carrion_crawler": {
      "id": "carrion_crawler",
      "name": "Carrion Crawler",
      "size": "L",
      "hd": 3,
      "ac": 3,
      "thac0": 16,
      "attacks": [
        {
          "name": "tentacle",
          "damage": [
            0,
            0
          ],
          "verb": "lashes",
          "specialAttack": {
            "type": "paralysis",
            "save": "ppd",
            "duration": [
              2,
              12
            ],
            "text": "paralysis"
          }
        },
        {
          "name": "tentacle",
          "damage": [
            0,
            0
          ],
          "verb": "lashes",
          "specialAttack": {
            "type": "paralysis",
            "save": "ppd",
            "duration": [
              2,
              12
            ],
            "text": "paralysis"
          }
        }
      ],
      "speed": 3,
      "moveRate": 12,
      "xp": 280,
      "treasureIndividual": [],
      "treasureLair": [
        "B"
      ],
      "lootTable": "beast_deep"
    },
    "gelatinous_cube": {
      "id": "gelatinous_cube",
      "name": "Gelatinous Cube",
      "size": "L",
      "hd": 4,
      "ac": 8,
      "thac0": 15,
      "attacks": [
        {
          "name": "engulf",
          "damage": [
            2,
            4
          ],
          "verb": "engulfs",
          "specialAttack": {
            "type": "paralysis",
            "save": "ppd",
            "duration": [
              5,
              20
            ],
            "text": "paralysis"
          }
        }
      ],
      "speed": 1,
      "moveRate": 6,
      "xp": 225,
      "treasureIndividual": [],
      "treasureLair": [],
      "lootTable": "ooze"
    },
    "minotaur": {
      "id": "minotaur",
      "name": "Minotaur",
      "size": "L",
      "hd": 6,
      "ac": 6,
      "thac0": 13,
      "attacks": [
        {
          "name": "gore",
          "damage": [
            2,
            4
          ],
          "verb": "gores"
        },
        {
          "name": "bite",
          "damage": [
            1,
            3
          ],
          "verb": "bites"
        },
        {
          "name": "great axe",
          "damage": [
            1,
            8
          ],
          "verb": "hacks"
        }
      ],
      "speed": 3,
      "moveRate": 12,
      "xp": 350,
      "treasureIndividual": [],
      "treasureLair": [
        "C"
      ],
      "lootTable": "humanoid_elite"
    },
    "gargoyle": {
      "id": "gargoyle",
      "name": "Gargoyle",
      "size": "M",
      "hd": 4,
      "ac": 5,
      "thac0": 15,
      "attacks": [
        {
          "name": "claw",
          "damage": [
            1,
            3
          ],
          "verb": "claws"
        },
        {
          "name": "claw",
          "damage": [
            1,
            3
          ],
          "verb": "claws"
        },
        {
          "name": "bite",
          "damage": [
            1,
            6
          ],
          "verb": "bites"
        },
        {
          "name": "horn",
          "damage": [
            1,
            4
          ],
          "verb": "gores"
        }
      ],
      "speed": 3,
      "moveRate": 9,
      "xp": 275,
      "treasureIndividual": [],
      "treasureLair": [
        "C"
      ],
      "lootTable": "beast_deep"
    },
    "troll": {
      "id": "troll",
      "name": "Troll",
      "size": "L",
      "hd": 6,
      "ac": 4,
      "thac0": 13,
      "attacks": [
        {
          "name": "claw",
          "damage": [
            1,
            4
          ],
          "verb": "rakes"
        },
        {
          "name": "claw",
          "damage": [
            1,
            4
          ],
          "verb": "rakes"
        },
        {
          "name": "bite",
          "damage": [
            2,
            6
          ],
          "verb": "bites"
        }
      ],
      "speed": 3,
      "moveRate": 12,
      "xp": 475,
      "treasureIndividual": [],
      "treasureLair": [
        "D"
      ],
      "lootTable": "ogre"
    },
    "hill_giant": {
      "id": "hill_giant",
      "name": "Hill Giant",
      "size": "L",
      "hd": 8,
      "ac": 4,
      "thac0": 12,
      "attacks": [
        {
          "name": "fist",
          "damage": [
            2,
            8
          ],
          "verb": "smashes"
        }
      ],
      "rangedAttacks": [
        {
          "name": "hurled boulder",
          "damage": [
            2,
            8
          ],
          "verb": "hurls a boulder at",
          "range": [
            3,
            8,
            15
          ]
        }
      ],
      "speed": 3,
      "moveRate": 12,
      "xp": 900,
      "treasureIndividual": [],
      "treasureLair": [
        "D"
      ],
      "lootTable": "giant"
    },
    "wyvern": {
      "id": "wyvern",
      "name": "Wyvern",
      "size": "L",
      "hd": 7,
      "ac": 3,
      "thac0": 13,
      "attacks": [
        {
          "name": "bite",
          "damage": [
            2,
            8
          ],
          "verb": "bites"
        },
        {
          "name": "tail sting",
          "damage": [
            1,
            6
          ],
          "verb": "stings",
          "specialAttack": {
            "type": "poison",
            "save": "ppd",
            "modifier": 0,
            "onFail": "death",
            "text": "venom"
          }
        }
      ],
      "speed": 3,
      "moveRate": 6,
      "xp": 700,
      "treasureIndividual": [],
      "treasureLair": [
        "E"
      ],
      "lootTable": "beast_deep"
    }
  },
  "loot": {
    "vermin": [
      {
        "chance": 15,
        "coins": {
          "cp": [
            2,
            12
          ]
        }
      }
    ],
    "humanoid_weak": [
      {
        "chance": 60,
        "coins": {
          "cp": [
            5,
            20
          ],
          "sp": [
            0,
            4
          ]
        }
      },
      {
        "chance": 8,
        "items": [
          {
            "id": "dagger",
            "w": 4
          },
          {
            "id": "club",
            "w": 3
          },
          {
            "id": "torch",
            "w": 5
          }
        ]
      },
      {
        "chance": 3,
        "items": [
          {
            "id": "healing_potion",
            "w": 1
          }
        ]
      }
    ],
    "humanoid_med": [
      {
        "chance": 75,
        "coins": {
          "cp": [
            5,
            30
          ],
          "sp": [
            1,
            8
          ],
          "ep": [
            0,
            1
          ]
        }
      },
      {
        "chance": 12,
        "items": [
          {
            "id": "short_sword",
            "w": 3
          },
          {
            "id": "hand_axe",
            "w": 3
          },
          {
            "id": "mace",
            "w": 2
          },
          {
            "id": "dagger",
            "w": 4
          }
        ]
      },
      {
        "chance": 5,
        "items": [
          {
            "id": "gem_quartz",
            "w": 3
          },
          {
            "id": "gem_turquoise",
            "w": 2
          }
        ]
      },
      {
        "chance": 3,
        "items": [
          {
            "id": "healing_potion",
            "w": 1
          }
        ]
      }
    ],
    "undead_weak": [
      {
        "chance": 30,
        "coins": {
          "cp": [
            3,
            20
          ],
          "sp": [
            0,
            5
          ]
        }
      },
      {
        "chance": 8,
        "items": [
          {
            "id": "gem_quartz",
            "w": 2
          },
          {
            "id": "gem_turquoise",
            "w": 1
          }
        ]
      }
    ],
    "beast": [
      {
        "chance": 10,
        "coins": {
          "cp": [
            1,
            8
          ]
        }
      }
    ],
    "humanoid_strong": [
      {
        "chance": 80,
        "coins": {
          "sp": [
            3,
            18
          ],
          "ep": [
            0,
            3
          ],
          "gp": [
            1,
            6
          ]
        }
      },
      {
        "chance": 18,
        "items": [
          {
            "id": "long_sword",
            "w": 2
          },
          {
            "id": "battle_axe",
            "w": 2
          },
          {
            "id": "morning_star",
            "w": 2
          },
          {
            "id": "short_sword",
            "w": 3
          }
        ]
      },
      {
        "chance": 10,
        "items": [
          {
            "id": "gem_quartz",
            "w": 2
          },
          {
            "id": "gem_turquoise",
            "w": 2
          },
          {
            "id": "gem_onyx",
            "w": 1
          }
        ]
      },
      {
        "chance": 6,
        "items": [
          {
            "id": "healing_potion",
            "w": 1
          }
        ]
      },
      {
        "chance": 4,
        "items": [
          {
            "id": "leather",
            "w": 3
          },
          {
            "id": "studded",
            "w": 2
          },
          {
            "id": "ring_mail",
            "w": 1
          }
        ]
      }
    ],
    "undead_med": [
      {
        "chance": 40,
        "coins": {
          "sp": [
            2,
            12
          ],
          "ep": [
            0,
            2
          ],
          "gp": [
            1,
            4
          ]
        }
      },
      {
        "chance": 12,
        "items": [
          {
            "id": "gem_turquoise",
            "w": 2
          },
          {
            "id": "gem_onyx",
            "w": 2
          },
          {
            "id": "gem_garnet",
            "w": 1
          }
        ]
      },
      {
        "chance": 5,
        "items": [
          {
            "id": "short_sword",
            "w": 2
          },
          {
            "id": "long_sword",
            "w": 1
          }
        ]
      }
    ],
    "spider": [
      {
        "chance": 25,
        "coins": {
          "cp": [
            5,
            30
          ],
          "sp": [
            1,
            8
          ]
        }
      },
      {
        "chance": 8,
        "items": [
          {
            "id": "gem_quartz",
            "w": 2
          },
          {
            "id": "gem_turquoise",
            "w": 1
          }
        ]
      },
      {
        "chance": 4,
        "items": [
          {
            "id": "antidote",
            "w": 1
          }
        ]
      }
    ],
    "humanoid_elite": [
      {
        "chance": 90,
        "coins": {
          "sp": [
            5,
            20
          ],
          "ep": [
            1,
            4
          ],
          "gp": [
            3,
            18
          ]
        }
      },
      {
        "chance": 22,
        "items": [
          {
            "id": "long_sword",
            "w": 2
          },
          {
            "id": "battle_axe",
            "w": 2
          },
          {
            "id": "two_h_sword",
            "w": 1
          },
          {
            "id": "broad_sword",
            "w": 1
          }
        ]
      },
      {
        "chance": 15,
        "items": [
          {
            "id": "gem_onyx",
            "w": 2
          },
          {
            "id": "gem_garnet",
            "w": 2
          },
          {
            "id": "gem_pearl",
            "w": 1
          },
          {
            "id": "gem_topaz",
            "w": 1
          }
        ]
      },
      {
        "chance": 8,
        "items": [
          {
            "id": "chain_mail",
            "w": 2
          },
          {
            "id": "scale_mail",
            "w": 2
          },
          {
            "id": "studded",
            "w": 3
          }
        ]
      },
      {
        "chance": 8,
        "items": [
          {
            "id": "healing_potion",
            "w": 1
          }
        ]
      },
      {
        "chance": 5,
        "items": [
          {
            "id": "jewel_silver_ring",
            "w": 2
          },
          {
            "id": "jewel_gold_chain",
            "w": 1
          }
        ]
      }
    ],
    "ogre": [
      {
        "chance": 95,
        "coins": {
          "ep": [
            2,
            8
          ],
          "gp": [
            5,
            30
          ],
          "pp": [
            0,
            2
          ]
        }
      },
      {
        "chance": 20,
        "items": [
          {
            "id": "gem_garnet",
            "w": 2
          },
          {
            "id": "gem_pearl",
            "w": 2
          },
          {
            "id": "gem_topaz",
            "w": 1
          }
        ]
      },
      {
        "chance": 10,
        "items": [
          {
            "id": "jewel_silver_ring",
            "w": 2
          },
          {
            "id": "jewel_gold_chain",
            "w": 1
          },
          {
            "id": "jewel_gold_bracelet",
            "w": 1
          }
        ]
      },
      {
        "chance": 8,
        "items": [
          {
            "id": "healing_potion",
            "w": 1
          }
        ]
      }
    ],
    "undead_strong": [
      {
        "chance": 50,
        "coins": {
          "ep": [
            1,
            4
          ],
          "gp": [
            3,
            16
          ],
          "pp": [
            0,
            1
          ]
        }
      },
      {
        "chance": 18,
        "items": [
          {
            "id": "gem_garnet",
            "w": 2
          },
          {
            "id": "gem_pearl",
            "w": 2
          },
          {
            "id": "gem_topaz",
            "w": 1
          }
        ]
      },
      {
        "chance": 10,
        "items": [
          {
            "id": "jewel_silver_ring",
            "w": 1
          },
          {
            "id": "jewel_gold_chain",
            "w": 1
          }
        ]
      },
      {
        "chance": 6,
        "items": [
          {
            "id": "chain_mail",
            "w": 2
          },
          {
            "id": "long_sword",
            "w": 2
          }
        ]
      }
    ],
    "undead_deep": [
      {
        "chance": 60,
        "coins": {
          "gp": [
            5,
            30
          ],
          "pp": [
            1,
            4
          ]
        }
      },
      {
        "chance": 22,
        "items": [
          {
            "id": "gem_topaz",
            "w": 2
          },
          {
            "id": "gem_pearl",
            "w": 2
          },
          {
            "id": "gem_ruby",
            "w": 1
          },
          {
            "id": "gem_emerald",
            "w": 1
          }
        ]
      },
      {
        "chance": 15,
        "items": [
          {
            "id": "jewel_gold_chain",
            "w": 2
          },
          {
            "id": "jewel_gold_bracelet",
            "w": 2
          },
          {
            "id": "jewel_platinum_ring",
            "w": 1
          }
        ]
      },
      {
        "chance": 8,
        "items": [
          {
            "id": "healing_potion",
            "w": 1
          }
        ]
      }
    ],
    "beast_deep": [
      {
        "chance": 40,
        "coins": {
          "gp": [
            3,
            18
          ],
          "pp": [
            0,
            2
          ]
        }
      },
      {
        "chance": 15,
        "items": [
          {
            "id": "gem_garnet",
            "w": 2
          },
          {
            "id": "gem_topaz",
            "w": 2
          },
          {
            "id": "gem_pearl",
            "w": 1
          }
        ]
      },
      {
        "chance": 8,
        "items": [
          {
            "id": "jewel_silver_ring",
            "w": 2
          },
          {
            "id": "jewel_gold_chain",
            "w": 1
          }
        ]
      },
      {
        "chance": 5,
        "items": [
          {
            "id": "healing_potion",
            "w": 1
          }
        ]
      }
    ],
    "ooze": [
      {
        "chance": 50,
        "coins": {
          "cp": [
            10,
            60
          ],
          "sp": [
            5,
            30
          ],
          "gp": [
            2,
            12
          ]
        }
      },
      {
        "chance": 20,
        "items": [
          {
            "id": "gem_quartz",
            "w": 2
          },
          {
            "id": "gem_garnet",
            "w": 2
          },
          {
            "id": "gem_topaz",
            "w": 1
          }
        ]
      },
      {
        "chance": 10,
        "items": [
          {
            "id": "jewel_silver_ring",
            "w": 1
          },
          {
            "id": "jewel_gold_chain",
            "w": 1
          }
        ]
      },
      {
        "chance": 6,
        "items": [
          {
            "id": "long_sword",
            "w": 1
          },
          {
            "id": "short_sword",
            "w": 1
          },
          {
            "id": "dagger",
            "w": 2
          }
        ]
      }
    ],
    "giant": [
      {
        "chance": 95,
        "coins": {
          "gp": [
            10,
            60
          ],
          "pp": [
            2,
            8
          ]
        }
      },
      {
        "chance": 30,
        "items": [
          {
            "id": "gem_topaz",
            "w": 2
          },
          {
            "id": "gem_ruby",
            "w": 1
          },
          {
            "id": "gem_emerald",
            "w": 1
          },
          {
            "id": "gem_diamond",
            "w": 1
          }
        ]
      },
      {
        "chance": 20,
        "items": [
          {
            "id": "jewel_gold_bracelet",
            "w": 2
          },
          {
            "id": "jewel_platinum_ring",
            "w": 1
          },
          {
            "id": "jewel_gold_crown",
            "w": 1
          }
        ]
      },
      {
        "chance": 10,
        "items": [
          {
            "id": "healing_potion",
            "w": 1
          }
        ]
      },
      {
        "chance": 8,
        "items": [
          {
            "id": "chain_mail",
            "w": 1
          },
          {
            "id": "plate_mail",
            "w": 1
          },
          {
            "id": "two_h_sword",
            "w": 1
          }
        ]
      }
    ]
  }
};

// ---- helpers (logic that can't be JSON) ----
// Turn Undead: cleric turning-level vs undead type -> {result:'none'|'T'|'D'|'roll', needed?}
// Numeric cells are the 2d6 target (>=). Values >12 are unreachable at that level => cannot turn yet.
CDATA.getTurnResult = function (turnLevel, undeadType) {
  if (!CDATA.turnUndead) return { result: 'none' };
  const row = CDATA.turnUndead[Math.min(Math.max(turnLevel | 0, 1), CDATA.turnUndead.length) - 1];
  const ti = CDATA.undeadTypes.indexOf(undeadType);
  const cell = (ti >= 0) ? row[ti] : 0;
  if (cell === 'D') return { result: 'D' };
  if (cell === 'T') return { result: 'T' };
  if (typeof cell === 'number' && cell > 0 && cell <= 12) return { result: 'roll', needed: cell };
  return { result: 'none' };  // 0, dash, or unreachable (>12)
};
// Cleric turns at level; paladin at level-2 (>=3).
CDATA.getTurnLevel = function (cls, level) {
  if (cls === 'cleric') return level;
  if (cls === 'paladin' && level >= 3) return level - 2;
  return 0;
};
// Attacks per round string, e.g. '1/1','3/2','2/1'.
CDATA.getAttacksPerRound = function (cls, level) {
  if (cls === 'fighter' || cls === 'paladin') return level >= 13 ? '2/1' : level >= 7 ? '3/2' : '1/1';
  if (cls === 'ranger') return level >= 15 ? '2/1' : level >= 8 ? '3/2' : '1/1';
  return '1/1';
};
// Spell slots per level: returns array [L1,L2,L3,...] or null.
CDATA.getSpellSlots = function (cls, level) {
  const key = (cls === 'magic-user' || cls === 'magic_user') ? 'mu' : cls;
  const tbl = CDATA.spellSlots[key];
  if (!tbl) return null;
  return tbl[Math.min(Math.max(level | 0, 1), tbl.length) - 1] || null;
};
if (typeof module !== 'undefined' && module.exports) module.exports = CDATA; // harmless under <script>

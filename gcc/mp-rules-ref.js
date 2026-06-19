/* Mighty Protectors (Villains & Vigilantes 3.0) — rules reference for GW -> MP conversion
 * NOT loaded by the engine. A durable reference, populated as rules are confirmed against
 * the core rulebook (section numbers noted). Mark each entry confirmed / inferred / TODO so
 * conversion code never silently relies on a guess.
 * Date: 2026-06-19 (added ChangeEnvironment, Energy, ExperienceLevels, Flame, Invulnerability, Regeneration, robot-weapon abilities, full BC table, more modifiers)
 */
var MP_RULES = {

  // 2.1.1 / 2.1.7.1 / 2.1.16.2  — CONFIRMED
  powerLevels: {
    Normal:   { bcPoints: 50, coreAbilityCP: 0,  totalCP: 50,  randomBCs: [14,12,10,8,6] },
    Low:      { bcPoints: 60, coreAbilityCP: 10, totalCP: 100, randomBCs: [16,14,12,10,8] },
    Standard: { bcPoints: 70, coreAbilityCP: 20, totalCP: 150, randomBCs: [18,16,14,12,10] },
    High:     { bcPoints: 80, coreAbilityCP: 30, totalCP: 200, randomBCs: [20,18,16,14,12] }
  },

  // 2.1.7.2 Basic Characteristic Table — CONFIRMED (full table, scores 0-98). Validated against the
  // rulebook worked example: all-9 BCs -> 4 Hits; raising EN to 12 -> 6 Hits.
  // Each row: maxScore band, Carrying Capacity (ST), Save Number (EN/AG/IN/CL roll-under), the die
  // (Base HTH keyed off ST AND Initiative keyed off CL use the same ladder), the Hit Point
  // contributions from ST/EN/AG/CL, and the Healing Rate (by EN, points per turn of rest).
  // Hits = hp(ST)+hp(EN)+hp(AG)+hp(CL), min 1. Physical Def = AG save - 10; Mental Def = IN save - 10.
  bcTable: [
    // maxScore, carry, save, die, hpST, hpEN, hpAG, hpCL, heal
    [0, 8, 6, "d2-1", -3, -5, -2, -1, 0.2],
    [1, 10, 7, "d2-1", -3, -5, -2, -1, 0.3],
    [2, 12, 7, "d2-1", -3, -5, -2, -1, 0.3],
    [5, 15, 8, "d2", -2, -3, -1, 0, 0.5],
    [8, 30, 9, "d3", 0, -1, 0, 1, 0.8],
    [11, 60, 10, "d4", 1, 1, 1, 1, 1],
    [14, 120, 11, "d6", 3, 3, 2, 2, 1.6],
    [17, 240, 11, "d6+1", 5, 6, 3, 2, 2.2],
    [20, 480, 12, "d8+1", 6, 8, 5, 3, 2.8],
    [23, 960, 12, "d10+1", 8, 10, 6, 3, 3.4],
    [26, 1920, 13, "2d6", 10, 13, 7, 4, 3.9],
    [29, 3840, 13, "d6+d8", 12, 15, 8, 5, 4.5],
    [32, 7680, 14, "2d8", 14, 17, 9, 5, 5.1],
    [35, 15360, 14, "d8+d10", 16, 20, 10, 6, 5.7],
    [38, 30720, 15, "2d10", 17, 22, 12, 6, 6.3],
    [41, 61440, 15, "d10+d12", 19, 25, 13, 7, 6.9],
    [44, 122880, 16, "2d12", 21, 27, 14, 7, 7.5],
    [47, 245760, 16, "3d8", 23, 29, 15, 8, 8.1],
    [50, 491520, 17, "2d8+d10", 25, 32, 16, 9, 8.7],
    [53, 983040, 17, "d8+2d10", 27, 34, 17, 9, 9.2],
    [56, 1966080, 18, "3d10", 28, 36, 19, 10, 9.8],
    [59, 3932160, 18, "2d10+d12", 30, 39, 20, 10, 10.4],
    [62, 7864320, 19, "d10+2d12", 32, 41, 21, 11, 11],
    [65, 15728640, 19, "3d12", 34, 43, 22, 12, 11.6],
    [68, 31457280, 20, "3d12+1", 36, 46, 23, 12, 12.2],
    [71, 62914560, 20, "3d12+2", 38, 48, 25, 13, 12.8],
    [74, 125829120, 21, "4d10", 39, 50, 26, 13, 13.4],
    [77, 251658240, 21, "3d10+d12", 41, 53, 27, 14, 14],
    [80, 503316480, 22, "2d10+2d12", 43, 55, 28, 15, 14.5],
    [83, 1006632960, 22, "d10+3d12", 45, 58, 29, 15, 15.1],
    [86, 2013265920, 23, "4d12", 47, 60, 30, 16, 15.7],
    [89, 4026531840, 23, "4d12+1", 48, 62, 32, 16, 16.3],
    [92, 8053063680, 24, "5d10", 50, 65, 33, 17, 16.9],
    [95, 16106127360, 24, "4d10+d12", 52, 67, 34, 17, 17.5],
    [98, 32212254720, 25, "3d10+2d12", 54, 69, 35, 18, 18.1]
  ],

  // 2.1.8 Secondary Characteristics — CONFIRMED
  secondary: {
    power:        "final ST + EN + AG + IN",
    hits:         "sum of bcTable Hit-Point contributions for ST,EN,AG,CL (min 1)",
    physicalDef:  "AG save - 10",
    mentalDef:    "IN save - 10",
    move:         "round( avg(ST, EN, AG) )",
    inventing:    "ceil(IN / 2)",
    healingRate:  "by EN score (bcTable heal column = points per turn of rest)"
  },

  // 2.1.16.5 Caps (apply to both base and final cost; rise with total CP) — CONFIRMED
  caps: {
    bcCap:     "floor(TotalCP / 5) + 10",
    abilityCap:"floor(TotalCP / 5)",
    damageCap: "floor(TotalCP / 12.5) + 3"   // avg damage = (min+max roll)/2
  },

  // 2.1.16.3 Weaknesses: max -20 CP normally (species/ability/modifier weaknesses exempt; hard GM cap -30)

  // 2.1.3 Species — CONFIRMED (labels used in conversion). Monster -10 Weakness / +10 Ability
  //   package intentionally NOT applied for GW (mutation is the norm, not a stigma).
  species: ["Human", "Tech Construct", "Mystical Construct", "Monster", "Mixed"],

  // 2.1.14 Origin Type — CONFIRMED
  originTypes: ["Mutated or Evolved","Science Accident","Mystical Accident",
                "Science Project","Mystical Project","Physical Training","Mystical Training"],

  abilities: {

    // CONFIRMED (rulebook text). Damage reduction by type; PR 0; Continual.
    // Total points distributed among Kinetic/Energy/Biochemical/Entropy/Psychic.
    Armor: {
      type: "Continual", pr: 0,
      effect: "subtract protection value from incoming damage of the matching type",
      // [CP, totalPoints, defaultK/E/B/Ent]
      table: [
        [2.5, 2,  [1,0,0,1]], [5, 3, [1,1,0,1]], [7.5, 5, [2,1,1,1]], [10, 6, [2,1,1,2]],
        [12.5,8, [2,2,2,2]], [15, 9, [3,2,2,2]], [17.5,11,[3,3,2,3]], [20,12,[3,3,3,3]],
        [22.5,13,[4,3,3,3]], [25,14,[4,3,3,4]], [27.5,15,[4,4,3,4]], [30,16,[4,4,4,4]],
        [32.5,17,[5,4,4,4]], [35,18,[5,4,4,5]], [37.5,19,[5,5,4,5]], [40,20,[5,5,5,5]],
        [42.5,21,[6,5,5,5]], [45,22,[6,5,5,6]], [47.5,23,[6,6,5,6]], [50,24,[6,6,6,6]]
      ],
      notes: "points may be allocated manually (e.g. heavy Kinetic) instead of the default spread; " +
             "Modifier Ablative (-5): protection drops 1 per hit >= total armor, highest value first"
    },

    // CONFIRMED (rulebook text). FLAT, not a multiplier.
    Durability: {
      type: "Continual",
      effect: "extra Hits equal to CPs spent (1 Hit per CP). Subject to the Ability Cap."
    },

    // CONFIRMED (rulebook table). REPLACES calculated Move; per-action Move = Acceleration.
    Speed: {
      type: "Voluntary",
      effect: "replaces calculated Move; Move=Acceleration (use calc Move if higher); ramps x2/turn to Top Speed",
      // [CP, acceleration, topSpeed_inches, mph]
      table: [
        [-10,2,8,2.5],[-7.5,3,12,3.8],[-5,4,16,5],[-2.5,6,24,8],[0,8,32,11],[2.5,12,48,16],
        [5,16,64,21],[7.5,24,96,33],[10,32,128,44],[12.5,48,192,66],[15,64,256,87],
        [17.5,96,384,131],[20,128,512,174],[22.5,192,768,262],[25,256,1024,348],[30,512,2048,697]
      ],
      modifiers: "Amphibious +5 (full speed underwater); Water Running +2.5; Fast Acceleration +2.5 (+2 accel steps); Fast Swimming +0 (applies to swim instead of ground)"
    },

    // CONFIRMED (rulebook table). Separate from ground Move; flight movement.
    Flight: {
      type: "Voluntary",
      effect: "flight Acceleration/Top Speed by CP; 1/4 speed underwater; PR 1/hour long-duration",
      // [CP, acceleration, topSpeed_inches, mph]
      table: [
        [-5,0.5,8,2.5],[-2.5,0.75,12,3.8],[0,1,16,5],[2.5,1.5,24,8],[5,2,32,11],[7.5,3,48,16],
        [10,4,64,21],[12.5,6,96,33],[15,8,128,44],[17.5,12,192,66],[20,16,256,87],
        [22.5,24,384,131],[25,32,512,174],[27.5,48,768,262],[30,64,1024,348]
      ],
      modifiers: "Fast Acceleration +2.5; Amphibious +5; Wings -5 (no vacuum); Gliding -5"
    },

    // CONFIRMED. +1 to a defense per CP-rate.
    HeightenedDefense: {
      type: "Voluntary", pr: 0,
      effect: "+1 to BOTH Physical and Mental Defense per 5 CP; or +1 to ONE (Only Physical / Only Mental) per 2.5 CP",
      notes: "only while conscious and mobile"
    },

    // INFERRED from bestiary usage (Heightened Strength +8 = 8 CP). Confirm CP->BC rate.
    HeightenedCharacteristic: {
      type: "inferred",
      effect: "raises a BC; appears to be +1 BC per 1 CP (e.g. Heightened Strength)",
      todo: "confirm exact rule text and rate"
    },

    // PARTIAL. Larger/Smaller tiers alter ST/EN, Profile, Weight.
    SizeChange: {
      type: "partial",
      effect: "tiered size shift; alters ST/EN, Profile multiplier, Weight",
      todo: "capture full tier table (CP per tier, exact ST/EN/Profile/Weight per tier)"
    },

    // CONFIRMED. Standard Energy attack; range (ST+EN)/2; PR 1. Table tops at 4d10 (avg 22).
    // NOTE: this is the ceiling for a single MP blast. GW weapon notations like "20d6" / "100 hp"
    // are GW values, not MP -- convert each weapon to the Power Blast CP whose roll fits, then the
    // Damage Cap (floor(TotalCP/12.5)+3, avg) still applies.
    PowerBlast: {
      type: "Voluntary", damageType: "Energy", pr: 1, range: "(ST+EN)/2 inches",
      table: [[0,"d6"],[2.5,"d6+1"],[5,"2d4"],[7.5,"d4+d6"],[10,"2d6"],[12.5,"d6+d8"],[15,"2d8"],
        [17.5,"d8+d10"],[20,"2d10"],[22.5,"d10+d12"],[25,"2d12"],[27.5,"3d8"],[30,"2d8+d10"],
        [32.5,"d8+2d10"],[35,"3d10"],[37.5,"2d10+d12"],[40,"d10+2d12"],[42.5,"3d12"],[45,"3d12+1"],
        [47.5,"3d12+2"],[50,"4d10"]],
      avgAt: { "20cp":11, "50cp":22 }
    },

    // CONFIRMED. "Other" damage: ONLY blocked by Invulnerability to Disintegration -> bypasses
    // Force Field, Armor, and SR. vs objects, each point destroys 1 HP of material regardless of SR.
    // No knockback. ST" range, PR 2. This is the MP "anti-tank" answer to a screened/armored apex.
    Disintegration: {
      type: "Voluntary", damageType: "Other (Disintegration)", pr: 2, range: "ST inches",
      ignores: "Force Field, Armor, and Structural Rating (only Invulnerability-to-Disintegration stops it)",
      table: [[-5,"d3"],[-2.5,"d4"],[0,"d6"],[2.5,"d6+1"],[5,"2d4"],[7.5,"d4+d6"],[10,"2d6"],
        [12.5,"d6+d8"],[15,"2d8"],[17.5,"d8+d10"],[20,"2d10"],[22.5,"d10+d12"],[25,"2d12"],[27.5,"3d8"],
        [30,"2d8+d10"],[32.5,"d8+2d10"],[35,"3d10"],[37.5,"2d10+d12"],[40,"d10+2d12"],[42.5,"3d12"],
        [45,"3d12+1"],[47.5,"3d12+2"],[50,"4d10"]]
    },

    // CONFIRMED. CRITICAL: a Force Field is NOT a big point buffer. It is PER-HIT protection
    // (reduction, by type, MAX 12/type at 50 CP) PLUS a total deflection capacity. The GW
    // "energy screen 400 pts" is a GW value, not MP -- MP FFs are small per-hit walls.
    // Per hit: reduce damage by the type's protection value; a hit fully <= protection is
    //   "completely blocked" and does NOT count toward the deflected total.
    // Capacity: Personal FF drops when cumulative deflected damage exceeds the character's
    //   remaining POWER (for a vehicle, use vehicle Power). Gear/Integral FF drops at
    //   total-protection x 1.5 instead. Re-activate: an action + PR 16. No protection vs Gravity;
    //   blocks Gas entirely. Order: FF first, THEN Armor, THEN Invuln/Absorption.
    ForceField: {
      type: "Voluntary", activatePR: 16,
      perHitProtection: "by type from table; tracked as a vehprotection row (vprot_*)",
      capacity: "Personal: > remaining Power -> drops. Gear/Integral: total protection x 1.5.",
      // CP -> [Kinetic, Energy, Bio, Entropy] per-hit protection
      table: [[2.5,[3,3,2,2]],[5,[3,3,3,3]],[7.5,[4,4,3,3]],[10,[4,4,4,4]],[12.5,[5,5,4,4]],
        [15,[5,5,5,5]],[17.5,[6,6,5,5]],[20,[6,6,6,6]],[22.5,[7,7,6,6]],[25,[7,7,7,7]],
        [27.5,[8,8,7,7]],[30,[8,8,8,8]],[32.5,[9,9,8,8]],[35,[9,9,9,9]],[37.5,[10,10,9,9]],
        [40,[10,10,10,10]],[42.5,[11,11,10,10]],[45,[11,11,11,11]],[47.5,[12,12,11,11]],[50,[12,12,12,12]]]
    },

    // CONFIRMED. Area effect centered on self, moves with self. Activate = 1" movement; PR 1/round
    // to maintain. Deals 1 pt/round of a specified physical type. Immune to own. NOTE: this is
    // area DAMAGE, not a robotics-disable -- a GW EMP "shut down robots" effect is Negation/Power
    // Nullification, NOT this. Sensory environment changes -> use Darkness Control instead.
    ChangeEnvironment: {
      type: "Voluntary", pr: 1, activate: "1\" movement", area: "centered on self, moves with self",
      // CP -> diameter (inches)
      table: [[2.5,5],[5,7],[7.5,9],[10,11],[12.5,15],[15,19],[17.5,23],[20,27],[22.5,33],[25,39],
        [27.5,45],[30,51],[32.5,59],[35,67],[37.5,75],[40,83]],
      modifiers: "Harmless -2.5 (no dmg, still triggers Enh/Restr/Weakness); More Damage +1/round per +2.5; Vacuum +10 (Other: Vacuum); High Pressure +10 (Other); Chlorine Gas +12.5 (Other, saves); Phosphene Gas +15 (1 Other:Phosphene + 1 Bio contact, saves; More Damage +5 per +1/+1 here); Hard Radiation +2.5 (5 pts Devitalization Entropy instead of 1, may need medical care)"
    },

    // CONFIRMED. +2 Power per CP. Continual.
    Energy: { type: "Continual", pr: 0, effect: "+2 Power per CP" },

    // CONFIRMED. Continual, PR 0. CP -> [hitBonus, defBonus, taskBonus].
    ExperienceLevels: {
      type: "Continual", pr: 0,
      table: [[5,[0,1,1]],[10,[1,1,1]],[15,[1,2,2]],[20,[2,2,2]],[25,[2,3,3]],[30,[3,3,3]],
        [35,[3,4,4]],[40,[4,4,4]],[45,[4,5,5]],[50,[5,5,5]],[55,[5,6,6]],[60,[6,6,6]],
        [65,[6,7,7]],[70,[7,7,7]],[75,[7,8,8]],[80,[8,8,8]],[85,[8,9,9]],[90,[9,9,9]],[95,[9,10,10]]]
    },

    // CONFIRMED. Flame Blast: standard Energy attack, range ST+EN", PR 2/use, Counterblast-capable.
    FlameBlast: {
      type: "Voluntary", damageType: "Energy", pr: 2, range: "ST+EN inches", counterblast: true,
      table: [[-10,"1"],[-7.5,"d2"],[-5,"d3"],[-2.5,"d4"],[0,"d6"],[2.5,"d6+1"],[5,"2d4"],[7.5,"d4+d6"],
        [10,"2d6"],[12.5,"d6+d8"],[15,"2d8"],[17.5,"d8+d10"],[20,"2d10"],[22.5,"d10+d12"],[25,"2d12"],
        [27.5,"3d8"],[30,"2d8+d10"],[32.5,"d8+2d10"],[35,"3d10"],[37.5,"2d10+d12"],[40,"d10+2d12"],
        [42.5,"3d12"],[45,"3d12+1"],[47.5,"3d12+2"],[50,"4d10"]]
    },

    // CONFIRMED. Flame Aura: Energy Ability Field. Action to activate (no time to deactivate),
    // PR 1/use (defense, attack, or one round of passive dmg). Fiery Flight: take Flight, -5 if
    // flight only works while the Aura is active.
    FlameAura: {
      type: "Voluntary", damageType: "Energy", pr: 1, abilityField: true,
      table: [[-10,"d2"],[-5,"d3"],[0,"d4"],[5,"d6"],[10,"d6+1"],[15,"d8+1"],[20,"d10+1"],[25,"2d6"],
        [30,"d6+d8"],[35,"2d8"],[40,"d8+d10"],[45,"2d10"],[50,"d10+d12"]]
    },

    // CONFIRMED. 1/4 damage (round down) from chosen types, applied AFTER Armor/normal protection.
    // +8 vs save-attacks (e.g. Mind Control). PR 0. Invuln-to-Disintegration is the ONLY thing that
    // stops Disintegration (see abilities.Disintegration / combat.protection).
    Invulnerability: {
      type: "Continual", pr: 0,
      effect: "take 1/4 damage (round down) of chosen types; applied after Armor; +8 vs save-attacks",
      cost: "specific form 5 / sub-type 10 / full type 20 (assign CPs across any combination)",
      note: "'Other' forms (Disintegration, Gas, Gravity, Healing, Transmutation, ...) each count as a sub-type"
    },

    // CONFIRMED. Continual, PR 0. Takes 1 turn and the character must REST that turn. Must specify
    // one damage form healed only at the normal rate (fire, silver, wooden stakes, ...).
    Regeneration: {
      type: "Continual", pr: 0, time: "1 turn; must rest that turn",
      mustSpecify: "one damage form healed only at normal rate",
      // CP -> heal rate
      table: [[0,"1 per 3 hours"],[2.5,"1 per hour"],[5,"1 per 30 min"],[7.5,"1 per 5 min"],
        [10,"1 per 3 min"],[12.5,"1 per 3 rounds"],[15,"1 per 2 rounds"],[17.5,"1 per round"],
        [20,"2 per round"],[22.5,"3 per round"],[25,"4 per round"],[27.5,"5 per round"],
        [30,"6 per round"],[32.5,"7 per round"],[35,"8 per round"],[37.5,"9 per round"],
        [40,"10 per round"],[42.5,"11 per round"],[45,"12 per round"],[47.5,"13 per round"],[50,"14 per round"]],
      modifiers: "Limited -2.5 (can't regen a sub-type) / -5 (can't regen a full type); Unlimited +5 (regen any damage); Constant +10 (heals without resting); Heal From Death +5 (or +10 if no permanent-slay method; heal Overkill first); Power Regeneration +0 (regen Power instead, double rate)"
    },

    // CONFIRMED. Reduces an effect's remaining Duration AND raises its save difficulty, by a chosen
    // damage type. Action, PR 1, range EN", 1/2" area. Once per phase per target effect; roll to hit
    // vs resistant/ranged targets. THIS is the GW "EMP / energy-damping field" model, not ChangeEnvironment.
    Negation: {
      type: "Voluntary", pr: 1, range: "EN inches", area: "1/2\"",
      // CP -> [time reduction, save bonus]
      table: [[2.5,["1 Phase",1]],[5,["1 Round",1]],[7.5,["2 Rounds",2]],[10,["3 Rounds",2]],
        [12.5,["1 Minute",3]],[15,["5 Minutes",3]],[17.5,["20 Minutes",4]],[20,["1 Hour",4]],
        [22.5,["3 Hours",5]],[25,["10 Hours",5]],[27.5,["1.5 Days",6]],[30,["3.5 Days",6]],
        [32.5,["1.5 Weeks",7]],[35,["1 Month",7]],[37.5,["3 Months",8]],[40,["1 Year",8]],
        [42.5,["3 Years",9]],[45,["10 Years",9]],[47.5,["33 Years",10]],[50,["100 Years",10]]],
      modifiers: "Limited Damage Type -5 (sub-type only) / -10 (specific form only); Additional Damage Types +10 per full type, +5 per sub-type, +2.5 per specific form"
    },

    // CONFIRMED. Light Control A. Standard Energy attack, range AGx2", PR 1/use. Can't Counterblast,
    // no Knockback. Called-shot dazzle at -6 to hit (no dmg, ignores protection except goggles): EN save.
    Laser: {
      type: "Voluntary", damageType: "Energy", pr: 1, range: "AGx2 inches", counterblast: false,
      // CP -> [damage, dazzle EN save]
      table: [[-5,["d3",-1]],[-2.5,["d4",-2]],[0,["d6",-3]],[2.5,["d6+1",-4]],[5,["d8+1",-5]],
        [7.5,["d10+1",-6]],[10,["2d6",-7]],[12.5,["d6+d8",-8]],[15,["2d8",-9]],[17.5,["d8+d10",-10]],
        [20,["2d10",-11]],[22.5,["d10+d12",-12]],[25,["2d12",-13]],[27.5,["3d8",-14]],[30,["2d8+d10",-15]],
        [32.5,["d8+2d10",-16]],[35,["3d10",-17]],[37.5,["2d10+d12",-18]],[40,["d10+2d12",-19]],
        [42.5,["3d12",-20]],[45,["3d12+1",-21]],[47.5,["3d12+2",-22]],[50,["4d10",-23]]]
    },

    // CONFIRMED. Lightning Control A. Standard Energy attack, range ENx2", PR 4/shot. +2 dmg vs
    // electrical/electronic targets. Counterblast-capable vs Energy.
    ElectricalBolt: {
      type: "Voluntary", damageType: "Energy", pr: 4, range: "ENx2 inches", counterblast: true,
      vsElectronics: "+2 damage",
      table: [[-5,"d6"],[-2.5,"d6+1"],[0,"d8+1"],[2.5,"d10+1"],[5,"2d6"],[7.5,"d6+d8"],[10,"2d8"],
        [12.5,"d8+d10"],[15,"2d10"],[17.5,"d10+d12"],[20,"2d12"],[22.5,"3d8"],[25,"2d8+d10"],
        [27.5,"d8+2d10"],[30,"3d10"],[32.5,"2d10+d12"],[35,"d10+2d12"],[37.5,"3d12"],[40,"3d12+1"],
        [42.5,"3d12+2"],[45,"4d10"],[47.5,"3d10+d12"],[50,"2d10+2d12"]]
    },

    // CONFIRMED. Lightning Control C. Physical Energy SAVE attack, to-hit = IN save +3, range ENx2",
    // PR 4/use. Target saves on its Gear BC (+ its Energy protection - this save modifier).
    GearControl: {
      type: "Voluntary", damageType: "Energy", pr: 4, range: "ENx2 inches", toHit: "IN save +3",
      // CP -> save modifier
      table: [[-5,1],[-2.5,0],[0,-1],[2.5,-2],[5,-3],[7.5,-4],[10,-5],[12.5,-6],[15,-7],[17.5,-8],
        [20,-9],[22.5,-10],[25,-11],[27.5,-12],[30,-13],[32.5,-14],[35,-15],[37.5,-16],[40,-17],
        [42.5,-18],[45,-19],[47.5,-20],[50,-21]],
      modifiers: "Silent +5 (no communication needed); Single Command -10 (one command only, no comms)"
    },

    // CONFIRMED. Entropy SAVE attack, range ENx2", PR 3/shot. EN save (+ target Entropy protection);
    // recover-save each turn at -12. The GW stun-weapon model.
    ParalysisRay: {
      type: "Voluntary", damageType: "Entropy", pr: 3, range: "ENx2 inches", save: "EN",
      // CP -> save modifier
      table: [[-5,6],[-2.5,5],[0,4],[2.5,3],[5,2],[7.5,1],[10,0],[12.5,-1],[15,-2],[17.5,-3],[20,-4],
        [22.5,-5],[25,-6],[27.5,-7],[30,-8],[32.5,-9],[35,-10],[37.5,-11],[40,-12],[42.5,-13],[45,-14],
        [47.5,-15],[50,-16]],
      modifiers: "Frozen +0 (rigid, SR 3 to bend; excess dmg to Hits); Stasis +10 (immune to all outside forces, no comms); Unconscious +5; Can Speak -5 (not with Unconscious)"
    }
  },

  // Combat / ability modifiers (cost adjustments). CONFIRMED.
  modifiers: {
    autofire:      "attack fires N times per use, NO multi-attack penalty; targets must be adjacent; roll + pay PR/Charge each. RoF 2=+7.5, 3=+15, 4=+22.5, 5=+30, 6=+37.5, 7=+45. (This is the real 'battery' mechanic.)",
    areaEffect:    "affects all targets in a diameter (table: .5\"/single,1,3,5,7,9,11,15,19,23,27,33,39,45,51,59,67,75,83,93\"). +2.5/-2.5 per step. Variants: Adjustable +5, MovesWithSelf +5, Tendrils +5, Shapes +7.5, Offset +2.5, Perimeter (halve adj), Selective +12.5, Vaporous +0.",
    armorPiercing: "ignore N protection (min 0). CP->ignored: 2.5=2,5=3,7.5=5,10=6,12.5=8,15=9,17.5=11,20=12,22.5=14,25=15,27.5=17,30=18,32.5=20,35=21,37.5=23,40=24,42.5=26,45=27,47.5=29,50=30. AP also negates Invuln on the pierced points: apply to Armor first, then leftover AP to Invuln.",
    multiAbility:  "set of abilities mutually exclusive: only 1 active/turn = -10 each; max-2-of-3+ = -5 each; max-3-of-4+ = -2.5 each. Total set cost must exceed the largest member's pre-adjustment cost.",
    chargesPR:     "PR<->Charges swap (no adj): PR0=unlimited,1=24,2=12,3=8,4=6,5=4,8=3,12=2,16=1+50%,24=1. Reduce charges -2.5/step; increase +2.5/step. Field reload: 3rds +5, 1 turn +7.5, 1 action +10.",
    range:         "ladder (long->short): Line of Sight / Voice / BCx16\" / BCx8\" / BCx4\" / BCx2\"(=BC+BC) / BCx1\"(=(BC+BC)/2) / BC/2\" / BC/4\" / 1\" / Touch-Melee. +2.5 up a step (longer), -2.5 down. 1\" ranged stays ranged (no Ability-Field exposure); Melee makes it a melee attack (no unarmed-combine unless Carried/Contact Attack).",
    activationRequired: "Continual->Persistent -5 (1\" to activate, can't rest while active); Persistent->Voluntary -5 (shuts off if KO'd); Continual->Voluntary -10.",
    duration:      "How long an effect lasts per use. Ladder (short->long): 1 Round/Instant, 2 Rounds, 3 Rounds, 1 Minute, 5 Minutes, 20 Minutes, 1 Hour, 3 Hours, 10 Hours, 1.5 Days, 3.5 Days, 1.5 Weeks, 1 Month, 3 Months, 1 Year, 3 Years, 10 Years, 33 Years, 100 Years ... up to 1,000,000 Years. +2.5 per step longer, -2.5 shorter. Attack effects repeat each Phase 0 until expiry (save attacks: interval between recovery saves; first save still immediate). No Escape +15 (offensive, no early escape). Extended Effect -5/step if it fires only every Nth interval. Permanent (>=100 yr) no extra cost. Focused +0 (flat avg damage instead of a roll).",
    gear:          "-5 (tech/magic device): can't Push, can be damaged/disarmed/taken. Uses Gear BC (GBC = floor(TotalCP/15)+6; generic gear GBC 12) for BC-derived traits. BC Channeling +2.5 (use owner's BCs). Augmentation: partial-from-gear, -1 Break/Take/Disarm, no own BC. Multi-Function -2.5 each (a break disables one random ability; +2.5 instead for abilities Gear-by-default). Two-Handed -2.5. Gear typically uses Charges, not PR.",
    hardened:      "Protection resists Armor Piercing/penetration: each point of Hardened negates 1 point of protection-reduction. +2.5 per 3 points.",
    immunity:      "+2.5: ignore the negative effects of one's own Ability (see through own Darkness, counter Reflection, use own Area Effect at close range without self-hit).",
    indirect:      "Attack originates elsewhere than the character. Away-only: +5 (any relative origin) / +2.5 (fixed relative origin). Any-direction: +12.5 (any relative origin) / +5 (fixed relative origin). Effective range = char->origin + origin->target.",
    reducedAtRange:"-2.5: attack takes a damage penalty = floor(range-to-target / 4) when used at range.",
    requiresSave:  "-5 if a BC save at +6 is needed each use; -2.5 if only to initially activate (specify which of the 5 BCs). Easier Save +2.5 (+3 to the save); Harder Save -2.5 (-3 to the save)."
  },

  // 4.0 MP Combat — CONFIRMED
  combat: {
    toHit: "task check on AG (physical) or IN (mental); +3 to all your own attacks; SUBTRACT target's Defense; apply range/cover/etc.",
    defenses: "Physical Def = AG save - 10; Mental Def = IN save - 10. Immobile/unaware targets apply no Defense (and attacker +3 mobile-unaware / +6 fully immobile)",
    protection: "subtract Armor (by damage type) from each hit. ORDER: Force Field first, then Armor, then Invulnerability/Absorption/Adaptation (which DIVIDE remaining). Protection is cumulative.",
    rollWithDamage: "if conscious & aware, divert up to floor(currentPower/10) of a hit to Power instead of Hits. VEHICLES CANNOT roll with damage.",
    incapacitation: "taking > half of CURRENT remaining Hits in one hit -> unconscious (objects/vehicles/systems -> cease functioning). 0 Hits -> incapacitated (vehicle/system -> DEMOLISHED). This 'disable on half' rule means big alpha strikes matter; toughness is not a pure Hits sponge.",
    damageTypes: ["Kinetic","Energy","Biochemical","Entropy","Psychic","Other"],
    knockback: "1\" per point = (Hits dealt + Power overflow) - Mass roll. Sharp Kinetic doesn't knock back.",
    stances: "Defensive: -3 hit / +3 Def. Full Defense: +6 Def, half Move (costs an action).",
    saveAttacks: "force a save vs a stated BC at a CP-based difficulty; protection subtracts from the save difficulty; roll-with adds to save number",
    criticals: "nat-roll crit/fumble d20 table (4.7.6): solid hit +3 dmg, called-shot results, avoid armor, off-balance, etc.",
    pushing: "spend 2 Power: x2 move, +2 damage, -2 save TN, +2 Base HTH & x2 carry. Vehicles/unliving robots CAN push."
  },

  // 5.1 Structural Rating — CONFIRMED. SR subtracts from damage to objects (like armor). Default vehicle SR = 3.
  structuralRating: {
    materials: { flesh:0, water:0, cloth:1, leather:1, earth:1, wood_soft:2, electronics:2, rubber:2,
      ice:3, wood_hard:3, plastic:3, glass:4, bone:4, brick:5, concrete:6, granite:6, machinery:7,
      gold:7, marble:7, aluminum:8, lead:8, ballistic_cloth:8, silver:9, bronze:9, iron:10, platinum:10,
      steel:11, bulletproof_glass:11, tungsten:12, titanium:13, super_alloy:15, diamond:18, adamantium:20 },
    note: "penetration: damage - SR = Hits through; hole-size table maps Hits->width/depth. GM may +/-3 for build quality. 'duralloy fortress' ~ super_alloy(15)/titanium(13)."
  },

  // VEHICLE ability (2.2.x) — CONFIRMED. Toughness lives here for war machines, not character Hits.
  vehicle: {
    // [CP, systemSpaces, weight_lbs, mass, profile, ST, EN, hits]
    sizeTable: [
      [0,2,360,"d6",1.41,15,15,13], [5,4,720,"d6+1",2,18,18,16], [10,8,1440,"d8+1",2.83,21,21,20],
      [12.5,12,2160,"d10+1",3.415,22,23,23], [15,16,2880,"d10+1",4,24,24,25], [17.5,24,4320,"2d6",4.83,25,26,27],
      [20,32,5760,"2d6",5.66,27,27,29], [22.5,48,8640,"d6+d8",6.83,28,29,31], [25,64,11520,"d6+d8",8,30,30,33],
      [27.5,96,17280,"2d8",9.655,31,32,36], [30,128,23040,"2d8",11.31,33,33,38], [32.5,192,34560,"d8+d10",13.655,34,35,40],
      [35,256,46080,"d8+d10",16,36,36,41], [37.5,384,69120,"2d10",19.315,37,38,44], [40,512,92160,"2d10",22.63,39,39,46],
      [42.5,768,138240,"d10+d12",27.315,40,41,48], [45,1024,184320,"d10+d12",32,42,42,50], [50,2048,368640,"2d12",45.25,45,45,54]
    ],
    bcs: "default AG 9, IN 0, CL 9 (ST/EN from size table). Automation +1 AG/CP, Performance +1 CL/CP, Robot Brain +1 IN/CP. BCs may not exceed owner's BC cap.",
    spaceScale: "4 system spaces per 5' movement-space (a 5'x5' floor tile). Footprint area / 25 sqft = movement spaces; x4 = system spaces.",
    defense: "robotically-controlled Vehicle Defense = AG save - 10 (ignores Handling). Crewed adds pilot AG save -10 + Handling.",
    armor: "default Structural Rating 3. Additional Vehicle Armor bought as an Integral System (Integral halves the CP the spaces generate, and can't be targeted).",
    hits: "from size table; each System also has its own Hits. >half a thing's remaining Hits in one hit disables it; 0 = demolished.",
    systemModifiers: "Bulky: +4.3 Hits per +2.5 CP (rounded up). Integral: halve generated CP, not targetable. Independent Power Supply, Gear, Open System (1/4 spaces), etc.",
    explosion: "Central Power System destroyed or Vehicle Hits < 0 -> Energy d8 + 1d8 per 5 CP of vehicle cost, diameter = profile rounded up to odd. 'Won't Explode' +5 CP.",
    robotBrain: "makes the vehicle a true independent robot (no control seat needed); each CP of Robot Brain = +1 IN."
  },

  // 1e GAMMA WORLD combat — CONFIRMED (for time-to-defeat calibration). GW armor = AC (to-hit only), NO damage reduction.
  gw: {
    note: "lower AC = better (10 worst .. 1 best). d20 attack: roll >= matrix number to hit. Damage NOT reduced by AC.",
    // Physical Attack Matrix II — monster/mutation (no weapon) by Hit Dice vs target AC. [AC] -> {hdBand: toHit}
    attackMatrixII_byHD: { // columns: HD 1, 2-3, 4-5, 6-8, 9-10, 11-14, 15+
      1:[20,19,18,17,16,15,14], 2:[19,18,17,16,15,14,13], 3:[18,17,16,15,14,13,12], 4:[17,16,15,14,13,12,11],
      5:[16,15,14,13,12,11,10], 6:[14,13,12,11,10,9,8], 7:[13,12,11,10,9,8,7], 8:[12,11,10,9,8,7,6],
      9:[11,10,9,8,7,6,5], 10:[10,9,8,7,6,5,4] },
    hdBands: ["1","2-3","4-5","6-8","9-10","11-14","15+"],
    armorClassTable: { 10:"none",9:"shield only",8:"furs/skins",7:"furs+shield",6:"hide/fiber, partial carapace",
      5:"hide/fiber+shield",4:"sheath/piece metal, total carapace",3:"powered plate/plastic",2:"powered alloy/energized/inertia/scout/battle",1:"powered attack/assault" },
    weaponClass: { club_etc:1, axe_dagger:2, polearm_sword:3, vibrodagger:4, vibroblade:5, stunwhip:6,
      robotic_tentacle:7, grenade_javelin:8, arrow_bolt:9, pistol_slug:10, needler:11, stun_ray:12,
      laser:13, mkV_blaster_mkVII:14, black_ray:15, fusion_missile:16 },
    weaponDamage: { // common; energy weapons listed separately
      arrow:"1d6", battle_axe:"1d8", club:"1d6", crossbow:"1d6", dagger:"1d4", spear:"1d6",
      long_sword:"1d8", short_sword:"1d6", two_handed_sword:"1d10",
      laser_pistol:"5d6", mkV_blaster:"~30", fusion_rifle:"5d10 (bomb)" },
    roboticUnitMove: "GW robot speed in kph x 2.8 = meters per 10s melee turn (e.g. 30 kph = 84 m/turn)",
    morale: "non-intelligent flee on <half HP unless cornered/lair; d10 morale check.",
    mentalMatrix: "Mental Strength attacker vs defender; roll >= number; 'A'=auto, 'NE'=no effect."
  },

  // ---- GAPS still to fill ----
  TODO: [
    // RESOLVED: full BC table (carry + save + heal columns) now captured. See bcTable.
    // RESOLVED: Force Field is per-hit protection (<=12/type) + capacity (Personal: Power; Gear: prot x1.5). See abilities.ForceField.
    "A representative MP party's per-round damage output, to finalize time-to-defeat tuning",
    "Vehicle spawn path: build into the vehicle sheet (engine currently only builds characters)"
  ]
};

if (typeof module !== "undefined" && module.exports) module.exports = MP_RULES;

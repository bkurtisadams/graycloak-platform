// mp-data.js v2.6.0 — Separate PR/Charges builders, TIME_REQ scale, extended PR scale to PR 192

const MP = {};

// ---- Chassis Table ----
MP.CHASSIS = [
  {cp:0,    sp:2,      wt:"360 lbs",          mass:"d6",       prof:1.41,   st:15,en:15,hits:13},
  {cp:2.5,  sp:3,      wt:"540 lbs",          mass:"d6+1",     prof:1.705,  st:16,en:17,hits:15},
  {cp:5,    sp:4,      wt:"720 lbs",          mass:"d6+1",     prof:2,      st:18,en:18,hits:16},
  {cp:7.5,  sp:6,      wt:"1,080 lbs",        mass:"d8+1",     prof:2.415,  st:19,en:20,hits:18},
  {cp:10,   sp:8,      wt:"1,440 lbs",        mass:"d8+1",     prof:2.83,   st:21,en:21,hits:20},
  {cp:12.5, sp:12,     wt:"2,160 lbs",        mass:"d10+1",    prof:3.415,  st:22,en:23,hits:23},
  {cp:15,   sp:16,     wt:"2,880 lbs",        mass:"d10+1",    prof:4,      st:24,en:24,hits:25},
  {cp:17.5, sp:24,     wt:"4,320 lbs",        mass:"2d6",      prof:4.83,   st:25,en:26,hits:27},
  {cp:20,   sp:32,     wt:"5,760 lbs",        mass:"2d6",      prof:5.66,   st:27,en:27,hits:29},
  {cp:22.5, sp:48,     wt:"8,640 lbs",        mass:"d6+d8",    prof:6.83,   st:28,en:29,hits:31},
  {cp:25,   sp:64,     wt:"11,520 lbs",       mass:"d6+d8",    prof:8,      st:30,en:30,hits:33},
  {cp:27.5, sp:96,     wt:"17,280 lbs",       mass:"2d8",      prof:9.655,  st:31,en:32,hits:36},
  {cp:30,   sp:128,    wt:"23,040 lbs",       mass:"2d8",      prof:11.31,  st:33,en:33,hits:38},
  {cp:32.5, sp:192,    wt:"34,560 lbs",       mass:"d8+d10",   prof:13.655, st:34,en:35,hits:40},
  {cp:35,   sp:256,    wt:"46,080 lbs",       mass:"d8+d10",   prof:16,     st:36,en:36,hits:41},
  {cp:37.5, sp:384,    wt:"69,120 lbs",       mass:"2d10",     prof:19.315, st:37,en:38,hits:44},
  {cp:40,   sp:512,    wt:"92,160 lbs",       mass:"2d10",     prof:22.63,  st:39,en:39,hits:46},
  {cp:42.5, sp:768,    wt:"138,240 lbs",      mass:"d10+d12",  prof:27.315, st:40,en:41,hits:48},
  {cp:45,   sp:1024,   wt:"184,320 lbs",      mass:"d10+d12",  prof:32,     st:42,en:42,hits:50},
  {cp:47.5, sp:1536,   wt:"276,480 lbs",      mass:"2d12",     prof:38.625, st:43,en:44,hits:52},
  {cp:50,   sp:2048,   wt:"368,640 lbs",      mass:"2d12",     prof:45.25,  st:45,en:45,hits:54},
  {cp:52.5, sp:3072,   wt:"552,960 lbs",      mass:"3d8",      prof:54.625, st:46,en:47,hits:57},
  {cp:55,   sp:4096,   wt:"737,280 lbs",      mass:"3d8",      prof:64,     st:48,en:48,hits:59},
  {cp:57.5, sp:6144,   wt:"1,105,920 lbs",    mass:"2d8+d10",  prof:77.255, st:49,en:50,hits:61},
  {cp:60,   sp:8192,   wt:"1,474,560 lbs",    mass:"2d8+d10",  prof:90.51,  st:51,en:51,hits:63},
  {cp:62.5, sp:12288,  wt:"2,211,840 lbs",    mass:"d8+2d10",  prof:109.255,st:52,en:53,hits:65},
  {cp:65,   sp:16384,  wt:"2,949,120 lbs",    mass:"d8+2d10",  prof:128,    st:54,en:54,hits:66},
  {cp:67.5, sp:24576,  wt:"4,423,680 lbs",    mass:"3d10",     prof:154.51, st:55,en:56,hits:69},
  {cp:70,   sp:32768,  wt:"5,898,240 lbs",    mass:"3d10",     prof:181.02, st:57,en:57,hits:71},
  {cp:72.5, sp:49152,  wt:"8,847,360 lbs",    mass:"2d10+d12", prof:218.51, st:58,en:59,hits:73},
  {cp:75,   sp:65536,  wt:"11,796,480 lbs",   mass:"2d10+d12", prof:256,    st:60,en:60,hits:75},
  {cp:77.5, sp:98304,  wt:"17,694,720 lbs",   mass:"d10+2d12", prof:309.017,st:61,en:62,hits:77},
  {cp:80,   sp:131072, wt:"23,592,960 lbs",   mass:"d10+2d12", prof:362.034,st:63,en:63,hits:79},
  {cp:82.5, sp:196608, wt:"35,389,440 lbs",   mass:"3d12",     prof:437.017,st:64,en:65,hits:82},
  {cp:85,   sp:262144, wt:"47,185,920 lbs",   mass:"3d12",     prof:512,    st:66,en:66,hits:84},
  {cp:87.5, sp:393216, wt:"70,778,880 lbs",   mass:"3d12+1",   prof:618.04, st:67,en:68,hits:86},
  {cp:90,   sp:524288, wt:"94,371,840 lbs",   mass:"3d12+1",   prof:724.08, st:69,en:69,hits:88},
  {cp:92.5, sp:786432, wt:"141,557,760 lbs",  mass:"3d12+2",   prof:874.04, st:70,en:71,hits:90},
  {cp:95,   sp:1048576,wt:"188,743,680 lbs",  mass:"3d12+2",   prof:1024,   st:72,en:72,hits:91},
  {cp:97.5, sp:1572864,wt:"283,115,520 lbs",  mass:"4d10",     prof:1236.075,st:73,en:74,hits:94},
  {cp:100,  sp:2097152,wt:"377,487,360 lbs",  mass:"4d10",     prof:1448.15,st:75,en:75,hits:96},
  {cp:102.5,sp:3145728,wt:"566,231,040 lbs",  mass:"3d10+d12", prof:1748.075,st:76,en:77,hits:98},
  {cp:105,  sp:4194304,wt:"754,974,720 lbs",  mass:"3d10+d12", prof:2048,   st:78,en:78,hits:100},
  {cp:107.5,sp:6291456,wt:"1,132,462,080 lbs",mass:"2d10+2d12",prof:2472.155,st:79,en:80,hits:103},
  {cp:110,  sp:8388608,wt:"1,509,949,440 lbs",mass:"2d10+2d12",prof:2896.31,st:81,en:81,hits:105},
  {cp:112.5,sp:12582912,wt:"2,264,924,160 lbs",mass:"d10+3d12",prof:3496.155,st:82,en:83,hits:107},
  {cp:115,  sp:16777216,wt:"3,019,898,880 lbs",mass:"d10+3d12",prof:4096,   st:84,en:84,hits:109},
  {cp:117.5,sp:25165824,wt:"4,529,848,320 lbs",mass:"4d12",    prof:4944.31,st:85,en:86,hits:111},
  {cp:120,  sp:33554432,wt:"6,039,797,760 lbs",mass:"4d12",    prof:5792.62,st:87,en:87,hits:112},
  {cp:122.5,sp:50331648,wt:"9,059,696,640 lbs",mass:"4d12+1",  prof:6992.31,st:88,en:89,hits:115},
  {cp:125,  sp:67108864,wt:"12,079,595,520 lbs",mass:"4d12+1", prof:8192,   st:90,en:90,hits:117},
  {cp:127.5,sp:100663296,wt:"18,119,393,280 lbs",mass:"5d10",  prof:9888.62,st:91,en:92,hits:119},
  {cp:130,  sp:134217728,wt:"24,159,191,040 lbs",mass:"5d10",  prof:11585.24,st:93,en:93,hits:121},
  {cp:132.5,sp:201326592,wt:"36,238,786,560 lbs",mass:"4d10+d12",prof:14188.96,st:94,en:95,hits:123},
  {cp:135,  sp:268435456,wt:"48,318,382,080 lbs",mass:"4d10+d12",prof:16384, st:96,en:96,hits:125},
  {cp:137.5,sp:402653184,wt:"72,477,573,120 lbs",mass:"3d10+2d12",prof:20066.22,st:97,en:98,hits:127},
  {cp:140,  sp:536870912,wt:"96,636,764,160 lbs",mass:"3d10+2d12",prof:23170.475,st:99,en:99,hits:129},
];

// Lookup chassis row by CP value (find highest CP <= given value)
MP.lookupChassis = function(cp) {
  for (let i = MP.CHASSIS.length - 1; i >= 0; i--) {
    if (MP.CHASSIS[i].cp <= cp) return MP.CHASSIS[i];
  }
  return MP.CHASSIS[0];
};

// ---- System Spaces → CPs/Hits/Profile (full table from rules) ----
MP.SYS_TABLE = [
  {sp:1,      prof:1,       hits:8,  cp:5},
  {sp:2,      prof:1.41,    hits:13, cp:10},
  {sp:3,      prof:1.705,   hits:15, cp:12.5},
  {sp:4,      prof:2,       hits:16, cp:15},
  {sp:6,      prof:2.415,   hits:18, cp:17.5},
  {sp:8,      prof:2.83,    hits:20, cp:20},
  {sp:12,     prof:3.415,   hits:23, cp:22.5},
  {sp:16,     prof:4,       hits:25, cp:25},
  {sp:24,     prof:4.83,    hits:27, cp:27.5},
  {sp:32,     prof:5.66,    hits:29, cp:30},
  {sp:48,     prof:6.83,    hits:31, cp:32.5},
  {sp:64,     prof:8,       hits:33, cp:35},
  {sp:96,     prof:9.655,   hits:36, cp:37.5},
  {sp:128,    prof:11.31,   hits:38, cp:40},
  {sp:192,    prof:13.655,  hits:40, cp:42.5},
  {sp:256,    prof:16,      hits:41, cp:45},
  {sp:384,    prof:19.315,  hits:44, cp:47.5},
  {sp:512,    prof:22.63,   hits:46, cp:50},
  {sp:768,    prof:27.315,  hits:48, cp:52.5},
  {sp:1024,   prof:32,      hits:50, cp:55},
  {sp:1536,   prof:38.625,  hits:52, cp:57.5},
  {sp:2048,   prof:45.25,   hits:54, cp:60},
  {sp:3072,   prof:54.625,  hits:57, cp:62.5},
  {sp:4096,   prof:64,      hits:59, cp:65},
  {sp:6144,   prof:77.255,  hits:61, cp:67.5},
  {sp:8192,   prof:90.51,   hits:63, cp:70},
  {sp:12288,  prof:109.255, hits:65, cp:72.5},
  {sp:16384,  prof:128,     hits:66, cp:75},
  {sp:24576,  prof:154.51,  hits:69, cp:77.5},
  {sp:32768,  prof:181.02,  hits:71, cp:80},
  {sp:49152,  prof:218.51,  hits:73, cp:82.5},
  {sp:65536,  prof:256,     hits:75, cp:85},
  {sp:98304,  prof:309.017, hits:77, cp:87.5},
  {sp:131072, prof:362.034, hits:79, cp:90},
  {sp:196608, prof:437.017, hits:82, cp:92.5},
  {sp:262144, prof:512,     hits:84, cp:95},
  {sp:393216, prof:618.04,  hits:86, cp:97.5},
  {sp:524288, prof:724.08,  hits:88, cp:100},
];

MP.VALID_SPACES = MP.SYS_TABLE.map(s => s.sp);

MP.lookupSys = function(spaces) {
  for (let i = MP.SYS_TABLE.length - 1; i >= 0; i--) {
    if (MP.SYS_TABLE[i].sp <= spaces) return MP.SYS_TABLE[i];
  }
  return MP.SYS_TABLE[0];
};

// Reverse lookup: find smallest system that generates >= targetCp
MP.lookupSysByCp = function(targetCp) {
  for (let i = 0; i < MP.SYS_TABLE.length; i++) {
    if (MP.SYS_TABLE[i].cp >= targetCp) return MP.SYS_TABLE[i];
  }
  return MP.SYS_TABLE[MP.SYS_TABLE.length - 1];
};

// ---- Ability Types (from MP rulebook 2.1.15) ----
// cat matches the three rulebook tables plus vehicle-specific and structural
// color = canvas cell color, abbr = 2-char label on canvas
MP.ABILITY_TYPES = [
  // --- Offensive Abilities ---
  { id:"absorption",           cat:"Offensive",  name:"Absorption",           color:"#6060a0", abbr:"Abs" },
  { id:"change-environment",   cat:"Offensive",  name:"Change Environment",   color:"#5a7a60", abbr:"CEn" },
  { id:"chemical-abilities",   cat:"Offensive",  name:"Chemical Abilities",   color:"#508040", abbr:"Chm" },
  { id:"death-touch",          cat:"Offensive",  name:"Death Touch",          color:"#802040", abbr:"DTc" },
  { id:"devitalization-ray",   cat:"Offensive",  name:"Devitalization Ray",   color:"#604880", abbr:"Dev" },
  { id:"disintegration",       cat:"Offensive",  name:"Disintegration",       color:"#b02040", abbr:"Dis" },
  { id:"emotion-control",      cat:"Offensive",  name:"Emotion Control",      color:"#9060a0", abbr:"Emo" },
  { id:"experience-levels",    cat:"Offensive",  name:"Experience Levels",    color:"#707050", abbr:"Exp" },
  { id:"flame-abilities",      cat:"Offensive",  name:"Flame Abilities",      color:"#c06020", abbr:"Flm" },
  { id:"force-field",          cat:"Offensive",  name:"Force Field",          color:"#7060a0", abbr:"FFd" },
  { id:"grapnel",              cat:"Offensive",  name:"Grapnel",              color:"#706050", abbr:"Grp" },
  { id:"gravity-control",      cat:"Offensive",  name:"Gravity Control",      color:"#505080", abbr:"Grv" },
  { id:"heightened-agility",   cat:"Offensive",  name:"Heightened Agility",   color:"#408080", abbr:"HAg" },
  { id:"heightened-attack",    cat:"Offensive",  name:"Heightened Attack",    color:"#a04030", abbr:"HAt" },
  { id:"heightened-expertise", cat:"Offensive",  name:"Heightened Expertise", color:"#806040", abbr:"HEx" },
  { id:"heightened-strength",  cat:"Offensive",  name:"Heightened Strength",  color:"#804030", abbr:"HSt" },
  { id:"ice-abilities",        cat:"Offensive",  name:"Ice Abilities",        color:"#4090b0", abbr:"Ice" },
  { id:"inertia",              cat:"Offensive",  name:"Inertia",              color:"#5a6a90", abbr:"Inr" },
  { id:"light-control",        cat:"Offensive",  name:"Light Control",        color:"#b0a030", abbr:"Lgt" },
  { id:"lightning-control",    cat:"Offensive",  name:"Lightning Control",    color:"#6080c0", abbr:"Ltn" },
  { id:"magnetism",            cat:"Offensive",  name:"Magnetism",            color:"#607090", abbr:"Mag" },
  { id:"mind-control",         cat:"Offensive",  name:"Mind Control",         color:"#8060a0", abbr:"MCt" },
  { id:"natural-weaponry",     cat:"Offensive",  name:"Natural Weaponry",     color:"#706040", abbr:"NWp" },
  { id:"paralysis-ray",        cat:"Offensive",  name:"Paralysis Ray",        color:"#705090", abbr:"Par" },
  { id:"poison-venom",         cat:"Offensive",  name:"Poison/Venom",         color:"#608030", abbr:"Psn" },
  { id:"possession",           cat:"Offensive",  name:"Possession",           color:"#7a5090", abbr:"Pos" },
  { id:"power-blast",          cat:"Offensive",  name:"Power Blast",          color:"#b04040", abbr:"PBl" },
  { id:"reflection",           cat:"Offensive",  name:"Reflection",           color:"#607080", abbr:"Rfl" },
  { id:"repulsion-blast",      cat:"Offensive",  name:"Repulsion Blast",      color:"#5070a0", abbr:"Rep" },
  { id:"shaping",              cat:"Offensive",  name:"Shaping",              color:"#607050", abbr:"Shp" },
  { id:"siphon",               cat:"Offensive",  name:"Siphon",               color:"#804060", abbr:"Sip" },
  { id:"sonic-abilities",      cat:"Offensive",  name:"Sonic Abilities",      color:"#8a4080", abbr:"Son" },
  { id:"special-weapon",       cat:"Offensive",  name:"Special Weapon",       color:"#806050", abbr:"SWp" },
  { id:"telekinesis",          cat:"Offensive",  name:"Telekinesis",          color:"#6060a0", abbr:"TKn" },
  { id:"transmutation",        cat:"Offensive",  name:"Transmutation",        color:"#607060", abbr:"Trm" },
  { id:"unprotection",         cat:"Offensive",  name:"Unprotection",         color:"#8a5050", abbr:"UPr" },
  { id:"vibration-abilities",  cat:"Offensive",  name:"Vibration Abilities",  color:"#708060", abbr:"Vib" },
  { id:"weakness-detection",   cat:"Offensive",  name:"Weakness Detection",   color:"#806060", abbr:"WkD" },
  { id:"weather-control",      cat:"Offensive",  name:"Weather Control",      color:"#507090", abbr:"Wth" },

  // --- Defensive Abilities ---
  { id:"adaptation",           cat:"Defensive",  name:"Adaptation",           color:"#508060", abbr:"Adp" },
  { id:"armor",                cat:"Defensive",  name:"Armor",                color:"#606068", abbr:"Arm" },
  { id:"astral-projection",    cat:"Defensive",  name:"Astral Projection",    color:"#706090", abbr:"Ast" },
  { id:"darkness-control",     cat:"Defensive",  name:"Darkness Control",     color:"#404060", abbr:"Drk" },
  { id:"density-change",       cat:"Defensive",  name:"Density Change",       color:"#606070", abbr:"Den" },
  { id:"durability",           cat:"Defensive",  name:"Durability",           color:"#607058", abbr:"Dur" },
  { id:"heightened-defense",   cat:"Defensive",  name:"Heightened Defense",   color:"#407060", abbr:"HDf" },
  { id:"heightened-endurance", cat:"Defensive",  name:"Heightened Endurance", color:"#406050", abbr:"HEn" },
  { id:"invisibility",         cat:"Defensive",  name:"Invisibility",         color:"#505070", abbr:"Inv" },
  { id:"invulnerability",      cat:"Defensive",  name:"Invulnerability",      color:"#506068", abbr:"Ivl" },
  { id:"life-support",         cat:"Defensive",  name:"Life Support",         color:"#308060", abbr:"LSp" },
  { id:"non-corporealness",    cat:"Defensive",  name:"Non-Corporealness",    color:"#606080", abbr:"NCp" },
  { id:"regeneration",         cat:"Defensive",  name:"Regeneration",         color:"#409050", abbr:"Rgn" },
  { id:"shield",               cat:"Defensive",  name:"Shield",               color:"#506070", abbr:"Shd" },
  { id:"stretching-abilities", cat:"Defensive",  name:"Stretching Abilities", color:"#607058", abbr:"Str" },

  // --- Miscellaneous Abilities ---
  { id:"animal-plant",         cat:"Miscellaneous", name:"Animal/Plant Abilities", color:"#508040", abbr:"AnP" },
  { id:"arsenal",              cat:"Miscellaneous", name:"Arsenal",                color:"#706050", abbr:"Ars" },
  { id:"base",                 cat:"Miscellaneous", name:"Base",                   color:"#505860", abbr:"Bas" },
  { id:"communicators",        cat:"Miscellaneous", name:"Communicators",          color:"#507070", abbr:"Com" },
  { id:"companion",            cat:"Miscellaneous", name:"Companion",              color:"#607050", abbr:"Cmp" },
  { id:"cosmic-awareness",     cat:"Miscellaneous", name:"Cosmic Awareness",       color:"#6050a0", abbr:"Cos" },
  { id:"cybernetics",          cat:"Miscellaneous", name:"Cybernetics",            color:"#606878", abbr:"Cyb" },
  { id:"dimensional-travel",   cat:"Miscellaneous", name:"Dimensional Travel",     color:"#7a40a0", abbr:"Dim" },
  { id:"duplication",          cat:"Miscellaneous", name:"Duplication",            color:"#606070", abbr:"Dup" },
  { id:"energy",               cat:"Miscellaneous", name:"Energy",                 color:"#a08020", abbr:"Nrg" },
  { id:"bridge-travel",        cat:"Movement",      name:"Bridge Travel",          color:"#5a7080", abbr:"Brd" },
  { id:"flight",               cat:"Movement",      name:"Flight",                 color:"#3a80c0", abbr:"Flt" },
  { id:"healing",              cat:"Miscellaneous", name:"Healing",                color:"#409060", abbr:"Hea" },
  { id:"heightened-cool",      cat:"Miscellaneous", name:"Heightened Cool",        color:"#406080", abbr:"HCl" },
  { id:"heightened-initiative",cat:"Miscellaneous", name:"Heightened Initiative",  color:"#507060", abbr:"HIn" },
  { id:"heightened-intelligence",cat:"Miscellaneous",name:"Heightened Intelligence",color:"#506080",abbr:"HIQ" },
  { id:"heightened-senses",    cat:"Miscellaneous", name:"Heightened Senses",      color:"#908020", abbr:"HSn" },
  { id:"illusions",            cat:"Miscellaneous", name:"Illusions",              color:"#806090", abbr:"Ill" },
  { id:"inventing",            cat:"Miscellaneous", name:"Inventing",              color:"#607050", abbr:"Ivt" },
  { id:"knowledge",            cat:"Miscellaneous", name:"Knowledge",              color:"#606048", abbr:"Knw" },
  { id:"luck",                 cat:"Miscellaneous", name:"Luck",                   color:"#a09030", abbr:"Lck" },
  { id:"mental-ability",       cat:"Miscellaneous", name:"Mental Ability",         color:"#6060a0", abbr:"Mnt" },
  { id:"negation",             cat:"Miscellaneous", name:"Negation",               color:"#705060", abbr:"Neg" },
  { id:"physical-ability",     cat:"Miscellaneous", name:"Physical Ability",       color:"#607048", abbr:"Phy" },
  { id:"revivification",       cat:"Miscellaneous", name:"Revivification",         color:"#408050", abbr:"Rvv" },
  { id:"shape-shifting",       cat:"Miscellaneous", name:"Shape-Shifting",         color:"#607060", abbr:"ShS" },
  { id:"size-change",          cat:"Miscellaneous", name:"Size Change",            color:"#607050", abbr:"Siz" },
  { id:"speed",                cat:"Movement",      name:"Speed",                  color:"#3070b0", abbr:"Spd" },
  { id:"summoning",            cat:"Miscellaneous", name:"Summoning",              color:"#706060", abbr:"Sum" },
  { id:"super-speed",          cat:"Miscellaneous", name:"Super Speed",            color:"#3060c0", abbr:"SSp" },
  { id:"telepathy",            cat:"Miscellaneous", name:"Telepathy",              color:"#7060a0", abbr:"Tel" },
  { id:"teleportation",        cat:"Movement",      name:"Teleportation",          color:"#6a50a0", abbr:"Tlp" },
  { id:"transformation",       cat:"Miscellaneous", name:"Transformation",         color:"#707050", abbr:"Tfm" },
  { id:"tunneling",            cat:"Movement",      name:"Tunneling",              color:"#4a5a80", abbr:"Tun" },
  { id:"vehicle",              cat:"Miscellaneous", name:"Vehicle",                color:"#606058", abbr:"Veh" },
  { id:"wealth",               cat:"Miscellaneous", name:"Wealth",                 color:"#a09040", abbr:"Wlt" },
  { id:"willpower",            cat:"Miscellaneous", name:"Willpower",              color:"#605080", abbr:"Wil" },

  // --- Vehicle-Specific Systems (from vehicle construction rules) ---
  { id:"robot-brain",     cat:"Vehicle",  name:"Robot Brain (+IN)",  color:"#6060a0", abbr:"RBr" },
  { id:"automation",      cat:"Vehicle",  name:"Automation (+AG)",   color:"#507090", abbr:"Aut" },
  { id:"performance",     cat:"Vehicle",  name:"Performance (+CL)", color:"#806050", abbr:"Prf" },
  { id:"sensor-suite",    cat:"Vehicle",  name:"Sensor Suite",       color:"#a08020", abbr:"Sns" },

  // --- Crew & Structure ---
  { id:"control-seat",    cat:"Crew",     name:"Control Seat",       color:"#2a7a6a", abbr:"CSt" },
  { id:"passenger-seat",  cat:"Crew",     name:"Passenger Seat",     color:"#2a7a6a", abbr:"PSt" },
  { id:"bunk",            cat:"Crew",     name:"Bunk (double)",      color:"#2a7a6a", abbr:"Bnk" },
  { id:"hands",           cat:"Crew",     name:"Hands",              color:"#5a7a5a", abbr:"Hnd" },
  { id:"limbs",           cat:"Crew",     name:"Limbs",              color:"#4a6a4a", abbr:"Lmb" },

  // --- Cargo ---
  { id:"cargo",           cat:"Cargo",    name:"Cargo / Empty",      color:"#4a4a42", abbr:"Cgo" },
  { id:"spare-parts",     cat:"Cargo",    name:"Spare Parts",        color:"#6a5a38", abbr:"Spr" },
  { id:"garage",          cat:"Cargo",    name:"Garage / Hangar",    color:"#3a4a50", abbr:"Gar" },

  // --- Custom ---
  { id:"custom",          cat:"Custom",   name:"Custom",             color:"#707070", abbr:"Cst" },
];

MP.abilityById = function(id) {
  return MP.ABILITY_TYPES.find(t => t.id === id) || null;
};

// ---- Ability Details for Insert Dialog ----
// dmg=damage type, pr=PR/use, defCP=suggested CPs, hint=description
// calc: seq="A"|"B", offset=step@cp0, cpStep=2.5|5, rng=range formula,
//       move=true+moveOffset, armor=true, forceField=true
MP.ABILITY_DETAILS = {
  // --- Offensive ---
  "absorption":         {dmg:"Special",    pr:0,  defCP:5,   hint:"Absorb dmg types, ¼ damage, gain CPs"},
  "bridge-travel":      {dmg:"—",          pr:0,  defCP:10,  hint:"3D movement leaving solid bridge, PR=0/hr", calc:{bridgeTravel:true}},
  "change-environment": {dmg:"Special",    pr:1,  defCP:10,  hint:"Damaging area effect, 1 dmg/rnd, PR=1/rnd", calc:{changeEnv:true}},
  "chemical-abilities": {dmg:"Biochem",    pr:2,  defCP:10,  hint:"Chem Blast (rng ST\") or Chem Body (field)", calc:{seq:"A",offset:9,rng:"ST",baseRange:"BCx1\""}},
  "death-touch":        {dmg:"Entropy",    pr:12, defCP:15,  hint:"Melee entropy, no roll-with, kill on 0 HP", calc:{seq:"A",offset:-1,rng:"touch",baseRange:"Touch/Melee"}},
  "devitalization-ray": {dmg:"Entropy",    pr:3,  defCP:10,  hint:"Power damage, rng ENx2\"", calc:{seq:"A",offset:13,rng:"ENx2",baseRange:"BCx2\""}},
  "disintegration":     {dmg:"Other",      pr:2,  defCP:10,  hint:"Disintegration Ray or Field", calc:{seq:"A",offset:5,rng:"ST",baseRange:"BCx1\""}},
  "emotion-control":    {dmg:"Psychic",    pr:3,  defCP:10,  hint:"Mental save attack, impose emotion", calc:{rng:"CL",baseRange:"BCx1\""}},
  "experience-levels":  {dmg:"—",          pr:0,  defCP:10,  hint:"Hit/Defense/Task bonuses"},
  "flame-abilities":    {dmg:"Energy",     pr:2,  defCP:10,  hint:"Flame Blast or Flame Aura", calc:{seq:"A",offset:5,rng:"ST+EN",baseRange:"BCx1\""}},
  "force-field":        {dmg:"Special",    pr:16, defCP:15,  hint:"Personal Force Field or Force Bolt", calc:{forceField:true}},
  "grapnel":            {dmg:"Kinetic",    pr:1,  defCP:10,  hint:"Snare attack, rng (ST+AG)\"", calc:{rng:"ST+AG",baseRange:"BCx1\""}},
  "gravity-control":    {dmg:"Other",      pr:2,  defCP:10,  hint:"Gravity Decrease/Increase/Personal Well", calc:{rng:"EN",baseRange:"BCx1\""}},
  "heightened-agility": {dmg:"—",          pr:0,  defCP:10,  hint:"+1 AG per CP"},
  "heightened-attack":  {dmg:"—",          pr:0,  defCP:10,  hint:"Damage bonus on attacks"},
  "heightened-expertise":{dmg:"—",         pr:0,  defCP:10,  hint:"Accuracy bonus on attacks"},
  "heightened-strength":{dmg:"—",          pr:0,  defCP:10,  hint:"+1 ST per CP"},
  "ice-abilities":      {dmg:"Entropy",    pr:1,  defCP:10,  hint:"Ice Armor, Ice Blast (snare), or Ice Shaping", calc:{rng:"(ST+EN)/2",baseRange:"BCx1\""}},
  "inertia":            {dmg:"Other",      pr:1,  defCP:10,  hint:"Reduce target movement, rng STx2\", 6 rnds", calc:{inertia:true,rng:"STx2",baseRange:"BCx2\""}},
  "light-control":      {dmg:"Energy",     pr:1,  defCP:10,  hint:"Laser, Flash, Glare, or Glow", calc:{seq:"A",offset:5,rng:"AGx2",baseRange:"BCx2\""}},
  "lightning-control":  {dmg:"Energy",     pr:4,  defCP:10,  hint:"Electrical Bolt, Field, or Gear Ctrl", calc:{seq:"B",offset:6,rng:"ENx2",baseRange:"BCx2\""}},
  "magnetism":          {dmg:"Kinetic",    pr:1,  defCP:10,  hint:"Magnetic Manipulation", calc:{rng:"ST",baseRange:"BCx1\""}},
  "mind-control":       {dmg:"Psychic",    pr:8,  defCP:10,  hint:"Mental save attack", calc:{rng:"IN+CL",baseRange:"BCx1\""}},
  "natural-weaponry":   {dmg:"Kinetic",    pr:0,  defCP:10,  hint:"Melee: blunt (KB) or sharp (+2 dmg, no KB)", calc:{rng:"touch",baseRange:"Touch/Melee"}},
  "paralysis-ray":      {dmg:"Entropy",    pr:3,  defCP:10,  hint:"Save attack, immobilize", calc:{rng:"ENx2",baseRange:"BCx2\""}},
  "poison-venom":       {dmg:"Biochem",    pr:2,  defCP:10,  hint:"Damaging or Paralytic poison", calc:{rng:"touch",baseRange:"Touch/Melee"}},
  "possession":         {dmg:"Other",      pr:4,  defCP:10,  hint:"CL save attack, control target body, Touch", calc:{possession:true}},
  "power-blast":        {dmg:"Energy",     pr:1,  defCP:10,  hint:"Force bolts", calc:{seq:"A",offset:5,rng:"(ST+EN)/2",baseRange:"BCx1\""}},
  "reflection":         {dmg:"Special",    pr:0,  defCP:10,  hint:"Reflect incoming damage types"},
  "repulsion-blast":    {dmg:"Kinetic",    pr:1,  defCP:10,  hint:"KB only (no hit dmg)", calc:{seq:"A",offset:9,rng:"STx2",baseRange:"BCx2\""}},
  "shaping":            {dmg:"Kinetic",    pr:1,  defCP:10,  hint:"Create solid constructs", calc:{rng:"AG",baseRange:"BCx1\""}},
  "siphon":             {dmg:"Entropy",    pr:0,  defCP:10,  hint:"Drain target CPs/BCs/Hits/Power", calc:{rng:"touch",baseRange:"Touch/Melee"}},
  "sonic-abilities":    {dmg:"Kinetic",    pr:1,  defCP:10,  hint:"Sonic Blast or Sonic Boom (save)", calc:{seq:"B",offset:2,rng:"STx2",baseRange:"BCx2\""}},
  "special-weapon":     {dmg:"Kinetic",    pr:0,  defCP:10,  hint:"Melee or Missile weapon, blunt or sharp", calc:{rng:"AGx2",baseRange:"BCx2\""}},
  "telekinesis":        {dmg:"Kinetic",    pr:1,  defCP:10,  hint:"Kinetic Manipulation", calc:{rng:"AG",baseRange:"BCx1\""}},
  "transmutation":      {dmg:"Other",      pr:8,  defCP:10,  hint:"Save attack, alter living targets", calc:{rng:"INx2",baseRange:"BCx2\""}},
  "unprotection":       {dmg:"Kinetic",    pr:1,  defCP:10,  hint:"Reduce target armor, Touch, 6 rnds", calc:{unprotection:true}},
  "vibration-abilities":{dmg:"Kinetic",    pr:5,  defCP:10,  hint:"Vibratory Blast, no KB", calc:{seq:"B",offset:8,rng:"AGx2",baseRange:"BCx2\""}},
  "weakness-detection": {dmg:"—",          pr:0,  defCP:5,   hint:"+1 to hit scanned target per 2.5 CPs"},
  "weather-control":    {dmg:"Varies",     pr:5,  defCP:10,  hint:"Change Weather / Command Weather"},
  // --- Defensive ---
  "adaptation":         {dmg:"—",          pr:0,  defCP:5,   hint:"Immune to natural hazard, ½ vs active atk"},
  "armor":              {dmg:"—",          pr:0,  defCP:15,  hint:"Protection: Kin/Eng/Bio/Ent", calc:{armor:true}},
  "astral-projection":  {dmg:"—",          pr:5,  defCP:10,  hint:"Intangible astral body, leave body behind"},
  "darkness-control":   {dmg:"—",          pr:1,  defCP:10,  hint:"Dampen senses in area", calc:{rng:"AGx2"}},
  "density-change":     {dmg:"—",          pr:2,  defCP:10,  hint:"Increase (prot+ST) or Decrease density"},
  "durability":         {dmg:"—",          pr:0,  defCP:10,  hint:"Extra Hits = CPs spent"},
  "heightened-defense": {dmg:"—",          pr:0,  defCP:10,  hint:"+1 Phys & Mental Def per 5 CPs"},
  "heightened-endurance":{dmg:"—",         pr:0,  defCP:10,  hint:"+1 EN per CP"},
  "invisibility":       {dmg:"—",          pr:1,  defCP:10,  hint:"Undetectable by 1+ senses"},
  "invulnerability":    {dmg:"—",          pr:0,  defCP:10,  hint:"¼ damage from chosen types, +8 vs saves"},
  "life-support":       {dmg:"—",          pr:0,  defCP:10,  hint:"Environmental immunity + protection"},
  "non-corporealness":  {dmg:"—",          pr:16, defCP:15,  hint:"Intangible, immune to non-Mental attacks"},
  "regeneration":       {dmg:"—",          pr:0,  defCP:10,  hint:"Heal HP faster than normal"},
  "shield":             {dmg:"—",          pr:0,  defCP:10,  hint:"+4 Phys Def, breakpoint bonus"},
  "stretching-abilities":{dmg:"—",         pr:0,  defCP:5,   hint:"Elongation/Flattening/Inflation/Plasticity", calc:{plasticity:true}},
  // --- Miscellaneous ---
  "animal-plant":       {dmg:"—",          pr:0,  defCP:10,  hint:"Species abilities + BC mods"},
  "arsenal":            {dmg:"—",          pr:0,  defCP:20,  hint:"Swappable ability slots (utility belt)"},
  "base":               {dmg:"—",          pr:0,  defCP:15,  hint:"Stationary base (vehicle rules, -15 CP)"},
  "communicators":      {dmg:"—",          pr:0,  defCP:5,   hint:"Paired audio comms, 10 mi range, Gear"},
  "companion":          {dmg:"—",          pr:0,  defCP:10,  hint:"Familiar/minion/pet/sidekick"},
  "cosmic-awareness":   {dmg:"—",          pr:12, defCP:10,  hint:"Ask GM yes/no questions about Multiverse"},
  "cybernetics":        {dmg:"—",          pr:0,  defCP:10,  hint:"Mechanical body parts, 2 random abilities"},
  "dimensional-travel": {dmg:"—",          pr:4,  defCP:10,  hint:"Travel between dimensions"},
  "duplication":        {dmg:"—",          pr:0,  defCP:20,  hint:"Split into identical copies"},
  "energy":             {dmg:"—",          pr:0,  defCP:10,  hint:"+2 Power per CP"},
  "flight":             {dmg:"—",          pr:1,  defCP:15,  hint:"Accel/Top Speed, PR=1/hour", calc:{move:true,moveOffset:-5}},
  "healing":            {dmg:"Other",      pr:1,  defCP:10,  hint:"Restore Hits, touch range", calc:{rng:"touch"}},
  "heightened-cool":    {dmg:"—",          pr:0,  defCP:10,  hint:"+1 CL per CP"},
  "heightened-initiative":{dmg:"—",        pr:0,  defCP:5,   hint:"+1 Initiative per 2.5 CPs"},
  "heightened-intelligence":{dmg:"—",      pr:0,  defCP:10,  hint:"+1 IN per CP"},
  "heightened-senses":  {dmg:"—",          pr:0,  defCP:10,  hint:"New or enhanced senses"},
  "illusions":          {dmg:"—",          pr:1,  defCP:10,  hint:"Intangible sensory semblances"},
  "inventing":          {dmg:"—",          pr:0,  defCP:10,  hint:"1 Inventing Point per CP, Gear default"},
  "knowledge":          {dmg:"—",          pr:0,  defCP:5,   hint:"Careers, languages, cultural background"},
  "luck":               {dmg:"—",          pr:0,  defCP:5,   hint:"+1 Luck save per 2.5 CPs"},
  "mental-ability":     {dmg:"Psychic",    pr:1,  defCP:10,  hint:"Mental Blast, Photographic Memory, etc.", calc:{seq:"A",offset:1,rng:"IN"}},
  "negation":           {dmg:"—",          pr:1,  defCP:10,  hint:"Reduce duration / improve saves vs effects", calc:{rng:"EN"}},
  "physical-ability":   {dmg:"—",          pr:0,  defCP:5,   hint:"Ambidexterity, Extra Limbs, Swarm, Wall-Crawling…"},
  "revivification":     {dmg:"—",          pr:24, defCP:10,  hint:"Raise the dead, touch range, task check"},
  "shape-shifting":     {dmg:"—",          pr:0,  defCP:10,  hint:"Change shape: people/creatures/objects"},
  "size-change":        {dmg:"—",          pr:0,  defCP:10,  hint:"Larger (+ST/EN) or Smaller (-Profile)"},
  "speed":              {dmg:"—",          pr:1,  defCP:15,  hint:"Ground movement, PR=1/hr", calc:{move:true,moveOffset:-10}},
  "summoning":          {dmg:"—",          pr:2,  defCP:10,  hint:"Summon entity, 5 min, PR=2/hr maintain"},
  "super-speed":        {dmg:"—",          pr:2,  defCP:10,  hint:"+1 extra turn per 10 CPs"},
  "telepathy":          {dmg:"—",          pr:1,  defCP:5,   hint:"Direct mental communication"},
  "teleportation":      {dmg:"—",          pr:1,  defCP:10,  hint:"Instant transfer, range depends on CPs", calc:{teleport:true}},
  "transformation":     {dmg:"—",          pr:0,  defCP:10,  hint:"Change into weaker form"},
  "tunneling":          {dmg:"—",          pr:1,  defCP:10,  hint:"Burrow through solid matter, SR + speed tables", calc:{tunneling:true}},
  "vehicle":            {dmg:"—",          pr:0,  defCP:15,  hint:"Vehicle (constructed via vehicle rules)"},
  "wealth":             {dmg:"—",          pr:0,  defCP:5,   hint:"Financial resources, Wealth roll"},
  "willpower":          {dmg:"—",          pr:0,  defCP:10,  hint:"Fortitude / Pain Resistance / Self-Control"},
  // --- Vehicle-Specific ---
  "robot-brain":        {dmg:"—",          pr:0,  defCP:10,  hint:"+IN per CP, vehicle AI"},
  "automation":         {dmg:"—",          pr:0,  defCP:10,  hint:"+AG per CP, autopilot"},
  "performance":        {dmg:"—",          pr:0,  defCP:10,  hint:"+CL per CP, handling"},
  "sensor-suite":       {dmg:"—",          pr:0,  defCP:10,  hint:"Heightened Senses for vehicle"},
  // --- Crew & Cargo ---
  "control-seat":       {dmg:"—",          pr:0,  defCP:0,   hint:"Operator seat (1 space)"},
  "passenger-seat":     {dmg:"—",          pr:0,  defCP:0,   hint:"Passenger seat (1 space each)"},
  "bunk":               {dmg:"—",          pr:0,  defCP:0,   hint:"Sleeping berth (1 space, double)"},
  "hands":              {dmg:"—",          pr:0,  defCP:5,   hint:"Manipulator appendages"},
  "limbs":              {dmg:"—",          pr:0,  defCP:5,   hint:"Locomotive appendages"},
  "cargo":              {dmg:"—",          pr:0,  defCP:0,   hint:"Empty / cargo space"},
  "spare-parts":        {dmg:"—",          pr:0,  defCP:0,   hint:"Repair materials"},
  "garage":             {dmg:"—",          pr:0,  defCP:0,   hint:"Vehicle bay / hangar"},
  "custom":             {dmg:"—",          pr:0,  defCP:0,   hint:"Custom system"},
};

MP.CATEGORIES = ["Vehicle","Crew","Cargo","Movement","Offensive","Defensive","Miscellaneous","Custom"];

// ---- Computed Ability Tables & Formulas ----

// Standard damage dice sequence (Seq A) — used by most attack abilities
// Each step = +2.5 CPs for blasts, +5 CPs for fields
MP.DMG_SEQ_A = [
  "d2-1","1","d2","d3","d4","d6","d6+1","2d4","d4+d6","2d6",
  "d6+d8","2d8","d8+d10","2d10","d10+d12","2d12",
  "3d8","2d8+d10","d8+2d10","3d10","2d10+d12","d10+2d12",
  "3d12","3d12+1","3d12+2","4d10","3d10+d12","2d10+2d12",
  "d10+3d12","4d12"
];

// Alternate damage dice sequence (Seq B) — Lightning, Sonic, Vibratory, Fields
// Replaces 2d4/d4+d6 with d8+1/d10+1; converges with A from 2d6 onward
MP.DMG_SEQ_B = [
  "d2-1","d2","d3","d4","d6","d6+1","d8+1","d10+1","2d6",
  "d6+d8","2d8","d8+d10","2d10","d10+d12","2d12",
  "3d8","2d8+d10","d8+2d10","3d10","2d10+d12","d10+2d12",
  "3d12","3d12+1","3d12+2","4d10","3d10+d12","2d10+2d12",
  "d10+3d12","4d12"
];

// Lookup damage dice: seq="A"|"B", cp=ability CPs, offset=step at cp 0, cpStep=2.5|5
MP.damageDice = function(seq, cp, offset, cpStep) {
  const arr = seq === "B" ? MP.DMG_SEQ_B : MP.DMG_SEQ_A;
  const step = Math.round(cp / cpStep) + offset;
  if (step < 0 || step >= arr.length) return null;
  return arr[step];
};

// Movement speed table: Flight starts at cp -5 (step 0)
// Top speed at step i: even=2^(3+i/2), odd=3*2^(2+(i-1)/2)
// Accel = Top / 16.  MPH ≈ Top * 0.3409 (rounded per book)
MP.movementSpeed = function(cp, cpOffset) {
  // cpOffset: Flight=-5, Speed=-10, Tunneling=-5
  const step = Math.round((cp - cpOffset) / 2.5);
  if (step < 0) return null;
  let top;
  if (step % 2 === 0) top = Math.pow(2, 3 + step / 2);
  else top = 3 * Math.pow(2, 2 + (step - 1) / 2);
  const accel = top / 4;
  // MPH: use book's ratio ~0.3409, round to nearest int (match book rounding)
  const mph = Math.round(top * 5 * 240 * 1.5 / 5280);
  return { accel: accel, top: top, mph: mph };
};

// Teleportation range table: CPs → range string
MP.TELEPORT_TABLE = [
  {cp:2.5,  range:'1"'},    {cp:5,    range:'2"'},    {cp:7.5,  range:'3"'},
  {cp:10,   range:'4"'},    {cp:12.5, range:'8"'},    {cp:15,   range:'12"'},
  {cp:17.5, range:'31"'},   {cp:20,   range:'50"'},   {cp:22.5, range:'250"'},
  {cp:25,   range:"1.5 mi"},{cp:27.5, range:"10 mi"}, {cp:30,   range:"80 mi"},
  {cp:32.5, range:"700 mi"},{cp:35,   range:"7000 mi"},{cp:37.5, range:"80000 mi"},
  {cp:40,   range:"1M mi"}, {cp:42.5, range:"12M mi"},{cp:45,   range:"170M mi"},
  {cp:47.5, range:"2.5T mi"},{cp:50,  range:"7 ly"},  {cp:52.5, range:"117 ly"},
  {cp:55,   range:"2100 ly"},
];

MP.teleportRange = function(cp) {
  for (let i = MP.TELEPORT_TABLE.length - 1; i >= 0; i--) {
    if (cp >= MP.TELEPORT_TABLE[i].cp) return MP.TELEPORT_TABLE[i].range;
  }
  return null;
};

// Bridge Travel: CPs → breakpoint, SR, material
MP.BRIDGE_TABLE = [
  {cp:-5,  bp:6,  sr:1,  mat:"clay, earth"},
  {cp:0,   bp:7,  sr:2,  mat:"bamboo, electronics"},
  {cp:5,   bp:8,  sr:3,  mat:"ice, quartz"},
  {cp:10,  bp:9,  sr:4,  mat:"bone, glass"},
  {cp:15,  bp:10, sr:5,  mat:"brick"},
  {cp:20,  bp:11, sr:6,  mat:"concrete, granite"},
  {cp:25,  bp:12, sr:7,  mat:"marble, machinery"},
  {cp:30,  bp:13, sr:8,  mat:"aluminum, lead"},
  {cp:35,  bp:14, sr:9,  mat:"bronze, silver"},
  {cp:40,  bp:15, sr:10, mat:"iron, platinum"},
  {cp:45,  bp:16, sr:11, mat:"steel"},
  {cp:50,  bp:17, sr:12, mat:"tungsten"},
];

MP.bridgeLookup = function(cp) {
  for (let i = MP.BRIDGE_TABLE.length - 1; i >= 0; i--) {
    if (cp >= MP.BRIDGE_TABLE[i].cp) return MP.BRIDGE_TABLE[i];
  }
  return null;
};

// Change Environment (Damaging): CPs → diameter
MP.CHANGE_ENV_TABLE = [
  {cp:2.5,  diam:'5"'},  {cp:5,    diam:'7"'},  {cp:7.5,  diam:'9"'},
  {cp:10,   diam:'11"'}, {cp:12.5, diam:'15"'}, {cp:15,   diam:'19"'},
  {cp:17.5, diam:'23"'}, {cp:20,   diam:'27"'}, {cp:22.5, diam:'33"'},
  {cp:25,   diam:'39"'}, {cp:27.5, diam:'45"'}, {cp:30,   diam:'51"'},
  {cp:32.5, diam:'59"'}, {cp:35,   diam:'67"'}, {cp:37.5, diam:'75"'},
  {cp:40,   diam:'83"'},
];

MP.changeEnvDiam = function(cp) {
  for (let i = MP.CHANGE_ENV_TABLE.length - 1; i >= 0; i--) {
    if (cp >= MP.CHANGE_ENV_TABLE[i].cp) return MP.CHANGE_ENV_TABLE[i].diam;
  }
  return null;
};

// Inertia: CPs → divisor
MP.INERTIA_TABLE = [
  {cp:2.5,  div:1.5}, {cp:5,    div:2},   {cp:7.5,  div:3},
  {cp:10,   div:4},   {cp:12.5, div:6},   {cp:15,   div:8},
  {cp:17.5, div:12},  {cp:20,   div:16},  {cp:22.5, div:24},
  {cp:25,   div:32},  {cp:27.5, div:48},  {cp:30,   div:64},
  {cp:32.5, div:96},  {cp:35,   div:128}, {cp:37.5, div:192},
  {cp:40,   div:256}, {cp:42.5, div:384}, {cp:45,   div:512},
  {cp:47.5, div:768}, {cp:50,   div:1024},
];

MP.inertiaDiv = function(cp) {
  for (let i = MP.INERTIA_TABLE.length - 1; i >= 0; i--) {
    if (cp >= MP.INERTIA_TABLE[i].cp) return MP.INERTIA_TABLE[i].div;
  }
  return null;
};

// Possession: CPs → save modifier
MP.POSSESSION_TABLE = [
  {cp:2.5,  mod:4},  {cp:5,    mod:3},  {cp:7.5,  mod:2},
  {cp:10,   mod:1},  {cp:12.5, mod:0},  {cp:15,   mod:-1},
  {cp:17.5, mod:-2}, {cp:20,   mod:-3}, {cp:22.5, mod:-4},
  {cp:25,   mod:-5}, {cp:27.5, mod:-6}, {cp:30,   mod:-7},
  {cp:32.5, mod:-8}, {cp:35,   mod:-9}, {cp:37.5, mod:-10},
  {cp:40,   mod:-11},{cp:42.5, mod:-12},{cp:45,   mod:-13},
  {cp:47.5, mod:-14},{cp:50,   mod:-15},
];

MP.possessionMod = function(cp) {
  for (let i = MP.POSSESSION_TABLE.length - 1; i >= 0; i--) {
    if (cp >= MP.POSSESSION_TABLE[i].cp) return MP.POSSESSION_TABLE[i].mod;
  }
  return null;
};

// Stretching E) Plasticity: CPs → kinetic protection
MP.PLASTICITY_TABLE = [
  {cp:2.5,  prot:0},  {cp:5,    prot:1},  {cp:7.5,  prot:2},
  {cp:10,   prot:3},  {cp:12.5, prot:5},  {cp:15,   prot:6},
  {cp:17.5, prot:8},  {cp:20,   prot:9},  {cp:22.5, prot:11},
  {cp:25,   prot:12}, {cp:27.5, prot:13}, {cp:30,   prot:14},
  {cp:32.5, prot:15}, {cp:35,   prot:16}, {cp:37.5, prot:17},
  {cp:40,   prot:18}, {cp:42.5, prot:19}, {cp:45,   prot:20},
  {cp:47.5, prot:21}, {cp:50,   prot:22},
];

MP.plasticityProt = function(cp) {
  for (let i = MP.PLASTICITY_TABLE.length - 1; i >= 0; i--) {
    if (cp >= MP.PLASTICITY_TABLE[i].cp) return MP.PLASTICITY_TABLE[i].prot;
  }
  return null;
};

// Physical Ability F) Super Leap: CPs → leap distance multiplier
MP.SUPER_LEAP_TABLE = [
  {cp:2.5,  mult:2},      {cp:5,    mult:4},      {cp:7.5,  mult:8},
  {cp:10,   mult:16},     {cp:12.5, mult:32},     {cp:15,   mult:64},
  {cp:17.5, mult:128},    {cp:20,   mult:256},    {cp:22.5, mult:512},
  {cp:25,   mult:1024},   {cp:27.5, mult:2048},   {cp:30,   mult:4096},
  {cp:32.5, mult:8192},   {cp:35,   mult:16384},  {cp:37.5, mult:32768},
  {cp:40,   mult:65536},  {cp:42.5, mult:131072}, {cp:47.5, mult:262144},
  {cp:50,   mult:524288},
];

MP.superLeapMult = function(cp) {
  for (let i = MP.SUPER_LEAP_TABLE.length - 1; i >= 0; i--) {
    if (cp >= MP.SUPER_LEAP_TABLE[i].cp) return MP.SUPER_LEAP_TABLE[i].mult;
  }
  return null;
};

// Tunneling: CPs → max SR (separate from speed)
MP.TUNNEL_SR_TABLE = [
  {cp:2.5,  sr:1},  {cp:5,    sr:2},  {cp:7.5,  sr:3},
  {cp:10,   sr:4},  {cp:12.5, sr:5},  {cp:15,   sr:6},
  {cp:17.5, sr:7},  {cp:20,   sr:8},  {cp:22.5, sr:9},
  {cp:25,   sr:10}, {cp:27.5, sr:11}, {cp:30,   sr:12},
  {cp:32.5, sr:13}, {cp:35,   sr:14}, {cp:37.5, sr:15},
  {cp:40,   sr:16}, {cp:42.5, sr:17}, {cp:45,   sr:18},
  {cp:47.5, sr:19}, {cp:50,   sr:20},
];

// Tunneling speed: CPs → max dig speed in inches
MP.TUNNEL_SPEED_TABLE = [
  {cp:-5,   spd:1},   {cp:-2.5, spd:2},   {cp:0,    spd:3},
  {cp:2.5,  spd:4},   {cp:5,    spd:6},   {cp:7.5,  spd:8},
  {cp:10,   spd:12},  {cp:12.5, spd:16},  {cp:15,   spd:24},
  {cp:17.5, spd:32},  {cp:20,   spd:48},  {cp:22.5, spd:64},
  {cp:25,   spd:96},  {cp:27.5, spd:128}, {cp:30,   spd:192},
  {cp:32.5, spd:256}, {cp:35,   spd:384}, {cp:37.5, spd:512},
  {cp:40,   spd:768}, {cp:42.5, spd:1024},{cp:45,   spd:1536},
  {cp:47.5, spd:2048},{cp:50,   spd:3072},
];

MP.tunnelSR = function(cp) {
  for (let i = MP.TUNNEL_SR_TABLE.length - 1; i >= 0; i--) {
    if (cp >= MP.TUNNEL_SR_TABLE[i].cp) return MP.TUNNEL_SR_TABLE[i].sr;
  }
  return null;
};

MP.tunnelSpeed = function(cp) {
  for (let i = MP.TUNNEL_SPEED_TABLE.length - 1; i >= 0; i--) {
    if (cp >= MP.TUNNEL_SPEED_TABLE[i].cp) return MP.TUNNEL_SPEED_TABLE[i].spd;
  }
  return null;
};

// Unprotection: CPs → points removed per use, max removal
MP.UNPROTECTION_TABLE = [
  {cp:0,   pts:1, max:2},  {cp:5,   pts:2, max:4},
  {cp:10,  pts:3, max:6},  {cp:15,  pts:4, max:8},
  {cp:20,  pts:5, max:10}, {cp:25,  pts:6, max:12},
  {cp:30,  pts:7, max:14}, {cp:35,  pts:8, max:16},
  {cp:40,  pts:9, max:18}, {cp:45,  pts:10,max:20},
  {cp:50,  pts:11,max:22}, {cp:55,  pts:12,max:24},
];

MP.unprotectionLookup = function(cp) {
  for (let i = MP.UNPROTECTION_TABLE.length - 1; i >= 0; i--) {
    if (cp >= MP.UNPROTECTION_TABLE[i].cp) return MP.UNPROTECTION_TABLE[i];
  }
  return null;
};

// Armor table: CPs → total points and default Kin/Eng/Bio/Ent split
MP.ARMOR_TABLE = [
  {cp:2.5,  total:2,  def:"1/0/0/1"},
  {cp:5,    total:3,  def:"1/1/0/1"},
  {cp:7.5,  total:5,  def:"2/1/1/1"},
  {cp:10,   total:6,  def:"2/1/1/2"},
  {cp:12.5, total:8,  def:"2/2/2/2"},
  {cp:15,   total:9,  def:"3/2/2/2"},
  {cp:17.5, total:11, def:"3/3/2/3"},
  {cp:20,   total:12, def:"3/3/3/3"},
  {cp:22.5, total:13, def:"4/3/3/3"},
  {cp:25,   total:14, def:"4/3/3/4"},
  {cp:27.5, total:15, def:"4/4/3/4"},
  {cp:30,   total:16, def:"4/4/4/4"},
  {cp:32.5, total:17, def:"5/4/4/4"},
  {cp:35,   total:18, def:"5/4/4/5"},
  {cp:37.5, total:19, def:"5/5/4/5"},
  {cp:40,   total:20, def:"5/5/5/5"},
  {cp:42.5, total:21, def:"6/5/5/5"},
  {cp:45,   total:22, def:"6/5/5/6"},
  {cp:47.5, total:23, def:"6/6/5/6"},
  {cp:50,   total:24, def:"6/6/6/6"},
];

MP.armorLookup = function(cp) {
  for (let i = MP.ARMOR_TABLE.length - 1; i >= 0; i--) {
    if (MP.ARMOR_TABLE[i].cp <= cp) return MP.ARMOR_TABLE[i];
  }
  return MP.ARMOR_TABLE[0];
};

// Force Field table: CPs → protection (Kin/Eng/Bio/Ent/Total)
MP.FORCEFIELD_TABLE = [
  {cp:2.5,  total:10, def:"3/3/2/2"},
  {cp:5,    total:12, def:"3/3/3/3"},
  {cp:7.5,  total:14, def:"4/4/3/3"},
  {cp:10,   total:16, def:"4/4/4/4"},
  {cp:12.5, total:18, def:"5/5/4/4"},
  {cp:15,   total:20, def:"5/5/5/5"},
  {cp:17.5, total:22, def:"6/6/5/5"},
  {cp:20,   total:24, def:"6/6/6/6"},
  {cp:22.5, total:26, def:"7/7/6/6"},
  {cp:25,   total:28, def:"7/7/7/7"},
  {cp:27.5, total:30, def:"8/8/7/7"},
  {cp:30,   total:32, def:"8/8/8/8"},
  {cp:32.5, total:34, def:"9/9/8/8"},
  {cp:35,   total:36, def:"9/9/9/9"},
  {cp:37.5, total:38, def:"10/10/9/9"},
  {cp:40,   total:40, def:"10/10/10/10"},
  {cp:42.5, total:42, def:"11/11/10/10"},
  {cp:45,   total:44, def:"11/11/11/11"},
  {cp:47.5, total:46, def:"12/12/11/11"},
  {cp:50,   total:48, def:"12/12/12/12"},
];

MP.forcefieldLookup = function(cp) {
  for (let i = MP.FORCEFIELD_TABLE.length - 1; i >= 0; i--) {
    if (MP.FORCEFIELD_TABLE[i].cp <= cp) return MP.FORCEFIELD_TABLE[i];
  }
  return MP.FORCEFIELD_TABLE[0];
};

// Range formula lookup: returns range in inches given vehicle stats
// rngFormula is a string like "ST", "ENx2", "(ST+EN)/2", "(ST+AG)", etc.
MP.calcRange = function(formula, st, en, ag, intel, cl) {
  if (!formula) return null;
  switch (formula) {
    case "ST":       return st;
    case "STx2":     return st * 2;
    case "EN":       return en;
    case "ENx2":     return en * 2;
    case "AG":       return ag;
    case "AGx2":     return ag * 2;
    case "IN":       return intel;
    case "INx2":     return intel * 2;
    case "IN+CL":    return intel + cl;
    case "CL":       return cl;
    case "ST+EN":    return st + en;
    case "(ST+EN)/2":return Math.floor((st + en) / 2);
    case "ST+AG":    return st + ag;
    case "touch":    return 0;
    default:         return null;
  }
};

// Compute ability info string for the dialog, given ability id, system CPs, and vehicle stats
// Returns {hint, desc} where hint is the display string and desc is what goes in the row
MP.computeAbilityInfo = function(abId, cp, st, en, ag, intel, cl) {
  const d = MP.ABILITY_DETAILS[abId];
  if (!d || !d.calc) return null;
  const c = d.calc;
  const parts = [];
  let descParts = [];

  // Damage
  if (c.seq && c.offset !== undefined) {
    const cpStep = c.cpStep || 2.5;
    const dice = MP.damageDice(c.seq, cp, c.offset, cpStep);
    if (dice) {
      parts.push(dice + " " + d.dmg + " dmg");
      descParts.push(dice);
    }
  }

  // Movement
  if (c.move) {
    const spd = MP.movementSpeed(cp, c.moveOffset || 0);
    if (spd) {
      parts.push(spd.accel + "/" + spd.top + ", " + spd.mph + " mph");
      descParts.push(spd.accel + "/" + spd.top + ", " + spd.mph + " mph");
    }
  }

  // Armor
  if (c.armor) {
    const a = MP.armorLookup(cp);
    if (a) {
      parts.push(a.total + " pts (" + a.def + " K/E/B/N)");
      descParts.push(a.total + " pts (" + a.def + ")");
    }
  }

  // Force Field
  if (c.forceField) {
    const ff = MP.forcefieldLookup(cp);
    if (ff) {
      parts.push(ff.total + " pts (" + ff.def + " K/E/B/N)");
      descParts.push(ff.total + " pts (" + ff.def + ")");
    }
  }

  // Teleportation range
  if (c.teleport) {
    const r = MP.teleportRange(cp);
    if (r) {
      parts.push("Range " + r);
      descParts.push("Range " + r);
    }
  }

  // Bridge Travel
  if (c.bridgeTravel) {
    const b = MP.bridgeLookup(cp);
    if (b) {
      parts.push("BP " + b.bp + ", SR " + b.sr + " (" + b.mat + ")");
      descParts.push("BP " + b.bp + ", SR " + b.sr);
    }
  }

  // Change Environment
  if (c.changeEnv) {
    const d2 = MP.changeEnvDiam(cp);
    if (d2) {
      parts.push(d2 + " diam, 1 dmg/rnd");
      descParts.push(d2 + " diam");
    }
  }

  // Inertia
  if (c.inertia) {
    const div = MP.inertiaDiv(cp);
    if (div != null) {
      parts.push("÷" + div + " move, 6 rnds");
      descParts.push("÷" + div);
    }
  }

  // Possession
  if (c.possession) {
    const m = MP.possessionMod(cp);
    if (m != null) {
      parts.push("Save mod " + (m >= 0 ? "+" + m : m));
      descParts.push("Save " + (m >= 0 ? "+" + m : m));
    }
  }

  // Tunneling (SR + speed, not movement table)
  if (c.tunneling) {
    const sr = MP.tunnelSR(cp);
    const spd = MP.tunnelSpeed(cp);
    if (sr != null) { parts.push("Max SR " + sr); descParts.push("SR " + sr); }
    if (spd != null) { parts.push("Dig " + spd + '"'); descParts.push("Dig " + spd + '"'); }
  }

  // Unprotection
  if (c.unprotection) {
    const u = MP.unprotectionLookup(cp);
    if (u) {
      parts.push("-" + u.pts + " prot (max -" + u.max + "), Touch, 6 rnds");
      descParts.push("-" + u.pts + " (max -" + u.max + ")");
    }
  }

  // Plasticity (Stretching E)
  if (c.plasticity) {
    const p = MP.plasticityProt(cp);
    if (p !== null) {
      parts.push(p + " Kin prot");
      descParts.push(p + " Kin prot");
    }
  }

  // Range
  if (c.rng) {
    const r = MP.calcRange(c.rng, st, en, ag, intel, cl);
    if (r !== null) {
      if (r === 0) { parts.push("Touch"); descParts.push("Touch"); }
      else { parts.push("Rng " + r + '"'); descParts.push("Rng " + r + '"'); }
    }
  }

  // PR
  if (d.pr > 0) parts.push("PR=" + d.pr);

  return { hint: parts.join(", "), desc: descParts.join(", ") };
};

// ---- Per-Ability Modifiers (from ability descriptions) ----
// Each entry: {id, label, short, cp} or {id, label, short, type:"number", ...}
// cp can be a number (fixed) or a function(val) for number types
MP.ABILITY_MODIFIERS = {
  "absorption": [
    {id:"absReplenish",  label:"Replenishment",       short:"Repln",  cp:5},
    {id:"absSplit",      label:"Split Points",         short:"Split",  cp:0},
    {id:"absExcess1",    label:"Excess: Lose All",     short:"ExcA",   cp:-5},
    {id:"absExcess2",    label:"Excess: Half Dmg",     short:"ExcH",   cp:-10},
    {id:"absExcess3",    label:"Excess: Full Dmg",     short:"ExcF",   cp:-15},
  ],
  "armor": [
    {id:"armAblative",   label:"Ablative",             short:"Ablt",   cp:-5},
  ],
  "chemical-abilities": [
    {id:"chemBody",      label:"Chemical Body (field)", short:"Body",  cp:0},
  ],
  "communicators": [
    {id:"comBeacon",     label:"Beacon",                short:"Bcn",   cp:5},
    {id:"comDecrypt",    label:"Decryption",             short:"Dcry", type:"number", min:1, max:5, def:1, step:1, hint:"+2.5/app, +3 decrypt/app", cpFn:v=>v*2.5},
    {id:"comEncrypt",    label:"Encryption",              short:"Encr", type:"number", min:1, max:5, def:1, step:1, hint:"+2.5/app, -3 intercept/app", cpFn:v=>v*2.5},
    {id:"comExtraCh",    label:"Extra Channels",          short:"ExCh", type:"number", min:1, max:5, def:1, step:1, hint:"+2.5/app, -3 scan/app", cpFn:v=>v*2.5},
    {id:"comGPS",        label:"GPS",                     short:"GPS",  cp:2.5},
    {id:"comGPSAny",     label:"GPS (any planet)",        short:"GPS+", cp:5},
    {id:"comInterDim",   label:"Interdimensional",        short:"IDim", cp:5},
    {id:"comInternet",   label:"Internet Access",         short:"Web",  cp:2.5},
    {id:"comRange",      label:"Adjusted Range",          short:"Rng",  type:"select",
      options:[
        {v:-5, l:"20 ft / 4\" (-12.5)",       cp:-12.5},
        {v:-4, l:"60 ft / 12\" (-10)",         cp:-10},
        {v:-3, l:"250 ft / 50\" (-7.5)",       cp:-7.5},
        {v:-2, l:"¼ mile (-5)",                cp:-5},
        {v:-1, l:"1.5 miles (-2.5)",           cp:-2.5},
        {v:0,  l:"10 miles (base)",            cp:0},
        {v:1,  l:"80 miles (+2.5)",            cp:2.5},
        {v:2,  l:"700 miles (+5)",             cp:5},
        {v:3,  l:"7,000 mi (+7.5)",            cp:7.5},
        {v:4,  l:"80,000 mi (+10)",            cp:10},
        {v:5,  l:"1M mi (+12.5)",              cp:12.5},
        {v:6,  l:"12M mi (+15)",               cp:15},
        {v:7,  l:"170M mi (+17.5)",            cp:17.5},
        {v:8,  l:"2.5T mi (+20)",              cp:20},
        {v:9,  l:"7 LY (+22.5)",              cp:22.5},
      ], def:5, hint:"range from 20ft to 7 light years"},
    {id:"comMiniature",  label:"Miniaturized",            short:"Mini", type:"number", min:1, max:5, def:1, step:1, hint:"+2.5/app, -3 search/app", cpFn:v=>v*2.5},
    {id:"comNoAudio",    label:"No Audio",                short:"NoAu", cp:-5},
    {id:"comNotGear",    label:"Not Gear",                short:"NGr",  cp:5},
    {id:"comOneWay",     label:"One-Way",                 short:"1Way", cp:-2.5},
    {id:"comRecording",  label:"Recording",               short:"Rec",  cp:2.5},
    {id:"comCellTower",  label:"Requires Cell Towers",    short:"Cell", cp:-5},
    {id:"comScanning",   label:"Scanning",                short:"Scan", type:"number", min:1, max:5, def:1, step:1, hint:"+2.5/app, +3 scan/app", cpFn:v=>v*2.5},
    {id:"comSingle",     label:"Single Communicator",     short:"1Com", cp:-5},
    {id:"comSubSpace",   label:"Sub-Space",               short:"SubS", cp:5},
    {id:"comTexting",    label:"Texting",                  short:"Txt",  cp:2.5},
    {id:"comTracking",   label:"Tracking",                 short:"Trk", type:"number", min:1, max:5, def:1, step:1, hint:"+2.5/app, +3 track/app", cpFn:v=>v*2.5},
    {id:"comUnblock1",   label:"Unblockable (one)",        short:"Ubl1",cp:5},
    {id:"comUnblock2",   label:"Unblockable (both)",       short:"Ubl2",cp:10},
    {id:"comUnlimBatt",  label:"Unlimited Battery",        short:"UBat",cp:5},
    {id:"comVideoBW",    label:"Video B&W",                short:"VidB",cp:2.5},
    {id:"comVideoColor", label:"Video Color",              short:"VidC",cp:5},
  ],
  "darkness-control": [
    {id:"darkBasic",     label:"Basic Darkness",       short:"Basic",  cp:-5},
    {id:"darkFull",      label:"Full Darkness",        short:"Full",   cp:10},
  ],
  "density-change": [
    {id:"denAdj",        label:"Adjustable Density",   short:"Adj",    cp:5},
  ],
  "emotion-control": [
    {id:"emoPheromone",  label:"Pheromones",           short:"Pher",   cp:0},
    {id:"emoSingle",     label:"Single Emotion",       short:"1Emo",   cp:-5},
  ],
  "bridge-travel": [
    {id:"brdFaster",     label:"Faster/Slower Bridge",    short:"Spd",  type:"number", min:-9, max:12, def:0, step:1, hint:"±2.5/step on speed table", cpFn:v=>v*2.5},
    {id:"brdMaze",       label:"Maze Travel",             short:"Maze", cp:0},
    {id:"brdMazeBoth",   label:"Maze + Bridge (both)",    short:"M+B",  cp:5},
  ],
  "change-environment": [
    {id:"ceHarmless",    label:"Harmless",                short:"Hrm",  cp:-2.5},
    {id:"ceMoreDmg",     label:"More Damage",             short:"+Dmg", type:"number", min:1, max:10, def:1, step:1, hint:"+1 dmg/rnd per +2.5", cpFn:v=>v*2.5},
    {id:"ceVacuum",      label:"Vacuum",                  short:"Vac",  cp:10},
    {id:"ceHighPressure",label:"High Atmospheric Pressure",short:"HiP", cp:10},
    {id:"ceChlorine",    label:"Chlorine Gas",            short:"Cl",   cp:12.5},
    {id:"cePhosphene",   label:"Phosphene Gas",           short:"Ph",   cp:15},
    {id:"ceRadiation",   label:"Hard Radiation",          short:"Rad",  cp:2.5},
  ],
  "flame-abilities": [
    {id:"flmBody",       label:"Flame Body (field)",   short:"Body",   cp:0},
  ],
  "flight": [
    {id:"fltFastAccel",  label:"Fast Acceleration",    short:"FstAc",  type:"number", min:1, max:10, def:1, step:1, hint:"+2.5/app, x2 accel per 2 steps", cpFn:v=>v*2.5},
    {id:"fltAmphibious", label:"Amphibious",           short:"Amph",   cp:5},
    {id:"fltWings",      label:"Wings",                short:"Wings",  cp:-5},
    {id:"fltGliding",    label:"Gliding",              short:"Glide",  cp:-5},
    {id:"fltHyper",      label:"Hyper-Flight",         short:"Hyper",  type:"number", min:1, max:20, def:1, step:1, hint:"+2.5/step, x2 top speed per step", cpFn:v=>v*2.5},
  ],
  "force-field": [
    {id:"ffNoBlock",     label:"Doesn't Block Non-Corp/Gas", short:"NoNC", cp:-5},
    {id:"ffNoBlockTP",   label:"Doesn't Block Teleport",     short:"NoTP", cp:-5},
  ],
  "grapnel": [
    {id:"grpNoSwing",    label:"No Swinging",          short:"NoSw",   cp:-5},
    {id:"grpSwingOnly",  label:"Swinging Only",        short:"SwOn",   cp:-10},
  ],
  "gravity-control": [
    {id:"gravReduce",    label:"Weight Reduction Only", short:"WtRd",  cp:-10},
    {id:"gravWeightless",label:"Weightlessness Only",   short:"Wtls",  cp:-5},
    {id:"gravNeg",       label:"Negative Weight x2",    short:"NegW",  type:"number", min:1, max:10, def:1, step:1, hint:"+5/app", cpFn:v=>v*5},
    {id:"gravSingle",    label:"Single Target",         short:"1Tgt",  cp:0},
  ],
  "ice-abilities": [
    {id:"iceColder",     label:"Colder Ice",           short:"Cold",   type:"number", min:1, max:2, def:1, step:1, hint:"+5/app, +1 dmg/app", cpFn:v=>v*5},
  ],
  "inertia": [
    {id:"inrLimited",   label:"Limited Movement Types", short:"Ltd",  cp:-5},
  ],
  "heightened-senses": [
    {id:"hsSenseType",   label:"Sense Type",              short:"Type", type:"select",
      options:[
        {v:"custom",     l:"(custom)",           cp:0},
        {v:"danger",     l:"Danger",             cp:0},
        {v:"emotion",    l:"Emotion",            cp:0},
        {v:"flavors",    l:"Flavors",            cp:0},
        {v:"ir",         l:"Light, Infrared",    cp:0},
        {v:"uv",         l:"Light, Ultraviolet",  cp:0},
        {v:"visible",    l:"Light, Visible",     cp:0},
        {v:"life",       l:"Life",               cp:0},
        {v:"magic",      l:"Magic",              cp:0},
        {v:"magnetism",  l:"Magnetism",          cp:0},
        {v:"mental",     l:"Mental Waves",       cp:0},
        {v:"motion",     l:"Motion",             cp:0},
        {v:"odors",      l:"Odors",              cp:0},
        {v:"radar",      l:"Radar",              cp:0},
        {v:"radiation",  l:"Radiation",          cp:0},
        {v:"radio",      l:"Radio Waves",        cp:0},
        {v:"shapes",     l:"Shapes",             cp:0},
        {v:"audible",    l:"Sounds, Audible",    cp:0},
        {v:"subsonic",   l:"Sounds, Subsonic",   cp:0},
        {v:"ultrasonic", l:"Sounds, Ultrasonic",  cp:0},
        {v:"time",       l:"Time",               cp:0},
        {v:"xray",       l:"X-Rays",             cp:0},
      ], def:0},
    {id:"hsLevel",       label:"Sense Level",            short:"Lvl",  type:"select",
      options:[
        {v:0, l:"Basic (base)",       cp:0},
        {v:1, l:"Full (+5)",          cp:5},
        {v:2, l:"Analytical (+15)",   cp:15},
      ], def:0},
    {id:"hsAcute",       label:"Acute",                  short:"Acu",  type:"number", min:1, max:10, def:1, step:1, hint:"+2.5/app, +3 task bonus per app", cpFn:v=>v*2.5},
    {id:"hsAmplified",   label:"Amplified",              short:"Amp",  type:"number", min:1, max:5, def:1, step:1, hint:"+5/app, negates 1 dampening rank", cpFn:v=>v*5},
    {id:"hsGlobalHalf",  label:"Global 360° (horiz)",    short:"G360", cp:5},
    {id:"hsGlobalFull",  label:"Global (all directions)", short:"GAll", cp:10},
    {id:"hsPenetrating", label:"Penetrating",            short:"Pen",  cp:10},
    {id:"hsPrecog",      label:"Precognitive",           short:"Pre",  cp:15},
    {id:"hsProtected",   label:"Protected",              short:"Prot", type:"number", min:1, max:5, def:1, step:1, hint:"+5/app, negates 1 overload rank", cpFn:v=>v*5},
    {id:"hsRanged",      label:"Ranged",                 short:"Rng",  cp:5},
    {id:"hsRetrocog",    label:"Retrocognitive",         short:"Ret",  cp:15},
    {id:"hsTelescopic",  label:"Telescopic",             short:"Tel",  type:"number", min:1, max:6, def:1, step:1, hint:"+2.5/app, +2 vs range per app", cpFn:v=>v*2.5},
    {id:"hsTracking",    label:"Tracking",               short:"Trk",  cp:2.5},
    {id:"hsRadioAV",     label:"Radio: Audio & Video",   short:"A+V",  cp:7.5},
  ],
  "illusions": [
    {id:"illuBasic",     label:"Basic Illusions",      short:"Basic",  cp:-5},
    {id:"illuAnalytic",  label:"Analytical Illusions",  short:"Anltc", cp:10},
  ],
  "invisibility": [
    {id:"invisBlur",     label:"Blur (5/sense not 10)", short:"Blur",  cp:0},
    {id:"invisCamo",     label:"Camouflage",           short:"Camo",   cp:-2.5},
    {id:"invisChameleon",label:"Chameleon",             short:"Chml",   cp:-2.5},
  ],
  "light-control": [
    {id:"ltFlashMild",   label:"Mild Flash",           short:"MFlsh",  cp:-5},
    {id:"ltFlashStrong", label:"Strong Flash",          short:"SFlsh", cp:10},
    {id:"ltGlareBasic",  label:"Basic Glare",           short:"BGlr",  cp:-5},
    {id:"ltGlareFull",   label:"Full Glare",             short:"FGlr", cp:10},
    {id:"ltFlashOther",  label:"Flash Other Sense",      short:"FOth", cp:0},
  ],
  "lightning-control": [
    {id:"ltnSilentGear", label:"Silent Gear Control",   short:"SGC",   cp:5},
    {id:"ltnSingleCmd",  label:"Single Command",        short:"1Cmd",  cp:-10},
  ],
  "magnetism": [
    {id:"magSingle",     label:"Single Target",         short:"1Tgt",  cp:-5},
    {id:"magMulti",      label:"Multi-Magnetics",       short:"Multi", cp:5},
  ],
  "mind-control": [
    {id:"mcSilent",      label:"Silent Mind Control",   short:"Slnt",  cp:5},
    {id:"mcSingleCmd",   label:"Single Command",        short:"1Cmd",  cp:-5},
  ],
  "non-corporeality": [
    {id:"ncCorporeal",   label:"Corporeal Ability",     short:"Corp",  cp:20},
  ],
  "paralysis-ray": [
    {id:"paraFrozen",    label:"Frozen",               short:"Frzn",   cp:0},
    {id:"paraStasis",    label:"Stasis",               short:"Stss",   cp:10},
    {id:"paraUnconsc",   label:"Unconscious",          short:"Unc",    cp:5},
    {id:"paraSpeak",     label:"Can Speak",            short:"Spk",    cp:-5},
  ],
  "physical-ability": [
    {id:"phyAmbidex",    label:"A) Ambidexterity (2.5)",          short:"Ambi", cp:0},
    {id:"phyAmbidexX2",  label:"A) Ambidex x2 Hands (+2.5)",     short:"Am2",  cp:2.5},
    {id:"phyExtraLimbs", label:"B) Extra Limbs (5/app)",          short:"XLmb", type:"number", min:1, max:5, def:1, step:1, hint:"x2 held objects, +1 Mass vs KB per app", cpFn:v=>0},
    {id:"phyInertia",    label:"C) Inertia (2.5/app)",            short:"Inrt", type:"number", min:1, max:10, def:1, step:1, hint:"+1 Mass vs KB per app", cpFn:v=>0},
    {id:"phyPrehFeet",   label:"D) Prehensile Feet (5)",          short:"PFt",  cp:0},
    {id:"phyProtBrain",  label:"E) Protected Brain (10)",         short:"PBrn", cp:0},
    {id:"phySuperLeap",  label:"F) Super Leap",                   short:"SLp",  cp:0},
    {id:"phySuperLungs", label:"G) Super Lungs (5)",              short:"SLng", cp:0},
    {id:"phyLungsX2",    label:"G) Super Lungs x2 (+5/app)",      short:"Ln2",  type:"number", min:1, max:5, def:1, step:1, hint:"x2 capacity per app", cpFn:v=>v*5},
    {id:"phySuperStom",  label:"H) Super Stomach (5)",            short:"SStm", cp:0},
    {id:"phyStomSR",     label:"H) Stomach +1 SR (+5/app)",       short:"StS",  type:"number", min:1, max:10, def:1, step:1, hint:"+1 max SR per app", cpFn:v=>v*5},
    {id:"phyStomX2",     label:"H) Stomach x2 Amt (+5/app)",      short:"St2",  type:"number", min:1, max:5, def:1, step:1, hint:"x2 amount per app", cpFn:v=>v*5},
    {id:"phyWallCrawl",  label:"I) Wall-Crawling (5)",            short:"WCrl", cp:0},
    {id:"phyWcStCling",  label:"I) WC: ST-Based Cling (+5)",      short:"StCl", cp:5},
    {id:"phyWcIncrCling",label:"I) WC: Increased Cling (+2.5/app)",short:"x2Cl",type:"number", min:1, max:5, def:1, step:1, hint:"x2 cling per app", cpFn:v=>v*2.5},
    {id:"phySwarm",      label:"J) Swarm (5, immune KO)",         short:"Swm",  cp:0},
  ],
  "possession": [
    {id:"posEmotional",  label:"Emotional Only",          short:"Emo",  cp:-5},
  ],
  "regeneration": [
    {id:"regenLimited1", label:"Limited (-2.5)",        short:"Ltd1",  cp:-2.5},
    {id:"regenLimited2", label:"Limited (-5)",          short:"Ltd2",  cp:-5},
    {id:"regenUnlimited",label:"Unlimited",             short:"Unlm",  cp:5},
    {id:"regenConstant", label:"Constant",              short:"Cnst",  cp:10},
    {id:"regenDeath1",   label:"Heal From Death (+5)",  short:"HlD1",  cp:5},
    {id:"regenDeath2",   label:"Heal From Death (+10)", short:"HlD2",  cp:10},
    {id:"regenPower",    label:"Power Regeneration",    short:"PwRg",  cp:0},
  ],
  "shape-shifting": [
    {id:"ssRealism1",    label:"Enhanced Realism (+5)",  short:"Rl+5", cp:5},
    {id:"ssRealism2",    label:"Enhanced Realism (+10)", short:"Rl10", cp:10},
    {id:"ssImpersonate", label:"Impersonation",          short:"Impr", cp:5},
  ],
  "shield": [
    {id:"shldParry",     label:"Parry Bonus",           short:"Prry",  type:"number", min:1, max:10, def:1, step:1, hint:"+2.5/pt, +1 Parry/pt", cpFn:v=>v*2.5},
    {id:"shldInnate",    label:"Innate",                short:"Innt",  cp:2.5},
  ],
  "size-change": [
    {id:"sizeMulti",     label:"Multiple Sizes",        short:"Multi", cp:5},
    {id:"sizeMassive",   label:"Massive",               short:"Mass",  cp:0},
  ],
  "sonic-abilities": [
    {id:"sonicLoud2",    label:"Louder Boom x2",        short:"Ld2",   cp:5},
    {id:"sonicLoud3",    label:"Louder Boom x3",        short:"Ld3",   cp:15},
    {id:"sonicOther",    label:"Other Sense",            short:"OSns",  cp:0},
  ],
  "speed": [
    {id:"spdAmphibious", label:"Amphibious",            short:"Amph",  cp:5},
    {id:"spdWaterRun",   label:"Water Running",          short:"WRun", cp:2.5},
    {id:"spdFastAccel",  label:"Fast Acceleration",      short:"FstA", type:"number", min:1, max:10, def:1, step:1, hint:"+2.5/app, x2 accel per 2 steps", cpFn:v=>v*2.5},
    {id:"spdFastSwim",   label:"Fast Swimming",           short:"FSwm", cp:0},
  ],
  "stretching-abilities": [
    {id:"strElongation",  label:"A) Elongation",           short:"Elong", cp:0},
    {id:"strFlattening",  label:"B) Flattening",           short:"Flat",  cp:0},
    {id:"strInflation",   label:"C) Inflation",            short:"Infl",  cp:0},
    {id:"strGrapple",     label:"D) Grappling Bonus",      short:"Grpl",  cp:0},
    {id:"strPlasticity",  label:"E) Plasticity (Kin prot)", short:"Plst", cp:0},
  ],
  "telekinesis": [
    {id:"tkSingle",      label:"Single Target",          short:"1Tgt", cp:-5},
    {id:"tkMulti",       label:"Multi-Kinesis",           short:"MltK", type:"number", min:1, max:5, def:1, step:1, hint:"+2.5/x2", cpFn:v=>v*2.5},
    {id:"tkFastManip",   label:"Fast Manipulation",       short:"Fast", cp:5},
  ],
  "teleportation": [
    {id:"tpGates",       label:"Gates",                  short:"Gate",  cp:0},
    {id:"tpSeeThrough",  label:"Gate See-Through",        short:"See", cp:5},
    {id:"tpPenFF",       label:"Penetrates Force Fields",  short:"PFF", cp:5},
    {id:"tpBeamPos",     label:"Teleport Beam (+5)",       short:"Bm+", cp:5},
    {id:"tpBeamNeg",     label:"Teleport Beam (-5)",       short:"Bm-", cp:-5},
  ],
  "transmutation": [
    {id:"transAlt",      label:"Alternate Transmutation", short:"Alt",  type:"number", min:1, max:10, def:1, step:1, hint:"+5 each", cpFn:v=>v*5},
  ],
  "tunneling": [
    {id:"tunCollapse",   label:"Collapse",               short:"Clps", cp:7.5},
    {id:"tunAlwaysClps", label:"Always Collapses",        short:"AClp", cp:0},
    {id:"tunWider",      label:"Wider Tunnel",            short:"Wdr",  type:"number", min:1, max:5, def:1, step:1, hint:"x2 width per app, +2.5 each", cpFn:v=>v*2.5},
    {id:"tunNarrower",   label:"Narrower Tunnel",         short:"Nrw",  type:"number", min:1, max:5, def:1, step:1, hint:"½ width per app, +2.5 each", cpFn:v=>v*2.5},
  ],
  "unprotection": [
    {id:"uprSpot",       label:"Unprotect Spot",          short:"Spot", cp:-10},
    {id:"uprAltType",    label:"Alternate Damage Type",   short:"Alt",  cp:0},
    {id:"uprMultiType",  label:"Multiple Damage Types",   short:"Mlt",  cp:0},
    {id:"uprSubType",    label:"Affects Damage Sub-Type", short:"Sub",  cp:-5},
    {id:"uprSpecific",   label:"Affects Specific Form",   short:"Spc",  cp:-7.5},
  ],
  "weather-control": [
    {id:"wcLimited",     label:"Limited Weather Types",   short:"Ltd",  type:"number", min:1, max:5, def:1, step:1, hint:"-2.5/type removed", cpFn:v=>-(v*2.5)},
  ],
  "weakness-detection": [
    {id:"wdStructural",  label:"Structural Weakness",     short:"Strc", cp:0},
  ],
};
// Sensor Suite uses same modifiers as Heightened Senses
MP.ABILITY_MODIFIERS["sensor-suite"] = MP.ABILITY_MODIFIERS["heightened-senses"];
MP.WEAKNESSES = [
  { id:"diminished-senses",  name:"Diminished Senses",  cpMod:-5,  desc:"Reduced sensory capability" },
  { id:"distinctive",        name:"Distinctive",        cpMod:-5,  desc:"Easily identified or tracked" },
  { id:"frailty",            name:"Frailty",            cpMod:-1,  desc:"-1 HP per application" },
  { id:"hemophilia",         name:"Hemophilia",         cpMod:-5,  desc:"Sharp Kinetic causes 1 Other (Bleeding)/rnd" },
  { id:"low-energy",         name:"Low Energy",         cpMod:-2.5,desc:"-5 Power per application" },
  { id:"low-self-control",   name:"Low Self-Control",   cpMod:-5,  desc:"Compulsive behavior" },
  { id:"lsc-anti-reflect",   name:"LSC: Anti-Reflection",cpMod:-10,desc:"25% chance attacks self or target gets defensive ability" },
  { id:"lsc-split-personality",name:"LSC: Split Personality",cpMod:-5,desc:"Random alt personality, req -2.5 mental weakness" },
  { id:"lowered-intelligence",name:"Lowered Intelligence",cpMod:-2.5,desc:"-1 IN per application" },
  { id:"nemesis",            name:"Nemesis",            cpMod:-5,  desc:"Recurring enemy" },
  { id:"obvious",            name:"Obvious",            cpMod:-5,  desc:"Always on, worth x2 CPs vs Limitation" },
  { id:"personal-problem",   name:"Personal Problem",   cpMod:-5,  desc:"Ongoing personal issue" },
  { id:"phobia",             name:"Phobia",             cpMod:-5,  desc:"Irrational fear" },
  { id:"physical-disability",name:"Physical Disability",cpMod:-5,  desc:"Structural flaw or limitation" },
  { id:"poverty",            name:"Poverty",            cpMod:-5,  desc:"Lack of resources" },
  { id:"prejudice",          name:"Prejudice",          cpMod:-5,  desc:"Discriminated against" },
  { id:"psychosis",          name:"Psychosis",          cpMod:-5,  desc:"Mental disorder" },
  { id:"reduced-ag",         name:"Reduced Agility",    cpMod:-2.5,desc:"-1 AG per application" },
  { id:"reduced-cl",         name:"Reduced Cool",       cpMod:-2.5,desc:"-1 CL per application" },
  { id:"reduced-en",         name:"Reduced Endurance",  cpMod:-2.5,desc:"-1 EN per application" },
  { id:"reduced-st",         name:"Reduced Strength",   cpMod:-2.5,desc:"-1 ST per application" },
  { id:"special-requirement",name:"Special Requirement",cpMod:-5,  desc:"Needs fuel, sunlight, etc." },
  { id:"surplus-arm",       name:"Surplus Arm",        cpMod:-2.5,desc:"-1 AG save per arm, can replace disabled arm" },
  { id:"susceptibility",     name:"Susceptibility",     cpMod:-5,  desc:"Takes extra damage from a source" },
  { id:"uneducated",         name:"Uneducated",         cpMod:-5,  desc:"Lack of formal education" },
  { id:"unliving",           name:"Unliving",           cpMod:-5,  desc:"Not alive (construct, undead)" },
  { id:"vulnerability",      name:"Vulnerability",      cpMod:-10, desc:"Major weakness to a damage type" },
];

// ---- System Modifiers ----
MP.MODIFIERS = [
  { id:"integral",     name:"Integral",       cpMod:"half",    desc:"Hidden, can't be targeted. Half CPs." },
  { id:"bulky",        name:"Bulky",          cpMod:2.5,       desc:"+4.3 Hits per app. +2.5 CP." },
  { id:"delicate",     name:"Delicate",       cpMod:-2.5,      desc:"-4.3 Hits per app. -2.5 CP." },
  { id:"gear",         name:"Gear",           cpMod:0,         desc:"Removable/breakable." },
  { id:"indep-power",  name:"Indep. Power",   cpMod:0,         desc:"Own 10 Power, independent." },
  { id:"no-arc",       name:"No Arc",         cpMod:-10,       desc:"Straight line only. -10 CP." },
  { id:"wide-240",     name:"Wide 240°",      cpMod:5,         desc:"240° arc. +5 CP." },
  { id:"wide-360",     name:"Wide 360°",      cpMod:10,        desc:"360° arc. +10 CP." },
  { id:"open",         name:"Open System",    cpMod:"quarter",  desc:"Passable, 1/4 CPs." },
  { id:"wont-explode", name:"Won't Explode",  cpMod:5,         desc:"+5 CP. Indep won't explode." },
];

MP.ARCS = ["Forward","Back","Fwd/Right","Fwd/Left","Back/Right","Back/Left"];

// ---- Ability Modifier Tables (from MP rulebook 2.2.4) ----

// Area Effect diameter steps — move down = +2.5 CP, move up = -2.5 CP
// Default (0 CP adj) = ½" / Single Target
MP.AREA_EFFECT_STEPS = [
  {label:'½" / Single', cp:0},
  {label:'1"',  cp:2.5},
  {label:'3"',  cp:5},
  {label:'5"',  cp:7.5},
  {label:'7"',  cp:10},
  {label:'9"',  cp:12.5},
  {label:'11"', cp:15},
  {label:'15"', cp:17.5},
  {label:'19"', cp:20},
  {label:'23"', cp:22.5},
  {label:'27"', cp:25},
  {label:'33"', cp:27.5},
  {label:'39"', cp:30},
  {label:'45"', cp:32.5},
  {label:'51"', cp:35},
  {label:'59"', cp:37.5},
  {label:'67"', cp:40},
  {label:'75"', cp:42.5},
  {label:'83"', cp:45},
  {label:'93"', cp:47.5},
];

// Armor Piercing — from rulebook 2.2.4
MP.ARMOR_PIERCING_STEPS = [
  {label:'None',   cp:0,    val:0},
  {label:'2 pts',  cp:2.5,  val:2},
  {label:'3 pts',  cp:5,    val:3},
  {label:'5 pts',  cp:7.5,  val:5},
  {label:'6 pts',  cp:10,   val:6},
  {label:'8 pts',  cp:12.5, val:8},
  {label:'9 pts',  cp:15,   val:9},
  {label:'11 pts', cp:17.5, val:11},
  {label:'12 pts', cp:20,   val:12},
  {label:'14 pts', cp:22.5, val:14},
  {label:'15 pts', cp:25,   val:15},
  {label:'17 pts', cp:27.5, val:17},
  {label:'18 pts', cp:30,   val:18},
  {label:'20 pts', cp:32.5, val:20},
  {label:'21 pts', cp:35,   val:21},
  {label:'23 pts', cp:37.5, val:23},
  {label:'24 pts', cp:40,   val:24},
  {label:'26 pts', cp:42.5, val:26},
  {label:'27 pts', cp:45,   val:27},
  {label:'29 pts', cp:47.5, val:29},
  {label:'30 pts', cp:50,   val:30},
];

// Autofire — Rate of Fire 2-7, cost adjustment
MP.AUTOFIRE_STEPS = [
  {label:'None', cp:0,   rof:0},
  {label:'RoF 2',cp:7.5, rof:2},
  {label:'RoF 3',cp:15,  rof:3},
  {label:'RoF 4',cp:22.5,rof:4},
  {label:'RoF 5',cp:30,  rof:5},
  {label:'RoF 6',cp:37.5,rof:6},
  {label:'RoF 7',cp:45,  rof:7},
];

// Duration — sliding scale, each step ±2.5 CPs
// Default is "1 Round/Instant" (index 0, 0 CP)
MP.DURATION_STEPS = [
  {label:'1 Round/Instant', cp:0},
  {label:'2 Rounds',        cp:2.5},
  {label:'3 Rounds',        cp:5},
  {label:'1 Minute',        cp:7.5},
  {label:'5 Minutes',       cp:10},
  {label:'20 Minutes',      cp:12.5},
  {label:'1 Hour',          cp:15},
  {label:'3 Hours',         cp:17.5},
  {label:'10 Hours',        cp:20},
  {label:'1.5 Days',        cp:22.5},
  {label:'3.5 Days',        cp:25},
  {label:'1.5 Weeks',       cp:27.5},
  {label:'1 Month',         cp:30},
  {label:'3 Months',        cp:32.5},
  {label:'1 Year',          cp:35},
  {label:'3 Years',         cp:37.5},
  {label:'10 Years',        cp:40},
  {label:'33 Years',        cp:42.5},
  {label:'100 Years',       cp:45},
];

// Hardened — protection modifier, +2.5 CPs per 3 points
MP.HARDENED_STEPS = [
  {label:'None',    cp:0,    val:0},
  {label:'3 pts',   cp:2.5,  val:3},
  {label:'6 pts',   cp:5,    val:6},
  {label:'9 pts',   cp:7.5,  val:9},
  {label:'12 pts',  cp:10,   val:12},
  {label:'15 pts',  cp:12.5, val:15},
  {label:'18 pts',  cp:15,   val:18},
  {label:'21 pts',  cp:17.5, val:21},
  {label:'24 pts',  cp:20,   val:24},
  {label:'27 pts',  cp:22.5, val:27},
  {label:'30 pts',  cp:25,   val:30},
];

// PR & Charges scale (from rulebook 2.2.4)
// Each step = ±2.5 CPs. Free to switch between PR and Charges columns.
// idx 0 = top (best: PR 0 / unlimited), higher idx = worse
MP.PR_CHARGES_SCALE = [
  {pr:0,   charges:"Unlimited",  label:"PR 0 / Unlimited"},
  {pr:1,   charges:"24",         label:"PR 1 / 24 ch"},
  {pr:2,   charges:"12",         label:"PR 2 / 12 ch"},
  {pr:3,   charges:"8",          label:"PR 3 / 8 ch"},
  {pr:4,   charges:"6",          label:"PR 4 / 6 ch"},
  {pr:5,   charges:"4",          label:"PR 5 / 4 ch"},
  {pr:8,   charges:"3",          label:"PR 8 / 3 ch"},
  {pr:12,  charges:"2",          label:"PR 12 / 2 ch"},
  {pr:16,  charges:"1+50%",      label:"PR 16 / 1+50%"},
  {pr:24,  charges:"1",          label:"PR 24 / 1 ch"},
  {pr:32,  charges:"75%",        label:"PR 32 / 75%"},
  {pr:48,  charges:"50%",        label:"PR 48 / 50%"},
  {pr:64,  charges:"38%",        label:"PR 64 / 38%"},
  {pr:96,  charges:"25%",        label:"PR 96 / 25%"},
  {pr:128, charges:"19%",        label:"PR 128 / 19%"},
  {pr:192, charges:"13%",        label:"PR 192 / 13%"},
];

MP.prScaleIndex = function(basePR) {
  for (let i = 0; i < MP.PR_CHARGES_SCALE.length; i++) {
    if (MP.PR_CHARGES_SCALE[i].pr >= basePR) return i;
  }
  return MP.PR_CHARGES_SCALE.length - 1;
};

// Build PR-only dropdown options
MP.buildPROptions = function(basePR) {
  const baseIdx = MP.prScaleIndex(basePR);
  const opts = [];
  for (let i = 0; i < MP.PR_CHARGES_SCALE.length; i++) {
    const steps = baseIdx - i;
    const cp = steps * 2.5;
    const row = MP.PR_CHARGES_SCALE[i];
    const cpStr = cp === 0 ? "base" : (cp > 0 ? "+" + cp : String(cp));
    opts.push({ label: "PR " + row.pr + " (" + cpStr + ")", cp, idx: i });
  }
  return opts;
};

// Build Charges-only dropdown options
MP.buildChargesOptions = function(basePR) {
  const baseIdx = MP.prScaleIndex(basePR);
  const opts = [];
  for (let i = 0; i < MP.PR_CHARGES_SCALE.length; i++) {
    const steps = baseIdx - i;
    const cp = steps * 2.5;
    const row = MP.PR_CHARGES_SCALE[i];
    const cpStr = cp === 0 ? "base" : (cp > 0 ? "+" + cp : String(cp));
    opts.push({ label: row.charges + " ch (" + cpStr + ")", cp, idx: i });
  }
  return opts;
};

// Legacy compat
MP.buildPRChargesOptions = MP.buildPROptions;

// Time Requirement scale (from rulebook 2.2.4)
MP.TIME_REQ_STEPS = [
  {label:"No Time"},
  {label:'1" Movement'},
  {label:"1 Phase"},
  {label:"1 Round"},
  {label:"2 Rounds"},
  {label:"3 Rounds"},
  {label:"1 Minute"},
  {label:"5 Minutes"},
  {label:"20 Minutes"},
  {label:"1 Hour"},
  {label:"3 Hours"},
  {label:"10 Hours"},
  {label:"1.5 Days"},
  {label:"3.5 Days"},
  {label:"1.5 Weeks"},
  {label:"1 Month"},
];

// Range sliding scale (from rulebook)
// Each step = ±2.5 CPs. Moving UP (longer range) = +2.5. Moving DOWN (shorter) = -2.5.
// idx 0 = top (Line of Sight), higher idx = shorter range
MP.RANGE_SCALE = [
  {label:"Line of Sight",    idx:0},
  {label:"Voice",            idx:1},
  {label:"BCx16\"",          idx:2},
  {label:"BCx8\"",           idx:3},
  {label:"BCx4\"",           idx:4},
  {label:"BCx2\"",           idx:5},
  {label:"BCx1\"",           idx:6},
  {label:"BC/2\"",           idx:7},
  {label:"BC/4\"",           idx:8},
  {label:"1\"",              idx:9},
  {label:"Touch/Melee",      idx:10},
];

// Find the index in RANGE_SCALE for a given base range label
MP.rangeScaleIndex = function(baseLabel) {
  for (let i = 0; i < MP.RANGE_SCALE.length; i++) {
    if (MP.RANGE_SCALE[i].label === baseLabel) return i;
  }
  return 6; // default BCx1"
};

// Build dropdown options for Range given a base range label
MP.buildRangeOptions = function(baseLabel) {
  const baseIdx = MP.rangeScaleIndex(baseLabel);
  const opts = [];
  for (let i = 0; i < MP.RANGE_SCALE.length; i++) {
    const steps = baseIdx - i; // positive = moved up (longer), negative = moved down (shorter)
    const cp = steps * 2.5;
    const row = MP.RANGE_SCALE[i];
    const cpStr = cp === 0 ? "base" : (cp > 0 ? "+" + cp : String(cp));
    opts.push({
      label: row.label + " (" + cpStr + ")",
      cp: cp,
      idx: i,
      rangeLabel: row.label
    });
  }
  return opts;
};

// ---- BC Table (from rulebook 2.1.7.2) ----
// Each entry: [minScore, carry, hth, save, init]
MP.BC_TABLE = [
  [0,  8,             "d2-1",    6,  "d2-1"],
  [1,  10,            "d2-1",    7,  "d2-1"],
  [2,  12,            "d2-1",    7,  "d2-1"],
  [3,  15,            "d2",      8,  "d2"],
  [6,  30,            "d3",      9,  "d3"],
  [9,  60,            "d4",      10, "d4"],
  [12, 120,           "d6",      11, "d6"],
  [15, 240,           "d6+1",    11, "d6+1"],
  [18, 480,           "d8+1",    12, "d8+1"],
  [21, 960,           "d10+1",   12, "d10+1"],
  [24, 1920,          "2d6",     13, "2d6"],
  [27, 3840,          "d6+d8",   13, "d6+d8"],
  [30, 7680,          "2d8",     14, "2d8"],
  [33, 15360,         "d8+d10",  14, "d8+d10"],
  [36, 30720,         "2d10",    15, "2d10"],
  [39, 61440,         "d10+d12", 15, "d10+d12"],
  [42, 122880,        "2d12",    16, "2d12"],
  [45, 245760,        "3d8",     16, "3d8"],
  [48, 491520,        "2d8+d10", 17, "2d8+d10"],
  [51, 983040,        "d8+2d10", 17, "d8+2d10"],
  [54, 1966080,       "3d10",    18, "3d10"],
  [57, 3932160,       "2d10+d12",18, "2d10+d12"],
  [60, 7864320,       "d10+2d12",19, "d10+2d12"],
  [63, 15728640,      "3d12",    19, "3d12"],
  [66, 31457280,      "3d12+1",  20, "3d12+1"],
  [69, 62914560,      "3d12+2",  20, "3d12+2"],
  [72, 125829120,     "4d10",    21, "4d10"],
  [75, 251658240,     "3d10+d12",21, "3d10+d12"],
  [78, 503316480,     "2d10+2d12",22,"2d10+2d12"],
  [81, 1006632960,    "d10+3d12",22, "d10+3d12"],
  [84, 2013265920,    "4d12",    23, "4d12"],
  [87, 4026531840,    "4d12+1",  23, "4d12+1"],
  [90, 8053063680,    "5d10",    24, "5d10"],
  [93, 16106127360,   "4d10+d12",24, "4d10+d12"],
  [96, 32212254720,   "3d10+2d12",25,"3d10+2d12"],
];

MP._bcLookup = function(score) {
  for (let i = MP.BC_TABLE.length - 1; i >= 0; i--) {
    if (score >= MP.BC_TABLE[i][0]) return MP.BC_TABLE[i];
  }
  return MP.BC_TABLE[0];
};

// Save number for any BC score (ST, EN, AG, IN, CL all use same column)
MP.save = function(score) {
  return MP._bcLookup(score)[3];
};

// Base HTH Damage from ST
MP.hthDamage = function(st) {
  return MP._bcLookup(st)[2];
};

// Initiative die from CL score (uses init column, which matches CL save)
MP.initDie = function(cl) {
  return MP._bcLookup(cl)[4];
};

// Carrying Capacity from ST
MP.carry = function(st) {
  const lbs = MP._bcLookup(st)[1];
  if (lbs >= 1000000000) return (lbs / 1000000000).toFixed(1) + "B lbs";
  if (lbs >= 1000000) return (lbs / 1000000).toFixed(1) + "M lbs";
  if (lbs >= 1000) return (lbs / 1000).toFixed(1) + "K lbs";
  return lbs + " lbs";
};

// ---- Vehicle Templates ----
MP.TEMPLATES = [
  {
    name:"Motorcycle", basicCost:10, techMod:0, maneuverMod:5, wontExplode:false, isBase:false,
    systems:[
      {spaces:1, desc:"Control Seat", extraCPs:0, cells:[{gx:0,gy:0}]},
      {spaces:4, desc:"Speed: 64/256, 87 mph, PR=1", extraCPs:0, cells:[{gx:1,gy:0},{gx:2,gy:0},{gx:3,gy:0},{gx:4,gy:0}]},
    ]
  },
  {
    name:"Compact Car", basicCost:15, techMod:0, maneuverMod:0, wontExplode:false, isBase:false,
    systems:[
      {spaces:1, desc:"Control Seat", extraCPs:0, cells:[{gx:1,gy:0}]},
      {spaces:3, desc:"Passenger Seats (3)", extraCPs:0, cells:[{gx:2,gy:0},{gx:1,gy:1},{gx:2,gy:1}]},
      {spaces:4, desc:"Speed: 64/256, 87 mph, PR=1", extraCPs:0, cells:[{gx:0,gy:2},{gx:1,gy:2},{gx:2,gy:2},{gx:3,gy:2}]},
      {spaces:4, desc:"Cargo / Trunk", extraCPs:0, cells:[{gx:0,gy:3},{gx:1,gy:3},{gx:2,gy:3},{gx:3,gy:3}]},
    ]
  },
  {
    name:"Sedan", basicCost:17.5, techMod:0, maneuverMod:0, wontExplode:false, isBase:false,
    systems:[
      {spaces:1, desc:"Control Seat", extraCPs:0, cells:[{gx:1,gy:0}]},
      {spaces:4, desc:"Passenger Seats (4)", extraCPs:0, cells:[{gx:2,gy:0},{gx:0,gy:1},{gx:1,gy:1},{gx:2,gy:1}]},
      {spaces:6, desc:"Speed: 64/256, 87 mph, PR=1", extraCPs:0, cells:[{gx:0,gy:2},{gx:1,gy:2},{gx:2,gy:2},{gx:3,gy:2},{gx:0,gy:3},{gx:1,gy:3}]},
      {spaces:4, desc:"Cargo / Trunk", extraCPs:0, cells:[{gx:0,gy:4},{gx:1,gy:4},{gx:2,gy:4},{gx:3,gy:4}]},
    ]
  },
  {
    name:"Pickup Truck", basicCost:20, techMod:0, maneuverMod:-5, wontExplode:false, isBase:false,
    systems:[
      {spaces:1, desc:"Control Seat", extraCPs:0, cells:[{gx:1,gy:0}]},
      {spaces:2, desc:"Passenger Seats (2)", extraCPs:0, cells:[{gx:2,gy:0},{gx:1,gy:1}]},
      {spaces:6, desc:"Speed: 64/256, 87 mph, PR=1", extraCPs:0, cells:[{gx:0,gy:2},{gx:1,gy:2},{gx:2,gy:2},{gx:3,gy:2},{gx:0,gy:3},{gx:1,gy:3}]},
      {spaces:12, desc:"Cargo / Truck Bed", extraCPs:0, cells:[{gx:0,gy:4},{gx:1,gy:4},{gx:2,gy:4},{gx:3,gy:4},{gx:0,gy:5},{gx:1,gy:5},{gx:2,gy:5},{gx:3,gy:5},{gx:0,gy:6},{gx:1,gy:6},{gx:2,gy:6},{gx:3,gy:6}]},
    ]
  },
  {
    name:"Semi Truck", basicCost:25, techMod:0, maneuverMod:-10, wontExplode:false, isBase:false,
    systems:[
      {spaces:1, desc:"Control Seat", extraCPs:0, cells:[{gx:1,gy:0}]},
      {spaces:1, desc:"Passenger Seat", extraCPs:0, cells:[{gx:2,gy:0}]},
      {spaces:1, desc:"Bunk", extraCPs:0, cells:[{gx:1,gy:1}]},
      {spaces:12, desc:"Speed: 48/192, 66 mph, PR=1", extraCPs:0, cells:[{gx:0,gy:2},{gx:1,gy:2},{gx:2,gy:2},{gx:3,gy:2},{gx:0,gy:3},{gx:1,gy:3},{gx:2,gy:3},{gx:3,gy:3},{gx:0,gy:4},{gx:1,gy:4},{gx:2,gy:4},{gx:3,gy:4}]},
      {spaces:32, desc:"Cargo / Trailer", extraCPs:0, open:true, cells:[
        {gx:0,gy:6},{gx:1,gy:6},{gx:2,gy:6},{gx:3,gy:6},{gx:4,gy:6},{gx:5,gy:6},{gx:6,gy:6},{gx:7,gy:6},
        {gx:0,gy:7},{gx:1,gy:7},{gx:2,gy:7},{gx:3,gy:7},{gx:4,gy:7},{gx:5,gy:7},{gx:6,gy:7},{gx:7,gy:7},
        {gx:0,gy:8},{gx:1,gy:8},{gx:2,gy:8},{gx:3,gy:8},{gx:4,gy:8},{gx:5,gy:8},{gx:6,gy:8},{gx:7,gy:8},
        {gx:0,gy:9},{gx:1,gy:9},{gx:2,gy:9},{gx:3,gy:9},{gx:4,gy:9},{gx:5,gy:9},{gx:6,gy:9},{gx:7,gy:9}]},
    ]
  },
  {
    name:"Helicopter", basicCost:20, techMod:5, maneuverMod:5, wontExplode:false, isBase:false,
    systems:[
      {spaces:1, desc:"Control Seat (Pilot)", extraCPs:0, cells:[{gx:1,gy:0}]},
      {spaces:1, desc:"Control Seat (Co-Pilot)", extraCPs:0, cells:[{gx:2,gy:0}]},
      {spaces:4, desc:"Passenger Seats (4)", extraCPs:0, cells:[{gx:0,gy:1},{gx:1,gy:1},{gx:2,gy:1},{gx:3,gy:1}]},
      {spaces:8, desc:"Flight: 48/192, 131 mph, PR=1", extraCPs:0, cells:[{gx:0,gy:3},{gx:1,gy:3},{gx:2,gy:3},{gx:3,gy:3},{gx:0,gy:4},{gx:1,gy:4},{gx:2,gy:4},{gx:3,gy:4}]},
      {spaces:4, desc:"Cargo", extraCPs:0, cells:[{gx:0,gy:2},{gx:1,gy:2},{gx:2,gy:2},{gx:3,gy:2}]},
      {spaces:1, desc:"Sensor Suite (Radar)", extraCPs:0, cells:[{gx:0,gy:0}]},
      {spaces:1, desc:"Communicators", extraCPs:0, cells:[{gx:3,gy:0}]},
    ]
  },
  {
    name:"Fighter Jet", basicCost:25, techMod:10, maneuverMod:0, wontExplode:false, isBase:false,
    systems:[
      {spaces:1, desc:"Control Seat (Ejection)", extraCPs:0, cells:[{gx:1,gy:1}]},
      {spaces:16, desc:"Flight: 384/1536, 523 mph, PR=1", extraCPs:0, cells:[
        {gx:0,gy:3},{gx:1,gy:3},{gx:2,gy:3},{gx:3,gy:3},{gx:0,gy:4},{gx:1,gy:4},{gx:2,gy:4},{gx:3,gy:4},
        {gx:0,gy:5},{gx:1,gy:5},{gx:2,gy:5},{gx:3,gy:5},{gx:0,gy:6},{gx:1,gy:6},{gx:2,gy:6},{gx:3,gy:6}]},
      {spaces:4, desc:"Energy Blast", extraCPs:0, cells:[{gx:0,gy:2},{gx:1,gy:2},{gx:2,gy:2},{gx:3,gy:2}]},
      {spaces:2, desc:"Sensor Suite (Radar/IR)", extraCPs:0, cells:[{gx:0,gy:0},{gx:1,gy:0}]},
      {spaces:1, desc:"Communicators", extraCPs:0, cells:[{gx:2,gy:0}]},
      {spaces:1, desc:"Countermeasures (Chaff/Flare)", extraCPs:0, cells:[{gx:2,gy:1}]},
    ]
  },
  {
    name:"Speedboat", basicCost:17.5, techMod:0, maneuverMod:5, wontExplode:false, isBase:false,
    systems:[
      {spaces:1, desc:"Control Seat", extraCPs:0, cells:[{gx:1,gy:0}]},
      {spaces:3, desc:"Passenger Seats (3)", extraCPs:0, cells:[{gx:2,gy:0},{gx:1,gy:1},{gx:2,gy:1}]},
      {spaces:6, desc:"Speed (Fast Swimming): 64/256, 87 mph, PR=1", extraCPs:0, cells:[{gx:0,gy:2},{gx:1,gy:2},{gx:2,gy:2},{gx:3,gy:2},{gx:0,gy:3},{gx:1,gy:3}]},
      {spaces:4, desc:"Cargo", extraCPs:0, cells:[{gx:0,gy:4},{gx:1,gy:4},{gx:2,gy:4},{gx:3,gy:4}]},
    ]
  },
  {
    name:"Tank", basicCost:30, techMod:5, maneuverMod:-10, wontExplode:true, isBase:false,
    systems:[
      {spaces:1, desc:"Control Seat (Driver)", extraCPs:0, cells:[{gx:1,gy:0}]},
      {spaces:1, desc:"Control Seat (Commander)", extraCPs:0, cells:[{gx:4,gy:0}]},
      {spaces:1, desc:"Control Seat (Gunner)", extraCPs:0, cells:[{gx:3,gy:1}]},
      {spaces:1, desc:"Control Seat (Loader)", extraCPs:0, cells:[{gx:4,gy:1}]},
      {spaces:16, desc:"Speed: 32/128, 44 mph, PR=1", extraCPs:0, cells:[
        {gx:0,gy:3},{gx:1,gy:3},{gx:2,gy:3},{gx:3,gy:3},{gx:4,gy:3},{gx:5,gy:3},
        {gx:0,gy:4},{gx:1,gy:4},{gx:2,gy:4},{gx:3,gy:4},{gx:4,gy:4},{gx:5,gy:4},
        {gx:1,gy:5},{gx:2,gy:5},{gx:3,gy:5},{gx:4,gy:5}]},
      {spaces:8, desc:"Power Blast, Fwd Arc", extraCPs:0, cells:[
        {gx:0,gy:0},{gx:2,gy:0},{gx:3,gy:0},{gx:5,gy:0},
        {gx:0,gy:1},{gx:1,gy:1},{gx:2,gy:1},{gx:5,gy:1}]},
      {spaces:2, desc:"Energy Blast, turret 360\u00b0", extraCPs:0, cells:[{gx:2,gy:2},{gx:3,gy:2}]},
      {spaces:16, desc:"Armor, Integral", extraCPs:0, integral:true},
      {spaces:2, desc:"Sensor Suite (IR/Thermal)", extraCPs:0, cells:[{gx:0,gy:2},{gx:1,gy:2}]},
      {spaces:1, desc:"Communicators", extraCPs:0, cells:[{gx:4,gy:2}]},
      {spaces:4, desc:"Spare Parts", extraCPs:0, cells:[{gx:5,gy:2},{gx:5,gy:5},{gx:0,gy:5},{gx:0,gy:6}]},
    ]
  },
  {
    name:"APC", basicCost:25, techMod:5, maneuverMod:-5, wontExplode:false, isBase:false,
    systems:[
      {spaces:1, desc:"Control Seat (Driver)", extraCPs:0, cells:[{gx:1,gy:0}]},
      {spaces:1, desc:"Control Seat (Commander)", extraCPs:0, cells:[{gx:2,gy:0}]},
      {spaces:8, desc:"Passenger Seats (8 troops)", extraCPs:0, cells:[
        {gx:0,gy:1},{gx:1,gy:1},{gx:2,gy:1},{gx:3,gy:1},
        {gx:0,gy:2},{gx:1,gy:2},{gx:2,gy:2},{gx:3,gy:2}]},
      {spaces:12, desc:"Speed: 32/128, 44 mph, PR=1", extraCPs:0, cells:[
        {gx:0,gy:4},{gx:1,gy:4},{gx:2,gy:4},{gx:3,gy:4},
        {gx:0,gy:5},{gx:1,gy:5},{gx:2,gy:5},{gx:3,gy:5},
        {gx:0,gy:6},{gx:1,gy:6},{gx:2,gy:6},{gx:3,gy:6}]},
      {spaces:4, desc:"Energy Blast, turret 360\u00b0", extraCPs:0, cells:[{gx:0,gy:0},{gx:3,gy:0},{gx:0,gy:3},{gx:1,gy:3}]},
      {spaces:8, desc:"Armor, Integral", extraCPs:0, integral:true},
      {spaces:2, desc:"Sensor Suite", extraCPs:0, cells:[{gx:2,gy:3},{gx:3,gy:3}]},
      {spaces:1, desc:"Communicators", extraCPs:0, cells:[{gx:0,gy:7}]},
      {spaces:4, desc:"Cargo / Ammo", extraCPs:0, cells:[{gx:1,gy:7},{gx:2,gy:7},{gx:3,gy:7},{gx:0,gy:8}]},
    ]
  },
  {
    name:"Space Shuttle", basicCost:35, techMod:10, maneuverMod:0, wontExplode:false, isBase:false,
    systems:[
      {spaces:2, desc:"Control Seats (Pilot/Co-Pilot)", extraCPs:0, cells:[{gx:2,gy:0},{gx:3,gy:0}]},
      {spaces:4, desc:"Passenger Seats (4 crew)", extraCPs:0, cells:[{gx:1,gy:1},{gx:2,gy:1},{gx:3,gy:1},{gx:4,gy:1}]},
      {spaces:32, desc:"Flight: 1024/4096, 1393 mph, PR=1", extraCPs:0, cells:[
        {gx:0,gy:4},{gx:1,gy:4},{gx:2,gy:4},{gx:3,gy:4},{gx:4,gy:4},{gx:5,gy:4},
        {gx:0,gy:5},{gx:1,gy:5},{gx:2,gy:5},{gx:3,gy:5},{gx:4,gy:5},{gx:5,gy:5},
        {gx:0,gy:6},{gx:1,gy:6},{gx:2,gy:6},{gx:3,gy:6},{gx:4,gy:6},{gx:5,gy:6},
        {gx:0,gy:7},{gx:1,gy:7},{gx:2,gy:7},{gx:3,gy:7},{gx:4,gy:7},{gx:5,gy:7},
        {gx:0,gy:8},{gx:1,gy:8},{gx:2,gy:8},{gx:3,gy:8},{gx:4,gy:8},{gx:5,gy:8},
        {gx:2,gy:9},{gx:3,gy:9}]},
      {spaces:16, desc:"Cargo Bay", extraCPs:0, open:true, cells:[
        {gx:1,gy:2},{gx:2,gy:2},{gx:3,gy:2},{gx:4,gy:2},
        {gx:1,gy:3},{gx:2,gy:3},{gx:3,gy:3},{gx:4,gy:3},
        {gx:0,gy:2},{gx:5,gy:2},{gx:0,gy:3},{gx:5,gy:3},
        {gx:0,gy:9},{gx:1,gy:9},{gx:4,gy:9},{gx:5,gy:9}]},
      {spaces:4, desc:"Life Support", extraCPs:0, cells:[{gx:0,gy:0},{gx:1,gy:0},{gx:4,gy:0},{gx:5,gy:0}]},
      {spaces:4, desc:"Sensor Suite (Full Spectrum)", extraCPs:0, cells:[{gx:0,gy:1},{gx:5,gy:1},{gx:0,gy:10},{gx:5,gy:10}]},
      {spaces:2, desc:"Communicators Array", extraCPs:0, cells:[{gx:1,gy:10},{gx:4,gy:10}]},
      {spaces:2, desc:"Spare Parts", extraCPs:0, cells:[{gx:2,gy:10},{gx:3,gy:10}]},
    ]
  },
  {
    name:"Yacht", basicCost:27.5, techMod:5, maneuverMod:0, wontExplode:false, isBase:false,
    systems:[
      {spaces:1, desc:"Control Seat (Helm)", extraCPs:0, cells:[{gx:2,gy:0}]},
      {spaces:6, desc:"Passenger Seats / Lounge", extraCPs:0, cells:[{gx:0,gy:1},{gx:1,gy:1},{gx:2,gy:1},{gx:3,gy:1},{gx:4,gy:1},{gx:0,gy:2}]},
      {spaces:4, desc:"Bunks (4, double)", extraCPs:0, cells:[{gx:1,gy:2},{gx:2,gy:2},{gx:3,gy:2},{gx:4,gy:2}]},
      {spaces:12, desc:"Speed (Fast Swimming): 24/96, 33 mph, PR=1", extraCPs:0, cells:[
        {gx:0,gy:4},{gx:1,gy:4},{gx:2,gy:4},{gx:3,gy:4},{gx:4,gy:4},
        {gx:0,gy:5},{gx:1,gy:5},{gx:2,gy:5},{gx:3,gy:5},{gx:4,gy:5},
        {gx:1,gy:6},{gx:3,gy:6}]},
      {spaces:8, desc:"Cargo / Storage", extraCPs:0, cells:[
        {gx:0,gy:3},{gx:1,gy:3},{gx:2,gy:3},{gx:3,gy:3},{gx:4,gy:3},
        {gx:0,gy:6},{gx:2,gy:6},{gx:4,gy:6}]},
      {spaces:2, desc:"Sensor Suite (Radar/Sonar)", extraCPs:0, cells:[{gx:0,gy:0},{gx:4,gy:0}]},
      {spaces:1, desc:"Communicators", extraCPs:0, cells:[{gx:1,gy:0}]},
    ]
  },
];

// ---- System Color Categories (for layout canvas) ----
MP.SYS_COLORS = {
  movement:   { color: "#d89040", label: "Movement",    keywords: ["flight","speed","tunneling","teleport","super speed","gliding","bridge travel"] },
  weapon:     { color: "#c03838", label: "Weapon",       keywords: ["blast","attack","weapon","gun","cannon","missile","torpedo","laser","disintegrat","flame","ice abilit","lightning","sonic","chemical","death touch","natural weapon","grapnel","inertia","possession","unprotection","change environment"] },
  crew:       { color: "#5080a0", label: "Crew",         keywords: ["control seat","passenger","bunk","seat","pilot","co-pilot","driver","gunner","commander","loader","crew"] },
  sensor:     { color: "#7050a0", label: "Sensor",       keywords: ["sensor","radar","sonar","countermeasure","navigation","heightened sense"] },
  comms:      { color: "#60c0d0", label: "Comms",        keywords: ["communicat","comms","radio","beacon","signal"] },
  brain:      { color: "#b060a0", label: "AI/Brain",     keywords: ["robot brain","automation","computer","ai "] },
  defense:    { color: "#e0c020", label: "Defense",      keywords: ["armor","shield","force field","invulnerab","adaptation","reflection","durability"] },
  lifesupport:{ color: "#60b060", label: "Life Support", keywords: ["life support","healing","regenerat","first aid"] },
  cargo:      { color: "#b0b0b0", label: "Cargo",        keywords: ["cargo","trunk","storage","spare part","garage","hangar","trailer","ammo","bay"] },
  misc:       { color: "#8a8070", label: "Misc",         keywords: ["headlight","light","ejection","wings","performance","chaff","flare"] },
};

MP.sysColor = function(desc) {
  if (!desc) return MP.SYS_COLORS.misc.color;
  if (desc === "Floor") return "#c8c8c8";
  const d = desc.toLowerCase();
  for (const cat of Object.values(MP.SYS_COLORS)) {
    for (const kw of cat.keywords) {
      if (d.includes(kw)) return cat.color;
    }
  }
  return MP.SYS_COLORS.misc.color;
};

MP.isSeatSystem = function(desc) {
  if (!desc) return false;
  const d = desc.toLowerCase();
  const seatWords = ["control seat","passenger","bunk","seat","pilot","co-pilot","driver","gunner","commander","loader"];
  return seatWords.some(kw => d.includes(kw));
};

// Build label lookup: match system description to ability type abbr (3-char)
// Tries ability name match first (longest match wins), then falls back to first 3 chars
MP._sysLabelCache = {};
MP._sysLabelKeywords = null;

MP._buildLabelKeywords = function() {
  if (MP._sysLabelKeywords) return;
  MP._sysLabelKeywords = [];
  for (const ab of MP.ABILITY_TYPES) {
    // Primary: full ability name
    MP._sysLabelKeywords.push({kw: ab.name.toLowerCase(), abbr: ab.abbr});
    // Also match first word for things like "Speed: 64/256..." or "Flight: 48/192..."
    const first = ab.name.split(/[\s:(\/]/)[0].toLowerCase();
    if (first.length >= 4 && first !== ab.name.toLowerCase()) {
      MP._sysLabelKeywords.push({kw: first, abbr: ab.abbr});
    }
  }
  // Extra keywords for common template descriptions
  const extras = [
    {kw:"energy blast",  abbr:"PBl"}, {kw:"laser",         abbr:"Lgt"},
    {kw:"cannon",        abbr:"PBl"}, {kw:"missile",       abbr:"SWp"},
    {kw:"torpedo",       abbr:"SWp"}, {kw:"gun",           abbr:"SWp"},
    {kw:"turret",        abbr:"PBl"}, {kw:"countermeasure", abbr:"Sns"},
    {kw:"chaff",         abbr:"Sns"}, {kw:"radar",         abbr:"Sns"},
    {kw:"sonar",         abbr:"Sns"}, {kw:"ejection",      abbr:"CSt"},
    {kw:"ammo",          abbr:"Cgo"}, {kw:"trailer",       abbr:"Cgo"},
    {kw:"truck bed",     abbr:"Cgo"}, {kw:"trunk",         abbr:"Cgo"},
    {kw:"lounge",        abbr:"PSt"}, {kw:"crew",          abbr:"PSt"},
    {kw:"troops",        abbr:"PSt"},
  ];
  MP._sysLabelKeywords.push(...extras);
  // Sort by keyword length descending so longest match wins
  MP._sysLabelKeywords.sort((a, b) => b.kw.length - a.kw.length);
};

MP.sysLabel = function(desc) {
  if (!desc || desc === "Floor") return "";
  // Check cache
  if (MP._sysLabelCache[desc] !== undefined) return MP._sysLabelCache[desc];
  MP._buildLabelKeywords();
  const d = desc.toLowerCase();
  for (const entry of MP._sysLabelKeywords) {
    if (d.includes(entry.kw)) {
      MP._sysLabelCache[desc] = entry.abbr;
      return entry.abbr;
    }
  }
  // Fallback: first 3 chars of first word
  const fallback = desc.replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 3);
  MP._sysLabelCache[desc] = fallback;
  return fallback;
};

// ---- Misc modifier option arrays (shared by dialog builder and recompute) ----
MP.MISC_OPTS = {
  conc: [{l:"None (0)",cp:0},{l:"Activation (-2.5)",cp:-2.5},{l:"Per Use (-5)",cp:-5},{l:"Maintain (-7.5)",cp:-7.5},{l:"Total Conc (-5)",cp:-5},{l:"Total Per Use (-10)",cp:-10},{l:"Total Maintain (-15)",cp:-15}],
  kb: [{l:"Normal (0)",cp:0},{l:"Knockback (+5)",cp:5},{l:"No Knockback (-5)",cp:-5},{l:"KB Only (-10)",cp:-10},{l:"KB Only No Dmg (-20)",cp:-20},{l:"Won't Negate KB (-2.5)",cp:-2.5}],
  partial: [{l:"Full (0)",cp:0},{l:"Heavy (-5)",cp:-5},{l:"Light (-10)",cp:-10},{l:"Spot Coverage (0)",cp:0}],
  poorpen: [{l:"Normal (0)",cp:0},{l:"Double prot (-5)",cp:-5},{l:"Any prot blocks (-10)",cp:-10}],
  obvious: [{l:"Normal (0)",cp:0},{l:"Unobvious (+5)",cp:5},{l:"Fewer Senses (+2.5)",cp:2.5},{l:"Obvious (-5)",cp:-5},{l:"Extra Senses (-2.5)",cp:-2.5}],
  carrier: [{l:"None (0)",cp:0},{l:"Carrier Main (+7.5)",cp:7.5},{l:"Carried Atk (+7.5)",cp:7.5},{l:"Carried Indep (+10)",cp:10},{l:"Contact Atk (+15)",cp:15},{l:"Contact Indep (+17.5)",cp:17.5},{l:"Conductive (+7.5)",cp:7.5}],
  dmgtype: [{l:"Normal (0)",cp:0},{l:"→Psychic (+5)",cp:5},{l:"→Other (+10)",cp:10},{l:"Psychic→Std (-5)",cp:-5},{l:"Other→Std (-10)",cp:-10},{l:"Psychic→Other (+5)",cp:5},{l:"Other→Psychic (-5)",cp:-5}],
  indirect: [{l:"None (0)",cp:0},{l:"Fixed pos, away (+2.5)",cp:2.5},{l:"Any pos, away (+5)",cp:5},{l:"Fixed pos, any dir (+5)",cp:5},{l:"Any pos, any dir (+12.5)",cp:12.5}],
  activation: [{l:"Normal (0)",cp:0},{l:"Persistent→Voluntary (-5)",cp:-5},{l:"Continual→Persistent (-5)",cp:-5},{l:"Continual→Voluntary (-10)",cp:-10},{l:"Stays Active: Vol→Pers (+5)",cp:5},{l:"Stays Active: Pers→Cont (+5)",cp:5},{l:"Stays Active: Vol→Cont (+10)",cp:10}],
  loss: [{l:"None (0)",cp:0},{l:"Req Speech (-2.5)",cp:-2.5},{l:"Req Free Move (-2.5)",cp:-2.5},{l:"Req Nighttime (-5)",cp:-5},{l:"Req Daylight (-5)",cp:-5}],
  canthold: [{l:"Normal (0)",cp:0},{l:"Voluntary (-2.5)",cp:-2.5},{l:"Persistent (-5)",cp:-5},{l:"Continual (-7.5)",cp:-7.5}],
  multi: [{l:"None (0)",cp:0},{l:"1 of set (-10)",cp:-10},{l:"2 of set (-5)",cp:-5},{l:"3 of set (-2.5)",cp:-2.5}],
  usable: [{l:"None (0)",cp:0},{l:"By Others (+5)",cp:5},{l:"By Others Only (0)",cp:0},{l:"On Others (+10)",cp:10},{l:"On Others Only (0)",cp:0},{l:"Not On Self (-5)",cp:-5},{l:"Not On Self, self-only (-10)",cp:-10},{l:"Not On Self, minor (-2.5)",cp:-2.5}],
  reqsave: [{l:"None (0)",cp:0},{l:"Save to Use (-5)",cp:-5},{l:"Save to Activate (-2.5)",cp:-2.5},{l:"Easier Save (+2.5)",cp:2.5},{l:"Harder Save (-2.5)",cp:-2.5}],
  other: [{l:"None (0)",cp:0},{l:"Immunity (+2.5)",cp:2.5},{l:"Body Part (-5)",cp:-5},{l:"Focused (0)",cp:0},{l:"Reversible (+10)",cp:10},{l:"Selective AE (+12.5)",cp:12.5},{l:"Backlash (-7.5)",cp:-7.5},{l:"Overload (+5)",cp:5},{l:"Non-Corp Effect (+5)",cp:5},{l:"Ability Field (x2 base)",cp:0},{l:"Uncontrollable (-20)",cp:-20},{l:"Reduced at Range (-2.5)",cp:-2.5},{l:"Diff Range BC (+2.5)",cp:2.5},{l:"No Escape (+15)",cp:15}],
};
MP.ARC_OPTS = [{l:"Forward 120° (0)",cp:0},{l:"No Arc — line only (-10)",cp:-10},{l:"Wide 240° (+5)",cp:5},{l:"Wide 360° (+10)",cp:10}];
MP.FACING_OPTS = ["Forward","Fwd/Right","Fwd/Left","Back/Right","Back/Left","Back"];

// Recompute ability description from saved abilityData + live vehicle stats
MP.recomputeDesc = function(ad, st, en, ag, intel, cl, techMod) {
  if (!ad || !ad.abId) return null;
  const ab = MP.abilityById(ad.abId);
  const detail = MP.ABILITY_DETAILS[ad.abId];
  if (!ab) return null;
  const name = ab.name;
  const abilityCp = ad.abilityCp || 0;
  const mode = ad.descMode || "compact";
  const full = mode === "full";
  const min = mode === "min";
  function cpA(cp) { if (min) return ""; return ` (${cp >= 0 ? "+" + cp : cp})`; }
  function baseCpA() { if (min) return ""; return " (" + abilityCp + ")"; }

  // Recompute ability info with live stats
  const info = MP.computeAbilityInfo(ad.abId, abilityCp, st, en, ag, intel, cl);

  const parts = [];
  let basePart = name;

  // For range-bearing abilities, recompute the range with the range modifier applied
  if (info && info.desc) {
    let descStr = info.desc;
    // If range modifier changes the range, recalculate
    if (detail && detail.calc && detail.calc.rng && detail.calc.baseRange) {
      const baseRangeIdx = MP.rangeScaleIndex(detail.calc.baseRange);
      const currentRangeIdx = ad.range || 0;
      const rangeEntry = MP.RANGE_SCALE[currentRangeIdx];
      if (rangeEntry && currentRangeIdx !== baseRangeIdx) {
        // Recompute range using the modified range formula
        // RANGE_SCALE goes from longest (0) to shortest (10)
        // The formula in calc.rng gives the base inches for BCx1"
        const baseInches = MP.calcRange(detail.calc.rng, st, en, ag, intel, cl);
        if (baseInches !== null && baseInches > 0) {
          // Multipliers: BCx16=16, BCx8=8, BCx4=4, BCx2=2, BCx1=1, BC/2=0.5, BC/4=0.25
          const multipliers = [null, null, 16, 8, 4, 2, 1, 0.5, 0.25, null, null];
          const baseMul = multipliers[baseRangeIdx];
          const newMul = multipliers[currentRangeIdx];
          if (baseMul != null && newMul != null) {
            const newRange = Math.floor(baseInches * newMul / baseMul);
            // Replace the range portion in desc
            const origRange = MP.calcRange(detail.calc.rng, st, en, ag, intel, cl);
            descStr = descStr.replace('Rng ' + origRange + '"', 'Rng ' + newRange + '"');
          }
        }
      }
    }
    basePart += ": " + descStr;
  }
  basePart += baseCpA();
  parts.push(basePart);

  // Ability-specific modifiers (from abilityMods saved state)
  const abMods = MP.ABILITY_MODIFIERS[ad.abId] || [];
  const savedAbMods = ad.abilityMods || {};
  for (const am of abMods) {
    const lbl = full ? am.label : am.short;
    const val = savedAbMods[am.id];
    if (am.type === "select") {
      const selIdx = val || 0;
      const opt = am.options[selIdx];
      const defIdx = am.def || 0;
      if (opt && (opt.cp !== 0 || selIdx !== defIdx)) {
        const optLbl = opt.l.replace(/ \([^)]*\)$/, "");
        parts.push(opt.cp !== 0 ? `${lbl}: ${optLbl}${cpA(opt.cp)}` : `${lbl}: ${optLbl}`);
      }
    } else if (am.type === "number") {
      const v = val || 0;
      if (v > 0) {
        const c = am.cpFn(v);
        parts.push(`${lbl} x${v}${cpA(c)}`);
      }
    } else {
      // checkbox
      if (val) {
        parts.push(am.cp !== 0 ? `${lbl}${cpA(am.cp)}` : lbl);
      }
    }
  }

  // Generic step modifiers
  function addStep(key, steps, fullLbl, shortLbl, descFn) {
    const val = ad[key] || 0;
    if (val > 0 && steps[val]) {
      const s = steps[val];
      const label = full ? fullLbl : shortLbl;
      parts.push(descFn(label, s, s.cp));
    }
  }
  addStep("area", MP.AREA_EFFECT_STEPS, "Area Effect", "AE", (l,s,c) => `${l} ${s.label}${cpA(c)}`);
  addStep("ap", MP.ARMOR_PIERCING_STEPS, "Armor Piercing", "AP", (l,s,c) => `${l} ${s.val}${cpA(c)}`);
  addStep("autofire", MP.AUTOFIRE_STEPS, "Autofire", "AF", (l,s,c) => `${l} x${s.rof}${cpA(c)}`);
  addStep("duration", MP.DURATION_STEPS, "Duration", "Dur", (l,s,c) => `${l} ${s.label}${cpA(c)}`);
  addStep("hardened", MP.HARDENED_STEPS, "Hardened", "Hrd", (l,s,c) => `${l} ${s.val}${cpA(c)}`);

  if (ad.gear) { parts.push(`Gear${cpA(-5)}`); }

  if ((ad.bulky || 0) > 0) parts.push(`${full ? "Bulky" : "Blk"} x${ad.bulky}${cpA(ad.bulky * 2.5)}`);
  if ((ad.delicate || 0) > 0) parts.push(`${full ? "Delicate" : "Del"} x${ad.delicate}${cpA(-ad.delicate * 2.5)}`);

  // PR — resolved final value
  const prIdx = ad.pr || 0;
  const basePrIdx = detail ? MP.prScaleIndex(detail.pr) : 0;
  const prRow = MP.PR_CHARGES_SCALE[prIdx];
  if (prRow) {
    const prCpDelta = (basePrIdx - prIdx) * 2.5;
    if (prCpDelta !== 0) {
      parts.push(`PR ${prRow.pr}${cpA(prCpDelta)}`);
    } else if (detail && detail.pr > 0) {
      parts.push(`PR ${prRow.pr}`);
    }
  }

  // Charges — only show when modified from base
  const chIdx = ad.charges || 0;
  const chRow = MP.PR_CHARGES_SCALE[chIdx];
  if (chRow && chIdx !== basePrIdx) {
    const chCpDelta = (basePrIdx - chIdx) * 2.5;
    parts.push(`${full ? "Charges" : "Ch"}: ${chRow.charges} ch${cpA(chCpDelta)}`);
  }

  // Range — show label only when modified from base
  if (detail && detail.calc && detail.calc.baseRange) {
    const baseRngIdx = MP.rangeScaleIndex(detail.calc.baseRange);
    const curRngIdx = ad.range || 0;
    const rngEntry = MP.RANGE_SCALE[curRngIdx];
    if (rngEntry && curRngIdx !== baseRngIdx) {
      const rngCp = (baseRngIdx - curRngIdx) * 2.5;
      parts.push(`${full ? "Range" : "Rng"} ${rngEntry.label}${cpA(rngCp)}`);
    }
  }

  // Misc selects
  const miscMap = [
    ["conc","conc"],["kb","kb"],["partial","partial"],["poorpen","poorpen"],
    ["obvious","obvious"],["carrier","carrier"],["dmgtype","dmgtype"],
    ["indirect","indirect"],["timereq","timereq"],["activation","activation"],
    ["loss","loss"],["canthold","canthold"],["multi","multi"],
    ["usable","usable"],["reqsave","reqsave"],["other","other"]
  ];
  for (const [dataKey, optKey] of miscMap) {
    const idx = dataKey === "timereq" ? (ad[dataKey] ?? 2) : (ad[dataKey] || 0);
    if (dataKey === "timereq") {
      // Time Requirement: index 2 = 1 Phase = 0 CP
      if (idx !== 2) {
        const trStep = MP.TIME_REQ_STEPS[idx];
        if (trStep) {
          const trCp = (2 - idx) * 2.5;
          const txt = trStep.label;
          parts.push(trCp !== 0 ? `${txt}${cpA(trCp)}` : txt);
        }
      }
    } else {
      const opts = MP.MISC_OPTS[optKey];
      if (opts && idx > 0 && opts[idx]) {
        const o = opts[idx];
        const txt = o.l.replace(/ \([^)]*\)$/, "");
        parts.push(o.cp !== 0 ? `${txt}${cpA(o.cp)}` : txt);
      }
    }
  }

  // Linked
  if (ad.linked) parts.push(`${full ? "Linked" : "Lnk"}${cpA(-2.5)}`);

  // Breakdown
  if ((ad.breakdown || 0) > 0) {
    parts.push(`${full ? "Breakdown" : "Bkdn"} x${ad.breakdown}${cpA(-ad.breakdown * 2.5)}`);
  }

  // System modifiers
  if (ad.integral) {
    const sysRow = MP.lookupSys(ad.spaces || 0);
    const baseCp = sysRow ? sysRow.cp : 0;
    if (min) parts.push("Integral");
    else { const halfCp = Math.ceil((baseCp + techMod) / 2); parts.push(`Integral (½ → ${halfCp})`); }
  }
  if (ad.open) {
    const sysRow = MP.lookupSys(ad.spaces || 0);
    let openBase = sysRow ? sysRow.cp : 0;
    openBase += techMod;
    if (ad.integral) openBase = Math.ceil(openBase / 2);
    if (min) parts.push("Open");
    else parts.push(`Open (¼ → ${Math.ceil(openBase / 4)})`);
  }
  if (ad.indep) parts.push(full ? "Indep. Power" : "Indep");
  if (ad.wontexplode) parts.push(min ? "No Explode" : `Won't Explode${cpA(5)}`);

  // Arc
  const arcIdx = ad.arc || 0;
  const arcOpt = MP.ARC_OPTS[arcIdx];
  if (arcOpt && arcOpt.cp !== 0) {
    let arcLabel = arcOpt.l.replace(/ \([^)]*\)$/, "");
    if (!full) {
      arcLabel = arcLabel.replace("No Arc — line only", "Line Only")
                         .replace("Forward 120°", "Fwd")
                         .replace("Wide 240°", "240°")
                         .replace("Wide 360°", "360°");
    }
    parts.push(`${arcLabel}${cpA(arcOpt.cp)}`);
  }

  // Facing (when flagged to show and not 360° arc)
  if (arcIdx !== 3 && ad.facingShow) {
    const facIdx = ad.facing || 0;
    const facLabel = MP.FACING_OPTS[facIdx] || "Fwd";
    parts.push(facLabel);
  }

  return parts.join(", ");
};

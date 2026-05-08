// mp-chargen.js — Mighty Protectors character generation data & helpers

var MP = MP || {};
MP.CG = {};

// ── Power Levels ──
MP.CG.POWER_LEVELS = [
  { id: 'normal',   label: 'Normal',   bcPoints: 50, bcMin: 3, bcMax: 15, bcScores: [14,12,10,8,6],  coreAbilityCPs: 0,  totalCPs: 50  },
  { id: 'low',      label: 'Low',      bcPoints: 60, bcMin: 3, bcMax: 18, bcScores: [16,14,12,10,8], coreAbilityCPs: 10, totalCPs: 100 },
  { id: 'standard', label: 'Standard', bcPoints: 70, bcMin: 3, bcMax: 21, bcScores: [18,16,14,12,10],coreAbilityCPs: 20, totalCPs: 150 },
  { id: 'high',     label: 'High',     bcPoints: 80, bcMin: 3, bcMax: 24, bcScores: [20,18,16,14,12],coreAbilityCPs: 30, totalCPs: 200 },
];

// ── Caps & Gear Calculation (from Total CPs) ──
MP.CG.calcCaps = function(totalCPs) {
  const damageCap = Math.floor(totalCPs / 12.5) + 3;
  return {
    bcCap: Math.floor(totalCPs / 5) + 10,
    abilityCap: Math.floor(totalCPs / 5),
    damageCap: damageCap,
    dotCap: (damageCap * 2) + 3,
    gearBreak: Math.floor(totalCPs / 25) + 5,
    gearTake: Math.floor(totalCPs / 25) + 6,
    gearDisarm: Math.floor(totalCPs / 25) + 3,
    gbc: Math.floor(totalCPs / 15) + 6,
  };
};

// ── Side ──
MP.CG.SIDES = ['Good', 'Evil', 'Neutral'];

// ── Place of Birth (d100) ──
MP.CG.PLACE_OF_BIRTH = [
  { min: 1,  max: 80,  label: 'Local',            subTable: null },
  { min: 81, max: 96,  label: 'Foreigner',         subTable: 'knownRegions' },
  { min: 97, max: 97,  label: 'Stranger',          subTable: 'lostRegions' },
  { min: 98, max: 98,  label: 'Anachronism',       subTable: 'timePeriods' },
  { min: 99, max: 99,  label: 'Alien',             subTable: 'otherWorlds' },
  { min: 100,max: 100, label: 'Extra-Dimensional',  subTable: 'otherDimensions' },
];

MP.CG.KNOWN_REGIONS = [
  { min: 1,  max: 1,  label: 'Ethiopia' },
  { min: 2,  max: 2,  label: 'Elsewhere in Eastern Africa' },
  { min: 3,  max: 3,  label: 'Malaia' },
  { min: 4,  max: 4,  label: 'Elsewhere in Central Africa' },
  { min: 5,  max: 5,  label: 'Egypt' },
  { min: 6,  max: 6,  label: 'Elsewhere in Northern Africa' },
  { min: 7,  max: 7,  label: 'South Africa' },
  { min: 8,  max: 8,  label: 'Elsewhere in Southern Africa' },
  { min: 9,  max: 9,  label: 'Nigeria' },
  { min: 10, max: 10, label: 'Elsewhere in Western Africa' },
  { min: 11, max: 22, label: 'China' },
  { min: 23, max: 27, label: 'Japan' },
  { min: 28, max: 28, label: 'Elsewhere in Eastern Asia' },
  { min: 29, max: 29, label: 'Bangladesh' },
  { min: 30, max: 38, label: 'India' },
  { min: 39, max: 39, label: 'Pakistan' },
  { min: 40, max: 42, label: 'Elsewhere in South-Central Asia' },
  { min: 43, max: 44, label: 'Indonesia' },
  { min: 45, max: 45, label: 'Philippines' },
  { min: 46, max: 46, label: 'Viet Nam' },
  { min: 47, max: 47, label: 'Elsewhere in South-Eastern Asia' },
  { min: 48, max: 48, label: 'Turkey' },
  { min: 49, max: 49, label: 'Elsewhere in Western Asia' },
  { min: 50, max: 50, label: 'Belarus' },
  { min: 51, max: 52, label: 'Poland' },
  { min: 53, max: 53, label: 'Romania' },
  { min: 54, max: 59, label: 'Russian Federation' },
  { min: 60, max: 61, label: 'Ukraine' },
  { min: 62, max: 62, label: 'Elsewhere in Eastern Europe' },
  { min: 63, max: 64, label: 'Britain' },
  { min: 65, max: 65, label: 'Sweden' },
  { min: 66, max: 66, label: 'Elsewhere in Northern Europe' },
  { min: 67, max: 67, label: 'Greece' },
  { min: 68, max: 69, label: 'Italy' },
  { min: 70, max: 71, label: 'Spain' },
  { min: 72, max: 72, label: 'Elsewhere in Southern Europe' },
  { min: 73, max: 74, label: 'France' },
  { min: 75, max: 77, label: 'Germany' },
  { min: 78, max: 78, label: 'Netherlands' },
  { min: 79, max: 79, label: 'Elsewhere in Western Europe' },
  { min: 80, max: 80, label: 'Cuba' },
  { min: 81, max: 81, label: 'Elsewhere in the Caribbean' },
  { min: 82, max: 82, label: 'Mexico' },
  { min: 83, max: 83, label: 'Elsewhere in Central America' },
  { min: 84, max: 85, label: 'Brazil' },
  { min: 86, max: 86, label: 'Elsewhere in South America' },
  { min: 87, max: 96, label: 'United States' },
  { min: 97, max: 97, label: 'Canada' },
  { min: 98, max: 98, label: 'Elsewhere in North America' },
  { min: 99, max: 99, label: 'Australia' },
  { min: 100,max: 100,label: 'Elsewhere in Oceania' },
];

MP.CG.LOST_REGIONS = [
  { min: 1,  max: 15, label: 'The Secret Land', culture: 'Primitive' },
  { min: 16, max: 30, label: 'Atlantis', culture: 'Primitive' },
  { min: 31, max: 40, label: 'Haven', culture: 'High Tech' },
  { min: 41, max: 55, label: 'Lemuria', culture: 'High Tech' },
  { min: 56, max: 75, label: 'Subternia', culture: 'Primitive' },
  { min: 76, max: 80, label: 'The Enclave', cultureTable: [{max:20,culture:'Fantasy'},{max:40,culture:'Primitive'},{max:50,culture:'Mixed'},{max:90,culture:'Modern'},{max:100,culture:'High Tech'}] },
  { min: 81, max: 100,label: 'Other', culture: 'Modern' },
];

MP.CG.TIME_PERIODS = [
  { min: 1,  max: 5,  label: 'Primordial', cultureTable: [{max:34,culture:'High Tech'},{max:67,culture:'Mixed'},{max:100,culture:'Primitive'}] },
  { min: 6,  max: 10, label: 'Age of Dinosaurs', cultureTable: [{max:34,culture:'High Tech'},{max:67,culture:'Mixed'},{max:100,culture:'Primitive'}] },
  { min: 11, max: 15, label: 'Stone Age', culture: 'Primitive' },
  { min: 16, max: 20, label: 'Age of Legends', cultureTable: [{max:33,culture:'Primitive'},{max:66,culture:'Fantasy'},{max:100,culture:'Mixed'}] },
  { min: 21, max: 25, label: 'Ancient', cultureTable: [{max:50,culture:'Primitive'},{max:100,culture:'Fantasy'}] },
  { min: 26, max: 30, label: 'Classical', cultureTable: [{max:50,culture:'Primitive'},{max:100,culture:'Fantasy'}] },
  { min: 31, max: 35, label: 'Dark Ages', cultureTable: [{max:50,culture:'Primitive'},{max:100,culture:'Fantasy'}] },
  { min: 36, max: 40, label: 'Renaissance', cultureTable: [{max:20,culture:'Fantasy'},{max:100,culture:'Modern'}] },
  { min: 41, max: 45, label: 'Victorian', culture: 'Modern' },
  { min: 46, max: 50, label: 'Industrial', culture: 'Modern' },
  { min: 51, max: 60, label: 'Modern', culture: 'Modern' },
  { min: 61, max: 70, label: 'Near Future', culture: 'High Tech' },
  { min: 71, max: 85, label: 'Far Future', cultureTable: [{max:80,culture:'High Tech'},{max:95,culture:'Modern'},{max:100,culture:'Primitive'}] },
  { min: 86, max: 100,label: 'Extreme Future', cultureTable: [{max:80,culture:'High Tech'},{max:95,culture:'Modern'},{max:100,culture:'Primitive'}] },
];

MP.CG.OTHER_WORLDS = [
  { min: 1,  max: 10, label: 'The Core', cultureTable: [{max:80,culture:'High Tech'},{max:95,culture:'Modern'},{max:100,culture:'Primitive'}] },
  { min: 11, max: 25, label: 'The Psynax Empire', culture: 'High Tech' },
  { min: 26, max: 40, label: 'The Technocracy', culture: 'High Tech' },
  { min: 41, max: 60, label: 'The Spherical Confederation', culture: 'High Tech' },
  { min: 61, max: 70, label: 'Darkworld', culture: 'Mixed' },
  { min: 71, max: 75, label: 'Factorum', culture: 'Mixed' },
  { min: 76, max: 80, label: 'Frankenstein Galaxy', culture: 'High Tech' },
  { min: 81, max: 85, label: 'Chronangeles', culture: 'Mixed' },
  { min: 86, max: 90, label: 'Omnopolis', culture: 'Mixed' },
  { min: 91, max: 100,label: 'Other', culture: 'Modern' },
];

MP.CG.OTHER_DIMENSIONS = [
  { min: 1,  max: 5,  label: 'The Interdimensional Library', culture: 'Mixed' },
  { min: 6,  max: 25, label: 'Mythical Realm', culture: 'Fantasy' },
  { min: 26, max: 45, label: 'Alternate Earth', culture: 'Modern' },
  { min: 46, max: 60, label: 'Internet/Virtual Reality', culture: 'High Tech' },
  { min: 61, max: 70, label: 'The Abomination Realm', culture: 'Fantasy' },
  { min: 71, max: 90, label: 'Fictional World', culture: 'Mixed' },
  { min: 91, max: 100,label: 'Other', culture: 'Modern' },
];

// ── Species (d100) ──
MP.CG.SPECIES = [
  { min: 1,  max: 80, label: 'Human' },
  { min: 81, max: 88, label: 'Tech Construct' },
  { min: 89, max: 92, label: 'Mystical Construct' },
  { min: 93, max: 98, label: 'Monster' },
  { min: 99, max: 100,label: 'Mixed' },
];

// ── Culture ──
MP.CG.CULTURES = ['Primitive', 'Fantasy', 'Modern', 'High Tech', 'Mixed'];

// ── Origin Type (d100, roll twice pick one) ──
MP.CG.ORIGIN_TYPES = [
  { min: 1,  max: 20, label: 'Mutated or Evolved' },
  { min: 21, max: 40, label: 'Science Accident' },
  { min: 41, max: 45, label: 'Mystical Accident' },
  { min: 46, max: 65, label: 'Science Project' },
  { min: 66, max: 80, label: 'Mystical Project' },
  { min: 81, max: 90, label: 'Physical Training' },
  { min: 91, max: 100,label: 'Mystical Training' },
];

// ── Wealth Ability ──
MP.CG.WEALTH = [
  { cp: -10,  income: 0,              roll: 'd2-1',    label: 'Destitute' },
  { cp: -7.5, income: 2500,           roll: 'd1',      label: 'Poor' },
  { cp: -5,   income: 10000,          roll: 'd2',      label: 'Impoverished' },
  { cp: -2.5, income: 20000,          roll: 'd3',      label: 'Low Income' },
  { cp: 0,    income: 40000,          roll: 'd4',       label: 'Average' },
  { cp: 2.5,  income: 80000,          roll: 'd6',       label: 'Comfortable' },
  { cp: 5,    income: 160000,         roll: 'd6+1',     label: 'Comfortable+' },
  { cp: 7.5,  income: 320000,         roll: 'd8+1',     label: 'Well Off' },
  { cp: 10,   income: 640000,         roll: 'd10+1',    label: 'Rich' },
  { cp: 12.5, income: 1280000,        roll: '2d6',      label: 'Rich+' },
  { cp: 15,   income: 2560000,        roll: 'd6+d8',    label: 'Very Rich' },
  { cp: 17.5, income: 5120000,        roll: '2d8',      label: 'Very Rich+' },
  { cp: 20,   income: 10240000,       roll: 'd8+d10',   label: 'Wealthy' },
  { cp: 22.5, income: 20480000,       roll: '2d10',     label: 'Wealthy+' },
  { cp: 25,   income: 40960000,       roll: 'd10+d12',  label: 'Very Wealthy' },
  { cp: 27.5, income: 81920000,       roll: '2d12',     label: 'Very Wealthy+' },
  { cp: 30,   income: 163840000,      roll: '3d8',      label: 'Millionaire' },
  { cp: 32.5, income: 327680000,      roll: '2d8+d10',  label: 'Millionaire+' },
  { cp: 35,   income: 655360000,      roll: 'd8+2d10',  label: 'Multi-Millionaire' },
  { cp: 37.5, income: 1310720000,     roll: '3d10',     label: 'Multi-Millionaire+' },
  { cp: 40,   income: 2621440000,     roll: '2d10+d12', label: 'Billionaire' },
  { cp: 42.5, income: 5242880000,     roll: 'd10+2d12', label: 'Billionaire+' },
  { cp: 45,   income: 10485760000,    roll: '3d12',     label: 'Multi-Billionaire' },
  { cp: 47.5, income: 20971520000,    roll: '3d12+1',   label: 'Multi-Billionaire+' },
  { cp: 50,   income: 41943040000,    roll: '3d12+2',   label: 'Ultra-Wealthy' },
];

// ── Basic Characteristic Table ──
// Each row: [minScore, maxScore, carryLbs, baseHTH, save, initDie, hpST, hpEN, hpAG, hpCL, healRate]
MP.CG.BC_TABLE = [
  [0,  0,  8,           'd2-1', '6-',  'd2-1', -3, -5, -2, -1, 0.2],
  [1,  1,  10,          'd2-1', '7-',  'd2-1', -3, -5, -2, -1, 0.3],
  [2,  2,  12,          'd2-1', '7-',  'd2-1', -3, -5, -2, -1, 0.3],
  [3,  5,  15,          'd2',   '8-',  'd2',   -2, -3, -1,  0, 0.5],
  [6,  8,  30,          'd3',   '9-',  'd3',    0, -1,  0,  1, 0.8],
  [9,  11, 60,          'd4',   '10-', 'd4',    1,  1,  1,  1, 1.0],
  [12, 14, 120,         'd6',   '11-', 'd6',    3,  3,  2,  2, 1.6],
  [15, 17, 240,         'd6+1', '11-', 'd6+1',  5,  6,  3,  2, 2.2],
  [18, 20, 480,         'd8+1', '12-', 'd8+1',  6,  8,  5,  3, 2.8],
  [21, 23, 960,         'd10+1','12-', 'd10+1', 8, 10,  6,  3, 3.4],
  [24, 26, 1920,        '2d6',  '13-', '2d6',  10, 13,  7,  4, 3.9],
  [27, 29, 3840,        'd6+d8','13-', 'd6+d8',12, 15,  8,  5, 4.5],
  [30, 32, 7680,        '2d8',  '14-', '2d8',  14, 17,  9,  5, 5.1],
  [33, 35, 15360,       'd8+d10','14-','d8+d10',16, 20, 10,  6, 5.7],
  [36, 38, 30720,       '2d10', '15-', '2d10', 17, 22, 12,  6, 6.3],
  [39, 41, 61440,       'd10+d12','15-','d10+d12',19,25,13,  7, 6.9],
  [42, 44, 122880,      '2d12', '16-', '2d12', 21, 27, 14,  7, 7.5],
  [45, 47, 245760,      '3d8',  '16-', '3d8',  23, 29, 15,  8, 8.1],
  [48, 50, 491520,      '2d8+d10','17-','2d8+d10',25,32,16,  9, 8.7],
  [51, 53, 983040,      'd8+2d10','17-','d8+2d10',27,34,17,  9, 9.2],
  [54, 56, 1966080,     '3d10', '18-', '3d10', 28, 36, 19, 10, 9.8],
  [57, 59, 3932160,     '2d10+d12','18-','2d10+d12',30,39,20,10,10.4],
  [60, 62, 7864320,     'd10+2d12','19-','d10+2d12',32,41,21,11,11.0],
  [63, 65, 15728640,    '3d12', '19-', '3d12', 34, 43, 22, 12, 11.6],
  [66, 68, 31457280,    '3d12+1','20-','3d12+1',36, 46, 23, 12, 12.2],
  [69, 71, 62914560,    '3d12+2','20-','3d12+2',38, 48, 25, 13, 12.8],
  [72, 74, 125829120,   '4d10', '21-', '4d10', 39, 50, 26, 13, 13.4],
  [75, 77, 251658240,   '3d10+d12','21-','3d10+d12',41,53,27,14,14.0],
  [78, 80, 503316480,   '2d10+2d12','22-','2d10+2d12',43,55,28,15,14.5],
  [81, 83, 1006632960,  'd10+3d12','22-','d10+3d12',45,58,29,15,15.1],
  [84, 86, 2013265920,  '4d12', '23-', '4d12', 47, 60, 30, 16, 15.7],
  [87, 89, 4026531840,  '4d12+1','23-','4d12+1',48,62, 32, 16, 16.3],
  [90, 92, 8053063680,  '5d10', '24-', '5d10', 50, 65, 33, 17, 16.9],
  [93, 95, 16106127360, '4d10+d12','24-','4d10+d12',52,67,34,17,17.5],
  [96, 98, 32212254720, '3d10+2d12','25-','3d10+2d12',54,69,35,18,18.1],
];

// BC_TABLE column indices
MP.CG.BC_COL = { MIN:0, MAX:1, CARRY:2, HTH:3, SAVE:4, INIT:5, HP_ST:6, HP_EN:7, HP_AG:8, HP_CL:9, HEAL:10 };

// ── BC Table Lookup ──
MP.CG.lookupBC = function(score) {
  for (const row of MP.CG.BC_TABLE) {
    if (score >= row[0] && score <= row[1]) return row;
  }
  // Clamp to last row if above max
  return MP.CG.BC_TABLE[MP.CG.BC_TABLE.length - 1];
};

// ── Derived Stat Calculations ──
MP.CG.calcDerived = function(st, en, ag, inScore, cl) {
  const C = MP.CG.BC_COL;
  const stRow = MP.CG.lookupBC(st);
  const enRow = MP.CG.lookupBC(en);
  const agRow = MP.CG.lookupBC(ag);
  const inRow = MP.CG.lookupBC(inScore);
  const clRow = MP.CG.lookupBC(cl);

  // Hit Points = ST contribution + EN contribution + AG contribution + CL contribution (min 1)
  const hitPoints = Math.max(1, stRow[C.HP_ST] + enRow[C.HP_EN] + agRow[C.HP_AG] + clRow[C.HP_CL]);

  // Power = ST + EN + AG + IN
  const power = st + en + ag + inScore;

  // Move = average of ST, EN, AG rounded to nearest
  const move = Math.round((st + en + ag) / 3);

  // Physical Defense = AG save number - 10
  const agSaveNum = parseInt(agRow[C.SAVE]);
  const physDef = agSaveNum - 10;

  // Mental Defense = IN save number - 10
  const inSaveNum = parseInt(inRow[C.SAVE]);
  const mentDef = inSaveNum - 10;

  // Inventing Points = IN / 2 rounded up
  const inventingPts = Math.ceil(inScore / 2);

  return {
    carryCapacity: stRow[C.CARRY],
    baseHTH: stRow[C.HTH],
    saveST: stRow[C.SAVE],  // ST doesn't have a save but carry/HTH use its row
    saveEN: enRow[C.SAVE],
    saveAG: agRow[C.SAVE],
    saveIN: inRow[C.SAVE],
    saveCL: clRow[C.SAVE],
    initiative: clRow[C.INIT],
    hitPoints: hitPoints,
    healingRate: enRow[C.HEAL],
    power: power,
    move: move,
    physicalDef: physDef,
    mentalDef: mentDef,
    inventingPts: inventingPts,
  };
};

// ── Random Roll Helpers ──
MP.CG.d = function(sides) { return Math.floor(Math.random() * sides) + 1; };
MP.CG.d100 = function() { return MP.CG.d(100); };
MP.CG.d10 = function() { return MP.CG.d(10); };

// Roll on a min/max/label table, return the matching entry
MP.CG.rollOnTable = function(table) {
  const roll = MP.CG.d100();
  for (const entry of table) {
    if (roll >= entry.min && roll <= entry.max) return { roll, entry };
  }
  return { roll, entry: table[table.length - 1] };
};

// ── Resolve culture from a sub-table entry ──
MP.CG.resolveCulture = function(entry) {
  if (!entry) return 'Modern';
  if (entry.culture) return entry.culture;
  if (entry.cultureTable) {
    const roll = MP.CG.d(100);
    for (const row of entry.cultureTable) {
      if (roll <= row.max) return row.culture;
    }
    return entry.cultureTable[entry.cultureTable.length - 1].culture;
  }
  return 'Modern';
};

// ── Random Birthplace ──
MP.CG.rollBirthplace = function() {
  const result = MP.CG.rollOnTable(MP.CG.PLACE_OF_BIRTH);
  const out = { placeRoll: result.roll, place: result.entry.label, detail: null, detailRoll: null, culture: 'Modern' };
  if (result.entry.subTable) {
    const subTableMap = {
      knownRegions: MP.CG.KNOWN_REGIONS,
      lostRegions: MP.CG.LOST_REGIONS,
      timePeriods: MP.CG.TIME_PERIODS,
      otherWorlds: MP.CG.OTHER_WORLDS,
      otherDimensions: MP.CG.OTHER_DIMENSIONS,
    };
    const sub = MP.CG.rollOnTable(subTableMap[result.entry.subTable]);
    out.detail = sub.entry.label;
    out.detailRoll = sub.roll;
    out.culture = MP.CG.resolveCulture(sub.entry);
  }
  return out;
};

// ── Random Species ──
MP.CG.rollSpecies = function() {
  return MP.CG.rollOnTable(MP.CG.SPECIES);
};

// ── Random Origin Type (roll twice, return both) ──
MP.CG.rollOriginType = function() {
  const r1 = MP.CG.rollOnTable(MP.CG.ORIGIN_TYPES);
  let r2 = MP.CG.rollOnTable(MP.CG.ORIGIN_TYPES);
  // Re-roll duplicates
  while (r2.entry.label === r1.entry.label) {
    r2 = MP.CG.rollOnTable(MP.CG.ORIGIN_TYPES);
  }
  return { choice1: r1, choice2: r2 };
};

// ── Random BC Assignment (Random Method) ──
// Returns { st, en, ag, in, cl } as CP scores
MP.CG.rollBCs = function(powerLevel) {
  const pl = MP.CG.POWER_LEVELS.find(p => p.id === powerLevel);
  if (!pl) return null;
  const scores = [...pl.bcScores]; // e.g. [18,16,14,12,10] for standard
  const bcs = { st: 0, en: 0, ag: 0, in: 0, cl: 0 };
  const bcOrder = ['st', 'en', 'ag', 'in', 'cl'];
  const assigned = new Set();

  for (let i = 0; i < scores.length; i++) {
    const roll = MP.CG.d10();
    // d10: 1-2=ST, 3-4=EN, 5-6=AG, 7-8=IN, 9-10=CL
    let bcIdx = Math.floor((roll - 1) / 2);
    // Find next unassigned BC, wrapping around
    let tries = 0;
    while (assigned.has(bcIdx) && tries < 5) {
      bcIdx = (bcIdx + 1) % 5;
      tries++;
    }
    assigned.add(bcIdx);
    bcs[bcOrder[bcIdx]] = scores[i];
  }
  return bcs;
};

// ── Format currency ──
MP.CG.formatCurrency = function(amount) {
  if (amount === 0) return '$0';
  if (amount >= 1000000000) return '$' + (amount / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (amount >= 1000) return '$' + (amount / 1000).toFixed(0) + 'K';
  return '$' + amount;
};

// ── Full Random Character Skeleton ──
// Returns an object with all randomly determined fields (no abilities yet)
MP.CG.rollCharacter = function(powerLevel) {
  const bcs = MP.CG.rollBCs(powerLevel);
  const birthplace = MP.CG.rollBirthplace();
  const species = MP.CG.rollSpecies();
  const origin = MP.CG.rollOriginType();
  const derived = MP.CG.calcDerived(bcs.st, bcs.en, bcs.ag, bcs.in, bcs.cl);

  return {
    powerLevel: powerLevel,
    birthplace: birthplace,
    species: species.entry.label,
    speciesRoll: species.roll,
    originChoice1: origin.choice1.entry.label,
    originChoice2: origin.choice2.entry.label,
    originRoll1: origin.choice1.roll,
    originRoll2: origin.choice2.roll,
    bcs: bcs,
    derived: derived,
  };
};

// ── Offensive Abilities (d100) ──
MP.CG.OFFENSIVE_ABILITIES = [
  { min: 1,  max: 2,  label: 'Absorption' },
  { min: 3,  max: 4,  label: 'Chemical Abilities' },
  { min: 5,  max: 8,  label: 'Death Touch' },
  { min: 9,  max: 12, label: 'Devitalization Ray' },
  { min: 13, max: 14, label: 'Disintegration' },
  { min: 15, max: 18, label: 'Emotion Control' },
  { min: 19, max: 19, label: 'Experience Levels' },
  { min: 20, max: 21, label: 'Flame Abilities' },
  { min: 22, max: 23, label: 'Force Field' },
  { min: 24, max: 25, label: 'Grapnel' },
  { min: 26, max: 27, label: 'Gravity Control' },
  { min: 28, max: 29, label: 'Heightened Agility' },
  { min: 30, max: 33, label: 'Heightened Attack' },
  { min: 34, max: 37, label: 'Heightened Expertise' },
  { min: 38, max: 41, label: 'Heightened Strength' },
  { min: 42, max: 43, label: 'Ice Abilities' },
  { min: 44, max: 45, label: 'Light Control' },
  { min: 46, max: 47, label: 'Lightning Control' },
  { min: 48, max: 48, label: 'Magnetism' },
  { min: 49, max: 52, label: 'Mind Control' },
  { min: 53, max: 56, label: 'Natural Weaponry' },
  { min: 57, max: 60, label: 'Paralysis Ray' },
  { min: 61, max: 64, label: 'Poison/Venom' },
  { min: 65, max: 69, label: 'Power Blast' },
  { min: 70, max: 71, label: 'Reflection' },
  { min: 72, max: 75, label: 'Repulsion Blast' },
  { min: 76, max: 77, label: 'Shaping' },
  { min: 78, max: 81, label: 'Siphon' },
  { min: 82, max: 83, label: 'Sonic Abilities' },
  { min: 84, max: 87, label: 'Special Weapon' },
  { min: 88, max: 88, label: 'Telekinesis' },
  { min: 89, max: 92, label: 'Transmutation' },
  { min: 93, max: 94, label: 'Vibration Abilities' },
  { min: 95, max: 98, label: 'Weakness Detection' },
  { min: 99, max: 100,label: 'Weather Control' },
];

// ── Defensive Abilities (d100) ──
MP.CG.DEFENSIVE_ABILITIES = [
  { min: 1,  max: 3,  label: 'Absorption' },
  { min: 4,  max: 8,  label: 'Adaptation' },
  { min: 9,  max: 14, label: 'Armor' },
  { min: 15, max: 17, label: 'Astral Projection' },
  { min: 18, max: 19, label: 'Chemical Abilities' },
  { min: 20, max: 24, label: 'Darkness Control' },
  { min: 25, max: 28, label: 'Density Change' },
  { min: 29, max: 30, label: 'Disintegration' },
  { min: 31, max: 35, label: 'Durability' },
  { min: 36, max: 37, label: 'Experience Levels' },
  { min: 38, max: 38, label: 'Flame Abilities' },
  { min: 39, max: 41, label: 'Force Field' },
  { min: 42, max: 43, label: 'Gravity Control' },
  { min: 44, max: 46, label: 'Heightened Agility' },
  { min: 47, max: 51, label: 'Heightened Defense' },
  { min: 52, max: 56, label: 'Heightened Endurance' },
  { min: 57, max: 57, label: 'Ice Abilities' },
  { min: 58, max: 62, label: 'Invisibility' },
  { min: 63, max: 67, label: 'Invulnerability' },
  { min: 68, max: 72, label: 'Life Support' },
  { min: 73, max: 73, label: 'Light Control' },
  { min: 74, max: 74, label: 'Lightning Control' },
  { min: 75, max: 76, label: 'Magnetism' },
  { min: 77, max: 81, label: 'Non-Corporealness' },
  { min: 82, max: 84, label: 'Reflection' },
  { min: 85, max: 89, label: 'Regeneration' },
  { min: 90, max: 94, label: 'Shield' },
  { min: 95, max: 95, label: 'Stretching Abilities' },
  { min: 96, max: 97, label: 'Telekinesis' },
  { min: 98, max: 100,label: 'Vibration Abilities' },
];

// ── Miscellaneous Abilities (d100) ──
MP.CG.MISC_ABILITIES = [
  { min: 1,  max: 2,  label: 'Animal/Plant Abilities' },
  { min: 3,  max: 4,  label: 'Arsenal' },
  { min: 5,  max: 5,  label: 'Astral Projection' },
  { min: 6,  max: 7,  label: 'Base' },
  { min: 8,  max: 9,  label: 'Communicators' },
  { min: 10, max: 11, label: 'Companion' },
  { min: 12, max: 13, label: 'Cosmic Awareness' },
  { min: 14, max: 15, label: 'Cybernetics' },
  { min: 16, max: 17, label: 'Dimensional Travel' },
  { min: 18, max: 19, label: 'Duplication' },
  { min: 20, max: 21, label: 'Energy' },
  { min: 22, max: 23, label: 'Experience Levels' },
  { min: 24, max: 26, label: 'Flight' },
  { min: 27, max: 27, label: 'Grapnel' },
  { min: 28, max: 29, label: 'Healing' },
  { min: 30, max: 31, label: 'Heightened Cool' },
  { min: 32, max: 33, label: 'Heightened Initiative' },
  { min: 34, max: 35, label: 'Heightened Intelligence' },
  { min: 36, max: 37, label: 'Heightened Senses' },
  { min: 38, max: 39, label: 'Illusions' },
  { min: 40, max: 41, label: 'Inventing' },
  { min: 42, max: 47, label: 'Knowledge' },
  { min: 48, max: 49, label: 'Luck' },
  { min: 50, max: 55, label: 'Mental Ability' },
  { min: 56, max: 57, label: 'Negation' },
  { min: 58, max: 63, label: 'Physical Ability' },
  { min: 64, max: 65, label: 'Revivification' },
  { min: 66, max: 67, label: 'Shape-Shifting' },
  { min: 68, max: 68, label: 'Shaping' },
  { min: 69, max: 70, label: 'Size Change' },
  { min: 71, max: 73, label: 'Speed' },
  { min: 74, max: 76, label: 'Stretching Abilities' },
  { min: 77, max: 78, label: 'Summoning' },
  { min: 79, max: 81, label: 'Super Speed' },
  { min: 82, max: 83, label: 'Telepathy' },
  { min: 84, max: 86, label: 'Teleportation' },
  { min: 87, max: 88, label: 'Transformation' },
  { min: 89, max: 91, label: 'Vehicle' },
  { min: 92, max: 93, label: 'Wealth' },
  { min: 94, max: 94, label: 'Weather Control' },
  { min: 95, max: 100,label: 'Willpower' },
];

// ── Weaknesses (d100) ──
MP.CG.WEAKNESSES = [
  { min: 1,  max: 5,  label: 'Diminished Senses' },
  { min: 6,  max: 10, label: 'Distinctive' },
  { min: 11, max: 15, label: 'Low Self-Control' },
  { min: 16, max: 20, label: 'Lowered Intelligence' },
  { min: 21, max: 25, label: 'Nemesis' },
  { min: 26, max: 30, label: 'Personal Problem' },
  { min: 31, max: 35, label: 'Phobia' },
  { min: 36, max: 40, label: 'Physical Disability' },
  { min: 41, max: 45, label: 'Poverty' },
  { min: 46, max: 50, label: 'Prejudice' },
  { min: 51, max: 55, label: 'Psychosis' },
  { min: 56, max: 60, label: 'Reduced Agility' },
  { min: 61, max: 65, label: 'Reduced Cool' },
  { min: 66, max: 70, label: 'Reduced Endurance' },
  { min: 71, max: 75, label: 'Reduced Strength' },
  { min: 76, max: 80, label: 'Special Requirement' },
  { min: 81, max: 85, label: 'Susceptibility' },
  { min: 86, max: 90, label: 'Uneducated' },
  { min: 91, max: 95, label: 'Unliving' },
  { min: 96, max: 100,label: 'Vulnerability' },
];

// ── Master Ability List (unique names, sorted, for dropdown) ──
MP.CG.ALL_ABILITIES = (function() {
  const set = new Set();
  for (const t of [MP.CG.OFFENSIVE_ABILITIES, MP.CG.DEFENSIVE_ABILITIES, MP.CG.MISC_ABILITIES]) {
    for (const e of t) set.add(e.label);
  }
  return [...set].sort();
})();

MP.CG.ALL_WEAKNESSES = MP.CG.WEAKNESSES.map(w => w.label);

// ── Roll Abilities (2 offensive, 2 defensive, 2 misc, 2 weaknesses) ──
MP.CG.rollAbilities = function() {
  function rollTwo(table) {
    const r1 = MP.CG.rollOnTable(table);
    let r2 = MP.CG.rollOnTable(table);
    while (r2.entry.label === r1.entry.label) {
      r2 = MP.CG.rollOnTable(table);
    }
    return [r1, r2];
  };
  return {
    offensive:  rollTwo(MP.CG.OFFENSIVE_ABILITIES),
    defensive:  rollTwo(MP.CG.DEFENSIVE_ABILITIES),
    misc:       rollTwo(MP.CG.MISC_ABILITIES),
    weaknesses: rollTwo(MP.CG.WEAKNESSES),
  };
};

// ── Age (2d10+10 for beginner hero) ──
MP.CG.rollAge = function() {
  return MP.CG.d(10) + MP.CG.d(10) + 10;
};

// ── Gender (d100 tables from 2.1.6) ──
MP.CG.GENDER_IDENTITY = [
  { min: 1,  max: 48, label: 'Woman' },
  { min: 49, max: 96, label: 'Man' },
  { min: 97, max: 100,label: 'Nonbinary' },
];
MP.CG.GENDER_EXPRESSION = [
  { min: 1,  max: 87, label: 'Same' },
  { min: 88, max: 93, label: 'Different' },
  { min: 94, max: 97, label: 'Androgynous' },
  { min: 98, max: 100,label: 'Gender Neutral' },
];

MP.CG.rollGender = function() {
  const id = MP.CG.rollOnTable(MP.CG.GENDER_IDENTITY).entry.label;
  const expr = MP.CG.rollOnTable(MP.CG.GENDER_EXPRESSION).entry.label;
  if (expr === 'Same') return id;
  return id + ' (' + expr + ')';
};

// ── Weight (5d6×10 male, 5d4×10 female per 2.1.9) ──
MP.CG.rollWeight = function(isFemale) {
  let total = 0;
  const sides = isFemale ? 4 : 6;
  for (let i = 0; i < 5; i++) total += MP.CG.d(sides);
  return total * 10;
};

// ── Mass (weight/2 → BC table carry → HTH damage column) ──
MP.CG.calcMass = function(weightLbs) {
  const half = weightLbs / 2;
  // Find closest carry capacity in BC table
  let best = MP.CG.BC_TABLE[0];
  let bestDiff = Math.abs(best[MP.CG.BC_COL.CARRY] - half);
  for (const row of MP.CG.BC_TABLE) {
    const diff = Math.abs(row[MP.CG.BC_COL.CARRY] - half);
    if (diff < bestDiff) { best = row; bestDiff = diff; }
  }
  return best[MP.CG.BC_COL.HTH];
};

// ── Background (d100, roll 3 times per 2.1.10) ──
MP.CG.BACKGROUNDS = [
  { min: 1,   max: 5,   label: 'Medicine' },
  { min: 6,   max: 9,   label: 'Law' },
  { min: 10,  max: 14,  label: 'Engineering/Technology' },
  { min: 15,  max: 19,  label: 'Security/Law Enforcement' },
  { min: 20,  max: 20,  label: 'Fine Art' },
  { min: 21,  max: 23,  label: 'Commercial Art' },
  { min: 24,  max: 26,  label: 'Performing Art' },
  { min: 27,  max: 31,  label: 'Social Work/Charity' },
  { min: 32,  max: 36,  label: 'Media/Communications' },
  { min: 37,  max: 40,  label: 'Sports' },
  { min: 41,  max: 44,  label: 'Education/Academia' },
  { min: 45,  max: 49,  label: 'Crime' },
  { min: 50,  max: 53,  label: 'Military' },
  { min: 54,  max: 58,  label: 'Government' },
  { min: 59,  max: 63,  label: 'Agriculture' },
  { min: 64,  max: 67,  label: 'Research/Science' },
  { min: 68,  max: 71,  label: 'Religion/Mysticism' },
  { min: 72,  max: 75,  label: 'Psychology' },
  { min: 76,  max: 80,  label: 'Labor/Manufacturing' },
  { min: 81,  max: 85,  label: 'Business/Sales' },
  { min: 86,  max: 90,  label: 'Accounting/Finance' },
  { min: 91,  max: 95,  label: 'Travel/Transportation' },
  { min: 96,  max: 100, label: 'Hunting/Survival' },
];

MP.CG.rollBackground = function() {
  const results = [];
  for (let i = 0; i < 3; i++) {
    results.push(MP.CG.rollOnTable(MP.CG.BACKGROUNDS).entry.label);
  }
  return results;
};

// ── Motivation (d100 twice, pick one — per 2.1.11) ──
MP.CG.HERO_MOTIVATIONS = [
  { min: 1,  max: 9,   label: 'Penance',       desc: 'Making up for past wrongs.' },
  { min: 10, max: 18,  label: 'Vengeance',     desc: 'Payback for a horrible wrong.' },
  { min: 19, max: 27,  label: 'Utopian',       desc: 'World-view drives you to confront evil.' },
  { min: 28, max: 36,  label: 'Thrill Seeker',  desc: 'In it for the rush.' },
  { min: 37, max: 45,  label: 'Duty Bound',    desc: 'Obligated to carry on a tradition.' },
  { min: 46, max: 54,  label: 'Need To Know',  desc: 'Motivated by desire for knowledge.' },
  { min: 55, max: 63,  label: 'For Hire',      desc: 'Talent and guts, but what\'s in it for you?' },
  { min: 64, max: 72,  label: 'Self-Defense',  desc: 'The enemy is after you.' },
  { min: 73, max: 81,  label: 'Glory Hound',   desc: 'Basking in adulation of the masses.' },
  { min: 82, max: 90,  label: 'Carnage',       desc: 'You love to blow stuff up.' },
  { min: 91, max: 100, label: 'Justice',       desc: 'Wrongdoers must face the law.' },
];

MP.CG.VILLAIN_MOTIVATIONS = [
  { min: 1,  max: 7,   label: 'Insanity',           desc: 'Deeply irrational extreme drive.' },
  { min: 8,  max: 13,  label: 'Vengeance',          desc: 'Payback for perceived injustice.' },
  { min: 14, max: 20,  label: 'Dystopian',          desc: 'Supports evil authoritarian rule.' },
  { min: 21, max: 27,  label: 'Thrill Seeker',       desc: 'Driven by thrill of daring crimes.' },
  { min: 28, max: 33,  label: 'Anarchist',          desc: 'Tearing down institutions.' },
  { min: 34, max: 40,  label: 'Prejudice',          desc: 'Hates a racial or ethnic group.' },
  { min: 41, max: 47,  label: 'Mercenary/Servitor', desc: 'Performs criminal acts for money.' },
  { min: 48, max: 53,  label: 'Greedy/Egotist',     desc: 'Believes in grand personal destiny.' },
  { min: 54, max: 60,  label: 'Publicity Seeker',   desc: 'Loves media coverage of crimes.' },
  { min: 61, max: 67,  label: 'Belligerent/Carnage',desc: 'Loves to fight and destroy.' },
  { min: 68, max: 73,  label: 'Survival',           desc: 'Driven by uncontrollable needs.' },
  { min: 74, max: 80,  label: 'Dupe',               desc: 'Forced or tricked into crime.' },
  { min: 81, max: 87,  label: 'Conquest',           desc: 'Driven to control and dominate.' },
  { min: 88, max: 93,  label: 'Twisted Honor',      desc: 'Warped sense of justice or duty.' },
  { min: 94, max: 100, label: 'Opportunist',        desc: 'Willing to break laws when safe.' },
];

MP.CG.rollMotivation = function(isVillain) {
  const table = isVillain ? MP.CG.VILLAIN_MOTIVATIONS : MP.CG.HERO_MOTIVATIONS;
  const r1 = MP.CG.rollOnTable(table).entry;
  let r2 = MP.CG.rollOnTable(table).entry;
  while (r2.label === r1.label) r2 = MP.CG.rollOnTable(table).entry;
  return [r1, r2];
};

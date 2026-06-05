// adnd-chargen.js v1.2.0 - 2026-06-05
// AD&D 1e Character Generation Rules (PHB/DMG)
// Ported from AMMOG chargen.js (C:\ammog_2) - browser global, no logic changes

// --- Racial Stat Adjustments (PHB p14) ---
// --- Racial Vision (PHB p16-17, MM entries) ---
// infravision: range in tiles (1 tile = 10' dungeon scale), 0 = none
const RACIAL_VISION = {
  human:     { infravision: 0 },
  dwarf:     { infravision: 6 },    // 60'
  elf:       { infravision: 6 },    // 60'
  gnome:     { infravision: 6 },    // 60'
  'half-elf':{ infravision: 6 },    // 60' (normal infravision per PHB)
  halfling:  { infravision: 0 },    // no infravision per PHB (except Stout)
  'half-orc':{ infravision: 6 },    // 60'
};

// --- Racial Combat Abilities (PHB p15-18) ---
// weaponBonus: { weaponId: +N } — to-hit bonus with specific weapons
// monsterBonus: { templateKey: +N } — to-hit bonus vs specific monster types
// defenseBonus: { templateKey: -N } — AC bonus vs specific monster types (negative = better AC)
// surprise: { threshold: N } — monsters surprised on d6 <= N (normal is 2)
//           condition: 'alone_no_metal' — only when solo and not in metal armor
// sleepCharmResist: N — percentage resistance to sleep/charm (roll d100 > N to affect)
// saveBonus: { type: bonus } — save throw bonuses
const RACIAL_ABILITIES = {
  human: {},
  dwarf: {
    // +1 to hit vs orcs, half-orcs, goblins, hobgoblins
    monsterBonus: { orc: 1, goblin: 1, hobgoblin: 1 },
    // Ogres, trolls, ogre magi, giants, titans: -4 AC bonus (they have trouble hitting small targets)
    defenseBonus: { ogre: 4, ogre_mage: 4, troll: 4, hill_giant: 4, stone_giant: 4,
                    frost_giant: 4, fire_giant: 4, cloud_giant: 4, storm_giant: 4, titan: 4 },
    // Save bonus: +1 per 3.5 CON vs magic wands, staves, rods, spells, poison
    saveConBonus: true,
    // Detect: stonework traps, sliding walls, new construction, approximate depth (1-2 on d6)
    detectStonework: 2,
  },
  elf: {
    // +1 to hit with swords (short, long) and bows (not crossbow)
    weaponBonus: { short_sword: 1, long_sword: 1, short_bow: 1, long_bow: 1 },
    // 90% resistance to sleep and charm
    sleepCharmResist: 90,
    // When alone (or 90'+ ahead) and not in metal armor: surprise on 1-4
    surprise: { threshold: 4, condition: 'alone_no_metal' },
    // Secret doors: 1 in 6 passive, 2 in 6 active, concealed 3 in 6
    secretDoors: { passive: 1, active: 2, concealed: 3 },
    // Languages: elvish, gnome, halfling, goblin, hobgoblin, orcish, gnoll, common
    bonusLanguages: ['elvish', 'gnome', 'halfling', 'goblin', 'hobgoblin', 'orcish', 'gnoll'],
  },
  gnome: {
    // +1 to hit vs kobolds and goblins
    monsterBonus: { kobold: 1, goblin: 1 },
    // Same giant-class defense as dwarf
    defenseBonus: { ogre: 4, ogre_mage: 4, troll: 4, hill_giant: 4, stone_giant: 4,
                    frost_giant: 4, fire_giant: 4, cloud_giant: 4, storm_giant: 4, titan: 4 },
    saveConBonus: true,
    // Detect: underground direction, slope, unsafe walls/ceilings, depth, nearby water (various on d6)
    detectUnderground: { direction: 3, slope: 4, unsafe: 5, depth: 4 },
    bonusLanguages: ['gnome', 'dwarf', 'halfling', 'goblin', 'kobold'],
  },
  'half-elf': {
    // 30% resistance to sleep and charm
    sleepCharmResist: 30,
    // Secret doors: 1 in 6 passive (same as elf), 2 in 6 active
    secretDoors: { passive: 1, active: 2, concealed: 3 },
    bonusLanguages: ['elvish', 'gnome', 'halfling', 'goblin', 'hobgoblin', 'orcish', 'gnoll'],
  },
  halfling: {
    // +1 to hit with slings
    weaponBonus: { sling: 1 },
    // Save bonus: same as dwarf (per 3.5 CON)
    saveConBonus: true,
    // When alone and not in metal armor: surprise on 1-4 (same as elf)
    surprise: { threshold: 4, condition: 'alone_no_metal' },
    bonusLanguages: ['halfling', 'dwarf', 'gnome', 'goblin', 'orcish'],
  },
  'half-orc': {
    bonusLanguages: ['orcish'],
  },
};

const RACIAL_ADJ = {
  human:    {},
  dwarf:    { con: 1, cha: -1 },
  elf:      { dex: 1, con: -1 },
  halfling: { str: -1, dex: 1 },
  gnome:    {},
  'half-elf': {},
  'half-orc': { str: 1, con: 1, cha: -2 },
};

// --- Racial Ability Min/Max (PHB p15, Table III) ---
// [min, max] per ability. Same for M/F for simplicity (using male maxes).
const RACIAL_LIMITS = {
  human:    { str:[3,18], int:[3,18], wis:[3,18], dex:[3,18], con:[3,18], cha:[3,18] },
  dwarf:    { str:[8,18], int:[3,18], wis:[3,18], dex:[3,17], con:[12,19], cha:[3,16] },
  elf:      { str:[3,18], int:[8,18], wis:[3,18], dex:[7,19], con:[6,18], cha:[8,18] },
  gnome:    { str:[6,18], int:[7,18], wis:[3,18], dex:[3,18], con:[8,18], cha:[3,18] },
  'half-elf':{ str:[3,18], int:[4,18], wis:[3,18], dex:[6,18], con:[6,18], cha:[3,18] },
  halfling: { str:[6,17], int:[6,18], wis:[3,17], dex:[8,18], con:[10,19], cha:[3,18] },
  'half-orc':{ str:[6,18], int:[3,17], wis:[3,14], dex:[3,17], con:[13,19], cha:[3,12] },
};

// --- Class Minimum Ability Requirements (PHB ability tables) ---
const CLASS_MINS = {
  fighter:      { str: 9 },
  paladin:      { str: 12, int: 9, wis: 13, con: 9, cha: 17 },
  ranger:       { str: 13, int: 13, wis: 14, con: 14 },
  cleric:       { wis: 9 },
  druid:        { wis: 12, cha: 15 },
  'magic-user': { int: 9 },
  illusionist:  { int: 15, dex: 16 },
  thief:        { dex: 9 },
  assassin:     { str: 12, int: 11, dex: 12 },
  monk:         { str: 15, wis: 15, dex: 15, con: 11 },
};

// --- Race/Class Restrictions (PHB p13, Table I) ---
const RACE_CLASSES = {
  human:    ['fighter','paladin','ranger','cleric','druid','magic-user','illusionist','thief','assassin','monk'],
  dwarf:    ['fighter','thief','assassin'],
  elf:      ['fighter','magic-user','thief','assassin'],
  gnome:    ['fighter','illusionist','thief','assassin'],
  'half-elf':['cleric','druid','fighter','ranger','magic-user','thief','assassin'],
  halfling: ['fighter','thief'],
  'half-orc':['cleric','fighter','thief','assassin'],
};

// --- Weapon Proficiency (PHB p36) ---
// initial: number of weapons proficient at 1st level
// penalty: to-hit penalty for non-proficient weapons
// rate: gain 1 additional proficiency every N levels above 1st
const WEAPON_PROFICIENCY = {
  fighter:      { initial: 4, penalty: -2, rate: 3 },
  paladin:      { initial: 3, penalty: -2, rate: 3 },
  ranger:       { initial: 3, penalty: -2, rate: 3 },
  cleric:       { initial: 2, penalty: -3, rate: 4 },
  druid:        { initial: 2, penalty: -4, rate: 5 },
  'magic-user': { initial: 1, penalty: -5, rate: 6 },
  illusionist:  { initial: 1, penalty: -5, rate: 6 },
  thief:        { initial: 2, penalty: -3, rate: 4 },
  assassin:     { initial: 3, penalty: -2, rate: 4 },
  monk:         { initial: 1, penalty: -3, rate: 2 },
};

// PHB Table I — CHA NPC Reaction Adjustment (used for parley, henchmen, etc.)
function getChaReactionAdj(cha) {
  if (cha <= 3)  return -25;
  if (cha <= 5)  return -20;
  if (cha <= 8)  return -10;
  if (cha <= 12) return 0;
  if (cha <= 15) return 10;
  if (cha <= 17) return 20;
  return 25; // 18+
}
// How many proficiency slots a character has at a given level
function getProficiencySlots(charClass, level) {
  const prof = WEAPON_PROFICIENCY[charClass];
  if (!prof) return 4; // fallback
  // Initial + 1 per rate levels above 1st
  return prof.initial + Math.floor(Math.max(0, level - 1) / prof.rate);
}

// Non-proficiency penalty for a class
function getNonProfPenalty(charClass) {
  const prof = WEAPON_PROFICIENCY[charClass];
  return prof ? prof.penalty : -2;
}

// --- Starting Age Tables (DMG p12) ---
// { base, dice:[n,s] } => base + NdS
const STARTING_AGE = {
  human: {
    cleric: { base:18, dice:[1,4] }, druid: { base:18, dice:[1,4] },
    fighter: { base:15, dice:[1,4] }, paladin: { base:17, dice:[1,4] },
    ranger: { base:20, dice:[1,4] }, 'magic-user': { base:24, dice:[2,8] },
    illusionist: { base:30, dice:[1,6] }, thief: { base:18, dice:[1,4] },
    assassin: { base:20, dice:[1,4] }, monk: { base:21, dice:[1,4] },
  },
  dwarf: {
    fighter: { base:40, dice:[5,4] }, thief: { base:75, dice:[3,6] },
    assassin: { base:75, dice:[3,6] },
  },
  elf: {
    fighter: { base:130, dice:[5,6] }, 'magic-user': { base:150, dice:[5,6] },
    thief: { base:100, dice:[5,6] }, assassin: { base:100, dice:[5,6] },
  },
  gnome: {
    fighter: { base:60, dice:[5,4] }, illusionist: { base:100, dice:[2,12] },
    thief: { base:80, dice:[5,4] }, assassin: { base:80, dice:[5,4] },
  },
  'half-elf': {
    cleric: { base:40, dice:[2,4] }, druid: { base:40, dice:[2,4] },
    fighter: { base:22, dice:[3,4] }, ranger: { base:22, dice:[3,4] },
    'magic-user': { base:30, dice:[2,8] }, thief: { base:22, dice:[3,8] },
    assassin: { base:22, dice:[3,8] },
  },
  halfling: {
    fighter: { base:20, dice:[3,4] }, thief: { base:40, dice:[2,4] },
  },
  'half-orc': {
    cleric: { base:20, dice:[1,4] }, fighter: { base:13, dice:[1,4] },
    thief: { base:20, dice:[2,4] }, assassin: { base:20, dice:[2,4] },
  },
};

// --- Age Categories (DMG p13) ---
// [youngAdult_start, mature_start, middleAged_start, old_start, venerable_start, max_venerable]
const AGE_BRACKETS = {
  human:             [14,  21,   41,   61,   91,  120],
  dwarf:             [35,  51,  151,  251,  351,  450],
  'mountain dwarf':  [40,  61,  176,  276,  401,  525],
  elf:               [100, 176, 551,  876, 1201, 1600], // high elf default
  'high elf':        [100, 176, 551,  876, 1201, 1600],
  'aquatic elf':     [ 75, 151, 451,  701, 1001, 1200],
  drow:              [ 50, 101, 401,  601,  801, 1000],
  'gray elf':        [150, 251, 651, 1001, 1501, 2000],
  'wood elf':        [ 75, 151, 501,  801, 1101, 1350],
  gnome:             [50,  91,  301,  451,  601,  750],
  'half-elf':        [24,  41,  101,  176,  251,  325],
  halfling:          [22,  34,   69,  102,  145,  199],
  'half-orc':        [12,  16,   31,   46,   61,   80],
};

// Determine the interval scale for a race (for max age variable die)
// Returns 1, 10, or 20 based on venerable span
function _ageInterval(race) {
  const b = AGE_BRACKETS[race] || AGE_BRACKETS.human;
  const span = b[5] - b[4]; // venerable span = max_venerable - venerable_start
  if (span < 100) return 1;
  if (span <= 250) return 10;
  return 20;
}

// DMG p13 — Roll maximum character age
// Returns the age at which this character will die of natural causes
function rollMaxAge(race) {
  const b = AGE_BRACKETS[race] || AGE_BRACKETS.human;
  const oldLow  = b[3];
  const oldHigh = b[4] - 1;
  const venLow  = b[4];
  const venHigh = b[5];
  const interval = _ageInterval(race);

  const pct = Math.floor(Math.random() * 100) + 1; // d100

  let base;
  let variable = 0;

  if (pct <= 10) {
    // old, lowest age + d8
    base = oldLow;
    const d8 = Math.floor(Math.random() * 8) + 1;
    variable = d8 * interval;
  } else if (pct <= 25) {
    // old, highest age - d4
    base = oldHigh;
    const d4 = Math.floor(Math.random() * 4) + 1;
    variable = -(d4 * interval);
  } else if (pct <= 60) {
    // venerable, lowest age + d6
    base = venLow;
    const d6 = Math.floor(Math.random() * 6) + 1;
    variable = d6 * interval;
  } else if (pct <= 90) {
    // venerable, highest age - d10 (treat 10 as 0)
    base = venHigh;
    const d10 = Math.floor(Math.random() * 10); // 0-9
    variable = -(d10 * interval);
  } else {
    // venerable, highest age + d20 (treat 20 as 0)
    base = venHigh;
    const d20 = Math.floor(Math.random() * 20); // 0-19
    variable = d20 * interval;
  }

  return Math.max(base, base + variable);
}

// Magical aging causes (DMG p13)
// Returns years added to character age
const MAGICAL_AGING = {
  alter_reality:  3,
  gate:           5,
  limited_wish:   1,
  restoration:    2,
  resurrection:   3,
  wish:           3,
  speed_potion:   1,
  haste:          1,
};

// Apply unnatural aging to a character — ages them by years, recalculate category
// Returns { newAge, oldCat, newCat, statChanges } where statChanges are deltas
function applyUnnaturalAging(char, years) {
  const oldAge = char.age || 0;
  const newAge = oldAge + years;
  const race = char.race || 'human';
  const oldCat = getAgeCategory(race, oldAge);
  const newCat = getAgeCategory(race, newAge);

  // Compute stat deltas from category change
  const oldAdj = getAgeCumulativeAdj(oldCat);
  const newAdj = getAgeCumulativeAdj(newCat);
  const limits = RACIAL_LIMITS[race] || RACIAL_LIMITS.human;

  const statChanges = {};
  if (newCat > oldCat) {
    for (const k of ['str', 'int', 'wis', 'dex', 'con', 'cha']) {
      const delta = newAdj[k] - oldAdj[k];
      if (delta !== 0) {
        const [mn, mx] = limits[k] || [3, 18];
        const cap = (k === 'wis') ? Math.max(mx, 18) : mx;
        const oldVal = char[k] || 10;
        const newVal = Math.max(mn, Math.min(cap, oldVal + delta));
        const actual = newVal - oldVal;
        if (actual !== 0) {
          statChanges[k] = actual;
          char[k] = newVal;
        }
      }
    }
  }

  char.age = newAge;
  return { newAge, oldCat, newCat, statChanges };
}

// Age category names and cumulative adjustments (DMG p13)
// Each entry: adjustments applied AT that category (cumulative with all previous)
const AGE_ADJ = [
  // 0: Young Adult
  { str: 0, int: 0, wis: -1, dex: 0, con: 1, cha: 0 },
  // 1: Mature
  { str: 1, int: 0, wis: 1, dex: 0, con: 0, cha: 0 },
  // 2: Middle Aged
  { str: -1, int: 1, wis: 1, dex: 0, con: -1, cha: 0 },
  // 3: Old
  { str: -2, int: 0, wis: 1, dex: -2, con: -1, cha: 0 },
  // 4: Venerable
  { str: -1, int: 1, wis: 1, dex: -1, con: -1, cha: 0 },
];
const AGE_CAT_NAMES = ['Young Adult', 'Mature', 'Middle Aged', 'Old', 'Venerable'];

// --- Dice ---
function roll(n, s) {
  let total = 0;
  for (let i = 0; i < n; i++) total += Math.floor(Math.random() * s) + 1;
  return total;
}

function roll4d6drop() {
  const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
  rolls.sort((a, b) => a - b);
  return rolls[1] + rolls[2] + rolls[3];
}

// --- PHB Stat Generation Methods ---

function roll3d6() {
  return Math.floor(Math.random()*6)+1 + Math.floor(Math.random()*6)+1 + Math.floor(Math.random()*6)+1;
}

// Method I: 4d6 drop lowest, 6 scores, arrange freely
function rollMethodI() {
  const scores = [];
  for (let i = 0; i < 6; i++) scores.push(roll4d6drop());
  return [scores];
}

// Method II: 3d6 rolled 12 times, keep highest 6, arrange freely
function rollMethodII() {
  const rolls = [];
  for (let i = 0; i < 12; i++) rolls.push(roll3d6());
  rolls.sort((a, b) => b - a);
  return [rolls.slice(0, 6)];
}

// Method III: for each of 6 abilities (in order), roll 3d6 six times, keep highest
// Returns one set already in STR/INT/WIS/DEX/CON/CHA order (not rearrangeable)
function rollMethodIII() {
  const scores = [];
  for (let i = 0; i < 6; i++) {
    let best = 0;
    for (let j = 0; j < 6; j++) { const r = roll3d6(); if (r > best) best = r; }
    scores.push(best);
  }
  return [scores]; // fixed order
}

// Method IV: generate 12 complete characters (3d6 × 6 each), player picks one set
function rollMethodIV() {
  const sets = [];
  for (let c = 0; c < 12; c++) {
    const scores = [];
    for (let i = 0; i < 6; i++) scores.push(roll3d6());
    sets.push(scores);
  }
  return sets;
}

// Roll 3 sets of 6 unassigned scores (legacy, kept for compatibility)
function rollThreeSets() {
  return [rollMethodI()[0], rollMethodI()[0], rollMethodI()[0]];
}

// PHB viability check: at least 2 scores >= 15
function isViable(scores) {
  return scores.filter(s => s >= 15).length >= 2;
}

// --- Apply racial adjustments to assigned stats ---
function applyRacialAdj(stats, race) {
  const adj = RACIAL_ADJ[race] || {};
  const result = { ...stats };
  for (const [k, v] of Object.entries(adj)) {
    result[k] = (result[k] || 0) + v;
  }
  // Clamp to racial limits
  const limits = RACIAL_LIMITS[race] || RACIAL_LIMITS.human;
  for (const k of ['str', 'int', 'wis', 'dex', 'con', 'cha']) {
    const [mn, mx] = limits[k] || [3, 18];
    result[k] = Math.max(mn, Math.min(mx, result[k]));
  }
  return result;
}

// --- Get age category index (0-4) ---
function getAgeCategory(race, age) {
  const brackets = AGE_BRACKETS[race] || AGE_BRACKETS.human;
  if (age < brackets[1]) return 0; // Young Adult
  if (age < brackets[2]) return 1; // Mature
  if (age < brackets[3]) return 2; // Middle Aged
  if (age < brackets[4]) return 3; // Old
  return 4; // Venerable
}

// --- Cumulative age adjustments for a given category ---
function getAgeCumulativeAdj(catIdx) {
  const totals = { str: 0, int: 0, wis: 0, dex: 0, con: 0, cha: 0 };
  for (let i = 0; i <= catIdx; i++) {
    for (const k of ['str', 'int', 'wis', 'dex', 'con', 'cha']) {
      totals[k] += AGE_ADJ[i][k];
    }
  }
  return totals;
}

// --- Apply age adjustments (after racial adj) ---
function applyAgeAdj(stats, race, ageCat) {
  const adj = getAgeCumulativeAdj(ageCat);
  const limits = RACIAL_LIMITS[race] || RACIAL_LIMITS.human;
  const result = { ...stats };
  for (const k of ['str', 'int', 'wis', 'dex', 'con', 'cha']) {
    result[k] += adj[k];
    const [mn, mx] = limits[k] || [3, 18];
    // Wisdom can exceed 18 from age (DMG p13)
    const cap = (k === 'wis') ? Math.max(mx, 18 + adj[k]) : mx;
    result[k] = Math.max(mn, Math.min(cap, result[k]));
  }
  return result;
}

// --- Height/Weight Tables (DMG) ---
// Each entry: { avg, under: [d1,d2], over: [d1,d2] }
// Heights in inches, weights in pounds
const HEIGHT_WEIGHT = {
  male: {
    dwarf:    { hAvg: 48, hUnder: [1,4], hOver: [1,6],  wAvg: 150, wUnder: [2,16], wOver: [2,24] },
    elf:      { hAvg: 60, hUnder: [1,4], hOver: [1,6],  wAvg: 100, wUnder: [1,10], wOver: [1,20] },
    gnome:    { hAvg: 42, hUnder: [1,3], hOver: [1,3],  wAvg:  80, wUnder: [2, 8], wOver: [2,12] },
    'half-elf': { hAvg: 66, hUnder: [1,6], hOver: [1,6], wAvg: 130, wUnder: [1,20], wOver: [1,20] },
    halfling: { hAvg: 36, hUnder: [1,3], hOver: [1,6],  wAvg:  60, wUnder: [2, 8], wOver: [2,12] },
    'half-orc': { hAvg: 66, hUnder: [1,4], hOver: [1,4], wAvg: 150, wUnder: [2,16], wOver: [4,40] },
    human:    { hAvg: 72, hUnder: [1,12], hOver: [1,12], wAvg: 175, wUnder: [3,36], wOver: [5,60] },
  },
  female: {
    dwarf:    { hAvg: 46, hUnder: [1,4], hOver: [1,4],  wAvg: 120, wUnder: [2,16], wOver: [2,20] },
    elf:      { hAvg: 54, hUnder: [1,4], hOver: [1,6],  wAvg:  80, wUnder: [1,10], wOver: [2,12] },
    gnome:    { hAvg: 39, hUnder: [1,3], hOver: [1,3],  wAvg:  75, wUnder: [1, 8], wOver: [1, 8] },
    'half-elf': { hAvg: 62, hUnder: [1,6], hOver: [1,6], wAvg: 100, wUnder: [1,12], wOver: [2,16] },
    halfling: { hAvg: 33, hUnder: [1,3], hOver: [1,3],  wAvg:  50, wUnder: [2, 8], wOver: [2, 8] },
    'half-orc': { hAvg: 62, hUnder: [1,3], hOver: [1,3], wAvg: 120, wUnder: [3,18], wOver: [4,32] },
    human:    { hAvg: 66, hUnder: [1,6], hOver: [1,8],  wAvg: 130, wUnder: [3,30], wOver: [4,48] },
  },
};

// Height/weight determination percentile tables (DMG)
const HW_DIST = {
  dwarf:    { hUnder: 15, hOver: 80, wUnder: 20, wOver: 65 },
  elf:      { hUnder: 10, hOver: 80, wUnder: 15, wOver: 90 },
  gnome:    { hUnder: 20, hOver: 85, wUnder: 20, wOver: 75 },
  'half-elf': { hUnder: 35, hOver: 90, wUnder: 20, wOver: 85 },
  halfling: { hUnder: 10, hOver: 90, wUnder: 10, wOver: 50 },
  'half-orc': { hUnder: 45, hOver: 75, wUnder: 30, wOver: 55 },
  human:    { hUnder: 20, hOver: 80, wUnder: 25, wOver: 75 },
};

function rollHeightWeight(race, gender) {
  const gdr = (gender === 'female') ? 'female' : 'male';
  const tbl = HEIGHT_WEIGHT[gdr][race] || HEIGHT_WEIGHT[gdr].human;
  const dist = HW_DIST[race] || HW_DIST.human;
  const isShort = tbl.hAvg < 60; // under 5' — smaller variance per DMG note

  // Height
  const hRoll = Math.floor(Math.random() * 100) + 1;
  let height;
  if (hRoll <= dist.hUnder) {
    height = tbl.hAvg - roll(tbl.hUnder[0], tbl.hUnder[1]);
  } else if (hRoll > dist.hOver) {
    height = tbl.hAvg + roll(tbl.hOver[0], tbl.hOver[1]);
  } else {
    // Average band: roll d% for minor variance (DMG: 01-30 shorter 1-4.5", 71-00 taller 1-4.5")
    const vRoll = Math.floor(Math.random() * 100) + 1;
    const variance = isShort ? roll(1, 3) : roll(1, 4);
    if (vRoll <= 30) height = tbl.hAvg - variance;
    else if (vRoll >= 71) height = tbl.hAvg + variance;
    else height = tbl.hAvg;
  }

  // Weight
  const wRoll = Math.floor(Math.random() * 100) + 1;
  let weight;
  const lightRace = tbl.wAvg <= 100;
  if (wRoll <= dist.wUnder) {
    weight = tbl.wAvg - roll(tbl.wUnder[0], tbl.wUnder[1]);
  } else if (wRoll > dist.wOver) {
    weight = tbl.wAvg + roll(tbl.wOver[0], tbl.wOver[1]);
  } else {
    const vRoll = Math.floor(Math.random() * 100) + 1;
    const variance = lightRace ? roll(1, 4) : roll(1, 8);
    if (vRoll <= 30) weight = tbl.wAvg - variance;
    else if (vRoll >= 71) weight = tbl.wAvg + variance;
    else weight = tbl.wAvg;
  }

  return { height: Math.max(24, height), weight: Math.max(30, weight) };
}

// Format height as feet/inches string
function formatHeight(inches) {
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

// --- Secondary Skills (DMG p12) ---
const SECONDARY_SKILLS = [
  { range: [1,  2],  name: 'Armorer' },
  { range: [3,  4],  name: 'Bowyer/Fletcher' },
  { range: [5,  10], name: 'Farmer/Gardener' },
  { range: [11, 14], name: 'Fisher (netting)' },
  { range: [15, 20], name: 'Forester' },
  { range: [21, 23], name: 'Gambler' },
  { range: [24, 27], name: 'Hunter/Fisher' },
  { range: [28, 32], name: 'Husbandman' },
  { range: [33, 34], name: 'Jeweler/Lapidary' },
  { range: [35, 37], name: 'Leather Worker/Tanner' },
  { range: [38, 39], name: 'Limner/Painter' },
  { range: [40, 42], name: 'Mason/Carpenter' },
  { range: [43, 44], name: 'Miner' },
  { range: [45, 46], name: 'Navigator' },
  { range: [47, 49], name: 'Sailor' },
  { range: [50, 51], name: 'Shipwright' },
  { range: [52, 54], name: 'Tailor/Weaver' },
  { range: [55, 57], name: 'Teamster/Freighter' },
  { range: [58, 60], name: 'Trader/Barterer' },
  { range: [61, 64], name: 'Trapper/Furrier' },
  { range: [65, 67], name: 'Woodworker/Cabinetmaker' },
  { range: [68, 85], name: null }, // No skill of measurable worth
  // 86-00: roll twice (handled below)
];

function _rollOneSkillEntry() {
  const d = Math.floor(Math.random() * 85) + 1; // only 1-85, skipping the re-roll band
  for (const entry of SECONDARY_SKILLS) {
    if (d >= entry.range[0] && d <= entry.range[1]) return entry.name;
  }
  return null;
}

function rollSecondarySkills() {
  const d = Math.floor(Math.random() * 100) + 1;
  if (d >= 86) {
    // Roll twice, skip duplicates
    const a = _rollOneSkillEntry();
    const b = _rollOneSkillEntry();
    const skills = [];
    if (a) skills.push(a);
    if (b && b !== a) skills.push(b);
    return skills;
  }
  for (const entry of SECONDARY_SKILLS) {
    if (d >= entry.range[0] && d <= entry.range[1]) {
      return entry.name ? [entry.name] : [];
    }
  }
  return [];
}
function rollStartingAge(race, charClass) {
  const raceTable = STARTING_AGE[race];
  if (!raceTable || !raceTable[charClass]) {
    // Fallback: use human table or base race young adult age
    const brackets = AGE_BRACKETS[race] || AGE_BRACKETS.human;
    return brackets[0] + roll(1, 4);
  }
  const entry = raceTable[charClass];
  return entry.base + roll(entry.dice[0], entry.dice[1]);
}

// --- Get valid classes for a race + stats (after racial adj) ---
function getValidClasses(race, adjStats) {
  const allowed = RACE_CLASSES[race] || RACE_CLASSES.human;
  return allowed.filter(cls => {
    const mins = CLASS_MINS[cls] || {};
    for (const [ability, minVal] of Object.entries(mins)) {
      if ((adjStats[ability] || 0) < minVal) return false;
    }
    return true;
  });
}

// --- Validate a full character creation request ---
// Returns { valid, error, finalStats, age, ageCat, ageCatName, gold, gender, height, weight } or { valid:false, error }
function validateAndBuild(race, charClass, baseStats, gender, preRolledSkills) {
  // Check race/class allowed
  const allowed = RACE_CLASSES[race] || RACE_CLASSES.human;
  if (!allowed.includes(charClass)) {
    return { valid: false, error: `A ${race} cannot be a ${charClass}.` };
  }

  // Apply racial adjustments
  const racialStats = applyRacialAdj(baseStats, race);

  // Check class minimums against racial-adjusted stats
  const mins = CLASS_MINS[charClass] || {};
  for (const [ability, minVal] of Object.entries(mins)) {
    if ((racialStats[ability] || 0) < minVal) {
      return { valid: false, error: `${charClass} requires ${ability.toUpperCase()} ${minVal}, you have ${racialStats[ability]}.` };
    }
  }

  // Roll age
  const age = rollStartingAge(race, charClass);
  const ageCat = getAgeCategory(race, age);
  const ageCatName = AGE_CAT_NAMES[ageCat];

  // Apply age adjustments
  const finalStats = applyAgeAdj(racialStats, race, ageCat);

  // Roll height/weight
  const gdr = (gender === 'female') ? 'female' : 'male';
  const hw = rollHeightWeight(race, gdr);

  // Apply human PC extra variance (DMG p11): humans can have wider range than NPC table
  // Male: +0-20" height, +0-200# weight  Female: +0-12" height, +0-120# weight
  // We implement this as an optional additional roll that occasionally pushes beyond the table
  let { height, weight } = hw;
  if (race === 'human') {
    const extraHRoll = Math.floor(Math.random() * 100) + 1;
    const extraWRoll = Math.floor(Math.random() * 100) + 1;
    if (extraHRoll >= 96) height += (gdr === 'male') ? roll(1, 20) : roll(1, 12);
    if (extraWRoll >= 96) weight += (gdr === 'male') ? roll(10, 20) : roll(10, 12);
  }

  // Roll or use pre-rolled secondary skills
  const secondarySkills = Array.isArray(preRolledSkills) ? preRolledSkills : rollSecondarySkills();

  const maxAge = rollMaxAge(race);

  return { valid: true, finalStats, age, ageCat, ageCatName, racialStats, gender: gdr, height, weight, secondarySkills, maxAge };
}

// --- Starting Gold (PHB p35) ---
function rollStartingGold(charClass) {
  switch (charClass) {
    case 'fighter': case 'paladin': case 'ranger':
      return roll(5, 4) * 10;
    case 'cleric': case 'druid':
      return roll(3, 6) * 10;
    case 'thief': case 'assassin':
      return roll(2, 6) * 10;
    case 'magic-user': case 'illusionist':
      return roll(2, 4) * 10;
    case 'monk':
      return roll(5, 4);
    default:
      return roll(3, 6) * 10;
  }
}

// --- HP ---
const CLASS_HD = {
  fighter: 10, cleric: 8, thief: 6, 'magic-user': 4,
  ranger: 8, paladin: 10, assassin: 6, monk: 4, druid: 8, illusionist: 4,
};

// PHB: Only fighter sub-classes (fighter, paladin, ranger) get 18/xx percentile strength
const FIGHTER_TYPES = ['fighter', 'paladin', 'ranger'];

function rollPercentileStr(charClass, str) {
  if (str === 18 && FIGHTER_TYPES.includes(charClass)) {
    return roll(1, 100);
  }
  return 0;
}

function conHpBonus(con) {
  if (con <= 3) return -2;
  if (con <= 6) return -1;
  if (con <= 14) return 0;
  if (con === 15) return 1;
  if (con === 16) return 2;
  if (con === 17) return 3;
  if (con === 18) return 4;
  return 5; // 19 (dwarves, halflings, half-orcs can reach 19 CON)
}

function rollHp(charClass, con) {
  const hd = CLASS_HD[charClass] || 8;
  let bonus = conHpBonus(con);
  // PHB: non-fighter types capped at +2 CON HP bonus
  if (!FIGHTER_TYPES.includes(charClass) && bonus > 2) bonus = 2;
  // Rangers get 2 hit dice at level 1 (PHB)
  const numDice = (charClass === 'ranger') ? 2 : 1;
  let total = 0;
  for (let i = 0; i < numDice; i++) {
    total += roll(1, hd) + bonus;
  }
  return Math.max(1, total);
}

// PHB: Class XP bonus for high primary ability scores (+10%)
// Returns bonus XP amount (integer) for a given base XP award.
// Each class has different requirements; some classes get no bonus at all.
function classXPBonus(charClass, stats, baseXP) {
  let qualifies = false;
  switch (charClass) {
    case 'fighter':     qualifies = stats.str > 15; break;
    case 'paladin':     qualifies = stats.str > 15 && stats.wis > 15; break;
    case 'ranger':      qualifies = stats.str > 15 && stats.int > 15 && stats.wis > 15; break;
    case 'cleric':      qualifies = stats.wis > 15; break;
    case 'druid':       qualifies = stats.wis > 15 && stats.cha > 15; break;
    case 'magic-user':  qualifies = stats.int > 15; break;
    case 'thief':       qualifies = stats.dex > 15; break;
    // Illusionist, Assassin, Monk: explicitly NO bonus per PHB
    case 'illusionist': qualifies = false; break;
    case 'assassin':    qualifies = false; break;
    case 'monk':        qualifies = false; break;
    default:            qualifies = false; break;
  }
  return qualifies ? Math.ceil(baseXP * 0.10) : 0;
}

// --- Valid Multiclass Combinations (PHB p33) ---
// Keyed by race. Each entry is an array of sorted class arrays.
// Humans use dual-class (different mechanic), not listed here.
const MULTICLASS_COMBOS = {
  dwarf: [
    ['fighter','thief'],
  ],
  elf: [
    ['fighter','magic-user'],
    ['fighter','thief'],
    ['magic-user','thief'],
    ['fighter','magic-user','thief'],
  ],
  gnome: [
    ['fighter','illusionist'],
    ['fighter','thief'],
    ['illusionist','thief'],
  ],
  'half-elf': [
    ['cleric','fighter'],
    ['cleric','ranger'],
    ['cleric','magic-user'],
    ['fighter','magic-user'],
    ['fighter','thief'],
    ['magic-user','thief'],
    ['cleric','fighter','magic-user'],
    ['fighter','magic-user','thief'],
  ],
  halfling: [
    ['fighter','thief'],
  ],
  'half-orc': [
    ['cleric','fighter'],
    ['cleric','thief'],
    ['cleric','assassin'],
    ['fighter','thief'],
    ['fighter','assassin'],
  ],
};

// --- Race/Class Level Caps (PHB Table II) ---
// U = unlimited (null), no = not allowed (0), () = NPC only (negative)
// Stat-dependent caps: function(stats) => maxLevel
// Simple caps: integer
const RACE_LEVEL_CAPS = {
  dwarf: {
    cleric:       -8,   // NPC only, max 8
    druid:        0,
    fighter:      (s) => s.str >= 18 ? 9 : s.str === 17 ? 8 : 7,
    paladin:      0,
    ranger:       0,
    'magic-user': 0,
    illusionist:  0,
    thief:        null,
    assassin:     9,
    monk:         0,
  },
  elf: {
    cleric:       -7,   // NPC only
    druid:        0,
    fighter:      (s) => s.str >= 18 ? 7 : s.str === 17 ? 6 : 5,
    paladin:      0,
    ranger:       0,
    'magic-user': (s) => s.int >= 18 ? 11 : s.int === 17 ? 10 : 9,
    illusionist:  0,
    thief:        null,
    assassin:     10,
    monk:         0,
  },
  gnome: {
    cleric:       -7,   // NPC only
    druid:        0,
    fighter:      (s) => s.str >= 18 ? 6 : 5,
    paladin:      0,
    ranger:       0,
    'magic-user': 0,
    illusionist:  (s) => (s.int >= 17 && s.dex >= 17) ? 7 : s.int >= 17 || s.dex >= 17 ? 6 : 5,
    thief:        null,
    assassin:     8,
    monk:         0,
  },
  'half-elf': {
    cleric:       5,
    druid:        null,
    fighter:      (s) => s.str >= 18 ? 8 : s.str === 17 ? 7 : 6,
    paladin:      0,
    ranger:       8,
    'magic-user': (s) => s.int >= 18 ? 8 : s.int === 17 ? 7 : 6,
    illusionist:  0,
    thief:        null,
    assassin:     11,
    monk:         0,
  },
  halfling: {
    cleric:       0,
    druid:        4,
    fighter:      (s) => s.str >= 18 ? 6 : s.str === 17 ? 5 : 4,
    paladin:      0,
    ranger:       0,
    'magic-user': 0,
    illusionist:  0,
    thief:        null,
    assassin:     0,
    monk:         0,
  },
  'half-orc': {
    cleric:       -6,   // NPC only
    druid:        0,
    fighter:      10,
    paladin:      0,
    ranger:       0,
    'magic-user': 0,
    illusionist:  0,
    thief:        (s) => s.dex >= 18 ? 8 : s.dex === 17 ? 7 : 6,
    assassin:     8,
    monk:         0,
  },
  human: {
    // Humans: unlimited in all allowed classes via dual-class
    fighter: null, paladin: null, ranger: null, cleric: null, druid: null,
    'magic-user': null, illusionist: null, thief: null, assassin: null, monk: null,
  },
};

// Returns the level cap for a race/class combo given current stats.
// Returns: null = unlimited, 0 = not allowed as PC, negative = NPC-only (abs = cap),
//          positive integer = max level
function getRaceLevelCap(race, charClass, stats) {
  const raceCaps = RACE_LEVEL_CAPS[race];
  if (!raceCaps) return null; // unknown race = no restriction
  const cap = raceCaps[charClass];
  if (cap === undefined) return 0; // not in table = not allowed
  if (typeof cap === 'function') return cap(stats || {});
  return cap; // null, 0, negative, or integer
}

// Returns true if race can play this class as a PC (single or multi).
// NPC-only (negative cap) returns false for PC use but allows multiclass if in MULTICLASS_COMBOS.
function canPlayClass(race, charClass, stats) {
  if (race === 'human') return RACE_CLASSES.human.includes(charClass);
  const cap = getRaceLevelCap(race, charClass, stats);
  if (cap === 0) return false;
  return true;
}

// Returns array of valid multiclass combo arrays for a race given stats.
// Each element is a sorted array of class strings, e.g. ['fighter','magic-user']
// Filters out combos where the character doesn't meet CLASS_MINS for any component class.
function getValidMulticlasses(race, stats) {
  const combos = MULTICLASS_COMBOS[race] || [];
  return combos.filter(combo => combo.every(cls => {
    // Must meet class minimums
    const mins = CLASS_MINS[cls] || {};
    for (const [stat, min] of Object.entries(mins)) {
      if ((stats[stat] || 0) < min) return false;
    }
    // Level cap must not be 0 (explicitly banned)
    const cap = getRaceLevelCap(race, cls, stats);
    return cap !== 0;
  }));
}

// For a multiclass character, returns HP as average of rolled HD across all classes.
// Pass classes array and con score. Returns integer HP.
function rollMulticlassHp(classes, con) {
  const bonus = (() => {
    const b = conHpBonus(con);
    // Non-fighter-type cap of +2 applies unless ALL classes are fighter types
    const anyNonFighter = classes.some(c => !FIGHTER_TYPES.includes(c));
    return anyNonFighter ? Math.min(b, 2) : b;
  })();
  const total = classes.reduce((sum, cls) => {
    const hd = CLASS_HD[cls] || 8;
    return sum + roll(1, hd) + bonus;
  }, 0);
  return Math.max(1, Math.round(total / classes.length));
}

const ADNDChargen = {
  RACIAL_ADJ, RACIAL_LIMITS, CLASS_MINS, RACE_CLASSES, RACIAL_VISION, RACIAL_ABILITIES,
  WEAPON_PROFICIENCY, getProficiencySlots, getNonProfPenalty,
  STARTING_AGE, AGE_BRACKETS, AGE_ADJ, AGE_CAT_NAMES, MAGICAL_AGING,
  CLASS_HD, FIGHTER_TYPES,
  roll, roll4d6drop, rollThreeSets,
  rollMethodI, rollMethodII, rollMethodIII, rollMethodIV, isViable,
  rollHeightWeight, formatHeight, rollSecondarySkills, SECONDARY_SKILLS,
  applyRacialAdj, getAgeCategory, getAgeCumulativeAdj, applyAgeAdj,
  rollStartingAge, rollMaxAge, applyUnnaturalAging,
  getValidClasses, validateAndBuild,
  rollStartingGold, conHpBonus, rollHp, rollPercentileStr,
  classXPBonus, getChaReactionAdj,
  MULTICLASS_COMBOS, RACE_LEVEL_CAPS,
  getRaceLevelCap, canPlayClass, getValidMulticlasses, rollMulticlassHp,
};
if (typeof module !== 'undefined' && module.exports) module.exports = ADNDChargen;
if (typeof window !== 'undefined') window.ADNDChargen = ADNDChargen;

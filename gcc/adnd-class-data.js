// adnd-class-data.js v1.2.0 - 2026-06-05
// PHB class tables: XP, level titles, HD, spell slots, attacks/round, class abilities, saving throws, languages, alignment
// Ported from AMMOG class-data.js (C:\ammog_2) - browser global, no logic changes

// === XP TABLES (index = level-1) ===
const XP_TABLE = {
  fighter:     [0, 2001, 4001, 8001, 18001, 35001, 70001, 125001, 250001, 500001, 750001],
  paladin:     [0, 2751, 5501, 12001, 24001, 45001, 95001, 175001, 350001, 700001, 1050001],
  ranger:      [0, 2251, 4501, 10001, 20001, 40001, 90001, 150001, 225001, 325001, 650001, 975001],
  cleric:      [0, 1501, 3001, 6001, 13001, 27501, 55001, 110001, 225001, 450001, 675001],
  druid:       [0, 2001, 4001, 7501, 12501, 20001, 35001, 60001, 90001, 125001, 200001, 300001, 750001, 1500001],
  magic_user:  [0, 2501, 5001, 10001, 22501, 40001, 60001, 90001, 135001, 250001, 375001, 750001, 1125001, 1500001, 1875001, 2250001, 2625001, 3000001],
  illusionist: [0, 2251, 4501, 9001, 18001, 35001, 60001, 95001, 145001, 220001, 440001, 660001],
  thief:       [0, 1251, 2501, 5001, 10001, 20001, 42501, 70001, 110001, 160001, 220001, 440001],
  assassin:    [0, 1501, 3001, 6001, 12001, 25001, 50001, 100001, 200001, 300001, 425001, 575001, 750001, 1000001, 1500001],
  monk:        [0, 2251, 4751, 10001, 22501, 47501, 98001, 200001, 350001, 500001, 700001, 950001, 1250001, 1750001, 2250001, 2750001, 3250001],
  bard:        [0, 2001, 4001, 8001, 16001, 25001, 40001, 60001, 85001, 110001, 150001, 200001, 400001, 600001, 800001, 1000001, 1200001, 1400001, 1600001, 2000001, 2200001, 3000001],
};

// Post-max XP per additional level
const XP_PER_LEVEL_AFTER = {
  fighter: 250000, paladin: 350000, ranger: 325000, cleric: 225000, druid: null,
  magic_user: 375000, illusionist: 220000, thief: 220000, assassin: null, monk: null, bard: null,
};

// === LEVEL TITLES ===
const LEVEL_TITLES = {
  fighter:     ['Veteran','Warrior','Swordsman','Hero','Swashbuckler','Myrmidon','Champion','Superhero','Lord'],
  paladin:     ['Gallant','Keeper','Protector','Defender','Warder','Guardian','Chevalier','Justiciar','Paladin'],
  ranger:      ['Runner','Strider','Scout','Courser','Tracker','Guide','Pathfinder','Ranger','Ranger Knight','Ranger Lord'],
  cleric:      ['Acolyte','Adept','Priest','Curate','','Canon','Lama','Patriarch','High Priest'],
  druid:       ['Aspirant','Ovate','Initiate 1st Circle','Initiate 2nd Circle','Initiate 3rd Circle','Initiate 4th Circle','Initiate 5th Circle','Initiate 6th Circle','Initiate 7th Circle','Initiate 8th Circle','Initiate 9th Circle','Druid','Archdruid','The Great Druid'],
  magic_user:  ['Prestidigitator','Evoker','Conjurer','Theurgist','Thaumaturgist','Magician','Enchanter','Warlock','Sorcerer','Necromancer','Wizard'],
  illusionist: ['Prestidigitator','Minor Trickster','Trickster','Master Trickster','Cabalist','Visionist','Phantasmist','Apparitionist','Spellbinder','Illusionist'],
  thief:       ['Rogue','Footpad','Cutpurse','Robber','Burglar','Filcher','Sharper','Magsman','Thief','Master Thief'],
  assassin:    ['Bravo','Rutterkin','Waghalter','Murderer','Thug','Killer','Cutthroat','Executioner','Assassin','Expert Assassin','Senior Assassin','Chief Assassin','Prime Assassin','Guildmaster Assassin','Grandfather of Assassins'],
  monk:        ['Novice','Initiate','Brother','Disciple','Immaculate','Master','Superior Master','Master of Dragons','Master of the North Wind','Master of the West Wind','Master of the South Wind','Master of the East Wind','Master of Winter','Master of Autumn','Master of Summer','Master of Spring','Grand Master of Flowers'],
  bard:        ['Rhymer','Lyrist','Sonnateer','Skald','Racaraide','Joungleur','Troubador','Minstrel','Muse','Lorist','Bard','Master Bard'],
};

// === HIT DICE ===
// hdType: die type, hdCount: max HD, hpPerLevel: HP after max HD
const HD_INFO = {
  fighter:     { hdType: 10, hdCount: 9, hpPerLevel: 3 },
  paladin:     { hdType: 10, hdCount: 9, hpPerLevel: 3 },
  ranger:      { hdType: 8, hdCount: 11, hpPerLevel: 2, startDice: 2 },  // 2 dice at L1
  cleric:      { hdType: 8, hdCount: 9, hpPerLevel: 2 },
  druid:       { hdType: 8, hdCount: 14, hpPerLevel: 0 },  // 14 HD cap, no extra
  magic_user:  { hdType: 4, hdCount: 11, hpPerLevel: 1 },
  illusionist: { hdType: 4, hdCount: 10, hpPerLevel: 1 },
  thief:       { hdType: 6, hdCount: 10, hpPerLevel: 2 },
  assassin:    { hdType: 6, hdCount: 15, hpPerLevel: 0 },
  monk:        { hdType: 4, hdCount: 17, hpPerLevel: 0, startDice: 2 },
  bard:        { hdType: 6, hdCount: 10, hpPerLevel: 1 },  // + previous fighter/thief HD
};

// === SPELL SLOTS ===
// [level1, level2, ...] per caster level. Index = caster_level - min_spell_level
const CLERIC_SPELLS = [
  //  1  2  3  4  5  6  7
  [1, 0, 0, 0, 0, 0, 0], // L1
  [2, 0, 0, 0, 0, 0, 0], // L2
  [2, 1, 0, 0, 0, 0, 0], // L3
  [3, 2, 0, 0, 0, 0, 0], // L4
  [3, 3, 1, 0, 0, 0, 0], // L5
  [3, 3, 2, 0, 0, 0, 0], // L6
  [3, 3, 2, 1, 0, 0, 0], // L7
  [3, 3, 3, 2, 0, 0, 0], // L8
  [4, 4, 3, 2, 1, 0, 0], // L9  (5th requires WIS 17)
  [4, 4, 3, 3, 2, 0, 0], // L10
  [5, 4, 4, 3, 2, 1, 0], // L11
  [6, 5, 5, 3, 2, 2, 0], // L12
  [6, 6, 6, 4, 2, 2, 0], // L13
  [6, 6, 6, 5, 3, 2, 0], // L14
  [7, 7, 7, 5, 4, 2, 0], // L15
  [7, 7, 7, 6, 5, 3, 1], // L16 (7th requires WIS 18)
  [8, 8, 8, 6, 5, 3, 1], // L17
  [8, 8, 8, 7, 6, 4, 1], // L18
  [9, 9, 9, 7, 6, 4, 2], // L19
  [9, 9, 9, 8, 7, 5, 2], // L20
  [9, 9, 9, 9, 8, 6, 2], // L21
  [9, 9, 9, 9, 9, 6, 3], // L22
  [9, 9, 9, 9, 9, 7, 3], // L23
  [9, 9, 9, 9, 9, 8, 3], // L24
  [9, 9, 9, 9, 9, 8, 4], // L25
  [9, 9, 9, 9, 9, 9, 4], // L26
  [9, 9, 9, 9, 9, 9, 5], // L27
  [9, 9, 9, 9, 9, 9, 6], // L28
  [9, 9, 9, 9, 9, 9, 7], // L29
];

const DRUID_SPELLS = [
  // 1  2  3  4  5  6  7
  [2, 0, 0, 0, 0, 0, 0], // L1
  [2, 1, 0, 0, 0, 0, 0], // L2
  [3, 2, 1, 0, 0, 0, 0], // L3
  [4, 2, 2, 0, 0, 0, 0], // L4
  [4, 3, 2, 0, 0, 0, 0], // L5
  [4, 3, 2, 1, 0, 0, 0], // L6
  [4, 4, 3, 1, 0, 0, 0], // L7
  [4, 4, 3, 2, 0, 0, 0], // L8
  [5, 4, 3, 2, 1, 0, 0], // L9
  [5, 4, 3, 3, 2, 0, 0], // L10
  [5, 5, 3, 3, 2, 1, 0], // L11
  [5, 5, 4, 4, 3, 2, 1], // L12
  [6, 5, 5, 5, 4, 3, 2], // L13
  [6, 6, 6, 6, 5, 4, 3], // L14
];

const MU_SPELLS = [
  // 1  2  3  4  5  6  7  8  9
  [1, 0, 0, 0, 0, 0, 0, 0, 0], // L1
  [2, 0, 0, 0, 0, 0, 0, 0, 0], // L2
  [2, 1, 0, 0, 0, 0, 0, 0, 0], // L3
  [3, 2, 0, 0, 0, 0, 0, 0, 0], // L4
  [4, 2, 1, 0, 0, 0, 0, 0, 0], // L5
  [4, 2, 2, 0, 0, 0, 0, 0, 0], // L6
  [4, 3, 2, 1, 0, 0, 0, 0, 0], // L7
  [4, 3, 3, 2, 0, 0, 0, 0, 0], // L8
  [4, 3, 3, 2, 1, 0, 0, 0, 0], // L9
  [4, 4, 3, 2, 2, 0, 0, 0, 0], // L10
  [4, 4, 4, 3, 3, 0, 0, 0, 0], // L11
  [4, 4, 4, 4, 4, 1, 0, 0, 0], // L12
  [5, 5, 5, 4, 4, 2, 0, 0, 0], // L13
  [5, 5, 5, 4, 4, 2, 1, 0, 0], // L14
  [5, 5, 5, 5, 5, 2, 1, 0, 0], // L15
  [5, 5, 5, 5, 5, 3, 2, 1, 0], // L16
  [5, 5, 5, 5, 5, 3, 3, 2, 0], // L17
  [5, 5, 5, 5, 5, 3, 3, 2, 1], // L18
  [5, 5, 5, 5, 5, 3, 3, 3, 1], // L19
  [5, 5, 5, 5, 5, 4, 3, 3, 2], // L20
  [5, 5, 5, 5, 5, 4, 4, 4, 2], // L21
  [5, 5, 5, 5, 5, 5, 4, 4, 3], // L22
  [5, 5, 5, 5, 5, 5, 5, 5, 3], // L23
  [5, 5, 5, 5, 5, 5, 5, 5, 4], // L24
  [5, 5, 5, 5, 5, 5, 5, 5, 5], // L25
  [6, 6, 6, 6, 5, 5, 5, 5, 5], // L26
  [6, 6, 6, 6, 6, 6, 6, 5, 5], // L27
  [6, 6, 6, 6, 6, 6, 6, 6, 6], // L28
  [7, 7, 7, 7, 7, 6, 6, 6, 6], // L29
];

const ILLUSIONIST_SPELLS = [
  // 1  2  3  4  5  6  7
  [1, 0, 0, 0, 0, 0, 0], // L1
  [2, 0, 0, 0, 0, 0, 0], // L2
  [2, 1, 0, 0, 0, 0, 0], // L3
  [3, 2, 0, 0, 0, 0, 0], // L4
  [4, 2, 1, 0, 0, 0, 0], // L5
  [4, 3, 1, 0, 0, 0, 0], // L6
  [4, 3, 2, 0, 0, 0, 0], // L7
  [4, 3, 2, 1, 0, 0, 0], // L8
  [5, 3, 3, 2, 1, 0, 0], // L9
  [5, 4, 3, 2, 1, 0, 0], // L10
  [5, 4, 3, 3, 2, 0, 0], // L11
  [5, 5, 4, 3, 2, 1, 0], // L12
  [5, 5, 4, 3, 2, 2, 0], // L13
  [5, 5, 4, 3, 2, 2, 1], // L14
  [5, 5, 5, 4, 3, 2, 2], // L15
  [5, 5, 5, 5, 4, 3, 2], // L16
  [5, 5, 5, 5, 5, 3, 2], // L17
  [5, 5, 5, 5, 5, 3, 3], // L18
  [5, 5, 5, 5, 5, 4, 3], // L19
  [5, 5, 5, 5, 5, 4, 3], // L20
  [5, 5, 5, 5, 5, 4, 3], // L21
  [5, 5, 5, 5, 5, 5, 4], // L22
  [5, 5, 5, 5, 5, 5, 5], // L23
  [6, 6, 6, 6, 6, 5, 5], // L24
  [6, 6, 6, 6, 6, 6, 6], // L25
  [7, 7, 7, 7, 7, 6, 6], // L26
];

// Paladin clerical spells (starting at paladin level 9)
const PALADIN_SPELLS = {
  // paladin_level: [1st, 2nd, 3rd, 4th]
  9:  [1, 0, 0, 0],
  10: [2, 0, 0, 0],
  11: [2, 1, 0, 0],
  12: [2, 2, 0, 0],
  13: [2, 2, 1, 0],
  14: [3, 2, 1, 0],
  15: [3, 2, 1, 1],
  16: [3, 3, 1, 1],
  17: [3, 3, 2, 1],
  18: [3, 3, 3, 1],
  19: [3, 3, 3, 2],
  20: [3, 3, 3, 3],
};

// Ranger spells (druidic starting at ranger level 8, MU starting at level 9)
const RANGER_SPELLS = {
  // ranger_level: { druid: [1st, 2nd, 3rd], mu: [1st, 2nd] }
  8:  { druid: [1, 0, 0], mu: [0, 0] },
  9:  { druid: [1, 0, 0], mu: [1, 0] },
  10: { druid: [2, 0, 0], mu: [1, 0] },
  11: { druid: [2, 0, 0], mu: [2, 0] },
  12: { druid: [2, 1, 0], mu: [2, 0] },
  13: { druid: [2, 1, 0], mu: [2, 1] },
  14: { druid: [2, 1, 1], mu: [2, 1] },
  15: { druid: [2, 2, 0], mu: [2, 2] },
  16: { druid: [2, 2, 1], mu: [2, 2] },
  17: { druid: [2, 2, 2], mu: [2, 2] },
};

// Bard druidic spells are in the bard table below

// === ATTACKS PER ROUND (fighters) ===
// PHB: 1/1 at low levels, 3/2 at mid, 2/1 at high
function getAttacksPerRound(charClass, level) {
  if (charClass === 'fighter' || charClass === 'paladin') {
    if (level >= 13) return '2/1';
    if (level >= 7) return '3/2';
    return '1/1';
  }
  if (charClass === 'ranger') {
    if (level >= 15) return '2/1';
    if (level >= 8) return '3/2';
    return '1/1';
  }
  if (charClass === 'monk') return MONK_TABLE[Math.min(level, 17) - 1].attacks;
  return '1/1';
}

// === MONK ABILITY TABLE ===
const MONK_TABLE = [
  // L1-17: ac, move, attacks, openHandDmg, specialAbility
  { ac: 10, move: 15, attacks: '1/1',  dmg: [1,3],  special: null },
  { ac: 9,  move: 16, attacks: '1/1',  dmg: [1,4],  special: null },
  { ac: 8,  move: 17, attacks: '1/1',  dmg: [1,6],  special: 'A' },
  { ac: 7,  move: 18, attacks: '5/4',  dmg: [1,6],  special: 'B' },
  { ac: 7,  move: 19, attacks: '5/4',  dmg: [2,7],  special: 'C' },
  { ac: 6,  move: 20, attacks: '3/2',  dmg: [2,8],  special: 'D' },
  { ac: 5,  move: 21, attacks: '3/2',  dmg: [3,9],  special: 'E' },
  { ac: 4,  move: 22, attacks: '3/2',  dmg: [2,12], special: 'F' },
  { ac: 3,  move: 23, attacks: '2/1',  dmg: [3,12], special: 'G' },
  { ac: 3,  move: 24, attacks: '2/1',  dmg: [3,13], special: 'H' },
  { ac: 2,  move: 25, attacks: '5/2',  dmg: [4,13], special: 'I' },
  { ac: 1,  move: 26, attacks: '5/2',  dmg: [4,16], special: 'J' },
  { ac: 0,  move: 27, attacks: '5/2',  dmg: [5,17], special: 'K' },
  { ac: -1, move: 28, attacks: '3/1',  dmg: [5,20], special: null },
  { ac: -1, move: 29, attacks: '3/1',  dmg: [6,24], special: null },
  { ac: -2, move: 30, attacks: '4/1',  dmg: [5,30], special: null },
  { ac: -3, move: 32, attacks: '4/1',  dmg: [8,32], special: null },
];

// Monk special abilities key
const MONK_SPECIALS = {
  A: 'Speak with animals',
  B: 'Mask mind (30% vs ESP, -2%/level)',
  C: 'Immune to disease, haste, slow',
  D: 'Feign death (catalepsy)',
  E: 'Self-heal (2-5 HP + 1/level, 1/day)',
  F: 'Speak with plants',
  G: 'Resist charm/hypnosis (50%, +5%/level)',
  H: 'Telepathic/mind blast as INT 18',
  I: 'Immune to poison',
  J: 'Immune to geas/quest',
  K: 'Quivering palm (1/week)',
};

// === BARD TABLE ===
const BARD_TABLE = [
  // L1-23: college, charmPct, lorePct, extraLangs, spells [1-5]
  { college: 'Probationer',    charm: 15, lore:  0, langs: 0, spells: [1,0,0,0,0] },
  { college: 'Fochlucan',      charm: 20, lore:  5, langs: 0, spells: [2,0,0,0,0] },
  { college: 'Fochlucan',      charm: 22, lore:  7, langs: 0, spells: [3,0,0,0,0] },
  { college: 'Fochlucan',      charm: 24, lore: 10, langs: 1, spells: [3,1,0,0,0] },
  { college: 'Mac-Fuirmidh',   charm: 30, lore: 13, langs: 0, spells: [3,2,0,0,0] },
  { college: 'Mac-Fuirmidh',   charm: 32, lore: 16, langs: 1, spells: [3,3,0,0,0] },
  { college: 'Mac-Fuirmidh',   charm: 34, lore: 20, langs: 1, spells: [3,3,1,0,0] },
  { college: 'Doss',           charm: 40, lore: 25, langs: 0, spells: [3,3,2,0,0] },
  { college: 'Doss',           charm: 42, lore: 30, langs: 1, spells: [3,3,3,0,0] },
  { college: 'Doss',           charm: 44, lore: 35, langs: 1, spells: [3,3,3,1,0] },
  { college: 'Canaith',        charm: 50, lore: 50, langs: 0, spells: [3,3,3,2,0] },
  { college: 'Canaith',        charm: 53, lore: 53, langs: 1, spells: [3,3,3,3,0] },
  { college: 'Canaith',        charm: 56, lore: 56, langs: 1, spells: [3,3,3,3,1] },
  { college: 'Cli',            charm: 60, lore: 55, langs: 0, spells: [3,3,3,3,2] },
  { college: 'Cli',            charm: 63, lore: 60, langs: 1, spells: [3,3,3,3,3] },
  { college: 'Cli',            charm: 66, lore: 65, langs: 1, spells: [4,3,3,3,3] },
  { college: 'Anstruth',       charm: 70, lore: 70, langs: 0, spells: [4,4,3,3,3] },
  { college: 'Anstruth',       charm: 73, lore: 75, langs: 1, spells: [4,4,4,3,3] },
  { college: 'Anstruth',       charm: 76, lore: 80, langs: 1, spells: [5,4,4,4,3] },
  { college: 'Ollamh',         charm: 80, lore: 85, langs: 1, spells: [5,4,4,4,4] },
  { college: 'Ollamh',         charm: 84, lore: 90, langs: 1, spells: [5,5,4,4,4] },
  { college: 'Ollamh',         charm: 88, lore: 95, langs: 1, spells: [5,5,5,4,4] },
  { college: 'Magna Alumnae',  charm: 95, lore: 99, langs: 1, spells: [5,5,5,5,5] },
];

// === ASSASSIN ASSASSINATION TABLE ===
// assassinLevel vs victimLevel: percentage chance of kill
// Index 0 = victim level 0, 1 = level 1-2, etc.
const ASSASSINATION_TABLE = {
  // assassin_level: [L0, L1-2, L3-4, L5-6, L7-9, L10-12, L13-15, L16+]
  1:  [50, 45, 35, 30, 25, 0,  0,  0],
  2:  [55, 50, 40, 35, 30, 25, 0,  0],
  3:  [60, 55, 45, 40, 35, 30, 25, 0],
  4:  [65, 60, 50, 45, 40, 35, 30, 25],
  5:  [70, 65, 55, 50, 45, 40, 35, 30],
  6:  [75, 70, 60, 55, 50, 45, 40, 35],
  7:  [80, 75, 65, 60, 55, 50, 45, 40],
  8:  [85, 80, 70, 65, 60, 55, 50, 45],
  9:  [90, 85, 75, 70, 65, 60, 55, 50],
  10: [95, 88, 80, 75, 70, 65, 60, 55],
  11: [99, 91, 83, 80, 75, 70, 65, 60],
  12: [99, 94, 86, 83, 80, 75, 70, 65],
  13: [99, 97, 90, 86, 83, 80, 75, 70],
  14: [99, 99, 95, 90, 86, 83, 80, 75],
  15: [99, 99, 99, 95, 90, 86, 83, 80],
};

// === PALADIN ABILITIES ===
function getPaladinAbilities(level) {
  const abilities = [
    'Detect evil (60\', concentration)',
    '+2 all saving throws',
    'Immune to disease',
    `Lay on hands (${level * 2} HP, 1/day)`,
    `Cure disease (${Math.floor((level - 1) / 5) + 1}/week)`,
    'Protection from evil 1" radius',
  ];
  if (level >= 3) abilities.push(`Turn undead as cleric L${level - 2}`);
  if (level >= 4) abilities.push('Warhorse (1 per 10 years)');
  return abilities;
}

// === RANGER ABILITIES ===
function getRangerAbilities(level) {
  const abilities = [
    '+1 damage/level vs giant class',
    'Surprise on 1-3, surprised on 1 only',
    'Tracking (90% outdoor base)',
  ];
  if (level >= 10) abilities.push('Use clairaudience/clairvoyance/ESP/telepathy items');
  if (level >= 10) abilities.push('Attracts 2-24 followers');
  return abilities;
}

// === LANGUAGES ===
// PHB INT bonus languages table
const INT_BONUS_LANGS = {
  1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:1, 9:1, 10:2, 11:2,
  12:3, 13:3, 14:4, 15:4, 16:5, 17:6, 18:7,
};
// Base known languages by race
const RACE_LANGS = {
  human: ['Common'],
  dwarf: ['Common','Dwarvish'],
  elf: ['Common','Elvish'],
  gnome: ['Common','Gnomish'],
  'half-elf': ['Common','Elvish'],
  halfling: ['Common','Halfling'],
  'half-orc': ['Common','Orcish'],
};
// Class bonus languages
const CLASS_LANGS = {
  druid: 'Druidic', thief: 'Thieves\' Cant', assassin: 'Thieves\' Cant',
};
// Racial bonus languages (available to learn)
const RACE_BONUS_LANGS = {
  dwarf: ['Gnomish','Goblin','Kobold','Orcish'],
  elf: ['Gnomish','Halfling','Goblin','Hobgoblin','Orcish','Gnoll'],
  gnome: ['Dwarvish','Halfling','Goblin','Kobold'],
  'half-elf': ['Gnomish','Halfling','Goblin','Hobgoblin','Orcish','Gnoll'],
  halfling: ['Dwarvish','Gnomish','Goblin','Orcish'],
  'half-orc': [],
  human: [],
};

function getLanguages(race, charClass, intScore) {
  const known = [...(RACE_LANGS[race] || ['Common'])];
  known.push('Alignment');
  const classLang = CLASS_LANGS[charClass];
  if (classLang && !known.includes(classLang)) known.push(classLang);
  const bonusSlots = INT_BONUS_LANGS[Math.min(intScore, 18)] || 0;
  const available = (RACE_BONUS_LANGS[race] || []).filter(l => !known.includes(l));
  return { known, bonusSlots, available };
}

// === ALIGNMENT DISPLAY ===
const ALIGNMENT_NAMES = {
  lawful_good: 'Lawful Good', neutral_good: 'Neutral Good', chaotic_good: 'Chaotic Good',
  lawful_neutral: 'Lawful Neutral', true_neutral: 'True Neutral', chaotic_neutral: 'Chaotic Neutral',
  lawful_evil: 'Lawful Evil', neutral_evil: 'Neutral Evil', chaotic_evil: 'Chaotic Evil',
};
function getAlignmentName(key) { return ALIGNMENT_NAMES[key] || key; }

// === SAVING THROWS ===
// Categories: PPD=Paralyzation/Poison/Death, PP=Petrification/Polymorph, RSW=Rod/Staff/Wand, BW=Breath Weapon, SP=Spell
// Each row is [PPD, PP, RSW, BW, SP]. Rows indexed by level bracket.
// Fighter group (fighter, paladin, ranger)
const SAVE_FIGHTER = [
  [14, 15, 16, 17, 17], // L0 (normal human)
  [14, 15, 16, 17, 17], // L1-2
  [13, 14, 15, 16, 16], // L3-4
  [11, 12, 13, 13, 14], // L5-6
  [10, 11, 12, 12, 13], // L7-8
  [ 8,  9, 10, 10, 11], // L9-10
  [ 7,  8,  9,  9, 10], // L11-12
  [ 5,  6,  7,  7,  8], // L13-14
  [ 4,  5,  6,  6,  7], // L15-16
  [ 3,  4,  5,  5,  6], // L17+
];
// Cleric group (cleric, druid)
const SAVE_CLERIC = [
  [10, 13, 14, 16, 15], // L1-3
  [ 9, 12, 13, 15, 14], // L4-6
  [ 7, 10, 11, 13, 12], // L7-9
  [ 6,  9, 10, 12, 11], // L10-12
  [ 5,  8,  9, 11, 10], // L13-15
  [ 4,  7,  8, 10,  9], // L16-18
  [ 2,  5,  6,  8,  7], // L19+
];
// MU group (magic-user, illusionist)
const SAVE_MU = [
  [14, 13, 11, 15, 12], // L1-5
  [13, 11,  9, 13, 10], // L6-10
  [11,  9,  7, 11,  8], // L11-15
  [10,  7,  5,  9,  6], // L16-20
  [ 8,  5,  3,  7,  4], // L21+
];
// Thief group (thief, assassin, monk, bard)
const SAVE_THIEF = [
  [13, 12, 14, 16, 15], // L1-4
  [12, 11, 13, 15, 14], // L5-8
  [11, 10, 12, 14, 13], // L9-12
  [10,  9, 11, 13, 12], // L13-16
  [ 9,  8, 10, 12, 11], // L17-20
  [ 8,  7,  9, 11, 10], // L21+
];

const SAVE_NAMES = ['Para/Poison/Death','Petrify/Polymorph','Rod/Staff/Wand','Breath Weapon','Spell'];

function getSavingThrows(charClass, level) {
  let table, idx;
  const fTypes = ['fighter','paladin','ranger'];
  const cTypes = ['cleric','druid'];
  const mTypes = ['magic-user','illusionist'];
  const tTypes = ['thief','assassin','monk','bard'];

  if (fTypes.includes(charClass)) {
    table = SAVE_FIGHTER;
    if (level <= 0) idx = 0;
    else if (level <= 2) idx = 1;
    else idx = Math.min(1 + Math.floor((level - 1) / 2), table.length - 1);
  } else if (cTypes.includes(charClass)) {
    table = SAVE_CLERIC;
    idx = Math.min(Math.floor((level - 1) / 3), table.length - 1);
  } else if (mTypes.includes(charClass)) {
    table = SAVE_MU;
    idx = Math.min(Math.floor((level - 1) / 5), table.length - 1);
  } else if (tTypes.includes(charClass)) {
    table = SAVE_THIEF;
    idx = Math.min(Math.floor((level - 1) / 4), table.length - 1);
  } else {
    table = SAVE_FIGHTER;
    idx = 0;
  }
  const saves = table[idx].slice();
  // Paladin +2 all saves
  if (charClass === 'paladin') {
    for (let i = 0; i < saves.length; i++) saves[i] = Math.max(1, saves[i] - 2);
  }
  return saves;
}

// === TURN UNDEAD (Cleric) ===
// Rows = cleric level (1-indexed), Columns = undead type (skeleton, zombie, ghoul, shadow, wight, ghast, wraith, mummy, spectre, vampire, ghost, lich, special)
// Values: 0 = cannot turn, 1-20 = number needed on d20, 'T' = auto turn, 'D' = auto destroy
const TURN_UNDEAD = [
  // Skel  Zomb  Ghoul Shad  Wight Ghast Wrth  Mummy Spec  Vamp  Ghost Lich  Spec
  [10,    13,   16,   19,   20,   0,    0,    0,    0,    0,    0,    0,    0],  // L1
  [7,     10,   13,   16,   19,   20,   0,    0,    0,    0,    0,    0,    0],  // L2
  [4,     7,    10,   13,   16,   19,   20,   0,    0,    0,    0,    0,    0],  // L3
  ['T',   4,    7,    10,   13,   16,   19,   20,   0,    0,    0,    0,    0],  // L4
  ['T',   'T',  4,    7,    10,   13,   16,   19,   20,   0,    0,    0,    0],  // L5
  ['D',   'T',  'T',  4,    7,    10,   13,   16,   19,   20,   0,    0,    0],  // L6
  ['D',   'D',  'T',  'T',  4,    7,    10,   13,   16,   19,   20,   0,    0],  // L7
  ['D',   'D',  'D',  'T',  'T',  4,    7,    10,   13,   16,   19,   20,   0],  // L8
  ['D',   'D',  'D',  'D',  'T',  'T',  4,    7,    10,   13,   16,   19,   20], // L9+
];

const UNDEAD_TYPES = ['Skeleton','Zombie','Ghoul','Shadow','Wight','Ghast','Wraith','Mummy','Spectre','Vampire','Ghost','Lich','Special'];

// Get cleric level for turn undead (paladin turns at level-2)
function getTurnLevel(charClass, level) {
  if (charClass === 'cleric') return level;
  if (charClass === 'paladin' && level >= 3) return level - 2;
  return 0;
}

// === GET LEVEL TITLE ===
function getLevelTitle(charClass, level) {
  const classKey = charClass === 'magic-user' ? 'magic_user' : charClass;
  const titles = LEVEL_TITLES[classKey];
  if (!titles) return '';
  const idx = Math.min(level - 1, titles.length - 1);
  if (idx < 0) return '';
  // For levels beyond title list, return the last title + level
  if (level > titles.length) {
    const lastTitle = titles[titles.length - 1];
    return `${lastTitle} (${level}${level === 11 ? 'th' : level % 10 === 1 ? 'st' : level % 10 === 2 ? 'nd' : level % 10 === 3 ? 'rd' : 'th'} level)`;
  }
  return titles[idx];
}

// === GET SPELL SLOTS ===
// PHB WIS bonus spells for clerics/druids/paladins/rangers (p.11)
// [bonusL1, bonusL2, bonusL3, bonusL4]
const WIS_SPELL_BONUS = {
  13: [1,0,0,0],
  14: [2,0,0,0],
  15: [2,1,0,0],
  16: [2,2,0,0],
  17: [2,2,1,0],
  18: [2,2,1,1],
  19: [3,2,1,1],
  20: [3,3,1,1],
  21: [3,3,2,2],
  22: [3,3,3,2],
  23: [3,3,3,3],
  24: [3,3,3,3],
  25: [3,3,3,3],
};

function getWisBonus(wis) {
  const score = Math.max(1, Math.min(25, wis || 0));
  return WIS_SPELL_BONUS[score] || [0,0,0,0];
}

function applyWisBonus(levels, wis) {
  if (!wis || wis < 13) return levels;
  const bonus = getWisBonus(wis);
  return levels.map((n, i) => n > 0 || bonus[i] > 0 ? n + (bonus[i] || 0) : 0);
}

function getSpellSlots(charClass, level, wis) {
  if (charClass === 'cleric') {
    const idx = Math.min(level - 1, CLERIC_SPELLS.length - 1);
    return { type: 'Cleric', levels: applyWisBonus(CLERIC_SPELLS[idx], wis) };
  }
  if (charClass === 'druid') {
    const idx = Math.min(level - 1, DRUID_SPELLS.length - 1);
    return { type: 'Druid', levels: applyWisBonus(DRUID_SPELLS[idx], wis) };
  }
  if (charClass === 'magic_user' || charClass === 'magic-user') {
    const idx = Math.min(level - 1, MU_SPELLS.length - 1);
    return { type: 'Magic-User', levels: MU_SPELLS[idx] };
  }
  if (charClass === 'illusionist') {
    const idx = Math.min(level - 1, ILLUSIONIST_SPELLS.length - 1);
    return { type: 'Illusionist', levels: ILLUSIONIST_SPELLS[idx] };
  }
  if (charClass === 'paladin' && level >= 9) {
    const entry = PALADIN_SPELLS[Math.min(level, 20)] || PALADIN_SPELLS[20];
    return { type: 'Cleric', levels: applyWisBonus(entry, wis) };
  }
  if (charClass === 'ranger' && level >= 8) {
    const entry = RANGER_SPELLS[Math.min(level, 17)] || RANGER_SPELLS[17];
    return { type: 'Ranger', druid: entry.druid, mu: entry.mu };
  }
  if (charClass === 'bard') {
    const idx = Math.min(level - 1, BARD_TABLE.length - 1);
    return { type: 'Druid', levels: BARD_TABLE[idx].spells };
  }
  return null;
}

// === BUILD FULL CLASS INFO FOR CHARACTER SHEET ===
function getClassInfo(player) {
  const c = player.class;
  const lvl = player.level || 1;
  const info = {
    title: getLevelTitle(c, lvl),
    attacksPerRound: getAttacksPerRound(c, lvl),
    spellSlots: getSpellSlots(c, lvl),
    saves: getSavingThrows(c, lvl),
    saveNames: SAVE_NAMES,
    languages: getLanguages(player.race || 'human', c, player.int || player.intl || 10),
  };

  // Turn undead
  const turnLvl = getTurnLevel(c, lvl);
  if (turnLvl > 0) {
    const idx = Math.min(turnLvl - 1, TURN_UNDEAD.length - 1);
    info.turnUndead = { level: turnLvl, table: TURN_UNDEAD[idx], types: UNDEAD_TYPES };
  }

  // Paladin abilities
  if (c === 'paladin') info.classAbilities = getPaladinAbilities(lvl);

  // Ranger abilities
  if (c === 'ranger') info.classAbilities = getRangerAbilities(lvl);

  // Monk table
  if (c === 'monk') {
    const mi = Math.min(lvl - 1, MONK_TABLE.length - 1);
    const m = MONK_TABLE[mi];
    info.monkAC = m.ac;
    info.monkMove = m.move;
    info.monkDmg = m.dmg;
    info.monkAttacks = m.attacks;
    if (m.special) info.monkSpecial = MONK_SPECIALS[m.special];
  }

  // Bard table
  if (c === 'bard') {
    const bi = Math.min(lvl - 1, BARD_TABLE.length - 1);
    const b = BARD_TABLE[bi];
    info.bardCollege = b.college;
    info.bardCharm = b.charm;
    info.bardLore = b.lore;
  }

  // Assassin assassination
  if (c === 'assassin') {
    const at = ASSASSINATION_TABLE[Math.min(lvl, 15)];
    if (at) info.assassination = at;
  }

  return info;
}

// === OSRIC 3 RULES KERNEL BRIDGE ===
// Slice 4 loads the browser build without replacing legacy calculations yet.
// Consumers can await osric3KernelReady and opt into the kernel one feature at a time.
let osric3KernelReady = Promise.resolve(null);
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  osric3KernelReady = import('./vendor/osric3-rules/browser-global.js')
    .then(() => window.GraycloakOSRIC3 || null)
    .catch((error) => {
      console.warn('OSRIC 3 rules kernel did not load; legacy class data remains active.', error);
      return null;
    });
}

function getKernelSpellSlots(charClass, level, wis, wisdomBonusMode = 'legacy-parity') {
  const kernel = typeof globalThis !== 'undefined' ? globalThis.GraycloakOSRIC3 : null;
  if (!kernel || typeof kernel.getSpellSlots !== 'function') return null;
  const classId = charClass === 'magic_user' ? 'magic-user' : charClass;
  return kernel.getSpellSlots(classId, level, wis, wisdomBonusMode);
}

function _kernelSigned(value) {
  return value > 0 ? '+' + value : String(value);
}

function _kernelField(root, field) {
  return root && typeof root.querySelector === 'function'
    ? root.querySelector('[data-field="' + field + '"]')
    : null;
}

function _kernelScore(root, field) {
  const input = _kernelField(root, field);
  if (!input || input.value === '') return null;
  const value = Number.parseInt(input.value, 10);
  return Number.isFinite(value) ? value : null;
}

function _kernelWrite(root, field, value, force) {
  if (value === null || value === undefined) return false;
  const input = _kernelField(root, field);
  if (!input) return false;
  if (force || input.value === '' || input.dataset.osric3Managed === 'true') {
    input.value = String(value);
    input.dataset.osric3Managed = 'true';
    return true;
  }
  return false;
}

function _kernelSpellBonus(bonusSpells) {
  const values = Array.isArray(bonusSpells) ? bonusSpells.slice() : [];
  let last = values.length - 1;
  while (last >= 0 && !values[last]) last -= 1;
  return last < 0 ? '' : values.slice(0, last + 1).join('/');
}

function _kernelClassIds(root) {
  const input = _kernelField(root, 'characterClass');
  if (!input || !input.value) return [];
  return String(input.value).split('/').map((part) => part.trim().toLowerCase()
    .replace(/_/g, '-').replace(/\s+/g, '-')).filter(Boolean);
}

function _kernelUsesFighterConBonus(root) {
  const classes = _kernelClassIds(root);
  if (!classes.length) return null;
  const fighterTypes = new Set(['fighter', 'paladin', 'ranger']);
  return classes.every((classId) => fighterTypes.has(classId));
}

function applyKernelStrengthProfile(root, force = false) {
  const kernel = typeof globalThis !== 'undefined' ? globalThis.GraycloakOSRIC3 : null;
  if (!kernel || typeof kernel.getStrengthCombatProfile !== 'function') return false;
  if (!root || typeof root.querySelector !== 'function') return false;

  const strength = _kernelScore(root, 'str');
  if (strength === null) return false;
  const percentile = _kernelScore(root, 'strPct') || 0;
  const combat = kernel.getStrengthCombatProfile(strength, percentile);
  let applied = false;
  applied = _kernelWrite(root, 'strHitAdj', _kernelSigned(combat.hitAdjustment), force) || applied;
  applied = _kernelWrite(root, 'strDamAdj', _kernelSigned(combat.damageAdjustment), force) || applied;
  if (typeof kernel.getStrengthWeightAllowance === 'function') {
    applied = _kernelWrite(root, 'strWtAllow', kernel.getStrengthWeightAllowance(strength, percentile), force) || applied;
  }
  return applied;
}

function applyKernelAbilityProfiles(root, force = false) {
  const kernel = typeof globalThis !== 'undefined' ? globalThis.GraycloakOSRIC3 : null;
  if (!kernel || !root || typeof root.querySelector !== 'function') return false;
  let applied = applyKernelStrengthProfile(root, force);

  const intelligence = _kernelScore(root, 'int');
  if (intelligence !== null && typeof kernel.getIntelligenceDisplayProfile === 'function') {
    const profile = kernel.getIntelligenceDisplayProfile(intelligence);
    applied = _kernelWrite(root, 'intAddLang', profile.additionalLanguages, force) || applied;
    // intKnowSpell, intMinSpells, and intMaxSpells remain manual until the
    // corresponding source table receives a direct OSRIC 3 citation.
  }

  const wisdom = _kernelScore(root, 'wis');
  if (wisdom !== null && typeof kernel.getWisdomDisplayProfile === 'function') {
    const profile = kernel.getWisdomDisplayProfile(wisdom);
    applied = _kernelWrite(root, 'wisMagAtkAdj', _kernelSigned(profile.magicalAttackAdjustment), force) || applied;
    applied = _kernelWrite(root, 'wisSpellBonus', _kernelSpellBonus(profile.bonusSpells), force) || applied;
    applied = _kernelWrite(root, 'wisSpellFail', profile.spellFailureChance, force) || applied;
  }

  const dexterity = _kernelScore(root, 'dex');
  if (dexterity !== null && typeof kernel.getDexterityDisplayProfile === 'function') {
    const profile = kernel.getDexterityDisplayProfile(dexterity);
    applied = _kernelWrite(root, 'dexReactAdj', _kernelSigned(profile.reactionAdjustment), force) || applied;
    applied = _kernelWrite(root, 'dexMissileAdj', _kernelSigned(profile.missileAdjustment), force) || applied;
    applied = _kernelWrite(root, 'dexDefAdj', _kernelSigned(profile.defenseAdjustment), force) || applied;
  }

  const constitution = _kernelScore(root, 'con');
  if (constitution !== null && typeof kernel.getConstitutionDisplayProfile === 'function') {
    const profile = kernel.getConstitutionDisplayProfile(constitution);
    const fighterBonus = _kernelUsesFighterConBonus(root);
    if (fighterBonus !== null) {
      const hpAdjustment = fighterBonus ? profile.fighterHitPointAdjustment : profile.hitPointAdjustment;
      applied = _kernelWrite(root, 'conHpAdj', _kernelSigned(hpAdjustment), force) || applied;
    }
    applied = _kernelWrite(root, 'conSysShock', profile.systemShockChance, force) || applied;
    applied = _kernelWrite(root, 'conResSurv', profile.resurrectionSurvivalChance, force) || applied;
  }

  const charisma = _kernelScore(root, 'cha');
  if (charisma !== null && typeof kernel.getCharismaDisplayProfile === 'function') {
    const profile = kernel.getCharismaDisplayProfile(charisma);
    applied = _kernelWrite(root, 'chaMaxHench', profile.maximumHenchmen, force) || applied;
    applied = _kernelWrite(root, 'chaLoyalty', _kernelSigned(profile.loyaltyAdjustment), force) || applied;
    applied = _kernelWrite(root, 'chaReactAdj', _kernelSigned(profile.reactionAdjustment), force) || applied;
  }

  return applied;
}

function _kernelMarkManual(root, fields) {
  fields.forEach((field) => {
    const input = _kernelField(root, field);
    if (input) input.addEventListener('input', () => { delete input.dataset.osric3Managed; });
  });
}

function _kernelAttachRefresh(root, field, marker, refresh) {
  const input = _kernelField(root, field);
  if (!input || input.dataset[marker] === 'true') return false;
  input.addEventListener('input', refresh);
  input.addEventListener('change', refresh);
  input.dataset[marker] = 'true';
  return true;
}

function enableKernelStrengthBridge(root) {
  if (!root || typeof root.querySelector !== 'function') return false;
  const strengthInput = _kernelField(root, 'str');
  if (!strengthInput || strengthInput.dataset.osric3Bridge === 'true') return false;
  const refresh = () => applyKernelStrengthProfile(root, true);

  _kernelAttachRefresh(root, 'str', 'osric3Bridge', refresh);
  _kernelAttachRefresh(root, 'strPct', 'osric3Bridge', refresh);
  _kernelMarkManual(root, ['strHitAdj', 'strDamAdj', 'strWtAllow']);
  applyKernelStrengthProfile(root, false);
  return true;
}

function enableKernelAbilityBridges(root) {
  if (!root || typeof root.querySelector !== 'function') return false;
  let enabled = enableKernelStrengthBridge(root);
  const refresh = () => applyKernelAbilityProfiles(root, true);
  ['int', 'wis', 'dex', 'con', 'cha', 'characterClass'].forEach((field) => {
    enabled = _kernelAttachRefresh(root, field, 'osric3AbilityBridge', refresh) || enabled;
  });
  _kernelMarkManual(root, [
    'intAddLang',
    'wisMagAtkAdj', 'wisSpellBonus', 'wisSpellFail',
    'dexReactAdj', 'dexMissileAdj', 'dexDefAdj',
    'conHpAdj', 'conSysShock', 'conResSurv',
    'chaMaxHench', 'chaLoyalty', 'chaReactAdj',
  ]);
  applyKernelAbilityProfiles(root, false);
  return enabled;
}

function _enableKernelSheetBridges() {
  if (typeof document === 'undefined') return;
  enableKernelAbilityBridges(document);
}

osric3KernelReady.then((kernel) => {
  if (!kernel || typeof document === 'undefined') return;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _enableKernelSheetBridges, { once: true });
  else _enableKernelSheetBridges();
});

const ADNDClassData = {
  XP_TABLE, XP_PER_LEVEL_AFTER, LEVEL_TITLES, HD_INFO,
  CLERIC_SPELLS, DRUID_SPELLS, MU_SPELLS, ILLUSIONIST_SPELLS,
  PALADIN_SPELLS, RANGER_SPELLS, BARD_TABLE,
  MONK_TABLE, MONK_SPECIALS, ASSASSINATION_TABLE,
  TURN_UNDEAD, UNDEAD_TYPES, SAVE_NAMES,
  SAVE_FIGHTER, SAVE_CLERIC, SAVE_MU, SAVE_THIEF,
  ALIGNMENT_NAMES,
  WIS_SPELL_BONUS, getWisBonus, applyWisBonus,
  getAttacksPerRound, getLevelTitle, getSpellSlots, getKernelSpellSlots,
  applyKernelStrengthProfile, enableKernelStrengthBridge,
  applyKernelAbilityProfiles, enableKernelAbilityBridges, getTurnLevel,
  getPaladinAbilities, getRangerAbilities, getSavingThrows, getLanguages,
  getAlignmentName, getClassInfo, osric3KernelReady,
};
if (typeof module !== 'undefined' && module.exports) module.exports = ADNDClassData;
if (typeof window !== 'undefined') window.ADNDClassData = ADNDClassData;

// adnd-equipment.js v6.0.0 - 2026-06-05
// AD&D 1e Equipment Definitions, Inventory, Gems & Jewelry
// Ported from AMMOG equipment.js (C:\ammog_2) - browser global, no logic changes

// --- Armor (PHB prices, AC values) ---
// AC in AD&D: lower is better. Base AC 10, armor sets AC to value.
const ARMOR = {
  leather:       { name: 'Leather Armor',     ac: 8,  cost: 5,   weight: 15, classes: ['fighter','ranger','paladin','cleric','druid','thief','assassin','monk','bard'] },
  studded:       { name: 'Studded Leather',   ac: 7,  cost: 15,  weight: 20, classes: ['fighter','ranger','paladin','cleric','thief','assassin'] },
  ring_mail:     { name: 'Ring Mail',         ac: 7,  cost: 30,  weight: 25, classes: ['fighter','ranger','paladin','cleric'] },
  scale_mail:    { name: 'Scale Mail',        ac: 6,  cost: 45,  weight: 40, classes: ['fighter','ranger','paladin','cleric'] },
  chain_mail:    { name: 'Chain Mail',        ac: 5,  cost: 75,  weight: 30, classes: ['fighter','ranger','paladin','cleric'] },
  banded_mail:   { name: 'Banded Mail',       ac: 4,  cost: 200, weight: 35, classes: ['fighter','ranger','paladin','cleric'] },
  plate_mail:    { name: 'Plate Mail',        ac: 3,  cost: 400, weight: 45, classes: ['fighter','ranger','paladin'] },
};

// --- Shields ---
const SHIELDS = {
  small_shield:  { name: 'Small Shield',  acBonus: 1, cost: 10,  weight: 5,  classes: ['fighter','ranger','paladin','cleric'] },
  large_shield:  { name: 'Large Shield',  acBonus: 1, cost: 15,  weight: 8,  classes: ['fighter','ranger','paladin','cleric'] },
};

// --- Melee Weapons (PHB damage S/M and L, speed factor, weapon vs AC adjustment) ---
// acAdj: [AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC10] — bonus/penalty at short range
// length: weapon length in feet. space: minimum space in feet to use effectively.
// settable: 'L' = double dmg vs L when set vs charge (polearms). 'all' = double vs any (spear).
// twoHand: requires both hands. dismount: can dismount riders (italicized in weapon vs AC table).
const F = ['fighter','ranger','paladin'];
const FA = ['fighter','ranger','paladin','assassin'];
const FC = ['fighter','ranger','paladin','cleric'];
const WEAPONS = {
  // --- One-handed weapons ---
  dagger:        { name: 'Dagger',           damage: [1,4],  damageL: [1,3],   cost: 2,   weight: 1,  length: 1.25, space: 1,  speedFactor: 2,  acAdj: [-3,-3,-2,-2,0,0,1,1,3],   classes: ['fighter','ranger','paladin','cleric','thief','assassin','magic-user','illusionist','druid','monk'], verb: 'stabs' },
  hand_axe:      { name: 'Hand Axe',         damage: [1,6],  damageL: [1,4],   cost: 1,   weight: 5,  length: 1.5,  space: 1,  speedFactor: 4,  acAdj: [-3,-2,-2,-1,0,0,1,1,1],   classes: FA, verb: 'chops' },
  club:          { name: 'Club',             damage: [1,6],  damageL: [1,3],   cost: 0,   weight: 3,  length: 3,    space: 2,  speedFactor: 4,  acAdj: [-5,-4,-3,-2,-1,-1,0,0,1], classes: ['fighter','ranger','paladin','cleric','thief','assassin','druid'], verb: 'clubs' },
  hammer:        { name: 'Hammer',           damage: [1,4,1],damageL: [1,4],   cost: 1,   weight: 5,  length: 1.5,  space: 2,  speedFactor: 4,  acAdj: [0,1,0,1,0,0,0,0,0],       classes: FC, verb: 'smashes' },
  mace:          { name: 'Mace',             damage: [1,6,1],damageL: [1,6],   cost: 8,   weight: 10, length: 2.5,  space: 4,  speedFactor: 7,  acAdj: [1,1,0,0,0,0,0,1,-1],      classes: FC, verb: 'smashes' },
  horsemans_mace:{ name: "Horseman's Mace",  damage: [1,6],  damageL: [1,4],   cost: 4,   weight: 5,  length: 1.5,  space: 2,  speedFactor: 6,  acAdj: [1,1,0,0,0,0,0,0,0],       classes: FC, verb: 'smashes' },
  horsemans_flail:{ name: "Horseman's Flail",damage: [1,4,1],damageL: [1,4,1], cost: 8,   weight: 3,  length: 2,    space: 4,  speedFactor: 6,  acAdj: [0,0,0,0,0,1,1,1,0],       classes: FC, verb: 'flails at' },
  horsemans_pick:{ name: "Horseman's Pick",  damage: [1,4,1],damageL: [1,4],   cost: 7,   weight: 4,  length: 2,    space: 2,  speedFactor: 5,  acAdj: [1,1,1,1,0,0,-1,-1,-1],    classes: F, verb: 'picks at' },
  morning_star:  { name: 'Morning Star',     damage: [2,4],  damageL: [1,6,1], cost: 10,  weight: 12, length: 4,    space: 5,  speedFactor: 7,  acAdj: [0,1,1,1,1,1,1,2,2],       classes: FC, verb: 'bashes' },
  short_sword:   { name: 'Short Sword',      damage: [1,6],  damageL: [1,8],   cost: 8,   weight: 5,  length: 2,    space: 1,  speedFactor: 3,  acAdj: [-3,-2,-1,0,0,0,1,0,2],    classes: ['fighter','ranger','paladin','thief','assassin'], verb: 'slashes' },
  broad_sword:   { name: 'Broad Sword',      damage: [2,4],  damageL: [1,6,1], cost: 10,  weight: 7,  length: 3.5,  space: 4,  speedFactor: 5,  acAdj: [-3,-2,-1,0,0,1,1,1,2],    classes: F, verb: 'cleaves' },
  long_sword:    { name: 'Long Sword',       damage: [1,8],  damageL: [1,12],  cost: 15,  weight: 6,  length: 3.5,  space: 3,  speedFactor: 5,  acAdj: [-2,-1,0,0,0,0,0,1,2],     classes: ['fighter','ranger','paladin','thief','assassin'], verb: 'slashes' },
  scimitar:      { name: 'Scimitar',         damage: [1,8],  damageL: [1,8],   cost: 15,  weight: 4,  length: 3,    space: 2,  speedFactor: 4,  acAdj: [-3,-2,-2,1,0,0,1,1,3],    classes: ['fighter','ranger','paladin','druid','thief'], verb: 'slashes' },
  battle_axe:    { name: 'Battle Axe',       damage: [1,8],  damageL: [1,8],   cost: 5,   weight: 7,  length: 4,    space: 4,  speedFactor: 7,  acAdj: [-3,-2,-1,-1,0,0,1,1,2],   classes: F, verb: 'cleaves' },
  // --- Two-handed weapons ---
  bastard_sword: { name: 'Bastard Sword',    damage: [2,4],  damageL: [2,8],   cost: 25,  weight: 10, length: 4.5,  space: 4,  speedFactor: 6,  acAdj: [0,0,1,1,1,1,1,1,0],       classes: F, verb: 'cleaves', twoHand: true },
  two_h_sword:   { name: 'Two-Handed Sword', damage: [1,10], damageL: [3,6],   cost: 30,  weight: 25, length: 6,    space: 6,  speedFactor: 10, acAdj: [2,2,2,2,3,3,3,1,0],       classes: F, verb: 'cleaves', twoHand: true },
  flail:         { name: 'Flail',            damage: [1,6,1],damageL: [2,4],   cost: 8,   weight: 15, length: 4,    space: 6,  speedFactor: 7,  acAdj: [2,2,1,2,1,1,1,1,-1],      classes: FC, verb: 'flails at', twoHand: true },
  military_pick: { name: 'Military Pick',    damage: [1,6,1],damageL: [2,4],   cost: 8,   weight: 6,  length: 4,    space: 4,  speedFactor: 7,  acAdj: [2,2,1,1,0,-1,-1,-1,-2],   classes: F, verb: 'picks at' },
  quarterstaff:  { name: 'Quarterstaff',     damage: [1,6],  damageL: [1,6],   cost: 1,   weight: 4,  length: 7,    space: 3,  speedFactor: 4,  acAdj: [-7,-5,-3,-1,0,0,1,1,0],   classes: ['fighter','cleric','magic-user','illusionist','druid','monk'], verb: 'strikes', twoHand: true },
  bo_stick:      { name: 'Bo Stick',         damage: [1,6],  damageL: [1,3],   cost: 1,   weight: 1,  length: 5,    space: 3,  speedFactor: 3,  acAdj: [-9,-7,-5,-3,-1,0,1,0,3],  classes: ['fighter','monk'], verb: 'strikes', twoHand: true },
  jo_stick:      { name: 'Jo Stick',         damage: [1,6],  damageL: [1,4],   cost: 1,   weight: 4,  length: 3,    space: 2,  speedFactor: 2,  acAdj: [-8,-6,-4,-2,-1,0,1,0,2],  classes: ['fighter','monk'], verb: 'strikes' },
  // --- Spear (settable vs ANY charge) ---
  spear:         { name: 'Spear',            damage: [1,6],  damageL: [1,8],   cost: 1,   weight: 5,  length: 9,    space: 1,  speedFactor: 7,  acAdj: [-2,-1,-1,-1,0,0,0,0,0],   classes: FA, verb: 'thrusts', settable: 'all' },
  // --- Polearms (settable vs L charge, twoHand, dismount capable) ---
  bardiche:      { name: 'Bardiche',         damage: [2,4],  damageL: [3,4],   cost: 7,   weight: 12, length: 5,    space: 5,  speedFactor: 9,  acAdj: [-2,-1,0,0,1,1,2,2,3],     classes: F, verb: 'cleaves', twoHand: true, settable: 'L', dismount: true },
  bec_de_corbin: { name: 'Bec de Corbin',    damage: [1,8],  damageL: [1,6],   cost: 6,   weight: 10, length: 6,    space: 6,  speedFactor: 9,  acAdj: [2,2,2,0,0,0,0,0,-1],      classes: F, verb: 'hooks at', twoHand: true, settable: 'L', dismount: true },
  bill_guisarme: { name: 'Bill-Guisarme',    damage: [2,4],  damageL: [1,10],  cost: 7,   weight: 15, length: 8,    space: 2,  speedFactor: 10, acAdj: [0,0,0,0,0,0,1,0,0],       classes: F, verb: 'hooks at', twoHand: true, settable: 'L', dismount: true },
  fauchard:      { name: 'Fauchard',         damage: [1,6],  damageL: [1,8],   cost: 3,   weight: 6,  length: 8,    space: 2,  speedFactor: 8,  acAdj: [-2,-2,-1,-1,0,0,0,-1,-1], classes: F, verb: 'slashes', twoHand: true, settable: 'L' },
  fauchard_fork: { name: 'Fauchard-Fork',    damage: [1,8],  damageL: [1,10],  cost: 8,   weight: 8,  length: 8,    space: 2,  speedFactor: 8,  acAdj: [-1,-1,-1,0,0,0,1,0,1],    classes: F, verb: 'impales', twoHand: true, settable: 'L', dismount: true },
  military_fork: { name: 'Military Fork',    damage: [1,8],  damageL: [2,4],   cost: 4,   weight: 7,  length: 7,    space: 1,  speedFactor: 7,  acAdj: [-2,-2,1,0,0,1,1,0,1],     classes: F, verb: 'impales', twoHand: true, settable: 'L', dismount: true },
  glaive:        { name: 'Glaive',           damage: [1,6],  damageL: [1,10],  cost: 6,   weight: 7,  length: 8,    space: 1,  speedFactor: 8,  acAdj: [-1,-1,0,0,0,0,0,0,0],     classes: F, verb: 'slashes', twoHand: true, settable: 'L' },
  glaive_guisarme:{ name: 'Glaive-Guisarme', damage: [2,4],  damageL: [2,6],   cost: 10,  weight: 10, length: 8,    space: 1,  speedFactor: 9,  acAdj: [-1,-1,0,0,0,0,0,0,0],     classes: F, verb: 'slashes', twoHand: true, settable: 'L', dismount: true },
  guisarme:      { name: 'Guisarme',         damage: [2,4],  damageL: [1,8],   cost: 5,   weight: 8,  length: 6,    space: 2,  speedFactor: 8,  acAdj: [-2,-2,-1,-1,0,0,0,-1,-1], classes: F, verb: 'hooks at', twoHand: true, settable: 'L', dismount: true },
  guisarme_voulge:{ name: 'Guisarme-Voulge', damage: [2,4],  damageL: [2,4],   cost: 8,   weight: 15, length: 7,    space: 2,  speedFactor: 10, acAdj: [-1,-1,0,1,1,1,0,0,0],     classes: F, verb: 'slashes', twoHand: true, settable: 'L', dismount: true },
  halberd:       { name: 'Halberd',          damage: [1,10], damageL: [2,6],   cost: 9,   weight: 17, length: 5,    space: 5,  speedFactor: 9,  acAdj: [1,1,1,2,2,2,1,1,0],       classes: F, verb: 'cleaves', twoHand: true, settable: 'L', dismount: true },
  lucern_hammer: { name: 'Lucern Hammer',    damage: [2,4],  damageL: [1,6],   cost: 7,   weight: 15, length: 5,    space: 5,  speedFactor: 9,  acAdj: [1,1,2,2,2,1,1,0,0],       classes: F, verb: 'smashes', twoHand: true, settable: 'L', dismount: true },
  partisan:      { name: 'Partisan',         damage: [1,6],  damageL: [1,6,1], cost: 10,  weight: 8,  length: 7,    space: 3,  speedFactor: 9,  acAdj: [0,0,0,0,0,0,0,0,0],       classes: F, verb: 'thrusts', twoHand: true, settable: 'L', dismount: true },
  pike:          { name: 'Pike',             damage: [1,6],  damageL: [1,12],  cost: 3,   weight: 8,  length: 18,   space: 1,  speedFactor: 13, acAdj: [-1,0,0,0,0,0,0,-1,-2],    classes: F, verb: 'impales', twoHand: true, settable: 'L' },
  ranseur:       { name: 'Ranseur',          damage: [2,4],  damageL: [2,4],   cost: 4,   weight: 5,  length: 8,    space: 1,  speedFactor: 8,  acAdj: [-2,-1,-1,0,0,0,0,0,1],    classes: F, verb: 'impales', twoHand: true, settable: 'L', dismount: true },
  spetum:        { name: 'Spetum',           damage: [1,6,1],damageL: [2,6],   cost: 3,   weight: 5,  length: 8,    space: 1,  speedFactor: 8,  acAdj: [-2,-1,0,0,0,0,0,1,2],     classes: F, verb: 'impales', twoHand: true, settable: 'L', dismount: true },
  trident:       { name: 'Trident',          damage: [1,6,1],damageL: [3,4],   cost: 4,   weight: 5,  length: 7,    space: 1,  speedFactor: 7,  acAdj: [-3,-2,-1,-1,0,0,1,0,1],   classes: F, verb: 'impales', settable: 'L', dismount: true },
  voulge:        { name: 'Voulge',           damage: [2,4],  damageL: [2,4],   cost: 2,   weight: 12, length: 8,    space: 2,  speedFactor: 10, acAdj: [-1,-1,0,1,1,1,0,0,0],     classes: F, verb: 'slashes', twoHand: true, settable: 'L', dismount: true },
};

// --- Ranged Weapons (PHB) ---
// rof: attacks per round. ammoType: key into AMMO. range: [short, medium, long] in tiles (10'/tile)
// acAdj: at short range per PHB; medium -2 and long -5 applied separately via getRangeModifier
const RANGED_WEAPONS = {
  short_bow:       { name: 'Short Bow',        damage: [1,6],  damageL: [1,6],   cost: 15,  weight: 5,  speedFactor: 7, acAdj: [-5,-4,-1,0,0,1,2,2,2],  classes: ['fighter','ranger','paladin','thief','assassin'], verb: 'shoots', ranged: true, ammoType: 'arrow', rof: 2, range: [5, 10, 15], twoHand: true },
  long_bow:        { name: 'Long Bow',         damage: [1,6],  damageL: [1,6],   cost: 60,  weight: 5,  speedFactor: 8, acAdj: [-1,0,0,1,2,3,3,3,3],    classes: ['fighter','ranger','paladin'], verb: 'shoots', ranged: true, ammoType: 'arrow', rof: 2, range: [7, 14, 21], twoHand: true },
  light_crossbow:  { name: 'Light Crossbow',   damage: [1,4],  damageL: [1,4],   cost: 12,  weight: 5,  speedFactor: 7, acAdj: [-2,-1,0,0,1,2,3,3,3],   classes: ['fighter','ranger','paladin','thief','assassin'], verb: 'shoots', ranged: true, ammoType: 'bolt', rof: 1, range: [6, 12, 18], twoHand: true },
  heavy_crossbow:  { name: 'Heavy Crossbow',   damage: [1,4,1],damageL: [1,6,1], cost: 20,  weight: 8,  speedFactor: 10,acAdj: [-1,0,1,2,3,3,4,4,4],    classes: ['fighter','ranger','paladin'], verb: 'shoots', ranged: true, ammoType: 'bolt', rof: 1, range: [8, 16, 24], twoHand: true },
  sling:           { name: 'Sling',            damage: [1,4,1],damageL: [1,6,1], cost: 1,   weight: 0,  speedFactor: 7, acAdj: [-2,-2,-1,0,0,0,2,1,3],  classes: ['fighter','ranger','paladin','thief','assassin','druid','monk'], verb: 'slings at', ranged: true, ammoType: 'sling_bullet', rof: 1, range: [4, 8, 16] },
};

// --- Ammo (buy in bundles, tracked as count on player) ---
const AMMO = {
  arrow:       { name: 'Arrows (20)',       cost: 2,  weight: 3,  qty: 20, ammoType: 'arrow' },
  bolt:        { name: 'Bolts (30)',        cost: 2,  weight: 3,  qty: 30, ammoType: 'bolt' },
  sling_bullet:{ name: 'Sling Bullets (10)',cost: 1,  weight: 2,  qty: 10, ammoType: 'sling_bullet' },
};

// --- Supplies ---
const SUPPLIES = {
  torch:         { name: 'Torch (5)',          cost: 1,  weight: 1, qty: 5, light: { radius: 16, turns: 6, type: 'torch' } },
  lantern:       { name: 'Lantern',            cost: 10, weight: 2, light: { radius: 12, turns: 24, type: 'lantern' } },
  oil_flask:     { name: 'Oil Flask',          cost: 1,  weight: 1 },
  tinderbox:     { name: 'Tinderbox',          cost: 1,  weight: 0 },
  rations:       { name: 'Iron Rations (7d)',  cost: 5,  weight: 7, consumable: 'rations', charges: 7 },
  std_rations:   { name: 'Standard Rations (7d)', cost: 3, weight: 10, consumable: 'rations', charges: 7 },
  rope:          { name: 'Rope (50\')',        cost: 1,  weight: 7 },
  backpack:      { name: 'Backpack',           cost: 2,  weight: 2 },
  waterskin:     { name: 'Waterskin',          cost: 1,  weight: 5, consumable: 'water', charges: 2 },
  healing_potion:{ name: 'Potion of Healing',  cost: 200, weight: 1, heal: [2, 8, 1] }, // 2d4+1
  antidote:      { name: 'Antidote',           cost: 100, weight: 1 },
};

// --- Gems (DMG gem value table, simplified) ---
const GEMS = {
  gem_quartz:    { name: 'Quartz',          cost: 10,   weight: 0 },
  gem_turquoise: { name: 'Turquoise',       cost: 10,   weight: 0 },
  gem_onyx:      { name: 'Onyx',            cost: 50,   weight: 0 },
  gem_garnet:    { name: 'Garnet',          cost: 100,  weight: 0 },
  gem_pearl:     { name: 'Pearl',           cost: 100,  weight: 0 },
  gem_topaz:     { name: 'Topaz',           cost: 500,  weight: 0 },
  gem_opal:      { name: 'Black Opal',      cost: 1000, weight: 0 },
};

// --- Jewelry (DMG) ---
const JEWELRY = {
  jewel_silver_ring:    { name: 'Silver Ring',     cost: 25,   weight: 0 },
  jewel_gold_chain:     { name: 'Gold Chain',      cost: 100,  weight: 0 },
  jewel_gold_bracelet:  { name: 'Gold Bracelet',   cost: 200,  weight: 0 },
  jewel_jeweled_brooch: { name: 'Jeweled Brooch',  cost: 500,  weight: 0 },
};

// --- Shop inventories by NPC type ---
const SHOP_TYPES = {
  blacksmith: {
    name: 'Blacksmith',
    sells: {
      armor: Object.keys(ARMOR),
      shields: Object.keys(SHIELDS),
      weapons: ['dagger','hand_axe','club','hammer','mace','horsemans_mace','horsemans_flail','horsemans_pick',
                'morning_star','military_pick','short_sword','broad_sword','long_sword','scimitar','battle_axe',
                'bastard_sword','two_h_sword','flail','quarterstaff',
                'spear','trident','halberd','pike','bardiche','partisan','military_fork',
                'glaive','voulge','bill_guisarme','ranseur','lucern_hammer'],
      ranged: ['short_bow','long_bow','light_crossbow','heavy_crossbow','sling'],
      ammo: ['arrow','bolt','sling_bullet'],
    },
    buyRate: 0.5,
  },
  general: {
    name: 'General Store',
    sells: {
      weapons: ['dagger','club','quarterstaff'],
      ranged: ['sling'],
      ammo: ['arrow','bolt','sling_bullet'],
      supplies: Object.keys(SUPPLIES),
    },
    buyRate: 0.3,
  },
  temple: {
    name: 'Temple',
    sells: {
      supplies: ['healing_potion', 'antidote'],
      weapons: ['mace', 'hammer', 'quarterstaff'],
    },
    buyRate: 0.4,
  },
  money_changer: {
    name: 'Money Changer',
    sells: {},
    buyRate: 0,    // doesn't buy items
    fee: 3,        // 3% exchange fee
  },
  jeweler: {
    name: 'Jeweler',
    sells: {},
    buyRate: 0.8,  // buys gems/jewelry at 80% value per DMG
  },
};

// --- Inventory helpers ---
function canUseItem(charClass, item) {
  if (!item.classes) return true; // supplies, ammo etc
  return item.classes.includes(charClass);
}

function getItemDef(itemId) {
  return WEAPONS[itemId] || RANGED_WEAPONS[itemId] || ARMOR[itemId] || SHIELDS[itemId] || AMMO[itemId] || SUPPLIES[itemId] || GEMS[itemId] || JEWELRY[itemId] || null;
}

function getItemCategory(itemId) {
  if (WEAPONS[itemId]) return 'weapon';
  if (RANGED_WEAPONS[itemId]) return 'ranged';
  if (ARMOR[itemId]) return 'armor';
  if (SHIELDS[itemId]) return 'shield';
  if (AMMO[itemId]) return 'ammo';
  if (SUPPLIES[itemId]) return 'supply';
  if (GEMS[itemId]) return 'gem';
  if (JEWELRY[itemId]) return 'jewelry';
  return null;
}

// Calculate effective AC from equipment
function calculateAC(player) {
  let ac = 10;
  if (player.equippedArmor) {
    const arm = ARMOR[player.equippedArmor];
    if (arm) ac = arm.ac;
  }
  // Offhand shield bonus (only if offhand is actually a shield)
  if (player.equippedOffhand && SHIELDS[player.equippedOffhand]) {
    const sh = SHIELDS[player.equippedOffhand];
    if (sh) ac -= sh.acBonus;
  }
  ac -= dexAcBonus(player.dex || 10);
  return ac;
}

// PHB DEX defensive adjustment (positive = better AC)
function dexAcBonus(dex) {
  // PHB Table I: Defensive Adjustment (positive = better AC, negative = worse)
  if (dex <= 3) return -4;
  if (dex === 4) return -3;
  if (dex === 5) return -2;
  if (dex === 6) return -1;
  if (dex <= 14) return 0;
  if (dex === 15) return 1;
  if (dex === 16) return 2;
  if (dex === 17) return 3;
  if (dex >= 18) return 4;
  return 0;
}

// Get equipped melee weapon info
function getWeaponInfo(player) {
  if (player.equippedWeapon) {
    const w = WEAPONS[player.equippedWeapon];
    if (w) return { damage: w.damage, damageL: w.damageL || w.damage, acAdj: w.acAdj || null,
      speedFactor: w.speedFactor || 5, length: w.length || 2, space: w.space || 2,
      settable: w.settable || false, verb: w.verb, name: w.name, ranged: false };
  }
  return { damage: [1, 2], damageL: [1, 2], acAdj: null, speedFactor: 1, length: 2, space: 1,
    verb: 'punches', name: 'fists', ranged: false };
}

// Get equipped ranged weapon info (null if none)
function getRangedWeaponInfo(player) {
  if (player.equippedRanged) {
    const w = RANGED_WEAPONS[player.equippedRanged];
    if (w) return { id: player.equippedRanged, damage: w.damage, damageL: w.damageL || w.damage, acAdj: w.acAdj || null,
      speedFactor: w.speedFactor || 5, verb: w.verb, name: w.name, ranged: true, ammoType: w.ammoType, rof: w.rof, range: w.range };
  }
  return null;
}

// PHB Table I: Dex Reaction/Attacking Adjustment (missile to-hit)
function dexMissileBonus(dex) {
  if (dex <= 3) return -3;
  if (dex === 4) return -2;
  if (dex === 5) return -1;
  if (dex <= 15) return 0;
  if (dex === 16) return 1;
  if (dex === 17) return 2;
  if (dex >= 18) return 3;
  return 0;
}

// Range modifier: short=0, medium=-2, long=-5
function getRangeModifier(distance, rangeBrackets) {
  if (distance <= rangeBrackets[0]) return { mod: 0, bracket: 'short' };
  if (distance <= rangeBrackets[1]) return { mod: -2, bracket: 'medium' };
  if (distance <= rangeBrackets[2]) return { mod: -5, bracket: 'long' };
  return { mod: null, bracket: 'out of range' }; // too far
}

// Build shop listing for a player (filtered by class)
function getShopListing(shopType, charClass) {
  const shop = SHOP_TYPES[shopType];
  if (!shop) return null;

  const listing = [];
  if (shop.sells.armor) {
    for (const id of shop.sells.armor) {
      const item = ARMOR[id];
      if (item && canUseItem(charClass, item)) {
        listing.push({ id, category: 'armor', ...item });
      }
    }
  }
  if (shop.sells.shields) {
    for (const id of shop.sells.shields) {
      const item = SHIELDS[id];
      if (item && canUseItem(charClass, item)) {
        listing.push({ id, category: 'shield', ...item });
      }
    }
  }
  if (shop.sells.weapons) {
    for (const id of shop.sells.weapons) {
      const item = WEAPONS[id];
      if (item && canUseItem(charClass, item)) {
        listing.push({ id, category: 'weapon', ...item });
      }
    }
  }
  if (shop.sells.ranged) {
    for (const id of shop.sells.ranged) {
      const item = RANGED_WEAPONS[id];
      if (item && canUseItem(charClass, item)) {
        listing.push({ id, category: 'ranged', ...item });
      }
    }
  }
  if (shop.sells.ammo) {
    for (const id of shop.sells.ammo) {
      const item = AMMO[id];
      if (item) listing.push({ id, category: 'ammo', ...item });
    }
  }
  if (shop.sells.supplies) {
    for (const id of shop.sells.supplies) {
      const item = SUPPLIES[id];
      if (item) listing.push({ id, category: 'supply', ...item });
    }
  }

  return { shopName: shop.name, items: listing, buyRate: shop.buyRate };
}

// Calculate total carried weight in pounds
function calculateWeight(player) {
  let weight = 0;
  if (player.equippedArmor && ARMOR[player.equippedArmor]) {
    weight += ARMOR[player.equippedArmor].weight;
  }
  // Offhand: could be shield or weapon
  if (player.equippedOffhand) {
    if (SHIELDS[player.equippedOffhand]) weight += SHIELDS[player.equippedOffhand].weight;
    else if (WEAPONS[player.equippedOffhand]) weight += WEAPONS[player.equippedOffhand].weight;
  }
  if (player.equippedWeapon && WEAPONS[player.equippedWeapon]) {
    weight += WEAPONS[player.equippedWeapon].weight;
  }
  if (player.equippedRanged && RANGED_WEAPONS[player.equippedRanged]) {
    weight += RANGED_WEAPONS[player.equippedRanged].weight;
  }
  // Ammo weight (rough: 3# per 20 arrows, proportional)
  const ammo = player.ammo || {};
  if (ammo.arrow > 0) weight += Math.ceil(ammo.arrow / 20) * 3;
  if (ammo.bolt > 0) weight += Math.ceil(ammo.bolt / 30) * 3;
  if (ammo.sling_bullet > 0) weight += Math.ceil(ammo.sling_bullet / 10) * 2;
  // Inventory items
  if (player.inventory) {
    for (const itemId of player.inventory) {
      const def = getItemDef(itemId);
      if (def) weight += (def.weight || 0);
    }
  }
  // Gold weight: 10 GP = 1 pound
  weight += (player.gold || 0) / 10;
  return weight;
}

// Return flat list of all weapons (melee + ranged) with id, name, classes
function getAllWeapons() {
  const list = [];
  for (const [id, w] of Object.entries(WEAPONS)) {
    list.push({ id, name: w.name, classes: w.classes });
  }
  for (const [id, w] of Object.entries(RANGED_WEAPONS)) {
    list.push({ id, name: w.name, classes: w.classes });
  }
  return list;
}

// Valid offhand items: shields, dagger, hand_axe
const VALID_OFFHAND_WEAPONS = ['dagger', 'hand_axe'];
function isValidOffhand(itemId) {
  return !!(SHIELDS[itemId] || VALID_OFFHAND_WEAPONS.includes(itemId));
}

// What type of thing is in the offhand?
function getOffhandType(itemId) {
  if (!itemId) return null;
  if (SHIELDS[itemId]) return 'shield';
  if (VALID_OFFHAND_WEAPONS.includes(itemId)) return 'weapon';
  return null;
}

// Get offhand weapon info for dual-wield attacks
function getOffhandWeaponInfo(player) {
  if (!player.equippedOffhand) return null;
  const w = WEAPONS[player.equippedOffhand];
  if (!w) return null; // it's a shield, not a weapon
  return { damage: w.damage, damageL: w.damageL || w.damage, acAdj: w.acAdj || null,
    speedFactor: w.speedFactor || 5, verb: w.verb, name: w.name };
}

// PHB two-weapon attack penalties adjusted by DEX reaction bonus
// Base: primary -2, secondary -4
// DEX 16: -1/-3, DEX 17: 0/-2, DEX 18: 0/-1 (never positive)
function dualWieldPenalties(dex) {
  let react = 0;
  if (dex >= 18) react = 3;
  else if (dex === 17) react = 2;
  else if (dex === 16) react = 1;
  // Below 6: additional penalty from reaction adj (added to EACH weapon)
  let extraPenalty = 0;
  if (dex <= 5) extraPenalty = dex <= 3 ? -3 : dex === 4 ? -2 : -1;
  const primary = Math.min(0, -2 + react) + extraPenalty;
  const secondary = Math.min(0, -4 + react) + extraPenalty;
  return { primary, secondary };
}

// Check if main weapon is two-handed
function isWeaponTwoHanded(weaponId) {
  if (!weaponId) return false;
  const w = WEAPONS[weaponId];
  if (w && w.twoHand) return true;
  // All ranged weapons are two-handed
  if (RANGED_WEAPONS[weaponId]) return true;
  return false;
}

const ADNDEquipment = {
  ARMOR, SHIELDS, WEAPONS, RANGED_WEAPONS, AMMO, SUPPLIES, GEMS, JEWELRY, SHOP_TYPES,
  canUseItem, getItemDef, getItemCategory,
  calculateAC, dexAcBonus, getWeaponInfo, getRangedWeaponInfo,
  dexMissileBonus, getRangeModifier,
  getShopListing, calculateWeight, getAllWeapons,
  isValidOffhand, getOffhandType, getOffhandWeaponInfo, dualWieldPenalties, isWeaponTwoHanded,
  VALID_OFFHAND_WEAPONS,
};
if (typeof module !== 'undefined' && module.exports) module.exports = ADNDEquipment;
if (typeof window !== 'undefined') window.ADNDEquipment = ADNDEquipment;

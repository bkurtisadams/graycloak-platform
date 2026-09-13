import { requireDice } from '../dice.js';

// ---------------------------------------------------------------------------
// Classic Traveller Book 3: Worlds and Adventures (1977), pp. 24-32.
// Animal encounters. The resolution half of this has existed since the 1977
// combat port — the claws/teeth/horns/hooves/stinger/thrasher rows are in
// PERSONAL_WEAPONS for exactly this — but nothing generated a beast.
//
// Book 3's terrain chart (p.26) is NOT Book 1's terrain DMs (p.27). Book 1's
// modify the encounter range throw; these modify the animal type throw and the
// size throw, over a different list of terrain types.
// ---------------------------------------------------------------------------

export const ANIMAL_TERRAIN_DMS = Object.freeze({
  'clear-road': { label: 'Clear, Road', typeDM: 3, sizeDM: 0 },
  'plain-prairie': { label: 'Plain, Prairie', typeDM: 4, sizeDM: 0 },
  desert: { label: 'Desert', typeDM: 3, sizeDM: -3 },
  'hills-foothills': { label: 'Hills, Foothills', typeDM: 0, sizeDM: 0 },
  mountain: { label: 'Mountain', typeDM: 0, sizeDM: 0 },
  forest: { label: 'Forest', typeDM: -4, sizeDM: -4 },
  woods: { label: 'Woods', typeDM: -2, sizeDM: -1 },
  jungle: { label: 'Jungle', typeDM: -4, sizeDM: -3 },
  rainforest: { label: 'Rainforest', typeDM: -2, sizeDM: -2 },
  'rough-broken': { label: 'Rough, Broken', typeDM: -3, sizeDM: -3 },
  'swamp-marsh': { label: 'Swamp, Marsh', typeDM: -2, sizeDM: 4 },
  'beach-shore': { label: 'Beach, Shore', typeDM: 3, sizeDM: 2 },
  riverbank: { label: 'Riverbank', typeDM: 1, sizeDM: 1 },
  cave: { label: 'Cave', typeDM: 0, sizeDM: -1 },
  ruins: { label: 'Ruins', typeDM: -2, sizeDM: 0 }
});
export const ANIMAL_TERRAIN_KEYS = Object.freeze(Object.keys(ANIMAL_TERRAIN_DMS));

// Book 3 p.25 blank encounter column: the predetermined sequence of categories
// for throws 2-12. The referee may vary it; this is the printed default.
export const BLANK_ENCOUNTER_COLUMN = Object.freeze({
  2: 'scavenger', 3: 'omnivore', 4: 'scavenger', 5: 'omnivore',
  6: 'herbivore', 7: 'herbivore', 8: 'herbivore',
  9: 'carnivore', 10: 'event', 11: 'carnivore', 12: 'carnivore'
});

export const ANIMAL_CATEGORIES = Object.freeze(['herbivore', 'omnivore', 'carnivore', 'scavenger']);

// Book 3 p.27. Indexed 1-13; a parenthesised throw is the quantity appearing.
const T = (type, quantityDice = 0) => Object.freeze({ type, quantityDice });
export const ANIMAL_TYPES = Object.freeze({
  herbivore: Object.freeze({
    1: T('filter'), 2: T('filter'), 3: T('intermittent'), 4: T('intermittent'),
    5: T('intermittent', 1), 6: T('intermittent'), 7: T('grazer'), 8: T('grazer', 5),
    9: T('grazer', 4), 10: T('grazer', 3), 11: T('grazer', 2), 12: T('grazer', 2), 13: T('grazer', 1)
  }),
  omnivore: Object.freeze({
    1: T('gatherer'), 2: T('eater'), 3: T('gatherer'), 4: T('eater', 2),
    5: T('gatherer'), 6: T('hunter'), 7: T('hunter', 1), 8: T('hunter'),
    9: T('gatherer'), 10: T('eater', 1), 11: T('hunter', 1), 12: T('gatherer'), 13: T('gatherer')
  }),
  carnivore: Object.freeze({
    1: T('pouncer'), 2: T('siren'), 3: T('pouncer'), 4: T('killer', 1),
    5: T('trapper'), 6: T('pouncer'), 7: T('chaser'), 8: T('chaser', 3),
    9: T('chaser'), 10: T('killer'), 11: T('chaser', 2), 12: T('siren'), 13: T('chaser', 1)
  }),
  scavenger: Object.freeze({
    1: T('carrion-eater', 2), 2: T('reducer', 1), 3: T('hijacker', 1), 4: T('carrion-eater', 2),
    5: T('intimidator', 1), 6: T('reducer'), 7: T('carrion-eater', 1), 8: T('reducer', 3),
    9: T('hijacker'), 10: T('intimidator', 2), 11: T('reducer', 1), 12: T('hijacker'), 13: T('intimidator', 1)
  })
});

// Book 3 p.27. A = amphibian, F = flyer, S = swimmer, T = triphibian.
// The number is a size DM; for flyers it REPLACES the terrain size DM.
const A = (attribute, sizeDM) => Object.freeze({ attribute, sizeDM });
const NONE = Object.freeze({ attribute: null, sizeDM: 0 });
export const ANIMAL_SPECIAL_ATTRIBUTES = Object.freeze({
  'beach-shore': Object.freeze({
    2: A('swimmer', 1), 3: A('amphibian', 2), 4: A('amphibian', 2), 5: NONE, 6: NONE, 7: NONE,
    8: NONE, 9: NONE, 10: NONE, 11: A('flyer', -6), 12: A('flyer', -5), 13: A('triphibian', -6)
  }),
  riverbank: Object.freeze({
    2: A('swimmer', 1), 3: A('amphibian', 1), 4: NONE, 5: NONE, 6: NONE, 7: NONE,
    8: NONE, 9: NONE, 10: NONE, 11: A('flyer', -6), 12: A('flyer', -5), 13: A('flyer', -3)
  }),
  'swamp-marsh': Object.freeze({
    2: A('swimmer', -6), 3: A('amphibian', 1), 4: A('amphibian', 2), 5: NONE, 6: NONE, 7: NONE,
    8: NONE, 9: NONE, 10: NONE, 11: A('flyer', -6), 12: A('flyer', -5), 13: A('flyer', -3)
  }),
  'sea-ocean': Object.freeze({
    2: A('swimmer', 2), 3: A('swimmer', 2), 4: A('swimmer', 2), 5: A('amphibian', 2), 6: A('amphibian', 0),
    7: A('swimmer', 1), 8: A('swimmer', -1), 9: A('triphibian', -7), 10: A('triphibian', -6),
    11: A('flyer', -6), 12: A('flyer', -5), 13: A('flyer', -3)
  }),
  other: Object.freeze({
    2: NONE, 3: NONE, 4: NONE, 5: NONE, 6: NONE, 7: NONE, 8: NONE, 9: NONE, 10: NONE,
    11: A('flyer', -6), 12: A('flyer', -5), 13: A('flyer', -3)
  })
});

// Book 3 p.32. One 2D throw gives weight, hits and the wound alteration
// together; weapons and armor are separate throws on the same table.
// `null` marks the bullet that sends you to the reroll table below.
const S = (weightKg, unconscious, dead, woundDice) => Object.freeze({ weightKg, unconscious, dead, woundDice });
export const ANIMAL_SIZES = Object.freeze({
  1: S(1, 1, 0, -2), 2: S(3, 1, 1, -2), 3: S(6, 1, 2, -1), 4: S(12, 2, 2, -1),
  5: S(25, 3, 2, -1), 6: S(50, 4, 2, -1), 7: S(100, 5, 2, 0), 8: S(200, 5, 3, 1),
  9: S(400, 6, 3, 2), 10: S(800, 7, 3, 3), 11: S(1600, 8, 3, 4), 12: S(3200, 8, 4, 5),
  13: null
});

export const ANIMAL_WEAPONS = Object.freeze({
  1: null, 2: ['teeth'], 3: ['horns'], 4: ['hooves'], 5: ['hooves', 'teeth'], 6: ['teeth'],
  7: null, 8: ['stinger'], 9: ['thrasher'], 10: ['claws', 'teeth'], 11: ['claws'], 12: ['teeth'],
  13: null
});

export const ANIMAL_ARMOR = Object.freeze({
  1: 'jack', 2: 'none', 3: 'none', 4: 'mesh', 5: 'cloth', 6: 'none', 7: 'none',
  8: 'none', 9: 'none', 10: 'none', 11: 'none', 12: 'none', 13: 'none'
});

// Book 3 p.32: "If this value is rolled, reroll one die and consult the
// appropriate column below." One die, so 1-6.
export const ANIMAL_SIZE_REROLL = Object.freeze({
  1: Object.freeze({ weightKg: 6000, unconscious: 9, dead: 4, woundMultiplier: 2 }),
  2: Object.freeze({ weightKg: 12000, unconscious: 10, dead: 5, woundMultiplier: 2 }),
  3: Object.freeze({ weightKg: 18000, unconscious: 11, dead: 6, woundMultiplier: 3 }),
  4: Object.freeze({ weightKg: 24000, unconscious: 12, dead: 6, woundMultiplier: 3 }),
  5: Object.freeze({ weightKg: 30000, unconscious: 14, dead: 7, woundMultiplier: 4 }),
  6: Object.freeze({ weightKg: 36000, unconscious: 15, dead: 7, woundMultiplier: 4 })
});
export const ANIMAL_WEAPON_REROLL = Object.freeze({
  1: ['body-pistol'], 2: ['pike'], 3: ['blade'], 4: ['broadsword'], 5: ['stinger'], 6: ['halberd']
});
// The reroll table's armor column reads "as mesh" against the bullet row.
export const ANIMAL_ARMOR_REROLL = 'mesh';

// Book 3 p.29. `null` means the printed condition rather than a throw; the
// condition key is carried so a caller can implement it.
const B = (attack, flee, speed, { attackRule = null, fleeRule = null } = {}) =>
  Object.freeze({ attack, flee, speed, attackRule, fleeRule });
export const ANIMAL_BEHAVIOR = Object.freeze({
  filter: B(null, 8, ['ordinary', 'none'], { attackRule: 'if-possible' }),
  intermittent: B(10, 9, ['double']),
  grazer: B(8, 5, ['double']),
  gatherer: B(9, 8, ['ordinary']),
  hunter: B(6, 8, ['double'], { attackRule: 'if-bigger' }),
  eater: B(5, 10, ['ordinary', 'double']),
  pouncer: B(null, null, ['double'], { attackRule: 'if-surprise', fleeRule: 'if-surprised' }),
  chaser: B(6, 9, ['triple', 'double'], { attackRule: 'if-more' }),
  trapper: B(null, 9, ['ordinary', 'none'], { attackRule: 'if-surprise' }),
  siren: B(null, 10, ['ordinary', 'none'], { attackRule: 'if-surprise' }),
  killer: B(6, 11, ['double', 'ordinary']),
  hijacker: B(7, 8, ['double']),
  intimidator: B(8, 7, ['double']),
  'carrion-eater': B(1, 8, ['ordinary']),
  reducer: B(10, 8, ['double'])
});

const HERBIVORE_TYPES = Object.freeze(['filter', 'intermittent', 'grazer']);

function clampIndex(total) {
  return Math.max(1, Math.min(13, total));
}

function roll2D(dice) {
  return dice.rollD6() + dice.rollD6();
}

/**
 * Book 3 pp.25-28, in the order of the encounter table creation checklist.
 * Terrain drives the type throw and the size throw; the special-attribute
 * throw uses its own terrain column and can override the size DM entirely.
 */
export function generateAnimalEncounter(dice, {
  category,
  terrain = 'clear-road',
  attributeTerrain = null,
  planetSize = 7
} = {}) {
  requireDice(dice);
  if (!ANIMAL_CATEGORIES.includes(category)) throw new RangeError(`unknown animal category: ${category}`);
  if (!Object.hasOwn(ANIMAL_TERRAIN_DMS, terrain)) throw new RangeError(`unknown animal terrain: ${terrain}`);
  const terrainDMs = ANIMAL_TERRAIN_DMS[terrain];

  // 3. Animal type, modified by the terrain type DM.
  const typeThrow = roll2D(dice);
  const entry = ANIMAL_TYPES[category][clampIndex(typeThrow + terrainDMs.typeDM)];
  const quantity = entry.quantityDice
    ? Array.from({ length: entry.quantityDice }, () => dice.rollD6()).reduce((sum, die) => sum + die, 0)
    : 1;

  // 4. Special attributes. Its own terrain column; 'other' covers dry land.
  const attributeColumn = attributeTerrain ?? (Object.hasOwn(ANIMAL_SPECIAL_ATTRIBUTES, terrain) ? terrain : 'other');
  if (!Object.hasOwn(ANIMAL_SPECIAL_ATTRIBUTES, attributeColumn)) throw new RangeError(`unknown attribute column: ${attributeColumn}`);
  const attribute = ANIMAL_SPECIAL_ATTRIBUTES[attributeColumn][clampIndex(roll2D(dice))];

  // 5. Size. Book 3 p.32: planet size 8+ or 4- each give -1. For a flyer the
  // attribute DM is the only size DM used; everyone else also takes terrain's.
  const planetDM = (planetSize >= 8 || planetSize <= 4) ? -1 : 0;
  const sizeDM = attribute.attribute === 'flyer'
    ? attribute.sizeDM + planetDM
    : attribute.sizeDM + terrainDMs.sizeDM + planetDM;
  let size = ANIMAL_SIZES[clampIndex(roll2D(dice) + sizeDM)];
  let woundMultiplier = 1;
  let woundDice = 0;
  if (size === null) {
    const giant = ANIMAL_SIZE_REROLL[dice.rollD6()];
    size = { weightKg: giant.weightKg, unconscious: giant.unconscious, dead: giant.dead };
    woundMultiplier = giant.woundMultiplier;
  } else {
    woundDice = size.woundDice;
  }

  // 6-7. Weapons and armor. Carnivore +6, herbivore -6; scavengers always also
  // have teeth; a flyer never has armor.
  const combatDM = category === 'carnivore' ? 6 : category === 'herbivore' ? -6 : 0;
  let weapons = ANIMAL_WEAPONS[clampIndex(roll2D(dice) + combatDM)];
  let armorFromReroll = null;
  if (weapons === null) {
    weapons = ANIMAL_WEAPON_REROLL[dice.rollD6()];
    armorFromReroll = ANIMAL_ARMOR_REROLL;
  }
  weapons = [...weapons];
  if (category === 'scavenger' && !weapons.includes('teeth')) weapons.push('teeth');

  let armor = armorFromReroll ?? ANIMAL_ARMOR[clampIndex(roll2D(dice) + combatDM)];
  if (attribute.attribute === 'flyer') armor = 'none';

  return Object.freeze({
    category,
    type: entry.type,
    quantity,
    terrain,
    specialAttribute: attribute.attribute,
    weightKg: size.weightKg,
    // Book 3 p.25: the first throw renders it unconscious, the second is the
    // FURTHER damage needed to kill, so dead is the sum.
    hits: Object.freeze({ unconsciousDice: size.unconscious, furtherDice: size.dead }),
    woundDice,
    woundMultiplier,
    weapons: Object.freeze(weapons),
    armor,
    behavior: ANIMAL_BEHAVIOR[entry.type]
  });
}

/**
 * Book 3 p.29. Herbivores throw to flee first and attack only if they stay;
 * everything else throws to attack first. One throw covers a pack.
 */
export function resolveAnimalReaction(dice, animal, {
  surprise = false,
  surprised = false,
  partySize = 1,
  largestPartyMemberKg = 100
} = {}) {
  requireDice(dice);
  const behavior = animal?.behavior;
  if (!behavior) throw new TypeError('animal must carry its Book 3 behavior');

  const conditional = (rule) => {
    if (rule === 'if-possible') return true;
    if (rule === 'if-surprise') return surprise;
    if (rule === 'if-surprised') return surprised;
    if (rule === 'if-bigger') return animal.weightKg > largestPartyMemberKg;
    if (rule === 'if-more') return animal.quantity > partySize;
    return false;
  };

  const attackThrow = () => {
    if (behavior.attackRule) {
      // Book 3: a chaser with the numbers still throws 6+; the others are
      // conditions on their own.
      if (!conditional(behavior.attackRule)) return false;
      return behavior.attack === null ? true : roll2D(dice) >= behavior.attack;
    }
    return roll2D(dice) >= behavior.attack;
  };
  const fleeThrow = () => {
    if (behavior.fleeRule) return conditional(behavior.fleeRule);
    return behavior.flee === null ? false : roll2D(dice) >= behavior.flee;
  };

  const herbivore = HERBIVORE_TYPES.includes(animal.type);
  if (herbivore) {
    if (fleeThrow()) return Object.freeze({ action: 'flee', speed: animalSpeed(dice, animal) });
    if (attackThrow()) return Object.freeze({ action: 'attack', speed: animalSpeed(dice, animal) });
    return Object.freeze({ action: 'stand', speed: 'none' });
  }
  if (attackThrow()) return Object.freeze({ action: 'attack', speed: animalSpeed(dice, animal) });
  if (fleeThrow()) return Object.freeze({ action: 'flee', speed: animalSpeed(dice, animal) });
  return Object.freeze({ action: 'stand', speed: 'none' });
}

// Book 3 p.29: where two speeds are given, the first applies on 7+.
export function animalSpeed(dice, animal) {
  requireDice(dice);
  const speeds = animal?.behavior?.speed ?? ['ordinary'];
  if (speeds.length === 1) return speeds[0];
  return roll2D(dice) >= 7 ? speeds[0] : speeds[1];
}

// Book 3 p.28: throw 5+ to be edible, DM -3 for a tainted atmosphere, and only
// where the atmosphere is 2-9 and the animal carries no poison weapon.
export function isAnimalEdible(dice, animal, { atmosphere = 6, tainted = false } = {}) {
  requireDice(dice);
  if (atmosphere < 2 || atmosphere > 9) return false;
  if ((animal?.weapons ?? []).includes('stinger')) return false;
  return roll2D(dice) + (tainted ? -3 : 0) >= 5;
}

// Book 3 p.28: one die times 5% of the animal's weight is edible meat, and a
// person living off the hunt needs a kilogram a day.
export function animalEdibleMeatKg(dice, animal) {
  requireDice(dice);
  return Math.round(animal.weightKg * (dice.rollD6() * 5) / 100);
}

// Book 3 p.26: one third — 5 or 6 on one die — per check, and the referee
// checks once while travelling and once while halted.
export const ANIMAL_ENCOUNTER_THROW = 5;
export function checkForAnimalEncounter(dice, { dm = 0 } = {}) {
  requireDice(dice);
  return dice.rollD6() + dm >= ANIMAL_ENCOUNTER_THROW;
}

// Book 3 p.25: the encounter column is rolled on 2D, and a 10 is an event
// rather than an animal.
export function animalCategoryForThrow(total) {
  const index = Math.max(2, Math.min(12, total));
  return BLANK_ENCOUNTER_COLUMN[index];
}

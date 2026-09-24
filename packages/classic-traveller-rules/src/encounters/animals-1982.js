import { requireDice } from '../dice.js';
import { getPersonalWeapon, rollAnimalWound } from '../combat/personal-combat.js';

// ---------------------------------------------------------------------------
// The Traveller Book (1982), pp.90-96: Animal Encounters. Graycloak ruling
// (Kurt, Sep 2026): the 1982 chapter replaces Book 3 (1977) pp.24-32 for
// animals. animals.js keeps the 1977 tables for the old client.
//
// An encounter table is built once per terrain per world, every animal fully
// rolled (weight, hits, wounds, weapons, armor, A/F/S), and kept hidden from
// the players (p.90, p.95 checklist).
// ---------------------------------------------------------------------------

const TT = (label, equivalent, typeDM, sizeDM, attributeColumn) => Object.freeze({ label, equivalent, typeDM, sizeDM, attributeColumn });
// p.94 Terrain Types. The attribute column is Graycloak's: the attributes
// table names Beach, Marsh, River, Sea and Swamp; the six sea terrains use
// Sea and everything else Other.
export const ANIMAL_TERRAIN_TYPES_1982 = Object.freeze({
  clear: TT('Clear', 'Road, Open', 3, 0, 'other'),
  prairie: TT('Prairie', 'Plain, Steppe', 4, 0, 'other'),
  rough: TT('Rough', 'Hills, Foothills', 0, 0, 'other'),
  broken: TT('Broken', 'Badlands', -3, -3, 'other'),
  mountain: TT('Mountain', 'Alpine', 0, 0, 'other'),
  forest: TT('Forest', 'Woods', -4, -4, 'other'),
  jungle: TT('Jungle', 'Rainforest', -3, -2, 'other'),
  river: TT('River', 'Stream, Creek', 1, 1, 'river'),
  swamp: TT('Swamp', 'Bog', -2, 4, 'swamp'),
  marsh: TT('Marsh', 'Wetland', 0, -1, 'marsh'),
  desert: TT('Desert', 'Dunes', 3, -3, 'other'),
  beach: TT('Beach', 'Shore, Sea Edge', 3, 2, 'beach'),
  surface: TT('Surface', 'Ocean, Sea', 2, 3, 'sea'),
  shallows: TT('Shallows', 'Ocean, Sea', 2, 2, 'sea'),
  depths: TT('Depths', 'Ocean, Sea', 2, 4, 'sea'),
  bottom: TT('Bottom', 'Ocean, Sea', -4, 0, 'sea'),
  'sea-cave': TT('Sea Cave', 'Sea Cavern', -2, 0, 'sea'),
  sargasso: TT('Sargasso', 'Seaweed', -4, -2, 'sea'),
  ruins: TT('Ruins', 'Old City', -3, 0, 'other'),
  cave: TT('Cave', 'Cavern', -4, 1, 'other'),
  chasm: TT('Chasm', 'Crevasse, Abyss', -1, -3, 'other'),
  crater: TT('Crater', 'Hollow', 0, -1, 'other')
});
export const ANIMAL_TERRAIN_KEYS_1982 = Object.freeze(Object.keys(ANIMAL_TERRAIN_TYPES_1982));

// p.94 Encounter Columns. Suggestions; the referee may pass his own.
export const ANIMAL_ENCOUNTER_COLUMNS_1982 = Object.freeze({
  '2D': Object.freeze({
    2: 'scavenger', 3: 'omnivore', 4: 'scavenger', 5: 'omnivore', 6: 'herbivore', 7: 'herbivore',
    8: 'herbivore', 9: 'carnivore', 10: 'event', 11: 'carnivore', 12: 'carnivore'
  }),
  '1D': Object.freeze({ 1: 'scavenger', 2: 'herbivore', 3: 'herbivore', 4: 'herbivore', 5: 'omnivore', 6: 'carnivore' })
});
export const ANIMAL_CATEGORIES_1982 = Object.freeze(['herbivore', 'omnivore', 'carnivore', 'scavenger']);

// p.94 Animal Types, 0-13. The parenthesised dice are the quantity.
const T = (type, quantityDice = 0) => Object.freeze({ type, quantityDice });
export const ANIMAL_TYPES_1982 = Object.freeze({
  herbivore: Object.freeze([
    T('filter', 1), T('filter'), T('filter'), T('intermittent'), T('intermittent'), T('intermittent', 1), T('intermittent'),
    T('grazer'), T('grazer', 1), T('grazer', 2), T('grazer', 3), T('grazer', 2), T('grazer', 4), T('grazer', 5)
  ]),
  omnivore: Object.freeze([
    T('gatherer'), T('gatherer'), T('eater'), T('gatherer'), T('eater', 2), T('gatherer'), T('hunter'),
    T('hunter', 1), T('hunter'), T('gatherer'), T('eater', 1), T('hunter', 1), T('gatherer'), T('gatherer')
  ]),
  carnivore: Object.freeze([
    T('siren'), T('pouncer'), T('siren'), T('pouncer'), T('killer', 1), T('trapper'), T('pouncer'),
    T('chaser'), T('chaser', 3), T('chaser'), T('killer'), T('chaser', 2), T('siren'), T('chaser', 1)
  ]),
  scavenger: Object.freeze([
    T('carrion-eater', 1), T('carrion-eater', 2), T('reducer', 1), T('hijacker', 1), T('carrion-eater', 2), T('intimidator', 1), T('reducer'),
    T('carrion-eater', 1), T('reducer', 3), T('hijacker'), T('intimidator', 2), T('reducer', 1), T('hijacker'), T('intimidator', 1)
  ])
});

// p.94 Animal Attributes, 2-12. The number is a size DM.
const A = (attribute, sizeDM) => Object.freeze({ attribute, sizeDM });
const NONE = Object.freeze({ attribute: null, sizeDM: 0 });
const column = (entries) => Object.freeze(Object.fromEntries(
  Array.from({ length: 11 }, (unused, index) => [index + 2, entries[index + 2] ?? NONE])
));
export const ANIMAL_ATTRIBUTES_1982 = Object.freeze({
  beach: column({ 2: A('swimmer', 1), 3: A('amphibian', 2), 4: A('amphibian', 2), 11: A('flyer', -6), 12: A('flyer', -5) }),
  marsh: column({ 2: A('swimmer', -6), 3: A('amphibian', 2), 4: A('amphibian', 1), 11: A('flyer', -6), 12: A('flyer', -5) }),
  river: column({ 2: A('swimmer', 1), 3: A('amphibian', 1), 11: A('flyer', -6), 12: A('flyer', -5) }),
  sea: column({
    2: A('swimmer', 2), 3: A('swimmer', 2), 4: A('swimmer', 2), 5: A('amphibian', 2), 6: A('amphibian', 0),
    7: A('swimmer', 1), 8: A('swimmer', -1), 9: A('triphibian', -7), 10: A('triphibian', -6),
    11: A('flyer', -6), 12: A('flyer', -5)
  }),
  swamp: column({ 2: A('swimmer', -3), 3: A('amphibian', 1), 4: A('amphibian', 1), 11: A('flyer', -6), 12: A('flyer', -5) }),
  other: column({ 10: A('flyer', -6), 11: A('flyer', -5), 12: A('flyer', -3) })
});

// p.94: size 9+ -1; 5 or 4 +1; 3- +2; atmosphere 8+ +2; 5- -1.
export function animalAttributeDM({ planetSize = 7, atmosphere = 6 } = {}) {
  let dm = 0;
  if (planetSize >= 9) dm -= 1;
  else if (planetSize === 4 || planetSize === 5) dm += 1;
  else if (planetSize <= 3) dm += 2;
  if (atmosphere >= 8) dm += 2;
  else if (atmosphere <= 5) dm -= 1;
  return dm;
}

// p.94: planetary size 8+ -1; 4- +1.
export function animalPlanetSizeDM(planetSize = 7) {
  if (planetSize >= 8) return -1;
  if (planetSize <= 4) return 1;
  return 0;
}

export const REROLL = 'reroll';

// p.94 Animal Sizes and Weaponry, weight/hits/wounds, 1-20. 13 is (+6).
// wounds: { dice: n } adds or subtracts n dice; { times: n } multiplies.
const S = (weightKg, unconsciousDice, furtherDice, wounds = null) => Object.freeze({ weightKg, unconsciousDice, furtherDice, wounds });
const D = (dice) => Object.freeze({ dice });
const X = (times) => Object.freeze({ times });
export const ANIMAL_SIZES_1982 = Object.freeze({
  1: S(1, 1, 0, D(-2)), 2: S(3, 1, 1, D(-2)), 3: S(6, 1, 2, D(-1)), 4: S(12, 2, 2), 5: S(25, 3, 2),
  6: S(50, 4, 2), 7: S(100, 5, 2), 8: S(200, 5, 3, D(1)), 9: S(400, 6, 3, D(2)), 10: S(800, 7, 3, D(3)),
  11: S(1600, 8, 3, D(4)), 12: S(3200, 8, 4, D(5)), 13: REROLL, 14: S(6000, 9, 4, X(2)), 15: S(12000, 10, 5, X(2)),
  16: S(24000, 12, 6, X(3)), 17: S(30000, 14, 7, X(4)), 18: S(36000, 15, 7, X(4)), 19: S(40000, 16, 8, X(5)),
  20: S(44000, 17, 9, X(6))
});

// Weapons column, 1-20. `dm` is a DM to the animal's combat roll (teeth+1).
const W = (key, dm = 0) => Object.freeze({ key, dm });
export const ANIMAL_WEAPONS_1982 = Object.freeze({
  1: [W('hooves'), W('horns')], 2: [W('horns')], 3: [W('hooves'), W('teeth')], 4: [W('hooves')],
  5: [W('horns'), W('teeth')], 6: [W('thrasher')], 7: [W('claws'), W('teeth')], 8: [W('teeth')],
  9: [W('claws')], 10: [W('claws')], 11: [W('thrasher')], 12: [W('claws'), W('teeth')],
  13: [W('claws', 1)], 14: [W('stinger')], 15: [W('claws', 1), W('teeth', 1)], 16: [W('teeth', 1)],
  17: [W('blade')], 18: [W('pike')], 19: [W('broadsword')], 20: [W('body-pistol')]
});
const AS_WEAPONS = Object.freeze(['blade', 'pike', 'broadsword', 'body-pistol']);

// Armor column, 1-20; 1 and 12 are (+6). `dm` is a DM to the combat roll
// against it ("battle+4 ... making the armor less effective"). The rules
// package's 'combat' armor key is the Battle Dress column; Combat Armor (not
// in the 1977 matrix) reads it too, which is what combat+4 means here.
const R = (key, dm = 0, label = null) => Object.freeze({ key, dm, label: label ?? (dm ? `${key}+${dm}` : key) });
export const ANIMAL_ARMOR_1982 = Object.freeze({
  1: REROLL, 2: R('none'), 3: R('none'), 4: R('jack'), 5: R('none'), 6: R('none'), 7: R('none'), 8: R('none'),
  9: R('none'), 10: R('jack'), 11: R('none'), 12: REROLL, 13: R('mesh', 1), 14: R('cloth', 1), 15: R('mesh'),
  16: R('cloth'), 17: R('combat', 4, 'cmbt+4'), 18: R('reflec'), 19: R('ablat'), 20: R('combat', 0, 'battle')
});

export const ANIMAL_WEAPON_DMS_1982 = Object.freeze({ carnivore: 8, omnivore: 4, herbivore: -3, scavenger: 0 });
export const ANIMAL_ARMOR_DMS_1982 = Object.freeze({ carnivore: -1, omnivore: 0, herbivore: 2, scavenger: 1 });

// p.95 Animal Characteristics. One die plus `dm`, floored at `min`; a string
// is the special case the book codes as 0.
const C = (attack, flee, speed) => Object.freeze({ attack, flee, speed });
const R1 = (dm, min = null) => Object.freeze({ dm, min });
export const ANIMAL_CHARACTERISTICS_1982 = Object.freeze({
  filter: C('if-possible', R1(2), R1(-5, 0)),
  intermittent: C(R1(3), R1(3), R1(-4, 1)),
  grazer: C(R1(2), R1(-1), R1(-2, 2)),
  gatherer: C(R1(3), R1(2), R1(-3, 1)),
  hunter: C(R1(0), R1(2), R1(-4, 1)),
  eater: C(R1(0), R1(3), R1(-3, 1)),
  pouncer: C('if-surprise', 'if-surprised', R1(-4, 1)),
  chaser: C('if-more', R1(3), R1(-2, 2)),
  trapper: C('if-surprise', R1(2), R1(-5, 0)),
  siren: C('if-surprise', R1(3), R1(-4, 0)),
  killer: C(R1(0), R1(3), R1(-3, 1)),
  hijacker: C(R1(1), R1(2), R1(-4, 1)),
  intimidator: C(R1(2), R1(1), R1(-4, 1)),
  'carrion-eater': C(R1(3), R1(2), R1(-3, 1)),
  reducer: C(R1(3), R1(2), R1(-4, 1))
});
const HERBIVORE_TYPES = Object.freeze(['filter', 'intermittent', 'grazer']);

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const roll2D = (dice) => dice.rollD6() + dice.rollD6();
const rollND = (dice, count) => Array.from({ length: Math.max(0, count) }, () => dice.rollD6());
const sum = (values) => values.reduce((total, value) => total + value, 0);

// p.94: "If the result is (+6), roll again with DM of +6. If +6 is rolled
// again, just reroll." Graycloak reading: the reroll keeps the throw's own
// DMs and adds +6.
function throwOnSizeColumn(dice, table, dm) {
  let total = clamp(roll2D(dice) + dm, 1, 20);
  let rerolled = false;
  for (let guard = 0; table[total] === REROLL; guard += 1) {
    if (guard > 50) throw new Error('animal table reroll did not settle');
    total = clamp(roll2D(dice) + dm + 6, 1, 20);
    rerolled = true;
  }
  return { index: total, entry: table[total], rerolled };
}

// p.92: "the damage dice should be rolled once when the animal is generated
// ... A roll of 0 or less equals 1."
export { rollAnimalWound };
export function fixedAnimalWound(dice, weaponKey, wounds = null) {
  requireDice(dice);
  const wound = rollAnimalWound(dice, weaponKey, wounds);
  if (wound.total > 0) return wound;
  return Object.freeze({ ...wound, groups: Object.freeze([1]), total: 1 });
}

function rollCharacteristic(dice, rule) {
  if (typeof rule === 'string') return Object.freeze({ throw: 0, rule });
  const value = dice.rollD6() + rule.dm;
  return Object.freeze({ throw: rule.min === null ? value : Math.max(rule.min, value), rule: null });
}

// The book's own code: "A5 F7 S2", herbivores "F1 A7 S4", special cases 0.
export function animalBehaviourCode(behaviour) {
  const a = `A${behaviour.attack.throw}`;
  const f = `F${behaviour.flee.throw}`;
  const s = `S${behaviour.speed}`;
  return behaviour.order === 'FA' ? `${f} ${a} ${s}` : `${a} ${f} ${s}`;
}

/**
 * pp.92-95 checklist 2C-2E: one animal entry for an encounter column, every
 * number rolled now and kept.
 */
export function generateAnimalTableEntry(dice, { category, terrain = 'clear', planetSize = 7, atmosphere = 6 } = {}) {
  requireDice(dice);
  if (!ANIMAL_CATEGORIES_1982.includes(category)) throw new RangeError(`unknown animal category: ${category}`);
  const terrainEntry = ANIMAL_TERRAIN_TYPES_1982[terrain];
  if (!terrainEntry) throw new RangeError(`unknown animal terrain: ${terrain}`);

  const typeEntry = ANIMAL_TYPES_1982[category][clamp(roll2D(dice) + terrainEntry.typeDM, 0, 13)];
  const quantity = typeEntry.quantityDice ? Math.max(1, sum(rollND(dice, typeEntry.quantityDice))) : 1;

  const attributeTotal = clamp(roll2D(dice) + animalAttributeDM({ planetSize, atmosphere }), 2, 12);
  const attribute = ANIMAL_ATTRIBUTES_1982[terrainEntry.attributeColumn][attributeTotal];
  const flies = attribute.attribute === 'flyer';

  const sizeDM = attribute.sizeDM + (flies ? 0 : terrainEntry.sizeDM) + animalPlanetSizeDM(planetSize);
  const size = throwOnSizeColumn(dice, ANIMAL_SIZES_1982, sizeDM).entry;
  const unconscious = Math.max(1, sum(rollND(dice, size.unconsciousDice)));
  const further = sum(rollND(dice, size.furtherDice));

  const weaponRow = ANIMAL_WEAPONS_1982[clamp(roll2D(dice) + ANIMAL_WEAPON_DMS_1982[category], 1, 20)];
  // p.93: a filter's wound is 1D per 50 kg or less, wound alteration ignored.
  const filter = typeEntry.type === 'filter';
  const weapons = weaponRow.map(({ key, dm }) => {
    const wound = fixedAnimalWound(dice, key, filter ? null : size.wounds);
    const name = getPersonalWeapon(key).name.toLowerCase();
    return Object.freeze({ key, dm, label: `${AS_WEAPONS.includes(key) ? 'as ' : ''}${name}${dm ? `+${dm}` : ''}`, wound: wound.total, woundGroups: wound.groups });
  });

  let armor = R('none');
  if (attribute.attribute !== 'flyer' && attribute.attribute !== 'triphibian') {
    armor = throwOnSizeColumn(dice, ANIMAL_ARMOR_1982, ANIMAL_ARMOR_DMS_1982[category]).entry;
  }

  const traits = ANIMAL_CHARACTERISTICS_1982[typeEntry.type];
  const speedRoll = dice.rollD6() + traits.speed.dm;
  const behaviour = {
    order: HERBIVORE_TYPES.includes(typeEntry.type) ? 'FA' : 'AF',
    attack: rollCharacteristic(dice, traits.attack),
    flee: rollCharacteristic(dice, traits.flee),
    speed: Math.max(traits.speed.min, speedRoll)
  };
  behaviour.code = animalBehaviourCode(behaviour);

  const specials = {};
  if (filter) specials.filter = Object.freeze({ woundDice: Math.max(1, Math.ceil(size.weightKg / 50)), attackThrow: 6, escapeThrow: 7, escapeHelperDM: 2, absorbsKg: size.weightKg * 2 });
  if (typeEntry.type === 'trapper' || typeEntry.type === 'siren') specials.trap = Object.freeze({ trapThrow: 5, escapeThrow: 9, escapeHelperDM: 1 });
  // p.93: "In rare cases (throw 11+), the lure will be universal."
  if (typeEntry.type === 'siren') specials.universalLure = roll2D(dice) >= 11;

  const dead = unconscious + further;
  return Object.freeze({
    category,
    type: typeEntry.type,
    quantity,
    attribute: attribute.attribute,
    name: animalDisplayName(typeEntry.type, attribute.attribute, quantity),
    weightKg: size.weightKg,
    hits: Object.freeze({ unconscious, further, dead, destroyed: dead * 2 }),
    woundAlteration: size.wounds,
    weapons: Object.freeze(weapons),
    armor,
    behaviour: Object.freeze(behaviour),
    specials: Object.freeze(specials)
  });
}

const ATTRIBUTE_ADJECTIVES = Object.freeze({ flyer: 'Flying', swimmer: 'Swimming', amphibian: 'Amphibious', triphibian: 'Triphibious' });
export function animalDisplayName(type, attribute = null, quantity = 1) {
  const noun = type.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('-');
  const plural = quantity > 1 ? `${noun}s` : noun;
  return attribute ? `${ATTRIBUTE_ADJECTIVES[attribute]} ${plural}` : plural;
}

/**
 * p.95 checklist item 2: one encounter table for one terrain of one world.
 * `format` is '2D' or '1D'; `column` overrides the suggested sequence.
 */
export function generateAnimalEncounterTable(dice, {
  terrain = 'clear',
  format = '2D',
  column: customColumn = null,
  planetSize = 7,
  atmosphere = 6,
  world = null
} = {}) {
  requireDice(dice);
  const sequence = customColumn ?? ANIMAL_ENCOUNTER_COLUMNS_1982[format];
  if (!sequence) throw new RangeError(`unknown encounter column format: ${format}`);
  const dies = Object.keys(sequence).map(Number);
  const oneDie = customColumn ? Math.min(...dies) >= 1 && Math.max(...dies) <= 6 && !dies.includes(12) : format === '1D';
  const rows = Object.entries(sequence).map(([die, category]) => {
    if (category === 'event') return Object.freeze({ die: Number(die), category, event: '' });
    return Object.freeze({ die: Number(die), category, animal: generateAnimalTableEntry(dice, { category, terrain, planetSize, atmosphere }) });
  });
  return Object.freeze({
    terrain,
    terrainLabel: ANIMAL_TERRAIN_TYPES_1982[terrain].label,
    format: customColumn ? 'custom' : format,
    dice: oneDie ? 1 : 2,
    world: world ? Object.freeze({ ...world }) : null,
    planetSize,
    atmosphere,
    rows: Object.freeze(rows)
  });
}

// p.91: twice a day, travelling and halted, 5+ on one die.
export const ANIMAL_ENCOUNTER_CHECK_1982 = 5;

// Which row of a table an encounter lands on: 2D or 1D by its format.
export function rollAnimalTableRow(dice, table, { dm = 0 } = {}) {
  requireDice(dice);
  const dies = table.rows.map((row) => row.die);
  const low = Math.min(...dies);
  const high = Math.max(...dies);
  const thrown = table.dice === 1 ? dice.rollD6() : roll2D(dice);
  const die = clamp(thrown + dm, low, high);
  return Object.freeze({ thrown, die, row: table.rows.find((row) => row.die === die) });
}

/**
 * p.95: throw to attack and to flee, in the animal's order (A F, herbivores
 * F A); a special case (coded 0) is a condition, not a throw. "Otherwise the
 * animal does nothing."
 */
export function resolveAnimalBehaviour(dice, entry, {
  surprise = false,
  surprised = false,
  canReach = true,
  animalCount = entry?.quantity ?? 1,
  preyCount = 1
} = {}) {
  requireDice(dice);
  const behaviour = entry?.behaviour;
  if (!behaviour) throw new TypeError('animal entry must carry its behaviour');
  const steps = [];
  const check = (which) => {
    const code = behaviour[which];
    if (code.rule) {
      const met = code.rule === 'if-possible' ? canReach
        : code.rule === 'if-surprise' ? surprise
        : code.rule === 'if-surprised' ? surprised
        : code.rule === 'if-more' ? animalCount > preyCount
        : false;
      steps.push(Object.freeze({ which, rule: code.rule, met }));
      return met;
    }
    const roll = roll2D(dice);
    const met = roll >= code.throw;
    steps.push(Object.freeze({ which, throw: code.throw, roll, met }));
    return met;
  };
  const order = behaviour.order === 'FA' ? ['flee', 'attack'] : ['attack', 'flee'];
  for (const which of order) {
    if (check(which)) return Object.freeze({ action: which, speed: behaviour.speed, steps: Object.freeze(steps) });
  }
  return Object.freeze({ action: 'nothing', speed: behaviour.speed, steps: Object.freeze(steps) });
}

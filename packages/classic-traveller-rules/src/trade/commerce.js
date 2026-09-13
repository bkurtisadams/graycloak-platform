import { requireDice } from '../dice.js';
import { deriveTradeClassifications } from '../worlds/trade-classifications.js';

export const FREIGHT_RATE_PER_TON_CR = 1000;
export const PASSAGE_FARES_CR = Object.freeze({ high: 10000, middle: 8000, low: 1000 });
export const STATEROOM_LIFE_SUPPORT_PER_TRIP_CR = 2000;
export const LOW_BERTH_LIFE_SUPPORT_PER_USE_CR = 100;

// Book 2 p.7 passenger table, 1977 printing. Indexed by the ORIGINATING
// world's population for the dice thrown, and by the DESTINATION world's
// population for the die modifier applied to each class. Populations above 12
// are treated as 12. Populations 0 and 1 generate no passengers at all.
const PASSENGER_ORIGIN_TABLE = Object.freeze([
  { high: null, middle: null, low: null },      // 0
  { high: null, middle: null, low: null },      // 1
  { high: '1D-1D', middle: '1D-1D', low: '3D-1D' },
  { high: '3D-2D', middle: '2D-2D', low: '3D-1D' },
  { high: '3D-3D', middle: '3D-3D', low: '4D-1D' },
  { high: '3D-2D', middle: '3D-2D', low: '4D-1D' },
  { high: '3D-2D', middle: '3D-2D', low: '3D' },
  { high: '3D-2D', middle: '3D-2D', low: '3D' },
  { high: '2D-1D', middle: '3D-2D', low: '4D' },
  { high: '2D-1D', middle: '2D-1D', low: '4D' },
  { high: '2D-1D', middle: '2D-1D', low: '4D' },
  { high: '2D', middle: '2D-1D', low: '5D' },
  { high: '2D', middle: '2D', low: '6D' }
]);

const PASSENGER_DESTINATION_DMS = Object.freeze([
  { high: 0, middle: 0, low: 0 },               // 0
  { high: 0, middle: 0, low: 0 },               // 1
  { high: -1, middle: -2, low: -4 },
  { high: -1, middle: -1, low: -3 },
  { high: -1, middle: -1, low: -2 },
  { high: 0, middle: -1, low: -1 },
  { high: 0, middle: 0, low: -1 },
  { high: 0, middle: 0, low: 0 },
  { high: 1, middle: 0, low: 0 },
  { high: 1, middle: 1, low: 0 },
  { high: 1, middle: 1, low: 2 },
  { high: 0, middle: 1, low: 4 },
  { high: 0, middle: 0, low: 0 }
]);

// Book 2 p.7 cargo: "roll (for each such world) a number of dice equal to the
// population number of the destination. Each die represents one shipment,
// expressed in multiples of 5 tons." There are no lot categories and no
// modifiers in the 1977 rules.
export const FREIGHT_SHIPMENT_TONS_PER_PIP = 5;

const ACTUAL_VALUE_PERCENT = Object.freeze({
  2: 40, 3: 50, 4: 70, 5: 80, 6: 90, 7: 100, 8: 110,
  9: 120, 10: 130, 11: 150, 12: 170, 13: 200, 14: 300, 15: 400
});

const CLASS_CODE_TO_KEY = Object.freeze({
  A: 'agricultural', NA: 'nonAgricultural', I: 'industrial', NI: 'nonIndustrial', R: 'rich', P: 'poor'
});

function qty(dice, multiplier = 1) { return Object.freeze({ dice, multiplier }); }
function mods(entries = {}) { return Object.freeze({ ...entries }); }
function good(code, name, basePriceCr, purchaseDMs, resaleDMs, quantity, unit = 'tons') {
  return Object.freeze({ code, name, basePriceCr, purchaseDMs: mods(purchaseDMs), resaleDMs: mods(resaleDMs), quantity, unit });
}

export // Book 2 p.43 trade and speculation table. The four base prices corrected in
// rules 0.28.0 were checked against the 1977 printing and cross-checked
// against Book 3's equipment prices, which state the same figures: an
// air/raft at CR 6,000,000 (B3 p.16), an ATV at CR 3,000,000 and an AFV at
// CR 7,000,000 (B3 p.16). The engine had them at a tenth and a hundredth.
const TRADE_GOODS = Object.freeze({
  11: good(11, 'Textiles', 3000, { A: -7, NA: -5, NI: -3 }, { A: -6, NA: 1, R: 3 }, qty(3, 5)),
  12: good(12, 'Polymers', 7000, { I: -2, R: -3, P: 2 }, { I: -2, R: 3 }, qty(4, 5)),
  13: good(13, 'Liquor', 10000, { A: -4 }, { A: -3, I: 1, R: 2 }, qty(1, 5)),
  14: good(14, 'Wood', 1000, { A: -6 }, { A: -6, I: 1, R: 2 }, qty(2, 10)),
  15: good(15, 'Crystals', 20000, { NA: -3, I: 4 }, { NA: -3, I: 3, R: 3 }, qty(1)),
  16: good(16, 'Radioactives', 1000000, { I: 7, NI: -3, R: 5 }, { I: 6, NI: -3, R: -4 }, qty(1)),
  21: good(21, 'Steel', 500, { I: -2, R: -1, P: 1 }, { I: -2, R: -1, P: 3 }, qty(4, 10)),
  22: good(22, 'Copper', 2000, { I: -3, R: -2, P: 1 }, { I: -3, R: -1 }, qty(2, 10)),
  23: good(23, 'Aluminum', 1000, { I: -3, R: -2, P: 1 }, { I: -3, NI: 4, R: -1 }, qty(5, 10)),
  24: good(24, 'Tin', 9000, { I: -3, R: -2, P: 1 }, { I: -3, R: -1 }, qty(3, 10)),
  25: good(25, 'Silver', 70000, { I: 5, R: -1, P: 2 }, { I: 5, R: -1 }, qty(1, 5)),
  26: good(26, 'Special Alloys', 200000, { I: -3, NI: 5, R: -2 }, { I: -3, NI: 4, R: -1 }, qty(1)),
  31: good(31, 'Petrochemicals', 10000, { NA: -4, I: 1, NI: -5 }, { NA: -4, I: 3, NI: -5 }, qty(6, 5)),
  32: good(32, 'Grain', 300, { A: -2, NA: 1, I: 2 }, { A: -2 }, qty(8, 5)),
  33: good(33, 'Meat', 1500, { A: -2, NA: 2, I: 3 }, { A: -2, I: 2, P: 1 }, qty(4, 5)),
  34: good(34, 'Spices', 6000, { A: -2, NA: 3, I: 2 }, { A: -2, R: 2, P: 3 }, qty(1, 5)),
  35: good(35, 'Fruit', 1000, { A: -3, NA: 1, I: 2 }, { A: -2, I: 3, P: 2 }, qty(2, 5)),
  36: good(36, 'Pharmaceuticals', 100000, { NA: -3, I: 4, P: 3 }, { NA: -3, I: 5, R: 4 }, qty(1)),
  41: good(41, 'Gems', 1000000, { I: 4, NI: -8, P: -3 }, { I: 4, NI: -2, R: 8 }, qty(1)),
  42: good(42, 'Firearms', 30000, { I: -3, R: -2, P: 3 }, { I: -2, R: -1, P: 3 }, qty(2)),
  43: good(43, 'Ammunition', 30000, { I: -3, R: -2, P: 3 }, { I: -2, R: -1, P: 3 }, qty(2)),
  44: good(44, 'Blades', 10000, { I: -3, R: -2, P: 3 }, { I: -2, R: -1, P: 3 }, qty(2)),
  45: good(45, 'Tools', 10000, { I: -3, R: -2, P: 3 }, { I: -2, R: -1, P: 3 }, qty(2)),
  46: good(46, 'Body Armor', 50000, { I: -1, R: -3, P: 3 }, { I: -2, R: 1, P: 4 }, qty(2)),
  51: good(51, 'Aircraft', 1000000, { I: -4, R: -3 }, { NI: 2, P: 1 }, qty(1), 'each'),
  52: good(52, 'Air/Raft', 6000000, { I: -3, R: -2 }, { NI: 2, P: 1 }, qty(1), 'each'),
  53: good(53, 'Computers', 10000000, { I: -2, R: -2 }, { NI: 2, P: 1, A: -3 }, qty(1), 'each'),
  54: good(54, 'All Terrain Vehicles', 3000000, { I: -2, R: -2 }, { NI: 2, P: 1, A: 1 }, qty(1), 'each'),
  55: good(55, 'Armored Vehicles', 7000000, { I: -5, R: -2, P: 4 }, { NA: -2, A: 2, R: 1 }, qty(1), 'each'),
  56: good(56, 'Farm Machinery', 150000, { I: -5, R: -2 }, { A: 5, NA: -8, P: 1 }, qty(1), 'each'),
  61: good(61, 'Electronics Parts', 100000, { I: -4, R: -3 }, { NI: 2, P: 1 }, qty(1, 5)),
  62: good(62, 'Mechanical Parts', 75000, { I: -5, R: -3 }, { NI: 3, A: 2 }, qty(1, 5)),
  63: good(63, 'Cybernetic Parts', 250000, { I: -4, R: -1 }, { NI: 4, A: 1, NA: 2 }, qty(1, 5)),
  64: good(64, 'Computer Parts', 150000, { I: -5, R: -3 }, { NI: 3, A: 1, NA: 2 }, qty(1, 5)),
  65: good(65, 'Machine Tools', 750000, { I: -5, R: -4 }, { NI: 3, A: 1, NA: 2 }, qty(1, 5)),
  66: good(66, 'Vacc Suits', 400000, { NA: -5, I: -3, R: -1 }, { NA: -1, NI: 2, P: 1 }, qty(1, 5))
});

function assertProfile(profile, label) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) throw new TypeError(`${label} must be a world profile object`);
  for (const key of ['population', 'techLevel']) {
    if (!Number.isInteger(profile[key]) || profile[key] < 0) throw new TypeError(`${label}.${key} must be a non-negative integer`);
  }
}

function rollExpression(dice, expression) {
  requireDice(dice);
  if (!expression) return 0;
  const match = /^(\d+)D(?:-(\d+)D|([+-]\d+))?$/.exec(expression);
  if (!match) throw new RangeError(`unsupported dice expression: ${expression}`);
  const positiveDice = Number(match[1]);
  const negativeDice = match[2] ? Number(match[2]) : 0;
  const modifier = match[3] ? Number(match[3]) : 0;
  let total = modifier;
  for (let i = 0; i < positiveDice; i += 1) total += dice.rollD6();
  for (let i = 0; i < negativeDice; i += 1) total -= dice.rollD6();
  return Math.max(0, total);
}

// Book 2 p.7: "Treat worlds of population level greater than 12 as level 12."
function populationRow(population) {
  return Math.max(0, Math.min(12, Math.floor(population)));
}


export function generatePassengerDemand(originProfile, destinationProfile, { destinationTravelZone = 'none', dice } = {}) {
  assertProfile(originProfile, 'originProfile');
  assertProfile(destinationProfile, 'destinationProfile');
  requireDice(dice);
  const origin = PASSENGER_ORIGIN_TABLE[populationRow(originProfile.population)];
  const dms = PASSENGER_DESTINATION_DMS[populationRow(destinationProfile.population)];
  // Travel zones are not a 1977 Book 2 rule; they are a Graycloak overlay that
  // suppresses traffic to a world the referee has flagged.
  const red = destinationTravelZone === 'red';
  const resolve = (expression, dm) => (expression ? Math.max(0, rollExpression(dice, expression) + dm) : 0);
  const demand = {
    high: red ? 0 : resolve(origin.high, dms.high),
    middle: red ? 0 : resolve(origin.middle, dms.middle),
    low: red ? 0 : resolve(origin.low, dms.low)
  };
  return Object.freeze({ ...demand, dm: dms, destinationTravelZone });
}

export function generateFreightOffers(originProfile, destinationProfile, {
  destinationTravelZone = 'none', dice, idPrefix = 'freight'
} = {}) {
  assertProfile(originProfile, 'originProfile');
  assertProfile(destinationProfile, 'destinationProfile');
  requireDice(dice);
  if (destinationTravelZone === 'red') {
    return Object.freeze({ shipments: 0, offers: Object.freeze([]), dm: null });
  }
  // One die per point of the DESTINATION world's population; each die is one
  // shipment of that many multiples of five tons. A shipment may not be broken
  // down, which is what makes hold size matter.
  const shipments = Math.max(0, Math.min(12, Math.floor(destinationProfile.population)));
  const offers = [];
  for (let index = 0; index < shipments; index += 1) {
    const tons = dice.rollD6() * FREIGHT_SHIPMENT_TONS_PER_PIP;
    offers.push(Object.freeze({
      id: `${idPrefix}-${index + 1}`,
      tons,
      revenueCr: tons * FREIGHT_RATE_PER_TON_CR
    }));
  }
  return Object.freeze({ shipments, offers: Object.freeze(offers), dm: null });
}

function worldTypeDM(profile, table) {
  const classifications = new Set(deriveTradeClassifications(profile));
  let dm = 0;
  for (const [code, value] of Object.entries(table)) {
    const key = CLASS_CODE_TO_KEY[code];
    if (key && classifications.has(key)) dm += value;
  }
  return dm;
}

function rollQuantity(dice, quantity) {
  let total = 0;
  for (let i = 0; i < quantity.dice; i += 1) total += dice.rollD6();
  return total * quantity.multiplier;
}

export function actualValuePercentage(modifiedRoll) {
  if (!Number.isFinite(modifiedRoll)) throw new TypeError('modifiedRoll must be a number');
  // The printed table spans 2 through 15. Values beyond its endpoints use the
  // nearest printed result so every legal DM combination resolves on the table.
  const bounded = Math.max(2, Math.min(15, Math.trunc(modifiedRoll)));
  return ACTUAL_VALUE_PERCENT[bounded];
}

export function generateSpeculativeTradeOffer(originProfile, { dice } = {}) {
  assertProfile(originProfile, 'originProfile');
  requireDice(dice);
  let first = dice.rollD6();
  const second = dice.rollD6();
  if (originProfile.population >= 9) first += 1;
  else if (originProfile.population <= 5) first -= 1;
  first = Math.max(1, Math.min(6, first));
  const code = first * 10 + second;
  const tradeGood = TRADE_GOODS[code];
  if (!tradeGood) throw new RangeError(`no trade good for roll ${code}`);
  const quantityAvailable = rollQuantity(dice, tradeGood.quantity);
  const purchaseDM = worldTypeDM(originProfile, tradeGood.purchaseDMs);
  const valueRoll = dice.roll2D6();
  const modifiedValueRoll = valueRoll.total + purchaseDM;
  const percentage = actualValuePercentage(modifiedValueRoll);
  const pricePerUnitCr = Math.round(tradeGood.basePriceCr * percentage / 100);
  return Object.freeze({
    code,
    name: tradeGood.name,
    unit: tradeGood.unit,
    basePriceCr: tradeGood.basePriceCr,
    quantityAvailable,
    purchaseDM,
    valueRoll: Object.freeze([...valueRoll.dice]),
    valueRollTotal: valueRoll.total,
    modifiedValueRoll,
    percentage,
    pricePerUnitCr
  });
}

export function calculateSpeculativePurchaseCost(offer, quantity) {
  if (!offer || typeof offer !== 'object') throw new TypeError('offer must be an object');
  if (!Number.isInteger(quantity) || quantity < 1) throw new TypeError('quantity must be a positive integer');
  if (!Number.isInteger(offer.quantityAvailable) || quantity > offer.quantityAvailable) throw new RangeError('quantity exceeds available lot');
  if (!Number.isInteger(offer.pricePerUnitCr) || offer.pricePerUnitCr < 0) throw new TypeError('offer pricePerUnitCr must be a non-negative integer');
  const subtotalCr = offer.pricePerUnitCr * quantity;
  const handlingFeeCr = quantity < offer.quantityAvailable ? Math.round(subtotalCr * 0.01) : 0;
  return Object.freeze({ subtotalCr, handlingFeeCr, totalCr: subtotalCr + handlingFeeCr, partialPurchase: quantity < offer.quantityAvailable });
}

export function quoteSpeculativeResale(tradeGoodCode, quantity, destinationProfile, {
  dice,
  characterSkillDM = 0,
  brokerDM = 0
} = {}) {
  assertProfile(destinationProfile, 'destinationProfile');
  requireDice(dice);
  const tradeGood = TRADE_GOODS[tradeGoodCode];
  if (!tradeGood) throw new RangeError(`unknown trade good code: ${tradeGoodCode}`);
  if (!Number.isInteger(quantity) || quantity < 1) throw new TypeError('quantity must be a positive integer');
  if (!Number.isInteger(characterSkillDM) || characterSkillDM < 0) throw new TypeError('characterSkillDM must be a non-negative integer');
  if (!Number.isInteger(brokerDM) || brokerDM < 0 || brokerDM > 4) throw new TypeError('brokerDM must be an integer from 0 to 4');
  const worldDM = worldTypeDM(destinationProfile, tradeGood.resaleDMs);
  const valueRoll = dice.roll2D6();
  const modifiedValueRoll = valueRoll.total + worldDM + characterSkillDM + brokerDM;
  const percentage = actualValuePercentage(modifiedValueRoll);
  const grossPerUnitCr = Math.round(tradeGood.basePriceCr * percentage / 100);
  const grossCr = grossPerUnitCr * quantity;
  const brokerCommissionCr = brokerDM > 0 ? Math.round(grossCr * brokerDM * 0.05) : 0;
  return Object.freeze({
    code: tradeGood.code,
    name: tradeGood.name,
    quantity,
    unit: tradeGood.unit,
    valueRoll: Object.freeze([...valueRoll.dice]),
    valueRollTotal: valueRoll.total,
    worldDM,
    characterSkillDM,
    brokerDM,
    modifiedValueRoll,
    percentage,
    grossPerUnitCr,
    grossCr,
    brokerCommissionCr,
    netCr: grossCr - brokerCommissionCr
  });
}

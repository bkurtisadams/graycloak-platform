// adnd-purse.js v1.0.0 - 2026-06-05 (ported from AMMOG purse.js, browser global)
// AD&D 1e monetary system: cp, sp, ep, gp, pp
// 200 cp = 20 sp = 2 ep = 1 gp = 1/5 pp

const COIN_TYPES = ['cp', 'sp', 'ep', 'gp', 'pp'];

// Value of each coin type in copper pieces
const CP_VALUE = { cp: 1, sp: 10, ep: 100, gp: 200, pp: 1000 };

// Display colors for UI
const COIN_COLORS = { cp: '#c84', sp: '#ccc', ep: '#8cf', gp: '#d4a017', pp: '#e8e8ff' };
const COIN_NAMES = { cp: 'Copper', sp: 'Silver', ep: 'Electrum', gp: 'Gold', pp: 'Platinum' };
const COIN_ABBREV = { cp: 'CP', sp: 'SP', ep: 'EP', gp: 'GP', pp: 'PP' };

function empty() {
  return { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
}

function clone(purse) {
  return { cp: purse.cp || 0, sp: purse.sp || 0, ep: purse.ep || 0, gp: purse.gp || 0, pp: purse.pp || 0 };
}

function normalize(purse) {
  const p = clone(purse);
  for (const t of COIN_TYPES) p[t] = Math.max(0, Math.floor(p[t] || 0));
  return p;
}

// Total value in copper pieces
function toCP(purse) {
  let total = 0;
  for (const t of COIN_TYPES) total += (purse[t] || 0) * CP_VALUE[t];
  return total;
}

// Total value in gold pieces (may be fractional)
function toGP(purse) {
  return toCP(purse) / 200;
}

// Can the purse afford a price denominated in GP?
function canAffordGP(purse, gpPrice) {
  return toCP(purse) >= Math.ceil(gpPrice * 200);
}

// Deduct a GP-denominated price from purse. Pays with largest coins first.
// Returns { success, purse, change } or { success: false }
function deductGP(purse, gpPrice) {
  const costCP = Math.ceil(gpPrice * 200);
  const totalCP = toCP(purse);
  if (totalCP < costCP) return { success: false };

  const p = clone(purse);
  let remaining = costCP;

  // Pay from largest denomination down (spend big coins, get change)
  for (let i = COIN_TYPES.length - 1; i >= 0; i--) {
    const t = COIN_TYPES[i];
    if (remaining <= 0) break;
    const val = CP_VALUE[t];
    const coinsNeeded = Math.min(p[t], Math.ceil(remaining / val));
    const paid = coinsNeeded * val;
    p[t] -= coinsNeeded;
    remaining -= paid;
  }

  // If overpaid (remaining < 0), give change in smallest coins possible
  if (remaining < 0) {
    let change = -remaining;
    for (const t of COIN_TYPES) {
      if (change <= 0) break;
      const val = CP_VALUE[t];
      const coins = Math.floor(change / val);
      if (coins > 0) {
        p[t] += coins;
        change -= coins * val;
      }
    }
  }

  return { success: true, purse: normalize(p) };
}

// Add coins of a specific type
function addCoins(purse, type, amount) {
  const p = clone(purse);
  if (CP_VALUE[type] !== undefined) p[type] += Math.max(0, Math.floor(amount));
  return normalize(p);
}

// Add a mixed set of coins: { cp: 10, sp: 5, gp: 2 }
function addMixed(purse, coins) {
  const p = clone(purse);
  for (const t of COIN_TYPES) {
    if (coins[t]) p[t] += Math.max(0, Math.floor(coins[t]));
  }
  return normalize(p);
}

// Convert all coins to GP equivalent (for money changer, with fee)
// Returns purse with only gp/pp, minus fee percentage
function changeToGP(purse, feePercent) {
  const totalCP = toCP(purse);
  const afterFee = Math.floor(totalCP * (1 - feePercent / 100));
  const pp = Math.floor(afterFee / 1000);
  const gp = Math.floor((afterFee - pp * 1000) / 200);
  const remainder = afterFee - pp * 1000 - gp * 200;
  // Remainder stays as ep/sp/cp
  const ep = Math.floor(remainder / 100);
  const sp = Math.floor((remainder - ep * 100) / 10);
  const cp = remainder - ep * 100 - sp * 10;
  return normalize({ cp, sp, ep, gp, pp });
}

// Break a larger denomination into smaller coins (money changer, with fee)
// e.g. break 1 gp into sp: gives 20 sp minus fee
function breakCoins(purse, fromType, fromAmount, toType, feePercent) {
  const p = clone(purse);
  if (p[fromType] < fromAmount) return { success: false };
  const valueCP = fromAmount * CP_VALUE[fromType];
  const afterFee = Math.floor(valueCP * (1 - feePercent / 100));
  const toCoins = Math.floor(afterFee / CP_VALUE[toType]);
  if (toCoins <= 0) return { success: false };
  p[fromType] -= fromAmount;
  p[toType] += toCoins;
  return { success: true, purse: normalize(p), received: toCoins };
}

// Format purse for display — only show non-zero denominations
function format(purse) {
  const parts = [];
  if (purse.pp > 0) parts.push(`${purse.pp} PP`);
  if (purse.gp > 0) parts.push(`${purse.gp} GP`);
  if (purse.ep > 0) parts.push(`${purse.ep} EP`);
  if (purse.sp > 0) parts.push(`${purse.sp} SP`);
  if (purse.cp > 0) parts.push(`${purse.cp} CP`);
  return parts.length > 0 ? parts.join(', ') : '0 GP';
}

// Short format: "30 GP" or "2 PP 15 GP 3 SP"
function formatShort(purse) {
  return format(purse);
}

// Total coin count (for encumbrance — each coin weighs 1/10 lb, 10 coins = 1 lb)
function totalCoins(purse) {
  let total = 0;
  for (const t of COIN_TYPES) total += (purse[t] || 0);
  return total;
}

// Weight in lbs (10 coins = 1 lb per PHB)
function weight(purse) {
  return totalCoins(purse) / 10;
}

// From old gold-only format
function fromGold(goldAmount) {
  return normalize({ cp: 0, sp: 0, ep: 0, gp: goldAmount || 0, pp: 0 });
}

// "Equivalent GP" — for display/comparison, rounded
function equivGP(purse) {
  return Math.floor(toCP(purse) / 200);
}

const ADNDPurse = {
  COIN_TYPES, CP_VALUE, COIN_COLORS, COIN_NAMES, COIN_ABBREV,
  empty, clone, normalize, toCP, toGP, canAffordGP, deductGP,
  addCoins, addMixed, changeToGP, breakCoins,
  format, formatShort, totalCoins, weight, fromGold, equivGP,
};
if (typeof module !== 'undefined' && module.exports) module.exports = ADNDPurse;
if (typeof window !== 'undefined') window.ADNDPurse = ADNDPurse;

/**
 * OD&D — inventory and loot
 * odd-chainmail-rules · src/inventory.mjs
 *
 * Pure. An inventory is { coins: {cp, sp, gp}, items: [...] }. Weights are in
 * coins (Book I p.15: a coin weighs 1, a gem 1, jewellery 20, a potion 30, a
 * scroll 20, a wand 100, a staff 300). Gems and jewellery carry a gp value;
 * treasure counts for experience only once carried out (Book I p.18).
 */
import { encumbranceFor } from "./encumbrance.mjs";

export function emptyInventory() { return { coins: { cp: 0, sp: 0, gp: 0 }, items: [] }; }

/** Turn a rolled treasure (treasure.mjs) or carried coins into an inventory. */
export function inventoryFromTreasure(t = {}) {
  const inv = emptyInventory();
  Object.assign(inv.coins, { cp: t.coins?.cp ?? 0, sp: t.coins?.sp ?? 0, gp: t.coins?.gp ?? 0 });
  for (const v of t.gems ?? []) inv.items.push({ kind: "gem", name: `Gem (${v} gp)`, unidName: "a gem", identified: true, weight: 1, valueGp: v });
  for (const v of t.jewelry ?? []) inv.items.push({ kind: "jewelry", name: `Jewellery (${v} gp)`, unidName: "a piece of jewellery", identified: true, weight: 20, valueGp: v });
  for (const it of t.items ?? []) inv.items.push({ ...it });
  return inv;
}

export const coinCount = (c = {}) => (c.cp ?? 0) + (c.sp ?? 0) + (c.gp ?? 0);
export function inventoryWeight(inv) {
  return coinCount(inv.coins) + inv.items.reduce((a, it) => a + (it.weight ?? 0), 0);
}
/** Gold-piece value that counts toward experience: coins, gems and jewellery. */
export function treasureXpValue(inv) {
  const c = inv.coins; const coin = (c.gp ?? 0) + (c.sp ?? 0) / 10 + (c.cp ?? 0) / 50;
  return coin + inv.items.reduce((a, it) => a + (it.valueGp ?? 0), 0);
}
/** Move rate with this inventory on top of a base load (armour, weapons, gear). */
export function moveWithInventory(baseLoad, inv) {
  return encumbranceFor(baseLoad + inventoryWeight(inv));
}
export function transferItem(from, to, index) {
  const [it] = from.items.splice(index, 1);
  if (it) to.items.push(it);
  return it ?? null;
}
export function transferCoins(from, to, coins) {
  for (const k of ["cp", "sp", "gp"]) {
    const n = Math.max(0, Math.min(coins[k] ?? 0, from.coins[k] ?? 0));
    from.coins[k] -= n; to.coins[k] = (to.coins[k] ?? 0) + n;
  }
}
export const displayName = (it) => (it.identified ? it.name : it.unidName);
export const isEmpty = (inv) => coinCount(inv.coins) === 0 && inv.items.length === 0;

/* ---------------------------------------------------------------- tests */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };
  const t = { coins: { cp: 0, sp: 1000, gp: 300 }, gems: [100, 50], jewelry: [1200], items: [{ kind: "potion", name: "Potion of Healing", unidName: "a potion", identified: false, weight: 30 }] };
  const inv = inventoryFromTreasure(t);
  ok(inventoryWeight(inv) === 1300 + 2 + 20 + 30, "weight: coins + gems + jewellery + potion");
  ok(treasureXpValue(inv) === 300 + 100 + 150 + 1200, "xp value: coins, gems, jewellery; not magic");
  ok(displayName(inv.items[3]) === "a potion", "unidentified name shown");
  const me = emptyInventory();
  transferCoins(inv, me, { gp: 300, sp: 5000 });
  ok(me.coins.gp === 300 && me.coins.sp === 1000 && inv.coins.sp === 0, "transfer caps at what is there");
  ok(transferItem(inv, me, 0).kind === "gem" && me.items.length === 1, "transfer an item");
  ok(moveWithInventory(780, emptyInventory()).move === 9 && moveWithInventory(780, me).move === 3, "1,301 more coins of weight drop chain-and-shield from 9\" to half speed 3\"");
  ok(isEmpty(emptyInventory()) && !isEmpty(me), "isEmpty");
  console.log(`inventory.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

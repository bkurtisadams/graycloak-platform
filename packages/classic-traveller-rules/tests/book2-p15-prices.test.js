// Book 2 p.15, as printed: the prices a ship's equipment carries. Pinned to the
// book's own figures so a unit slip (Cr for MCr) cannot enter unseen. Kurt,
// Nov 2026: an Air/Raft resale lot read Cr 7,200,000 each, which looked a
// thousand times too high; the book prices it at 6, in millions of credits.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SHIP_VEHICLES, TURRET_WEAPONS, STREAMLINING_PRICE_MCR_PER_100_TONS, USED_TURRET_RESALE_RATE, COMPUTER_TRADE_IN_RATE
} from '../index.js';

test('Book 2 p.15: SHIP\u2019S VEHICLES, tons and price in millions of credits, row by row', () => {
  const printed = [
    ['atv', 'ATV', 10, 3],
    ['air-raft', 'Air/Raft', 4, 6],
    ['life-boat', 'Life Boat', 20, 14],
    ['ships-boat', "Ship's Boat", 30, 16],
    ['pinnace', 'Pinnace', 40, 20],
    ['cutter', 'Cutter', 50, 28],
    ['shuttle', 'Shuttle', 95, 33]
  ];
  assert.equal(Object.keys(SHIP_VEHICLES).length, printed.length, 'no row more or fewer than the book\u2019s');
  for (const [key, label, tons, priceMCr] of printed) {
    assert.deepEqual({ label: SHIP_VEHICLES[key].label, tons: SHIP_VEHICLES[key].tons, priceMCr: SHIP_VEHICLES[key].priceMCr }, { label, tons, priceMCr }, key);
  }
});

test('Book 2 p.15: weapons, atmospheric streamlining, and the 25% trade-ins', () => {
  assert.equal(TURRET_WEAPONS['pulse-laser'].priceMCr, 0.5, 'Cr 500,000');
  assert.equal(TURRET_WEAPONS['beam-laser'].priceMCr, 1, 'Cr 1,000,000');
  assert.equal(TURRET_WEAPONS['missile-launcher'].priceMCr, 0.75, 'Cr 750,000');
  assert.equal(TURRET_WEAPONS.sandcaster.priceMCr, 0.25, 'Cr 250,000 each');
  assert.equal(STREAMLINING_PRICE_MCR_PER_100_TONS, 1, 'Cr 1,000,000 per 100 tons of hull');
  assert.equal(USED_TURRET_RESALE_RATE, 0.25, 'used turrets sell for 25%');
  assert.equal(COMPUTER_TRADE_IN_RATE, 0.25, 'an old computer trades in at 25%');
});

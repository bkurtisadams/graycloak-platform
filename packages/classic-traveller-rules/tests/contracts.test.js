import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  CHARTER_BLOCK_DAYS,
  PRIVATE_MESSAGE_THROW,
  calculateShipCharterPrice,
  calculateStarshipCharterPrice,
  createTypeSScoutReserveShipForCharacter,
  importCharacterDocument,
  privateMessageAvailable,
  privateMessageHonorarium
} from '../index.js';

const here = path.dirname(fileURLToPath(import.meta.url));

async function typeS() {
  const character = importCharacterDocument(await readFile(path.join(here, 'fixtures/Hawkeye-v0.6.character.json'), 'utf8'));
  return createTypeSScoutReserveShipForCharacter(character).ship;
}

test('Book 2 starship charter price uses two-week blocks and revenue-producing capacity rates', () => {
  const quote = calculateStarshipCharterPrice({ cargoTons: 3, highPassageBerths: 3, lowPassageBerths: 0 });
  assert.equal(CHARTER_BLOCK_DAYS, 14);
  assert.equal(quote.cargoCr, 2700);
  assert.equal(quote.highPassageCr, 27000);
  assert.equal(quote.perBlockCr, 29700);
  assert.equal(quote.totalCr, 29700);
});

test('Type S charter quote leaves its one crew stateroom out of passenger revenue capacity', async () => {
  const quote = calculateShipCharterPrice(await typeS());
  assert.equal(quote.cargoTons, 3);
  assert.equal(quote.highPassageBerths, 3);
  assert.equal(quote.lowPassageBerths, 0);
  assert.equal(quote.totalCr, 29700);
});

test('Book 2 private-message check is 9+ and honorarium helper stays in Cr20-Cr120 range', () => {
  const dice = {
    values: [4, 5, 6, 6],
    roll2D6() {
      const dice = this.values.splice(0, 2);
      return { dice, total: dice[0] + dice[1] };
    }
  };
  const availability = privateMessageAvailable(dice);
  assert.equal(PRIVATE_MESSAGE_THROW, 9);
  assert.equal(availability.available, true);
  const honorarium = privateMessageHonorarium(dice);
  assert.equal(honorarium.amountCr, 120);
});

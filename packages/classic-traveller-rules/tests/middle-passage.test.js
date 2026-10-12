import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  importCharacterDocument,
  createTypeSScoutReserveShipForCharacter,
  assignShipCrew,
  bookPassenger,
  availablePassengerCapacity,
  highPassageRoom,
  bumpableMiddlePassengers,
  standbyMiddleCapacity,
  bumpMiddlePassenger
} from '../index.js';

const here = path.dirname(fileURLToPath(import.meta.url));

async function shipWithSteward() {
  const character = importCharacterDocument(await readFile(path.join(here, 'fixtures/Hawkeye-v0.6.character.json'), 'utf8'));
  const { ship } = createTypeSScoutReserveShipForCharacter(character);
  return assignShipCrew(ship, { role: 'steward', characterId: character.identity.id, characterName: character.identity.name });
}

const middle = (ship, id, origin = 'calder') => bookPassenger(ship, { id, passageClass: 'middle', originSystemId: origin, destinationSystemId: 'aster' });

test('Book 2 p.2: middle passage is standby — staterooms are held for high passengers waiting', async () => {
  const ship = await shipWithSteward();
  assert.equal(availablePassengerCapacity(ship, 'middle'), 3);
  assert.equal(highPassageRoom(ship), 8);
  assert.equal(standbyMiddleCapacity(ship, { highWaiting: 0 }), 3);
  assert.equal(standbyMiddleCapacity(ship, { highWaiting: 2 }), 1);
  assert.equal(standbyMiddleCapacity(ship, { highWaiting: 9 }), 0);
});

test('Book 2 p.2: with no steward no high passage can be sold, so nothing is held', async () => {
  const character = importCharacterDocument(await readFile(path.join(here, 'fixtures/Hawkeye-v0.6.character.json'), 'utf8'));
  const { ship } = createTypeSScoutReserveShipForCharacter(character);
  assert.equal(highPassageRoom(ship), 0);
  assert.equal(standbyMiddleCapacity(ship, { highWaiting: 5 }), 3);
});

test('Book 2 p.2: a late high passenger bumps the last middle booked at that port', async () => {
  let ship = await shipWithSteward();
  ship = middle(ship, 'm1');
  ship = middle(ship, 'm2');
  ship = middle(ship, 'm-elsewhere', 'orison');
  assert.equal(availablePassengerCapacity(ship, 'high'), 0);
  assert.deepEqual(bumpableMiddlePassengers(ship, 'calder').map((entry) => entry.id), ['m1', 'm2']);
  const result = bumpMiddlePassenger(ship, { originSystemId: 'calder' });
  assert.equal(result.bumped.id, 'm2');
  assert.equal(result.ship.state.passengerManifest.some((entry) => entry.id === 'm2'), false);
  const booked = bookPassenger(result.ship, { id: 'h1', passageClass: 'high', originSystemId: 'calder', destinationSystemId: 'aster' });
  assert.deepEqual(booked.state.passengerManifest.map((entry) => entry.id), ['m1', 'm-elsewhere', 'h1']);
});

test('Book 2 p.2: there is nobody to bump without a middle booked at the port', async () => {
  const ship = await shipWithSteward();
  assert.throws(() => bumpMiddlePassenger(ship, { originSystemId: 'calder' }), /no middle passenger booked at calder/);
});

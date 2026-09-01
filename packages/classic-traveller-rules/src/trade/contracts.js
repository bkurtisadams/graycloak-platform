import { assertValidShipDocument } from '../starships/ship-document.js';

export const CHARTER_BLOCK_DAYS = 14;
export const CHARTER_CARGO_RATE_PER_TON_CR = 900;
export const CHARTER_HIGH_BERTH_RATE_CR = 9000;
export const CHARTER_LOW_BERTH_RATE_CR = 900;
export const PRIVATE_MESSAGE_THROW = 9;

function nonNegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) throw new TypeError(`${label} must be a non-negative integer`);
  return value;
}

export function calculateStarshipCharterPrice({
  cargoTons = 0,
  highPassageBerths = 0,
  lowPassageBerths = 0,
  blocks = 1
} = {}) {
  nonNegativeInteger(cargoTons, 'cargoTons');
  nonNegativeInteger(highPassageBerths, 'highPassageBerths');
  nonNegativeInteger(lowPassageBerths, 'lowPassageBerths');
  if (!Number.isInteger(blocks) || blocks < 1) throw new TypeError('blocks must be a positive integer');

  const cargoCr = cargoTons * CHARTER_CARGO_RATE_PER_TON_CR;
  const highPassageCr = highPassageBerths * CHARTER_HIGH_BERTH_RATE_CR;
  const lowPassageCr = lowPassageBerths * CHARTER_LOW_BERTH_RATE_CR;
  const perBlockCr = cargoCr + highPassageCr + lowPassageCr;
  return Object.freeze({
    cargoTons,
    highPassageBerths,
    lowPassageBerths,
    cargoCr,
    highPassageCr,
    lowPassageCr,
    perBlockCr,
    blocks,
    blockDays: CHARTER_BLOCK_DAYS,
    totalCr: perBlockCr * blocks
  });
}

export function calculateShipCharterPrice(ship, { blocks = 1 } = {}) {
  assertValidShipDocument(ship);
  const crewPeople = new Set(ship.crew.assignments.map((entry) => entry.characterId).filter(Boolean)).size;
  const highPassageBerths = Math.max(0, ship.specifications.accommodations.staterooms - crewPeople);
  return calculateStarshipCharterPrice({
    cargoTons: ship.specifications.cargo.capacityTons,
    highPassageBerths,
    lowPassageBerths: ship.specifications.accommodations.lowBerths,
    blocks
  });
}

export function privateMessageAvailable(dice) {
  if (!dice || typeof dice.roll2D6 !== 'function') throw new TypeError('dice.roll2D6() is required');
  const roll = dice.roll2D6();
  return Object.freeze({ roll, available: roll.total >= PRIVATE_MESSAGE_THROW });
}

export function privateMessageHonorarium(dice) {
  if (!dice || typeof dice.roll2D6 !== 'function') throw new TypeError('dice.roll2D6() is required');
  const roll = dice.roll2D6();
  return Object.freeze({ roll, amountCr: roll.total * 10 });
}

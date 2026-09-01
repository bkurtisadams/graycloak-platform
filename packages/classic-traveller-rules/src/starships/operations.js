import { assertValidCharacterDocument } from '../characters/character-document.js';
import { assertValidShipDocument } from './ship-document.js';
import {
  PASSAGE_FARES_CR,
  STATEROOM_LIFE_SUPPORT_PER_TRIP_CR,
  LOW_BERTH_LIFE_SUPPORT_PER_USE_CR,
  TRADE_GOODS,
  calculateSpeculativePurchaseCost
} from '../trade/commerce.js';

export const REFINED_FUEL_COST_PER_TON_CR = 500;
export const UNREFINED_FUEL_COST_PER_TON_CR = 100;
export const BASE_BERTHING_COST_CR = 100;

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertNonNegativeFinite(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new TypeError(`${label} must be a non-negative number`);
}

function assertPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value < 1) throw new TypeError(`${label} must be a positive integer`);
}

function normalizeDateLabel(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') throw new TypeError('dateLabel must be a string or null');
  return value;
}

function ledgerId(ship, kind, dateLabel, index) {
  const compactDate = String(dateLabel ?? 'UNDATED').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'UNDATED';
  return `${ship.identity.id}:${compactDate}:${kind}:${index + 1}`;
}

function appendLedger(ship, { kind, amountCr, description, dateLabel = null }) {
  if (!Number.isInteger(amountCr)) throw new TypeError('ledger amountCr must be an integer');
  if (typeof kind !== 'string' || !kind.trim()) throw new TypeError('ledger kind must be nonblank');
  if (typeof description !== 'string' || !description.trim()) throw new TypeError('ledger description must be nonblank');
  const next = cloneJson(ship);
  const ledger = next.state.finances.ledger;
  const balanceCr = next.state.finances.balanceCr + amountCr;
  if (balanceCr < 0) throw new RangeError('ship operating account has insufficient funds');
  ledger.push({
    id: ledgerId(next, kind.trim(), dateLabel, ledger.length),
    date: normalizeDateLabel(dateLabel),
    kind: kind.trim(),
    amountCr,
    description: description.trim(),
    balanceCr
  });
  next.state.finances.balanceCr = balanceCr;
  assertValidShipDocument(next);
  return next;
}

function fuelQualityAfterAdding(existingQuality, existingTons, addedQuality, addedTons) {
  if (addedTons <= 0) return existingQuality;
  if (existingTons <= 0) return addedQuality;
  if (existingQuality === 'unknown') return 'unknown';
  if (existingQuality === addedQuality) return existingQuality;
  return 'mixed';
}

export function starportFuelService(starportCode, { scoutBase = false, ship = null } = {}) {
  const code = String(starportCode ?? '').trim().toUpperCase();
  let service;
  if (code === 'A' || code === 'B') {
    service = { available: true, quality: 'refined', pricePerTonCr: REFINED_FUEL_COST_PER_TON_CR, source: `STARPORT ${code}` };
  } else if (code === 'C' || code === 'D') {
    service = { available: true, quality: 'unrefined', pricePerTonCr: UNREFINED_FUEL_COST_PER_TON_CR, source: `STARPORT ${code}` };
  } else if (code === 'E' || code === 'X') {
    service = { available: false, quality: null, pricePerTonCr: null, source: code === 'X' ? 'NO STARPORT' : 'STARPORT E' };
  } else {
    throw new RangeError(`invalid starport code: ${code || '(blank)'}`);
  }

  const freeScoutFuel = Boolean(
    service.available
    && scoutBase
    && ship?.authority?.servicePrivileges?.freeFuelAtScoutBases === true
  );

  return Object.freeze({
    ...service,
    freeScoutFuel,
    pricePerTonCr: freeScoutFuel ? 0 : service.pricePerTonCr
  });
}

export function calculateBerthingCost(days = 1) {
  assertPositiveInteger(days, 'berthing days');
  return BASE_BERTHING_COST_CR + Math.max(0, days - 6) * BASE_BERTHING_COST_CR;
}

export function calculateJumpFuelRequirement(ship, distance, { travelDays = 7 } = {}) {
  assertValidShipDocument(ship);
  if (!Number.isInteger(distance) || distance < 1) throw new TypeError('jump distance must be a positive integer');
  const jumpRating = ship.specifications.drives.jump.rating;
  if (distance > jumpRating) throw new RangeError(`jump distance ${distance} exceeds ship Jump-${jumpRating}`);
  assertNonNegativeFinite(travelDays, 'travelDays');

  const hullTons = ship.specifications.hull.tons;
  const powerRating = ship.specifications.drives.powerPlant.rating;
  const jumpFuelTons = 0.1 * hullTons * distance;
  // Book 2 specifies 10*Pn tons for four weeks of power-plant operation.
  // The campaign's jump interval is seven days, so consume the proportional
  // one-week share while the vessel is in jump space.
  const powerPlantFuelTons = 10 * powerRating * (travelDays / 28);
  const totalTons = jumpFuelTons + powerPlantFuelTons;
  return Object.freeze({
    distance,
    jumpFuelTons,
    powerPlantFuelTons,
    totalTons,
    travelDays
  });
}

export function availableShipFuelTons(ship) {
  assertValidShipDocument(ship);
  return Number.isFinite(ship.state.currentFuelTons) ? ship.state.currentFuelTons : null;
}

export function canShipMakeJump(ship, distance, options = {}) {
  const requirement = calculateJumpFuelRequirement(ship, distance, options);
  const availableTons = availableShipFuelTons(ship);
  if (availableTons === null) {
    return Object.freeze({ allowed: false, reason: 'FUEL UNRECORDED', availableTons: null, requirement });
  }
  if (availableTons + 1e-9 < requirement.totalTons) {
    return Object.freeze({ allowed: false, reason: 'INSUFFICIENT FUEL', availableTons, requirement });
  }
  return Object.freeze({ allowed: true, reason: 'FUEL AVAILABLE', availableTons, requirement });
}

export function establishShipFuelState(ship, { tons, quality = 'unknown' } = {}) {
  assertValidShipDocument(ship);
  assertNonNegativeFinite(tons, 'fuel tons');
  if (!['unknown', 'refined', 'unrefined', 'mixed'].includes(quality)) throw new RangeError(`invalid fuel quality: ${quality}`);
  if (tons > ship.specifications.fuel.capacityTons) throw new RangeError('fuel tons exceed ship capacity');
  const next = cloneJson(ship);
  next.state.currentFuelTons = tons;
  next.state.fuelQuality = tons === 0 ? 'unknown' : quality;
  assertValidShipDocument(next);
  return next;
}

export function refuelShipToCapacity(ship, {
  quality,
  pricePerTonCr,
  source = 'fuel service',
  dateLabel = null
} = {}) {
  assertValidShipDocument(ship);
  if (!['refined', 'unrefined'].includes(quality)) throw new RangeError('refuel quality must be refined or unrefined');
  assertNonNegativeFinite(pricePerTonCr, 'fuel price per ton');
  const currentTons = Number.isFinite(ship.state.currentFuelTons) ? ship.state.currentFuelTons : 0;
  const capacity = ship.specifications.fuel.capacityTons;
  const addedTons = Math.max(0, capacity - currentTons);
  const costCr = Math.round(addedTons * pricePerTonCr);
  if (costCr > ship.state.finances.balanceCr) throw new RangeError(`ship operating account requires Cr${costCr.toLocaleString('en-US')} for fuel`);

  let next = cloneJson(ship);
  next.state.currentFuelTons = capacity;
  next.state.fuelQuality = fuelQualityAfterAdding(ship.state.fuelQuality, currentTons, quality, addedTons);
  if (costCr > 0) {
    next = appendLedger(next, {
      kind: 'fuel',
      amountCr: -costCr,
      description: `${addedTons} tons ${quality} fuel / ${source}`,
      dateLabel
    });
  } else {
    assertValidShipDocument(next);
  }
  return Object.freeze({ ship: next, addedTons, costCr, quality: next.state.fuelQuality });
}

export function consumeJumpFuel(ship, distance, options = {}) {
  const check = canShipMakeJump(ship, distance, options);
  if (!check.allowed) throw new RangeError(check.reason);
  const next = cloneJson(ship);
  next.state.currentFuelTons = Math.max(0, next.state.currentFuelTons - check.requirement.totalTons);
  if (next.state.currentFuelTons === 0) next.state.fuelQuality = 'unknown';
  assertValidShipDocument(next);
  return Object.freeze({ ship: next, consumedTons: check.requirement.totalTons, requirement: check.requirement });
}


export function creditShipAccount(ship, amountCr, {
  kind = 'contract',
  description = 'Ship account credit',
  dateLabel = null
} = {}) {
  assertValidShipDocument(ship);
  if (!Number.isInteger(amountCr) || amountCr < 0) throw new TypeError('credit amount must be a non-negative integer number of credits');
  if (!String(kind).trim()) throw new TypeError('ledger kind must be nonblank');
  if (!String(description).trim()) throw new TypeError('ledger description must be nonblank');
  if (amountCr === 0) return cloneJson(ship);
  return appendLedger(ship, {
    kind: String(kind).trim(),
    amountCr,
    description: String(description).trim(),
    dateLabel
  });
}

export function transferCharacterCreditsToShip(character, ship, amountCr, { dateLabel = null } = {}) {
  assertValidCharacterDocument(character);
  assertValidShipDocument(ship);
  if (!Number.isInteger(amountCr) || amountCr <= 0) throw new TypeError('transfer amount must be a positive integer number of credits');
  if (character.finances.credits < amountCr) throw new RangeError('character has insufficient credits');
  const nextCharacter = cloneJson(character);
  nextCharacter.finances.credits -= amountCr;
  assertValidCharacterDocument(nextCharacter);
  const nextShip = appendLedger(ship, {
    kind: 'transfer',
    amountCr,
    description: `Transfer from ${character.identity.name || character.identity.id}`,
    dateLabel
  });
  return Object.freeze({ character: nextCharacter, ship: nextShip, amountCr });
}

export function beginPortCall(ship, { systemId, arrivalDate = null, berthingDueCr = BASE_BERTHING_COST_CR } = {}) {
  assertValidShipDocument(ship);
  if (typeof systemId !== 'string' || !systemId.trim()) throw new TypeError('systemId must be a nonblank string');
  if (!Number.isInteger(berthingDueCr) || berthingDueCr < 0) throw new TypeError('berthingDueCr must be a non-negative integer');
  const next = cloneJson(ship);
  next.state.portCall = {
    systemId: systemId.trim(),
    arrivalDate: normalizeDateLabel(arrivalDate),
    berthingDueCr,
    berthingPaid: berthingDueCr === 0
  };
  assertValidShipDocument(next);
  return next;
}

export function payCurrentBerthing(ship, { dateLabel = null, description = 'Starport berthing' } = {}) {
  assertValidShipDocument(ship);
  const call = ship.state.portCall;
  if (!call) throw new RangeError('no current port call is recorded');
  if (call.berthingPaid || call.berthingDueCr === 0) return Object.freeze({ ship: cloneJson(ship), costCr: 0 });
  const costCr = call.berthingDueCr;
  if (ship.state.finances.balanceCr < costCr) throw new RangeError(`ship operating account requires Cr${costCr.toLocaleString('en-US')} for berthing`);
  let next = appendLedger(ship, {
    kind: 'berthing',
    amountCr: -costCr,
    description,
    dateLabel
  });
  next.state.portCall.berthingPaid = true;
  assertValidShipDocument(next);
  return Object.freeze({ ship: next, costCr });
}

export function skimGasGiantToCapacity(ship) {
  assertValidShipDocument(ship);
  if (!ship.specifications.hull.streamlined) throw new RangeError('ship is not streamlined for gas-giant skimming');
  const currentTons = Number.isFinite(ship.state.currentFuelTons) ? ship.state.currentFuelTons : 0;
  const capacity = ship.specifications.fuel.capacityTons;
  const addedTons = Math.max(0, capacity - currentTons);
  const next = cloneJson(ship);
  next.state.currentFuelTons = capacity;
  next.state.fuelQuality = fuelQualityAfterAdding(ship.state.fuelQuality, currentTons, 'unrefined', addedTons);
  assertValidShipDocument(next);
  return Object.freeze({ ship: next, addedTons, quality: next.state.fuelQuality, elapsedDays: addedTons > 0 ? 7 : 0 });
}

export function loadCargo(ship, cargo) {
  assertValidShipDocument(ship);
  if (!cargo || typeof cargo !== 'object' || Array.isArray(cargo)) throw new TypeError('cargo must be an object');
  const tons = Number(cargo.tons);
  if (!Number.isFinite(tons) || tons <= 0) throw new TypeError('cargo tons must be a positive number');
  const id = String(cargo.id ?? '').trim();
  if (!id) throw new TypeError('cargo id must be nonblank');
  if (ship.state.cargoManifest.some((entry) => entry.id === id)) throw new RangeError(`cargo id already exists: ${id}`);
  const available = ship.specifications.cargo.capacityTons - ship.state.cargoUsedTons;
  if (tons > available + 1e-9) throw new RangeError(`cargo requires ${tons} tons; only ${available} tons available`);
  const acquisitionCostCr = cargo.acquisitionCostCr ?? 0;
  if (!Number.isInteger(acquisitionCostCr) || acquisitionCostCr < 0) throw new TypeError('cargo acquisitionCostCr must be a non-negative integer');
  const next = cloneJson(ship);
  next.state.cargoManifest.push({
    id,
    category: String(cargo.category ?? 'cargo').trim() || 'cargo',
    description: String(cargo.description ?? ''),
    tons,
    originSystemId: cargo.originSystemId === null || cargo.originSystemId === undefined ? null : String(cargo.originSystemId),
    destinationSystemId: cargo.destinationSystemId === null || cargo.destinationSystemId === undefined ? null : String(cargo.destinationSystemId),
    acquisitionCostCr,
    notes: String(cargo.notes ?? '')
  });
  next.state.cargoUsedTons += tons;
  assertValidShipDocument(next);
  return next;
}

export function unloadCargo(ship, cargoId) {
  assertValidShipDocument(ship);
  const id = String(cargoId ?? '').trim();
  if (!id) throw new TypeError('cargoId must be nonblank');
  const index = ship.state.cargoManifest.findIndex((entry) => entry.id === id);
  if (index < 0) throw new RangeError(`cargo not found: ${id}`);
  const next = cloneJson(ship);
  const [cargo] = next.state.cargoManifest.splice(index, 1);
  next.state.cargoUsedTons -= cargo.tons;
  if (Math.abs(next.state.cargoUsedTons) < 1e-9) next.state.cargoUsedTons = 0;
  assertValidShipDocument(next);
  return Object.freeze({ ship: next, cargo });
}



export function availablePassengerCapacity(ship, passageClass = 'middle') {
  assertValidShipDocument(ship);
  if (!['high', 'middle', 'low'].includes(passageClass)) throw new RangeError('passageClass must be high, middle, or low');
  if (passageClass === 'low') {
    const used = ship.state.passengerManifest.filter((entry) => entry.class === 'low').length;
    return Math.max(0, ship.specifications.accommodations.lowBerths - used);
  }
  const crewPeople = new Set(ship.crew.assignments.map((entry) => entry.characterId)).size;
  const occupiedByPassengers = ship.state.passengerManifest.filter((entry) => entry.class === 'high' || entry.class === 'middle').length;
  return Math.max(0, ship.specifications.accommodations.staterooms - crewPeople - occupiedByPassengers);
}

export function bookPassenger(ship, {
  id,
  passageClass = 'middle',
  originSystemId,
  destinationSystemId
} = {}) {
  assertValidShipDocument(ship);
  if (!['high', 'middle', 'low'].includes(passageClass)) throw new RangeError('passageClass must be high, middle, or low');
  const passengerId = String(id ?? '').trim();
  if (!passengerId) throw new TypeError('passenger id must be nonblank');
  if (ship.state.passengerManifest.some((entry) => entry.id === passengerId)) throw new RangeError(`passenger id already exists: ${passengerId}`);
  const origin = String(originSystemId ?? '').trim();
  const destination = String(destinationSystemId ?? '').trim();
  if (!origin || !destination) throw new TypeError('passenger origin and destination must be nonblank');
  if (origin === destination) throw new RangeError('passenger destination must differ from origin');
  if (availablePassengerCapacity(ship, passageClass) < 1) throw new RangeError(`no ${passageClass} passenger capacity available`);
  if (passageClass === 'high' && !ship.crew.assignments.some((entry) => entry.role.toLowerCase() === 'steward')) {
    throw new RangeError('high passage requires a steward aboard');
  }
  const next = cloneJson(ship);
  next.state.passengerManifest.push({
    id: passengerId,
    class: passageClass,
    originSystemId: origin,
    destinationSystemId: destination,
    fareCr: PASSAGE_FARES_CR[passageClass]
  });
  assertValidShipDocument(next);
  return next;
}

export function calculateLifeSupportCostForTrip(ship) {
  assertValidShipDocument(ship);
  const crewPeople = new Set(ship.crew.assignments.map((entry) => entry.characterId)).size;
  const stateroomPassengers = ship.state.passengerManifest.filter((entry) => entry.class === 'high' || entry.class === 'middle').length;
  const lowPassengers = ship.state.passengerManifest.filter((entry) => entry.class === 'low').length;
  const occupiedStaterooms = crewPeople + stateroomPassengers;
  const stateroomCostCr = occupiedStaterooms * STATEROOM_LIFE_SUPPORT_PER_TRIP_CR;
  const lowBerthCostCr = lowPassengers * LOW_BERTH_LIFE_SUPPORT_PER_USE_CR;
  return Object.freeze({ occupiedStaterooms, lowPassengers, stateroomCostCr, lowBerthCostCr, totalCr: stateroomCostCr + lowBerthCostCr });
}

export function chargeLifeSupportForTrip(ship, { dateLabel = null } = {}) {
  const cost = calculateLifeSupportCostForTrip(ship);
  if (cost.totalCr > ship.state.finances.balanceCr) throw new RangeError(`ship operating account requires Cr${cost.totalCr.toLocaleString('en-US')} for life support`);
  if (cost.totalCr === 0) return Object.freeze({ ship: cloneJson(ship), ...cost });
  const next = appendLedger(ship, {
    kind: 'life-support',
    amountCr: -cost.totalCr,
    description: `${cost.occupiedStaterooms} occupied stateroom${cost.occupiedStaterooms === 1 ? '' : 's'}${cost.lowPassengers ? `; ${cost.lowPassengers} low berth${cost.lowPassengers === 1 ? '' : 's'}` : ''}`,
    dateLabel
  });
  return Object.freeze({ ship: next, ...cost });
}

export function deliverFreightAtDestination(ship, systemId, { dateLabel = null } = {}) {
  assertValidShipDocument(ship);
  const destination = String(systemId ?? '').trim();
  if (!destination) throw new TypeError('systemId must be nonblank');
  const matching = ship.state.cargoManifest.filter((entry) => entry.category === 'freight' && entry.destinationSystemId === destination);
  let next = cloneJson(ship);
  let revenueCr = 0;
  const delivered = [];
  for (const cargo of matching) {
    const unloaded = unloadCargo(next, cargo.id);
    next = unloaded.ship;
    const paymentCr = Math.round(cargo.tons * 1000);
    revenueCr += paymentCr;
    delivered.push(cargo);
    next = appendLedger(next, {
      kind: 'freight',
      amountCr: paymentCr,
      description: `${cargo.tons} tons freight delivered / ${cargo.description || cargo.id}`,
      dateLabel
    });
  }
  assertValidShipDocument(next);
  return Object.freeze({ ship: next, delivered: Object.freeze(delivered), revenueCr });
}

export function disembarkPassengersAtDestination(ship, systemId, { dateLabel = null } = {}) {
  assertValidShipDocument(ship);
  const destination = String(systemId ?? '').trim();
  if (!destination) throw new TypeError('systemId must be nonblank');
  const delivered = ship.state.passengerManifest.filter((entry) => entry.destinationSystemId === destination);
  const revenueCr = delivered.reduce((sum, entry) => sum + entry.fareCr, 0);
  let next = cloneJson(ship);
  next.state.passengerManifest = next.state.passengerManifest.filter((entry) => entry.destinationSystemId !== destination);
  assertValidShipDocument(next);
  if (revenueCr > 0) {
    next = appendLedger(next, {
      kind: 'passage',
      amountCr: revenueCr,
      description: `${delivered.length} passenger${delivered.length === 1 ? '' : 's'} delivered`,
      dateLabel
    });
  }
  return Object.freeze({ ship: next, passengers: Object.freeze(delivered), revenueCr });
}

export function purchaseSpeculativeCargo(ship, offer, quantity, {
  originSystemId,
  dateLabel = null
} = {}) {
  assertValidShipDocument(ship);
  if (!offer || typeof offer !== 'object') throw new TypeError('offer must be an object');
  if (offer.unit !== 'tons') throw new RangeError('individual-item trade goods require referee-assigned tonnage before loading');
  const tradeGood = TRADE_GOODS[offer.code];
  if (!tradeGood) throw new RangeError(`unknown trade good code: ${offer.code}`);
  const cost = calculateSpeculativePurchaseCost(offer, quantity);
  if (ship.state.finances.balanceCr < cost.totalCr) throw new RangeError(`ship operating account requires Cr${cost.totalCr.toLocaleString('en-US')} for purchase`);
  const freeTons = ship.specifications.cargo.capacityTons - ship.state.cargoUsedTons;
  if (quantity > freeTons + 1e-9) throw new RangeError(`cargo requires ${quantity} tons; only ${freeTons} tons available`);
  let next = appendLedger(ship, {
    kind: 'speculative-purchase',
    amountCr: -cost.totalCr,
    description: `${quantity} tons ${tradeGood.name}${cost.partialPurchase ? ' / partial lot incl. 1% handling' : ''}`,
    dateLabel
  });
  const id = `${next.identity.id}:spec:${originSystemId}:${offer.code}:${next.state.cargoManifest.length + 1}`;
  next = loadCargo(next, {
    id,
    category: `speculative:${offer.code}`,
    description: tradeGood.name,
    tons: quantity,
    originSystemId: String(originSystemId ?? ''),
    destinationSystemId: null,
    acquisitionCostCr: cost.totalCr,
    notes: `Base Cr${tradeGood.basePriceCr}; purchased at ${offer.percentage}% of base.`
  });
  return Object.freeze({ ship: next, cargoId: id, costCr: cost.totalCr, handlingFeeCr: cost.handlingFeeCr });
}

export function sellSpeculativeCargo(ship, cargoId, quote, { dateLabel = null } = {}) {
  assertValidShipDocument(ship);
  const id = String(cargoId ?? '').trim();
  const cargo = ship.state.cargoManifest.find((entry) => entry.id === id);
  if (!cargo) throw new RangeError(`cargo not found: ${id}`);
  const match = /^speculative:(\d{2})$/.exec(cargo.category);
  if (!match) throw new RangeError('cargo is not speculative trade goods');
  const code = Number(match[1]);
  if (!quote || quote.code !== code || quote.quantity !== cargo.tons) throw new RangeError('sale quote does not match cargo lot');
  const unloaded = unloadCargo(ship, id);
  let next = unloaded.ship;
  next = appendLedger(next, {
    kind: 'speculative-sale',
    amountCr: quote.netCr,
    description: `${cargo.tons} tons ${cargo.description} sold at ${quote.percentage}% of base${quote.brokerCommissionCr ? `; broker commission Cr${quote.brokerCommissionCr}` : ''}`,
    dateLabel
  });
  return Object.freeze({ ship: next, cargo, revenueCr: quote.netCr, profitCr: quote.netCr - cargo.acquisitionCostCr });
}

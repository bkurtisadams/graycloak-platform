import { assertValidCharacterDocument } from '../characters/character-document.js';
import { assertValidShipDocument, DOUBLED_ROLE_SALARY_RATE, PORT_CALL_BERTHS, PORT_CALL_HISTORY_LIMIT } from './ship-document.js';
import {
  getTurretWeapon,
  getTurretMount,
  getComputerProgram,
  ROUNDS_PER_LAUNCHER,
  MISSILE_PRICE_CR,
  SAND_CANISTER_PRICE_CR
} from './components.js';
import { getStandardShipDesign } from './standard-designs.js';
import { parseGameDate, assertGameDate, formatGameDate, DAYS_PER_MONTH, DAYS_PER_YEAR } from '../time/dates.js';
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
export const HIGH_PASSENGERS_PER_STEWARD = 8;

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

// Book 2 p.6 (1977): "A power plant, to provide power for one trip (internal
// power, maneuver drive power, and other necessities) requires fuel in
// accordance with the formula: 10Pn." One trip, charged whole — there is no
// four-week allowance in the 1977 printing and nothing to prorate.
//
// The six standard designs prove it. Each carries exactly 0.1 x M x Jn of jump
// fuel plus a full 10Pn and no reserve:
//   Scout S    100 hull A/A/A  Jn2 Pn2   20 + 20 = 40 tons  (printed 40)
//   Free Trader 200 hull A/A/A Jn1 Pn1   20 + 10 = 30 tons  (printed 30)
//   Merchant R  400 hull C/C/C Jn1 Pn1   40 + 10 = 50 tons  (printed 50)
//   Merchant M  600 hull J/D/D Jn3 Pn1  180 + 10 = 190 tons (printed 190)
//   Yacht Y     200 hull A/A/A Jn1 Pn1   20 + 10 + 9 for the ship's boat = 39
// (The Type C cruiser does not reconcile — 240 jump + 30 power plant + 48 for
// its pinnaces is 318 against a printed 288. Flagged for the printed books.)
export const STANDARD_TRIP_DAYS = 14;

export function calculateJumpFuelRequirement(ship, distance, { travelDays = STANDARD_TRIP_DAYS } = {}) {
  assertValidShipDocument(ship);
  if (!Number.isInteger(distance) || distance < 1) throw new TypeError('jump distance must be a positive integer');
  const jumpRating = ship.specifications.drives.jump.rating;
  if (distance > jumpRating) throw new RangeError(`jump distance ${distance} exceeds ship Jump-${jumpRating}`);
  assertNonNegativeFinite(travelDays, 'travelDays');

  const hullTons = ship.specifications.hull.tons;
  const powerRating = ship.specifications.drives.powerPlant.rating;
  // Book 2 p.6: "Jump fuel requirements are based on jump number rather than
  // the size of the jump actually taken." A J-2 ship burns 0.2M whether it
  // jumps one parsec or two.
  const jumpFuelTons = 0.1 * hullTons * jumpRating;
  const powerPlantFuelTons = 10 * powerRating;
  const totalTons = jumpFuelTons + powerPlantFuelTons;
  return Object.freeze({
    distance,
    jumpRating,
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

export function purchaseShipFuel(ship, {
  tons,
  quality,
  pricePerTonCr,
  source = 'fuel service',
  dateLabel = null
} = {}) {
  assertValidShipDocument(ship);
  assertNonNegativeFinite(tons, 'fuel tons');
  if (tons <= 0) throw new RangeError('fuel tons must be greater than zero');
  if (!['refined', 'unrefined'].includes(quality)) throw new RangeError('refuel quality must be refined or unrefined');
  assertNonNegativeFinite(pricePerTonCr, 'fuel price per ton');

  const currentTons = Number.isFinite(ship.state.currentFuelTons) ? ship.state.currentFuelTons : 0;
  const capacity = ship.specifications.fuel.capacityTons;
  const availableCapacityTons = Math.max(0, capacity - currentTons);
  if (tons > availableCapacityTons + 1e-9) {
    throw new RangeError(`fuel purchase exceeds remaining tank capacity of ${availableCapacityTons} tons`);
  }

  const addedTons = tons;
  const costCr = Math.round(addedTons * pricePerTonCr);
  if (costCr > ship.state.finances.balanceCr) throw new RangeError(`ship operating account requires Cr${costCr.toLocaleString('en-US')} for fuel`);

  let next = cloneJson(ship);
  next.state.currentFuelTons = currentTons + addedTons;
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
  if (addedTons <= 0) {
    return Object.freeze({ ship: cloneJson(ship), addedTons: 0, costCr: 0, quality: ship.state.fuelQuality });
  }
  return purchaseShipFuel(ship, {
    tons: addedTons,
    quality,
    pricePerTonCr,
    source,
    dateLabel
  });
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

/**
 * v0.69.0: the debit counterpart of creditShipAccount, for one-off charges no
 * other function owns (a patrol's toll, a shuttle fare, a lottery payout, a
 * repair, a referee's correction). Refuses to overdraw.
 */
export function debitShipAccount(ship, amountCr, {
  kind,
  description,
  dateLabel = null
} = {}) {
  assertValidShipDocument(ship);
  if (!Number.isInteger(amountCr) || amountCr < 1) throw new TypeError('debit amount must be a positive integer number of credits');
  if (!String(kind ?? '').trim()) throw new TypeError('ledger kind must be nonblank');
  if (!String(description ?? '').trim()) throw new TypeError('ledger description must be nonblank');
  return appendLedger(ship, {
    kind: String(kind).trim(),
    amountCr: -amountCr,
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

/**
 * The other direction. Money could flow into a ship and never out, so an owner
 * had no way to spend the ship's balance on anything personal. Book 2 p.6 has
 * an owner-aboard drawing his pay from the profits rather than a wage, which
 * is exactly this: take what the venture can spare, when it can spare it.
 */
export function transferShipCreditsToCharacter(ship, character, amountCr, { dateLabel = null } = {}) {
  assertValidShipDocument(ship);
  assertValidCharacterDocument(character);
  if (!Number.isInteger(amountCr) || amountCr <= 0) throw new TypeError('transfer amount must be a positive integer number of credits');
  if (ship.state.finances.balanceCr < amountCr) throw new RangeError('ship operating account has insufficient credits');
  const nextCharacter = cloneJson(character);
  nextCharacter.finances.credits += amountCr;
  assertValidCharacterDocument(nextCharacter);
  const nextShip = appendLedger(ship, {
    kind: 'transfer',
    amountCr: -amountCr,
    description: `Withdrawal to ${character.identity.name || character.identity.id}`,
    dateLabel
  });
  return Object.freeze({ character: nextCharacter, ship: nextShip, amountCr });
}

/**
 * Book 2 p.42/46: a speculative lot is bought at one world and resold at
 * another. The manifest records what was paid, so the position against a
 * current quote is simply proceeds less cost — the number that decides the
 * sale, and the one the player otherwise has to remember.
 */
export function speculativeLotPosition(ship, cargoId, { proceedsCr = null } = {}) {
  assertValidShipDocument(ship);
  const cargo = ship.state.cargoManifest.find((entry) => entry.id === cargoId);
  if (!cargo) throw new RangeError(`no cargo aboard with id: ${cargoId}`);
  const costCr = cargo.acquisitionCostCr ?? 0;
  if (proceedsCr === null) return Object.freeze({ cargoId, costCr, proceedsCr: null, gainCr: null, returnPercent: null });
  const gainCr = proceedsCr - costCr;
  return Object.freeze({
    cargoId,
    costCr,
    proceedsCr,
    gainCr,
    // Against what was paid, not against base price: this is the return on the
    // capital actually committed.
    returnPercent: costCr > 0 ? Math.round((gainCr / costCr) * 1000) / 10 : null
  });
}

// v0.69.0 (ship document v8): Book 2 p.15 — only a streamlined hull enters
// an atmosphere, so any other ship's port call is an orbital berth, and p.8
// has it deliver and take on in orbit. Each dated call is kept (the most
// recent PORT_CALL_HISTORY_LIMIT) for p.3's repossession DM.
export function beginPortCall(ship, { systemId, arrivalDate = null, berthingDueCr = BASE_BERTHING_COST_CR, berth = null } = {}) {
  assertValidShipDocument(ship);
  if (typeof systemId !== 'string' || !systemId.trim()) throw new TypeError('systemId must be a nonblank string');
  if (!Number.isInteger(berthingDueCr) || berthingDueCr < 0) throw new TypeError('berthingDueCr must be a non-negative integer');
  const streamlined = Boolean(ship.specifications.hull.streamlined);
  const where = berth ?? (streamlined ? 'surface' : 'orbit');
  if (!PORT_CALL_BERTHS.includes(where)) throw new RangeError(`berth must be ${PORT_CALL_BERTHS.join(' or ')}`);
  if (where === 'surface' && !streamlined) throw new RangeError('an unstreamlined hull cannot land (Book 2 p.15)');
  const next = cloneJson(ship);
  const date = normalizeDateLabel(arrivalDate);
  next.state.portCall = {
    systemId: systemId.trim(),
    arrivalDate: date,
    berthingDueCr,
    berthingPaid: berthingDueCr === 0,
    berth: where,
    brokerTipDM: 0
  };
  if (date !== null && parseGameDate(date) !== null) {
    next.state.portCallHistory = [...next.state.portCallHistory, { systemId: systemId.trim(), arrivalDate: date }].slice(-PORT_CALL_HISTORY_LIMIT);
  }
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
  destinationSystemId,
  endurance = null
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
  // v0.69.0: Book 2 p.2's revival throw reads the low passenger's endurance.
  if (endurance !== null) {
    if (passageClass !== 'low') throw new RangeError('only a low passenger records endurance');
    if (!Number.isInteger(endurance) || endurance < 1 || endurance > 15) throw new RangeError('endurance must be an integer from 1 to 15');
  }
  if (passageClass === 'high') {
    // Book 2 p.16: at least one steward (Steward-0 or better) per eight high passengers.
    const stewards = ship.crew.assignments.filter((entry) => entry.role.toLowerCase() === 'steward').length;
    const highAboard = ship.state.passengerManifest.filter((entry) => entry.class === 'high').length;
    if (stewards < 1) throw new RangeError('high passage requires a steward aboard');
    if (highAboard + 1 > stewards * HIGH_PASSENGERS_PER_STEWARD) {
      throw new RangeError(`Book 2 requires one steward per ${HIGH_PASSENGERS_PER_STEWARD} high passengers; ${stewards} steward${stewards === 1 ? '' : 's'} aboard`);
    }
  }
  const next = cloneJson(ship);
  next.state.passengerManifest.push({
    id: passengerId,
    class: passageClass,
    originSystemId: origin,
    destinationSystemId: destination,
    fareCr: PASSAGE_FARES_CR[passageClass],
    endurance
  });
  assertValidShipDocument(next);
  return next;
}

// Book 2 p.6: "Each stateroom on a starship, occupied or not, involves a
// constant overhead cost of CR 2000 per trip made." The charge is per
// stateroom built, not per person aboard — a Type S with four staterooms and
// one crewman pays Cr8,000 a trip, not Cr2,000. The same page states the low
// berth overhead per berth. Occupancy is still reported, because it is what
// the referee and the player want to see.
export function calculateLifeSupportCostForTrip(ship) {
  assertValidShipDocument(ship);
  const crewPeople = new Set(ship.crew.assignments.map((entry) => entry.characterId)).size;
  const stateroomPassengers = ship.state.passengerManifest.filter((entry) => entry.class === 'high' || entry.class === 'middle').length;
  const lowPassengers = ship.state.passengerManifest.filter((entry) => entry.class === 'low').length;
  const occupiedStaterooms = crewPeople + stateroomPassengers;
  const staterooms = ship.specifications.accommodations?.staterooms ?? occupiedStaterooms;
  const lowBerths = ship.specifications.accommodations?.lowBerths ?? lowPassengers;
  const stateroomCostCr = staterooms * STATEROOM_LIFE_SUPPORT_PER_TRIP_CR;
  const lowBerthCostCr = lowBerths * LOW_BERTH_LIFE_SUPPORT_PER_USE_CR;
  return Object.freeze({
    staterooms, lowBerths, occupiedStaterooms, lowPassengers,
    stateroomCostCr, lowBerthCostCr, totalCr: stateroomCostCr + lowBerthCostCr
  });
}

// ---------------------------------------------------------------------------
// Book 2 pp.6-7: the remaining operating expenses. None of these existed, so
// crew worked for free, no ship was ever maintained, and no mortgage was ever
// serviced — an account could only ever grow.
// ---------------------------------------------------------------------------

export const CREW_SALARIES_CR = Object.freeze({
  pilot: 6000, navigator: 5000, engineer: 4000, steward: 3000, medic: 2000, gunner: 1000
});

// "generally +10% for each level of expertise above level-1"
export function crewMemberSalaryCr(role, skillLevel = 1) {
  const base = CREW_SALARIES_CR[String(role ?? '').toLowerCase()];
  if (!base) throw new RangeError(`no Book 2 salary for crew role: ${role}`);
  const above = Math.max(0, Math.floor(Number(skillLevel) || 1) - 1);
  return Math.round(base * (1 + 0.1 * above));
}

/**
 * Book 2 p.6. Monthly. `skillLevels` maps characterId to the level held in
 * the skill for that role; anything absent is treated as level 1.
 * A player character crewing their own ship draws pay only if `paid` says so —
 * Book 2 notes an owner-aboard "drawing his pay from the profits" instead.
 */
export function calculateMonthlyCrewSalaries(ship, { skillLevels = {}, unpaid = [] } = {}) {
  assertValidShipDocument(ship);
  const exempt = new Set(unpaid);
  const rolesHeld = new Map();
  for (const entry of ship.crew.assignments) {
    rolesHeld.set(entry.characterId, (rolesHeld.get(entry.characterId) ?? 0) + 1);
  }
  const entries = ship.crew.assignments
    .filter((entry) => !exempt.has(entry.characterId))
    .map((entry) => {
      const doubledUp = (rolesHeld.get(entry.characterId) ?? 1) > 1;
      const fullSalaryCr = crewMemberSalaryCr(entry.role, skillLevels[entry.characterId] ?? 1);
      return Object.freeze({
        characterId: entry.characterId,
        characterName: entry.characterName,
        role: entry.role,
        doubledUp,
        fullSalaryCr,
        // Book 2 p.17: a person filling two positions "draws a salary equal to
        // 75% of each job". Applied per post, so the doubled crewman is paid
        // more in total than a single post and less than two.
        salaryCr: doubledUp ? Math.round(fullSalaryCr * DOUBLED_ROLE_SALARY_RATE) : fullSalaryCr
      });
    });
  return Object.freeze({
    entries: Object.freeze(entries),
    totalCr: entries.reduce((sum, entry) => sum + entry.salaryCr, 0)
  });
}

// Book 2 p.6: annually, 0.1% of the cash price, and two weeks at a class A or
// B starport.
export const ANNUAL_MAINTENANCE_RATE = 0.001;
export const MAINTENANCE_WEEKS = 2;
export const MAINTENANCE_STARPORTS = Object.freeze(['A', 'B']);

// The document carries only the design key; the price lives on the standard
// design record.
export function shipCashPriceCr(ship) {
  assertValidShipDocument(ship);
  const design = getStandardShipDesign(ship.design.key);
  if (!design) throw new RangeError(`no standard design on file for ${ship.design.key}`);
  return Math.round((design.economics?.newCostMCr ?? 0) * 1_000_000);
}

export function annualMaintenanceCr(ship) {
  return Math.round(shipCashPriceCr(ship) * ANNUAL_MAINTENANCE_RATE);
}

// Book 2 p.5: 20% down, then 1/240th of the cash price monthly for 480 months
// — so the financed total is 220% of the cash price over 40 years.
export const MORTGAGE_DOWN_PAYMENT_RATE = 0.2;
export const MORTGAGE_MONTHLY_DIVISOR = 240;
export const MORTGAGE_TERM_MONTHS = 480;

export function shipMortgage(ship) {
  const cashPriceCr = shipCashPriceCr(ship);
  return Object.freeze({
    cashPriceCr,
    downPaymentCr: Math.round(cashPriceCr * MORTGAGE_DOWN_PAYMENT_RATE),
    monthlyPaymentCr: Math.round(cashPriceCr / MORTGAGE_MONTHLY_DIVISOR),
    termMonths: MORTGAGE_TERM_MONTHS,
    financedTotalCr: Math.round(cashPriceCr / MORTGAGE_MONTHLY_DIVISOR) * MORTGAGE_TERM_MONTHS
  });
}

// ---------------------------------------------------------------------------
// v0.67.0: the mortgage is serviced, not only priced.
//
// shipMortgage() above gives the terms for a new purchase. A financed ship
// carries state.finances.mortgage — the price the bank holds, the monthly
// figure, how many payments remain from `startedOn` — and its payments are
// ledger lines of kind 'mortgage', so payments made and payments in arrears
// are read from the ledger exactly as salaries are. A ship owned outright
// (a mustered-out Type S) has mortgage: null.
//
// Book 2 p.5 says nothing about what an unpaid month does to the ship; p.3
// says a ship whose captain stops paying has "skipped" and is liable to
// repossession at each landing. So "skipped" is simply: one or more payment
// periods have fallen due and were not covered. No flag, no schema field.
// ---------------------------------------------------------------------------

export const MORTGAGE_PERIOD_DAYS = DAYS_PER_MONTH;
const MORTGAGE_LEDGER_KIND = 'mortgage';

/**
 * Put a ship under a mortgage. `termMonths` is the number of payments still
 * owed from `startedOn`, so a ship acquired part-paid (a mustering-out
 * benefit read that way) is financed with fewer than the full 480.
 */
export function financeShip(ship, {
  startedOn,
  cashPriceCr = null,
  monthlyPaymentCr = null,
  termMonths = MORTGAGE_TERM_MONTHS,
  homeSystemId = null
} = {}) {
  assertValidShipDocument(ship);
  assertGameDate(startedOn, 'startedOn');
  if (ship.state.finances.mortgage) throw new RangeError('ship is already financed');
  if (!Number.isInteger(termMonths) || termMonths < 1 || termMonths > MORTGAGE_TERM_MONTHS) {
    throw new RangeError(`termMonths must be an integer from 1 to ${MORTGAGE_TERM_MONTHS}`);
  }
  const price = cashPriceCr ?? shipCashPriceCr(ship);
  if (!Number.isInteger(price) || price < 1) throw new TypeError('cashPriceCr must be a positive integer');
  const monthly = monthlyPaymentCr ?? Math.round(price / MORTGAGE_MONTHLY_DIVISOR);
  if (!Number.isInteger(monthly) || monthly < 1) throw new TypeError('monthlyPaymentCr must be a positive integer');
  const next = cloneJson(ship);
  // v0.69.0: Book 2 p.3 measures a skipped ship's distance from its home
  // planet; the bank's world is taken as that home. Null where unknown.
  if (homeSystemId !== null && (typeof homeSystemId !== 'string' || !homeSystemId.trim())) throw new TypeError('homeSystemId must be null or a nonblank string');
  next.state.finances.mortgage = { cashPriceCr: price, monthlyPaymentCr: monthly, termMonths, startedOn, homeSystemId: homeSystemId === null ? null : homeSystemId.trim() };
  assertValidShipDocument(next);
  return next;
}

function mortgagePaymentsMade(ship) {
  return ship.state.finances.ledger.filter((entry) => entry.kind === MORTGAGE_LEDGER_KIND).length;
}

/** Where the mortgage stands as of `dateLabel`. Always answers; null-safe. */
export function shipMortgageSchedule(ship, { dateLabel } = {}) {
  assertValidShipDocument(ship);
  const now = assertGameDate(dateLabel, 'dateLabel');
  const mortgage = ship.state.finances.mortgage;
  if (!mortgage) {
    return Object.freeze({ financed: false, paidOff: true, paymentsMade: 0, paymentsRemaining: 0, periodsDue: 0, arrearsCr: 0, monthlyPaymentCr: 0, nextDueDate: null });
  }
  const paymentsMade = mortgagePaymentsMade(ship);
  const paymentsRemaining = Math.max(0, mortgage.termMonths - paymentsMade);
  const paidOff = paymentsRemaining === 0;
  // Payments fall due every 30 days from startedOn, however late the previous
  // one was actually made — dating from the last payment would let a late
  // payer push every later due date back.
  const start = assertGameDate(mortgage.startedOn, 'mortgage.startedOn');
  const periodsElapsed = Math.max(0, Math.floor((now - start) / MORTGAGE_PERIOD_DAYS));
  const periodsFallenDue = Math.min(periodsElapsed, mortgage.termMonths);
  const periodsDue = paidOff ? 0 : Math.max(0, periodsFallenDue - paymentsMade);
  const nextDueDate = paidOff ? null : formatGameDate(start + (paymentsMade + 1) * MORTGAGE_PERIOD_DAYS);
  return Object.freeze({
    financed: true,
    paidOff,
    monthlyPaymentCr: mortgage.monthlyPaymentCr,
    termMonths: mortgage.termMonths,
    paymentsMade,
    paymentsRemaining,
    periodsDue,
    arrearsCr: periodsDue * mortgage.monthlyPaymentCr,
    skipped: periodsDue > 0,
    nextDueDate
  });
}

// ---------------------------------------------------------------------------
// v0.67.0: maintenance is a thing done at a port, not a charge that falls due.
//
// Book 2 p.6: annually, two weeks at a class A or B starport, 0.1% of the
// cash price. Skipping it is what p.4's drive-failure throw and misjump DM
// key on, so the overhaul has to be an act the ship performs (or fails to),
// not money the account quietly loses wherever the ship happens to be.
// shipUpkeepDue reports it as due or overdue; performMaintenance does it.
// ---------------------------------------------------------------------------

export const MAINTENANCE_DAYS = MAINTENANCE_WEEKS * 7;

function lastMaintenanceDate(ship) {
  let latest = null;
  for (const entry of ship.state.finances.ledger) {
    if (entry.kind !== 'maintenance') continue;
    const ordinal = parseGameDate(entry.date);
    if (ordinal !== null && (latest === null || ordinal > latest)) latest = ordinal;
  }
  const recorded = parseGameDate(ship.state.maintenance?.lastOverhaulDate);
  if (recorded !== null && (latest === null || recorded > latest)) latest = recorded;
  return latest;
}

/**
 * Maintenance standing as of `dateLabel`. `sinceLabel` dates delivery for a
 * ship that has never been overhauled (a new ship is in warranty for a year
 * from delivery, in effect). A ship with neither is 'unknown'.
 */
export function shipMaintenanceStatus(ship, { dateLabel, sinceLabel = null } = {}) {
  assertValidShipDocument(ship);
  const now = assertGameDate(dateLabel, 'dateLabel');
  const from = lastMaintenanceDate(ship) ?? parseGameDate(sinceLabel);
  if (from === null) {
    return Object.freeze({ status: 'unknown', dueDate: null, daysUntilDue: null, daysOverdue: null, overdue: false, costCr: annualMaintenanceCr(ship) });
  }
  const due = from + DAYS_PER_YEAR;
  const overdue = now > due;
  return Object.freeze({
    status: overdue ? 'overdue' : 'current',
    lastOverhaulDate: formatGameDate(from),
    dueDate: formatGameDate(due),
    daysUntilDue: Math.max(0, due - now),
    daysOverdue: Math.max(0, now - due),
    overdue,
    costCr: annualMaintenanceCr(ship)
  });
}

/**
 * The annual overhaul, performed. Charges the fee, records the overhaul, and
 * reports the two weeks the caller must put on the clock. Refused anywhere
 * but a class A or B starport.
 */
export function performMaintenance(ship, { dateLabel, starport, scoutBase = false } = {}) {
  assertValidShipDocument(ship);
  assertGameDate(dateLabel, 'dateLabel');
  const port = String(starport ?? '').toUpperCase();
  if (!MAINTENANCE_STARPORTS.includes(port)) {
    throw new RangeError(`annual maintenance requires a class ${MAINTENANCE_STARPORTS.join(' or ')} starport; this is class ${port || '?'}`);
  }
  // Book 1: a Scout ship on reserve assignment is maintained free at scout
  // bases — the privilege the ship document already records.
  const free = Boolean(scoutBase && port === 'B' && ship.authority.servicePrivileges?.freeMaintenanceAtScoutBasesAtClassBStarports);
  const costCr = free ? 0 : annualMaintenanceCr(ship);
  if (costCr > ship.state.finances.balanceCr) throw new RangeError(`ship operating account requires Cr${costCr.toLocaleString('en-US')} for annual maintenance`);
  const next = appendLedger(ship, {
    kind: 'maintenance',
    amountCr: -costCr,
    description: free
      ? `Annual overhaul, ${MAINTENANCE_WEEKS} weeks at a scout base, class ${port} starport (Book 1: no charge)`
      : `Annual overhaul, ${MAINTENANCE_WEEKS} weeks at a class ${port} starport (Book 2 p.6)`,
    dateLabel
  });
  next.state.maintenance = { status: 'current', lastOverhaulDate: dateLabel, monthsPastDue: 0 };
  return Object.freeze({ ship: next, costCr, daysTaken: MAINTENANCE_DAYS, completedOn: formatGameDate(assertGameDate(dateLabel) + MAINTENANCE_DAYS) });
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

// Book 2 p.48: a broker must be paid his fee even if the seller decides not to
// sell. Call this when a brokered quote is declined.
export function payDeclinedBrokerFee(ship, quote, { dateLabel = null } = {}) {
  assertValidShipDocument(ship);
  if (!quote || typeof quote !== 'object') throw new TypeError('quote must be an object');
  const feeCr = Number(quote.brokerCommissionCr ?? 0);
  if (!Number.isInteger(feeCr) || feeCr < 0) throw new TypeError('quote brokerCommissionCr must be a non-negative integer');
  if (feeCr === 0) return Object.freeze({ ship: cloneJson(ship), feeCr: 0 });
  const next = appendLedger(ship, {
    kind: 'broker-fee',
    amountCr: -feeCr,
    description: `Broker fee (DM +${quote.brokerDM}) on declined sale of ${quote.quantity} ${quote.unit} ${quote.name}`,
    dateLabel
  });
  return Object.freeze({ ship: next, feeCr });
}

export function sellSpeculativeCargo(ship, cargoId, quote, { dateLabel = null, destinationSystemId } = {}) {
  assertValidShipDocument(ship);
  const id = String(cargoId ?? '').trim();
  const destination = String(destinationSystemId ?? '').trim();
  if (!destination) throw new TypeError('destinationSystemId must be nonblank');
  const cargo = ship.state.cargoManifest.find((entry) => entry.id === id);
  if (!cargo) throw new RangeError(`cargo not found: ${id}`);
  const match = /^speculative:(\d{2})$/.exec(cargo.category);
  if (!match) throw new RangeError('cargo is not speculative trade goods');
  if (cargo.originSystemId === destination) throw new RangeError('speculative trade goods must be transported to another world before resale');
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

// ---------------------------------------------------------------------------
// Book 2 pp.6-7 recurring charges, applied against the campaign clock.
//
// The 1977 rules say crew are paid "monthly" and a ship is overhauled
// "annually", but the Imperial calendar in these books has no months — Book 3
// dates are a day number and a year. Graycloak ruling: a salary month is 30
// days and a maintenance year is the 365-day game year.
//
// What is due is derived from the ledger rather than stored: the last charge
// of each kind dates the period, so a period the account could not cover
// stays uncharged and therefore stays due. Arrears need no schema field, and
// the ship still flies while it owes.
// ---------------------------------------------------------------------------

export const SALARY_PERIOD_DAYS = DAYS_PER_MONTH;
export const MAINTENANCE_PERIOD_DAYS = DAYS_PER_YEAR;
const SALARY_LEDGER_KIND = 'crew-salaries';

// Kept for callers that still use the private name; the date type lives in
// ../time/dates.js now.
function dayOrdinal(dateLabel) {
  return parseGameDate(dateLabel);
}

function lastChargeOrdinal(ship, kind) {
  let latest = null;
  for (const entry of ship.state.finances.ledger) {
    if (entry.kind !== kind) continue;
    const ordinal = dayOrdinal(entry.date);
    if (ordinal !== null && (latest === null || ordinal > latest)) latest = ordinal;
  }
  return latest;
}

/**
 * What the ship owes as of `dateLabel`, in whole elapsed periods: crew
 * salaries and mortgage payments. `sinceLabel` dates the start of liability
 * for a ship that has never been charged. Maintenance is reported alongside
 * (due date, overdue) but is not owed to anyone until performed — see
 * shipMaintenanceStatus and performMaintenance.
 */
export function shipUpkeepDue(ship, { dateLabel, sinceLabel = null, skillLevels = {}, unpaid = [] } = {}) {
  assertValidShipDocument(ship);
  const now = dayOrdinal(dateLabel);
  if (now === null) throw new TypeError('dateLabel must look like DDD-YYYY');
  const start = dayOrdinal(sinceLabel);

  const salaryFrom = lastChargeOrdinal(ship, SALARY_LEDGER_KIND) ?? start;
  const salaryPeriods = salaryFrom === null ? 0 : Math.max(0, Math.floor((now - salaryFrom) / SALARY_PERIOD_DAYS));
  const payroll = calculateMonthlyCrewSalaries(ship, { skillLevels, unpaid });
  const mortgage = shipMortgageSchedule(ship, { dateLabel });
  const maintenance = shipMaintenanceStatus(ship, { dateLabel, sinceLabel });

  const salariesDueCr = salaryPeriods * payroll.totalCr;
  return Object.freeze({
    salaryPeriods,
    salaryPerPeriodCr: payroll.totalCr,
    salariesDueCr,
    nextSalaryDate: salaryFrom === null ? null : formatGameDate(salaryFrom + SALARY_PERIOD_DAYS),
    mortgagePeriods: mortgage.periodsDue,
    mortgagePerPeriodCr: mortgage.monthlyPaymentCr,
    mortgageDueCr: mortgage.arrearsCr,
    mortgageSkipped: mortgage.skipped ?? false,
    nextMortgageDate: mortgage.nextDueDate,
    maintenance,
    totalDueCr: salariesDueCr + mortgage.arrearsCr
  });
}

/**
 * Charge as many whole periods as the account can cover, oldest first, and
 * leave the rest due. Salaries before the mortgage: a crew is owed its wages
 * before the bank is owed its month. Maintenance is not charged here.
 */
export function chargeShipUpkeep(ship, { dateLabel, sinceLabel = null, skillLevels = {}, unpaid = [] } = {}) {
  const due = shipUpkeepDue(ship, { dateLabel, sinceLabel, skillLevels, unpaid });
  let next = cloneJson(ship);
  let salaryPeriodsPaid = 0;
  let mortgagePeriodsPaid = 0;

  if (due.salaryPerPeriodCr > 0) {
    for (let index = 0; index < due.salaryPeriods; index += 1) {
      if (next.state.finances.balanceCr < due.salaryPerPeriodCr) break;
      next = appendLedger(next, {
        kind: SALARY_LEDGER_KIND,
        amountCr: -due.salaryPerPeriodCr,
        description: `Crew salaries, ${SALARY_PERIOD_DAYS} days (Book 2 p.6)`,
        dateLabel
      });
      salaryPeriodsPaid += 1;
    }
  } else {
    // Nothing to pay, but the period is still served: date it so the next one
    // is measured from here rather than accruing forever.
    salaryPeriodsPaid = due.salaryPeriods;
  }

  for (let index = 0; index < due.mortgagePeriods; index += 1) {
    if (next.state.finances.balanceCr < due.mortgagePerPeriodCr) break;
    const schedule = shipMortgageSchedule(next, { dateLabel });
    next = appendLedger(next, {
      kind: MORTGAGE_LEDGER_KIND,
      amountCr: -due.mortgagePerPeriodCr,
      description: `Mortgage payment ${schedule.paymentsMade + 1} of ${schedule.termMonths} (Book 2 p.5)`,
      dateLabel
    });
    mortgagePeriodsPaid += 1;
  }

  const paidCr = salaryPeriodsPaid * due.salaryPerPeriodCr + mortgagePeriodsPaid * due.mortgagePerPeriodCr;
  return Object.freeze({
    ship: next,
    paidCr,
    salaryPeriodsPaid,
    mortgagePeriodsPaid,
    outstandingCr: due.totalDueCr - paidCr,
    mortgageSkipped: due.mortgagePeriods - mortgagePeriodsPaid > 0,
    maintenance: due.maintenance
  });
}

// ---------------------------------------------------------------------------
// The ship's books. Every transaction has been recorded in state.finances
// since the ledger was written; nothing ever read it back. A voyage account is
// derived from those entries rather than stored, so it cannot drift from the
// ledger and needs no schema of its own.
//
// Book 2 p.6 charges life support "per trip made", so a life-support entry
// marks a departure — which makes it the boundary between one voyage and the
// next. A voyage runs from its departure through the port call at the far end,
// up to the moment the ship leaves again.
// ---------------------------------------------------------------------------

const VOYAGE_BOUNDARY_KIND = 'life-support';

export function summariseShipVoyages(ship, { limit = null } = {}) {
  assertValidShipDocument(ship);
  const ledger = ship.state.finances.ledger;
  const voyages = [];
  let current = null;

  for (const entry of ledger) {
    if (entry.kind === VOYAGE_BOUNDARY_KIND || current === null) {
      current = { entries: [], startDate: entry.date, endDate: entry.date };
      voyages.push(current);
    }
    current.entries.push(entry);
    current.endDate = entry.date;
  }

  const summarised = voyages.map((voyage, index) => {
    let incomeCr = 0;
    let expenseCr = 0;
    for (const entry of voyage.entries) {
      if (entry.amountCr >= 0) incomeCr += entry.amountCr;
      else expenseCr += -entry.amountCr;
    }
    return Object.freeze({
      startDate: voyage.startDate,
      endDate: voyage.endDate,
      entries: Object.freeze([...voyage.entries]),
      incomeCr,
      expenseCr,
      netCr: incomeCr - expenseCr,
      closingBalanceCr: voyage.entries[voyage.entries.length - 1].balanceCr,
      // The last voyage is still running: the ship has not departed again.
      open: index === voyages.length - 1
    });
  });

  return Object.freeze(limit ? summarised.slice(-limit) : summarised);
}

/**
 * What the ship can spare. The current voyage's net, less anything upkeep
 * still owes — a withdrawal should not be funded out of wages the crew has
 * not been paid. Never negative: a losing leg affords nothing.
 */
export function shipDistributableCr(ship, { outstandingUpkeepCr = 0 } = {}) {
  assertValidShipDocument(ship);
  const voyages = summariseShipVoyages(ship);
  const currentNet = voyages.length ? voyages[voyages.length - 1].netCr : 0;
  const spare = Math.min(ship.state.finances.balanceCr, currentNet) - outstandingUpkeepCr;
  return Math.max(0, spare);
}

// ---------------------------------------------------------------------------
// Book 2 pp.15-18: arming a ship.
//
// "Weapons are never included in ship plans and specifications, and must be
// acquired and installed after delivery." Every standard design is delivered
// with empty turrets — the Scout's double turret, the cruiser's eight triples —
// so fitting weaponry is a purchase made in play, and fitted weapons live in
// ship state rather than in the canonical specification.
//
// Book 2 p.15 also notes a turret "requires a gunner, in most cases assigned as
// a specific crew member, and requiring a stateroom, salary, and other crew
// requirements", which is why armShipTurret reports the gunners a ship owes.
// ---------------------------------------------------------------------------

function turretSpecification(ship, turretId) {
  const turret = ship.specifications.armament.turrets.find((entry) => entry.id === turretId);
  if (!turret) throw new RangeError(`no turret ${turretId} on this ship`);
  return turret;
}

function turretState(ship, turretId) {
  return ship.state.armament.turrets.find((entry) => entry.id === turretId) ?? null;
}

/**
 * The weapons fitted in a turret, which is state and may be empty.
 */
export function turretWeapons(ship, turretId) {
  turretSpecification(ship, turretId);
  return Object.freeze([...(turretState(ship, turretId)?.weapons ?? [])]);
}

/**
 * Book 2 p.24's data card notation: the turret's weapon letters, e.g. "B, M".
 */
export function turretDataCardCode(ship, turretId) {
  return turretWeapons(ship, turretId).map((key) => getTurretWeapon(key).code).join(', ');
}

export function shipIsArmed(ship) {
  return ship.state.armament.turrets.some((entry) => entry.weapons.length > 0);
}

/**
 * Book 2 p.17: "One gunner is required as a crew member for each turret mounted
 * on the starship. In many cases, especially where trouble is not expected, the
 * gunner position will be omitted." Reports the requirement against the crew
 * actually assigned; an armed turret with no gunner is legal but unmanned.
 */
export function shipGunnerRequirement(ship) {
  assertValidShipDocument(ship);
  const armedTurrets = ship.state.armament.turrets.filter((entry) => entry.weapons.length > 0).length;
  const gunners = ship.crew.assignments.filter((entry) => entry.role === 'gunner').length;
  return Object.freeze({
    armedTurrets,
    gunners,
    shortfall: Math.max(0, armedTurrets - gunners)
  });
}

/**
 * Buys a weapon and installs it in a turret, charging the ship's account.
 * Pass `pricePerWeaponCr` to override the Book 2 base price at a referee's
 * discretion; otherwise the printed price applies.
 */
export function armShipTurret(ship, {
  turretId,
  weapon,
  pricePerWeaponCr = null,
  dateLabel = null
} = {}) {
  assertValidShipDocument(ship);
  const turret = turretSpecification(ship, turretId);
  const entry = getTurretWeapon(weapon);
  const capacity = getTurretMount(turret.mount).weapons;
  const fitted = turretWeapons(ship, turretId);
  if (fitted.length >= capacity) {
    throw new RangeError(`turret ${turretId} is a ${turret.mount} mount and already holds ${fitted.length} weapons`);
  }
  const priceCr = pricePerWeaponCr === null
    ? Math.round(entry.priceMCr * 1000000)
    : pricePerWeaponCr;
  if (!Number.isInteger(priceCr) || priceCr < 0) throw new TypeError('weapon price must be a non-negative integer of credits');

  let next = appendLedger(ship, {
    kind: 'armament',
    amountCr: -priceCr,
    description: `${entry.label} installed in turret ${turretId}`,
    dateLabel
  });
  const existing = turretState(next, turretId);
  if (existing) {
    existing.weapons.push(entry.key);
  } else {
    next.state.armament.turrets.push({ id: turretId, weapons: [entry.key] });
  }
  assertValidShipDocument(next);
  return Object.freeze({ ship: next, weapon: entry, priceCr, gunners: shipGunnerRequirement(next) });
}

/**
 * Book 2 p.16: used turrets removed in renovation sell for 25% of original
 * cost. The book does not price the removal of a weapon from a turret, so a
 * stripped weapon returns nothing unless a resale is stated.
 */
export function stripShipTurret(ship, { turretId, weapon, resaleCr = 0, dateLabel = null } = {}) {
  assertValidShipDocument(ship);
  turretSpecification(ship, turretId);
  const entry = getTurretWeapon(weapon);
  const state = turretState(ship, turretId);
  const index = state?.weapons.indexOf(entry.key) ?? -1;
  if (index < 0) throw new RangeError(`turret ${turretId} has no ${entry.label} fitted`);
  if (!Number.isInteger(resaleCr) || resaleCr < 0) throw new TypeError('resale must be a non-negative integer of credits');

  let next = cloneJson(ship);
  const nextState = turretState(next, turretId);
  nextState.weapons.splice(index, 1);
  if (nextState.weapons.length === 0) {
    next.state.armament.turrets = next.state.armament.turrets.filter((candidate) => candidate.id !== turretId);
  }
  assertValidShipDocument(next);
  if (resaleCr > 0) {
    next = appendLedger(next, {
      kind: 'armament',
      amountCr: resaleCr,
      description: `${entry.label} removed from turret ${turretId}`,
      dateLabel
    });
  }
  return Object.freeze({ ship: next, weapon: entry, resaleCr });
}

/**
 * Book 2 p.18 expendables. Missiles CR 5000 each, sand CR 400 a canister.
 *
 * p.31: "Each launcher (sand or missile) has an inherent capacity for three
 * missiles or canisters", so a ship's ready capacity is three per launcher
 * fitted. Rounds beyond that are stores, and the book does not forbid them, so
 * the ready figure is reported rather than enforced.
 */
export function magazineCapacity(ship) {
  assertValidShipDocument(ship);
  let launchers = 0;
  let sandcasters = 0;
  for (const turret of ship.state.armament.turrets) {
    for (const weapon of turret.weapons) {
      if (weapon === 'missile-launcher') launchers += 1;
      if (weapon === 'sandcaster') sandcasters += 1;
    }
  }
  return Object.freeze({
    launchers,
    sandcasters,
    readyMissiles: launchers * ROUNDS_PER_LAUNCHER,
    readySandCanisters: sandcasters * ROUNDS_PER_LAUNCHER,
    missiles: ship.state.armament.missiles,
    sandCanisters: ship.state.armament.sandCanisters
  });
}

export function purchaseOrdnance(ship, { missiles = 0, sandCanisters = 0, dateLabel = null } = {}) {
  assertValidShipDocument(ship);
  if (!Number.isInteger(missiles) || missiles < 0) throw new TypeError('missiles must be a non-negative integer');
  if (!Number.isInteger(sandCanisters) || sandCanisters < 0) throw new TypeError('sandCanisters must be a non-negative integer');
  if (missiles === 0 && sandCanisters === 0) throw new RangeError('nothing to purchase');

  const costCr = missiles * MISSILE_PRICE_CR + sandCanisters * SAND_CANISTER_PRICE_CR;
  const parts = [];
  if (missiles) parts.push(`${missiles} missile${missiles === 1 ? '' : 's'}`);
  if (sandCanisters) parts.push(`${sandCanisters} sand canister${sandCanisters === 1 ? '' : 's'}`);

  const next = appendLedger(ship, {
    kind: 'ordnance',
    amountCr: -costCr,
    description: `Ordnance purchased: ${parts.join(', ')}`,
    dateLabel
  });
  next.state.armament.missiles += missiles;
  next.state.armament.sandCanisters += sandCanisters;
  assertValidShipDocument(next);
  return Object.freeze({ ship: next, costCr, missiles, sandCanisters });
}


// ---------------------------------------------------------------------------
// v0.68.0: buying software. Book 2 p.12 prices every program in megacredits;
// p.33 says characters "can, and should, seek out new and different computer
// programs". A program is carried once — a second copy does nothing.
// ---------------------------------------------------------------------------

export function shipCarriesProgram(ship, key) {
  assertValidShipDocument(ship);
  return ship.state.computer.programs.includes(key);
}

export function purchaseComputerProgram(ship, key, { dateLabel = null, priceCr = null } = {}) {
  assertValidShipDocument(ship);
  const program = getComputerProgram(key);
  if (ship.state.computer.programs.includes(program.key)) throw new RangeError(`${program.label} is already carried aboard`);
  const costCr = priceCr ?? Math.round(program.priceMCr * 1_000_000);
  if (!Number.isInteger(costCr) || costCr < 0) throw new TypeError('priceCr must be a non-negative integer');
  if (costCr > ship.state.finances.balanceCr) throw new RangeError(`ship operating account requires Cr${costCr.toLocaleString('en-US')} for ${program.label}`);
  const next = costCr === 0 ? cloneJson(ship) : appendLedger(ship, {
    kind: 'software',
    amountCr: -costCr,
    description: `${program.label} program (Book 2 p.12)`,
    dateLabel
  });
  next.state.computer.programs.push(program.key);
  assertValidShipDocument(next);
  return Object.freeze({ ship: next, costCr, program: program.key });
}

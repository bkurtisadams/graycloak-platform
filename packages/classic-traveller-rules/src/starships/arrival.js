// arrival.js — what happens when a ship comes out of jump and makes port.
//
// v0.69.0. Build-order step 3. Book 2 (1977) throughout; rulings (Graycloak,
// Sep 2026) where the book is silent are marked RULING.
//
//   p.2   low-berth revival and the low-passage lottery
//   p.3   repossession of a skipped ship
//   p.8   private messages; orbit vs surface delivery; shuttle fares
//   p.15  only a streamlined hull lands
//   p.36  what an encountered ship does when hailed or when it inspects
//
// Pure: ship documents in, ship documents out, rolls through the dice given.

import { requireDice } from '../dice.js';
import { assertValidShipDocument, shipCrewMemberRoles } from './ship-document.js';
import { assertValidCharacterDocument } from '../characters/character-document.js';
import { calculateBerthingCost, debitShipAccount, shipMortgageSchedule } from './operations.js';
import { PASSAGE_FARES_CR } from '../trade/commerce.js';
import { assertGameDate, parseGameDate } from '../time/dates.js';

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

// A whole number from 0 to maxInclusive, evenly, from six-sided dice: base-6
// digits, rejecting the uneven top of the range.
export function uniformInteger(dice, maxInclusive) {
  requireDice(dice);
  if (!Number.isInteger(maxInclusive) || maxInclusive < 0) throw new RangeError('maxInclusive must be a non-negative integer');
  const span = maxInclusive + 1;
  if (span === 1) return 0;
  let digits = 1;
  while (6 ** digits < span) digits += 1;
  const limit = Math.floor(6 ** digits / span) * span;
  for (;;) {
    let value = 0;
    for (let index = 0; index < digits; index += 1) value = value * 6 + (dice.rollD6() - 1);
    if (value < limit) return value % span;
  }
}

function crewMembers(ship) {
  const seen = new Map();
  for (const entry of ship.crew.assignments) {
    if (!seen.has(entry.characterId)) seen.set(entry.characterId, { characterId: entry.characterId, characterName: entry.characterName });
  }
  return [...seen.values()];
}

// ------------------------------------------------------- low-berth revival

export const LOW_BERTH_REVIVAL_THROW = 5;
export const LOW_BERTH_MEDIC_EXPERTISE = 2;
export const LOW_BERTH_FRAIL_ENDURANCE = 6;

/**
 * The best Medical expertise among the ship's medics. A medic doubling in a
 * second post gets no expertise DM (Book 2 p.16), so counts as 0.
 * `medicalById` maps character id to Medical skill.
 */
export function attendingMedicExpertise(ship, medicalById = {}) {
  assertValidShipDocument(ship);
  let best = 0;
  for (const entry of ship.crew.assignments) {
    if (String(entry.role).toLowerCase() !== 'medic') continue;
    if (!shipCrewMemberRoles(ship, entry.characterId).appliesExpertise) continue;
    best = Math.max(best, Number(medicalById[entry.characterId] ?? 0) || 0);
  }
  return best;
}

/** Book 2 p.2: +1 attending medic of expertise 2+; -1 endurance 6 or less. */
export function lowBerthRevivalDMParts({ endurance, medicExpertise = 0 } = {}) {
  const parts = [];
  if (medicExpertise >= LOW_BERTH_MEDIC_EXPERTISE) parts.push({ dm: 1, why: `attending medic, Medical-${medicExpertise}` });
  if (Number.isInteger(endurance) && endurance <= LOW_BERTH_FRAIL_ENDURANCE) parts.push({ dm: -1, why: `endurance ${endurance}` });
  return Object.freeze(parts);
}

/** Book 2 p.2: throw 5+ on revival; failure is death. */
export function rollLowBerthRevival(dice, { endurance, medicExpertise = 0 } = {}) {
  requireDice(dice);
  const parts = lowBerthRevivalDMParts({ endurance, medicExpertise });
  const dm = parts.reduce((sum, part) => sum + part.dm, 0);
  const rolled = dice.roll2D6();
  const total = rolled.total + dm;
  return Object.freeze({ dice: rolled.dice, dm, dmParts: parts, total, survived: total >= LOW_BERTH_REVIVAL_THROW });
}

/** RULING: an NPC low passenger's endurance is 2D, as Book 1 rolls it. */
export function rollPassengerEndurance(dice) {
  requireDice(dice);
  return dice.roll2D6().total;
}

// ---------------------------------------------------------------- lottery

export const LOTTERY_STAKE_PER_LOW_PASSAGE_CR = 10;

/**
 * Book 2 p.2: Cr10 of each low passage goes into a pot; each low passenger
 * guesses how many will survive; a winner who does not survive forfeits to
 * the captain.
 *
 * RULING: each guess is even from 0 to the number of low passengers. An
 * exact guess wins; several exact guesses split the pot (whole credits, the
 * odd credit staying with the ship). A dead winner's share, or the whole pot
 * when nobody guessed exactly, stays with the ship.
 */
export function rollLowPassageLottery(dice, revivals) {
  requireDice(dice);
  if (!Array.isArray(revivals)) throw new TypeError('revivals must be an array');
  if (!revivals.length) return null;
  const count = revivals.length;
  const survivors = revivals.filter((entry) => entry.survived).length;
  const potCr = count * LOTTERY_STAKE_PER_LOW_PASSAGE_CR;
  const guesses = revivals.map((entry) => Object.freeze({ id: entry.id, guess: uniformInteger(dice, count), survived: Boolean(entry.survived) }));
  const winners = guesses.filter((entry) => entry.guess === survivors);
  const shareCr = winners.length ? Math.floor(potCr / winners.length) : 0;
  const paid = winners.filter((entry) => entry.survived);
  const paidCr = shareCr * paid.length;
  return Object.freeze({
    potCr,
    survivors,
    guesses: Object.freeze(guesses),
    winners: Object.freeze(winners.map((entry) => entry.id)),
    paidTo: Object.freeze(paid.map((entry) => entry.id)),
    shareCr,
    paidCr,
    keptCr: potCr - paidCr
  });
}

export function settleLowPassageLottery(ship, lottery, { dateLabel = null } = {}) {
  assertValidShipDocument(ship);
  if (!lottery || lottery.paidCr < 1) return cloneJson(ship);
  const who = lottery.paidTo.length === 1 ? 'one survivor' : `${lottery.paidTo.length} survivors`;
  return debitShipAccount(ship, lottery.paidCr, {
    kind: 'lottery',
    description: `Low-passage lottery, Cr${lottery.potCr} pot paid to ${who} (Book 2 p.2)`,
    dateLabel
  });
}

/**
 * Revive every low passenger bound for `systemId` and hold the lottery.
 * Leaves the manifest alone: disembarkPassengersAtDestination takes them all
 * off, and credits every fare, since Book 2 p.2 allows no refund for a
 * passenger who does not survive.
 */
export function reviveLowPassengers(ship, dice, { systemId, medicExpertise = 0 } = {}) {
  assertValidShipDocument(ship);
  requireDice(dice);
  const destination = String(systemId ?? '').trim();
  if (!destination) throw new TypeError('systemId must be nonblank');
  const revivals = ship.state.passengerManifest
    .filter((entry) => entry.class === 'low' && entry.destinationSystemId === destination)
    .map((entry) => {
      const recorded = Number.isInteger(entry.endurance);
      const endurance = recorded ? entry.endurance : rollPassengerEndurance(dice);
      const roll = rollLowBerthRevival(dice, { endurance, medicExpertise });
      return Object.freeze({ id: entry.id, endurance, enduranceRolled: !recorded, ...roll });
    });
  const lottery = rollLowPassageLottery(dice, revivals);
  return Object.freeze({
    revivals: Object.freeze(revivals),
    survived: Object.freeze(revivals.filter((entry) => entry.survived).map((entry) => entry.id)),
    died: Object.freeze(revivals.filter((entry) => !entry.survived).map((entry) => entry.id)),
    medicExpertise,
    lottery
  });
}

// --------------------------------------------------------- orbit, shuttles

// Book 2 p.8: "The typical cost of shuttle service is 1/100 of the normal
// interstellar freight or passage cost" — Cr10 a ton of cargo.
export const SHUTTLE_FARE_RATE = 0.01;
export const SHUTTLE_FREIGHT_PER_TON_CR = 10;
// RULING: shuttles "present at a starport" — classes A to D. Class E is a
// bare landing area and X is none.
export const SHUTTLE_SERVICE_STARPORTS = Object.freeze(['A', 'B', 'C', 'D']);
const SMALL_CRAFT_PATTERN = /ship'?s[\s_-]*boat|pinnace|cutter|shuttle/i;

export function shuttleFareCr(passageClass) {
  const fare = PASSAGE_FARES_CR[passageClass];
  if (!Number.isInteger(fare)) throw new RangeError('passageClass must be high, middle, or low');
  return Math.round(fare * SHUTTLE_FARE_RATE);
}

/** A ship's vehicle that can reach orbit: boat, pinnace, cutter or shuttle (p.15). */
export function shipCarriesSmallCraft(ship) {
  assertValidShipDocument(ship);
  return SMALL_CRAFT_PATTERN.test(JSON.stringify(ship.specifications.vehicles ?? []));
}

/**
 * How the ship's own goods get between hold and starport. A landed ship
 * unloads at the dock. An orbiting one uses its own small craft (free), or
 * the starport's shuttles at Cr10 a ton, or cannot move them at all.
 *
 * RULING: p.8's orbit-to-orbit delivery means freight and passengers boarded
 * by an orbiting ship pay their own shuttle — only the ship's own speculative
 * goods cost the ship anything. Berthing is charged the same either way (p.6
 * covers "handling costs" as well as landing).
 */
export function orbitalTransfer(ship, { starport } = {}) {
  assertValidShipDocument(ship);
  const port = String(starport ?? '').trim().toUpperCase();
  const berth = ship.state.portCall?.berth ?? (ship.specifications.hull.streamlined ? 'surface' : 'orbit');
  if (berth === 'surface') return Object.freeze({ berth, available: true, via: 'landed', perTonCr: 0, reason: null });
  if (shipCarriesSmallCraft(ship)) return Object.freeze({ berth, available: true, via: 'own-craft', perTonCr: 0, reason: null });
  if (SHUTTLE_SERVICE_STARPORTS.includes(port)) return Object.freeze({ berth, available: true, via: 'starport-shuttle', perTonCr: SHUTTLE_FREIGHT_PER_TON_CR, reason: null });
  return Object.freeze({ berth, available: false, via: null, perTonCr: null,
    reason: `no shuttle service at a class ${port || '?'} starport, and the ship carries no small craft to ferry its own goods` });
}

export function shuttleFreightCostCr(ship, { tons, starport } = {}) {
  if (!Number.isFinite(tons) || tons < 0) throw new TypeError('tons must be a non-negative number');
  const transfer = orbitalTransfer(ship, { starport });
  if (!transfer.available) throw new RangeError(transfer.reason);
  return Math.ceil(tons * transfer.perTonCr);
}

export function chargeShuttleFreight(ship, { tons, starport, dateLabel = null, description = null } = {}) {
  const transfer = orbitalTransfer(ship, { starport });
  const costCr = shuttleFreightCostCr(ship, { tons, starport });
  if (costCr === 0) return Object.freeze({ ship: cloneJson(ship), costCr, via: transfer.via });
  const next = debitShipAccount(ship, costCr, {
    kind: 'shuttle',
    description: description ?? `Shuttle, ${tons} t between orbit and surface (Book 2 p.8)`,
    dateLabel
  });
  return Object.freeze({ ship: next, costCr, via: transfer.via });
}

// ----------------------------------------------------------- repossession

export const REPOSSESSION_AVOID_THROW = 12;
export const REPOSSESSION_HEXES_PER_DM = 5;
export const REPOSSESSION_DISTANCE_DM_MAX = 9;
export const REPOSSESSION_REPEAT_CALL_DM = -2;
export const REPOSSESSION_REPEAT_WINDOW_DAYS = 60;

// RULING (non-RAW): p.3 names the range — papers, injunctions, armed
// boarding parties — without a table. 1D picks one.
export const REPOSSESSION_FORMS = Object.freeze({
  1: 'papers', 2: 'papers', 3: 'papers', 4: 'injunction', 5: 'injunction', 6: 'boarding'
});

/**
 * Book 2 p.3: +1 per 5 hexes from the home planet (to +9); -2 if the ship
 * has called at this world twice within two months. RULING: an earlier
 * call here in the last 60 days makes this one the second. `hexesFromHome`
 * is the caller's to measure; null when the home is unknown.
 */
export function repossessionDMParts(ship, { systemId, dateLabel, hexesFromHome = null } = {}) {
  assertValidShipDocument(ship);
  const now = assertGameDate(dateLabel, 'dateLabel');
  const parts = [];
  if (hexesFromHome !== null) {
    if (!Number.isInteger(hexesFromHome) || hexesFromHome < 0) throw new RangeError('hexesFromHome must be a non-negative integer or null');
    const dm = Math.min(REPOSSESSION_DISTANCE_DM_MAX, Math.floor(hexesFromHome / REPOSSESSION_HEXES_PER_DM));
    if (dm > 0) parts.push({ dm, why: `${hexesFromHome} hexes from home` });
  }
  const earlier = ship.state.portCallHistory.filter((entry) => {
    const on = parseGameDate(entry.arrivalDate);
    return entry.systemId === systemId && on !== null && on < now && now - on <= REPOSSESSION_REPEAT_WINDOW_DAYS;
  });
  if (earlier.length) parts.push({ dm: REPOSSESSION_REPEAT_CALL_DM, why: `called here within ${REPOSSESSION_REPEAT_WINDOW_DAYS} days` });
  return Object.freeze(parts);
}

/** Book 2 p.3: throw 12+ to avoid a repossession attempt. */
export function rollRepossession(dice, { dm = 0 } = {}) {
  requireDice(dice);
  const rolled = dice.roll2D6();
  const total = rolled.total + dm;
  if (total >= REPOSSESSION_AVOID_THROW) return Object.freeze({ dice: rolled.dice, dm, total, attempt: false, formRoll: null, form: null });
  const formRoll = dice.rollD6();
  return Object.freeze({ dice: rolled.dice, dm, total, attempt: true, formRoll, form: REPOSSESSION_FORMS[formRoll] });
}

/**
 * The whole throw at a landing (RULING: an orbital berth counts). Only a
 * skipped ship — mortgage periods fallen due and unpaid — is at risk.
 */
export function checkRepossession(ship, dice, { systemId, dateLabel, hexesFromHome = null } = {}) {
  assertValidShipDocument(ship);
  requireDice(dice);
  const schedule = shipMortgageSchedule(ship, { dateLabel });
  if (!schedule.skipped) return Object.freeze({ applies: false, schedule, dmParts: Object.freeze([]), roll: null, attempt: false, form: null });
  const dmParts = repossessionDMParts(ship, { systemId, dateLabel, hexesFromHome });
  const roll = rollRepossession(dice, { dm: dmParts.reduce((sum, part) => sum + part.dm, 0) });
  return Object.freeze({ applies: true, schedule, dmParts, roll, attempt: roll.attempt, form: roll.form });
}

/** Hold the ship where it lies. A held ship may not depart. */
export function impoundShip(ship, { systemId, dateLabel, form } = {}) {
  assertValidShipDocument(ship);
  assertGameDate(dateLabel, 'dateLabel');
  const schedule = shipMortgageSchedule(ship, { dateLabel });
  const next = cloneJson(ship);
  next.state.impound = { systemId: String(systemId ?? '').trim(), since: dateLabel, form, arrearsCr: schedule.arrearsCr };
  assertValidShipDocument(next);
  return next;
}

export function shipImpound(ship) {
  assertValidShipDocument(ship);
  return ship.state.impound ?? null;
}

/**
 * Lift the hold once the arrears are paid (chargeShipUpkeep pays them). A
 * boarding party beaten off lifts it with `repelled: true` — the debt stands,
 * and the next landing throws again.
 */
export function releaseImpound(ship, { dateLabel, repelled = false } = {}) {
  assertValidShipDocument(ship);
  if (!ship.state.impound) return cloneJson(ship);
  if (repelled && ship.state.impound.form !== 'boarding') throw new RangeError('only a boarding party can be repelled');
  if (!repelled && shipMortgageSchedule(ship, { dateLabel }).skipped) throw new RangeError('the arrears are still unpaid');
  const next = cloneJson(ship);
  next.state.impound = null;
  assertValidShipDocument(next);
  return next;
}

// -------------------------------------------------------- private messages

export const PRIVATE_MESSAGE_THROW = 9;
export const PRIVATE_MESSAGE_HONORARIUM_STEP_CR = 20;
// RULING: the recipient is one of p.8's own two examples, 1D.
export const PRIVATE_MESSAGE_RECIPIENTS = Object.freeze({
  1: "the Travellers' Aid Society", 2: "the Travellers' Aid Society", 3: "the Travellers' Aid Society",
  4: 'a tavern keeper', 5: 'a tavern keeper', 6: 'a tavern keeper'
});

/**
 * Book 2 p.8: throw 9+ for a private message awaiting transmittal; a crew
 * member chosen at random is approached; the honorarium is Cr20 to 120
 * (1D x 20).
 */
export function rollPrivateMessage(ship, dice) {
  assertValidShipDocument(ship);
  requireDice(dice);
  const rolled = dice.roll2D6();
  const crew = crewMembers(ship);
  if (rolled.total < PRIVATE_MESSAGE_THROW || !crew.length) {
    return Object.freeze({ dice: rolled.dice, total: rolled.total, awaiting: false, carrierId: null, carrierName: null, recipient: null, honorariumCr: 0 });
  }
  const carrier = crew[uniformInteger(dice, crew.length - 1)];
  const honorariumCr = dice.rollD6() * PRIVATE_MESSAGE_HONORARIUM_STEP_CR;
  const recipient = PRIVATE_MESSAGE_RECIPIENTS[dice.rollD6()];
  return Object.freeze({ dice: rolled.dice, total: rolled.total, awaiting: true, carrierId: carrier.characterId, carrierName: carrier.characterName, recipient, honorariumCr });
}

/**
 * The approached crew member takes the message. RULING: the honorarium is
 * his, not the ship's — it "accompanies" the message, so it is paid now.
 */
export function acceptPrivateMessage(ship, character, { offer, id, originSystemId, destinationSystemId, dateLabel } = {}) {
  assertValidShipDocument(ship);
  assertValidCharacterDocument(character);
  assertGameDate(dateLabel, 'dateLabel');
  if (!offer?.awaiting) throw new RangeError('no private message is awaiting transmittal');
  if (character.identity.id !== offer.carrierId) throw new RangeError('the message was offered to another crew member');
  const messageId = String(id ?? '').trim();
  if (!messageId) throw new TypeError('message id must be nonblank');
  if (ship.state.privateMessages.some((entry) => entry.id === messageId)) throw new RangeError('that message is already aboard');
  const nextShip = cloneJson(ship);
  nextShip.state.privateMessages.push({
    id: messageId,
    carrierId: offer.carrierId,
    carrierName: offer.carrierName ?? '',
    originSystemId: String(originSystemId ?? '').trim(),
    destinationSystemId: String(destinationSystemId ?? '').trim(),
    recipient: offer.recipient,
    honorariumCr: offer.honorariumCr,
    acceptedOn: dateLabel
  });
  assertValidShipDocument(nextShip);
  const nextCharacter = cloneJson(character);
  nextCharacter.finances.credits += offer.honorariumCr;
  assertValidCharacterDocument(nextCharacter);
  return Object.freeze({ ship: nextShip, character: nextCharacter });
}

/** Messages for this world are handed over; the carrier is introduced. */
export function deliverPrivateMessages(ship, systemId) {
  assertValidShipDocument(ship);
  const destination = String(systemId ?? '').trim();
  const delivered = ship.state.privateMessages.filter((entry) => entry.destinationSystemId === destination);
  const next = cloneJson(ship);
  next.state.privateMessages = next.state.privateMessages.filter((entry) => entry.destinationSystemId !== destination);
  assertValidShipDocument(next);
  return Object.freeze({ ship: next, delivered: Object.freeze(delivered) });
}

// --------------------------------------------------- hail and inspection

// Book 3's reaction table: 2-5 Violent/Hostile, 9+ Intrigued and up.
export const SHIP_REACTION_HOSTILE_MAX = 5;
export const SHIP_REACTION_FRIENDLY_MIN = 9;
export const HAIL_ENCOUNTER_KEYS = Object.freeze(['free-trader', 'subsidized-merchant']);
export const INSPECTION_ENCOUNTER_KEYS = Object.freeze(['patrol']);
export const HAIL_BROKER_TIP_DM = 1;

export function shipReactionStance(reaction) {
  const total = Number(reaction?.tableTotal);
  if (!Number.isInteger(total)) throw new TypeError('reaction must carry a tableTotal');
  if (total <= SHIP_REACTION_HOSTILE_MAX) return 'hostile';
  if (total >= SHIP_REACTION_FRIENDLY_MIN) return 'friendly';
  return 'neutral';
}

/**
 * Book 2 p.36: free traders and subsidized merchants "may serve as a source
 * of information". RULING: a friendly hail is a broker's tip (+1) on the next
 * speculative resale at this port; a hostile one opens fire.
 */
export function resolveHail(encounterKey, reaction) {
  if (!HAIL_ENCOUNTER_KEYS.includes(encounterKey)) throw new RangeError('only a free trader or subsidized merchant answers a hail');
  const stance = shipReactionStance(reaction);
  const outcome = stance === 'hostile' ? 'fight' : stance === 'friendly' ? 'tip' : 'nothing';
  return Object.freeze({ stance, outcome, brokerTipDM: outcome === 'tip' ? HAIL_BROKER_TIP_DM : 0 });
}

/** RULING: no toll size is given; a day's berthing is the one fee on hand. */
export function inspectionTollCr() {
  return calculateBerthingCost(1);
}

/**
 * Book 2 p.36: patrols "may be simple border pickets, or may be a form of
 * pirate, exacting tolls or penalties". Hostile fights, friendly waves the
 * ship through, anything between demands a toll.
 */
export function resolveInspection(encounterKey, reaction) {
  if (!INSPECTION_ENCOUNTER_KEYS.includes(encounterKey)) throw new RangeError('only a patrol conducts an inspection');
  const stance = shipReactionStance(reaction);
  const outcome = stance === 'hostile' ? 'fight' : stance === 'friendly' ? 'waved-through' : 'toll';
  return Object.freeze({ stance, outcome, tollCr: outcome === 'toll' ? inspectionTollCr() : 0 });
}

export function payInspectionToll(ship, { tollCr, description, dateLabel = null } = {}) {
  return debitShipAccount(ship, tollCr, { kind: 'toll', description: description ?? 'Patrol inspection toll (Book 2 p.36)', dateLabel });
}

/** The tip lives on the port call, so it outlasts a reload but not the stay. */
export function grantBrokerTip(ship, { dm = HAIL_BROKER_TIP_DM } = {}) {
  assertValidShipDocument(ship);
  if (!ship.state.portCall) throw new RangeError('no current port call is recorded');
  if (!Number.isInteger(dm) || dm < 0) throw new TypeError('dm must be a non-negative integer');
  const next = cloneJson(ship);
  next.state.portCall.brokerTipDM = Math.max(next.state.portCall.brokerTipDM, dm);
  assertValidShipDocument(next);
  return next;
}

export function portCallBrokerTipDM(ship, systemId) {
  const call = ship?.state?.portCall;
  return call && call.systemId === systemId ? Number(call.brokerTipDM ?? 0) : 0;
}

/** A tip is good for one resale. */
export function spendBrokerTip(ship) {
  assertValidShipDocument(ship);
  if (!ship.state.portCall || ship.state.portCall.brokerTipDM === 0) return cloneJson(ship);
  const next = cloneJson(ship);
  next.state.portCall.brokerTipDM = 0;
  assertValidShipDocument(next);
  return next;
}

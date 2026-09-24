// trip.js — a party's trip as one plain state, stepped by legal actions.
//
// v0.312.0. Build-order step 4. No DOM, no registry, no cloud: documents in,
// documents out, every throw seeded so the same state and action always give
// the same result. The client moves onto this in the next slice; until then
// play-session.js keeps its own copy of the port and arrival logic.
//
//   createTrip(resolved, options)          the state, from a resolved campaign
//   listActions(state, context)            what may be done now
//   applyAction(state, action, context)    { state, events }
//
// Situations: port, in-jump, encounter, stranded, destroyed, halted. A
// halted trip waits for something only a person or the combat engine can
// settle (a hijack, a ship fight, a boarding party, an aging crisis); a
// headless run records why and stops.

import {
  addDays, daysBetween, advanceClock, beginJump, departureChecklist, resolveJumpWeek, shipBatteryStatus,
  getSubsectorSystem, getJumpDestinations, parseUniversalWorldProfile, starportFuelService, purchaseShipFuel,
  skimGasGiantToCapacity, payCurrentBerthing, performMaintenance, shipMaintenanceStatus, canShipMakeJump,
  calculateLifeSupportCostForTrip, chargeLifeSupportForTrip, deliverFreightAtDestination, disembarkPassengersAtDestination,
  beginPortCall, calculateBerthingCost, creditShipAccount, unloadCargo, loadCargo, bookPassenger, availablePassengerCapacity,
  generateFreightOffers, generatePassengerDemand, rollShipEncounter, rollReaction, chargeShipUpkeep, shipMortgageSchedule,
  reviveLowPassengers, settleLowPassageLottery, attendingMedicExpertise, rollPassengerEndurance,
  checkRepossession, impoundShip, releaseImpound, rollPrivateMessage, acceptPrivateMessage, deliverPrivateMessages,
  resolveHail, resolveInspection, payInspectionToll, grantBrokerTip, HAIL_ENCOUNTER_KEYS, INSPECTION_ENCOUNTER_KEYS,
  completeDriveRepair, DRIVE_REPAIR_STARPORTS,
  FREIGHT_RATE_PER_TON_CR, PASSAGE_FARES_CR, laneBetween
} from '../../vendor/classic-traveller-rules/index.js';
import { advanceCampaignDays, updateCampaignLocation } from '../campaign-document.js';
import { completeContractDocument, failContractDocument, isContractOverdue, reconcileContractDeadlines } from '../contract-document.js';
import { campaignDateKey, routeMarketSeed, seededDice } from '../../client/commerce-market.js';

export const TRIP_SITUATIONS = Object.freeze(['port', 'in-jump', 'encounter', 'stranded', 'destroyed', 'halted']);

// Book 2 p.32 sells flight-plan cassettes "for all worlds within jump range,
// and for which space lanes exist"; Book 3 p.2 charts those lanes on the
// subsector (subsector.routes, rolled once — see routes.js). 'charted' is
// the rule; 'always' and 'never' are for testing what the lanes change.
export const LANE_RULES = Object.freeze(['charted', 'always', 'never']);

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

const cr = (amount) => `Cr${Number(amount).toLocaleString('en-US')}`;

export function tripDate(state) {
  const { year, dayOfYear } = state.campaign.time;
  return `${String(dayOfYear).padStart(3, '0')}-${year}`;
}

function seeded(state, text) {
  return seededDice(state.seed ? `${state.seed}|${text}` : text);
}

function systemOf(context, systemId) {
  try { return getSubsectorSystem(context.subsector, systemId); } catch { return null; }
}

function firstLedgerDate(ship) {
  return ship.state.finances?.ledger?.[0]?.date ?? null;
}

function unpaidCrew(ship) {
  return ship.authority?.assignedCharacterId ? [ship.authority.assignedCharacterId] : [];
}

function skillOf(state, characterId, skill) {
  const character = state.characters.find((entry) => entry.identity.id === characterId);
  return Number(character?.skills?.[skill] ?? 0) || 0;
}

function bestCrewSkill(state, role, skill) {
  const holders = state.ship.crew.assignments.filter((entry) => String(entry.role).toLowerCase() === role);
  if (!holders.length) return null;
  return Math.max(...holders.map((entry) => skillOf(state, entry.characterId, skill)));
}

function event(state, kind, text, data = {}) {
  return Object.freeze({ date: tripDate(state), kind, text, ...data });
}

/** A trip from a resolved campaign: { campaign, ships, characters, contracts }. */
export function createTrip(resolved, { seed = '', lanes = 'charted' } = {}) {
  if (!LANE_RULES.includes(lanes)) throw new RangeError(`lanes must be ${LANE_RULES.join(', ')}`);
  const campaign = resolved.campaign;
  const ship = (resolved.ships ?? []).find((entry) => entry.identity.id === campaign.activeShipId) ?? resolved.ships?.[0];
  if (!ship) throw new Error('a trip needs a ship');
  const partyIds = campaign.party?.characterIds ?? [];
  const characters = (resolved.characters ?? []).filter((entry) => partyIds.includes(entry.identity.id));
  return {
    runner: 1,
    seed: String(seed),
    lanes,
    situation: 'port',
    campaign: cloneJson(campaign),
    ship: cloneJson(ship),
    characters: cloneJson(characters),
    contracts: cloneJson(resolved.contracts ?? []),
    destinationId: null,
    lastSystemId: null,
    encounter: null,
    jump: null,
    halt: null,
    arrivals: 0
  };
}

// --------------------------------------------------------------- the clock

// Days pass through the step 1 clock, so salaries, the mortgage and aging
// fall on their own dates. An aging crisis halts the trip.
function passDays(state, days, reason) {
  if (days <= 0) return { state, events: [] };
  const from = tripDate(state);
  const to = addDays(from, days);
  const since = firstLedgerDate(state.ship);
  const clock = advanceClock({ dateLabel: from, ships: [state.ship], characters: state.characters }, to, {
    dice: seeded(state, `${state.campaign.identity.id}|clock|${from}|${to}`),
    unpaid: { [state.ship.identity.id]: unpaidCrew(state.ship) },
    sinceLabels: since ? { [state.ship.identity.id]: since } : {}
  });
  const next = { ...state, ship: clock.ships[0], characters: clock.characters };
  next.campaign = advanceCampaignDays(state.campaign, daysBetween(from, clock.dateLabel));
  const events = [];
  for (const fired of clock.fired) {
    if (fired.kind === 'upkeep' && (fired.paidCr > 0 || fired.outstandingCr > 0)) {
      events.push(Object.freeze({ date: fired.date, kind: 'upkeep', text: `upkeep ${cr(fired.paidCr)} paid${fired.outstandingCr ? `, ${cr(fired.outstandingCr)} outstanding` : ''}${fired.mortgageSkipped ? ' (mortgage skipped)' : ''}`, paidCr: fired.paidCr, outstandingCr: fired.outstandingCr }));
    } else if (fired.kind === 'maintenance-due') {
      events.push(Object.freeze({ date: fired.date, kind: 'maintenance-due', text: `annual maintenance due (${cr(fired.costCr)})` }));
    } else if (fired.kind === 'aging') {
      events.push(Object.freeze({ date: fired.date, kind: 'aging', text: `aging throws at ${fired.checkpointAge}`, characterId: fired.characterId }));
    }
  }
  if (clock.stoppedAt?.kind === 'aging-crisis') {
    next.halt = { reason: 'aging-crisis', detail: `aging crisis for ${clock.stoppedAt.characterId}`, from: next.situation };
    next.situation = 'halted';
    events.push(event(next, 'halt', `aging crisis — ${reason ?? 'time passing'} stopped`));
  }
  return { state: next, events };
}

// ------------------------------------------------------------------- port

/** What the port offers, read from the documents. */
export function portFacts(state, context) {
  const { ship, campaign } = state;
  const system = systemOf(context, campaign.location?.systemId);
  const profile = system ? parseUniversalWorldProfile(system.mainWorld.uwp) : null;
  const dateLabel = tripDate(state);
  const portCall = ship.state.portCall?.systemId === system?.id ? ship.state.portCall : null;
  const fuelService = system && profile ? starportFuelService(profile.starport, { scoutBase: system.bases?.scout, ship }) : null;
  const capacity = ship.specifications.fuel.capacityTons;
  const aboard = Number.isFinite(ship.state.currentFuelTons) ? ship.state.currentFuelTons : 0;
  const rating = ship.specifications.drives.jump.rating;
  const destinations = system ? getJumpDestinations(context.subsector, system.id, rating) : [];
  const target = state.destinationId ? systemOf(context, state.destinationId) : null;
  const distance = target ? destinations.find((entry) => entry.system.id === target.id)?.distance ?? null : null;
  let route = null;
  if (target && distance && profile) {
    const targetProfile = parseUniversalWorldProfile(target.mainWorld.uwp);
    const demand = generatePassengerDemand(profile, targetProfile, { destinationTravelZone: target.travelZone,
      dice: seeded(state, routeMarketSeed(campaign, system.id, target.id, 'passengers')) });
    const offers = generateFreightOffers(profile, targetProfile, { destinationTravelZone: target.travelZone,
      dice: seeded(state, routeMarketSeed(campaign, system.id, target.id, 'freight')),
      idPrefix: `freight-${campaignDateKey(campaign)}-${system.id}-${target.id}` }).offers;
    const aboardIds = new Set(ship.state.cargoManifest.map((entry) => entry.id));
    const freeHold = Math.max(0, ship.specifications.cargo.capacityTons - ship.state.cargoUsedTons);
    const booked = (passageClass) => ship.state.passengerManifest.filter((entry) => entry.originSystemId === system.id && entry.destinationSystemId === target.id && entry.class === passageClass).length;
    const stewards = ship.crew.assignments.filter((entry) => String(entry.role).toLowerCase() === 'steward').length;
    route = {
      target, distance, freeHold,
      freight: offers.filter((entry) => !aboardIds.has(entry.id)),
      classes: ['high', 'middle', 'low'].map((passageClass) => {
        const waiting = Math.max(0, (demand[passageClass] ?? 0) - booked(passageClass));
        const berths = availablePassengerCapacity(ship, passageClass);
        return { passageClass, waiting, booked: booked(passageClass), count: Math.min(waiting, berths), blocked: passageClass === 'high' && stewards < 1 };
      })
    };
  }
  let message = null;
  if (portCall && target && distance) {
    const carrying = ship.state.privateMessages.some((entry) => entry.originSystemId === system.id && entry.destinationSystemId === target.id);
    if (!carrying) {
      const offer = rollPrivateMessage(ship, seeded(state, `${campaign.identity.id}|message|${system.id}|${portCall.arrivalDate ?? ''}|${target.id}`));
      const carrier = offer.awaiting ? state.characters.find((entry) => entry.identity.id === offer.carrierId) ?? null : null;
      if (offer.awaiting && carrier) message = { offer, carrier, id: `msg-${campaignDateKey(campaign)}-${system.id}-${target.id}` };
    }
  }
  const lane = state.lanes === 'always' || (state.lanes === 'charted' && Boolean(system && target && laneBetween(context.subsector, system.id, target.id)));
  const checklist = target && distance ? departureChecklist(ship, { distance, dateLabel, sinceLabel: firstLedgerDate(ship), laneExists: lane }) : null;
  const maintenance = shipMaintenanceStatus(ship, { dateLabel, sinceLabel: firstLedgerDate(ship) });
  const daysInPort = portCall?.arrivalDate ? daysBetween(portCall.arrivalDate, dateLabel) : 0;
  return {
    system, profile, portCall, fuelService, destinations, target, distance, route, message, checklist, maintenance, lane, daysInPort,
    fuel: { aboard, capacity, missing: Math.max(0, capacity - aboard) },
    berthingOwed: Boolean(portCall && !portCall.berthingPaid && portCall.berthingDueCr > 0),
    impound: ship.state.impound && ship.state.impound.systemId === system?.id ? ship.state.impound : null,
    arrears: shipMortgageSchedule(ship, { dateLabel }).arrearsCr
  };
}

function exclusiveContract(state) {
  return state.contracts.find((entry) => entry.status === 'accepted' && entry.requirements?.exclusiveShip) ?? null;
}

// -------------------------------------------------------------- listActions

export function listActions(state, context) {
  if (state.situation === 'in-jump') return [{ type: 'jump-week', label: `A week in jump space (${state.jump.weeksDone + 1} of ${state.jump.weeks})` }];
  if (state.situation === 'encounter') {
    const encounter = state.encounter;
    if (encounter.tollDemandCr) {
      return [
        ...(state.ship.state.finances.balanceCr >= encounter.tollDemandCr ? [{ type: 'pay-toll', label: `Pay ${cr(encounter.tollDemandCr)}` }] : []),
        { type: 'refuse-toll', label: 'Refuse' }
      ];
    }
    return [
      { type: 'let-pass', label: 'Let it pass' },
      { type: 'fight', label: 'Fight' },
      ...(HAIL_ENCOUNTER_KEYS.includes(encounter.key) ? [{ type: 'hail', label: 'Hail' }] : []),
      ...(INSPECTION_ENCOUNTER_KEYS.includes(encounter.key) ? [{ type: 'inspect', label: 'Submit to inspection' }] : [])
    ];
  }
  if (state.situation !== 'port') return [];

  const facts = portFacts(state, context);
  const { ship } = state;
  const balance = ship.state.finances.balanceCr;
  const actions = [];
  if (facts.impound) {
    if (facts.impound.form === 'boarding') return [];
    if (balance >= facts.arrears) actions.push({ type: 'pay-arrears', label: `Pay ${cr(facts.arrears)} arrears` });
    return actions;
  }
  if (facts.berthingOwed && balance >= facts.portCall.berthingDueCr) actions.push({ type: 'pay-berthing', label: `Pay berthing ${cr(facts.portCall.berthingDueCr)}` });
  // 1982: a malfunction is patched in flight; "more complete repairs" wait
  // for a starport with repair facilities (class A-C).
  if (ship.state.malfunction?.failed?.length && DRIVE_REPAIR_STARPORTS.includes(facts.profile?.starport)) {
    actions.push({ type: 'repair-drives', label: `Repair ${ship.state.malfunction.failed.join(', ')}` });
  }
  if (facts.portCall) actions.push({ type: 'wait', label: 'Spend a day in port', days: 1, daysInPort: facts.daysInPort });
  if (['A', 'B'].includes(facts.profile?.starport) && facts.maintenance.status !== 'unknown' && facts.maintenance.costCr <= balance) {
    actions.push({ type: 'maintain', label: `Annual overhaul ${cr(facts.maintenance.costCr)}`, overdue: facts.maintenance.overdue, daysUntilDue: facts.maintenance.daysUntilDue });
  }
  if (facts.fuel.missing >= 1 && facts.fuelService?.available) {
    const cost = facts.fuel.missing * facts.fuelService.pricePerTonCr;
    if (cost <= balance) actions.push({ type: 'fuel-fill', label: `Fill ${facts.fuel.missing} t ${facts.fuelService.quality}`, costCr: cost, quality: facts.fuelService.quality });
  }
  if (facts.fuel.missing >= 1 && facts.system?.gasGiant && ship.specifications.hull.streamlined) {
    actions.push({ type: 'fuel-skim', label: `Skim ${facts.fuel.missing} t unrefined`, days: 7 });
  }
  for (const entry of facts.destinations) {
    if (entry.system.id !== state.destinationId) actions.push({ type: 'choose-destination', systemId: entry.system.id, distance: entry.distance, label: `Set course for ${entry.system.name}` });
  }
  if (facts.route && !exclusiveContract(state)) {
    for (const offer of facts.route.freight) {
      if (offer.tons <= facts.route.freeHold + 1e-9) actions.push({ type: 'load-freight', offerId: offer.id, tons: offer.tons, revenueCr: offer.revenueCr, label: `Load ${offer.tons} t freight` });
    }
    for (const entry of facts.route.classes) {
      if (entry.count > 0 && !entry.blocked) actions.push({ type: 'book-passengers', passageClass: entry.passageClass, count: entry.count, label: `Book ${entry.count} ${entry.passageClass}` });
    }
  }
  if (facts.message) actions.push({ type: 'carry-message', label: `Carry a message (${cr(facts.message.offer.honorariumCr)})` });
  if (facts.target && facts.distance && !facts.berthingOwed) actions.push({ type: 'depart', label: `Depart for ${facts.target.name}`, ready: facts.checklist?.ok ?? false });
  return actions;
}

// ------------------------------------------------------------ applyAction

export function applyAction(state, action, context) {
  const type = action?.type;
  const legal = listActions(state, context);
  const match = legal.find((entry) => entry.type === type
    && (entry.systemId === undefined || entry.systemId === action.systemId)
    && (entry.offerId === undefined || entry.offerId === action.offerId)
    && (entry.passageClass === undefined || entry.passageClass === action.passageClass));
  if (!match) throw new Error(`${type ?? 'no action'} is not legal while ${state.situation}`);
  const handler = HANDLERS[type];
  return handler(cloneJson(state), action, context);
}

const one = (state, events) => ({ state, events });

const HANDLERS = {
  'pay-berthing'(state, action, context) {
    const facts = portFacts(state, context);
    const result = payCurrentBerthing(state.ship, { dateLabel: tripDate(state), description: `${facts.system.name} starport berthing` });
    state.ship = result.ship;
    return one(state, [event(state, 'port', `berthing paid, ${cr(result.costCr)}`)]);
  },

  'repair-drives'(state, action, context) {
    const facts = portFacts(state, context);
    const failed = [...state.ship.state.malfunction.failed];
    state.ship = completeDriveRepair(state.ship, { starport: facts.profile.starport });
    return one(state, [event(state, 'port', `${failed.join(', ')} repaired at the class ${facts.profile.starport} starport`)]);
  },

  wait(state, action) {
    const days = Number.isInteger(action.days) && action.days > 0 ? action.days : 1;
    const passed = passDays(state, days, 'waiting in port');
    return one(passed.state, passed.events);
  },

  'pay-arrears'(state) {
    const dateLabel = tripDate(state);
    const upkeep = chargeShipUpkeep(state.ship, { dateLabel, sinceLabel: firstLedgerDate(state.ship), unpaid: unpaidCrew(state.ship) });
    state.ship = upkeep.ship;
    if (shipMortgageSchedule(state.ship, { dateLabel }).skipped) return one(state, [event(state, 'port', `paid ${cr(upkeep.paidCr)}; still held`)]);
    state.ship = releaseImpound(state.ship, { dateLabel });
    return one(state, [event(state, 'port', `arrears paid (${cr(upkeep.paidCr)}); released`)]);
  },

  maintain(state, action, context) {
    const facts = portFacts(state, context);
    const result = performMaintenance(state.ship, { dateLabel: tripDate(state), starport: facts.profile.starport, scoutBase: Boolean(facts.system.bases?.scout) });
    state.ship = result.ship;
    const passed = passDays(state, result.daysTaken, 'the overhaul');
    return one(passed.state, [event(state, 'port', `annual overhaul, ${cr(result.costCr)}, ${result.daysTaken} days`), ...passed.events]);
  },

  'fuel-fill'(state, action, context) {
    const facts = portFacts(state, context);
    const result = purchaseShipFuel(state.ship, { tons: facts.fuel.missing, quality: facts.fuelService.quality, pricePerTonCr: facts.fuelService.pricePerTonCr, source: facts.fuelService.source, dateLabel: tripDate(state) });
    state.ship = result.ship;
    return one(state, [event(state, 'port', `took on ${result.addedTons} t ${facts.fuelService.quality} fuel, ${result.costCr ? cr(result.costCr) : 'free'}`)]);
  },

  'fuel-skim'(state) {
    const result = skimGasGiantToCapacity(state.ship);
    state.ship = result.ship;
    const passed = passDays(state, result.elapsedDays, 'skimming');
    return one(passed.state, [event(state, 'port', `skimmed ${result.addedTons} t unrefined, ${result.elapsedDays} days`), ...passed.events]);
  },

  'choose-destination'(state, action, context) {
    state.destinationId = action.systemId;
    return one(state, [event(state, 'port', `course set for ${systemOf(context, action.systemId)?.name ?? action.systemId}`)]);
  },

  'load-freight'(state, action, context) {
    const facts = portFacts(state, context);
    const offer = facts.route.freight.find((entry) => entry.id === action.offerId);
    state.ship = loadCargo(state.ship, { id: offer.id, category: 'freight', description: `${offer.tons}t freight to ${facts.target.name}`, tons: offer.tons,
      originSystemId: facts.system.id, destinationSystemId: facts.target.id, acquisitionCostCr: 0,
      notes: `Book 2 freight / Cr${FREIGHT_RATE_PER_TON_CR.toLocaleString('en-US')} per ton on delivery.` });
    return one(state, [event(state, 'port', `loaded ${offer.tons} t freight for ${facts.target.name}, ${cr(offer.revenueCr)} on delivery`)]);
  },

  'book-passengers'(state, action, context) {
    const facts = portFacts(state, context);
    const entry = facts.route.classes.find((candidate) => candidate.passageClass === action.passageClass);
    for (let index = 0; index < entry.count; index += 1) {
      const id = `pass-${campaignDateKey(state.campaign)}-${facts.system.id}-${facts.target.id}-${entry.passageClass}-${entry.booked + index + 1}`;
      const endurance = entry.passageClass === 'low' ? rollPassengerEndurance(seeded(state, `${id}|endurance`)) : null;
      state.ship = bookPassenger(state.ship, { id, passageClass: entry.passageClass, originSystemId: facts.system.id, destinationSystemId: facts.target.id, endurance });
    }
    return one(state, [event(state, 'port', `booked ${entry.count} ${entry.passageClass} for ${facts.target.name}, ${cr(PASSAGE_FARES_CR[entry.passageClass])} each`)]);
  },

  'carry-message'(state, action, context) {
    const facts = portFacts(state, context);
    const { offer, carrier, id } = facts.message;
    const taken = acceptPrivateMessage(state.ship, carrier, { offer, id, originSystemId: facts.system.id, destinationSystemId: facts.target.id, dateLabel: tripDate(state) });
    state.ship = taken.ship;
    state.characters = state.characters.map((entry) => (entry.identity.id === carrier.identity.id ? taken.character : entry));
    return one(state, [event(state, 'port', `${carrier.identity.name} carries a message for ${offer.recipient} at ${facts.target.name}, ${cr(offer.honorariumCr)}`)]);
  },

  depart(state, action, context) {
    const facts = portFacts(state, context);
    const events = [];
    const refuse = (reason, detail) => {
      state.halt = { reason, detail, from: 'port' };
      state.situation = 'halted';
      return one(state, [event(state, 'halt', `departure blocked — ${detail}`, { reason })]);
    };
    const elsewhere = state.ship.state.passengerManifest.filter((entry) => entry.destinationSystemId !== facts.target.id);
    if (elsewhere.length) return refuse('passengers-elsewhere', `passengers aboard for ${[...new Set(elsewhere.map((entry) => entry.destinationSystemId))].join(', ')}`);
    const exclusive = exclusiveContract(state);
    if (exclusive && exclusive.destination?.systemId !== facts.target.id) return refuse('charter-elsewhere', `chartered to ${exclusive.destination?.systemName}`);
    if (!facts.checklist.ok) {
      const blocked = facts.checklist.rows.filter((row) => row.blocking && !row.ok);
      return refuse('departure-checklist', blocked.map((row) => `${row.key}: ${row.detail}`).join('; '));
    }
    const lifeSupport = calculateLifeSupportCostForTrip(state.ship);
    if (lifeSupport.totalCr > state.ship.state.finances.balanceCr) return refuse('life-support', `life support needs ${cr(lifeSupport.totalCr)}`);

    const dateLabel = tripDate(state);
    state.ship = chargeLifeSupportForTrip(state.ship, { dateLabel }).ship;
    const jump = beginJump(state.ship, {
      dice: seeded(state, `${state.campaign.identity.id}|jump|${facts.system.id}|${facts.target.id}|${dateLabel}`),
      distance: facts.distance, fromHex: facts.system.hex, toHex: facts.target.hex, dateLabel,
      sinceLabel: firstLedgerDate(state.ship), laneExists: facts.lane
    });
    state.ship = jump.ship;
    const destination = jump.destination;
    const landedSystem = destination.planned ? facts.target : (destination.inSubsector ? context.subsector.systems.find((system) => system.hex === destination.hex) ?? null : null);
    state.jump = {
      fromSystemId: facts.system.id, toSystemId: facts.target.id, startedOn: dateLabel,
      weeks: jump.weeksInJump ?? 0, weeksDone: 0,
      misjump: jump.misjump.misjump, destroyed: jump.destroyed,
      landedHex: destination.hex ?? `${destination.column},${destination.row}`, landedSystemId: landedSystem?.id ?? null
    };
    state.destinationId = null;
    events.push(event(state, 'depart', `jumped for ${facts.target.name}, ${jump.fuelConsumedTons} t fuel, life support ${cr(lifeSupport.totalCr)}`));
    if (jump.destroyed) {
      state.situation = 'destroyed';
      events.push(event(state, 'misjump', `misjump ${jump.misjump.total} (16+): the ship is lost in jump space`, { destroyed: true }));
      return one(state, events);
    }
    if (jump.misjump.misjump) {
      events.push(event(state, 'misjump', `misjump ${jump.misjump.total}: ${jump.misjump.distanceHexes} hexes, direction ${jump.misjump.direction}, ${jump.weeksInJump} weeks in jump — ${landedSystem ? `emerging at ${landedSystem.name}` : 'emerging in empty space'}`, { distanceHexes: jump.misjump.distanceHexes }));
    }
    state.situation = 'in-jump';
    if (jump.hijack.attempt) {
      state.halt = { reason: 'hijack', detail: `hijack attempt on day ${jump.hijack.day} of the voyage (Book 2 p.3)`, from: 'in-jump' };
      state.situation = 'halted';
      events.push(event(state, 'halt', `a passenger attempts a hijacking (3D: ${jump.hijack.total})`, { reason: 'hijack' }));
    }
    return one(state, events);
  },

  'jump-week'(state, action, context) {
    const weekStartsOn = tripDate(state);
    const week = state.jump.weeksDone + 1;
    const engineeringSkill = bestCrewSkill(state, 'engineer', 'Engineering');
    const result = resolveJumpWeek(state.ship, {
      dice: seeded(state, `${state.campaign.identity.id}|jump-week|${state.jump.startedOn}|${week}`),
      weekStartsOn, sinceLabel: firstLedgerDate(state.ship), engineeringSkill
    });
    state.ship = result.ship;
    const events = [];
    if (result.failure.malfunction) {
      events.push(event(state, 'drive-failure', `drive malfunction (${result.failure.total}): ${result.failure.failed.join(', ') || 'no section failed'}${result.repairs.some((entry) => entry.success) ? ', patched by the engineer' : result.stillFailed.length ? ', still down' : ''}`, { failed: [...result.failure.failed], stillFailed: [...result.stillFailed] }));
    }
    const passed = passDays(state, 7, 'the jump');
    state = passed.state;
    events.push(...passed.events);
    state.jump.weeksDone = week;
    if (state.situation === 'halted') return one(state, events);
    const batteries = shipBatteryStatus(state.ship, { dateLabel: tripDate(state) });
    if (batteries.exhausted) {
      state.halt = { reason: 'batteries-exhausted', detail: 'power plant down and batteries spent (1982: 10 days)', from: 'in-jump' };
      state.situation = 'halted';
      events.push(event(state, 'halt', 'batteries exhausted with the power plant down', { reason: 'batteries-exhausted' }));
      return one(state, events);
    }
    if (week < state.jump.weeks) return one(state, events);
    return arrive(state, events, context);
  },

  'let-pass'(state) {
    const label = state.encounter.label;
    state.encounter = null;
    state.situation = 'port';
    return one(state, [event(state, 'encounter', `${label} let pass`)]);
  },

  fight(state) {
    return haltForFight(state, `${state.encounter.label}: the party chose to fight`);
  },

  hail(state) {
    const encounter = state.encounter;
    const reaction = rollReaction(seeded(state, `${state.campaign.identity.id}|arrival|${encounter.systemId}|${encounter.dateLabel}|hail`));
    const hail = resolveHail(encounter.key, reaction);
    if (hail.outcome === 'fight') return haltForFight(state, `${encounter.label} takes the hail badly and opens fire — ${reaction.description}`);
    if (hail.outcome === 'tip') state.ship = grantBrokerTip(state.ship, { dm: hail.brokerTipDM });
    state.encounter = null;
    state.situation = 'port';
    return one(state, [event(state, 'encounter', hail.outcome === 'tip' ? `${encounter.label} shares word of a buyer (broker tip +${hail.brokerTipDM})` : `${encounter.label} trades pleasantries`)]);
  },

  inspect(state) {
    const encounter = state.encounter;
    const reaction = rollReaction(seeded(state, `${state.campaign.identity.id}|arrival|${encounter.systemId}|${encounter.dateLabel}|inspect`));
    const inspection = resolveInspection(encounter.key, reaction);
    if (inspection.outcome === 'fight') return haltForFight(state, `${encounter.label} turns hostile during the inspection — ${reaction.description}`);
    if (inspection.outcome === 'toll') {
      state.encounter = { ...encounter, tollDemandCr: inspection.tollCr };
      return one(state, [event(state, 'encounter', `${encounter.label} demands ${cr(inspection.tollCr)}`)]);
    }
    state.encounter = null;
    state.situation = 'port';
    return one(state, [event(state, 'encounter', `${encounter.label} waves the ship through`)]);
  },

  'pay-toll'(state) {
    const encounter = state.encounter;
    state.ship = payInspectionToll(state.ship, { tollCr: encounter.tollDemandCr, description: `${encounter.label} inspection toll`, dateLabel: tripDate(state) });
    state.encounter = null;
    state.situation = 'port';
    return one(state, [event(state, 'encounter', `paid ${cr(encounter.tollDemandCr)} toll to ${encounter.label}`)]);
  },

  'refuse-toll'(state) {
    return haltForFight(state, `refused ${state.encounter.label}'s toll; it opens fire`);
  }
};

function haltForFight(state, detail) {
  state.halt = { reason: 'ship-fight', detail, from: 'encounter', encounter: state.encounter };
  state.encounter = null;
  state.situation = 'halted';
  return one(state, [event(state, 'halt', detail, { reason: 'ship-fight' })]);
}

// ------------------------------------------------------------------ arrival

function arrive(state, events, context) {
  const jump = state.jump;
  const target = jump.landedSystemId ? systemOf(context, jump.landedSystemId) : null;
  state.jump = null;
  if (!target) {
    state.situation = 'stranded';
    events.push(event(state, 'stranded', `emerged in empty space at ${jump.landedHex}; no world, no port`));
    return one(state, events);
  }
  const arrivedOn = tripDate(state);
  const targetProfile = parseUniversalWorldProfile(target.mainWorld.uwp);
  // Seeded on the departure date, as play-session.js does, so the same trip
  // meets the same traffic in either.
  const arrivalSeed = `${state.campaign.identity.id}|arrival|${target.id}|${jump.startedOn}`;
  state.campaign = updateCampaignLocation(state.campaign, { systemId: target.id, systemName: target.name, worldId: target.mainWorld.id, worldName: target.mainWorld.name });

  const medicalById = Object.fromEntries(state.characters.map((entry) => [entry.identity.id, Number(entry.skills?.Medical ?? 0)]));
  const revival = reviveLowPassengers(state.ship, seeded(state, `${arrivalSeed}|revival`), { systemId: target.id, medicExpertise: attendingMedicExpertise(state.ship, medicalById) });
  const freight = deliverFreightAtDestination(state.ship, target.id, { dateLabel: arrivedOn });
  state.ship = freight.ship;
  const passengers = disembarkPassengersAtDestination(state.ship, target.id, { dateLabel: arrivedOn });
  state.ship = passengers.ship;
  state.ship = settleLowPassageLottery(state.ship, revival.lottery, { dateLabel: arrivedOn });
  const messages = deliverPrivateMessages(state.ship, target.id);
  state.ship = messages.ship;

  const contractResults = [];
  state.contracts = state.contracts.map((contract) => {
    if (contract.status !== 'accepted' || contract.destination?.systemId !== target.id) return contract;
    let cargoOk = true;
    if (contract.requirements?.cargoTons > 0) {
      const cargoId = `${contract.identity.id}:cargo`;
      const cargo = state.ship.state.cargoManifest.find((entry) => entry.id === cargoId);
      cargoOk = Boolean(cargo && Math.abs(cargo.tons - contract.requirements.cargoTons) < 1e-9);
      if (cargo) state.ship = unloadCargo(state.ship, cargoId).ship;
    }
    if (isContractOverdue(contract, state.campaign.time) || !cargoOk) {
      const failed = failContractDocument(contract, { date: state.campaign.time, notes: cargoOk ? 'deadline missed' : 'required contract cargo missing' });
      contractResults.push({ contract: failed, success: false });
      return failed;
    }
    state.ship = creditShipAccount(state.ship, contract.economics.paymentCr, { kind: 'contract', description: `${contract.identity.title} completed / ${target.name}`, dateLabel: arrivedOn });
    const completed = completeContractDocument(contract, { date: state.campaign.time, paymentCr: contract.economics.paymentCr, notes: `Completed at ${target.name}` });
    contractResults.push({ contract: completed, success: true });
    return completed;
  });
  const reconciled = reconcileContractDeadlines(state.contracts, state.campaign.time);
  state.contracts = reconciled.contracts;

  state.ship = beginPortCall(state.ship, { systemId: target.id, arrivalDate: arrivedOn, berthingDueCr: targetProfile.starport === 'X' ? 0 : calculateBerthingCost(1) });
  state.lastSystemId = jump.fromSystemId;
  state.arrivals += 1;

  const parts = [`arrived at ${target.name}${jump.misjump ? ' (misjumped)' : ''}, ${state.ship.state.portCall.berth === 'orbit' ? 'in orbit' : 'landed'}`];
  if (freight.delivered.length) parts.push(`${freight.delivered.length} freight delivered, ${cr(freight.revenueCr)}`);
  if (passengers.passengers.length) parts.push(`${passengers.passengers.length} passengers disembarked, ${cr(passengers.revenueCr)}`);
  if (revival.revivals.length) parts.push(`${revival.survived.length} of ${revival.revivals.length} low passengers revived; lottery ${revival.lottery.paidCr ? `paid ${cr(revival.lottery.paidCr)}` : 'kept'}`);
  for (const delivered of messages.delivered) parts.push(`message delivered to ${delivered.recipient}`);
  for (const result of contractResults) parts.push(`${result.contract.identity.title} ${result.success ? 'completed' : 'failed'}`);
  events.push(event(state, 'arrival', parts.join('; '), {
    systemId: target.id, misjumped: jump.misjump, freightCr: freight.revenueCr, passageCr: passengers.revenueCr,
    lowRevived: revival.survived.length, lowDied: revival.died.length, lotteryPaidCr: revival.lottery?.paidCr ?? 0, messagesDelivered: messages.delivered.length
  }));

  const repossession = checkRepossession(state.ship, seeded(state, `${arrivalSeed}|repossession`), { systemId: target.id, dateLabel: arrivedOn,
    hexesFromHome: (() => {
      const home = state.ship.state.finances?.mortgage?.homeSystemId;
      if (!home || !systemOf(context, home)) return null;
      return getJumpDestinations(context.subsector, home, 99).find((entry) => entry.system.id === target.id)?.distance ?? (home === target.id ? 0 : null);
    })() });
  if (repossession.attempt) {
    state.ship = impoundShip(state.ship, { systemId: target.id, dateLabel: arrivedOn, form: repossession.form });
    events.push(event(state, 'repossession', `repossession attempt (${repossession.roll.total} against 12+): ${repossession.form}`, { form: repossession.form }));
    if (repossession.form === 'boarding') {
      state.situation = 'halted';
      state.halt = { reason: 'repossession-boarding', detail: 'an armed repossession party boards (Book 2 p.3)', from: 'port' };
      return one(state, events);
    }
  }

  const shipEncounter = rollShipEncounter(seeded(state, arrivalSeed), { starport: targetProfile.starport });
  if (shipEncounter.type) {
    const reaction = rollReaction(seeded(state, `${arrivalSeed}|reaction`));
    state.encounter = {
      key: shipEncounter.type, label: shipEncounter.label, hull: shipEncounter.hull?.label ?? null,
      hostileByDefault: Boolean(shipEncounter.hostileByDefault), reaction: reaction.description,
      systemId: target.id, dateLabel: jump.startedOn, tollDemandCr: null
    };
    state.situation = 'encounter';
    events.push(event(state, 'encounter', `${shipEncounter.label}${shipEncounter.hull ? ` (${shipEncounter.hull.label})` : ''} encountered: ${reaction.description}`, { key: shipEncounter.type }));
  } else {
    state.situation = 'port';
  }
  return one(state, events);
}

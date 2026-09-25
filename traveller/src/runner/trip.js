// trip.js — a party's trip as one plain state, stepped by legal actions.
//
// v0.312.0. Build-order step 4. No DOM, no registry, no cloud: documents in,
// documents out, every throw seeded so the same state and action always give
// the same result. v0.315.0: play.html runs on it (play-session.js's own copy
// is gone); the trip is saved as tripRecord() and rebuilt around the live
// documents with tripFromDocuments().
//
//   createTrip(resolved, options)          the state, from a resolved campaign
//   listActions(state, context)            what may be done now
//   applyAction(state, action, context)    { state, events }
//   tripRecord(state)                      the trip's own fields, to persist
//   tripFromDocuments(resolved, record)    a trip rebuilt around the documents
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
  DRIVE_REPAIR_STARPORTS, attendingEngineerExpertise, quoteStarportDriveRepair, repairDrivesAtStarport,
  shipEncounterReactionDMParts, debitShipAccount,
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

// Book 2 p.6: salaries "+10% for each level of expertise above level-1", in
// the skill the post uses. One level per person (the salary table takes one);
// a doubled-up crewman is paid on the better of his two.
const ROLE_SKILLS = Object.freeze({ pilot: 'Pilot', navigator: 'Navigation', engineer: 'Engineering', steward: 'Steward', medic: 'Medical', gunner: 'Gunnery' });

function crewSkillLevels(state) {
  const levels = {};
  for (const entry of state.ship.crew.assignments) {
    const skill = ROLE_SKILLS[String(entry.role).toLowerCase()];
    if (!skill) continue;
    levels[entry.characterId] = Math.max(levels[entry.characterId] ?? 0, skillOf(state, entry.characterId, skill));
  }
  return levels;
}

function event(state, kind, text, data = {}) {
  return Object.freeze({ date: tripDate(state), kind, text, ...data });
}

// v0.315.0: what a trip is beyond its documents. The client keeps this on
// the campaign (roster.trip) and rebuilds the rest from the documents on
// every step, so a change made elsewhere (a fight's damage, a referee's
// fiat) is never overwritten by a stale copy.
export const TRIP_RECORD_KEYS = Object.freeze([
  'seed', 'lanes', 'situation', 'destinationId', 'lastSystemId', 'encounter', 'departure', 'jump', 'landing',
  'pendingBrokerTipDM', 'halt', 'arrivals'
]);

export function tripRecord(state) {
  return cloneJson(Object.fromEntries(TRIP_RECORD_KEYS.map((key) => [key, state[key] ?? null])));
}

export function tripFromDocuments(resolved, record = null, options = {}) {
  const trip = createTrip(resolved, { seed: record?.seed ?? options.seed ?? '', lanes: record?.lanes ?? options.lanes ?? 'charted' });
  if (!record) return trip;
  for (const key of TRIP_RECORD_KEYS) {
    if (key === 'seed' || key === 'lanes') continue;
    if (record[key] !== undefined && record[key] !== null) trip[key] = cloneJson(record[key]);
  }
  if (!TRIP_SITUATIONS.includes(trip.situation)) trip.situation = 'port';
  trip.arrivals = Number.isInteger(trip.arrivals) ? trip.arrivals : 0;
  trip.pendingBrokerTipDM = Number(trip.pendingBrokerTipDM) || 0;
  return trip;
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
    departure: null,
    jump: null,
    landing: null,
    pendingBrokerTipDM: 0,
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
    skillLevels: { [state.ship.identity.id]: crewSkillLevels(state) },
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
  // Book 2 p.7: "CR 100 to land and remain for up to six days; thereafter,
  // a CR 100 per day fee". The first six are the berthing already due.
  const overstayCr = portCall && portCall.berthingDueCr > 0 ? Math.max(0, calculateBerthingCost(Math.max(1, daysInPort)) - calculateBerthingCost(1)) : 0;
  // Book 2 p.18 priced (ruling): one quote per port call, so it holds.
  const driveRepair = ship.state.malfunction?.failed?.length && DRIVE_REPAIR_STARPORTS.includes(profile?.starport)
    ? quoteStarportDriveRepair(ship, seeded(state, `${campaign.identity.id}|drive-repair|${system?.id}|${portCall?.arrivalDate ?? dateLabel}`))
    : null;
  return {
    system, profile, portCall, fuelService, destinations, target, distance, route, message, checklist, maintenance, lane, daysInPort, overstayCr, driveRepair,
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

// v0.315.0: a halt waits for a person, then goes on. What going on means
// depends on what stopped it; a headless run never reaches these (run.js
// stops on any halt), so the policy is unchanged.

function haltActions(state, context) {
  const halt = state.halt;
  if (!halt) return [];
  const resume = (how, label) => ({ type: 'resume', how, label });
  switch (halt.reason) {
    case 'ship-fight': {
      if (halt.encounter?.phase === 'outbound') return [resume('continue', 'Go on to the jump point'), resume('return', 'Turn back to port')];
      const landing = state.landing ? systemOf(context, state.landing.systemId) : null;
      return [resume('continue', landing ? `Go on in to ${landing.name}` : 'Go on')];
    }
    case 'hijack': return [resume('continue', 'Hijacking settled; go on with the jump')];
    case 'repossession-boarding': {
      const arrears = shipMortgageSchedule(state.ship, { dateLabel: tripDate(state) }).arrearsCr;
      return [
        resume('repelled', 'Boarding party beaten off'),
        ...(state.ship.state.finances.balanceCr >= arrears ? [resume('pay', `Pay ${cr(arrears)} arrears`)] : [])
      ];
    }
    case 'life-support': return [resume('continue', 'Try the jump again'), resume('return', 'Turn back to port')];
    default: return [resume('continue', 'Go on')];
  }
}

export function listActions(state, context) {
  if (state.situation === 'halted') return haltActions(state, context);
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
      // A hail's news is about the system being entered; leaving, it is moot.
      ...(HAIL_ENCOUNTER_KEYS.includes(encounter.key) && encounter.phase === 'inbound' ? [{ type: 'hail', label: 'Hail' }] : []),
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
  if (facts.driveRepair && facts.driveRepair.costCr <= balance) {
    actions.push({ type: 'repair-drives', label: `Repair ${ship.state.malfunction.failed.join(', ')} for ${cr(facts.driveRepair.costCr)}`, costCr: facts.driveRepair.costCr });
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
    && (entry.passageClass === undefined || entry.passageClass === action.passageClass)
    && (entry.how === undefined || entry.how === action.how));
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
    const result = repairDrivesAtStarport(state.ship, { starport: facts.profile.starport, quote: facts.driveRepair, dateLabel: tripDate(state) });
    state.ship = result.ship;
    return one(state, [event(state, 'port', `${facts.driveRepair.parts.map((part) => `${part.label} ${part.percent}%`).join(', ')} repaired at the class ${facts.profile.starport} starport, ${cr(result.costCr)} (Book 2 p.18)`)]);
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
    const refuse = (reason, detail) => halt(state, [], reason, `departure blocked — ${detail}`, 'port');
    const elsewhere = state.ship.state.passengerManifest.filter((entry) => entry.destinationSystemId !== facts.target.id);
    if (elsewhere.length) return refuse('passengers-elsewhere', `passengers aboard for ${[...new Set(elsewhere.map((entry) => entry.destinationSystemId))].join(', ')}`);
    const exclusive = exclusiveContract(state);
    if (exclusive && exclusive.destination?.systemId !== facts.target.id) return refuse('charter-elsewhere', `chartered to ${exclusive.destination?.systemName}`);
    if (!facts.checklist.ok) {
      const blocked = facts.checklist.rows.filter((row) => row.blocking && !row.ok);
      return refuse('departure-checklist', blocked.map((row) => `${row.key}: ${row.detail}`).join('; '));
    }
    const lifeSupport = calculateLifeSupportCostForTrip(state.ship);
    if (lifeSupport.totalCr + facts.overstayCr > state.ship.state.finances.balanceCr) {
      return refuse('life-support', `life support ${cr(lifeSupport.totalCr)}${facts.overstayCr ? ` and berthing ${cr(facts.overstayCr)}` : ''} against ${cr(state.ship.state.finances.balanceCr)}`);
    }
    const dateLabel = tripDate(state);
    const events = [];
    if (facts.overstayCr) {
      state.ship = debitShipAccount(state.ship, facts.overstayCr, { kind: 'berthing', description: `${facts.system.name} berthing, ${facts.daysInPort - 6} days past six (Book 2 p.7)`, dateLabel });
      events.push(event(state, 'port', `berthing past six days, ${cr(facts.overstayCr)}`));
    }
    state.departure = { fromSystemId: facts.system.id, toSystemId: facts.target.id, distance: facts.distance, lane: facts.lane, leftOn: dateLabel };
    state.destinationId = null;
    events.push(event(state, 'depart', `lifting from ${facts.system.name} for ${facts.target.name}`));
    // Book 2 p.3: pirates and patrols meet ships "entering or leaving a
    // system"; p.36's table, keyed on this world's starport.
    const outbound = rollShipEncounter(seeded(state, `${state.campaign.identity.id}|departure|${facts.system.id}|${dateLabel}`), { starport: facts.profile.starport });
    if (outbound.type) return one(state, [...events, openEncounter(state, outbound, { phase: 'outbound', system: facts.system, seedBase: `${state.campaign.identity.id}|departure|${facts.system.id}|${dateLabel}` })]);
    return launch(state, events, context);
  },

  'jump-week'(state, action, context) {
    const weekStartsOn = tripDate(state);
    const week = state.jump.weeksDone + 1;
    const engineeringSkill = attendingEngineerExpertise(state.ship, Object.fromEntries(state.characters.map((entry) => [entry.identity.id, Number(entry.skills?.Engineering ?? 0)])));
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

  'let-pass'(state, action, context) {
    const label = state.encounter.label;
    return afterEncounter(state, [event(state, 'encounter', `${label} let pass`)], context);
  },

  // Ruling (Sep 2026): whoever initiated intrudes. A pirate is hostile by
  // the p.36 roll itself; anything else the party chose to fight.
  fight(state) {
    return haltForFight(state, `${state.encounter.label}: the party chose to fight`, { opponentInitiated: Boolean(state.encounter.hostileByDefault) });
  },

  hail(state, action, context) {
    const encounter = state.encounter;
    const hail = resolveHail(encounter.key, { tableTotal: encounter.reactionTotal }, { dice: seeded(state, `${encounter.seedBase}|hail-attack`) });
    if (hail.outcome === 'fight') return haltForFight(state, `${encounter.label} answers the hail with fire (${encounter.reaction.replace(/\.$/, '')}; ${hail.attack.immediate ? 'immediate attack' : `attack throw ${hail.attack.total} against ${hail.attack.needed}+`})`, { opponentInitiated: true });
    if (hail.outcome === 'tip') state.pendingBrokerTipDM = hail.brokerTipDM;
    return afterEncounter(state, [event(state, 'encounter', hail.outcome === 'tip' ? `${encounter.label} shares word of a buyer (broker tip +${hail.brokerTipDM} here)` : `${encounter.label} trades pleasantries`)], context);
  },

  inspect(state, action, context) {
    const encounter = state.encounter;
    const inspection = resolveInspection(encounter.key, { tableTotal: encounter.reactionTotal }, { dice: seeded(state, `${encounter.seedBase}|inspect-attack`) });
    if (inspection.outcome === 'fight') return haltForFight(state, `${encounter.label} opens fire during the inspection (${encounter.reaction.replace(/\.$/, '')}; ${inspection.attack.immediate ? 'immediate attack' : `attack throw ${inspection.attack.total} against ${inspection.attack.needed}+`})`, { opponentInitiated: true });
    if (inspection.outcome === 'toll') {
      state.encounter = { ...encounter, tollDemandCr: inspection.tollCr };
      return one(state, [event(state, 'encounter', `${encounter.label} demands ${cr(inspection.tollCr)}`)]);
    }
    return afterEncounter(state, [event(state, 'encounter', `${encounter.label} waves the ship through`)], context);
  },

  'pay-toll'(state, action, context) {
    const encounter = state.encounter;
    state.ship = payInspectionToll(state.ship, { tollCr: encounter.tollDemandCr, description: `${encounter.label} inspection toll`, dateLabel: tripDate(state) });
    return afterEncounter(state, [event(state, 'encounter', `paid ${cr(encounter.tollDemandCr)} toll to ${encounter.label}`)], context);
  },

  'refuse-toll'(state) {
    return haltForFight(state, `refused ${state.encounter.label}'s toll; it opens fire`, { opponentInitiated: true });
  },

  resume(state, action, context) {
    const halt = state.halt;
    state.halt = null;
    // launch() and passDays() read a halted situation as a fresh halt.
    state.situation = 'port';
    const events = [];
    const back = (text) => { state.situation = 'port'; return one(state, [event(state, 'port', text)]); };
    if (halt.reason === 'repossession-boarding') {
      if (action.how === 'repelled') {
        state.ship = releaseImpound(state.ship, { dateLabel: tripDate(state), repelled: true });
        return back('the repossession party is beaten off; the arrears still stand');
      }
      const dateLabel = tripDate(state);
      const upkeep = chargeShipUpkeep(state.ship, { dateLabel, sinceLabel: firstLedgerDate(state.ship), unpaid: unpaidCrew(state.ship) });
      state.ship = upkeep.ship;
      if (shipMortgageSchedule(state.ship, { dateLabel }).skipped) return back(`paid ${cr(upkeep.paidCr)}; still held`);
      state.ship = releaseImpound(state.ship, { dateLabel });
      return back(`arrears paid (${cr(upkeep.paidCr)}); released`);
    }
    if (action.how === 'return') {
      state.departure = null;
      state.landing = null;
      return back('turned back to port');
    }
    if (halt.reason === 'ship-fight') {
      if (halt.encounter?.phase === 'outbound') return launch(state, events, context);
      if (halt.encounter?.phase === 'inbound' && state.landing) return land(state, events, context);
      state.situation = 'port';
      return one(state, events);
    }
    // A halt on the way out (life support, an aging crisis in transit) picks
    // the departure up where it stopped.
    if (state.departure) return launch(state, events, context);
    if (state.jump) {
      state.situation = 'in-jump';
      if (state.jump.weeksDone >= state.jump.weeks) return arrive(state, events, context);
      return one(state, [event(state, 'jump', `the voyage goes on, week ${state.jump.weeksDone + 1} of ${state.jump.weeks}`)]);
    }
    if (state.landing) return land(state, events, context);
    state.situation = TRIP_SITUATIONS.includes(halt.from) && halt.from !== 'halted' ? halt.from : 'port';
    if (state.situation === 'encounter' && !state.encounter) state.situation = 'port';
    return one(state, events);
  }
};

function halt(state, events, reason, detail, from) {
  state.halt = { reason, detail, from };
  state.situation = 'halted';
  return one(state, [...events, event(state, 'halt', detail, { reason })]);
}

// Book 3 p.23: one reaction per encounter, with its DMs, kept on the
// encounter so hail and inspection read it rather than throwing again.
function openEncounter(state, rolled, { phase, system, seedBase }) {
  const population = system ? parseUniversalWorldProfile(system.mainWorld.uwp).population : null;
  const dmParts = shipEncounterReactionDMParts({ characters: state.characters, population });
  const dm = dmParts.reduce((sum, part) => sum + part.dm, 0);
  const reaction = rollReaction(seeded(state, `${seedBase}|reaction`), { dm });
  state.encounter = {
    key: rolled.type, label: rolled.label, hull: rolled.hull?.label ?? null, hullKey: rolled.hull?.hull ?? rolled.type, phase,
    hostileByDefault: Boolean(rolled.hostileByDefault), reaction: reaction.description, reactionTotal: reaction.tableTotal,
    reactionDM: dm, systemId: system?.id ?? null, seedBase, tollDemandCr: null
  };
  state.situation = 'encounter';
  return event(state, 'encounter', `${rolled.label}${rolled.hull ? ` (${rolled.hull.label})` : ''} met ${phase === 'outbound' ? 'leaving' : 'entering'} the system: ${reaction.description.replace(/\.$/, '')}${dm ? ` (reaction DM ${dm > 0 ? '+' : ''}${dm})` : ''}`, { key: rolled.type, phase, reactionTotal: reaction.tableTotal });
}

function afterEncounter(state, events, context) {
  const phase = state.encounter?.phase;
  state.encounter = null;
  if (phase === 'outbound') return launch(state, events, context);
  if (phase === 'inbound') return land(state, events, context);
  state.situation = 'port';
  return one(state, events);
}

// The trip out: about 20 hours to 100 diameters (Book 2 p.1), taken as a
// day, then life support is posted and the jump made.
function launch(state, events, context) {
  const departure = state.departure;
  const passed = passDays(state, 1, 'transit to the jump point');
  state = passed.state;
  events.push(...passed.events);
  if (state.situation === 'halted') return one(state, events);
  const from = systemOf(context, departure.fromSystemId);
  const target = systemOf(context, departure.toSystemId);
  const dateLabel = tripDate(state);
  const lifeSupport = calculateLifeSupportCostForTrip(state.ship);
  if (lifeSupport.totalCr > state.ship.state.finances.balanceCr) return halt(state, events, 'life-support', `cannot post life support (${cr(lifeSupport.totalCr)})`, 'outbound');
  state.ship = chargeLifeSupportForTrip(state.ship, { dateLabel }).ship;
  let jump;
  try {
    jump = beginJump(state.ship, {
      dice: seeded(state, `${state.campaign.identity.id}|jump|${from.id}|${target.id}|${dateLabel}`),
      distance: departure.distance, fromHex: from.hex, toHex: target.hex, dateLabel,
      sinceLabel: firstLedgerDate(state.ship), laneExists: departure.lane
    });
  } catch (error) {
    return halt(state, events, 'departure-checklist', `jump refused — ${error.message}`, 'outbound');
  }
  state.ship = jump.ship;
  const destination = jump.destination;
  const landedSystem = destination.planned ? target : (destination.inSubsector ? context.subsector.systems.find((system) => system.hex === destination.hex) ?? null : null);
  state.jump = {
    fromSystemId: from.id, toSystemId: target.id, startedOn: departure.leftOn,
    weeks: jump.weeksInJump ?? 0, weeksDone: 0,
    misjump: jump.misjump.misjump, destroyed: jump.destroyed,
    landedHex: destination.hex ?? `${destination.column},${destination.row}`, landedSystemId: landedSystem?.id ?? null
  };
  state.departure = null;
  events.push(event(state, 'jump', `jumped for ${target.name}, ${jump.fuelConsumedTons} t fuel, life support ${cr(lifeSupport.totalCr)}`));
  if (jump.destroyed) {
    state.situation = 'destroyed';
    events.push(event(state, 'misjump', `misjump ${jump.misjump.total} (16+): the ship is lost in jump space`, { destroyed: true }));
    return one(state, events);
  }
  if (jump.misjump.misjump) {
    events.push(event(state, 'misjump', `misjump ${jump.misjump.total}: ${jump.misjump.distanceHexes} hexes, direction ${jump.misjump.direction}, ${jump.weeksInJump} weeks in jump — ${landedSystem ? `emerging at ${landedSystem.name}` : 'emerging in empty space'}`, { distanceHexes: jump.misjump.distanceHexes }));
  }
  state.situation = 'in-jump';
  if (jump.hijack.attempt) return halt(state, events, 'hijack', `a passenger attempts a hijacking (3D: ${jump.hijack.total}) on day ${jump.hijack.day} of the voyage (Book 2 p.3)`, 'in-jump');
  return one(state, events);
}

function haltForFight(state, detail, { opponentInitiated = true } = {}) {
  state.halt = { reason: 'ship-fight', detail, from: 'encounter', encounter: state.encounter, opponentInitiated };
  state.encounter = null;
  state.situation = 'halted';
  return one(state, [event(state, 'halt', detail, { reason: 'ship-fight' })]);
}

// ------------------------------------------------------------------ arrival

// Book 2 p.3: shipping meets a ship "entering" a system, so the encounter
// comes on approach — cargo and sleeping passengers still aboard — and the
// landing (p.2 revival "after the ship has landed", p.3 repossession "on
// each world landing") follows it.
function arrive(state, events, context) {
  const jump = state.jump;
  const target = jump.landedSystemId ? systemOf(context, jump.landedSystemId) : null;
  state.jump = null;
  if (!target) {
    // Kept so a reload can still say where the ship came out.
    state.landing = { systemId: null, hex: jump.landedHex, fromSystemId: jump.fromSystemId, startedOn: jump.startedOn, misjump: jump.misjump };
    state.situation = 'stranded';
    events.push(event(state, 'stranded', `emerged in empty space at ${jump.landedHex}; no world, no port`));
    return one(state, events);
  }
  state.campaign = updateCampaignLocation(state.campaign, { systemId: target.id, systemName: target.name, worldId: target.mainWorld.id, worldName: target.mainWorld.name });
  state.landing = { fromSystemId: jump.fromSystemId, systemId: target.id, startedOn: jump.startedOn, misjump: jump.misjump };
  const targetProfile = parseUniversalWorldProfile(target.mainWorld.uwp);
  // Seeded on the departure date, as play-session.js does.
  const seedBase = `${state.campaign.identity.id}|arrival|${target.id}|${jump.startedOn}`;
  const inbound = rollShipEncounter(seeded(state, seedBase), { starport: targetProfile.starport });
  if (inbound.type) {
    events.push(openEncounter(state, inbound, { phase: 'inbound', system: target, seedBase }));
    return one(state, events);
  }
  return land(state, events, context);
}

function land(state, events, context) {
  const landing = state.landing;
  state.landing = null;
  const target = systemOf(context, landing.systemId);
  const arrivedOn = tripDate(state);
  const targetProfile = parseUniversalWorldProfile(target.mainWorld.uwp);
  const arrivalSeed = `${state.campaign.identity.id}|arrival|${target.id}|${landing.startedOn}`;

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
  if (state.pendingBrokerTipDM) {
    state.ship = grantBrokerTip(state.ship, { dm: state.pendingBrokerTipDM });
    state.pendingBrokerTipDM = 0;
  }
  state.lastSystemId = landing.fromSystemId;
  state.arrivals += 1;
  state.situation = 'port';

  const lottery = revival.lottery;
  const parts = [`arrived at ${target.name}${landing.misjump ? ' (misjumped)' : ''}, ${state.ship.state.portCall.berth === 'orbit' ? 'in orbit' : 'landed'}`];
  if (freight.delivered.length) parts.push(`${freight.delivered.length} freight delivered, ${cr(freight.revenueCr)}`);
  if (passengers.passengers.length) parts.push(`${passengers.passengers.length} passengers disembarked, ${cr(passengers.revenueCr)}`);
  if (revival.revivals.length) parts.push(`${revival.survived.length} of ${revival.revivals.length} low passengers revived; ${lottery ? `lottery ${lottery.paidCr ? `paid ${cr(lottery.paidCr)}` : 'kept'}` : 'no steward, no lottery'}`);
  for (const delivered of messages.delivered) parts.push(`message delivered to ${delivered.recipient}`);
  for (const result of contractResults) parts.push(`${result.contract.identity.title} ${result.success ? 'completed' : 'failed'}`);
  events.push(event(state, 'arrival', parts.join('; '), {
    systemId: target.id, misjumped: landing.misjump, freightCr: freight.revenueCr, passageCr: passengers.revenueCr,
    lowRevived: revival.survived.length, lowDied: revival.died.length, lotteryPaidCr: lottery?.paidCr ?? 0, lotteryHeld: Boolean(lottery), messagesDelivered: messages.delivered.length
  }));

  const home = state.ship.state.finances?.mortgage?.homeSystemId;
  const hexesFromHome = !home || !systemOf(context, home) ? null
    : home === target.id ? 0 : getJumpDestinations(context.subsector, home, 99).find((entry) => entry.system.id === target.id)?.distance ?? null;
  const repossession = checkRepossession(state.ship, seeded(state, `${arrivalSeed}|repossession`), { systemId: target.id, dateLabel: arrivedOn, hexesFromHome });
  if (repossession.attempt) {
    state.ship = impoundShip(state.ship, { systemId: target.id, dateLabel: arrivedOn, form: repossession.form });
    events.push(event(state, 'repossession', `repossession attempt (${repossession.roll.total} against 12+): ${repossession.form}`, { form: repossession.form }));
    if (repossession.form === 'boarding') return halt(state, events, 'repossession-boarding', 'an armed repossession party boards (Book 2 p.3)', 'port');
  }
  return one(state, events);
}

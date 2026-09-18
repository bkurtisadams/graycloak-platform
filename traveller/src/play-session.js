// play-session.js — the play page's view of a campaign, with no DOM.
//
// buildPlayViewState() turns the documents a campaign resolves to into the
// view state client/play-views.js draws (the shape is set out at the top of
// client/play-sample.js). It reads; it never writes. Commands that change the
// game arrive in later slices and will live beside it.
//
// v0.205.0 covers what is true of a campaign at rest: where and when it is,
// who is in the party, the ship, the accepted jobs, and the subsector scene.
//
// v0.207.0 adds createPlaySession(): the first port-call commands (berthing,
// fuel), the procedure that orders them, and saving — to the browser registry
// always, and to the campaign's cloud home by the same revisioned contract
// client/app.js uses, through a `cloud` adapter so none of it needs a browser.

import {
  PERSONAL_WEAPONS, PERSONAL_WEAPON_WEIGHTS_GRAMS, addCharacterInventoryItem, characterLoad, removeCharacterInventoryItem,
  setCharacterMilitaryLoad, updateCharacterInventoryItem,
  FREIGHT_RATE_PER_TON_CR, PASSAGE_FARES_CR, availablePassengerCapacity, bookPassenger, calculateLifeSupportCostForTrip, calculateSpeculativePurchaseCost,
  canShipMakeJump, generateFreightOffers, generatePassengerDemand, getPersonalWeapon, getSubsectorSystem,
  generateSpeculativeTradeOffer, jumpDistanceBetweenSystems, loadCargo, parseUniversalWorldProfile, payCurrentBerthing,
  purchaseShipFuel, purchaseSpeculativeCargo, quoteSpeculativeResale, sellSpeculativeCargo, starportFuelService
} from '../vendor/classic-traveller-rules/index.js';
// The market seeds are shared with client/app.js so both pages draw the same
// freight lots and the same passengers for a route on a given day.
import { campaignDateKey, routeMarketSeed, saleQuoteSeed, seededDice, weeklyTradeSeed } from '../client/commerce-market.js';
import {
  addActivityLogToCampaign, campaignIsPublished, markCampaignPublished, recordSpeculativeLotPurchase, refreshCampaignDocumentRefs,
  setCampaignOwner, speculativeLotPurchasedQuantity
} from './campaign-document.js';
import { appendActivityLogEntry, createActivityLogDocument, mergeActivityLogHistory } from './activity-log-document.js';
import { StaleCampaignHomeError, createCampaignHome, importCampaignHome, nextCampaignHome } from './campaign-home.js';
import { buildPublishedCampaign, buildPublishedScene } from './published-view.js';

const SERVICE_NAMES = Object.freeze({ navy: 'Navy', marines: 'Marines', army: 'Army', scouts: 'Scout', merchants: 'Merchant', other: 'Other' });
const PHYSICAL = Object.freeze(['STR', 'DEX', 'END']);
const DAYS_IN_YEAR = 365;

export function formatCampaignDate(time) {
  if (!time || !Number.isFinite(time.year) || !Number.isFinite(time.dayOfYear)) return '';
  return `${String(time.dayOfYear).padStart(3, '0')}-${time.year}`;
}

export function daysBetween(from, to) {
  return (to.year - from.year) * DAYS_IN_YEAR + (to.dayOfYear - from.dayOfYear);
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function sentenceCase(text) {
  const value = String(text ?? '').replace(/[-_]/g, ' ').trim();
  return value ? value[0].toUpperCase() + value.slice(1) : '';
}

const kg = (grams) => `${(grams / 1000).toFixed(grams % 1000 === 0 ? 0 : grams % 100 === 0 ? 1 : 2)} kg`;
const LOAD_WORDS = Object.freeze({
  unencumbered: 'Not encumbered',
  encumbered: 'Encumbered: STR, DEX and END count as one less',
  'military-load': 'Military load: STR, DEX and END count as two less',
  overloaded: 'More than can be carried: something must be put down'
});

// Weapons that can be added to an inventory by name, with their printed weights.
export function weaponCatalog() {
  return Object.entries(PERSONAL_WEAPON_WEIGHTS_GRAMS).filter(([key, weight]) => weight.weapon > 0 && PERSONAL_WEAPONS[key])
    .map(([key, weight]) => ({ key, name: PERSONAL_WEAPONS[key].name, grams: weight.weapon + weight.ammunition }));
}

export function characterView(document, { gravityFactor = null } = {}) {
  const full = document.characteristics ?? {};
  const current = document.current ?? {};
  const characteristics = ['STR', 'DEX', 'END', 'INT', 'EDU', 'SOC'].map((key) => ({
    key, full: Number(full[key] ?? 0), now: PHYSICAL.includes(key) ? Number(current[key] ?? full[key] ?? 0) : Number(full[key] ?? 0)
  }));
  const zeros = characteristics.filter((entry) => PHYSICAL.includes(entry.key) && entry.now <= 0).length;
  const wounded = characteristics.some((entry) => entry.now < entry.full);
  const alive = document.status?.alive !== false && zeros < 3;
  const status = !alive ? 'Dead' : zeros === 2 ? 'Seriously wounded' : zeros === 1 ? 'Unconscious' : wounded ? 'Wounded' : 'Unwounded';
  const career = document.career ?? {};
  const service = [
    SERVICE_NAMES[career.service] ?? sentenceCase(career.service),
    Number.isFinite(career.terms) ? plural(career.terms, 'term') : null,
    career.rankTitle || null,
    Number.isFinite(document.age) ? `age ${document.age}` : null
  ].filter(Boolean).join(', ');
  const weapons = [];
  const weaponKey = document.loadout?.weaponKey;
  if (weaponKey) {
    try { weapons.push({ name: getPersonalWeapon(weaponKey).name, note: 'In hand' }); } catch { weapons.push({ name: sentenceCase(weaponKey), note: 'In hand' }); }
  }
  return {
    id: document.identity.id,
    name: document.identity.name,
    upp: document.upp ?? '',
    service,
    cashCr: Number(document.finances?.credits ?? 0),
    status,
    hurt: status !== 'Unwounded',
    characteristics,
    skills: Object.entries(document.skills ?? {}).map(([name, level]) => `${name}-${level}`),
    weapons,
    armor: sentenceCase(document.loadout?.armor ?? 'none'),
    carrying: null,
    blows: null,
    ...loadView(document, gravityFactor)
  };
}

function loadView(document, gravityFactor) {
  if (!Array.isArray(document.inventory)) return { inventory: [], load: null };
  const load = characterLoad(document, { gravityFactor });
  return {
    inventory: document.inventory.map((item) => ({
      id: item.id, name: item.name, quantity: item.quantity, carried: item.carried, counts: item.countsTowardLoad,
      weight: item.countsTowardLoad ? kg(item.weightGrams * item.quantity) : 'not counted'
    })),
    load: {
      state: load.state, dm: load.characteristicDM, military: load.military,
      text: `${kg(load.loadGrams)} of ${kg(load.normalGrams)}`,
      words: LOAD_WORDS[load.state],
      limits: `Free to ${kg(load.normalGrams)}, encumbered to ${kg(load.doubleGrams)}${load.military ? `, military load to ${kg(load.tripleGrams)}` : ''}${load.multiplier !== 1 ? `; local gravity ${load.multiplier > 1 ? 'adds' : 'takes'} ${Math.abs(Math.round((load.multiplier - 1) * 1000) / 10)}%` : ''}.`
    }
  };
}

export function shipView(document) {
  if (!document) return null;
  const spec = document.specifications ?? {};
  const state = document.state ?? {};
  const manifest = state.cargoManifest ?? [];
  const passengers = state.passengerManifest ?? [];
  const staterooms = Number(spec.accommodations?.staterooms ?? 0);
  const crewCount = (document.crew?.assignments ?? []).length;
  const fitted = (state.armament?.turrets ?? []).flatMap((turret) => turret.weapons ?? []);
  const hardpoints = Number(spec.armament?.hardpoints ?? 0);
  const mounts = (spec.armament?.turrets ?? []).length;
  const damage = Object.entries(state.damage ?? {}).filter(([, value]) => (Array.isArray(value) ? value.length : Number(value) > 0)).map(([key]) => sentenceCase(key.replace(/([A-Z])/g, ' $1')));
  const byPerson = new Map();
  for (const assignment of document.crew?.assignments ?? []) {
    const name = assignment.characterName ?? 'Unfilled';
    byPerson.set(name, [...(byPerson.get(name) ?? []), sentenceCase(assignment.role)]);
  }
  return {
    id: document.identity.id,
    name: document.identity.name,
    kind: [spec.hull?.tons ? `${spec.hull.tons} t` : null, document.design?.name].filter(Boolean).join(' '),
    registry: document.identity.registry ?? '',
    accountCr: Number(state.finances?.balanceCr ?? 0),
    jump: Number(spec.drives?.jump?.rating ?? 0),
    fuel: { now: Number(state.currentFuelTons ?? 0), full: Number(spec.fuel?.capacityTons ?? 0), note: state.fuelQuality ? `${sentenceCase(state.fuelQuality)} fuel aboard` : '' },
    hold: { now: Number(state.cargoUsedTons ?? 0), full: Number(spec.cargo?.capacityTons ?? 0), note: manifest.length ? manifest.map((lot) => `${lot.tons} t ${lot.description}`).join('; ') : 'Empty' },
    berths: { now: passengers.length + crewCount, full: staterooms, note: `${plural(crewCount, 'crew')}, ${passengers.length ? plural(passengers.length, 'passenger') : 'no passengers'}` },
    crew: [...byPerson].map(([name, roles]) => ({ name, roles: roles.join(', ') })),
    armament: fitted.length ? fitted.map((weapon) => sentenceCase(weapon.type ?? weapon.key ?? weapon)).join(', ')
      : hardpoints ? `Unarmed. ${mounts ? `${plural(mounts, 'turret')} fitted, empty` : `${plural(hardpoints, 'hardpoint')} free`}.` : 'Unarmed.',
    upkeep: document.authority?.assignmentType === 'reserve' ? `On loan from the ${document.authority.controllingAuthority ?? 'service'}` : sentenceCase(state.maintenance?.status ?? ''),
    damage: damage.length ? damage.join(', ') : null
  };
}

export function jobViews(contracts, now) {
  return contracts.filter((contract) => contract.status === 'accepted').map((contract) => {
    const deadline = contract.timing?.deadlineDate;
    const left = deadline && now ? daysBetween(now, deadline) : null;
    return {
      id: contract.identity.id,
      title: contract.identity.title,
      to: contract.destination?.systemName ?? '',
      payCr: Number(contract.economics?.paymentCr ?? 0),
      due: left === null ? '' : left > 0 ? `${plural(left, 'day')} left` : left === 0 ? 'Due today' : `${plural(-left, 'day')} overdue`,
      urgent: left !== null && left <= 2,
      daysLeft: left
    };
  }).sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity));
}

function placeView(campaign, subsector) {
  const location = campaign.location ?? {};
  let detail = '';
  try {
    const system = getSubsectorSystem(subsector, location.systemId);
    const profile = parseUniversalWorldProfile(system.mainWorld.uwp);
    detail = `Starport ${profile.starport}, hex ${system.hex}`;
  } catch { /* a world off this subsector: the name alone */ }
  return { name: location.worldName ?? location.systemName ?? 'Unknown', detail };
}

export function refereeView(resolved) {
  const { campaign, characters = [], npcActors = [] } = resolved;
  const partyIds = new Set(campaign.party?.characterIds ?? []);
  const row = (character) => [character.identity.name, characterView(character).service];
  const live = npcActors.filter((actor) => !actor.archived);
  return {
    tabs: ['Actors', 'Scenes', 'Vehicles', 'Players', 'Journal', 'Tables'],
    groups: [
      { label: 'Party', rows: characters.filter((character) => partyIds.has(character.identity.id)).map(row) },
      { label: 'Other characters', rows: characters.filter((character) => !partyIds.has(character.identity.id)).map(row) },
      { label: 'Actors', rows: live.map((actor) => [actor.identity.name, sentenceCase(actor.role ?? actor.actorType ?? '')]) }
    ].filter((group, index) => index === 0 || group.rows.length)
  };
}

// resolved: what documentRegistry.resolveCampaign() returns.
export function buildPlayViewState(resolved, { subsector, seat = 'referee', characterId = null } = {}) {
  const { campaign, characters = [], ships = [], contracts = [] } = resolved;
  const party = (campaign.party?.characterIds ?? []).map((id) => characters.find((entry) => entry.identity.id === id)).filter(Boolean);
  // Graycloak rulings (Sep 2026): load is reckoned against full Strength; p.33's
  // "additional 40%" for a gravity of 3 is a misprint for 50%; and a character
  // is subject to the gravity of whatever world they are on, so the limit is
  // worked out afresh for each planet. Aboard ship in jump they are on no
  // world, and the limit is the unadjusted one.
  const underway = ships.find((entry) => entry.identity.id === campaign.activeShipId)?.state?.operationalStatus === 'in-jump';
  let gravityFactor = null;
  if (!underway) {
    try { gravityFactor = parseUniversalWorldProfile(getSubsectorSystem(subsector, campaign.location?.systemId).mainWorld.uwp).size; } catch { /* off the map */ }
  }
  const roster = (party.length ? party : characters).map((entry) => characterView(entry, { gravityFactor }));
  const wanted = characterId ?? campaign.activeCharacterId;
  const character = roster.find((entry) => entry.id === wanted) ?? roster[0] ?? null;
  const shipDocument = ships.find((entry) => entry.identity.id === campaign.activeShipId) ?? ships[0] ?? null;
  const ship = shipView(shipDocument);
  const place = placeView(campaign, subsector);
  const inJump = shipDocument?.state?.operationalStatus === 'in-jump';
  return {
    live: true,
    seat,
    campaign: { id: campaign.identity.id, name: campaign.identity.name, date: formatCampaignDate(campaign.time) },
    place,
    character,
    party: roster.map((entry) => ({ id: entry.id, name: entry.name })),
    ship,
    jobs: jobViews(contracts, campaign.time),
    situation: { kind: inJump ? 'jump' : 'port', title: inJump ? 'In jump' : 'Port call', detail: place.name },
    next: {
      title: 'Reading your campaign',
      copy: 'This page shows the campaign as it stands and changes nothing. Port business arrives here in v0.206.0; until then, play it in the current client.',
      cite: '',
      actions: []
    },
    steps: [],
    done: [],
    scene: { kind: 'subsector', currentId: campaign.location?.systemId ?? null, selectedId: null, jump: ship?.jump ?? 0 },
    chat: [],
    referee: refereeView(resolved),
    weaponCatalog: weaponCatalog()
  };
}

// ------------------------------------------------------------------ session

const cr = (amount) => `Cr ${Number(amount).toLocaleString('en-US')}`;

function portFacts(resolved, subsector, selectedSystemId) {
  const { campaign, ships = [], encounters = [] } = resolved;
  const ship = ships.find((entry) => entry.identity.id === campaign.activeShipId) ?? ships[0] ?? null;
  let system = null;
  try { system = getSubsectorSystem(subsector, campaign.location?.systemId); } catch { /* off the map */ }
  const profile = system ? parseUniversalWorldProfile(system.mainWorld.uwp) : null;
  const portCall = ship?.state?.portCall?.systemId === system?.id ? ship.state.portCall : null;
  const fuelService = ship && profile ? starportFuelService(profile.starport, { scoutBase: system.bases?.scout, ship }) : null;
  const capacity = Number(ship?.specifications?.fuel?.capacityTons ?? 0);
  const aboard = Number.isFinite(ship?.state?.currentFuelTons) ? ship.state.currentFuelTons : 0;
  let destination = null;
  if (ship && system && selectedSystemId && selectedSystemId !== system.id) {
    try {
      const target = getSubsectorSystem(subsector, selectedSystemId);
      const distance = jumpDistanceBetweenSystems(subsector, system.id, target.id);
      const rating = Number(ship.specifications?.drives?.jump?.rating ?? 0);
      const reachable = Number.isInteger(distance) && distance >= 1 && distance <= rating;
      destination = { id: target.id, name: target.name, distance, reachable, fuel: reachable ? canShipMakeJump(ship, distance) : null };
    } catch { destination = null; }
  }
  // v0.208.3: speculation (Book 2 pp.42-47). This world's one lot for the
  // week, and a resale quote for each speculative lot carried in from another
  // world. Seeds, lot key and skill DM are client/app.js's, so both pages see
  // the same lot, the same amount already bought, and the same quotes. No
  // broker is hired from this page yet (broker DM 0).
  let speculation = null;
  if (ship && system && profile) {
    const trader = (resolved.characters ?? []).find((entry) => entry.identity.id === campaign.activeCharacterId)
      ?? (resolved.characters ?? []).find((entry) => (campaign.party?.characterIds ?? []).includes(entry.identity.id)) ?? null;
    const skillDM = Math.max(Number(trader?.skills?.Admin ?? 0), Number(trader?.skills?.Bribery ?? 0));
    const offer = generateSpeculativeTradeOffer(profile, { dice: seededDice(weeklyTradeSeed(campaign, system.id)) });
    const lotKey = offer ? `${weeklyTradeSeed(campaign, system.id)}|${offer.code}` : null;
    const free = Math.max(0, ship.specifications.cargo.capacityTons - ship.state.cargoUsedTons);
    let buy = null;
    if (offer) {
      const remaining = Math.max(0, offer.quantityAvailable - speculativeLotPurchasedQuantity(campaign, lotKey));
      const balance = Number(ship.state.finances?.balanceCr ?? 0);
      const affordable = offer.pricePerUnitCr > 0 ? Math.floor(balance / offer.pricePerUnitCr) : remaining;
      let quantity = offer.unit === 'tons' ? Math.max(0, Math.min(remaining, Math.floor(free), affordable)) : 0;
      // Taking part of a lot adds a 1% handling fee (Book 2 p.46); the quoted
      // total includes it, and it can tip the last ton out of reach.
      const costOf = (tons) => (tons > 0 ? calculateSpeculativePurchaseCost(offer, tons) : { totalCr: 0, handlingFeeCr: 0 });
      while (quantity > 0 && costOf(quantity).totalCr > balance) quantity -= 1;
      const cost = costOf(quantity);
      const blocked = quantity > 0 ? null
        : offer.unit !== 'tons' ? `${offer.name} is sold by the ${String(offer.unit).replace(/s$/, '')}, not the ton; buy it from the current client.`
          : remaining < 1 ? 'This week\u2019s lot is already bought out.'
            : Math.floor(free) < 1 ? 'The hold is full.'
              : `${cr(offer.pricePerUnitCr)} a ton is beyond the ship\u2019s account (${cr(balance)}).`;
      buy = { offer, lotKey, remaining, quantity, costCr: cost.totalCr, handlingFeeCr: cost.handlingFeeCr, blocked };
    }
    const sales = (ship.state.cargoManifest ?? []).map((cargo) => {
      const match = /^speculative:(\d{2})$/.exec(cargo.category ?? '');
      if (!match || cargo.originSystemId === system.id) return null;
      const quote = quoteSpeculativeResale(Number(match[1]), cargo.tons, profile, { dice: seededDice(saleQuoteSeed(campaign, system.id, cargo.id)), characterSkillDM: skillDM, brokerDM: 0 });
      return quote ? { cargo, quote } : null;
    }).filter(Boolean);
    speculation = { buy, sales, skillDM };
  }

  // v0.208.0: what is on offer for the chosen destination (Book 2 pp.8-9).
  // The same seeded generators and ids as client/app.js, so a lot loaded on
  // one page is the same lot, already aboard, on the other.
  const contracts = (resolved.contracts ?? []).filter((entry) => entry.status === 'accepted');
  const exclusive = contracts.find((entry) => entry.requirements?.exclusiveShip) ?? null;
  let route = null;
  if (destination?.reachable) {
    const target = getSubsectorSystem(subsector, destination.id);
    const targetProfile = parseUniversalWorldProfile(target.mainWorld.uwp);
    const demand = generatePassengerDemand(profile, targetProfile, { destinationTravelZone: target.travelZone,
      dice: seededDice(routeMarketSeed(campaign, system.id, target.id, 'passengers')) });
    const offers = generateFreightOffers(profile, targetProfile, { destinationTravelZone: target.travelZone,
      dice: seededDice(routeMarketSeed(campaign, system.id, target.id, 'freight')),
      idPrefix: `freight-${campaignDateKey(campaign)}-${system.id}-${target.id}` }).offers;
    const manifest = ship.state.cargoManifest ?? [];
    const passengers = ship.state.passengerManifest ?? [];
    const aboard = new Set(manifest.map((entry) => entry.id));
    const freeHold = Math.max(0, ship.specifications.cargo.capacityTons - ship.state.cargoUsedTons);
    const stewards = (ship.crew?.assignments ?? []).filter((entry) => String(entry.role).toLowerCase() === 'steward').length;
    const booked = (passageClass) => passengers.filter((entry) => entry.originSystemId === system.id && entry.destinationSystemId === target.id && entry.class === passageClass).length;
    const elsewhere = [...new Set(passengers.filter((entry) => entry.destinationSystemId !== target.id).map((entry) => {
      try { return getSubsectorSystem(subsector, entry.destinationSystemId).name; } catch { return entry.destinationSystemId; }
    }))];
    route = {
      target, freeHold,
      freight: { remaining: offers.filter((entry) => !aboard.has(entry.id)), loaded: manifest.filter((entry) => entry.category === 'freight' && entry.destinationSystemId === target.id) },
      classes: ['high', 'middle', 'low'].map((passageClass) => ({
        passageClass, fareCr: PASSAGE_FARES_CR[passageClass], booked: booked(passageClass),
        waiting: Math.max(0, (demand[passageClass] ?? 0) - booked(passageClass)),
        berths: availablePassengerCapacity(ship, passageClass),
        blocked: passageClass === 'high' && stewards < 1 ? 'High passage needs a steward aboard, and nobody is assigned.' : null
      })),
      passengersElsewhere: elsewhere,
      lifeSupport: calculateLifeSupportCostForTrip(ship)
    };
  }
  return {
    ship, system, profile, portCall, fuelService, destination, route, exclusive, speculation,
    fuel: { aboard, capacity, missing: Math.max(0, capacity - aboard) },
    berthingOwed: Boolean(portCall && !portCall.berthingPaid && portCall.berthingDueCr > 0),
    fight: encounters.find((entry) => entry.status === 'active' && entry.location?.systemId === system?.id) ?? null
  };
}

// The port call as one lead card and a list of rows, in the order Book 2 has
// a ship do them. Only what this version can act on carries a command.
export function portProcedure(resolved, { subsector, selectedSystemId = null, writable = true } = {}) {
  const facts = portFacts(resolved, subsector, selectedSystemId);
  const { ship, system, portCall, fuelService, fuel, destination } = facts;
  if (!ship || !system) return { next: { title: 'No ship in port', copy: 'This campaign has no active ship at a mapped world.', actions: [] }, steps: [], done: [] };
  const steps = [];
  const done = [];
  const act = (command, label, note) => (writable ? { command, label, note, primary: true } : null);

  if (portCall) {
    if (facts.berthingOwed) {
      steps.push({ id: 'berthing', title: 'Pay berthing', figure: cr(portCall.berthingDueCr), state: 'ready', command: 'berthing:pay', verb: 'Pay',
        copy: `Landing at ${system.name} costs ${cr(portCall.berthingDueCr)} for the first six days. The ship cannot leave until it is paid.`, cite: 'Book 2 p.7' });
    } else done.push(portCall.berthingDueCr > 0 ? `Berthed, ${cr(portCall.berthingDueCr)}` : 'Berthed');
  }

  if (fuel.missing < 1) done.push(`Tanks full, ${fuel.capacity} t`);
  else if (fuelService?.available) {
    const cost = fuelService.freeScoutFuel ? 0 : fuel.missing * fuelService.pricePerTonCr;
    steps.push({ id: 'fuel', title: 'Fill the tanks', figure: `${fuel.missing} t ${fuelService.quality}, ${cost ? cr(cost) : 'free'}`, state: 'ready', command: 'fuel:fill', verb: 'Fill',
      copy: fuelService.freeScoutFuel ? `The scout base at ${system.name} fuels this ship free.` : `${sentenceCase(fuelService.quality)} fuel at ${cr(fuelService.pricePerTonCr)} a ton. ${fuel.aboard} of ${fuel.capacity} t aboard.`, cite: 'Book 2 p.6' });
  } else {
    steps.push({ id: 'fuel', title: 'Fuel', figure: `${fuel.aboard} of ${fuel.capacity} t, none sold here`, state: 'blocked',
      copy: system.gasGiant ? 'This starport sells no fuel. The system has a gas giant to skim.' : 'This starport sells no fuel and the system has no gas giant.', cite: 'Book 2 p.6' });
  }

  if (facts.speculation && !facts.exclusive) {
    for (const { cargo, quote } of facts.speculation.sales) {
      const paid = Number(cargo.acquisitionCostCr ?? 0);
      const result = quote.netCr - paid;
      steps.push({ id: `sell-${cargo.id}`, title: `Sell ${cargo.tons} t ${quote.name}`, state: 'ready', command: `speculation:sell:${cargo.id}`, verb: 'Sell',
        figure: `${cr(quote.netCr)}, ${quote.percentage}% of base${paid ? `, ${result >= 0 ? 'up' : 'down'} ${cr(Math.abs(result))}` : ''}`,
        copy: `Today\u2019s price at ${system.name} is ${quote.percentage}% of base${quote.characterSkillDM ? `, with +${quote.characterSkillDM} for Admin or Bribery` : ''}. It cost ${cr(paid)}. The quote holds for today; it is thrown again on another day.`, cite: 'Book 2 p.47' });
    }
    const { buy } = facts.speculation;
    if (buy) {
      steps.push(buy.quantity > 0
        ? { id: 'speculate', title: `Buy ${buy.offer.name} to resell`, state: 'ready', command: 'speculation:buy', verb: `Buy ${buy.quantity} t`,
          figure: `${buy.quantity} t at ${cr(buy.offer.pricePerUnitCr)}, ${cr(buy.costCr)}${buy.handlingFeeCr ? ' with handling' : ''}`,
          copy: `This week\u2019s lot at ${system.name}: ${buy.remaining} t of ${buy.offer.name} left at ${buy.offer.percentage}% of its ${cr(buy.offer.basePriceCr)} base price. One lot a week${buy.handlingFeeCr ? `; taking part of it adds 1% handling, ${cr(buy.handlingFeeCr)}` : ''}. It sells on another world, for whatever that world throws.`, cite: 'Book 2 p.46' }
        : { id: 'speculate', title: `${buy.offer.name} to resell`, state: 'blocked', figure: `${buy.offer.percentage}% of base, ${cr(buy.offer.pricePerUnitCr)} a ${String(buy.offer.unit).replace(/s$/, '')}`, copy: buy.blocked, cite: 'Book 2 p.46' });
    }
  }

  if (facts.route && facts.exclusive) {
    steps.push({ id: 'commerce', title: 'Freight and passengers', figure: `Chartered to ${facts.exclusive.destination.systemName}`, state: 'blocked',
      copy: 'An exclusive charter commits the whole ship; no other cargo or passengers may be taken.', cite: 'Book 2 p.9' });
  } else if (facts.route) {
    const { route } = facts;
    const name = route.target.name;
    const fitting = route.freight.remaining.filter((entry) => entry.tons <= route.freeHold + 1e-9);
    for (const lot of route.freight.loaded) done.push(`Loaded ${lot.tons} t freight for ${name}`);
    fitting.slice(0, 4).forEach((lot, index) => steps.push({
      id: `freight-${lot.id}`, title: fitting.length > 1 ? `Freight lot ${index + 1} for ${name}` : `Freight for ${name}`,
      figure: `${lot.tons} t, ${cr(lot.revenueCr)} on delivery`, state: 'ready', command: `freight:load:${lot.id}`, verb: 'Load',
      copy: `A ${lot.tons} t shipment at ${cr(FREIGHT_RATE_PER_TON_CR)} a ton, paid when it is delivered. The hold has ${route.freeHold} t free.`, cite: 'Book 2 p.8' }));
    if (fitting.length > 4) steps.push({ id: 'freight-more', title: 'More freight', figure: `${fitting.length - 4} more lots fit`, state: 'optional', copy: 'They appear as the hold allows.', cite: 'Book 2 p.8' });
    if (!fitting.length) {
      const smallest = route.freight.remaining.length ? Math.min(...route.freight.remaining.map((entry) => entry.tons)) : null;
      steps.push({ id: 'freight-none', title: `Freight for ${name}`, state: 'blocked', cite: 'Book 2 p.8',
        figure: smallest === null ? (route.freight.loaded.length ? 'All of it is aboard' : 'None offered today') : `Smallest lot is ${smallest} t`,
        copy: smallest === null ? 'Nothing more is waiting for this destination.' : `The hold has ${route.freeHold} t free, and shipments cannot be split.` });
    }
    // Passengers this ship cannot carry are one quiet row, not one each.
    const turnedAway = [];
    for (const entry of route.classes) {
      const label = `${entry.passageClass[0].toUpperCase()}${entry.passageClass.slice(1)} passage`;
      if (entry.booked) done.push(`${entry.booked} ${entry.passageClass} passage booked for ${name}`);
      if (entry.waiting < 1) continue;
      const count = Math.min(entry.waiting, entry.berths);
      if (entry.blocked || count < 1) {
        turnedAway.push({ text: `${entry.waiting} ${entry.passageClass}`, why: entry.blocked ?? `No ${entry.passageClass === 'low' ? 'low berths' : 'staterooms'} free for ${entry.passageClass} passage.` });
      } else {
        steps.push({ id: `pass-${entry.passageClass}`, title: label, figure: `${entry.waiting} waiting, ${cr(entry.fareCr)} each`, state: 'ready',
          command: `passengers:book:${entry.passageClass}`, verb: `Book ${count}`,
          copy: `${entry.waiting} for ${name}; ${entry.berths} ${entry.passageClass === 'low' ? 'low berths' : 'staterooms'} free. Fares reach the ship\u2019s account when the passengers are delivered.`, cite: 'Book 2 p.8' });
      }
    }
    if (turnedAway.length) {
      steps.push({ id: 'pass-turned-away', title: 'Passengers you cannot carry', figure: `${turnedAway.map((entry) => entry.text).join(', ')} waiting`, state: 'blocked',
        copy: turnedAway.map((entry) => entry.why).join(' '), cite: 'Book 2 p.8' });
    }
  }

  let jump;
  if (!destination) jump = { figure: 'No destination yet', copy: 'Pick a world on the map first.' };
  else if (!destination.reachable) jump = { figure: `${destination.name} is ${destination.distance} parsecs`, copy: `Beyond this ship\u2019s Jump-${ship.specifications.drives.jump.rating}.` };
  else if (destination.fuel && !destination.fuel.allowed) jump = { figure: `${destination.name}: short of fuel`, copy: `The jump needs ${destination.fuel.requirement?.totalTons ?? '?'} t; ${destination.fuel.availableTons ?? fuel.aboard} t aboard.` };
  else if (facts.berthingOwed) jump = { figure: `${destination.name}: berthing unpaid`, copy: 'Pay berthing before departure.' };
  else if (facts.route?.passengersElsewhere.length) jump = { figure: `Passengers aboard for ${facts.route.passengersElsewhere.join(', ')}`, copy: 'Passengers already booked must be carried to their own destination first.' };
  else if (facts.exclusive && facts.exclusive.destination.systemId !== destination.id) jump = { figure: `Chartered to ${facts.exclusive.destination.systemName}`, copy: 'An exclusive charter goes to its own destination. Deliver it, or abandon it in the current client.' };
  else jump = { figure: `${destination.name}, ${destination.distance} parsec${destination.distance === 1 ? '' : 's'}`, copy: `Ready to go${facts.route?.lifeSupport?.totalCr ? `; life support for the trip will be ${cr(facts.route.lifeSupport.totalCr)}` : ''}. Departure itself is still run from the current client; it arrives on this page next.` };
  steps.push({ id: 'jump', title: 'Depart', state: 'blocked', cite: 'Book 2 p.5', ...jump });

  const first = steps.find((step) => step.state === 'ready' && (step.id === 'berthing' || step.id === 'fuel'));
  const next = facts.fight
    ? { title: 'A fight is in progress', copy: 'Finish it in the current client. This page leaves the campaign alone while a fight is running.', actions: [] }
    : first
      ? { title: first.title, copy: first.copy, cite: first.cite, actions: [act(first.command, first.verb, first.figure)].filter(Boolean) }
      : !destination
        ? { title: 'Choose a destination', copy: `Worlds within Jump-${ship.specifications.drives.jump.rating} of ${system.name} are marked on the map. Freight and passengers are offered per destination.`, cite: 'Book 2 p.8', actions: [] }
        : { title: `Bound for ${destination.name}`, cite: 'Book 2 p.8', actions: [],
          copy: facts.route && !facts.exclusive ? `Take what you want of the freight and passengers waiting for ${destination.name}, below. Pick another world to see what is waiting for it instead.` : jump.copy };
  return { next, steps: steps.filter((step) => step !== first || !next.actions.length).map((step) => (facts.fight || !writable ? { ...step, command: null, verb: null } : step)), done };
}

// cloud, when given, is { userId(), load(campaignId), save(home, envelope, { expectedRevision }) }
// — client/publish.js and client/auth.js in the browser, a fake in tests.
export function createPlaySession({ registry, campaignId, subsector, cloud = null, onChange = () => {} } = {}) {
  if (!registry) throw new TypeError('a document registry is required');
  let resolved = registry.resolveCampaign(campaignId);
  let revision = null;
  let save = { state: 'local', label: 'This browser only', detail: 'Saved in this browser', at: null };
  let saving = false;
  let queued = false;
  let lastMessage = null;

  const reload = () => { resolved = registry.resolveCampaign(campaignId); };
  // `label` is the few words the masthead has room for; `detail` is the sentence.
  const LABELS = { local: 'This browser only', cloud: 'Saved to the cloud', stale: 'Changed elsewhere', error: 'Cloud save failed' };
  const setSave = (state, detail) => { save = { state, label: LABELS[state] ?? state, detail, at: Date.now() }; onChange(); };

  function persist(changed) {
    const { campaign } = resolved;
    const refreshed = refreshCampaignDocumentRefs(campaign, {
      characters: resolved.characters, ships: resolved.ships, contracts: resolved.contracts, situations: resolved.situations,
      contacts: resolved.contacts, threads: resolved.threads, encounters: resolved.encounters, npcActors: resolved.npcActors,
      assets: resolved.assets, activityLogs: resolved.activityLogs, scenes: resolved.scenes
    });
    registry.putAll([...changed, refreshed]);
    reload();
  }

  function log(category, message) {
    let { campaign } = resolved;
    let document = resolved.activityLogs[0] ?? null;
    if (!document) {
      document = createActivityLogDocument({ campaign });
      campaign = addActivityLogToCampaign(campaign, document);
      registry.put(campaign);
    }
    registry.put(appendActivityLogEntry(document, { category, message, dateLabel: formatCampaignDate(campaign.time) }));
    reload();
  }

  async function connect() {
    if (!cloud?.userId?.()) { setSave('local', 'Saved in this browser only. Sign in to save to the cloud.'); return false; }
    try {
      const remote = await cloud.load(campaignId);
      if (remote) {
        const home = importCampaignHome(remote);
        registry.putBundle({ ...home.bundle, documents: { ...home.bundle.documents,
          activityLogs: home.bundle.documents.activityLogs.map((entry) => mergeActivityLogHistory(registry.get(entry.identity.id), entry)) } });
        revision = home.revision;
        reload();
        setSave('cloud', `Loaded from the cloud, revision ${home.revision}`);
      } else {
        revision = null;
        setSave('cloud', 'Signed in. The first change will create the cloud copy.');
      }
      return true;
    } catch (error) {
      setSave('error', `Cloud unavailable: ${error?.message ?? error}`);
      return false;
    }
  }

  async function saveToCloud() {
    const uid = cloud?.userId?.();
    if (!uid || save.state === 'stale') return null;
    if (saving) { queued = true; return null; }
    saving = true;
    try {
      let { campaign } = resolved;
      if (campaign.ownership?.ownerUid !== uid) { campaign = setCampaignOwner(campaign, uid); registry.put(campaign); reload(); }
      const bundle = registry.buildBundle(campaignId);
      const home = revision === null ? createCampaignHome(bundle, { ownerUid: uid }) : nextCampaignHome({ ownerUid: uid, revision }, bundle);
      const ship = resolved.ships.find((entry) => entry.identity.id === campaign.activeShipId) ?? resolved.ships[0] ?? null;
      const names = new Map([...resolved.characters, ...resolved.npcActors].map((entry) => [entry.identity.id, entry.identity.name]));
      const scene = resolved.scenes.find((entry) => entry.identity.id === campaign.activeSceneId) ?? null;
      const fight = resolved.encounters.find((entry) => entry.status === 'active') ?? null;
      const envelope = buildPublishedCampaign(campaign, {
        publishedAt: campaign.ownership?.publishedAt ?? home.savedAt, currentEncounterId: fight?.identity.id ?? null,
        ship, activeScene: scene ? buildPublishedScene(scene, { names }) : null
      });
      revision = await cloud.save(home, envelope, { expectedRevision: revision });
      if (!campaignIsPublished(resolved.campaign)) { registry.put(markCampaignPublished(resolved.campaign, home.savedAt)); reload(); }
      setSave('cloud', `Saved to the cloud, revision ${revision}`);
      return revision;
    } catch (error) {
      if (error instanceof StaleCampaignHomeError) setSave('stale', `This campaign was changed elsewhere (revision ${error.currentRevision}). Reload before continuing.`);
      else setSave('error', `Saved in this browser; the cloud save failed: ${error?.message ?? error}`);
      return null;
    } finally {
      saving = false;
      if (queued) { queued = false; saveToCloud(); }
    }
  }

  // Returns { ok, message }. A refused command changes nothing.
  function runInventory(command, { characterId = null, item = null } = {}) {
    const character = resolved.characters.find((entry) => entry.identity.id === characterId) ?? null;
    if (!character) throw new Error('choose a character first');
    const [, verb, ...rest] = command.split(':');
    const itemId = rest.join(':');
    const named = character.inventory.find((entry) => entry.id === itemId);
    let next;
    let message;
    if (verb === 'add') {
      if (item?.weaponKey) next = addCharacterInventoryItem(character, { weaponKey: item.weaponKey, carried: true });
      else {
        const name = String(item?.name ?? '').trim();
        const grams = Math.round(Number(item?.weightKg ?? 0) * 1000);
        const quantity = Math.max(1, Math.floor(Number(item?.quantity ?? 1)));
        if (!name) throw new Error('give the item a name');
        if (!Number.isFinite(grams) || grams < 0) throw new Error('weight must be zero or more kilograms');
        next = addCharacterInventoryItem(character, { name, weightGrams: grams, quantity, carried: true });
      }
      message = `${character.identity.name} now has ${next.inventory.at(-1).name}`;
    } else if (verb === 'toggle') {
      if (!named) throw new Error('that item is no longer listed');
      next = updateCharacterInventoryItem(character, itemId, { carried: !named.carried });
      message = `${character.identity.name} ${named.carried ? 'put down' : 'picked up'} ${named.name}`;
    } else if (verb === 'remove') {
      if (!named) throw new Error('that item is no longer listed');
      next = removeCharacterInventoryItem(character, itemId);
      message = `${named.name} removed from ${character.identity.name}\u2019s inventory`;
    } else if (verb === 'military') {
      next = setCharacterMilitaryLoad(character, itemId === 'on');
      message = `${character.identity.name} ${itemId === 'on' ? 'carries as part of a military force' : 'carries as a civilian'}`;
    } else throw new Error(`unknown command: ${command}`);
    persist([next]);
    return message;
  }

  function run(command, { selectedSystemId = null, characterId = null, item = null } = {}) {
    try {
      if (save.state === 'stale') throw new Error('this campaign was changed elsewhere; reload first');
      if (command.startsWith('inventory:')) {
        if (resolved.encounters.some((entry) => entry.status === 'active')) throw new Error('a fight is in progress; finish it in the current client');
        lastMessage = { ok: true, message: runInventory(command, { characterId, item }) };
        onChange();
        saveToCloud();
        return lastMessage;
      }
      const facts = portFacts(resolved, subsector, selectedSystemId);
      if (facts.fight) throw new Error('a fight is in progress; finish it in the current client');
      if (!facts.ship || !facts.system) throw new Error('an active ship at a mapped world is required');
      const shipName = facts.ship.identity.name || 'The ship';
      const dateLabel = formatCampaignDate(resolved.campaign.time);
      let message;
      if (command === 'berthing:pay') {
        const result = payCurrentBerthing(facts.ship, { dateLabel, description: `${facts.system.name} starport berthing` });
        persist([result.ship]);
        message = result.costCr > 0 ? `${shipName} paid ${cr(result.costCr)} berthing at ${facts.system.name}` : 'Berthing was already settled';
        if (result.costCr > 0) log('PORT', message);
      } else if (command === 'fuel:fill') {
        if (!facts.fuelService?.available) throw new Error('starport fuel is unavailable here');
        if (facts.fuel.missing < 1) throw new Error('fuel tanks are already full');
        const source = facts.fuelService.freeScoutFuel ? `${facts.system.name} Scout Base` : facts.fuelService.source;
        const result = purchaseShipFuel(facts.ship, { tons: facts.fuel.missing, quality: facts.fuelService.quality, pricePerTonCr: facts.fuelService.pricePerTonCr, source, dateLabel });
        persist([result.ship]);
        message = `${shipName} took on ${result.addedTons} t ${facts.fuelService.quality} fuel at ${facts.system.name}, ${result.costCr ? cr(result.costCr) : 'free'}`;
        log('SHIP', message);
      } else if (command === 'speculation:buy' || command.startsWith('speculation:sell:')) {
        if (facts.exclusive) throw new Error(`exclusive charter active for ${facts.exclusive.destination.systemName}; commercial capacity is committed`);
        if (command === 'speculation:buy') {
          const buy = facts.speculation?.buy;
          if (!buy) throw new Error('no speculative trade lot is available');
          if (buy.quantity < 1) throw new Error(buy.blocked);
          const result = purchaseSpeculativeCargo(facts.ship, buy.offer, buy.quantity, { originSystemId: facts.system.id, dateLabel });
          const campaign = recordSpeculativeLotPurchase(resolved.campaign, { key: buy.lotKey, systemId: facts.system.id, tradeGoodCode: buy.offer.code, quantity: buy.quantity });
          registry.put(campaign);
          reload();
          persist([result.ship]);
          message = `${shipName} bought a speculative lot: ${buy.quantity} t ${buy.offer.name} at ${facts.system.name}, ${cr(result.costCr)}${result.handlingFeeCr ? ` including ${cr(result.handlingFeeCr)} handling` : ''}`;
        } else {
          const cargoId = command.slice('speculation:sell:'.length);
          const sale = facts.speculation?.sales.find((entry) => entry.cargo.id === cargoId);
          if (!sale) throw new Error(facts.ship.state.cargoManifest.some((entry) => entry.id === cargoId) ? 'speculative cargo must be carried to another world before resale' : 'that lot is no longer aboard');
          const result = sellSpeculativeCargo(facts.ship, cargoId, sale.quote, { dateLabel, destinationSystemId: facts.system.id });
          persist([result.ship]);
          message = `${sale.cargo.tons} t ${sale.quote.name} sold at ${facts.system.name}, ${cr(result.revenueCr)} net, ${result.profitCr >= 0 ? 'up' : 'down'} ${cr(Math.abs(result.profitCr))}`;
        }
        log('TRADE', message);
      } else if (command.startsWith('freight:load:') || command.startsWith('passengers:book:')) {
        if (facts.exclusive) throw new Error(`exclusive charter active for ${facts.exclusive.destination.systemName}; commercial capacity is committed`);
        if (!facts.route) throw new Error('choose a destination within jump range first');
        const { route } = facts;
        if (command.startsWith('freight:load:')) {
          const offer = route.freight.remaining.find((entry) => entry.id === command.slice('freight:load:'.length));
          if (!offer) throw new Error('that freight shipment is no longer on offer');
          const ship = loadCargo(facts.ship, { id: offer.id, category: 'freight', description: `${offer.tons}t freight to ${route.target.name}`, tons: offer.tons,
            originSystemId: facts.system.id, destinationSystemId: route.target.id, acquisitionCostCr: 0,
            notes: `Book 2 freight / Cr${FREIGHT_RATE_PER_TON_CR.toLocaleString('en-US')} per ton on delivery.` });
          persist([ship]);
          message = `${shipName} accepted a ${offer.tons} t shipment, ${facts.system.name} to ${route.target.name}, ${cr(offer.revenueCr)} on delivery`;
        } else {
          const passageClass = command.slice('passengers:book:'.length);
          const entry = route.classes.find((candidate) => candidate.passageClass === passageClass);
          if (!entry) throw new Error(`unknown passage class: ${passageClass}`);
          if (entry.blocked) throw new Error(entry.blocked);
          const count = Math.min(entry.waiting, entry.berths);
          if (count < 1) throw new Error(entry.waiting < 1 ? `no ${passageClass} passengers are waiting for ${route.target.name}` : `no berths free for ${passageClass} passage`);
          let ship = facts.ship;
          for (let index = 0; index < count; index += 1) {
            ship = bookPassenger(ship, { id: `pass-${campaignDateKey(resolved.campaign)}-${facts.system.id}-${route.target.id}-${passageClass}-${entry.booked + index + 1}`,
              passageClass, originSystemId: facts.system.id, destinationSystemId: route.target.id });
          }
          persist([ship]);
          message = `${count} ${passageClass} passenger${count === 1 ? '' : 's'} booked, ${facts.system.name} to ${route.target.name}, fare ${cr(entry.fareCr)} each`;
        }
        log('TRADE', message);
      } else throw new Error(`unknown command: ${command}`);
      lastMessage = { ok: true, message };
      onChange();
      saveToCloud();
      return lastMessage;
    } catch (error) {
      lastMessage = { ok: false, message: error?.message ?? String(error) };
      onChange();
      return lastMessage;
    }
  }

  return {
    connect, run, saveToCloud, reload,
    get resolved() { return resolved; },
    get revision() { return revision; },
    get save() { return save; },
    get lastMessage() { return lastMessage; },
    view({ seat = 'referee', characterId = null, selectedSystemId = null } = {}) {
      const state = buildPlayViewState(resolved, { subsector, seat, characterId });
      if (state.situation.kind !== 'port') return { ...state, save, notice: lastMessage };
      const procedure = portProcedure(resolved, { subsector, selectedSystemId, writable: save.state !== 'stale' });
      return { ...state, ...procedure, scene: { ...state.scene, selectedId: selectedSystemId }, save, notice: lastMessage };
    }
  };
}

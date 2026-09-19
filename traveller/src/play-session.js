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
  FREIGHT_RATE_PER_TON_CR, PASSAGE_FARES_CR, availablePassengerCapacity, beginPortCall, bookPassenger,
  calculateBerthingCost, calculateLifeSupportCostForTrip, calculateSpeculativePurchaseCost, canShipMakeJump,
  chargeLifeSupportForTrip, chargeShipUpkeep, consumeJumpFuel, creditShipAccount, deliverFreightAtDestination,
  disembarkPassengersAtDestination, generateFreightOffers, generatePassengerDemand, generateSpeculativeTradeOffer,
  getPersonalWeapon, getSubsectorSystem, jumpDistanceBetweenSystems, loadCargo, parseUniversalWorldProfile,
  payCurrentBerthing, purchaseShipFuel, purchaseSpeculativeCargo, quoteSpeculativeResale, sellSpeculativeCargo,
  createDice, rollReaction, rollShipEncounter, starportFuelService, unloadCargo
} from '../vendor/classic-traveller-rules/index.js';
// The market seeds are shared with client/app.js so both pages draw the same
// freight lots and the same passengers for a route on a given day.
import { campaignDateKey, routeMarketSeed, saleQuoteSeed, seededDice, weeklyTradeSeed } from '../client/commerce-market.js';
import {
  addActivityLogToCampaign, campaignIsPublished, markCampaignPublished, recordSpeculativeLotPurchase, refreshCampaignDocumentRefs,
  setCampaignOwner, speculativeLotPurchasedQuantity, updateCampaignLocation, advanceCampaignDays
} from './campaign-document.js';
import { completeContractDocument, failContractDocument, isContractOverdue, reconcileContractDeadlines } from './contract-document.js';
import {
  allocateRoundWound, createEncounterDocument, declareEncounterAction, endEncounterByReferee,
  opponentSpecFromNpcActor, pendingWoundAllocation, resolveDeclaredRound, undeclareEncounterAction,
  undeclaredCombatantIds
} from './encounter-document.js';
import { addEncounterToCampaign } from './campaign-document.js';
import { chooseNpcDeclaration, pendingNpcDeclarations } from './npc-tactics.js';

// client/app.js's own convention for a contract's reserved cargo manifest id.
const contractCargoId = (contract) => `${contract.identity.id}:cargo`;
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
    // v0.218.1: a fight has to be startable from this page. These are the
    // roster actors that can be put on the board against the party.
    // Who could take the field. A character with no name cannot become a
    // combatant (the engine refuses it), and one already down should not be
    // put back on the board by accident, so both are offered but flagged.
    partyChoices: (resolved.campaign.party?.characterIds ?? [])
      .map((id) => (resolved.characters ?? []).find((entry) => entry.identity.id === id))
      .filter(Boolean)
      .map((entry) => {
        const view = characterView(entry);
        const named = Boolean(String(entry.identity.name ?? '').trim());
        return {
          id: entry.identity.id,
          name: named ? entry.identity.name : '(unnamed character)',
          note: named ? `${view.weapons[0]?.name ?? 'hands'}, ${view.status.toLowerCase()}` : 'needs a name before it can fight',
          eligible: named && view.status !== 'Dead'
        };
      }),
    opponents: (resolved.npcActors ?? []).filter((actor) => !actor.archived).map((actor) => ({
      id: actor.identity.id,
      name: actor.identity.name,
      note: [actor.loadout?.weaponKey, actor.loadout?.armor === 'none' ? null : actor.loadout?.armor].filter(Boolean).join(', ')
    })),
    weaponCatalog: weaponCatalog()
  };
}

// v0.212.0: a live encounter as the fight screen's view state. The encounter
// document is already headless, so this only reshapes it: the range-line puts
// a combatant's band in position.column, `characteristics` is the full score
// and `current` the wounded one, and this round's orders live in
// roundState.declaredActions.
const ENGINE_ORDER_WORDS = Object.freeze({
  attack: 'stand', evade: 'evade', close: 'close', open: 'open',
  'close-run': 'close (run)', 'open-run': 'open (run)', escape: 'escape', wait: 'stand'
});

// The fight screen declares a movement status and an attack separately, as
// Book 1 p.28 steps 4A and 4B do. The engine encodes the pair as one action:
// walking while closing or opening still permits an attack, running and
// evading do not. This is that mapping, in one place.
export function engineActionFor({ move = 'Stand', running = false, attack = true } = {}) {
  const status = String(move).toLowerCase();
  if (status === 'evade') return 'evade';
  if (status === 'close') return running ? 'close-run' : (attack ? 'close' : 'close-run');
  if (status === 'open') return running ? 'open-run' : (attack ? 'open' : 'open-run');
  return attack ? 'attack' : 'wait';
}

// v0.218.0: the round as a declaration sheet. Book 1 p.26 step 4 is two passes
// over everyone — A, movement status; B, attack and target — so the screen is
// one row per combatant, filled in and resolved together. These are the
// sheet's movement words and how they meet the engine's combined action.
export const SHEET_MOVES = Object.freeze(['Stand', 'Close', 'Close (run)', 'Open', 'Open (run)', 'Evade']);

export function sheetRowToEngine({ move = 'Stand', targetId = null } = {}) {
  if (move === 'Evade') return { action: 'evade', targetId: null };
  if (move === 'Escape') return { action: 'escape', targetId: null };
  if (move === 'Close') return { action: 'close', targetId };
  if (move === 'Close (run)') return { action: 'close-run', targetId };
  if (move === 'Open') return { action: 'open', targetId };
  if (move === 'Open (run)') return { action: 'open-run', targetId };
  return targetId ? { action: 'attack', targetId } : { action: 'wait', targetId: null };
}

export function engineToSheetMove(action) {
  return { attack: 'Stand', wait: 'Stand', close: 'Close', 'close-run': 'Close (run)', open: 'Open', 'open-run': 'Open (run)', evade: 'Evade', escape: 'Escape' }[action] ?? 'Stand';
}

export function fightView(encounter, { characters = [] } = {}) {
  if (!encounter || encounter.status !== 'active') return null;
  const byId = new Map(characters.map((entry) => [entry.identity.id, entry]));
  const declared = new Map((encounter.roundState?.declaredActions ?? []).map((entry) => [entry.actorId, entry]));
  const awaiting = new Set(undeclaredCombatantIds(encounter));
  const line = encounter.map?.spatialMode === 'range-line';

  const fighters = encounter.combatants.map((entry) => {
    const order = declared.get(entry.id) ?? null;
    const source = byId.get(entry.sourceActorId ?? entry.id) ?? null;
    // What else this combatant could pick up: carried weapons from the
    // character's own inventory, plus what is in hand and bare hands.
    const carried = (source?.inventory ?? []).filter((item) => item.carried && item.weaponKey).map((item) => item.weaponKey);
    const weapons = [...new Set([entry.weaponKey, ...carried, 'hands'])];
    let weaponLabel = entry.weaponKey;
    try {
      const spec = getPersonalWeapon(entry.weaponKey);
      const modifier = spec.damageModifier ?? 0;
      weaponLabel = `${spec.name} ${spec.damageDice}D${modifier ? (modifier > 0 ? `+${modifier}` : `\u2212${Math.abs(modifier)}`) : ''}`;
    } catch { /* an animal's natural weapon may not be in the table */ }
    return {
      id: entry.id,
      name: entry.name,
      weaponLabel,
      armorLabel: entry.armor === 'none' ? 'no armor' : entry.armor,
      tactics: entry.tactics,
      side: entry.side === 'party' ? 'party' : 'foe',
      band: line ? entry.position.column : null,
      playerCharacter: Boolean(entry.playerCharacter),
      full: { ...entry.characteristics },
      characteristics: { ...entry.current },
      armor: entry.armor,
      weaponKey: entry.weaponKey,
      weapons,
      skills: { ...entry.skills },
      blowAllowance: entry.blowAllowance,
      // Book 1 p.32: wounds do not reduce the blow allowance during a fight,
      // but they do in subsequent combats — the allowance is the endurance the
      // combatant arrived with. A thug who walked in already hurt therefore has
      // fewer swings than its characteristic suggests, which is worth saying.
      blowsFromWounds: entry.blowAllowance < entry.characteristics.END,
      blowsUsed: entry.blowsUsed,
      down: entry.status !== 'active',
      contactIds: [...(entry.contactIds ?? [])],
      upp: source?.upp ?? null,
      service: source ? characterView(source).service : null,
      awaiting: awaiting.has(entry.id),
      // What this combatant would do left to itself, and why. The sheet
      // pre-fills an NPC's row with it; the referee may change any of it.
      suggestion: (() => {
        if (entry.status !== 'active' || entry.side === 'party') return null;
        try {
          const choice = chooseNpcDeclaration(encounter, entry);
          return choice ? { move: engineToSheetMove(choice.action), targetId: choice.targetId ?? null, reason: choice.reason } : null;
        } catch { return null; }
      })(),
      order: order
        ? {
          move: ENGINE_ORDER_WORDS[order.action] ?? order.action,
          // Book 1 p.28 step 4B. The engine's action carries both halves:
          // attack/close/open attack as well as move, close-run/open-run and
          // evade do not. This was hard-coded to null, so every order on the
          // tracker read as movement only and an attack never showed.
          attack: ['attack', 'close', 'open'].includes(order.action)
            ? (() => { try { return getPersonalWeapon(entry.weaponKey).melee ? 'swing' : 'fire'; } catch { return 'attack'; } })()
            : null,
          targetId: order.targetId ?? null,
          engineAction: order.action
        }
        : null
    };
  });

  const lastRound = (encounter.history ?? [])
    .filter((entry) => entry.round === encounter.round - 1 && entry.text)
    .map((entry) => entry.text);

  const named = new Map(fighters.map((entry) => [entry.id, entry.name]));
  const declaredList = fighters.filter((entry) => entry.order).map((entry) => ({
    id: entry.id,
    name: entry.name,
    side: entry.side,
    text: `${entry.order.move}${entry.order.targetId ? ` \u2192 ${named.get(entry.order.targetId) ?? 'target'}` : ''}`
  }));

  // Steps 1-3 of the procedure happen once; say how they came out.
  const surprise = encounter.surprise ?? {};
  const sideName = (id) => (id === 'party' ? 'The party' : 'The opposition');
  const setup = {
    surprise: surprise.surpriseSideId
      ? `${sideName(surprise.surpriseSideId)} has surprise${encounter.round === 1 ? ': the other side cannot act this round' : ' (spent)'}`
      : 'Neither side has surprise',
    range: `Met at ${String(encounter.range ?? '').replace('-', ' ')} range`,
    surprisedSide: encounter.round === 1 ? (surprise.surprisedSideId ?? null) : null
  };
  // Book 1 p.33: at 25% of a party unconscious or killed, it throws morale
  // each round, 7+ to stand; -2 once casualties pass 50%.
  const casualties = ['party', 'foe'].map((side) => {
    const members = fighters.filter((entry) => entry.side === side);
    const out = members.filter((entry) => entry.down).length;
    const share = members.length ? out / members.length : 0;
    return { side, out, of: members.length, share, throwing: share >= 0.25 && out < members.length };
  });

  return {
    encounterId: encounter.identity.id,
    fighters,
    setup,
    casualties,
    declaredList,
    round: encounter.round,
    lastRound,
    awaitingIds: [...awaiting],
    situation: { kind: 'fight', title: `Fight, round ${encounter.round}`, detail: line ? 'Range bands' : 'Tactical grid' },
    scene: { kind: line ? 'bands' : 'grid', selected: fighters.find((entry) => entry.playerCharacter && !entry.down)?.id ?? fighters[0]?.id ?? null }
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
  else jump = { figure: `${destination.name}, ${destination.distance} parsec${destination.distance === 1 ? '' : 's'}`, command: 'depart', verb: 'Depart',
    copy: `Ready to go${facts.route?.lifeSupport?.totalCr ? `; life support for the trip will be ${cr(facts.route.lifeSupport.totalCr)}` : ''}. The trip takes a week (Book 2 p.5).` };
  steps.push({ id: 'jump', title: 'Depart', state: jump.command ? 'ready' : 'blocked', cite: 'Book 2 p.5', ...jump });

  const first = steps.find((step) => step.state === 'ready' && (step.id === 'berthing' || step.id === 'fuel'));
  const next = facts.fight
    ? { title: 'A fight is in progress', copy: 'Finish it in the current client. This page leaves the campaign alone while a fight is running.', actions: [] }
    : first
      ? { title: first.title, copy: first.copy, cite: first.cite, actions: [act(first.command, first.verb, first.figure)].filter(Boolean) }
      : !destination
        ? { title: 'Choose a destination', copy: `Worlds within Jump-${ship.specifications.drives.jump.rating} of ${system.name} are marked on the map. Freight and passengers are offered per destination.`, cite: 'Book 2 p.8', actions: [] }
        : { title: `Bound for ${destination.name}`, cite: 'Book 2 p.5', actions: [act('depart', 'Depart', jump.figure)].filter(Boolean),
          copy: facts.route && !facts.exclusive ? `Take what you want of the freight and passengers waiting for ${destination.name}, below, then Depart. ${jump.copy}` : jump.copy };
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
  // The arrival encounter is held for the current port call only. It is not a
  // document: a reload forgets it, which is the same as the referee letting
  // the ship pass.
  let pendingArrivalEncounter = null;
  const liveEncounter = () => (resolved.encounters ?? []).find((entry) => entry.status === 'active') ?? null;

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

  function run(command, { selectedSystemId = null, characterId = null, item = null, fight = null } = {}) {
    try {
      if (save.state === 'stale') throw new Error('this campaign was changed elsewhere; reload first');
      if (command.startsWith('inventory:')) {
        if (resolved.encounters.some((entry) => entry.status === 'active')) throw new Error('a fight is in progress; finish it in the current client');
        lastMessage = { ok: true, message: runInventory(command, { characterId, item }) };
        onChange();
        saveToCloud();
        return lastMessage;
      }
      if (command === 'fight:start') {
        if (liveEncounter()) throw new Error('a fight is already running');
        const wantedParty = Array.isArray(fight?.characterIds) && fight.characterIds.length
          ? fight.characterIds
          : (resolved.campaign.party?.characterIds ?? []);
        const party = wantedParty
          .map((id) => resolved.characters.find((entry) => entry.identity.id === id))
          .filter(Boolean);
        // A character with no name cannot become a combatant (the engine
        // refuses it) and there is one in the Sea of Suns party, so say which
        // rather than failing the whole fight with a validation message.
        const nameless = party.filter((entry) => !String(entry.identity.name ?? '').trim());
        const named = party.filter((entry) => String(entry.identity.name ?? '').trim());
        if (!named.length) throw new Error('the party has no named characters to fight with');
        const wanted = Array.isArray(fight?.opponentIds) ? fight.opponentIds : [];
        const actors = (resolved.npcActors ?? []).filter((actor) => wanted.includes(actor.identity.id));
        if (!actors.length) throw new Error('choose who the party is fighting');
        const encounter = createEncounterDocument({
          campaign: resolved.campaign,
          characters: named,
          opponents: actors.map(opponentSpecFromNpcActor),
          spatialMode: 'range-line',
          range: fight?.range ?? 'medium',
          date: resolved.campaign.time,
          dice: createDice()
        });
        registry.put(encounter);
        registry.put(addEncounterToCampaign(resolved.campaign, encounter));
        reload();
        persist([]);
        const message = [
          `Fight begins: ${named.map((entry) => entry.identity.name).join(', ')} against ${actors.map((actor) => actor.identity.name).join(', ')}, at ${fight?.range ?? 'medium'} range`,
          nameless.length ? `${nameless.length} unnamed character${nameless.length === 1 ? '' : 's'} left out; a combatant needs a name` : null
        ].filter(Boolean).join('. ');
        log('COMBAT', message);
        lastMessage = { ok: true, message };
        onChange();
        saveToCloud();
        return lastMessage;
      }
      if (command.startsWith('fight:')) {
        let message;
        const encounter = liveEncounter();
        if (!encounter) throw new Error('no fight is running');
        const [, verb] = command.split(':');
        if (verb === 'declare') {
          const actorId = fight?.actorId;
          if (!actorId) throw new Error('choose who is declaring');
          const action = engineActionFor(fight ?? {});
          const result = declareEncounterAction(encounter, { action, actorId, targetId: fight?.targetId ?? null });
          persist([result.encounter]);
          const actor = encounter.combatants.find((entry) => entry.id === actorId);
          message = `${actor?.name ?? 'Combatant'} declared ${action.replace('-', ' at a ')}`;
        } else if (verb === 'sheet') {
          // The sheet is the declaration: whatever rows it carries replace any
          // orders already standing for those combatants, then the round is
          // resolved. A row the engine refuses (a surprised combatant, say) is
          // reported and the rest still go through.
          const rows = Array.isArray(fight?.rows) ? fight.rows : [];
          let staged = encounter;
          const refused = [];
          for (const row of rows) {
            const actor = staged.combatants.find((entry) => entry.id === row.actorId);
            if (!actor || actor.status !== 'active') continue;
            if (staged.roundState.declaredActions.some((entry) => entry.actorId === row.actorId)) {
              staged = undeclareEncounterAction(staged, { actorId: row.actorId }).encounter;
            }
            const order = sheetRowToEngine(row);
            try {
              staged = declareEncounterAction(staged, { action: order.action, actorId: row.actorId, targetId: order.targetId }).encounter;
            } catch (error) {
              refused.push(`${actor.name}: ${error?.message ?? error}`);
            }
          }
          const result = resolveDeclaredRound(staged, { dice: createDice(), date: resolved.campaign.time, playerAllocatesWounds: true });
          persist([result.encounter]);
          const narration = (result.encounter.history ?? []).filter((entry) => entry.round === staged.round && entry.text).map((entry) => entry.text);
          message = [...refused.map((line) => `Refused \u2014 ${line}`), ...narration].join('. ') || `Round ${staged.round} resolved`;
        } else if (verb === 'undeclare') {
          const actorId = fight?.actorId;
          const actor = encounter.combatants.find((entry) => entry.id === actorId);
          if (!actor) throw new Error('choose whose orders to take back');
          persist([undeclareEncounterAction(encounter, { actorId }).encounter]);
          message = `${actor.name}'s orders taken back`;
        } else if (verb === 'auto') {
          const actorId = fight?.actorId;
          const actor = encounter.combatants.find((entry) => entry.id === actorId);
          if (!actor) throw new Error('choose who is acting');
          const choice = chooseNpcDeclaration(encounter, actor);
          if (!choice) throw new Error(`${actor.name} cannot act`);
          const result = declareEncounterAction(encounter, { action: choice.action, modifier: choice.modifier, actorId: choice.actorId, targetId: choice.targetId });
          persist([result.encounter]);
          message = `${actor.name} (auto) declares ${choice.action}: ${choice.reason}`;
        } else if (verb === 'resolve' || verb === 'resolve-auto') {
          if (verb === 'resolve-auto') {
            // Book-keeping the referee should not have to do by hand: every
            // NPC still on auto picks its own target and action, each with
            // the reason it gave, before the round is resolved. A referee who
            // wants something else declares it first; a declared combatant is
            // never overridden here.
            let staged = encounter;
            for (const choice of pendingNpcDeclarations(staged)) {
              try {
                staged = declareEncounterAction(staged, { action: choice.action, modifier: choice.modifier, actorId: choice.actorId, targetId: choice.targetId }).encounter;
                const actor = staged.combatants.find((entry) => entry.id === choice.actorId);
                log('COMBAT', `${actor?.name ?? 'Combatant'} (auto) declares ${choice.action}: ${choice.reason}`);
              } catch (error) { /* the resolver falls back for anyone left */ }
            }
            persist([staged]);
          }
          const current = liveEncounter();
          const waiting = undeclaredCombatantIds(current);
          // The engine falls back to the nearest enemy for anyone still
          // without orders, so this is a caution rather than a refusal — but
          // a party character left undeclared is almost always a mistake.
          const party = waiting.filter((id) => current.combatants.find((entry) => entry.id === id)?.side === 'party');
          if (party.length && verb === 'resolve') {
            const names = party.map((id) => current.combatants.find((entry) => entry.id === id)?.name ?? id);
            throw new Error(`${names.join(', ')} ${names.length === 1 ? 'has' : 'have'} no orders yet`);
          }
          // A player character's wound after first blood is the player's to
          // place (Book 1 p.30), so the round may pause and finish later.
          const before = liveEncounter();
          const result = resolveDeclaredRound(before, { dice: createDice(), date: resolved.campaign.time, playerAllocatesWounds: true });
          persist([result.encounter]);
          const narration = (result.encounter.history ?? []).filter((entry) => entry.round === before.round && entry.text).map((entry) => entry.text);
          message = narration.length ? narration.join('. ') : `Round ${before.round} resolved`;
        } else if (verb === 'wound') {
          const waiting = pendingWoundAllocation(encounter);
          if (!waiting) throw new Error('no wound is waiting to be allocated');
          const targets = fight?.woundTargets ?? null;
          if (!Array.isArray(targets) || !targets.length) throw new Error('choose where each wound group falls');
          const result = allocateRoundWound(encounter, { key: waiting.key, targets, allocation: fight?.woundAllocation ?? null, dice: createDice(), date: resolved.campaign.time });
          persist([result.encounter]);
          message = `${waiting.defender?.name ?? 'The wounded'} took ${targets.join(', ')}`;
        } else if (verb === 'end') {
          const result = endEncounterByReferee(encounter, { date: resolved.campaign.time });
          persist([result.encounter]);
          message = 'The fight is over';
        } else throw new Error(`unknown command: ${command}`);
        log('COMBAT', message);
        lastMessage = { ok: true, message };
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
      } else if (command === 'arrival:dismiss') {
        if (!pendingArrivalEncounter) throw new Error('no arrival encounter is standing');
        message = `${pendingArrivalEncounter.label} let pass at ${facts.system?.name ?? 'the port'}`;
        pendingArrivalEncounter = null;
        log('NAV', message);
        lastMessage = { ok: true, message };
        onChange();
        saveToCloud();
        return lastMessage;
      } else if (command === 'depart') {
        pendingArrivalEncounter = null;
        if (!facts.destination) throw new Error('choose a destination within jump range first');
        if (!facts.destination.reachable) throw new Error(`${facts.destination.name} is ${facts.destination.distance} parsecs; beyond Jump-${facts.ship.specifications.drives.jump.rating}`);
        if (facts.berthingOwed) throw new Error('pay berthing before departure');
        if (facts.route?.passengersElsewhere.length) throw new Error(`passengers aboard for ${facts.route.passengersElsewhere.join(', ')} must be carried there first`);
        if (facts.exclusive && facts.exclusive.destination.systemId !== facts.destination.id) throw new Error(`chartered to ${facts.exclusive.destination.systemName}; deliver or abandon it in the current client first`);
        const fuelCheck = canShipMakeJump(facts.ship, facts.destination.distance);
        if (!fuelCheck.allowed) throw new Error(fuelCheck.reason === 'FUEL UNRECORDED' ? 'ship fuel is unrecorded; refuel or skim before jumping' : `insufficient fuel: need ${fuelCheck.requirement.totalTons} t, have ${fuelCheck.availableTons} t`);
        const lifeSupport = calculateLifeSupportCostForTrip(facts.ship);
        if (lifeSupport.totalCr > facts.ship.state.finances.balanceCr) throw new Error(`life support for the trip needs ${cr(lifeSupport.totalCr)}; account holds ${cr(facts.ship.state.finances.balanceCr)}`);

        const origin = facts.system;
        const target = getSubsectorSystem(subsector, facts.destination.id);
        const targetProfile = parseUniversalWorldProfile(target.mainWorld.uwp);
        let ship = facts.ship;
        const lifeSupportResult = chargeLifeSupportForTrip(ship, { dateLabel });
        ship = lifeSupportResult.ship;
        const fuelResult = consumeJumpFuel(ship, facts.destination.distance);
        ship = fuelResult.ship;

        let campaign = updateCampaignLocation(resolved.campaign, {
          systemId: target.id, systemName: target.name, worldId: target.mainWorld.id, worldName: target.mainWorld.name
        });
        // Book 2: jump travel takes about one week regardless of distance.
        campaign = advanceCampaignDays(campaign, 7);
        registry.put(campaign);
        // persist() below rebuilds document refs from resolved.campaign, so
        // the new date and location must be in resolved before it runs.
        reload();

        const freightDelivery = deliverFreightAtDestination(ship, target.id, { dateLabel });
        ship = freightDelivery.ship;
        const passengerDelivery = disembarkPassengersAtDestination(ship, target.id, { dateLabel });
        ship = passengerDelivery.ship;

        // Contracts for this destination: pay out or fail, and release any
        // reserved cargo. Every other contract passes through unchanged.
        const afterTrip = { ...campaign, time: campaign.time };
        const contractResults = [];
        const contracts = (resolved.contracts ?? []).map((contract) => {
          if (contract.status !== 'accepted' || contract.destination?.systemId !== target.id) return contract;
          let cargoOk = true;
          if (contract.requirements?.cargoTons > 0) {
            const cargoId = contractCargoId(contract);
            const cargo = ship.state.cargoManifest.find((entry) => entry.id === cargoId);
            cargoOk = Boolean(cargo && Math.abs(cargo.tons - contract.requirements.cargoTons) < 1e-9);
            if (cargo) ship = unloadCargo(ship, cargoId).ship;
          }
          const overdue = isContractOverdue(contract, afterTrip.time);
          if (overdue || !cargoOk) {
            const failed = failContractDocument(contract, { date: afterTrip.time, notes: overdue ? 'deadline missed' : 'required contract cargo missing' });
            contractResults.push({ contract: failed, success: false });
            return failed;
          }
          ship = creditShipAccount(ship, contract.economics.paymentCr, { kind: 'contract', description: `${contract.identity.title} completed / ${target.name}`, dateLabel });
          const completed = completeContractDocument(contract, { date: afterTrip.time, paymentCr: contract.economics.paymentCr, notes: `Completed at ${target.name}` });
          contractResults.push({ contract: completed, success: true });
          return completed;
        });
        // Every other accepted contract, anywhere, also has its deadline checked.
        const reconciled = reconcileContractDeadlines(contracts, afterTrip.time);
        for (const contract of reconciled.failed) {
          if (contract.requirements?.cargoTons > 0) {
            const cargoId = contractCargoId(contract);
            if (ship.state.cargoManifest.some((entry) => entry.id === cargoId)) ship = unloadCargo(ship, cargoId).ship;
          }
        }

        ship = beginPortCall(ship, { systemId: target.id, arrivalDate: dateLabel, berthingDueCr: targetProfile.starport === 'X' ? 0 : calculateBerthingCost(1) });

        // Book 2 p.38: a throw for shipping encountered on arrival, with the
        // starport's DM. Seeded on the arrival itself so the same arrival
        // always yields the same encounter, and a reload cannot reroll it.
        const arrivalSeed = `${campaign.identity.id}|arrival|${target.id}|${dateLabel}`;
        const encounterDice = seededDice(arrivalSeed);
        const shipEncounter = rollShipEncounter(encounterDice, { starport: targetProfile.starport });
        let arrival = null;
        if (shipEncounter.type) {
          const reaction = rollReaction(seededDice(`${arrivalSeed}|reaction`));
          arrival = {
            type: shipEncounter.type,
            label: shipEncounter.label,
            hull: shipEncounter.hull?.label ?? null,
            hostileByDefault: Boolean(shipEncounter.hostileByDefault),
            reaction: reaction.description,
            systemId: target.id,
            dateLabel
          };
        }
        const upkeep = chargeShipUpkeep(ship, { dateLabel, sinceLabel: ship.state.finances?.ledger?.[0]?.date ?? null, unpaid: ship.authority?.assignedCharacterId ? [ship.authority.assignedCharacterId] : [] });
        ship = upkeep.ship;

        persist([ship, ...reconciled.contracts]);
        const shipName = facts.ship.identity.name || 'The ship';
        const parts = [`${shipName} arrived at ${target.name} (${target.hex}), ${facts.destination.distance} parsec${facts.destination.distance === 1 ? '' : 's'} from ${origin.name}, fuel ${ship.state.currentFuelTons} t`];
        if (freightDelivery.delivered?.length) parts.push(`${freightDelivery.delivered.length} freight shipment${freightDelivery.delivered.length === 1 ? '' : 's'} delivered, ${cr(freightDelivery.revenueCr)}`);
        if (passengerDelivery.passengers?.length) parts.push(`${passengerDelivery.passengers.length} passenger${passengerDelivery.passengers.length === 1 ? '' : 's'} disembarked, ${cr(passengerDelivery.revenueCr)}`);
        for (const result of contractResults) parts.push(result.success ? `${result.contract.identity.title} completed, ${cr(result.contract.economics.paymentCr)}` : `${result.contract.identity.title} failed (${result.contract.notes})`);
        if (upkeep.paidCr > 0) parts.push(`upkeep settled, ${cr(upkeep.paidCr)}`);
        if (upkeep.outstandingCr > 0) parts.push(`upkeep outstanding, ${cr(upkeep.outstandingCr)}`);
        if (ship.state.portCall.berthingDueCr > 0) parts.push(`berthing due, ${cr(ship.state.portCall.berthingDueCr)}`);
        message = parts.join('. ');
        log('ARRIVAL', message);
        if (arrival) {
          pendingArrivalEncounter = arrival;
          const seen = `${arrival.label}${arrival.hull ? ` (${arrival.hull})` : ''} encountered at ${target.name}: ${arrival.reaction}`;
          log('NAV', seen);
          message = `${message}. ${seen}`;
          lastMessage = { ok: true, message };
        }
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
    get arrivalEncounter() { return pendingArrivalEncounter; },
    dismissArrivalEncounter() { pendingArrivalEncounter = null; onChange(); },
    get resolved() { return resolved; },
    get revision() { return revision; },
    get save() { return save; },
    get lastMessage() { return lastMessage; },
    view({ seat = 'referee', characterId = null, selectedSystemId = null, selectedFighterId = null } = {}) {
      const state = buildPlayViewState(resolved, { subsector, seat, characterId });
      // A fight in progress is what is happening; nothing else is offered.
      const live = (resolved.encounters ?? []).find((entry) => entry.status === 'active');
      const fight = fightView(live, { characters: resolved.characters ?? [] });
      if (fight) {
        const writable = save.state !== 'stale';
        const wound = pendingWoundAllocation(live);
        const selected = fight.fighters.find((entry) => entry.id === (selectedFighterId ?? fight.scene.selected)) ?? null;
        let next;
        if (wound) {
          // Book 1 p.30: the wounded player places each group of the wound.
          next = {
            title: `Where does ${wound.defender?.name ?? 'the wound'} take it?`,
            copy: `${wound.attackerName} hit with the ${wound.weaponName} for ${wound.damageDice.join(' + ')}${wound.modifier ? ` ${wound.modifier > 0 ? '+' : ''}${wound.modifier}` : ''}. Each group falls whole on one of STR, DEX or END; nothing may go on a characteristic already at zero.`,
            cite: 'Book 1 p.30',
            wound: { key: wound.key, defenderId: wound.defender?.id ?? null, damageDice: [...wound.damageDice], modifier: wound.modifier, weaponName: wound.weaponName },
            actions: []
          };
        } else if (selected && !selected.down && selected.awaiting) {
          next = {
            title: `Declare for ${selected.name}`,
            copy: 'Book 1 p.28: a movement status, then an attack and its target. Pick the movement, then click a Hit number to attack that combatant \u2014 that is the order. Evade needs no target and is given at once.',
            cite: 'Book 1 p.28',
            declare: (() => {
              // Default to the nearest enemy so a single-opponent fight needs
              // no target click; the Hit numbers remain the override.
              const foes = fight.fighters.filter((entry) => entry.side !== selected.side && !entry.down);
              const nearest = [...foes].sort((left, right) => Math.abs((left.band ?? 0) - (selected.band ?? 0)) - Math.abs((right.band ?? 0) - (selected.band ?? 0)))[0] ?? null;
              return { actorId: selected.id, moves: ['Close', 'Stand', 'Open', 'Evade'], move: 'Stand', running: false, targetId: nearest?.id ?? null };
            })(),
            actions: writable
              ? [
                selected.side !== 'party' ? { command: 'fight:auto', label: 'Let them choose' } : null,
                { command: 'fight:resolve-auto', label: 'Resolve, rest on auto', note: `${fight.awaitingIds.length} still to declare` }
              ].filter(Boolean)
              : []
          };
        } else {
          next = {
            title: fight.awaitingIds.length ? 'Orders outstanding' : `Round ${fight.round}`,
            copy: fight.awaitingIds.length ? 'Some combatants have no orders yet. Select them to declare, or resolve and let them fall back on the nearest enemy.' : 'Everyone has orders. Resolve the round.',
            cite: 'Book 1 p.28',
            actions: writable
              ? (fight.awaitingIds.length
                ? [{ command: 'fight:resolve-auto', label: 'Resolve, rest on auto', note: `${fight.awaitingIds.length} still to declare`, primary: true }, { command: 'fight:resolve', label: 'Resolve as declared' }]
                : [{ command: 'fight:resolve', label: 'Resolve round', note: 'all declared', primary: true }])
              : []
          };
        }
        return {
          ...state,
          fighters: fight.fighters,
          declaredList: fight.declaredList,
          setup: fight.setup,
          casualties: fight.casualties,
          round: fight.round,
          situation: fight.situation,
          lastRound: fight.lastRound,
          scene: { ...fight.scene, selected: selectedFighterId ?? fight.scene.selected },
          next,
          refereeActions: writable ? [{ command: 'fight:end', label: 'End fight' }] : [],
          steps: [], done: [],
          save, notice: lastMessage
        };
      }
      if (state.situation.kind !== 'port') return { ...state, save, notice: lastMessage };
      const procedure = portProcedure(resolved, { subsector, selectedSystemId, writable: save.state !== 'stale' });
      // The arrival encounter leads the column while it stands: it is what is
      // happening, and the port business waits behind it.
      const encounter = pendingArrivalEncounter && pendingArrivalEncounter.systemId === resolved.campaign.location?.systemId
        ? pendingArrivalEncounter : null;
      const next = encounter
        ? {
          title: `${encounter.label} at ${resolved.campaign.location.worldName ?? resolved.campaign.location.systemName}`,
          copy: `${encounter.hull ? `${encounter.hull}. ` : ''}${encounter.reaction}${encounter.hostileByDefault ? ' This kind of ship is hostile by default.' : ''} Book 2 p.38. Fights are still run in the current client; dismissing this leaves the port call as it was.`,
          cite: 'Book 2 p.38',
          actions: [{ command: 'arrival:dismiss', label: 'Let it pass', primary: true }]
        }
        : procedure.next;
      return { ...state, ...procedure, next, arrivalEncounter: encounter, scene: { ...state.scene, selectedId: selectedSystemId }, save, notice: lastMessage };
    }
  };
}

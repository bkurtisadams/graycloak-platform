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
  PERSONAL_ARMOR_TYPES, PERSONAL_WEAPONS, PERSONAL_WEAPON_WEIGHTS_GRAMS, addCharacterInventoryItem, characterLoad, removeCharacterInventoryItem,
  setCharacterMilitaryLoad, updateCharacterInventoryItem,
  FREIGHT_RATE_PER_TON_CR, PASSAGE_FARES_CR, availablePassengerCapacity, beginPortCall, bookPassenger,
  calculateBerthingCost, calculateLifeSupportCostForTrip, calculateSpeculativePurchaseCost, canShipMakeJump,
  chargeLifeSupportForTrip, chargeShipUpkeep, consumeJumpFuel, creditShipAccount, deliverFreightAtDestination,
  disembarkPassengersAtDestination, generateFreightOffers, generatePassengerDemand, generateSpeculativeTradeOffer,
  getPersonalWeapon, getSubsectorSystem, jumpDistanceBetweenSystems, loadCargo, parseUniversalWorldProfile,
  payCurrentBerthing, purchaseShipFuel, purchaseSpeculativeCargo, quoteSpeculativeResale, sellSpeculativeCargo,
  skimGasGiantToCapacity,
  ENCOUNTER_RANGE_TABLE, MORALE_DMS, PERSONAL_ARMOR_TYPES as ARMOR_TYPES, RANGE_MATRIX, REACTION_TABLE,
  REACTION_DMS, SHIP_ENCOUNTER_STARPORT_DMS, SHIP_ENCOUNTER_TABLE, TERRAIN_DMS,
  createDice, importCharacterDocument, rollReaction, rollShipEncounter, starportFuelService, unloadCargo,
  updateCharacterGameplayState, assertValidShipDocument,
  createShipCombatEncounter, currentPhase, actingSide, advanceShipCombatPhase, allocateLaserFire, resolveLaserFire,
  PRESSURE_SECTIONS, damageControlOptions, declareDamageControl, cancelDamageControl, DAMAGE_CONTROL_THROW,
  STANDARD_SHIP_DESIGN_KEYS, getStandardShipDesign
} from '../vendor/classic-traveller-rules/index.js';
import {
  opposingShipDesignKey, opposingShipDisposition, buildEncounteredShip, shipCombatLoadout,
  autoAdvanceShipFight, shipFightRoster, laserAllocationAgainstSingleFoe,
  creditEscapeShots, fleeShipFight, STANDARD_SHOTS_BEFORE_ESCAPE, damageLocationLabel
} from './ship-arrival-combat.js';
// coastVectorShips (bulk-coast every unmoved ship on a side) is not imported
// yet: with one ship per side, commitShipVector(shipId, {x:0,y:0}) below does
// the same thing. It becomes the right tool once a side can carry more than
// one ship and the rest need to coast at once.
import {
  enableVectorMovement, commitShipVector, adjudicateVectorSurface, previewShipVector, vectorRangeDM
} from '../vendor/classic-traveller-rules/src/starships/vector-movement.js';
// Pure planning for a fight staged on a Space (vector) scene — no DOM, no ship
// documents. See its own header: built to be shared by any client.
import { spaceSceneCombatPlan, spaceSceneLink, OWN_SHIP_PARTICIPANT_ID, SPACE_COMBAT_SIDES } from './space-scene-combat.js';
import {
  shipDamagedLocations, assemblyCostCr, rollRepairCost, fullyRepairLocation, SHIPYARD_STARPORTS, REPAIR_PARTS_CREW_DM
} from './ship-repair.js';
// The market seeds are shared with client/app.js so both pages draw the same
// freight lots and the same passengers for a route on a given day.
import { campaignDateKey, routeMarketSeed, saleQuoteSeed, seededDice, weeklyTradeSeed } from '../client/commerce-market.js';
import {
  addActivityLogToCampaign, campaignIsPublished, markCampaignPublished, recordSpeculativeLotPurchase, refreshCampaignDocumentRefs,
  setCampaignOwner, speculativeLotPurchasedQuantity, updateCampaignLocation, advanceCampaignDays,
  addSceneToCampaign, removeSceneFromCampaign, setActiveCampaignScene, setActiveCampaignCharacter
} from './campaign-document.js';
import {
  createSceneDocument, updateSceneDocument, sceneIsVectorBoard, sceneThumbnailSvg, DEFAULT_SCENE_FOLDER,
  sceneActorIsDesignReference, SCENE_DESIGN_REFERENCE_PREFIX, removeSceneToken, placeSceneShip
} from './scene-document.js';
import { completeContractDocument, failContractDocument, isContractOverdue, reconcileContractDeadlines } from './contract-document.js';
import {
  allocateRoundWound, createEncounterDocument, declareEncounterAction, endEncounterByReferee,
  opponentSpecFromNpcActor, pendingWoundAllocation, resolveDeclaredRound, undeclareEncounterAction,
  undeclaredCombatantIds
} from './encounter-document.js';
import { addEncounterToCampaign } from './campaign-document.js';
import { chooseNpcDeclaration, pendingNpcDeclarations } from './npc-tactics.js';
import { lawCheck, starportLine, atmosphereGear, worldDetail } from './world-notes.js';
import { updateNpcActorDocument } from './npc-actor-document.js';
import { setCombatantCurrent } from './encounter-document.js';

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
    ...loadView(document, gravityFactor),
    // v0.219.0: what the referee may change, alongside what is shown.
    editable: {
      weaponKey: document.loadout?.weaponKey ?? 'hands',
      armorKey: document.loadout?.armor ?? 'none',
      current: { ...(document.current ?? {}) },
      full: Object.fromEntries(['STR', 'DEX', 'END'].map((key) => [key, document.characteristics?.[key] ?? 0]))
    }
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

// v0.221.0: the referee's directory. A campaign can hold thousands of actors,
// so nothing here is a flat list: entries carry a folder path, the tree is
// built from those paths, and a query filters before anything is drawn. Only
// the open folder's entries are returned, so the size of the campaign does not
// decide the size of the render.
export const REFEREE_TABS = Object.freeze(['Journal', 'Actors', 'Players', 'Vehicles', 'Tables', 'Scenes']);
const UNFILED = 'Unfiled';

// Every folder that appears in the entries, with how many each holds
// (including everything filed deeper). Sorted, so the tree is stable.
export function folderTree(entries) {
  const counts = new Map();
  for (const entry of entries) {
    const path = entry.folder || UNFILED;
    const parts = path.split('/');
    for (let depth = 1; depth <= parts.length; depth += 1) {
      const key = parts.slice(0, depth).join('/');
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([path, count]) => ({ path, name: path.split('/').at(-1), depth: path.split('/').length - 1, count }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

function matches(entry, query) {
  if (!query) return true;
  const needle = query.toLowerCase();
  return [entry.name, entry.note, entry.folder].filter(Boolean).some((field) => String(field).toLowerCase().includes(needle));
}

// A folder shows what is filed directly in it; a search ignores folders and
// looks everywhere, because that is what searching is for.
function inFolder(entries, folder, query) {
  if (query) return entries.filter((entry) => matches(entry, query));
  const wanted = folder || UNFILED;
  return entries.filter((entry) => (entry.folder || UNFILED) === wanted);
}

function journalEntries(resolved) {
  const log = (resolved.activityLogs ?? [])[0];
  // Newest first, and filed by the campaign date they happened on.
  return [...(log?.entries ?? [])].reverse().map((entry, index) => ({
    id: `${entry.dateLabel ?? 'undated'}-${index}`,
    name: entry.message,
    note: entry.category,
    folder: entry.dateLabel ? `${entry.dateLabel}` : UNFILED
  }));
}

function actorEntries(resolved) {
  return (resolved.npcActors ?? []).filter((actor) => !actor.archived).map((actor) => ({
    id: actor.identity.id,
    name: actor.identity.name,
    note: [actor.profile?.role, actor.loadout?.weaponKey, actor.profile?.faction].filter(Boolean).join(', '),
    folder: actor.profile?.folder ?? '',
    editable: true
  }));
}

// v0.222.0: the Players tab is the only one whose subject lives in the cloud
// rather than in the campaign documents, so the page hands in what it has
// fetched (seats, invites, join requests) and this arranges it.
function seatEntries(resolved, players) {
  const characters = resolved.characters ?? [];
  const nameOf = (id) => characters.find((entry) => entry.identity.id === id)?.identity.name || null;
  const entries = [];
  for (const join of players.joins ?? []) {
    entries.push({
      id: `join:${join.uid}`,
      name: nameOf(join.characterId) || join.name || join.uid,
      note: `asking to sit down${join.code ? ` with invite ${join.code}` : ''}`,
      folder: 'Asking to join',
      seat: { kind: 'join', uid: join.uid, characterId: join.characterId ?? null }
    });
  }
  for (const seated of players.seats ?? []) {
    entries.push({
      id: `seat:${seated.uid}`,
      name: seated.name || seated.uid,
      note: seated.seatedAt ? `seated ${new Date(seated.seatedAt).toLocaleDateString()}` : 'seated',
      folder: 'Seated',
      seat: { kind: 'seat', uid: seated.uid }
    });
  }
  for (const invite of players.invites ?? []) {
    entries.push({
      id: `invite:${invite.code}`,
      name: invite.code,
      note: 'an open invite; anyone with this code may ask to sit down',
      folder: 'Open invites',
      seat: { kind: 'invite', code: invite.code }
    });
  }
  return entries;
}

// v0.225.0: the printed tables, filed by the book and page they come from, so
// a referee can read a throw off the page rather than remembering it. Values
// come from the rules package, so a table here cannot drift from the one the
// engine uses.
const RANGE_NAMES_ORDER = ['close', 'short', 'medium', 'long', 'very long'];

function signed(value) {
  if (value === null || value === undefined) return 'no';
  return value > 0 ? `+${value}` : String(value);
}

function tableEntries() {
  const entries = [];
  const push = (folder, name, note) => entries.push({ id: `${folder}/${name}`, name, note, folder });

  for (const [key, dms] of Object.entries(RANGE_MATRIX)) {
    const weapon = getPersonalWeapon(key);
    push('Book 1 p.43 / Range matrix', weapon.name,
      `${RANGE_NAMES_ORDER.map((range, index) => `${range} ${signed(dms[index])}`).join(', ')} \u00b7 wounds ${weapon.damageDice}D${weapon.damageModifier ? signed(weapon.damageModifier) : ''}`);
  }
  for (const key of Object.keys(RANGE_MATRIX)) {
    const weapon = getPersonalWeapon(key);
    if (weapon.lowMax === null || weapon.lowMax === undefined) continue;
    push('Book 1 p.44 / Weapons table', weapon.name,
      `${weapon.characteristic} ${weapon.lowMax + 1}+ to avoid ${signed(weapon.lowDM)}, ${weapon.highMin}+ gives ${signed(weapon.highDM)}${weapon.fatigueDM ? `, weakened ${signed(weapon.fatigueDM)}` : ''}`);
  }
  for (const [key, dms] of Object.entries(RANGE_MATRIX)) {
    const weapon = getPersonalWeapon(key);
    push('Book 1 p.42 / Weapons vs armor', weapon.name,
      ARMOR_TYPES.map((armor, index) => `${armor} ${signed(weapon.armorDMs?.[index])}`).join(', '));
    void dms;
  }
  for (const [total, reaction] of Object.entries(REACTION_TABLE)) push('Book 3 p.27 / Reactions', `2D ${total}`, reaction);
  for (const [name, dm] of Object.entries(REACTION_DMS)) push('Book 3 p.27 / Reactions', name, `DM ${signed(dm)}`);
  for (const [total, range] of Object.entries(ENCOUNTER_RANGE_TABLE)) push('Book 1 p.27 / Encounter range', `2D ${total}`, String(range).replace('-', ' '));
  for (const [terrain, dm] of Object.entries(TERRAIN_DMS)) push('Book 1 p.27 / Terrain DMs', sentenceCase(terrain), `DM ${signed(dm)}`);
  for (const [name, dm] of Object.entries(MORALE_DMS)) push('Book 1 p.33 / Morale', sentenceCase(name.replace(/([A-Z])/g, ' $1')), `DM ${signed(dm)}`);
  for (const [total, ship] of Object.entries(SHIP_ENCOUNTER_TABLE)) push('Book 2 p.38 / Shipping', `2D+DM ${total}`, sentenceCase(String(ship)));
  for (const [starport, dm] of Object.entries(SHIP_ENCOUNTER_STARPORT_DMS)) push('Book 2 p.38 / Shipping', `Starport ${starport}`, `DM ${signed(dm)}`);
  return entries;
}

function characterEntries(resolved) {
  const party = new Set(resolved.campaign.party?.characterIds ?? []);
  return (resolved.characters ?? []).map((character) => ({
    id: character.identity.id,
    name: character.identity.name || '(unnamed)',
    note: characterView(character).service,
    folder: party.has(character.identity.id) ? 'Party' : 'Other characters'
  }));
}

// v0.225.0: a ship is worth more than its name in a directory — where it is,
// what it can jump, and whether it can lift at all.
function vehicleEntries(resolved) {
  return (resolved.ships ?? []).map((ship) => {
    const view = shipView(ship);
    const damage = ship.state?.damage ?? {};
    const hurt = Object.entries(damage).filter(([, value]) => (Array.isArray(value) ? value.length : Number(value) > 0)).map(([key]) => key);
    const berthed = ship.state?.portCall?.systemId ?? null;
    return {
      id: ship.identity.id,
      name: view.name || ship.identity.registry || 'Unnamed ship',
      note: [
        view.kind,
        view.jump ? `Jump-${view.jump}` : null,
        `fuel ${view.fuel.now}/${view.fuel.full} t`,
        `hold ${view.hold.full - view.hold.now} t free`,
        berthed ? `berthed at ${berthed}` : ship.state?.operationalStatus === 'in-jump' ? 'in jump' : null,
        hurt.length ? `damaged: ${hurt.join(', ')}` : null
      ].filter(Boolean).join(' \u00b7 '),
      folder: ship.identity.id === resolved.campaign.activeShipId ? 'In service'
        : ship.authority?.assignmentType === 'reserve' ? 'On loan'
          : 'Other vehicles'
    };
  });
}

// v0.229.0: the Scenes tab, Foundry's directory shape — a folder, a name, and
// a small colour-and-shape preview rather than a photo. sceneThumbnailSvg
// already draws nothing but the grid and each staged token as a coloured dot
// (the same party/opposition colours the range-line board and the tactical
// canvas use), so it needs no image behind it to read at a glance.
function sceneEntries(resolved) {
  const activeId = resolved.campaign.activeSceneId;
  return (resolved.scenes ?? []).map((scene) => ({
    id: scene.identity.id,
    name: scene.identity.name,
    note: sceneIsVectorBoard(scene)
      ? `space, ${scene.board.spanThousandMiles}" across${scene.tokens.length ? ` \u00b7 ${scene.tokens.length} staged` : ''}`
      : `${scene.board.squares} sq \u00b7 ${scene.board.metersPerSquare} m${scene.tokens.length ? ` \u00b7 ${scene.tokens.length} staged` : ''}`,
    folder: scene.folder,
    thumbnail: sceneThumbnailSvg(scene, { size: 56 }),
    active: scene.identity.id === activeId,
    scene: true,
    isVectorBoard: sceneIsVectorBoard(scene)
  }));
}

// The staging picker and staged-token list for one vector-board scene —
// separate from sceneEntries (which stays a lightweight list row for all
// scenes) since only one scene is ever being staged onto at a time.
function buildStagingView(resolved, sceneId) {
  const scene = (resolved.scenes ?? []).find((entry) => entry.identity.id === sceneId);
  if (!scene || !sceneIsVectorBoard(scene)) return null;
  const ownShip = resolved.ships.find((entry) => entry.identity.id === resolved.campaign.activeShipId) ?? resolved.ships[0] ?? null;
  // v0.164.2 in the old referee client had this same rule: only the
  // campaign's own ship leaves the list once staged (it is one hull and can
  // only be in one place); a standard design is plans, not a hull, so it
  // stays offered for a second staged ship of the same type.
  const taken = new Set(scene.tokens.map((token) => token.actorId).filter((actorId) => !sceneActorIsDesignReference(actorId)));
  const choices = [];
  if (ownShip && !taken.has(ownShip.identity.id)) {
    choices.push({ actorId: ownShip.identity.id, label: ownShip.identity.name || 'Ship', note: `${ownShip.design.typeCode} \u00b7 your ship` });
  }
  for (const key of STANDARD_SHIP_DESIGN_KEYS) {
    const design = getStandardShipDesign(key);
    choices.push({ actorId: `${SCENE_DESIGN_REFERENCE_PREFIX}${key}`, label: design.name, note: `Type ${design.typeCode}` });
  }
  const tokens = scene.tokens.map((token) => ({
    id: token.id,
    label: token.label || (sceneActorIsDesignReference(token.actorId)
      ? getStandardShipDesign(token.actorId.slice(SCENE_DESIGN_REFERENCE_PREFIX.length)).name
      : token.actorId),
    side: token.side, position: token.position, velocity: token.velocity
  }));
  const plan = spaceSceneCombatPlan(scene, { ownShipId: ownShip?.identity?.id ?? null });
  return {
    sceneId, sceneName: scene.identity.name, spanThousandMiles: scene.board.spanThousandMiles,
    choices, tokens,
    canStart: plan.problems.length === 0,
    blockedReason: plan.problems.length ? plan.problems.join('; ') : null
  };
}

export function refereeView(resolved, { tab = 'Journal', folder = '', query = '', players = null, stagingSceneId = null } = {}) {
  const sets = {
    Journal: journalEntries,
    Actors: actorEntries,
    Players: (input) => (players ? seatEntries(input, players) : characterEntries(input)),
    Vehicles: vehicleEntries,
    Tables: () => tableEntries(),
    Scenes: sceneEntries
  };
  const entries = (sets[tab] ?? sets.Journal)(resolved);
  const tree = folderTree(entries);
  const holds = (path) => entries.some((entry) => (entry.folder || UNFILED) === path);
  const open = folder || tree.find((node) => holds(node.path))?.path || tree[0]?.path || UNFILED;
  const shown = inFolder(entries, open, query);
  const LIMIT = 200;
  return {
    tabs: [...REFEREE_TABS],
    tab,
    query,
    folder: open,
    tree,
    total: entries.length,
    shown: shown.slice(0, LIMIT),
    truncated: Math.max(0, shown.length - LIMIT),
    // Tables has nothing behind it but the printed pages; Players' seats live
    // in the cloud and need a signed-in referee to fetch them.
    unbuilt: tab === 'Players' && !players ? 'Sign in to manage seats and invites.' : null,
    // The Players tab acts on the cloud, not on campaign documents.
    seats: tab === 'Players' && players ? { loading: Boolean(players.loading), error: players.error ?? null } : null,
    // Staging a vector-board scene: who's on it and what can be added,
    // built fresh only for the one scene currently being staged.
    staging: tab === 'Scenes' && stagingSceneId ? buildStagingView(resolved, stagingSceneId) : null
  };
}

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
    weaponCatalog: weaponCatalog(),
    armorCatalog: [...PERSONAL_ARMOR_TYPES]
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

// v0.230.0: a shot log entry from resolveLaserFire, in one sentence — enough
// to narrate a laser exchange without repeating the whole shot object.
function narrateShots(shots, encounter) {
  const nameOf = (id) => encounter.participants.find((entry) => entry.id === id)?.name ?? id;
  return shots.map((shot) => {
    if (!shot.fired) return `${nameOf(shot.shipId)} holds fire on ${nameOf(shot.targetId)} \u2014 ${shot.reason}.`;
    return shot.hit
      ? `${nameOf(shot.shipId)} hits ${nameOf(shot.targetId)} (${shot.location}).`
      : `${nameOf(shot.shipId)} fires on ${nameOf(shot.targetId)} and misses.`;
  });
}

// v0.234.0: a declared repair (Book 2 p.35) resolves silently, inside
// advanceShipCombatPhase, at the end of the game turn it was declared in —
// autoAdvanceShipFight surfaces whatever the engine logged during a call as
// newLogEntries; this picks the 'damage-control' entries out of that and
// narrates them the same way narrateShots narrates a shot.
function narrateDamageControl(logEntries, encounter) {
  const nameOf = (id) => encounter.participants.find((entry) => entry.id === id)?.name ?? id;
  return logEntries.filter((entry) => entry.kind === 'damage-control').map((entry) => {
    const where = damageLocationLabel(entry);
    const who = entry.crewName || nameOf(entry.shipId);
    if (!entry.attempted) return `${who}'s repair on ${where} aboard ${nameOf(entry.shipId)} is no longer possible (${entry.reason}).`;
    return entry.repaired
      ? `${who} repairs ${where} aboard ${nameOf(entry.shipId)} (${entry.total} vs ${entry.target}).`
      : `${who}'s repair attempt on ${where} aboard ${nameOf(entry.shipId)} fails (${entry.total} vs ${entry.target}).`;
  });
}

function portFacts(resolved, subsector, selectedSystemId, brokerTip = null) {
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
  // the same lot, the same amount already bought, and the same quotes.
  // v0.232.0: a broker DM is no longer always 0 — a successful merchant
  // hail on arrival (Book 2 p.36) earns a one-time tip on the next resale
  // quote made at that same system.
  let speculation = null;
  if (ship && system && profile) {
    const trader = (resolved.characters ?? []).find((entry) => entry.identity.id === campaign.activeCharacterId)
      ?? (resolved.characters ?? []).find((entry) => (campaign.party?.characterIds ?? []).includes(entry.identity.id)) ?? null;
    const skillDM = Math.max(Number(trader?.skills?.Admin ?? 0), Number(trader?.skills?.Bribery ?? 0));
    const brokerDM = brokerTip && brokerTip.systemId === system.id ? Number(brokerTip.dm ?? 0) : 0;
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
      const quote = quoteSpeculativeResale(Number(match[1]), cargo.tons, profile, { dice: seededDice(saleQuoteSeed(campaign, system.id, cargo.id)), characterSkillDM: skillDM, brokerDM });
      return quote ? { cargo, quote } : null;
    }).filter(Boolean);
    speculation = { buy, sales, skillDM, brokerDM };
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
  // v0.228.0: what Book 3 says beyond the one-line descriptions, and the one
  // reading that is about this party rather than this world — what they are
  // carrying against what the world forbids.
  const carriers = (resolved.characters ?? [])
    .filter((entry) => (campaign.party?.characterIds ?? []).includes(entry.identity.id))
    .map((entry) => {
      const weaponKey = entry.loadout?.weaponKey ?? 'hands';
      let weaponName = weaponKey;
      try { weaponName = getPersonalWeapon(weaponKey).name; } catch { /* an unknown key reads as itself */ }
      return { id: entry.identity.id, name: entry.identity.name || '(unnamed)', weaponKey, weaponName };
    });
  const world = profile
    ? { detail: worldDetail(profile), starport: starportLine(profile.starport), gear: atmosphereGear(profile.atmosphere), law: lawCheck(profile, carriers) }
    : null;
  // Book 2 p.18 Repair Parts: what's damaged, what the assembly for each
  // location is actually worth on this ship, and whether the starport here
  // has a shipyard for it (Book 3 p.5: only Class A and — "reasonable
  // repair facilities" — Class C, your own ruling; see ship-repair.js).
  const repair = ship ? {
    locations: shipDamagedLocations(ship).map((loc) => ({ ...loc, assemblyCr: assemblyCostCr(ship, loc) })),
    shipyardHere: Boolean(profile && SHIPYARD_STARPORTS.includes(profile.starport))
  } : null;

  return {
    ship, system, profile, portCall, fuelService, destination, route, exclusive, speculation, world, repair,
    fuel: { aboard, capacity, missing: Math.max(0, capacity - aboard) },
    berthingOwed: Boolean(portCall && !portCall.berthingPaid && portCall.berthingDueCr > 0),
    fight: encounters.find((entry) => entry.status === 'active' && entry.location?.systemId === system?.id) ?? null
  };
}

// The port call as one lead card and a list of rows, in the order Book 2 has
// a ship do them. Only what this version can act on carries a command.
export function portProcedure(resolved, { subsector, selectedSystemId = null, writable = true, brokerTip = null } = {}) {
  const facts = portFacts(resolved, subsector, selectedSystemId, brokerTip);
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
      copy: system.gasGiant ? 'This starport sells no fuel; skim the gas giant instead.' : 'This starport sells no fuel and the system has no gas giant.', cite: 'Book 2 p.6' });
  }

  // Book 2 p.34 Wilderness Refuelling: free unrefined fuel from a gas
  // giant's atmosphere — offered alongside starport fuel, not only when
  // starport fuel is unavailable, since a captain might prefer it free even
  // where refined fuel is for sale. p.15: only a streamlined hull can enter
  // an atmosphere at all, so an unstreamlined ship is shown why it can't.
  // p.4: unrefined fuel raises the drive-failure throw (Contaminated Fuel)
  // until flushed, about a week at any starport — that risk isn't hidden.
  if (fuel.missing >= 1 && system.gasGiant) {
    if (ship.specifications?.hull?.streamlined) {
      steps.push({ id: 'fuel-skim', title: 'Skim the gas giant', figure: `${fuel.missing} t unrefined, free \u2014 about a week`, state: 'ready', command: 'fuel:skim', verb: 'Skim',
        copy: 'Unrefined fuel from the gas giant\u2019s atmosphere, no charge. Raises the drive-failure throw (Book 2 p.4, Contaminated Fuel) while any of it is aboard, until the drives are flushed \u2014 about a week at any starport. The skim itself takes about a week.',
        cite: 'Book 2 p.34' });
    } else {
      steps.push({ id: 'fuel-skim', title: 'Skim the gas giant', state: 'blocked',
        copy: 'Skimming means entering the gas giant\u2019s atmosphere, which only a streamlined hull (Book 2 p.15) can do. This ship isn\u2019t streamlined.',
        cite: 'Book 2 p.34' });
    }
  }

  // Book 2 p.18 Repair Parts. Crew self-repair (from the ship's own Stores)
  // is offered anywhere; shipyard repair only where facts.repair.shipyardHere
  // says the starport has one (Book 3 p.5: Class A, or Class C's "reasonable
  // repair facilities" — your own ruling, ship-repair.js).
  for (const loc of facts.repair?.locations ?? []) {
    const label = damageLocationLabel(loc);
    const idSuffix = loc.turretId ? `-${loc.turretId}` : '';
    steps.push({ id: `repair-crew-${loc.location}${idSuffix}`, title: `Repair ${label} (crew)`, state: 'ready',
      command: `repair:crew:${loc.location}${loc.turretId ? `:${loc.turretId}` : ''}`, verb: 'Repair',
      figure: `${cr(loc.assemblyCr)} assembly, 0\u2013100% of it`,
      copy: `Uses the ship's own stock of emergency materials: 2D${signed(REPAIR_PARTS_CREW_DM)}, read as a percentage of the ${label.toLowerCase()}'s own value (${cr(loc.assemblyCr)}); 0% or less costs nothing.`,
      cite: 'Book 2 p.18' });
    if (facts.repair.shipyardHere) {
      steps.push({ id: `repair-shipyard-${loc.location}${idSuffix}`, title: `Repair ${label} (shipyard)`, state: 'ready',
        command: `repair:shipyard:${loc.location}${loc.turretId ? `:${loc.turretId}` : ''}`, verb: 'Repair',
        figure: `${cr(loc.assemblyCr)} assembly, 20\u2013120% of it`,
        copy: `Professional replacement at ${system.name}'s shipyard: 2D, read as a percentage of the ${label.toLowerCase()}'s own value (${cr(loc.assemblyCr)}).`,
        cite: 'Book 2 p.18' });
    }
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
  return { next, steps: steps.filter((step) => step !== first || !next.actions.length).map((step) => (facts.fight || !writable ? { ...step, command: null, verb: null } : step)), done, world: facts.world };
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
  // v0.230.0: an arrival encounter the referee chose to fight rather than
  // dismiss. Lasers only, abbreviated (p.37) — see ship-arrival-combat.js.
  // Not persisted, same as pendingArrivalEncounter: a reload forgets an
  // in-progress fight, which is a known limit of this first cut.
  let pendingShipFight = null;
  // v0.232.0: a successful merchant hail on arrival (Book 2 p.36) earns a
  // one-time broker's tip on the next speculative resale quote made at that
  // same system. Not persisted, same as the arrival encounter and ship
  // fight above: a reload forgets it, the same as the referee letting the
  // moment pass.
  let pendingBrokerTip = null;
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

  // classic-traveller-rules exports no generic debit — creditShipAccount is
  // credit-only (a non-negative amountCr, enforced), and every named charge
  // it does export (payCurrentBerthing, chargeShipUpkeep, ...) is tied to
  // its own specific field on the ship document, none of which fit an
  // arbitrary one-off fee like a patrol's toll. Its own debits (in
  // starships/operations.js) all go through a private, unexported
  // appendLedger(); this mirrors that function exactly, using only what the
  // package exports publicly (assertValidShipDocument), so the ledger entry
  // this produces validates the same way a vendor-produced one would.
  function debitShipAccount(ship, amountCr, { kind, description, dateLabel = null }) {
    if (!Number.isInteger(amountCr) || amountCr < 1) throw new TypeError('debit amount must be a positive integer number of credits');
    const next = JSON.parse(JSON.stringify(ship));
    const ledger = next.state.finances.ledger;
    const balanceCr = next.state.finances.balanceCr - amountCr;
    if (balanceCr < 0) throw new RangeError('ship operating account has insufficient funds');
    const compactDate = String(dateLabel ?? 'UNDATED').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'UNDATED';
    ledger.push({
      id: `${next.identity.id}:${compactDate}:${kind}:${ledger.length + 1}`,
      date: dateLabel === null || dateLabel === undefined || dateLabel === '' ? null : dateLabel,
      kind,
      amountCr: -amountCr,
      description,
      balanceCr
    });
    next.state.finances.balanceCr = balanceCr;
    assertValidShipDocument(next);
    return next;
  }

  // Book 2 p.16's crew positions and the expertise each wants
  // (CREW_ROLE_SKILLS), read against the ship's real crew and their real
  // character skill levels — was hardcoded (pilot:1, computer:0) regardless
  // of who was actually assigned. "The computer operator defaults to the
  // pilot" is your own ruling, so the pilot holds both stations and the
  // computer skill DM reads the pilot's own Computer skill. One gunner per
  // turret, in crew-assignment order; a turret beyond the number of
  // gunner-role crew is left unassigned (fires, but with no skill DM and no
  // one whose turn it costs).
  function shipCombatCrew(ship) {
    const assignments = ship.crew?.assignments ?? [];
    const skillLevel = (characterId, skillName) => {
      if (!characterId) return 0;
      const character = resolved.characters.find((entry) => entry.identity.id === characterId);
      return Number(character?.skills?.[skillName] ?? 0);
    };
    const pilotId = assignments.find((entry) => entry.role === 'pilot')?.characterId ?? null;
    const engineerId = assignments.find((entry) => entry.role === 'engineer')?.characterId ?? null;
    const gunnerIds = assignments.filter((entry) => entry.role === 'gunner').map((entry) => entry.characterId);
    const gunners = {};
    const gunnery = {};
    (ship.specifications?.armament?.turrets ?? []).forEach((turret, index) => {
      const gunnerId = gunnerIds[index];
      if (!gunnerId) return;
      gunners[turret.id] = gunnerId;
      gunnery[turret.id] = skillLevel(gunnerId, 'Gunnery');
    });
    return {
      stations: { pilot: pilotId, computerOperator: pilotId, engineer: engineerId, gunners },
      skills: {
        pilot: skillLevel(pilotId, 'Pilot'),
        computer: skillLevel(pilotId, 'Computer'),
        engineering: skillLevel(engineerId, 'Engineering'),
        gunnery
      }
    };
  }

  // Shared by 'arrival:fight' and a patrol inspection that turns hostile
  // (Book 2 p.36's "may be a form of pirate, exacting tolls or penalties"):
  // build and auto-advance the abbreviated ship fight against whichever
  // ship is standing as pendingArrivalEncounter, given who is doing the
  // intruding.
  function beginArrivalShipFight({ opponentIsIntruder, intruderNote, playerShip }) {
    const dice = createDice();
    const designKey = opposingShipDesignKey(pendingArrivalEncounter);
    const disposition = opposingShipDisposition(pendingArrivalEncounter);
    const { ship: opponentShip } = buildEncounteredShip({ designKey, name: pendingArrivalEncounter.label, key: pendingArrivalEncounter.key });
    const opponentLoadout = shipCombatLoadout(opponentShip);
    const playerLoadout = shipCombatLoadout(playerShip);
    const combat = createShipCombatEncounter({
      id: `ship-fight-${Date.now()}`,
      campaignId: resolved.campaign.identity.id,
      intruderSide: 'intruder',
      intruderAssignmentNote: intruderNote,
      participants: [
        {
          shipId: 'opponent', name: opponentShip.identity.name, side: opponentIsIntruder ? 'intruder' : 'native',
          disposition, ship: opponentShip,
          carriedPrograms: opponentLoadout.carried, loadedPrograms: opponentLoadout.loaded,
          stations: { pilot: 'npc-captain' }, skills: { pilot: 1, computer: 0 },
          pressurisedSections: []
        },
        {
          shipId: 'player', name: playerShip.identity.name || 'The ship', side: opponentIsIntruder ? 'native' : 'intruder',
          disposition: 'merchant', ship: playerShip,
          carriedPrograms: playerLoadout.carried, loadedPrograms: playerLoadout.loaded,
          ...shipCombatCrew(playerShip),
          // Book 2 p.34: ships depressurise before combat "whenever
          // possible" — which assumes warning. An arrival encounter, or a
          // patrol stop that turns hostile, is exactly the case with none,
          // so this starts pressurised rather than the referee client's own
          // planned-engagement default of depressurised.
          pressurisedSections: [...PRESSURE_SECTIONS]
        }
      ]
    });
    const step = autoAdvanceShipFight(combat, dice, { playerSide: opponentIsIntruder ? 'native' : 'intruder' });
    return {
      encounter: step.encounter, playerSide: opponentIsIntruder ? 'native' : 'intruder',
      opponentLabel: pendingArrivalEncounter.label, systemId: pendingArrivalEncounter.systemId,
      log: narrateShots(step.shots, step.encounter)
    };
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
      // v0.239.0: which character this page shows used to be purely local to
      // the browser tab (ui.characterId) and never survived a reload — the
      // campaign's own activeCharacterId (set once, usually by whoever was
      // added to the party last, per addCharacterToCampaign's own
      // makeActive default) is what actually won on every fresh page load,
      // however many times a different character had been clicked since.
      // This makes a click stick by writing it back to the campaign too.
      if (command === 'character:activate') {
        if (!characterId) throw new Error('choose a character to make active');
        const character = (resolved.characters ?? []).find((entry) => entry.identity.id === characterId);
        if (!character) throw new Error('that character is not in this campaign\u2019s party');
        const campaign = setActiveCampaignCharacter(resolved.campaign, characterId);
        registry.put(campaign);
        reload();
        const message = `${character.identity.name || '(unnamed)'} is now the active character.`;
        log('REFEREE', message);
        lastMessage = { ok: true, message };
        onChange();
        saveToCloud();
        return lastMessage;
      }
      // v0.219.0: the referee's fiat. Nothing on this page could change a
      // character, so an unnamed party member could not even be named.
      if (command.startsWith('edit:')) {
        const [, subject, field] = command.split(':');
        const value = fight?.value;
        let message;
        if (subject === 'character') {
          const character = (resolved.characters ?? []).find((entry) => entry.identity.id === fight?.id);
          if (!character) throw new Error('choose a character to change');
          const was = character.identity.name || '(unnamed)';
          let next;
          if (field === 'name') {
            const name = String(value ?? '').trim();
            if (!name) throw new Error('a character needs a name');
            next = importCharacterDocument({ ...character, identity: { ...character.identity, name } });
            message = `${was} is now ${name}`;
          } else if (field === 'current') {
            const scores = { ...character.current };
            for (const key of ['STR', 'DEX', 'END']) {
              if (value?.[key] === undefined || value[key] === '') continue;
              const number = Number(value[key]);
              if (!Number.isInteger(number) || number < 0) throw new RangeError(`${key} must be a whole number of 0 or more`);
              // The original is the ceiling; healing restores towards it.
              scores[key] = Math.min(number, character.characteristics[key]);
            }
            const zeros = ['STR', 'DEX', 'END'].filter((key) => scores[key] <= 0).length;
            next = updateCharacterGameplayState(character, {
              current: scores,
              alive: zeros < 3,
              consciousness: zeros >= 3 ? 'not-applicable' : zeros === 0 ? 'conscious' : 'unconscious'
            });
            message = `${was}: ${['STR', 'DEX', 'END'].map((key) => `${key} ${next.current[key]}/${next.characteristics[key]}`).join(', ')}`;
          } else if (field === 'loadout') {
            next = updateCharacterGameplayState(character, {
              weaponKey: value?.weaponKey ?? character.loadout.weaponKey,
              armor: value?.armor ?? character.loadout.armor
            });
            message = `${was} now carries ${getPersonalWeapon(next.loadout.weaponKey).name}, ${next.loadout.armor === 'none' ? 'no armor' : next.loadout.armor}`;
          } else throw new Error(`unknown edit: ${command}`);
          persist([next]);
        } else if (subject === 'actor') {
          const actor = (resolved.npcActors ?? []).find((entry) => entry.identity.id === fight?.id);
          if (!actor) throw new Error('choose an actor to change');
          const patch = {};
          if (field === 'name') {
            const name = String(value ?? '').trim();
            if (!name) throw new Error('an actor needs a name');
            patch.name = name;
          } else if (field === 'current') {
            patch.current = { ...actor.current };
            for (const key of ['STR', 'DEX', 'END']) {
              if (value?.[key] === undefined || value[key] === '') continue;
              const number = Number(value[key]);
              if (!Number.isInteger(number) || number < 0) throw new RangeError(`${key} must be a whole number of 0 or more`);
              patch.current[key] = Math.min(number, actor.characteristics[key]);
            }
          } else if (field === 'loadout') {
            patch.weaponKey = value?.weaponKey ?? actor.loadout?.weaponKey;
            patch.armor = value?.armor ?? actor.loadout?.armor;
          } else throw new Error(`unknown edit: ${command}`);
          persist([updateNpcActorDocument(actor, patch)]);
          message = `${actor.identity.name}: changed`;
        } else if (subject === 'ship') {
          // v0.238.0: a ship can be stranded with no way to reach fuel or
          // funds through ordinary play (an empty tank at a starport that
          // sells none, no gas giant to skim) — the same override the
          // character branch above already has, for the two numbers most
          // likely to do that: fuel aboard and the ship's own account.
          const ship = (resolved.ships ?? []).find((entry) => entry.identity.id === fight?.id);
          if (!ship) throw new Error('choose a ship to change');
          const shipLabel = ship.identity.name || 'The ship';
          let next;
          if (field === 'fuel') {
            const capacity = Number(ship.specifications?.fuel?.capacityTons ?? 0);
            const requested = Number(value);
            if (!Number.isFinite(requested) || requested < 0) throw new RangeError('fuel must be zero or more tons');
            const tons = Math.min(capacity, Math.round(requested));
            next = JSON.parse(JSON.stringify(ship));
            next.state.currentFuelTons = tons;
            if (tons === 0) next.state.fuelQuality = 'unknown';
            else if (next.state.fuelQuality === 'unknown') next.state.fuelQuality = 'refined';
            assertValidShipDocument(next);
            message = `${shipLabel}: fuel set to ${tons} of ${capacity} t`;
          } else if (field === 'account') {
            const target = Math.round(Number(value));
            if (!Number.isFinite(target) || target < 0) throw new RangeError('the account must be zero or more credits');
            const editDateLabel = formatCampaignDate(resolved.campaign.time);
            const current = Number(ship.state.finances?.balanceCr ?? 0);
            const delta = target - current;
            if (delta > 0) next = creditShipAccount(ship, delta, { kind: 'referee', description: 'Referee adjustment', dateLabel: editDateLabel });
            else if (delta < 0) next = debitShipAccount(ship, -delta, { kind: 'referee', description: 'Referee adjustment', dateLabel: editDateLabel });
            else next = ship;
            message = `${shipLabel}: account set to ${cr(target)}`;
          } else throw new Error(`unknown edit: ${command}`);
          persist([next]);
        } else if (subject === 'combatant') {
          // Mid-fight the combatant is the live record; the actor behind it is
          // untouched, so a change here lasts only for this encounter.
          const encounter = liveEncounter();
          if (!encounter) throw new Error('no fight is running');
          const result = setCombatantCurrent(encounter, { combatantId: fight?.id, scores: value ?? {} });
          persist([result.encounter]);
          message = result.entry?.text ?? `${result.combatant.name}: unchanged`;
        } else throw new Error(`unknown edit: ${command}`);
        log('REFEREE', message);
        lastMessage = { ok: true, message };
        onChange();
        saveToCloud();
        return lastMessage;
      }
      // v0.229.0: the Scenes tab's own fiat — creating, filing, activating and
      // deleting a scene. Board authoring (size, planets) stays in the referee
      // client; this is the browsing-and-organising slice.
      //
      // None of these route through the generic persist() helper: it rebuilds
      // the campaign's document-ref lists from resolved.* (the pre-command
      // snapshot), so a ref field that the very same command just changed —
      // activeSceneId, or a scene's folder in its own cached ref — would be
      // overwritten straight back to its stale value. 'file' reuses
      // addSceneToCampaign instead: its ref dedup keeps the newest write for
      // a given id, so handing it the already-updated scene document is what
      // actually keeps the cached ref in sync with it.
      if (command.startsWith('scene:')) {
        const action = command.slice('scene:'.length);
        const id = fight?.id;
        const value = fight?.value;
        let message;
        if (action === 'create') {
          const name = String(value?.name ?? '').trim();
          if (!name) throw new Error('a scene needs a name');
          const folder = typeof value?.folder === 'string' && value.folder.trim() ? value.folder.trim() : DEFAULT_SCENE_FOLDER;
          const boardKind = value?.boardKind === 'vector' ? 'vector' : 'grid';
          const scene = createSceneDocument({ campaignId: resolved.campaign.identity.id, name, folder, boardKind });
          const campaign = addSceneToCampaign(resolved.campaign, scene, { makeActive: !resolved.campaign.activeSceneId });
          registry.putAll([scene, campaign]);
          reload();
          message = `Scene ${scene.identity.name} created in ${scene.folder}.`;
        } else if (action === 'stage-ship') {
          const scene = (resolved.scenes ?? []).find((entry) => entry.identity.id === id);
          if (!scene) throw new Error('choose a scene to stage on');
          const { token, scene: staged } = placeSceneShip(scene, value ?? {});
          const campaign = addSceneToCampaign(resolved.campaign, staged);
          registry.putAll([staged, campaign]);
          reload();
          message = `${token.label || token.actorId} staged on ${scene.identity.name}.`;
        } else if (action === 'unstage-ship') {
          const scene = (resolved.scenes ?? []).find((entry) => entry.identity.id === id);
          if (!scene) throw new Error('choose a scene to unstage from');
          const next = removeSceneToken(scene, value);
          const campaign = addSceneToCampaign(resolved.campaign, next);
          registry.putAll([next, campaign]);
          reload();
          message = 'Ship removed from staging.';
        } else if (action === 'file') {
          const scene = (resolved.scenes ?? []).find((entry) => entry.identity.id === id);
          if (!scene) throw new Error('choose a scene to file');
          const folder = String(value ?? '').trim();
          if (!folder) throw new Error('a folder name is required');
          const next = updateSceneDocument(scene, { folder });
          const campaign = addSceneToCampaign(resolved.campaign, next);
          registry.putAll([next, campaign]);
          reload();
          message = `${scene.identity.name} filed under ${next.folder}.`;
        } else if (action === 'activate') {
          const scene = (resolved.scenes ?? []).find((entry) => entry.identity.id === id);
          if (!scene) throw new Error('choose a scene to activate');
          const activating = resolved.campaign.activeSceneId !== id;
          const campaign = setActiveCampaignScene(resolved.campaign, activating ? id : null);
          registry.put(campaign);
          reload();
          message = activating ? `${scene.identity.name} is now active.` : `${scene.identity.name} deactivated.`;
        } else if (action === 'delete') {
          const scene = (resolved.scenes ?? []).find((entry) => entry.identity.id === id);
          if (!scene) throw new Error('choose a scene to delete');
          if ((resolved.encounters ?? []).some((entry) => entry.sceneId === id)) throw new Error(`${scene.identity.name} has a fight on it and cannot be deleted`);
          const campaign = removeSceneFromCampaign(resolved.campaign, id);
          registry.put(campaign);
          registry.remove(id);
          reload();
          message = `${scene.identity.name} deleted.`;
        } else throw new Error(`unknown scene command: ${command}`);
        log('SYSTEM', message);
        lastMessage = { ok: true, message };
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
      const facts = portFacts(resolved, subsector, selectedSystemId, pendingBrokerTip);
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
      } else if (command === 'fuel:skim') {
        // Book 2 p.34: free, but it costs about a week (skimGasGiantToCapacity's
        // own elapsedDays) and leaves the tanks unrefined until flushed (p.4).
        if (!facts.system?.gasGiant) throw new Error('no gas giant in this system to skim');
        if (facts.fuel.missing < 1) throw new Error('fuel tanks are already full');
        const result = skimGasGiantToCapacity(facts.ship);
        if (result.elapsedDays > 0) {
          let campaign = advanceCampaignDays(resolved.campaign, result.elapsedDays);
          registry.put(campaign);
          // persist() below rebuilds document refs from resolved.campaign, so
          // the new date must be in resolved before it runs (same order the
          // departure handler uses).
          reload();
        }
        persist([result.ship]);
        message = `${shipName} skims ${result.addedTons} t of unrefined fuel from the gas giant at ${facts.system.name} \u2014 free, ${result.elapsedDays} day${result.elapsedDays === 1 ? '' : 's'} spent skimming.`;
        log('SHIP', message);
      } else if (command.startsWith('repair:crew:') || command.startsWith('repair:shipyard:')) {
        // Book 2 p.18: "the cost of the repair is based on the cost of the
        // original assembly... roll two dice: this indicates the cost of
        // replacement of the item in 10% increments; DMs: -2 if the repair
        // installation will be made by ship's crew rather than a shipyard."
        const byCrew = command.startsWith('repair:crew:');
        const rest = command.slice((byCrew ? 'repair:crew:' : 'repair:shipyard:').length);
        const [location, turretId = null] = rest.split(':');
        if (!(facts.repair?.locations ?? []).some((entry) => entry.location === location && entry.turretId === turretId)) {
          throw new Error(`${damageLocationLabel({ location, turretId })} is not damaged`);
        }
        if (!byCrew && !facts.repair?.shipyardHere) throw new Error('no shipyard here (Book 3 p.5: Class A, or Class C\u2019s repair facilities, only)');
        const assemblyCr = assemblyCostCr(facts.ship, { location, turretId });
        const dice = createDice();
        const result = rollRepairCost(dice, assemblyCr, { byCrew });
        const label = damageLocationLabel({ location, turretId });
        let ship = facts.ship;
        const engineerAssignment = (facts.ship.crew?.assignments ?? []).find((entry) => entry.role === 'engineer');
        const pilotAssignment = (facts.ship.crew?.assignments ?? []).find((entry) => entry.role === 'pilot');
        const who = byCrew ? ((engineerAssignment ?? pilotAssignment)?.characterName || 'The crew') : `${facts.system.name}\u2019s shipyard`;
        if (result.costCr > 0) {
          ship = debitShipAccount(ship, result.costCr, { kind: 'repair', description: `${label} repair (${byCrew ? 'crew' : 'shipyard'}) at ${facts.system.name}`, dateLabel });
        }
        ship = fullyRepairLocation(ship, { location, turretId });
        persist([ship]);
        message = `${who} repairs ${label} \u2014 2D${result.dm ? signed(result.dm) : ''} = ${result.total}, ${result.percent}% of ${cr(assemblyCr)}${result.costCr > 0 ? `, ${cr(result.costCr)} paid.` : ', free.'}`;
        log('PORT', message);
      } else if (command === 'arrival:dismiss') {
        if (!pendingArrivalEncounter) throw new Error('no arrival encounter is standing');
        message = `${pendingArrivalEncounter.label} let pass at ${facts.system?.name ?? 'the port'}`;
        pendingArrivalEncounter = null;
        log('NAV', message);
        lastMessage = { ok: true, message };
        onChange();
        saveToCloud();
        return lastMessage;
      } else if (command === 'arrival:fight') {
        if (!pendingArrivalEncounter) throw new Error('no arrival encounter is standing');
        if (pendingShipFight) throw new Error('a ship fight is already under way');
        const playerShip = facts.ship;
        // Book 2 p.22 never says which side is which; your own ruling is that
        // whoever initiated intrudes. Only the pirate is hostile by the p.36
        // roll itself; a referee choosing to fight anything else initiated it.
        const opponentIsIntruder = Boolean(pendingArrivalEncounter.hostileByDefault);
        pendingShipFight = beginArrivalShipFight({
          opponentIsIntruder, playerShip,
          intruderNote: opponentIsIntruder
            ? `${pendingArrivalEncounter.label} initiated on arrival.`
            : `${playerShip.identity.name || 'The party'} chose to engage ${pendingArrivalEncounter.label}.`
        });
        message = `${playerShip.identity.name || 'The ship'} engages ${pendingArrivalEncounter.label} at ${facts.system?.name ?? 'the port'}.`;
        pendingArrivalEncounter = null;
        log('SHIP', message);
        lastMessage = { ok: true, message };
        onChange();
        saveToCloud();
        return lastMessage;
      } else if (command === 'arrival:hail') {
        // Book 2 p.36: "Free Traders, if friendly, may serve as a source of
        // information about other circumstances in the system; Subsidized
        // Merchants may also provide such information." A Book 3 reaction
        // throw decides friendly; the reward here is a broker's tip (a DM)
        // on the next speculative resale made at this same system, your
        // own call on what "information" is worth in play terms.
        //
        // rollReaction() returns no category field, only a numeric total
        // (2-12) and its REACTION_TABLE description — 9+ (Intrigued and up)
        // is the friendly half of that table, 2-5 (Violent/Hostile) the
        // other end, matching arrival:inspect's own thresholds. Free
        // Trader/Subsidized Merchant is not hostile by default (only the
        // pirate is, per p.36), but this particular crew's own reaction to
        // being hailed can still land there — and buildEncounteredShip arms
        // every encountered ship's first two turrets regardless of type, so
        // "it opens fire" is a real, not just narrated, possibility here.
        if (!pendingArrivalEncounter) throw new Error('no arrival encounter is standing');
        if (!['free-trader', 'subsidized-merchant'].includes(pendingArrivalEncounter.key)) throw new Error('this ship has nothing to hail for');
        if (pendingShipFight) throw new Error('a ship fight is already under way');
        const encounterLabel = pendingArrivalEncounter.label;
        const seed = `${resolved.campaign.identity.id}|arrival|${pendingArrivalEncounter.systemId}|${pendingArrivalEncounter.dateLabel}|hail`;
        const hailReaction = rollReaction(seededDice(seed));
        if (hailReaction.tableTotal <= 5) {
          const playerShip = facts.ship;
          pendingShipFight = beginArrivalShipFight({
            opponentIsIntruder: true, playerShip,
            intruderNote: `${encounterLabel} takes the hail as a threat and opens fire.`
          });
          message = `${encounterLabel} takes the hail badly and opens fire \u2014 ${hailReaction.description}`;
          pendingArrivalEncounter = null;
          log('SHIP', message);
        } else if (hailReaction.tableTotal >= 9) {
          pendingBrokerTip = { systemId: pendingArrivalEncounter.systemId, dm: 1 };
          message = `${encounterLabel} shares word of a buyer here \u2014 ${hailReaction.description} (a broker's tip on your next resale quote at ${facts.system?.name ?? 'this system'}).`;
          pendingArrivalEncounter = null;
          log('NAV', message);
        } else {
          message = `${encounterLabel} trades pleasantries but nothing useful \u2014 ${hailReaction.description}`;
          pendingArrivalEncounter = null;
          log('NAV', message);
        }
        lastMessage = { ok: true, message };
        onChange();
        saveToCloud();
        return lastMessage;
      } else if (command === 'arrival:inspect') {
        // Book 2 p.36: "Patrols may be simple border pickets, or may be a
        // form of pirate, exacting tolls or penalties." A Book 3 reaction
        // throw decides which: REACTION_TABLE's own 2-5 is Violent/Hostile,
        // 9+ is Intrigued and up (the friendly half), and 6-8 (Unreceptive,
        // Non-committal, Interested) is neither — it wants something first
        // (arrival:pay-toll / arrival:refuse-toll).
        if (!pendingArrivalEncounter) throw new Error('no arrival encounter is standing');
        if (pendingArrivalEncounter.key !== 'patrol') throw new Error('only a patrol conducts an inspection');
        if (pendingShipFight) throw new Error('a ship fight is already under way');
        const encounterLabel = pendingArrivalEncounter.label;
        const seed = `${resolved.campaign.identity.id}|arrival|${pendingArrivalEncounter.systemId}|${pendingArrivalEncounter.dateLabel}|inspect`;
        const inspectReaction = rollReaction(seededDice(seed));
        if (inspectReaction.tableTotal <= 5) {
          const playerShip = facts.ship;
          pendingShipFight = beginArrivalShipFight({
            opponentIsIntruder: true, playerShip,
            intruderNote: `${encounterLabel} turns hostile during inspection.`
          });
          message = `${encounterLabel} turns hostile during the inspection \u2014 ${inspectReaction.description}`;
          pendingArrivalEncounter = null;
          log('SHIP', message);
        } else if (inspectReaction.tableTotal >= 9) {
          message = `${encounterLabel} waves ${shipName} through \u2014 ${inspectReaction.description}`;
          pendingArrivalEncounter = null;
          log('NAV', message);
        } else {
          // No formula is given for a toll's size, so this borrows the one
          // standard fee already in the rules rather than inventing a
          // number: a day's berthing.
          const tollCr = calculateBerthingCost(1);
          pendingArrivalEncounter = { ...pendingArrivalEncounter, tollDemandCr: tollCr };
          message = `${encounterLabel} demands ${cr(tollCr)} before waving ${shipName} through \u2014 ${inspectReaction.description}`;
          log('NAV', message);
        }
        lastMessage = { ok: true, message };
        onChange();
        saveToCloud();
        return lastMessage;
      } else if (command === 'arrival:pay-toll') {
        if (!pendingArrivalEncounter?.tollDemandCr) throw new Error('no toll is being demanded');
        const tollCr = pendingArrivalEncounter.tollDemandCr;
        const encounterLabel = pendingArrivalEncounter.label;
        const ship = debitShipAccount(facts.ship, tollCr, { kind: 'toll', description: `${encounterLabel} inspection toll at ${facts.system?.name ?? 'the port'}`, dateLabel });
        persist([ship]);
        message = `${shipName} paid ${cr(tollCr)} to ${encounterLabel} and is waved through.`;
        pendingArrivalEncounter = null;
        log('TRADE', message);
        lastMessage = { ok: true, message };
        onChange();
        saveToCloud();
        return lastMessage;
      } else if (command === 'arrival:refuse-toll') {
        if (!pendingArrivalEncounter?.tollDemandCr) throw new Error('no toll is being demanded');
        if (pendingShipFight) throw new Error('a ship fight is already under way');
        const encounterLabel = pendingArrivalEncounter.label;
        const playerShip = facts.ship;
        pendingShipFight = beginArrivalShipFight({
          opponentIsIntruder: true, playerShip,
          intruderNote: `${encounterLabel} attacks after its toll is refused.`
        });
        message = `${shipName} refuses the toll \u2014 ${encounterLabel} opens fire.`;
        pendingArrivalEncounter = null;
        log('SHIP', message);
        lastMessage = { ok: true, message };
        onChange();
        saveToCloud();
        return lastMessage;
      } else if (command === 'shipfight:fire' || command === 'shipfight:hold') {
        if (!pendingShipFight) throw new Error('no ship fight is under way');
        const dice = createDice();
        let fight = pendingShipFight.encounter;
        const foe = fight.participants.find((entry) => entry.side !== pendingShipFight.playerSide && !entry.escaped);
        let shots = [];
        if (command === 'shipfight:fire' && foe) {
          const allocations = laserAllocationAgainstSingleFoe(fight, 'player', foe.id);
          if (allocations.length) {
            fight = allocateLaserFire(fight, allocations);
            const resolved2 = resolveLaserFire(fight, dice);
            fight = resolved2.encounter;
            fight = creditEscapeShots(fight, resolved2.shots);
            shots = resolved2.shots;
          }
        }
        if (fight.outcome === 'in-progress') fight = advanceShipCombatPhase(fight, { dice });
        const step = autoAdvanceShipFight(fight, dice, { playerSide: pendingShipFight.playerSide });
        const narrated = [
          ...narrateShots(shots, step.encounter), ...narrateShots(step.shots, step.encounter),
          ...narrateDamageControl(step.newLogEntries, step.encounter)
        ];
        pendingShipFight = { ...pendingShipFight, encounter: step.encounter, log: [...pendingShipFight.log, ...narrated].slice(-40) };
        message = narrated.join(' ') || 'No shots fired this round.';
        log('SHIP', message);
        lastMessage = { ok: true, message };
        onChange();
        saveToCloud();
        return lastMessage;
      } else if (command === 'shipfight:flee') {
        if (!pendingShipFight) throw new Error('no ship fight is under way');
        const dice = createDice();
        const before = pendingShipFight.encounter.participants.find((entry) => entry.id === 'player');
        if (!before) throw new Error('no ship to flee with');
        if (before.fled) throw new Error('already breaking off');
        let fight = fleeShipFight(pendingShipFight.encounter, 'player');
        if (fight.outcome === 'in-progress') fight = advanceShipCombatPhase(fight, { dice });
        const step = autoAdvanceShipFight(fight, dice, { playerSide: pendingShipFight.playerSide });
        const narrated = [...narrateShots(step.shots, step.encounter), ...narrateDamageControl(step.newLogEntries, step.encounter)];
        pendingShipFight = { ...pendingShipFight, encounter: step.encounter, log: [...pendingShipFight.log, ...narrated].slice(-40) };
        const after = step.encounter.participants.find((entry) => entry.id === 'player');
        message = step.encounter.outcome !== 'in-progress'
          ? `${before.name} breaks off and gets clear.`
          : `${before.name} breaks off \u2014 ${after?.shotsRemainingBeforeEscape ?? STANDARD_SHOTS_BEFORE_ESCAPE} more shot(s) allowed before it is out of range (Book 2 p.37).`;
        log('SHIP', message);
        lastMessage = { ok: true, message };
        onChange();
        saveToCloud();
        return lastMessage;
      } else if (command === 'shipfight:vector-start') {
        // Book 2 p.22-23, staged from a Space scene rather than sprung by an
        // arrival roll — client/app.js's startSpaceSceneCombat already does
        // this; spaceSceneCombatPlan (src/space-scene-combat.js) is the pure
        // half of it, shared rather than reimplemented here.
        if (pendingShipFight) throw new Error('a ship fight is already under way');
        const sceneId = fight?.sceneId || resolved.campaign.activeSceneId;
        const scene = (resolved.scenes ?? []).find((entry) => entry.identity.id === sceneId);
        if (!scene) throw new Error('no scene to start the fight from');
        const intruder = fight?.intruder === 'party' ? 'party' : 'opposition';
        const pressurised = Boolean(fight?.pressurised);
        const plan = spaceSceneCombatPlan(scene, { ownShipId: facts.ship?.identity?.id ?? null, intruder });
        if (plan.problems.length) throw new Error(`cannot start: ${plan.problems.join('; ')}`);
        // Kurt 2026-09-19: single ship per side for now. spaceSceneCombatPlan
        // and the vector engine both already support more than one — this is
        // a validation gate here, not a limit in either of them, and comes
        // out once shipfight:vector-move can address more than 'player'.
        for (const side of SPACE_COMBAT_SIDES) {
          const onSide = plan.ships.filter((entry) => entry.stagedSide === side);
          if (onSide.length > 1) throw new Error(`only one ship per side is supported right now (${onSide.length} staged on ${side})`);
        }
        const participants = plan.ships.map((staged) => {
          if (staged.own) {
            const mine = shipCombatLoadout(facts.ship);
            return {
              shipId: staged.participantId, disposition: 'merchant',
              name: facts.ship.identity.name || staged.label || 'The ship', side: staged.side, ship: facts.ship,
              carriedPrograms: mine.carried, loadedPrograms: mine.loaded,
              ...shipCombatCrew(facts.ship),
              pressurisedSections: pressurised ? [...PRESSURE_SECTIONS] : []
            };
          }
          const name = staged.label || staged.designKey;
          const { ship: opponentShip } = buildEncounteredShip({ designKey: staged.designKey, name, key: staged.designKey });
          const loadout = shipCombatLoadout(opponentShip);
          return {
            shipId: staged.participantId,
            // Same Graycloak dispositions the p.36 arrival-encounter path
            // assigns: a staged opposition ship is hostile, a party one is not.
            disposition: staged.stagedSide === 'opposition' ? 'pirate' : 'merchant',
            name, side: staged.side, ship: opponentShip,
            carriedPrograms: loadout.carried, loadedPrograms: loadout.loaded,
            stations: { pilot: 'npc-captain' }, skills: { pilot: 1, computer: 0 },
            pressurisedSections: []
          };
        });
        const playerParticipant = participants.find((entry) => entry.shipId === OWN_SHIP_PARTICIPANT_ID);
        if (!playerParticipant) throw new Error("the campaign's own ship must be staged to start a fight");
        let combat = createShipCombatEncounter({
          id: `ship-fight-${Date.now()}`, campaignId: resolved.campaign.identity.id,
          intruderSide: 'intruder',
          intruderAssignmentNote: `Referee assigned the intruder turn to ${intruder} staged on ${scene.identity.name}`,
          participants
        });
        combat = enableVectorMovement(combat,
          Object.fromEntries(plan.ships.map((staged) => [staged.participantId, { position: staged.position, velocity: staged.velocity }])),
          plan.planet ? { planet: plan.planet, atmosphere: plan.atmosphere } : {});
        pendingShipFight = {
          encounter: combat, playerSide: playerParticipant.side,
          opponentLabel: participants.find((entry) => entry.shipId !== OWN_SHIP_PARTICIPANT_ID)?.name ?? 'Opponent',
          systemId: facts.system?.id ?? null,
          // Where each ship came from, so closing the fight can write its
          // last position and vector back onto the scene (writeSpaceCombatToScene,
          // space-scene-combat.js) — not yet wired to shipfight:end below.
          sceneLink: spaceSceneLink(plan),
          log: []
        };
        message = `Ship combat engaged on ${scene.identity.name}: ${participants.map((entry) => `${entry.name} (${entry.side})`).join(', ')}`;
        log('SHIP', message);
        lastMessage = { ok: true, message };
        onChange();
        saveToCloud();
        return lastMessage;
      } else if (command === 'shipfight:vector-move' || command === 'shipfight:vector-coast') {
        // Book 2 pp.22-31: full vector movement, as an alternative to the
        // abbreviated fight's auto-resolved range. shipId is read from the
        // payload rather than assumed to be 'player' — a side moving more
        // than one ship in its movement phase (p.23) is a validation change
        // here and a ship-picker in the UI, not a new command. Only the
        // player ship is accepted for now; the NPC side moving itself is a
        // separate piece (auto-coast, or real intent) not yet built.
        if (!pendingShipFight) throw new Error('no ship fight is under way');
        if (pendingShipFight.encounter.spatialMode !== 'vector') throw new Error('this fight has no vector plot');
        const shipId = fight?.shipId || 'player';
        if (shipId !== 'player') throw new Error('only the player ship can be moved (multi-ship sides are not yet supported)');
        const acceleration = command === 'shipfight:vector-coast' ? { x: 0, y: 0 } : fight?.acceleration;
        if (!acceleration || !Number.isFinite(acceleration.x) || !Number.isFinite(acceleration.y)) {
          throw new Error('finite acceleration required');
        }
        const dice = createDice();
        // commitShipVector throws its own clear, specific refusals (wrong
        // phase, wrong side's turn, already moved, exceeds the drive, a
        // computer/CPU shortfall, a course into the world) — surfaced as-is
        // rather than re-wrapped, matching every other command here.
        const combat = commitShipVector(pendingShipFight.encounter, shipId, acceleration, dice);
        pendingShipFight = { ...pendingShipFight, encounter: combat };
        const moved = combat.log[combat.log.length - 1];
        message = command === 'shipfight:vector-coast'
          ? `${pendingShipFight.encounter.participants.find((p) => p.id === shipId)?.name ?? 'The ship'} coasts on its existing vector.`
          : `${pendingShipFight.encounter.participants.find((p) => p.id === shipId)?.name ?? 'The ship'} plots ${moved?.g?.toFixed(2) ?? '0.00'} G of thrust.`;
        log('SHIP', message);
        lastMessage = { ok: true, message };
        onChange();
        saveToCloud();
        return lastMessage;
      } else if (command === 'shipfight:vector-adjudicate') {
        // Book 2 has no rule for a course that meets a world's surface — the
        // engine refuses the commit and offers this instead: a referee's
        // explicit ruling on where the ship (or a round of ordnance) ends up.
        if (!pendingShipFight) throw new Error('no ship fight is under way');
        if (pendingShipFight.encounter.spatialMode !== 'vector') throw new Error('this fight has no vector plot');
        const { id, position, velocity, note } = fight ?? {};
        const combat = adjudicateVectorSurface(pendingShipFight.encounter, { id, position, velocity, note });
        pendingShipFight = { ...pendingShipFight, encounter: combat };
        message = `Surface ruling recorded for ${combat.participants.find((p) => p.id === id)?.name ?? id}: ${note}`;
        log('SHIP', message);
        lastMessage = { ok: true, message };
        onChange();
        saveToCloud();
        return lastMessage;
      } else if (command === 'shipfight:vector-advance') {
        // A single explicit phase step, not the abbreviated flow's
        // autoAdvanceShipFight loop. That loop has no idea vector movement
        // exists — it would blow straight through every future movement
        // phase, including the player's own, silently defaulting them to a
        // forced coast every time their side comes back around as phasing.
        // client/app.js's own vector UI already avoids this the same way
        // (an explicit next-phase control, not an auto-resolve-until-a-
        // choice loop), so this matches established practice rather than
        // improvising a new one.
        //
        // advanceShipCombatPhase itself still guarantees Book 2 p.26's rule
        // that a vector carries a ship whether or not it thrusts: leaving the
        // movement phase auto-coasts any phasing-side ship that did not
        // explicitly move (or throws, naming who, if a coasting course would
        // require a surface ruling first) — so nothing here has to re-check
        // that a ship moved before allowing the step.
        //
        // Weapons fire, ordnance and reprogramming have no UI of their own
        // for a vector fight yet: this command steps past those phases too,
        // exactly as shipfight:hold does for the abbreviated flow, without
        // firing anything. That is a real, deliberate gap for the next slice,
        // not an oversight — flagged in the view state (canFire is not
        // computed for a vector fight at all right now) so the UI can say so
        // rather than pretend the row is just empty.
        if (!pendingShipFight) throw new Error('no ship fight is under way');
        if (pendingShipFight.encounter.spatialMode !== 'vector') throw new Error('this fight has no vector plot');
        if (pendingShipFight.encounter.outcome !== 'in-progress') throw new Error('the fight has already ended');
        const dice = createDice();
        const combat = advanceShipCombatPhase(pendingShipFight.encounter, { dice });
        pendingShipFight = { ...pendingShipFight, encounter: combat };
        message = combat.outcome !== 'in-progress'
          ? `The fight is over (${combat.outcome}).`
          : `Advancing to ${currentPhase(combat).label}, turn ${combat.gameTurn}.`;
        log('SHIP', message);
        lastMessage = { ok: true, message };
        onChange();
        saveToCloud();
        return lastMessage;
      } else if (command === 'shipfight:cancel-repair' || command.startsWith('shipfight:repair:')) {
        // Book 2 p.35: "Damage inflicted on starships in combat can be
        // repaired or controlled by crew members during the battle... a
        // throw of 9+ will repair one hit of damage." Nothing in that rule
        // or in p.37's abbreviated-combat rule (which only ever abbreviates
        // movement/range) restricts it to the vector-plot mode, so it
        // applies here too. Your own ruling (ship-combat.js): one
        // declaration per ship per game turn, resolved as the turn ends —
        // declaring or cancelling here doesn't itself do anything but set
        // or clear that declaration; the throw happens automatically once
        // the game turn's phases run out, and shows up narrated in the log
        // (narrateDamageControl) whenever that occurs.
        if (!pendingShipFight) throw new Error('no ship fight is under way');
        const player = pendingShipFight.encounter.participants.find((entry) => entry.id === 'player');
        if (!player) throw new Error('no ship to repair');
        if (command === 'shipfight:cancel-repair') {
          const fight = cancelDamageControl(pendingShipFight.encounter, { shipId: 'player' });
          pendingShipFight = { ...pendingShipFight, encounter: fight };
          message = 'Repair declaration withdrawn.';
        } else {
          const rest = command.slice('shipfight:repair:'.length);
          const [location, turretId] = rest.startsWith('turret:') ? ['turret', rest.slice('turret:'.length)] : [rest, null];
          // Whoever damageControlOptions actually priced the DM against:
          // engineering for a drive or the power plant (falling back to the
          // pilot if no engineer is crewed), the pilot for the computer
          // (p.16: the computer operator defaults to the pilot), and the
          // engineer — the general fix-it station — for anything else
          // (hull, hold, fuel, a turret) if one is crewed.
          const isComputer = location === 'computer';
          const crewId = isComputer ? player.stations.pilot : (player.stations.engineer ?? player.stations.pilot);
          if (!crewId) throw new Error('no crew is assigned to attempt a repair');
          const crewName = (facts.ship.crew?.assignments ?? []).find((entry) => entry.characterId === crewId)?.characterName || 'The crew';
          const fight = declareDamageControl(pendingShipFight.encounter, { shipId: 'player', location, turretId, crewId, crewName });
          pendingShipFight = { ...pendingShipFight, encounter: fight };
          message = `${crewName} will attempt to repair ${damageLocationLabel({ location, turretId })} this turn (Book 2 p.35: resolves as the game turn ends, throw ${DAMAGE_CONTROL_THROW}+).`;
        }
        log('SHIP', message);
        lastMessage = { ok: true, message };
        onChange();
        saveToCloud();
        return lastMessage;
      } else if (command === 'shipfight:end') {
        if (!pendingShipFight) throw new Error('no ship fight is under way');
        if (pendingShipFight.encounter.outcome === 'in-progress') throw new Error('the fight has not ended yet');
        const finalPlayerShip = pendingShipFight.encounter.participants.find((entry) => entry.side === pendingShipFight.playerSide)?.ship;
        const outcomeText = {
          disabled: `${pendingShipFight.opponentLabel} is disabled and adrift — a boarding is uncontested.`,
          disarmed: `${pendingShipFight.opponentLabel} has no working weapon left but can still run.`,
          disengaged: `${pendingShipFight.opponentLabel} broke off.`
        }[pendingShipFight.encounter.outcome] ?? `The fight with ${pendingShipFight.opponentLabel} is over (${pendingShipFight.encounter.outcome}).`;
        if (finalPlayerShip) persist([finalPlayerShip]);
        message = outcomeText;
        pendingShipFight = null;
        log('SHIP', message);
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
            // Two more fields alongside the display ones already here: `key`
            // is the encounter category itself (drives the fight's Book 3
            // p.29-shaped disposition); `hullKey` is the one design-
            // determining key regardless of which roll it came from — the
            // type itself for a free trader/subsidized merchant/yacht, or
            // the separate p.36 hull throw's own key for a patrol or pirate.
            key: shipEncounter.type,
            hullKey: shipEncounter.hull?.hull ?? shipEncounter.type,
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
          // A hail's broker tip (Book 2 p.36) is good for one resale, not
          // the whole port stay.
          if (pendingBrokerTip && pendingBrokerTip.systemId === facts.system.id) pendingBrokerTip = null;
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
    view({ seat = 'referee', characterId = null, selectedSystemId = null, selectedFighterId = null, referee = {} } = {}) {
      const state = buildPlayViewState(resolved, { subsector, seat, characterId });
      state.referee = refereeView(resolved, referee);
      // v0.233.0: state.ship (the masthead chip and the ship drawer both
      // read it) otherwise always reflects the persisted document, which a
      // ship fight in progress hasn't touched yet — resolveLaserFire writes
      // damage onto the participant's own in-memory ship copy, not the
      // document, until shipfight:end persists it. Swap in the live copy
      // while a fight is under way so damage shows up as it happens rather
      // than only once the fight is over.
      if (pendingShipFight && state.ship) {
        const liveShip = pendingShipFight.encounter.participants.find((entry) => entry.id === 'player')?.ship;
        if (liveShip && liveShip.identity.id === state.ship.id) state.ship = shipView(liveShip);
      }
      // v0.230.0: a ship fight in progress is what is happening, the same
      // way a personal fight already takes over the screen below. The two
      // cannot currently arise together (nothing starts a ship fight during
      // a personal one or vice versa), so this simply takes the same
      // precedence.
      if (pendingShipFight) {
        const encounter = pendingShipFight.encounter;
        const phase = currentPhase(encounter);
        const writable = save.state !== 'stale';
        const ended = encounter.outcome !== 'in-progress';
        const player = encounter.participants.find((entry) => entry.id === 'player');
        const canFlee = Boolean(player) && !player.fled && !player.escaped && !player.surrendered;
        const roster = shipFightRoster(encounter);
        const isVector = encounter.spatialMode === 'vector';
        // The vector view's own plot: positions, velocities, range, and
        // whether the player's ship is the one waiting to move this
        // movement phase. Built here (not left to the view layer to derive)
        // because previewShipVector and vectorRangeDM both need the raw
        // encounter, which nothing outside play-session.js touches.
        let vector = null;
        if (isVector && player) {
          const opponent = encounter.participants.find((entry) => entry.id !== 'player');
          const mySpatial = encounter.spatial.ships.player;
          const oppSpatial = opponent ? encounter.spatial.ships[opponent.id] : null;
          vector = {
            phaseKey: phase.key,
            phasingSide: encounter.phasingSide,
            playerSide: pendingShipFight.playerSide,
            // True exactly when commitShipVector would accept a move for
            // 'player' right now — the same condition the command itself
            // checks, read here instead of duplicated.
            awaitingMovement: !ended && phase.key === 'movement'
              && encounter.phasingSide === pendingShipFight.playerSide
              && mySpatial.movedTurn !== encounter.gameTurn,
            player: { position: mySpatial.position, velocity: mySpatial.velocity, maxG: previewShipVector(encounter, 'player', { x: 0, y: 0 }).maximumG },
            opponent: oppSpatial ? { name: opponent.name, side: opponent.side, position: oppSpatial.position, velocity: oppSpatial.velocity } : null,
            range: opponent ? vectorRangeDM(encounter, 'player', opponent.id) : null
          };
        }
        // A toothless ship offering "Fire lasers" is misleading — the
        // command already no-ops (laserAllocationAgainstSingleFoe finds
        // nothing to allocate), but the button shouldn't be there to click
        // in the first place. Hold fire (relabelled) becomes the one way
        // to let the turn pass instead.
        const canFire = !isVector && !roster.find((entry) => entry.shipId === 'player')?.toothless;
        // Book 2 p.35/p.37: damage control is available in abbreviated combat
        // too (p.37 only ever abbreviates movement/range, nothing else) — one
        // repair option per repairable location, always offered even while
        // one is already declared, since RAW lets a declaration "be changed
        // or withdrawn until the turn ends".
        const canRepair = writable && !ended && player && !player.escaped && !player.surrendered;
        const repairActions = canRepair ? damageControlOptions(player).map((entry) => ({
          command: entry.location === 'turret' ? `shipfight:repair:turret:${entry.turretId}` : `shipfight:repair:${entry.location}`,
          label: `Repair ${damageLocationLabel(entry)}`
        })) : [];
        const cancelRepairAction = canRepair && player.damageControl ? [{ command: 'shipfight:cancel-repair', label: 'Cancel repair' }] : [];
        return {
          ...state,
          situation: { kind: 'ship-fight', title: `Ship fight, turn ${encounter.gameTurn}`, detail: `vs ${pendingShipFight.opponentLabel}` },
          shipFight: {
            roster,
            spatialMode: encounter.spatialMode,
            vector,
            gameTurn: encounter.gameTurn,
            phase: phase.label,
            outcome: encounter.outcome,
            awaitingPlayer: !ended && actingSide(encounter) === pendingShipFight.playerSide
              && (phase.key === 'laser-fire' || phase.key === 'return-fire'),
            opponentLabel: pendingShipFight.opponentLabel,
            log: pendingShipFight.log,
            // Two different kinds of thing, kept separate rather than one
            // flat row: 'actions' ends the current phase and advances play
            // (possibly through several phases); the repair actions below
            // are a standing declaration for the game turn that does not
            // by itself advance anything — one of 'actions' still has to
            // happen for the turn to end and the repair to resolve.
            //
            // A vector fight gets no actions row at all outside 'ended':
            // client/vector-fight-view.js draws its own Commit/Coast form
            // during the movement phase, and its own single Advance button
            // everywhere else (shipfight:vector-advance) — Fire/Hold/Flee
            // have no vector-mode UI yet (see that command's own comment),
            // so offering them here would be a button with no real weapons
            // behaviour behind it.
            actions: !writable ? [] : ended
              ? [{ command: 'shipfight:end', label: 'End fight', primary: true }]
              : isVector ? []
              : [
                  ...(canFire ? [{ command: 'shipfight:fire', label: 'Fire lasers', primary: true }] : []),
                  { command: 'shipfight:hold', label: canFire ? 'Hold fire' : 'Continue', primary: !canFire },
                  ...(canFlee ? [{ command: 'shipfight:flee', label: 'Flee' }] : [])
                ],
            repairActions: !writable || ended ? [] : repairActions,
            cancelRepairAction: !writable || ended ? [] : cancelRepairAction,
            repairNote: 'Book 2 p.35: declaring a repair doesn\u2019t use your turn by itself \u2014 Fire, Hold/Continue, or Flee still needs to happen for the turn to end and the repair to resolve.'
          },
          save, notice: lastMessage
        };
      }
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
      const procedure = portProcedure(resolved, { subsector, selectedSystemId, writable: save.state !== 'stale', brokerTip: pendingBrokerTip });
      // The arrival encounter leads the column while it stands: it is what is
      // happening, and the port business waits behind it.
      const encounter = pendingArrivalEncounter && pendingArrivalEncounter.systemId === resolved.campaign.location?.systemId
        ? pendingArrivalEncounter : null;
      const next = encounter
        ? encounter.tollDemandCr
          ? {
            title: `${encounter.label} demands a toll`,
            copy: `${cr(encounter.tollDemandCr)}, or it becomes a fight. Book 2 p.36: "Patrols may be simple border pickets, or may be a form of pirate, exacting tolls or penalties."`,
            cite: 'Book 2 p.36',
            actions: [
              { command: 'arrival:pay-toll', label: `Pay ${cr(encounter.tollDemandCr)}`, primary: true },
              { command: 'arrival:refuse-toll', label: 'Refuse' }
            ]
          }
          : {
            title: `${encounter.label} at ${resolved.campaign.location.worldName ?? resolved.campaign.location.systemName}`,
            copy: `${encounter.hull ? `${encounter.hull}. ` : ''}${encounter.reaction}${encounter.hostileByDefault ? ' This kind of ship is hostile by default.' : ''} Book 2 p.38. Fights are still run in the current client; dismissing this leaves the port call as it was.`,
            cite: 'Book 2 p.38',
            actions: [
              { command: 'arrival:dismiss', label: 'Let it pass', primary: true },
              { command: 'arrival:fight', label: 'Fight' },
              // Book 2 p.36's own comment: friendly Free Traders and
              // Subsidized Merchants trade in information; a Patrol may
              // instead want to look the ship over.
              ...(['free-trader', 'subsidized-merchant'].includes(encounter.key) ? [{ command: 'arrival:hail', label: 'Hail' }] : []),
              ...(encounter.key === 'patrol' ? [{ command: 'arrival:inspect', label: 'Submit to inspection' }] : [])
            ]
          }
        : procedure.next;
      return { ...state, ...procedure, next, arrivalEncounter: encounter, scene: { ...state.scene, selectedId: selectedSystemId, world: procedure.world }, save, notice: lastMessage };
    }
  };
}

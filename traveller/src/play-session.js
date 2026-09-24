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
  setCharacterMilitaryLoad, updateCharacterInventoryItem, emptyCharacterRecord, updateCharacterRecord,
  restCharacter, medicalAttention, characterIsWounded, REST_DAYS, skillGuide, skillDM,
  CATALOGUE, CATALOGUE_PACKS, catalogueEntry, catalogueAvailability,
  FREIGHT_RATE_PER_TON_CR, PASSAGE_FARES_CR, availablePassengerCapacity, beginPortCall, bookPassenger,
  calculateBerthingCost, calculateLifeSupportCostForTrip, calculateSpeculativePurchaseCost, canShipMakeJump,
  chargeLifeSupportForTrip, chargeShipUpkeep, consumeJumpFuel, creditShipAccount, deliverFreightAtDestination,
  disembarkPassengersAtDestination, generateFreightOffers, generatePassengerDemand, generateSpeculativeTradeOffer,
  getPersonalWeapon, getSubsectorSystem, jumpDistanceBetweenSystems, loadCargo, parseUniversalWorldProfile,
  payCurrentBerthing, purchaseShipFuel, purchaseSpeculativeCargo, quoteSpeculativeResale, sellSpeculativeCargo,
  skimGasGiantToCapacity, assessLoad, inventoryLoadGrams, rollEncounterRange,
  personalWeaponExpertise, PERSONAL_EXPERTISE_FLOOR, LONG_GUN_PARRY_KEYS,
  ENCOUNTER_RANGE_TABLE, MORALE_DMS, PERSONAL_ARMOR_TYPES as ARMOR_TYPES, RANGE_MATRIX, REACTION_TABLE,
  REACTION_DMS, SHIP_ENCOUNTER_STARPORT_DMS, SHIP_ENCOUNTER_TABLE, TERRAIN_DMS,
  createDice, importCharacterDocument, stableDocumentId, rollReaction, formatUPP, rollShipEncounter, starportFuelService, unloadCargo,
  updateCharacterGameplayState, assertValidShipDocument,
  createShipCombatEncounter, currentPhase, actingSide, advanceShipCombatPhase, allocateLaserFire, resolveLaserFire,
  PRESSURE_SECTIONS, damageControlOptions, declareDamageControl, cancelDamageControl, DAMAGE_CONTROL_THROW,
  STANDARD_SHIP_DESIGN_KEYS, getStandardShipDesign, shipCombatIntent, shipCombatPhaseActions,
  SHIP_COMBAT_PHASES, opposingSide, shipDataCard, COMPUTER_PROGRAMS, improvisedMeleeWeapons
} from '../vendor/classic-traveller-rules/index.js';
import {
  opposingShipDesignKey, opposingShipDisposition, buildEncounteredShip, shipCombatLoadout,
  autoAdvanceShipFight, shipFightRoster, laserAllocationAgainstSingleFoe,
  creditEscapeShots, fleeShipFight, STANDARD_SHOTS_BEFORE_ESCAPE, damageLocationLabel, shipStateDamageSummary
} from './ship-arrival-combat.js';
// coastVectorShips (bulk-coast every unmoved ship on a side) is not imported
// yet: with one ship per side, commitShipVector(shipId, {x:0,y:0}) below does
// the same thing. It becomes the right tool once a side can carry more than
// one ship and the rest need to coast at once.
import {
  enableVectorMovement, commitShipVector, adjudicateVectorSurface, previewShipVector, vectorRangeDM,
  shipVectorManeuver, VECTOR_ESCAPE_RANGE
} from '../vendor/classic-traveller-rules/src/starships/vector-movement.js';
// Pure planning for a fight staged on a Space (vector) scene — no DOM, no ship
// documents. See its own header: built to be shared by any client.
import { dataCardLines } from './ship-data-card-text.js';
import {
  SECONDS_PER_DAY, campaignDayNumber, animalTableKey, animalState, withAnimalState, buildAnimalTable, animalCheck,
  rollOnAnimalTable, describeAnimalRow, runSurfaceChecks, animalBehaviourThrow, describeBehaviour,
  animalSurpriseThrow, animalRangeThrow, animalRangeTerrain, surfaceParty, butcherCarcass,
  animalTableSheet, animalJournalEntries, animalSurfaceView, animalSheetView
} from './animal-encounters.js';
import { spaceSceneCombatPlan, spaceSceneLink, writeSpaceCombatToScene, OWN_SHIP_PARTICIPANT_ID, SPACE_COMBAT_SIDES } from './space-scene-combat.js';
import {
  shipDamagedLocations, assemblyCostCr, rollRepairCost, fullyRepairLocation, SHIPYARD_STARPORTS, REPAIR_PARTS_CREW_DM
} from './ship-repair.js';
// The market seeds are shared with client/app.js so both pages draw the same
// freight lots and the same passengers for a route on a given day.
import { campaignDateKey, routeMarketSeed, saleQuoteSeed, seededDice, weeklyTradeSeed } from '../client/commerce-market.js';
import {
  addActivityLogToCampaign, campaignIsPublished, markCampaignPublished, recordSpeculativeLotPurchase, refreshCampaignDocumentRefs,
  setCampaignOwner, speculativeLotPurchasedQuantity, updateCampaignLocation, advanceCampaignDays, advanceCampaignSeconds, updateCampaignTime,
  addSceneToCampaign, removeSceneFromCampaign, setActiveCampaignScene, setActiveCampaignCharacter,
  addCharacterToCampaign, removeCharacterFromCampaign, characterFolder, setCharacterFolders, setDocumentOwner
} from './campaign-document.js';
import {
  createSceneDocument, updateSceneDocument, sceneIsVectorBoard, sceneThumbnailSvg, DEFAULT_SCENE_FOLDER,
  sceneActorIsDesignReference, SCENE_DESIGN_REFERENCE_PREFIX, removeSceneToken, placeSceneShip,
  moveSceneShip, setSceneTokenSide, setSceneShipVector, sceneBodies, sceneGravityWorld,
  placeSceneBody, moveSceneBody, removeSceneBody, setSceneGravityBody,
  worldBody, asteroidFieldBody, emplacementBody
} from './scene-document.js';
import { completeContractDocument, failContractDocument, isContractOverdue, reconcileContractDeadlines } from './contract-document.js';
import {
  ESCAPE_TARGET, ESCAPE_RANGE_DMS, avoidEncounter, rangeBandForBandGap,
  addEncounterCombatantFromCharacter, addEncounterCombatantFromActor, repositionEncounterCombatant, removeEncounterCombatant, beginEncounter, setEncounterOpeningRange,
  moraleStanding, setEncounterMorale, setCombatantWeapon, setCombatantArmor,
  allocateRoundWound, createEncounterDocument, declareEncounterAction, endEncounterByReferee,
  opponentSpecFromNpcActor, pendingWoundAllocation, resolveDeclaredRound, undeclareEncounterAction,
  undeclaredCombatantIds
} from './encounter-document.js';
import { addEncounterToCampaign, removeEncounterFromCampaign, addNpcActorToCampaign, removeNpcActorFromCampaign } from './campaign-document.js';
import { chooseNpcDeclaration, pendingNpcDeclarations } from './npc-tactics.js';
import { lawCheck, starportLine, atmosphereGear, worldDetail, prohibitedWeaponKeys } from './world-notes.js';
import {
  createNpcActorDocument, duplicateNpcActorDocument, updateNpcActorDocument, NPC_ACTOR_KINDS, normalizeFolderPath,
  addNpcActorInventoryItem, updateNpcActorInventoryItem, removeNpcActorInventoryItem,
  recordNpcActorWounds, restNpcActor, medicalAttentionNpcActor, npcActorIsNonHuman, npcActorIsWounded, npcActorIsSeverelyWounded, npcActorIsDead
} from './npc-actor-document.js';
import { setCombatantCurrent } from './encounter-document.js';

// client/app.js's own convention for a contract's reserved cargo manifest id.
const contractCargoId = (contract) => `${contract.identity.id}:cargo`;
import { appendActivityLogEntry, createActivityLogDocument, mergeActivityLogHistory } from './activity-log-document.js';
import { StaleCampaignHomeError, createCampaignHome, importCampaignHome, nextCampaignHome } from './campaign-home.js';
import { buildPublishedCampaign, buildPublishedScene, buildPublishedCharacter, buildPublishedView, buildPublishedLog } from './published-view.js';
import { authorizePlayerDeclaration } from './player-declaration.js';
import { authorizePlayerWoundAllocation } from './player-wound-allocation.js';
import { createChatMessage } from './dice-tray.js';

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
// v0.249.0: Tables goes; its generated reference (Book 1 p.43's range matrix
// and the rest) belongs in the Journal as read-only documents, not in a
// directory of things you can open, file and delete.
export const REFEREE_TABS = Object.freeze(['Journal', 'Actors', 'Players', 'Vehicles', 'Scenes']);
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
  // v0.253.0: the activity log moved into Chat, where Kurt wanted it. The
  // Journal is for real documents — text and images, adventures, handouts —
  // which do not exist yet, so it is empty rather than a second copy of the
  // log. The old listing is kept below for when journal documents land and
  // the log's own history wants a read-only home.
  // v0.302.0: the first real Journal documents — each world's animal
  // encounter tables (The Traveller Book p.95), the referee's alone.
  return animalJournalEntries(resolved);
  // eslint-disable-next-line no-unreachable
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
  // v0.249.0: player characters belong in the same directory as everyone
  // else — they are actors. The Players tab is about accounts, not people
  // in the campaign.
  // v0.265.0: filed, renamed, copied and deleted like any other actor; the
  // folder lives on the campaign (characterFolder) since the character
  // document has none.
  const party = new Set(resolved.campaign.party?.characterIds ?? []);
  const characters = (resolved.characters ?? []).map((character) => ({
    id: character.identity.id,
    name: character.identity.name || '(unnamed)',
    note: [character.career?.service, character.upp, party.has(character.identity.id) ? null : 'not in the party'].filter(Boolean).join(' \u00b7 '),
    folder: characterFolder(resolved.campaign, character.identity.id),
    editable: true,
    character: true,
    sheet: { kind: 'actor', id: character.identity.id },
    drag: { kind: 'character', id: character.identity.id },
    badge: { kind: 'actor', side: 'party' }
  }));
  const actors = (resolved.npcActors ?? []).filter((actor) => !actor.state?.archived).map((actor) => ({
    id: actor.identity.id,
    name: actor.identity.name,
    note: [
      actor.profile?.kind === 'statblock' ? actor.upp : actor.profile?.role,
      actor.loadout?.weaponKey ? getPersonalWeapon(actor.loadout.weaponKey)?.name ?? actor.loadout.weaponKey : null,
      actor.profile?.faction
    ].filter(Boolean).join(', '),
    folder: actor.profile?.folder ?? '',
    editable: true,
    sheet: { kind: 'actor', id: actor.identity.id },
    drag: { kind: 'actor', id: actor.identity.id },
    actorKind: actor.profile?.kind ?? 'actor',
    badge: { kind: actor.profile?.kind ?? 'actor', side: actor.profile?.kind === 'statblock' ? 'opposition' : 'neutral' }
  }));
  return [...characters, ...actors];
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
          : 'Other vehicles',
      sheet: { kind: 'ship', id: ship.identity.id },
      badge: { kind: 'ship', typeCode: ship.design?.typeCode ?? '?', side: 'party' }
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
    isVectorBoard: sceneIsVectorBoard(scene),
    sheet: { kind: 'scene', id: scene.identity.id }
  }));
}

// The staging picker and staged-token list for one vector-board scene —
// separate from sceneEntries (which stays a lightweight list row for all
// scenes) since only one scene is ever being staged onto at a time.
function buildStagingView(resolved, sceneId, { intruder = 'opposition' } = {}) {
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
  const tokens = scene.tokens.map((token) => {
    const isOwn = ownShip && token.actorId === ownShip.identity.id;
    const design = isOwn ? null : getStandardShipDesign(token.actorId.slice(SCENE_DESIGN_REFERENCE_PREFIX.length));
    const pilotName = isOwn
      ? (ownShip.crew?.assignments ?? []).find((entry) => entry.role === 'pilot')?.characterName ?? 'Unassigned'
      : null;
    const velocity = { x: Number(token.velocity?.x) || 0, y: Number(token.velocity?.y) || 0 };
    return {
      id: token.id,
      label: token.label || (isOwn ? ownShip.identity.name : design?.name) || token.actorId,
      own: Boolean(isOwn),
      hull: isOwn ? `${ownShip.design.typeCode} \u00b7 your ship` : `${design?.typeCode ?? '?'} \u00b7 design`,
      controller: isOwn ? pilotName : 'Referee (NPC)',
      side: token.side, position: token.position, velocity,
      // Book 2 p.25 states a vector as a length and a direction, which is how
      // the referee thinks about one; x/y stays underneath for the engine.
      speed: Math.hypot(velocity.x, velocity.y),
      bearing: bearingOfVector(velocity)
    };
  });
  const bodies = sceneBodies(scene);
  const gravityWorld = sceneGravityWorld(scene);
  const plan = spaceSceneCombatPlan(scene, { ownShipId: ownShip?.identity?.id ?? null, intruder });
  // The range the fight would open at, and its p.30 DM — the one number that
  // decides whether a staged position is a fight or a long stern chase.
  const sides = SPACE_COMBAT_SIDES.map((side) => tokens.filter((token) => token.side === side));
  let opening = null;
  if (sides[0].length && sides[1].length) {
    const distance = Math.min(...sides[0].flatMap((a) => sides[1].map((b) => Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y))));
    opening = { distance, dm: distance > 300 ? -5 : distance > 150 ? -2 : 0 };
  }
  return {
    sceneId, sceneName: scene.identity.name, spanThousandMiles: scene.board.spanThousandMiles,
    // The scene document itself, and its bodies, for client/ship-vector-map.js's
    // renderVectorSceneStage — the original working staging board (drag to
    // place a ship, drag its velocity arrow, place and drag a world, zoom,
    // pan, minimap). It reads a real scene document, so it gets one rather
    // than a reshaped copy; `tokens`/`choices` below stay for the numeric
    // list beside it, which shows the same data as text.
    scene, bodies,
    world: gravityWorld
      ? { id: gravityWorld.id, name: gravityWorld.name, diameter: gravityWorld.template.diameter ?? gravityWorld.template.radius * 2, radius: gravityWorld.template.radius, surfaceG: gravityWorld.template.surfaceG ?? null }
      : null,
    atmosphere: scene.space?.atmosphere ?? null,
    choices, tokens,
    intruder,
    opening,
    canStart: plan.problems.length === 0,
    blockedReason: plan.problems.length ? plan.problems.join('; ') : null
  };
}

// p.25's bearing notation: 000\u00b0 is +y, clockwise. The same convention
// client/vector-fight-view.js draws with.
function bearingOfVector({ x, y }) {
  if (!x && !y) return 0;
  return Math.round(((Math.atan2(x, y) * 180) / Math.PI + 360) % 360);
}

/** A speed and a bearing (p.25) as the x/y pair the engine and the scene keep. */
export function vectorFromSpeedBearing(speed, bearingDegrees) {
  const radians = (bearingDegrees * Math.PI) / 180;
  const round = (value) => Math.round(value * 1000) / 1000;
  return { x: round(speed * Math.sin(radians)), y: round(speed * Math.cos(radians)) };
}

// ---------------------------------------------------------------- sheets
// v0.249.0: a sheet is Foundry's own idea — click a directory row and the
// document opens in a panel of its own, over whatever is on screen, several
// at once. Everything here is the MODEL of one; client/sheets.js draws it and
// decides between a floating frame and a full-screen panel by viewport.

export const SHEET_KINDS = Object.freeze(['ship', 'actor', 'scene']);

function shipSheet(resolved, id) {
  const ship = (resolved.ships ?? []).find((entry) => entry.identity.id === id);
  if (!ship) return null;
  const view = shipView(ship);
  // Book 2 p.24's card, from the rules package's own shipDataCard, through
  // the participant shape it expects. A ship sitting in the directory is not
  // in a fight, so it has no stations, skills or loaded programs beyond what
  // the document itself carries.
  const participant = {
    id: ship.identity.id, name: ship.identity.name, ship,
    stations: { pilot: null, gunners: {} }, skills: { pilot: 0, gunnery: {} },
    pressurisedSections: [], disposition: 'neutral', escaped: false, surrendered: false, fled: false,
    computer: { carried: [], loaded: [] }
  };
  let card = null;
  try { card = shipDataCard(participant); } catch { card = null; }
  return {
    kind: 'ship', id, title: ship.identity.name || 'Ship',
    subtitle: [ship.design?.name, `Type ${ship.design?.typeCode}`].filter(Boolean).join(' \u00b7 '),
    tabs: ['Data card', 'Cargo & crew', 'Finances'],
    card, lines: card ? dataCardLines(card, { programLabel: (key) => COMPUTER_PROGRAMS[key]?.name ?? key }) : [],
    ship: view,
    // Kurt, Sep 2026: editable, because mistakes are made and the referee
    // needs a way to correct them. Not while a fight is writing to the same
    // document, though: the fight's own copy would be overwritten underneath
    // it, so the sheet says why instead.
    editable: true
  };
}

function actorSheet(resolved, id, subsector = null) {
  const actor = (resolved.npcActors ?? []).find((entry) => entry.identity.id === id);
  if (actor) {
    const statblock = actor.profile.kind === 'statblock';
    // v0.267.0: an NPC actor (one person, not a statblock) gets the tabbed
    // sheet a character has: Play, Gear, Profile and Notes. Profile stands
    // where a character's Record does, holding what the referee writes about
    // an NPC. A statblock stays compact (Kurt, Sep 2026).
    if (!statblock) return npcActorSheet(actor, resolved, subsector);
    // v0.302.0: an animal's statblock is its Traveller Book statline.
    if (actor.animal) {
      return {
        kind: 'actor', id, statblock: true, compactOnly: true, editable: true,
        title: actor.identity.name, subtitle: 'Animal',
        animal: animalSheetView(actor), folder: actor.profile.folder, numberTokens: actor.profile.numberTokens,
        behaviour: animalState(resolved.campaign).pending?.actorId === id ? animalState(resolved.campaign).pending.behaviour ?? null : null
      };
    }
    return {
      reaction: reactionView(resolved, `actor:${id}`, actor.identity.name),
      kind: 'actor', id, statblock,
      title: actor.identity.name,
      subtitle: statblock ? 'Statblock' : [actor.profile.role, actor.profile.faction].filter(Boolean).join(' \u00b7 ') || 'Actor',
      upp: actor.upp,
      characteristics: { ...actor.characteristics },
      current: { ...actor.current },
      skills: Object.entries(actor.skills ?? {}).map(([name, level]) => `${name}-${level}`),
      weaponKey: actor.loadout?.weaponKey ?? null,
      weaponName: actor.loadout?.weaponKey ? getPersonalWeapon(actor.loadout.weaponKey)?.name ?? actor.loadout.weaponKey : null,
      armor: actor.loadout?.armor ?? 'none',
      folder: actor.profile.folder,
      numberTokens: actor.profile.numberTokens,
      notes: actor.notes?.referee ?? '',
      // A statblock has no "full" form to switch to: its compact sheet is
      // the whole of it, and every field on it is editable.
      compactOnly: statblock,
      // Book 1's carried weapons only: claws, teeth and hooves are an
      // animal's own and belong to Book 3's encounter tables, not to a
      // dropdown a referee arms a bandit from.
      weaponChoices: taggedWeaponChoices({ skills: actor.skills, playerCharacter: false }, Object.entries(PERSONAL_WEAPONS).filter(([, weapon]) => !weapon.naturalWeapon).map(([key, weapon]) => ({ key, name: weapon.name }))),
      // v0.270.0: what the weapon in hand means for the throw.
      weaponTag: weaponExpertiseTag({ skills: actor.skills, playerCharacter: false }, actor.loadout?.weaponKey),
      armorChoices: [...PERSONAL_ARMOR_TYPES],
      editable: true
    };
  }
  const character = (resolved.characters ?? []).find((entry) => entry.identity.id === id);
  if (!character) return null;
  // v0.250.0: the full character sheet, built for play rather than as a
  // facsimile of TAS Form 2. Four tabs in the order they get opened, and a
  // band of vitals above them that never scrolls away. Form 2's own content
  // is the Record tab; Form 2 itself is the print view of the same fields.
  const view = characterSheetVitals(character, resolved, subsector);
  const record = { ...emptyCharacterRecord(), ...(character.record ?? {}) };
  // v0.263.0: each skill carries Book 1's guide to it — a short tagline, a
  // paraphrase, the page, and the DM Book 1 actually gives per level (it is
  // not always the level: Administration +2, Vacc Suit +4).
  const weaponNames = Object.values(PERSONAL_WEAPONS).map((spec) => spec.name);
  const skills = Object.entries(character.skills ?? {})
    .map(([name, level]) => {
      const guide = skillGuide(name, { weaponNames });
      return { name, level, label: `${name}-${level}`, dm: skillDM(name, level, { weaponNames }), tagline: guide.tagline, summary: guide.summary, page: guide.page, weapon: Boolean(guide.weapon) };
    })
    .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
  return {
    kind: 'actor', id, statblock: false, character: true,
    title: character.identity.name || '(unnamed)',
    subtitle: [(() => {
      const service = SERVICE_NAMES[character.career?.service] ?? sentenceCase(String(character.career?.service ?? ''));
      return character.status?.retired ? `Retired ${service}` : service;
    })(),
      character.career?.terms ? `${character.career.terms} terms` : null,
      `age ${character.age}`].filter(Boolean).join(' \u00b7 '),
    tabs: ['Play', 'Gear', 'Record', 'Notes'],
    upp: character.upp,
    characteristics: { ...character.characteristics },
    current: { ...character.current },
    // Book 1 p.33: an encumbered character counts one less on all three
    // physical characteristics, so the band shows what is being played with,
    // not only what was rolled.
    effective: view.effective,
    aging: view.aging,
    skills,
    weaponKey: character.loadout?.weaponKey ?? null,
    weaponName: character.loadout?.weaponKey ? getPersonalWeapon(character.loadout.weaponKey)?.name ?? character.loadout.weaponKey : null,
    armor: character.loadout?.armor ?? 'none',
    weaponChoices: taggedWeaponChoices({ skills: character.skills, playerCharacter: true }, Object.entries(PERSONAL_WEAPONS).filter(([, weapon]) => !weapon.naturalWeapon).map(([key, weapon]) => ({ key, name: weapon.name }))),
    // v0.270.0: what the weapon in hand means for the throw.
    weaponTag: weaponExpertiseTag({ skills: character.skills, playerCharacter: true }, character.loadout?.weaponKey),
    armorChoices: [...PERSONAL_ARMOR_TYPES],
    age: character.age,
    cashCr: character.finances?.credits ?? 0,
    inventory: view.inventory,
    load: view.load,
    entitlements: view.entitlements,
    record,
    // v0.279.0: the service history generation produced — service, terms,
    // rank, retirement, the title SOC gives, and the term-by-term events —
    // which the old player page showed and the new sheet had left to the
    // printed form (Kurt, Sep 2026).
    service: {
      key: character.career?.service ?? null,
      drafted: Boolean(character.career?.drafted),
      terms: character.career?.terms ?? 0,
      years: character.career?.yearsServed ?? null,
      rankTitle: character.career?.rankTitle || null,
      separation: character.career?.separationReason ?? null,
      retired: Boolean(character.status?.retired),
      retirementPayAnnual: character.finances?.retirementPayAnnual ?? 0,
      soc: character.characteristics?.SOC ?? null
    },
    history: Array.isArray(character.history) ? character.history : [],
    notes: character.notes ?? '',
    // v0.261.0: Book 1 p.31's recovery on the sheet.
    condition: {
      wounded: characterIsWounded(character),
      severe: Boolean(character.status?.severelyWounded),
      dead: character.status?.alive === false,
      // v0.296.0: NPC actors with Medical may attend a character too; and a
      // medical kit is noticed in anyone's gear (the referee may still say).
      medics: [...(resolved.characters ?? []), ...(resolved.npcActors ?? []).filter((entry) => entry.profile?.kind !== 'statblock')]
        .filter((entry) => entry.status?.alive !== false && entry.state?.lifeState !== 'dead' && String(entry.identity.name ?? '').trim())
        .map((entry) => ({ id: entry.identity.id, name: entry.identity.name, level: Object.hasOwn(entry.skills ?? {}, 'Medical') ? Number(entry.skills.Medical) : null }))
        .sort((a, b) => (b.level ?? -1) - (a.level ?? -1)),
      kitSeen: medicalKitSeen(resolved)
    },
    compactOnly: false,
    editable: true
  };
}

// v0.270.0: what a combatant's expertise with a weapon means for the throw,
// in the words the sheet and the fight table show. The engine decides it
// (personalWeaponExpertise): Book 1 p.33 gives every player character ½ in
// every weapon, enough to avoid the untrained -5 but no DM; anyone else with
// no entry for the weapon is untrained and takes -5 on the attack. A brawling
// or blade weapon held untrained — or a long gun, parried with as a cudgel,
// with no cudgel expertise — also gives an attacker +3 in melee (Kurt's
// ruling, untrainedDefenderDM). Only the untrained cases warn.
export function weaponExpertiseTag({ skills = {}, playerCharacter = false } = {}, weaponKey) {
  let spec;
  try { spec = getPersonalWeapon(weaponKey); } catch { return null; }
  if (spec.naturalWeapon || weaponKey === 'hands') return null;
  const who = { skills, playerCharacter };
  const expertise = personalWeaponExpertise(who, weaponKey);
  const level = Math.floor(expertise);
  const skill = spec.skillNames.find((name) => Object.hasOwn(skills ?? {}, name)) ?? null;
  const untrained = expertise < PERSONAL_EXPERTISE_FLOOR;
  const parryUntrained = spec.parry
    ? untrained
    : LONG_GUN_PARRY_KEYS.includes(weaponKey) && personalWeaponExpertise(who, 'cudgel') < PERSONAL_EXPERTISE_FLOOR;
  const exposed = parryUntrained;
  let text;
  let title;
  if (untrained) {
    text = 'untrained \u22125';
    title = `No expertise in the ${spec.name.toLowerCase()}: \u22125 on every attack with it (Book 1, Untrained Weapons Usage).`;
  } else if (level >= 1) {
    text = `${skill ?? spec.skillNames[0]}-${level} (+${level})`;
    title = `${skill}-${level}: +${level} on the attack.`;
  } else {
    text = skill ? `${skill}-0, no DM` : 'expertise-0, no DM';
    title = skill
      ? `${skill}-0: familiar with it, so no untrained penalty, but no DM.`
      : 'Every player character has expertise-0 in every weapon (The Traveller Book; \u00bd in the 1977 Book 1): no untrained penalty, but no DM.';
  }
  if (exposed) {
    text += spec.parry ? '; foes +3 in melee' : '; foes +3 in melee (no cudgel)';
    title += spec.parry
      ? ' Held untrained, it gives anyone attacking with a brawling or blade weapon +3 (Book 1 p.33, Graycloak ruling).'
      : ' Parried with as a cudgel, and nobody here has cudgel expertise: an attacker with a brawling or blade weapon gets +3.';
  }
  // The fight table's column is narrow: there only what changes the throw.
  const short = [untrained ? 'untrained \u22125' : level >= 1 ? `+${level}` : null, exposed ? 'foes +3 in melee' : null].filter(Boolean).join(', ');
  // Red only where it costs something every time it matters: an untrained
  // attack, or a blade held untrained. A gun's cudgel parry is shown, but
  // quietly, since it counts only if someone closes to melee.
  return { level, untrained, exposed, warn: untrained || (exposed && Boolean(spec.parry)), text, short, title };
}

// A weapon's name with what it means in this combatant's hands.
// The Traveller Book p.92: an animal's weapon as the table prints it, "teeth+1",
// "as pike".
const AS_WEAPON_KEYS = new Set(['blade', 'pike', 'broadsword', 'body-pistol']);
export function animalWeaponName(key, dm = 0) {
  let name = key;
  try { name = getPersonalWeapon(key).name.toLowerCase(); } catch { /* raw key */ }
  return `${AS_WEAPON_KEYS.has(key) ? 'as ' : ''}${name}${dm ? `+${dm}` : ''}`;
}

function taggedWeaponChoices(who, choices) {
  return choices.map((choice) => {
    const tag = weaponExpertiseTag(who, choice.key);
    return tag ? { ...choice, baseName: choice.name, name: `${choice.name} \u2014 ${tag.text}`, tag } : choice;
  });
}

// v0.296.0: is there a medical kit in anyone's gear? A hint for the
// referee, who has the last word on what is at hand.
function medicalKitSeen(resolved) {
  const kit = /\bmed(ical)?[\s-]*kit\b|\bmedkit\b|\bfirst[\s-]*aid\b/i;
  return [...(resolved.characters ?? []), ...(resolved.npcActors ?? [])]
    .some((entry) => (entry.inventory ?? []).some((item) => kit.test(String(item.name ?? ''))));
}

function sheetSkills(skillsByName) {
  const weaponNames = Object.values(PERSONAL_WEAPONS).map((spec) => spec.name);
  return Object.entries(skillsByName ?? {})
    .map(([name, level]) => {
      const guide = skillGuide(name, { weaponNames });
      return { name, level, label: `${name}-${level}`, dm: skillDM(name, level, { weaponNames }), tagline: guide.tagline, summary: guide.summary, page: guide.page, weapon: Boolean(guide.weapon) };
    })
    .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
}

function npcActorSheet(actor, resolved, subsector) {
  const gravityFactor = currentGravityFactor(resolved, subsector);
  const inventory = actor.inventory ?? [];
  const load = assessLoad({ strength: actor.characteristics.STR, loadGrams: inventoryLoadGrams(inventory), military: false, gravityFactor });
  const effective = {};
  // v0.272.0: the fight takes Book 1 p.33's penalty off an NPC's scores now,
  // so the band shows what it will fight with, as a character's does.
  const penalty = load.characteristicDM ?? 0;
  for (const key of ['STR', 'DEX', 'END']) {
    const now = Number(actor.current?.[key] ?? actor.characteristics[key] ?? 0);
    effective[key] = { now, full: Number(actor.characteristics[key] ?? 0), played: Math.max(0, now + penalty) };
  }
  for (const key of ['INT', 'EDU', 'SOC']) {
    const score = Number(actor.characteristics[key] ?? 0);
    effective[key] = { now: score, full: score, played: score };
  }
  return {
    kind: 'actor', id: actor.identity.id, statblock: false, character: false, npc: true,
    reaction: reactionView(resolved, `actor:${actor.identity.id}`, actor.identity.name),
    title: actor.identity.name,
    subtitle: [actor.profile.role, actor.profile.faction].filter(Boolean).join(' \u00b7 ') || 'Actor',
    tabs: ['Play', 'Gear', 'Profile', 'Notes'],
    upp: actor.upp,
    characteristics: { ...actor.characteristics },
    current: { ...actor.current },
    effective,
    aging: { age: actor.profile.age, nextCheckAge: null, modifierMonths: 0 },
    skills: sheetSkills(actor.skills),
    skillsText: Object.entries(actor.skills ?? {}).map(([name, level]) => `${name}-${level}`).join(', '),
    weaponKey: actor.loadout?.weaponKey ?? null,
    weaponName: actor.loadout?.weaponKey ? getPersonalWeapon(actor.loadout.weaponKey)?.name ?? actor.loadout.weaponKey : null,
    armor: actor.loadout?.armor ?? 'none',
    weaponChoices: taggedWeaponChoices({ skills: actor.skills, playerCharacter: false }, Object.entries(PERSONAL_WEAPONS).filter(([, weapon]) => !weapon.naturalWeapon).map(([key, weapon]) => ({ key, name: weapon.name }))),
    // v0.270.0: what the weapon in hand means for the throw.
    weaponTag: weaponExpertiseTag({ skills: actor.skills, playerCharacter: false }, actor.loadout?.weaponKey),
    armorChoices: [...PERSONAL_ARMOR_TYPES],
    cashCr: actor.finances?.credits ?? 0,
    inventory: inventory.map((item) => ({
      id: item.id, name: item.name, quantity: item.quantity, carried: item.carried,
      counts: item.countsTowardLoad, weightGrams: item.weightGrams, weaponKey: item.weaponKey ?? null,
      totalGrams: item.countsTowardLoad && item.carried ? item.weightGrams * item.quantity : 0
    })),
    load: {
      state: load.state, penalty: load.characteristicDM ?? 0, military: false,
      loadGrams: load.loadGrams, normalGrams: load.normalGrams, doubleGrams: load.doubleGrams, tripleGrams: load.tripleGrams,
      gravityFactor, multiplier: load.multiplier, words: LOAD_WORDS[load.state]
    },
    entitlements: [],
    // v0.271.0: the same condition block a character's Play tab has.
    condition: {
      wounded: npcActorIsWounded(actor),
      severe: npcActorIsSeverelyWounded(actor),
      dead: npcActorIsDead(actor),
      medics: [...(resolved.characters ?? []), ...(resolved.npcActors ?? []).filter((entry) => entry.profile?.kind !== 'statblock' && entry.identity.id !== actor.identity.id)]
        .filter((entry) => entry.status?.alive !== false && entry.state?.lifeState !== 'dead' && String(entry.identity.name ?? '').trim())
        .map((entry) => ({ id: entry.identity.id, name: entry.identity.name, level: Object.hasOwn(entry.skills ?? {}, 'Medical') ? Number(entry.skills.Medical) : null }))
        .sort((a, b) => (b.level ?? -1) - (a.level ?? -1)),
      kitSeen: medicalKitSeen(resolved),
      // v0.298.0: xeno-medicine, from the NPC's species.
      nonHuman: npcActorIsNonHuman(actor)
    },
    profile: {
      folder: actor.profile.folder, role: actor.profile.role, faction: actor.profile.faction,
      homeworld: actor.profile.homeworld, age: actor.profile.age
    },
    folder: actor.profile.folder,
    numberTokens: actor.profile.numberTokens,
    notes: actor.notes?.referee ?? '',
    publicNotes: actor.notes?.public ?? '',
    compactOnly: false,
    editable: true
  };
}

// The vitals and the load, worked out once for whichever tab is showing.
// Separate from characterView above, which is the player column's model.
function characterSheetVitals(character, resolved, subsector) {
  const gravityFactor = currentGravityFactor(resolved, subsector);
  const load = characterLoad(character, { gravityFactor });
  const penalty = load.characteristicDM ?? 0;
  const current = character.current ?? {};
  const effective = {};
  for (const key of ['STR', 'DEX', 'END']) {
    const now = Number(current[key] ?? character.characteristics[key] ?? 0);
    effective[key] = { now, full: Number(character.characteristics[key] ?? 0), played: Math.max(0, now + penalty) };
  }
  for (const key of ['INT', 'EDU', 'SOC']) {
    const score = Number(character.characteristics[key] ?? 0);
    effective[key] = { now: score, full: score, played: score };
  }
  const months = character.chronology ?? {};
  return {
    effective,
    aging: {
      age: character.age,
      nextCheckAge: months.nextAgingCheckAgeMonths ? Math.floor(months.nextAgingCheckAgeMonths / 12) : null,
      // The gap the app already tracks: anagathics push it one way, a low
      // berth the other. Field 7 of TAS Form 2 asks for exactly this.
      modifierMonths: Number(months.chronologicalAgeMonths ?? 0) - Number(months.physicalAgeMonths ?? 0)
    },
    inventory: (character.inventory ?? []).map((item) => ({
      id: item.id, name: item.name, quantity: item.quantity, carried: item.carried,
      counts: item.countsTowardLoad, weightGrams: item.weightGrams,
      totalGrams: item.countsTowardLoad && item.carried ? item.weightGrams * item.quantity : 0
    })),
    load: {
      state: load.state, penalty, military: Boolean(load.military),
      loadGrams: load.loadGrams, normalGrams: load.normalGrams, doubleGrams: load.doubleGrams, tripleGrams: load.tripleGrams,
      gravityFactor, multiplier: load.multiplier,
      words: LOAD_WORDS[load.state]
    },
    entitlements: [
      // benefits.passages holds objects, not strings: a bare String() of one
      // reads "[object Object]" on the sheet.
      // benefits.passages holds { name, count }, not strings: a bare String()
      // of one reads "[object Object]" on the sheet.
      ...(character.benefits?.passages ?? []).map((entry) => (typeof entry === 'string'
        ? entry
        : `${entry.name}${Number(entry.count ?? 1) > 1 ? ` \u00d7${entry.count}` : ''}`)),
      ...(character.shipRefs ?? []).map((ref) => `${ref.shipType || 'Ship'} \u2014 ${ref.shipName || ref.shipId} (${ref.relationship})`),
      character.finances?.retirementPayAnnual ? `Retirement pay Cr ${character.finances.retirementPayAnnual.toLocaleString('en-US')} a year` : null
    ].filter(Boolean)
  };
}

// Where the party is standing, for Book 1 p.33's gravity adjustment. The
// campaign records its position under `location`, not `position`, and the
// world's size digit comes out of the UWP — which is what buildPlayViewState
// below has always done, so this is the same reading rather than a second
// one. Aboard ship in jump there is no world, and the bands are unadjusted.
function currentGravityFactor(resolved, subsector) {
  const campaign = resolved.campaign;
  const underway = (resolved.ships ?? []).find((entry) => entry.identity.id === campaign.activeShipId)?.state?.operationalStatus === 'in-jump';
  if (underway || !subsector) return null;
  try {
    return parseUniversalWorldProfile(getSubsectorSystem(subsector, campaign.location?.systemId).mainWorld.uwp).size;
  } catch {
    return null;
  }
}

function sceneSheet(resolved, id) {
  const scene = (resolved.scenes ?? []).find((entry) => entry.identity.id === id);
  if (!scene) return null;
  const vector = sceneIsVectorBoard(scene);
  return {
    kind: 'scene', id, title: scene.identity.name,
    subtitle: vector ? `Space \u00b7 ${scene.board.spanThousandMiles}" across` : `Grid \u00b7 ${scene.board.squares} squares \u00b7 ${scene.board.metersPerSquare} m`,
    vector,
    active: resolved.campaign.activeSceneId === scene.identity.id,
    folder: scene.folder,
    tokens: scene.tokens.map((token) => ({ id: token.id, label: token.label, side: token.side })),
    bodies: sceneBodies(scene).map((body) => ({ id: body.id, kind: body.kind, name: body.name })),
    editable: true
  };
}

/** The open sheets, in the order the referee opened them. */
export function sheetViews(resolved, open = [], { subsector = null } = {}) {
  const build = { ship: shipSheet, actor: actorSheet, scene: sceneSheet, animals: (source, id) => animalTableSheet(source, id) };
  return open
    .map((entry) => {
      const sheet = build[entry.kind]?.(resolved, entry.id, subsector) ?? null;
      return sheet ? { ...sheet, compact: sheet.compactOnly || Boolean(entry.compact), tab: entry.tab ?? null, editing: Boolean(entry.editing) } : null;
    })
    .filter(Boolean);
}

// v0.277.0: the player's seat on the play page. A player cannot read the
// campaign, only what the referee publishes for them: the campaign summary
// and their own characters. The sheet is built by the same code as the
// referee's, from a campaign made of that summary, and is read-only: the
// referee's copy is the one that counts.
export function playerSheetViews(envelope, characters = [], open = [], { subsector = null } = {}) {
  const ids = characters.map((entry) => entry.identity.id);
  const campaign = {
    identity: { id: envelope?.campaignId ?? 'campaign', name: envelope?.name ?? '' },
    time: { ...(envelope?.time ?? {}) },
    location: { ...(envelope?.location ?? {}) },
    party: { characterIds: ids },
    activeCharacterId: ids[0] ?? null,
    ownership: { ...(envelope?.ownership ?? {}) },
    roster: { folders: [] },
    documentRefs: { characters: [], ships: [], npcActors: [], encounters: [], scenes: [], activityLogs: [] }
  };
  const resolved = { campaign, characters, npcActors: [], ships: [], encounters: [], scenes: [], activityLogs: [], contracts: [] };
  return sheetViews(resolved, open, { subsector }).map((sheet) => ({ ...sheet, editable: false, playerSeat: true }));
}

// v0.253.0: "2d6+1", "3D", "1d6-2", "2d6+1d6" — the throws Traveller uses.
// Book 1 writes dice as D (2D, 3D); lower-case d is accepted too. Refuses
// anything else by name rather than rolling a guess.
export function rollDiceExpression(expression, dice) {
  const source = String(expression ?? '').replace(/\s+/g, '');
  if (!source) throw new Error('roll what? Try /roll 2D or /roll 2d6+1');
  const terms = source.match(/[+-]?[^+-]+/g) ?? [];
  let total = 0;
  const detail = [];
  for (const raw of terms) {
    const sign = raw.startsWith('-') ? -1 : 1;
    const term = raw.replace(/^[+-]/, '');
    const die = /^(\d*)[dD](\d*)$/.exec(term);
    if (die) {
      const count = Number(die[1] || 1);
      const sides = Number(die[2] || 6);
      if (count < 1 || count > 30 || ![2, 3, 4, 6, 8, 10, 12, 20, 100].includes(sides)) throw new Error(`"${raw}" is not a throw this can make`);
      const rolled = Array.from({ length: count }, () => (sides === 6 ? dice.rollD6() : Math.floor(Math.random() * sides) + 1));
      total += sign * rolled.reduce((sum, value) => sum + value, 0);
      detail.push(`${sign < 0 ? '\u2212' : detail.length ? '+' : ''}[${rolled.join(' ')}]`);
    } else if (/^\d+$/.test(term)) {
      total += sign * Number(term);
      detail.push(`${sign < 0 ? '\u2212' : '+'}${term}`);
    } else {
      throw new Error(`"${raw}" is not a throw this can make`);
    }
  }
  return { expression: source.toUpperCase().replace(/D6/g, 'D'), detail: detail.join(' '), total };
}

// v0.253.0: the chat panel's stream — messages, rolls and notices, oldest
// first, the way a chat reads. A player sees only public entries.
function chatStream(resolved, seat, { limit = 300 } = {}) {
  const log = (resolved.activityLogs ?? [])[0];
  // A token speaks as itself: "Thug 2", not the statblock "Thug" it was
  // placed from. So the fight's own combatants are named here too, by their
  // combatant ids, ahead of the documents behind them.
  const names = new Map([
    ...(resolved.characters ?? []).map((entry) => [entry.identity.id, entry.identity.name]),
    ...(resolved.npcActors ?? []).map((entry) => [entry.identity.id, entry.identity.name]),
    ...(resolved.encounters ?? []).flatMap((encounter) => (encounter.combatants ?? []).map((entry) => [entry.id, entry.name]))
  ]);
  return (log?.entries ?? [])
    .filter((entry) => seat !== 'player' || entry.visibility === 'public')
    .slice(limit ? -limit : 0)
    .map((entry) => {
      const kind = entry.category === 'CHAT' ? 'message' : entry.category === 'ROLL' ? 'roll' : 'notice';
      return {
        id: entry.id,
        kind,
        category: entry.category,
        who: entry.sourceActorId ? names.get(entry.sourceActorId) ?? 'Someone' : 'Referee',
        speakerId: entry.sourceActorId ?? null,
        text: entry.message,
        dateLabel: entry.dateLabel,
        at: entry.createdAt,
        visibility: entry.visibility,
        detail: entry.detail ?? null
      };
    });
}

// v0.256.0: one encounter history entry as a chat line — who did what to
// whom, and the one number that decided it. "Round 2 · Hawkeye hits Thug with
// hands (11 vs 6+): 5 wounds." The dice breakdown stays in the history.
// v0.257.0: the working behind an attack, laid out one DM to a line for the
// hover text: what was thrown, each modifier with its name, the total against
// the target, and what came of it.
export function combatDetail(entry) {
  const d = entry.detail;
  if (!d) return entry.text || null;
  const signed = (value) => `${value >= 0 ? '+' : '\u2212'}${Math.abs(value)}`;
  const lines = [
    `${d.weaponName ?? 'Weapon'} at ${d.range ?? '?'} range against ${({ none: 'no armour', combat: 'battle dress' })[d.armor ?? 'none'] ?? d.armor}`,
    `2D ${(d.dice ?? []).map((die) => `[${die}]`).join(' ')} = ${d.roll}`
  ];
  const parts = [
    ['Skill', d.skillDM], ['Characteristic', d.characteristicDM], ['Untrained', d.untrainedDM],
    ['Defender untrained', d.defenderUntrainedDM], ['Parry', d.parryDM], ['Evasion', d.evasionDM],
    ['Weakened blow', d.fatigueDM], ['Situation', d.situationalDM], ['Defender', d.defenderDM]
  ];
  for (const [label, value] of parts) if (Number(value)) lines.push(`${label} ${signed(Number(value))}`);
  lines.push(`Total ${d.total} against ${d.target}+ \u2014 ${d.success ? 'hit' : 'miss'}`);
  if (d.success) {
    // damageDice is the dice as thrown, not a count of them.
    const thrown = Array.isArray(d.damageDice) ? d.damageDice : [];
    lines.push(`Wounds ${thrown.length}D ${thrown.map((die) => `[${die}]`).join(' ')}${d.damageModifier ? ` ${signed(d.damageModifier)}` : ''} = ${d.woundTotal ?? d.damageTotal}${d.defenderStatus && d.defenderStatus !== 'active' ? `; ${d.defenderStatus}` : ''}`);
  }
  return lines.join('\n');
}

export function conciseCombatLine(entry, round, names = new Map()) {
  const at = `Round ${entry.round ?? round} \u00b7 `;
  const detail = entry.detail ?? null;
  if (entry.kind === 'attack') {
    if (!detail) return entry.text ? at + entry.text : null;
    const attacker = detail.attacker?.name ?? 'Someone';
    const defenderName = names.get(detail.defenderId ?? entry.targetId) ?? 'the target';
    const weapon = String(detail.weaponName ?? 'weapon').toLowerCase();
    const odds = detail.total === null || detail.total === undefined ? '' : ` (${detail.total} vs ${detail.target}+)`;
    if (!detail.success) return `${at}${attacker} misses ${defenderName} with ${weapon}${odds}.`;
    const wounds = Number(detail.woundTotal ?? 0);
    const fell = detail.defenderStatus && detail.defenderStatus !== 'active' ? ` ${defenderName} is ${detail.defenderStatus}.` : '';
    return `${at}${attacker} hits ${defenderName} with ${weapon}${odds}: ${wounds} wound${wounds === 1 ? '' : 's'}.${fell}`;
  }
  if (entry.kind === 'movement' && detail) {
    const name = names.get(entry.actorId) ?? ((entry.text ?? '').split(' ')[0] || 'Someone');
    const verb = { close: 'closes', open: 'opens', evade: 'evades', escape: 'tries to escape' }[detail.movementStatus] ?? 'moves';
    const pace = detail.pace === 'run' ? ' at a run' : '';
    return `${at}${name} ${verb}${pace}${detail.band ? `, now at ${detail.band} range` : ''}.`;
  }
  return entry.text ? at + entry.text : null;
}

// v0.252.1: how a fight that ended by itself came out, in a sentence.
function fightConclusion(encounter) {
  const reason = encounter.outcome?.reason ?? '';
  const winner = encounter.outcome?.winner ?? null;
  const down = encounter.combatants.filter((entry) => entry.status !== 'active');
  const lines = {
    'party-escaped': 'The party escaped.',
    'party-avoided-contact': 'The party used its surprise to avoid the encounter.'
  };
  const headline = lines[reason]
    ?? (winner === 'party' ? 'The opposition is out of the fight.'
      : winner === 'opposition' ? 'The party is out of the fight.'
        : 'The fight is over.');
  return {
    headline,
    winner,
    rounds: Number(encounter.round ?? 1),
    casualties: down.map((entry) => ({ name: entry.name, side: entry.side, status: entry.status }))
  };
}

// Book 1 p.27: "While steps 1 through 3 are executed only once per encounter,
// step 4 is performed cyclically until the combat is concluded."
function encounterStepStrip(fight, resolved, writable) {
  const encounter = (resolved.encounters ?? []).find((entry) => entry.identity.id === fight.situation?.identity?.id)
    ?? (resolved.encounters ?? []).find((entry) => entry.status === 'active')
    ?? null;
  const round = Number(fight.round ?? 1);
  const surpriseSide = encounter?.surprise?.surpriseSideId ?? null;
  const rangeName = fight.setup?.range ?? null;
  // p.28: either party may try to escape "immediately (before any combat or
  // contact occurs)", at 9+ with a DM for the range escaped from; and a party
  // holding surprise "may always avoid an encounter by so stating".
  // The engine throws escape against the band between the escaper and its
  // nearest enemy, not an encounter-wide range, so the strip reads the same
  // pair: the party's nearest foe. One number for the whole party is a
  // simplification the strip makes deliberately — the row's own Needs cell
  // carries the per-combatant figure.
  const party = (fight.fighters ?? []).filter((entry) => entry.side === 'party' && !entry.down);
  const foes = (fight.fighters ?? []).filter((entry) => entry.side !== 'party' && !entry.down);
  let escapeDM = null;
  if (party.length && foes.length) {
    const gap = Math.min(...party.flatMap((mine) => foes.map((foe) => Math.abs(Number(mine.band ?? 0) - Number(foe.band ?? 0)))));
    escapeDM = ESCAPE_RANGE_DMS[rangeBandForBandGap(gap)] ?? 0;
  }
  const escapeOpen = round === 1 && (fight.fighters ?? []).some((entry) => entry.side === 'party' && !entry.down);
  const canAvoid = surpriseSide === 'party' && round === 1;
  return [
    {
      key: 'surprise', number: 1, title: 'Surprise',
      state: 'done',
      detail: surpriseSide === null ? 'Neither party: both aware' : `${surpriseSide === 'party' ? 'The party' : 'The opposition'} \u2014 the other side cannot act`,
      cite: 'Book 1 p.26'
    },
    {
      key: 'range', number: 2, title: 'Range',
      state: 'done',
      detail: rangeName ?? 'Set by the referee',
      cite: 'Book 1 p.27'
    },
    {
      key: 'escape', number: 3, title: 'Escape',
      state: escapeOpen || canAvoid ? 'open' : 'closed',
      detail: escapeOpen
        ? `Throw ${ESCAPE_TARGET}+${escapeDM ? ` at DM ${escapeDM > 0 ? '+' : ''}${escapeDM}` : ''} \u2014 only before contact`
        : 'Gone: only by opening beyond the field now',
      // Escape is declared as a movement on the row (it is one of p.28's four
      // statuses); avoidance is a single statement by a surprising party, so
      // it gets the button.
      action: canAvoid && writable ? { command: 'fight:avoid', label: 'Avoid the encounter' } : null,
      cite: 'Book 1 p.28'
    },
    {
      key: 'round', number: 4, title: 'Declare',
      state: 'open',
      detail: 'Movement, then attack and target',
      cite: 'Book 1 p.28'
    }
  ];
}

// v0.285.0: the Players tab as one list (Kurt, Sep 2026: a seated player was
// hard to find in the old folders, and there was no plain way to remove
// one). The join link, requests waiting, the members with their characters,
// and — the repair pass — party characters whose player no longer has a
// seat, because they left or were never cleaned up.
export function playersModel(resolved, players) {
  const campaign = resolved.campaign;
  const refereeUid = campaign.ownership?.ownerUid ?? null;
  const owners = campaign.ownership?.actors ?? {};
  const characters = resolved.characters ?? [];
  const nameOf = (id) => characters.find((entry) => entry.identity.id === id)?.identity.name || null;
  const fighting = new Set((resolved.encounters ?? [])
    .filter((encounter) => encounter.status === 'active' || encounter.status === 'setup')
    .flatMap((encounter) => (encounter.combatants ?? []).map((entry) => entry.id)));
  const seats = players?.seats ?? [];
  const seated = new Set(seats.map((seat) => seat.uid));
  const charactersOf = (uid) => Object.entries(owners).filter(([id, owner]) => owner === uid && characters.some((entry) => entry.identity.id === id)).map(([id]) => ({ id, name: nameOf(id), fighting: fighting.has(id) }));
  return {
    link: (players?.invites ?? [])[0]?.code ?? null,
    // v0.289.0: players join by link at once unless the referee asks to
    // approve each one.
    approvePlayers: Boolean(campaign.roster?.approvePlayers),
    requests: (players?.joins ?? []).map((join) => ({
      uid: join.uid, name: join.name || join.uid, characterId: join.characterId ?? null,
      characterName: join.characterName ?? join.character?.identity?.name ?? null, code: join.code ?? null
    })),
    members: seats.filter((seat) => seat.uid !== refereeUid).map((seat) => ({
      uid: seat.uid, name: seat.name || seat.uid, seatedAt: seat.seatedAt ?? null, lastSeenAt: seat.lastSeenAt ?? null,
      characters: charactersOf(seat.uid),
      // v0.291.0: seated by their own link, their character still to come in.
      joining: (players?.joins ?? []).find((join) => join.uid === seat.uid) ?? null
    })),
    departed: Object.entries(owners)
      .filter(([id, owner]) => owner && owner !== refereeUid && !seated.has(owner) && characters.some((entry) => entry.identity.id === id))
      .map(([id, owner]) => ({ id, name: nameOf(id), uid: owner, fighting: fighting.has(id) }))
  };
}

export function refereeView(resolved, { tab = 'Journal', folder = '', query = '', players = null, stagingSceneId = null } = {}) {
  const sets = {
    Journal: journalEntries,
    Actors: actorEntries,
    Players: (input) => (players ? seatEntries(input, players) : characterEntries(input)),
    Vehicles: vehicleEntries,
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
    members: tab === 'Players' && players && !players.loading ? playersModel(resolved, players) : null,
    // The Players tab acts on the cloud, not on campaign documents.
    seats: tab === 'Players' && players ? { loading: Boolean(players.loading), error: players.error ?? null } : null,
    // v0.246.0: staging took over the screen (see view() below), so the
    // directory only needs to know which scene is being staged, to label
    // its own button.
    stagingSceneId
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
    chat: chatStream(resolved, seat),

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

export function fightView(encounter, { characters = [], actors = [], concluded = false } = {}) {
  // v0.252.1: a concluded encounter can be drawn too, for the aftermath.
  // v0.254.0: and one being set up, which may have nobody on it yet.
  if (!encounter || (!['active', 'setup'].includes(encounter.status) && !concluded)) return null;
  const byId = new Map(characters.map((entry) => [entry.identity.id, entry]));
  const actorById = new Map(actors.map((entry) => [entry.identity.id, entry]));
  const declared = new Map((encounter.roundState?.declaredActions ?? []).map((entry) => [entry.actorId, entry]));
  const awaiting = new Set(undeclaredCombatantIds(encounter));
  const line = encounter.map?.spatialMode === 'range-line';

  const fighters = encounter.combatants.map((entry) => {
    const order = declared.get(entry.id) ?? null;
    const source = byId.get(entry.sourceActorId ?? entry.id) ?? null;
    // What else this combatant could pick up: carried weapons from the
    // character's own inventory, plus what is in hand and bare hands.
    // v0.267.0: or from an NPC actor's, now that an actor has one.
    const holder = source ?? actorById.get(entry.sourceActorId ?? entry.id) ?? null;
    const carried = (holder?.inventory ?? []).filter((item) => item.carried && item.weaponKey).map((item) => item.weaponKey);
    // v0.302.0: an animal fights only with what it grew.
    const beast = entry.animal ?? null;
    const weapons = beast ? Object.keys(beast.weapons) : [...new Set([entry.weaponKey, ...carried, 'hands'])];
    let weaponLabel = entry.weaponKey;
    try {
      const spec = getPersonalWeapon(entry.weaponKey);
      const modifier = spec.damageModifier ?? 0;
      weaponLabel = beast
        ? (beast.filter ? `Filter ${beast.filter.woundDice}D, close only`
          : `${animalWeaponName(entry.weaponKey, beast.weapons[entry.weaponKey]?.dm)} ${beast.woundMode === 'rolled' ? 'rolled' : beast.weapons[entry.weaponKey]?.wound}`)
        : `${spec.name} ${spec.damageDice}D${modifier ? (modifier > 0 ? `+${modifier}` : `\u2212${Math.abs(modifier)}`) : ''}`;
    } catch { /* an unknown weapon key keeps its raw name */ }
    return {
      id: entry.id,
      name: entry.name,
      weaponLabel,
      armorLabel: entry.armor === 'none' ? 'no armor' : `${entry.armor}${entry.armorDM ? `+${entry.armorDM}` : ''}`,
      armorDM: Number(entry.armorDM ?? 0),
      animal: beast ? {
        type: beast.type, category: beast.category, weightKg: beast.weightKg,
        hits: { ...beast.hits }, woundsTaken: beast.woundsTaken, destroyed: Boolean(beast.destroyed),
        woundMode: beast.woundMode, woundAlteration: beast.woundAlteration ? { ...beast.woundAlteration } : null,
        weapons: JSON.parse(JSON.stringify(beast.weapons)),
        filter: beast.filter ? { ...beast.filter } : null,
        status: entry.status
      } : null,
      tactics: entry.tactics,
      side: entry.side === 'party' ? 'party' : 'foe',
      band: line ? entry.position.column : null,
      playerCharacter: Boolean(entry.playerCharacter),
      full: { ...entry.characteristics },
      characteristics: { ...entry.current },
      armor: entry.armor,
      weaponKey: entry.weaponKey,
      weapons,
      // v0.255.0: what this combatant could fight with instead — carried
      // weapons, the one in hand, and bare hands, each named.
      armorChoices: [...PERSONAL_ARMOR_TYPES],
      // v0.259.0: and what those guns can be swung as — Book 1 classes a
      // pistol used in brawling as a club, and lets an unloaded rifle or
      // carbine serve as a cudgel (never a laser). Named for the gun it is.
      weaponChoices: (() => {
        if (beast) return weapons.map((key) => ({ key, name: animalWeaponName(key, beast.weapons[key]?.dm) }));
        const held = [...new Set([entry.weaponKey, ...carried, 'hands'])].filter(Boolean);
        const named = held.map((key) => { try { return { key, name: getPersonalWeapon(key).name }; } catch { return null; } }).filter(Boolean);
        for (const swung of improvisedMeleeWeapons([...new Set([entry.weaponKey, ...carried])])) {
          if (named.some((choice) => choice.key === swung.key)) continue;
          const gun = (() => { try { return getPersonalWeapon(swung.from).name; } catch { return swung.from; } })();
          named.push({ key: swung.key, name: `${gun}, swung as a ${swung.as}` });
        }
        // v0.270.0: each named with what it means in this combatant's hands.
        return taggedWeaponChoices({ skills: entry.skills, playerCharacter: Boolean(entry.playerCharacter) }, named);
      })(),
      weaponTag: beast ? null : weaponExpertiseTag({ skills: entry.skills, playerCharacter: Boolean(entry.playerCharacter) }, entry.weaponKey),
      skills: { ...entry.skills },
      blowAllowance: entry.blowAllowance,
      // Book 1 p.32: wounds do not reduce the blow allowance during a fight,
      // but they do in subsequent combats — the allowance is the endurance the
      // combatant arrived with. A thug who walked in already hurt therefore has
      // fewer swings than its characteristic suggests, which is worth saying.
      blowsFromWounds: !beast && entry.blowAllowance < entry.characteristics.END,
      // v0.251.0: Book 1 p.33. The scores above are already reduced, so the
      // screen has to say why, or a player sees a DEX they never rolled.
      encumbrance: Number(entry.encumbrance ?? 0),
      rolled: entry.rolled ? { ...entry.rolled } : null,
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
  // v0.272.0: both sides, read by the engine's own rule: the unconscious
  // and the killed count (not the escaped), with every DM that applies.
  const casualties = ['party', 'opposition'].map((side) => {
    const standing = moraleStanding(encounter, side);
    const dms = [
      standing.militaryUnit ? 'military unit +1' : null,
      standing.leaderPresent ? `leader ${standing.leaderName} +1` : null,
      standing.leaderHasTactics ? 'leader\u2019s tactics +1' : null,
      standing.leaderKilled ? 'leader killed \u22122' : null,
      standing.overHalf ? 'casualties over half \u22122' : null,
      standing.refereeDM ? `referee ${standing.refereeDM > 0 ? '+' : '\u2212'}${Math.abs(standing.refereeDM)}` : null
    ].filter(Boolean);
    const total = (standing.militaryUnit ? 1 : 0) + (standing.leaderPresent ? 1 : 0) + (standing.leaderHasTactics ? 1 : 0)
      + (standing.leaderKilled ? -2 : 0) + (standing.overHalf ? -2 : 0) + standing.refereeDM;
    return {
      side: side === 'party' ? 'party' : 'foe',
      out: standing.casualties, of: standing.of, share: standing.share,
      throwing: standing.required && !standing.broken,
      broken: standing.broken,
      militaryUnit: standing.militaryUnit, refereeDM: standing.refereeDM,
      dms, total,
      words: `${side === 'party' ? 'The party' : 'The opposition'} has ${standing.casualties} of ${standing.of} unconscious or killed (${Math.round(standing.share * 100)}%): morale is thrown at the end of each round, 7+ to stand${total ? ` at DM ${total > 0 ? '+' : '\u2212'}${Math.abs(total)}` : ''}${dms.length ? ` (${dms.join(', ')})` : ''}.`
    };
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

// v0.264.0: the Compendium — Book 1's weapons and armour and Book 3's
// equipment, each marked for the world the party is on: whether it can be
// bought here, and whether carrying it breaks the local law.
function currentWorldProfile(resolved, subsector) {
  let system = null;
  try { system = getSubsectorSystem(subsector, resolved.campaign.location?.systemId); } catch { /* off the map, or in jump */ }
  return system ? { system, profile: parseUniversalWorldProfile(system.mainWorld.uwp) } : { system: null, profile: null };
}

// ---- v0.299.0: reactions (Book 3 p.22-23) -------------------------------
// "When an encounter occurs, throw two dice and consult the reaction table."
// Natural 2 and 12 stand; otherwise DMs apply and the result is kept to 3-12.
// General DMs: +1 if the character dealing with them has served 5 or more
// terms in the army, navy, marines or scouts; -1 if the planetary population
// is 9 or greater (The Traveller Book p.101; 1977's 11+ could never apply). "Other DMs can and should be created": Admin or Bribery in
// a deal (Book 3 names both), and the referee's own. One throw for a whole
// group, once, on meeting; thrown again after very bad treatment or an
// unusually dangerous task. The result is the referee's, kept on the campaign.
const MILITARY_REACTION_SERVICES = new Set(['army', 'navy', 'marines', 'scouts']);
export function reactionModifiers({ speaker = null, population = null, deal = false, refereeDM = 0 } = {}) {
  const parts = [];
  if (speaker && MILITARY_REACTION_SERVICES.has(String(speaker.career?.service ?? '').toLowerCase()) && Number(speaker.career?.terms ?? 0) >= 5) {
    parts.push({ label: `${speaker.identity.name}\u2019s ${speaker.career.terms} terms in the ${speaker.career.service}`, dm: REACTION_DMS.fiveOrMoreMilitaryTerms });
  }
  if (Number.isInteger(population) && population >= 9) parts.push({ label: `population ${population}`, dm: REACTION_DMS.planetaryPopulation9Plus });
  if (deal && speaker) {
    const skills = speaker.skills ?? {};
    const admin = Number(skills.Admin ?? skills.Administration ?? 0);
    const bribery = Number(skills.Bribery ?? 0);
    const best = Math.max(admin, bribery);
    if (best > 0) parts.push({ label: `${admin >= bribery ? 'Admin' : 'Bribery'}-${best} in a deal`, dm: best });
  }
  if (Number.isInteger(refereeDM) && refereeDM) parts.push({ label: 'referee', dm: refereeDM });
  return { parts, dm: parts.reduce((sum, part) => sum + part.dm, 0) };
}

// What a sheet or the fight shows: the last throw, and whom the party can
// put forward to deal with them.
function reactionView(resolved, key, label) {
  return {
    key, label,
    current: resolved.campaign.roster?.reactions?.[key] ?? null,
    speakers: (resolved.characters ?? [])
      .filter((entry) => (resolved.campaign.party?.characterIds ?? []).includes(entry.identity.id))
      .map((entry) => ({ id: entry.identity.id, name: entry.identity.name || '(unnamed)' }))
  };
}

function reactionAttackTarget(tableTotal) {
  return tableTotal === 3 ? 5 : tableTotal === 4 ? 8 : null;
}

export function compendiumView(resolved, subsector) {
  const { system, profile } = currentWorldProfile(resolved, subsector);
  const banned = profile ? prohibitedWeaponKeys(profile.lawLevel) : [];
  return {
    world: system ? { name: system.name, techLevel: profile.techLevel, lawLevel: profile.lawLevel } : null,
    packs: CATALOGUE_PACKS.map((pack) => ({
      name: pack,
      entries: CATALOGUE.filter((entry) => entry.pack === pack).map((entry) => ({
        key: entry.key, name: entry.name, group: entry.group, priceCr: entry.priceCr, priceNote: entry.priceNote ?? null,
        // A gun weighs as carried: loaded (Book 1 p.41's weight plus a clip).
        weightGrams: entry.weaponKey ? (PERSONAL_WEAPON_WEIGHTS_GRAMS[entry.weaponKey]?.weapon ?? 0) + (PERSONAL_WEAPON_WEIGHTS_GRAMS[entry.weaponKey]?.ammunition ?? 0) : entry.weightGrams,
        techLevel: entry.techLevel, note: entry.note, page: entry.page,
        kind: entry.weaponKey ? 'weapon' : entry.armourKey ? 'armour' : 'item',
        ...catalogueAvailability(entry, profile, { prohibitedWeaponKeys: banned })
      }))
    }))
  };
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
  // v0.252.1: the encounter that ended by itself this session — every foe
  // down, or the party escaped — and has not been acknowledged yet. Without
  // it the moment the last foe fell the screen snapped back to the port call
  // with one line of notice, and the referee never saw how it ended.
  let concludedEncounterId = null;
  // v0.232.0: a successful merchant hail on arrival (Book 2 p.36) earns a
  // one-time broker's tip on the next speculative resale quote made at that
  // same system. Not persisted, same as the arrival encounter and ship
  // fight above: a reload forgets it, the same as the referee letting the
  // moment pass.
  let pendingBrokerTip = null;
  const liveEncounter = () => (resolved.encounters ?? []).find((entry) => entry.status === 'active') ?? null;
  // v0.254.0: a fight being set up by hand — the board is open, tokens are
  // being dragged on, nobody has thrown for surprise yet.
  const setupEncounter = () => (resolved.encounters ?? []).find((entry) => entry.status === 'setup') ?? null;

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

  // v0.275.0: Kurt's ruling on medical attention (Sep 2026) — it takes the
  // medic's day, not each patient's. The first attempt of a day moves the
  // clock one day; attempts on other patients that same day do not. Trying
  // the same patient again is the next day's work, so it moves the clock
  // again. The campaign keeps the date that day of treatment ends on and who
  // was treated; any other movement of the clock leaves it behind.
  // v0.296.0: who attends, and what is at hand — the referee's call on the
  // kit and the facility ("a medical facility could be anywhere").
  function attendance(value = {}) {
    const medicId = value?.medicId ?? null;
    const medic = medicId ? [...(resolved.characters ?? []), ...(resolved.npcActors ?? [])].find((entry) => entry.identity.id === medicId) ?? null : null;
    const level = medic && Object.hasOwn(medic.skills ?? {}, 'Medical') ? Number(medic.skills.Medical) : null;
    return { medic, level, kit: Boolean(value?.kit), facility: Boolean(value?.facility), xeno: Boolean(value?.xeno) };
  }
  function treatedLine(medic, level, patientName, serious, sameDay, xeno = false) {
    return `${medic?.identity.name ?? 'Someone'} (Medical-${level}${xeno ? `, Medical-${level - 2} for a non-human` : ''}) treats ${patientName}${serious ? ' in a medical facility' : ' with a medical kit'}: back to full strength (Book 1, 1981).${sameDay ? ' (Same day of treatment: the clock does not move.)' : ''}`;
  }

  function treatmentDay(campaign, patientId) {
    const marker = campaign.roster?.treatingUntil ?? null;
    const today = marker && marker.year === campaign.time.year && marker.dayOfYear === campaign.time.dayOfYear;
    const seen = today && Array.isArray(marker.patients) && marker.patients.includes(patientId);
    if (today && !seen) {
      return { campaign: { ...campaign, roster: { ...campaign.roster, treatingUntil: { ...marker, patients: [...(marker.patients ?? []), patientId] } } }, sameDay: true };
    }
    const moved = advanceCampaignDays(campaign, 1);
    const next = { ...moved, roster: { ...moved.roster, treatingUntil: { year: moved.time.year, dayOfYear: moved.time.dayOfYear, patients: [patientId] } } };
    return { campaign: next, sameDay: false };
  }

  // v0.261.0: a personal fight's wounds reach the characters. Until now they
  // lived only on the encounter's copy of each combatant: Book 1 p.31's
  // waking-up rule was applied to that copy when the fight ended and went no
  // further, so a character walked out of every fight at full strength.
  //
  // The combatant's scores carry Book 1 p.33's encumbrance penalty (v0.251.0),
  // which belongs to the fight, not the body, so it is taken back off. A
  // characteristic still at zero stays at zero: the dead stay dead.
  // v0.275.0: who could rest now — the party's wounded, and NPC actors'
  // (statblocks are patterns and are never hurt). The severely wounded and
  // the dead are listed with the reason they cannot.
  function restCandidates() {
    const party = new Set(resolved.campaign.party?.characterIds ?? []);
    const out = [];
    for (const character of resolved.characters ?? []) {
      const severe = Boolean(character.status?.severelyWounded);
      const dead = character.status?.alive === false;
      if (!characterIsWounded(character) && !severe) continue;
      out.push({ id: character.identity.id, name: character.identity.name || '(unnamed)', kind: 'character', inParty: party.has(character.identity.id),
        canRest: !severe && !dead, why: dead ? 'dead' : severe ? 'severely wounded: medical attention only' : null });
    }
    for (const actor of resolved.npcActors ?? []) {
      if (actor.profile?.kind === 'statblock') continue;
      const severe = npcActorIsSeverelyWounded(actor);
      const dead = npcActorIsDead(actor);
      if (!npcActorIsWounded(actor) && !severe) continue;
      out.push({ id: actor.identity.id, name: actor.identity.name, kind: 'actor', inParty: false,
        canRest: !severe && !dead, why: dead ? 'dead' : severe ? 'severely wounded: medical attention only' : null });
    }
    return out;
  }

  // Everyone named rests together; the clock moves once. Returns who rested
  // and who could not, and why.
  function restTogether(ids, campaign) {
    const wanted = new Set(ids);
    const changed = [];
    const rested = [];
    const skipped = [];
    for (const character of resolved.characters ?? []) {
      if (!wanted.has(character.identity.id)) continue;
      try { changed.push(restCharacter(character)); rested.push(character.identity.name || '(unnamed)'); }
      catch (error) { skipped.push(`${character.identity.name || '(unnamed)'}: ${error.message.replace(`${character.identity.name} `, '')}`); }
    }
    for (const actor of resolved.npcActors ?? []) {
      if (!wanted.has(actor.identity.id)) continue;
      try { changed.push(restNpcActor(actor)); rested.push(actor.identity.name); }
      catch (error) { skipped.push(`${actor.identity.name}: ${error.message.replace(`${actor.identity.name} `, '')}`); }
    }
    return { changed, rested, skipped, campaign };
  }

  function writeFightToCharacters(encounter) {
    if (!encounter || encounter.status === 'active' || encounter.status === 'setup') return [];
    const changed = [];
    for (const combatant of encounter.combatants ?? []) {
      // v0.271.0: an actor (one person) keeps its wounds too. A statblock's
      // copies are the pattern's, not the pattern itself, and are not.
      if (!combatant.playerCharacter) {
        const actor = (resolved.npcActors ?? []).find((entry) => entry.identity.id === combatant.sourceActorId);
        if (!actor || actor.profile?.kind === 'statblock' || combatant.copyNumber !== undefined && combatant.copyNumber !== null) continue;
        // v0.272.0: the load's penalty belongs to the fight, as a
        // character's does; a score still at zero stays at zero.
        const penalty = Number(combatant.encumbrance ?? 0);
        const current = {};
        for (const key of ['STR', 'DEX', 'END']) {
          const inFight = Number(combatant.current?.[key] ?? 0);
          current[key] = inFight <= 0 ? 0 : Math.max(0, Math.min(actor.characteristics[key], inFight - penalty));
        }
        const zeros = ['STR', 'DEX', 'END'].filter((key) => current[key] <= 0).length;
        const dead = zeros >= 3 || combatant.status === 'dead';
        const severe = Boolean(combatant.severelyWounded) || (!dead && zeros >= 2);
        const same = ['STR', 'DEX', 'END'].every((key) => current[key] === actor.current[key]);
        if (same && !dead && !severe) continue;
        changed.push(recordNpcActorWounds(actor, { current, dead, severe }));
        continue;
      }
      const character = (resolved.characters ?? []).find((entry) => entry.identity.id === combatant.id);
      if (!character) continue;
      const penalty = Number(combatant.encumbrance ?? 0);
      const current = {};
      for (const key of ['STR', 'DEX', 'END']) {
        const inFight = Number(combatant.current?.[key] ?? 0);
        current[key] = inFight <= 0 ? 0 : Math.max(0, Math.min(character.characteristics[key], inFight - penalty));
      }
      const zeros = ['STR', 'DEX', 'END'].filter((key) => current[key] <= 0).length;
      // Severe (two zeros, p.31) is marked by the recovery that woke him.
      const wasSevere = Boolean(combatant.severelyWounded);
      const dead = zeros >= 3 || combatant.status === 'dead';
      const same = ['STR', 'DEX', 'END'].every((key) => current[key] === character.current[key]);
      if (same && !dead && !wasSevere) continue;
      changed.push(updateCharacterGameplayState(character, {
        current,
        alive: !dead,
        // By the time the fight is over the unconscious have woken (p.31: ten
        // minutes, or three hours if severely wounded).
        consciousness: dead ? 'not-applicable' : 'conscious',
        severelyWounded: !dead && wasSevere ? true : undefined
      }));
    }
    return changed;
  }

  function log(category, message, extra = {}) {
    let { campaign } = resolved;
    let document = resolved.activityLogs[0] ?? null;
    if (!document) {
      document = createActivityLogDocument({ campaign });
      campaign = addActivityLogToCampaign(campaign, document);
      registry.put(campaign);
    }
    registry.put(appendActivityLogEntry(document, { category, message, dateLabel: formatCampaignDate(campaign.time), ...extra }));
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
        // v0.295.0: publish once on opening, so the players' copy of the
        // campaign (who owns what, which characters are in it) is current
        // even if nothing changes this visit — an old envelope had kept a
        // removed character as owned.
        setTimeout(() => { saveToCloud(); }, 0);
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

  // v0.282.0: the session object, so the save can ask its own view for the
  // ship fight players are shown.
  let api = null;
  const publishedSheets = new Map();
  // v0.276.0: the rest of what players read and write, which only the
  // referee client handled. The fight as players see it, each player's log,
  // and — once a round has moved on — their spent declarations and wound
  // answers cleared away. Each written only when it changed; a failure is
  // reported to the console and never stops the referee's save.
  const publishedViews = new Map();
  const publishedLogs = new Map();
  const settledRounds = new Map();
  async function publishForPlayers(campaign, uid) {
    const owners = Object.entries(campaign.ownership?.actors ?? {}).filter(([, owner]) => owner && owner !== uid);
    if (typeof cloud.publishEncounterView === 'function') {
      for (const encounter of resolved.encounters ?? []) {
        const live = encounter.status === 'active' || encounter.status === 'setup';
        const current = campaign.currentEncounterId === encounter.identity.id || live;
        if (!current && !publishedViews.has(encounter.identity.id)) continue;
        try {
          const view = withPlayerWeapons(encounter, buildPublishedView(encounter, { campaignId, publishedAt: 0 }));
          const key = JSON.stringify(view);
          if (publishedViews.get(encounter.identity.id) !== key) {
            await cloud.publishEncounterView({ ...view, publishedAt: Date.now() });
            publishedViews.set(encounter.identity.id, key);
          }
        } catch (error) { console.warn('[traveller] fight view:', encounter.identity.id, error?.code ?? error); }
        // A round (or the fight) moved on: the declarations and wound answers
        // players wrote for it are spent.
        const was = settledRounds.get(encounter.identity.id);
        const now = `${encounter.round}|${encounter.status}`;
        if (was !== undefined && was !== now) {
          cloud.clearDeclarations?.(campaignId, encounter.identity.id)?.catch?.((error) => console.warn('[traveller] declarations:', error?.code ?? error));
          cloud.clearWoundAllocations?.(campaignId, encounter.identity.id)?.catch?.((error) => console.warn('[traveller] wound answers:', error?.code ?? error));
        }
        settledRounds.set(encounter.identity.id, now);
      }
    }
    const logDocument = resolved.activityLogs?.[0] ?? null;
    if (logDocument && typeof cloud.publishPlayerLog === 'function') {
      const byUid = new Map();
      for (const [characterId, owner] of owners) byUid.set(owner, [...(byUid.get(owner) ?? []), characterId]);
      for (const [owner, ownedCharacterIds] of byUid) {
        try {
          const published = buildPublishedLog(logDocument, { campaignId, uid: owner, ownedCharacterIds, publishedAt: 0 });
          const key = `${published.entries.length}|${published.entries.at(-1)?.id ?? ''}`;
          if (publishedLogs.get(owner) === key) continue;
          await cloud.publishPlayerLog({ ...published, publishedAt: Date.now() });
          publishedLogs.set(owner, key);
        } catch (error) { console.warn('[traveller] player log:', owner, error?.code ?? error); }
      }
    }
  }

  // v0.283.0: each player character's weapon in hand and what it could take
  // up instead, so a player's order can change it. Only the party's own
  // characters: an enemy's weapon is for the players to find out.
  function withPlayerWeapons(encounter, view) {
    let fighters = [];
    try { fighters = fightView(encounter, { characters: resolved.characters ?? [], actors: resolved.npcActors ?? [] })?.fighters ?? []; } catch { fighters = []; }
    return {
      ...view,
      combatants: view.combatants.map((combatant) => {
        if (!combatant.playerCharacter) return combatant;
        const fighter = fighters.find((entry) => entry.id === combatant.id);
        if (!fighter) return combatant;
        return {
          ...combatant,
          weaponKey: fighter.weaponKey ?? null,
          weaponChoices: (fighter.weaponChoices ?? []).map((choice) => ({ key: choice.key, name: choice.baseName ?? choice.name, tag: choice.tag?.short ?? '' }))
        };
      })
    };
  }

  // v0.276.0: what players write, read back and applied as the referee's own
  // commands, after the same checks the referee client made (the player owns
  // the combatant, it is this round, the target is on the other side).
  // Returns the refusals, for the page to report.
  const appliedDeclarations = new Set();
  function applyPlayerDeclarations(entries = []) {
    const refusals = [];
    let encounter = (resolved.encounters ?? []).find((entry) => entry.status === 'active') ?? null;
    if (!encounter) return refusals;
    let changed = false;
    for (const entry of entries) {
      const key = `${encounter.identity.id}|${entry.round}|${entry.actorId}`;
      if (appliedDeclarations.has(key) || entry.round !== encounter.round) continue;
      appliedDeclarations.add(key);
      changed = true;
      try {
        const authorized = authorizePlayerDeclaration(entry, { campaign: resolved.campaign, encounter });
        // v0.283.0: the weapon first, if the player changed it — only one
        // their character could take up (the referee's own weapon column's
        // choices: what they carry, hands, a gun swung as a club).
        const combatant = encounter.combatants.find((candidate) => candidate.id === authorized.actorId);
        if (authorized.weaponKey && authorized.weaponKey !== combatant?.weaponKey) {
          const choices = fightView(encounter, { characters: resolved.characters ?? [], actors: resolved.npcActors ?? [] })
            ?.fighters.find((fighter) => fighter.id === authorized.actorId)?.weaponChoices ?? [];
          if (!choices.some((choice) => choice.key === authorized.weaponKey)) throw new Error(`${combatant?.name ?? 'That character'} has no ${authorized.weaponKey} to take up`);
          const armed = setCombatantWeapon(encounter, { combatantId: authorized.actorId, weaponKey: authorized.weaponKey });
          persist([armed.encounter]);
          encounter = armed.encounter;
          if (armed.entry) log('COMBAT', armed.entry.text);
        }
        const result = declareEncounterAction(encounter, { action: authorized.action, actorId: authorized.actorId, targetId: authorized.targetId });
        persist([result.encounter]);
        encounter = result.encounter;
        const actor = encounter.combatants.find((combatant) => combatant.id === entry.actorId);
        log('COMBAT', `${actor?.name ?? 'A player'} declares ${String(authorized.action).replace('-', ' at a ')} from their own screen.`);
      } catch (error) {
        refusals.push({ uid: entry.uid, message: `Your order was refused: ${error?.message ?? error}` });
      }
    }
    for (const refusal of refusals) tellPlayer(refusal);
    if (changed) { onChange(); saveToCloud(); }
    return refusals;
  }

  function applyPlayerWoundAllocations(entries = []) {
    const refusals = [];
    const encounter = (resolved.encounters ?? []).find((entry) => entry.status === 'active') ?? null;
    const pending = encounter ? pendingWoundAllocation(encounter) : null;
    if (!pending) return refusals;
    const answer = entries.find((entry) => entry.key === pending.key);
    if (!answer) return refusals;
    try {
      const intent = authorizePlayerWoundAllocation(answer, { campaign: resolved.campaign, encounter, pending });
      const result = run('fight:wound', { fight: { woundTargets: [...intent.targets], woundAllocation: intent.allocation } });
      if (!result.ok) throw new Error(result.message);
      log('COMBAT', `${pending.defender?.name ?? 'The wounded'} placed the wound from their own screen (Book 1 p.30).`);
      onChange();
    } catch (error) {
      refusals.push({ uid: answer.uid, message: `Your wound allocation was refused: ${error?.message ?? error}` });
    }
    for (const refusal of refusals) tellPlayer(refusal);
    if (refusals.length) { onChange(); saveToCloud(); }
    return refusals;
  }

  // A refusal goes to that player's own log (and the referee's), as the
  // referee client told them.
  function tellPlayer({ uid, message }) {
    if (!uid) return;
    log('COMBAT', message, { visibility: 'players', audiencePlayerIds: [uid] });
  }

  // v0.276.0: the campaign's chat, shared with players. What players say
  // arrives from the cloud and is shown beside the log; what the referee
  // says publicly here is sent to it, so players see it on their pages.
  let cloudChat = [];
  function setCloudChat(messages = []) { cloudChat = Array.isArray(messages) ? messages : []; onChange(); }
  function sendCloudChat(text, { name = 'Referee' } = {}) {
    const uid = cloud?.userId?.();
    if (!uid || typeof cloud.sendChat !== 'function' || !campaignIsPublished(resolved.campaign)) return;
    try {
      cloud.sendChat(campaignId, createChatMessage({ uid, name, kind: 'say', text }))
        ?.catch?.((error) => console.warn('[traveller] chat:', error?.code ?? error));
    } catch (error) { console.warn('[traveller] chat:', error?.message ?? error); }
  }
  function isoTime(value) {
    const time = typeof value === 'number' ? value : Date.parse(value ?? '');
    return new Date(Number.isFinite(time) ? time : 0).toISOString();
  }
  function mergedChat(lines) {
    const uid = cloud?.userId?.();
    const theirs = cloudChat.filter((entry) => entry.uid && entry.uid !== uid).map((entry) => ({
      id: `cloud-${entry.id}`,
      kind: entry.kind === 'roll' ? 'roll' : 'message',
      category: entry.kind === 'roll' ? 'ROLL' : 'CHAT',
      who: entry.name || 'A player',
      speakerId: null,
      text: entry.kind === 'roll' && entry.roll
        ? `${entry.roll.formula ?? 'roll'}: ${Array.isArray(entry.roll.dice) ? `[${entry.roll.dice.join(' ')}] ` : ''}= ${entry.roll.total}`
        : entry.text,
      dateLabel: null,
      // v0.281.0: the log keeps ISO time strings and the cloud chat keeps
      // milliseconds. Mixed, the sort compared a string with a number (NaN,
      // so the order came out wrong) and Clear, which remembers the last
      // line's time and hides everything up to it as a string, remembered a
      // number no ISO time is ever below — so nothing cleared (Kurt, Sep
      // 2026). Everything is an ISO string here.
      at: isoTime(entry.createdAt),
      visibility: 'public',
      detail: null,
      fromPlayer: true
    }));
    if (!theirs.length) return lines;
    return [...lines, ...theirs].sort((a, b) => Date.parse(a.at ?? 0) - Date.parse(b.at ?? 0));
  }

  // The referee's ship fight view with every control taken out: the plot,
  // the turn track, the data cards, the roster and the log. Players watch;
  // the referee's page runs the fight.
  function playerShipFight() {
    if (!pendingShipFight || !api) return null;
    try {
      const fight = api.view().shipFight;
      if (!fight) return null;
      const copy = JSON.parse(JSON.stringify(fight));
      copy.actions = []; copy.repairActions = []; copy.cancelRepairAction = [];
      copy.awaitingPlayer = false; copy.readOnly = true;
      if (copy.vector) { copy.vector.awaitingMovement = false; copy.vector.awaitingFireDecision = false; copy.vector.canFire = false; }
      return copy;
    } catch (error) {
      console.warn('[traveller] ship fight for players:', error?.message ?? error);
      return null;
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
      // v0.280.0: a fight being set up is current too, so players see the
      // board filling as the referee places everyone (Kurt, Sep 2026: the
      // player's page did not change until the fight began).
      const fight = resolved.encounters.find((entry) => entry.status === 'active')
        ?? resolved.encounters.find((entry) => entry.status === 'setup') ?? null;
      const envelope = {
        ...buildPublishedCampaign(campaign, {
          publishedAt: campaign.ownership?.publishedAt ?? home.savedAt, currentEncounterId: fight?.identity.id ?? null,
          ship, activeScene: scene ? buildPublishedScene(scene, { names }) : null
        }),
        // v0.282.0: a ship fight, as the players' page shows it (Kurt, Sep
        // 2026: the player saw nothing while the referee fought one).
        shipFight: playerShipFight(),
        // v0.282.0: the referee's Clear, which players' chat follows.
        chatClearedAt: campaign.roster?.chatClearedAt ?? null,
        // v0.294.0: which characters are in the campaign, so a player's page
        // can tell "in" from an ownership entry or an old sheet left over.
        characterIds: (campaign.documentRefs?.characters ?? []).map((entry) => entry.id),
        partyIds: [...(campaign.party?.characterIds ?? [])],
        // v0.285.0: whose campaign it is, for the stamp a character takes home.
        refereeName: cloud.account?.()?.displayName || cloud.account?.()?.email || null
      };
      revision = await cloud.save(home, envelope, { expectedRevision: revision });
      // v0.274.0: each seated player's own sheet, which player.html reads.
      // Only the referee client wrote these, so a character played from this
      // page kept whatever sheet that client last published. Written only
      // when it changed.
      if (typeof cloud.publishPlayerCharacter === 'function') {
        const owners = campaign.ownership?.actors ?? {};
        for (const character of resolved.characters ?? []) {
          const ownerUid = owners[character.identity.id];
          if (!ownerUid || ownerUid === uid) continue;
          const sheet = buildPublishedCharacter(character, { campaignId, ownerUid, publishedAt: 0 });
          const key = JSON.stringify(sheet);
          if (publishedSheets.get(character.identity.id) === key) continue;
          try {
            await cloud.publishPlayerCharacter(buildPublishedCharacter(character, { campaignId, ownerUid, publishedAt: Date.now() }));
            publishedSheets.set(character.identity.id, key);
          } catch (error) { console.warn('[traveller] player sheet:', character.identity.id, error?.code ?? error); }
        }
      }
      await publishForPlayers(campaign, uid);
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
    if (!character) {
      const actor = (resolved.npcActors ?? []).find((entry) => entry.identity.id === characterId) ?? null;
      if (actor) return runNpcInventory(actor, command, item);
      throw new Error('choose a character first');
    }
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
    } else if (verb === 'update') {
      // v0.267.0: the Gear tab's name, quantity and weight cells sent this
      // since v0.250.0, and it had no branch: every edit there was refused.
      if (!named) throw new Error('that item is no longer listed');
      const patch = {};
      if (item?.name !== undefined) patch.name = String(item.name).trim() || named.name;
      if (item?.quantity !== undefined) patch.quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
      if (item?.weightKg !== undefined) patch.weightGrams = Math.max(0, Math.round(Number(item.weightKg) * 1000) || 0);
      next = updateCharacterInventoryItem(character, itemId, patch);
      message = `${character.identity.name}: ${patch.name ?? named.name} changed`;
    } else if (verb === 'ready') {
      if (!named?.weaponKey) throw new Error('that is not a weapon');
      next = updateCharacterGameplayState(character, { weaponKey: named.weaponKey, armor: character.loadout.armor });
      message = `${character.identity.name} readies ${named.name}`;
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

  // v0.267.0: the same verbs on an NPC actor's inventory. Book 1 p.33's
  // military load is a character's choice and is not offered here.
  function runNpcInventory(actor, command, item) {
    const [, verb, ...rest] = command.split(':');
    const itemId = rest.join(':');
    const named = (actor.inventory ?? []).find((entry) => entry.id === itemId);
    const label = actor.identity.name;
    let next;
    let message;
    if (verb === 'add') {
      if (item?.weaponKey) next = addNpcActorInventoryItem(actor, { weaponKey: item.weaponKey, carried: true });
      else {
        const name = String(item?.name ?? '').trim();
        const grams = Math.round(Number(item?.weightKg ?? 0) * 1000);
        const quantity = Math.max(1, Math.floor(Number(item?.quantity ?? 1)));
        if (!name) throw new Error('give the item a name');
        if (!Number.isFinite(grams) || grams < 0) throw new Error('weight must be zero or more kilograms');
        next = addNpcActorInventoryItem(actor, { name, weightGrams: grams, quantity, carried: true });
      }
      message = `${label} now has ${next.inventory.at(-1).name}`;
    } else if (verb === 'update') {
      if (!named) throw new Error('that item is no longer listed');
      const patch = {};
      if (item?.name !== undefined) patch.name = String(item.name).trim() || named.name;
      if (item?.quantity !== undefined) patch.quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
      if (item?.weightKg !== undefined) patch.weightGrams = Math.max(0, Math.round(Number(item.weightKg) * 1000) || 0);
      next = updateNpcActorInventoryItem(actor, itemId, patch);
      message = `${label}: ${patch.name ?? named.name} changed`;
    } else if (verb === 'toggle') {
      if (!named) throw new Error('that item is no longer listed');
      next = updateNpcActorInventoryItem(actor, itemId, { carried: !named.carried });
      message = `${label} ${named.carried ? 'put down' : 'picked up'} ${named.name}`;
    } else if (verb === 'remove') {
      if (!named) throw new Error('that item is no longer listed');
      next = removeNpcActorInventoryItem(actor, itemId);
      message = `${named.name} removed from ${label}\u2019s inventory`;
    } else if (verb === 'ready') {
      // A carried weapon taken in hand: the loadout's weapon is the one the
      // fight starts with.
      if (!named?.weaponKey) throw new Error('that is not a weapon');
      next = updateNpcActorDocument(actor, { weaponKey: named.weaponKey });
      message = `${label} readies ${named.name}`;
    } else throw new Error(`${label} is not a character: ${verb} does not apply`);
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
      // v0.250.0: the character sheet's own writes. The Record tab is all
      // personnel text nothing else reads, so it goes straight through
      // updateCharacterRecord; name and notes are the two fields outside
      // that block the sheet can set.
      // v0.261.0: Book 1 p.31's recovery, with Kurt's Sep 2026 ruling for the
      // throw: "Return to full strength requires medical attention, or three
      // days of rest."
      // v0.263.0: a skill from the sheet. Click throws 2D plus Book 1's DM
      // for it into chat, as the character; the info button (or Shift+click)
      // puts the skill's description there instead. Book 1's own targets for
      // the skill ride along in the roll's detail; most skills have none, since
      // "specific throws ... must be generated" by the referee.
      // v0.264.0: something from the Compendium onto a character. Buy pays
      // from the character's own cash and needs a world that sells it; Give
      // is the referee's grant and costs nothing. A weapon or an item goes
      // into the inventory, carried; armour is put on (Book 1 allows one
      // suit at a time).
      if (command === 'gear:buy' || command === 'gear:give') {
        const who = (resolved.characters ?? []).find((entry) => entry.identity.id === fight?.id)
          ?? (resolved.npcActors ?? []).find((entry) => entry.identity.id === fight?.id);
        if (!who) throw new Error('choose a character first');
        // v0.267.0: an NPC actor takes a drop too; its gear goes through the
        // NPC document's own helpers.
        const npc = (resolved.npcActors ?? []).includes(who);
        const entry = catalogueEntry(String(fight?.value?.key ?? ''));
        const quantity = entry.armourKey || entry.weaponKey ? 1 : Math.max(1, Math.floor(Number(fight?.value?.quantity ?? 1)));
        const buying = command === 'gear:buy';
        const { profile } = currentWorldProfile(resolved, subsector);
        const availability = catalogueAvailability(entry, profile, { prohibitedWeaponKeys: profile ? prohibitedWeaponKeys(profile.lawLevel) : [] });
        const cost = entry.priceCr * quantity;
        const cash = Number(who.finances?.credits ?? 0);
        if (buying && !availability.buy) throw new Error(availability.reason);
        if (buying && cost > cash) throw new Error(`${who.identity.name} has Cr ${cash.toLocaleString('en-US')}; ${entry.name} costs Cr ${cost.toLocaleString('en-US')}`);
        let next = who;
        let what;
        if (entry.armourKey) {
          const was = who.loadout?.armor ?? 'none';
          next = npc ? updateNpcActorDocument(next, { armor: entry.armourKey }) : updateCharacterGameplayState(next, { armor: entry.armourKey });
          what = `${entry.name}${was !== 'none' && was !== entry.armourKey ? ` (in place of ${was === 'combat' ? 'battle dress' : was})` : ''}`;
        } else if (entry.weaponKey) {
          next = npc ? addNpcActorInventoryItem(next, { weaponKey: entry.weaponKey, carried: true }) : addCharacterInventoryItem(next, { weaponKey: entry.weaponKey, carried: true });
          what = `a ${entry.name}`;
        } else {
          next = npc
            ? addNpcActorInventoryItem(next, { name: entry.name, weightGrams: entry.weightGrams, quantity, carried: true })
            : addCharacterInventoryItem(next, { name: entry.name, weightGrams: entry.weightGrams, quantity, carried: true });
          what = quantity > 1 ? `${quantity} \u00d7 ${entry.name}` : entry.name;
        }
        if (buying) next = npc ? updateNpcActorDocument(next, { credits: cash - cost }) : importCharacterDocument({ ...next, finances: { ...next.finances, credits: cash - cost } });
        persist([next]);
        const line = buying
          ? `${who.identity.name} buys ${what} for Cr ${cost.toLocaleString('en-US')} (Cr ${(cash - cost).toLocaleString('en-US')} left).`
          : `${who.identity.name} is given ${what}.`;
        log('GEAR', line, { detail: [entry.priceNote, entry.note || null, availability.warning, entry.page ? `Book ${entry.pack === 'Equipment' ? 3 : 1} p.${entry.page}` : null].filter(Boolean).join('\n') || null });
        lastMessage = { ok: true, message: line, warning: availability.warning };
        onChange();
        saveToCloud();
        return lastMessage;
      }
      if (command === 'character:skill-roll' || command === 'character:skill-info') {
        // v0.267.0: an NPC actor's sheet throws its skills the same way.
        const who = (resolved.characters ?? []).find((entry) => entry.identity.id === fight?.id)
          ?? (resolved.npcActors ?? []).find((entry) => entry.identity.id === fight?.id);
        if (!who) throw new Error('choose a character first');
        const name = String(fight?.value?.skill ?? '');
        if (!Object.hasOwn(who.skills ?? {}, name)) throw new Error(`${who.identity.name} has no ${name}`);
        const level = Number(who.skills[name]);
        const weaponNames = Object.values(PERSONAL_WEAPONS).map((spec) => spec.name);
        const guide = skillGuide(name, { weaponNames });
        const perLevel = guide.against ? 'counts against the inspector, \u22122 a level' : `${guide.dmPerLevel >= 0 ? '+' : '\u2212'}${Math.abs(guide.dmPerLevel)} a level${guide.stated ? '' : ' (Book 1 leaves the DM to the referee; +1 a level used)'}`;
        const reference = guide.throws.map((entry) => `${entry.label}: ${entry.target}+${entry.note ? ` (${entry.note})` : ''}`);
        if (command === 'character:skill-info') {
          const detail = [guide.summary, `DM: ${perLevel}.${guide.untrainedDM !== null ? ` Untrained ${guide.untrainedDM}.` : ''}`, ...reference, guide.page ? `Book 1 p.${guide.page}` : null].filter(Boolean).join('\n');
          log('SKILL', `${who.identity.name}\u2019s ${name}-${level}: ${guide.tagline}.`, { detail, sourceActorId: who.identity.id });
          lastMessage = { ok: true, message: `${name} described in chat.` };
        } else {
          const dice = createDice();
          const rolled = [dice.rollD6(), dice.rollD6()];
          const dm = skillDM(name, level, { weaponNames });
          const total = rolled[0] + rolled[1] + dm;
          const line = `${name}-${level}: 2D [${rolled[0]} ${rolled[1]}] ${dm >= 0 ? '+' : '\u2212'} ${Math.abs(dm)} = ${total}`;
          const detail = [
            `2D [${rolled[0]}] [${rolled[1]}] = ${rolled[0] + rolled[1]}`,
            `${name}-${level}: ${dm >= 0 ? '+' : '\u2212'}${Math.abs(dm)} (${perLevel})`,
            `Total ${total}`,
            ...(reference.length ? ['', 'Book 1\u2019s throws for this skill:', ...reference.map((entry) => {
              const target = Number(/: (\d+)\+/.exec(entry)?.[1]);
              return `${entry}${Number.isFinite(target) && !guide.against ? ` \u2014 ${total >= target ? 'made' : 'missed'}` : ''}`;
            })] : ['Book 1 sets no standard throw: the referee names the target.']),
            guide.weapon ? 'A weapon skill: in a fight, it is added to the attack.' : null,
            guide.page ? `Book 1 p.${guide.page}` : null
          ].filter((entry) => entry !== null).join('\n');
          log('ROLL', line, { detail, sourceActorId: who.identity.id });
          lastMessage = { ok: true, message: line };
        }
        onChange();
        saveToCloud();
        return lastMessage;
      }
      // v0.275.0: rest is the party's, and the clock moves once for it
      // (Kurt, Sep 2026: two characters resting advanced the date twice).
      // character:rest is kept, as a party of one.
      if (command === 'party:rest' || command === 'character:rest') {
        const ids = command === 'party:rest' ? (Array.isArray(fight?.value?.ids) ? fight.value.ids : []) : [fight?.id ?? characterId].filter(Boolean);
        if (!ids.length) throw new Error('choose who rests');
        const { changed, rested, skipped } = restTogether(ids);
        if (!rested.length) throw new Error(skipped.length ? skipped.join('; ') : 'nobody there needs rest');
        registry.put(advanceCampaignDays(resolved.campaign, REST_DAYS));
        reload();
        persist(changed);
        const names = rested.length > 1 ? `${rested.slice(0, -1).join(', ')} and ${rested.at(-1)}` : rested[0];
        const message = `${names} rest${rested.length > 1 ? '' : 's'} three days and ${rested.length > 1 ? 'are' : 'is'} back to full strength.`;
        log('MEDICAL', message, skipped.length ? { detail: `Not rested: ${skipped.join('; ')}` } : {});
        lastMessage = { ok: true, message: rested.length > 1 ? `${rested.length} rested three days: full strength.` : `${rested[0]} rested three days: full strength.`, skipped };
        onChange();
        saveToCloud();
        return lastMessage;
      }
      // v0.275.0: the referee's clock. Time passes (with a reason for the
      // log, and resting if at least three days go by), or the date is set
      // outright to correct a mistake.
      if (command === 'time:pass') {
        const value = fight?.value ?? {};
        const amount = Number(value.amount);
        const unit = { hours: 3600, days: 86400, weeks: 604800 }[value.unit];
        if (!unit) throw new Error('pass hours, days or weeks');
        if (!Number.isInteger(amount) || amount < 1 || amount > 5200) throw new RangeError('pass a whole number of them, 1 or more');
        let seconds = amount * unit;
        const before = formatCampaignDate(resolved.campaign.time);
        // v0.302.0: The Traveller Book p.100, animals twice a day while the
        // party is out on the surface. The clock stops on the first day an
        // encounter comes up (Kurt, Sep 2026); the rest stays unpassed.
        const animals = animalState(resolved.campaign);
        const { system: here } = currentWorldProfile(resolved, subsector);
        const surface = animals.surface && here && animals.surface.systemId === here.id ? animals.surface : null;
        if (surface && animals.pending) throw new Error('an animal encounter is waiting: put it on the board or set it aside first');
        const surfaceTable = surface ? animals.tables[animalTableKey(surface.systemId, surface.terrain)] ?? null : null;
        let animalPatch = null;
        let animalNote = null;
        if (surface && surfaceTable) {
          const beforeDay = campaignDayNumber(resolved.campaign.time);
          const endDay = campaignDayNumber(advanceCampaignSeconds(resolved.campaign, seconds).time);
          const fromDay = Math.max(Number(surface.lastCheckedDay ?? beforeDay) + 1, beforeDay + 1);
          const dice = createDice();
          const run = runSurfaceChecks(dice, { fromDay, toDay: endDay });
          const thrown = run.throws.map((entry) => `${entry.when} ${entry.die}`).join(', ');
          if (run.hitDay !== null) {
            seconds = SECONDS_PER_DAY - resolved.campaign.time.secondsOfDay + (run.hitDay - beforeDay - 1) * SECONDS_PER_DAY;
            const landed = rollOnAnimalTable(dice, surfaceTable, resolved.npcActors ?? []);
            const date = formatCampaignDate(advanceCampaignSeconds(resolved.campaign, seconds).time);
            animalPatch = {
              surface: { ...surface, lastCheckedDay: run.hitDay },
              pending: {
                date, when: run.when, key: surfaceTable.key, terrain: surfaceTable.terrainLabel, worldName: surfaceTable.worldName,
                thrown: landed.thrown, die: landed.die, category: landed.row?.category ?? null,
                actorId: landed.row?.actorId ?? null, quantity: landed.row?.quantity ?? null, event: landed.row?.event ?? null, behaviour: null
              }
            };
            animalNote = `Animal encounter on ${date}, ${run.when === 'halted' ? 'while halted' : 'while travelling'} (${surfaceTable.terrainLabel}, ${surfaceTable.worldName}): ${surfaceTable.dice === 1 ? '1D' : '2D'} ${landed.thrown} \u2192 ${landed.die}: ${describeAnimalRow(landed.row, landed.actor)}. The clock stopped here (The Traveller Book p.91). Checks thrown: ${thrown}.`;
          } else {
            animalPatch = { surface: { ...surface, lastCheckedDay: Math.max(endDay, Number(surface.lastCheckedDay ?? 0)) } };
            if (run.throws.length) animalNote = `No animals (${surfaceTable.terrainLabel}, ${surfaceTable.worldName}): ${run.throws.length} checks, needing 5+ \u2014 ${thrown}.`;
          }
        }
        let rested = [];
        let skipped = [];
        let changed = [];
        if (value.resting && seconds >= REST_DAYS * 86400) {
          ({ changed, rested, skipped } = restTogether(restCandidates().filter((entry) => entry.canRest).map((entry) => entry.id)));
        }
        const advanced = advanceCampaignSeconds(resolved.campaign, seconds);
        registry.put(animalPatch ? withAnimalState(advanced, animalPatch) : advanced);
        reload();
        persist(changed);
        const stopped = seconds < amount * unit;
        const span = `${amount} ${amount === 1 ? value.unit.replace(/s$/, '') : value.unit}`;
        const reason = String(value.reason ?? '').trim();
        const message = `${stopped ? `Time passes, stopping short of the ${span} asked for an encounter` : `${span} pass${amount === 1 ? 'es' : ''}`}${reason ? `: ${reason}` : ''} (${before} to ${formatCampaignDate(resolved.campaign.time)}).${rested.length ? ` Rested to full strength: ${rested.join(', ')}.` : ''}${value.resting && stopped && !rested.length ? ' Not three full days, so nobody rested back to strength.' : ''}`;
        log('TIME', message, skipped.length ? { detail: `Not rested: ${skipped.join('; ')}` } : {});
        if (animalNote) log('ENCOUNTER', animalNote, { visibility: 'referee' });
        lastMessage = { ok: true, message };
        onChange();
        saveToCloud();
        return lastMessage;
      }
      if (command === 'time:set') {
        const value = fight?.value ?? {};
        const year = Number(value.year);
        const dayOfYear = Number(value.dayOfYear);
        if (!Number.isInteger(year) || year < 0) throw new RangeError('the year is a whole number');
        if (!Number.isInteger(dayOfYear) || dayOfYear < 1 || dayOfYear > DAYS_IN_YEAR) throw new RangeError(`the day is 1 to ${DAYS_IN_YEAR}`);
        const before = formatCampaignDate(resolved.campaign.time);
        let reset = updateCampaignTime(resolved.campaign, { year, dayOfYear });
        // v0.302.0: a corrected date is not time spent on the surface; the
        // animal checks pick up from the new day.
        const surfaceNow = animalState(reset).surface;
        if (surfaceNow) reset = withAnimalState(reset, { surface: { ...surfaceNow, lastCheckedDay: campaignDayNumber(reset.time) } });
        registry.put(reset);
        reload();
        const message = `The referee sets the date: ${before} to ${formatCampaignDate(resolved.campaign.time)}.`;
        log('TIME', message);
        lastMessage = { ok: true, message };
        onChange();
        saveToCloud();
        return lastMessage;
      }
      if (command === 'character:rest' || command === 'character:medical') {
        const patient = (resolved.characters ?? []).find((entry) => entry.identity.id === (fight?.id ?? characterId));
        // v0.271.0: an NPC actor rests and is treated by the same rule.
        const npcPatient = patient ? null : (resolved.npcActors ?? []).find((entry) => entry.identity.id === (fight?.id ?? characterId));
        if (npcPatient) {
          let campaign = resolved.campaign;
          let sameDay = false;
          if (command === 'character:rest') {
            const next = restNpcActor(npcPatient);
            campaign = advanceCampaignDays(campaign, REST_DAYS);
            registry.put(campaign);
            reload();
            persist([next]);
            log('MEDICAL', `${npcPatient.identity.name} rests three days and is back to full strength.`);
            lastMessage = { ok: true, message: `${npcPatient.identity.name} rested three days: full strength.` };
          } else {
            const { medic, level, kit, facility, xeno } = attendance(fight?.value);
            const result = medicalAttentionNpcActor(npcPatient, { medicalLevel: level, medicalKit: kit, facility, xeno });
            ({ campaign, sameDay } = treatmentDay(campaign, npcPatient.identity.id));
            registry.put(campaign);
            reload();
            persist([result.actor]);
            const line = treatedLine(medic, level, npcPatient.identity.name, result.serious, sameDay, xeno);
            log('MEDICAL', line);
            lastMessage = { ok: true, message: line };
          }
          onChange();
          saveToCloud();
          return lastMessage;
        }
        if (!patient) throw new Error('choose a character first');
        let campaign = resolved.campaign;
        let sameDay = false;
        if (command === 'character:rest') {
          const next = restCharacter(patient);
          campaign = advanceCampaignDays(campaign, REST_DAYS);
          registry.put(campaign);
          // persist() rebuilds refs from resolved.campaign; the new date has to
          // be in resolved first or it is written back over.
          reload();
          persist([next]);
          log('MEDICAL', `${patient.identity.name} rests three days and is back to full strength.`);
          lastMessage = { ok: true, message: `${patient.identity.name} rested three days: full strength.` };
        } else {
          const { medic, level, kit, facility, xeno } = attendance(fight?.value);
          // v0.296.0: no throw (1981 Book 1, Kurt's ruling); refused, saying
          // what is missing, before any time passes.
          const result = medicalAttention(patient, { medicalLevel: level, medicalKit: kit, facility, xeno });
          ({ campaign, sameDay } = treatmentDay(campaign, patient.identity.id));
          registry.put(campaign);
          reload();
          persist([result.character]);
          const line = treatedLine(medic, level, patient.identity.name, result.serious, sameDay, xeno);
          log('MEDICAL', line);
          lastMessage = { ok: true, message: line };
        }
        onChange();
        saveToCloud();
        return lastMessage;
      }
      if (command.startsWith('character:')) {
        const [, verb] = command.split(':');
        if (verb === 'record' || verb === 'name' || verb === 'notes') {
          const target = (resolved.characters ?? []).find((entry) => entry.identity.id === (fight?.id ?? characterId));
          if (!target) throw new Error('choose a character first');
          const value = fight?.value;
          let next;
          if (verb === 'record') next = updateCharacterRecord(target, value ?? {});
          else if (verb === 'name') {
            const name = String(value ?? '').trim();
            if (!name) throw new Error('give the character a name');
            next = { ...JSON.parse(JSON.stringify(target)), identity: { ...target.identity, name } };
          } else {
            next = { ...JSON.parse(JSON.stringify(target)), notes: String(value ?? '') };
          }
          persist([next]);
          lastMessage = { ok: true, message: `${next.identity.name}: changed.` };
          onChange();
          saveToCloud();
          return lastMessage;
        }
        // v0.274.0: a player's character seated from a join request. The play
        // page's Admit only seated the account; the character itself never
        // reached the campaign, so it was in nobody's Actors tab (Kurt, Sep
        // 2026). The referee client's SEAT did all of it; this is the
        // campaign half, and the page does the cloud half around it.
        if (verb === 'admit') {
          const value = fight?.value ?? {};
          if (!value.ownerUid) throw new Error('whose character is this?');
          const character = importCharacterDocument(value.character);
          if ((resolved.characters ?? []).some((entry) => entry.identity.id === character.identity.id)) {
            // Already here (an earlier Admit that stopped half-way): make sure
            // it is theirs and in the party, and carry on.
            let campaign = setDocumentOwner(resolved.campaign, { documentId: character.identity.id, ownerUid: value.ownerUid });
            if (!campaign.party.characterIds.includes(character.identity.id)) campaign = addCharacterToCampaign(campaign, character, { active: true, makeActive: false });
            registry.put(campaign);
          } else {
            let campaign = addCharacterToCampaign(resolved.campaign, character, { active: true, makeActive: false });
            campaign = setDocumentOwner(campaign, { documentId: character.identity.id, ownerUid: value.ownerUid });
            registry.putAll([character, campaign]);
          }
          reload();
          const message = `${character.identity.name || '(unnamed)'} joins the campaign${value.playerName ? ` with ${value.playerName}` : ''}.`;
          log('SYSTEM', message);
          lastMessage = { ok: true, message, characterId: character.identity.id };
          onChange();
          saveToCloud();
          return lastMessage;
        }
        // v0.265.0: the Actors directory's verbs for a player character —
        // copy, delete and file — which only NPC actors had.
        if (verb === 'copy' || verb === 'delete' || verb === 'folder') {
          const target = (resolved.characters ?? []).find((entry) => entry.identity.id === fight?.id);
          if (!target) throw new Error('choose a character first');
          const label = target.identity.name || '(unnamed)';
          let message;
          let createdId = null;
          if (verb === 'copy') {
            // A second person built the same way, outside the party and with
            // no player, filed beside the original.
            const clone = JSON.parse(JSON.stringify(target));
            clone.identity = {
              ...clone.identity,
              id: stableDocumentId('char', `${target.identity.id}\u0000copy\u0000${Date.now()}\u0000${Math.random()}`),
              name: `${target.identity.name || 'Unnamed'} (copy)`
            };
            const copy = importCharacterDocument(clone);
            let campaign = addCharacterToCampaign(resolved.campaign, copy, { active: false });
            campaign = setCharacterFolders(campaign, { [copy.identity.id]: characterFolder(resolved.campaign, target.identity.id) });
            registry.putAll([copy, campaign]);
            reload();
            createdId = copy.identity.id;
            message = `${copy.identity.name} created, outside the party.`;
          } else if (verb === 'delete') {
            const fighting = (resolved.encounters ?? []).some((encounter) => (encounter.status === 'active' || encounter.status === 'setup')
              && (encounter.combatants ?? []).some((combatant) => combatant.id === target.identity.id || combatant.sourceActorId === target.identity.id));
            if (fighting) throw new Error(`${label} is on the combat board; take them off it first`);
            registry.put(removeCharacterFromCampaign(resolved.campaign, target.identity.id));
            registry.remove(target.identity.id);
            reload();
            message = `${label} deleted.`;
          } else {
            registry.put(setCharacterFolders(resolved.campaign, { [target.identity.id]: normalizeFolderPath(fight?.value) }));
            reload();
            message = `${label} filed.`;
          }
          log('REFEREE', message);
          lastMessage = { ok: true, message, createdId };
          onChange();
          saveToCloud();
          return lastMessage;
        }
      }
      // v0.265.0: renaming or removing a directory folder moves everything
      // filed in it (and below it). Folders are only paths on their entries,
      // so there is no folder document to change. Actors covers player
      // characters (paths on the campaign) and NPC actors (paths on each
      // actor); Scenes covers scenes. Removing a folder files its contents in
      // the folder above it.
      if (command === 'folder:rename' || command === 'folder:remove') {
        const value = fight?.value ?? {};
        const from = normalizeFolderPath(value.from);
        // v0.266.0: Unfiled is not a folder, only where entries with no
        // folder show, so it cannot be removed; "renaming" it files
        // everything shown there into a real folder in one go.
        const unfiled = from === 'Unfiled';
        if (!from || (unfiled && command === 'folder:remove')) throw new Error('choose a folder');
        const parent = unfiled ? '' : from.split('/').slice(0, -1).join('/');
        const to = command === 'folder:remove' ? parent : normalizeFolderPath(value.to);
        if (command === 'folder:rename' && (!to || to === 'Unfiled')) throw new Error('a folder needs a name');
        const moved = (path) => {
          const current = normalizeFolderPath(path);
          if (unfiled) return current === '' ? to : null;
          if (current === from) return to;
          if (current.startsWith(`${from}/`)) return [to, current.slice(from.length + 1)].filter(Boolean).join('/');
          return null;
        };
        let count = 0;
        if (value.tab === 'Actors') {
          const actors = [];
          for (const actor of resolved.npcActors ?? []) {
            const next = moved(actor.profile?.folder ?? '');
            if (next === null) continue;
            actors.push(updateNpcActorDocument(actor, { folder: next }));
          }
          const folders = {};
          for (const character of resolved.characters ?? []) {
            const next = moved(characterFolder(resolved.campaign, character.identity.id));
            if (next !== null) folders[character.identity.id] = next;
          }
          const campaign = Object.keys(folders).length ? setCharacterFolders(resolved.campaign, folders) : resolved.campaign;
          registry.putAll([...actors, campaign]);
          count = actors.length + Object.keys(folders).length;
        } else if (value.tab === 'Scenes') {
          let campaign = resolved.campaign;
          const scenes = [];
          for (const scene of resolved.scenes ?? []) {
            const next = moved(scene.folder ?? '');
            if (next === null) continue;
            const updated = updateSceneDocument(scene, { folder: next || DEFAULT_SCENE_FOLDER });
            campaign = addSceneToCampaign(campaign, updated);
            scenes.push(updated);
          }
          registry.putAll([...scenes, campaign]);
          count = scenes.length;
        } else throw new Error('only Actors and Scenes folders can be changed');
        reload();
        const where = to || (value.tab === 'Scenes' ? DEFAULT_SCENE_FOLDER : 'Unfiled');
        const message = unfiled
          ? `${count} unfiled filed in ${to}.`
          : command === 'folder:rename'
          ? `Folder ${from} renamed ${to}; ${count} moved.`
          : `Folder ${from} removed; ${count} moved to ${where}.`;
        log('REFEREE', message);
        lastMessage = { ok: true, message, folder: where };
        onChange();
        saveToCloud();
        return lastMessage;
      }
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
      if (command.startsWith('actor:')) {
        // v0.249.0: the directory's own verbs — create, copy, delete, file —
        // so a row can be managed without a separate screen. Editing a field
        // is edit:actor:* below; this group is about the document itself.
        const [, action] = command.split(':');
        const value = fight?.value;
        const actor = (resolved.npcActors ?? []).find((entry) => entry.identity.id === fight?.id) ?? null;
        let message;
        if (action === 'create') {
          const kind = NPC_ACTOR_KINDS.includes(value?.kind) ? value.kind : 'actor';
          const name = String(value?.name ?? '').trim() || (kind === 'statblock' ? 'New statblock' : 'New actor');
          // v0.265.0: the Actors tab opens on the player characters' folder,
          // so a new NPC landed there (Thug and Mercenary did). A folder that
          // holds only characters is theirs; the NPC goes to Unfiled instead.
          let folder = normalizeFolderPath(value?.folder ?? '');
          const characterOnly = folder
            && (resolved.characters ?? []).some((entry) => characterFolder(resolved.campaign, entry.identity.id) === folder)
            && !(resolved.npcActors ?? []).some((entry) => normalizeFolderPath(entry.profile?.folder ?? '') === folder);
          if (characterOnly) folder = '';
          const created = createNpcActorDocument({ name, kind, folder, role: value?.role ?? '' });
          // The document alone is not in the campaign: an actor is reached
          // through the campaign's own refs and roster, so both are written.
          registry.putAll([created, addNpcActorToCampaign(resolved.campaign, created)]);
          reload();
          message = `${created.identity.name} created.`;
          lastMessage = { ok: true, message, createdId: created.identity.id };
          onChange();
          saveToCloud();
          return lastMessage;
        }
        if (!actor) throw new Error('choose an actor');
        if (action === 'copy') {
          // A statblock copied is a second pattern to edit ("Bandit with a
          // shotgun"); an actor copied is a second person. Same verb, and
          // the result follows the kind, the way placement does.
          const copy = duplicateNpcActorDocument(actor);
          registry.putAll([copy, addNpcActorToCampaign(resolved.campaign, copy)]);
          reload();
          message = `${copy.identity.name} created.`;
          lastMessage = { ok: true, message, createdId: copy.identity.id };
          onChange();
          saveToCloud();
          return lastMessage;
        } else if (action === 'delete') {
          const staged = (resolved.scenes ?? []).filter((scene) => scene.tokens.some((token) => token.actorId === actor.identity.id));
          if (staged.length && !value?.force) {
            throw new Error(`${actor.identity.name} is on ${staged.map((scene) => scene.identity.name).join(', ')}`);
          }
          // Removed from the registry outright, not archived: the referee
          // asked to delete it, and an archived actor that still turns up in
          // a search is the thing they were trying to get rid of.
          registry.put(removeNpcActorFromCampaign(resolved.campaign, actor.identity.id));
          registry.remove(actor.identity.id);
          reload();
          message = `${actor.identity.name} deleted.`;
        } else if (action === 'kind') {
          const kind = NPC_ACTOR_KINDS.includes(value) ? value : null;
          if (!kind) throw new Error('an actor is either an actor or a statblock');
          persist([updateNpcActorDocument(actor, { kind })]);
          message = `${actor.identity.name} is now ${kind === 'statblock' ? 'a statblock' : 'an actor'}.`;
        } else if (action === 'numbering') {
          persist([updateNpcActorDocument(actor, { numberTokens: Boolean(value) })]);
          message = `${actor.identity.name}: tokens ${value ? 'numbered' : 'unnumbered'}.`;
        } else if (action === 'folder') {
          persist([updateNpcActorDocument(actor, { folder: String(value ?? '') })]);
          message = `${actor.identity.name} filed.`;
        } else throw new Error(`unknown actor command: ${command}`);
        lastMessage = { ok: true, message };
        onChange();
        saveToCloud();
        return lastMessage;
      }
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
          } else if (field === 'characteristics') {
            // v0.300.0: the referee edits any character's sheet (Kurt, Sep
            // 2026). New scores; a physical score at full stays at full, a
            // wounded one keeps its wounds up to the new ceiling.
            const scores = { ...character.characteristics };
            const changes = [];
            for (const key of ['STR', 'DEX', 'END', 'INT', 'EDU', 'SOC']) {
              if (value?.[key] === undefined || value[key] === '') continue;
              const number = Number(value[key]);
              if (!Number.isInteger(number) || number < 0 || number > 15) throw new RangeError(`${key} must be a whole number from 0 to 15`);
              if (number !== scores[key]) changes.push(`${key} ${scores[key]} \u2192 ${number}`);
              scores[key] = number;
            }
            const current = { ...character.current };
            for (const key of ['STR', 'DEX', 'END']) {
              current[key] = character.current[key] >= character.characteristics[key] ? scores[key] : Math.min(character.current[key], scores[key]);
            }
            next = importCharacterDocument({ ...character, characteristics: scores, upp: formatUPP(scores), current });
            message = `Referee edits ${was}: ${changes.join(', ') || 'no change'}`;
          } else if (field === 'skills') {
            const skills = {};
            for (const part of String(value ?? '').split(',').map((entry) => entry.trim()).filter(Boolean)) {
              const match = /^(.*?)[-\s]+(\d+)$/.exec(part);
              if (!match) throw new Error(`"${part}" is not a skill and a level, like Rifle-1`);
              skills[match[1].trim()] = Number(match[2]);
            }
            next = importCharacterDocument({ ...character, skills });
            message = `Referee edits ${was}'s skills: ${Object.entries(skills).map(([name, level]) => `${name}-${level}`).join(', ') || 'none'}`;
          } else if (field === 'credits') {
            const credits = Number(value);
            if (!Number.isInteger(credits) || credits < 0) throw new RangeError('cash must be a whole number of credits');
            next = importCharacterDocument({ ...character, finances: { ...character.finances, credits } });
            message = `Referee edits ${was}'s cash: Cr ${Number(character.finances?.credits ?? 0).toLocaleString('en-US')} \u2192 Cr ${credits.toLocaleString('en-US')}`;
          } else if (field === 'age') {
            const age = Number(value);
            if (!Number.isInteger(age) || age < 18) throw new RangeError('age must be a whole number of 18 or more');
            // The age is the chronology's years; physical age moves with it,
            // and the next aging throw is the next one due after the new age
            // (34, 38, 42 ... ; Book 1 p.18), unless one was already later.
            const chronology = character.chronology ?? {};
            const months = age * 12 + ((chronology.chronologicalAgeMonths ?? age * 12) % 12);
            const shift = months - (chronology.chronologicalAgeMonths ?? months);
            let nextCheck = chronology.nextAgingCheckAgeMonths ?? 34 * 12;
            if (nextCheck <= months) { let years = 34; while (years * 12 <= months) years += 4; nextCheck = years * 12; }
            next = importCharacterDocument({ ...character, age, chronology: { ...chronology, chronologicalAgeMonths: months, physicalAgeMonths: Math.max(18 * 12, (chronology.physicalAgeMonths ?? months) + shift), nextAgingCheckAgeMonths: nextCheck } });
            message = `Referee edits ${was}'s age: ${character.age} \u2192 ${age}`;
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
          } else if (field === 'characteristics') {
            // v0.249.0: a statblock's whole sheet is editable — it is a
            // pattern the referee writes, not a record play produced. The
            // current scores follow the new ceilings, since an unplaced
            // pattern has taken no wounds.
            const scores = {};
            for (const key of ['STR', 'DEX', 'END', 'INT', 'EDU', 'SOC']) {
              const number = Number(value?.[key] ?? actor.characteristics[key]);
              if (!Number.isInteger(number) || number < 0 || number > 15) throw new RangeError(`${key} must be a whole number from 0 to 15`);
              scores[key] = number;
            }
            patch.characteristics = scores;
            patch.current = { STR: scores.STR, DEX: scores.DEX, END: scores.END };
          } else if (field === 'skills') {
            // "Rifle-1, Brawling-1" as the referee types it.
            const skills = {};
            for (const part of String(value ?? '').split(',').map((entry) => entry.trim()).filter(Boolean)) {
              const match = /^(.*?)[-\s]+(\d+)$/.exec(part);
              if (!match) throw new Error(`"${part}" is not a skill and a level, like Rifle-1`);
              skills[match[1].trim()] = Number(match[2]);
            }
            patch.skills = skills;
          } else if (field === 'folder') {
            patch.folder = String(value ?? '');
          } else if (field === 'notes') {
            // v0.267.0: the Notes tab's two boxes.
            if (value?.referee !== undefined) patch.refereeNotes = String(value.referee);
            if (value?.public !== undefined) patch.publicNotes = String(value.public);
          } else if (field === 'profile') {
            // v0.267.0: the Profile tab. Age is a whole number or unknown.
            for (const key of ['role', 'faction', 'homeworld']) if (value?.[key] !== undefined) patch[key] = String(value[key]).trim();
            if (value?.age !== undefined) {
              const age = value.age === '' || value.age === null ? null : Number(value.age);
              if (age !== null && (!Number.isInteger(age) || age < 0)) throw new RangeError('age must be a whole number');
              patch.age = age;
            }
          } else if (field === 'credits') {
            const credits = Number(value);
            if (!Number.isInteger(credits) || credits < 0) throw new RangeError('cash must be a whole number of credits');
            patch.credits = credits;
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
        } else if (action === 'update-ship') {
          // One command for both fields a staged token's row can edit
          // (side, position) rather than two near-identical ones — each
          // fires independently from the UI (a select's onchange, an
          // input's oninput), so this just applies whichever the payload
          // actually carries.
          const scene = (resolved.scenes ?? []).find((entry) => entry.identity.id === id);
          if (!scene) throw new Error('choose a scene to update');
          const tokenId = value?.tokenId;
          let next = scene;
          if (value?.side !== undefined) next = setSceneTokenSide(next, { tokenId, side: value.side });
          if (value?.x !== undefined || value?.y !== undefined) {
            const token = next.tokens.find((entry) => entry.id === tokenId);
            if (!token) throw new Error('token is not on this scene');
            next = moveSceneShip(next, { tokenId, x: value.x ?? token.position.x, y: value.y ?? token.position.y });
          }
          const campaign = addSceneToCampaign(resolved.campaign, next);
          registry.putAll([next, campaign]);
          reload();
          message = 'Staged ship updated.';
        } else if (action === 'set-ship-vector') {
          // Dragging a staged ship's velocity arrow. Separate from
          // update-ship because it writes token.velocity, not position or
          // side, and setSceneShipVector is the function that validates it.
          const scene = (resolved.scenes ?? []).find((entry) => entry.identity.id === id);
          if (!scene) throw new Error('choose a scene to update');
          const next = setSceneShipVector(scene, { tokenId: value?.tokenId, velocity: value?.velocity });
          const campaign = addSceneToCampaign(resolved.campaign, next);
          registry.putAll([next, campaign]);
          reload();
          message = 'Starting vector set.';
        } else if (action === 'place-body' || action === 'move-body' || action === 'remove-body') {
          // Worlds, asteroid fields and emplacements on a vector board.
          // scene-document.js already builds and validates each kind
          // (worldBody/asteroidFieldBody/emplacementBody, which compute Book 2
          // pp.26-27's own template from a diameter and density rather than
          // taking one ready-made); this only routes to them.
          const scene = (resolved.scenes ?? []).find((entry) => entry.identity.id === id);
          if (!scene) throw new Error('choose a scene to update');
          let next = scene;
          if (action === 'place-body') {
            const spec = value ?? {};
            const body = spec.kind === 'asteroid-field' ? asteroidFieldBody(spec)
              : spec.kind === 'emplacement' ? emplacementBody(spec)
              : worldBody(spec);
            next = placeSceneBody(next, body);
            // Book 2 p.28: a table holds one world, so the first world placed
            // becomes the one whose gravity the fight samples. A second world
            // is drawn but does not silently steal that role.
            if (body.kind === 'world' && !next.space?.gravityBodyId) next = setSceneGravityBody(next, body.id);
            message = `${body.name} placed.`;
          } else if (action === 'move-body') {
            next = moveSceneBody(next, { bodyId: value?.bodyId, x: value?.x, y: value?.y });
            message = 'Body moved.';
          } else {
            next = removeSceneBody(next, value);
            message = 'Body removed.';
          }
          const campaign = addSceneToCampaign(resolved.campaign, next);
          registry.putAll([next, campaign]);
          reload();
        } else if (action === 'atmosphere') {
          // Book 3's atmosphere digit, which Book 2 p.35's braking reads.
          const scene = (resolved.scenes ?? []).find((entry) => entry.identity.id === id);
          if (!scene) throw new Error('choose a scene to update');
          const next = updateSceneDocument(scene, { atmosphere: value === null || value === '' ? null : Number(value) });
          const campaign = addSceneToCampaign(resolved.campaign, next);
          registry.putAll([next, campaign]);
          reload();
          message = value === null ? 'Atmosphere cleared.' : `Atmosphere set to ${value}.`;
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
      // v0.254.0: Kurt's workflow. Combat opens an empty band board; the
      // referee drags characters and actors onto it, moves or removes them,
      // decides surprise (roll it, or call it), and begins. The engine has
      // had every step of this since v0.94.0's setup phase; play.html never
      // called any of it.
      if (command === 'fight:setup') {
        if (liveEncounter()) throw new Error('a fight is already running');
        const existing = setupEncounter();
        if (existing) { lastMessage = { ok: true, message: 'The board is already open.' }; return lastMessage; }
        const encounter = createEncounterDocument({
          campaign: resolved.campaign, characters: [], opponents: [],
          spatialMode: 'range-line', range: 'medium', setup: true,
          date: resolved.campaign.time, dice: createDice()
        });
        registry.put(encounter);
        registry.put(addEncounterToCampaign(resolved.campaign, encounter));
        reload();
        persist([]);
        lastMessage = { ok: true, message: 'Board open: drag characters and actors onto a band.' };
        onChange();
        return lastMessage;
      }
      // v0.272.0: Book 1 p.33's per-side morale settings — a military unit,
      // and the referee's DM for a valiant (or shaky) party. Set any time.
      if (command === 'fight:morale') {
        const encounter = liveEncounter() ?? setupEncounter();
        if (!encounter) throw new Error('no fight is running');
        const value = fight?.value ?? {};
        persist([setEncounterMorale(encounter, { side: value.side, militaryUnit: value.militaryUnit, dm: value.dm })]);
        lastMessage = { ok: true, message: 'Morale set.' };
        onChange();
        saveToCloud();
        return lastMessage;
      }
      if (['fight:place', 'fight:reposition', 'fight:remove', 'fight:begin', 'fight:discard', 'fight:range'].includes(command)) {
        const encounter = setupEncounter();
        if (!encounter) throw new Error('no fight is being set up');
        const value = fight?.value ?? {};
        let next;
        let message;
        if (command === 'fight:place') {
          const column = Math.max(0, Math.min(encounter.map.columns - 1, Math.round(Number(value.column ?? 0))));
          if (encounter.combatants.some((entry) => entry.id === value.id || entry.sourceActorId === value.id) && value.kind === 'character') {
            throw new Error('that character is already on the board');
          }
          if (value.kind === 'character') {
            const character = (resolved.characters ?? []).find((entry) => entry.identity.id === value.id);
            if (!character) throw new Error('unknown character');
            if (!String(character.identity.name ?? '').trim()) throw new Error('a combatant needs a name');
            next = addEncounterCombatantFromCharacter(encounter, { character, column, row: 0, gravityFactor: currentGravityFactor(resolved, subsector) });
          } else {
            let actor = (resolved.npcActors ?? []).find((entry) => entry.identity.id === value.id);
            if (!actor) throw new Error('unknown actor');
            // v0.271.0: an actor now keeps what a fight did to it.
            if (actor.profile?.kind !== 'statblock' && npcActorIsDead(actor)) throw new Error(`${actor.identity.name} is dead`);
            // An actor is one person: placing the same one twice is refused.
            // A statblock is a pattern, and each placement is its own copy.
            // v0.269.0: Kurt dragged his Mercenary on a second time expecting
            // Mercenary 2 and was refused, because it had been made as an
            // actor. The page now offers to make it a statblock on the spot
            // (asStatblock), which is the mook he meant.
            if (actor.profile?.kind !== 'statblock' && encounter.combatants.some((entry) => entry.sourceActorId === actor.identity.id)) {
              if (!value.asStatblock) {
                const error = new Error(`${actor.identity.name} is an actor, one person, and is already on the board. Make it a statblock to place numbered copies.`);
                throw error;
              }
              actor = updateNpcActorDocument(actor, { kind: 'statblock' });
              registry.put(actor);
              reload();
            }
            next = addEncounterCombatantFromActor(encounter, { actor, side: value.side ?? 'opposition', column, row: 0, gravityFactor: currentGravityFactor(resolved, subsector) });
          }
          message = next.entry?.text ?? 'Placed.';
          next = next.encounter;
        } else if (command === 'fight:reposition') {
          const column = Math.max(0, Math.min(encounter.map.columns - 1, Math.round(Number(value.column ?? 0))));
          next = repositionEncounterCombatant(encounter, { combatantId: value.combatantId, column, row: 0 });
          next = next.encounter ?? next;
          message = 'Moved.';
        } else if (command === 'fight:range') {
          // v0.271.0: Book 1 p.27, the range the parties met at — thrown
          // (2D + terrain DM) or the referee's call — and the opposition
          // placed that far off.
          const party = encounter.combatants.filter((entry) => entry.side === 'party');
          const foes = encounter.combatants.filter((entry) => entry.side !== 'party');
          if (!party.length || !foes.length) throw new Error('put both sides on the board first');
          let thrown = null;
          let range = value.range;
          if (!range) {
            const terrain = value.terrain && Object.hasOwn(TERRAIN_DMS, value.terrain) ? value.terrain : null;
            thrown = rollEncounterRange(createDice(), { terrain });
            range = thrown.range;
          }
          const result = setEncounterOpeningRange(encounter, { range, thrown });
          next = result.encounter;
          message = result.entry.text;
          log('COMBAT', message);
        } else if (command === 'fight:remove') {
          next = removeEncounterCombatant(encounter, { combatantId: value.combatantId });
          next = next.encounter ?? next;
          message = 'Removed from the board.';
        } else if (command === 'fight:discard') {
          // Nothing happened on a board nobody began: it is removed outright
          // rather than filed as an encounter that ended.
          registry.put(removeEncounterFromCampaign(resolved.campaign, encounter.identity.id));
          registry.remove(encounter.identity.id);
          reload();
          lastMessage = { ok: true, message: 'Board cleared.' };
          onChange();
          return lastMessage;
        } else {
          const surprise = ['roll', 'party', 'opposition', 'none'].includes(value.surprise) ? value.surprise : 'roll';
          const begun = beginEncounter(encounter, { surprise, dice: createDice() });
          next = begun.encounter;
          message = begun.entry.text;
          log('COMBAT', message);
        }
        persist([next]);
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
          opponents: actors.map((actor) => opponentSpecFromNpcActor(actor, { gravityFactor: currentGravityFactor(resolved, subsector) })),
          spatialMode: 'range-line',
          range: fight?.range ?? 'medium',
          // Book 1 p.33: what each character is carrying, against the gravity
          // of the world they are standing on.
          gravityFactor: currentGravityFactor(resolved, subsector),
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
      // v0.253.0: chat. The talk box on play.html had never done anything —
      // no handler was ever attached, and the view's chat list was always
      // empty. Messages and rolls are activity-log entries (CHAT and ROLL),
      // which gives them the log's cloud sync, its campaign dates and its
      // per-entry visibility for free, and puts them in the same stream as
      // the notices the log already writes.
      // v0.302.0: animal encounters, The Traveller Book pp.90-95. The
      // referee says where the party is; tables are built per terrain of the
      // world they are on, each animal a statblock; the clock (time:pass)
      // throws the checks, and these are the referee's own hands on it.
      if (command.startsWith('animals:')) {
        const value = fight?.value ?? {};
        const { system } = currentWorldProfile(resolved, subsector);
        const animals = animalState(resolved.campaign);
        const today = formatCampaignDate(resolved.campaign.time);
        const finish = (message, extra = {}) => {
          lastMessage = { ok: true, message, ...extra };
          onChange();
          saveToCloud();
          return lastMessage;
        };
        const makeTable = (terrain, format = '2D') => {
          if (!system) throw new Error('the party is not at a world');
          const built = buildAnimalTable({ system, terrain, format: format === '1D' ? '1D' : '2D', dice: createDice(), date: today });
          let campaign = resolved.campaign;
          for (const actor of built.actors) campaign = addNpcActorToCampaign(campaign, actor);
          // A table built again replaces the old one; its statblocks are
          // archived, not deleted, in case a fight still names them.
          const old = animals.tables[built.table.key];
          const retired = (old?.rows ?? []).map((row) => row.actorId).filter(Boolean)
            .map((id) => (resolved.npcActors ?? []).find((entry) => entry.identity.id === id)).filter(Boolean)
            .map((actor) => updateNpcActorDocument(actor, { state: { ...actor.state, archived: true } }));
          campaign = withAnimalState(campaign, { tables: { ...animalState(campaign).tables, [built.table.key]: built.table } });
          registry.putAll([...built.actors, ...retired, campaign]);
          reload();
          return built.table;
        };
        const pendingFrom = (table, landed, when) => ({
          date: today, when, key: table.key, terrain: table.terrainLabel, worldName: table.worldName,
          thrown: landed.thrown, die: landed.die, category: landed.row?.category ?? null,
          actorId: landed.row?.actorId ?? null, quantity: landed.row?.quantity ?? null, event: landed.row?.event ?? null, behaviour: null
        });
        if (command === 'animals:table') {
          const table = makeTable(String(value.terrain ?? ''), value.format);
          log('ENCOUNTER', `Animal encounter table built: ${table.terrainLabel} terrain on ${table.worldName} (${table.dice === 1 ? '1D' : '2D'}, The Traveller Book p.95).`, { visibility: 'referee' });
          return finish(`${table.terrainLabel} table built for ${table.worldName}.`, { key: table.key });
        }
        if (command === 'animals:surface') {
          if (value.terrain === null || value.terrain === '' || value.terrain === undefined) {
            registry.put(withAnimalState(resolved.campaign, { surface: null }));
            reload();
            log('ENCOUNTER', 'The party is back in port: no animal checks.', { visibility: 'referee' });
            return finish('In port: no animal checks.');
          }
          if (!system) throw new Error('the party is not at a world');
          const terrain = String(value.terrain);
          const key = animalTableKey(system.id, terrain);
          if (!animals.tables[key]) makeTable(terrain, value.format);
          const table = animalState(resolved.campaign).tables[key];
          registry.put(withAnimalState(resolved.campaign, { surface: { systemId: system.id, worldName: system.name, terrain, lastCheckedDay: campaignDayNumber(resolved.campaign.time) } }));
          reload();
          const message = `The party is out on ${system.name}, ${table.terrainLabel.toLowerCase()} terrain: animals are checked twice a day as time passes.`;
          log('ENCOUNTER', message, { visibility: 'referee' });
          return finish(message);
        }
        if (command === 'animals:event') {
          const table = animals.tables[String(value.key ?? '')];
          if (!table) throw new Error('unknown table');
          const die = Number(value.die);
          if (!table.rows.some((row) => row.die === die && row.category === 'event')) throw new Error('that row is not an event');
          const rows = table.rows.map((row) => (row.die === die ? { ...row, event: String(value.text ?? '').trim() } : row));
          registry.put(withAnimalState(resolved.campaign, { tables: { ...animals.tables, [table.key]: { ...table, rows } } }));
          reload();
          return finish('Event written.');
        }
        if (command === 'animals:check' || command === 'animals:roll') {
          // check: one throw now, 5+ (p.91), on the terrain the party is in.
          // roll: straight onto a table, for an encounter the referee calls.
          const key = String(value.key ?? '') || (animals.surface && system && animals.surface.systemId === system.id ? animalTableKey(animals.surface.systemId, animals.surface.terrain) : '');
          const table = animals.tables[key];
          if (!table) throw new Error(command === 'animals:check' ? 'set where the party is first' : 'unknown table');
          const dice = createDice();
          if (command === 'animals:check') {
            const check = animalCheck(dice, { dm: Number.parseInt(value.dm ?? 0, 10) || 0 });
            if (!check.hit) {
              const message = `Animal check (${table.terrainLabel}, ${table.worldName}): 1D ${check.die}${check.dm ? ` ${check.dm > 0 ? '+' : ''}${check.dm}` : ''}, needing 5+ \u2014 nothing.`;
              log('ENCOUNTER', message, { visibility: 'referee' });
              return finish(message);
            }
          }
          const landed = rollOnAnimalTable(dice, table, resolved.npcActors ?? []);
          const pending = pendingFrom(table, landed, command === 'animals:check' ? 'now' : 'called');
          registry.put(withAnimalState(resolved.campaign, { pending }));
          reload();
          const message = `Animal encounter (${table.terrainLabel}, ${table.worldName}): ${table.dice === 1 ? '1D' : '2D'} ${landed.thrown} \u2192 ${landed.die}: ${describeAnimalRow(landed.row, landed.actor)}.`;
          log('ENCOUNTER', message, { visibility: 'referee' });
          return finish(message);
        }
        // v0.304.0: Book 1 p.26-27's order before anything else happens —
        // surprise, then range — each thrown or called, on the encounter.
        if (command === 'animals:surprise' || command === 'animals:range') {
          const pending = animals.pending;
          if (!pending) throw new Error('no animal encounter is waiting');
          const mode = String(value.mode ?? 'roll');
          const party = surfaceParty(resolved);
          let patch;
          let message;
          if (command === 'animals:surprise') {
            if (mode === 'roll') {
              const thrown = animalSurpriseThrow(createDice(), party);
              const side = thrown.surpriseSideId;
              const text = side === 'party' ? 'the party has surprise' : side === 'opposition' ? 'the animals have surprise' : 'neither side has surprise';
              patch = { surprise: { side, thrown, text } };
              const dmText = (entry) => (entry.dm ? ` ${entry.dm > 0 ? '+' : ''}${entry.dm}` : '');
              message = `Surprise (Book 1 p.27): party 1D ${thrown.results[0].roll}${dmText(thrown.results[0])}, animals 1D ${thrown.results[1].roll} \u2014 ${text}.`;
            } else {
              if (!['party', 'opposition', 'none'].includes(mode)) throw new Error('surprise is roll, party, opposition or none');
              const side = mode === 'none' ? null : mode;
              const text = side === 'party' ? 'the party has surprise' : side === 'opposition' ? 'the animals have surprise' : 'neither side has surprise';
              patch = { surprise: { side, thrown: null, text: `${text} (referee\u2019s call)` } };
              message = `Surprise: ${text} (referee\u2019s call).`;
            }
          } else {
            const surfaceTerrain = animals.tables[pending.key]?.terrain ?? null;
            if (mode === 'roll') {
              const thrown = animalRangeThrow(createDice(), surfaceTerrain, { dm: Number.parseInt(value.dm ?? 0, 10) || 0 });
              const terrainText = thrown.book1Terrain ? `${thrown.book1Terrain.replace(/-/g, ' ')} ${thrown.terrainDM >= 0 ? '+' : ''}${thrown.terrainDM}` : 'no terrain DM';
              patch = { range: { range: thrown.range, thrown: { dice: [...thrown.dice], total: thrown.total, terrain: thrown.book1Terrain, terrainDM: thrown.terrainDM }, text: `${thrown.range.replace('-', ' ')} range (2D ${thrown.roll}, ${terrainText} = ${thrown.total})` } };
              message = `Encounter range (Book 1 p.27): 2D [${thrown.dice.join(' ')}] ${terrainText} = ${thrown.total} \u2014 ${thrown.range.replace('-', ' ')}.`;
            } else {
              if (!['close', 'short', 'medium', 'long', 'very-long'].includes(mode)) throw new Error('unknown range');
              patch = { range: { range: mode, thrown: null, text: `${mode.replace('-', ' ')} range (referee\u2019s call)` } };
              message = `Encounter range: ${mode.replace('-', ' ')} (referee\u2019s call).`;
            }
          }
          registry.put(withAnimalState(resolved.campaign, { pending: { ...pending, ...patch } }));
          reload();
          log('ENCOUNTER', message, { visibility: 'referee' });
          return finish(message);
        }
        if (command === 'animals:dismiss') {
          const gone = animals.pending;
          registry.put(withAnimalState(resolved.campaign, { pending: null }));
          reload();
          // v0.307.0: an animal that fled is let go, and the log says so.
          if (value.fled && gone?.actorId) {
            const actor = (resolved.npcActors ?? []).find((entry) => entry.identity.id === gone.actorId);
            const message = `The ${actor?.identity.name?.toLowerCase() ?? 'animal'}${(gone.quantity ?? 1) > 1 ? 's' : ''} fled; the party let ${(gone.quantity ?? 1) > 1 ? 'them' : 'it'} go.`;
            log('ENCOUNTER', message);
            return finish(message);
          }
          return finish('Encounter set aside.');
        }
        // v0.307.0: who is out with the party (Kurt, Sep 2026: everyone who
        // joins is in the party, and they all landed on the board).
        if (command === 'animals:with') {
          const refs = new Set((resolved.campaign.documentRefs?.characters ?? []).map((entry) => entry.id));
          const ids = (Array.isArray(value.ids) ? value.ids : []).filter((id) => refs.has(id));
          if (!ids.length) throw new Error('at least one character must be out with the party');
          registry.put(withAnimalState(resolved.campaign, { withIds: [...new Set(ids)] }));
          reload();
          const names = surfaceParty(resolved).map((entry) => entry.identity.name);
          return finish(`With the party: ${names.join(', ')}.`);
        }
        // v0.307.0: p.92, food from a kill. Once a carcass.
        if (command === 'animals:butcher') {
          const encounter = (resolved.encounters ?? []).find((entry) => entry.identity.id === value.encounterId);
          const carcass = encounter?.combatants.find((entry) => entry.id === value.combatantId && entry.animal);
          if (!carcass) throw new Error('choose a dead animal');
          if (carcass.status !== 'dead') throw new Error(`${carcass.name} is not dead`);
          const key = `${encounter.identity.id}|${carcass.id}`;
          if (animals.butchered[key]) throw new Error(`${carcass.name} has been butchered already`);
          const actor = (resolved.npcActors ?? []).find((entry) => entry.identity.id === carcass.sourceActorId);
          let atmosphere = 6;
          try { atmosphere = parseUniversalWorldProfile(system.mainWorld.uwp).atmosphere; } catch { atmosphere = 6; }
          const result = butcherCarcass(createDice(), actor?.animal ?? { weightKg: carcass.animal.weightKg, weapons: Object.keys(carcass.animal.weapons).map((k) => ({ key: k })) }, { atmosphere, destroyed: Boolean(carcass.animal.destroyed) });
          const text = result.edible
            ? `${carcass.name}: edible (${result.reason}); 1D ${result.die} \u00d7 5% = ${result.meatKg} kg of meat, ${Math.floor(result.meatKg)} person-days (1 kg a day)`
            : `${carcass.name}: not edible (${result.reason})`;
          registry.put(withAnimalState(resolved.campaign, { butchered: { ...animals.butchered, [key]: text } }));
          reload();
          const message = `${text} (The Traveller Book p.92).`;
          log('ENCOUNTER', message);
          return finish(message);
        }
        if (command === 'animals:behaviour') {
          // p.95: attack and flee, in the animal's own order, thrown once for
          // the group; surprise from the fight's own throw or the referee.
          const actor = (resolved.npcActors ?? []).find((entry) => entry.identity.id === value.actorId);
          if (!actor?.animal) throw new Error('choose an animal');
          const preyCount = Math.max(1, surfaceParty(resolved).length);
          const count = animals.pending?.actorId === actor.identity.id ? animals.pending.quantity ?? actor.animal.quantity : actor.animal.quantity;
          // The encounter's own surprise, once settled, unless the sheet says otherwise.
          const settled = animals.pending?.actorId === actor.identity.id ? animals.pending.surprise ?? null : null;
          const surprise = value.surprise === undefined && settled ? settled.side === 'opposition' : Boolean(value.surprise);
          const surprised = value.surprised === undefined && settled ? settled.side === 'party' : Boolean(value.surprised);
          const result = animalBehaviourThrow(createDice(), actor, { surprise, surprised, preyCount, animalCount: count });
          const text = describeBehaviour(result);
          const behaviour = { action: result.action, speed: result.speed, text, date: today };
          if (animals.pending?.actorId === actor.identity.id) {
            registry.put(withAnimalState(resolved.campaign, { pending: { ...animals.pending, behaviour } }));
            reload();
          }
          const message = `${actor.identity.name} (${actor.animal.behaviour.code}) ${text} (The Traveller Book p.95).`;
          log('ENCOUNTER', message, { visibility: 'referee' });
          return finish(message, { behaviour });
        }
        if (command === 'animals:place') {
          // One click from the encounter to the board: the party at one end,
          // the animals two bands off, and the Book 1 range throw still the
          // referee's to make before the fight begins.
          const actor = (resolved.npcActors ?? []).find((entry) => entry.identity.id === value.actorId);
          if (!actor?.animal) throw new Error('choose an animal');
          if (liveEncounter()) throw new Error('a fight is already running');
          if (!setupEncounter()) {
            const opened = createEncounterDocument({ campaign: resolved.campaign, characters: [], opponents: [], spatialMode: 'range-line', range: 'medium', setup: true, date: resolved.campaign.time, dice: createDice() });
            registry.put(opened);
            registry.put(addEncounterToCampaign(resolved.campaign, opened));
            reload();
          }
          let encounter = setupEncounter();
          const gravityFactor = currentGravityFactor(resolved, subsector);
          // v0.307.0: whoever the referee has already put on the board is the
          // party side; only an empty side is filled, and then with those out
          // with the party, not every character in the campaign.
          if (!encounter.combatants.some((entry) => entry.side === 'party')) {
            for (const character of surfaceParty(resolved)) {
              encounter = addEncounterCombatantFromCharacter(encounter, { character, column: 0, row: 0, gravityFactor }).encounter;
            }
          }
          const before = new Set(encounter.combatants.map((entry) => entry.id));
          const wanted = Math.max(1, Math.round(Number(value.count ?? actor.animal.quantity ?? 1)) || 1);
          const room = 16 - encounter.combatants.filter((entry) => entry.side !== 'party').length;
          const count = Math.max(0, Math.min(wanted, room));
          for (let index = 0; index < count; index += 1) {
            encounter = addEncounterCombatantFromActor(encounter, { actor, side: 'opposition', column: Math.min(2, encounter.map.columns - 1), row: 0, gravityFactor }).encounter;
          }
          // v0.304.0: what the dialog settled is not thrown twice. The range
          // places the animals; a settled surprise begins round 1.
          const carried = animals.pending?.actorId === actor.identity.id ? animals.pending : null;
          // v0.307.0: an animal that threw flee or nothing does not fight of
          // its own accord: the referee gives its orders, and a fleeing one
          // declares escape on round 1 (Book 1 p.29).
          const action = carried?.behaviour?.action ?? null;
          const placedIds = encounter.combatants.filter((entry) => !before.has(entry.id)).map((entry) => entry.id);
          if (action === 'flee' || action === 'nothing') {
            encounter = { ...encounter, combatants: encounter.combatants.map((entry) => (placedIds.includes(entry.id) ? { ...entry, tactics: 'manual' } : entry)) };
          }
          let begun = false;
          if (carried?.range?.range) encounter = setEncounterOpeningRange(encounter, { range: carried.range.range, thrown: carried.range.thrown }).encounter ?? encounter;
          if (carried?.surprise && count > 0) {
            const side = carried.surprise.side;
            encounter = beginEncounter(encounter, { surprise: side ?? 'none', thrown: carried.surprise.thrown, dice: createDice() }).encounter;
            begun = true;
            if (action === 'flee') {
              for (const id of placedIds) {
                try { encounter = declareEncounterAction(encounter, { action: 'escape', actorId: id }).encounter ?? encounter; } catch { /* surprised: it cannot act */ }
              }
            }
          }
          persist([encounter]);
          if (animals.pending?.actorId === actor.identity.id) {
            registry.put(withAnimalState(resolved.campaign, { pending: null }));
            reload();
          }
          const fleeing = action === 'flee' ? (begun ? ' It is fleeing: escape is declared for round 1.' : ' It is fleeing: declare escape on round 1.') : action === 'nothing' ? ' It does nothing unless given orders.' : '';
          const message = `${count} ${actor.identity.name}${count === 1 ? '' : 's'} on the board${count < wanted ? ` (of ${wanted}; the board holds 16 a side)` : ''}.${begun ? ' Round 1 begins.' : carried?.range ? ' Settle surprise to begin.' : ' Throw the range, then begin.'}${fleeing}`;
          if (begun) log('COMBAT', message);
          return finish(message);
        }
        if (command === 'animals:wound-mode') {
          // p.92: rolled once when generated, or every hit if the referee
          // wishes to take the trouble.
          const actor = (resolved.npcActors ?? []).find((entry) => entry.identity.id === value.actorId);
          if (!actor?.animal) throw new Error('choose an animal');
          const woundMode = value.woundMode === 'rolled' ? 'rolled' : 'fixed';
          registry.put(updateNpcActorDocument(actor, { animal: { ...actor.animal, woundMode } }));
          reload();
          return finish(woundMode === 'rolled' ? `${actor.identity.name} rolls its wounds every hit.` : `${actor.identity.name} inflicts its fixed wound.`);
        }
        throw new Error(`unknown command: ${command}`);
      }
      // v0.299.0: the reaction throw (Book 3 p.22-23), for one NPC actor or a
      // statblock, or for a fight's whole opposition ("one throw is
      // sufficient to determine the reaction of an entire group").
      if (command === 'reaction:throw' || command === 'reaction:attack') {
        const value = fight?.value ?? {};
        const key = String(value.key ?? '');
        if (!/^(actor|fight):.+/.test(key)) throw new Error('throw a reaction for whom?');
        const label = value.label ? String(value.label) : key;
        const reactions = { ...(resolved.campaign.roster?.reactions ?? {}) };
        let message;
        if (command === 'reaction:throw') {
          const speaker = value.speakerId ? (resolved.characters ?? []).find((entry) => entry.identity.id === value.speakerId) ?? null : null;
          const { profile } = currentWorldProfile(resolved, subsector);
          const modifiers = reactionModifiers({ speaker, population: profile?.population ?? null, deal: Boolean(value.deal), refereeDM: Number.parseInt(value.dm ?? 0, 10) || 0 });
          const result = rollReaction(createDice(), { dm: modifiers.dm });
          const previous = reactions[key] ?? null;
          const date = formatCampaignDate(resolved.campaign.time);
          reactions[key] = {
            label, speakerName: speaker?.identity.name ?? null, date, dice: [...result.dice], roll: result.roll,
            dm: modifiers.dm, parts: modifiers.parts, total: result.total, tableTotal: result.tableTotal,
            description: result.description, attackOn: reactionAttackTarget(result.tableTotal), attack: null,
            throws: (previous?.throws ?? 0) + 1
          };
          const dmText = modifiers.parts.length ? ` ${modifiers.parts.map((part) => `${part.dm > 0 ? '+' : '\u2212'}${Math.abs(part.dm)} ${part.label}`).join(', ')}` : '';
          const natural = result.roll === 2 || result.roll === 12 ? ' (a natural ' + result.roll + ': no DMs)' : '';
          message = `Reaction \u00b7 ${label}${speaker ? `, dealing with ${speaker.identity.name}` : ''}: 2D [${result.dice.join(' ')}] = ${result.roll}${dmText}${natural} \u2192 ${result.tableTotal}: ${result.description}${previous ? ' (thrown again)' : ''} (Book 3 p.23)`;
        } else {
          const current = reactions[key];
          if (!current?.attackOn) throw new Error('that reaction does not call for an attack throw');
          const dice = createDice();
          const roll = dice.roll2D6();
          const attacks = roll.total >= current.attackOn;
          reactions[key] = { ...current, attack: { dice: [...roll.dice], total: roll.total, attacks } };
          message = `Reaction \u00b7 ${label}: hostile, attacks on ${current.attackOn}+ \u2014 2D [${roll.dice.join(' ')}] = ${roll.total}: ${attacks ? 'they attack.' : 'they hold off, for now.'}`;
        }
        registry.put({ ...resolved.campaign, roster: { ...resolved.campaign.roster, reactions } });
        reload();
        // The referee's to know; the players see what the NPCs do.
        log('ENCOUNTER', message, { visibility: 'referee' });
        lastMessage = { ok: true, message, reaction: reactions[key] };
        onChange();
        saveToCloud();
        return lastMessage;
      }
      // v0.285.0: a player's character leaves the campaign — removed by the
      // referee, or its player gone. It goes home with its published sheet;
      // the campaign may keep a copy, unowned, as the referee's own. Not in
      // the middle of a fight: that waits until the fight ends.
      if (command === 'character:release') {
        const id = fight?.id;
        const character = (resolved.characters ?? []).find((entry) => entry.identity.id === id);
        if (!character) throw new Error('that character is not in this campaign');
        const busy = (resolved.encounters ?? []).some((encounter) => (encounter.status === 'active' || encounter.status === 'setup')
          && (encounter.combatants ?? []).some((entry) => entry.id === id));
        if (busy) throw new Error(`${character.identity.name} is in a fight; this happens when the fight ends`);
        let campaign = resolved.campaign;
        const documents = [];
        if (fight?.value?.keepCopy) {
          const clone = JSON.parse(JSON.stringify(character));
          clone.identity = { ...clone.identity, id: stableDocumentId('char', `${id}\u0000kept\u0000${Date.now()}`), name: `${character.identity.name || 'Unnamed'} (kept)` };
          const copy = importCharacterDocument(clone);
          const inParty = campaign.party.characterIds.includes(id) && campaign.party.characterIds.length === 1;
          campaign = addCharacterToCampaign(campaign, copy, { active: inParty, makeActive: false });
          campaign = setCharacterFolders(campaign, { [copy.identity.id]: characterFolder(resolved.campaign, id) });
          documents.push(copy);
        }
        campaign = removeCharacterFromCampaign(campaign, id);
        registry.putAll([...documents, campaign]);
        registry.remove(id);
        reload();
        const message = `${character.identity.name} leaves the campaign${fight?.value?.keepCopy ? '; a copy stays in Actors' : ''}.`;
        log('SYSTEM', message);
        lastMessage = { ok: true, message };
        onChange();
        saveToCloud();
        return lastMessage;
      }
      if (command === 'players:approve') {
        const on = Boolean(fight?.value);
        registry.put({ ...resolved.campaign, roster: { ...resolved.campaign.roster, approvePlayers: on } });
        reload();
        onChange();
        saveToCloud();
        return { ok: true, message: on ? 'Players who open your link wait for your approval.' : 'Players who open your link join at once.' };
      }
      // v0.282.0: the referee's Clear reaches the players' chat too. Nothing
      // is deleted (Export still has everything); the time is kept on the
      // campaign and published, and each page hides what came before it.
      if (command === 'chat:clear') {
        const at = String(fight?.value ?? '');
        if (at && !Number.isFinite(Date.parse(at))) throw new Error('clear up to when?');
        const campaign = { ...resolved.campaign, roster: { ...resolved.campaign.roster, chatClearedAt: at || null } };
        registry.put(campaign);
        reload();
        onChange();
        saveToCloud();
        return { ok: true, message: '' };
      }
      if (command === 'chat:say') {
        const text = String(fight?.value ?? '').trim();
        if (!text) throw new Error('say something');
        const speakerId = fight?.speakerId ?? null;
        const roll = /^\/(?:r|roll)\s+(.+)$/i.exec(text);
        if (roll) {
          const result = rollDiceExpression(roll[1], createDice());
          log('ROLL', `${result.expression}: ${result.detail} = ${result.total}`, { sourceActorId: speakerId });
        } else {
          log('CHAT', text, { sourceActorId: speakerId });
        }
        // v0.276.0: and to the players, whose pages read the shared chat.
        const speaker = speakerId ? [...(resolved.characters ?? []), ...(resolved.npcActors ?? [])].find((entry) => entry.identity.id === speakerId)?.identity.name : null;
        sendCloudChat(roll ? (resolved.activityLogs?.[0]?.entries?.at(-1)?.message ?? text) : text, { name: speaker ?? 'Referee' });
        // Not lastMessage: that is the notice at the top of the now column,
        // and a chat line is already in the chat. Saying it twice read as a
        // status report ("Rolled 18.") about something the page did.
        onChange();
        saveToCloud();
        return { ok: true, message: '' };
      }
      // v0.255.0: a weapon can be chosen while the board is being set up as
      // well as during the fight, so this sits outside both groups.
      if (command === 'fight:weapon') {
        const encounter = liveEncounter() ?? setupEncounter();
        if (!encounter) throw new Error('no fight is running');
        const result = setCombatantWeapon(encounter, { combatantId: fight?.value?.combatantId, weaponKey: fight?.value?.weaponKey });
        persist([result.encounter]);
        lastMessage = { ok: true, message: result.entry?.text ?? 'No change.' };
        if (result.entry) log('COMBAT', result.entry.text);
        onChange();
        saveToCloud();
        return lastMessage;
      }
      // v0.257.0: armour on the board is for the referee to set — not
      // because Book 1 lets anyone change armour mid-fight, but so the table
      // shows what each combatant is wearing (Kurt, Sep 2026: players who see
      // marines in battle dress choose their fights differently).
      if (command === 'fight:armor') {
        const encounter = liveEncounter() ?? setupEncounter();
        if (!encounter) throw new Error('no fight is running');
        const result = setCombatantArmor(encounter, { combatantId: fight?.value?.combatantId, armor: fight?.value?.armor });
        persist([result.encounter]);
        lastMessage = { ok: true, message: result.entry?.text ?? 'No change.' };
        if (result.entry) log('COMBAT', result.entry.text);
        onChange();
        saveToCloud();
        return lastMessage;
      }
      if (command === 'fight:dismiss') {
        // v0.252.1: the referee has seen how it ended; back to the campaign.
        concludedEncounterId = null;
        lastMessage = { ok: true, message: 'Fight closed.' };
        onChange();
        return lastMessage;
      }
      if (command.startsWith('fight:')) {
        let message;
        let alreadyLogged = false;
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
        } else if (verb === 'avoid') {
          // Book 1 p.28: a party holding surprise "may always avoid an
          // encounter by so stating" — no throw. avoidEncounter has been in
          // the engine since v0.96.0 with nothing calling it.
          const next = avoidEncounter(encounter, { date: resolved.campaign.time });
          persist([next]);
          message = 'The party uses its surprise to avoid the encounter.';
          log('COMBAT', message);
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
          const before = (staged.history ?? []).length;
          const result = resolveDeclaredRound(staged, { dice: createDice(), date: resolved.campaign.time, playerAllocatesWounds: true });
          persist([result.encounter]);
          // v0.256.0: one short chat line per thing that happened this round,
          // each opening with the round (Kurt, Sep 2026: "a massive blob of
          // text"). Two faults made the blob: every attack's full dice
          // breakdown went into chat, and the filter took every history entry
          // numbered this round — which, for a fight set up by hand, also
          // swept up the placements and the start of the fight. Only entries
          // this resolve added are reported now; the full breakdown stays in
          // the encounter's own history.
          const added = (result.encounter.history ?? []).slice(before);
          const names = new Map(result.encounter.combatants.map((entry) => [entry.id, entry.name]));
          const lines = added.map((entry) => ({ entry, line: conciseCombatLine(entry, staged.round, names) })).filter((item) => item.line);
          // v0.257.0: moves are their own category, MOVEMENT, so the chat can
          // leave them out when Kurt's "combat messages" setting is terse —
          // the band line already shows where everyone is. Each line carries
          // the full working (the throw and every DM) as its detail, for
          // hover or tap.
          for (const { entry, line } of lines) {
            log(entry.kind === 'movement' ? 'MOVEMENT' : 'COMBAT', line, { detail: entry.kind === 'attack' ? combatDetail(entry) : entry.text || null });
          }
          for (const line of refused) log('COMBAT', `Round ${staged.round} \u00b7 not declared: ${line}`);
          alreadyLogged = true;
          message = lines.length ? `Round ${staged.round} resolved.` : `Round ${staged.round}: nothing happened.`;
          if (result.encounter.status !== 'active') concludedEncounterId = result.encounter.identity.id;
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
        // v0.261.0: however the fight ended — the last foe down, an escape,
        // avoided, or the referee ending it — its wounds go to the characters.
        const settled = (resolved.encounters ?? []).find((entry) => entry.identity.id === encounter.identity.id);
        if (settled && settled.status !== 'active') {
          const changed = writeFightToCharacters(settled);
          if (changed.length) persist(changed);
        }
        if (!alreadyLogged) log('COMBAT', message);
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
          // Where each ship came from, so shipfight:end can write its last
          // position and vector back onto the scene.
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
      } else if (command === 'shipfight:vector-fire') {
        // The player's own shot, one explicit step — not autoAdvanceShipFight,
        // for the same reason shipfight:vector-advance below avoids it: that
        // loop has no idea this is a vector fight and would run straight
        // through phases this command deliberately leaves the referee to
        // step through by hand.
        if (!pendingShipFight) throw new Error('no ship fight is under way');
        const encounter = pendingShipFight.encounter;
        if (encounter.spatialMode !== 'vector') throw new Error('this fight has no vector plot');
        const phaseKey = currentPhase(encounter).key;
        if (phaseKey !== 'laser-fire' && phaseKey !== 'return-fire') throw new Error(`weapons do not fire during ${currentPhase(encounter).label}`);
        if (actingSide(encounter) !== pendingShipFight.playerSide) throw new Error("it is not your side's turn to fire this phase");
        const foe = encounter.participants.find((entry) => entry.id !== 'player' && !entry.escaped);
        if (!foe) throw new Error('no target to fire at');
        const allocations = laserAllocationAgainstSingleFoe(encounter, 'player', foe.id);
        if (!allocations.length) throw new Error('no operational laser turret can fire');
        const dice = createDice();
        let combat = allocateLaserFire(encounter, allocations);
        const resolved = resolveLaserFire(combat, dice);
        combat = creditEscapeShots(resolved.encounter, resolved.shots);
        const narrated = narrateShots(resolved.shots, combat);
        pendingShipFight = { ...pendingShipFight, encounter: combat, log: [...pendingShipFight.log, ...narrated].slice(-40) };
        message = narrated.join(' ') || 'No shots landed.';
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
        // The player's own shot is shipfight:vector-fire, a separate explicit
        // step — this command never fires it for them. But with only one
        // ship per side and no player on the other one, the opponent has no
        // way to take its own laser-fire/return-fire turn at all unless
        // something resolves it. So: leaving a laser-fire or return-fire
        // phase where the OPPONENT was the one entitled to act auto-resolves
        // their shot first, one single-ship allocation against the one foe,
        // using the same shipCombatIntent Book 3 p.29 shape the abbreviated
        // flow's own NPC branch already uses (autoAdvanceShipFight, ship-
        // arrival-combat.js) — copied inline rather than reached into,
        // since that whole function is exactly the loop this command exists
        // to avoid. The player's own phase is never touched here; only
        // stepping past it unfired is (still) on them via Fire vs. Advance.
        if (!pendingShipFight) throw new Error('no ship fight is under way');
        if (pendingShipFight.encounter.spatialMode !== 'vector') throw new Error('this fight has no vector plot');
        if (pendingShipFight.encounter.outcome !== 'in-progress') throw new Error('the fight has already ended');
        const dice = createDice();
        let combat = pendingShipFight.encounter;
        const narrated = [];
        const phaseKey = currentPhase(combat).key;
        // Kurt, Sep 2026: an NPC flies its ship rather than drifting. Before
        // the movement phase ends (advanceShipCombatPhase would auto-coast
        // every unmoved ship), each phasing ship the player does not control
        // plots the thrust shipVectorManeuver works out from its Book 3 p.29
        // intent — closing to attack, or opening the range to run. A refusal
        // (no maneuver program, a course into the world) is not an error: the
        // ship coasts, exactly as it did before.
        if (phaseKey === 'movement' && actingSide(combat) !== pendingShipFight.playerSide) {
          for (const entry of combat.participants) {
            if (entry.id === 'player' || entry.side !== combat.phasingSide) continue;
            if (entry.escaped || entry.surrendered) continue;
            if (combat.spatial.ships[entry.id]?.movedTurn === combat.gameTurn) continue;
            try {
              const plotted = shipVectorManeuver(combat, entry.id, dice);
              if (!plotted.acceleration.x && !plotted.acceleration.y) continue;
              combat = commitShipVector(combat, entry.id, plotted.acceleration, dice);
              const g = (Math.hypot(plotted.acceleration.x, plotted.acceleration.y) / 2).toFixed(1);
              narrated.push(`${entry.name} thrusts ${g} G (${plotted.intent.replace('-', ' ')}).`);
            } catch { /* it coasts, as it always did */ }
          }
        }
        if ((phaseKey === 'laser-fire' || phaseKey === 'return-fire') && actingSide(combat) !== pendingShipFight.playerSide) {
          const shooter = combat.participants.find((entry) => entry.side === actingSide(combat) && !entry.escaped && !entry.surrendered);
          const foe = shooter ? combat.participants.find((entry) => entry.side !== shooter.side && !entry.escaped) : null;
          if (shooter && foe) {
            const intent = shipCombatIntent(combat, shooter.id, dice);
            if (['press-attack', 'disable-drives'].includes(intent.intent)) {
              const allocations = laserAllocationAgainstSingleFoe(combat, shooter.id, foe.id);
              if (allocations.length) {
                combat = allocateLaserFire(combat, allocations);
                const resolved = resolveLaserFire(combat, dice);
                combat = creditEscapeShots(resolved.encounter, resolved.shots);
                narrated.push(...narrateShots(resolved.shots, combat));
              }
            }
          }
        }
        if (combat.outcome === 'in-progress') combat = advanceShipCombatPhase(combat, { dice });
        pendingShipFight = { ...pendingShipFight, encounter: combat, log: [...pendingShipFight.log, ...narrated].slice(-40) };
        message = [
          ...narrated,
          combat.outcome !== 'in-progress' ? `The fight is over (${combat.outcome}).` : `Advancing to ${currentPhase(combat).label}, turn ${combat.gameTurn}.`
        ].join(' ');
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
          disengaged: `${pendingShipFight.opponentLabel} broke off.`,
          escaped: `${pendingShipFight.opponentLabel} is out of detection range and gone.`
        }[pendingShipFight.encounter.outcome] ?? `The fight with ${pendingShipFight.opponentLabel} is over (${pendingShipFight.encounter.outcome}).`;
        // v0.246.0: the ships go back on the scene where the fight left them
        // (space-scene-combat.js, v0.166.0). A scene deleted mid-fight, or a
        // fight sprung by an arrival roll with no scene, writes nothing.
        const changed = finalPlayerShip ? [finalPlayerShip] : [];
        const link = pendingShipFight.sceneLink;
        const stagedOn = link ? (resolved.scenes ?? []).find((entry) => entry.identity.id === link.sceneId) : null;
        if (stagedOn && pendingShipFight.encounter.spatialMode === 'vector') {
          changed.push(writeSpaceCombatToScene(stagedOn, pendingShipFight.encounter, link).scene);
        }
        if (changed.length) persist(changed);
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

  api = {
    connect, run, saveToCloud, reload,
    // v0.276.0: the multiplayer channels, driven by the page's listeners.
    applyPlayerDeclarations, applyPlayerWoundAllocations, setCloudChat,
    // v0.275.0: for the page's Rest dialog.
    restCandidates: () => restCandidates(),
    // v0.262.0: the whole chat, not the last 300 the screen keeps, for Export.
    chatTranscript({ seat = 'referee' } = {}) {
      return { campaignName: resolved.campaign.identity.name, date: formatCampaignDate(resolved.campaign.time), lines: chatStream(resolved, seat, { limit: 0 }) };
    },
    get arrivalEncounter() { return pendingArrivalEncounter; },
    dismissArrivalEncounter() { pendingArrivalEncounter = null; onChange(); },
    get resolved() { return resolved; },
    get revision() { return revision; },
    get save() { return save; },
    get lastMessage() { return lastMessage; },
    view({ seat = 'referee', characterId = null, selectedSystemId = null, selectedFighterId = null, referee = {}, staging = null, sheets = [] } = {}) {
      const state = buildPlayViewState(resolved, { subsector, seat, characterId });
      state.chat = mergedChat(state.chat ?? []);
      state.compendium = compendiumView(resolved, subsector);
      // v0.302.0: where the party is, for the animal checks (referee only).
      state.animals = seat === 'player' ? null : animalSurfaceView(resolved, currentWorldProfile(resolved, subsector).system);
      state.referee = refereeView(resolved, referee);
      // v0.249.0: open sheets ride alongside whatever the screen is showing —
      // a fight, staging or the port — because that is what a panel floating
      // over the page means. A sheet whose document has been deleted drops out.
      state.sheets = sheetViews(resolved, sheets, { subsector });
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
      // v0.246.0: staging a scene is what is happening, the same way a fight
      // is. It was a row inside the 420px referee drawer, where a 400" board
      // got 361px and every control appeared twice (the imported board draws
      // its own). A fight in progress outranks it: you cannot stage the scene
      // you are already fighting on.
      if (staging?.sceneId && !pendingShipFight) {
        const view = buildStagingView(resolved, staging.sceneId, { intruder: staging.intruder ?? 'opposition' });
        if (view) {
          return {
            ...state,
            situation: { kind: 'staging', title: 'Staging', detail: view.sceneName },
            staging: { ...view, pressurised: Boolean(staging.pressurised), writable: save.state !== 'stale' },
            save, notice: lastMessage
          };
        }
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
          const awaitingFireDecision = !ended && (phase.key === 'laser-fire' || phase.key === 'return-fire')
            && actingSide(encounter) === pendingShipFight.playerSide;
          const phaseActions = awaitingFireDecision ? shipCombatPhaseActions(encounter) : null;
          const playerFireActions = (phaseActions?.actions ?? []).filter((entry) => entry.shipId === 'player' && (entry.kind === 'fire' || entry.kind === 'return-fire'));
          // v0.247.0: the p.23 turn track, so the screen shows where in the
          // sequence play is rather than one phase name. Five phases per
          // player turn, the intruder's first.
          const track = SHIP_COMBAT_PHASES.map((entry, index) => ({
            key: entry.key, label: entry.label, letter: 'ABCDE'[index],
            acting: entry.actor === 'phasing' ? encounter.phasingSide : opposingSide(encounter.phasingSide),
            current: index === encounter.phaseIndex
          }));
          vector = {
            phaseKey: phase.key,
            intruderSide: encounter.intruderSide ?? 'intruder',
            track,
            // The ships as p.24 data cards, with the enemy's reduced to what
            // has actually been seen.
            dataCards: encounter.participants.map((entry) => ({
              shipId: entry.id, name: entry.name, side: entry.side, own: entry.id === 'player',
              card: entry.id === 'player' ? shipDataCard(entry) : null,
              observed: entry.id === 'player' ? null : {
                armedTurrets: shipFightRoster(encounter).find((row) => row.shipId === entry.id)?.armedTurrets ?? 0,
                damage: shipStateDamageSummary(entry.ship)
              }
            })),
            phasingSide: encounter.phasingSide,
            playerSide: pendingShipFight.playerSide,
            // True exactly when commitShipVector would accept a move for
            // 'player' right now — the same condition the command itself
            // checks, read here instead of duplicated.
            awaitingMovement: !ended && phase.key === 'movement'
              && encounter.phasingSide === pendingShipFight.playerSide
              && mySpatial.movedTurn !== encounter.gameTurn,
            // Same idea for shipfight:vector-fire: true exactly when it
            // would accept a shot right now. A toothless ship still "awaits"
            // the decision (there's a phase to get past) but canFire is false,
            // the same distinction the abbreviated flow's canFire/Hold
            // relabelling already makes.
            awaitingFireDecision,
            // v0.246.0: asked of the engine, not guessed from the roster —
            // shipCombatPhaseActions knows a turret that has fired this
            // phase is spent, so the button goes once the shot is taken.
            canFire: awaitingFireDecision && playerFireActions.length > 0,
            hasFired: awaitingFireDecision && (player.spentThisPhase?.weapons?.length ?? 0) > 0,
            // Why not, in the engine's own words — "no operational turret
            // can fire" was shown even in the return-fire phase, where the
            // real reason is usually that nobody fired at you (p.30).
            fireBlockedReason: playerFireActions.length ? null : phaseActions?.reason ?? null,
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
      // v0.252.1: and a fight that has just ended stays on screen, concluded,
      // until the referee closes it — the aftermath is still what is
      // happening. Only a fight that ended by itself does this; ending one
      // deliberately (End fight, avoiding it) goes straight back.
      const active = (resolved.encounters ?? []).find((entry) => entry.status === 'active')
        ?? (resolved.encounters ?? []).find((entry) => entry.status === 'setup')
        ?? null;
      const ended = !active && concludedEncounterId
        ? (resolved.encounters ?? []).find((entry) => entry.identity.id === concludedEncounterId) ?? null
        : null;
      const live = active ?? ended;
      // v0.267.0: NPC actors too, so an actor's carried weapons are offered
      // in the fight's weapon column the way a character's are.
      const fight = fightView(live, { characters: resolved.characters ?? [], actors: resolved.npcActors ?? [], concluded: Boolean(ended) });
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
            // v0.260.0: everything client/wound-dialog.js's prompt needs, so
            // the play page can draw the groups and the preview. It carried
            // only the dice before, and play.html drew no controls at all.
            wound: {
              key: wound.key, defenderId: wound.defender?.id ?? null, defenderName: wound.defender?.name ?? null,
              attackerName: wound.attackerName, damageDice: [...wound.damageDice], modifier: wound.modifier, woundGroups: wound.woundGroups ? [...wound.woundGroups] : null,
              weaponName: wound.weaponName, current: { ...(wound.defender?.current ?? {}) }, remaining: wound.remaining ?? 1
            },
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
          encounterId: fight.encounterId,
          fighters: fight.fighters,
          declaredList: fight.declaredList,
          setup: fight.setup,
          casualties: fight.casualties,
          round: fight.round,
          situation: fight.situation,
          lastRound: fight.lastRound,
          scene: { ...fight.scene, selected: selectedFighterId ?? fight.scene.selected },
          next,
          refereeActions: ended
            ? [{ command: 'fight:dismiss', label: 'Leave the fight' }]
            : live.status === 'setup' ? (writable ? [{ command: 'fight:discard', label: 'Clear board' }] : [])
              : writable ? [{ command: 'fight:end', label: 'End fight' }] : [],
          concluded: ended ? {
            ...fightConclusion(ended),
            // v0.307.0: dead animals, for butchering (p.92).
            encounterId: ended.identity.id,
            carcasses: ended.combatants.filter((entry) => entry.animal && entry.status === 'dead').map((entry) => ({
              id: entry.id, name: entry.name, destroyed: Boolean(entry.animal.destroyed),
              butchered: animalState(resolved.campaign).butchered[`${ended.identity.id}|${entry.id}`] ?? null
            }))
          } : null,
          // v0.254.0: the board is open and being filled; nobody has thrown
          // for surprise and no round has begun.
          setupPhase: live.status === 'setup',
          // v0.271.0: Book 1 p.27's range, while the board is being set.
          // v0.299.0: the opposition's reaction, one throw for the group.
          // v0.305.0: animals answer to their own attack/flee throw (The
          // Traveller Book p.95), not to the reaction table for people.
          fightReaction: (() => {
            const foes = fight.fighters.filter((entry) => entry.side !== 'party');
            const pendingAnimals = Boolean(animalState(resolved.campaign).pending?.actorId);
            if (foes.length ? foes.every((entry) => entry.animal) : pendingAnimals) return null;
            return reactionView(resolved, `fight:${live.identity.id}`, 'the opposition');
          })(),
          openingRange: live.status === 'setup' ? (() => {
            const party = fight.fighters.filter((entry) => entry.side === 'party');
            const foes = fight.fighters.filter((entry) => entry.side !== 'party');
            const gap = party.length && foes.length ? Math.min(...party.flatMap((mine) => foes.map((foe) => Math.abs(Number(mine.band ?? 0) - Number(foe.band ?? 0))))) : null;
            const set = [...(live.history ?? [])].reverse().find((entry) => entry.round === 0 && entry.kind === 'range') ?? null;
            return {
              now: gap === null ? null : rangeBandForBandGap(gap).replace('-', ' '),
              set: set?.text ?? null,
              terrains: Object.entries(TERRAIN_DMS).map(([key, dm]) => ({ key, name: `${sentenceCase(key.replace('-', ' '))} (${dm > 0 ? '+' : dm < 0 ? '\u2212' : '\u00b1'}${Math.abs(dm)})` }))
            };
          })() : null,
          // v0.252.0: Book 1 p.27's procedure, as a strip across the top of
          // the fight. Steps 1 to 3 run once per encounter and were reported
          // only as a sentence of prose; step 3 — escape and avoidance — had
          // no UI at all, though the engine has done both since v0.96.0.
          encounterSteps: encounterStepStrip(fight, resolved, writable),
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
  return api;
}

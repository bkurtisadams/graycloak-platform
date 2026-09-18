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
  canShipMakeJump, getPersonalWeapon, getSubsectorSystem, jumpDistanceBetweenSystems, parseUniversalWorldProfile,
  payCurrentBerthing, purchaseShipFuel, starportFuelService
} from '../vendor/classic-traveller-rules/index.js';
import { addActivityLogToCampaign, campaignIsPublished, markCampaignPublished, refreshCampaignDocumentRefs, setCampaignOwner } from './campaign-document.js';
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

export function characterView(document) {
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
    blows: null
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
  const roster = (party.length ? party : characters).map(characterView);
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
    referee: refereeView(resolved)
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
  return {
    ship, system, profile, portCall, fuelService, destination,
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

  let jump;
  if (!destination) jump = { figure: 'No destination yet', copy: 'Pick a world on the map first.' };
  else if (!destination.reachable) jump = { figure: `${destination.name} is ${destination.distance} parsecs`, copy: `Beyond this ship\u2019s Jump-${ship.specifications.drives.jump.rating}.` };
  else if (destination.fuel && !destination.fuel.allowed) jump = { figure: `${destination.name}: short of fuel`, copy: `The jump needs ${destination.fuel.requirement?.totalTons ?? '?'} t; ${destination.fuel.availableTons ?? fuel.aboard} t aboard.` };
  else if (facts.berthingOwed) jump = { figure: `${destination.name}: berthing unpaid`, copy: 'Pay berthing before departure.' };
  else jump = { figure: `${destination.name}, ${destination.distance} parsec${destination.distance === 1 ? '' : 's'}`, copy: 'Ready to go. Freight, passengers and departure are still run from the current client; they arrive on this page next.' };
  steps.push({ id: 'jump', title: 'Depart', state: 'blocked', cite: 'Book 2 p.5', ...jump });

  const first = steps.find((step) => step.state === 'ready');
  const next = facts.fight
    ? { title: 'A fight is in progress', copy: 'Finish it in the current client. This page leaves the campaign alone while a fight is running.', actions: [] }
    : first
      ? { title: first.title, copy: first.copy, cite: first.cite, actions: [act(first.command, first.verb, first.figure)].filter(Boolean) }
      : !destination
        ? { title: 'Choose a destination', copy: `Worlds within Jump-${ship.specifications.drives.jump.rating} of ${system.name} are marked on the map. Freight and passengers are offered per destination.`, cite: 'Book 2 p.8', actions: [] }
        : { title: `Bound for ${destination.name}`, copy: jump.copy, cite: 'Book 2 p.5', actions: [] };
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
  function run(command) {
    try {
      if (save.state === 'stale') throw new Error('this campaign was changed elsewhere; reload first');
      const facts = portFacts(resolved, subsector, null);
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

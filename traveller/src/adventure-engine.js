import {
  createAdventureThreadDocument,
  addAdventureThreadClue,
  updateAdventureThreadObjective,
  linkAdventureThreadDocument,
  appendAdventureThreadHistory
} from './adventure-thread-document.js';
import { createContactDocument, touchContactDocument } from './contact-document.js';
import { createContractDocument } from './contract-document.js';
import { assertValidAdventureDefinition } from './adventure-definition.js';

function cloneJson(value) { return JSON.parse(JSON.stringify(value)); }
function cloneList(values = []) { return values.map(cloneJson); }
function resolvedDate(situation) { return situation.timing.resolvedDate ?? situation.timing.createdDate; }
function upsertById(documents, document) {
  const next = documents.filter((entry) => entry.identity.id !== document.identity.id);
  next.push(document);
  return next;
}
function findById(values, id) { return values.find((entry) => entry.id === id) ?? null; }

export function adventureThreadKey(campaign, definition) {
  return `${campaign.identity.id}|adventure|${definition.identity.id}`;
}

export function adventureContactKey(campaign, definition, contactRef) {
  return `${campaign.identity.id}|adventure|${definition.identity.id}|contact|${contactRef}`;
}

export function adventureContractOfferId(campaign, definition, contractRef) {
  return `${campaign.identity.id}|adventure|${definition.identity.id}|contract|${contractRef}`;
}

export function adventureSceneRulesBasis(definition, sceneRef) {
  return `${definition.provenance.rulesBasis}:scene:${sceneRef}`;
}

function findThread(threads, campaign, definition) {
  const keys = [adventureThreadKey(campaign, definition)];
  for (const suffix of definition.thread.legacyKeySuffixes ?? []) keys.push(`${campaign.identity.id}|${suffix}`);
  return threads.find((entry) => keys.includes(entry.provenance.threadKey)) ?? null;
}

function sceneForRef(definition, sceneRef) {
  return findById(definition.scenes, sceneRef);
}

function contactForRef(definition, contactRef) {
  return findById(definition.contacts, contactRef);
}

function contractForRef(definition, contractRef) {
  return findById(definition.contracts, contractRef);
}

function sceneMatchesSituation(definition, scene, situation) {
  if (!scene) return false;
  if (situation.provenance?.rulesBasis === adventureSceneRulesBasis(definition, scene.id)) return true;
  return Array.isArray(scene.legacyTitles) && scene.legacyTitles.includes(situation.identity?.title);
}

function ruleMatches({ definition, rule, campaign, situation, threads, character, ship }) {
  const when = rule.when ?? {};
  const scene = when.sceneRef ? sceneForRef(definition, when.sceneRef) : null;
  if (when.sceneRef && !sceneMatchesSituation(definition, scene, situation)) return false;
  if (when.choiceId !== undefined && situation.resolution?.choiceId !== when.choiceId) return false;
  if (when.success !== undefined && situation.resolution?.success !== when.success) return false;
  if (when.status !== undefined && situation.status !== when.status) return false;
  if (when.systemId !== undefined && situation.location?.systemId !== when.systemId) return false;
  if (when.requiresThread === true && !findThread(threads, campaign, definition)) return false;
  if (when.requiresThread === false && findThread(threads, campaign, definition)) return false;
  if (when.hasCharacter === true && !character?.identity?.id) return false;
  if (when.hasCharacter === false && character?.identity?.id) return false;
  if (when.hasShip === true && !ship?.identity?.id) return false;
  if (when.hasShip === false && ship?.identity?.id) return false;
  return true;
}

function outcomeText(action, situation) {
  if (typeof action.text === 'string') return action.text;
  const outcome = action.textByOutcome ?? {};
  if (situation.resolution?.success === true && typeof outcome.success === 'string') return outcome.success;
  if (situation.resolution?.success === false && typeof outcome.failure === 'string') return outcome.failure;
  return String(outcome.default ?? '');
}

function sceneActor(definition, scene) {
  if (scene.actor) return cloneJson(scene.actor);
  if (!scene.actorRef) return null;
  const contact = contactForRef(definition, scene.actorRef);
  if (!contact) return null;
  return {
    name: contact.name,
    type: contact.role,
    reaction: contact.standing ?? null
  };
}

export function instantiateAdventureScene({
  definition,
  sceneRef,
  eventKey,
  location,
  createdDate,
  kind = 'thread-follow-up'
} = {}) {
  assertValidAdventureDefinition(definition);
  const scene = sceneForRef(definition, sceneRef);
  if (!scene) throw new TypeError(`unknown adventure scene: ${sceneRef}`);
  if (!location?.systemId || !location?.systemName) throw new TypeError('location requires systemId and systemName');
  return Object.freeze({
    kind: scene.kind ?? kind,
    eventKey,
    rulesBasis: adventureSceneRulesBasis(definition, scene.id),
    setting: definition.provenance.setting,
    title: scene.title,
    location: { systemId: location.systemId, systemName: location.systemName },
    createdDate: { year: createdDate.year, dayOfYear: createdDate.dayOfYear },
    actor: sceneActor(definition, scene),
    summary: scene.summary,
    detail: scene.detail,
    choices: Object.freeze(scene.choices.map((choice) => Object.freeze(cloneJson(choice)))),
    notes: String(scene.notes ?? '')
  });
}

export function generateAdventureArrivalOffer({ definitions = [], campaign, system, ship, eventKeyForSystem } = {}) {
  if (!Array.isArray(definitions)) throw new TypeError('definitions must be an array');
  for (const definition of definitions) {
    assertValidAdventureDefinition(definition);
    const scene = definition.scenes.find((entry) => entry.arrivalSystemId === system?.id);
    if (!scene) continue;
    const eventKey = typeof eventKeyForSystem === 'function'
      ? eventKeyForSystem({ campaign, system, ship })
      : `${campaign.identity.id}|${system.id}|adventure-arrival|${definition.identity.id}|${scene.id}`;
    return instantiateAdventureScene({
      definition,
      sceneRef: scene.id,
      eventKey,
      location: { systemId: system.id, systemName: system.name },
      createdDate: { year: campaign.time.year, dayOfYear: campaign.time.dayOfYear },
      kind: 'arrival-event'
    });
  }
  return null;
}

function ensureThread({ definition, campaign, situation, threads }) {
  let thread = findThread(threads, campaign, definition);
  if (thread) return thread;
  const seed = definition.thread;
  const date = resolvedDate(situation);
  return createAdventureThreadDocument({
    threadKey: adventureThreadKey(campaign, definition),
    title: seed.title,
    createdDate: date,
    origin: seed.origin,
    objective: seed.objective ?? '',
    targetSystemId: seed.targetSystemId ?? null,
    targetSystemName: seed.targetSystemName ?? '',
    rulesBasis: definition.provenance.rulesBasis,
    setting: definition.provenance.setting,
    situationIds: [situation.identity.id],
    history: seed.historyStart ? [{ date, kind: 'started', text: seed.historyStart }] : [],
    notes: seed.notes ?? ''
  });
}

function ensureContact({ definition, contactRef, campaign, situation, contacts }) {
  const spec = contactForRef(definition, contactRef);
  if (!spec) throw new TypeError(`unknown adventure contact: ${contactRef}`);
  const key = adventureContactKey(campaign, definition, contactRef);
  const date = resolvedDate(situation);
  let contact = contacts.find((entry) => entry.provenance.contactKey === key) ?? null;
  if (!contact) {
    contact = contacts.find((entry) => entry.identity?.name === spec.name
      && entry.profile?.role === (spec.role ?? 'Contact')
      && entry.home?.systemId === spec.homeSystem.systemId) ?? null;
  }
  if (!contact) {
    contact = createContactDocument({
      contactKey: key,
      name: spec.name,
      role: spec.role ?? 'Contact',
      type: spec.type ?? 'private',
      homeSystem: spec.homeSystem,
      firstMetDate: date,
      standing: spec.standing ?? 'neutral',
      relationshipNotes: spec.relationshipNotes ?? '',
      sourceSituationId: situation.identity.id,
      rulesBasis: definition.provenance.rulesBasis,
      setting: definition.provenance.setting,
      notes: spec.notes ?? ''
    });
  } else {
    contact = touchContactDocument(contact, {
      date,
      standing: spec.standing ?? contact.relationship.standing,
      relationshipNotes: spec.relationshipNotes ?? contact.relationship.notes
    });
  }
  return contact;
}

function createAdventureContract({ definition, contractRef, campaign, situation, character, ship, contracts }) {
  if (!character?.identity?.id || !ship?.identity?.id) return null;
  const spec = contractForRef(definition, contractRef);
  if (!spec) throw new TypeError(`unknown adventure contract: ${contractRef}`);
  const offerId = adventureContractOfferId(campaign, definition, contractRef);
  const legacyOfferIds = (spec.legacyOfferSuffixes ?? []).map((suffix) => `${campaign.identity.id}|${suffix}`);
  const existing = contracts.find((entry) => entry.provenance.offerId === offerId || legacyOfferIds.includes(entry.provenance.offerId));
  if (existing) return existing;
  const issuerContact = spec.issuerContactRef ? contactForRef(definition, spec.issuerContactRef) : null;
  return createContractDocument({
    offerId,
    kind: spec.kind,
    title: spec.title,
    rulesBasis: definition.provenance.rulesBasis,
    setting: definition.provenance.setting,
    issuerName: issuerContact?.name ?? spec.issuerName ?? 'Undisclosed Principal',
    issuerType: issuerContact?.role ?? spec.issuerType ?? 'private',
    originSystemId: spec.origin.systemId,
    originSystemName: spec.origin.systemName,
    destinationSystemId: spec.destination.systemId,
    destinationSystemName: spec.destination.systemName,
    deadlineDays: spec.deadlineDays,
    paymentCr: spec.paymentCr,
    cargoTons: spec.cargoTons,
    exclusiveShip: Boolean(spec.exclusiveShip),
    requirementsDescription: spec.requirementsDescription ?? '',
    notes: `${spec.notes ?? ''}${spec.notes ? ' ' : ''}Adventure definition ${definition.identity.id}.`
  }, {
    acceptedByCharacterId: character.identity.id,
    acceptedShipId: ship.identity.id,
    acceptedDate: resolvedDate(situation)
  });
}

function applyRuleActions({ definition, rule, campaign, situation, state, character, ship }) {
  const date = resolvedDate(situation);
  for (const action of rule.actions) {
    let thread = findThread(state.threads, campaign, definition);

    if (action.type === 'ensure-thread') {
      thread = ensureThread({ definition, campaign, situation, threads: state.threads });
      state.threads = upsertById(state.threads, thread);
      continue;
    }

    if (action.type === 'link-situation') {
      if (!thread) continue;
      thread = linkAdventureThreadDocument(thread, { situationId: situation.identity.id, date });
      state.threads = upsertById(state.threads, thread);
      continue;
    }

    if (action.type === 'add-clue') {
      if (!thread) continue;
      const text = outcomeText(action, situation);
      if (!text) continue;
      thread = addAdventureThreadClue(thread, {
        id: action.id,
        label: action.label,
        text,
        sourceSituationId: situation.identity.id,
        date
      });
      state.threads = upsertById(state.threads, thread);
      continue;
    }

    if (action.type === 'set-objective') {
      if (!thread) continue;
      thread = updateAdventureThreadObjective(thread, {
        text: action.text,
        targetSystemId: action.targetSystemId ?? null,
        targetSystemName: action.targetSystemName ?? '',
        date
      });
      state.threads = upsertById(state.threads, thread);
      continue;
    }

    if (action.type === 'add-history') {
      if (!thread) continue;
      thread = appendAdventureThreadHistory(thread, { date, kind: action.kind, text: action.text });
      state.threads = upsertById(state.threads, thread);
      continue;
    }

    if (action.type === 'ensure-contact') {
      const contact = ensureContact({ definition, contactRef: action.contactRef, campaign, situation, contacts: state.contacts });
      state.contacts = upsertById(state.contacts, contact);
      if (thread && action.linkToThread !== false) {
        thread = linkAdventureThreadDocument(thread, { contactId: contact.identity.id, date });
        state.threads = upsertById(state.threads, thread);
      }
      continue;
    }

    if (action.type === 'create-follow-up') {
      const scene = sceneForRef(definition, action.sceneRef);
      if (!scene) throw new TypeError(`unknown adventure scene: ${action.sceneRef}`);
      state.followUpOffers.push(instantiateAdventureScene({
        definition,
        sceneRef: action.sceneRef,
        eventKey: `${situation.identity.id}|adventure|${definition.identity.id}|scene|${action.sceneRef}`,
        location: action.location ?? situation.location,
        createdDate: date,
        kind: scene.kind ?? 'thread-follow-up'
      }));
      continue;
    }

    if (action.type === 'create-contract') {
      const contract = createAdventureContract({
        definition,
        contractRef: action.contractRef,
        campaign,
        situation,
        character,
        ship,
        contracts: state.contracts
      });
      if (!contract) continue;
      state.contracts = upsertById(state.contracts, contract);
      if (thread && action.linkToThread !== false) {
        thread = linkAdventureThreadDocument(thread, { contractId: contract.identity.id, date });
        state.threads = upsertById(state.threads, thread);
      }
      continue;
    }

    if (action.type === 'emit-event') state.events.push(action.text);
  }
}

export function applyAdventureConsequences({
  definitions = [],
  campaign,
  situation,
  threads = [],
  contacts = [],
  contracts = [],
  character = null,
  ship = null
} = {}) {
  if (!campaign?.identity?.id) throw new TypeError('campaign is required');
  if (!Array.isArray(definitions)) throw new TypeError('definitions must be an array');
  if (!situation?.identity?.id || situation.status === 'active') {
    return Object.freeze({
      threads: Object.freeze(cloneList(threads)),
      contacts: Object.freeze(cloneList(contacts)),
      contracts: Object.freeze(cloneList(contracts)),
      followUpOffers: Object.freeze([]),
      events: Object.freeze([])
    });
  }

  const state = {
    threads: cloneList(threads),
    contacts: cloneList(contacts),
    contracts: cloneList(contracts),
    followUpOffers: [],
    events: []
  };

  for (const definition of definitions) {
    assertValidAdventureDefinition(definition);
    for (const rule of definition.rules) {
      if (!ruleMatches({ definition, rule, campaign, situation, threads: state.threads, character, ship })) continue;
      applyRuleActions({ definition, rule, campaign, situation, state, character, ship });
    }
  }

  return Object.freeze({
    threads: Object.freeze(state.threads),
    contacts: Object.freeze(state.contacts),
    contracts: Object.freeze(state.contracts),
    followUpOffers: Object.freeze(state.followUpOffers),
    events: Object.freeze(state.events)
  });
}

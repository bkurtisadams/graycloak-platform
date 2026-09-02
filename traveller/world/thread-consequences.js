import {
  createAdventureThreadDocument,
  addAdventureThreadClue,
  updateAdventureThreadObjective,
  linkAdventureThreadDocument,
  appendAdventureThreadHistory
} from '../src/adventure-thread-document.js';
import {
  createContactDocument,
  touchContactDocument
} from '../src/contact-document.js';
import { createContractDocument } from '../src/contract-document.js';

const CARRANZA_THREAD_SUFFIX = 'carranza-route';
const MARA_CONTACT_SUFFIX = 'aster|Mara Venn|Scout Archivist';

function cloneList(values = []) { return values.map((entry) => JSON.parse(JSON.stringify(entry))); }
function resolvedDate(situation) { return situation.timing.resolvedDate ?? situation.timing.createdDate; }
function threadKey(campaign) { return `${campaign.identity.id}|${CARRANZA_THREAD_SUFFIX}`; }
function maraContactKey(campaign) { return `${campaign.identity.id}|${MARA_CONTACT_SUFFIX}`; }

function upsertById(documents, document) {
  const next = documents.filter((entry) => entry.identity.id !== document.identity.id);
  next.push(document);
  return next;
}

function findThread(threads, campaign) {
  const key = threadKey(campaign);
  return threads.find((entry) => entry.provenance.threadKey === key) ?? null;
}

function ensureCarranzaThread({ campaign, situation, threads }) {
  let thread = findThread(threads, campaign);
  if (thread) return thread;
  const date = resolvedDate(situation);
  thread = createAdventureThreadDocument({
    threadKey: threadKey(campaign),
    title: 'Carranza Route',
    createdDate: date,
    origin: { systemId: 'cinder', systemName: 'Cinder' },
    objective: 'Examine the recovered beacon payload and determine where its obsolete route code leads.',
    rulesBasis: 'sea-of-suns-original-adventure-thread',
    situationIds: [situation.identity.id],
    history: [{ date, kind: 'started', text: 'An obsolete route-designator family recovered at Cinder suggests that the old charts are not simply wrong.' }],
    notes: 'Aurelia arc seed. The thread name intentionally follows Carranza rather than naming Aurelia outright.'
  });
  return thread;
}

function ensureMaraContact({ campaign, situation, contacts }) {
  const key = maraContactKey(campaign);
  const date = resolvedDate(situation);
  let contact = contacts.find((entry) => entry.provenance.contactKey === key) ?? null;
  if (!contact) {
    contact = createContactDocument({
      contactKey: key,
      name: 'Mara Venn',
      role: 'Scout Archivist',
      type: 'Scout Service',
      homeSystem: { systemId: 'aster', systemName: 'Aster' },
      firstMetDate: date,
      standing: 'friendly',
      relationshipNotes: 'Aster Scout Base archivist with an interest in obsolete survey records.',
      sourceSituationId: situation.identity.id,
      rulesBasis: 'sea-of-suns-original-adventure-contact'
    });
  } else {
    contact = touchContactDocument(contact, { date, standing: 'friendly', relationshipNotes: contact.relationship.notes });
  }
  return contact;
}

function followUpOffer({ situation, title, eventSuffix, actor = null, summary, detail, choices, notes = '' }) {
  return Object.freeze({
    kind: 'thread-follow-up',
    eventKey: `${situation.identity.id}|${eventSuffix}`,
    rulesBasis: 'sea-of-suns-original-thread-consequence',
    setting: 'Sea of Suns',
    title,
    location: { ...situation.location },
    createdDate: resolvedDate(situation),
    actor,
    summary,
    detail,
    choices: Object.freeze(choices.map((choice) => Object.freeze(choice))),
    notes
  });
}

function cinderHeaderFollowUp(situation) {
  return followUpOffer({
    situation,
    title: 'Recovered Survey Header',
    eventSuffix: 'recovered-survey-header',
    summary: 'The usable fragment from Cinder\'s dead beacon contains an old survey header rather than ordinary approach telemetry.',
    detail: 'Two elements survive clearly: the navigator name CARRANZA and the route marker 7-K. A third field appears to reference Aster before Meridian, but the old notation needs comparison against period navigation practice.',
    choices: [
      { id: 'compare-header', label: 'COMPARE / NAVIGATION', action: 'skill-check', skillName: 'Navigation', target: 8, situationalDM: 0, successText: 'Hawkeye confirms that the surviving notation reads CARRANZA / ROUTE 7-K / ASTER BEFORE MERIDIAN. It is a route sequence, not a malformed coordinate.', failureText: 'The exact syntax remains uncertain, but CARRANZA, 7-K, and ASTER are all genuine fields rather than random corruption.', resolutionText: '' },
      { id: 'archive-header', label: 'ARCHIVE FOR LATER', action: 'resolve', skillName: null, target: null, situationalDM: 0, successText: '', failureText: '', resolutionText: 'The recovered header is preserved intact for comparison with Scout archives.' }
    ],
    notes: 'Carranza Route follow-up situation.'
  });
}

function asterCarranzaFollowUp(situation) {
  return followUpOffer({
    situation,
    title: 'The Carranza File',
    eventSuffix: 'carranza-file',
    actor: { name: 'Mara Venn', type: 'Scout Archivist', reaction: 'friendly' },
    summary: 'Mara Venn finds a surviving Aster departure index under Carranza\'s name.',
    detail: 'The record is incomplete. One outbound leg has no modern system identifier and appears only as a navigator-era waypoint. Venn asks Hawkeye to compare the filing conventions before she releases the fragile original.',
    choices: [
      { id: 'read-carranza-file', label: 'COMPARE / NAVIGATION', action: 'skill-check', skillName: 'Navigation', target: 8, situationalDM: 0, successText: 'Hawkeye confirms that the missing destination is deliberate. Beside the unlisted waypoint Carranza wrote a single marginal word: AURELIA?', failureText: 'The destination remains unresolved, but Hawkeye confirms the blank is not a clerical omission. Carranza deliberately recorded the leg under an obsolete waypoint.', resolutionText: '' },
      { id: 'leave-file', label: 'LEAVE FILE SEALED', action: 'decline', skillName: null, target: null, situationalDM: 0, successText: '', failureText: '', resolutionText: 'Hawkeye leaves the fragile Carranza file with Mara Venn.' }
    ],
    notes: 'Carranza Route follow-up at Aster.'
  });
}

function maraRequestFollowUp(situation) {
  return followUpOffer({
    situation,
    title: 'Mara Venn\'s Request',
    eventSuffix: 'mara-venn-request',
    actor: { name: 'Mara Venn', type: 'Scout Archivist', reaction: 'friendly' },
    summary: 'Venn wants a sealed archival query carried to Heliograph, where an older index may identify Carranza\'s unlisted waypoint.',
    detail: 'She can transmit nothing faster than a ship can carry it. The packet is negligible cargo, but she wants a receipt from the Heliograph archive. She offers Cr4,000 on delivery.',
    choices: [
      { id: 'accept-query', label: 'ACCEPT COURIER', action: 'resolve', skillName: null, target: null, situationalDM: 0, successText: '', failureText: '', resolutionText: 'Hawkeye accepts Mara Venn\'s sealed archival query for Heliograph.' },
      { id: 'decline-query', label: 'DECLINE COURIER', action: 'decline', skillName: null, target: null, situationalDM: 0, successText: '', failureText: '', resolutionText: 'Hawkeye declines the paid courier request but keeps his own notes on Carranza\'s waypoint.' }
    ],
    notes: 'Choice can create a persistent Sea of Suns priority-courier contract.'
  });
}

function createMaraCourierContract({ campaign, situation, character, ship, existingContracts }) {
  if (!character?.identity?.id || !ship?.identity?.id) return null;
  const offerId = `${threadKey(campaign)}|mara-heliograph-query`;
  const existing = existingContracts.find((entry) => entry.provenance.offerId === offerId);
  if (existing) return existing;
  return createContractDocument({
    offerId,
    kind: 'priority-courier',
    title: 'Mara Venn\'s Archival Query',
    rulesBasis: 'sea-of-suns-original-thread-consequence',
    setting: 'Sea of Suns',
    issuerName: 'Mara Venn',
    issuerType: 'Scout archivist',
    originSystemId: 'aster',
    originSystemName: 'Aster',
    destinationSystemId: 'heliograph',
    destinationSystemName: 'Heliograph',
    deadlineDays: 42,
    paymentCr: 4000,
    cargoTons: 0,
    exclusiveShip: false,
    requirementsDescription: 'Carry a sealed archival query to the Heliograph archive and obtain a receipt.',
    notes: `Adventure thread ${threadKey(campaign)}.`
  }, {
    acceptedByCharacterId: character.identity.id,
    acceptedShipId: ship.identity.id,
    acceptedDate: resolvedDate(situation)
  });
}

export function applySituationThreadConsequences({
  campaign,
  situation,
  threads = [],
  contacts = [],
  contracts = [],
  character = null,
  ship = null
} = {}) {
  if (!campaign?.identity?.id) throw new TypeError('campaign is required');
  if (!situation?.identity?.id || situation.status === 'active') {
    return Object.freeze({ threads: cloneList(threads), contacts: cloneList(contacts), contracts: cloneList(contracts), followUpOffers: Object.freeze([]), events: Object.freeze([]) });
  }

  let nextThreads = cloneList(threads);
  let nextContacts = cloneList(contacts);
  let nextContracts = cloneList(contracts);
  const followUpOffers = [];
  const events = [];
  const date = resolvedDate(situation);
  let thread = findThread(nextThreads, campaign);

  if (situation.identity.title === 'Dead Approach Beacon' && situation.resolution.choiceId === 'investigate') {
    thread = ensureCarranzaThread({ campaign, situation, threads: nextThreads });
    thread = linkAdventureThreadDocument(thread, { situationId: situation.identity.id, date });
    thread = addAdventureThreadClue(thread, {
      id: 'cinder-obsolete-route-family', label: 'OBSOLETE SURVEY PROTOCOL',
      text: situation.resolution.success === true
        ? 'Cinder\'s dead approach beacon carried a pre-standard survey route-designator family inside its handshake payload.'
        : 'Although the beacon payload was lost, its handshake conclusively used a pre-standard Scout survey protocol no longer found on modern approach systems.',
      sourceSituationId: situation.identity.id, date
    });
    if (situation.resolution.success === true) {
      thread = updateAdventureThreadObjective(thread, {
        text: 'Examine the recovered survey header and determine where Route 7-K went next.',
        targetSystemId: 'cinder', targetSystemName: 'Cinder', date
      });
      followUpOffers.push(cinderHeaderFollowUp(situation));
      events.push('CARRANZA ROUTE STARTED / obsolete route family recovered');
    } else {
      thread = updateAdventureThreadObjective(thread, {
        text: 'Ask Aster Scout Base to identify the obsolete survey protocol seen at Cinder.',
        targetSystemId: 'aster', targetSystemName: 'Aster', date
      });
      events.push('CARRANZA ROUTE STARTED / obsolete Scout survey protocol identified');
    }
    thread = appendAdventureThreadHistory(thread, { date, kind: 'clue', text: 'Cinder\'s dead beacon established that pre-standard Scout survey records still survive in the Far Meridian.' });
    nextThreads = upsertById(nextThreads, thread);
  }

  if (situation.identity.title === 'Recovered Survey Header' && thread) {
    thread = linkAdventureThreadDocument(thread, { situationId: situation.identity.id, date });
    if (situation.resolution.choiceId === 'compare-header') {
      thread = addAdventureThreadClue(thread, {
        id: 'carranza-route-7k', label: 'CARRANZA / ROUTE 7-K',
        text: situation.resolution.success === true
          ? 'The header reads CARRANZA / ROUTE 7-K / ASTER BEFORE MERIDIAN. The fields describe an old route sequence rather than a bad coordinate.'
          : 'The damaged header preserves CARRANZA, ROUTE 7-K, and ASTER as genuine fields, although the exact syntax remains uncertain.',
        sourceSituationId: situation.identity.id, date
      });
    }
    thread = updateAdventureThreadObjective(thread, {
      text: 'Reach Aster Scout Base and compare Route 7-K with archived survey records.',
      targetSystemId: 'aster', targetSystemName: 'Aster', date
    });
    thread = appendAdventureThreadHistory(thread, { date, kind: 'objective', text: 'Aster Scout Base became the next useful comparison point for Route 7-K.' });
    nextThreads = upsertById(nextThreads, thread);
    events.push('CARRANZA ROUTE / objective updated: Aster Scout Base');
  }

  if (situation.identity.title === 'Scout Archive Recorder' && situation.resolution.choiceId === 'investigate' && thread) {
    const mara = ensureMaraContact({ campaign, situation, contacts: nextContacts });
    nextContacts = upsertById(nextContacts, mara);
    thread = linkAdventureThreadDocument(thread, { situationId: situation.identity.id, contactId: mara.identity.id, date });
    thread = addAdventureThreadClue(thread, {
      id: 'aster-obsolete-index', label: 'ASTER SURVEY INDEX',
      text: situation.resolution.success === true
        ? 'Aster\'s recovered recorder contains obsolete route annotations matching the family seen in the Cinder beacon.'
        : 'The recorder itself remains unreadable, but Mara Venn recognizes the Cinder protocol family and locates a paper departure index from the same archival period.',
      sourceSituationId: situation.identity.id, date
    });
    thread = updateAdventureThreadObjective(thread, {
      text: 'Review Carranza\'s archived departure record with Mara Venn at Aster Scout Base.',
      targetSystemId: 'aster', targetSystemName: 'Aster', date
    });
    nextThreads = upsertById(nextThreads, thread);
    followUpOffers.push(asterCarranzaFollowUp(situation));
    events.push('CONTACT ADDED / Mara Venn / Aster Scout Base');
  }

  if (situation.identity.title === 'The Carranza File' && thread) {
    const mara = ensureMaraContact({ campaign, situation, contacts: nextContacts });
    nextContacts = upsertById(nextContacts, mara);
    thread = linkAdventureThreadDocument(thread, { situationId: situation.identity.id, contactId: mara.identity.id, date });
    if (situation.resolution.choiceId === 'read-carranza-file') {
      if (situation.resolution.success === true) {
        thread = addAdventureThreadClue(thread, {
          id: 'aurelia-marginal-note', label: 'AURELIA?',
          text: 'Carranza\'s last Aster departure record names an unlisted intermediate waypoint. A handwritten marginal note beside it reads: AURELIA?',
          sourceSituationId: situation.identity.id, date
        });
        events.push('CLUE ADDED / AURELIA? / Carranza departure record');
      } else {
        thread = addAdventureThreadClue(thread, {
          id: 'carranza-unlisted-waypoint', label: 'UNLISTED WAYPOINT',
          text: 'Carranza\'s Aster departure record deliberately substitutes an obsolete waypoint for a modern system identifier; the marginal annotation cannot yet be read with confidence.',
          sourceSituationId: situation.identity.id, date
        });
        events.push('CLUE ADDED / Carranza unlisted waypoint');
      }
      thread = updateAdventureThreadObjective(thread, {
        text: 'Decide whether to carry Mara Venn\'s archival query to Heliograph.',
        targetSystemId: 'aster', targetSystemName: 'Aster', date
      });
      followUpOffers.push(maraRequestFollowUp(situation));
    } else {
      thread = updateAdventureThreadObjective(thread, {
        text: 'Continue tracing Carranza\'s unlisted waypoint from the surviving Aster index.',
        targetSystemId: null, targetSystemName: '', date
      });
    }
    nextThreads = upsertById(nextThreads, thread);
  }

  if (situation.identity.title === 'Mara Venn\'s Request' && thread) {
    const mara = ensureMaraContact({ campaign, situation, contacts: nextContacts });
    nextContacts = upsertById(nextContacts, mara);
    thread = linkAdventureThreadDocument(thread, { situationId: situation.identity.id, contactId: mara.identity.id, date });
    if (situation.resolution.choiceId === 'accept-query' && situation.status === 'resolved') {
      const contract = createMaraCourierContract({ campaign, situation, character, ship, existingContracts: nextContracts });
      if (contract) {
        nextContracts = upsertById(nextContracts, contract);
        thread = linkAdventureThreadDocument(thread, { contractId: contract.identity.id, date });
        thread = updateAdventureThreadObjective(thread, {
          text: 'Deliver Mara Venn\'s sealed archival query to Heliograph and compare Carranza\'s waypoint against the older index.',
          targetSystemId: 'heliograph', targetSystemName: 'Heliograph', date
        });
        events.push('CONTRACT CREATED / Mara Venn\'s Archival Query / Heliograph');
      }
    } else {
      thread = updateAdventureThreadObjective(thread, {
        text: 'Trace Carranza\'s unlisted waypoint independently.',
        targetSystemId: null, targetSystemName: '', date
      });
      events.push('CARRANZA ROUTE / courier request declined');
    }
    nextThreads = upsertById(nextThreads, thread);
  }

  if (situation.identity.title === 'Misfiled Survey Index' && situation.resolution.success === true && thread) {
    thread = linkAdventureThreadDocument(thread, { situationId: situation.identity.id, date });
    thread = addAdventureThreadClue(thread, {
      id: 'heliograph-navigator-waypoint', label: 'HELIOGRAPH WAYPOINT INDEX',
      text: 'Heliograph confirms that one old route waypoint was indexed under a navigator\'s name instead of a modern system designation, matching Carranza\'s era.',
      sourceSituationId: situation.identity.id, date
    });
    thread = updateAdventureThreadObjective(thread, {
      text: 'Determine which unlisted system matches Carranza\'s waypoint and the marginal Aurelia reference.',
      targetSystemId: null, targetSystemName: '', date
    });
    nextThreads = upsertById(nextThreads, thread);
    events.push('CLUE ADDED / Heliograph waypoint index');
  }

  return Object.freeze({
    threads: Object.freeze(nextThreads),
    contacts: Object.freeze(nextContacts),
    contracts: Object.freeze(nextContracts),
    followUpOffers: Object.freeze(followUpOffers),
    events: Object.freeze(events)
  });
}

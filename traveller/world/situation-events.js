import { requireDice } from '../../packages/classic-traveller-rules/index.js';

function dateLabelFromCampaign(campaign) {
  return `${String(campaign.time.dayOfYear).padStart(3, '0')}-${campaign.time.year}`;
}

function portCallLabel(campaign, ship) {
  return ship?.state?.portCall?.arrivalDate || dateLabelFromCampaign(campaign);
}

export function arrivalSituationEventKey({ campaign, system, ship }) {
  return `${campaign.identity.id}|${system.id}|${portCallLabel(campaign, ship)}|arrival-situation`;
}

export function patronSituationEventKey({ campaign, system, ship }) {
  return `${campaign.identity.id}|${system.id}|${portCallLabel(campaign, ship)}|patron-contact`;
}

const AUTHORED_ARRIVAL_EVENTS = Object.freeze({
  cinder: Object.freeze({
    title: 'Dead Approach Beacon',
    summary: 'Cinder traffic control reports that an obsolete approach beacon has begun transmitting again.',
    detail: 'The signal is weak, intermittent, and formatted in a survey protocol older than the current Far Meridian route standards. Port personnel are treating it as failing hardware.',
    skillName: 'Electronics',
    target: 8,
    successText: 'Hawkeye separates the beacon failure from its payload. Buried in the old handshake is a route-designator family no longer used on modern charts. The code is worth preserving for later comparison.',
    failureText: 'The transmission collapses into noise before Hawkeye can separate the old route data from the beacon fault.'
  }),
  aster: Object.freeze({
    title: 'Scout Archive Recorder',
    summary: 'Aster Scout Base has an old survey recorder that refuses to index correctly.',
    detail: 'The base technician recognizes Marisol as a reserve Scout vessel and asks whether Hawkeye can take a quick look before the recorder is written off.',
    skillName: 'Electronics',
    target: 8,
    successText: 'The recorder yields a partial index of obsolete route annotations. Most are routine, but several use naming conventions predating the modern subsector charts.',
    failureText: 'The recorder remains unreadable. The technician tags it for depot-level recovery instead.'
  }),
  heliograph: Object.freeze({
    title: 'Misfiled Survey Index',
    summary: 'A Heliograph archive clerk notices Hawkeye studying an obsolete route index.',
    detail: 'One entry describes a waypoint by an old navigator\'s name rather than a modern system designation. The clerk cannot place it on any current chart.',
    skillName: 'Navigation',
    target: 8,
    successText: 'Hawkeye recognizes the notation as an older route convention rather than a bad coordinate. The entry is copied into his working notes for later cross-reference.',
    failureText: 'The notation remains ambiguous. It could be a person, a waypoint, or merely an archival filing code.'
  }),
  vesper: Object.freeze({
    title: 'Conflicting Port Notices',
    summary: 'Two Vesper authorities have posted incompatible approach instructions for the same orbital corridor.',
    detail: 'Following the wrong notice would put Marisol into a jurisdictional dispute before she even reaches the berth.',
    skillName: 'Navigation',
    target: 7,
    successText: 'Hawkeye reconstructs which notice reflects the current traffic solution and avoids the disputed corridor.',
    failureText: 'The notices remain contradictory. The safest course is to request explicit clearance and accept the delay.'
  })
});

const GENERIC_ARRIVAL_EVENTS = Object.freeze([
  Object.freeze({
    title: 'Faulty Cargo Transponder',
    summary: 'A nearby cargo container is broadcasting an invalid transponder identity.',
    detail: 'The dock crew asks whether Marisol can identify whether the fault is accidental before customs seals the entire transfer area.',
    skillName: 'Electronics', target: 8,
    successText: 'The transponder fault is isolated to a damaged identity module. The dock crew can clear the rest of the transfer area.',
    failureText: 'The conflicting identity packets cannot be resolved locally, and customs seals the container for inspection.'
  }),
  Object.freeze({
    title: 'Air/Raft Steering Fault',
    summary: 'A port utility air/raft has developed a control fault beside Marisol\'s berth.',
    detail: 'The vehicle is grounded until someone can identify whether the fault is mechanical or control-system related.',
    skillName: 'Mechanical', target: 8,
    successText: 'Hawkeye traces the problem to a mechanical linkage rather than the flight electronics and gets the utility craft moving again.',
    failureText: 'The fault resists a quick field diagnosis. The port crew tow the vehicle away for a full maintenance check.'
  }),
  Object.freeze({
    title: 'Survey Coordinate Discrepancy',
    summary: 'Local traffic control flags a small mismatch between two published orbital survey references.',
    detail: 'The discrepancy is harmless at normal approach speeds but matters to ships using older route data.',
    skillName: 'Navigation', target: 8,
    successText: 'Hawkeye identifies which reference frame produced the mismatch and notes the correction.',
    failureText: 'The competing survey references cannot be reconciled without better archival data.'
  })
]);

export function generateArrivalSituationOffer({ campaign, system, ship, dice }) {
  requireDice(dice);
  if (!campaign?.identity?.id || !campaign?.time) throw new TypeError('campaign is required');
  if (!system?.id || !system?.name) throw new TypeError('system is required');

  const authored = AUTHORED_ARRIVAL_EVENTS[system.id];
  let event = authored;
  if (!event) {
    // Sea of Suns campaign cadence: not every port call creates an adventure beat.
    // The event chance is original setting logic, not a Classic Traveller table.
    const eventRoll = dice.rollD6();
    if (eventRoll > 2) return null;
    event = GENERIC_ARRIVAL_EVENTS[dice.rollD6() % GENERIC_ARRIVAL_EVENTS.length];
  }

  return Object.freeze({
    kind: 'arrival-event',
    eventKey: arrivalSituationEventKey({ campaign, system, ship }),
    rulesBasis: 'sea-of-suns-original-arrival-event',
    setting: 'Sea of Suns',
    title: event.title,
    location: { systemId: system.id, systemName: system.name },
    createdDate: { year: campaign.time.year, dayOfYear: campaign.time.dayOfYear },
    actor: null,
    summary: event.summary,
    detail: event.detail,
    choices: Object.freeze([
      Object.freeze({
        id: 'investigate',
        label: `INVESTIGATE / ${event.skillName.toUpperCase()}`,
        action: 'skill-check',
        skillName: event.skillName,
        target: event.target,
        situationalDM: 0,
        successText: event.successText,
        failureText: event.failureText,
        resolutionText: ''
      }),
      Object.freeze({
        id: 'ignore',
        label: 'IGNORE',
        action: 'decline',
        skillName: null,
        target: null,
        situationalDM: 0,
        successText: '',
        failureText: '',
        resolutionText: 'Hawkeye leaves the matter to local authorities.'
      })
    ]),
    notes: 'Original Sea of Suns arrival situation.'
  });
}

const PATRON_TASKS = Object.freeze([
  Object.freeze({
    skillName: 'Navigation', target: 8,
    request: 'The patron has a route fragment that does not agree with the current charts and wants an independent reading.',
    successText: 'Hawkeye finds a consistent interpretation of the route fragment and identifies where the modern chart diverged.',
    failureText: 'The fragment cannot be reconciled confidently with the available navigation data.'
  }),
  Object.freeze({
    skillName: 'Electronics', target: 8,
    request: 'The patron carries a damaged data module recovered from an older ship and wants to know whether anything can still be read from it.',
    successText: 'Hawkeye recovers a partial data block and enough metadata to establish that the module is genuine.',
    failureText: 'The module remains unreadable without specialized recovery equipment.'
  }),
  Object.freeze({
    skillName: 'Mechanical', target: 8,
    request: 'The patron needs a second opinion on a small but expensive mechanical failure before authorizing a replacement assembly.',
    successText: 'Hawkeye isolates the fault to a repairable component rather than the entire assembly.',
    failureText: 'The failure cannot be narrowed down with the tools immediately available.'
  }),
  Object.freeze({
    skillName: 'Grav Vehicle', target: 7,
    request: 'The patron wants a discreet assessment of a grav vehicle route that local drivers say has become unsafe.',
    successText: 'Hawkeye identifies the real handling hazard and a safer approach.',
    failureText: 'The route remains questionable without a longer field survey.'
  })
]);

export function buildPatronSituationOffer({ campaign, system, ship, contact, dice }) {
  requireDice(dice);
  if (!campaign?.identity?.id || !campaign?.time) throw new TypeError('campaign is required');
  if (!system?.id || !system?.name) throw new TypeError('system is required');
  if (!contact || typeof contact.available !== 'boolean') throw new TypeError('contact result is required');
  const eventKey = patronSituationEventKey({ campaign, system, ship });
  const createdDate = { year: campaign.time.year, dayOfYear: campaign.time.dayOfYear };

  if (!contact.available) {
    return Object.freeze({
      kind: 'patron-contact', eventKey,
      rulesBasis: 'classic-traveller-book-3-patron-table-graycloak-port-call-cadence', setting: 'Sea of Suns',
      title: 'No Patron Contact', location: { systemId: system.id, systemName: system.name }, createdDate,
      actor: null,
      summary: 'No potential patron is encountered during this port call.',
      detail: `Book 3 patron availability roll: ${contact.availabilityRoll}. Rolls of 5 or 6 indicate no patron.`,
      choices: [], status: 'resolved',
      resolution: { date: createdDate, choiceId: null, success: null, roll: null, notes: 'No patron encountered.' },
      notes: 'Book 3 patron availability, using a Graycloak once-per-port-call cadence instead of explicit weekly downtime.'
    });
  }

  if (contact.rumor) {
    const task = PATRON_TASKS[0];
    return Object.freeze({
      kind: 'rumor', eventKey,
      rulesBasis: 'classic-traveller-book-3-patron-table-graycloak-port-call-cadence', setting: 'Sea of Suns',
      title: 'Rumor', location: { systemId: system.id, systemName: system.name }, createdDate,
      actor: null,
      summary: 'A piece of navigational gossip is circulating around the port instead of a conventional patron offer.',
      detail: 'The story concerns an obsolete route designation appearing in records that should have been standardized generations ago.',
      choices: Object.freeze([
        Object.freeze({ id: 'follow-up', label: 'FOLLOW UP / NAVIGATION', action: 'skill-check', skillName: task.skillName, target: task.target, situationalDM: 0, successText: task.successText, failureText: task.failureText, resolutionText: '' }),
        Object.freeze({ id: 'dismiss', label: 'DISMISS RUMOR', action: 'decline', skillName: null, target: null, situationalDM: 0, successText: '', failureText: '', resolutionText: 'The rumor is left behind with the rest of the port gossip.' })
      ]),
      notes: 'Book 3 explicitly treats Rumor results as absent patrons that impart information.'
    });
  }

  const patronType = contact.patron.type;
  const reactionText = `${contact.reaction.total} / ${contact.reaction.description}`;
  if (!contact.suitable) {
    if (contact.reaction.tableTotal <= 5) {
      return Object.freeze({
        kind: 'patron-contact', eventKey,
        rulesBasis: 'classic-traveller-book-3-patron-table-graycloak-port-call-cadence', setting: 'Sea of Suns',
        title: `Hostile Contact / ${patronType}`, location: { systemId: system.id, systemName: system.name }, createdDate,
        actor: { name: `A ${patronType}`, type: patronType, reaction: reactionText },
        summary: `The potential ${patronType.toLowerCase()} patron reacts with hostility rather than offering work.`,
        detail: `Reaction ${reactionText}. Personal encounter or combat resolution is deliberately deferred until that rules slice exists.`,
        choices: [],
        notes: 'Book 3 patron type and reaction. Hostile reaction remains unresolved because v0.12.0 does not yet implement personal encounter/combat resolution.'
      });
    }
    return Object.freeze({
      kind: 'patron-contact', eventKey,
      rulesBasis: 'classic-traveller-book-3-patron-table-graycloak-port-call-cadence', setting: 'Sea of Suns',
      title: `Patron Contact / ${patronType}`, location: { systemId: system.id, systemName: system.name }, createdDate,
      actor: { name: `A ${patronType}`, type: patronType, reaction: reactionText },
      summary: `A potential ${patronType.toLowerCase()} patron makes contact but decides not to proceed.`,
      detail: `Reaction ${reactionText}. The patron does not judge the party suitable for the proposed task.`,
      choices: [], status: 'resolved',
      resolution: { date: createdDate, choiceId: null, success: false, roll: null, notes: 'Patron declined to offer the task.' },
      notes: 'Book 3 patron type and reaction; Graycloak port-call cadence.'
    });
  }

  const task = PATRON_TASKS[(dice.rollD6() - 1) % PATRON_TASKS.length];
  return Object.freeze({
    kind: 'patron-contact', eventKey,
    rulesBasis: 'classic-traveller-book-3-patron-table-graycloak-port-call-cadence', setting: 'Sea of Suns',
    title: `Patron Contact / ${patronType}`, location: { systemId: system.id, systemName: system.name }, createdDate,
    actor: { name: `A ${patronType}`, type: patronType, reaction: reactionText },
    summary: `A ${patronType.toLowerCase()} patron decides Hawkeye may be useful.`,
    detail: `${task.request} Reaction ${reactionText}.`,
    choices: Object.freeze([
      Object.freeze({ id: 'assist', label: `ASSIST / ${task.skillName.toUpperCase()}`, action: 'skill-check', skillName: task.skillName, target: task.target, situationalDM: 0, successText: task.successText, failureText: task.failureText, resolutionText: '' }),
      Object.freeze({ id: 'decline', label: 'DECLINE', action: 'decline', skillName: null, target: null, situationalDM: 0, successText: '', failureText: '', resolutionText: 'Hawkeye declines the patron\'s request.' })
    ]),
    notes: 'Book 3 patron type and suitability reaction; task content is original Sea of Suns material.'
  });
}

import {
  ADVENTURE_DEFINITION_TYPE,
  CURRENT_ADVENTURE_DEFINITION_SCHEMA_VERSION,
  assertValidAdventureDefinition
} from '../../../src/adventure-definition.js';

const choice = (value) => Object.freeze(value);
const scene = (value) => Object.freeze({ ...value, choices: Object.freeze(value.choices.map(choice)) });
const rule = (value) => Object.freeze({ ...value, when: Object.freeze(value.when), actions: Object.freeze(value.actions.map((action) => Object.freeze(action))) });

export const CARRANZA_ROUTE_ADVENTURE = Object.freeze(assertValidAdventureDefinition({
  documentType: ADVENTURE_DEFINITION_TYPE,
  schemaVersion: CURRENT_ADVENTURE_DEFINITION_SCHEMA_VERSION,
  identity: Object.freeze({ id: 'sea-of-suns.carranza-route', title: 'Carranza Route' }),
  provenance: Object.freeze({
    setting: 'Sea of Suns',
    rulesBasis: 'sea-of-suns-adventure-carranza-route'
  }),
  thread: Object.freeze({
    title: 'Carranza Route',
    origin: Object.freeze({ systemId: 'cinder', systemName: 'Cinder' }),
    objective: 'Examine the recovered beacon payload and determine where its obsolete route code leads.',
    targetSystemId: null,
    targetSystemName: '',
    historyStart: 'An obsolete route-designator family recovered at Cinder suggests that the old charts are not simply wrong.',
    notes: 'Aurelia arc seed. The thread name intentionally follows Carranza rather than naming Aurelia outright.',
    legacyKeySuffixes: Object.freeze(['carranza-route'])
  }),
  contacts: Object.freeze([
    Object.freeze({
      id: 'mara-venn',
      name: 'Mara Venn',
      role: 'Scout Archivist',
      type: 'Scout Service',
      homeSystem: Object.freeze({ systemId: 'aster', systemName: 'Aster' }),
      standing: 'friendly',
      relationshipNotes: 'Aster Scout Base archivist with an interest in obsolete survey records.',
      notes: ''
    })
  ]),
  scenes: Object.freeze([
    scene({
      id: 'dead-approach-beacon',
      kind: 'arrival-event',
      arrivalSystemId: 'cinder',
      legacyTitles: ['Dead Approach Beacon'],
      title: 'Dead Approach Beacon',
      summary: 'Cinder traffic control reports that an obsolete approach beacon has begun transmitting again.',
      detail: 'The signal is weak, intermittent, and formatted in a survey protocol older than the current Far Meridian route standards. Port personnel are treating it as failing hardware.',
      choices: [
        { id: 'investigate', label: 'INVESTIGATE / ELECTRONICS', action: 'skill-check', skillName: 'Electronics', target: 8, situationalDM: 0, successText: 'Hawkeye separates the beacon failure from its payload. Buried in the old handshake is a route-designator family no longer used on modern charts. The code is worth preserving for later comparison.', failureText: 'The transmission collapses into noise before Hawkeye can separate the old route data from the beacon fault.', resolutionText: '' },
        { id: 'ignore', label: 'IGNORE', action: 'decline', skillName: null, target: null, situationalDM: 0, successText: '', failureText: '', resolutionText: 'Hawkeye leaves the matter to local authorities.' }
      ],
      notes: 'Original Sea of Suns arrival situation and Carranza Route entry point.'
    }),
    scene({
      id: 'scout-archive-recorder',
      kind: 'arrival-event',
      arrivalSystemId: 'aster',
      legacyTitles: ['Scout Archive Recorder'],
      actorRef: 'mara-venn',
      title: 'Scout Archive Recorder',
      summary: 'Aster Scout Base has an old survey recorder that refuses to index correctly.',
      detail: 'The base technician recognizes Marisol as a reserve Scout vessel and asks whether Hawkeye can take a quick look before the recorder is written off.',
      choices: [
        { id: 'investigate', label: 'INVESTIGATE / ELECTRONICS', action: 'skill-check', skillName: 'Electronics', target: 8, situationalDM: 0, successText: 'The recorder yields a partial index of obsolete route annotations. Most are routine, but several use naming conventions predating the modern subsector charts.', failureText: 'The recorder remains unreadable. The technician tags it for depot-level recovery instead.', resolutionText: '' },
        { id: 'ignore', label: 'IGNORE', action: 'decline', skillName: null, target: null, situationalDM: 0, successText: '', failureText: '', resolutionText: 'Hawkeye leaves the matter to local authorities.' }
      ],
      notes: 'Original Sea of Suns arrival situation.'
    }),
    scene({
      id: 'misfiled-survey-index',
      kind: 'arrival-event',
      arrivalSystemId: 'heliograph',
      legacyTitles: ['Misfiled Survey Index'],
      title: 'Misfiled Survey Index',
      summary: 'A Heliograph archive clerk notices Hawkeye studying an obsolete route index.',
      detail: 'One entry describes a waypoint by an old navigator\'s name rather than a modern system designation. The clerk cannot place it on any current chart.',
      choices: [
        { id: 'investigate', label: 'INVESTIGATE / NAVIGATION', action: 'skill-check', skillName: 'Navigation', target: 8, situationalDM: 0, successText: 'Hawkeye recognizes the notation as an older route convention rather than a bad coordinate. The entry is copied into his working notes for later cross-reference.', failureText: 'The notation remains ambiguous. It could be a person, a waypoint, or merely an archival filing code.', resolutionText: '' },
        { id: 'ignore', label: 'IGNORE', action: 'decline', skillName: null, target: null, situationalDM: 0, successText: '', failureText: '', resolutionText: 'Hawkeye leaves the matter to local authorities.' }
      ],
      notes: 'Original Sea of Suns arrival situation.'
    }),
    scene({
      id: 'recovered-survey-header',
      kind: 'thread-follow-up',
      legacyTitles: ['Recovered Survey Header'],
      title: 'Recovered Survey Header',
      summary: 'The usable fragment from Cinder\'s dead beacon contains an old survey header rather than ordinary approach telemetry.',
      detail: 'Two elements survive clearly: the navigator name CARRANZA and the route marker 7-K. A third field appears to reference Aster before Meridian, but the old notation needs comparison against period navigation practice.',
      choices: [
        { id: 'compare-header', label: 'COMPARE / NAVIGATION', action: 'skill-check', skillName: 'Navigation', target: 8, situationalDM: 0, successText: 'Hawkeye confirms that the surviving notation reads CARRANZA / ROUTE 7-K / ASTER BEFORE MERIDIAN. It is a route sequence, not a malformed coordinate.', failureText: 'The exact syntax remains uncertain, but CARRANZA, 7-K, and ASTER are all genuine fields rather than random corruption.', resolutionText: '' },
        { id: 'archive-header', label: 'ARCHIVE FOR LATER', action: 'resolve', skillName: null, target: null, situationalDM: 0, successText: '', failureText: '', resolutionText: 'The recovered header is preserved intact for comparison with Scout archives.' }
      ],
      notes: 'Carranza Route follow-up situation.'
    }),
    scene({
      id: 'carranza-file',
      kind: 'thread-follow-up',
      legacyTitles: ['The Carranza File'],
      actorRef: 'mara-venn',
      title: 'The Carranza File',
      summary: 'Mara Venn finds a surviving Aster departure index under Carranza\'s name.',
      detail: 'The record is incomplete. One outbound leg has no modern system identifier and appears only as a navigator-era waypoint. Venn asks Hawkeye to compare the filing conventions before she releases the fragile original.',
      choices: [
        { id: 'read-carranza-file', label: 'COMPARE / NAVIGATION', action: 'skill-check', skillName: 'Navigation', target: 8, situationalDM: 0, successText: 'Hawkeye confirms that the missing destination is deliberate. Beside the unlisted waypoint Carranza wrote a single marginal word: AURELIA?', failureText: 'The destination remains unresolved, but Hawkeye confirms the blank is not a clerical omission. Carranza deliberately recorded the leg under an obsolete waypoint.', resolutionText: '' },
        { id: 'leave-file', label: 'LEAVE FILE SEALED', action: 'decline', skillName: null, target: null, situationalDM: 0, successText: '', failureText: '', resolutionText: 'Hawkeye leaves the fragile Carranza file with Mara Venn.' }
      ],
      notes: 'Carranza Route follow-up at Aster.'
    }),
    scene({
      id: 'mara-venn-request',
      kind: 'thread-follow-up',
      legacyTitles: ["Mara Venn's Request"],
      actorRef: 'mara-venn',
      title: "Mara Venn's Request",
      summary: 'Venn wants a sealed archival query carried to Heliograph, where an older index may identify Carranza\'s unlisted waypoint.',
      detail: 'She can transmit nothing faster than a ship can carry it. The packet is negligible cargo, but she wants a receipt from the Heliograph archive. She offers Cr4,000 on delivery.',
      choices: [
        { id: 'accept-query', label: 'ACCEPT COURIER', action: 'resolve', skillName: null, target: null, situationalDM: 0, successText: '', failureText: '', resolutionText: 'Hawkeye accepts Mara Venn\'s sealed archival query for Heliograph.' },
        { id: 'decline-query', label: 'DECLINE COURIER', action: 'decline', skillName: null, target: null, situationalDM: 0, successText: '', failureText: '', resolutionText: 'Hawkeye declines the paid courier request but keeps his own notes on Carranza\'s waypoint.' }
      ],
      notes: 'Choice can create a persistent Sea of Suns priority-courier contract.'
    })
  ]),
  contracts: Object.freeze([
    Object.freeze({
      id: 'mara-heliograph-query',
      kind: 'priority-courier',
      title: "Mara Venn's Archival Query",
      issuerContactRef: 'mara-venn',
      origin: Object.freeze({ systemId: 'aster', systemName: 'Aster' }),
      destination: Object.freeze({ systemId: 'heliograph', systemName: 'Heliograph' }),
      deadlineDays: 42,
      paymentCr: 4000,
      cargoTons: 0,
      exclusiveShip: false,
      requirementsDescription: 'Carry a sealed archival query to the Heliograph archive and obtain a receipt.',
      notes: 'Carranza Route archival courier job.',
      legacyOfferSuffixes: Object.freeze(['carranza-route|mara-heliograph-query'])
    })
  ]),
  rules: Object.freeze([
    rule({
      id: 'cinder-investigation-starts-thread',
      when: { sceneRef: 'dead-approach-beacon', choiceId: 'investigate' },
      actions: [
        { type: 'ensure-thread' },
        { type: 'link-situation' },
        { type: 'add-clue', id: 'cinder-obsolete-route-family', label: 'OBSOLETE SURVEY PROTOCOL', textByOutcome: { success: 'Cinder\'s dead approach beacon carried a pre-standard survey route-designator family inside its handshake payload.', failure: 'Although the beacon payload was lost, its handshake conclusively used a pre-standard Scout survey protocol no longer found on modern approach systems.' } },
        { type: 'add-history', kind: 'clue', text: 'Cinder\'s dead beacon established that pre-standard Scout survey records still survive in the Far Meridian.' }
      ]
    }),
    rule({
      id: 'cinder-success-recovers-header',
      when: { sceneRef: 'dead-approach-beacon', choiceId: 'investigate', success: true, requiresThread: true },
      actions: [
        { type: 'set-objective', text: 'Examine the recovered survey header and determine where Route 7-K went next.', targetSystemId: 'cinder', targetSystemName: 'Cinder' },
        { type: 'create-follow-up', sceneRef: 'recovered-survey-header' },
        { type: 'emit-event', text: 'CARRANZA ROUTE STARTED / obsolete route family recovered' }
      ]
    }),
    rule({
      id: 'cinder-failure-points-to-aster',
      when: { sceneRef: 'dead-approach-beacon', choiceId: 'investigate', success: false, requiresThread: true },
      actions: [
        { type: 'set-objective', text: 'Ask Aster Scout Base to identify the obsolete survey protocol seen at Cinder.', targetSystemId: 'aster', targetSystemName: 'Aster' },
        { type: 'emit-event', text: 'CARRANZA ROUTE STARTED / obsolete Scout survey protocol identified' }
      ]
    }),
    rule({
      id: 'header-links-thread',
      when: { sceneRef: 'recovered-survey-header', requiresThread: true },
      actions: [
        { type: 'link-situation' },
        { type: 'set-objective', text: 'Reach Aster Scout Base and compare Route 7-K with archived survey records.', targetSystemId: 'aster', targetSystemName: 'Aster' },
        { type: 'add-history', kind: 'objective', text: 'Aster Scout Base became the next useful comparison point for Route 7-K.' },
        { type: 'emit-event', text: 'CARRANZA ROUTE / objective updated: Aster Scout Base' }
      ]
    }),
    rule({
      id: 'header-comparison-adds-route-clue',
      when: { sceneRef: 'recovered-survey-header', choiceId: 'compare-header', requiresThread: true },
      actions: [
        { type: 'add-clue', id: 'carranza-route-7k', label: 'CARRANZA / ROUTE 7-K', textByOutcome: { success: 'The header reads CARRANZA / ROUTE 7-K / ASTER BEFORE MERIDIAN. The fields describe an old route sequence rather than a bad coordinate.', failure: 'The damaged header preserves CARRANZA, ROUTE 7-K, and ASTER as genuine fields, although the exact syntax remains uncertain.' } }
      ]
    }),
    rule({
      id: 'aster-recorder-advances-thread',
      when: { sceneRef: 'scout-archive-recorder', choiceId: 'investigate', requiresThread: true },
      actions: [
        { type: 'ensure-contact', contactRef: 'mara-venn' },
        { type: 'link-situation' },
        { type: 'add-clue', id: 'aster-obsolete-index', label: 'ASTER SURVEY INDEX', textByOutcome: { success: 'Aster\'s recovered recorder contains obsolete route annotations matching the family seen in the Cinder beacon.', failure: 'The recorder itself remains unreadable, but Mara Venn recognizes the Cinder protocol family and locates a paper departure index from the same archival period.' } },
        { type: 'set-objective', text: 'Review Carranza\'s archived departure record with Mara Venn at Aster Scout Base.', targetSystemId: 'aster', targetSystemName: 'Aster' },
        { type: 'create-follow-up', sceneRef: 'carranza-file' },
        { type: 'emit-event', text: 'CONTACT ADDED / Mara Venn / Aster Scout Base' }
      ]
    }),
    rule({
      id: 'carranza-file-links-mara',
      when: { sceneRef: 'carranza-file', requiresThread: true },
      actions: [
        { type: 'ensure-contact', contactRef: 'mara-venn' },
        { type: 'link-situation' }
      ]
    }),
    rule({
      id: 'carranza-file-success-clue',
      when: { sceneRef: 'carranza-file', choiceId: 'read-carranza-file', success: true, requiresThread: true },
      actions: [
        { type: 'add-clue', id: 'aurelia-marginal-note', label: 'AURELIA?', text: 'Carranza\'s last Aster departure record names an unlisted intermediate waypoint. A handwritten marginal note beside it reads: AURELIA?' },
        { type: 'emit-event', text: 'CLUE ADDED / AURELIA? / Carranza departure record' }
      ]
    }),
    rule({
      id: 'carranza-file-failure-clue',
      when: { sceneRef: 'carranza-file', choiceId: 'read-carranza-file', success: false, requiresThread: true },
      actions: [
        { type: 'add-clue', id: 'carranza-unlisted-waypoint', label: 'UNLISTED WAYPOINT', text: 'Carranza\'s Aster departure record deliberately substitutes an obsolete waypoint for a modern system identifier; the marginal annotation cannot yet be read with confidence.' },
        { type: 'emit-event', text: 'CLUE ADDED / Carranza unlisted waypoint' }
      ]
    }),
    rule({
      id: 'carranza-file-read-offers-courier',
      when: { sceneRef: 'carranza-file', choiceId: 'read-carranza-file', requiresThread: true },
      actions: [
        { type: 'set-objective', text: 'Decide whether to carry Mara Venn\'s archival query to Heliograph.', targetSystemId: 'aster', targetSystemName: 'Aster' },
        { type: 'create-follow-up', sceneRef: 'mara-venn-request' }
      ]
    }),
    rule({
      id: 'carranza-file-left-sealed',
      when: { sceneRef: 'carranza-file', choiceId: 'leave-file', requiresThread: true },
      actions: [
        { type: 'set-objective', text: 'Continue tracing Carranza\'s unlisted waypoint from the surviving Aster index.', targetSystemId: null, targetSystemName: '' }
      ]
    }),
    rule({
      id: 'mara-request-links-contact',
      when: { sceneRef: 'mara-venn-request', requiresThread: true },
      actions: [
        { type: 'ensure-contact', contactRef: 'mara-venn' },
        { type: 'link-situation' }
      ]
    }),
    rule({
      id: 'mara-request-accepted',
      when: { sceneRef: 'mara-venn-request', choiceId: 'accept-query', status: 'resolved', requiresThread: true, hasCharacter: true, hasShip: true },
      actions: [
        { type: 'create-contract', contractRef: 'mara-heliograph-query' },
        { type: 'set-objective', text: 'Deliver Mara Venn\'s sealed archival query to Heliograph and compare Carranza\'s waypoint against the older index.', targetSystemId: 'heliograph', targetSystemName: 'Heliograph' },
        { type: 'emit-event', text: "CONTRACT CREATED / Mara Venn's Archival Query / Heliograph" }
      ]
    }),
    rule({
      id: 'mara-request-declined',
      when: { sceneRef: 'mara-venn-request', choiceId: 'decline-query', requiresThread: true },
      actions: [
        { type: 'set-objective', text: 'Trace Carranza\'s unlisted waypoint independently.', targetSystemId: null, targetSystemName: '' },
        { type: 'emit-event', text: 'CARRANZA ROUTE / courier request declined' }
      ]
    }),
    rule({
      id: 'heliograph-index-success',
      when: { sceneRef: 'misfiled-survey-index', success: true, requiresThread: true },
      actions: [
        { type: 'link-situation' },
        { type: 'add-clue', id: 'heliograph-navigator-waypoint', label: 'HELIOGRAPH WAYPOINT INDEX', text: 'Heliograph confirms that one old route waypoint was indexed under a navigator\'s name instead of a modern system designation, matching Carranza\'s era.' },
        { type: 'set-objective', text: 'Determine which unlisted system matches Carranza\'s waypoint and the marginal Aurelia reference.', targetSystemId: null, targetSystemName: '' },
        { type: 'emit-event', text: 'CLUE ADDED / Heliograph waypoint index' }
      ]
    })
  ])
}));

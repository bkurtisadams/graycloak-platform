// play-sample.js — the view state the new play page renders, with sample data.
//
// This file is the CONTRACT between the game and the screen. play-views.js
// draws exactly this shape and knows nothing else. Wiring the real game in
// means writing one function, sessionViewState(), that returns this same
// shape from the campaign documents — and then deleting this file. No view
// changes when that happens, which is the whole point: the approved screen
// and the shipped screen are the same code.
//
// Shape:
//   seat        'solo' | 'referee' | 'player'
//   campaign    { name, date }
//   place       { name, detail }
//   character   chip + drawer data for the viewed character
//   ship        chip + drawer data, or null when the party has no ship
//   situation   { kind, title, detail }   kind picks the scene
//   jobs        accepted contracts, always listed first
//   next        the single card that leads the column, or null
//   steps       everything else that can be done now, as one-line rows
//   done        short past-tense strings
//   scene       { kind: 'subsector' | 'jump' | 'bands' | 'plot', ... }
//   chat        recent lines, oldest first

const character = {
  name: 'Hawkeye',
  upp: 'AB5678',
  service: 'Scout, 3 terms, age 30',
  cashCr: 60000,
  status: 'Unwounded',
  hurt: false,
  characteristics: [
    { key: 'STR', now: 10, full: 10 }, { key: 'DEX', now: 11, full: 11 }, { key: 'END', now: 5, full: 5 },
    { key: 'INT', now: 6, full: 6 }, { key: 'EDU', now: 7, full: 7 }, { key: 'SOC', now: 8, full: 8 }
  ],
  skills: ['Pilot-1', 'Navigation-2', 'Electronics-1', 'Mechanical-1', 'Jack-of-all-Trades-2', 'Grav Vehicle-1'],
  weapons: [{ name: 'Laser rifle', note: '+1 DEX 10+' }, { name: 'Blade', note: '' }],
  armor: 'None',
  carrying: '6.0 of 10 kg',
  blows: '5 combat blows'
};

const woundedCharacter = {
  ...character,
  status: 'Wounded',
  hurt: true,
  characteristics: character.characteristics.map((entry) => (entry.key === 'END' ? { ...entry, now: 3 } : entry)),
  blows: '3 combat blows left'
};

const ship = {
  name: 'Marisol',
  kind: 'Type S scout/courier',
  registry: 'S-17384',
  accountCr: 843620,
  fuel: { now: 40, full: 40, note: 'Unrefined aboard' },
  hold: { now: 1, full: 3, note: '1 t priority small-lot delivery' },
  berths: { now: 0, full: 4, note: 'No passengers' },
  crew: [{ name: 'Hawkeye', roles: 'Pilot and steward, 75% of each salary' }],
  armament: 'Unarmed. One hardpoint free.',
  upkeep: 'Annual maintenance due in 212 days',
  damage: null
};

const jobs = [
  { id: 'c1', title: 'Priority small-lot delivery', to: 'Orison', payCr: 9500, due: '5 days left', urgent: false },
  { id: 'c2', title: 'Priority courier packet', to: 'Pelagos', payCr: 17000, due: '14 days left', urgent: false }
];

const chat = [
  { who: 'Referee', text: 'Marisol berthed at Cinder Down.' },
  { who: 'Hawkeye', text: 'Going to look at the freight board.' },
  { who: 'Hawkeye', text: 'rolled 2D: 4 + 5 = 9', roll: true }
];

const base = {
  seat: 'referee',
  campaign: { name: 'Sea of Suns', date: '106-4800' },
  character,
  ship,
  jobs,
  chat
};

export const SAMPLE_SITUATIONS = Object.freeze({
  port: {
    ...base,
    place: { name: 'Cinder', detail: 'Starport C, hex 0802' },
    situation: { kind: 'port', title: 'Port call', detail: 'Week 16 at Cinder' },
    next: {
      title: 'Choose a destination',
      copy: 'Freight and passengers are offered per destination, so nothing is on the board until you pick one. Worlds within Jump-2 are marked on the map.',
      cite: 'Book 2 p.8',
      actions: []
    },
    steps: [
      { id: 'spec', title: 'Buy this week’s speculative lot', figure: '1 t Radioactives, Cr 500,000', state: 'ready', verb: 'Buy 1 t',
        copy: 'Offered at 50% of base price. One lot a week; the hold has 2 t free.', cite: 'Book 2 p.46' },
      { id: 'fuel', title: 'Top off fuel', figure: '40 of 40 t', state: 'done', verb: null,
        copy: 'Tanks are full.', cite: 'Book 2 p.6' },
      { id: 'patron', title: 'Look for a patron', figure: 'Uses the week', state: 'optional', verb: 'Look',
        copy: 'A 5 or 6 on one die finds a likely patron.', cite: 'Book 3 p.25' },
      { id: 'jump', title: 'Depart', figure: 'No destination yet', state: 'blocked', verb: null,
        copy: 'Pick a destination first.', cite: '' }
    ],
    done: ['Berthed, Cr 100'],
    scene: { kind: 'subsector', currentId: 'cinder', selectedId: null, jump: 2 }
  },

  decision: {
    ...base,
    place: { name: 'Cinder', detail: 'Starport C, hex 0802' },
    situation: { kind: 'decision', title: 'On approach', detail: 'Cinder, 40,000 km out' },
    next: {
      title: 'Dead approach beacon',
      copy: 'Cinder’s outer approach beacon is dark and traffic control is not answering. You can trace the fault from the ship or come in on instruments.',
      cite: '',
      actions: [
        { label: 'Investigate', note: 'Electronics-1, throw 8+', primary: true },
        { label: 'Ignore it and land', note: 'No throw' }
      ]
    },
    steps: [],
    done: [],
    hold: 'Port business waits until this is settled.',
    scene: { kind: 'subsector', currentId: 'cinder', selectedId: null, jump: 2 }
  },

  jump: {
    ...base,
    place: { name: 'Jumpspace', detail: 'Cinder to Orison' },
    situation: { kind: 'jump', title: 'In jump', detail: 'Day 3 of 7' },
    next: {
      title: 'Pass the rest of the week',
      copy: 'Four days remain. Marisol breaks out at Orison on 110-4800, inside the small-lot delivery’s deadline.',
      cite: 'Book 2 p.5',
      actions: [{ label: 'Advance to arrival', note: '4 days', primary: true }, { label: 'Pass one day' }]
    },
    steps: [
      { id: 'ls', title: 'Life support', figure: 'Cr 2,000 paid', state: 'done', verb: null, copy: 'One occupied stateroom for the trip.', cite: 'Book 2 p.6' },
      { id: 'train', title: 'Use the time', figure: 'Nothing under way', state: 'optional', verb: 'Choose',
        copy: 'A week in jump is free time for the crew.', cite: '' }
    ],
    done: ['Departed Cinder', '20 t fuel burned'],
    scene: { kind: 'jump', fromId: 'cinder', toId: 'orison', day: 3, days: 7, jump: 2 }
  },

  fight: {
    ...base,
    character: woundedCharacter,
    place: { name: 'Cinder', detail: 'Startown, behind the freight sheds' },
    situation: { kind: 'fight', title: 'Fight, round 3', detail: 'Range bands, 25 m each' },
    // Combatants are in the rules package's own shape, so every number on the
    // fight cards comes from previewPersonalAttack(), not from this file.
    fighters: [
      { id: 'hawkeye', name: 'Hawkeye', side: 'party', band: 2, playerCharacter: true,
        full: { STR: 10, DEX: 11, END: 5 }, characteristics: { STR: 10, DEX: 11, END: 3 },
        armor: 'none', weaponKey: 'laser-rifle', weapons: ['laser-rifle', 'blade', 'hands'],
        skills: { 'Laser Rifle': 1, Blade: 0 }, blowAllowance: 5, blowsUsed: 0,
        upp: 'AB5678', service: 'Scout, 3 terms, age 30', other: 'INT 6  EDU 7  SOC 8' },
      { id: 'reyne', name: 'Dockmaster Reyne', side: 'party', band: 1,
        full: { STR: 6, DEX: 7, END: 5 }, characteristics: { STR: 6, DEX: 7, END: 5 },
        armor: 'none', weaponKey: 'revolver', weapons: ['revolver', 'hands'], skills: { Revolver: 0 }, blowAllowance: 5, blowsUsed: 0,
        order: null },
      { id: 'thug-1', name: 'Thug 1', side: 'foe', band: 4,
        full: { STR: 9, DEX: 6, END: 8 }, characteristics: { STR: 9, DEX: 6, END: 8 },
        armor: 'jack', weaponKey: 'club', weapons: ['club'], skills: { Club: 1 }, blowAllowance: 8, blowsUsed: 0,
        order: { move: 'Close, running', attack: null, targetId: null } },
      { id: 'thug-2', name: 'Thug 2', side: 'foe', band: 6,
        full: { STR: 8, DEX: 7, END: 7 }, characteristics: { STR: 8, DEX: 7, END: 4 },
        armor: 'jack', weaponKey: 'revolver', weapons: ['revolver'], skills: { Revolver: 1 }, blowAllowance: 7, blowsUsed: 0,
        order: { move: 'Stand', attack: 'fire', targetId: 'hawkeye' } },
      { id: 'thug-3', name: 'Thug 3', side: 'foe', band: 5, down: true,
        full: { STR: 7, DEX: 8, END: 6 }, characteristics: { STR: 0, DEX: 3, END: 0 },
        armor: 'jack', weaponKey: 'dagger', weapons: ['dagger'], skills: { Dagger: 0 }, blowAllowance: 6, blowsUsed: 2,
        order: null }
    ],
    next: {
      title: 'Declare for Hawkeye',
      declare: { actorId: 'hawkeye', moves: ['Close', 'Stand', 'Open', 'Evade'], move: 'Stand', running: false, targetId: 'thug-2' },
      actions: [{ label: 'Resolve round', note: '1 of 2 declared, opposition on auto', primary: true }]
    },
    lastRound: ['Hawkeye hit Thug 3 with the laser rifle for 14. Thug 3 is down.', 'Thug 2 hit Hawkeye with the revolver for 2, taken on END.'],
    steps: [],
    done: [],
    scene: { kind: 'bands' }
  },

  shipfight: {
    ...base,
    place: { name: 'Orison', detail: '100 diameters out, inbound' },
    situation: { kind: 'shipfight', title: 'Ship action, turn 2', detail: 'Marisol is the native; the corsair intruded' },
    turn: { phases: ['Movement', 'Laser fire', 'Return fire', 'Ordnance', 'Computer'], current: 1, side: 'Corsair' },
    next: {
      title: 'Corsair fires',
      copy: 'The corsair has the phase. Its two beam lasers are allocated to Marisol. Marisol answers in return fire, which comes next.',
      cite: 'Book 2 p.23',
      actions: [{ label: 'Resolve laser fire', primary: true }]
    },
    roster: [
      { name: 'Marisol', side: 'party', line: 'Type S, 100 t. Maneuver-2, Jump-2', declared: 'Evade program running', hurt: false },
      { name: 'Corsair', side: 'foe', line: 'Type A, 200 t. Hold hit', declared: 'Two beam lasers at Marisol', hurt: true }
    ],
    lastRound: ['Turn 1: Marisol’s pulse laser hit the corsair’s hold.'],
    steps: [],
    done: [],
    scene: { kind: 'plot' }
  }
});

export const SAMPLE_ORDER = Object.freeze([
  ['port', 'Port call'], ['decision', 'Decision'], ['jump', 'In jump'], ['fight', 'Fight'], ['shipfight', 'Ship action']
]);

export const SAMPLE_REFEREE = Object.freeze({
  tabs: ['Actors', 'Scenes', 'Vehicles', 'Players', 'Journal', 'Tables'],
  groups: [
    { label: 'Party', rows: [['Hawkeye', 'kurt']] },
    { label: 'Cinder', rows: [['Dockmaster Reyne', 'Other, 2 terms'], ['Thug', 'template, 3 placed'], ['Customs officer', 'Army, 1 term']] },
    { label: 'Archived', rows: [] }
  ]
});

// ---------------------------------------------------------------------------
// v0.79.0: patron missions a game can referee by itself (solo play).
//
// NOT Classic Traveller rules text. The Traveller Book (1982) p.99 leaves the
// mission to the referee ("the referee should ... decide on a mission that
// the patron will want completed"). These tables are original Graycloak
// content, written so that every mission kind carries its own test: the game
// can tell when it is done without a person to say so.
//
//   courier        deliver a package to a world by the deadline
//   escort         carry the patron's person to a world by the deadline
//   retrieval      find something on a world: days of searching, then a throw
//   investigation  learn something on a world: days of asking, then a throw
//   smuggling      land cargo on a world past its law
// ---------------------------------------------------------------------------

import { requireDice } from '../dice.js';

export const MISSION_KINDS = Object.freeze(['courier', 'escort', 'retrieval', 'investigation', 'smuggling']);

// Which missions a patron is likely to want: six entries, one thrown on 1D.
const LEANINGS = Object.freeze({
  default: ['courier', 'courier', 'escort', 'investigation', 'retrieval', 'escort'],
  Smuggler: ['smuggling', 'smuggling', 'smuggling', 'courier', 'escort', 'retrieval'],
  Hijacker: ['smuggling', 'retrieval', 'retrieval', 'escort', 'courier', 'smuggling'],
  Reporter: ['investigation', 'investigation', 'escort', 'retrieval', 'courier', 'investigation'],
  Spy: ['investigation', 'retrieval', 'courier', 'investigation', 'retrieval', 'escort'],
  Courier: ['courier', 'courier', 'courier', 'escort', 'courier', 'retrieval'],
  Merchant: ['courier', 'smuggling', 'courier', 'escort', 'investigation', 'courier'],
  Scholar: ['retrieval', 'investigation', 'retrieval', 'escort', 'courier', 'investigation'],
  Researcher: ['retrieval', 'investigation', 'retrieval', 'escort', 'courier', 'investigation'],
  Noble: ['escort', 'courier', 'escort', 'investigation', 'retrieval', 'courier'],
  Diplomat: ['escort', 'courier', 'escort', 'investigation', 'courier', 'escort'],
  'Underworld Leader': ['smuggling', 'retrieval', 'smuggling', 'courier', 'investigation', 'smuggling'],
  'Arms Merchant': ['smuggling', 'courier', 'smuggling', 'escort', 'courier', 'retrieval'],
  Police: ['investigation', 'retrieval', 'escort', 'investigation', 'courier', 'investigation'],
  'Naval Officer': ['courier', 'investigation', 'escort', 'courier', 'retrieval', 'investigation'],
  'Army Officer': ['retrieval', 'escort', 'courier', 'investigation', 'retrieval', 'escort'],
  'Marine Officer': ['retrieval', 'escort', 'courier', 'investigation', 'retrieval', 'escort']
});

// Base pay and pay per parsec; the whole scaled by (2D+3)/10 — half to one
// and a half times — as a patron is generous or mean.
const PAY = Object.freeze({
  courier: [5000, 2500], escort: [10000, 5000], retrieval: [20000, 5000], investigation: [15000, 5000], smuggling: [30000, 10000]
});

// What the task takes at the destination, for the kinds that need doing there.
export const MISSION_TASKS = Object.freeze({
  retrieval: Object.freeze({ days: '1D', needed: 8, skills: Object.freeze(['Recon', 'Streetwise', 'Survival']), where: 'surface' }),
  investigation: Object.freeze({ days: '1D+1', needed: 8, skills: Object.freeze(['Streetwise', 'Admin', 'Liaison']), where: 'town' })
});

const THINGS = Object.freeze({
  courier: ['a sealed data wafer', 'a signed contract', 'a letter of credit', 'a small locked case', 'a family heirloom', 'a sample canister'],
  escort: ['the patron in person', 'the patron\u2019s aide', 'a witness', 'a young relative', 'a technician', 'a defector'],
  retrieval: ['a lost survey probe', 'a cached strongbox', 'a crashed courier\u2019s log', 'a stolen artefact', 'a buried field station\u2019s records', 'a runaway\u2019s ship\u2019s papers'],
  investigation: ['who is buying up the port\u2019s warehouses', 'what became of a missing partner', 'whether a mine\u2019s assay was faked', 'who leaked a company\u2019s plans', 'where a noble\u2019s debts are held', 'what the local militia is hiding'],
  smuggling: ['untaxed liquor', 'restricted medical drugs', 'unregistered weapons', 'banned literature', 'prohibited electronics', 'undeclared gemstones']
});

const d2 = (dice) => dice.rollD6() + dice.rollD6();

/**
 * A mission for a patron: its kind, where, the thing, pay and days allowed.
 * candidates: worlds the mission could send the party to, each
 * { id, name, distance } (parsecs from here; 0 for here itself).
 */
export function draftPatronMission(dice, { patronType, candidates = [] } = {}) {
  requireDice(dice);
  const leaning = LEANINGS[patronType] ?? LEANINGS.default;
  const kind = leaning[dice.rollD6() - 1];
  // Every job is somewhere else: a patron hires travellers to go.
  const places = candidates.filter((entry) => entry.distance >= 1);
  if (!places.length) throw new RangeError('no world within reach for a mission');
  const destination = places[(dice.rollD6() * 6 + dice.rollD6() - 7) % places.length];
  const thing = THINGS[kind][dice.rollD6() - 1];
  const [base, perParsec] = PAY[kind];
  const scale = (d2(dice) + 3) / 10;
  const paymentCr = Math.round(((base + perParsec * destination.distance) * scale) / 500) * 500;
  const task = MISSION_TASKS[kind] ?? null;
  const deadlineDays = 14 + 7 * Math.max(1, destination.distance) + (task ? 7 : 0);
  const cargoTons = kind === 'smuggling' ? dice.rollD6() : 0;
  const titles = {
    courier: `Carry ${thing} to ${destination.name}`,
    escort: `Take ${thing} to ${destination.name}`,
    retrieval: `Recover ${thing} on ${destination.name}`,
    investigation: `Find out ${thing}, on ${destination.name}`,
    smuggling: `Land ${cargoTons} t of ${thing} on ${destination.name}`
  };
  return Object.freeze({
    kind, patronType, thing, cargoTons, paymentCr, deadlineDays,
    destinationSystemId: destination.id, destinationName: destination.name, distance: destination.distance,
    title: titles[kind], task
  });
}

/** The task at the destination: 2D plus the party's best skill among those the task takes. */
export function throwMissionTask(dice, { kind, skillLevel = 0 }) {
  const task = MISSION_TASKS[kind];
  if (!task) throw new RangeError(`${kind} has no task to throw`);
  const roll = d2(dice);
  const total = roll + Math.max(0, skillLevel);
  return Object.freeze({ roll, skillLevel, total, needed: task.needed, success: total >= task.needed });
}

export function missionTaskDays(dice, kind) {
  const task = MISSION_TASKS[kind];
  if (!task) return 0;
  return dice.rollD6() + (task.days === '1D+1' ? 1 : 0);
}

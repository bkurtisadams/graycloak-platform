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

// ---------------------------------------------------------------------------
// What the patron is really about. The Traveller Book (1982) p.124: for a
// patron encounter the referee makes up "perhaps six possible rationales or
// outcomes" — the patron is lying, crazy, honest, swindled, "deviously trying
// to achieve something he hasn't mentioned", or dishonest — and "the true
// outcome [is] picked by the referee from the list, influencing the referee's
// description of the encounter and the ensuing job". The book names no die:
// throwing 1D for it when the game referees is Kurt's ruling, and 0.88.0
// (design.md 9.4) takes the book's six, one each, with a second 1D for what
// "crazy" means. What each does at the job's settlement is Graycloak's; the
// quest stages (design.md 9.6, to come) move lying and devious into the job.
//
//   1 honest     as agreed
//   2 crazy      second 1D: 1 eccentric but rich (pays anyway); 2 wrong about
//                the facts (search again); 3 unstable (the fee moves a third,
//                1D 1-3 down, 4-6 up); 4 not his to give (his family cancels
//                it, expenses covered: a tenth of the fee); 5 paranoid (paid;
//                the law takes notice); 6 crazy but right (paid; a lead)
//   3 swindled   half the pay
//   4 lying      paid; the danger was hidden: a hostile encounter
//   5 devious    paid; his own purpose: a throw against the law level at the
//                handover, the pay seized if it fails
//   6 dishonest  the work is done; nothing paid
// ---------------------------------------------------------------------------

export const PATRON_OUTCOMES = Object.freeze(['honest', 'crazy', 'swindled', 'lying', 'devious', 'dishonest']);
export const CRAZY_OUTCOMES = Object.freeze(['eccentric', 'wrong-facts', 'unstable', 'not-his', 'paranoid', 'right']);

/** The hidden throws, made when the job is taken. */
export function rollPatronOutcome(dice) {
  requireDice(dice);
  const die = dice.rollD6();
  const outcome = PATRON_OUTCOMES[die - 1];
  if (outcome !== 'crazy') return Object.freeze({ die, outcome });
  const crazyDie = dice.rollD6();
  const kind = CRAZY_OUTCOMES[crazyDie - 1];
  const shiftDie = kind === 'unstable' ? dice.rollD6() : null;
  return Object.freeze({ die, outcome, crazy: Object.freeze({ die: crazyDie, kind, ...(shiftDie ? { shiftDie, factor: shiftDie <= 3 ? 2 / 3 : 4 / 3 } : {}) }) });
}

/**
 * What the outcome does when the job is settled. outcome: the record
 * rollPatronOutcome gave, or a bare name (a job taken before 0.88.0).
 * trouble: null | 'hostile' (an encounter) | 'legal' (an enforcer) | 'law'
 * (the throw against the law level). extraSearch: search again once.
 * lead: a rumour's find lead follows.
 */
export function patronOutcomeSettlement(outcome, paymentCr) {
  const pay = Math.max(0, Math.round(Number(paymentCr) || 0));
  const record = typeof outcome === 'string' || outcome == null ? { outcome: outcome ?? 'honest' } : outcome;
  const base = { outcome: record.outcome, crazyKind: null, paidCr: pay, completes: true, trouble: null, extraSearch: false, lead: false, reason: null };
  const done = (patch) => Object.freeze({ ...base, ...patch });
  switch (record.outcome) {
    case 'honest': return done({});
    case 'swindled': return done({ paidCr: Math.floor(pay / 2), reason: 'the patron was swindled himself and can pay only half' });
    case 'lying': return done({ trouble: 'hostile', reason: 'the patron lied about the danger, and trouble comes' });
    case 'devious': return done({ trouble: 'law', reason: 'the patron had a purpose of his own he never mentioned' });
    case 'dishonest': return done({ paidCr: 0, reason: 'the patron never pays' });
    case 'crazy': {
      const kind = record.crazy?.kind ?? 'eccentric';
      const crazy = { crazyKind: kind };
      if (kind === 'eccentric') return done({ ...crazy, reason: 'there was nothing to it, but the patron, eccentric and rich, pays anyway' });
      if (kind === 'wrong-facts') return done({ ...crazy, extraSearch: true, reason: 'it was not where the patron said' });
      if (kind === 'unstable') {
        const factor = Number(record.crazy?.factor ?? 1);
        return done({ ...crazy, paidCr: Math.round(pay * factor), reason: `the patron changed the terms: the fee is now a third ${factor < 1 ? 'less' : 'more'}` });
      }
      if (kind === 'not-his') return done({ ...crazy, paidCr: Math.round(pay / 10), reason: 'the patron\u2019s family steps in: the money was never his to give; they cancel the job and cover expenses' });
      if (kind === 'paranoid') return done({ ...crazy, trouble: 'legal', reason: 'the patron\u2019s nerves have drawn the law\u2019s notice' });
      if (kind === 'right') return done({ ...crazy, lead: true, reason: 'the patron was right, and there is more to it than he said' });
      throw new RangeError(`unknown crazy outcome: ${kind}`);
    }
    default: throw new RangeError(`unknown patron outcome: ${record.outcome}`);
  }
}

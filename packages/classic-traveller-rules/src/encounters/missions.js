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

// 0.90.0: steal, kill and rescue (The Traveller Book p.123's "steal an
// object ... or kill someone"; rescue, p.102's own example).
export const MISSION_KINDS = Object.freeze(['courier', 'escort', 'retrieval', 'investigation', 'smuggling', 'steal', 'kill', 'rescue']);

// Which missions a patron is likely to want: six entries, one thrown on 1D.
const LEANINGS = Object.freeze({
  default: ['courier', 'courier', 'escort', 'investigation', 'retrieval', 'escort'],
  Smuggler: ['smuggling', 'smuggling', 'smuggling', 'courier', 'steal', 'retrieval'],
  Hijacker: ['smuggling', 'retrieval', 'steal', 'escort', 'steal', 'smuggling'],
  Assassin: ['kill', 'kill', 'investigation', 'steal', 'courier', 'kill'],
  Cutthroat: ['kill', 'steal', 'retrieval', 'kill', 'smuggling', 'steal'],
  Avenger: ['kill', 'investigation', 'rescue', 'kill', 'investigation', 'rescue'],
  Terrorist: ['kill', 'steal', 'smuggling', 'courier', 'kill', 'steal'],
  Arsonist: ['steal', 'kill', 'smuggling', 'steal', 'courier', 'investigation'],
  Financier: ['rescue', 'investigation', 'courier', 'retrieval', 'rescue', 'escort'],
  Emigre: ['rescue', 'escort', 'courier', 'investigation', 'rescue', 'escort'],
  Governor: ['rescue', 'investigation', 'escort', 'courier', 'investigation', 'rescue'],
  Reporter: ['investigation', 'investigation', 'escort', 'retrieval', 'courier', 'investigation'],
  Spy: ['investigation', 'retrieval', 'courier', 'investigation', 'retrieval', 'escort'],
  Courier: ['courier', 'courier', 'courier', 'escort', 'courier', 'retrieval'],
  Merchant: ['courier', 'smuggling', 'courier', 'escort', 'investigation', 'courier'],
  Scholar: ['retrieval', 'investigation', 'retrieval', 'escort', 'courier', 'investigation'],
  Researcher: ['retrieval', 'investigation', 'retrieval', 'escort', 'courier', 'investigation'],
  Noble: ['escort', 'rescue', 'escort', 'investigation', 'retrieval', 'steal'],
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
  courier: [5000, 2500], escort: [10000, 5000], retrieval: [20000, 5000], investigation: [15000, 5000], smuggling: [30000, 10000],
  steal: [25000, 5000], kill: [40000, 10000], rescue: [30000, 5000]
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
  smuggling: ['untaxed liquor', 'restricted medical drugs', 'unregistered weapons', 'banned literature', 'prohibited electronics', 'undeclared gemstones'],
  steal: ['a ledger from a merchant house', 'a prototype from a laboratory', 'a deed from a magistrate\u2019s vault', 'a jewelled icon from a collector', 'a set of ship\u2019s plans', 'a sealed dispatch'],
  kill: ['a crime boss\u2019s enforcer', 'a blackmailer', 'a corrupt official', 'a rival\u2019s hired gun', 'a deserter with secrets', 'a smuggling captain'],
  rescue: ['the patron\u2019s daughter', 'a kidnapped engineer', 'a hostage diplomat', 'a missing partner', 'the patron\u2019s son', 'a captured courier']
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
  const staged = Boolean(QUEST_STAGES[kind]);
  const deadlineDays = 14 + 7 * Math.max(1, destination.distance) + (staged ? 21 : task ? 7 : 0);
  const cargoTons = kind === 'smuggling' ? dice.rollD6() : 0;
  const titles = {
    courier: `Carry ${thing} to ${destination.name}`,
    escort: `Take ${thing} to ${destination.name}`,
    retrieval: `Recover ${thing} on ${destination.name}`,
    investigation: `Find out ${thing}, on ${destination.name}`,
    smuggling: `Land ${cargoTons} t of ${thing} on ${destination.name}`,
    steal: `Steal ${thing}, on ${destination.name}`,
    kill: `Kill ${thing}, on ${destination.name}`,
    rescue: `Rescue ${thing}, on ${destination.name}`
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

// 0.89.0 (design.md 9.5): p.99, the patron will "finance reasonable
// expenses"; p.124, he "may provide limited funds for the task". An advance
// of a tenth of the fee (Graycloak's figure) is paid when the job is taken,
// the travellers' whatever the outcome; the rest is paid at the end.
export const PATRON_ADVANCE_FRACTION = 0.1;
export function patronAdvance(paymentCr) {
  return Math.max(0, Math.round((Number(paymentCr) || 0) * PATRON_ADVANCE_FRACTION));
}

// ---------------------------------------------------------------------------
// 0.90.0 (Kurt, Sep 2026; design.md 9.6): a job is stages, each an adventure
// encounter of its own. The Traveller Book p.102: "No table of random events
// or personalities can provide these individuals; the referee must produce
// them" — this is the game standing in for that referee, original Graycloak
// content. Every stage is 1D days (0: no days) in town or on the surface,
// with the usual encounters; most end in 2D + the party's best skill for 8+
// (a failure costs the days and may be tried again). kind:
//   ask       days, then the throw
//   go        days, no throw
//   break-in  days, then the throw; a failure brings the guards
//   away      the law's throw at once: 2D, the law level or more
//   fight     a group to be beaten: the stage is done when they are
//   handover  no days: the job is settled
// lying: an encounter where `trouble` is set. After a kill, the law.
// ---------------------------------------------------------------------------
const stage = (key, title, verb, type, { where = 'town', days = '1D', skills = [], foe = null, trouble = false, done = null } = {}) =>
  Object.freeze({ key, title, verb, type, where, days, skills: Object.freeze(skills), foe, trouble, done });
const ASK = ['Streetwise', 'Admin', 'Computer'];

export const QUEST_STAGES = Object.freeze({
  retrieval: Object.freeze([
    stage('learn', 'Learn where it is', 'Ask around', 'ask', { skills: ASK, done: 'place' }),
    stage('reach', 'Get there', 'Set out', 'go', { where: 'surface', trouble: true }),
    stage('recover', 'Recover it', 'Search', 'ask', { where: 'surface', skills: ['Recon', 'Survival'] }),
    stage('handover', 'Bring it back', 'Hand it over', 'handover', { days: 0 })
  ]),
  investigation: Object.freeze([
    stage('learn', 'Ask around', 'Ask around', 'ask', { skills: ASK }),
    stage('reach', 'Find the people who know', 'Go and find them', 'go', { trouble: true }),
    stage('confirm', 'Get it confirmed', 'Confirm it', 'ask', { skills: ASK }),
    stage('handover', 'Report back', 'Report', 'handover', { days: 0 })
  ]),
  steal: Object.freeze([
    stage('case', 'Case the place', 'Case it', 'ask', { skills: ['Streetwise', 'Recon'] }),
    stage('getin', 'Get in and take it', 'Go in', 'break-in', { skills: ['Recon'], foe: 'guards', trouble: true }),
    stage('getaway', 'Get away', 'Get away', 'away', { days: 0 }),
    stage('handover', 'Hand it over', 'Hand it over', 'handover', { days: 0 })
  ]),
  kill: Object.freeze([
    stage('find', 'Find them', 'Ask around', 'ask', { skills: ASK }),
    stage('reach', 'Reach them', 'Close in', 'go', { trouble: true }),
    stage('deed', 'The deed', 'Go in', 'fight', { days: 0, foe: 'target' }),
    stage('handover', 'Report back', 'Report', 'handover', { days: 0 })
  ]),
  rescue: Object.freeze([
    stage('witnesses', 'Talk to the witnesses', 'Ask around', 'ask', { skills: ASK }),
    stage('suspects', 'Find the kidnappers', 'Track them', 'ask', { skills: ['Streetwise', 'Recon'], trouble: true }),
    stage('hideout', 'The hideout', 'Go in', 'fight', { where: 'surface', foe: 'kidnappers' }),
    stage('handover', 'Bring them home', 'Hand over', 'handover', { days: 0 })
  ])
});

// Who the fight stages meet, in the p.101 list's own terms (rows for
// quantity and remarks; Graycloak's choice of row).
export const QUEST_FOES = Object.freeze({ guards: 56, target: 32, kidnappers: 46 });
export const QUEST_FOE_NAMES = Object.freeze({ guards: 'Guards', target: 'The target and bodyguards', kidnappers: 'Kidnappers' });

/** 1D days (or none); the stage's throw, 2D + skill for 8+. */
export function questStageDays(dice, stageEntry) {
  requireDice(dice);
  return stageEntry.days === 0 ? 0 : dice.rollD6();
}
export function throwQuestStage(dice, { skillLevel = 0 } = {}) {
  requireDice(dice);
  const roll = d2(dice);
  const total = roll + Math.max(0, skillLevel);
  return Object.freeze({ roll, skillLevel, total, needed: 8, success: total >= 8 });
}

// 0.90.0 (Kurt, Sep 2026; design.md 9.5): spoils — "all other goods or items
// acquired will belong to the adventurers" (p.99). After a fight won during a
// job, 1D 5+; after a stage done without one, 6. Worth 3D x Cr2,500.
export const SPOILS = Object.freeze(['a crate of electronic parts', 'a case of medical supplies', 'a set of survey instruments', 'a locked strongbox', 'a bundle of trade goods', 'a stash of weapons']);
export function rollSpoils(dice, { afterFight = false } = {}) {
  requireDice(dice);
  const die = dice.rollD6();
  if (die < (afterFight ? 5 : 6)) return Object.freeze({ die, found: false });
  const what = SPOILS[dice.rollD6() - 1];
  const valueCr = (dice.rollD6() + dice.rollD6() + dice.rollD6()) * 2500;
  return Object.freeze({ die, found: true, what, valueCr });
}

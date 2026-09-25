// policy.js — who answers "what now?" when no person does.
//
// v0.312.0. A policy is (state, actions, context) => one of the actions, or
// null to stop. The default is deliberately dull: it keeps a ship running
// commercially and never goes looking for trouble. It exists so a headless
// run can go a hundred jumps and show what the rules do, not to play well.

const first = (actions, type) => actions.find((entry) => entry.type === type) ?? null;

export const DEFAULT_POLICY_OPTIONS = Object.freeze({
  // p.36 pirates are hostile by default; the dull captain runs rather than
  // fights, so a headless run is not halted by every pirate it meets.
  fightPirates: false,
  // Hailing a merchant or submitting to a patrol can each turn into a fight
  // (a reaction of 5 or less). Off by default: the dull captain lets all
  // traffic pass. Turn on to exercise Book 2 p.36's hail and inspection.
  hail: false,
  inspect: false,
  // Overhaul at a class A/B port when due within this many days.
  maintenanceLeadDays: 60,
  // Book 2 p.1: "In port, five to six days are allowed for the acquisition
  // of cargo and passengers, and for crew recreation." Freight is taken on
  // the last day, so the offers are that day's.
  portDays: 6
});

export function createDefaultPolicy(options = {}) {
  const settings = { ...DEFAULT_POLICY_OPTIONS, ...options };
  return function defaultPolicy(state, actions, context) {
    if (!actions.length) return null;
    if (state.situation === 'in-jump') return first(actions, 'jump-week');

    if (state.situation === 'encounter') {
      const encounter = state.encounter;
      if (encounter.tollDemandCr) return first(actions, 'pay-toll') ?? first(actions, 'refuse-toll');
      // v0.315.7: an attacking pirate cannot be let pass; either answer is a
      // fight, which halts a headless run for a person.
      if (encounter.attacking) return first(actions, settings.fightPirates ? 'fight' : 'run');
      if (encounter.hostileByDefault && settings.fightPirates) return first(actions, 'fight');
      if (settings.inspect && first(actions, 'inspect')) return first(actions, 'inspect');
      if (settings.hail && first(actions, 'hail')) return first(actions, 'hail');
      return first(actions, 'let-pass');
    }

    // In port: debts, then upkeep, then fuel, then a course, then cargo.
    for (const type of ['pay-arrears', 'pay-berthing']) {
      const action = first(actions, type);
      if (action) return action;
    }
    const repair = first(actions, 'repair-drives');
    if (repair) return repair;
    const wait = first(actions, 'wait');
    if (wait && wait.daysInPort < settings.portDays) return { ...wait, days: settings.portDays - wait.daysInPort };
    const maintain = first(actions, 'maintain');
    if (maintain && (maintain.overdue || maintain.daysUntilDue <= settings.maintenanceLeadDays)) return maintain;
    const fill = first(actions, 'fuel-fill');
    if (fill) return fill;
    const skim = first(actions, 'fuel-skim');
    if (skim) return skim;

    if (!state.destinationId) {
      // v0.325.0: a course the ship can plot, when there is one.
      const all = actions.filter((entry) => entry.type === 'choose-destination');
      const courses = all.some((entry) => entry.plottable) ? all.filter((entry) => entry.plottable) : all;
      const fresh = courses.filter((entry) => entry.systemId !== state.lastSystemId);
      const pool = fresh.length ? fresh : courses;
      // Nearest first, then the one the seed prefers, so runs vary.
      const best = Math.min(...pool.map((entry) => entry.distance));
      const nearest = pool.filter((entry) => entry.distance === best).sort((a, b) => a.systemId.localeCompare(b.systemId));
      if (nearest.length) return nearest[hashIndex(`${state.seed}|${state.arrivals}`, nearest.length)];
    }

    const freight = actions.filter((entry) => entry.type === 'load-freight').sort((a, b) => b.tons - a.tons);
    if (freight.length) return freight[0];
    const passengers = first(actions, 'book-passengers');
    if (passengers) return passengers;
    const message = first(actions, 'carry-message');
    if (message) return message;

    const depart = first(actions, 'depart');
    if (depart) return depart;
    // Nothing moves the ship: no fuel to be had, or a course was never set.
    return null;
  };
}

function hashIndex(text, length) {
  let hash = 0;
  for (const char of String(text)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % length;
}

export const defaultPolicy = createDefaultPolicy();

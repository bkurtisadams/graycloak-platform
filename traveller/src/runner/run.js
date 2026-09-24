// run.js — drive a trip with a policy until it arrives enough times or stops.
//
// v0.312.0. The loop the headless script and the tests use. It never decides
// anything itself: every step is the policy's choice among listActions().

import { listActions, applyAction, tripDate } from './trip.js';
import { defaultPolicy } from './policy.js';

export const RUN_STOP_REASONS = Object.freeze(['arrivals', 'halted', 'stranded', 'destroyed', 'stuck', 'step-limit']);

export function runTrip(state, context, { policy = defaultPolicy, arrivals = 1, maxSteps = 2000, onEvent = null } = {}) {
  let current = state;
  const events = [];
  const target = current.arrivals + arrivals;
  for (let step = 0; step < maxSteps; step += 1) {
    if (current.situation === 'halted') return finish('halted');
    if (current.situation === 'stranded') return finish('stranded');
    if (current.situation === 'destroyed') return finish('destroyed');
    if (current.arrivals >= target && current.situation === 'port') return finish('arrivals');
    const actions = listActions(current, context);
    const choice = policy(current, actions, context);
    if (!choice) return finish('stuck');
    const result = applyAction(current, choice, context);
    current = result.state;
    for (const entry of result.events) {
      events.push(entry);
      if (onEvent) onEvent(entry);
    }
  }
  return finish('step-limit');

  function finish(reason) {
    return Object.freeze({ state: current, events: Object.freeze(events), stoppedBy: reason, date: tripDate(current), halt: current.halt });
  }
}

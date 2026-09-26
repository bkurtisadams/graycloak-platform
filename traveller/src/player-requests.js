// ---------------------------------------------------------------------------
// player-requests.js — v0.329.0: what a player's page may ask the game to
// do, and the situation it is shown to ask from. No imports, so both the
// session (which publishes the situation) and the server-side request
// handler (remote-request.js) use it without a cycle.
// ---------------------------------------------------------------------------

// Commands a player's page may send, by prefix (':' ends a prefix) or whole.
const PLAYER_COMMANDS = Object.freeze([
  'trip:',                       // the runner: port business, course, depart, jump, arrival
  'speculation:buy', 'speculation:sell',
  'repair:crew:', 'repair:shipyard:',
  'shipyard:',
  'patrons:seek', 'patrons:accept', 'patrons:decline', 'patrons:task:',
  'persons:jail',
  'party:rest',
  'shipfight:fire', 'shipfight:hold', 'shipfight:flee', 'shipfight:end', 'shipfight:cancel-repair'
]);

/** Whether a player's page may send this command (the game refereeing). */
export function playerMayRun(command) {
  const text = String(command ?? '');
  if (!text || text.length > 200) return false;
  return PLAYER_COMMANDS.some((entry) => (entry.endsWith(':') ? text.startsWith(entry) : text === entry || text.startsWith(`${entry}:`)));
}

const keep = (command, mode) => (mode === 'game' && command && playerMayRun(command) ? command : null);
const text = (value) => (value === undefined || value === null ? null : String(value));

function projectAction(action, mode) {
  if (!action) return null;
  const command = keep(action.command, mode);
  return { label: text(action.label ?? action.verb), kind: text(action.kind), primary: Boolean(action.primary), command, figure: text(action.figure) };
}

/**
 * What a player's page shows of the situation, with the buttons it may press:
 * the same words the play page shows, projected to plain data (Firestore
 * takes no nested arrays), and a command only where the game referees and
 * the command is on the player's list.
 */
export function playerSituation(view, { mode = 'person' } = {}) {
  if (!view?.situation) return null;
  const steps = (view.steps ?? []).map((step) => ({
    id: text(step.id), title: text(step.title), figure: text(step.figure), state: text(step.state),
    copy: text(step.copy), cite: text(step.cite), kind: text(step.kind),
    command: keep(step.command, mode), verb: text(step.verb)
  }));
  const next = view.next ? {
    title: text(view.next.title), cite: text(view.next.cite), copy: text(view.next.copy),
    actions: (view.next.actions ?? []).map((action) => projectAction(action, mode)).filter(Boolean)
  } : null;
  const patrons = view.patrons ? {
    tasks: (view.patrons.tasks ?? []).map((task) => ({ id: text(task.id), title: text(task.title), figure: text(task.figure), label: text(task.label), blocked: text(task.blocked), command: keep(task.command, mode) })),
    offer: view.patrons.patron?.draft ? {
      type: text(view.patrons.patron.type), title: text(view.patrons.patron.draft.title),
      where: text(view.patrons.patron.draft.destinationName), paymentCr: Number(view.patrons.patron.draft.paymentCr ?? 0),
      deadlineDays: Number(view.patrons.patron.draft.deadlineDays ?? 0),
      accept: keep('patrons:accept', mode), decline: keep('patrons:decline', mode)
    } : null,
    seek: view.patrons.seek ? projectAction({ ...view.patrons.seek, label: view.patrons.seek.label }, mode) : null,
    wait: Number(view.patrons.wait ?? 0)
  } : null;
  const person = view.personEncounter ? {
    summary: text(view.personEncounter.summary),
    actions: (view.personEncounter.actions ?? []).map((action) => projectAction(action, mode)).filter((action) => action?.command)
  } : null;
  return {
    mode,
    kind: text(view.situation.kind), title: text(view.situation.title), detail: text(view.situation.detail),
    next, steps, done: (view.done ?? []).map(text),
    jobs: (view.jobs ?? []).map((job) => ({ id: text(job.id), title: text(job.title), to: text(job.to), payCr: Number(job.payCr ?? 0), due: text(job.due), urgent: Boolean(job.urgent) })),
    patrons, person,
    courseId: text(view.destinationId ?? view.scene?.courseId),
    canSetCourse: mode === 'game' && Boolean(view.scene?.canSetCourse)
  };
}


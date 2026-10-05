/**
 * OD&D — Chainmail engine · fight runner
 * odd-chainmail-rules · src/runner.mjs
 *
 * The fight's rules spine, independent of any page: apply(state, action, rng)
 * checks the action is legal at this step, changes the state, and returns data
 * events for a client to show. It mutates the state it is given; a server
 * clones before calling and saves the result.
 *
 * Pass 5 (Oct 2026) moves in the missile and spell step ("missiles",
 * missile-step.mjs) and talking ("parley", "offer-service", talk.mjs).
 *
 * Pass 4 (Oct 2026) moves the melee step in: "melee" resolves the round
 * (melee.mjs) and returns its log cards, then morale and the end check.
 *
 * Pass 3 (Oct 2026) adds fire during movement: every move is followed by
 * pass-through fire at its half-move point, and "split-fire" lets horse
 * archers and elves shoot in mid-move.
 *
 * Pass 2 (Oct 2026) adds movement and the behaviour loop: "move",
 * "charge-mode", "close-on", "group-move" and "behave".
 *
 * Pass 1 (Oct 2026) owns the Chainmail turn sequence with the initiative
 * winner's election (p.8; Kurt, Oct 2026), the step order (first move, last
 * move, artillery, missiles, melee), the morale pass after fire and after
 * melee (man-to-man third-of-side check, leader lost, fear, orc lair), and
 * the end of the fight. Movement, missile, spell and melee resolution still
 * live in the client and report back with "missiles-resolved" and
 * "melee-resolved"; later passes move them in here.
 *
 * State fields used: figures[], round, step, firstSide, init, phase, winner,
 * width, height, walls, chests[], leader {A,B}, moraleChecked[],
 * fearChecked[], leaderLostDone {A,B}, lairNoted[].
 */
import { rollInitiative, electFirstMover, opponent } from "./turn-sequence.mjs";
import { alive, present, active, distIn, isTrapped, GONE } from "./board.mjs";
import { MONSTERS, moraleDiceBonus, fearRadius } from "./monsters.mjs";
import { monsterAttackProfile } from "./monster-attacks.mjs";
import { troopLossLine, manToManMoraleDue, manToManLossCheck, commanderLost, CommanderBond } from "./morale.mjs";
import { orcLairMoraleExempt } from "./reactions.mjs";
import { moveFigure, closeOn, planGroupMove, commitGroupMove, mayCharge, chargeInches } from "./movement.mjs";
import { behave } from "./behaviour.mjs";
import { passThroughFire, splitMoveFire, canShoot } from "./missiles.mjs";
import { resolveMeleeRound } from "./melee.mjs";
import { resolveMissileStep } from "./missile-step.mjs";
import { parley, offerServiceTo } from "./talk.mjs";
import { setOrders, drawWeapon, gmTool, setTreasure } from "./orders.mjs";

export const Step = Object.freeze({
  INIT: "init", ELECT: "elect", ORDERS: "orders", ARTILLERY: "artillery", MISSILES: "missiles", MELEE: "melee"
});
/**
 * The round (Chainmail p.9, Kurt Oct 2026): initiative, election, first move,
 * last move, then ORDERS — both sides declare fire, spells and stance at once,
 * after all movement, since that fire "takes effect simultaneously just prior
 * to melee" — then artillery, missiles and melee resolve.
 */
export const moveStep = (side) => `move-${side}`;
export const isMoveStep = (step) => typeof step === "string" && step.startsWith("move-");
export const moverOf = (step) => (isMoveStep(step) ? step.slice(5) : null);

const monsterOf = (f) => (f.kind === "monster" ? MONSTERS.find((m) => m.key === f.monsterKey) : null);
const lossLineOf = (m) => troopLossLine(monsterAttackProfile(m).chainmail.defendsAs);
const asSet = (v) => (v instanceof Set ? v : new Set(v ?? []));

/** Monsters whose specials act in the missile step whatever their orders. */
const MISSILE_STEP_MONSTERS = Object.freeze(["basilisk", "medusa", "gorgon", "chimera"]);
/** Is there anything for the missile step to do this round? */
export function missileStepNeeded(state) {
  return state.figures.some((f) => active(f) && (f.action === "fire" || (f.action === "passthrough" && f.lastFired !== state.round && f.target != null) || f.action?.startsWith?.("cast:")
    || MISSILE_STEP_MONSTERS.includes(f.monsterKey) || f.monsterKey?.startsWith?.("dragon-")));
}
/** Artillery engines on the board (none are built yet; the step keeps its place in the sequence). */
export function artilleryStepNeeded(state) {
  return state.figures.some((f) => active(f) && f.artillery);
}

/** How the side's AI elects: move last, to see the enemy's move first. */
export const AI_ELECTION = "counter";

/* ------------------------------------------------------------------ actions */

/**
 * Apply one action. Returns { ok, events, error }. Actions:
 *   { type: "begin-round" }                     step init: new round, roll initiative
 *   { type: "elect", side, choice }             step elect: winner moves first ("move") or last ("counter")
 *   { type: "end-move", side }                  step move-<side>: that side has finished moving
 *   { type: "missiles-resolved" }               step missiles: client resolved fire; morale follows
 *   { type: "melee-resolved" }                  step melee: client resolved melee; morale and next round
 *   { type: "move", id, x, y }                  setup: place; move step: move the figure (a charge must end in contact)
 *   { type: "charge-mode", id, on }             move step: switch a figure's charge on or off
 *   { type: "close-on", id, targetId, charge }  move step: move toward a target by the best route
 *   { type: "group-move", ids, leadId, x, y }   setup or move step: move a group, all or nothing
 *   { type: "behave", side }                    move step: every figure on the moving side decides by its profile
 *   { type: "split-fire", id, targetId }        move step: an elf or horse archer shoots in mid-move
 *   { type: "orders", id, ...orders }           any step: target, holdTargets, secondTarget, action, stance, castAim (orders.mjs)
 *   { type: "draw-weapon", id, index }          own move step: draw a carried weapon for half a move
 *   { type: "gm", id, tool, value }             referee: invulnerable, heal, set-hp, clear, kill, burn, treasure
 *   { type: "gm", chest, tool: "treasure", value } referee: what a hoard holds
 *   { type: "leader", side, id }                referee: the side's leader (Chainmail p.20); id null for none
 * Orders, GM tools and the leader may also be set during setup.
 */
/** After any move in the fight, enemies who elected pass-through fire shoot at each mover's half-move point. */
function withPassThrough(state, events, rng) {
  const out = [];
  for (const e of events) {
    out.push(e);
    if (e.type !== "moved" || state.phase !== "fight") continue;
    const mover = state.figures.find((f) => f.id === e.id);
    const shots = passThroughFire(state, mover, e.halfway, rng);
    if (shots.length && mover.hp <= 0) { mover.x = e.halfway.x; mover.y = e.halfway.y; }
    out.push(...shots);
  }
  return out;
}
/** Where each figure of the moving side stood when its move step opened (for Undo move). */
function snapMoveStart(state) {
  const side = moverOf(state.step); if (!side) return;
  const figs = {};
  for (const f of state.figures) if (f.side === side) figs[f.id] = { x: f.x, y: f.y, facing: f.facing ?? 0, moved: f.moved ?? 0, charging: f.charging ?? false, chargedRound: f.chargedRound ?? null };
  state.moveStart = { [`${state.round}:${state.step}`]: { figs, blocked: [] } };
}
const MOVE_ACTIONS = Object.freeze(["move", "close-on", "group-move", "split-fire"]);
export function apply(state, action, rng) {
  const r = applyStep(state, action, rng);
  // Dice rolled during a figure's move (its own split-move fire, or pass-through fire it walked into) fix it in place.
  if (r.ok && MOVE_ACTIONS.includes(action?.type) && (action.type === "split-fire" || r.events.some((e) => e.type === "volley"))) {
    const snap = state.moveStart?.[`${state.round}:${state.step}`];
    if (snap) snap.blocked = [...new Set([...(snap.blocked ?? []), ...[action.id, ...(action.ids ?? [])].filter((x) => x != null)])];
  }
  return r;
}
function applyStep(state, action, rng) {
  const events = [];
  const fail = (error) => ({ ok: false, events: [], error });
  const byId = (id) => state.figures.find((f) => f.id === id);
  const setupOk = ["move", "group-move", "orders", "gm", "leader"].includes(action?.type) && state.phase === "setup";
  if (state.phase !== "fight" && !setupOk) return fail("the fight is not running");
  switch (action?.type) {
    case "move": {
      const r = moveFigure(state, byId(action.id), action.x, action.y);
      return r.ok ? { ok: true, events: withPassThrough(state, r.events, rng) } : fail(r.error);
    }
    case "split-fire": {
      const f = byId(action.id), t = byId(action.targetId);
      if (!f || !t) return fail("no such figure");
      const r = splitMoveFire(state, f, t, rng);
      return r.ok ? { ok: true, events: r.events } : fail(r.error);
    }
    case "charge-mode": {
      const f = byId(action.id);
      if (!f) return fail("no such figure");
      if (action.on && !f.charging && !mayCharge(state, f)) return fail(`${f.name} can't charge now`);
      f.charging = !!action.on;
      events.push({ type: "charge-mode", id: f.id, name: f.name, on: f.charging, inches: chargeInches(f) });
      return { ok: true, events };
    }
    case "close-on": {
      const f = byId(action.id), t = byId(action.targetId);
      if (!f || !t) return fail("no such figure");
      if (action.charge && !mayCharge(state, f)) return fail(`${f.name} can't charge now`);
      const r = closeOn(state, f, t, { charge: !!action.charge });
      return r.ok ? { ok: true, events: withPassThrough(state, r.events, rng) } : fail(r.error);
    }
    case "group-move": {
      const members = (action.ids ?? []).map(byId).filter((g) => g && g.placed && present(g));
      const lead = byId(action.leadId);
      if (!lead || !members.includes(lead)) return fail("the lead must be in the group");
      const plan = planGroupMove(state, members, lead, action.x, action.y);
      if (!plan.ok) return { ok: false, events: [], error: plan.bad.map((b) => `${byId(b.id).name}: ${b.why}`).join("; "), plan };
      const r = commitGroupMove(state, plan);
      return { ok: true, events: withPassThrough(state, r.events, rng) };
    }
    case "behave": {
      if (moverOf(state.step) !== action.side) return fail(`side ${action.side} is not moving`);
      return { ok: true, events: withPassThrough(state, behave(state, action.side), rng) };
    }
    case "begin-round": {
      if (state.step !== Step.INIT) return fail(`not at the start of a round (step ${state.step})`);
      state.round = (state.round ?? 0) + 1;
      for (const f of state.figures) {
        f.moved = 0; f.secondTarget = null; f.charging = false;
        if (f.status === "paralyzed" && state.round >= (f.paralyzedUntil ?? 0)) f.status = null;
      }
      events.push(...standingOrders(state));
      const init = rollInitiative(rng);
      state.init = init; state.firstSide = null; state.step = Step.ELECT;
      events.push({ type: "round", round: state.round }, { type: "initiative", a: init.a, b: init.b, winner: init.winner });
      return { ok: true, events };
    }
    case "elect": {
      if (state.step !== Step.ELECT) return fail("no election is pending");
      if (action.side !== state.init.winner) return fail(`side ${action.side} did not win initiative`);
      const choice = action.choice === "counter" ? "counter" : "move";
      state.firstSide = electFirstMover(state.init.winner, choice);
      state.step = moveStep(state.firstSide); snapMoveStart(state);
      events.push({ type: "election", winner: state.init.winner, choice, firstSide: state.firstSide, ai: !!action.ai });
      return { ok: true, events };
    }
    case "end-move": {
      const side = moverOf(state.step);
      if (!side) return fail("no side is moving");
      if (action.side && action.side !== side) return fail(`side ${side} is moving, not ${action.side}`);
      if (side === state.firstSide) { state.step = moveStep(opponent(side)); snapMoveStart(state); return { ok: true, events }; }
      state.step = Step.ORDERS;
      events.push({ type: "orders-open", round: state.round });
      return { ok: true, events };
    }
    case "orders-end": {
      if (state.step !== Step.ORDERS) return fail("not the orders step");
      if (!artilleryStepNeeded(state)) events.push({ type: "step-skipped", step: Step.ARTILLERY, why: "no artillery on the board" });
      if (missileStepNeeded(state)) state.step = Step.MISSILES;
      else { state.step = Step.MELEE; events.push({ type: "step-skipped", step: Step.MISSILES, why: "nothing to fire or cast" }); }
      return { ok: true, events };
    }
    case "step-back": {
      // Previous (the referee's ◀, as on the Chainmail board): re-open the step before
      // within the round; nothing is reverted. It can't cross a step whose dice have landed.
      const second = state.firstSide ? opponent(state.firstSide) : null;
      let to = null;
      if (state.step === Step.ORDERS && second) to = moveStep(second);
      else if (second && state.step === moveStep(second)) to = moveStep(state.firstSide);
      if (!to) return fail("nothing to go back to in this round");
      const from = state.step;
      state.step = to;
      events.push({ type: "step-back", from, to });
      return { ok: true, events };
    }
    case "undo-move": {
      // Undo move: put a figure back where its side's move step began, full move restored,
      // unless dice were rolled during its move (split-move or pass-through fire).
      const f = byId(action.id);
      if (!f) return fail("no such figure");
      if (moverOf(state.step) !== f.side) return fail(`${f.name} isn't moving now`);
      const snap = state.moveStart?.[`${state.round}:${state.step}`];
      const was = snap?.figs?.[f.id];
      if (!was) return fail(`nothing to undo for ${f.name}`);
      if (snap.blocked?.includes(f.id)) return fail(`dice were rolled during ${f.name}'s move, so it stands`);
      Object.assign(f, was);
      events.push({ type: "undo-move", id: f.id, name: f.name, to: { x: f.x, y: f.y } });
      return { ok: true, events };
    }
    case "missiles-resolved": {
      if (state.step !== Step.MISSILES) return fail("not the missile step");
      events.push(...moralePass(state, rng));
      checkOver(state, events);
      if (state.phase === "fight") state.step = Step.MELEE;
      return { ok: true, events };
    }
    case "missiles": {
      if (state.step !== Step.MISSILES) return fail("not the missile step");
      const r = resolveMissileStep(state, rng);
      events.push({ type: "missiles", round: state.round, cards: r.cards, hits: r.hits, fell: r.fell });
      events.push(...moralePass(state, rng));
      checkOver(state, events);
      if (state.phase === "fight") state.step = Step.MELEE;
      return { ok: true, events };
    }
    case "parley":
    case "offer-service": {
      const pc = byId(action.pcId), f = byId(action.figId);
      if (!pc || !f) return fail("no such figure");
      const r = action.type === "parley" ? parley(state, pc, f, action, rng) : offerServiceTo(state, pc, f, action, rng);
      if (!r.ok) return fail(r.error);
      events.push({ type: "talk", card: r.card });
      checkOver(state, events);
      return { ok: true, events };
    }
    case "orders": {
      const { type, id, ...o } = action;
      const r = setOrders(state, byId(id), o);
      return r.ok ? { ok: true, events: r.events } : fail(r.error);
    }
    case "draw-weapon": {
      const r = drawWeapon(state, byId(action.id), action.index);
      return r.ok ? { ok: true, events: r.events } : fail(r.error);
    }
    case "gm": {
      if (action.chest != null) { // the referee sets what a hoard holds
        if (action.tool !== "treasure") return fail("only treasure can be set on a hoard");
        const c = (state.chests ?? []).find((x) => x.id === action.chest);
        const r = setTreasure(state, c, action.value, true);
        if (!r.ok) return fail(r.error);
        events.push({ type: "gm", chest: c.id, name: c.label, tool: "treasure", value: null });
        return { ok: true, events };
      }
      const r = gmTool(state, byId(action.id), action.tool, action.value);
      if (!r.ok) return fail(r.error);
      events.push(...r.events);
      checkOver(state, events);
      return { ok: true, events };
    }
    case "leader": {
      if (!["A", "B"].includes(action.side)) return fail("no such side");
      const f = action.id == null ? null : byId(action.id);
      if (action.id != null && (!f || (f.origSide ?? f.side) !== action.side || !alive(f))) return fail("the leader must be a living figure of that side");
      state.leader = { ...(state.leader ?? { A: null, B: null }), [action.side]: f ? f.id : null };
      events.push({ type: "leader", side: action.side, id: f ? f.id : null, name: f?.name ?? null });
      return { ok: true, events };
    }
    case "melee": {
      if (state.step !== Step.MELEE) return fail("not the melee step");
      const r = resolveMeleeRound(state, rng);
      events.push({ type: "melee", round: state.round, cards: r.cards, hits: r.hits, fell: r.fell });
      events.push(...moralePass(state, rng));
      checkOver(state, events);
      if (state.phase === "fight") state.step = Step.INIT;
      return { ok: true, events };
    }
    case "melee-resolved": {
      if (state.step !== Step.MELEE) return fail("not the melee step");
      events.push(...moralePass(state, rng));
      checkOver(state, events);
      if (state.phase === "fight") state.step = Step.INIT;
      return { ok: true, events };
    }
    default:
      return fail(`unknown action ${action?.type}`);
  }
}

/* ------------------------------------------------------------------ standing orders */

/**
 * Orders stand from round to round until changed or impossible (Kurt, Oct
 * 2026): melee and its target carry over; fire carries over unless the archer
 * is caught in melee or the target is out of range or sight; pass-through fire
 * carries over (the figure starts the round still); spells and Hold don't
 * (a slot or template is spent, Hold is for one round). Returns an event for
 * each order that lapsed.
 */
export function standingOrders(state) {
  const out = [];
  const lapse = (f, why) => { out.push({ type: "order-lapsed", id: f.id, name: f.name, from: f.action, why }); f.action = "melee"; };
  for (const f of state.figures) {
    if (!present(f)) continue;
    const t = f.target != null ? state.figures.find((e) => e.id === f.target) : null;
    if (f.action?.startsWith?.("cast:")) { f.castAim = null; lapse(f, "a spell is chosen afresh each round"); continue; }
    if (f.action === "hold") { f.action = "melee"; continue; }
    if (f.action === "fire" || f.action === "passthrough") {
      if (!f.missile) { lapse(f, "no missile weapon"); continue; }
      if (f.action === "fire" && t) { const c = canShoot(state, f, t); if (!c.ok) lapse(f, c.why); }
    }
  }
  return out;
}

/* ------------------------------------------------------------------ end of fight */

/** Clear targets on figures no longer present; end the fight when a side has no one left. */
export function checkOver(state, events = []) {
  for (const f of state.figures) if (f.target != null && !present(state.figures.find((e) => e.id === f.target) ?? {})) f.target = null;
  const trollDown = (f) => f.monsterKey === "troll" && !alive(f) && !f.burned && f.firstHitRound != null && !GONE.includes(f.status);
  const up = (s) => state.figures.some((f) => f.side === s && (present(f) || trollDown(f)));
  const aUp = up("A"), bUp = up("B");
  if (state.phase === "fight" && (!aUp || !bUp)) {
    state.phase = "over"; state.winner = aUp ? "A" : bUp ? "B" : "none";
    events.push({ type: "over", winner: state.winner, round: state.round });
  }
  return events;
}

/* ------------------------------------------------------------------ morale */

/** Leader bond for a unit: his own unit, a unit within 12", or none (Chainmail p.20; Kurt, Oct 2026). */
export function bondFor(state, figs, side) {
  const L = state.figures.find((f) => f.id === state.leader?.[side]);
  if (!L || !present(L)) return CommanderBond.NONE;
  if (figs.includes(L)) return CommanderBond.WITH;
  return figs.some((f) => active(f) && f.placed && distIn(f, L) <= 12) ? CommanderBond.NEAR : CommanderBond.NONE;
}
/** Monster units on a side: one unit per monster kind. */
export function monsterUnits(state, side) {
  const units = new Map();
  for (const f of state.figures) if ((f.origSide ?? f.side) === side && f.kind === "monster") {
    if (!units.has(f.monsterKey)) units.set(f.monsterKey, []);
    units.get(f.monsterKey).push(f);
  }
  return units;
}
function applyResult(figs, res) {
  if (res.holds) return;
  for (const f of figs) if (active(f)) { f.status = res.outcome === "surrender" ? "surrendered" : "fled"; f.target = null; }
}
const rollOf = (r) => ({ dice: r.dice, total: r.total, modified: r.modified, bonus: r.bonus ?? 0, penalty: r.penalty ?? 0 });

/**
 * The morale pass after fire and after melee. Player characters never check.
 * Order: leader lost, fear monsters in range, then the third-of-side check.
 */
export function moralePass(state, rng) {
  const out = [];
  state.leaderLostDone = state.leaderLostDone ?? {};
  const fearChecked = asSet(state.fearChecked), moraleChecked = asSet(state.moraleChecked), lairNoted = asSet(state.lairNoted);

  // Leader killed or captured: every monster unit on his side checks once at −2.
  for (const side of ["A", "B"]) {
    const L = state.figures.find((f) => f.id === state.leader?.[side]);
    if (!L || present(L) || state.leaderLostDone[side]) continue;
    state.leaderLostDone[side] = true;
    for (const [key, figs] of monsterUnits(state, side)) {
      const m = MONSTERS.find((x) => x.key === key), line = lossLineOf(m);
      if (m.morale?.never || !line || !figs.some(active) || figs.includes(L)) continue;
      const [res] = commanderLost([{ name: m.name, line, bonus: moraleDiceBonus(m) ?? 0, surrounded: isTrapped(state, figs) }], rng);
      applyResult(figs, res);
      out.push({ type: "morale", reason: "leader", side, monsterKey: key, name: m.name, leader: L.name, roll: rollOf(res.roll), needed: res.needed, holds: res.holds, outcome: res.outcome });
    }
  }

  // Fear: enemy NPC units within a dragon's, wraith's or roc's range check once per monster.
  for (const d of state.figures.filter((x) => x.kind === "monster" && present(x) && x.placed && fearRadius(monsterOf(x)) > 0)) {
    const side = opponent(d.side), radius = fearRadius(monsterOf(d));
    for (const [key, figs] of monsterUnits(state, side)) {
      const m = MONSTERS.find((x) => x.key === key), line = lossLineOf(m), k = `${side}:${key}:${d.id}`;
      if (fearChecked.has(k) || m.morale?.never || !line || fearRadius(m) > 0) continue;
      if (!figs.some((f) => active(f) && f.placed && distIn(f, d) <= radius)) continue;
      fearChecked.add(k);
      const bond = bondFor(state, figs, side);
      const res = manToManLossCheck({ name: m.name, original: figs.length, remaining: figs.filter(alive).length, line, bonus: moraleDiceBonus(m) ?? 0, commander: bond, surrounded: isTrapped(state, figs) }, rng);
      applyResult(figs, res);
      out.push({ type: "morale", reason: "fear", side, monsterKey: key, name: m.name, source: d.name, radius, bond, roll: rollOf(res.roll), needed: res.needed, holds: res.holds, outcome: res.outcome });
    }
  }

  // A third of the side killed: each monster unit checks once against its Loss Table row.
  for (const side of ["A", "B"]) {
    const sideFigs = state.figures.filter((f) => (f.origSide ?? f.side) === side);
    const sideKilled = sideFigs.filter((f) => !alive(f)).length;
    if (!manToManMoraleDue({ sideOriginal: sideFigs.length, sideKilled })) continue;
    for (const [key, figs] of monsterUnits(state, side)) {
      const unitKey = `${side}:${key}`;
      if (moraleChecked.has(unitKey)) continue;
      const m = MONSTERS.find((x) => x.key === key), line = lossLineOf(m);
      if (m.morale?.never || !line || !figs.some(active)) continue;
      if (key === "orc" && (state.chests ?? []).some((c) => c.monsterKey === "orc")) {
        const foes = state.figures.filter((e) => e.side !== side && present(e)).length, defenders = figs.filter(active).length;
        if (orcLairMoraleExempt({ defenders, attackers: foes })) {
          if (!lairNoted.has(unitKey)) { lairNoted.add(unitKey); out.push({ type: "morale-exempt", reason: "orc-lair", side, monsterKey: key, name: m.name, foes, defenders }); }
          continue;
        }
      }
      moraleChecked.add(unitKey);
      const killed = figs.filter((f) => !alive(f)).length, bond = bondFor(state, figs, side);
      const res = manToManLossCheck({ name: m.name, original: figs.length, remaining: figs.length - killed, line, bonus: moraleDiceBonus(m) ?? 0, commander: bond, surrounded: isTrapped(state, figs) }, rng);
      applyResult(figs, res);
      out.push({ type: "morale", reason: "casualties", side, monsterKey: key, name: m.name, sideKilled, sideTotal: sideFigs.length, killed, unitTotal: figs.length, row: line.row, scoreToRemain: line.scoreToRemain, bond, roll: rollOf(res.roll), needed: res.needed, holds: res.holds, outcome: res.outcome });
    }
  }
  state.fearChecked = [...fearChecked]; state.moraleChecked = [...moraleChecked]; state.lairNoted = [...lairNoted];
  return out;
}

/* ------------------------------------------------------------------ tests */
async function runSelfTests() {
  const { mulberry32 } = await import("./dice.mjs");
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };
  const seq = (v) => { let i = 0; return () => v[i++ % v.length]; };
  const d6 = (n) => (n - 0.5) / 6;
  const open = (w, h) => Array.from({ length: h }, () => Array(w).fill(false));
  const fig = (id, side, extra) => ({ id, side, origSide: side, name: `F${id}`, kind: "pc", x: id, y: 1, placed: true, hp: 6, maxHp: 6, ...extra });
  const orc = (id, side, x, extra) => ({ id, side, origSide: side, name: `Orc ${id}`, kind: "monster", monsterKey: "orc", x, y: 5, placed: true, hp: 4, maxHp: 4, ...extra });
  const fresh = (figs) => ({ phase: "fight", round: 0, step: "init", width: 30, height: 10, walls: open(30, 10), figures: figs, chests: [], leader: { A: null, B: null } });

  // Sequence and election.
  {
    const st = fresh([fig(1, "A"), orc(2, "B", 20)]);
    let r = apply(st, { type: "begin-round" }, seq([d6(5), d6(2)]));
    ok(r.ok && st.round === 1 && st.step === "elect" && r.events[1].winner === "A", "round 1: A wins initiative, election pending");
    ok(!apply(st, { type: "end-move" }).ok, "cannot move before the election");
    ok(!apply(st, { type: "elect", side: "B", choice: "move" }).ok, "loser cannot elect");
    r = apply(st, { type: "elect", side: "A", choice: "counter" });
    ok(r.ok && st.firstSide === "B" && st.step === "move-B" && r.events[0].choice === "counter", "A elects to move last: B moves first");
    ok(!apply(st, { type: "end-move", side: "A" }).ok, "wrong side cannot end the move");
    apply(st, { type: "end-move", side: "B" });
    ok(st.step === "move-A", "then A moves");
    r = apply(st, { type: "end-move", side: "A" });
    ok(st.step === "orders", "after both moves: Orders");
    r = apply(st, { type: "orders-end" });
    ok(st.step === "melee" && r.events.some((e) => e.type === "step-skipped" && e.step === "artillery") && r.events.some((e) => e.step === "missiles"), "no artillery, nothing to fire: straight to melee");
    r = apply(st, { type: "melee-resolved" });
    ok(r.ok && st.step === "init", "melee resolved: next round");
    apply(st, { type: "begin-round" }, seq([d6(1), d6(6)]));
    st.figures[0].action = "fire";
    apply(st, { type: "elect", side: "B", choice: "move" });
    ok(st.firstSide === "B", "B wins and moves first");
    apply(st, { type: "end-move" }); apply(st, { type: "end-move" }); apply(st, { type: "orders-end" });
    ok(st.step === "missiles", "a figure firing: missile step");
    ok(!apply(st, { type: "melee-resolved" }).ok, "cannot skip to melee");
    apply(st, { type: "missiles-resolved" }, Math.random);
    ok(st.step === "melee", "missiles resolved: melee");
  }
  // Fight over.
  {
    const st = fresh([fig(1, "A"), orc(2, "B", 20, { hp: 0 })]);
    st.step = "melee";
    const r = apply(st, { type: "melee-resolved" }, Math.random);
    ok(st.phase === "over" && st.winner === "A" && r.events.some((e) => e.type === "over"), "last orc down: A wins");
    ok(!apply(st, { type: "begin-round" }).ok, "nothing after the fight");
  }
  // Morale: a third of the side, once; leader within 12".
  {
    const orcs = [orc(2, "B", 10, { hp: 0 }), orc(3, "B", 11), orc(4, "B", 12)];
    const st = fresh([fig(1, "A"), ...orcs]);
    st.step = "melee"; st.leader.B = 4;
    const r = apply(st, { type: "melee-resolved" }, seq([d6(6), d6(6)]));
    const m = r.events.find((e) => e.type === "morale");
    ok(m && m.reason === "casualties" && m.bond === "with" && m.holds && m.roll.modified === 14, "a third down: orcs check with their leader (+2)");
    st.step = "melee";
    ok(!apply(st, { type: "melee-resolved" }, seq([d6(1), d6(1)])).events.some((e) => e.type === "morale"), "each unit checks once");
  }
  // Leader lost.
  {
    const st = fresh([fig(1, "A"), orc(2, "B", 10), orc(3, "B", 11), { ...orc(9, "B", 14), monsterKey: "hobgoblin", name: "Chief", hp: 0 }]);
    st.step = "melee"; st.leader.B = 9;
    const r = apply(st, { type: "melee-resolved" }, seq([d6(3), d6(3)]));
    const m = r.events.find((e) => e.reason === "leader");
    ok(m && m.roll.modified === 4 && !m.holds && st.figures[1].status === "fled", "leader down: orcs check at −2 and break");
  }
  // Fear: an enemy dragon within 15"; player characters never check.
  {
    const dragon = { id: 5, side: "A", origSide: "A", name: "Red", kind: "monster", monsterKey: "dragon-red", x: 2, y: 5, size: 3, placed: true, hp: 50, maxHp: 50 };
    const st = fresh([dragon, orc(2, "B", 20), orc(3, "B", 21), fig(7, "B")]);
    st.step = "melee";
    const r = apply(st, { type: "melee-resolved" }, seq([d6(6), d6(6)]));
    const f = r.events.filter((e) => e.reason === "fear");
    ok(f.length === 1 && f[0].monsterKey === "orc" && f[0].source === "Red", "orcs within 15\" of the dragon check; the fighter doesn't");
  }
  // Same seed, same fight.
  {
    const play = () => { const st = fresh([fig(1, "A"), orc(2, "B", 20)]); const rng = mulberry32(42); const ev = []; for (let i = 0; i < 3; i++) { ev.push(...apply(st, { type: "begin-round" }, rng).events); apply(st, { type: "elect", side: st.init.winner, choice: "move" }); apply(st, { type: "end-move" }); apply(st, { type: "end-move" }); apply(st, { type: "melee-resolved" }, rng); } return JSON.stringify(ev); };
    ok(play() === play(), "seeded replay is identical");
  }
  // Pass 2: moves, charges and behaviour through apply.
  {
    const st = fresh([fig(1, "A", { x: 2, y: 5, cls: "fighter", level: 1, armor: "chain+shield", weaponId: "sword" }), orc(2, "B", 25)]);
    st.step = "move-A";
    ok(apply(st, { type: "move", id: 1, x: 6, y: 5 }).ok && st.figures[0].x === 6, "move through apply");
    ok(!apply(st, { type: "move", id: 2, x: 20, y: 5 }).ok, "the other side can't move");
    ok(!apply(st, { type: "behave", side: "B" }).ok, "behave only on the moving side");
    st.step = "move-B";
    const r = apply(st, { type: "behave", side: "B" });
    ok(r.ok && r.events.some((e) => e.type === "behaviour") && st.figures[1].x < 25, "side B moves by behaviour");
    st.step = "move-A"; st.figures[0].moved = 0;
    const c = apply(st, { type: "charge-mode", id: 1, on: true });
    ok(c.ok && st.figures[0].charging && c.events[0].inches === 12, "charge mode on");
    const setup = { ...fresh([fig(9, "A", { placed: false })]), phase: "setup" };
    ok(apply(setup, { type: "move", id: 9, x: 3, y: 3 }).ok, "placing in setup");
    ok(!apply(setup, { type: "behave", side: "A" }).ok, "nothing else in setup");
  }
  // Pass 3: pass-through fire on a move.
  {
    const archer = fig(1, "A", { x: 2, y: 5, missile: "shortbow", action: "passthrough", facing: 0, dex: 10, ac: 7, armor: "leather", weaponId: "sword" });
    const orc5 = orc(2, "B", 28, { y: 5, facing: 4, ac: 7 });
    const st = fresh([archer, orc5]); st.step = "move-B";
    const r = apply(st, { type: "move", id: 2, x: 16, y: 5 }, () => 0.999);
    const v = r.events.find((e) => e.type === "volley");
    ok(r.ok && v && v.passThrough && v.id === 1 && archer.lastFired === st.round, "the archer shoots the orc at its half-move point");
    ok(orc5.hp <= 0 && orc5.x !== 16, "the orc falls where it was hit, not where it was going");
  }
  // Standing orders.
  {
    const archer = fig(1, "A", { x: 2, y: 5, missile: "shortbow", action: "fire", target: 2, facing: 0 });
    const caster = fig(3, "A", { x: 2, y: 7, action: "cast:sleep", castAim: { x: 9, y: 9 } });
    const st = fresh([archer, orc(2, "B", 20, { y: 5 }), caster]);
    const r = apply(st, { type: "begin-round" }, seq([d6(3), d6(4)]));
    ok(archer.action === "fire" && archer.target === 2, "fire and its target carry into the next round");
    ok(caster.action === "melee" && caster.castAim === null && r.events.some((e) => e.type === "order-lapsed" && e.id === 3), "spells are chosen afresh");
    st.step = "init"; st.figures[1].x = 59; st.width = 60; st.walls = open(60, 10);
    const r2 = apply(st, { type: "begin-round" }, seq([d6(3), d6(4)]));
    ok(archer.action === "melee" && r2.events.some((e) => e.id === 1 && /out of range/.test(e.why)), "fire lapses when the target is out of range");
  }
  // Pass 4: the melee step through apply.
  {
    const a = fig(1, "A", { x: 5, y: 5, cls: "fighter", level: 1, weaponId: "sword", ac: 4, target: 2, stance: "attack", action: "melee" });
    const o = orc(2, "B", 6, { y: 5, ac: 6, target: 1, stance: "attack", action: "melee", hp: 1 });
    const st = fresh([a, o]); st.step = "melee"; st.contacts = new Map(); st.firstSide = "A";
    const r = apply(st, { type: "melee" }, () => 0.99);
    const m = r.events.find((e) => e.type === "melee");
    ok(r.ok && m && m.cards.length && m.fell.includes(2) && st.phase === "over", "melee resolves, the orc falls, the fight ends");
  }
  // Pass 5: the missile step and parley through apply.
  {
    const a = fig(1, "A", { x: 2, y: 5, missile: "shortbow", action: "fire", target: 2, dex: 10, ac: 7, facing: 0 });
    const o = orc(2, "B", 12, { y: 5, ac: 6, hp: 1 });
    const st = fresh([a, o]); st.step = "missiles"; st.contacts = new Map();
    const r = apply(st, { type: "missiles" }, () => 0.99);
    ok(r.ok && r.events.find((e) => e.type === "missiles")?.fell.includes(2) && st.phase === "over", "the archer kills the orc in the missile step");
    const p = fig(5, "A", { alignment: "chaos", languages: ["orc"], langSlots: 0, inv: { coins: { gp: 0 } } });
    const s2 = fresh([p, orc(6, "B", 20)]); s2.step = "move-A"; s2.encounter = new Map([["B:orc", { side: "B", monsterKey: "orc", languages: ["orc"], reaction: null }]]);
    const t = apply(s2, { type: "parley", pcId: 5, figId: 6, lang: "orc" }, seq([d6(6), d6(6)]));
    ok(t.ok && t.events[0].type === "talk" && s2.figures[1].status === "withdrew", "a parley through apply");
  }
  // Slice 5: Orders step, Previous, Undo move.
  {
    const a = fig(1, "A", { x: 5, y: 5 }), o = orc(2, "B", 20, { y: 5 });
    const st = fresh([a, o]); st.step = "elect"; st.init = { winner: "A" }; st.round = 1;
    ok(apply(st, { type: "elect", side: "A", choice: "move" }).ok && st.step === "move-A" && st.moveStart["1:move-A"].figs[1].x === 5, "the first move step remembers where its figures stood");
    ok(apply(st, { type: "move", id: 1, x: 8, y: 5 }).ok && a.x === 8 && a.moved > 0, "moved");
    ok(apply(st, { type: "undo-move", id: 1 }).ok && a.x === 5 && a.moved === 0, "Undo move puts him back with his full move");
    ok(!apply(st, { type: "undo-move", id: 2 }).ok, "only a figure whose side is moving");
    apply(st, { type: "end-move", side: "A" });
    ok(st.step === "move-B", "the last mover");
    const r = apply(st, { type: "end-move", side: "B" });
    ok(r.ok && st.step === "orders" && r.events.some((e) => e.type === "orders-open"), "after the last move: Orders, not missiles");
    ok(apply(st, { type: "step-back" }).ok && st.step === "move-B", "Previous: back to the last move");
    ok(apply(st, { type: "step-back" }).ok && st.step === "move-A" && !apply(st, { type: "step-back" }).ok, "and to the first; no further");
    apply(st, { type: "end-move", side: "A" }); apply(st, { type: "end-move", side: "B" });
    ok(apply(st, { type: "orders-end" }).ok && (st.step === "missiles" || st.step === "melee"), "Orders closes into resolution");
  }
  // Slice 5: orders and GM tools through apply.
  {
    const a = fig(1, "A", { x: 5, y: 5 }), o = orc(2, "B", 6, { y: 5 });
    const st = fresh([a, o]); st.step = "move-A";
    ok(apply(st, { type: "orders", id: 1, target: 2, stance: "parry" }).ok && a.target === 2 && a.stance === "parry", "orders through apply");
    ok(!apply(st, { type: "orders", id: 1, action: "dance" }).ok, "a bad order is refused");
    ok(apply(st, { type: "leader", side: "B", id: 2 }).ok && st.leader.B === 2 && !apply(st, { type: "leader", side: "A", id: 2 }).ok, "the leader is one of his own side");
    const setup = { ...fresh([fig(7, "A")]), phase: "setup" };
    ok(apply(setup, { type: "orders", id: 7, stance: "parry" }).ok && apply(setup, { type: "gm", id: 7, tool: "invulnerable", value: true }).ok, "orders and GM tools during setup");
    const r = apply(st, { type: "gm", id: 2, tool: "kill" });
    ok(r.ok && st.phase === "over" && r.events.some((e) => e.type === "over"), "GM kill ends the fight");
  }
  console.log(`runner.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

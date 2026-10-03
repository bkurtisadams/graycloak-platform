/**
 * OD&D — Chainmail engine · fight runner
 * odd-chainmail-rules · src/runner.mjs
 *
 * The fight's rules spine, independent of any page: apply(state, action, rng)
 * checks the action is legal at this step, changes the state, and returns data
 * events for a client to show. It mutates the state it is given; a server
 * clones before calling and saves the result.
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

export const Step = Object.freeze({
  INIT: "init", ELECT: "elect", ARTILLERY: "artillery", MISSILES: "missiles", MELEE: "melee"
});
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
  return state.figures.some((f) => active(f) && (f.action === "fire" || f.action?.startsWith?.("cast:")
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
 */
export function apply(state, action, rng) {
  const events = [];
  const fail = (error) => ({ ok: false, events: [], error });
  const byId = (id) => state.figures.find((f) => f.id === id);
  const setupOk = ["move", "group-move"].includes(action?.type) && state.phase === "setup";
  if (state.phase !== "fight" && !setupOk) return fail("the fight is not running");
  switch (action?.type) {
    case "move": {
      const r = moveFigure(state, byId(action.id), action.x, action.y);
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
      return r.ok ? { ok: true, events: r.events } : fail(r.error);
    }
    case "group-move": {
      const members = (action.ids ?? []).map(byId).filter((g) => g && g.placed && present(g));
      const lead = byId(action.leadId);
      if (!lead || !members.includes(lead)) return fail("the lead must be in the group");
      const plan = planGroupMove(state, members, lead, action.x, action.y);
      if (!plan.ok) return { ok: false, events: [], error: plan.bad.map((b) => `${byId(b.id).name}: ${b.why}`).join("; "), plan };
      return commitGroupMove(state, plan);
    }
    case "behave": {
      if (moverOf(state.step) !== action.side) return fail(`side ${action.side} is not moving`);
      return { ok: true, events: behave(state, action.side) };
    }
    case "begin-round": {
      if (state.step !== Step.INIT) return fail(`not at the start of a round (step ${state.step})`);
      state.round = (state.round ?? 0) + 1;
      for (const f of state.figures) {
        f.moved = 0; f.action = "melee"; f.secondTarget = null; f.charging = false;
        if (f.status === "paralyzed" && state.round >= (f.paralyzedUntil ?? 0)) f.status = null;
      }
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
      state.step = moveStep(state.firstSide);
      events.push({ type: "election", winner: state.init.winner, choice, firstSide: state.firstSide, ai: !!action.ai });
      return { ok: true, events };
    }
    case "end-move": {
      const side = moverOf(state.step);
      if (!side) return fail("no side is moving");
      if (action.side && action.side !== side) return fail(`side ${side} is moving, not ${action.side}`);
      if (side === state.firstSide) { state.step = moveStep(opponent(side)); return { ok: true, events }; }
      if (!artilleryStepNeeded(state)) events.push({ type: "step-skipped", step: Step.ARTILLERY, why: "no artillery on the board" });
      if (missileStepNeeded(state)) state.step = Step.MISSILES;
      else { state.step = Step.MELEE; events.push({ type: "step-skipped", step: Step.MISSILES, why: "nothing to fire or cast" }); }
      return { ok: true, events };
    }
    case "missiles-resolved": {
      if (state.step !== Step.MISSILES) return fail("not the missile step");
      events.push(...moralePass(state, rng));
      checkOver(state, events);
      if (state.phase === "fight") state.step = Step.MELEE;
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
    ok(st.step === "melee" && r.events.some((e) => e.type === "step-skipped" && e.step === "artillery") && r.events.some((e) => e.step === "missiles"), "no artillery, nothing to fire: straight to melee");
    r = apply(st, { type: "melee-resolved" });
    ok(r.ok && st.step === "init", "melee resolved: next round");
    apply(st, { type: "begin-round" }, seq([d6(1), d6(6)]));
    st.figures[0].action = "fire";
    apply(st, { type: "elect", side: "B", choice: "move" });
    ok(st.firstSide === "B", "B wins and moves first");
    apply(st, { type: "end-move" }); apply(st, { type: "end-move" });
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
  console.log(`runner.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

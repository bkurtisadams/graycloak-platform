/**
 * OD&D — an online fight: one action from one person
 * odd-chainmail-rules · src/session.mjs
 *
 * Slice 5, step 2 (Oct 2026). The server calls applyAs for every action; it
 * is pure, so the same code is tested here without Firebase.
 *   1. mayAct: may this person send this action?
 *   2. "ready" / "unready" { ids }: each figure on the moving side is marked
 *      Ready by whoever controls it once it has moved and has its orders
 *      (Kurt, Oct 2026: readiness is per character, not per player). The
 *      side's move ends when every able figure on it is Ready; figures the
 *      game runs, and asleep or held ones, need no mark. Moving a Ready
 *      figure or changing its orders clears its mark. "Change orders"
 *      (unready) works until the step advances.
 *   3. the runner applies the action;
 *   4. advance: steps that need no one's decision run at once — a side run
 *      entirely by the game elects, behaves and ends its move; the missile
 *      step and the melee step resolve; the next round begins (once per call,
 *      so a fight between two game sides can't run away in one request).
 */
import { apply, Step, moverOf, AI_ELECTION } from "./runner.mjs";
import { present } from "./board.mjs";
import { mayAct, controllerOf, PLAYER_COLOURS } from "./view.mjs";

import { needsReady, isReady, unreadyIds, readyCount, waitingOn, stepKey } from "./readiness.mjs";
export { needsReady, isReady, unreadyIds, readyCount, waitingOn };
const doneKey = stepKey;

/** Actions that change a figure's move or orders, and so clear its Ready mark. */
const CLEARS_READY = Object.freeze(["move", "split-fire", "charge-mode", "close-on", "group-move", "orders", "draw-weapon", "undo-move"]);
const idsOf = (a) => [a.id, ...(a.ids ?? [])].filter((x) => x != null);
const gameRunsSide = (state, side) => {
  const figs = state.figures.filter((f) => f.side === side && present(f));
  return figs.length > 0 && figs.every((f) => controllerOf(state, f) === "game");
};

/** Steps that need no decision. Returns the events. */
export function advance(state, rng, { autoResolve = true, roundsBegun = 0 } = {}) {
  const events = [];
  const run = (action) => { const r = apply(state, action, rng); if (!r.ok) throw new Error(`advance: ${action.type}: ${r.error}`); events.push(...r.events); };
  for (let guard = 0; guard < 12 && state.phase === "fight"; guard++) {
    const side = moverOf(state.step);
    if (state.step === Step.INIT && autoResolve && roundsBegun === 0) { roundsBegun++; run({ type: "begin-round" }); continue; }
    if (state.step === Step.ELECT && gameRunsSide(state, state.init.winner)) { run({ type: "elect", side: state.init.winner, choice: AI_ELECTION, ai: true }); continue; }
    if (side) {
      if (gameRunsSide(state, side) && state.behaved !== doneKey(state)) { state.behaved = doneKey(state); run({ type: "behave", side }); continue; }
      if (!unreadyIds(state).length) { run({ type: "end-move", side }); continue; }
      break;
    }
    if (state.step === Step.ORDERS) { if (!unreadyIds(state).length) { run({ type: "orders-end" }); continue; } break; }
    if (state.step === Step.MISSILES && autoResolve) { run({ type: "missiles" }); continue; }
    if (state.step === Step.MELEE && autoResolve) { run({ type: "melee" }); continue; }
    break;
  }
  return events;
}

/**
 * Apply one action as this person. who: { uid } | { referee: true } |
 * { server: true }. Returns { ok, events, error }; the state is changed only
 * when ok.
 */
export function applyAs(state, who, action, rng, opts = {}) {
  const m = mayAct(state, who, action);
  if (!m.ok) return { ok: false, events: [], error: m.why };
  const events = [];
  if (action.type === "force-next") {
    // Next ▶ (the referee): advance whether or not everyone is Ready; anyone not Ready
    // goes in with his standing orders (Kurt, Oct 2026, as on the Chainmail board).
    const side = moverOf(state.step);
    const step = state.step;
    const next = side ? { type: "end-move", side } : step === Step.ORDERS ? { type: "orders-end" } : step === Step.INIT ? { type: "begin-round" }
      : step === Step.ELECT ? { type: "elect", side: state.init.winner, choice: AI_ELECTION, ai: true } : step === Step.MISSILES ? { type: "missiles" } : step === Step.MELEE ? { type: "melee" } : null;
    if (!next) return { ok: false, events: [], error: "nothing to advance" };
    const pending = unreadyIds(state).map((id) => state.figures.find((f) => f.id === id)?.name);
    const r = apply(state, next, rng);
    if (!r.ok) return r;
    events.push({ type: "forced", step, notReady: pending }, ...r.events);
  } else if (action.type === "caller") {
    // the referee names who calls a side's election (null: back to the default)
    if (!["A", "B"].includes(action.side)) return { ok: false, events: [], error: "no such side" };
    const ok = action.who == null || action.who === "referee" || state.figures.some((f) => f.side === action.side && present(f) && controllerOf(state, f) === action.who);
    if (!ok) return { ok: false, events: [], error: "he runs no figure on that side" };
    state.callers = { ...(state.callers ?? {}), [action.side]: action.who ?? null };
    return { ok: true, events: [{ type: "caller", side: action.side, who: action.who ?? null, name: action.who ? state.people?.[action.who]?.name ?? (action.who === "referee" ? "the referee" : action.who) : null }] };
  } else if (action.type === "colour") {
    // a player picks his own colour from the palette, one nobody else has
    const c = String(action.color ?? "").toLowerCase();
    if (!PLAYER_COLOURS.includes(c)) return { ok: false, events: [], error: "pick one of the colours offered" };
    const uid = who.uid;
    if (Object.entries(state.people ?? {}).some(([u, p]) => u !== uid && p.color === c)) return { ok: false, events: [], error: "another player has that colour" };
    state.people = { ...(state.people ?? {}), [uid]: { name: "Player", ...(state.people?.[uid] ?? {}), color: c } };
    return { ok: true, events: [{ type: "colour", uid, name: state.people[uid].name, color: c }] };
  } else if (action.type === "step-back") {
    const r = apply(state, action, rng);
    if (!r.ok) return r;
    // the re-opened step's Ready marks are cleared, so its figures can act again
    if (state.ready) { const key = doneKey(state); const marks = { ...state.ready }; for (const [id, k] of Object.entries(marks)) if (k === key) delete marks[id]; state.ready = marks; }
    return { ok: true, events: r.events };   // no advance: the referee re-opened it on purpose
  } else if (action.type === "ready" || action.type === "unready") {
    const side = moverOf(state.step);
    if (!side && state.step !== Step.ORDERS) return { ok: false, events: [], error: "nothing to mark Ready in this step" };
    const need = new Set(needsReady(state).map((f) => f.id));
    const ids = [...new Set(action.ids ?? [])];
    if (!ids.length || ids.some((id) => !need.has(id))) return { ok: false, events: [], error: side ? "only figures moving this step can be marked" : "only figures with a choice to make can be marked" };
    const marks = { ...(state.ready ?? {}) };
    for (const id of ids) if (action.type === "ready") marks[id] = doneKey(state); else delete marks[id];
    state.ready = marks;
    const { ready, of } = readyCount(state);
    events.push({ type: action.type, ids, names: ids.map((id) => state.figures.find((f) => f.id === id)?.name), side: side ?? null, step: state.step, readyCount: ready, of });
  } else {
    const r = apply(state, action, rng);
    if (!r.ok) return r;
    events.push(...r.events);
    if (CLEARS_READY.includes(action.type) && state.ready) {
      const cleared = idsOf(action).filter((id) => state.ready[id] != null);
      if (cleared.length) { const marks = { ...state.ready }; for (const id of cleared) delete marks[id]; state.ready = marks; events.push({ type: "unready", ids: cleared, names: cleared.map((id) => state.figures.find((f) => f.id === id)?.name), side: moverOf(state.step), step: state.step, changed: true, ...((c) => ({ readyCount: c.ready, of: c.of }))(readyCount(state)) }); }
    }
  }
  events.push(...advance(state, rng, { ...opts, roundsBegun: action.type === "begin-round" ? 1 : 0 }));
  return { ok: true, events };
}

/* ------------------------------------------------------------------ tests */
async function runSelfTests() {
  const { seedFight, rngOf } = await import("./fight-store.mjs");
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };
  const open = (w, h) => Array.from({ length: h }, () => Array(w).fill(false));
  const pc = (id, x, y) => ({ id, side: "A", origSide: "A", name: `Hero ${id}`, kind: "pc", cls: "fighter", level: 3, armor: "chain+shield", ac: 4, weaponId: "sword", dex: 10, x, y, placed: true, hp: 14, maxHp: 14, stance: "attack", target: null, action: "melee", slotsLeft: [], inv: { coins: { gp: 0 }, items: [] } });
  const orc = (id, x, y) => ({ id, side: "B", origSide: "B", name: `Orc ${id}`, kind: "monster", monsterKey: "orc", ac: 6, x, y, placed: true, hp: 5, maxHp: 5, stance: "attack", target: null, action: "melee" });
  const fight = (control) => {
    const st = { phase: "fight", round: 0, step: "init", width: 30, height: 10, walls: open(30, 10), contacts: new Map(), chests: [], leader: { A: null, B: null }, encounter: new Map(), figures: [pc(1, 4, 5), pc(2, 4, 6), orc(3, 20, 5), orc(4, 20, 6)], control };
    const rng = seedFight(st, 11);
    return { st, rng };
  };
  const kurt = { uid: "kurt" }, bob = { uid: "bob" }, ref = { referee: true }, server = { server: true };
  {
    const { st, rng } = fight({ 1: "kurt", 2: "bob", 3: "game", 4: "game" });
    const r = applyAs(st, server, { type: "begin-round" }, rng);
    ok(r.ok && st.round === 1, "the server begins the round");
    if (st.step === "elect") {
      ok(st.init.winner === "A", "the players' side won and must elect");
      ok(!applyAs(st, kurt, { type: "elect", side: "B", choice: "move" }, rng).ok, "can't elect for the other side");
      ok(!applyAs(st, bob, { type: "elect", side: "A", choice: "counter" }, rng).ok && applyAs(st, kurt, { type: "elect", side: "A", choice: "counter" }, rng).ok, "the side's caller elects; another player on it can't");
    }
    ok(st.step === "move-A", "the game side moved itself first or the players' turn has come");
    ok(waitingOn(st).join() === "bob,kurt" && unreadyIds(st).join() === "1,2", "waiting on both players' characters");
    ok(!applyAs(st, kurt, { type: "end-move", side: "A" }, rng).ok, "one player can't end a shared move");
    ok(applyAs(st, kurt, { type: "move", id: 1, x: 7, y: 5 }, rng).ok && st.figures[0].x === 7, "Kurt moves his own figure");
    ok(!applyAs(st, kurt, { type: "move", id: 2, x: 7, y: 6 }, rng).ok, "not Bob's");
    ok(!applyAs(st, kurt, { type: "ready", ids: [2] }, rng).ok, "Kurt can't mark Bob's character");
    const d1 = applyAs(st, kurt, { type: "ready", ids: [1] }, rng);
    ok(d1.ok && d1.events[0].readyCount === 1 && d1.events[0].of === 2 && st.step === "move-A", "Kurt's character is Ready; 1 of 2");
    ok(applyAs(st, kurt, { type: "orders", id: 1, stance: "parry" }, rng).ok && unreadyIds(st).join() === "1,2", "changing orders clears the mark");
    ok(applyAs(st, kurt, { type: "ready", ids: [1] }, rng).ok && applyAs(st, kurt, { type: "unready", ids: [1] }, rng).ok && unreadyIds(st).includes(1), "change orders takes Ready back");
    applyAs(st, kurt, { type: "ready", ids: [1] }, rng);
    const d2 = applyAs(st, bob, { type: "ready", ids: [2] }, rng);
    ok(d2.ok && st.round >= 1 && d2.events.some((e) => e.type === "behaviour" || e.type === "melee" || e.type === "step-skipped"), "the last mark ends the step and the game carries on");
    ok(st.step === "move-A" || st.step === "elect" || st.phase === "over", "the server runs on until a person must decide");
  }
  {
    const { st, rng } = fight({ 1: "kurt", 2: "kurt", 3: "referee", 4: "referee" });
    applyAs(st, server, { type: "begin-round" }, rng);
    if (st.step === "elect") applyAs(st, st.init.winner === "A" ? kurt : ref, { type: "elect", side: st.init.winner, choice: "move" }, rng);
    const side = moverOf(st.step);
    ok(waitingOn(st).join() === (side === "A" ? "kurt" : "referee"), "the referee's monsters wait on the referee");
    ok(applyAs(st, side === "A" ? kurt : ref, { type: "ready", ids: unreadyIds(st) }, rng).ok && moverOf(st.step) !== side, "readying all of them moves play to the other side");
  }
  {
    const { st, rng } = fight({ 1: "game", 2: "game", 3: "game", 4: "game" });
    const r = applyAs(st, server, { type: "begin-round" }, rng);
    ok(r.ok && (st.step === "init" || st.phase === "over") && st.round === 1, "two game sides play one round per call, then stop");
    const r2 = applyAs(st, server, { type: "gm", id: 3, tool: "heal" }, rng);
    ok(r2.ok && st.round === 2, "the next call plays the next round");
  }
  {
    const { st, rng } = fight({ 1: "kurt", 2: "kurt", 3: "game", 4: "game" });
    const before = JSON.stringify(st.figures);
    ok(!applyAs(st, kurt, { type: "melee" }, rng).ok && JSON.stringify(st.figures) === before, "a refused action changes nothing");
    ok(rngOf(st)() >= 0, "the dice live in the state");
  }
  // Orders: both sides' figures with a choice mark Ready; Next and Previous for the referee
  {
    const { st, rng } = fight({ 1: "kurt", 2: "bob", 3: "referee", 4: "referee" });
    st.figures[2].x = 5; st.figures[3].x = 5; // orcs in contact with the party
    applyAs(st, server, { type: "begin-round" }, rng);
    if (st.step === "elect") applyAs(st, ref, { type: "elect", side: st.init.winner, choice: "move" }, rng);
    applyAs(st, ref, { type: "force-next" }, rng); applyAs(st, ref, { type: "force-next" }, rng);
    ok(st.step === "orders" && unreadyIds(st).length === 4, "after both moves: Orders, waiting on both sides' figures in contact");
    ok(!applyAs(st, kurt, { type: "force-next" }, rng).ok && !applyAs(st, kurt, { type: "step-back" }, rng).ok, "Next and Previous are the referee's");
    ok(applyAs(st, kurt, { type: "ready", ids: [1] }, rng).ok && applyAs(st, ref, { type: "step-back" }, rng).ok && st.step.startsWith("move-"), "Previous re-opens the last move");
    applyAs(st, ref, { type: "force-next" }, rng);
    ok(st.step === "orders", "Next brings it back to Orders");
    for (const [who, id] of [[kurt, 1], [bob, 2], [ref, 3]]) applyAs(st, who, { type: "ready", ids: [id] }, rng);
    ok(st.step === "orders" && unreadyIds(st).join() === "4", "three of four ready: still Orders");
    const r = applyAs(st, ref, { type: "force-next" }, rng);
    ok(r.ok && r.events[0].type === "forced" && r.events[0].notReady.join() === "Orc 4" && st.step !== "orders", "Next resolves now, naming who wasn't Ready");
  }
  {
    const { st } = fight({ 1: "kurt", 2: "bob", 3: "game", 4: "game" }); st.people = { referee: { name: "Ref", color: "#1f2b38" }, kurt: { name: "Kurt", color: PLAYER_COLOURS[0] }, bob: { name: "Bob", color: PLAYER_COLOURS[1] } };
    ok(applyAs(st, { uid: "kurt" }, { type: "colour", color: PLAYER_COLOURS[3] }, () => 0.5).ok && st.people.kurt.color === PLAYER_COLOURS[3], "a player picks his own colour");
    ok(!applyAs(st, { uid: "kurt" }, { type: "colour", color: PLAYER_COLOURS[1] }, () => 0.5).ok && !applyAs(st, { uid: "kurt" }, { type: "colour", color: "#ff0000" }, () => 0.5).ok, "not one another player has, nor one off the palette");
    ok(!applyAs(st, { uid: "carl" }, { type: "colour", color: PLAYER_COLOURS[5] }, () => 0.5).ok, "only people in the fight");
    ok(applyAs(st, { referee: true }, { type: "caller", side: "A", who: "bob" }, () => 0.5).ok && st.callers.A === "bob", "the referee names Bob to call for side A");
    ok(!applyAs(st, { referee: true }, { type: "caller", side: "A", who: "carl" }, () => 0.5).ok && !applyAs(st, { uid: "kurt" }, { type: "caller", side: "A", who: "kurt" }, () => 0.5).ok, "not someone with no figure there, and never a player");
  }
  console.log(`session.mjs — all self-tests passed (${pass} assertions).`);
}
if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

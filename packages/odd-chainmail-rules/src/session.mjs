/**
 * OD&D — an online fight: one action from one person
 * odd-chainmail-rules · src/session.mjs
 *
 * Slice 5, step 2 (Oct 2026). The server calls applyAs for every action; it
 * is pure, so the same code is tested here without Firebase.
 *   1. mayAct: may this person send this action?
 *   2. "done": a player (or the referee, for his own figures) has finished
 *      moving; the side's move ends when everyone controlling a figure on it
 *      is done. Figures run by the game wait for no one.
 *   3. the runner applies the action;
 *   4. advance: steps that need no one's decision run at once — a side run
 *      entirely by the game elects, behaves and ends its move; the missile
 *      step and the melee step resolve; the next round begins (once per call,
 *      so a fight between two game sides can't run away in one request).
 */
import { apply, Step, moverOf, AI_ELECTION } from "./runner.mjs";
import { present } from "./board.mjs";
import { mayAct, controllerOf } from "./view.mjs";

const doneKey = (state) => `${state.round}:${state.step}`;

/** Who the moving side is waiting on: uids, and "referee" for figures the referee runs. */
export function waitingOn(state) {
  const side = moverOf(state.step);
  if (!side || state.phase !== "fight") return [];
  const owners = new Set(state.figures.filter((f) => f.side === side && present(f)).map((f) => controllerOf(state, f)).filter((c) => c !== "game"));
  return [...owners].filter((c) => state.done?.[c] !== doneKey(state)).sort();
}
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
      if (!waitingOn(state).length) { run({ type: "end-move", side }); continue; }
      break;
    }
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
  if (action.type === "done") {
    const side = moverOf(state.step);
    if (!side) return { ok: false, events: [], error: "no side is moving" };
    const me = who.uid ?? "referee";
    if (!waitingOn(state).includes(me)) return { ok: false, events: [], error: "nothing of yours is waiting to move" };
    state.done = { ...(state.done ?? {}), [me]: doneKey(state) };
    events.push({ type: "done", who: me, side, waitingOn: waitingOn(state) });
  } else {
    const r = apply(state, action, rng);
    if (!r.ok) return r;
    events.push(...r.events);
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
      ok(applyAs(st, bob, { type: "elect", side: "A", choice: "counter" }, rng).ok, "a player on the side elects");
    }
    ok(st.step === "move-A", "the game side moved itself first or the players' turn has come");
    ok(waitingOn(st).join() === "bob,kurt", "waiting on both players");
    ok(!applyAs(st, kurt, { type: "end-move", side: "A" }, rng).ok, "one player can't end a shared move");
    ok(applyAs(st, kurt, { type: "move", id: 1, x: 7, y: 5 }, rng).ok && st.figures[0].x === 7, "Kurt moves his own figure");
    ok(!applyAs(st, kurt, { type: "move", id: 2, x: 7, y: 6 }, rng).ok, "not Bob's");
    const d1 = applyAs(st, kurt, { type: "done" }, rng);
    ok(d1.ok && d1.events[0].waitingOn.join() === "bob" && st.step === "move-A", "Kurt is done; still waiting on Bob");
    ok(!applyAs(st, kurt, { type: "done" }, rng).ok, "done only once a step");
    const d2 = applyAs(st, bob, { type: "done" }, rng);
    ok(d2.ok && st.round >= 1 && d2.events.some((e) => e.type === "behaviour" || e.type === "melee" || e.type === "step-skipped"), "Bob done: the step ends and the game carries on");
    ok(st.step === "move-A" || st.step === "elect" || st.phase === "over", "the server runs on until a person must decide");
  }
  {
    const { st, rng } = fight({ 1: "kurt", 2: "kurt", 3: "referee", 4: "referee" });
    applyAs(st, server, { type: "begin-round" }, rng);
    if (st.step === "elect") applyAs(st, st.init.winner === "A" ? kurt : ref, { type: "elect", side: st.init.winner, choice: "move" }, rng);
    const side = moverOf(st.step);
    ok(waitingOn(st).join() === (side === "A" ? "kurt" : "referee"), "the referee's monsters wait on the referee");
    ok(applyAs(st, side === "A" ? kurt : ref, { type: "done" }, rng).ok && moverOf(st.step) !== side, "done moves play to the other side");
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
  console.log(`session.mjs — all self-tests passed (${pass} assertions).`);
}
if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

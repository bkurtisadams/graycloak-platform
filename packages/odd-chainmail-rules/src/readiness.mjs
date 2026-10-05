/**
 * OD&D — who must mark Ready, step by step
 * odd-chainmail-rules · src/readiness.mjs
 *
 * Slice 5 (Oct 2026). Shared by session.mjs (when a step may advance) and
 * view.mjs (each viewer's needIds), so the server and every page agree.
 *   move-A / move-B  every able figure of the moving side
 *   orders           every able figure, either side, with a choice to make:
 *                    in contact with a foe, or able to shoot or cast at one
 *                    (Kurt, Oct 2026: a figure with nothing to decide is
 *                    ready on its own, so nobody clicks through empty turns)
 * Figures the game runs never need a mark.
 */
import { present, active, adjacent, distIn } from "./board.mjs";
import { moverOf, Step } from "./runner.mjs";
import { missileRange } from "./tables.mjs";
import { combatSpellsFor } from "./casting.mjs";

/** Who runs a figure: a player's uid, "referee" or "game"; no entry is the referee's. */
export const controllerOf = (state, f) => state.control?.[f.id] ?? "referee";
export const stepKey = (state) => `${state.round}:${state.step}`;

/** In the Orders step, does this figure have anything to decide? */
export function hasChoice(state, f) {
  const foes = state.figures.filter((g) => g.side !== f.side && present(g));
  if (!foes.length) return false;
  if (foes.some((g) => adjacent(f, g))) return true;
  if (f.missile) { const max = missileRange(f.missile); if (foes.some((g) => distIn(f, g) <= max)) return true; }
  if (f.kind === "pc" && combatSpellsFor(f.cls, f.slotsLeft ?? []).length) return true;
  return false;
}

/** The figures that must be marked Ready before the current step may advance. */
export function needsReady(state) {
  if (state.phase !== "fight") return [];
  const side = moverOf(state.step);
  const mine = (f) => active(f) && controllerOf(state, f) !== "game";
  if (side) return state.figures.filter((f) => f.side === side && mine(f));
  if (state.step === Step.ORDERS) return state.figures.filter((f) => mine(f) && hasChoice(state, f));
  return [];
}
export const isReady = (state, f) => state.ready?.[f.id] === stepKey(state);
export const unreadyIds = (state) => needsReady(state).filter((f) => !isReady(state, f)).map((f) => f.id);
export function readyCount(state) {
  const need = needsReady(state);
  return { ready: need.filter((f) => isReady(state, f)).length, of: need.length };
}
/** Who the step is waiting on: uids, and "referee" for figures the referee runs. */
export function waitingOn(state) {
  if (state.phase === "fight" && state.step === Step.ELECT && state.init?.winner) { const c = callerOf(state, state.init.winner); return c && c !== "game" ? [c] : []; }
  return [...new Set(needsReady(state).filter((f) => !isReady(state, f)).map((f) => controllerOf(state, f)))].sort();
}

/**
 * Who calls a side's choice to move first or last when it wins initiative
 * (slice 5 pass 2, Oct 2026): the one the referee named for the side, while he
 * still runs a figure on it; else whoever runs the side's leader; else whoever
 * runs the most of its figures (a tie goes to the one with the lowest-numbered
 * figure). "game" only when the game runs the whole side; null if the side is gone.
 */
export function callerOf(state, side) {
  const figs = state.figures.filter((f) => f.side === side && present(f));
  if (!figs.length) return null;
  const ctl = (f) => controllerOf(state, f);
  const named = state.callers?.[side];
  if (named && (named === "referee" || figs.some((f) => ctl(f) === named))) return named;
  const lead = state.leader?.[side] != null ? figs.find((f) => f.id === state.leader[side]) : null;
  if (lead && ctl(lead) !== "game") return ctl(lead);
  const count = new Map();
  for (const f of [...figs].sort((a, b) => a.id - b.id)) if (ctl(f) !== "game") count.set(ctl(f), (count.get(ctl(f)) ?? 0) + 1);
  if (!count.size) return "game";
  let best = null; for (const [c, n] of count) if (best == null || n > count.get(best)) best = c;
  return best;
}

/* ------------------------------------------------------------------ tests */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };
  const open = (w, h) => Array.from({ length: h }, () => Array(w).fill(false));
  const pc = (id, x, extra) => ({ id, side: "A", name: `PC ${id}`, kind: "pc", cls: "fighter", level: 1, x, y: 5, placed: true, hp: 6, maxHp: 6, slotsLeft: [], ...extra });
  const orc = (id, x) => ({ id, side: "B", name: `Orc ${id}`, kind: "monster", monsterKey: "orc", x, y: 5, placed: true, hp: 5, maxHp: 5 });
  const st = { phase: "fight", round: 2, step: "move-A", width: 60, height: 10, walls: open(60, 10), figures: [pc(1, 5), pc(2, 5, { y: 7, missile: "shortbow" }), pc(3, 5, { y: 9, cls: "magic-user", slotsLeft: [1, 0, 0, 0, 0, 0] }), pc(4, 5, { y: 3 }), orc(5, 6), orc(6, 50)], control: { 4: "game", 5: "referee", 6: "game" } };
  ok(needsReady(st).map((f) => f.id).join() === "1,2,3", "a move step: the moving side's able figures, not the game's");
  st.ready = { 1: "2:move-A" };
  ok(unreadyIds(st).join() === "2,3" && readyCount(st).ready === 1 && waitingOn(st).join() === "referee", "marks count for this step only");
  st.step = "orders";
  ok(needsReady(st).map((f) => f.id).join() === "1,2,3,5", "Orders: in contact (1, the orc), in bow range (2), able to cast (3); the far orc's game-run");
  st.figures[0].x = 30; st.figures[4].x = 58;
  ok(!hasChoice(st, st.figures[0]) && hasChoice(st, st.figures[1]), "nothing in reach and no bow: ready on its own");
  ok(!isReady(st, st.figures[0]), "an old step's mark doesn't count in a new step");
  {
    const f = (id, side, extra) => ({ id, side, name: `F${id}`, kind: "pc", cls: "fighter", level: 1, x: id, y: 5, placed: true, hp: 6, maxHp: 6, ...extra });
    const s = { phase: "fight", round: 1, step: "elect", init: { winner: "A" }, figures: [f(1, "A"), f(2, "A"), f(3, "A"), f(4, "B")], control: { 1: "bob", 2: "ann", 3: "ann", 4: "game" } };
    ok(callerOf(s, "A") === "ann" && waitingOn(s).join() === "ann", "most figures on the side: Ann calls, and the fight waits on her");
    s.control[1] = "bob"; s.control[3] = "bob"; ok(callerOf(s, "A") === "bob", "a tie goes to whoever runs the lowest-numbered figure");
    s.leader = { A: 2 }; ok(callerOf(s, "A") === "ann", "the side's leader's player calls");
    s.callers = { A: "bob" }; ok(callerOf(s, "A") === "bob", "the referee's choice comes first");
    s.callers = { A: "carl" }; ok(callerOf(s, "A") === "ann", "unless he runs nothing on the side");
    ok(callerOf(s, "B") === "game", "a side the game runs: the game calls");
    delete s.control[2]; delete s.control[3]; s.leader = {}; s.callers = {}; ok(callerOf(s, "A") === "referee", "figures with no player are the referee's");
  }
  console.log(`readiness.mjs — all self-tests passed (${pass} assertions).`);
}
if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

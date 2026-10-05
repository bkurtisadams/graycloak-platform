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
  return [...new Set(needsReady(state).filter((f) => !isReady(state, f)).map((f) => controllerOf(state, f)))].sort();
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
  console.log(`readiness.mjs — all self-tests passed (${pass} assertions).`);
}
if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

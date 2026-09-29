/**
 * OD&D — Chainmail engine · turn sequence (move / counter-move)
 * odd-chainmail · module/rules/turn-sequence.mjs
 * system 0.1.51 · slice: turn-sequence · stamp 0.1.51-turn-sequence.1
 *
 * Pure and runtime-free. The Chainmail turn sequence (p.9), which OD&D Vol. III
 * defers to for combat order: both sides roll a d6, the winner elects to move
 * first or last, then the phases run — first move, counter-move, artillery,
 * missile, melee — and repeat. Movement and split/pass-through fire happen in
 * the two move phases (taking effect immediately); all other fire and every
 * melee resolve in their own later phases, simultaneously.
 *
 * This module is the state-free spine: the phase table, the initiative roll,
 * the election, and the per-phase "who may move" rules. The Foundry Combat
 * document drives these (next slice); nothing here touches the runtime, so a
 * seeded rng replays the same turn.
 */

import { rollDie } from "./dice.mjs";
import { forceDice, mulberry32 } from "./dice.mjs";

/** The two sides. A scene's tokens resolve to one of these (by Side field). */
export const Side = Object.freeze({ A: "A", B: "B" });

/** The other side. */
export function opponent(side) {
  return side === Side.A ? Side.B : Side.A;
}

/**
 * The turn sequence (Chainmail p.9), in order. `side` marks the lone mover for
 * the two move phases ("first"/"counter"); the shared steps and initiative
 * carry null. Artillery is kept in sequence even though engines aren't built —
 * it holds the slot so the order stays faithful when they land.
 */
export const PHASES = Object.freeze([
  { id: "initiative", label: "Initiative",   rule: "p.9 §1", side: null },
  { id: "move1",      label: "First move",   rule: "p.9 §2", side: "first" },
  { id: "move2",      label: "Counter-move", rule: "p.9 §3", side: "counter" },
  { id: "artillery",  label: "Artillery",    rule: "p.9 §4", side: null },
  { id: "missile",    label: "Missile fire", rule: "p.9 §5", side: null },
  { id: "melee",      label: "Melee",        rule: "p.9 §6", side: null }
]);

/** Compact rail labels, index-aligned to PHASES. */
export const PHASE_RAIL = Object.freeze(["Init", "First Move", "Last Move", "Artillery", "Missile", "Melee"]);

/** Index of a phase by id, or -1. */
export function phaseIndexById(id) {
  return PHASES.findIndex((p) => p.id === id);
}

/**
 * Initiative (p.9 §1): each side rolls a d6, re-rolling ties; the higher score
 * wins the election. Pure — takes an rng so tests can force the dice.
 * @param {() => number} rng
 * @returns {{a:number, b:number, winner:string}}
 */
export function rollInitiative(rng = Math.random) {
  let a, b;
  do {
    a = rollDie(rng);
    b = rollDie(rng);
  } while (a === b);
  return { a, b, winner: a > b ? Side.A : Side.B };
}

/**
 * The election (p.9 §1): the initiative winner chooses to move first or to
 * counter-move (move last). Returns the resolved first mover. Default is to
 * move first; "counter" hands first move to the opponent.
 * @param {string} winner             the side that won initiative
 * @param {"move"|"counter"} [choice]
 * @returns {string} the first-moving side
 */
export function electFirstMover(winner, choice = "move") {
  return choice === "counter" ? opponent(winner) : winner;
}

/** Which single side may move in a given phase, or null for the shared steps. */
export function moverForPhase(phaseId, firstMover) {
  if (phaseId === "move1") return firstMover;
  if (phaseId === "move2") return opponent(firstMover);
  return null;
}

/**
 * Side pills under each rail phase: the lone mover for the two move phases,
 * BOTH sides for the steps both take (artillery / missile / melee), none for
 * initiative.
 */
export function phaseSides(idx, firstMover) {
  const id = PHASES[idx]?.id;
  if (id === "move1" || id === "move2") return [moverForPhase(id, firstMover)];
  if (id === "artillery" || id === "missile" || id === "melee") return [firstMover, opponent(firstMover)];
  return [];
}

/** May `side` move right now? Advisory mode (enforce=false) never restricts. */
export function phaseAllowsMove(phaseId, firstMover, side, enforce) {
  if (!enforce) return true;
  if (phaseId !== "move1" && phaseId !== "move2") return false;
  return moverForPhase(phaseId, firstMover) === side;
}

/**
 * Advance the phase index. Pure sequencing: steps to the next phase, or wraps
 * past melee back to initiative and signals the turn boundary. The caller does
 * the stateful end-of-turn reset when `endRound` is true.
 * @param {number} idx
 * @returns {{idx:number, endRound:boolean}}
 */
export function advancePhaseIndex(idx) {
  if (idx >= PHASES.length - 1) return { idx: 0, endRound: true };
  return { idx: idx + 1, endRound: false };
}

/* ------------------------------------------------------------------ *
 *  Self-tests — Node only (`node module/rules/turn-sequence.mjs`).
 * ------------------------------------------------------------------ */
function runSelfTests() {
  let pass = 0;
  const ok = (cond, label) => {
    if (!cond) throw new Error(`FAIL: ${label}`);
    pass++;
  };

  // T1: phase table shape and order.
  {
    ok(PHASES.length === 6, "T1 six phases");
    ok(PHASES.map((p) => p.id).join(",") === "initiative,move1,move2,artillery,missile,melee", "T1 order");
    ok(PHASES[0].side === null, "T1 initiative has no mover");
    ok(PHASES[1].side === "first" && PHASES[2].side === "counter", "T1 move phases tagged");
    ok(phaseIndexById("missile") === 4 && phaseIndexById("nope") === -1, "T1 index lookup");
  }

  // T2: opponent + election.
  {
    ok(opponent(Side.A) === Side.B && opponent(Side.B) === Side.A, "T2 opponent flips");
    ok(electFirstMover(Side.A) === Side.A, "T2 default elects move first");
    ok(electFirstMover(Side.A, "move") === Side.A, "T2 move keeps winner");
    ok(electFirstMover(Side.A, "counter") === Side.B, "T2 counter hands off");
    ok(electFirstMover(Side.B, "counter") === Side.A, "T2 counter hands off (B)");
  }

  // T3: initiative — re-rolls ties, higher wins, never equal.
  {
    const r = rollInitiative(forceDice([3, 3, 5, 2]));
    ok(r.a === 5 && r.b === 2 && r.winner === Side.A, "T3 tie re-rolled, A wins 5>2");
    ok(rollInitiative(forceDice([2, 5])).winner === Side.B, "T3 B wins 5>2");
    for (let s = 1; s <= 200; s++) {
      const ri = rollInitiative(mulberry32(s));
      ok(ri.a !== ri.b && ri.a >= 1 && ri.a <= 6 && ri.b >= 1 && ri.b <= 6, `T3 bounded, no tie @${s}`);
      ok(ri.winner === (ri.a > ri.b ? Side.A : Side.B), `T3 winner is higher @${s}`);
    }
  }

  // T4: moverForPhase.
  {
    ok(moverForPhase("move1", Side.A) === Side.A, "T4 first move = first mover");
    ok(moverForPhase("move2", Side.A) === Side.B, "T4 counter = opponent");
    ok(moverForPhase("move1", Side.B) === Side.B, "T4 first move (B)");
    ok(moverForPhase("move2", Side.B) === Side.A, "T4 counter (B)");
    ok(moverForPhase("missile", Side.A) === null, "T4 shared step has no lone mover");
    ok(moverForPhase("initiative", Side.A) === null, "T4 initiative has no mover");
  }

  // T5: phaseSides.
  {
    const at = (id) => phaseIndexById(id);
    ok(phaseSides(at("move1"), Side.A).join() === "A", "T5 first move shows mover");
    ok(phaseSides(at("move2"), Side.A).join() === "B", "T5 counter shows opponent");
    ok(phaseSides(at("missile"), Side.A).join() === "A,B", "T5 missile shows both");
    ok(phaseSides(at("melee"), Side.B).join() === "B,A", "T5 melee both, mover-first");
    ok(phaseSides(at("artillery"), Side.A).join() === "A,B", "T5 artillery both");
    ok(phaseSides(at("initiative"), Side.A).length === 0, "T5 initiative no pills");
  }

  // T6: phaseAllowsMove — advisory permissive, enforced gates to the mover.
  {
    ok(phaseAllowsMove("move1", Side.A, Side.B, false) === true, "T6 advisory never restricts");
    ok(phaseAllowsMove("move1", Side.A, Side.A, true) === true, "T6 enforced: mover may move");
    ok(phaseAllowsMove("move1", Side.A, Side.B, true) === false, "T6 enforced: non-mover may not");
    ok(phaseAllowsMove("move2", Side.A, Side.B, true) === true, "T6 enforced: counter-mover may");
    ok(phaseAllowsMove("missile", Side.A, Side.A, true) === false, "T6 enforced: no move outside move phases");
  }

  // T7: advancePhaseIndex — steps forward, wraps past melee with endRound.
  {
    ok(advancePhaseIndex(0).idx === 1 && advancePhaseIndex(0).endRound === false, "T7 step forward");
    ok(advancePhaseIndex(4).idx === 5 && advancePhaseIndex(4).endRound === false, "T7 into melee");
    const last = advancePhaseIndex(5);
    ok(last.idx === 0 && last.endRound === true, "T7 wrap past melee ends round");
  }

  console.log(`turn-sequence.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

/**
 * OD&D — Chainmail engine · movement
 * odd-chainmail-rules · src/movement.mjs
 *
 * Pure. Move rates (Book I encumbrance for characters, Book II for monsters),
 * the charge allowance and the one-charge-in-two-turns rule (Chainmail; Kurt,
 * Oct 2026), reach over the grid, and legal moves. A charge must end in contact
 * with an enemy (Chainmail: charge only when melee contact is expected).
 * Functions take the fight state and return { ok, events, error } so the
 * runner, the server and any client share them.
 */
import { MONSTERS } from "./monsters.mjs";
import { monsterAttackProfile } from "./monster-attacks.mjs";
import { EQUIPMENT_BY_KEY } from "./equipment.mjs";
import { encumbranceFor } from "./encumbrance.mjs";
import { inventoryWeight } from "./inventory.mjs";
import { reachable, moveBudget, chargeAllowance, canCharge, dir8, halfCellsToInches } from "./engagement.mjs";
import { present, active, sz, covers, centre, isWall, occupant, adjacent } from "./board.mjs";

/** Armour the tester's characters can wear: Book I AC, and weight in coins. */
export const ARMOR = Object.freeze([
  { id: "none", label: "No armour", ac: 9, wt: 0 }, { id: "leather", label: "Leather", ac: 7, wt: 250 },
  { id: "shield", label: "Shield only", ac: 8, wt: 150 }, { id: "leather+shield", label: "Leather + shield", ac: 6, wt: 400 },
  { id: "chain", label: "Chain", ac: 5, wt: 500 }, { id: "chain+shield", label: "Chain + shield", ac: 4, wt: 650 },
  { id: "plate", label: "Plate", ac: 3, wt: 750 }, { id: "plate+shield", label: "Plate + shield", ac: 2, wt: 900 }
].map(Object.freeze));
/** Coins of weight for the pack and sundries every character carries. */
export const MISC_LOAD = 80;

const monsterOf = (f) => MONSTERS.find((m) => m.key === f.monsterKey);
export const footCells = (x, y, n) => { const out = []; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) out.push([x + i, y + j]); return out; };

/** A character's carried weight before treasure: armour, weapon, missile weapon, sundries. */
export function baseLoad(f) {
  return (ARMOR.find((a) => a.id === f.armor)?.wt ?? 0) + (EQUIPMENT_BY_KEY[f.weaponId]?.system?.weight ?? 50) + (f.missile ? 50 : 0) + MISC_LOAD;
}
/** Move in inches: monsters by Book II, characters by encumbrance including what they carry. */
export function moveInches(f) {
  if (f.kind === "monster") return monsterOf(f)?.move?.ground ?? 9;
  return encumbranceFor(baseLoad(f) + (f.inv ? inventoryWeight(f.inv) : 0)).move;
}
/** Charge move in inches: characters by their move, monsters by their Chainmail troop type. */
export function chargeInches(f) {
  if (f.kind === "pc") return chargeAllowance({ move: moveInches(f) });
  return chargeAllowance({ move: moveInches(f), troopType: monsterAttackProfile(monsterOf(f)).chainmail.attacksAs });
}
export const allowanceOf = (f) => (f.charging ? chargeInches(f) : moveInches(f));

/** In setup anything may be placed; in the fight only the moving side's active figures move. */
export function canMoveNow(state, f) {
  return state.phase === "setup" || (state.phase === "fight" && state.step === `move-${f.side}` && active(f));
}
/** May this figure charge now? Not two turns running, and only if the charge adds distance. */
export function mayCharge(state, f) {
  return state.phase === "fight" && canMoveNow(state, f) && canCharge(f.chargedRound, state.round) && chargeInches(f) > moveInches(f);
}
export function enemyAdjacentAt(state, f, x, y) {
  return state.figures.find((e) => e.side !== f.side && present(e) && e.placed && adjacent({ x, y, size: sz(f) }, e));
}
export function fits(state, f, x, y) {
  return footCells(x, y, sz(f)).every(([cx, cy]) => !isWall(state, cx, cy) && !occupant(state, cx, cy, f));
}
/** Cells the figure can reach with what's left of its move. Friends can be passed through but not stopped on. */
export function reachFor(state, f) {
  let budget = moveBudget(allowanceOf(f)) - (f.moved ?? 0);
  if (f.splitFired != null && f.splitFired === state.round && f.splitCap != null) budget = Math.min(budget, f.splitCap - (f.moved ?? 0));
  const n = sz(f);
  const blocked = (x, y) => footCells(x, y, n).some(([cx, cy]) => { if (isWall(state, cx, cy)) return true; const o = occupant(state, cx, cy, f); return !!o && o.side !== f.side; });
  const r = reachable({ x: f.x, y: f.y }, budget, blocked);
  for (const [k, nd] of r) if (nd.cost > 0 && footCells(nd.x, nd.y, n).some(([cx, cy]) => occupant(state, cx, cy, f))) r.set(k, { ...nd, passOnly: true });
  return r;
}
/** Inches of move the figure has left. */
export const inchesLeft = (f) => halfCellsToInches(Math.max(0, moveBudget(allowanceOf(f)) - (f.moved ?? 0)));

/**
 * Move one figure to (x, y). In setup this places it; in the fight it must be
 * the figure's move step and a reachable cell. If it is charging, the move
 * must end in contact, which records the charge.
 */
export function moveFigure(state, f, x, y) {
  const events = [];
  if (!f) return { ok: false, events, error: "no such figure" };
  if (state.phase === "setup") {
    if (!fits(state, f, x, y)) return { ok: false, events, error: "that space is blocked" };
    f.x = x; f.y = y; f.placed = true;
    return { ok: true, events };
  }
  if (!canMoveNow(state, f)) return { ok: false, events, error: `${f.name} can't move now` };
  const r = reachFor(state, f), node = r.get(`${x},${y}`);
  if (!node || node.passOnly || (x === f.x && y === f.y)) return { ok: false, events, error: "out of reach" };
  if (f.charging) {
    const beyondNormal = (f.moved ?? 0) + node.cost > moveBudget(moveInches(f));
    const tt = f.target != null ? state.figures.find((e) => e.id === f.target) : null;
    const foe = tt && present(tt) && adjacent({ x, y, size: sz(f) }, tt) ? tt : enemyAdjacentAt(state, f, x, y);
    if (!foe && beyondNormal) return { ok: false, events, error: "A charge must end in contact with an enemy (Chainmail: charge only when melee contact is expected)." };
    if (foe) { f.chargedRound = state.round; f.target = foe.id; f.action = "melee"; events.push({ type: "charge", id: f.id, name: f.name, targetId: foe.id, target: foe.name }); }
    else f.charging = false;
  }
  const stepNode = r.get(node.prev) ?? { x: f.x, y: f.y };
  // The half-move point of this move, for pass-through fire (Chainmail p.11).
  let halfway = { x, y }, walk = node;
  while (walk && walk.cost > node.cost / 2) { halfway = { x: walk.x, y: walk.y }; walk = r.get(walk.prev); }
  if (walk) halfway = { x: walk.x, y: walk.y };
  events.push({ type: "moved", id: f.id, from: { x: f.x, y: f.y }, to: { x, y }, halfway });
  f.facing = dir8(x - stepNode.x, y - stepNode.y) ?? f.facing;
  f.moved = (f.moved ?? 0) + node.cost; state.moveSeq = (state.moveSeq ?? 0) + 1; f.moveSeq = state.moveSeq;
  f.x = x; f.y = y;
  const t = f.target != null ? state.figures.find((e) => e.id === f.target) : null;
  if (t) f.facing = dir8(centre(t).x - centre(f).x, centre(t).y - centre(f).y) ?? f.facing;
  return { ok: true, events };
}

/** Move toward a target by the shortest route to contact; with charge, only a cell in contact will do. */
export function closeOn(state, f, t, { charge = false } = {}) {
  if (charge) f.charging = true;
  const reach = reachFor(state, f); let best = null;
  for (const n of reach.values()) {
    if (n.passOnly || n.cost === 0) continue;
    const probe = { x: n.x, y: n.y, size: sz(f) };
    const touch = adjacent(probe, t);
    if (charge && !touch) continue;
    const c = centre(probe), d = Math.hypot(c.x - centre(t).x, c.y - centre(t).y);
    const score = (touch ? 0 : 1000) + d * 10 + n.cost / 100;
    if (!best || score < best.score) best = { n, score };
  }
  if (!best) { if (charge) f.charging = false; return { ok: false, events: [], error: `${f.name} can't reach ${t.name}${charge ? " to charge" : ""} this round.` }; }
  f.target = t.id;
  const r = moveFigure(state, f, best.n.x, best.n.y);
  f.target = t.id; f.action = "melee";
  return r;
}

/**
 * Plan a group move (all or nothing; Kurt's ruling): the lead lands at (cx, cy)
 * and every member keeps its offset and pays its own path.
 */
export function planGroupMove(state, members, lead, cx, cy) {
  const dx = cx - lead.x, dy = cy - lead.y, ids = new Set(members.map((m) => m.id));
  const rows = members.map((m) => {
    const tx = m.x + dx, ty = m.y + dy;
    const otherAt = (x, y) => state.figures.find((o) => !ids.has(o.id) && o.placed && present(o) && covers(o, x, y));
    const wallDest = footCells(tx, ty, sz(m)).some(([x, y]) => isWall(state, x, y));
    const blockedDest = wallDest || footCells(tx, ty, sz(m)).some(([x, y]) => otherAt(x, y));
    if (state.phase === "setup") return { id: m.id, tx, ty, ok: !blockedDest, why: wallDest ? "wall" : blockedDest ? "occupied" : "" };
    if (!canMoveNow(state, m)) return { id: m.id, tx, ty, ok: false, why: "can't move now" };
    const node = (dx === 0 && dy === 0) ? { cost: 0 } : reachFor(state, m).get(`${tx},${ty}`);
    if (blockedDest) return { id: m.id, tx, ty, ok: false, why: wallDest ? "wall" : "occupied" };
    if (!node) return { id: m.id, tx, ty, ok: false, why: `too far (${inchesLeft(m)}\u2033 left)` };
    if (m.charging && (m.moved ?? 0) + node.cost > moveBudget(moveInches(m)) && !enemyAdjacentAt(state, m, tx, ty)) return { id: m.id, tx, ty, ok: false, why: "a charge must end in contact" };
    return { id: m.id, tx, ty, ok: true, cost: node.cost, left: moveBudget(allowanceOf(m)) - (m.moved ?? 0) - node.cost };
  });
  return { rows, ok: rows.every((r) => r.ok), bad: rows.filter((r) => !r.ok) };
}
export function commitGroupMove(state, plan) {
  if (!plan.ok) return { ok: false, events: [], error: "the group can't all make that move" };
  const events = [];
  for (const r of plan.rows) {
    const m = state.figures.find((e) => e.id === r.id);
    if (state.phase === "fight" && r.cost) events.push({ type: "moved", id: m.id, from: { x: m.x, y: m.y }, to: { x: r.tx, y: r.ty }, halfway: { x: Math.round((m.x + r.tx) / 2), y: Math.round((m.y + r.ty) / 2) } });
    if (state.phase === "fight" && r.cost) { m.moved = (m.moved ?? 0) + r.cost; state.moveSeq = (state.moveSeq ?? 0) + 1; m.moveSeq = state.moveSeq; }
    const d = dir8(r.tx - m.x, r.ty - m.y); if (d != null && state.phase === "fight") m.facing = d;
    m.x = r.tx; m.y = r.ty;
  }
  return { ok: true, events };
}

/* ---------------------------------------------------------------- tests */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };
  const open = (w, h) => Array.from({ length: h }, () => Array(w).fill(false));
  const pc = (id, side, x, y, extra) => ({ id, side, name: `F${id}`, kind: "pc", cls: "fighter", level: 1, armor: "chain+shield", weaponId: "sword", x, y, placed: true, hp: 6, moved: 0, ...extra });
  const st = (figs, extra) => ({ phase: "fight", round: 1, step: "move-A", width: 40, height: 10, walls: open(40, 10), figures: figs, ...extra });

  const a = pc(1, "A", 2, 2), b = pc(2, "B", 20, 2);
  ok(moveInches(a) === 9 && moveInches({ ...a, armor: "none" }) === 12, "chain + shield moves 9\", unarmoured 12\"");
  ok(moveInches({ kind: "monster", monsterKey: "orc" }) === 9, "orcs move 9\"");
  ok(chargeInches(a) === 12, "9\" foot charge +3\"");
  let s = st([a, b]);
  ok(canMoveNow(s, a) && !canMoveNow(s, b), "only the moving side moves");
  const mv = moveFigure(s, a, 5, 2);
  ok(mv.ok && a.x === 5 && a.moved > 0 && a.facing === 0, "a legal move, facing east");
  const hw = mv.events.find((e) => e.type === "moved")?.halfway;
  ok(hw && hw.x >= 3 && hw.x <= 4 && hw.y === 2, "the half-move point is reported");
  ok(!moveFigure(s, a, 39, 2).ok, "out of reach");
  ok(!moveFigure(s, b, 18, 2).ok, "side B can't move in A's step");
  // charge must end in contact
  const c = pc(3, "A", 2, 5, { charging: true }), e = pc(4, "B", 13, 5);
  s = st([c, e]);
  const far = moveFigure(s, c, 32, 5);
  ok(!far.ok && /contact/.test(far.error), "charge beyond normal move without contact refused");
  const hit = closeOn(s, c, e, { charge: true });
  ok(hit.ok && hit.events[0]?.type === "charge" && c.chargedRound === 1 && adjacent(c, e), "charge into contact records the charge");
  s.round = 2; c.moved = 0;
  ok(!mayCharge(s, c), "no charging two turns running");
  // walls and friends
  const w = st([pc(5, "A", 1, 1), pc(6, "A", 2, 1)]);
  for (let y = 0; y < 10; y++) w.walls[y][4] = true;
  ok(![...reachFor(w, w.figures[0]).values()].some((n) => n.x >= 4), "walls block");
  ok(reachFor(w, w.figures[0]).get("2,1")?.passOnly, "a friend's cell is pass-through only");
  // group move: all or nothing
  const g1 = pc(7, "A", 2, 2), g2 = pc(8, "A", 2, 3), gs = st([g1, g2]);
  const plan = planGroupMove(gs, [g1, g2], g1, 5, 2);
  ok(plan.ok && commitGroupMove(gs, plan).ok && g1.x === 5 && g2.x === 5 && g2.y === 3, "group keeps formation");
  gs.walls[3][8] = true;
  ok(!planGroupMove(gs, [g1, g2], g1, 8, 2).ok, "one blocked member stops the group");
  // setup placement
  const su = { ...st([pc(9, "A", 0, 0, { placed: false })]), phase: "setup" };
  ok(moveFigure(su, su.figures[0], 3, 3).ok && su.figures[0].placed, "setup places a figure");
  console.log(`movement.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

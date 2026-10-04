/**
 * OD&D — Chainmail engine · missile fire
 * odd-chainmail-rules · src/missiles.mjs
 *
 * Pure. Man-to-man missile fire (Chainmail p.11, 25; Appendix B individual
 * fire), plus the two kinds of fire that happen during movement (p.8, 11):
 *  - pass-through fire: stationary missile troops who elected it shoot at an
 *    enemy within range at the half-move point of its move; it takes effect at
 *    once and is their fire for the turn;
 *  - split-move fire: horse archers, and elves on foot (Fantasy Supplement),
 *    move up to half, shoot, then move up to half again; they can be shot
 *    (pass-through) during the pause.
 * Results come back as data events for the runner and clients.
 */
import { MONSTERS } from "./monsters.mjs";
import { resolveVolley, missileShots, overHalfFireGate, classifyMove, fireClassFor } from "./combat-engine.mjs";
import { missileBand, missileRange } from "./tables.mjs";
import { missileMod } from "./derivations.mjs";
import { BLIND } from "./specials.mjs";
import { attackFacing, moveBudget, halfCellsToInches } from "./engagement.mjs";
import { present, active, adjacent, distIn, lineOfSight, inMelee, sz, takeDamage } from "./board.mjs";
import { moveInches } from "./movement.mjs";

/** OPEN: monsters have no Dexterity in Books I-III; they shoot and act as Dex 10. */
export const MONSTER_DEX = 10;
export const dexOf = (f) => (f.kind === "pc" ? f.dex ?? 10 : MONSTER_DEX);
const isEvil = (f) => f.kind === "monster" && MONSTERS.find((m) => m.key === f.monsterKey)?.alignment === "chaos";
export const pfePenalty = (atk, def) => (def.pfe && isEvil(atk) ? -1 : 0);
export const blindPenalty = (f) => (f.averted ? BLIND.everyDieBonus : 0);

/** Can this figure shoot at that one now? Returns { ok, why }. at: an optional stand-in position for the target. */
export function canShoot(state, f, t, at = t) {
  if (!f.missile) return { ok: false, why: `${f.name} has no missile weapon` };
  if (!active(f)) return { ok: false, why: `${f.name} can't act` };
  if (inMelee(state, f)) return { ok: false, why: `${f.name} is in melee and can't fire` };
  if (inMelee(state, t)) return { ok: false, why: `${t.name} is in a melee` };
  if (!lineOfSight(state, f, at)) return { ok: false, why: `${f.name} has no line of sight to ${t.name}` };
  if (f.averted && BLIND.missileAdjacentOnly && !adjacent(f, at)) return { ok: false, why: `${f.name} is averting his eyes: missiles only at an adjacent target` };
  const d = distIn(f, at), range = missileRange(f.missile);
  if (!missileBand(d, range)) return { ok: false, why: `${t.name} is out of range (${d}" of ${range}")` };
  return { ok: true, d };
}

/**
 * One figure's volley: the over-half-move gate, reloading, one or two shots
 * (a second shot may take its own target), each through the Appendix B table.
 * dmg is a Map(targetId → damage) shared by simultaneous fire; at overrides
 * where the main target stands (pass-through fire uses the half-move point).
 */
export function fireVolley(state, f, t, rng, dmg = new Map(), { at = t, passThrough = false, split = false } = {}) {
  const kind = fireClassFor(f.missile);
  const moved = classifyMove(halfCellsToInches(f.moved ?? 0), moveInches(f));
  const ev = { type: "volley", id: f.id, name: f.name, missile: f.missile, dex: dexOf(f), passThrough, split, shots: 0, lines: [] };
  const gate = passThrough ? null : overHalfFireGate({ kind, moved }, rng);
  if (gate && !gate.beat) { ev.gate = { fireDie: gate.fireDie, foeDie: gate.foeDie }; return ev; }
  const loaded = !(f.missile === "heavycrossbow" && f.lastFired === state.round - 1);
  const shots = passThrough || split ? Math.min(1, missileShots(1, { kind, moved, loaded })) || 0 : missileShots(1, { kind, moved, loaded });
  if (!shots) { ev.reloading = true; return ev; }
  f.lastFired = state.round; f.acted = state.round;
  ev.shots = shots;
  const second = shots === 2 && f.secondTarget != null ? state.figures.find((e) => e.id === f.secondTarget) : null;
  const plan = shots === 2 ? [t, second && second !== t ? second : t] : [t];
  plan.forEach((tg, i) => {
    const label = plan.length === 2 ? `Shot ${i + 1}` : "Shot";
    const left = tg.hp - (dmg.get(tg.id) ?? 0);
    if (!present(tg) || left <= 0) { ev.lines.push({ label, target: tg.name, targetId: tg.id, result: "down" }); return; }
    const where = tg === t ? at : tg;
    const dd = distIn(f, where), range = missileRange(f.missile);
    if (tg !== t && (!missileBand(dd, range) || !lineOfSight(state, f, tg) || inMelee(state, tg))) { ev.lines.push({ label, target: tg.name, targetId: tg.id, result: "no-shot" }); return; }
    const fireBonus = missileMod(f.dex ?? 10) + pfePenalty(f, tg) + blindPenalty(f);
    const res = resolveVolley({ attacker: { name: f.name, weaponId: f.missile, shots: 1, fireBonus }, target: { name: tg.name, ac: tg.ac, distance: dd, hitOnlyBy: tg.kind === "monster" ? MONSTERS.find((m) => m.key === tg.monsterKey)?.specialAbilities?.hitOnlyBy : undefined } }, rng);
    dmg.set(tg.id, (dmg.get(tg.id) ?? 0) + res.damage);
    if (res.cannotKill) { ev.lines.push({ label, target: tg.name, targetId: tg.id, result: "cannot", caption: res.caption }); return; }
    const x = res.dice[0];
    ev.lines.push({ label, target: tg.name, targetId: tg.id, result: x.hit ? "hit" : "miss", distance: dd, band: res.band, ac: tg.ac, need: res.toKillNumber, roll: x.roll, bonus: x.bonus, effective: x.effective, damage: x.damage, hits: res.hits });
  });
  return ev;
}

/** Apply a volley's damage at once (fire during movement); returns the figures that fell. */
function applyNow(state, dmg) {
  const fell = [];
  for (const [id, d] of dmg) {
    const f = state.figures.find((e) => e.id === id);
    if (!f || !d) continue;
    const was = f.hp > 0; takeDamage(f, d); if (f.firstHitRound == null) f.firstHitRound = state.round;
    if (was && f.hp <= 0) fell.push(f);
  }
  return fell;
}

/** Arc of fire (p.11): foot 45° either side of facing; horse 180° to the left, 45° to the right. Man-to-man reads both as the front arc. */
export function inArc(f, at) {
  return attackFacing({ x: at.x, y: at.y }, null, { x: f.x, y: f.y }) !== undefined && attackFacing({ x: f.x, y: f.y }, f.facing, { x: at.x, y: at.y }) === "front";
}

/**
 * Pass-through fire against a mover. at: the mover's position at the half-move
 * point of this move (footprint top-left). Shooters: enemies of the mover who
 * elected pass-through fire (action "passthrough"), haven't moved or fired this
 * turn, aren't in melee, and have the half-move point in range, sight and arc.
 */
export function passThroughFire(state, mover, at, rng) {
  const events = [];
  const spot = { x: at.x, y: at.y, size: sz(mover) };
  for (const f of state.figures) {
    if (f.side === mover.side || f.action !== "passthrough" || !active(f) || !f.placed) continue;
    if ((f.moved ?? 0) > 0 || f.lastFired === state.round || !present(mover)) continue;
    const ok = canShoot(state, f, mover, spot);
    if (!ok.ok || !inArc(f, spot)) continue;
    const dmg = new Map();
    const ev = fireVolley(state, f, mover, rng, dmg, { at: spot, passThrough: true });
    ev.at = { x: at.x, y: at.y };
    events.push(ev);
    for (const down of applyNow(state, dmg)) events.push({ type: "down", id: down.id, name: down.name, by: "pass-through fire" });
  }
  return events;
}

/** Split-move fire (p.11; Fantasy Supplement): horse archers and elves. */
export const canSplitMove = (f) => !!f.missile && (f.race === "elf" || f.monsterKey === "elf" || f.horseArcher === true);
/**
 * Split-move fire now: the figure must be in its own move step, have moved no
 * more than half, and not have fired. It shoots at once; enemies who elected
 * pass-through fire may shoot it during the pause; then it may move on, up to
 * half its move again (never more than its full move in all).
 */
export function splitMoveFire(state, f, t, rng) {
  if (!canSplitMove(f)) return { ok: false, events: [], error: `${f.name} can't split-move and fire` };
  if (state.step !== `move-${f.side}`) return { ok: false, events: [], error: `${f.name} can only do this in its own move` };
  const half = Math.floor(moveBudget(moveInches(f)) / 2);
  if ((f.moved ?? 0) > half) return { ok: false, events: [], error: `${f.name} has moved more than half` };
  if (f.lastFired === state.round || f.splitFired === state.round) return { ok: false, events: [], error: `${f.name} has already fired` };
  const can = canShoot(state, f, t);
  if (!can.ok) return { ok: false, events: [], error: can.why };
  const dmg = new Map();
  const events = [fireVolley(state, f, t, rng, dmg, { split: true })];
  for (const down of applyNow(state, dmg)) events.push({ type: "down", id: down.id, name: down.name, by: "split-move fire" });
  f.splitFired = state.round; f.splitCap = (f.moved ?? 0) + half;
  events.push(...passThroughFire(state, f, { x: f.x, y: f.y }, rng));
  return { ok: true, events };
}

/* ---------------------------------------------------------------- tests */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };
  const open = (w, h) => Array.from({ length: h }, () => Array(w).fill(false));
  const pc = (id, side, x, y, extra) => ({ id, side, name: `F${id}`, kind: "pc", cls: "fighter", level: 1, armor: "leather", weaponId: "sword", dex: 10, ac: 7, x, y, facing: side === "A" ? 0 : 4, placed: true, hp: 6, maxHp: 6, moved: 0, ...extra });
  const st = (figs, extra) => ({ phase: "fight", round: 1, step: "move-B", width: 60, height: 10, walls: open(60, 10), figures: figs, ...extra });
  const always = () => 0.999, never = () => 0;

  // canShoot
  { const a = pc(1, "A", 2, 5, { missile: "shortbow" }), b = pc(2, "B", 20, 5);
    const s = st([a, b]);
    ok(canShoot(s, a, b).ok, "6\" with a short bow: can shoot");
    ok(!canShoot(s, a, { ...b, x: 58 }).ok, "out of range");
    s.walls[5][10] = true; ok(!canShoot(s, a, b).ok, "wall blocks"); }
  // a volley hits and records damage without applying it
  { const a = pc(1, "A", 2, 5, { missile: "shortbow" }), b = pc(2, "B", 8, 5, { hp: 20, maxHp: 20 });
    const s = st([a, b]); const dmg = new Map();
    const ev = fireVolley(s, a, b, always, dmg);
    ok(ev.shots === 2 && ev.lines.every((l) => l.result === "hit") && dmg.get(2) > 0 && b.hp === 20, "stationary archer: two shots, damage pending"); }
  { const a = pc(1, "A", 2, 5, { missile: "shortbow" }), b = pc(2, "B", 8, 5, { hp: 3 });
    const ev = fireVolley(st([a, b]), a, b, always, new Map());
    ok(ev.lines[1].result === "down", "second arrow at a target already down is lost"); }
  // pass-through fire: a charger is shot at its half-move point, at once
  { const archer = pc(1, "A", 2, 5, { missile: "shortbow", action: "passthrough" }), orc = pc(2, "B", 30, 5, { hp: 2, maxHp: 2 });
    const s = st([archer, orc]);
    const ev = passThroughFire(s, orc, { x: 16, y: 5 }, always);
    ok(ev[0]?.type === "volley" && ev[0].passThrough && ev[0].shots === 1 && orc.hp <= 0 && ev.some((e) => e.type === "down"), "pass-through: one shot at the half-move point, takes effect at once");
    ok(archer.lastFired === 1, "pass-through is the archer's fire for the turn");
    const orc2 = pc(3, "B", 30, 5); s.figures.push(orc2);
    ok(passThroughFire(s, orc2, { x: 16, y: 5 }, always).length === 0, "an archer who has fired can't pass-through again"); }
  { const archer = pc(1, "A", 2, 5, { missile: "shortbow", action: "fire" }), orc = pc(2, "B", 30, 5);
    ok(passThroughFire(st([archer, orc]), orc, { x: 16, y: 5 }, always).length === 0, "only figures who elected it"); }
  { const archer = pc(1, "A", 2, 5, { missile: "shortbow", action: "passthrough", facing: 4 }), orc = pc(2, "B", 30, 5);
    ok(passThroughFire(st([archer, orc]), orc, { x: 16, y: 5 }, always).length === 0, "outside the arc of fire"); }
  { const archer = pc(1, "A", 2, 5, { missile: "shortbow", action: "passthrough", moved: 2 }), orc = pc(2, "B", 30, 5);
    ok(passThroughFire(st([archer, orc]), orc, { x: 16, y: 5 }, always).length === 0, "only stationary missile troops"); }
  // split-move fire
  { const elf = pc(1, "A", 2, 5, { missile: "shortbow", race: "elf" }), orc = pc(2, "B", 14, 5), guard = pc(3, "B", 16, 6, { missile: "shortbow", action: "passthrough" });
    const s = st([elf, orc, guard], { step: "move-A" });
    ok(!splitMoveFire(s, pc(9, "A", 2, 7, { missile: "shortbow" }), orc, always).ok, "a human on foot can't split-move");
    elf.moved = 2;
    const r = splitMoveFire(s, elf, orc, always);
    ok(r.ok && r.events[0].split && r.events[0].shots === 1 && elf.splitFired === 1, "elf moves, shoots once");
    ok(r.events.some((e) => e.type === "volley" && e.passThrough && e.id === 3), "and can be shot during the pause");
    ok(!splitMoveFire(s, elf, orc, always).ok, "once a turn");
    const late = pc(4, "A", 2, 8, { missile: "shortbow", race: "elf", moved: 60 });
    ok(!splitMoveFire({ ...s, figures: [...s.figures, late] }, late, orc, always).ok, "not after more than half a move"); }
  console.log(`missiles.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

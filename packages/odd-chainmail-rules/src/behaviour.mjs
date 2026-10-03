/**
 * OD&D — monster behaviour
 * odd-chainmail-rules · src/behaviour.mjs
 *
 * Pure. Each figure on a side run by behaviour decides once per move step by
 * its profile (Mindless, Bestial, Cunning, Intelligent; Kurt, Oct 2026):
 *   1. hold if its group's parley came out uncertain this round;
 *   2. avoid an obviously superior force (Cunning and Intelligent only; three
 *      times their total hit dice, no roll): fall back, or hold by the hoard;
 *   3. note a special that is ready (breath; the medusa wants a victim who
 *      will meet her eyes);
 *   4. pick a target by profile, preferring one it can reach this round;
 *   5. fight if adjacent, close if it can touch, charge if only a charge
 *      reaches, otherwise advance (Cunning at half move, to stay able to join).
 * Each decision is returned as a plain-text reason for the log.
 * Lair defenders stay within LAIR_RADIUS of their hoard (an open ruling).
 */
import { MONSTERS } from "./monsters.mjs";
import { hitDiceFor } from "./hit-dice.mjs";
import { hdValue } from "./casting.mjs";
import { avoidsForce } from "./reactions.mjs";
import { moveBudget, dir8 } from "./engagement.mjs";
import { opponent } from "./turn-sequence.mjs";
import { present, active, sz, centre, adjacent, distIn } from "./board.mjs";
import { reachFor, moveInches, moveFigure, mayCharge as mayChargeNow } from "./movement.mjs";

export const LAIR_RADIUS = 6; // inches from the hoard that lair defenders will go; OPEN for Kurt
export const PROFILE_LABEL = Object.freeze({ mindless: "Mindless", bestial: "Bestial", cunning: "Cunning", intelligent: "Intelligent" });
const mon = (f) => (f.kind === "monster" ? MONSTERS.find((m) => m.key === f.monsterKey) : null);
export const profileOf = (f) => (f.kind === "monster" ? mon(f).mind.behavior : "cunning");
/** The encounter group record (languages, reaction, hold) for a monster; state.encounter may be a Map or a plain object. */
export function encOf(state, f) {
  if (f.kind !== "monster") return null;
  const k = `${f.origSide ?? f.side}:${f.monsterKey}`, e = state.encounter;
  return e?.get ? e.get(k) : e?.[k] ?? null;
}
export const lairOf = (state, f) => (f.kind === "monster" ? (state.chests ?? []).find((c) => c.monsterKey === f.monsterKey) : null);
export const isCaster = (f) => f.kind === "pc" && ["magic-user", "cleric"].includes(f.cls);
export const woundFrac = (e) => (e.maxHp ? Math.max(0, e.hp) / e.maxHp : 1);
export const leaderOf = (state, side) => state.figures.filter((e) => e.side === side && present(e) && e.kind === "pc").sort((a, b) => b.level - a.level)[0] ?? null;
export const engagedByAlly = (state, f, t) => state.figures.some((a) => a !== f && a.side === f.side && active(a) && a.target === t.id && adjacent(a, t));
/** Best reachable cell toward t. charge: only cells in contact. maxCost in half-cells. Lair defenders stay near the hoard. */
export function approach(state, f, t, { charge = false, maxCost = Infinity } = {}) {
  const was = f.charging; f.charging = charge;
  const reach = reachFor(state, f); f.charging = was;
  const lair = lairOf(state, f); let best = null;
  for (const n of reach.values()) {
    if (n.passOnly || n.cost === 0 || n.cost > maxCost) continue;
    if (lair && Math.hypot(n.x - lair.x, n.y - lair.y) / 3 > LAIR_RADIUS) continue;
    const probe = { x: n.x, y: n.y, size: sz(f) }; const touch = adjacent(probe, t);
    if (charge && !touch) continue;
    const c = centre(probe), d = Math.hypot(c.x - centre(t).x, c.y - centre(t).y);
    const score = (touch ? 0 : 1000) + d * 10 + n.cost / 100;
    if (!best || score < best.score) best = { n, touch, score };
  }
  return best;
}
export const hdOfFig = (e) => { if (e.kind === "pc") { const h = hitDiceFor(e.cls, e.level); return hdValue(h.dice, h.bonus); } const h = mon(e).hd; return hdValue(e.hdLeft ?? h.count, h.bonus); };
/** Book III: monsters intelligent enough avoid an obviously superior force: three times their total hit dice (Kurt, Oct 2026). */
export function forceOf(state, f) {
  const own = state.figures.filter((e) => e.side === f.side && present(e) && e.placed), foe = state.figures.filter((e) => e.side !== f.side && present(e) && e.placed);
  return { ownCount: own.length, ownHd: own.reduce((t, e) => t + hdOfFig(e), 0), foeCount: foe.length, foeHd: foe.reduce((t, e) => t + hdOfFig(e), 0) };
}
export function retreat(state, f, foes) {
  const reach = reachFor(state, f); let best = null;
  for (const n of reach.values()) {
    if (n.passOnly || n.cost === 0) continue;
    const c = centre({ x: n.x, y: n.y, size: sz(f) });
    const d = Math.min(...foes.map((e) => Math.hypot(c.x - centre(e).x, c.y - centre(e).y)));
    if (!best || d > best.d) best = { n, d };
  }
  return best;
}
/** One figure's decision: hold check, special, target by profile, then charge, move, attack or hold. Returns the log line. */
export function decide(state, f, events = []) {
  const n = f.name, prof = profileOf(f), g = encOf(state, f), m = mon(f);
  const moveTo = (fig, x, y) => { const r = moveFigure(state, fig, x, y); events.push(...r.events); return r; };
  const mayCharge = (fig) => mayChargeNow(state, fig);
  if (g?.holdRound === state.round) { f.action = "hold"; f.target = null; return `${n} holds: uncertain reaction to the parley`; }
  let foes = state.figures.filter((e) => e.side !== f.side && present(e) && e.placed);
  if (!foes.length) return null;
  if (f.kind === "monster" && avoidsForce(m.mind.intelligence, forceOf(state, f)) && !foes.some((e) => adjacent(f, e))) {
    const fc = forceOf(state, f), why = `${fc.foeCount} against ${fc.ownCount}, ${Math.round(fc.foeHd * 10) / 10} HD against ${Math.round(fc.ownHd * 10) / 10}`;
    f.target = null; f.action = "hold";
    if (lairOf(state, f)) return `${n} holds by the hoard: an obviously superior force (${why})`;
    const back = retreat(state, f, foes);
    if (back) { moveTo(f, back.n.x, back.n.y); return `${n} falls back from an obviously superior force (${why})`; }
    return `${n} holds: an obviously superior force (${why}), nowhere to fall back`;
  }
  let special = "";
  if (m?.key === "medusa") { const looking = foes.filter((e) => !e.averted); if (looking.length) { foes = looking; special = ", picking a victim who will meet her eyes"; } }
  if (f.breathLeft !== 0 && (m?.key.startsWith("dragon-") || m?.key === "chimera")) special = `, breath ready (${f.breathLeft ?? 3} left)`;
  const dist = (e) => distIn(f, e);
  const half = Math.floor(moveBudget(moveInches(f)) / 2) - (f.moved ?? 0);
  const canTouch = (e) => adjacent(f, e) || !!approach(state, f, e)?.touch;
  const chargeTo = (e) => (prof !== "mindless" && !adjacent(f, e) && mayCharge(f) ? approach(state, f, e, { charge: true }) : null);
  const onMe = foes.find((e) => e.target === f.id && adjacent(e, f) && active(e));
  const byDist = foes.slice().sort((a, b) => dist(a) - dist(b));
  let t = byDist[0], why = "nearest";
  if (prof !== "mindless" && !canTouch(t)) {
    const touchable = byDist.find(canTouch), chargeable = byDist.find((e) => chargeTo(e));
    if (touchable) { t = touchable; why = "nearest he can reach"; }
    else if (chargeable) { t = chargeable; why = "nearest in charge range"; }
  }
  if (prof === "bestial") {
    const inReach = foes.filter(canTouch);
    if (inReach.length) { t = inReach.sort((a, b) => woundFrac(a) - woundFrac(b) || dist(a) - dist(b))[0]; why = woundFrac(t) < 1 ? "most wounded in reach" : "nearest in reach"; }
  } else if (prof === "cunning") {
    if (onMe) { t = onMe; why = "it is attacking him"; }
    else {
      const gang = foes.filter((e) => engagedByAlly(state, f, e) && (adjacent(f, e) || approach(state, f, e, { maxCost: half })?.touch));
      if (gang.length) { t = gang.sort((a, b) => dist(a) - dist(b))[0]; why = "ganging up with allies"; }
    }
  } else if (prof === "intelligent") {
    const leader = leaderOf(state, opponent(f.side));
    const prio = foes.filter((e) => (isCaster(e) || e === leader) && (canTouch(e) || chargeTo(e)));
    if (prio.length) { t = prio.sort((a, b) => (isCaster(b) - isCaster(a)) || dist(a) - dist(b))[0]; why = isCaster(t) ? "goes for the caster" : "goes for the leader"; }
    else if (onMe) { t = onMe; why = "it is attacking him"; }
  }
  why += special;
  f.stance = "attack"; f.action = "melee"; f.target = t.id;
  if (adjacent(f, t)) { f.facing = dir8(centre(t).x - centre(f).x, centre(t).y - centre(f).y) ?? f.facing; return `${n} fights ${t.name}: adjacent, ${why}`; }
  const walk = approach(state, f, t);
  if (walk?.touch) { moveTo(f, walk.n.x, walk.n.y); f.target = t.id; return `${n} closes on ${t.name}: ${why}`; }
  const ch = chargeTo(t);
  if (ch) { f.charging = true; moveTo(f, ch.n.x, ch.n.y); f.target = t.id; f.action = "melee"; return `${n} charges ${t.name}: ${why}${why.includes("charge range") ? "" : ", in charge range"}`; }
  const step = approach(state, f, t, { maxCost: prof === "cunning" ? half : Infinity });
  if (step) { moveTo(f, step.n.x, step.n.y); f.target = t.id; return `${n} advances on ${t.name}${prof === "cunning" ? " in good order (half move, so he can join a melee)" : ""}: ${why}`; }
  return `${n} holds${lairOf(state, f) ? " by the hoard (lair defenders don't pursue)" : ""}: can't get closer to ${t.name}`;
}

/** Every active, placed figure on the side decides in turn. Returns events: moves and charges, then the decisions. */
export function behave(state, side) {
  const events = [], lines = [];
  for (const f of state.figures.filter((x) => x.side === side && active(x) && x.placed)) {
    const why = decide(state, f, events);
    if (why) lines.push({ id: f.id, text: why });
  }
  events.push({ type: "behaviour", side, lines });
  return events;
}

/* ---------------------------------------------------------------- tests */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };
  const open = (w, h) => Array.from({ length: h }, () => Array(w).fill(false));
  const pc = (id, x, y, extra) => ({ id, side: "A", origSide: "A", name: `F${id}`, kind: "pc", cls: "fighter", level: 1, armor: "chain+shield", weaponId: "sword", x, y, placed: true, hp: 6, maxHp: 6, ...extra });
  const mo = (id, key, x, y, extra) => ({ id, side: "B", origSide: "B", name: `${key} ${id}`, kind: "monster", monsterKey: key, x, y, placed: true, hp: 5, maxHp: 5, size: 1, moved: 0, ...extra });
  const st = (figs) => ({ phase: "fight", round: 1, step: "move-B", width: 40, height: 12, walls: open(40, 12), figures: figs, chests: [] });

  // A mindless skeleton advances on the nearest figure.
  {
    const s = st([pc(1, 2, 5), pc(2, 30, 5), mo(3, "skeleton", 20, 5)]);
    const ev = behave(s, "B"), d = ev.find((e) => e.type === "behaviour").lines[0];
    ok(/F2/.test(d.text) && s.figures[2].target === 2 && s.figures[2].x > 20, "skeleton goes for the nearest");
  }
  // Cunning: closes when it can touch, otherwise advances at half move.
  {
    const s = st([pc(1, 0, 5), mo(3, "orc", 39, 5)]);
    behave(s, "B");
    const orc = s.figures[1];
    ok(orc.x < 39 && orc.moved <= Math.floor(moveBudget(moveInches(orc)) / 2), "orc advances at half move when nothing is in reach");
    const s2 = st([pc(1, 10, 5), mo(3, "orc", 14, 5)]);
    const line = behave(s2, "B").find((e) => e.type === "behaviour").lines[0].text;
    ok(/closes on F1/.test(line) && adjacent(s2.figures[1], s2.figures[0]), "orc closes when it can touch");
  }
  // Bestial: most wounded in reach.
  {
    const s = st([pc(1, 10, 4, { hp: 6 }), pc(2, 10, 7, { hp: 1 }), mo(3, "ghoul", 14, 5)]);
    const line = behave(s, "B").find((e) => e.type === "behaviour").lines[0].text;
    ok(/F2/.test(line) && /most wounded/.test(line), "ghoul picks the most wounded in reach");
  }
  // Intelligent: the caster first.
  {
    const s = st([pc(1, 12, 4), pc(2, 12, 7, { cls: "magic-user", armor: "none", weaponId: "dagger" }), mo(3, "medusa", 16, 5)]);
    const line = behave(s, "B").find((e) => e.type === "behaviour").lines[0].text;
    ok(/F2/.test(line) && /caster/.test(line), "medusa goes for the magic-user");
  }
  // Avoids three times its hit dice.
  {
    const strong = [1, 2, 3].map((i) => pc(i, 2, 2 + i, { level: 8 }));
    const s = st([...strong, mo(5, "orc", 20, 5)]);
    const line = behave(s, "B").find((e) => e.type === "behaviour").lines[0].text;
    ok(/falls back/.test(line) && s.figures[3].x > 20, "orc falls back from three times its hit dice");
  }
  // A charge records itself and is reported.
  {
    const s = st([pc(1, 2, 5), mo(3, "orc", 13, 5)]);
    s.figures[1].x = 15;
    const ev = behave(s, "B");
    ok(ev.some((e) => e.type === "charge") || ev.find((e) => e.type === "behaviour").lines[0].text.includes("closes"), "an orc in charge range charges or closes");
  }
  // Holds when its parley came out uncertain.
  {
    const s = st([pc(1, 2, 5), mo(3, "orc", 10, 5)]);
    s.encounter = { "B:orc": { holdRound: 1 } };
    const line = behave(s, "B").find((e) => e.type === "behaviour").lines[0].text;
    ok(/holds: uncertain/.test(line) && s.figures[1].x === 10, "uncertain parley: holds");
  }
  console.log(`behaviour.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

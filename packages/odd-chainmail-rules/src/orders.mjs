/**
 * OD&D — orders, drawing a weapon and GM tools
 * odd-chainmail-rules · src/orders.mjs
 *
 * Slice 5, step 1 (Oct 2026). Moved out of combat-grid.html so a player's
 * orders reach the server as runner actions instead of the page changing the
 * state itself. Orders stand from round to round (runner standingOrders).
 *   setOrders  target, Hold Person's extra targets, an archer's second shot,
 *              the action (melee, hold, fire, passthrough, cast:<id>), stance,
 *              an area spell's aim point
 *   drawWeapon swap to a carried weapon for half a move, in the figure's own
 *              move step, before it has used half its move (Kurt, Oct 2026)
 *   gmTool     invulnerable, heal, set HP, clear conditions, kill, burn (a
 *              troll burned or put in acid will not rise)
 *   A gaze defence (averting the eyes, holding up a mirror) is an order too.
 */
import { present, active, adjacent, centre, isWall, distIn } from "./board.mjs";
import { dir8, moveBudget } from "./engagement.mjs";
import { moveInches, allowanceOf } from "./movement.mjs";
import { combatSpellsFor, HOLD_PERSON_MAX } from "./casting.mjs";
import { missileBand, missileRange, WEAPON_CLASS } from "./tables.mjs";
import { EQUIPMENT_BY_KEY } from "./equipment.mjs";

export const STANCES = Object.freeze(["attack", "parry"]);
export const PLAIN_ACTIONS = Object.freeze(["melee", "hold", "fire", "passthrough"]);
export const GM_TOOLS = Object.freeze(["invulnerable", "heal", "set-hp", "clear", "kill", "burn"]);
export const WEAPON_LABEL = Object.freeze({ dagger: "Dagger", handaxe: "Hand axe", mace: "Mace", sword: "Sword", battleaxe: "Battle axe", morningstar: "Morning star", flail: "Flail", spear: "Spear", polearm: "Pole arm", halberd: "Halberd", twohanded: "Two-handed sword", lance: "Lance", pike: "Pike" });
export const weaponItem = (id) => ({ kind: "weapon", weaponId: id, name: WEAPON_LABEL[id] ?? id, unidName: WEAPON_LABEL[id] ?? "a weapon", identified: true, weight: EQUIPMENT_BY_KEY[id]?.system?.weight ?? 50 });

const byId = (state, id) => state.figures.find((f) => f.id === id);
const face = (f, t) => { f.facing = dir8(centre(t).x - centre(f).x, centre(t).y - centre(f).y) ?? f.facing; };
const enemyOk = (state, f, id) => { const t = byId(state, id); return t && t.side !== f.side && present(t) ? t : null; };

/** Spells the figure can cast now. */
export const spellsFor = (f) => (f.kind === "pc" ? combatSpellsFor(f.cls, f.slotsLeft ?? []) : []);

/**
 * Set any of a figure's orders. o: { target, holdTargets, secondTarget,
 * action, stance, castAim, averted, mirror }; a field left out is unchanged. Choosing a target
 * without an action picks one as the tester did: melee if adjacent, fire if
 * in bow range, a held figure fights again. Returns { ok, events, error }.
 */
export function setOrders(state, f, o = {}) {
  const fail = (error) => ({ ok: false, events: [], error });
  if (!f || !active(f)) return fail("that figure can't take orders");
  const has = (k) => Object.prototype.hasOwnProperty.call(o, k);
  let t = null;
  if (has("target") && o.target != null && !(t = enemyOk(state, f, o.target))) return fail("no such enemy to target");
  if (has("action")) {
    const a = o.action;
    if (typeof a !== "string") return fail("no action given");
    if (a.startsWith("cast:")) { if (!spellsFor(f).some((s) => s.id === a.slice(5))) return fail(`${f.name} can't cast that`); }
    else if (!PLAIN_ACTIONS.includes(a)) return fail(`unknown action ${a}`);
    else if ((a === "fire" || a === "passthrough") && !f.missile) return fail(`${f.name} has no missile weapon`);
  }
  if (has("stance") && !STANCES.includes(o.stance)) return fail(`unknown stance ${o.stance}`);
  for (const k of ["averted", "mirror"]) if (has(k) && typeof o[k] !== "boolean") return fail(`${k} is yes or no`);
  if (has("holdTargets")) {
    if (!Array.isArray(o.holdTargets) || o.holdTargets.length > HOLD_PERSON_MAX - 1) return fail("too many Hold Person targets");
    if (!o.holdTargets.every((id) => enemyOk(state, f, id))) return fail("a Hold Person target is not an enemy on the board");
  }
  if (has("secondTarget") && o.secondTarget != null && !enemyOk(state, f, o.secondTarget)) return fail("no such enemy for the second shot");
  if (has("castAim") && o.castAim != null && (!Number.isInteger(o.castAim.x) || !Number.isInteger(o.castAim.y) || o.castAim.x < 0 || o.castAim.y < 0 || o.castAim.x >= state.width || o.castAim.y >= state.height)) return fail("the aim point is off the board");
  if (has("castAim") && o.castAim != null && isWall(state, o.castAim.x, o.castAim.y)) return fail("the aim point is inside rock");

  if (has("target")) {
    f.target = t ? t.id : null;
    if (t) {
      face(f, t);
      if (!has("action")) {
        if (f.action === "hold") f.action = "melee";
        if (f.kind === "pc" && !f.action?.startsWith?.("cast:")) {
          if (adjacent(f, t)) f.action = "melee";
          else if (f.missile && missileBand(distIn(f, t), missileRange(f.missile))) f.action = "fire";
        }
      }
    }
  }
  if (has("action")) f.action = o.action;
  if (has("stance")) f.stance = o.stance;
  if (has("holdTargets")) f.holdTargets = [...o.holdTargets];
  if (has("secondTarget")) f.secondTarget = o.secondTarget;
  if (has("averted")) f.averted = o.averted;
  if (has("mirror")) f.mirror = o.mirror;
  if (has("castAim")) { f.castAim = o.castAim ? { x: o.castAim.x, y: o.castAim.y } : null; if (f.castAim) f.target = null; }
  return { ok: true, events: [{ type: "orders", id: f.id, name: f.name, target: f.target ?? null, action: f.action, stance: f.stance ?? "attack", holdTargets: f.holdTargets ?? [], secondTarget: f.secondTarget ?? null, castAim: f.castAim ?? null, averted: !!f.averted, mirror: !!f.mirror }] };
}

/** Carried weapons the figure could draw now. */
export function drawable(state, f) {
  if (state.phase !== "fight" || f.kind !== "pc" || !active(f) || state.step !== `move-${f.side}`) return [];
  if ((f.moved ?? 0) > Math.floor(moveBudget(moveInches(f)) / 2)) return [];
  return (f.inv?.items ?? []).map((item, index) => ({ item, index })).filter((x) => x.item.kind === "weapon" && x.item.weaponId && x.item.weaponId !== f.weaponId && WEAPON_CLASS[x.item.weaponId] != null);
}
export function drawWeapon(state, f, index) {
  if (!f) return { ok: false, events: [], error: "no such figure" };
  if (!drawable(state, f).some((x) => x.index === index)) return { ok: false, events: [], error: `${f.name} can't draw that now` };
  const item = f.inv.items[index], old = f.weaponId, wasBroken = !!f.weaponBroken;
  f.inv.items.splice(index, 1);
  if (!wasBroken && old) f.inv.items.push(weaponItem(old));
  f.weaponId = item.weaponId; f.weaponBroken = false;
  f.moved = Math.min(moveBudget(allowanceOf(f)), (f.moved ?? 0) + Math.floor(moveBudget(moveInches(f)) / 2));
  return { ok: true, events: [{ type: "draw-weapon", id: f.id, name: f.name, from: old ?? null, to: item.weaponId, wasBroken }] };
}

/** GM tools. value: true/false for invulnerable, a number for set-hp. */
export function gmTool(state, f, tool, value) {
  if (!f) return { ok: false, events: [], error: "no such figure" };
  if (!GM_TOOLS.includes(tool)) return { ok: false, events: [], error: `unknown GM tool ${tool}` };
  if (tool === "invulnerable") f.invulnerable = !!value;
  else if (tool === "heal") { f.hp = f.maxHp; f.regenStore = 0; }
  else if (tool === "set-hp") { const n = Math.trunc(Number(value)); if (!Number.isFinite(n)) return { ok: false, events: [], error: "no hit points given" }; f.hp = n; if (n > (f.maxHp ?? 0)) f.maxHp = n; }
  else if (tool === "clear") { f.status = null; f.paralyzedUntil = null; if (f.charmed) { f.charmed = false; f.side = f.origSide ?? f.side; } f.target = null; }
  else if (tool === "kill") { f.hp = 0; f.target = null; }
  else if (tool === "burn") { if (f.monsterKey !== "troll") return { ok: false, events: [], error: "only a troll needs burning" }; f.burned = true; }
  return { ok: true, events: [{ type: "gm", id: f.id, name: f.name, tool, value: tool === "invulnerable" ? !!value : tool === "set-hp" ? f.hp : null }] };
}

/* ------------------------------------------------------------------ tests */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };
  const open = (w, h) => Array.from({ length: h }, () => Array(w).fill(false));
  const fig = (id, side, x, extra) => ({ id, side, origSide: side, name: `F${id}`, kind: "pc", cls: "fighter", level: 1, x, y: 5, placed: true, hp: 6, maxHp: 6, action: "melee", ...extra });
  const st = (figs) => ({ phase: "fight", round: 1, step: "move-A", width: 30, height: 10, walls: open(30, 10), figures: figs });
  {
    const a = fig(1, "A", 5), b = fig(2, "B", 6), c = fig(3, "B", 20), d = fig(4, "A", 7);
    const s = st([a, b, c, d]);
    ok(setOrders(s, a, { target: 2 }).ok && a.target === 2 && a.action === "melee" && a.facing === 0, "target an adjacent enemy: melee, facing it");
    ok(!setOrders(s, a, { target: 4 }).ok && a.target === 2, "a friend can't be targeted");
    ok(!setOrders(s, a, { action: "fire" }).ok, "no bow, no fire order");
    const archer = fig(5, "A", 2, { missile: "shortbow" }); s.figures.push(archer);
    ok(setOrders(s, archer, { target: 3 }).ok && archer.action === "fire", "a target in bow range: fire");
    ok(setOrders(s, a, { stance: "parry" }).ok && a.stance === "parry" && !setOrders(s, a, { stance: "dodge" }).ok, "stance");
    const mu = fig(6, "A", 3, { cls: "magic-user", slotsLeft: [1, 0, 0, 0, 0, 0] }); s.figures.push(mu);
    ok(setOrders(s, mu, { action: "cast:sleep", castAim: { x: 18, y: 5 } }).ok && mu.castAim.x === 18 && mu.target === null, "cast Sleep at a point");
    ok(!setOrders(s, mu, { action: "cast:fireBall" }).ok, "no 3rd-level slot, no Fire Ball");
    ok(!setOrders(s, mu, { castAim: { x: 99, y: 1 } }).ok, "aim off the board refused");
    s.walls[5][25] = true; ok(!setOrders(s, mu, { castAim: { x: 25, y: 5 } }).ok && mu.castAim.x === 18, "aim inside rock refused, old aim kept");
    ok(!setOrders(s, a, { holdTargets: [2, 3, 2, 3] }).ok, "too many Hold Person targets");
    ok(setOrders(s, archer, { secondTarget: 2 }).ok && archer.secondTarget === 2, "second shot at its own target");
    b.status = "asleep"; ok(!setOrders(s, b, { target: 1 }).ok, "a sleeping figure takes no orders");
  }
  {
    const f = fig(1, "A", 5, { weaponId: "sword", weaponBroken: true, inv: { coins: { gp: 0 }, items: [weaponItem("mace")] } });
    const s = st([f]);
    const r = drawWeapon(s, f, 0);
    ok(r.ok && f.weaponId === "mace" && !f.weaponBroken && f.inv.items.length === 0 && f.moved > 0, "draw a spare: the broken sword is dropped, half the move spent");
    ok(!drawWeapon(s, f, 0).ok, "nothing left to draw");
    const g = fig(2, "A", 8, { weaponId: "sword", inv: { coins: {}, items: [weaponItem("mace")] } }); s.figures.push(g); s.step = "move-B";
    ok(!drawWeapon(s, g, 0).ok, "only in the figure's own move step");
  }
  {
    const f = fig(1, "A", 5, { hp: 2, status: "held" }); const s = st([f]);
    ok(gmTool(s, f, "heal").ok && f.hp === 6, "heal");
    ok(gmTool(s, f, "set-hp", 9).ok && f.hp === 9 && f.maxHp === 9, "set HP above maximum raises it");
    ok(gmTool(s, f, "clear").ok && f.status === null, "clear conditions");
    ok(gmTool(s, f, "invulnerable", true).ok && f.invulnerable, "invulnerable");
    ok(gmTool(s, f, "kill").ok && f.hp === 0, "kill");
    ok(!gmTool(s, f, "smite").ok, "unknown tool refused");
    const troll = { id: 9, name: "Troll", kind: "monster", monsterKey: "troll", hp: 0, maxHp: 30 }; s.figures.push(troll);
    ok(gmTool(s, troll, "burn").ok && troll.burned && !gmTool(s, f, "burn").ok, "burn a troll; nobody else");
    const g = fig(3, "A", 9); s.figures.push(g); s.phase = "fight";
    ok(setOrders(s, g, { averted: true }).ok && g.averted && !setOrders(s, g, { mirror: "yes" }).ok, "avert the eyes; a mirror is yes or no");
  }
  console.log(`orders.mjs — all self-tests passed (${pass} assertions).`);
}
if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

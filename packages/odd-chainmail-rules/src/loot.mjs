/**
 * OD&D — searching the fallen and lair hoards
 * odd-chainmail-rules · src/loot.mjs
 *
 * Slice 5, pass 2 (Oct 2026). Taking and putting back coins and items is an
 * action the runner applies (the server, online), so what a body or a hoard
 * holds lives with the fight and players see only what their own characters
 * can reach: the sources next to them, with unidentified items under their
 * unidentified names. Moved here from the tester page, behaviour unchanged.
 */
import { combatProfile } from "./melee.mjs";
import { WEAPON_LABEL } from "./orders.mjs";
import { EQUIPMENT_BY_KEY } from "./equipment.mjs";
import { isPerson } from "./casting.mjs";
import { emptyInventory, transferItem, transferCoins, isEmpty, coinCount } from "./inventory.mjs";
import { alive, active, adjacent } from "./board.mjs";

export const MISSILE_LABEL = Object.freeze({ shortbow: "Short bow", longbow: "Long bow", lightcrossbow: "Light crossbow", heavycrossbow: "Heavy crossbow", sling: "Sling" });
/** Armour a figure's AC implies, for what it leaves when it falls. */
export const AC_GEAR = Object.freeze({ 7: ["Leather armour"], 8: ["Shield"], 6: ["Leather armour", "Shield"], 5: ["Chain mail"], 4: ["Chain mail", "Shield"], 3: ["Plate mail"], 2: ["Plate mail", "Shield"] });
export const GEAR_WT = Object.freeze({ "Leather armour": 250, "Chain mail": 500, "Plate mail": 750, "Shield": 150 });
const WEARS = ["gnoll", "hobgoblin", "bandit", "brigand", "dwarf", "gnome", "elf", "berserker"];

/** The weapons and armour a figure has on it. */
export function gearOf(f) {
  const out = [];
  const p = combatProfile(f);
  if (!p.profileAttack && p.weaponId && !f.weaponBroken) out.push({ kind: "weapon", weaponId: p.weaponId, name: WEAPON_LABEL[p.weaponId] ?? p.weaponId, unidName: WEAPON_LABEL[p.weaponId] ?? "a weapon", identified: true, weight: EQUIPMENT_BY_KEY[p.weaponId]?.system?.weight ?? 50 });
  if (f.kind === "pc" && f.missile) out.push({ kind: "weapon", name: MISSILE_LABEL[f.missile], unidName: MISSILE_LABEL[f.missile], identified: true, weight: 50 });
  const wears = f.kind === "pc" || isPerson(f) || WEARS.includes(f.monsterKey);
  if (wears) for (const g of AC_GEAR[f.ac] ?? []) out.push({ kind: "armor", name: g, unidName: g, identified: true, weight: GEAR_WT[g] });
  return out;
}
/** What a fallen figure leaves, without touching it. */
export const remainsPreview = (f) => f.remains ?? { coins: { ...(f.inv ?? emptyInventory()).coins }, items: [...(f.inv?.items ?? []), ...gearOf(f)] };
/** What a fallen figure leaves; the first search turns his purse and gear into remains. */
export function remainsOf(f) {
  if (!f.remains) { f.remains = remainsPreview(f); f.inv = emptyInventory(); }
  return f.remains;
}
/** What a body or hoard holds, without disturbing it (for showing it). */
export const peek = (state, id) => source(state, id, false);
export const hasLoot = (f) => (f.remains ? !isEmpty(f.remains) : coinCount(f.inv?.coins) > 0 || (f.inv?.items.length ?? 0) > 0 || gearOf(f).length > 0);

/** Bodies and hoards a character can search from where he stands: [{ id, label }]. */
export function searchable(state, pc) {
  const out = [];
  if (!pc || pc.kind !== "pc" || !active(pc)) return out;
  for (const f of state.figures) if (f !== pc && f.placed && !alive(f) && f.hp != null && adjacent(pc, f) && !(f.monsterKey === "troll" && !f.burned)) out.push({ id: `fig-${f.id}`, label: `${f.name} (fallen)` });
  for (const c of state.chests ?? []) if (adjacent(pc, { x: c.x, y: c.y, size: 1 })) out.push({ id: `chest-${c.id}`, label: c.label });
  return out;
}
function source(state, id, touch) {
  const m = /^(fig|chest)-(\d+)$/.exec(String(id ?? "")); if (!m) return null;
  if (m[1] === "fig") { const f = state.figures.find((x) => x.id === Number(m[2])); return f ? (touch ? remainsOf(f) : remainsPreview(f)) : null; }
  const c = (state.chests ?? []).find((x) => x.id === Number(m[2])); return c ? (c.inv ?? (c.inv = JSON.parse(JSON.stringify(c.original)))) : null;
}
/** An item as a player sees it: unidentified things under their unidentified names. */
export const asSeen = (it) => (it.identified === false ? { ...it, name: it.unidName ?? "something", valueGp: undefined, magic: undefined } : it);
export const seenInv = (inv) => ({ coins: { ...inv.coins }, items: inv.items.map(asSeen).map((it) => Object.fromEntries(Object.entries(it).filter(([, v]) => v !== undefined))) });

/** What each of a player's characters can reach and what it holds, for his view. */
export function searchablesFor(state, ids) {
  const out = [];
  for (const id of ids) { const pc = state.figures.find((f) => f.id === id); for (const s of searchable(state, pc)) out.push({ pcId: id, id: s.id, label: s.label, inv: seenInv(source(state, s.id, false)) }); }
  return out;
}

/**
 * One looting move by a character next to a body or hoard:
 * { id, source, op: "take-item" | "put-item", index } or
 * { id, source, op: "take-coins", coin, n? (all if absent) } or { id, source, op: "put-coins" } (all he carries).
 */
export function loot(state, pc, action) {
  const no = (error) => ({ ok: false, events: [], error });
  if (!pc) return no("no such figure");
  if (!searchable(state, pc).some((s) => s.id === action.source)) return no(`${pc.name} can't reach that`);
  const from = source(state, action.source, true), mine = pc.inv ?? (pc.inv = emptyInventory());
  const label = searchable(state, pc).find((s) => s.id === action.source).label;
  const ev = (text) => ({ ok: true, events: [{ type: "loot", id: pc.id, name: pc.name, source: action.source, label, text }] });
  if (action.op === "take-item" || action.op === "put-item") {
    const [a, b] = action.op === "take-item" ? [from, mine] : [mine, from];
    const i = Number(action.index); if (!Number.isInteger(i) || i < 0 || i >= a.items.length) return no("no such item");
    const it = transferItem(a, b, i);
    return ev(`${pc.name} ${action.op === "take-item" ? "takes" : "puts back"} ${asSeen(it).name}.`);
  }
  if (action.op === "take-coins") {
    if (!["cp", "sp", "gp"].includes(action.coin)) return no("no such coin");
    const have = from.coins[action.coin] ?? 0, n = action.n == null ? have : Math.trunc(Number(action.n));
    if (!Number.isFinite(n) || n <= 0 || have <= 0) return no("no coins to take");
    const took = Math.min(n, have); transferCoins(from, mine, { [action.coin]: took });
    return ev(`${pc.name} takes ${took.toLocaleString()} ${action.coin}.`);
  }
  if (action.op === "put-coins") {
    if (!coinCount(mine.coins)) return no("he carries no coins");
    transferCoins(mine, from, { ...mine.coins });
    return ev(`${pc.name} puts his coins back.`);
  }
  return no(`unknown looting move ${action.op}`);
}
/** Referee: say what an unidentified item in a body or hoard really is. */
export function reveal(state, action) {
  const from = source(state, action.source, true);
  const it = from?.items?.[Number(action.index)];
  if (!it) return { ok: false, events: [], error: "no such item" };
  it.identified = true;
  return { ok: true, events: [{ type: "loot", id: null, name: "Referee", source: action.source, text: `The referee reveals ${it.unidName ?? "an item"}: ${it.name}.` }] };
}

/* ---------------------------------------------------------------- tests */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };
  const open = (w, h) => Array.from({ length: h }, () => Array(w).fill(false));
  const pc = { id: 1, side: "A", kind: "pc", name: "F1", cls: "fighter", level: 1, x: 5, y: 5, placed: true, hp: 6, maxHp: 6, ac: 4, weaponId: "sword", inv: emptyInventory() };
  const orc = { id: 2, side: "B", kind: "monster", monsterKey: "orc", name: "Orc 1", x: 6, y: 5, placed: true, hp: 0, maxHp: 5, ac: 6, inv: { coins: { cp: 0, sp: 0, gp: 12 }, items: [{ kind: "potion", name: "Potion of Healing", unidName: "a potion", identified: false, weight: 30 }] } };
  const far = { ...orc, id: 3, name: "Orc 2", x: 20, inv: { coins: { cp: 0, sp: 0, gp: 99 }, items: [] } };
  const st = { phase: "over", width: 30, height: 10, walls: open(30, 10), figures: [pc, orc, far], chests: [{ id: 1, x: 5, y: 6, label: "Orc hoard", original: { coins: { cp: 0, sp: 0, gp: 500 }, items: [] }, inv: null }] };
  ok(searchable(st, pc).map((s) => s.id).join() === "fig-2,chest-1", "he can search the orc beside him and the hoard at his feet, not the far one");
  const seen = searchablesFor(st, [1]);
  ok(seen[0].inv.items[0].name === "a potion" && !("valueGp" in seen[0].inv.items[0]) && seen[0].inv.items.some((i) => i.name === "Shield") && orc.remains == null, "a player sees an unidentified potion as 'a potion', and looking doesn't disturb the body");
  ok(loot(st, pc, { source: "fig-2", op: "take-coins", coin: "gp" }).ok && pc.inv.coins.gp === 12 && orc.remains.coins.gp === 0, "takes the orc's gold");
  const r = loot(st, pc, { source: "fig-2", op: "take-item", index: 0 });
  ok(r.ok && pc.inv.items[0].name === "Potion of Healing" && r.events[0].text === "F1 takes a potion.", "takes the potion; the log names it as he sees it");
  ok(loot(st, pc, { source: "chest-1", op: "take-coins", coin: "gp", n: 100 }).ok && st.chests[0].inv.coins.gp === 400 && pc.inv.coins.gp === 112, "takes 100 gold from the hoard");
  ok(loot(st, pc, { source: "chest-1", op: "put-coins" }).ok && pc.inv.coins.gp === 0 && st.chests[0].inv.coins.gp === 512, "puts his coins back in the hoard");
  ok(!loot(st, pc, { source: "fig-3", op: "take-coins", coin: "gp" }).ok && far.inv.coins.gp === 99, "can't loot what he can't reach");
  ok(!loot(st, pc, { source: "fig-2", op: "take-item", index: 9 }).ok && !loot(st, pc, { source: "chest-1", op: "take-coins", coin: "pp" }).ok, "no such item or coin");
  ok(loot(st, pc, { source: "fig-2", op: "put-item", index: 0 }).ok && reveal(st, { source: "fig-2", index: orc.remains.items.length - 1 }).ok && orc.remains.items.at(-1).identified, "puts the potion back; the referee reveals it");
  console.log(`loot.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

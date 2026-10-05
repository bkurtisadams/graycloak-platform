/**
 * OD&D — who sees what, and who may do what
 * odd-chainmail-rules · src/view.mjs
 *
 * Slice 5, step 1 (Oct 2026). The server keeps the whole fight; each player
 * gets a projection built here, so hidden facts never reach a browser.
 *
 *   who: { uid } a player · { referee: true } · { server: true }
 *   state.control: { [figureId]: uid | "referee" | "game" }; a figure with no
 *   entry is the referee's.
 *
 * What a player sees (Kurt, Oct 2026):
 *   - every figure on the board: position, size, facing, elevation, side,
 *     status, target line, weapon in hand, armour and armour class (worn
 *     armour is visible), class and race, movement spent, whether it is
 *     casting, averted eyes or a mirror held up, and an HP bar as a fraction
 *     (never hit points or HD);
 *   - his allies' exact hit points, level, actions and stances;
 *   - for each monster group: the languages it speaks and how it has
 *     reacted to a parley so far, which the parley and service dialogs need
 *     (never the talk and common-tongue rolls behind them); likewise whether
 *     a monster is charmed and how offers of service to it have gone
 *     (uncertain so far, or talks ended), never the dice;
 *   - everything about his own figures;
 *   - not the RNG, the leader, lair hoards, morale bookkeeping, encounter
 *     reactions, melee contacts, or behaviour reasons.
 * Events: parley and service dice, morale dice and behaviour lines are the
 * referee's; a card item with aud "referee" is dropped for players and one
 * with pub shows that text instead. An event type not listed here is the
 * referee's until it is classified.
 */
import { present } from "./board.mjs";
import { seenInv, searchablesFor } from "./loot.mjs";
import { moverOf } from "./runner.mjs";
import { FIGHT_SCHEMA, RULES_VERSION } from "./fight-store.mjs";

const isStaff = (who) => !!(who?.referee || who?.server);
import { controllerOf, needsReady } from "./readiness.mjs";
export { controllerOf };
export const controls = (state, who, f) => !!f && (isStaff(who) || (who?.uid != null && controllerOf(state, f) === who.uid));
export const figuresOf = (state, who) => state.figures.filter((f) => controls(state, who, f));

/* ------------------------------------------------------------------ figures */

export const PUBLIC_FIGURE_KEYS = Object.freeze(["id", "name", "kind", "monsterKey", "side", "origSide", "x", "y", "size", "facing", "placed", "elevation", "movementAction", "status", "target", "charging", "moved", "weaponId", "weaponBroken", "missile", "armor", "ac", "cls", "race", "retainer", "charmed", "serviceTries", "serviceClosed", "averted", "mirror", "burned"]);
export const ALLY_FIGURE_KEYS = Object.freeze(["hp", "maxHp", "level", "action", "stance"]);
/** What a player knows of a monster group: its tongues and how talks have gone. */
export const ENCOUNTER_PUBLIC_KEYS = Object.freeze(["key", "side", "monsterKey", "talks", "languages", "reaction", "holdRound"]);

export const hpFraction = (f) => (f.hp == null || !f.maxHp ? null : Math.max(0, Math.min(1, f.hp / f.maxHp)));
const pick = (f, keys) => { const o = {}; for (const k of keys) if (f[k] !== undefined) o[k] = f[k]; return o; };
const copy = (v) => JSON.parse(JSON.stringify(v ?? null));

/** One figure as this viewer sees it. */
export function figureFor(state, who, f) {
  if (controls(state, who, f)) { // his own: everything, but unidentified items only as he sees them
    const out = { ...copy(f), mine: true };
    if (out.inv) out.inv = seenInv(out.inv);
    if (out.remains) out.remains = seenInv(out.remains);
    return out;
  }
  const out = { elevation: 0, movementAction: "walk", ...pick(f, PUBLIC_FIGURE_KEYS), hpFrac: hpFraction(f), casting: !!f.action?.startsWith?.("cast:") };
  const mySides = new Set(figuresOf(state, who).map((g) => g.side));
  if (mySides.has(f.side)) Object.assign(out, pick(f, ALLY_FIGURE_KEYS));
  return copy(out);
}

/* ------------------------------------------------------------------ the fight */

export const PUBLIC_STATE_KEYS = Object.freeze(["phase", "round", "step", "firstSide", "init", "winner", "width", "height", "scale", "meleeBegun", "rev", "control", "people"]);
const wallsOut = (walls) => (walls ?? []).map((row) => (typeof row === "string" ? row : row.map((w) => (w ? "#" : ".")).join("")));

/** The fight as this viewer sees it: plain JSON, Firestore-safe. */
export function viewFor(state, who) {
  const base = { schema: FIGHT_SCHEMA, rules: RULES_VERSION, walls: wallsOut(state.walls) };
  if (isStaff(who)) {
    const out = {};
    for (const [k, v] of Object.entries(state)) if (k !== "rngState" && k !== "walls" && typeof v !== "function") out[k] = v instanceof Map ? Object.fromEntries(v) : v instanceof Set ? [...v] : v;
    return { ...copy(out), ...base, referee: true, needIds: needsReady(state).map((f) => f.id) };
  }
  const groups = state.encounter instanceof Map ? Object.fromEntries(state.encounter) : (state.encounter ?? {});
  const encounter = Object.fromEntries(Object.entries(groups).map(([k, g]) => [k, pick(g, ENCOUNTER_PUBLIC_KEYS)]));
  const key = `${state.round}:${state.step}`;
  const readyIds = Object.entries(state.ready ?? {}).filter(([, k]) => k === key).map(([id]) => Number(id));
  return { ...copy(pick(state, PUBLIC_STATE_KEYS)), ...base, readyIds, needIds: needsReady(state).map((f) => f.id), encounter: copy(encounter), mine: figuresOf(state, who).map((f) => f.id), figures: state.figures.map((f) => figureFor(state, who, f)), searchables: searchablesFor(state, figuresOf(state, who).map((f) => f.id)) };
}

/* ------------------------------------------------------------------ authority */

const STAFF_ONLY = Object.freeze(["reveal", "begin-round", "missiles", "melee", "missiles-resolved", "melee-resolved", "behave", "gm", "leader", "orders-end", "force-next", "step-back", "undo"]);
const FIGURE_ACTIONS = Object.freeze(["move", "split-fire", "charge-mode", "close-on", "group-move", "parley", "offer-service", "orders", "draw-weapon", "undo-move", "loot"]);
const actorIds = (a) => [a.id, a.pcId, ...(a.ids ?? [])].filter((x) => x != null);

/** May this viewer send this action? { ok, why }. The runner still checks the rules. */
export function mayAct(state, who, action) {
  const no = (why) => ({ ok: false, why });
  if (isStaff(who)) return { ok: true };
  if (who?.uid == null) return no("not signed in");
  const t = action?.type;
  if (STAFF_ONLY.includes(t)) return no("only the referee does that");
  if (FIGURE_ACTIONS.includes(t)) {
    const ids = actorIds(action);
    if (!ids.length) return no("no figure named");
    const byId = (id) => state.figures.find((f) => f.id === id);
    const bad = ids.find((id) => !controls(state, who, byId(id)));
    return bad == null ? { ok: true } : no(`you don't control ${byId(bad)?.name ?? `figure ${bad}`}`);
  }
  if (t === "elect") return state.figures.some((f) => f.side === action.side && present(f) && controls(state, who, f)) ? { ok: true } : no("you have no figure on that side");
  if (t === "ready" || t === "unready") {
    const ids = action.ids ?? [];
    if (!ids.length) return no("no figure named");
    const bad = ids.find((id) => !controls(state, who, state.figures.find((f) => f.id === id)));
    return bad == null ? { ok: true } : no(`you don't control ${state.figures.find((f) => f.id === bad)?.name ?? `figure ${bad}`}`);
  }
  if (t === "end-move") {
    const side = moverOf(state.step);
    const movers = state.figures.filter((f) => f.side === side && present(f));
    return movers.length && movers.every((f) => controls(state, who, f)) ? { ok: true } : no("other players are moving on this side");
  }
  return no(`unknown action ${t}`);
}

/* ------------------------------------------------------------------ events */

export const PUBLIC_EVENTS = Object.freeze(["round", "initiative", "election", "step-skipped", "moved", "charge", "volley", "down", "over", "missiles", "melee", "talk", "draw-weapon", "ready", "unready", "orders-open", "step-back", "forced", "undo", "undo-move", "loot"]);
export const OWNER_EVENTS = Object.freeze(["charge-mode", "orders", "order-lapsed"]);
export const REFEREE_EVENTS = Object.freeze(["opened", "behaviour", "morale-exempt", "gm", "leader"]);
export const REDACTED_EVENTS = Object.freeze(["morale"]);
const MORALE_PUBLIC = Object.freeze(["type", "reason", "side", "monsterKey", "name", "leader", "source", "holds", "outcome"]);

const cardFor = (card) => ({ ...card, items: (card.items ?? []).filter((i) => i.aud !== "referee").map((i) => (i.pub != null ? { ...i, text: i.pub, pub: undefined } : i)) });

/** The events this viewer may see, with referee-only parts removed. */
export function eventsFor(events, state, who) {
  if (isStaff(who)) return events;
  const out = [];
  for (const e of events) {
    if (PUBLIC_EVENTS.includes(e.type)) {
      const c = { ...e };
      if (Array.isArray(e.cards)) c.cards = e.cards.map(cardFor);
      if (e.card) c.card = cardFor(e.card);
      out.push(copy(c));
    } else if (OWNER_EVENTS.includes(e.type)) {
      if (controls(state, who, state.figures.find((f) => f.id === e.id))) out.push(copy(e));
    } else if (e.type === "morale") out.push(pick(e, MORALE_PUBLIC));
  }
  return out;
}
export const classified = (type) => [...PUBLIC_EVENTS, ...OWNER_EVENTS, ...REFEREE_EVENTS, ...REDACTED_EVENTS].includes(type);

/* ------------------------------------------------------------------ tests */
async function runSelfTests() {
  const { apply } = await import("./runner.mjs");
  const store = await import("./fight-store.mjs");
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };
  const open = (w, h) => Array.from({ length: h }, () => Array(w).fill(false));
  const pc = (id, x, extra) => ({ id, side: "A", origSide: "A", name: `Hero ${id}`, kind: "pc", cls: "fighter", level: 3, armor: "chain+shield", ac: 4, weaponId: "sword", dex: 10, x, y: 5, placed: true, hp: 14, maxHp: 14, stance: "attack", target: null, action: "melee", slotsLeft: [], inv: { coins: { gp: 30 }, items: [] }, ...extra });
  const orc = (id, x, extra) => ({ id, side: "B", origSide: "B", name: `Orc ${id}`, kind: "monster", monsterKey: "orc", ac: 6, x, y: 5, placed: true, hp: 5, maxHp: 5, stance: "attack", target: null, action: "melee", ...extra });
  const fight = () => {
    const st = { phase: "fight", round: 0, step: "init", width: 30, height: 10, walls: open(30, 10), contacts: new Map(), chests: [], leader: { A: null, B: 4 },
      encounter: new Map([["B:orc", { side: "B", monsterKey: "orc", languages: ["orc"], reaction: null }]]),
      figures: [pc(1, 4, { languages: ["common", "orc"] }), pc(2, 4, { y: 6, cls: "magic-user", level: 1, slotsLeft: [1, 0, 0, 0, 0, 0], armor: "none", ac: 9, weaponId: "dagger" }), orc(3, 12), orc(4, 13, { y: 6 }), orc(5, 13, { y: 4 })],
      control: { 1: "kurt", 2: "bob" } };
    store.seedFight(st, 42);
    return st;
  };
  const kurt = { uid: "kurt" }, bob = { uid: "bob" }, ref = { referee: true };

  // A round-by-round script; the same script, saved and reloaded each step, must give the same fight.
  const script = (st) => {
    const out = [];
    const a = (act) => { const r = apply(st, act, store.rngOf(st)); out.push(r); return r; };
    for (let i = 0; i < 4 && st.phase === "fight"; i++) {
      a({ type: "begin-round" });
      a({ type: "elect", side: st.init.winner, choice: "move" });
      for (const side of [st.firstSide, st.firstSide === "A" ? "B" : "A"]) {
        if (side === "B") a({ type: "behave", side: "B" });
        else { const t = st.figures.find((f) => f.side === "B" && present(f)); if (t && present(st.figures[0])) a({ type: "close-on", id: 1, targetId: t.id }); }
        a({ type: "end-move", side });
      }
      if (st.step === "orders") a({ type: "orders-end" });
      if (st.step === "missiles") a({ type: "missiles" });
      if (st.step === "melee") a({ type: "melee" });
    }
    return out;
  };
  {
    const live = fight(); const evLive = script(live).flatMap((r) => r.events);
    let saved = store.toStored(fight());
    const evSaved = []; const a = (act) => { const s = store.fromStored(JSON.parse(JSON.stringify(saved))); const r = apply(s, act, store.rngOf(s)); saved = store.toStored(s); ok(store.nestedArrayPath(saved) === null, "stored fight stays Firestore-safe"); evSaved.push(...r.events); return s; };
    // Replay the same decisions against a reload before every action.
    let cur = store.fromStored(JSON.parse(JSON.stringify(saved)));
    for (let i = 0; i < 4 && cur.phase === "fight"; i++) {
      cur = a({ type: "begin-round" });
      cur = a({ type: "elect", side: cur.init.winner, choice: "move" });
      for (const side of [cur.firstSide, cur.firstSide === "A" ? "B" : "A"]) {
        if (side === "B") cur = a({ type: "behave", side: "B" });
        else { const t = cur.figures.find((f) => f.side === "B" && present(f)); if (t && present(cur.figures[0])) cur = a({ type: "close-on", id: 1, targetId: t.id }); }
        cur = a({ type: "end-move", side });
      }
      if (cur.step === "orders") cur = a({ type: "orders-end" });
      if (cur.step === "missiles") cur = a({ type: "missiles" });
      if (cur.step === "melee") cur = a({ type: "melee" });
    }
    ok(JSON.stringify(evSaved) === JSON.stringify(evLive), "a fight saved and reloaded before every action plays out exactly as one kept in memory");
    ok(evLive.some((e) => e.type === "melee") && evLive.some((e) => e.type === "behaviour"), "the script reached melee and behaviour");
    for (const e of evLive) ok(classified(e.type), `event type ${e.type} is classified for players`);
  }
  {
    const st = fight(); script(st);
    const v = viewFor(st, kurt), raw = JSON.stringify(v);
    const enemy = v.figures.find((f) => f.side === "B");
    ok(!("rngState" in v) && !("leader" in v) && !("contacts" in v) && !("chests" in v) && v.control[1] === "kurt" && Array.isArray(v.readyIds), "a player's view has no RNG, leader, contacts or hoards; it shows who runs each figure and this step's Ready marks");
    ok(v.figures.filter((f) => f.side === "B").every((f) => f.hp === undefined && f.maxHp === undefined && f.hd === undefined && typeof f.ac === "number" && typeof f.hpFrac === "number"), "enemies show armour class and an HP fraction, never hit points or HD");
    const g = v.encounter["B:orc"];
    ok(g && g.languages[0] === "orc" && !("talkRoll" in g) && !("commonRoll" in g), "a monster group's tongues and reaction, not the rolls behind them");
    ok(v.mine.length === 1 && v.mine[0] === 1 && v.figures.find((f) => f.id === 1).mine && v.figures.find((f) => f.id === 1).inv, "his own figure in full");
    const ally = v.figures.find((f) => f.id === 2);
    ok(ally.hp === st.figures[1].hp && ally.level === 1 && ally.action !== undefined && ally.slotsLeft === undefined && ally.inv === undefined, "an ally: exact hit points, level and action, not spells or pack");
    ok(store.nestedArrayPath(v) === null && enemy.elevation === 0 && enemy.movementAction === "walk", "view is Firestore-safe and carries token fields");
    const r = viewFor(st, ref);
    ok(r.referee && !("rngState" in r) && r.figures.find((f) => f.id === 3).maxHp === 5 && typeof r.contacts === "object", "the referee sees everything but the dice");
    ok(!raw.includes("\"rngState\""), "no RNG anywhere in a player's view");
  }
  {
    const st = fight(); const me = st.figures.find((f) => controls(st, kurt, f)), foe = st.figures.find((f) => f.side !== me.side);
    me.inv = { coins: { cp: 0, sp: 0, gp: 3 }, items: [{ kind: "ring", name: "Ring of Invisibility", unidName: "a ring", identified: false, weight: 1 }] };
    Object.assign(foe, { x: me.x + 1, y: me.y, hp: 0, inv: { coins: { cp: 0, sp: 0, gp: 7 }, items: [] } });
    const v = viewFor(st, kurt), mv = v.figures.find((f) => f.id === me.id);
    ok(mv.inv.items[0].name === "a ring" && !JSON.stringify(v).includes("Invisibility"), "his own unidentified ring shows only as 'a ring'");
    ok(v.searchables.some((s) => s.pcId === me.id && s.id === `fig-${foe.id}` && s.inv.coins.gp === 7), "he sees what the fallen foe beside him holds");
    ok(!("inv" in v.figures.find((f) => f.id === foe.id)), "but not an enemy's purse otherwise");
  }
  {
    const st = fight(); Object.assign(st.figures[2], { charmed: true, side: "A", serviceTries: 1 }); st.figures[3].serviceClosed = true;
    const v = viewFor(st, kurt), o3 = v.figures.find((f) => f.id === 3), o4 = v.figures.find((f) => f.id === 4);
    ok(o3.charmed === true && o3.serviceTries === 1 && o4.serviceClosed === true, "a player sees a charmed monster and how his offers of service have gone (the service dialog needs them)");
  }
  {
    const st = fight(); st.step = "move-A";
    apply(st, { type: "orders", id: 2, action: "cast:sleep", castAim: { x: 12, y: 5 } }, store.rngOf(st));
    const enemyView = viewFor({ ...st, control: { 3: "gary" } }, { uid: "gary" }).figures.find((f) => f.id === 2);
    ok(enemyView.casting === true && enemyView.action === undefined && enemyView.castAim === undefined, "the other side sees a caster standing to cast, not the spell or where it will land");
    ok(viewFor(st, kurt).figures.find((f) => f.id === 2).castAim === undefined, "an ally doesn't see the aim point either");
  }
  {
    const st = fight(); st.step = "move-A";
    ok(mayAct(st, kurt, { type: "move", id: 1, x: 5, y: 5 }).ok && !mayAct(st, kurt, { type: "move", id: 2, x: 5, y: 5 }).ok, "a player moves only his own figures");
    ok(!mayAct(st, kurt, { type: "group-move", ids: [1, 2], leadId: 1, x: 6, y: 5 }).ok, "a group move needs every member");
    ok(mayAct(st, kurt, { type: "orders", id: 1, target: 3 }).ok && !mayAct(st, bob, { type: "orders", id: 1, target: 3 }).ok, "orders for his own figures only");
    ok(mayAct(st, kurt, { type: "parley", pcId: 1, figId: 3, lang: "orc" }).ok, "parley speaks for his own character");
    ok(!mayAct(st, kurt, { type: "melee" }).ok && !mayAct(st, kurt, { type: "gm", id: 1, tool: "heal" }).ok && !mayAct(st, kurt, { type: "behave", side: "B" }).ok, "resolving steps, behaviour and GM tools are the referee's");
    ok(!mayAct(st, kurt, { type: "end-move", side: "A" }).ok, "with two players on the side, one can't end its move");
    ok(mayAct({ ...st, control: { 1: "kurt", 2: "kurt" } }, kurt, { type: "end-move", side: "A" }).ok, "a sole player ends his side's move");
    st.step = "elect"; st.init = { winner: "A" };
    ok(mayAct(st, bob, { type: "elect", side: "A", choice: "move" }).ok && !mayAct(st, bob, { type: "elect", side: "B", choice: "move" }).ok, "a player on the winning side may elect");
    ok(mayAct(st, ref, { type: "gm", id: 3, tool: "kill" }).ok && mayAct(st, { server: true }, { type: "melee" }).ok, "referee and server may do anything");
    ok(!mayAct(st, {}, { type: "move", id: 1 }).ok, "not signed in");
  }
  {
    const st = fight();
    const evs = [
      { type: "behaviour", side: "B", lines: ["Orc 3 charges"] },
      { type: "morale", reason: "casualties", side: "B", name: "Orc", roll: { dice: [2, 3] }, needed: 7, row: 3, holds: false, outcome: "flee" },
      { type: "orders", id: 1, action: "melee" }, { type: "orders", id: 2, action: "cast:sleep" },
      { type: "talk", card: { title: [], items: [{ text: "2d6 [3,4] = 7: uncertain", aud: "referee" }, { text: "They hold for round 2." }] } },
      { type: "melee", cards: [{ title: [], items: [{ text: "Troll regenerates 3 hit points (9/30).", pub: "Troll's wounds close." }] }] },
      { type: "gm", id: 3, tool: "kill" }, { type: "something-new" }
    ];
    const seen = eventsFor(evs, st, kurt), types = seen.map((e) => e.type);
    ok(!types.includes("behaviour") && !types.includes("gm") && !types.includes("something-new"), "behaviour, GM tools and unclassified events stay with the referee");
    const m = seen.find((e) => e.type === "morale");
    ok(m && m.outcome === "flee" && m.roll === undefined && m.needed === undefined && m.row === undefined, "players see a morale result, not the dice");
    ok(seen.filter((e) => e.type === "orders").length === 1 && seen.find((e) => e.type === "orders").id === 1, "orders go only to their owner");
    ok(seen.find((e) => e.type === "talk").card.items.length === 1, "parley dice are the referee's");
    ok(seen.find((e) => e.type === "melee").cards[0].items[0].text === "Troll's wounds close.", "regeneration shows without numbers");
    ok(eventsFor(evs, st, ref).length === evs.length, "the referee gets every event");
  }
  console.log(`view.mjs — all self-tests passed (${pass} assertions).`);
}
if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

/**
 * OD&D — fight state as stored
 * odd-chainmail-rules · src/fight-store.mjs
 *
 * Slice 5, step 1 (Oct 2026). The runner works on a live state (Maps, a
 * wall grid); Firestore takes plain JSON with no arrays inside arrays and no
 * undefined. toStored and fromStored convert between the two, stamp the
 * schema and the rules version, and carry the seeded RNG as state.rngState so
 * a fight resumes mid-sequence with the same dice.
 *
 * Token fields borrowed from Foundry core's token data (Kurt, Oct 2026):
 * elevation (inches) and movementAction (walk | fly | swim) on every figure;
 * per-mode movement is derived (armour or monster data) with f.movement as an
 * override. Senses and light wait for fog of war.
 */
import { serialRng, rngHolder } from "./dice.mjs";
import { MONSTERS } from "./monsters.mjs";
import { moveInches } from "./movement.mjs";

export const FIGHT_SCHEMA = 1;
export const RULES_VERSION = "0.18.0";
export const MOVEMENT_ACTIONS = Object.freeze(["walk", "fly", "swim"]);

/** Page-only fields the tester keeps on its state; never stored. */
export const CLIENT_KEYS = Object.freeze(["rng", "selected", "hover", "editing", "group", "dragged", "rightDragged", "cast", "castHover", "tokenDrag", "box", "measure", "events", "fx", "banner", "saved", "skipMissiles"]);

/** Seed a fight's dice (the holder lives in the state, so it saves with it) and fill token defaults. */
export function seedFight(state, seed) { state.rngState = rngHolder(seed); for (const f of state.figures ?? []) withTokenDefaults(f); return rngOf(state); }
/** The fight's RNG, drawing from (and advancing) state.rngState. */
export function rngOf(state) {
  if (!state.rngState) throw new Error("the fight has no rngState; seed it with seedFight");
  return serialRng(state.rngState);
}

export function withTokenDefaults(f) {
  if (f.elevation == null) f.elevation = 0;
  if (!MOVEMENT_ACTIONS.includes(f.movementAction)) f.movementAction = "walk";
  return f;
}
/** Inches per turn by mode: walk from armour or monster data, fly from monster data, f.movement overrides. */
export function movementModes(f) {
  const m = f.kind === "monster" ? MONSTERS.find((x) => x.key === f.monsterKey) : null;
  return { walk: moveInches(f), fly: m?.move?.fly ?? 0, swim: 0, ...(f.movement ?? {}) };
}

const wallsOut = (walls) => (walls ?? []).map((row) => row.map((w) => (w ? "#" : ".")).join(""));
const wallsIn = (rows) => (rows ?? []).map((r) => (typeof r === "string" ? [...r].map((c) => c === "#") : r));

function plain(v) {
  if (v instanceof Map) return { $map: Object.fromEntries([...v].map(([k, x]) => [String(k), plain(x)])) };
  if (v instanceof Set) return [...v].map(plain);
  if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === "object") { const o = {}; for (const [k, x] of Object.entries(v)) if (x !== undefined && typeof x !== "function") o[k] = plain(x); return o; }
  if (typeof v === "number" && !Number.isFinite(v)) return null;
  return v;
}
function revive(v) {
  if (Array.isArray(v)) return v.map(revive);
  if (v && typeof v === "object") {
    if (v.$map && Object.keys(v).length === 1) return new Map(Object.entries(v.$map).map(([k, x]) => [k, revive(x)]));
    const o = {}; for (const [k, x] of Object.entries(v)) o[k] = revive(x); return o;
  }
  return v;
}

/** The live fight as a Firestore-safe document. Does not change the state. */
export function toStored(state) {
  const out = {};
  for (const [k, v] of Object.entries(state)) if (!CLIENT_KEYS.includes(k) && v !== undefined && typeof v !== "function") out[k] = k === "walls" ? wallsOut(v) : plain(v);
  out.schema = FIGHT_SCHEMA; out.rules = RULES_VERSION;
  return out;
}
/** A stored fight back to a live state the runner can use. */
export function fromStored(doc) {
  if (doc?.schema !== FIGHT_SCHEMA) throw new Error(`fight schema ${doc?.schema} is not ${FIGHT_SCHEMA}`);
  const st = revive(doc);
  st.walls = wallsIn(doc.walls);
  if (!(st.contacts instanceof Map)) st.contacts = new Map(Object.entries(st.contacts ?? {}));
  for (const f of st.figures ?? []) withTokenDefaults(f);
  return st;
}
/** A client's package version must match the server's, so its previews agree with the server. */
export const sameRules = (clientRules) => clientRules === RULES_VERSION;

/** Firestore can't hold an array directly inside an array. */
export function nestedArrayPath(v, path = "") {
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) { if (Array.isArray(v[i])) return `${path}[${i}]`; const p = nestedArrayPath(v[i], `${path}[${i}]`); if (p) return p; }
  } else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { const p = nestedArrayPath(x, `${path}.${k}`); if (p) return p; }
  return null;
}

/* ------------------------------------------------------------------ tests */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };
  const st = {
    phase: "fight", round: 2, step: "melee", width: 3, height: 2, walls: [[true, false, false], [false, false, true]],
    contacts: new Map([["1-2", { first: 1, rounds: 2, lastRound: 2 }]]), encounter: new Map([["B:orc", { side: "B", monsterKey: "orc", languages: ["orc"], reaction: null }]]),
    fearChecked: new Set(["A:orc:5"]), figures: [{ id: 1, kind: "pc", name: "Hugo", armor: "chain", hp: 5, maxHp: 8, dmgNote: undefined }, { id: 2, kind: "monster", monsterKey: "dragon-red", hp: 30, maxHp: 30 }],
    rng: () => 0.5, selected: 1, group: new Set([1])
  };
  seedFight(st, 7);
  const doc = JSON.parse(JSON.stringify(toStored(st)));
  ok(doc.schema === FIGHT_SCHEMA && doc.rules === RULES_VERSION, "stamped with schema and rules version");
  ok(doc.walls[0] === "#.." && doc.walls[1] === "..#", "walls stored as rows of text");
  ok(nestedArrayPath(doc) === null && nestedArrayPath({ a: [[1]] }) === ".a[0]", "no arrays inside arrays");
  ok(!("rng" in doc) && !("selected" in doc) && !("group" in doc), "page-only fields dropped");
  ok(doc.contacts.$map["1-2"].rounds === 2 && Array.isArray(doc.fearChecked), "maps and sets made plain");
  const back = fromStored(doc);
  ok(back.walls[0][0] === true && back.walls[0][1] === false && back.contacts.get("1-2").lastRound === 2 && back.encounter.get("B:orc").languages[0] === "orc", "walls and maps revived");
  ok(back.figures[0].elevation === 0 && back.figures[0].movementAction === "walk", "token defaults filled");
  const a = rngOf(st), b = rngOf(back);
  ok(a() === b() && a() === b(), "the dice resume where they left off");
  ok(movementModes(back.figures[1]).fly === 24 && movementModes({ ...back.figures[0], movement: { fly: 12 } }).fly === 12, "fly from monster data; an override wins");
  let threw = false; try { fromStored({ ...doc, schema: 99 }); } catch { threw = true; }
  ok(threw, "an unknown schema is refused");
  ok(sameRules(RULES_VERSION) && !sameRules("0.12.0"), "rules version check");
  console.log(`fight-store.mjs — all self-tests passed (${pass} assertions).`);
}
if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

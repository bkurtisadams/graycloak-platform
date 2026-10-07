/**
 * BOOT HILL 2e · First Shot Determination Chart and firing order
 * Net speed = first shot base + chart modifiers. Highest fires first; equal
 * net speeds fire simultaneously. A shooter wounded before firing has net
 * speed recomputed (call netSpeed again with the new wound band, then
 * firingOrder on those still to fire).
 */
import { makeChecker, isMain } from "./selftest.mjs";

export const FIRST_SHOT_MODIFIERS = Object.freeze({
  surprise: { gaveFirstMove: -1, surprised: -5, completelySurprised: -10 },
  movement: { running: -20, runningDodging: -20, horseback: -10 },
  wounds: { "under-half": -5, "half-or-more": -20 },
  drawsTwoGuns: -3,
  hipshoots: 5,
  sameTarget: { fired: 10, aimed: 5 }
});

const LABELS = {
  gaveFirstMove: "Giving opponent the first move",
  surprised: "Surprised",
  completelySurprised: "Completely surprised",
  running: "Running",
  runningDodging: "Running and dodging",
  horseback: "On horseback",
  "under-half": "Wounds under 50% of STRENGTH",
  "half-or-more": "Wounds 50% or more of STRENGTH",
  drawsTwoGuns: "Draws two guns",
  hipshoots: "Hipshoots",
  fired: "Fires on same target, consecutive turn",
  aimed: "Aims at same target, consecutive turn"
};

const pick = (table, key, parts) => {
  if (key == null || key === "none") return;
  if (!(key in table)) throw new Error(`netSpeed: unknown option ${key}`);
  parts.push({ key, label: LABELS[key], value: table[key] });
};

/**
 * conditions: { surprise, movement, wounds (band from woundBand), drawsTwoGuns,
 * hipshoots, sameTarget: "fired" | "aimed" } — firing and aiming on the same
 * target are alternatives ("or"), so only one applies.
 */
export function netSpeed(base, conditions = {}) {
  const M = FIRST_SHOT_MODIFIERS;
  const parts = [];
  pick(M.surprise, conditions.surprise, parts);
  pick(M.movement, conditions.movement, parts);
  pick(M.wounds, conditions.wounds, parts);
  if (conditions.drawsTwoGuns) parts.push({ key: "drawsTwoGuns", label: LABELS.drawsTwoGuns, value: M.drawsTwoGuns });
  if (conditions.hipshoots) parts.push({ key: "hipshoots", label: LABELS.hipshoots, value: M.hipshoots });
  pick(M.sameTarget, conditions.sameTarget, parts);
  return { base, parts, total: base + parts.reduce((s, p) => s + p.value, 0) };
}

/** entries: [{ id, netSpeed }] → groups, highest first; each group fires simultaneously. */
export function firingOrder(entries) {
  const sorted = [...entries].sort((a, b) => b.netSpeed - a.netSpeed);
  const groups = [];
  for (const e of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.netSpeed === e.netSpeed) last.ids.push(e.id);
    else groups.push({ netSpeed: e.netSpeed, ids: [e.id] });
  }
  return groups;
}

export function runSelfTests() {
  const { ok, eq, count } = makeChecker();
  eq(netSpeed(18).total, 18, "no conditions");
  eq(netSpeed(18, { surprise: "gaveFirstMove" }).total, 17, "first move -1");
  eq(netSpeed(18, { surprise: "completelySurprised" }).total, 8, "complete surprise -10");
  eq(netSpeed(18, { movement: "runningDodging" }).total, -2, "running and dodging -20");
  eq(netSpeed(18, { movement: "horseback" }).total, 8, "horseback -10");
  eq(netSpeed(18, { wounds: "under-half" }).total, 13, "wounds -5");
  eq(netSpeed(18, { wounds: "half-or-more" }).total, -2, "wounds -20");
  eq(netSpeed(18, { wounds: "none" }).total, 18, "unwounded");
  eq(netSpeed(18, { drawsTwoGuns: true, hipshoots: true }).total, 20, "two guns -3, hipshoot +5");
  eq(netSpeed(18, { sameTarget: "fired" }).total, 28, "consecutive fire +10");
  eq(netSpeed(18, { sameTarget: "aimed" }).total, 23, "consecutive aim +5");
  eq(netSpeed(18, { surprise: "surprised", wounds: "under-half", hipshoots: true }).parts.length, 3, "parts itemized");
  let threw = false;
  try { netSpeed(18, { surprise: "ambushed" }); } catch { threw = true; }
  ok(threw, "unknown option throws");

  const order = firingOrder([{ id: "a", netSpeed: 12 }, { id: "b", netSpeed: 18 }, { id: "c", netSpeed: 12 }, { id: "d", netSpeed: -3 }]);
  eq(order.map((g) => g.ids.join("+")).join(" > "), "b > a+c > d", "highest first, ties simultaneous");
  eq(firingOrder([]).length, 0, "empty");
  console.log(`first-shot.mjs — all self-tests passed (${count()} assertions).`);
}

if (isMain(import.meta.url)) runSelfTests();

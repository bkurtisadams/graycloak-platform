/**
 * OD&D — Chainmail engine · multi-class rules (Supplement I demihumans)
 * odd-chainmail · module/rules/multiclass.mjs
 * system 0.1.124 · slice: multiclass-combat · stamp 0.1.124-multiclass-combat.1
 *
 * Pure helpers encoding Kurt's multi-class rulings (no Foundry deps; consumed by
 * the data model now and by the combat/advancement phases later):
 *   - XP is split EVENLY across the character's classes, and a class that has
 *     hit its racial cap still takes its share — that share is forfeit, not
 *     redistributed (splitXp divides by the full class count).
 *   - Saves and combat use the BEST of the held classes (bestBy).
 *   - Hit points are the AVERAGE across the held classes (averageHp).
 * Allowed combinations are race-driven (dwarf F/T, elf F/MU/T, half-elf F/MU);
 * humans are single-class. That gating lives in chargen, not here.
 */

import { classKey } from "./advancement.mjs";

/**
 * Even XP split across `classCount` classes (forfeit-on-cap: the divisor is the
 * full class count, so a capped class's share is simply lost). Per-class share
 * is floored; any remainder is dropped rather than handed to one class.
 */
export function splitXp(amount, classCount) {
  const n = Math.max(1, Math.trunc(Number(classCount)) || 1);
  return Math.floor((Math.max(0, Number(amount)) || 0) / n);
}

/** Highest-level class entry (ties resolve to the earliest). Used as the
 *  "primary" projection for legacy single-value consumers and display. */
export function primaryOf(classList) {
  if (!Array.isArray(classList) || classList.length === 0) return null;
  return classList.reduce((best, c) => (c.level > best.level ? c : best), classList[0]);
}

/**
 * Best class entry by a scoring function (higher score wins). Saves pass a fn
 * that negates the target (lower save number is better); combat passes attacks
 * or to-hit (higher is better).
 */
export function bestBy(classList, scoreFn) {
  if (!Array.isArray(classList) || classList.length === 0) return null;
  return classList.reduce((best, c) => (scoreFn(c) > scoreFn(best) ? c : best), classList[0]);
}

/** Average of per-class hit-point totals, rounded down (AD&D-style multi-class
 *  HP). Input is the HP each held class would contribute on its own. */
export function averageHp(perClassHp) {
  const xs = (perClassHp ?? []).map((n) => Math.max(0, Number(n) || 0));
  if (xs.length === 0) return 0;
  return Math.floor(xs.reduce((a, b) => a + b, 0) / xs.length);
}

/** Normalize a raw classes array to {key, level, xp} with keys run through
 *  classKey. Tolerates a missing/empty array (returns []). */
export function normalizeClasses(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((c) => ({ key: classKey(c.key), level: c.level ?? 1, xp: c.xp ?? 0 }));
}

/**
 * Per-key minimum across an array of number-keyed objects (best saving throw
 * across class tracks — lower target is better). Keys are taken from the first
 * object; a single-element array returns a copy of it.
 */
export function mergeMin(objs) {
  if (!Array.isArray(objs) || objs.length === 0) return {};
  return Object.fromEntries(Object.keys(objs[0]).map((k) => [k, Math.min(...objs.map((o) => o[k]))]));
}

/* Self-tests — Node only. */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`multiclass.mjs FAIL: ${l}`); pass++; };

  // Even split, forfeit on cap (divisor = full class count).
  ok(splitXp(900, 3) === 300 && splitXp(1000, 2) === 500, "even split");
  ok(splitXp(1001, 2) === 500, "remainder dropped");
  ok(splitXp(500, 1) === 500 && splitXp(500, 0) === 500, "single / guarded divisor");
  ok(splitXp(-50, 2) === 0, "negative amount floors to 0");

  // Primary = highest level, ties to earliest.
  const list = [{ key: "fighter", level: 4 }, { key: "magic-user", level: 6 }, { key: "thief", level: 6 }];
  ok(primaryOf(list).key === "magic-user", "primary = highest level, earliest on tie");
  ok(primaryOf([]) === null, "primary of empty = null");

  // Best-by (saves: lower target better -> negate).
  const saves = [{ key: "fighter", t: 13 }, { key: "magic-user", t: 11 }];
  ok(bestBy(saves, (c) => -c.t).key === "magic-user", "best save = lowest target");
  const atk = [{ key: "fighter", attacks: 5 }, { key: "thief", attacks: 3 }];
  ok(bestBy(atk, (c) => c.attacks).key === "fighter", "best combat = most attacks");

  // Average HP, rounded down.
  ok(averageHp([10, 7]) === 8 && averageHp([9, 9, 9]) === 9 && averageHp([5]) === 5, "average hp floors");
  ok(averageHp([]) === 0, "average of none = 0");

  // Normalize tolerates raw/empty.
  ok(normalizeClasses([{ key: "Magic-User", level: 3, xp: 50 }])[0].key === "magic-user", "normalize keys");
  ok(normalizeClasses(undefined).length === 0, "normalize empty");

  // mergeMin: per-key best (lowest) save across tracks.
  ok(JSON.stringify(mergeMin([{ a: 13, b: 12 }, { a: 11, b: 14 }])) === JSON.stringify({ a: 11, b: 12 }), "mergeMin per-key minimum");
  ok(JSON.stringify(mergeMin([{ a: 9 }])) === JSON.stringify({ a: 9 }), "mergeMin single = copy");

  console.log(`multiclass.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

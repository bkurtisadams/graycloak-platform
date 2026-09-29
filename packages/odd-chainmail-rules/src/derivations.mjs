/**
 * OD&D — Chainmail engine · character derivation helpers
 * odd-chainmail · module/rules/derivations.mjs
 * system 0.1.138 · slice: dex-missile · stamp 0.1.138-dex-missile.1
 */

import { classKey } from "./advancement.mjs";

/** Prime requisite ability by class. */
export const PRIME_REQUISITE = Object.freeze({
  fighter: "str",
  "magic-user": "int",
  cleric: "wis",
  thief: "dex"
});

export function primeFor(rawClass) {
  return PRIME_REQUISITE[classKey(rawClass)] ?? "str";
}

/** Prime-requisite XP bonus/penalty as a percent. */
export function xpMod(score) {
  const v = Math.trunc(score) || 0;
  if (v >= 15) return 10;
  if (v >= 13) return 5;
  if (v >= 9) return 0;
  if (v >= 7) return -10;
  return -20;
}

/** Dexterity initiative modifier (Dex 13+ -> +1, 8- -> -1). */
export function initMod(dex) {
  const v = Math.trunc(dex) || 0;
  return v >= 13 ? 1 : v <= 8 ? -1 : 0;
}

/**
 * Dexterity missile-fire modifier (Men & Magic p.12: Dex above 12 -> +1, under
 * 9 -> -1 on any missile). Same thresholds as init, but a distinct rule.
 */
export function missileMod(dex) {
  const v = Math.trunc(dex) || 0;
  return v >= 13 ? 1 : v <= 8 ? -1 : 0;
}

/* Self-tests — Node only. */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };

  ok(xpMod(15) === 10 && xpMod(18) === 10, "xpMod 15+ = +10");
  ok(xpMod(13) === 5 && xpMod(14) === 5, "xpMod 13-14 = +5");
  ok(xpMod(12) === 0 && xpMod(9) === 0, "xpMod 9-12 = 0");
  ok(xpMod(8) === -10 && xpMod(7) === -10, "xpMod 7-8 = -10");
  ok(xpMod(6) === -20 && xpMod(3) === -20, "xpMod <=6 = -20");
  ok(initMod(13) === 1 && initMod(18) === 1, "init 13+ = +1");
  ok(initMod(8) === -1 && initMod(3) === -1, "init 8- = -1");
  ok(initMod(10) === 0 && initMod(12) === 0, "init 9-12 = 0");
  ok(missileMod(13) === 1 && missileMod(18) === 1, "missile 13+ (>12) = +1");
  ok(missileMod(8) === -1 && missileMod(3) === -1, "missile 8- (<9) = -1");
  ok(missileMod(9) === 0 && missileMod(12) === 0, "missile 9-12 = 0");
  ok(primeFor("Fighting-Man") === "str" && primeFor("MU") === "int", "prime requisite map");

  console.log(`derivations.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

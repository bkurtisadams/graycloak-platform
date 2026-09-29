/**
 * OD&D — Chainmail engine · mounts
 * odd-chainmail · module/rules/mounts.mjs
 * system 0.1.102 · slice: mounted-move · stamp 0.1.102-mounted-move.1
 *
 * Move/charge (inches) by mount, from the OD&D monster table (animal move) and
 * the Chainmail cavalry charge. A rider takes the mount's figures wholesale —
 * the foot gp-weight ladder and the figure's own charge no longer apply (RULES-
 * CALL, Kurt: a mounted character "gets whatever move/charge his mount has,"
 * the FRT's mounted parentheticals are not used). Mules and draft horses DO
 * charge (12/18) per Kurt's call.
 */

export const MOUNT_TYPES = Object.freeze(["none", "mule", "draft", "light", "medium", "heavy"]);

export const MOUNTS = Object.freeze({
  none:   Object.freeze({ move: 0,  charge: 0 }),
  mule:   Object.freeze({ move: 12, charge: 18 }),
  draft:  Object.freeze({ move: 12, charge: 18 }),
  light:  Object.freeze({ move: 24, charge: 30 }),
  medium: Object.freeze({ move: 18, charge: 24 }),
  heavy:  Object.freeze({ move: 12, charge: 18 })
});

/** Move/charge (inches) for a mount type; the inert none/0-0 pair if unknown. */
export function mountMovement(type) {
  return MOUNTS[type] ?? MOUNTS.none;
}

/* Self-tests — Node only. */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`mounts.mjs FAIL: ${l}`); pass++; };

  ok(mountMovement("none").move === 0 && mountMovement("none").charge === 0, "none is inert");
  ok(mountMovement("mule").move === 12 && mountMovement("mule").charge === 18, "mule 12/18");
  ok(mountMovement("draft").move === 12 && mountMovement("draft").charge === 18, "draft 12/18");
  ok(mountMovement("light").move === 24 && mountMovement("light").charge === 30, "light 24/30");
  ok(mountMovement("medium").move === 18 && mountMovement("medium").charge === 24, "medium 18/24");
  ok(mountMovement("heavy").move === 12 && mountMovement("heavy").charge === 18, "heavy 12/18");
  ok(mountMovement("pegasus") === MOUNTS.none, "unknown -> none");
  ok(MOUNT_TYPES.length === 6 && MOUNT_TYPES.every((t) => t in MOUNTS), "types cover the table");

  console.log(`mounts.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

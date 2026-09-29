/**
 * OD&D — Chainmail engine · mounted man-to-man combat
 * odd-chainmail · module/rules/mounted-combat.mjs
 * system 0.1.207 · slice: mounted-melee · stamp 0.1.207-mounted-melee.1
 *
 * The man-to-man mounted rules, pure. Four pieces:
 *
 *   1. The die modifier: "mounted men add +1 to their dice for melees and the
 *      men afoot must subtract -1" — with "1st round only horsemen add two."
 *      mountedDieBonus() returns the per-die adjustment for one attacker
 *      against one defender; it rides the same per-die channel as the rear
 *      facing bonus in resolveAttackPool.
 *
 *   2. The horse's own attacks, round 2+: "the horse as well as its rider
 *      attack, the horse counting as the following weapon(s) ... but only
 *      footmen": Light = 1 Mace, Medium = 2 Maces, Heavy = 2 Flails. The
 *      horse may pick a different opponent than its rider.
 *
 *   3. Deliberate unhorsing: a footman who declares the intent before dice
 *      are rolled unhorses on a score equal to a kill, "with no subtraction
 *      for their being afoot" — the -1 is waived, and the result is a spill,
 *      not a slaying.
 *
 *   4. The spill: 1d6 — 1-2 not stunned, 3-5 stunned 1 turn, 6 stunned 3
 *      turns. Remounting (or voluntary dismounting) costs one-half turn.
 *
 * RULES-CALLS (defaults; Kurt to confirm):
 *   first round   the +2 is keyed to the CHARGE flag on the attack — the
 *                 first round of a mounted melee is the round contact is
 *                 made, i.e. the charge. Without a charge the horseman gets
 *                 the standing +1. (The live path has no per-pair engagement
 *                 round memory; the charge flag is the honest proxy.)
 *   pack animals  mules and draft horses fight with no bonus and make no
 *                 horse attacks — they are transport, not destriers. A rider
 *                 on one is still "mounted" for the ±1 (he has the height).
 *   parries       an unhorsing attempt can be parried like any other blow;
 *                 RAW is silent, and warding off the grab is the natural
 *                 reading. Breakage and speed dice apply normally.
 */

/** The horse's own attack, by mount type. null = this mount does not fight. */
export const HORSE_ATTACKS = Object.freeze({
  light: Object.freeze({ weaponId: "mace", dice: 1 }),
  medium: Object.freeze({ weaponId: "mace", dice: 2 }),
  heavy: Object.freeze({ weaponId: "flail", dice: 2 })
});

/** Horse attack profile for a mount type, or null (mule/draft/none/unknown). */
export function horseAttack(mountType) {
  return HORSE_ATTACKS[mountType] ?? null;
}

/**
 * Per-die melee modifier for the mounted/afoot relationship.
 *
 * @param {object} p
 * @param {boolean} p.attackerMounted
 * @param {boolean} p.defenderMounted
 * @param {boolean} [p.charge=false]  attacker is charging (first-round +2)
 * @returns {number}  +2 | +1 | 0 | -1
 */
export function mountedDieBonus({ attackerMounted, defenderMounted, charge = false }) {
  if (attackerMounted && !defenderMounted) return charge ? 2 : 1;
  if (!attackerMounted && defenderMounted) return -1;
  return 0; // both mounted or both afoot — no relative advantage
}

/** Unhorsed-man stun result for a d6: turns stunned (0, 1, or 3). */
export function unhorseStun(d6) {
  const r = Math.trunc(Number(d6) || 0);
  if (r >= 6) return 3;
  if (r >= 3) return 1;
  return 0;
}

/** Remount (or voluntary dismount) cost, in turns. Reference constant. */
export const REMOUNT_TURNS = 0.5;

/* Self-tests — Node only. */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`mounted-combat.mjs FAIL: ${l}`); pass++; };

  // The ±1 relationship and the charge +2.
  ok(mountedDieBonus({ attackerMounted: true, defenderMounted: false }) === 1, "mounted vs afoot +1");
  ok(mountedDieBonus({ attackerMounted: true, defenderMounted: false, charge: true }) === 2, "charging horseman +2");
  ok(mountedDieBonus({ attackerMounted: false, defenderMounted: true }) === -1, "afoot vs mounted -1");
  ok(mountedDieBonus({ attackerMounted: false, defenderMounted: true, charge: true }) === -1, "a footman's charge earns nothing");
  ok(mountedDieBonus({ attackerMounted: true, defenderMounted: true, charge: true }) === 0, "horse vs horse level");
  ok(mountedDieBonus({ attackerMounted: false, defenderMounted: false }) === 0, "foot vs foot level");

  // Horse attacks: the RAW trio, and pack animals abstain.
  ok(horseAttack("light")?.weaponId === "mace" && horseAttack("light").dice === 1, "light horse = 1 mace");
  ok(horseAttack("medium")?.weaponId === "mace" && horseAttack("medium").dice === 2, "medium horse = 2 maces");
  ok(horseAttack("heavy")?.weaponId === "flail" && horseAttack("heavy").dice === 2, "heavy horse = 2 flails");
  ok(horseAttack("mule") === null && horseAttack("draft") === null, "pack animals do not fight");
  ok(horseAttack("none") === null && horseAttack(undefined) === null, "no mount, no horse attack");

  // The spill.
  ok(unhorseStun(1) === 0 && unhorseStun(2) === 0, "1-2 lands on his feet");
  ok(unhorseStun(3) === 1 && unhorseStun(5) === 1, "3-5 stunned one turn");
  ok(unhorseStun(6) === 3, "6 stunned three turns");

  console.log(`mounted-combat.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

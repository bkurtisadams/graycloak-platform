/**
 * OD&D — Chainmail engine · attack / parry / breakage / missile fire
 * odd-chainmail · module/rules/combat-engine.mjs
 * system 0.1.175 · slice: held-parry-only · stamp 0.1.175-held-parry-only.1
 *
 * Pure and runtime-free. Resolves the man-to-man round on the shared to-hit
 * table (rules/tables.mjs). The engine stays type-blind: racial edges arrive
 * as plain numbers the caller computes (rules/race.mjs).
 *
 *   damageBonus  attacker.damageBonus is added to EACH hit's flat 1d6 — the
 *                elf's magic-weapon pip (d6 -> 2-7, Monsters & Treasure). Pure
 *                damage augmentation, the mirror of the per-die to-hit `bonus`.
 *   damageHalved target.damageHalved halves the hit points of each blow the
 *                defender takes (round down) — a dwarf the attacker can barely
 *                land a clean hit on. A defensive property like hitOnlyBy; the
 *                engine never asks who is a dwarf.
 *
 * Parry model — RAW man-to-man bands, defensive half (slice parry-bands-defensive):
 *
 *   Speed    a weapon 4+ classes LIGHTER than the defender's adds +1 attack
 *            die, 8+ classes adds +2 — the man-to-man multiple-blows rule in
 *            pool currency. Keys on the same parryWeaponId as breakage.
 *   Immunity the FCT's surviving gatekeeping role. A target with
 *            hitOnlyBy "magic" is untouchable except by a magical weapon;
 *            "silver" admits silver OR magical. An immune pool short-circuits:
 *            no dice are rolled, no parries spent, result carries immune:true.
 *   To-hit   2d6 (meet or beat) for the attacker's weapon vs the target's AC.
 *   Damage   each hit is a flat 1d6 off the pool. (variableDamage swap later.)
 *   Bonus    a monster's "+X" rides ONE of its attack dice as a to-hit bonus.
 *   Parry    a held die imposes a class-banded penalty on one incoming blow,
 *            by the defender's parry weapon vs the attacker's weapon (RAW 4a-4d):
 *            2+ classes HEAVIER (4a) -> no parry at all; 8+ classes LIGHTER (4d)
 *            -> -1; everything between (4b/4c) -> -2. See parryPenalty(). One
 *            parry per blow, no stacking. Declare-first: the defender's held dice
 *            cover the bonus-carrying blow first, then the leading dice (manual
 *            reassignment is a later enhancement).
 *   Breakage when the parrying weapon is BREAKAGE_CLASS_GAP+ classes lighter
 *            than the attacking weapon AND the attacker's UNMODIFIED 2d6 equals
 *            the to-hit number exactly, the parrying weapon shatters. The -2
 *            still applies; the weapon is simply gone afterwards.
 *
 * OFFENSIVE HALF (slice first-blow-ordering): resolveExchange now decides who
 * strikes first (firstStriker), applies the kill gate (a first strike whose
 * cumulative damage meets the laggard's current hp cancels the return blow), the
 * 4d first-blow approximation (the lighter weapon becomes the first striker, no
 * per-blow interleave), and the broken-weapon gate (a parry weapon that shatters
 * gives no riposte). NOTE on the counter: a combatant attacks AND wards each
 * round (the pool splits into thrown swings and held parries), so the counter
 * (the laggard's pool) always fires unless killed / reared / broken. RAW 4b
 * "no counter after a parry" is honored ECONOMICALLY, not as a suppression: a
 * parry costs a held die, and held dice come out of the same pool as thrown
 * (attack) dice (thrown = pool - held), so warding already shrinks the counter.
 * 4c "counter on a successful parry" then needs no special case.
 *
 * Facing (slice token-facing): LEFT_FLANK is RAW's left/shield-side rule —
 * the flanked man takes 2nd-blow position on round 1 with parry and counter
 * intact. RIGHT_FLANK plays as front (no RAW penalty; distinct id kept for
 * display and geometry). Legacy "flank" normalizes to LEFT_FLANK. REAR is
 * unchanged: +1 per die, no parry, no counter on round 1. Geometry that
 * derives these ids from token positions lives in rules/facing.mjs.
 */

import { toHit, WEAPON_CLASS, missileKill, missileBand, missileRange } from "./tables.mjs";
import { roll2d6, rollDie, mulberry32, forceDice } from "./dice.mjs";
import { mountedDieBonus, unhorseStun } from "./mounted-combat.mjs";

/** Class gap (attacker heavier than parry weapon) at which breakage is possible. */
export const BREAKAGE_CLASS_GAP = 4;

/** Attack facing — the man-to-man flank/rear rules in pool currency.
 *  LEFT_FLANK is the shield side: RAW puts the flanked man at 2nd-blow
 *  position on round 1 (resolveExchange), with his parry intact. RIGHT_FLANK
 *  is the sword-arm side — RAW names no penalty, so it plays as front (kept
 *  as its own id for display and for the geometry layer). FLANK survives as a
 *  legacy alias that normalizes to LEFT_FLANK. */
export const Facing = Object.freeze({
  FRONT: "front",
  LEFT_FLANK: "leftFlank",   // shield side: 2nd-blow position round 1, parry intact
  RIGHT_FLANK: "rightFlank", // sword-arm side: no penalty (front-equivalent)
  FLANK: "flank",            // legacy alias -> LEFT_FLANK
  REAR: "rear"               // +1 to every die, no parry, no counter (at exchange level)
});

/** Collapse legacy/unknown facing values to a canonical id. */
export function normalizeFacing(facing) {
  if (facing === Facing.FLANK) return Facing.LEFT_FLANK;
  if (facing === Facing.LEFT_FLANK || facing === Facing.RIGHT_FLANK || facing === Facing.REAR) return facing;
  return Facing.FRONT;
}

/** Plain-text caption labels for non-front facings. */
const FACING_CAPTION = Object.freeze({
  [Facing.LEFT_FLANK]: "left flank",
  [Facing.RIGHT_FLANK]: "right flank",
  [Facing.REAR]: "rear"
});

/** Per-die to-hit bonus a facing confers (rear: +1 to each blow). */
function facingBonus(facing) {
  return facing === Facing.REAR ? 1 : 0;
}

/** Whether the defender may parry against this facing. Slice flank-fix: only
 *  the rear denies the parry now — a flanked man is out of position, not
 *  disarmed. His RAW penalty (2nd-blow position) lives in resolveExchange. */
function facingAllowsParry(facing) {
  return facing !== Facing.REAR;
}

/** Class gap at/above which the defender's parry weapon is too HEAVY (slow) to
 *  catch the faster attacking weapon — RAW 4a, the parry simply doesn't exist.
 *  gap = parryWeaponClass - attackerWeaponClass. */
export const NO_PARRY_CLASS_GAP = 2;

/** Class gap at/below which the parry weapon is so much LIGHTER than the
 *  attacker's that it parries at only -1 — RAW 4d. (Negative: parry weapon is
 *  8+ classes under the attacker.) */
export const LIGHT_PARRY_CLASS_GAP = -8;

/**
 * RAW man-to-man parry penalty for a held die, by the class relationship of the
 * defender's parry weapon to the attacker's weapon (bands 4a/4b/4c/4d):
 *
 *   gap >= +2 (4a)   -> 0  no parry exists (too heavy to catch the faster blow)
 *   -7 .. +1 (4b/4c) -> 2  the standard parry
 *   gap <= -8 (4d)   -> 1  the lightest weapons parry at -1
 *
 * where gap = parryWeaponClass - attackerWeaponClass. A null parry weapon
 * (nothing to parry with) yields 0. The 4c counter-blow and the 4c/4d first-blow
 * order are the offensive half and live above this single-sided pool.
 */
export function parryPenalty(attackerClass, parryClass) {
  if (parryClass == null) return 0;
  const gap = parryClass - attackerClass;
  if (gap >= NO_PARRY_CLASS_GAP) return 0;     // 4a — no parry
  if (gap <= LIGHT_PARRY_CLASS_GAP) return 1;  // 4d — light parry
  return 2;                                    // 4b / 4c — standard
}

/** Class gaps (attacker LIGHTER than the defender's weapon) granting extra
 *  attack dice — the man-to-man multiple-blows rule (2 blows at 4 classes
 *  lower, 3 at 8) re-expressed in pool currency: +1 die, +2 dice. */
export const SPEED_CLASS_GAP = 4;
export const SPEED_CLASS_GAP_2 = 8;

/**
 * Extra attack dice for a lighter weapon against a heavier one.
 * @param {number} attackerClass
 * @param {number|null} defenderClass  null when the defender's weapon is unknown
 */
export function speedDice(attackerClass, defenderClass) {
  if (defenderClass == null) return 0;
  const gap = defenderClass - attackerClass;
  if (gap >= SPEED_CLASS_GAP_2) return 2;
  if (gap >= SPEED_CLASS_GAP) return 1;
  return 0;
}

/** What it takes to harm a target at all. */
export const HitOnlyBy = Object.freeze({
  ANY: "any",
  SILVER: "silver", // silver OR magical
  MAGIC: "magic"    // magical only
});

/**
 * Can this attack harm the target at all?
 * @param {{magical?:boolean, silver?:boolean}} attacker
 * @param {{hitOnlyBy?:string}} target
 */
export function canHarm(attacker, target) {
  const gate = target?.hitOnlyBy ?? HitOnlyBy.ANY;
  if (gate === HitOnlyBy.MAGIC) return !!attacker?.magical;
  if (gate === HitOnlyBy.SILVER) return !!attacker?.magical || !!attacker?.silver;
  return true;
}

/**
 * Resolve one attacker's pool of dice against a single defender.
 *
 * @param {object} contest
 * @param {object} contest.attacker
 *   { name?, weaponId, dice, bonus=0, bonusDie=0, damageBonus=0, magical=false,
 *     silver=false, facing="front", profileAttack=false } — profileAttack uses
 *     weaponId only for the armor curve; it gains no weapon-speed dice and can
 *     be parried at the standard -2 without risking weapon breakage. Facing
 *     flank/rear suppresses the
 *     defender's parries; rear also adds +1 to every die (the man-to-man
 *     rear/flank rules). "No counter on rear" is enforced by resolveExchange,
 *     not here. damageBonus is added to each hit's 1d6.
 * @param {object} contest.target
 *   { name?, ac, held=0, parryWeaponId=null, hitOnlyBy="any", damageHalved=false }
 *   damageHalved floors each blow's hit points (small-target dwarf).
 * @param {() => number} [rng=Math.random]
 * @returns {object} per-die detail plus totals
 */
export function resolveAttackPool({ attacker, target }, rng = Math.random) {
  if (!attacker || !attacker.weaponId) {
    throw new TypeError("resolveAttackPool: attacker.weaponId is required");
  }
  if (!target || !Number.isFinite(target.ac)) {
    throw new TypeError("resolveAttackPool: target.ac is required");
  }

  const facing = normalizeFacing(attacker.facing ?? Facing.FRONT);
  const number = toHit(attacker.weaponId, target.ac);
  const atkClass = WEAPON_CLASS[attacker.weaponId];
  const profileAttack = !!attacker.profileAttack;

  // Immunity gate — the Fantasy Combat Table's surviving role. No dice are
  // rolled and no parries are spent against an attack that cannot harm.
  if (!canHarm(attacker, target)) {
    const tName = target.name ?? "target";
    return {
      attacker: { name: attacker.name ?? attacker.weaponId, weaponId: attacker.weaponId, class: atkClass, profileAttack },
      target: { name: tName, ac: target.ac, parryWeaponId: target.parryWeaponId ?? null, hitOnlyBy: target.hitOnlyBy },
      toHitNumber: number,
      immune: true,
      speedDice: 0,
      dice: [],
      hits: 0,
      damage: 0,
      parries: 0,
      parryWeaponBroke: false,
      caption: `no effect — ${tName} cannot be harmed by this weapon`
    };
  }
  const parryClass = target.parryWeaponId != null ? WEAPON_CLASS[target.parryWeaponId] : null;
  // A Monster Attack Profile borrows Pole Arm only for its armor-sensitive
  // to-hit row. It is not literally a class-9 weapon, so it neither shatters a
  // parrying weapon nor participates in weapon-speed multiple blows.
  const breakageEligible = !profileAttack && parryClass != null && atkClass - parryClass >= BREAKAGE_CLASS_GAP;
  // Profile attacks use a standard -2 parry whenever the defender has a melee
  // weapon. Ordinary weapons retain the full 4a/4d class-banded procedure.
  const parryMinus = profileAttack ? (parryClass == null ? 0 : 2) : parryPenalty(atkClass, parryClass);

  const base = Math.max(0, Math.trunc(attacker.dice) || 0);
  // A lighter WEAPON strikes more blows. Creature attack profiles do not gain
  // extra dice from the hidden Pole Arm proxy.
  const speed = profileAttack ? 0 : (base > 0 ? speedDice(atkClass, parryClass) : 0);
  const n = base + speed;
  // Flank/rear catch the defender turned, and 4a leaves the parry weapon too
  // heavy to catch the blow: in either case no parry dice apply.
  const held = (facingAllowsParry(facing) && parryMinus > 0)
    ? Math.min(Math.max(0, Math.trunc(target.held) || 0), n)
    : 0;
  const bonus = Math.trunc(attacker.bonus) || 0;
  const bonusDie = Math.trunc(attacker.bonusDie) || 0;
  // Per-die damage augmentation (elf magic-weapon pip) and the defender's
  // hit-point halving (small dwarf vs a clumsy giant). Both are plain values.
  const damageBonus = Math.max(0, Math.trunc(attacker.damageBonus) || 0);
  // Per-hit damage dice (a Monster Attack Profile may strike for 2d6, 3d6...) and a
  // flat per-hit add (a creature's innate +N, e.g. Ogre 1d6+2). Default 1d6 + 0,
  // so weapons and characters are unchanged.
  const damageDice = Number.isInteger(attacker.damageDice) ? attacker.damageDice : 1;
  const damageFlat = Math.trunc(attacker.damageFlat) || 0;
  const damageHalved = !!target.damageHalved;
  // Rear attacks add +1 to EVERY blow (applied below, not via bonusDie), and
  // the mounted/afoot relationship rides the same per-die channel: +1 for a
  // horseman on a footman (+2 charging), -1 for a footman on a horseman.
  // A declared unhorsing attempt waives the footman's -1 (RAW: "no
  // subtraction for their being afoot") — its score must still equal a kill.
  const attackerMounted = !!attacker.mounted;
  const defenderMounted = !!target.mounted;
  const unhorsing = !!attacker.unhorse && !attackerMounted && defenderMounted;
  const mountedMod = unhorsing
    ? 0
    : mountedDieBonus({ attackerMounted, defenderMounted, charge: !!attacker.charge });
  const perDie = facingBonus(facing) + mountedMod;

  const dice = [];
  let hits = 0;
  let damage = 0;
  let parryWeaponBroke = false;
  let unhorsed = false;

  // Parry assignment: the defender's guards cover the bonus-carrying blow
  // first, then the leading dice. (Manual assignment is a later enhancement.)
  const parrySet = new Set();
  if (held > 0) {
    const order = bonus > 0 && bonusDie >= 0 && bonusDie < n ? [bonusDie] : [];
    for (let i = 0; i < n; i++) if (!order.includes(i)) order.push(i);
    for (let i = 0; i < held; i++) parrySet.add(order[i]);
  }

  for (let i = 0; i < n; i++) {
    const r = roll2d6(rng);
    const raw = r.total; // unmodified 2d6 — what breakage keys on
    const dieBonus = (i === bonusDie ? bonus : 0) + perDie;
    const parried = parrySet.has(i);
    const effective = raw + dieBonus - (parried ? parryMinus : 0);
    const hit = effective >= number;
    const broke = parried && breakageEligible && raw === number;
    if (broke) parryWeaponBroke = true;

    let dmg = 0;
    if (hit) {
      if (unhorsing) {
        // The score that would kill instead throws the rider down. No damage;
        // one success suffices, further hits change nothing.
        unhorsed = true;
        hits++;
      } else {
        dmg = damageBonus + damageFlat;              // pips: elf magic + a creature's innate +N
        for (let d = 0; d < damageDice; d++) dmg += rollDie(rng);  // 1d6 default; 2d6+ for big naturals
        if (damageHalved) dmg = Math.floor(dmg / 2); // clumsy giant scores half HP on a dwarf
        damage += dmg;
        hits++;
      }
    }

    dice.push({ index: i, roll: r.dice, raw, bonus: dieBonus, parried, effective, hit, damage: dmg, broke, speed: i >= base });
  }

  // The spill: an unhorsed rider dices for his landing (1-2 fine, 3-5 stunned
  // one turn, 6 stunned three). Rolled here so the card can tell the story.
  const stunRoll = unhorsed ? rollDie(rng) : null;

  return {
    attacker: { name: attacker.name ?? attacker.weaponId, weaponId: attacker.weaponId, class: atkClass, facing, damageBonus, profileAttack },
    target: { name: target.name ?? "target", ac: target.ac, parryWeaponId: target.parryWeaponId ?? null, damageHalved },
    toHitNumber: number,
    immune: false,
    facing,
    mountedMod,
    attackerMounted,
    defenderMounted,
    unhorseAttempt: unhorsing,
    unhorsed,
    unhorseStunRoll: stunRoll,
    unhorseStunTurns: unhorsed ? unhorseStun(stunRoll) : null,
    speedDice: speed,
    dice,
    hits,
    damage,
    parries: held,
    parryWeaponBroke,
    caption: unhorsing
      ? (unhorsed ? `unhorsed! · stun d6 ${stunRoll}` : `unhorsing attempt fails`)
      : `${hits} hit${hits === 1 ? "" : "s"} · ${damage} damage${facing !== Facing.FRONT ? ` (${FACING_CAPTION[facing] ?? facing})` : ""}`
  };
}

/** Round-1 first blow: a weapon this many classes HIGHER than the opponent's
 *  seizes the first blow by reach (RAW round-1 "defender 2 classes higher"). */
export const REACH_FIRST_BLOW_GAP = 2;

/** Round-1 first blow: a weapon this many classes LOWER gets inside and seizes
 *  the first blow (RAW 4d; negative). Approximated as a side-level first-striker
 *  flip, not the literal per-blow interleave. */
export const INSIDE_FIRST_BLOW_GAP = -8;

/** Round-2+ takeover: once engaged, a weapon this many classes LOWER than the
 *  opponent's seizes initiative (RAW round-2 "opponent's weapon 2 classes
 *  lower") — the fast weapon, now inside, leads every round after the first. */
export const LIGHTER_TAKEOVER_GAP = 2;

/** Reach weapons whose charge takes the first blow over any lower-class weapon
 *  (RAW 4d charge parenthetical). */
const REACH_WEAPONS = Object.freeze(["pike", "spear", "lance"]);

/** Whether a weapon id is a charge reach weapon (pike/spear/lance). */
export function isReachWeapon(weaponId) {
  return REACH_WEAPONS.includes(weaponId);
}

/**
 * Who strikes first this round — roleless: the acting token is `first`, the
 * de-facto attacker. FRONT engagements only; rear and flank are decided by
 * resolveExchange (rear: first strikes, no return; flank: the flanked side
 * stays at 2nd-blow position, i.e. first leads, no swap). Pure, so it self-tests.
 *
 * Round 1:
 *   - charge with a reach weapon (pike/spear/lance) over a LOWER weapon -> first
 *     (the charge clause: reach on the approach denies the lighter weapon its
 *      inside first blow)
 *   - else the OTHER side strikes first when its weapon is 2+ classes HIGHER
 *     (reach) OR 8+ classes LOWER (4d, getting inside)
 *   - else a from-above other side strikes first (terrain)
 *   - else the acting token (first)
 *
 * Round 2+ (the lighter weapon takes over):
 *   - a side reared last round stays at 2nd-blow position (the other leads)
 *   - else a from-above side leads
 *   - else whoever's weapon is 2+ classes LIGHTER than the other leads
 *   - else whoever struck first last round keeps it (prevFirst; default first)
 *
 * @param {object} p
 * @param {{weaponId:string, fromAbove?:boolean, rearedLastRound?:boolean}} p.first
 * @param {{weaponId:string, fromAbove?:boolean, rearedLastRound?:boolean}} p.second
 * @param {number} [p.round=1]
 * @param {boolean} [p.charge=false]   first is charging this round
 * @param {('first'|'second'|null)} [p.prevFirst=null]  who struck first last round
 * @returns {'first'|'second'}
 */
export function firstStriker({ first, second, round = 1, charge = false, prevFirst = null }) {
  const fc = WEAPON_CLASS[first.weaponId];
  const sc = WEAPON_CLASS[second.weaponId];
  const gap = sc - fc; // second's weapon class relative to first's

  if (round <= 1) {
    // Charge: first's reach weapon over a lower-class second takes the first
    // blow, cancelling second's inside (4d) steal.
    if (charge && isReachWeapon(first.weaponId) && gap < 0) return "first";
    // Second seizes the first blow at either extreme of the gap: 2+ higher
    // (reach) or 8+ lower (inside, 4d).
    if (gap >= REACH_FIRST_BLOW_GAP || gap <= INSIDE_FIRST_BLOW_GAP) return "second";
    // Terrain: a from-above second leads; a from-above first keeps the default.
    if (second.fromAbove && !first.fromAbove) return "second";
    return "first";
  }

  // Round 2+.
  if (first.rearedLastRound && !second.rearedLastRound) return "second";
  if (second.rearedLastRound && !first.rearedLastRound) return "first";
  if (second.fromAbove && !first.fromAbove) return "second";
  if (first.fromAbove && !second.fromAbove) return "first";
  // The lighter (lower-class) weapon takes over once engaged.
  if (sc - fc >= LIGHTER_TAKEOVER_GAP) return "first";   // first is 2+ classes lighter
  if (fc - sc >= LIGHTER_TAKEOVER_GAP) return "second";  // second is 2+ classes lighter
  return prevFirst === "second" ? "second" : "first";
}

/** Build the resolveAttackPool args for `atk` striking `def` at `facing`. */
function poolArgs(atk, def, facing) {
  return {
    attacker: {
      name: atk.name, weaponId: atk.weaponId, dice: atk.thrown, bonus: atk.bonus, bonusDie: atk.bonusDie, magical: atk.magical, silver: atk.silver, facing,
      profileAttack: atk.profileAttack, damageDice: atk.damageDice, damageFlat: atk.damageFlat, damageBonus: atk.damageBonus
    },
    target: { name: def.name, ac: def.ac, held: def.held, parryWeaponId: def.parryWeaponId, hitOnlyBy: def.hitOnlyBy, damageHalved: def.damageHalved }
  };
}

/**
 * Resolve a full two-side exchange in initiative order. Each combatant throws
 * its `thrown` dice and wards with its `held` dice (from the stance split):
 *   { name, weaponId, ac, parryWeaponId, thrown, held, hp?, fromAbove?,
 *     rearedLastRound?, bonus?, bonusDie?, magical?, silver?, hitOnlyBy?,
 *     facing? }
 *
 * `first` is the acting token. `facing` is first's facing on second. Order of
 * play: pick the first striker (firstStriker, FRONT only), resolve its pool,
 * then — unless it killed the laggard (cumulative damage >= current hp), the
 * laggard's parry weapon shattered, or it was a rear attack — resolve the
 * laggard's return pool. hp omitted => never killed.
 *
 * @param {object} bout { first, second, round=1, charge=false, prevFirst=null }
 * @returns {{striker:('first'|'second'), firstStrike:object,
 *            counter:(object|null), killed:boolean, brokeOut:boolean}}
 */
export function resolveExchange({ first, second, round = 1, charge = false, prevFirst = null }, rng = Math.random) {
  const facing = normalizeFacing(first.facing ?? Facing.FRONT);

  // Rear: the acting token strikes from behind — it strikes, the target gives
  // no return this round (man-to-man rear rule).
  if (facing === Facing.REAR) {
    const firstStrike = resolveAttackPool(poolArgs(first, second, Facing.REAR), rng);
    return { striker: "first", firstStrike, counter: null, killed: false, brokeOut: false };
  }

  // FRONT and RIGHT_FLANK decide initiative by class / charge / terrain /
  // round — the sword-arm side carries no RAW penalty. LEFT_FLANK is the
  // shield side: the flanked man is at 2nd-blow position on round 1 (first
  // leads, class-gap steals do not apply), his parry and counter intact.
  // Round 2+ he has turned to face, so normal initiative resumes.
  const striker = (facing === Facing.LEFT_FLANK && round <= 1)
    ? "first"
    : firstStriker({ first, second, round, charge, prevFirst });

  const lead = striker === "first" ? first : second; // strikes first
  const lag  = striker === "first" ? second : first; // strikes second

  const firstStrike = resolveAttackPool(poolArgs(lead, lag, lead.facing ?? facing), rng);

  // Kill gate: a first strike whose cumulative damage meets the laggard's
  // current hp ends it — no return blow ("a return blow only if he fails to
  // kill"). Broken-weapon gate: a parry weapon shattered by the first strike
  // cannot riposte (a broken weapon is no attack — RULES-CALL, Kurt).
  const lagHp = Number.isFinite(lag.hp) ? lag.hp : Infinity;
  const killed = firstStrike.damage >= lagHp;
  const brokeOut = !!firstStrike.parryWeaponBroke;
  if (killed || brokeOut) {
    return { striker, firstStrike, counter: null, killed, brokeOut };
  }

  const counter = resolveAttackPool(poolArgs(lag, lead, lag.facing ?? Facing.FRONT), rng);
  return { striker, firstStrike, counter, killed: false, brokeOut: false };
}
/* ------------------------------------------------------------------ *
 *  Missile fire — Individual Fires off the shared table (tables.mjs).
 *  A volley is N shots (the man-count pool); each is a 2d6 meet-or-beat on
 *  the missile row by defender AC and range third. A kill downgrades to a
 *  hit (1d6 off the pool), as in melee. No parry, no speed dice, no
 *  breakage — the rate-of-fire ladder is the missile "multiplier" and lives
 *  in missileShots; cover is a flat minus to each roll.
 * ------------------------------------------------------------------ */

/** Rate-of-fire weapon classes. Sling fires as a bow; thrown is once-per-turn. */
export const FireClass = Object.freeze({
  BOW: "bow",                       // short, horse, long, composite, sling
  LIGHT_CROSSBOW: "lightcrossbow",
  HEAVY_CROSSBOW: "heavycrossbow",
  THROWN: "thrown"                  // axes, spears, javelins
});

/** Movement spent this turn — gates the shot count. */
export const Move = Object.freeze({ NONE: "none", HALF: "half", OVER: "over" });

// Drag-distance band for the move veto and the colored drag ruler. LEGAL up to
// the normal allowance, CHARGE between normal and the charge maximum (legal only
// when a charge is declared), ILLEGAL beyond. See moveBand.
export const MoveBand = Object.freeze({ LEGAL: "legal", CHARGE: "charge", ILLEGAL: "illegal" });

/**
 * Shots a figure looses this turn — the Chainmail rate-of-fire ladder over the
 * man-count base. Bows fire twice when stationary and unmeleed, otherwise once.
 * Light crossbows fire every turn but never double. Heavy crossbows fire every
 * other turn (the caller tracks `loaded`). Thrown weapons fire once per turn. A
 * fantastic-type target clamps the whole volley to a single shot.
 *
 * The moved-over-½ permission (Rate of Fire, p.11) is NOT decided here: it needs
 * the target and an opposed die, so it lives in overHalfFireGate(), rolled at
 * fire time. This function reports only the potential rate; any movement past
 * NONE simply forfeits the bow's stationary double.
 *
 * Charging is the one hard stop here: the rate-of-fire ladder is "excluding
 * charging" throughout (p.11), so a charging figure cannot loose a bow or
 * crossbow at all. Only thrown weapons (axes, spears, javelins) may be cast
 * while charging.
 *
 * @param {number} base  the man-count / HD attack pool (1 per man)
 * @param {object} [opts]
 * @returns {number} shots this turn
 */
export function missileShots(base, {
  kind = FireClass.BOW,
  moved = Move.NONE,
  meleed = false,
  loaded = true,
  charging = false,
  targetFantastic = false
} = {}) {
  const b = Math.max(0, Math.trunc(base) || 0);

  // A charging bow/crossbow figure does not fire — only thrown weapons may be
  // cast while charging (Chainmail p.11, "excluding charging").
  if (charging && kind !== FireClass.THROWN) return 0;

  let shots;
  switch (kind) {
    case FireClass.HEAVY_CROSSBOW:
      shots = loaded ? b : 0;                         // every other turn
      break;
    case FireClass.THROWN:
      shots = b;                                      // once per turn, no double
      break;
    case FireClass.LIGHT_CROSSBOW:
      shots = b;                                      // every turn, no double
      break;
    default: // bow / sling
      shots = (moved === Move.NONE && !meleed) ? b * 2 : b;
      break;
  }
  if (targetFantastic) shots = Math.min(shots, 1);
  return shots;
}

/**
 * The moved-over-½ fire gate (Chainmail Rate of Fire, p.11). A bow or crossbow
 * that moved MORE than half its move this turn may loose only if it beats the
 * target's opposed die (strictly greater; a tie fails). This concerns NON-charge
 * movement only — a charging figure cannot fire a bow/crossbow at all and is
 * stopped upstream in missileShots (returns 0), so it never reaches the gate.
 * Thrown weapons fire on their own once-per-turn rule and are exempt here — they
 * never roll. Returns null when the gate does not apply, else the opposed pair
 * and whether the shot cleared. Rolls the shooter die first, the foe die second.
 *
 * @param {object} [opts]
 * @param {string} [opts.kind=FireClass.BOW]
 * @param {string} [opts.moved=Move.NONE]
 * @param {function} [rng=Math.random]
 * @returns {?{fireDie:number, foeDie:number, beat:boolean}}
 */
export function overHalfFireGate({ kind = FireClass.BOW, moved = Move.NONE } = {}, rng = Math.random) {
  if (kind === FireClass.THROWN) return null;
  if (moved !== Move.OVER) return null;
  const fireDie = rollDie(rng);
  const foeDie = rollDie(rng);
  return { fireDie, foeDie, beat: fireDie > foeDie };
}

/**
 * Bucket a turn's movement against the figure's move allowance, both in OD&D
 * inches (Book III: 1" = 10 ft underground, 10 yd outdoors). "Up to one-half"
 * fires once normally; "over one-half" trips the opposed gate — so exactly half
 * is still HALF. Zero (within an epsilon) is NONE.
 *
 * @param {number} inchesMoved      distance moved this turn, in inches
 * @param {number} allowanceInches  the figure's move allowance, in inches
 * @returns {string} a Move value
 */
export function classifyMove(inchesMoved, allowanceInches) {
  if (!(inchesMoved > 0.001)) return Move.NONE;
  const half = (Number(allowanceInches) || 0) / 2;
  return inchesMoved > half ? Move.OVER : Move.HALF;
}

/**
 * Band a moved distance for the drag indicator / move veto. At or under the
 * normal allowance is a LEGAL move; past it up to the charge maximum is CHARGE
 * distance (reachable only when charging is declared); beyond the charge maximum
 * is ILLEGAL. chargeMax is floored at normalMax, so a figure with no charge
 * bonus (chargeMax 0 or == move — wights, treants) never yields a CHARGE band:
 * legal up to the allowance, then straight to illegal. Pure.
 * @param {number} inches     distance moved, in inches
 * @param {number} normalMax  normal move allowance, in inches
 * @param {number} chargeMax  max charge distance, in inches (<= normal = none)
 * @returns {string} a MoveBand value
 */
export function moveBand(inches, normalMax, chargeMax) {
  const n = Number(normalMax) || 0;
  const c = Math.max(Number(chargeMax) || 0, n);
  if (!(inches > n + 1e-6)) return MoveBand.LEGAL;
  if (!(inches > c + 1e-6)) return MoveBand.CHARGE;
  return MoveBand.ILLEGAL;
}

/**
 * The rate-of-fire class for a missile weapon row, for missileShots. Thrown
 * weapons fire on the short-bow row but use the THROWN cadence; sling and all
 * bows are BOW. The arquebus has no rate-of-fire line in the rules in hand, so
 * it's treated as LIGHT_CROSSBOW (once per turn, no double) pending its own RAW.
 * @param {string} missileId  a MISSILE_KILL key or alias ("sling")
 * @param {{thrown?:boolean}} [opts]
 * @returns {string|null} a FireClass, or null if the id isn't a missile row
 */
export function fireClassFor(missileId, { thrown = false } = {}) {
  if (thrown) return FireClass.THROWN;
  switch (missileId) {
    case "lightcrossbow": return FireClass.LIGHT_CROSSBOW;
    case "heavycrossbow": return FireClass.HEAVY_CROSSBOW;
    case "arquebus":      return FireClass.LIGHT_CROSSBOW; // placeholder — see note
    case "shortbow":
    case "horsebow":
    case "longbow":
    case "compositebow":
    case "sling":
      return FireClass.BOW;
    default: return null;
  }
}

/**
 * Resolve a missile volley against a single target.
 *
 * @param {object} contest
 * @param {object} contest.attacker
 *   { name?, weaponId, shots, fireBonus=0, magical=false, silver=false }
 *   weaponId is a missile row (or alias, e.g. "sling"); fireBonus is the heavy
 *   crossbow's +1; shots is the rate-of-fire result (see missileShots).
 * @param {object} contest.target
 *   { name?, ac, distance, range?, cover=0, hitOnlyBy="any" }
 *   range defaults to the weapon's max; cover subtracts from each roll.
 * @param {() => number} [rng=Math.random]
 * @returns {object} per-shot detail plus totals
 */
export function resolveVolley({ attacker, target }, rng = Math.random) {
  if (!attacker || !attacker.weaponId) {
    throw new TypeError("resolveVolley: attacker.weaponId is required");
  }
  if (!target || !Number.isFinite(target.ac)) {
    throw new TypeError("resolveVolley: target.ac is required");
  }

  const weaponId = attacker.weaponId;
  const range = Number.isFinite(target.range) ? target.range : missileRange(weaponId);
  const distance = Number.isFinite(target.distance) ? target.distance : 0;
  const band = missileBand(distance, range);
  const shots = Math.max(0, Math.trunc(attacker.shots) || 0);
  const cover = Math.max(0, Math.trunc(target.cover) || 0);
  const fireBonus = Math.trunc(attacker.fireBonus) || 0;
  const damageBonus = Math.max(0, Math.trunc(attacker.damageBonus) || 0);
  // Per-hit damage dice (count of d6) and a flat per-hit add. The projectile
  // carries these — arrows/bolts/stones are 1d6, a giant's boulder 2d6. Default
  // 1d6 + 0 leaves every existing missile unchanged.
  const damageDice = Number.isInteger(attacker.damageDice) ? attacker.damageDice : 1;
  const damageFlat = Math.trunc(attacker.damageFlat) || 0;
  const damageHalved = !!target.damageHalved;
  const tName = target.name ?? "target";
  const aName = attacker.name ?? weaponId;

  const head = {
    attacker: { name: aName, weaponId, weaponName: attacker.weaponName ?? weaponId, damageBonus, damageDice, damageFlat },
    target: { name: tName, ac: target.ac, distance, range, cover, hitOnlyBy: target.hitOnlyBy ?? HitOnlyBy.ANY, damageHalved },
    shots,
    band,
    toKillNumber: null,
    immune: false,
    outOfRange: false,
    cannotKill: false,
    dice: [],
    hits: 0,
    damage: 0
  };

  // Out of range — nothing reaches.
  if (band === null) {
    return { ...head, outOfRange: true, caption: `out of range (${distance} > ${range})` };
  }
  // Immunity gate — same as melee; a magic or silver missile can pass it.
  if (!canHarm(attacker, target)) {
    return { ...head, immune: true, caption: `no effect — ${tName} cannot be harmed by this weapon` };
  }
  const number = missileKill(weaponId, target.ac, band);
  // The table's "/" — at this band the weapon cannot kill this armor.
  if (number === null) {
    return { ...head, cannotKill: true, caption: `cannot kill AC ${target.ac} at ${band} range` };
  }

  const dice = [];
  let hits = 0;
  let damage = 0;
  for (let i = 0; i < shots; i++) {
    const r = roll2d6(rng);
    const raw = r.total;
    const effective = raw + fireBonus - cover;
    const hit = effective >= number;
    let dmg = 0;
    if (hit) {
      dmg = damageBonus + damageFlat;
      for (let d = 0; d < damageDice; d++) dmg += rollDie(rng);
      if (damageHalved) dmg = Math.floor(dmg / 2);
      damage += dmg; hits++;
    }
    dice.push({ index: i, roll: r.dice, raw, bonus: fireBonus, cover, effective, hit, damage: dmg });
  }

  return {
    ...head,
    toKillNumber: number,
    dice,
    hits,
    damage,
    caption: `${band} range · ${hits} hit${hits === 1 ? "" : "s"} · ${damage} damage`
  };
}

/* ------------------------------------------------------------------ *
 *  Self-tests — Node only (`node module/rules/combat-engine.mjs`).
 * ------------------------------------------------------------------ */
function runSelfTests() {
  let pass = 0;
  const ok = (cond, label) => {
    if (!cond) throw new Error(`FAIL: ${label}`);
    pass++;
  };

  // resolveExchange passes a creature's attack profile through (Ogre 1d6+2 natural attack).
  {
    const ogre = { name: "Ogre", weaponId: "polearm", ac: 5, parryWeaponId: null, thrown: 1, held: 0, profileAttack: true, damageDice: 1, damageFlat: 2 };
    const man = { name: "Man", weaponId: "sword", ac: 4, parryWeaponId: "sword", thrown: 1, held: 0 };
    const ex = resolveExchange({ first: ogre, second: man }, forceDice([6, 6, 1, 1, 1]));
    ok(ex.firstStrike.attacker.profileAttack === true && ex.firstStrike.speedDice === 0, "exchange keeps profileAttack (no speed dice)");
    ok(ex.firstStrike.damage === 3, "exchange keeps damageFlat: 1d6 (1) + 2 = 3");
  }

  // T1: plain hit + miss. sword vs AC6 -> 9. die0 [6,4]=10 hit (dmg 5); die1 [3,3]=6 miss.
  {
    const rng = forceDice([6, 4, 5, 3, 3]);
    const r = resolveAttackPool({ attacker: { weaponId: "sword", dice: 2 }, target: { ac: 6 } }, rng);
    ok(r.toHitNumber === 9, "T1 number 9");
    ok(r.hits === 1 && r.damage === 5, "T1 one hit for 5");
    ok(r.dice[0].hit && !r.dice[1].hit, "T1 die outcomes");
  }

  // T2: parry turns a hit into a miss; light parry weapon but gap < 4, no break.
  // sword(4) vs AC6 -> 9. dagger(1) parry, gap 3. raw [5,5]=10 -> 10-2=8 < 9 miss.
  {
    const rng = forceDice([5, 5]);
    const r = resolveAttackPool(
      { attacker: { weaponId: "sword", dice: 1 }, target: { ac: 6, held: 1, parryWeaponId: "dagger" } },
      rng
    );
    ok(r.hits === 0 && r.parries === 1, "T2 parry saves");
    ok(!r.parryWeaponBroke, "T2 no break (gap 3)");
  }

  // T3: breakage. battleaxe(5) vs AC6 -> 8. dagger(1) parry, gap 4. raw [4,4]=8 == number.
  // 8-2=6 < 8 miss, but unmodified 8 == 8 -> shatter.
  {
    const rng = forceDice([4, 4]);
    const r = resolveAttackPool(
      { attacker: { weaponId: "battleaxe", dice: 1 }, target: { ac: 6, held: 1, parryWeaponId: "dagger" } },
      rng
    );
    ok(!r.dice[0].hit, "T3 blow misses after parry");
    ok(r.dice[0].broke && r.parryWeaponBroke, "T3 dagger shatters on exact roll");
  }

  // T4: breakage needs the exact number. battleaxe(5) vs AC6 -> 8. raw [5,5]=10.
  // 10-2=8 >= 8 -> hit; raw 10 != 8 -> no break.
  {
    const rng = forceDice([5, 5, 4]);
    const r = resolveAttackPool(
      { attacker: { weaponId: "battleaxe", dice: 1 }, target: { ac: 6, held: 1, parryWeaponId: "dagger" } },
      rng
    );
    ok(r.hits === 1 && r.damage === 4, "T4 parry fails to stop it");
    ok(!r.parryWeaponBroke, "T4 no break without exact roll");
  }

  // T5: monster +X rides one die. sword vs AC9 -> 7, bonus 3 on die0.
  // die0 [2,3]=5 (+3 =8) hit; die1 [3,3]=6 miss; die2 [4,4]=8 hit.
  {
    const rng = forceDice([2, 3, 6, 3, 3, 4, 4, 2]);
    const r = resolveAttackPool(
      { attacker: { weaponId: "sword", dice: 3, bonus: 3, bonusDie: 0 }, target: { ac: 9 } },
      rng
    );
    ok(r.dice[0].bonus === 3 && r.dice[1].bonus === 0, "T5 bonus rides one die");
    ok(r.dice[0].hit, "T5 bonus pushes die0 to a hit");
    ok(r.hits === 2 && r.damage === 8, "T5 two hits for 8");
  }

  // T6: empty pool.
  {
    const r = resolveAttackPool({ attacker: { weaponId: "sword", dice: 0 }, target: { ac: 5 } }, mulberry32(1));
    ok(r.hits === 0 && r.dice.length === 0, "T6 no dice, no hits");
  }

  // T7: held cannot exceed dice thrown.
  {
    const r = resolveAttackPool(
      { attacker: { weaponId: "mace", dice: 2 }, target: { ac: 5, held: 9, parryWeaponId: "mace" } },
      mulberry32(3)
    );
    ok(r.parries === 2, "T7 parries clamp to dice thrown");
  }

  // T7b: a Monster Attack Profile uses Pole Arm only as an armor curve. A
  // dagger parries at the standard -2, does not shatter on an exact to-hit
  // roll, and the profile gains no weapon-speed dice.
  {
    const rng = forceDice([3, 3]); // polearm vs AC9 needs 6; parry drops to 4
    const r = resolveAttackPool(
      { attacker: { weaponId: "polearm", profileAttack: true, dice: 1 }, target: { ac: 9, held: 1, parryWeaponId: "dagger" } },
      rng
    );
    ok(r.dice.length === 1 && r.speedDice === 0, "T7b profile gets no weapon-speed dice");
    ok(r.parries === 1 && r.dice[0].effective === 4, "T7b profile takes standard parry");
    ok(!r.parryWeaponBroke, "T7b profile never breaks the parry weapon");
  }

  // T8: exchange runs both sides, with the higher weapon seizing the first blow.
  {
    const out = resolveExchange(
      {
        first: { name: "A", weaponId: "sword", ac: 5, parryWeaponId: "sword", thrown: 3, held: 0 },
        second: { name: "B", weaponId: "spear", ac: 6, parryWeaponId: "spear", thrown: 2, held: 1 }
      },
      mulberry32(42)
    );
    ok(out.firstStrike && out.counter, "T8 both pools resolved");
    // B's spear(8) is 4 classes higher than A's sword(4): B seizes the first
    // blow by reach (round-1 2+ higher), so the acting token A strikes second.
    ok(out.striker === "second", "T8 spear out-reaches the sword (strikes first)");
    ok(out.killed === false && out.brokeOut === false, "T8 neither killed nor broke");
  }

  // T9: determinism.
  {
    const a = resolveAttackPool({ attacker: { weaponId: "flail", dice: 4 }, target: { ac: 4 } }, mulberry32(2024));
    const b = resolveAttackPool({ attacker: { weaponId: "flail", dice: 4 }, target: { ac: 4 } }, mulberry32(2024));
    ok(a.hits === b.hits && a.damage === b.damage, "T9 deterministic");
  }

  // T11: magic immunity short-circuits — no dice, no parries, rng untouched.
  {
    const rng = forceDice([6, 6, 6, 6]); // would be hits if rolled
    const r = resolveAttackPool(
      { attacker: { weaponId: "sword", dice: 4 }, target: { name: "Wraith", ac: 3, held: 2, parryWeaponId: "sword", hitOnlyBy: "magic" } },
      rng
    );
    ok(r.immune === true && r.dice.length === 0, "T11 immune short-circuit");
    ok(r.hits === 0 && r.damage === 0 && r.parries === 0, "T11 nothing lands or is spent");
  }

  // T12: a magical weapon passes the magic gate; silver passes silver but not magic.
  {
    const a = resolveAttackPool(
      { attacker: { weaponId: "sword", dice: 1, magical: true }, target: { ac: 3, hitOnlyBy: "magic" } },
      forceDice([6, 5, 4])
    );
    ok(a.immune === false && a.hits === 1, "T12 magical weapon harms magic-only");
    const b = resolveAttackPool(
      { attacker: { weaponId: "sword", dice: 1, silver: true }, target: { ac: 3, hitOnlyBy: "magic" } },
      forceDice([6, 5])
    );
    ok(b.immune === true, "T12 silver alone fails the magic gate");
    const c = resolveAttackPool(
      { attacker: { weaponId: "sword", dice: 1, silver: true }, target: { ac: 3, hitOnlyBy: "silver" } },
      forceDice([6, 5, 4])
    );
    ok(c.immune === false && c.hits === 1, "T12 silver harms silver-or-magic");
  }

  // T13: canHarm matrix.
  {
    ok(canHarm({}, {}) && canHarm({}, { hitOnlyBy: "any" }), "T13 default any");
    ok(!canHarm({}, { hitOnlyBy: "silver" }) && canHarm({ magical: true }, { hitOnlyBy: "silver" }), "T13 silver gate");
    ok(!canHarm({ silver: true }, { hitOnlyBy: "magic" }) && canHarm({ magical: true }, { hitOnlyBy: "magic" }), "T13 magic gate");
  }

  // T14: speed dice. Dagger(1) vs defender holding a battleaxe(5): gap 4 -> +1
  // die; vs pike(12): gap 11 -> +2; vs sword(4): gap 3 -> none; unknown -> none.
  {
    const r1 = resolveAttackPool(
      { attacker: { weaponId: "dagger", dice: 2 }, target: { ac: 9, parryWeaponId: "battleaxe" } },
      mulberry32(7)
    );
    ok(r1.speedDice === 1 && r1.dice.length === 3, "T14 +1 die at gap 4");
    ok(!r1.dice[1].speed && r1.dice[2].speed, "T14 speed flag on the extra die");
    const r2 = resolveAttackPool(
      { attacker: { weaponId: "dagger", dice: 2 }, target: { ac: 9, parryWeaponId: "pike" } },
      mulberry32(7)
    );
    ok(r2.speedDice === 2 && r2.dice.length === 4, "T14 +2 dice at gap 8+");
    const r3 = resolveAttackPool(
      { attacker: { weaponId: "dagger", dice: 2 }, target: { ac: 9, parryWeaponId: "sword" } },
      mulberry32(7)
    );
    ok(r3.speedDice === 0 && r3.dice.length === 2, "T14 gap 3 grants nothing");
    const r4 = resolveAttackPool(
      { attacker: { weaponId: "dagger", dice: 2 }, target: { ac: 9 } },
      mulberry32(7)
    );
    ok(r4.speedDice === 0, "T14 unknown defender weapon grants nothing");
    const r5 = resolveAttackPool(
      { attacker: { weaponId: "dagger", dice: 0 }, target: { ac: 9, parryWeaponId: "pike" } },
      mulberry32(7)
    );
    ok(r5.speedDice === 0 && r5.dice.length === 0, "T14 no base swings, no speed");
    ok(speedDice(1, 5) === 1 && speedDice(1, 12) === 2 && speedDice(4, 5) === 0 && speedDice(5, 1) === 0, "T14 speedDice fn");
    // Heavier attacker never gains; the heavy side risks nothing but parry breakage.
    const r6 = resolveAttackPool(
      { attacker: { weaponId: "pike", dice: 2 }, target: { ac: 9, parryWeaponId: "dagger" } },
      mulberry32(7)
    );
    ok(r6.speedDice === 0, "T14 heavy weapon gains no dice");
  }

  // T16: facing. Left flank keeps the parry (its penalty is positional, in
  // resolveExchange); right flank is front-equivalent; rear suppresses the
  // parry, adds +1 per die, and the exchange skips the counter.
  {
    // Left flank (and legacy "flank" alias): the held parry APPLIES. sword vs
    // AC9 = 7; raw 7 would hit, but the -2 parry turns it into a miss.
    const lflank = resolveAttackPool(
      { attacker: { weaponId: "sword", dice: 1, facing: "flank" }, target: { ac: 9, held: 1, parryWeaponId: "sword" } },
      forceDice([4, 3]) // raw 7; parried to 5 -> miss
    );
    ok(lflank.parries === 1 && lflank.dice[0].parried, "T16 left flank parry applies (flank-fix)");
    ok(!lflank.dice[0].hit && lflank.facing === "leftFlank", "T16 legacy flank normalizes to leftFlank, blow parried");

    // Right flank: no penalty — identical to front, no facing bonus.
    const rflank = resolveAttackPool(
      { attacker: { weaponId: "sword", dice: 1, facing: "rightFlank" }, target: { ac: 9, held: 0, parryWeaponId: "sword" } },
      forceDice([3, 3]) // raw 6 vs 7 -> miss (a rear +1 would have hit)
    );
    ok(!rflank.dice[0].hit && rflank.facing === "rightFlank", "T16 right flank confers no bonus");

    // T16b: mounted melee. sword vs AC9 = 7 throughout.
    // Horseman on footman: +1 turns a raw 6 into a hit.
    const horse = resolveAttackPool(
      { attacker: { weaponId: "sword", dice: 1, mounted: true }, target: { ac: 9, held: 0, parryWeaponId: "sword" } },
      forceDice([3, 3, 4]) // raw 6 +1 -> 7 hits; then a damage die
    );
    ok(horse.dice[0].hit && horse.mountedMod === 1, "T16b mounted vs afoot +1");

    // Charging horseman: +2 turns a raw 5 into a hit.
    const chg = resolveAttackPool(
      { attacker: { weaponId: "sword", dice: 1, mounted: true, charge: true }, target: { ac: 9, held: 0, parryWeaponId: "sword" } },
      forceDice([2, 3, 4]) // raw 5 +2 -> 7 hits
    );
    ok(chg.dice[0].hit && chg.mountedMod === 2, "T16b charging horseman +2");

    // Footman on horseman: -1 turns a raw 7 into a miss.
    const afoot = resolveAttackPool(
      { attacker: { weaponId: "sword", dice: 1 }, target: { ac: 9, held: 0, parryWeaponId: "sword", mounted: true } },
      forceDice([4, 3]) // raw 7 -1 -> 6 misses
    );
    ok(!afoot.dice[0].hit && afoot.mountedMod === -1, "T16b afoot vs mounted -1");

    // Both mounted: level ground.
    const hh = resolveAttackPool(
      { attacker: { weaponId: "sword", dice: 1, mounted: true }, target: { ac: 9, held: 0, parryWeaponId: "sword", mounted: true } },
      forceDice([4, 3, 4]) // raw 7 hits with no modifier
    );
    ok(hh.dice[0].hit && hh.mountedMod === 0, "T16b horse vs horse level");

    // Declared unhorsing: the -1 is waived (raw 7 succeeds), the score
    // throws the rider instead of wounding him, and the spill is diced.
    const unh = resolveAttackPool(
      { attacker: { weaponId: "sword", dice: 1, unhorse: true }, target: { ac: 9, held: 0, parryWeaponId: "sword", mounted: true } },
      forceDice([4, 3, 6]) // raw 7 -> unhorse; stun d6 = 6
    );
    ok(unh.unhorseAttempt && unh.unhorsed && unh.mountedMod === 0, "T16b unhorse waives the afoot -1");
    ok(unh.damage === 0 && unh.unhorseStunRoll === 6 && unh.unhorseStunTurns === 3, "T16b spill: no damage, stun 3 turns on a 6");

    // A failed attempt: raw 6 (would have needed the waived... no — 6 < 7).
    const unhMiss = resolveAttackPool(
      { attacker: { weaponId: "sword", dice: 1, unhorse: true }, target: { ac: 9, held: 0, parryWeaponId: "sword", mounted: true } },
      forceDice([3, 3])
    );
    ok(!unhMiss.unhorsed && unhMiss.unhorseStunTurns === null, "T16b failed unhorse: nothing happens");

    // Unhorse flag is inert unless afoot-vs-mounted: a horseman "unhorsing"
    // a footman is just an attack at +1.
    const bogus = resolveAttackPool(
      { attacker: { weaponId: "sword", dice: 1, mounted: true, unhorse: true }, target: { ac: 9, held: 0, parryWeaponId: "sword" } },
      forceDice([3, 3, 4])
    );
    ok(!bogus.unhorseAttempt && bogus.mountedMod === 1 && bogus.damage > 0, "T16b unhorse inert when not afoot-vs-mounted");

    // An unhorsing blow can still be parried: held die at -2 turns 7 into 5.
    const unhParried = resolveAttackPool(
      { attacker: { weaponId: "sword", dice: 1, unhorse: true }, target: { ac: 9, held: 1, parryWeaponId: "sword", mounted: true } },
      forceDice([4, 3])
    );
    ok(!unhParried.unhorsed && unhParried.dice[0].parried, "T16b rider parries the grab");

    // Rear: +1 to every die. raw 6 vs number 7 would miss front, but +1 → 7 hits.
    const rear = resolveAttackPool(
      { attacker: { weaponId: "sword", dice: 1, facing: "rear" }, target: { ac: 9, held: 2, parryWeaponId: "sword" } },
      forceDice([3, 3, 4])
    );
    ok(rear.parries === 0, "T16 rear suppresses parry");
    ok(rear.dice[0].bonus === 1 && rear.dice[0].effective === 7 && rear.dice[0].hit, "T16 rear +1 per die");

    // Front baseline still parries and gets no per-die bonus.
    const front = resolveAttackPool(
      { attacker: { weaponId: "sword", dice: 1 }, target: { ac: 9, held: 1, parryWeaponId: "sword" } },
      forceDice([4, 3])
    );
    ok(front.parries === 1 && front.dice[0].parried && front.dice[0].bonus === 0, "T16 front unchanged");

    // Rear exchange: no counter pool.
    const ex = resolveExchange(
      {
        first: { name: "A", weaponId: "sword", ac: 9, thrown: 1, held: 0, facing: "rear" },
        second: { name: "B", weaponId: "sword", ac: 9, thrown: 1, held: 0 }
      },
      mulberry32(7)
    );
    ok(ex.counter === null, "T16 rear exchange has no counter");

    // Front exchange still returns a counter.
    const ex2 = resolveExchange(
      {
        first: { name: "A", weaponId: "sword", ac: 9, thrown: 1, held: 0 },
        second: { name: "B", weaponId: "sword", ac: 9, thrown: 1, held: 0 }
      },
      mulberry32(7)
    );
    ok(ex2.counter !== null, "T16 front exchange keeps counter");
  }

  // T15: parries cover the bonus die first. Sword vs AC9 -> 7, bonus 3 on
  // die 2, one held parry: die 2 is parried, dice 0-1 are not.
  {
    const rng = forceDice([4, 4, 3, 4, 4, 3, 4, 4, 3]); // raws of 8, damage 3 each
    const r = resolveAttackPool(
      { attacker: { weaponId: "sword", dice: 3, bonus: 3, bonusDie: 2 }, target: { ac: 9, held: 1, parryWeaponId: "sword" } },
      rng
    );
    ok(!r.dice[0].parried && !r.dice[1].parried && r.dice[2].parried, "T15 parry lands on the bonus die");
    ok(r.dice[2].raw === 8 && r.dice[2].effective === 8 + 3 - 2, "T15 bonus and parry both apply");
    // Two held: bonus die plus the leading die.
    const r2 = resolveAttackPool(
      { attacker: { weaponId: "sword", dice: 3, bonus: 3, bonusDie: 2 }, target: { ac: 9, held: 2, parryWeaponId: "sword" } },
      mulberry32(5)
    );
    ok(r2.dice[2].parried && r2.dice[0].parried && !r2.dice[1].parried, "T15 second parry takes the lead die");
    // No bonus: plain leading-dice assignment, as before.
    const r3 = resolveAttackPool(
      { attacker: { weaponId: "sword", dice: 3, bonusDie: 2 }, target: { ac: 9, held: 1, parryWeaponId: "sword" } },
      mulberry32(5)
    );
    ok(r3.dice[0].parried && !r3.dice[2].parried, "T15 zero bonus keeps leading order");
  }

  // T10: fuzz invariants.
  {
    const weapons = Object.keys(WEAPON_CLASS);
    for (let s = 0; s < 3000; s++) {
      const rng = mulberry32(s + 1);
      const w = weapons[s % weapons.length];
      const pw = weapons[(s * 3) % weapons.length];
      const n = s % 9;
      const total = n + (n > 0 ? speedDice(WEAPON_CLASS[w], WEAPON_CLASS[pw]) : 0);
      const r = resolveAttackPool(
        { attacker: { weaponId: w, dice: n, bonus: s % 4, bonusDie: s % (n || 1) }, target: { ac: 2 + (s % 8), held: s % 5, parryWeaponId: pw } },
        rng
      );
      ok(r.dice.length === total, `T10 pool sized base+speed @${s}`);
      ok(r.hits >= 0 && r.hits <= total, `T10 hits bounded @${s}`);
      ok(r.damage >= r.hits && r.damage <= r.hits * 6, `T10 damage bounded @${s}`);
      ok(r.parries <= total, `T10 parries bounded @${s}`);
      for (const d of r.dice) {
        if (d.broke) ok(d.parried, `T10 break implies parried @${s}`);
        if (d.hit) ok(d.damage >= 1 && d.damage <= 6, `T10 hit damage 1-6 @${s}`);
        if (d.speed) ok(d.index >= n, `T10 speed dice trail the base pool @${s}`);
      }
    }
  }

  // T17: missileShots — the rate-of-fire ladder over the man-count base. The
  // over-half permission is no longer decided here (see T18), so moving past
  // NONE only forfeits the bow's stationary double; the rate itself stands.
  {
    ok(missileShots(4, { kind: FireClass.BOW, moved: Move.NONE }) === 8, "T17 bow stationary fires twice");
    ok(missileShots(4, { kind: FireClass.BOW, moved: Move.NONE, meleed: true }) === 4, "T17 meleed bow no double");
    ok(missileShots(4, { kind: FireClass.BOW, moved: Move.HALF }) === 4, "T17 bow half-move once");
    ok(missileShots(4, { kind: FireClass.BOW, moved: Move.OVER }) === 4, "T17 bow over-half still rates one");
    ok(missileShots(3, { kind: FireClass.LIGHT_CROSSBOW, moved: Move.NONE }) === 3, "T17 light xbow no double");
    ok(missileShots(3, { kind: FireClass.LIGHT_CROSSBOW, moved: Move.OVER }) === 3, "T17 light xbow rate unchanged by move");
    ok(missileShots(2, { kind: FireClass.HEAVY_CROSSBOW, loaded: true }) === 2, "T17 heavy xbow loaded fires");
    ok(missileShots(2, { kind: FireClass.HEAVY_CROSSBOW, loaded: false }) === 0, "T17 heavy xbow reloading, no shot");
    ok(missileShots(4, { kind: FireClass.THROWN, moved: Move.NONE }) === 4, "T17 thrown no double");
    ok(missileShots(4, { kind: FireClass.THROWN, moved: Move.OVER }) === 4, "T17 thrown rate unchanged by move");
    ok(missileShots(4, { kind: FireClass.BOW, moved: Move.OVER, charging: true }) === 0, "T17 charging bow cannot fire");
    ok(missileShots(3, { kind: FireClass.LIGHT_CROSSBOW, charging: true }) === 0, "T17 charging light xbow cannot fire");
    ok(missileShots(2, { kind: FireClass.HEAVY_CROSSBOW, loaded: true, charging: true }) === 0, "T17 charging heavy xbow cannot fire");
    ok(missileShots(4, { kind: FireClass.THROWN, charging: true }) === 4, "T17 charging thrown still casts");
    ok(missileShots(4, { kind: FireClass.BOW, moved: Move.NONE, targetFantastic: true }) === 1, "T17 fantastic clamps to 1");
    ok(missileShots(0, {}) === 0, "T17 no base, no shots");
  }

  // T18: overHalfFireGate — the moved-over-½ opposed roll (Rate of Fire, p.11).
  // Shooter die first, foe die second; strictly greater clears, a tie fails.
  {
    ok(overHalfFireGate({ kind: FireClass.BOW, moved: Move.NONE }) === null, "T18 stationary — gate N/A");
    ok(overHalfFireGate({ kind: FireClass.BOW, moved: Move.HALF }) === null, "T18 half-move — gate N/A");
    ok(overHalfFireGate({ kind: FireClass.THROWN, moved: Move.OVER }) === null, "T18 thrown exempt");
    // Charging bows/crossbows never reach the gate (missileShots returns 0); the
    // gate itself no longer takes a charging flag. See T17 charging assertions.
    ok(overHalfFireGate({ kind: FireClass.BOW, moved: Move.OVER }, forceDice([6, 2])).beat === true, "T18 over-half beats foe, fires");
    ok(overHalfFireGate({ kind: FireClass.LIGHT_CROSSBOW, moved: Move.OVER }, forceDice([2, 6])).beat === false, "T18 over-half loses, no shot");
    ok(overHalfFireGate({ kind: FireClass.BOW, moved: Move.OVER }, forceDice([4, 4])).beat === false, "T18 tie fails");
  }

  // T19: classifyMove — none / half / over against the inch allowance.
  {
    ok(classifyMove(0, 12) === Move.NONE, "T19 no move is none");
    ok(classifyMove(0.0005, 12) === Move.NONE, "T19 epsilon is none");
    ok(classifyMove(5, 12) === Move.HALF, "T19 under half");
    ok(classifyMove(6, 12) === Move.HALF, "T19 exactly half stays half");
    ok(classifyMove(7, 12) === Move.OVER, "T19 over half");
    ok(classifyMove(12, 12) === Move.OVER, "T19 full move is over");
    ok(classifyMove(3, 6) === Move.HALF, "T19 armored foot half (6\" allowance)");
    ok(classifyMove(4, 6) === Move.OVER, "T19 armored foot over");
  }

  // T19b: moveBand — legal to the allowance, charge to chargeMax, illegal past.
  {
    ok(moveBand(0, 12, 18) === MoveBand.LEGAL, "T19b zero is legal");
    ok(moveBand(12, 12, 18) === MoveBand.LEGAL, "T19b at allowance is legal");
    ok(moveBand(15, 12, 18) === MoveBand.CHARGE, "T19b between allowance and charge");
    ok(moveBand(18, 12, 18) === MoveBand.CHARGE, "T19b at charge max is charge");
    ok(moveBand(19, 12, 18) === MoveBand.ILLEGAL, "T19b beyond charge is illegal");
    // No charge bonus collapses the band (wights 9->9, treants 6->6, charge 0).
    ok(moveBand(9, 9, 9) === MoveBand.LEGAL, "T19b no-bonus at allowance legal");
    ok(moveBand(10, 9, 9) === MoveBand.ILLEGAL, "T19b no-bonus over allowance illegal");
    ok(moveBand(10, 9, 0) === MoveBand.ILLEGAL, "T19b chargeMax 0 = no bonus");
    // Real rows: dwarf 6->9, hero 12->15, giant 12->18.
    ok(moveBand(8, 6, 9) === MoveBand.CHARGE, "T19b dwarf 6->9 charge zone");
    ok(moveBand(14, 12, 15) === MoveBand.CHARGE, "T19b hero 12->15 charge zone");
    ok(moveBand(16, 12, 15) === MoveBand.ILLEGAL, "T19b hero beyond charge illegal");
  }

  // T20: per-hit damage dice + flat add (a Monster Attack Profile's 2d6+1).
  {
    // sword vs AC6 -> 9. die0 [6,4]=10 hit, damage = 2d6[3,4] + flat 1 = 8.
    const rng = forceDice([6, 4, 3, 4]);
    const r = resolveAttackPool(
      { attacker: { weaponId: "sword", dice: 1, damageDice: 2, damageFlat: 1 }, target: { ac: 6 } },
      rng
    );
    ok(r.hits === 1 && r.damage === 8, "T20 2d6+1 on a hit");
    // default (no damageDice) stays 1d6: die0 [6,4]=10 hit, dmg [5] = 5.
    const r1 = resolveAttackPool({ attacker: { weaponId: "sword", dice: 1 }, target: { ac: 6 } }, forceDice([6, 4, 5]));
    ok(r1.hits === 1 && r1.damage === 5, "T20 default still 1d6");
  }

  // T18: resolveVolley — band, kill number, cover, +1, immunity, range, alias.
  {
    // Short bow vs AC9 at close (number 6). [3,3]=6 hit, damage 4.
    const hit = resolveVolley(
      { attacker: { weaponId: "shortbow", shots: 1 }, target: { ac: 9, distance: 3 } },
      forceDice([3, 3, 4])
    );
    ok(hit.band === "close" && hit.toKillNumber === 6, "T18 close band, number 6");
    ok(hit.hits === 1 && hit.damage === 4, "T18 one hit for 4");

    // Cover subtracts from the roll: same 6, cover 2 -> 4 < 6, miss.
    const cov = resolveVolley(
      { attacker: { weaponId: "shortbow", shots: 1 }, target: { ac: 9, distance: 3, cover: 2 } },
      forceDice([3, 3])
    );
    ok(cov.hits === 0, "T18 cover turns the hit into a miss");

    // Out of range: short bow range 15, distance 20.
    const oor = resolveVolley(
      { attacker: { weaponId: "shortbow", shots: 2 }, target: { ac: 9, distance: 20 } },
      forceDice([6, 6])
    );
    ok(oor.outOfRange && oor.dice.length === 0, "T18 out of range, no dice");

    // Cannot kill: short bow vs AC2 at medium (distance 8) -> table "/" (null).
    const cant = resolveVolley(
      { attacker: { weaponId: "shortbow", shots: 1 }, target: { ac: 2, distance: 8 } },
      forceDice([6, 6])
    );
    ok(cant.cannotKill && cant.dice.length === 0, "T18 arrow-proof at this band");

    // Heavy crossbow +1: vs AC5 at close (number 6). [3,2]=5, +1 = 6 hit, dmg 5.
    const heavy = resolveVolley(
      { attacker: { weaponId: "heavycrossbow", shots: 1, fireBonus: 1 }, target: { ac: 5, distance: 5 } },
      forceDice([3, 2, 5])
    );
    ok(heavy.dice[0].effective === 6 && heavy.hits === 1 && heavy.damage === 5, "T18 heavy xbow +1 lands the shot");

    // Immunity: a non-magical arrow vs a magic-only target.
    const imm = resolveVolley(
      { attacker: { weaponId: "shortbow", shots: 3 }, target: { name: "Wraith", ac: 3, distance: 3, hitOnlyBy: "magic" } },
      forceDice([6, 6, 6, 6, 6, 6])
    );
    ok(imm.immune && imm.dice.length === 0 && imm.hits === 0, "T18 immune short-circuit");

    // Sling fires as a short bow (alias).
    const sling = resolveVolley(
      { attacker: { weaponId: "sling", shots: 1 }, target: { ac: 9, distance: 3 } },
      forceDice([3, 3, 2])
    );
    ok(sling.toKillNumber === 6 && sling.hits === 1, "T18 sling = short bow");

    // Multi-shot volley: 3 shots, two land for 8.
    const volley = resolveVolley(
      { attacker: { weaponId: "shortbow", shots: 3 }, target: { ac: 9, distance: 3 } },
      forceDice([4, 3, 2, 2, 2, 5, 5, 6])
    );
    ok(volley.hits === 2 && volley.damage === 8, "T18 volley: two of three land for 8");

    // Multi-dice projectile (a giant's 2d6 boulder): one hit rolls TWO damage dice.
    const big = resolveVolley(
      { attacker: { weaponId: "shortbow", shots: 1, damageDice: 2 }, target: { ac: 9, distance: 3 } },
      forceDice([3, 3, 4, 5])
    );
    ok(big.hits === 1 && big.damage === 9, "T18 damageDice 2: one hit rolls 2d6 (4+5)");

    // A flat per-hit add stacks onto the dice; default damageDice stays 1.
    const flat = resolveVolley(
      { attacker: { weaponId: "shortbow", shots: 1, damageFlat: 2 }, target: { ac: 9, distance: 3 } },
      forceDice([3, 3, 4])
    );
    ok(flat.damage === 6, "T18 damageFlat adds +2 onto the 1d6 hit (4+2)");
  }

  // T19: fireClassFor — missile row -> rate-of-fire class.
  {
    ok(fireClassFor("shortbow") === FireClass.BOW, "T19 short bow -> BOW");
    ok(fireClassFor("longbow") === FireClass.BOW, "T19 longbow -> BOW");
    ok(fireClassFor("compositebow") === FireClass.BOW, "T19 composite -> BOW");
    ok(fireClassFor("horsebow") === FireClass.BOW, "T19 horsebow -> BOW");
    ok(fireClassFor("sling") === FireClass.BOW, "T19 sling -> BOW");
    ok(fireClassFor("lightcrossbow") === FireClass.LIGHT_CROSSBOW, "T19 light xbow class");
    ok(fireClassFor("heavycrossbow") === FireClass.HEAVY_CROSSBOW, "T19 heavy xbow class");
    ok(fireClassFor("arquebus") === FireClass.LIGHT_CROSSBOW, "T19 arquebus placeholder");
    ok(fireClassFor("shortbow", { thrown: true }) === FireClass.THROWN, "T19 thrown overrides to THROWN");
    ok(fireClassFor("nonsense") === null, "T19 unknown row -> null");
  }

  // T20: elf magic-weapon damage pip. attacker.damageBonus adds to each hit's
  // 1d6 (d6 -> 2-7). sword vs AC9 -> 7; raw [4,4]=8 hit, damage die 3 -> 3+1=4.
  {
    const r = resolveAttackPool(
      { attacker: { weaponId: "sword", dice: 1, damageBonus: 1 }, target: { ac: 9 } },
      forceDice([4, 4, 3])
    );
    ok(r.hits === 1 && r.damage === 4, "T20 magic pip adds +1 to the damage die");
    ok(r.dice[0].damage === 4, "T20 per-die damage reflects the pip");
    ok(r.attacker.damageBonus === 1, "T20 result surfaces damageBonus to the card");
    // No bonus -> bare 1d6.
    const r0 = resolveAttackPool(
      { attacker: { weaponId: "sword", dice: 1 }, target: { ac: 9 } },
      forceDice([4, 4, 3])
    );
    ok(r0.damage === 3, "T20 no pip -> flat 1d6");
  }

  // T21: dwarf small-target halving. target.damageHalved floors each blow.
  // sword vs AC9 -> 7; raw [4,4]=8 hit, damage die 5 -> floor(5/2)=2.
  {
    const r = resolveAttackPool(
      { attacker: { weaponId: "sword", dice: 1 }, target: { ac: 9, damageHalved: true } },
      forceDice([4, 4, 5])
    );
    ok(r.hits === 1 && r.damage === 2, "T21 halved blow floors to 2");
    ok(r.target.damageHalved === true, "T21 result surfaces damageHalved to the card");
    // A roll of 1 floors to 0 — the literal one-half-hit-points reading.
    const r1 = resolveAttackPool(
      { attacker: { weaponId: "sword", dice: 1 }, target: { ac: 9, damageHalved: true } },
      forceDice([4, 4, 1])
    );
    ok(r1.dice[0].hit && r1.damage === 0, "T21 a glancing 1 does 0 to a dwarf");
    // Pip then halve: (die 5 + 1) / 2 = 3. Bonus applies before the halving.
    const rp = resolveAttackPool(
      { attacker: { weaponId: "sword", dice: 1, damageBonus: 1 }, target: { ac: 9, damageHalved: true } },
      forceDice([4, 4, 5])
    );
    ok(rp.damage === 3, "T21 pip applied before the halving");
  }

  // T22: both modifiers on a volley. short bow vs AC9 close -> 6.
  // damageBonus: [3,3]=6 hit, die 4 -> 5. halved: die 4 -> 2.
  {
    const pip = resolveVolley(
      { attacker: { weaponId: "shortbow", shots: 1, damageBonus: 1 }, target: { ac: 9, distance: 3 } },
      forceDice([3, 3, 4])
    );
    ok(pip.hits === 1 && pip.damage === 5, "T22 missile pip adds +1");
    const half = resolveVolley(
      { attacker: { weaponId: "shortbow", shots: 1 }, target: { ac: 9, distance: 3, damageHalved: true } },
      forceDice([3, 3, 4])
    );
    ok(half.hits === 1 && half.damage === 2, "T22 missile halving floors to 2");
  }

  // T23: parry bands (defensive half). parryPenalty by class gap, plus the two
  // behavioural changes inside the pool: 4a denies the parry, 4d weakens it to -1.
  {
    // parryPenalty function: gap = parryClass - attackerClass.
    ok(parryPenalty(4, 4) === 2, "T23 same class -> -2 (4b)");
    ok(parryPenalty(4, 5) === 2, "T23 parry 1 heavier -> -2 (4b edge)");
    ok(parryPenalty(4, 6) === 0, "T23 parry 2 heavier -> no parry (4a)");
    ok(parryPenalty(1, 5) === 0, "T23 dagger-attacked axe cannot parry (4a)");
    ok(parryPenalty(8, 5) === 2, "T23 parry 3 lighter -> -2 (4b edge)");
    ok(parryPenalty(9, 5) === 2, "T23 parry 4 lighter -> -2 (4c)");
    ok(parryPenalty(12, 5) === 2, "T23 parry 7 lighter -> -2 (4c edge)");
    ok(parryPenalty(12, 4) === 1, "T23 parry 8 lighter -> -1 (4d)");
    ok(parryPenalty(12, 1) === 1, "T23 pike vs dagger parry -> -1 (4d)");
    ok(parryPenalty(5, null) === 0, "T23 no parry weapon -> 0");

    // 4a in the pool: spear(8) parrying a dagger(1) attack. gap +7 -> no parry.
    // dagger vs AC9 = 6. raw [3,3]=6 lands; a held die must NOT save it.
    const fourA = resolveAttackPool(
      { attacker: { weaponId: "dagger", dice: 1 }, target: { ac: 9, held: 1, parryWeaponId: "spear" } },
      forceDice([3, 3, 4])
    );
    ok(fourA.parries === 0 && !fourA.dice[0].parried, "T23 4a held die yields no parry");
    ok(fourA.dice[0].hit, "T23 4a unparried blow lands");

    // Contrast: a dagger(1) parrying the same dagger(1) attack. gap 0 -> 4b, -2.
    // raw [3,3]=6 -> 6-2=4 < 6 miss. The parry works at equal class.
    const fourB = resolveAttackPool(
      { attacker: { weaponId: "dagger", dice: 1 }, target: { ac: 9, held: 1, parryWeaponId: "dagger" } },
      forceDice([3, 3])
    );
    ok(fourB.parries === 1 && fourB.dice[0].parried && !fourB.dice[0].hit, "T23 4b -2 saves at equal class");

    // 4d in the pool: dagger(1) parrying a pike(12) attack. gap -11 -> -1.
    // pike vs AC9 = ? compute via number; raw chosen so -1 vs -2 flips the result.
    // We assert the magnitude directly off effective rather than the table number.
    const fourD = resolveAttackPool(
      { attacker: { weaponId: "pike", dice: 1 }, target: { ac: 9, held: 1, parryWeaponId: "dagger" } },
      forceDice([4, 4, 3])
    );
    ok(fourD.dice[0].parried, "T23 4d dagger still parries the pike");
    ok(fourD.dice[0].effective === fourD.dice[0].raw - 1, "T23 4d parry is -1, not -2");
  }

  // T24: first-blow ordering (firstStriker) and the exchange gates.
  {
    const fs = (a, b, opts = {}) => firstStriker({ first: { weaponId: a, ...(opts.first || {}) }, second: { weaponId: b, ...(opts.second || {}) }, round: opts.round, charge: opts.charge, prevFirst: opts.prevFirst });

    // Round 1: even match -> the acting token (first) leads.
    ok(fs("sword", "sword") === "first", "T24 even match -> acting token first");
    // Round 1: second 2+ higher -> reach, second leads.
    ok(fs("sword", "pike") === "second", "T24 reach: higher weapon strikes first");
    // Round 1: second 8+ lower -> inside (4d), second leads.
    ok(fs("pike", "dagger") === "second", "T24 inside (4d): lighter weapon steals first blow");
    // Round 1: charge with a reach weapon over a lower second -> charger first.
    ok(fs("pike", "dagger", { charge: true }) === "first", "T24 charge cancels the inside steal");
    // Round 1: charging spear vs a HIGHER pike -> reach still wins (not "lower").
    ok(fs("spear", "pike", { charge: true }) === "second", "T24 charge does not beat a higher weapon");
    // Round 1: middle gap, second from-above -> second leads.
    ok(fs("sword", "mace", { second: { fromAbove: true } }) === "second", "T24 from-above seizes first blow");
    // Round 1: first from-above, middle gap -> still first (default).
    ok(fs("sword", "mace", { first: { fromAbove: true } }) === "first", "T24 own elevation keeps the default");

    // Round 2+: the lighter weapon takes over.
    ok(fs("pike", "dagger", { round: 2 }) === "second", "T24 round2: dagger takes over inside the pike");
    ok(fs("dagger", "pike", { round: 2 }) === "first", "T24 round2: the lighter side leads regardless of role");
    // Round 2+: even match keeps last round's first striker.
    ok(fs("sword", "sword", { round: 2, prevFirst: "second" }) === "second", "T24 round2: even keeps prevFirst");
    ok(fs("sword", "sword", { round: 2, prevFirst: "first" }) === "first", "T24 round2: even defaults to first");
    // Round 2+: a side reared last round stays at 2nd-blow position.
    ok(fs("sword", "sword", { round: 2, first: { rearedLastRound: true } }) === "second", "T24 round2: reared side strikes second");

    // Kill gate: a lethal first strike cancels the return blow.
    const kill = resolveExchange(
      { first: { name: "Axe", weaponId: "battleaxe", ac: 9, parryWeaponId: "battleaxe", thrown: 1, held: 0 },
        second: { name: "Frail", weaponId: "mace", ac: 9, parryWeaponId: "mace", thrown: 1, held: 0, hp: 1 } },
      forceDice([6, 6, 5]) // battleaxe raw 12 >= 8 hit, 1d6 dmg -> >= 1 hp
    );
    ok(kill.striker === "first" && kill.killed === true && kill.counter === null, "T24 lethal first strike cancels the return");

    // Broken-weapon gate: a parry weapon shattered by the first strike cannot
    // riposte. battleaxe(5) vs dagger(1) parry, raw == toHit(=8) breaks it.
    const broke = resolveExchange(
      { first: { name: "Axe", weaponId: "battleaxe", ac: 9, parryWeaponId: "battleaxe", thrown: 1, held: 0 },
        second: { name: "Knife", weaponId: "dagger", ac: 9, parryWeaponId: "dagger", thrown: 1, held: 1, hp: 99 } },
      forceDice([4, 4]) // battleaxe raw 8 == toHit; dagger parry -2 misses but shatters
    );
    ok(broke.brokeOut === true && broke.counter === null, "T24 broken parry weapon gives no riposte");

    // Normal exchange: neither killed nor broken -> both pools resolve.
    const norm = resolveExchange(
      { first: { name: "P", weaponId: "sword", ac: 4, parryWeaponId: "sword", thrown: 1, held: 0, hp: 20 },
        second: { name: "Q", weaponId: "sword", ac: 4, parryWeaponId: "sword", thrown: 1, held: 0, hp: 20 } },
      mulberry32(7)
    );
    ok(norm.striker === "first" && norm.counter && !norm.killed && !norm.brokeOut, "T24 normal exchange returns a counter");

    // Rear: still no return blow (existing rule preserved through the rewrite).
    const rear = resolveExchange(
      { first: { weaponId: "sword", ac: 4, parryWeaponId: "sword", thrown: 1, held: 0, facing: Facing.REAR },
        second: { weaponId: "sword", ac: 4, parryWeaponId: "sword", thrown: 1, held: 0, hp: 20 } },
      mulberry32(3)
    );
    ok(rear.counter === null && rear.striker === "first", "T24 rear: acting token strikes, no return");

    // Left flank, round 1: the attacker leads even when the defender's weapon
    // would steal the first blow by reach (spear 8 vs sword 4 = gap +4 would
    // make "second" lead from the front), and the defender still counters.
    const lf = resolveExchange(
      { first: { name: "Sword", weaponId: "sword", ac: 4, parryWeaponId: "sword", thrown: 1, held: 0, facing: "leftFlank", hp: 20 },
        second: { name: "Spear", weaponId: "spear", ac: 4, parryWeaponId: "spear", thrown: 1, held: 0, hp: 20 } },
      mulberry32(11)
    );
    ok(lf.striker === "first" && lf.counter !== null, "T24 left flank: attacker leads round 1, counter intact");

    // Same match-up from the front for contrast: the spear's reach steals it.
    const fr = resolveExchange(
      { first: { name: "Sword", weaponId: "sword", ac: 4, parryWeaponId: "sword", thrown: 1, held: 0, hp: 20 },
        second: { name: "Spear", weaponId: "spear", ac: 4, parryWeaponId: "spear", thrown: 1, held: 0, hp: 20 } },
      mulberry32(11)
    );
    ok(fr.striker === "second", "T24 front contrast: reach weapon leads");

    // Left flank, round 2: the flanked man has turned — normal initiative
    // resumes, so the spear's... no: round 2 is the lighter-takeover rule, the
    // sword (2 lighter) leads anyway. Assert the round-2 path is live.
    const lf2 = resolveExchange(
      { first: { name: "Sword", weaponId: "sword", ac: 4, parryWeaponId: "sword", thrown: 1, held: 0, facing: "leftFlank", hp: 20 },
        second: { name: "Spear", weaponId: "spear", ac: 4, parryWeaponId: "spear", thrown: 1, held: 0, hp: 20 },
        round: 2, prevFirst: "first" },
      mulberry32(11)
    );
    ok(lf2.striker === "first" && lf2.counter !== null, "T24 left flank round 2: normal initiative path");
  }

  console.log(`combat-engine.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

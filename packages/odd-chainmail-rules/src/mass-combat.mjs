/**
 * OD&D — Chainmail engine · mass combat (1:20 melee resolution)
 * odd-chainmail · module/rules/mass-combat.mjs
 * system 0.2.2 · slice: single-scale-formation-token · stamp 0.2.2-single-formation.1
 *
 * Pure and runtime-free — the chainmail-board.html mass engine lifted into the
 * system's tested-module discipline. This file owns ONE thing: resolving a
 * single melee round between two bodies of like troops on the Chainmail Combat
 * Tables (Appendix A). It produces casualties; rules/morale.mjs consumes the
 * survivors for the post-melee contest and the Loss-Table check. The seam is
 * intentional — morale already exists and is calibrated, so this never
 * re-implements reaction bands.
 *
 *   TYPES      the canonical troop table (Combat Tables troop classes + the
 *              Fantasy Supplement races, Appendix D). Each row carries its
 *              attack class (cls), an optional asymmetric defend class
 *              (defendCls — dwarves/goblins ATTACK as Heavy Foot but are STRUCK
 *              as Light Foot), the post-melee Morale Rating, and the EXPLICIT
 *              Loss-Table line. The explicit loss line is the fidelity win over
 *              morale.mjs's rating-derived reconstruction: Light Horse (rating
 *              6) takes the Light row (25%/8+), which the rating map would
 *              mis-assign to 33⅓%/7+. Pass these lines to lossCheck via
 *              massLossInput() to honor the table verbatim.
 *
 *   COMBAT     the Combat Tables matrix as {dice, perMen, kills}: attacker
 *              class → defender class → dice pool per man and the d6 scores
 *              that kill. "-1 die per two men, 6 kills" == {dice:1, perMen:2,
 *              kills:[6]}. Verbatim from Appendix A.
 *
 *   resolveMassMelee  rolls one round both ways and returns per-side dice,
 *              casualties, and survivors. The same modifier stack the board
 *              uses — fatigue (attack/defend one class down, p.10), flank/rear
 *              (one class up, rear = no return blow), polearm (+1 die for
 *              HF/AF), charge impetus (+1 die for HF/AF and all horse), standing
 *              horse (returns one class down, first round only), and per-die /
 *              die-score bonuses (the army-commander +1, the elf magic edge).
 *              Every modifier arrives as a plain field on the side object; the
 *              engine stays type-blind, exactly like combat-engine.mjs.
 *
 * SCALE — everything here is in FIGURES, never men. The tabletop ratio is
 * 1 figure ≤ 20 men (LBB: figures-to-men 1:20, ground scale 1″ = 10 yards), so
 * a 60-man body is 3 figures and the engine sees `count: 3`. The Combat Tables
 * are applied per FIGURE and a "kill" removes a FIGURE (the book's "10 HH …
 * kill 8" is 8 figures off the line). Since system 0.2 the canvas renders the
 * whole body as one scale-true linked formation Token; the actor still supplies figure counts.
 *
 *   count        total figures in the body
 *   activeCount  figures in FRONTAL CONTACT this round — the front rank that
 *                actually fights (p.16 "Number of Ranks Fighting: 1 rank").
 *                The caller derives it from token footprint/frontage; absent it,
 *                the whole body rolls (open-field, fully-engaged default).
 *
 * A PC bridges in as "fights as N men" via rules/fighting-capability.mjs — a
 * 4th-level fighter is a Hero (4 figures of pool). That conversion is the
 * caller's job; this engine only sees figure counts and classes.
 */

import { rollDie, mulberry32, forceDice } from "./dice.mjs";

/* ------------------------------------------------------------------ *
 *  Troop table — Combat Tables classes + Fantasy Supplement races.
 * ------------------------------------------------------------------ */

/**
 * @typedef {object} TroopType
 * @property {string} id        stable key
 * @property {string} name      display
 * @property {string} cls       attack class (LF/HF/AF/LH/MH/HH)
 * @property {string} [defendCls] class used when STRUCK, if asymmetric
 * @property {number} morale    post-melee Morale Rating factor
 * @property {{pct:number, score:number}} loss  Loss-Table line (threshold, 2d6 to remain)
 */

/** Canonical mass troop types. Frozen; the single source of truth for ratings. */
export const TYPES = Object.freeze([
  { id: "PE",  name: "Peasants",         cls: "LF", morale: 3, loss: { pct: 0.25, score: 8 } },
  { id: "LV",  name: "Levies",           cls: "HF", morale: 4, loss: { pct: 0.25, score: 8 } },
  { id: "LF",  name: "Light Foot",       cls: "LF", morale: 4, loss: { pct: 0.25, score: 8 } },
  { id: "HF",  name: "Heavy Foot",       cls: "HF", morale: 5, loss: { pct: 1 / 3, score: 7 } },
  { id: "EHF", name: "Elite Heavy Foot", cls: "HF", morale: 6, loss: { pct: 1 / 3, score: 6 } },
  { id: "AF",  name: "Armored Foot",     cls: "AF", morale: 7, loss: { pct: 1 / 3, score: 6 } },
  { id: "LH",  name: "Light Horse",      cls: "LH", morale: 6, loss: { pct: 0.25, score: 8 } },
  { id: "MH",  name: "Medium Horse",     cls: "MH", morale: 8, loss: { pct: 1 / 3, score: 7 } },
  { id: "HH",  name: "Heavy Horse",      cls: "HH", morale: 9, loss: { pct: 0.50, score: 6 } },
  { id: "SP",  name: "Swiss Pikemen",    cls: "HF", morale: 9, loss: { pct: 0.50, score: 5 } },
  { id: "MK",  name: "Mounted Knights",  cls: "HH", morale: 9, loss: { pct: 0.50, score: 4 } },
  // Fantasy races (Appendix D). cls = attack class; defendCls = the (lower)
  // class they are struck on when it differs (small/elusive folk).
  { id: "ORC",       name: "Orc",              cls: "HF",                  morale: 5, loss: { pct: 1 / 3, score: 7 } },
  { id: "GIANT_ORC", name: "Giant Orc",        cls: "AF",                  morale: 5, loss: { pct: 1 / 3, score: 7 } },
  { id: "GOBLIN",    name: "Goblin",           cls: "HF", defendCls: "LF", morale: 5, loss: { pct: 1 / 3, score: 7 } },
  { id: "KOBOLD",    name: "Kobold",           cls: "HF", defendCls: "LF", morale: 5, loss: { pct: 1 / 3, score: 7 } },
  { id: "HOBGOBLIN", name: "Hobgoblin",        cls: "AF", defendCls: "HF", morale: 5, loss: { pct: 1 / 3, score: 7 } },
  { id: "DWARF",     name: "Dwarf",            cls: "HF", defendCls: "LF", morale: 5, loss: { pct: 1 / 3, score: 7 } },
  { id: "GNOME",     name: "Gnome",            cls: "HF", defendCls: "LF", morale: 5, loss: { pct: 1 / 3, score: 7 } },
  { id: "ELF",       name: "Elf",              cls: "HF",                  morale: 6, loss: { pct: 1 / 3, score: 6 } },
  { id: "HOBBIT",    name: "Hobbit",           cls: "LF",                  morale: 5, loss: { pct: 1 / 3, score: 7 } },
  { id: "SPRITE",    name: "Sprite / Pixie",   cls: "LF",                  morale: 3, loss: { pct: 0.25, score: 8 } },
  { id: "WOLF",      name: "Giant Wolf",       cls: "LH", defendCls: "LH", morale: 6, loss: { pct: 0.25, score: 8 } },
  { id: "WOLFRIDER", name: "Goblin Wolf-Rider", cls: "MH", defendCls: "MH", morale: 5, loss: { pct: 1 / 3, score: 7 } },
]);

const TYPE_INDEX = Object.freeze(Object.fromEntries(TYPES.map((t) => [t.id, t])));

/** Look up a troop type by id (frozen). */
export function typeById(id) {
  return TYPE_INDEX[id] ?? null;
}

/** Full names for the six combat classes (sheet display). */
export const CLASS_NAMES = Object.freeze({
  LF: "Light Foot", HF: "Heavy Foot", AF: "Armored Foot",
  LH: "Light Horse", MH: "Medium Horse", HH: "Heavy Horse"
});

/**
 * Canonical movement reference (inches). Unit actors expose this row as numeric
 * `system.move` data, so the combat gate, drag ruler, tracker, and sheet all read
 * one source. null means the entry is not available for that troop type.
 *
 * PE..MK follow the Chainmail movement table (p.10). Fantasy races follow the
 * Fantasy Reference Table (Appendix D) where listed. WOLF/WOLFRIDER remain the
 * system's existing giant-wolf combination entries pending a dedicated fantasy
 * movement pass.
 */
export const MOVE_TABLE = Object.freeze({
  PE:  { move: 9,  road: null, charge: 12, missile: null },
  LV:  { move: 9,  road: null, charge: 12, missile: null },
  LF:  { move: 9,  road: null, charge: 12, missile: null },
  HF:  { move: 9,  road: null, charge: 12, missile: null },
  EHF: { move: 9,  road: null, charge: 12, missile: null },
  AF:  { move: 6,  road: null, charge: 6,  missile: null },
  LH:  { move: 24, road: 6,    charge: 30, missile: 18 },
  MH:  { move: 18, road: 6,    charge: 24, missile: 15 },
  HH:  { move: 12, road: 3,    charge: 18, missile: null },
  SP:  { move: 12, road: null, charge: 15, missile: null },
  MK:  { move: 12, road: 3,    charge: 18, missile: null },
  // Fantasy Supplement (Appendix D)
  ORC:       { move: 9,  road: null, charge: 12, missile: 15 },
  GIANT_ORC: { move: 9,  road: null, charge: 12, missile: 15 },
  GOBLIN:    { move: 6,  road: null, charge: 9,  missile: null },
  KOBOLD:    { move: 6,  road: null, charge: 9,  missile: null },
  HOBGOBLIN: { move: 9,  road: null, charge: 12, missile: null },
  DWARF:     { move: 6,  road: null, charge: 9,  missile: null },
  GNOME:     { move: 6,  road: null, charge: 9,  missile: null },
  ELF:       { move: 12, road: null, charge: null, missile: 18 },
  HOBBIT:    { move: 12, road: null, charge: null, missile: 15 },
  SPRITE:    { move: 9,  road: null, charge: null, missile: null },
  WOLF:      { move: 18, road: null, charge: 24, missile: null }, // moves as Medium Horse
  WOLFRIDER: { move: 12, road: null, charge: 18, missile: null }  // reduced to Heavy Horse bearing goblins
});

/** Movement reference row for a troop type, or null. */
export function movementFor(id) {
  return MOVE_TABLE[id] ?? null;
}

/* ------------------------------------------------------------------ *
 *  Combat Tables matrix (Appendix A) — attacker class vs defender class.
 *  {dice, perMen} = the dice pool per man; kills = d6 scores that kill.
 * ------------------------------------------------------------------ */
export const COMBAT = Object.freeze({
  LF: { LF: { dice: 1, perMen: 1, kills: [6] },       HF: { dice: 1, perMen: 2, kills: [6] },     AF: { dice: 1, perMen: 3, kills: [6] },
        LH: { dice: 1, perMen: 2, kills: [6] },       MH: { dice: 1, perMen: 3, kills: [6] },     HH: { dice: 1, perMen: 4, kills: [6] } },
  HF: { LF: { dice: 1, perMen: 1, kills: [5, 6] },    HF: { dice: 1, perMen: 1, kills: [6] },     AF: { dice: 1, perMen: 2, kills: [6] },
        LH: { dice: 1, perMen: 2, kills: [6] },       MH: { dice: 1, perMen: 3, kills: [6] },     HH: { dice: 1, perMen: 4, kills: [6] } },
  AF: { LF: { dice: 1, perMen: 1, kills: [4, 5, 6] }, HF: { dice: 1, perMen: 1, kills: [5, 6] },  AF: { dice: 1, perMen: 1, kills: [6] },
        LH: { dice: 1, perMen: 1, kills: [6] },       MH: { dice: 1, perMen: 2, kills: [6] },     HH: { dice: 1, perMen: 3, kills: [6] } },
  LH: { LF: { dice: 2, perMen: 1, kills: [5, 6] },    HF: { dice: 2, perMen: 1, kills: [6] },     AF: { dice: 1, perMen: 1, kills: [6] },
        LH: { dice: 1, perMen: 1, kills: [6] },       MH: { dice: 1, perMen: 2, kills: [6] },     HH: { dice: 1, perMen: 3, kills: [6] } },
  MH: { LF: { dice: 2, perMen: 1, kills: [4, 5, 6] }, HF: { dice: 2, perMen: 1, kills: [5, 6] },  AF: { dice: 2, perMen: 1, kills: [6] },
        LH: { dice: 1, perMen: 1, kills: [5, 6] },    MH: { dice: 1, perMen: 1, kills: [6] },     HH: { dice: 1, perMen: 2, kills: [6] } },
  HH: { LF: { dice: 4, perMen: 1, kills: [5, 6] },    HF: { dice: 3, perMen: 1, kills: [5, 6] },  AF: { dice: 2, perMen: 1, kills: [5, 6] },
        LH: { dice: 2, perMen: 1, kills: [5, 6] },    MH: { dice: 1, perMen: 1, kills: [5, 6] },   HH: { dice: 1, perMen: 1, kills: [6] } },
});

/** Pole-arm units add +1 die (Appendix A footnote: pike/halberd extra die). */
export const POLEARM_CLASSES = new Set(["HF", "AF"]);
/** Units that gain the charge Impetus Bonus (+1 die) into melee (p.16). */
export const IMPETUS_CLASSES = new Set(["HF", "AF", "LH", "MH", "HH"]);
/** Flank/rear bumps the attacker one class up (p.16 Flank Attack). */
export const CLASS_UP = Object.freeze({ LF: "HF", HF: "AF", LH: "MH", MH: "HH" });
/** Standing horse returns casualties one class down, first round only (p.17). */
export const CLASS_DOWN = Object.freeze({ HH: "MH", MH: "LH", LH: "AF" });
/** Fatigue drops attack AND defense one class (p.10 rules A/B). */
export const FATIGUE_DOWN = Object.freeze({ AF: "HF", HF: "LF", MH: "LH", HH: "MH" });

/* ------------------------------------------------------------------ *
 *  Class-shift helpers (pure).
 * ------------------------------------------------------------------ */

/** Attacker's effective class after fatigue (down) then flank/rear (up). */
export function effectiveAttackerClass(cls, mods = {}) {
  let c = cls;
  if (mods.fatigued) c = FATIGUE_DOWN[c] || c;
  if (mods.flank || mods.rear) c = CLASS_UP[c] || c;
  return c;
}

/** Flank/rear on a top-class attacker (no CLASS_UP) converts to a +1 die bonus. */
export function classBumpsToBonus(cls, mods = {}) {
  let c = cls;
  if (mods.fatigued) c = FATIGUE_DOWN[c] || c;
  return !!(mods.flank || mods.rear) && !(c in CLASS_UP);
}

/** Defender's return class: fatigue (down) then standing-horse (down). */
export function effectiveDefenderReturnClass(cls, defender = {}) {
  let c = cls;
  if (defender.fatigued) c = FATIGUE_DOWN[c] || c;
  if (defender.standingHorseFirstRound) c = CLASS_DOWN[c] || c;
  return c;
}

/** A +bonus to the die score widens the kill set downward (e.g. 6 → 5,6). */
export function applyDieBonus(kills, bonus) {
  if (!bonus) return kills.slice();
  const out = new Set(kills);
  const min = Math.min(...kills);
  for (let v = min - bonus; v < min; v++) if (v >= 1 && v <= 6) out.add(v);
  return [...out].sort((a, b) => a - b);
}

/** Roll a pool, count kills. diePenalty (bright light) lowers each die first. */
export function rollKills(numDice, kills, rng, diePenalty = 0) {
  const dice = [];
  let n = 0;
  for (let i = 0; i < numDice; i++) {
    const r = Math.max(0, rollDie(rng) - diePenalty);
    dice.push(r);
    if (kills.includes(r)) n++;
  }
  return { dice, kills: n };
}

/* ------------------------------------------------------------------ *
 *  One melee round.
 * ------------------------------------------------------------------ */

/**
 * Build one side's offensive roll vs a target class.
 * @returns {object} the per-side result block (without casualties, set later)
 */
function rollSide(side, targetType, opts) {
  const sT = typeById(side.type);
  if (!sT) throw new TypeError(`mass-combat: unknown troop type "${side.type}"`);

  // attackClassOverride swaps the OFFENSIVE row only (wolf biting "as a man");
  // the unit is still struck on its own defend class.
  const baseCls = side.attackClassOverride || sT.cls;
  const eff = effectiveAttackerClass(baseCls, side);
  const flankBonus = classBumpsToBonus(baseCls, side);

  // Class the roller scores against — target's defend class, dropped one for a
  // fatigued target (p.10 rule B).
  const tT = typeById(targetType);
  let targetCls = opts.targetDefendClass ?? (tT?.cls ?? targetType);
  if (opts.targetFatigued) targetCls = FATIGUE_DOWN[targetCls] || targetCls;

  const row = COMBAT[eff]?.[targetCls];
  if (!row) throw new Error(`mass-combat: no combat row ${eff} vs ${targetCls}`);

  let dpm = row.dice / row.perMen;
  const polearm = POLEARM_CLASSES.has(baseCls) && side.polearm;
  if (polearm) dpm += 1;
  const impetus = IMPETUS_CLASSES.has(baseCls) && side.impetus;
  if (impetus) dpm += 1;

  const count = side.activeCount ?? side.count;
  const totalDice = Math.floor(count * dpm) + (side.bonusDice || 0);
  const kills = applyDieBonus(row.kills, (flankBonus ? 1 : 0) + (side.dieScoreBonus || 0));
  const diePenalty = side.diePenalty || 0;
  const roll = rollKills(totalDice, kills, opts.rng, diePenalty);

  return {
    type: sT.id,
    startCount: side.count,
    effectiveClass: eff,
    dicePerMan: dpm,
    totalDice,
    polearmApplied: polearm,
    impetusApplied: impetus,
    flankBumpToBonus: flankBonus,
    fatigueApplied: !!side.fatigued,
    diePenalty,
    killScores: kills,
    dice: roll.dice,
    killsDealt: roll.kills,
  };
}

/**
 * Resolve one melee round between two bodies of like troops.
 *
 * Each side object:
 *   { type, count, activeCount?, polearm?, impetus?, fatigued?, flank?, rear?,
 *     standingHorseFirstRound?, attackClassOverride?, defendType?, bonusDice?,
 *     dieScoreBonus?, diePenalty? }
 *
 *   rear (on attacker) — defender delivers NO return blow (p.16 Rear Attack)
 *                        and the attacker already took the flank +1 die.
 *   defendType         — explicit class the OTHER side rolls against (overrides
 *                        the type's defendCls; for special asymmetries).
 *
 * @param {{attacker:object, defender:object, rng?:()=>number}} contest
 * @returns {{attacker:object, defender:object}} per-side blocks with dice,
 *          killsDealt, casualties, surviving.
 */
export function resolveMassMelee({ attacker, defender, rng = Math.random }) {
  const aT = typeById(attacker.type);
  const dT = typeById(defender.type);
  if (!aT || !dT) throw new TypeError("mass-combat: both sides need a known type");

  const result = { attacker: {}, defender: {} };

  // Attacker strikes the defender's defend class.
  result.attacker = rollSide(attacker, defender.type, {
    rng,
    targetDefendClass: defender.defendType || dT.defendCls || dT.cls,
    targetFatigued: !!defender.fatigued,
  });

  if (attacker.rear) {
    // Rear attack: no return blow.
    result.defender = {
      type: dT.id, startCount: defender.count, effectiveClass: dT.cls,
      dicePerMan: 0, totalDice: 0, polearmApplied: false, impetusApplied: false,
      standingHorseApplied: false, fatigueApplied: !!defender.fatigued,
      diePenalty: 0, killScores: [], dice: [], killsDealt: 0, noReturn: true,
    };
  } else {
    // Defender returns. Bake the full return class once (fatigue then standing
    // horse) into the override, and DON'T let rollSide re-apply fatigue — pass
    // fatigued/flank/rear false so the class isn't dropped twice. Pole-arm and
    // any commander dice still ride along via the spread.
    const dBaseCls = defender.attackClassOverride || dT.cls;
    const dRetCls = effectiveDefenderReturnClass(dBaseCls, defender);
    const afterFatigue = defender.fatigued ? (FATIGUE_DOWN[dBaseCls] || dBaseCls) : dBaseCls;
    const block = rollSide(
      { ...defender, attackClassOverride: dRetCls, fatigued: false, flank: false, rear: false },
      attacker.type,
      { rng, targetDefendClass: attacker.defendType || aT.defendCls || aT.cls, targetFatigued: !!attacker.fatigued }
    );
    block.fatigueApplied = !!defender.fatigued;
    // Standing horse fired only if the rule was set AND it actually lowered the
    // post-fatigue class — never inferred from a net change (that was fatigue).
    block.standingHorseApplied = !!defender.standingHorseFirstRound && CLASS_DOWN[afterFatigue] !== undefined;
    result.defender = block;
  }

  // Casualties are FIGURES ACTUALLY REMOVED — capped at the body's strength, so
  // overkill dice can't report killing more figures than exist (and post-melee
  // compares real losses). killsDealt keeps the raw scoring dice on each block.
  result.attacker.casualties = Math.min(result.defender.killsDealt, attacker.count);
  result.attacker.surviving = Math.max(0, attacker.count - result.attacker.casualties);
  result.defender.casualties = Math.min(result.attacker.killsDealt, defender.count);
  result.defender.surviving = Math.max(0, defender.count - result.defender.casualties);
  return result;
}

/* ------------------------------------------------------------------ *
 *  Bridges into the existing morale + fighting-capability engines.
 * ------------------------------------------------------------------ */

/**
 * Build a postMeleeMorale() side from a mass-melee outcome block (one side).
 * The Morale Rating comes from the troop type, the survivor count from the
 * melee result. Pass an optional army-commander/Hero `bonus`.
 */
export function massSideForMorale(name, outcomeBlock, { bonus = 0 } = {}) {
  const t = typeById(outcomeBlock.type);
  const rating = t?.morale ?? 4;
  const surviving = Math.max(0, outcomeBlock.surviving ?? 0);
  return {
    name,
    casualties: Math.max(0, outcomeBlock.casualties ?? 0),
    original: outcomeBlock.startCount ?? surviving + (outcomeBlock.casualties ?? 0),
    survivors: surviving > 0 ? [{ count: surviving, rating }] : [],
    bonus,
  };
}

/**
 * Build a lossCheck() input that honors the troop type's EXPLICIT Loss line
 * (more faithful than the rating-derived reconstruction for Light Horse etc.).
 * lossCheck reads `rating`; we instead surface the exact line so the caller can
 * compare directly. Returns null for types with no Loss entry.
 */
export function massLossLine(typeId) {
  const t = typeById(typeId);
  return t?.loss ? { threshold: t.loss.pct, scoreToRemain: t.loss.score } : null;
}

/* ------------------------------------------------------------------ *
 *  Self-tests — Node only (`node module/rules/mass-combat.mjs`).
 * ------------------------------------------------------------------ */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };

  // T1: Appendix A spot-checks — the matrix is verbatim.
  ok(COMBAT.LF.HH.perMen === 4 && COMBAT.LF.HH.kills.join() === "6", "T1 LF vs HH = 1 die/4 men, 6");
  ok(COMBAT.HH.LF.dice === 4 && COMBAT.HH.LF.kills.join() === "5,6", "T1 HH vs LF = 4 dice/man, 5-6");

  // T1b: canonical movement and post-melee morale data stay aligned with the
  // Chainmail p.10 / p.15 tables. These are the values consumed by Unit actors.
  ok(movementFor("AF").move === 6 && movementFor("AF").charge === 6, "T1b Armored Foot 6 move / 6 charge");
  ok(movementFor("MH").move === 18 && movementFor("MH").charge === 24, "T1b Medium Horse 18 / 24");
  ok(movementFor("HH").move === 12 && movementFor("HH").charge === 18, "T1b Heavy Horse 12 / 18");
  ok(typeById("MH").morale === 8, "T1b Medium Horse morale 8");
  ok(typeById("HH").morale === 9 && typeById("MK").morale === 9, "T1b Heavy Horse / Mounted Knights morale 9");
  ok(COMBAT.AF.LF.kills.join() === "4,5,6", "T1 AF vs LF = 4-6 kills");

  // T2: dice-per-man math. 10 Heavy Horse vs 20 Heavy Foot (the morale worked
  // example): HH vs HF = 3 dice/man → 30 dice on 5,6; HF returns vs HH = 1
  // die/4 men → floor(20/4)=5 dice on 6.
  {
    const r = resolveMassMelee({
      attacker: { type: "HH", count: 10 },
      defender: { type: "HF", count: 20 },
      rng: forceDice(Array(64).fill(1)), // all 1s → no kills, just count dice
    });
    ok(r.attacker.totalDice === 30 && r.attacker.killScores.join() === "5,6", "T2 HH 30 dice on 5-6");
    ok(r.defender.totalDice === 5 && r.defender.killScores.join() === "6", "T2 HF 5 dice on 6");
    ok(r.attacker.killsDealt === 0 && r.defender.killsDealt === 0, "T2 all-1s → no kills");
  }

  // T3: kills land and casualties cross over. All-6s: HH 30 dice all kill, but
  // casualties cap at the 20-figure body (figures removed, not raw dice).
  {
    const r = resolveMassMelee({
      attacker: { type: "HH", count: 10 },
      defender: { type: "HF", count: 20 },
      rng: forceDice(Array(64).fill(6)),
    });
    ok(r.defender.casualties === 20 && r.defender.surviving === 0, "T3 HF wiped, casualties cap at 20");
    ok(r.attacker.killsDealt === 30, "T3 raw killsDealt still 30");
    ok(r.attacker.casualties === 5 && r.attacker.surviving === 5, "T3 HH loses 5 of 10");
  }

  // T4: rear attack — defender returns nothing.
  {
    const r = resolveMassMelee({
      attacker: { type: "HF", count: 10, rear: true },
      defender: { type: "HF", count: 10 },
      rng: forceDice(Array(40).fill(6)),
    });
    ok(r.defender.noReturn && r.defender.totalDice === 0 && r.attacker.casualties === 0, "T4 rear = no return blow");
    // Rear also bumps the attacker a class (HF→AF); HF rear vs HF rolls AF row.
    ok(r.attacker.effectiveClass === "AF", "T4 rear bumps HF attacker to AF");
  }

  // T5: flank on a top-class attacker (no CLASS_UP) converts to a +1 die bonus
  // that widens the kill set. HH attacking HH normally kills on 6; flanked, the
  // bonus widens to 5,6.
  {
    const r = resolveMassMelee({
      attacker: { type: "HH", count: 3, flank: true },
      defender: { type: "HH", count: 3 },
      rng: forceDice(Array(20).fill(5)),
    });
    ok(r.attacker.flankBumpToBonus && r.attacker.killScores.join() === "5,6", "T5 flanked HH widens to 5-6");
  }

  // T6: pole-arm and impetus each add a die per man (HF 1 die/man → 3 with both).
  {
    const r = resolveMassMelee({
      attacker: { type: "HF", count: 10, polearm: true, impetus: true },
      defender: { type: "HF", count: 10 },
      rng: forceDice(Array(80).fill(1)),
    });
    ok(r.attacker.dicePerMan === 3 && r.attacker.totalDice === 30, "T6 polearm+impetus = 3 dice/man");
    ok(r.attacker.polearmApplied && r.attacker.impetusApplied, "T6 flags set");
  }

  // T7: fatigue drops both attack and defense one class. Fatigued AF attacks as
  // HF; a fatigued target is struck one class softer.
  {
    const r = resolveMassMelee({
      attacker: { type: "AF", count: 10, fatigued: true },
      defender: { type: "AF", count: 10, fatigued: true },
      rng: forceDice(Array(40).fill(1)),
    });
    ok(r.attacker.effectiveClass === "HF" && r.attacker.fatigueApplied, "T7 fatigued AF attacks as HF");
  }

  // T8: asymmetric defend class. Goblins ATTACK as HF but are STRUCK as LF, so
  // an HF attacker rolls the HF-vs-LF row (5,6 kills) against them.
  {
    const r = resolveMassMelee({
      attacker: { type: "HF", count: 5 },
      defender: { type: "GOBLIN", count: 5 },
      rng: forceDice(Array(40).fill(5)),
    });
    ok(r.attacker.killScores.join() === "5,6", "T8 HF strikes goblins on the LF row (5-6)");
  }

  // T9: standing horse returns one class down, first round (HH → MH return row).
  {
    const r = resolveMassMelee({
      attacker: { type: "HF", count: 10 },
      defender: { type: "HH", count: 10, standingHorseFirstRound: true },
      rng: forceDice(Array(60).fill(1)),
    });
    ok(r.defender.standingHorseApplied && r.defender.effectiveClass === "MH", "T9 standing HH returns as MH");
  }

  // T9b: a FATIGUED defender returns exactly ONE class down (regression for the
  // double-fatigue bug). Fatigued AF returns as HF, not LF — and the foot unit
  // is NOT flagged as standing horse.
  {
    const r = resolveMassMelee({
      attacker: { type: "HF", count: 10 },
      defender: { type: "AF", count: 10, fatigued: true },
      rng: forceDice(Array(60).fill(1)),
    });
    ok(r.defender.effectiveClass === "HF", "T9b fatigued AF defender returns as HF (one class)");
    ok(r.defender.fatigueApplied && !r.defender.standingHorseApplied, "T9b fatigue flagged, not standing horse");
  }

  // T9c: fatigue AND standing horse stack — fatigued standing HH returns two
  // classes down (HH→MH→LH), both flags set.
  {
    const r = resolveMassMelee({
      attacker: { type: "HF", count: 10 },
      defender: { type: "HH", count: 10, fatigued: true, standingHorseFirstRound: true },
      rng: forceDice(Array(60).fill(1)),
    });
    ok(r.defender.effectiveClass === "LH", "T9c fatigued standing HH returns as LH");
    ok(r.defender.fatigueApplied && r.defender.standingHorseApplied, "T9c both flags set");
  }

  // T10: morale + loss bridges produce the shapes the existing engines expect.
  {
    const r = resolveMassMelee({
      attacker: { type: "HH", count: 10 },
      defender: { type: "HF", count: 20 },
      rng: forceDice([...Array(30).fill(6), ...Array(34).fill(1)]), // HH kills ~ defender
    });
    const side = massSideForMorale("Heavy Horse", r.attacker);
    ok(side.survivors.length === 1 && side.survivors[0].rating === 9, "T10 HH side rating 9");
    ok(side.casualties === r.attacker.casualties, "T10 casualties carried");
    const line = massLossLine("LH");
    ok(line.threshold === 0.25 && line.scoreToRemain === 8, "T10 LH explicit Loss line (25%/8+)");
    ok(massLossLine("HH").scoreToRemain === 6, "T10 HH Loss 50%/6+");
  }

  // T11: fuzz — counts never go negative, casualties == opponent kills.
  {
    const ids = TYPES.filter((t) => COMBAT[t.cls]).map((t) => t.id);
    for (let s = 0; s < 3000; s++) {
      const rng = mulberry32(s + 1);
      const at = ids[s % ids.length];
      const dt = ids[(s * 7) % ids.length];
      const r = resolveMassMelee({
        attacker: { type: at, count: 1 + (s % 40), flank: !!(s & 1), polearm: !!(s & 2), impetus: !!(s & 4) },
        defender: { type: dt, count: 1 + ((s * 3) % 40), fatigued: !!(s & 8) },
        rng,
      });
      ok(r.attacker.surviving >= 0 && r.defender.surviving >= 0, `T11 no negative survivors @${s}`);
      ok(r.attacker.casualties === Math.min(r.defender.killsDealt, r.attacker.startCount), `T11 attacker casualties capped @${s}`);
      ok(r.defender.casualties === Math.min(r.attacker.killsDealt, r.defender.startCount), `T11 defender casualties capped @${s}`);
      ok(r.attacker.casualties <= r.attacker.startCount && r.defender.casualties <= r.defender.startCount, `T11 casualties ≤ strength @${s}`);
      ok(r.attacker.killsDealt <= r.attacker.totalDice, `T11 kills ≤ dice @${s}`);
    }
  }

  console.log(`mass-combat.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

/**
 * OD&D — Chainmail engine · morale (post-melee contest & Loss Table)
 * odd-chainmail · module/rules/morale.mjs
 * system 0.1.181 · slice: commander-morale · stamp 0.1.181-commander-morale.1
 *
 * Pure and runtime-free. Two Chainmail subsystems at 1:1 dungeon scale:
 *
 *   POST-MELEE MORALE — the comparative contest after a melee round:
 *     1. fewer-casualties side scores (casualty diff) × 1d6
 *     2. more-survivors side scores the survivor diff
 *     3. each side adds Σ survivors × Morale Rating (by type)
 *     4. the lower total reacts by the difference band; per the book's worked
 *        example the difference is DOUBLED when either side began the melee
 *        with fewer than 20 figures — which in a dungeon is always.
 *
 *   LOSS CHECK — "Instability Due to Excess Casualties": when a side's losses
 *     reach its threshold fraction, roll 2d6 ≥ score-to-remain or flee
 *     (surrounded units surrender instead). The Loss Table's troop-type rows
 *     are RECONSTRUCTED here as a mapping from Morale Rating, the one number
 *     the engine carries (rating ≤4 → 25%/8 … 11+ → 50%/4). A caller with the
 *     exact troop line (mass combat) may pass `line` to override the mapping.
 *
 *   ARMY COMMANDER (p.20) — leadership presence and the commander's special
 *     powers, threaded through both subsystems:
 *       · WITH a unit → +1 to EACH die it rolls (2d6 → +2, the post-melee
 *         die → +1). NEAR (within 12") → +1 to the ROLL (any dice → +1).
 *         The die bonus also models a Hero attached to a unit.
 *       · AUTO-RALLY (commander only, not a mere Hero) → a unit he joins that
 *         would retreat/rout/surrender from the post-melee contest instead
 *         holds in good order (reaction RALLIED). Independent of the bonus.
 *       · commanderLost() → killed/captured cascade: every friendly unit
 *         checks as if it took excess casualties, at -2 from the dice.
 *
 *   RATINGS — Chainmail's Morale Rating. Monsters default to 4 + HD when no
 *     rating is stored (orc 1 HD → 5, ogre 4+1 → 8, both matching the book).
 *     Hero-types, Giants, Dragons, True Trolls, Rocs never check.
 */

import { rollDie, roll2d6, mulberry32, forceDice } from "./dice.mjs";

/** Post-melee reaction bands, keyed by the (possibly doubled) difference. */
export const MoraleReaction = Object.freeze({
  CONTINUE: "continue",   //   0-19  melee continues
  BACK2: "back2",         //  20-39  back 2 moves, good order
  BACK1: "back1",         //  40-59  back 1 move, good order
  RETREAT: "retreat",     //  60-79  retreat 1 move
  ROUT: "rout",           //  80-99  rout 1½ moves
  SURRENDER: "surrender", // 100+    surrender
  RALLIED: "rallied"      // commander auto-rally: held in good order (no flight)
});

export function reactionFor(difference) {
  if (difference >= 100) return MoraleReaction.SURRENDER;
  if (difference >= 80) return MoraleReaction.ROUT;
  if (difference >= 60) return MoraleReaction.RETREAT;
  if (difference >= 40) return MoraleReaction.BACK1;
  if (difference >= 20) return MoraleReaction.BACK2;
  return MoraleReaction.CONTINUE;
}

/** Reactions that count as flight — the ones a commander's auto-rally cancels. */
export const FLIGHT_REACTIONS = Object.freeze(
  new Set([MoraleReaction.RETREAT, MoraleReaction.ROUT, MoraleReaction.SURRENDER])
);

/** Army-commander / Hero presence relative to a unit (p.20). */
export const CommanderBond = Object.freeze({
  NONE: "none",
  NEAR: "near",  // within 12" → +1 to the ROLL
  WITH: "with"   // joined to the unit → +1 to EACH die
});

/**
 * Leadership die bonus for a bond over a roll of `numDice` dice.
 * WITH = +1 per die (2d6 → +2); NEAR = +1 per roll (any → +1); NONE = 0.
 * Models both the army commander and a Hero attached to a unit.
 */
export function commanderBonus(bond, numDice = 1) {
  const n = Math.max(0, Math.trunc(numDice) || 0);
  if (bond === CommanderBond.WITH) return n;
  if (bond === CommanderBond.NEAR) return n > 0 ? 1 : 0;
  return 0;
}

/** Default monster Morale Rating from hit dice (stored rating overrides). */
export function derivedMoraleRating(hdCount) {
  const hd = Math.max(0, Math.trunc(hdCount) || 0);
  return Math.min(12, Math.max(4, 4 + hd));
}

/** Loss Table line for a Morale Rating: casualty threshold + score to remain. */
export function lossLineFor(rating) {
  const r = Math.trunc(rating) || 0;
  if (r <= 4) return { threshold: 1 / 4, scoreToRemain: 8 };
  if (r <= 6) return { threshold: 1 / 3, scoreToRemain: 7 };
  if (r === 7) return { threshold: 1 / 3, scoreToRemain: 6 };
  if (r === 8) return { threshold: 1 / 2, scoreToRemain: 6 };
  if (r <= 10) return { threshold: 1 / 2, scoreToRemain: 5 };
  return { threshold: 1 / 2, scoreToRemain: 4 };
}

/** Σ count × rating over the survivor groups, plus a flat side bonus. */
function moraleScore(side) {
  const groups = Array.isArray(side.survivors) ? side.survivors : [];
  const score = groups.reduce(
    (acc, g) => acc + Math.max(0, Math.trunc(g.count) || 0) * (Math.trunc(g.rating) || 0),
    0
  );
  return score + (Math.trunc(side.bonus) || 0);
}

function survivorCount(side) {
  const groups = Array.isArray(side.survivors) ? side.survivors : [];
  return groups.reduce((acc, g) => acc + Math.max(0, Math.trunc(g.count) || 0), 0);
}

/**
 * Resolve Post Melee Morale between two sides.
 *
 * @param {object} contest
 * @param {object} contest.sideA  { name, casualties, survivors:[{count,rating}],
 *                                  bonus=0, original=casualties+survivors }
 * @param {object} contest.sideB  same shape
 * @param {() => number} [rng=Math.random]
 * @returns {object} { kind:"postMelee", sides, winner, loser, rawDifference,
 *                     doubled, difference, reaction, caption }
 */
export function postMeleeMorale({ sideA, sideB }, rng = Math.random) {
  for (const [label, s] of [["sideA", sideA], ["sideB", sideB]]) {
    if (!s || !Array.isArray(s.survivors)) {
      throw new TypeError(`postMeleeMorale: ${label}.survivors array is required`);
    }
  }

  const build = (side) => ({
    name: side.name ?? "side",
    casualties: Math.max(0, Math.trunc(side.casualties) || 0),
    survivorCount: survivorCount(side),
    moraleScore: moraleScore(side),
    commander: side.commander ?? CommanderBond.NONE,
    autoRally: !!side.autoRally,
    killBonus: null,
    survivorBonus: 0,
    total: 0
  });
  const a = build(sideA);
  const b = build(sideB);
  a.original = Math.max(0, Math.trunc(sideA.original) || 0) || a.casualties + a.survivorCount;
  b.original = Math.max(0, Math.trunc(sideB.original) || 0) || b.casualties + b.survivorCount;

  // 1. Fewer casualties: (diff) × 1d6. A commander/Hero with (or near) the
  //    rolling side adds to that single die (p.20: +1 to the die's score).
  if (a.casualties !== b.casualties) {
    const fewer = a.casualties < b.casualties ? a : b;
    const diff = Math.abs(a.casualties - b.casualties);
    const die = rollDie(rng);
    const cmd = commanderBonus(fewer.commander, 1);
    const effDie = die + cmd;
    fewer.killBonus = { diff, die, commanderBonus: cmd, effDie, total: diff * effDie };
  }

  // 2. More survivors: the diff.
  if (a.survivorCount !== b.survivorCount) {
    const more = a.survivorCount > b.survivorCount ? a : b;
    more.survivorBonus = Math.abs(a.survivorCount - b.survivorCount);
  }

  // 3.-4. Totals; lower reacts.
  for (const s of [a, b]) s.total = s.moraleScore + (s.killBonus?.total ?? 0) + s.survivorBonus;

  const rawDifference = Math.abs(a.total - b.total);
  const doubled = a.original < 20 || b.original < 20;
  const difference = doubled ? rawDifference * 2 : rawDifference;

  let winner = null;
  let loser = null;
  if (a.total !== b.total) {
    winner = a.total > b.total ? a : b;
    loser = a.total > b.total ? b : a;
  }
  const reactionRaw = loser ? reactionFor(difference) : MoraleReaction.CONTINUE;

  // Army-commander auto-rally: a unit the commander JOINED that would flee
  // (retreat/rout/surrender) instead holds in good order. The bonus may already
  // have won the contest; this is the backstop when it didn't.
  let reaction = reactionRaw;
  let autoRallied = false;
  if (loser?.autoRally && FLIGHT_REACTIONS.has(reactionRaw)) {
    reaction = MoraleReaction.RALLIED;
    autoRallied = true;
  }

  return {
    kind: "postMelee",
    sides: [a, b],
    winner: winner?.name ?? null,
    loser: loser?.name ?? null,
    rawDifference,
    doubled,
    difference,
    reaction,
    reactionRaw,
    autoRallied,
    caption: loser
      ? (autoRallied
          ? `${loser.name} would ${reactionRaw} (difference ${difference}${doubled ? ", doubled" : ""}) — commander rallies it`
          : `${loser.name} ${reaction} (difference ${difference}${doubled ? ", doubled" : ""})`)
      : "melee continues (tied totals)"
  };
}

/**
 * Excess-casualties Loss Check for one side or unit.
 *
 * @param {object} check  { name?, original, remaining, rating, bonus=0,
 *                          commander=NONE, line=null, surrounded=false }
 *   commander — bond (WITH → +2 on 2d6, NEAR → +1); stacks on `bonus`.
 *   line      — explicit { threshold, scoreToRemain } to use verbatim instead
 *               of the rating-derived line (mass combat passes the troop's
 *               exact Loss-Table row, faithful where the mapping disagrees).
 * @param {() => number} [rng=Math.random]
 * @returns {object} { kind:"loss", triggered, lostFraction, threshold, roll,
 *                     needed, holds, outcome, caption }
 */
export function lossCheck({ name, original, remaining, rating, bonus = 0, commander = CommanderBond.NONE, line = null, surrounded = false }, rng = Math.random) {
  const o = Math.max(1, Math.trunc(original) || 1);
  const rem = Math.min(o, Math.max(0, Math.trunc(remaining) || 0));
  const lostFraction = (o - rem) / o;
  const lossLine = line ?? lossLineFor(rating);
  const unitName = name ?? "unit";

  // Below the threshold no check is required.
  if (lostFraction < lossLine.threshold) {
    return {
      kind: "loss",
      name: unitName,
      original: o,
      remaining: rem,
      lostFraction,
      threshold: lossLine.threshold,
      triggered: false,
      roll: null,
      needed: lossLine.scoreToRemain,
      holds: true,
      outcome: "stand",
      caption: `${unitName} is under the loss threshold — no check required`
    };
  }

  const r = roll2d6(rng);
  const cmd = commanderBonus(commander, 2);
  const flatBonus = (Math.trunc(bonus) || 0) + cmd;
  const total = r.total + flatBonus;
  const holds = total >= lossLine.scoreToRemain;
  const outcome = holds ? "stand" : surrounded ? "surrender" : "flee";

  return {
    kind: "loss",
    name: unitName,
    original: o,
    remaining: rem,
    lostFraction,
    threshold: lossLine.threshold,
    triggered: true,
    roll: { dice: r.dice, total: r.total, bonus: flatBonus, commanderBonus: cmd, modified: total },
    needed: lossLine.scoreToRemain,
    holds,
    outcome,
    caption: holds
      ? `${unitName} stands (${total} vs ${lossLine.scoreToRemain}+)`
      : `${unitName} ${outcome === "surrender" ? "surrenders — no route of retreat" : "breaks and flees"} (${total} vs ${lossLine.scoreToRemain}+)`
  };
}

/**
 * Army commander killed or captured (p.20): every friendly unit immediately
 * checks as if it took excess casualties, at -2 from the dice. The check is
 * FORCED — no casualty threshold gate — and the commander's bonuses are gone.
 *
 * @param {Array<{name?, rating, line?, surrounded?}>} units
 * @param {() => number} [rng=Math.random]
 * @returns {Array<object>} one loss-style result per unit
 */
export function commanderLost(units, rng = Math.random) {
  const list = Array.isArray(units) ? units : [];
  return list.map((u) => {
    const lossLine = u.line ?? lossLineFor(u.rating);
    const r = roll2d6(rng);
    const total = r.total - 2;
    const holds = total >= lossLine.scoreToRemain;
    const outcome = holds ? "stand" : u.surrounded ? "surrender" : "flee";
    const name = u.name ?? "unit";
    return {
      kind: "commanderLost",
      name,
      needed: lossLine.scoreToRemain,
      roll: { dice: r.dice, total: r.total, penalty: -2, modified: total },
      holds,
      outcome,
      caption: holds
        ? `${name} holds despite the loss of its commander (${total} vs ${lossLine.scoreToRemain}+)`
        : `${name} ${outcome === "surrender" ? "surrenders" : "breaks"} — commander lost (${total} vs ${lossLine.scoreToRemain}+)`
    };
  });
}

/* ------------------------------------------------------------------ *
 *  Self-tests — Node only (`node module/rules/morale.mjs`).
 * ------------------------------------------------------------------ */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };

  // T1: the book's worked example. 10 HH (MR 9) attack 20 HF (MR 5), kill 8,
  // lose 2; assumed die roll 3. HH: 6×3 + 9×8 = 90. HF: 4 + 5×12 = 64.
  // Difference 26, doubled to 52 -> back 1 move, good order.
  {
    const r = postMeleeMorale(
      {
        sideA: { name: "Heavy Horse", casualties: 2, original: 10, survivors: [{ count: 8, rating: 9 }] },
        sideB: { name: "Heavy Foot", casualties: 8, original: 20, survivors: [{ count: 12, rating: 5 }] }
      },
      forceDice([3])
    );
    ok(r.sides[0].total === 90 && r.sides[1].total === 64, "T1 totals 90 vs 64");
    ok(r.rawDifference === 26 && r.doubled && r.difference === 52, "T1 26 doubled to 52");
    ok(r.loser === "Heavy Foot" && r.reaction === MoraleReaction.BACK1, "T1 HF back 1, good order");
  }

  // T2: reaction bands.
  {
    ok(reactionFor(0) === "continue" && reactionFor(19) === "continue", "T2 0-19 continue");
    ok(reactionFor(20) === "back2" && reactionFor(39) === "back2", "T2 20-39 back2");
    ok(reactionFor(40) === "back1" && reactionFor(59) === "back1", "T2 40-59 back1");
    ok(reactionFor(60) === "retreat" && reactionFor(79) === "retreat", "T2 60-79 retreat");
    ok(reactionFor(80) === "rout" && reactionFor(99) === "rout", "T2 80-99 rout");
    ok(reactionFor(100) === "surrender" && reactionFor(500) === "surrender", "T2 100+ surrender");
  }

  // T3: tied totals — melee continues, nobody reacts.
  {
    const r = postMeleeMorale(
      {
        sideA: { name: "A", casualties: 3, original: 10, survivors: [{ count: 7, rating: 5 }] },
        sideB: { name: "B", casualties: 3, original: 10, survivors: [{ count: 7, rating: 5 }] }
      },
      forceDice([6])
    );
    ok(r.loser === null && r.reaction === "continue", "T3 tie continues");
    ok(!r.sides[0].killBonus && !r.sides[1].killBonus, "T3 no kill bonus on equal casualties");
  }

  // T4: no doubling at 20+ per side; mixed survivor groups sum by rating.
  {
    const r = postMeleeMorale(
      {
        sideA: { name: "A", casualties: 0, original: 30, survivors: [{ count: 20, rating: 5 }, { count: 10, rating: 7 }] },
        sideB: { name: "B", casualties: 10, original: 30, survivors: [{ count: 20, rating: 4 }] }
      },
      forceDice([2])
    );
    // A: 10×2 + (170) + 10 = 200; B: 80. diff 120, NOT doubled -> surrender.
    ok(r.sides[0].moraleScore === 170 && r.sides[0].total === 200, "T4 mixed groups sum");
    ok(!r.doubled && r.difference === 120 && r.reaction === "surrender", "T4 no doubling, surrender");
  }

  // T5: side bonus (army commander style) lands in the total.
  {
    const r = postMeleeMorale(
      {
        sideA: { name: "A", casualties: 1, original: 5, survivors: [{ count: 4, rating: 5 }], bonus: 10 },
        sideB: { name: "B", casualties: 1, original: 5, survivors: [{ count: 4, rating: 5 }] }
      },
      forceDice([1])
    );
    ok(r.sides[0].total === 30 && r.sides[1].total === 20, "T5 bonus added");
    ok(r.loser === "B", "T5 bonus decides it");
  }

  // T6: derived monster ratings calibrate to the book.
  {
    ok(derivedMoraleRating(1) === 5, "T6 orc (1 HD) -> 5");
    ok(derivedMoraleRating(4) === 8, "T6 ogre (4+1 HD) -> 8");
    ok(derivedMoraleRating(0) === 4 && derivedMoraleRating(20) === 12, "T6 clamped 4..12");
  }

  // T7: loss line mapping is monotone in the rating.
  {
    ok(lossLineFor(4).scoreToRemain === 8 && lossLineFor(4).threshold === 0.25, "T7 rating 4");
    ok(lossLineFor(5).scoreToRemain === 7, "T7 rating 5");
    ok(lossLineFor(7).scoreToRemain === 6, "T7 rating 7");
    ok(lossLineFor(9).scoreToRemain === 5 && lossLineFor(9).threshold === 0.5, "T7 rating 9");
    ok(lossLineFor(12).scoreToRemain === 4, "T7 rating 12");
  }

  // T8: loss check — under threshold no roll; over threshold stand/flee/surrender.
  {
    const under = lossCheck({ original: 12, remaining: 10, rating: 5 }, forceDice([6, 6]));
    ok(!under.triggered && under.outcome === "stand" && under.roll === null, "T8 under threshold");

    const stands = lossCheck({ original: 12, remaining: 6, rating: 5 }, forceDice([4, 4]));
    ok(stands.triggered && stands.holds && stands.outcome === "stand", "T8 8 vs 7+ stands");

    const flees = lossCheck({ original: 12, remaining: 6, rating: 5 }, forceDice([2, 2]));
    ok(flees.triggered && !flees.holds && flees.outcome === "flee", "T8 4 vs 7+ flees");

    const caught = lossCheck({ original: 12, remaining: 6, rating: 5, surrounded: true }, forceDice([2, 2]));
    ok(caught.outcome === "surrender", "T8 surrounded failure surrenders");

    const rallied = lossCheck({ original: 12, remaining: 6, rating: 5, bonus: 3 }, forceDice([2, 2]));
    ok(rallied.holds && rallied.roll.modified === 7, "T8 bonus rides the roll");
  }

  // T9: fuzz invariants.
  {
    for (let s = 0; s < 2000; s++) {
      const rng = mulberry32(s + 1);
      const r = postMeleeMorale(
        {
          sideA: { name: "A", casualties: s % 7, original: 4 + (s % 25), survivors: [{ count: s % 9, rating: 4 + (s % 6) }] },
          sideB: { name: "B", casualties: (s * 3) % 7, original: 4 + ((s * 5) % 25), survivors: [{ count: (s * 7) % 9, rating: 4 + ((s * 3) % 6) }] }
        },
        rng
      );
      ok(r.difference >= 0 && r.difference === (r.doubled ? r.rawDifference * 2 : r.rawDifference), `T9 difference math @${s}`);
      ok(Object.values(MoraleReaction).includes(r.reaction), `T9 reaction valid @${s}`);
      if (r.loser === null) ok(r.reaction === "continue", `T9 tie continues @${s}`);

      const l = lossCheck({ original: 1 + (s % 30), remaining: s % 30, rating: 4 + (s % 9) }, mulberry32(s));
      ok(l.lostFraction >= 0 && l.lostFraction <= 1, `T9 loss fraction bounded @${s}`);
      if (!l.triggered) ok(l.outcome === "stand", `T9 untriggered stands @${s}`);
    }
  }

  // T10: commanderBonus — WITH is per-die, NEAR is per-roll, NONE is nothing.
  {
    ok(commanderBonus(CommanderBond.WITH, 2) === 2 && commanderBonus(CommanderBond.WITH, 1) === 1, "T10 WITH per die");
    ok(commanderBonus(CommanderBond.NEAR, 2) === 1 && commanderBonus(CommanderBond.NEAR, 1) === 1, "T10 NEAR per roll");
    ok(commanderBonus(CommanderBond.NONE, 2) === 0, "T10 NONE = 0");
  }

  // T11: post-melee commander die bonus. Fewer-casualties side rolls the kill
  // die; WITH adds +1 to it. diff 4, die forced 3 → no-cmd total 12; WITH → 16.
  {
    const base = postMeleeMorale({
      sideA: { name: "A", casualties: 1, original: 30, survivors: [{ count: 10, rating: 5 }] },
      sideB: { name: "B", casualties: 5, original: 30, survivors: [{ count: 10, rating: 5 }] }
    }, forceDice([3]));
    ok(base.sides[0].killBonus.total === 12 && base.sides[0].killBonus.commanderBonus === 0, "T11 no-cmd kill total 12");
    const led = postMeleeMorale({
      sideA: { name: "A", casualties: 1, original: 30, commander: CommanderBond.WITH, survivors: [{ count: 10, rating: 5 }] },
      sideB: { name: "B", casualties: 5, original: 30, survivors: [{ count: 10, rating: 5 }] }
    }, forceDice([3]));
    ok(led.sides[0].killBonus.effDie === 4 && led.sides[0].killBonus.total === 16, "T11 WITH kill die 3→4, total 16");
  }

  // T12: auto-rally. A commanded loser that would ROUT instead holds (RALLIED),
  // with the raw reaction preserved; a non-commanded loser still routs.
  {
    const args = {
      sideA: { name: "Few", casualties: 2, original: 12, survivors: [{ count: 4, rating: 5 }] },
      sideB: { name: "Many", casualties: 6, original: 30, survivors: [{ count: 24, rating: 5 }] }
    };
    const plain = postMeleeMorale(args, forceDice([1]));
    ok(plain.loser === "Few" && FLIGHT_REACTIONS.has(plain.reaction), "T12 outnumbered few would flee");
    const rallied = postMeleeMorale({ ...args, sideA: { ...args.sideA, autoRally: true } }, forceDice([1]));
    ok(rallied.reaction === MoraleReaction.RALLIED && rallied.autoRallied, "T12 commander rallies the few");
    ok(rallied.reactionRaw === plain.reaction, "T12 raw reaction preserved");
  }

  // T12b: auto-rally only cancels flight, not orderly fall-backs. A BACK1 loser
  // is left as BACK1 even with a commander.
  {
    // Engineer a small adverse-but-orderly difference (40-59 band).
    const r = postMeleeMorale({
      sideA: { name: "A", casualties: 0, original: 12, autoRally: true, survivors: [{ count: 6, rating: 5 }] },
      sideB: { name: "B", casualties: 0, original: 12, survivors: [{ count: 10, rating: 5 }] }
    }, forceDice([1]));
    // diff = (54-30)=24, doubled = 48 → BACK1; not flight, so not rallied.
    ok(r.reaction === MoraleReaction.BACK1 && !r.autoRallied, "T12b orderly fall-back not rallied");
  }

  // T13: loss-check commander bonus. A roll that fails at 7+ (total 5) passes
  // with WITH (+2 → 7). Forced 2d6 = 2+3.
  {
    const fail = lossCheck({ name: "u", original: 10, remaining: 6, rating: 5 }, forceDice([2, 3]));
    ok(!fail.holds && fail.roll.modified === 5, "T13 unled breaks at 5 vs 7+");
    const led = lossCheck({ name: "u", original: 10, remaining: 6, rating: 5, commander: CommanderBond.WITH }, forceDice([2, 3]));
    ok(led.holds && led.roll.commanderBonus === 2 && led.roll.modified === 7, "T13 WITH holds at 7");
  }

  // T14: explicit line override beats the rating map. Light Horse (rating 6)
  // mapped → 33⅓%/7; the faithful Light line is 25%/8. With 30% lost the map
  // wouldn't even trigger, but the explicit line does.
  {
    const mapped = lossCheck({ name: "LH", original: 10, remaining: 7, rating: 6 }, forceDice([4, 4]));
    ok(!mapped.triggered, "T14 rating map (33%) untriggered at 30% lost");
    const faithful = lossCheck({ name: "LH", original: 10, remaining: 7, rating: 6, line: { threshold: 0.25, scoreToRemain: 8 } }, forceDice([4, 4]));
    ok(faithful.triggered && faithful.needed === 8, "T14 explicit Light line triggers at 8+");
  }

  // T15: commander killed/captured cascade — forced check at -2, no threshold.
  {
    const out = commanderLost([
      { name: "Levy", rating: 5 },     // 7+ ; 2d6=6 → 4 vs 7 → breaks
      { name: "Guard", rating: 5 }     // 7+ ; 2d6=10 → 8 vs 7 → holds
    ], forceDice([3, 3, 5, 5]));
    ok(out[0].roll.modified === 4 && !out[0].holds && out[0].kind === "commanderLost", "T15 levy breaks at -2");
    ok(out[1].roll.modified === 8 && out[1].holds, "T15 guard holds at -2");
  }

  console.log(`morale.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  // Cross-platform main-module check (Windows paths differ from file:// URLs).
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

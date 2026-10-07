/**
 * BOOT HILL 2e · Brawls (Punching and Grappling Tables)
 * Roll two percentile dice and add the digits (2–20), plus any carried
 * modifier. Two rounds per game turn; first blow goes to the higher SPEED
 * ability score unless surprised, ties roll off once (ERRATA 3).
 *
 * Carried modifiers ("next round + or −") attach to a character and are
 * spent on that character's next roll — a brawl roll, or ×10% on a shot.
 * The book example spends them on the very next roll even inside the same
 * round (Juan's −2 from being thrown), so that is the rule here.
 *
 * Holds (arm locks, head lock, bear hug) persist without rerolling; the
 * holder may maintain one for its effect again each round. A held character
 * breaks free only on a grappling 15, 16 or 3-or-less; a bear hug allows
 * grappling only; an arm lock leaves one arm to punch with.
 * Brawl damage is separate from wounds and never raises the survival flag.
 */
import { makeChecker, isMain } from "./selftest.mjs";
import { rollD10 } from "./dice.mjs";

export function brawlRoll(rng = Math.random) {
  const dice = [rollD10(rng), rollD10(rng)];
  return { dice, total: dice[0] + dice[1] };
}

/** left/right = effect when punching with the off arm / the dominant arm (ERRATA 12). */
const PUNCH = [
  { max: 2, result: "miss", label: "Miss", left: 0, right: 0, opponent: 2 },
  { max: 4, result: "miss", label: "Miss", left: 0, right: 0, opponent: 1 },
  { max: 7, result: "miss", label: "Miss", left: 0, right: 0, opponent: 0 },
  { max: 9, result: "blocked", label: "Blocked", left: 0, right: 0, opponent: 0 },
  { max: 13, result: "glancing", label: "Glancing blow", left: 1, right: 1, opponent: 0 },
  { max: 14, result: "jab", label: "Jab", left: 1, right: 2, opponent: 0 },
  { max: 15, result: "hook", label: "Hook", left: 2, right: 2, opponent: 0 },
  { max: 16, result: "combination", label: "Combination", left: 2, right: 2, opponent: -1, combination: true },
  { max: 17, result: "rabbit", label: "Rabbit punch", left: 2, right: 3, opponent: -1 },
  { max: 18, result: "uppercut", label: "Uppercut", left: 2, right: 3, opponent: -2 },
  { max: Infinity, result: "haymaker", label: "Haymaker", left: 3, right: 4, opponent: -3 }
];

const GRAPPLE = [
  { max: 1, result: "kneed", label: "Opponent knees you", self: 4, you: -4, heldBreaks: true },
  { max: 3, result: "gouged", label: "Opponent gouges you", self: 1, you: -2, heldBreaks: true },
  { max: 5, result: "noHold", label: "No hold", opponent: 2 },
  { max: 7, result: "noHold", label: "No hold", opponent: 1 },
  { max: 9, result: "noHold", label: "No hold" },
  { max: 11, result: "armLockLeft", label: "Arm lock, left", effect: 2, opponent: -1, hold: "armLockLeft" },
  { max: 13, result: "armLockRight", label: "Arm lock, right", effect: 2, opponent: -1, hold: "armLockRight" },
  { max: 14, result: "elbowSmash", label: "Elbow smash", effect: 2, opponent: -1 },
  { max: 16, result: "throw", label: "Throw", effect: 2, opponent: -2, heldBreaks: true },
  { max: 17, result: "kick", label: "Kick", effect: 3, opponent: -1 },
  { max: 18, result: "headLock", label: "Head lock", effect: 4, opponent: -2, hold: "headLock" },
  { max: Infinity, result: "bearHug", label: "Bear hug", effect: 1, opponent: -4, hold: "bearHug" }
];

export const HOLDS = Object.freeze({
  armLockLeft: { label: "Arm lock, left", effect: 2, opponent: -1 },
  armLockRight: { label: "Arm lock, right", effect: 2, opponent: -1 },
  headLock: { label: "Head lock", effect: 4, opponent: -2 },
  bearHug: { label: "Bear hug", effect: 1, opponent: -4 }
});

export const BRAWL_WEAPONS = Object.freeze({
  club: { label: "Club, gun butt or barrel", roll: -1, effect: 1 },
  chair: { label: "Chair or other large object", roll: -2, effect: 2 },
  knife: { label: "Knife or tomahawk", roll: 0, wound: true }
});

export function punchResult(score, { arm = "right", dominant = "right", oneArmFree = false, weapon = null } = {}) {
  const row = PUNCH.find((r) => score <= r.max);
  const w = weapon ? BRAWL_WEAPONS[weapon] : null;
  if (weapon && !w) throw new Error(`punchResult: unknown weapon ${weapon}`);
  const hit = row.left > 0 || row.right > 0;
  let effect = arm === dominant ? row.right : row.left;
  if (row.combination && !oneArmFree) effect = 4;
  if (hit && w?.effect) effect += w.effect;
  return {
    table: "punch", score, result: row.result, label: row.label, hit,
    effect: hit && w?.wound ? 0 : effect,
    woundRoll: !!(hit && w?.wound),
    opponentNext: row.opponent, selfNext: 0
  };
}

export function grappleResult(score, { held = false } = {}) {
  const row = GRAPPLE.find((r) => score <= r.max);
  if (held) {
    if (!row.heldBreaks) return { table: "grapple", score, result: "noEffect", label: "No effect (held)", breaksHold: false, effect: 0, selfEffect: 0, opponentNext: 0, selfNext: 0, hold: null };
    if (row.result === "throw") return { table: "grapple", score, result: "throw", label: "Breaks hold and throws", breaksHold: true, effect: row.effect, selfEffect: 0, opponentNext: row.opponent, selfNext: 0, hold: null };
    return { table: "grapple", score, result: "breaksHold", label: "Breaks hold", breaksHold: true, effect: 0, selfEffect: 0, opponentNext: 0, selfNext: 0, hold: null };
  }
  return {
    table: "grapple", score, result: row.result, label: row.label, breaksHold: false,
    effect: row.effect ?? 0, selfEffect: row.self ?? 0,
    opponentNext: row.opponent ?? 0, selfNext: row.you ?? 0, hold: row.hold ?? null
  };
}

/** Order of action: SPEED ability scores; the surprised side loses first blow; ties roll off once. */
export function firstBlow(a, b, rng = Math.random) {
  if (a.surprised && !b.surprised) return [b.id, a.id];
  if (b.surprised && !a.surprised) return [a.id, b.id];
  if (a.speedScore !== b.speedScore) return a.speedScore > b.speedScore ? [a.id, b.id] : [b.id, a.id];
  for (;;) {
    const ra = rollD10(rng), rb = rollD10(rng);
    if (ra !== rb) return ra > rb ? [a.id, b.id] : [b.id, a.id];
  }
}

/**
 * fighters: [{ id, strengthScore, dominant, speedScore, surprised, damage? }]
 * The order is fixed at the start and kept for the whole brawl.
 */
export function startBrawl(fighters, rng = Math.random) {
  if (fighters.length !== 2) throw new Error("startBrawl: two fighters");
  const order = firstBlow(fighters[0], fighters[1], rng);
  const state = { order, round: 1, acted: [], fighters: {}, holds: [], log: [] };
  for (const f of fighters) {
    state.fighters[f.id] = { id: f.id, strengthScore: f.strengthScore, dominant: f.dominant ?? "right", damage: f.damage ?? 0, carry: 0, out: false };
  }
  return state;
}

const clone = (s) => JSON.parse(JSON.stringify(s));
export const opponentOf = (state, id) => state.order.find((x) => x !== id);
export const holdOn = (state, id) => state.holds.find((h) => h.target === id) ?? null;
export const holdBy = (state, id) => state.holds.find((h) => h.holder === id) ?? null;
export const nextToAct = (state) => state.order.find((id) => !state.acted.includes(id) && !state.fighters[id].out) ?? null;

function hurt(state, id, points) {
  const f = state.fighters[id];
  f.damage += points;
  if (f.strengthScore - f.damage <= 0) f.out = true;
}

/**
 * action: { type: "punch" | "grapple" | "maintain", weapon?, arm?, raw?, dice? }.
 * raw is the unmodified 2–20 total (from Foundry's Roll or a test); without it
 * the kernel rolls with rng. Returns the new state; the event is state.log's last entry.
 */
export function brawlAction(input, actorId, action, rng = Math.random) {
  const state = clone(input);
  if (nextToAct(state) !== actorId) throw new Error(`brawlAction: not ${actorId}'s turn`);
  const me = state.fighters[actorId];
  const foeId = opponentOf(state, actorId);
  const foe = state.fighters[foeId];
  const onMe = holdOn(state, actorId);
  const mine = holdBy(state, actorId);
  let event;

  if (action.type === "maintain") {
    if (!mine) throw new Error("brawlAction: no hold to maintain");
    const h = HOLDS[mine.hold];
    hurt(state, foeId, h.effect);
    foe.carry += h.opponent;
    event = { actor: actorId, type: "maintain", hold: mine.hold, effect: h.effect, opponentNext: h.opponent };
  } else {
    if (mine) state.holds = state.holds.filter((x) => x !== mine);
    if (action.type === "punch" && onMe?.hold === "bearHug") throw new Error("brawlAction: a bear hug allows grappling only");
    const roll = action.raw != null ? { dice: action.dice ?? null, total: action.raw } : brawlRoll(rng);
    const carry = me.carry;
    me.carry = 0;
    if (action.type === "punch") {
      const w = action.weapon ? BRAWL_WEAPONS[action.weapon] : null;
      const lockedArm = onMe?.hold === "armLockLeft" ? "left" : onMe?.hold === "armLockRight" ? "right" : null;
      const arm = lockedArm ? (lockedArm === "left" ? "right" : "left") : (action.arm ?? me.dominant);
      if (lockedArm && action.arm === lockedArm) throw new Error("brawlAction: that arm is locked");
      const score = roll.total + carry + (w?.roll ?? 0);
      const r = punchResult(score, { arm, dominant: me.dominant, oneArmFree: !!lockedArm, weapon: action.weapon });
      if (r.effect) hurt(state, foeId, r.effect);
      foe.carry += r.opponentNext;
      event = { actor: actorId, type: "punch", roll: roll.total, dice: roll.dice, carry, weaponRoll: w?.roll ?? 0, arm, ...r };
    } else if (action.type === "grapple") {
      const score = roll.total + carry;
      const r = grappleResult(score, { held: !!onMe });
      if (r.breaksHold) state.holds = state.holds.filter((x) => x !== onMe);
      if (r.effect) hurt(state, foeId, r.effect);
      if (r.selfEffect) hurt(state, actorId, r.selfEffect);
      foe.carry += r.opponentNext;
      me.carry += r.selfNext;
      if (r.hold) state.holds = [...state.holds.filter((x) => x.holder !== actorId && x.target !== foeId), { holder: actorId, target: foeId, hold: r.hold }];
      event = { actor: actorId, type: "grapple", roll: roll.total, dice: roll.dice, carry, ...r };
    } else {
      throw new Error(`brawlAction: unknown action ${action.type}`);
    }
  }

  for (const f of Object.values(state.fighters)) if (f.out) state.holds = state.holds.filter((h) => h.holder !== f.id);
  event.round = state.round;
  state.log.push(event);
  state.acted.push(actorId);
  if (!nextToAct(state)) {
    state.round += 1;
    state.acted = [];
  }
  return state;
}

export const brawlOver = (state) => Object.values(state.fighters).some((f) => f.out);

/** The ±N a character still carries, as a shot modifier (×10%). */
export const carryToShot = (state, id) => 10 * (state.fighters[id]?.carry ?? 0);

export function runSelfTests() {
  const { ok, eq, count } = makeChecker();
  eq(punchResult(13).result, "glancing", "13 glancing");
  eq(punchResult(14).effect, 2, "jab dominant arm 2");
  eq(punchResult(14, { arm: "left" }).effect, 1, "jab off arm 1");
  eq(punchResult(14, { arm: "left", dominant: "left" }).effect, 2, "left-hander dominant left");
  eq(punchResult(16).effect, 4, "combination 2+2");
  eq(punchResult(16, { oneArmFree: true }).effect, 2, "combination one arm 2");
  eq(punchResult(19).effect, 4, "haymaker 4");
  eq(punchResult(25).opponentNext, -3, "haymaker opponent -3");
  eq(punchResult(2).opponentNext, 2, "wild miss gives opponent +2");
  ok(!punchResult(9).hit, "8-9 blocked");
  eq(punchResult(13, { weapon: "club" }).effect, 2, "club +1 on a hit");
  eq(punchResult(9, { weapon: "chair" }).effect, 0, "no weapon bonus on a block");
  ok(punchResult(10, { weapon: "knife" }).woundRoll, "knife hit rolls the Wound Chart");

  eq(grappleResult(1).selfEffect, 4, "kneed 4 to self");
  eq(grappleResult(3).selfNext, -2, "gouged -2 to self");
  eq(grappleResult(11).hold, "armLockLeft", "11 arm lock left");
  eq(grappleResult(11).effect, 2, "arm lock left 2 (ERRATA 1)");
  eq(grappleResult(18).hold, "headLock", "18 head lock");
  eq(grappleResult(19).opponentNext, -4, "bear hug -4");
  eq(grappleResult(12, { held: true }).result, "noEffect", "held: 12 no effect");
  ok(grappleResult(3, { held: true }).breaksHold && grappleResult(3, { held: true }).selfEffect === 0, "held: 3 breaks, no gouge");
  ok(grappleResult(-2, { held: true }).breaksHold, "held: 1 or less breaks");
  const t = grappleResult(16, { held: true });
  ok(t.breaksHold && t.effect === 2 && t.opponentNext === -2, "held: 16 breaks and throws");

  eq(firstBlow({ id: "a", speedScore: 12 }, { id: "b", speedScore: 4 }).join(), "a,b", "higher speed first");
  eq(firstBlow({ id: "a", speedScore: 12, surprised: true }, { id: "b", speedScore: 4 }).join(), "b,a", "surprise loses first blow");

  let s = startBrawl([{ id: "a", strengthScore: 13, speedScore: 4 }, { id: "b", strengthScore: 13, speedScore: 2 }]);
  s = brawlAction(s, "a", { type: "grapple", raw: 19 });
  ok(holdOn(s, "b")?.hold === "bearHug", "bear hug lands");
  let threw = false;
  try { brawlAction(s, "b", { type: "punch", raw: 15 }); } catch { threw = true; }
  ok(threw, "bear hug blocks punching");
  s = brawlAction(s, "b", { type: "grapple", raw: 10 });
  ok(holdOn(s, "b") && s.fighters.b.carry === 0, "held 10-4 = 6 no effect, carry spent");
  s = brawlAction(s, "a", { type: "maintain" });
  ok(s.fighters.b.damage === 2 && s.fighters.b.carry === -4, "maintain: effect again");
  s = brawlAction(s, "b", { type: "grapple", raw: 19 });
  ok(!holdOn(s, "b") && s.fighters.a.damage === 2 && s.fighters.a.carry === -2, "held 19-4 = 15 breaks and throws");
  console.log(`brawl.mjs — all self-tests passed (${count()} assertions).`);
}

if (isMain(import.meta.url)) runSelfTests();

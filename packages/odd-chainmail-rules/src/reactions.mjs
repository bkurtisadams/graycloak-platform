/**
 * OD&D — Chainmail engine · encounter reactions, parley, service, pursuit
 * odd-chainmail-rules · src/reactions.mjs
 *
 * Pure. Kurt's rulings, Oct 2026:
 *   Book III Random Actions by Monsters / Avoiding Monsters; Book I Languages,
 *   Non-Player Characters, Capture of Non-Player Monsters; Book II Orcs;
 *   Chainmail surrender. Readings the books leave open are marked OPEN.
 */
import { rollDie } from "./dice.mjs";
import { hirelingsFor, reactionFor as serviceBandFor } from "./retainers.mjs";

export const Intelligence = Object.freeze({
  MINDLESS: "mindless",
  BESTIAL: "bestial",
  CUNNING: "cunning",
  INTELLIGENT: "intelligent"
});

/** Book III pursuit tiers: Mindless = non-intelligent, Bestial = semi-intelligent, Cunning/Intelligent = intelligent. */
export function pursuitTier(intelligence) {
  if (intelligence === Intelligence.MINDLESS) return "non";
  if (intelligence === Intelligence.BESTIAL) return "semi";
  return "intelligent";
}

/** Mindless and Bestial creatures take no reaction roll and can't be offered service; they attack and pursue. */
export function talksAtAll(intelligence) {
  return intelligence === Intelligence.CUNNING || intelligence === Intelligence.INTELLIGENT;
}

/* ---------------------------------------------------------- reactions */

export const EncounterReaction = Object.freeze({ NEGATIVE: "negative", UNCERTAIN: "uncertain", POSITIVE: "positive" });

/** 2d6 band: 2–5 negative, 6–8 uncertain, 9–12 positive. */
export function encounterBandFor(total) {
  return total <= 5 ? EncounterReaction.NEGATIVE : total <= 8 ? EncounterReaction.UNCERTAIN : EncounterReaction.POSITIVE;
}

const clamp2 = (v) => Math.max(0, Math.min(2, Math.trunc(Number(v) || 0)));

/**
 * Reaction modifiers. bribe and superiorForce are 0..2 (the referee or UI
 * grades the value or force). Alignment: none by default; −2 once the monster
 * learns the PC's alignment and it differs from its own.
 */
export function reactionModifiers({ bribe = 0, superiorForce = 0, alignmentKnown = false, pcAlignment = "", monsterAlignment = "" } = {}) {
  const parts = [];
  if (clamp2(bribe)) parts.push({ why: "bribe", mod: clamp2(bribe) });
  if (clamp2(superiorForce)) parts.push({ why: "superior force", mod: clamp2(superiorForce) });
  if (alignmentKnown && pcAlignment && monsterAlignment && pcAlignment !== monsterAlignment) parts.push({ why: "alignment differs", mod: -2 });
  return { total: parts.reduce((s, p) => s + p.mod, 0), parts };
}

/**
 * Encounter reaction (Book III Random Actions by Monsters; Kurt's rulings,
 * Oct 2026). No roll, and the creature attacks, when it is Mindless or
 * Bestial, when it surprised the party within 20 feet (unless it was
 * surprised too), or while it is pursuing ("other than in pursuit situations").
 */
export function encounterReaction({ intelligence, surprisedParty = false, distanceFeet = 0, monsterSurprised = false, pursuing = false, modifiers = {} } = {}, rng = Math.random) {
  if (!talksAtAll(intelligence)) return { rolled: false, result: EncounterReaction.NEGATIVE, why: "attacks on sight" };
  if (!canAvoid({ monsterSurprisedParty: surprisedParty, distanceFeet, monsterSurprised })) return { rolled: false, result: EncounterReaction.NEGATIVE, why: "surprised the party within 20 feet: attacks" };
  if (pursuing) return { rolled: false, result: EncounterReaction.NEGATIVE, why: "pursuing" };
  const dice = [rollDie(rng), rollDie(rng)];
  const mods = reactionModifiers(modifiers);
  const total = dice[0] + dice[1] + mods.total;
  return { rolled: true, dice, mods, total, result: encounterBandFor(total), why: null };
}

/**
 * An obviously superior force (Kurt's ruling, Oct 2026, revised): the other
 * side has at least three times the monsters' total hit dice (after Book II's
 * orcs, who stand in their lair until outnumbered 3 to 1). Numbers alone don't
 * count, so a dragon never avoids a handful of orcs. Monsters intelligent
 * enough (Cunning, Intelligent) avoid it with no roll; others attack anyway.
 */
export const SUPERIOR_FORCE_RATIO = 3;
export function superiorForce({ ownHd, foeHd }) {
  return foeHd >= ownHd * SUPERIOR_FORCE_RATIO;
}
export function avoidsForce(intelligence, force) {
  return talksAtAll(intelligence) && superiorForce(force);
}

/* ---------------------------------------------------------- languages */

export const ALIGNMENT_TONGUE = Object.freeze({ law: "tongue-law", chaos: "tongue-chaos", neutral: "tongue-neutral" });
export const COMMON = "common";

/** Racial tongues (Book I). OPEN: dwarvish is assumed for dwarves as their own speech. */
export const RACE_TONGUES = Object.freeze({
  elf: Object.freeze(["orc", "hobgoblin", "gnoll", "elvish"]),
  dwarf: Object.freeze(["gnome", "kobold", "goblin", "dwarvish"])
});

/**
 * A character's languages: common, divisional tongue, racial tongues, and one
 * free choice per Intelligence point above 10 (extraSlots). `chosen` fills them.
 */
export function characterLanguages({ alignment = "neutral", int = 10, race = "human", chosen = [] } = {}) {
  const base = [COMMON, ALIGNMENT_TONGUE[alignment] ?? ALIGNMENT_TONGUE.neutral, ...(RACE_TONGUES[race] ?? [])];
  const extraSlots = Math.max(0, Math.trunc(Number(int) || 0) - 10);
  const extra = chosen.filter((l) => !base.includes(l)).slice(0, extraSlots);
  return { known: [...new Set([...base, ...extra])], extraSlots, unfilled: extraSlots - extra.length };
}

/** 20% of speaking monster groups also know common: rolled once per group at encounter. */
export const COMMON_CHANCE = 20;

/**
 * Languages a monster group speaks. mind: { language, common, talks } from the
 * monster record. common "always" (men) or "roll" (20%). talks is a percent
 * chance the creature speaks at all (dragons); rolled once per group.
 */
export function groupLanguages(mind, rng = Math.random) {
  if (!mind?.language) return { languages: [], talks: false, commonRoll: null, talkRoll: null };
  let talkRoll = null;
  if (mind.talks != null && mind.talks < 100) {
    talkRoll = 1 + Math.floor(rng() * 100);
    if (talkRoll > mind.talks) return { languages: [], talks: false, commonRoll: null, talkRoll };
  }
  const languages = [mind.language];
  let commonRoll = null;
  if (mind.common === "always") languages.push(COMMON);
  else if (mind.common === "roll") { commonRoll = 1 + Math.floor(rng() * 100); if (commonRoll <= COMMON_CHANCE) languages.push(COMMON); }
  return { languages: [...new Set(languages)], talks: true, commonRoll, talkRoll };
}

/**
 * A divisional tongue the creature recognizes as hostile: Law and Chaos are
 * hostile to each other; Neutral creatures react to neither. Monsters don't
 * speak these tongues, so they never open parley (Kurt's rulings, Oct 2026).
 */
export function isHostileTongue(language, monsterAlignment) {
  if (language === ALIGNMENT_TONGUE.law) return monsterAlignment === "chaos";
  if (language === ALIGNMENT_TONGUE.chaos) return monsterAlignment === "law";
  return false;
}

/**
 * Can this figure parley with this group? Shared languages, minus any that
 * would provoke attack (listed as warnings for the UI). magic: a means such as
 * a spell that grants speech.
 */
export function parleyOptions(knownLanguages, group, monsterAlignment, { magic = false } = {}) {
  const shared = knownLanguages.filter((l) => group.languages.includes(l));
  const usable = shared.filter((l) => !isHostileTongue(l, monsterAlignment));
  const hostile = knownLanguages.filter((l) => isHostileTongue(l, monsterAlignment));
  return { canParley: magic || usable.length > 0, usable, shared, hostile };
}

/* ---------------------------------------------------------- service */

/**
 * Offer of service (Book I): 2d6 + Charisma loyalty base. 2 attacks, 3–5
 * hostile, 6–8 uncertain (a bigger offer may be made), 9–11 accepts, 12+
 * enthusiast (loyalty +3). Needs a reward (sparing its life doesn't count)
 * and the same basic alignment as the PC, unless charmed. This also applies
 * to monsters that surrendered after failing morale.
 */
export function serviceGate({ intelligence, pcAlignment, monsterAlignment, charmed = false, reward = 0 } = {}) {
  if (!talksAtAll(intelligence)) return { ok: false, reason: "can't be offered service" };
  if (!charmed && pcAlignment !== monsterAlignment) return { ok: false, reason: "alignment differs" };
  if (!(Number(reward) > 0)) return { ok: false, reason: "a reward is required" };
  return { ok: true, reason: null };
}

export function offerService({ cha = 10, offerBonus = 0, ...gate } = {}, rng = Math.random) {
  const g = serviceGate(gate);
  if (!g.ok) return { rolled: false, ...g };
  const dice = [rollDie(rng), rollDie(rng)];
  const loyaltyBase = hirelingsFor(cha).loyaltyBase;
  const total = dice[0] + dice[1] + loyaltyBase + (Math.trunc(offerBonus) || 0);
  const band = serviceBandFor(total);
  return {
    rolled: true, ok: true, dice, loyaltyBase, offerBonus, total, key: band.key, loyaltyBonus: band.loyaltyBonus,
    attacks: band.key === "Attack", accepts: band.key === "Accepts" || band.key === "Enthusiast",
    canRaise: band.key === "Uncertain", talksEnd: total < 6
  };
}

/* ---------------------------------------------------------- surrender */

/**
 * Surrender (Book I Capture of Non-Player Monsters; Chainmail). A failed
 * morale check can make men and intelligent monsters surrender; a surrounded
 * unit that fails morale surrenders.
 */
export function surrenderOnFailedMorale({ intelligence, isMan = false, surrounded = false } = {}) {
  if (surrounded) return { surrenders: true, may: true };
  return { surrenders: false, may: isMan || talksAtAll(intelligence) };
}

/* ---------------------------------------------------------- pursuit */

/**
 * Avoiding monsters (Book III): no chance to avoid when the monster surprised
 * the party and is within 20 feet, unless the monster was surprised too.
 */
export const SURPRISE_NO_AVOID_FEET = 20;
export function canAvoid({ monsterSurprisedParty = false, distanceFeet = Infinity, monsterSurprised = false } = {}) {
  return !(monsterSurprisedParty && !monsterSurprised && distanceFeet <= SURPRISE_NO_AVOID_FEET);
}

/** A character surprised by a monster has a 25% chance to drop one of the items he holds (Book III). */
export const SURPRISE_DROP_PCT = 25;
export function surpriseDrop(heldItems = [], rng = Math.random) {
  const roll = 1 + Math.floor(rng() * 100);
  if (roll > SURPRISE_DROP_PCT || !heldItems.length) return { roll, drops: false, item: null };
  return { roll, drops: true, item: heldItems[Math.floor(rng() * heldItems.length)] };
}

/** Pursuit holds in a straight line while within 90 feet (9" indoors). */
export const PURSUIT_SIGHT_FEET = 90;

/** At a corner, door or stairs the monster follows on 1–2 on d6; a secret door, 1 only. */
export function followsPast(obstacle, rng = Math.random) {
  const roll = rollDie(rng);
  const need = obstacle === "secret" ? 1 : 2;
  return { roll, follows: roll <= need };
}

const DROP_CHANCE = Object.freeze({
  food: Object.freeze({ intelligent: 10, semi: 50, non: 90 }),
  treasure: Object.freeze({ intelligent: 90, semi: 50, non: 10 })
});

/** Dropped food distracts, dropped treasure stops (Kurt's reading of "opposite reaction"). */
export function droppedItemStops(item, intelligence, rng = Math.random) {
  const chance = DROP_CHANCE[item]?.[pursuitTier(intelligence)] ?? 0;
  const roll = 1 + Math.floor(rng() * 100);
  return { chance, roll, stops: roll <= chance };
}

/** Burning oil deters unintelligent and semi-intelligent (Mindless and Bestial) pursuers 75% of the time (DMG; Kurt's ruling, Oct 2026). */
export const OIL_DETERS_PCT = 75;
export function oilDeters(intelligence, rng = Math.random) {
  if (talksAtAll(intelligence)) return { chance: 0, roll: null, deters: false };
  const roll = 1 + Math.floor(rng() * 100);
  return { chance: OIL_DETERS_PCT, roll, deters: roll <= OIL_DETERS_PCT };
}

/** Is a dragon found asleep? sleeps: percent from the monster's mind (Book II). */
export function foundAsleep(sleeps, rng = Math.random) {
  if (sleeps == null) return { roll: null, asleep: false };
  const roll = 1 + Math.floor(rng() * 100);
  return { roll, asleep: roll <= sleeps };
}

/* ---------------------------------------------------------- orcs */

/** Orcs defending their lair check no morale until outnumbered 3 to 1. */
export function orcLairMoraleExempt({ defenders, attackers }) {
  return attackers < defenders * 3;
}

/** Orcs attack orcs of other tribes on sight unless a stronger monster commands them and they pass a 4–6 obedience roll. */
export function orcTribesFight({ sameTribe = false, commandedByStronger = false } = {}, rng = Math.random) {
  if (sameTribe) return { fight: false, roll: null };
  if (!commandedByStronger) return { fight: true, roll: null };
  const roll = rollDie(rng);
  return { fight: roll < 4, roll };
}

/* ---------------------------------------------------------------- tests */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };
  const seq = (v) => { let i = 0; return () => v[i++ % v.length]; };
  const d6 = (n) => (n - 0.5) / 6;
  const pct = (n) => (n - 0.5) / 100;

  ok(pursuitTier("mindless") === "non" && pursuitTier("bestial") === "semi" && pursuitTier("cunning") === "intelligent", "pursuit tiers");
  ok(!encounterReaction({ intelligence: "bestial" }).rolled, "bestial: no roll");
  ok(!encounterReaction({ intelligence: "cunning", surprisedParty: true }).rolled, "surprised the party within 20 ft: attacks, no roll");
  ok(encounterReaction({ intelligence: "cunning", surprisedParty: true, distanceFeet: 30 }, seq([d6(3), d6(3)])).rolled, "surprise beyond 20 ft: normal reaction");
  ok(encounterReaction({ intelligence: "cunning", surprisedParty: true, monsterSurprised: true }, seq([d6(3), d6(3)])).rolled, "both surprised: normal reaction");
  ok(!encounterReaction({ intelligence: "intelligent", pursuing: true }).rolled, "pursuing: no reaction roll");
  ok(superiorForce({ ownHd: 10, foeHd: 30 }) && !superiorForce({ ownHd: 10, foeHd: 29.5 }), "three times the hit dice");
  ok(!superiorForce({ ownCount: 1, ownHd: 10, foeCount: 6, foeHd: 6 }), "a dragon doesn't avoid six orcs");
  ok(avoidsForce("cunning", { ownHd: 2, foeHd: 6 }) && !avoidsForce("bestial", { ownHd: 2, foeHd: 6 }), "only Cunning and Intelligent avoid");
  ok(encounterBandFor(5) === "negative" && encounterBandFor(6) === "uncertain" && encounterBandFor(8) === "uncertain" && encounterBandFor(9) === "positive", "2-5 / 6-8 / 9-12");
  const r = encounterReaction({ intelligence: "cunning", modifiers: { bribe: 2, superiorForce: 1 } }, seq([d6(3), d6(3)]));
  ok(r.rolled && r.total === 9 && r.result === "positive", "6 + bribe 2 + force 1 = 9 positive");
  ok(reactionModifiers({ bribe: 5 }).total === 2, "bribe capped at +2");
  ok(reactionModifiers({ pcAlignment: "law", monsterAlignment: "chaos" }).total === 0, "alignment unknown: no modifier");
  ok(reactionModifiers({ alignmentKnown: true, pcAlignment: "law", monsterAlignment: "chaos" }).total === -2, "alignment known and differs: -2");
  ok(reactionModifiers({ alignmentKnown: true, pcAlignment: "law", monsterAlignment: "law" }).total === 0, "alignment known and same: 0");

  const elf = characterLanguages({ alignment: "law", int: 12, race: "elf", chosen: ["dragon", "ogre", "troll"] });
  ok(elf.known.includes("common") && elf.known.includes("tongue-law") && elf.known.includes("gnoll") && elf.known.includes("elvish"), "elf: common, Law, racial");
  ok(elf.extraSlots === 2 && elf.known.includes("dragon") && elf.known.includes("ogre") && !elf.known.includes("troll"), "Int 12: two extra");
  ok(characterLanguages({ int: 9 }).extraSlots === 0, "Int 9: none extra");
  ok(characterLanguages({ race: "dwarf" }).known.includes("kobold"), "dwarf: kobold");

  ok(groupLanguages({ language: "orc", common: "roll" }, seq([pct(20)])).languages.includes("common"), "20 on d100: knows common");
  ok(!groupLanguages({ language: "orc", common: "roll" }, seq([pct(21)])).languages.includes("common"), "21: orcish only");
  ok(groupLanguages({ language: "common", common: "always" }).languages.length === 1, "men: common");
  ok(groupLanguages({ language: null }).languages.length === 0, "non-speakers");
  ok(!groupLanguages({ language: "dragon", common: "roll", talks: 25 }, seq([pct(26)])).talks, "white dragon fails 25% talk chance");
  ok(groupLanguages({ language: "dragon", common: "roll", talks: 25 }, seq([pct(25), pct(90)])).languages[0] === "dragon", "white dragon talks");

  ok(isHostileTongue("tongue-law", "chaos") && isHostileTongue("tongue-chaos", "law") && !isHostileTongue("tongue-law", "law") && !isHostileTongue("tongue-law", "neutral"), "hostile tongues");
  const p = parleyOptions(["common", "tongue-law", "orc"], { languages: ["orc"] }, "chaos");
  ok(p.canParley && p.usable[0] === "orc" && p.hostile[0] === "tongue-law", "parley in orcish; Law tongue flagged");
  ok(!parleyOptions(["common"], { languages: ["orc"] }, "chaos").canParley, "no shared language: no parley");
  ok(parleyOptions(["common"], { languages: ["orc"] }, "chaos", { magic: true }).canParley, "magic means");

  ok(!offerService({ intelligence: "cunning", pcAlignment: "law", monsterAlignment: "chaos", reward: 50 }).rolled, "alignment differs: no offer");
  ok(offerService({ intelligence: "cunning", pcAlignment: "law", monsterAlignment: "chaos", charmed: true, reward: 50 }).rolled, "charmed: offer allowed");
  ok(offerService({ intelligence: "cunning", pcAlignment: "chaos", monsterAlignment: "chaos", reward: 0 }).reason === "a reward is required", "reward required");
  ok(!offerService({ intelligence: "bestial", pcAlignment: "chaos", monsterAlignment: "chaos", reward: 5 }).rolled, "bestial: no service");
  const s = offerService({ intelligence: "cunning", pcAlignment: "chaos", monsterAlignment: "chaos", reward: 10, cha: 16 }, seq([d6(3), d6(4)]));
  ok(s.total === 9 && s.accepts && s.loyaltyBase === 2, "7 + Cha 16 (+2) = 9 accepts");
  const u = offerService({ intelligence: "cunning", pcAlignment: "chaos", monsterAlignment: "chaos", reward: 10 }, seq([d6(3), d6(3)]));
  ok(u.canRaise && !u.talksEnd, "6: uncertain, may raise");
  const e = offerService({ intelligence: "cunning", pcAlignment: "chaos", monsterAlignment: "chaos", reward: 10 }, seq([d6(6), d6(6)]));
  ok(e.key === "Enthusiast" && e.loyaltyBonus === 3, "12: enthusiast +3");
  const a = offerService({ intelligence: "cunning", pcAlignment: "chaos", monsterAlignment: "chaos", reward: 10 }, seq([d6(1), d6(1)]));
  ok(a.attacks && a.talksEnd, "2: attacks");

  ok(surrenderOnFailedMorale({ intelligence: "bestial", surrounded: true }).surrenders, "surrounded: surrenders");
  ok(surrenderOnFailedMorale({ intelligence: "cunning" }).may && !surrenderOnFailedMorale({ intelligence: "bestial" }).may, "intelligent may surrender, bestial not");

  ok(!canAvoid({ monsterSurprisedParty: true, distanceFeet: 20 }) && canAvoid({ monsterSurprisedParty: true, distanceFeet: 30 }), "surprised within 20 ft: no avoiding");
  ok(canAvoid({ monsterSurprisedParty: true, distanceFeet: 10, monsterSurprised: true }) && canAvoid({}), "unless the monster was surprised too");
  ok(surpriseDrop(["sword", "shield"], seq([pct(25), 0.6])).item === "shield" && !surpriseDrop(["sword"], seq([pct(26)])).drops, "25% drop of a held item");
  ok(!surpriseDrop([], seq([pct(1)])).drops, "nothing held: nothing dropped");
  ok(followsPast("corner", seq([d6(2)])).follows && !followsPast("corner", seq([d6(3)])).follows, "corner 1-2");
  ok(followsPast("secret", seq([d6(1)])).follows && !followsPast("secret", seq([d6(2)])).follows, "secret door 1");
  ok(droppedItemStops("food", "mindless", seq([pct(90)])).stops && !droppedItemStops("food", "cunning", seq([pct(11)])).stops, "food: non 90%, intelligent 10%");
  ok(droppedItemStops("treasure", "intelligent", seq([pct(90)])).stops && droppedItemStops("treasure", "bestial", seq([pct(50)])).chance === 50, "treasure: intelligent 90%, semi 50%");

  ok(oilDeters("mindless", seq([pct(75)])).deters && !oilDeters("mindless", seq([pct(76)])).deters, "oil deters unintelligent 75%");
  ok(oilDeters("bestial", seq([pct(75)])).deters && !oilDeters("cunning", seq([pct(1)])).deters && !oilDeters("intelligent", seq([pct(1)])).deters, "oil: Mindless and Bestial only");
  ok(foundAsleep(60, seq([pct(60)])).asleep && !foundAsleep(60, seq([pct(61)])).asleep && !foundAsleep(null).asleep, "dragon asleep chance");
  ok(orcLairMoraleExempt({ defenders: 10, attackers: 29 }) && !orcLairMoraleExempt({ defenders: 10, attackers: 30 }), "lair: morale at 3 to 1");
  ok(orcTribesFight({}).fight && !orcTribesFight({ sameTribe: true }).fight, "other tribes fight on sight");
  ok(!orcTribesFight({ commandedByStronger: true }, seq([d6(4)])).fight && orcTribesFight({ commandedByStronger: true }, seq([d6(3)])).fight, "obedience 4-6");

  console.log(`reactions.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

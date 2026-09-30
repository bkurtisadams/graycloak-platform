/**
 * OD&D — Chainmail engine · combat spellcasting
 * odd-chainmail-rules · src/casting.mjs
 *
 * Pure. The rules a caster needs in a fight (Book I p.19-34, Chainmail p.32):
 *   - OD&D spell slots govern casting; no Chainmail complexity roll (ruling).
 *   - A caster must be stationary and undisturbed by attack to cast or keep a
 *     spell going (Chainmail p.32, ruling): any movement this round, or any
 *     attack aimed at him earlier in the missile-and-spell step (Dexterity
 *     order), spoils the casting. The slot is still spent.
 *   - First combat spells: Sleep, Hold Person, Charm Person, Protection from Evil.
 *
 * Referee calls marked OPEN below are defaults the rulings log hasn't settled.
 */
import { rollDie } from "./dice.mjs";
import { savesFor } from "./tables.mjs";

export const COMBAT_SPELLS = Object.freeze({
  sleep:         { id: "sleep",         name: "Sleep",               level: 1, classes: ["magic-user"], range: 24 },
  charmPerson:   { id: "charmPerson",   name: "Charm Person",        level: 1, classes: ["magic-user"], range: 12 },
  protectionEvil:{ id: "protectionEvil",name: "Protection from Evil",level: 1, classes: ["magic-user", "cleric"], range: 0 },
  holdPerson:    { id: "holdPerson",    name: "Hold Person",         level: 3, classes: ["magic-user"], range: 12, clericLevel: 2, clericRange: 18 }
});

/** Spells of a class that fit the caster's slot levels. */
export function combatSpellsFor(rawClass, slots) {
  const cls = String(rawClass || "").toLowerCase();
  return Object.values(COMBAT_SPELLS).filter((s) => {
    if (!s.classes.includes(cls) && !(cls === "cleric" && s.clericLevel)) return false;
    const lvl = cls === "cleric" && s.clericLevel ? s.clericLevel : s.level;
    return (slots?.[lvl - 1] ?? 0) > 0;
  }).map((s) => ({ ...s, level: cls === "cleric" && s.clericLevel ? s.clericLevel : s.level, range: cls === "cleric" && s.clericRange ? s.clericRange : s.range }));
}

/** Chainmail p.32: stationary and undisturbed by attack. */
export function castingGate({ moved = 0, attackedFirst = false } = {}) {
  if (moved > 0) return { ok: false, reason: "moved this round" };
  if (attackedFirst) return { ok: false, reason: "attacked before the spell went off" };
  return { ok: true, reason: null };
}

/** Hit dice as a comparable number: 1+1 -> 1.5, 2 -> 2, 1-1 -> 0.75. */
export function hdValue(count, bonus = 0) {
  const c = Math.max(0, Math.trunc(count) || 0);
  const b = Math.trunc(bonus) || 0;
  return b > 0 ? c + 0.5 : b < 0 ? Math.max(0.25, c - 0.25) : c;
}

/**
 * Sleep (Book I p.23): how many creatures of this hit-dice class it can put
 * down. 2-16 up to 1+1 HD, 2-12 up to 2+1, 1-6 third level (up to 3+1),
 * one creature up to 4+1; nothing larger. No saving throw.
 */
export function sleepCapacity(count, bonus, rng) {
  const hd = hdValue(count, bonus);
  if (hd <= 1.5) return { dice: "2d8", n: rollDie8(rng) + rollDie8(rng) };
  if (hd <= 2.5) return { dice: "2d6", n: rollDie(rng) + rollDie(rng) };
  if (hd <= 3.5) return { dice: "1d6", n: rollDie(rng) };
  if (hd <= 4.5) return { dice: "one", n: 1 };
  return { dice: "none", n: 0 };
}
function rollDie8(rng) { return 1 + Math.floor(rng() * 8); }

/** Pick n of the eligible at random (Book I: random selection if more could be affected). */
export function pickRandom(list, n, rng) {
  const pool = list.slice();
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}

/**
 * Charm Person / Hold Person targets (Book I p.23): two-legged, generally
 * mammalian, man-size or smaller, not undead. Monster keys in the package
 * that qualify; men always qualify.
 */
export const PERSON_MONSTERS = Object.freeze(["goblin", "kobold", "orc", "hobgoblin", "gnoll"]);
export function isPerson(fig) {
  return fig.kind === "pc" || PERSON_MONSTERS.includes(fig.monsterKey);
}

/**
 * A monster's saving throws. OPEN: Books I-III give no monster save rule;
 * default is a Fighting-Man of level equal to its hit dice (minimum 1).
 */
export function monsterSaves(count) {
  return savesFor("fighter", Math.max(1, Math.trunc(count) || 1));
}

/** Save vs spells: d20 at or above the staves-and-spells number, plus modifiers. */
export function saveVsSpells(saves, rng, mod = 0) {
  const roll = 1 + Math.floor(rng() * 20);
  const need = saves.staves;
  return { roll, need, mod, saved: roll + mod >= need };
}

/** Hold Person (Book I p.25): 1-4 persons, or one at -2 on his save. */
export function holdPersonCount(single, rng) {
  return single ? 1 : 1 + Math.floor(rng() * 4);
}

/**
 * Protection from Evil (Book I p.23): +1 on the caster's saves and -1 from the
 * hit dice of evil attackers. In man-to-man the -1 applies to each attack die
 * an evil figure rolls against him (OPEN: reading of "hit dice").
 */
export const PROTECTION_FROM_EVIL = Object.freeze({ saveBonus: 1, attackPenalty: -1, turns: 6 });

/* ---------------------------------------------------------------- tests */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };
  const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };

  ok(castingGate({ moved: 0 }).ok, "stationary and unattacked casts");
  ok(!castingGate({ moved: 2 }).ok && castingGate({ moved: 2 }).reason === "moved this round", "moving spoils");
  ok(!castingGate({ attackedFirst: true }).ok, "attack before the spell spoils");

  ok(hdValue(1, 1) === 1.5 && hdValue(1, -1) === 0.75 && hdValue(4, 1) === 4.5, "hd values");
  ok(sleepCapacity(1, 0, seq([0.99])).dice === "2d8" && sleepCapacity(1, 0, seq([0.99])).n === 16, "orc: 2d8, max 16");
  ok(sleepCapacity(2, 1, seq([0])).dice === "2d6", "2+1 HD: 2d6");
  ok(sleepCapacity(3, 0, seq([0])).dice === "1d6", "3 HD: 1d6");
  ok(sleepCapacity(4, 1, seq([0])).n === 1, "4+1 HD: one");
  ok(sleepCapacity(5, 0, seq([0])).n === 0, "5 HD: immune");

  ok(pickRandom([1, 2, 3], 5, seq([0])).length === 3, "can't pick more than exist");
  ok(isPerson({ kind: "pc" }) && isPerson({ kind: "monster", monsterKey: "orc" }) && !isPerson({ kind: "monster", monsterKey: "ogre" }), "persons");

  ok(monsterSaves(1).staves === savesFor("fighter", 1).staves, "1 HD saves as 1st-level fighter");
  ok(saveVsSpells({ staves: 16 }, seq([0.75]), 0).roll === 16 && saveVsSpells({ staves: 16 }, seq([0.75]), 0).saved, "save roll 16 vs 16");
  ok(!saveVsSpells({ staves: 16 }, seq([0.75]), -2).saved, "Hold Person single target -2");
  ok(holdPersonCount(true, seq([0.9])) === 1 && holdPersonCount(false, seq([0.99])) === 4, "hold count");

  const mu1 = combatSpellsFor("magic-user", [1, 0, 0, 0, 0, 0]).map((s) => s.id);
  ok(mu1.includes("sleep") && mu1.includes("charmPerson") && !mu1.includes("holdPerson"), "MU 1 spells");
  const mu5 = combatSpellsFor("magic-user", [4, 2, 1, 0, 0, 0]).map((s) => s.id);
  ok(mu5.includes("holdPerson"), "MU with a 3rd-level slot gets Hold Person");
  const cl1 = combatSpellsFor("cleric", [0, 0, 0, 0, 0]);
  ok(cl1.length === 0, "Acolyte has no spells");
  const cl3 = combatSpellsFor("cleric", [2, 1, 0, 0, 0]);
  ok(cl3.some((s) => s.id === "holdPerson" && s.level === 2 && s.range === 18), "cleric Hold Person is 2nd level, 18\"");

  console.log(`casting.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

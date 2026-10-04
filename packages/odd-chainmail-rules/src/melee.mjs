/**
 * OD&D — Chainmail engine · man-to-man melee and monster specials
 * odd-chainmail-rules · src/melee.mjs
 *
 * Pure (apart from mutating the fight state it is given). Runner pass 4,
 * Oct 2026: the melee step and the special abilities that ride on it move
 * here from the combat tester. Results come back as data "cards" for a client
 * to render: { title: [segment], note: bool, items: [item] } where a segment
 * is { fig: id } | { text } | { aside } and an item is { strike: { atkId,
 * defId, res, facing } } | { text, hit? }. Damage events come back as hits:
 * { a, t, dmg, extra } (figure ids).
 *
 * Rules (see the rules reference): Chainmail man-to-man first blow and the
 * exchange (combat-engine resolveExchange); ganging up with no return blow;
 * joining a melee only after no more than half a move; a sleeping figure slain
 * outright (Kurt); held or paralyzed targets +4 and double damage; parry dice a
 * per-round allowance; Chainmail 4c counter blows; broken weapons useless (Kurt);
 * Book II specials: energy drain, ghoul paralysis, petrifying touch, poison,
 * swallowing, troll and vampire regeneration, breath, gaze.
 */
import { MONSTERS } from "./monsters.mjs";
import { monsterAttackProfile, monsterAttackDice } from "./monster-attacks.mjs";
import { fightingCapabilityFor } from "./fighting-capability.mjs";
import { savesFor, weaponIdForClass, WEAPON_CLASS } from "./tables.mjs";
import { monsterSaves, HELD_TARGET, hdValue } from "./casting.mjs";
import { hitDiceFor } from "./hit-dice.mjs";
import { resolveAttackPool, resolveExchange, parryCounterBlows } from "./combat-engine.mjs";
import { recordContact, pairKey, canJoinMelee, dir8, attackFacing, halfCellsToInches } from "./engagement.mjs";
import {
  abilityOf, drainLevels, risesAs, ghoulTouch, petrifySave, poisonBite, wyvernStings, swallows, hydraHeads, CLUMSY_BIG,
  trollRound, regenAmount, TROLL_RISES_AT, stopsRegeneration, breathOrBite, BREATH, inBreath, gazeCheck, reflectedGaze, BLIND
} from "./specials.mjs";
import { alive, present, active, helpless, adjacent, centre, sz, takeDamage, lineOfSight, GONE } from "./board.mjs";
import { moveInches } from "./movement.mjs";

export const mon = (f) => (f.kind === "monster" ? MONSTERS.find((m) => m.key === f.monsterKey) : null);
export const MEN_KEYS = Object.freeze(["bandit", "berserker", "brigand", "caveman", "merman"]);
export const isMan = (f) => f.kind === "pc" || MEN_KEYS.includes(f.monsterKey);
export const isEvil = (f) => f.kind === "monster" && mon(f)?.alignment === "chaos";
export const pfePenalty = (atk, def) => (def.pfe && isEvil(atk) ? -1 : 0);
export const blindPenalty = (f) => (f.averted ? BLIND.everyDieBonus : 0);
/** Book II: berserkers +2 against normal men. */
export const pairMods = (atk, def) => ({ everyDieBonus: (atk.monsterKey === "berserker" && isMan(def) ? 2 : 0) + pfePenalty(atk, def) + blindPenalty(atk) });
/** Book II: dwarves and gnomes take half damage from ogres, giants and the like. */
export const defMods = (atk, def) => ((["dwarf", "gnome"].includes(def.monsterKey) && CLUMSY_BIG.includes(atk.monsterKey)) ? { damageHalved: true } : {});
export const savesOf = (f) => (f.kind === "pc" ? savesFor(f.cls, f.level, f.race) : monsterSaves(mon(f).hd.count));
export const hdOf = (f) => { if (f.kind === "pc") { const h = hitDiceFor(f.cls, f.level); return hdValue(h.dice, h.bonus); } const h = mon(f).hd; return hdValue(h.count, h.bonus); };

/** How a figure fights: weapon, dice, bonus (Fighting Capability for characters, hit dice or natural attacks for monsters). */
export function combatProfile(f) {
  if (f.kind === "pc") {
    const fc = fightingCapabilityFor(f.cls, f.level);
    return { weaponId: f.weaponId, parryWeaponId: f.weaponId, dice: fc.attacks, bonus: fc.bonus, fcLabel: fc.label, profileAttack: false };
  }
  const m = mon(f);
  const p = monsterAttackProfile(m); const dice = m.key === "hydra" && f.hp != null ? hydraHeads(Math.max(0, f.hp)) : monsterAttackDice(m);
  if (p.method === "weapon") { const w = f.weaponId ?? weaponIdForClass(p.weaponClass); return { weaponId: w, parryWeaponId: w, dice, bonus: 0, fcLabel: `${dice} HD`, profileAttack: false }; }
  return { weaponId: "polearm", parryWeaponId: null, dice, bonus: 0, fcLabel: `${dice} HD, ${p.description.toLowerCase()}`, profileAttack: true, damageDice: p.damage.dice || 1, damageFlat: p.damage.bonus || 0 };
}
/** The figure as the combat engine sees it this round. A broken weapon gives no attack or parry dice (Kurt). */
export function combatant(f, facing, extra = {}) {
  const p = combatProfile(f); const parrying = f.stance === "parry" && !helpless(f);
  const hitOnlyBy = f.kind === "monster" ? mon(f)?.specialAbilities?.hitOnlyBy : undefined;
  const broken = !!f.weaponBroken && !p.profileAttack;
  return {
    name: f.name, hitOnlyBy, weaponId: p.weaponId, ac: f.ac, parryWeaponId: helpless(f) ? null : p.parryWeaponId,
    thrown: parrying ? 0 : p.dice, held: parrying ? p.dice : 0, bonus: p.bonus, bonusDie: 0, hp: f.invulnerable ? Infinity : f.hp,
    facing, profileAttack: p.profileAttack, damageDice: p.damageDice, damageFlat: p.damageFlat, ...extra,
    brokenWeapon: broken, parryBroken: !!f.weaponBroken, ...(broken ? { thrown: 0, held: 0, parryWeaponId: null } : {})
  };
}
export function saveVsSpellsLike(f, kind, rng) {
  const saves = savesOf(f); const roll = 1 + Math.floor(rng() * 20);
  const mod = f.pfe ? 1 : 0;
  return { roll, need: saves[kind], saved: roll + mod >= saves[kind] };
}
/** Fire or acid on a troll: a downed troll so struck is burned and won't rise. */
export function baneHit(state, e, kind) {
  if (e.monsterKey !== "troll" || !stopsRegeneration([kind])) return;
  if (e.firstHitRound == null) e.firstHitRound = state.round;
  if (e.hp <= 0) e.burned = true;
}
/** A figure always faces its current target, wherever that target has moved. */
export function refreshFacing(state) {
  for (const f of state.figures) {
    if (!active(f) || f.target == null) continue;
    const t = state.figures.find((e) => e.id === f.target); if (!t || !present(t)) continue;
    const d = dir8(centre(t).x - centre(f).x, centre(t).y - centre(f).y); if (d != null) f.facing = d;
  }
}
export function inMeleeLastRound(state, t, exceptId) {
  for (const [k, c] of state.contacts) {
    if (c.lastRound !== state.round - 1) continue;
    const [a, b] = k.split("-").map(Number);
    if (a !== t.id && b !== t.id) continue;
    const o = a === t.id ? b : a;
    const of = state.figures.find((e) => e.id === o);
    if (o !== exceptId && of && alive(of)) return true;
  }
  return false;
}

const weaponName = (id) => (id ?? "weapon").replace(/([a-z])([A-Z])/g, "$1 $2");

/**
 * What a strike does beyond hit points: a parrying weapon breaking, and the
 * attacker's Book II specials. ctx: { state, rng, add, start }. Returns items.
 */
export function afterStrike(ctx, atk, tgt, res) {
  const { state, rng, add } = ctx;
  if (!res || res.immune) return [];
  const items = [];
  if (res.parryWeaponBroke && !tgt.weaponBroken) {
    tgt.weaponBroken = true;
    items.push({ text: `${tgt.name}'s ${weaponName(combatProfile(tgt).weaponId)} breaks on the parry (Chainmail 4c/4d): useless until he draws another weapon.`, hit: true, weaponBroke: tgt.id });
  }
  const hits = res.dice.filter((d) => d.hit);
  if (!hits.length) return items;
  if (["troll", "vampire"].includes(tgt.monsterKey) && tgt.firstHitRound == null) tgt.firstHitRound = state.round;
  const m = mon(atk); if (!m) return items;
  const notes = [];
  const svMod = tgt.pfe ? 1 : 0;
  tgt.lastHitBy = m.key;
  const drain = abilityOf(m, "drain");
  if (drain && tgt.invulnerable) { for (const d of hits) add(tgt.id, -d.damage); notes.push(`Energy drain: ${tgt.name} is invulnerable (GM) and loses no levels.`); }
  else if (drain) {
    const rec = { level: tgt.kind === "pc" ? tgt.level : (tgt.hdLeft ?? m.hd.count), hp: tgt.hp, maxHp: tgt.maxHp, hpRolls: tgt.hpRolls };
    const lost = []; let r = { ...rec };
    for (const d of hits) { add(tgt.id, -d.damage); r = drainLevels(r, drain.value, rng); lost.push(...r.lost); r = { ...r, hpRolls: r.hpRolls ?? null }; }
    if (tgt.kind === "pc") tgt.level = r.level; else tgt.hdLeft = r.level;
    tgt.maxHp = r.maxHp; tgt.hpRolls = r.hpRolls;
    const detail = lost.map((x) => `level ${x.level}: ${x.amount}${x.stored ? " (its roll)" : " (1d6)"}`).join(", ");
    notes.push(`Energy drain instead of damage: ${lost.length} level${lost.length === 1 ? "" : "s"} lost (${detail}); maximum now ${r.maxHp}${tgt.kind === "pc" ? `, level ${r.level}` : `, ${r.level} HD`}.`);
    if (r.drained) { add(tgt.id, 999); const as = risesAs(m.key, { drained: true, manType: isMan(tgt) }); tgt.risesAs = as; notes.push(`Drained of all life${as ? `: will rise as a ${as}` : ""}.`); }
  }
  if (abilityOf(m, "paralysis") && tgt.status !== "held" && tgt.pendingStatus !== "held") {
    const g = ghoulTouch(savesOf(tgt), rng, { elf: tgt.monsterKey === "elf" || tgt.race === "elf", mod: svMod });
    if (g.immune) notes.push(`${tgt.name} is an elf: immune to the ghoul's touch.`);
    else { notes.push(`Ghoul's touch: save vs paralyzation d20 ${g.roll}${svMod ? " +1" : ""} vs ${g.need}: ${g.saved ? "saved" : `held for ${g.turns} turns`}.`); if (g.held) tgt.pendingStatus = "held"; }
  }
  if (abilityOf(m, "petrify") && ["cockatrice", "basilisk"].includes(m.key)) {
    const sv = petrifySave(savesOf(tgt), rng, svMod);
    notes.push(`Petrifying touch: save vs stone d20 ${sv.roll} vs ${sv.need}: ${sv.saved ? "saved" : "turned to stone"}.`);
    if (!sv.saved) tgt.pendingStatus = "petrified";
  }
  let poison = abilityOf(m, "poison") && ["medusa"].includes(m.key);
  if (m.key === "wyvern") { const w = wyvernStings(rng); poison = w.sting; notes.push(w.sting ? "The wyvern stings." : "The wyvern bites."); }
  if (poison) {
    const sv = poisonBite(savesOf(tgt), rng, svMod);
    notes.push(`${m.key === "medusa" ? "Snake bite" : "Poison"}: save vs poison d20 ${sv.roll} vs ${sv.need}: ${sv.saved ? "saved" : "dies"}.`);
    if (sv.dies) add(tgt.id, 999);
  }
  if (abilityOf(m, "swallow")) {
    const big = hits.find((d) => swallows(d.effective, res.toHitNumber, d.roll[0] + d.roll[1]));
    if (big && sz(tgt) <= 2) { tgt.pendingStatus = "swallowed"; notes.push(`${tgt.name} is swallowed whole: dead in 6 turns unless cut free.`); }
  }
  if (notes.length) items.push({ text: notes.join(" "), hit: true });
  return items;
}

/** Troll and vampire regeneration at the end of the melee step. Returns a card or null. */
export function regenerate(state) {
  const out = [];
  for (const f of state.figures) {
    if (!["troll", "vampire"].includes(f.monsterKey) || f.firstHitRound == null || !f.placed || GONE.includes(f.status)) continue;
    if (f.monsterKey === "vampire" && f.hp <= 0) { f.status = "gaseous"; f.target = null; out.push(`${f.name} turns to gas and escapes to its coffin.`); continue; }
    if (f.monsterKey === "troll") {
      const tr = trollRound({ hp: f.hp, maxHp: f.maxHp, roundsSinceHit: state.round - f.firstHitRound, burned: f.burned, store: f.regenStore ?? 0 });
      if (!tr.regen) continue;
      const was = f.hp; f.hp = tr.hp; f.regenStore = tr.store;
      if (tr.rises) out.push(`${f.name} rises again at ${f.hp} hit points!`);
      else if (tr.down) out.push(`${f.name} regenerates on the ground (${f.regenStore}/${TROLL_RISES_AT}); burn it or put it in acid to stop it.`);
      else if (f.hp > was) out.push(`${f.name} regenerates ${f.hp - was} hit points (${f.hp}/${f.maxHp}).`);
      continue;
    }
    const amt = regenAmount({ kind: f.monsterKey, roundsSinceHit: state.round - f.firstHitRound, burned: f.burned });
    if (!amt || f.hp >= f.maxHp) continue;
    f.hp = Math.min(f.maxHp, f.hp + amt);
    out.push(`${f.name} regenerates ${amt} hit points (${f.hp}/${f.maxHp}).`);
  }
  return out.length ? { title: [{ text: "Regeneration" }], items: out.map((text) => ({ text })) } : null;
}

/** Breath and gaze, which act in the missile step whatever the figure's orders. Returns { cards, hits }. */
export function monsterPowers(state, rng) {
  const cards = [], hits = [];
  const inch = (f) => ({ x: centre(f).x / 3, y: centre(f).y / 3 });
  const byId = (id) => state.figures.find((e) => e.id === id);
  for (const d of state.figures) {
    if (!active(d)) continue;
    const m = mon(d); if (!m) continue;
    const t = d.target != null ? byId(d.target) : null;
    const colour = m.key.startsWith("dragon-") ? m.key.slice(7) : m.key === "chimera" ? "chimera" : null;
    if (colour && t && present(t)) {
      d.breathLeft = d.breathLeft ?? 3;
      const bb = breathOrBite(d.breathLeft, rng);
      if (!bb.breathes) { cards.push({ note: true, title: [{ text: `${d.name}: 2d6 [${bb.roll.join(",")}] ${d.breathLeft ? "bites this round" : "has no breath left and bites"}.` }], items: [] }); continue; }
      d.breathLeft--; d.acted = state.round;
      const spec = BREATH[colour];
      const dmgFull = spec.dice ? Array.from({ length: spec.dice }, () => 1 + Math.floor(rng() * 6)).reduce((a, b) => a + b, 0) : Math.max(1, d.hp);
      const caught = state.figures.filter((e) => e !== d && present(e) && e.placed && inBreath(inch(d), inch(t), inch(e), spec));
      const items = [{ text: `${dmgFull} damage${spec.dice ? "" : " (the dragon's hit points)"}, save vs dragon breath for half.` }];
      for (const e of caught) {
        const sv = saveVsSpellsLike(e, "dragon", rng); const dmg = sv.saved ? Math.floor(dmgFull / 2) : dmgFull;
        takeDamage(e, dmg); hits.push({ a: d.id, t: e.id, dmg }); baneHit(state, e, spec.kind);
        items.push({ text: `${e.name}: save d20 ${sv.roll} vs ${sv.need}: ${sv.saved ? "half" : "full"}, ${dmg} damage${e.hp <= 0 ? " — down" : ""}`, hit: true });
      }
      if (!caught.length) items.push({ text: "No one caught in it." });
      cards.push({ title: [{ fig: d.id }, { text: ` breathes ${spec.kind} ` }, { aside: `(2d6 [${bb.roll.join(",")}]; ${d.breathLeft} left; ${spec.shape} ${spec.length}" × ${spec.width}")` }], items });
      continue;
    }
    if (m.key === "gorgon" && t && present(t)) {
      const bb = breathOrBite(99, rng); if (!bb.breathes) continue;
      d.acted = state.round;
      const caught = state.figures.filter((e) => e.side !== d.side && present(e) && adjacent(d, e) && attackFacing(centre(d), d.facing, centre(e)) === "front");
      const items = caught.map((e) => { const sv = saveVsSpellsLike(e, "stone", rng); if (!sv.saved) { e.status = "petrified"; e.target = null; } return { text: `${e.name}: save vs stone d20 ${sv.roll} vs ${sv.need}: ${sv.saved ? "saved" : "turned to stone"}`, hit: !sv.saved }; });
      cards.push({ title: [{ fig: d.id }, { text: " breathes its petrifying breath (6')" }], items: items.length ? items : [{ text: "No one in front of it." }] });
      continue;
    }
    if (["basilisk", "medusa"].includes(m.key)) {
      const near = state.figures.filter((e) => e.side !== d.side && active(e) && e.placed && lineOfSight(state, d, e));
      const items = [];
      for (const e of near) {
        if (!active(d)) break;
        const g = gazeCheck({ x: centre(e).x, y: centre(e).y, facing: e.facing, averted: e.averted, reflector: e.mirror, saveMod: e.pfe ? 1 : 0 }, { ...centre(d), facing: d.facing }, savesOf(e), rng);
        if (!g.exposed && !g.reflected && !g.averted) continue;
        if (g.averted) { items.push({ text: `${e.name} averts his eyes: safe, but fights blind.` }); continue; }
        if (g.reflected) {
          const rg = reflectedGaze(savesOf(d), rng);
          if (rg.petrified) { d.status = "petrified"; d.target = null; }
          items.push({ text: `${e.name} holds up a mirror: the gaze turns back. ${d.name} saves vs stone d20 ${rg.roll} vs ${rg.need}: ${rg.petrified ? "turned to stone" : "saved"}`, hit: rg.petrified });
          continue;
        }
        if (g.petrified) { e.status = "petrified"; e.target = null; }
        items.push({ text: `${e.name} meets its gaze: save vs stone d20 ${g.roll} vs ${g.need}: ${g.saved ? "saved" : "turned to stone"}`, hit: !g.saved });
      }
      if (items.length) cards.push({ title: [{ fig: d.id }, { text: "'s gaze " }, { aside: "(anyone who can see it while it looks their way)" }], items });
    }
  }
  return { cards, hits };
}

/**
 * The melee step (Chainmail man-to-man). Mutates the state: contacts, damage,
 * statuses, broken weapons, regeneration. Returns { cards, hits, fell }.
 */
export function resolveMeleeRound(state, rng) {
  refreshFacing(state);
  const byId = (id) => state.figures.find((e) => e.id === id);
  const start = new Map(state.figures.map((f) => [f.id, f.hp]));
  const dmg = new Map(); const add = (id, n) => dmg.set(id, (dmg.get(id) ?? 0) + n);
  const cards = [], hits = [], done = new Set();
  const hit = (a, t, n, extra) => hits.push({ a: a.id, t: t?.id ?? null, dmg: n, extra });
  const note = (text) => cards.push({ note: true, title: [{ text }], items: [] });
  const ctx = { state, rng, add, start };
  const spent = (f) => f.acted === state.round;

  // A figure attacked by someone it isn't fighting turns to face the first who came at it.
  for (const f of state.figures) {
    if (!active(f) || spent(f)) continue;
    const cur = f.target != null ? byId(f.target) : null;
    if (cur && present(cur) && adjacent(f, cur)) continue;
    const foes = state.figures.filter((e) => active(e) && !spent(e) && e.side !== f.side && e.target === f.id && adjacent(e, f));
    if (!foes.length) continue;
    const foe = foes.sort((a, b) => (a.moveSeq ?? 0) - (b.moveSeq ?? 0))[0];
    f.target = foe.id; f.facing = dir8(centre(foe).x - centre(f).x, centre(foe).y - centre(f).y) ?? f.facing;
    note(`${f.name} turns to fight ${foe.name}, who attacked him.`);
  }
  const attackers = state.figures.filter((f) => active(f) && !spent(f) && f.target != null && f.action !== "hold");
  const legal = new Map();
  for (const f of attackers) {
    const t = byId(f.target);
    if (!t || !present(t)) continue;
    if (!adjacent(f, t)) { note(`${f.name} targets ${t.name} but isn't adjacent: no attack.`); continue; }
    if (f.stance === "parry" && t.target !== f.id) continue;
    const priorContact = state.contacts.get(pairKey(f.id, t.id))?.lastRound === state.round - 1;
    if (!priorContact && t.target !== f.id && !helpless(t) && inMeleeLastRound(state, t, f.id) && !canJoinMelee(f.moved, moveInches(f))) {
      note(`${f.name} can't join the melee around ${t.name}: moved ${halfCellsToInches(f.moved)}" of ${moveInches(f)}" (more than half).`);
      continue;
    }
    legal.set(f.id, t.id);
  }
  if (legal.size) state.meleeBegun = true;

  // Parry dice are a per-round allowance: each held die stops one blow, whoever strikes it.
  const parryLeft = new Map();
  const budget = (fig, cmb) => { if (!parryLeft.has(fig.id)) parryLeft.set(fig.id, cmb.held ?? 0); cmb.held = Math.min(cmb.held ?? 0, parryLeft.get(fig.id)); return cmb; };
  const spendParry = (fig, used) => { if (used) parryLeft.set(fig.id, Math.max(0, (parryLeft.get(fig.id) ?? 0) - used)); };
  const strike = (atk, def, res, facing) => ({ strike: { atkId: atk.id, defId: def.id, res, facing } });
  // Chainmail 4c (Kurt: RAW): a successful parry with a weapon 4-7 classes lighter earns one counter blow.
  const parryCounter = (def, att, res) => {
    const n = parryCounterBlows(res); if (!n || !active(def) || def.weaponBroken) return [];
    if (!def.invulnerable && start.get(def.id) - (dmg.get(def.id) ?? 0) <= 0) return [];
    const c = combatant(def, "front", { everyDieBonus: pfePenalty(def, att) + blindPenalty(def) });
    const r = resolveAttackPool({ attacker: { ...c, dice: n, counterBlow: true }, target: budget(att, combatant(att, "front")) }, rng);
    spendParry(att, r.parries); add(att.id, r.damage); hit(def, att, r.damage);
    return [{ text: `${def.name}'s parry holds: ${n === 1 ? "a counter blow" : `${n} counter blows`} (Chainmail 4c).` }, strike(def, att, r), ...afterStrike(ctx, def, att, r)];
  };

  // A sleeping figure is slain outright, one per attacker per round (Kurt's ruling).
  const slain = new Set();
  for (const [fid, tid] of [...legal]) {
    const f = byId(fid), t = byId(tid);
    if (t.status !== "asleep") continue;
    legal.delete(fid); done.add(fid);
    if (slain.has(tid)) continue;
    recordContact(state.contacts, fid, tid, state.round);
    if (t.invulnerable) { note(`${f.name} strikes the sleeping ${t.name}, who is invulnerable (GM) and unharmed.`); continue; }
    slain.add(tid); add(tid, start.get(tid)); hit(f, t, start.get(tid));
    cards.push({ title: [{ fig: f.id }, { text: " slays the sleeping " }, { fig: t.id }], items: [{ text: "A sleeping figure is killed outright, one per attacker per round (Kurt's ruling)." }] });
  }

  for (const [fid, tid] of legal) {
    if (done.has(fid)) continue;
    const f = byId(fid), t = byId(tid);
    if (legal.get(tid) === fid && !done.has(tid) && active(t)) {
      // Two figures fighting each other: the exchange decides first blow.
      done.add(fid); done.add(tid);
      const closer = (f.moved > 0) !== (t.moved > 0) ? (f.moved > 0 ? f : t) : (f.side === state.firstSide ? f : t);
      const c = recordContact(state.contacts, closer.id, closer === f ? tid : fid, state.round);
      const A = byId(c.first), B = A === f ? t : f;
      const ca = budget(A, combatant(A, "front", { ...pairMods(A, B), ...defMods(B, A) })), cb = budget(B, combatant(B, "front", { ...pairMods(B, A), ...defMods(A, B) }));
      ca.hp = A.invulnerable ? Infinity : start.get(A.id); cb.hp = B.invulnerable ? Infinity : start.get(B.id);
      const charge = A.chargedRound === state.round && c.rounds === 1;
      const ex = resolveExchange({ first: ca, second: cb, round: c.rounds, prevFirst: c.prevFirst, charge }, rng);
      c.prevFirst = ex.striker;
      const lead = ex.striker === "first" ? A : B, lag = lead === A ? B : A;
      spendParry(lag, ex.firstStrike?.parries); spendParry(lead, ex.counter?.parries);
      add(lag.id, ex.firstStrike.damage); if (ex.counter) add(lead.id, ex.counter.damage);
      hit(lead, lag, ex.firstStrike.damage); if (ex.counter) hit(lag, lead, ex.counter.damage);
      const items = [strike(lead, lag, ex.firstStrike), ...afterStrike(ctx, lead, lag, ex.firstStrike), ...parryCounter(lag, lead, ex.firstStrike)];
      if (ex.counter) items.push(strike(lag, lead, ex.counter), ...afterStrike(ctx, lag, lead, ex.counter), ...parryCounter(lead, lag, ex.counter));
      if (ex.killed) items.push({ text: `${lag.name} falls before striking back.` });
      else if (ex.brokeOut) items.push({ text: `${lag.name}'s weapon broke: no return blow.` });
      cards.push({ title: [{ fig: lead.id }, { text: " strikes first on " }, { fig: lag.id }, { aside: `(melee round ${c.rounds}${charge ? `; ${A.name} charged` : ""})` }], items });
    } else {
      // Ganging up, or attacking a figure that is fighting someone else: no return blow.
      done.add(fid);
      if (f.stance === "parry") continue;
      const c = recordContact(state.contacts, fid, tid, state.round);
      const isHeld = t.status === "held" || t.status === "paralyzed";
      const facing = isHeld ? "front" : attackFacing(centre(t), t.facing, centre(f));
      const atk = combatant(f, facing, { everyDieBonus: (isHeld ? HELD_TARGET.everyDieBonus : 0) + pairMods(f, t).everyDieBonus });
      const res = resolveAttackPool({ attacker: { ...atk, dice: atk.thrown }, target: budget(t, combatant(t, "front", { ...(isHeld ? { damageDoubled: true } : {}), ...defMods(f, t) })) }, rng);
      spendParry(t, res.parries); add(t.id, res.damage); hit(f, t, res.damage);
      const items = [strike(f, t, res, facing), ...afterStrike(ctx, f, t, res), ...parryCounter(t, f, res)];
      const tLeft = start.get(t.id) - (dmg.get(t.id) ?? 0);
      if (!isHeld && spent(t) && active(t) && tLeft > 0 && t.returned !== state.round) {
        // A figure that fired or cast this round still strikes back once.
        t.returned = state.round;
        const back = combatant(t, "front", { everyDieBonus: pfePenalty(t, f) + blindPenalty(t) });
        const r2 = resolveAttackPool({ attacker: { ...back, dice: back.thrown || combatProfile(t).dice }, target: budget(f, combatant(f, "front")) }, rng);
        spendParry(f, r2.parries); add(f.id, r2.damage); hit(t, f, r2.damage);
        items.push({ text: `${t.name} fired or cast this round, so makes no attack of its own, but strikes back:` }, strike(t, f, r2), ...afterStrike(ctx, t, f, r2), ...parryCounter(f, t, r2));
      }
      const why = isHeld ? `${t.name} is held: +4 to hit, double damage, no return blow` : spent(t) ? `${t.name} acted in the missile step` : `${t.name} is fighting someone else: no return blow`;
      cards.push({ title: [{ fig: f.id }, { text: " attacks " }, { fig: t.id }, { aside: `(melee round ${c.rounds}; ${why})` }], items });
    }
  }

  // Damage lands together at the end of the step.
  const fell = [];
  for (const f of state.figures) {
    if (!dmg.has(f.id) || !alive(f)) continue;
    if (f.invulnerable) { takeDamage(f, dmg.get(f.id)); continue; }
    f.hp = Math.min(f.hp - dmg.get(f.id), f.maxHp); if (f.hp <= 0) fell.push(f);
  }
  for (const f of fell) if (!f.risesAs && f.lastHitBy) { const as = risesAs(f.lastHitBy, { killed: true, manType: isMan(f) }); if (as) { f.risesAs = as; note(`${f.name} was slain by a ${f.lastHitBy} and will rise as a ${as}.`); } }
  for (const f of state.figures) if (f.pendingStatus) { if (alive(f)) { f.status = f.pendingStatus; f.target = null; } f.pendingStatus = null; }
  const regen = regenerate(state); if (regen) cards.push(regen);
  return { cards, hits, fell: fell.map((f) => f.id) };
}

/* ---------------------------------------------------------------- tests */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };
  const open = (w, h) => Array.from({ length: h }, () => Array(w).fill(false));
  const seq = (v) => { let i = 0; return () => v[i++ % v.length]; };
  const pc = (id, side, x, y, extra) => ({ id, side, origSide: side, name: `F${id}`, kind: "pc", cls: "fighter", level: 1, weaponId: "sword", ac: 4, x, y, facing: 0, placed: true, hp: 6, maxHp: 6, moved: 0, stance: "attack", action: "melee", ...extra });
  const orc = (id, x, y, extra) => ({ id, side: "B", origSide: "B", name: `Orc ${id}`, kind: "monster", monsterKey: "orc", ac: 6, x, y, facing: 4, placed: true, hp: 6, maxHp: 6, moved: 0, stance: "attack", action: "melee", ...extra });
  const st = (figs) => ({ phase: "fight", round: 1, step: "melee", firstSide: "A", width: 20, height: 10, walls: open(20, 10), figures: figs, contacts: new Map() });

  ok(combatProfile(pc(1, "A", 0, 0)).dice === 1 && combatProfile(pc(1, "A", 0, 0, { level: 2 })).dice === 2, "Man +1 throws one die, 2 Men +1 two");
  ok(combatProfile(orc(1, 0, 0, { weaponId: "twohanded" })).weaponId === "twohanded", "an orc's chosen weapon");
  ok(combatant(pc(1, "A", 0, 0, { weaponBroken: true })).thrown === 0, "a broken weapon gives no attack dice");

  // Exchange: two figures fighting each other.
  {
    const a = pc(1, "A", 5, 5, { target: 2 }), b = orc(2, 6, 5, { target: 1 });
    const s = st([a, b]);
    const r = resolveMeleeRound(s, () => 0.99);
    ok(r.cards.some((c) => c.title.some((g) => g.text === " strikes first on ")), "an exchange card");
    ok(b.hp <= 0 && r.fell.includes(2), "a good roll kills the orc");
    ok(s.contacts.size === 1, "the contact is recorded");
  }
  // Ganging up: one parry die stops one blow only.
  {
    const def = pc(1, "A", 5, 5, { stance: "parry", target: 2, invulnerable: true });
    const orcs = [orc(2, 6, 5, { target: 1, weaponId: "twohanded" }), orc(3, 4, 5, { target: 1, weaponId: "twohanded" }), orc(4, 5, 4, { target: 1, weaponId: "twohanded" })];
    const r = resolveMeleeRound(st([def, ...orcs]), seq([0.4, 0.4]));
    const parried = r.cards.flatMap((c) => c.items).filter((i) => i.strike && i.strike.defId === 1).flatMap((i) => i.strike.res.dice).filter((d) => d.parried).length;
    ok(parried === 1, "one parry die: one blow parried in the round");
  }
  // A sleeping figure is slain outright.
  {
    const a = pc(1, "A", 5, 5, { target: 2 }), b = orc(2, 6, 5, { status: "asleep" });
    const r = resolveMeleeRound(st([a, b]), () => 0.5);
    ok(b.hp <= 0 && r.cards[0].title.some((g) => g.text === " slays the sleeping "), "sleeping orc slain");
  }
  // Joining a melee after more than half a move is refused.
  {
    const a = pc(1, "A", 5, 5, { target: 2 }), b = orc(2, 6, 5, { target: 1 }), late = pc(3, "A", 7, 5, { target: 2, moved: 99 });
    const s = st([a, b, late]); s.round = 2; s.contacts.set("1-2", { first: 1, rounds: 1, lastRound: 1 });
    const r = resolveMeleeRound(s, () => 0.5);
    ok(r.cards.some((c) => c.note && /can't join/.test(c.title[0].text)), "late joiner refused");
  }
  // Troll regeneration.
  {
    const t = { ...orc(9, 2, 2), monsterKey: "troll", name: "Troll", hp: 10, maxHp: 30, firstHitRound: 1 };
    const s = st([t]); s.round = 4;
    ok(regenerate(s)?.items[0].text.includes("regenerates 3") && t.hp === 13, "troll regenerates 3");
  }
  console.log(`melee.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

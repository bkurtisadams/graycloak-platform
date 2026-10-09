/**
 * OD&D — the roster: a campaign's characters
 * odd-chainmail-rules · src/roster.mjs
 *
 * Slice 5, pass 4 (Oct 2026). A character is a record the server keeps under
 * the campaign (oddCampaigns/{cid}/characters/{id}); these pure functions make
 * and change it, and turn it into a fight figure and a sheet. The server is
 * the only writer and rolls every die; nothing here touches storage.
 *
 * Men & Magic as the package already reads it: 3d6 in order (rollAbilities),
 * 3d6 x 10 gold, the prime-requisite exchange (opt-in, donor floor 9; every
 * trade raises the prime for all purposes, the cleric's Strength-for-Wisdom
 * trade included: Kurt, Oct 2026, overruling "for experience only"), race,
 * class and alignment limits, Constitution on hit points, languages.
 *
 * Shopping limits by class (defaults, the referee may overrule):
 *   magic-user  daggers only, no armour or shield (Book I)
 *   cleric      mace, morning star, flail; no bows or crossbows (Kurt, Oct 2026)
 *   thief       leather armour, no shield (Greyhawk)
 * A character must own a melee weapon before he is finished.
 *
 * Rolls stand (Kurt, Oct 2026: in the book the referee rolls the abilities):
 * a player can't throw away a rolled character; the referee can delete one.
 */
import { rollAbilities, rollStartingGold, raceClassLegal, raceAlignmentLegal, legalClassesFor, legalAlignmentsFor, recomputeExchange, exchangeDonorsFor, maxExchangeSteps, startingHp, maxLevelFor } from "./chargen.mjs";
import { hitDiceFor } from "./hit-dice.mjs";
import { primeFor, xpMod, missileMod } from "./derivations.mjs";
import { classKey, titleFor, nextThreshold, nextTitle } from "./advancement.mjs";
import { savesFor } from "./tables.mjs";
import { EQUIPMENT, EQUIPMENT_BY_KEY } from "./equipment.mjs";
import { CLERIC_WEAPONS, weaponItem } from "./orders.mjs";
import { characterLanguages } from "./reactions.mjs";
import { slotsFor } from "./spell-progression.mjs";
import { ammoItem } from "./missiles.mjs";
import { ARMOR, baseLoad, moveInches } from "./movement.mjs";
import { inventoryWeight } from "./inventory.mjs";
import { encumbranceFor } from "./encumbrance.mjs";
import { fightingCapabilityFor } from "./fighting-capability.mjs";
import { hirelingsFor } from "./retainers.mjs";

export const ABILITIES = Object.freeze(["str", "int", "wis", "con", "dex", "cha"]);

/**
 * Ownership, as Foundry has it (Kurt, Oct 2026): a level for all players
 * (ownership.default) and, per user, a level that overrides it. None sees
 * nothing; Limited sees the actor's name in the directory; Observer opens his
 * sheet; Owner edits him and runs him in fights. Referees see and edit
 * everything. `owner` is the one who runs him in a fight: the first Owner
 * (the one he already had if still an Owner), else nobody (the referee).
 * `viewers` is what the server stores for Firestore's rules: every user with
 * Limited or better, and "*" when all players have it.
 */
export const OWNERSHIP = Object.freeze({ NONE: 0, LIMITED: 1, OBSERVER: 2, OWNER: 3 });
export const OWNERSHIP_LABEL = Object.freeze(["None", "Limited", "Observer", "Owner"]);
const LEVELS = [0, 1, 2, 3];
/** A character's ownership, filled in for one made before ownership existed: his owner Owner, everyone else None. */
export function ownershipOf(ch) {
  if (ch?.ownership && typeof ch.ownership === "object") return ch.ownership;
  return { default: OWNERSHIP.NONE, ...(ch?.owner ? { [ch.owner]: OWNERSHIP.OWNER } : {}) };
}
/** A user's level for this character (his own, else the all-players level). */
export function levelOf(ch, uid) {
  const o = ownershipOf(ch);
  return uid != null && Number.isInteger(o[uid]) ? o[uid] : (o.default ?? 0);
}
/** Set the ownership: { default, uid: level } (a user left out, or null, takes the default). Returns { ok, ch } with owner and viewers worked out. */
export function setOwnership(ch, ownership = {}, members = []) {
  const def = Number(ownership.default ?? 0);
  if (!LEVELS.includes(def)) return fail("not an ownership level");
  const o = { default: def };
  for (const [u, v] of Object.entries(ownership)) {
    if (u === "default" || v == null || v === "") continue;
    if (!members.includes(u)) return fail("not a player in this game");
    if (!LEVELS.includes(Number(v))) return fail("not an ownership level");
    o[u] = Number(v);
  }
  return { ok: true, ch: withAccess({ ...copy(ch), ownership: o }, members) };
}
/** owner and viewers from the ownership. */
export function withAccess(ch, members = []) {
  const o = ownershipOf(ch), lvl = (u) => (Number.isInteger(o[u]) ? o[u] : o.default ?? 0);
  const owners = members.filter((u) => lvl(u) >= OWNERSHIP.OWNER);
  const owner = owners.includes(ch.owner) ? ch.owner : owners[0] ?? null;
  const viewers = [...new Set([...((o.default ?? 0) >= OWNERSHIP.LIMITED ? ["*"] : []), ...Object.keys(o).filter((u) => u !== "default" && o[u] >= OWNERSHIP.LIMITED)])];
  return { ...ch, ownership: o, owner, viewers };
}
export const RACES = Object.freeze(["human", "dwarf", "elf", "halfling"]);
export const CLASS_LABEL = Object.freeze({ fighter: "Fighting-Man", "magic-user": "Magic-User", cleric: "Cleric", thief: "Thief" });
export const ALIGN_LABEL = Object.freeze({ law: "Law", neutral: "Neutrality", chaos: "Chaos" });
export const NAME_MAX = 40, NOTES_MAX = 4000;

/**
 * First-level spells (Men & Magic p.23). Magic-users remember as many as their
 * slots allow; a cleric has no spell until 2nd level. Ids match casting.mjs
 * where the spell matters in a fight.
 */
export const FIRST_LEVEL_SPELLS = Object.freeze({
  "magic-user": Object.freeze([["detectMagic", "Detect Magic"], ["holdPortal", "Hold Portal"], ["readMagic", "Read Magic"], ["readLanguages", "Read Languages"], ["protectionEvil", "Protection from Evil"], ["light", "Light"], ["charmPerson", "Charm Person"], ["sleep", "Sleep"]]),
  cleric: Object.freeze([["cureLight", "Cure Light Wounds"], ["detectEvil", "Detect Evil"], ["detectMagic", "Detect Magic"], ["light", "Light"], ["protectionEvil", "Protection from Evil"], ["purify", "Purify Food & Water"]])
});

/** What the shop sells: Book I's list less mounts (towns come with slice 6). */
export const SHOP = Object.freeze(EQUIPMENT.filter((e) => e.category !== "mount"));
const BODY = { leather: "leather", mail: "chain", plate: "plate" };
const isMelee = (e) => e?.type === "weapon" && !e.system?.ammoType && !/bow/.test(e.key);
const isLauncher = (e) => e?.type === "weapon" && /bow/.test(e.key);
const isArmour = (e) => e?.type === "armor";

/** Why this class may not buy this item, or null. */
export function gearProblem(cls, key) {
  const e = EQUIPMENT_BY_KEY[key]; if (!e) return "no such item";
  const c = classKey(cls);
  if (c === "magic-user") {
    if (isArmour(e)) return "a magic-user wears no armour";
    if ((isMelee(e) && key !== "dagger") || isLauncher(e)) return "a magic-user may arm himself with daggers only";
  }
  if (c === "cleric") {
    if (isMelee(e) && !CLERIC_WEAPONS.includes(key)) return "a cleric uses no edged weapons (mace, morning star or flail)";
    if (isLauncher(e)) return "a cleric uses no bows or crossbows";
  }
  if (c === "thief" && isArmour(e) && key !== "leather") return "a thief wears leather armour only, and no shield";
  return null;
}

const clamp = (s, n) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const copy = (v) => JSON.parse(JSON.stringify(v));
const fail = (error) => ({ ok: false, error });

/** A new character as rolled: abilities 3d6 in order, gold 3d6 x 10. roll() is a d6. */
export function rollCharacter(roll) {
  const rolled = rollAbilities(roll), gold = rollStartingGold(roll);
  return { status: "draft", level: 1, xp: 0, rolled, abilities: { ...rolled }, exchange: { from: "", steps: 0 }, xpPrimeBonus: 0, gold, coins: { cp: 0, sp: 0, gp: gold }, items: [], ready: { weapon: null, missile: null }, remembered: [], notes: "", hirelings: [], name: "", race: "human", cls: "fighter", alignment: "law" };
}

/** Choices a draft still offers: classes and alignments for its race, exchange donors for its class. */
export function choicesFor(ch) {
  const prime = primeFor(ch.cls);
  return {
    classes: legalClassesFor(ch.race, { greyhawk: true }), alignments: legalAlignmentsFor(ch.race), prime,
    donors: Object.entries(exchangeDonorsFor(ch.cls)).map(([from, ratio]) => ({ from, ratio, max: maxExchangeSteps(ch.rolled, ch.cls, prime, from), xpOnly: false }))
  };
}

/** Name, race, class, alignment and the exchange, on a draft. */
export function setBasics(ch, o = {}) {
  if (ch.status !== "draft") return fail("the character is finished: only the referee changes these now");
  const next = copy(ch);
  if (o.name != null) next.name = clamp(o.name, NAME_MAX);
  if (o.race != null) { if (!RACES.includes(o.race)) return fail("no such race"); next.race = o.race; }
  if (o.cls != null) { if (!CLASS_LABEL[classKey(o.cls)] || classKey(o.cls) !== o.cls) return fail("no such class"); next.cls = o.cls; }
  if (o.alignment != null) { if (!ALIGN_LABEL[o.alignment]) return fail("no such alignment"); next.alignment = o.alignment; }
  if (!raceClassLegal(next.race, next.cls)) return fail(`a ${next.race} can't be a ${CLASS_LABEL[next.cls].toLowerCase()}`);
  if (!raceAlignmentLegal(next.race, next.alignment)) return fail(`a ${next.race} can't be of ${ALIGN_LABEL[next.alignment]}`);
  // a changed class keeps no exchange it can't make; the shop list is checked again on finishing
  const ex = o.exchange ?? (next.cls === ch.cls ? next.exchange : { from: "", steps: 0 });
  if (ex.from && !exchangeDonorsFor(next.cls)[ex.from]) return fail(`a ${CLASS_LABEL[next.cls].toLowerCase()} can't trade ${ex.from}`);
  const r = recomputeExchange({ abilities: next.rolled, xpPrimeBonus: 0, cls: next.cls, prime: primeFor(next.cls), oldRecord: null, newRecord: { from: ex.from || "", steps: Math.max(0, Math.trunc(ex.steps) || 0) }, mode: "real" });
  Object.assign(next, { abilities: r.abilities, xpPrimeBonus: r.xpPrimeBonus, exchange: r.record });
  return { ok: true, ch: next };
}

/** Why the draft can't buy this now (class, gold, a second suit or shield), or null. */
export function buyProblem(ch, key) {
  if (ch.status !== "draft") return "buying after the start comes with towns";
  const e = EQUIPMENT_BY_KEY[key]; if (!e || e.category === "mount") return "the shop doesn't sell that";
  const why = gearProblem(ch.cls, key); if (why) return why;
  if (isArmour(e) && ch.items.some((i) => EQUIPMENT_BY_KEY[i.key]?.system?.slot === e.system?.slot && isArmour(EQUIPMENT_BY_KEY[i.key]))) return e.system?.slot === "shield" ? "he already has a shield" : "he already has body armour";
  if (e.cost > ch.coins.gp) return `${e.name} costs ${e.cost} gp; ${ch.coins.gp} gp left`;
  return null;
}

/** Buy one of an item from the shop with the draft's gold. */
export function buy(ch, key) {
  const why = buyProblem(ch, key); if (why) return fail(why);
  const e = EQUIPMENT_BY_KEY[key];
  const next = copy(ch);
  next.coins.gp -= e.cost;
  const have = next.items.find((i) => i.key === key && !isArmour(e) && !isMelee(e) && !isLauncher(e));
  if (have) have.qty += 1; else next.items.push({ key, qty: 1 });
  return { ok: true, ch: next };
}

/** Take back one of the draft's purchases at the price paid (before he is finished). */
export function sell(ch, index) {
  if (ch.status !== "draft") return fail("selling comes with towns");
  const it = ch.items[index]; if (!it) return fail("no such item");
  const next = copy(ch), e = EQUIPMENT_BY_KEY[it.key];
  next.coins.gp += e.cost;
  if (it.qty > 1) next.items[index].qty -= 1; else next.items.splice(index, 1);
  for (const k of ["weapon", "missile"]) if (next.ready[k] && !next.items.some((i) => i.key === next.ready[k])) next.ready[k] = null;
  return { ok: true, ch: next };
}

/** The weapon in hand and the missile weapon carried into a fight: keys of items he owns. */
export function setReady(ch, o = {}) {
  const next = copy(ch);
  if ("weapon" in o) { if (o.weapon != null && !(ch.items.some((i) => i.key === o.weapon) && isMelee(EQUIPMENT_BY_KEY[o.weapon]))) return fail("he has no such weapon"); next.ready.weapon = o.weapon; }
  if ("missile" in o) { if (o.missile != null && !(ch.items.some((i) => i.key === o.missile) && isLauncher(EQUIPMENT_BY_KEY[o.missile]))) return fail("he has no such bow"); next.ready.missile = o.missile; }
  return { ok: true, ch: next };
}

/** Finish a draft: hit points rolled (Constitution on each die), languages, the weapon in hand. */
export function finish(ch, roll) {
  if (ch.status !== "draft") return fail("already finished");
  if (!ch.name) return fail("give him a name first");
  const melee = ch.items.filter((i) => isMelee(EQUIPMENT_BY_KEY[i.key]));
  if (!melee.length) return fail("buy him a weapon first");
  const bad = ch.items.map((i) => gearProblem(ch.cls, i.key)).find(Boolean); if (bad) return fail(`${bad}: sell it first`);
  const next = copy(ch);
  const hp = Math.max(1, startingHp(hitDiceFor(ch.cls, 1), ch.abilities.con, roll));
  next.hp = hp; next.maxHp = hp; next.status = "ready";
  next.languages = characterLanguages({ alignment: ch.alignment, int: ch.abilities.int, race: ch.race }).known;
  if (!next.ready.weapon) next.ready.weapon = melee[0].key;
  if (!next.ready.missile) next.ready.missile = ch.items.find((i) => isLauncher(EQUIPMENT_BY_KEY[i.key]))?.key ?? null;
  return { ok: true, ch: next };
}

/** Spells he has remembered: first-level ones only so far, no more than his slots. */
export function remember(ch, ids = []) {
  const list = FIRST_LEVEL_SPELLS[classKey(ch.cls)] ?? [];
  const slots = slotsFor(ch.cls, ch.level ?? 1)[0] ?? 0;
  if (!Array.isArray(ids)) return fail("a list of spells, please");
  if (ids.some((id) => !list.some(([k]) => k === id))) return fail("that isn't one of his first-level spells");
  if (ids.length > slots) return fail(slots ? `he can remember ${slots} first-level spell${slots === 1 ? "" : "s"}` : "he has no spells to remember yet");
  return { ok: true, ch: { ...copy(ch), remembered: [...ids] } };
}

export function setNotes(ch, text) { return { ok: true, ch: { ...copy(ch), notes: String(text ?? "").slice(0, NOTES_MAX) } }; }
export function rename(ch, name) { const n = clamp(name, NAME_MAX); return n ? { ok: true, ch: { ...copy(ch), name: n } } : fail("a name, please"); }

/** The armour he wears (the fight's ARMOR id) from what he owns. */
export function armourOf(ch) {
  const keys = ch.items.map((i) => i.key);
  const body = ["plate", "mail", "leather"].find((k) => keys.includes(k));
  const shield = keys.includes("shield");
  const id = body ? `${BODY[body]}${shield ? "+shield" : ""}` : shield ? "shield" : "none";
  return ARMOR.find((a) => a.id === id) ?? ARMOR[0];
}

/**
 * The character as a fight figure: what Setup's "Add the party" puts on the
 * board. His hit points and pack come from the roster (hpSet, invSet), so
 * opening the fight rolls neither; charId ties the figure to the record.
 */
export function toFigure(ch, { id, side = "A", name } = {}) {
  const armour = armourOf(ch), weapon = ch.ready?.weapon ?? null, missile = ch.ready?.missile ?? null;
  const items = [];
  let arrows = 0, bolts = 0;
  for (const it of ch.items) {
    const e = EQUIPMENT_BY_KEY[it.key]; if (!e) continue;
    if (isArmour(e) || it.key === missile) continue;
    if (isMelee(e)) { for (let n = it.key === weapon ? 1 : 0; n < it.qty; n++) items.push(weaponItem(it.key)); continue; }
    if (isLauncher(e)) { items.push({ kind: "gear", name: e.name, unidName: e.name, identified: true, weight: e.system.weight ?? 0 }); continue; }
    if (e.system?.ammoType === "arrow") { arrows += e.system.qty * it.qty; continue; }
    if (e.system?.ammoType === "bolt") { bolts += e.system.qty * it.qty; continue; }
    items.push({ kind: "gear", name: it.qty > 1 ? `${e.name} \u00d7${it.qty}` : e.name, unidName: e.name, identified: true, weight: (e.system?.weight ?? 0) * it.qty });
  }
  if (arrows) items.push(ammoItem("arrow", arrows));
  if (bolts) items.push(ammoItem("bolt", bolts));
  const spare = items.find((i) => i.kind === "weapon")?.weaponId ?? "";
  const a = ch.abilities;
  return {
    id, side, kind: "pc", name: name ?? ch.name, charId: ch.id ?? null, cls: ch.cls, level: ch.level ?? 1, race: ch.race, alignment: ch.alignment,
    armor: armour.id, ac: armour.ac, weaponId: weapon ?? "dagger", missile: missile ?? "", spare,
    str: a.str, int: a.int, wis: a.wis, con: a.con, dex: a.dex, cha: a.cha, purse: 0,
    inv: { coins: { cp: ch.coins?.cp ?? 0, sp: ch.coins?.sp ?? 0, gp: ch.coins?.gp ?? 0 }, items }, invSet: true,
    hp: ch.hp, maxHp: ch.maxHp, hpSet: ch.hp != null, stance: "attack", target: null, action: "melee"
  };
}

/** Everything the sheet shows that is worked out from the record. */
export function sheetFor(ch) {
  const cls = classKey(ch.cls), a = ch.abilities, level = ch.level ?? 1;
  const fig = toFigure(ch, { id: 0 }), load = baseLoad(fig) + inventoryWeight(fig.inv), enc = encumbranceFor(load);
  const prime = primeFor(cls), slots = slotsFor(cls, level);
  const spells = FIRST_LEVEL_SPELLS[cls] ?? [];
  return {
    classLabel: CLASS_LABEL[cls], title: titleFor(cls, level), alignLabel: ALIGN_LABEL[ch.alignment] ?? ch.alignment,
    raceLabel: ch.race === "human" ? "" : `${ch.race[0].toUpperCase()}${ch.race.slice(1)}`, levelCap: maxLevelFor(ch.race, cls),
    nextXp: nextThreshold(cls, level), nextTitle: nextTitle(cls, level),
    prime, xpBonus: xpMod((a[prime] ?? 10) + (ch.xpPrimeBonus ?? 0)), missileMod: missileMod(a.dex),
    saves: savesFor(cls, level, ch.race), fc: fightingCapabilityFor(cls, level).label,
    armour: fig.armor === "none" ? null : ARMOR.find((x) => x.id === fig.armor), ac: fig.ac,
    weapon: ch.ready?.weapon ? EQUIPMENT_BY_KEY[ch.ready.weapon]?.name : null, missile: ch.ready?.missile ? EQUIPMENT_BY_KEY[ch.ready.missile]?.name : null,
    arrows: fig.inv.items.filter((i) => i.kind === "ammo").reduce((n, i) => n + i.qty, 0),
    load, move: moveInches(fig), enc, slots, spells, remembered: spells.filter(([k]) => (ch.remembered ?? []).includes(k)).map(([, n]) => n),
    languages: ch.languages ?? characterLanguages({ alignment: ch.alignment, int: a.int, race: ch.race }).known,
    hirelingsMax: hirelingsFor(a.cha).max
  };
}

/* ---------------------------------------------------------------- tests */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };
  const dice = (...v) => { let i = 0; return () => v[i++ % v.length]; };
  const ch = rollCharacter(dice(4));
  ok(ch.status === "draft" && ch.rolled.str === 12 && ch.gold === 120 && ch.coins.gp === 120, "rolled 3d6 in order and 3d6 x 10 gold");
  let r = setBasics(ch, { name: "Brom", race: "halfling", cls: "magic-user" });
  ok(!r.ok && /halfling/.test(r.error), "a halfling can't be a magic-user");
  r = setBasics(ch, { race: "dwarf", alignment: "chaos" }); ok(!r.ok, "a dwarf can't be of Chaos");
  const strong = { ...ch, rolled: { str: 13, int: 15, wis: 12, con: 15, dex: 16, cha: 11 } }; strong.abilities = { ...strong.rolled };
  r = setBasics(strong, { name: "Brom", cls: "fighter", exchange: { from: "int", steps: 2 } });
  ok(r.ok && r.ch.abilities.str === 15 && r.ch.abilities.int === 11, "fighter trades Intelligence 2 for 1 into Strength");
  r = setBasics(r.ch, { cls: "magic-user" }); ok(r.ok && r.ch.abilities.str === 13 && r.ch.exchange.from === "", "changing class drops a trade the new class can't make");
  const cleric = setBasics({ ...strong, abilities: { ...strong.rolled } }, { cls: "cleric", exchange: { from: "str", steps: 1 } }).ch;
  ok(cleric.abilities.str === 10 && cleric.abilities.wis === 13 && cleric.xpPrimeBonus === 0, "the cleric's Strength trade raises his Wisdom for all purposes (Kurt)");
  let f = setBasics(strong, { name: "Brom", cls: "fighter" }).ch;
  ok(!buy({ ...f, cls: "magic-user" }, "sword").ok && !buy({ ...f, cls: "magic-user" }, "leather").ok, "a magic-user buys no sword and no armour");
  ok(!buy({ ...f, cls: "cleric" }, "sword").ok && buy({ ...f, cls: "cleric" }, "mace").ok && !buy({ ...f, cls: "cleric" }, "shortbow").ok, "a cleric: mace yes, sword and bow no");
  ok(!buy({ ...f, cls: "thief" }, "mail").ok && !buy({ ...f, cls: "thief" }, "shield").ok, "a thief: leather only");
  ok(/needs|weapon/.test(finish(f, dice(3)).error), "no weapon, no finishing");
  for (const k of ["sword", "mail", "shield", "shortbow", "quiver20", "torches", "torches"]) { r = buy(f, k); ok(r.ok, `buys ${k}`); f = r.ch; }
  ok(f.coins.gp === 120 - 10 - 30 - 10 - 25 - 10 - 2 && f.items.find((i) => i.key === "torches").qty === 2, "gold spent; like items stack");
  ok(!buy(f, "plate").ok && /already/.test(buyProblem(f, "shield")), "one suit of body armour, one shield");
  ok(!buy({ ...f, coins: { gp: 5 } }, "sword").ok, "can't buy what he can't afford");
  r = sell(f, f.items.findIndex((i) => i.key === "torches")); ok(r.ok && r.ch.coins.gp === f.coins.gp + 1 && r.ch.items.find((i) => i.key === "torches").qty === 1, "sells one back at the price paid");
  r = finish(f, dice(5)); ok(r.ok && r.ch.status === "ready" && r.ch.hp === 5 + 1 + 1 && r.ch.maxHp === r.ch.hp, "fighter 1+1 hit dice, Constitution 15 adds 1 to the die");
  const done = r.ch;
  ok(done.ready.weapon === "sword" && done.ready.missile === "shortbow" && done.languages.includes("common"), "weapon in hand, bow and languages set on finishing");
  ok(!buy(done, "dagger").ok && !setBasics(done, { race: "elf" }).ok, "a finished character no longer shops or changes his basics");
  const fig = toFigure({ ...done, id: "c1" }, { id: 7, side: "A" });
  ok(fig.armor === "chain+shield" && fig.ac === 4 && fig.weaponId === "sword" && fig.missile === "shortbow" && fig.hpSet && fig.invSet && fig.charId === "c1", "as a figure: armour, weapon, bow, his own hit points and pack");
  ok(fig.inv.items.some((i) => i.kind === "ammo" && i.ammoType === "arrow" && i.qty === 20) && fig.inv.coins.gp === done.coins.gp, "his arrows and his gold go with him");
  const sh = sheetFor(done);
  ok(sh.title === "Veteran" && sh.ac === 4 && sh.move === moveInches(fig) && sh.load === baseLoad(fig) + inventoryWeight(fig.inv) && sh.missileMod === 1 && sh.arrows === 20, "the sheet agrees with the fight on move, load, AC and arrows");
  const mu = finish(buy(setBasics({ ...strong, abilities: { ...strong.rolled } }, { name: "Zed", cls: "magic-user" }).ch, "dagger").ch, dice(2)).ch;
  ok(!remember(mu, ["sleep", "charmPerson"]).ok && remember(mu, ["sleep"]).ok && !remember(mu, ["fireBall"]).ok, "a 1st-level magic-user remembers one first-level spell");
  ok(!remember({ ...mu, cls: "cleric" }, ["light"]).ok, "a 1st-level cleric has no spells yet");
  {
    const c0 = { owner: "bob", name: "Brom" };
    ok(levelOf(c0, "bob") === 3 && levelOf(c0, "ann") === 0, "a character from before ownership: his owner owns him, nobody else sees him");
    let r = setOwnership(c0, { default: 1, ann: 2 }, ["kurt", "bob", "ann", "cy"]);
    ok(r.ok && r.ch.owner === null && levelOf(r.ch, "bob") === 1 && levelOf(r.ch, "ann") === 2 && levelOf(r.ch, "cy") === 1, "all players Limited, Ann Observer; Bob left at the default loses ownership");
    ok(r.ch.viewers.includes("*") && r.ch.viewers.includes("ann"), "viewers: everyone, and Ann by name");
    r = setOwnership(c0, { default: 0, bob: 3, ann: 3 }, ["bob", "ann"]); ok(r.ch.owner === "bob" && !r.ch.viewers.includes("*"), "two owners: he keeps the one he had");
    ok(!setOwnership(c0, { eve: 3 }, ["bob"]).ok && !setOwnership(c0, { default: 7 }, ["bob"]).ok, "only members, only the four levels");
  }
  ok(gearProblem("fighter", "twohanded") === null && SHOP.every((e) => e.category !== "mount"), "a fighter buys anything; no mounts in the shop yet");
  console.log(`roster.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

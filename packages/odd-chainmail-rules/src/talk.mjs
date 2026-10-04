/**
 * OD&D — talking in a fight: parley and offer of service
 * odd-chainmail-rules · src/talk.mjs
 *
 * Runner pass 5, Oct 2026. The rules live in reactions.mjs (encounter
 * reaction, languages, hostile tongues, offer of service); this module applies
 * them to a fight: who speaks which language, the bribe paid, the group
 * holding, withdrawing or joining. Results come back as data cards.
 */
import { MONSTERS } from "./monsters.mjs";
import { encounterReaction, offerService, parleyOptions, isHostileTongue, serviceGate, talksAtAll } from "./reactions.mjs";
import { PROFILE_LABEL } from "./behaviour.mjs";
import { present, active } from "./board.mjs";

const LANG_NAMES = Object.freeze({ common: "Common", "tongue-law": "the Law tongue", "tongue-chaos": "the Chaos tongue", "tongue-neutral": "the Neutral tongue" });
export const languageLabel = (l) => LANG_NAMES[l] ?? MONSTERS.find((m) => m.key === l)?.name ?? (l.charAt(0).toUpperCase() + l.slice(1));
const mon = (f) => MONSTERS.find((m) => m.key === f.monsterKey);
const encGroup = (state, f) => { const k = `${f.origSide ?? f.side}:${f.monsterKey}`, e = state.encounter; return e?.get ? e.get(k) : e?.[k] ?? null; };
export const groupFigures = (state, g) => state.figures.filter((e) => e.kind === "monster" && (e.origSide ?? e.side) === g.side && e.monsterKey === g.monsterKey);

/** The round a group that is uncertain holds through: this round if it hasn't moved yet, otherwise the next. */
export function holdRoundFor(state, side) {
  if (state.step === "init") return state.round + 1;
  if (state.step === `move-${side}`) return state.round;
  if (state.step?.startsWith("move-") && state.firstSide !== side) return state.round;
  return state.round + 1;
}
/** Languages a character can use with a monster's group, including an unused Intelligence slot that could pick up theirs. */
export function talkOptions(state, pc, f) {
  const g = encGroup(state, f), m = mon(f);
  if (!g || !talksAtAll(m.mind.intelligence)) return null;
  const opt = parleyOptions(pc.languages ?? [], g, m.alignment);
  const viaSlot = !opt.usable.length && (pc.langSlots ?? 0) > 0 && g.languages.length ? g.languages[0] : null;
  if (!opt.usable.length && !viaSlot) return null;
  return { g, m, opt, viaSlot };
}
export function canParleyNow(state, pc, f) {
  if (state.phase !== "fight" || state.meleeBegun || pc.kind !== "pc" || !active(pc) || f.kind !== "monster" || !present(f) || f.side === pc.side) return null;
  const o = talkOptions(state, pc, f);
  return o && !["negative", "positive"].includes(o.g.reaction) ? o : null;
}
export function serviceState(state, pc, f) {
  if (state.phase === "setup" || pc.kind !== "pc" || !active(pc) || f.kind !== "monster" || f.serviceClosed || f.retainer) return null;
  if (!(present(f) && f.side !== pc.side) && f.status !== "surrendered") return null;
  const o = talkOptions(state, pc, f); if (!o) return null;
  const gate = serviceGate({ intelligence: o.m.mind.intelligence, pcAlignment: pc.alignment ?? "law", monsterAlignment: o.m.alignment, charmed: !!f.charmed, reward: 1 });
  return { ...o, gate };
}
function speak(pc, o, lang) { if (lang === o.viaSlot && !pc.languages.includes(lang)) { pc.languages.push(lang); pc.langSlots--; } }
const payGold = (pc, gp) => { if (gp > 0) pc.inv.coins.gp = Math.max(0, (pc.inv.coins.gp ?? 0) - gp); };

/**
 * Parley (Book III reactions; Book I languages; Kurt, Oct 2026). opts:
 * { lang, gp, bribeMod 0-2, force 0-2, alignmentKnown }. Returns { ok, card, error }.
 */
export function parley(state, pc, f, opts, rng) {
  const o = canParleyNow(state, pc, f);
  if (!o) return { ok: false, error: "parley isn't possible now" };
  const { g, m } = o;
  speak(pc, o, opts.lang);
  const title = [{ fig: pc.id }, { text: ` parleys with the ${m.name}s in ${languageLabel(opts.lang)}` }];
  if (isHostileTongue(opts.lang, m.alignment)) {
    g.reaction = "negative"; g.holdRound = null;
    return { ok: true, card: { title, items: [{ text: `They know ${languageLabel(opts.lang)} for an enemy's speech and attack.`, hit: true }] } };
  }
  const gp = Math.max(0, Math.min(pc.inv?.coins?.gp ?? 0, Math.trunc(Number(opts.gp) || 0)));
  const r = encounterReaction({ intelligence: m.mind.intelligence, modifiers: { bribe: gp > 0 ? Number(opts.bribeMod) || 0 : 0, superiorForce: Number(opts.force) || 0, alignmentKnown: !!opts.alignmentKnown, pcAlignment: pc.alignment ?? "law", monsterAlignment: m.alignment } }, rng);
  const mods = r.mods.parts.map((p) => `${p.why} ${p.mod > 0 ? "+" : ""}${p.mod}`).join(", ");
  const items = [{ text: `2d6 [${r.dice.join(",")}]${mods ? ` (${mods})` : ""} = ${r.total}: ${r.result}`, aud: "referee" }];
  if (r.result === "negative") { g.reaction = "negative"; g.holdRound = null; items.push({ text: `Talks fail. They fight as their nature dictates (${PROFILE_LABEL[m.mind.behavior]}).`, hit: true }); }
  else if (r.result === "uncertain") { g.reaction = "uncertain"; g.holdRound = holdRoundFor(state, g.side); items.push({ text: `They hold for round ${g.holdRound}. ${pc.name} can raise the bribe or fall back.` }); }
  else {
    g.reaction = "positive"; g.holdRound = null;
    payGold(pc, gp);
    for (const e of groupFigures(state, g)) if (present(e)) { e.status = "withdrew"; e.target = null; }
    items.push({ text: `They accept terms and withdraw${gp ? `, taking the ${gp} gp bribe` : ""}.` });
  }
  return { ok: true, card: { title, items }, result: r.result };
}

/** Offer of service (Book I). opts: { lang, gp, more 0-2 }. Returns { ok, card, error }. */
export function offerServiceTo(state, pc, f, opts, rng) {
  const o = serviceState(state, pc, f);
  if (!o || !o.gate.ok) return { ok: false, error: o?.gate?.reason ?? "service can't be offered now" };
  speak(pc, o, opts.lang);
  const title = [{ fig: pc.id }, { text: " offers " }, { fig: f.id }, { text: " service" }];
  if (isHostileTongue(opts.lang, o.m.alignment)) {
    f.serviceClosed = true; if (f.status === "surrendered") { f.status = null; f.target = pc.id; }
    return { ok: true, card: { title, items: [{ text: `${f.name} knows ${languageLabel(opts.lang)} for an enemy's speech and attacks.`, hit: true }] } };
  }
  const gp = Math.max(0, Math.min(pc.inv?.coins?.gp ?? 0, Math.trunc(Number(opts.gp) || 0)));
  const r = offerService({ cha: pc.cha ?? 10, offerBonus: Number(opts.more) || 0, intelligence: o.m.mind.intelligence, pcAlignment: pc.alignment ?? "law", monsterAlignment: o.m.alignment, charmed: !!f.charmed, reward: gp }, rng);
  if (!r.rolled) return { ok: true, card: { title, items: [{ text: `No offer: ${r.reason}.` }] } };
  const items = [{ text: `2d6 [${r.dice.join(",")}] ${r.loyaltyBase >= 0 ? "+" : ""}${r.loyaltyBase} (Cha)${r.offerBonus ? ` +${r.offerBonus} (bigger offer)` : ""} = ${r.total}: ${r.key.toLowerCase()}`, aud: "referee" }];
  if (r.accepts) {
    payGold(pc, gp);
    f.side = pc.side; f.status = null; f.target = null; f.retainer = true; f.loyaltyBonus = r.loyaltyBonus;
    items.push({ text: `${f.name} takes the ${gp} gp and joins side ${pc.side}${r.loyaltyBonus ? ` as an enthusiast (loyalty +${r.loyaltyBonus})` : ""}.` });
  } else if (r.canRaise) { f.serviceTries = (f.serviceTries ?? 0) + 1; items.push({ text: `${f.name} is uncertain: a bigger offer may sway it.` }); }
  else {
    f.serviceClosed = true;
    if (r.attacks && f.status === "surrendered") { f.status = null; f.target = pc.id; }
    items.push({ text: r.attacks ? `${f.name} attacks!` : `${f.name} is hostile: talks end.`, hit: true });
  }
  return { ok: true, card: { title, items }, key: r.key };
}

/* ---------------------------------------------------------------- tests */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };
  const seq = (v) => { let i = 0; return () => v[i++ % v.length]; };
  const d6 = (n) => (n - 0.5) / 6;
  const pc = (extra) => ({ id: 1, side: "A", origSide: "A", name: "F1", kind: "pc", alignment: "chaos", cha: 10, languages: ["common", "tongue-chaos", "orc"], langSlots: 0, inv: { coins: { gp: 50 } }, hp: 6, placed: true, ...extra });
  const orc = (id) => ({ id, side: "B", origSide: "B", name: `Orc ${id}`, kind: "monster", monsterKey: "orc", hp: 6, placed: true });
  const st = () => ({ phase: "fight", step: "move-A", round: 1, firstSide: "A", meleeBegun: false, figures: [pc(), orc(2), orc(3)], encounter: new Map([["B:orc", { side: "B", monsterKey: "orc", languages: ["orc"], reaction: null }]]) });

  { const s = st(); const r = parley(s, s.figures[0], s.figures[1], { lang: "orc", gp: 30, bribeMod: 2 }, seq([d6(4), d6(4)]));
    ok(r.ok && r.result === "positive" && s.figures[1].status === "withdrew" && s.figures[2].status === "withdrew" && s.figures[0].inv.coins.gp === 20, "8 + bribe 2: they take the gold and withdraw"); }
  { const s = st(); const r = parley(s, s.figures[0], s.figures[1], { lang: "orc", gp: 0 }, seq([d6(3), d6(4)]));
    ok(r.result === "uncertain" && s.encounter.get("B:orc").holdRound === 1, "uncertain: they hold this round"); }
  { const s = st(); s.meleeBegun = true; ok(!parley(s, s.figures[0], s.figures[1], { lang: "orc" }, Math.random).ok, "no parley once melee has begun"); }
  { const s = st(); const r = offerServiceTo(s, s.figures[0], s.figures[1], { lang: "orc", gp: 10 }, seq([d6(6), d6(5)]));
    ok(r.ok && s.figures[1].side === "A" && s.figures[1].retainer && s.figures[0].inv.coins.gp === 40, "11: the orc joins for 10 gp"); }
  { const s = st(); s.figures[0].alignment = "law"; ok(!offerServiceTo(s, s.figures[0], s.figures[1], { lang: "orc", gp: 10 }, Math.random).ok, "alignment differs: no offer"); }
  console.log(`talk.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

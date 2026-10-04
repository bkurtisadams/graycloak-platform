/**
 * OD&D — Chainmail engine · the missile and spell step
 * odd-chainmail-rules · src/missile-step.mjs
 *
 * Runner pass 5, Oct 2026: the step that resolves missile fire and spells moves
 * here from the combat tester. Breath and gaze act first (melee.mjs
 * monsterPowers); then everyone firing or casting acts in Dexterity order,
 * highest first, damage within a Dexterity band landing together. A caster who
 * moved, or was hit by an earlier band, loses the spell (castingGate). Results
 * come back as data cards (see melee.mjs) plus hits; a card item may also be
 * { volley } (missiles.mjs fireVolley's event).
 */
import { combatSpellsFor, castingGate, areaSpellDice, saveForHalf, fireBallCells, lightningCells, lightningStartOk,
  sleepCells, sleepInArea, SLEEP_RADIUS, sleepCapacity, pickRandom, isPerson, saveVsSpells, HOLD_PERSON_MAX } from "./casting.mjs";
import { hitDiceFor } from "./hit-dice.mjs";
import { MONSTERS } from "./monsters.mjs";
import { missileBand, missileRange } from "./tables.mjs";
import { fireVolley, dexOf } from "./missiles.mjs";
import { savesOf, hdOf, baneHit, monsterPowers } from "./melee.mjs";
import { alive, present, active, adjacent, distIn, lineOfSight, inMelee, isWall, sz, takeDamage } from "./board.mjs";
import { footCells } from "./movement.mjs";
import { BLIND } from "./specials.mjs";

export const AREA_SPELLS = Object.freeze(["fireBall", "lightningBolt", "sleep"]);

/** Cells and figures an area spell would catch, aimed at cell (x, y). */
export function areaOf(state, caster, spellId, x, y) {
  const open = (cx, cy) => !isWall(state, cx, cy);
  let cells, reachOk = true;
  const c = { x: caster.x + (sz(caster) - 1) / 2, y: caster.y + (sz(caster) - 1) / 2 };
  if (spellId === "fireBall") cells = fireBallCells({ x, y }, open, 2);
  else if (spellId === "sleep") cells = sleepCells({ x, y }, open, SLEEP_RADIUS);
  else { const r = lightningCells(c, { x, y }, open); cells = r.cells; reachOk = lightningStartOk(c, { x, y }); }
  const set = new Set(cells.map(([cx, cy]) => `${cx},${cy}`));
  const caught = state.figures.filter((e) => e.placed && present(e) && footCells(e.x, e.y, sz(e)).some(([cx, cy]) => set.has(`${cx},${cy}`)));
  return { cells, caught, reachOk };
}

/** One spell's effect. Returns { card, hits }. */
export function castSpell(state, f, t, sp, rng) {
  const hits = [];
  const title = (extra = []) => [{ fig: f.id }, { text: ` casts ${sp.name}` }, ...extra];
  if (sp.id === "fireBall" || sp.id === "lightningBolt") {
    const { caught } = areaOf(state, f, sp.id, f.castAim.x, f.castAim.y);
    const { dice, save } = areaSpellDice("cast", f.level);
    const items = [{ text: `${sp.id === "fireBall" ? "2\u2033 burst, filling the space it bursts in" : "6\u2033 bolt, doubling back off walls"}; ${dice} dice, save vs spells for half.` }];
    for (const e of caught) {
      let dmg = 0; for (let i = 0; i < dice; i++) dmg += 1 + Math.floor(rng() * 6);
      const sv = saveForHalf(savesOf(e), save, dmg, rng, e.pfe ? 1 : 0);
      takeDamage(e, sv.damage); hits.push({ a: f.id, t: e.id, dmg: sv.damage }); if (sp.id === "fireBall") baneHit(state, e, "fire");
      items.push({ text: `${e.name}: ${dice}d6 = ${dmg}; save vs spells d20 ${sv.roll}${sv.mod ? " +1" : ""} vs ${sv.need}: ${sv.saved ? "half" : "full"}, ${sv.damage} damage${e.hp <= 0 ? " — down" : ""}${e.burned && e.hp <= 0 ? " and burned" : ""}`, hit: true });
    }
    if (!caught.length) items.push({ text: "No one caught in it." });
    f.castAim = null;
    return { card: { title: title(), items }, hits };
  }
  if (sp.id === "sleep" && f.castAim) {
    const { caught } = areaOf(state, f, "sleep", f.castAim.x, f.castAim.y);
    const r = sleepInArea(caught.filter(active).map((e) => ({ id: e.id, hd: hdOf(e) })), rng);
    f.castAim = null;
    if (!r.toughest) return { card: { title: title(), items: [{ text: caught.length ? "No one caught is weak enough to sleep (4+1 hit dice or less)." : "No one caught in it." }] }, hits };
    const byId = (id) => state.figures.find((e) => e.id === id);
    for (const x of r.asleep) { const e = byId(x.id); e.status = "asleep"; e.target = null; }
    return { card: { title: title(), items: [{ text: `${SLEEP_RADIUS}\u2033 radius; rolled for the toughest caught (${byId(r.toughest.id).name}, ${r.toughest.hd} HD): ${r.cap.dice} = ${r.cap.n}` }, { text: `Asleep: ${r.asleep.map((x) => byId(x.id).name).join(", ") || "none"}`, hit: true }] }, hits };
  }
  if (sp.id === "sleep") {
    const h = t.kind === "pc" ? hitDiceFor(t.cls, t.level) : MONSTERS.find((m) => m.key === t.monsterKey).hd;
    const cap = sleepCapacity(t.kind === "pc" ? h.dice : h.count, h.bonus, rng);
    if (!cap.n) return { card: { title: title([{ text: " at " }, { fig: t.id }]), items: [{ text: `${t.name} is too powerful to sleep.` }] }, hits };
    const band = hdOf(t);
    const pool = state.figures.filter((e) => active(e) && e.side !== f.side && hdOf(e) <= Math.max(band, 1.5) && distIn(f, e) <= sp.range && lineOfSight(state, f, e));
    const asleep = pickRandom(pool, cap.n, rng);
    for (const e of asleep) { e.status = "asleep"; e.target = null; }
    return { card: { title: title([{ text: " at " }, { fig: t.id }]), items: [{ text: `${cap.dice} = ${cap.n}; no saving throw` }, { text: `Asleep: ${asleep.map((e) => e.name).join(", ") || "none"}`, hit: true }] }, hits };
  }
  if (sp.id === "holdPerson") {
    const ids = [...new Set([t.id, ...(f.holdTargets ?? [])])].slice(0, HOLD_PERSON_MAX);
    const targets = ids.map((id) => state.figures.find((e) => e.id === id)).filter((e) => e && present(e) && e.side !== f.side && distIn(f, e) <= sp.range);
    const single = targets.length === 1;
    const items = targets.map((e) => {
      if (!isPerson(e)) return { text: `${e.name} isn't a person; no effect.` };
      const sv = saveVsSpells(savesOf(e), rng, (single ? -2 : 0) + (e.pfe ? 1 : 0));
      if (!sv.saved) { e.status = "held"; e.target = null; }
      return { text: `${e.name}: save d20 ${sv.roll}${sv.mod ? ` ${sv.mod > 0 ? "+" : ""}${sv.mod}` : ""} vs ${sv.need}: ${sv.saved ? "saved" : "held"}`, hit: !sv.saved };
    });
    f.holdTargets = [];
    return { card: { title: [{ fig: f.id }, { text: ` casts Hold Person on ${targets.length} target${single ? " (single: −2 on the save)" : "s"}` }], items }, hits };
  }
  if (sp.id === "charmPerson") {
    if (!isPerson(t)) return { card: { title: title([{ text: " at " }, { fig: t.id }]), items: [{ text: `${t.name} isn't a person; no effect.` }] }, hits };
    const sv = saveVsSpells(savesOf(t), rng, t.pfe ? 1 : 0);
    const items = [{ text: `Save vs spells d20 ${sv.roll}${sv.mod ? ` ${sv.mod}` : ""} vs ${sv.need}: ${sv.saved ? "saved" : "fails"}`, hit: !sv.saved }];
    if (!sv.saved) { t.side = f.side; t.charmed = true; t.target = null; items.push({ text: `${t.name} is charmed and fights for side ${f.side} from next round.`, hit: true }); }
    return { card: { title: title([{ text: " at " }, { fig: t.id }]), items }, hits };
  }
  f.pfe = true;
  return { card: { title: title(), items: [{ text: `Evil attackers take −1 on every blow and shot against ${f.name}; +1 on his saves.` }] }, hits };
}

/** The whole missile and spell step. Returns { cards, hits, fell }. */
export function resolveMissileStep(state, rng) {
  const byId = (id) => state.figures.find((e) => e.id === id);
  const powers = monsterPowers(state, rng);
  const cards = [...powers.cards], hits = [...powers.hits], plans = [];
  const note = (text) => cards.push({ note: true, title: [{ text }], items: [] });
  for (const f of state.figures) {
    if (!active(f) || !f.action || f.action === "melee" || f.action === "hold") continue;
    const selfSpell = f.action === "cast:protectionEvil";
    if (f.action.startsWith("cast:") && AREA_SPELLS.includes(f.action.slice(5))) {
      const spell = combatSpellsFor(f.cls, f.slotsLeft).find((x) => x.id === f.action.slice(5));
      if (!spell) { note(`${f.name} has no slot left for that spell.`); continue; }
      if (!f.castAim) { note(`${f.name} hasn't placed ${spell.name}.`); continue; }
      const aim = { x: f.castAim.x, y: f.castAim.y, size: 1 };
      if (distIn(f, aim) > spell.range || !lineOfSight(state, f, aim)) { note(`${spell.name}'s aim point is out of range or sight.`); continue; }
      plans.push({ f, t: aim, kind: "cast", spell });
      continue;
    }
    if (!selfSpell && f.target == null) { note(`${f.name} has no target for that action.`); continue; }
    const t = selfSpell ? f : byId(f.target); if (!t || !present(t)) continue;
    const d = distIn(f, t);
    if (f.action === "fire" || f.action === "passthrough") {
      if (!f.missile) continue;
      if (f.lastFired === state.round) { note(`${f.name} has already fired this turn.`); continue; }
      if (inMelee(state, f)) { note(`${f.name} is in melee and can't fire.`); continue; }
      if (inMelee(state, t)) { note(`${f.name} holds fire: ${t.name} is in a melee.`); continue; }
      if (!lineOfSight(state, f, t)) { note(`${f.name} has no line of sight to ${t.name}.`); continue; }
      if (f.averted && BLIND.missileAdjacentOnly && !adjacent(f, t)) { note(`${f.name} is averting his eyes: missiles only at an adjacent target.`); continue; }
      if (!missileBand(d, missileRange(f.missile))) { note(`${t.name} is out of range (${d}" of ${missileRange(f.missile)}").`); continue; }
      plans.push({ f, t, kind: "fire" });
    } else if (f.action.startsWith("cast:")) {
      const spell = combatSpellsFor(f.cls, f.slotsLeft).find((x) => x.id === f.action.slice(5));
      if (!spell) { note(`${f.name} has no slot left for that spell.`); continue; }
      if (spell.id !== "protectionEvil" && d > spell.range) { note(`${t.name} is beyond ${spell.name}'s ${spell.range}" range.`); continue; }
      if (spell.id !== "protectionEvil" && !lineOfSight(state, f, t)) { note(`${f.name} can't see ${t.name}.`); continue; }
      plans.push({ f, t, kind: "cast", spell });
    }
  }
  const bands = [...new Set(plans.map((p) => dexOf(p.f)))].sort((a, b) => b - a);
  const attacked = new Set(), fell = [];
  for (const dex of bands) {
    const dmg = new Map(); const shotAt = [];
    for (const p of plans.filter((q) => dexOf(q.f) === dex)) {
      const { f, t } = p;
      if (!active(f)) continue;
      f.acted = state.round;
      if (p.kind === "fire") {
        const v = fireVolley(state, f, t, rng, dmg);
        for (const l of v.lines) { if (l.damage) hits.push({ a: f.id, t: l.targetId, dmg: l.damage }); if (l.hits > 0) shotAt.push(l.targetId); }
        cards.push({ title: [], items: [{ volley: v }], volleyOnly: true });
      } else {
        const sp = p.spell;
        f.slotsLeft[sp.level - 1]--;
        const gate = castingGate({ moved: f.moved, hitFirst: attacked.has(f.id) });
        if (!gate.ok) { hits.push({ a: f.id, t: null, dmg: 0, extra: `lost ${sp.name}` }); cards.push({ title: [{ fig: f.id }, { text: ` casts ${sp.name}` }], items: [{ text: `Spoiled: ${gate.reason}. The spell is lost.`, hit: true }] }); continue; }
        const before = new Map(state.figures.map((x) => [x.id, `${x.status}|${x.side}`]));
        const r = castSpell(state, f, t, sp, rng);
        cards.push(r.card); hits.push(...r.hits);
        const changed = state.figures.filter((x) => `${x.status}|${x.side}` !== before.get(x.id));
        hits.push({ a: f.id, t: null, dmg: 0, extra: `cast ${sp.name}${changed.length ? `: ${changed.map((x) => `${x.name} ${x.charmed && x.side === f.side ? "charmed" : x.status}`).join(", ")}` : ""}` });
      }
    }
    for (const id of shotAt) attacked.add(id);
    for (const [id, n] of dmg) { const g = byId(id); if (!alive(g)) continue; takeDamage(g, n); if (g.hp <= 0) fell.push(g.id); }
  }
  for (const h of hits) { const g = h.t != null ? byId(h.t) : null; if (g && !alive(g) && !fell.includes(g.id) && h.dmg > 0) fell.push(g.id); }
  return { cards, hits, fell };
}

/* ---------------------------------------------------------------- tests */
function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };
  const open = (w, h) => Array.from({ length: h }, () => Array(w).fill(false));
  const pc = (id, side, x, y, extra) => ({ id, side, origSide: side, name: `F${id}`, kind: "pc", cls: "fighter", level: 1, weaponId: "sword", dex: 10, ac: 7, x, y, facing: 0, placed: true, hp: 6, maxHp: 6, moved: 0, action: "melee", ...extra });
  const orc = (id, x, y, extra) => ({ id, side: "B", origSide: "B", name: `Orc ${id}`, kind: "monster", monsterKey: "orc", ac: 6, x, y, facing: 4, placed: true, hp: 6, maxHp: 6, moved: 0, action: "melee", ...extra });
  const st = (figs) => ({ phase: "fight", round: 1, step: "missiles", width: 40, height: 12, walls: open(40, 12), figures: figs, contacts: new Map() });

  // Sleep placed on a group of orcs.
  {
    const mu = pc(1, "A", 2, 5, { cls: "magic-user", level: 1, action: "cast:sleep", castAim: { x: 20, y: 5 }, slotsLeft: [1, 0, 0, 0, 0, 0] });
    const orcs = [orc(2, 20, 5), orc(3, 21, 5), orc(4, 20, 6)];
    const r = resolveMissileStep(st([mu, ...orcs]), () => 0.99);
    ok(orcs.every((o) => o.status === "asleep") && mu.slotsLeft[0] === 0 && r.cards.some((c) => c.title.some((g) => g.text === " casts Sleep")), "Sleep puts the orcs under the template to sleep and spends the slot");
  }
  // A caster who moved loses the spell.
  {
    const mu = pc(1, "A", 2, 5, { cls: "magic-user", level: 1, action: "cast:sleep", castAim: { x: 20, y: 5 }, slotsLeft: [1, 0, 0, 0, 0, 0], moved: 2 });
    const r = resolveMissileStep(st([mu, orc(2, 20, 5)]), () => 0.5);
    ok(r.cards.some((c) => c.items.some((i) => /Spoiled/.test(i.text ?? ""))), "moved: the spell is spoiled");
  }
  // An archer fires; damage lands at the end of his Dexterity band.
  {
    const a = pc(1, "A", 2, 5, { missile: "shortbow", action: "fire", target: 2 }), o = orc(2, 10, 5, { hp: 1 });
    const r = resolveMissileStep(st([a, o]), () => 0.99);
    ok(r.cards.some((c) => c.items[0]?.volley) && o.hp <= 0 && r.fell.includes(2), "volley kills the orc");
  }
  // Can't fire into a melee.
  {
    const a = pc(1, "A", 2, 5, { missile: "shortbow", action: "fire", target: 2 }), o = orc(2, 10, 5, { target: 3 }), f = pc(3, "A", 11, 5, { target: 2 });
    const r = resolveMissileStep(st([a, o, f]), () => 0.99);
    ok(r.cards.some((c) => c.note && /in a melee/.test(c.title[0].text)), "holds fire at a figure in melee");
  }
  console.log(`missile-step.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

// ---------------------------------------------------------------------------
// odd/roster-ui.mjs — slice 5, pass 4 (Oct 2026): the roster in the browser.
//
// The Party tab's list of characters, chargen for a rolled character, and the
// character sheet (approved mockup, "the table as a player": a dark title bar
// with name, title, class and level, alignment; Sheet / Gear / Notes tabs; six
// ability boxes; hit points, armour, weapons, saves, XP and move). Everything
// shown is worked out by the rules package (roster.sheetFor); every change is
// a request to oddCharacter, and the page redraws when the roster changes.
// ---------------------------------------------------------------------------

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const AB = { str: "STR", int: "INT", wis: "WIS", con: "CON", dex: "DEX", cha: "CHA" };
const AB_NAME = { str: "Strength", int: "Intelligence", wis: "Wisdom", con: "Constitution", dex: "Dexterity", cha: "Charisma" };
const RACE_LABEL = { human: "Human", dwarf: "Dwarf", elf: "Elf", halfling: "Halfling" };
const SAVE_LABEL = [["deathPoison", "Death"], ["wands", "Wands"], ["stone", "Stone"], ["dragon", "Breath"], ["staves", "Spells"]];
const CATS = [["weapon", "Weapons"], ["armor", "Armour"], ["ammo", "Ammunition"], ["gear", "Gear"], ["container", "Containers"]];
const n = (x) => Number(x ?? 0).toLocaleString("en-US");
const signed = (x) => (x > 0 ? `+${x}` : `${x}`);
/** "common" → "Common"; an alignment tongue ("tongue-law") → "Lawful tongue". */
const langName = (l) => { const m = /^tongue-(\w+)$/.exec(l); if (m) return `${{ law: "Lawful", neutral: "Neutral", chaos: "Chaotic" }[m[1]] ?? m[1]} tongue`; return l.replace(/(^|[-\s])(\w)/g, (a, s, c) => `${s === "-" ? " " : s}${c.toUpperCase()}`); };
const opts = (list, cur) => list.map(([v, l]) => `<option value="${esc(v)}" ${v === cur ? "selected" : ""}>${esc(l)}</option>`).join("");

/** "Brom" with his class line for the window's title bar: "Veteran · Fighting-Man 1 · Law". */
export function titleFor(rs, ch) {
  if (ch.status === "draft") return { title: ch.name || "New character", sub: "rolled \u00b7 not finished" };
  const sh = rs.sheetFor(ch);
  return { title: ch.name, sub: `${sh.title} \u00b7 ${sh.raceLabel ? `${sh.raceLabel} ` : ""}${sh.classLabel} ${ch.level ?? 1} \u00b7 ${sh.alignLabel}` };
}

/**
 * The Actors directory (Foundry's sidebar directory, Kurt Oct 2026): "Create Actor" at the top, then a
 * folder per kind. Player Characters for now; NPCs, hirelings and retainers get their folder when they
 * become campaign data. The referee's menu on an actor changes who owns it (Configure Ownership).
 */
export function rosterHtml(rs, chars, { me, ref, people, members = [], inFight, menuFor = null }) {
  const who = (uid) => (uid === me ? "you" : people?.[uid]?.name ?? "a player");
  const done = chars.filter((c) => c.status !== "draft"), drafts = chars.filter((c) => c.status === "draft");
  const mine = drafts.find((c) => c.owner === me);
  const entry = (c) => {
    const sh = rs.sheetFor(c), col = people?.[c.owner]?.color ?? "#999";
    const menu = ref && menuFor === c.id ? `<div class="rs-menu"><label>Owner <select data-rs-owner="${esc(c.id)}">${members.map((u) => `<option value="${esc(u)}" ${u === c.owner ? "selected" : ""}>${esc(people?.[u]?.name ?? u)}</option>`).join("")}</select></label><span class="note">Configure Ownership: the owner runs him in fights and edits his sheet.</span></div>` : "";
    return `<div class="rs-row"><span class="rs-own" style="background:${esc(col)}" title="Owned by ${esc(who(c.owner))}"></span><button type="button" class="rs-main" data-rs-open="${esc(c.id)}"><b>${esc(c.name)}</b> <span class="note">${esc(sh.raceLabel ? `${sh.raceLabel} ` : "")}${esc(sh.classLabel)} ${c.level ?? 1}</span><br>
      <span class="mono rs-stats">${c.hp}/${c.maxHp} hp \u00b7 AC ${sh.ac} \u00b7 move ${sh.move}\u2033</span> <span class="note">\u00b7 ${esc(who(c.owner))}</span></button>
      ${ref ? `<button type="button" class="rs-dots" data-rs-menu="${esc(c.id)}" title="Configure Ownership" aria-label="Actor menu">\u22ef</button>` : ""}</div>${menu}`;
  };
  const others = drafts.filter((c) => c.owner !== me).map((c) => `<div class="note">${esc(who(c.owner))} is rolling a character${ref ? ` <button type="button" class="linkish" data-rs-open="${esc(c.id)}">look</button>` : ""}</div>`).join("");
  return `<div class="rs-create">${mine ? `<button type="button" class="primary" data-rs-open="${esc(mine.id)}">Finish ${esc(mine.name || "your rolled character")}</button>` : `<button type="button" data-rs-roll>Create Actor</button>`}<span class="note">3d6 in order, then class, race and shopping</span></div>
    <details class="rs-folder" open><summary>Player Characters <span class="note">(${done.length})</span></summary>
    ${done.map(entry).join("") || `<div class="note">No characters yet.</div>`}${others}</details>
    ${inFight ? "" : `<div class="note">The referee adds the party to a fight from Setup.</div>`}`;
}

function abilityBoxes(rs, ch, sh, { rolled = false } = {}) {
  return `<div class="rs-abil">${rs.ABILITIES.map((k) => {
    const v = ch.abilities[k], was = ch.rolled?.[k], fx = [];
    if (!rolled) {
      if (k === sh.prime && sh.xpBonus) fx.push(`${signed(sh.xpBonus)}% XP`);
      if (k === "dex" && sh.missileMod) fx.push(`${signed(sh.missileMod)} missile`);
      if (k === "con" && (v >= 15 || v <= 6)) fx.push(`${v >= 15 ? "+1" : "\u22121"} hp/die`);
      if (k === "int" && v > 10) fx.push(`+${v - 10} lang`);
    }
    const changed = was != null && was !== v;
    return `<div class="rs-box" title="${esc(AB_NAME[k])}${k === sh.prime ? " (prime requisite)" : ""}"><div class="k">${AB[k]}${k === sh.prime ? "*" : ""}</div><b>${v}</b>${changed ? `<div class="was">rolled ${was}</div>` : ""}${fx.length ? `<div class="fx">${esc(fx.join(", "))}</div>` : ""}</div>`;
  }).join("")}</div>`;
}

/** The sheet of a finished character: tab is "sheet", "gear" or "notes". */
export function sheetHtml(rs, ch, { tab = "sheet", canEdit, ref, people, me, editingSpells = false, spellPick = null, error = "" }) {
  const sh = rs.sheetFor(ch), lvl = ch.level ?? 1;
  const tabs = `<div class="rs-tabs" role="tablist">${[["sheet", "Sheet"], ["gear", "Gear"], ["notes", "Notes"]].map(([k, l]) => `<button type="button" role="tab" aria-selected="${k === tab}" data-rs-tab="${k}">${l}</button>`).join("")}</div>`;
  const err = error ? `<div class="rs-err">${esc(error)}</div>` : "";
  if (tab === "gear") {
    const items = ch.items.map((it) => { const e = rs.SHOP.find((x) => x.key === it.key); return `<tr><td>${esc(e?.name ?? it.key)}${it.qty > 1 ? ` \u00d7${it.qty}` : ""}${it.key === ch.ready?.weapon ? ` <span class="note">in hand</span>` : ""}</td><td class="num">${e?.system?.ammoType && e.system.ammoType !== "none" ? `<span class="note">with the bow</span>` : n((e?.system?.weight ?? 0) * it.qty)}</td></tr>`; }).join("");
    const melee = ch.items.filter((i) => { const e = rs.SHOP.find((x) => x.key === i.key); return e?.type === "weapon" && !/bow/.test(i.key); });
    const bows = ch.items.filter((i) => /bow/.test(i.key));
    const name = (k) => rs.SHOP.find((x) => x.key === k)?.name ?? k;
    const enc = sh.enc;
    return `${tabs}${err}<div class="rs-pad">
      ${canEdit && melee.length ? `<div class="rs-kv"><span>In hand</span><span><select data-rs-ready="weapon">${opts(melee.map((i) => [i.key, name(i.key)]), ch.ready?.weapon)}</select></span>
        ${bows.length ? `<span>Bow</span><span><select data-rs-ready="missile">${opts([["", "none"], ...bows.map((i) => [i.key, name(i.key)])], ch.ready?.missile ?? "")}</select></span>` : ""}</div>` : ""}
      <table class="rs-table"><thead><tr><th>Carried</th><th class="num">Weight</th></tr></thead><tbody>${items || `<tr><td colspan="2" class="note">Nothing.</td></tr>`}</tbody></table>
      <div class="rs-kv"><span>Coins</span><span>${n(ch.coins?.gp)} gp${ch.coins?.sp ? ` \u00b7 ${n(ch.coins.sp)} sp` : ""}${ch.coins?.cp ? ` \u00b7 ${n(ch.coins.cp)} cp` : ""}</span>
      <span>Load</span><span><b>${n(sh.load)}</b> \u00b7 move ${sh.move}\u2033${enc.nextMove && enc.headroom != null ? `<br><span class="note">${n(enc.headroom)} more before ${enc.nextMove}\u2033</span>` : enc.over ? `<br><span class="rs-warn">over the 3,000 most a man can carry</span>` : ""}</span></div>
      <div class="rs-foot">Load counts armour, weapons, a pack and sundries (80) and what he carries; coins weigh 1 each (Men & Magic p.15). Buying more comes with towns.</div></div>`;
  }
  if (tab === "notes") {
    return `${tabs}${err}<div class="rs-pad">
      <div class="rs-kv"><span>Player</span><span>${esc(ch.owner === me ? "you" : people?.[ch.owner]?.name ?? "a player")}</span>
      <span>Hirelings</span><span>${ch.hirelings?.length ? ch.hirelings.map((h) => esc(h.name)).join(", ") : "None yet: hiring comes with towns."} <span class="note">Charisma ${ch.abilities.cha}: up to ${sh.hirelingsMax}.</span></span></div>
      ${canEdit ? `<textarea id="rsNotes" rows="8" maxlength="${rs.NOTES_MAX}" placeholder="Background, what he owes, what he has seen...">${esc(ch.notes ?? "")}</textarea><div class="row"><button type="button" data-rs-notes>Save notes</button>${canEdit ? ` <button type="button" class="linkish" data-rs-rename>Rename</button>` : ""}</div>` : `<div class="rs-notes">${esc(ch.notes || "No notes.")}</div>`}
      ${ref ? `<div class="row rs-danger"><button type="button" data-rs-delete>Delete this character</button> <span class="note">referee only; it can't be undone</span></div>` : ""}</div>`;
  }
  const saves = SAVE_LABEL.map(([k, l]) => `${l} ${sh.saves[k]}`).join(" \u00b7 ");
  const hardy = ch.race === "dwarf" || ch.race === "halfling" ? ` (${RACE_LABEL[ch.race].toLowerCase()}: wands, stone and spells as four levels higher)` : "";
  const caster = sh.spells.length;
  const slots = sh.slots?.[0] ?? 0;
  const spellRow = !caster ? "" : editingSpells
    ? `<span>Spells</span><span><div class="rs-spells">${sh.spells.map(([k, l]) => `<label><input type="checkbox" data-rs-spell="${k}" ${(spellPick ?? ch.remembered ?? []).includes(k) ? "checked" : ""}> ${esc(l)}</label>`).join("")}</div><div class="note">Remembers ${slots} first-level spell${slots === 1 ? "" : "s"}.</div><button type="button" data-rs-spells-save>Remember these</button> <button type="button" class="linkish" data-rs-spells-cancel>Cancel</button></span>`
    : `<span>Spells</span><span>${slots ? (sh.remembered.length ? esc(sh.remembered.join(", ")) : "none remembered") : "none until 2nd level"}${canEdit && slots ? ` <button type="button" class="linkish" data-rs-spells>change</button>` : ""}</span>`;
  return `${tabs}${err}${abilityBoxes(rs, ch, sh)}<div class="rs-pad"><div class="rs-kv">
    <span>Hit points</span><span><b>${ch.hp}</b> of ${ch.maxHp}</span>
    <span>Armour</span><span>${esc(sh.armour?.label ?? "None")} \u00b7 AC ${sh.ac}</span>
    <span>Weapons</span><span>${esc(sh.weapon ?? "none")}${sh.missile ? ` \u00b7 ${esc(sh.missile.toLowerCase())}${sh.arrows ? `, ${sh.arrows} ${/crossbow/i.test(sh.missile) ? "quarrels" : "arrows"}` : ", no ammunition"}` : ""}</span>
    <span>Fights as</span><span>${esc(sh.fc)}</span>
    <span>Saves</span><span class="mono rs-saves">${esc(saves)}${esc(hardy)}</span>
    <span>XP</span><span>${n(ch.xp ?? 0)} of ${n(sh.nextXp)} \u00b7 ${esc(sh.nextTitle)} next${sh.xpBonus ? ` \u00b7 ${signed(sh.xpBonus)}% (prime)` : ""}${sh.levelCap ? ` \u00b7 a ${ch.race} rises no higher than ${sh.levelCap}` : ""}</span>
    <span>Move</span><span>${sh.move}\u2033 (carrying ${n(sh.load)})</span>
    ${spellRow}
    <span>Languages</span><span>${esc(sh.languages.map(langName).join(", "))}</span>
  </div></div>`;
}

/** Chargen for a rolled character the viewer may finish. */
export function chargenHtml(rs, ch, { error = "", busy = false, openCats = new Set(["weapon", "armor"]) }) {
  const sh = rs.sheetFor(ch), ch2 = rs.choicesFor(ch);
  const cats = CATS.map(([cat, label]) => {
    const list = rs.SHOP.filter((e) => (cat === "weapon" ? e.type === "weapon" : e.category === cat));
    if (!list.length) return "";
    return `<details data-rs-cat="${cat}" ${openCats.has(cat) ? "open" : ""}><summary>${label}</summary><div class="rs-shop">${list.map((e) => {
      const why = rs.buyProblem(ch, e.key) ?? "";
      return `<button type="button" data-rs-buy="${e.key}" ${why || busy ? "disabled" : ""} title="${esc(why || `Buy for ${e.cost} gp`)}"><span>${esc(e.name)}</span><span class="num">${e.cost} gp</span></button>`;
    }).join("")}</div></details>`;
  }).join("");
  const cart = ch.items.map((it, i) => { const e = rs.SHOP.find((x) => x.key === it.key); return `<div class="rs-cart"><span>${esc(e?.name ?? it.key)}${it.qty > 1 ? ` \u00d7${it.qty}` : ""}</span><span class="num">${(e?.cost ?? 0) * it.qty} gp</span><button type="button" class="linkish" data-rs-sell="${i}" ${busy ? "disabled" : ""}>return</button></div>`; }).join("");
  const donors = ch2.donors.filter((d) => d.max > 0 || ch.exchange.from === d.from).map((d) => {
    const steps = ch.exchange.from === d.from ? ch.exchange.steps : 0;
    return `<div class="rs-ex">${AB[d.from]} ${d.ratio} for 1 into ${AB[ch2.prime]}${d.xpOnly ? " <span class=\"note\">(for experience only)</span>" : ""}: <button type="button" data-rs-ex="${d.from}" data-step="-1" ${steps <= 0 || busy ? "disabled" : ""}>\u2212</button> <b>+${steps}</b> <button type="button" data-rs-ex="${d.from}" data-step="1" ${steps >= d.max || busy || (ch.exchange.from && ch.exchange.from !== d.from) ? "disabled" : ""}>+</button></div>`;
  }).join("");
  return `${error ? `<div class="rs-err">${esc(error)}</div>` : ""}
    <div class="rs-step"><h4>1 \u00b7 Rolled 3d6 in order</h4>${abilityBoxes(rs, ch, sh, { rolled: true })}<div class="note">${n(ch.gold)} gp to start (3d6 \u00d7 10). The dice are the server's; they stand.</div></div>
    <div class="rs-step"><h4>2 \u00b7 Who he is</h4><div class="rs-form">
      <label>Name <input id="rsName" maxlength="${rs.NAME_MAX}" value="${esc(ch.name)}" placeholder="Brom"></label>
      <label>Race <select data-rs-basic="race">${opts(rs.RACES.map((r) => [r, RACE_LABEL[r]]), ch.race)}</select></label>
      <label>Class <select data-rs-basic="cls">${opts(ch2.classes.map((c) => [c, rs.CLASS_LABEL[c]]), ch.cls)}</select></label>
      <label>Alignment <select data-rs-basic="alignment">${opts(ch2.alignments.map((a) => [a, rs.ALIGN_LABEL[a]]), ch.alignment)}</select></label></div>
      <div class="note">${esc(rs.CLASS_LABEL[ch.cls])}: prime requisite ${AB_NAME[ch2.prime]} ${ch.abilities[ch2.prime]}${sh.xpBonus ? `, ${signed(sh.xpBonus)}% experience` : ""}.</div>
      ${donors ? `<div class="rs-exs"><div class="note">Trade points into the prime requisite (no score below 9):</div>${donors}</div>` : ""}</div>
    <div class="rs-step"><h4>3 \u00b7 Shopping <span class="note">${n(ch.coins.gp)} gp left</span></h4>${cart ? `<div class="rs-carts">${cart}</div>` : `<div class="note">Nothing bought yet.</div>`}${cats}</div>
    <div class="rs-step"><h4>4 \u00b7 Finish</h4><div class="note">The server rolls his hit points (${esc(rs.CLASS_LABEL[ch.cls])} 1st level${ch.abilities.con >= 15 ? ", +1 for Constitution" : ch.abilities.con <= 6 ? ", \u22121 for Constitution" : ""}). After that his class, race and gear are fixed; buying more comes with towns.</div>
      <div class="row"><button type="button" class="primary" data-rs-finish ${busy ? "disabled" : ""}>Roll hit points and finish</button></div></div>`;
}

export const ROSTER_CSS = `
.rs-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; border-top: 1px solid #e5e9ef; }
.rs-create { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.rs-folder > summary { cursor: pointer; font-weight: 700; padding: 4px 0; border-bottom: 1px solid #d5dbe3; }
.rs-own { width: 6px; align-self: stretch; border-radius: 3px; flex: none; }
#rosterPanel .rs-main { flex: 1; min-width: 0; text-align: left; border: 0; background: none !important; color: inherit !important; padding: 2px 0; cursor: pointer; font: inherit; }
#rosterPanel .rs-main:hover b { text-decoration: underline; }
#rosterPanel .rs-dots { border: 0; background: none !important; color: var(--pencil) !important; font-size: 1.1rem; padding: 0 6px; cursor: pointer; }
.rs-menu { margin: 0 0 6px 14px; display: flex; flex-direction: column; gap: 4px; font-size: .82rem; }
.rs-row:first-of-type { border-top: 0; }
.rs-main { flex: 1; min-width: 0; font-size: .9rem; line-height: 1.35; }
.rs-stats { font-size: .78rem; }
.rs-tabs { display: flex; border-bottom: 1px solid #e5e9ef; margin: -10px -12px 8px; }
.rs-tabs button { font: inherit; font-size: .85rem; padding: 6px 12px; border: 0; border-bottom: 2px solid transparent; background: none !important; color: var(--pencil) !important; cursor: pointer; border-radius: 0; }
.rs-tabs button[aria-selected="true"] { border-bottom-color: var(--ink); color: var(--ink) !important; font-weight: 700; }
.rs-abil { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; text-align: center; font-size: .75rem; margin-bottom: 8px; }
.rs-box { border: 1px solid #d5dbe3; border-radius: 6px; padding: 4px 2px; }
.rs-box .k { color: var(--pencil); }
.rs-box b { font-size: 1rem; display: block; }
.rs-box .fx { color: #15803d; font-size: .7rem; line-height: 1.2; }
.rs-box .was { color: var(--pencil); font-size: .68rem; }
.rs-kv { display: grid; grid-template-columns: 96px 1fr; gap: 4px 10px; font-size: .85rem; margin-bottom: 8px; }
.rs-kv > span { min-width: 0; overflow-wrap: anywhere; }
.rs-kv > span:nth-child(odd) { color: var(--pencil); }
.rs-foot { font-size: .75rem; color: var(--pencil); }
#rsBody button { font: inherit; font-size: .82rem; min-height: 28px; padding: 2px 10px; border-radius: 4px; }
#rsBody button.linkish { border: 0; background: none !important; padding: 0 2px; min-height: 0; color: var(--side-a) !important; text-decoration: underline; cursor: pointer; }
#rsBody .rs-ex button { min-height: 22px; min-width: 24px; padding: 0 6px; }
#rsBody .rs-shop button { min-height: 0; }
#rosterPanel .linkish { border: 0; background: none !important; padding: 0 2px; color: var(--side-a) !important; text-decoration: underline; cursor: pointer; font: inherit; font-size: .8rem; }
#sheetTitle { flex: none !important; }
#sheetSub { flex: 1; }
.rs-saves { font-size: .78rem; white-space: normal !important; }
.rs-pad { padding: 0; }
.rs-err { color: var(--red); font-size: .85rem; margin: 0 0 6px; }
.rs-warn { color: var(--red); }
.rs-table { width: 100%; border-collapse: collapse; font-size: .85rem; margin-bottom: 8px; }
.rs-table th { text-align: left; font-weight: 600; color: var(--pencil); border-bottom: 1px solid #e5e9ef; }
.rs-table td { padding: 2px 0; border-bottom: 1px solid #f0f3f6; }
.rs-table .num, .rs-shop .num, .rs-cart .num { text-align: right; font-variant-numeric: tabular-nums; }
.rs-step { border-top: 1px solid #e5e9ef; padding: 8px 0; }
.rs-step:first-of-type { border-top: 0; padding-top: 0; }
.rs-step h4 { margin: 0 0 6px; font-size: .9rem; }
.rs-form { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; font-size: .85rem; }
.rs-form label { display: flex; flex-direction: column; gap: 2px; }
.rs-form input, .rs-form select { font: inherit; padding: 3px 6px; }
.rs-exs { margin-top: 6px; font-size: .85rem; }
.rs-ex button { min-width: 26px; padding: 0 6px; }
.rs-shop { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin: 4px 0 6px; }
.rs-shop button { font: inherit; font-size: .78rem; display: flex; justify-content: space-between; gap: 6px; padding: 3px 8px; border: 1px solid #b7c7d2; border-radius: 4px; cursor: pointer; text-align: left; }
.rs-shop button:disabled { opacity: .45; cursor: default; }
.rs-carts { margin-bottom: 6px; }
.rs-cart { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; font-size: .82rem; align-items: center; }
.rs-step details summary { cursor: pointer; font-size: .85rem; }
.rs-spells { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 8px; font-size: .82rem; }
#rsNotes { width: 100%; font: inherit; font-size: .85rem; padding: 6px; border: 1px solid #9fb2c0; border-radius: 4px; }
.rs-notes { white-space: pre-wrap; font-size: .85rem; }
.rs-danger { margin-top: 14px; padding-top: 8px; border-top: 1px solid #e5e9ef; }
.fw-sub { font-size: 12px; color: #c9d2dd; font-weight: 400; margin-left: 6px; }
`;

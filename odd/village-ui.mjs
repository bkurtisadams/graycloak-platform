// village-ui.mjs — the settlement scene's drawing and markup, with no page state (v1.572.00, 25 Nov 2026).
// combat-grid.html keeps the state, the requests and the event binding; it hands these functions the place, the
// characters and what the viewer may do (env), and gets strings back. Moved out of the page unchanged:
// the village from above, its doors and tokens, the door card, the inn's panel, the market's trade panel and the dock.
//
// env: { rs (the rules package's roster), people (uid -> {name, color}), may(character) (the viewer may move him),
//        busy (a request is out), view (the page's lobby.view), clsAbbr(character), grip (the drag handle's svg) }

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/**
 * The village map (approved mockup 25 Nov 2026): where each building's door is, in the map's own 860 by 680 units
 * (40 to the inch, an inch 10 yards). r is how near a click or a dropped token counts as at the door.
 */
export const VILLAGE_SPOTS = {
  inn: { x: 400, y: 382, r: 26, kind: "the inn", open: true }, market: { x: 590, y: 430, r: 52, kind: "the green", open: true },
  smith: { x: 297, y: 496, r: 22, name: "The smith", kind: "arms and armour" }, stable: { x: 518, y: 276, r: 22, name: "The stable", kind: "horses and mules" },
  shrine: { x: 683, y: 327, r: 22, name: "The shrine", kind: "a place of worship" }, board: { x: 486, y: 360, r: 18, name: "The notice board", kind: "notices and hiring" },
  road: { x: 812, y: 118, r: 40, name: "The road out", kind: "onto the kingdom map", open: true },
};
export const villageSpotName = (k, place) => (k === "inn" ? place.inn ?? "The inn" : k === "market" ? "The market" : VILLAGE_SPOTS[k].name);
/** A spot is on this settlement's map if it is the road, a thing the place has (an inn, a market), or one of the buildings every village is drawn with. */
export const villageSpots = (place) => Object.entries(VILLAGE_SPOTS).filter(([k]) => (k === "inn" || k === "market" ? !!place[k] : true));

/**
 * The village from above (approved mockup 25 Nov 2026): the street from the ford to the road out, the buildings with
 * their doors, the green, and the villagers standing about. One drawing serves every village for now; the inn and the
 * market's stalls are drawn only where the place has them.
 */
export function villageSvg(place = {}) {
  const lab = (x, y, t, anchor = "middle", size = 13, weight = 600) => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}" fill="#1f2b38" stroke="#fbfdfe" stroke-width="4" paint-order="stroke" font-family="Source Serif 4, Georgia, serif">${esc(t)}</text>`;
  const bld = (x, y, w, h, dx, dy, fill = "#c9a36b") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="#5b4a2f" stroke-width="2"/><path d="M${x} ${y}L${x + w} ${y + h}M${x + w} ${y}L${x} ${y + h}" stroke="#5b4a2f" stroke-width="1" opacity=".45"/><rect x="${dx - 6}" y="${dy - 4}" width="12" height="8" fill="#3b2a14"/>`;
  const man = (x, y, ch, who) => `<g><title>${esc(who)}</title><circle cx="${x}" cy="${y}" r="9" fill="#5b6672" stroke="#ffffff" stroke-width="2"/><text x="${x}" y="${y + 3}" text-anchor="middle" font-size="9" font-weight="700" fill="#ffffff" font-family="Courier Prime, monospace">${ch}</text></g>`;
  const cottages = [[150, 330, 48, 36], [96, 420, 44, 34], [590, 110, 46, 36], [700, 150, 44, 34], [320, 180, 46, 34], [770, 400, 48, 36], [660, 500, 46, 34]].map(([x, y, w, h]) => bld(x, y, w, h, x + w / 2, y + h, "#d9c39a")).join("");
  const stalls = place.market ? [[548, 410], [584, 426], [562, 452], [616, 404]].map(([x, y]) => `<rect x="${x}" y="${y}" width="20" height="14" fill="#e6d7a8" stroke="#5b4a2f" stroke-width="1.5"/>`).join("") : "";
  const river = "M-10 560C120 520 180 610 300 590S520 540 640 590 800 650 870 600", street = "M196 700C232 600 276 540 350 472S520 372 620 312 790 172 880 84";
  return `<defs><pattern id="vg" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#b9c998" stroke-width="1"/></pattern></defs><rect width="860" height="680" fill="#cfdcab"/><rect width="860" height="680" fill="url(#vg)"/>
<g fill="#7f9a5c"><circle cx="70" cy="110" r="26"/><circle cx="112" cy="150" r="22"/><circle cx="48" cy="190" r="20"/><circle cx="792" cy="520" r="28"/><circle cx="826" cy="566" r="20"/></g>
<path d="${river}" fill="none" stroke="#7f9fc6" stroke-width="30"/><path d="${river}" fill="none" stroke="#a9c3e0" stroke-width="22"/>
<path d="${street}" fill="none" stroke="#8a6f45" stroke-width="40"/><path d="${street}" fill="none" stroke="#eadfc4" stroke-width="34"/>
<ellipse cx="590" cy="430" rx="78" ry="50" fill="#bcd08f" stroke="#8fa765" stroke-width="2" stroke-dasharray="5 4"/>${stalls}${cottages}
${place.inn ? bld(300, 302, 130, 74, 400, 376) : ""}${bld(216, 470, 74, 52, 290, 496)}${bld(470, 216, 96, 54, 518, 270)}${bld(690, 290, 52, 74, 690, 327)}
<rect x="483" y="350" width="6" height="22" fill="#5b4a2f"/><rect x="471" y="340" width="30" height="20" fill="#f3ead2" stroke="#5b4a2f" stroke-width="1.5"/>
${place.inn ? lab(365, 294, place.inn) : ""}${lab(253, 464, "Smith")}${lab(518, 210, "Stable")}${lab(716, 284, "Shrine")}${lab(590, 496, place.market ? "Market" : "The green")}${lab(486, 332, "Notice board", "middle", 11, 400)}${lab(846, 60, "The road out", "end")}${lab(232, 652, "The ford")}
${place.inn ? man(424, 392, "I", "The innkeeper") : ""}${place.market ? man(566, 418, "T", "A trader") + man(608, 440, "T", "A trader") : ""}${man(306, 514, "S", "The smith")}${man(762, 236, "W", "The watchman")}
<line x1="24" y1="662" x2="64" y2="662" stroke="#1f2b38" stroke-width="2"/><text x="70" y="666" font-family="Courier Prime, monospace" font-size="11" fill="#1f2b38">1\u2033 = 10 yards</text>`;
}

/** The doors on the map: a spot to click at each (or, for the referee looking in, only to read). */
export function villageDoorsHtml(place, on = null, live = false) {
  return villageSpots(place).map(([k, sp]) => `<${live ? 'button type="button"' : "span"} class="vg-door${on === k ? " on" : ""}" ${live ? `data-w-spot="${k}"` : ""} title="${esc(villageSpotName(k, place))}: ${esc(sp.kind)}" aria-label="${esc(villageSpotName(k, place))}" style="left:${sp.x / 8.6}%;top:${sp.y / 6.8}%;width:${(sp.r * 2) / 8.6}%"></${live ? "button" : "span"}>`).join("");
}

export function villageMapHtml(placeName, place, markers, counters, crumb, acting) {
  return `<div class="vgbox"><div class="w-map village"><svg viewBox="0 0 860 680" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(placeName)} from above">${villageSvg(place)}</svg>${markers}${counters}<div class="w-crumb">${crumb} \u00b7 1 inch is 10 yards${acting ? " \u00b7 click to walk \u00b7 a door opens its building" : ""}</div>${acting ? "" : `<button type="button" class="vg-leave" id="wLeaveScene" title="Back to the kingdom map">Leave ${esc(placeName)}</button>`}</div></div>`;
}

/** The tokens in a settlement: each where its player last put it (a fresh arrival stands by the inn). */
export function villageTokensHtml(env, here, c) {
  return here.map((x, i) => {
    const p = env.people?.[x.owner] ?? {}, at = x.spot ?? { x: VILLAGE_SPOTS.inn.x - 26 - i * 26, y: VILLAGE_SPOTS.inn.y + 44 + i * 12 }, can = env.may(x);
    return `<div class="w-me${x.id === c?.id ? " mine" : ""}${can ? " can" : ""}" data-w-tok="${esc(x.id)}" title="${esc(x.name)}${can ? ": click to act for him; drag to stand him somewhere" : ""}" style="left:${at.x / 8.6}%;top:${at.y / 6.8}%;background:${esc(p.color ?? "#2f5c8a")}"><span>${esc((x.name ?? "?").slice(0, 1))}</span><i>${esc(x.name ?? "")}</i></div>`;
  }).join("");
}

/** The card at a door (the mockup's): what the building is for, and the way in. */
export function doorCardHtml(k, place, placeName) {
  const sp = VILLAGE_SPOTS[k], says = { inn: "Rest and rumours. The innkeeper is at his door. Hiring and the strongbox come with a later pass.", market: "Stalls on the green: buy at Book I\u2019s prices, sell for half, and hand things to one another.", road: `Out of ${placeName}, onto the kingdom map.`, smith: "Not open yet: the smith comes with a later pass.", stable: "Not open yet: the stable comes with a later pass.", shrine: "Not open yet: the shrine comes with a later pass.", board: "Not open yet: notices and hiring come with a later pass." }[k];
  return `<h3>${esc(villageSpotName(k, place))} <small>${esc(sp.kind)}</small></h3><div class="note">${esc(says)}</div><div class="row">${k === "road" ? `<button type="button" class="primary" id="vgRoad">Leave by the road</button>` : `<button type="button" class="primary" id="vgGoIn" data-k="${k}" ${sp.open ? "" : "disabled"}>Go in</button>`}</div>`;
}
/**
 * The inn (approved mockup 25 Nov 2026, v1.573.00): one panel over the dimmed village. Rest, the talk of the taverns,
 * the strongbox the innkeeper keeps for him, and his heir. Hiring men-at-arms is drawn with Book III's prices and
 * comes with the next pass. env also gives heal(days) (hit points a rest of that many days regains) and dayOf(character).
 */
export function innPanelHtml(env, c, here, place, placeName) {
  const v = env.view, busy = env.busy ? "disabled" : "", gp = c.coins?.gp ?? 0, mine = here.filter((x) => env.may(x));
  const who = mine.map((x) => `<button type="button" class="tr-who${x.id === c.id ? " on" : ""}" data-tr-who="${esc(x.id)}" ${x.id === c.id ? 'aria-pressed="true"' : ""}>${esc(x.name)}</button>`).join("");
  const nameOf = (key) => env.rs.EQUIPMENT_BY_KEY?.[key]?.name ?? env.rs.SHOP.find((x) => x.key === key)?.name ?? key;
  const need = Math.max(0, (c.maxHp ?? 0) - (c.hp ?? 0)), days = Math.max(1, Math.min(60, Math.trunc(Number(v.restDays)) || (need ? need * 2 : 1))), heals = Math.min(env.heal(days), need);
  const rest = `<div class="inn-box"><h4>Rest</h4><div class="note">Nothing the first day, then one hit point every other day. Resting here also ends a dungeon expedition.</div>
    <div class="inn-row"><label for="innDays">Days</label><input id="innDays" type="number" min="1" max="60" value="${days}"><button type="button" class="primary" id="wRest" ${busy}>Rest</button><span class="note">${esc(c.name)} is at ${c.hp} of ${c.maxHp}.</span></div>
    <div class="note">${days === 1 ? "A day" : `${days} days`}: ${esc(c.name)} heals ${heals || "nothing"}${heals && heals === need ? ", all he has lost," : ""} and his day moves on to ${env.dayOf(c) + days}.</div></div>`;
  const rumours = `<div class="inn-box"><h4>Rumours</h4><div class="note">The rounds of the taverns: 10 to 60 gp and 1 to 10 gp more, for one rumour. One that names a place marks it on the map.</div>
    <div class="inn-row"><button type="button" id="wRumour" ${env.busy || gp < 11 ? "disabled" : ""}>Buy a round</button>${gp < 11 ? `<span class="note">not enough gold for a round</span>` : ""}</div></div>`;
  const hire = `<div class="inn-box"><h4>Hire men-at-arms</h4>${[["Light Foot", 2], ["Heavy Foot", 3], ["Archers", 5], ["Crossbowmen", 4]].map(([n, cost]) => `<div class="tr-row"><span class="tr-n">${n}</span><span class="tr-p">${cost} gp a month</span></div>`).join("")}
    <div class="inn-row"><button type="button" disabled>Post a notice</button><span class="note">Notices cost 100 to 600 gp a week (Book III). Hiring comes with the next pass.</span></div></div>`;
  const box = c.strongbox?.[placeName] ?? { gp: 0, items: [] };
  const inBox = (box.gp ? `<div class="tr-row"><span class="tr-n">${box.gp} gp</span><label for="sbOutGp" class="sr">Gold to take out</label><input id="sbOutGp" type="number" min="1" max="${box.gp}" value="${box.gp}"><button type="button" id="sbOut" ${busy}>Take out</button></div>` : "")
    + (box.items ?? []).map((it, i) => `<div class="tr-row"><span class="tr-n">${esc(nameOf(it.key))}${it.qty > 1 ? ` \u00d7${it.qty}` : ""}</span><button type="button" data-sb-out="${i}" ${busy}>Take out</button></div>`).join("");
  const carried = (gp ? `<div class="tr-row"><span class="tr-n">${gp} gp</span><label for="sbInGp" class="sr">Gold to put in</label><input id="sbInGp" type="number" min="1" max="${gp}" value="${gp}"><button type="button" id="sbIn" ${busy}>Put in</button></div>` : "")
    + (c.items ?? []).map((it, i) => `<div class="tr-row"><span class="tr-n">${esc(nameOf(it.key))}${it.qty > 1 ? ` \u00d7${it.qty}` : ""}</span><button type="button" data-sb-in="${i}" ${busy}>Put in</button></div>`).join("");
  const h = c.heir, heir = v.heirEdit
    ? `<div class="inn-heir"><label for="heirName">Heir\u2019s name</label><input id="heirName" type="text" maxlength="40" value="${esc(h?.name ?? "")}"><label for="heirRel">who he is to ${esc(c.name)}</label><input id="heirRel" type="text" maxlength="40" placeholder="his brother" value="${esc(h?.relation ?? "")}"><button type="button" class="primary" id="heirSave" ${busy}>Save</button><button type="button" id="heirCancel">Cancel</button></div>`
    : `<div class="inn-heir"><div class="inn-heirsays">${h ? `<b>Heir: ${esc(h.name)}, ${esc(h.relation)}.</b> <span class="note">If ${esc(c.name)} dies, ${esc(h.name)} inherits his estate less 10% and starts at first level. What ${esc(c.name)} carried stays with his body.</span>` : `<b>No heir named.</b> <span class="note">A named relative inherits the estate less 10% and starts at first level. With no heir, what is left here is lost.</span>`}</div><button type="button" id="heirEdit" ${busy}>${h ? "Change heir" : "Name an heir"}</button></div>`;
  const strong = `<div class="inn-box"><h4>Strongbox <small>kept by the innkeeper</small></h4><div class="sb-cols"><div class="sb-col"><div class="tr-cap">In the strongbox</div>${inBox || `<div class="note">Nothing.</div>`}</div><div class="sb-col"><div class="tr-cap">${esc(c.name)} carries</div>${carried || `<div class="note">Nothing.</div>`}</div></div>${heir}</div>`;
  return `<div class="tr-veil"></div><section class="tr-panel inn-panel" aria-label="${esc(place.inn ?? "The inn")}">
    <div class="tr-head"><h3>${esc(place.inn ?? "The inn")} <small>the inn \u00b7 ${esc(placeName)}</small></h3><div class="tr-whos">${who}</div><span class="tr-purse">${gp} gp</span><button type="button" class="primary" id="wLeave">Done</button></div>
    <div class="inn-grid">${rest}${rumours}</div><div class="inn-grid">${hire}${strong}</div></section>`;
}
/**
 * The market (approved mockup 25 Nov 2026): one panel over the dimmed village. What the market sells at Book I's prices,
 * what the character carries (the traders give half; anything may be handed to a character standing with him), gold
 * given the same way, and the names across the top to open another of the player's packs.
 */
export function tradePanelHtml(env, c, here, placeName) {
  const v = env.view, busy = env.busy ? "disabled" : "", sh = env.rs.sheetFor(c), gp = c.coins?.gp ?? 0;
  const mine = here.filter((x) => env.may(x)), others = here.filter((x) => x.id !== c.id);
  const to = others.find((x) => x.id === v.giveTo) ?? others[0] ?? null;
  const who = mine.map((x) => `<button type="button" class="tr-who${x.id === c.id ? " on" : ""}" data-tr-who="${esc(x.id)}" ${x.id === c.id ? 'aria-pressed="true"' : ""}>${esc(x.name)}</button>`).join("");
  const sells = env.rs.SHOP.map((e) => { const why = env.rs.buyProblem(c, e.key, { town: true }) ?? ""; return `<div class="tr-row${why ? " no" : ""}" title="${esc(why)}"><span class="tr-n">${esc(e.name)}</span><span class="tr-p">${e.cost} gp</span><button type="button" data-w-buy="${e.key}" ${why || env.busy ? "disabled" : ""}>Buy</button></div>`; }).join("");
  const giveTip = to ? `Hand it to ${to.name}` : "Nobody else is here to take it";
  const has = (c.items ?? []).map((it, i) => { const e = env.rs.EQUIPMENT_BY_KEY?.[it.key] ?? env.rs.SHOP.find((x) => x.key === it.key); if (!e) return ""; return `<div class="tr-row"><span class="tr-n">${esc(e.name)}${it.qty > 1 ? ` \u00d7${it.qty}` : ""}</span><span class="tr-p">sells for ${Math.floor(e.cost / 2)} gp</span><button type="button" data-w-sell="${i}" ${busy}>Sell</button><button type="button" data-tr-give="${i}" title="${esc(giveTip)}" ${to ? busy : "disabled"}>Give</button></div>`; }).join("");
  const give = `<div class="tr-give"><label for="trGp">Give coins</label><input id="trGp" type="number" min="1" max="${gp}" value="${Math.min(10, Math.max(1, gp))}" ${to && gp > 0 ? "" : "disabled"}><span>gp to</span><label for="trTo" class="sr">Give to</label><select id="trTo" ${to ? "" : "disabled"}>${others.map((x) => `<option value="${esc(x.id)}" ${x.id === to?.id ? "selected" : ""}>${esc(x.name)}</option>`).join("") || "<option>nobody here</option>"}</select><button type="button" id="trGive" ${to && gp > 0 ? busy : "disabled"}>Give</button></div>`;
  return `<div class="tr-veil"></div><section class="tr-panel" aria-label="The market">
    <div class="tr-head"><h3>The market <small>${esc(placeName)}</small></h3><div class="tr-whos">${who}</div><span class="tr-purse">${gp} gp \u00b7 load ${sh.load} \u00b7 move ${sh.move}\u2033</span><button type="button" class="primary" id="wLeave">Done</button></div>
    <div class="tr-cols"><div class="tr-col"><div class="tr-cap">The market sells \u00b7 at Book I\u2019s prices</div><div class="tr-list">${sells}</div></div>
      <div class="tr-col"><div class="tr-cap">${esc(c.name)} carries \u00b7 traders give half</div><div class="tr-list">${has || `<div class="note">Nothing.</div>`}</div>${give}</div></div>
    <div class="note">Trading takes no time. Pick whose pack is open with the names above. Magic items are neither bought nor sold.</div></section>`;
}

/** The dock under the village (the mockup's): the company by rank, the hint, and the road out. */
export function villageDockHtml(env, c, g, placeName) {
  const multi = g.length > 1, free = !env.busy && !env.view.at;
  const chip = (m) => {
    const p = env.people?.[m.owner] ?? {}, pct = m.maxHp ? Math.max(0, Math.min(100, Math.round(((m.hp ?? 0) / m.maxHp) * 100))) : 0, tone = pct <= 34 ? "bad" : pct <= 67 ? "hurt" : "";
    return `<div class="ps-ch${m.id === c.id ? " on" : ""}" data-mo="${esc(m.id)}" ${multi && free ? `draggable="true" tabindex="0" aria-label="${esc(m.name)}: drag, or press the left and right arrows, to change his place in the marching order"` : ""} data-ps-open="${esc(m.id)}" title="${esc(m.name)}: open the sheet">${multi && free ? env.grip : ""}<div class="mo-b"><div class="n"><span class="dot" style="background:${esc(p.color ?? "#888")}"></span>${esc(m.name)} <small>${esc(env.clsAbbr(m))} ${m.level ?? 1}</small></div>${m.maxHp ? `<div class="bar"><i class="${tone}" style="width:${pct}%"></i></div>` : ""}<div class="s"><span>${m.maxHp ? `hp ${m.hp}/${m.maxHp}` : ""}</span><span>${m.coins?.gp ?? 0} gp</span></div></div></div>`;
  };
  const names = ["Front rank", "Second rank", "Third rank", "Fourth rank", "Fifth rank"], ranks = []; g.forEach((m, i) => (ranks[Math.floor(i / 3)] ??= []).push(m));
  const chips = multi ? ranks.map((row, r) => `<div class="mo-rank"><div class="mo-h">${names[r] ?? `Rank ${r + 1}`}</div><div class="mo-row">${row.map(chip).join("")}</div></div>`).join("") : g.map(chip).join("");
  const note = multi ? "Click to walk; the party follows its leader. The people of the village stand on the map, and so do other players\u2019 characters." : "Click to walk. He is alone: parties are made in the Actors tab, by dragging one character onto another.";
  return `<div class="ps-strip dv-dock vg-dock">${chips}<span class="dv-note">${note}</span><span class="dv-acts"><button type="button" id="wLeaveScene" title="Out of ${esc(placeName)}, onto the kingdom map" ${env.busy ? "disabled" : ""}>Leave by the road</button></span></div>`;
}

/** The styles of the trade panel, the doors and the dock (the page adds them to its own). */
export const VILLAGE_CSS = `
/* the inn's panel (approved mockup 25 Nov 2026) */
.lobbystage .inn-grid { display: flex; flex-wrap: wrap; gap: 12px; }
.lobbystage .inn-box { flex: 1 1 300px; min-width: 0; border: 1px solid #b7c7d2; border-radius: 6px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }
.lobbystage .inn-box h4 { margin: 0; font-size: 1.02rem; display: flex; align-items: baseline; gap: 8px; }
.lobbystage .inn-box h4 small { font-family: var(--type); font-size: .7rem; font-weight: 400; color: var(--pencil); }
.lobbystage .inn-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: .85rem; }
.lobbystage .inn-panel input { width: 64px; font: inherit; font-size: .9rem; padding: 5px 8px; border: 1px solid #b7c7d2; border-radius: 6px; }
.lobbystage .inn-panel input[type="text"] { width: 130px; }
.lobbystage .inn-panel button:not(.tr-who) { font: inherit; font-size: .82rem; font-weight: 600; min-height: 32px; padding: 3px 12px; border: 1px solid #b7c7d2; border-radius: 6px; cursor: pointer; }
.lobbystage .inn-panel button:disabled { opacity: .45; cursor: default; }
.lobbystage .sb-cols { display: flex; flex-wrap: wrap; gap: 14px; }
.lobbystage .sb-col { flex: 1 1 150px; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.lobbystage .inn-heir { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding-top: 8px; border-top: 1px solid #b7c7d2; font-size: .85rem; }
.lobbystage .inn-heir .inn-heirsays { flex: 1 1 200px; }
/* the market's trade panel (approved mockup 25 Nov 2026) */
.lobbystage .tr-veil { position: absolute; inset: 0; background: rgba(31,43,56,.45); z-index: 3; }
.lobbystage .tr-panel { position: absolute; left: 5%; right: 5%; top: 50px; max-height: calc(100% - 150px); box-sizing: border-box; z-index: 4; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding: 16px 18px; background: var(--card); border: 1px solid var(--ink); border-radius: 8px; box-shadow: 0 6px 24px rgba(0,0,0,.4); }
.lobbystage .tr-head { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.lobbystage .tr-head h3 { margin: 0; font-size: 1.1rem; display: flex; align-items: baseline; gap: 8px; }
.lobbystage .tr-head h3 small { font-family: var(--type); font-size: .7rem; font-weight: 400; color: var(--pencil); }
.lobbystage .tr-whos { display: flex; flex-wrap: wrap; gap: 6px; flex: 1 1 auto; }
.lobbystage .tr-who { font: inherit; font-size: .82rem; padding: 4px 12px; min-height: 30px; border: 1px solid #b7c7d2; border-radius: 999px; cursor: pointer; }
.lobbystage .tr-who.on { background: var(--ink) !important; color: var(--card) !important; border-color: var(--ink); font-weight: 700; }
.lobbystage .tr-purse { font-family: var(--type); font-size: .82rem; white-space: nowrap; }
.lobbystage .tr-cols { display: flex; flex-wrap: wrap; gap: 20px; }
.lobbystage .tr-col { flex: 1 1 280px; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.lobbystage .tr-cap { font-family: var(--type); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--pencil); }
.lobbystage .tr-list { overflow-y: auto; max-height: min(46vh, 380px); }
.lobbystage .tr-row { display: flex; align-items: center; gap: 10px; padding: 5px 0; border-bottom: 1px solid #e3eaef; }
.lobbystage .tr-row:last-child { border-bottom: 0; }
.lobbystage .tr-row .tr-n { flex: 1 1 auto; font-size: .9rem; min-width: 0; }
.lobbystage .tr-row .tr-p { font-family: var(--type); font-size: .75rem; color: var(--pencil); white-space: nowrap; }
.lobbystage .tr-row.no .tr-n { color: var(--pencil); }
.lobbystage .tr-row button, .lobbystage .tr-give button, .lobbystage .tr-head button.primary { font: inherit; font-size: .82rem; font-weight: 600; min-height: 32px; padding: 3px 12px; border: 1px solid #b7c7d2; border-radius: 6px; cursor: pointer; }
.lobbystage .tr-row button:disabled, .lobbystage .tr-give button:disabled { opacity: .45; cursor: default; }
.lobbystage .tr-give { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding-top: 8px; border-top: 1px solid #b7c7d2; font-size: .85rem; }
.lobbystage .tr-give input { width: 64px; font: inherit; font-size: .9rem; padding: 5px 8px; border: 1px solid #b7c7d2; border-radius: 6px; }
.lobbystage .tr-give select { font: inherit; font-size: .9rem; padding: 5px 8px; border: 1px solid #b7c7d2; border-radius: 6px; }
.lobbystage .tr-panel .sr { position: absolute; left: -9999px; }
.lobbystage .vgscene:has(.vg-dock) .vgbox { bottom: 112px; }
.lobbystage .vg-dock { background: var(--card); }
.lobbystage .vg-dock .ps-ch[draggable] { flex-direction: row; align-items: center; gap: 8px; cursor: grab; }
/* a door on the village map: a spot to click, ringed when the company stands at it */
.lobbystage .vg-door { position: absolute; transform: translate(-50%, -50%); aspect-ratio: 1; padding: 0; border: 2px dashed transparent; border-radius: 50%; background: transparent !important; z-index: 2; cursor: pointer; }
.lobbystage button.vg-door:hover, .lobbystage button.vg-door:focus-visible { border-color: #b3362b; background: rgba(245,215,138,.35) !important; outline: none; }
.lobbystage .vg-door.on { border-color: #b3362b; border-style: solid; background: rgba(245,215,138,.45) !important; }
.lobbystage .hexscene .w-card.vg-doorcard { width: min(290px, calc(100% - 24px)); }
.lobbystage .w-map.village { cursor: pointer; }
.lobbystage .w-me[data-w-tok] i { display: none; } .lobbystage .w-me[data-w-tok]:hover i, .lobbystage .w-me[data-w-tok].mine i { display: block; }
`;

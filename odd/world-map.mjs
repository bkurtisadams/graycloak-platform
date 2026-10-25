// world-map.mjs — the hex map's drawing, with no page state (pass 14, 25 Oct 2026). combat-grid.html feeds it the
// hexes and the viewer and gets SVG strings back; the kingdom's sheet comes from the rules package's westmark module.
import { wilderness as wl, westmark as wm } from "../packages/odd-chainmail-rules/index.js";

export const HEX_SZ = 42;
/** Terrain fills: the flat colours Kurt chose (Oct 2026); unknown is the dark slate of the page's ink. */
export const TERRAIN_FILL = { clear: "#cfe0a8", woods: "#4f7a3a", mountains: "#a98c66", swamp: "#9fb3a0", river: "#9fbad4", desert: "#e3d3a3", city: "#c9b9a0", sea: "#5b7f9e", unknown: "#2a333d" };
export const fillOf = (h) => TERRAIN_FILL[h.t === "river" ? "clear" : h.t] ?? TERRAIN_FILL.clear;
/** The old four-digit hex number (column, row from Langstead at 5050). */
export const hexNo = (k) => { const { q, r } = wl.parse(k); return `${String(50 + q).padStart(2, "0")}${String(50 + r + Math.floor(q / 2)).padStart(2, "0")}`; };

export const HEX_SYMBOLS = `<g id="symVillage"><rect x="-7" y="-3" width="6" height="6" fill="#1f2b38"/><rect x="1" y="-5" width="6" height="8" fill="#1f2b38"/><path d="M-8 -3 L-4 -8 L0 -3 M0 -5 L4 -10 L8 -5" fill="none" stroke="#1f2b38" stroke-width="1.5"/></g>
<g id="symTown"><rect x="-9" y="-2" width="18" height="8" fill="#1f2b38"/><rect x="-6" y="-8" width="4" height="6" fill="#1f2b38"/><rect x="2" y="-8" width="4" height="6" fill="#1f2b38"/><path d="M-10 -2 L10 -2" stroke="#fbfdfe" stroke-width="1"/></g>
<g id="symCity"><rect x="-10" y="-3" width="20" height="9" fill="#1f2b38"/><rect x="-7" y="-10" width="4" height="7" fill="#1f2b38"/><rect x="-1" y="-12" width="3" height="9" fill="#1f2b38"/><rect x="3" y="-10" width="4" height="7" fill="#1f2b38"/><path d="M-11 -3 L11 -3" stroke="#fbfdfe" stroke-width="1"/></g>
<g id="symAbbey"><rect x="-6" y="-2" width="12" height="7" fill="#1f2b38"/><rect x="-1.5" y="-11" width="3" height="9" fill="#1f2b38"/><path d="M-4 -8 L4 -8" stroke="#1f2b38" stroke-width="2"/></g>
<g id="symRuin"><path d="M-8 6 L-8 -2 L-5 -2 L-5 1 L-2 1 L-2 -6 L2 -6 L2 -1 L5 -1 L5 -4 L8 -4 L8 6Z" fill="#4a3418"/></g>
<g id="symFord"><path d="M-5 5 L0 -5 M1 5 L6 -5" stroke="#4e7391" stroke-width="1.6" opacity=".8"/></g>`;
export const symbolFor = (kind) => ({ ruin: "#symRuin", town: "#symTown", city: "#symCity", abbey: "#symAbbey", castle: "#symTown" }[kind] ?? "#symVillage");

/** Chains of adjacent hexes that share a flag (track, river) as smooth SVG paths through their centres. */
export function coursePaths(hexes, flagOf, SZ = HEX_SZ) {
  const keys = Object.keys(hexes).filter((k) => flagOf(hexes[k])), set = new Set(keys), chains = [];
  const adj = (k) => { const h = wl.parse(k); return wl.DIR_NAMES.map((d) => { const n = wl.neighbour(h, d); return wl.key(n.q, n.r); }).filter((x) => set.has(x)); };
  const edgeDone = new Set(), edge = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  for (const start of keys.slice().sort((a, b) => adj(a).length - adj(b).length)) {
    for (const first of adj(start)) {
      if (edgeDone.has(edge(start, first))) continue;
      const chain = [start, first]; edgeDone.add(edge(start, first));
      for (;;) { const last = chain.at(-1), prev = chain.at(-2); const next = adj(last).find((x) => x !== prev && !edgeDone.has(edge(last, x))); if (!next) break; edgeDone.add(edge(last, next)); chain.push(next); if (chain.length > 200) break; }
      chains.push(chain);
    }
  }
  const lone = keys.filter((k) => adj(k).length === 0);
  const toD = (chain) => { const pts = chain.map((k) => wl.toPixel(wl.parse(k), SZ)); if (pts.length === 2) return `M${pts[0].x} ${pts[0].y} L${pts[1].x} ${pts[1].y}`;
    let d = `M${pts[0].x} ${pts[0].y}`; for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)]; const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }, c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }; d += ` C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p2.x} ${p2.y}`; } return d; };
  return { paths: chains.map(toD), lone };
}

/** The pixel box round a set of hex keys. */
export function extentOf(keys, SZ = HEX_SZ) {
  const pts = keys.map((k) => wl.toPixel(wl.parse(k), SZ));
  return { minX: Math.min(...pts.map((p) => p.x)) - SZ - 10, maxX: Math.max(...pts.map((p) => p.x)) + SZ + 10, minY: Math.min(...pts.map((p) => p.y)) - SZ - 10, maxY: Math.max(...pts.map((p) => p.y)) + SZ + 10 };
}
export const polyOf = (k, SZ = HEX_SZ) => { const { x, y } = wl.toPixel(wl.parse(k), SZ); return wl.hexCorners(x, y, SZ).map((p) => p.join(",")).join(" "); };

/** The whole kingdom's sheet, every hex the viewer doesn't know drawn dark: a player sees the size of the world and nothing in it. */
export function unknownSheetSvg(known, SZ = HEX_SZ) {
  return wm.sheetKeys().filter((k) => !known[k]).map((k) => `<polygon points="${polyOf(k, SZ)}" fill="${TERRAIN_FILL.unknown}" stroke="#3a4552" stroke-width="1" data-w-hex="${k}" class="unk"/>`).join("");
}
/** The realms' names across the referee's map. */
export function realmLabelsSvg(SZ = HEX_SZ) {
  return Object.values(wm.REALMS).map((r) => { const { x, y } = wl.toPixel(r.label, SZ); return `<text x="${x}" y="${y}" font-size="30" text-anchor="middle" font-family="Source Serif 4, Georgia, serif" font-weight="700" fill="#1f2b38" opacity=".35" letter-spacing="4" pointer-events="none">${r.name.toUpperCase()}</text>`; }).join("");
}
/** The key under the map. */
export function legendHtml({ full }) {
  const sw = (bg, extra = "") => `<i style="background:${bg};${extra}"></i>`;
  return `<div class="w-key"><span>${sw(TERRAIN_FILL.clear)} clear</span><span>${sw(TERRAIN_FILL.woods)} woods</span><span>${sw(TERRAIN_FILL.mountains)} hills, mountains</span><span>${sw(TERRAIN_FILL.swamp)} swamp</span><span>${sw(TERRAIN_FILL.sea)} sea</span><span><span style="color:#4e7391">\u2501</span> river</span><span><span style="color:#8a6a3c">\u254c</span> track</span>${full ? "" : `<span>${sw(TERRAIN_FILL.unknown)} unknown</span>`}<span>${sw("transparent", "border-style:dashed")} rumoured</span><span>${sw("transparent", "border-color:#c8941a;border-width:2px")} selected</span></div>`;
}
/** Flood fill: the hexes of one terrain reachable from a start, up to a cap. */
export function floodKeys(hexes, start, cap = 400) {
  const t = hexes[start]?.t; if (t == null) return [];
  const out = [start], seen = new Set(out);
  for (let i = 0; i < out.length && out.length < cap; i++) {
    const h = wl.parse(out[i]);
    for (const d of wl.DIR_NAMES) { const n = wl.neighbour(h, d), k = wl.key(n.q, n.r); if (!seen.has(k) && hexes[k]?.t === t) { seen.add(k); out.push(k); } }
  }
  return out;
}

// dungeon-map.mjs — a dungeon level's drawing and key, with no page state (pass 16, Nov 2026; the approved mockup).
// combat-grid.html feeds it the level (cells: # rock, . passage, r room, + door, s secret, o one-way) and gets strings back.

export const CELL = 11;
export const DG = { rock: "#3f6f96", floor: "#fbfdfe", grid: "#c9d6df", ink: "#1f2b38", red: "#b3362b", gold: "#b8860b", door: "#7a4a1e", secret: "#6b3fa0", oneway: "#c26a12", sel: "#e0a400" };
const OPEN = new Set([".", "r", "+", "s", "o"]);
const DOOR = { "+": "door", s: "secret", o: "oneway" };
const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export const roomNo = (id) => String(id).replace(/^R/, "");

/** The box round everything that isn't rock, a square of rock round it. */
export function extentOf(L) {
  let x0 = L.width, y0 = L.height, x1 = 0, y1 = 0;
  L.cells.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] !== "#") { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } });
  if (x1 < x0) return { x: 0, y: 0, w: L.width * CELL, h: L.height * CELL };
  return { x: (x0 - 1) * CELL, y: (y0 - 1) * CELL, w: (x1 - x0 + 3) * CELL, h: (y1 - y0 + 3) * CELL };
}

/** A door's bar runs across the way through it: open squares east and west mean a passage running east-west, so the bar stands upright. */
function doorBar(L, x, y) {
  const open = (xx, yy) => OPEN.has(L.cells[yy]?.[xx]);
  const ew = open(x - 1, y) || open(x + 1, y), ns = open(x, y - 1) || open(x, y + 1);
  return ew && !ns ? "v" : "h";
}

/** The level as SVG: rock, floor squares, doors, stairs, traps, room numbers (red with a monster), gold dots for treasure, the selected room outlined. */
export function levelSvg(L, { sel = null, id = "dgSvg" } = {}) {
  const S = CELL, out = [];
  out.push(`<rect x="0" y="0" width="${L.width * S}" height="${L.height * S}" fill="${DG.rock}"/>`);
  L.cells.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]; if (ch === "#") continue;
      out.push(`<rect x="${x * S}" y="${y * S}" width="${S}" height="${S}" fill="${DG.floor}" stroke="${DG.grid}" stroke-width="0.6"/>`);
      const kind = DOOR[ch]; if (!kind) continue;
      const col = DG[kind], v = doorBar(L, x, y) === "v";
      out.push(v ? `<rect x="${x * S + S / 2 - 1.5}" y="${y * S + 1.5}" width="3" height="${S - 3}" fill="${col}"/>` : `<rect x="${x * S + 1.5}" y="${y * S + S / 2 - 1.5}" width="${S - 3}" height="3" fill="${col}"/>`);
      if (kind === "secret") out.push(`<text x="${x * S + S / 2}" y="${y * S + S - 1}" font-size="7" text-anchor="middle" fill="${DG.secret}" font-family="Courier Prime, monospace">S</text>`);
    }
  });
  for (const st of L.stairs ?? []) {
    const px = st.x * S, py = st.y * S;
    out.push(`<g><title>Stairs ${st.dir === "up" ? "up to the ruin" : "down a level"}</title>${[0, 1, 2, 3].map((i) => `<line x1="${px + 2}" y1="${py + 2 + i * 2.4}" x2="${px + S - 2}" y2="${py + 2 + i * 2.4}" stroke="${DG.ink}" stroke-width="1"/>`).join("")}</g>`);
  }
  for (const t of L.traps ?? []) {
    const px = t.x * S, py = t.y * S;
    out.push(`<g><title>${escape(`Trap (Table VII, ${t.roll}): ${t.text}`)}</title><path d="M${px + 2.5} ${py + 2.5}L${px + S - 2.5} ${py + S - 2.5}M${px + S - 2.5} ${py + 2.5}L${px + 2.5} ${py + S - 2.5}" stroke="${DG.red}" stroke-width="1.6"/></g>`);
  }
  for (const r of L.rooms ?? []) {
    const s = L.stock?.[r.id] ?? {}, cx = (r.x + r.w / 2) * S, cy = (r.y + r.h / 2) * S;
    out.push(`<text x="${cx}" y="${cy + 3}" font-size="${r.w * r.h > 1 ? 9 : 7.5}" font-weight="700" text-anchor="middle" fill="${s.monster ? DG.red : DG.ink}" font-family="Source Serif 4, Georgia, serif" pointer-events="none">${roomNo(r.id)}</text>`);
    if (s.treasure) out.push(`<circle cx="${cx + (r.w > 1 ? 8 : 4)}" cy="${cy - 4}" r="2.2" fill="${DG.gold}" pointer-events="none"/>`);
  }
  if (sel) { const r = (L.rooms ?? []).find((x) => x.id === sel); if (r) out.push(`<rect x="${r.x * S - 1.5}" y="${r.y * S - 1.5}" width="${r.w * S + 3}" height="${r.h * S + 3}" fill="none" stroke="${DG.sel}" stroke-width="3" pointer-events="none"/>`); }
  const vb = extentOf(L);
  return `<svg id="${id}" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escape(L.name ?? "Dungeon level")} map">${out.join("")}<g id="${id}Ghost"></g></svg>`;
}

/** The key in the corner of the stage. */
export function legendHtml() {
  const bar = (c) => `<i style="display:inline-block;width:12px;height:3px;background:${c};vertical-align:middle;margin-right:4px"></i>`;
  return `<div class="dg-legend"><span>${bar(DG.door)}door</span><span>${bar(DG.secret)}secret door</span><span>${bar(DG.oneway)}one-way door</span><span><b style="color:${DG.red};margin-right:4px">\u2715</b>trap</span><span><b style="color:${DG.red};margin-right:4px">7</b>monster</span><span><i style="display:inline-block;width:6px;height:6px;border-radius:3px;background:${DG.gold};vertical-align:middle;margin-right:4px"></i>treasure</span><span>\u2630 stairs</span><span></span></div>`;
}

/** What's in a treasure, in a few words. */
export function treasureText(t) {
  if (!t) return "";
  const parts = [];
  if (t.sp) parts.push(`${t.sp} sp`);
  if (t.gp) parts.push(`${t.gp} gp`);
  if (t.gems?.length) parts.push(`${t.gems.length} gem${t.gems.length === 1 ? "" : "s"}`);
  if (t.jewelry?.length) parts.push(`${t.jewelry.length} jewellery`);
  for (const m of t.magic ?? []) parts.push(m.name ?? "a magic item");
  return parts.join(", ");
}
export const sizeText = (r) => `${r.kind} ${r.w * 10}\u2032\u00d7${r.h * 10}\u2032`;
const within = (r, p) => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;

/** The Level key's counts line. */
export function countsText(L) {
  const st = Object.values(L.stock ?? {});
  return `${L.rooms.length} rooms \u00b7 ${st.filter((s) => s.monster).length} monsters \u00b7 ${st.filter((s) => s.treasure).length} treasures \u00b7 ${(L.traps ?? []).length} traps`;
}
/** The Level key: a row per room with its size and what's in it. */
export function keyRowsHtml(L, sel = null) {
  return L.rooms.map((r) => {
    const s = L.stock?.[r.id] ?? {}, bits = [];
    if (r.start || (L.stairs ?? []).some((st) => st.dir === "up" && within(r, st))) bits.push("stairs up to the ruin");
    if ((L.stairs ?? []).some((st) => st.dir === "down" && within(r, st))) bits.push("stairs down");
    if (s.monster) bits.push(`<b class="dg-mon">${escape(s.monster.name)}</b>`);
    if (s.treasure) bits.push(`<span class="dg-tre">${escape(treasureText(s.treasure))}</span>`);
    if (L.notes?.[r.id]) bits.push(`<i class="dg-note" title="${escape(L.notes[r.id])}">note</i>`);
    if (!bits.length) bits.push(`<span class="dg-empty">empty</span>`);
    return `<button type="button" class="dg-krow${r.id === sel ? " on" : ""}" data-dg-room="${escape(r.id)}"><b${s.monster ? ' class="dg-mon"' : ""}>${roomNo(r.id)}</b><span><span class="dg-size">${sizeText(r)}</span> \u00b7 ${bits.join(" \u00b7 ")}</span></button>`;
  }).join("");
}

/** The square under a pointer, from the SVG's own viewBox. */
export function cellAt(svg, ev) {
  const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
  const sx = vb.width / r.width, sy = vb.height / r.height, s = Math.max(sx, sy);
  const ox = (r.width * s - vb.width) / 2, oy = (r.height * s - vb.height) / 2; // preserveAspectRatio: xMidYMid meet
  const x = vb.x + (ev.clientX - r.left) * s - ox, y = vb.y + (ev.clientY - r.top) * s - oy;
  return { x: Math.floor(x / CELL), y: Math.floor(y / CELL), px: x, py: y };
}

// odd/functions/dungeon-service.mjs — pass 16 (Nov 2026): the dungeon levels under the ruins, the referee's side.
//
// oddCampaigns/{cid}/dungeons/{lid}  one level: the sheet of 10' squares (cells, one string per row: # rock, . passage,
//   r room, + door, s secret door, o one-way door), rooms, stairs, traps, Book III stocking, the referee's notes, the
//   options it was laid out with, status draft | open, and the last few states for Undo.
// Ops through oddWorld, only the referee (the players' side comes with exploring):
//   dungeon        {lid}                         the level, or none yet
//   dungeonMake    {lid, opts}                   lay it out (DMG Appendix A, simplified) and stock it; again while a draft
//   dungeonPaint   {lid, tool, cells|rect}       floor, rock, door, secret, oneway, stairs, trap on squares; room on a rectangle
//   dungeonRoom    {lid, room, act, ...}         rerollMonster, rerollTreasure, pick {table, row, key?}, empty, note {text}
//   dungeonRestock {lid}                         Book III p.7 over every room again (notes kept); a draft only
//   dungeonUndo    {lid}                         back one edit
//   dungeonOpen    {lid}                         the players may go down
// Rulings (Kurt, Nov 2026): Fosscraig Level 1 is generated, then edited; 36 rooms; the approved scene mockup.

export const DUNGEONS = Object.freeze({ "fosscraig-1": { place: "Fosscraig", level: 1, name: "Fosscraig \u00b7 Level 1" } });
export const dungeonPath = (cid, lid) => `oddCampaigns/${cid}/dungeons/${lid}`;
const UNDO = 10;
const TOOLS = { floor: null, rock: "#", door: "+", secret: "s", oneway: "o", stairs: null, trap: null };
const int = (v) => (Number.isInteger(Number(v)) ? Number(v) : NaN);

export function createDungeonOps({ rules, now, rollDie }) {
  const G = rules.dungeonGen, U = rules.underworld;
  const rng = () => (rollDie(1000000) - 1) / 1000000;
  const refuse = (code, error) => ({ ok: false, code, error });
  const clean = (o) => JSON.parse(JSON.stringify(o));

  function options(o = {}) {
    const pickInt = (v, lo, hi, dflt) => { const n = int(v ?? dflt); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt; };
    const tens = (v, dflt) => pickInt(Math.round(Number(v ?? dflt) / 10) * 10, 10, 90, dflt);
    return {
      seed: pickInt(o.seed, 0, 2 ** 31 - 1, rollDie(2 ** 30)), rooms: pickInt(o.rooms, 4, 80, 36),
      width: pickInt(o.width, 30, 120, 80), height: pickInt(o.height, 30, 90, 60),
      straightRun: tens(o.straightRun, 30), afterRun: tens(o.afterRun, 20),
      deadEnds: pickInt(o.deadEnds, 0, 10, 3), stairsDown: pickInt(o.stairsDown, 1, 4, 2), stock: o.stock !== false
    };
  }
  function make(lid, opts) {
    const info = DUNGEONS[lid];
    const L = G.generateLevel({ ...opts, dungeonLevel: info.level, stock: true });
    const stock = {};
    for (const r of L.rooms) stock[r.id] = opts.stock ? L.stock[r.id] : { monster: null, treasure: null };
    return {
      id: lid, name: info.name, place: info.place, level: info.level, status: "draft", opts,
      seed: L.seed, width: L.width, height: L.height, cells: L.cells,
      rooms: L.rooms.map(({ id, kind, x, y, w, h, area, start }) => ({ id, kind, x, y, w, h, area, ...(start ? { start: true } : {}) })),
      stairs: L.stairs.map(({ x, y, dir }) => ({ x, y, dir })), traps: L.traps.map(({ x, y, roll, text }) => ({ x, y, roll, text })),
      stock, notes: {}, nextRoom: L.rooms.length + 1, undo: [], createdAt: now(), updatedAt: now()
    };
  }
  const snapshot = (L) => clean({ cells: L.cells, rooms: L.rooms, stairs: L.stairs, traps: L.traps, stock: L.stock, notes: L.notes, nextRoom: L.nextRoom });
  const remember = (L) => { L.undo = [...(L.undo ?? []), snapshot(L)].slice(-UNDO); };
  const roomOf = (L, x, y) => L.rooms.find((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) ?? null;
  const inside = (L, x, y) => Number.isInteger(x) && Number.isInteger(y) && x >= 1 && y >= 1 && x < L.width - 1 && y < L.height - 1;
  const view = (L) => { const { undo, ...rest } = L; return { ...rest, undoable: (undo ?? []).length }; };

  function paint(L, data) {
    const tool = String(data.tool ?? "");
    if (tool === "room") {
      const r = data.rect ?? {}, x = int(r.x), y = int(r.y), w = int(r.w), h = int(r.h);
      if (![x, y, w, h].every(Number.isInteger) || w < 1 || h < 1 || w > 20 || h > 20 || !inside(L, x, y) || !inside(L, x + w - 1, y + h - 1)) return "a room is 1 to 20 squares each way, inside the sheet";
      if (L.rooms.some((o) => x < o.x + o.w && o.x < x + w && y < o.y + o.h && o.y < y + h)) return "that overlaps a room";
      remember(L);
      const id = `R${L.nextRoom++}`, rows = L.cells.map((s) => s.split(""));
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) rows[yy][xx] = "r";
      L.cells = rows.map((a) => a.join(""));
      L.rooms.push({ id, kind: "room", x, y, w, h, area: w * h * 100 });
      L.stock[id] = { monster: null, treasure: null };
      return null;
    }
    if (!(tool in TOOLS)) return "no such tool";
    const list = (Array.isArray(data.cells) ? data.cells : []).slice(0, 2000).map((c) => ({ x: int(c?.x), y: int(c?.y) }));
    if (!list.length || list.some((c) => !inside(L, c.x, c.y))) return "squares inside the sheet, please";
    remember(L);
    const rows = L.cells.map((s) => s.split("")), at = (c) => (p) => p.x === c.x && p.y === c.y;
    for (const c of list) {
      const cur = rows[c.y][c.x];
      if (tool === "stairs" || tool === "trap") {
        if (cur === "#") continue;
        const listOf = tool === "stairs" ? L.stairs : L.traps, i = listOf.findIndex(at(c));
        if (i >= 0) { if (tool === "trap" || listOf[i].dir === "down") listOf.splice(i, 1); }
        else if (tool === "stairs") L.stairs.push({ x: c.x, y: c.y, dir: "down" });
        else { const roll = rollDie(20); L.traps.push({ x: c.x, y: c.y, roll, text: G.TRAPS[roll - 1] }); }
        continue;
      }
      rows[c.y][c.x] = tool === "floor" ? (roomOf(L, c.x, c.y) ? "r" : ".") : TOOLS[tool];
      if (tool === "rock") { L.stairs = L.stairs.filter((s) => !at(c)(s) || s.dir === "up"); L.traps = L.traps.filter((t) => !at(c)(t)); }
    }
    L.cells = rows.map((a) => a.join(""));
    // a room painted entirely over is gone, its contents and note with it
    const live = L.rooms.filter((r) => { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (L.cells[y][x] === "r") return true; return false; });
    for (const r of L.rooms) if (!live.includes(r)) { delete L.stock[r.id]; delete L.notes[r.id]; }
    L.rooms = live;
    return null;
  }

  function room(L, data) {
    const r = L.rooms.find((x) => x.id === data.room); if (!r) return "no such room";
    const s = L.stock[r.id] ?? { monster: null, treasure: null };
    const act = String(data.act ?? "");
    if (act === "note") { L.notes[r.id] = String(data.text ?? "").slice(0, 400); if (!L.notes[r.id]) delete L.notes[r.id]; return null; }
    remember(L);
    if (act === "rerollMonster") s.monster = U.rollDungeonMonster(L.level, rng);
    else if (act === "rerollTreasure") s.treasure = U.dungeonTreasure(L.level, rng);
    else if (act === "empty") { s.monster = null; s.treasure = null; }
    else if (act === "pick") {
      const t = U.MONSTER_LEVEL_TABLES[int(data.table)], row = t?.rows[int(data.row)];
      if (!row) { L.undo.pop(); return "no such monster"; }
      const m = { table: int(data.table), ...row };
      if (row.options) { if (!row.options.includes(data.key)) { L.undo.pop(); return "pick one of its kinds"; } m.key = data.key; }
      if (row.heads) m.heads = row.heads[0] + rollDie(row.heads[1] - row.heads[0] + 1) - 1;
      s.monster = m;
    } else { L.undo.pop(); return "no such change"; }
    L.stock[r.id] = s;
    return null;
  }

  /** One dungeon op inside the world transaction; every read comes before a write. */
  async function handle(tx, { op, data, cid, ref }) {
    if (!ref) return refuse("forbidden", "only the referee works on the dungeon levels for now");
    const lid = String(data.lid ?? ""); if (!DUNGEONS[lid]) return refuse("bad-request", "no such level");
    const path = dungeonPath(cid, lid);
    const L = await tx.get(path);
    const put = () => { L.updatedAt = now(); tx.set(path, clean(L)); return { ok: true, level: view(L) }; };
    if (op === "dungeon") return { ok: true, level: L ? view(L) : null, info: DUNGEONS[lid] };
    if (op === "dungeonMake") {
      if (L?.status === "open") return refuse("bad-request", "the players can go down already; edit it instead of laying it out again");
      const fresh = make(lid, options(data.opts));
      tx.set(path, clean(fresh));
      return { ok: true, level: view(fresh) };
    }
    if (!L) return refuse("not-found", "that level isn't laid out yet");
    if (op === "dungeonPaint") { const why = paint(L, data); return why ? refuse("bad-request", why) : put(); }
    if (op === "dungeonRoom") { const why = room(L, data); return why ? refuse("bad-request", why) : put(); }
    if (op === "dungeonRestock") {
      if (L.status === "open") return refuse("bad-request", "the level is open to the players");
      remember(L);
      L.stock = U.stockLevel(L.rooms.map((r) => r.id), L.level, rng);
      return put();
    }
    if (op === "dungeonUndo") {
      const last = (L.undo ?? []).pop(); if (!last) return refuse("bad-request", "nothing to undo");
      Object.assign(L, last);
      return put();
    }
    if (op === "dungeonOpen") { L.status = "open"; L.openedAt = now(); return put(); }
    return refuse("bad-request", "no such dungeon op");
  }

  /** The levels for the Scenes list: id, status and rooms, without the sheets. */
  async function summary(tx, cid) {
    const out = {};
    for (const lid of Object.keys(DUNGEONS)) { const L = await tx.get(dungeonPath(cid, lid)); out[lid] = { ...DUNGEONS[lid], status: L ? L.status : null, rooms: L ? L.rooms.length : 0 }; }
    return out;
  }
  return { handle, summary, options };
}

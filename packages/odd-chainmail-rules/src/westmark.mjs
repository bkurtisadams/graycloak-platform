/**
 * OD&D — Chainmail engine · the Westmark: the kingdom laid out as a hex sheet (Kurt, 25 Oct 2026)
 *
 * A Saxon-sized kingdom (Wessex, about 400 land hexes at 5 miles a hex) on a sheet of 28 columns by
 * 22 rows, flat-topped axial hexes with Langstead at (0,0). The Grey Water lies along the south-west;
 * the Foss runs from the Fells past Langstead's ford to the sea at Fossmouth. The Westmark was the
 * west march of Ambrey and threw off its king within living memory: Ambrey fills the east edge,
 * Hartwold the hills beyond the Fells to the north, Sælond the south-east coast, and the Wild the
 * north-west, where no king rules. The neighbours are a band of land and a town or two each.
 *
 * Everything here is deterministic: the same seed lays out the same kingdom, so the server seeds a
 * campaign from it and the referee's hand painting goes on top. Terrain is coarse by design — the
 * referee's brush finishes it.
 */
import { key, parse, toPixel, neighbour, DIR_NAMES, distance, hexCost } from "./wilderness.mjs";

/** The sheet, in pixel units of a size-1 hex: 28 columns (x span 42) by 22 rows (y span 38). */
export const SHEET = Object.freeze({ x0: -18, x1: 24, y0: -19, y1: 19 });

export const REALMS = Object.freeze({
  westmark: { name: "the Westmark", people: "the Westmarkers", label: { q: -2, r: 3 } },
  ambrey: { name: "Ambrey", people: "the Ambrings", label: { q: 14, r: -7 } },
  hartwold: { name: "Hartwold", people: "the Hartwolders", label: { q: 2, r: -10 } },
  saelond: { name: "Sælond", people: "the Sælings", label: { q: 9, r: 3 } },
  wild: { name: "the Wild", people: null, label: { q: -11, r: 1 } },
});

/** Places by name: axial hex, kind, realm, inn and market where there is one. Langstead, Fosscraig and Kingwold as before. */
export const PLACES = Object.freeze({
  Langstead: { q: 0, r: 0, kind: "village", realm: "westmark", inn: "The Ox and Ford", market: true, desc: "A long single street climbing from the ford to the road north-east; a village of a few hundred souls." },
  Fosscraig: { q: 2, r: -2, kind: "ruin", realm: "westmark", desc: "A ditched fort on a crag, long empty; the dungeons lie beneath it." },
  Kingwold: { q: -2, r: 0, kind: "village", realm: "westmark", inn: "The Woodman's Rest", market: false, shrine: true, desc: "A woodcutters' village at the edge of the king's own wood." },
  Aldburgh: { q: -5, r: 5, kind: "city", realm: "westmark", inn: "The Crown", market: true, desc: "The king's town in the bend of the Foss: a walled burgh, the king's hall on its mound, and the mint." },
  Fossmouth: { q: -4, r: 7, kind: "town", realm: "westmark", inn: "The Anchor", market: true, desc: "The kingdom's one harbour, where the Foss meets the Grey Water; Sæling ships and sometimes worse." },
  Brantham: { q: 0, r: -4, kind: "town", realm: "westmark", inn: "The Pass Gate", market: true, desc: "A walled town at the foot of the Fells, holding the pass road to Hartwold." },
  Hollin: { q: -8, r: 3, kind: "town", realm: "westmark", inn: "The Holly Bush", market: true, desc: "The westernmost town, a baron's seat facing the Wild." },
  Eastcote: { q: 7, r: -1, kind: "village", realm: "westmark", inn: "The Plough", market: false, desc: "A village on the Ambrey road, with the old border stone in its green." },
  Haywick: { q: 3, r: 5, kind: "village", realm: "westmark", inn: "The Hay Wain", market: false, desc: "Meadow and dairy country on the Sælond road." },
  "Stanmere Abbey": { q: 4, r: 2, kind: "abbey", realm: "westmark", desc: "A Lawful house by a stone-ringed mere; the Patriarch here once crowned the Ambrey kings." },
  "The Barrows": { q: 5, r: -6, kind: "ruin", realm: "westmark", desc: "A line of grave mounds on the fells' edge; the shepherds keep clear after dark." },
  Hartlow: { q: 0, r: -8, kind: "town", realm: "hartwold", inn: "The Stag", market: true, desc: "Hartwold's border town beyond the pass, in the deer forest." },
  Mercham: { q: 13, r: -4, kind: "town", realm: "ambrey", inn: "The King's Head", market: true, desc: "Ambrey's march town, where the old border was and the Ambrey king says it still is." },
  Ambrey: { q: 15, r: -3, kind: "city", realm: "ambrey", inn: "The Golden Lion", market: true, desc: "The old capital, three days east of the border stone." },
  Seaford: { q: 8, r: 4, kind: "town", realm: "saelond", inn: "The Mermaid", market: true, desc: "Sælond's nearest port, richer than Fossmouth and quick to say so." },
  Dunholm: { q: -9, r: 2, kind: "ruin", realm: "wild", desc: "A hill-fort in the Wild, held by nobody for a hundred years, or by something." },
});

/** The Foss, from the Fells to the sea, as a chain of river hexes; the five hexes south of Langstead are the original key. */
export const FOSS = Object.freeze([
  [5, -5], [4, -4], [4, -3], [3, -2], [2, -1], [1, 0], [0, 1], [-1, 1], [-2, 1], [-3, 2], [-3, 3], [-4, 4], [-4, 5], [-5, 6], [-5, 7],
].map(([q, r]) => key(q, r)));
/** The Ambre, Ambrey's river, running south to the Sæling coast. */
export const AMBRE = Object.freeze([[11, -6], [11, -5], [11, -4], [10, -3], [10, -2], [10, -1], [9, 0], [9, 1], [9, 2], [8, 3]].map(([q, r]) => key(q, r)));

/* ---------- deterministic noise ---------- */
function hash2(q, r, seed) {
  let h = (q * 374761393 + r * 668265263 + seed * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
/** Value noise 0..1: the hex's own hash averaged with its ring, twice, so patches are a few hexes wide. */
function smoothNoise(h, seed, passes = 2) {
  let v = (a) => hash2(a.q, a.r, seed);
  for (let p = 0; p < passes; p++) { const prev = v; v = (a) => (prev(a) * 2 + DIR_NAMES.reduce((s, d) => s + prev(neighbour(a, d)), 0)) / 8; }
  return v(h);
}

/** The coast: sea below this y at a given x (pixel units). South-west for the Westmark, then the long Sæling shore. */
export function coastY(x, seed = 1) {
  const base = x < 4 ? 3 + 0.55 * (x + 18) : 15.1 + 0.15 * (x - 4);
  return base + Math.sin(x * 0.9 + seed) * 0.9 + Math.sin(x * 2.3 + seed * 1.7) * 0.5;
}
function isSea(px, seed) { return px.y > coastY(px.x, seed); }

/** Which realm a land hex lies in, by where it is on the sheet. */
export function realmAt(h) {
  const { x, y } = toPixel(h, 1);
  if (x > 18) return "ambrey";
  if (x < -13 && y < 4) return "wild";
  if (y < -13) return "hartwold";
  if (y > 11 && x > 4) return "saelond";
  return "westmark";
}

/** The Fells: a band of mountains across the north, and the crag's hills coming down to Fosscraig. */
function inFells(h, seed) {
  const { x, y } = toPixel(h, 1);
  const centre = -9 + 0.12 * x, half = 2 + smoothNoise(h, seed + 7) * 1.5;
  if (x < 10 && Math.abs(y - centre) < half) return true;
  if (h.q >= 2 && h.r <= -1 && distance(h, { q: 2, r: -2 }) <= 2) return true; // the crag's hills (the old key: q>=2, r<=-1)
  return false;
}

/** Every hex on the sheet, as keys. */
export function sheetKeys() {
  const out = [];
  for (let q = -14; q <= 18; q++) for (let r = -24; r <= 24; r++) {
    const px = toPixel({ q, r }, 1);
    if (px.x >= SHEET.x0 && px.x <= SHEET.x1 && px.y >= SHEET.y0 && px.y <= SHEET.y1) out.push(key(q, r));
  }
  return out;
}

/** A* over hex costs from one hex to another, land only; returns the keys between (exclusive of both ends). */
function route(hexes, from, to) {
  const fk = key(from.q, from.r), tk = key(to.q, to.r);
  const open = new Map([[fk, 0]]), came = new Map(), g = new Map([[fk, 0]]);
  const costOf = (k) => { const h = hexes[k]; if (!h || h.t === "sea") return Infinity; return h.track ? 1 : h.t === "river" ? (h.ford ? 1 : 4) : hexCost(h); };
  while (open.size) {
    let cur = null, best = Infinity; for (const [k, f] of open) if (f < best) { best = f; cur = k; }
    if (cur === tk) break;
    open.delete(cur);
    const h = parse(cur);
    for (const d of DIR_NAMES) {
      const n = neighbour(h, d), nk = key(n.q, n.r), c = costOf(nk); if (!Number.isFinite(c)) continue;
      const ng = g.get(cur) + c;
      if (ng < (g.get(nk) ?? Infinity)) { g.set(nk, ng); came.set(nk, cur); open.set(nk, ng + distance(n, to)); }
    }
  }
  if (!came.has(tk)) return [];
  const path = []; for (let k = came.get(tk); k && k !== fk; k = came.get(k)) path.push(k);
  return path.reverse();
}

/** The track network: pairs of places joined by the cheapest land route; a ford where a track crosses a river hex. */
const TRACKS = Object.freeze([
  ["Langstead", "Kingwold"], ["Langstead", "Fosscraig"], ["Langstead", "Aldburgh"], ["Aldburgh", "Fossmouth"], ["Aldburgh", "Hollin"],
  ["Langstead", "Brantham"], ["Brantham", "Hartlow"], ["Langstead", "Stanmere Abbey"], ["Stanmere Abbey", "Eastcote"], ["Eastcote", "Mercham"],
  ["Mercham", "Ambrey"], ["Stanmere Abbey", "Haywick"], ["Haywick", "Seaford"],
]);

/**
 * Lay out the kingdom. Returns { hexes, places, realms, sheet }: hexes keyed "q,r" with t, and track, ford,
 * place, kind and realm where they apply; sea hexes are t "sea". Pass hand-painted overrides to keep them.
 */
export function generateWestmark({ seed = 1, overrides = {} } = {}) {
  const hexes = {};
  for (const k of sheetKeys()) {
    const h = parse(k), px = toPixel(h, 1);
    if (isSea(px, seed)) { hexes[k] = { t: "sea" }; continue; }
    const realm = realmAt(h), n = smoothNoise(h, seed), near = coastY(px.x, seed) - px.y;
    let t = "clear";
    if (inFells(h, seed)) t = "mountains";
    else if (realm === "hartwold" && n > 0.52) t = "mountains";
    else if (realm === "wild" && px.y > -3 && n > 0.42) t = "swamp";               // the fens of the Wild
    else if (near < 2.2 && n > 0.5) t = "swamp";                                      // salt marsh along the shore
    else if (px.x >= -10 && px.x <= -2 && Math.abs(px.y) < 3.5 && n > 0.3) t = "woods"; // the king's wood west of Kingwold
    else if (realm === "hartwold" && n > 0.35) t = "woods";                          // the deer forest
    else if (realm === "wild" && n > 0.5) t = "woods";
    else if (n > 0.58) t = "woods";
    hexes[k] = { t, realm };
  }
  // the old key's named hexes hold: Fosscraig's crag, Kingwold's wood, the ford at Langstead
  const fixed = { "0,0": { t: "clear", ford: true }, "1,-1": { t: "clear" }, "2,-2": { t: "mountains" }, "-1,0": { t: "clear" }, "-2,0": { t: "woods" }, "-3,0": { t: "woods" }, "3,-3": { t: "mountains" } };
  for (const [k, h] of Object.entries(fixed)) if (hexes[k]) hexes[k] = { ...hexes[k], ...h };
  // rivers
  for (const k of [...FOSS, ...AMBRE]) if (hexes[k] && hexes[k].t !== "sea") hexes[k] = { ...hexes[k], t: "river" };
  if (hexes["0,0"]) hexes["0,0"].ford = true;
  // places
  const places = {};
  for (const [name, p] of Object.entries(PLACES)) {
    const k = key(p.q, p.r); if (!hexes[k]) continue;
    if (hexes[k].t === "sea" || hexes[k].t === "river") hexes[k].t = "clear";
    hexes[k] = { ...hexes[k], place: name, kind: p.kind, realm: p.realm };
    places[name] = { ...p };
  }
  // tracks, each the cheapest land route; crossing a river hex makes a ford
  for (const [a, b] of TRACKS) {
    const A = PLACES[a], B = PLACES[b]; if (!A || !B) continue;
    const ks = [key(A.q, A.r), ...route(hexes, A, B), key(B.q, B.r)];
    for (const k of ks) { if (!hexes[k]) continue; hexes[k].track = true; if (hexes[k].t === "river") hexes[k].ford = true; }
  }
  // overrides: the referee's painting outlives a relayout
  for (const [k, h] of Object.entries(overrides)) if (hexes[k]) hexes[k] = { ...hexes[k], ...h };
  return { hexes, places, realms: REALMS, sheet: SHEET };
}

function runSelfTests() {
  let pass = 0;
  const ok = (c, l) => { if (!c) throw new Error(`FAIL: ${l}`); pass++; };
  const w = generateWestmark({ seed: 1 }), n = Object.keys(w.hexes).length;
  ok(n > 550 && n < 700, `a 28x22 sheet (${n} hexes)`);
  const land = Object.values(w.hexes).filter((h) => h.t !== "sea"), sea = n - land.length;
  ok(sea > 60 && sea < 200, `a south-west sea (${sea} sea hexes)`);
  ok(w.hexes["0,0"].place === "Langstead" && w.hexes["0,0"].ford && w.hexes["2,-2"].place === "Fosscraig" && w.hexes["2,-2"].t === "mountains" && w.hexes["-2,0"].place === "Kingwold" && w.hexes["-2,0"].t === "woods", "the three old places as they were");
  ok(w.hexes["3,-3"].t === "mountains" && w.hexes["-3,0"].t === "woods", "the old key's lie of the land near Langstead holds");
  ok(["0,1", "-1,1", "1,0", "-2,1", "2,-1"].every((k) => w.hexes[k].t === "river"), "the five river hexes south of Langstead");
  ok(w.hexes["-5,7"].t === "river" && w.hexes["-4,7"].place === "Fossmouth" && w.hexes["-4,7"].t !== "sea", "the Foss reaches the sea beside Fossmouth");
  const sameRealm = Object.values(w.hexes).filter((h) => h.t !== "sea" && h.t !== "river").map((h) => h.realm);
  ok(sameRealm.includes("westmark") && sameRealm.includes("ambrey") && sameRealm.includes("hartwold") && sameRealm.includes("saelond") && sameRealm.includes("wild"), "five realms on the sheet");
  const westmark = Object.values(w.hexes).filter((h) => h.realm === "westmark" && h.t !== "sea").length;
  ok(westmark > 280 && westmark < 500, `the Westmark is a kingdom's worth (${westmark} hexes)`);
  for (const [name, p] of Object.entries(PLACES)) ok(w.hexes[key(p.q, p.r)]?.place === name && w.places[name], `${name} is on the map`);
  const tracked = Object.values(w.hexes).filter((h) => h.track).length;
  ok(tracked > 40, `tracks join the places (${tracked} track hexes)`);
  ok(w.hexes["0,0"].track && w.hexes["-2,0"].track && w.hexes["2,-2"].track, "the old tracks from Langstead");
  const fords = Object.values(w.hexes).filter((h) => h.t === "river" && h.ford).length;
  ok(fords >= 2, `tracks ford the rivers (${fords})`);
  ok(Object.values(w.hexes).every((h) => h.t !== "river" || !h.place), "no place on a river hex");
  const again = generateWestmark({ seed: 1 });
  ok(JSON.stringify(again.hexes) === JSON.stringify(w.hexes), "deterministic for a seed");
  const kept = generateWestmark({ seed: 1, overrides: { "5,5": { t: "desert" } } });
  ok(kept.hexes["5,5"].t === "desert", "the referee's painting survives a relayout");
  ok(realmAt({ q: 0, r: 0 }) === "westmark" && realmAt({ q: 15, r: -3 }) === "ambrey" && realmAt({ q: 0, r: -8 }) === "hartwold" && realmAt({ q: 8, r: 4 }) === "saelond" && realmAt({ q: -9, r: 2 }) === "wild", "realms by position");
  ok(sheetKeys().length === n, "sheetKeys covers the sheet");
  console.log(`westmark.mjs — all self-tests passed (${pass} assertions).`);
}

if (typeof process !== "undefined" && process.argv?.[1]) {
  const norm = (p) => decodeURIComponent(p).replace(/\\/g, "/").replace(/^\/(?=[A-Za-z]:)/, "").toLowerCase();
  if (norm(new URL(import.meta.url).pathname) === norm(process.argv[1])) runSelfTests();
}

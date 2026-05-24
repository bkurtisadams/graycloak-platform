// gw-subhex-data.js v0.2.0 — 2026-05-24
// Gamma World 3-mile subhex data layer. LocalStorage-backed port of
// gcc-subhex-data.js: keeps the flat-top odd-q axial/ownership engine,
// the seeded procedural-terrain generator, and the per-cell override +
// feature store. Drops regions, lakes, cloud sync, IndexedDB, and
// landmark pinning — none are needed for the GW hex crawl.
//
// Coordinate plane is shared with gw-map.html v0.4.0: parents are
// flat-top odd-q at HEX_R=20, anchored on (ANCHOR_COL, ANCHOR_ROW).
// Subhex axial (Q,R) integers; SUB_R = HEX_R/10 = 2 (10:1, 3-mile).
// The mile rung (1-mile, 3:1 from subhex) ships as coordinate helpers;
// its override store can layer on later.
//
// Depends on window.GCCRng (gcc-rng.js). Parent terrain is resolved via
// an injectable resolver (setParentTerrainResolver), defaulting to the
// parent map's getTerrain / GW_TERRAIN_DATA so the layer works standalone.

(function(){
  'use strict';

  const WORLD_SEED = 'gamma-terra-v1';
  const ANCHOR_COL = 51;            // matches gw-map.html floor(COLS/2)
  const ANCHOR_ROW = 27;            // matches gw-map.html floor(ROWS/2)
  const HEX_R = 20;
  const SUB_R = 2;                  // = HEX_R / 10, exact
  const MILE_R = SUB_R / 3;
  const SQRT3 = Math.sqrt(3);
  const SCHEMA_VERSION = 1;
  const PARENT_BIAS = 0.75;         // legacy/reference inherit rate
  const NOISE_FREQ  = 0.16;         // variation-patch frequency (lower = bigger patches)
  const VARY_THRESH = 0.66;         // cells with terrain-noise above this vary from parent
  const LS_KEY = 'gw-subhex-overrides';
  const LS_PARENT_KEY = 'gw-terrain-overrides';   // gw-map.html's parent overrides

  // GW terrain set (mirrors gw-map.html TERRAIN_COLOR keys).
  const TERRAIN = {
    water:            { label: 'Water',          fill: '#72a3c8' },
    plains:           { label: 'Plains',         fill: '#e6b04e' },
    desert:           { label: 'Desert',         fill: '#eaca44' },
    forest:           { label: 'Forest',         fill: '#76b057' },
    'heavy-forest':   { label: 'Heavy forest',   fill: '#28644f' },
    mountains:        { label: 'Mountains',      fill: '#6e5046' },
    'snow-mountains': { label: 'Snow mountains', fill: '#dcd7d7' },
    deathlands:       { label: 'Deathlands',     fill: '#d291a0' },
    ruins:            { label: 'Ruins',          fill: '#a8576b' },
    hills:            { label: 'Hills',          fill: '#c9b96a' },
    'forest-hills':   { label: 'Forested hills', fill: '#4e6e3f' },
    unknown:          { label: 'Unknown',        fill: '#3c3c3c' },
  };

  // Variation table — the (1 - PARENT_BIAS) fraction of cells that do NOT
  // inherit the parent's terrain roll on these weighted *neighbor* terrains.
  // Parent terrain is intentionally excluded so PARENT_BIAS is the exact
  // inherit rate; raise PARENT_BIAS for clumpier maps. Keyed on GW parent
  // terrain.
  const VARIATION = {
    water:            { plains: 1 },                                   // shoreline
    plains:           { hills: 2, forest: 1, desert: 1 },
    desert:           { plains: 2, hills: 1, deathlands: 1 },
    forest:           { 'heavy-forest': 3, 'forest-hills': 2, plains: 1 },  // rare clearing
    'heavy-forest':   { forest: 3, 'forest-hills': 1 },
    mountains:        { 'forest-hills': 3, 'snow-mountains': 1, hills: 1 },  // wooded slopes / foothills
    'snow-mountains': { mountains: 3 },
    deathlands:       { desert: 2, ruins: 1 },
    ruins:            { deathlands: 2, hills: 1 },
    unknown:          { unknown: 1 },
  };

  // Feature kinds (per-cell icons placed in phase 5). Settlements incl.
  // destroyed ones, plus a few GW-flavored picks. Adding a kind is a
  // one-liner here + a glyph in the icon layer.
  const FEATURE_KINDS = [
    'city', 'town', 'village', 'ruin',
    'vault', 'lair', 'camp', 'shrine', 'landmark',
  ];
  const FEATURE_KINDS_SET = new Set(FEATURE_KINDS);

  // ── Geometry (flat-top odd-q; mirrors gw-map.html + map-engine) ──────────

  function parentSvgCenter(col, row){
    return {
      x: HEX_R + col * 1.5 * HEX_R,
      y: HEX_R*SQRT3/2 + row*SQRT3*HEX_R + ((col & 1) ? HEX_R*SQRT3/2 : 0),
    };
  }
  function parentCenterAxial(col, row){
    const dCol = col - ANCHOR_COL;
    return {
      Q: dCol * 10,
      R: 10*(row - ANCHOR_ROW) - 5*dCol + 5*(col & 1) - 5*(ANCHOR_COL & 1),
    };
  }
  const ANCHOR_SVG = parentSvgCenter(ANCHOR_COL, ANCHOR_ROW);

  function subhexSvgCenter(Q, R){
    return {
      x: ANCHOR_SVG.x + 1.5 * SUB_R * Q,
      y: ANCHOR_SVG.y + SQRT3 * SUB_R * (R + Q/2),
    };
  }
  function axialRound(qf, rf){
    let x = qf, z = rf, y = -x - z;
    let rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
    const xd = Math.abs(rx - x), yd = Math.abs(ry - y), zd = Math.abs(rz - z);
    if (xd > yd && xd > zd)      rx = -ry - rz;
    else if (yd > zd)             ry = -rx - rz;
    else                          rz = -rx - ry;
    return { Q: rx, R: rz };
  }
  function svgToAxial(x, y){
    const dx = x - ANCHOR_SVG.x;
    const dy = y - ANCHOR_SVG.y;
    const qf = (2/3) * dx / SUB_R;
    const rf = (-dx/3 + SQRT3*dy/3) / SUB_R;
    return axialRound(qf, rf);
  }

  // Mile rung (1-mile, 3:1 from subhex). Coordinate helpers only.
  function mileSvgCenter(Q, R){
    return {
      x: ANCHOR_SVG.x + 1.5 * MILE_R * Q,
      y: ANCHOR_SVG.y + SQRT3 * MILE_R * (R + Q/2),
    };
  }
  function svgToMileAxial(x, y){
    const dx = x - ANCHOR_SVG.x;
    const dy = y - ANCHOR_SVG.y;
    const qf = (2/3) * dx / MILE_R;
    const rf = (-dx/3 + SQRT3*dy/3) / MILE_R;
    return axialRound(qf, rf);
  }
  function _cellsInBbox(bbox, radius){
    const out = [];
    if (!bbox) return out;
    const { minX, maxX, minY, maxY } = bbox;
    if (!(minX < maxX) || !(minY < maxY)) return out;
    const qStep = 1.5 * radius, rStep = SQRT3 * radius;
    const qLo = Math.floor((minX - ANCHOR_SVG.x) / qStep);
    const qHi = Math.ceil ((maxX - ANCHOR_SVG.x) / qStep);
    for (let Q = qLo; Q <= qHi; Q++){
      const phase = Q / 2;
      const rLo = Math.floor((minY - ANCHOR_SVG.y) / rStep - phase);
      const rHi = Math.ceil ((maxY - ANCHOR_SVG.y) / rStep - phase);
      for (let R = rLo; R <= rHi; R++){
        const cx = ANCHOR_SVG.x + qStep * Q;
        const cy = ANCHOR_SVG.y + rStep * (R + phase);
        if (cx >= minX && cx <= maxX && cy >= minY && cy <= maxY) out.push({ Q, R });
      }
    }
    return out;
  }
  function cellsInAxialBbox(bbox){ return _cellsInBbox(bbox, SUB_R); }
  function mileCellsInAxialBbox(bbox){ return _cellsInBbox(bbox, MILE_R); }

  const _ownerCache = new Map();
  function ownerOf(Q, R){
    const key = `${Q}_${R}`;
    const cached = _ownerCache.get(key);
    if (cached) return cached;
    const sx = ANCHOR_SVG.x + 1.5 * SUB_R * Q;
    const sy = ANCHOR_SVG.y + SQRT3 * SUB_R * (R + Q/2);
    const colEst = ANCHOR_COL + Math.round(Q / 10);
    const rowEst = ANCHOR_ROW + Math.round((R + Q/2) / 10);
    let best = null, bestD = Infinity;
    for (let dc = -2; dc <= 2; dc++){
      for (let dr = -2; dr <= 2; dr++){
        const col = colEst + dc, row = rowEst + dr;
        if (col < 0 || row < 0) continue;
        const c = parentSvgCenter(col, row);
        const d = (sx - c.x)*(sx - c.x) + (sy - c.y)*(sy - c.y);
        if (d < bestD - 1e-9){ best = { col, row }; bestD = d; }
        else if (Math.abs(d - bestD) < 1e-9){
          if (best === null || col < best.col || (col === best.col && row < best.row)){
            best = { col, row }; bestD = d;
          }
        }
      }
    }
    if (best) _ownerCache.set(key, best);
    return best;
  }
  function ownedByParent(col, row){
    const center = parentCenterAxial(col, row);
    const out = [];
    for (let dQ = -11; dQ <= 11; dQ++){
      for (let dR = -11; dR <= 11; dR++){
        const Q = center.Q + dQ, R = center.R + dR;
        const o = ownerOf(Q, R);
        if (o && o.col === col && o.row === row) out.push({ Q, R });
      }
    }
    return out;
  }

  function _polysOverlap(a, b){
    for (const poly of [a, b]){
      for (let i = 0; i < poly.length; i++){
        const [x1, y1] = poly[i];
        const [x2, y2] = poly[(i + 1) % poly.length];
        const nx = y2 - y1, ny = -(x2 - x1);
        let aMin = Infinity, aMax = -Infinity, bMin = Infinity, bMax = -Infinity;
        for (const [x, y] of a){ const p = x*nx + y*ny; if (p < aMin) aMin = p; if (p > aMax) aMax = p; }
        for (const [x, y] of b){ const p = x*nx + y*ny; if (p < bMin) bMin = p; if (p > bMax) bMax = p; }
        if (aMax < bMin - 1e-9 || bMax < aMin - 1e-9) return false;
      }
    }
    return true;
  }
  function _flatTopCorners(cx, cy, R){
    const out = new Array(6);
    for (let i = 0; i < 6; i++){
      const a = (Math.PI / 180) * (60 * i);
      out[i] = [cx + R * Math.cos(a), cy + R * Math.sin(a)];
    }
    return out;
  }
  function fragmentsForParent(col, row){
    const center = parentCenterAxial(col, row);
    const pc = parentSvgCenter(col, row);
    const parentPoly = _flatTopCorners(pc.x, pc.y, HEX_R);
    const out = [];
    for (let dQ = -11; dQ <= 11; dQ++){
      for (let dR = -11; dR <= 11; dR++){
        const Q = center.Q + dQ, R = center.R + dR;
        const o = ownerOf(Q, R);
        if (!o || (o.col === col && o.row === row)) continue;
        const sc = subhexSvgCenter(Q, R);
        if (_polysOverlap(parentPoly, _flatTopCorners(sc.x, sc.y, SUB_R))){
          out.push({ Q, R, ownerCol: o.col, ownerRow: o.row });
        }
      }
    }
    return out;
  }

  const NEIGHBOR_DELTAS = [
    [+1, 0], [0, +1], [-1, +1], [-1, 0], [0, -1], [+1, -1],
  ];
  function neighborsOf(Q, R){ return NEIGHBOR_DELTAS.map(([dQ, dR]) => ({ Q: Q + dQ, R: R + dR })); }

  // ── Ids ──────────────────────────────────────────────────────────────────
  function subhexId(Q, R){ return `subhex_${Q}_${R}`; }
  function parseSubhexId(id){
    const m = /^subhex_(-?\d+)_(-?\d+)$/.exec(id);
    return m ? { Q: +m[1], R: +m[2] } : null;
  }
  function axialKey(Q, R){ return `${Q}_${R}`; }

  // ── Storage (localStorage only) ───────────────────────────────────────────
  let OVERRIDES = {};
  try { const raw = localStorage.getItem(LS_KEY); if (raw) OVERRIDES = JSON.parse(raw) || {}; }
  catch(e){ OVERRIDES = {}; }

  function save(){
    try { localStorage.setItem(LS_KEY, JSON.stringify(OVERRIDES)); }
    catch(e){ try { console.warn('[gw-subhex] save failed:', e && e.name); } catch(_){} }
  }
  function _emit(reason){
    try { window.dispatchEvent(new CustomEvent('gw-subhex-changed', { detail: { reason } })); } catch(_){}
  }

  // ── Parent terrain resolution ──────────────────────────────────────────────
  // Used to bias procedural subhex terrain. The renderer normally passes
  // parentTerrain into getSubhex directly; getSubhexAt() resolves it here.
  let _parentResolver = null;
  function setParentTerrainResolver(fn){ _parentResolver = (typeof fn === 'function') ? fn : null; }

  let _AUTO = null;
  function _autoMap(){
    if (_AUTO) return _AUTO;
    _AUTO = new Map();
    const data = (typeof window !== 'undefined' && window.GW_TERRAIN_DATA) || [];
    for (const d of data) _AUTO.set(d.col + ',' + d.row, d.terrain);
    return _AUTO;
  }
  function _parentOverrides(){
    try { return JSON.parse(localStorage.getItem(LS_PARENT_KEY) || '{}') || {}; }
    catch(_){ return {}; }
  }
  function parentTerrainOf(col, row){
    if (_parentResolver) return _parentResolver(col, row) || 'unknown';
    if (typeof window !== 'undefined' && typeof window.getTerrain === 'function'){
      return window.getTerrain(col, row) || 'unknown';
    }
    const k = col + ',' + row;
    return _parentOverrides()[k] || _autoMap().get(k) || 'unknown';
  }

  // ── Procedural + reads ──────────────────────────────────────────────────────
  // Smooth value-noise over the axial lattice so terrain variation forms
  // coherent patches (valleys, foothills, clearings) instead of single-cell
  // speckle. Deterministic from WORLD_SEED.
  function _hash01(gx, gy){ return window.GCCRng.cyrb53(WORLD_SEED + '|tn|' + gx + '|' + gy, 0) / 4294967296; }
  function valueNoise(Q, R, F){
    const x = Q * F, y = R * F;
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = x - x0, fy = y - y0;
    const sx = fx*fx*(3 - 2*fx), sy = fy*fy*(3 - 2*fy);
    const v00 = _hash01(x0, y0), v10 = _hash01(x0+1, y0);
    const v01 = _hash01(x0, y0+1), v11 = _hash01(x0+1, y0+1);
    const a = v00 + (v10 - v00)*sx, b = v01 + (v11 - v01)*sx;
    return a + (b - a)*sy;
  }
  function proceduralTerrain(parentTerrain, Q, R){
    if (!parentTerrain) return null;
    const table = VARIATION[parentTerrain] || { [parentTerrain]: 1 };
    if (valueNoise(Q, R, NOISE_FREQ) < VARY_THRESH) return parentTerrain;  // coherent parent area
    // inside a variation patch: type stays stable across the local lattice cell
    const gx = Math.round(Q * NOISE_FREQ), gy = Math.round(R * NOISE_FREQ);
    const rng = window.GCCRng.mulberry32(window.GCCRng.seedFor(WORLD_SEED, 'tvar', gx, gy));
    return window.GCCRng.pickWeighted(rng, table);
  }

  function getSubhex(Q, R, parentTerrain){
    const id = subhexId(Q, R);
    const ov = OVERRIDES[id];
    if (ov){
      return {
        id, Q, R,
        terrain: ov.terrain || proceduralTerrain(parentTerrain, Q, R),
        name:    ov.name || '',
        notes:   ov.notes || '',
        feature: ov.feature || null,
        source:  'authored',
        schemaVersion: ov.schemaVersion || SCHEMA_VERSION,
      };
    }
    return {
      id, Q, R,
      terrain: proceduralTerrain(parentTerrain, Q, R),
      name: '', notes: '', feature: null,
      source: 'seed',
      schemaVersion: SCHEMA_VERSION,
    };
  }
  // Convenience: resolves owner + parent terrain internally.
  function getSubhexAt(Q, R){
    const o = ownerOf(Q, R);
    const pt = o ? parentTerrainOf(o.col, o.row) : null;
    return getSubhex(Q, R, pt);
  }

  function normalizeFeature(f){
    if (!f) return null;
    if (typeof f === 'string') f = { kind: f };
    if (!f.kind || !FEATURE_KINDS_SET.has(f.kind)) return null;
    const out = { kind: f.kind };
    if (f.name && String(f.name).trim()) out.name = String(f.name).trim();
    if (f.libraryId && String(f.libraryId).trim()) out.libraryId = String(f.libraryId).trim();
    if (f.notes && String(f.notes).trim()) out.notes = String(f.notes).trim();
    return out;
  }
  function getCellFeature(Q, R){
    const ov = OVERRIDES[subhexId(Q, R)];
    return (ov && ov.feature) || null;
  }

  function setSubhexOverride(Q, R, fields, opts){
    const id = subhexId(Q, R);
    const cur = OVERRIDES[id] || {};
    const next = { ...cur };
    if ('terrain' in fields) next.terrain = fields.terrain || null;
    if ('name'    in fields) next.name    = fields.name || '';
    if ('notes'   in fields) next.notes   = fields.notes || '';
    if ('feature' in fields) next.feature = normalizeFeature(fields.feature);
    if ('source'  in fields) next.source  = fields.source || 'authored';
    else if (!next.source)   next.source  = 'authored';
    next.schemaVersion = SCHEMA_VERSION;
    next.authoredAt = Date.now();

    const empty = !next.terrain && !next.name && !next.notes && !next.feature;
    if (empty) delete OVERRIDES[id];
    else       OVERRIDES[id] = next;

    if (!opts || !opts.deferSave){ save(); _emit('edit'); }
    return true;
  }
  function setSubhexTerrain(Q, R, terrain, opts){ return setSubhexOverride(Q, R, { terrain }, opts); }
  function clearSubhexTerrain(Q, R, opts){ return setSubhexOverride(Q, R, { terrain: null }, opts); }
  function setSubhexFeature(Q, R, feature, opts){ return setSubhexOverride(Q, R, { feature }, opts); }
  function clearSubhexFeature(Q, R, opts){ return setSubhexOverride(Q, R, { feature: null }, opts); }

  function peekOverride(Q, R){ return OVERRIDES[subhexId(Q, R)]; }
  function restoreOverride(Q, R, rawEntry){
    const id = subhexId(Q, R);
    if (!rawEntry) return clearSubhex(Q, R);
    OVERRIDES[id] = rawEntry;
    save();
    _emit('undo-restore');
    return true;
  }
  function clearSubhex(Q, R, opts){
    const id = subhexId(Q, R);
    if (id in OVERRIDES){
      delete OVERRIDES[id];
      if (!opts || !opts.deferSave){ save(); _emit('clear'); }
      return true;
    }
    return false;
  }
  function flushOverrides(){ save(); }
  function clearAll(){
    OVERRIDES = {};
    try { localStorage.removeItem(LS_KEY); } catch(_){}
    _emit('clear-all');
  }

  window.GWSubhexData = {
    // constants
    HEX_R, SUB_R, MILE_R, SQRT3, ANCHOR_COL, ANCHOR_ROW, WORLD_SEED,
    SCHEMA_VERSION, PARENT_BIAS, TERRAIN, FEATURE_KINDS, NEIGHBOR_DELTAS, ANCHOR_SVG,
    // geometry
    parentSvgCenter, parentCenterAxial, subhexSvgCenter, svgToAxial, axialRound,
    mileSvgCenter, svgToMileAxial,
    cellsInAxialBbox, mileCellsInAxialBbox,
    ownerOf, ownedByParent, fragmentsForParent, neighborsOf,
    // ids
    subhexId, parseSubhexId, axialKey,
    // parent terrain
    setParentTerrainResolver, parentTerrainOf,
    // reads
    proceduralTerrain, valueNoise, getSubhex, getSubhexAt, getCellFeature, peekOverride,
    // writes
    setSubhexOverride, setSubhexTerrain, clearSubhexTerrain,
    setSubhexFeature, clearSubhexFeature,
    restoreOverride, clearSubhex, clearAll, flushOverrides, save,
  };

  try { console.log('[gw-subhex-data] v0.2.0 loaded', { ANCHOR_COL, ANCHOR_ROW, HEX_R, SUB_R, seed: WORLD_SEED }); } catch(_){}
})();

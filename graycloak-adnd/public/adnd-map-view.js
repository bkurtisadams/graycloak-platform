// adnd-map-view.js v1.0.0 — 2026-08-11
// Slice B: read-only player map. Fetches the published world from
// Firestore (regions/flanaess, subHexes/, lakes/, paths/, mapRegions/,
// settlements/, freeholds/ — all authed-read under rules v8) and
// renders an SVG hex map into #map-card. Geometry comes from the
// vendored @graycloak/map-engine build at public/vendor/map-engine
// (emitted by tsconfig.adnd.json, same pattern as the OSRIC 3 kernel).
// No writes, no fog, no party position yet — this is the §6 read
// pipeline milestone: sign in and see the authored world.
//
// View: drag to pan, wheel to zoom. URL overrides: ?q=<Q>&r=<R>
// centers on a subhex; default center is the first settlement found.
// Settlement / freehold markers link to the existing card readers
// (?settlement=<id> / ?freehold=<id>), preserving ?camp=.
//
// Scale notes: authored subhex override wins; otherwise a cell
// inherits its owning parent's Flanaess base terrain. Cells whose
// owner has no Flanaess entry don't render (world edge). Zoomed out
// past CELL_BUDGET cells, the renderer falls back to parent-hex fills
// so the whole Flanaess stays pannable.

const ADNDMapView = (function(){
  'use strict';

  const ENGINE_URL = './vendor/map-engine/index.js';

  // Mirrors gcc-map.js TERRAIN rgb values — display only.
  const TERRAIN_RGB = {
    clear: '245,232,190', plains: '195,215,100', forest: '70,120,55',
    hardwood: '100,150,70', conifer: '50,100,55', jungle: '35,75,40',
    hills: '150,120,80', forest_hills: '120,130,80', mountains: '110,90,75',
    desert: '220,150,90', barrens: '175,140,95', swamp: '90,100,65',
    river: '90,165,175',
    water: '55,105,155', water_fresh: '90,165,175',
    water_inland_sea: '70,140,175', water_coastal: '85,130,165',
    water_shallow: '55,110,160', water_deep: '35,75,130',
  };
  const RIVER_STROKE = 'rgb(70,140,175)';
  const ROAD_STROKE  = 'rgb(120,90,55)';
  const RIVER_W = { stream: 0.35, river: 0.6, greatriver: 1.0 };

  const PX_PER_UNIT = 6;      // screen px per world unit at zoom 1
  const ZOOM_MIN = 0.15, ZOOM_MAX = 10;
  const CELL_BUDGET = 6000;   // above this, drop to parent-level fills
  const PARENT_LABEL_ZOOM = 0.8;
  const GRID_COLS = 146, GRID_ROWS = 97;

  let ME = null;              // map-engine module
  let _ready = null;

  const state = {
    view: { cx: 0, cy: 0, zoom: 1 },
    data: null,               // { flanaess, subhex, lakes, paths, regions, settlements, freeholds }
    svg: null,
    raf: 0,
  };

  function ready(url){
    if (_ready) return _ready;
    _ready = import(url || ENGINE_URL)
      .then(mod => { ME = mod; return mod; })
      .catch(err => {
        console.error('[map-view] map-engine did not load:', err);
        ME = null;
        return null;
      });
    return _ready;
  }

  // ── Darlene labels ───────────────────────────────────────────────
  // Inverse of gcc-map.js darleneToInternal; round-trips its QA
  // corners (A-1 / P6-74 / A-97 / P6-170).
  function internalToDarlene(col, row){
    const idx = GRID_COLS - 1 - col;
    if (idx < 0 || col < 0 || row < 0 || row >= GRID_ROWS) return null;
    const letter = String.fromCharCode(65 + (idx % 26));
    const band = Math.floor(idx / 26);
    const offset = idx === 0 ? 0 : Math.floor(idx / 2) + 1;
    return `${letter}${band ? band + 1 : ''}-${row + 1 + offset}`;
  }

  // ── Data load ────────────────────────────────────────────────────
  async function loadAll(db){
    const col = async (name) => {
      const out = {};
      const snap = await db.collection(name).get();
      snap.forEach(doc => { out[doc.id] = doc.data(); });
      return out;
    };
    const [flanaessSnap, subhex, lakes, paths, regions, settlements, freeholds] =
      await Promise.all([
        db.collection('regions').doc('flanaess').get(),
        col('subHexes'), col('lakes'), col('paths'),
        col('mapRegions'), col('settlements'), col('freeholds'),
      ]);
    return {
      flanaess: flanaessSnap.exists ? (flanaessSnap.data().hexes || {}) : {},
      subhex, lakes, paths, regions, settlements, freeholds,
    };
  }

  // ── Geometry helpers ─────────────────────────────────────────────
  function hexPoints(cx, cy, r){
    const pts = [];
    for (let k = 0; k < 6; k++){
      const a = Math.PI / 3 * k;
      pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
    }
    return pts.join(' ');
  }
  function viewBbox(w, h){
    const v = state.view;
    const uw = w / (PX_PER_UNIT * v.zoom), uh = h / (PX_PER_UNIT * v.zoom);
    return { minX: v.cx - uw / 2, maxX: v.cx + uw / 2,
             minY: v.cy - uh / 2, maxY: v.cy + uh / 2, uw, uh };
  }
  function parentsInBbox(bb){
    const HEX_R = ME.HEX_R, SQ = ME.SQRT3;
    const c0 = Math.max(0, Math.floor((bb.minX - HEX_R) / (1.5 * HEX_R)) - 1);
    const c1 = Math.min(GRID_COLS - 1, Math.ceil((bb.maxX - HEX_R) / (1.5 * HEX_R)) + 1);
    const r0 = Math.max(0, Math.floor(bb.minY / (SQ * HEX_R)) - 1);
    const r1 = Math.min(GRID_ROWS - 1, Math.ceil(bb.maxY / (SQ * HEX_R)) + 1);
    const out = [];
    for (let col = c0; col <= c1; col++)
      for (let row = r0; row <= r1; row++) out.push({ col, row });
    return out;
  }
  function cellTerrain(Q, R){
    const ov = state.data.subhex[`subhex_${Q}_${R}`];
    if (ov && ov.lakeId && !(ov.terrain || '').startsWith('water')) return 'water_fresh';
    if (ov && ov.terrain) return ov.terrain;
    const o = ME.ownerOf(Q, R);
    return o ? (state.data.flanaess[`${o.col}-${o.row}`] || null) : null;
  }

  // ── Render ───────────────────────────────────────────────────────
  function esc(s){
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function markerHref(param, id){
    const p = new URLSearchParams(location.search);
    p.delete('settlement'); p.delete('freehold'); p.delete('q'); p.delete('r');
    p.set(param, id);
    return '?' + p.toString();
  }

  function render(){
    const svg = state.svg;
    if (!svg || !state.data || !ME) return;
    const w = svg.clientWidth || 800, h = svg.clientHeight || 520;
    const bb = viewBbox(w, h);
    svg.setAttribute('viewBox',
      `${bb.minX.toFixed(2)} ${bb.minY.toFixed(2)} ${bb.uw.toFixed(2)} ${bb.uh.toFixed(2)}`);

    const cells = ME.cellsInAxialBbox(bb);
    const cellLevel = cells.length <= CELL_BUDGET;
    const chunks = [];

    // Terrain
    if (cellLevel){
      for (const c of cells){
        const t = cellTerrain(c.Q, c.R);
        if (!t) continue;
        const rgb = TERRAIN_RGB[t] || '200,200,200';
        const p = ME.subhexSvgCenter(c.Q, c.R);
        chunks.push(`<polygon points="${hexPoints(p.x, p.y, ME.SUB_R)}" fill="rgb(${rgb})" stroke="rgba(0,0,0,.06)" stroke-width=".05"/>`);
      }
    } else {
      for (const par of parentsInBbox(bb)){
        const t = state.data.flanaess[`${par.col}-${par.row}`];
        if (!t) continue;
        const rgb = TERRAIN_RGB[t] || '200,200,200';
        const p = ME.parentSvgCenter(par.col, par.row);
        chunks.push(`<polygon points="${hexPoints(p.x, p.y, ME.HEX_R)}" fill="rgb(${rgb})" stroke="rgba(0,0,0,.12)" stroke-width=".2"/>`);
      }
    }

    // Paths (rivers under roads)
    const pathDocs = Object.values(state.data.paths || {});
    for (const pass of ['river', 'road']){
      for (const pd of pathDocs){
        if (!Array.isArray(pd.cells) || pd.cells.length < 2) continue;
        const isRiver = pd.kind === 'river' || pd.tier;
        if ((pass === 'river') !== !!isRiver) continue;
        const pts = pd.cells.map(c => {
          const p = ME.subhexSvgCenter(c.Q, c.R);
          return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
        }).join(' ');
        if (isRiver){
          const wPx = RIVER_W[pd.tier] || RIVER_W.river;
          chunks.push(`<polyline points="${pts}" fill="none" stroke="${RIVER_STROKE}" stroke-width="${wPx}" stroke-linejoin="round" stroke-linecap="round"/>`);
        } else {
          const dash = pd.kind === 'trail' ? ' stroke-dasharray="0.8 0.5"' : '';
          chunks.push(`<polyline points="${pts}" fill="none" stroke="${ROAD_STROKE}" stroke-width="${pd.kind === 'trail' ? 0.3 : 0.45}"${dash} stroke-linejoin="round" stroke-linecap="round"/>`);
        }
      }
    }

    // Parent outlines + Darlene labels
    if (state.view.zoom >= 0.35){
      for (const par of parentsInBbox(bb)){
        if (!state.data.flanaess[`${par.col}-${par.row}`]) continue;
        const p = ME.parentSvgCenter(par.col, par.row);
        chunks.push(`<polygon points="${hexPoints(p.x, p.y, ME.HEX_R)}" fill="none" stroke="rgba(40,30,10,.25)" stroke-width=".18"/>`);
        if (state.view.zoom >= PARENT_LABEL_ZOOM){
          const label = internalToDarlene(par.col, par.row);
          if (label) chunks.push(`<text x="${p.x.toFixed(2)}" y="${(p.y - ME.HEX_R * 0.78).toFixed(2)}" class="mv-parent-label">${esc(label)}</text>`);
        }
      }
    }

    // Region / lake name labels (centroid of member cells)
    if (cellLevel && state.view.zoom >= 0.6){
      const groups = { regionId: state.data.regions, lakeId: state.data.lakes };
      for (const field of Object.keys(groups)){
        const sums = {};
        for (const id of Object.keys(state.data.subhex)){
          const ov = state.data.subhex[id];
          const key = ov && ov[field];
          if (!key) continue;
          const m = /^subhex_(-?\d+)_(-?\d+)$/.exec(id);
          if (!m) continue;
          const p = ME.subhexSvgCenter(+m[1], +m[2]);
          (sums[key] = sums[key] || { x: 0, y: 0, n: 0 });
          sums[key].x += p.x; sums[key].y += p.y; sums[key].n++;
        }
        for (const key of Object.keys(sums)){
          const doc = groups[field][key];
          if (!doc || !doc.name) continue;
          const s = sums[key];
          const x = s.x / s.n, y = s.y / s.n;
          if (x < bb.minX || x > bb.maxX || y < bb.minY || y > bb.maxY) continue;
          chunks.push(`<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" class="mv-area-label${field === 'lakeId' ? ' mv-lake' : ''}">${esc(doc.name)}</text>`);
        }
      }
    }

    // Freeholds: territory ring + keep marker
    for (const id of Object.keys(state.data.freeholds || {})){
      const fh = state.data.freeholds[id];
      let p = null;
      if (fh.center && typeof fh.center.Q === 'number'){
        p = ME.subhexSvgCenter(fh.center.Q, fh.center.R);
      } else if (fh.regionalHexId){
        const par = darleneToInternal(fh.regionalHexId);
        if (par) p = ME.parentSvgCenter(par.col, par.row);
      }
      if (!p) continue;
      if (fh.radiusMiles){
        chunks.push(`<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${(fh.radiusMiles * ME.WORLD_UNITS_PER_MILE).toFixed(2)}" class="mv-freehold-ring"/>`);
      }
      chunks.push(
        `<a href="${esc(markerHref('freehold', id))}"><g class="mv-marker mv-freehold">`
        + `<rect x="${(p.x - 0.9).toFixed(2)}" y="${(p.y - 0.9).toFixed(2)}" width="1.8" height="1.8"/>`
        + `<text x="${p.x.toFixed(2)}" y="${(p.y - 1.5).toFixed(2)}">${esc(fh.name || id)}</text>`
        + `</g></a>`);
    }

    // Settlements
    for (const id of Object.keys(state.data.settlements || {})){
      const st = state.data.settlements[id];
      if (!Array.isArray(st.subHexCoord)) continue;
      const p = ME.subhexSvgCenter(st.subHexCoord[0], st.subHexCoord[1]);
      chunks.push(
        `<a href="${esc(markerHref('settlement', id))}"><g class="mv-marker mv-settlement">`
        + `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="1.1"/>`
        + `<text x="${p.x.toFixed(2)}" y="${(p.y - 1.7).toFixed(2)}">${esc(st.name || id)}</text>`
        + `</g></a>`);
    }

    svg.innerHTML = chunks.join('');
  }
  function scheduleRender(){
    if (state.raf) return;
    state.raf = requestAnimationFrame(() => { state.raf = 0; render(); });
  }

  // Local port of gcc-map.js darleneToInternal (freehold parent fallback).
  function darleneToInternal(label){
    const m = String(label || '').trim().toUpperCase().match(/^([A-Z])(\d*)-(\d+)$/);
    if (!m) return null;
    const idx = (m[2] ? +m[2] - 1 : 0) * 26 + (m[1].charCodeAt(0) - 65);
    const col = GRID_COLS - 1 - idx;
    const offset = idx === 0 ? 0 : Math.floor(idx / 2) + 1;
    const row = +m[3] - 1 - offset;
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;
    return { col, row };
  }

  // ── Interaction ──────────────────────────────────────────────────
  function wireInput(svg){
    let drag = null;
    svg.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('a')) return;      // let marker links click through
      drag = { x: e.clientX, y: e.clientY, cx: state.view.cx, cy: state.view.cy };
      svg.setPointerCapture(e.pointerId);
    });
    svg.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const s = PX_PER_UNIT * state.view.zoom;
      state.view.cx = drag.cx - (e.clientX - drag.x) / s;
      state.view.cy = drag.cy - (e.clientY - drag.y) / s;
      scheduleRender();
    });
    const endDrag = () => { drag = null; };
    svg.addEventListener('pointerup', endDrag);
    svg.addEventListener('pointercancel', endDrag);
    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const v = state.view;
      const rect = svg.getBoundingClientRect();
      const s0 = PX_PER_UNIT * v.zoom;
      const wx = v.cx + (e.clientX - rect.left - rect.width / 2) / s0;
      const wy = v.cy + (e.clientY - rect.top - rect.height / 2) / s0;
      const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
      v.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.zoom * factor));
      const s1 = PX_PER_UNIT * v.zoom;
      v.cx = wx - (e.clientX - rect.left - rect.width / 2) / s1;
      v.cy = wy - (e.clientY - rect.top - rect.height / 2) / s1;
      scheduleRender();
    }, { passive: false });
  }

  // ── Boot ─────────────────────────────────────────────────────────
  function shell(msg){
    const card = document.getElementById('map-card');
    if (!card) return null;
    card.innerHTML = `
      <div class="map-card">
        <h2>World Map</h2>
        <div class="map-hint">${esc(msg || 'drag to pan · wheel to zoom · click a marker')}</div>
        <svg id="map-svg" xmlns="http://www.w3.org/2000/svg"></svg>
      </div>`;
    return document.getElementById('map-svg');
  }
  function renderEmpty(msg){
    const card = document.getElementById('map-card');
    if (card) card.innerHTML = `<div class="map-empty">${esc(msg)}</div>`;
  }

  function pickCenter(){
    const p = new URLSearchParams(location.search);
    if (p.has('q') && p.has('r')){
      return ME.subhexSvgCenter(+p.get('q'), +p.get('r'));
    }
    const st = Object.values(state.data.settlements || {})
      .find(s => Array.isArray(s.subHexCoord));
    if (st) return ME.subhexSvgCenter(st.subHexCoord[0], st.subHexCoord[1]);
    const ids = Object.keys(state.data.subhex);
    if (ids.length){
      const m = /^subhex_(-?\d+)_(-?\d+)$/.exec(ids[0]);
      if (m) return ME.subhexSvgCenter(+m[1], +m[2]);
    }
    return ME.parentSvgCenter(64, 44);   // D4-86, schema-doc starter
  }

  async function boot(){
    const svg = shell('loading world…');
    if (!svg) return;
    const [mod] = await Promise.all([ready()]);
    if (!mod){ renderEmpty('Map engine failed to load'); return; }
    const db = ADNDAuth.getDb();
    if (!db){ renderEmpty('Firestore not initialized'); return; }
    try {
      state.data = await loadAll(db);
    } catch(e){
      console.error('[map-view] load failed:', e);
      renderEmpty(`Map load failed: ${e.message}`);
      return;
    }
    const c = pickCenter();
    state.view.cx = c.x; state.view.cy = c.y; state.view.zoom = 1.6;
    state.svg = shell();
    wireInput(state.svg);
    render();
    window.addEventListener('resize', scheduleRender);
    const counts = ['subhex', 'lakes', 'paths', 'regions', 'settlements', 'freeholds']
      .map(k => `${Object.keys(state.data[k]).length} ${k}`).join(', ');
    console.log(`[map-view] world loaded: ${counts}`);
  }

  if (typeof ADNDAuth !== 'undefined'){
    ADNDAuth.onAuthChange(user => {
      if (user) boot();
      else renderEmpty('Sign in to view the world map');
    });
  }

  return { ready, boot, render, internalToDarlene, darleneToInternal, state };
})();

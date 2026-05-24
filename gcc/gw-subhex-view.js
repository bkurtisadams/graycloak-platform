// gw-subhex-view.js v0.2.0 — 2026-05-24
// Seamless (Path B) 3-mile subhex viewer + terrain paint for the Gamma
// World map. Drill in from a parent click; pan/zoom freely across parent
// borders; arm a terrain swatch and click/drag to paint cells.
//
// v0.2.0 — terrain paint brush. Swatch palette (GW terrains + erase),
//          click/drag brush writing through GWSubhexData.setSubhexTerrain
//          / clearSubhexTerrain, in-place cell repaint (no full rebuild),
//          per-stroke undo. Left-drag from a cell paints when armed,
//          otherwise pans; right-drag always pans.
// v0.1.0 — read-only viewer (cull/render/pan/zoom/parent outlines/readout).
//
// Renders in the shared world-SVG plane via GWSubhexData. Pan/zoom is
// viewBox-driven; strokes use vector-effect non-scaling-stroke.

(function(){
  'use strict';
  const SVGNS = 'http://www.w3.org/2000/svg';
  const D = () => window.GWSubhexData;

  const state = {
    open: false,
    vb: { x: 0, y: 0, w: 180, h: 120 },
    showParents: true,
    rendered: null,
    drag: null,
    brush: null,        // active stroke: { set:Set, undo:[] }
    armed: null,        // { type:'paint', terrain } | { type:'erase' }
    undoStack: [],      // committed strokes (each an array of {Q,R,before})
    cellMap: new Map(), // "Q_R" -> polygon, for in-place repaint
    raf: 0,
    curParent: null,
    el: {},
  };

  // ── style ──────────────────────────────────────────────────────────────────
  function injectStyle(){
    if (document.getElementById('gw-subhex-style')) return;
    const s = document.createElement('style');
    s.id = 'gw-subhex-style';
    s.textContent = `
      #gw-sx-overlay { position:fixed; top:calc(var(--gcc-bar-h,44px) + var(--topbar-h,46px)); left:0; right:0; bottom:0; z-index:80; background:#050200; display:none; }
      #gw-sx-overlay.open { display:block; }
      #gw-sx-svg { position:absolute; inset:0; width:100%; height:100%; cursor:grab; touch-action:none; }
      #gw-sx-svg.grabbing { cursor:grabbing; }
      #gw-sx-svg.painting { cursor:crosshair; }
      .gw-sx-cell { stroke:rgba(0,0,0,.35); stroke-width:1; vector-effect:non-scaling-stroke; }
      .gw-sx-cell.authored { stroke:#ff8844; stroke-width:1.5; vector-effect:non-scaling-stroke; }
      .gw-sx-cell.hover { stroke:rgba(255,220,120,.95); stroke-width:2; vector-effect:non-scaling-stroke; }
      .gw-sx-parent { fill:none; stroke:rgba(255,200,120,.5); stroke-width:1.5; vector-effect:non-scaling-stroke; pointer-events:none; }
      #gw-sx-bar { position:absolute; top:10px; left:170px; right:10px; display:flex; align-items:center; gap:10px; z-index:6; pointer-events:none; }
      #gw-sx-bar > * { pointer-events:auto; }
      #gw-sx-bar .sx-title { font-family:'Cinzel',serif; font-size:13px; letter-spacing:.08em; color:#ffaa66; text-shadow:0 0 10px rgba(255,136,68,.35); }
      #gw-sx-bar .sx-spacer { flex:1; }
      #gw-sx-bar label { font-size:12px; color:#c8a96e; display:flex; align-items:center; gap:5px; cursor:pointer; }
      .gw-sx-btn { background:rgba(14,8,2,.93); border:1px solid #5a3a0a; color:#e8d5a3; font-family:'Cinzel',serif; font-size:11px; letter-spacing:.04em; padding:6px 11px; cursor:pointer; border-radius:2px; }
      .gw-sx-btn:hover { background:rgba(255,136,68,.18); border-color:#ff8844; color:#ffaa66; }
      .gw-sx-btn:disabled { opacity:.4; cursor:default; }
      #gw-sx-palette { position:absolute; top:10px; left:10px; width:150px; max-height:calc(100% - 20px); overflow:auto; background:rgba(14,8,2,.95); border:1px solid #5a3a0a; border-radius:3px; padding:8px; z-index:6; font-family:'Crimson Text',serif; }
      #gw-sx-palette .sx-mode { font-size:11px; color:#ffaa66; margin-bottom:7px; min-height:14px; line-height:1.3; }
      .gw-sx-sw { display:flex; align-items:center; gap:6px; width:100%; background:none; border:1px solid transparent; color:#e8d5a3; font-size:12px; padding:3px 4px; cursor:pointer; border-radius:2px; text-align:left; }
      .gw-sx-sw:hover { background:rgba(255,136,68,.15); }
      .gw-sx-sw.armed { border-color:#ff8844; background:rgba(255,136,68,.22); }
      .gw-sx-chip { width:15px; height:15px; border:1px solid rgba(0,0,0,.45); flex:none; border-radius:1px; }
      #gw-sx-palette .sx-row2 { display:flex; gap:6px; margin-top:7px; }
      #gw-sx-palette .sx-row2 .gw-sx-btn { flex:1; padding:5px 4px; }
      #gw-sx-read { position:absolute; bottom:10px; left:10px; min-width:200px; background:rgba(14,8,2,.93); border:1px solid #5a3a0a; border-radius:3px; color:#e8d5a3; padding:8px 12px; font-size:12px; font-family:'Crimson Text',Georgia,serif; z-index:6; }
      #gw-sx-read .sx-t { color:#ffaa66; font-weight:600; }
    `;
    document.head.appendChild(s);
  }

  function mkBtn(label, id){
    const b = document.createElement('button');
    b.id = id; b.textContent = label; b.className = 'gw-sx-btn';
    return b;
  }

  function buildPalette(){
    const pal = document.createElement('div'); pal.id = 'gw-sx-palette';
    const mode = document.createElement('div'); mode.className = 'sx-mode'; mode.id = 'gw-sx-mode';
    mode.textContent = 'Mode: Select';
    pal.appendChild(mode);
    const T = D().TERRAIN;
    for (const key of Object.keys(T)){
      if (key === 'unknown') continue;
      const sw = document.createElement('button');
      sw.className = 'gw-sx-sw';
      sw.dataset.arm = 'paint:' + key;
      sw.innerHTML = `<span class="gw-sx-chip" style="background:${T[key].fill}"></span><span>${T[key].label}</span>`;
      sw.addEventListener('click', () => arm({ type: 'paint', terrain: key }));
      pal.appendChild(sw);
    }
    const row = document.createElement('div'); row.className = 'sx-row2';
    const erase = mkBtn('⌫ Erase', 'gw-sx-erase'); erase.dataset.arm = 'erase';
    erase.addEventListener('click', () => arm({ type: 'erase' }));
    const undoB = mkBtn('↶ Undo', 'gw-sx-undo'); undoB.disabled = true;
    undoB.addEventListener('click', undo);
    row.append(erase, undoB);
    pal.appendChild(row);
    return pal;
  }

  function ensureDom(){
    if (state.el.overlay) return;
    injectStyle();
    const overlay = document.createElement('div');
    overlay.id = 'gw-sx-overlay';

    const svg = document.createElementNS(SVGNS, 'svg');
    svg.id = 'gw-sx-svg';
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    const gCells = document.createElementNS(SVGNS, 'g');   gCells.id = 'gw-sx-cells';
    const gParents = document.createElementNS(SVGNS, 'g'); gParents.id = 'gw-sx-parents';
    svg.appendChild(gCells); svg.appendChild(gParents);

    const palette = buildPalette();

    const bar = document.createElement('div'); bar.id = 'gw-sx-bar';
    const back = mkBtn('← Overworld', 'gw-sx-back');
    const title = document.createElement('span'); title.className = 'sx-title'; title.id = 'gw-sx-parent-lbl';
    const spacer = document.createElement('span'); spacer.className = 'sx-spacer';
    const tog = document.createElement('label');
    tog.innerHTML = '<input type="checkbox" id="gw-sx-toggle-parents" checked> Parent outlines';
    const fit = mkBtn('Fit parent', 'gw-sx-fit');
    bar.append(back, title, spacer, tog, fit);

    const read = document.createElement('div'); read.id = 'gw-sx-read';
    read.innerHTML = '<span class="sx-t">Subhex</span><div id="gw-sx-read-body">— hover a cell —</div>';

    overlay.append(svg, palette, bar, read);
    document.body.appendChild(overlay);

    Object.assign(state.el, {
      overlay, svg, gCells, gParents, title, read,
      readBody: read.querySelector('#gw-sx-read-body'),
      mode: palette.querySelector('#gw-sx-mode'),
      undoBtn: palette.querySelector('#gw-sx-undo'),
      palette,
    });

    back.addEventListener('click', close);
    fit.addEventListener('click', () => { if (state.curParent) centerOnParent(state.curParent.col, state.curParent.row); });
    tog.querySelector('input').addEventListener('change', e => { state.showParents = e.target.checked; render(true); });
    wireViewport(svg);
    bindCellHover(svg);
  }

  // ── viewBox + pan/zoom ─────────────────────────────────────────────────────
  function applyViewBox(){
    const { x, y, w, h } = state.vb;
    state.el.svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
  }
  function syncAspect(){
    const r = state.el.svg.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) state.vb.h = state.vb.w * (r.height / r.width);
  }
  function centerOnParent(col, row){
    const c = D().parentSvgCenter(col, row);
    state.vb.w = 3 * 1.5 * D().HEX_R;     // ~3 parents wide
    syncAspect();
    state.vb.x = c.x - state.vb.w / 2;
    state.vb.y = c.y - state.vb.h / 2;
    applyViewBox();
    render(true);
  }
  function clientToWorld(ev){
    const r = state.el.svg.getBoundingClientRect();
    const fx = (ev.clientX - r.left) / r.width;
    const fy = (ev.clientY - r.top) / r.height;
    return { x: state.vb.x + fx * state.vb.w, y: state.vb.y + fy * state.vb.h };
  }
  function cellUnder(ev){
    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    return (el && el.classList && el.classList.contains('gw-sx-cell')) ? el : null;
  }

  function wireViewport(svg){
    svg.addEventListener('mousedown', e => {
      if (e.button !== 0 && e.button !== 2) return;
      e.preventDefault();
      const cell = cellUnder(e);
      if (e.button === 0 && state.armed && cell){
        state.brush = { set: new Set(), undo: [] };
        svg.classList.add('painting');
        paintCell(+cell.dataset.q, +cell.dataset.r);
        return;
      }
      state.drag = { sx: e.clientX, sy: e.clientY, vx: state.vb.x, vy: state.vb.y, moved: false };
      svg.classList.add('grabbing');
    });
    svg.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('mousemove', e => {
      if (state.brush){
        const cell = cellUnder(e);
        if (cell) paintCell(+cell.dataset.q, +cell.dataset.r);
        return;
      }
      if (!state.drag) return;
      const r = state.el.svg.getBoundingClientRect();
      const dx = (e.clientX - state.drag.sx) / r.width * state.vb.w;
      const dy = (e.clientY - state.drag.sy) / r.height * state.vb.h;
      if (Math.abs(e.clientX - state.drag.sx) + Math.abs(e.clientY - state.drag.sy) > 3) state.drag.moved = true;
      state.vb.x = state.drag.vx - dx;
      state.vb.y = state.drag.vy - dy;
      applyViewBox();
    });
    window.addEventListener('mouseup', () => {
      if (state.brush){
        D().flushOverrides();
        if (state.brush.undo.length){
          state.undoStack.push(state.brush.undo);
          if (state.undoStack.length > 30) state.undoStack.shift();
        }
        state.brush = null;
        state.el.svg.classList.remove('painting');
        syncUndoBtn();
        return;
      }
      if (!state.drag) return;
      const moved = state.drag.moved;
      state.drag = null;
      state.el.svg.classList.remove('grabbing');
      if (moved) render();
    });
    svg.addEventListener('wheel', e => {
      if (!state.open) return;
      e.preventDefault();
      const wpt = clientToWorld(e);
      const factor = e.deltaY < 0 ? 1/1.2 : 1.2;
      const minW = 1.5 * D().HEX_R * 0.6;
      const maxW = 1.5 * D().HEX_R * 24;
      let nw = Math.max(minW, Math.min(maxW, state.vb.w * factor));
      const k = nw / state.vb.w;
      state.vb.w = nw; state.vb.h *= k;
      state.vb.x = wpt.x - (wpt.x - state.vb.x) * k;
      state.vb.y = wpt.y - (wpt.y - state.vb.y) * k;
      applyViewBox();
      scheduleRender();
    }, { passive: false });
  }
  function scheduleRender(){
    if (state.raf) return;
    state.raf = requestAnimationFrame(() => { state.raf = 0; render(); });
  }

  // ── render ───────────────────────────────────────────────────────────────
  function cornersStr(cx, cy, R){
    let s = '';
    for (let i = 0; i < 6; i++){
      const a = (Math.PI/180) * (60 * i);
      s += (i ? ' ' : '') + (cx + R*Math.cos(a)).toFixed(3) + ',' + (cy + R*Math.sin(a)).toFixed(3);
    }
    return s;
  }
  function fillFor(d, sub){ return (d.TERRAIN[sub.terrain] || d.TERRAIN.unknown).fill; }

  function render(force){
    if (!state.open) return;
    const d = D();
    const mx = state.vb.w * 0.4, my = state.vb.h * 0.4;
    const bbox = {
      minX: state.vb.x - mx, maxX: state.vb.x + state.vb.w + mx,
      minY: state.vb.y - my, maxY: state.vb.y + state.vb.h + my,
    };
    if (!force && state.rendered &&
        bbox.minX >= state.rendered.minX && bbox.maxX <= state.rendered.maxX &&
        bbox.minY >= state.rendered.minY && bbox.maxY <= state.rendered.maxY) return;
    state.rendered = bbox;

    const cells = d.cellsInAxialBbox(bbox);
    const ptCache = new Map();
    const parentsSeen = new Map();
    state.cellMap = new Map();

    const fragC = document.createDocumentFragment();
    for (const { Q, R } of cells){
      const o = d.ownerOf(Q, R);
      let pt = null;
      if (o){
        const pk = o.col + ',' + o.row;
        if (ptCache.has(pk)) pt = ptCache.get(pk);
        else { pt = d.parentTerrainOf(o.col, o.row); ptCache.set(pk, pt); }
        if (state.showParents && !parentsSeen.has(pk)) parentsSeen.set(pk, o);
      }
      const sub = d.getSubhex(Q, R, pt);
      const c = d.subhexSvgCenter(Q, R);
      const poly = document.createElementNS(SVGNS, 'polygon');
      poly.setAttribute('points', cornersStr(c.x, c.y, d.SUB_R));
      poly.setAttribute('class', 'gw-sx-cell' + (sub.source === 'authored' ? ' authored' : ''));
      poly.setAttribute('fill', fillFor(d, sub));
      poly.dataset.q = Q; poly.dataset.r = R;
      fragC.appendChild(poly);
      state.cellMap.set(Q + '_' + R, poly);
    }
    state.el.gCells.replaceChildren(fragC);

    const fragP = document.createDocumentFragment();
    if (state.showParents){
      for (const [, o] of parentsSeen){
        const pc = d.parentSvgCenter(o.col, o.row);
        const poly = document.createElementNS(SVGNS, 'polygon');
        poly.setAttribute('points', cornersStr(pc.x, pc.y, d.HEX_R));
        poly.setAttribute('class', 'gw-sx-parent');
        fragP.appendChild(poly);
      }
    }
    state.el.gParents.replaceChildren(fragP);
  }

  // ── paint ──────────────────────────────────────────────────────────────────
  function recolorCell(poly, Q, R){
    const d = D();
    const o = d.ownerOf(Q, R);
    const pt = o ? d.parentTerrainOf(o.col, o.row) : null;
    const sub = d.getSubhex(Q, R, pt);
    poly.setAttribute('fill', fillFor(d, sub));
    poly.classList.toggle('authored', sub.source === 'authored');
  }
  function paintCell(Q, R){
    if (!state.brush || !state.armed) return;
    const key = Q + '_' + R;
    if (state.brush.set.has(key)) return;
    state.brush.set.add(key);
    const d = D();
    const before = d.peekOverride(Q, R);
    state.brush.undo.push({ Q, R, before: before ? JSON.parse(JSON.stringify(before)) : null });
    if (state.armed.type === 'erase') d.clearSubhexTerrain(Q, R, { deferSave: true });
    else d.setSubhexTerrain(Q, R, state.armed.terrain, { deferSave: true });
    const poly = state.cellMap.get(key);
    if (poly) recolorCell(poly, Q, R);
  }
  function undo(){
    const stroke = state.undoStack.pop();
    if (!stroke) { syncUndoBtn(); return; }
    const d = D();
    for (const { Q, R, before } of stroke) d.restoreOverride(Q, R, before);
    syncUndoBtn();
    render(true);
  }
  function syncUndoBtn(){
    if (state.el.undoBtn) state.el.undoBtn.disabled = state.undoStack.length === 0;
  }

  // ── arming ───────────────────────────────────────────────────────────────
  function armKey(a){ return a ? (a.type === 'erase' ? 'erase' : 'paint:' + a.terrain) : null; }
  function arm(spec){
    const cur = armKey(state.armed), nxt = armKey(spec);
    state.armed = (cur === nxt) ? null : spec;
    syncPalette(); syncMode();
  }
  function syncPalette(){
    const cur = armKey(state.armed);
    state.el.palette.querySelectorAll('[data-arm]').forEach(b => {
      b.classList.toggle('armed', b.dataset.arm === cur);
    });
  }
  function syncMode(){
    const a = state.armed;
    const el = state.el.mode;
    if (!a) el.textContent = 'Mode: Select';
    else if (a.type === 'erase') el.textContent = 'Erase override · drag to brush';
    else el.textContent = `Paint: ${D().TERRAIN[a.terrain].label} · drag to brush`;
  }

  // ── hover readout ──────────────────────────────────────────────────────────
  let _hoverEl = null;
  function bindCellHover(svg){
    svg.addEventListener('mousemove', e => {
      if (state.brush) return;
      const t = e.target;
      if (!t || !t.classList || !t.classList.contains('gw-sx-cell')){
        if (_hoverEl){ _hoverEl.classList.remove('hover'); _hoverEl = null; }
        return;
      }
      if (_hoverEl === t) return;
      if (_hoverEl) _hoverEl.classList.remove('hover');
      _hoverEl = t; t.classList.add('hover');
      showReadout(+t.dataset.q, +t.dataset.r);
    });
  }
  function showReadout(Q, R){
    const d = D();
    const o = d.ownerOf(Q, R);
    const pt = o ? d.parentTerrainOf(o.col, o.row) : null;
    const sub = d.getSubhex(Q, R, pt);
    const tlabel = (d.TERRAIN[sub.terrain] || d.TERRAIN.unknown).label;
    const owner = o ? `parent ${o.col},${o.row}` : 'unowned';
    const feat = sub.feature ? ` · ${sub.feature.kind}${sub.feature.name ? ' "'+sub.feature.name+'"' : ''}` : '';
    state.el.readBody.innerHTML =
      `Q,R ${Q},${R} · ${owner}<br>${tlabel} <span style="color:#888">(${sub.source})</span>${feat}`;
  }

  // ── public API ─────────────────────────────────────────────────────────────
  function open(col, row){
    if (!D()){ console.warn('[gw-subhex-view] GWSubhexData not loaded'); return; }
    ensureDom();
    state.open = true;
    state.curParent = { col, row };
    state.el.overlay.classList.add('open');
    state.el.title.textContent = `Subhex · parent ${col},${row} · 3 mi/hex`;
    requestAnimationFrame(() => { state.rendered = null; centerOnParent(col, row); });
  }
  function close(){
    state.open = false;
    if (state.el.overlay) state.el.overlay.classList.remove('open');
  }
  function isOpen(){ return state.open; }
  function currentParent(){ return state.curParent || null; }

  window.GWSubhexView = { open, close, isOpen, currentParent, render };
  try { console.log('[gw-subhex-view] v0.2.0 loaded'); } catch(_){}
})();

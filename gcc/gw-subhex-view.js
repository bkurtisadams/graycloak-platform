// gw-subhex-view.js v0.1.0 — 2026-05-24
// Seamless (Path B) 3-mile subhex viewer for the Gamma World map.
// Drill in from a parent click; pan/zoom freely across parent borders.
// Renders in the shared world-SVG plane via GWSubhexData (subhexSvgCenter,
// ownerOf, cellsInAxialBbox), so cross-parent continuity is automatic.
//
// Phase 3 is read-only: terrain fill + parent silhouettes + a hover/click
// readout. Painting (phase 4) and feature icons (phase 5) layer on later
// via the same cell DOM and GWSubhexData writers.
//
// Pan/zoom is viewBox-driven (the viewport slides over the world plane);
// strokes use vector-effect non-scaling-stroke so they stay crisp at any
// zoom. Cull is viewport-bbox; cells render with a margin so drag-pan
// doesn't rebuild until the view moves past the rendered ring.

(function(){
  'use strict';
  const SVGNS = 'http://www.w3.org/2000/svg';

  const D = () => window.GWSubhexData;

  const state = {
    open: false,
    vb: { x: 0, y: 0, w: 180, h: 120 },   // world-SVG viewBox
    showParents: true,
    rendered: null,                        // last bbox we built cells for
    drag: null,
    raf: 0,
    el: {},                                // DOM refs
  };

  // ── DOM ────────────────────────────────────────────────────────────────────
  function injectStyle(){
    if (document.getElementById('gw-subhex-style')) return;
    const s = document.createElement('style');
    s.id = 'gw-subhex-style';
    s.textContent = `
      #gw-sx-overlay { position:fixed; top:calc(var(--gcc-bar-h,44px) + var(--topbar-h,46px)); left:0; right:0; bottom:0; z-index:80; background:#050200; display:none; }
      #gw-sx-overlay.open { display:block; }
      #gw-sx-svg { position:absolute; inset:0; width:100%; height:100%; cursor:grab; touch-action:none; }
      #gw-sx-svg.grabbing { cursor:grabbing; }
      .gw-sx-cell { stroke:rgba(0,0,0,.35); stroke-width:1; vector-effect:non-scaling-stroke; }
      .gw-sx-cell.authored { stroke:#ff8844; stroke-width:1.5; vector-effect:non-scaling-stroke; }
      .gw-sx-cell.hover { stroke:rgba(255,220,120,.95); stroke-width:2; vector-effect:non-scaling-stroke; }
      .gw-sx-parent { fill:none; stroke:rgba(255,200,120,.5); stroke-width:1.5; vector-effect:non-scaling-stroke; pointer-events:none; }
      #gw-sx-bar { position:absolute; top:10px; left:10px; right:10px; display:flex; align-items:center; gap:10px; z-index:5; pointer-events:none; }
      #gw-sx-bar > * { pointer-events:auto; }
      #gw-sx-bar .sx-title { font-family:'Cinzel',serif; font-size:13px; letter-spacing:.08em; color:#ffaa66; text-shadow:0 0 10px rgba(255,136,68,.35); }
      #gw-sx-bar .sx-spacer { flex:1; }
      #gw-sx-bar label { font-size:12px; color:#c8a96e; display:flex; align-items:center; gap:5px; cursor:pointer; }
      #gw-sx-read { position:absolute; bottom:10px; left:10px; min-width:200px; background:rgba(14,8,2,.93); border:1px solid #5a3a0a; border-radius:3px; color:#e8d5a3; padding:8px 12px; font-size:12px; font-family:'Crimson Text',Georgia,serif; z-index:5; }
      #gw-sx-read .sx-t { color:#ffaa66; font-weight:600; }
    `;
    document.head.appendChild(s);
  }

  function btn(label, id){
    const b = document.createElement('button');
    b.id = id; b.textContent = label;
    b.style.cssText = "background:rgba(14,8,2,.93);border:1px solid #5a3a0a;color:#e8d5a3;font-family:'Cinzel',serif;font-size:11px;letter-spacing:.04em;padding:6px 11px;cursor:pointer;border-radius:2px;";
    return b;
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

    const bar = document.createElement('div'); bar.id = 'gw-sx-bar';
    const back = btn('← Overworld', 'gw-sx-back');
    const title = document.createElement('span'); title.className = 'sx-title'; title.id = 'gw-sx-parent-lbl';
    const spacer = document.createElement('span'); spacer.className = 'sx-spacer';
    const tog = document.createElement('label');
    tog.innerHTML = '<input type="checkbox" id="gw-sx-toggle-parents" checked> Parent outlines';
    const fit = btn('Fit parent', 'gw-sx-fit');
    bar.append(back, title, spacer, tog, fit);

    const read = document.createElement('div'); read.id = 'gw-sx-read';
    read.innerHTML = '<span class="sx-t">Subhex</span><div id="gw-sx-read-body">— hover a cell —</div>';

    overlay.append(svg, bar, read);
    document.body.appendChild(overlay);

    Object.assign(state.el, { overlay, svg, gCells, gParents, title, read, readBody: read.querySelector('#gw-sx-read-body') });

    back.addEventListener('click', close);
    fit.addEventListener('click', () => { if (state.curParent) centerOnParent(state.curParent.col, state.curParent.row); });
    tog.querySelector('input').addEventListener('change', e => { state.showParents = e.target.checked; render(); });
    wireViewport(svg);
  }

  // ── viewBox + pan/zoom ─────────────────────────────────────────────────────
  function applyViewBox(){
    const { x, y, w, h } = state.vb;
    state.el.svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
  }
  function syncAspect(){
    const r = state.el.svg.getBoundingClientRect();
    if (r.width > 0 && r.height > 0){
      state.vb.h = state.vb.w * (r.height / r.width);
    }
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
  function wireViewport(svg){
    svg.addEventListener('mousedown', e => {
      if (e.button !== 0 && e.button !== 2) return;
      e.preventDefault();
      state.drag = { sx: e.clientX, sy: e.clientY, vx: state.vb.x, vy: state.vb.y, moved: false };
      svg.classList.add('grabbing');
    });
    svg.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('mousemove', e => {
      if (!state.drag) return;
      const r = state.el.svg.getBoundingClientRect();
      const dx = (e.clientX - state.drag.sx) / r.width * state.vb.w;
      const dy = (e.clientY - state.drag.sy) / r.height * state.vb.h;
      if (Math.abs(e.clientX - state.drag.sx) + Math.abs(e.clientY - state.drag.sy) > 3) state.drag.moved = true;
      state.vb.x = state.drag.vx - dx;
      state.vb.y = state.drag.vy - dy;
      applyViewBox();                       // cheap: cells already rendered with margin
    });
    window.addEventListener('mouseup', () => {
      if (!state.drag) return;
      const moved = state.drag.moved;
      state.drag = null;
      state.el.svg.classList.remove('grabbing');
      if (moved) render();                  // re-cull only after a real pan
    });
    svg.addEventListener('wheel', e => {
      if (!state.open) return;
      e.preventDefault();
      const wpt = clientToWorld(e);
      const factor = e.deltaY < 0 ? 1/1.2 : 1.2;
      const minW = 1.5 * D().HEX_R * 0.6;   // ~0.6 parent (deep zoom)
      const maxW = 1.5 * D().HEX_R * 24;    // ~24 parents (zoom out)
      let nw = Math.max(minW, Math.min(maxW, state.vb.w * factor));
      const k = nw / state.vb.w;
      state.vb.w = nw;
      state.vb.h = state.vb.h * k;
      state.vb.x = wpt.x - (wpt.x - state.vb.x) * k;   // zoom toward cursor
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

  function render(force){
    if (!state.open) return;
    const d = D();
    const mx = state.vb.w * 0.4, my = state.vb.h * 0.4;   // pan slack before rebuild
    const bbox = {
      minX: state.vb.x - mx, maxX: state.vb.x + state.vb.w + mx,
      minY: state.vb.y - my, maxY: state.vb.y + state.vb.h + my,
    };
    if (!force && state.rendered &&
        bbox.minX >= state.rendered.minX && bbox.maxX <= state.rendered.maxX &&
        bbox.minY >= state.rendered.minY && bbox.maxY <= state.rendered.maxY){
      return;                               // still inside the last rendered ring
    }
    state.rendered = bbox;

    const cells = d.cellsInAxialBbox(bbox);
    const parentTerrainCache = new Map();
    const parentsSeen = new Map();

    const fragC = document.createDocumentFragment();
    for (const { Q, R } of cells){
      const o = d.ownerOf(Q, R);
      let pt = null;
      if (o){
        const pk = o.col + ',' + o.row;
        if (parentTerrainCache.has(pk)) pt = parentTerrainCache.get(pk);
        else { pt = d.parentTerrainOf(o.col, o.row); parentTerrainCache.set(pk, pt); }
        if (state.showParents && !parentsSeen.has(pk)) parentsSeen.set(pk, o);
      }
      const sub = d.getSubhex(Q, R, pt);
      const c = d.subhexSvgCenter(Q, R);
      const poly = document.createElementNS(SVGNS, 'polygon');
      poly.setAttribute('points', cornersStr(c.x, c.y, d.SUB_R));
      poly.setAttribute('class', 'gw-sx-cell' + (sub.source === 'authored' ? ' authored' : ''));
      poly.setAttribute('fill', (d.TERRAIN[sub.terrain] || d.TERRAIN.unknown).fill);
      poly.dataset.q = Q; poly.dataset.r = R;
      fragC.appendChild(poly);
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

  // ── hover / click readout ──────────────────────────────────────────────────
  let _hoverEl = null;
  function bindCellEvents(){
    const svg = state.el.svg;
    svg.addEventListener('mousemove', e => {
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
    if (!state._cellEventsBound){ bindCellEvents(); state._cellEventsBound = true; }
    state.open = true;
    state.curParent = { col, row };
    state.el.overlay.classList.add('open');
    state.el.title.textContent = `Subhex view · parent ${col},${row} · 3 mi/hex`;
    // defer one frame so the SVG has layout for aspect ratio
    requestAnimationFrame(() => { state.rendered = null; centerOnParent(col, row); });
  }
  function close(){
    state.open = false;
    if (state.el.overlay) state.el.overlay.classList.remove('open');
  }
  function isOpen(){ return state.open; }
  function currentParent(){ return state.curParent || null; }

  window.GWSubhexView = { open, close, isOpen, currentParent, render };
  try { console.log('[gw-subhex-view] v0.1.0 loaded'); } catch(_){}
})();
